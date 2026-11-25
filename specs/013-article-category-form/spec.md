# Feature Specification: Article Category Form (Notice & Blog Management)

**Feature Branch**: `013-article-category-form`
**Created**: 2026-07-10
**Status**: Draft
**PO Spec**: `I-02` — 告知・ブログ管理 (Notice & Blog Management), FR-009: 記事カテゴリーのマスタ管理 (Article Category Master Management)
**Source**: `dx-fitness/fitness-crm-ui` @ `fe37453` (`src/pages/article-category-form.tsx`) + `dx-fitness/fitness-spec` @ `e3d9de9` (`crm/requirements/I-02.md`)
**Input**: User description: "Create a specification for [I-02][FR-009] 記事カテゴリーのマスタ管理. Spec: requirements/I-02.md (scope limited to the FR-009 screen only). Design: pages/article-category-form.tsx. Scope: The list screen within FR-009 has already been completed (013-article-category-master). This time, the scope is limited to the form screen for creating and editing article categories."

## User Scenarios _(mandatory)_

### User Story 1 - Register a new article category (Priority: P1)

A Headquarter (or System) user opens the category form from the category master list to create a new category, entering its name, description, article type, linked brand, display order, and publish status, then submits it so it becomes immediately usable when authoring notice/blog articles.

**Why this priority**: Without the ability to create a category, the category master (013-article-category-master) can never grow beyond its seed data — this is the foundational write operation the list screen depends on.

**Verification**: Navigate to the form from the category list's "new category" action, fill in category name, type, and linked brand, submit, and confirm a success message appears and the user returns to the category list.

**Acceptance Scenarios**:

1. **Given** a Headquarter/System user opens the form in create mode, **When** the screen renders, **Then** the page title is "カテゴリ登録", the submit button reads "入力内容を確認する", and all fields are empty or at their default (説明 empty, 表示順 defaulted to 1, 公開状況 defaulted to 公開/Public).
2. **Given** the create form is open, **When** the user enters a category name, selects a type (告知/ブログ) and a linked brand, optionally adjusts the description, display order, and publish toggle, and clicks the submit button, **Then** a success message confirming the category was registered is shown and the user is returned to the category master list.
3. **Given** the create form is open, **When** the user clicks "キャンセル", **Then** the user leaves the form without any category being created.
4. **Given** the create form is open, **When** the user clicks the "カテゴリ管理に戻る" back link, **Then** the user returns to the category master list without any category being created.

---

### User Story 2 - Edit an existing article category (Priority: P1)

A Headquarter (or System) user opens the same form in edit mode from an existing category, sees its current name, description, type, linked brand, display order, and publish status pre-filled, adjusts one or more of them, and saves the update.

**Why this priority**: Categories need ongoing maintenance (renaming, re-scoping to a different brand, changing display order, or toggling visibility) as the notice/blog catalog evolves; this is equally foundational to create and is required for the master to stay accurate over time.

**Verification**: Open the form in edit mode for an existing category, confirm every field is pre-populated with that category's current values, change the description and display order, save, and confirm a success message appears and the user returns to the category list.

**Acceptance Scenarios**:

1. **Given** a Headquarter/System user opens the form in edit mode for an existing category, **When** the screen renders, **Then** the page title is "カテゴリ編集", the submit button reads "入力内容を確認する", and every field (category name, description, type, linked brand, display order, publish status) is pre-populated with that category's current values.
2. **Given** the edit form is open with pre-filled values, **When** the user changes one or more fields and clicks the submit button, **Then** a success message confirming the changes were saved is shown and the user is returned to the category master list.
3. **Given** the edit form is open, **When** the user clicks "キャンセル" or the "カテゴリ管理に戻る" back link without submitting, **Then** the user returns without any change being saved.

---

### User Story 3 - Non-Headquarter roles are blocked from the form entirely (Priority: P2)

A Manager, Staff, or Observer who attempts to reach the category form (create or edit) — including by direct URL — is redirected to the system's existing access-denied (`/403`) page and never sees the form, since FR-009 restricts registration and editing of the category master to Headquarter.

**Why this priority**: This enforces the FR-009 permission boundary ("登録・編集権限：本部のみ") at the route level, complementing the list screen's own entry-point gating (013-article-category-master) so the restriction cannot be bypassed by navigating straight to the form URL.

**Verification**: As a Manager, Staff, or Observer, navigate directly to the create form URL and to an existing category's edit form URL, and confirm both redirect to the system's `/403` page without rendering any form field.

**Acceptance Scenarios**:

1. **Given** a user without the Headquarter or System role, **When** they navigate to the create form (directly via URL or otherwise), **Then** they are redirected to the system's existing `/403` access-denied page and no form field is rendered.
2. **Given** a user without the Headquarter or System role, **When** they navigate to the edit form for an existing category (directly via URL or otherwise), **Then** they are redirected to the system's existing `/403` access-denied page and no form field is rendered.
3. **Given** a user without the Headquarter or System role is redirected to `/403`, **When** this occurs, **Then** no category data is created, changed, or exposed.

