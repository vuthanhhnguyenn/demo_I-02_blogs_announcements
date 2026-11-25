# Feature Specification: FR-001 Lesson Content Master List & Search (D-02 Lesson Content Management)

**Feature Branch**: `007-lesson-content-list`  
**Created**: 2026-06-24  
**Status**: Draft  
**PO Spec**: `D-02` — Lesson Content Management  
**Source**: `dx-fitness/fitness-spec: crm/requirements/D-02.md` + `dx-fitness/fitness-crm-ui: src/pages/lesson.tsx`  
**Input**: User description: "FR-001: レッスン内容マスタの一覧表示・検索-D-02 レッスン内容管理 (lessons Page)"

## Clarifications

### Session 2026-06-25

- Q: D-02 FR-001 defines 2 tabs (Studio, Personal) but the UI shows 3 (adds Body care). Which tab set is in Phase 1 scope? → A: Implement all three tabs (Studio, Personal, Body care).
- Q: Should the search input perform active text filtering or remain a visual-only control? → A: Active text search behavior — filter rows by lesson/plan name and ID (partial match).
- Q: Should the column-header sort controls perform actual sorting? → A: Include actual sorting behavior.
- Q: Should the detailed filters (category/brand/status/lesson category) actually filter the table beyond the "include deleted" toggle? → A: Include actual filtering behavior.
- Q: Are explicit loading/error states required in Phase 1? → A: Implement loading and error states using existing project components, with a skeleton for the loading state.

### Session 2026-10-08

- Q: The API-111 gap ruling of 2026-08-26 removes the 区分 / カテゴリ axis (content category, PT プラン区分) and the "include deleted" toggle, and API-111 v0.5 dropped `includeDeleted` (soft-deleted masters are never listed). Keep those controls disabled, or remove them? → A: Remove them per the ruling. The list filters by brand, pricing type and status only; inactive (無効) masters stay listed, and soft-deleted masters are never listed.
- Q: Which brand values does the brand filter offer — the prototype's 2 or the API's 5? → A: The 5 API brands: Joyfit / Joyfit24 / JoyfitYoga / JoyfitPlus / Fit365 (same set as the form, spec 009).
- Q: Does the search match the name or the ID? → A: Name only (lesson / plan name, partial match). IDs are UUIDs, and the API's `q` matches the name.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View lesson master list by tab (Priority: P1)

As a user opening Lesson Content Management, I can view lesson master records in tabbed lists and access each record's detail page.

**Why this priority**: Listing and navigation are the core of FR-001 and are required before any search/filter/sort operation has value.

**Independent Test**: Open the page, switch tabs, confirm list rows are visible, and click a row to navigate to lesson detail.

**Acceptance Scenarios**:

1. **Given** the page is opened, **When** the default tab is shown, **Then** a table of studio lesson records is displayed.
2. **Given** a list row is visible, **When** the row is clicked, **Then** the user is navigated to the lesson detail screen.
3. **Given** the user changes tabs, **When** a different tab is selected, **Then** the corresponding table content is shown.

---

### User Story 2 - Search, sort, and filter the list (Priority: P1)

As a user, I can search by text, sort columns, and apply filters in the toolbar to actively narrow and reorder list rows, and reset selections.

**Why this priority**: FR-001 explicitly includes search, and FR-S001 defines active filter/sort behavior for list usability.

**Independent Test**: Type a query to filter rows, click a column header to sort, expand detailed filters and change select values, and clear all filter controls.

**Acceptance Scenarios**:

1. **Given** the list toolbar is visible, **When** text is entered in the search input, **Then** table rows are filtered to those matching the lesson/plan name (partial match).
2. **Given** the list is displayed, **When** a column header sort control is clicked, **Then** the rows are reordered by that column (ascending/descending toggle).
3. **Given** the list toolbar is visible, **When** "Detailed Filter" is clicked, **Then** filter controls are expanded/collapsed.
4. **Given** detailed filters are expanded, **When** a brand / pricing type / status filter value is selected, **Then** the table rows are narrowed to records matching the selected value(s).
5. **Given** the list is first displayed, **Then** the status filter is 有効 and only active records are listed (API-111 D-13; CRM UT D-02 No2). Choosing 全ステータス lists both active and inactive (無効) records; soft-deleted records never are.
6. **Given** one or more filters are set, **When** "Clear all" is clicked, **Then** all filter controls return to default values (status back to 有効) and the list shows the active records again.

---

### User Story 3 - Start creating a new lesson master (Priority: P2)

As a headquarter operator, I can use the page action button to move from list view to the lesson creation screen.

**Why this priority**: FR-001 requires a visible "new registration" entry point from the list screen.

