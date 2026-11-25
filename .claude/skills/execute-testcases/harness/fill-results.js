// Writes execution results back into a test-case markdown table.
//
//   node fill-results.js "<path to TC markdown>" "<results.json>" ["Tester name"]
//
// results.json shape — keyed by Test Case ID:
//   {
//     "TC-001": { "status": "OK" },
//     "TC-005": { "status": "NG", "bugId": "BUG-X-01", "prio": "Medium",
//                 "note": "actual vs expected discrepancy ..." },
//     "TC-011": { "status": "Block", "note": "needs extra seed data" }
//   }
// status: OK (pass) | NG (fail/bug) | Block (could not execute) | Untested
//
// Assumes the standard column layout of this repo's test-case template
// (a single execution pass — no Round 2, no Tablet/Mobile split):
// col 12 = Executed By, 13 = Execution Date, 14 = Status,
//  15 = Bug ID, 16 = Bug Priority, 17 = Notes.
// If a screen's template differs, adjust the column indices below.
const fs = require('node:fs');

const FILE = process.argv[2];
const RESULTS = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const TESTER = process.argv[4] || 'Claude (automated/Playwright)';
const today = new Date();
const DATE = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const COL = { by: 12, date: 13, status: 14, bugId: 15, bugPrio: 16, notes: 17 };

const lines = fs.readFileSync(FILE, 'utf8').split('\n');
let updated = 0;

const out = lines.map((line) => {
  const m = line.match(/^\|\s*(TC-\d{3})\s*\|/);
  if (!m || !RESULTS[m[1]]) return line;
  const r = RESULTS[m[1]];
  const cols = line.split('|'); // cols[1]=ID ... cols[n]=Notes, cols[0] & last are ''
  cols[COL.by] = ` ${TESTER} `;
  cols[COL.date] = ` ${DATE} `;
  cols[COL.status] = ` ${r.status} `;
  if (r.status === 'NG') {
    if (r.bugId) cols[COL.bugId] = ` ${r.bugId} `;
    if (r.prio) cols[COL.bugPrio] = ` ${r.prio} `;
  }
  if (r.note && cols[COL.notes] !== undefined) {
    const existing = cols[COL.notes].trim();
    cols[COL.notes] = ` ${existing ? existing + ' ' : ''}${r.note} `;
  }
  updated += 1;
  return cols.join('|');
});

fs.writeFileSync(FILE, out.join('\n'));
console.log('Updated rows:', updated, '/ results provided', Object.keys(RESULTS).length);
