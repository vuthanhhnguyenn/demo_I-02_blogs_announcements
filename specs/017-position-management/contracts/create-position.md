# Contract: POST /api/crm/positions

**Feature**: 017-position-management (Y-01)
**Phase**: Phase 1 mock route handler
**Purpose**: Create a position master (FR-009, FR-010, FR-011). Also the save path for clone mode (research R7).

---

## Request

`POST /api/crm/positions`

```json
{
  "position_name": "アルバイト（スーパー）",
  "role": "staff",
  "description": "店舗業務を幅広く担当するアルバイト向け職位",
  "permissions": {
    "can_view_member": true,
    "can_edit_member": true,
    "can_view_gate_log": true,
    "can_edit_gate_setting": true,
    "can_view_application": true,
    "can_export_member_csv": false
  }
}
```

### Body Fields

| Field           | Type                  | Required | Notes                                                                                               |
| --------------- | --------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `position_name` | string                | yes      | 1–100 chars (400 otherwise); `(role, position_name)` unique (409).                                  |
| `role`          | role enum             | yes      | One of the 5 selectable roles; **immutable after creation**.                                        |
| `description`   | string \| null        | no       | Official BE field (API v0.3); ≤500 chars → 400 otherwise.                                           |
| `permissions`   | partial PermissionMap | no       | Closed 36-key object (`.partial()`); unknown keys → 400 (Zod strict). Omitted keys default `false`. |

`is_system_managed` is NOT accepted (seed-only).

## Response 201

```json
{
  "id": 14,
  "position_name": "アルバイト（スーパー）",
  "role": "staff",
  "created_at": "2026-07-16T09:00:00Z"
}
```

## Errors

| Status | When                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| 400    | name empty/>100, description >500, invalid role, unknown permission key         |
| 409    | `(role, position_name)` already exists — UI shows duplicate-name error (FR-010) |
| 500    | unexpected                                                                      |

## UI behavior on success

Toast 「職位を登録しました」, invalidate positions list query, navigate to `/positions`.
