# Phase 0 Research: Y-09 Routine Master Management (ルーティン管理)

Resolved against this codebase's existing mock-DB structures, the Y-08 Exercise Master implementation it depends on, and the real Phase-2 backend API contract (`backend-api.md`, provided directly for this feature).

## Decision R1: Reuse the existing Y-08 exercise list endpoint for the exercise picker — no new endpoint

**Decision**: The "add exercise to routine" search/select control calls the existing `GET /api/crm/exercises?publishStatus=public&search=...` endpoint (already implemented for Y-08, `src/app/api/crm/exercises/route.ts`). No new exercise-search endpoint is created for this feature.

**Rationale**: FR-011 requires the picker to only offer currently-published exercises — `GetExercisesQuerySchema.publishStatus` already supports exactly this filter. Duplicating this as a routine-scoped endpoint would violate Constitution V (Simplicity & Minimal Dependencies / no abstraction layers beyond existing patterns).

**Alternatives considered**: A routine-scoped `/api/crm/routines/exercise-options` endpoint (rejected — training-equipment's sibling `exercises` sub-route exists only because it needed equipment-link-specific shaping; the routine picker needs nothing exercise-list doesn't already return: id, name, category, tool, publish status).

## Decision R2: Routine composition modeled as nested arrays on the Routine record, not separate mock tables

**Decision**: `RoutineRecord.exercises: RoutineExerciseRecord[]`, each with `sets: RoutineSetRecord[]` embedded directly — no separate `routine_exercises`/`routine_sets` mock-db tables.

**Rationale**: Matches this codebase's established embedded-collection convention for one-to-many child data inside a mock record (`ExerciseRecord.images[]`, `ExerciseRecord.explanationSteps[]` in `exercise.table.ts`) rather than a relational join across parallel in-memory arrays. The real backend (`backend-api.md`) models `routine_exercises`/`routine_sets` as real relational tables with FKs, but the API response already aggregates them into a nested `exercises[]` array (see "Get routine detail" response) — so the mock's in-memory shape and the real API's wire shape match either way; only the real DB's normalized storage differs, which is invisible to application code (Constitution II).

**Alternatives considered**: Separate `db.routineExercises` / `db.routineSets` tables mirroring the real relational schema 1:1 (rejected — adds join logic with no benefit to any Phase 1 UI behavior; over-engineering relative to what the mock needs to serve).

## Decision R3: Routine Category — read-only reference table, no CRUD routes

**Decision**: Add a minimal `routineCategories` mock table seeded with the 6 fixed Y-09 categories (ビギナー向け, シェイプアップ, ダイエット, 運動不足解消, 筋肥大, 筋力アップ) and a single `GET /api/crm/routine-categories` list endpoint. No create/edit/delete/reorder routes.

