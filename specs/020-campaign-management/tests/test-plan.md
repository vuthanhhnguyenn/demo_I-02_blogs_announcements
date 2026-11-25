# Test Plan: Campaign Management Refactor (G-03)

**Spec**: [spec.md](../spec.md)
**PO Spec**: `G-03` — キャンペーン管理 (Campaign Management), doc version `260724_v3` (+ `G-06` for the promotion-code role/scope-type table folded in as US5)
**Created**: 2026-07-27 · **Re-planned**: 2026-10-14 (phase 2 — real API) · **Updated**: 2026-11-02 (registered-campaign lock, spec Session 2026-11-02)
**Integration state**: all five units run on the **real dev backend** (`NEXT_PUBLIC_REAL_API_URL`, `https://api.dev.fitness-v2.okamoto-hd.com`) — list, detail, statistics, history, form (create / edit / published-stores / lookups) and the promotion-code tab (list / issue / disable / export). Two promotion-code rows (edit description, re-enable) are still FE `Pending` in `api-integration-output/campaigns/report.md` — see Known gaps. No `integration-plan.md` exists for this feature; that report is the gap register used here.
**Consumed by**: `gen-testcases` (picks unit, sources, focus, filename) → `execute-testcases` (run order + execution notes)

## Scope

**In scope** — the three screens under `src/app/(private)/campaigns/`:

- Campaign List (`/campaigns`)
- Campaign Detail (`/campaigns/[id]`) — three tabs: 基本情報 (basic info), プロモーションコード (promotion codes), 変更履歴 (change history)
- Campaign Form (`/campaigns/create`, `/campaigns/[id]/edit`) — shared component for register, edit and duplicate-prefill

**Out of scope** (navigation targets / separate specs / deferred — do not expand any unit to cover these):

- Store detail's contract/pricing tab — owns the store↔campaign link write surface (FR-007); campaigns only read and cross-link to it.
- Plan (main contract) and Option masters (G-01/G-02) — referenced only.
- Member contract tab, enrollment application flow (C-01) — downstream consumers (SC-008).
- Phase 2 content — `discountTotal` (割引総額) anywhere; A/B test delivery (FR-C001).
- Campaign end-of-recruitment notification (FR-S002) — scheduled server job.
- Campaign deletion and deleted-campaign restore — **FR-006 is retired (2026-10-08)**: neither the list row menu nor the detail header offers delete; the operating rule is stop acceptance and register a new campaign. Test only the _absence_ of a delete control (Unit 1 TC-073).
- Single promotion-code detail, per-code change history, per-member usage — no screen calls them.
- A creation-date range picker for CSV export — the screen sends a fixed most-recent-year range; test only that export works with it.
- Editing a code's validity window, usage limit or scope — not offered (no general PATCH); the edit dialog is description-only.
- Mock-only statements (FR-000 mock-ahead rules, 100-record picker cap, nominal Shift_JIS BOM) — historical; write no cases expecting them.

## Unit table

| #   | Unit                              | Screen(s)                                                                     | Route                                                 | TC doc filename                                                        |
| --- | --------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Campaign List                     | `campaign-list.tsx`                                                           | `/campaigns`                                          | `TC -【Fitness CRM】- [G-03-A][Campaign List].md`                      |
| 2   | Campaign Detail — Basic Info      | header, tab shell, basic-info tab, status panel, store-usage card, audit card | `/campaigns/[id]` (default tab)                       | `TC -【Fitness CRM】- [G-03-B1][Campaign Detail - Basic Info].md`      |
| 3   | Campaign Detail — Promotion Codes | promotion-code tab, issue dialog, disable dialog, edit-description dialog     | `/campaigns/[id]` (promotion-code tab, deep-linkable) | `TC -【Fitness CRM】- [G-03-B2][Campaign Detail - Promotion Codes].md` |
| 4   | Campaign Detail — Change History  | change-history tab                                                            | `/campaigns/[id]` (history tab, deep-linkable)        | `TC -【Fitness CRM】- [G-03-B3][Campaign Detail - Change History].md`  |
| 5   | Campaign Form                     | `campaign-form.tsx` (create, edit, duplicate-prefill)                         | `/campaigns/create`, `/campaigns/[id]/edit`           | `TC -【Fitness CRM】- [G-03-C][Campaign Form].md`                      |

