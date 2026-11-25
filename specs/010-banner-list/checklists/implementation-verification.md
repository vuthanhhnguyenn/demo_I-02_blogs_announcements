# Implementation Verification: Banner List Management (010)

**Feature**: `010-banner-list`  
**Created**: 2026-07-02  
**Status**: ✅ Phase 1–7 Complete

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Banner route shell and feature directories
- [x] T002 Banner UI constants scaffold
- [x] T003 Regenerate typed routes

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Banner permission enums in `permission.type.ts`
- [x] T005 Page permission mapping in `permission.constants.ts`
- [x] T006 Banner request/response schemas in `banner.schema.ts`
- [x] T007 Mock DB seed and operations in `banner.table.ts`
- [x] T008 GET list API route (`/api/crm/banners`)
- [x] T009 DELETE API route (`/api/crm/banners/[id]`)
- [x] T010 PATCH display-order API route (`/api/crm/banners/display-order`)
- [x] T011 Register banner API routes
- [x] T012 Regenerate API client

## Phase 3: User Story 1 — View Banner List (P1)

- [x] T013 URL query/filter state hook (`use-banners-filters.ts`)
- [x] T014 Search + detailed filter UI (`banners-filters.tsx`)
- [x] T015 Thumbnail with fallback placeholder (`banner-thumbnail.tsx`)
- [x] T016 Status and channel badge label/class constants in `banner.constants.ts` (rendered inline in `banners-table-columns.tsx`; no standalone `banner-status-badge.tsx` component exists)
- [x] T017 Sortable table columns + row actions (`banners-table-columns.tsx`)
- [x] T018 Header actions with role-gated controls (`banner-list-header-actions.tsx`)
- [x] T019 Compose list page with filter result banner (`page.tsx`)
- [x] T020 stopPropagation on action controls

## Phase 4: User Story 3 — Manage Banner Display Order (P1)

- [x] T021 Order-management dialog UI shell (`banner-order-dialog.tsx`)
- [x] T022 Staged draft state (swap, manual input, disable boundary arrows)
- [x] T023 Reorder mutation with save/cancel flow (+ toast + invalidation)
- [x] T024 Role-gated `並び順を編集` trigger
- [x] T025 List refresh after successful save

## Phase 5: User Story 2 — Delete Banner from List (P2)

- [x] T026 Delete confirmation dialog (`banner-delete-dialog.tsx`)
- [x] T027 Role-gated 編集/削除 row menu actions (in `banners-table-columns.tsx`)
- [x] T028 Delete mutation + toast + list invalidation
- [x] T029 Row delete trigger → dialog open → confirm → close flow

## Phase 6: User Story 4 — Pagination & Empty States (P3)

- [x] T030 Pagination footer with page-size selector (`TablePaginationWithSize`)
- [x] T031 Filtered-empty and true-empty state rendering (`Empty` component)
- [x] T032 API pagination metadata (`totalItems`, `totalPages`, ranges)
- [x] T033 Reset `currentPage` on search/filter/sort/page-size changes

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T034 Implementation notes updated in `quickstart.md`
- [x] T035 `npm run type-check` — pass (0 errors)
- [x] T035 `npm run lint` — pass (0 errors, pre-existing warnings only)
- [x] T036 Manual verification checklist recorded

---

## FR Coverage

| FR     | Description                                             | Status |
| ------ | ------------------------------------------------------- | ------ |
| FR-001 | Paginated table with all columns and badges             | ✅     |
| FR-002 | Role-gated header actions (新規登録, 並び順を編集)      | ✅     |
| FR-003 | Role-gated row actions (編集, 削除)                     | ✅     |
| FR-004 | Search by title (substring, case-insensitive)           | ✅     |
| FR-005 | Expandable detailed filters with active count badge     | ✅     |
| FR-006 | Filter result banner with clear action                  | ✅     |
| FR-007 | Column sorting (order/title/status) with icons          | ✅     |
| FR-008 | BrandBadge rendering                                    | ✅     |
| FR-009 | Channel ON/OFF badges with icons                        | ✅     |
| FR-010 | Status colored badges                                   | ✅     |
| FR-011 | Delete AlertDialog with destructive confirm             | ✅     |
| FR-012 | Order management Dialog with banner list                | ✅     |
| FR-013 | Reorder via ↑/↓ buttons and manual input                | ✅     |
| FR-014 | Disable ↑ on first, ↓ on last item                      | ✅     |
| FR-015 | Save/Cancel semantics with persistence                  | ✅     |
| FR-016 | Pagination with configurable page size (25/50/100/200)  | ✅     |
| FR-017 | Pagination metadata in footer                           | ✅     |
| FR-018 | Reset currentPage on search/filter/sort/pageSize change | ✅     |
| FR-019 | Empty for filtered-empty and true-empty                 | ✅     |
| FR-020 | stopPropagation on action controls                      | ✅     |

---

## TypeScript & Lint

- `npm run type-check`: ✅ PASS (0 errors)
- `npm run lint`: ✅ PASS (0 errors, 9 pre-existing warnings in unrelated files)

## Notes

- All banner-scope code follows constitution principles I–VI
- Role gating uses `Permission.BannersView/Create/Edit/Delete/Reorder`
- Phase 1 uses mock API and React Query hooks; no direct fetch calls
- All user-facing labels are in Japanese per language policy
