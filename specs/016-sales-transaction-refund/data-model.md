# Phase 1 Data Model: Sales Transaction History, Receivables, and Refund Management (F-01-01/02/03)

All new fields extend the existing `BillingRecordSchema`/`RefundRequestSchema` in
`src/app/api/_schemas/billing.schema.ts` (single source of truth for mock-DB row shapes and the
generated OpenAPI/`hey-api` client types). All four "new" entities below (Transaction Record,
Unpaid Receivable, Unpaid Line Item, Upcoming Billing Entry) are **derived read-models** — they are
computed by new query methods on the existing `billingRecords` table, not new persisted rows (see
research.md §3). Only `BillingRecord` and `RefundRequest` gain genuinely new persisted fields.

## Entity: BillingRecord (extended)

Existing entity from `015-sales-management`. This feature adds collections-workflow fields; every
other field is unchanged and reused as-is.

| Field (new)                 | Type                                                                                                                    | Notes                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `bad_debt_excluded`         | `boolean`                                                                                                               | FR-010; defaults `false`                                                                                      |
| `bad_debt_exclusion_reason` | `string \| null`                                                                                                        | required whenever `bad_debt_excluded` is set or cleared (both directions)                                     |
| `bad_debt_excluded_by`      | `string \| null`                                                                                                        | acting user; FR-010 audit                                                                                     |
| `bad_debt_excluded_at`      | `string \| null` (ISO-8601)                                                                                             | FR-010 audit                                                                                                  |
| `receivable_status`         | `'uncollected' \| 'rebilling' \| 'convenience_payment_in_progress' \| 'bad_debt_target' \| 'bad_debt_excluded' \| null` | `null` when `outstanding_amount === 0`; independent of `confirmation_status`/`refund_status` (research.md §4) |

**Validation rules**: `bad_debt_exclusion_reason` is required (non-empty) on both the
exclude-action and the release-action (FR-010). `receivable_status` transitions to
`'bad_debt_excluded'` only via the exclusion action, and transitions away from it only via the
release action — never a side effect of any other mutation. `receivable_status` transitions to
`'convenience_payment_in_progress'` when a convenience-payment link is issued (FR-008), and back to
`'uncollected'`/cleared once the record's `outstanding_amount` reaches 0 through normal payment
collection (not modeled as a new state — handled by the existing payment-confirmation path from
015). `receivable_status` is only ever non-null while `outstanding_amount > 0`.

**State transitions** (receivable_status, additive to existing `confirmation_status`/
`refund_status` transitions from 015):

```
null (no outstanding amount)
  → 'uncollected'                          (billing collection fails; outstanding_amount > 0)
'uncollected' → 'rebilling'                 (record re-included in a subsequent month's batch, FR-009)
'uncollected' | 'rebilling' → 'convenience_payment_in_progress'   (FR-008 issuance)
'convenience_payment_in_progress' → 'uncollected'                (payment link expires/fails — no auto state change modeled beyond this; outstanding_amount unchanged)
any non-excluded state → 'bad_debt_excluded'                      (FR-010 exclude action, reason required)
'bad_debt_excluded' → prior non-excluded state                    (FR-010 release action, reason required)
any of the above → null                                           (outstanding_amount reaches 0 via payment)
'uncollected' | 'rebilling' → 'bad_debt_target'                   (month-end batch marks eligible records ahead of write-off; out of this feature's scope to implement the batch itself — status value only)
```

## Entity: RefundRequest (extended)

Existing entity from `015-sales-management`. This feature adds the fields needed for hierarchical
approval and approver attribution — the request-creation fields (`type`, `line_item_refunds`,
`amount`, `reason`, `detail`, `handling`, `reversal_window_expired`, `requested_by`,
`requested_at`) are unchanged and reused via the existing creation endpoint (research.md §6).

