# Phase 1 Data Model: Sales Management (F-01)

All new types are defined as Zod schemas in `src/app/api/_schemas/billing.schema.ts` (source of
truth for both the mock-DB row shapes and the generated OpenAPI/`hey-api` client types — no field
is hand-duplicated). Mock-DB row types in `src/app/api/_mock-db/types/billing.type.ts` extend
these with internal-only bookkeeping fields (prefixed `_`) where needed, per the existing
`instructors.type.ts` / `transfer.type.ts` convention.

## Entity: BillingRecord

One billing/sales entry for a member in a given month. Cross-member, store-scoped — the row this
feature's list/summary/detail all key off.

| Field                 | Type                                                             | Notes                                                                                                                   |
| --------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `id`                  | `string` (`BR-###`)                                              | PK                                                                                                                      |
| `store_id`            | `string`                                                         | FK → store; drives FR-006 data scope                                                                                    |
| `store_name`          | `string`                                                         | denormalized for list display                                                                                           |
| `member_id`           | `string`                                                         | FK → member                                                                                                             |
| `member_name`         | `string`                                                         | denormalized                                                                                                            |
| `billing_type`        | `'monthly' \| 'ad_hoc' \| 'manual'`                              | `manual` = created via User Story 3                                                                                     |
| `billing_month`       | `string` (`'2026-07'`)                                           | applicable month (FR-017)                                                                                               |
| `billing_date`        | `string` (`YYYY/MM/DD`)                                          | Real API: date part of `header.createdAt` (API-114 §6.9) — not `dueDate`                                                |
| `payment_method`      | `'sbps' \| 'jaccs' \| 'cash' \| 'other'`                         | drives refund-handling branch (FR-011)                                                                                  |
| `billed_amount`       | `number` (yen)                                                   | sum of line items + adjustments                                                                                         |
| `paid_amount`         | `number` (yen)                                                   |                                                                                                                         |
| `refunded_amount`     | `number` (yen)                                                   | sum of completed refund requests                                                                                        |
| `outstanding_amount`  | `number` (yen)                                                   | `billed_amount - paid_amount - refunded_amount`, clamped ≥ 0; authoritative outstanding-balance source (research.md §2) |
| `confirmation_status` | `'unconfirmed' \| 'confirmed'`                                   | FR-012                                                                                                                  |
| `is_bad_debt`         | `boolean`                                                        | feeds FR-001 bad-debt count/amount                                                                                      |
| `refund_status`       | `'none' \| 'pending' \| 'approved' \| 'completed' \| 'rejected'` | rolled up from its `RefundRequest`s                                                                                     |
| `notes`               | `string \| null`                                                 |                                                                                                                         |
| `confirmed_by`        | `string \| null`                                                 | FR-012 audit                                                                                                            |
| `confirmed_at`        | `string \| null` (ISO)                                           | FR-012 audit                                                                                                            |
| `created_at`          | `string` (ISO)                                                   |                                                                                                                         |
| `updated_at`          | `string` (ISO)                                                   |                                                                                                                         |
| `updated_by`          | `string`                                                         | FR-008 "user who last updated it"                                                                                       |

**Validation rules**: `outstanding_amount` is never persisted as user input — always
recomputed server-side on every mutation that touches amounts (line item add, fee adjustment,
refund). `confirmed_by`/`confirmed_at` are set only by the confirm/unconfirm mutation, never by
the general update path.

**State transitions**: `unconfirmed → confirmed` (FR-012, requires no chargeable-item block —
i.e. any pending outstanding addition must resolve first) and `confirmed → unconfirmed` (User
Story 2 scenario 5, re-opens line-item/fee-adjustment editing). No other confirmation states.

## Entity: BillingLineItem

An individual charge within a billing record.

