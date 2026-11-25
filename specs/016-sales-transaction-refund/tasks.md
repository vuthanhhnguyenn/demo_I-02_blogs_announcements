---
description: 'Task list for Sales Transaction History, Receivables, and Refund Management (F-01-01/02/03)'
---

# Tasks: Sales Transaction History, Receivables, and Refund Management (F-01-01/02/03)

**Input**: Design documents from `/specs/016-sales-transaction-refund/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No automated test suite in this project (constitution's No Testing Policy). Verification
is TypeScript strict compilation, ESLint, and manual acceptance-scenario walkthroughs — no test
tasks are generated. See Phase 7 for the manual verification task.

**Organization**: Tasks are grouped by user story (US1-US4) per `spec.md` priorities (US1: P1, US2:
P1, US3: P1, US4: P2), preceded by Setup and Foundational phases shared by all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to US1 / US2 / US3 / US4
- File paths are exact and repo-relative

---

## Phase 1: Setup

**Purpose**: Additive, dependency-free scaffolding that every later phase can build on without
waiting for the mock table or schemas.

- [x] T001 [P] Add new `Permission` enum entries to `src/types/permission.type.ts`:
      `SalesTransactionsView`, `SalesReceivablesView`, `SalesBadDebtExclude`,
      `SalesConvenienceIssue`, `SalesUpcomingBillingConfirm`, `SalesRefundApprove`,
      `SalesRefundExport` (per [data-model.md](data-model.md) "Permission additions")
- [x] T002 Wire the new permissions into `ROLE_PERMISSIONS` in
      `src/constants/permission.constants.ts` per the permission table in
      [data-model.md](data-model.md) (System: all; Headquarter/Manager:
      `SalesTransactionsView`/`SalesReceivablesView`/`SalesBadDebtExclude`/
      `SalesConvenienceIssue`/`SalesUpcomingBillingConfirm`/`SalesRefundApprove`/
      `SalesRefundExport`; Staff: `SalesTransactionsView`/`SalesReceivablesView`/
      `SalesConvenienceIssue`/`SalesUpcomingBillingConfirm` (delegated only, no static grant needed
      beyond the permission existing) — NOT `SalesBadDebtExclude`/`SalesRefundApprove`/
      `SalesRefundExport`; Trainer/Observer: none) — depends on T001
- [x] T003 Verify/add `/sales/transactions` → `Permission.SalesTransactionsView`,
      `/sales/receivables` → `Permission.SalesReceivablesView`, `/sales/refunds` →
      `Permission.SalesRefundApprove`-gated view (or a view-level permission if the route should be
      visible to Staff too — confirm against `SalesReceivablesView`/`SalesTransactionsView`
      precedent: all four roles below Trainer/Observer can _view_ the refund queue per FR-014, only
      approval is gated — use a view permission, not `SalesRefundApprove`, for the page-level entry
      in `PAGE_PERMISSIONS`, same file as T002) — depends on T001
- [x] T004 [P] Add `src/lib/utils/refund-approval.ts` exporting `canApproveRefund(currentRole,
requesterRole)` and `requiredApproverLabel(requesterRole)` per research.md §5 — System always
      approves; Headquarter approves Staff/Manager requests; Manager approves Staff requests only;
      Staff/Trainer/Observer never approve — mirrors `pages/sales-refund-list.tsx`'s prototyped
      client-side logic exactly (self-contained role-string union types, no dependency on T005's
      schema work)

**Checkpoint**: Permission constants and the refund-approval rule exist independently of the mock
table; Phase 2 can start immediately in parallel with this phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema/table/seed layer every route handler in every user story reads or writes.
No user-story route or page can be built before this phase completes.

**⚠️ CRITICAL**: No user story work (Phase 3+) can begin until this phase is complete.

- [x] T005 Extend `src/app/api/_schemas/billing.schema.ts` per [data-model.md](data-model.md) and
      [contracts/](contracts/): add `bad_debt_excluded`, `bad_debt_exclusion_reason`,
      `bad_debt_excluded_by`, `bad_debt_excluded_at`, `receivable_status` to
      `BillingRecordSchema`; add `requester_role`, `approver_id`, `approver_name`,
      `approver_role`, `approved_at` to `RefundRequestSchema`; add `RefundRequesterRoleSchema`,
      `ReceivableStatusSchema` enums; add `TransactionRecordSchema`,
      `GetTransactionLedgerQuerySchema`, `ExportTransactionLedgerRequestSchema` (per
      [contracts/transaction-ledger.md](contracts/transaction-ledger.md)); add
      `UnpaidReceivableSchema`, `UnpaidLineItemSchema`, `GetUnpaidReceivablesQuerySchema`,
      `IssueConveniencePaymentRequestSchema`, `BadDebtExclusionRequestSchema` (per
      [contracts/receivables.md](contracts/receivables.md)); add `UpcomingBillingEntrySchema`,
      `GetUpcomingBillingResponseSchema` (per
      [contracts/upcoming-billing.md](contracts/upcoming-billing.md)); add
      `RefundQueueEntrySchema`, `GetRefundQueueQuerySchema`, `RefundDecisionRequestSchema`,
      `BulkRefundDecisionRequestSchema`, `ExportRefundQueueRequestSchema` (per
      [contracts/refund-approval.md](contracts/refund-approval.md))
- [x] T006 Register every schema added in T005 in `src/app/api/_scripts/register-schemas.ts` —
      depends on T005
- [x] T007 Extend `src/app/api/_mock-db/types/billing.type.ts` (`BillingRecordsType` interface):
      add method signatures `getTransactionLedger`, `getUnpaidReceivables`, `getUnpaidDetail`,
      `issueConveniencePayment`, `setBadDebtExclusion`, `getUpcomingBilling`, `getRefundQueue`,
      `decideRefundRequest`, `decideBulkRefundRequests` per [data-model.md](data-model.md) —
      depends on T005
- [x] T008 Extend `src/app/api/_mock-db/tables/billing.table.ts`'s seed step: default
      `bad_debt_excluded: false`/`receivable_status` (computed from existing
      `outstanding_amount`/`is_bad_debt`) on every seeded `BillingRecord`; add `requester_role`
      (covering all three of `staff`/`manager`/`headquarter`) to every seeded `RefundRequest`,
      leaving `approver_*`/`approved_at` `null` for still-`pending` ones and populated for
      `completed`/`rejected` ones; add a next-calendar-month batch of
      `confirmation_status: 'unconfirmed'` records, some flagged with a rolled-over unpaid amount
      (per research.md §8, so `getUpcomingBilling` has realistic "with_unpaid_rollover" data) —
      depends on T007

**Checkpoint**: Schemas, mock-DB type signatures, and seed data all exist and compile — every user
story's table methods and route handlers can now be implemented.

---

## Phase 3: User Story 1 - Resolve unpaid receivables before they become bad debt (Priority: P1) 🎯 MVP

**Goal**: Unpaid-balances tab (未回収一覧) of the receivables screen — list, per-member unpaid
detail, convenience-payment issuance, bad-debt exclusion/release.

**Independent Test**: Open the receivables screen, verify the unpaid list and its month filter,
open a member's unpaid-detail panel and verify JACCS-subrogation flags, issue a convenience-payment
link, mark/release a bad-debt exclusion with a required reason; verify Staff cannot access the
bad-debt-exclusion action.

### Implementation for User Story 1

- [x] T009 [US1] Implement `getUnpaidReceivables`, `getUnpaidDetail`, `issueConveniencePayment`,
      `setBadDebtExclusion` methods in `src/app/api/_mock-db/tables/billing.table.ts` per
      [contracts/receivables.md](contracts/receivables.md) and [data-model.md](data-model.md)'s
      Unpaid Receivable/Unpaid Line Item derivation rules (JACCS subrogation eligibility computed
      from the 3-most-recent-unpaid-months rule, not stored) — depends on T008
- [x] T010 [P] [US1] Implement `GET /api/crm/billing-records/receivables` in
      `src/app/api/crm/billing-records/receivables/route.ts` per
      [contracts/receivables.md](contracts/receivables.md) #1 — `resolveSalesDataScope` narrowing,
      `unpaid_month` filter, `403` for Trainer/Observer — depends on T009
- [x] T011 [P] [US1] Implement `GET /api/crm/billing-records/receivables/{memberId}` in
      `src/app/api/crm/billing-records/receivables/[memberId]/route.ts` per
      [contracts/receivables.md](contracts/receivables.md) #2 — `404` when the member has no
      in-scope outstanding records — depends on T009
- [x] T012 [P] [US1] Implement `POST /api/crm/billing-records/receivables/convenience-payment` in
      `src/app/api/crm/billing-records/receivables/convenience-payment/route.ts` per
      [contracts/receivables.md](contracts/receivables.md) #3 — gated on
      `Permission.SalesConvenienceIssue`, no reason required, `line_item_ids` omitted = full
      balance — depends on T009
- [x] T013 [P] [US1] Implement `POST /api/crm/billing-records/receivables/bad-debt-exclusion` in
      `src/app/api/crm/billing-records/receivables/bad-debt-exclusion/route.ts` per
      [contracts/receivables.md](contracts/receivables.md) #4 — gated on
      `Permission.SalesBadDebtExclude` (`403` for Staff regardless of store scope), `400` when
      `reason` is empty (both `exclude` and `release` actions) — depends on T009
- [x] T014 [P] [US1] Build `src/app/(private)/sales/receivables/_components/unpaid-table.tsx`
      (`nuqs`-backed unpaid-month filter, columns per
      [contracts/receivables.md](contracts/receivables.md) #1, row click opens the detail sheet)
- [x] T015 [P] [US1] Build
      `src/app/(private)/sales/receivables/_components/unpaid-detail-sheet.tsx`, modeled on
      `src/app/(private)/lockers/[id]/_components/slot-detail-sheet.tsx` (480px `Sheet`, unpaid
      line-item table with JACCS-subrogation badge, footer actions triggering T016/T017)
- [x] T016 [P] [US1] Build
      `src/app/(private)/sales/receivables/_components/convenience-payment-dialog.tsx` (single
      line-item or full-balance issuance, calling T012)
- [x] T017 [P] [US1] Build
      `src/app/(private)/sales/receivables/_components/bad-debt-exclusion-dialog.tsx` (required
      `Textarea` reason, exclude/release mode switch, calling T013,
      `RoleGatedButton`/`RoleGatedMenuItem` gated on `Permission.SalesBadDebtExclude`)
- [x] T018 [US1] Build `src/app/(private)/sales/receivables/page.tsx`: replace the "Construction"
      placeholder with a `Tabs` shell (未回収一覧 / 翌月請求予定 — the second tab's content is added
      in Phase 4) composing T014-T017 and T010-T013 for the 未回収一覧 tab — depends on T010, T011,
      T012, T013, T014, T015, T016, T017

**Checkpoint**: User Story 1 is fully functional and independently testable — unpaid list, detail,
convenience payment, bad-debt exclusion, role/scope gating all work even before US2's second tab
exists.

---

## Phase 4: User Story 2 - Confirm next month's billing batch before it locks (Priority: P1)

**Goal**: Upcoming-billing tab (翌月請求予定) of the receivables screen — SBPS/JACCS summary,
per-member table, bulk confirm reusing the existing confirm endpoint.

**Independent Test**: Open the receivables screen's upcoming-billing tab, verify the SBPS/JACCS
summary cards and rollover-labeled rows, run the bulk-confirm action and verify the confirmation
dialog's split and that entries clear afterward; verify an undelegated Staff session sees the
confirm control disabled.

### Implementation for User Story 2

- [x] T019 [US2] Implement `getUpcomingBilling` method in
      `src/app/api/_mock-db/tables/billing.table.ts` per
      [contracts/upcoming-billing.md](contracts/upcoming-billing.md) #1 and
      [data-model.md](data-model.md)'s Upcoming Billing Entry derivation, including the
      full-in-scope-set `summary` block (not just the current page) — depends on T008 (touches the
      same file as T009; sequence after T009 to avoid a merge conflict)
- [x] T020 [US2] Implement `GET /api/crm/billing-records/upcoming-billing` in
      `src/app/api/crm/billing-records/upcoming-billing/route.ts` per
      [contracts/upcoming-billing.md](contracts/upcoming-billing.md) #1 — depends on T019
- [x] T021 [P] [US2] Build
      `src/app/(private)/sales/receivables/_components/upcoming-billing-summary-cards.tsx`
      (total/SBPS/JACCS amount+count cards, per [data-model.md](data-model.md)'s `summary` shape)
- [x] T022 [P] [US2] Build
      `src/app/(private)/sales/receivables/_components/upcoming-billing-table.tsx` (billing-type
      badge distinguishing standard/rollover/ad-hoc, rollover note column)
- [x] T023 [P] [US2] Build
      `src/app/(private)/sales/receivables/_components/upcoming-billing-confirm-dialog.tsx`
      (summarizes count/total/SBPS-JACCS split before calling the **existing**
      `PATCH /api/crm/billing-records/confirm` endpoint with the listed ids, per
      [contracts/upcoming-billing.md](contracts/upcoming-billing.md) #2; gated by
      `RoleGatedButton` on `canPerformSalesAction(role, 'confirm', { hasDelegatedConfirmPermission })`)
- [x] T024 [US2] Extend `src/app/(private)/sales/receivables/page.tsx` (from T018) to add the
      翌月請求予定 `TabsContent` composing T021-T023, T020 — depends on T018, T020, T021, T022, T023

**Checkpoint**: User Stories 1 AND 2 both work independently on the shared receivables page — the
unpaid tab from US1 is unaffected by adding the upcoming-billing tab.

---

## Phase 5: User Story 3 - Approve or reject pending refund requests (Priority: P1)

**Goal**: Refund approval queue (返金手続き一覧) — list with pending banner, hierarchical
approve/reject (single and bulk) with a required confirmation step, refund CSV export.

**Independent Test**: Open the refund list, verify the pending banner; attempt to approve a
Staff-submitted request as a Staff user (blocked) and as a Manager (allowed via the confirmation
dialog, executing the refund immediately); bulk-approve a mixed-authority selection and verify the
excluded count; export the refund CSV and verify SBPS rows are absent.

### Implementation for User Story 3

- [x] T025 [US3] Implement `getRefundQueue`, `decideRefundRequest`, `decideBulkRefundRequests`
      methods in `src/app/api/_mock-db/tables/billing.table.ts` per
      [contracts/refund-approval.md](contracts/refund-approval.md) and
      [data-model.md](data-model.md)'s Refund Queue entry derivation and `RefundRequest` state
      transitions (approve always writes `status: 'completed'` directly, never leaves `'approved'`
      per FR-017) — depends on T008 (touches the same file as T009/T019; sequence after T019)
- [x] T026 [P] [US3] Implement `GET /api/crm/billing-records/refund-requests` in
      `src/app/api/crm/billing-records/refund-requests/route.ts` per
      [contracts/refund-approval.md](contracts/refund-approval.md) #1 — filters, sort, pagination,
      full-in-scope `pending_summary` block — depends on T025
- [x] T027 [P] [US3] Implement `POST /api/crm/billing-records/refund-requests/{id}/decision` in
      `src/app/api/crm/billing-records/refund-requests/[id]/decision/route.ts` per
      [contracts/refund-approval.md](contracts/refund-approval.md) #2 — `409` if not `pending`,
      `403` with `requiredApproverLabel(...)`-derived message when
      `canApproveRefund(MOCK_ROLE, request.requester_role)` is false (T004) — depends on T025, T004
- [x] T028 [P] [US3] Implement `POST /api/crm/billing-records/refund-requests/bulk-decision` in
      `src/app/api/crm/billing-records/refund-requests/bulk-decision/route.ts` per
      [contracts/refund-approval.md](contracts/refund-approval.md) #3 — excludes
      unauthorized/non-pending ids from processing rather than failing the whole batch, `400` when
      zero ids are decidable — depends on T025, T004
- [x] T029 [P] [US3] Implement `POST /api/crm/billing-records/refund-requests/export` in
      `src/app/api/crm/billing-records/refund-requests/export/route.ts` per
      [contracts/refund-approval.md](contracts/refund-approval.md) #4 — gated on
      `Permission.SalesRefundExport`, hard-filters `payment_method !== 'sbps'` and
      `status === 'completed'` regardless of request-body filters, via
      `buildCsv`/`csvFileResponse`/`csvDateStamp` — depends on T025
- [x] T030 [P] [US3] Build `src/app/(private)/sales/refunds/_components/refund-pending-banner.tsx`
      (pending count + combined amount, per FR-014)
- [x] T031 [P] [US3] Build `src/app/(private)/sales/refunds/_components/refund-queue-table.tsx`
      (filters/sort per [contracts/refund-approval.md](contracts/refund-approval.md) #1,
      row-selection for bulk actions, requester-role Badge)
- [x] T032 [P] [US3] Build `src/app/(private)/sales/refunds/_components/refund-detail-sheet.tsx`,
      modeled on `slot-detail-sheet.tsx` (refund/requester/approval info sections, approve/reject
      buttons gated by `canApproveRefund`)
- [x] T033 [P] [US3] Build `src/app/(private)/sales/refunds/_components/refund-decision-dialog.tsx`
      (`AlertDialog` confirmation step for single or bulk approve/reject, payment-method-aware
      execution copy on approve, per FR-019, calling T027/T028)
- [x] T034 [P] [US3] Build `src/app/(private)/sales/refunds/_components/refund-bulk-action-bar.tsx`
      (selected-count + approvable-count + excluded-count messaging, triggers T033 in bulk mode)
- [x] T035 [P] [US3] Build
      `src/app/(private)/sales/refunds/_components/refund-csv-export-button.tsx`, modeled on
      `sales-csv-export-button.tsx`, gated by `RoleGatedButton` + `Permission.SalesRefundExport`,
      calling T029
- [x] T036 [US3] Build `src/app/(private)/sales/refunds/page.tsx`: replace the "Construction"
      placeholder composing T030-T035, T026 — depends on T026, T027, T028, T029, T030, T031, T032,
      T033, T034, T035

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - Reconcile historical transactions (Priority: P2)

**Goal**: Transaction ledger (入出金明細) — searchable/filterable history with CSV export and
refund-initiation entry point reusing the existing single-record refund-creation endpoint.

**Independent Test**: Open the transaction list, search/filter, export CSV and verify the filter
description matches, open a confirmed "sale" row's refund dialog and submit a partial refund
(verify it lands in the US3 refund queue as `pending`); verify a canceled row's refund action is
disabled.

### Implementation for User Story 4

- [x] T037 [US4] Implement `getTransactionLedger` method in
      `src/app/api/_mock-db/tables/billing.table.ts` per
      [contracts/transaction-ledger.md](contracts/transaction-ledger.md) #1 and
      [data-model.md](data-model.md)'s Transaction Record derivation (`sale`/`payment`/`refund`/
      `repayment` row emission per line item/payment/completed refund) — depends on T008 (touches
      the same file as T009/T019/T025; sequence after T025)
- [x] T038 [P] [US4] Implement `GET /api/crm/billing-records/transactions` in
      `src/app/api/crm/billing-records/transactions/route.ts` per
      [contracts/transaction-ledger.md](contracts/transaction-ledger.md) #1 — depends on T037
- [x] T039 [P] [US4] Implement `POST /api/crm/billing-records/transactions/export` in
      `src/app/api/crm/billing-records/transactions/export/route.ts` per
      [contracts/transaction-ledger.md](contracts/transaction-ledger.md) #2 — depends on T037
- [x] T040 [P] [US4] Build
      `src/app/(private)/sales/transactions/_components/transactions-filters.tsx` (`nuqs`-backed
      date-range/store/type/payment-method filters + free-text search, active-filter banner +
      clear-all)
- [x] T041 [P] [US4] Build
      `src/app/(private)/sales/transactions/_components/transactions-table.tsx` (columns per
      [contracts/transaction-ledger.md](contracts/transaction-ledger.md) #1, refund-request action
      disabled for non-`sale`/`canceled` rows with an explanatory tooltip)
- [x] T042 [P] [US4] Build
      `src/app/(private)/sales/transactions/_components/transactions-csv-export-button.tsx`,
      modeled on `sales-csv-export-button.tsx`, calling T039 with the active filter state
- [x] T043 [P] [US4] Build
      `src/app/(private)/sales/transactions/_components/transaction-refund-request-dialog.tsx`
      (full/partial toggle, per-line-item amount cap, required reason, payment-method-aware copy —
      reuses the **existing** `POST /api/crm/billing-records/{id}/refund-requests` endpoint from
      015, per [contracts/transaction-ledger.md](contracts/transaction-ledger.md) #3)
- [x] T044 [US4] Build `src/app/(private)/sales/transactions/page.tsx`: replace the "Construction"
      placeholder composing T040-T043, T038 — depends on T038, T040, T041, T042, T043

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Codegen, production-build validation, and full acceptance-scenario verification
across all four stories.

- [x] T045 Run `npm run generate-routes` to verify/register the three filled-in page bodies (the
      route segments already existed as placeholders — this confirms no route metadata drifted) —
      depends on T018, T024, T036, T044
- [x] T046 Run `npm run generate-openapi` then `npm run generate-api` to refresh the OpenAPI spec
      and hey-api client from all new/extended schemas and routes — depends on T005-T044
- [x] T047 [P] Run `npm run lint` and `npm run type-check` and fix any violations across all new
      and extended files — depends on T046
- [x] T048 Run `npm run build` to validate production compilation — depends on T047
- [x] T049 Walk every acceptance scenario in [spec.md](spec.md) User Stories 1-4 manually against
      the running app, including the role/permission matrix (System/HQ/Manager/Staff/Trainer/
      Observer) on every list and mutation, the hierarchical refund-approval edge cases (Staff/
      Manager/Headquarter requesters against each approver role), the delegated-Staff
      upcoming-billing-confirm edge case, and SC-004/SC-005/SC-006 (100% confirmation-step,
      hierarchical-authority, and reason-required enforcement) via direct blocked-path attempts,
      not just the happy path — depends on T048; see [quickstart.md](quickstart.md)'s per-story
      walkthrough

**Checkpoint**: Feature complete, builds cleanly, and every spec.md acceptance scenario has been
manually verified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001/T004 start immediately in parallel; T002/T003 depend
  on T001
- **Foundational (Phase 2)**: T005 has no dependency on Phase 1 and can start in parallel with it;
  depends only on itself sequentially (T005 → T006/T007 → T008). **BLOCKS all user stories
  (Phase 3-6)**
- **User Stories (Phase 3-6)**: All depend on Foundational (Phase 2) completion; independently
  implementable/testable thereafter with one caveat below (shared files)
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Phase 2 — no dependency on US2/US3/US4
- **User Story 2 (P1)**: Depends on Phase 2 **and** on US1's T018 (both tabs live in the same
  `receivables/page.tsx`) — otherwise independent of US3/US4. US1's unpaid tab is fully functional
  and testable before US2's tab is added.
- **User Story 3 (P1)**: Depends only on Phase 2 — no dependency on US1/US2/US4
- **User Story 4 (P2)**: Depends only on Phase 2 — no dependency on US1/US2/US3, though its refund
  dialog produces a request that US3's queue then displays (useful for end-to-end verification, not
  a build-order requirement)

**Shared-file note**: `src/app/api/_mock-db/tables/billing.table.ts` is edited by one task in each
of T009 (US1), T019 (US2), T025 (US3), and T037 (US4). These four tasks are **not parallelizable
with each other** (same file) — they are sequenced in story-priority order (T009 → T019 → T025 →
T037) regardless of which developer/session implements each story, to avoid merge conflicts. Within
each story, the tasks that depend on that story's table-method task (routes, then UI) proceed
normally per that story's own parallel opportunities below.

### Within Each User Story

- Table-method task before route handlers before UI components
- Dialogs/cards before the page that composes them
- Story complete before its checkpoint is declared

### Parallel Opportunities

- T001, T004 (Phase 1) run in parallel
- T006, T007 (Phase 2) both depend on T005 but not on each other — cannot literally run in parallel
  since T007 also depends on T005 completing first; treat as sequential within Phase 2
- Within US1: T010-T013 (four independent routes) in parallel once T009 lands; T014-T017 (four
  independent components) in parallel
- Within US2: T021-T023 (three independent components) in parallel once schemas exist
- Within US3: T026-T029 (four independent routes) in parallel once T025 lands; T030-T035 (six
  independent components) in parallel
- Within US4: T038-T039 (two independent routes) in parallel once T037 lands; T040-T043 (four
  independent components) in parallel
- Across stories: once Phase 2 is complete, US1/US3/US4 implementation can proceed fully in parallel
  by different developers (US2 needs US1's T018 first for its shared page file)

---

## Parallel Example: User Story 3

```bash
# Launch all four independent refund-queue routes together (after T025):
Task: "Implement GET .../refund-requests in src/app/api/crm/billing-records/refund-requests/route.ts"
Task: "Implement POST .../{id}/decision in src/app/api/crm/billing-records/refund-requests/[id]/decision/route.ts"
Task: "Implement POST .../bulk-decision in src/app/api/crm/billing-records/refund-requests/bulk-decision/route.ts"
Task: "Implement POST .../export in src/app/api/crm/billing-records/refund-requests/export/route.ts"

