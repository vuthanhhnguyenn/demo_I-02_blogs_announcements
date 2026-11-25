# Implementation Plan: Leave & Withdrawal Management (A-03)

**Branch**: `024-leave-withdrawal-management` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-leave-withdrawal-management/spec.md`

## Summary

A-03 surfaces every member in the operator's store scope who is scheduled to suspend, currently suspended, scheduled to withdraw, or waiting for withdrawal processing, and lets an authorised operator cancel a scheduled withdrawal.

**This feature is not greenfield.** A working list + detail implementation already exists at `src/app/(private)/members/leaves/`, backed by a Zod-defined mock API at `src/app/api/crm/leaves/` and consumed through the generated client. It was built on the `feat/member-leave` branch before this spec existed, and it already gets several things right that the V0 prototype gets wrong — server-side search, a working 予定日 filter, all five brands, a cancellation dialog that actually cancels.

The work is therefore **reconciliation, not construction**: close the gaps between that implementation and the clarified spec, and remove what the clarifications took out of scope. The largest additions are role gating, the row-action cancel path, the member head-up card, the suspension-history strip and the filter-result banner; the largest removal is the approve / reject / execute-withdrawal action set, which A-03 assigns to other actors.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-explicit-any`)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui (Base UI primitives), TanStack React Query 5 + TanStack Table, react-hook-form + Zod, nuqs (URL state), lucide-react, Tailwind CSS v4, date-fns v4
**Storage**: `src/app/api/_mock-db/` (in-memory tables + seeds) behind Zod-validated route handlers under `src/app/api/crm/`; the app consumes them exclusively through the hey-api-generated client in `src/lib/api/`
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application — Next.js App Router admin CRM, single project
**Performance Goals**: List first page renders within 1 s at 100k applications on file (SC-009); the real endpoint's stated budget is p95 ≤ 500 ms for 20 items
**Constraints**: Mock and real API must be behaviourally interchangeable (Constitution II) — the Phase 1 → Phase 2 swap must require zero application-code change. `limit` is capped at 100 by both the project's Zod schema and the real contract.
**Scale/Scope**: 2 screens (list, detail), 1 mock table + seed, 1 Zod schema module, ~10 route-local components. 78 functional requirements, 116 UI parity items.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| #   | Principle              | Check                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ---------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent      | Types flow from the Zod schema → generated OpenAPI → `src/lib/api/types.gen.ts`. Existing code already derives row/detail types via `NonNullable<GetCrmLeavesResponse['leaves']>[number]`; new code follows the same derivation.                                                                                                                                                          |
| II  | OpenAPI-First          | ☑ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits   | Already satisfied by the existing implementation. Every schema change goes through `src/app/api/_schemas/leave.schema.ts` → `generate-openapi` → `prettier --write` → client regen. **No hand-editing of `src/lib/api/`.**                                                                                                                                                                |
| III | Spec-Driven            | ☑ `spec.md` approved; all clarification tokens resolved before any task begins          | 13 of 15 Q&A entries were closed across two `/speckit.clarify` passes. The final two (Q-06, Q-13) are resolved in [research.md](./research.md) §1–§2 — both on evidence from the codebase, which changed the answer for Q-13. **Zero clarification tokens remain.**                                                                                                                       |
| IV  | App Router & Simple UX | ☑ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path | Both screens are inherently interactive (URL-synced filters, TanStack Table, mutations) so `"use client"` is justified at the page level, matching the existing files and the sibling `banners` / `visit-experiences` screens. No new UI libraries. The clarifications actively shortened the UX path — the heatmap view, a second view toggle and three action buttons were all removed. |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; no abstraction layers beyond existing patterns                   | Zero new dependencies. Every component this feature needs already exists in `src/components/common/` except two, which are built from existing primitives (see Complexity Tracking).                                                                                                                                                                                                      |

**No Testing Policy**: acknowledged and binding. No test files, no test frameworks, no test tasks. Verification is `tsc --noEmit` + ESLint/Prettier + the manual [quickstart.md](./quickstart.md) checklist + MR review.

## Current Implementation Baseline

Everything below already exists on `dev`. It is the starting point, not work to be done.

