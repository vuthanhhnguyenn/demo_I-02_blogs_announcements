# Implementation Plan: App Version Management (Create/Edit Form)

**Branch**: `018-app-version-form` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/018-app-version-form/spec.md`

---

## Summary

Replace the two placeholder "coming soon" pages left by `016-app-version-management` — `/app-versions/create` and `/app-versions/[id]/edit` — with a real create/edit form for the `AppVersionRecord` entity (brand, iOS version name + build number, Android version name + build number, release date, remarks). The form is a single `AppVersionForm` client component (`mode: "create" | "edit"`), built with `react-hook-form` + Zod, reusing the shipped `AppVersionRecordSchema`/mock table/seed from `016-app-version-management` and `017-app-version-detail` and adding the two missing mutations (`POST /crm/app-versions`, `PATCH /crm/app-versions/{id}`) — the single-item `GET /crm/app-versions/{id}` the edit page needs to pre-fill already exists from `017-app-version-detail`. Per the reference design (`pages/app-version-form.tsx`) and the spec's Assumptions, this form has **no** confirmation-review dialog and **no** unsaved-changes discard guard — submit commits immediately on valid input, matching `013-article-category-form`'s explicit precedent rather than `012-studio-create-edit`/`010-banner-form`'s heavier pattern. Route-level access control (redirecting every role but System/Headquarters to `/403`) requires **no new code** — `016-app-version-management` already registered `/app-versions/create` → `Permission.AppVersionsCreate` and `/app-versions/:id/edit` → `Permission.AppVersionsEdit` in `PAGE_PERMISSIONS`, and only `Headquarter`/`System` hold those permissions, so the existing `proxy.ts` middleware already enforces spec FR-011 for these exact routes before any React code runs.

---

## Technical Context

**Language/Version**: TypeScript 5.x — strict mode, `no-explicit-any`
**Framework**: Next.js 16 — App Router only
**Primary Dependencies**: react-hook-form + Zod (`@hookform/resolvers/zod`), TanStack React Query 5, shadcn/ui (Radix), lucide-react, sonner (`toast`), date-fns v4
**Storage**: Phase 1 — in-memory mock via `src/app/api/_mock-db/` (extends the `appVersions` table already created by `016-app-version-management`), exposed through `hey-api`-generated React Query hooks per Principle II; Phase 2 — real REST API (not yet published)
**Target Platform**: Web — CRM screens reachable only by System/Headquarters (route-level guard already in place)
**Project Type**: Next.js web application (frontend + mock-backend monorepo, single project)
**Performance Goals**: Consistent with existing form pages — `'use client'` confined to the interactive form; mirrors `docs/api/Y-05.md`'s NFR of admin API p95 ≤ 500 ms
**Constraints**: No direct `fetch` in components/hooks (must go through generated React Query option-factories); Japanese UI copy, English code identifiers; `any` banned in `src/`; no automated tests (constitution "No Testing Policy")
**Scale/Scope**: 2 page routes replacing existing placeholders (no new routes), 1 new mock endpoint (`POST /crm/app-versions`) + 1 endpoint gaining a new `PATCH` method (added to the existing `[id]/route.ts` alongside its current `GET`/`DELETE`), 2 new mock-table methods (`create`, `update`) on the already-existing `appVersions` table, 0 new permission entries, 1 new form component + Zod form schema + mapper

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                         | Notes                                                                                                                                                                                 |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent                                                            | Form values (`z.input`) and submit values (`z.output`) both `z.infer`'d from one `AppVersionFormSchema`, matching `article-category-form.schema.ts`'s pattern                         |
| II  | OpenAPI-First          | ☑ Phase 1 registers routes via `registerRoute()` → `generate-openapi` → `generate-api`; no manual `src/lib/api/` edits                        | New endpoints declared in `_schemas/app-version.schema.ts` before route implementation; components consume generated `postCrmAppVersionsMutation` / `patchCrmAppVersionsByIdMutation` |
| III | Spec-Driven            | ☑ `spec.md` approved; zero `[NEEDS CLARIFICATION]` tokens remain                                                                              | Checklist passed; one self-consistency correction (User Story 3 / FR-011–013 permission framing) made during this planning pass, documented in the checklist notes                    |
| IV  | App Router & Simple UX | ☑ RSC by default; `"use client"` justified per interactive component; shadcn/ui + Tailwind only; shortest UX path                             | Per spec, no confirmation dialog and no discard-guard dialog — the shortest path from filled form to saved record, matching the reference design exactly                              |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; reuses `PageHeader`, `BackLink`, `RoleGatedButton`, `FormField` (common), `DatePicker`, existing `AppVersionBrandEnum` | Only new code is the form component, its Zod schema/mapper, and the missing mutation route handlers — no new abstraction layers                                                       |

No violations requiring justification.

---

## Project Structure

### Documentation (this feature)

```text
specs/018-app-version-form/
├── plan.md              ← this file
├── research.md          ← Phase 0 decisions
├── data-model.md        ← entity + form-value definitions
├── quickstart.md        ← developer setup & manual verification steps
├── checklists/
│   └── requirements.md
└── contracts/
    ├── POST-app-versions.md
    └── PATCH-app-versions-id.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (private)/