| Field               | Type                                    | Notes                                        |
| ------------------- | --------------------------------------- | -------------------------------------------- |
| `id`                | `string` (`BLI-###`)                    | PK                                           |
| `billing_record_id` | `string`                                | FK → BillingRecord                           |
| `source`            | `'contract' \| 'manual'`                | FR-009                                       |
| `contract_id`       | `string \| null`                        | set when `source === 'contract'`             |
| `label`             | `string`                                | item name shown in detail                    |
| `amount`            | `number` (yen)                          |                                              |
| `tax_rate`          | `number` (e.g. `0.1`)                   |                                              |
| `reason`            | `string \| null`                        | required when `source === 'manual'` (FR-009) |
| `payment_status`    | `'unpaid' \| 'confirmed' \| 'refunded'` | gates receipt download (FR-013)              |
| `created_at`        | `string` (ISO)                          |                                              |
| `created_by`        | `string`                                |                                              |

**Validation rules**: Adding a line item with `source: 'manual'` requires a non-empty `reason`.
Adding any line item is blocked server-side when `billingRecords.hasOutstandingBalance(member_id)`
is true for a _new chargeable_ item (FR-009) — re-validated on the mutation, not just client-side.
Line items on a `confirmed` billing record are read-only (User Story 2 scenario 5).

## Entity: FeeAdjustment

A recorded change to a billing target's amount (billing record or a specific line item).

| Field                 | Type                                                                       | Notes                                          |
| --------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| `id`                  | `string` (`FA-###`)                                                        | PK                                             |
| `billing_record_id`   | `string`                                                                   | FK                                             |
| `target_line_item_id` | `string \| null`                                                           | null = applies to whole record                 |
| `pattern`             | `'fixed_amount' \| 'discount_amount' \| 'discount_percent' \| 'surcharge'` | FR-010                                         |
| `value`               | `number`                                                                   | amount (yen) or percent depending on `pattern` |
| `original_amount`     | `number` (yen)                                                             | snapshot before adjustment                     |
| `resulting_amount`    | `number` (yen)                                                             | snapshot after adjustment                      |
| `reason`              | `string`                                                                   | required (FR-010)                              |
| `applied_by`          | `string`                                                                   |                                                |
| `applied_at`          | `string` (ISO)                                                             |                                                |
| `status`              | `'applied' \| 'pending'`                                                   |                                                |

**Validation rules**: `reason` is required and non-empty. History is append-only — each
`FeeAdjustment` row is immutable once created (mirrors the `BrandChangeHistoryItemSchema`
append-only convention); reverting an adjustment means creating a new compensating row, not
editing the old one. Blocked on a `confirmed` billing record, same as line items.

## Entity: RefundRequest

A request to return money to a member against a billing record.

| Field                     | Type                                                   | Notes                                                                                                           |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `id`                      | `string` (`RF-###`)                                    | PK                                                                                                              |
| `billing_record_id`       | `string`                                               | FK                                                                                                              |
| `type`                    | `'full' \| 'partial'`                                  | FR-011                                                                                                          |
| `line_item_refunds`       | `{ line_item_id: string; amount: number }[]`           | populated when `type === 'partial'`; each `amount` ≤ that line item's `amount` (FR-011 Acceptance Scenario 3)   |
| `amount`                  | `number` (yen)                                         | total; `full` = `billed_amount - refunded_amount`                                                               |
| `reason`                  | `string`                                               | required (FR-011, SC-004)                                                                                       |
| `detail`                  | `string \| null`                                       | free-text detail for the list-view simplified refund (FR-004)                                                   |
| `handling`                | `'card_auto_reversal' \| 'bank_manual_or_cashpost'`    | derived from `BillingRecord.payment_method` at creation time (FR-011)                                           |
| `reversal_window_expired` | `boolean`                                              | true when `handling === 'card_auto_reversal'` and original payment date > 90 days ago (FR-011, Edge Case)       |
| `status`                  | `'pending' \| 'approved' \| 'completed' \| 'rejected'` | approval-queue transitions beyond `pending` are out of scope (F-01-03); Phase 1 only writes `pending` on create |
| `requested_by`            | `string`                                               |                                                                                                                 |
| `requested_at`            | `string` (ISO)                                         |                                                                                                                 |

