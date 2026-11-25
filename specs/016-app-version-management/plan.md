# Implementation Plan: Y-05 App Version Management (List Screen)

**Branch**: `016-app-version-management` | **Date**: 2026-07-13 | **Spec**: [specs/016-app-version-management/spec.md](spec.md)
**Input**: Feature specification from `/specs/016-app-version-management/spec.md`

## Summary

Implement the Y-05 App Version Management **list screen only**: a paginated, brand-filterable table of app version records (iOS/Android version + build, release date, remarks, audit fields), with role-gated "New Registration"/Edit/Delete controls that are visible-but-disabled for Manager/Staff/Observer, a delete confirmation dialog, and full page-level 403 enforcement — for the Trainer role on the list itself, and for non-managing roles on the create/edit URLs even though those screens' real UI is a separate future feature. This follows the exact pattern already established by `010-banner-list`/banners (list + brand filter + role-gated mutation controls + `RoleGatedButton`/`DataTableRowActions`) and `014-instructor-management` (permission-matrix-as-single-source-of-truth), adding one new mock table + one new `GET` route + a handful of new `Permission` entries — no new shared components, no new dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, TanStack Table (via the shared `DataTable`), Zod, lucide-react, Tailwind CSS v4, `nuqs` (URL filter state)
**Storage**: Phase 1 — `src/app/api/_mock-db/` (table/type/seed pattern, matching `banners`/`training-equipment`); Phase 2 — generated REST client via hey-api, zero application-code changes
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: List render/filter-change <1s for 95% of loads (spec SC-003); mirrors the `docs/api/Y-05.md` NFR of admin API p95 ≤ 500ms
**Constraints**: Create/edit/detail screens are out of scope for this feature (separate future feature) but their routes must still exist and 403 correctly for unauthorized roles per spec FR-013 (see [research.md §5](research.md#5-satisfying-403-on-direct-url-access-for-out-of-scope-createedit-screens-fr-013)); restricted controls must render visible-but-disabled, never hidden, per spec FR-007–FR-010
**Scale/Scope**: Two new routes (`GET /crm/app-versions`, `DELETE /crm/app-versions/{id}`), one new mock table, ~4 new `Permission` entries, one list page + ~4 small components/hooks, 3 minimal placeholder stub pages (create/edit/detail) for route-level 403 enforcement; no new npm dependencies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                                                                                       |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | New types derived from Zod schemas in `app-version.schema.ts`, per [data-model.md](data-model.md)                                                                           |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | New `GET /crm/app-versions` and `DELETE /crm/app-versions/{id}` both registered via `registerRoute()` before use, per [contracts/](contracts/)                              |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | `spec.md` + its checklist have no open `[NEEDS CLARIFICATION]` markers                                                                                                      |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | List page follows the `banners/page.tsx` client-component shell (interactive table/filters/dialog); no wizard, single card, one confirm dialog                              |
| V   | Simplicity & Min. Deps | ☒ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses `DataTable`, `DataTableRowActions`, `RoleGatedButton`, `TablePaginationWithSize`, `Empty`, `PageHeader`, `AlertDialog` — zero new shared components (research.md §6) |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — the only design decision with any friction (stub create/edit/detail pages to satisfy FR-013's 403 requirement) is a minimal, existing-pattern-consistent addition, not a new abstraction; no new violations introduced by the data model or contract.

## Project Structure

### Documentation (this feature)

```text
specs/016-app-version-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md         # Phase 1 output (/speckit.plan command)
├── contracts/            # Phase 1 output (/speckit.plan command)
│   └── list-app-versions.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   ├── tables/
│   │   │   │   └── app-version.table.ts        # [NEW] getList, softDelete (deletedAt-based)
│   │   │   ├── seeds/
│   │   │   │   └── app-version.seed.ts         # [NEW]
│   │   │   ├── types/
│   │   │   │   └── app-versions.type.ts        # [NEW]
│   │   │   └── _create-db.ts                   # [EXTEND] register table + seed call
│   │   ├── _schemas/
│   │   │   └── app-version.schema.ts           # [NEW] AppVersionBrandEnumSchema (dedicated 2-value
│   │   │                                        #       enum, distinct from shared BrandEnumSchema),
│   │   │                                        #       list query/response schemas
│   │   ├── _routes/
│   │   │   └── index.ts                        # [EXTEND] import new route file
│   │   └── crm/
│   │       └── app-versions/
│   │           ├── route.ts                    # [NEW] GET (list)
│   │           └── [id]/
│   │               └── route.ts                # [NEW] DELETE only (soft delete)
│   └── (private)/
│       └── app-versions/
│           ├── page.tsx                        # [NEW] list page
│           ├── create/
│           │   └── page.tsx                    # [NEW] placeholder stub — 403-gated, real form is a
│           │                                    #       separate future feature (FR-013)
│           ├── [id]/
│           │   ├── page.tsx                    # [NEW] placeholder stub — view-permission gated only
│           │   └── edit/
│           │       └── page.tsx                # [NEW] placeholder stub — 403-gated (FR-013)
│           ├── _components/
│           │   ├── app-version-list-header-actions.tsx  # [NEW] "New Registration" RoleGatedButton
│           │   ├── app-version-table-columns.tsx        # [NEW] columns + DataTableRowActions
│           │   ├── app-version-delete-dialog.tsx        # [NEW] confirm dialog
│           │   └── app-version-filters.tsx              # [NEW] brand Select
│           └── _hooks/
│               └── use-app-versions-filters.ts          # [NEW] nuqs page/limit/brandEnum state
├── constants/
│   └── permission.constants.ts                 # [EXTEND] PAGE_PERMISSIONS + ROLE_PERMISSIONS entries
│                                                #          for AppVersionsView/Create/Edit/Delete
└── types/
    └── permission.type.ts                      # [EXTEND] 4 new Permission enum entries
```

**Structure Decision**: Single Next.js App Router project, following the exact directory convention already used by `banners/` (`010-banner-list`): route-local `_components/`/`_hooks/`, mock persistence under `src/app/api/_mock-db/`, one Zod schema file per resource under `_schemas/`. No new top-level directories, no new packages. The only deviation from a "pure list-screen" feature is the addition of three minimal placeholder pages (`create/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`) — these exist solely to give the router real route entries so `src/proxy.ts`'s existing role check can 403 them per spec FR-013; they are not the create/edit/detail feature itself, which remains out of scope and will be built by a later feature that replaces these placeholders' content.

**Implementation Order Note**: Wire permissions first (`permission.type.ts` + `permission.constants.ts`), then the schema + mock table + seed, then the `GET /crm/app-versions` route, then the list page UI, then the three placeholder stub pages last (they only need to exist and carry the right `PAGE_PERMISSIONS` entry). After all Phase 1 mock routes and Zod schemas are finalized, run `npm run generate-routes`, `npm run generate-openapi`, and `npm run generate-api` in that order (see [quickstart.md](quickstart.md)).

## Phase 0: Research & Unknown Resolution

Research completed in [specs/016-app-version-management/research.md](research.md).

Resolved items:

- List endpoint lives at `/crm/app-versions` (project convention), not the PO doc's literal `/app-versions`; response shape is unchanged either way.
- Brand values for this feature are a dedicated 2-value `Joyfit`/`Fit365` enum, distinct from the shared 5-value sub-brand-aware `BrandEnumSchema` used elsewhere.
- Soft delete uses a `deletedAt: string | null` timestamp field (matching the PO doc's literal "`deleted_at IS NOT NULL`" business rule), not a boolean flag; the delete action gets its own `DELETE /crm/app-versions/{id}` route (mirroring `banners/[id]/route.ts`) since the feature's own spec requires it to actually work even though the PO API doc only covers List.
- Permission model follows the established per-resource `Permission` enum + `PAGE_PERMISSIONS`/`ROLE_PERMISSIONS` convention — four new entries (View/Create/Edit/Delete), not `allowedRoles`.
- FR-013 ("403 on direct URL access to create/edit") requires the create/edit (and detail, for row-click) routes to physically exist as placeholder pages, since `routes.config.ts` is generated only from actual `page.tsx` files and a nonexistent route never reaches `src/proxy.ts`'s role check.
- The entire list UI is buildable from existing shared components (`DataTable`, `DataTableRowActions`, `RoleGatedButton`, `TablePaginationWithSize`, `Empty`, `PageHeader`) with zero new shared components — `banners/page.tsx` is the closest structural precedent.

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/016-app-version-management/data-model.md](data-model.md)
- [specs/016-app-version-management/contracts/list-app-versions.md](contracts/list-app-versions.md)
- [specs/016-app-version-management/contracts/delete-app-version.md](contracts/delete-app-version.md)
- [specs/016-app-version-management/quickstart.md](quickstart.md)

Design highlights:

- `AppVersionActionPermissions` matrix (data-model.md) is the single source of truth for both client-side `RoleGatedButton`/`DataTableRowActions` gating and the server-side `PAGE_PERMISSIONS` route guard, avoiding drift between the two — same approach as `InstructorActionPermissions` in `014-instructor-management`.
- The list response envelope (`items` + `pagination: { page, limit, totalItems, totalPages }`) is taken directly from `docs/api/Y-05.md` with no shape changes, only a path-prefix adaptation to this project's `/crm/*` convention.
- `docs/api/Y-05.md` only documents the List endpoint, but this feature's own spec (FR-009/SC-004) requires delete to actually work — a minimal `DELETE /crm/app-versions/{id}` (auth/soft-delete/404 behavior following `banners/[id]/route.ts`, but returning `204 No Content` on success rather than a message/id body) closes that gap without inventing anything belonging to the out-of-scope create/edit feature (research.md §3).
- Three placeholder stub pages close the FR-013 gap (403 on direct URL access to out-of-scope screens) without building any part of the actual create/edit/detail feature — the minimum viable route-existence needed for the existing `src/proxy.ts` mechanism to work.

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
