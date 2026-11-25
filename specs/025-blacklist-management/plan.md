# Implementation Plan: Blacklist Management (A-01 FR-015)

**Branch**: `025-blacklist-management` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-blacklist-management/spec.md`

## Summary

Rebuild the HQ-only blacklist list and detail screens against the v0.4 backend contract, and add the release capability the client agreed to on 2026-07-29.

The screens themselves are small — a six-column list with two filters and a registration Sheet, plus a two-card detail with a status card. The substance of the work is **contract alignment**: an implementation of this feature already exists on `dev` against a bespoke shape that predates the API design, and every layer of it encodes that shape. `blacklistId` becomes a UUID separate from the member number, `registrationSource` becomes `source`, the single nullable `manualReason` becomes a required `reasonCategories` array, `memo` and `reason` swap meanings, `isActive` / `removedAt` / `removedBy` / `history` arrive, and `matchConditions` is deleted. Two registration routes collapse into one.

Approach: rewrite the schema, table, seeds and routes to mirror the contract field-for-field, then rebuild the two screens on the A-03 (`members/leaves`) patterns — `nuqs` URL filter state, the shared `DataTable`, `TablePaginationWithSize`, `FilterResultBanner`, `SearchableSelect`. The one file touched outside the feature is the member-detail registration dialog, whose request body changes while its UI does not.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-explicit-any`)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui (Base UI primitives), TanStack React Query 5 + TanStack Table, react-hook-form + Zod, nuqs (URL state), lucide-react, Tailwind CSS v4, date-fns v4
**Storage**: Phase 1 — `src/app/api/_mock-db/` (in-memory tables + seeds) behind Zod-validated route handlers under `src/app/api/crm/`; consumed exclusively through the hey-api client in `src/lib/api/`
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application — Next.js App Router, mock API co-located under `src/app/api/`
**Performance Goals**: list first page under 1 s at 100k entries (SC-011); the contract's own NFR is ≤ 300 ms p95 server-side
**Constraints**: HQ / System roles only, enforced server-side (FR-001 – FR-003); no store scoping (FR-004); one active entry per member, enforced in the write path (FR-050); mock and real contract must stay behaviourally equivalent (Constitution §II)
**Scale/Scope**: 2 screens + 1 Sheet + 1 dialog + 4 endpoints; ~15 files rewritten, 1 file touched outside the feature

No `NEEDS CLARIFICATION` remains — spec Q-01 – Q-12 are all closed, and [research.md](./research.md) resolves every implementation unknown.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check | Notes                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑     | All types derive from the Zod schemas via `z.infer` and from the generated client's `types.gen`. No `any`. The `BlacklistRow = BlacklistDetail` alias in `seeds/transfer.seed.ts` goes away — the table's row type becomes its own named type (research §5).                                                        |
| II  | OpenAPI-First          | ☑     | New shapes are declared in `_schemas/blacklist.schema.ts` and registered via `registerRoute` **before** any screen work; `src/lib/api/` is regenerated, never hand-edited. FR-075 forbids leaving the old shape callable, which is what keeps mock and real equivalent.                                             |
| III | Spec-Driven            | ☑     | `spec.md` clarified 2026-08-07, all twelve Q&A items resolved, zero `[NEEDS CLARIFICATION]` tokens. This `plan.md` precedes `tasks.md`.                                                                                                                                                                             |
| IV  | App Router & Simple UX | ☑     | Route-local `_components/` `_hooks/` `_contexts/` `_schemas/` retained. `"use client"` is needed on the list page (URL filter state, TanStack Query), the Sheet and the detail's release action — each carries a justifying comment. shadcn/ui + Tailwind only. The Sheet keeps V0's single-screen form; no wizard. |
| V   | Simplicity & Min. Deps | ☑     | Zero new packages. The Sheet's combobox reuses `@/components/common/searchable-select` rather than hand-rolling V0's Popover+Command (research §8). No new abstraction layers.                                                                                                                                      |

**No Testing Policy**: no test files, no test frameworks, no test tasks. Verification is `tsc --noEmit`, ESLint/Prettier, and the manual [quickstart.md](./quickstart.md) checklist.

### Post-Design Re-check (after Phase 1)

| #   | Re-check                                                        | Result                                                                                                                                  |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Do the data-model types introduce `any` / unnarrowed `unknown`? | No — see [data-model.md](./data-model.md); `metadata` on history events is the only open map and is typed as a named record, not `any`. |
| II  | Does any screen bypass the generated client?                    | No. The three member-list additions (research §3) go through the schema → OpenAPI → client regeneration flow like everything else.      |
| III | Did design surface a new ambiguity?                             | No.                                                                                                                                     |
| IV  | Did design add a client component beyond those listed?          | One — the detail's status/release block, split out so the detail page itself stays a server component.                                  |
| V   | Did design add a dependency or abstraction?                     | No. One possible extension to `searchable-select`'s item renderer, only if it is not already slot-based (research §8).                  |

## Project Structure

### Documentation (this feature)

```text
specs/025-blacklist-management/
├── spec.md              # Clarified 2026-08-07 — 81 FR, 12 Q&A resolved
├── plan.md              # This file
├── research.md          # Phase 0 — 11 findings
├── data-model.md        # Phase 1 — entities, transitions, validation
├── quickstart.md        # Phase 1 — manual verification checklist
├── contracts/
│   └── blacklist-api.md # Phase 1 — the four endpoints, request/response/guards
├── checklists/
│   ├── requirements.md  # Spec quality — all pass
│   └── parity.md        # 111 active items, 4 struck
└── tasks.md             # Phase 2 — NOT created by /speckit.plan
```

