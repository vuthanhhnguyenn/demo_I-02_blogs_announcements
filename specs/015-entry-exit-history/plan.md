# Implementation Plan: Entry/Exit History (B-01-01)

**Branch**: `015-entry-exit-history` | **Date**: 2026-07-08 | **Spec**: [specs/015-entry-exit-history/spec.md](spec.md)
**Input**: Feature specification from `/specs/015-entry-exit-history/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a new route (`/entry-exit/history`, nested under the already-shipped Phase-2 monitor's `entry-exit` feature) that lets Headquarter/Manager/System/Observer (and, once explicitly granted, Staff) search, filter, and CSV-export past entry/exit visit records — completed, still in-progress, or denied — scoped to the stores they're authorized to see, with a row-click detail panel reusing the existing Member Quick View sheet. This requires extending the existing `entry_exit_logs` mock-db table (feature 013) with `auth_method`/`result` fields and a new visit-pairing query, adding two new permissions enforced via this app's existing route-level permission gate, and fixing a pre-existing gap where `Observer` incorrectly gets zero store access. No new npm dependencies; every UI/data pattern reuses conventions already established by sibling list screens (`banners`, `lockers/pending`) and the sibling `entry-exit` feature itself.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-explicit-any`)
**Primary Dependencies**: Next.js 16 (App Router), React 19, TanStack React Query 5, shadcn/ui (Radix/base-ui), lucide-react, Tailwind CSS v4, date-fns v4 (`ja` locale), `nuqs` (URL filter state)
**Storage**: Phase 1 — in-memory mock DB under `src/app/api/_mock-db/` (extends the existing `entry_exit_logs` table from feature 013; no new table); Phase 2 — generated REST client via hey-api with zero application-code changes
**Target Platform**: Web CRM, desktop-focused (minimum supported viewport 768px, matching sibling detail/list pages)
**Project Type**: Single Next.js App Router project — frontend and mock backend co-located under `src/app`
**Performance Goals**: No feature-specific SLA in spec.md beyond SC-001 ("locate a record in under 30 seconds" — a UX/workflow target, not a system latency target); match existing CRM list-page conventions (server-side pagination/sorting/filtering, no unbounded client-side data loads)
**Constraints**: No automated tests may be written (constitution "No Testing Policy" — absolute); no new npm dependencies (all required primitives — `DataTable`, `Empty`, `RoleGatedButton`, `nuqs`, `_lib/csv.ts` — already exist in the repo); CSV export must return a real file (`Content-Type: text/csv`, `Content-Disposition`) via the shared `csvFileResponse()` helper, matching this codebase's most-recently-added export features, not the older JSON-array or dead async-job export shapes also present elsewhere in the codebase (research.md R4)
**Scale/Scope**: 2 new routes (`/entry-exit/history` page, `GET`/`POST` mock API endpoints), 1 modified endpoint (quick-view's `context` enum), 2 new permissions, 1 backend bugfix (Observer store scope), ~6 new page-local components, extension of 1 existing mock-db table (no new table)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                                                                        | Notes |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| I   | TypeScript Strictness  | ☑ All new/extended types (`HistoryVisitRow`, `QuickViewContextSchema`, extended `EntryExitLogRow`) are explicit, Zod-derived; no `any`/unnarrowed `unknown`                                                                                  | PASS  |
| II  | OpenAPI-First          | ☑ New endpoints declared as Zod schemas under `_schemas/` before route implementation; Phase 1 uses mock DB; `generate-openapi` + `generate-api` run after routes land; no manual edits to `src/lib/api/`                                    | PASS  |
| III | Spec-Driven            | ☑ `spec.md` is complete; all `[NEEDS CLARIFICATION]` markers resolved (5 via `/speckit.clarify`, 1 more — FR-016 — resolved during this plan's research by checking this codebase's actual export convention); `plan.md` precedes `tasks.md` | PASS  |
| IV  | App Router & Simple UX | ☑ `page.tsx` is a Server Component shell; interactivity isolated to `_components/` client components with justified `"use client"`; shadcn/ui + Tailwind only; no modal/wizard flow, non-modal Sheet reused as-is                            | PASS  |
| V   | Simplicity & Min. Deps | ☑ No new npm packages — reuses `DataTable`, `Empty`, `RoleGatedButton`, `nuqs`, `csv.util.ts`, and the existing `member-quick-view-sheet.tsx` already in the repo; extends 1 existing mock-db table rather than adding a parallel one        | PASS  |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — `research.md`, `data-model.md`, and `contracts/` remain aligned with all five principles; no new dependencies or abstractions were introduced during Phase 0/1 design. The one design decision with the broadest blast radius — splitting `QuickViewContextSchema` off `EntryExitDirectionSchema` (research.md R7) — is additive and backward-compatible with feature 013's existing usage, verified by tracing its only two call sites.

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/015-entry-exit-history/
├── plan.md                                        # This file
├── research.md                                    # Phase 0 output
├── data-model.md                                  # Phase 1 output
├── quickstart.md                                  # Phase 1 output
├── contracts/
│   ├── get-entry-exit-history.md
│   ├── export-entry-exit-history.md
│   └── get-entry-exit-log-quick-view.md           # documents the shared/reused endpoint's schema change
├── checklists/
│   └── requirements.md
└── tasks.md                                        # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── crm/
│   │   │   └── entry-exit-logs/
│   │   │       ├── route.ts                       # existing (013) — unchanged
│   │   │       ├── history/
│   │   │       │   └── route.ts                   # NEW: GET paginated/filterable visit history
│   │   │       ├── export/
│   │   │       │   └── route.ts                   # NEW: POST CSV export — real file response via _lib/csv.ts's csvFileResponse()
│   │   │       ├── hourly-summary/route.ts         # existing (013) — unchanged
│   │   │       └── [id]/quick-view/route.ts        # MODIFIED: response context enum only
│   │   ├── _schemas/
│   │   │   └── entry-exit-log.schema.ts            # MODIFIED: extended row type, new query/response schemas, split QuickViewContextSchema
│   │   ├── _mock-db/
│   │   │   ├── tables/entry-exit-log.table.ts      # MODIFIED: new listHistory() method
│   │   │   ├── types/entry-exit-logs.type.ts       # MODIFIED: new auth_method/result fields
│   │   │   └── seeds/entry-exit-log.seed.ts        # MODIFIED: new seed rows (see data-model.md)
│   │   └── _lib/
│   │       ├── auth.ts                             # MODIFIED: getAllowedStoreIds — fix Observer store scope
│   │       └── csv.ts                              # existing (equipment/controllers/training-equipment) — reused as-is, unchanged
│   └── (private)/
│       └── entry-exit/
│           ├── page.tsx                            # existing (013) — unchanged
│           ├── _hooks/                             # existing (013) — unchanged
│           ├── _components/                        # existing (013) — unchanged; member-quick-view-sheet.tsx reused as-is
│           └── history/
│               ├── page.tsx                        # NEW: Server Component page shell
│               ├── _hooks/
│               │   ├── use-entry-exit-history-filters.hook.ts     # NEW: nuqs URL-state (matches banners/lockers convention)
│               │   └── use-entry-exit-history-csv-export.hook.ts  # NEW: useMutation wrapper (CSV build + toast)
│               └── _components/
│                   ├── entry-exit-history-content.tsx              # NEW: 'use client' orchestrator (data fetching + composition)
│                   ├── entry-exit-history-filters.tsx               # NEW: search + detail filter panel
│                   ├── entry-exit-history-table-columns.tsx         # NEW: ColumnDef[] factory
│                   └── entry-exit-history-csv-export-button.tsx     # NEW: RoleGatedButton-gated export action
├── constants/
│   └── permission.constants.ts                     # MODIFIED: new PAGE_PERMISSIONS + ROLE_PERMISSIONS entries
├── types/
│   └── permission.type.ts                          # MODIFIED: new Permission.EntryExitHistoryView/Export values
└── lib/
    └── api/                                        # Phase 2 generated client target (no manual edits) —
                                                       # regenerated after Phase 1 mock routes land:
                                                       # 1) npm run generate-openapi  2) npm run generate-api
```

**Structure Decision**: Single Next.js App Router project (no separate frontend/backend split). The new screen nests under the existing `(private)/entry-exit/` directory as `history/` — matching the `/lockers` → `/lockers/pending` drill-down convention and the PO spec's framing of this screen as reached _from_ the B-01 monitor (research.md R1). No new mock-db table is introduced; the existing `entry_exit_logs` table (feature 013) is extended in place, since both features model the same underlying gate-event data at different query granularities (per-event vs. per-visit). Feature-local components/hooks follow the exact `_components`/`_hooks` co-location convention already used by every sibling list screen (`banners`, `lockers/pending`, `entry-exit` itself).

**Implementation Order Note**: Schema → mock-db → permissions/auth fix → routes → `npm run generate-openapi && npm run generate-api` → components → `npm run generate-routes`. See `research.md`'s "Implementation order" section and `quickstart.md`'s checklist for the full ordered list.

## Phase 0: Research & Unknown Resolution

Research completed in [specs/015-entry-exit-history/research.md](research.md).

Resolved items:

- Route nests at `/entry-exit/history` under the existing feature 013 directory, auto-registered by `generate-routes` — no manual `routes.config.ts` edit (R1).
- Per-visit rows are derived at query time by pairing the existing per-event `entry_exit_logs` rows (extended with new `auth_method`/`result` fields), not a new parallel table (R2).
- Home store vs. visiting store already exist as two independent fields (`Member.store_id` vs. `EntryExitLogRow.store_id`) — no schema gap (R3).
- CSV export returns a real file (`Content-Type: text/csv`, `Content-Disposition`) via the shared `csvFileResponse()` helper — the pattern this codebase's most recently added export features (`equipment`, `controllers`, `training-equipment`) actually converge on, not the dormant `{exportId, status}` async-job schema nor the older JSON-array shape also present elsewhere in the codebase (R4) — this corrected spec.md's FR-016 twice as the research deepened.
- Two new permissions (`EntryExitHistoryView`/`EntryExitHistoryExport`) follow the existing `<resource>.<action>` naming and per-role grant convention exactly, implementing spec.md FR-014/FR-017 and the PO permission matrix (R5).
- `getAllowedStoreIds` was already updated by in-progress work on this branch (not this feature) to treat Observer as unrestricted (all stores) rather than the single-store scope originally assumed — consumed as-is, with spec.md's FR-008/SC-002 corrected to match (R6).
- The row-click Quick View panel reuses feature 013's existing sheet/endpoint unchanged, except `MemberQuickViewSchema.context` is decoupled into its own enum to add `'in-building'`/`'denied'` values this screen needs, without touching feature 013's existing `'entry'`/`'exit'` usage (R7).
- Filters use the same `nuqs` URL-state hook shape as every other filterable list screen (`banners`, `lockers/pending`) (R8).
- No custom data-fetching wrapper hook — components call generated React Query option factories directly, per this codebase's established convention (R9).
- Loading/empty/error composition matches `banners`/`lockers` (`DataTable` + `Empty` + inline error/retry), not feature 013's simpler `DataStateBoundary` (which fits its unpaginated, unfiltered activity tables, not this paginated/filterable one) (R10).

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/015-entry-exit-history/data-model.md](data-model.md)
- [specs/015-entry-exit-history/contracts/get-entry-exit-history.md](contracts/get-entry-exit-history.md)
- [specs/015-entry-exit-history/contracts/export-entry-exit-history.md](contracts/export-entry-exit-history.md)
- [specs/015-entry-exit-history/contracts/get-entry-exit-log-quick-view.md](contracts/get-entry-exit-log-quick-view.md)
- [specs/015-entry-exit-history/quickstart.md](quickstart.md)

Design highlights:

- `HistoryVisitRow` (a query-time, paired view of two `EntryExitLogRow`s) keeps the mock DB normalized around events while matching what the screen needs to render — one row per visit, not per swipe.
- `visit_status` (`completed`/`in_progress`/`denied`) is always derived, never stored — it drives FR-010's blank/"in facility" rendering rules directly from row presence (a null `exit_log_id`) rather than a separately-maintained flag that could drift out of sync.
- The CSV export endpoint reuses the exact same filter/sort logic as the list endpoint (minus pagination), guaranteeing the exported file always matches what's on screen (FR-013) by construction, not by convention alone.
- CSV export is a real downloaded file (`csvFileResponse`), not a JSON envelope the client converts — matching the codebase's newest export features rather than its older ones, which was only discovered after a first pass had already (incorrectly) matched the older JSON-array convention.
- Two real, pre-existing codebase gaps were found and are fixed as part of this plan, not deferred: the Observer store-scope bug (R6) and FR-016's mismatch against this app's actual (not just documented) export pattern (R4) — both would have caused this feature to misbehave if built against the spec's original wording without checking `src/`.

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
