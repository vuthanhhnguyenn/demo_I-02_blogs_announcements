// Drives one scenario against the running app through the shared browser server.
//
// Usage:  node run-steps.js <steps.(js|json)> [storageStateFile]
//
//   steps file       — a JS module (module.exports = [ ...steps ]) or JSON array.
//   storageStateFile — cookie/localStorage jar, relative to this dir.
//                      Defaults to storage-state.json. Use a per-role jar
//                      (storage-<role>.json) to test different logins.
//
// Prints one JSON blob to stdout: { results, consoleErrors, finalUrl }.
// Each step's result carries { op, ok, ...data }; a failed step sets ok:false
// and error, and the loop continues so one bad selector never aborts the run.
//
// Supported ops (see SKILL.md for the full cheatsheet):
//   goto fill type press click check hover
//   waitFor waitForText waitForTimeout reload goBack goForward
//   screenshot screenshotElement
//   textContent getAllText count isVisible isDisabled isChecked getAttribute url
//   evaluate            { fn: "() => {...}", label?, arg? }  -> value
//   route               { pattern, status?, body?, delayMs?, passthrough? }  (mock/fail/delay an endpoint)
//   getRouteCallCount   { pattern }                          (how many times route fired -> dedupe checks)
//   startWatchRequests  { match? }                           (begin counting matching requests)
//   getWatchedRequests                                       (list them -> debounce checks)
//   unroute             { pattern }
const fs = require('node:fs');
const path = require('node:path');
const { resolvePlaywright } = require('./pw');

const { chromium } = resolvePlaywright();

const SCRATCH = __dirname;
const wsEndpoint = fs.readFileSync(path.join(SCRATCH, 'ws-endpoint.txt'), 'utf8').trim();
const stepsFile = process.argv[2];
const steps = stepsFile.endsWith('.js')
  ? require(path.resolve(stepsFile))
  : JSON.parse(fs.readFileSync(stepsFile, 'utf8'));

const stateFileName = process.argv[3] || 'storage-state.json';
const stateFile = path.join(SCRATCH, stateFileName);
const hasState = fs.existsSync(stateFile);
const viewport = {
  width: Number(process.env.TC_VIEWPORT_W) || 1400,
  height: Number(process.env.TC_VIEWPORT_H) || 900,
};

