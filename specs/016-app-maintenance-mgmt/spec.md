# Feature Specification: Y-06 App Maintenance Management

**Feature Branch**: `016-app-maintenance-mgmt`
**Created**: 2026-07-10
**Status**: Draft
**PO Spec**: `Y-06` — アプリメンテナンス管理 (App Maintenance Management) — ⚠️ see Source Discrepancy Note below; the literal content of `crm/requirements/Y-06.md` describes a _different_ feature
**Source**: `.cache/fitness-crm-ui/src/pages/app-maintenance-list.tsx`, `.cache/fitness-crm-ui/src/pages/app-maintenance-form.tsx`; cross-references in `.cache/fitness-spec/crm/requirements/Y-05.md` and `.cache/fitness-spec/crm/requirements/Y-10.md`; backend API design ("App Maintenance" tag, API-072) from the CRM API reference site provided for this task
**Input**: User description: "Create spec for screen Y-06 CRMメンテナンス管理 (App Maintenance Management)" — inputs: `Y-06.md`, `app-maintenance-list.tsx`, `app-maintenance-form.tsx`, plus the CRM API design reference

---

## ⚠️ Source Discrepancy Note (read before using this spec)

The requested source spec file, `crm/requirements/Y-06.md`, is titled **"CRMメンテナンス管理" (CRM Maintenance Management)** — a feature about restricting _CRM admin-screen_ access during platform maintenance via an allow-listed user set. However, the two UI files provided for this task (`app-maintenance-list.tsx`, `app-maintenance-form.tsx`) are explicitly commented as:

> `// Y-06 アプリメンテナンス管理（モバイルアプリ向けメンテナンス）`
> `// Y-10 CRMメンテナンス管理 とは別機能。Y-10.md L47-55 の棲み分け定義に準拠`

i.e. "Y-06 = **App** Maintenance Management (for the mobile app); this is a separate feature from Y-10 CRM Maintenance Management."

This is corroborated by three independent sources:

1. **`Y-10.md` changelog**: _"機能ID を Y-06 → Y-10 に採番変更。Y-06はアプリメンテナンス管理として確定し、CRMメンテナンス管理を Y-10 として分離"_ — the feature ID was renumbered from Y-06 to Y-10, splitting "CRM Maintenance Management" out to Y-10 and confirming Y-06 as "App Maintenance Management."
2. **`Y-05.md`** ("App Release Version Management") cross-references _"Y-06 アプリメンテナンス管理"_ and _"Y-06 FR-007"_ multiple times as the feature governing forced-update suppression during app maintenance windows.
3. **The backend API design** defines two distinct tags: `App Maintenance` — _"Mobile app maintenance window management (HQ operators) and member-facing startup status"_ — and `CRM Maintenance` — a separate tag for CRM admin-access control.

**Conclusion**: `crm/requirements/Y-06.md`'s body text is a stale artifact left over from before the Y-06→Y-10 renumbering; it was never rewritten to describe the actual Y-06 feature. This specification is grounded on the **UI code** (primary, per task instructions) and the **backend API design**, both of which agree on what Y-06 actually is: mobile app maintenance window management. The old `Y-06.md` document's FR-001–FR-008 (allow-listed users, CRM access restriction) describe a **different, out-of-scope feature** and are not used here.

**Update (2026-07-23)**: `crm/requirements/Y-06.md` has since been rewritten (version **260713_v2**, 2026-07-13) to correctly describe App Maintenance Management (the mobile-app feature), bringing the PO spec into alignment with this specification. Its 権限マトリクス (permission matrix) is now the authority for FR-014 — see Session 2026-07-23 and FR-014. The separate CRM Maintenance Management feature remains under Y-10.

---

## Clarifications

### Session 2026-07-23

