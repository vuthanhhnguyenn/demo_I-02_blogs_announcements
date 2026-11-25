# Contract: GET /api/crm/billing-records + GET /api/crm/billing-records/summary

**Feature**: 015-sales-management (FR-001, FR-002, FR-006)
**Phase**: Phase 1 mock route handlers — NEW routes
**Purpose**: Power the Sales Management list page (searchable/filterable table) and its five-figure summary cards.

---

## Request: List

`GET /api/crm/billing-records`

### Query Parameters

| Param                 | Type    | Required | Description                                                                                                                                                                                |
| --------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `store_id`            | string  | no       | Filter by store (ignored/overridden by data-scope narrowing — see below)                                                                                                                   |
| `billing_month`       | string  | no       | `YYYY-MM`; defaults to current month if omitted                                                                                                                                            |
| `billing_type`        | enum    | no       | `monthly` \| `ad_hoc` \| `manual`                                                                                                                                                          |
| `confirmation_status` | enum    | no       | `unconfirmed` \| `confirmed`                                                                                                                                                               |
| `unpaid_only`         | boolean | no       | when `true`, only rows with `outstanding_amount > 0`                                                                                                                                       |
| `search`              | string  | no       | case-insensitive substring match on `id` or `member_name`                                                                                                                                  |
| `sort_by`             | string  | no       | `billing_date` \| `billed_amount` \| `outstanding_amount` \| `id` \| `store_name` \| `member_name` \| `billing_type` \| `payment_method` \| `confirmation_status` (default `billing_date`) |
| `sort_order`          | enum    | no       | `asc` \| `desc` (default `desc`)                                                                                                                                                           |
| `page`                | number  | no       | default `1`                                                                                                                                                                                |
| `limit`               | number  | no       | default `20`                                                                                                                                                                               |

**Data scope (FR-006)**: Server resolves the caller's role + `store_id`/`managedStoreIds` from
the mock auth context (same shim used by `resolveInstructorDataScope`), applies
`resolveSalesDataScope` to restrict rows to System/Headquarter: all stores; Manager: managed
stores; Staff: own store — applied **before** the `store_id`/`billing_month`/etc. query filters.
Trainer/Observer callers receive `403` (FR-005).

---

## Response 200 (list)

```json
{
  "items": [
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
      "billed_amount": 9900,
      "paid_amount": 9900,
      "refunded_amount": 0,
      "outstanding_amount": 0,
      "confirmation_status": "confirmed",
      "is_bad_debt": false,
      "refund_status": "none"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

## Response 403 (role gate)

```json
{ "error": "Sales data is not available for this role" }
```

---

## Request: Summary

`GET /api/crm/billing-records/summary`

### Query Parameters

Same `store_id` + `billing_month` params as the list, same data-scope narrowing, no
pagination/sort/search params.

## Response 200 (summary)

```json
{
  "total_sales": 1234500,
  "total_payments": 1100000,
  "total_outstanding": 98000,
  "total_refunds": 36500,
  "confirmed_count": 42,
  "unconfirmed_count": 8,
  "bad_debt_count": 1,
  "bad_debt_amount": 9900
}
```

---

## Behavioral Rules

1. `unpaid_only=true` combined with `confirmation_status` narrows both conditions (AND, not OR).
2. Search matches `id` OR `member_name`; matching either includes the row (FR-002).
3. Zero matches returns `{ "items": [], "total": 0, ... }`, not an error — list renders the empty
   state (Edge Case: zero billing records for the month).
4. Summary figures are computed over the **same data-scope-narrowed, `billing_month`-filtered**
   set as the list would show with no other filters applied — i.e. summary always reflects the
   full month for the caller's scope, independent of the list's current search/type/status
   filters (SC-002: "determine store's total unpaid from the summary view alone").

---

## Contract Tests (minimum)

- Happy path: no filters — current month, caller's scope, paginated.
- Filter path: `unpaid_only=true&confirmation_status=unconfirmed` — only matching rows.
- Search path: `search=山田` matches by member name; `search=BR-0001` matches by ID.
- Scope path: Staff caller only sees own-store rows regardless of `store_id` param override
  attempt.
- Empty path: month with zero records — `total_sales: 0` etc., empty `items`.
- Denied path: Trainer/Observer caller — `403` on both endpoints.
