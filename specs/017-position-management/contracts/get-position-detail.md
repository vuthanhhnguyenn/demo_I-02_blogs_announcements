# Contract: GET /api/crm/positions/{id}

**Feature**: 017-position-management (Y-01)
**Phase**: Phase 1 mock route handler
**Purpose**: Full position detail with the flat 36-key permission map — feeds the edit form prefill (FR-012) and clone prefill (FR-013 via `?cloneFrom`).

---

## Request

`GET /api/crm/positions/14`

## Response 200

```json
{
  "id": 14,
  "position_name": "アルバイト（スーパー）",
  "description": "店舗業務を幅広く担当するアルバイト向け職位",
  "role": "staff",
  "is_system_managed": false,
  "staff_count": 2,
  "permissions": {
    "can_view_member": true,
    "can_edit_member": true,
    "can_apply_transfer_suspension": false,
    "can_force_withdrawal": false,
    "can_view_gate_log": true,
    "can_edit_gate_setting": true,
    "...": "(all 36 keys always present on read — BE `can_*` naming, see data-model.md §1)"
  },
  "created_at": "2026-07-16T09:00:00Z",
  "updated_at": "2026-07-16T09:00:00Z"
}
```

| Field         | Notes                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------- |
| `permissions` | FULL map — every one of the 36 catalog keys present (`PermissionMapSchema`, non-partial). |
| `description` | Official BE field (API v0.3), nullable, ≤500 chars.                                       |
| `staff_count` | Derived as in the list contract.                                                          |

## Errors

| Status | When                                                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 404    | no position with this id — edit page shows not-found state; invalid `?cloneFrom` falls back to blank create form (spec edge case analog) |
| 500    | unexpected                                                                                                                               |
