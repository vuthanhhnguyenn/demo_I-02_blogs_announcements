# Feature Specification: Article Category Master List (Notice & Blog Management)

**Feature Branch**: `013-article-category-master`
**Created**: 2026-07-08
**Status**: Draft
**PO Spec**: `I-02` — 告知・ブログ管理 (Notice & Blog Management), FR-009: 記事カテゴリーのマスタ管理 (Article Category Master Management)
**Source**: `dx-fitness/fitness-crm-ui` @ `fe37453` (`src/pages/article-category-list.tsx`) + `dx-fitness/fitness-spec` @ `e3d9de9` (`crm/requirements/I-02.md`)
**Input**: User description: "Create spec for the I-02 告知・ブログ管理 - FR-009: 記事カテゴリーのマスタ管理. Spec: requirements/I-02.md (Scope: FR-009). Design: pages/article-category-list.tsx. Scope: The content of this scope is only for the category list screen (category add/edit form is not included)"

## User Scenarios _(mandatory)_

### User Story 1 - Browse and search the category master (Priority: P1)

A Headquarter user, Manager, Staff member, or Observer opens the article category master screen from the Notice & Blog management area to see how notice and blog content is organized, and searches or filters the list to find a specific category.

**Why this priority**: Without a way to see and locate existing categories, no other category-related workflow (assigning a category to an article, understanding article distribution, or later creating/editing categories) is possible. This is the minimum viable slice.

**Verification**: Navigate to the category master screen from the Notice & Blog list, confirm all registered categories are displayed, then type a partial category name into the search box and confirm only matching categories remain.

**Acceptance Scenarios**:

1. **Given** categories exist in the system, **When** the user opens the category master screen, **Then** the full list of categories is displayed with ID, category name, description, type (Notice/Blog), brand scope, display order, linked article count, and publish status.
2. **Given** the category list is displayed, **When** the user enters a search term matching part of a category name or description, **Then** only categories whose name or description contains that term remain visible.
3. **Given** the category list is displayed, **When** the user filters by type (Notice/Blog), brand, or publish status, **Then** only categories matching all selected filters remain visible, and the number of active filters is shown.
4. **Given** one or more filters or a search term are active, **When** the user selects "clear filters," **Then** search text and all filters reset and the full category list reappears.
5. **Given** no categories match the current search/filter combination, **When** the results render, **Then** a "no matching categories" empty state is shown with an option to clear the filters.
6. **Given** no categories have ever been registered, **When** the user opens the screen, **Then** a "no categories yet" empty state is shown (without a "clear filters" option).

---

### User Story 2 - Sort and page through the category master (Priority: P2)

A user reviewing a large category master (e.g. many Blog categories across brands) reorders the list by name, display order, or article count, and pages through results in manageable chunks.

**Why this priority**: Once search/filter (P1) works, ordering and pagination make the list usable at scale rather than only for small datasets; this is an enhancement to browsing, not a separate capability.

**Verification**: Click a sortable column header and confirm the list reorders ascending, click again and confirm it reverses to descending; change the page size and confirm the displayed row count and page count update accordingly.

**Acceptance Scenarios**:

1. **Given** the category list is displayed, **When** the user clicks the "category name," "display order," or "article count" column header, **Then** the list sorts ascending by that column, and clicking the same header again reverses the sort to descending.
2. **Given** more categories exist than the current page size, **When** the user changes the page size (25/50/100/200) or navigates between pages, **Then** the visible rows and the "showing X–Y of N" summary update accordingly.

---

### User Story 3 - View management actions gated by role (Priority: P3)

A Headquarter user sees and can initiate "add new category," "edit," and "delete" actions from the category master screen; a Manager, Staff, or Observer viewing the same screen sees that these actions are restricted to Headquarter.

**Why this priority**: This governs entry points into category maintenance and communicates the permission boundary, but the maintenance workflows themselves (the add/edit form) are out of scope for this feature — only how the list screen exposes or restricts access to them matters here.

**Verification**: Open the screen as a Headquarter-role user and confirm "new category," row-level "edit," and "delete" actions are enabled; open the same screen as a Manager/Staff/Observer-role user and confirm those same actions are visibly disabled with an explanation.

**Acceptance Scenarios**:

1. **Given** the user has the Headquarter (or System) role, **When** they view the category master screen, **Then** the "new category" action and each row's "edit" and "delete" actions are enabled and initiate the corresponding action.
2. **Given** the user does not have the Headquarter or System role, **When** they view the category master screen, **Then** the "new category," "edit," and "delete" actions are visibly present but disabled, with an explanation that only Headquarter can perform them.
3. **Given** a Headquarter user selects "delete" on a category that has linked articles, **When** the confirmation dialog appears, **Then** it states the category name and the number of linked articles that will be reassigned to an "Unclassified" category, and warns the action cannot be undone.
4. **Given** the delete confirmation dialog is open, **When** the user cancels, **Then** no data changes and the dialog closes.

