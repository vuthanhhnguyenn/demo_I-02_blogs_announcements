# Implementation Plan: Y-09 Routine Master Management (ルーティン管理)

**Branch**: `016-routine-management` | **Date**: 2026-07-10 | **Spec**: [specs/016-routine-management/spec.md](spec.md)
**Input**: Feature specification from `/specs/016-routine-management/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a new top-level screen (`/routines`, `/routines/create`, `/routines/[id]`, `/routines/[id]/edit`) that lets Headquarter/System search, create, view, edit, publish/unpublish, duplicate, and logically delete HQ-curated training routines — each composed of an ordered list of published Y-08 exercises, each carrying its own set definitions (reps/weight/time/distance/RPE). This requires a new `routines` mock-db table (embedded `exercises[]`/`sets[]` arrays, matching this codebase's existing embedded-collection convention) plus a small read-only `routineCategories` reference table, five new mock API routes, five new granular permissions, and a new `(private)/routines/` route tree — all designed directly against the real Phase-2 backend contract (`backend-api.md`, provided for this feature) so the eventual generated-client swap is mechanical. Two real discrepancies between that backend contract and the already-approved UI-derived spec were found and are deliberately kept in spec's favor, not silently resolved: a required single-valued `brandEnum` with no UI selector (research.md R6), and a single-valued `thumbnailS3Key` vs. the spec's approved 5-image gallery (research.md R7) — both flagged for API-team follow-up before Phase 2 cut-over. No new npm dependencies; every UI/data pattern reuses conventions already established by the closely analogous Y-08 Exercise Master feature and sibling list/detail/form screens (`training-equipment`, `instructor-management`).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-explicit-any`)
**Primary Dependencies**: Next.js 16 (App Router), React 19, TanStack React Query 5, shadcn/ui (Radix/base-ui), react-hook-form + Zod, lucide-react, Tailwind CSS v4
**Storage**: Phase 1 — new in-memory mock-db tables under `src/app/api/_mock-db/` (`routines`, `routineCategories`; no reuse of an existing table, unlike some sibling features); Phase 2 — generated REST client via hey-api with zero application-code changes, designed directly against `backend-api.md`
**Target Platform**: Web CRM, desktop-focused (matches sibling Y-08/E-03/D-04 list/detail/form pages)
**Project Type**: Single Next.js App Router project — frontend and mock backend co-located under `src/app`
**Performance Goals**: No feature-specific SLA beyond `backend-api.md`'s documented NFRs (list/search p95 ≤ 1,000ms; CRUD p95 ≤ 500ms) — these are Phase 2 real-API targets, not meaningful for the Phase 1 in-memory mock; match existing CRM list-page conventions (server-side pagination/sorting/filtering, no unbounded client-side loads)
**Constraints**: No automated tests may be written (constitution "No Testing Policy" — absolute); no new npm dependencies (all required primitives — `RoleGatedButton`/`RoleGatedMenuItem`, `Empty`, `useUnsavedChanges`, shadcn/ui `Table`/`Pagination`/`Select`/`AlertDialog`/`Tabs` — already exist in the repo, per research.md R13); the exercise picker MUST reuse the existing `GET /api/crm/exercises?publishStatus=public` endpoint rather than introduce a parallel one (research.md R1)
**Scale/Scope**: 2 new mock-db tables (`routines`, `routineCategories`; no existing table extended), 8 new mock API endpoints (list/create/detail/edit/delete/publish-status/duplicate for routines + 1 read-only list for categories), 5 new permissions, 4 new page routes, ~10-12 new page-local components/hooks

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                                                                                                                                                                                                                   | Notes |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| I   | TypeScript Strictness  | ☑ All new types (`RoutineRecord`, `RoutineExercise`, `RoutineSet`, `RoutineCategoryRecord`, query/body/response schemas) are explicit, Zod-derived under `_schemas/`; no `any`/unnarrowed `unknown`                                                                                                                                                                                     | PASS  |
| II  | OpenAPI-First          | ☑ New endpoints declared as Zod schemas before route implementation; Phase 1 mock shape designed directly against `backend-api.md` (the real Phase-2 contract) per data-model.md; two schema discrepancies vs. that contract are surfaced, not silently patched over (research.md R6, R7); `generate-openapi` + `generate-api` run after routes land; no manual edits to `src/lib/api/` | PASS  |
| III | Spec-Driven            | ☑ `spec.md` is complete and approved; all Clarifications resolved (2026-07-10 session, 6 items); `plan.md` precedes `tasks.md`; the spec's approved multi-image thumbnail requirement is preserved even where it conflicts with the real backend doc discovered during planning (research.md R7), rather than silently narrowed                                                         | PASS  |
| IV  | App Router & Simple UX | ☑ `page.tsx` files are Server Component shells; interactivity isolated to `_components/` client components with justified `"use client"`; shadcn/ui + Tailwind only; single-page create/edit form (no wizard), per spec Clarifications                                                                                                                                                  | PASS  |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; reuses `RoleGatedButton`/`RoleGatedMenuItem`, `Empty`, `useUnsavedChanges`, and the existing Y-08 exercise-list endpoint for the picker (research.md R1, R13); no new shared/global component introduced                                                                                                                                                         | PASS  |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — `research.md`, `data-model.md`, and `contracts/` remain aligned with all five principles; no new dependencies or abstractions were introduced during Phase 0/1 design. The two flagged real-vs-spec discrepancies (R6 `brandEnum`, R7 thumbnail cardinality) are documented follow-ups, not unresolved `[NEEDS CLARIFICATION]` tokens — Principle III's gate is about the spec's own clarity, which is complete; these two items are implementation-detail gaps between an external API doc and the spec, appropriately resolved in the spec's favor per Constitution III ("no implementation task may begin before spec.md is approved" — the approved spec's FR-013 stands until the API team says otherwise).

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-routine-management/
├── plan.md                              # This file
├── research.md                          # Phase 0 output
├── data-model.md                        # Phase 1 output
├── quickstart.md                        # Phase 1 output
├── contracts/
│   ├── get-routines.md
│   ├── create-routine.md
│   ├── get-routine-detail.md
│   ├── update-routine.md
│   ├── delete-routine.md
│   ├── update-routine-publish-status.md
│   ├── duplicate-routine.md
│   └── get-routine-categories.md
├── checklists/
│   └── requirements.md
└── tasks.md                             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── crm/
│   │   │   ├── routines/
│   │   │   │   ├── route.ts                       # NEW: GET list / POST create
│   │   │   │   ├── [id]/route.ts                  # NEW: GET detail / PATCH edit / DELETE
│   │   │   │   ├── [id]/publish-status/route.ts   # NEW: PATCH publish/unpublish
│   │   │   │   └── [id]/duplicate/route.ts        # NEW: POST duplicate
│   │   │   └── routine-categories/
│   │   │       └── route.ts                       # NEW: GET read-only category list
│   │   ├── _schemas/
│   │   │   ├── routine.schema.ts                  # NEW: query/body/response Zod schemas
│   │   │   └── routine-category.schema.ts         # NEW
│   │   └── _mock-db/
│   │       ├── tables/
│   │       │   ├── routine.table.ts                # NEW
│   │       │   └── routine-category.table.ts       # NEW
│   │       ├── types/
│   │       │   ├── routines.type.ts                 # NEW
│   │       │   └── routine-categories.type.ts       # NEW
│   │       ├── seeds/
│   │       │   ├── routine.seed.ts                  # NEW
│   │       │   └── routine-category.seed.ts         # NEW
│   │       └── _create-db.ts                        # MODIFIED: wire in the two new tables
│   └── (private)/
│       └── routines/
│           ├── page.tsx                             # NEW: list (Server Component shell)
│           ├── create/page.tsx                      # NEW
│           ├── [id]/page.tsx                        # NEW: detail (tabs)
│           ├── [id]/_components/                     # detail-page-only (matches training-equipment/instructors/studios/brands convention)
│           │   ├── routine-detail-basic-info-tab.tsx
│           │   └── routine-detail-exercise-composition-tab.tsx
│           ├── [id]/edit/page.tsx                    # NEW
│           ├── _components/                          # shared across list/create/edit/detail-header
│           │   ├── routine-list-content.tsx
│           │   ├── routine-filters.tsx
│           │   ├── routine-table-columns.tsx
│           │   ├── routine-row-actions-menu.tsx
│           │   ├── routine-delete-dialog.tsx          # shared: used by both the list row menu and the detail page header
│           │   ├── routine-form.tsx                   # shared: used by both create/page.tsx and [id]/edit/page.tsx
│           │   ├── routine-form-basic-info-section.tsx
│           │   ├── routine-form-thumbnail-section.tsx
│           │   ├── routine-form-exercise-composition-section.tsx
│           │   ├── routine-form-exercise-row.tsx
│           │   └── routine-form-status-section.tsx
│           ├── _schemas/
│           │   └── routine-form.schema.ts             # Zod schema + inferred type + form<->API mappers
│           └── _hooks/
│               └── use-routine-filters.hook.ts       # nuqs URL-state (matches banners/lockers/training-equipment convention)
├── constants/
│   └── permission.constants.ts                       # MODIFIED: new PAGE_PERMISSIONS + ROLE_PERMISSIONS entries
├── types/
│   └── permission.type.ts                            # MODIFIED: new Permission.Routines{View,Create,Edit,Delete,Publish}
└── lib/
    └── api/                                           # Phase 2 generated client target (no manual edits) —
                                                          # regenerated after Phase 1 mock routes land:
                                                          # 1) npm run generate-openapi  2) npm run generate-api
