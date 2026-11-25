# Contract: Get one application detail

**Endpoint**: `GET /api/crm/leaves/{id}`
**Status**: exists — **modify**
**Schema**: `src/app/api/_schemas/leave.schema.ts` → `LeaveDetailSchema`, `GetLeaveDetailResponseSchema`
**Handler**: `src/app/api/crm/leaves/[id]/route.ts`
**Generated client**: `getCrmLeavesByIdOptions` / `getCrmLeavesByIdQueryKey`
**Real-API counterpart**: `GET /api/v1/admin/suspension-applications/{id}` and `GET /api/v1/admin/withdrawal-applications/{id}` (the mock keeps one endpoint over both types; `type` discriminates)
**Requirements**: FR-053 – FR-079

## Path parameters

| Param | Type   | Notes                                         |
| ----- | ------ | --------------------------------------------- |
| `id`  | string | Internal record id — never displayed (FR-009) |

## Response `200`

```jsonc
{
  "leave": {
    // ...all LeaveListItem fields
    "member": {
      /* LeaveMember — NEW, data-model.md entity 3 */
    },
    "reason": "海外出張のため",
    "applicant": "田中 次郎（本人）",
    "is_proxy_applied": true,
    "proxy_applicant": "佐藤 花子（スタッフ）",
    "consent_at": "2026-03-20T10:00:00+09:00",
    "consent_method": "in_person", // CHANGED — enum
    "suspension_fee": 1100, // suspensions only
    "withdrawal_fee": null, // NEW — withdrawals only
    "applied_campaign": "なし",
    "unused_lessons": 2, // BOTH types (Q-07)
    "unpaid_amount": 0,
    "usage_start_date": "2026-07-01", // NEW
    "cancellable": false, // NEW
    "cancellation_blocked_reason": "usage_started", // NEW
    "suspension_history": [
      // NEW
      { "year_month": "2026/04", "status": "active", "application_number": "0000000001" },
      { "year_month": "2026/06", "status": "active", "application_number": "0000000002" },
      { "year_month": "2026/07", "status": "pending-leave", "application_number": "0000000003" },
    ],
    "created_at": "2026-03-20T10:15:00+09:00",
    "updated_at": "2026-03-20T10:15:00+09:00",
  },
}
```

## Behaviour

1. **Readable in any status**, including `completed` — closed applications stay reachable from A-01-01 and from the history strip even though they leave the list (Q-10).
2. **Scope-checked.** An out-of-scope id returns `404`, not `403` — existence must not be disclosed (FR-083).
3. `member` is populated in the same request; the screen must not issue a second member lookup (FR-057a).
4. `unused_lessons` is populated for suspensions as well as withdrawals (Q-07 / FR-068).
5. Exactly one of `suspension_fee` / `withdrawal_fee` is non-null, chosen by `type`.
6. `suspension_history` is derived from the member's applications, read-only (FR-074, research.md §6).

## Errors

| Status | When                                                           |
| ------ | -------------------------------------------------------------- |
| `404`  | Unknown id, or the application lies outside the caller's scope |
| `403`  | Trainer role                                                   |
| `500`  | Unexpected                                                     |

## Not returned

No `status_histories` array — no Phase 1 surface renders it (Q-14). No timeline object: the 承認フロー card derives its two/three steps from `status` and `type` client-side, and there is no current-step highlight (Q-03).