- Q: The PO spec `crm/requirements/Y-06.md` was rewritten (version 260713_v2, 2026-07-13) to correctly describe App Maintenance Management and now includes an authoritative 権限マトリクス (permission matrix). Which model governs — the 2026-07-10 resolution (System-only writes, Headquarter read-only, no access for other roles) or the v2 matrix? → A: Follow the v2 matrix. Create/edit/delete — including allowed-member (許可会員) setting and announcement (お知らせ) management — are permitted for **System** and **Headquarter**. **Manager**, **Staff**, and **Observer** have view-only access to the list/detail. **Trainer** has no access. This supersedes the 2026-07-10 resolution and FR-014's earlier System-only rule.

### Session 2026-07-10

- Q: Who may create, edit, and delete a maintenance window — follow the UI prototype (Headquarter + System can create/edit, Delete ungated) or the backend API design (System-only for all writes, Headquarter read-only)? → A: Follow the backend API design — only `System` can create/edit/delete; `Headquarter` is read-only (view list/detail only). The UI prototype's role gates must be corrected accordingly (see FR-014). **⚠️ Superseded 2026-07-23** by the Y-06 v2 (260713_v2) permission matrix — see Session 2026-07-23 and FR-014.
- Q: Should Phase 1 add a required "Title" field (form input + list column) to match the backend API design, which requires it on create? → A: No — follow the UI prototype as-is; Title is deferred out of Phase 1 scope. The window's system-generated ID remains the only identifying label for Phase 1 (see FR-012, Out of Scope).
- Q: Should Phase 1's brand selector add a third "all brands / both" option to match the backend API design's `targetBrand` enum (`joyfit`/`fit365`/`all`)? → A: No — follow the UI prototype as-is; keep the two-option JOYFIT/FIT365 selector only. A platform-wide (both-brand) outage requires two separate windows for Phase 1; "all" is deferred to a later phase (see FR-008, Out of Scope).
- Q: Should Phase 1 implement client-side validation and inline error messaging matching the backend's field rules (required fields, character limits, end-after-start ordering), or rely solely on generic server-side rejection? → A: Yes — implement matching client-side validation with inline error messages for required fields, character limits, and end-after-start ordering (see FR-012).
- Q: Should Phase 1 build dedicated UI for the "overlapping period" conflict (naming the specific conflicting window)? Note: the backend's 409 `E-MNT-001` response contains only a generic `userMessage` ("The period overlaps an existing maintenance window") — no conflicting window ID, brand, or dates — so a "name the conflicting record" UI is not supportable without an additional lookup. → A: No — follow the UI prototype as-is for Phase 1; surface the backend's generic error message (e.g., as a toast/generic error banner) rather than building dedicated conflict-detail UI (see FR-012, Out of Scope).

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse and locate maintenance windows (Priority: P1)

As a staff member with view access (System, Headquarter, Manager, Staff, or Observer), I open the App Maintenance Management screen and see every registered mobile-app maintenance window in a sortable, filterable, paginated list, so I can quickly check what's scheduled, in progress, or completed.

**Why this priority**: The list is the entry point for every other action (create, edit, delete) and the only way to answer "is anything happening to the app right now or soon."

**Verification**: Open the screen, confirm the table renders with all registered windows and correct auto-computed statuses; use search, filters, sort, and pagination and confirm the table updates accordingly without leaving the page.

**Acceptance Scenarios**:

1. **Given** the screen loads, **When** windows exist, **Then** each row shows ID, target brand, start datetime, end datetime, message (truncated), and a status badge (Scheduled / In Progress / Completed) — status is never manually entered, it is computed from the current time versus the window's start/end datetime.
2. **Given** the list is displayed, **When** the user types text into the search box, **Then** only rows whose ID or message contains that text remain visible.
3. **Given** the user opens the detail filter panel, **When** a brand (All / JOYFIT / FIT365) and/or status (All / Scheduled / In Progress / Completed) is selected, **Then** the table narrows to matching rows, an active-filter count badge appears next to the filter toggle, and a banner shows "`N` of `M` shown" plus a summary of the active search/filter criteria with a "clear conditions" action.
4. **Given** the user clicks a sortable column header (Start datetime or End datetime), **When** clicked once, **Then** the list sorts ascending by that column; clicking again reverses to descending (an icon and tooltip indicate current/next sort direction). Default sort on page load is start datetime, descending.
5. **Given** more rows exist than the current page size, **When** the user changes the page-size selector (25 / 50 / 100 / 200) or clicks pagination controls, **Then** the table shows the corresponding slice of rows and an updated "showing X–Y of N" label.
6. **Given** no windows exist at all, **When** the list renders, **Then** an empty-state message appropriate to "no data yet" is shown. **Given** search/filters are active and match zero rows, **When** the list renders, **Then** a distinct "no matches" empty-state is shown with a "clear conditions" action.

