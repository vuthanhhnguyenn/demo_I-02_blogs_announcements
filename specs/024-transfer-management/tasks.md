---
description: 'Task list for 024-transfer-management (A-02 移籍管理)'
---

# Tasks: Transfer Management Update (A-02)

> **Superseded (2026-10-05)**: this document describes the mock-API implementation round (prototype @ 1cc2d6d, 2026-07-18). The screen now runs on the real API-091 (`/admin/transfer-applications`, commit 4fe1f967) and the prototype @ 47423ec — free-word search, the 申請中 status, the 200-row page size and the 却下 wording are gone. Current behavior: [spec.md](spec.md) › _Prototype Alignment_ and [checklists/parity.md](checklists/parity.md). Kept as a historical record.

**Input**: Design documents from `/specs/024-transfer-management/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/transfers-api.md](./contracts/transfers-api.md), [quickstart.md](./quickstart.md), [checklists/parity.md](./checklists/parity.md)

**Organization**: Tasks are grouped by user story so each story is independently demonstrable. Phase→workstream mapping: Phase 2 = WS1 + WS2, Phase 3 = WS3, Phase 4 = WS4, Phase 5 = WS5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: `[US1]`/`[US2]`/`[US3]` — maps to the spec's user stories. Setup, Foundational and Polish carry no story label.
- UI tasks cite their V0 source range and the `PAR###` items they satisfy.

## Path Conventions

Next.js App Router web app. Route-local code lives under `src/app/(private)/members/transfers/**`; mock API under `src/app/api/**`; shared primitives under `src/components/**`.

## ⚠️ No test tasks

The constitution's **No Testing Policy is absolute** — this list contains no unit/integration/e2e test tasks and no test-framework setup. QA for this feature is: `npx tsc --noEmit` + `npm run lint` + manual verification against [quickstart.md](./quickstart.md) + the [parity checklist](./checklists/parity.md) + code review.

## V0 source

Parity line numbers were recorded against `dx-fitness/fitness-crm-ui @ 1cc2d6d` (2026-07-18). The local cache tracks `origin/main`, which has since moved on — read the V0 **at the recorded hash**:

```bash
git -C .cache/fitness-crm-ui show 1cc2d6d:src/pages/transfer-list.tsx   > "$SCRATCHPAD/transfer-list.tsx"
git -C .cache/fitness-crm-ui show 1cc2d6d:src/pages/transfer-detail.tsx > "$SCRATCHPAD/transfer-detail.tsx"
```

Task citations below write `transfer-list.tsx` / `transfer-detail.tsx` as shorthand for those two files.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pin the V0 ground truth and record the pre-change baseline. This is a brownfield update — there is no project scaffolding to create.

- [x] T001 Extract both V0 files at hash `1cc2d6d` into the scratchpad using the commands above, and confirm the parity line ranges resolve (e.g. `transfer-list.tsx:458-462` is the page header, `transfer-detail.tsx:116-171` are the two timeline builders)
- [x] T002 Record the pre-change baseline: `npx tsc --noEmit` and `npm run lint` must both be clean **before** any edit, so every new diagnostic in T016 is attributable to this change
- [x] T003 [P] Inventory the blast radius: `grep -rn "'approved'\|\"approved\"" src/ --include=*.ts --include=*.tsx` and `grep -rn "getCurrentUserRole\|decodeJWT" src/app/\(private\)/members/transfers/` — save both lists to the scratchpad as the T016 / T020 worklists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contract + data model (WS1) and authorization (WS2). Nothing in Phase 3–5 can be built against types that do not exist yet, and no UI gating can be written before the permissions exist.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### WS1 — Contract & data model

