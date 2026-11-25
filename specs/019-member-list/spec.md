# Feature Specification: Member Management (List)

**Feature Branch**: `019-member-list`  
**Created**: 2026-07-23  
**Status**: Draft  
**PO Spec**: `A-01` — 会員管理（一覧）  
**Source**: dx-fitness/fitness-crm-ui `src/pages/member-list.tsx`@1cc2d6d + dx-fitness/fitness-spec `crm/requirements/A-01.md`@2eef512  
**Input**: User description: "A-01 member-list"

## Overview

The member list is the entry point of the CRM's member-operations module. It lets store and headquarters staff search, filter, sort, and browse the existing member roster within their permitted scope, then drill into an individual member's detail screen. Headquarters/System users can additionally select members across pages and change their primary contract in bulk, and can jump to the member edit form.

This specification covers **only the list screen (A-01, L1)**. The member detail screen (A-01-01) and its tab sub-screens, the member edit form (member-form), and the independent black-list / emergency-suspension screens are separate features and are out of scope here except where the list screen links to them.

## User Scenarios _(mandatory)_

### User Story 1 - Search and browse the member roster (Priority: P1)

A store staff member opens the member list to find a specific member. They see the roster scoped to their store, type a keyword (member ID, name, kana, phone, email, or former member number) into the search box, and the list narrows to matching members. They click a row to open that member's detail screen.

**Why this priority**: Finding a member quickly is the core, everyday purpose of the screen. Without it, no downstream member operation can begin. This alone is a usable MVP.

**Verification**: Load the page, confirm the roster renders scoped to the accessible store(s), type a known member's name into the search box, confirm the list narrows to matching rows, click a row, and confirm navigation to that member's detail screen.

**Acceptance Scenarios**:

1. **Given** the member list is loaded, **When** the user types a member ID, name, kana, phone number, email, or former member number fragment into the search box, **Then** the list shows only members matching that fragment and the displayed count updates.
2. **Given** a search or filter is active, **When** no member matches, **Then** the list shows an empty-result message with an action to clear the conditions.
3. **Given** the roster is displayed, **When** the user clicks a member row (outside interactive cells), **Then** the app navigates to that member's detail screen.
4. **Given** the data is still loading, **When** the page first renders, **Then** the table shows loading skeleton rows in place of data.

---

### User Story 2 - Refine the roster with detailed filters and sorting (Priority: P2)

A user needs a subset of members — e.g., members who have not visited in over a month, or members on a specific contract plan. They open the detailed-filter panel, choose one or more filters (store, status, primary contract plan, contract type, brand, join period, last-visit window, promotion code), and the roster narrows accordingly. They sort by a column (member ID, name, status, join date, last-visit date) to order the result, and page through results, adjusting the page size as needed.

**Why this priority**: Filtering and sorting turn a raw roster into an actionable working set (retention outreach, plan analysis). It builds directly on the P1 roster and is high-value but not required for the minimal "find one member" flow.

**Verification**: Open the detailed filters, apply a status filter, confirm the roster and count narrow and a result banner summarizes the active conditions; click a sortable column header and confirm order toggles ascending/descending; change page size and page number and confirm the displayed slice updates.

**Acceptance Scenarios**:

1. **Given** the detailed-filter panel is open, **When** the user selects a value for any filter (status, plan, contract type, brand, join period, last-visit, promotion code, or store), **Then** the roster narrows to members matching all active filters combined (AND), the active-filter count badge updates, and a result banner summarizes the conditions.
2. **Given** one or more filters or a search term are active, **When** the user clicks "clear conditions", **Then** all filters and the search term reset to their defaults and the full scoped roster is shown.
   2b. **Given** a member who is on leave and also gate-stopped, **When** the user filters by status 休会中, **Then** that member is in the result and the ステータス cell carries both badges — 休会中 and ゲートストップ; **and When** the user instead picks the ゲートストップ option, **Then** the same member is returned together with gate-stopped members of any other status.