All TC docs live under `specs/020-campaign-management/tests/cases/`.

**Split rationale**: one screen per unit. Campaign Detail's three tabs are _not_ clustered despite sharing a route: basic-info is a pure read surface (US2, P1); the promotion-code tab is a self-contained CRUD sub-flow with three dialogs and role/scope-type rules (US5, P2); change-history is a narrow audit table (US6, P3). The parity checklist gives them 61 / 46 / 7 items, so clustering would bury the promotion-code tab. Header/tab-shell/status-panel chrome sits in Unit 2 because it is simple and is the default tab.

## Sources per unit

Prototype files are under `.cache/fitness-crm-ui/src/pages/`; requirement docs under `.cache/fitness-spec/crm/requirements/`. The **UI Parity Checklist** (`../checklists/parity.md`, PAR001–PAR238; A/B/C prefixes map onto Units 1 / 2–4 / 5) is an additional detail floor — not a replacement for spec-derived expected results.

| Unit                        | Spec sections                                                                                                                                                                                                                         | UI prototype file                           | FRs covered                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1. List                     | US1; Edge Cases (empty states, Manager/Staff read-only); `G-03.md` §FR-001, §FR-004, permission matrix                                                                                                                                | `campaign-list.tsx`                         | FR-000, FR-004, FR-008, FR-010, FR-016, FR-019, FR-020, FR-021, FR-022, FR-026, FR-029         |
| 2. Detail — Basic Info      | US2; US4 (stop/resume, duplicate entry point; no delete exists); Edge Cases (capacity boundaries, store-scoped visibility, read-only roles); `G-03.md` §FR-002–§FR-004                                                                | `campaign-detail.tsx` (header → audit card) | FR-003, FR-004, FR-006, FR-007, FR-009a, FR-010–FR-015, FR-018, FR-023, FR-024, FR-026, FR-029 |
| 3. Detail — Promotion Codes | US5; Edge Cases (empty promo list); `G-06.md` (role/scope-type table, FR-007 re-enable, FR-014 prefix search, L172)                                                                                                                   | `campaign-detail.tsx` (promotion-code tab)  | FR-027, FR-028, FR-030, FR-031, FR-033–FR-036, FR-038                                          |
| 4. Detail — Change History  | US6; Edge Cases (empty history); `G-03.md` §FR-S004                                                                                                                                                                                   | `campaign-detail.tsx` (history tab)         | FR-017, FR-023                                                                                 |
| 5. Form                     | US3; US4 (duplicate pre-fill); every validation Edge Case; Clarifications Session 2026-10-14 (single discount block), Session 2026-11-12 (no month choice — the apply window decides); `G-03.md` §FR-002, §FR-005; #413 (code naming) | `campaign-form.tsx`                         | FR-000–FR-003, FR-009, FR-009a, FR-010–FR-014, FR-018, FR-025, FR-026, FR-037                  |

## Spec-vs-prototype deltas

Rule: **the spec wins; the prototype supplies UI detail.** `gen-testcases` marks each row in the case's Notes (`Spec-only` / `Conflict`).