### Edge Cases

- What happens when a category with 0 linked articles is deleted? The confirmation dialog still appears but need not mention article reassignment since none applies.
- What happens when the search term matches no category name or description but a filter would otherwise include categories? The "no matching categories" empty state is shown, distinct from the "no categories exist at all" empty state.
- What happens when a user without Headquarter/System role attempts to reach the add/edit destinations directly (e.g. via a saved link) rather than through the disabled button? Out of scope for this screen — access control at the destination screen is covered by that screen's own specification.
- What happens when a category has no brand assigned? `brand_enum` is optional in the data model; the brand column simply renders no badge for that row. No seeded category currently exercises this case.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a list of all registered article categories, showing: category ID, category name, description, type (Notice/Blog), brand scope, display order, count of linked articles, and publish status (Public/Private).
- **FR-002**: System MUST let users search categories by partial match against category name or description.
- **FR-003**: System MUST let users filter the list by type (All/Notice/Blog), by brand scope (All/JOYFIT/JOYFIT24/JOYFIT YOGA/JOYFIT+/FIT365), and by publish status (All/Public/Private), with filters combining as AND conditions.
- **FR-004**: System MUST show how many filters are currently active and a human-readable summary of the active search/filter combination, and MUST let users clear all search/filter conditions in one action.
- **FR-005**: System MUST let users sort the list by category name, display order, or linked article count, toggling between ascending and descending on repeated selection of the same column.
- **FR-006**: System MUST paginate the list with a user-selectable page size (25/50/100/200 rows) and display the current range and total count of results.
- **FR-007**: System MUST show a distinct empty state when no categories exist at all versus when a search/filter combination matches zero categories, offering a way to clear filters only in the latter case.
- **FR-008**: System MUST restrict the ability to initiate creating, editing, or deleting a category to users with the Headquarter or System role; users with other roles (Manager, Staff, Observer) MUST be able to view the full list but MUST see create/edit/delete actions as visibly present but disabled, with an explanation that the action is Headquarters-only.
- **FR-009**: System MUST require an explicit confirmation before deleting a category, and that confirmation MUST state the category name, the count of articles currently linked to it, that those linked articles will be reassigned to an "Unclassified" category, and that the action cannot be undone.
- **FR-010**: System MUST let users navigate back from the category master screen to the Notice & Blog management list.

### Key Entities _(include if feature involves data)_

- **Article Category**: A named grouping used to classify Notice/Blog articles. Attributes: unique ID, name, description, type (Notice or Blog), brand scope (which brand or sub-brand the category applies to), display order (used for external sort order), publish status (Public/Private), and a derived count of articles currently linked to it. Deleting a category does not delete its linked articles; they are reassigned to an "Unclassified" category.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can locate a specific category among 100+ registered categories in under 10 seconds using search and/or filters.
- **SC-002**: A user can determine a category's publish status and linked article count without leaving the list screen, for 100% of listed categories.
- **SC-003**: 100% of category deletion attempts require an explicit confirmation that names the impact (linked article count and reassignment) before the deletion proceeds.
- **SC-004**: 0% of users without the Headquarter or System role are able to complete a create, edit, or delete action from this screen.

## Assumptions

- The category add/edit form (`article-category-form`) is covered by a separate specification; this feature covers only what the list screen displays and how it gates entry points to that form, not the form's own fields or validation.
- Brand scope options reuse the existing generated `BrandEnum` (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`) already defined for the rest of the CRM — there is no separate "brand overall" value; a category is scoped to exactly one of these five brands.
- Viewing the category master list is available to all Notice & Blog management roles (Headquarter, Manager, Staff, Observer); only mutation actions (create/edit/delete) are restricted to Headquarter/System, consistent with the FR-009 requirement that "registration/edit permission is Headquarters-only." This is enforced via dedicated `Permission.ArticleCategories{View,Create,Edit,Delete}` entries in the app's role/permission matrix (`src/constants/permission.constants.ts`): all four roles above get `View`; only Headquarter (and System, which holds every permission) get `Create`/`Edit`/`Delete`. The "new category" button additionally gates on role directly (`RoleGatedButton` with `allowedRoles={[Headquarter, System]}`), while row-level edit/delete gate on the `Permission.ArticleCategoriesEdit`/`Delete` permissions.
- The "Unclassified" fallback category that absorbs articles from a deleted category is assumed to already exist as a system default category; creating or managing that fallback category itself is out of scope here.
- Soft-delete/recovery behavior for categories (if any) follows the same logical-delete pattern already defined for articles in I-02 FR-004, but is not independently re-specified here since it is not exposed on the list screen beyond the confirmation dialog.
