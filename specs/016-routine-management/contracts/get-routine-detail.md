# Contract: GET /api/crm/routines/{id}

**Feature**: 016-routine-management (Y-09)
**Phase**: Phase 1 mock route handler
**Purpose**: Full routine detail — basic info + ordered exercise/set composition (FR-008).

---

## Request

`GET /api/crm/routines/{id}`

### Authorization

Requires `Permission.RoutinesView` (Headquarter/System only).

---

## Response 200

```json
{
  "id": "RT-001",
  "routineCode": "RT-00031",
  "name": "ビギナー全身ルーティン",
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
  "updatedByStaffId": "STF-002",
  "createdAt": "2026-06-05T09:00:00.000Z",
  "updatedAt": "2026-06-05T10:00:00.000Z"
}
```

## Response 404

```json
{ "error": "Routine not found", "code": "E-RTN-001" }
```

Returned when `id` matches no `origin='official'`, non-deleted routine.

## Response 403

```json
{ "error": "Forbidden", "code": "E-AUTH-103" }
```

---

## Behavioral Rules

1. `exercises[]` is ordered by `sortOrder`; each item's `sets[]` is ordered by `setNumber`.
2. `categoryName` and each exercise's `exerciseName`/`categoryName` are resolved server-side at read time, never stored redundantly.
3. A logically-deleted routine (`deletedAt != null`) is treated identically to a non-existent one — `404 E-RTN-001`.

---

## Contract Tests (minimum)

- Happy path: an existing official routine returns full basic info + ordered exercises/sets.
- Not-found path: an unknown id, a deleted routine, or a member-authored (`origin != 'official'`) routine each return `404 E-RTN-001`.
- Ordering path: exercises and their sets are returned in `sortOrder`/`setNumber` order regardless of insertion order in the mock store.
