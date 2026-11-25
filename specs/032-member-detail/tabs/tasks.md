---
description: 'Task list for feature 022-member-detail-tabs'
---

# Tasks: Member Detail — The 10 Tabs (会員詳細 タブ)

**Input**: Design documents from `/specs/032-member-detail/tabs/`
**Prerequisites**: plan.md ✔, spec.md ✔ (clarified 2026-07-29), research.md ✔, data-model.md ✔, contracts/mock-api.md ✔, quickstart.md ✔ (no `checklists/parity.md` for this feature — verification is quickstart.md)

**Organization**: Tasks are grouped by the four user stories in spec.md. This is a **verify-and-update pass** on an existing screen — all 10 tabs and 27 cards already exist, so there is no scaffolding. Per the constitution's **No Testing Policy** there are no test tasks; verification is `quickstart.md`.

**Prototype source**: `.cache/fitness-crm-ui/src/pages/member-detail.tsx` @ `426a9b3` (all `port from` line refs point into this file).

**All 8 clarifications are resolved** (spec.md → Clarifications). The last three, answered 2026-07-29 before implementation: **Q5** member-history endpoints are design-only → Phase 1 reads every tab from the mock API and any missing mock route is created here (the only one missing is the cancel route in T023); **Q6** follow the prototype → the point refund stays in feature `021`'s 休会申請 sheet, so ポイント履歴 and 紹介関係 gain no write control; **Q7** the prototype wins on wording → T014 relabels レッスン状態, T015 stays comment-only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (read all tabs, P1), US2 (contract operations, P1), US3 (privacy-gated data, P2), US4 (audit, P3)

---

## Phase 1: Setup

**Purpose**: Establish a green baseline so every later diff is attributable to this feature.

- [x] T001 Run `npm run lint && npm run type-check` on branch `022-member-detail-tabs` and record the baseline result (fix nothing yet; `npm test` does not exist in this project) — **baseline: both exit 0**
- [x] T002 Confirm the codegen chain is a no-op before any edit: run `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client`, verify `git diff --stat src/lib/openapi.json src/lib/api` is empty, and restore any accidental change (research R-1) — **verified empty**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: All Zod contract edits, followed by exactly one codegen run. Every user-story task below consumes the generated types, so no story work may begin until T008 passes.

**⚠️ CRITICAL**: T003–T006 all edit the same file (`src/app/api/_schemas/member.schema.ts`) — they are sequential, not parallel.

- [x] T003 Add `MemberPendingPlanChangeSchema` to `src/app/api/_schemas/member.schema.ts` with fields `applicationId`, `toPlanId`, `toPlanName`, `toMonthlyFee` (int), `effectiveFrom` (`YYYY-MM-01`), `requestedAt`, `requestedBy` — `.openapi({ title: 'MemberPendingPlanChange' })`, mirroring the existing `MemberFeeAdjustmentRefSchema` style (data-model.md §1; research R-2)
- [x] T004 Attach the new schema as an optional `pendingPlanChange` field on **both** `MainContractSchema` (~L1494) and `MemberCurrentMainContractSchema` (~L701) in `src/app/api/_schemas/member.schema.ts`, so the contract read and the member bundle expose the same shape (contracts/mock-api.md C-1, C-3)
- [~] ~~T005 Add `CancelPlanChangeRequestSchema` (`{ application_id: string }`) and export its inferred type in `src/app/api/_schemas/member.schema.ts`; the cancel response reuses `MainContractSchema`~~ — **REVERTED 2026-09-09** (cancel operation withdrawn; spec.md FR-013a / Out of Scope) — both schemas deleted (contracts/mock-api.md C-2)
- [x] T006 Add `nextBillingDate: z.string()` to `GetContractSummaryResponseSchema` (~L2044) in `src/app/api/_schemas/member.schema.ts`, keeping `billingDay` for Phase 2 compatibility (contracts/mock-api.md C-4; gap P-01)
- [x] T007 Widen the `DayPassStatus` enum (~L1998) in `src/app/api/_schemas/member.schema.ts` from `used | unused | expired` to `active | pending_start | used | expired | cancelled` (contracts/mock-api.md C-5; research R-6; gaps P-02, G-08)
- [x] T008 Run the codegen chain **once** — `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client` — then `npm run lint && npm run type-check`; the only diff under `src/lib/` must be the four schema changes above, and nothing under `src/lib/api/` may be hand-edited (Constitution II)

