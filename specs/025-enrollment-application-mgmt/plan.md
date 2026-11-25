# Implementation Plan: Enrollment Application Management (入会申請管理)

**Branch**: `025-enrollment-application-mgmt` | **Date**: 2026-08-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/025-enrollment-application-mgmt/spec.md`

## Summary

Rebuild the three enrolment-application screens — review queue list, approval detail, and the admin-side enrolment form — onto C-01 revision **260624_v5**.

**This is a rework, not greenfield.** A complete implementation of these screens already exists at `src/app/(private)/membership-applications/` (36 files) with 11 mock API routes under `src/app/api/crm/membership-applications/`, built against C-01 revision **260410_v2**. The v5 revision changes the feature's central model: the normal path is now **fully automatic** (mobile + no BL match + adult ⇒ auto-approved upstream, never queued), the 申請種別 (application-type) axis is **replaced** by an 入会経路 (enrolment-route) axis, and the corporate / employee-discount enrolment sections are **removed** from the admin form and routed through the mobile app instead.

The plan therefore reworks the existing route in place — same URL, same permission keys, same `db.membershipApplications` table key — and expresses the work as a bounded delta against what is already on disk, so nothing already correct is rebuilt and nothing stale is left behind.

⚠️ **One area ships provisional.** The enrolment-fee exemption (FR-025 / FR-026) is reproduced from the V0 prototype and is **absent from C-01 260624_v5**. Per the 2026-08-06 decision it is built exactly as the prototype specifies (campaign → re-enrolment → staff-discretionary, first match wins, never stacking) but every artefact derived from it — this plan, the data model, the contracts, the tasks, and the implementing code — must state plainly that the rules are not PO-confirmed (FR-025a).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4, nuqs
**Storage**: Phase 1 — `src/app/api/_mock-db/`. The `membershipApplications` table currently lives **inline inside `tables/members.table.ts`** (~L918+, list rows seeded inline) with its detail records in `seeds/membership.seed.ts`; this plan extracts it into the project's standard `type / table / seed` split (`tables/membership-application.table.ts` + `seeds/membership-application.seed.ts`), keeping the `db.membershipApplications` key unchanged. Phase 2 — generated REST client via hey-api.
**Target Platform**: Node.js ≥ 24.0.0, browser (web), desktop-focused (min viewport 768px)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: List filter / search / sort feedback <200 ms against the in-memory mock; the review queue is expected to hold tens to low hundreds of rows per store scope
**Constraints**:

- **Store scope must be enforced server-side.** The existing routes do **not** call `getAuthUserFromRequest` at all — the list route filters only by a `store` query param supplied by the client (`route.ts:81-82`). FR-015 / FR-062 require every route (list, detail, approve, reject, cancel, memos, direct) to resolve the caller's scope via `getAllowedStoreIds()` and refuse out-of-scope records with 403/404 rather than relying on client-side gating.
- **KPI counts must be computed server-side over the whole scoped set**, not over the current page — the prototype counts a non-paginated client array, which cannot be reproduced against a paginated endpoint (FR-004).
- **Cancellation guards are server-side invariants**, not dialog decorations: usage-start-date reached ⇒ reject; third same-day cancellation ⇒ reject (FR-034).
- **Approval is blocked without an agreement timestamp** for admin-sourced applications, enforced in the approve route (FR-028).
- **Rejection reasons are a closed enum of exactly four values**, not the current free-text `rejection_reason: z.string().min(1)` (FR-031).
- **`Permission.MembershipApplicationsApprove` is currently granted to `System` only.** FR-042 requires Headquarter, Manager, and Staff to hold it as well; Observer keeps view-only and Trainer keeps no access (both already correct).
- The exemption fields are a **mock-ahead extension** with no counterpart in C-01 — declared optional in the response schemas so the Phase-2 swap degrades gracefully when a real backend omits them.

**Scale/Scope**: 3 pages (list, detail, admin form) reworked in place; ~36 existing route-local component files revised, several added, 2 deleted (corporate / employee-discount sections) alongside their `corporate-masters` endpoint; 10 existing API routes revised, 1 deleted; 1 mock table extracted and re-seeded; 3 permission grants widened. **No new npm dependencies.**

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | Every new field is derived from Zod schemas in the existing `_schemas/membership-application.schema.ts`; new enums (`EnrollmentRouteSchema`, `RejectionReasonSchema`, `EnrollmentFeeExemptionKindSchema`) sit alongside the existing `MembershipApplicationStatusSchema`; table methods return discriminated sentinels |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | All schema edits go through `_schemas/` → `npm run generate-openapi` → `npm run generate-api`; UI consumes only generated hooks. The exemption fields are documented in Complexity Tracking as a deliberate mock-ahead extension and declared `.optional()`                                                            |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | Zero `[NEEDS CLARIFICATION]` markers remain; the single open question (exemption precedence) was decided 2026-08-06 and is recorded as **provisional** in spec.md, this plan, data-model.md, and — per FR-025a — the code itself                                                                                       |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | Pages stay server components with `"use client"` confined to the interactive sections that already carry it; no new modal beyond the four the spec requires (approve / reject / cancel / cancel-blocked); the admin form stays a single page, not a wizard                                                             |
| V   | Simplicity & Min. Deps | ☒ No new npm packages without justification; no abstraction layers beyond existing patterns | No new dependency. Cancel reuses `Permission.MembershipApplicationsApprove` rather than minting a new key (identical role set per FR-042/FR-063). The mock-table extraction moves code into the project's **existing** table/type/seed convention — it adds no new pattern                                             |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — the design adds no dependency, no new mock table key, and no new UI pattern. Two deliberate contract divergences (server-computed KPI summary, provisional exemption fields) are recorded in Complexity Tracking; both are expressed as additive, optional response fields so the Phase-2 swap stays mechanical.

## Project Structure

### Documentation (this feature)

```text
specs/025-enrollment-application-mgmt/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output — v2→v5 delta analysis + open decisions
├── data-model.md        # Phase 1 output — entities, row shape, state transitions
├── quickstart.md        # Phase 1 output — manual verification script (no automated tests)
├── contracts/           # Phase 1 output
│   ├── list-applications.md          # GET list + server-computed KPI summary
│   ├── application-detail.md         # GET detail (checklist / exemption / companion inputs)
│   ├── application-decisions.md      # approve / reject / cancel + memo CRUD
│   └── direct-enrollment.md          # admin form POST + fee masters + BL check
├── checklists/
│   ├── requirements.md  # 16/16 pass (from /speckit.specify)
│   └── parity.md        # 158 PAR items — the /speckit.implement gate
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root) — actual current layout with per-file disposition

