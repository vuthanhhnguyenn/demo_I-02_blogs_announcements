# Implementation Plan: Transfer Management Update (A-02)

> **Superseded (2026-10-05)**: this document describes the mock-API implementation round (prototype @ 1cc2d6d, 2026-07-18). The screen now runs on the real API-091 (`/admin/transfer-applications`, commit 4fe1f967) and the prototype @ 47423ec — free-word search, the 申請中 status, the 200-row page size and the 却下 wording are gone. Current behavior: [spec.md](spec.md) › _Prototype Alignment_ and [checklists/parity.md](checklists/parity.md). Kept as a historical record.

**Branch**: `024-transfer-management` | **Date**: 2026-08-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-transfer-management/spec.md`

## Summary

The transfer management feature already ships at `src/app/(private)/members/transfers/**`. It was built before the permission system existed and before the shared table/filter/header components were reworked, so it now diverges from A-02 v260527_v2 and the 2026-07-18 V0 mockups in three ways:

1. **No real authorization.** The only in-feature check decodes the session JWT in the browser and **falls back to `role: 'headquarter'`** when the cookie is missing or undecodable — an unauthenticated viewer is silently promoted to the highest privilege. The list screen has no gating at all, and every transfer API route is unauthenticated, unscoped, and returns all stores' data to anyone.
2. **Missing spec surface.** No 自動移籍可否 column, no auto-transfer eligibility model, no exclusion alerts, no manual-override flow, no bulk approve, no page-size selector, no filter-result banner, no proper empty state.
3. **Stale shared components.** Hand-rolled page header, hand-rolled status card, older `TablePagination`, `DataTable` without row selection — all superseded by current shared components.

Underneath, four latent defects make parts of the spec untestable: JOYFIT transfers dead-end at the intermediate state, **nothing ever reaches 完了** (no auto-execution, so the member's contracted store is never actually updated — the feature's entire purpose), approve/reject comments are discarded, and non-seeded transfers get a brand-incorrect approval timeline.

**Approach**: five sequential workstreams — contract/data model first (it forces every stale reference to surface via `tsc`), then permissions, then the two screens, then the exception flows. Delivery order maps to the spec's P1/P2/P3 user stories so each stage is independently demonstrable.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-explicit-any`)
**Primary Dependencies**: Next.js 16 (App Router), React 19, shadcn/ui (Radix/base-ui), TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4 (`ja`), `nuqs` (URL filter state)
**Storage**: Phase 1 — in-memory mock DB at `src/app/api/_mock-db/` (a `globalThis` singleton; seed edits need a full dev-server restart). Phase 2 — generated REST client via hey-api
**Target Platform**: Node.js ≥ 24.0.0, browser (web), min viewport 768px
**Project Type**: Web application — Next.js App Router frontend with co-located mock API route handlers
**Performance Goals**: Standard CRM list expectations — list interaction feels instant at the 200-row max page size; `placeholderData: keepPreviousData` so pagination/filtering never blanks the table
**Constraints**: No new npm dependencies. No automated tests (constitution No Testing Policy) — QA is [quickstart.md](./quickstart.md) + code review. `src/lib/api/**` changes only by regeneration
**Scale/Scope**: 2 screens (list + detail), 6 API endpoints (2 new), ~20 existing files touched, 14 seed rows, 63 UI parity items, 15 functional requirements

**No `NEEDS CLARIFICATION` markers remain.** One item is flagged for PO confirmation (status semantics, research.md Decision 1) but every workstream is independent of the answer.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check | Notes                                                                                                                                                                                                                                                       |
| --- | ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑     | No `any`. The hand-declared status union at `transfer-status-badge.tsx:7` is **deleted** — all statuses come from `types.gen.ts`. Removing the `approved` value makes `tsc --noEmit` surface every stale reference, which is the intended forcing function. |
| II  | OpenAPI-First          | ☑     | Zod schema → OpenAPI → regenerated client, in that order. `src/lib/api/**` never hand-edited. Two new endpoints declared in the schema + route registry before any UI consumes them.                                                                        |
| III | Spec-Driven            | ☑     | `spec.md` complete, quality checklist passed first pass, zero `[NEEDS CLARIFICATION]`. `plan.md` precedes `tasks.md`.                                                                                                                                       |
| IV  | App Router & Simple UX | ☑     | Route-local code stays in `_components/` / `_hooks/` / `_contexts/`; `_utils/` added for the pure permission helper. `'use client'` justified per file. shadcn/ui + Tailwind only. No new modal beyond the four the V0 specifies.                           |
| V   | Simplicity & Min. Deps | ☑     | Zero new packages. `MemberHeadupCard` is extracted rather than duplicated (2 consumers), and the original inline copy is migrated in the same change so no divergent copy is left behind.                                                                   |

**Post-Phase-1 re-check**: still passing. One thing to watch — Decision 1 removes an enum value from a generated type, which is a wider blast radius than a pure addition. That is deliberate (it prevents an unreachable status from lingering) and is contained by `tsc --noEmit` gating the UI work.

## Project Structure

### Documentation (this feature)

```text
specs/024-transfer-management/
├── spec.md                      # Feature specification
├── plan.md                      # This file
├── research.md                  # Phase 0 — 14 decisions
├── data-model.md                # Phase 1 — entities, state machine, scoping
├── contracts/transfers-api.md   # Phase 1 — 6 endpoints
├── quickstart.md                # Phase 1 — manual QA checklist (the QA artifact)
├── checklists/
│   ├── requirements.md          # Spec quality gate — passed
│   └── parity.md                # 63 V0 parity items (PAR001–PAR063)
└── tasks.md                     # Phase 2 — created by /speckit.tasks, NOT by this command
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (private)/members/transfers/          # ── the feature (exists, being updated)
│   │   ├── page.tsx                          # M  migrate to PageHeader + Card spine
│   │   ├── _components/
│   │   │   ├── transfer-filters.tsx          # M  + 自動移籍 filter, API stores, fix 'all ' bug
│   │   │   ├── transfer-table-columns.tsx    # M  + checkbox/会員ID/ブランド/自動移籍可否 cols
│   │   │   ├── transfer-bulk-approve-bar.tsx # +  selection bar
│   │   │   ├── transfer-bulk-approve-dialog.tsx # +
│   │   │   └── transfer-auto-badge.tsx       # +  eligibility badge + tooltips
│   │   ├── _hooks/use-transfer-filters.ts    # M  + auto_transfer, store scope, pageSize
│   │   ├── _contexts/transfer-filters-context.tsx  # M
│   │   ├── _constants/constants.ts           # +  status labels/classes/tones
│   │   ├── _utils/transfer-permission.util.ts # +  pure canActOnTransfer
│   │   └── [id]/
│   │       ├── page.tsx                      # M  BackLink + head-up card
│   │       └── _components/
│   │           ├── transfer-detail-info.tsx      # M  field order per V0
│   │           ├── transfer-approval-flow.tsx    # M
│   │           ├── transfer-status-action.tsx    # M  → StatusCard, DELETE the JWT helper
│   │           ├── transfer-status-badge.tsx     # M  drop hand-declared union
│   │           ├── transfer-approve-dialog.tsx   # M
│   │           ├── transfer-reject-dialog.tsx    # M
│   │           ├── transfer-exclusion-alert.tsx  # +
│   │           ├── transfer-unlock-dialog.tsx    # +
│   │           └── transfer-detail-skeleton.tsx  # M
│   └── api/
│       ├── _schemas/transfer.schema.ts       # M  statuses, eligibility, 2 new bodies
│       ├── _scripts/register-schemas.ts      # M
│       ├── _routes/index.ts                  # M  declare 2 new routes
│       ├── _mock-db/
│       │   ├── types/transfers.type.ts       # M
│       │   ├── seeds/transfer.seed.ts        # M  remap statuses, eligibility fixtures
│       │   └── tables/transfer.table.ts      # M  state machine, auto-exec, persist comment
│       └── crm/
│           ├── transfers/route.ts            # M  auth + OR-store scope + auto_transfer
│           ├── transfers/[id]/route.ts       # M  auth + scope (404 out of scope)
│           ├── transfers/[id]/approve/route.ts # M  auth + rights + 409 + auto-exec
│           ├── transfers/[id]/reject/route.ts  # M  auth + rights + persist comment
│           ├── transfers/bulk-approve/route.ts # +  NEW
│           ├── transfers/[id]/unlock/route.ts   # +  NEW
│           └── members/[id]/transfer/route.ts  # M  populate eligibility, brand-aware history
├── components/common/member-headup-card.tsx  # +  extracted, shared with member detail
├── types/permission.type.ts                  # M  +3 Permission members
└── constants/permission.constants.ts         # M  grant per A-02 権限マトリクス
```

`+` = new, `M` = modified. **Structure Decision**: keep the existing App Router layout unchanged — route-local `_components/_hooks/_contexts` per Constitution IV, adding `_constants/` and `_utils/` subfolders that other features already use. Only `MemberHeadupCard` graduates to `src/components/common/`, justified by two consumers.

---

## Gap Analysis

The heart of this plan. Each row is a spec/V0 requirement vs. what exists today.

### List screen

| #      | Requirement                                                                                     | Today                                                                    | Action                                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 | Columns: 会員ID, 会員名, ブランド, 移籍元, 移籍先, 申請日, 移籍予定日, 自動移籍可否, ステータス | 8 cols; shows 申請ID **instead of** 会員ID; no ブランド, no 自動移籍可否 | Rewrite column defs; add 3, reorder                                                                                                |
| FR-002 | 6 filters incl. 自動移籍                                                                        | 5 filters, correct set otherwise                                         | Add `auto_transfer`; fix the `'all '` clearing bug (`transfer-filters.tsx:133`); source stores from API instead of the hardcoded 8 |
| FR-003 | Search by request ID or member name                                                             | ✅ works (debounced 500ms)                                               | Keep                                                                                                                               |
| FR-004 | Store scoping by role                                                                           | ❌ none — every role sees every store                                    | Add `useCurrentStore` client scope + OR-across-both-sides server scope                                                             |
| FR-005 | Row → detail                                                                                    | ✅ works                                                                 | Keep; ensure checkbox/action cells stop propagation                                                                                |
| FR-006 | Eligibility badges + tooltips                                                                   | ❌ absent                                                                | New `transfer-auto-badge.tsx`; needs the data model first                                                                          |
| FR-013 | Bulk approve                                                                                    | ❌ absent                                                                | Row selection + selection bar + dialog + endpoint                                                                                  |
| FR-014 | Page-size selector, count + range                                                               | `TablePagination`, no selector, fixed 25                                 | Swap to `TablePaginationWithSize` (25/50/100/200)                                                                                  |
| FR-015 | Empty state, filtered vs empty                                                                  | bare `データがありません`                                                | `Empty` via `emptyContent` + 条件をクリア                                                                                          |
| PAR001 | `PageHeader` with count badge                                                                   | hand-rolled `h1` + Badge                                                 | Migrate — note `PageHeader` has **no** `count`/`outside` prop; count goes through `badge`                                          |
| PAR015 | Filter result banner                                                                            | not used                                                                 | Add `FilterResultBanner` inside the Card                                                                                           |

### Detail screen

| #          | Requirement                               | Today                                                        | Action                                                                                          |
| ---------- | ----------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| FR-007     | Brand-branched timeline, 3 vs 4 steps     | ✅ renders `approval_history`; header note branches by brand | Keep rendering; **fix generation** — `create()` hardcodes 3 FIT365-shaped steps for every brand |
| FR-006     | Exclusion alerts (unpaid / campaign lock) | ❌ absent                                                    | New `transfer-exclusion-alert.tsx`                                                              |
| FR-012     | Manual override + required reason         | ❌ absent                                                    | New `transfer-unlock-dialog.tsx` + endpoint                                                     |
| FR-008     | Approve/reject + optional comment         | ✅ dialogs exist                                             | Keep UI; **persist** the comment (currently discarded)                                          |
| PAR041     | `BackLink` 移籍管理に戻る                 | `BreadcrumbNav`                                              | Swap to `BackLink` (single level)                                                               |
| PAR046     | Member head-up card                       | ❌ absent                                                    | Extract shared `MemberHeadupCard`, migrate member detail too                                    |
| PAR051     | Info field order per V0                   | close but not identical                                      | Reorder                                                                                         |
| PAR059-061 | Shared `StatusCard` with action slot      | hand-rolled Card                                             | Swap to `StatusCard`                                                                            |

### Permissions — the largest gap

| #      | Requirement                           | Today                                                                                 | Action                                                                        |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| FR-004 | Role-scoped visibility                | page-level `MembersTransfersView` only                                                | Keep the page gate; add store scoping both sides                              |
| FR-008 | HQ/System/Manager/Staff may approve   | JWT-decoding helper, **fails open to `headquarter`**                                  | Delete it; `useAuthUser()` + `RoleGatedButton`; new `MembersTransfersApprove` |
| FR-009 | Trainer no access, Observer read-only | ✅ Trainer excluded from view perm; Observer blocked only by the fragile client check | Enforce via permission + server-side 403                                      |
| FR-013 | Bulk approve HQ/System/Manager        | ❌                                                                                    | New `MembersTransfersBulkApprove`                                             |
| FR-012 | Unlock HQ/System/Manager              | ❌                                                                                    | New `MembersTransfersUnlock`                                                  |
| SC-005 | 100% of denied attempts blocked       | ❌ **no API route authenticates**                                                     | Auth + role + row-eligibility checks on all 6 endpoints                       |
| —      | List row actions gated                | ❌ no gating in the row menu                                                          | `RoleGatedMenuItem`; hide the trigger when every item is denied               |

### Data / API

| #      | Requirement                | Today                                                                        | Action                                                            |
| ------ | -------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| —      | 5 statuses matching FR-001 | 5 values, misaligned (`approved` redundant, no 移籍元承認待ち)               | Remap: add `from_store_pending`, drop `approved` (research.md D1) |
| FR-006 | Eligibility fields         | absent                                                                       | Add 5 fields + `unpaid_period`                                    |
| FR-008 | Comment persisted          | **discarded** (`transfer.table.ts:93,126`)                                   | Add `decisions[]`                                                 |
| FR-012 | Unlock audit               | absent                                                                       | Add `unlock`                                                      |
| FR-010 | JOYFIT auto-execution      | **no path ever sets `completed`**; JOYFIT dead-ends at `from_store_approved` | Fix the state machine; **update the member's contracted store**   |
| FR-011 | FIT365 two-stage           | ✅ partially                                                                 | Verify against the corrected machine                              |
| FR-013 | Bulk endpoint              | absent                                                                       | `POST /transfers/bulk-approve`                                    |
| FR-012 | Unlock endpoint            | absent                                                                       | `PATCH /transfers/{id}/unlock`                                    |

---

## Workstreams

Sequential — each depends on the previous. Detailed task breakdown comes from `/speckit.tasks`.

### WS1 — Contract & data model _(blocks everything)_

Zod schema → register → route registry → regenerate client. Status remap, eligibility fields, `decisions[]`, `unlock`, two new request bodies. Then mock-db: brand-aware history builder shared by seed and `create()`, corrected state machine with JOYFIT auto-execution and the contracted-store side effect, comment persistence, and seed fixtures covering all five statuses plus eligible / unpaid / campaign-lock / **both-reasons** rows.

**Gate**: `npx tsc --noEmit` exits 0. Removing `approved` surfaces every stale reference here rather than at runtime.

### WS2 — Permissions _(blocks UI gating)_

Three `Permission` members; grants per the A-02 権限マトリクス; pure `canActOnTransfer` helper in `_utils/`; **delete `getCurrentUserRole()`**. Server side: auth on all 6 endpoints, OR-across-both-stores scoping on list/detail, role + row-eligibility checks on the four mutations, 403/404/409 as specified.

**Gate**: quickstart §A passes, including the direct-API-call checks.

### WS3 — List screen _(spec User Story 1, P1)_

Migrate to the current spine: `PageHeader` → `Card` → filters → `FilterResultBanner` → `DataTable` → `TablePaginationWithSize`. New column set with `BrandBadge` and the eligibility badge; `Empty` via `emptyContent`; `RoleGatedMenuItem` row actions; the 自動移籍 filter; the `'all '` fix; API-sourced store options. Memoize columns. Errors → `sonner` toast, **not** `DataStateBoundary`.

**Gate**: quickstart §B–D; PAR001–PAR037 minus the bulk items.

### WS4 — Detail screen _(spec User Story 2, P2)_

`BackLink`; extracted `MemberHeadupCard` (and migrate `members/[id]/page.tsx` onto it); reordered info card; shared `StatusCard` with `RoleGatedButton` actions and the 移籍先として承認 label variant; timeline verified 3-vs-4 for both brands including non-seeded transfers; comment persistence surfaced.

**Gate**: quickstart §F–G; PAR041–PAR046, PAR051–PAR063.

### WS5 — Exception flows _(spec User Story 3, P3)_

Exclusion alerts with the 売上詳細 link; unlock dialog with required-reason validation and the locked → unlocked alert swap; bulk selection bar, dialog, `enableRowSelection` guard, and partial-failure reporting.

**Gate**: quickstart §D–E, §G unlock items; PAR011–PAR014, PAR020, PAR028–PAR030, PAR038–PAR040, PAR047–PAR050.

---

## Risks

| Risk                                                         | Mitigation                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Removing the `approved` status breaks unrelated code         | `tsc --noEmit` gate at the end of WS1 enumerates every reference before UI work starts                  |
| Client regeneration drifts from hand-written types           | Constitution II: schema first, regenerate, then consume. Never edit `src/lib/api/**`                    |
| Extracting `MemberHeadupCard` regresses member detail        | Migrate both consumers in the same change; quickstart §F verifies both                                  |
| Mock-db seed edits appear to have no effect                  | Documented in quickstart: `globalThis` singleton needs a **full** dev-server restart, not HMR           |
| Store-scope OR semantics differ from every other feature     | Isolated in one `resolveStoreScope`-shaped helper, modelled on `entry-exit-logs/history/route.ts:28-48` |
| Another session mutating the shared mock DB mid-verification | Prefer purpose-seeded fixture rows for identity-sensitive checks                                        |
| PO reverses the status decision                              | Only `from_store_pending` is affected; all five workstreams stand either way                            |

## Complexity Tracking

No constitution violations to justify — all five principles pass. Two deliberate deviations from the V0 source, recorded so they are not mistaken for parity misses:

| Deviation                                                           | Why                                                                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageHeader` receives `badge`, not the V0's `count`/`outside` props | Those props don't exist on this repo's `PageHeader`; the count renders as a `Badge` node                                                                                              |
| The V0's demo brand-switch control (PAR045) is **not** implemented  | It is a mockup affordance for previewing both brands on one page; real detail pages derive brand from the record. PAR045 should be struck from the parity checklist rather than built |
