# Tasks: Member Detail — Header Popups & Side Sheets

**Input**: Design documents from `/specs/032-member-detail/header-actions/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/mock-api.md](./contracts/mock-api.md), [quickstart.md](./quickstart.md)

> **Amended 2026-09-18 — surface 11 (再入会) withdrawn.** The prototype removed the action on
> 2026-09-16 (`a7d0c88`); re-enrollment belongs to the `C-01` enrollment application
> (`POST /api/v1/admin/applications`), and its fee waiver is decided server-side. Everything
> below about 再入会 is kept as a record and no longer describes the screen — see
> [spec.md](./spec.md#amendment-2026-09-18--surface-11-再入会-withdrawn).

**Organization**: Tasks are grouped by user story so each story can be implemented, verified and delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3, mapping to the user stories in spec.md
- Exact file paths are included in every task
- **No parity checklist**: this feature has no `checklists/parity.md`, so no `PAR###` coverage rule applies. UI tasks still cite the prototype source range from spec.md so the implementer can diff against ground truth: `.cache/fitness-crm-ui/src/pages/member-detail.tsx` @ `426a9b3`.

## Path Conventions

Web app, single Next.js project. Route-local co-location:

- UI: `src/app/(private)/members/[id]/`
- Mock API: `src/app/api/crm/members/[id]/`, schemas in `src/app/api/_schemas/`, seeds in `src/app/api/_mock-db/seeds/`
- Generated (never hand-edit): `src/lib/openapi.json`, `src/lib/api/*.gen.ts`

## ⚠️ Nature of this feature

All 12 surfaces **already exist and work**. Every task below is a _correction_ against a tracked gap (G-A…G-F, G-01…G-13), not new construction. Before editing a file, read it — the surrounding pattern is the target style, and eight of the twelve surfaces already implement the pattern the other four are missing.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a known-good baseline so later diffs are attributable

- [x] T001 Confirm the baseline is green before any edit: run `npm run lint` and `npm run type-check` from the repo root and record any pre-existing failure so it is not later mistaken for this feature's regression
- [x] T002 Confirm the codegen chain is diff-clean on the untouched checkout: run `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client`, then verify `git diff --stat src/lib/openapi.json src/lib/api/` is **empty**. A non-empty diff here means the checkout drifted from its Zod schemas and must be resolved before any contract work — see [research.md](./research.md) R-1. **Never skip the prettier step**: without it the diff is ~21k lines of pure formatting noise.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Seed data without which most acceptance scenarios cannot be exercised at all

**⚠️ CRITICAL**: [quickstart.md](./quickstart.md) states several checks are impossible without these members. Complete before starting any story.

- [x] T003 Ensure `src/app/api/_mock-db/tables/members.table.ts` (`members._seed()` — **not** `seeds/member.seed.ts`, which holds only sub-resource mocks) contains at least one member for every status and flag combination the header branches on: `active`; `active` + unpaid balance; `active` + active fee adjustment **and** active point discount; `active` + active reservation penalty; `suspended` (with an active suspension carrying start/end month and monthly fee); `active` + gate stop **and** `suspended` + gate stop (gate stop is an orthogonal flag, so both combinations must exist); `provisional`; `pending_suspended`; `withdrawal_pending_processing`; `pending_withdrawal` **with `usageStartDate` in the future**; `pending_withdrawal` **with `usageStartDate` already passed**; `withdrawn`; `withdrawn` + active blacklist entry; `forced_withdrawal`. Add the missing ones. The two `pending_withdrawal` variants are the only way to verify G-A in both directions.

**Checkpoint**: Seed coverage complete — story work can begin, and all three stories can proceed in parallel apart from the two shared files noted under Parallel Opportunities.

---

## Phase 3: User Story 1 — Submit a status-change application from the header (Priority: P1) 🎯 MVP

**Goal**: 休会申請 / 退会申請 / 移籍申請 submit correct, validated payloads with a surviving 代理申請 audit trail.

**Independent Test**: Work through [quickstart.md](./quickstart.md) §1 (menu composition and blocked operations), the G-F / G-04 / G-01 / G-02 / G-E rows of §2, and the 休会申請 and 移籍申請 rows of §5. All three surfaces submit successfully, reject every invalid input with a field-level message, and record the proxy block.

### Contract changes (single file — must run in sequence)

