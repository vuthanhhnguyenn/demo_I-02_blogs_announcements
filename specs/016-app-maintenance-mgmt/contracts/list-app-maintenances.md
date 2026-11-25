# Contract: List App Maintenance Windows

`GET /crm/app-maintenances`

Implements FR-001–FR-005. Route file: `src/app/api/crm/app-maintenances/route.ts` (`GET`), registered via `registerRoute()` following the `src/app/api/crm/entry-exit-logs/route.ts` pattern (real auth, no hardcoded mock role — research.md §4).

## Authorization

- `getAuthUserFromRequest(request)` — 401 if missing/invalid.
- Allowed roles (view): `System`, `Headquarter`, `Manager`, `Staff`, `Observer` — i.e. every role except `Trainer`. `Trainer` → 403 `{ error: 'Forbidden' }`. (Y-06 v2 権限マトリクス — see spec FR-014.)

## Query parameters (`GetAppMaintenancesQuerySchema`)

| Param    | Type                                        | Default      | Notes                                                                  |
| -------- | ------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| `page`   | int ≥ 1                                     | `1`          |                                                                        |
| `limit`  | `25 \| 50 \| 100 \| 200`                    | `50`         | FR-005                                                                 |
| `search` | string                                      | —            | Partial match against `id` OR `message` (FR-002)                       |
| `brand`  | `'joyfit' \| 'fit365'`                      | —            | Omitted = all brands (FR-003)                                          |
| `status` | `'planned' \| 'in_progress' \| 'completed'` | —            | Filters on the **derived** value, not a stored column (FR-003, FR-007) |
| `sort`   | `'startsAt' \| 'endsAt'`                    | `'startsAt'` | FR-004                                                                 |
| `order`  | `'asc' \| 'desc'`                           | `'desc'`     | FR-004                                                                 |

## Response — 200 (`GetAppMaintenancesResponseSchema`)

```json
{
  "items": [
    {
      "id": "AM-005",
      "targetBrand": "fit365",
      "startsAt": "2026-07-10T09:00:00.000Z",
      "endsAt": "2026-07-10T13:00:00.000Z",
      "message": "定期メンテナンスを実施します。",
      "status": "in_progress",
      "createdAt": "2026-06-02T05:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "totalItems": 6, "totalPages": 1 }
}
```

Empty result (no rows, or filters exclude all rows): `items: []`, `pagination.totalItems: 0` — the list page renders FR-006's empty state locally based on whether `search`/filters are active, no special server field needed.

## Error responses

| Status | When                                                                               |
| ------ | ---------------------------------------------------------------------------------- |
| 400    | Query fails Zod validation (e.g. invalid `limit`) — `{ error, details: string[] }` |
| 401    | Missing/invalid auth token                                                         |
| 403    | Role is `Trainer` (no view access)                                                 |
| 500    | Unexpected error                                                                   |

## Notes

- Status filtering translates to a `starts_at`/`ends_at` vs. `now()` comparison inside the table method, not a `WHERE status = ...` (status is never stored — FR-007).
- No `fromDate`/`toDate` range parameters (spec's Out of Scope).
