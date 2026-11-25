# Implementation Plan: B-01 入退館管理 (Entry-Exit Management) — Phase 1 Baseline Activity View

**Branch**: `013-entry-exit-management` | **Date**: 2026-07-07 | **Spec**: [specs/013-entry-exit-management/spec.md](spec.md)
**Input**: Feature specification from `/specs/013-entry-exit-management/spec.md`

## Summary

Build the Phase 1 baseline of the B-01 screen as a new route (`/entry-exit`) that shows, without further navigation: the 5 most recent entry records and 5 most recent exit records side by side (with frequency and companion badges), an hourly entry-count chart, date/store scoping controls with a past-date indicator, and a non-modal Member Quick View panel opened by clicking any activity row. This is backed by a new mock-DB table (`entry_exit_logs`) and three new mock API routes, following this app's existing OpenAPI-first, React-Query, shadcn/ui conventions. No Phase 2 monitor features (KPI counters, in-building tab, notification panel) are implemented — per Q&A #1/#2 in spec.md, Phase 1 scope is exactly what the prototype already ships ungated, and Phase 2 is a future feature rather than a runtime toggle in this app (see research.md D7).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-explicit-any`)
**Primary Dependencies**: Next.js 16 (App Router), React 19, TanStack React Query 5, shadcn/ui (Radix/base-ui), lucide-react, Tailwind CSS v4, date-fns v4 (`ja` locale), Recharts via `src/components/ui/chart.tsx`
**Storage**: Phase 1 — in-memory mock DB under `src/app/api/_mock-db/` (new `entry_exit_logs` table, tables/types/seeds); Phase 2 — generated REST client via hey-api with zero application-code changes
**Target Platform**: Web CRM, desktop-focused (minimum supported viewport 768px, matching sibling detail/list pages)
**Project Type**: Single Next.js App Router project — frontend and mock backend co-located under `src/app`
**Performance Goals**: No feature-specific SLA in spec.md; match existing CRM list/detail page conventions — skeleton visible on first paint, no unbounded client-side aggregation (hourly chart is server-aggregated per research.md D5)
**Constraints**: No automated tests may be written (constitution "No Testing Policy" — absolute); no new npm dependencies (all required primitives already exist in `src/components/ui/`); no Phase-2 runtime toggle/dead code (research.md D7)
**Scale/Scope**: 1 route (`/entry-exit`), 3 mock API endpoints (activity list, hourly summary, quick-view), 1 new mock-db table, ~6 new page-local components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                                                    | Notes |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| I   | TypeScript Strictness  | ☑ All new types (`EntryExitLog`, `ActivityRow`, `MemberQuickView`, etc.) are explicit, derived from Zod schemas; no `any`/unnarrowed `unknown`                                                                           | PASS  |
| II  | OpenAPI-First          | ☑ New endpoints declared as Zod schemas under `_schemas/` before route implementation; Phase 1 uses mock DB; `generate-openapi` + `generate-api` run after routes land; no manual edits to `src/lib/api/`                | PASS  |
| III | Spec-Driven            | ☑ `spec.md` is complete; all 6 `[NEED CLARIFICATION]` markers resolved (checklist confirms); `plan.md` precedes `tasks.md`                                                                                               | PASS  |
| IV  | App Router & Simple UX | ☑ `page.tsx` is a Server Component shell; interactivity isolated to `_components/` client components with justified `"use client"`; shadcn/ui + Tailwind only; single screen, no modal/wizard flow, non-modal Sheet only | PASS  |
| V   | Simplicity & Min. Deps | ☑ No new npm packages — reuses `DataStateBoundary`, `Avatar`, `Skeleton`, `Sheet`, `Select`, `Popover`/`Calendar`, `ui/chart.tsx` already in the repo; no Phase-2 dead-code branches (research.md D7)                    | PASS  |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — research.md, data-model.md, and contracts/ remain aligned with all five principles; no new dependencies or abstractions were introduced during Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/013-entry-exit-management/
├── plan.md                                        # This file
├── research.md                                    # Phase 0 output
├── data-model.md                                  # Phase 1 output
├── quickstart.md                                  # Phase 1 output
├── contracts/
│   ├── get-entry-exit-logs.md
│   ├── get-entry-exit-hourly-summary.md
│   └── get-entry-exit-log-quick-view.md
├── checklists/
│   └── requirements.md
└── tasks.md                                       # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── crm/
│   │   │   └── entry-exit-logs/
│   │   │       ├── route.ts                       # NEW: GET list (direction, limit, date, store_id)
│   │   │       ├── hourly-summary/
│   │   │       │   └── route.ts                   # NEW: GET hourly counts
│   │   │       └── [id]/
│   │   │           └── quick-view/
│   │   │               └── route.ts                # NEW: GET Member Quick View payload
│   │   ├── _schemas/
│   │   │   └── entry-exit-log.schema.ts            # NEW: shared Zod request/response schemas
│   │   └── _mock-db/
│   │       ├── tables/
│   │       │   └── entry-exit-log.table.ts         # NEW: query/aggregate methods
│   │       ├── types/
│   │       │   └── entry-exit-logs.type.ts         # NEW: row + view-model types
│   │       └── seeds/
│   │           └── entry-exit-log.seed.ts          # NEW: seed data (see data-model.md Seed Requirements)
│   └── (private)/
│       └── entry-exit/
│           ├── page.tsx                            # NEW: Server Component page shell
│           ├── _hooks/
│           │   └── use-entry-exit-filters.hook.ts  # NEW: nuqs URL-state hook for date/store_id (matches sibling _hooks convention)
│           └── _components/
│               ├── entry-exit-header-controls.tsx  # NEW: date nav + store filter + historical badge (client)
│               ├── hourly-entry-chart.tsx           # NEW: Recharts wrapper (client) — fetches via generated `getCrmEntryExitLogsHourlySummaryOptions()` directly
│               ├── activity-table.tsx               # NEW: shared Entry/Exit table incl. DataStateBoundary (client) — fetches via generated `getCrmEntryExitLogsOptions()` directly
│               ├── entry-exit-badges.tsx            # NEW: frequency + companion badge components
│               └── member-quick-view-sheet.tsx      # NEW: non-modal Sheet panel (client) — fetches via generated `getCrmEntryExitLogsByIdQuickViewOptions()` directly
├── components/
│   └── ...                                         # Existing shared primitives reused (Avatar, Skeleton, DataStateBoundary, Sheet, Select, Popover, Calendar, chart)
└── lib/
    └── api/                                        # Phase 2 generated client target (no manual edits) —
                                                      # regenerate only after Phase 1 mock routes are complete:
                                                      # 1) npm run generate-openapi  2) npm run generate-api
