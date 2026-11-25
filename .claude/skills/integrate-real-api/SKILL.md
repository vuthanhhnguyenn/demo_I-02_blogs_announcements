---
name: integrate-real-api
description: >-
  Move a screen (or a feature's screens) from the mock API (`src/lib/api`) onto the
  real backend client (`src/lib/api-real`). Use when asked to "integration real API /
  ghép real API / chuyển màn X sang api-real / integration round 1 (round 2)" for a
  screen such as positions, staffs, members. Always fetches the latest spec + prototype
  first. Runs as three confirmation-gated stages: (1) assess & report a spec/prototype/code
  triage + API-vs-UI gap table, (2) write `specs/<feature>/integration-plan.md` split into
  Round 1 / Round 2 / Round 3, (3) implement Round 1. Never skip a gate.
---

# Integrate a screen onto the real API

You are integrating an existing, working UI onto the real backend. The UI is the
**customer**; the API is the supply. Your job is to wire what can be wired, and to
report precisely what the API cannot yet supply — never to reshape the UI so the
current API looks sufficient.

## The three gates (hard stops)

Run these in order. **Stop and wait for the user after gate 1 and gate 2** — do not
start writing the plan while the assessment is unconfirmed, and do not touch `src/`
before the plan is confirmed.

| Gate             | Deliverable                                                         | Where               |
| ---------------- | ------------------------------------------------------------------- | ------------------- |
| **1. Assess**    | Fresh spec/prototype + triage + endpoint mapping + gap table        | chat only, no files |
| **2. Plan**      | `specs/<feature>/integration-plan.md` (Round 1 / Round 2 / Round 3) | file + chat summary |
| **3. Implement** | Round 1 code + `tsc`/lint/live smoke + result recorded in the plan  | code                |

If the user says "implement round 1" / "ghép round 1" and no plan file exists, go back
to gate 1 first and say so in one line.

## Guiding principle: spec first, then UI

The **latest spec** is the contract; the prototype and the current code are checked
against it. Every UI element falls into exactly one of these buckets:

| Spec                                                             | Prototype / code                | What to do                                                                                 | Round       |
| ---------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| defines it                                                       | built                           | Wire it to the real API.                                                                   | 1           |
| defines it                                                       | API missing / wrong             | Keep the UI exactly per spec (live, required stays required); strip at one seam if needed. | 1 → 2       |
| defines it                                                       | code or prototype **not built** | **Do not build it silently** — note it in the plan (`Sn`) so the user knows.               | noted       |
| does not define it, or marks it not-yet (phase 2 / 対象外 / TBD) | prototype has it                | **Comment the code out** (never delete), `TODO(round3)`, list in Round 3.                  | 3 (phase 2) |

For spec'd elements the API cannot back yet:

- **Keep the UI element exactly as the spec defines it.** Never delete, disable or relax a
  spec'd control, column, badge or section because the API has no field for it.
- **Strip the value from every request body** at one seam if sending it would be rejected
  (e.g. an unknown permission key → `E-VAL-001`), and note any known side effect.
- Leave a `TODO(round2)` comment at the exact injection/strip point, naming the blocker id.
- Round 2 = re-check the API and close those TODOs, nothing else.

Round 3 = integrate the commented-out prototype-only items in phase 2, once the spec
defines them. Never mix Round 3 work into Round 1 or 2.

### FE does not try to cover everything — push to BE what BE does better

FE wires the API plainly and accepts a degraded Round 1 where the API falls short. It does
**not** build clever client-side workarounds to hide a backend gap — those turn into bad design
patterns that outlive the gap. When the backend is the better place for the logic, it becomes a
BE ask (a gap row / `Bn`), and Round 1 handles the case the simple way.

Push to BE (gap row), don't compensate in FE:

- **N+1 / per-row fan-out** to fetch a field the list or detail should carry (e.g. one
  `GET /exercises/{id}` per composition row just to read `toolName`).
- **Chained calls emulating one operation** (save, then a second PATCH to set a status the
  save body should accept; duplicate, then a PATCH to rename the copy).
- **Re-deriving server-owned values on the client** — renaming/reformatting a generated name,
  recomputing a count or status the server should return, building files (CSV) client-side.
- **Client-side enforcement of a server rule** beyond plain form validation (scope filters,
  uniqueness checks via extra list queries).

Round 1 behaviour for these: the simple path — show what the API returns, leave a value empty,
make one query on an explicit user action — plus a `TODO(round2)` naming the `Bn`. Settled
lightweight conventions (a `limit: 1` baseline count query, one cast seam for a codegen defect,
field renames) are still fine; the line is "one obvious call/cast" vs "logic that belongs on
the server".

## Gate 1 — Assess

### Discover (do this before claiming anything)

0. **Fetch the latest spec and prototype** — every run, even if `specs/<feature>/spec.md`
   exists locally (it may be stale). Use the `speckit-load-external` skill (spec from
   `dx-fitness/fitness-spec`, UI from `dx-fitness/fitness-crm-ui`), pull before reading, and
   state the commit/date you read. The spec is what the gap table's `Spec định nghĩa` column
   and the triage buckets are judged against.
1. **Enumerate the screen's surface**: read every file under
   `src/app/(private)/<screen>/**` — page, `_components`, `_hooks`, `_schemas`,
   `_constants`, `_utils` — and note every field, filter, count, badge and action it renders.
2. **Enumerate the real endpoints** from `src/lib/openapi.real.json`, then the generated
   hook names from `src/lib/api-real/@tanstack/react-query.gen.ts`.
3. **Diff the two contracts field by field** (mock `src/lib/openapi.json` vs real). Compute
   set differences mechanically — never eyeball a 58-key list.
4. **Check ground truth in the backend repo** (`../fitness-backend-v2`) whenever a field is
   missing, oddly typed, or you are about to call an absence "intentional": prisma
   migrations (`services/*/prisma/migrations/**`), BFF controllers
   (`services/bff/src/routes/**`), and the service-layer guards that actually enforce
   permissions. The OpenAPI file alone cannot tell you _why_ something is absent.
5. **Look for precedent**: a sibling screen already integrated (see
   `git log --oneline` for `integration round N` commits) settles conventions — copy them
   instead of inventing.

Cookbook (fast, low-token):

```bash
# endpoints + operationIds for a domain
python3 -c "
import json; d=json.load(open('src/lib/openapi.real.json'))
[print(m.upper(),p,'|',o.get('operationId')) for p,v in d['paths'].items() if 'positions' in p for m,o in v.items()]"

# one schema, fully dereferenced enough to read
python3 -c "
import json; s=json.load(open('src/lib/openapi.real.json'))['components']['schemas']
print(json.dumps(s['PositionListItemDto'],ensure_ascii=False,indent=1))"

# generated hooks for a controller
grep -n '^export const adminStaffPermissionController' src/lib/api-real/@tanstack/react-query.gen.ts

# response codes + error-code descriptions (these carry E-XXX-nnn)
python3 -c "
import json; d=json.load(open('src/lib/openapi.real.json'))
[print(m.upper(),c,'-',r.get('description')) for m,o in d['paths']['/api/v1/admin/positions'].items() for c,r in o['responses'].items()]"
```

### Report — triage + two tables

**Spec / prototype / code triage** — `Item | Spec (FR-xxx) | Prototype | Code | Bucket`
using the buckets in §Guiding principle. List only the non-trivial rows: spec'd-but-not-built
(→ `Sn`) and prototype-only / not-yet-spec'd (→ Round 3). Everything in the "spec + built"
bucket is covered by the endpoint mapping.

**Endpoint mapping** — `UI surface | real endpoint | hook | round`. One row per UI need,
including the ones you will satisfy with a second query. State a feasibility verdict up
front (e.g. "cao ~90% — đủ endpoint, chủ yếu đổi shape").

**Gap table** — this table is **only** for things the API is _missing or wrong_ about, where
FE cannot compensate. Columns:

`ID | API URL | Spec định nghĩa | Thiếu / sai | Ảnh hưởng UI | Ghép được? | Cần gì`

- `API URL` is mandatory and is the full path, e.g. `GET /api/v1/admin/positions/{id}`.
- `Spec định nghĩa` is mandatory: cite the FR/section id and state what the latest spec
  says about this field/behaviour (type, required, allowed values, rule), e.g.
  `FR-012: 電話番号 required, max 15`. If the spec is silent, write `Spec không define` —
  that row is then usually a Round 3 item, not a BE ask.
- ⛔ **Do NOT list anything FE can handle on its own.** These belong in the plan, not the
  gap table: field renames (`snake_case`→`camelCase`), id type changes (number→uuid),
  `limit` caps and page-size options, a missing `totalAllItems` (use a baseline query), a
  missing count that another endpoint's `pagination.totalItems` provides, error-shape
  differences, query-param renames, removing a now-redundant fan-out query, adding a
  missing enum label. Mention them in one closing line ("FE xử lý được, đưa vào plan"),
  never as rows.
- What _does_ belong: a field/flag that exists nowhere in the API, a schema type that is
  plainly wrong so codegen is unusable, semantics that contradict the UI's meaning,
  metadata the UI needs to render correctly that no endpoint carries — **and** anything FE
  _could_ work around only with logic that belongs on the server (§FE does not try to cover
  everything): N+1 fan-outs, chained calls, client-side re-derivation of server values.
- End with the decisions you need from the user (spec-level calls, BE asks). If a gap is
  spec-shaped, hand it to `speckit-clarify` (see below) rather than guessing.

Then **stop**.

## Gate 2 — Plan

Write `specs/<feature>/integration-plan.md` (English, matching the repo's spec docs; the
chat summary follows the user's language). Sections, in this order:

1. **Header** — branch, date, spec links, scope path, target API.
2. **Guiding principle** — the UI-first paragraph above, plus which mock surfaces are left
   untouched (mock routes under `src/app/api/**`, `_mock-db`, mock Zod schemas stay as they
   are — they simply stop being called; that is the established convention).
3. **Endpoint mapping** table (from gate 1), with a Round column.
4. **Blockers carried into Round 2** — `Bn | blocker | spec says | Round 1 behaviour (UI kept) | Round 2`.
   Every gate-1 gap row becomes a `Bn` with an explicit, testable Round 1 fallback.
   4b. **Spec'd but not built** — `Sn | FR-xxx | what the spec defines | missing in code / prototype / both`.
   Informational for the user: not built in Round 1 unless the user asks.
5. **Decisions** `Dn` — the judgement calls, each one sentence + rationale. Cover at least:
   DTOs consumed directly vs a mapper layer; form-field naming; how compile-time key safety
   is preserved when the real types degrade (e.g. `Record<string, boolean>`); pagination
   options vs the API's `limit` max; where each displayed count comes from; error handling by
   `code`; read-only/system-managed gating; new enum values that need labels.
6. **Round 1 tasks** — phased, one id per file, `[P]` for parallelizable:
   Phase A foundations (constants, utils, converters) → Phase B list/detail screen →
   Phase C forms → Phase D verification. Each task names the file and what changes.
7. **Round 2 backlog** `R2nn` — one per blocker, each stating exactly what Round 1 code gets
   deleted when the API lands.
   7b. **Round 3 backlog (phase 2)** `R3nn` — one per prototype-only / not-yet-spec'd item:
   the prototype element, why it is out (spec silent / marked phase 2), the files and line
   ranges commented out in Round 1, and what spec + API it needs before it is un-commented.
8. **Open / Resolved questions** — spec-level calls with a recommendation each.

Then **stop**.

## Gate 3 — Implement Round 1

Work the phases in order. Repo conventions that are already settled — follow them:

- **No mapper layer.** Components import DTOs from `@/lib/api-real/types.gen` and use them
  directly; renames happen in place. (Precedent: the staffs integration commits.)
- **One seam per quirk.** A codegen defect worth a cast (e.g. a body field typed
  `{[key: string]: unknown}` because the BE declared `type: object`) gets exactly one cast in
  a `_utils/*.util.ts`, commented with `TODO(round2)` — never scattered `as` casts, never a
  hand-edit of `src/lib/openapi.real.json` (it is refreshed from the BE and your edit dies).
  When the BE ships a fix, the refresh path is: replace `src/lib/openapi.real.json` →
  `npm run generate-api:real` → remove the seam. Never hand-edit `src/lib/api-real/**`.
- **Errors by code.** Read `ErrorResponseDto.code` (`E-STF-010`, `E-GAT-100`, …) — never match
  Japanese substrings.
- **No duplicate error toasts.** The shared `MutationCache` in
  `src/providers/react-query.provider.tsx` already calls `toast.error` on every failed
  mutation (`userMessage` / `message` / `error`). When wiring a mutation onto the real API,
  **delete any local `onError: () => toast.error(...)`** on that `useMutation`/generated hook —
  leaving it in place produces two error toasts for the same failure. If a specific mutation
  genuinely must suppress the shared toast (e.g. it renders the error inline instead), pass
  `meta: { suppressErrorToast: true }`, not a no-op `onError`. Keep success toasts and inline
  field errors — this rule is about error toasts only.
- **Missing baseline counts** → a second query with `limit: 1`, `enabled` only while a filter
  is active (pattern: `src/app/(private)/staffs/page.tsx`).
- **Keep keys type-safe.** When the real contract types a map as `Record<string, boolean>`,
  keep the feature's literal key list and add a type-level drift assertion against the DTO so
  a BE catalog change fails `tsc` instead of at runtime.
- **Fix the deep links you break.** An id type change (number→uuid) usually also fixes a
  cross-screen link that was silently dropping the value — grep for `navigate('/<screen>'` and
  `parseAsInteger` before finishing.
- Re-check `limit`/`maxLength`/enum bounds against the real schema for every list and form.
- **Round 3 items are commented out, not deleted.** Wrap the prototype-only JSX/logic in a
  comment block headed `// TODO(round3) R3nn: <reason> — integrate in phase 2`, and make sure
  nothing still references it (unused imports, query params, form fields) so `tsc`/lint stay
  clean.

Verification (Phase D):

- `npm run type-check` (`tsc --noEmit -p tsconfig.typecheck.json`, which excludes `.next`) — the
  gate is **0 errors**; then `npm run lint`. If you run bare `npx tsc --noEmit` instead, ignore the
  stale `.next/types/validator.ts` noise and read only errors under `src/`.
- **Live smoke run** against `NEXT_PUBLIC_REAL_API_URL` covering the screen's full loop:
  list → search → each filter → paging → row select → detail/preview → create → edit →
  delete (including the documented conflict path), plus one role/permission-gated case. Start
  the dev server with the Bash tool's `run_in_background` (a plain `&` dies with the call).
- Any blocker whose Round 1 fallback depended on live behaviour (e.g. "does the BE accept a
  string for this field?") is **decided by this run** — record the verdict in the plan.
- Append a **Round 1 result** section to the plan: what shipped, what stayed TODO, the smoke
  outcome. Update `specs/<feature>/checklists/parity.md` only where real-API behaviour
  genuinely changes a checked item.

Commit style in this repo: `feat: integration round 1` / `feat: integration round 2` — only
when the user asks for a commit.

## Spec-level questions

When a gap is a product/spec decision (does this flag exist by design? is this control in
scope?), do not decide it inside the plan:

1. Gather backend + app evidence first (§Gate 1 step 4) so the options are real.
2. Run `speckit-clarify` — one question at a time, each with a recommended option and the
   evidence behind it.
3. Write the answers into `specs/<feature>/spec.md`: a new `### Session YYYY-MM-DD` under
   `## Clarifications`, plus the affected `FR-xxx` and the `## Q&A` entry. A question that
   turns out to be a **BE dependency** stays OPEN in the spec but becomes a concrete ask
   ("add column X") with the evidence attached — it is no longer an FE decision.
4. Then update `integration-plan.md`: move its Open questions to Resolved and adjust the
   affected `Bn` / `Dn` / `R2nn` rows.

## Report (after each gate)

- Gate 1: spec/prototype versions read, verdict, the triage, the two tables, the decisions
  you need. Nothing written to disk.
- Gate 2: plan path, round split in 2–3 lines, blockers with their Round 1 fallback, the `Sn`
  list, the Round 3 list, open questions. Ask for confirmation to implement.
- Gate 3: what was wired per phase, `tsc`/lint result, smoke result, remaining TODO(round2)
  and TODO(round3) lists, and anything you deliberately left out and why.

Write docs in English (repo convention); reply to the user in the language they used.
