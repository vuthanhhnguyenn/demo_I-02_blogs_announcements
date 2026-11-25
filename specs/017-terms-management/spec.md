# Feature Specification: Y-04 Terms Document Master Management

**Feature Branch**: `017-terms-management`
**Created**: 2026-07-14
**Status**: Draft
**PO Spec**: `Y-04` — 規約文書管理（マスタ）(Terms Document Master Management)
**Source**: `.cache/fitness-crm-ui/src/pages/terms-list.tsx`, `.cache/fitness-crm-ui/src/pages/terms-detail.tsx`, `.cache/fitness-crm-ui/src/pages/terms-form.tsx`, `.cache/fitness-spec/crm/requirements/Y-04.md`
**Input**: User description: "Create spec for the terms management, spec: Y-04.md, ui v0: pages/terms-list.tsx, pages/terms-detail.tsx, pages/terms-form.tsx"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse and search terms documents (Priority: P1)

As Headquarter, System, Manager, Staff, or Observer, I can open Terms Document Management, switch between terms-type tabs, search by ID or name, filter by brand and status, and optionally reveal deleted records, to quickly locate a specific terms document.

**Why this priority**: The list is the entry point for every downstream workflow (viewing, editing, deleting, versioning). Without it, no other operation can be initiated.

**Independent Test**: Open the list page, switch tabs, type a search term, apply each filter, toggle "include deleted," and verify the table updates accordingly without navigating elsewhere.

**Acceptance Scenarios**:

1. **Given** the user opens Terms Document Management, **When** the page loads, **Then** documents are split across an "All" tab plus one tab per terms type (Membership Terms / Privacy Policy / Payment Terms / Companion Terms / Withdrawal Terms / Leave-of-Absence Terms), each row showing ID, name, current version, brand(s), effective (start) date, and a computed status (Published / Expired / Draft).
2. **Given** the list is displayed, **When** the user types a partial ID or name into the search field, **Then** only matching rows remain visible.
3. **Given** the filter controls, **When** a brand or status filter is selected, **Then** the table narrows to matching rows, an active-filter-count indicator and filter-summary banner appear, and a "clear conditions" action resets every filter and the search field.
4. **Given** "include deleted" is unchecked, **When** the list renders, **Then** logically-deleted terms documents are hidden; checking it reveals them, visually dimmed.
5. **Given** no row matches the current search/filter/tab combination, **When** the table renders, **Then** an empty/filtered state is shown with an action to clear conditions.
6. **Given** the current user's role is Trainer, **When** they open the page, **Then** a "no permission to view this screen" message is shown instead of the list, consistent with the permission matrix (Trainer has no access to this feature at all).
7. **Given** a logically-deleted row is shown (via "include deleted"), **When** the user opens its row action menu, **Then** only "View details" is offered — Edit and Delete are not shown.
8. **Given** the current user is Manager, Staff, or Observer, **When** the list renders, **Then** only documents of their assigned brand(s) are listed and the brand filter is fixed to that brand (not selectable); the fixed brand is not counted as an active filter and is not included in the filter-summary banner.
9. **Given** the total row count exceeds the selected page size, **When** the list renders, **Then** pagination controls and a page-size selector (25/50/100) let the user navigate and adjust the visible range.

---

### User Story 2 - View terms document detail (Priority: P1)

As an authorized (non-Trainer) user, I can open a terms document to review its full basic information, its own body text and source PDF (whatever its status), its management metadata, and its complete version lineage.

**Why this priority**: The detail view centralizes everything staff need day-to-day (current wording, applicable dates, revision history) and is the gateway to edit/delete/new-version actions.

**Independent Test**: Open a row from the list and verify every section renders (basic info, terms-body text + PDF, management info, version-history timeline) and that action buttons are gated by role.

**Acceptance Scenarios**:

