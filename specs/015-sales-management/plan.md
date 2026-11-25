# Implementation Plan: Sales Management (F-01)

**Branch**: `015-sales-management` | **Date**: 2026-07-08 | **Spec**: [specs/015-sales-management/spec.md](spec.md)
**Input**: Feature specification from `/specs/015-sales-management/spec.md`

## Summary

Implement the three F-01 Sales Management screens — a store/month-scoped billing list with
summary KPIs, bulk confirm, and list-level simplified refund; a billing detail page for line
items, fee adjustments, refund requests, confirm/unconfirm, and receipt/invoice download; and a
manual (ad-hoc) billing registration form — on top of a net-new `billingRecords` /
`billingLineItems` / `feeAdjustments` / `refundRequests` mock-DB table set. The feature reuses
existing conventions end-to-end (mock-DB table factory pattern, `registerRoute`/OpenAPI/hey-api
pipeline, `RoleGatedButton` + a new `sales-permissions.ts` data-scope helper modeled on
`instructor-permissions.ts`, the existing CSV export pattern, and the list/detail/form page shapes
from `training-equipment`, `studios`, and `instructors`) rather than introducing new patterns. The
one genuinely new capability — receipt/invoice PDF generation (FR-013) — is delivered in Phase 1
as a real, gated download pipeline with a static placeholder PDF body, deferring an actual
PDF-rendering dependency decision to a future team consensus (see [research.md](research.md) §5).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4, nuqs
**Storage**: Phase 1 — `src/app/api/_mock-db/` (table/type/seed pattern, new `billing.type.ts`/`billing.table.ts`); Phase 2 — generated REST client via hey-api
**Target Platform**: Node.js ≥ 24.0.0, browser (web), desktop-focused (min viewport 768px)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: List/summary/detail render with skeleton-first paint; filter/search feedback <200ms against in-memory mock data (SC-001: locate a record via search/filter in under 15 seconds)
**Constraints**: Must not modify the existing member-scoped `crm/members/{id}/billing`, `.../payment-history`, `.../payment-summary` endpoints (live dependencies of the member detail page) — the new `billingRecords` table is additive and independent, not a replacement, in Phase 1 (research.md §1); role/data-scope enforcement (FR-005/FR-006) and every blocking rule (outstanding-balance, reason-required, confirmed-record-immutability) must be enforced server-side in the mock route handlers, not only client-side gating; receipt/invoice PDF content is a static Phase 1 placeholder — no new npm dependency is introduced without separate team consensus (research.md §5)
**Scale/Scope**: Three routes (list, detail, manual registration) backed by ~13 new mock API routes, ~20 new UI components across list/detail/register, one new mock-DB table set (4 sub-entities), one new permission-helper module; no new npm dependencies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                                                                                                                                                         |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | New types derived from Zod schemas in `billing.schema.ts`, per [data-model.md](data-model.md)                                                                                                                                                 |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | All new endpoints registered via `registerRoute()` before use, same as existing routes                                                                                                                                                        |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | `spec.md` and its checklist have zero open markers                                                                                                                                                                                            |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | List/detail pages are client components only because they need `nuqs`/React Query interactivity (same justification as every existing list/detail page in this codebase); manual registration is a single form, not a wizard (research.md §4) |
| V   | Simplicity & Min. Deps | ☒ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses `RoleGatedButton`, `csvFileResponse`/`buildCsv`, `DataTable`, `nuqs` filter-hook pattern, `instructor-permissions.ts` shape; PDF capability deliberately deferred rather than adding an unconsensed dependency (research.md §5)        |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — Phase 1 design (data-model.md, contracts/) enforces every
blocking rule (outstanding balance, required reasons, confirmed-record immutability, partial-
refund amount caps) server-side per the Constraints above, and introduces no new dependency or
abstraction beyond the `sales-permissions.ts` helper, which mirrors an existing precedent.

## Project Structure

### Documentation (this feature)

```text
specs/015-sales-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md         # Phase 1 output (/speckit.plan command)
├── contracts/            # Phase 1 output (/speckit.plan command)
│   ├── list-billing-records.md
│   ├── billing-detail.md
│   ├── billing-mutations.md
│   ├── manual-registration.md
│   └── accounting-export.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── _lib/
│   │   │   └── pdf.ts                                  # [NEW] pdfFileResponse, cloned from csv.ts
│   │   ├── _mock-db/
│   │   │   ├── assets/
│   │   │   │   └── placeholder-receipt.pdf             # [NEW] static Phase 1 PDF body
│   │   │   ├── types/
│   │   │   │   └── billing.type.ts                     # [NEW] BillingType — records/line items/adjustments/refunds
│   │   │   └── tables/
│   │   │       └── billing.table.ts                    # [NEW] createBillingTables(getDb) factory
│   │   ├── _schemas/
│   │   │   └── billing.schema.ts                       # [NEW] all Sales Management schemas
│   │   └── crm/
│   │       └── billing-records/
│   │           ├── route.ts                            # [NEW] GET list
│   │           ├── summary/route.ts                    # [NEW] GET summary
│   │           ├── confirm/route.ts                    # [NEW] PATCH bulk confirm
│   │           ├── manual/route.ts                     # [NEW] POST manual registration
│   │           ├── export/route.ts                     # [NEW] POST CSV export
│   │           ├── refund-requests/bulk/route.ts       # [NEW] POST list-level simplified refund
│   │           └── [id]/
│   │               ├── route.ts                        # [NEW] GET detail
│   │               ├── confirmation/route.ts           # [NEW] PATCH single confirm/unconfirm toggle
│   │               ├── line-items/route.ts             # [NEW] POST add line item
│   │               ├── line-items/[lineItemId]/receipt/route.ts # [NEW] GET receipt (PDF)
│   │               ├── fee-adjustments/route.ts        # [NEW] POST apply fee adjustment
│   │               ├── refund-requests/route.ts        # [NEW] POST refund request
│   │               └── invoice/route.ts                # [NEW] GET invoice (PDF)
│   └── (private)/
│       └── sales/
│           ├── page.tsx                                # [NEW] list page (summary + table + bulk actions)
│           ├── register/
│           │   └── page.tsx                            # [NEW] manual registration page
│           ├── [id]/
│           │   ├── page.tsx                            # [NEW] detail page
│           │   └── _components/                        # [NEW] basic-info/status/line-items/history cards,
│           │                                            #        add-line-item/fee-adjustment/refund dialogs
│           └── _components/                             # [NEW] summary, filters, list section, csv export
│                                                         #        button, bulk refund dialog, store-member
│                                                         #        picker, manual-registration-form/
└── lib/
    └── utils/
        └── sales-permissions.ts                         # [NEW] role/data-scope + action-gating helper
```

