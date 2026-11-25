# Contract: Manual Billing Registration

**Feature**: 015-sales-management (FR-014, FR-015, FR-016, FR-017, User Story 3)
**Phase**: Phase 1 mock route handlers — NEW routes
**Purpose**: Power the manual registration screen — store picker, member picker scoped to store, line items, submit.

---

## 1. Members scoped to a store — `GET /api/crm/stores/{storeId}/members`

Reused/extended if an equivalent store-scoped member lookup already exists elsewhere in the
member management feature; if not, added here as a thin list (`id`, `name`, `has_unpaid`) —
**not** a full member-detail endpoint. Powers the Store → Member cascading picker
(research.md §4): the member field is disabled until `store_id` is chosen and its options come
from this endpoint keyed on the watched `store_id`.

**Response 200**

```json
{ "members": [{ "id": "MEM-0001", "name": "山田 太郎", "has_unpaid": false }] }
```

---

## 2. Submit manual registration — `POST /api/crm/billing-records/manual`

**Request body**

```json
{
  "store_id": "STORE-001",
  "member_id": "MEM-0001",
  "billing_month": "2026-08",
  "confirmation_status": "unconfirmed",
  "line_items": [
    { "source": "contract", "contract_id": "MC-0002" },
    {
      "source": "manual",
      "label": "施設利用料",
      "amount": 2200,
      "tax_rate": 0.1,
      "reason": "臨時利用分"
    }
  ]
}
```

**Behavior**:

- `billing_month` is required — `400` `{ "error": "billing_month is required" }` if missing
  (FR-017).
- At least one line item required — `400` if `line_items` is empty (User Story 3 verification:
  "add at least one line item").
- `422` `{ "error": "member has an outstanding unpaid balance" }` when
  `billingRecords.hasOutstandingBalance(member_id)` is true — blocks the **entire** submission,
  not just the chargeable item, since manual registration always adds a chargeable line item
  (FR-015, SC-005).
- `confirmation_status` may be submitted as `confirmed` directly (skipping the separate confirm
  step), subject to the same `canPerformSalesAction(role, 'confirm', ...)` check as
  [billing-mutations.md #2](billing-mutations.md) (FR-016) — `403` if the caller isn't authorized
  to confirm and requests `confirmed`.
- Each `source: 'manual'` line item requires `reason` (same rule as FR-009).
- Creates a new `BillingRecord` with `billing_type: 'manual'`, computes `billed_amount` from the
  submitted line items, `outstanding_amount = billed_amount` (nothing paid yet).

**Response 201**

```json
{ "id": "BR-0042", "billing_type": "manual", "confirmation_status": "unconfirmed" }
```

**Response 422** (outstanding balance)

```json
{ "error": "Member has an outstanding unpaid balance and cannot be billed until it is resolved" }
```

---

## Behavioral Rules

1. Changing `store_id` after `member_id`/`line_items` are set clears both — this is a
   **client-side form** behavior (`form.resetField`), not a server contract, but the server does
   not need to defend against a stale `member_id` belonging to a different store: it
   independently validates `member_id` belongs to `store_id` and returns `400` if not
   (defense in depth — FR-014 Acceptance Scenario 4 is a UX guarantee, not a security boundary,
   but cross-store submission is still rejected).
2. The outstanding-balance check (#2) re-reads current `billingRecords` state at submit time — a
   balance that appeared _after_ the member was selected (e.g. another staff member billed them
   in the interim) still blocks submission.

### Client-side gating (from the source prototype, `sales-register.tsx`)

Not enforced by the API — implemented in the form component per research.md §4 — but documented
here so the contract and the UI stay in sync:

- The 請求明細情報 line-item section (its "明細追加" button, and the empty-state "明細を追加"
  button inside its table) is **disabled** until `member_id` is set. While disabled, it shows
  the guard text 「先に利用者を選択してください。」 instead of the table's normal empty state.
- The add-line-item dialog's "契約から選択" (from-contract) picker shows the same guard text
  in place of the contract combobox whenever the member's contract list is empty — which is
  always true before `member_id` is set, and may also be true after selection if the member
  has no contracts.
- The line-item table itself is always rendered on the page as items are added — this **is**
  the "review before registering" surface (FR-014); there is no separate preview screen between
  building line items and clicking submit.
- Two separate submit controls exist, both gated by `canSubmit` (`member_id` set, no
  outstanding-balance block, ≥1 line item, `billing_month` set): "登録" calls this endpoint
  directly with `confirmation_status: 'unconfirmed'`; "確定状態で登録" first opens a
  confirmation dialog (store, member, billing date, `billing_month`, line-item count, tax-
  included total) and only calls this endpoint with `confirmation_status: 'confirmed'` after the
  user confirms (FR-016).

---

## Contract Tests (minimum)

- Happy path: store → member (no unpaid) → one manual line item → submit → `201`, appears in the
  list (User Story 3 verification).
- Blocked path: member with `has_unpaid: true` → `422` on submit attempt.
- Missing month: omit `billing_month` → `400`.
- Empty line items: `line_items: []` → `400`.
- Cross-store mismatch: `member_id` not belonging to `store_id` → `400`.
- Confirm-on-submit: `confirmation_status: 'confirmed'` from an unauthorized-to-confirm Staff
  (no delegated permission) → `403`.