1. **Given** the user opens a terms document's detail page, **When** the "Basic Information" tab loads, **Then** the terms name and notes are shown, along with a scrollable extracted-body-text card holding this document's own text, the attached PDF's filename and size, and a "preview" action that opens the PDF in a new window — for every status (Published, Expired, Draft, Deleted); the card's "{version} applied" badge appears only on a Published, non-deleted document.
2. **Given** the "Basic Information" tab, **When** the user views the management-info panel, **Then** status, applied version, terms ID, approval-button-display setting, terms type, brand(s), effective (start) date, expiry date (shown as "—" when unset), display order, and audit fields (created at, last updated at, last updated by) are shown read-only.
3. **Given** the "Version History" tab, **When** it opens, **Then** all versions in the document's lineage (the original plus every derived version) are shown as a chronological timeline, each with its version label, version-kind badge (Original / Version), computed status badge, applicable period, change summary, and a "preview" action that opens that version's source PDF in a new window. _(Updated 2026-10-20 to match the implemented behaviour (preview on every entry), per product-owner decision; Y-04 FR-004 does not restrict the preview to the applied version.)_
4. **Given** more than 3 versions exist in the lineage, **When** the timeline renders, **Then** only the 3 most recent are shown initially, with a "show more" control revealing the rest.
5. **Given** the currently-applied version, **When** shown in the timeline, **Then** it is visually distinguished from past versions.
6. **Given** an authorized user opens a non-deleted terms document, **When** the detail header renders, **Then** it offers "Edit" (secondary/outline), "Create New Version" (primary), and a "more" menu containing "Delete"; the Version History tab also offers a secondary "Create New Version" button.
7. **Given** the user opens a logically-deleted terms document, **When** the detail page renders, **Then** all information, the body text, and PDF preview remain viewable, the status badge reads "Deleted", and Edit, Delete, and Create New Version are hidden (not disabled) everywhere on the page, including the Version History tab.

---

### User Story 3 - Register a new terms document (Priority: P2)

As Headquarter or System, I can register a new terms document by selecting one or more brands, entering its name, type, version, effective date, optional expiry date, optional display order, an approval-button-display toggle, optional notes, and uploading a PDF (which triggers automatic body-text extraction), then submit.

**Why this priority**: Registration is the second most critical workflow — no terms document exists for members to see or agree to until one is created.

**Independent Test**: From the list page, click "New Registration," fill required fields, upload a PDF, submit, and verify a validation error appears when a required field or the PDF is left out.

**Acceptance Scenarios**:

1. **Given** the registration form is open, **When** a required field (terms name, terms type, version, effective date, or PDF) is left empty and submit is attempted, **Then** a field-level error message appears next to each missing field, submission is blocked, and the view scrolls to the first invalid field.
2. **Given** a non-PDF file or a file over 10MB is selected, **When** the file is chosen, **Then** an inline error ("PDF format only" / "exceeds 10MB") is shown and the file is rejected.
3. **Given** a valid PDF is selected, **When** the upload completes, **Then** the automatically-extracted body text is shown in a preview area, labeled with its source filename.
4. **Given** all required fields and the PDF are valid, **When** the user submits, **Then** the terms document is created, a success confirmation is shown, and the user returns to the terms list.
5. **Given** the "New Registration" action, **When** the current user's role is Manager, Staff, Observer, or Trainer, **Then** the action is unavailable to them, per the permission matrix.
6. **Given** the registration form opens, **When** it renders, **Then** the approval-button-display toggle is ON; submitting without touching it saves the document with the approval button shown.

---

### User Story 4 - Edit an existing terms document (Priority: P2)

As Headquarter or System, I can edit an existing terms document's editable fields — name, version, effective date, expiry date, display order, approval-button-display, notes, and PDF — while terms ID, terms type, and brand remain locked, and I am warned when the document I'm changing is currently applied.

**Why this priority**: Keeping terms data accurate (corrections, date adjustments, notes) is a routine operational need distinct from full re-versioning.

**Independent Test**: Open edit from the detail page, verify locked vs. editable fields, verify the active-version warning appears when applicable, save, and confirm the update is reflected in the detail view.

**Acceptance Scenarios**:

1. **Given** the edit form opens for a terms document, **When** it renders, **Then** terms type and brand are shown disabled with a note that they cannot be changed in edit mode, while name, version, dates, display order, approval toggle, notes, and PDF remain editable.
2. **Given** the document being edited currently has a computed status of "Published," **When** the edit form loads, **Then** a warning banner explains that changing an active terms document affects members who already agreed, and recommends creating a new version instead.
3. **Given** the user chooses to replace the PDF, **When** a new valid PDF is uploaded, **Then** the newly-extracted body text replaces the previous preview; the prior file remains shown until a valid replacement is confirmed.
4. **Given** valid changes, **When** submitted, **Then** the document is updated, a success confirmation is shown, and the user returns to the detail view showing the updated values.
5. **Given** unsaved changes exist in the form, **When** the user attempts to navigate away, **Then** a discard-confirmation dialog blocks the navigation until confirmed.
6. **Given** the document being edited belongs to a lineage with at least one derived version, **When** the edit form loads, **Then** the 関連規約 field lists every **other** document in that lineage (the original and/or derived versions, the document being edited itself excluded — otherwise the same entries and order as the Version History tab, most recent first), each with its version label, version-kind badge (Original / Version), status and applicable period; a lone original with no derived version reads 「関連する規約が存在しません」. _(Added 2026-10-27 — Y-04 不具合 No13.)_

---

### User Story 5 - Create a new version of an existing terms document (Priority: P2)

As Headquarter or System, from an existing terms document's Version History tab, I can start a "new version" registration that copies the source document's name, type, brand, display order, and approval-button setting, requiring me to provide only the new version's label, effective date, and PDF, with the original automatically referenced.

**Why this priority**: Versioning (rather than direct editing) is the recommended, primary path for terms revisions and must work correctly to preserve historical wording and effective-date accuracy.

**Independent Test**: From a terms document's Version History tab, click "Create New Version," verify pre-filled/locked fields, complete the remaining required fields, submit, and verify the new version appears in the lineage while the previously-applied version's status transitions automatically.

**Acceptance Scenarios**:

1. **Given** a terms document's Version History tab, **When** the user clicks "Create New Version," **Then** a registration form opens pre-filled with the source document's name, type, brand(s), display order, and approval-button setting; terms ID (read-only), type, and brand are locked and each carries the note "New versions inherit this from the original terms (cannot be changed)", while name, display order, and approval-button setting remain editable.
2. **Given** the pre-filled new-version form, **When** it renders, **Then** a "Related Terms" field shows the source document's name and version as an automatically-set, read-only reference.
3. **Given** the user provides a new version label, effective date, and PDF, **When** submitted, **Then** a new version record is created and linked to the same lineage as the source document.
4. **Given** a new version's effective date is reached, **When** its computed status becomes "Published," **Then** the previously-applied version's status automatically becomes "Expired" — no manual status toggle is required or provided anywhere in the UI.

---

### User Story 6 - Delete a terms document (Priority: P2)

As Headquarter or System, I can logically delete a terms document from the list or detail view, after confirming in a dialog, and later find it again by enabling "include deleted."

**Why this priority**: Deletion must be safe and reversible, since terms documents may be referenced by historical member consent records.

**Independent Test**: Trigger delete from a list row and from a detail page, confirm the dialog, verify the record disappears from the default list, then verify it reappears with "include deleted" checked.

**Acceptance Scenarios**:

1. **Given** the user selects "Delete" from a list row's action menu or a detail page's action menu, **When** they confirm the dialog, **Then** the terms document is marked deleted (not physically removed) and no longer appears in the default list.
2. **Given** "include deleted" is checked in the list filters, **When** the list renders, **Then** previously-deleted terms documents reappear, visually dimmed.
3. **Given** the current user's role is Manager, Staff, Observer, or Trainer, **When** they view list or detail actions, **Then** delete is unavailable to them.
4. **Given** a terms document is already logically deleted, **When** it is viewed in the list or detail, **Then** delete (and edit / new-version) is not offered.

### Edge Cases