**Checkpoint**: generated types carry `pendingPlanChange`, `nextBillingDate` and the 5-value day-pass status — user stories can begin.

---

## Phase 3: User Story 1 — Read a member's whole picture across the tabs (Priority: P1) 🎯 MVP

**Goal**: All 10 tabs read correctly, with the URL-synced tab bar, four states per card, keep-previous-data filters, and the three prototype display defects fixed (P-01, P-02, P-03).

**Independent Test**: quickstart.md §A–§C, §E–§I, §L2 — click through all 10 tabs, exercise every month/period filter including a month with no data, force one card's request to fail, and confirm the three corrected displays.

### Display corrections

- [x] T009 [US1] Compute and return `nextBillingDate` in `src/app/api/crm/members/[id]/contracts/summary/route.ts`, derived from `billingDay` relative to today (next occurrence; clamp to month length for days 29–31) — contracts/mock-api.md C-4
- [x] T010 [US1] Render the concrete 次回請求日 date in `src/app/(private)/members/[id]/_components/tabs/contracts-tab/contract-summary-card.tsx` (replace the `毎月{billingDay}日` line with `formatDate(data.nextBillingDate)`) — port from member-detail.tsx › 契約サマリー (L1461-L1464); gap P-01
- [x] T011 [P] [US1] Extend the day-pass mock in `src/app/api/crm/members/[id]/contracts/day-pass-history/route.ts` (and its seed source) so every one of the 5 statuses is reachable, with at least one row per value — contracts/mock-api.md C-5
- [x] T012 [US1] Update `STATUS_LABEL` / `STATUS_CLASS` in `src/app/(private)/members/[id]/_components/tabs/contracts-tab/day-pass-history-card.tsx` to cover all 5 values — 有効 / 開始前 / 利用済み / 期限切れ / キャンセル (note: `used` becomes 利用済み per the prototype) — port from member-detail.tsx › getOnedayStatusClass (L662-L671) + 1DayPass table (L1408-L1438); gaps P-02, G-08
- [x] T013 [P] [US1] Render キャンペーン適用期間 at month granularity in `src/app/(private)/members/[id]/_components/tabs/contracts-tab/campaigns-card.tsx` (`getPeriodLabel` → `YYYY/MM 〜 YYYY/MM`, single month when start and end share a month) — port from member-detail.tsx › CAMPAIGN_APPLICATIONS period (L409-L412, L1372); gap P-03
- [x] T014 [P] [US1] Relabel `LESSON_STATUS_CONFIG` in `src/app/(private)/members/[id]/_components/tabs/usage-history-tab/lesson-status-badge.tsx` to the prototype's wording — `attended` → 受講済み, `cancelled` → キャンセル, `reserved` → 予約中 — keeping `absent` → 欠席 (the prototype never renders that state) and keeping each status's existing colour class; add a one-line comment citing spec Q7 so the mapping is not "corrected" back to `A-01`'s wording later — port from member-detail.tsx › getLessonStatusClass (L673-L684) + LESSON_HISTORY (L448-L453); gap P-04
- [x] T015 [P] [US1] Add a one-line comment above the empty-state block in `src/app/(private)/members/[id]/_components/tabs/training-records-tab/index.tsx` recording that the period-scoped message 「この期間にトレーニング記録がありません」 deliberately follows the prototype rather than `A-01 FR-012`'s unconditional wording (spec Q7; gap P-05) — no behaviour change

### Verification

- [ ] T016 [US1] Walk quickstart.md §A (tab shell) against the running app: tab order, `?tab=` sync, unknown-slug fallback, Back behaviour, 60/40 sticky layout, narrow-viewport stacking — file any defect found as a new task rather than fixing silently
- [ ] T017 [P] [US1] Walk quickstart.md §B (基本情報) and §C (契約操作 read cards), including the forced family-members failure that must not blank the sibling cards
- [ ] T018 [P] [US1] Walk quickstart.md §E (支払い履歴), §F (利用履歴), §G (ポイント履歴), §H (アンケート回答), §I (トレーニング記録) — for each, verify a no-data month/period keeps the headers and the filter usable, and that filter changes never flash a skeleton
- [ ] T019 [P] [US1] Verify the brand-resolved point name on one JOYFIT and one FIT365 member (ENJOYポイント / ベアレージポイント must come from the response, never from client-side brand mapping) — FR-031
- [ ] T020 [US1] Walk quickstart.md §L2 and confirm all five display decisions (three fixes + two deliberate non-changes)