# Launch all six independent refund-queue UI components together:
Task: "Build refund-pending-banner.tsx"
Task: "Build refund-queue-table.tsx"
Task: "Build refund-detail-sheet.tsx"
Task: "Build refund-decision-dialog.tsx"
Task: "Build refund-bulk-action-bar.tsx"
Task: "Build refund-csv-export-button.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently against its acceptance scenarios
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently (both receivables tabs together) → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Complete Phase 7 (codegen, build, full scenario walkthrough)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1, then User Story 2 (shares the receivables page)
   - Developer B: User Story 3 (refund queue)
   - Developer C: User Story 4 (transaction ledger)
3. Coordinate on `billing.table.ts` edits per the shared-file note above (T009 → T019 → T025 → T037
   ordering) even when developers work in parallel on everything else
4. Stories complete and integrate independently; Phase 7 runs once all four land

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks: this project has no automated test suite (constitution's No Testing Policy) —
  contract behaviors are covered by Phase 7's manual scenario walkthrough instead
- Every mutation route must independently re-check role/permission/hierarchical-approval/
  reason-required rules server-side per the Constraints in [plan.md](plan.md) — do not rely on
  client-side `RoleGatedButton`/`RoleGatedMenuItem` gating alone
- `receivable_status` and refund `approver_*`/`approved_at` fields are always server-set — never
  accepted from the request body
- Refund creation (US4's dialog) and upcoming-billing bulk confirm (US2) call **existing** 015
  endpoints — do not create new routes for those two actions
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts (see the `billing.table.ts` shared-file note), cross-story
  dependencies that break independence beyond the one documented US1/US2 shared-page exception
