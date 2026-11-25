---
description: 'Task list for Sales Management (F-01)'
---

# Tasks: Sales Management (F-01)

**Input**: Design documents from `/specs/015-sales-management/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: No automated test suite in this project (constitution's No Testing Policy). Verification
is TypeScript strict compilation, ESLint, and manual acceptance-scenario walkthroughs — no test
tasks are generated. See Phase 6 for the manual verification tasks.

**Organization**: Tasks are grouped by user story (US1, US2, US3) per `spec.md` priorities (US1: P1,
US2: P1, US3: P3), preceded by Setup and Foundational phases shared by all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to US1 / US2 / US3
- File paths are exact and repo-relative

---

## Phase 1: Setup

**Purpose**: Additive, dependency-free scaffolding that every later phase can build on without
waiting for the mock table or schemas.

- [x] T001 [P] Add `src/app/api/_mock-db/assets/placeholder-receipt.pdf` (minimal static PDF byte
      buffer, checked into the repo) per [research.md](research.md) §5
- [x] T002 [P] Add `src/app/api/_lib/pdf.ts` exporting `pdfFileResponse(buffer, filename)`, cloned
      from `src/app/api/_lib/csv.ts`'s `csvFileResponse` but with `Content-Type: application/pdf`
- [x] T003 [P] Add `Sales*` entries to the `Permission` enum in `src/types/permission.type.ts`:
      `SalesView`, `SalesConfirm`, `SalesRefundInitiate`, `SalesLineItemAdd`, `SalesFeeAdjust`,
      `SalesManualRegister`, `SalesExport` (per [data-model.md](data-model.md) "New Permission enum
      entries")
- [x] T004 Wire the new `Sales*` permissions into `ROLE_PERMISSIONS` in
      `src/constants/permission.constants.ts` per the Sales Action Permissions matrix in
      [data-model.md](data-model.md) (System/Headquarter/Manager: all seven; Staff: `SalesView`,
      `SalesRefundInitiate`, `SalesLineItemAdd`, `SalesFeeAdjust`, `SalesManualRegister` — NOT
      `SalesConfirm`/`SalesExport`; Trainer/Observer: none) — depends on T003
- [x] T005 Add `/sales`, `/sales/[id]`, `/sales/register` → `Permission.SalesView` entries to
      `PAGE_PERMISSIONS` (same file as `ROLE_PERMISSIONS`, per data-model.md) — depends on T003

**Checkpoint**: Permission constants and the PDF response helper exist independently of the mock
table; Phase 2 can start immediately (does not block on this phase, but T004/T005 need T003 first).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema/table/permission-helper layer every route handler in every user story
reads or writes. No user-story route or page can be built before this phase completes.

**⚠️ CRITICAL**: No user story work (Phase 3+) can begin until this phase is complete.

- [x] T006 Add `src/app/api/_schemas/billing.schema.ts` with all Sales Management schemas per
      [data-model.md](data-model.md): `BillingRecordSchema`, `BillingRecordListItemSchema`,
      `BillingLineItemSchema`, `FeeAdjustmentSchema`, `RefundRequestSchema`, `BillingSummarySchema`,
      `GetBillingRecordsQuerySchema`, `ConfirmBillingRecordsRequestSchema`,
      `ToggleConfirmationRequestSchema`, `AddLineItemRequestSchema`,
      `ApplyFeeAdjustmentRequestSchema`, `SubmitRefundRequestSchema`,
      `SubmitBulkRefundRequestSchema`, `ManualBillingRegistrationRequestSchema`,
      `ExportBillingRecordsRequestSchema`, `StoreMembersResponseSchema`
- [x] T007 Register every schema added in T006 in `src/app/api/_scripts/register-schemas.ts` —
      depends on T006
- [x] T008 Add `src/app/api/_mock-db/types/billing.type.ts` (`BillingType` row shapes extending the
      T006 schemas with internal `_`-prefixed bookkeeping fields, per the
      `instructors.type.ts`/`transfer.table.ts` convention) — depends on T006
- [x] T009 Add `src/app/api/_mock-db/tables/billing.table.ts` implementing `createBillingTables(getDb)`
      with `_rows`/`_seeded`/`_seed()` for `billingRecords`, `billingLineItems`, `feeAdjustments`,
      `refundRequests`, plus methods `getList`, `getById`, `getSummary`, `hasOutstandingBalance`,
      `confirmMany`, `toggleConfirmation`, `addLineItem`, `applyFeeAdjustment`, `createRefundRequest`,
      `createBulkRefundRequests`, `createManualRegistration`, `getStoreMembers`; seed from existing
      `members`/`stores` mock data so `member_name`/`store_name` denormalize correctly, and seed a
      mix of confirmed/unconfirmed, paid/unpaid, at least one bad-debt row, and both `sbps` and
      `jaccs` payment-method rows (per [quickstart.md](quickstart.md) step 1) — depends on T008
- [x] T010 Wire `createBillingTables` into `src/app/api/_mock-db/_create-db.ts` and the `Db` type in
      `src/app/api/_mock-db/_db.types.ts` — depends on T009
- [x] T011 [P] Add `src/lib/utils/sales-permissions.ts` exporting `resolveSalesDataScope(role,
context)` and `canPerformSalesAction(role, action, context)` per the signatures in
      [data-model.md](data-model.md), modeled on `src/lib/utils/instructor-permissions.ts`, including
      the delegated-Staff-confirmation check against `staff_permissions` (research.md §3) — depends
      on T004

**Checkpoint**: Schemas, mock table, and permission helper all exist and compile — every user
story's route handlers can now be implemented.

---

## Phase 3: User Story 1 - Monitor sales and confirm billings from the list (Priority: P1) 🎯 MVP

**Goal**: Store/month-scoped summary + searchable/filterable billing list with bulk confirm and
list-level simplified refund, CSV export, and role/data-scope enforcement.

**Independent Test**: Open the Sales Management list for the current month, verify the five
summary figures match the underlying records, filter/search for a specific billing record, select
unconfirmed records and bulk-confirm them, verify status changes; verify Trainer/Observer access
is denied.

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement `GET /api/crm/billing-records` (list) in
      `src/app/api/crm/billing-records/route.ts` per
      [contracts/list-billing-records.md](contracts/list-billing-records.md) — data-scope
      narrowing via `resolveSalesDataScope`, then `store_id`/`billing_month`/`billing_type`/
      `confirmation_status`/`unpaid_only`/`search`/sort/pagination, `403` for Trainer/Observer
- [x] T013 [P] [US1] Implement `GET /api/crm/billing-records/summary` in
      `src/app/api/crm/billing-records/summary/route.ts` per
      [contracts/list-billing-records.md](contracts/list-billing-records.md) — same data-scope +
      `billing_month` narrowing, independent of list's search/type/status filters
- [x] T014 [US1] Implement `PATCH /api/crm/billing-records/confirm` (bulk confirm) in
      `src/app/api/crm/billing-records/confirm/route.ts` per
      [contracts/billing-mutations.md](contracts/billing-mutations.md) #1 — skip already-confirmed
      rows silently, `400` when zero eligible rows selected, `canPerformSalesAction(role,
'confirm', ...)` gate — depends on T009, T011
- [x] T015 [US1] Implement `POST /api/crm/billing-records/refund-requests/bulk` (list-level
      simplified refund) in `src/app/api/crm/billing-records/refund-requests/bulk/route.ts` per
      [contracts/billing-mutations.md](contracts/billing-mutations.md) #6 — `reason_code` +
      `detail` required, one `type: 'full'` `RefundRequest` per selected record with independently
      derived `handling` — depends on T009, T011
- [x] T016 [US1] Implement `POST /api/crm/billing-records/export` (accounting CSV export) in
      `src/app/api/crm/billing-records/export/route.ts` per
      [contracts/accounting-export.md](contracts/accounting-export.md), cloned from
      `src/app/api/crm/training-equipment/export/route.ts`'s `buildCsv`/`csvFileResponse` pattern —
      `entry_type` enum (`sales`/`payment`/`refund`/`expense`/`bad_debt`/`all`), `403` gated on
      `Permission.SalesExport` (Headquarters/Manager/System only) — depends on T009, T011
- [x] T017 [P] [US1] Build `src/app/(private)/sales/_components/sales-summary.tsx` (KPI-card row:
      total sales, total payments, total outstanding, total refunds, confirmed/unconfirmed/
      bad-debt counts), modeled on `family-registrations-summary.tsx`
- [x] T018 [P] [US1] Build `src/app/(private)/sales/_components/sales-filters.tsx` (`nuqs`-backed
      store/billing-type/confirmation-status/unpaid-only filters + free-text search)
- [x] T019 [US1] Build `src/app/(private)/sales/_components/sales-list-section.tsx` (`DataTable`
      with `RowSelectionState`-driven bulk toolbar: bulk confirm action, bulk simplified-refund
      trigger) — depends on T017, T018
- [x] T020 [P] [US1] Build `src/app/(private)/sales/_components/sales-bulk-refund-dialog.tsx`
      (reason-code select + free-text detail, submits T015's endpoint)
- [x] T021 [P] [US1] Build `src/app/(private)/sales/_components/sales-csv-export-button.tsx`,
      modeled on `training-equipment-csv-export-button.tsx` (own `<Suspense>`, `useMutation` with
      `parseAs: 'blob'`, `downloadCsv`), gated by `RoleGatedButton` + `Permission.SalesExport`
- [x] T022 [US1] Build `src/app/(private)/sales/page.tsx` composing T017 (summary), T019 (filtered/
      selectable list + bulk toolbar), T020, T021 as a `'use client'`, `<Suspense>`-wrapped page —
      depends on T012, T013, T017, T018, T019, T020, T021
- [x] T023 [US1] Run `npm run generate-routes` to register the new `/sales` route segment — depends
      on T022

**Checkpoint**: User Story 1 is fully functional and independently testable — list, summary, bulk
confirm, list-level refund, CSV export, role/scope gating.

---

## Phase 4: User Story 2 - Review and operate on a single billing record (Priority: P1)

**Goal**: Billing detail page — line items, fee adjustments, refund requests, confirm/unconfirm
toggle, receipt/invoice download, all gated by confirmation status and role.

**Independent Test**: Open a billing record's detail page, add a line item, apply a fee
adjustment with a reason, submit a refund request with a reason, confirm/unconfirm the record;
verify blocked actions (receipt download for unpaid items, edits on confirmed records) are
disabled.

### Implementation for User Story 2

- [x] T024 [US2] Implement `GET /api/crm/billing-records/{id}` (detail) in
      `src/app/api/crm/billing-records/[id]/route.ts` per
      [contracts/billing-detail.md](contracts/billing-detail.md) — `404` (not `403`) when the
      record exists outside the caller's data scope, `fee_adjustments`/`refund_requests` returned
      newest-first — depends on T009, T011
- [x] T025 [US2] Implement `PATCH /api/crm/billing-records/{id}/confirmation` (single toggle) in
      `src/app/api/crm/billing-records/[id]/confirmation/route.ts` per
      [contracts/billing-mutations.md](contracts/billing-mutations.md) #2 — records `confirmed_by`/
      `confirmed_at` (or clears them) in both directions — depends on T009, T011
- [x] T026 [P] [US2] Implement `POST /api/crm/billing-records/{id}/line-items` in
      `src/app/api/crm/billing-records/[id]/line-items/route.ts` per
      [contracts/billing-mutations.md](contracts/billing-mutations.md) #3 — `409` when record is
      confirmed, `400` when `source: 'manual'` lacks `reason`, `422` when
      `hasOutstandingBalance(member_id)` for a chargeable item, recomputes parent
      `billed_amount`/`outstanding_amount` — depends on T009, T011
- [x] T027 [P] [US2] Implement `POST /api/crm/billing-records/{id}/fee-adjustments` in
      `src/app/api/crm/billing-records/[id]/fee-adjustments/route.ts` per
      [contracts/billing-mutations.md](contracts/billing-mutations.md) #4 — `400` missing `reason`,
      `409` on confirmed record, server-computed `original_amount`/`resulting_amount`, appends an
      immutable history row — depends on T009, T011
- [x] T028 [P] [US2] Implement `POST /api/crm/billing-records/{id}/refund-requests` in
      `src/app/api/crm/billing-records/[id]/refund-requests/route.ts` per
      [contracts/billing-mutations.md](contracts/billing-mutations.md) #5 — `400` missing `reason`,
      `422` partial amount exceeding line-item amount, `handling` derived from `payment_method`,
      `reversal_window_expired` computed for `sbps` past 90 days — depends on T009, T011
- [x] T029 [P] [US2] Implement `GET /api/crm/billing-records/{id}/line-items/{lineItemId}/receipt`
      in `src/app/api/crm/billing-records/[id]/line-items/[lineItemId]/receipt/route.ts` per
      [contracts/billing-mutations.md](contracts/billing-mutations.md) #7 — `409` when
      `payment_status !== 'confirmed'`, else `200` PDF via T002's `pdfFileResponse` — depends on
      T002, T009, T011
- [x] T030 [P] [US2] Implement `GET /api/crm/billing-records/{id}/invoice` in
      `src/app/api/crm/billing-records/[id]/invoice/route.ts` per
      [contracts/billing-mutations.md](contracts/billing-mutations.md) #7 — no payment-status gate,
      `200` PDF via T002's `pdfFileResponse` — depends on T002, T009, T011
- [x] T031 [P] [US2] Build `src/app/(private)/sales/[id]/_components/billing-basic-info-card.tsx`
      (billing ID, date, store, member, billing type, payment method, notes)
- [x] T032 [P] [US2] Build
      `src/app/(private)/sales/[id]/_components/billing-confirmation-status-card.tsx`, modeled on
      `instructor-status-card.tsx` (icon + badge + `RoleGatedButton` toggle mutation calling T025)
- [x] T033 [P] [US2] Build `src/app/(private)/sales/[id]/_components/billing-line-items-card.tsx`
      (line items table with per-item `payment_status` badge and receipt-download button disabled
      unless `payment_status === 'confirmed'`, calling T029)
- [x] T034 [P] [US2] Build `src/app/(private)/sales/[id]/_components/billing-add-line-item-dialog.tsx`
      (from-contract or manual entry with required reason for manual, disabled when
      `confirmation_status === 'confirmed'`, calling T026)
- [x] T035 [P] [US2] Build `src/app/(private)/sales/[id]/_components/billing-fee-adjustment-dialog.tsx`
      (pattern select + value + required reason, disabled when confirmed, calling T027)
- [x] T036 [P] [US2] Build `src/app/(private)/sales/[id]/_components/billing-refund-request-dialog.tsx`
      (full/partial toggle, per-line-item amount caps, required reason, payment-method-aware
      copy — SBPS auto-reversal-within-90-days vs. JACCS manual/CASHPOST explanation, 90-day-expired
      warning, calling T028)
- [x] T037 [P] [US2] Build `src/app/(private)/sales/[id]/_components/billing-history-tab.tsx`
      (fee-adjustment + refund-request history, newest-first, modeled on the
      `BrandChangeHistoryItemSchema` history-tab convention)
- [x] T038 [P] [US2] Build `src/app/(private)/sales/[id]/_components/billing-detail-skeleton.tsx`
- [x] T039 [US2] Build `src/app/(private)/sales/[id]/page.tsx` composing T031-T038 in a two-column
      layout (`min-w-0 flex-1` main + `w-[360px] shrink-0` sidebar), modeled on
      `studios/[id]/page.tsx`, including an invoice-download button (calling T030) — depends on
      T024, T031, T032, T033, T034, T035, T036, T037, T038
- [x] T040 [US2] Run `npm run generate-routes` to register the new `/sales/[id]` route segment —
      depends on T039

**Checkpoint**: User Stories 1 AND 2 both work independently — full list + detail flows.

---

## Phase 5: User Story 3 - Manually register a new billing record (Priority: P3)

**Goal**: Manual/ad-hoc billing registration screen — store → member cascading picker, live
line-item builder, outstanding-balance block, dual submit (unconfirmed / confirmed-with-dialog).

**Independent Test**: Open the manual registration screen, pick a store, pick a member without
outstanding balance, add a line item, submit; verify the record appears in the list. Repeat with a
member who has an outstanding balance and verify registration is blocked.

### Implementation for User Story 3

- [x] T041 [US3] Implement `GET /api/crm/stores/{storeId}/members` in
      `src/app/api/crm/stores/[storeId]/members/route.ts` per
      [contracts/manual-registration.md](contracts/manual-registration.md) #1 — thin `{ id, name,
has_unpaid }` list scoped to the store (check first whether an equivalent store-scoped member
      lookup already exists under `src/app/api/crm/members/` or `src/app/api/crm/stores/` before
      adding a duplicate) — depends on T009, T011
- [x] T042 [US3] Implement `POST /api/crm/billing-records/manual` in
      `src/app/api/crm/billing-records/manual/route.ts` per
      [contracts/manual-registration.md](contracts/manual-registration.md) #2 — `400` missing
      `billing_month` or empty `line_items`, `400` on `member_id`/`store_id` cross-mismatch, `422`
      when `hasOutstandingBalance(member_id)`, `403` when submitting `confirmation_status:
