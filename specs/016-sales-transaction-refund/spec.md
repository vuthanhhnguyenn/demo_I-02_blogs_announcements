# Feature Specification: Sales Transaction History, Receivables, and Refund Management (List Screens)

**Feature Branch**: `016-sales-transaction-refund`
**Created**: 2026-07-13
**Status**: Draft
**PO Spec**: `F-01` — 売上管理 (Sales Management), supplementary sections F-01-01 (入出金明細), F-01-02 (請求・未回収管理), F-01-03 (返金手続き一覧)
**Source**: `pages/sales-transaction-list.tsx`, `pages/sales-receivable-list.tsx`, `pages/sales-refund-list.tsx` + `requirements/F-01.md`
**Input**: User description: "Create spec for transactions, receivables, refunds page"

## User Scenarios _(mandatory)_

### User Story 1 - Resolve unpaid receivables before they become bad debt (Priority: P1)

A store Staff member or Manager reviews the list of members with unpaid balances, drills into a member to see which months and contracts are unpaid, and either issues a convenience-store payment link to help the member pay or marks the balance as excluded from automatic bad-debt write-off (with a required reason).

**Why this priority**: Unresolved unpaid balances convert into a financial loss (bad debt) at month-end if no action is taken. This is the single highest-value daily action on these three screens because it directly prevents revenue loss.

**Verification**: Open the receivables screen's unpaid list, filter by unpaid month, click into a member row to open the unpaid-detail panel, issue a convenience-store payment link for one line item, then mark a different member's balance as excluded from bad debt with a reason; verify the status badges and detail panel reflect each action.

**Acceptance Scenarios**:

1. **Given** a store has members with unpaid balances, **When** the user opens the receivables screen, **Then** the unpaid list shows each member's store, unpaid months, total unpaid amount, last billing date, payment method, and status (uncollected / rebilling / convenience-payment-in-progress / bad-debt-target / bad-debt-excluded).
2. **Given** the user filters the unpaid list by a specific unpaid month, **When** the filter is applied, **Then** only members with an unpaid balance in that month are shown, and the result count is displayed.
3. **Given** the user clicks a member row, **When** the unpaid-detail panel opens, **Then** it lists each unpaid line item (month, contract type, contract name, amount) and flags which main-contract items are eligible for JACCS subrogation (within the most recent 3 months).
4. **Given** a member's unpaid balance, **When** an authorized user issues a convenience-store payment link (for one line item or the member's full balance), **Then** the system confirms the link/notification was issued and explains that the unpaid flag clears automatically once payment is confirmed.
5. **Given** a member's unpaid balance is not yet excluded from bad debt, **When** an authorized user (Headquarters or Manager) marks that billing (per `billingId`, API-117 §9) as excluded with a required reason, **Then** the member's status changes to "bad-debt-excluded," and the acting user, timestamp, and reason are recorded; the same user can later release the exclusion (also with a required reason).
6. **Given** the current user's role is Staff, **When** they attempt the bad-debt exclusion action, **Then** the action is unavailable to them.

---

### User Story 2 - Confirm next month's billing batch before it locks (Priority: P1)

A Manager (or a Staff member individually delegated the permission) reviews the full list of charges scheduled for next month — broken down by payment processor — and confirms them all in one action so they can be sent to the payment processors on schedule.

**Why this priority**: Without this confirmation step, no revenue is billed the following month at all. It is as critical to the business as collecting existing unpaid balances, but addresses future revenue rather than recovering past revenue.

**Verification**: Open the receivables screen's upcoming-billing tab, review the SBPS/JACCS summary cards and the per-member table (including any unpaid-amount surcharges rolled into the month's bill), then run the bulk confirm action and verify all entries move out of the unconfirmed queue.

**Acceptance Scenarios**:

1. **Given** next month's billing amounts have been calculated, **When** the user opens the upcoming-billing tab, **Then** summary cards show the total scheduled amount and count, plus the SBPS and JACCS sub-totals and counts.
2. **Given** the per-member table, **When** a member's next bill includes rolled-over unpaid amounts from prior months, **Then** the row is labeled distinctly (e.g., "monthly billing + unpaid rollover") and a note states which months were added.
3. **Given** all entries are still unconfirmed, **When** an authorized user runs the bulk confirm action, **Then** a confirmation dialog summarizes the total count and amount (with the SBPS/JACCS split) before the action is finalized.
4. **Given** the current user is Staff without the individually-delegated confirmation permission, **When** they view the bulk confirm control, **Then** it is disabled with an explanation that they lack the required permission.
5. **Given** there are zero entries scheduled for next month, **When** the user opens the upcoming-billing tab, **Then** an empty state is shown and the bulk confirm action is unavailable.

---

### User Story 3 - Approve or reject pending refund requests (Priority: P1)

A Manager or Headquarters user reviews the queue of pending refund requests submitted by store staff, checks each request's reason and payment method, and approves or rejects it. Approval executes SBPS refunds immediately; JACCS / CASHPOST / cash / bank-transfer refunds move to 処理中 (`processing`) until a Manager+ user marks them executed (API-118 §12).

**Why this priority**: Refunds involve returning money to members and require accountable, hierarchical sign-off. Until a request is approved or rejected, the member's issue remains unresolved and money-in-transit risk exists, making this equally urgent to the two receivables-side workflows above.

**Verification**: Open the refund list, confirm the pending-count banner, open a pending request's detail panel, attempt to approve it as a user without sufficient authority (verify it is blocked with an explanation), then switch to an authorized user and approve it via the confirmation dialog; separately, select multiple pending requests and run the bulk-approve action where some are outside the user's authority.

**Acceptance Scenarios**:

1. **Given** there are pending refund requests, **When** the user opens the refund list, **Then** a banner shows the total pending count and combined pending amount, and the table shows each request's ID, store, member, product, sale amount, refund amount, status, payment method, requester (with role), and approver (if decided).
2. **Given** a request was submitted by a Staff member, **When** a Manager or Headquarters user opens it, **Then** they can approve or reject it; **Given** the same request, **When** a Staff user views it, **Then** approve/reject controls are disabled with an explanation that Manager-or-above approval is required.
3. **Given** a request was submitted by a Headquarters user, **When** any user other than System views it, **Then** approve/reject controls are disabled with an explanation that only a System-level approval applies.
4. **Given** an authorized user clicks approve, **When** the confirmation dialog appears, **Then** it shows payment-method-specific guidance: SBPS = automatic reversal (within 90 days), executed on approval; JACCS = the approver chooses manual refund or CASHPOST (`executionMethod` required, API-118 §7); other non-SBPS = executed outside the CRM, then marked executed.
5. **Given** the user selects multiple pending requests including some outside their approval authority, **When** they run bulk-approve, **Then** only the requests within their authority are processed, and the count of excluded requests is clearly indicated before and after the action.
6. **Given** completed (approved) refunds exist, **When** an authorized user (Headquarters, Manager, or System) exports the refund CSV, **Then** the export excludes SBPS-settled refunds and includes only approved/completed entries.

---

### User Story 4 - Reconcile historical transactions (Priority: P2)

A Staff member or Manager looks up the full history of sales, refunds, payments, and repayments to confirm a past fact (e.g., verifying with a member over the phone that a specific charge or refund occurred), and can jump directly into a refund request from a completed sale if needed.

**Why this priority**: This is primarily a lookup/audit capability that supports the other three (action-oriented) workflows rather than driving new outcomes on its own, so it is valuable but less urgent than resolving receivables, confirming billing, or approving refunds.

**Verification**: Open the transaction list, search by member ID or name, apply date-range/store/type/payment-method filters, export the filtered results to CSV, then click into a confirmed "sale" row and start a refund request; verify a canceled transaction's refund action is disabled.

**Acceptance Scenarios**:

