# Feature Specification: Y-03 FC Company Master Management (FC企業管理（マスタ）)

**Feature Branch**: `023-fc-company-management`
**Created**: 2026-08-03
**Status**: Draft
**PO Spec**: `Y-03` — FC企業管理（マスタ） (FC Company / Operating Company Master Management), doc version `260901_v4` (synced 2026-09-24; created against `260730_v3`)
**Source**: `src/pages/fc-company-list.tsx`, `src/pages/fc-company-detail.tsx`, `src/pages/fc-company-form.tsx` (UI prototype: dx-fitness/fitness-crm-ui @ `426a9b3`, 2026-07-23; re-synced to `0a73739`, 2026-09-17) + `crm/requirements/Y-03.md` (dx-fitness/fitness-spec @ `b53dd30`, 2026-08-03; re-synced to `a5abfdb`, v4)
**Input**: User description: "Create spec for franchise-companies management / spec: Y-03.md / design/V0: fc-company-detail.tsx, fc-company-form.tsx, fc-company-list.tsx"

## Clarifications

### Session 2026-10-01

- Q: Is 直営店フラグ (FR-012 「既存システムとの互換性のため保持」) an independent, editable value? → A: No. Y-03 defers it to the Phase 1 DB design, which maps the legacy flag 1:1 to 直営/FC区分 (on → 直営, off → FC) and keeps it as a derived response field for compatibility (Y-13 FR-M003). The form shows it read-only, checked exactly when 区分 is 直営; the prototype's editable checkbox is not adopted. (BE/spec owner, 2026-10-01)

### Session 2026-09-24

Sync to Y-03 **v4** (`260901_v4`) and the 9/17 prototype, made during the real-API integration
(`integration-plan.md`).

- Q: How is the contact person's contact detail modelled? → A: Y-03 v4 splits 担当者連絡先 into two optional attributes, **担当者メールアドレス** and **担当者電話番号** (both optional, so migrated rows holding only one never get a dummy value). FR-012, Key Entities, User Story 2 updated.
- Q: Is the renewal date constrained? → A: Yes. Y-03 v4 defines FC契約更新日 as the **next scheduled renewal date** and restricts it to dates **on or after** FC契約開始日, with no exception for migrated data (migration corrects the value). FR-043 added; the former Assumption and Edge Case that accepted an earlier renewal date are replaced.
- Q: What does the free-text search match? → A: Y-03 FR-001 検索条件 is 法人名・直営/FC区分・ステータス — the text search matches the **corporate name** (formal or display); it does not match the FC company ID. FR-002 and the Edge Case updated.
- Q: Where is the status changed? → A: Only on the detail screen, from the status summary card (prototype 8/13+). The form has no status control; a new company is created active. FR-013 and User Story 3 updated.
- Q: How are Staff-role users scoped? → A: Access to the screen is governed by 職位 (position) permissions; what data a user may read is enforced by the backend (FC-manager staff: own company only). A denied read renders a permission state (FR-037, FR-039).
- Q: How many classification values? → A: Three — 直営 / FC / 業務委託 (Y-03 A-2, user direction). Labels follow the prototype (list/badge 直営・FC, form 直営・フランチャイズ（FC）); the prototype has no third value, so it uses the spec wording 業務委託. FR-010 updated.
- Q: Prototype-only behaviours adopted in the UI (not defined by Y-03): an optional **無効化理由** in the deactivation dialog; **店舗を紐づけ unavailable while the company is inactive**; a **付け替え (reassign) confirmation** when linking a store currently operated by another company, with each candidate showing its current operator. Recorded here so they are traceable; they are not new PO requirements.
- Open (BE dependency, not an FE decision): 認証方式 (FR-011) is not yet stored by the backend — the attribute stays required in the UI per spec; BE ask tracked as R201 in `integration-plan.md`.

## Scope

This feature covers **FC Company (operating company) master management** end-to-end across three screens:

1. **List screen** — browse, search, filter, sort and paginate FC companies; entry point for registration, edit and deletion.
2. **Detail screen** — read-only view of a single company's corporate/contact/contract information, plus its managed stores, its change history, and (Phase 2 only) an aggregation placeholder area. Entry point for enable/disable, delete, edit, and store-link management.
3. **Create/Edit form screen** — a single screen used in both "new registration" and "edit" mode that collects, validates and submits the company's attributes.

An FC company record represents the legal entity that operates one or more stores. It replaces the legacy system's two-field model (store operating company name + direct-ownership flag) with a richer corporate profile, and it is the target of the store master's operating-company reference.

**In scope (Phase 1 / Must)**: FR-001 through FR-006 of Y-03 — listing & search, registration, detail & edit, deactivation & logical deletion, store linkage management from the company side, and change-history recording.

**In scope (Phase 2, structure only)**: The aggregation area exists as a labelled placeholder that is only reachable in the Phase 2 view. No real KPI or sales figures are computed.

**Out of scope**: royalty calculation logic; real KPI/sales aggregation; editing store master attributes (only the company↔store link is managed here); multi-brand-per-company modelling; the staff/title master itself (consumed, not maintained here).

