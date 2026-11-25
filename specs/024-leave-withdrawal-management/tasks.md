---
description: 'Task list for A-03 Leave & Withdrawal Management'
---

# Tasks: Leave & Withdrawal Management (A-03)

**Input**: Design documents from `/specs/024-leave-withdrawal-management/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [checklists/parity.md](./checklists/parity.md)

**Organization**: Tasks are grouped by user story so each story can be implemented, verified and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: `[US1]` / `[US2]` / `[US3]` — maps to the user stories in spec.md
- Every task carries an exact file path
- **UI tasks** cite their V0 source range and the `PAR###` parity items they satisfy

## ⚠️ Read before starting

**This feature already exists.** `src/app/(private)/members/leaves/` is a working list + detail implementation (~1,365 lines) plus 6 route handlers, built on `feat/member-leave` before this spec existed. Almost every task below is **modify** or **delete**, not create. Read [plan.md § Current Implementation Baseline](./plan.md) and its gap analysis (A1–A3 remove, B1–B11 add, C1–C7 change) before touching anything.

**Five clarifications are already satisfied by that code** — do not "fix" them: Q-01 (予定日 filters server-side), Q-04 (five brands), Q-05 (server-side search), Q-08 (cancel dialog works), Q-09 (loading/error convention).

**No tests.** The constitution forbids automated tests absolutely. There are no test tasks in this list and none may be added. Verification is `tsc --noEmit` + ESLint + [quickstart.md](./quickstart.md) + MR review.

**Several parity items deliberately depart from V0** (PAR006, PAR014, PAR015, PAR027, PAR078, PAR084, PAR107, PAR134) because the mockup contains defects the clarifications chose to fix. Read the parity item, not just the V0 line range.

## Path Conventions

Next.js App Router, single project. Screens live at `src/app/(private)/members/leaves/` with route-local `_components/` · `_hooks/` · `_contexts/` · `_constants/`. Mock API at `src/app/api/`. V0 sources are read-only references under `.cache/fitness-crm-ui/`.

---

## Phase 1: Setup

**Purpose**: Establish a clean baseline so later failures are attributable to this work.