- A PDF exceeds 10MB or is not a PDF on upload or replace: the file is rejected with an inline error, and any previously-selected/attached file state is preserved unchanged.
- A terms document has more than 3 historical versions: the timeline shows only the 3 most recent, with a "show more" control revealing the rest.
- A search/filter/tab combination yields zero results in a given tab: a filtered empty state with a clear-conditions action is shown, distinct from the true "no data at all" empty state.
- A Trainer attempts to access the terms list or a terms detail page directly: both are treated as no-access, not just the list.
- Editing a currently-applied ("Published") version: a warning banner is always shown, but the edit itself is not blocked — the warning is advisory, not a hard gate.
- Creating a new version always inherits type/brand (and pre-fills the name) from the terms document currently open, regardless of which historical row the user was viewing in the version-history timeline — there is no per-row "branch from this version" option.
- A logically-deleted terms document opened from the list: detail, body text, and PDF preview stay viewable, but no write action (edit / delete / new version) is exposed.
- A brand-new terms document with a future effective date displays as "Draft" until that date, then automatically becomes "Published" with no manual action.
- The date-order error (「適用終了予定日は適用開始日以降の日付を入力してください。」, under 適用終了予定日) on the create / edit / new-version form is re-evaluated whenever **either** date changes: it disappears as soon as the order becomes valid or either date is cleared, and it is never shown while 適用開始日 is empty (an empty start date only gets its own required-field error). _(Added 2026-10-27 — Y-04 不具合 No9.)_
- Deleting a terms document does not affect unrelated new-version creation for a different terms name, and deleting one version in a lineage does not delete sibling versions.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001 (List & Tabs)**: System MUST provide a terms document list split into an "All" tab plus one tab per terms type (Membership Terms / Privacy Policy / Payment Terms / Companion Terms / Withdrawal Terms / Leave-of-Absence Terms), each row showing ID, name, current version, brand(s), effective (start) date, and a status computed from effective/expiry dates (Published / Expired / Draft).
- **FR-002 (Search & Filter)**: System MUST support search by partial ID/name match, plus filters for brand and status, with an active-filter-count indicator, a filter-summary banner, and a "clear conditions" action.
- **FR-003 (Include Deleted)**: System MUST provide an "include deleted" toggle that reveals logically-deleted terms documents, visually distinguished, in the list only when enabled.
- **FR-004 (Pagination)**: System MUST paginate the list with a selectable page size (25/50/100) and page-navigation controls, reflecting total count and the currently-displayed range.
- **FR-005 (Empty/Filtered State)**: System MUST show an empty/filtered state with a "clear conditions" action when no terms document matches the current search/filter/tab combination.
- **FR-006 (Data Scope & View-Only Access)**: System MUST restrict list/detail access per the permission matrix: System/Headquarter manage and view all brands; Manager/Staff/Observer may view (not manage) documents within their assigned brand(s) only, with the brand filter fixed to that scope; Trainer has no access to this feature.
- **FR-007 (Create Terms Document)**: System MUST provide a registration form capturing brand (required, multi-select; ticking both brands creates one shared document with `brandEnum: null`, ticking one creates a single-brand document), terms name (required), terms type (required), version (required), effective date (required), expiry date (optional), display order (optional), approval-button-display (required toggle, ON by default), notes (optional), and a PDF file (required), validating required fields before allowing submission. _(Updated 2026-11-10: the toggle starts ON. Y-04 gives no default; the legacy admin form (`showAgreeButton: true`) and the backend (`requires_consent` default true) both start ON, and a document left OFF is treated as 同意不要 and drops out of the C-01 admin enrollment 規約同意 list (C-01 不具合 No17).)_
- **FR-008 (PDF Upload & Validation)**: System MUST accept only PDF files up to 10MB for the terms attachment, rejecting other formats or oversized files with an inline error message.
- **FR-009 (Automatic Text Extraction)**: System MUST automatically extract body text from an uploaded/replaced PDF and store it as the terms document's body text, displaying the extracted text alongside the source PDF for confirmation; the PDF remains the authoritative legal copy, and the extracted text requires no manual reconciliation.
- **FR-010 (Detail View — Basic Information)**: System MUST display, per terms document, its name, notes, and — for a version document — a link to its original terms document (opens the original's detail page; Y-04 FR-005 L169), computed status, current version, approval-button-display setting, terms type, brand(s), effective date, display order, and audit metadata (created at, last updated at, last updated by), plus terms ID and expiry date, and — for every status — the document's own extracted body text, its PDF filename/size and a PDF-preview action. _(Updated 2026-10-20: the body-text card is shown for every status — Published, Expired, Draft and Deleted — with this document's own text and PDF; the 「{version} 適用中」 badge only on a Published, non-deleted document. Y-04 FR-004 does not limit the card by status, FR-005 says 「全項目を読み取り専用で表示」, and a Draft must be checkable before it takes effect; the detail API already returns this document's `bodyText` / PDF.)_
- **FR-011 (Detail View — Version History)**: System MUST display a chronological timeline of every version in a terms document's lineage (original and derived), each showing version label, version kind (Original/Version), computed status, applicable period, and change summary, plus a per-entry PDF preview action, with the currently-applied version visually distinguished and initially limited to the 3 most recent entries (expandable to show all). _(Updated 2026-10-20 to match the implemented behaviour (preview on every entry), per product-owner decision; Y-04 FR-004 does not restrict the preview to the applied version.)_
- **FR-012 (Edit Terms Document)**: System MUST allow editing name, version, effective date, expiry date, display order, approval-button-display, notes, and PDF, while keeping terms ID, terms type, and brand locked once a document is created.
- **FR-013 (Active-Version Edit Warning)**: System MUST display a warning when editing a terms document whose computed status is currently "Published," noting the impact on members who already agreed and recommending a new version instead of a direct edit.
- **FR-014 (Create New Version)**: System MUST allow creating a new version from an existing terms document that pre-fills all copyable fields (name, type, brand, display order, approval-button-display) from the source — locking terms ID, type, and brand while name, display order, and approval-button-display stay editable — auto-references the source as the related/original terms document, and requires only a new version label, effective date, and PDF to complete. _(Updated 2026-10-20: name is editable, per product-owner decision. Y-04 FR-008 only says 'copy all fields' and FR-006 lets every version be renamed on edit anyway, so locking the name only at creation guaranteed nothing; this reverses the customer's 案２ in FIT QAs #113.)_
- **FR-015 (Automatic Status Transition)**: System MUST automatically compute each version's status (Published/Expired/Draft) from its effective and expiry dates, such that a new version's effective date automatically ends the previously-applied version's "Published" status without any manual toggle.
- **FR-016 (Delete — Logical)**: System MUST support logical deletion of a terms document (from list or detail) after a confirmation dialog, retaining the underlying data and surfacing it again only via the "include deleted" toggle.
- **FR-017 (Role-Gated Actions)**: System MUST gate "New Registration," "Edit," "Delete," and "Create New Version" actions to Headquarter/System roles only, per the permission matrix; Manager/Staff/Observer are limited to view-only, and Trainer has no access to any part of this feature. For a logically-deleted terms document, Edit, Delete, and Create New Version MUST be hidden for every role; only viewing details and the PDF is allowed.
- **FR-018 (Unsaved-Changes Guard)**: System MUST prompt a discard-confirmation dialog when the user attempts to leave the registration/edit form with unsaved changes.

### Key Entities _(include if feature involves data)_

- **Terms Document**: A single version within a terms lineage — ID, name, type (one of 6 fixed types), version label, brand(s), effective date, expiry date, display order, approval-button-display flag, notes, computed status (Published/Expired/Draft), attached PDF, extracted body text, deleted flag, and audit fields (created at, last updated at, last updated by).
- **Terms Lineage (Related Terms)**: The grouping of one original terms document plus zero or more derived version documents that share the same terms identity; exactly one member of the lineage is "currently applied" at any time, determined by effective/expiry dates.
- **PDF Attachment**: The uploaded source file for a terms document version — PDF format only, up to 10MB — treated as the legally authoritative copy and the source of the automatically-extracted body text.

### Traceability Matrix (UI → Source Requirement)

| UI Element / Behavior                                                           | Source Requirement (Y-04)               | Inclusion                                                                                                         |
| ------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Type-tab list with per-tab filtering, search, brand/status filters, clear-all   | FR-001                                  | In Scope                                                                                                          |
| Status computed from effective/expiry dates (Published/Expired/Draft)           | FR-001, 概要 (status definition)        | In Scope                                                                                                          |
| "Include deleted" toggle                                                        | 制限事項 (logical deletion)             | In Scope                                                                                                          |
| Pagination + page-size selector                                                 | UI convention (not separately numbered) | In Scope                                                                                                          |
| Registration form (brand/name/type/version/dates/order/approval flag/notes/PDF) | FR-002                                  | In Scope                                                                                                          |
| PDF upload validation (format/size)                                             | FR-003, 制限事項                        | In Scope                                                                                                          |
| Automatic text extraction + preview (Method D)                                  | FR-003, 検討-01 (Method D)              | In Scope                                                                                                          |
| Detail (original): body-text card + PDF preview + related-terms timeline        | FR-004                                  | In Scope                                                                                                          |
| Detail (version): reference link to original + active-version-edit warning      | FR-005                                  | In Scope                                                                                                          |
| Edit form (locked ID/type/brand)                                                | FR-006                                  | In Scope                                                                                                          |
| Edit form: 関連規約 lists the rest of the lineage (edited doc excluded)         | 用語定義「関連規約」, FR-006            | In Scope (prototype still shows 関連する規約が存在しません in edit mode — spec wins, 不具合 No13)                 |
| Delete (confirmation dialog + logical delete)                                   | FR-007                                  | In Scope                                                                                                          |
| New Version creation (copy + auto-reference)                                    | FR-008                                  | In Scope                                                                                                          |
| Role-gated create/edit/delete/version actions                                   | 権限マトリクス (Permission Matrix)      | In Scope                                                                                                          |
| Unsaved-changes discard dialog                                                  | UI convention                           | In Scope                                                                                                          |
| Mobile terms-retrieval API                                                      | FR-009                                  | Out of Scope (separate API/mobile-consumer feature)                                                               |
| Mobile terms-revision confirmation & consent capture                            | FR-010                                  | Out of Scope (mobile app feature)                                                                                 |
| Procedure-specific terms display (leave-of-absence / withdrawal flows)          | FR-011 (Should)                         | Out of Scope (belongs to the owning leave/withdrawal feature; this spec only ensures terms are queryable by type) |

### Out of Scope

- Mobile app UI for displaying terms and capturing member consent (FR-010) — a separate, mobile-app-side feature.
- The terms-retrieval API contract itself (FR-009) — backend/API design is deferred to planning.
- Surfacing terms inside specific procedure flows such as leave-of-absence or withdrawal (FR-011, Should) — deferred to the owning feature; this spec only guarantees terms are filterable/queryable by type.
- PDF text-extraction accuracy or algorithm — treated as an external/backend capability; this spec only defines that extraction happens automatically and its result is displayed.
- Automatic member notification on terms revision — not represented in the provided UI.
- Brand master management beyond selecting from the existing brands (JOYFIT/FIT365) within the terms form.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Any authorized (non-Trainer) user can locate a specific terms document, using tab switching plus search/filter, in under 15 seconds for a standard dataset.
- **SC-002**: Authorized users can complete new terms document registration, including a valid PDF upload, in under 2 minutes.
- **SC-003**: 100% of terms document detail views show the extracted body text and the source PDF together whenever a PDF is attached, with no manual text entry required from the user.
- **SC-004**: Creating a new version requires providing only 3 new fields (version label, effective date, PDF); every other copyable field is pre-filled from the source document.
- **SC-005**: Logical deletion is 100% recoverable via the "include deleted" filter, with zero data loss, across all tested delete scenarios.
- **SC-006**: Role-restricted actions (registration, edit, delete, new-version creation) are never exposed as usable to Manager/Staff/Observer/Trainer roles during testing; Trainer cannot reach the list or detail screens at all.

## Assumptions

- Status (Published/Expired/Draft) is computed automatically from a version's effective and expiry dates; no manual status field is set directly by the user (per Y-04 FR-001 and the 概要 status definition).
- PDF text extraction succeeds reliably as an automated backend process; the CRM UI only displays the result and provides no manual correction, consistent with Y-04's confirmed Method D decision that the PDF remains authoritative and the extracted text needs no reconciliation.
- Mobile app consumption of terms data (retrieval API, consent capture, procedure-specific display) is downstream/separate consumer functionality; this CRM-admin feature is responsible only for producing the data (body text, PDF URL, approval-button flag, display order, type) those consumers need.
- Manager/Staff/Observer data scope is limited to their assigned brand(s) for viewing only, consistent with the permission matrix; they cannot create, edit, delete, or version any terms document.
- A terms document's lineage is modeled as one original plus zero or more derived versions, with exactly one version considered "currently applied" at any time based on effective/expiry dates.
