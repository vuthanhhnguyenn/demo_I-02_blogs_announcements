# Feature Specification: Y-09 Routine Master Management (ルーティン管理)

**Feature Branch**: `016-routine-management`
**Created**: 2026-07-10
**Status**: Draft
**PO Spec**: `Y-09` — ルーティン管理（マスタ）(Routine Master Management)
**Source**: `src/pages/routine-list.tsx`, `src/pages/routine-detail.tsx`, `src/pages/routine-form.tsx` (dx-fitness/fitness-crm-ui) + `crm/requirements/Y-09.md` (dx-fitness/fitness-spec)
**Input**: User description: "Create spec for screen Y-09 機能要件定義書：ルーティン管理（マスタ）. Input: Spec:Y-09.md, UI Code: pages/routine-list.tsx"

## Clarifications

### Session 2026-07-10

- Q: Should routine creation/editing use a single unified page (matching the current UI prototype), or a staged two-step wizard (save basic info first, then route into exercise-adding) as the source PO document's process description suggests? → A: Keep the single-page form exactly as implemented in the prototype — basic info, thumbnail, exercise/set composition, and publish status are all part of one form submitted together. No staged wizard.
- Q: Should the "add exercise" default-value seeding branch by exercise type (e.g., suppress the default rep count for time-only exercises, suppress the default time for rep-only exercises), or keep the current simple behavior of always seeding both a default rep count and a default time value? → A: Keep it simple — always seed both default values as the current prototype does; no per-exercise-type branching logic in Phase 1.
- Q: Should Routine Category management (create/edit/delete/reorder categories) be included in this feature's scope, or treated as a separate follow-up feature? → A: Out of scope for this feature. Categories remain a fixed 6-value list for now; category CRUD is tracked as a separate future feature.
- Q: Should the weight-initialization logic implement the full member-profile-driven coefficient table (age/gender/experience-based), or keep the simplified per-equipment-type hardcoded default already in the prototype? → A: Keep it simple — the hardcoded per-equipment-type default weight (barbell/dumbbell/machine/bodyweight/cable) is the final Phase 1 behavior; the full coefficient table is out of scope.
- Q: Should CSV export of routine data be added to this feature? → A: No, out of scope.
- Q: Should any superset configuration UI be built for Phase 1? → A: No — keep it simple; only reserve the `set_type`/`superset_group` data fields for future use. No configuration UI in Phase 1.

## User Scenarios _(mandatory)_

### User Story 1 - Browse and find HQ routines (Priority: P1)

As Headquarter (or System), I can open the Routine Management screen, search routines by name, filter by routine category and publish status, sort the table, and page through results, so I can quickly locate a specific HQ-curated routine among the full catalog.

**Why this priority**: The list is the entry point for every other routine workflow (viewing, editing, publishing, deleting). Without it, no other operation can be initiated.

**Independent Test**: Open the list page, type a partial routine name into search, expand the detail filter panel, select a category and a status, confirm the table narrows accordingly, then clear all conditions and confirm the full list returns.

**Acceptance Scenarios**:

1. **Given** the Routine Management screen is loaded, **When** the page renders, **Then** each row shows routine name (with its routine code beneath), routine category, exercise count, publish status, and last-updated date, sorted by last-updated date descending by default.
2. **Given** the list is displayed, **When** the user types a partial routine name into the search box, **Then** only routines whose name contains that text remain visible.
3. **Given** the user clicks "詳細フィルター" (Detailed Filters), **When** the panel expands, **Then** a routine-category selector and a publish-status selector are shown, both defaulting to "全て" (all); selecting a value narrows the table using AND logic across all active conditions, and the filter toggle button shows an active-condition count badge.
4. **Given** one or more filters or a search term are active, **When** the user views the results, **Then** a banner reports how many of the total routines are currently shown and summarizes the active conditions, with a one-click "条件をクリア" (Clear Conditions) action.
5. **Given** the user clicks a sortable column header (routine name, exercise count, status, or last-updated date), **When** the click is registered, **Then** the table re-sorts by that column, toggling between ascending and descending on repeated clicks, and the sort indicator icon reflects the current direction.
6. **Given** a search/filter combination matches zero routines, **When** the table renders, **Then** a distinct empty state is shown: "no routines match the current conditions" (with a clear-conditions action) when a filter/search is active, versus "no routines are registered" (no clear-conditions action) when the catalog itself is empty.
7. **Given** the routine catalog contains more rows than the selected page size, **When** the user changes the page-size selector (25/50/100/200, default 50) or clicks a pagination control, **Then** the table shows the corresponding page of results and the footer reports total count, total pages, and the visible row range.