```text
src/
├── app/
│   ├── api/
│   │   ├── _schemas/
│   │   │   └── membership-application.schema.ts        # [REWORK] status +auto_approved; +EnrollmentRoute enum;
│   │   │                                               #   list item +enrollment_route, campaign nullable;
│   │   │                                               #   query +route filter, sort_by 5 fields, page sizes;
│   │   │                                               #   list response +summary{pending,blacklist};
│   │   │                                               #   detail +checklist/companion/exemption/cancellation blocks;
│   │   │                                               #   reject reason → 4-value enum + supplement;
│   │   │                                               #   direct request −corporate/−employee +agreement_datetime
│   │   ├── _mock-db/
│   │   │   ├── tables/
│   │   │   │   ├── members.table.ts                    # [SHRINK] remove the inline membershipApplications block (~L918+)
│   │   │   │   └── membership-application.table.ts     # [NEW] extracted table: list/detail/approve/reject/cancel/memo/createDirect
│   │   │   ├── seeds/
│   │   │   │   ├── membership.seed.ts                  # [REPLACE] → membership-application.seed.ts
│   │   │   │   └── membership-application.seed.ts      # [NEW] rows + details covering 6 statuses × 3 routes ×
│   │   │   │                                           #   BL/minor/companion/exemption/JACCS/overdue variants
│   │   │   ├── types/membership-applications.type.ts   # [EXTEND] new table-method signatures + result sentinels
│   │   │   └── _create-db.ts                           # [EDIT] register createMembershipApplicationTables(() => db)
│   │   └── crm/membership-applications/
│   │       ├── route.ts                                # [REWORK] auth+scope; route filter; 5-way sort; status-flow
│   │       │                                           #   ordering; summary block
│   │       ├── [id]/route.ts                           # [REWORK] auth+scope 403/404; enriched detail payload
│   │       ├── [id]/approve/route.ts                   # [REWORK] agreement-timestamp gate; exemption echo in timeline
│   │       ├── [id]/reject/route.ts                    # [REWORK] 4-reason enum + optional supplement
│   │       ├── [id]/cancel/route.ts                    # [REWORK] usage-start guard; 2-per-day guard; refund guidance;
│   │       │                                           #   returns updated same-day count (currently a stub returning
│   │       │                                           #   refund_amount: 5000 with no guards at all)
│   │       ├── [id]/memos/route.ts, [memoId]/route.ts  # [EXTEND] auth+scope; system entries not deletable
│   │       ├── direct/route.ts                         # [REWORK] v5 request shape; always 未審査 + 手動 route
│   │       ├── enrollment-fee-masters/route.ts         # [EXTEND] brand-scoped, active-only
│   │       ├── blacklist-check/route.ts                # [KEEP] three-state result
│   │       └── corporate-masters/route.ts              # [DELETE] corporate enrolment removed from the admin form in v5
│   └── (private)/membership-applications/
│       ├── page.tsx                                    # [KEEP] server page shell
│       ├── _components/
│       │   ├── membership-applications-kpi-cards.tsx   # [REWORK] 3 cards → 2; read server summary; BL card treatment
│       │   ├── membership-applications-table-columns.tsx # [REWORK] +入会経路; 店舗→申請店舗; 5 sortable headers;
│       │   │                                           #   overdue badge; BL row treatment; campaign placeholder
│       │   ├── membership-applications-table.tsx       # [EXTEND] page sizes 25/50/100/200 (default 50); empty-state split
│       │   └── membership-applications-filters.tsx     # [REWORK] +enrolment-route filter; BL tri-state; 7-day default
│       │                                               #   range; active-filter count + result banner + clear-all
│       ├── _hooks/use-membership-applications-filters.ts # [REWORK] nuqs state for the new filter/sort axes
│       ├── _constants/constants.ts                     # [REWORK] status/route labels, status-flow order, overdue
│       │                                               #   threshold, brand min-age map, page sizes
│       ├── [id]/_components/
│       │   ├── membership-application-detail.tsx       # [REWORK] compose new cards; role gating
│       │   ├── applicant-info-card.tsx                 # [EXTEND] reveal-all control; face-photo state
│       │   ├── blacklist-result-card.tsx               # [EXTEND] per-condition rows + link to BL entry
│       │   ├── contract-info-card.tsx                  # [EXTEND] prepayment period w/ brand rule
│       │   ├── fee-payment-card.tsx                    # [REWORK] brand-split rows; JACCS notice;
│       │   │                                           #   ⚠️ exemption block (PROVISIONAL — FR-025a comment required)
│       │   ├── approval-checklist-card.tsx             # [NEW] BL / age+consent / usage-start-within-2-months
│       │   ├── companion-upgrade-banner.tsx            # [NEW] Yamauchi-ID C→A upgrade notice
│       │   ├── approve-dialog.tsx                      # [EXTEND] exemption + BL warning; risk-confirm label
│       │   ├── reject-dialog.tsx                       # [REWORK] 4 fixed reasons + supplement; release notice
│       │   ├── cancel-dialog.tsx                       # [EXTEND] same-day counter; refund guidance by method
│       │   ├── cancel-error-dialog.tsx                 # [EXTEND] two distinct blocked reasons
│       │   ├── activity-timeline-card.tsx              # [EXTEND] memo vs system distinction; delete only memos
│       │   ├── application-meta-card.tsx               # [EXTEND] enrolment route, source, proxy, agreement timestamp
│       │   └── status-action-card.tsx                  # [EXTEND] auto-approved status; decision attribution
│       └── create/
│           ├── _components/application-type-section.tsx   # [DELETE] 申請種別 removed in v5
│           ├── _components/corporate-info-section.tsx     # [DELETE]
│           ├── _components/employee-discount-section.tsx  # [DELETE]
│           ├── _components/enrollment-route-section.tsx   # [NEW] read-only 手動 + explanation
│           ├── _components/applicant-info-section.tsx     # [EXTEND] brand-driven min age; minor consent; adult confirm
│           ├── _components/contract-info-section.tsx      # [EXTEND] payment method SBPS/JACCS; usage start date
│           ├── _components/proxy-record-section.tsx       # [EXTEND] required agreement datetime; read-only proxy
│           ├── _components/fee-section.tsx                # [REWORK] brand-split items; fee master; proration; total ≥ 0
│           ├── _components/blacklist-result-section.tsx   # [KEEP] three states
│           ├── _components/minor-consent-dialog.tsx       # [REVIEW] fold into inline consent checkbox per V0
│           └── _schemas/enrollment-form.schema.ts         # [REWORK] v5 field set + cross-field age/consent/agreement rules
├── constants/permission.constants.ts                   # [EDIT] grant MembershipApplicationsApprove to
│                                                       #   Headquarter / Manager / Staff (System-only today)
└── lib/routes/routes.config.ts                         # [UNCHANGED] URLs stay /membership-applications[/create|/:id]
```

