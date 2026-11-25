# Contract: Get CRM Maintenance Window Detail

`GET /crm/maintenances/{id}`

Implements FR-013 (read-only detail view) and supplies the read side of FR-014/FR-016/FR-019's status- and role-gated UI. Route file: `src/app/api/crm/maintenances/[id]/route.ts` (`GET`).

## Authorization

Same as the list endpoint: `System` or `Headquarter`, else 403 (FR-020). Both roles receive an identical payload — edit/delete affordances are gated client-side by role (FR-014) and, redundantly, server-side on the mutation endpoints themselves (research.md §4).

## Path parameters

| Param | Type   | Notes        |
| ----- | ------ | ------------ |
| `id`  | string | e.g. `M-005` |

## Response — 200 (`CrmMaintenanceDetailResponseSchema`)

```json
{
  "id": "M-005",
  "title": "検索インデックス再構築",
  "startsAt": "2026-07-16T10:00:00.000Z",
  "endsAt": "2026-07-16T16:00:00.000Z",
  "message": "検索インデックスの再構築のため、一時的にアクセスを制限します。",
  "note": "夜間バッチと重複しないよう時間帯を調整済み",
  "status": "in_progress",
  "allowedUsers": [
    { "staffId": "STF-001", "name": "田中 太郎", "role": "headquarter" },
    { "staffId": "STF-005", "name": "渡辺 健太", "role": "manager" }
  ],
  "createdBy": "STF-002",
  "updatedBy": null,
  "createdAt": "2026-07-09T09:00:00.000Z",
  "updatedAt": null,
  "notified": true
}
```

**`notified` (FR-007 delta, optional/mock-ahead).** `true` = 通知済み (済), `false` = 未. This is a mock-only extension absent from `backend-api.md`'s detail response and declared optional; the detail card reads it with a fallback (`notified ?? false`) so it renders "未" and stays compilable if a real backend omits it. The card always shows a send button gated by `Permission.CrmMaintenanceNotify` (System-only) that opens the confirm popup — labeled "通知を送信" while 未 and "通知を再送信" once 済, so manual re-send after a successful send is allowed. Simplified per the 2026-07-20 clarification — no send kind, timestamp, recipient count, or completed-lock.

The detail page (User Story 2) and the edit form (User Story 3) both use `status` from this payload — never a hardcoded/cached value — to decide whether to show edit/delete controls to `System` (FR-014) and whether to disable the start-datetime field (FR-016). `allowedUsers[].role` is `StaffRoleSchema`'s lowercase enum (research.md §5), resolved from `db.staffs` at read time — not stored on the join row (data-model.md).

## Error responses

| Status | When                                                                                    |
| ------ | --------------------------------------------------------------------------------------- |
| 401    | Missing/invalid auth token                                                              |
| 403    | Role is not `System`/`Headquarter`                                                      |
| 404    | `id` does not match any row — `{ error: '該当するメンテナンス情報が見つかりません。' }` |
| 500    | Unexpected error                                                                        |