---

### User Story 2 - View a routine's full detail (Priority: P1)

As Headquarter (or System), I can open a routine's detail page to review its basic information, thumbnail gallery, and its complete exercise/set composition, so I can verify content quality and correctness before or after it is published to members.

**Why this priority**: Detail review is the gateway to every content-quality decision (whether to edit, publish, duplicate, or delete a routine) and is needed as often as the list itself.

**Independent Test**: Open a row from the list and confirm both the "基本情報" (Basic Information) and "エクササイズ構成" (Exercise Composition) tabs render fully, including sets and HQ comments, without needing to enter edit mode.

**Acceptance Scenarios**:

1. **Given** the user opens a routine's detail page, **When** the "基本情報" tab renders, **Then** it shows the routine name, description, routine category, exercise count, publish status, last-updated date, and the name of the user who last updated it, alongside a thumbnail gallery (previous/next navigation and thumbnail strip when more than one image exists).
2. **Given** the user switches to the "エクササイズ構成" tab, **When** the tab renders, **Then** it shows a running total ("合計 N種目 / Nセット") followed by one card per exercise in its configured order, each showing its position number, its name as a link to that exercise's Y-08 detail page, its target-body-area badge, a set table (set number, reps, recommended weight, time, distance, RPE), and an optional HQ comment.
3. **Given** the detail page is open, **When** the user views the page header, **Then** it shows the routine's current publish-status badge and, gated to Headquarter/System, "複製" (Duplicate), "編集" (Edit), and a delete action.
4. **Given** the routine currently has status "公開" (Published), **When** the user attempts to delete it from the detail page, **Then** a dialog explains that a published routine cannot be deleted and offers a shortcut into the edit screen to unpublish it first, instead of allowing the delete to proceed.

---

### User Story 3 - Register a new HQ routine (Priority: P2)

As Headquarter (or System), I can register a new routine — name, category, description, thumbnail images, and its full exercise/set composition — and save it so it becomes available for editing and, once ready, publishing to members.

**Why this priority**: Creating new HQ content is the core purpose of this master screen, but it depends on the list and detail views already existing as the surrounding context.

**Independent Test**: From the list, click "新規登録," fill in the required fields and at least one exercise with a set, submit, and confirm the new routine appears in the list with status "非公開" (Unpublished).

**Acceptance Scenarios**:

1. **Given** the registration form is open, **When** the user leaves routine name or routine category blank and submits, **Then** an inline error is shown next to each missing required field, a summary message indicates unfilled required items, and the view scrolls to the first invalid field.
2. **Given** the user fills in routine name and category (description and thumbnail images are optional), **When** the form is submitted successfully, **Then** the routine is created with a system-assigned, non-editable routine code, its publish status defaults to "非公開" (Unpublished), and the user is returned to the routine list with a success confirmation.
3. **Given** the user is adding exercises, **When** they search and select an exercise, **Then** only currently-published Y-08 exercises are offered as candidates, and a default set (reps: 10, recommended weight: the selected exercise's equipment-based minimum weight, time: 90 seconds, RPE: 0) is created automatically for it.
4. **Given** an exercise has been added, **When** the user clicks "セットを追加" (Add Set), **Then** a new auto-numbered set is appended with the same default-value rules as initial exercise addition; clicking the copy icon on an existing set instead inserts a duplicate of that set's values directly after it; removing a set re-numbers the remaining sets.
5. **Given** two or more exercises have been added, **When** the user clicks the up/down move controls on an exercise, **Then** its position swaps with the adjacent exercise and the numbered order updates accordingly; removing an exercise takes it out of this routine's composition only (the underlying Y-08 exercise record is unaffected).
6. **Given** a set's Rep-count or recommended-weight field contains a negative or non-numeric value, **When** the user submits the form, **Then** submission is blocked with a validation message describing that these two fields must be zero or greater; other set fields (time, distance, RPE) may be left blank when not applicable to that exercise.
7. **Given** the user has entered data anywhere on the form, **When** they click "キャンセル" (Cancel) or the back link before saving, **Then** a discard-confirmation dialog appears, and only an explicit confirmation discards the unsaved changes and navigates away.
8. **Given** the "新規登録" action is rendered, **When** the current user's role is anything other than Headquarter or System, **Then** the action is not available to them.
9. **Given** the user enters a routine name longer than 200 characters (the input does not truncate it), **When** the user submits the form, **Then** submission is blocked, the routine-name field is highlighted with 「ルーティン名は200文字以内で入力してください」, and no request is sent (Bug No.5).

---

### User Story 4 - Edit an existing routine, including publish control (Priority: P2)

As Headquarter (or System), I can edit a routine's basic information, thumbnail images, and exercise/set composition, and toggle whether it is published to members, subject to a minimum-content safeguard.

**Why this priority**: Keeping HQ routine content accurate and controlling exactly when it reaches members is essential ongoing maintenance, ranked just after initial creation.

**Independent Test**: Open edit from the list or detail page, change a field and the exercise composition, save, and confirm the changes are reflected; separately, attempt to publish a routine with zero exercises and confirm it is blocked.

**Acceptance Scenarios**:

1. **Given** an authorized user opens the edit form for an existing routine, **When** the form loads, **Then** it is pre-filled with the routine's current name, description, category, thumbnail images, exercise/set composition, and publish-status toggle, using the same field set and validation rules as registration.
2. **Given** the edit form is submitted with valid data, **When** the save completes, **Then** the routine's last-updated date and updater are recorded, and the user returns to the routine list with a success confirmation.
3. **Given** a routine currently has zero exercises registered, **When** the user (from the list row's action menu, or the edit form's publish switch) attempts to change its status from "非公開" to "公開," **Then** the action is blocked and an explanatory message states that at least one exercise must be registered first.
4. **Given** a routine currently has one or more exercises, **When** an authorized user switches it from "非公開" to "公開" (or the reverse), **Then** the status changes immediately, and switching from "公開" back to "非公開" does not affect any copies members have already made into their personal routines.
5. **Given** the "編集" action or the publish/unpublish toggle is rendered, **When** the current user's role is anything other than Headquarter or System, **Then** the action is not available to them.

---

### User Story 5 - Duplicate a routine (Priority: P3)

As Headquarter (or System), I can duplicate an existing routine to use it as a starting point for a new variant, without re-entering its exercises and sets from scratch.

**Why this priority**: Saves authoring time on top of the core create/edit flows, but the screen is fully usable without it.

**Independent Test**: From the list row's action menu, choose "複製" and confirm a copy is created with a modified name, unpublished status, and identical exercise/set data, landing on that copy's edit screen.

**Acceptance Scenarios**:

1. **Given** the user selects "複製" (Duplicate) on any routine, **When** the duplication completes, **Then** a new routine is created with all basic information, thumbnail images, and the full exercise/set composition copied from the source, its name set to "（元のルーティン名）のコピー," and its publish status forced to "非公開" (Unpublished) regardless of the source routine's status.
2. **Given** duplication has completed, **When** the confirmation is shown, **Then** the user is taken directly into the new copy's edit screen to begin customizing it.
3. **Given** the "複製" action is rendered, **When** the current user's role is anything other than Headquarter or System, **Then** the action is not available to them.

---

### User Story 6 - Delete a routine (Priority: P3)

As Headquarter (or System), I can permanently remove a routine that is no longer needed, as long as it is not currently published.

**Why this priority**: A necessary cleanup capability, but lower-frequency than create/edit/publish operations, and it is intentionally guarded to avoid disrupting members mid-use.

**Independent Test**: Attempt to delete a published routine and confirm it is blocked with guidance to unpublish first; then unpublish it and confirm delete now succeeds after a confirmation dialog.

**Acceptance Scenarios**:

1. **Given** a routine's status is "公開" (Published), **When** the user attempts to delete it (from the list row menu or the detail page), **Then** the delete action is disabled/blocked, with an explanation that it must be switched to "非公開" first.
2. **Given** a routine's status is "非公開" (Unpublished), **When** the user selects delete, **Then** a confirmation dialog warns that the action cannot be undone; confirming removes the routine from the active catalog and it is no longer delivered to the mobile app.
3. **Given** the delete action is rendered, **When** the current user's role is anything other than Headquarter or System, **Then** the action is not available to them.

### Edge Cases

- A search/filter combination matches zero routines: the system distinguishes a filtered zero-result state (with a clear-conditions action) from a genuinely empty catalog (no clear-conditions action), per this system's standard empty-state pattern (see also FR-018 in feature 015 for the established convention).
- A routine has zero exercises: it still appears normally in the list ("0種目") but is blocked from being switched to "公開."
- A user attempts to add a non-published or removed Y-08 exercise to a routine: it must not appear as a selectable candidate.
- A user attempts to delete a published routine: blocked every time, not merely warned, and guided toward unpublishing first.
- Duplicating a published routine still produces an unpublished copy, never inheriting the source's "公開" status.
- The user navigates away from an in-progress create/edit form with unsaved changes: a discard-confirmation dialog intercepts the navigation both from the back link and the Cancel button.
- An exercise within a routine has no HQ comment, or a routine has zero thumbnail images: the UI renders a sensible empty/placeholder state rather than a broken layout.
- A set's time-only exercise (e.g., a plank) is left with blank reps/weight: this is valid, since not all fields apply to every exercise type.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001 (List Rendering)**: System MUST display a table of HQ routines showing routine name, routine code, routine category, exercise count, publish status, and last-updated date, sorted by last-updated date descending by default.
- **FR-002 (Search)**: System MUST support a free-text search that matches on partial routine name.
- **FR-003 (Filters)**: System MUST support filtering by routine category (single-select) and publish status (single-select, 公開/非公開), combined with AND logic and with the search term; MUST show an active-condition count and a one-click action to clear all conditions and the search term together.
- **FR-004 (Sorting & Pagination)**: System MUST allow sorting by routine name, exercise count, publish status, and last-updated date (toggling ascending/descending), and MUST paginate the list with a selectable page size (25/50/100/200, default 50), reporting total count, total pages, and the visible row range.
- **FR-005 (List/Filtered Empty States)**: System MUST show a distinct empty state when no routines match active search/filter conditions (with a clear-conditions action) versus when the catalog itself has zero routines (no clear-conditions action).
- **FR-006 (Create Routine)**: System MUST provide a registration form requiring routine name (max 200 characters — Y-09 defines no limit, so the admin API's `AdminCreate/UpdateRoutineDto.name maxLength 200` applies; an over-length name MUST NOT be truncated by the input but MUST be rejected client-side with an inline error on the name field) and routine category, with description and up to 5 thumbnail images as optional; MUST auto-assign a non-editable routine code; MUST default the new routine's publish status to "非公開" (Unpublished).
- **FR-007 (Edit Routine)**: System MUST allow editing an existing routine's name, description, category, thumbnail images, and exercise/set composition using the same validation rules as creation, and MUST record the last-updated date and updater on save.
- **FR-008 (Detail View)**: System MUST provide a detail page with a "基本情報" tab (name, description, category, exercise count, status, last-updated date, updater, thumbnail gallery) and an "エクササイズ構成" tab (ordered exercise cards with name linking to the Y-08 exercise detail page, target-body-area badge, per-set table of reps/recommended weight/time/distance/RPE, optional HQ comment, and a running "合計 N種目 / Nセット" total).
- **FR-009 (Logical Delete with Publish Guard)**: System MUST require a confirmation before deleting a routine, and MUST block deletion outright — not merely warn — whenever the routine's status is "公開," directing the user to unpublish it first; a logically-deleted routine MUST no longer be delivered to the mobile app.
- **FR-010 (Publish/Unpublish Control)**: System MUST allow toggling a routine's status between "公開" and "非公開" from both the list row's action menu and the edit form; switching to "公開" MUST be blocked with an explanatory message whenever the routine has zero exercises; switching to "非公開" MUST always be allowed and MUST NOT retroactively affect routines members have already copied into their personal collection.
- **FR-011 (Exercise Composition Management)**: System MUST allow adding an exercise to a routine by searching/selecting from currently-published Y-08 exercises only, reordering exercises via up/down controls, and removing an exercise from the routine (without deleting the underlying Y-08 exercise record); MUST allow an optional free-text HQ comment per exercise.
- **FR-012 (Set Definition Management)**: System MUST allow adding a set (auto-numbered) to an exercise with default values (reps: 10, recommended weight: the exercise's equipment-based minimum weight, time: 90 seconds, RPE: 0 — Phase 1 minimum weights are system constants keyed by the exercise's Y-08 器具種別: バーベル 20 kg / ダンベル 5 kg / マシン 10 kg / ケーブル 10 kg / 自重 0 kg; any other type leaves 重量 blank (Y-09 261020_v3); re-selecting the exercise re-seeds only blank or still-seeded weights — a weight the user entered is kept, even when it equals the previous exercise's minimum), duplicating an existing set's values into a new set positioned immediately after it, and removing a set (with remaining sets re-numbered); recommended reps and recommended weight MUST be validated as zero or greater when provided, while time, distance, and RPE remain optional per exercise type.
- **FR-013 (Thumbnail Management)**: System MUST allow uploading up to 5 thumbnail images per routine, previewing and removing already-uploaded images, and treating the first image as the primary thumbnail shown in the mobile app's routine list/detail.
- **FR-014 (Duplicate)**: System MUST allow duplicating a routine's basic information and complete exercise/set composition into a new routine named "（元のルーティン名）のコピー," always created with "非公開" status regardless of the source's status, and MUST take the user directly to the new copy's edit screen.
- **FR-015 (Unsaved-Changes Guard)**: System MUST prompt a discard-confirmation dialog when the user attempts to leave a create/edit form with unsaved changes, whether via the back link or the Cancel action, and MUST only discard changes on explicit confirmation.
- **FR-016 (Required-Field Validation & Guidance)**: System MUST validate required fields (routine name, routine category) before allowing a create/edit submission, showing an inline error per missing field, a general "required fields are missing" indicator, and scrolling the view to the first invalid field.
- **FR-017 (Role-Gated Actions)**: System MUST restrict all write operations on this screen — create, edit, delete, duplicate, and publish/unpublish — to the Headquarter and System roles; all other roles (Manager, Staff, Trainer, Observer) MUST have no access to perform these actions.
- **FR-018 (Screen-Level Access Control)**: System MUST gate access to this screen itself behind a view permission enforced at the routing level — consistent with how every other private screen in this system is protected — limited to Headquarter and System; members interact with HQ routines only through the mobile app, never through direct CRM access.

### Key Entities

- **Routine**: An HQ-curated training program. Attributes: routine code (system-assigned, immutable), name, description, routine category, thumbnail images (0–5, ordered, first is primary), publish status (公開/非公開), exercise count (derived), last-updated date, and last-updated-by user.
- **Routine Category**: One of six fixed classifications (ビギナー向け, シェイプアップ, ダイエット, 運動不足解消, 筋肥大, 筋力アップ) used to classify and filter routines. Its own management lifecycle (create/edit/reorder categories) is out of scope for this spec — see Out of Scope.
- **Routine Exercise**: A single exercise's placement within a routine — a reference to a published Y-08 exercise, its position/order within the routine, and an optional HQ comment (notes/form pointers). Removing it from a routine does not affect the underlying Y-08 exercise record.
- **Set**: A single defined unit of work within a Routine Exercise — set number (auto-numbered, re-numbered on deletion), set type (fixed to "normal" in this phase; superset support is reserved for a later phase), recommended reps, recommended weight (kg), time (seconds), distance (meters), and RPE.

### Traceability Matrix (UI → Source Requirement)

| UI Element / Behavior                                                        | Source Requirement (Y-09)       | Inclusion                                             |
| ---------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| List: name/category/exercise count/status/last-updated columns, default sort | FR-001                          | In Scope                                              |
| Search by name + category/status filters, active-count badge, clear-all      | FR-002                          | In Scope                                              |
| Sortable columns (name, exercise count, status, last-updated)                | FR-001 (UI addition)            | In Scope                                              |
| Pagination with selectable page size                                         | FR-001 (UI addition)            | In Scope                                              |
| Registration form (name/category required, description/thumbnail optional)   | FR-003                          | In Scope                                              |
| Auto-assigned, non-editable routine code                                     | FR-003                          | In Scope                                              |
| Detail page tabs: 基本情報 / エクササイズ構成                                | FR-004                          | In Scope                                              |
| Exercise name links to Y-08 exercise detail; target-area badge               | UI設計方針 supplement           | In Scope                                              |
| Edit form (same fields/validation as create)                                 | FR-005                          | In Scope                                              |
| Logical delete blocked while published                                       | FR-006                          | In Scope                                              |
| Publish/unpublish toggle with zero-exercise guard                            | FR-007                          | In Scope                                              |
| Add/reorder/remove exercise; published-only exercise picker                  | FR-008                          | In Scope                                              |
| Add/copy/remove set; reps & weight ≥ 0 validation                            | FR-009                          | In Scope                                              |
| Routine category management screen (create/edit/delete categories)           | FR-010 (Should)                 | Out of Scope (no CRUD UI provided; see Out of Scope)  |
| Thumbnail upload up to 5 images, primary-first                               | FR-011                          | In Scope                                              |
| Duplicate routine (name suffix, forced 非公開, jump to edit)                 | FR-012                          | In Scope                                              |
| Per-equipment-type default set weight (hardcoded lookup)                     | FR-013 (Could, partial)         | In Scope (simplified default only — see Out of Scope) |
| Member-profile-driven weight coefficient table (age/gender/experience)       | FR-013 (Could)                  | Out of Scope                                          |
| Superset set-type configuration UI                                           | FR-014 (Could, Phase 2)         | Out of Scope (data field reserved, no UI this phase)  |
| CSV export of routine data                                                   | FR-015 (Could)                  | Out of Scope (no export control in provided UI)       |
| Discard-confirmation dialog on unsaved navigation                            | Standard master-data UX pattern | In Scope                                              |

### Out of Scope

- Routine Category CRUD (create/edit/delete/reorder categories, banner icon upload) — FR-010 is a "Should" in the source spec and no such management UI exists in the provided prototype files; categories are treated here as a fixed 6-value enum. Confirmed out of scope per clarification; tracked as a separate future feature if/when category management is needed.
- The full member-profile-driven weight-initialization coefficient table (age/gender/experience-based recommended-weight calculation) — FR-013 is a "Could." Confirmed out of scope per clarification; the simpler hardcoded per-equipment-type default weight (used to seed a new set's recommended weight) is the final Phase 1 behavior.
- Superset set-type configuration (grouping multiple exercises into a single superset) — explicitly Phase 2 in the source spec (FR-014). Confirmed out of scope per clarification; only the `set_type`/`superset_group` data fields should be reserved for future use, with no configuration UI in Phase 1.
- CSV export of routine data (FR-015, "Could") — confirmed out of scope per clarification; no export control exists in the provided list/detail/form prototype files.
- Any change to Y-08 Exercise Management beyond consuming its published-exercise list as a read-only source for the exercise picker.
- Mobile app behavior (how members browse, copy, or customize HQ routines) — this spec covers only the CRM-side master management screens; the mobile experience is a separate, already-scoped concern per the Y-09 source document.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authorized user can locate a specific routine via search/filter/sort in under 20 seconds for a standard-sized catalog.
- **SC-002**: An authorized user can register a new routine — basic information, thumbnail, and a multi-exercise/multi-set composition — from form open to confirmed save in a single continuous session, without data loss between sections.
- **SC-003**: 100% of attempts to publish a routine with zero registered exercises are blocked with a clear on-screen explanation; 100% of attempts to delete a published routine are blocked with guidance to unpublish first.
- **SC-004**: Duplicating an existing routine to start a new variant requires a single action and preserves 100% of the source's exercise/set data, always landing the user in the new copy's edit screen with "非公開" status.
- **SC-005**: Write actions (create, edit, delete, duplicate, publish/unpublish) are never exposed as usable to a role outside Headquarter/System during testing, matching the permission matrix 100% of the time.
- **SC-006**: Members never see a newly created or currently-unpublished routine in the mobile app; only routines explicitly marked "公開" become visible to them.

## Assumptions

- This specification covers the Y-09 Must requirement set (FR-001–FR-009) plus the Should items that are actually realized in the provided UI prototype (routine category _filtering_, thumbnail upload, duplication); Should/Could items with no corresponding UI (category CRUD, full weight-coefficient table, CSV export, superset configuration) are explicitly out of scope — see Out of Scope.
- Per clarification, this feature keeps the single unified create/edit form exactly as implemented in the prototype (basic info, thumbnail, exercise/set composition, and publish status submitted together in one step) — not the staged two-step flow the source PO document's process description describes.
- Per clarification, default-value seeding for a newly added exercise does not branch by exercise type: both a default rep count (10) and a default time (90s) are always seeded together, and whichever field doesn't apply to a given exercise is simply left blank/cleared by the user. This is the final Phase 1 behavior, not an open item.
- "Phase 1" scope, per the source document's constraints section, limits set type to "normal" only; the superset data structure (`set_type`/`superset_group`) is reserved but not user-configurable yet, per clarification.
- Role/permission enforcement follows the Y-09 permission matrix exactly: only Headquarter and System may view, search, create, edit, delete, or change publish status; all other roles have zero access to this screen, consistent with this system's existing per-screen route-level gating convention (see feature 015, FR-017, for the established pattern).
- API/backend contracts for the Y-08 exercise picker, exercise/set persistence, and thumbnail storage will be derived during planning; this document remains behavior-focused.