1. **Given** the store's full transaction history, **When** the user opens the transaction list, **Then** each row shows transaction date, member ID/name, store, transaction type (売上 sale / 入金 payment / 返金 refund / 貸倒 write_off), billing detail ID (one row = one billing line for sales / refunds, one row per payment / write-off — API-116 v0.7.3 §3.5), tax-excluded amount, tax rate (the line's rate; blank for a refund line without `billingItemId` or a mixed-rate payment / write-off), tax-included amount, payment method, and status (confirmed / processing / canceled / uncollected).
2. **Given** the user applies a date range, store, transaction type, and/or payment method filter, **When** the filters are applied, **Then** the list narrows to matching rows and an active-filter summary is shown with a way to clear all filters at once.
3. **Given** an active search/filter, **When** the user exports to CSV, **Then** the exported file reflects the same search/filter conditions currently applied.
4. **Given** a transaction row with type "sale" and status "confirmed," **When** the user clicks the refund-request action, **Then** a dialog opens allowing full or partial refund (per line item, since tax rates can differ) with a required reason, and the dialog's guidance text matches the row's payment method (SBPS vs. JACCS).
5. **Given** a transaction row with type "sale" and status "canceled," **When** the user views the refund-request action, **Then** it is disabled with an explanation that canceled transactions are not eligible for refund.
6. **Given** zero transactions match the current search/filter, **When** the list renders, **Then** an empty state is shown with an option to clear the filters.

### Edge Cases

- What happens when a store has zero unpaid receivables? The unpaid list shows an empty state with zero summary counts.
- What happens when a member's unpaid balance spans more than 3 months? Only the most recent 3 months of main-contract unpaid amounts are eligible for JACCS subrogation; older months are not, and this distinction is visible per line item.
- How does the system handle a bad-debt exclusion action submitted without a reason? Submission is blocked until a reason is entered, for both excluding and releasing an exclusion.
- What happens when the bulk-confirm action for upcoming billing is attempted with zero unconfirmed entries? The action is unavailable/disabled.
- How does the system handle a bulk refund approve action where every selected request is outside the current user's authority? The action is disabled (zero approvable requests), rather than silently completing.
- What happens when a refund approval decision is attempted without going through the confirmation dialog? The system always requires the confirmation step before executing an approve/reject decision, whether single or bulk (bulk is approve only).
- What happens when a user tries to request a refund for a non-"sale" transaction type (e.g., an existing refund or payment record)? The refund-request action is not offered for those rows.
- How does the system handle a partial refund request where the specified amount exceeds the original transaction's tax-included amount? Submission is blocked until the amount is corrected.
- What happens when a user without access to a given store attempts to view its transactions, receivables, or refund requests? Those records are excluded from all three screens for that user.

## Clarifications

### Session 2026-10-19 (BE reply on real-API integration, verified against API-116/117/118/119 @ fitness-api d4130c9 + backend a9019888)