**Structure Decision**: Single Next.js App Router project, following the exact directory
convention already used by `training-equipment/` (list), `studios/` (detail), and `instructors/`
(form): route-local `_components/` per segment, a shared `manual-registration-form/` subfolder for
the create form, and mock persistence under `src/app/api/_mock-db/`. No new top-level directories
or packages. The three existing member-scoped billing endpoints under `crm/members/[id]/` are
left untouched.

**Implementation Order Note**: Build the `billing.schema.ts` schemas and `billing.type.ts`/
`billing.table.ts` mock table first (seeded from existing `members`/`stores` mock data), then the
read-path routes (list, summary, detail) and verify them against `contracts/`, then the mutation
routes, then the CSV export route, then the UI (list → detail → manual registration) — in that
order, per [quickstart.md](quickstart.md). After all Phase 1 mock routes and Zod schemas are
finalized, run `npm run generate-routes`, `npm run generate-openapi`, and `npm run generate-api`
in that order.

## Phase 0: Research & Unknown Resolution

Research completed in [specs/015-sales-management/research.md](research.md).

Resolved items:

- New `billingRecords`/`billingLineItems`/`feeAdjustments`/`refundRequests` mock tables are built
  fresh, not by extending the existing loose per-member mock arrays (`MOCK_BILLING_LIST`, etc.),
  which stay as-is backing their existing member-detail endpoints.
- `BillingRecord.outstanding_amount` becomes the single authoritative source for "member has an
  outstanding balance" checks (FR-009, FR-015), independent of the existing `Member.has_unpaid`/
  `UnpaidInfo.amount` fields.
- Role/permission model extends `Permission` enum + `ROLE_PERMISSIONS`, with a new
  `sales-permissions.ts` modeled directly on `instructor-permissions.ts`; the "individually
  delegated" Staff confirmation permission (FR-005) reuses the existing per-staff
  `staff_permissions: StaffPermissionRecord[]` mechanism rather than inventing a new one.
- The Store → Member cascading picker for manual registration (User Story 3) is a new composite
  component generalizing the existing brand→plan `resetField`-on-change pattern from
  `enrollment-form.tsx` — no such composite exists yet.
- Receipt/invoice PDF download (FR-013) ships in Phase 1 with real gating logic but a static
  placeholder PDF body, deferring a PDF-library dependency decision rather than adding one
  unilaterally (Constitution Principle V).
- Accounting CSV export (FR-007) reuses the existing `buildCsv`/`csvFileResponse` export pattern
  exactly, with an `entry_type` enum parameter for "individually or combined" output.
- List/detail/form page composition each map directly onto an existing precedent
  (`training-equipment`, `studios/[id]`, `instructors` form + status card + history tab) with no
  new UI pattern introduced.

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/015-sales-management/data-model.md](data-model.md)
- [specs/015-sales-management/contracts/list-billing-records.md](contracts/list-billing-records.md)
- [specs/015-sales-management/contracts/billing-detail.md](contracts/billing-detail.md)
- [specs/015-sales-management/contracts/billing-mutations.md](contracts/billing-mutations.md)
- [specs/015-sales-management/contracts/manual-registration.md](contracts/manual-registration.md)
- [specs/015-sales-management/contracts/accounting-export.md](contracts/accounting-export.md)
- [specs/015-sales-management/quickstart.md](quickstart.md)

Design highlights:

- `BillingRecord` carries `outstanding_amount` as a server-recomputed (never client-trusted) field
  on every amount-affecting mutation, closing the gap left by the existing per-contract/per-member
  partial signals (`UnpaidInfo`, `has_unpaid`).
- `SalesActionPermissions` matrix (data-model.md) is the single source of truth for both
  `RoleGatedButton` client gating and server-side route enforcement, avoiding drift — same
  discipline as `InstructorActionPermissions` in `014-instructor-management`.
- Every blocking rule from the spec (outstanding-balance block, required refund/adjustment
  reasons, confirmed-record immutability, partial-refund amount caps, receipt-download gating) is
  specified as a server-side check in `contracts/billing-mutations.md` and
  `contracts/manual-registration.md`, not left as a client-only affordance.
- `FeeAdjustment` and change-history entities are append-only, mirroring the existing
  `BrandChangeHistoryItemSchema` convention used across `brands`/`campaigns`/`instructors`/etc.
- Receipt/invoice download and CSV export both reuse existing file-response conventions
  (`csvFileResponse` as the template for a new `pdfFileResponse`), keeping the new PDF capability
  a thin, reviewable addition rather than a new subsystem.

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