| Area             | File                                                | State                                                                          |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| List page        | `src/app/(private)/members/leaves/page.tsx` (114 L) | Working — DataTable, pagination, sorting, filter panel                         |
| List columns     | `_components/leaves-table-columns.tsx` (140 L)      | Working — 11 columns                                                           |
| List filters     | `_components/leaves-filters.tsx` (210 L)            | Working — search, 種別, ステータス, 店舗, ブランド, 予定日                     |
| Filter state     | `_hooks/use-leaves-filters.ts` (109 L)              | Working — nuqs URL state, 500 ms search debounce                               |
| Filter context   | `_contexts/leaves-filters-context.tsx` (27 L)       | Working                                                                        |
| Label/style maps | `_constants/constants.ts` (116 L)                   | Working — status/type labels, badge classes, icon config                       |
| Detail page      | `[id]/page.tsx` (103 L)                             | Working                                                                        |
| Detail cards     | `[id]/_components/leave-detail-info.tsx` (224 L)    | Working — 申請情報, 承認フロー, 代理申請情報, 関連情報                         |
| Detail actions   | `[id]/_components/leave-status-action.tsx` (272 L)  | Working — but carries three out-of-scope actions                               |
| Detail skeleton  | `[id]/_components/leave-detail-skeleton.tsx` (50 L) | Working                                                                        |
| API schema       | `src/app/api/_schemas/leave.schema.ts` (208 L)      | Working — Zod + OpenAPI annotations                                            |
| API routes       | `src/app/api/crm/leaves/**` (6 handlers)            | Working — list, detail, approve, reject, cancel-withdrawal, execute-withdrawal |
| Mock table type  | `src/app/api/_mock-db/types/member-leaves.type.ts`  | Declared — **no `.table.ts` or `.seed.ts` file exists yet**                    |
| Route registry   | `src/lib/routes/routes.config.ts` L479-L490         | Registered — `/members/leaves`, `/members/leaves/[id]`                         |

**Five clarifications are already satisfied by this code** — worth knowing before touching anything:

- **Q-01** — `scheduled_period` is applied server-side in `route.ts`; the V0 dead-filter defect never reached the project.
- **Q-04** — the brand filter renders all five brands from `BRAND_LABELS`, matched on the record's brand value.
- **Q-05** — `search` is a real query parameter evaluated server-side, exactly as FR-019a demands.
- **Q-08** — the detail cancel dialog calls the mutation, toasts and invalidates; the V0 no-op was never copied.
- **Q-09** — loading uses `DataTable isLoading` / `leave-detail-skeleton`, mutations use `toast.error`.

## Gap Analysis — implementation vs. clarified spec

Ordered by risk. This is the substance `/speckit.tasks` will decompose.

### A. Must remove (clarified out of scope)

| #   | Gap                                                                                   | Requirement                                                                                                                |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A1  | Detail carries 承認 / 却下 / 退会処理実行 buttons and their dialogs + mutations       | Spec Out of Scope — approval/rejection belong to A-01-01, withdrawal execution is a System batch. Only 退会取り消し stays. |
| A2  | `completed` (処理完了) appears in the list status filter, the badge map and list rows | Q-10 / FR-010, FR-022 — the state survives on the **detail** only                                                          |
| A3  | Route handlers `approve/`, `reject/`, `execute-withdrawal/` and their schemas         | Follows A1. Keep `cancel-withdrawal/`.                                                                                     |

### B. Must add (required, absent)

| #   | Gap                                                                                                      | Requirement             |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------- |
| B1  | Role gating — Trainer denial card; 退会取り消し limited to System/HQ/Manager/Staff                       | FR-001, FR-002, FR-006  |
| B2  | Header store-scope handling — hide 店舗名 column and the in-screen 店舗 filter, reset it on scope change | FR-004, FR-005          |
| B3  | Row-action menu on withdrawal rows with 退会取り消し + the two disabled-state tooltips                   | FR-045 – FR-048         |
| B4  | List cancellation confirm dialog with its own copy + success toast                                       | FR-049 – FR-051         |
| B5  | `FilterResultBanner` with the `・`-joined summary and 条件をクリア                                       | FR-027 – FR-029         |
| B6  | Empty states — filtered vs. plain variants                                                               | FR-018                  |
| B7  | Detail page header — BackLink, "{name} さんの{type}申請", application-number badge, status badge         | FR-053 – FR-055         |
| B8  | Member head-up card                                                                                      | FR-057, FR-057a         |
| B9  | 休会・退会履歴 strip (seed-only)                                                                         | FR-069 – FR-074         |
| B10 | Page-size selector                                                                                       | FR-031                  |
| B11 | `cancellable` + `cancellation_blocked_reason` on the detail schema to drive B3/FR-078                    | FR-046 – FR-048, FR-078 |

### C. Must change (present but wrong)

| #   | Gap                                                                                                                                                        | Requirement           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| C1  | Column set/order — drop 申請ID and 種別 columns, reorder to 会員ID · 会員名 · ブランド · 店舗名 · ステータス · 申請日 · 予定日 · 終了日 · 未納金 · actions | FR-008                |
| C2  | 退会手数料 hardcoded `—`; needs a real withdrawal fee field                                                                                                | Q-07 / FR-067         |
| C3  | 未消化レッスン must be present for both types (mock supplies it for suspensions too)                                                                       | Q-07 / FR-068         |
| C4  | Identifiers — 会員ID shows the member number, 申請ID shows the application number                                                                          | Q-15 / FR-009, FR-058 |
| C5  | Detail member block must carry name kana, legacy member code, member type, contract name, face photo                                                       | Q-15 / FR-057         |
| C6  | Sticky table header                                                                                                                                        | FR-016                |
| C7  | Detail two-column 60/40 layout with a sticky right column                                                                                                  | FR-075, PAR087        |