- Q: Is a 入出金明細 row one billing or one 明細? → A: **one billing line** for sales and refunds (Otaki ruling 2026-10-20, option B′ → API-116 v0.7.3 §3.5): `rowKey` is the row key, `billingItemId` replaces `billingItemIds[]`, a sale row's `refundApplyContext` is that line's remainder (`null` when not refundable), and excluded lines are not rows. Payments and write-offs stay one row per source row. Matches FR-002-a L383–386 as written. Round 1 shipped the old billing grain; switching waits for the BE (not in MR !808).
- Q: Transaction type labels? → A: 売上 / 入金 / 返金 / 貸倒 (`write_off`), replacing 払戻 (Otaki 2026-10-14, API-116 §7.2). FR-002-a still says 払戻.
- Q: Payment method on sale / write_off rows? → A: the member's current primary method (API-116 §3.3 v0.7).
- Q: Does approval refund immediately? → A: SBPS only. Non-SBPS stays `processing` until a Manager+ user with `can_execute_refund` calls mark-executed (API-118 §12). The detail's `editableActions` carries `markExecuted` when that call is allowed for the caller (API-118 v0.14.4, Otaki ruling ⑤ 2026-10-20); the FE shows the 実行記録 button from it. `displayStatus` has 7 values (BR-REF-010, API-118 §13.11). FR-004 / FR-004-a (即時返金, 3 statuses) are not yet updated.
- Q: Reject / JACCS approve inputs? → A: `rejectionReason` required (1–500); `executionMethod` (`jaccs_manual` | `cashpost`) required when `alertVariant = jaccs_manual_or_cashpost`, i.e. for jaccs_bank (API-118 §7–8).
- Q: Bad-debt exclusion grain? → A: per billing (API-117 v0.11.2 §9), Headquarters / Manager. FR-007's 「請求明細」 means the unpaid month's billing (Otaki ruling 2026-10-20).
- Q: Swagger bodies for refund-applications / refund-exports? → A: fixed in backend MR !808 (not merged). Until it merges, FE must NOT send `null` for bulk `note` or mark-executed `externalReferenceId` / `executorMemo` / `failureReason` (400 `E-VAL-001` today). BE confirmed (2026-10-20): omit the keys when empty — this stays valid after !808.
- Q: Can refundability return `alertVariant = no_payment_yet`? → A: yes, and !808 does not change `GET …/refundability` (it only drops the value from refund-application responses). In practice it cannot occur (create already blocks unpaid lines with `E-REF-011`). FE gates approve on `blockReason` only (null = approvable; `SBPS_PAST_WINDOW` / `NO_PAYMENT_YET` / `ALREADY_REFUNDED` = blocked, API-118 §11) and marks each line by `lines[].canRefund` (`variantRefundable` is internal to billing-svc and not returned — BE confirmed 2026-10-20). `blockReason` is non-null whenever any line has `canRefund = false`, so it covers both "variant not refundable" and "requested amount over `refundableAmount`"; the over-amount case is reported as `ALREADY_REFUNDED` (refund.service.ts:485-491), so its UI copy must say the amount exceeds the refundable balance, not only "already refunded"; `no_payment_yet` falls into the default branch with no dedicated UI.

### Session 2026-10-26 (BE reply on list sorting — Otaki rulings already in API-118)