| Field (new)      | Type                                             | Notes                                                                                                                              |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `requester_role` | `'staff' \| 'manager' \| 'headquarter'`          | captured at request-creation time; drives the hierarchical approval check (FR-016)                                                 |
| `approver_id`    | `string \| null`                                 | set only on approve/reject decision                                                                                                |
| `approver_name`  | `string \| null`                                 | set only on approve/reject decision                                                                                                |
| `approver_role`  | `'system' \| 'headquarter' \| 'manager' \| null` | the deciding user's role, for display/audit                                                                                        |
| `approved_at`    | `string \| null` (ISO-8601)                      | timestamp of the approve **or** reject decision (name retained from the UI mock's `approvalDate`, which is used for both outcomes) |

**Validation rules**: A decision (approve or reject) may only be recorded by a user for whom
`canApproveRefund(currentRole, requesterRole)` is `true` (research.md §5) — enforced server-side in
the decision route, independent of any client-side button state. Approving sets `status:
'completed'` directly (no intermediate `'approved'` state persists in practice, per FR-017 —
the existing `'approved'` enum value is retained in the schema for backward compatibility with 015
but this feature's decision endpoint always writes `'completed'` on approval, never leaves a
request sitting at `'approved'`). Rejecting sets `status: 'rejected'`. Both actions require the
request to currently be `status: 'pending'`; deciding an already-decided request is rejected with a
409-equivalent error.

> **Real API (2026-10-19, API-118 §12 / §13.11)**: the mock model above does not hold on the real API. Approval executes SBPS
> refunds immediately; non-SBPS refunds go to `displayStatus: processing` until a Manager+ user calls
> `POST /refunds/{refundId}/mark-executed` (succeeded/failed). `displayStatus` has 7 values: pending_approval / processing /
> refunded / failed / rejected / cancelled / expired (BR-REF-010). Reject requires `rejectionReason` (1–500).

**State transitions**:

```
'pending' --(approve, authorized user)--> 'completed'   (BillingRecord.refunded_amount/outstanding_amount recomputed; refund executes immediately, FR-017)
'pending' --(reject, authorized user)--> 'rejected'
'pending' --(approve/reject, unauthorized user)--> [blocked server-side, FR-016]
```

## Read-Model: Transaction Record (derived)

Computed by `billingRecords.getTransactionLedger(filters)`. One row per money-movement event
across all billing records in the caller's data scope — not a persisted row.

| Field                     | Type                                                                                                                | Derivation                                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | `string` (`TXN-YYYYMMDD-###`)                                                                                       | synthesized per emitted ledger row                                                                                                                                                                                                                                      |
| `transaction_date`        | `string` (`YYYY/MM/DD`)                                                                                             | mock: line item's `created_at` (sale) / record's `confirmed_at` (payment) / refund's `approved_at`. Real API (API-116 §3.3): sale `confirmed_at`→`created_at`; payment `paid_at`→`failed_at`→`created_at`; refund `refunded_at`→`created_at`; write_off `document_date` |
| `member_id`               | `string`                                                                                                            | from parent `BillingRecord`                                                                                                                                                                                                                                             |
| `member_name`             | `string`                                                                                                            | from parent `BillingRecord`                                                                                                                                                                                                                                             |
| `store_id` / `store_name` | `string`                                                                                                            | from parent `BillingRecord`; drives data scope                                                                                                                                                                                                                          |
| `transaction_type`        | `'sale' \| 'refund' \| 'payment' \| 'repayment'` (real API: `'sale' \| 'payment' \| 'refund' \| 'write_off'`, 貸倒) | `sale` = line item created; `payment` = `paid_amount` recorded; `refund` = `RefundRequest` reached `completed`; `repayment` = a subsequent re-posting entry against a prior refund (rare; mirrors UI mock)                                                              |
| `billing_line_item_id`    | `string`                                                                                                            | FK → `BillingLineItem` (real API: v0.7.1 deployed = one row per billing → `billingItemIds[]`; v0.7.3 spec = one row per line → `billingItemId`, null for payment / write_off)                                                                                           |
| `amount_ex_tax`           | `number` (yen)                                                                                                      | `amount / (1 + tax_rate)`, rounded                                                                                                                                                                                                                                      |
| `tax_rate`                | `number` (e.g. `10` as a percent, matching UI mock)                                                                 | from `BillingLineItem.tax_rate`                                                                                                                                                                                                                                         |
| `amount_inc_tax`          | `number` (yen)                                                                                                      | `BillingLineItem.amount`                                                                                                                                                                                                                                                |
| `payment_method`          | `'sbps' \| 'jaccs' \| 'cash' \| 'other'`                                                                            | mock: from parent `BillingRecord`. Real API (API-116 §3.3): sale/write_off = member's current primary method (nullable); payment = `payments.payment_method`; refund = from `refund_method`                                                                             |
| `status`                  | `'confirmed' \| 'processing' \| 'canceled' \| 'uncollected'`                                                        | `confirmed` = `BillingRecord.confirmation_status === 'confirmed'` and line item paid; `processing` = confirmed but payment in flight; `canceled` = a canceled/reversed sale; `uncollected` = `outstanding_amount > 0` for this line item                                |

**Validation rules**: Read-only projection; no direct mutation. Refund-initiation (FR-004) is only
offered by the UI for rows where `transaction_type === 'sale'` and `status === 'confirmed'`
(server-side, the existing `POST .../refund-requests` endpoint independently re-validates the
target billing record's state regardless of what the UI offers).

## Read-Model: Unpaid Receivable + Unpaid Line Item (derived)

Computed by `billingRecords.getUnpaidReceivables(filters)`. One row per member with
`outstanding_amount > 0` across any of their billing records in scope; each contains one or more
Unpaid Line Items.

**Unpaid Receivable**

| Field                     | Type                                     | Derivation                                                                                                                                                                         |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `member_id`/`member_name` | `string`                                 | grouping key                                                                                                                                                                       |
| `store_id`/`store_name`   | `string`                                 | from member's billing records (assumed single-store per record, per FR-021)                                                                                                        |
| `unpaid_months`           | `string[]` (`'2026/03'`)                 | distinct `billing_month`s across this member's outstanding records                                                                                                                 |
| `total_unpaid_amount`     | `number` (yen)                           | sum of `outstanding_amount` across this member's records                                                                                                                           |
| `last_billing_date`       | `string` (`YYYY/MM/DD`)                  | max `billing_date` across this member's outstanding records                                                                                                                        |
| `payment_method`          | `'sbps' \| 'jaccs' \| 'cash' \| 'other'` | from the member's outstanding records (assumed consistent per FR-021 scope)                                                                                                        |
| `receivable_status`       | (see BillingRecord.receivable_status)    | rolled up — most severe status across the member's outstanding records (`bad_debt_excluded` > `bad_debt_target` > `convenience_payment_in_progress` > `rebilling` > `uncollected`) |

**Unpaid Line Item**

| Field                        | Type                                     | Derivation                                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                         | `string` (`BLI-###`)                     | = underlying `BillingLineItem.id`                                                                                                                                                                                                  |
| `month`                      | `string` (`'2026/03'`)                   | parent `BillingRecord.billing_month`, reformatted                                                                                                                                                                                  |
| `contract_type`              | `'main' \| 'option' \| 'ad_hoc'`         | derived from `BillingLineItem.source`/`contract_id` + `BillingRecord.billing_type`                                                                                                                                                 |
| `contract_name`              | `string`                                 | `BillingLineItem.label`                                                                                                                                                                                                            |
| `amount`                     | `number` (yen)                           | `BillingLineItem.amount`                                                                                                                                                                                                           |
| `status`                     | (see BillingRecord.receivable_status)    | parent record's `receivable_status`                                                                                                                                                                                                |
| `payment_method`             | `'sbps' \| 'jaccs' \| 'cash' \| 'other'` | parent record's `payment_method`                                                                                                                                                                                                   |
| `jaccs_subrogation_eligible` | `boolean \| undefined`                   | only meaningful when `contract_type === 'main'` and `payment_method === 'jaccs'`; `true` when `month` is within the 3 most recent unpaid months for this member (F-01 #400), else `false`; `undefined` for non-main-contract items |

**Validation rules**: `jaccs_subrogation_eligible` is computed, never stored — recomputed each
read from the member's sorted `unpaid_months` list, so it stays correct as new unpaid months are
added or resolved. Convenience-payment issuance (FR-008) and bad-debt exclusion (FR-010) can target
(real API: bad-debt exclusion is per billing only — `/receivables/{billingId}/bad-debt-exclusion`, API-117 §9)
either the whole Unpaid Receivable (all of a member's outstanding line items) or a single Unpaid
Line Item — both call the same underlying `BillingRecord`-level mutation, scoped to one or all of a
member's outstanding records.

## Read-Model: Upcoming Billing Entry (derived)

Computed by `billingRecords.getUpcomingBilling(filters)`. One row per `BillingRecord` where
`billing_month` is next calendar month and `confirmation_status === 'unconfirmed'`.

| Field                     | Type                                               | Derivation                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `member_id`/`member_name` | `string`                                           | from `BillingRecord`                                                                                                                                                                                 |
| `billing_type`            | `'standard' \| 'with_unpaid_rollover' \| 'ad_hoc'` | `with_unpaid_rollover` when this record's amount includes a prior-month unpaid rollover (new seed flag, research.md §8); `ad_hoc` mirrors `BillingRecord.billing_type === 'ad_hoc'`; else `standard` |
| `payment_method`          | `'sbps' \| 'jaccs' \| 'cash' \| 'other'`           | from `BillingRecord`                                                                                                                                                                                 |
| `amount`                  | `number` (yen)                                     | `BillingRecord.billed_amount`                                                                                                                                                                        |
| `billing_month`           | `string` (`'2026/04'`)                             | from `BillingRecord.billing_month`, reformatted                                                                                                                                                      |
| `note`                    | `string`                                           | populated only for `with_unpaid_rollover` (e.g. "unpaid amount for 2026/02, 2026/03 included"); empty otherwise                                                                                      |
| `unconfirmed`             | `true`                                             | always true for this read-model — records are excluded from it once confirmed                                                                                                                        |

**Validation rules**: Read-only projection; confirming these records uses the existing
`POST /crm/billing-records/confirm` bulk endpoint (research.md §7), which then removes them from
this read-model's next read (their `confirmation_status` becomes `'confirmed'`).

## Read-Model: Refund Queue entry (derived)

Computed by `billingRecords.getRefundQueue(filters)`. One row per `RefundRequest` across all
billing records in the caller's data scope, joined with parent record/member/store display fields.

| Field                                            | Type                                                                                     | Derivation                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `refund_id`                                      | `string`                                                                                 | = `RefundRequest.id`                                                                                             |
| `store_id`/`store_name`                          | `string`                                                                                 | from parent `BillingRecord`                                                                                      |
| `member_id`/`member_name`                        | `string`                                                                                 | from parent `BillingRecord`                                                                                      |
| `product_name`                                   | `string`                                                                                 | joined line-item label(s) for the refunded line items                                                            |
| `sale_amount`                                    | `number` (yen)                                                                           | original billed amount of the targeted line item(s)                                                              |
| `refund_amount`                                  | `number` (yen)                                                                           | = `RefundRequest.amount`                                                                                         |
| `status`                                         | `'pending' \| 'completed' \| 'rejected'` (real API: 7-value `displayStatus`, BR-REF-010) | = `RefundRequest.status` (the `'approved'` transient value from 015's schema is never surfaced here, per FR-017) |
| `payment_method`                                 | `'sbps' \| 'jaccs' \| 'cash' \| 'other'`                                                 | from parent `BillingRecord`                                                                                      |
| `requester_id`/`requester_name`/`requester_role` | `string`                                                                                 | from `RefundRequest`                                                                                             |
| `approver_id`/`approver_name`/`approver_role`    | `string \| null`                                                                         | from `RefundRequest`, `null` while `pending`                                                                     |
| `requested_at`/`approved_at`                     | `string \| null` (ISO-8601)                                                              | from `RefundRequest`                                                                                             |
| `reason`                                         | `string`                                                                                 | = `RefundRequest.reason`                                                                                         |

**Validation rules**: Read-only projection. Decision actions (approve/reject, single or bulk)
write only to the underlying `RefundRequest` and, on approval, the parent `BillingRecord`'s
`refunded_amount`/`outstanding_amount`/`refund_status` — never to this read-model directly.

## Permission additions (Phase 1)

New `Permission` enum entries (`src/types/permission.type.ts`), granted per role in
`ROLE_PERMISSIONS` (`src/constants/permission.constants.ts`) exactly per the spec's permission
rules (FR-006/FR-010/FR-013/FR-016/FR-020/FR-021):

| Permission                    | System  |        Headquarter         |         Manager         | Staff                                                                    | Trainer / Observer |
| ----------------------------- | :-----: | :------------------------: | :---------------------: | ------------------------------------------------------------------------ | :----------------: |
| `SalesTransactionsView`       |    ✓    |             ✓              |            ✓            | ✓                                                                        |         ✗          |
| `SalesReceivablesView`        |    ✓    |             ✓              |            ✓            | ✓                                                                        |         ✗          |
| `SalesBadDebtExclude`         |    ✓    |             ✓              |            ✓            | ✗                                                                        |         ✗          |
| `SalesConvenienceIssue`       |    ✓    |             ✓              |            ✓            | ✓                                                                        |         ✗          |
| `SalesUpcomingBillingConfirm` |    ✓    |             ✓              |            ✓            | only with delegated `'F-01.confirm'` (reuses existing mechanism, FR-013) |         ✗          |
| `SalesRefundApprove`          | ✓ (any) | ✓ (Staff/Manager requests) | ✓ (Staff requests only) | ✗ (never approves)                                                       |         ✗          |
| `SalesRefundExport`           |    ✓    |             ✓              |            ✓            | ✗                                                                        |         ✗          |

`SalesRefundApprove` grants _access to the approval UI/route at all_; the fine-grained
requester-vs-approver rule is enforced by `canApproveRefund` (research.md §5), not by the
permission matrix alone — a Staff user is never granted `SalesRefundApprove` in the first place,
while a Manager holds it but is still blocked by `canApproveRefund` from approving a
Headquarters-submitted request.
