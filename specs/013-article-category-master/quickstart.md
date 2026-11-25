# Developer Quickstart: Article Category Master List (Notice & Blog Management)

**Branch**: `013-article-category-master`
**Route**: `/article-categories`
**Phase**: 1 (mock API — no backend required)
**Updated**: 2026-07-09 — synced to the shipped implementation (see `research.md` for what changed vs. the original plan and why)

---

## Prerequisites

- Node.js ≥ 24.0.0
- Repo cloned and `npm install` run
- On branch `013-article-category-master`

---

## Implementation Order

Work through files in this order to ensure dependencies are satisfied before consumers.

### Step 1 — Zod Schemas

**File**: `src/app/api/_schemas/article-category.schema.ts`

Copy the Zod schema block from [data-model.md](./data-model.md#zod-schema-file-actual-current). Imports and reuses `BrandEnumSchema` from `./brand.schema` — do not redefine it (the original draft planned to reuse the sibling Banner feature's `BannerBrandId` instead; that turned out to be unnecessary, see `research.md` Decision 5). All types are `z.infer<>`'d directly from this file — there is no separate hand-written `src/types/api/article-category.type.ts` (see `research.md` Decision 11). Used by Route Handlers for request validation and OpenAPI registration.

---

### Step 2 — Mock seed data

**Files**: `src/app/api/_mock-db/types/article-categories.type.ts`, `src/app/api/_mock-db/seeds/article-category.seed.ts`, `src/app/api/_mock-db/tables/article-category.table.ts`, wired into `src/app/api/_mock-db/_create-db.ts` / `index.ts`

The mock DB is modular (see `_mock-db/tables/*.ts` + `_mock-db/seeds/*.ts`, e.g. `banner.table.ts` + `banner.seed.ts`) — follow that structure, not a flat array in a single file.

**`articleCategories` table** — stored shape only: `id`, `name`, `description`, `type`, `brand_enum` (optional), `order`, `is_public` — **no `articleCount` field** (see `research.md` Decision 8). The shipped seed (`SEED_ARTICLE_CATEGORY_ROWS`) has 30 records including:

- Both `type` values represented (`notice`, `blog`)
- All 5 `BrandEnum` values represented at least once (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`)
- Several `is_public: false` records
- `order` numbered independently within each `type` group
- The seeded "Unclassified" fallback category: `{ id: 'CAT-000', name: '未分類', type: 'notice', brand_enum: 'joyfit', order: 0, is_public: false }` (delete-reassignment target, exported as `UNCLASSIFIED_CATEGORY_ID` — see `research.md` Decision 8)

**`articleCategoryMappings` table** — seed `ArticleCategoryMapping` rows (`{ article_id, category_id }`) so that counting rows per `category_id` reproduces the desired per-category `articleCount`. Generated programmatically via a `buildMappings()` helper in the seed file:

```typescript
function buildMappings(counts: Record<string, number>): ArticleCategoryMapping[] {
  const rows: ArticleCategoryMapping[] = [];
  let n = 1;
  for (const [categoryId, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) {
      rows.push({ article_id: `ART-${String(n++).padStart(4, '0')}`, category_id: categoryId });
    }
  }
  return rows;
}
```

Includes categories with `0` mapping rows (exercises the "no articles to reassign" edge case from `spec.md`), and `CAT-000` (Unclassified) starts with `0` seeded rows — it only accumulates mappings after a delete reassigns into it.

`article-category.table.ts` exports `createArticleCategoryTables()` (returns `{ articleCategories, articleCategoryMappings }` with `getList`/`getById`/`delete`/`countByCategoryId`/`reassignCategory`) and `enrichArticleCategory(category, articleCount)`, which maps the stored snake_case fields to the response's camelCase shape (`brand_enum → brandEnum`, `is_public → isPublic`) and attaches the passed-in `articleCount`.

---

### Step 3 — Route Handlers

#### `src/app/api/crm/article-categories/route.ts`

Implements `GET /api/crm/article-categories`. Refer to [contracts/GET-article-categories.md](./contracts/GET-article-categories.md) for filtering/sort/pagination logic.

Key steps:

1. Parse and validate query params with `GetArticleCategoriesQueryParamsSchema`
2. Map `db.articleCategories.getList()` through `enrichArticleCategory()`, passing each category's `db.articleCategoryMappings.countByCategoryId(id)`
3. Filter on `query`/`type`/`brandEnum`/`isPublic`
4. Sort per `sort`/`order`, including the computed `articleCount` (skip sorting entirely when `sort` is omitted)
5. Paginate and return `{ items, pagination: { page, limit, totalItems, totalPages }, count }` per `GetArticleCategoriesResponseSchema` — `count` is the total row count computed **before** filtering is applied

#### `src/app/api/crm/article-categories/[id]/route.ts`

Implements `DELETE /api/crm/article-categories/:id`. Refer to [contracts/DELETE-article-categories-id.md](./contracts/DELETE-article-categories-id.md).

No request body (see `research.md` Decision 7). Before removing the category row, refuse with 400 if `id === UNCLASSIFIED_CATEGORY_ID` (`'CAT-000'`); otherwise reassign its `articleCategoryMappings` rows to `'CAT-000'` via `db.articleCategoryMappings.reassignCategory()`, then delete the category row. 404 if the category doesn't exist.

---

### Step 4 — Generate the API client

```bash
npm run generate-openapi   # regenerates src/lib/openapi.json from registerRoute() calls
npm run generate-api       # regenerates src/lib/api/ (client, types.gen.ts, react-query.gen.ts)
```

This produces `getCrmArticleCategoriesOptions(...)` / `getCrmArticleCategoriesQueryKey(...)` and `deleteCrmArticleCategoriesByIdMutation(...)` in `src/lib/api/@tanstack/react-query.gen.ts`, plus `ArticleCategoryType`, `ArticleCategorySort`, `GetArticleCategoriesQueryParams`, `GetCrmArticleCategoriesResponse`, `ArticleCategoryItemResponse`, etc. in `types.gen.ts`. **Do not hand-edit these generated files** — if a shape is wrong, fix the Zod schema in Step 1 and regenerate both the OpenAPI spec and the client (running only `generate-api` against a stale `openapi.json` reproduces the exact bug this feature hit once: `GetCrmArticleCategoriesData.query` typed as `never` because the spec hadn't been regenerated first).

---

### Step 5 — Route registration

Create the page folders in Step 7 first, then run:

```bash
npm run generate-routes
```

This adds `/article-categories`, `/article-categories/create`, `/article-categories/[id]/edit`, and `/announcements` to `routes.config.ts`.

---

### Step 6 — Permissions

**Files**: `src/types/permission.type.ts`, `src/constants/permission.constants.ts`

Add `Permission.ArticleCategoriesView`/`Create`/`Edit`/`Delete`. Wire `PAGE_PERMISSIONS`: `/article-categories` → `View`, `/article-categories/create` → `Create`, `/article-categories/:id/edit` → `Edit`. Wire `ROLE_PERMISSIONS`: grant `View` to Headquarter, Manager, Staff, and Observer; grant `Create`/`Edit`/`Delete` to Headquarter only (System already has every permission). Trainer gets none of these — it isn't one of the roles spec.md scopes this screen to.

---

### Step 7 — Page and components

Create the following files. Unlike the original plan, the header and data-fetching logic are **not** split into separate `article-category-header.tsx` / `article-category-list-section.tsx` components — everything lives directly in `page.tsx`.

#### `src/app/(private)/article-categories/_constants/article-category.constants.ts`

`ARTICLE_CATEGORY_DEFAULT_PAGE_SIZE`, `ARTICLE_CATEGORY_PAGE_SIZE_OPTIONS`, `PUBLISH_STATUS_LABELS`/`PUBLISH_STATUS_BADGE_CLASSES`, `ARTICLE_CATEGORY_TYPE_LABELS`/`ARTICLE_CATEGORY_TYPE_BADGE_CLASSES`.

#### `src/app/(private)/article-categories/_hooks/use-article-category-filters.ts`

`nuqs` `useQueryStates` covering `page`, `limit`, `query`, `type`, `brandEnum`, `isPublic`, `sort`, `order`, mirroring `use-staffs-filters.ts`. Returns `filters`, `setFilters`, `queryParams` (the shape actually sent to `getCrmArticleCategoriesOptions`), `clearFilters`, `hasActiveFilters`, `activeDetailFilterCount`, plus `currentPage`/`setCurrentPage`/`pageSize`/`setPageSize` convenience wrappers. Search input is debounced 500ms via local `searchInput` state before it lands in `filters.query`.

#### `src/app/(private)/article-categories/_components/article-category-filters.tsx`

`'use client'`. Search input + "詳細フィルター" toggle (local `useState`) + collapsible panel with 3 `Select` dropdowns (type / brand — using the shared `BRAND_LABELS` / publish status) + active-filter count badge + "すべてクリア" — mirrors `staffs-filters.tsx` structure.

#### `src/app/(private)/article-categories/_components/article-category-table-columns.tsx`

Column defs for `DataTable` (`variant="simple"`, `manualSorting: true`): ID, カテゴリ名 (sortable), 説明, 種別 (badge), ブランド (the shared `<BrandBadge brand={row.original.brandEnum} />` — **no** local brand-label map or bespoke badge), 表示順 (`order`, sortable), 記事数 (`articleCount`, sortable), 公開状況 (badge), actions (`DataTableRowActions` with `actions={['edit', 'delete']}` and `permissions={{ edit: Permission.ArticleCategoriesEdit, delete: Permission.ArticleCategoriesDelete }}` — not `RoleGatedMenuItem`'s role-array form).

#### `src/app/(private)/article-categories/_components/article-category-delete-action.tsx`

`'use client'`. `AlertDialog` (no form/reason field) driven by `deleteCrmArticleCategoriesByIdMutation()`. Dialog copy interpolates the category name and `articleCount` per FR-009; invalidates `getCrmArticleCategoriesQueryKey()` on success.

#### `src/app/(private)/article-categories/page.tsx`

`'use client'` content component wrapped in a `<Suspense>` default export (needed because `useArticleCategoryFilters` reads `nuqs` search params). Contains: `PageHeader` (breadcrumb `BackLink` → `/announcements`, title "カテゴリマスタ", `count` badge, `RoleGatedButton` `allowedRoles={[UserRole.Headquarter, UserRole.System]}` for "新規登録" → `/article-categories/create`), the filter bar, `FilterResult` summary when filters are active, the `DataTable` (with `Empty` as `emptyContent`, distinguishing the "no categories at all" vs. "no filter matches" variants per FR-007), `TablePaginationWithSize`, and the delete confirmation dialog.

---

### Step 8 — Placeholder stub routes

Per `research.md` Decision 9, create three minimal stub pages so navigation resolves without a 404 (none renders more than a "coming soon" message — building these out is separate, unscoped work):

- `src/app/(private)/article-categories/create/page.tsx`
- `src/app/(private)/article-categories/[id]/edit/page.tsx`
- `src/app/(private)/announcements/page.tsx`

---

### Step 9 — Sidebar navigation

**File**: `src/components/layout/app-sidebar.tsx`

A "コンテンツ" section with a single "お知らせ管理" entry linking to `/announcements` was added — there is **no** direct sidebar link to `/article-categories`. This matches the original plan's primary recommendation (the category master is reached only via the `/announcements` stub's own link) rather than its optional "temporary direct link" fallback.

---

### Step 10 — Type check + lint

```bash
npm run type-check   # must exit 0
npm run lint         # must exit 0
```

Fix any errors before opening a PR.

---

## Phase 2 Migration Checklist (future)

When the real backend publishes the OpenAPI spec for article categories:

- [ ] Confirm the real endpoint shapes match `GetArticleCategoriesResponseSchema` / `DeleteArticleCategoryResponseSchema`, or update the schemas and regenerate
- [ ] Remove mock Route Handlers in `src/app/api/crm/article-categories/`
- [ ] Remove seed data/tables in `src/app/api/_mock-db/{types,seeds,tables}/article-categor*.ts`
- [ ] Re-run `npm run generate-openapi && npm run generate-api` against the real spec
- [ ] Re-point the reassignment-to-Unclassified logic (already implemented against `ArticleCategoryMapping` in Phase 1 — see `research.md` Decision 8) at the real `Article` table once I-02 FR-001–FR-004 ships
- [ ] Add server-side permission checks to the real backend's delete endpoint — Phase 1's mock DELETE handler has none (see `research.md` Decision 7)