- Q: Which columns can the refund queue sort by? → A: only API-118's four sort keys with `order` asc/desc: `appliedAt` (default) / `approvedAt` / `totalRefundAmount` / `status`. API-118 v0.13 (2026-09-08, Otaki R-1〜R-8): 「ソートキー変更なし」; sorting on 返金ID / 売上額 was removed from the FE. Upstream F-01 FR lists filters only (status / 申請日レンジ / 決済手段 / 申請者ロール), no sort. New sort keys need a business reason taken to Otaki as a new request.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display, for the user's authorized store scope, a searchable list of all transaction records (sale, payment, refund, write_off 貸倒 — API-116 §7.2), one row per billing line for sales / refunds and one per payment / write-off (API-116 v0.7.3 §3.5, keyed by `rowKey`), with transaction date, member ID/name, store, transaction type, billing detail ID (`billingItemId`), tax-excluded amount, tax rate (the line's; null when a payment / write-off mixes rates), tax-included amount, payment method, and status (confirmed / processing / canceled / uncollected).
- **FR-002**: Users MUST be able to filter the transaction list by transaction date range, store, transaction type, and payment method, and free-text search by member ID or name; all applied conditions MUST be clearable in a single action.
- **FR-003**: Users MUST be able to export the transaction list to CSV while preserving the currently applied search/filter conditions.
- **FR-004**: Users MUST be able to initiate a refund request directly from a confirmed "sale" transaction row, specifying full or partial refund amount (partial refunds specified per billing line item) and a required reason; the system MUST block the refund action for non-"sale" or canceled rows, with an explanation shown.
- **FR-005**: When a refund request is being created, the system MUST show payment-method-specific guidance: card (SBPS) payments will be reversed automatically within 90 days of the original charge; bank-debit (JACCS) payments require manual refund or CASHPOST handling.
- **FR-006**: System MUST display, for the user's authorized store scope, a list of members with unpaid balances showing store, member ID/name, all unpaid months, total unpaid amount, last billing date, payment method, and status (uncollected / rebilling / convenience-payment-in-progress / bad-debt-target / bad-debt-excluded), filterable by unpaid month.
- **FR-007**: Users MUST be able to open a per-member unpaid-detail view listing each unpaid line item (month, contract type, contract name, amount), with main-contract items flagged for JACCS subrogation eligibility when the unpaid month falls within the most recent 3 months.
- **FR-008**: Authorized users MUST be able to issue a convenience-store payment link for a member's unpaid balance, either for an individual unpaid line item or in bulk for the member's full unpaid balance; the system MUST state that the unpaid flag clears automatically once payment is confirmed.
- **FR-009**: System MUST continue billing unpaid amounts in subsequent months with no time-based cutoff, and MUST always show which originating month(s) each unpaid amount belongs to.
- **FR-010**: Users with System, Headquarters or Manager roles (F-01 権限マトリクス 貸倒対象外指定; role-only, no 職位 flag) MUST be able to mark an unpaid billing (per `billingId`; API-117 §9 has no per-line-item exclusion) as excluded from automatic bad-debt processing, and to release that exclusion, each action requiring a reason and recording the acting user and timestamp; Staff MUST NOT have access to this action.
- **FR-011**: System MUST display, for the user's authorized store scope, a list of billing entries scheduled for next month (not yet confirmed) showing member, billing type (standard monthly / monthly with unpaid-amount rollover / ad-hoc), payment method, amount, billing month, and any explanatory note (e.g., which prior months' unpaid amounts were added).
- **FR-012**: System MUST display summary totals for the upcoming-billing list broken down by payment processor (SBPS total/count, JACCS total/count) alongside the combined total/count.
- **FR-013**: Authorized users MUST be able to confirm all unconfirmed upcoming-billing entries in a single bulk action, with a confirmation step that summarizes the total count and amount (and the SBPS/JACCS split) before finalizing; this action MUST be restricted to Headquarters, Manager, and System roles, and to Staff only when individually delegated the permission.
- **FR-014**: System MUST display, for the user's authorized store scope, the queue of refund requests (`displayStatus`: pending_approval / processing / refunded / failed / rejected / cancelled / expired — BR-REF-010, API-118 §13.11) with refund ID, store, member, target product/item, original sale amount, refund amount, status, payment method, requester (with role), and approver/approval date when decided; a banner MUST show the count and combined amount of currently pending requests.
- **FR-015**: Users MUST be able to filter the refund queue by status, payment method, requester role, and request-date range, free-text search by refund ID or member name, and sort by 申請日 (default) / 承認日 / 返金額 / ステータス in either direction (API-118 sort keys; no other columns).
- **FR-016**: System MUST enforce a hierarchical approval rule for refund requests: a request submitted by Staff requires approval from Manager or above; a request submitted by Manager requires approval from Headquarters or above; a request submitted by Headquarters requires approval from System only. Users lacking sufficient authority for a given request MUST see approve/reject controls disabled with an explanation of the required approver level.
- **FR-017**: Approving a refund request MUST execute SBPS refunds immediately; non-SBPS refunds (JACCS manual / CASHPOST / cash / bank transfer) stay `processing` until a Manager+ user with `can_execute_refund` records the outcome via mark-executed (API-118 §12); the 実行記録 action MUST follow the detail's `editableActions` (`markExecuted`, API-118 v0.14.4). The approval dialog MUST require `executionMethod` (manual refund or CASHPOST) for JACCS, and the list MUST show the server's `displayStatus`.
- **FR-018**: Users MUST be able to select multiple pending refund requests and approve them in a single bulk action (there is no bulk reject — rejection is per request with a required reason; F-01 FR-004-a, API-118 v0.16.1 §2, Otaki 2026-10-27 ⑦); requests outside the current user's approval authority MUST be automatically excluded from the bulk action, with the excluded count clearly indicated before and after the action runs.
- **FR-019**: System MUST require an explicit confirmation step before finalizing any refund approve/reject decision, whether performed individually or as a bulk approve.
- **FR-020**: Users with Headquarters, Manager, or System roles MUST be able to export a refund CSV that excludes SBPS-settled refunds and includes only approved/completed refund entries.
- **FR-021**: System MUST scope all records shown across the transaction list, receivables list, and refund queue to the current user's store authorization: Headquarters sees all stores, Manager sees their assigned store(s), Staff sees only their own store; Trainer and Observer roles MUST NOT be able to view or act on any of these three screens.
- **FR-022**: System MUST provide pagination (page-size selection and page navigation) on every list/table view across the three screens, and MUST show an appropriate empty state whenever a filtered or unfiltered list has zero matching records.

