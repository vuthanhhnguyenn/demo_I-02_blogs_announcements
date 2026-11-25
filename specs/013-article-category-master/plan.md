# Implementation Plan: Article Category Master List (Notice & Blog Management)

**Branch**: `013-article-category-master` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/013-article-category-master/spec.md`

---

## Summary

Build the Phase 1 UI and mock API for the article category master list screen (`/article-categories`), scoped to I-02 FR-009. Headquarter/Manager/Staff/Observer users can view, search, filter, and sort the master list of Notice/Blog categories; only Headquarter (or System) users can initiate create/edit/delete actions — enforced via dedicated `Permission.ArticleCategories*` entries plus role gating on the "new category" button — with delete gated behind a confirmation that states the impact on linked articles. Each category has an optional `brand_enum` relationship reusing the CRM's existing generated `BrandEnum` (not the sibling Banner feature's `BannerBrandId`, as an earlier draft planned — see `research.md` Decision 5); `articleCount` is not stored but computed per request from a new `ArticleCategoryMapping` join table, whose rows are reassigned to a seeded "Unclassified" category on delete. The category add/edit form itself is out of scope — this feature only builds the list screen and the navigation entry points into that (not-yet-built) form, using placeholder stub routes so navigation resolves without a 404. All data is backed by a Next.js Route Handler mock following the project's OpenAPI-first pipeline; real backend integration is deferred to Phase 2.

---

## Technical Context

**Language/Version**: TypeScript 5.x — strict mode, `no-explicit-any`
**Framework**: Next.js 16 — App Router only
**Primary Dependencies**: TanStack React Query 5, TanStack Table (via `DataTable`), shadcn/ui (Radix), nuqs, Zod, react-hook-form (not needed here — no form in scope), lucide-react
**Storage**: Phase 1 — in-memory mock via `src/app/api/_mock-db.ts`, exposed through `hey-api`-generated React Query hooks per Principle II; Phase 2 — real REST API (not yet published)
**Target Platform**: Web — Headquarter/Manager/Staff/Observer-facing CRM
**Project Type**: Next.js web application (frontend + mock-backend monorepo, single project)
**Performance Goals**: Consistent with existing list pages — RSC shell, `'use client'` only in interactive regions, no heavy imports on the critical path
**Constraints**: No direct `fetch` in components/hooks (must go through generated React Query option-factories); no raw hex/rgba colours; Japanese UI copy, English code identifiers; `any` banned in `src/`; no automated tests (see constitution "No Testing Policy")
**Scale/Scope**: 1 new list page route, 1 mock list endpoint + 1 mock delete endpoint, 2 minimal placeholder stub routes (create/edit) so button/menu navigation doesn't 404, 30 `ArticleCategory` seed records (incl. the `CAT-000` "Unclassified" fallback) spanning both types (Notice/Blog) and all 5 `BrandEnum` values, plus a seeded `ArticleCategoryMapping` join table backing the computed `articleCount`, plus 4 new `Permission.ArticleCategories*` entries gating page/route/row-action access

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                                                                     | Notes                                                                                                                                                                               |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent                                                                                                                                                        | New types are Zod-inferred directly in `_schemas/article-category.schema.ts` (no separate hand-written type file — see `research.md` Decision 11)                                   |
| II  | OpenAPI-First          | ☑ Phase 1 registers routes via `registerRoute()` → `generate-openapi` → `generate-api`; no manual `src/lib/api/` edits                                                                                                                    | New endpoints declared before implementation; components consume generated `getCrmArticleCategoriesOptions` / `deleteCrmArticleCategoriesByIdMutation`                              |
| III | Spec-Driven            | ☑ `spec.md` approved; zero `[NEEDS CLARIFICATION]` tokens remain                                                                                                                                                                          | Checklist passed on first iteration                                                                                                                                                 |
| IV  | App Router & Simple UX | ☑ RSC by default; `'use client'` justified per interactive component; shadcn/ui + Tailwind only; shortest UX path                                                                                                                         | List section and filters are client components (state + fetching); page shell is RSC                                                                                                |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; reuses `DataTable`, `TablePaginationWithSize`, `RoleGatedButton`, `DataTableRowActions`, `Empty`, `<BrandBadge>`, and the CRM's existing `BrandEnum`/`BrandEnumSchema` instead of inventing a duplicate brand enum | Only new code is feature-specific schemas/routes/components/permissions, following the `staffs`, `visit-experiences`, and `banners` precedents (see `research.md` Decisions 5 & 11) |

No violations requiring justification.

---

## Project Structure

### Documentation (this feature)

```text
specs/013-article-category-master/
├── plan.md              ← this file
├── research.md          ← Phase 0 decisions
├── data-model.md         ← entity definitions + field-level spec
├── quickstart.md        ← developer setup
├── contracts/
│   ├── GET-article-categories.md
│   └── DELETE-article-categories-id.md
└── tasks.md             ← /speckit.tasks output (not yet)
```

### Source Code (repository root) — as shipped

```text
src/
├── app/
│   ├── (private)/
│   │   └── article-categories/
│   │       ├── page.tsx                                   # 'use client' content + Suspense-wrapped default export: header, filters, table, pagination, delete dialog (no separate header/list-section files)
│   │       ├── create/
│   │       │   └── page.tsx                                # Placeholder stub — out-of-scope form target
│   │       ├── [id]/
│   │       │   └── edit/
│   │       │       └── page.tsx                            # Placeholder stub — out-of-scope form target
│   │       ├── _constants/
│   │       │   └── article-category.constants.ts           # Type/publish-status labels + badge classes, page-size options
│   │       ├── _hooks/
│   │       │   └── use-article-category-filters.ts          # nuqs-backed filter/sort/pagination state
│   │       └── _components/
│   │           ├── article-category-filters.tsx            # 'use client' — search + collapsible filter panel
│   │           ├── article-category-table-columns.tsx      # column defs incl. permission-gated actions cell (DataTableRowActions)
│   │           └── article-category-delete-action.tsx       # 'use client' — AlertDialog-driven delete mutation
│   └── api/
│       ├── _schemas/
│       │   └── article-category.schema.ts                  # Zod schemas — reuses BrandEnumSchema from brand.schema.ts (not BannerBrandId)
│       ├── _mock-db/
│       │   ├── types/article-categories.type.ts             # ArticleCategoriesType + ArticleCategoryMappingsType (table interfaces)
│       │   ├── seeds/article-category.seed.ts                # SEED_ARTICLE_CATEGORY_ROWS, SEED_ARTICLE_CATEGORY_MAPPINGS, UNCLASSIFIED_CATEGORY_ID (CAT-000)
│       │   └── tables/article-category.table.ts               # createArticleCategoryTables(), enrichArticleCategory()
│       └── crm/
│           └── article-categories/
│               ├── route.ts                                 # GET list (mock, registers OpenAPI route)
│               └── [id]/
│                   └── route.ts                              # DELETE — reassigns articleCategoryMappings to CAT-000, then removes the category
├── app/(private)/announcements/
│   └── page.tsx                                              # Placeholder stub — I-02 parent list (out of scope), needed so the back-link resolves
├── components/layout/app-sidebar.tsx                          # Adds a "コンテンツ" section linking to /announcements (no direct /article-categories link)
├── constants/permission.constants.ts                         # PAGE_PERMISSIONS + ROLE_PERMISSIONS entries for ArticleCategories{View,Create,Edit,Delete}
├── types/permission.type.ts                                   # Permission.ArticleCategories{View,Create,Edit,Delete}
└── lib/
    ├── routes/
    │   └── routes.config.ts                                  # Re-generated: adds /article-categories, /article-categories/create, /article-categories/[id]/edit, /announcements
    └── api/                                                   # Re-generated by `npm run generate-openapi` + `npm run generate-api` (adds getCrmArticleCategoriesOptions, deleteCrmArticleCategoriesByIdMutation, ArticleCategoryType/Sort, GetArticleCategoriesQueryParams, GetCrmArticleCategoriesResponse, etc.)
```

There is no hand-written `src/types/api/article-category.type.ts` — every type is Zod-inferred from the schema file and consumed via the generated client (see `research.md` Decision 11).

**Structure Decision**: Single Next.js App Router project (same pattern as `001-visit-experience-list` and the existing `staffs` feature). Feature files are co-located under `(private)/article-categories/`. Mock API lives alongside other CRM mocks in `src/app/api/crm/`. Two minimal stub routes (`/article-categories/create`, `/article-categories/[id]/edit`) and one stub parent route (`/announcements`) are created purely so that in-scope navigation actions (new/edit buttons, back-link) resolve without a 404 — none of the three renders anything beyond a "coming soon" placeholder, and none is a functional requirement of this feature.

## Complexity Tracking

No constitution violations.

---

_Artifacts below are generated by the Phase 0 and Phase 1 steps of this plan._

- **research.md** → [research.md](./research.md)
- **data-model.md** → [data-model.md](./data-model.md)
- **contracts/** → [contracts/](./contracts/)
- **quickstart.md** → [quickstart.md](./quickstart.md)
