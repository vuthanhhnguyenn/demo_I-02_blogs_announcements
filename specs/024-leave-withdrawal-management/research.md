# Phase 0 Research: Leave & Withdrawal Management (A-03)

**Feature**: `024-leave-withdrawal-management` | **Date**: 2026-08-05 | **Plan**: [plan.md](./plan.md)

Two clarification items (Q-06, Q-13) were still open when `/speckit.plan` began, which would have failed Constitution gate III. Both are closed here on evidence from the codebase — and for one of them the evidence **reversed** the answer previously assumed in the spec. The remaining sections record decisions the plan depends on.

---

## 1. Q-06 — Page-size options

**Decision**: Offer **25 / 50 / 100**, defaulting to **25**. The V0 option `200` is dropped.

**Rationale**: `200` is not merely above the real API's cap — it is rejected by the project's own contract. `src/app/api/_schemas/leave.schema.ts` declares `limit` as `z.number().int().min(1).max(100)`, so a request for 200 fails Zod validation and the route handler returns `400`. The real endpoint caps `limit` at 100 identically. Shipping a page-size option that produces a 400 against both the mock and the real backend is not a viable design, and raising the cap in the mock alone would break Constitution II's requirement that the Phase 1 → Phase 2 swap be behaviourally transparent.

The default of 25 comes from `PAGE_SIZE` in `src/constants/app.constants.ts`, which the current implementation already uses and which every other list screen in the CRM shares. V0 defaulted to 50; CRM-wide consistency was preferred over matching the mockup on a value the user never sees as a design element.

**Alternatives considered**:

- _Keep 200 and raise the cap_ — rejected: needs a fourth backend request for a page size no requirement asks for, and 200 rows of a 10-column table is not a usable view.
- _Keep the fixed `PAGE_SIZE` with no selector_ — rejected: FR-031 requires a selector, and `TablePaginationWithSize` already provides one, used by `banners`, `terms`, `app-versions`, `visit-experiences` and `entry-exit/history`.
- _Default 50 to match V0_ — rejected: would make this the only list screen in the CRM with a different default.

**Note**: `TablePaginationWithSize` defaults its `pageSizeOptions` prop to `[25, 50, 100, 200]`. This screen must pass `pageSizeOptions={[25, 50, 100]}` explicitly rather than relying on the default.

---

## 2. Q-13 — Sorting controls

**Decision (final, 2026-08-06)**: **No sort controls.** Plain column headers, exactly as V0. Ordering is fixed server-side at `scheduled_date asc`.

**Rationale**: The prototype is the reviewed design, and it has no sorting — `leave-list.tsx` contains zero occurrences of `sort`; every `<TableHead>` is plain text. This screen's fidelity gate is the prototype, so the prototype wins.

**Superseded reasoning (recorded, because it was wrong in an instructive way)**: planning first decided to _keep_ sorting, because the pre-spec `feat/member-leave` implementation already had it working end to end (`manualSorting` + `SortingState` in `page.tsx`, `DataTableColumnHeader` on three columns, `sort_by` / `sort_order` in URL state, server-side ordering in `route.ts`) and the real API supports the capability (`sort` over `scheduledDate` / `appliedAt` / `displayStatus`). The flaw: _existing code is not evidence of design intent_ when that code predates the spec. `feat/member-leave` was written before A-03 was specified, so its sorting was never reviewed against the mockup — treating it as a baseline to preserve inverted the direction of authority. The user rejected the reversal on review.

**Kept from the superseded decision**: the default ordering **`scheduled_date asc`**, which matches the real contract's documented default. This is what the sorted view showed on first load anyway, so removing the controls changes no operator-visible ordering, and nothing shifts at the Phase 2 swap.

**What the endpoint keeps**: `sort_by` (now `applied_at` / `scheduled_date`, with `id` dropped alongside its column per gap C1) and `sort_order` stay in the Zod schema so the mock remains contract-shaped against the real API. The screen simply never sends them.

**Alternatives considered**:

- _Keep sorting_ — rejected on review: adds an unreviewed control to a screen whose design gate is the prototype.
- _Remove the parameters from the endpoint too_ — rejected: the real contract has them, and dropping them from the mock would make Phase 2 a schema change rather than a swap.

---

## 3. Status vocabulary — dropping `completed` from the list

**Decision**: `completed` stays in the `LeaveStatus` enum but is excluded from list responses and from the ステータス filter options.

**Rationale**: Q-10 removes 処理完了 from the list while keeping it valid on the detail, so the enum must retain the value — `leave-status-action.tsx` and `STATUS_ICON_CONFIG` still render it. The exclusion therefore belongs in two places: the list route handler filters `completed` rows out of `leaves`, and `LEAVE_STATUS_OPTIONS` is built from an explicit list-facing subset rather than `Object.values(LeaveStatus)`. This mirrors the real contract, where `displayStatus` (four values, list-facing) is a distinct type from `status` (five values, lifecycle).