- [x] T004 [US1] Align the proxy contract in `src/app/api/_schemas/member.schema.ts`: change `proxy_method` from a free string to the enum `'in_person' | 'phone' | 'email' | 'line'`, and add validation that `proxy_agreed_at` is required when `is_proxy` is true and is not in the future — per [contracts/mock-api.md](./contracts/mock-api.md) A-6 (G-02). Apply to the suspension, withdrawal and transfer request schemas.
- [x] T005 [US1] Add a `.superRefine` to `SuspendRequestSchema` in `src/app/api/_schemas/member.schema.ts` enforcing: `start_month` not before the current month; `end_month` after `start_month`; span at most 12 months. Attach each message to its own field so the sheet can surface it inline — per A-1 (G-01, [research.md](./research.md) R-7).
- [x] T006 [US1] Rework `WithdrawRequestSchema` in `src/app/api/_schemas/member.schema.ts`: `reason` becomes a required free-text string, `reason_detail` is **removed**, and a derived `withdrawal_type: 'normal' | 'cancellation'` is added. Delete `WithdrawReasonSchema` — per A-2 (G-F, G-04).

### Mock route handlers (parallel — different files)

- [x] T007 [P] [US1] In `src/app/api/crm/members/[id]/suspend/route.ts`, return `400` with the three month-rule messages from A-1 (`休会開始月は今月以降を指定してください`, `休会終了月は休会開始月より後を指定してください`, `休会期間は最長12ヶ月です`)
- [x] T008 [P] [US1] In `src/app/api/crm/members/[id]/withdraw/route.ts`, drop the reason-enum handling and enforce the per-type date rule: `normal` requires `scheduled_date >= today + 7 days`; `cancellation` requires `scheduled_date < usageStartDate`. Return `400` with the A-2 messages.
- [x] T009 [P] [US1] In `src/app/api/crm/members/[id]/transfer/route.ts`, persist `is_proxy` / `proxy_agreed_at` / `proxy_method` — the schema already accepts them but the handler destructures only `to_store_id`, `to_store_name`, `reason` and silently drops the rest, losing the FR-017 audit trail. Mirror what `suspend/route.ts` already does. Per A-7 (G-E).

### UI — shared component first, then the three sheets in parallel

- [x] T010 [US1] Update `src/app/(private)/members/[id]/_components/proxy-application-section.tsx` to emit the enum key while keeping the Japanese labels (来店 / 電話 / メール / LINE) in the `Select`, and to surface the not-future error — port from `member-detail.tsx › ProxyApplicationSection` (L711-L750). **Deliberately not `[P]`**: this changes the shared component's `method` prop from `string` to the enum union, so T011–T013 must land after it or type-check fails.
- [x] T011 [P] [US1] Update `src/app/(private)/members/[id]/_components/leave-sheet.tsx`: mirror the T005 month rules in the form schema so errors appear before submission, and switch `proxy_method` to the enum type (depends on T010) — port from `member-detail.tsx` 休会申請 Sheet (L3327-L3480) and its confirm dialog (L3483-L3510)
- [x] T012 [P] [US1] Rework `src/app/(private)/members/[id]/_components/withdraw-sheet.tsx`: replace the `WithdrawReason` `Select` with a single required free-text 退会理由, delete the conditional `reason_detail` field and the `WITHDRAW_REASON_OPTIONS` constant, enforce the 7-day minimum on 退会予定日 for 通常退会, and switch `proxy_method` to the enum type (depends on T010) — port from `member-detail.tsx` 退会申請 Sheet (L3513-L3586) and its confirm dialog (L3589-L3621); implements FR-014, G-F
- [x] T013 [P] [US1] Update `src/app/(private)/members/[id]/_components/transfer-sheet.tsx` to switch `proxy_method` to the enum type (depends on T010); leave 移籍理由 as optional free text (see [research.md](./research.md) R-5 — the `reasonCode` mapping is a Phase 2 / backend-confirmation item, not a UI change) — port from `member-detail.tsx` 移籍申請 Sheet (L3624-L3728)
- [x] T014 [US1] Pass `currentMainContract.usageStartDate` into `WithdrawSheet` from `src/app/(private)/members/[id]/page.tsx`, and derive `withdrawal_type` inside the sheet (`cancellation` when 退会予定日 precedes it, otherwise `normal`) so the operator never picks it. The sheet currently receives only `memberId` and `memberName`, so the field it needs is not reachable today. **Deliberately not `[P]`**: T030 edits the same file. Completes G-04.

