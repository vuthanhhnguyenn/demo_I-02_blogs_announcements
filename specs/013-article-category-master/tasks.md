---
description: 'Task list for Article Category Master List (Notice & Blog Management)'
---

# Tasks: Article Category Master List (Notice & Blog Management)

**Input**: Design documents from `/specs/013-article-category-master/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story. No automated tests are generated per the constitution's "No Testing Policy" — `npm run type-check` and `npm run lint` are the verification gates (see Polish phase).

**Note (2026-07-09)**: All tasks below are complete. Some task descriptions still name the field/type choices from the original plan (`brand_id`/`BannerBrandId`, `search`, `sort_by`/`display_order`, `paginations`, a hand-written `article-category.type.ts`, separate `article-category-header.tsx`/`article-category-list-section.tsx` files, `RoleGatedMenuItem` for row actions) — the shipped implementation diverged from these in several places (`brandEnum`/`BrandEnum`, `query`, `sort`/`order`, `pagination`+`count`, no hand type file, header/list-section merged into `page.tsx`, `DataTableRowActions` + `Permission.ArticleCategories*` for row actions). See `research.md` Decisions 5, 7, 10, 11 and `data-model.md` for the authoritative current shapes; this file is kept as the historical execution record and isn't rewritten field-by-field.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to US1 (P1 — browse/search), US2 (P2 — sort/paginate), or US3 (P3 — role-gated actions/delete)
- File paths are exact and repo-relative

---

## Phase 1: Setup

**Purpose**: Hand-written types and validation schemas shared by every route handler and component in this feature.

- [x] T001 [P] Create hand-written types in `src/types/api/article-category.type.ts`: import `BannerBrandId` from `@/lib/api/types.gen` (do not redeclare it); define `ArticleCategoryType`, `ARTICLE_CATEGORY_TYPE_LABELS`, `ARTICLE_CATEGORY_BRAND_LABELS`, `ArticleCategory`, `ArticleCategoryBrandInfo`, `ArticleCategoryResponseItem`, `ArticleCategoryMapping`, `ArticleCategorySortKey`, `GetArticleCategoriesQuery`, `GetArticleCategoriesResponse`, `DeleteArticleCategoryResponse` exactly per [data-model.md](./data-model.md#typescript-type-file)
- [x] T002 [P] Create Zod schemas in `src/app/api/_schemas/article-category.schema.ts`: import and reuse `BannerBrandIdSchema` + `BannerBrandInfoSchema` from `./banner.schema` (do not redefine); define `ArticleCategoryTypeSchema`, `ArticleCategorySchema`, `ArticleCategoryMappingSchema`, `ArticleCategoryResponseItemSchema`, `GetArticleCategoriesQuerySchema`, `GetArticleCategoriesResponseSchema`, `DeleteArticleCategoryResponseSchema` exactly per [data-model.md](./data-model.md#zod-schema-file)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Mock-DB layer and shared page chrome that both the list endpoint (US1/US2) and the delete endpoint (US3) depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create mock-DB table type definitions in `src/app/api/_mock-db/types/article-categories.type.ts`: `ArticleCategoriesType` (table interface for `ArticleCategory` rows) and the `ArticleCategoryMapping` table interface, following the existing `banners.type.ts` pattern (depends on T001)
- [x] T004 Create seed data in `src/app/api/_mock-db/seeds/article-category.seed.ts`: `SEED_ARTICLE_CATEGORY_ROWS` (≥10 records, both `type` values represented, all 6 `BannerBrandId` values represented, at least one `is_public: false`, `display_order` numbered independently per `type`, plus the seeded `CAT-000` "未分類" Unclassified fallback per [data-model.md](./data-model.md) and [research.md](./research.md) Decision 8) and `SEED_ARTICLE_CATEGORY_MAPPINGS` (generated programmatically via a `buildMappings()` helper per [quickstart.md](./quickstart.md#step-3--mock-seed-data), reproducing counts 12/8/5/24/18/15/11/7/9/3, including one category with 0 mappings, `CAT-000` starting with 0 mappings) (depends on T003)
- [x] T005 Create mock table factory in `src/app/api/_mock-db/tables/article-category.table.ts`: `createArticleCategoryTables()` and an exported `enrichArticleCategory(category)` helper that resolves `brands: { brand_id, brand_name }` via `ARTICLE_CATEGORY_BRAND_LABELS` and computes `article_count` from `db.articleCategoryMappings`, mirroring `enrichBanner()` in `src/app/api/crm/banners/route.ts` (depends on T004)
- [x] T006 Wire the new tables into `src/app/api/_mock-db/_create-db.ts` (import `createArticleCategoryTables`, `Object.assign(db, createArticleCategoryTables())`, seed call) and `src/app/api/_mock-db/index.ts`, mirroring the existing banner wiring (depends on T005)
- [x] T007 Create placeholder stub page at `src/app/(private)/announcements/page.tsx` — minimal "coming soon" placeholder (I-02 parent list, out of scope) so the header's back-link resolves without a 404, per [research.md](./research.md) Decision 9

**Checkpoint**: Foundation ready — mock data layer is queryable and the back-link destination exists; user story implementation can now begin.

---

## Phase 3: User Story 1 - Browse and search the category master (Priority: P1) 🎯 MVP

**Goal**: Headquarter/Manager/Staff/Observer users can open `/article-categories`, see the full category list (ID, name, description, type, brand scope, display order, article count, publish status), search by name/description, filter by type/brand/publish status (AND-combined), see the active filter count, clear all filters, and see distinct empty states for "no categories at all" vs. "no matches."

**Independent Test**: Navigate to `/article-categories`, confirm all seeded categories render with all required columns; type a partial name into search and confirm only matches remain; apply type/brand/status filters and confirm AND-combination and active-filter count; clear filters and confirm the full list reappears; verify both empty-state variants.

### Implementation for User Story 1

- [x] T008 [US1] Implement `GET /api/crm/article-categories` route handler in `src/app/api/crm/article-categories/route.ts`: `registerRoute()` per [contracts/GET-article-categories.md](./contracts/GET-article-categories.md), parse/validate query with `GetArticleCategoriesQuerySchema`, map `db.articleCategories.getList()` through `enrichArticleCategory()`, filter on `search`/`type`/`brand_id`/`is_public`, sort per `sort_by`/`sort_order` (including computed `article_count`; skip sorting when `sort_by` is omitted), paginate, return `{ items, paginations }` per `GetArticleCategoriesResponseSchema` (depends on T002, T006)
- [x] T009 [US1] Run `npm run generate-openapi && npm run generate-api` to produce `getCrmArticleCategoriesOptions` and `ArticleCategory`/`GetCrmArticleCategoriesResponse` types in `src/lib/api/` — do not hand-edit generated output (depends on T008)
- [x] T010 [US1] Create `src/app/(private)/article-categories/_components/article-category-header.tsx` (`'use client'`): `PageHeader` with a `BackLink` to `/announcements` and the "新規登録" button slot (full `RoleGatedButton` wiring is completed in US3; render a static/disabled placeholder here so the header compiles standalone) (depends on T007)
- [x] T011 [US1] Create `src/app/(private)/article-categories/_hooks/use-article-category-filters.ts`: `nuqs` `useQueryStates` covering `search`, `type`, `brand_id`, `is_public`, `sort_by`, `sort_order`, `page`, `limit`, mirroring `use-staffs-filters.ts` (depends on T009)
- [x] T012 [US1] Create `src/app/(private)/article-categories/_components/article-category-filters.tsx` (`'use client'`): search input, "詳細フィルター" toggle (local `useState`) with collapsible panel containing 3 `Select` dropdowns (type/brand_id/is_public), active-filter count summary, and "clear all," mirroring `staffs-filters.tsx` structure (depends on T011)
- [x] T013 [US1] Create `src/app/(private)/article-categories/_components/article-category-table-columns.tsx`: `DataTable` column defs for ID, カテゴリ名, 説明, 種別 (badge per `data-model.md` display rules), ブランド (plain styled `Badge` rendering `row.original.brands.brand_name` — do **not** use the shared `<BrandBadge>` component per [research.md](./research.md) Decision 5), 表示順, 記事数, 公開状況 (badge); omit the actions column for now (added in US3) (depends on T009)
- [x] T014 [US1] Create `src/app/(private)/article-categories/_components/article-category-list-section.tsx` (`'use client'`): `useQuery(getCrmArticleCategoriesOptions({ query: ... }))` driven by the filters hook, table wrapped in `<DataStateBoundary>` with distinct `emptyTitle`/`emptyDescription` for "no categories exist" vs. "no filter matches" per FR-007, footer using `<TablePaginationWithSize>` (depends on T012, T013)
- [x] T015 [US1] Create RSC page shell at `src/app/(private)/article-categories/page.tsx`: renders `<ArticleCategoryHeader>` and wraps `<ArticleCategoryFilters>` + `<ArticleCategoryListSection>` in `<Suspense>` (depends on T010, T014)
- [x] T016 [US1] Run `npm run generate-routes` to register `/article-categories` and `/announcements` in `src/lib/routes/routes.config.ts` (depends on T015)

**Checkpoint**: User Story 1 is fully functional and testable independently — list, search, filter, clear, and both empty states work end-to-end against the mock API.

---

## Phase 4: User Story 2 - Sort and page through the category master (Priority: P2)

**Goal**: Users can sort the list by category name, display order, or article count (ascending/descending toggle), change page size (25/50/100/200), and page through results with an accurate "showing X–Y of N" summary.

**Independent Test**: Click the カテゴリ名/表示順/記事数 column headers and confirm ascending then descending re-sort; change page size and navigate pages, confirming row counts and the summary update accordingly.

### Implementation for User Story 2

- [x] T017 [US2] Add sortable header behavior (`manualSorting: true`) to カテゴリ名, 表示順, and 記事数 columns in `src/app/(private)/article-categories/_components/article-category-table-columns.tsx`, toggling `sort_by`/`sort_order` via the filters hook's setters on repeated header clicks (depends on T013)
- [x] T018 [US2] Wire the page-size selector (25/50/100/200) and page navigation in `src/app/(private)/article-categories/_components/article-category-list-section.tsx` through `<TablePaginationWithSize>` and the `page`/`limit` state from `use-article-category-filters.ts` (depends on T011, T014)

**Checkpoint**: User Stories 1 AND 2 both work independently — sorting and pagination are fully usable on top of search/filter.

---

## Phase 5: User Story 3 - View management actions gated by role (Priority: P3)

**Goal**: Headquarter/System users see enabled "new category," row "edit," and row "delete" actions; Manager/Staff/Observer see the same actions visibly present but disabled with an explanation. Delete requires a confirmation naming the category, its linked article count, the Unclassified reassignment, and irreversibility.

**Independent Test**: As a Headquarter-role user, confirm "new category," "edit," and "delete" are enabled and navigate/act correctly; as a Manager/Staff/Observer-role user, confirm the same actions are visibly disabled with an explanatory tooltip/message; delete a category with linked articles and confirm the dialog copy, then cancel and confirm no data changes, then confirm and verify reassignment.

### Implementation for User Story 3

- [x] T019 [P] [US3] Create placeholder stub pages at `src/app/(private)/article-categories/create/page.tsx` and `src/app/(private)/article-categories/[id]/edit/page.tsx` — minimal "coming soon" placeholders per [research.md](./research.md) Decision 9
- [x] T020 [US3] Run `npm run generate-routes` to register `/article-categories/create` and `/article-categories/[id]/edit` in `src/lib/routes/routes.config.ts` (depends on T019)
- [x] T021 [US3] Wire `RoleGatedButton` (`allowedRoles={[UserRole.Headquarter, UserRole.System]}`, disabled explanation for other roles) for "新規登録" navigating to `/article-categories/create` into `src/app/(private)/article-categories/_components/article-category-header.tsx` (depends on T010, T020)
- [x] T022 [US3] Implement `DELETE /api/crm/article-categories/{id}` route handler in `src/app/api/crm/article-categories/[id]/route.ts` per [contracts/DELETE-article-categories-id.md](./contracts/DELETE-article-categories-id.md): 404 if not found, 400 if `id === 'CAT-000'`, reassign matching `articleCategoryMappings` rows to `CAT-000`, remove the category, return success message (depends on T002, T006)
- [x] T023 [US3] Run `npm run generate-openapi && npm run generate-api` to produce `deleteCrmArticleCategoriesByIdMutation` (depends on T022)
- [x] T024 [US3] Create `src/app/(private)/article-categories/_components/article-category-delete-action.tsx` (`'use client'`): `AlertDialog` (no reason field) stating the category name, linked `article_count`, the Unclassified reassignment, and that the action cannot be undone; drives `deleteCrmArticleCategoriesByIdMutation()`; invalidates the list query key on success, mirroring `staff-delete-action.tsx`'s `invalidateQueries` pattern (depends on T023)
- [x] T025 [US3] Add a role-gated actions dropdown column to `src/app/(private)/article-categories/_components/article-category-table-columns.tsx`: `RoleGatedMenuItem` "編集" → `/article-categories/[id]/edit`, `RoleGatedMenuItem` "削除" → opens `<ArticleCategoryDeleteAction>`, both disabled with explanation for non-Headquarter/System roles, mirroring `staffs-table-columns.tsx` (depends on T013, T020, T024)

**Checkpoint**: All user stories are independently functional — role gating and the full delete-with-reassignment flow work end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification gates and optional discoverability, per the constitution's "No Testing Policy" (type-check + lint replace automated tests).

- [x] T026 Run `npm run type-check` and fix any errors across all new/changed files
- [x] T027 Run `npm run lint` and fix any errors across all new/changed files
- [x] T028 [P] Walk through [quickstart.md](./quickstart.md) end-to-end manually: search/filter/clear (US1), sort/paginate (US2), role-gated new/edit/delete including cancel and confirm reassignment (US3)
- [ ] T029 [P] Optional per [quickstart.md](./quickstart.md#step-9--sidebar-navigation): add a temporary discoverability link under a "コンテンツ" section in `src/components/layout/app-sidebar.tsx` — not required by any FR, skip unless the team requests earlier discoverability
- [x] T030 [US3] Add `Permission.ArticleCategories{View,Create,Edit,Delete}` to `src/types/permission.type.ts` and wire `PAGE_PERMISSIONS`/`ROLE_PERMISSIONS` in `src/constants/permission.constants.ts` (View → Headquarter/Manager/Staff/Observer; Create/Edit/Delete → Headquarter only) — added after T025's row-actions column already referenced `Permission.ArticleCategoriesEdit`/`Delete` before those enum members existed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 and T002 can start immediately, in parallel
- **Foundational (Phase 2)**: T003→T004→T005→T006 is a strict chain (each builds on the previous file); T007 has no dependency on T003–T006 and can run in parallel with them. BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion; in practice extends files US1 creates (T013, T014), so implement after US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion; extends US1's header/columns files (T010, T013), so implement after US1
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories — the true MVP slice
- **User Story 2 (P2)**: Independently testable, but its tasks (T017, T018) edit files US1 created (T013, T014) rather than creating new ones — implement after US1 to avoid rework
- **User Story 3 (P3)**: Independently testable, but its tasks (T021, T025) edit files US1 created (T010, T013) rather than creating new ones — implement after US1 to avoid rework

### Within Each User Story

- Mock/API layer before generated client before components before page composition
- Route registration (`generate-routes`) only after the relevant page folders exist
- Codegen (`generate-openapi`/`generate-api`) only after the relevant Zod schemas and route handler exist

### Parallel Opportunities

- T001 and T002 (Setup) in parallel
- T007 in parallel with T003–T006 (Foundational)
- T019 (US3 stub pages) has no same-phase dependency and can start as soon as Foundational is done, in parallel with US1/US2 work, though `generate-routes` (T020) should run after US1's T016 to avoid clobbering a concurrent regeneration
- T028 and T029 (Polish) in parallel with each other, after T026/T027

---

## Parallel Example: Setup + Foundational

```bash
# Launch Setup tasks together:
Task: "Create hand-written types in src/types/api/article-category.type.ts"
Task: "Create Zod schemas in src/app/api/_schemas/article-category.schema.ts"

# Once Setup is done, T007 can run alongside the T003→T006 mock-DB chain:
Task: "Create placeholder stub page at src/app/(private)/announcements/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T007) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T008–T016)
4. **STOP and VALIDATE**: Confirm list/search/filter/empty-states work against the mock API
5. Demo if ready — this is the minimum viable, independently valuable slice

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently → demo (MVP)
3. User Story 2 → validate independently → demo (adds sort/paginate on top of US1's list)
4. User Story 3 → validate independently → demo (adds role gating + delete on top of US1's list)
5. Polish → type-check, lint, full quickstart walkthrough

---

## Notes

- No automated tests are generated (constitution "No Testing Policy"); `npm run type-check` + `npm run lint` (T026–T027) are the verification gates
- [P] tasks touch different files with no unmet dependencies
- US2 and US3 tasks mostly _extend_ files US1 creates rather than creating new ones — this is expected given a single mock list endpoint and a single table-columns file serve all three stories; sequence them after US1 rather than treating them as fully file-isolated parallel work
- Codegen steps (`generate-openapi`, `generate-api`, `generate-routes`) must be re-run whenever their respective source (Zod schema / route handler / page folder) changes — never hand-edit generated output
- Commit after each task or logical group; stop at each phase checkpoint to validate independently
