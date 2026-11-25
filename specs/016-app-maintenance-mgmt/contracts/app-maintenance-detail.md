# Contract: Get App Maintenance Window Detail

`GET /crm/app-maintenances/{id}`

Implements FR-013 (pre-fill the edit form) and supplies the read side of FR-010/FR-011's status-gated UI. Route file: `src/app/api/crm/app-maintenances/[id]/route.ts` (`GET`).

## Authorization

Same as the list endpoint: every role except `Trainer` may view (`System`, `Headquarter`, `Manager`, `Staff`, `Observer`); `Trainer` → 403. (All viewers receive an identical payload — edit/delete affordances are gated client-side by permission and, redundantly, server-side on the mutation endpoints, which allow only `System`/`Headquarter` — research.md §4; Y-06 v2 権限マトリクス, spec FR-014.)

## Path parameters

| Param | Type   | Notes         |
| ----- | ------ | ------------- |
| `id`  | string | e.g. `AM-005` |

## Response — 200 (`AppMaintenanceDetailResponseSchema`)

```json
{
  "id": "AM-005",
  "targetBrand": "fit365",
  "startsAt": "2026-07-10T09:00:00.000Z",
  "endsAt": "2026-07-10T13:00:00.000Z",
  "message": "定期メンテナンスを実施します。",
  "status": "in_progress",
  "createdBy": "STF-001",
  "updatedBy": null,
  "createdAt": "2026-06-02T05:00:00.000Z",
  "updatedAt": null
}
```

The edit form (User Story 3) uses `status` from this payload — not a hardcoded sample constant as in the prototype (spec Assumptions) — to decide whether to disable the start-datetime field (FR-010) and to disable the brand selector unconditionally (Q4/research.md §8).

## Error responses

| Status | When                                                                                    |
| ------ | --------------------------------------------------------------------------------------- |
| 401    | Missing/invalid auth token                                                              |
| 403    | Role is `Trainer` (no view access)                                                      |
| 404    | `id` does not match any row — `{ error: '該当するメンテナンス情報が見つかりません。' }` |
| 500    | Unexpected error                                                                        |
