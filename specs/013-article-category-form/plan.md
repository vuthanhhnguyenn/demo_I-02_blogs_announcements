# Implementation Plan: Article Category Form (Notice & Blog Management)

**Branch**: `013-article-category-form` | **Date**: 2026-07-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/013-article-category-form/spec.md`

---

## Summary

Replace the two placeholder "coming soon" pages left by `013-article-category-master` — `/article-categories/create` and `/article-categories/[id]/edit` — with a real create/edit form for the `ArticleCategory` master entity (name, description, type, linked brand, display order, publish status). The form is a single `ArticleCategoryForm` client component (mode `"create" | "edit"`) built with `react-hook-form` + Zod, reusing the shipped `ArticleCategory` schema/table/seed from 013 and adding the two missing mutations (`POST /crm/article-categories`, `PATCH /crm/article-categories/{id}`) plus a `GET /crm/article-categories/{id}` single-item endpoint the edit page needs to pre-fill. Per the reference design (`article-category-form.tsx`) and the spec's explicit scope decision, this form has **no** confirmation-review dialog and **no** unsaved-changes discard guard — both patterns exist on sibling forms (`012-studio-create-edit`, `010-banner-form`) but are intentionally not replicated here; submit commits immediately on valid input. Route-level access control (redirecting Manager/Staff/Observer to `/403`) requires **no new code** — `013-article-category-master` already registered `/article-categories/create` → `Permission.ArticleCategoriesCreate` and `/article-categories/:id/edit` → `Permission.ArticleCategoriesEdit` in `PAGE_PERMISSIONS`, and only `Headquarter`/`System` hold those permissions in `ROLE_PERMISSIONS`, so the existing `proxy.ts` middleware already enforces FR-004 for these exact routes.

---

## Technical Context

**Language/Version**: TypeScript 5.x — strict mode, `no-explicit-any`
**Framework**: Next.js 16 — App Router only
**Primary Dependencies**: react-hook-form + Zod (`@hookform/resolvers/zod`), TanStack React Query 5, shadcn/ui (Radix), lucide-react, sonner (`toast`)
**Storage**: Phase 1 — in-memory mock via `src/app/api/_mock-db.ts` (extends the `articleCategories` table already created by 013), exposed through `hey-api`-generated React Query hooks per Principle II; Phase 2 — real REST API (not yet published)
**Target Platform**: Web — Headquarter/System-facing CRM (only these two roles can reach the route at all)
**Project Type**: Next.js web application (frontend + mock-backend monorepo, single project)
**Performance Goals**: Consistent with existing form pages — RSC page shell where possible, `'use client'` confined to the interactive form; no heavy imports on the critical path
**Constraints**: No direct `fetch` in components/hooks (must go through generated React Query option-factories); Japanese UI copy, English code identifiers; `any` banned in `src/`; no automated tests (see constitution "No Testing Policy")
**Scale/Scope**: 2 page routes replacing existing placeholders (no new routes), 1 new mock endpoint (`POST /crm/article-categories`) + 1 endpoint gaining two new methods (`GET`/`PATCH` added to the existing `[id]/route.ts` alongside its current `DELETE`), 2 new mock-table methods (`create`, `update`) on the already-existing `articleCategories` table, 0 new permission entries (fully covered by 013's `Permission.ArticleCategories{Create,Edit}` + existing `PAGE_PERMISSIONS`/`ROLE_PERMISSIONS`/`proxy.ts`), 1 new form component + Zod form schema + mapper

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                         | Notes                                                                                                                                                                                                                                                 |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent                                                                                            | Form values (`z.input`) and submit values (`z.output`) both `z.infer`'d from one `ArticleCategoryFormSchema`, matching `banner-form.schema.ts`'s pattern                                                                                              |
| II  | OpenAPI-First          | ☑ Phase 1 registers routes via `registerRoute()` → `generate-openapi` → `generate-api`; no manual `src/lib/api/` edits                                                        | New/changed endpoints declared in `_schemas/article-category.schema.ts` before route implementation; components consume generated `postCrmArticleCategoriesMutation` / `patchCrmArticleCategoriesByIdMutation` / `getCrmArticleCategoriesByIdOptions` |
| III | Spec-Driven            | ☑ `spec.md` approved; zero `[NEEDS CLARIFICATION]` tokens remain                                                                                                              | Checklist passed on first iteration; user-requested revisions (submit label, 403 redirect, brand options) folded into `spec.md` before this plan                                                                                                      |
| IV  | App Router & Simple UX | ☑ RSC by default; `"use client"` justified per interactive component; shadcn/ui + Tailwind only; shortest UX path                                                             | Per spec, no confirmation dialog and no discard-guard dialog — the shortest path from filled form to saved record, matching the reference design exactly                                                                                              |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; reuses `PageHeader`, `BackLink`, `RoleGatedButton` (kept for defence-in-depth even though route-level 403 already blocks access), existing `BrandEnum` | Only new code is the form component, its Zod schema/mapper, and the two missing mutation route handlers — no new abstraction layers                                                                                                                   |

No violations requiring justification.

---

## Project Structure

### Documentation (this feature)

```text
specs/013-article-category-form/
├── plan.md              ← this file
├── research.md          ← Phase 0 decisions
├── data-model.md         ← entity + form-value definitions
├── quickstart.md        ← developer setup & manual verification steps
└── contracts/
    ├── POST-article-categories.md
    ├── GET-article-categories-id.md
    └── PATCH-article-categories-id.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (private)/