| #   | Item                                                                    | In spec                                                                                                                                                                                                                | In prototype                                                 | How to test                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Discount settings structure (Unit 5, Unit 2 card)                       | **Conflict** — one block, one row per target, one value per target, no month choice (the apply window decides, Session 2026-11-12); the detail card lists the discounts in one field (FR-002, FR-024, FR-037, US3 AC4) | separate 初月 and 翌月 blocks, each with its own rows/values | Judge to the spec. Never expect different values per month for one target. Layout/copy still follow the prototype                                                                          |
| D2  | Promo-code edit dialog (Unit 3)                                         | **Conflict** — description only; code, validity, limit, scope read-only (FR-038, US5 AC6)                                                                                                                              | wide dialog editing validity, limit, store scope             | Judge to the spec; record the prototype's wider dialog as a prototype gap, not a bug                                                                                                       |
| D3  | 有効化 (re-enable) row action (Unit 3)                                  | **Spec-only** — FR-031, US5 AC7, G-06 FR-007                                                                                                                                                                           | absent                                                       | Write to the spec; no mockup to compare against                                                                                                                                            |
| D4  | Issuer filter (Unit 3)                                                  | **Conflict** — filter by `issuerType` 本部 / 店舗スタッフ from the issuer's _current_ role (FR-030)                                                                                                                    | loose issuer filter                                          | Seed one code issued by a headquarter user and one by a store staff; verify membership of each result                                                                                      |
| D5  | Search box (Unit 3)                                                     | **Internal conflict** — FR-030 text: matches code _or_ description; Clarification 2026-10-14 + G-06 FR-014: maps to `codePrefix`, 前方一致                                                                             | searches code or description                                 | Test both: a code prefix must match; a mid-string fragment and a description-only term are recorded as the _actual_ behaviour with the contradiction named in Notes — do not assume either |
| D6  | 総利用 footer total (Unit 3)                                            | **Internal conflict** — Clarification drops it; FR-030 still lists "total uses" in the summary block                                                                                                                   | has a footer total                                           | Record whether the footer/summary shows it; verify the issued-count summary does not move when filters narrow rows                                                                         |
| D7  | CSV export range (Unit 3)                                               | **Spec-only** — fixed most-recent-year range                                                                                                                                                                           | no range control                                             | Export must succeed with no range input; do not expect a picker                                                                                                                            |
| D8  | FR-036 role × scope-type issuing (Unit 3)                               | A/B for System/Headquarter/Manager; Staff fixed to B, control must not offer A. `spec.md` Clarifications say "currently unenforced, expected to fail"; `checklists/requirements.md` iter. 4 says fixed and live        | prototype enforces it                                        | **Source contradiction.** Write from FR-036's intent, record the actual behaviour, flag the contradiction in Notes                                                                         |
| D9  | Store-usage card visibility (Unit 2)                                    | absent for an all-stores session (US2 AS-3/AS-4)                                                                                                                                                                       | depends on demo-user mock                                    | Open gap (requirements.md iter. 4): report what the app does as a finding, never an assumed pass                                                                                           |
| D10 | Mock-ahead fields FR-010–FR-015, FR-018 (Units 2, 5)                    | required; no contract field originally                                                                                                                                                                                 | rendered from mock                                           | Now served by the real backend; if a field renders empty or differs, record the backend value as a finding                                                                                 |
| D11 | Form-vs-API nullability of usage-period / application-duration (Unit 5) | form shows a required error; API nullability intentional (spec Assumptions)                                                                                                                                            | required                                                     | Treat the required error as correct; do not log as a bug                                                                                                                                   |
| D12 | Campaign delete (Units 1, 2)                                            | **Retired** — FR-006 / FR-022: row menu = edit and duplicate only; detail header = edit only                                                                                                                           | no delete affordance                                         | Assert absence only. The pre-2026-10-08 TC rows that expect `削除` (Unit 1 TC-043 / TC-046 / TC-057) are superseded by TC-073                                                              |

## Coverage focus per unit

**Added to**, not replacing, `gen-testcases`' full coverage walk. **Every unit** additionally includes:

- **Real-API behaviours**: server-side validation beyond the client's and the user-facing message it surfaces; error codes the screen can receive (known: `E-CMP-017` published-store list mismatch, `E-SYS-001` generic 500 — assert on the Japanese message, not the code); **401 session expiry** (expire/invalidate the session mid-screen → redirected to login, no half-rendered data); server-enforced role/scope (Trainer/Observer direct-URL denial; Manager/Staff read-only — if the UI hides a mutation, note whether a direct attempt is refused); real pagination totals; persistence after reload and after re-login.
- **UI breakage under stress at the 1024px floor**: max-length full-width Japanese campaign name, an equally long unbroken ASCII token (campaign name, code, remarks, promo description), long store names, the longest status/badge labels, many chips (store-scope with many stores, many discount rows/tiers) — checked everywhere the value renders (list row, detail header, cards, history rows, promo table, dialogs, form fields and inline errors): no overflow beyond the viewport, no overlapped controls, truncation with accessible full text.

**Unit 1 (List)**: three-value acceptance badge incl. the derived capacity-reached state (FR-010); promo-code marker presence/absence (FR-016); the single-day recruitment filter `recruitmentActiveOn` with inclusive window ends (FR-008; the `recruitmentFrom`/`recruitmentTo` overlap pair was dropped 2026-10-15); sort behaviour (ID column = `campaignNumber`, no sort-by-id 400); result-banner composition and the pre-filter total (`totalAllItems` is mock-era — verify what the real list shows); SC-005 (find one of 200+ records in ≤3 interactions) as a dedicated case that also covers real pagination totals; filters survive reload (URL persistence).

