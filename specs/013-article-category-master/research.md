# Research: Article Category Master List (Notice & Blog Management)

**Branch**: `013-article-category-master` | **Phase**: 0 — Outline & Research
**Generated**: 2026-07-08

---

## Decision 1 — Routing: `/article-categories`

**Decision**: Use `/article-categories` (plural noun) as the route path for this feature, matching the UI design file's `article-category-list.tsx` naming.

**Rationale**: Consistent with existing plural-noun routes in this repo (`/staffs`, `/stores`, `/visit-experiences`).

**Alternatives considered**: `/categories` — rejected; too generic given the CRM has other master-data lists (positions, brands) that could later claim that name.

---

## Decision 2 — Data fetching & mutation: full OpenAPI-first pipeline, not manual option-factories

**Decision**: Declare the list and delete endpoints via `registerRoute()` + Zod schemas, run `generate-openapi` then `generate-api`, and consume the resulting `getCrmArticleCategoriesOptions` / `deleteCrmArticleCategoriesByIdMutation` from `src/lib/api/@tanstack/react-query.gen`, exactly as the `staffs` and `positions` features already do.

**Rationale**: The constitution (ratified 2026-07-03) makes this the current mandatory pattern: "All API interactions MUST use the `hey-api`-generated client... New endpoints MUST be declared in the OpenAPI spec before implementation begins." The earlier `001-visit-experience-list` feature used hand-written option-factories in a dedicated `*.query.ts` file, but that predates the ratified constitution (2026-06-17) and is now superseded — newer features (`staffs`) already use the generated-client pattern end-to-end. Following the newer, still-active convention keeps this feature consistent with the codebase as it exists today rather than reproducing a since-superseded pattern.

**Alternatives considered**:

- Mirror `001-visit-experience-list`'s manual option-factory file — rejected; superseded by the ratified constitution and no longer matches the newest sibling features.
- Inline `fetch` calls in components — rejected outright by Principle II.

---

## Decision 3 — Filtering, sorting, and pagination are server-driven (mock), not client-side array operations

**Decision**: The mock `GET /api/crm/article-categories` endpoint accepts `query`, `type`, `brandEnum`, `isPublic`, `sort`, `order`, `page`, and `limit` query params (see `data-model.md` for the shipped param names — these differ slightly from the originally-planned `search`/`brand_id`/`is_public`/`sort_by`/`sort_order`) and returns an already filtered/sorted/paginated page, mirroring the `staffs` and `visit-experiences` endpoints.

**Rationale**: The UI design file (`article-category-list.tsx`) does all of this client-side against a static in-memory array, but that file is a standalone prototype with no backend. This repo's established Phase 1 convention (see `001-visit-experience-list` Decision 2, and the shipped `staffs` list) is server-driven filtering so that the Phase 2 swap to a real backend requires zero client-code changes. Given FR-002/FR-003/FR-005/FR-006 describe the _behavior_ (search, filter, sort, paginate) rather than mandating client-side computation, server-driven mock filtering satisfies the spec while staying consistent with the rest of the codebase.

**Alternatives considered**: Fetch the full category list once and filter/sort/paginate in the browser (as the prototype does) — rejected; diverges from every other list feature in this repo and would need to be redone for Phase 2 anyway.

---

## Decision 4 — URL state via `nuqs` for filters/search/sort/pagination; panel open/close stays local state

**Decision**: `query`, `type`, `brandEnum`, `isPublic`, `sort`, `order`, `page`, and `limit` are synced to the URL via `nuqs` (`useQueryStates`), following the exact shape of `use-staffs-filters.ts`. The "詳細フィルター" panel's open/closed boolean is local `useState`, not URL state.

**Rationale**: Constitution Principle V and existing precedent (`use-staffs-filters.ts`, `001-visit-experience-list` Decisions 3 & 9) draw this exact line: state that affects the data result and should be deep-linkable/back-button-able goes in the URL; purely ephemeral UI chrome (panel visibility) stays local.