**Rationale**: The routine list's category filter and the create/edit form's category select both need a real data source (`categoryId`/`categoryName` pairs, per `backend-api.md`'s response shape) — a hardcoded frontend array (as the UI prototype uses) would violate Constitution II (OpenAPI-First: reads must come from an endpoint, not inline frontend constants) once real API-shaped data is in play. Per spec.md's resolved clarification, category CRUD itself (create/edit/delete/reorder) remains out of scope — confirmed absent from `backend-api.md` as well (no category-mutation endpoints are documented there).

**Alternatives considered**: Inline frontend constant array, matching the UI prototype exactly (rejected — works for a static prototype but breaks Constitution II once this feature has a real mock API backing it; a read-only endpoint costs one small table + one GET route and keeps the data source consistent with every other select-populating pattern in this codebase, e.g. `exercise-categories`, `exercise-tool-types`).

## Decision R4: ID scheme — internal `id` (`RT-###`) distinct from human-facing `routineCode` (`RT-#####`)

**Decision**: `id: RT-{3-digit sequential}` (internal, used in URLs/lookups) and `routineCode: RT-{5-digit sequential}` (human-facing, displayed in the UI, immutable, system-generated).

**Rationale**: Mirrors `exercise.table.ts`'s exact `id` (`EX-XXX`, 3-digit) vs. `exerciseCode` (`EX-XXXXX`, 5-digit) dual-identifier convention — the most directly analogous existing precedent in this codebase for a master-data entity with both an internal id and a displayed code. `backend-api.md`'s example values (`id: "01J5K..."` ULID-style, `routineCode: "RT-00031"`) confirm the real backend also keeps these as two distinct fields; only the real `id`'s concrete format (ULID) differs, which is opaque to application code and therefore doesn't need to be replicated by the mock.

**Alternatives considered**: Single unified `RT-XXXXX` used as both id and displayed code (rejected — diverges from this codebase's own established dual-identifier pattern and from the real API's shape, which keeps `id` and `routineCode` as two separate fields).

## Decision R5: Equipment-based default set weight — keyed off the exercise's real `toolId → exerciseMasters(tool).code`, not an ad-hoc 5-value map

**Decision**: When an exercise is added to a routine (or a new set is added), the recommended-weight default is looked up from a static `DEFAULT_WEIGHT_BY_TOOL_CODE` map keyed by the _real_ Y-08 tool-master code domain — all 10 values seeded in `exercise-master.seed.ts`'s `tool` kind (`none, machine, cableMachine, smithMachine, barbell, dumbbell, kettlebell, resistanceBand, trx, other`) — resolved via the exercise's actual `toolId`, exactly like `exercise.table.ts`'s existing `isBodyweightTool()` helper already does (`_getMasterCode('tool', toolId) === 'none'`).

| Tool code           | Default weight (kg) |
| ------------------- | ------------------- |
| `none` (bodyweight) | 0                   |
| `machine`           | 10                  |
| `cableMachine`      | 10                  |
| `smithMachine`      | 20                  |
| `barbell`           | 20                  |
| `dumbbell`          | 5                   |
| `kettlebell`        | 8                   |
| `resistanceBand`    | 0                   |
| `trx`               | 0                   |
| `other`             | 0                   |

**Rationale**: Per spec.md's resolved clarification ("make it simple, hardcoded"), the full member-profile-driven coefficient table (source FR-013) stays out of scope, but the simplified default still needs a real, non-fabricated key domain to hang off — the UI prototype's ad-hoc `{barbell, dumbbell, machine, bodyweight, cable}` enum doesn't exist anywhere in the actual Y-08 data model. Using the exercise's real `toolId` (already resolved via `_getMasterCode`) keeps this feature consistent with Y-08's actual schema instead of inventing a parallel, disconnected tool-type concept.

**Alternatives considered**: Keep the UI prototype's disconnected 5-value tool enum as its own new field on the routine feature (rejected — creates a second, redundant "tool type" concept alongside Y-08's real one, which would need to be manually kept in sync with every exercise's actual `toolId`).

## Decision R6: `brandEnum` — present in the real API schema, absent from the provided UI prototype; defaulted, not surfaced, in Phase 1

**Decision**: The mock `Routine` record includes a `brandEnum: 'joyfit' | 'fit365'` field (matching `backend-api.md`'s required, single-valued `brandEnum` on create/duplicate) for schema-shape parity with the real backend. However, none of the three provided UI prototype files (`routine-list.tsx`, `routine-detail.tsx`, `routine-form.tsx`) expose any brand selector, brand column, or brand filter. For Phase 1, new and duplicated routines default `brandEnum` to `'joyfit'` with no UI control to change it; the field is not displayed or filterable anywhere in this feature's UI.

**Rationale**: Constitution II (OpenAPI-First) requires the Phase 1 mock shape to match the real API so Phase 2's client-generation swap is a zero-app-code-change migration — silently dropping a required real-API field would break that swap later. At the same time, spec.md's Y-09 source document explicitly frames HQ routines as "2ブランド共通" (shared across both brands, no cross-brand operation restriction), which is in tension with the real API's single-valued per-routine `brandEnum`. Rather than guess which side is stale, this is treated as a genuine, surfaced gap (see spec.md's Q&A precedent for this repo) — not resolved by inventing UI that isn't in the prototype, and not resolved by quietly dropping the field either.

**Follow-up flagged**: This should be confirmed with the API/PO team before Phase 2 cut-over — either the UI prototype needs a brand selector added (if routines are genuinely single-brand in the real system), or the real API's `brandEnum` requirement needs revisiting (if routines are genuinely brand-shared, as the source spec's prose states).