- [x] T001 Confirm the baseline is green before any change — run `npx tsc --noEmit` and `npm run lint` at repo root and record that both pass
- [x] T002 [P] Confirm the V0 reference sources are present at the pinned commit — `.cache/fitness-crm-ui` at `e99646c`, files `src/pages/leave-list.tsx` and `src/pages/leave-detail.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The data layer every story reads from. Schema → mock table → routes → generated client.

**⚠️ CRITICAL**: No user story work can begin until T015 completes — all three stories consume the generated client.

**Note**: T003–T007 all edit `src/app/api/_schemas/leave.schema.ts`, so they are strictly sequential. Same for T011–T014 within the route tree.

- [x] T003 Extend the list-item schema in `src/app/api/_schemas/leave.schema.ts` — add `application_number`, `member_number`, `cancellable`, `cancellation_blocked_reason`; retype `brand` from `z.string()` to the project `Brand` enum, per data-model.md entity 1
- [x] T004 Add the `CancellationBlockedReason` enum (`not_cancellable_status` / `batch_processing_started` / `usage_started`) and the `ProxyAgreementMethod` enum (`in_person` / `phone` / `email` / `line`) to `src/app/api/_schemas/leave.schema.ts`, per data-model.md
- [x] T005 Extend the detail schema in `src/app/api/_schemas/leave.schema.ts` — add the `member` block (`LeaveMember`: member_id, member_number, name, name_kana, legacy_member_code, member_type, contract_name, store_name, face_photo_url), `withdrawal_fee`, `usage_start_date`, `suspension_history[]`, `cancellable`, `cancellation_blocked_reason`; retype `consent_method` to the enum, per data-model.md entities 2–4
- [x] T006 Update the query and response schemas in `src/app/api/_schemas/leave.schema.ts` — `limit` default 20 → 25 (cap stays 100), `sort_by` enum drop `id` leaving `applied_at` / `scheduled_date` with default `scheduled_date`, `sort_order` default `desc` → `asc`, reject `status=completed`, add `total_all` to the list response, per contracts/list-leaves.md and research.md §1–§2
- [x] T007 Delete `ApproveLeaveRequestSchema`, `RejectLeaveRequestSchema` and `ExecuteWithdrawalRequestSchema` from `src/app/api/_schemas/leave.schema.ts` (plan gap A3)
- [x] T008 **Extract** the existing `memberLeaves` table out of `src/app/api/_mock-db/tables/transfer.table.ts` (L131–L492) into its own `src/app/api/_mock-db/tables/member-leave.table.ts`, register it in `_create-db.ts`, and align it with the new schema. ⚠️ **Corrected 2026-08-05**: this table was assumed not to exist; it does, nested inside the transfer table, and `db.memberLeaves` is already consumed by `members.table.ts` and three route handlers
- [x] T009 Create the seed `src/app/api/_mock-db/seeds/member-leave.seed.ts` covering every case data-model.md § Mock table & seed requires — one row per list status (none `completed`), one cancellable withdrawal plus one blocked by each of the three reasons, a proxy and a non-proxy application, a member holding two concurrent applications, ≥ 2 stores and ≥ 3 brands, and a member with a non-contiguous suspension history. ⚠️ **Corrected 2026-08-05**: the current seed _derives_ rows from `members._members` by member status, and `_updateDetail` writes member status back, so the member↔leave linkage must be preserved. Keep the derivation and layer explicit coverage overrides on top — do **not** replace it with a fully static seed, or `getActiveSuspensionByMemberId` (used by the member detail screen) will drift from member data
- [x] T010 Align `src/app/api/_mock-db/types/member-leaves.type.ts` with the new schema and drop **only** `approve`, `reject` and `executeWithdrawal` (used solely by the three routes deleted in T014). ⚠️ **Corrected 2026-08-05**: the original task also said to drop `create` and `createSuspension` — that is wrong. `members.table.ts` calls them at L616, L643 and L762 to drive A-01-01's member-side suspend/withdraw flows; removing them would break the member screens. **Keep both**, updated to emit the new record shape
- [x] T011 Rewrite the list handler `src/app/api/crm/leaves/route.ts` per contracts/list-leaves.md — apply the caller's store scope **before** any user filter, exclude `completed` rows, derive `cancellable` / `cancellation_blocked_reason` per row, return `total_all`, and apply the new sort defaults
- [x] T012 Update the detail handler `src/app/api/crm/leaves/[id]/route.ts` per contracts/leave-detail.md — populate the `member` block in the same request, set `withdrawal_fee` for withdrawals and `suspension_fee` for suspensions, populate `unused_lessons` for **both** types, derive `suspension_history` from the member's applications, and return `404` (not `403`) for out-of-scope ids
- [x] T013 Update the cancellation handler `src/app/api/crm/leaves/[id]/cancel-withdrawal/route.ts` per contracts/cancel-withdrawal.md — implement the three-step guard chain in order with `409` / `409` / `422`, return the blocking reason, and keep it non-idempotent
- [x] T014 Delete the out-of-scope route handlers `src/app/api/crm/leaves/[id]/approve/route.ts`, `src/app/api/crm/leaves/[id]/reject/route.ts` and `src/app/api/crm/leaves/[id]/execute-withdrawal/route.ts` (plan gap A3)
- [x] T015 Regenerate the API layer — run the OpenAPI generation script, `prettier --write` the generated document, regenerate the hey-api client, and confirm the diff in `src/lib/api/` is limited to the intended change. **Never hand-edit `src/lib/api/`** (Constitution II)

**Checkpoint**: Data layer complete. All three stories can now proceed in parallel.

---

## Phase 3: User Story 1 — Survey suspension and withdrawal cases (Priority: P1) 🎯 MVP

**Goal**: An operator opens 休会・退会管理 and sees every in-scope application in one table, narrows it with filters, and pages through the result.

**Independent Test**: Sign in as Staff, open the screen, confirm the columns and badges match FR-008/FR-010, apply each filter and confirm the count badge, banner and table agree, then sign in as Trainer and confirm the denial card. Quickstart gates 1–4.

### Implementation for User Story 1

- [x] T016 [P] [US1] Remove `処理完了` from the list-facing status options in `src/app/(private)/members/leaves/_constants/constants.ts` — build `LEAVE_STATUS_OPTIONS` from an explicit four-value list instead of `Object.values(LeaveStatus)`, keeping the label/class/icon maps intact for the detail screen; satisfies PAR012 (research.md §3)
- [x] T017 [US1] Extend `src/app/(private)/members/leaves/_hooks/use-leaves-filters.ts` — add page-size state (25 / 50 / 100, default 25), add header store scope via `useCurrentStore()`, reset the in-screen `store_id` filter when the scope narrows to a single store, and exclude the header scope from `hasActiveFilters`; satisfies PAR018, PAR019, PAR072
- [x] T018 [US1] Add the Trainer access-denied card and role gate to `src/app/(private)/members/leaves/page.tsx` — centred card `min-h-[400px]`, heading 「この画面を表示する権限がありません」, body 「休会・退会管理はトレーナーロールでは参照できません。」, with the table, filters and pagination not rendered at all — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L486-L493, L337); satisfies PAR001, PAR004
- [x] T019 [US1] Align the page shell and header in `src/app/(private)/members/leaves/page.tsx` — scrollable `main`, title 「休会・退会管理」 with a count badge bound to the **filtered** row count, and sidebar active state on 休会・退会管理 — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L473-L483, L477-L481); satisfies PAR002, PAR003, PAR005
- [x] T020 [US1] Rework the toolbar in `src/app/(private)/members/leaves/_components/leaves-filters.tsx` — search input (max-w 400px, Search icon, placeholder 「申請ID・会員名で検索」, resets to page 1; **server-side match**, already correct), and the 詳細フィルター toggle with its active-count badge and chevron — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L503-L545); satisfies PAR006, PAR008, PAR009, PAR010
- [x] T021 [US1] Rework the expandable filter row in `src/app/(private)/members/leaves/_components/leaves-filters.tsx` — 種別 (120px), ステータス (160px, **four values, no 処理完了**), 店舗 (160px, rendered only under an all-stores header scope with 2+ accessible stores), ブランド (130px, **all five brands**, matched on the record's brand), 予定日 (120px, **must actually filter**), each highlighting when non-default — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L552-L611, L325-L329); satisfies PAR011, PAR012, PAR013, PAR014, PAR015, PAR017
- [x] T022 [US1] Add the filter-result banner to `src/app/(private)/members/leaves/_components/leaves-filters.tsx` using the shared `FilterResultBanner` — shown only when a filter or search is active, placed inside the table Card directly under the toolbar, reading 「全 {total_all} 件中 {total} 件を抽出中」 with a `・`-joined summary ordered 種別 → ステータス → ブランド → 予定: → 店舗 (header scope excluded), plus 条件をクリア — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L628-L634, L387-L397) and `src/components/filter-result-banner.tsx` (L419-L429); satisfies PAR020, PAR021, PAR022, PAR023
- [x] T023 [US1] Rebuild the column set in `src/app/(private)/members/leaves/_components/leaves-table-columns.tsx` to FR-008 order — 会員ID (100px, member **number**, mono muted) · 会員名 (link, stops row navigation) · ブランド (BrandBadge, record's own brand) · 店舗名 (all-stores scope only) · ステータス (120px) · 申請日 (100px, sortable) · 予定日 (100px, sortable) · 終了日 (100px) · 未納金 (100px, right) · row actions (56px, unlabelled). **Delete the 申請ID and 種別 columns** — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L642-L653, L680-L724); satisfies PAR024, PAR027, PAR028, PAR030, PAR031, PAR033, PAR034, PAR035, PAR036, PAR037
- [x] T024 [US1] Reduce the status badge map to four variants in `src/app/(private)/members/leaves/_components/leaves-table-columns.tsx` — 休会予定 warning+dot · 休会中 info+dot · 退会予定 destructive+dot · 退会処理待ち warning+dot, all `text-[10px]` with a `size-1.5` dot; the 処理完了 plain-secondary variant is **not** rendered in the list — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L217-L240, L703-L716); satisfies PAR032
- [x] T025 [US1] Make the table header sticky and the table horizontally scrollable in `src/app/(private)/members/leaves/page.tsx` — `sticky top-0 z-10` with `bg-muted/50`, `text-xs font-semibold` — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L637, L641-L653); satisfies PAR025, PAR026
- [x] T026 [US1] Add both empty states to `src/app/(private)/members/leaves/page.tsx` using the shared `Empty` — filtered variant (SearchX, 「条件に一致する休会・退会がありません」, 条件をクリア button) and plain variant (PackageOpen, 「休会・退会がまだありません」, no button), spanning all columns — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L657-L670) and `src/components/empty-state.tsx` (L467-L487); satisfies PAR038, PAR039, PAR040
- [x] T027 [US1] Swap the footer to `TablePaginationWithSize` in `src/app/(private)/members/leaves/page.tsx` with `pageSizeOptions={[25, 50, 100]}` (**not** the component's default which includes 200), summary 「全 N 件 / M ページ / X-Y を表示」, dimmed 前へ/次へ at the ends, ≤ 7 numbered links with ellipses keeping first and last reachable, return to page 1 on size change, scroll to top on page change, and clamp the effective page — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L914-L970, L428, L438-L456); satisfies PAR067, PAR068, PAR069, PAR070, PAR071, PAR072, PAR073, PAR074
- [x] T028 [US1] Remove the sort controls from `src/app/(private)/members/leaves/page.tsx` and `_components/leaves-table-columns.tsx` — plain headers throughout, no `sort_by` / `sort_order` in URL state, ordering fixed server-side at `scheduled_date asc`. ⚠️ **Corrected 2026-08-06**: this task originally said to _keep_ sortable headers on 申請日 and 予定日. That came from Q-13's planning-time reversal, which the user rejected on review — V0 has no sorting at all. The endpoint keeps both parameters so the mock stays contract-shaped; only the UI drops them; satisfies FR-035a, research.md §2

**Checkpoint**: User Story 1 is fully functional and demoable on its own — the list reads, filters, sorts and pages correctly under every role and scope.

---

## Phase 4: User Story 2 — Open one application and read its full context (Priority: P1)

**Goal**: An operator clicks a row and reads the application facts, its approval progress, who applied by proxy, the adjacent business figures, and the member's month-by-month history.

**Independent Test**: Open a seeded suspension and a seeded withdrawal; confirm every card, the type-dependent labels, the 2-vs-3 timeline steps, the proxy card appearing only for proxy applications, a real 退会手数料 amount, and the history strip navigating across months. Quickstart gate 6.

**Depends on**: Phase 2 only. Independent of US1 and US3.

### Implementation for User Story 2

- [x] T029 [P] [US2] Mount the shared `src/components/common/suspension-history-strip.tsx`. ⚠️ **Corrected 2026-08-06 (rebase onto `feat/member`)**: this task said _create_ the component, and it was created. `feat/member` turned out to already own one at the same path (commit `e06c77e3`, built for the member-detail 契約操作 tab), so the rebase replaced this feature's copy with theirs. Theirs is kept — A-03 adapts to its API instead (`Record<"YYYY/MM", cell>` rather than an array, an `onViewApplications` callback rather than an href, plus a `stripOverride` slot for loading states). The conversion lives in `[id]/page.tsx` › `toStripHistory`; satisfies PAR111-PAR122 (see the parity re-verification note for PAR116 and PAR123)
- [x] T030 [P] [US2] Create `src/app/(private)/members/leaves/[id]/_components/leave-member-headup.tsx` — Card `mb-4 py-0 gap-0`, face photo `size-24 rounded-lg object-cover`, name (`text-base font-bold`) and kana lines, identifier line 「ID: {member number}」 / 「旧No: {legacy code}」 / 「主契約店舗: {store}」 (`text-xs muted font-mono`, **member number not UUID**), member-type and 「主契約: {name}」 outline badges, and a 会員詳細を開く ghost button with ArrowUpRight — port from `.cache/fitness-crm-ui/src/components/member-headup-card.tsx` (L262-L311); satisfies PAR081, PAR082, PAR083, PAR084, PAR085, PAR086
- [x] T031 [US2] Rework the detail page header in `src/app/(private)/members/leaves/[id]/page.tsx` — BackLink 「休会・退会管理に戻る」 with ChevronLeft, title 「{name} さんの{休会|退会}申請」, application-**number** badge (secondary, mono), and the status badge (plain secondary for 処理完了, otherwise outline with a `size-1.5` dot); the sidebar keeps its 休会・退会 active state — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L393-L429, L116-L124) and `src/components/back-link.tsx` (L707-L715); satisfies PAR075, PAR076, PAR077, PAR078, PAR079
- [x] T032 [US2] Apply the two-column layout in `src/app/(private)/members/leaves/[id]/page.tsx` — left 60% / right 40%, `flex gap-4`, right column `sticky top-0`, and confirm the detail stays **tab-less** (no 変更履歴 tab — Q-14) — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L137-L139, L335-L336, L443-L444); satisfies PAR087, PAR088
- [x] T033 [US2] Mount the head-up card in `src/app/(private)/members/leaves/[id]/page.tsx` fed from the **same** detail query — no second member lookup (FR-057a); satisfies PAR082a
- [x] T034 [US2] Align the 申請情報 card in `src/app/(private)/members/leaves/[id]/_components/leave-detail-info.tsx` — title 「申請情報」, 2-column grid `gap-x-8 gap-y-4`, 申請ID as the application **number** (mono), 種別 type-coloured badge, third/fourth labels switching 休会開始月/休会終了月 ⇄ 退会予定日/終了日 (`—` for withdrawals), 理由 spanning both columns, 申請者, 申請日時 — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L141-L185); satisfies PAR089, PAR090, PAR091, PAR092, PAR093, PAR094, PAR095
- [x] T035 [US2] Verify and preserve the 承認フロー card in `src/app/(private)/members/leaves/[id]/_components/leave-detail-info.tsx` — `size-6` markers with a 1px connector, success Check when complete and muted Clock when pending, step 1 申請 always complete captioned `{applied_at} {proxy applicant or applicant}`, step 2 labelled 休会承認/退会承認 with its connector rendered for withdrawals only, step 3 退会処理実行 for withdrawals only. **Exactly 2 steps for suspensions and 3 for withdrawals, with no current-step highlight** — this is intentional (Q-03), do not add the backend's `recess_start`/`recess_end` steps — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L188-L264); satisfies PAR096, PAR097, PAR098, PAR099, PAR100, PAR101, PAR102
- [x] T036 [US2] Verify the 代理申請情報 card in `src/app/(private)/members/leaves/[id]/_components/leave-detail-info.tsx` — rendered only when the application is a proxy application, title 「代理申請情報」, 2-column grid with 代理申請者 / 合意日時 / 合意方法, the last rendering the enum as 来店 / 電話 / メール / LINE — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L266-L289); satisfies PAR103, PAR104, PAR105
- [x] T037 [US2] Fix the 関連情報 card in `src/app/(private)/members/leaves/[id]/_components/leave-detail-info.tsx` — first field switches 休会費 (`¥{n}/月`) ⇄ 退会手数料 showing the withdrawal's **real fee amount**, replacing V0's hardcoded `—` (Q-07); 適用キャンペーン; 未消化レッスン 「{n}回」 for **both** types; 未納金 destructive when positive — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L291-L322); satisfies PAR106, PAR107, PAR108, PAR109, PAR110
- [x] T038 [US2] Mount the history strip in `src/app/(private)/members/leaves/[id]/page.tsx` with title 「休会・退会履歴」, the detail's `suspension_history`, the current year-month, and a 他の申請一覧を見る link back to the list — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L324-L331); satisfies PAR123
- [x] T039 [US2] Align the status-card display in `src/app/(private)/members/leaves/[id]/_components/leave-status-action.tsx` — title 「ステータス」, `size-20` tinted circle with a `size-10` icon, per-status tone/icon (休会予定 warning+Clock · 休会中 info+PauseCircle · 退会予定 destructive+Clock · 退会処理待ち warning+XCircle · 処理完了 muted+CheckCircle), dotted outline badge, and the 「最終更新: {updated_at}」 meta line; 処理完了 shows 「処理が完了しています」 in place of any action — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L87-L106, L337-L366) and `src/components/status-card.tsx` (L353-L394); satisfies PAR124, PAR125, PAR126, PAR127, PAR132

**Checkpoint**: User Story 2 is fully functional — every detail card renders correctly for both application types.

---

## Phase 5: User Story 3 — Cancel a scheduled withdrawal (Priority: P2)

**Goal**: An authorised operator cancels a scheduled withdrawal from either the list row menu or the detail status card, and sees clearly why a cancellation is not permitted when it is not.

**Independent Test**: As Staff, cancel a cancellable 退会予定 row from the list and confirm the toast and the state change; confirm both disabled tooltips on the blocked rows; confirm suspension rows have no menu; cancel again on the same application and confirm the conflict is surfaced; repeat from the detail. As Observer, confirm the action is non-actionable. Quickstart gates 5 and part of 6.

**Depends on**: Phase 2. Touches files US1 and US2 also touch (`leaves-table-columns.tsx`, `leave-status-action.tsx`) — sequence after those stories, or coordinate.

### Implementation for User Story 3

- [x] T040 [P] [US3] Create `src/app/(private)/members/leaves/_components/leaves-row-actions.tsx` — dropdown trigger (MoreHorizontal, `size-8 rounded-md hover:bg-muted`) rendered **only** on withdrawal rows, containing a single 退会取り消し item with an Undo2 icon; enabled when the row is 退会予定 **and** `cancellable`; disabled with tooltip 「利用開始日以降のため取り消し不可」 when 退会予定 but blocked by `usage_started`; disabled with tooltip 「退会処理が開始されているため取り消し不可」 for any other withdrawal state; role-gated to System/Headquarter/Manager/Staff via `RoleGatedMenuItem`, which renders non-allowed users at `opacity-50 cursor-not-allowed` with a trailing 本部 badge — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L726-L778) and `src/components/role-gated-menu-item.tsx` (L537-L577); satisfies PAR041, PAR042, PAR043, PAR044, PAR045, PAR046
- [x] T041 [P] [US3] Create `src/app/(private)/members/leaves/_components/leaves-cancel-dialog.tsx` — AlertDialog titled 「退会取り消しを実行しますか？」, body 「**{name}**（{member number}）の退会申請を取り消します。」 then a line break then 「取り消し後、会員ステータスは有効（通常）に戻ります。この操作は記録されます。」, footer キャンセル / 取り消しを実行する; on confirm call the cancellation mutation, show the success toast 「{name} の退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。」 and invalidate the list query; dismissing changes nothing — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L979-L1007); satisfies PAR047, PAR048, PAR049, PAR050, PAR051
- [x] T042 [US3] Wire the row-action column in `src/app/(private)/members/leaves/_components/leaves-table-columns.tsx` — mount `LeavesRowActions`, and stop the cell's click from triggering the row navigation — port from `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L726); satisfies PAR041 (depends on T023, T040)
- [x] T043 [US3] Strip the out-of-scope actions from `src/app/(private)/members/leaves/[id]/_components/leave-status-action.tsx` — delete the 承認, 却下 and 退会処理を実行 buttons, their AlertDialogs and their mutations (`postCrmLeavesByIdApproveMutation`, `postCrmLeavesByIdRejectMutation`, `postCrmLeavesByIdExecuteWithdrawalMutation`); the action area must render **only** for 退会予定 and 処理完了 (plan gap A1); satisfies PAR128
- [x] T044 [US3] Rework the detail cancel control in `src/app/(private)/members/leaves/[id]/_components/leave-status-action.tsx` — full-width outline 退会取り消し button for 退会予定 only, role-gated to Headquarter/System/Manager/Staff via `RoleGatedButton`, disabled when the server says the row is not cancellable, deny tooltip switching between 「利用開始日以降のため取り消し不可」 (date guard) and 「退会取り消しの権限がありません」 (role guard), with non-allowed users rendered `disabled` + `aria-disabled` inside a tooltip. **Read cancellability from the server-derived fields — never recompute it from dates in the component** (research.md §4) — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L344-L359) and `src/components/role-gated-button.tsx` (L633-L678); satisfies PAR129, PAR130, PAR131
- [x] T045 [US3] Make the detail cancel dialog perform the cancellation in `src/app/(private)/members/leaves/[id]/_components/leave-status-action.tsx` — keep its own V0 wording (title 「退会を取り消しますか？」, body 「{name} さんの退会予定を取り消します。」, action 取り消す — deliberately **not** unified with the list dialog, Q-08), call the mutation, give the same success/failure feedback, then invalidate both the detail and list queries — port from `.cache/fitness-crm-ui/src/pages/leave-detail.tsx` (L369-L382); satisfies PAR133, PAR134
- [x] T046 [US3] Surface cancellation failures without losing the view in `src/app/(private)/members/leaves/[id]/_components/leave-status-action.tsx` and `_components/leaves-cancel-dialog.tsx` — map `409` / `422` / `403` / `404` to the server's user-facing message via `toast.error`, leaving the application unchanged (FR-052, FR-082a); covers the double-cancel conflict case

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T047 [P] Confirm the loading and error treatments follow the project convention across both screens — `DataStateBoundary` (`isLoading` → skeleton, `isError` → error + retry, `isEmpty` → empty) with the toolbar and filters left mounted outside the boundary, and `leave-detail-skeleton.tsx` on the detail (FR-081, FR-082; research.md — already largely in place)
- [x] T048 [P] Confirm an unknown or out-of-scope detail id renders a not-found treatment rather than a blank page or a permission error, in `src/app/(private)/members/leaves/[id]/page.tsx` (FR-083)
- [x] T049 Remove any now-dead exports left behind by the deletions — check `_constants/constants.ts`, `member-leaves.type.ts` and the generated client for references to the removed approve/reject/execute operations
- [x] T050 Run `npx tsc --noEmit` and `npm run lint` at repo root — both must pass with no new warnings
- [x] T051 Work through [quickstart.md](./quickstart.md) gates 0–7 and record the result
- [x] T052 Work through [checklists/parity.md](./checklists/parity.md) gate 8 — tick all 116 active items, **reading each item rather than diffing against V0**, since PAR006, PAR014, PAR015, PAR027, PAR078, PAR084, PAR107 and PAR134 deliberately depart from the mockup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**; T015 (client regen) is the hard gate
- **User Stories (Phases 3–5)**: all depend on Phase 2
- **Polish (Phase 6)**: depends on all three stories