3. **Given** the roster is displayed, **When** the user clicks a sortable column header, **Then** rows sort ascending by that column; clicking the same header again toggles to descending.
4. **Given** the result exceeds one page, **When** the user changes the page size or navigates to another page, **Then** the displayed slice and the "showing X–Y of N" summary update accordingly.
5. **Given** the user arrives with a `lastVisit` value provided in the entry URL, **When** the page loads, **Then** the last-visit filter is pre-applied to the corresponding window.

---

### User Story 3 - Bulk-change primary contracts (headquarters) (Priority: P3)

A headquarters operator needs to raise the price of, or switch, the primary contract for many members at once (e.g., a price revision). They select members via row checkboxes — optionally selecting every member matching the current filter across all pages — review the selection, choose the target contract, preview the change and effective date, and execute. Members are moved to the new contract effective the first of the next month.

**Why this priority**: A powerful but role-restricted, occasional operation used by headquarters only. It depends on the roster and filtering being in place first, so it is the lowest priority of the three.

**Why headquarters only**: Primary contract price changes are a headquarters responsibility; store roles may only view contracts.

**Verification**: As a headquarters user, select rows, confirm the bulk action bar appears with the selected count, open the change dialog, choose a target contract, confirm the preview and effective date, execute, and confirm a success confirmation reporting the count and effective date.

**Acceptance Scenarios**:

1. **Given** the current user is a headquarters/system role, **When** they view the list, **Then** a selection checkbox column and (once rows are selected) a bulk-action bar are available; for all other roles neither is shown.
2. **Given** rows on the current page are selectable, **When** the user ticks the header checkbox and the result spans more than one page, **Then** the user is prompted to either keep only the current page's selection or select all members matching the current filter.
3. **Given** members are selected, **When** the user toggles "show selected only", **Then** the roster is narrowed to the selected members.
4. **Given** members are selected, **When** the user opens the bulk-change dialog, chooses a target primary contract, and confirms, **Then** a preview shows the target contract, its price, the next-month-start effective date, and a sample of affected members with a count; executing clears the selection and confirms that the change has been **booked**, naming the date it will apply.
   4b. **Given** some of the selected members already have a plan change booked, **When** the user executes, **Then** the whole request is rejected, the conflicting members are named, and the user is asked to deselect them and retry — no partial application takes place.
5. **Given** the bulk-change dialog is open, **When** no target contract is chosen, **Then** the execute action is disabled.
6. _(added 2026-11-19, ladyroom; revised the same day by decision)_ **Given** the selection holds a member whose 性別 does not meet the chosen primary contract's condition (its 利用できるエリア or 性別制限), **When** the user executes, **Then** the server refuses the whole request (422 `E-BPC-206`), the message names the member(s) and nothing is booked; the target list itself is not narrowed by 性別.

### Edge Cases

- **No results**: When a search/filter combination matches no members, an empty state is shown with a "clear conditions" action; when the roster itself is empty (no filters), a plain empty state is shown.
- **Manager scope**: A Manager's scope is the set of stores they manage, not the store their account is filed under (the two can differ). The header store switcher offers only those stores — never 全店舗 — and the roster is always limited to the store currently chosen there. The managed stores are read from the staff record, so the list waits for them before its first request.
- **Single-store vs. multi-store scope**: When the user can access only one store, the store filter is hidden; when a specific store is selected in the header scope, the store filter is locked to that store and is not counted as a refinement condition in the result banner.
- **Selection across pages**: Selection persists across pages and page-size changes; the bulk bar reports both the total selected count and how many are on the current page.
- **Requested page out of range**: If the current page exceeds the number of pages after filtering, the view falls back to the last valid page.
- **Missing sort values**: Row ordering is the server's, including where rows missing the sorted attribute land. The screen sends `sort` / `order` and renders the page as returned. ~~Rows missing the sorted attribute sort to the end regardless of direction~~ — **Amended 2026-09-16**: that was the mockup's behaviour, reachable only because it sorted the whole roster in memory; with server-side pagination the client holds one page and cannot place a null relative to the entire result set.
- **Access to a member outside scope**: Attempting to reach a member outside the permitted scope is rejected (enforced by the detail screen / server); the list never surfaces out-of-scope members.