### Close-out

- [x] T015 [US1] Repo-wide sweep for orphaned `WithdrawReason` references after T006/T012 — check `src/app/(private)/members/leaves/**` in particular; if it uses a withdrawal-reason label map that belongs to `A-03`, give that screen its own local copy rather than reviving the shared enum
- [x] T016 [US1] Regenerate and gate: `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client`, then `npm run lint && npm run type-check`. Inspect `git diff src/lib/openapi.json` and confirm it contains **only** the US1 contract changes — any array-wrapping churn means the prettier step was skipped.

**Checkpoint**: US1 fully functional and independently verifiable. This is the MVP — it closes 2 of the 6 prototype-parity gaps and the two highest-traffic validation gaps.

---

## Phase 4: User Story 2 — Release an active restriction (Priority: P1)

**Goal**: 休会解除 / ゲートストップ解除 / 予約ペナルティ解除 each show the real current restriction, validate their input, and require a two-step confirmation for the two immediate releases.

**Independent Test**: Work through [quickstart.md](./quickstart.md) §2 rows G-B / G-C / G-07, all of §4 (banners), and the 休会解除 row of §5. Each release succeeds, its banner disappears without a reload, and neither immediate release can be triggered by a single click.

### Contract changes (single file — must run in sequence)

- [x] T017 [US2] Extend the member-detail response schema in `src/app/api/_schemas/member.schema.ts`: add `activePenalty.triggeringReservations` (`string[]`, display strings for 対象となった予約) and `activePenalty.targetWeek` (`string`, e.g. `2026/04/07〜04/13`). Read-only, no write path — per A-10 and [data-model.md](./data-model.md) §1.
- [x] T018 [US2] Add validation to `SuspendReleaseRequestSchema` in `src/app/api/_schemas/member.schema.ts`: `resume_month` must not be before the current month — per A-3 (G-07, Q3 decision: retroactive release is unsupported).

### Mock data & route handlers (parallel — different files)

- [x] T019 [P] [US2] Populate `triggeringReservations` and `targetWeek` for the penalty-carrying member in `src/app/api/_mock-db/seeds/member.seed.ts` (the prototype shows two entries, e.g. `2026/04/08(水) 19:00 ヨガ基礎` and `2026/04/11(土) 10:00 ピラティス`)
- [x] T020 [P] [US2] In `src/app/api/crm/members/[id]/suspend-release/route.ts`, return `400 復帰月は今月以降を指定してください` for a past month, and implement the release as **shortening the active suspension's end month** to the month before `resume_month` — do not insert a separate release record (per A-3 and [data-model.md](./data-model.md) §3.4)

### UI (parallel — different files)

