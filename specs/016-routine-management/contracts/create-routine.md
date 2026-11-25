# Contract: POST /api/crm/routines

**Feature**: 016-routine-management (Y-09)
**Phase**: Phase 1 mock route handler
**Purpose**: Register a new HQ routine, always created unpublished (FR-006, FR-011, FR-012).

---

## Request

`POST /api/crm/routines`

```json
{
  "name": "ビギナー全身ルーティン",
  "categoryId": "RC-001",
  "description": "初めての方向けの全身トレーニング。",
  "thumbnailS3Keys": ["member-shared/routine/01J5K8....png"],
  "exercises": [
    {
      "exerciseId": "EX-001",
      "sortOrder": 0,
      "hqComment": "フォームを優先。重量は無理しない。",
      "sets": [
        { "targetReps": 10, "targetWeightKg": 20, "targetRpe": 6 },
        { "targetReps": 10, "targetWeightKg": 20, "targetRpe": 7 }
      ]
    },
    {
      "exerciseId": "EX-002",
      "sortOrder": 1,
      "sets": [{ "targetReps": 12, "targetWeightKg": 0, "targetRpe": 5 }]
    }
  ]
}
```

### Body Fields

| Field                                      | Type             | Required       | Notes                                                                                                                                            |
| ------------------------------------------ | ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                                     | string           | yes            | FR-006.                                                                                                                                          |
| `categoryId`                               | string           | yes            | FR-006. Must reference an existing `RoutineCategory`.                                                                                            |
| `description`                              | string \| null   | no             |                                                                                                                                                  |
| `thumbnailS3Keys`                          | string[] (max 5) | no             | First entry is primary (research.md R7 — diverges from the real API's single-key field).                                                         |
| `exercises[].exerciseId`                   | string           | no\*           | \*`exercises` itself may be omitted/empty on create; each entry, if present, must reference a currently `publishStatus: 'public'` Y-08 exercise. |
| `exercises[].sortOrder`                    | number           | yes (per item) | Position within the routine.                                                                                                                     |
| `exercises[].hqComment`                    | string \| null   | no             |                                                                                                                                                  |
| `exercises[].sets[].targetReps`            | number \| null   | no             | ≥ 0 when provided.                                                                                                                               |
| `exercises[].sets[].targetWeightKg`        | number \| null   | no             | ≥ 0 when provided.                                                                                                                               |
| `exercises[].sets[].targetDurationSeconds` | number \| null   | no             |                                                                                                                                                  |
| `exercises[].sets[].targetDistanceM`       | number \| null   | no             |                                                                                                                                                  |
| `exercises[].sets[].targetRpe`             | number \| null   | no             | 0–10 when provided.                                                                                                                              |

`routineCode` and `brandEnum` MUST NOT be accepted from the client. `routineCode` is always system-generated; `brandEnum` defaults to `'joyfit'` in Phase 1 (research.md R6 — no brand selector in the provided UI).

### Authorization

Requires `Permission.RoutinesCreate` (Headquarter/System only). Non-idempotent.

---

## Response 201

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
  "exerciseCount": 2,
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
  "createdAt": "2026-07-10T09:00:00.000Z",
  "updatedAt": "2026-07-10T09:00:00.000Z"
}
```

## Response 400

```json
{ "error": "Duplicate exerciseId within exercises[]", "code": "E-VAL-001" }
```

Also returned for: `targetRpe` outside 0–10; `setType: "superset"` submitted (Phase 2 scope, rejected in Phase 1).

## Response 422

```json
{ "error": "name and categoryId are required", "code": "E-VAL-001" }
```

```json
{ "error": "exerciseId must reference a published exercise", "code": "E-RTN-004" }
```

```json
{ "error": "targetReps and targetWeightKg must be zero or greater", "code": "E-RTN-005" }
```

```json
{ "error": "routineCode is system-generated and cannot be set", "code": "E-RTN-006" }
```

## Response 403

```json
{ "error": "Forbidden", "code": "E-AUTH-103" }
```

---

## Behavioral Rules

1. `publishStatus` always defaults to `'unpublished'` on create, regardless of request body content (FR-006).
2. `routineCode` is auto-generated (`RT-{5-digit sequential}`, research.md R4); any client-supplied value is rejected with `E-RTN-006`.
3. Each `exercises[].exerciseId` MUST be a published, non-deleted Y-08 exercise at the moment of create; otherwise `422 E-RTN-004`.
4. Duplicate `exerciseId` values within the same request's `exercises[]` are rejected (`400 E-VAL-001`).
5. `targetReps`/`targetWeightKg` negative values are rejected (`422 E-RTN-005`); `targetRpe` outside 0–10 is rejected (`400 E-VAL-001`).
6. `setType` is always stored as `'normal'`; a request containing `setType: "superset"` is rejected (`400 E-VAL-001`).

---

## Contract Tests (minimum)

- Happy path: valid name/category/exercises/sets creates a routine with `publishStatus: "unpublished"`, auto-generated `routineCode`.
- Missing-required-fields path: omitting `name` or `categoryId` returns `422 E-VAL-001`.
- Invalid-exercise path: an `exerciseId` that is unpublished or deleted returns `422 E-RTN-004`.
- Duplicate-exercise path: the same `exerciseId` twice in one request returns `400 E-VAL-001`.
- Negative-value path: a negative `targetReps` or `targetWeightKg` returns `422 E-RTN-005`.
- RPE-range path: `targetRpe` of `-1` or `11` returns `400 E-VAL-001`.
- Superset-rejection path: `setType: "superset"` returns `400 E-VAL-001`.
- Immutable-code path: supplying `routineCode` in the body returns `422 E-RTN-006`.
- Permission path: a caller without `RoutinesCreate` receives `403 E-AUTH-103`.
