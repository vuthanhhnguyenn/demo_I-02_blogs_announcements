# Tasks: Banner List Management (I-02 FR-005 List Scope)

**Input**: Design documents from `/specs/010-banner-list/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: No explicit TDD/automated test-first request in spec. Validation tasks use lint/type-check and manual scenario verification from independent tests.

**Organization**: Tasks are grouped by user story for independent implementation and validation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the feature slice scaffold and route entrypoint.

- [x] T001 Create banner route shell and feature directories in `src/app/(private)/banners/page.tsx`, `src/app/(private)/banners/_components/`, `src/app/(private)/banners/_hooks/`, and `src/app/(private)/banners/_constants/`
- [x] T002 [P] Create banner UI constants scaffold in `src/app/(private)/banners/_constants/banner.constants.ts`
- [x] T003 Regenerate typed routes for new page using `npm run generate-routes` and verify output in `src/lib/routes/routes.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core contracts and permissions that block all user stories.

**⚠️ CRITICAL**: No user story implementation begins before this phase is complete.

- [x] T004 Add banner permission enums in `src/types/permission.type.ts`
- [x] T005 Map `/banners` page permission and role permission grants in `src/constants/permission.constants.ts`
- [x] T006 [P] Define banner request/response schemas in `src/app/api/_schemas/banner.schema.ts`
- [x] T007 Add `db.banners` seed and operations (`getList`, `delete`, `updateDisplayOrder`) in `src/app/api/_mock-db/tables/` and wire exports in `src/app/api/_mock-db/index.ts`
- [x] T008 Implement list API route in `src/app/api/crm/banners/route.ts`
- [x] T009 [P] Implement delete API route in `src/app/api/crm/banners/[id]/route.ts`
- [x] T010 [P] Implement display-order bulk update API route in `src/app/api/crm/banners/display-order/route.ts`
- [x] T011 Register banner API routes in `src/app/api/_routes/index.ts`
- [x] T012 Regenerate API client and confirm banner outputs in `src/lib/api/types.gen.ts` and `src/lib/api/@tanstack/react-query.gen.ts`

**Checkpoint**: Foundation complete — user story work can proceed.

---

## Phase 3: User Story 1 - View Banner List (Priority: P1) 🎯 MVP

**Goal**: Deliver the banner list with search, detailed filters, sorting, role-gated visible actions, and core list rendering.

**Independent Test**: Log in as any role, open バナー管理, verify list columns/badges render and filters/sort/search update correctly.

### Implementation for User Story 1

- [x] T013 [P] [US1] Implement URL query/filter state hook in `src/app/(private)/banners/_hooks/use-banners-filters.ts`
- [x] T014 [P] [US1] Build search + detailed filter UI and clear actions in `src/app/(private)/banners/_components/banners-filters.tsx`
- [x] T015 [P] [US1] Build thumbnail image with fallback placeholder in `src/app/(private)/banners/_components/banner-thumbnail.tsx`
- [x] T016 [P] [US1] Define status and channel badge label/class constants in `src/app/(private)/banners/_constants/banner.constants.ts` (rendered inline via `Badge` in `banners-table-columns.tsx`; no standalone badge component was introduced)
- [x] T017 [US1] Implement sortable table columns (using `banners-sort-header.tsx` for the sort icon/toggle) and row action menu skeleton in `src/app/(private)/banners/_components/banners-table-columns.tsx`
- [x] T018 [US1] Implement header actions with role-gated `新規登録` control in `src/app/(private)/banners/_components/banner-list-header-actions.tsx`
- [x] T019 [US1] Compose list page query/render pipeline with filter result banner in `src/app/(private)/banners/page.tsx`
- [x] T020 [US1] Prevent row navigation propagation from action controls in `src/app/(private)/banners/_components/banners-table-columns.tsx` and `src/app/(private)/banners/page.tsx`

**Checkpoint**: US1 is functional and independently verifiable.

---

## Phase 4: User Story 3 - Manage Banner Display Order (Priority: P1)

**Goal**: Deliver order-management dialog with staged edits and save/cancel persistence behavior.

**Independent Test**: As Headquarter/System, open 並び順 dialog, reorder using up/down and manual input, save, and confirm table order updates.

### Implementation for User Story 3

- [ ] T021 [P] [US3] Build order-management dialog UI shell in `src/app/(private)/banners/_components/banner-order-dialog.tsx`
- [ ] T022 [US3] Implement staged draft state (swap, manual input, disable boundary arrows) in `src/app/(private)/banners/_components/banner-order-dialog.tsx`
- [ ] T023 [US3] Wire reorder mutation and save/cancel flow in `src/app/(private)/banners/_components/banner-order-dialog.tsx`
- [ ] T024 [US3] Add role-gated `並び順を編集` trigger and dialog lifecycle in `src/app/(private)/banners/_components/banner-list-header-actions.tsx` and `src/app/(private)/banners/page.tsx`
- [ ] T025 [US3] Refresh list ordering after successful save in `src/app/(private)/banners/page.tsx`

**Checkpoint**: US3 is functional and independently verifiable.

---