## Decision R7: Thumbnails — real API models a single `thumbnailS3Key`, but the approved spec requires a 5-image gallery; Phase 1 mock keeps the gallery and flags the gap

**Decision**: The mock `Routine` record stores `thumbnailS3Keys: string[]` (0–5 entries, first = primary), not the single `thumbnailS3Key` string field shown in `backend-api.md`'s request/response examples.

**Rationale**: spec.md's FR-011/FR-013 (already clarified and approved) require up to 5 thumbnail images with the first treated as primary — derived directly from `routine-form.tsx`'s `PhotoUploadArea` (`最大5枚まで登録できます`, `photos.length < 5`) and `routine-detail.tsx`'s multi-photo `PhotoGallery` (previous/next navigation, thumbnail strip). Constitution III (Spec-Driven Development) means an already-approved spec's functional requirements are not silently narrowed to match a backend doc discovered afterward. Since `backend-api.md`'s examples only ever show one `thumbnailS3Key`, this is treated as a genuine, surfaced discrepancy (matching Decision R6's handling of `brandEnum`) rather than resolved by quietly dropping the gallery.

**Follow-up flagged**: Confirm with the API team whether the real schema should become `thumbnailS3Keys: string[]` (array, max 5) to match the approved multi-image spec, or whether the spec's 5-image requirement should be narrowed to a single thumbnail to match the real API as documented. Until resolved, Phase 1's mock and generated-client shape will need a manual adapter at the Phase 2 cut-over if the real API stays single-valued.

## Decision R8: Publish/unpublish route — `PATCH /api/crm/routines/{id}/publish-status`

**Decision**: Expose publish/unpublish as `PATCH /api/crm/routines/{id}/publish-status`, body `{ "publishStatus": "published" | "unpublished" }`.

**Rationale**: `backend-api.md`'s "Publish / unpublish a routine" section specifies the method and body but not an explicit path. This repo's own established convention for exactly this shape of action (status-only mutation, separate from the general edit route) is `exercise.table.ts`'s sibling route `src/app/api/crm/exercises/[id]/publish-status/route.ts`. Following the same sub-route name keeps both features consistent and predictable for anyone working across Y-08/Y-09.