## Requirements _(mandatory)_

### Functional Requirements

**Search, roster & navigation**

- **FR-001**: The screen MUST display a paginated roster of members within the current user's permitted scope, with columns: member ID, name, store name, status, primary contract, join date, and last-visit date.
- **FR-002**: Users MUST be able to search the roster by a single free-text query matched against member ID, name, kana, phone number, email, and former member number. The query MUST be passed through as typed: **how it matches is the server's to define** (partial vs prefix, case folding, 全角/半角 width), so the screen neither normalises the input nor filters the response.
- **FR-003**: The screen MUST scope the roster to the user's accessible stores (for a Manager, the stores they manage, resolved from the staff record rather than their home store, and never sent to the server before that is known); when a specific store is chosen in the header store scope, the roster MUST be limited to that store and the store filter locked accordingly.
- **FR-004**: Clicking a member row MUST navigate to that member's detail screen; clicks on interactive cells (checkbox, row action menu) MUST NOT trigger row navigation.
- **FR-005**: The screen MUST show a loading state (skeleton rows) while data is being retrieved, and an empty state (distinguishing "no data" from "no match for current conditions") when the roster is empty.

**Filtering & sorting**

- **FR-006**: Users MUST be able to refine the roster via a collapsible detailed-filter panel with filters for status, primary contract plan, contract type, brand, join period, last-visit window, and promotion code; and, when more than one store is accessible, store.
  - **Status** offers 4 grouped options (有効 / 休会中 / 退会予定 / 退会済み) plus ゲートストップ. The backing data has 8 statuses, so each grouped option MUST select every status it covers: 有効 → `active` only (仮会員 / `provisional` is NOT part of 有効 and has no option of its own); 休会中 → `suspended` + `pending_suspended`; 退会予定 → `pending_withdrawal` + `withdrawal_pending_processing`; 退会済み → `withdrawn` + `forced_withdrawal`.
  - **ゲートストップ** is NOT a status: selecting it MUST filter on the gate-stop flag alone and send no status, so it returns gate-stopped members regardless of their status (e.g. a member who is both 休会中 and gate-stopped).
  - **Contract type** (契約種別 — A-01 FR-001 「…ステータス・契約種別等での検索」) filters on the contract type of the member's current main contract (`plans.contract_type`), a coarser axis than **primary contract plan**: one value covers every plan of that type. It MUST offer 全契約種別 plus the nine G-01 契約タイプ values with the labels used on 主契約一覧 (通常会員 / 1Day Pass / 家族会員 / キッズ会員 / 学生会員 / 法人会員 / 福利厚生 / プリペイド会員 / 特殊契約), and MUST be a separate control from the plan filter — the two are different axes and combine with AND. A member whose main contract cannot be resolved has no contract type and drops out while it is set (see Assumptions). **Added 2026-11-09**: the prototype replaced its original 契約種別 dropdown with 主契約プラン in its 5/24 update without a matching spec change; the original spec still lists 契約種別 and the API offers `contractType` (qa-120), so the screen offers both.
  - **Brand** is the brand **group** axis (JOYFIT / FIT365) and is a fixed 2-value list needing no master lookup. Store sub-brands (JOYFIT24, JOYFIT+, JOYFIT YOGA) are a different axis and MUST NOT appear here.
  - **Join period** and **last-visit window** are presets on screen but absolute date bounds on the wire: the screen MUST expand them to concrete dates itself. The two "no visit for …" buckets MUST additionally request that never-visited members be kept, otherwise the members at highest churn risk are silently dropped.
  - **Promotion code** MUST filter on the promotion code the member consumed at enrollment — the issued code string itself (G-06 FR-011: 「入会時に使用されたコード」), NOT the campaign code. One campaign issues many promotion codes, so the two are distinct values and the campaign master is the wrong source. Options MUST therefore come from the promotion-code master (G-06), and the value sent, the value shown on the control, and the value in the result banner MUST all be that same code string; the campaign name MAY be shown beneath each option to tell same-campaign codes apart.