'confirmed'` without `canPerformSalesAction(role, 'confirm', ...)`, each manual line item
      requires `reason` — depends on T009, T011
- [x] T043 [P] [US3] Build `src/app/(private)/sales/_components/store-member-picker.tsx` (Store →
      Member cascading `Select`/`Combobox`, member field disabled+empty until `store_id` chosen,
      options from T041 keyed on watched `store_id`), generalizing the `resetField`-on-change
      pattern from `enrollment-form.tsx`'s `handleBrandChange`
- [x] T044 [P] [US3] Build
      `src/app/(private)/sales/_components/manual-registration-form/manual-registration-line-items.tsx`
      (always-visible line-item builder card + table; "明細追加"/table empty-state "add" both
      disabled with guard text 「先に利用者を選択してください。」 until `member_id` is set; the
      add-line-item dialog's contract picker shows the same guard text when the member's contract
      list is empty, per research.md §4)
- [x] T045 [P] [US3] Build
      `src/app/(private)/sales/_components/manual-registration-form/manual-registration-confirm-dialog.tsx`
      (summarizes store, member, billing date, applicable month, line-item count, tax-included
      total; only rendered by the "確定状態で登録" action)
- [x] T046 [US3] Build
      `src/app/(private)/sales/_components/manual-registration-form/manual-registration-form.tsx`
      composing T043 (store/member), T044 (line items), a billing-month field, and two submit
      controls ("登録" → immediate `confirmation_status: 'unconfirmed'` submit; "確定状態で登録" →
      opens T045 then submits `confirmation_status: 'confirmed'`), both gated by the shared
      `canSubmit` check (member selected, no outstanding-balance block, ≥1 line item, month set),
      modeled on `instructor-form.tsx`'s section-per-`Card` pattern, calling T042 — depends on T043,
      T044, T045
- [x] T047 [US3] Build `src/app/(private)/sales/register/page.tsx` rendering T046, redirecting to
      `/sales` on successful submit — depends on T041, T046
- [x] T048 [US3] Run `npm run generate-routes` to register the new `/sales/register` route segment —
      depends on T047

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Codegen, production-build validation, and full acceptance-scenario verification
across all three stories.

- [x] T049 Run `npm run generate-openapi` then `npm run generate-api` to refresh the OpenAPI spec
      and hey-api client from all Sales Management schemas/routes — depends on T012-T016, T024-T030,
      T041-T042
- [x] T050 [P] Run `npm run lint` and `npm run type-check` and fix any violations across all new
      Sales Management files — depends on T049
- [x] T051 Run `npm run build` to validate production compilation — depends on T050
- [x] T052 Walk every acceptance scenario in [spec.md](spec.md) User Stories 1-3 manually against
      the running app, including the role/data-scope matrix (System/HQ/Manager/Staff/Trainer/
      Observer) on list, detail, and every mutation, the delegated-Staff-confirmation edge case, and
      SC-004/SC-005 (100% reason-required and outstanding-balance-block enforcement) via direct
      blocked-path attempts, not just the happy path — depends on T051; see
      [quickstart.md](quickstart.md) step 7

**Checkpoint**: Feature complete, builds cleanly, and every spec.md acceptance scenario has been
manually verified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001/T002/T003 start immediately in parallel; T004/T005
  depend on T003
- **Foundational (Phase 2)**: T006 has no dependency on Phase 1 and can start in parallel with it;
  T011 depends on T004 (Phase 1). **BLOCKS all user stories (Phase 3-5)**
- **User Stories (Phase 3-5)**: All depend on Foundational (Phase 2) completion; independently
  implementable/testable thereafter (US1 and US2 can run in parallel; US3 can run in parallel with
  both, though it is lowest priority)
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Phase 2 — no dependency on US2 or US3
- **User Story 2 (P1)**: Depends only on Phase 2 — no dependency on US1 or US3 (its detail route
  is independent of the list route)
- **User Story 3 (P3)**: Depends only on Phase 2 — no dependency on US1 or US2, though its "appears
  in the Sales Management list" verification step benefits from US1's list page existing

### Within Each User Story

- Route handlers before the UI components that call them
- Dialogs/cards before the page that composes them
- `npm run generate-routes` after a story's `page.tsx` file(s) are added, at the end of that story

### Parallel Opportunities

- T001, T002, T003 (Phase 1) run in parallel
- T011 (Phase 2) runs in parallel with T006-T010 once T004 is done
- Within US1: T012, T013 in parallel; T017, T018, T020, T021 in parallel
- Within US2: T026-T030 (five independent mutation/download routes) in parallel; T031-T038 (eight
  independent detail-page components) in parallel
- Within US3: T043, T044, T045 in parallel
- Across stories: once Phase 2 is complete, US1/US2/US3 implementation can proceed fully in
  parallel by different developers

---

## Parallel Example: User Story 2

```bash
# Launch all five independent mutation/download routes together:
Task: "Implement POST .../line-items in src/app/api/crm/billing-records/[id]/line-items/route.ts"
Task: "Implement POST .../fee-adjustments in src/app/api/crm/billing-records/[id]/fee-adjustments/route.ts"
Task: "Implement POST .../refund-requests in src/app/api/crm/billing-records/[id]/refund-requests/route.ts"
Task: "Implement GET .../receipt in src/app/api/crm/billing-records/[id]/line-items/[lineItemId]/receipt/route.ts"
Task: "Implement GET .../invoice in src/app/api/crm/billing-records/[id]/invoice/route.ts"

# Launch all eight independent detail-page components together:
Task: "Build billing-basic-info-card.tsx"
Task: "Build billing-confirmation-status-card.tsx"
Task: "Build billing-line-items-card.tsx"
Task: "Build billing-add-line-item-dialog.tsx"
Task: "Build billing-fee-adjustment-dialog.tsx"
Task: "Build billing-refund-request-dialog.tsx"
Task: "Build billing-history-tab.tsx"
Task: "Build billing-detail-skeleton.tsx"
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
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Complete Phase 6 (codegen, build, full scenario walkthrough)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (list)
   - Developer B: User Story 2 (detail)
   - Developer C: User Story 3 (manual registration)
3. Stories complete and integrate independently; Phase 6 runs once all three land

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks: this project has no automated test suite (constitution's No Testing Policy) —
  contract "Contract Tests (minimum)" sections are covered by Phase 6's manual scenario walkthrough
  instead
- Every mutation route must independently re-check confirmation-status/outstanding-balance/role
  server-side per the Constraints in [plan.md](plan.md) — do not rely on client-side gating alone
- `outstanding_amount` is always server-recomputed on amount-affecting mutations — never accept it
  from the request body
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
