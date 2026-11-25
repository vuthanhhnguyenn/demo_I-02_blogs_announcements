# Phase 0 Research: Sales Transaction History, Receivables, and Refund Management (F-01-01/02/03)

No `[NEEDS CLARIFICATION]` markers remain in `spec.md`. Phase 0 focuses on resolving _technical_
unknowns: how this feature's four new read-models and one genuinely new business rule
(hierarchical refund approval) fit onto the `billingRecords` mock-DB table set and
`sales-permissions.ts` helper already built and fully implemented for `015-sales-management`,
discovered by surveying that feature's `plan.md`/`data-model.md`/`research.md`/actual source, the
three existing placeholder pages, `training-equipment` as a generic mock-DB/route precedent, and
the three UI prototypes (`sales-transaction-list.tsx`, `sales-receivable-list.tsx`,
`sales-refund-list.tsx`).

## Decisions

### 1. `015-sales-management` is fully implemented — extend it, do not re-plan from scratch

**Decision**: Treat `015-sales-management` as a completed, load-bearing dependency. All 52 tasks
in its `tasks.md` are checked off, and real code exists at every path its `plan.md` promised:
`src/app/(private)/sales/{page.tsx,register/page.tsx,[id]/page.tsx}`,
`src/app/api/_mock-db/{types,tables}/billing.*`, `src/app/api/_schemas/billing.schema.ts`,
`src/lib/utils/sales-permissions.ts`, and 13 routes under `src/app/api/crm/billing-records/`.

**Rationale**: Building a second, parallel data model for "the same underlying business objects,
viewed differently" would violate Constitution Principle V and immediately desynchronize from the
one authoritative `outstanding_amount`/`confirmation_status`/`refund_status` fields 015 already
established as ground truth. Every new read-model this feature needs (transaction ledger, unpaid
receivables, upcoming billing, refund queue) is a different _view_ over the same
`BillingRecord`/`BillingLineItem`/`RefundRequest` rows, not a different _fact_.

**Alternatives considered**: Treating this as an independent feature with its own mock table —
rejected; it would duplicate `billed_amount`/`paid_amount`/`outstanding_amount`/`refund_status`
bookkeeping already solved, and any drift between the two tables would be a correctness bug with
no single source of truth to resolve it.

### 2. The three target pages already exist as wired-in placeholders — fill in, don't scaffold

**Decision**: `src/app/(private)/sales/{transactions,receivables,refunds}/page.tsx` already exist,
each rendering a "このページは準備中です" (under construction) placeholder with the correct
`PageHeader` title slot. This feature replaces each page's body; it does not create new routes,
and (pending a Phase 1 verification pass) likely does not need new `PAGE_PERMISSIONS`/navigation
entries either, since the routes are already reachable and titled.

**Rationale**: Re-creating these as new files would either fail (file exists) or silently
duplicate routing; the codebase's own placeholder convention (`Construction` icon + two lines of
Japanese copy) signals "this route is reserved for a specific upcoming feature," which is exactly
this one, matching the three L2 sub-screens the F-01 PO spec's sidebar note (`メタ情報` section)
calls out as needing direct sidebar access.

**Alternatives considered**: None — this is a direct filesystem finding, not a design choice.

### 3. Transaction Record, Unpaid Receivable, Unpaid Line Item, and Upcoming Billing Entry are derived read-models, not new tables

**Decision**: None of the four new "entities" in `spec.md`'s Key Entities section become a new
row shape persisted in `billing.table.ts`. Instead, `billing.type.ts`/`billing.table.ts` gain new
**query methods** that compute these views from the existing `_rows` (`BillingRecord[]`),
`_lineItems` (`BillingLineItem[]`), and `_refundRequests` (`RefundRequest[]`) arrays:

- `getTransactionLedger(filters)` — for each `BillingRecord`/`BillingLineItem`/completed
  `RefundRequest`, emits one or more ledger rows typed `sale | refund | payment | repayment`
  (a "sale" row per line item at creation; a "payment" row when `paid_amount` is recorded against
  it; a "refund" row per completed `RefundRequest`; a "repayment" row for the rare case of a
  reversed/re-posted refund — mirrors the UI mock's `TRANSACTION_DATA` shape one-for-one).
- `getUnpaidReceivables(filters)` — groups `BillingRecord`s with `outstanding_amount > 0` by
  member, aggregating `unpaidMonths`, `totalUnpaidAmount`, and `lastBillingDate`; each record's
  unconfirmed line items become that member's `UnpaidLineItem[]`.
- `getUpcomingBilling(filters)` — filters `BillingRecord`s where `billing_month` is next calendar
  month and `confirmation_status = 'unconfirmed'`.
- `getRefundQueue(filters)` — flattens `_refundRequests` across all billing records into the
  approval-queue shape, joining requester/approver display fields.

**Rationale**: Keeps `outstanding_amount`/`confirmation_status`/`refund_status` as the single
source of truth (continuing 015's own research.md decision #2), and means every mutation this
feature performs (convenience-payment issuance, bad-debt exclusion, refund decisions) only ever
writes to the one `BillingRecord`/`RefundRequest` row — there is no second copy of the same fact
to keep in sync.

**Alternatives considered**: Materializing these as separate, persisted mock tables refreshed on
write — rejected as needless duplication for an in-memory mock with no performance pressure to
pre-compute; a plain derived-query approach is simpler and matches Constitution Principle V.

### 4. New fields required on `BillingRecord` and `RefundRequest` — the only real schema changes

**Decision**: Add to `BillingRecordSchema` (via `billing.schema.ts`):

- `bad_debt_excluded: boolean`
- `bad_debt_exclusion_reason: string | null`
- `bad_debt_excluded_by: string | null`
- `bad_debt_excluded_at: string | null` (ISO-8601)
- `receivable_status: 'uncollected' | 'rebilling' | 'convenience_payment_in_progress' | 'bad_debt_target' | 'bad_debt_excluded' | null` (`null` for records with no outstanding amount)

Add to `RefundRequestSchema`:

- `requester_role: 'staff' | 'manager' | 'headquarter'` (captured at request-creation time; System
  never _requests_ a refund in this rule set, only approves)
- `approver_id: string | null`
- `approver_name: string | null`
- `approver_role: StaffRole | null`
- `approved_at: string | null` (ISO-8601; renamed conceptually from "decided_at" to match the UI
  mock's `approvalDate`, since rejection also uses this same timestamp field per the mock)

**Rationale**: `receivable_status` cannot be derived from `confirmation_status` or `refund_status`
alone — those describe _billing_ and _refund_ state, not _collections workflow_ state (e.g. a
record can be `confirmation_status: 'confirmed'` and simultaneously `receivable_status:
'convenience_payment_in_progress'`). Similarly, hierarchical refund approval (Decision 6) is
mathematically impossible to enforce server-side without knowing the requester's role at request
time, and the UI mock already displays `approverName`/`approvalDate`/a role Badge — these must be
real fields, not client-only decoration.

**Alternatives considered**: Deriving `receivable_status` from a combination of existing booleans
(`is_bad_debt`, `outstanding_amount > 0`) — rejected; `is_bad_debt` today means "already written
off," not "on-track for write-off," and there is no existing signal at all for "convenience
payment in progress" or "currently being re-billed," both of which are real states this feature
must display and transition between (FR-006, FR-008).

### 5. Hierarchical refund approval is genuinely new logic — promote the UI mock's rule into a small shared module

**Decision**: Add `src/lib/utils/refund-approval.ts` exporting:

```ts
export function canApproveRefund(
  currentRole: StaffRole,
  requesterRole: RefundRequesterRole,
): boolean;
export function requiredApproverLabel(requesterRole: RefundRequesterRole): string;
```

implementing exactly the rule already prototyped client-side in
`pages/sales-refund-list.tsx`'s `canApproveRefund`/`requiredApproverLabel` helpers: System always
approves; Headquarter approves Staff- or Manager-submitted requests; Manager approves only
Staff-submitted requests; Staff/Trainer/Observer never approve. This same function is called both
inside the new decision route handlers (server-enforced) and by the `RoleGatedButton`/
`RoleGatedMenuItem` client gates (so the disabled-state explanation text matches exactly).

**Rationale**: `sales-permissions.ts`'s existing `'refund'` action in `canPerformSalesAction` is a
flat `(role) → boolean` check with no concept of "relative to who submitted it" — extending that
function's signature to take a second role parameter would change its contract for every other
action, which only ever takes one role. A small, additional, single-purpose module is more in
keeping with "small, single-purpose functions" (Constitution Principle I) than overloading an
existing one. This is the one Complexity Tracking entry in `plan.md`.

**Alternatives considered**: Encoding the rule as a numeric role-rank comparison (e.g.
`ROLE_RANK[currentRole] > ROLE_RANK[requesterRole]`) — rejected; the actual rule is not a strict
"anyone higher can approve" (Manager cannot approve a Headquarters-submitted request; only System
can), so a rank-based shortcut would silently misauthorize that one case. The explicit
`canApproveRefund` switch, matching the UI mock precisely, is the correct source of truth.

### 6. Refund initiation reuses the existing single-record endpoint; only refund _decisions_ are new

**Decision**: FR-004/FR-005 (initiating a refund request from a confirmed "sale" transaction row)
calls the existing `POST /crm/billing-records/{id}/refund-requests` endpoint built for 015's
detail-page refund dialog (`SubmitRefundRequestSchema`), unchanged except for the new
`requester_role` field now being populated. No new refund-creation route is added. What's new is
the refund **queue** (`GET /crm/billing-records/refund-requests` — read across all records) and
refund **decisions** (`POST .../refund-requests/{id}/decision`, `POST
.../refund-requests/bulk-decision`), none of which existed before (015 never built an
approve/reject flow — its "承認" step was explicitly out of this feature's Phase 1 scope until
now).

**Rationale**: The refund-request _shape_ (full/partial, per-line-item amounts, required reason,
payment-method-specific handling text) is identical whether initiated from the transaction ledger
or the billing detail page — one creation endpoint, two entry points in the UI, is correct reuse,
not duplication.

**Alternatives considered**: A dedicated "quick refund" endpoint for the transaction-ledger entry
point — rejected; the UI mock's `RefundRequestDialog` component in `sales-transaction-list.tsx`
has the identical fields (full/partial toggle, per-amount input, required reason textarea) as
015's existing detail-page dialog, so no simplified variant is warranted here (unlike the already-
existing _list-level_ simplified refund on the main Sales Management list, which is intentionally
reason-code-only and out of this feature's scope).

### 7. Upcoming-billing bulk confirm reuses the existing bulk-confirm endpoint

**Decision**: FR-013 ("confirm all unconfirmed upcoming-billing entries in one action") calls the
existing `POST /crm/billing-records/confirm` endpoint (built for 015's list-level bulk confirm),
supplying the ids surfaced by the new `getUpcomingBilling` read-model. No new confirm mutation
route is added.

**Rationale**: `confirm/route.ts` already implements exactly the required authorization rule
(Headquarters/Manager/System always; Staff only with `hasDelegatedConfirmPermission`, resolved via
the existing `staff_permissions` mechanism) — the only thing different about the upcoming-billing
tab's confirm action is _which_ ids it passes in (a specific next-month cohort instead of an
arbitrary user selection) and that the confirmation dialog additionally shows the SBPS/JACCS
split, which is a client-side presentation detail, not a new server rule.

**Alternatives considered**: A dedicated `upcoming-billing/confirm` route — rejected as
unnecessary duplication of `confirm/route.ts`'s existing, already-correct authorization and
mutation logic.

### 8. Next-month "upcoming billing" seed data must be added to the mock-DB seed step

**Decision**: `billing.table.ts`'s lazy `_seed()` is extended to also generate a batch of
`confirmation_status: 'unconfirmed'` records dated for next calendar month relative to the
existing seed's "current month," including a subset with a non-zero rolled-over amount (so
`getUpcomingBilling`'s "billing type includes unpaid rollover" distinction has real data to
display), consistent with the three billing-type buckets shown in the UI mock's
`UPCOMING_BILLING_DATA` (plain monthly / monthly + rollover / ad-hoc).

**Rationale**: Today's seed only produces current-month records (015's scope never needed a
"next month, not yet generated" concept). Without this addition, the upcoming-billing tab would
always render empty in the mock environment, defeating its own quickstart verification.

**Alternatives considered**: Computing "upcoming billing" as a synthetic projection at read time
(re-deriving next month's amounts from current contracts) — rejected as unnecessarily complex for
a Phase 1 mock; a small additional seed batch is simpler and sufficient, matching how every other
mock table in this codebase seeds a fixed, realistic dataset rather than simulating a calculation
engine.

### 9. CSV export and detail-panel UI patterns are reused verbatim

**Decision**: Transaction-ledger export (FR-003) and refund-queue export (FR-020) both use
`buildCsv`/`csvFileResponse`/`csvDateStamp` from `src/app/api/_lib/csv.ts`, following
`crm/billing-records/export/route.ts`'s exact structure (permission check → `safeParse` body →
build rows → `csvFileResponse`). The unpaid-detail sheet (FR-007) and refund-detail sheet reuse
the `Sheet`-based detail-drawer convention from
`src/app/(private)/lockers/[id]/_components/slot-detail-sheet.tsx` (480px panel, sectioned info
blocks divided by a full-bleed `Separator`, footer action buttons).

**Rationale**: Both are established, working conventions already used across multiple features;
introducing a second CSV-building approach or a second detail-panel shape would violate
Constitution Principle V for no benefit — the existing patterns already satisfy every requirement
in this spec.

**Alternatives considered**: A full-page detail route instead of a Sheet for unpaid/refund detail
— rejected; the UI mocks for both screens use an in-place Sheet specifically so the user does not
lose their place in the filtered list (SC-007 requires this), matching the `slot-detail-sheet.tsx`
precedent exactly.

### 10. Auth/role resolution stays on the existing Phase 1 mock convention

**Decision**: Every new route handler follows the same `MOCK_ROLE: StaffRole` hardcoded-constant
pattern already used throughout `crm/billing-records/**` (e.g. `const MOCK_ROLE: StaffRole =
'headquarter'`), with `resolveSalesDataScope`/`canPerformSalesAction`/the new `canApproveRefund`
applied against it exactly as they would be against a real authenticated user in Phase 2.

**Rationale**: Consistency with every existing route in this table avoids a mixed pattern within
the same feature area; because the authorization _logic_ itself is real and fully exercised (not
stubbed out), swapping the mock constant for `getAuthUserFromRequest()` in Phase 2 is a
zero-logic-change swap, exactly as 015 already demonstrated is safe.

**Alternatives considered**: Using `getAuthUserFromRequest()` now (as `training-equipment/route.ts`
does) — noted as viable but rejected for _this_ feature specifically to stay consistent with its
direct sibling routes under `crm/billing-records/`, which all use the `MOCK_ROLE` constant form;
mixing conventions within one table's route family would be a needless inconsistency.
