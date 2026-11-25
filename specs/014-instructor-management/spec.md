# Feature Specification: D-04 Instructor Management

**Feature Branch**: `014-instructor-management`
**Created**: 2026-07-07
**Status**: Draft
**PO Spec**: `D-04` - 指導者管理 (Instructor Management)
**Source**: `.cache/fitness-crm-ui/src/pages/lesson-instructor.tsx`, `.cache/fitness-spec/crm/requirements/D-04.md`
**Input**: User description: "Create spec for the D-04 指導者管理, Spec: `requirements/D-04.md`, Design: `pages/lesson-instructor.tsx`"

## Clarifications

### Session 2026-10-22

Real-API integration ([integration-plan.md](./integration-plan.md)); D-04 `260901_v3`, API-109 v0.10, API-112 v0.15.

- Q: The "Upcoming Schedule" card — first 3 entries (prototype, v2 wording) or first 5 (FR-003 v3, Dev Q&A 2026-08-24)? → A: First **5**, ascending by start; only sessions starting from now (today's finished ones excluded), published and not cancelled.
- Q: The API's `coachTypes` filter matches ANY listed role, so "this tab AND role X" cannot be asked for. How does the role filter work inside a tab? → A: Each tab offers only its own roles (Studio Instructor: Instructor; Personal Trainer: Trainer / Body-Care Therapist); choosing one narrows the tab to that role.
- Q: How far does the expanded schedule sheet ("show all") reach? → A: The next 3 calendar months (the schedule API's widest window).
- Q: D-04 does not define the "Change History" tab; the prototype has it. Wire it now? → A: Yes (spec silent → follow the prototype), visible to System / Headquarters / Manager only, as the history API allows.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse and find instructors (Priority: P1)

As Headquarter, Manager, Staff, or Trainer, I can open the Instructor Management screen, switch between the "Studio Instructor" and "Personal Trainer" tabs, search by name/nickname/ID, and apply role/brand/status filters to quickly locate an instructor.

**Why this priority**: The list is the entry point for every downstream instructor workflow (viewing, editing, deleting). Without it, no other operation can be initiated.

**Independent Test**: Open the list page, switch tabs, type a search term, toggle each filter, and verify the table updates accordingly without navigating elsewhere.

**Acceptance Scenarios**:

1. **Given** the user opens the Instructor Management page, **When** the page loads, **Then** instructors are separated into two tabs — "Studio Instructor" and "Personal Trainer" — each showing its own record count badge.
2. **Given** the list is displayed, **When** the user types a partial name, nickname, romaji name, or ID into the search field, **Then** only matching rows remain visible.
3. **Given** the user expands the detail filter panel, **When** a role, brand, or status filter is selected, **Then** the table narrows to matching rows and an active-filter count badge appears; "clear all" resets every filter and the search field.
4. **Given** no row matches the current search/filter combination, **When** the table renders, **Then** an empty/filtered state is shown with an action to clear conditions.
5. **Given** the user's role has restricted data scope, **When** the list loads, **Then** only instructors within that scope are shown (System/Headquarter: all; Manager: managed stores; Staff/Trainer/Observer: own store, Trainer limited to self per the permission matrix).

---

### User Story 2 - Register a new instructor (Priority: P2)

As Headquarter, Manager, or Staff, I can register a new instructor's profile — name, nickname, romaji name, one or more role classifications, profile text, instructing history, photo, buffer settings, and an optional CRM account link — then confirm and submit.

**Why this priority**: Instructor registration is required before an instructor can be selected in D-01 lesson scheduling; it is the second most critical workflow after browsing.

**Independent Test**: From the list page, click "New Instructor Registration," fill required fields, submit, confirm on the review dialog, and verify a validation error appears when a required field is left blank.

**Acceptance Scenarios**:

1. **Given** an authorized user opens the registration form, **When** required fields (name, at least one role classification) are left blank and submit is attempted, **Then** a "{field name} is required" error is shown next to each missing field and the confirmation dialog does not open.
2. **Given** all required fields are filled, **When** the user clicks "Confirm input," **Then** a confirmation dialog summarizes the entered values (name, nickname, role classifications, status, linked CRM account if any).
3. **Given** the confirmation dialog is open, **When** the user confirms, **Then** the instructor profile is created and the user returns to the instructor list/detail.
4. **Given** the registration form is open, **When** the user sets buffer settings, **Then** minimum booking lead time is selectable from {0,1,2,3,6,12,24,48,72 hours}, and pre-/post-buffer are each selectable from {0,15,30,45,60 minutes}.
5. **Given** the registration form is open, **When** the user searches and selects a staff record to link a CRM account, **Then** the selected staff is shown with a removable badge; linking is optional.
6. **Given** the "New Instructor Registration" action is rendered, **When** the current user's role is Trainer or Observer, **Then** the action is disabled with a tooltip explaining the restriction.

---

### User Story 3 - View instructor detail (Priority: P1)

As an authorized user, I can open an instructor's detail page to review their full profile, buffer settings, CRM account link, status, performance summary, assigned lessons, and upcoming schedule, then take role-appropriate actions.

**Why this priority**: The detail view centralizes the information store staff and trainers need day-to-day (who this instructor is, their bookings, their performance) and is the gateway to edit/delete/status actions.

**Independent Test**: Open a row from the list and verify every section renders (basic info, profile, buffer settings, CRM link, status card, performance summary, assigned lessons, upcoming schedule) and that action buttons are gated by role.

**Acceptance Scenarios**:

1. **Given** the user opens an instructor's detail page, **When** the page loads, **Then** basic information (ID, name, nickname, romaji name, role classifications, registered/updated dates), profile text, instructing history, and current buffer settings are displayed.
2. **Given** the detail page is open, **When** the user views the right-hand panel, **Then** a performance summary card shows weekly lesson count, average reservation rate, average rating, and monthly participant count as four combined metrics (no separate rating-only card).
3. **Given** the detail page is open, **When** the user views "Assigned Lessons," **Then** a compact card list (lesson name, weekday(s), time, reservation rate) is shown, each linking toward the related lesson.
4. **Given** the detail page is open, **When** the user views "Upcoming Schedule," **Then** the first 3 entries are shown inline with a control to expand the full list (recurring-setting summary plus individual schedule entries) in a side panel.
5. **Given** the current user is the Trainer who owns the profile, **When** they open their own detail page, **Then** only the edit action is available for their permitted fields; delete is not available to them.
6. **Given** the current user's role lacks edit or delete permission for this record, **When** they view the detail page, **Then** the corresponding action button is disabled with an explanatory tooltip.

---

### User Story 4 - Edit an existing instructor (Priority: P2)

As an authorized user, I can edit an instructor's profile, with the set of editable fields determined by my role.

**Why this priority**: Keeping instructor data current (buffer settings, profile, contact details) directly affects scheduling accuracy and the accuracy of what members see in the mobile app.

**Independent Test**: Open edit from the detail page as different roles and verify the correct fields are editable/locked, then save and confirm the update is reflected in detail view.

**Acceptance Scenarios**:

1. **Given** Headquarters, Manager, or Staff opens the edit form, **When** the form renders, **Then** all fields are editable.
2. **Given** a Trainer opens the edit form for their own profile, **When** the form renders, **Then** name and role classifications are shown as read-only ("cannot be self-edited"), while nickname, romaji name, profile text, photo, instructing history, and buffer settings remain editable.
3. **Given** the edit form is submitted with valid data, **When** the user confirms on the review dialog, **Then** the profile is updated and the user is returned to the detail view showing the new values.
4. **Given** the edit form is submitted with a missing required field, **When** validation runs, **Then** the same validation rules as registration apply and block submission.

---

### User Story 5 - Deactivate or delete an instructor (Priority: P2)

As Headquarters or Manager, I can deactivate an instructor who has left, and delete an instructor's profile outright when they have no assigned schedules.

**Why this priority**: Departed or contract-ended instructors must be removed from active selection in scheduling while preserving historical session/booking data — this is a compliance and data-integrity requirement.

**Independent Test**: Toggle status active/inactive from the detail page's status card, and attempt delete on instructors with and without assigned schedules to verify the guardrail.

**Acceptance Scenarios**:

1. **Given** the current user is Headquarters or Manager, **When** they click "Deactivate" on an active instructor's status card, **Then** the instructor's status becomes "Inactive" and a confirmation toast is shown; the instructor is no longer offered as a selectable option in new schedule registration, but existing schedules remain unaffected.
2. **Given** an instructor is Inactive, **When** an authorized user clicks "Activate," **Then** the status reverts to "Active."
3. **Given** the current user attempts to delete an instructor who has one or more assigned schedules, **When** the delete confirmation dialog opens, **Then** a blocking warning is shown stating the number of assigned schedules and the confirm/delete action is disabled.
4. **Given** the current user attempts to delete an instructor with zero assigned schedules, **When** they confirm the delete dialog, **Then** the profile is permanently removed.
5. **Given** the current user's role is Staff, Trainer, or Observer, **When** they view the detail page, **Then** the delete action is not available to them.

---

### User Story 6 - Review instructor change history (Priority: P3)

As an authorized user, I can view a chronological, field-level change history for an instructor's profile.

**Why this priority**: Change history supports auditability and dispute resolution but is not required for day-to-day scheduling operations, hence lower priority than the core CRUD flows.

**Independent Test**: Open the "Change History" tab on an instructor's detail page and verify each change entry lists timestamp, operator, changed field, before value, and after value; creation events are marked distinctly.

**Acceptance Scenarios**:

1. **Given** the user opens the "Change History" tab, **When** the tab renders, **Then** each historical update is listed as one row per changed field with timestamp, operator, field name, before value, and after value.
2. **Given** a history entry represents the initial creation of the instructor record, **When** it is rendered, **Then** it is shown with a distinct "Newly Created" indicator and note instead of a before/after diff.

### Edge Cases

- Search and filters combine to produce zero results in either tab.
- A Trainer role user opens the detail page for an instructor other than themselves — edit/delete actions must reflect the standard permission matrix, not the self-edit exception.
- An instructor has no nickname, romaji name, profile text, or photo — the UI must render sensible empty states rather than blank/broken layout.
- A user without registration permission (Trainer, Observer) attempts to reach the registration form directly — the action must remain disabled/blocked, consistent with the button-level gating.
- An instructor with zero upcoming schedules — "Upcoming Schedule" and its expand action should reflect an empty count instead of erroring.
- Deleting an instructor is attempted while their assigned-schedule count is greater than zero — deletion must be blocked every time, not just warned.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001 (List Rendering & Tabs)**: System MUST provide an instructor list page split into two tabs — "Studio Instructor" and "Personal Trainer" — each displaying instructor ID, name, nickname, role classification(s), brand(s), and status.
- **FR-002 (Search)**: System MUST support keyword search across name, romaji name, and nickname (instructor IDs are system UUIDs and are not searched — Clarifications 2026-10-22).
- **FR-003 (Filters)**: System MUST support filtering by role classification (only the active tab's roles — Clarifications 2026-10-22), brand (JOYFIT / FIT365), and status, with an active-filter count indicator and a "clear all" action.
- **FR-004 (List Empty/Filtered States)**: System MUST show an empty/filtered state with a "clear conditions" action when no rows match current search/filter conditions.
- **FR-005 (Data Scope by Role)**: System MUST restrict list and detail visibility to the current user's data scope: System/Headquarters see all instructors; Manager sees managed-store instructors; Staff/Observer see their own store's instructors; Trainer sees only their own profile.
- **FR-006 (Create Instructor)**: System MUST provide a registration form capturing name (required), romaji name (optional), nickname (optional), role classification (required, multi-select), profile text (optional), instructing history (optional), photo (optional), buffer settings, and an optional CRM account link, and MUST validate required fields with a "{field name} is required" message before allowing confirmation. Single-line text fields (name, romaji name, nickname) MUST be limited to 100 characters (API-109 §7), the romaji name to letters, spaces and hyphens; multi-line text fields (profile text, instructing history) MUST be limited to `TEXTAREA_MAX_LENGTH` (1000) characters, both surfacing a "{N}文字以内で入力してください。" message when exceeded.
- **FR-007 (Buffer Settings)**: System MUST allow setting minimum booking lead time (choice of 0/1/2/3/6/12/24/48/72 hours), pre-buffer (choice of 0/15/30/45/60 minutes), and post-buffer (choice of 0/15/30/45/60 minutes) as part of create and edit.
- **FR-008 (CRM Account Link)**: System MUST allow optionally linking an instructor profile to a staff record (searchable by name/ID) and allow removing an existing link; this field is not required.
- **FR-009 (Registration/Edit Confirmation)**: System MUST show a confirmation dialog summarizing entered values before finalizing a create or edit action.
- **FR-010 (Detail View)**: System MUST provide a detail page with tabs for "Basic Information" and "Change History," showing profile fields, buffer settings, CRM account link, status, a performance summary, assigned lessons, and upcoming schedule.
- **FR-011 (Performance Summary)**: System MUST display, as a single combined summary (not as separate independent cards), weekly lesson count, average reservation rate, average rating, and monthly participant count.
- **FR-012 (Assigned Lessons)**: System MUST display the instructor's assigned lessons as a compact list (lesson name, weekday(s), time, reservation rate) linking toward lesson detail.
- **FR-013 (Upcoming Schedule)**: System MUST display the first 5 upcoming schedule entries inline (sessions starting from now, published, not cancelled, ascending — Clarifications 2026-10-22), with an action to expand the full list — organized as a recurring-setting summary plus an individual schedule entry list — in an expandable panel.
- **FR-014 (Edit Instructor)**: System MUST allow editing an existing instructor's profile, applying the same field validation as registration.
- **FR-015 (Role-Scoped Field Editability)**: System MUST restrict which fields a Trainer may edit on their own profile to nickname, romaji name, profile text, photo, instructing history, and buffer settings, keeping name and role classification read-only for that role; Headquarters/Manager/Staff MAY edit all fields.
- **FR-016 (Deactivate/Activate)**: System MUST allow Headquarters/Manager to toggle an instructor's status between Active and Inactive from the detail page, with Inactive instructors excluded from selection in new schedule registration while existing schedules remain unaffected.
- **FR-017 (Delete Guardrail)**: System MUST allow Headquarters/Manager to permanently delete an instructor only when the instructor has zero assigned schedules; deletion MUST be blocked with an explanatory message whenever one or more schedules are assigned, directing the user to deactivate instead.
- **FR-018 (Role-Gated Actions)**: System MUST gate the "New Instructor Registration," "Edit," and "Delete" actions according to the permission matrix (registration: Headquarters/Manager/Staff; edit: Headquarters/Manager/Staff/Trainer-self; delete: Headquarters/Manager only), disabling and explaining unavailable actions to unauthorized roles.
- **FR-019 (Change History)**: System MUST display, to System / Headquarters / Manager, a field-level change history (timestamp, operator, changed field, before value, after value) per instructor, with creation events shown as a distinct "Newly Created" entry instead of a before/after diff.
- **FR-020 (Average Rating Display, Should)**: System MUST display the instructor's average rating as one element of the performance summary (FR-011); a dedicated rating-only card or breakdown is out of scope until the rating data source is finalized.

### Key Entities _(include if feature involves data)_

- **Instructor**: A trainer/instructor profile — ID, name, romaji name, nickname, role classification(s), profile text, instructing history, photo, status (active/inactive), registered/updated dates, buffer settings, and an optional link to a CRM staff account. Assigned store/brand are not stored on this entity; they are derived from schedule assignments.
- **Role Classification**: One or more of Trainer / Instructor / Body-Care Therapist assigned to an instructor.
- **Buffer Settings**: Per-instructor scheduling constraints — minimum booking lead time, pre-buffer, and post-buffer — consumed by D-01 lesson scheduling.
- **CRM Account Link**: Optional association between an Instructor and a Y-01 staff record, used for CRM login as the Trainer role.
- **Assigned Lesson**: A lesson the instructor is scheduled to teach, summarized by name, weekday(s), time, and reservation rate; sourced from D-02/D-01 data.
- **Upcoming Schedule Entry**: A concrete or recurring scheduled session for the instructor, sourced from D-01 scheduling data.
- **Change History Entry**: A field-level audit record of profile changes (timestamp, operator, field, before, after) or an initial creation record.

### Traceability Matrix (UI -> Source Requirement)

| UI Element / Behavior                                                  | Source Requirement (D-04)                                    | Inclusion                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| Two-tab list (Studio Instructor / Personal Trainer) with counts        | FR-001                                                       | In Scope                                                      |
| Search by name/nickname/romaji/ID                                      | FR-001                                                       | In Scope                                                      |
| Role/brand/status filters + active-count badge + clear-all             | FR-001                                                       | In Scope                                                      |
| Empty/filtered state with clear action                                 | FR-001                                                       | In Scope                                                      |
| Role-scoped list & detail visibility                                   | 権限マトリクス (Permission Matrix)                           | In Scope                                                      |
| Registration form (name/role required, other fields optional)          | FR-002                                                       | In Scope                                                      |
| Buffer settings selects (lead time / pre / post)                       | FR-002, FR-004                                               | In Scope                                                      |
| CRM account link picker (optional, searchable)                         | FR-002                                                       | In Scope                                                      |
| Create/edit confirmation dialog                                        | FR-002, FR-004                                               | In Scope                                                      |
| Detail page: basic info, profile, buffer settings, CRM link            | FR-003                                                       | In Scope                                                      |
| Performance summary (4 combined metrics incl. rating)                  | FR-003, FR-006                                               | In Scope                                                      |
| Assigned Lessons compact list                                          | FR-003 (noted in source as beyond-Must addition)             | In Scope (already implemented in prototype; formalized here)  |
| Upcoming Schedule (3 inline + expand sheet)                            | FR-003 (noted in source as beyond-Must addition)             | In Scope (already implemented in prototype; formalized here)  |
| Edit form with role-scoped field editability                           | FR-004                                                       | In Scope                                                      |
| Status active/inactive toggle on detail page                           | FR-005                                                       | In Scope                                                      |
| Delete blocked when schedules are assigned                             | FR-005                                                       | In Scope                                                      |
| Change History tab (field-level diff + creation entry)                 | Standard master-data audit pattern (not separately numbered) | In Scope                                                      |
| Average rating shown only inside performance summary                   | FR-006 (Should)                                              | In Scope, display-only pending rating source decision (D-Q09) |
| Independent rating card/score breakdown (★ distribution, review count) | FR-006 note                                                  | Out of Scope until D-Q09 is resolved                          |

### Out of Scope

- A standalone/independent rating card, review count, or star-distribution breakdown (deferred until the rating input source — member review vs. CRM staff evaluation — is decided per open question D-Q09).
- Assigning or displaying an instructor's home store/brand directly on the instructor master record (these are derived from D-01 schedule assignments by design, not stored here).
- Any changes to D-01 scheduling logic beyond consuming the buffer settings values defined here.
- Any changes to Y-01 staff/permission logic beyond consuming the CRM account link defined here.
- External-contractor-specific login provisioning (separate ID/password issuance) — assumed handled entirely within Y-01.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Authorized users can locate a target instructor (search/filter/switch tab) in under 30 seconds for a standard dataset.
- **SC-002**: Authorized users can complete new instructor registration from form open to confirmed submission in under 3 minutes.
- **SC-003**: 100% of instructor detail pages display buffer settings, status, and performance summary without missing sections, regardless of how sparse the underlying profile data is.
- **SC-004**: Delete attempts against instructors with one or more assigned schedules are blocked in all tested cases; zero unintended profile deletions occur in this scenario.
- **SC-005**: Role-restricted actions (registration, full-field edit, delete) are never exposed as usable to a role outside the permission matrix during testing.
- **SC-006**: Trainer users can update their own permitted profile fields (nickname, romaji name, profile text, photo, instructing history, buffer settings) without being able to alter name or role classification.

## Assumptions

- This specification covers the full D-04 Must (FR-001–FR-005) and Should (FR-006) requirement set as represented in the current UI prototype; no phased exclusion is applied.
- "Assigned Lessons" and "Upcoming Schedule" sections are explicitly called out in the source requirement document as beyond-Must additions layered onto FR-003; they are included here as first-class functional requirements (FR-012, FR-013) since they are already fully realized in the UI prototype.
- Average rating's data source (member review feature vs. CRM staff evaluation) remains unresolved per source open question D-Q09; this spec treats the metric as display-only until that decision is made.
- Instructor home store/brand assignment is intentionally excluded from the Instructor entity per the source requirement's explicit design decision (schedule-level association instead of master-record association).
- API/backend contracts for lesson linkage, schedule data, and CRM staff lookup will be derived during planning; this document remains behavior-focused.
- Role-based data scope and field editability follow the permission matrix and current UI prototype exactly where the two agree; the UI prototype is treated as source of truth for interaction details not otherwise specified in the requirement document.
