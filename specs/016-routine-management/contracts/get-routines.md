# Contract: GET /api/crm/routines

**Feature**: 016-routine-management (Y-09)
**Phase**: Phase 1 mock route handler
**Purpose**: Paginated, searchable, filterable list of official HQ routines for the list screen (FR-001–FR-005).

---

## Request

`GET /api/crm/routines`

### Query Parameters

| Param           | Type                                                        | Required | Default        | Description                                 |
| --------------- | ----------------------------------------------------------- | -------- | -------------- | ------------------------------------------- |
| `page`          | number                                                      | no       | `1`            | Page number                                 |
| `limit`         | number                                                      | no       | `50` (max 200) | Page size (FR-004)                          |
| `search`        | string                                                      | no       | —              | Partial match on routine name only (FR-002) |
| `categoryId`    | string                                                      | no       | —              | Single-select category filter (FR-003)      |
| `publishStatus` | `unpublished` \| `published`                                | no       | —              | Single-select status filter (FR-003)        |
| `sortBy`        | `name` \| `exerciseCount` \| `publishStatus` \| `updatedAt` | no       | `updatedAt`    | FR-004                                      |
| `sortOrder`     | `asc` \| `desc`                                             | no       | `desc`         | FR-004                                      |

### Authorization

Requires `Permission.RoutinesView`, enforced at the page-route level (client-side `useAuthUser()` gate per this codebase's convention — no server-side `hasPermission()` recheck on the route handler itself, matching the sibling `GET /crm/exercises` endpoint). Reads `WHERE origin='official' AND deletedAt IS NULL` — member-authored routines are never exposed by this endpoint.

---

## Response 200

```json
{
  "items": [
    {
      "id": "RT-001",
      "routineCode": "RT-00031",
      "name": "ビギナー全身ルーティン",
      "categoryId": "RC-001",
      "categoryName": "ビギナー向け",
      "exerciseCount": 5,
      "publishStatus": "published",
      "updatedAt": "2026-06-05T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

## Response 200 (empty)

```json
{ "items": [], "pagination": { "page": 1, "limit": 50, "totalItems": 0, "totalPages": 0 } }
```

The client distinguishes a filtered-to-zero result from a genuinely empty catalog by whether any filter/search differs from its default (FR-005) — this is a client-side concern, not signaled differently by this endpoint.

## Response 403

```json
{ "error": "Forbidden", "code": "E-AUTH-103" }
```

## Response 500

```json
{ "error": "Failed to fetch routines" }
```

---

## Behavioral Rules

1. `search` matches case-insensitively against `name` only (not description, not routineCode) — matches `backend-api.md`'s "keyword matches name only."
2. `categoryId` and `publishStatus` are ANDed together with `search`; omitted filters place no constraint.
3. Sorting is applied server-side; the client never re-sorts a fetched page.
4. Default sort is `updatedAt desc` when no `sortBy`/`sortOrder` is supplied (FR-001).
5. `categoryName` is resolved server-side from `RoutineCategory` at read time — never stored redundantly on the routine record beyond `categoryId`.

---

## Contract Tests (minimum)

- Happy path: default filters return all official, non-deleted routines, most recently updated first.
- Filter path: each of `search`, `categoryId`, `publishStatus` independently narrows the result set.
- Combination path: multiple filters ANDed together narrow further, not OR.
- Sort path: each `sortBy` value (name, exerciseCount, publishStatus, updatedAt) toggles correctly with `sortOrder`.
- Pagination path: `page`/`limit` slice correctly; `pagination.totalItems`/`totalPages` reflect the filtered (not global) count.
- Empty path: a filter combination matching nothing returns `{ "items": [], "pagination": {..., "totalItems": 0} }`.
- Scope path: a member-authored (`origin != 'official'`) or logically-deleted routine never appears in results.
