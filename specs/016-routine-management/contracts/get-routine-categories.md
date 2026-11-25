# Contract: GET /api/crm/routine-categories

**Feature**: 016-routine-management (Y-09)
**Phase**: Phase 1 mock route handler
**Purpose**: Read-only list of the fixed Routine Category reference data, used to populate the list screen's category filter and the create/edit form's category select (research.md R3). No create/edit/delete route exists for this resource — category CRUD (source FR-010) is explicitly out of scope for this feature.

---

## Request

`GET /api/crm/routine-categories`

No query parameters — always returns the full, fixed set (6 rows), ordered by `sortOrder`.

### Authorization

Requires `Permission.RoutinesView` (same gate as the routine list itself — this is purely a filter/select data source for that screen).

---

## Response 200

```json
{
  "items": [
    { "id": "RC-001", "name": "ビギナー向け", "sortOrder": 1 },
    { "id": "RC-002", "name": "シェイプアップ", "sortOrder": 2 },
    { "id": "RC-003", "name": "ダイエット", "sortOrder": 3 },
    { "id": "RC-004", "name": "運動不足解消", "sortOrder": 4 },
    { "id": "RC-005", "name": "筋肥大", "sortOrder": 5 },
    { "id": "RC-006", "name": "筋力アップ", "sortOrder": 6 }
  ]
}
```

## Response 403

```json
{ "error": "Forbidden", "code": "E-AUTH-103" }
```

---

## Contract Tests (minimum)

- Happy path: returns all 6 seeded categories in `sortOrder` order, regardless of caller filters (there are none).
- Permission path: a caller without `RoutinesView` receives `403 E-AUTH-103`.