**Alternatives considered**: Folding publish/unpublish into the general `PATCH /api/crm/routines/{id}` edit route via an optional `publishStatus` field (rejected — diverges from the Y-08 precedent, and blurs the "full edit" vs. "status-only, validation-gated" semantics that FR-010's zero-exercise guard specifically needs).

## Decision R9: Duplicate route — `POST /api/crm/routines/{id}/duplicate`

**Decision**: Expose duplication as `POST /api/crm/routines/{id}/duplicate` (no request body; the response is the newly created routine, per `backend-api.md`'s "Duplicate a routine" example).

**Rationale**: `backend-api.md` again omits an explicit path for this action; a `POST` on an `{id}/duplicate` sub-route is the natural, minimal-surprise mapping of "duplicate this specific resource," and matches this codebase's general convention of nesting single-resource actions as sub-routes under `[id]/`.

## Decision R10: Error codes — reuse `backend-api.md`'s literal codes as-is in mock error responses

**Decision**: All Phase 1 mock error responses use the exact error codes documented in `backend-api.md`: `E-RTN-001` (not found), `E-RTN-002` (delete blocked while published), `E-RTN-003` (publish blocked, zero exercises), `E-RTN-004` (exercise not published/non-preset), `E-RTN-005` (negative reps/weight), `E-RTN-006` (routineCode supplied in body), `E-VAL-001` (generic validation, incl. duplicate exercise / RPE out of range / superset rejected), `E-AUTH-100`/`E-AUTH-103` (auth/role).

**Rationale**: Since Phase 2 swaps the transport layer only (Constitution II), any client-side error-code branching written against these exact strings in Phase 1 continues to work unchanged against the real backend later — this is the entire point of designing the mock against the real contract rather than inventing parallel ad-hoc error strings.

## Decision R11: New permissions — `Permission.Routines{View,Create,Edit,Delete,Publish}`, granted to System (all) and Headquarter only

**Decision**: Add five new `Permission` enum values under a new "Routines (Y-09)" section in `src/types/permission.type.ts`: `RoutinesView`, `RoutinesCreate`, `RoutinesEdit`, `RoutinesDelete`, `RoutinesPublish`. Register the corresponding `PAGE_PERMISSIONS` entries for the new routes and grant all five only to `Headquarter` in `ROLE_PERMISSIONS` (`System` already receives `Object.values(Permission)` automatically).

**Rationale**: Mirrors the exact `ExercisesView/Create/Edit/Delete/Publish` shape already used for the closely analogous Y-08 feature (`exercise.table.ts`'s sibling), and directly implements spec.md's FR-017/FR-018 (Headquarter/System-only, screen-level route gating, no other role granted access at all — unlike Y-08, which other roles can at least view).

## Decision R12: Route location — new top-level `(private)/routines/` directory

**Decision**: `src/app/(private)/routines/{page.tsx, create/page.tsx, [id]/page.tsx, [id]/edit/page.tsx}`, following the sibling `exercise-master`/`training-equipment` top-level-feature convention (not nested under an existing route, since Y-09 is its own standalone master-data screen).

**Rationale**: Matches how every other Y-0X / E-0X master-data screen in this codebase is rooted (each gets its own top-level directory under `(private)/`), and keeps `generate-routes`'s directory scan producing a predictable `RoutePattern` set (`/routines`, `/routines/create`, `/routines/:id`, `/routines/:id/edit`).

## Decision R13: Reuse existing shared components — no new shared/global component

**Decision**: This feature introduces zero new shared (`src/components/`) components. It reuses: `RoleGatedButton`/`RoleGatedMenuItem` (action gating), `Empty` (filtered vs. empty list states), `useUnsavedChanges` (discard-confirmation guard, already used by other create/edit forms per the UI prototype's own import), the existing `Pagination`/`Table`/`Select`/`AlertDialog` shadcn/ui primitives, and the existing `Y-08` exercise-detail route for the exercise-name link-through.

**Rationale**: Constitution V (Simplicity & Minimal Dependencies) — every one of these already exists and is already proven across sibling Y-0X/E-0X features; nothing about Y-09's requirements calls for a new abstraction.

## Implementation order

1. `src/app/api/_schemas/routine.schema.ts` (Zod schemas: query, body, response, per `data-model.md`) + `routine-category.schema.ts`.
2. `src/app/api/_mock-db/types/routines.type.ts`, `seeds/routine.seed.ts` (+ `routine-categories.seed.ts`), `tables/routine.table.ts` (+ `routine-category.table.ts`), wired into `_create-db.ts`.
3. `src/types/permission.type.ts` + `src/constants/permission.constants.ts` (new `Routines*` permissions, `PAGE_PERMISSIONS`, `ROLE_PERMISSIONS`).
4. Mock API routes: `src/app/api/crm/routines/{route.ts, [id]/route.ts, [id]/publish-status/route.ts, [id]/duplicate/route.ts}`, `src/app/api/crm/routine-categories/route.ts`.
5. `npm run generate-openapi && npm run generate-api` (regenerate the OpenAPI doc + `src/lib/api/` client from the newly registered route schemas).
6. UI: `src/app/(private)/routines/{page.tsx, create/page.tsx, [id]/page.tsx, [id]/edit/page.tsx}` + co-located `_components/`/`_hooks/`.
7. `npm run generate-routes` (register the new routes so `RoutePattern` includes `/routines*`).
8. Manual verification per `quickstart.md`.
