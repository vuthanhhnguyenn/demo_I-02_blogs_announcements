# Contract: Send Advance Maintenance Notification

`POST /crm/maintenances/{id}/notifications`

Implements **FR-007 / FR-024 / FR-025 / FR-026 / FR-027** (simplified per the 2026-07-20 clarification). Route file: `src/app/api/crm/maintenances/[id]/notifications/route.ts` (`POST`), registered via `registerRoute()`. This is a **fake mock send** — it flips the record's `notified` flag; there is no real delivery, no send kind, no timestamp, no recipient count, and no completed-status lock. It may be called repeatedly (manual re-send is allowed even after a record is already 済 — the call is idempotent).

## Authorization

- `getAuthUserFromRequest(request)` — 401 if missing/invalid.
- `System` role only. `Headquarter` or lower → 403 `{ error: 'Forbidden' }` (FR-024; permission `CrmMaintenanceNotify`).

## Path parameters

| Param | Type   | Notes        |
| ----- | ------ | ------------ |
| `id`  | string | e.g. `M-006` |

## Request body

None. The confirmation popup (client-side, FR-025) previews the content before the call; the server just flips the flag.

## Response — 200 (`SendCrmMaintenanceNotificationResponseSchema`)

```json
{ "message": "通知を送信しました", "notified": true }
```

**Mock side effect.** On success the mock sets the record's `notified = true`. The client invalidates the list + detail queries and refetches, at which point the record shows 済. When a real backend without the `notified` field is wired in, the refetch simply leaves the record showing 未.

## Error responses

| Status | When                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| 401    | Missing/invalid auth token                                                      |
| 403    | Role is not `System` (FR-024)                                                   |
| 404    | `id` matches no row — `{ error: '該当するメンテナンス情報が見つかりません。' }` |
| 500    | Unexpected error                                                                |

## Notes

- No new mock table — the send mutates the single `notified` boolean on the existing `crmMaintenances` row via the table-layer `notify(id)` method, which returns `'not_found' | CrmMaintenance` so the route stays a thin HTTP translator.
- Sending an already-notified record is a harmless no-op (sets `true` again); in the UI, the detail card keeps a "通知を再送信" button in the 済 state, so a System user can re-send at will (each re-send goes through the same confirm popup and is guarded against double-fire while in flight).
