# Feature Specification: Sales Management (List, Detail, Manual Registration)

**Feature Branch**: `015-sales-management`
**Created**: 2026-07-08
**Status**: Draft
**PO Spec**: `F-01` — 売上管理 (Sales Management)
**Source**: `pages/sales.tsx`, `pages/sales-detail.tsx`, `pages/sales-register.tsx` + `requirements/F-01.md`
**Input**: User description: "Create spec for sales list, detail, create screen F-01 売上管理"

## User Scenarios _(mandatory)_

### User Story 1 - Monitor sales and confirm billings from the list (Priority: P1)

A store Staff member or Manager opens the Sales Management screen each day to see how much has been billed, collected, and left unpaid for the current month, then confirms the billing records that are ready so they can be sent to the payment processors.

**Why this priority**: This is the daily operational core of the feature — without an accurate summary and a way to confirm billings, no downstream collection, refund, or accounting process can proceed. It delivers value on its own even before detail or manual-registration capabilities exist.

**Verification**: Open the Sales Management list for the current month, confirm the five summary figures (sales total, payment total, unpaid total, refund total, confirmation status) match the underlying records, filter/search for a specific billing record, select one or more unconfirmed records, and confirm them; verify their status changes to confirmed and the summary counts update.

**Acceptance Scenarios**:

1. **Given** a store has billing records for the selected month, **When** the user opens the Sales Management list, **Then** the summary cards show total sales, total payments, total unpaid, total refunds, and confirmed/unconfirmed counts for that store scope and month.
2. **Given** the list contains both confirmed and unconfirmed billing records, **When** the user selects only unconfirmed records and clicks the bulk confirm action, **Then** those records move to "confirmed" status and cannot be edited further.
3. **Given** the user searches by billing ID or member name, or applies a filter (store, billing type, confirmation status, unpaid-only), **When** the search/filter is applied, **Then** only matching records are displayed.
4. **Given** the current user's role is Trainer or Observer, **When** they attempt to access Sales Management, **Then** access is denied.

---

### User Story 2 - Review and operate on a single billing record (Priority: P1)

A Staff member drills into a specific billing record to review its line items, resolve a billing question, apply a fee adjustment, or process a member's refund request.

**Why this priority**: Detail-level operations (adding line items, adjusting fees, handling refunds, issuing receipts) are required to resolve the day-to-day member-facing billing issues that the list view surfaces but cannot resolve directly. This is equally core to the daily operation as the list.

**Verification**: Open a billing record's detail page, add a line item, apply a fee adjustment with a reason, submit a refund request with a reason, and confirm/unconfirm the record; verify each action is reflected in the page state and history sections, and blocked actions (e.g. receipt download for unpaid items) are disabled.

**Acceptance Scenarios**:

1. **Given** an unconfirmed billing record, **When** an authorized user adds a line item by selecting an existing contract or entering a manual item with a reason, **Then** the new line item appears in the billing detail with its amount and tax rate.
2. **Given** a billing record with a card (SBPS) payment method, **When** the user opens the refund request dialog, **Then** the dialog explains that approved refunds are processed via automatic reversal within 90 days; **Given** the payment method is bank-debit (JACCS), **Then** the dialog instead explains that manual refund or CASHPOST handling is required.
3. **Given** the user selects partial refund, **When** they specify an amount for a subset of line items, **Then** the total requested refund reflects only the selected amounts and cannot exceed each line item's `refundableAmount` (original amount minus pending and approved-not-failed refunds, computed by the API — API-114 `items[].refundableAmount`).
4. **Given** a line item's payment is not yet confirmed, **When** the user attempts to download its receipt, **Then** the download action is disabled/blocked.
5. **Given** a confirmed billing record, **When** an authorized user reverts it to unconfirmed, **Then** the change is recorded with the acting user and timestamp, and line-item/fee-adjustment editing becomes available again.

---

### User Story 3 - Manually register a new billing record (Priority: P3)

A Staff member needs to bill a member outside the normal monthly batch cycle (e.g., a one-off charge), so they create a new billing record by hand, selecting the store, the member, and the charge items.

**Why this priority**: This is a "should-have" capability used less frequently than daily monitoring and detail operations, and depends on the same underlying record structure as User Story 1 and 2, so it can be delivered after the core list/detail flows are in place.

**Verification**: Open the manual registration screen, pick a store, pick a member without outstanding unpaid balance, add at least one line item, and submit; verify the new record appears in the Sales Management list with the entered details. Then repeat with a member who has an outstanding unpaid balance and verify registration is blocked.

**Acceptance Scenarios**:

1. **Given** the user selects a store, **When** they open the member picker, **Then** only members belonging to that store are selectable.
2. **Given** the user selects a member with an outstanding unpaid balance, **When** they attempt to add a chargeable line item or submit the record, **Then** the action is blocked with an explanation that outstanding balances must be resolved first.
3. **Given** the user has added one or more line items and specified the applicable billing month, **When** they submit the record, **Then** a new billing record is created and the user is returned to the Sales Management list.
4. **Given** the user changes the selected store or member after adding line items, **When** the change is confirmed, **Then** previously added line items are cleared (since they were tied to the prior member's contracts).

### Edge Cases

- What happens when a store has zero billing records for the selected month? The summary displays zero counts/amounts and the list shows an empty state.
- How does the system handle a bulk-confirm action when the current selection mixes already-confirmed and unconfirmed records? Only unconfirmed records are affected; the confirm action is unavailable when no unconfirmed record is selected.
- What happens when a card (SBPS) refund is requested more than 90 days after the original payment date? The system indicates automatic reversal is no longer available and prompts the user to arrange an alternate refund method.
- How does the system handle an attempt to add a chargeable line item, apply a fee adjustment, or submit a manual registration for a member with an outstanding unpaid balance? The action is blocked with an explanatory message.
- What happens when a user attempts to submit a refund request without entering a reason, or with a partial amount exceeding a line item's `refundableAmount`? Submission is prevented until corrected.
- What happens when a user attempts to edit line items or fee adjustments on an already-confirmed billing record? Editing controls are disabled until the record is reverted to unconfirmed by an authorized user.
- How does the system handle receipt/invoice download attempts for a billing line item whose payment is not yet confirmed? The download option is blocked.

## Clarifications

### Session 2026-10-19 (BE reply on real-API integration, verified against API-114/115/119 @ fitness-api d4130c9 + backend a9019888)

- Q: What is 請求日 on the detail 基本情報 card? → A: date part of `header.createdAt` (API-114 §6.9); not `dueDate`.
- Q: How does 確定状態で登録 work on the real API? → A: create (`POST /admin/sales/billings`) then confirm (API-114 §7), two calls (FR-011 → FR-002 flow).
- Q: What caps a partial refund? → A: `items[].refundableAmount` from the API (FR-004 Dev Q&A 08-24); FE does not compute it.
- Q: Unconfirming a billing already sent to the PSP? → A: 409 `E-BIL-105`; resend with `acknowledgePspSent: true` after the warning (FR-003).
- Q: Receipt / invoice PDF? → OPEN: no renderer yet, no ETA (lead to decide). Real status is **502** `E-EXP-001` (error-codes.ts, grpc UNAVAILABLE→502), not 503 as BE replied.

### Session 2026-10-26 (BE reply on list sorting — Otaki rulings already in API-114)

- Q: Which sorts does the 売上管理一覧 offer? → A: only API-114's four fixed sorts, one direction each: `billingMonthDesc` (default) / `totalAmountDesc` / `memberIdAsc` / `unpaidAmountDesc`; ties break on `billingId asc` (BR-BIL-007); there is no asc/desc param. Upstream F-01 does not define the list's columns, sort or search; API-114 v0.11 (2026-09-09) added only `unpaidAmountDesc` and judged sorting on the other prototype columns 「UI 過剰」 (GAP-276). New sort keys need a business reason taken to Otaki as a new request.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display, for the selected store scope and month, a sales summary showing total sales amount, total payments received, total outstanding (unpaid) amount, total refund amount, and billing confirmation status (confirmed vs. unconfirmed counts, plus bad-debt count/amount).
- **FR-002**: System MUST provide a searchable list of billing records, sortable by the four API-114 sorts only (請求月 新しい順 (default) / 請求額 高い順 / 会員ID 昇順 / 未納金 多い順 — one direction each, no other columns), filterable by store, billing type, and confirmation status, with an "unpaid only" toggle and free-text search by billing ID or member name.
- **FR-003**: Users MUST be able to select one or more billing records from the list and perform a bulk confirmation action that moves eligible (unconfirmed) records to "confirmed" status.
- **FR-004**: Users MUST be able to select one or more billing records from the list and submit a simplified refund request (a selectable reason plus free-text detail) without leaving the list view.
- **FR-005**: System MUST restrict billing confirmation, refund initiation, and accounting CSV export to authorized roles (Headquarters, Manager, System always; Staff only for confirmation when individually delegated); Trainer and Observer roles MUST NOT be able to view or act on sales data.
- **FR-006**: System MUST scope the billing records a user can see to their authorization: Headquarters sees all stores, Manager sees their assigned store(s), Staff sees only their own store.
- **FR-007**: Authorized users MUST be able to export accounting-linked CSV data (sales, payment, refund, expense, and bad-debt entries) for a selected month, choosing to output each entry type individually or combined.
- **FR-008**: System MUST display full detail for a single billing record: basic information (billing ID, date, store, member, billing type, payment method, notes), a summary (total amount, outstanding amount, created/updated timestamps and the user who last updated it), and the individual billing line items with each item's payment status.
- **FR-009**: Users MUST be able to add a new line item to an unconfirmed billing record either by selecting one of the member's existing contracts or by entering a manual item with a required justification; the system MUST block adding a chargeable item when the member has an outstanding unpaid balance.
- **FR-010**: Users MUST be able to apply a fee adjustment (fixed amount, discount amount, discount percentage, or surcharge) to a billing target with a required reason; the system MUST retain a history of each adjustment (original amount, adjustment applied, resulting amount, who applied it, and when).
- **FR-011**: Users MUST be able to submit a refund request against a billing record specifying full or partial refund (per line item) with a required reason; the system MUST present the applicable refund handling (automatic reversal within 90 days for card payments, or manual/CASHPOST handling for bank-debit payments) based on the record's payment method, and MUST flag when a card refund exceeds the 90-day reversal window.
- **FR-012**: Authorized users MUST be able to toggle a billing record between "confirmed" and "unconfirmed," recording who made the change and when.
- **FR-013**: Authorized users MUST be able to download a receipt (PDF) for a line item whose payment is confirmed, and an invoice (PDF) for upcoming or confirmed billing; receipt download MUST be blocked when the line item's payment is not confirmed. Until the BE PDF renderer exists, the real API returns 502 `E-EXP-001` (API-119); the UI MUST show the error and allow retry.
- **FR-014**: Users MUST be able to manually register a new billing record outside the standard monthly batch by selecting a store, then a member within that store, then adding one or more line items (from an existing contract or a manual entry with amount and tax rate) and an applicable billing month.
- **FR-015**: System MUST block manual billing registration — and any chargeable addition within it — for a member who has an outstanding unpaid balance.
- **FR-016**: Users MUST be able to submit a manually registered billing record in either "confirmed" or "unconfirmed" status, subject to the same role authorization as billing confirmation elsewhere (FR-005). "Confirmed" = create (`POST /admin/sales/billings`, starts `pending`) then confirm (API-114 §7) — two calls, per FR-011 「確定は FR-002 の確定フローに従う」.
- **FR-017**: System MUST require an applicable billing month to be specified before a manually registered record can be submitted.

### Key Entities

- **Billing Record**: A single billing/sales entry for a member in a given month; attributes include store, member, billing type (monthly / ad-hoc / manual), payment method, billed amount, amount paid, amount refunded, outstanding (unpaid) amount, confirmation status, bad-debt flag, and refund status.
- **Billing Line Item**: An individual charge within a billing record; attributes include its source (an existing contract or a manual entry), item label, amount, tax rate, and payment status.
- **Fee Adjustment**: A recorded change to a billing target's amount; attributes include the target, adjustment pattern (fixed amount / discount amount / discount percent / surcharge), original and resulting amounts, reason, who applied it, when, and its applied/pending status.
- **Refund Request**: A request to return money to a member against a billing record; attributes include amount, type (full or partial), reason, status (pending / approved / completed / rejected), and requester.
- **Member Contract**: An existing main or option contract belonging to a member, referenced (read-only in this feature) as the source for billing line items and fee-adjustment targets.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can locate a specific billing record via search or filter in under 15 seconds.
- **SC-002**: A user can determine a store's total unpaid/outstanding amount for the month from the summary view alone, without opening any individual record.
- **SC-003**: Billing records can be confirmed — individually or in bulk — without navigating away from the list.
- **SC-004**: 100% of submitted refund requests include a reason; none can be submitted without one.
- **SC-005**: 100% of attempts to add a chargeable item or manually register a billing record for a member with an outstanding unpaid balance are blocked.
- **SC-006**: A user can complete manual billing registration (store, member, one line item, submit) in under 3 minutes.

## Assumptions

- Underlying member contract data (main contracts and options) is already registered and available for these screens to read; contract creation/management itself is out of scope here.
- The monthly automated billing calculation batch that generates most billing records runs and produces data independently of this feature; these screens address monitoring, confirmation, detail operations, and manual/ad-hoc registration on top of that batch's output.
- Detailed transaction history (F-01-01), the receivables/collections workflow (F-01-02), and the refund-approval queue (F-01-03) are separate, related screens reachable via navigation links from these three screens, but their internal behavior is not specified by this feature.
- Role and permission definitions (Headquarters, Manager, Staff, Trainer, Observer, and any delegated position-based permission such as confirming billing after cutoff) are managed by a separate staff/permission capability and are treated here as an existing dependency.
- Standard regional formatting conventions apply: currency in Japanese yen, dates in YYYY/MM/DD.