**Unit 2 (Detail — Basic Info)**: every mock-ahead field renders from the real response (FR-010–FR-015, FR-018) incl. `capacityLimit`, `appliedCount`, `remainingCount`, `acceptingStatus`, referral points/tiers, `publishedStores`, `myStoreUsage`; capacity-reached suppressing the stop/resume control; the discount card is **derived from per-target month flags** (FR-024) — first-only, second-only and both land in the right month rows, entry fee on its own line, empty month reads なし; `campaignAutoOptions[].targetSexes` incl. `other` / `prefer_not_to_say`; store-usage card per D9; the acceptance-only exception (FR-009a) via stop/resume on an in-use campaign (restore immediately — see Data policy); `/report` statistics tiles; duplicate entry point (no delete control exists — FR-006 retired).

**Unit 3 (Detail — Promotion Codes)**: **five**-value effective status — valid, expired, limit reached, disabled, plus campaign-unavailable when the parent campaign is stopped or deleted (FR-035, restored to five on 2026-10-15 per PO: follow the API and G-06) — decision table over {own status, own window, own usage}, with an explicit disable outranking every derived state and the parent campaign's state (e.g. stopped) _not_ changing the code's status; role × scope-type matrix (D8); summary block (issued count, total uses) computed **before** filters (FR-030, D6); disable requires a reason (FR-028, max 500 chars, boundary); **edit dialog description-only** (D2): save disabled until the description changes, 1,000-char boundary, immutable fields read-only; **有効化** enabled only on a disabled code, no reason prompt, row returns to its derived status, unavailable on the other four statuses (D3); issuer filter by `issuerType` (D4); prefix search (D5); manual-code duplicate check on issue; clipboard copy; CSV export succeeds with the fixed year range and the file opens with correct Japanese encoding (backend-owned now — verify, do not skip); issue/disable/re-enable persist after reload; a second tab disabling the same code → the first tab's action surfaces the server's conflict/stale message rather than silently succeeding.

**Unit 4 (Detail — Change History)**: reverse-chronological order; the creation entry's distinct marker with dash field/before-value (FR-017); entries appear for edits, stop/resume and entry-fee discount changes (FR-037) after Units 2/5 actions; empty state; long before/after values wrap inside the row at 1024px; the tab loads from a direct deep link and after 401 expiry.

**Unit 5 (Form)**: bulk of the Edge Cases — percentage > 100 at plan, per-option and entry-fee row; amount/rate mutual exclusivity; **single discount block** (D1): one row per target, no 適用月 column and no month check (Session 2026-11-12), the same plan or option targeted twice rejected on the later row's target field, a second entry-fee row rejected, switching a row's target away from option clears its option; **edit round-trip** — create with entry-fee / plan / option discounts → reopen edit → every row read back from its type and value (read-only on edit), no month flag sent; referral point/tier requiredness toggling with the two switches; custom-month blank-vs-populated cross-validation; date-order checks on both period pairs; store publication scope — switching `publishScope` _and_ the store list in one edit must save (earlier `E-CMP-017` 422; regression-check); **registered-campaign lock (FR-009a, 2026-11-02)** — on edit only 先着件数上限, publication scope / stores and 受付可否 are operable, locked fields are not validated, the update sends only changed acceptance controls, server refusals (`E-CMP-016`) show the API message, create / duplicate stay fully editable; duplicate pre-fill (name suffix, acceptance forced to stopped, every section carried over) as its own scenario; duplicate campaign name / code rejection message from the server; unsaved-changes prompt on leave; lookup pickers (plans, options, stores) show real master data and handle >100 stores gracefully (record behaviour); `QA-` records created here feed Units 2–4.

## Known gaps (register)

Source: `api-integration-output/campaigns/report.md` @ 2026-10-14 (no `integration-plan.md` exists). All BE blockers listed there are struck through (fixed); what remains:

