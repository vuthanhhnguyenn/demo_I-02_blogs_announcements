# Contract: Billing Record Mutations

**Feature**: 015-sales-management (FR-003, FR-004, FR-009, FR-010, FR-011, FR-012, FR-013)
**Phase**: Phase 1 mock route handlers — NEW routes
**Purpose**: Every state-changing action available from the list (bulk) and detail (single-record) screens.

All routes below apply `resolveSalesDataScope` (404/403 as in [billing-detail.md](billing-detail.md))
and `canPerformSalesAction` (403 with an explanatory message when the role/delegation check
fails) before touching data. All amount-affecting mutations recompute
`BillingRecord.outstanding_amount` server-side on write (research.md §2) — clients never send it.

---

## 1. Bulk confirm — `PATCH /api/crm/billing-records/confirm`

**Request body**

```json
{ "ids": ["BR-0002", "BR-0005"] }
```

**Behavior**: Only rows currently `unconfirmed` are affected (Edge Case: mixed selection); rows
already `confirmed` in the selection are silently skipped, not errored. Sets
`confirmation_status: 'confirmed'`, `confirmed_by: <caller>`, `confirmed_at: now()` on each
affected row.

**Response 200**

```json
{ "confirmed_ids": ["BR-0002", "BR-0005"], "skipped_ids": [] }
```

Empty `ids` array or a selection with zero eligible (unconfirmed) rows → `400`
`{ "error": "No unconfirmed records selected" }` (Edge Case: confirm action unavailable when no
unconfirmed record is selected).

---

## 2. Single confirm/unconfirm toggle — `PATCH /api/crm/billing-records/{id}/confirmation`

**Request body**

```json
{ "status": "unconfirmed" }
```

**Behavior**: Toggles one record. Reverting `confirmed → unconfirmed` clears nothing else (line
items/adjustments remain) but re-enables their edit mutations (below). Records who/when
regardless of direction (FR-012).

**Response 200**: the updated `BillingRecord` (same shape as detail's top-level fields).

---

## 3. Add line item — `POST /api/crm/billing-records/{id}/line-items`

**Request body (from contract)**

```json
{ "source": "contract", "contract_id": "MC-0002" }
```

**Request body (manual)**

```json
{
  "source": "manual",
  "label": "臨時清掃料",
  "amount": 1100,
  "tax_rate": 0.1,
  "reason": "破損対応費用"
}
```

**Behavior**:

- `409` `{ "error": "billing record is confirmed" }` if `confirmation_status === 'confirmed'`.
- `source: 'manual'` requires non-empty `reason` — `400` otherwise (FR-009).
- `422` `{ "error": "member has an outstanding unpaid balance" }` when
  `billingRecords.hasOutstandingBalance(member_id)` is true for the billing record's member and
  the new item is chargeable (FR-009, SC-005) — checked **after** re-validating current state,
  not cached from page-load.
- On success, recomputes `billed_amount`/`outstanding_amount` on the parent record.

**Response 201**: the created `BillingLineItem`.

---

## 4. Apply fee adjustment — `POST /api/crm/billing-records/{id}/fee-adjustments`

**Request body**

```json
{
  "target_line_item_id": "BLI-0001",
  "pattern": "discount_percent",
  "value": 10,
  "reason": "会員クレーム対応による割引"
}
```

**Behavior**: `reason` required — `400` otherwise (FR-010). `409` if the record is `confirmed`.
`original_amount`/`resulting_amount` are computed server-side from `pattern`/`value` against the
target's current amount, never trusted from the client. Appends an immutable history row (never
edits a prior one — research.md §"FeeAdjustment").

**Response 201**: the created `FeeAdjustment`, including computed `original_amount` and
`resulting_amount`.

---

## 5. Submit refund request (detail page, full/partial) — `POST /api/crm/billing-records/{id}/refund-requests`

**Request body**

```json
{
  "type": "partial",
  "line_item_refunds": [{ "line_item_id": "BLI-0001", "amount": 3000 }],
  "reason": "会員都合によるキャンセル"
}
```

**Behavior**:

- `reason` required — `400` otherwise (FR-011, SC-004).
- For `type: 'partial'`, each `line_item_refunds[].amount` must not exceed that line item's
  current `amount` and must reference a line item on this billing record — `422` otherwise
  (FR-011 scenario 3).
- `handling` is derived from `BillingRecord.payment_method`: `sbps` → `card_auto_reversal`,
  `jaccs`/other bank-debit → `bank_manual_or_cashpost` (FR-011 scenario 2).
- `reversal_window_expired` is computed when `handling === 'card_auto_reversal'`: `true` if
  `now() - billing_date > 90 days` (Edge Case). This does not block submission — it's surfaced so
  the UI can prompt for an alternate method, per the edge case's wording ("prompts the user"),
  not a hard rejection.
- Creates the row with `status: 'pending'`; does not mutate `BillingRecord.refunded_amount` until
  a (future, out-of-scope) approval step completes it.

**Response 201**: the created `RefundRequest`.

---

## 6. Submit simplified refund request (list page, no navigation away) — `POST /api/crm/billing-records/refund-requests/bulk`

**Request body**

```json
{
  "billing_record_ids": ["BR-0002", "BR-0007"],
  "reason_code": "duplicate_charge",
  "detail": "二重請求のため"
}
```

**Behavior**: FR-004's list-level simplified refund — one reason (selectable code) + free-text
detail, applied as a `type: 'full'` `RefundRequest` per selected record, each deriving `handling`
independently per its own `payment_method`. Same `reason` (via `reason_code`) requirement as #5.

**Response 200**

```json
{
  "created": [
    { "billing_record_id": "BR-0002", "refund_request_id": "RF-0010" },
    { "billing_record_id": "BR-0007", "refund_request_id": "RF-0011" }
  ]
}
```

---

## 7. Receipt / invoice download

`GET /api/crm/billing-records/{id}/line-items/{lineItemId}/receipt` — receipt PDF for one line
item. `409` `{ "error": "payment not confirmed" }` when `payment_status !== 'confirmed'` (FR-013,
Edge Case). Otherwise `200` with `Content-Type: application/pdf` (research.md §5 — Phase 1 static
placeholder body, gating logic is real).

`GET /api/crm/billing-records/{id}/invoice` — invoice PDF for the whole record (upcoming or
confirmed billing, no payment-status gate). `200` with `Content-Type: application/pdf`.

---

## Contract Tests (minimum)

- Bulk confirm: mixed selection confirms only unconfirmed rows; all-confirmed selection → `400`.
- Single toggle: confirm then unconfirm round-trip; audit fields update both directions.
- Line item add: manual without reason → `400`; contract-sourced for outstanding-balance member →
  `422`; success recomputes parent `billed_amount`.
- Fee adjustment: missing reason → `400`; on a confirmed record → `409`.
- Refund (detail): missing reason → `400`; partial amount exceeding line item amount → `422`;
  `sbps` within 90 days → `handling: card_auto_reversal, reversal_window_expired: false`; `sbps`
  past 90 days → `reversal_window_expired: true`; `jaccs` → `handling: bank_manual_or_cashpost`.
- Refund (bulk/list): two records with different payment methods each get correctly-derived
  `handling` independently.
- Receipt download: unconfirmed line item → `409`; confirmed line item → `200` PDF.