**Checkpoint**: US1 is independently shippable — the whole screen reads correctly. This is the MVP.

---

## Phase 4: User Story 2 — Operate the member's contracts from the 契約操作 tab (Priority: P1)

**Goal**: The four write surfaces behave per spec, and 主契約変更 becomes a pending application with a visible pending state and a server-enforced single-pending rule (FR-013a). ~~a cancel path~~ withdrawn 2026-09-09.

**Independent Test**: quickstart.md §D + §L1 — as HQ submit a plan change, confirm the plan does **not** change while a pending block appears with the effective month; confirm 変更 is disabled with a reason; confirm the block carries **no** cancel control (withdrawn 2026-09-09); open the seeded pending member; call the endpoint twice and confirm the `409`.

### Mock DB + routes (FR-013a)

- [x] T021 [US2] Add pending-plan-change storage — **implemented on the contract row instead of `members.table.ts`**: `pending_plan_change` on `StoredMainContract` in `src/app/api/_mock-db/types/contracts.type.ts` plus `toPendingPlanChangeResponse()` in `src/app/api/_lib/member-contract.ts`. The contract row is where `db.contracts` already keeps 主契約 state, so no new table or helper set was needed (data-model.md §1)
- [x] T022 [US2] Rewrite the handler in `src/app/api/crm/members/[id]/contracts/main-contract/change/route.ts` so it **creates a pending application** instead of mutating the plan: derive `effectiveFrom` as the 1st of next month server-side, reject `contract_id` equal to the current plan, return `409` with code `E-PLAN-409` when one is already pending, and return the unchanged contract plus `pendingPlanChange` — contracts/mock-api.md C-1; research R-3, R-4
- [~] [US2] ~~T023 Create `src/app/api/crm/members/[id]/contracts/main-contract/change/cancel/route.ts` (`POST`, body `{ application_id }`) that clears the pending application and returns the contract without `pendingPlanChange`; `404` when no pending application matches — register it with `registerRoute` following the sibling route's shape~~ — **REVERTED 2026-09-09** (cancel operation withdrawn; spec.md FR-013a / Out of Scope) — route deleted (contracts/mock-api.md C-2)
- [~] [US2] ~~T024 Import the new route in `src/app/api/_routes/index.ts` so it is included in the OpenAPI registry~~ — **REVERTED 2026-09-09** (cancel operation withdrawn; spec.md FR-013a / Out of Scope) — import removed
- [x] T025 [US2] Return `pendingPlanChange` from `src/app/api/crm/members/[id]/contracts/main-contract/route.ts` and from the member bundle in `src/app/api/crm/members/[id]/route.ts` (on `currentMainContract`), reading the store added in T021 — contracts/mock-api.md C-3
- [ ] T026 [P] [US2] ~~Seed one member with an existing pending plan change~~ — **SKIPPED, see finding F-01**: `db.contracts` rows are keyed by **plan master**, and `getByMemberId` resolves through `_listMeta.contract_id`, so a seeded pending change would appear on _every_ member holding that plan. Seeding it would misrepresent those members. The state is reachable by performing the change instead (verified live; quickstart §L1 covers it). Fixing this properly means giving members their own contract rows — a mock-DB refactor outside this feature's scope.
- [x] T027 [US2] Re-run `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client` after T023/T024 so the new cancel operation reaches the typed client, then `npm run lint && npm run type-check` — **re-run 2026-09-09** after the revert, so the operation is out of the typed client again (`generate-openapi` cannot register routes in this checkout — `@/app` alias fails under tsx — so the path was removed from `src/lib/openapi.json` directly, then prettier + `generate-client`)

### UI (FR-013a)