**Independent Test**: Click "New Lesson Creation" and verify navigation to lesson form.

**Acceptance Scenarios**:

1. **Given** the page header is visible, **When** "New Lesson Creation" is clicked, **Then** the user is navigated to the lesson form screen.

---

### Edge Cases

- Empty table state when no row is available for the selected tab/data scope (renders a dedicated empty-state component, e.g. icon + message; PO-confirmed 2026-07-27, supersedes the earlier "no dedicated empty-state" wording).
- Every master of the selected tab / brand scope is soft-deleted, resulting in zero displayed rows.
- Tab count badges and total count value differ from currently rendered rows because some counts are static placeholders in UI.

## Requirements _(mandatory)_

### Component Hierarchy & Layout Structure

- App shell: shared sidebar + shared header + page header + main content region.
- Page header includes title, total count, and primary action button ("New Lesson Creation").
- Main content uses line-style tabs and tab panels:
  - `studio` tab -> `LessonTable` with scoped lesson data.
  - `personal` tab -> `PersonalTrainingTable` with personal plan data.
  - `bodycare` tab -> `LessonTable` with body care lesson data.
- Table-area composition (both list tables):
  - Toolbar row: search input + detailed-filter toggle.
  - Expandable detailed-filter area: select inputs (brand, pricing type, status) and "Clear all".
  - Data table with sortable-looking column headers (button + tooltip UI).
  - Footer pagination area with prev/next buttons and page number buttons.

### Functional Requirements

- **FR-001-P1-01 (Mapped: D-02 FR-001)**: System MUST render a lesson master list page with tab-separated list views and row-based detail navigation.
- **FR-001-P1-02 (Mapped: D-02 FR-001)**: System MUST show list columns from UI code: ID, lesson/plan name, brand (studio/body care), duration, pricing type (studio/body care), status (studio/body care), gender restriction (studio/body care), and price (personal tab). There is no category / plan-category column (clarified 2026-10-08).
- **FR-001-P1-03 (Mapped: D-02 FR-001, FR-S001)**: System MUST provide a toolbar with a search input and expandable detailed filters.
- **FR-001-P1-04 (Mapped: D-02 FR-005 v5 + API-111 v0.5, clarified 2026-10-08)**: System MUST NOT provide an "Include deleted" toggle. Soft-deleted masters are never listed; inactive (無効) masters are listed and can be narrowed with the status filter.
- **FR-001-P1-05 (Mapped: D-02 FR-S001)**: System MUST provide a "Clear all" action that resets filter controls to default values.
- **FR-001-P1-06 (Mapped: D-02 FR-001)**: System MUST show a "New Lesson Creation" action in the page header that navigates to lesson form.
- **FR-001-P1-07 (Mapped: D-02 permissions section)**: System MUST scope visible studio/body care lesson rows to accessible stores and current store selection from user context.
- **FR-001-P1-08 (UI-state requirement from code)**: System MUST support default, filter-expanded, tab-switched, and zero-row rendering states.
- **FR-001-P1-09 (UI state visibility)**: System MUST display pagination controls for each list.
- **FR-001-P1-10 (Mapped: D-02 FR-001 tab split + UI)**: System MUST provide all three tabs in Phase 1 — Studio lesson, Personal training, and Body care — each rendering its corresponding list.
- **FR-001-P1-11 (Mapped: D-02 FR-001 search, clarified 2026-10-08)**: System MUST actively filter list rows by the search input, matching the lesson/plan name using partial match (the ID is not searched).
- **FR-001-P1-12 (Mapped: D-02 FR-S001 sort)**: System MUST apply actual sorting when a column-header sort control is activated, toggling ascending/descending order on the selected column.
- **FR-001-P1-13 (Mapped: D-02 FR-S001 filter, clarified 2026-10-08)**: System MUST actively filter list rows by the detailed-filter selections: brand (Joyfit / Joyfit24 / JoyfitYoga / JoyfitPlus / Fit365), pricing type (会費内 / 有料（月払）/ 都度有料) and status. There is no lesson-category / category axis.
- **FR-001-P1-14 (Clarified 2026-06-25)**: System MUST display a loading state using the project's existing skeleton component while list data is loading.
- **FR-001-P1-15 (Clarified 2026-06-25)**: System MUST display an error state using the project's existing error component when list data fails to load.

### UI Interaction Scenarios (Code-Grounded)

