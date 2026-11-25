# Contract: Approve / Reject / Cancel / Memos

**Status**: four existing routes, all **reworked**
**Requirements**: FR-028 – FR-038, FR-042, FR-062

Common to every endpoint below: 401 unauthenticated; **403** when the caller lacks `Permission.MembershipApplicationsApprove` (memos require only `…View`); **404** when the ID is unknown or outside `getAllowedStoreIds(user)`. None of these checks exist in the current routes.

> `MembershipApplicationsApprove` is today granted to `System` only. FR-042 requires Headquarter, Manager, and Staff to hold it too — a change in `src/constants/permission.constants.ts`, not in these routes. Cancel deliberately reuses this same key (research R6).

---

## 1. Approve — `POST /{id}/approve`

**Request**: `{ }` — no body fields are required. Approval carries no free-text reason in v5; the decision context lives in the timeline.

**Guards**, in order:

| Order | Guard                                                                        | Failure                 |
| ----- | ---------------------------------------------------------------------------- | ----------------------- |
| 1     | status is `pending`                                                          | 409 `invalid_status`    |
| 2     | `application_source === '管理画面'` ⇒ `agreement_datetime !== null` (FR-028) | 409 `agreement_missing` |
| 3     | a blacklist match does **not** block (FR-021)                                | —                       |

**Effects** (FR-030): status → `approved`; `approved_by` / `approved_at` recorded from the caller's session; a system timeline entry for the approval and the completion notification; **and, when an exemption applied, a further entry naming the exemption and its justification** — the approval log is where the ⚠️ provisional exemption decision becomes auditable.

**Response `200`**: the updated application detail.

**UI notes** (FR-029): the confirmation dialog restates applicant, store, plan, any exemption, and the resulting initial-charge total; on a blacklist match it warns explicitly and the confirm button reads **リスクを確認して承認する**.

---

## 2. Reject — `POST /{id}/reject`

**Request**:

```jsonc
{
  "rejection_reason": "identity_incomplete", // REQUIRED — enum, exactly four values
  "rejection_supplement": "本人確認書類の氏名が不一致", // optional free text
}
```

`rejection_reason` ∈ `identity_incomplete` 本人確認不備 · `age_restriction` 年齢制限 · `blacklist_match` BL該当 · `other` その他.
This **replaces** the current `rejection_reason: z.string().min(1)` free-text field (FR-031). An unrecognised value is a 400, not a silent pass-through.

**Guards**: status is `pending` → else 409.

**Effects** (FR-032): status → `rejected`; `rejected_by` / `rejected_at` / `rejection_reason` / `rejection_supplement` recorded; two system timeline entries — one for the reason (including the supplement when given), one for the applicant notification together with the payment-authorisation release.

**UI notes**: the dialog states that held payment information is released immediately and that the applicant is told only of the rejection itself; the reject action stays disabled until a standard reason is selected (FR-031).

---

## 3. Cancel — `POST /{id}/cancel`

**Request**: `{ "cancellation_reason": "…" }` — mandatory, non-empty (FR-033).

**Guards** — these are the substance of this endpoint and none of them exist today. The current handler is a stub: it sets `cancelled` and returns a hard-coded `refund_amount: 5000` with no checks at all.

| Order | Guard                                            | Failure                   |
| ----- | ------------------------------------------------ | ------------------------- |
| 1     | status ∈ `{pending, approved, auto_approved}`    | 409 `invalid_status`      |
| 2     | `usage_start_date` strictly after today (FR-034) | 409 `usage_start_reached` |
| 3     | today's `same_day_cancel_count < 2` (FR-034)     | 409 `same_day_limit`      |
| 4     | `cancellation_reason` non-empty                  | 400                       |

**Effects** (FR-036): status → `cancelled`; `same_day_cancel_count` incremented (reset first when `same_day_cancel_date` is not today); `cancelled_by` / `cancelled_at` / `cancellation_reason` recorded; a system timeline entry carrying the reason **and** the refund handling implied by the payment method.

**Response `200`**: `{ "application": {…}, "same_day_cancel_count": 1 }` — the client shows the updated counter without a refetch.

**Refund guidance** (FR-035) is presented by the client from `payment_method`: credit card → cancellation within 90 days; direct debit → manual refund or CASHPOST. The server does not perform payment operations (spec Assumptions).

**UI notes**: the cancel dialog shows the same-day count against the limit of 2 and escalates its treatment at 1 and at 2; the two 409 cases surface as distinct blocked-reason dialogs, not one generic error.

---

## 4. Memos — `POST /{id}/memos`, `DELETE /{id}/memos/{memoId}`

**Create** (FR-038): `{ "content": "…" }`, non-empty after trimming — whitespace-only is a 400, and the client disables the add action for the same condition.
**Effect**: prepends a `kind: "memo"` timeline entry with the caller as operator.

**Delete** (FR-037): 409 when the target entry is `kind: "system"` — system records are never deletable. The UI offers no delete affordance on system entries and states why in the memo panel; the server check is what actually guarantees it.

Both require `MembershipApplicationsView` plus store scope. Observer holds View, so memo endpoints are reachable by Observer by design — FR-063 withholds only approve, reject, cancel, and admin enrolment from that role.
</content>