**Structure Decision**: Single Next.js App Router project; the feature is reworked **in place** under the existing `/membership-applications` route.

The URL, the folder name, the three `Permission.MembershipApplications*` keys, the `db.membershipApplications` table key, and the `/api/crm/membership-applications` endpoint prefix all stay as they are. Renaming them to "enrollment-application" to match the spec's vocabulary would touch `routes.config.ts`, `permission.constants.ts`, `app-sidebar.tsx`, the inbound link from `visit-experiences/[id]/_components/permit-actions.tsx`, every API route path, and the whole generated client — for zero user-visible benefit. The Japanese UI copy is what users read, and that copy (入会申請管理) is already correct.

The one structural move is the mock table: `membershipApplications` is extracted from inside `members.table.ts` into its own `table` + `seed` files. This is not a new pattern — it is the pattern every other table in `src/app/api/_mock-db/tables/` already follows, and it is forced by the work anyway, since virtually every seeded row changes shape and the seed set has to grow to cover six statuses, three routes, and the BL / minor / companion / exemption / JACCS / overdue variants.

## Phase 0: Research & Unknown Resolution

Recorded in [research.md](research.md). No `NEEDS CLARIFICATION` items remained in the Technical Context — the research phase was spent establishing the **v2 → v5 delta** against code already on disk, since that delta (not the technology choice) is what carries the risk here. Summary of what it resolves:

