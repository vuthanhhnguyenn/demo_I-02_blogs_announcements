# Contract: PATCH /api/crm/routines/{id}

**Feature**: 016-routine-management (Y-09)
**Phase**: Phase 1 mock route handler
**Purpose**: Edit a routine's basic info and/or its full exercise/set composition (FR-007, FR-011, FR-012).

---

## Request

`PATCH /api/crm/routines/{id}`

```json
{
  "name": "ビギナー全身ルーティン v2",
  "description": "重量設定を見直した改訂版。",
  "exercises": [
    {
      "exerciseId": "EX-001",
      "sortOrder": 0,
      "hqComment": "フォームを優先。",
      "sets": [{ "targetReps": 12, "targetWeightKg": 22.5, "targetRpe": 7 }]
    }
  ]
}
```

### Body Fields

Same shape as `create-routine.md`, all fields optional (partial update semantics):

| Field             | Behavior when omitted | Behavior when present                                                                                                |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `name`            | unchanged             | replaces                                                                                                             |
| `categoryId`      | unchanged             | replaces                                                                                                             |
| `description`     | unchanged             | replaces (`null` clears it)                                                                                          |
| `thumbnailS3Keys` | unchanged             | replaces the whole array (max 5)                                                                                     |
| `exercises`       | unchanged             | **full-replace**: `[]` clears all exercises/sets; a non-empty array replaces the entire composition in one operation |

`routineCode`, `brandEnum`, `publishStatus`, `origin`, `sourceRoutineId` MUST NOT be accepted by this route — `publishStatus` changes go through `update-routine-publish-status.md` instead.

### Authorization

Requires `Permission.RoutinesEdit` (Headquarter/System only).

---

## Response 200

Same shape as `get-routine-detail.md`'s 200 response, reflecting the merged result; `updatedAt`/`updatedByStaffId` are always refreshed.

## Response 404

```json
{ "error": "Routine not found", "code": "E-RTN-001" }
```

## Response 400 / 422

Same validation error shapes as `create-routine.md` (`E-VAL-001`, `E-RTN-004`, `E-RTN-005`, `E-RTN-006`) — identical rules apply to edit as to create.

## Response 403

```json
{ "error": "Forbidden", "code": "E-AUTH-103" }
```

---

## Behavioral Rules

1. Field omission = no change; explicit `null` on a nullable field clears it. This applies to `description` and `thumbnailS3Keys`; `name` and `categoryId` cannot be cleared (still required if present).
2. `exercises` is full-replace, not merged item-by-item: omitting it leaves the existing composition untouched; supplying `[]` clears every exercise (and its sets); supplying a non-empty array replaces the entire set of exercises/sets in one transaction-equivalent mock operation.
3. Existing sets/exercises are not retroactively invalidated if a referenced Y-08 exercise is later unpublished or deleted — the add-time check (rule 3 in `create-routine.md`) is not re-run on unrelated edits that don't touch that exercise's entry.
4. `updatedAt` and `updatedByStaffId` are set on every successful edit, regardless of which fields changed (FR-007).

---

## Contract Tests (minimum)

- Partial-update path: editing only `name` leaves `exercises`/`description`/`thumbnailS3Keys` untouched.
- Full-replace path: supplying a new `exercises[]` array entirely replaces the prior composition (verify old exercise/set data is gone, not merged).
- Clear-composition path: supplying `exercises: []` results in `exerciseCount: 0` and (if previously published) does not retroactively unpublish — publish/unpublish is a separate action.
- Not-found path: unknown/deleted/non-official id returns `404 E-RTN-001`.
- Validation path: same as create — invalid exercise, negative set values, RPE range, superset rejection, immutable `routineCode`.
- Audit path: `updatedAt`/`updatedByStaffId` change on every successful edit.