### Key Entities

- **Transaction Record**: A single entry in the full sales/money-movement history; attributes include transaction date, member, store, transaction type (sale / payment / refund / write_off), related billing and billing line (`billingItemId`; one row per line for sales / refunds — API-116 v0.7.3), tax-excluded amount, tax rate, tax-included amount, payment method, and status (confirmed / processing / canceled / uncollected).
- **Unpaid Receivable**: An aggregated view, per member, of one or more unpaid billing amounts; attributes include store, unpaid months, total unpaid amount, last billing date, payment method, and status (uncollected / rebilling / convenience-payment-in-progress / bad-debt-target / bad-debt-excluded); composed of one or more Unpaid Line Items.
- **Unpaid Line Item**: A single unpaid charge within an Unpaid Receivable; attributes include the originating month, contract type (main contract / option / ad-hoc charge), contract name, amount, status, payment method, and (for main-contract items) JACCS subrogation eligibility.
- **Upcoming Billing Entry**: A scheduled-but-not-yet-confirmed charge for next month; attributes include member, billing type (standard / with unpaid rollover / ad-hoc), payment method, amount, billing month, explanatory note, and unconfirmed status.
- **Refund Request**: A request to return money to a member, tracked through to completion or rejection; attributes include store, target sale/transaction, sale amount, refund amount (full or partial), reason, status (`displayStatus`, 7 values per BR-REF-010), payment method, requester (and their role), and approver/approval timestamp once decided.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can locate a specific historical transaction via search or filter in under 15 seconds.
- **SC-002**: A user can determine a store's total unpaid amount and bad-debt-eligible count for the current period directly from the receivables list, without opening any individual member's detail.
- **SC-003**: All unconfirmed upcoming-billing entries for a store can be confirmed in a single bulk action without navigating away from the upcoming-billing view.
- **SC-004**: 100% of submitted refund approve/reject decisions pass through an explicit confirmation step before taking effect.
- **SC-005**: 0% of refund requests are approved or rejected by a user below the required hierarchical authority level for that request.
- **SC-006**: 100% of bad-debt exclusion and exclusion-release actions are submitted with a recorded reason, acting user, and timestamp.
- **SC-007**: A user can issue a convenience-store payment link for a member's unpaid balance without leaving the receivables list (i.e., entirely from the list and its detail panel).

## Assumptions

- The monthly automated billing calculation batch (covered by the related Sales Management feature) is what populates the upcoming-billing entries and, upon collection failure, the unpaid receivables shown here; this feature covers monitoring and acting on that data, not the calculation itself.
- Refund requests can originate either from this transaction list or from the main Sales Management list/detail screens (a separate, related feature); this feature's refund screen is the approval/processing queue for requests however they originate.
- The monthly bad-debt write-off batch runs automatically at month-end against unpaid receivables not marked as excluded; this feature covers the exclusion/release action and viewing bad-debt status, not the write-off batch itself.
- Role and permission definitions (Headquarters, Manager, Staff, Trainer, Observer, and any individually delegated position-based permission such as billing confirmation after cutoff) are managed by a separate staff/permission capability and are treated here as an existing dependency.
- Accounting-linked CSV exports covering sales/payment/refund/expense/bad-debt entries in bulk (for accounting system integration) are handled by the related Sales Management feature; this feature's CSV exports are limited to the transaction list export (FR-003) and the refund-specific export (FR-020).
- Standard regional formatting conventions apply: currency in Japanese yen, dates in YYYY/MM/DD format.
- The reference period for accessible transaction history is 12 months, consistent with the broader Sales Management feature's data-retention assumption.
