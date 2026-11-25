# Contract: Upcoming Billing (Next-Month Batch)

**Feature**: 016-sales-transaction-refund (FR-011, FR-012, FR-013)
**Phase**: Phase 1 mock route handlers — one NEW read route; the mutation reuses an existing route.
**Purpose**: The upcoming-billing tab (翌月請求予定) of the receivables screen.

Applies `resolveSalesDataScope(MOCK_ROLE, {})` and rejects `trainer`/`observer` with `403` (FR-021),
same as the other two contracts.

---

## 1. List upcoming billing entries — `GET /api/crm/billing-records/upcoming-billing`

**Query params**

```
page?: number = 1
page_size?: number = 50
```

**Behavior**: Computed via `billingRecords.getUpcomingBilling(filters)` (data-model.md) — records
where `billing_month` is next calendar month and `confirmation_status === 'unconfirmed'`.

**Response 200**

```json
{
  "items": [
    {
      "billing_record_id": "BR-1167",
      "member_id": "MEM-1167",
      "member_name": "池田 さや",
      "billing_type": "with_unpaid_rollover",
      "payment_method": "jaccs",
      "amount": 15960,
      "billing_month": "2026/04",
      "note": "未納金2ヶ月分を加算（2026/02・2026/03分）",
      "unconfirmed": true
    }
  ],
  "total_count": 1,
  "page": 1,
  "page_size": 50,
  "summary": {
    "total_amount": 15960,
    "total_count": 1,
    "sbps_amount": 0,
    "sbps_count": 0,
    "jaccs_amount": 15960,
    "jaccs_count": 1
  }
}
```

The `summary` block (FR-012 SBPS/JACCS breakdown) is computed over the **full unfiltered**
upcoming-billing set in scope, not just the current page, so the summary cards stay accurate
regardless of pagination. Zero upcoming entries → `200` with `items: []`,
`summary.total_count: 0` (Edge Case: empty state, bulk-confirm action disabled client-side).

---

## 2. Confirm all upcoming billing entries — reuses existing endpoint

**No new route.** FR-013's bulk confirm calls the existing
`PATCH /api/crm/billing-records/confirm` endpoint (built for 015's list-level bulk confirm,
research.md §7) with the `id`s returned by endpoint 1 above (typically "confirm all currently
unconfirmed upcoming entries," but any subset the UI selects is equally valid).

**Request body** (existing shape)

```json
{ "ids": ["BR-1167", "BR-1182", "BR-1201"] }
```

**Behavior (unchanged from 015)**: Requires `canPerformSalesAction(MOCK_ROLE, 'confirm', {
hasDelegatedConfirmPermission })` — true for HQ/Manager/System always; for Staff only when their
`staff_permissions` contains the delegated `'F-01.confirm'` code (FR-013, reusing 015's existing
mechanism verbatim). `403` `{ "error": "billing confirmation is restricted..." }` otherwise. Sets
`confirmation_status: 'confirmed'`, `confirmed_by`, `confirmed_at` on each affected record —
identical behavior to the main Sales Management list's bulk confirm, just invoked from this
screen with a different, pre-filtered id set.

**Response 200** (existing shape)

```json
{ "confirmed_ids": ["BR-1167", "BR-1182", "BR-1201"], "skipped_ids": [] }
```

Empty `ids` → `400` `{ "error": "No unconfirmed records selected" }` (Edge Case: zero unconfirmed
entries).
