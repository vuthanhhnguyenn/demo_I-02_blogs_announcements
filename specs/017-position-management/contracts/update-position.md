# Contract: PATCH /api/crm/positions/{id}

**Feature**: 017-position-management (Y-01)
**Phase**: Phase 1 mock route handler
**Purpose**: Partially update a position (FR-012). Role is immutable — the schema has no `role` field (Clarification Q3 / research R8).

---

## Request

`PATCH /api/crm/positions/14`

```json
{
  "position_name": "アルバイト（スーパー）改訂",
  "description": "更新された説明",
  "permissions": {
    "can_export_member_csv": true
  }
}
```

### Body Fields (all optional — omission = no change)

| Field           | Type                  | Notes                                                                                   |
| --------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `position_name` | string                | 1–100 chars; rename re-checks `(role, position_name)` uniqueness (409).                 |
| `description`   | string \| null        | Official BE field (API v0.3); ≤500 chars. Omitted = unchanged, explicit `null` = clear. |
| `permissions`   | partial PermissionMap | Only provided keys are updated; unknown keys → 400.                                     |

**NOT accepted**: `role` (immutable), `is_system_managed` (seed-only). Presence of either → 400 (Zod strict body).

## Response 200

```json
{
  "id": 14,
  "position_name": "アルバイト（スーパー）改訂",
  "role": "staff",
  "updated_at": "2026-07-16T10:00:00Z"
}
```

## Errors

| Status | When                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| 400    | name empty/>100, description >500, unknown permission key, `role`/`is_system_managed` present                      |
| 404    | unknown id                                                                                                         |
| 409    | rename collides within the same role (FR-010)                                                                      |
| 422    | target row has `is_system_managed: true` (system-managed is read-only; API-side only in Phase 1 — no seed sets it) |
| 500    | unexpected                                                                                                         |

## Behavior notes

- Last-write-wins; `updated_at` refreshed on success.
- Permission changes apply to assigned staff from their next request — automatic in the mock (permissions resolved per-request from the table).
- UI: toast 「職位の変更を保存しました」, invalidate list + detail + permissions-preview queries, navigate to `/positions`.