- **FR-007**: All active filters and the search query MUST combine with AND semantics; the number of active filters MUST be shown as a badge, and a result banner MUST summarize the active conditions and report the matched count against the scoped total.
- **FR-008**: Users MUST be able to clear all filters and the search query in one action.
- **FR-009**: Users MUST be able to sort the roster by member ID, name, status, join date, and last-visit date via column headers, toggling ascending/descending on repeated activation of the same column.
- **FR-010**: The last-visit filter MUST support at least: recent 1 week, recent 2 weeks, no visit for 3+ weeks, and no visit for 1+ month; and MUST accept an initial value passed via the entry URL.
- **FR-011**: The screen MUST paginate results with a selectable page size and page navigation, and MUST display a "showing X–Y of N / P pages" summary; changing filters, search, sort, or page size resets to the first page.

**Bulk primary-contract change (headquarters)**

- **FR-012**: The selection column, bulk-action bar, and bulk primary-contract change MUST be available only to headquarters/system roles and hidden for all other roles.
- **FR-013**: Eligible users MUST be able to select members via row checkboxes and a header checkbox, with selection persisting across pages and page-size changes.
- **FR-014**: When the header checkbox is used and the filtered result spans more than one page, the system MUST prompt the user to choose between selecting only the current page or all members matching the current filter.
- **FR-015**: Eligible users MUST be able to toggle a "show selected only" view that narrows the roster to currently selected members, and to clear the entire selection.
- **FR-016**: The bulk-change dialog MUST require choosing a target primary contract (execute disabled until chosen), and MUST preview the target contract name and price, the effective date (first of next month), and a sample of affected members with the total count.
  - A bulk change is **booked, not applied**: nothing about the member changes until the apply date, so the confirmation MUST say the change was reserved and when it takes effect — never that it has been made (backend design answer 2026-08-10). There is no progress to poll: the job stays pending for up to a month.
  - The apply date is chosen by the **client** and MUST be the 1st of a month, from next month up to twelve months ahead.
  - The dialog MUST NOT collect a fee-difference option or a reason: both are optional on the API and the current billing design never produces a pro-rata difference, since changes always land on the 1st.
  - When the server refuses to book part of the selection, the failure message MUST name the members concerned instead of showing a generic error. Which members the server refuses, and how it treats a member that already has a booked change, is the backend's to decide — no requirement source constrains it.
