# Implementation Plan: D-04 Instructor Management

**Branch**: `014-instructor-management` | **Date**: 2026-07-07 | **Spec**: [specs/014-instructor-management/spec.md](spec.md)
**Input**: Feature specification from `/specs/014-instructor-management/spec.md`

## Summary

Implement full CRUD instructor management for D-04: a two-tab list (Studio Instructor / Personal Trainer) with search/filter/role-scoped visibility, a registration form and edit form sharing one `InstructorForm` component with role-scoped field editability, a detail page (basic info, buffer settings, CRM account link, status card, performance summary, assigned lessons, upcoming schedule) with a Change History tab, and Activate/Deactivate + guarded Delete actions. This extends the existing minimal `db.instructors` mock table and `GET /crm/instructors` route (currently used only by the D-01 lesson-scheduling instructor picker) additively, and adds new detail/mutation/history routes, following the pattern already established by `011-studio-detail-page` and `012-studio-create-edit`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4
**Storage**: Phase 1 — `src/app/api/_mock-db/` (table/type/seed pattern); Phase 2 — generated REST client via hey-api
**Target Platform**: Node.js ≥ 24.0.0, browser (web), desktop-focused (min viewport 768px)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: List/detail render with skeleton-first paint; filter/search feedback <200ms against in-memory mock data
**Constraints**: `GET /crm/instructors` is a live dependency of the D-01 lesson-scheduling instructor picker (generated client `getCrmInstructors`) — all changes to it must be additive/backward-compatible; role/data-scope and field-editability rules (FR-005, FR-015) must be enforced server-side in the mock route handlers, not only client-side gating
**Scale/Scope**: One list route (extended), one detail route, 4 new mutation/history routes, ~20 new UI components across list/detail/form; no new npm dependencies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                             |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | New types derived from Zod schemas in `instructor.schema.ts`, per [data-model.md](data-model.md)                  |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | All new endpoints registered via `registerRoute()` before use, same as existing routes                            |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | `spec.md` has no open `[NEEDS CLARIFICATION]` markers; open question D-Q09 (rating source) is explicitly deferred |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | List/detail pages RSC-shell + client data components (React Query); forms are `"use client"` (interactivity)      |
| V   | Simplicity & Min. Deps | ☒ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses `RoleGatedButton`, `useImageUpload`, existing staff-search endpoint, `StudioForm`/`LessonForm` conventions |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — research (item 6) deliberately closes a scoping gap present in the studios precedent rather than repeating it; no new violations introduced by the data model or contracts.

## Project Structure

### Documentation (this feature)

```text
specs/014-instructor-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── list-instructors.md
│   ├── instructor-detail.md
│   └── instructor-mutations.md
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
│   │   │   └── types/
│   │   │       └── instructors.type.ts             # [REWORK] full profile, buffer settings, CRM link,
│   │   │                                            #          status, change history, CRUD methods
│   │   ├── _schemas/
│   │   │   ├── instructor.schema.ts                # [NEW] full D-04 schemas (detail, mutations, history)
│   │   │   └── lesson-schedule.schema.ts           # [EXTEND] InstructorListItemSchema additive fields
│   │   └── crm/
│   │       └── instructors/
│   │           ├── route.ts                        # [EXTEND] GET (+ tab/search/brand/status params), [ADD] POST
│   │           └── [id]/
│   │               ├── route.ts                    # [NEW] GET (detail) / PUT (update) / DELETE
│   │               ├── status/
│   │               │   └── route.ts                # [NEW] PATCH (activate/deactivate)
│   │               └── history/
│   │                   └── route.ts                # [NEW] GET (change history)
│   └── (private)/
│       └── instructors/
│           ├── page.tsx                            # [NEW] list page (two tabs)
│           ├── create/
│           │   └── page.tsx                        # [NEW] registration form page
│           ├── [id]/
│           │   ├── page.tsx                        # [NEW] detail page
│           │   ├── edit/
│           │   │   └── page.tsx                    # [NEW] edit form page
│           │   └── _components/                    # [NEW] detail cards, status card, delete dialog,
│           │                                        #        history tab, upcoming-schedule sheet, skeleton
│           └── _components/                         # [NEW] tabs, search, filters, list section,
│                                                     #        instructor-form/ (shared create+edit form)
└── lib/
    └── utils/
        └── instructor-permissions.ts                # [NEW] role/data-scope + field-editability helper,
                                                       #        modeled after studio-permissions.ts
```

**Structure Decision**: Single Next.js App Router project, following the exact directory convention already used by `studios/` (`010-training-equipment` and `011-studio-detail-page`/`012-studio-create-edit`): route-local `_components/` per segment, a shared `instructor-form/` subfolder for the create+edit form, and mock persistence under `src/app/api/_mock-db/`. No new top-level directories or packages.

**Implementation Order Note**: Rework `instructors.type.ts` and extend the `GET /crm/instructors` route first (keeping it backward-compatible for the D-01 consumer — verify via the existing `getCrmInstructors` generated-client call site), then add the new detail/mutation/history routes, then build the list/detail/form UI. After all Phase 1 mock routes and Zod schemas are finalized, run `npm run generate-routes`, `npm run generate-openapi`, and `npm run generate-api` in that order (see [quickstart.md](quickstart.md)).

## Phase 0: Research & Unknown Resolution

Research completed in [specs/014-instructor-management/research.md](research.md).

Resolved items:

- Extend the existing `/crm/instructors` route additively rather than replacing it — it is a live D-01 dependency.
- `role_classifications` (Trainer/Instructor/Body-Care Therapist) is a distinct vocabulary from the CRM `StaffRole` permission enum.
- Brand is derived at read time from assigned schedules → studio → store, never stored on the instructor record.
- CRM account link picker reuses the existing `GET /crm/staffs?search=` endpoint — no new search endpoint.
- Performance summary aggregates existing lesson/reservation seed data; average rating is inert mock data pending D-Q09.
- Role-based data scope and field editability are enforced server-side in Phase 1 (closing a gap left open by the studios precedent).
- Delete guardrail (`assigned_schedule_count`) is re-validated server-side on every `DELETE`, not just disabled client-side.
- Status toggle is a dedicated `PATCH .../status` endpoint, separate from the full-edit `PUT` flow.
- Change history is stored as a per-instructor array on the mock table, mirroring the existing `brands.type.ts` pattern.

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/014-instructor-management/data-model.md](data-model.md)
- [specs/014-instructor-management/contracts/list-instructors.md](contracts/list-instructors.md)
- [specs/014-instructor-management/contracts/instructor-detail.md](contracts/instructor-detail.md)
- [specs/014-instructor-management/contracts/instructor-mutations.md](contracts/instructor-mutations.md)
- [specs/014-instructor-management/quickstart.md](quickstart.md)

Design highlights:

- `InstructorListItem` keeps all existing fields (`instructor_id`, `instructor_name`, `store_id`, `role`, `photo_url`) unchanged in meaning; new fields (`nickname`, `romaji_name`, `role_classifications`, `tab`, `brands`, `status`) are additive so the D-01 picker keeps compiling and working unmodified.
- Full `Instructor` detail aggregate mirrors the `011-studio-detail-page` `StudioDetail` pattern: one GET returns basic info + performance summary + assigned lessons + upcoming schedule in a single payload.
- `InstructorActionPermissions` matrix (data-model.md) is the single source of truth for both client-side `RoleGatedButton` gating and server-side route enforcement, avoiding drift between the two.
- Status toggle, delete-with-guard, and change-history endpoints each follow an existing precedent in the codebase (studio detail delete guard, brand change-history array) rather than inventing new patterns.

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
