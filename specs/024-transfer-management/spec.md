# Feature Specification: Transfer Management (Member Store Transfers)

**Feature Branch**: `024-transfer-management`
**Created**: 2026-08-05
**Status**: Draft
**PO Spec**: `A-02` — 移籍管理一覧 (Transfer Management List)
**Source**: `transfer-list.tsx` + `transfer-detail.tsx` (dx-fitness/fitness-crm-ui @ 47423ec, 2026-09-30 — transfer screens last changed in 1767864, 2026-09-17) + `crm/requirements/A-02.md` (dx-fitness/fitness-spec @ 486804b, A-02 260901*v3 — adds the 自動移籍可否 filter to FR-001 and 一括承認 to FR-002)
**Last Updated**: 2026-11-06 — a header store switch now clears the bulk selection at once instead of pruning it when the new list arrives, and while the list still shows the previous result during a load no row can be selected or decided (MR review: on a slow network 一括承認 stayed armed with the previous store's requests while the header already showed the new store; see FR-004 / FR-013 / Edge Cases). 2026-11-02 — the header store scope narrows the list to requests whose origin **or** destination is the selected store (tester Bug-No8; API-091 v0.9 `storeId`; prototype `transfer-list.tsx` scope filter); switching it returns to page 1 and prunes the bulk selection like a filter change (see FR-004 / US1 AS-6 / Edge Cases). 2026-10-12 — a decision from either screen also refreshes the member's own screens (member list / detail, 契約操作 tab main contract and 契約サマリー; MR review; see FR-017 / SC-002 / Edge Cases). 2026-10-12 — bulk-approve selection is capped at 50 requests per action (provisional UI limit, MR review; see FR-013 / Assumptions). 2026-10-06 — edge cases added for list load failure and concurrent decisions (409 / double submit); FR-012 manual release realigned to API-091: the release is the approval itself (reason → approve `comment`), no separate release step or 手動解除済み state; remaining days read from `autoTransfer.cancellationFeeUntil`. 2026-10-05 — source references bumped to A-02 v3; success criteria, bulk-selection edge case and kept deviations aligned with the shipped behavior (2026-10-02: re-synced to the latest prototype; UI not present in the prototype was removed — see \_Prototype Alignment*).
**Input**: User description: "create spec for member transfers management; spec: A-02.md; ui V0: transfer-list.tsx, transfer-detail.tsx"

## User Scenarios _(mandatory)_

### User Story 1 - Review and filter transfer requests (Priority: P1)

A store or headquarters staff member opens the transfer management screen to see every member transfer request across both brands (JOYFIT, FIT365) — who is transferring, from which store, to which store, and where each request stands. They narrow the list through the 詳細フィルター panel — status, origin/destination store, brand, applied-date period, and auto-transfer eligibility — then drill into a specific request to see full detail. There is no free-word search in Phase 1.

**Why this priority**: Without a reliable, filterable overview, staff cannot track pending approvals or answer "where is this member's transfer" questions. This is the foundation every other action in this feature depends on.

**Verification**: Load the transfer management screen, confirm rows for both brands render with the documented columns, apply each filter individually and in combination, confirm the result count and banner match, then click a row to reach the transfer detail screen.

**Acceptance Scenarios**:

1. **Given** transfer requests exist across multiple stores and brands, **When** a Headquarters user opens the list with no filters applied, **Then** all requests within their permitted scope are shown with member ID, member name, brand, origin store, destination store, applied date, scheduled date, auto-transfer eligibility, and status.
2. **Given** the list is showing all requests, **When** the user selects a status filter (e.g. "移籍元承認待ち"), **Then** only requests matching that status remain, and the result count / filter summary banner updates accordingly.
3. **Given** a Store Staff user (not Headquarters/Manager) views the list, **When** the page loads, **Then** only requests where their store is the origin or destination store are visible.
4. **Given** the user applies filters, **When** no request matches, **Then** a filtered empty state is shown with a "条件をクリア" action that resets every filter.
5. **Given** a matching row is visible, **When** the user clicks anywhere on the row (outside the checkbox/action controls), **Then** the transfer detail screen for that request opens.
6. **Given** a Headquarters user on the list with the header store scope at 「全店舗（本部）」, **When** they pick a single store in the header, **Then** only requests whose origin store or destination store is that store remain, the in-screen filters still apply on top, and the list returns to page 1; picking 「全店舗（本部）」 again shows every in-scope request.

---

### User Story 2 - Approve or reject a transfer request (Priority: P2)

A staff member with approval rights opens a pending transfer request and reviews the brand-specific approval flow — a visual timeline showing which steps are complete and which remain. They approve or reject the request, optionally leaving a comment, and the request's status and timeline update to reflect the decision.

**Why this priority**: Approving/rejecting is the core action this screen exists to support; the list (P1) only has value once staff can act on what they see.

**Verification**: Open a pending JOYFIT request and a pending FIT365 request; confirm the timeline shows the brand-specific step count with completed steps marked; approve one and reject the other; confirm status and timeline reflect the outcome and a confirmation is shown.

**Acceptance Scenarios**:

1. **Given** a JOYFIT transfer request awaiting origin-store approval, **When** an authorized user approves it, **Then** the system records the approval, immediately executes the store transfer (subject to exclusion checks in User Story 3), and the timeline shows all 3 steps (Apply → Origin approval → Automatic execution) as complete.
2. **Given** a FIT365 transfer request awaiting origin-store approval, **When** an authorized user approves it, **Then** the request status moves to "移籍先承認待ち", the timeline shows steps 1–2 as complete and step 3 of 4 (destination approval) as 承認待ち, and the detail's approve button reads "移籍先として承認".
3. **Given** a FIT365 transfer request awaiting destination-store approval, **When** the destination store approves it, **Then** the transfer executes, the member's contracted store updates to the destination store, and all 4 steps show complete.
4. **Given** a pending request (either brand), **When** an authorized user rejects it with an optional comment, **Then** the request status becomes "否認", the case is closed, and the applicant is notified.
5. **Given** a user without approval permission (Trainer or Observer), **When** they view a pending request, **Then** the approve/reject controls are disabled or hidden with an explanation, and the action cannot be performed.
6. **Given** a Staff/Manager user whose store does not own the request's current step (the origin store while 移籍元承認待ち, the destination store while 移籍先承認待ち), **When** they view the request in the list or detail, **Then** both 承認 and 否認 are disabled with the tooltip "{移籍元|移籍先}店舗（{store}）の承認待ちのため、所属店舗からは操作できません".
7. **Given** a JOYFIT request with an auto-transfer exclusion, **When** the user views it, **Then** 承認 is disabled with the exclusion reason as tooltip (未納: "未納金があるため承認できません。未納解消後に再申請してください"; 縛り期間: list — "…移籍詳細から管理者権限で手動解除してください", detail — "…管理者権限で手動解除すると承認できます"), while 否認 stays available.

---

### User Story 3 - Handle JOYFIT auto-transfer exclusions and bulk approval (Priority: P3)

For JOYFIT requests, headquarters/store staff need to know at a glance whether a request qualifies for automatic transfer execution, and if not, why (an unpaid balance or an active cancellation-fee/campaign-lock period). A Headquarters or Manager user can select multiple eligible pending requests (either brand) from the list and approve each one's current step together in one action, or — for a locked request — manually override the block with a required justification.

**Why this priority**: This is JOYFIT-specific operational efficiency and an exception-handling path; it depends on Stories 1 and 2 already working and is not required for a minimum viable single-request review/approval flow.

**Verification**: Load JOYFIT requests with each exclusion reason, confirm the list badge names the reason and the detail alert shows the correct detail (amount + billing period, or remaining days); select several eligible rows (JOYFIT and FIT365) and bulk-approve; attempt to manually unlock a campaign-locked request and confirm the required-reason validation and that confirming approves the request with the reason as its comment.

**Acceptance Scenarios**:

1. **Given** a JOYFIT request with an outstanding unpaid balance, **When** the user views the list or detail screen, **Then** an "excluded: unpaid balance" indicator is shown (with the amount and billing period on the detail screen — the list response carries neither), and the request cannot be auto-transferred or selected for bulk approval.
2. **Given** a JOYFIT request within its cancellation-fee (campaign lock) period, **When** the user views the detail screen, **Then** a warning shows the remaining lock days, and a Headquarters/Manager user sees an option to manually override the lock with a required reason; confirming it approves the request (JOYFIT → 完了) with the reason recorded as the approval comment.
3. **Given** a Headquarters or Manager user submits a manual override without entering a reason, **When** they attempt to confirm, **Then** the confirmation is blocked until a reason is provided.
4. **Given** multiple pending requests whose current step belongs to the user's store and that carry no exclusion, **When** a Headquarters/Manager user selects several and confirms bulk approval, **Then** each selected request's current step is approved in one action (JOYFIT executes automatically; FIT365 advances one step, as the dialog explains), and the selection clears.
5. **Given** an excluded JOYFIT request, **When** the user attempts to select its row checkbox for bulk approval, **Then** the checkbox is disabled with an explanation that individual handling is required.

### Edge Cases

- What happens when a JOYFIT request has both an unpaid balance and an active campaign lock simultaneously? Both exclusion indicators must be shown together.
- How does the system handle a FIT365 request rejected at the destination-store stage after the origin store already approved it? The case closes and the applicant is notified; the prior origin approval does not carry over to any resubmission.
- What happens when a non-privileged role (Trainer/Observer) attempts an approve/reject action outside the UI (e.g. direct request)? The action must be rejected server-side regardless of UI gating.
- How does bulk-selection behave across pagination or when filters change? Selection is keyed by request ID: it survives page changes (rows selected on other pages are still included in the bulk action), but when a filter changes, only the selected requests present in the first page of the new results stay selected — the rest are dropped, so the bulk action never includes a request the user can no longer see under the current filters. The 50-request cap (FR-013) counts selections across all pages: once 50 are selected, every unselected checkbox is disabled and select-all adds rows only up to the cap.
- What happens when the operator switches the header store while on a later page or with rows selected? The list returns to page 1 (the old page may not exist in the narrower result), and the whole selection is cleared at the moment of the switch — even on a slow network, the bulk bar must not stay armed with the previous store's requests while the header already names the new store. Until the new store's list arrives, the previous rows stay on screen dimmed but cannot be re-selected or decided. A page number opened from a URL is kept while the header scope is still loading.
- What happens when the filtered list has zero results? An empty state is shown, with a way to clear filters if any are active.
- What happens when the list request fails? The table shows an error state with a retry action (not the empty state, so a failure never reads as "no requests"), and a toast reports the failure.
- What happens when another operator already moved a request on, so an approve/reject/override targets a step that no longer exists? The server rejects it with 409 (the request carries the status the user saw as an optimistic lock); the screen shows the failure toast, refreshes the list/detail and closes the dialog. While a decision is in flight, repeated submits are ignored, so one click never decides twice.
- What happens to a member screen the operator opened before a transfer was approved (member list, member detail, the 契約操作 tab)? It must not keep showing the old 主契約店舗 or contract summary once the transfer completes: the decision refreshes those reads (FR-017), so returning to that screen shows the destination store without a manual reload. This holds for approvals from the list row, the detail screen, 手動解除 and 一括承認 alike.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a list of transfer requests with the columns, in order: selection checkbox, 会員ID, 会員名 (links to member detail), ブランド, 移籍元店舗, 移籍先店舗, 申請日, 移籍予定日, 自動移籍可否, ステータス, row action menu. Status values follow API-091: 申請中 / 移籍元承認待ち / 移籍先承認待ち / 完了 / 否認. 申請中 is display/filter only — approve/reject accept only the two 承認待ち statuses (`expectedStatus`).
- **FR-002**: System MUST let users filter the list through a collapsible 詳細フィルター panel (toggle shows the active-filter count; label switches to 閉じる while open) by status, origin store, destination store, brand, applied-date period (今月 / 先月 / 今年), and auto-transfer eligibility (自動可のみ / 除外あり), combinable. The panel has no separate clear-all button — filters are cleared from the result banner or the empty state.
- **FR-003**: Free-word search (request ID / member name) is out of Phase 1 scope and MUST NOT be shown; narrowing is by FR-002 filters only.
- **FR-004**: System MUST scope visible requests to the acting user's permitted stores: Headquarters and System see all stores/brands; Manager sees requests where either the origin or destination store is within their managed stores; Staff sees requests where either store is their own store; Observer sees the same scope as Staff but read-only. When the header store scope is a single store, the list is further narrowed to requests whose origin **or** destination is that store (sent as `storeId`; omitted for 「全店舗（本部）」), ANDed with every FR-002 filter; a header store switch returns to page 1 and clears the bulk selection at the moment of the switch — not when the new store's list arrives — since every selected request belongs to the previous scope.
- **FR-005**: Users MUST be able to open a transfer detail view from any list row.
- **FR-006**: System MUST show, for JOYFIT requests only, whether the request is eligible for automatic transfer, and when not eligible, the specific exclusion reason(s) — unpaid balance (with amount and billing period) and/or active cancellation-fee/campaign-lock period (with remaining days).
- **FR-007**: System MUST visualize the approval flow as a timeline that differs by brand: JOYFIT shows 3 steps (Apply → Origin-store approval → Automatic execution); FIT365 shows 4 steps (Apply → Origin-store approval → Destination-store approval → Transfer execution). Completed steps show a success check, the JOYFIT automatic step shows a bot icon with a 自動実行 badge, all other steps show a muted clock; approval steps carry a 移籍元 / 移籍先 badge. The card header shows a brand-colored flow badge (自動移籍 / 手動移籍（2段階承認）) and a one-line flow note. No separate "current step" highlight is drawn.
- **FR-008**: Users with Headquarters, System, Manager, or Staff roles MUST be able to approve or reject (否認) a pending transfer request, optionally including a free-text comment, from the list row menu or the detail status card. Staff/Manager may act only when their store owns the current step (HQ/System act on all stores); 承認 is additionally blocked by a JOYFIT exclusion (FR-006). The UI wording is 否認 throughout (button, dialog title "移籍申請を否認しますか？", description "… 否認後、申請者へ通知され、案件はクローズされます。", action "否認する").
- **FR-009**: Trainer and Observer roles MUST NOT be able to approve or reject a transfer request; Trainer has no access to this feature and Observer has read-only access.
- **FR-010**: For JOYFIT requests, System MUST automatically execute the store transfer (updating the member's contracted store) immediately following origin-store approval, unless the request is excluded per FR-006.
- **FR-011**: For FIT365 requests, System MUST require sequential approval from both the origin store and the destination store before executing the transfer; a rejection at either stage closes the case and notifies the applicant.
- **FR-012**: Users with Headquarters, System, or Manager roles MUST be able to manually override an active cancellation-fee/campaign-lock exclusion by providing a required reason. The override is the approval itself: confirming approves the request's current step with the reason as the approval comment (max 500 characters) — there is no separate release step and no "released" state. The override is offered only on a pending request whose current step the user may act on (FR-008), and not while an unpaid exclusion is also present (an unpaid balance cannot be waived).
- **FR-013**: Users with Headquarters, System, or Manager roles MUST be able to select multiple eligible requests (either brand) from the list and approve each one's current step in a single bulk action. Decided rows show no checkbox; rows whose current step belongs to another store, or that carry an exclusion, show a disabled checkbox with the reason. While rows are selected, a bulk bar ("N件選択中" / 選択解除 / "選択したN件を一括承認") appears at the end of the table toolbar, below the filters. A single bulk action MUST NOT cover more than 50 requests (the bulk-approve API accepts 1–50 ids per call): once 50 rows are selected, across all pages, the remaining unselected checkboxes are disabled with the reason "一括承認は最大50件までです", the header select-all only adds rows until the cap is reached, and the bar shows "（上限50件）" beside the count. While a filter, page or header-store change is loading and the table still shows the previous result, none of those rows can be acted on: row checkboxes, the header select-all and the row ⋯ menu are disabled and "選択したN件を一括承認" is disabled (a selection kept across a page change stays visible in the bar), until the new result arrives. The cap is a provisional value (the requirement doc does not define one) held in a single constant so it can be adjusted once the limit is confirmed.
- **FR-014**: System MUST support pagination of the list with a configurable page size, and MUST display the total record count and current page range.
- **FR-015**: System MUST show a clearly distinguishable empty state when no requests match the active filters, with a way to clear those filters.
- **FR-016**: The transfer detail screen MUST show, top to bottom: a back link "移籍管理に戻る"; the title "{会員名} さんの移籍申請" with the status badge only; the member head-up card (ID, 旧No, 主契約店舗 = origin store (the destination store once the request is 完了), 会員種別 / 主契約 badges, and a "会員詳細を開く" button); the JOYFIT exclusion alerts (FR-006 / FR-012); then a 60/40 two-column body — left: 移籍情報 card (申請ID, 移籍予定日, 移籍元店舗, 移籍先店舗, 移籍理由, ブランド, 申請者, 申請日時) and 承認フロー card (FR-007); right (sticky): status card with 申請日 / 最終更新 meta and, while pending, the 承認 ("移籍先として承認" at 移籍先承認待ち) and 否認 buttons.
- **FR-017**: After an approval or manual override completes — from the list row menu, the detail screen, the 手動解除 dialog or 一括承認 — the member's own cached screens MUST be refreshed so none keeps the pre-decision 主契約店舗: the member list, the member detail, and the 契約操作 tab's main contract and 契約サマリー (plus the 休会履歴 strip and 変更履歴 tab that share those reads). A 否認 changes no member data, so it needs only the transfer list/detail refresh. A failed decision (e.g. 409) also refetches, so the screen shows the true state.

### Key Entities

- **Transfer Request**: A member's request to change their primary-contract store; key attributes are request ID, member reference, brand, origin store, destination store, applied date/time, scheduled transfer date, status, and (JOYFIT only) auto-transfer eligibility and exclusion reasons.
- **Approval Step**: One stage of a transfer request's brand-specific approval timeline; attributes include step order, label, completion state, and which side (origin/destination store) it belongs to, if any.
- **Exclusion Reason**: A condition blocking JOYFIT automatic transfer — unpaid balance (with amount, billing period) or cancellation-fee/campaign-lock period (with remaining days) — and, if manually overridden, the override reason, acting user, and timestamp.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Staff can locate a specific transfer request among all in-scope records in under 30 seconds using the filters.
- **SC-002**: A single-request approve or reject action is reflected in both the list and detail views immediately, with no manual page refresh needed. After an approval, a member screen opened before the decision (member list, member detail, the 契約操作 tab's main contract and 契約サマリー) shows the new 主契約店舗 without a manual refresh either.
- **SC-003**: Staff can complete a single-request approval or rejection in 3 interactions or fewer (open detail/menu, choose action, confirm).
- **SC-004**: A Headquarters or Manager user can approve multiple eligible requests (either brand) in one bulk confirmation instead of one action per request.
- **SC-005**: 100% of approve/reject/bulk-approve/override attempts by Trainer or Observer roles are blocked, verified against the feature's permission matrix.

## Assumptions

- Transfer requests are created upstream (via the member detail status-change flow, A-01-01) and are out of scope here; this feature only reviews, approves, rejects, and executes existing requests.
- Store and brand reference data (store list, brand assignment) already exists and is reused from the existing store master.
- "Automatic execution" refers to the system updating the member's contracted store immediately after the required approval(s); the underlying scheduling/infrastructure mechanism is an implementation detail left to the planning phase.
- Approve/reject/override comments are optional free text (except the manual-override reason, which is required) and are not subject to additional workflow beyond being recorded with the action.
- Bulk approval applies to any pending request whose current step the user's store owns and that has no active exclusion; a FIT365 request is approved at its current step only (origin or destination), so a two-stage case still needs two approvals.
- The bulk-approve cap of 50 mirrors the API's per-request maximum and is provisional until the limit is confirmed in the specification; it applies to the whole selection, including select-all and selections spanning several pages.

## Prototype Alignment

Re-synced on 2026-10-02 against fitness-crm-ui @ 47423ec. Removed from the implementation because the prototype does not have them:

- List: the 「すべてクリア」 button inside the filter panel; the bulk-approve bar's position above the filters (moved below them).
- Detail: the 申請番号 badge next to the title; the 「移籍元店舗」 block at the right edge of the head-up card (the origin store now reads as 主契約店舗); the 「対応待ち」 badge and warning-colored circle on the current timeline step; the info/warning-colored flow badge (now brand-colored); 「却下」 wording (now 否認).

Kept deviations, driven by the API contract rather than the prototype:

- 申請中 is shown and filterable but offers no 承認 / 否認: the action lock (`expectedStatus`) accepts only the two 承認待ち statuses.
- An auto-transfer badge tooltip is shown only when the API carries the figure (`arrears.outstandingAmount` / `cancellationFeeUntil`). Remaining days = `cancellationFeeUntil` − today (JST), without +1 (the date is the first day outside the period).
- 申請者 shows 「name (role)」 from `createdBy.role`; a member's own filing reads 「会員本人」 and the system role gets no suffix.
- The 「管理者により手動解除済み」 alert is not rendered: API-091 has no release step — the block and its administrative release sit at application time (A-01-01), and a single approval does not re-check the cancellation-fee period. The manual release therefore approves the request directly (reason → approve `comment`), so the request moves straight on. A 縛り期間 exclusion still keeps the plain 承認 disabled; the release button is the only way through.
- 「売上詳細を確認」 opens the member detail's payment tab (no per-arrears sales detail route).
- The default page size is 25 (the app-wide `PAGE_SIZE`) rather than the prototype's 50; the options are 25 / 50 / 100 as in the prototype.
