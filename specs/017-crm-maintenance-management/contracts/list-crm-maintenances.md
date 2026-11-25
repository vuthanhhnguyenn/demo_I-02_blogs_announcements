# Contract: List CRM Maintenance Windows

`GET /crm/maintenances`

Implements FR-010, FR-011, FR-021. Route file: `src/app/api/crm/maintenances/route.ts` (`GET`), registered via `registerRoute()` following the `src/app/api/crm/app-maintenances/route.ts` pattern (real auth, no hardcoded mock role — research.md §1/§4).

## Authorization

- `getAuthUserFromRequest(request)` — 401 if missing/invalid.
- Allowed roles: `System`, `Headquarter`. Any other role → 403 `{ error: 'Forbidden' }` (FR-020).

## Query parameters (`GetCrmMaintenancesQuerySchema`)

| Param    | Type                                        | Default      | Notes                                                                  |
| -------- | ------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| `page`   | int ≥ 1                                     | `1`          |                                                                        |
| `limit`  | `25 \| 50 \| 100 \| 200`                    | `50`         | FR-010                                                                 |
| `search` | string                                      | —            | Partial match against `id` OR `title` (FR-010)                         |
| `status` | `'planned' \| 'in_progress' \| 'completed'` | —            | Filters on the **derived** value, not a stored column (FR-010, FR-011) |
| `sort`   | `'startsAt' \| 'endsAt' \| 'createdAt'`     | `'startsAt'` | FR-010                                                                 |
| `order`  | `'asc' \| 'desc'`                           | `'desc'`     | FR-010                                                                 |

## Response — 200 (`GetCrmMaintenancesResponseSchema`)

```json
{
  "items": [
    {
      "id": "M-005",
      "title": "検索インデックス再構築",
      "startsAt": "2026-07-16T10:00:00.000Z",
      "endsAt": "2026-07-16T16:00:00.000Z",
      "status": "in_progress",
      "allowedUserCount": 2,
      "createdAt": "2026-07-09T09:00:00.000Z",
      "notified": true
    }
  ],
  "pagination": { "page": 1, "limit": 50, "totalItems": 6, "totalPages": 1 }
}
```

Empty result (no rows, or filters exclude all rows): `items: []`, `pagination.totalItems: 0` — the list page renders FR-021's empty vs. filtered-empty state locally based on whether `search`/`status` is active, no special server field needed.

## Error responses

| Status | When                                                                               |
| ------ | ---------------------------------------------------------------------------------- |
| 400    | Query fails Zod validation (e.g. invalid `limit`) — `{ error, details: string[] }` |
| 401    | Missing/invalid auth token                                                         |
| 403    | Role is not `System`/`Headquarter`                                                 |
| 500    | Unexpected error                                                                   |

## Notes

- Status filtering translates to a `starts_at`/`ends_at` vs. `now()` comparison inside the table method, not a `WHERE status = ...` (status is never stored — FR-011).
- `allowedUserCount` is `crmMaintenanceAllowedUsers` rows for that `crm_maintenance_id`, counted at read time — not a denormalized counter column.
- No dedicated staff-search query params on this endpoint — FR-007's staff search is a separate call to the existing `GET /crm/staffs` (research.md §5), not a param on this list.
- **`notified` (FR-007 delta, optional/mock-ahead)**: `notified_at !== null` for the row — `true` = 済, `false` = 未. The list renders — (not 済/未) for `completed` rows regardless, deriving that from `status` client-side. This field is a mock-only extension not present in `backend-api.md`'s list response; it is declared optional so the client falls back to `false` when a real backend omits it.
