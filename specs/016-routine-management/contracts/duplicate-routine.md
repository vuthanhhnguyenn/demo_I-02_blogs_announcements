# Contract: POST /api/crm/routines/{id}/duplicate

**Feature**: 016-routine-management (Y-09)
**Phase**: Phase 1 mock route handler
**Purpose**: Duplicate a routine's basic info and full composition into a new, unpublished routine (FR-014).

---

## Request

`POST /api/crm/routines/{id}/duplicate`

No request body. Non-idempotent (each call creates a new routine).

### Authorization

Requires `Permission.RoutinesCreate` (Headquarter/System only — duplication is a creation action).

---

## Response 201

```json
{
  "id": "RT-002",
  "routineCode": "RT-00032",
  "name": "ビギナー全身ルーティンのコピー",
  "categoryId": "RC-001",
  "categoryName": "ビギナー向け",
  "description": "初めての方向けの全身トレーニング。",
  "thumbnailS3Keys": ["member-shared/routine/01J5K8....png"],
  "publishStatus": "unpublished",
  "publishedAt": null,
  "exerciseCount": 1,
  "exercises": [
    {
      "exerciseId": "EX-001",
      "exerciseName": "スクワット",
      "categoryName": "脚",
      "sortOrder": 0,
      "hqComment": "フォームを優先。重量は無理しない。",
      "sets": [
        {
          "setNumber": 1,
          "setType": "normal",
          "supersetGroup": null,
          "targetWeightKg": 20,
          "targetReps": 10,
          "targetDurationSeconds": null,
          "targetDistanceM": null,
          "targetRpe": 6
        }
      ]
    }
  ],
  "createdByStaffId": "STF-001",
  "updatedByStaffId": "STF-001",
  "createdAt": "2026-07-10T11:00:00.000Z",
  "updatedAt": "2026-07-10T11:00:00.000Z"
}
```

## Response 404

```json
{ "error": "Routine not found", "code": "E-RTN-001" }
```

## Response 403

```json
{ "error": "Forbidden", "code": "E-AUTH-103" }
```

---

## Behavioral Rules

1. Copies basic info: `name = "{source.name}のコピー"`; `categoryId`, `description`, `thumbnailS3Keys` copied verbatim.
2. Copies the full composition: all `exercises[]` (with `hqComment` + `sortOrder`) and each one's `sets[]`, copied verbatim.
3. New identity: new `id`, new auto-generated `routineCode`, `origin: 'official'`, `sourceRoutineId = source.id` (provenance only), `publishStatus: 'unpublished'` regardless of the source's status, `publishedAt: null`, `createdByStaffId` = acting user.
4. `404 E-RTN-001` if the source id is not an `origin: 'official'`, non-deleted routine.

---

## Contract Tests (minimum)

- Happy path: duplicating a routine copies all basic info and composition, with a new id/routineCode, name suffixed "のコピー", and `publishStatus: "unpublished"`.
- Status-override path: duplicating a **published** source still yields `publishStatus: "unpublished"` on the copy (FR-014, Edge Cases).
- Not-found path: unknown/deleted/non-official source id returns `404 E-RTN-001`.
- Independence path: editing the duplicate afterward does not affect the source routine, and vice versa (`sourceRoutineId` is provenance metadata only, not a live link).
- Permission path: a caller without `RoutinesCreate` receives `403 E-AUTH-103`.