| Bn  | Blocker                                                                                                                                                            | UI behaviour now                               | Test treatment                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Promo-code edit — FE row still `Pending`; prototype dialog still wider than the contract (BE: no general PATCH, only `~/description`)                              | Dialog edits 説明 only, other fields read-only | Case written to FR-038. If the dialog is missing or still edits other fields at run time → `Block (B1)`, not `NG`                                                                |
| B2  | 有効化 row action — FE row `Pending`; prototype has none                                                                                                           | Action may not be present                      | Case written to FR-031 / US5 AC7. Missing at run time → `Block (B2)`; present but wrong → `NG`                                                                                   |
| B3  | Swagger declares some body fields `type: object` (campaign code, remarks, usage dates, apply months, `issuedStoreId`, disable `reason`); FE casts at the call site | none visible — server accepts the values       | Not a case. A failure whose cause is a cast/schema mismatch (wrong value type sent) is a BE-schema defect → `Block (B3)`; a user-visible wrong result with a valid input is `NG` |
| B4  | CSV export needs a created-at range (≤366 days) with no screen control; Swagger types the response as string                                                       | export uses a fixed last-year range            | Date-range-dependent cases (codes older than 1 year) → `Block (B4)`; basic export must work                                                                                      |
| B5  | Store-usage card visibility depends on session store-scope initialisation (D9)                                                                                     | per running app                                | Report as a finding; do not pre-assign `OK` or `NG`                                                                                                                              |

A failure that matches none of the rows → `NG`.

## Traceability map

FR → unit. Every requirement lands in ≥1 unit except the retired ones.

| FR            | Unit(s)                                               | Note                                                                                                                       |
| ------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| FR-000        | 1 (result banner only), 5                             | mock-surface only since 2026-10-14; `Block` the wire-format claims                                                         |
| FR-001        | 5 (entry), 2 (display)                                |                                                                                                                            |
| FR-002        | 5 (entry), 2 (display)                                | single discount block (D1)                                                                                                 |
| FR-003        | 5, 2                                                  |                                                                                                                            |
| FR-004        | 1, 2                                                  | capacity / in-use derivation                                                                                               |
| FR-005        | —                                                     | **retired**, intentionally unused                                                                                          |
| FR-006        | —                                                     | **retired 2026-10-08** — no delete affordance; Unit 1 TC-073 asserts the absence, Unit 2 checks the detail header has none |
| FR-007        | 2                                                     | store-usage card (D9, B5)                                                                                                  |
| FR-008        | 1                                                     |                                                                                                                            |
| FR-009        | 5 (primary), 3                                        | error _codes_/trace ids not black-box visible; assert the Japanese message                                                 |
| FR-009a       | 5 (registered-campaign lock), 2 (acceptance controls) |                                                                                                                            |
| FR-010        | 1, 2, 5                                               |                                                                                                                            |
| FR-011–FR-014 | 2, 5                                                  |                                                                                                                            |
| FR-015        | 2                                                     |                                                                                                                            |
| FR-016        | 1                                                     |                                                                                                                            |
| FR-017        | 4                                                     |                                                                                                                            |
| FR-018        | 5, 2                                                  |                                                                                                                            |
| FR-019–FR-022 | 1                                                     |                                                                                                                            |
| FR-023        | 2 (shell + deep link), 3, 4                           |                                                                                                                            |
| FR-024        | 2                                                     | one discount field, no per-month split (Session 2026-11-12)                                                                |
| FR-025        | 5                                                     |                                                                                                                            |
| FR-026        | 1, 2, 5                                               | role gating                                                                                                                |
| FR-027        | 3                                                     |                                                                                                                            |
| FR-028        | 3                                                     |                                                                                                                            |
| FR-029        | 1, 2, 3, 4                                            | loading / error / empty states                                                                                             |
| FR-030        | 3                                                     | D4, D5, D6                                                                                                                 |
| FR-031        | 3                                                     | issue / disable / **re-enable** (D3, B2)                                                                                   |
| FR-032        | —                                                     | **retired**                                                                                                                |
| FR-033        | 3                                                     |                                                                                                                            |
| FR-034        | 3                                                     | payload-shape claim → `Block`; proxy: tab rows/pagination behave independently of the detail payload                       |
| FR-035        | 3                                                     |                                                                                                                            |
| FR-036        | 3                                                     | D8                                                                                                                         |
| FR-037        | 5 (entry-fee row), 2 (display), 4 (history entry)     | added 2026-10-14 mapping; previously un-traced in this plan                                                                |
| FR-038        | 3                                                     | description-only (D2, B1) — added 2026-10-14 mapping                                                                       |