## Phase 5: User Story 2 - Delete Banner from List (Priority: P2)

**Goal**: Deliver destructive delete confirmation and role-gated row delete behavior.

**Independent Test**: As Headquarter/System delete a banner from row actions; as non-authorized roles verify delete action is visible but disabled.

### Implementation for User Story 2

- [ ] T026 [P] [US2] Build delete confirmation dialog in `src/app/(private)/banners/_components/banner-delete-dialog.tsx`
- [ ] T027 [US2] Implement role-gated `編集`/`削除` row menu actions in `src/app/(private)/banners/_components/banners-table-columns.tsx`
- [ ] T028 [US2] Wire delete mutation, toast, and list invalidation in `src/app/(private)/banners/page.tsx`
- [ ] T029 [US2] Connect row delete trigger to dialog open/confirm/close handling in `src/app/(private)/banners/page.tsx` and `src/app/(private)/banners/_components/banners-table-columns.tsx`

**Checkpoint**: US2 is functional and independently verifiable.

---

## Phase 6: User Story 4 - Pagination & Empty States (Priority: P3)

**Goal**: Deliver full pagination metadata behavior and empty/filtered-empty UX.

**Independent Test**: Seed 150 banners, navigate pages, change page size, and verify metadata + empty states.

### Implementation for User Story 4

- [ ] T030 [US4] Implement pagination footer integration with page-size selector in `src/app/(private)/banners/page.tsx`
- [ ] T031 [US4] Implement filtered-empty and true-empty state rendering in `src/app/(private)/banners/page.tsx`
- [ ] T032 [US4] Ensure API pagination metadata contract (`totalItems`, `totalPages`, ranges) in `src/app/api/crm/banners/route.ts`
- [ ] T033 [US4] Reset `currentPage` on search/filter/sort/page-size changes in `src/app/(private)/banners/_hooks/use-banners-filters.ts`

**Checkpoint**: US4 is functional and independently verifiable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, hardening, and implementation notes.

- [ ] T034 [P] Update implementation notes and runbook details in `specs/010-banner-list/quickstart.md`
- [ ] T035 Run `npm run type-check` and `npm run lint`, fixing banner-scope issues in `src/app/(private)/banners/**` and `src/app/api/crm/banners/**`
- [ ] T036 [P] Record manual verification outcomes for all user stories in `specs/010-banner-list/checklists/implementation-verification.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories.
- **Phases 3–6 (User Stories)**: Start after Phase 2 completion.
- **Phase 7 (Polish)**: Depends on completion of desired user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no story dependency.
- **US3 (P1)**: Starts after Foundational; integrates with US1 list page.
- **US2 (P2)**: Starts after Foundational; integrates with US1 row actions.
- **US4 (P3)**: Starts after Foundational; relies on US1 table/list baseline.

### Story Completion Order

1. **US1** (MVP baseline)

2. **US3** (same priority P1, order-management capability)
3. **US2** (delete flow)
4. **US4** (pagination/empty-state hardening)

---

## Parallel Opportunities

- **Setup**: `T002` can run with `T001`.
- **Foundational**: `T006`, `T009`, and `T010` can run in parallel once permission model direction is settled.
- **US1**: `T013`, `T014`, `T015`, and `T016` can run in parallel.
- **US3**: `T021` can run in parallel with prep for `T024`.
- **US2**: `T026` can run in parallel with `T027`.
- **Polish**: `T034` and `T036` can run in parallel with command validation in `T035`.

### Parallel Example: User Story 1

```bash
# Parallel UI building blocks
T013 [US1] src/app/(private)/banners/_hooks/use-banners-filters.ts
T014 [US1] src/app/(private)/banners/_components/banners-filters.tsx
T015 [US1] src/app/(private)/banners/_components/banner-thumbnail.tsx
T016 [US1] src/app/(private)/banners/_constants/banner.constants.ts
```

### Parallel Example: User Story 3

```bash
# Parallelizable start of order-management work
T021 [US3] src/app/(private)/banners/_components/banner-order-dialog.tsx
T024 [US3] src/app/(private)/banners/_components/banner-list-header-actions.tsx
```

### Parallel Example: User Story 2

```bash
# Parallel delete-flow component and menu wiring
T026 [US2] src/app/(private)/banners/_components/banner-delete-dialog.tsx
T027 [US2] src/app/(private)/banners/_components/banners-table-columns.tsx
```

### Parallel Example: User Story 4

```bash
# Parallel pagination + empty-state implementation
T030 [US4] src/app/(private)/banners/page.tsx
T032 [US4] src/app/api/crm/banners/route.ts
```

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete **Phase 1** and **Phase 2**.
2. Complete **Phase 3 (US1)**.
3. Validate US1 independently and demo as MVP.

### Incremental Delivery

1. Add **US3** and validate order-management behavior.
2. Add **US2** and validate destructive flow + role-gating.
3. Add **US4** and validate pagination/empty-state scenarios.
4. Finish **Phase 7** polish/verification.

### Format Validation

All tasks in this file follow the required checklist pattern:

`- [ ] T### [P?] [US?] Description with file path`
