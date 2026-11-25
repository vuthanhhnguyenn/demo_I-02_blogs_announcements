// Example scenario: open a list screen, exercise a filter, snapshot each state.
//   node run-steps.js steps/example-scenario.js storage-admin.json
// Read the printed JSON: each snapshotStep(...) result appears as
//   { op:'evaluate', label:'...', value:{ title, badge, rows, bannerText, ... } }
// Diff `value` against the test case's Expected Result.
const { snapshotStep } = require('../helpers');

module.exports = [
  { op: 'goto', url: 'http://localhost:3000/terms' },
  { op: 'waitForTimeout', ms: 1000 },
  snapshotStep('initial'),

  // debounce check: type fast, confirm only one request fires
  { op: 'startWatchRequests', match: '/crm/terms' },
  { op: 'type', selector: 'input[placeholder*="検索"]', value: '決済規約', delay: 60 },
  { op: 'waitForTimeout', ms: 900 },
  { op: 'getWatchedRequests' },
  snapshotStep('after-search'),

  // proof screenshot for the report
  { op: 'screenshot', name: 'example-after-search' },
];
