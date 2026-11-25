# Quickstart: F-01 Sales Management

**Goal**: Build and validate the Phase 1 sales management flow (list + summary, detail with
line-item/fee-adjustment/refund operations, manual registration) end-to-end with mock-backed
data, without touching the existing member-detail billing/payment-history endpoints.

---

## Implementation Checklist

- [ ] Add `src/app/api/_schemas/billing.schema.ts`: `BillingRecordSchema`,
      `BillingRecordListItemSchema`, `BillingLineItemSchema`, `FeeAdjustmentSchema`,
      `RefundRequestSchema`, `BillingSummarySchema`, `GetBillingRecordsQuerySchema`,
      `ConfirmBillingRecordsRequestSchema`, `AddLineItemRequestSchema`,
      `ApplyFeeAdjustmentRequestSchema`, `SubmitRefundRequestSchema`,
      `SubmitBulkRefundRequestSchema`, `ManualBillingRegistrationRequestSchema`,
      `ExportBillingRecordsRequestSchema` — per [data-model.md](data-model.md)
- [ ] Register every new schema in `src/app/api/_scripts/register-schemas.ts`
- [ ] Add `src/app/api/_mock-db/types/billing.type.ts` (`BillingType` — `_rows`, `_seeded`,
      `_seed()`, `getList`, `getById`, `getSummary`, `hasOutstandingBalance`, `confirm`,
      `toggleConfirmation`, `addLineItem`, `applyFeeAdjustment`, `createRefundRequest`)
- [ ] Add `src/app/api/_mock-db/tables/billing.table.ts` (`createBillingTables(getDb)` factory,
      seeded from existing member/store mock data so `member_name`/`store_name` denormalize
      correctly), wire into `_create-db.ts` + `_db.types.ts`
- [ ] Add `src/lib/utils/sales-permissions.ts` (`resolveSalesDataScope`,
      `canPerformSalesAction`) modeled on `instructor-permissions.ts`
- [ ] Add `Sales*` entries to `src/types/permission.type.ts` `Permission` enum; wire grants into
      `ROLE_PERMISSIONS` in `src/constants/permission.constants.ts`; add `/sales*` routes to
      `PAGE_PERMISSIONS`
- [ ] Add `src/app/api/_lib/pdf.ts` (`pdfFileResponse`) cloned from `csv.ts`'s
      `csvFileResponse`, plus a checked-in placeholder PDF asset (research.md §5)
- [ ] Add route handlers per [contracts/](contracts/):
      `crm/billing-records/route.ts` (GET list),
      `crm/billing-records/summary/route.ts` (GET),
      `crm/billing-records/[id]/route.ts` (GET detail),
      `crm/billing-records/confirm/route.ts` (PATCH bulk),
      `crm/billing-records/[id]/confirmation/route.ts` (PATCH single toggle),
      `crm/billing-records/[id]/line-items/route.ts` (POST),
      `crm/billing-records/[id]/fee-adjustments/route.ts` (POST),
      `crm/billing-records/[id]/refund-requests/route.ts` (POST),
      `crm/billing-records/refund-requests/bulk/route.ts` (POST),
      `crm/billing-records/[id]/line-items/[lineItemId]/receipt/route.ts` (GET, PDF),
      `crm/billing-records/[id]/invoice/route.ts` (GET, PDF),
      `crm/billing-records/manual/route.ts` (POST),
      `crm/billing-records/export/route.ts` (POST, CSV),
      `crm/stores/[storeId]/members/route.ts` (GET, if not already covered by an existing
      member-search endpoint — check before adding)
- [ ] Build list page `src/app/(private)/sales/page.tsx`: summary KPI-card row (modeled on
      `family-registrations-summary.tsx`) + `DataTable` with `nuqs` filters (store, billing type,
      confirmation status, unpaid-only, search), `RowSelectionState` bulk toolbar (bulk confirm,
      bulk simplified refund dialog), CSV export button (modeled on
      `training-equipment-csv-export-button.tsx`)