- [x] T028 [US2] Render the pending block in `src/app/(private)/members/[id]/_components/tabs/contracts-tab/main-contract-card.tsx`: below the contract row show the destination plan, its monthly fee and the effective month (「2026/08/01から適用」), styled as an info alert consistent with the sheet's existing next-month notice
- [x] T029 [US2] Disable the 変更 trigger in the same card while a pending application exists, with the reason stated on the disabled control (never a silently hidden button) — FR-013a, SC-005
- [~] [US2] ~~T030 Add the cancel action to the pending block behind an `AlertDialog` confirmation, calling the T023 endpoint and invalidating the main-contract, contract-summary and member-detail queries on success, with a success toast and an error toast that keeps the block intact on failure~~ — **REVERTED 2026-09-09** (cancel operation withdrawn; spec.md FR-013a / Out of Scope) — button, dialog and mutation removed from `main-contract-card.tsx`; the pending block is read-only
- [x] T031 [US2] Update the change mutation's success handling in the same card so it no longer implies an applied change: the toast wording states an application was registered, and the same three queries are invalidated so the pending block appears without a reload

### Verification

- [ ] T032 [US2] Walk quickstart.md §D: role gating on 主契約 変更, the change sheet's read-only current plan / excluded current plan / price difference / next-month notice, the 個別会費調整 required fields and 終了月 ≥ 開始月 rule, the three option sheets' timing choices, and all four blocking states (休会中 / 退会予定 / 解約手数料期間中 / 未納金)
- [ ] T033 [US2] Walk quickstart.md §L1 end to end, including the duplicate-submit `409` from a stale second tab and the seeded pending member

**Checkpoint**: US1 + US2 = the tab set reads correctly and the only writing tab is complete and audit-correct.

---

## Phase 5: User Story 3 — Review privacy-gated and cross-system data (Priority: P2)

**Goal**: Confirm the body-data consent gate never leaks health data, and that the mobile-sourced tabs stay read-only. No implementation is planned — this story is a verification story, and any defect found becomes a new task.

**Independent Test**: quickstart.md §J — load the tab for a member in each of the three consent states with the network panel open.

- [ ] T034 [US3] Verify with the browser network panel that **no** body-data request is issued for a not-consented member and for a refused member, and that each shows its own message (lock vs destructive) — FR-038, SC-004
- [ ] T035 [P] [US3] Verify the granted path: 最新記録サマリー with its measurement date, all 12 体組成 metrics, all 10 身体データ measurements plus 身長, the 体重推移 chart, and 測定履歴 newest-first with a per-row source badge — FR-039, FR-040, FR-041
- [ ] T036 [P] [US3] Verify the zero-measurement granted case shows 「まだボディーデータの記録がありません」 and no summary of zeros (research R-8 / gap P-07 — the tab-level empty state is deliberate)
- [ ] T037 [P] [US3] Verify the gate re-evaluates when navigating from a granted member to a non-consenting one without a page reload (no stale "granted")
- [ ] T038 [P] [US3] Verify no create / edit / delete control exists on ポイント履歴, アンケート回答, トレーニング記録, ボディーデータ or 紹介関係, and walk quickstart.md §K's 紹介関係 items — FR-032, FR-037, FR-041, FR-043

**Checkpoint**: the privacy gate is proven, and the read-only assertions hold across the five read-only tabs.

---

## Phase 6: User Story 4 — Audit what changed (Priority: P3)

**Goal**: Confirm 変更履歴 renders the seeded audit trail correctly and offers no write path.

**Independent Test**: quickstart.md §K (変更履歴 items) on a seeded member.

- [ ] T039 [US4] Verify the column set, ordering, status badge on ステータス rows, 新規作成 badge on the creation row, `—` for missing values, and the grouping of a multi-field change under one timestamp/operator — FR-045, FR-046
- [ ] T040 [P] [US4] Verify pagination keeps previous rows visible while loading, the empty state reads 「変更履歴はありません」, and no add / edit / delete control exists anywhere on the tab (seed-only, FR-047)

**Checkpoint**: all four user stories are independently verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T041 Run the full quickstart.md sweep in one pass (§A–§M) on a fully-populated member plus one withdrawn member, confirming the tabs stay readable after withdrawal and only the 契約操作 write controls are unavailable (spec Edge Cases)
- [x] T042 Final gate: `npm run lint && npm run type-check` clean, and `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client` produces **only** this feature's intended diff — no unrelated churn, no hand-edit under `src/lib/api/` (quickstart §M)
- [x] T043 [P] Confirm no test file and no npm dependency were added anywhere in the branch (Constitution: No Testing Policy; Principle V)
- [ ] T044 [P] Hand `specs/032-member-detail/tabs/contracts/mock-api.md` Part 2 (BR-1…BR-8) to the backend team and record the ticket references back into that file
- [ ] T045 Update `specs/032-member-detail/tabs/spec.md` and `plan.md` if any verification task uncovered a behaviour the spec does not describe (spec stays the source of truth; do not leave findings only in the MR)

