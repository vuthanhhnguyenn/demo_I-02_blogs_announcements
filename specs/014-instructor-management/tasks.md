# Tasks: D-04 Instructor Management

**Input**: Design documents from `specs/014-instructor-management/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- All paths are relative to repository root `/home/du/WorkSpace/dx-fitness/fitness-crm/`

## Important existing-code notes

- `GET /crm/instructors` (`src/app/api/crm/instructors/route.ts`) already exists and is consumed by the D-01 lesson-scheduling instructor picker via the generated client (`getCrmInstructors` in `src/lib/api/sdk.gen.ts`). All changes to its schema/behavior MUST be additive — do not remove or repurpose existing fields/params.
- The current instructor mock data lives as an inline `instructors: { ... }` object inside the big table factory in `src/app/api/_mock-db/tables/lesson.table.ts` (around the `instructors:` key), seeded from `SEED_RESERVATION_INSTRUCTORS` in `src/app/api/_mock-db/seeds/lesson.seed.ts`. `src/app/api/_mock-db/types/instructors.type.ts` only declares the `InstructorsType` interface consumed by `src/app/api/_mock-db/_db.types.ts` — it has no runtime implementation of its own.
- Follow `src/lib/utils/studio-permissions.ts` as the pattern reference for `instructor-permissions.ts`, and `src/app/api/_mock-db/types/brands.type.ts`'s `_changeHistories` array as the pattern reference for instructor change history.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Declare new schemas and the static permission matrix required before mock-db or route work can begin.

- [x] T001 [P] Create `src/app/api/_schemas/instructor.schema.ts` with `extendZodWithOpenApi(z)` header and Zod schemas per [data-model.md](data-model.md): `RoleClassificationSchema` (`trainer`/`instructor`/`body_care_therapist`), `InstructorStatusSchema` (`active`/`inactive`), `BufferSettingsSchema` (`min_booking_lead_hours` enum of `0,1,2,3,6,12,24,48,72`; `pre_buffer_minutes`/`post_buffer_minutes` enum of `0,15,30,45,60`), `CrmAccountLinkSchema`, `PerformanceSummarySchema`, `AssignedLessonSummarySchema`, `RecurringSettingSummarySchema`, `UpcomingScheduleEntrySchema`, `InstructorSchema`, `InstructorChangeHistoryEntrySchema`, `CreateInstructorRequestSchema`, `UpdateInstructorRequestSchema`, `UpdateInstructorStatusRequestSchema`, `GetInstructorDetailResponseSchema`, `GetInstructorHistoryResponseSchema`; export `z.infer<>` types for each
- [x] T002 [P] Extend `InstructorListItemSchema` in `src/app/api/_schemas/lesson-schedule.schema.ts` with additive optional fields (`nickname`, `romaji_name`, `role_classifications`, `tab`, `brands`, `status`) and extend `GetInstructorsQuerySchema` with optional `tab`, `search`, `brand`, `status` params — keep existing fields/params (`instructor_id`, `instructor_name`, `store_id`, `role`, `photo_url`) unchanged, per [contracts/list-instructors.md](contracts/list-instructors.md)
- [x] T003 [P] Create `src/lib/utils/instructor-permissions.ts` modeled after `src/lib/utils/studio-permissions.ts`: `canPerformInstructorAction(role: StaffRole, action: 'register' | 'edit' | 'delete', context?: { isSelf: boolean }): boolean` and `getEditableFields(role: StaffRole, isSelf: boolean): 'all' | InstructorEditableField[]` implementing the `InstructorActionPermissions` matrix in [data-model.md](data-model.md) (Trainer self-edit limited to `nickname`/`romaji_name`/`profile_text`/`photo_url`/`instructing_history`/`buffer_settings`)

**Checkpoint**: New schemas compile; permission matrix helper is unit-callable (no DB dependency yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Rework the mock data layer that every user story reads from or writes to.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Rework the inline `instructors` table object in `src/app/api/_mock-db/tables/lesson.table.ts` to carry the full profile shape (`name`, `romaji_name`, `nickname`, `role_classifications`, `profile_text`, `instructing_history`, `photo_url`, `status`, `buffer_settings`, `crm_account_link_staff_id`, `created_at`, `updated_at`) while preserving the existing `getList(storeId?, role?)`/`getById(id)` method signatures and legacy `instructor_id`/`instructor_name`/`store_id`/`photo_url` fields for the D-01 consumer; mirror `role_classifications[0]` into the legacy `role` field on every row
- [x] T005 Update the `InstructorsType` interface in `src/app/api/_mock-db/types/instructors.type.ts` to match the T004 shape and declare the new methods (`create`, `update`, `updateStatus`, `delete`, `getHistory`, `getDetail`) so `src/app/api/_mock-db/_db.types.ts` stays accurate (depends on T004)
- [x] T006 Replace/extend `SEED_RESERVATION_INSTRUCTORS` in `src/app/api/_mock-db/seeds/lesson.seed.ts` with full profile seed data covering the Phase 1 Seed Requirements in [data-model.md](data-model.md): both `studio` and `pt` tabs, an instructor with zero assigned schedules, an instructor with `assigned_schedule_count > 0`, an instructor with no nickname/romaji/profile/photo, one with a `crm_account_link` and one without, one `inactive`, one with all 3 role classifications, spanning at least 2 stores (depends on T004)
- [x] T007 Add brand-derivation and `assigned_schedule_count` computation to the `instructors` table object in `lesson.table.ts`: for a given `instructor_id`, look up its active assigned lesson schedule rows, resolve each to its studio then `db.stores`/store `brand` field, and return the deduplicated brand list and the schedule count (depends on T004)
- [x] T008 Implement `create()`, `update()`, `updateStatus()`, `delete()`, and `getHistory()` on the `instructors` table object in `lesson.table.ts`: `create` generates ID `INS-{N}`, defaults `status: 'active'` and unset buffer fields to `0`, and appends one "Newly Created" entry to a per-instructor `_changeHistories` array (same pattern as `src/app/api/_mock-db/types/brands.type.ts`); `update` merges fields and appends one change-history row per changed field; `updateStatus` flips `status` and appends a `field: "status"` history row; `delete` removes the row only when `assigned_schedule_count === 0` (throws/returns a guard signal otherwise, for the route to translate into 409) (depends on T004, T007)
- [x] T009 Add `resolveInstructorDataScope(role: StaffRole, context: { callerInstructorId?: string; managedStoreIds?: string[]; ownStoreId?: string })` to `src/lib/utils/instructor-permissions.ts`, returning a predicate/filter usable by list, detail, and mutation routes to enforce FR-005 (System/Headquarter: all; Manager: managed stores; Staff/Observer: own store; Trainer: self only) (depends on T003, T004)

**Checkpoint**: Foundation ready — mock data supports full CRUD + history + scope resolution; user story implementation can now begin.

---

## Phase 3: User Story 1 - Browse and find instructors (Priority: P1) 🎯 MVP

**Goal**: Two-tab instructor list (Studio Instructor / Personal Trainer) with search, filters, active-filter count, clear-all, empty state, and role-scoped visibility.

**Independent Test**: Open the list page, switch tabs, type a search term, toggle each filter, and verify the table updates accordingly without navigating elsewhere.

### Implementation for User Story 1

- [x] T010 [US1] Extend the `GET` handler in `src/app/api/crm/instructors/route.ts`: parse new `tab`/`search`/`brand`/`status` query params, apply `resolveInstructorDataScope()` before other filters, call the extended `db.instructors.getList()`, per [contracts/list-instructors.md](contracts/list-instructors.md) — verify the response still parses under the pre-existing `GetInstructorsResponseSchema` shape when only `store_id`/`role` are supplied
- [x] T011 [P] [US1] Create `src/app/(private)/instructors/_components/instructor-tabs.tsx` — Studio Instructor / Personal Trainer tabs, each with a record-count badge sourced from the list response
- [x] T012 [P] [US1] Create `src/app/(private)/instructors/_components/instructor-search.tsx` — search input matching name/nickname/romaji name/instructor ID
- [x] T013 [P] [US1] Create `src/app/(private)/instructors/_components/instructor-filters.tsx` — expandable filter panel with role classification/brand/status `Select`s, active-filter count badge, and a "clear all" action that resets filters and the search field
- [x] T014 [US1] Create `src/app/(private)/instructors/_components/instructor-list-section.tsx` — table with columns (ID, name+photo, nickname, role classification badges, brand badges, status), and an empty/filtered state with a "clear conditions" action when zero rows match (depends on T011, T012, T013)
- [x] T015 [US1] Create `src/app/(private)/instructors/page.tsx` — React Query fetch against the extended `GET /crm/instructors`, compose tabs + search + filters + list section, role-gated "New Instructor Registration" button (`RoleGatedButton`, disabled with tooltip for Trainer/Observer per FR-018) (depends on T010, T014)

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 3 - View instructor detail (Priority: P1)

**Goal**: Full instructor detail page — basic info, profile, buffer settings, CRM link, status, performance summary, assigned lessons, upcoming schedule — with role-gated action buttons.

**Independent Test**: Open a row from the list and verify every section renders (basic info, profile, buffer settings, CRM link, status card, performance summary, assigned lessons, upcoming schedule) and that action buttons are gated by role.

### Implementation for User Story 3

- [x] T016 [US3] Create `src/app/api/crm/instructors/[id]/route.ts` `GET` handler: resolve the full `Instructor` aggregate + `performance_summary` + `assigned_lessons` + `upcoming_schedule` (recurring summary + full entries list), enforce `resolveInstructorDataScope()` (404 outside scope or unknown ID), per [contracts/instructor-detail.md](contracts/instructor-detail.md)
- [x] T017 [P] [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-detail-skeleton.tsx`
- [x] T018 [P] [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-basic-info-card.tsx` — ID, name, nickname, romaji name, role classification badges, registered/updated dates, profile text, instructing history, with sensible empty states for absent optional fields
- [x] T019 [P] [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-buffer-settings-card.tsx` — displays minimum booking lead time, pre-buffer, post-buffer
- [x] T020 [P] [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-crm-link-card.tsx` — shows linked staff name/role or an explicit "no account linked" empty state
- [x] T021 [P] [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-status-card.tsx` — displays the current Active/Inactive badge (Activate/Deactivate action wiring happens in US5)
- [x] T022 [P] [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-performance-summary-card.tsx` — single combined card with weekly lesson count, average reservation rate, average rating (explicit "no rating yet" state when `null`), and monthly participant count (FR-011, no separate rating-only card)
- [x] T023 [P] [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-assigned-lessons-card.tsx` — compact list (lesson name, weekday(s), time, reservation rate) linking to lesson detail, with an empty state for zero assigned lessons
- [x] T024 [P] [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-upcoming-schedule-card.tsx` — first 3 entries inline plus an "expand" trigger, empty state for zero upcoming entries
- [x] T025 [US3] Create `src/app/(private)/instructors/[id]/_components/instructor-upcoming-schedule-sheet.tsx` — side panel showing the recurring-setting summary plus the full individual schedule entry list (depends on T024)
- [x] T026 [US3] Create `src/app/(private)/instructors/[id]/page.tsx` — "Basic Information" tab composing all cards from T018-T025 in a two-column layout, header with role-gated Edit/Delete action buttons (disabled + explanatory tooltip when the caller's role lacks permission; Trainer viewing their own profile sees only the edit action enabled) per the `InstructorActionPermissions` matrix (depends on T016-T025)
- [x] T027 [US3] Add a "Change History" tab to the detail page with a visible title and an empty-content placeholder (content is populated in US6, same convention as `011-studio-detail-page`) (depends on T026)

**Checkpoint**: User Stories 1 and 3 (both P1) are fully functional and independently testable — this is the MVP.

---

## Phase 5: User Story 2 - Register a new instructor (Priority: P2)

**Goal**: Registration form capturing full profile, buffer settings, and optional CRM account link, with validation and a confirmation dialog.

**Independent Test**: From the list page, click "New Instructor Registration," fill required fields, submit, confirm on the review dialog, and verify a validation error appears when a required field is left blank.

### Implementation for User Story 2

- [x] T028 [US2] Add a `POST` handler to `src/app/api/crm/instructors/route.ts`: validate `name`/`role_classifications` (return `"{field name} is required"` on the first missing one), default `status: 'active'` and unset buffer fields, call `db.instructors.create()`, return 201 with the full `Instructor` aggregate, 403 for Trainer/Observer callers, per [contracts/instructor-mutations.md](contracts/instructor-mutations.md)
- [x] T029 [P] [US2] Create `src/app/(private)/instructors/_components/instructor-form.schema.ts` — react-hook-form + Zod values schema mirroring `CreateInstructorRequestSchema`, with the same required-field rules as FR-006
- [x] T030 [P] [US2] Create `src/app/(private)/instructors/_components/instructor-form/instructor-form-basic-info.tsx` — name (required), nickname, romaji name, role classification multi-select (required, 1-3), inline `"{field name} is required"` errors
- [x] T031 [P] [US2] Create `src/app/(private)/instructors/_components/instructor-form/instructor-form-profile.tsx` — profile text, instructing history textareas, photo upload via the existing `useImageUpload` hook
- [x] T032 [P] [US2] Create `src/app/(private)/instructors/_components/instructor-form/instructor-form-buffer-settings.tsx` — three `Select`s: minimum booking lead time (`0/1/2/3/6/12/24/48/72` hours), pre-buffer and post-buffer (`0/15/30/45/60` minutes each)
- [x] T033 [P] [US2] Create `src/app/(private)/instructors/_components/instructor-form/instructor-form-crm-link.tsx` — `Popover`+`Command` search combobox against `GET /crm/staffs?search=`, selected staff shown as a removable badge, optional field
- [x] T034 [P] [US2] Create `src/app/(private)/instructors/_components/instructor-form/instructor-form-confirm-dialog.tsx` — `AlertDialog` summarizing name, nickname, role classifications, status, and linked CRM account before finalizing create/edit (FR-009)
- [x] T035 [P] [US2] Create `src/app/(private)/instructors/_components/instructor-form/instructor-form-skeleton.tsx`
- [x] T036 [US2] Create `src/app/(private)/instructors/_components/instructor-form/instructor-form.tsx` — main form component (modeled after `studio-form.tsx`/`lesson-form.tsx`) composing T030-T034, `mode: 'create' | 'edit'` prop, wires submit → confirm dialog → API call (depends on T029-T035)
- [x] T037 [US2] Create `src/app/(private)/instructors/create/page.tsx` rendering `InstructorForm` with `mode="create"`, submitting to the new `POST` endpoint and navigating to the created instructor's detail page on success (depends on T028, T036)

**Checkpoint**: User Story 2 is fully functional and independently testable.

---

## Phase 6: User Story 4 - Edit an existing instructor (Priority: P2)

**Goal**: Edit form reusing `InstructorForm`, with role-scoped field editability (Trainer self-edit keeps `name`/`role_classifications` read-only).

**Independent Test**: Open edit from the detail page as different roles and verify the correct fields are editable/locked, then save and confirm the update is reflected in detail view.

### Implementation for User Story 4

- [x] T038 [US4] Add a `PUT` handler to `src/app/api/crm/instructors/[id]/route.ts`: apply `getEditableFields()` server-side (silently ignore `name`/`role_classifications` changes from a Trainer editing their own profile; 403 for a Trainer editing another ID or for Observer), reject `status` in the body (400), validate the merged record with the same required-field rules as create, append one change-history row per changed field, per [contracts/instructor-mutations.md](contracts/instructor-mutations.md) (depends on T016 for the shared detail-fetch shape, T008)
- [x] T039 [US4] Extend `instructor-form.tsx`/`instructor-form-basic-info.tsx` (from US2) to accept a `lockedFields` prop, rendering `name` and `role_classifications` as read-only with a "cannot be self-edited" note when locked (depends on T036, T003)
- [x] T040 [US4] Create `src/app/(private)/instructors/[id]/edit/page.tsx` — fetch the existing instructor via `GET /crm/instructors/[id]`, compute `lockedFields` via `getEditableFields()` for the current caller, render `InstructorForm` with `mode="edit"` and the fetched values, submit to `PUT`, navigate back to the detail view on success (depends on T038, T039)

**Checkpoint**: User Story 4 is fully functional and independently testable.

---

## Phase 7: User Story 5 - Deactivate or delete an instructor (Priority: P2)

**Goal**: Activate/Deactivate toggle on the status card, and a guarded delete flow that blocks whenever schedules are assigned.

**Independent Test**: Toggle status active/inactive from the detail page's status card, and attempt delete on instructors with and without assigned schedules to verify the guardrail.

### Implementation for User Story 5

- [x] T041 [US5] Create `src/app/api/crm/instructors/[id]/status/route.ts` `PATCH` handler — Headquarter/Manager/System only, calls `db.instructors.updateStatus()`, appends a `field: "status"` history row, per [contracts/instructor-mutations.md](contracts/instructor-mutations.md)
- [x] T042 [US5] Add a `DELETE` handler to `src/app/api/crm/instructors/[id]/route.ts` — re-reads `assigned_schedule_count` at request time (never trusts a client-supplied count), returns 409 with the count in the message when `> 0`, otherwise calls `db.instructors.delete()` and returns 204, per [contracts/instructor-mutations.md](contracts/instructor-mutations.md) (depends on T008)
- [x] T043 [US5] Wire `instructor-status-card.tsx` (from US3/T021) with an Activate/Deactivate button and confirmation toast calling the `PATCH .../status` endpoint, visible only to Headquarter/Manager/System (depends on T021, T041)
- [x] T044 [US5] Create `src/app/(private)/instructors/[id]/_components/instructor-delete-dialog.tsx` — shows a blocking warning stating the assigned-schedule count and disables the confirm action when `assigned_schedule_count > 0`; on confirm with zero schedules, calls `DELETE` and navigates to the instructor list
- [x] T045 [US5] Wire the Delete action button on the detail page header (from US3/T026) to `instructor-delete-dialog.tsx`, visible only to Headquarter/Manager/System (depends on T026, T042, T044)

**Checkpoint**: User Story 5 is fully functional and independently testable.

---

## Phase 8: User Story 6 - Review instructor change history (Priority: P3)

**Goal**: Chronological, field-level change history tab.

**Independent Test**: Open the "Change History" tab on an instructor's detail page and verify each change entry lists timestamp, operator, changed field, before value, and after value; creation events are marked distinctly.

### Implementation for User Story 6

- [x] T046 [US6] Create `src/app/api/crm/instructors/[id]/history/route.ts` `GET` handler returning `{ entries, total }` from `db.instructors.getHistory()`, per [contracts/instructor-mutations.md](contracts/instructor-mutations.md)
- [x] T047 [US6] Create `src/app/(private)/instructors/[id]/_components/instructor-history-tab.tsx` — one row per changed field (timestamp, operator, field, before, after), with a distinct "Newly Created" indicator for `is_creation: true` entries instead of a before/after diff
- [x] T048 [US6] Wire the "Change History" tab shell (from US3/T027) to fetch `GET .../history` and render `instructor-history-tab.tsx` when the tab is activated (depends on T027, T046, T047)

**Checkpoint**: All user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Regenerate derived artifacts and validate the whole feature, including its effect on the pre-existing D-01 dependency.

- [x] T049 [P] Run `npm run generate-routes` after all new route segments exist
- [x] T050 [P] Run `npm run generate-openapi` then `npm run generate-api` to refresh `src/lib/api/`, and confirm the existing `getCrmInstructors` call site (D-01 lesson-scheduling picker) still compiles against the extended response shape
- [ ] T051 Manually verify the D-01 lesson-scheduling instructor picker still lists/selects instructors correctly after the mock-db rework
- [x] T052 Run `npm run lint` and `npm run typecheck` (`tsc --noEmit`) across all new/changed files
- [ ] T053 Walk through every acceptance scenario in `spec.md` (User Stories 1-6) manually per the verification steps in [quickstart.md](quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 and US3 (both P1) have no dependency on each other and can proceed in parallel
  - US2 (P2) depends only on Foundational
  - US4 (P2) depends on US2's shared `InstructorForm` (T036) and US3's detail-fetch shape (T016)
  - US5 (P2) depends on US3's status card (T021) and detail page header (T026)
  - US6 (P3) depends on US3's Change History tab shell (T027)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 3 (P1)**: Can start after Foundational — no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational — no dependency on other stories
- **User Story 4 (P2)**: Requires US2's `InstructorForm` component and US3's detail route/page to exist
- **User Story 5 (P2)**: Requires US3's status card and detail page header to exist
- **User Story 6 (P3)**: Requires US3's Change History tab shell to exist

### Within Each User Story

- Route/schema/mock-db tasks before UI components that consume them
- Card/section components before the page that composes them
- Story complete before dependent stories (US4, US5, US6) begin their wiring tasks

### Parallel Opportunities

- All Setup tasks (T001-T003) can run in parallel
- T005, T006, T007 within Foundational depend on T004 but not on each other conversationally — still run sequentially against the same file (`lesson.table.ts`) to avoid merge conflicts; T005 (a different file, `instructors.type.ts`) can run in parallel with T006/T007/T008
- Once Foundational completes: US1 and US3 can be built in parallel (different route files, different page directories); US2 can also start in parallel with both
- Within US1: T011, T012, T013 (different component files) run in parallel
- Within US3: T017-T024 (different component files) run in parallel
- Within US2: T029-T035 (different component files) run in parallel
- T049 and T050 in Polish can run in parallel with T051-T053 manual verification prep, but `generate-api` (T050) should complete before final `typecheck` (T052)

---

## Parallel Example: User Story 1

```bash
# Launch all list-page components for User Story 1 together:
Task: "Create instructor-tabs.tsx in src/app/(private)/instructors/_components/instructor-tabs.tsx"
Task: "Create instructor-search.tsx in src/app/(private)/instructors/_components/instructor-search.tsx"
Task: "Create instructor-filters.tsx in src/app/(private)/instructors/_components/instructor-filters.tsx"
```

## Parallel Example: User Story 3

```bash
# Launch all detail-page card components for User Story 3 together:
Task: "Create instructor-basic-info-card.tsx"
Task: "Create instructor-buffer-settings-card.tsx"
Task: "Create instructor-crm-link-card.tsx"
Task: "Create instructor-status-card.tsx"
Task: "Create instructor-performance-summary-card.tsx"
Task: "Create instructor-assigned-lessons-card.tsx"
Task: "Create instructor-upcoming-schedule-card.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Browse/find)
4. Complete Phase 4: User Story 3 (View detail)
5. **STOP and VALIDATE**: Both P1 stories together let a user browse to and inspect any instructor — test independently per each story's Independent Test
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US3 → Test independently → Deploy/Demo (MVP!)
3. Add US2 (Register) → Test independently → Deploy/Demo
4. Add US4 (Edit) → Test independently → Deploy/Demo
5. Add US5 (Deactivate/Delete) → Test independently → Deploy/Demo
6. Add US6 (Change History) → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories or the pre-existing D-01 instructor picker

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (list)
   - Developer B: User Story 3 (detail) + User Story 2 (register, shares no files with US3)
   - Developer C: begins User Story 4/5/6 scaffolding once US2/US3 land their shared components
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This project has **no automated test suite** (constitution's No Testing Policy) — verification is `tsc --noEmit`, ESLint, and manual scenario walkthroughs, not test tasks
- Every task touching `src/app/api/crm/instructors/route.ts` must preserve backward compatibility with the D-01 lesson-scheduling instructor picker
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
