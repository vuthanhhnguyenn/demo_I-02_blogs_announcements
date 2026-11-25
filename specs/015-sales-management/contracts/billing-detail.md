# Contract: GET /api/crm/billing-records/{id}

**Feature**: 015-sales-management (FR-008)
**Phase**: Phase 1 mock route handler — NEW route
**Purpose**: Power the Billing Detail page — basic info, summary, line items (each with payment status), fee-adjustment/refund history.

---

## Request

`GET /api/crm/billing-records/{id}`

**Data scope**: Same `resolveSalesDataScope` check as the list — `404` if the record exists but
is outside the caller's store scope (not `403`, to avoid leaking record existence across stores,
consistent with `studios/[id]` precedent).

---

## Response 200

```json
{
  "id": "BR-0001",
  "store_id": "STORE-001",
  "store_name": "JOYFIT渋谷店",
  "member_id": "MEM-0001",
  "member_name": "山田 太郎",
  "billing_type": "monthly",
  "billing_month": "2026-07",
  "billing_date": "2026/07/01",
  "payment_method": "sbps",
  "notes": null,
  "billed_amount": 9900,
  "paid_amount": 9900,
  "refunded_amount": 0,
  "outstanding_amount": 0,
  "confirmation_status": "confirmed",
  "is_bad_debt": false,
  "refund_status": "none",
  "confirmed_by": "佐藤 花子",
  "confirmed_at": "2026-07-02T01:00:00.000Z",
  "created_at": "2026-07-01T00:05:00.000Z",
  "updated_at": "2026-07-02T01:00:00.000Z",
  "updated_by": "佐藤 花子",
  "line_items": [
    {
      "id": "BLI-0001",
      "source": "contract",
      "contract_id": "MC-0001",
      "label": "月会費（レギュラー会員）",
      "amount": 9900,
      "tax_rate": 0.1,
      "reason": null,
      "payment_status": "confirmed",
      "created_at": "2026-07-01T00:05:00.000Z",
      "created_by": "System"
    }
  ],
  "fee_adjustments": [],
  "refund_requests": []
}
```

## Response 404

```json
{ "error": "Billing record not found" }
```

---

## Behavioral Rules

1. `line_items[].payment_status` is the single field the detail UI reads to disable the receipt
   download action (FR-013 / Edge Case): download is enabled only when `payment_status ===
'confirmed'`.
2. `fee_adjustments` and `refund_requests` are returned newest-first, mirroring the
   `BrandChangeHistoryItemSchema` history-tab convention.
3. Editing affordances (add line item, apply fee adjustment) are a **client-side** read of
   `confirmation_status === 'unconfirmed'` for disabling controls, but every mutation below
   independently re-checks this server-side — the GET response is not itself an authorization
   decision.

---

## Contract Tests (minimum)

- Happy path: existing ID in caller's scope — full aggregate payload.
- Not-found path: unknown ID — `404`.
- Scope path: existing ID at a store outside caller's scope — `404` (not `403`).
- Gating path: a `confirmed` record's response still includes `confirmation_status: 'confirmed'`
  so the client can disable line-item/fee-adjustment controls.