- [x] T004 Update `src/app/api/_schemas/transfer.schema.ts`: remap `TransferStatus` (add `from_store_pending`, **remove** `approved`, keep `pending`/`from_store_approved`/`completed`/`rejected`), add `ExclusionReasonSchema` (`unpaid`, `campaign_lock`), and add `auto_transfer_eligible`, `exclusion_reasons`, `unpaid_amount`, `campaign_lock_remaining_days` to `TransferRequestSchema` per data-model.md
- [x] T005 Extend `TransferDetailSchema` in `src/app/api/_schemas/transfer.schema.ts` with `unpaid_period`, `decisions`, `unlock`, and add the two new object schemas `TransferDecisionSchema` (action/comment/actor_name/actor_role/store_type/decided_at) and `TransferUnlockSchema` (reason non-empty after trim / operator_name / unlocked_at), both capped at `TEXTAREA_MAX_LENGTH`
- [x] T006 Update `GetTransfersQuerySchema` in `src/app/api/_schemas/transfer.schema.ts`: change `limit` default `20` → `25`, add `store_id` (matches either side) and `auto_transfer` (`'eligible' | 'excluded'`) per contracts/transfers-api.md §1
- [x] T007 Add `BulkApproveTransfersBodySchema` (`transfer_ids` min 1 / max 200, optional `comment` max 1000) and `UnlockTransferBodySchema` (`reason` required, non-empty after trim, max 1000) to `src/app/api/_schemas/transfer.schema.ts`
- [x] T008 Register every new/changed schema in `src/app/api/_scripts/register-schemas.ts` (depends on T004-T007)
- [x] T009 Declare `POST /api/crm/transfers/bulk-approve` and `PATCH /api/crm/transfers/{id}/unlock` in the OpenAPI route registry `src/app/api/_routes/index.ts` (depends on T008)
- [x] T010 Regenerate the API client so `src/lib/api/types.gen.ts` and `src/lib/api/@tanstack/react-query.gen.ts` pick up the new enum, fields and endpoints — **regeneration only, never hand-edit `src/lib/api/**`\*\* (depends on T009)
- [x] T011 [P] Mirror the schema changes in the mock-db row type at `src/app/api/_mock-db/types/transfers.type.ts` (statuses, eligibility fields, `decisions`, `unlock`, `unpaid_period`)
- [x] T012 Add a single brand-aware approval-history builder in `src/app/api/_mock-db/tables/transfer.table.ts` — JOYFIT 3 steps (申請 → 移籍元承認 `store_type:'from'` → システム自動移籍実行 `is_automatic:true`), FIT365 4 steps (申請 → 移籍元承認 `'from'` → 移籍先承認 `'to'` → 移籍実行) — and use it from **both** `create()` and the seed, replacing the hardcoded FIT365-shaped 3-step history at `transfer.table.ts:59-87` (research.md D11.2)
- [x] T013 Rewrite the transition logic in `src/app/api/_mock-db/tables/transfer.table.ts` per the data-model.md state machine: `approve()` marks the current `approval_history` step complete with `completed_by`, appends a `TransferDecision` (**persisting the comment** currently discarded at `transfer.table.ts:93,126`), and routes JOYFIT `from_store_pending` → `completed` while FIT365 goes `from_store_pending` → `from_store_approved` → `completed`; `reject()` appends its decision and updates `approval_history` instead of only touching `status`/`updated_at`; terminal states are rejected
- [x] T014 Implement the `completed` side effect in `src/app/api/_mock-db/tables/transfer.table.ts`: update the member's primary-contract store to `to_store_id` (FR-010/FR-011). **This is the transfer's whole purpose and is currently never performed** — no code path reaches `completed` today
- [x] T015 Add `unlock()` to `src/app/api/_mock-db/tables/transfer.table.ts`: write the `TransferUnlock` audit record and clear only the `campaign_lock` blocker, leaving a co-present `unpaid` exclusion in force (contracts §6.3)
- [x] T016 Update `src/app/api/_mock-db/seeds/transfer.seed.ts` (TR-001…TR-014): remap `approved` → `completed`, move a subset of `pending` → `from_store_pending` so all five statuses appear, set `auto_transfer_eligible: null` on every FIT365 row, and cover the JOYFIT fixtures — at least one eligible, one `unpaid` (with `unpaid_amount` + `unpaid_period`), one `campaign_lock` (with `campaign_lock_remaining_days`), one carrying **both** reasons, one with a populated `decisions[]`, and one with an `unlock` record
- [x] T017 Clear the `tsc` gate: run `npx tsc --noEmit` and fix every stale reference surfaced by removing `approved` (worklist from T003) — including deleting the hand-declared status union at `src/app/(private)/members/transfers/[id]/_components/transfer-status-badge.tsx:7` so statuses come only from `types.gen.ts`. **Must exit 0 before Phase 3 begins.**
- [x] T018 [P] Create `src/app/(private)/members/transfers/_constants/constants.ts` with the per-status display metadata from data-model.md — Japanese label, badge class, dot visibility, `StatusCard` tone and icon — following the `MEMBER_STATUS_CLASSES` shape at `src/app/(private)/members/_constants/constants.ts:60-77`. Both screens consume this; do not duplicate the mapping per component

### WS2 — Permissions