### User Story Dependencies

- **US1 (P1)**: independent after Phase 2 — the MVP
- **US2 (P1)**: independent after Phase 2 — shares no files with US1
- **US3 (P2)**: independent in behaviour, but **shares two files** with US1 and US2 (`leaves-table-columns.tsx` with US1 via T042, `leave-status-action.tsx` with US2 via T043/T044). Sequence US3 after both, or coordinate edits.

### Within Phase 2 (strictly sequential)

T003 → T004 → T005 → T006 → T007 (same file) → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015

### Parallel Opportunities

- **Phase 1**: T002 is [P]
- **Phase 2**: none — the schema tasks share one file and the routes depend on it
- **US1**: T016 is [P]; T017–T028 largely touch distinct files but T019/T025/T026/T027 all edit `page.tsx`, so run those sequentially
- **US2**: T029 and T030 are [P] (two brand-new files); the rest edit `page.tsx` or `leave-detail-info.tsx`
- **US3**: T040 and T041 are [P] (two brand-new files); T042–T046 edit existing shared files
- **Phase 6**: T047 and T048 are [P]

### Parallel Example: User Story 2

```bash
# Two brand-new components, no shared files:
Task: "T029 Create src/components/common/suspension-history-strip.tsx"
Task: "T030 Create src/app/(private)/members/leaves/[id]/_components/leave-member-headup.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2 tasks
2. Phase 2 Foundational → 13 tasks (**critical — blocks everything**)
3. Phase 3 US1 → 13 tasks
4. **STOP and VALIDATE**: quickstart gates 1–4 against the real screen
5. Demoable: the list reads, filters, sorts and pages correctly under every role and scope

### Incremental Delivery

1. Setup + Foundational → data layer ready
2. - US1 → **MVP**, list works
3. - US2 → detail reads fully
4. - US3 → the one mutation A-03 owns
5. - Polish → quickstart and parity sweeps

### Parallel Team Strategy

After Phase 2, Developer A takes US1 and Developer B takes US2 — they share no files. US3 lands last because it edits files both stories touch.

---

## Parity Coverage

All **116** active parity items are claimed. Retired items (PAR007, PAR016, PAR029, PAR052–PAR066, PAR080) are intentionally unclaimed — they were removed by clarifications Q-11 and Q-12.

| Range                                       | Claimed by |
| ------------------------------------------- | ---------- |
| PAR001–PAR005                               | T018, T019 |
| PAR006, PAR008–PAR010                       | T020       |
| PAR011–PAR015, PAR017                       | T021       |
| PAR018–PAR019                               | T017       |
| PAR020–PAR023                               | T022       |
| PAR024–PAR028, PAR030–PAR031, PAR033–PAR037 | T023       |
| PAR025–PAR026                               | T025       |
| PAR032                                      | T024       |
| PAR038–PAR040                               | T026       |
| PAR041–PAR046                               | T040, T042 |
| PAR047–PAR051                               | T041       |
| PAR067–PAR074                               | T027       |
| PAR075–PAR079                               | T031       |
| PAR081–PAR086                               | T030       |
| PAR082a                                     | T033       |
| PAR087–PAR088                               | T032       |
| PAR089–PAR095                               | T034       |
| PAR096–PAR102                               | T035       |
| PAR103–PAR105                               | T036       |
| PAR106–PAR110                               | T037       |
| PAR111–PAR122                               | T029       |
| PAR123                                      | T038       |
| PAR124–PAR127, PAR132                       | T039       |
| PAR128                                      | T043       |
| PAR129–PAR131                               | T044       |
| PAR133–PAR134                               | T045       |

---

## Notes

- `[P]` = different files, no dependencies on incomplete tasks
- `[Story]` maps a task to its user story for traceability
- UI tasks cite their V0 source range and the parity items they satisfy — that pointer is ground truth, and it is what keeps the built screen matching the mockup
- **No test tasks exist and none may be added** (Constitution → No Testing Policy)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- **Known gap, not a defect**: A-03 L144's current-step timeline highlight is deliberately unimplemented (Q-03, deferred pending a UI treatment). T035 preserves the 2/3-step shape on purpose. Do not raise it as a bug; do raise it before sign-off against A-03.
