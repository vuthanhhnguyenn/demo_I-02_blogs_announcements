// Shared Playwright resolver.
// `playwright` is a project devDependency (see package.json), so a plain
// `npm install`/`pnpm install` is enough. We fall back to a copy shipped
// with a globally-installed `@playwright/mcp` for environments that predate
// that devDependency. We also point at whatever Chromium build is already
// cached under ~/.cache/ms-playwright so no download is needed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

function resolvePlaywright() {
  // 1) project-local devDependency
  const candidates = [];
  try {
    candidates.push(require.resolve('playwright'));
  } catch {
    /* not local */
  }
  // 2) inside globally installed @playwright/mcp
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    candidates.push(path.join(globalRoot, '@playwright', 'mcp', 'node_modules', 'playwright'));
    candidates.push(path.join(globalRoot, 'playwright'));
  } catch {
    /* npm not available */
  }
  for (const c of candidates) {
    try {
      const mod = require(c);
      if (mod && mod.chromium) return mod;
    } catch {
      /* keep trying */
    }
  }
  throw new Error(
    'Could not resolve the `playwright` module. Run `npm install` (it is a ' +
      'devDependency) or ensure @playwright/mcp is installed globally.',
  );
}

function resolveChromiumExecutable() {
  // Reuse the already-cached Chromium so we never trigger a download.
  const cacheDir = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(cacheDir)) return undefined;
  const dirs = fs
    .readdirSync(cacheDir)
    .filter((d) => d.startsWith('chromium-'))
    .sort();
  for (const d of dirs.reverse()) {
    const exe = path.join(cacheDir, d, 'chrome-linux64', 'chrome');
    if (fs.existsSync(exe)) return exe;
    const macExe = path.join(
      cacheDir,
      d,
      'chrome-mac',
      'Chromium.app',
      'Contents',
      'MacOS',
      'Chromium',
    );
    if (fs.existsSync(macExe)) return macExe;
  }
  return undefined; // let Playwright use its own default
}

module.exports = { resolvePlaywright, resolveChromiumExecutable };
