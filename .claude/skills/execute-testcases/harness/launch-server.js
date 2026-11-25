// Launches one long-lived headless Chromium "browser server" that every
// run-steps.js invocation connects to. Keeps browser startup cost out of the
// per-scenario loop. Writes its ws:// endpoint to ws-endpoint.txt.
//
// Usage:  node launch-server.js        (run in the background / nohup)
const fs = require('node:fs');
const path = require('node:path');
const { resolvePlaywright, resolveChromiumExecutable } = require('./pw');

const { chromium } = resolvePlaywright();
const SCRATCH = __dirname;

async function main() {
  const executablePath = resolveChromiumExecutable();
  const browser = await chromium.launchServer({
    headless: true,
    args: ['--no-sandbox'],
    ...(executablePath ? { executablePath } : {}),
  });
  fs.writeFileSync(path.join(SCRATCH, 'ws-endpoint.txt'), browser.wsEndpoint());
  console.log('READY', browser.wsEndpoint());

  process.on('SIGTERM', async () => {
    await browser.close();
    process.exit(0);
  });

  await new Promise(() => {}); // keep alive
}

main();
