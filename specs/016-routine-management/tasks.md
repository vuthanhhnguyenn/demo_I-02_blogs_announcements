# Tasks: Y-09 Routine Master Management (ルーティン管理)

**Input**: Design documents from `/specs/016-routine-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story (from spec.md, in priority order: US1 P1, US2 P1, US3 P2, US4 P2, US5 P3, US6 P3) to enable independent implementation and testing of each story.

**No test tasks**: Per `.specify/memory/constitution.md`'s absolute "No Testing Policy," this list contains zero test-writing tasks (no unit/integration/e2e/contract tests). Verification is manual, against `quickstart.md`'s checklist, plus `tsc --noEmit` and ESLint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 / US5 / US6, mapping to spec.md's user stories
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the feature's directory structure. No new npm dependencies; no new top-level sidebar entry beyond what `routines` itself needs (a standalone top-level feature, per research.md R12).

- [x] T001 Create `src/app/(private)/routines/_components/` and `src/app/(private)/routines/_hooks/` directories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stand up the full schema layer, both new mock-db tables (all CRUD methods, matching the `exercise.table.ts` precedent of one file per entity implementing every method together), permissions, all four page-route shells, and the shared read-only categories endpoint every story's UI depends on. No user-story work can start until this phase is complete.

**⚠️ CRITICAL**: This phase must fully complete before Phase 3+.

- [x] T002 [P] Create `RoutineCategorySchema` and `GetRoutineCategoriesResponseSchema` in `src/app/api/_schemas/routine-category.schema.ts`, per data-model.md's `RoutineCategory` entity and contracts/get-routine-categories.md
- [x] T003 [P] Create `RoutineExerciseSchema`, `RoutineSetSchema`, `RoutineListItemSchema`, `RoutineDetailSchema`, `GetRoutinesQuerySchema`, `GetRoutinesResponseSchema`, `UpsertRoutineBodySchema` (shared by create and edit, all fields optional on edit via `.partial()` at the route level), `UpdateRoutinePublishStatusBodySchema`, `UpdateRoutinePublishStatusResponseSchema` in `src/app/api/_schemas/routine.schema.ts`, per data-model.md's `Routine`/`RoutineExercise`/`RoutineSet` entities and all `contracts/*.md` request/response shapes
- [x] T004 Create `src/app/api/_mock-db/seeds/routine-category.seed.ts` (6 fixed categories: ビギナー向け, シェイプアップ, ダイエット, 運動不足解消, 筋肥大, 筋力アップ, `RC-{3-digit}` ids), `src/app/api/_mock-db/types/routine-categories.type.ts`, and `src/app/api/_mock-db/tables/routine-category.table.ts` (read-only `list()` per research.md R3) (depends on T002)
- [x] T005 Create `src/app/api/_mock-db/seeds/routine.seed.ts` per data-model.md's Seed Requirements (a published routine with ≥1 exercise; an unpublished routine with 0 exercises for the publish-block case; an unpublished routine with ≥1 exercise; a routine with a time-only set — reps/weight blank, duration populated — e.g. a plank; a routine with `thumbnailS3Keys.length > 1` and one with `thumbnailS3Keys.length === 0`; all 6 `RoutineCategory` rows represented across the seed set; one search/filter combination yielding zero rows), `src/app/api/_mock-db/types/routines.type.ts`, and `src/app/api/_mock-db/tables/routine.table.ts` implementing `list`/`getById`/`create`/`update`/`updatePublishStatus`/`delete`/`duplicate`: `id`/`routineCode` generation per research.md R4 (`RT-{3-digit}` / `RT-{5-digit}`), `categoryName`/`exerciseName`/exercise `categoryName` resolution by reading `getDb().routineCategories`/`getDb().exercises`, default-weight-on-add-exercise lookup per research.md R5's `DEFAULT_WEIGHT_BY_TOOL_CODE` table (resolved via the exercise's `toolId → exerciseMasters(tool).code`), the publish-guard (`E-RTN-003` when `exercises.length === 0`), the delete-guard (`E-RTN-002` while published), duplicate-exercise/negative-value/RPE-range/superset-rejection validation (`E-VAL-001`/`E-RTN-005`), and `brandEnum` defaulted to `'joyfit'` (research.md R6) (depends on T003, T004)
- [x] T006 Wire `routineCategories` and `routines` into `src/app/api/_mock-db/_create-db.ts`
- [x] T007 [P] Add `RoutinesView`, `RoutinesCreate`, `RoutinesEdit`, `RoutinesDelete`, `RoutinesPublish` to the `Permission` enum in `src/types/permission.type.ts`, under a new "Routines (Y-09)" section
- [x] T008 Create bare Server Component page shells (layout wrapper matching the sibling `exercise-master`/`training-equipment` shell pattern, empty content slots filled in by later stories): `src/app/(private)/routines/page.tsx`, `src/app/(private)/routines/create/page.tsx`, `src/app/(private)/routines/[id]/page.tsx`, `src/app/(private)/routines/[id]/edit/page.tsx`
- [x] T009 Run `npm run generate-routes` to register `/routines`, `/routines/create`, `/routines/:id`, `/routines/:id/edit` in `src/lib/routes/routes.config.ts` (depends on T008)
- [x] T010 Register `PAGE_PERMISSIONS['/routines'] = Permission.RoutinesView`, `PAGE_PERMISSIONS['/routines/create'] = Permission.RoutinesCreate`, `PAGE_PERMISSIONS['/routines/:id'] = Permission.RoutinesView`, `PAGE_PERMISSIONS['/routines/:id/edit'] = Permission.RoutinesEdit`, and add all 5 new `Permission.Routines*` values to `ROLE_PERMISSIONS[UserRole.Headquarter]` in `src/constants/permission.constants.ts` (`System` already receives every permission via `Object.values(Permission)`) (depends on T007, T009)
- [x] T011 Implement `GET /api/crm/routine-categories/route.ts` per contracts/get-routine-categories.md: enforce `Permission.RoutinesView`, call `db.routineCategories.list()`, register via `registerRoute()` (depends on T004, T010)
- [x] T012 Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmRoutineCategoriesOptions` (depends on T011)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Browse and find HQ routines (Priority: P1) 🎯 MVP

**Goal**: Show a paginated, filterable, searchable, sortable table of HQ routines, with distinct empty/filtered-empty states and a "新規登録" entry point.

**Independent Test**: Load `/routines` and verify the table shows all routines (name+code, category, exercise count, status, last-updated) sorted by last-updated descending; type a partial name into search; expand "詳細フィルター" and set a category/status; verify the table narrows and the filter-result banner reports the count; click a sortable column header and verify direction toggles; click "すべてクリア" and verify the full list returns; verify pagination and page-size controls work.

### Implementation for User Story 1

- [x] T013 [US1] Implement `GET` handler in `src/app/api/crm/routines/route.ts`: validate query via `GetRoutinesQuerySchema`, enforce `Permission.RoutinesView`, call `db.routines.list(query)`, register via `registerRoute()` (contracts/get-routines.md) (depends on T005, T010)
- [x] T014 [US1] Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmRoutinesOptions` (depends on T013)
- [x] T015 [P] [US1] Create `use-routine-filters.hook.ts` in `src/app/(private)/routines/_hooks/`: `nuqs`-backed `useQueryStates` for `page`/`limit`/`search`/`categoryId`/`publishStatus`/`sortBy`/`sortOrder`, `clearFilters` (resets search + both selects), `activeFilterCount`, `hasActiveFilters`, and a `queryParams` object matching `GetRoutinesQuery` — following `src/app/(private)/training-equipment/_hooks/use-training-equipment-filters.hook.ts`'s shape
- [x] T016 [P] [US1] Create `routine-table-columns.tsx` in `src/app/(private)/routines/_components/`: `ColumnDef<RoutineListItem>[]` factory for name (with `routineCode` beneath)/category badge/exercise count/status badge/last-updated, each of name/exerciseCount/publishStatus/updatedAt sortable (matching the UI prototype's `SortIcon` behavior — category has no sort control, per the prototype's own header markup); no actions column yet (added incrementally by US4/US5/US6)
- [x] T017 [US1] Create `routine-filters.tsx` in `src/app/(private)/routines/_components/`: search `Input`, "詳細フィルター"/"閉じる" toggle `Button` with active-filter count `Badge`, expandable row with a category `Select` (options from `useQuery({...getCrmRoutineCategoriesOptions()})`, Foundational T012) and a publish-status `Select` (全て/公開/非公開), and "すべてクリア" — following `src/app/(private)/banners/_components/banners-filters.tsx` (depends on T015)
- [x] T018 [US1] Create `routine-list-content.tsx` in `src/app/(private)/routines/_components/`: `'use client'` orchestrator calling `useRoutineFilters()` and `useQuery({...getCrmRoutinesOptions({query: queryParams})})` directly, composing a filter-result banner (total/shown count + "条件をクリア"), `routine-filters.tsx`, a `Table`/`DataTable` using `routine-table-columns.tsx`, row-click navigating to `/routines/{id}`, `Empty` (`variant={hasActiveFilters ? 'filtered' : 'empty'}`, entityLabel "ルーティン"), and pagination with a page-size selector (25/50/100/200, default 50) — following `src/app/(private)/banners/page.tsx`'s composition (depends on T014, T015, T016, T017)
- [x] T019 [US1] Integrate `RoutineListContent` into `src/app/(private)/routines/page.tsx`'s content slot (from Foundational T008); add `PageHeader` with `title="ルーティン管理"`, a count badge, and a `RoleGatedButton` "新規登録" (`allowedRoles={["Headquarter", "System"]}`) navigating to `/routines/create` (depends on T018)

**Checkpoint**: User Story 1 is independently functional and testable — `/routines` shows the searchable, filterable, sortable, paginated table end to end.

---

## Phase 4: User Story 2 - View a routine's full detail (Priority: P1)

**Goal**: Show a routine's full basic info + thumbnail gallery + ordered exercise/set composition on its own detail page.

**Independent Test**: Open a row from the list and verify the "基本情報" tab shows name/description/category/exerciseCount/status/updatedAt/updatedBy + thumbnail gallery (with prev/next + strip when >1 image); switch to "エクササイズ構成" and verify the running "合計 N種目/Nセット" total, ordered exercise cards (name linking to the Y-08 exercise detail page, category badge, per-set table, HQ comment).

### Implementation for User Story 2

- [x] T020 [US2] Implement `GET` handler in `src/app/api/crm/routines/[id]/route.ts` per contracts/get-routine-detail.md: enforce `Permission.RoutinesView`, call `db.routines.getById(id)`, 404 (`E-RTN-001`) if not found, register via `registerRoute()` (depends on T005, T010)
- [x] T021 [US2] Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmRoutinesByIdOptions` (depends on T020)
- [x] T022 [P] [US2] Create `routine-detail-basic-info-tab.tsx` in `src/app/(private)/routines/_components/`: name, description, category `Badge`, exercise count, status `Badge`, last-updated date, updated-by, and a thumbnail gallery (prev/next navigation + thumbnail strip shown only when `thumbnailS3Keys.length > 1`; a placeholder empty state when `thumbnailS3Keys.length === 0`) — matching `routine-detail.tsx`'s `PhotoGallery` behavior
- [x] T023 [P] [US2] Create `routine-detail-exercise-composition-tab.tsx` in `src/app/(private)/routines/_components/`: a running "合計 N種目 / Nセット" total, then one card per exercise (ordered by `sortOrder`): position badge, exercise name as a link to `/exercises/{exerciseId}` (Y-08 detail route), `categoryName` `Badge`, a per-set table (set number, reps, recommended weight, time, RPE — no distance column, matching the prototype and FR-008), and an optional HQ comment block
- [x] T024 [US2] Build `src/app/(private)/routines/[id]/page.tsx` content: `useQuery({...getCrmRoutinesByIdOptions({path: {id}})})`, `Tabs` ("基本情報" → T022, "エクササイズ構成" → T023), `PageHeader` with a `BackLink` to `/routines`, title = routine name, subtitle = `routineCode`, and a status `Badge`; leave the actions area (複製/編集/削除) as an empty/placeholder slot, filled in progressively by US4/US5/US6 (depends on T021, T022, T023)

**Checkpoint**: User Stories 1 AND 2 both work independently — the list renders and clicking any row opens a fully-populated detail page.

---

## Phase 5: User Story 3 - Register a new HQ routine (Priority: P2)

**Goal**: Let an authorized user create a new routine (name/category required; description/thumbnail optional) with a full exercise/set composition, always saved as "非公開".

**Independent Test**: From the list, click "新規登録"; submit with name/category blank and verify inline errors + scroll-to-first-invalid; fill required fields, add an exercise (only published Y-08 exercises selectable) with a default-seeded set, submit, and verify the new routine appears in the list with "非公開" status and the correct exercise count.

### Implementation for User Story 3

- [x] T025 [US3] Add a `POST` handler to `src/app/api/crm/routines/route.ts` (alongside the existing `GET` from T013) per contracts/create-routine.md: validate body via `UpsertRoutineBodySchema`, enforce `Permission.RoutinesCreate`, call `db.routines.create(body)`, register via `registerRoute()` (depends on T005, T010)
- [x] T026 [US3] Run `npm run generate-openapi` then `npm run generate-api` to produce the create mutation (depends on T025)
- [x] T027 [P] [US3] Create `use-routine-form.hook.ts` in `src/app/(private)/routines/_hooks/`: form state (`name`/`description`/`categoryId`/`thumbnailS3Keys`/`exercises[]`/`isPublished`), `validate()` (required `name`/`categoryId`; `targetReps`/`targetWeightKg` ≥ 0 when provided), `markDirty()` wired through `useUnsavedChanges`, and a `mode: 'create' | 'edit'`-aware submit handler (POST for create; PATCH for edit, added in US4)
- [x] T028 [P] [US3] Create `routine-form-basic-info-section.tsx` in `src/app/(private)/routines/_components/`: routine-code display ("保存後に自動採番されます" when creating, immutable), name `Input` (required, inline error), description `Textarea`, category `Select` (options from `getCrmRoutineCategoriesOptions`, required, inline error)
- [x] T029 [P] [US3] Create `routine-form-thumbnail-section.tsx` in `src/app/(private)/routines/_components/`: up to 5 image upload/preview/remove, first = primary, reusing `src/hooks/use-image-upload.hook.ts` per this project's established image-upload convention
- [x] T030 [US3] Create `routine-form-exercise-composition-section.tsx` in `src/app/(private)/routines/_components/`: exercise picker (searchable combobox calling `useQuery({...getCrmExercisesOptions({query: {publishStatus: 'public', search}})})`, research.md R1 — no new exercise-search endpoint), add/reorder (up/down)/remove exercise, per-exercise HQ comment `Textarea`, per-exercise set table (add/copy/remove set; default-value seeding from research.md R5's `DEFAULT_WEIGHT_BY_TOOL_CODE` table plus reps=10/duration=90s/RPE=0; inline ≥0 validation feedback on reps/weight) (depends on T027)
- [x] T031 [US3] Build `src/app/(private)/routines/create/page.tsx` content: assemble Section 1 (T028) + Section 2 (T029) + Section 3 (T030) + a Section 4 publish switch (disabled with an inline "エクササイズを1件以上登録してください" message when `exercises.length === 0`, per FR-010) + footer Cancel (routed through `useUnsavedChanges`'s discard-confirmation) / Submit, with `mode="create"` (depends on T026, T027, T028, T029, T030)

**Checkpoint**: User Story 3 is independently functional — creating a new routine end-to-end works and the result is visible via US1/US2.

---

## Phase 6: User Story 4 - Edit an existing routine, including publish control (Priority: P2)

**Goal**: Let an authorized user edit a routine's basic info/thumbnail/composition, and toggle publish/unpublish, guarded by the zero-exercise safeguard.

**Independent Test**: Open edit from the list or detail page, change a field and the exercise composition, save, and confirm the changes are reflected; attempt to publish a routine with zero exercises from the list row menu and confirm it's blocked with an explanation; publish a routine with ≥1 exercise and confirm it succeeds.

### Implementation for User Story 4

- [x] T032 [US4] Add a `PATCH` handler to `src/app/api/crm/routines/[id]/route.ts` (alongside the existing `GET` from T020) per contracts/update-routine.md: validate body via `UpsertRoutineBodySchema.partial()`, enforce `Permission.RoutinesEdit`, call `db.routines.update(id, body)`, register via `registerRoute()` (depends on T005, T010)
- [x] T033 [US4] Implement `PATCH /api/crm/routines/[id]/publish-status/route.ts` per contracts/update-routine-publish-status.md: validate body via `UpdateRoutinePublishStatusBodySchema`, enforce `Permission.RoutinesPublish`, call `db.routines.updatePublishStatus(id, body)`, register via `registerRoute()` (depends on T005, T010)
- [x] T034 [US4] Run `npm run generate-openapi` then `npm run generate-api` to produce the edit and publish-status mutations (depends on T032, T033)
- [x] T035 [US4] Extend `use-routine-form.hook.ts` (T027) for `mode="edit"`: pre-fill all fields from `getCrmRoutinesByIdOptions`'s response (US2, T021), submit via the PATCH mutation (T034) instead of POST (depends on T027, T034)
- [x] T036 [US4] Build `src/app/(private)/routines/[id]/edit/page.tsx` content, reusing Sections 1–4 from T028/T029/T030/T031 with `mode="edit"` and `use-routine-form.hook.ts`'s edit path (T035) (depends on T035)
- [x] T037 [US4] Create `routine-row-actions-menu.tsx` in `src/app/(private)/routines/_components/` and wire it as the actions column on `routine-table-columns.tsx` (T016): `DropdownMenu` with `RoleGatedMenuItem` "編集" (navigates to `/routines/{id}/edit`) and a publish-status toggle item ("非公開にする" when published; "公開する" when unpublished with ≥1 exercise; a disabled item with an inline reason when unpublished with 0 exercises) calling the publish-status mutation (T034) — both gated to Headquarter/System (depends on T016, T034)
- [x] T038 [US4] Add a `RoleGatedButton` "編集" to `src/app/(private)/routines/[id]/page.tsx`'s header actions (US2, T024), navigating to `/routines/{id}/edit` (depends on T024, T036)

**Checkpoint**: User Stories 1–4 all work independently — edit and publish/unpublish (with the zero-exercise guard) are reachable from both the list row menu and the detail page.

---

## Phase 7: User Story 5 - Duplicate a routine (Priority: P3)

**Goal**: Let an authorized user duplicate a routine's full basic info + composition into a new, always-unpublished copy, landing on that copy's edit screen.

**Independent Test**: From the list row menu, choose "複製" and confirm a new routine is created with all data copied, name suffixed "のコピー", forced "非公開" status (even when duplicating a published source), landing on the copy's edit screen.

### Implementation for User Story 5

- [x] T039 [US5] Implement `POST /api/crm/routines/[id]/duplicate/route.ts` per contracts/duplicate-routine.md: enforce `Permission.RoutinesCreate`, call `db.routines.duplicate(id)`, register via `registerRoute()` (depends on T005, T010)
- [x] T040 [US5] Run `npm run generate-openapi` then `npm run generate-api` to produce the duplicate mutation (depends on T039)
- [x] T041 [P] [US5] Add a `RoleGatedMenuItem` "複製" to `routine-row-actions-menu.tsx` (US4, T037): calls the duplicate mutation, shows a success toast, navigates to `/routines/{newId}/edit` (depends on T037, T040)
- [x] T042 [P] [US5] Add a `RoleGatedButton` "複製" to `src/app/(private)/routines/[id]/page.tsx`'s header actions (US2/US4, T024/T038): same duplicate-and-navigate behavior as T041 (depends on T038, T040)

**Checkpoint**: User Stories 1–5 all work independently — duplication works from both the list row menu and the detail page header.

---

## Phase 8: User Story 6 - Delete a routine (Priority: P3)

**Goal**: Let an authorized user permanently remove an unpublished routine; block deletion outright (not merely warn) while published, guiding the user to unpublish first.

**Independent Test**: Attempt to delete a published routine (from the list row menu and from the detail page) and confirm it's blocked with guidance to unpublish first; unpublish it and confirm delete now succeeds after a confirmation dialog.

### Implementation for User Story 6

- [x] T043 [US6] Add a `DELETE` handler to `src/app/api/crm/routines/[id]/route.ts` (alongside `GET`/`PATCH` from T020/T032) per contracts/delete-routine.md: enforce `Permission.RoutinesDelete`, call `db.routines.delete(id)`, return `409 E-RTN-002` when blocked (published), `204` on success, register via `registerRoute()` (depends on T005, T010)
- [x] T044 [US6] Run `npm run generate-openapi` then `npm run generate-api` to produce the delete mutation (depends on T043)
- [x] T045 [P] [US6] Create `routine-delete-dialog.tsx` in `src/app/(private)/routines/_components/`: an `AlertDialog` that renders a "cannot delete — unpublish first" guidance message (no destructive action, matching `routine-detail.tsx`'s prototype dialog) when the target routine is published, or a destructive delete-confirmation (calling the delete mutation, T044) when unpublished (depends on T044)
- [x] T046 [US6] Add a `RoleGatedMenuItem` "削除" to `routine-row-actions-menu.tsx` (US4/US5, T037/T041): disabled with an inline reason when the row is published (matching the prototype's disabled `DropdownMenuItem` style), otherwise opens `routine-delete-dialog.tsx` (T045) (depends on T037, T045)
- [x] T047 [US6] Add a delete action to `src/app/(private)/routines/[id]/page.tsx`'s header actions (US2/US4/US5, T024/T038/T042), opening `routine-delete-dialog.tsx` (T045); when published, the dialog offers a shortcut into the edit screen (`/routines/{id}/edit`) instead of a confirm action, matching `routine-detail.tsx`'s prototype (depends on T042, T045)

**Checkpoint**: All six user stories are independently functional — the Y-09 Routine Master Management feature described in spec.md is complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency and verification across all stories; no automated tests per constitution.

- [x] T048 [P] Run `npm run lint` and `npm run type-check`; fix any violations across all new/modified files
- [x] T049 Run `npm run build` to validate production compilation; record the result in `specs/016-routine-management/quickstart.md`'s Verification Log
- [x] T050 Manually walk through spec.md's Success Criteria SC-001–SC-006 and every Edge Case (0-exercise publish-block, published-routine delete-block, duplicate-forces-unpublished, time-only-set with blank reps/weight, empty-vs-filtered list states, discard-confirmation on unsaved navigation, role-gating for non-Headquarter/System roles); record pass/fail notes in `specs/016-routine-management/quickstart.md`'s Manual Verification Checklist and Verification Log

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–8)**: All depend on Foundational phase completion.
  - US1 and US2 (both P1) have no dependency on each other's _implementation_, but US1's row-click UX is only fully meaningful once US2 exists; both can be built in parallel by different people.
  - US3 (create) and US4 (edit) share the `use-routine-form.hook.ts` and Section 1–3 form components — US4 extends what US3 builds, so US3 should land first (matches spec.md's own priority order).
  - US4, US5, and US6 all extend the same `routine-row-actions-menu.tsx` and the same detail-page header actions area — each adds one more action, so they are naturally sequential in priority order (P2 → P3 → P3), even though each is independently _testable_ once its own tasks land.
- **Polish (Phase 9)**: Depends on all six user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories.
- **User Story 2 (P1)**: Can start after Foundational — no dependency on other stories.
- **User Story 3 (P2)**: Can start after Foundational — no dependency on other stories' code, though it depends on the categories endpoint (Foundational) and the exercise picker (existing Y-08 endpoint).
- **User Story 4 (P2)**: Can start after Foundational; reuses US2's detail page (T024) and US3's form hook/sections (T027–T030) — build after US2 and US3.
- **User Story 5 (P3)**: Reuses US4's row-actions menu (T037) and US2/US4's detail header (T024/T038) — build after US4.
- **User Story 6 (P3)**: Reuses US4/US5's row-actions menu (T037/T041) and detail header (T024/T038/T042) — build after US5.

### Critical Ordering Constraints

- T009 (`generate-routes`) MUST run after T008 (page shells exist) and before T010 (`PAGE_PERMISSIONS` type-checks against the generated `RoutePattern` union).
- Within `src/app/api/crm/routines/route.ts`: T013 (GET) lands before T025 (POST) — same file, sequential.
- Within `src/app/api/crm/routines/[id]/route.ts`: T020 (GET) lands before T032 (PATCH) before T043 (DELETE) — same file, sequential.
- Each story that adds/modifies a mock API route re-runs `npm run generate-openapi && npm run generate-api` before its UI tasks consume the newly-generated client hooks.

### Parallel Opportunities

- T002 and T003 (schema files) can run in parallel.
- T007 (permissions) can run in parallel with T002–T006 (different files).
- Within US1: T015 and T016 can run in parallel (different files).
- Within US2: T022 and T023 can run in parallel (different files).
- Within US3: T027, T028, T029 can run in parallel (different files); T030 depends on T027.
- Within US5: T041 and T042 can run in parallel (different files).
- Within US6: T045 can start as soon as T044 is done; T046/T047 depend on T045 but not on each other, so once T045 lands they can run in parallel.
- Different user stories can be worked on in parallel by different team members once their stated dependencies (above) are satisfied.

---

## Parallel Example: User Story 1

```bash
# After T014 (generated client ready):
Task: "Create use-routine-filters.hook.ts in src/app/(private)/routines/_hooks/"
Task: "Create routine-table-columns.tsx in src/app/(private)/routines/_components/"

# Then, once T015/T016 are done:
Task: "Create routine-filters.tsx in src/app/(private)/routines/_components/"
```

## Parallel Example: User Story 3

```bash
# After T026 (generated client ready):
Task: "Create use-routine-form.hook.ts in src/app/(private)/routines/_hooks/"
Task: "Create routine-form-basic-info-section.tsx in src/app/(private)/routines/_components/"
Task: "Create routine-form-thumbnail-section.tsx in src/app/(private)/routines/_components/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Load `/routines`, confirm search/filter/sort/paginate/empty-states all work
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (list + detail viewing)
4. Add User Story 3 → Test independently → Deploy/Demo (+ create)
5. Add User Story 4 → Test independently → Deploy/Demo (+ edit + publish control)
6. Add User Story 5 → Test independently → Deploy/Demo (+ duplicate)
7. Add User Story 6 → Test independently → Deploy/Demo (+ delete) — feature complete
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: User Story 1 (list)
   - Developer B: User Story 2 (detail)
   - Developer C: User Story 3 (create) — can start immediately, but coordinate with Developer B on `[id]/route.ts` (T020) if timing overlaps with US4 later
3. User Story 4 starts once both US2 and US3 land (reuses their code); User Story 5 once US4 lands; User Story 6 once US5 lands.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story should be independently completable and testable, per its own Independent Test description above.
- Several later stories (US4/US5/US6) deliberately extend files created by earlier stories (`routine-row-actions-menu.tsx`, the detail page's header actions) rather than each creating a parallel component — this matches the UI prototype's own single unified action-menu/header design and avoids introducing redundant abstractions (Constitution V).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, unnecessary same-file conflicts, cross-story dependencies that aren't already called out above.
