# Quickstart: F-01-01/02/03 Transaction History, Receivables, and Refund Management

**Goal**: Fill in the three existing "under construction" placeholder pages
(`sales/transactions`, `sales/receivables`, `sales/refunds`) with real, mock-backed screens, by
extending the already-implemented `015-sales-management` `billingRecords` table set — without
touching the legacy member-detail billing endpoints or duplicating any existing data.

---

## Implementation Checklist

- [ ] Extend `src/app/api/_schemas/billing.schema.ts`: add fields to `BillingRecordSchema`
      (`bad_debt_excluded`, `bad_debt_exclusion_reason`, `bad_debt_excluded_by`,
      `bad_debt_excluded_at`, `receivable_status`) and `RefundRequestSchema` (`requester_role`,
      `approver_id`, `approver_name`, `approver_role`, `approved_at`); add new schemas:
      `TransactionRecordSchema`, `GetTransactionLedgerQuerySchema`,
      `ExportTransactionLedgerRequestSchema`, `UnpaidReceivableSchema`, `UnpaidLineItemSchema`,
      `GetUnpaidReceivablesQuerySchema`, `IssueConveniencePaymentRequestSchema`,
      `BadDebtExclusionRequestSchema`, `UpcomingBillingEntrySchema`,
      `GetUpcomingBillingResponseSchema`, `RefundQueueEntrySchema`,
      `GetRefundQueueQuerySchema`, `RefundDecisionRequestSchema`,
      `BulkRefundDecisionRequestSchema`, `ExportRefundQueueRequestSchema` — per
      [data-model.md](data-model.md)
- [ ] Register every new schema in `src/app/api/_scripts/register-schemas.ts`
- [ ] Extend `src/app/api/_mock-db/types/billing.type.ts` (`BillingRecordsType`): add
      `getTransactionLedger`, `getUnpaidReceivables`, `getUnpaidDetail`,
      `issueConveniencePayment`, `setBadDebtExclusion`, `getUpcomingBilling`, `getRefundQueue`,
      `decideRefundRequest`, `decideBulkRefundRequests`
- [ ] Extend `src/app/api/_mock-db/tables/billing.table.ts`: implement the methods above as
      derived queries over `_rows`/`_lineItems`/`_refundRequests` (no new persisted table); extend
      the seed step to generate a next-month unconfirmed batch (some with unpaid-rollover amounts)
      so `getUpcomingBilling` has realistic data (research.md §8); populate `requester_role` on
      seeded `RefundRequest`s covering all three requester roles (Staff/Manager/Headquarter) so
      `canApproveRefund` has full test coverage out of the box
- [ ] Add `src/lib/utils/refund-approval.ts` (`canApproveRefund`, `requiredApproverLabel`) per
      research.md §5 — mirrors the UI mock's existing client-side logic exactly
- [ ] Add `Sales*` entries to `src/types/permission.type.ts` `Permission` enum
      (`SalesTransactionsView`, `SalesReceivablesView`, `SalesBadDebtExclude`,
      `SalesConvenienceIssue`, `SalesUpcomingBillingConfirm`, `SalesRefundApprove`,
      `SalesRefundExport`); wire grants into `ROLE_PERMISSIONS`
      (`src/constants/permission.constants.ts`) per data-model.md's permission table; verify/add
      `/sales/transactions`, `/sales/receivables`, `/sales/refunds` to `PAGE_PERMISSIONS`
- [ ] Add route handlers per [contracts/](contracts/):
      `crm/billing-records/transactions/route.ts` (GET),
      `crm/billing-records/transactions/export/route.ts` (POST, CSV),
      `crm/billing-records/receivables/route.ts` (GET),
      `crm/billing-records/receivables/[memberId]/route.ts` (GET),
      `crm/billing-records/receivables/convenience-payment/route.ts` (POST),
      `crm/billing-records/receivables/bad-debt-exclusion/route.ts` (POST),
      `crm/billing-records/upcoming-billing/route.ts` (GET),
      `crm/billing-records/refund-requests/route.ts` (GET),
      `crm/billing-records/refund-requests/[id]/decision/route.ts` (POST),
      `crm/billing-records/refund-requests/bulk-decision/route.ts` (POST),
      `crm/billing-records/refund-requests/export/route.ts` (POST, CSV)
      — the existing `crm/billing-records/{id}/refund-requests/route.ts` (create) and
      `crm/billing-records/confirm/route.ts` (bulk confirm) are **reused as-is**, not modified
- [ ] Fill in `src/app/(private)/sales/transactions/page.tsx`: replace the "Construction"
      placeholder with a `DataTable` + `nuqs` filters (date range, store, transaction type,
      payment method, search), active-filter banner + clear-all, CSV export button (modeled on
      `sales-csv-export-button.tsx`), row-level refund-request dialog (reuses the existing
      `SubmitRefundRequestSchema` payload/endpoint) disabled for non-sale/canceled rows
- [ ] Fill in `src/app/(private)/sales/receivables/page.tsx`: `Tabs` — 未回収一覧 (unpaid list +
      month filter + `Sheet`-based unpaid-detail panel modeled on `slot-detail-sheet.tsx`,
      convenience-payment dialog, bad-debt exclusion/release dialog with required-reason
      `Textarea`) and 翌月請求予定 (SBPS/JACCS summary cards + table + bulk-confirm button reusing
      the existing confirm endpoint + confirmation `Dialog` summarizing the SBPS/JACCS split)