- **FR-016a** _(added 2026-11-19, ladyroom; revised by decision)_: A primary contract whose sale condition a selected member does not meet (E-02 FR-016 / G-01 FR-M002 — 利用できるエリア with 女性のみ / 男性のみ, or the contract's 性別制限; contradicting conditions meet no one) MUST NOT be booked for that member. **Decision 2026-11-19 (user):** the member list keeps its current behaviour — the bulk-change dialog does not narrow the target plans by 性別 and BE will not add `gender` to `MemberListItemDto`; the server refuses a mismatched member on 実行 (422 `E-BPC-206`, naming the members, nothing booked). The target list offers every contract as before; the refusal message MUST name the members (as FR-016) so the user can deselect them and retry.
  - **Sources**: `E-02.md` `261109_v6` FR-008 / FR-016, `G-01.md` FR-M002 (`fitness-spec@9e0e07e`); prototype `dx-fitness/fitness-crm-ui@9428dc2` `member-list.tsx` (`bulkContractOptions`; each row carries 性別, not displayed). A-01 FR-020 itself is silent.
  - ~~**API gaps**: `MemberListItemDto` carries no `gender` (AREA-LIST-GENDER)~~ — closed by the decision (no client gating). The bulk call refuses synchronously with `E-BPC-206` on the local BE (2026-11-19 run); AREA-BULK stays as a watch item for a backend that only checks in the worker.
- **FR-017**: Executing the bulk change MUST apply the new primary contract to all selected members effective the first of the next month, then clear the selection and confirm the number of members changed and the effective date.

**Row actions & access to related screens**

- **FR-018**: Each row MUST offer an action menu; the "edit" action (navigating to the member edit form) MUST be invocable only by headquarters/system roles. For every other role the item stays **visible but disabled**, carrying the 本部 marker, as the prototype's shared role-gated menu item does — unlike the bulk affordances in FR-012, which are hidden outright. ~~hidden for all other roles~~ — **Amended 2026-09-16**: "hidden" was this document's own wording and matched no source; `A-01` does not prescribe how a denial is presented and the parity checklist (PAR063) says only "role-gated".
  - The item MUST also be disabled, with the reason 「退会済みのため編集できません」, for a withdrawn member (`withdrawn` / `forced_withdrawal`) — the edit screen refuses those members on arrival.

**Permissions (view scope)**

- **FR-019**: The roster and its scope MUST follow the A-01 permission matrix: System/Headquarter see all stores; Manager sees managed stores; Staff sees their store's primary-contract members plus members with a day-pass purchase at that store; Observer sees their store view-only; Trainer has no access.

### Key Entities _(include if feature involves data)_

- **Member (roster row)**: A person with a primary contract in the CRM, identified by a newly-issued user ID (with a retained former member number). Attributes shown in the list: user ID, name, kana, phone, email, former member number, store name, status, primary contract name, member category, join date, last-visit date, and (for filtering) the promotion code used at enrollment.
- **Member status**: The member's usage state — one of provisional (仮会員), active (有効), scheduled leave (休会予定), on leave (休会中), scheduled withdrawal (退会予定), awaiting withdrawal processing (退会処理待ち), withdrawn (退会済み), or forced withdrawal (強制退会済み) — rendered as a colored badge.
- **Gate stop**: A per-member entry restriction, **orthogonal to member status** — a member can be on leave and gate-stopped at the same time. It is carried as its own flag on the roster row, never as a status value. On the roster the ステータス cell shows both, status badge first: the status is the axis the column sorts on, the gate stop is the restriction the operator has to act on, and neither may hide the other.
- **Primary contract (master)**: A selectable contract plan with a name and monthly price, used both as a filter facet and as the target of a bulk change.
- **Store scope**: The set of stores the current user may view, derived from role and store assignment, driving both the store filter and the roster scope.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can locate a specific member by any supported identifier (ID, name, kana, phone, email, former number) in under 15 seconds from page load.
- **SC-002**: 95% of roster searches and filter changes reflect the narrowed result to the user within 1 second.
- **SC-003**: A user can produce a targeted working set (e.g., "members with no visit for 1+ month at my store") using filters and sorting in under 30 seconds without leaving the list screen.
- **SC-004**: A headquarters operator can select a filtered population across pages and complete a bulk primary-contract change, with a previewed count and effective date, in under 2 minutes.
- **SC-005**: Users never see members outside their permitted scope, and role-restricted affordances (selection, bulk change, edit) are visible only to eligible roles in 100% of cases.

## Assumptions

- This specification covers the list screen (A-01, L1) only. The member detail screen, member edit form, black-list screens, and emergency-suspension screen are separate features; the list only links to the detail and edit screens.
- Search matches a case-insensitive substring across the supported fields; there is no separate advanced per-field search on the list screen beyond the detailed filters described.
- The bulk primary-contract change always takes effect on the first of the next month (no user-chosen effective date on the list screen), consistent with A-01 FR-020.
- Brand filtering runs on the member's own brand group (JOYFIT / FIT365), which is an attribute of the member row. The store's sub-brand is a separate, finer axis that this screen does not filter on.
- A member whose main contract cannot be resolved (a provisional member with no primary store, or someone visible only through a day-pass bought at another store) has no plan and no join date, and therefore drops out of the result as soon as any contract- or enrolment-based filter is applied. This is intended, and there is no "include them anyway" option for the join-period filter (unlike the last-visit filter, which does keep never-visited members).
- Last-visit and join-period filter windows are evaluated against the current date; the prototype uses a fixed mock reference date, but production uses the real current date.
- Requires the existing user/role context (accessible stores, current store scope, role checks) and the primary-contract master to be available to the screen.
