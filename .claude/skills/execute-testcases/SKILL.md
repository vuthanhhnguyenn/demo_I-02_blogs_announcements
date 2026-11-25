---
name: execute-testcases
description: >-
  Execute (run, not just read) the test cases for a screen against the real
  running app as a black-box tester, then record OK/NG/Block results back into
  the test-case markdown. Use when asked to "excute/execute testcase", act as a
  tester for a screen, or run a TC document (e.g. specs/<feature>/tests/cases/TC -*.md).
  Drives a headless browser through the visible UI, inspects the live DOM, and
  finds real bugs — never reads the app's source.
---

# Execute test cases for a screen

You are acting as a **tester**. "Execute a test case" means driving the **actual
running app** the way a user would (navigate, click, type, filter, delete) and
comparing what the DOM/network actually does against each case's Expected
Result — then writing OK / NG / Block into the test-case file. It is **not** a
code read-through. A finding only counts once you've reproduced it in the browser.

## Phase 2 — you are testing against the real backend (read first)

Integrated screens no longer run on the mock. The app points at the **real dev
backend** (`NEXT_PUBLIC_REAL_API_URL`, e.g.
`https://api.dev.fitness-v2.okamoto-hd.com`) and you sign in with **real Cognito
accounts**. Four rules follow from that, and breaking them damages other people's
work:

1. **The data is shared and there is no reset.** Restarting the dev server no longer
   restores a seed. Anything you create, edit or delete stays.
2. **Create what you destroy.** A destructive or mutating case runs on a record
   **this run created**, named with a test prefix (`TC-<unit>-<timestamp>`). Never
   delete or rename a pre-existing record just because a case says "delete a row" —
   create one first, then delete it. If a case genuinely cannot be run that way,
   record it `Block` and say why.
3. **Real Cognito locks accounts.** Consecutive wrong-password attempts lock a real
   account for ~15 minutes and will block every later case that needs that role. Run
   any lockout/invalid-credential case **last**, and on a role no remaining case
   needs.
4. **Known Round 1 gaps are `Block`, not `NG`.** If the feature has
   `specs/<feature>/integration-plan.md`, read its blocker table (`Bn`) before the
   run. A failure that matches a documented blocker (disabled 「API未対応」 control,
   a field the integration deliberately strips) is `Block (Bn)`. A failure that is
   **not** documented there is `NG` — do not use the integration plan to excuse a
   bug it never mentioned.

Phase 2 also means outcomes that used to be un-testable are now real findings:
server-side validation, `E-XXX-nnn` error messages, 401 session expiry, server-enforced
permissions, real pagination totals, two-tab conflicts. Judge them against the TC
document's Expected Result like any other case.

## Black-box only — never read the app's source (read first)

A real tester never opens the codebase; they operate the built UI and judge it
against the test-case document. Hold to that here:

> ⛔ **Do NOT read the app's implementation** — no `src/app/(private)/<screen>/…`,
> `route.ts`, schemas, seed files, hooks, or components — to find selectors,
> endpoints, role-gating, or expected values. The oracle (what SHOULD happen) is
> the **Expected Result already written in the TC document**; the way you
> interact is **what's visible on screen**. Reading the source to drive or judge
> a case turns the test into a check that the code matches itself.

What replaces each thing you'd otherwise read from code:

| Instead of reading…                                                         | Do this (black-box)                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| components, for CSS/test-id **selectors**                                   | Locate controls the way a user sees them: **ARIA role + visible name** and **visible text** — and the exact Japanese labels/badges/messages are already quoted in the TC doc (`基本情報`, `公開中`, `削除する`, …).                                                                            |
| `route.ts`, for **API endpoints**                                           | **Observe the network** at runtime — watch which requests actually fire; intercept by the URL pattern you _see_, not one you looked up.                                                                                                                                                        |
| `route.ts`/schemas, for **role-gating**                                     | Log in as each role and **look**: is the button shown / enabled?                                                                                                                                                                                                                               |
| seed files, for **field values** (e.g. which row has `requiresConsent` off) | **Open the screen and read** the rendered value — the real backend's rows are whatever they are today.                                                                                                                                                                                         |
| seed files, for **login credentials**                                       | Credentials are **test data handed to you**: `harness/accounts.js` is the QA credentials sheet (real Cognito test pool + shared accounts); `src/lib/auth/demo-users.ts` mirrors the shared ones and is the **only** `src/**` file this skill may open — for the account list and nothing else. |

