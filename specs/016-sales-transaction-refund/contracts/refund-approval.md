# Contract: Refund Approval Queue

**Feature**: 016-sales-transaction-refund (FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020)
**Phase**: Phase 1 mock route handlers — NEW routes (refund creation itself is out of scope here;
see `transaction-ledger.md` §3 and 015's existing detail-page dialog for that).
**Purpose**: The refund approval queue (返金手続き一覧) — list, hierarchical approve/reject
(single and bulk), and CSV export.

All routes apply `resolveSalesDataScope(MOCK_ROLE, {})` and reject `trainer`/`observer` with `403`
(FR-021). The decision routes additionally require `SalesRefundApprove` (data-model.md's permission
table) **and** `canApproveRefund(MOCK_ROLE, request.requester_role)` (research.md §5) — both checks
must pass; `SalesRefundApprove` gates "can this role ever approve refunds," while
`canApproveRefund` gates "can this specific role approve _this_ request."

---

## 1. List refund queue — `GET /api/crm/billing-records/refund-requests`

**Query params**

```
status?: 'pending' | 'completed' | 'rejected'
payment_method?: 'sbps' | 'jaccs' | 'cash' | 'other'
requester_role?: 'staff' | 'manager' | 'headquarter'
date_from?: string   (YYYY-MM-DD, matches requested_at)
date_to?: string      (YYYY-MM-DD)
search?: string        (matches refund id or member_name)
sort_by?: 'refund_id' | 'sale_amount' | 'refund_amount' | 'status' | 'requested_at' | 'approved_at'
sort_order?: 'asc' | 'desc'
page?: number = 1
page_size?: number = 50
```

**Behavior**: Computed via `billingRecords.getRefundQueue(filters)` (data-model.md).

**Response 200**

```json
{
  "items": [
    {
      "refund_id": "RF-0158",
      "store_id": "STORE-014",
      "store_name": "FIT365八潮店",
      "member_id": "MEM-20523",
      "member_name": "中島 蓮",
      "product_name": "パーソナルトレーニング（12月分）",
      "sale_amount": 1780,
      "refund_amount": 890,
      "status": "pending",
      "payment_method": "jaccs",
      "requester_id": "10055",
      "requester_name": "山本 直樹",
      "requester_role": "manager",
      "approver_id": null,
      "approver_name": null,
      "approver_role": null,
      "requested_at": "2025-12-10T11:05:00Z",
      "approved_at": null,
      "reason": "担当トレーナーの退職により継続が困難となったため。未消化2回分のみ部分返金"
    }
  ],
  "total_count": 1,
  "page": 1,
  "page_size": 50,
  "pending_summary": { "pending_count": 1, "pending_amount": 890 }
}
```

`pending_summary` (FR-014's banner) is computed over the full unfiltered in-scope set, not just the
current page/filter — matching `upcoming-billing.md`'s summary convention.

---

## 2. Approve/reject a single refund request — `POST /api/crm/billing-records/refund-requests/{id}/decision`

**Request body**

```json
{ "decision": "approve" }
```

or `{ "decision": "reject" }`.

**Behavior**:

- `404` if the refund request doesn't exist or its billing record is outside the caller's data
  scope.
- `409` `{ "error": "refund request is not pending" }` if `status !== 'pending'` (Edge Case:
  deciding an already-decided request).
- `403` `{ "error": "<requester_role> の申請には <required approver level> が必要です" }` when
  `canApproveRefund(MOCK_ROLE, request.requester_role)` is `false` (FR-016) — message text mirrors
  `requiredApproverLabel(requester_role)` from `refund-approval.ts` exactly, so the API error and
  the disabled-button tooltip in the UI never drift apart.
- On `approve`: sets `status: 'completed'` (never leaves it at `'approved'`, FR-017),
  `approver_id/name/role: <caller>`, `approved_at: now()`; recomputes the parent
  `BillingRecord.refunded_amount`/`outstanding_amount`/`refund_status`. This is the "approval =
  immediate refund execution" rule — there is no separate execution step or endpoint.
- On `reject`: sets `status: 'rejected'`, same approver/timestamp fields recorded (rejection is
  also an accountable decision, per FR-019's confirmation-step requirement applying to both
  outcomes).
- This route does **not** itself enforce a confirmation-dialog step (FR-019) — that is a client-side
  requirement (the UI must show the `AlertDialog` before calling this endpoint); the route is the
  action the dialog's confirm button triggers.

**Response 200**: the updated Refund Queue entry (§1 item shape).

---

## 3. Bulk approve/reject — `POST /api/crm/billing-records/refund-requests/bulk-decision`

**Request body**

```json
{ "ids": ["RF-0156", "RF-0158", "RF-0161"], "decision": "approve" }
```

**Behavior**: For each id, applies the same checks as §2. Ids failing the `canApproveRefund` check
are **excluded from processing**, not treated as a request failure (FR-018) — the bulk action
always partially succeeds when some ids are authorized and others aren't, matching the UI's
"selected 3, only 2 approvable" pattern from the mock. Ids that are no longer `pending` (raced by
another decision) are likewise excluded, not errored.

**Response 200**

```json
{
  "decided_ids": ["RF-0156", "RF-0158"],
  "excluded_ids": [{ "id": "RF-0161", "reason": "requires_system_approval" }]
}
```

`decided_ids` empty (zero authorized/pending ids in the selection) → `400`
`{ "error": "No refund requests in this selection can be decided by your role" }` (Edge Case: a
bulk action where every selected request is outside the current user's authority is disabled
client-side, but the server independently rejects it too).

---

## 4. Export refund CSV — `POST /api/crm/billing-records/refund-requests/export`

**Request body**: same filter shape as §1's query params (optional; an empty body exports the
full eligible set).

**Behavior**: Requires `SalesRefundExport` permission (HQ/Manager/System only, FR-020). Filters the
queue to `payment_method !== 'sbps'` and `status === 'completed'` **regardless of any status/method
filter passed in the request body** — these two constraints are always applied server-side, not
merely a UI default (FR-020's "excludes SBPS-settled refunds and includes only approved/completed
refund entries" is a hard rule, not a suggested filter). Builds CSV via
`buildCsv`/`csvFileResponse`/`csvDateStamp` (research.md §9).

**Response 200**: `text/csv` file, `refund-export-{YYYYMMDD}.csv`, headers:
`refund_id, requested_at, member_id, member_name, refund_amount, reason, payment_method, approver_name`.
