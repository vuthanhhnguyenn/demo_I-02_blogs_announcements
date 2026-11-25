---
name: gen-testcases
description: >-
  Write (author, not run) a test-case document for a screen or a function in
  this CRM. Use when asked to "Create testcase / gen testcase / write test cases"
  for a screen, feature, or function (e.g. terms list, member detail, a search
  or CRUD flow). Produces a filled `specs/<feature>/tests/cases/TC -….md` from the
  feature's spec documentation + UI prototype + the common checklists. Pairs with
  the sibling `execute-testcases` skill, which runs the document this one produces.
---

# Generate test cases for a screen / function

You are acting as a **test designer**. The deliverable is a Markdown test-case
document following this repo's template, covering one screen or one function,
grounded **only** in that feature's written specification and its UI prototype,
plus the two shared checklists. This skill **writes** cases; it does not execute
them (that's `execute-testcases`).

## The test plan — the directive for WHAT to generate

If a **test plan** exists at `specs/<feature>/tests/test-plan.md`, it drives this
skill: it decides **which unit to generate and how** (it does not decide OK/NG —
that's the oracle below). Per screen/cluster ("test unit") it defines the unit and
its **TC doc filename** (use verbatim), the exact **sources** to read for it
(which `spec.md` sections + which `.cache/…/*.tsx` prototype), the **coverage focus**
and **requirement → unit** map, and **scope + order**.

- Generate **one unit per invocation** unless the user asks for more.
- The plan **narrows** which sources to read and **adds** focus — it never replaces
  the full coverage walk (§Coverage dimensions) or the oracle. Oracle wins on
  conflict; flag it.
- **No plan** → take scope from the user's request (§4) and generate from the
  sources directly. If the user names a unit not in the plan, honour it and note
  the divergence.

## Phase 2 — the project is on the real API now (read first)

Screens that went through `integrate-real-api` no longer talk to the mock: they call
the **real dev backend** (`NEXT_PUBLIC_REAL_API_URL`) and are exercised with **real
Cognito accounts** (`src/lib/auth/demo-users.ts` — one per role). What this changes
for authoring:

- **Server-owned behaviour is now in scope.** Server-side validation beyond the
  client's, documented error codes (`E-XXX-nnn`), 401 session expiry, server-enforced
  role/scope, real pagination totals, persistence after reload/re-login, two-tab
  conflicts — write these as real cases with real expected results. They are no
  longer "the mock can't do it → Block".
- **Round 1 integrations leave known gaps.** Read `specs/<feature>/integration-plan.md`
  when it exists: its blocker table (`Bn`) lists controls deliberately left disabled
  with 「API未対応」 or values stripped from the request. Still write the case to the
  **spec's** expected result, and add a Note: `known Round 1 gap Bn — expect Block,
not NG`.
- **The backend is shared and has no seed reset.** Cases must not depend on a fixed
  row count they don't create, and destructive cases must target a record the run
  creates itself (see §3 Test-data reference).

## Sources — the only inputs you may read (the oracle)

Write every test case from these, and **only** these, **in this priority order**:

1. **Spec / requirement documentation** — `specs/NNN-*/spec.md`, the requirement
   docs it references (`.cache/fitness-spec/crm/requirements/*.md`). **Highest
   priority: the spec decides what should happen.**
2. **UI prototype (design)** — the V0 prototype screens at
   `.cache/fitness-crm-ui/src/pages/*.tsx`. **Second priority**, and the source for
   _UI detail_: exact labels, layout, controls, states, intended CSS behaviour.
3. **The two shared checklists** — `tests/checklists/common-function-checklist.md`
   and `tests/checklists/common-gui-validate-checklist.md`.

Two supporting artifacts you may read but which are **never an oracle**:

- `specs/<feature>/tests/test-plan.md` — a directive (which unit, which sources).
- `specs/<feature>/integration-plan.md` — a register of known Round 1 gaps (`Bn`).
  It records what the app currently does; it never sets what it _should_ do.

One narrow exception to the ⛔ rule below: `src/lib/auth/demo-users.ts` is the **QA
credentials sheet** (real Cognito accounts per role) — read it to write
pre-conditions, nothing else.

> ⛔ **Do NOT read the as-built implementation code.** Never open
> `src/app/(private)/<screen>/…`, `src/app/api/**/route.ts`,
> `src/app/api/_mock-db/…`, seed files, Zod schemas, or any component/hook source
> to decide what a test should assert. Reading the implementation to author tests
> produces cases that merely **confirm the code instead of challenging it** — a
> code-derived expectation is tautological and can never catch the code being
> wrong. The oracle (what _should_ happen → decides OK/NG) comes from the spec
> and the UI prototype, never from the implementation. If the spec or prototype is
> silent on a detail, leave it as an explicit open question in the case's Notes —
> do **not** go read the code to fill it in.

## Output language & execution model

- **Write the document in English.** Categories, steps, expected-result prose,
  and notes are all English.
- **Keep source-language (Japanese) text verbatim ONLY where the case asserts on
  it** — i.e. anything the tester must match character-for-character against the
  screen or spec: UI labels, button/tab captions, error/toast/dialog messages,
  enum & status text, and concrete field values / counts. A wrong or
  paraphrased verbatim string causes a false NG, so copy these from the spec /
  UI prototype, don't translate them. Gloss a verbatim string in English on first
  use where it aids reading: `会員規約 (Membership terms)`. Do **not** wrap generic
  prose in Japanese.
- **Single execution pass.** The project runs the doc **once** — there is no
  Round 2. A failure is logged `NG` + bug id; the developer re-verifies manually
  after the fix. So the template has one execution group (Executed By / Execution
  Date / Status / Bug ID / Bug Priority), not per-round columns.

## Test philosophy — read first

1. **The oracle is the spec first, then the prototype — this is the crux.** The
   oracle (what SHOULD happen → decides OK/NG) is the requirement doc, with the V0
   prototype second.
   - Take **expected results** (error text, computed status, business rules) from
     the requirement doc.
   - Take **executable detail** the tester needs to run the case — the exact
     Japanese label to look for, the control to click, the expected layout/CSS
     behaviour (truncate vs wrap, dimmed row, badge colour) — from the **UI
     prototype**, so you don't guess wording and fire false NGs.
   - **Spec has it, prototype doesn't** (a requirement with no screen/control in the
     prototype): **still write the case**, judged on the spec's intent, and mark the
     Notes cell `[Spec-only] no prototype reference — UI detail unspecified; judge on
spec intent`. These are the cases most often silently dropped, and the ones most
     likely to be genuinely unimplemented. The test plan's **spec-vs-prototype
     deltas** table lists them when a plan exists; when it doesn't, walk the FR list
     yourself and derive them.
   - **Prototype has it, spec doesn't**: usable for UI detail, but mark the Notes
     `[Prototype-only] not in spec — confirm with PO` so it is not enforced as a hard
     requirement.
   - Where the spec and the prototype **contradict each other**, do not silently
     pick one: write the case to the requirement doc's intent and flag the
     conflict in Notes so it gets resolved.
   - **The running app and the real API are never the oracle.** An observed response
     shape or a current behaviour does not become the expected result.

2. **When a Source is unavailable, stop and say so — do not substitute code.**
   The `.cache/*` paths are git submodules that are often removed/gitignored
   locally. If you cannot read the spec docs or the UI prototype, **do not fall back
   to reading the implementation.** Instead: write only the cases you can ground
   in what you _do_ have, put a prominent **"Source note"** at the top of the TC
   doc listing exactly which inputs were missing, and mark every case that needs
   the missing Source as **`Block` — needs spec/prototype** rather than inventing an
   expected result. Tell the user which inputs to restore.

3. **The BE is real now — write the BE-owned cases for real.** Integrated screens
   run against the real dev backend with real accounts. So:
   - Base expected results on what the **spec / prototype** define, never on an
     observed API response.
   - **Do write** the cases that used to be deferred: server-side validation beyond
     the client's (max-length + 1, duplicates, out-of-range numbers submitted for
     real), each documented error code's user message, 401 after session expiry,
     server-enforced permission on direct URL access for a denied role, real
     pagination totals across pages, a value read back after a hard reload and a
     fresh login, and the two-tab conflict path. The shared
     **Real-API Integrated Screen** section of `common-function-checklist.md` is the
     walk list.
   - **Known Round 1 gaps are `Block`, not `NG`.** Where `integration-plan.md` records
     a blocker (`Bn`) — a disabled 「API未対応」 control, a stripped field — write the
     case to the spec and note `known Round 1 gap Bn → expect Block`.
   - **Shared environment.** Other people mutate this backend. Don't assert a count
     the case didn't create, don't delete or rename pre-existing master data, and say
     in the case's Test Data what the case must create first (with the run's test
     prefix) so it is reproducible.
   - **Real Cognito.** Consecutive wrong-password cases lock the account for ~15
     minutes; a lockout case must be flagged in Notes as "run last, isolated account".

4. **Cover breadth deliberately** — walk every dimension below, not just the happy
   path. Missing a whole dimension (e.g. long-string layout, an entire role) is
   the usual defect in a TC doc.

## Coverage dimensions (checklist to walk for every screen/function)

- **Main flow / happy path** (High): the feature's core purpose, per acceptance
  scenarios in the spec.
- **Fields & GUI** (from `common-gui-validate-checklist.md`): each input's label,
  default/placeholder, required, max/min length, valid/invalid values; tables,
  select boxes, checkboxes, date fields, buttons, links, pagination.
- **Validation & errors** (Medium): required-field blocks (incl. whitespace-only),
  format errors, boundary values (min = 1 char; max = the limit stated in the
  spec/prototype, **or the default convention below when the spec is silent**),
  duplicate/unique. See **Default field constraints**.
- **Permissions / roles** (High): every role in the permission matrix from the
  spec. This CRM's roles: System, Headquarter, Manager, Staff, Observer, Trainer.
  Test allowed vs denied for each gated action (create/edit/delete/…), view-only
  vs manage, and **brand data-scope** (Manager/Staff/Observer see only their
  brand). Include direct-URL access for denied roles.
- **States**: loading/skeleton, error + retry, true-empty vs filtered-empty,
  deleted/dimmed rows.
- **List mechanics**: search (partial/case-insensitive/debounce), each filter,
  combined filters, filter banner + clear-conditions, tabs, pagination
  (page-size, next/prev disabled at ends, retain conditions across pages).
- **Layout robustness — the highest-yield UI dimension in this project, always
  `High` priority.** Real data is longer and uglier than prototype data, so this is
  where the UI actually breaks. For every unit, write cases with the **long-value
  kit**:
  - a max-length **full-width Japanese** name/title (counts per character),
  - the **same length as one unbroken token** (no spaces / no word-break points),
  - a long **e-mail / code / URL**, the **longest enum or badge label** in the
    vocabulary, and a **many-items** case (max chips/tags, longest select option),
  - a **numeric/amount at max digits** where the design reserved a narrow column.

  Assert them in **every place the value renders**: table cell, badge, card, detail
  header, dialog/confirmation text, toast, filter-summary banner, breadcrumb,
  sidebar/nav entry, tab caption, select trigger, and the signed-in user menu —
  the fixed-width **chrome** breaks before the table does.
  Confirm the strategy the prototype intends (truncate+ellipsis with tooltip / wrap /
  horizontal-scroll) and that nothing overlaps, clips with no way to read the full
  value, pushes controls off-screen, or forces page-level horizontal scroll.
  **Run each of these at the 1024px floor**, not only at desktop width — see the
  Responsive dimension. On the real API the long value usually has to be **created
  by the case itself**; say so in the case's Test Data.

- **URL / state persistence**: filter/tab/page reflected in URL, reload,
  back/forward, direct deep-link with query params (per the spec's stated
  behaviour).
- **Concurrency / abuse**: double-click/spam guard on submit & destructive
  actions, debounced search firing once.
- **Time / computed state** (High if the feature has it): values derived from
  dates or "now" — e.g. status = draft/scheduled/active/expired from effective
  dates. Test the **boundaries in time** (just before / at / just after the
  effective datetime), not only a mid-range value.
- **Internationalisation & Japanese input** (Medium): copy is Japanese; dates use
  the `ja` locale. Test full-width vs half-width characters, IME/CJK input, and
  whether max-length counts by character or code unit (a full-width name at the
  limit). Confirm date/number formatting matches the `ja` locale.
- **Output escaping / injection** (Medium): put HTML / `<script>` / markup into
  any free-text field that is later displayed (name, title) and confirm it
  renders as **literal text, not markup** — a display-field escaping/XSS check,
  distinct from the layout check.
- **Responsive — minimum width 1024px** (High for the floor check): the supported
  range is **1024px and wider**. **Anything narrower than 1024px is out of scope** —
  do NOT write phone-only cases (off-canvas/hamburger, table→card reflow,
  touch-target size), and the doc records a **single result column**, not a
  per-device split. What to write instead:
  - a **floor case at 1024×768**: no page-level horizontal scroll (a table's own
    horizontal scroll is fine when the design says so), nothing overlapping the
    sticky header/sidebar, every action button still visible and clickable;
  - a **wide case at ≥1440px**: the layout does not stretch into unreadable gaps or
    strand controls at opposite edges;
  - the **intersection**: the long-value kit above rendered at 1024px — state the
    viewport explicitly in the case's steps, since a value that fits at 1440px can
    break the row at 1024px.
- **Real-API behaviour** (High, phase 2): walk the **Real-API Integrated Screen**
  section of `common-function-checklist.md` — server-side rejection of what the
  client accepted, each documented `E-XXX-nnn` code's user message, 401 after the
  session expires, server-enforced role/scope via direct URL as a denied role, list
  totals consistent across real pages, a saved value read back after a hard reload
  and a fresh login, the two-tab conflict path, and any 「API未対応」 control the
  integration plan records as a Round 1 gap.
- **Traceability**: each case should trace to a requirement / acceptance-scenario
  ID from the spec; conversely, walk the requirement list and confirm **every
  requirement has ≥1 case**. A requirement with no case is the coverage hole that
  matters most.

> Apply standard test-design techniques to keep coverage high without bloat:
> **equivalence partitioning** (one case per class of input, not per value),
> **boundary-value analysis** (n−1 / n / n+1 around every limit), and a small
> **decision table** when conditions combine (role × brand × filter). These also
> guard against the opposite failure — 100 near-duplicate cases that still miss a
> class.

## Default field constraints (when the spec/design is silent)

Specs and prototypes here routinely omit field limits, so boundary cases get skipped
and data bugs (DB truncation, unvalidated numbers, 500s) slip through. **Do not
skip the boundary case just because no limit is written** — fall back to the
shared **"Default field constraints"** table in
`common-gui-validate-checklist.md` (single-line text 255, textarea 1000, integer
9 digits, money 9 int digits, start ≤ end dates, full-width counted per char).

- Write the n−1 / n / n+1 boundary case against the assumed default.
- Expected result = "blocked / capped / validation error at the limit"; if the
  field instead accepts unbounded input with no error, that is a **finding**, not
  a pass.
- Note each such case `assumed default (…); confirm with PO/schema owner` so it
  reads as an assumption, not an invented hard requirement — and is not a false
  NG if the PO later sets a different limit.
- Keep the real-limit rule too: if the spec/prototype **does** state a limit, use
  that number and skip the default.
- A spec line that only **records** the gap ("the prototype has no check",
  "stored as entered", "informational, not a requirement") is still silence, not a
  decision: expect the default and note
  `spec records no check; default applied — confirm with PO`. Only an explicit
  client/PO answer overrides the default (a
  date-order case once passed as "stored as entered" — Y-02 Bug No.19).

## Checklist-first rule (important — user's standing preference)

The two files in `tests/checklists/` are **living, shared checklists**:
`common-function-checklist.md` and `common-gui-validate-checklist.md`. When you
find a class of check that is **missing** from them (e.g. long-string display
was once absent), **add a row to the shared checklist first**, then expand it
into concrete cases in the screen's TC doc. Fix the gap at the common level so
every future screen inherits it — don't just patch the one TC document. See the
memory note `feedback-checklist-first-workflow`.

## Workflow

### 1. Locate the inputs

- **The test plan first** (`specs/<feature>/tests/test-plan.md`) — picks the unit,
  its sources, focus, and filename; read only what that unit maps to (see **The
  test plan** section). Missing → scope from the user's request (§4).
- The feature spec: `specs/NNN-*/spec.md` (the sections the plan's unit maps to).
- The requirement docs the spec references
  (`.cache/fitness-spec/crm/requirements/*.md`).
- The UI prototype: `.cache/fitness-crm-ui/src/pages/*.tsx` for this screen.
- `specs/<feature>/integration-plan.md` if it exists — the Round 1 blocker table
  (`Bn`), read as known gaps, never as expected results.
- The template: `tests/test-case-template.md` (column layout, priority
  defs, naming convention).
- The two checklists under `tests/checklists/`.
- If the spec docs or the UI prototype are unreadable, note it and follow
  philosophy #2 (mark affected cases `Block`; **do not** substitute code).

### 2. Read the spec, then the UI prototype

Per Test philosophy #1: spec/requirement doc = **what should happen** (business
rules, acceptance scenarios, computed logic, validation, permission matrix, field
limits) and wins on conflict; V0 prototype = **UI detail** (exact Japanese
labels/messages, controls + placement, states, intended layout/CSS behaviour).
Extract from those two only. While reading, keep a running list of **spec
requirements with no prototype counterpart** — each becomes a `[Spec-only]` case.

- If neither states a detail, record it as an open question in Notes — never open
  the implementation to fill it (see **Sources**). For a missing **field limit**,
  apply **Default field constraints**.

### 3. Build the test-data reference

Base test data on the **example data described in the spec** and the **sample
rows shown in the UI prototype** — not on any seed file and not on whatever the dev
backend happens to hold today. Tabulate the rows a tester should expect (id, type,
brand, status, deleted…) so each case can name concrete data.

Phase 2 rules for the data table:

- **The dev backend is shared and never reset.** Mark every count-sensitive case
  "verify at execution" rather than hard-coding a total, unless the case creates the
  rows itself.
- **Cases create their own data.** For long-value / boundary / destructive cases, the
  case's Test Data column states the record to create first, with the run's test
  prefix (e.g. `TC-<unit>-…`) so it is identifiable and disposable.
- **Never target pre-existing master data** with an edit/delete case.
- **Credentials**: list the real Cognito account per role from
  `src/lib/auth/demo-users.ts` in the common pre-conditions (PC-A/PC-B/…), and note
  that the 「デモ: ユーザー切替」 switcher needs `NEXT_PUBLIC_APP_ENV=development`.
- **Record data limitations** (e.g. "multi-page pagination needs N rows → create or
  verify at execution") and reference them in the affected cases' Notes.

### 4. Confirm scope — from the test plan, then the user's request

If a **test plan** exists, the unit's scope (in/out) is already defined there —
generate that unit and mark the plan's out-of-scope screens out of scope in the
doc header. If the user's request narrows it further ("list screen only"), honour
the request over the plan and note the divergence. If **no plan** exists, take
scope from the user's request. Either way, don't silently expand or narrow.

### 5. Write the document

- Path + filename (use the plan's filename verbatim when a plan exists):
  `specs/<feature-folder>/tests/cases/TC -【Fitness CRM】- [<ScreenID>][<FunctionName>].md`
  — co-located with the feature's `tests/test-plan.md`; keep the template's
  `【】[]` convention; the ID can be the PO spec id, e.g. `Y-04`.
- Sections: title + scope line; **Source note** (list which inputs were used, and
  any that were missing per philosophy #2, plus the integration round the screen is
  on and the backend it was authored against); **Spec-vs-prototype deltas** (the
  `[Spec-only]` requirements and any conflict, with the TC ids that cover them);
  **Known Round 1 gaps** (`Bn` → affected TC ids → expected `Block`); test-data
  reference + limitations; priority defs; **common preconditions** (one row per
  role/state with its real Cognito account, referenced as PC-A/PC-B/… to keep step
  cells short); metadata; then the big **test-case table**.
- Table columns must match the template **exactly** (Category I/II/III,
  Normal/Abnormal, Pre-condition, Steps, Expected, Test Data, Priority, then the
  single execution group — Executed By / Execution Date / Status / Bug ID / Bug
  Priority — and Notes; no Round 2, no Mobile columns). Leave the execution
  columns blank — `execute-testcases` fills them.
- Category I/II/III = screen → section → field/behavior. One row per check.
  Priority: High = core flow + immediately-visible UI; Medium = validation;
  Low = rare/edge.
- Expected results must be **specific and verifiable** (real copy from the
  spec/prototype, real counts, real intended CSS effect), phrased so a tester can
  mark OK/NG without guessing.

### 6. Verify table integrity (do not skip)

Markdown tables silently corrupt when a row's pipe count ≠ the header's. After
writing, check every row programmatically:

```bash
python3 - <<'EOF'
path = "specs/<feature>/tests/cases/TC -….md"
L = open(path, encoding="utf-8").read().splitlines()
h = next(i for i,l in enumerate(L) if l.strip().startswith("| Test Case ID"))
n = L[h].count("|")
bad = [(i+1, L[i].count("|")) for i in range(h+2, len(L))
       if L[i].strip().startswith("| TC-") and L[i].count("|") != n]
print("header pipes:", n, "| bad rows:", bad or "none")
EOF
```

Fix any mismatch (usually a Notes cell written before the empty execution
columns — pad the missing `|` cells).

### 7. Fill the execution-summary counts

Total cases and the per-priority counts in the summary tables (By status / By
priority), so the doc is ready for the single test pass. Confirm the counts are
internally consistent: the By-status Total, the By-priority Total, and the actual
number of `TC-` rows must all be equal.

## Report

Tell the user: the file written, total case count, the coverage dimensions
included, which **Sources** were used (spec docs / UI prototype) and any that were
**missing** (with the resulting `Block` cases), the **`[Spec-only]` items** (spec
requirements with no prototype counterpart) and any spec-vs-prototype conflict, the
**known Round 1 gaps** whose cases are expected to come back `Block`, any **data
limitations** on the shared dev backend that gate execution, and any **checklist rows
you added** to the shared common checklists. Also call out, honestly, any **requirement with no case** you
could not cover. Don't let a confident-looking doc hide these. If a **test plan**
drove this run, confirm the generated unit against the plan's coverage-focus and
requirement→unit map, and name which unit(s) remain to be generated so the user