- [x] T019 [P] Add `MembersTransfersApprove = 'members.transfers-approve'`, `MembersTransfersBulkApprove = 'members.transfers-bulk-approve'` and `MembersTransfersUnlock = 'members.transfers-unlock'` to the `Permission` enum in `src/types/permission.type.ts`
- [x] T020 Grant the three new permissions in `src/constants/permission.constants.ts` per the A-02 権限マトリクス: approve → System/Headquarter/Manager/Staff; bulk-approve and unlock → System/Headquarter/Manager only. Trainer and Observer receive none of the three (Observer keeps `MembersTransfersView`) (depends on T019)
- [x] T021 Create the pure row-eligibility helper `canActOnTransfer(user, transfer)` in `src/app/(private)/members/transfers/_utils/transfer-permission.util.ts` per the data-model.md pseudo-code (false in terminal states; false without `MembersTransfersApprove`; true for System/Headquarter/Manager; Staff only on their own side at the matching stage), and **delete `getCurrentUserRole()` + the `decodeJWT` fallback at `src/app/(private)/members/transfers/[id]/_components/transfer-status-action.tsx:26-41`** — it silently promotes an unauthenticated viewer to `headquarter` (depends on T019)
- [x] T022 Add auth + store scope to `src/app/api/crm/transfers/route.ts`: `getAuthUserFromRequest` → 401, `getAllowedStoreIds` with the **OR-across-both-sides** predicate (`allowed === null || allowed.includes(from_store_id) || allowed.includes(to_store_id)`), plus the new `store_id` and `auto_transfer` filters, and a `total` that reflects the scoped+filtered count. Model the scope resolver on `src/app/api/crm/entry-exit-logs/history/route.ts:28-48` (depends on T010)
- [x] T023 [P] Add auth + scope to `src/app/api/crm/transfers/[id]/route.ts`: return **404** (not 403) when the row is outside the caller's scope so existence does not leak, and include `unpaid_period`, `decisions`, `unlock` in the response (depends on T010)
- [x] T024 Rewrite `src/app/api/crm/transfers/[id]/approve/route.ts`: auth → 401, `MembersTransfersApprove` + `canActOnTransfer` → 403, out-of-scope → 404, terminal/invalid transition → 400, JOYFIT with `auto_transfer_eligible === false` and no `unlock` → **409**, then delegate to the corrected table transition. The 403 already declared in its OpenAPI metadata (`approve/route.ts:31-34`) is currently unreachable (depends on T013, T021)
- [x] T025 [P] Rewrite `src/app/api/crm/transfers/[id]/reject/route.ts` with the same auth/role/row checks as approve (no 409), persisting the optional comment as a `TransferDecision` (depends on T013, T021)
- [x] T026 Create `src/app/api/crm/transfers/bulk-approve/route.ts`: `MembersTransfersBulkApprove` → 403, validate each id independently (exists, in scope, JOYFIT, `auto_transfer_eligible === true`, approvable state, `canActOnTransfer`) and return `{ approved: string[], failed: Array<{ id, reason }> }` — a partial success must be reported, not thrown away (depends on T013, T021)
- [x] T027 [P] Create `src/app/api/crm/transfers/[id]/unlock/route.ts`: `MembersTransfersUnlock` → 403, empty/whitespace `reason` → 400, no `campaign_lock` exclusion present → **409**, otherwise write the audit record and return the updated detail (depends on T015, T021)
- [x] T028 [P] Update `src/app/api/crm/members/[id]/transfer/route.ts` so created transfers populate the eligibility fields from `member.constraints` (research.md D13) and build `approval_history` with the T012 brand-aware builder; leave the existing pre-flight 409s (`inCancellationPeriod`, `hasUnpaidFee`) untouched (research.md D14) (depends on T012)

**Checkpoint**: `npx tsc --noEmit` exits 0, all six endpoints authenticate and scope, and quickstart §A passes end-to-end (including the direct-API-call checks). User story work can now begin.

---

## Phase 3: User Story 1 — Review and filter transfer requests (Priority: P1) 🎯 MVP

**Goal**: The list screen matches A-02 and the V0: correct column set and order, six working filters, store-scoped rows, page-size selector, filter banner, proper empty state, and row → detail navigation.

**Independent Test**: quickstart §B and §C — load `/members/transfers` as Headquarter, confirm the eleven columns in order, apply each filter individually and combined, confirm the banner and pagination counts agree, reload to confirm nuqs state survives, then click a row through to detail. As Manager/Staff, confirm rows narrow to their stores.

### Implementation for User Story 1