**Alternatives considered**: React Context for all filter state — rejected; constitution reserves Context for non-URL-shareable state, and a dedicated filters context (mirroring `StaffsFiltersProvider`) is only introduced if the filter component tree needs prop-drilling relief, which a single filter bar does not.

---

## Decision 5 — `ArticleCategory.brand_enum` reuses the existing generated `BrandEnum`, not `BannerBrandId` and not a new enum

**Decision (superseded from the original draft below, updated 2026-07-09 to match what shipped)**: `ArticleCategory` has an optional relationship to a brand via `brand_enum: BrandEnum`, reusing the enum and Zod schema (`BrandEnum` / `BrandEnumSchema`) already defined in `src/app/api/_schemas/brand.schema.ts` for the rest of the CRM. Category rows are seeded with `brand_enum` directly; the list API returns it as a flat `brandEnum` field with no resolution step — the brand column renders it via the shared `<BrandBadge brand={...} />` component, and the filter dropdown labels it via the shared `BRAND_LABELS` map (`src/app/(private)/brands/_constants/brand.constants.ts`).

**What actually shipped, and why it differs from the original plan**: The original draft (preserved below for history) planned to reuse the sibling Banner feature's `BannerBrandId` — a 6-member enum including a `joyfit_all` ("brand overall") value — specifically to avoid a naming collision between the generated `Brand` enum's sub-brand meaning and a `MainBrand`-style "whole brand family" meaning. In practice, the shipped feature never needed that distinction: categories are scoped to exactly one of the 5 `BrandEnum` members (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`), there is no "brand overall" category in the seed data, and reusing the plain `BrandEnum` (rather than pulling in a type from an unrelated sibling feature) is a more direct application of Principle V — one fewer cross-feature dependency, and it lets the category's brand column reuse the _existing_ `<BrandBadge>` component unmodified instead of hand-rolling a parallel badge just to cover a `joyfit_all` case that doesn't occur here.

**Original draft's rationale** (kept for context, no longer the reason for the current shape): the generated `Brand` enum's `JOYFIT: 'joyfit'` means "the standalone Joyfit sub-brand," while a `MainBrand`-style "whole JOYFIT family" concept would collide with it if both used the same string. The Banner feature had already solved an equivalent problem with a bespoke 6-member `BannerBrandId`; the draft proposed reusing it here too. This turned out to be unnecessary once implementation confirmed the category screen has no "brand overall" requirement.

**Alternatives considered**:

- Reuse the sibling Banner feature's `BannerBrandId` (6 members incl. `joyfit_all`) — the original plan; not used in the shipped version since no category needs a "brand overall" scope and pulling in a cross-feature type for members that are never exercised adds a dependency for no benefit.
- Relate `brand_enum` to the real Y-07 Brand master (`db.brands`, `BrandListItem`) instead — rejected; that table only has 2 rows (`joyfit`, `fit365`) and cannot represent the sub-brand-level distinctions (JOYFIT24, JoyfitYoga, JoyfitPlus) that FR-003/FR-006 require as separate, filterable values.

---

## Decision 6 — Category type is a 2-value English enum with a Japanese label map

**Decision**: `ArticleCategoryType = 'notice' | 'blog'`, with `ARTICLE_CATEGORY_TYPE_LABELS` mapping `notice → お知らせ` and `blog → ブログ`, following the `VisitExperienceStatus` / `VISIT_EXPERIENCE_STATUS_LABELS` convention.

**Rationale**: Constitution + existing precedent: English enum values as API/storage keys, Japanese labels display-only in the UI layer. The design file inlines the Japanese strings directly as TypeScript literal types (`"お知らせ" | "ブログ"`), but that is a prototype-only shortcut; every shipped feature in this repo (staff role/status, visit-experience status) keeps English keys with a separate label map.

**Alternatives considered**: Store the Japanese literal directly as the type's value (matching the prototype exactly) — rejected; breaks the established English-key/JP-label convention and would read awkwardly in query params (`?type=お知らせ`).

---

## Decision 7 — Delete mutation has no reason field; role/permission enforcement stays UI-only in Phase 1

**Decision**: `DELETE /api/crm/article-categories/{id}` takes no request body (unlike `DeleteStaffRequestSchema`, which requires `delete_reason`). Server-side role/permission checks are NOT added to the mock Route Handler; enforcement is via the client only — the "新規登録" button uses `RoleGatedButton` (`allowedRoles={[Headquarter, System]}`), while row-level "編集"/"削除" use `DataTableRowActions`' `permissions` prop gated on `Permission.ArticleCategoriesEdit`/`Permission.ArticleCategoriesDelete` (added to `src/types/permission.type.ts` / `src/constants/permission.constants.ts`) rather than `RoleGatedMenuItem`'s role-array form. Route-level access to `/article-categories`, `/create`, and `/:id/edit` is also gated via `PAGE_PERMISSIONS` using the same permission set.

**Rationale**: FR-009 and the mockup's delete `AlertDialog` require only a confirmation naming the impact — no reason textbox is present in the design (unlike the staff-delete flow, which is a different, already-shipped feature with its own reason requirement). Grepping every existing mock Route Handler in this repo (`src/app/api/crm/**/route.ts`) confirms none perform server-side role checks (`hasRole`/`requiredPermission` do not appear anywhere under `src/app/api`) — Phase 1 authorization is consistently UI-layer only across the whole codebase, deferred to the real backend in Phase 2.

**Alternatives considered**: Add a `delete_reason` field to match the staff-delete pattern — rejected; not present in spec or mockup, would be scope creep beyond FR-009.

---

## Decision 8 — `article_count` is computed from a new `ArticleCategoryMapping` join table, not stored; deletion reassigns mapping rows to a seeded "Unclassified" category

> Naming note: this decision predates Decision 10/11's field-naming cleanup. The concept described below shipped as the response field `articleCount` (camelCase) — see `data-model.md` for the exact wire shape.

**Decision**: `article_count` is **not** a field on the stored `ArticleCategory` entity. Instead, seed a new one-to-many join table, `ArticleCategoryMapping` (`{ article_id, category_id }`), with synthetic `article_id` values (no real `Article` entity exists yet — I-02 FR-001–FR-004 haven't been built). The list endpoint computes each category's `article_count` at response time by counting mapping rows where `category_id` matches. On delete, the mock handler updates all of the deleted category's mapping rows to point at a pre-seeded sentinel category (`CAT-000`, name "未分類" / Unclassified) instead of leaving them dangling or silently dropping them.

**Rationale**: This supersedes the earlier draft's Decision 8, which argued reassignment was infeasible because no `Article` entity existed. That reasoning no longer applies once a mapping table exists specifically to back `article_count` — reassigning its rows is now a one-line update, not a build-out of unscoped article CRUD. Leaving mapping rows pointing at a deleted `category_id` would be worse than doing nothing: it creates dangling foreign keys and silently breaks the `article_count` promise on every _other_ category shown correctly. Seeding the "Unclassified" fallback category is not new scope either — `spec.md`'s own Assumptions section already states "The 'Unclassified' fallback category... is assumed to already exist as a system default category," so this seed satisfies a scope boundary the spec had already drawn, rather than crossing it.

**Simplification accepted**: The seeded "Unclassified" category has a single `type` (`notice`) and receives reassigned mappings from both Notice and Blog categories regardless of type match. A real implementation would likely need one Unclassified category per type; introducing that split here was judged as unnecessary complexity for a Phase 1 mock whose only consumer of this data is the confirmation-dialog copy and the list's own `article_count` column — it does not affect any acceptance scenario in spec.md, since the mockup's `type` column render logic never looks at `article_count`'s destination.

**Alternatives considered**:

- Fabricate a minimal in-memory `articles` mock table with full article records solely to make the reassignment "real" — rejected; still out of scope for this list-only feature, and the mapping table already provides everything `article_count` and the reassignment behavior need without modeling article content, publish state, etc.
- Delete the mapping rows outright on category delete (matching the old Decision 8's "nothing to reassign" stance) — rejected now that a mapping table exists; this would silently contradict FR-009's explicit confirmation copy instead of fulfilling it.
- Leave mapping rows pointing at the now-deleted `category_id` — rejected; produces dangling references and incorrect `article_count` computation for a category that no longer exists.

---

## Decision 9 — Two placeholder stub routes + one placeholder parent route are required for navigation to resolve

**Decision**: Create minimal "coming soon" stub pages at `/article-categories/create`, `/article-categories/[id]/edit`, and `/announcements` (the I-02 parent list, referenced by the back-link).

**Rationale**: `001-visit-experience-list` established this exact precedent: "This route must exist so row click-through navigation resolves without a 404." FR-008 requires that Headquarter users can _initiate_ create/edit actions and FR-010 requires a working back-link; none of those three destination screens are built yet (they belong to other, unscoped I-02 requirements). A stub keeps the acceptance scenarios for FR-008/FR-010 verifiable (the action navigates somewhere real) without building out-of-scope functionality.

**Alternatives considered**: Leave `onClick` handlers as no-ops until the destination screens exist — rejected; FR-008's acceptance scenario explicitly requires that clicking "new category" (as Headquarter) "initiates the corresponding action," which a no-op does not satisfy, and would silently regress once the real destination is built if nothing marks the seam.

---

## Decision 10 — List response envelope uses `pagination` (singular) plus a separate top-level `count`

**Decision (superseded from the original draft below, updated 2026-07-09 to match what shipped)**: `GetArticleCategoriesResponse` is `{ items, pagination: { page, limit, totalItems, totalPages }, count }`.

**What actually shipped, and why it differs from the original plan**: The original draft called for `paginations` (plural) to satisfy an explicit one-off instruction, diverging intentionally from every sibling endpoint's `pagination` (singular). The shipped implementation instead uses `pagination` (singular), matching `GetBannersResponseSchema`/`staffs`/every other paginated mock endpoint in this codebase — the plural spelling was not carried into implementation. It also adds a field the original draft didn't have: a top-level `count` giving the _unfiltered_ total category count, used by the page header's "N件" badge, while `pagination.totalItems` remains the _filtered_ total used for the pagination summary and empty-state logic.

**Alternatives considered**: `paginations` (plural) — this was the original draft's decision; not what shipped. `total`/`total_pages` field names (matching the original draft) — shipped as `totalItems`/`totalPages` instead, matching the sibling `staffs` endpoint's naming.

---

## Decision 11 — No hand-written type file; every type is Zod-inferred and consumed via the generated client

**Decision (superseded from the original draft below, updated 2026-07-09 to match what shipped)**: There is no `src/types/api/article-category.type.ts`. All types (`ArticleCategoryType`, `ArticleCategory`, `ArticleCategoryMapping`, `ArticleCategoryResponseItem`, the query/response/delete-response shapes) are `z.infer<>`'d directly from `src/app/api/_schemas/article-category.schema.ts` for use inside Route Handlers, and consumed from the generated `src/lib/api/types.gen.ts` (e.g. `ArticleCategoryType`, `GetCrmArticleCategoriesResponse`) everywhere else, exactly like every other feature's generated-client types. `ARTICLE_CATEGORY_TYPE_LABELS` and display/badge-class maps live in `src/app/(private)/article-categories/_constants/article-category.constants.ts` — there is no `ARTICLE_CATEGORY_BRAND_LABELS` at all, since the brand column reuses the shared `BRAND_LABELS`/`<BrandBadge>` rather than a feature-local map (see Decision 5).

**What actually shipped, and why it differs from the original plan**: The original draft planned a hand-written type file as an intermediate artifact bridging the Zod schema and the not-yet-generated client, importing `BannerBrandId` to avoid redeclaring it. Once `BrandEnum` (an already-generated type, see Decision 5) replaced `BannerBrandId`, and once the OpenAPI-first codegen pipeline ran for this feature's routes, the intermediate hand file added no value that the Zod-inferred types plus generated client didn't already provide — so it was skipped rather than written and later left as vestigial documentation.

**Alternatives considered**: Write the hand file as originally planned, treating it as documentation even once superseded by codegen — rejected as an unnecessary extra file with no consumers once the generated client exists.

---

## Unresolved items

None. All clarifications were resolved through codebase precedent and the ratified constitution.
