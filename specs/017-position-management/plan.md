# Implementation Plan: Y-01 Position Master Management (職位マスター管理)

**Branch**: `017-position-management` | **Date**: 2026-07-16 (updated 2026-07-29) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-position-management/spec.md`

## Summary

Build the Y-01 Position Master Management slice: a two-pane list screen (position table + permission preview pane realizing FR-009) and a create/edit/clone form with 36 permission toggles in 10 categories (CSV出力管理 independent, per FR-S001 and Clarification Q2). Phase 1 extends the **existing** `positions` mock-db table/schema (already consumed by the staffs feature) with `description`, a flat 36-key permission map, `is_system_managed`, and timestamps, and adds full CRUD mock routes designed against the Staff & Permission Management BE API (adapted to this project's `/api/crm/*` + hey-api conventions). Staff change history is **seed-only** (FR-019). Role is immutable in edit mode (Clarification Q3).

**Update 2026-07-29** (API-team QA answers + prototype 7/23, API design v0.3): `description` is now an official BE field (≤500 chars, no longer an extension); a new permission-catalog endpoint `GET /api/crm/permissions` mirrors the BE's `/api/v1/admin/permissions` and is the source the form renders its toggles from (FR-009a / research R14); the BE catalog grew to 58 flags / 10 categories with `csv_export` official — the rendered UI stays at 36 and the mock adopts the `csv_export` category key; the preview's 権限フラグ section is **removed** (権限フラグ ≡ アクセス権限, merged) and replaced by a 重要操作 warning icon (FR-007a); the list column is renamed アクセス権限数; the filter banner moves inside the list card; the 割当スタッフ panel shows 3 staff with avatar/無効 badge/store sub-line. One gap stays open: `can_edit_gate_stop` (spec Q5).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, nuqs (URL state), sonner (toasts)
**Storage**: Phase 1 — in-memory mock DB `src/app/api/_mock-db/` (extend existing `positions` table/seed; new seed-only `staff-change-history` table); Phase 2 — generated REST client via hey-api with zero application-code changes
**API pipeline**: Zod schemas (`src/app/api/_schemas/*.schema.ts`, zod-to-openapi) → `registerRoute` → `npm run generate-openapi` → `npm run generate-api` → `src/lib/api/` (`@tanstack/react-query.gen` options/mutations)
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application (Next.js App Router, mock API co-located under `src/app/api`)
**Performance Goals**: Standard CRM screen expectations — list interactions (search/filter/select) feel instant on a ~13-row master; no NFR simulation of the BE's rate limits/p95 targets (documented backend concerns)
**Constraints**: UI parity with the V0 mockup @426a9b3 (2026-07-23) enforced via `checklists/parity.md` (75 items, 1 clarified deliberate deviation: role select disabled in edit); rendered permission catalog fixed at 36 keys / 10 categories (Clarification Q2, refined 2026-07-29) while the BE contract holds 58
**Scale/Scope**: 3 routes (list+preview, create, edit), 7 mock endpoints (6 position + 1 permission catalog), 1 extended table + 1 seed-only table, ~13 seed positions + aligned staff seeds

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                    | Notes                                                                                                                                                         |
| --- | ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent       | All types derive from Zod schemas / generated client; permission map typed from a 36-key literal catalog, no `Record<string, any>`                            |
| II  | OpenAPI-First          | ☑ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits    | New endpoints declared in Zod+`registerRoute` first → `generate-openapi` → `generate-api`; UI consumes only `@tanstack/react-query.gen`                       |
| III | Spec-Driven            | ☑ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins | 3 clarifications resolved in session 2026-07-16 (description field, permission catalog, role immutability); Q4 resolved by documented assumption              |
| IV  | App Router & Simple UX | ☑ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path  | Page shells are RSC; list content & form are `"use client"` (React Query, selection state, RHF) — same justification as sibling screens (routines, staffs)    |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; no abstraction layers beyond existing patterns                    | Reuses DataTable/Empty/FilterResult/PageHeader/RoleGatedButton/TablePaginationWithSize, `useUnsavedChanges`, nuqs filter-hook pattern; extends existing table |

> All gates pass. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/017-position-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (7 endpoint contracts)
│   ├── get-positions.md
│   ├── create-position.md
│   ├── get-position-detail.md
│   ├── update-position.md
│   ├── delete-position.md
│   ├── get-position-permissions.md
│   └── get-permission-catalog.md      # NEW 2026-07-29
├── checklists/
│   ├── requirements.md  # spec quality gate (all pass)
│   └── parity.md        # 74-item V0 parity gate for /speckit.implement
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/app/api/_schemas/
└── position.schema.ts                     # EXTEND: PositionSchema (+description, permissions [closed 36-key Zod map,
                                           #   BE `can_*` key naming], is_system_managed, created_at/updated_at),
                                           #   list/detail/create/update/preview schemas + route-side category grouping
                                           #   metadata (mock-internal — nothing outside src/app/api imports it)

src/app/api/_mock-db/
├── types/positions.type.ts                # EXTEND: list w/ query support, create, update, delete methods
├── tables/position.table.ts               # NEW (table for existing type currently seeded via _create-db):
│                                          #   list/getById/create/update/delete + staffCount join vs staffs
├── seeds/position.seed.ts                 # EXTEND: 13 Y-01 initial positions w/ full permission maps + descriptions
├── types/staff-change-histories.type.ts   # NEW: seed-only read model (FR-019)
├── tables/staff-change-history.table.ts   # NEW: rows + _seed only (no mutation methods)
├── seeds/staff-change-history.seed.ts     # NEW: seed rows referencing seeded staff/positions
└── _create-db.ts                          # wire new/extended tables

src/app/api/crm/permissions/
└── route.ts                               # NEW (2026-07-29): permission catalog, no positionId (research R14)

src/app/api/crm/positions/
├── route.ts                               # EXTEND: GET (paginated list w/ search & permissionKey),
│                                          #   POST (create)
├── [id]/route.ts                          # NEW: GET detail / PATCH (no role) / DELETE (guards)
└── [id]/permissions/route.ts              # NEW: grouped permission preview (10 categories incl. csv_export)

src/app/(private)/positions/
├── page.tsx                               # REPLACE stub: RSC shell → 2-pane list + preview ("use client" content)
├── create/page.tsx                        # NEW: create & clone (?cloneFrom={id})
├── [id]/edit/page.tsx                     # NEW: edit (role select disabled)
├── _components/
│   ├── position-table-columns.tsx         # 職位名+説明 / ロール / アクセス権限数 / 割当スタッフ / actions
│   ├── position-permission-filter.tsx     # 権限で絞り込む popover (Command, grouped by category)
│   ├── position-row-actions.tsx           # 編集 / 複製 / 削除（割当あり disabled）
│   ├── position-delete-dialog.tsx         # 職位を削除しますか？ AlertDialog
│   ├── permission-preview-panel.tsx       # right pane: placeholder / header / category accordion w/
│   │                                      #   重要操作 warning icon / 割当スタッフ (staff list by positionId)
│   └── position-form/
│       ├── position-form.tsx              # shared create/edit/clone form (RHF + Zod)
│       ├── position-form-basic-info-section.tsx
│       └── position-form-permissions-section.tsx  # category accordions rendered from GET /crm/permissions,
│                                                  #   bulk 全ON/OFF, CSV role defaults
├── _hooks/use-position-filters.hook.ts    # nuqs: search / permissionKey / page / limit / positionId (selection)
├── _constants/
│   ├── position.constants.ts              # role options (5), page sizes
│   └── position-permissions.constant.ts   # UI-only metadata: helper descriptions, kind: view|edit,
│                                          #   destructive key set (FR-007a), CSV role defaults — typed
│                                          #   `satisfies` against the generated permission-map type (survives
│                                          #   Phase 2 mock deletion; research R3/R14). Categories/labels/order
│                                          #   come from the catalog endpoint, not from here.
└── _schemas/position-form.schema.ts       # Zod form schema (name required ≤100, role required, permissions map)

src/types/permission.type.ts               # already has Positions* Permission values — register page permissions
                                           #   for /positions, /positions/create, /positions/[id]/edit
```

**Structure Decision**: Extend the existing feature-colocated App Router layout. The `positions` domain already exists in skeleton form (stub page at `src/app/(private)/positions/page.tsx`, simple `position.schema.ts` + seed consumed by the staffs feature) — this feature grows it in place rather than creating a parallel structure, updating the staffs-feature consumers of `GET /crm/positions` to the new paginated response shape (see research.md R2).

## Complexity Tracking

No constitution violations — table intentionally left empty.
