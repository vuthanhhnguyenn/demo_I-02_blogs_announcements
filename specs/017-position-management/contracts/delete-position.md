# Contract: DELETE /api/crm/positions/{id}

**Feature**: 017-position-management (Y-01)
**Phase**: Phase 1 mock route handler
**Purpose**: Physically delete an unused position (FR-014). Guard order mirrors the BE decision table (research R10).

---

## Request

`DELETE /api/crm/positions/13`

No body.

## Response 204

No content. The row is physically removed (positions have no soft delete).

## Errors (evaluated in this order)

| Status | When                                                           | UI surface                                                                                  |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 404    | unknown id                                                     | toast error; list refetch                                                                   |
| 422    | `is_system_managed: true`                                      | API-side guard only in Phase 1 (no seed sets it; no dedicated UI state — spec Out of Scope) |
| 409    | `staff_count ≥ 1` (non-deleted staffs reference this position) | defense-in-depth — the UI already disables the menu item as 「削除（割当あり）」 (PAR027)   |
| 500    | unexpected                                                     | toast error                                                                                 |

## UI behavior

- Delete only reachable via the confirmation dialog 「職位を削除しますか？」/「「{name}」を削除します。この操作は取り消せません。」(PAR030).
- On 204: invalidate positions list; if the deleted id equals the `?positionId` selection, clear the param so the preview pane returns to its placeholder (FR-014 / User Story 5 scenario 3).
