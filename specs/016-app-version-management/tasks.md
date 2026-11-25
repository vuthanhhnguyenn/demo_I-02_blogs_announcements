# Tasks: App Version Management (List Screen)

**Input**: Design documents from `/specs/016-app-version-management/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: No explicit TDD/automated test-first request in spec.md, and this project's constitution has a No Testing Policy (no Jest/Vitest/Playwright). Validation tasks use `lint`/`typecheck`/`build` and manual scenario verification against spec.md's acceptance scenarios.

**Organization**: Tasks are grouped by user story (spec.md P1/P2/P3) for independent implementation and validation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the feature's route scaffold, including the placeholder stub routes FR-013 needs to exist at all.

- [x] T001 Create app-versions route shell and feature directories: `src/app/(private)/app-versions/page.tsx` (placeholder shell, to be built out in US1), `src/app/(private)/app-versions/_components/`, `src/app/(private)/app-versions/_hooks/`
- [x] T002 [P] Create the three out-of-scope stub pages with their final placeholder content (a "この画面は準備中です" notice + back-link to `/app-versions`, no permission logic in the page itself — protection comes entirely from `src/proxy.ts` + `PAGE_PERMISSIONS`, per research.md §5): `src/app/(private)/app-versions/create/page.tsx`, `src/app/(private)/app-versions/[id]/page.tsx`, `src/app/(private)/app-versions/[id]/edit/page.tsx`
- [x] T003 Regenerate typed routes via `npm run generate-routes`; verify `/app-versions`, `/app-versions/create`, `/app-versions/:id`, `/app-versions/:id/edit` all appear with `private: true` in `src/lib/routes/routes.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Permissions, schema, mock persistence, and API routes that every user story depends on.

**⚠️ CRITICAL**: No user story implementation begins before this phase is complete.

- [x] T004 Add `AppVersionsView`, `AppVersionsCreate`, `AppVersionsEdit`, `AppVersionsDelete` to the `Permission` enum in `src/types/permission.type.ts`
- [x] T005 Wire `PAGE_PERMISSIONS` (`/app-versions` → View, `/app-versions/:id` → View, `/app-versions/create` → Create, `/app-versions/:id/edit` → Edit) and `ROLE_PERMISSIONS` for all 6 roles (per the matrix in data-model.md) in `src/constants/permission.constants.ts`
- [x] T006 [P] Define `AppVersionBrandEnumSchema` (dedicated `Joyfit`/`Fit365` enum, per research.md §2), `AppVersionRecordSchema`, `GetAppVersionsQueryParamsSchema`, `GetAppVersionsResponseSchema` in `src/app/api/_schemas/app-version.schema.ts`
- [x] T007 [P] Add seed rows in `src/app/api/_mock-db/seeds/app-version.seed.ts`: at least one Joyfit and one Fit365 record, one with `remarks: null`, one with a future `releaseDate`, one with `deletedAt` already set (to verify exclusion)
- [x] T008 Add mock table `src/app/api/_mock-db/tables/app-version.table.ts` (`getList` with brand filter/sort/pagination excluding `deletedAt !== null`, `softDelete`) and its type in `src/app/api/_mock-db/types/app-versions.type.ts` (depends on T006, T007)
- [x] T009 Register the new table + its `_seed()` call in `src/app/api/_mock-db/_create-db.ts` and add its type to `src/app/api/_mock-db/_db.types.ts` (depends on T008)
- [x] T010 Implement `GET /crm/app-versions` in `src/app/api/crm/app-versions/route.ts` per contracts/list-app-versions.md (depends on T006, T009)
- [x] T011 [P] Implement `DELETE /crm/app-versions/{id}` in `src/app/api/crm/app-versions/[id]/route.ts` per contracts/delete-app-version.md — returns `204 No Content` on success, `404` if not found or already deleted (depends on T009)
- [x] T012 Register both new route files' `registerRoute(...)` calls by importing them in `src/app/api/_routes/index.ts` (depends on T010, T011)
- [x] T013 Run `npm run generate-openapi` then `npm run generate-api`; confirm `getCrmAppVersionsOptions`/`getCrmAppVersionsQueryKey`/`deleteCrmAppVersionsByIdMutation`-style exports appear in `src/lib/api/@tanstack/react-query.gen.ts` (depends on T012)

