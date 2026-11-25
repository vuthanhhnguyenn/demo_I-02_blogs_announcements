# Tasks: Y-06 App Maintenance Management

**Input**: Design documents from `/specs/016-app-maintenance-mgmt/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story (from spec.md, in priority order: US1 P1, US2 P1, US3 P2, US4 P3) to enable independent implementation and testing of each story.

**No test tasks**: Per `.specify/memory/constitution.md`'s absolute "No Testing Policy," this list contains zero test-writing tasks (no unit/integration/e2e/contract tests). Verification is manual, against `quickstart.md`'s checklist, plus `tsc --noEmit` and ESLint.

**Backend-in-Foundational**: All four spec.md user stories are UI-shaped (browse, create, edit, delete), but the two backend route files each serve multiple stories on shared HTTP methods (`route.ts` = list GET **and** create POST; `[id]/route.ts` = detail GET **and** update PATCH **and** delete DELETE). Splitting a single file's methods across phases would force repeated edits to the same file from different "independent" stories. Per plan.md's Implementation Order Note, the full schema/table/routes/codegen are therefore built once in Foundational (thin, contract-driven per `contracts/*.md`), and every user-story phase is pure UI consuming the already-live, already-typed endpoints.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4, mapping to spec.md's user stories
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the feature's directory structure. No new npm dependencies.

- [x] T001 Create `src/app/(private)/app-maintenance/_components/`, `_constants/`, `_hooks/`, `_schemas/`, `create/`, and `[id]/edit/` directories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the mock-DB table, Zod schemas, both route files (all methods), wire codegen, and stand up the three page shells every user story renders into. No user-story work can start until this phase is complete.

**⚠️ CRITICAL**: This phase must fully complete before Phase 3+.

- [x] T002 Create `src/app/api/_schemas/app-maintenance.schema.ts` per data-model.md: `AppMaintenanceTargetBrandSchema` (`'joyfit'|'fit365'`), `AppMaintenanceStatusSchema` (`'planned'|'in_progress'|'completed'`), `AppMaintenanceSortSchema` (`'startsAt'|'endsAt'`), row schema `AppMaintenanceSchema` (snake_case: `id`, `target_brand`, `starts_at`, `ends_at`, `message`, `created_by`, `updated_by`, `created_at`, `updated_at`), `GetAppMaintenancesQuerySchema` (page/limit 25-50-100-200/search/brand/status/sort/order), `CreateAppMaintenanceBodySchema` (camelCase, with `.refine()` enforcing `endsAt` after `startsAt`), `UpdateAppMaintenanceBodySchema` (camelCase, `startsAt`/`endsAt`/`message` all optional, **no** `targetBrand` field), `AppMaintenanceItemResponseSchema`, `AppMaintenanceDetailResponseSchema`, `GetAppMaintenancesResponseSchema`, `CreateAppMaintenanceResponseSchema`, `UpdateAppMaintenanceResponseSchema`, `DeleteAppMaintenanceResponseSchema`, and all corresponding type exports
- [x] T003 [P] Create `src/app/api/_mock-db/types/app-maintenance.type.ts`: `AppMaintenanceRow` (from `AppMaintenanceSchema`) and `AppMaintenancesType` interface declaring `_rows`, `_seeded`, `_seed()`, `list(query)`, `getById(id)`, `create(body, createdBy)`, `update(id, patch, updatedBy)`, `delete(id)` — depends on T002
- [x] T004 [P] Create `src/app/api/_mock-db/seeds/app-maintenance.seed.ts`: `buildAppMaintenanceSeed(db): AppMaintenanceRow[]` — 6 rows (AM-001…AM-006) seeded **relative to the seed's execution time** (not literal past dates), per data-model.md's seed table (4 completed incl. one recent, one deliberately `in_progress` straddling `now()`, one `planned`) — depends on T003
- [x] T005 Create `src/app/api/_mock-db/tables/app-maintenance.table.ts`: `createAppMaintenanceTables(getDb)` factory implementing `computeStatus(startsAt, endsAt)` (mirrors `banner.table.ts`'s `computeStatus`), a brand-scoped interval-overlap helper, `list()` (search/brand/status(derived)/sort/paginate), `getById()`, `create()` (checks overlap across all rows of the same `target_brand` incl. completed → conflict sentinel; generates next `AM-{NNN}` id), `update()` (returns `'not_found' | 'start_locked' | 'period_conflict' | AppMaintenanceRow'`; `start_locked` when the patch touches `startsAt` while derived status is `in_progress`; overlap check excludes self), `delete()` (returns `'not_found' | 'in_progress_locked' | true`) — depends on T003, T004
- [x] T006 Register the new table: add `appMaintenances: AppMaintenancesType` to `DbType` in `src/app/api/_mock-db/_db.types.ts`, and call `createAppMaintenanceTables(...)` in `src/app/api/_mock-db/_create-db.ts` — depends on T005
- [x] T007 [P] Implement `src/app/api/crm/app-maintenances/route.ts`: `registerRoute()` calls for `GET` (list) and `POST` (create) per contracts/list-app-maintenances.md and contracts/app-maintenance-mutations.md; `GET` handler — `getAuthUserFromRequest`, 403 unless role ∈ {`System`,`Headquarter`}, parse `GetAppMaintenancesQuerySchema`, call `db.appMaintenances.list(...)`; `POST` handler — 403 unless role === `System`, parse `CreateAppMaintenanceBodySchema`, call `db.appMaintenances.create(data, authResult.user.id)`, map the conflict sentinel to 409 with the Japanese message from contracts/app-maintenance-mutations.md — depends on T002, T006
- [x] T008 [P] Implement `src/app/api/crm/app-maintenances/[id]/route.ts`: `registerRoute()` calls for `GET`/`PATCH`/`DELETE` per contracts/app-maintenance-detail.md and contracts/app-maintenance-mutations.md; same auth pattern as T007 (`GET` allows `System`+`Headquarter`; `PATCH`/`DELETE` require `System`); `GET` → 404 if not found; `PATCH` → parse `UpdateAppMaintenanceBodySchema`, call `db.appMaintenances.update(id, data, authResult.user.id)`, map sentinels (`not_found`→404, `start_locked`→409, `period_conflict`→409) to the exact messages in contracts/app-maintenance-mutations.md; `DELETE` → call `db.appMaintenances.delete(id)`, map sentinels (`not_found`→404, `in_progress_locked`→409) — depends on T002, T006
- [x] T009 Add import lines for both new route files to `src/app/api/_routes/index.ts` (alphabetically grouped, matching existing entries) — depends on T007, T008
- [x] T010 Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmAppMaintenancesOptions`, `postCrmAppMaintenancesMutation`, `getCrmAppMaintenancesByIdOptions`, `patchCrmAppMaintenancesByIdMutation`, `deleteCrmAppMaintenancesByIdMutation` in `src/lib/api/` — depends on T009
- [x] T011 [P] Create `src/app/(private)/app-maintenance/_constants/constants.ts`: `APP_MAINTENANCE_BRAND_LABELS: Record<'joyfit'|'fit365', string>` (`{joyfit: 'JOYFIT', fit365: 'FIT365'}`), `APP_MAINTENANCE_STATUS_LABELS` (`{planned: '予定', in_progress: 'メンテナンス中', completed: '完了'}`) with a status→badge-color-class map (info/warning/muted, matching the prototype's `getStatusBadge`), `PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const`
- [x] T012 Create page shells: `src/app/(private)/app-maintenance/page.tsx` (Server Component, `PageHeader` with `title="アプリメンテナンス管理"` and an empty content slot), `src/app/(private)/app-maintenance/create/page.tsx` (`PageHeader` with `BackLink` to the list + `title="アプリメンテナンス新規登録"`, empty content slot), `src/app/(private)/app-maintenance/[id]/edit/page.tsx` (same header pattern, `title="アプリメンテナンス編集"`, empty content slot) — following the sibling `banners`/`instructors` shell convention
- [x] T013 Run `npm run generate-routes` to register `/app-maintenance`, `/app-maintenance/create`, and `/app-maintenance/[id]/edit` in `src/lib/routes/routes.config.ts` — depends on T012

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Browse and locate maintenance windows (Priority: P1) 🎯 MVP

**Goal**: A sortable, filterable, paginated list of every registered maintenance window with correctly auto-computed statuses.

**Independent Test**: Open `/app-maintenance`; verify all seeded rows render with correct columns and statuses; use search, brand/status filters, column sort, and pagination and confirm the table updates accordingly; verify both empty-state variants (per quickstart.md's List screen section).

### Implementation for User Story 1

- [x] T014 [US1] Create `src/app/(private)/app-maintenance/_hooks/use-app-maintenance-filters.ts`: `nuqs`-backed `useQueryStates` for `page`/`limit`/`search`/`brand`/`status`/`sortBy`/`sortOrder`, a debounced local `searchInput`, `clearFilters` (resets search + both filters + page), `activeFilterCount`, and a `queryParams` object matching `GetAppMaintenancesQuery` — following `src/app/(private)/banners/_hooks/use-banners-filters.ts`
- [x] T015 [P] [US1] Create `src/app/(private)/app-maintenance/_components/app-maintenance-columns.tsx`: `ColumnDef<AppMaintenanceItemResponse>[]` factory — ID, brand badge (`APP_MAINTENANCE_BRAND_LABELS`), sortable start/end datetime columns (date-fns `ja` locale formatting), truncated message cell, status `Badge` (color per `APP_MAINTENANCE_STATUS_LABELS`); leave the row action cell as a placeholder empty column for now (populated in US3/US4)
- [x] T016 [P] [US1] Create `src/app/(private)/app-maintenance/_components/app-maintenance-filters.tsx`: search `Input`, brand `Select` (All/JOYFIT/FIT365), status `Select` (All/Scheduled/In Progress/Completed), active-filter count `Badge`, "clear all" action, results-summary banner (`N of M shown` + criteria text) — following `src/app/(private)/banners/_components/banners-filters.tsx`
- [x] T017 [US1] Create `src/app/(private)/app-maintenance/_components/app-maintenance-list-section.tsx`: `'use client'` orchestrator — `useAppMaintenanceFilters()`, `useQuery(getCrmAppMaintenancesOptions({query: queryParams}))`, `DataTable` (columns from T015, sortable header handlers wired to the hook's `sortBy`/`sortOrder`), page-size `Select` (`PAGE_SIZE_OPTIONS`) + `TablePaginationWithSize`, `Empty` (`variant={hasActiveFilters ? 'filtered' : 'empty'}`, `entityLabel="メンテナンス"`) — depends on T014, T015, T016
- [x] T018 [US1] Integrate `AppMaintenanceListSection` into `page.tsx`'s content slot, and add a "新規登録" `RoleGatedButton` (`requiredPermission={Permission.AppMaintenanceCreate}` — see T023's refinement note) to `PageHeader`'s `actions` slot — from Foundational T012 — depends on T017

**Checkpoint**: User Story 1 is independently functional and testable — `/app-maintenance` shows the searchable, filterable, sortable, paginated list end to end.

---

## Phase 4: User Story 2 - Register a new maintenance window (Priority: P1)

**Goal**: An authorized user can register a new maintenance window (brand, start/end datetime, message) with inline validation and a warning notice, and land back on the list on success.

**Independent Test**: As `System`, click "新規登録", fill the form, submit invalid data (blank fields, bad date order) and see inline errors, then submit valid data and confirm the success message + new row in the list; verify Cancel discards; verify `Headquarter` sees "新規登録" disabled (per quickstart.md's Create section).

### Implementation for User Story 2

- [x] T019 [US2] Create `src/app/(private)/app-maintenance/_schemas/app-maintenance-form.schema.ts`: react-hook-form Zod schema mirroring `CreateAppMaintenanceBodySchema` — `targetBrand` (enum, required), `startsAt`/`endsAt` (required strings, `.refine()` enforcing `endsAt` after `startsAt`), `message` (1–1000 chars, required) — implements FR-012's client-side validation
- [x] T020 [P] [US2] Create `src/app/(private)/app-maintenance/_components/app-maintenance-form/app-maintenance-form.tsx`: shared create+edit presentational form — brand `RadioGroup` (JOYFIT/FIT365; `disabled` prop for edit mode, per Q4), start/end `DateTimePicker`s (locked + `Tooltip` "メンテナンス中のため開始日時は変更できません" per FR-010), message `Textarea`, warning `Alert` (FR-009), inline field errors via shadcn `Form`/`FormField`/`FormMessage`, Cancel + Submit `Button`s. **Consolidated with T021/T024** (see below) — this single component owns both the create (`postCrmAppMaintenancesMutation`) and update (`patchCrmAppMaintenancesByIdMutation`) mutations internally, keyed by its `mode` prop, matching the repo's actual shared-form convention (`BannerForm`/`InstructorForm`/`LessonForm` all do this — a separate wrapper-per-mode file is not the real precedent)
- [x] T021 [US2] ~~Create `app-maintenance-create-form.tsx`~~ — **N/A, consolidated into T020**. The shared `AppMaintenanceForm` (`mode="create"`) handles the create mutation directly; toast/navigate/409-handling implemented there
- [x] T022 [US2] Integrate `AppMaintenanceForm mode="create"` into `create/page.tsx`'s content slot (done as part of Foundational T012's page-shell authoring), and the list page's "新規登録" button (US1) already points at `navigate('/app-maintenance/create')`

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Edit an existing maintenance window, with in-progress protection (Priority: P2)

**Goal**: Clicking a row opens it in the edit form, pre-filled with its real data; the start-datetime field (and brand selector) lock appropriately.

**Independent Test**: Click a `completed`/`planned` row → edit form pre-filled, start datetime editable, brand disabled, save succeeds; click the `in_progress` row → start datetime shown disabled with tooltip, other fields editable, save succeeds; as `Headquarter`, confirm Edit is disabled/hidden (per quickstart.md's Edit section).

### Implementation for User Story 3

- [x] T023 [US3] In `app-maintenance-columns.tsx` (from US1, T015) and `app-maintenance-list-section.tsx` (from US1, T017): add row `onClick` → `navigate('/app-maintenance/[id]/edit', row.id)` on any cell outside the action column (FR-013), and add a row action `DropdownMenu` with a `RoleGatedMenuItem` "編集" entry pointing at the same route. **Refinement**: gated via `requiredPermission={Permission.AppMaintenanceEdit}` rather than `allowedRoles`, since the row-action dropdown needed permission-flag gating for consistency with the repo's `DataTableRowActions` precedent — new `Permission.AppMaintenance{View,Create,Edit,Delete}` entries were added to `src/types/permission.type.ts`, granted only to `System` (automatic via `Object.values(Permission)`) plus `AppMaintenanceView` for `Headquarter`, matching FR-014 exactly. Also added `PAGE_PERMISSIONS` entries for all three routes in `src/constants/permission.constants.ts` so Headquarter is blocked from `/app-maintenance/create` and `/app-maintenance/:id/edit` at the routing layer too, not just via disabled buttons
- [x] T024 [US3] ~~Create `app-maintenance-edit-form.tsx`~~ — **N/A, consolidated into T020's `AppMaintenanceForm`** (`mode="edit"`). The data fetch (`useQuery(getCrmAppMaintenancesByIdOptions(...))`) and not-found guard live directly in `[id]/edit/page.tsx` (matching the real `instructors/[id]/edit/page.tsx` precedent), which then passes `defaultValues`/`currentStatus` into `AppMaintenanceForm`
- [x] T025 [US3] Integrate `AppMaintenanceForm mode="edit"` (reading the `id` route param via `useParams`, fetching detail, `DataStateBoundary` for the not-found case) into `[id]/edit/page.tsx` — done as part of Foundational T012's page-shell authoring

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - Delete a maintenance window, with in-progress protection (Priority: P3)

**Goal**: Delete a `planned`/`completed` window via a confirmation dialog naming brand + start time; the action is disabled with an explanation for an `in_progress` window.

**Independent Test**: As `System`, delete a `planned` row via its action menu + confirm dialog and see it disappear from the list; verify the `in_progress` row's Delete entry is disabled with inline text; as `Headquarter`, confirm Delete is disabled/hidden (per quickstart.md's Delete section).

### Implementation for User Story 4

- [x] T026 [US4] Create `src/app/(private)/app-maintenance/_components/app-maintenance-delete-dialog.tsx`: `AlertDialog` — title "このアプリメンテナンス情報を削除しますか？", description naming the row's brand + start time, `useMutation(deleteCrmAppMaintenancesByIdMutation)` on confirm, on success → `toast.success('メンテナンス情報を削除しました')` + invalidate the list query
- [x] T027 [US4] Add a "削除" entry to the row action `DropdownMenu` in `app-maintenance-columns.tsx` (from US3, T023): when the row's `status === 'in_progress'`, render it `disabled` with inline text "メンテナンス実施中のため" (FR-011); otherwise wire it to open T026's dialog for that row — depends on T023, T026

**Checkpoint**: All four user stories are independently functional — full CRUD is live end to end.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T028 [P] Run `tsc --noEmit` and fix any type errors introduced by this feature's files (Constitution I)
- [x] T029 [P] Run `npm run lint` and fix any violations (Constitution I / QA process)
- [x] T030 **Partially done**: no browser-automation tool was available, so the UI checklist wasn't clicked through visually. Instead ran the dev server and verified the underlying business logic directly against the live mock API for both `System` and `Headquarter` (and `Manager`, for the negative case) — see quickstart.md's new "Verification already performed" section for the full list (list/filter/search correctness, FR-007 live status computation, FR-014 role gating at both the API and page-routing layer, FR-012 validation/overlap, FR-010/FR-011 in-progress locks, and non-crashing page renders). **Remaining**: an actual click-through in a real browser is still recommended before sign-off
- [x] T031 Confirmed via `git diff --stat src/lib/api/` — all 4 changed files (`@tanstack/react-query.gen.ts`, `index.ts`, `sdk.gen.ts`, `types.gen.ts`) are exclusively additions from `npm run generate-openapi && npm run generate-api`; no manual edits were made under `src/lib/api/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories. Internally sequential: T002 → T003 → {T004, T005 (T005 also needs T004)} → T006 → {T007, T008} → T009 → T010; T011 is independent; T012 → T013.
- **User Stories (Phase 3–6)**: All depend on Foundational (Phase 2) completion.
  - US1 (Phase 3) has no dependency on US2/US3/US4.
  - US2 (Phase 4) depends only on Foundational + reuses US1's "New Registration" button target (T018), but is independently testable by navigating to `/app-maintenance/create` directly.
  - US3 (Phase 5) modifies US1's columns/list-section files (T023) to add the click-through entry point — a deliberate, minimal cross-story touch, same pattern as adding a menu item to an existing table.
  - US4 (Phase 6) depends on US3's action-menu existing (T023) to add its own "削除" entry (T027).
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Parallel Opportunities

- Within Foundational: T003 and (once T003 lands) T004 can proceed while T007/T008 wait on T006; T007 and T008 are parallel (different files); T011 is parallel to the entire route/codegen chain.
- Within US1: T015 and T016 are parallel (different files); T014 has no file overlap with either and can run alongside them.
- Within US2: T020 has no dependency on T019 and can run in parallel; T021 needs both.
- Across stories: once Foundational is done, US1 and US2 can be staffed in parallel (US2 only needs the Foundational shells + generated hooks, not US1's finished list). US3 and US4 are inherently sequential after US1/US2 due to the shared-file touches noted above.

---

## Parallel Example: Foundational Phase

```bash
# After T002 (schema) and T003 (type) land, seed and table can be sequenced, then routes run together:
Task: "Implement src/app/api/crm/app-maintenances/route.ts (list GET + create POST)"
Task: "Implement src/app/api/crm/app-maintenances/[id]/route.ts (detail GET + update PATCH + delete DELETE)"

# Constants file has no backend dependency and can run any time:
Task: "Create src/app/(private)/app-maintenance/_constants/constants.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Create app-maintenance-columns.tsx in src/app/(private)/app-maintenance/_components/"
Task: "Create app-maintenance-filters.tsx in src/app/(private)/app-maintenance/_components/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently against quickstart.md's List section
5. Demo if ready — a read-only view of maintenance windows is already useful to Headquarter/System staff

### Incremental Delivery

1. Setup + Foundational → foundation ready (schema, table, both routes live, typed client generated, 3 page shells registered)
2. Add US1 (list) → validate → demo (MVP)
3. Add US2 (create) → validate → demo
4. Add US3 (edit, incl. row click-through) → validate → demo
5. Add US4 (delete) → validate → demo — full CRUD complete
6. Polish (Phase 7)

### Parallel Team Strategy

With multiple developers, after Foundational completes:

- Developer A: US1 (list)
- Developer B: US2 (create) — independent of US1's finished UI, only needs the Foundational shells/hooks
- US3 and US4 should follow sequentially after US1 lands, since both touch US1's columns file

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test-writing tasks anywhere (Constitution's No Testing Policy) — quickstart.md is the verification artifact
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