```

**Structure Decision**: Single Next.js App Router project (no separate frontend/backend split). Routines get their own top-level `(private)/routines/` directory rather than nesting under an existing feature, since Y-09 is a standalone master-data screen with no natural parent route (research.md R12) — matching how `exercise-master`, `training-equipment`, and `instructors` are each rooted. No existing mock-db table is extended; `routines` and `routineCategories` are new tables, since no prior feature modeled this data. The exercise picker reuses the existing Y-08 `GET /api/crm/exercises` endpoint as-is (research.md R1) rather than adding a routine-scoped duplicate. Feature-local components/hooks follow the exact `_components`/`_hooks` co-location convention already used by every sibling list/detail/form screen: components used by exactly one route segment live under that segment's own `_components/` (e.g. the two detail-only tabs under `[id]/_components/`, mirroring `training-equipment`, `instructors`, `studios`, and `brands`), while components shared across two or more routes (list, create, edit, the detail-page delete dialog) stay in the feature's top-level `_components/`. Form state lives directly inside `routine-form.tsx` via `useForm`/`useFieldArray` rather than a separate `use-routine-form.hook.ts`, since the form has no logic that needs to be shared or tested independently of the component.

**Implementation Order Note**: Schemas → mock-db (tables/types/seeds, wired into `_create-db.ts`) → permissions → routes → `npm run generate-openapi && npm run generate-api` → UI (list → create/edit → detail) → `npm run generate-routes`. See `research.md`'s "Implementation order" section and `quickstart.md`'s checklist for the full ordered list.

## Phase 0: Research & Unknown Resolution

Research completed in [specs/016-routine-management/research.md](research.md).

Resolved items:

- Exercise picker reuses the existing Y-08 `GET /api/crm/exercises?publishStatus=public` endpoint — no new endpoint (R1).
- Routine composition modeled as nested `exercises[]`/`sets[]` arrays embedded on the `Routine` record, matching this codebase's embedded-collection convention, not a set of parallel relational mock tables (R2).
- Routine Category gets a minimal read-only reference table + `GET /api/crm/routine-categories` endpoint — category CRUD itself stays out of scope, confirmed absent from `backend-api.md` too (R3).
- ID scheme: internal `id` (`RT-###`) distinct from human-facing, immutable `routineCode` (`RT-#####`), mirroring `exercise.table.ts`'s `id`/`exerciseCode` dual-identifier precedent (R4).
- Equipment-based default set weight is keyed off the exercise's real `toolId → exerciseMasters(tool).code` (the actual 10-value Y-08 tool domain), not the UI prototype's disconnected 5-value ad-hoc enum (R5).
- `brandEnum`: required and single-valued in the real API, but absent from the entire UI prototype — defaulted to `'joyfit'` in Phase 1 and flagged as a genuine, unresolved gap for API-team follow-up, not silently invented or dropped (R6).
- Thumbnails: the real API's `backend-api.md` shows a single `thumbnailS3Key`, but the already-approved spec (derived from the UI prototype's 5-image gallery) requires `thumbnailS3Keys: string[]` (max 5) — kept as the spec requires, flagged as a gap for the same reason as R6 (R7).
- Publish/unpublish exposed as `PATCH /api/crm/routines/{id}/publish-status`, mirroring the Y-08 exercise's `[id]/publish-status/route.ts` sibling convention (R8).
- Duplicate exposed as `POST /api/crm/routines/{id}/duplicate` (R9).
- All mock error responses reuse `backend-api.md`'s literal error codes (`E-RTN-00x`, `E-VAL-001`, `E-AUTH-10x`) so Phase 2 cut-over doesn't change client-side error-handling logic (R10).
- Five new permissions (`Permission.Routines{View,Create,Edit,Delete,Publish}`) mirror the Y-08 `Exercises*` shape exactly, granted only to Headquarter (System already gets everything) — implementing spec FR-017/FR-018 (R11).
- New top-level `(private)/routines/` route tree, not nested under an existing feature (R12).
- Zero new shared/global components — everything needed already exists in the repo (R13).

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/016-routine-management/data-model.md](data-model.md)
- [specs/016-routine-management/contracts/get-routines.md](contracts/get-routines.md)
- [specs/016-routine-management/contracts/create-routine.md](contracts/create-routine.md)
- [specs/016-routine-management/contracts/get-routine-detail.md](contracts/get-routine-detail.md)
- [specs/016-routine-management/contracts/update-routine.md](contracts/update-routine.md)
- [specs/016-routine-management/contracts/delete-routine.md](contracts/delete-routine.md)
- [specs/016-routine-management/contracts/update-routine-publish-status.md](contracts/update-routine-publish-status.md)
- [specs/016-routine-management/contracts/duplicate-routine.md](contracts/duplicate-routine.md)
- [specs/016-routine-management/contracts/get-routine-categories.md](contracts/get-routine-categories.md)
- [specs/016-routine-management/quickstart.md](quickstart.md)