**Checkpoint**: Foundation complete — user story implementation can now begin.

---

## Phase 3: User Story 1 - Browse and filter app version history (Priority: P1) 🎯 MVP

**Goal**: Deliver the real list screen — brand-filterable, paginated, all documented columns, future-dated releases included, row click reaches the detail stub.

**Independent Test**: Log in as Headquarters/System, open App Version Management, verify all columns render, switch the brand filter and confirm the list narrows, page through results, and confirm a future-dated record still appears.

### Implementation for User Story 1

- [x] T014 [P] [US1] Implement URL-synced filter/pagination state hook in `src/app/(private)/app-versions/_hooks/use-app-versions-filters.ts` (`page`, `limit`, `brandEnum` via `nuqs`, mirrors `use-banners-filters.ts`)
- [x] T015 [P] [US1] Build the brand filter `<Select>` (all / Joyfit / Fit365) in `src/app/(private)/app-versions/_components/app-version-filters.tsx`
- [x] T016 [US1] Implement table columns (ID, brand, iOS version+build, Android version+build, remarks, release/created/updated dates) with a row-actions cell wired to `DataTableRowActions` (`permissions: { edit: Permission.AppVersionsEdit, delete: Permission.AppVersionsDelete }`) in `src/app/(private)/app-versions/_components/app-version-table-columns.tsx`
- [x] T017 [US1] Implement header actions with a `RoleGatedButton` "新規登録" (`requiredPermission: Permission.AppVersionsCreate`) navigating to `/app-versions/create`, in `src/app/(private)/app-versions/_components/app-version-list-header-actions.tsx`
- [x] T018 [US1] Compose the list page: `PageHeader`, the brand filter, `DataTable` bound to `getCrmAppVersionsOptions`, `TablePaginationWithSize`, and an `Empty` state for zero matches, in `src/app/(private)/app-versions/page.tsx`
- [x] T019 [US1] Wire row-click navigation to `/app-versions/[id]` with click-propagation guarded off the actions cell (so clicking the row-actions menu doesn't also navigate), in `src/app/(private)/app-versions/page.tsx` and `src/app/(private)/app-versions/_components/app-version-table-columns.tsx` (propagation guard already provided by the shared `DataTableRowActions` component)

**Checkpoint**: US1 is functional and independently testable — browsing/filtering/paginating the real list, with future-dated records included and row-click reaching the (stub) detail page.

---

## Phase 4: User Story 2 - Read-only review for non-managing roles (Priority: P2)

**Goal**: Confirm Manager/Staff/Observer see every control but can't act on it, and that forcing a direct URL to the create/edit screens 403s instead of rendering the form.

**Independent Test**: Sign in as Manager, Staff, and Observer in turn — verify the list renders, "新規登録" and every row's edit/delete are visible but disabled with a tooltip; then navigate directly to `/app-versions/create` and `/app-versions/<id>/edit` and confirm the system's `/403` page appears. Sign in as Trainer and confirm `/app-versions` itself 403s.

### Implementation for User Story 2

- [x] T020 [US2] Set explanatory `denyTooltip` copy (`"本部権限が必要です"`) on the header "新規登録" `RoleGatedButton`; row-actions edit/delete use `DataTableRowActions`' default denyBadge ("本部"), matching the banners precedent, in `src/app/(private)/app-versions/_components/app-version-list-header-actions.tsx` and `src/app/(private)/app-versions/_components/app-version-table-columns.tsx`
- [x] T021 [US2] Verified via live dev server + mock login as Trainer/Manager/Headquarter: `GET /app-versions` → 307→`/403` for Trainer, 200 for Manager/Headquarter; `GET /app-versions/create` and `/app-versions/:id/edit` → 307→`/403` for Manager, 200 for Headquarter. Outcomes recorded in `specs/016-app-version-management/quickstart.md`

**Checkpoint**: US2 is functional and independently testable via a role-switch walkthrough alone — no changes to US1 or US3 code are required to verify it.

---

## Phase 5: User Story 3 - Remove an incorrect or obsolete version record (Priority: P3)

**Goal**: Let Headquarters/System staff delete a record from the list after an explicit confirmation, and have it stay gone.

**Independent Test**: As Headquarters/System, open a row's actions menu, choose Delete, cancel once and confirm nothing changed, then confirm and verify the record disappears and stays gone after a refresh.

### Implementation for User Story 3

- [x] T022 [US3] Build the delete confirmation dialog naming the record (mirrors `banner-delete-dialog.tsx`) in `src/app/(private)/app-versions/_components/app-version-delete-dialog.tsx`
- [x] T023 [US3] Wire the `DELETE /crm/app-versions/{id}` mutation with list-query invalidation on success and a static success toast (the `204` response has no `message` to echo) in `src/app/(private)/app-versions/page.tsx`
- [x] T024 [US3] Connect the row "削除" action to the dialog's open/confirm/cancel lifecycle between `src/app/(private)/app-versions/_components/app-version-table-columns.tsx` and `src/app/(private)/app-versions/page.tsx`

**Checkpoint**: US3 is functional and independently testable — delete requires confirmation, cancel leaves the list unchanged, confirm removes the record and it stays excluded after refresh (also covers the "deleted twice" edge case via the route's 404-on-repeat behavior).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening and verification across all three stories.

- [x] T025 [P] Record final manual verification outcomes for all three user stories in `specs/016-app-version-management/checklists/requirements.md` (Notes section) and finalize `specs/016-app-version-management/quickstart.md`
- [x] T026 Run `npm run lint` and `npm run type-check`, fixing any issues scoped to `src/app/(private)/app-versions/**` and `src/app/api/crm/app-versions/**` — 0 errors, 0 warnings on both after fixing one unused-var lint warning in `app-version.table.ts`
- [x] T027 Run `npm run build` to confirm production compilation succeeds end-to-end — succeeded; all 6 new routes (`/api/crm/app-versions`, `/api/crm/app-versions/[id]`, `/app-versions`, `/app-versions/[id]`, `/app-versions/[id]/edit`, `/app-versions/create`) present in the build output

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Setup (needs the stub route files to exist before `PAGE_PERMISSIONS`/route-generation has anything to attach to) — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational completion; can then proceed in priority order or in parallel if staffed.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational — no dependency on US2/US3.
- **US2 (P2)**: Starts after Foundational — reuses the buttons US1 builds (T016/T017) but is independently verifiable as soon as the permission wiring (T004/T005) and stub routes (T001/T002) exist, even before US1's page composition (T018) finishes, since T020/T021 only touch tooltip copy and manual verification.
- **US3 (P3)**: Starts after Foundational — needs US1's table columns (T016) to exist as the file it adds the delete trigger into, but the delete flow itself is independently testable once wired.

### Within Each User Story

- Hooks/filters before table columns before page composition (US1).
- Tooltip copy before manual verification (US2).
- Dialog component before mutation wiring before row-trigger connection (US3).

### Parallel Opportunities

- **Setup**: T002 can run in parallel with T001 (different files).
- **Foundational**: T006 and T007 can run in parallel (schema vs. seed, no interdependency); T011 can run in parallel with T010 once T009 is done (different route files).
- **US1**: T014 and T015 can run in parallel (different files, no shared dependency).
- **Cross-story**: Once Foundational is done, US2's T020/T021 can proceed alongside US1/US3 implementation since they only touch tooltip strings and manual verification, not shared files at the same time as US1's T016/T017 edits — coordinate to avoid touching `app-version-table-columns.tsx` simultaneously.

---

## Parallel Example: Foundational

```bash
# Independent authoring tasks — no shared files
T006 [P] src/app/api/_schemas/app-version.schema.ts
T007 [P] src/app/api/_mock-db/seeds/app-version.seed.ts
```

## Parallel Example: User Story 1

```bash
# Independent building blocks
T014 [US1] src/app/(private)/app-versions/_hooks/use-app-versions-filters.ts
T015 [US1] src/app/(private)/app-versions/_components/app-version-filters.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: browse/filter/paginate the real list as Headquarters/System.
4. Demo as MVP — role-gating (US2) and delete (US3) can follow as separate increments.

### Incremental Delivery

1. Setup + Foundational → foundation ready (permissions, schema, mock data, both API routes).
2. Add US1 → validate independently → MVP demo.
3. Add US2 → validate the full role matrix (visible-disabled controls + 403s) independently.
4. Add US3 → validate delete-with-confirmation independently.
5. Finish Phase 6 polish.

### Format Validation

All tasks in this file follow the required checklist pattern:

`- [ ] T### [P?] [US?] Description with file path`
