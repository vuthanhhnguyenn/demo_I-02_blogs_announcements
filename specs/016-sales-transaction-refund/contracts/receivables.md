# Contract: Receivables (Unpaid List)

**Feature**: 016-sales-transaction-refund (FR-006, FR-007, FR-008, FR-009, FR-010)
**Phase**: Phase 1 mock route handlers — NEW routes
**Purpose**: The unpaid-balances tab (未回収一覧) of the receivables screen — list, per-member
detail, convenience-payment issuance, and bad-debt exclusion/release.

All routes apply `resolveSalesDataScope(MOCK_ROLE, {})` and reject `trainer`/`observer` with `403`
(FR-021), same as `transaction-ledger.md`.

---

## 1. List unpaid receivables — `GET /api/crm/billing-records/receivables`

**Query params**

```
unpaid_month?: string   (YYYY-MM; filters to members with an outstanding amount in this month)
page?: number = 1
page_size?: number = 50
```

**Behavior**: Computed via `billingRecords.getUnpaidReceivables(filters)` (data-model.md), grouped
per member.

**Response 200**

```json
{
  "items": [
    {
      "member_id": "MEM-2278",
      "member_name": "山本大輔",
      "store_id": "STORE-014",
      "store_name": "FIT365八潮店",
      "unpaid_months": ["2026/01", "2026/02", "2026/03"],
      "total_unpaid_amount": 29940,
      "last_billing_date": "2026/03/12",
      "payment_method": "jaccs",
      "receivable_status": "uncollected"
    }
  ],
  "total_count": 1,
  "page": 1,
  "page_size": 50
}
```

Zero members with outstanding balances → `200` with `items: []` (Edge Case: empty state).

---

## 2. Unpaid detail (per member) — `GET /api/crm/billing-records/receivables/{memberId}`

**Behavior**: Returns the Unpaid Receivable summary plus its `Unpaid Line Item[]` (data-model.md).
`404` if the member has no outstanding billing records in the caller's data scope (either genuinely
none, or scoped out by store — same ambiguity the codebase already accepts elsewhere, e.g.
`billing-detail.md`'s 404 convention).

**Response 200**

```json
{
  "member_id": "MEM-2278",
  "member_name": "山本大輔",
  "store_id": "STORE-014",
  "store_name": "FIT365八潮店",
  "total_unpaid_amount": 29940,
  "receivable_status": "uncollected",
  "line_items": [
    {
      "id": "BLI-2278-202601-001",
      "month": "2026/01",
      "contract_type": "main",
      "contract_name": "プレミアム会員",
      "amount": 9980,
      "status": "uncollected",
      "payment_method": "jaccs",
      "jaccs_subrogation_eligible": true
    }
  ]
}
```

---

## 3. Issue convenience-store payment link — `POST /api/crm/billing-records/receivables/convenience-payment`

**Request body**

```json
{ "member_id": "MEM-2278", "line_item_ids": ["BLI-2278-202601-001"] }
```

`line_item_ids` omitted (or empty) → issues for the member's **full** outstanding balance (FR-008
"individual line item or bulk for the member's full unpaid balance").

**Behavior**: Requires `SalesConvenienceIssue` permission (HQ/Manager/Staff — not Trainer/Observer,
data-model.md). Sets `receivable_status: 'convenience_payment_in_progress'` on every targeted
`BillingRecord`. No reason required (FR-008 has no reason requirement, unlike bad-debt exclusion).

**Response 200**

```json
{
  "member_id": "MEM-2278",
  "updated_line_item_ids": ["BLI-2278-202601-001"],
  "receivable_status": "convenience_payment_in_progress"
}
```

---

## 4. Bad-debt exclusion / release — `POST /api/crm/billing-records/receivables/bad-debt-exclusion`

**Request body**

```json
{
  "member_id": "MEM-2400",
  "line_item_ids": ["BLI-2400-202512-001"],
  "action": "exclude",
  "reason": "分割返済の合意が成立したため"
}
```

`action: "exclude" | "release"`. `line_item_ids` omitted → applies to all of the member's
outstanding records (FR-010 "member's unpaid balance ... or an individual unpaid line item").

**Behavior**: Requires `SalesBadDebtExclude` permission — **`403` for Staff** regardless of store
scope (FR-010 "Staff MUST NOT have access to this action"; enforced server-side, not only via
`RoleGatedMenuItem` hiding the option). `400` `{ "error": "reason is required" }` if `reason` is
empty (both directions). Sets/clears `bad_debt_excluded`, `bad_debt_exclusion_reason`,
`bad_debt_excluded_by: <caller>`, `bad_debt_excluded_at: now()`, and updates `receivable_status`
to/from `'bad_debt_excluded'` (data-model.md state transitions) on every targeted `BillingRecord`.

**Response 200**

```json
{
  "member_id": "MEM-2400",
  "updated_line_item_ids": ["BLI-2400-202512-001"],
  "receivable_status": "bad_debt_excluded",
  "bad_debt_excluded_by": "本部 佐藤",
  "bad_debt_excluded_at": "2026-07-13T09:12:00Z"
}
```
