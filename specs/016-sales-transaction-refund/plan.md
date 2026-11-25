# Implementation Plan: Sales Transaction History, Receivables, and Refund Management (F-01-01/02/03)

**Branch**: `016-sales-transaction-refund` | **Date**: 2026-07-13 | **Spec**: [specs/016-sales-transaction-refund/spec.md](spec.md)
**Input**: Feature specification from `/specs/016-sales-transaction-refund/spec.md`

## Summary

Implement the three F-01 supplementary list screens — a store-scoped transaction ledger
(入出金明細) with refund initiation, a receivables screen (請求・未回収管理) with an unpaid-balances
tab (convenience-store payment issuance, bad-debt exclusion) and an upcoming-billing tab (SBPS/JACCS
summary + bulk confirm), and a refund approval queue (返金手続き一覧) with hierarchical
approve/reject — by **extending** the `billingRecords` mock-DB table set and `sales-permissions.ts`
helper already built for `015-sales-management` (fully implemented; see Phase 0 research), rather
than introducing a parallel data store. The three target pages
(`src/app/(private)/sales/{transactions,receivables,refunds}/page.tsx`) already exist as
"under construction" placeholders wired into navigation — this feature replaces their bodies. New
work is: (1) derived read-model query methods on the existing billing table (transaction ledger,
unpaid aggregation, upcoming-billing projection), (2) new `BillingRecord` fields for bad-debt
exclusion and receivable status, (3) new `RefundRequest` fields (`requester_role`,
`approver_id/name/role`, `approved_at`) plus genuinely new hierarchical-approval logic (Staff→
Manager+, Manager→HQ+, HQ→System-only) that has no precedent in 015, and (4) the corresponding new
mock API routes and UI, reusing the existing single-billing-record refund-request endpoint,
`RoleGatedButton`/`RoleGatedMenuItem`, the `Sheet`-based detail-panel pattern
(`slot-detail-sheet.tsx`), and `buildCsv`/`csvFileResponse` verbatim.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4, nuqs
**Storage**: Phase 1 — extend `src/app/api/_mock-db/types/billing.type.ts` / `tables/billing.table.ts` / `_schemas/billing.schema.ts` (no new table set); Phase 2 — generated REST client via hey-api
**Target Platform**: Node.js ≥ 24.0.0, browser (web), desktop-focused (min viewport 768px)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: List/detail render with skeleton-first paint; filter/search feedback <200ms against in-memory mock data (SC-001: locate a transaction via search/filter in under 15 seconds)
**Constraints**: MUST NOT modify `crm/members/{id}/{billing,payment-history,payment-summary}` — these are separate, static, member-detail-page mock arrays (`MOCK_BILLING_LIST`/`MOCK_PAYMENT_HISTORY`/`getPaymentSummary` in `member.seed.ts`), left untouched by 015 and by this feature too (research.md §1); every blocking/authorization rule (bad-debt-exclusion reason required, hierarchical refund-approval check, delegated upcoming-billing confirm permission, store data-scope) MUST be enforced server-side in the mock route handlers, not only via client-side `RoleGatedButton` gating (same discipline as 015); no new npm dependency
**Scale/Scope**: Three routes (fill in existing placeholder pages), ~10 new/extended mock API routes, ~18 new UI components across the three screens' `_components/`, extensions to one existing mock-DB table set (no new table), extensions to one existing permission helper (no new helper module unless hierarchical-approval logic proves large enough to warrant `refund-permissions.ts` — see research.md §3)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                                                                                                                           |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | New types extend `billing.schema.ts` Zod schemas (`TransactionRecordSchema`, `UnpaidReceivableSchema`, `UpcomingBillingEntrySchema`, `RefundRequestSchema` field additions), per [data-model.md](data-model.md) |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | All new endpoints registered via `registerRoute()` before use, matching every existing `crm/billing-records/**` route                                                                                           |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | `spec.md` and its checklist have zero open markers                                                                                                                                                              |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | List/tab/sheet pages are client components only because they need `nuqs`/React Query interactivity (same justification as every existing list page); receivables screen reuses `Tabs`, not two routes           |
| V   | Simplicity & Min. Deps | ☒ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses `billingRecords` table, `sales-permissions.ts`, `RoleGatedButton`/`RoleGatedMenuItem`, `buildCsv`/`csvFileResponse`, `slot-detail-sheet.tsx` Sheet pattern; no parallel data store introduced            |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — Phase 1 design (data-model.md, contracts/) keeps every new
blocking rule (bad-debt-exclusion reason requirement, hierarchical refund-approval authority,
delegated upcoming-billing confirm permission, partial-refund amount caps already covered by 015)
as a server-side check, and adds no new dependency or top-level abstraction — the one new module,
`refund-approval.ts`, is a narrow, single-purpose extension of the existing `sales-permissions.ts`
precedent (see Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/016-sales-transaction-refund/
├── plan.md               # This file (/speckit.plan command output)
├── research.md            # Phase 0 output (/speckit.plan command)
├── data-model.md          # Phase 1 output (/speckit.plan command)
├── quickstart.md          # Phase 1 output (/speckit.plan command)
├── contracts/             # Phase 1 output (/speckit.plan command)
│   ├── transaction-ledger.md
│   ├── receivables.md
│   ├── upcoming-billing.md
│   └── refund-approval.md
├── checklists/
│   └── requirements.md
└── tasks.md               # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   ├── types/
│   │   │   │   └── billing.type.ts                          # [EXTEND] add getTransactionLedger,
│   │   │   │                                                 #   getUnpaidReceivables, getUpcomingBilling,
│   │   │   │                                                 #   issueConveniencePayment, setBadDebtExclusion,
│   │   │   │                                                 #   decideRefundRequest, decideBulkRefundRequests,
│   │   │   │                                                 #   getRefundQueue methods
│   │   │   └── tables/
│   │   │       └── billing.table.ts                          # [EXTEND] implement the above; seed next-month
│   │   │                                                      #   unconfirmed records + requester_role on seeded
│   │   │                                                      #   refund requests
│   │   ├── _schemas/
│   │   │   └── billing.schema.ts                              # [EXTEND] TransactionRecordSchema,
│   │   │                                                       #   UnpaidReceivableSchema, UnpaidLineItemSchema,
│   │   │                                                       #   UpcomingBillingEntrySchema,
│   │   │                                                       #   RefundRequesterRoleSchema,
│   │   │                                                       #   RefundRequestSchema field additions
│   │   │                                                       #   (requester_role, approver_id/name/role,
│   │   │                                                       #   approved_at), BillingRecord field additions
│   │   │                                                       #   (bad_debt_excluded, bad_debt_exclusion_reason,
│   │   │                                                       #   bad_debt_excluded_by/at, receivable_status)
│   │   └── crm/
│   │       └── billing-records/
│   │           ├── transactions/route.ts                      # [NEW] GET ledger list (FR-001/002)
│   │           ├── transactions/export/route.ts                # [NEW] POST CSV export (FR-003)
│   │           ├── receivables/route.ts                        # [NEW] GET unpaid list (FR-006)
│   │           ├── receivables/[memberId]/route.ts             # [NEW] GET unpaid-detail (FR-007)
│   │           ├── receivables/convenience-payment/route.ts     # [NEW] POST issue link, single/bulk (FR-008)
│   │           ├── receivables/bad-debt-exclusion/route.ts       # [NEW] POST exclude/release (FR-010)
│   │           ├── upcoming-billing/route.ts                    # [NEW] GET list + SBPS/JACCS summary (FR-011/012)
│   │           │                                                 #   (bulk confirm reuses existing
│   │           │                                                 #   crm/billing-records/confirm/route.ts, FR-013)
│   │           └── refund-requests/
│   │               ├── route.ts                                # [NEW] GET refund queue (FR-014/015)
│   │               ├── [id]/decision/route.ts                   # [NEW] POST approve/reject single (FR-016/017/019)
│   │               ├── bulk-decision/route.ts                    # [NEW] POST approve/reject bulk (FR-018/019)
│   │               └── export/route.ts                           # [NEW] POST refund CSV (FR-020)
│   └── (private)/
│       └── sales/
│           ├── transactions/
│           │   ├── page.tsx                                    # [FILL IN] replaces "Construction" placeholder
│           │   └── _components/                                 # [NEW] filters, table, refund-request-dialog
│           │                                                     #   (reuses existing POST .../[id]/refund-requests)
│           ├── receivables/
│           │   ├── page.tsx                                     # [FILL IN] Tabs: 未回収一覧 / 翌月請求予定
│           │   └── _components/                                  # [NEW] unpaid-table, unpaid-detail-sheet,
│           │                                                      #   convenience-payment-dialog,
│           │                                                      #   bad-debt-exclusion-dialog, upcoming-table,
│           │                                                      #   upcoming-summary-cards, confirm-dialog
│           └── refunds/
│               ├── page.tsx                                     # [FILL IN] replaces "Construction" placeholder
│               └── _components/                                  # [NEW] pending-banner, refund-table,
│                                                                  #   refund-detail-sheet, decision-dialog,
│                                                                  #   bulk-action-bar, refund-csv-export-button
└── lib/
    └── utils/
        └── refund-approval.ts                                    # [NEW] canApproveRefund(currentRole,
                                                                    #   requesterRole) + requiredApproverLabel();
                                                                    #   promotes the logic already prototyped
                                                                    #   client-side in the UI mock into a shared,
                                                                    #   server-enforced module (research.md §3)
```

**Structure Decision**: Single Next.js App Router project. The three target routes
(`sales/transactions`, `sales/receivables`, `sales/refunds`) already exist as placeholder pages
registered in navigation and `PAGE_PERMISSIONS`/routing — this feature fills in their bodies rather
than creating new routes or directories. All new mock-DB logic extends the existing
`billing.type.ts`/`billing.table.ts`/`billing.schema.ts` trio from `015-sales-management` (single
authoritative `billingRecords` table), following that feature's own precedent of leaving the
legacy member-scoped mock endpoints (`crm/members/[id]/{billing,payment-history,payment-summary}`)
untouched. Only one new shared module is introduced (`refund-approval.ts`), justified below.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation                       | Why Needed                                                                                                                                                                        | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New module `refund-approval.ts` | Hierarchical refund-approval authority (Staff→Manager+, Manager→HQ+, HQ→System-only) is genuinely new logic with no equivalent in `sales-permissions.ts`'s flat allow-list checks | Adding a `requesterRole`-aware branch directly inside `canPerformSalesAction`'s existing `'refund'` case would overload a function whose contract elsewhere is a flat `(role, action) → boolean` check; a small dedicated function is clearer and matches the client-side logic it must mirror server-side |

## Phase 0: Research & Unknown Resolution

Research completed in [specs/016-sales-transaction-refund/research.md](research.md).

Resolved items:

- `015-sales-management` is **fully implemented** (all 52 tasks complete, real code at every
  planned path) — this feature builds directly on its `billingRecords` mock table rather than
  starting from a spec-only base.
- The three target pages already exist as wired-in "under construction" placeholders
  (`sales/transactions`, `sales/receivables`, `sales/refunds`); no new routing/navigation/
  `PAGE_PERMISSIONS` entries are needed beyond what 015 likely already registered for these paths
  (verify during Phase 1 and add if missing) — this feature only replaces page bodies.
- Transaction Record, Unpaid Receivable, Unpaid Line Item, and Upcoming Billing Entry are **derived
  read-models**, not new persisted tables: they are computed from the existing `_rows`
  (`BillingRecord[]`), `_lineItems` (`BillingLineItem[]`), and `_refundRequests`
  (`RefundRequest[]`) arrays already inside `billing.table.ts`, keeping `outstanding_amount` and
  `confirmation_status` as the single authoritative source per member/record (same discipline
  015's own research.md established for `outstanding_amount`).
- `RefundRequest` needs new fields with no current equivalent: `requester_role` (captured at
  request time), `approver_id`/`approver_name`/`approver_role`, `approved_at`. The existing
  `requested_by` (string name) is retained; `requester_role` is additive.
- `BillingRecord` needs new fields for receivable-management state, absent today:
  `bad_debt_excluded: boolean`, `bad_debt_exclusion_reason: string | null`,
  `bad_debt_excluded_by: string | null`, `bad_debt_excluded_at: string | null`, and a
  `receivable_status` enum (`'uncollected' | 'rebilling' | 'convenience_payment_in_progress' |
'bad_debt_target' | 'bad_debt_excluded'`) distinct from the existing `confirmation_status`/
  `refund_status` enums, since none of those three represent "collections workflow stage."
- "Upcoming billing" (next month, not yet confirmed) has no existing seed concept — today's
  `unconfirmed` records represent the _current_ month only. `billing.table.ts`'s seed function
  must be extended to also generate a next-month batch of `confirmation_status: 'unconfirmed'`
  records (mirroring the "月次請求金額算出" batch described in F-01 FR-002), including some with a
  rolled-over unpaid amount, so the upcoming-billing tab has realistic data to confirm.
- Hierarchical refund approval (Staff request → Manager-or-above approves; Manager request → HQ-or-
  above; HQ request → System only) is genuinely new — `sales-permissions.ts`'s `'refund'` action
  today is a flat allow-list with no requester/approver relationship. The exact rule is already
  prototyped client-side in the UI mock's `canApproveRefund(currentRole, requesterRole)` helper
  (`pages/sales-refund-list.tsx`); Phase 1 promotes this into a new, small, server-enforced
  `src/lib/utils/refund-approval.ts` module reused by both the API route and the `RoleGatedButton`/
  `RoleGatedMenuItem` client checks, so the rule is defined exactly once (Constitution Principle V).
- The single-billing-record refund-request creation endpoint
  (`POST /crm/billing-records/{id}/refund-requests`, built for 015's detail-page refund dialog) is
  reused as-is for this feature's transaction-list refund-initiation flow (FR-004/005) — no new
  refund-creation endpoint is needed, only new refund-**decision** endpoints (approve/reject).
- The existing bulk-confirm endpoint (`POST /crm/billing-records/confirm`, built for 015's list
  bulk-confirm action) is reused as-is for the upcoming-billing tab's "confirm all" action
  (FR-013) — the upcoming-billing screen supplies the relevant record ids; no new confirm endpoint
  is needed.
- New `Permission` enum entries are additive: `SalesTransactionsView`, `SalesReceivablesView`,
  `SalesBadDebtExclude`, `SalesConvenienceIssue`, `SalesRefundApprove`, `SalesRefundExport` — added
  to `permission.type.ts`, `ROLE_PERMISSIONS` (`permission.constants.ts`), and `PAGE_PERMISSIONS`
  for the three routes if not already present.
- CSV export (transaction ledger export FR-003, refund export FR-020) reuses
  `buildCsv`/`csvFileResponse`/`csvDateStamp` from `src/app/api/_lib/csv.ts` exactly, following the
  precedent in `crm/billing-records/export/route.ts`.
- The unpaid-detail and refund-detail side panels reuse the existing `Sheet`-based detail-drawer
  pattern from `src/app/(private)/lockers/[id]/_components/slot-detail-sheet.tsx` (480px panel,
  sectioned info blocks separated by full-bleed `Separator`, footer action buttons) rather than
  introducing a new detail-panel convention.
- Auth/role resolution remains the Phase 1 mock convention used throughout `crm/billing-records/**`
  today: a hardcoded `MOCK_ROLE: StaffRole` constant per route handler (real auth context deferred
  to Phase 2), with `resolveSalesDataScope`/`canPerformSalesAction`/the new `canApproveRefund`
  applied against it identically to production logic — so no route ships with weaker enforcement
  than its eventual real-auth form.

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/016-sales-transaction-refund/data-model.md](data-model.md)
- [specs/016-sales-transaction-refund/contracts/transaction-ledger.md](contracts/transaction-ledger.md)
- [specs/016-sales-transaction-refund/contracts/receivables.md](contracts/receivables.md)
- [specs/016-sales-transaction-refund/contracts/upcoming-billing.md](contracts/upcoming-billing.md)
- [specs/016-sales-transaction-refund/contracts/refund-approval.md](contracts/refund-approval.md)
- [specs/016-sales-transaction-refund/quickstart.md](quickstart.md)

Design highlights:

- All four new read-models (Transaction Record, Unpaid Receivable + Unpaid Line Item, Upcoming
  Billing Entry, Refund Queue entry) are specified in `data-model.md` as **computed views** over
  the existing `BillingRecord`/`BillingLineItem`/`RefundRequest` entities, with the exact
  derivation rule for each field (e.g., a Transaction Record's `status` maps from
  `BillingRecord.confirmation_status`/`outstanding_amount`/a canceled flag; JACCS subrogation
  eligibility on an Unpaid Line Item is computed from `billing_month` being within the 3 most
  recent unpaid months for that member) — no field is duplicated as separately-written state where
  it can be derived.
- `receivable_status` and the bad-debt-exclusion fields are the only genuinely new **persisted**
  fields on `BillingRecord`; every other new "entity" in this feature is a query result, not a new
  row shape, keeping the single-source-of-truth discipline from 015's own research.md.
- The hierarchical refund-approval rule and its required-confirmation-dialog step are specified as
  server-side checks in `contracts/refund-approval.md`, mirroring exactly the client-side rule
  already prototyped in the UI mock — the mock is the acceptance oracle, not just a visual
  reference.
- Bulk actions (upcoming-billing confirm, refund bulk-decision) always return which ids were
  excluded and why (delegated-permission gap, authority-level gap), per FR-013/FR-018, so the UI
  never has to re-derive that information client-side from raw role data.
- `contracts/transaction-ledger.md` documents that FR-004's refund-initiation action opens the
  same request payload/endpoint as 015's detail-page refund dialog
  (`SubmitRefundRequestSchema` → `POST /crm/billing-records/{id}/refund-requests`), avoiding a
  second, subtly-different refund-creation code path.

## Phase 2: Task Planning Approach

_This section describes what the `/speckit.tasks` command will do — DO NOT execute during `/speckit.plan`._

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as the base structure.
- Generate tasks from `data-model.md` (schema/type additions), `contracts/*.md` (one task group per
  contract file: route handler + registration), and `quickstart.md` (manual verification steps per
  user story).
- Order: schema/type extensions → mock-DB table method extensions (incl. next-month seed data) →
  read-path routes (transaction ledger, receivables, upcoming-billing, refund queue) → mutation
  routes (convenience-payment, bad-debt exclusion, refund decision single/bulk) → CSV export routes
  → `refund-approval.ts` module → UI (transactions page → receivables page (both tabs) → refunds
  page, each with its `_components/`) → `generate-routes`/`generate-openapi`/`generate-api` pipeline
  → final quickstart walkthrough.
- Mark independent file-scoped tasks `[P]` for parallel execution (e.g., the three pages' UI work
  once their backing routes exist).

**Ordering Strategy**: Backend-first (schema → mock-DB → routes) then frontend (pages →
components), per user-story priority (P1 stories — receivables, upcoming-billing confirm, refund
approval — before the P2 transaction-ledger story), matching 015's own successful task ordering.

**Estimated Output**: ~35-45 numbered, dependency-ordered tasks in `tasks.md`.

**IMPORTANT**: This phase is executed by the `/speckit.tasks` command, NOT by `/speckit.plan`.