- **R1 — Rework vs. rebuild**: rework in place; the existing files map onto the v5 requirements closely enough that a parallel route would duplicate 30+ files for no gain.
- **R2 — Where auto-approval happens**: upstream of the CRM, on receipt. The CRM never transitions an application into 自動承認済; it renders such records read-only (spec Assumptions, FR-060).
- **R3 — KPI counts under pagination**: server-computed `summary` on the list response. The prototype's client-side count over a full array cannot survive pagination.
- **R4 — Overdue flag**: derived client-side from `application_date` + a constant threshold (24 h default), not a stored or transmitted field — it changes with the clock, so persisting it would immediately go stale.
- **R5 — Status sort order**: an explicit rank map (未審査 0 → 取り消し済 5) applied server-side; alphabetical or enum-declaration order both produce a queue that reads wrong.
- **R6 — Cancel permission key**: reuse `MembershipApplicationsApprove`; FR-042 and FR-063 give cancel exactly the same role set as approve/reject, so a fourth permission key would be a distinction without a difference.
- **R7 — Exemption model**: **provisional**, built to the prototype. Precedence campaign → re-enrolment (180-day default window) → staff-discretionary; exactly one applies; applies only to the 入会金 line. Alternatives (largest-wins, additive) were deferred, not rejected.
- **R8 — What v5 deletes**: 申請種別, corporate enrolment, employee-discount enrolment, and the 未成年 KPI card — with the `corporate-masters` endpoint and three form sections removed rather than hidden, so no dead path survives.