## User Scenarios _(mandatory)_

### User Story 1 - Browse, search and filter FC companies (Priority: P1)

A Headquarters administrator opens FC Company Management to find a specific operating company among all direct-run and franchise entities, using free-text search on the corporate name/ID and filters on direct/FC classification and status, then clicks through to the company they need.

**Why this priority**: Every other journey (view, edit, delete, link stores) starts from this list. Without it there is no way to reach a company record, so it is the minimum viable slice.

**Verification**: Open the FC Company list as a Headquarters user; confirm the table shows all seeded companies with ID, display name, classification, managed-store count and status; type part of a corporate name and confirm the result set narrows and a filter-result banner reports how many of the total matched; change the classification and status filters and confirm the same; clear the conditions and confirm the full list returns.

**Acceptance Scenarios**:

1. **Given** the FC company list is loaded, **When** a Headquarters user views it, **Then** each row shows FC company ID, corporate display name, direct/FC classification badge, managed-store count (right-aligned) and status badge, and the header shows the total record count.
2. **Given** the list is loaded, **When** the user types a partial corporate name or a partial FC company ID into the search box, **Then** only matching companies remain, the result banner states the matched count against the total, and pagination resets to the first page.
3. **Given** the list is loaded, **When** the user selects a classification of `直営` or `FC`, **Then** only companies of that classification remain and the filter control is visually marked as active.
4. **Given** the list is loaded, **When** the user selects a status of `有効` or `無効`, **Then** only companies of that status remain and the filter control is visually marked as active.
5. **Given** search text and/or filters are applied, **When** the user clears the conditions from the result banner or the empty-state action, **Then** all filters and the search box reset to their defaults and the unfiltered list returns.
6. **Given** the applied conditions match no company, **When** the table renders, **Then** a "filtered" empty state is shown together with a clear-conditions action, instead of an empty table body.
7. **Given** no FC company exists at all, **When** the table renders, **Then** an "empty" empty state is shown without a clear-conditions action.
8. **Given** more companies exist than the selected page size, **When** the user changes page or page size, **Then** the visible slice, the "total / pages / showing x–y" summary and the active page indicator all update consistently, and changing page size returns the user to page 1.
9. **Given** the list is loaded, **When** the user activates the FC company ID or corporate display name column header, **Then** the list is re-sorted by that column and the header communicates the next sort direction.
10. **Given** the list is loaded, **When** the user selects anywhere on a company row other than the row-action control, **Then** the FC company detail screen for that company opens.

---

### User Story 2 - View an FC company's full profile, stores and history (Priority: P1)

A Headquarters administrator opens a company's detail screen to read its corporate profile, contact person, contract dates and remarks, to see which stores it currently operates, and to audit what has changed on the record and by whom.

**Why this priority**: Reading the authoritative corporate profile and the company↔store relationship is the core reason the master exists, and it is the only place the change history is exposed. It is independently valuable even before editing is available.

**Verification**: From the list, open a company; confirm the basic-information area shows every corporate/contact/contract/remarks attribute plus a status summary with the managed-store count and created/updated timestamps; switch to the managed-stores area and confirm the linked stores are listed; switch to the change-history area and confirm entries with timestamp, operator and change description.

**Acceptance Scenarios**:

1. **Given** an FC company exists, **When** its detail screen opens, **Then** the page header shows the corporate display name, a status badge, and a direct/FC classification badge, with a link back to the FC company list.
2. **Given** the detail screen is open on the basic-information area, **When** the user reads it, **Then** the corporate information (FC company ID, corporate number, formal name, display name, representative, phone, head-office address), the contact information (contact person, contact email address, contact phone number), the contract information (contract start date, contract renewal date, royalty rate), the authentication method and the remarks are all displayed.
3. **Given** an optional attribute has no value, **When** the detail screen renders it, **Then** a neutral placeholder is shown rather than a blank area.
4. **Given** the detail screen is open, **When** the user reads the status summary panel, **Then** it shows the current status, the managed-store count, the creation timestamp and the last-update timestamp.
5. **Given** the company operates stores, **When** the user opens the managed-stores area, **Then** each linked store is listed with store ID, store name, brand, prefecture and store status, together with a total count.
6. **Given** the company operates no stores, **When** the user opens the managed-stores area, **Then** an empty state explains that stores can be linked from this screen.
7. **Given** a store is listed in the managed-stores area, **When** the user selects the store row, **Then** that store's detail screen opens.
8. **Given** the company has change history, **When** the user opens the change-history area, **Then** entries are listed newest-first with change timestamp, operator and a human-readable description of what changed, together with a total count.
9. **Given** the application is in the Phase 1 view, **When** the detail screen renders, **Then** no aggregation area is offered.
10. **Given** the application is in the Phase 2 view, **When** the user opens the aggregation area, **Then** a KPI/store-summary section and a sales-aggregation section are shown, each explicitly labelled as planned for a later phase, with no fabricated figures.

---

### User Story 3 - Register a new FC company (Priority: P2)