---

### User Story 2 - Register a new maintenance window (Priority: P1)

As an authorized staff member, I register a new maintenance window — target brand, start/end datetime, and the message members will see — so the mobile app can suppress normal use and forced updates during that window.

**Why this priority**: Without registration, no maintenance window can ever exist; this is the core write operation the whole feature exists to support.

**Verification**: From the list, click "New Registration," fill in the fields, submit, and confirm a success message appears and the new window returns to the list.

**Acceptance Scenarios**:

1. **Given** an authorized user opens the registration form, **When** the form loads, **Then** it presents: target brand (JOYFIT / FIT365, single-select), start datetime, end datetime, and a maintenance message (multi-line, member-facing).
2. **Given** the form is displayed, **When** the user reads the page, **Then** a warning notice explains that during the window the selected brand's app will be unusable and forced-update prompts are automatically suppressed (cross-reference: Y-05 forced update).
3. **Given** all required fields are completed and valid (message and dates within the rules in FR-012), **When** the user submits, **Then** a success confirmation is shown and the user returns to the list screen.
4. **Given** a required field is left blank, the message exceeds its character limit, or the end datetime is not after the start datetime, **When** the user submits, **Then** an inline validation error is shown next to the offending field(s) and the form is not submitted (FR-012).
5. **Given** the user has not finished / decides not to submit, **When** "Cancel" is clicked, **Then** the user returns to the list screen with nothing saved.

---

### User Story 3 - Edit an existing maintenance window, with in-progress protection (Priority: P2)

As an authorized staff member, I open an existing maintenance window from the list and update its details, except that I cannot change the start datetime once the window is already in progress.

**Why this priority**: Corrections (extending an end time, fixing a typo in the message) are a common follow-up need, but changing the start time of a window that has already begun would desynchronize CRM records from what is already happening on the platform.

**Verification**: Click a row in the list to open it in the edit form pre-filled with its data; for a window whose status is In Progress, confirm the start-datetime field is disabled with an explanatory tooltip while other fields remain editable; save and confirm return to the list with a success message.

**Acceptance Scenarios**:

1. **Given** a list row is clicked (anywhere except its action menu), **When** the row is clicked, **Then** the edit form opens pre-filled with that window's data.
2. **Given** the window's status is In Progress, **When** the edit form renders, **Then** the start-datetime field is shown disabled/locked with a tooltip explaining "cannot change the start datetime while maintenance is in progress," while end datetime and message remain editable.
3. **Given** the window's status is Scheduled or Completed, **When** the edit form renders, **Then** the start-datetime field is fully editable.
4. **Given** valid changes are made, **When** the user saves, **Then** a success confirmation is shown and the user returns to the list.

---

### User Story 4 - Delete a maintenance window, with in-progress protection (Priority: P3)

As an authorized staff member, I remove a maintenance window that is no longer needed, but I cannot delete one that is currently in progress.

**Why this priority**: Cleanup of mistaken or cancelled entries matters but is lower-frequency and lower-risk than create/edit, and is naturally the last of the four CRUD actions.

**Verification**: Open a row's action menu; for a Scheduled or Completed window, choose Delete, confirm in the dialog, and verify the row disappears from the list. For an In Progress window, verify the Delete option is shown disabled with an explanation instead.

**Acceptance Scenarios**:

1. **Given** a window's status is Scheduled or Completed, **When** the user opens its row action menu and selects "Delete," **Then** a confirmation dialog appears naming the brand and start time and asking for confirmation; confirming removes the window, cancelling leaves it unchanged.
2. **Given** a window's status is In Progress, **When** the user opens its row action menu, **Then** the "Delete" option is shown disabled with inline text explaining it cannot be deleted while maintenance is in progress.