│   │   └── article-categories/
│   │       ├── page.tsx                                       # unchanged (013 — list screen)
│   │       ├── create/
│   │       │   └── page.tsx                                    # REPLACED — was a "coming soon" placeholder; now renders <ArticleCategoryForm mode="create" />
│   │       ├── [id]/
│   │       │   └── edit/
│   │       │       └── page.tsx                                 # REPLACED — was a "coming soon" placeholder; now fetches the category via `getCrmArticleCategoriesByIdOptions` and renders <ArticleCategoryForm mode="edit" defaultValues=... categoryId={id} />
│   │       ├── _schemas/
│   │       │   ├── article-category-form.schema.ts              # Zod form schema (ArticleCategoryFormSchema) + FormValues/SubmitValues types + emptyArticleCategoryFormValues
│   │       │   └── article-category-form.mapper.ts              # articleCategoryFormValuesToCreateBody / ...ToUpdateBody + articleCategoryDetailToFormValues (edit prefill)
│   │       ├── _constants/
│   │       │   └── article-category.constants.ts                 # unchanged (013) — type/publish labels reused by the form's <Select>/<Switch> options
│   │       ├── _hooks/ (unchanged — list-only)
│   │       └── _components/
│   │           ├── article-category-table-columns.tsx           # unchanged (013)
│   │           ├── article-category-filters.tsx                 # unchanged (013)
│   │           ├── article-category-delete-action.tsx           # unchanged (013)
│   │           └── article-category-form/
│   │               ├── article-category-form.tsx                 # 'use client' — react-hook-form + zodResolver, single form (no section split needed — only 2 cards per design), no confirm/discard dialog
│   │               ├── article-category-form-skeleton.tsx        # loading skeleton shown while the edit page fetches the existing category
│   │               └── index.ts
│   └── api/
│       ├── _schemas/
│       │   └── article-category.schema.ts                       # EXTENDED — add CreateArticleCategoryBodySchema, UpdateArticleCategoryBodySchema (partial of create); POST/GET-by-id/PATCH all respond with the existing ArticleCategoryItemResponseSchema directly — no new response schemas
│       ├── _mock-db/
│       │   └── tables/article-category.table.ts                  # EXTENDED — add create(data): ArticleCategory and update(id, data): ArticleCategory | undefined to the existing articleCategories table object
│       └── crm/
│           └── article-categories/
│               ├── route.ts                                       # EXTENDED — add POST handler (existing GET untouched)
│               └── [id]/
│                   └── route.ts                                   # EXTENDED — add GET (single item) and PATCH handlers (existing DELETE untouched)
└── lib/
    └── api/                                                       # Re-generated by `npm run generate-openapi` + `npm run generate-api` (adds postCrmArticleCategoriesMutation, patchCrmArticleCategoriesByIdMutation, getCrmArticleCategoriesByIdOptions/QueryKey, CreateArticleCategoryBody, UpdateArticleCategoryBody, etc.)
```

No changes to `src/constants/permission.constants.ts`, `src/types/permission.type.ts`, `src/proxy.ts`, or `src/lib/routes/routes.config.ts` — the route patterns, permissions, and role grants this feature depends on already exist from 013. `RoleGatedButton` is still applied to the submit action as defence-in-depth (matching the reference design's own use of it), even though a non-Headquarter/System user can no longer reach the form to see it, per FR-004's route-level enforcement.

**Structure Decision**: Single Next.js App Router project (same pattern as `010-banner-form` and `012-studio-create-edit`). Feature files are co-located under the existing `(private)/article-categories/` directory established by 013; the form gets its own `_components/article-category-form/` + `_schemas/` subfolders following the `banners/_components/banner-form/` + `banners/_schemas/` precedent, simplified (single form file, no per-section split) because this form has only two cards and six fields versus banner's seven-section, image-upload, multi-brand form.

## Complexity Tracking

No constitution violations.

---

_Artifacts below are generated by the Phase 0 and Phase 1 steps of this plan._

- **research.md** → [research.md](./research.md)
- **data-model.md** → [data-model.md](./data-model.md)
- **contracts/** → [contracts/](./contracts/)
- **quickstart.md** → [quickstart.md](./quickstart.md)