A Headquarters administrator registers a newly contracted franchise operator by filling in its corporate profile, contact person, contract dates, authentication method and initial status, so that stores can subsequently be linked to it and its staff can sign in through the correct authentication route.

**Why this priority**: Registration is required for the master to grow beyond migrated legacy data, but the migrated data alone already makes stories 1 and 2 useful, so it ranks below them.

**Verification**: As a Headquarters user, open the registration form from the list, submit with required attributes empty and confirm submission is blocked with field-level errors, then fill the required attributes, submit, and confirm a success confirmation appears and the new company is visible in the list.

**Acceptance Scenarios**:

1. **Given** the registration form is open, **When** the user fills the formal corporate name, the direct/FC classification and the authentication method and submits, **Then** the company is created with a system-assigned FC company ID, a success confirmation is shown, and the user is returned to the FC company list.
2. **Given** the registration form is open, **When** the user submits with the formal corporate name empty, **Then** submission is blocked, an inline error identifies that field, a form-level "missing required input" message is shown, and the view brings the first invalid field into view.
3. **Given** the registration form is open, **When** the user submits without selecting the direct/FC classification, **Then** submission is blocked and an inline error identifies that field.
4. **Given** the registration form is open, **When** the user submits without selecting the authentication method, **Then** submission is blocked and an inline error identifies that field.
5. **Given** an inline error is displayed for a field, **When** the user supplies a valid value for that field, **Then** that field's error clears without requiring a re-submit.
6. **Given** the registration form is open, **When** the user leaves every optional attribute empty and submits an otherwise valid form, **Then** the company is created with those attributes stored as empty.
7. **Given** the registration form is open, **When** the user reads it, **Then** it offers no status control, and the company is created with status `有効` (status changes are made from the detail screen's status card).
8. **Given** the user has modified any field, **When** the user cancels or navigates back, **Then** a discard-confirmation is shown offering to keep editing or discard, and discarding leaves the record uncreated.
9. **Given** the user has modified no field, **When** the user cancels or navigates back, **Then** the user returns to the list without a discard-confirmation.

---

### User Story 4 - Edit an existing FC company (Priority: P2)

A Headquarters administrator updates a company's record — for example a changed contact person or a renewed contract date — and the change is recorded in the company's change history.

**Why this priority**: Corporate details drift over time and the history trail depends on edits being captured, but the record can be read and its stores managed before editing exists.

**Verification**: Open a company's edit form from the list row action or the detail screen, confirm all existing values are pre-filled, change one attribute, save, confirm a success confirmation, and confirm the new value appears on the detail screen and a corresponding change-history entry exists.

**Acceptance Scenarios**:

1. **Given** an FC company exists, **When** its edit form opens, **Then** every editable attribute is pre-filled with the stored value and the screen is titled as an edit rather than a registration.
2. **Given** the edit form is open, **When** the user changes one or more attributes and saves, **Then** the record is updated, a success confirmation is shown, and the user is returned to the list.
3. **Given** the edit form is open, **When** the user clears the formal corporate name, the classification or the authentication method and saves, **Then** submission is blocked with the same field-level errors as registration.
4. **Given** a company attribute changed, **When** the change-history area is viewed afterwards, **Then** an entry records the change timestamp, the operator and the before/after difference of the changed attributes.
5. **Given** the edit form has unsaved modifications, **When** the user cancels or navigates back, **Then** the discard-confirmation is shown before the modifications are lost.

---

### User Story 5 - Link and unlink stores from the company side (Priority: P2)

A Headquarters administrator assigns a store to the FC company that operates it, or releases a store that has changed operator, directly from the company's managed-stores area, and every such change is written to the change history.

**Why this priority**: The company↔store relationship is the reason the master is a reference target, and it directly gates deletion; it is however usable only once companies can be viewed (story 2).

**Verification**: On a company's managed-stores area, open the link dialog, link an unlinked store and confirm it appears in the managed-stores table with the count and the status summary both incremented; unlink a store, confirm the confirmation dialog, and confirm the store leaves the table; confirm both actions produced change-history entries.

**Acceptance Scenarios**:

1. **Given** the managed-stores area is open as a Headquarters user, **When** the user opens the link-store dialog, **Then** only stores not already linked to this company are offered, each identified by store name, store ID, prefecture and brand.
2. **Given** the link-store dialog is open, **When** every store is already linked, **Then** the dialog states that there is no linkable store instead of showing an empty list.
3. **Given** the link-store dialog is open, **When** the user links a store, **Then** the store appears in the managed-stores table, the store count and the status summary update, a success confirmation names the store, and a change-history entry records the link.
4. **Given** a store is linked, **When** the user chooses to release it, **Then** a confirmation dialog explains that the store leaves this company's scope but is not itself deleted, and that the change is recorded.
5. **Given** the unlink confirmation is shown, **When** the user confirms, **Then** the store is removed from the managed-stores table, the counts update, a success confirmation names the store, a change-history entry records the release, and the store becomes available again as a link candidate.
6. **Given** the unlink confirmation is shown, **When** the user cancels, **Then** the link is left untouched.
7. **Given** the user is not a Headquarter or System user, **When** the managed-stores area is viewed, **Then** the link and release controls are unavailable and explain that Headquarters permission is required.

---

### User Story 6 - Deactivate or delete an FC company (Priority: P3)

A Headquarters administrator takes a company out of active use — either by deactivating it so it stops appearing as a link candidate for stores, or by logically deleting it once it no longer operates any store — while the change history is preserved in both cases.

**Why this priority**: End-of-life handling is needed for correctness of the master over time, but the master is fully usable for its primary purpose without it.

**Verification**: On an active company's detail screen, deactivate it and confirm the status badge, the status summary and the list row all read `無効`, then reactivate it; on a company with zero managed stores, delete it and confirm the confirmation dialog mentions that change history is preserved; on a company with managed stores, confirm the delete control is unavailable and states the reason.

**Acceptance Scenarios**:

1. **Given** an active company's detail screen is open as a Headquarters user, **When** the user deactivates it and confirms, **Then** a confirmation dialog states that the change history is kept and the company can be reactivated, the status becomes `無効`, and a success confirmation is shown.
2. **Given** a deactivated company's detail screen is open, **When** the user reactivates it, **Then** the status becomes `有効` and a success confirmation is shown.
3. **Given** a company has at least one linked store, **When** the user attempts deletion from the detail screen or the list row action, **Then** the delete control is unavailable and states that deletion is impossible because managed stores exist.
4. **Given** a company has no linked store, **When** the user deletes it and confirms, **Then** a confirmation dialog states that the deletion is logical and the change history is preserved, and the company is removed from the default list view.
5. **Given** a delete confirmation dialog is shown, **When** the user cancels, **Then** the company is left unchanged.

---

### User Story 7 - An FC company administrator reviews their own company (Priority: P3)

A store-side staff member holding the FC-company-administrator title opens FC Company Management and sees only their own operating company, read-only, so they can confirm the corporate details and contract dates held about them without being able to change anything or see other operators.

**Why this priority**: It is a genuine requirement of the permission matrix and matters for franchise trust, but Headquarters operation of the master (stories 1–6) delivers the business value first.

**Verification**: Signed in as a staff member with the FC-company-administrator title, open FC Company Management; confirm only their own company is listed; open its detail; confirm all write affordances (register, edit, delete, deactivate, link/unlink store) are unavailable.

**Acceptance Scenarios**:

1. **Given** a staff member holds the FC-company-administrator title, **When** they open FC Company Management, **Then** only the FC company they belong to is listed and its detail screen is reachable.
2. **Given** such a staff member is on the list or detail screen, **When** the screen renders, **Then** registration, edit, delete, deactivate/reactivate and store link/unlink controls are unavailable and explain that Headquarters permission is required.
3. **Given** a staff member does **not** hold the FC-company-administrator title, or holds a Manager, Trainer or Observer role, **When** they attempt to reach FC Company Management, **Then** access is refused.

### Edge Cases

- A company whose managed-store count is zero: deletion is permitted, and the row action shows a normal delete option rather than the blocked variant.
- A company whose last linked store is released during the session: the delete control must become available without reloading the screen.
- A company is deactivated while it still operates stores: the company must stop being offered as a link candidate from the store side, but its already-linked stores must still be listed here.
- The direct/FC classification and the legacy direct-ownership flag disagree (for example classification `FC` with the legacy flag set): the displayed badge follows the classification, and the flag remains editable on the form only.
- Royalty rate is unset: the detail screen shows a neutral placeholder rather than `0%`.
- Two companies share the same formal corporate name: both are accepted; the FC company ID remains the identifier used to disambiguate.
- Search text matches an FC company ID rather than a name: no match — the text search covers the corporate name only (Y-03 FR-001 検索条件).
- A filter combination yields no rows while the unfiltered list is non-empty: the "filtered" empty state (with a clear action) is shown, not the "no records at all" empty state.
- The page-size selection leaves the current page beyond the last page: the view clamps to the last available page rather than showing a blank table.
- Contract renewal date precedes contract start date: submission is blocked with 「FC契約更新日はFC契約開始日以降の日付を指定してください」 (FR-043).
- A remarks value containing line breaks: preserved as entered when displayed on the detail screen.

## Requirements _(mandatory)_

### Functional Requirements

**Listing and search (Y-03 FR-001)**

- **FR-001**: System MUST present FC companies in a paginated list showing, for each company, the FC company ID, the corporate display name, the direct/FC classification, the number of stores it operates, and its status.
- **FR-002**: Users MUST be able to narrow the list by free-text search matching the corporate name, by direct/FC classification, and by status, with the conditions combining conjunctively.
- **FR-003**: System MUST report, whenever any search or filter is active, how many companies matched out of the total, and MUST offer a single action that clears all conditions at once.
- **FR-004**: Users MUST be able to sort the list by FC company ID and by corporate display name.
- **FR-005**: System MUST let users choose the number of rows per page from a fixed set of options, MUST state the total record count, the total page count and the range currently displayed, and MUST return to the first page whenever the result set or the page size changes.
- **FR-006**: System MUST distinguish, in the empty table state, between "no company matches the current conditions" (offering a clear-conditions action) and "no company exists at all".
- **FR-007**: Users MUST be able to open a company's detail screen by selecting its row, and MUST be able to reach its edit form and its deletion directly from a per-row action menu.

**Registration and editing (Y-03 FR-002, FR-003)**

- **FR-008**: System MUST let authorised users register a new FC company and MUST assign its FC company ID automatically, without user input.
- **FR-009**: System MUST require the formal corporate name, the direct/FC classification, and the authentication method on both registration and edit, and MUST block submission while any of them is missing.
- **FR-010**: System MUST offer exactly three direct/FC classification values — direct-run (直営), franchise (FC; form label フランチャイズ（FC）) and entrustment (業務委託) — in the form and in the list filter (Y-03 A-2; Clarifications 2026-09-24).
- **FR-011**: System MUST offer exactly two authentication-method values — Google SSO and IDaaS — and MUST record the selection as the value that determines the sign-in route of staff belonging to this company.
- **FR-012**: System MUST additionally accept, as optional attributes, the corporate display name, the legacy direct-ownership flag, the corporate number, the representative name, the head-office address, the phone number, the contact person name, the contact person email address, the contact person phone number (the two contact details are separate, both optional — Y-03 v4), the FC contract start date, the FC contract renewal date, the royalty rate, and free-text remarks.
- **FR-013**: System MUST create a new company as active, and MUST let authorised users change the company's status between active and inactive **only from the detail screen's status summary**, not from the form (Clarifications 2026-09-24).
- **FR-014**: System MUST report validation failures both at the field level, next to each offending input, and at the form level as a single summary message, and MUST bring the first offending field into view on a blocked submission.
- **FR-015**: System MUST clear a field's validation error as soon as that field is given a valid value, without requiring another submission attempt.
- **FR-016**: System MUST warn the user before discarding unsaved form changes when they cancel or navigate away, and MUST NOT warn when nothing has been modified.
- **FR-017**: System MUST confirm a successful registration or save with an explicit success message and MUST return the user to the FC company list.
- **FR-018**: System MUST pre-fill every editable attribute with its stored value when the form is opened in edit mode, and MUST title the screen so that edit mode is distinguishable from registration.

**Detail view (Y-03 FR-003)**

- **FR-019**: System MUST present a company's stored attributes on a detail screen grouped as corporate information, contact information, contract information, and remarks, and MUST show a neutral placeholder in place of any attribute that has no value.
- **FR-020**: System MUST show, alongside the attributes, a summary of the company's current status, its managed-store count, its creation timestamp and its last-update timestamp.
- **FR-021**: System MUST display the company's status and its direct/FC classification as badges in the detail screen header, and MUST resolve any disagreement between the classification and the legacy direct-ownership flag in favour of the classification for display purposes.
- **FR-022**: System MUST organise the detail screen into separately selectable areas for basic information, managed stores, and change history, and MUST provide a way back to the FC company list.

**Store linkage (Y-03 FR-005)**

- **FR-023**: System MUST list, for a given company, every store it operates with the store ID, store name, brand, prefecture, store status and a total count, and MUST let the user open each store's own detail screen from that list.
- **FR-024**: System MUST show an explanatory empty state, rather than an empty table, when the company operates no store.
- **FR-025**: Authorised users MUST be able to link an additional store to the company; the system MUST offer only stores not already linked to it, identified by store name, store ID, prefecture and brand, and MUST state when no linkable store remains.
- **FR-026**: Authorised users MUST be able to release a linked store from the company, and the system MUST require confirmation that makes clear the store itself is not deleted.
- **FR-027**: System MUST reflect a link or release immediately in the managed-store list, the managed-store count and the status summary, and MUST confirm each action with a message naming the affected store.
- **FR-028**: System MUST state, on the managed-stores area, that link changes are recorded in the change history and that only Headquarters can set them.

**Deactivation and deletion (Y-03 FR-004)**

- **FR-029**: Authorised users MUST be able to deactivate an active company and reactivate an inactive one, with deactivation requiring a confirmation that states the change history is retained and the action is reversible.
- **FR-030**: System MUST prevent deletion of any company that has at least one linked store, MUST render the deletion affordance as unavailable rather than hiding it, and MUST state that managed stores are the reason.
- **FR-031**: System MUST delete a company logically only, retaining its change history, and MUST require a confirmation that states this before deleting.
- **FR-032**: System MUST offer exactly two company status values: active and inactive.

**Change history (Y-03 FR-006)**

- **FR-033**: System MUST record a change-history entry for every registration, attribute change, status change, store link and store release, capturing the timestamp, the acting operator and a human-readable description of the change.
- **FR-034**: System MUST record attribute changes as a before/after difference of the changed attributes rather than as an opaque "record updated" note.
- **FR-035**: System MUST present the change history newest-first with a total count, and MUST retain it after the company is logically deleted.

**Permissions (Y-03 権限マトリクス)**

- **FR-036**: System MUST restrict registration, editing, deletion, deactivation/reactivation and store-link management to System and Headquarter roles.
- **FR-037**: System MUST allow System and Headquarter roles to view every FC company, and MUST allow a Staff-role user holding the FC-company-administrator title to view only the company they belong to, read-only.
- **FR-038**: System MUST deny access to FC Company Management entirely for the Manager, Trainer and Observer roles, and for Staff-role users without the FC-company-administrator title.
- **FR-039**: System MUST render permission-restricted controls as visibly unavailable with an explanation of the permission required, rather than silently omitting them, for users who can reach the screen but not act on it.

**Phase 2 placeholders (Y-03 FR-007, FR-008 — Should)**

- **FR-040**: System MUST offer, only in the Phase 2 view, a per-company aggregation area containing a KPI/store-summary section and a sales-aggregation section, each explicitly labelled as planned for a later phase and showing no figures.
- **FR-041**: System MUST NOT expose the aggregation area at all in the Phase 1 view.
- **FR-042**: System MUST accept and store a royalty rate on the company record from Phase 1 onward, treating it as a reference value with no calculation attached.
- **FR-043**: System MUST reject an FC contract renewal date earlier than the FC contract start date on both registration and edit, with a message stating the renewal date must be on or after the start date (Y-03 FR-002 v4).

### Key Entities

- **FC Company (Operating Company)**: The legal entity operating one or more stores. Identified by a system-assigned FC company ID. Attributes: formal corporate name (required), corporate display name, direct/FC classification (required), legacy direct-ownership flag, authentication method (required — Google SSO or IDaaS), corporate number, representative name, head-office address, phone number, contact person name, contact person email address, contact person phone number, FC contract start date, FC contract renewal date, royalty rate (reference value, may be unset), remarks, status (active/inactive), logical-deletion state, creation timestamp, last-update timestamp. Derived: managed-store count.
- **Store (referenced)**: Maintained by the store master (Y-02). Referenced here by store ID, store name, brand, prefecture and store status. Carries the operating-company reference that constitutes the link managed by this feature. Not created or edited here.
- **Company↔Store Link**: The association between one FC company and the stores it operates. One company may operate many stores; a store belongs to at most one operating company. Establishing or releasing a link is an auditable event.
- **FC Company Change History Entry**: An append-only record of one change to one company. Attributes: change timestamp, acting operator, change description (before/after difference for attribute changes; store name for link changes). Survives logical deletion of the company.
- **Staff Title (referenced)**: The FC-company-administrator title, maintained by title management (Y-11), that grants a Staff-role user read-only visibility of their own company. Consumed here, not maintained.

### Traceability Matrix (UI → Source Requirement)

| UI element / behaviour (V0 source)                                                                                                                    | Requirement    | PO spec anchor                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------- |
| List table columns: FC企業ID / 法人名（表示名） / 直営/FC区分 / 管轄店舗数 / ステータス (`fc-company-list.tsx`)                                       | FR-001         | Y-03 FR-001 表示項目                         |
| Search box `法人名で検索...`, 区分 select, ステータス select (`fc-company-list.tsx`)                                                                  | FR-002         | Y-03 FR-001 検索条件                         |
| `FilterResultBanner` + `条件をクリア` (`fc-company-list.tsx`)                                                                                         | FR-003, FR-006 | Derived UX convention (project-wide)         |
| Sortable ID / display-name headers with sort tooltip (`fc-company-list.tsx`)                                                                          | FR-004         | Derived UX convention (project-wide)         |
| Pagination footer, page-size select 25/50/100 (`fc-company-list.tsx` 9/17)                                                                            | FR-005         | Derived UX convention (project-wide)         |
| `Empty` `filtered` / `empty` variants (`fc-company-list.tsx`)                                                                                         | FR-006         | Derived UX convention (project-wide)         |
| Row click → detail; row menu 編集 / 削除 (`fc-company-list.tsx`)                                                                                      | FR-007         | Y-03 FR-003, FR-004                          |
| `新規登録` button, auto-assigned FC企業ID (`fc-company-list.tsx`, `fc-company-form.tsx`)                                                              | FR-008         | Y-03 FR-002 FC企業ID（自動採番）             |
| Required marks + validation on 法人名（正式名称） / 直営/FC区分 (`fc-company-form.tsx`)                                                               | FR-009         | Y-03 FR-002 必須項目                         |
| 直営/FC区分 select with three options 直営 / フランチャイズ（FC） / 業務委託                                                                          | FR-010         | Y-03 FR-002 直営/FC区分（必須）              |
| 認証方式 select (Google SSO / IDaaS) (`fc-company-form.tsx` 9/3+)                                                                                     | FR-011         | Y-03 FR-002 認証方式（セレクト・必須）       |
| Optional inputs: 表示名, 直営店フラグ, 法人番号, 代表者名, 本社所在地, 電話番号, 担当者名, 担当者メールアドレス, 担当者電話番号, 契約日 ×2, 備考 (v4) | FR-012         | Y-03 FR-002 その他の法人情報項目             |
| Status only on the detail `StatusCard` (無効化/有効化), no form control (`fc-company-detail.tsx` 8/13+)                                               | FR-013, FR-032 | Y-03 補足「ステータス2値（有効/無効）」      |
| Inline field errors + `未入力の項目があります` + scroll-to-invalid (`fc-company-form.tsx`)                                                            | FR-014         | Derived UX convention (project-wide)         |
| Error clearing on valid input (`fc-company-form.tsx`)                                                                                                 | FR-015         | Derived UX convention (project-wide)         |
| Unsaved-changes discard dialog (`fc-company-form.tsx`)                                                                                                | FR-016         | Derived UX convention (project-wide)         |
| Success toast + navigate back to list (`fc-company-form.tsx`)                                                                                         | FR-017         | Derived UX convention (project-wide)         |
| Edit-mode pre-filled values + `FC企業編集` title (`fc-company-form.tsx`)                                                                              | FR-018         | Y-03 FR-003 全項目を表示・編集可能           |
| Detail cards 法人基本情報 / 担当者情報 / 契約情報 / 備考 (`fc-company-detail.tsx`)                                                                    | FR-019         | Y-03 FR-003                                  |
| `StatusCard` with 管轄店舗数 / 作成日 / 更新日 (`fc-company-detail.tsx`)                                                                              | FR-020         | Y-03 FR-003, FR-005                          |
| Header status badge + 直営/FC badge (`fc-company-detail.tsx`)                                                                                         | FR-021         | Y-03 補足「直営/FC区分と直営店フラグの関係」 |
| Tabs 基本情報 / 管轄店舗 / 変更履歴 + `FC企業管理に戻る` (`fc-company-detail.tsx`)                                                                    | FR-022         | Y-03 FR-003 タブ or セクションで表示         |
| 管轄店舗 table (店舗ID/店舗名/ブランド/都道府県/ステータス) + row → store detail (`fc-company-detail.tsx`)                                            | FR-023         | Y-03 FR-005                                  |
| 管轄店舗 empty state (`fc-company-detail.tsx`)                                                                                                        | FR-024         | Y-03 FR-005                                  |
| `店舗を紐づけ` dialog with unlinked candidates / `紐づけ可能な店舗がありません` (`fc-company-detail.tsx`)                                             | FR-025         | Y-03 FR-005 storeOperationCompanyId 設定     |
| `解除` action + unlink confirm dialog (`fc-company-detail.tsx`)                                                                                       | FR-026         | Y-03 FR-005                                  |
| Immediate table/count/status-summary update + link/unlink toasts (`fc-company-detail.tsx`)                                                            | FR-027         | Y-03 FR-005                                  |
| Copy「店舗の紐づけ・解除は本部が設定できます。変更は変更履歴に記録されます。」                                                                        | FR-028, FR-036 | Y-03 FR-005, 権限マトリクス                  |
| 無効化 / 有効化 actions + disable confirm dialog (`fc-company-detail.tsx`)                                                                            | FR-029         | Y-03 FR-004 無効化                           |
| Unavailable 削除 action + reason「管轄店舗が存在するため削除できません」(detail tooltip and list row menu)                                            | FR-030         | Y-03 FR-004 店舗紐づきありは削除不可         |
| Delete confirm dialog copy「論理削除します。変更履歴は保持されます。」                                                                                | FR-031         | Y-03 FR-004 論理削除                         |
| 変更履歴 tab (日時 / 操作者 / 変更内容) + total count (`fc-company-detail.tsx`)                                                                       | FR-033, FR-035 | Y-03 FR-006                                  |
| History entries e.g.「担当者変更: 鈴木 一郎 → 佐藤 花子」/「店舗紐づけ追加: …」(`fc-company-detail.tsx`)                                              | FR-033, FR-034 | Y-03 FR-006 変更前後の項目差分               |
| Role-gated buttons/menu items restricted to Headquarter + System, with permission tooltip                                                             | FR-036, FR-039 | Y-03 権限マトリクス                          |
| _Not modelled in V0_ — Staff (FC企業管理者職位) own-company read-only scoping                                                                         | FR-037, FR-038 | Y-03 権限マトリクス △ 自社情報のみ           |
| 集計 tab rendered only in the Phase 2 view, two 次フェーズ実装予定 placeholder cards (`fc-company-detail.tsx`)                                        | FR-040, FR-041 | Y-03 FR-007, FR-008 (Phase 2 / Should)       |
| ロイヤリティ率 input (V0 gates behind Phase 2) + detail `%` display (`fc-company-form.tsx`, `-detail.tsx`)                                            | FR-042         | Y-03 補足「ロイヤリティ率の入力可否」        |

### Out of Scope

- Royalty calculation logic and any derived royalty amount (Y-03: "算出ロジック提供時期が未定", Phase 2 or later).
- Real KPI aggregation and sales aggregation per FC company (Y-03 FR-007 / FR-008 — Phase 2; only the placeholder structure is delivered).
- Creating, editing or deleting store master records, and setting the operating-company reference from the store side (Y-02 owns those; only the link, managed from the company side, is in scope here).
- Maintaining the staff title master that defines the FC-company-administrator title (Y-11).
- The staff sign-in flow itself; this feature only stores the authentication method that flow consults (Y-13 FR-M003).
- Domain-level authentication settings and reconciliation between domain-level and company-level authentication method (Y-14 takes precedence when they disagree).
- Modelling one company operating multiple brands as a first-class concept (Y-03 open item F-4, future design).
- Legacy-data migration of the store operating company name and direct-ownership flag (a data task, not a screen behaviour).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Headquarters user can locate any specific FC company from the full master in under 15 seconds using search or filters, without paging manually through the list.
- **SC-002**: A Headquarters user can register a new FC company with all required attributes in under 2 minutes from opening the registration form.
- **SC-003**: 100% of submissions that omit a required attribute are blocked, with the offending attribute identified on screen, and none reach the stored master.
- **SC-004**: 100% of attempts to delete a company that operates at least one store are prevented, and each states managed stores as the reason.
- **SC-005**: 100% of registrations, attribute changes, status changes, store links and store releases produce a change-history entry that names the operator and describes what changed.
- **SC-006**: 100% of write actions (register, edit, delete, deactivate, link/unlink) are unavailable to every role other than System and Headquarter.
- **SC-007**: A Staff user holding the FC-company-administrator title sees exactly one company — their own — and zero write affordances.
- **SC-008**: A Headquarters user can determine which stores an FC company operates, and its total count, in a single navigation step from the company's detail screen.
- **SC-009**: A Headquarters user can link or release a store in under 30 seconds from the company's detail screen, and sees the updated managed-store count without reloading.
- **SC-010**: In the Phase 1 view, zero aggregation or KPI surfaces are reachable; in the Phase 2 view, every aggregation surface is explicitly marked as not yet implemented and displays no figures.

## Assumptions

- **Authentication method is in scope despite being absent from V0.** The loaded UI prototype (`426a9b3`, 2026-07-23) predates the Y-03 revision that added the required 認証方式 attribute (`260730_v2`, 2026-07-30). The newer PO spec is treated as authoritative: the attribute is specified as a required two-value selector on the form and is displayed on the detail screen alongside the corporate information, following the form's existing card structure.
- **Royalty rate is available from Phase 1.** Y-03's UI 設計方針 states the input is placed on the form in Phase 1 as a reference value; the V0 prototype instead gates it behind the Phase 2 view. The PO spec is followed — the input is present in Phase 1 — and the attribute is expected to become read-only later, when Phase 2 calculation logic arrives.
- **Status is exactly two values (有効/無効).** Adopted as the minimal operational set per Y-03's supplement; intermediate states such as "closed" or "wound up" would require the requirement to be re-confirmed.
- **Direct/FC classification wins over the legacy direct-ownership flag for display.** The legacy flag is retained as an editable form attribute for compatibility only, and is not shown as a badge anywhere.
- **Staff scoping is title-based.** A Staff-role user's own-company visibility derives from holding the FC-company-administrator title and from their company affiliation; both are supplied by staff/title management rather than configured in this feature.
- **Manager access is excluded.** Y-03 lists Manager's FC-company reference scope as an open item (D-2) but its permission matrix records Manager as `×`; the matrix is followed.
- **Store link changes are recorded as history entries on the company, not on the store.** Y-03 FR-005/FR-006 place the change-history obligation on the operating-company record.
- **Deletion is logical only.** No hard-delete path is offered anywhere in this feature, and logically deleted companies are excluded from the default list view while their history is retained.
- **List defaults follow the V0 prototype.** The list opens at a page size of 50 among the options 25/50/100 (9/17 prototype; also the API's page-size maximum).
- **Contract date ordering is enforced (Y-03 v4).** The renewal date is the next scheduled renewal and must be on or after the start date; migrated data is corrected at migration time, not exempted (FR-043).
- **Corporate name uniqueness is not enforced.** The auto-assigned FC company ID is the sole identity; duplicate formal names are permitted since group companies commonly share name stems.
- **Aggregation placeholders read from no data source.** The Phase 2 aggregation area is structural only, consistent with Y-03's note that Phase 2 aggregates existing Phase 1 data by join and needs no new table.
- **The managed-store list is not independently paginated.** A company's store count is small enough (the largest seeded value is 42) that a total count without pagination is sufficient, matching the V0 prototype.
- **Legacy direct-ownership flag (直営店フラグ, Y-03 FR-002 「保持」) is derived from the classification.** Per Y-03 「既存データ移行時の直営店フラグの扱いはPhase 1 DB設計と合わせて確定」 and the DB design (`stores.dbml` v0.3.6), the legacy flag maps 1:1 to 直営/FC区分 (on → 直営, off → FC); it is kept as a derived value in the API for compatibility (Y-13 FR-M003). The form shows it read-only, checked exactly when 区分 is 直営 (clarified 2026-10-01). A flag that disagrees with 区分 would be a new requirement.
