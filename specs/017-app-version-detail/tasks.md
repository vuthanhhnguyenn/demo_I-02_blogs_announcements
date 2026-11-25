# Tasks: App Version Management (Detail Screen)

**Input**: Design documents from `/specs/017-app-version-detail/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: No explicit TDD/automated test-first request in spec.md, and this project's constitution has a No Testing Policy (no Jest/Vitest/Playwright). Validation tasks use `lint`/`type-check`/`build` and manual scenario verification against spec.md's acceptance scenarios.

**Organization**: Tasks are grouped by user story (spec.md P1/P2/P3) for independent implementation and validation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the scaffold this feature reuses from `016-app-version-management` needs no changes before backend/UI work begins — no new routes, directories, or permissions are created by this feature.

- [x] T001 Verify no new scaffold is needed: confirm `/app-versions/:id` already appears in `src/lib/routes/routes.config.ts`, and `Permission.AppVersionsView`/`AppVersionsEdit`/`AppVersionsDelete` are already wired into `PAGE_PERMISSIONS`/`ROLE_PERMISSIONS` in `src/constants/permission.constants.ts` (both from `016-app-version-management`) — no edits expected in this task, only confirmation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the single-record `GET` endpoint every user story depends on to fetch data.

**⚠️ CRITICAL**: No user story implementation begins before this phase is complete.

- [x] T002 [P] Add `GetAppVersionResponseSchema` (referencing the existing `AppVersionRecordSchema`) in `src/app/api/_schemas/app-version.schema.ts`, per [research.md §4](research.md#4-response-schema--reuse-not-a-new-entity)
- [x] T003 [P] Add `getById(id: string): AppVersionRecord | null` to `createAppVersionTables()` in `src/app/api/_mock-db/tables/app-version.table.ts`, excluding rows with `deletedAt !== null` (same predicate as the existing `getList`), per [research.md §5](research.md#5-mock-table-method)
- [x] T004 Implement `GET` handler on the existing `src/app/api/crm/app-versions/[id]/route.ts` (alongside the existing `DELETE`): call `db.appVersions.getById(id)`, return `404` with `{ error: 'アプリバージョンが見つかりません' }` when `null`, else `200` with the record; register via `registerRoute(...)` per [contracts/get-app-version.md](contracts/get-app-version.md) (depends on T002, T003)
- [x] T005 Run `npm run generate-routes`, `npm run generate-openapi`, then `npm run generate-api`; confirm `getCrmAppVersionsByIdOptions`/`getCrmAppVersionsByIdQueryKey` appear in `src/lib/api/@tanstack/react-query.gen.ts` (depends on T004)

**Checkpoint**: Foundation complete — the detail endpoint exists and is typed; user story implementation can now begin.

---

## Phase 3: User Story 1 - Review the full details of a single app version (Priority: P1) 🎯 MVP

**Goal**: Replace the `016-app-version-management` placeholder stub with the real read-only detail screen — every documented field, correct empty-remarks handling, working back-navigation, and a not-found state for bad/deleted IDs.

**Independent Test**: From the list screen, open a record's detail view and confirm every documented field displays correctly (including a record with `remarks: null`), then use the back link to confirm it returns to the list; separately, navigate to a nonexistent/deleted record ID and confirm a not-found state renders instead of a blank page.

### Implementation for User Story 1

- [x] T006 [US1] Replace the "準備中" placeholder in `src/app/(private)/app-versions/[id]/page.tsx` with data-fetching via `useQuery({ ...getCrmAppVersionsByIdOptions({ path: { id } }) })` (wrapped in `Suspense`/`Loading`, mirroring `training-equipment/[id]/page.tsx`) plus a not-found fallback (`if (!isLoading && !data) return <NotFoundParagraph/>`), per [research.md §1–2](research.md#1-detail-page-pattern-to-follow)
- [x] T007 [US1] Add `PageHeader` with a `BackLink` breadcrumb (label "アプリ配信バージョン管理に戻る", `href={navigate('/app-versions')}`) and title "バージョン詳細" in `src/app/(private)/app-versions/[id]/page.tsx`
- [x] T008 [US1] Build the single `Card` field display — 2-column grid (ID, brand `Badge`, iOS version + build, Android version + build, release date, created date, updated date), remarks below (rendering as empty when `null`), and the maintenance-window `Alert` below that — matching `pages/app-version-detail.tsx` field-for-field, in `src/app/(private)/app-versions/[id]/page.tsx`

**Checkpoint**: US1 is functional and independently testable — full read-only detail view, back navigation, and not-found handling all work without any Edit/Delete controls yet.

---

## Phase 4: User Story 2 - Remove an incorrect or obsolete version record from its detail view (Priority: P2)

**Goal**: Let a Headquarters/System user delete the currently-viewed record from its detail screen, with confirmation, and land back on the list afterward.

**Independent Test**: As a Headquarters/System user, open a record's detail screen, trigger delete, confirm the dialog names the record, cancel once and confirm nothing changes, then confirm again and verify the user lands back on the list with the record gone.

### Implementation for User Story 2

- [x] T009 [US2] Add a Delete `RoleGatedButton` (`requiredPermission={Permission.AppVersionsDelete}`) to `PageHeader`'s `actions` that opens the delete dialog, in `src/app/(private)/app-versions/[id]/page.tsx`
- [x] T010 [US2] Import and wire the existing `AppVersionDeleteDialog` (from `src/app/(private)/app-versions/_components`) with `deleteCrmAppVersionsByIdMutation`; on confirm, mutate with the current record; `onSuccess` invalidates `getCrmAppVersionsQueryKey()` and calls `router.push(navigate('/app-versions'))`, in `src/app/(private)/app-versions/[id]/page.tsx` (depends on T009)

**Checkpoint**: US2 is functional and independently testable — delete requires confirmation, cancel leaves the record displayed unchanged, confirm removes it and returns to the list where it no longer appears.

---

## Phase 5: User Story 3 - Read-only review for non-managing roles (Priority: P3)

**Goal**: Add the Edit entry point (the last remaining screen element) and confirm the complete role matrix: Manager/Staff/Observer see Edit/Delete visible-but-disabled with a tooltip, Trainer is fully blocked from this screen, and non-permitted roles are blocked from the edit URL by direct navigation.

**Independent Test**: Sign in as each of Manager, Staff, and Observer — open the detail screen and confirm every field is visible while Edit/Delete are visible but disabled with an explanatory tooltip; then navigate directly to the edit screen URL and confirm the system's `/403` page appears. Sign in as Trainer and confirm the detail screen itself 403s, including via direct URL.

### Implementation for User Story 3

- [x] T011 [US3] Add an Edit `RoleGatedButton` (`requiredPermission={Permission.AppVersionsEdit}`) to `PageHeader`'s `actions`, navigating to `navigate('/app-versions/[id]/edit', id)`, in `src/app/(private)/app-versions/[id]/page.tsx` (rendered after the Delete button, matching `pages/app-version-detail.tsx`'s prototype order)
- [x] T012 [US3] Manually verify the full role matrix via a live `npm run dev` instance + mock-login cookies for each role (System, Headquarter, Manager, Staff, Observer, Trainer): confirm Edit/Delete render visible-but-disabled with a tooltip for Manager/Staff/Observer; confirm Trainer gets `/403` opening this detail URL directly; confirm Manager/Staff/Observer get `/403` navigating directly to the edit URL. Record outcomes in `specs/017-app-version-detail/quickstart.md` (Verification Results)

**Checkpoint**: All three user stories are independently functional — full detail view, delete-from-detail, and the complete role-gating matrix are all verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening and verification across all three stories.

- [x] T013 [P] Record final manual verification outcomes for all three user stories in `specs/017-app-version-detail/checklists/requirements.md` (Notes section)
- [x] T014 Run `npm run lint` and `npm run type-check`, fixing any issues scoped to `src/app/(private)/app-versions/[id]/page.tsx` and `src/app/api/crm/app-versions/[id]/route.ts` — 0 errors, 0 warnings on both (one pre-existing unrelated warning in `data-state-boundary/index.tsx` not touched by this feature)
- [x] T015 Run `npm run build` to confirm production compilation succeeds end-to-end with the real detail page replacing the placeholder — succeeded; `/api/crm/app-versions/[id]` and `/app-versions/[id]` both present in the build output

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — a verification-only check, starts immediately.
- **Foundational (Phase 2)**: Depends on Setup confirming the reused scaffold is correct — BLOCKS all user stories (they all need the `GET`-by-id endpoint and its generated client).
- **User Stories (Phase 3–5)**: All depend on Foundational completion; proceed in priority order (they share one file, so true parallel execution across stories isn't practical here — see Parallel Opportunities).
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational — no dependency on US2/US3. Fully deliverable alone (view-only screen).
- **US2 (P2)**: Starts after Foundational; adds the Delete button to the `PageHeader` US1 built — needs US1's T007 (`PageHeader` scaffold) to exist first, but its own delete logic is independently testable once wired.
- **US3 (P3)**: Starts after Foundational; adds the Edit button to the same `PageHeader` — needs US1's T007 to exist, and is easiest to verify once US2's Delete button is also present (T012 verifies both together), but the Edit button itself has no functional dependency on US2.

### Within Each User Story

- Data-fetching + not-found before header/chrome before field display (US1).
- Button before dialog-wiring (US2).
- Button before role-matrix verification (US3).
- All three stories edit the same file (`src/app/(private)/app-versions/[id]/page.tsx`) — implement in priority order (US1 → US2 → US3) rather than in parallel, to avoid merge conflicts within one file.

### Parallel Opportunities

- **Foundational**: T002 and T003 can run in parallel (schema vs. mock table, no interdependency).
- **Setup**: T001 is a single verification task, nothing to parallelize.
- **Cross-story**: Because US1/US2/US3 all modify the same `page.tsx`, they are best executed sequentially by priority rather than in parallel, despite being independently testable once each is done.

---

## Parallel Example: Foundational

```bash
# Independent authoring tasks — no shared files
T002 [P] src/app/api/_schemas/app-version.schema.ts
T003 [P] src/app/api/_mock-db/tables/app-version.table.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: view a record's full details, confirm empty-remarks rendering, confirm back-navigation, confirm not-found for a bad ID.
4. Demo as MVP — delete (US2) and the full role matrix (US3) can follow as separate increments.

### Incremental Delivery

1. Setup + Foundational → foundation ready (`GET`-by-id endpoint + generated client).
2. Add US1 → validate independently → MVP demo (read-only detail view).
3. Add US2 → validate delete-with-confirmation-and-redirect independently.
4. Add US3 → validate the full role-gating matrix (visible-disabled controls + Trainer/edit-URL 403s) independently.
5. Finish Phase 6 polish.

### Format Validation

All tasks in this file follow the required checklist pattern:

`- [ ] T### [P?] [US?] Description with file path`