**Alternatives considered**:

- _Remove `completed` from the enum_ — rejected: breaks the detail screen, and the lifecycle status genuinely has five states.
- _Filter client-side_ — rejected: corrupts `total` / `total_pages` and the filter-result banner counts.

---

## 4. Cancellability — server-derived, not client-derived

**Decision**: The detail response carries `cancellable: boolean` and `cancellation_blocked_reason: 'not_cancellable_status' | 'batch_processing_started' | 'usage_started' | null`. The UI never computes cancellability from dates.

**Rationale**: The real contract derives both server-side and states the guard chain explicitly (status must be `active`; member must not be `withdrawal_pending_processing`; `usage_start_date` must not have arrived, where null counts as not started). FR-052 requires re-evaluation at execution time, and FR-047/FR-048 need the _reason_ to choose between two different tooltips — which a boolean alone cannot express. The V0 detail computes `new Date(contractStartDate) <= new Date()` in the component; that is exactly the client-side derivation this decision rejects.

The list response also needs `cancellable` for FR-046 (the row menu must know whether to enable the item). The real list contract does not currently expose it — this is a known projection gap handled by the mock-first policy, consistent with the three requests already recorded in spec.md → Assumptions.

**Alternatives considered**:

- _Compute in the UI from `usage_start_date`_ — rejected: duplicates business rules in the client, and cannot distinguish `batch_processing_started` from `usage_started`.
- _Boolean only, single tooltip_ — rejected: FR-047 and FR-048 specify two distinct messages.

---

## 5. Store scope — server-side filter, not a UI concern

**Decision**: The list route handler applies the caller's store scope before any user filter. The `店舗` filter and the `店舗名` column are hidden when the header scope is a single store, and the in-screen store filter resets when the scope changes.

**Rationale**: FR-003 makes scope a security boundary, not a convenience: an out-of-scope application must not be returned at all, and requesting one directly must yield a not-found rather than a forbidden (spec Assumptions). Enforcing it only in the UI would leak rows through the API. The visibility rules (FR-004, FR-005) are a separate, purely presentational layer on top. The existing implementation has neither; `useCurrentStore()` — already used by `entry-exit/history` — supplies the header scope.

---

## 6. Suspension history strip — seed-only, derived from applications

**Decision**: The strip's month map is derived from the member's own applications in the mock table, not stored as a separate entity. No create/update/delete path exists.

**Rationale**: The feature request constrains history to seed-only, and FR-074 forbids mutation surfaces. A month's state is a projection: a month is `active` when it falls inside a running suspension, `pending-leave` when inside a scheduled one, `pending-retire` when it is a scheduled withdrawal's month. Deriving keeps the seed honest — the strip can never disagree with the applications the list shows.

**Alternatives considered**:

- _A separate seeded history table_ — rejected: two sources of truth that can drift, for data that is already computable.

---

## 7. Component reuse audit

Confirmed present in `src/components/common/` and reused as-is: `data-table/`, `data-state-boundary/` (loading · error · empty), `table-pagination-with-size`, `filter-result-banner`, `brand-badge`, `status-card`, `role-gated-button`, `role-gated-menu-item`, `back-link`, `page-header`, `empty-state`.

Confirmed absent, to be built: `suspension-history-strip` (shared) and `leave-member-headup` (route-local). Both compose existing shadcn/ui primitives — no new dependency, satisfying Constitution V.

`JargonTip` is **not** needed: it existed only to annotate the 個別会費調整中 badge, which Q-12 removed from A-03.

---

## 8. Identifier semantics

**Decision**: 会員ID renders the member number, 申請ID renders the application number; internal record ids appear only in URLs and query keys.

**Rationale**: Q-15. The current mock uses `LV-001` and `M-00101` as both the record id and the displayed value, which conflates two concepts the real contract separates (`applicationId` UUID vs. `applicationNumber` 10-digit; `memberId` UUID vs. `memberNumber` `{prefix}-{7 digits}`). Keeping them conflated would force a display change at the Phase 2 swap. The mock therefore carries both from the start, with the seed generating realistic member numbers (`JF-0000101`) and application numbers.

---

## Open items carried into implementation

None blocking. Three mock-ahead-of-backend projections are recorded in spec.md → Assumptions and tracked through the API QA process; they do not gate Phase 1.

One known requirement gap is carried deliberately: **A-03 L144's current-step highlight is not implemented** (Q-03, deferred pending a UI treatment). It is recorded in spec.md → Out of Scope and must be revisited before the feature is signed off against A-03.