---

## Findings from implementation (2026-07-29)

- **F-01 — mock contract rows are shared per plan master.** `db.contracts` keys rows by main-contract master id and `getByMemberId` resolves through `member._listMeta.contract_id`, so two members on the same plan share one row. Consequence: a pending plan change registered for one member is visible on every member holding that plan, and seeding one (T026) would misrepresent the others. Not introduced by this feature; recorded for the backend/mock-DB backlog. Phase 2 is unaffected — the real API keys plan changes by contract.
- **F-02 — verified live against the running mock API**: `nextBillingDate` resolves correctly (`billingDay 27` → `2026-08-27` when run on 2026-07-30), all five day-pass statuses are produced, the change endpoint registers an application **without** mutating the plan, the member bundle exposes `currentMainContract.pendingPlanChange`, a duplicate submit returns `409 E-PLAN-409`, and cancel clears the application (`404` for a wrong `application_id`).
- **Manual UI verification not performed.** Every task in the Verification blocks (T016–T020, T032–T041) requires driving the authenticated screen in a browser; the private route redirects (307) without a session, so none of them were ticked. They remain the outstanding QA gate.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup. **Blocks all user stories** — the generated types from T008 are what the story tasks consume.
- **US1 (Phase 3)** and **US2 (Phase 4)**: both depend only on Phase 2. They touch different files (US1: summary/day-pass/campaign cards; US2: main-contract card + its routes) and can run in parallel.
- **US3 (Phase 5)** and **US4 (Phase 6)**: verification only — depend on nothing beyond a running app; can run at any point after Setup, and in parallel with US1/US2.
- **Polish (Phase 7)**: depends on every story phase you intend to ship.

### Within US2

T021 → T022 → T023 → T024 → T025 → T027 (mock chain, mostly the same files, sequential) → T028 → T029 → T030/T031 (UI, same file, sequential) → T032/T033 (verification). T026 is independent of the route chain and marked `[P]`.

### Parallel Opportunities

- T011 and T013–T015 (US1) touch four different files and can run together.
- T017–T019 (US1 verification) are independent walkthroughs.
- All of US3 (T035–T038) and US4 (T040) are independent read-only checks.
- US1 and US2 can be split across two developers immediately after T008.

## Parallel Example: after the Foundational checkpoint

```text
Developer A → US1: T009, T010, then T011/T013/T014/T015 in parallel
Developer B → US2: T021 → T022 → T023 → T024 → T025 → T027, with T026 in parallel
Either      → US3 + US4 verification (T034–T040) — no code dependency
```

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 Setup → Phase 2 Foundational (T001–T008).
2. Phase 3 US1 (T009–T020).
3. **STOP and VALIDATE** with quickstart §A–§C, §E–§I, §L2.
4. The screen now reads correctly everywhere — shippable on its own, because FR-013a only changes how a write is recorded, not whether the tabs work.

### Incremental delivery

1. Setup + Foundational → generated types ready.
2. US1 → validate → ship (MVP: all 10 tabs read correctly, 3 display defects fixed).
3. US2 → validate → ship (主契約変更 becomes an auditable pending application).
4. US3 + US4 → validate → the privacy gate and the audit trail are proven.
5. Polish → final gate + backend hand-off.

## Notes

- **45 tasks**: 24 implementation / contract tasks and 21 verification & gate tasks. The high verification ratio is intentional — 22 of the 27 cards already match the target, and this feature's job is to prove that rather than rewrite them.
- Verification tasks must **file defects as new tasks**, not fix them inline; a silent fix inside a verification pass loses the record of what was wrong.
- `[P]` = different files, no dependency on an incomplete task.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- Deferred by plan.md and **not** in this list: P-06 (metric-switchable chart), P-09 (change-history filters), and the eight Phase 2 shape reconciliations (G-11, G-14, G-15, G-17, G-19, G-20, G-21, G-22).