## Phase 1: Design & Contracts Output

- [data-model.md](data-model.md) — the `MembershipApplicationRow` shape (snake_case storage), the detail record, the six-status state machine with its legal transitions and guards, and the entity set from the spec mapped onto storage.
- [contracts/list-applications.md](contracts/list-applications.md) — `GET /crm/membership-applications`: query axes, the status-flow sort, scope enforcement, and the `summary` block.
- [contracts/application-detail.md](contracts/application-detail.md) — `GET /crm/membership-applications/{id}`: masked-vs-real personal fields, blacklist conditions, checklist inputs, companion-upgrade block, cancellation state, and the ⚠️ provisional exemption block.
- [contracts/application-decisions.md](contracts/application-decisions.md) — approve / reject / cancel and the memo endpoints, including every rejection status code and the exact guard each one encodes.
- [contracts/direct-enrollment.md](contracts/direct-enrollment.md) — the admin-form `POST /direct` v5 request shape, the enrolment-fee master lookup, and the blacklist pre-check.
- [quickstart.md](quickstart.md) — the manual verification script. Per the constitution's No Testing Policy this is the **only** verification artefact; no automated tests are written, and `tasks.md` must contain no test-writing tasks.

### Regeneration step (mandatory, and easy to forget)

Every schema change in `_schemas/membership-application.schema.ts` must be followed by:

```bash
npm run generate-openapi && npm run generate-api
```

before any UI work consumes the new fields. The UI reads types and hooks only from the generated client; hand-writing a matching interface to "get ahead" of the generator violates Constitution II and produces silent drift.

### ⚠️ Provisional area — carried forward from the spec (FR-025a)

The exemption logic must ship with an inline comment at its implementation site, in these terms:

> The enrolment-fee exemption rules (campaign → re-enrolment → staff-discretionary precedence, first match wins) are **provisional**: reproduced from the V0 prototype, absent from C-01 revision 260624_v5, and pending PO confirmation. The prototype's own source flags the multi-exemption case as unresolved. Do not treat this precedence as a settled requirement.

The comment belongs wherever precedence is actually decided — the mock table's exemption resolution and the detail screen's fee card — not merely in a README. `/speckit.tasks` must carry this obligation onto the specific tasks that touch those files, and `/speckit.implement` must not report done without it.

## Complexity Tracking

Two deliberate divergences; neither is a constitution violation requiring a waiver.

| Item                                                                                                                             | Why Needed                                                                                                                                                                           | Simpler Alternative Rejected Because                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List response carries a server-computed `summary { pending_count, blacklist_count }` that C-01 does not specify                  | FR-004 requires the KPI cards to count the user's whole store scope, not the current page. With a paginated endpoint the client physically cannot compute this from what it receives | Counting client-side (what the prototype does over a non-paginated array) was rejected — it would report "3 未審査" when page 1 happens to hold 3 of 47. Fetching the full unpaginated list purely to count was rejected as wasteful and unbounded          |
| Detail response carries an `enrollment_fee_exemption` block absent from C-01 260624_v5 — **provisional**, declared `.optional()` | FR-025 / FR-026 reproduce the V0 prototype's exemption UI, which needs a data source. The 2026-08-06 decision was to build it while marking it unconfirmed (FR-025a)                 | Dropping the exemption to match C-01 exactly was rejected by the PO decision. Hard-coding it client-side was rejected because the approval log must record which exemption applied and why (FR-030). `.optional()` keeps a real backend that omits it valid |

</content>