- [ ] Build detail page `src/app/(private)/sales/[id]/page.tsx`: two-column layout (basic
      info + line items + history tabs on the left, confirmation status card on the right,
      modeled on `studios/[id]/page.tsx` + `instructor-status-card.tsx`); add-line-item dialog;
      apply-fee-adjustment dialog; refund-request dialog (payment-method-aware copy per FR-011);
      receipt/invoice download buttons (disabled per `payment_status`)
- [ ] Build manual registration page `src/app/(private)/sales/register/page.tsx`: single form
      (Store → Member picker per research.md §4, line items, billing month), confirm-dialog
      submit, outstanding-balance block message
- [ ] Add role-gated action buttons (`RoleGatedButton`) everywhere per the permission matrix in
      `data-model.md`
- [ ] Run `npm run generate-routes` after adding new page route segments
- [ ] Run `npm run generate-openapi` then `npm run generate-api` after finalizing all Zod schemas

---

## Suggested File Targets

```text
src/
├── app/
│   ├── api/
│   │   ├── _lib/
│   │   │   └── pdf.ts                                  # NEW: pdfFileResponse, cloned from csv.ts
│   │   ├── _mock-db/
│   │   │   ├── assets/
│   │   │   │   └── placeholder-receipt.pdf             # NEW: static Phase 1 PDF body
│   │   │   ├── types/
│   │   │   │   └── billing.type.ts                     # NEW
│   │   │   └── tables/
│   │   │       └── billing.table.ts                    # NEW
│   │   ├── _schemas/
│   │   │   └── billing.schema.ts                       # NEW
│   │   └── crm/
│   │       └── billing-records/
│   │           ├── route.ts                            # NEW: GET list
│   │           ├── summary/route.ts                    # NEW: GET
│   │           ├── confirm/route.ts                    # NEW: PATCH bulk
│   │           ├── manual/route.ts                     # NEW: POST
│   │           ├── export/route.ts                     # NEW: POST (CSV)
│   │           ├── refund-requests/
│   │           │   └── bulk/route.ts                   # NEW: POST
│   │           └── [id]/
│   │               ├── route.ts                        # NEW: GET detail
│   │               ├── confirmation/route.ts           # NEW: PATCH single toggle
│   │               ├── line-items/
│   │               │   ├── route.ts                    # NEW: POST
│   │               │   └── [lineItemId]/receipt/route.ts # NEW: GET (PDF)
│   │               ├── fee-adjustments/route.ts        # NEW: POST
│   │               ├── refund-requests/route.ts        # NEW: POST
│   │               └── invoice/route.ts                # NEW: GET (PDF)
│   └── (private)/
│       └── sales/
│           ├── page.tsx                                # NEW: list page
│           ├── register/
│           │   └── page.tsx                            # NEW: manual registration
│           ├── [id]/
│           │   ├── page.tsx                            # NEW: detail page
│           │   └── _components/
│           │       ├── billing-basic-info-card.tsx
│           │       ├── billing-confirmation-status-card.tsx
│           │       ├── billing-line-items-card.tsx
│           │       ├── billing-add-line-item-dialog.tsx
│           │       ├── billing-fee-adjustment-dialog.tsx
│           │       ├── billing-refund-request-dialog.tsx
│           │       ├── billing-history-tab.tsx
│           │       └── billing-detail-skeleton.tsx
│           └── _components/
│               ├── sales-summary.tsx
│               ├── sales-filters.tsx
│               ├── sales-list-section.tsx
│               ├── sales-csv-export-button.tsx
│               ├── sales-bulk-refund-dialog.tsx
│               ├── store-member-picker.tsx
│               └── manual-registration-form/
│                   ├── manual-registration-form.tsx
│                   ├── manual-registration-line-items.tsx
│                   └── manual-registration-confirm-dialog.tsx
└── lib/
    └── utils/
        └── sales-permissions.ts                        # NEW
```

---

## Step-by-Step Flow

1. **Schemas + mock table first**
   - Define `billing.schema.ts` per [data-model.md](data-model.md); register every schema.
   - Build `billing.type.ts` + `billing.table.ts`, seeded from existing `members`/`stores` mock
     data so denormalized `member_name`/`store_name` stay consistent; seed a mix of confirmed/
     unconfirmed, paid/unpaid, and at least one bad-debt and one card-vs-bank-debit record to
     exercise every branch in the contracts.