---

### Edge Cases

- What happens when the maintenance window list is completely empty (no windows ever registered)? → distinct empty-state from the "search/filter produced zero results" case (FR-006).
- What happens when a user tries to change the start datetime of an In Progress window? → the field is disabled in the UI; the backend independently rejects such a change (see FR-012).
- What happens when a user tries to delete an In Progress window? → the action is disabled in the UI; the backend independently rejects such a deletion (see FR-012).
- What happens when the requested end datetime is not after the start datetime? → the form shows an inline validation error and blocks submission (see FR-012; resolved 2026-07-10).
- What happens when a new/edited window's period overlaps another window already registered for the same brand (or a brand-wide "all" window)? → the server rejects it; the form shows the backend's generic conflict error message (no dedicated UI naming the specific colliding window — resolved 2026-07-10, see FR-012).
- What happens when a role without access attempts to reach this screen? → out of scope for this spec (route-level guarding is not part of the provided UI files); assumed consistent with the role restrictions in FR-014.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST display a paginated list of app maintenance windows showing, per row: ID, target brand, start datetime, end datetime, message, and a status badge. [Source: `app-maintenance-list.tsx`]
- **FR-002**: The system MUST support free-text search over ID and message (partial match), updating the list live as the user types. [Source: `app-maintenance-list.tsx`]
- **FR-003**: The system MUST support filtering by target brand (All / JOYFIT / FIT365) and by status (All / Scheduled / In Progress / Completed), combinable with each other and with search; it MUST show an active-filter count and a "clear all" action, and a results-summary banner while any filter/search is active. [Source: `app-maintenance-list.tsx`]
- **FR-004**: The system MUST allow sorting the list by start datetime or end datetime, toggling ascending/descending on repeated clicks of the same column; default sort MUST be start datetime, descending. [Source: `app-maintenance-list.tsx`]
- **FR-005**: The system MUST support configurable page size (25 / 50 / 100 / 200, default 50) with page navigation controls and a "showing X–Y of N" label. [Source: `app-maintenance-list.tsx`]
- **FR-006**: The system MUST show a "no data yet" empty state when zero windows exist, and a distinct "no matches" empty state (with a clear-conditions action) when search/filters exclude all rows. [Source: `app-maintenance-list.tsx`, `Empty` component]
- **FR-007**: The system MUST derive each window's status automatically by comparing the current time to its start/end datetime — never accept or store a manually chosen status: before start → Scheduled; between start and end → In Progress; after end → Completed. [Source: `app-maintenance-list.tsx` status enum; backend API design — derived-status business rule]
- **FR-008**: The system MUST allow an authorized user to register a new maintenance window by specifying: target brand (single-select: JOYFIT or FIT365 — a platform-wide outage affecting both brands requires registering two separate windows for Phase 1; resolved 2026-07-10, see Clarifications), start datetime, end datetime, and a member-facing maintenance message. [Source: `app-maintenance-form.tsx`]
- **FR-009**: The system MUST show a warning notice on the create/edit form stating that the target brand's app will be unusable during the window and that forced-update prompts are automatically suppressed for that period (cross-reference: Y-05 App Release Version Management). [Source: `app-maintenance-form.tsx`]
- **FR-010**: The system MUST disable editing of a window's start datetime once its status is In Progress, showing an explanatory tooltip, while leaving other fields editable; the start datetime MUST remain fully editable for Scheduled or Completed windows. [Source: `app-maintenance-form.tsx`; backend API design — update rule, rejected server-side otherwise]
- **FR-011**: The system MUST allow deleting a Scheduled or Completed window via a confirmation dialog that names the brand and start time, and MUST prevent deleting an In Progress window, showing the Delete action disabled with an inline explanation. [Source: `app-maintenance-list.tsx`; backend API design — delete rule, rejected server-side otherwise]
- **FR-012**: The system MUST validate, client-side with inline error messaging (resolved 2026-07-10 — see Clarifications; the provided prototype does not yet implement this and must be extended to do so), the following data rules defined by the backend API design: a maintenance message (required, 1–1000 characters); end datetime after start datetime; an optional internal remarks/note field (≤1000 characters, not shown to members). The system MUST also enforce — server-side — that no two windows for the same brand scope (or an overlapping "all" window) may have overlapping start/end periods; on rejection, Phase 1 MUST surface the backend's generic error message (no dedicated conflict-detail UI naming the specific colliding window — the backend's error response does not include that information; resolved 2026-07-10, see Clarifications). _(An administrative "Title" field is required by the backend API design but is deliberately excluded from Phase 1 per the prototype — resolved 2026-07-10, see Clarifications and Out of Scope.)_
- **FR-013**: Clicking anywhere on a list row (other than its action menu) MUST open that window in the edit form. [Source: `app-maintenance-list.tsx`]
- **FR-014**: Access to this screen MUST follow the Y-06 v2 (260713*v2) 権限マトリクス. Create, edit, and delete actions — including allowed-member (許可会員) setting and announcement (お知らせ) management — MUST be restricted to the **System** and **Headquarter** roles. **Manager**, **Staff**, and **Observer** MUST have view-only access (list/detail viewing only, with create/edit/delete controls hidden or disabled). **Trainer** MUST have no access to this screen. *(Superseded 2026-07-23 the earlier System-only-writes / Headquarter-read-only resolution of 2026-07-10 — see Clarifications, Session 2026-07-23. This also corrects the original UI prototype, which role-gated "New Registration" and "Edit" to both Headquarter and System and left "Delete" with no role gate at all.)\_
- **FR-015**: On successful create or update, the system MUST show a success confirmation and return the user to the list screen. [Source: `app-maintenance-form.tsx`]
- **FR-016**: The system MUST return the user to the list screen without saving when "Cancel" is chosen on the create/edit form. [Source: `app-maintenance-form.tsx`]