### Source Code (repository root)

```text
src/app/api/_schemas/
└── blacklist.schema.ts                      # REWRITE — v0.4 shape, camelCase (research §9)

src/app/api/_mock-db/
├── tables/blacklist.table.ts                # NEW — moved out of transfer.table.ts (research §5)
├── tables/transfer.table.ts                 # EDIT — remove the memberBlacklist block
├── tables/members.table.ts                  # EDIT — forced-withdrawal auto-register to new shape (L695)
├── seeds/blacklist.seed.ts                  # NEW — coverage per research §10
├── seeds/transfer.seed.ts                   # EDIT — drop the BlacklistRow alias
├── types/member-blacklist.type.ts           # DELETE
├── _db.types.ts                             # EDIT — retype the blacklist table
└── _create-db.ts                            # EDIT — wire the new table

src/app/api/crm/
├── blacklist/route.ts                       # REWRITE — GET only; POST removed (FR-073)
├── blacklist/[id]/route.ts                  # REWRITE — GET, v0.4 detail
├── blacklist/[id]/active/route.ts           # NEW — PATCH release (FR-062 – FR-068)
└── members/[id]/blacklist/route.ts          # REWRITE — POST, reasonCategories body

src/app/api/_schemas/member.schema.ts        # EDIT — +date_of_birth, +face_photo_url, +has_blacklist (research §3)
src/app/api/crm/members/route.ts             # EDIT — opt-in prefix matching for the Sheet (research §4)

src/app/(private)/members/blacklist/
├── page.tsx                                 # REWRITE — 6 columns, 2 filters, Sheet trigger
├── _constants/blacklist.constants.ts        # REWRITE — source/reason maps, page sizes, no match labels
├── _contexts/blacklist-filters-context.tsx  # EDIT
├── _hooks/use-blacklist-filters.ts          # REWRITE — nuqs, debounce, page clamp
├── _schemas/register-blacklist-form.schema.ts  # EDIT — reasonCategories
├── _components/blacklist-filters.tsx        # REWRITE — always-expanded, no 詳細フィルター
├── _components/blacklist-table-columns.tsx  # REWRITE — 6 columns
├── _components/blacklist-source-badge.tsx   # KEEP — rename inputs to `source`
├── _components/blacklist-register-sheet.tsx # REWRITE — SearchableSelect + identity card + pre-check
├── [id]/page.tsx                            # REWRITE — 2 cards + status card
├── [id]/_components/blacklist-detail-info.tsx    # EDIT — memo from `reason`
├── [id]/_components/blacklist-detail-skeleton.tsx # EDIT — 2 cards
├── [id]/_components/blacklist-unpaid-card.tsx    # KEEP
├── [id]/_components/blacklist-match-conditions.tsx # DELETE (Q-02)
└── [id]/_components/blacklist-release-action.tsx   # NEW — status card + dialog (FR-062 – FR-064a)

src/app/(private)/members/[id]/_components/blacklist-dialog.tsx  # EDIT — body only, UI unchanged (FR-074)

src/constants/app.constants.ts               # READ — PAGE_SIZE = 25 (research §2)
```

**Structure Decision**: the feature keeps its existing route-local layout under `src/app/(private)/members/blacklist/`, which already matches the App Router conventions in Constitution §IV and mirrors `members/leaves/` from A-03. The mock API keeps the `_schemas/` → `registerRoute` → `_mock-db/` layering the rest of the project uses. Two structural corrections are made: the blacklist table moves out of `transfer.table.ts` into its own file, and the redundant list-scoped registration route is removed.

## Execution Order

The dependency chain is strict — the generated client sits between the API layer and the screens, so nothing on screen can be written until the contract is regenerated.

1. **Contract** — rewrite `blacklist.schema.ts`; add the three member-list fields; register the four routes.
2. **Regenerate** — `generate-openapi` then the hey-api client, followed by `prettier --write` (the regen is diff-clean only with it).
3. **Data** — new table + seeds; update the forced-withdrawal call site; delete the old type and the transfer-file block.
4. **Routes** — the four handlers, guards in contract order.
5. **Screens** — list (columns → filters → pagination → Sheet), then detail (cards → status/release).
6. **Callers** — the member-detail dialog's request body.
7. **Cleanup** — delete `specs/blacklist-management/` (superseded; recorded in spec Assumptions), delete `blacklist-match-conditions.tsx`, confirm no reference to the old shape survives.

Steps 1–2 are a hard barrier: attempting screen work before the client is regenerated produces types that will not exist.

## Risks

| Risk                                                                                                                                      | Mitigation                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| The forced-withdrawal path (`members.table.ts` L695) silently keeps writing the old shape, so auto-registered rows never appear correctly | Called out as its own task; research §5 fixes the exact call site and the `reasonCategories: ['unpaid']` value the contract mandates |
| Changing `GET /crm/members` matching breaks A-01's own member list and other pickers                                                      | Prefix matching is an opt-in query flag, never the default (research §4)                                                             |
| `searchable-select` cannot render the Sheet's avatar + two-line rows                                                                      | Check whether its item renderer is slot-based before extending; extending it is a small, local change either way (research §8)       |
| Released entries are unreachable from any list, so FR-069b goes unverified                                                                | The seed must include a released entry, and quickstart walks to it by URL (research §10)                                             |
| The regenerated client leaves stale symbols for the removed `POST /crm/blacklist`                                                         | Step 7 greps for every old-shape identifier before the feature is called done                                                        |

## Complexity Tracking

> No constitution violations. This section is intentionally empty.