**Validation rules**: `reason` required (SC-004: 100% enforcement). For `type: 'partial'`, sum of
`line_item_refunds[].amount` must not exceed each referenced line item's original `amount`
(FR-011 scenario 3) — validated server-side in the mutation handler, not only in the Zod schema,
since it depends on current line-item state. Blocked when the member has _other_ unrelated
outstanding balances is NOT a rule (refunds are not blocked by FR-015 — only chargeable additions
and manual registration are).

## Entity: Member Contract (read-only reference)

Not owned by this feature. Referenced by `BillingLineItem.contract_id` and
`FeeAdjustment.target_line_item_id`'s underlying contract. Reuses the existing `GetContractsResponse`
shape (`src/app/api/_schemas/member.schema.ts`) and `UnpaidInfoSchema` — no new fields added to
Member Contract by this plan.

## Derived: BillingSummary (FR-001, not a stored entity)

Computed on demand by `GET /crm/billing-records/summary` from the current `billingRecords` scoped
to `store_id` (per caller's data scope) + `billing_month`:

| Field               | Type     |
| ------------------- | -------- |
| `total_sales`       | `number` |
| `total_payments`    | `number` |
| `total_outstanding` | `number` |
| `total_refunds`     | `number` |
| `confirmed_count`   | `number` |
| `unconfirmed_count` | `number` |
| `bad_debt_count`    | `number` |
| `bad_debt_amount`   | `number` |

## Sales Action Permissions (single source of truth for gating)

Mirrors `InstructorActionPermissions` (`014-instructor-management`). Consumed identically by
`RoleGatedButton` (client) and route handlers (server) to avoid drift.

| Action                                          | System         | Headquarter    | Manager            | Staff                                                                | Trainer / Observer |
| ----------------------------------------------- | -------------- | -------------- | ------------------ | -------------------------------------------------------------------- | ------------------ |
| View sales data (FR-005/006)                    | ✓ (all stores) | ✓ (all stores) | ✓ (managed stores) | ✓ (own store)                                                        | ✗                  |
| Confirm / unconfirm billing (FR-012)            | ✓              | ✓              | ✓                  | only if `staff_permissions` includes `F-01.confirm` (research.md §3) | ✗                  |
| Initiate refund (FR-011/FR-004)                 | ✓              | ✓              | ✓                  | ✓ (own store)                                                        | ✗                  |
| Add line item / fee adjustment (FR-009/010)     | ✓              | ✓              | ✓                  | ✓ (own store)                                                        | ✗                  |
| Manual registration (FR-014, subject to FR-016) | ✓              | ✓              | ✓                  | ✓ (own store)                                                        | ✗                  |
| Accounting CSV export (FR-007)                  | ✓              | ✓              | ✓                  | ✗                                                                    | ✗                  |
| Receipt / invoice download (FR-013)             | ✓              | ✓              | ✓                  | ✓ (own store)                                                        | ✗                  |

Implemented as `src/lib/utils/sales-permissions.ts`:

```ts
export function resolveSalesDataScope(
  role: StaffRole,
  context: { managedStoreIds?: string[]; ownStoreId?: string },
): (record: { store_id: string }) => boolean;

export function canPerformSalesAction(
  role: StaffRole,
  action:
    | 'confirm'
    | 'refund'
    | 'line-item-add'
    | 'fee-adjust'
    | 'manual-register'
    | 'export'
    | 'download-file',
  context?: { hasDelegatedConfirmPermission?: boolean },
): boolean;
```

## New Permission enum entries (`src/types/permission.type.ts`)

```ts
// Sales (F-01)
SalesView = 'sales.view',
SalesConfirm = 'sales.confirm',
SalesRefundInitiate = 'sales.refund-initiate',
SalesLineItemAdd = 'sales.line-item-add',
SalesFeeAdjust = 'sales.fee-adjust',
SalesManualRegister = 'sales.manual-register',
SalesExport = 'sales.export',
```

`PAGE_PERMISSIONS` gains `/sales`, `/sales/[id]`, `/sales/register` → `Permission.SalesView` (view
gating at the route level; finer action gating happens via `RoleGatedButton` +
`canPerformSalesAction` inside the page, same split used by every other feature).