No requirement is left without a unit.

## Execution notes (for execute-testcases)

- **Credentials** — real Cognito accounts in `src/lib/auth/demo-users.ts` (the only app-source file this plan reads; password is in that file, not repeated here):

  | Role        | Account                         | Used for                                                                         |
  | ----------- | ------------------------------- | -------------------------------------------------------------------------------- |
  | System      | `lodu4289+1@gmail.com`          | full access; FR-036 A/B; primary write account                                   |
  | Headquarter | `lodu4289+headquater@gmail.com` | full access; FR-036 A/B; issuerType = 本部                                       |
  | Manager     | `lodu4289+manager@gmail.com`    | read-only checks (FR-026); FR-036 A/B; all-stores vs store-scoped session        |
  | Staff       | `lodu4289+staff@gmail.com`      | read-only checks; FR-036 B-only; issuerType = 店舗スタッフ; store-scoped session |
  | Trainer     | `lodu4289+trainer@gmail.com`    | no-access (direct-URL denial) on Units 1/2                                       |
  | Observer    | `lodu4289+observer@gmail.com`   | no-access (direct-URL denial) on Units 1/2                                       |

  The header's 「デモ: ユーザー切替」 switcher appears only when `NEXT_PUBLIC_APP_ENV=development`; otherwise sign in via the login form. One account = one session — do not run two roles in parallel on the same account. Manager/Staff need one store-scoped and (Manager) one all-stores session for the store-usage card and FR-036.

- **Environment**: real backend `https://api.dev.fitness-v2.okamoto-hd.com` — **shared with other people**. If port 3000 is busy and the app runs elsewhere, CORS only allows 3000 (use a proxy). If the account cannot sign in, stop at step 0 and report `Block` for the whole unit — do not fall back to mock.
- **Data policy** — no seed reset exists:
  - **May create**: campaigns named `QA-<unit>-<nn>` (e.g. `QA-U5-01`), promo codes whose manual code starts `QAT` and whose description starts `QA-`. Unit 5 creates the campaigns Units 2–4 consume, so those units need not touch seed data.
  - **Never edit or delete**: every pre-existing campaign and code (anything without the `QA-` / `QAT` prefix). State-changing cases (stop/resume campaign, disable code, re-enable, edit) run only on a `QA-` record created for that case. There is no campaign delete.
  - **Exception — in-use campaign (FR-009a)**: CRM cannot create contracts/applications, so the in-use case uses a pre-existing in-use campaign. Only a refused capacity change (`E-CMP-016`) and the reversible stop/resume toggle are allowed; if a change lands that should have been refused, revert it immediately and record `NG`. Always leave acceptance and capacity as found.
  - **Needs-to-exist preconditions** (verify before the unit; missing → `Block` with the missing precondition, not `NG`): Unit 1 ≥200 campaigns spanning both brands and all three acceptance states (SC-005); Unit 2/3 one each of at-capacity, store-scope-limited, referral-enabled, in-use, and one with ≥1 code and ≥1 history entry (use `QA-` records where creatable); Unit 3 one unlimited-usage code, one limit-reached code, one code per effective status; Unit 4 one empty-history and one multi-entry campaign.
  - **Cleanup**: neither campaigns (FR-006 retired) nor codes can be deleted — leave `QA-` campaigns stopped (`受付停止`) and `QA-` codes disabled, and list them in the run report.
- **Known-gap policy**: a failure matching a `Bn` row → `Block (Bn)`; an undocumented failure → `NG`. Contract-level claims (FR-009 error codes/trace ids, FR-034 payload shape, FR-000 wire format) → `Block`.
- **Viewport**: **1024×768** for layout/stress cases (the supported floor); **≥1440px** for the wide check; below 1024px out of scope.
- **Account safety**: no lockout cases in this feature. Never submit repeated wrong passwords (a real Cognito account locks ~15 min); use the switcher or one login per role.
- **Session efficiency**: run all cases for one unit in a single session, before compacting.

## Suggested order