- [x] T029 [US1] Extend the URL filter state in `src/app/(private)/members/transfers/_hooks/use-transfer-filters.ts`: add `auto_transfer`, `store_id` and `pageSize` nuqs params, reset `page` to 1 whenever any filter/search/pageSize changes, and expose an `activeFilterCount` plus a joined `filterSummary` for the banner
- [x] T030 [US1] Thread the new filter values through `src/app/(private)/members/transfers/_contexts/transfer-filters-context.tsx` and its consumer hook (depends on T029)
- [x] T031 [US1] Rewrite `src/app/(private)/members/transfers/_components/transfer-filters.tsx` — six controls in V0 order (ステータス / 移籍元 / 移籍先 / ブランド / 申請日 / 自動移籍), store options sourced from the store API instead of the hardcoded 8-store array and limited to accessible stores, the search input, the 詳細フィルター toggle with its active-count badge and chevron/label flip, and the active-filter highlight; **fix the `'all '` trailing-space comparison at `transfer-filters.tsx:133` that makes the 移籍元店舗 "all" option never clear the filter** — port from `transfer-list.tsx` › filter row (L472-L588, active-state helper L273-L277); satisfies PAR002-PAR010 (depends on T030)
- [x] T032 [US1] [P] Rewrite the status badge in `src/app/(private)/members/transfers/[id]/_components/transfer-status-badge.tsx` to read labels/classes from `_constants/constants.ts` (no hand-declared union): outline badge + colored dot for 申請中(info) / 移籍元承認待ち(warning) / 移籍先承認待ち(warning) / 否認(destructive), plain `secondary` badge with **no** dot for 完了 — port from `transfer-list.tsx` › status badge helper (L183-L210); satisfies PAR031 (depends on T018)
- [x] T033 [US1] Rewrite `src/app/(private)/members/transfers/_components/transfer-table-columns.tsx` with the V0 column set and order — checkbox, 会員ID (monospace/muted), 会員名 (medium), ブランド (`BrandBadge`), 移籍元店舗, 移籍先店舗, 申請日 (muted), 移籍予定日, 自動移籍可否, ステータス, row-action — with a sticky header, and a row-action `MoreHorizontal` menu rendered only for 申請中/移籍元承認待ち/移籍先承認待ち rows containing `RoleGatedMenuItem` 承認 (`CheckCircle`) and 否認 (`XCircle`, destructive) separated by a divider, hiding the trigger when every item is denied. Leave the 自動移籍可否 cell and the checkbox cell as placeholders for T045/T046, and memoize the columns array so the sort tooltip does not blink on refetch — port from `transfer-list.tsx` › table header + row cells (L624-L646, L706-L714, L719-L757); satisfies PAR016, PAR018, PAR021-PAR027, PAR032 (depends on T032)
- [x] T034 [US1] Migrate `src/app/(private)/members/transfers/page.tsx` to the current list spine: `PageHeader` with the live result count passed through its **`badge`** prop (this repo's `PageHeader` has no `count`/`outside` prop — plan.md Complexity Tracking) replacing the hand-rolled `h1`, then `Card` → filters → `FilterResultBanner` → `DataTable` → `TablePaginationWithSize` (25/50/100/200, summary `全 N 件 / M ページ / X-Y を表示`); wire `emptyContent` to `Empty` with the `filtered` variant + 条件をクリア when a filter/search is active and the plain variant otherwise (entity label 移籍), make row click navigate to the detail route via `navigate()` while checkbox/action cells stop propagation, and surface query errors as a `sonner` toast — **do not** wrap `DataTable` in `DataStateBoundary` (`src/components/common/data-state-boundary/index.tsx:28-32`) — port from `transfer-list.tsx` › page header, banner, empty state, row click, pagination footer (L458-L462, L613-L619, L650-L674, L769-L823); satisfies PAR001, PAR015, PAR019, PAR033-PAR037 (depends on T031, T033)

**Checkpoint**: quickstart §B and §C pass; PAR001-PAR010, PAR015, PAR016, PAR018, PAR019, PAR021-PAR027, PAR031-PAR037 are verifiable. User Story 1 is independently demonstrable as the MVP.

---

## Phase 4: User Story 2 — Approve or reject a transfer request (Priority: P2)

**Goal**: The detail screen matches the V0 and the brand-specific approval flow works end to end — 3-step JOYFIT / 4-step FIT365 timeline, shared `StatusCard` with role-gated actions, and approve/reject dialogs (from both the detail screen and the list row menu) whose comments are persisted.

**Independent Test**: quickstart §F and §G (excluding the unlock items) — open a JOYFIT and a FIT365 request, confirm 3 vs 4 timeline steps and the current-step styling, approve the JOYFIT one and confirm it reaches 完了 **and the member's contracted store actually changed**, walk a FIT365 request through both stages, reject another, then reopen a request approved with a comment and confirm the comment was recorded. Also create a transfer from member detail and confirm its timeline is brand-correct.

### Implementation for User Story 2

- [x] T035 [US2] Extract the member head-up card to `src/components/common/member-headup-card.tsx` rendering memberId, oldMemberNo, name, nameKana, memberType, contractName and store name, and **migrate the existing inline copy in `src/app/(private)/members/[id]/page.tsx` onto it in the same change** so no divergent copy survives (Constitution V) — port from `transfer-detail.tsx` › MemberHeadupCard usage (L599-L607); satisfies PAR046
- [x] T036 [US2] Update `src/app/(private)/members/transfers/[id]/page.tsx`: replace `BreadcrumbNav` with `BackLink` labelled 移籍管理に戻る, title `{会員名} さんの移籍申請`, monospace `secondary` request-ID badge, the shared status badge, and the extracted `MemberHeadupCard` below the header; keep `DataStateBoundary` + skeleton on this screen — port from `transfer-detail.tsx` › page header (L557-L578, L599-L607); satisfies PAR041-PAR044 (depends on T032, T035)
- [x] T037 [US2] [P] Reorder the fields in `src/app/(private)/members/transfers/[id]/_components/transfer-detail-info.tsx` to the exact V0 sequence: 申請ID (mono), 移籍先店舗, 移籍理由 (full-width row), 移籍希望日, ブランド (`BrandBadge`), 申請者 (name + role), 申請日時 — port from `transfer-detail.tsx` › 移籍情報 card (L376-L415); satisfies PAR051
- [x] T038 [US2] Update `src/app/(private)/members/transfers/[id]/_components/transfer-approval-flow.tsx`: card header with the brand-flow badge (自動移籍 for JOYFIT / 手動移籍（2段階承認） for FIT365) and the matching explanatory note, step indicator (filled success circle + `Check` when completed, info circle + `Bot` when the pending step `is_automatic`, muted circle + `Clock` otherwise), success-colored connector when the step above is complete, and step content with label (muted when incomplete), optional 移籍元/移籍先 badge, optional 自動実行 badge and description sub-line; verify it renders exactly 3 steps for JOYFIT and 4 for FIT365 from the T012 builder — port from `transfer-detail.tsx` › ApprovalFlow (L418-L485) and the step builders (L116-L139 JOYFIT, L141-L171 FIT365); satisfies PAR052-PAR058 (depends on T012)
- [x] T039 [US2] Replace the hand-rolled card in `src/app/(private)/members/transfers/[id]/_components/transfer-status-action.tsx` with the shared `StatusCard` (`src/components/common/status-card.tsx:18` — `{tone, icon, label, meta, action}`): tone/icon per `_constants/constants.ts`, meta lines 申請日 and 最終更新 plus the extra 移籍先店舗の承認待ちです line only for FIT365 at 移籍先承認待ち, and an action slot rendered only while the status is pending containing a `RoleGatedButton` 承認 (label becomes 移籍先として承認 for FIT365 at 移籍先承認待ち) and an outline destructive `RoleGatedButton` 却下, both gated on `MembersTransfersApprove` + `canActOnTransfer` with the deny tooltips 移籍承認の権限がありません / 移籍却下の権限がありません — port from `transfer-detail.tsx` › status card (L210-L228, L497-L529); satisfies PAR059-PAR061 (depends on T018, T021)
- [x] T040 [US2] [P] Update the detail dialogs `src/app/(private)/members/transfers/[id]/_components/transfer-approve-dialog.tsx` (title 移籍申請を承認しますか？, description `{name} さんの {fromStore} から {toStore} への移籍を承認します。`) and `transfer-reject-dialog.tsx` (title 移籍申請を却下しますか？, description `{name} さんの移籍申請を却下します。この操作は取り消せません。`, destructive 却下する), both with an optional コメント textarea carrying `OptionalMark` and `maxLength={TEXTAREA_MAX_LENGTH}` — port from `transfer-detail.tsx` › approve/reject dialogs (L619-L646, L649-L676); satisfies PAR062, PAR063
- [x] T041 [US2] Wire the list-side single approve/reject dialogs opened from the row-action menu in `src/app/(private)/members/transfers/page.tsx`: 承認確認 with the brand-conditional description (JOYFIT → auto-execute note; FIT365 at 移籍元承認待ち → destination-approval-requested note; otherwise → transfer-executes note) and 否認確認 stating the applicant is notified and the case closed, each with an optional comment textarea (否認 placeholder 否認理由を入力してください（任意）) and a success toast on confirm — port from `transfer-list.tsx` › approve/reject dialogs (L831-L877, L880-L922); satisfies PAR038, PAR039 (depends on T033, T034)
- [x] T042 [US2] Point the approve/reject mutations at the T024/T025 endpoints from `src/app/(private)/members/transfers/page.tsx` and `src/app/(private)/members/transfers/[id]/page.tsx`, sending the comment in the body, and invalidate both the list and detail queries on success so SC-002 holds without a manual refresh; keep `placeholderData: keepPreviousData` on the list query so the table never blanks (depends on T040, T041)
- [x] T043 [US2] [P] Update `src/app/(private)/members/transfers/[id]/_components/transfer-detail-skeleton.tsx` to match the new detail layout (head-up card + 60/40 two-column body with the sticky right rail) (depends on T036)

**Checkpoint**: quickstart §F and §G (minus unlock) pass; PAR038, PAR039, PAR041-PAR044, PAR046, PAR051-PAR063 are verifiable. User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 — JOYFIT auto-transfer exclusions and bulk approval (Priority: P3)

**Goal**: Eligibility is visible at a glance on both screens, excluded rows cannot be bulk-approved, HQ/Manager can bulk-approve eligible JOYFIT rows in one action, and a campaign lock can be manually overridden with a required reason.

**Independent Test**: quickstart §D, §E and the §G unlock items — confirm FIT365 rows show `—` while JOYFIT rows show 自動可 or stacked exclusion badges with the amount/remaining-days tooltips (including the both-reasons row); confirm excluded checkboxes are disabled and FIT365 rows have none; select several eligible rows and bulk-approve; craft a bulk request mixing an excluded and a FIT365 id and confirm both land in `failed[]`; unlock a campaign-locked request and confirm the required-reason gating, the alert swap, and that a co-present unpaid exclusion keeps the row blocked.

### Implementation for User Story 3

- [x] T044 [US3] Create `src/app/(private)/members/transfers/_components/transfer-auto-badge.tsx`: `—` for non-JOYFIT or undefined eligibility, a success 自動可 badge when eligible, and stacked exclusion badges otherwise — destructive 除外: 未納あり with a `未納金: ¥{amount}` tooltip and warning 除外: 縛り期間中 with a `残り {n}日` tooltip, both rendered together when both reasons are present — port from `transfer-list.tsx` › auto-transfer cell (L212-L261); satisfies PAR028-PAR030
- [x] T045 [US3] Fill in the 自動移籍可否 column cell in `src/app/(private)/members/transfers/_components/transfer-table-columns.tsx` with `TransferAutoBadge` — port from `transfer-list.tsx` › row cell (L716-L718); satisfies PAR028 (depends on T044)
- [x] T046 [US3] Add row selection to `src/app/(private)/members/transfers/_components/transfer-table-columns.tsx` and the `DataTable` in `page.tsx` following the hand-rolled select-column pattern at `src/app/(private)/members/_components/members-table-columns.tsx:50-74`: header select-all supporting checked/indeterminate/unchecked and disabled when the page has no selectable rows, an interactive checkbox for JOYFIT-eligible rows, a **disabled** checkbox with the tooltip 除外理由のため個別対応が必要です for excluded JOYFIT rows, and a blank cell for FIT365 rows; `enableRowSelection` must return false for anything that is not an eligible JOYFIT row — port from `transfer-list.tsx` › select-all header + row checkbox cell (L627-L636, L676-L704); satisfies PAR017, PAR020 (depends on T044)
- [x] T047 [US3] Create `src/app/(private)/members/transfers/_components/transfer-bulk-approve-bar.tsx`: shown only when ≥1 row is selected, with the `{n}件選択中` label, a 選択解除 ghost button, a vertical divider, and a `RoleGatedButton` 選択した{n}件を一括承認 gated on `MembersTransfersBulkApprove` with the deny tooltip 一括承認はHQ・Manager権限が必要です — port from `transfer-list.tsx` › bulk bar (L595-L608); satisfies PAR011-PAR014 (depends on T019, T046)
- [x] T048 [US3] Create `src/app/(private)/members/transfers/_components/transfer-bulk-approve-dialog.tsx`: title `{n}件のJOYFIT自動移籍を承認しますか？`, a description warning that the store update is immediate and irreversible, an optional comment textarea with `OptionalMark`, and Cancel / 承認する actions; on confirm call the T026 endpoint, clear the selection, refetch, report `approved.length` in the success toast and **surface a non-empty `failed[]` rather than swallowing it** — port from `transfer-list.tsx` › bulk dialog (L925-L963); satisfies PAR040 (depends on T026, T047)
- [x] T049 [US3] [P] Create `src/app/(private)/members/transfers/[id]/_components/transfer-exclusion-alert.tsx` (JOYFIT only) with three states: destructive `AlertTriangle` unpaid alert titled 自動移籍 除外: 未納金あり showing the amount + billing period and a 売上詳細を確認 link to sales-detail; warning `AlertTriangle` campaign-lock alert titled 自動移籍 除外: キャンペーン縛り期間中（解約手数料期間） showing remaining days with a `RoleGatedButton` 管理者権限で手動解除して移籍を通す (deny tooltip 手動解除は管理者権限が必要です); and, once unlocked, a success `Check` alert titled 管理者により手動解除済み showing 解除理由, 実行者 + timestamp and 移籍を進められる状態です。 — port from `transfer-detail.tsx` › exclusion alerts (L260-L311); satisfies PAR047-PAR049 (depends on T019)
- [x] T050 [US3] Create `src/app/(private)/members/transfers/[id]/_components/transfer-unlock-dialog.tsx`: title 解約手数料期間中の移籍を強制実行しますか？, a body warning of irreversibility and a possible member fee, a **required** 解除理由 textarea with `RequiredMark` and the example placeholder, and a destructive 解除して移籍を通す action that stays **disabled until a non-whitespace reason is entered**; on confirm call the T027 endpoint and invalidate the detail query so the locked alert swaps to the unlocked one — port from `transfer-detail.tsx` › unlock dialog (L315-L347); satisfies PAR050 (depends on T027, T049)
- [x] T051 [US3] Mount `TransferExclusionAlert` (and its unlock dialog) between the head-up card and the two-column body in `src/app/(private)/members/transfers/[id]/page.tsx`, and mount `TransferBulkApproveBar` + `TransferBulkApproveDialog` above the table in `src/app/(private)/members/transfers/page.tsx` (depends on T048, T050)

**Checkpoint**: quickstart §D, §E and the §G unlock items pass; PAR011-PAR014, PAR017, PAR020, PAR028-PAR030, PAR040, PAR047-PAR050 are verifiable. All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T052 [P] Tick PAR045 in `specs/024-transfer-management/checklists/parity.md` as **resolved — deliberately not implemented**: the V0's dashed-border デモ切替（ブランド） select (`transfer-detail.tsx:585-596`) is a mockup affordance for previewing both brand flows on one static page. The real screen derives `brand` from the transfer record, so a manual switcher would let a user misrepresent a JOYFIT transfer as FIT365. Confirm no brand-override control shipped; satisfies PAR045
- [x] T053 [P] Cross-cutting cleanup across `src/app/(private)/members/transfers/**`: all dates through `src/utils/date.util.ts` helpers (no inline `format()`), navigation through `navigate()` / `<Link>` (no `router.push()` string literals), no remaining hand-declared status unions (`grep -rn "'pending' | 'from_store_approved'"` finds nothing), and no `decodeJWT`/`getCurrentUserRole` references left (quickstart §H)
- [x] T054 [P] Verify the layout holds at a 768px viewport on `/members/transfers` and `/members/transfers/[id]`, adjusting `src/app/(private)/members/transfers/**` styles if it does not (quickstart §H)
- [x] T055 Run the QA gate: `npx tsc --noEmit` exits 0 and `npm run lint` passes
- [x] T056 Work through [quickstart.md](./quickstart.md) §A-§H against a freshly restarted dev server (the mock DB is a `globalThis` singleton — seed edits from T016 require a **full** restart, not HMR) and tick every item (depends on T055)
- [x] T057 Tick all remaining items in [checklists/parity.md](./checklists/parity.md) (PAR001-PAR063). `/speckit.implement` will refuse to report done while any item is unchecked (depends on T056)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup; **blocks all user stories**. T017 (`tsc` clean) is the hard gate
- **User Story 1 (Phase 3)**: depends on Phase 2 — no dependencies on US2/US3
- **User Story 2 (Phase 4)**: depends on Phase 2. T041 also touches `page.tsx`, so run it after T034 to avoid a merge conflict on that file
- **User Story 3 (Phase 5)**: depends on Phase 2, and shares `transfer-table-columns.tsx` / `page.tsx` with US1 (T045, T046, T051) — sequence after T033/T034
- **Polish (Phase 6)**: depends on all three stories

### Within Phase 2

```
T004 → T005 → T006 → T007 → T008 → T009 → T010 ─┬→ T022, T023
                                                 └→ (types available to all UI)
T011 [P] ─┐
T012 ─────┼→ T013 → T014, T015 → T016 → T017 (GATE: tsc exits 0)
T018 [P] ─┘
T019 → T020, T021 → T024, T025, T026, T027
T012 → T028
```

### File-contention map (do not parallelize these)

| File                                     | Tasks                  |
| ---------------------------------------- | ---------------------- |
| `_schemas/transfer.schema.ts`            | T004, T005, T006, T007 |
| `_mock-db/tables/transfer.table.ts`      | T012, T013, T014, T015 |
| `_components/transfer-table-columns.tsx` | T033, T045, T046       |
| `members/transfers/page.tsx`             | T034, T041, T051       |
| `members/transfers/[id]/page.tsx`        | T036, T051             |

### Parallel Opportunities

- **Setup**: T003 runs alongside T001/T002
- **Phase 2**: T011 and T018 are independent of the schema chain; T019 (permission enum) can start immediately in parallel with T004; once T010 and T021 land, T023, T025, T027 and T028 are all independent files
- **Phase 3**: T032 is independent of T029/T030 and can run in parallel
- **Phase 4**: T035, T037, T040 and T043 touch distinct files and can run in parallel
- **Phase 5**: T044 and T049 are independent new files
- **Phase 6**: T052, T053, T054 are independent
- **Across stories**: once Phase 2 completes, one developer can take US1 (T029-T034) while another takes the US2 detail-only tasks (T035-T040, T043) — they collide only on `page.tsx` (T041)

---

## Parallel Example: Phase 2 Foundational

```bash
# Independent of the schema chain — launch together:
Task: "Mirror schema changes in src/app/api/_mock-db/types/transfers.type.ts"      # T011
Task: "Create src/app/(private)/members/transfers/_constants/constants.ts"          # T018
Task: "Add 3 Permission members to src/types/permission.type.ts"                    # T019

# After T010 (client regenerated) and T021 (canActOnTransfer) — launch together:
Task: "Auth + 404-on-out-of-scope in src/app/api/crm/transfers/[id]/route.ts"        # T023
Task: "Auth + row checks + comment persistence in .../[id]/reject/route.ts"          # T025
Task: "Create src/app/api/crm/transfers/[id]/unlock/route.ts"                        # T027
Task: "Populate eligibility + brand-aware history in .../members/[id]/transfer"      # T028
```

## Parallel Example: User Story 2

```bash
Task: "Extract src/components/common/member-headup-card.tsx and migrate members/[id]/page.tsx"  # T035
Task: "Reorder fields in .../[id]/_components/transfer-detail-info.tsx"                          # T037
Task: "Update detail approve/reject dialogs"                                                     # T040
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup
2. Phase 2 Foundational — **critical**; the `tsc --noEmit` gate at T017 is what makes the status remap safe
3. Phase 3 User Story 1
4. **STOP and VALIDATE**: quickstart §A-§C. The list is store-scoped, correctly columned and filterable — already a security fix over today's fail-open state
5. Demo

### Incremental Delivery

1. Setup + Foundational → the fail-open auth hole is closed and JOYFIT transfers can finally reach 完了
2. - US1 → filterable, scoped, spec-shaped list (MVP)
3. - US2 → approve/reject with a brand-correct timeline and persisted comments
4. - US3 → eligibility visibility, bulk approval, manual override
5. Polish → QA gate + quickstart + parity sign-off

### Parallel Team Strategy

Phase 2 is genuinely shared work — do it together, and land T017 before splitting. After that: Developer A takes US1 (T029-T034), Developer B takes the detail-only half of US2 (T035-T040, T043), Developer C takes the new US3 components (T044, T047-T050). The three integration tasks that touch shared files — T041, T045/T046, T051 — should be sequenced by one owner at the end.

---

## Notes

- **No test tasks** — the constitution's No Testing Policy is absolute. quickstart.md + parity.md are the QA artifacts
- `src/lib/api/**` changes **only** by regeneration (T010). Never hand-edit it
- Seed changes (T016) need a **full dev-server restart** — the mock DB is a `globalThis` singleton and HMR will not reset it
- Two deliberate V0 deviations are recorded in plan.md Complexity Tracking: `PageHeader` takes `badge` rather than the V0's non-existent `count`/`outside` props (T034), and PAR045's demo brand switch is not built (T052)
- research.md Decision 1 carries one open **PO confirmation** item — whether 申請中 and 移籍元承認待ち are genuinely distinct states. Every task above stands either way; if the PO merges them, only T004 and T016 change
- Commit after each task or logical group