async function runStep(page, step, ctx) {
  const { results, routeCallCounts } = ctx;
  switch (step.op) {
    case 'goto':
      await page.goto(step.url, { waitUntil: 'load', timeout: step.timeout || 15000 });
      return results.push({ op: step.op, ok: true, url: page.url() });
    case 'click': {
      const loc =
        step.nth != null
          ? page.locator(step.selector).nth(step.nth)
          : page.locator(step.selector).first();
      await loc.click({ timeout: step.timeout || 5000, force: !!step.force });
      return results.push({ op: step.op, ok: true });
    }
    case 'fill':
      await page
        .locator(step.selector)
        .first()
        .fill(step.value, { timeout: step.timeout || 5000 });
      return results.push({ op: step.op, ok: true });
    case 'type':
      await page
        .locator(step.selector)
        .first()
        .type(step.value, { delay: step.delay || 0 });
      return results.push({ op: step.op, ok: true });
    case 'press':
      if (step.selector) await page.locator(step.selector).first().press(step.key);
      else await page.keyboard.press(step.key);
      return results.push({ op: step.op, ok: true });
    case 'check':
      await page
        .locator(step.selector)
        .first()
        .setChecked(step.checked !== false, { timeout: step.timeout || 5000 });
      return results.push({ op: step.op, ok: true });
    case 'hover':
      await page
        .locator(step.selector)
        .first()
        .hover({ timeout: step.timeout || 5000 });
      return results.push({ op: step.op, ok: true });
    case 'waitFor':
      await page
        .locator(step.selector)
        .first()
        .waitFor({ state: step.state || 'visible', timeout: step.timeout || 10000 });
      return results.push({ op: step.op, ok: true });
    case 'waitForText':
      await page
        .getByText(step.text, { exact: !!step.exact })
        .first()
        .waitFor({ timeout: step.timeout || 10000 });
      return results.push({ op: step.op, ok: true });
    case 'waitForTimeout':
      await page.waitForTimeout(step.ms);
      return results.push({ op: step.op, ok: true });
    case 'screenshot': {
      const file = path.join(SCRATCH, 'screenshots', (step.name || 'shot') + '.png');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file, fullPage: !!step.fullPage });
      return results.push({ op: step.op, ok: true, file });
    }
    case 'screenshotElement': {
      const file = path.join(SCRATCH, 'screenshots', (step.name || 'shot') + '.png');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await page.locator(step.selector).first().screenshot({ path: file });
      return results.push({ op: step.op, ok: true, file });
    }
    case 'textContent': {
      const loc =
        step.nth != null
          ? page.locator(step.selector).nth(step.nth)
          : page.locator(step.selector).first();
      return results.push({
        op: step.op,
        ok: true,
        text: await loc.textContent({ timeout: step.timeout || 5000 }),
      });
    }
    case 'count':
      return results.push({
        op: step.op,
        ok: true,
        count: await page.locator(step.selector).count(),
      });
    case 'getAllText':
      return results.push({
        op: step.op,
        ok: true,
        texts: await page.locator(step.selector).allTextContents(),
      });
    case 'isVisible':
      return results.push({
        op: step.op,
        ok: true,
        visible: await page.locator(step.selector).first().isVisible(),
      });
    case 'isDisabled':
      return results.push({
        op: step.op,
        ok: true,
        disabled: await page.locator(step.selector).first().isDisabled(),
      });
    case 'isChecked':
      return results.push({
        op: step.op,
        ok: true,
        checked: await page.locator(step.selector).first().isChecked(),
      });
    case 'getAttribute':
      return results.push({
        op: step.op,
        ok: true,
        value: await page.locator(step.selector).first().getAttribute(step.attr),
      });
    case 'url':
      return results.push({ op: step.op, ok: true, url: page.url() });
    case 'evaluate': {
      // eslint-disable-next-line no-new-func
      // Tolerate a trailing `;` on the function source (prettier adds one to probe files).
      const fn = new Function('return (' + String(step.fn).trim().replace(/;+$/, '') + ')')();
      return results.push({
        op: step.op,
        ok: true,
        value: await page.evaluate(fn, step.arg),
        label: step.label,
      });
    }
    case 'reload':
      await page.reload({ waitUntil: 'load' });
      return results.push({ op: step.op, ok: true });
    case 'goBack':
      await page.goBack({ waitUntil: 'load' });
      return results.push({ op: step.op, ok: true });
    case 'goForward':
      await page.goForward({ waitUntil: 'load' });
      return results.push({ op: step.op, ok: true });
    case 'route':
      routeCallCounts[step.pattern] = 0;
      await page.route(step.pattern, async (route) => {
        routeCallCounts[step.pattern] += 1;
        if (step.delayMs) await new Promise((r) => setTimeout(r, step.delayMs));
        if (step.passthrough) return route.continue();
        return route.fulfill({
          status: step.status || 500,
          contentType: 'application/json',
          body: step.body || JSON.stringify({ error: 'Internal Server Error' }),
        });
      });
      return results.push({ op: step.op, ok: true });
    case 'getRouteCallCount':
      return results.push({ op: step.op, ok: true, count: routeCallCounts[step.pattern] || 0 });
    case 'startWatchRequests':
      ctx.watchMatch = step.match || null; // substring; null = all GET requests
      ctx.watchedRequests = [];
      return results.push({ op: step.op, ok: true });
    case 'getWatchedRequests':
      return results.push({
        op: step.op,
        ok: true,
        requests: ctx.watchedRequests ? [...ctx.watchedRequests] : [],
      });
    case 'unroute':
      await page.unroute(step.pattern);
      return results.push({ op: step.op, ok: true });
    default:
      return results.push({ op: step.op, ok: false, error: 'unknown op' });
  }
}

async function main() {
  const browser = await chromium.connect(wsEndpoint);
  const context = await browser.newContext({
    viewport,
    ...(hasState ? { storageState: stateFile } : {}),
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

  const ctx = { results: [], routeCallCounts: {}, watchedRequests: null, watchMatch: null };
  page.on('request', (req) => {
    if (!ctx.watchedRequests || req.method() !== 'GET') return;
    if (!ctx.watchMatch || req.url().includes(ctx.watchMatch)) ctx.watchedRequests.push(req.url());
  });

  for (const step of steps) {
    try {
      await runStep(page, step, ctx);
    } catch (e) {
      ctx.results.push({ op: step.op, ok: false, error: e.message });
    }
  }

  await context.storageState({ path: stateFile });
  console.log(
    JSON.stringify({ results: ctx.results, consoleErrors, finalUrl: page.url() }, null, 2),
  );
  process.exit(0);
}

main();