2. **Permissions**
   - Add `Sales*` permissions + `ROLE_PERMISSIONS` grants + `sales-permissions.ts`. Confirm the
     delegated-Staff-confirmation check reads `staff_permissions` (research.md §3) rather than
     inventing a new field.

3. **Route handlers**
   - Implement list/summary/detail (read paths) first, verify against
     [contracts/list-billing-records.md](contracts/list-billing-records.md) and
     [contracts/billing-detail.md](contracts/billing-detail.md).
   - Then mutations per [contracts/billing-mutations.md](contracts/billing-mutations.md) and
     [contracts/manual-registration.md](contracts/manual-registration.md).
   - Then export per [contracts/accounting-export.md](contracts/accounting-export.md).

4. **List page**
   - Summary KPI row + filterable/searchable `DataTable` + bulk-select toolbar (confirm, refund)
     - CSV export button.

5. **Detail page**
   - Two-column layout; confirmation status card with toggle; line items with per-item receipt
     download (disabled until `payment_status === 'confirmed'`); add-line-item and
     fee-adjustment dialogs (disabled when `confirmation_status === 'confirmed'`); refund dialog
     with payment-method-aware copy and 90-day-window warning.

6. **Manual registration page**
   - Store → Member cascading picker (member field disabled until store chosen; changing either
     clears line items).
   - Line-item builder as an always-visible inline card/table (not a separate preview step):
     "明細追加" and the table's empty-state "add" button are disabled until a member is
     selected, showing the guard text 「先に利用者を選択してください。」 in place of the
     control; the same guard text appears inside the add-line-item dialog's contract picker
     whenever the selected member has no contracts (research.md §4, contracts/manual-registration.md).
   - Billing-month field required before submit; outstanding-balance block surfaced inline, not
     just as a toast.
   - Two submit controls: "登録" (submits `confirmation_status: 'unconfirmed'` immediately) and
     "確定状態で登録" (opens a confirm dialog summarizing store/member/date/month/item-count/
     total, then submits `confirmation_status: 'confirmed'`) — both gated by the same
     member-selected + no-outstanding-balance + ≥1-line-item + month-set condition.

7. **Validate acceptance scenarios**
   - Walk every User Story's acceptance scenarios in `spec.md` manually.
   - Verify the role/data-scope matrix (System/HQ/Manager/Staff/Trainer/Observer) on list,
     detail, and every mutation, including the delegated-Staff-confirmation edge case.
   - Verify SC-004 (100% refund submissions require a reason) and SC-005 (100% outstanding-
     balance blocks) by attempting the blocked paths directly, not just the happy path.

---

## Verification Commands

```bash
npm run lint
npm run type-check
```

This project has **no automated test suite** (see constitution's No Testing Policy) — do not add
Jest/Vitest/Playwright. Verification is TypeScript strict compilation, ESLint, and manual
scenario walkthroughs against `spec.md`.

---

## Implementation Command Order (Phase 1)

```bash
# 1) Regenerate route registry after adding new page route segments
npm run generate-routes

# 2) Refresh OpenAPI from registered route schemas
npm run generate-openapi

# 3) Regenerate API client from the latest openapi.json
npm run generate-api

# 4) Validate production compilation
npm run build
```

---

## Phase 2 Note

When a real backend for sales/billing is published:

- Regenerate client with the project's API generation command; replace Phase 1 mock usage with
  generated React Query option-factories.
- Replace the Phase 1 mock-role constant with real auth-context role resolution.
- Revisit the receipt/invoice PDF endpoints (research.md §5) — swap the static placeholder body
  for real rendering once a PDF-generation approach is chosen at the project level, keeping the
  response shape (`Content-Type: application/pdf`, same gating rules) unchanged so the UI needs
  no rework.
- Reconcile the three member-scoped billing endpoints
  (`crm/members/[id]/billing|payment-history|payment-summary`) with the new `billingRecords`
  table if/when they're migrated to read from the same source of truth — out of scope here but
  flagged so it isn't forgotten.
