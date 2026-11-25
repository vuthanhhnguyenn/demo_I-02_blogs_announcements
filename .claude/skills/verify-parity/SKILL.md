---
name: verify-parity
description: >-
  Verify a feature's checklists/parity.md against the real running app as a
  black-box tester — never by reading source or trusting tasks.md prose. Drives
  a headless browser through the built screen, confirms each PAR### item's
  element/copy/order/state actually renders, then ticks matched items [x] and
  leaves unmet ones [ ] with an evidence note in the checklist file itself. Use
  after implementing a screen's UI tasks, or whenever /speckit.implement's
  after_implement hook fires for a feature that has checklists/parity.md. This
  is the automated version of the parity gate speckit-implement's step 9
  otherwise leaves to ad-hoc judgment.
---

# Verify a UI parity checklist against the live app

`checklists/parity.md` is a V0-element inventory: each `PAR###` line is a claim
("this control/copy/state exists in the built screen, matching V0"). Only a
tester driving the actual app can confirm that claim. This skill exists so
every feature checks it the same way, instead of an implementing agent
inventing its own verification method each time (or worse, ticking items from
memory of what it just wrote).

## 0. Scope check — stop early if there's nothing to verify

Resolve FEATURE_DIR (from the caller's args, the current branch name
`NNN-slug`, or the feature currently being implemented). If
`specs/<feature>/checklists/parity.md` does not exist, say so and stop — this
skill has nothing to do for features without a parity checklist.

## Black-box only — same rule as `execute-testcases`, read first

> ⛔ Do **not** open the V0 mockup file, the app's source (`src/app/**`,
> components, route handlers), or seed files to judge a PAR item. Each
> `PAR###` line already fully spells out the expected element, copy, order, and
> condition in text — **that line is the oracle**. Your job is to compare the
> live rendered screen against that sentence, the same way a tester compares a
> screen against a written spec.

Respect the checklist's own scoping notes: a heading or note like "do not
build for Phase 1" (see this repo's `parity.md` files for the pattern) marks
those items **out of scope for the current phase**, not failing. Record them
as `deferred`, never as a gap.

## The harness — reused, not reinvented

This skill shares the exact Playwright driver `execute-testcases` uses —
`.claude/skills/execute-testcases/harness/`:

| File                | Role                                                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pw.js`             | Resolves Playwright + cached Chromium.                                                                                                                                             |
| `launch-server.js`  | Starts one long-lived headless Chromium server.                                                                                                                                    |
| `run-steps.js`      | Runs a scenario of JSON steps against that server.                                                                                                                                 |
| `snapshot.js`       | Generic in-page probe for shadcn/base-ui list screens — adapt its selectors for dialogs/detail views a parity check needs to inspect.                                              |
| `helpers.js`        | `snapshotStep(label)` / `loginSteps(email)`.                                                                                                                                       |
| `fill-checklist.js` | Writes a `{PAR###: {checked, note?, deferred?}}` map back into the checklist markdown (checkbox + evidence note — different shape from `fill-results.js`, which fills a TC table). |

Do not copy/fork the driver files — point at the same harness directory so
fixes to the browser plumbing benefit both skills.

## Workflow

### 1. Read the whole checklist

Parse every `PARxxx` line (element, exact copy, ordering, conditional state)
and every scoping note/heading. Build a mental checklist of concrete states to
drive to: list view, search-active, empty state, each dialog, each role-gated
control, pagination edges, etc.

### 2. Start the app and browser server (once)

```bash
D="<scratchpad>/parity-run"; mkdir -p "$D"
cp -r .claude/skills/execute-testcases/harness/* "$D/"
nohup npm run dev > "$D/dev.log" 2>&1 &
for i in $(seq 1 30); do [ "$(curl -s -o /dev/null -w %{http_code} http://localhost:3000/)" != 000 ] && break; sleep 2; done
cd "$D" && nohup node launch-server.js > server.log 2>&1 & disown
sleep 3 && cat "$D/ws-endpoint.txt"
```

### 3. Log in with full-visibility role

Parity is about structure/copy fidelity, not the permission matrix (that's
`execute-testcases`'s job) — log in once as Headquarter/System
(`admin@example.com` / `password123`) so every gated control is visible to
check against its PAR description.

### 4. Drive to each state and snapshot

For each PAR item, navigate/interact to reach the exact state it describes
(open the add/edit dialog, trigger the empty state, open the delete
confirmation, search to show the filter banner, page to the last page, etc.),
then read the live DOM via `snapshotStep()` / a targeted `evaluate`, plus a
`screenshot` for anything visual. Adapt `snapshot.js`'s probe or write a
one-off `evaluate` per dialog/state — it reads the rendered DOM generically,
never the app's source.

Judge strictly against the PAR line's own wording: exact copy, field order,
icon/variant, role-gating, disabled conditions. A close-but-not-exact match
(wrong label, missing helper text, different order) is a gap, not a pass.

### 5. Record results

Build a `results.json` keyed by PAR id:

```json
{
  "PAR001": { "checked": true },
  "PAR005": {
    "checked": false,
    "note": "no filter-result banner after searching \"a\" on /domains — screenshot filter-banner.png"
  },
  "PAR016": {
    "checked": false,
    "deferred": true,
    "note": "Phase 2 per spec.md FR-015, per this doc's own note"
  }
}
```

```bash
node fill-checklist.js "specs/<feature>/checklists/parity.md" results.json
```

Every unchecked item **must** carry a `note` — either the observed gap
(screenshot/DOM/network evidence, not a guess) or the deferred reason quoted
from the checklist's own scoping note.

### 6. Report

Summarize: confirmed / gap / deferred counts, and for every gap the concrete
mismatch (what actually renders vs. what the PAR line says) with black-box
evidence. State plainly whether the checklist now passes (0 unresolved gaps —
deferred items don't block). Per `speckit-implement`'s own rule, the screen is
**not done** while any non-deferred PAR item is unchecked; this skill reports
that status, it does not fix the code. If gaps exist, the implementer fixes
them and reruns this skill to re-verify and re-tick — do not hand-edit the
checkboxes.

## Notes & gotchas

Same as `execute-testcases` (see its SKILL.md): `run-steps.js` never aborts on
a bad step, base-ui `Select`/`Dialog` render in a portal, disabled role-gated
controls swallow pointer events (assert via attributes, not by clicking),
Chromium must be pre-installed (`npx playwright install chromium`), and
destructive actions (delete confirmations) mutate the mock DB — restart the
dev server before checks that assume the original seed count. Keep everything
under the scratchpad; never commit `storage-*.json`, `out-*.json`, or
screenshots.
