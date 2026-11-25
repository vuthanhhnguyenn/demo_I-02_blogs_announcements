# Contract: Transaction Ledger

**Feature**: 016-sales-transaction-refund (FR-001, FR-002, FR-003, FR-004, FR-005)
**Phase**: Phase 1 mock route handlers — NEW routes
**Purpose**: The store-scoped, searchable transaction history (入出金明細) and its CSV export and
refund-initiation entry point.

All routes below apply `resolveSalesDataScope(MOCK_ROLE, {})` (records outside scope are excluded
from results, not 403'd, since this is a list endpoint — matching `billing-records/route.ts`'s
existing convention) and reject `MOCK_ROLE === 'trainer' | 'observer'` with `403` (FR-021).

---

## 1. List transaction ledger — `GET /api/crm/billing-records/transactions`

**Query params**

```
date_from?: string   (YYYY-MM-DD)
date_to?: string      (YYYY-MM-DD)
store_id?: string
transaction_type?: 'sale' | 'refund' | 'payment' | 'repayment'
payment_method?: 'sbps' | 'jaccs' | 'cash' | 'other'
search?: string        (matches member_id or member_name)
page?: number = 1
page_size?: number = 50
```

**Behavior**: Computed via `billingRecords.getTransactionLedger(filters)` (data-model.md). Results
are scoped to the caller's accessible stores before filters/search/pagination are applied.

**Response 200**

```json
{
  "items": [
    {
      "id": "TXN-20260301-001",
      "transaction_date": "2026/03/01",
      "member_id": "MEM-2255",
      "member_name": "田中太郎",
      "store_id": "STORE-014",
      "store_name": "FIT365八潮店",
      "transaction_type": "sale",
      "billing_line_item_id": "BLI-11070-01",
      "amount_ex_tax": 7254,
      "tax_rate": 10,
      "amount_inc_tax": 7980,
      "payment_method": "sbps",
      "status": "confirmed"
    }
  ],
  "total_count": 1,
  "page": 1,
  "page_size": 50
}
```

Zero matching rows → `200` with `items: []`, `total_count: 0` (Edge Case: empty state, not an
error).

---

## 2. Export transaction ledger CSV — `POST /api/crm/billing-records/transactions/export`

**Request body**: identical filter shape to the list endpoint's query params (so the export always
reflects the currently-applied filters, FR-003), plus no `page`/`page_size` (export is unpaginated).

**Behavior**: Same `resolveSalesDataScope`/role checks as list. Builds CSV via
`buildCsv`/`csvFileResponse`/`csvDateStamp` (research.md §9), following
`crm/billing-records/export/route.ts`'s exact structure.

**Response 200**: `text/csv` file, `transactions-export-{YYYYMMDD}.csv`, headers:
`transaction_date, member_id, member_name, store_name, transaction_type, billing_line_item_id, amount_ex_tax, tax_rate, amount_inc_tax, payment_method, status`.

---

## 3. Initiate refund from a transaction row — reuses existing endpoint

**No new route.** FR-004/FR-005 call the existing
`POST /api/crm/billing-records/{id}/refund-requests` endpoint (built for 015's detail-page refund
dialog, `SubmitRefundRequestSchema`), unchanged (research.md §6), with one addition: the request
body now also captures `requester_role` (derived server-side from `MOCK_ROLE`, not client-supplied)
so the new hierarchical-approval fields on `RefundRequest` (data-model.md) are populated from the
moment of creation.

**Request body** (existing shape, `SubmitRefundRequestSchema`)

```json
{
  "type": "partial",
  "line_item_refunds": [{ "line_item_id": "BLI-11070-01", "amount": 3000 }],
  "reason": "施設利用中の設備不具合による一部返金"
}
```

**Behavior (unchanged from 015, restated for this feature's UI entry point)**:

- `409` if the target billing record's transaction is not eligible (e.g. its `status` is
  `canceled`, or its `transaction_type` is not `sale`) — the UI never offers the action for such
  rows (FR-004), but the server independently re-validates (Edge Case).
- `400` if `reason` is empty, or if a partial amount exceeds the targeted line item's
  `amount_inc_tax` (Edge Case).
- Response's dialog-guidance text is chosen client-side from `payment_method` (`sbps` →
  90-day-reversal copy; `jaccs` → manual/CASHPOST copy, FR-005) — no server field changes for this;
  the guidance text itself is static UI copy keyed off the existing `payment_method` value already
  returned by the transaction-ledger list endpoint.

**Response 201**: the created `RefundRequest` (now including `requester_role`, with
`approver_*`/`approved_at` all `null` until a decision is made — see `refund-approval.md`).
