// Small helpers for building step arrays in scenario files.
const fs = require('node:fs');
const path = require('node:path');

// Probe files hold a bare arrow-function expression, which run-steps.js evaluates as
// `new Function('return (' + fn + ')')`. Prettier formats them as a statement and adds a
// trailing `;`, which makes that wrapper a syntax error — strip it on read.
const readProbe = (file) =>
  fs.readFileSync(path.join(__dirname, file), 'utf8').trim().replace(/;+$/, '');

const SNAPSHOT = readProbe('snapshot.js');
const LAYOUT_PROBE = readProbe('layout-probe.js');

// An `evaluate` step that runs the shared snapshot probe and labels the result.
function snapshotStep(label) {
  return { op: 'evaluate', fn: SNAPSHOT, label };
}

// An `evaluate` step that measures whether the layout holds — page-level horizontal
// overflow, off-viewport controls, clipped text, overlapping controls. Run it at the
// 1024px floor (TC_VIEWPORT_W=1024 TC_VIEWPORT_H=768) with long values on screen.
function layoutStep(label) {
  return { op: 'evaluate', fn: LAYOUT_PROBE, label };
}

// The real login flow (phase 2): the form at /login signs in through Cognito and then
// exchanges the id token with the CRM API, so it is a two-request round trip — wait for
// the post-login navigation instead of a short fixed timeout.
//
// Accounts: ./accounts.js (real Cognito test pool, one slot per concurrent agent; `Password@123`).
// Do NOT run repeated wrong-password attempts — Cognito locks the account for ~15 min.
function loginSteps(email, password = 'Password@123', baseUrl = 'http://localhost:3000') {
  return [
    { op: 'goto', url: `${baseUrl}/login` },
    { op: 'fill', selector: '#email', value: email },
    { op: 'fill', selector: '#password', value: password },
    { op: 'click', selector: 'button[type=submit]' },
    // Real Cognito + /crm/login: allow for a slow round trip, then confirm we left /login.
    { op: 'waitForTimeout', ms: 8000 },
    { op: 'url' },
  ];
}

module.exports = { SNAPSHOT, LAYOUT_PROBE, snapshotStep, layoutStep, loginSteps };
