// Writes verification results back into a flat markdown checklist
// (`- [ ] ID rest-of-line`), e.g. specs/<feature>/checklists/parity.md.
// Different shape from fill-results.js (which fills a TC-### table's
// execution columns) — a checklist is just checkbox lines, so this only
// flips [ ]/[x] and appends/refreshes a trailing evidence note.
//
//   node fill-checklist.js "<path to checklist markdown>" "<results.json>"
//
// results.json shape — keyed by item ID (e.g. "PAR001"):
//   {
//     "PAR001": { "checked": true },
//     "PAR005": { "checked": false, "note": "banner never renders; searched \"a\" on /domains, no filter-result text — see screenshot filter-banner.png" },
//     "PAR016": { "checked": false, "note": "Phase 2 per spec.md FR-015", "deferred": true }
//   }
// checked: true only after the element/state was confirmed rendering in the
// live app and matching the item's description. `note` is required whenever
// checked is false, so the gap (or deferred reason) is traceable without
// re-running the check.
const fs = require('node:fs');

const FILE = process.argv[2];
const RESULTS = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));

const LINE_RE = /^(\s*-\s*\[)([ xX])(\]\s+)([A-Za-z][\w-]*\d+)\b(.*)$/;
// Strips a note this script appended on a previous run, so reruns don't pile up.
const OLD_NOTE_RE = /\s*—\s*(?:⚠ Gap|⏸ Deferred):.*$/;

const lines = fs.readFileSync(FILE, 'utf8').split('\n');
let updated = 0;
const seen = new Set();

const out = lines.map((line) => {
  const m = line.match(LINE_RE);
  if (!m || !RESULTS[m[4]]) return line;
  const [, prefix, , bracketClose, id, rest] = m;
  const r = RESULTS[id];
  seen.add(id);
  updated += 1;

  const cleanRest = rest.replace(OLD_NOTE_RE, '');
  const box = r.checked ? 'x' : ' ';
  let note = '';
  if (!r.checked && r.note) {
    note = ` — ${r.deferred ? '⏸ Deferred' : '⚠ Gap'}: ${r.note}`;
  }
  return `${prefix}${box}${bracketClose}${id}${cleanRest}${note}`;
});

fs.writeFileSync(FILE, out.join('\n'));

const missing = Object.keys(RESULTS).filter((id) => !seen.has(id));
console.log('Updated items:', updated, '/ results provided', Object.keys(RESULTS).length);
if (missing.length) console.log('IDs not found in file (check spelling):', missing.join(', '));