### Key Entities _(include if feature involves data)_

- **App Maintenance Window**: A scheduled (or completed) outage period for a mobile app brand. Key attributes for Phase 1: target brand, start datetime, end datetime, member-facing maintenance message, derived status (Scheduled / In Progress / Completed — computed, never stored), creator, last updater, created/updated timestamps. (An administrative title and an optional internal remarks field exist in the backend data model but are out of scope for the Phase 1 UI — see Out of Scope.)
- **Brand**: JOYFIT or FIT365 — the mobile app audience a given maintenance window applies to. (A "both brands" scope exists in the backend data model but is out of scope for Phase 1 — see Out of Scope.)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Staff can locate a specific maintenance window (by ID or message keyword) among the full list within 10 seconds using search and/or filters.
- **SC-002**: An authorized staff member can register a new maintenance window in under 2 minutes from opening the registration form.
- **SC-003**: 100% of displayed maintenance windows show a status that is always correct for the current moment relative to their start/end datetime, with zero manual status entry.
- **SC-004**: 0% of attempts to change the start time or delete a window that is currently in progress succeed — both are blocked at the point of interaction.
- **SC-005**: Staff can browse historical/upcoming windows in batches of up to 200 per page without needing an unpaginated, all-at-once list view.

## Assumptions

- Phase 1 scope is limited to the two CRM-side screens represented by the provided UI files: the maintenance-window list and the create/edit form. The member-facing mobile "is the app under maintenance right now" check is a separate, screen-less backend/mobile capability and is out of scope here (see Out of Scope).
- Screen access follows the Y-06 v2 (260713_v2) 権限マトリクス: **System** and **Headquarter** have full access (view + create/edit/delete); **Manager**, **Staff**, and **Observer** have view-only access to the list/detail; **Trainer** has no access. This supersedes the earlier "System + Headquarter only, System-only writes" assumption (resolved 2026-07-23, see Clarifications and FR-014).
- The provided edit-form prototype hardcodes a status of "In Progress" for demonstration purposes (to showcase the disabled start-datetime behavior) rather than computing it from real data; the actual feature must compute status per FR-007 for whichever record is opened.
- The provided prototype does not bind a clicked list row's actual data into the edit form (it always opens with the same static sample values); this is a prototype/mock limitation the real implementation must close.
- The provided prototype implements no client-side validation (submitting always succeeds regardless of field contents); Phase 1 must add it per FR-012 (resolved 2026-07-10, see Clarifications), grounded in the backend API design's field rules as the authoritative source for limits/ordering.
- Timestamps are managed as absolute datetimes (backend API design specifies UTC ISO-8601); the CRM UI is assumed to display them in local/JST time as it does elsewhere in this codebase (`date-fns` with the `ja` locale), consistent with project conventions.