Design highlights:

- The mock DB's shape (fields, error codes, endpoint semantics) is designed directly against `backend-api.md` — the real Phase-2 contract — rather than reverse-engineered only from the UI prototype, so the eventual `hey-api` client-generation swap changes zero application code (Constitution II) for everything except the two flagged, surfaced gaps.
- `RoutineExercise.categoryName` is resolved from the linked Y-08 exercise's own `categoryId` (e.g. 胸, 背中, 二頭前腕) — confirmed by reading `exercise-master.seed.ts`'s `category` kind entries against `routine-detail.tsx`'s "targetCategory" badge values, which match exactly. This is a read-time join, never a field stored on the routine itself.
- The default-weight-on-add-exercise behavior is re-anchored to Y-08's real 10-value tool-master code domain (research.md R5's table) instead of perpetuating the UI prototype's invented, disconnected 5-value tool enum — this keeps Y-09 consistent with Y-08's actual schema rather than introducing a second, unsynced "tool type" concept.
- Two real discrepancies between `backend-api.md` and the already-approved spec were found and deliberately resolved in the spec's favor, with the resulting gap surfaced rather than hidden: `brandEnum` (required/single-valued in the real API, absent from the UI — R6) and thumbnail cardinality (single in the real API, 5-image gallery in the approved spec — R7). Both carry explicit "confirm with API/PO team before Phase 2" follow-ups in `research.md`, matching this repo's established practice (see feature 015's handling of its own discovered discrepancies) of surfacing gaps found during planning rather than quietly picking a side.
- Publish/unpublish and duplicate are modeled as dedicated sub-routes (`.../publish-status`, `.../duplicate`) rather than folded into the general edit route, preserving the distinct validation semantics each one needs (zero-exercise guard; forced-unpublished-on-copy) and matching the Y-08 sibling's existing `publish-status` sub-route shape.

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