The screen URLs and record IDs a case needs (`/terms/TM-002`, `TM-001…TM-009`)
are already in the TC doc's steps/preconditions. If a control a case calls for
**cannot be found by looking at the screen**, that is itself a finding (a user
can't reach it) — record it as `NG`/observation; do **not** open the source to
hunt for it.

Forcing states a user can't (a 500, a slow network, counting how many requests a
double-click fires) is done with the **browser's own network layer** — Playwright
route interception, the same capability devtools gives a tester — which is still
black-box: it observes/steers traffic without reading the app's code.

## The harness (already in this skill)

`harness/` ships a tiny Playwright driver so you don't rewrite one each time:

| File                 | Role                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pw.js`              | Resolves Playwright (project devDependency, or global `@playwright/mcp`) + the cached Chromium.                                                                                                     |
| `launch-server.js`   | Starts one long-lived headless Chromium server; writes `ws-endpoint.txt`.                                                                                                                           |
| `run-steps.js`       | Runs a scenario file of JSON steps against that server; prints a JSON result blob.                                                                                                                  |
| `snapshot.js`        | In-page probe that reads the whole list screen (title, badge, tabs, filters, rows, badges, pagination, banner, empty state).                                                                        |
| `layout-probe.js`    | In-page probe that **measures** whether the layout holds: page-level horizontal overflow, off-viewport controls, clipped text (and whether a tooltip exposes the full value), overlapping controls. |
| `helpers.js`         | `snapshotStep(label)`, `layoutStep(label)` and `loginSteps(email)` for building scenarios.                                                                                                          |
| `accounts.js`        | Test-account pool: `account(role, slot)` → `{ email, password }`. One slot per concurrent agent (3-session Cognito limit).                                                                          |
| `fill-results.js`    | Writes a `{TC-xxx: {status,...}}` JSON map into the TC markdown's execution columns (single pass).                                                                                                  |
| `steps/example-*.js` | A login and a scenario template to copy.                                                                                                                                                            |

The harness targets **shadcn / base-ui list screens** (the CRM's common shape).
For a very different screen, keep the driver and adapt `snapshot.js`'s probe (it
reads the live rendered DOM generically — driver code, not the app's source).

## Workflow

### 1. Read the test-case file — and the test plan if present

Parse every TC row: pre-condition (which role), steps, expected result, priority,
and any **data-limitation notes** (cases the shared dev data can't reach without the
run creating it → these become `Block`, not failures), plus any `[Spec-only]` marker
(a requirement the prototype never showed — judge it on the Expected Result as
written) and any `known Round 1 gap Bn` marker (→ `Block (Bn)`). Everything you need to drive and judge a case — the exact
labels/badges/messages, controls, URLs/record IDs, the Expected Result — is in
this document; build a mental map from it, then discover the rest by looking at
the running app (not the source — see "Black-box only" above).

If a **test plan** exists at `specs/<feature>/tests/test-plan.md`, also read its
**"Execution notes"** and **suggested order** — the plan may pin the
credentials/role mapping, the backend URL, the data policy (what the run may create,
what is off-limits), the known Round 1 gaps (`Bn` → `Block`), the viewport
(1024×768 floor + wide), and which unit(s) to run in what order.
The plan and TC docs are **test artifacts, not app source** — reading them is not
a black-box violation; the ⛔ rule covers only the _implementation_ (`src/**`,
`route.ts`, schemas, seeds).

### 2. Start the app and the browser server (once)

Before starting, confirm the environment you are about to test: `.env` must point
`NEXT_PUBLIC_REAL_API_URL` at the dev backend, and `NEXT_PUBLIC_APP_ENV=development`
if you want the header's 「デモ: ユーザー切替」 role switcher (it is hidden otherwise —
without it, sign in through `/login` for each role). Say in your report which backend
URL the run used; a run against the wrong backend invalidates every result.

```bash
# work in the session scratchpad, not the repo
D="<scratchpad>/tc-run"; mkdir -p "$D"; cp -r .claude/skills/execute-testcases/harness/* "$D/"
# app
nohup npm run dev > "$D/dev.log" 2>&1 &
# wait until it serves (poll, don't sleep-guess)
for i in $(seq 1 30); do [ "$(curl -s -o /dev/null -w %{http_code} http://localhost:3000/)" != 000 ] && break; sleep 2; done
# browser server
cd "$D" && nohup node launch-server.js > server.log 2>&1 & disown
sleep 3 && cat "$D/ws-endpoint.txt"   # confirm READY
```

### 3. Log in per role (separate session jars)

Phase 2 uses **real Cognito accounts**, all with password `Password@123`. The list
lives in `harness/accounts.js` (`account(role, slot)` returns `{ email, password }`).

**Cognito allows only 3 live sessions per account** — a 4th login evicts the oldest,
so sub-agents sharing one account (or a teammate using it at the same time) get
kicked back to `/login` mid-run. Rules:

- **Use the test pool, one slot per agent.** When fanning out to sub-agents, assign
  each a distinct slot (agent 1 → `test_*_1`, agent 2 → `test_*_2`, …) and pass the
  slot in its prompt. Never give two concurrent agents the same account.
- **Log in once per role, reuse the storage jar.** Each `run-steps.js` against a jar
  reuses the session; re-running the login step burns another session.
- The **shared accounts** are also used by humans through the app's「デモ: ユーザー切替」
  menu — use them only for System (no pool) or as a fallback.
- An unexpected bounce to `/login` mid-run is most likely session eviction: re-login
  that jar once and re-run the scenario; only report it as a finding if it reproduces
  on a slot nobody else is using.

Test pool (seeded 2026-10-14), `n` = 1, 2, 3:

| Role        | Email                                | 職位 (position)                   | Store (as seeded)        |
| ----------- | ------------------------------------ | --------------------------------- | ------------------------ |
| Headquarter | `lodu4289+test_hq_n@gmail.com`       | 本部管理者 (Headquarters Admin)   | S-003 JOYFIT 横浜 (dev)  |
| Manager     | `lodu4289+test_manager_n@gmail.com`  | ブロック長 (Block Manager)        | S-008 FIT365 仙台 (閉店) |
| Staff       | `lodu4289+test_staff_n@gmail.com`    | 正社員スタッフ                    | S-003 JOYFIT 横浜 (dev)  |
| Trainer     | `lodu4289+test_trainer_n@gmail.com`  | 社員トレーナー (Employee Trainer) | S-003 JOYFIT 横浜 (dev)  |
| Observer    | `lodu4289+test_observer_n@gmail.com` | 閲覧専任 (View-only Specialist)   | S-003 JOYFIT 横浜 (dev)  |

Note the pool Staff is **正社員スタッフ**, not 店舗責任者 — when a case's pre-condition
names 店舗責任者, use the shared staff account.

Shared accounts (one per role; mirrored in `src/lib/auth/demo-users.ts`, the one
`src/**` file this skill may open):

| Role        | Email                           | 職位 (position) |
| ----------- | ------------------------------- | --------------- |
| System      | `lodu4289+1@gmail.com`          | システム管理者  |
| Headquarter | `lodu4289+headquater@gmail.com` | 本部管理者      |
| Manager     | `lodu4289+manager@gmail.com`    | ブロック長      |
| Staff       | `lodu4289+staff@gmail.com`      | 店舗責任者      |
| Trainer     | `lodu4289+trainer@gmail.com`    | 社員トレーナー  |
| Observer    | `lodu4289+observer@gmail.com`   | 閲覧専任        |

These are live accounts on the shared dev pool, so: **do not change their passwords,
do not deactivate them, and do not run repeated wrong-password attempts on an account
a later case still needs** (~15-minute Cognito lockout). Run lockout / wrong-password
cases on a pool slot no other agent is using, and last.

Login is a real two-step flow (Cognito → the CRM's `/crm/login`), so it is slower than
the mock was: wait for the post-login navigation rather than a fixed short timeout, and
treat a login that takes >10s or lands back on `/login` as a finding to investigate,
not a flaky retry.

Roles with no account yet (テリトリーマネージャー, FC企業管理者) cannot be tested: cases
requiring them are `Block — no account for this 職位`, never `NG`.

Brand/store data-scope isn't visible in this sheet — determine each account's scope
**by what its logged-in session actually shows** (open the list/detail and observe
which brands appear), not by looking it up in source.

Save each login to its own storage-state file so you can switch roles without
re-logging-in:

```bash
TC_ROLE=headquarter TC_SLOT=1 node run-steps.js steps/example-login.js storage-hq.json
TC_ROLE=manager     TC_SLOT=1 node run-steps.js steps/example-login.js storage-manager.json
```

Pick accounts to match the pre-conditions: Headquarter/System = full access;
Manager/Staff = manage-vs-view per the permission matrix; Observer = view-only;
Trainer = access-denied. **Only if** a login above fails (account missing, login
errors) is it a run-blocker — then tell the user and ask for the correct
credentials (`harness/accounts.js` / `src/lib/auth/demo-users.ts`); never open other
source to hunt for accounts mid-run.

### 4. Run scenarios, batch by feature area

Write one small step file per feature group (search, filters, tabs, delete,
pagination, empty/error, URL state, roles). Prefer `snapshotStep()` to read a
whole state in one shot, plus a `screenshot` for anything visual you'll cite.

```bash
node run-steps.js steps/<scenario>.js storage-hq.json > out-<scenario>.json
# the same scenario at the supported floor — run every layout/long-value case this way
TC_VIEWPORT_W=1024 TC_VIEWPORT_H=768 node run-steps.js steps/<scenario>.js storage-hq.json > out-<scenario>-1024.json
```

Read the JSON and diff each snapshot/value against the Expected Result. Verify
mechanisms, not just outcomes — always by **observing the network you see fire**,
never by an endpoint you looked up in `route.ts`:

- **debounce** → `startWatchRequests`/`getWatchedRequests`, assert one request.
- **double-click / dedupe guard** → identify the mutating request by the URL you
  observe when doing the action once; then `route` that pattern with `delayMs`,
  fire N clicks in one tick via `evaluate`, and `getRouteCallCount` (this is how
  an earlier run caught a delete dialog firing 4 DELETEs).
- **loading / error / retry** → `route` with `passthrough`+`delayMs`, or a 500,
  on the request URL you observed.
- **badge colours, disabled state, row opacity** → assert on the classes/text the
  snapshot returns, not on a screenshot glance.
- **role gating** → re-run the same scenario with a restricted storage jar and a
  `screenshot`; judge by whether the control is visible/enabled on screen.
- **layout under long data (do this deliberately — it is where the bugs are)** →
  create a record through the UI whose name/title is a max-length full-width Japanese
  string, and another that is an equally long **unbroken token**; then re-run the
  screen at **1024×768** and look at: the table row, the detail header, breadcrumb,
  sidebar entry, tab caption, badge, toast, dialog text and the filter-summary banner.
  Assert on measured geometry, not a glance: `layoutStep('<screen> @1024')` returns
  page-level horizontal overflow, off-viewport controls, clipped text (with whether a
  tooltip exposes the full value) and overlapping controls. Screenshot every one you
  report.
- **server-side validation / error codes** → submit the over-length or duplicate value
  for real and read what the screen shows; a raw JSON body, a blank toast or a silent
  no-op is a finding.

**Look at the screenshots.** A blank frame is a failed launch, not a pass. Check
`consoleErrors` in each result — a shell can render while every fetch 500s.

### 5. Handle state you mutate — there is no undo any more

Mutations now hit the **shared real backend** and persist. Restarting the dev server
resets nothing.

- **Order the run**: read-only and layout cases first, creating cases next,
  editing/destructive cases last.
- **Own your data**: before a destructive case, create the record it will destroy,
  with the run's prefix (`TC-<unit>-<timestamp>`). Record the ids you created so the
  report can list them.
- **Count-sensitive cases**: never assume a total. Take the baseline count at the
  moment the case starts and assert the delta (+1 after create, −1 after delete), or
  filter by your own test prefix so other people's concurrent changes can't flip the
  result. A case that needs a dataset you cannot build (e.g. enough rows for page 5)
  is `Block — data limitation`, with the reason.
- **Clean up** what you created where the UI allows it, and list anything you had to
  leave behind.

Only the dev server itself is disposable:

```bash
# kill the whole dev tree (next-server survives a plain job kill)
fuser -k 3000/tcp; pkill -9 -f concurrently.ts; pkill -9 -f next-server
```

### 6. Record results

Build a `results.json` keyed by TC id and write it in:

```bash
node fill-results.js "specs/<feature>/tests/cases/TC -….md" results.json "Your name"
```

- `OK` pass · `NG` real bug (add `bugId`, `prio`, and a `note` describing
  actual-vs-expected) · `Block` couldn't execute (data/env limit, a missing account,
  or a documented Round 1 gap — say which) ·
  `Untested` skipped. Group duplicate symptoms under one bug id.
- `Block` also covers a **known Round 1 integration gap** — write it as
  `Block (Bn)` with the blocker id from `integration-plan.md` so it is not confused
  with an environment limit.
- Also fill the **Execution summary** tables (counts, %). **Viewport: the supported
  minimum is 1024px.** Run every layout/long-value case at the floor
  (`TC_VIEWPORT_W=1024 TC_VIEWPORT_H=768`) — that is where this UI breaks — and the
  rest at the default wide desktop (1440×900), re-checking key screens there for
  stretched layouts. Widths **below 1024px are out of scope**, so there is no Mobile
  column to fill. Note both viewports you used in the summary.

### 7. Report

Summarise: the **backend URL and viewports** the run used, totals (OK/NG/Block), the
distinct bugs each with **observable repro steps + actual-vs-expected + where on the
screen it shows** (the black-box evidence — screenshot, snapshot/layout-probe value,
observed request/response — not a source file:line, since you didn't read the code),
which cases were blocked and why (separating data/env limits from documented Round 1
gaps `Bn`), and the **test data this run left on the shared backend** (ids created,
what was cleaned up, what remains). Relay this to the user — the filled markdown is the deliverable.

## Notes & gotchas

- Probe files (`snapshot.js`, `layout-probe.js`) hold a bare arrow-function
  expression that is evaluated as `new Function('return (' + fn + ')')`. Prettier
  formats them as a statement and appends a `;`, which breaks that wrapper —
  `helpers.js` and `run-steps.js` strip a trailing `;` on read, so keep loading probes
  through `snapshotStep()` / `layoutStep()` rather than inlining `fs.readFileSync`.
- `run-steps.js` never aborts on a bad step — it records `ok:false` and
  continues, so one wrong selector doesn't lose the batch. Scan for `ok:false`.
- base-ui `Select` uses `[role="combobox"]` triggers and `[role="option"]`
  items in a portal; click the trigger, wait ~300ms, then click the option.
- Disabled role-gated controls swallow pointer events (a `cursor-not-allowed`
  wrapper intercepts) — assert state via the snapshot/attributes instead of
  trying to `hover`/`click` them.
- `playwright` is a project devDependency, so `npm install`/`pnpm install`
  is enough to get the module; `pw.js` resolves it (with a fallback to a
  globally-installed `@playwright/mcp`'s copy). Don't hardcode its path.
- Chromium itself is **not** installed by `npm install`. If
  `~/.cache/ms-playwright` has no `chromium-*` build yet, run
  `npx playwright install chromium` once per environment.
- Keep everything under the scratchpad; never commit `storage-*.json`,
  `out-*.json`, or screenshots.