```

**Structure Decision**: Single Next.js App Router project (this repo has no separate frontend/backend split — API routes and pages are co-located under `src/app`). Feature-local page components live under `(private)/entry-exit/_components/`; a feature-local `_hooks/` folder holds only the `nuqs` URL-state hook for date/store filters (matching the established convention — see research.md D11); the mock API and schema live under `api/crm/entry-exit-logs/` and `api/_schemas/`, matching the pattern already established by `011-studio-detail-page` and `010-training-equipment`.

**Implementation Order Note**: After finishing the Phase 1 mock API (`route.ts` files + schema + mock-db table/seed), immediately run `npm run generate-openapi` then `npm run generate-api` so `src/lib/api/` is refreshed. Components then call the generated `useQuery({ ...getCrmEntryExitLogsOptions(...) })`-style option factories directly — there is no custom data-fetching hook wrapper (see research.md D11).

## Phase 0: Research & Unknown Resolution

Research completed in [specs/013-entry-exit-management/research.md](research.md).

Resolved items:

- Activity row data is joined from the real `members` mock-db table, not duplicated as static UI constants (D1).
- Frequency badge / companion role stay hardcoded per Q&A #3/#4, but as seeded mock-db columns rather than a UI-only lookup (D2).
- Loading/Empty/Error states use this app's existing `DataStateBoundary` (`Loading`/`Empty`/`Error`) + `Skeleton`, superseding spec.md Q&A #6's prototype-derived component names (D3).
- Missing-avatar fallback uses the existing shadcn `Avatar`/`AvatarImage`/`AvatarFallback` (D4).
- Hourly chart is computed via a live aggregation endpoint, not a static array (D5).
- Member Quick View "recent visits" and "contact info" are computed from real data (log history + `members` record) rather than kept as hardcoded placeholders, since Q&A #3/#4's "hardcode mock data" resolution was specific to badges, not every panel field (D6).
- No `usePhase()`-equivalent toggle exists or is added in this app; Phase 2 branches are simply not implemented (D7).
- Store filter and date navigation reuse existing patterns already used elsewhere in this codebase (D8, D9).
- Implementation follows OpenAPI-first order: schemas → mock routes → `generate-openapi` → `generate-api` → components (D10).
- No `src/hooks/use-entry-exit-logs.hook.ts` wrapper — data fetching calls the generated React Query option factories directly in components, per this codebase's actual convention; only URL-synced filter state gets a feature-local `_hooks/` file (D11).

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/013-entry-exit-management/data-model.md](data-model.md)
- [specs/013-entry-exit-management/contracts/get-entry-exit-logs.md](contracts/get-entry-exit-logs.md)
- [specs/013-entry-exit-management/contracts/get-entry-exit-hourly-summary.md](contracts/get-entry-exit-hourly-summary.md)
- [specs/013-entry-exit-management/contracts/get-entry-exit-log-quick-view.md](contracts/get-entry-exit-log-quick-view.md)
- [specs/013-entry-exit-management/quickstart.md](quickstart.md)

Design highlights:

- `EntryExitLog` (persisted) vs. `ActivityRow`/`MemberQuickView` (response view-models joining `EntryExitLog` + `members`) keeps the mock DB normalized while matching what the UI needs to render.
- Two activity-table fetches (one per `direction`) rather than one combined feed, matching FR-B01-01's two-table layout exactly.
- Hourly summary and quick-view are separate, on-demand endpoints so the initial page load only fetches what's immediately visible (2 activity lists + 1 chart); the Quick View payload loads lazily on row click.
- Seed requirements explicitly cover every edge case already resolved in spec.md's Q&A/Edge Cases: zero-row empty state, missing avatar, orphaned exit (no duration), zero prior visits ("初回").

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
