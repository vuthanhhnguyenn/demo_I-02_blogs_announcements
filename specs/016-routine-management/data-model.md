# Data Model: Y-09 Routine Master Management (ルーティン管理)

Derived from `spec.md`'s Key Entities and Functional Requirements, resolved against the real Phase-2 API contract (`backend-api.md`) and this codebase's existing mock-DB conventions per `research.md` (R2, R4, R5, R6, R7).

## Routine (persisted, new)

Location: `src/app/api/_mock-db/types/routines.type.ts` (new table), seed `src/app/api/_mock-db/seeds/routine.seed.ts`, table `src/app/api/_mock-db/tables/routine.table.ts`.

| Field              | Type                            | Notes                                                                                                                                                                                        |
| ------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | `string`                        | Internal id, `RT-{3-digit}` (Decision R4).                                                                                                                                                   |
| `routineCode`      | `string`                        | Human-facing, `RT-{5-digit}`. System-generated, immutable (FR-006). Rejecting a client-supplied value on create returns `E-RTN-006`.                                                         |
| `name`             | `string`                        | Required (FR-006/FR-007).                                                                                                                                                                    |
| `description`      | `string \| null`                | Optional.                                                                                                                                                                                    |
| `categoryId`       | `string`                        | FK → `RoutineCategory.id`. Required.                                                                                                                                                         |
| `brandEnum`        | `'joyfit' \| 'fit365'`          | Required by the real API; no UI selector in the provided prototype. Defaults to `'joyfit'` in Phase 1 (Decision R6 — flagged gap).                                                           |
| `thumbnailS3Keys`  | `string[]` (0–5)                | First entry is primary. Diverges from `backend-api.md`'s single `thumbnailS3Key` per Decision R7 (flagged gap).                                                                              |
| `origin`           | `'official'`                    | Always `'official'` for this feature — member-authored routines (`created`/`copied`) are a separate, out-of-scope concept (per `backend-api.md`'s business rules); fixed, not user-settable. |
| `sourceRoutineId`  | `string \| null`                | Set only when this routine was produced by duplication (FR-014); provenance only, not a live link.                                                                                           |
| `isPublic`         | `boolean`                       | Derived/stored alongside `publishStatus` for parity with `backend-api.md`'s `is_public` column; `publishStatus` is the field the API/UI actually read.                                       |
| `publishStatus`    | `'unpublished' \| 'published'`  | Defaults to `'unpublished'` on create (FR-006) and on duplicate (FR-014), regardless of the source's status.                                                                                 |
| `publishedAt`      | `string \| null` (ISO datetime) | Set the first time `publishStatus` becomes `'published'`; retained (not cleared) on subsequent unpublish (matches `backend-api.md`).                                                         |
| `exerciseCount`    | `number`                        | Derived from `exercises.length`; never stored independently, never editable directly.                                                                                                        |
| `exercises`        | `RoutineExercise[]`             | Embedded array, ordered by `sortOrder` (Decision R2).                                                                                                                                        |
| `deletedAt`        | `string \| null` (ISO datetime) | Logical delete marker (FR-009). Reads always filter `deletedAt === null`.                                                                                                                    |
| `createdByStaffId` | `string`                        | Set from the acting user at create time.                                                                                                                                                     |
| `updatedByStaffId` | `string`                        | Set on every mutation.                                                                                                                                                                       |
| `createdAt`        | `string` (ISO datetime)         |                                                                                                                                                                                              |
| `updatedAt`        | `string` (ISO datetime)         | Set on every mutation (FR-007).                                                                                                                                                              |

**Validation rules**:

- `name` and `categoryId` are required on create/edit (FR-006/FR-007, spec User Story 3 Acceptance Scenario 1).
- `routineCode` MUST NOT be accepted in a create/edit request body; supplying one returns `422 E-RTN-006`.
- Switching `publishStatus` from `'unpublished'` to `'published'` is rejected (`422 E-RTN-003`) when `exercises.length === 0` (FR-010).
- Switching `publishStatus` from `'published'` to `'unpublished'` is always allowed, with no side effect on any member's already-copied personal routine (FR-010).
- Deleting a routine is rejected (`409 E-RTN-002`) while `publishStatus === 'published'` (FR-009); always allowed while `'unpublished'`.
- `thumbnailS3Keys` accepts at most 5 entries; the first is treated as the primary thumbnail (FR-013).

## RoutineCategory (persisted, new, read-only for this feature)

Location: `src/app/api/_mock-db/types/routine-categories.type.ts`, seed `src/app/api/_mock-db/seeds/routine-category.seed.ts`, table `src/app/api/_mock-db/tables/routine-category.table.ts`. Read-only per Decision R3 — no create/edit/delete route in this feature.

| Field       | Type     | Notes                                                                                                           |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `id`        | `string` | `RC-{3-digit}`.                                                                                                 |
| `name`      | `string` | One of the 6 fixed Y-09 categories: ビギナー向け, シェイプアップ, ダイエット, 運動不足解消, 筋肥大, 筋力アップ. |
| `sortOrder` | `number` | Fixed seed order; not user-editable in this feature.                                                            |

## RoutineExercise (embedded in Routine.exercises[])

Represents one exercise's placement within a routine (spec Key Entity "Routine Exercise"; `backend-api.md`'s `ExerciseGroup` / `routine_exercises` row, aggregated).