- [ ] Fill in `src/app/(private)/sales/refunds/page.tsx`: pending-count `Alert` banner, `DataTable`
      with status/payment-method/requester-role/date filters + sort, row-selection bulk-action bar
      (approve/reject with excluded-count messaging), `Sheet`-based refund-detail panel with
      approve/reject buttons gated by `canApproveRefund`, `AlertDialog` confirmation step for every
      decision (single or bulk), refund CSV export button (HQ/Manager/System only)
- [ ] Add role-gated action buttons/menu items (`RoleGatedButton`/`RoleGatedMenuItem`) everywhere
      per the permission matrix in `data-model.md`, using `requiredApproverLabel(...)` for the
      refund-approval deny-tooltip text specifically
- [ ] Run `npm run generate-routes` (should be a no-op for routing since the three pages already
      exist, but re-run to be safe after any page-level prop/structure changes)
- [ ] Run `npm run generate-openapi` then `npm run generate-api` after finalizing all Zod schemas

---

## Suggested File Targets

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   ├── types/
│   │   │   │   └── billing.type.ts                              # EXTEND
│   │   │   └── tables/
│   │   │       └── billing.table.ts                              # EXTEND
│   │   ├── _schemas/
│   │   │   └── billing.schema.ts                                  # EXTEND
│   │   └── crm/
│   │       └── billing-records/
│   │           ├── transactions/
│   │           │   ├── route.ts                                   # NEW: GET
│   │           │   └── export/route.ts                            # NEW: POST (CSV)
│   │           ├── receivables/
│   │           │   ├── route.ts                                   # NEW: GET
│   │           │   ├── [memberId]/route.ts                        # NEW: GET
│   │           │   ├── convenience-payment/route.ts                # NEW: POST
│   │           │   └── bad-debt-exclusion/route.ts                 # NEW: POST
│   │           ├── upcoming-billing/route.ts                       # NEW: GET
│   │           └── refund-requests/
│   │               ├── route.ts                                    # NEW: GET (queue list)
│   │               ├── [id]/decision/route.ts                      # NEW: POST
│   │               ├── bulk-decision/route.ts                       # NEW: POST
│   │               └── export/route.ts                             # NEW: POST (CSV)
│   └── (private)/
│       └── sales/
│           ├── transactions/
│           │   ├── page.tsx                                       # FILL IN
│           │   └── _components/
│           │       ├── transactions-filters.tsx
│           │       ├── transactions-table.tsx
│           │       ├── transactions-csv-export-button.tsx
│           │       └── transaction-refund-request-dialog.tsx
│           ├── receivables/
│           │   ├── page.tsx                                        # FILL IN
│           │   └── _components/
│           │       ├── unpaid-table.tsx
│           │       ├── unpaid-detail-sheet.tsx
│           │       ├── convenience-payment-dialog.tsx
│           │       ├── bad-debt-exclusion-dialog.tsx
│           │       ├── upcoming-billing-summary-cards.tsx
│           │       ├── upcoming-billing-table.tsx
│           │       └── upcoming-billing-confirm-dialog.tsx
│           └── refunds/
│               ├── page.tsx                                        # FILL IN
│               └── _components/
│                   ├── refund-pending-banner.tsx
│                   ├── refund-queue-table.tsx
│                   ├── refund-detail-sheet.tsx
│                   ├── refund-decision-dialog.tsx
│                   ├── refund-bulk-action-bar.tsx
│                   └── refund-csv-export-button.tsx
└── lib/
    └── utils/
        └── refund-approval.ts                                       # NEW
```

---

## Manual Verification Walkthrough (per user story)

1. **Receivables — unpaid list (US1)**: Open `/sales/receivables`, confirm the 未回収一覧 tab
   loads with month filter; click a member row, confirm the unpaid-detail Sheet shows line items
   with JACCS-subrogation badges on eligible (≤3-month) main-contract items only; issue a
   convenience-payment link for one line item and confirm its status badge updates; exclude a
   different member from bad debt without a reason (blocked) then with a reason (succeeds,
   recorded); confirm a Staff-role session cannot see the bad-debt-exclusion action at all.
2. **Receivables — upcoming billing (US2)**: Switch to the 翌月請求予定 tab, confirm SBPS/JACCS
   summary cards match the table; confirm a rollover-labeled row shows its explanatory note; run
   the bulk-confirm action, confirm the summary dialog shows the correct split before finalizing,
   and confirm entries disappear from this tab afterward (now `confirmed`); confirm an
   undelegated-Staff session sees the confirm button disabled.
3. **Refunds (US3)**: Open `/sales/refunds`, confirm the pending banner count/amount; open a
   Staff-submitted request as a Manager (approve/reject enabled) and as a Staff user (disabled with
   tooltip); approve it via the confirmation dialog and confirm it moves to `completed` with
   approver fields populated; select a mixed-authority batch and bulk-approve, confirm the excluded
   count is shown before and after; export the refund CSV and confirm SBPS rows are absent.
4. **Transactions (US4)**: Open `/sales/transactions`, search by member ID, apply a date-range +
   type + payment-method filter, confirm the active-filter banner and clear-all control; export
   CSV and confirm the exported filter description matches; open a confirmed "sale" row's refund
   dialog, submit a partial refund with a reason, confirm it lands in the refund queue as
   `pending` with the correct `requester_role`; confirm a canceled row's refund action is disabled.