- [x] T021 [P] [US2] Update `src/app/(private)/members/[id]/_components/leave-release-sheet.tsx` to mirror the T018 rule in the form schema so a past 復帰月 is rejected before submission — port from `member-detail.tsx` 休会解除 Sheet (L4258-L4330)
- [x] T022 [P] [US2] Update `src/app/(private)/members/[id]/_components/gate-stop-release-sheet.tsx`: add the confirm `AlertDialog` after the acknowledgement checkbox (validate → open dialog → mutate only from the dialog's action, matching the pattern in `leave-sheet.tsx`), and add the 解除予定者 / 解除予定日時 block to the form body — port from `member-detail.tsx` ゲートストップ解除 Sheet (L3761-L3870) and its confirm dialog (L3873-L3899); implements FR-018, G-B
- [x] T023 [P] [US2] Update `src/app/(private)/members/[id]/_components/penalty-release-sheet.tsx`: add the confirm `AlertDialog`, render the 対象となった予約 list and 対象週 from the T017 fields, and add the 会員への通知 disclosure stating the release is pushed to the member's app — port from `member-detail.tsx` 予約ペナルティ解除 Sheet (L3902-L4021) and its confirm dialog (L4024-L4047); implements FR-019, G-C

### Close-out

- [x] T024 [US2] Regenerate and gate: `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client`, then `npm run lint && npm run type-check`

**Checkpoint**: US1 and US2 both work independently. All banner-driven flows are now consistent.

---

## Phase 5: User Story 3 — Perform an HQ-only administrative action (Priority: P2)

**Goal**: The six administrative surfaces enforce their preconditions _before_ submission and capture the audit fields their operations require.

**Independent Test**: Work through [quickstart.md](./quickstart.md) §2 rows G-A / G-D / G-11 / G-12 / FR-023, all of §6 (permissions), and the 強制退会 / ブラックリスト登録 / 再入会 rows of §5. Every blocked case is visible on the trigger or inside the surface, never only as a server error.

### Contract changes (single file — must run in sequence)

- [x] T025 [US3] Add `WithdrawCancelRequestSchema` to `src/app/api/_schemas/member.schema.ts` with an optional `comment` (取り消し事由, recorded on the history row) and wire it as the route's request body — per A-4 (G-11)
- [x] T026 [US3] Add `DeletePersonalDataRequestSchema` to `src/app/api/_schemas/member.schema.ts` with a required `reason` and a required `confirmation` literal `'ANONYMIZE'` — per A-8 (G-D, [research.md](./research.md) R-6). **Judgement call flagged in A-8**: a request body on `DELETE` is awkward and G-13 already earmarks a Phase 2 move to an anonymize-style endpoint — prefer switching this mock route to `POST /crm/members/{id}/personal-data/anonymize` now so the Phase 2 change becomes a URL swap only. Decide and record the choice in the commit message.

### Mock route handlers (parallel — different files)

- [x] T027 [P] [US3] In `src/app/api/crm/members/[id]/withdraw-cancel/route.ts`, accept and record the `comment`, and add the rejection `409 退会予定の会員ではありません` when the member is not `pending_withdrawal` — per A-4. ~~`422 利用開始日を過ぎているため退会を取り消せません`~~ removed 2026-08-11: the usage-start-date rule belongs to 入会取り消し, not to revoking a 退会申請
- [x] T028 [P] [US3] In `src/app/api/crm/members/[id]/blacklist/route.ts`, fix the data-loss bug: the handler writes `reason: memo ?? reason`, which discards the reason whenever a memo is present. Store both as separate fields. Add the one-active-entry guard `409 既にブラックリストに登録されています` — per A-5 (G-12)
- [x] T029 [P] [US3] In the PII-deletion route under `src/app/api/crm/members/[id]/` (path per the T026 decision), validate the `confirmation` literal and add the guards from A-8: `400` on a confirmation mismatch, `422` on an active blacklist entry, `422` on an unpaid balance, `409` when `anonymizedAt` is already set, `422` when the member is not withdrawn
- [x] T030 [P] [US3] In `src/app/api/crm/members/[id]/re-enroll/route.ts`, add the guards that the bypassed `C-01` blacklist screening would have provided: `422 ブラックリスト登録者のため再入会できません` and `422 未納金があるため再入会できません` — per A-9 (FR-023). Also confirm the handler reuses the existing member row and `memberNumber` rather than issuing a new one (the Q2 decision).

### UI (parallel — different files)

- [x] T031 [US3] Update `src/app/(private)/members/[id]/page.tsx` to gate the 再入会 button when `blacklist.isActive` or `unpaidAmount > 0` — port from the withdrawn-member header of `member-detail.tsx` (L3081-L3108); implements FR-023. ~~Also disable the 退会取り消し menu item once `currentMainContract.usageStartDate <= today` (the prototype's `開始後` deny badge, G-A)~~ — dropped 2026-08-11, that gate carries the 入会取り消し rule and must not apply here; the item stays enabled for every 退会予定 member. **Deliberately not `[P]`**: T014 edits the same file.
- [x] T032 [P] [US3] Add the optional 取り消し事由 field to `src/app/(private)/members/[id]/_components/withdraw-cancel-dialog.tsx` and send it — port from `member-detail.tsx` 退会取り消し AlertDialog (L4946-L4962), extended per FR-020
- [x] T033 [P] [US3] Update `src/app/(private)/members/[id]/_components/personal-data-delete-dialog.tsx`: add a required 削除理由 textarea and a typed-confirmation input the operator must fill with `ANONYMIZE`, keeping the destructive action disabled until both are satisfied. Do **not** pre-fill the literal — the whole point is that a human types it — port from `member-detail.tsx` 個人情報削除 AlertDialog (L4836-L4870), extended per FR-024 and R-6
- [x] T034 [P] [US3] Update `src/app/(private)/members/[id]/_components/re-enroll-sheet.tsx` to show a destructive alert naming the applicable blocker (blacklist and/or unpaid balance) and disable submission accordingly, alongside the existing plans-loading guard — port from `member-detail.tsx` 再入会 Sheet (L4333-L4435); implements FR-023

### Close-out

- [x] T035 [US3] Regenerate and gate: `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client`, then `npm run lint && npm run type-check`

**Checkpoint**: All three stories independently functional. All 6 prototype-parity gaps and all Phase-1-actionable contract gaps are closed.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T036 [P] **NOT DONE — needs a browser.** Verify no surface regressed on the shared behaviour in [quickstart.md](./quickstart.md) §3 across all twelve: read-only context block renders real member data (no leftover placeholder such as a hard-coded `管理者A` or `¥1,100/月`), required/optional markers present, confirm dialog restates the concrete effect, cancelling the dialog preserves entered values, controls disabled while in flight, no double-submit, success closes + toasts + invalidates without a reload, failure keeps the form intact with the server's reason
- [ ] T037 [P] **NOT DONE — needs a browser.** Verify the audit trail in [quickstart.md](./quickstart.md) §7: each of the twelve operations appends a change-history row (timestamp, operator, operation, reason/comment), and the 変更履歴 tab remains read-only with seeded data — no create / update / delete flow for history records was introduced
- [x] T038 Compile the six backend requests from [contracts/mock-api.md](./contracts/mock-api.md) §B into the MR description for hand-off: B-1 休会解除 endpoint, B-2 予約ペナルティ解除 endpoint (expected under `D-01`), B-3 再入会 endpoint, B-4 強制退会 endpoint, B-5 gate-stop `pattern` field + persist 設定理由, B-6 confirm the 移籍理由 → `reasonCode: other` mapping. Note in the MR that none of the six blocks this feature — each keeps its mock route for Phase 1.
- [x] T039 Final gate per [quickstart.md](./quickstart.md) §8: `npm run lint`, `npm run type-check`, and review `git diff src/lib/openapi.json` (only this feature's contract changes, zero formatting churn) and `git diff src/lib/api/` (regenerated output only, zero hand-edits). Watch for `react-hooks/set-state-in-effect` — derive state in the change handler, never in an effect.
- [ ] T040 **NOT DONE — needs a browser.** Run the full [quickstart.md](./quickstart.md) checklist end to end as the release gate. This project has no automated tests — this checklist **is** the QA gate (Constitution: No Testing Policy), so an unchecked box is a blocker, not a nice-to-have.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately. T002 is a genuine gate: if the codegen chain is not diff-clean on an untouched checkout, stop and resolve it, because every story's close-out task depends on being able to attribute the generated diff.
- **Foundational (Phase 2)**: depends on Setup. **Blocks meaningful verification of all three stories** — the code can be written without T003, but no acceptance scenario can be confirmed.
- **User Stories (Phase 3–5)**: all depend on Phase 2. Independent of each other (see the shared-file caveat below).
- **Polish (Phase 6)**: depends on every story you intend to ship.

### User Story Dependencies

- **US1 (P1)**: independent. Closes G-F, G-04, G-01, G-02, G-E.
- **US2 (P1)**: independent. Closes G-B, G-C, G-07.
- **US3 (P2)**: independent. Closes G-A, G-11, G-12, G-D, FR-023.

No story consumes another story's output. Any one can ship alone.

### Within Each Story

1. Contract changes (`member.schema.ts`) first — the mock routes and UI both type off the regenerated client
2. Mock route handlers and UI next, in parallel
3. Close-out regeneration + gate last

### Parallel Opportunities

- **US1**: T007–T009 parallel; then T010 alone; then T011–T013 parallel; T014 sequential (shares `page.tsx` with T031)
- **US2**: T019–T020 parallel; T021–T023 parallel
- **US3**: T027–T030 parallel; T032–T034 parallel; T031 sequential (shares `page.tsx` with T014)
- **Polish**: T036–T037 parallel

**Two shared files, both contention points:**

1. `src/app/api/_schemas/member.schema.ts` — edited by T004–T006 (US1), T017–T018 (US2), T025–T026 (US3). These seven are **never parallel with each other**, even across stories.
2. `src/app/(private)/members/[id]/page.tsx` — edited by T014 (US1) and T031 (US3). Never parallel.

If two developers take two stories simultaneously, serialise those edits between them. The cheapest resolution is for one developer to land all seven schema tasks as a first commit; after that the remaining work is conflict-free apart from the single `page.tsx` pair.

---

## Parallel Example: User Story 1

```bash
# Wave 1 — after T004-T006 (schema, sequential) land, the routes go together:
Task: "T007 suspend/route.ts — month-rule 400 responses"
Task: "T008 withdraw/route.ts — per-type date rules, drop reason enum"
Task: "T009 transfer/route.ts — persist the proxy block"

# Wave 2 — T010 alone (changes the shared component's prop type):
Task: "T010 proxy-application-section.tsx — enum keys, JP labels retained"

# Wave 3 — the three sheets go together, all consuming T010's new prop type:
Task: "T011 leave-sheet.tsx — client-side month rules"
Task: "T012 withdraw-sheet.tsx — free-text reason, 7-day guard"
Task: "T013 transfer-sheet.tsx — proxy_method enum type"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003) — do not skip; without seeds nothing is verifiable
3. Phase 3: US1 (T004–T016)
4. **STOP and VALIDATE**: quickstart §1, the US1 rows of §2, and the US1 rows of §5
5. Ship — US1 alone closes the two most operator-visible defects: a reason picklist that should not exist, and a proxy audit trail silently dropped on every transfer

### Incremental Delivery

1. Setup + Foundational → baseline ready
2. US1 → validate → ship (MVP)
3. US2 → validate → ship
4. US3 → validate → ship
5. Polish → full quickstart run → release gate

Each increment closes a named subset of the gap list, so progress is reportable in the MR as "gaps closed" rather than "files touched".

### Parallel Team Strategy

With three developers, after T003: one story each. Coordinate the two shared files explicitly — the cheapest resolution is for one developer to land all seven `member.schema.ts` tasks (T004–T006, T017–T018, T025–T026) as a single first commit, after which only the `page.tsx` pair (T014 / T031) needs sequencing and the other 20 tasks are fully independent.

---

## Notes

- **This is a correction pass.** Read the existing file before editing it; eight of the twelve surfaces already implement the pattern the other four lack, so the reference implementation is always in the same folder.
- `[P]` tasks touch different files and have no dependency on incomplete work. Three tasks are deliberately **not** `[P]` despite sitting in a parallel group — T010, T014 and T031 — each with the reason stated inline.
- No test tasks appear anywhere in this list. That is deliberate and non-negotiable — Constitution: No Testing Policy. [quickstart.md](./quickstart.md) is the QA gate.
- Never hand-edit `src/lib/openapi.json` or `src/lib/api/*.gen.ts`. Always `generate-openapi` → **prettier** → `generate-client`.
- Change history is seed-only for this feature — no create / update / delete flow for history records.
- Commit per task or per logical group; stop at any checkpoint to validate a story independently.

---

## Task Summary

| Phase                     | Tasks     | Count  |
| ------------------------- | --------- | ------ |
| Phase 1 — Setup           | T001–T002 | 2      |
| Phase 2 — Foundational    | T003      | 1      |
| Phase 3 — US1 (P1) 🎯 MVP | T004–T016 | 13     |
| Phase 4 — US2 (P1)        | T017–T024 | 8      |
| Phase 5 — US3 (P2)        | T025–T035 | 11     |
| Phase 6 — Polish          | T036–T040 | 5      |
| **Total**                 |           | **40** |

### Gap coverage

| Gap              | Task(s)                                                          |
| ---------------- | ---------------------------------------------------------------- |
| G-A              | T031 (+ T027 defence in depth)                                   |
| G-B              | T022                                                             |
| G-C              | T017, T019, T023                                                 |
| G-D              | T026, T029, T033                                                 |
| G-E              | T009                                                             |
| G-F              | T006, T012, T015                                                 |
| G-01             | T005, T007, T011                                                 |
| G-02             | T004, T010, T011, T012, T013                                     |
| G-04             | T006, T008, T012, T014                                           |
| G-05             | T038 (backend request B-6)                                       |
| G-07             | T018, T020, T021 (+ T038 / B-1)                                  |
| G-08             | T038 (backend request B-5)                                       |
| G-10             | T038 (backend request B-2)                                       |
| G-11             | T025, T027, T032                                                 |
| G-12             | T028                                                             |
| G-13             | T026, T029 (payload now; path change is Phase 2)                 |
| G-03, G-06, G-09 | Deferred to Phase 2 by [plan.md](./plan.md) — no task, by design |
| FR-023 guard     | T030, T031, T034                                                 |