- Click tab triggers -> switch tab content panel (Studio / Personal / Body care).
- Type in search input -> filter visible rows by name (partial match).
- Click detail-filter button -> expand/collapse detailed filter controls.
- Change select controls -> apply the selected filter values to the table rows.
- Click column-header sort control -> reorder rows by that column (toggle ascending/descending).
- Click "Clear all" -> reset filter states to defaults (status 有効) and show the active records again.
- Click table row -> navigate to lesson detail.
- Click "New Lesson Creation" -> navigate to lesson form.

### UI States (Loading / Empty / Data / Error)

- **Loading**: Required. Display a skeleton loading state using the project's existing skeleton component while list data loads. (The `lesson.tsx` prototype has no loading state; it must be added.)
- **Empty**: Shown by zero rendered table rows and the count text.
- **Data-rendered**: List rows mapped from fetched data per active tab.
- **Error**: Required. Display an error state using the project's existing error component when list data fails to load. (The `lesson.tsx` prototype has no error branch; it must be added.)

### Traceability Matrix (UI Element -> Source Requirement)

| UI Element / Behavior in `lesson.tsx`                | Requirement Mapping in `D-02.md`          | Notes                                                           |
| ---------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| Page title "レッスン内容管理"                        | D-02 screen name / FR-001 context         | Direct alignment                                                |
| Tabs: Studio / Personal / Body care                  | FR-001 says Studio + Personal split       | All three tabs in Phase 1 scope (Body care included, clarified) |
| List table rendering per tab                         | FR-001 list display                       | Direct alignment                                                |
| Search input in toolbar                              | FR-001 search condition                   | Active text search by name required (clarified 2026-10-08)      |
| Detailed filter controls (brand/pricing type/status) | FR-001 + FR-S001 filter axes              | Active filtering required; no category axis (clarified)         |
| "Include deleted" checkbox                           | FR-005 v5 (deleted-state display removed) | Removed (clarified 2026-10-08)                                  |
| Sort-looking column header buttons with tooltips     | FR-S001 sorting                           | Actual ascending/descending sorting required (clarified)        |
| New lesson creation button                           | FR-001 "new registration button shown"    | Direct alignment via navigation to form                         |
| Row click to detail screen                           | FR-003 detail display entry from list     | Direct alignment                                                |
| Role/store data scope from user context              | D-02 permission and data scope section    | Partial alignment (store-based scoping in UI)                   |

### Out of Scope for Phase 1

The following are explicitly excluded from this specification because this request is restricted to Phase 1 list/search scope:

- FR-002 New lesson registration form fields and confirmation flow.
- FR-003 Full detail screen content definition.
- FR-004 Edit flow and validation.
- FR-005 Deletion/inactivation business flow beyond list visibility toggle.
- FR-006 Duplication flow.
- FR-007 Change history display.
- FR-S002 Preview display.
- FR-S003 Multiple instructor display behavior.
- Any future/placeholder behavior marked in UI code comments as reserved for future use (`PERSONAL_LESSONS`, `void scopedPersonals`).

### Key Entities _(include if feature involves data)_

- **LessonItem**: List row data for studio/body care tabs with attributes used in UI (id, name, brand, duration, pricingType, status, genderRestriction).
- **PersonalPlan**: List row data for personal training tab with attributes used in UI (id, name, duration, price, brand, status).
- **ListFilterState**: Client-side state for filter controls (brand, pricing type, status).
- **UserScope**: Accessible stores and currently selected store used to limit visible list records.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can open the lesson content page and view at least one tabbed list state without errors.
- **SC-002**: Users can switch among available tabs and each tab renders its corresponding table content.
- **SC-003**: Users can expand/collapse detailed filters and reset filter controls in one action.
- **SC-004**: Users can narrow the studio/body care list to active or inactive records with the status filter; soft-deleted records never appear.
- **SC-005**: Users can navigate from list row to detail and from header action to creation form.
- **SC-006**: Users can type in the search input and see the list narrow to rows matching the name.
- **SC-007**: Users can click a column header and see the rows reorder by that column, toggling ascending/descending.
- **SC-008**: Users can select detailed-filter values and see the list narrow to matching records.
- **SC-009**: Users see a skeleton loading state while data loads and an error state when data fails to load.

## Assumptions

- This specification describes the list/search page behavior, using `src/pages/lesson.tsx` as the authoritative UI source for visible components and layout.
- Phase 1 scope does not include implementing non-list FRs even if referenced in `D-02.md`.
- Phase 1 requires functional search, sorting, and filtering behavior (clarified 2026-06-25), beyond the visual-only state present in the prototype.
- All three tabs (Studio, Personal, Body care) are in Phase 1 scope (clarified 2026-06-25).
- Loading and error states are implemented with the project's existing components (skeleton for loading), even though they are absent from the prototype (clarified 2026-06-25).
