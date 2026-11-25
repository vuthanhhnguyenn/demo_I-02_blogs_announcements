# Implementation Plan: Brand Master Management (Y-07)

**Branch**: `021-brand-management` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-brand-management/spec.md`, existing implementation at `src/app/(private)/brands/**`

**Note**: This plan covers a **brownfield update**, not new-feature planning. `src/app/(private)/brands/**` was implemented (commits `02586203`, `6b505b4a`) before `spec.md` and `checklists/parity.md` existed. Phase 0 (`research.md`) is a gap audit of the current code against the finalized spec/parity checklist rather than a technology survey.

## Summary

Bring the existing Brand Master Management screens (`src/app/(private)/brands/**`) into alignment with `spec.md`'s functional requirements and `checklists/parity.md`'s V0 fidelity checklist. The audit in `research.md` found:

- **2 live runtime bugs** (G1, G2): disabling/deleting a fee entry throws a 500 today (called mock-DB methods were never implemented), and no user action ever writes to the change-history log (it is frozen seed data).
- **1 unimplemented Must-have** (G3): scheduled future fee revisions — the core reason the screen exists per the spec's own User Story 2 rationale — can be viewed but never created, edited, or deleted anywhere in the stack (schema, mock-DB, or UI).
- **1 scope violation** (G4): a fully working "create new brand" flow exists on the brand list page, which `spec.md` FR-015 and the V0 mockup both place out of scope for this phase.
- **2 V0 parity gaps** (G5, G6): two "next phase" affordances (detail-page basic-info edit, fee-tab new-fee registration) are supposed to render disabled with a tooltip per the mockup, but render either fully functional (G5) or conditionally enabled (G6) today.
- **1 accepted deviation** (G7): Trainer/Observer access denial happens via the app-wide `/403` redirect rather than V0's in-page message — functionally equivalent, kept as-is for consistency with every sibling feature.

**Per explicit user direction (2026-07-29): any already-implemented feature found to be out of scope (G4, and the rename wiring in G5) is COMMENTED OUT in place, never deleted.** This keeps the working implementation available for a fast follow-up once that scope opens up, while the rendered UI matches spec/V0 today. Only G1/G2 (bug fixes) and G3 (new Must-have functionality) involve writing genuinely new/corrected code; G6 is a small disable-condition/tooltip fix with no working feature behind it to preserve.

No new dependencies, no new routes/pages, no change to the OpenAPI-generated client's public shape beyond one additive optional request field (`scheduled_changes` on the fee-item update payload).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), TanStack React Query 5, react-hook-form + Zod, shadcn/ui, lucide-react, date-fns v4 — all already in use by the existing brand feature; no additions.
**Storage**: Phase 1 in-memory mock-DB (`src/app/api/_mock-db/tables/franchise.table.ts` — the real `brands` table; `tables/brand.table.ts` is a misnamed file holding unrelated `positions`/`mainContracts`/`campaigns` tables). Frontend already consumes it via the generated hey-api client (`src/lib/api/@tanstack/react-query.gen`); Phase 2 swap to a real backend is unaffected by this plan (schema-first change only).
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application (Next.js App Router, single project)
**Performance Goals**: None beyond existing app conventions — no new list/table rendering paths.
**Constraints**: Zero new npm dependencies (Constitution V). Mutations must keep the existing `Permission.BrandsEdit`/`Permission.BrandsView` gating exactly as-is except where a gap explicitly requires a UI-level disable (G5, G6).
**Scale/Scope**: 2 brands (JOYFIT, FIT365), ≤ 5 sub-brands, 2 fee items per sub-brand — unchanged from spec.md's fixed scope (FR-015).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                          | Notes                                                                                                                                                                                             |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types (`BrandScheduledFeeChangeInputSchema`, form schema additions) are Zod-inferred, strict, no `any`.                                                                              |                                                                                                                                                                                                   |
| II  | OpenAPI-First          | ☑ `scheduled_changes` added to `UpdateBrandFeeItemSchema` (the Zod source of the OpenAPI doc) first; hey-api client regenerated from it — no manual edits to `src/lib/api/**` generated files. |                                                                                                                                                                                                   |
| III | Spec-Driven            | ☑ `spec.md` has zero `[NEEDS CLARIFICATION]` tokens (validated in `checklists/requirements.md`); this plan exists before `tasks.md`.                                                           |                                                                                                                                                                                                   |
| IV  | App Router & Simple UX | ☑ No new routes; existing `_components/`/`_schemas/` co-location preserved; no new modals — revision rows extend the existing fee edit `Sheet`.                                                | G4/G5 commenting-out removes surprise duplicate entry points from the _rendered_ UX (source kept, per user direction); G5/G6 make disabled state legible via tooltip rather than silently absent. |
| V   | Simplicity & Min. Deps | ☑ No new npm packages. G7 explicitly avoids adding a bespoke access-denied component when the existing proxy-level gate already covers it.                                                     |                                                                                                                                                                                                   |

> No violations — Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/021-brand-management/
├── plan.md              # This file
├── research.md          # Phase 0 — gap audit (G1-G7)
├── data-model.md         # Phase 1 — entity/schema deltas
├── contracts/            # Phase 1 — endpoint contracts affected by the gap fixes
│   ├── update-brand.md
│   ├── update-brand-fee-group.md
│   └── disable-and-delete-brand-fee-group.md
├── quickstart.md         # Phase 1 — manual verification checklist (no automated tests)
├── checklists/
│   ├── requirements.md   # already validated (speckit.specify)
│   └── parity.md         # V0 fidelity — gates /speckit.implement
└── tasks.md              # Phase 2 output (/speckit.tasks — not created by this command)
```

### Source Code (repository root)

```text
src/app/(private)/brands/
├── page.tsx                                  # list — G4: comment out create-brand entry point (keep source, don't delete)
├── _components/
│   ├── brands-search-layout.tsx               # unchanged
│   └── brand-form-sheet.tsx                   # unchanged (rename-only sheet; still used live by the list row's edit action)
├── _constants/brand.constants.ts               # unchanged
├── _hooks/use-brands-filters.ts                # unchanged
├── _schemas/brand-form.schema.ts               # unchanged
└── [id]/
    ├── page.tsx                                # G5: comment out this button's rename wiring (keep source), render disabled + tooltip
    ├── _schemas/brand-fee-group-form.schema.ts  # G3: add nested scheduledChanges array + duplicate-date refine
    └── _components/
        ├── basic-info-tab.tsx                  # unchanged
        ├── brand-status-badge.tsx              # unchanged
        ├── fee-current-badge.tsx                # unchanged
        ├── fees-tab.tsx                         # G6: fee-tab "新規登録" disable condition + tooltip
        ├── brand-fee-group-edit-sheet.tsx        # G3: revision rows, add button, preview block
        ├── fee-group-disable-dialog.tsx          # unchanged (fix is server-side, G1)
        ├── fee-group-delete-dialog.tsx           # unchanged (fix is server-side, G1)
        └── history-tab.tsx                      # unchanged (fix is server-side, G2)

src/app/api/
├── _schemas/brand.schema.ts                    # G3: BrandScheduledFeeChangeInputSchema + UpdateBrandFeeItemSchema field
├── _mock-db/
│   ├── tables/franchise.table.ts               # G1: disableFeeGroup/deleteFeeGroup; G2: history writes on update/updateFeeGroup; G3: scheduled_changes write handling
│   └── types/brands.type.ts                    # unchanged (already declares the G1 methods — implementation was simply missing)
└── crm/brands/
    ├── route.ts                                # unchanged (POST stays server-side, just unreferenced from UI per G4)
    ├── [id]/route.ts                            # unchanged shape (G2 side effect only)
    └── [id]/fees/
        ├── route.ts                            # unchanged
        └── [subBrandCode]/
            ├── route.ts                        # G1/G2/G3 land inside the mock-DB methods it calls, not the route itself
            └── disable/route.ts                # G1/G2 land inside the mock-DB method it calls, not the route itself

src/lib/api/                                    # hey-api generated — regenerate after brand.schema.ts changes (G3); no manual edits
```

**Structure Decision**: Single Next.js App Router project (already established). All changes are in-place edits to existing files under the brand feature's own `_components`/`_schemas` folders and the shared mock-DB layer — no new routes, no new top-level directories.

## Next steps

1. Run `/speckit.tasks` to break G1-G6 into ordered, dependency-aware tasks (schema → mock-DB → UI, per Constitution II's OpenAPI-first ordering). G4/G5 are comment-out tasks (preserve source, disable the rendered entry point), not deletions — no further scope confirmation needed per user direction.
2. `/speckit.implement` is gated on `checklists/parity.md` — items PAR050-PAR060 (fee edit sheet) and PAR028/PAR032 (phase-2 tooltips) cannot be ticked until G3/G5/G6 land.