### D. Deliberately unchanged

The 承認フロー timeline keeps its two-step / three-step shape with no current-step highlight (Q-03), and each cancellation dialog keeps its own V0 wording (Q-08). Sorting stays as built (Q-13 — see research.md §2).

## Project Structure

### Documentation (this feature)

```text
specs/024-leave-withdrawal-management/
├── spec.md              # Feature specification (2 clarify passes applied)
├── plan.md              # This file
├── research.md          # Phase 0 — decisions incl. the final two clarifications
├── data-model.md        # Phase 1 — entities, fields, state transitions
├── quickstart.md        # Phase 1 — manual verification checklist (no automated tests)
├── contracts/           # Phase 1 — endpoint contracts
│   ├── list-leaves.md
│   ├── leave-detail.md
│   └── cancel-withdrawal.md
├── checklists/
│   ├── requirements.md  # Spec quality checklist
│   └── parity.md        # 116 UI parity items vs. the V0 mockup
└── tasks.md             # Phase 2 — created by /speckit.tasks, NOT by this command
```

### Source Code (repository root)

```text
src/app/(private)/members/leaves/          # A-03 list  (exists — modify)
├── page.tsx
├── _components/
│   ├── leaves-filters.tsx                 # modify — banner, store scope, drop 処理完了
│   ├── leaves-table-columns.tsx           # modify — column set/order, row actions
│   ├── leaves-row-actions.tsx             # NEW — dropdown + guards + tooltips (B3)
│   └── leaves-cancel-dialog.tsx           # NEW — list confirm dialog (B4)
├── _constants/constants.ts                # modify — drop 処理完了 from list maps
├── _contexts/leaves-filters-context.tsx
└── _hooks/use-leaves-filters.ts           # modify — page size, store scope

src/app/(private)/members/leaves/[id]/     # A-03 detail (exists — modify)
├── page.tsx                               # modify — page header, 60/40 layout
└── _components/
    ├── leave-detail-info.tsx              # modify — 関連情報 fees, member fields
    ├── leave-status-action.tsx            # modify — strip approve/reject/execute
    ├── leave-detail-skeleton.tsx
    └── leave-member-headup.tsx            # NEW — head-up card (B8)

src/components/common/
└── suspension-history-strip.tsx           # NEW — shared strip (B9)

src/app/api/_schemas/leave.schema.ts       # modify — see contracts/
src/app/api/crm/leaves/
├── route.ts                               # modify — store scope, drop completed
├── [id]/route.ts                          # modify — expanded detail payload
├── [id]/cancel-withdrawal/route.ts        # modify — guard chain + blocked reasons
├── [id]/approve/route.ts                  # DELETE (A3)
├── [id]/reject/route.ts                   # DELETE (A3)
└── [id]/execute-withdrawal/route.ts       # DELETE (A3)

src/app/api/_mock-db/
├── types/member-leaves.type.ts            # modify — align with the new schema
├── tables/member-leave.table.ts           # NEW — table implementation
└── seeds/member-leave.seed.ts             # NEW — seed incl. suspension history
```

**Structure Decision**: Single Next.js App Router project. The feature keeps its existing home under `src/app/(private)/members/leaves/` with route-local `_components/` · `_hooks/` · `_contexts/` · `_constants/`, matching Constitution IV and the sibling `visit-experiences` and `entry-exit/history` screens. Only `suspension-history-strip.tsx` is promoted to `src/components/common/`, because A-01-01 renders the same strip — placing it route-locally would force a cross-route import.

## Complexity Tracking

> Filled only where the Constitution Check needs justification. No principle is violated; two items warrant a note.

| Item                                                | Why needed                                                                                 | Simpler alternative rejected because                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New shared component `suspension-history-strip.tsx` | FR-069 – FR-074 need a 12-month navigable strip; A-01-01 renders the identical component   | Building it route-locally under `leaves/[id]/_components/` would need a cross-route import from A-01-01 later, which the App Router `_`-prefix convention treats as private. Built from existing shadcn/ui `Card` / `Badge` / `Button` primitives — no new dependency. |
| New route-local component `leave-member-headup.tsx` | FR-057 needs the member head-up card, which no `src/components/common/` component provides | Reusing the A-01-01 member header is not possible — it does not exist as a shared component either. Kept route-local until a second consumer appears (YAGNI, Constitution V).                                                                                          |

**Mock-ahead-of-backend**: three fields/params this feature needs are absent from the real API today (`relatedInfo.unusedLessonCount` on the suspension detail; a list search parameter; an expanded member block on both details). Per the project's mock-first policy these are implemented in the mock with the real contract's semantics and raised with the client through the API QA process — see spec.md → Assumptions. This is not a constitution violation: Constitution II requires the mock and the generated client to stay behaviourally identical, which the mock-first approach preserves.
