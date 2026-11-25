# Contract: GET /api/crm/positions

**Feature**: 017-position-management (Y-01)
**Phase**: Phase 1 mock route handler (upgrades the existing endpoint)
**Purpose**: Paginated position-master list for the Y-01 list table (FR-001〜FR-006). BE-shaped response; API design v0.3 (2026-07-29) made the previously-flagged params/fields official, leaving only naming deltas (research R2/R13).

---

## Request

`GET /api/crm/positions?search=&permission=&role=&includeTotalAll=true&page=1&limit=50&sort=role&order=asc`

### Query Parameters

| Param             | Type                    | Required | Default | Notes                                                                                                                                                                           |
| ----------------- | ----------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search`          | string                  | no       | —       | Case-insensitive partial match on `position_name` (FR-002). Official BE param since v0.3; **≤100 chars** (BE `maxLength`) → 400 otherwise.                                      |
| `permission`      | PermissionKey           | no       | —       | Reverse filter: only positions where this key is granted (FR-003). BE `can_*` naming (e.g. `can_create_survey`); invalid key → 400. Param name aligned to BE v0.3 (2026-07-29). |
| `includeTotalAll` | boolean                 | no       | false   | When `true`, `pagination` additionally carries `totalAllItems` (baseline count). Aligned to the BE-wide `IncludeTotalAll` convention.                                           |
| `role`            | role enum               | no       | —       | BE param. `headquarter\|manager\|staff\|trainer\|observer`.                                                                                                                     |
| `page`            | int ≥1                  | no       | 1       | BE param.                                                                                                                                                                       |
| `limit`           | int                     | no       | 50      | BE param. UI page sizes: 25/50/100/200.                                                                                                                                         |
| `sort`            | `role\|name\|createdAt` | no       | `role`  | BE param. `role` sorts by enum definition order.                                                                                                                                |
| `order`           | `asc\|desc`             | no       | `asc`   | BE param.                                                                                                                                                                       |

## Response 200

```json
{
  "items": [
    {
      "id": 6,
      "position_name": "正社員スタッフ",
      "description": "店舗日常業務全般を担当する正社員向け職位",
      "role": "staff",
      "is_system_managed": false,
      "staff_count": 3,
      "grantedCategoryCount": 4,
      "totalCategoryCount": 10,
      "created_at": "2026-06-05T09:00:00Z",
      "updated_at": "2026-06-05T09:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "totalItems": 13, "totalPages": 1, "totalAllItems": 13 }
}
```

| Field                                                 | Notes                                                                                                                                                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items[].description`                                 | Official BE field (API v0.3), nullable, ≤500 chars.                                                                                                                                                                        |
| `items[].staff_count`                                 | Derived: non-deleted staffs with matching `position_id` (BE rule).                                                                                                                                                         |
| `items[].grantedCategoryCount` / `totalCategoryCount` | Categories with ≥1 granted key / 10 — renders アクセス権限数 "N / 10" (**category axis**, not a flag count). Field names verbatim from BE v0.3.                                                                            |
| `pagination.totalItems`                               | Count AFTER search/permission/role filters — the banner's "M 件を抽出中".                                                                                                                                                  |
| `pagination.totalAllItems`                            | Baseline (unfiltered) count — the banner's "全 N 件中" and header badge when no filter is active. Returned only when `includeTotalAll=true` (BE v0.3 shape, matching the project's terms/routine/app-maintenance pattern). |

## Errors

| Status | When                                                                     |
| ------ | ------------------------------------------------------------------------ |
| 400    | `search` >100 chars, invalid `permission` / `role` / paging params (Zod) |
| 500    | unexpected                                                               |

## Consumers & migration note

The staffs feature currently reads `{ positions: Position[] }` from this endpoint (filter dropdowns). This contract **replaces** that shape with `{ items, pagination, totalAll }` — update those consumers in the same change (research R2).