1. **Unit 1 — List**: entry point to every other unit; read-only, safe first (also validates the ≥200 seed precondition).
2. **Unit 5 — Form** next: data-creating — makes the `QA-` campaigns Units 2–4 use, and exercises the real-API create/edit paths while the shared data is still untouched.
3. **Unit 2 — Detail: Basic Info**: read-mostly; judges whether Unit 5's writes took effect (discount card from flags, history seed).
4. **Unit 3 — Detail: Promotion Codes**: needs campaigns to exist; most complex CRUD sub-flow; creates codes.
5. **Unit 4 — Detail: Change History**: needs Units 2/3/5 to have produced real edits/stop-resume/entries to audit.
6. **State-changing cleanup last** (stop leftover `QA-` campaigns, disable leftover `QA-` codes, FR-009a revert check).

## TC document status (2026-10-14)

All five units are generated. TC-001… of each doc is the unchanged 2026-07/08 mock-backend pass; the real-API cases were appended and are `Untested`.

| Unit                       | Doc     | Total | Mock-pass (kept) | New real-API cases |
| -------------------------- | ------- | ----- | ---------------- | ------------------ |
| 1 List                     | G-03-A  | 99    | TC-001–072       | TC-073–099         |
| 2 Detail — Basic Info      | G-03-B1 | 101   | TC-001–074       | TC-075–101         |
| 3 Detail — Promotion Codes | G-03-B2 | 124   | TC-001–088       | TC-089–124         |
| 4 Detail — Change History  | G-03-B3 | 44    | TC-001–022       | TC-023–044         |
| 5 Form                     | G-03-C  | 137   | TC-001–099       | TC-100–137         |

## Run results (2026-10-14, real dev backend)

All five units were executed once against `https://api.dev.fitness-v2.okamoto-hd.com` with the real Cognito accounts. Every new real-API case (the `TC-0xx…` appended in each doc) was attempted; of the earlier mock-backend cases only those observed again were re-executed, the rest are `Untested` with their mock result kept in the note.

| Unit                       | Doc     | Total | OK  | NG  | Block | Untested | Open defects  |
| -------------------------- | ------- | ----- | --- | --- | ----- | -------- | ------------- |
| 1 List                     | G-03-A  | 99    | 58  | 7   | 27    | 7        | BUG-A-R01–R04 |
| 5 Form                     | G-03-C  | 137   | 50  | 8   | 12    | 67       | BUG-C-R1–R7   |
| 2 Detail — Basic Info      | G-03-B1 | 101   | 58  | 7   | 7     | 29       | BUG-B1-R1–R4  |
| 3 Detail — Promotion Codes | G-03-B2 | 124   | 34  | 14  | 16    | 60       | BUG-P-R1–R11  |
| 4 Detail — Change History  | G-03-B3 | 44    | 31  | 6   | 1     | 6        | BUG-H-R1–R4   |

Highest-impact findings: BUG-P-R1 (promotion-code issued count always 0), BUG-P-R2 (expired codes still `有効`), BUG-P-R5 (edit dialog pushes `保存する` off-screen), BUG-A-R01 (list error shown as an empty system), BUG-B1-R3/R4 (inconsistent statistics; store-usage card for all-stores sessions), BUG-H-R1/R2 (history shows raw ids and invisible set changes). Known gap B1 of Unit 1 (single-day recruitment filter) and the Manager/Staff 職位 limits (no code-issue permission on dev) are recorded as `Block`.

## Definition of done

- One TC doc per unit at the filename above; each executed once (single pass, no Round 2).
- Every FR in the traceability map lands in its unit's doc; anything `gen-testcases` cannot cover is reported back, not dropped. Every delta D1–D11 is marked in the relevant case's Notes.
- Gaps found in the shared checklists (`tests/checklists/common-function-checklist.md`, `common-gui-validate-checklist.md`) are fixed at checklist level first, then expanded into the unit's cases.
- TC docs authored before 2026-10-14 are re-checked against D1–D7 and regenerated where they assert the old two-block discount or the full-field edit dialog.
- The known findings — D5/D6/D8 source contradictions, the store-usage card gap (D9), the five code-vs-spec defects from the requirements checklist's iteration 3/4 history, and the `E-CMP-017` / `E-SYS-001` regressions — each appear as at least one case in the relevant unit.
- Created test data left in a safe state and listed (campaigns and codes cannot be deleted — stopped / disabled, `QA-` prefixed).