## Out of Scope for Phase 1

- The legacy `crm/requirements/Y-06.md` document's actual content — CRM Maintenance Management (permission-gated CRM admin-screen access control with an allow-listed user set) — describes a **different feature** (now correctly numbered Y-10) and is entirely excluded from this spec. See Source Discrepancy Note.
- The member-facing mobile app startup maintenance-status check (backend API design: `GET /api/v1/mobile/app-maintenance/status`, noted in that design as superseded since 2026-06-05 by a consolidated `GET /api/v1/mobile/app-status` endpoint). No CRM screen surface was provided for this; it is backend/mobile-team scope.
- Proactive notification of upcoming maintenance to CRM users or app members beyond the in-app message shown during the window itself — no notification UI or logic appears in the provided files.
- Any change to Y-05 App Release Version Management's own forced-update suppression logic — this spec only requires that the two features' time windows stay consistent; the suppression mechanism itself belongs to Y-05.
- Explicit history date-range filtering (separate `fromDate`/`toDate` controls) beyond the existing status filter and start/end-date sort — not present in the provided list UI.
- An administrative "Title" field (form input + list column) — the backend API design requires it, but Phase 1 deliberately follows the UI prototype, which has no such field; the window's ID is the only identifying label for Phase 1 (resolved 2026-07-10, see Clarifications).
- A third "all brands / both" option on the brand selector — the backend API design's `targetBrand` supports it, but Phase 1 deliberately follows the UI prototype's two-option (JOYFIT/FIT365) selector; a platform-wide outage requires two separate windows for Phase 1 (resolved 2026-07-10, see Clarifications).
- Dedicated "overlapping period" conflict UI (e.g., naming the specific colliding window) — the backend's 409 error response carries only a generic message with no conflicting-window detail, and Phase 1 follows the prototype in surfacing that generic message rather than building bespoke conflict-detail UI (resolved 2026-07-10, see Clarifications).

---

## Q&A / Clarification Needed

The following points could not be resolved from the provided sources without guessing, and are flagged here for `/speckit.clarify` rather than assumed. They are grouped from highest to lowest impact. (Q1, Q2, Q3, Q5, and Q6 were resolved via `/speckit.clarify` on 2026-07-10 — see Clarifications section above, FR-014, FR-012, FR-008, and Out of Scope.)

### Q4. Is the target brand editable after creation? (Medium impact — business rule conflict)

- The backend API design's update schema explicitly states: _"`targetBrand` is not editable after creation."_
- The provided edit form initializes the brand radio group from state (`useState(mode === "edit" ? "JOYFIT" : "")`) and leaves it fully interactive with no `disabled` condition tied to edit mode — i.e., the prototype currently allows changing the brand when editing.
- **Question**: Should the Phase 1 edit form disable the brand selector (matching the backend's immutability rule), or should the backend rule be reconsidered? Assumed default if unresolved: follow the backend rule (disable brand editing on edit) since brand reassignment after creation has no described business justification.

### Q7. Should the optional internal "Remarks/Note" field be added to the form? (Low impact — data model completeness)

- The backend API design's create/update schemas include an optional `note` field (internal remarks, ≤1000 characters, not shown to members, nullable/clearable).
- No such field exists in the provided create/edit form.
- **Question**: Add a "Remarks" textarea to the Phase 1 form (matching the backend schema), or intentionally defer it?