| Field          | Type             | Notes                                                                                                                                                                                                                                                                                                |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exerciseId`   | `string`         | FK → Y-08 `Exercise.id`. MUST reference a currently `publishStatus: 'public'`, non-deleted exercise at add-time (FR-011); rejecting otherwise returns `422 E-RTN-004`. Not re-validated retroactively if the exercise is later unpublished/deleted (matches `backend-api.md`'s edit business rules). |
| `exerciseName` | `string`         | Denormalized at read-time from the Y-08 exercise record (not stored independently — resolved the same way `exercise.table.ts` resolves `categoryName`/`toolName`).                                                                                                                                   |
| `categoryName` | `string`         | The exercise's Y-08 category name (e.g. 胸, 背中, 二頭前腕) — this is the "target-area badge" shown in `routine-detail.tsx`'s Exercise Composition tab, resolved from the exercise's own `categoryId`, not a field stored on the routine.                                                            |
| `sortOrder`    | `number`         | Position within the routine (0-based); reorder via up/down controls re-numbers this (FR-011).                                                                                                                                                                                                        |
| `hqComment`    | `string \| null` | Optional free-text note (FR-011).                                                                                                                                                                                                                                                                    |
| `sets`         | `RoutineSet[]`   | Embedded array, ordered by `setNumber`.                                                                                                                                                                                                                                                              |

**Validation rules**:

- Duplicate `exerciseId` within the same routine's `exercises[]` is rejected (`400 E-VAL-001`; one group per exercise), matching `backend-api.md`.
- Removing a `RoutineExercise` removes it from this routine's composition only — it never mutates or deletes the underlying Y-08 exercise record.

## RoutineSet (embedded in RoutineExercise.sets[])

Represents one defined unit of work (spec Key Entity "Set"; `backend-api.md`'s `routine_sets` row).

| Field                   | Type             | Notes                                                                                                                                               |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setNumber`             | `number`         | Auto-numbered on add; re-numbered (compacted) whenever a set is removed (FR-012).                                                                   |
| `setType`               | `'normal'`       | Fixed to `'normal'` in this phase; `'superset'` is rejected (`400 E-VAL-001`) if ever submitted (Phase 2 scope, per spec Out of Scope).             |
| `supersetGroup`         | `null`           | Reserved field, always `null` in Phase 1 (data structure kept for forward-compatibility, per spec Out of Scope / R-14 in source doc).               |
| `targetReps`            | `number \| null` | ≥ 0 when provided; negative → `422 E-RTN-005` (FR-012).                                                                                             |
| `targetWeightKg`        | `number \| null` | ≥ 0 when provided; negative → `422 E-RTN-005` (FR-012). Default seeded from `DEFAULT_WEIGHT_BY_TOOL_CODE` (research.md R5) when the set is created. |
| `targetDurationSeconds` | `number \| null` | Optional; not applicable to every exercise type (e.g. reps-based exercises may leave this blank).                                                   |
| `targetDistanceM`       | `number \| null` | Optional.                                                                                                                                           |
| `targetRpe`             | `number \| null` | 0–10; outside that range → `400 E-VAL-001`.                                                                                                         |

**Validation rules**:

- `targetReps` and `targetWeightKg` MUST be ≥ 0 when provided (FR-012); other fields remain optional and exercise-type-dependent (Assumption: no per-type branching in Phase 1, per spec Clarifications).
- `targetRpe`, when provided, MUST be within 0–10.
- Copying a set (FR-012) duplicates all of the above field values into a new set inserted immediately after the source, then the whole `sets[]` array is re-numbered.

## Query/Filter parameters (GetRoutinesQuery, new)

| Field           | Type                                                          | Default        | Notes                                                                                                                                     |
| --------------- | ------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `page`          | `number`                                                      | `1`            | Standard pagination.                                                                                                                      |
| `limit`         | `number`                                                      | `50` (max 200) | Matches the UI prototype's page-size options (25/50/100/200) (FR-004).                                                                    |
| `search`        | `string?`                                                     | —              | Partial match on `name` only (FR-002), per `backend-api.md`'s "`keyword` matches `name` only."                                            |
| `categoryId`    | `string?`                                                     | —              | Single-select (FR-003).                                                                                                                   |
| `publishStatus` | `'unpublished' \| 'published'?`                               | —              | Single-select (FR-003).                                                                                                                   |
| `sortBy`        | `'name' \| 'exerciseCount' \| 'publishStatus' \| 'updatedAt'` | `'updatedAt'`  | FR-004. (`categoryName` is intentionally not sortable — matches the UI prototype's header, which renders no sort control on that column.) |
| `sortOrder`     | `'asc' \| 'desc'`                                             | `'desc'`       | FR-004.                                                                                                                                   |

All filters are single-select and AND-combined with `search` (matches `backend-api.md`'s "All filters are single-select and AND-combined").

## Seed requirements

`routine.seed.ts` must cover every state this screen's UI branches on, so `quickstart.md` can exercise each path without further data setup:

- At least one **published** routine with ≥ 1 exercise (normal display + delete-blocked case).
- At least one **unpublished** routine with 0 exercises (publish-blocked case, FR-010; matches the UI prototype's `RT-006` seed row, `exerciseCount: 0`).
- At least one **unpublished** routine with ≥ 1 exercise (publish-allowed case).
- At least one routine with multiple exercises, each with multiple sets, at least one set with only `targetDurationSeconds` populated and `targetReps`/`targetWeightKg` blank (time-only exercise, e.g. a plank — Edge Case coverage).
- At least one routine with `thumbnailS3Keys.length > 1` (gallery navigation) and at least one with `thumbnailS3Keys.length === 0` (empty-thumbnail placeholder state).
- Coverage of all 6 `RoutineCategory` seed rows across the routine seed set, so the category filter has something to narrow.
- At least one search/filter combination that yields zero rows (empty-vs-filtered state coverage, FR-005).
