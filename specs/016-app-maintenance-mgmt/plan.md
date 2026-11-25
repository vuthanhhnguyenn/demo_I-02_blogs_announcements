# Implementation Plan: Y-06 App Maintenance Management

**Branch**: `016-app-maintenance-mgmt` | **Date**: 2026-07-10 | **Spec**: [specs/016-app-maintenance-mgmt/spec.md](spec.md)
**Input**: Feature specification from `/specs/016-app-maintenance-mgmt/spec.md`

## Summary

Implement CRUD management of mobile-app maintenance windows for Y-06: a filterable/sortable/paginated list (brand, status, date range, message), a create form, and an edit form (brand immutable, start-datetime locked while in progress), plus role-gated delete (blocked while in progress). Grounded on the UI prototype (`app-maintenance-list.tsx`/`app-maintenance-form.tsx`) and the reference backend API design, reconciled via `/speckit.clarify` (see spec.md's Clarifications). Follows the existing `banners` feature's mock-DB/route/schema shape (start/end range + derived, never-stored status) most closely, with real request-based authorization (`getAuthUserFromRequest`) rather than banners' hardcoded-mock-role shortcut, since FR-014 is a deliberate, resolved security rule (System-only writes, Headquarter read-only).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4
**Storage**: Phase 1 — `src/app/api/_mock-db/` (table/type/seed pattern, modeled on `banners`); Phase 2 — generated REST client via hey-api
**Target Platform**: Node.js ≥ 24.0.0, browser (web), desktop-focused (min viewport 768px)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: List/filter/search feedback <200ms against in-memory mock data (6-row seed; no realistic scale concern — reference API design's own NFR calls this "tens of rows")
**Constraints**: Role check (`System`+`Headquarter` writes, all roles except `Trainer` read — updated 2026-07-23 per the Y-06 v2 権限マトリクス, superseding the original `System`-only-writes / `System`+`Headquarter`-reads rule; see FR-014) MUST be enforced server-side via `getAuthUserFromRequest` in every route handler, not only client-side `RoleGatedButton`/`RoleGatedMenuItem` gating (FR-014, resolved via `/speckit.clarify`); brand-scoped period-overlap and in-progress edit/delete locks (FR-010–012) MUST be enforced in the mock table's `create`/`update`/`delete` methods, not only client-side
**Scale/Scope**: One list route (`GET /crm/app-maintenances`), one create route (`POST`, same path), one detail/update/delete route (`GET`/`PATCH`/`DELETE /crm/app-maintenances/{id}`), 3 pages (list, create, edit) + ~6–8 route-local components; no new npm dependencies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                                                                                                                           |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | Types derived from Zod schemas in `app-maintenance.schema.ts`, per [data-model.md](data-model.md)                                                                                                               |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | New routes registered via `registerRoute()` before use, same as existing routes; Phase 2 swap is a follow-up, not this plan                                                                                     |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | Zero `[NEEDS CLARIFICATION]` markers remain in spec.md (5 resolved via `/speckit.clarify`); 2 low-impact open Q&A items (Q4, Q7) have planning-time defaults applied, see [research.md](research.md) §8         |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | List page RSC-shell + client data/table component (React Query); create/edit forms are `"use client"` (interactivity, react-hook-form)                                                                          |
| V   | Simplicity & Min. Deps | ☒ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses `RoleGatedButton`/`RoleGatedMenuItem`, existing `banners` table/route shape, `lessons`' narrow brand-enum precedent; no new `Permission` enum entries needed (role check is a single literal comparison) |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — Phase 1 design (data-model.md, contracts/) introduces no new dependency, no abstraction beyond the `banners`/`entry-exit-logs` precedents it's modeled on, and resolves rather than defers every FR-012 validation/lock rule server-side.

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-app-maintenance-mgmt/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── list-app-maintenances.md
│   ├── app-maintenance-detail.md
│   └── app-maintenance-mutations.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   ├── _db.types.ts                          # [EXTEND] register `appMaintenances` table type
│   │   │   ├── _create-db.ts                          # [EXTEND] wire createAppMaintenanceTables()
│   │   │   ├── types/
│   │   │   │   └── app-maintenance.type.ts            # [NEW] AppMaintenanceRow + table interface
│   │   │   ├── tables/
│   │   │   │   └── app-maintenance.table.ts           # [NEW] computeStatus, overlap check, CRUD + locks
│   │   │   └── seeds/
│   │   │       └── app-maintenance.seed.ts            # [NEW] 6-row seed (see data-model.md)
│   │   ├── _schemas/
│   │   │   └── app-maintenance.schema.ts               # [NEW] row/query/create/update/response schemas
│   │   ├── _routes/
│   │   │   └── index.ts                                 # [EXTEND] import new route files
│   │   └── crm/
│   │       └── app-maintenances/
│   │           ├── route.ts                             # [NEW] GET (list) / POST (create)
│   │           └── [id]/
│   │               └── route.ts                         # [NEW] GET (detail) / PATCH (update) / DELETE
│   └── (private)/
│       └── app-maintenance/
│           ├── page.tsx                                  # [NEW] list page
│           ├── create/
│           │   └── page.tsx                              # [NEW] registration form page
│           ├── [id]/
│           │   └── edit/
│           │       └── page.tsx                          # [NEW] edit form page
│           ├── _components/                              # [NEW] list-section, filters, app-maintenance-form/
│           │                                              #        (shared create+edit form), delete-dialog
│           ├── _constants/                                # [NEW] APP_MAINTENANCE_BRAND_LABELS, status labels,
│           │                                              #        page-size options
│           ├── _hooks/                                    # [NEW] use-app-maintenance-filters.ts
│           └── _schemas/                                   # [NEW] react-hook-form + Zod schema for FR-012
│                                                            #        client-side validation
└── components/
    └── common/
        ├── role-gated-button.tsx                          # [REUSE, no change] gates "New Registration"/"Edit"
        └── role-gated-menu-item.tsx                        # [REUSE, no change] gates "Delete" row-menu item
```

**Structure Decision**: Single Next.js App Router project. Directory-per-feature convention under `src/app/(private)/app-maintenance/` mirrors `banners` exactly (list + `create/` + `[id]/edit/`, no detail page — matches spec's scope, which has no standalone detail screen). Mock persistence under `src/app/api/_mock-db/`, modeled on `banners`' type/table/seed split (research.md §1). No new top-level directories, no new npm packages.

**Implementation Order Note**: Write `app-maintenance.schema.ts` → `app-maintenance.type.ts`/`.table.ts`/`.seed.ts` → wire into `_db.types.ts`/`_create-db.ts` → write `route.ts` + `[id]/route.ts` with `registerRoute()` calls → add import to `_routes/index.ts` → run `npm run generate-openapi` then `npm run generate-api` → build list/create/edit UI consuming the generated `@tanstack/react-query.gen` hooks (see [quickstart.md](quickstart.md)). This order lets each layer be manually curl-tested against `contracts/*.md` before any UI is built on top of it.

## Phase 0: Research & Unknown Resolution

Research completed in [specs/016-app-maintenance-mgmt/research.md](research.md).

Resolved items:

- Model the mock table/schema/routes on `banners` (start/end range + derived, never-stored status), not `instructors`/`entry-exit-logs`.
- Row schema is snake_case, request/response schemas are camelCase — matches every existing `_schemas/*.schema.ts` file.
- ID format `AM-{NNN}`, matching the UI prototype's own sample IDs.
- Real request-based authorization (`getAuthUserFromRequest` + explicit role check on writes — `role !== 'System' && role !== 'Headquarter'` after the 2026-07-23 Y-06 v2 update; originally `role !== 'System'`), not the older hardcoded-mock-role shortcut — because FR-014 is a deliberate, resolved security rule.
- Target brand is a dedicated narrow `'joyfit' | 'fit365'` enum (the `lessons` feature's precedent), not the existing 5-value `BrandEnumSchema`.
- Overlap-conflict and in-progress edit/delete locks are enforced only server-side, in the mock table's `create`/`update`/`delete` methods, surfacing a generic error message (no conflict-detail UI, per resolved Q6).
- Two low-impact open items left in spec.md (Q4: brand immutable after creation; Q7: optional `note` field) resolved to planning-time defaults — see research.md §8 — carrying no risk of exceeding what the backend design allows.

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/016-app-maintenance-mgmt/data-model.md](data-model.md)
- [specs/016-app-maintenance-mgmt/contracts/list-app-maintenances.md](contracts/list-app-maintenances.md)
- [specs/016-app-maintenance-mgmt/contracts/app-maintenance-detail.md](contracts/app-maintenance-detail.md)
- [specs/016-app-maintenance-mgmt/contracts/app-maintenance-mutations.md](contracts/app-maintenance-mutations.md)
- [specs/016-app-maintenance-mgmt/quickstart.md](quickstart.md)

Design highlights:

- `status` (`planned`/`in_progress`/`completed`) is computed at read time from `now()` vs. `starts_at`/`ends_at`, never accepted on a request schema and never stored on the row — directly implements FR-007 and mirrors `banners`' `computeStatus()`.
- `UpdateAppMaintenanceBodySchema` has no `targetBrand` field at all (not merely an ignored one) — the strictest, lowest-risk encoding of the resolved brand-immutability rule.
- The table layer's `update()`/`delete()` return discriminated sentinels (`'not_found' | 'start_locked' | 'period_conflict' | ...`), mirroring `instructors.delete()`'s existing convention, so FR-010/FR-011's locks live in one place and the route handlers stay thin HTTP translators.
- Seed data intentionally does **not** reuse the UI prototype's literal (now-past) dates — seeded relative to `now()` so the set always contains a `completed`, a `planned`, and one deliberately `in_progress` row for manual QA (data-model.md's seed table).

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