### Edge Cases

- What happens when the user submits with カテゴリ名 (category name) empty? Submission is blocked and the required field is flagged, since カテゴリ名 is mandatory.
- What happens when the user submits without selecting 種別 (type) or 紐付けブランド (linked brand)? Submission is blocked and the missing required field(s) are flagged, since both are mandatory.
- What happens when 表示順 (display order) is left at its default or set anywhere within 1–999? The value is accepted as-is; the form does not require or check uniqueness of display order against other categories.
- What happens when an edited category already has articles linked to it and the user changes its 種別 (type) or 紐付けブランド (linked brand)? The change is accepted; this form does not warn about or re-validate already-linked articles (that impact, if any, is out of scope for this screen).
- What happens when a category is switched to 非公開 (Private)? Per the on-screen hint, the category stops appearing in the article category-selection list, but its existing linked articles remain associated with it.
- What happens when the user cancels or navigates back without submitting? The form is exited and no data is created or changed; no "unsaved changes" confirmation prompt is shown before leaving.
- What happens when a user without the Headquarter or System role has the form open in an existing browser tab and their session/role changes (e.g. permissions revoked) before they submit? Out of scope for this screen — session/permission re-validation timing is a cross-cutting authorization concern, not specific to this form.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a create form for a new article category with the fields: category name (required, free text), description (optional, free text), type (required, single choice of 告知/Notice or ブログ/Blog), linked brand (required, single choice among JOYFIT/JOYFIT24/JOYFIT YOGA/JOYFIT+/FIT365), display order (numeric, 1–999, defaulting to 1), and publish status (Public/Private toggle, defaulting to Public).
- **FR-002**: System MUST provide an edit form, reusing the same fields as FR-001, pre-populated with the selected category's current values.
- **FR-003**: System MUST block submission and flag the specific missing field(s) when category name, type, or linked brand is left empty, for both create and edit.
- **FR-004**: System MUST restrict access to the create and edit form to users with the Headquarter or System role; any user with another role (Manager, Staff, Observer, or unauthenticated) who attempts to reach the form — including by direct URL — MUST be redirected to the system's existing `/403` access-denied page, per the system's existing route-level authorization mechanism, and MUST NOT have any form field rendered to them.
- **FR-005**: System MUST show a distinct success confirmation for create ("category registered") versus edit ("changes saved") once a submission completes, and MUST return the user to the category master list afterward.
- **FR-006**: System MUST let the user leave the form via a cancel action or a back link to the category master list without creating or saving any data.
- **FR-007**: System MUST label the submit action "入力内容を確認する" in both create mode and edit mode.

### Key Entities _(include if feature involves data)_

- **Article Category**: The same entity defined by 013-article-category-master. This form creates and edits its editable attributes: name, description, type (Notice/Blog), linked brand, display order, and publish status (Public/Private). The category's ID and its derived linked-article count are not edited by this form.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Headquarter user can create a new, usable category (filling only the required fields) in under 30 seconds.
- **SC-002**: 100% of submission attempts missing category name, type, or linked brand are blocked with a field-level indication of what is missing, before any data is saved.
- **SC-003**: 0% of users without the Headquarter or System role are able to load or view the create/edit form — every such attempt, including direct URL access, results in redirection to the `/403` page before any field renders.
- **SC-004**: 100% of successful create and edit submissions result in the user being returned to the category master list with a confirming success message.

## Assumptions

- The Article Category entity, its list display, search/filter/sort, and delete workflow are already specified in 013-article-category-master; this specification covers only the create/edit form's own fields, validation, and submit behavior.
- Per the reference design (`article-category-form.tsx`), this form does not include a review/confirmation dialog before committing, and does not include an "unsaved changes" discard-guard prompt on cancel/back — both patterns exist on other master-data forms in this codebase (e.g. `012-studio-create-edit`), but are simplified away for this lighter-weight master form.
- Category name uniqueness is not enforced by this form — FR-009 does not state such a rule, and the reference design performs no duplicate check.
- Display order values are not required to be unique across categories; how ties are broken when categories share the same value is governed by the list screen's own sort behavior (013-article-category-master), not by this form.
- Linked brand reuses the existing generated `BrandEnum` (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`) already established in 013-article-category-master — there is no separate "brand overall"/JOYFIT全体 value; a category is linked to exactly one of these five brands.
- Unlike 013-article-category-master's list screen (where non-Headquarter roles can view the list but see mutation actions disabled), this form is access-controlled at the route level: only Headquarter/System can load the create or edit form at all. Any other role reaching the form URL is redirected to the system's existing `/403` page via its existing route-level authorization guard (the same mechanism already used elsewhere in the app, e.g. `staff-management`'s `/settings/staff` route), rather than rendering a view-only form with a disabled submit button.