│   │   └── app-versions/
│   │       ├── page.tsx                                        # unchanged (016 — list screen)
│   │       ├── [id]/
│   │       │   ├── page.tsx                                     # unchanged (017 — detail screen)
│   │       │   └── edit/
│   │       │       └── page.tsx                                  # REPLACED — was a "準備中" placeholder; now fetches via `getCrmAppVersionsByIdOptions` and renders <AppVersionForm mode="edit" defaultValues=... versionId={id} />
│   │       ├── create/
│   │       │   └── page.tsx                                     # REPLACED — was a "準備中" placeholder; now renders <AppVersionForm mode="create" />
│   │       ├── _schemas/
│   │       │   ├── app-version-form.schema.ts                    # NEW — Zod form schema (AppVersionFormSchema) + FormValues/SubmitValues types + emptyAppVersionFormValues
│   │       │   └── app-version-form.mapper.ts                    # NEW — appVersionFormValuesToCreateBody / ...ToUpdateBody + appVersionRecordToFormValues (edit prefill)
│   │       ├── _constants/
│   │       │   └── app-version.constants.ts                      # unchanged (016) — APP_VERSION_BRAND_LABELS reused by the form's brand RadioGroup
│   │       └── _components/
│   │           ├── app-version-filters.tsx                       # unchanged (016)
│   │           ├── app-version-table-columns.tsx                 # unchanged (016)
│   │           ├── app-version-delete-dialog.tsx                 # unchanged (016)
│   │           ├── app-version-list-header-actions.tsx           # unchanged (016)
│   │           └── app-version-form/
│   │               ├── app-version-form.tsx                       # NEW, 'use client' — react-hook-form + zodResolver, single card (matches reference design's single-Card layout), no confirm/discard dialog
│   │               ├── app-version-form-skeleton.tsx               # NEW — loading skeleton shown while the edit page fetches the existing record
│   │               └── index.ts
│   └── api/
│       ├── _schemas/
│       │   └── app-version.schema.ts                             # EXTENDED — add CreateAppVersionBodySchema, UpdateAppVersionBodySchema (partial of create); POST/PATCH respond with the existing AppVersionRecordSchema directly — no new response schemas
│       ├── _mock-db/
│       │   └── tables/app-version.table.ts                       # EXTENDED — add create(data) and update(id, data) to the existing appVersions table object (alongside getList/getById/softDelete)
│       └── crm/
│           └── app-versions/
│               ├── route.ts                                       # EXTENDED — add POST handler (existing GET untouched)
│               └── [id]/
│                   └── route.ts                                   # EXTENDED — add PATCH handler (existing GET/DELETE untouched)
└── lib/
    └── api/                                                       # Re-generated by `npm run generate-routes` + `npm run generate-openapi` + `npm run generate-api` (adds postCrmAppVersionsMutation, patchCrmAppVersionsByIdMutation, CreateAppVersionBody, UpdateAppVersionBody, etc.)
```

No changes to `src/constants/permission.constants.ts`, `src/types/permission.type.ts`, `src/proxy.ts`, or `src/lib/routes/routes.config.ts` — the route patterns, permissions, and role grants this feature depends on already exist from `016-app-version-management` (confirmed: `/app-versions/create` and `/app-versions/[id]/edit` are already fully registered in `routes.config.ts`, and their `PAGE_PERMISSIONS` entries already point at `AppVersionsCreate`/`AppVersionsEdit`, held only by `System`/`Headquarter`). `RoleGatedButton` is still applied to the submit action as defence-in-depth (matching the reference design's own `allowedRoles={["Headquarter", "System"]}` usage), even though no other role can reach the form to see it, per spec FR-012.

**Structure Decision**: Single Next.js App Router project (same pattern as `013-article-category-form`). Feature files are co-located under the existing `(private)/app-versions/` directory established by `016-app-version-management`; the form gets its own `_components/app-version-form/` + `_schemas/` subfolders following the `article-categories/_components/article-category-form/` + `article-categories/_schemas/` precedent — one form component, one card (simpler than article-category's two-card layout, since the reference design has only a single "バージョン情報" card).

## Complexity Tracking

No constitution violations.

---

_Artifacts below are generated by the Phase 0 and Phase 1 steps of this plan._

- **research.md** → [research.md](./research.md)
- **data-model.md** → [data-model.md](./data-model.md)
- **contracts/** → [contracts/](./contracts/)
- **quickstart.md** → [quickstart.md](./quickstart.md)
