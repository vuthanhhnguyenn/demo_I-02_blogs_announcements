# Feature Specification: Banner Form Management

**Feature Branch**: `010-banner-form`  
**Created**: 2026-07-02  
**Status**: Finalized  
**PO Spec**: `I-02` — 告知・ブログ管理 FR-005（Form Scope）  
**Source**: `.cache/fitness-spec/crm/requirements/I-02.md` + `.cache/fitness-crm-ui/src/pages/banner-list.tsx` (navigation/action evidence)  
**Input**: User description: "I-02 告知・ブログ管理 - FR-005: バナーの編集・削除管理（本部のみ）"

## Scope

This spec covers only banner create/edit form concerns in Phase 1:

- access to create/edit flows from list actions
- role permissions for create/edit
- expected submit outcomes for create/edit
- form route authorization behavior

Out of scope for this spec:

- banner list filtering/sorting/pagination behavior
- list-side delete/reorder dialog interactions

## User Scenarios & Testing

### User Story 1 - Register New Banner (Priority: P1)

Headquarter and System users can open the banner form and create new banners.

**Independent Test**: As Headquarter, click 新規登録 from banner list, complete required fields, submit, and confirm item appears in list.

**Acceptance Scenarios**:

1. **Given** Headquarter/System user on banner list, **When** 新規登録 is clicked, **Then** navigation to banner-form occurs.
2. **Given** valid required inputs are provided, **When** user submits, **Then** banner is created and reflected in list view.
3. **Given** Manager/Staff/Observer users, **When** viewing list header actions, **Then** 新規登録 is visible but disabled.

### User Story 2 - Edit Existing Banner (Priority: P1)

Headquarter and System users can open banner form in edit mode from row actions and update existing banner data.

**Independent Test**: As Headquarter, open row menu → 編集, update values, submit, verify updated values in list.

**Acceptance Scenarios**:

1. **Given** Headquarter/System user selects 編集 from row menu, **When** form opens, **Then** existing banner data is pre-filled.
2. **Given** valid edits are submitted, **When** save succeeds, **Then** list shows updated values.
3. **Given** Manager/Staff/Observer users, **When** row menu is opened, **Then** 編集 is visible but disabled.

### User Story 3 - Enforce Form Access Permissions (Priority: P1)

Unauthorized roles cannot access banner-form routes directly.

**Independent Test**: As non-authorized role, navigate directly to create/edit form URL and verify redirect behavior.

**Acceptance Scenarios**:

1. **Given** Manager/Staff/Observer manually access banner-form URL, **When** route guard executes, **Then** request is redirected to `/403` according to existing permission middleware.
2. **Given** Headquarter/System access same routes, **When** route guard executes, **Then** form page is accessible.

### Edge Cases

- Direct URL access by unauthorized users must follow existing permission system behavior (redirect to `/403`).
- If create/edit submission fails, generic error feedback is shown.
- If concurrent edit occurs, Phase 1 behavior is last-write-wins.
- Image upload/validation errors are handled by form validation rules before successful submit.

## Requirements

### Functional Requirements

- **FR-FORM-001**: System MUST allow only Headquarter/System roles to execute create flow from list action; unauthorized roles MUST still see the create action but in disabled state.
- **FR-FORM-002**: System MUST allow only Headquarter/System roles to execute edit flow from row action; unauthorized roles MUST still see the edit action but in disabled state.
- **FR-FORM-003**: System MUST open create mode form with empty/default values.
- **FR-FORM-004**: System MUST open edit mode form with pre-filled existing banner values.
- **FR-FORM-005**: System MUST persist create submission and make new item visible in list.
- **FR-FORM-006**: System MUST persist edit submission and make updated item visible in list.
- **FR-FORM-007**: System MUST enforce route-level authorization for form routes using existing permission system and redirect unauthorized access to `/403`.
- **FR-FORM-008**: System MUST provide user-visible failure feedback when create/edit submission fails.

### Key Entities

- **BannerFormInput**: create/edit payload fields for banner record (image, title, brands (multi-select), link URL, period, channel flags, publication state inputs if applicable).
- **BannerItemResponse**: persisted/enriched banner API entity updated by create/edit form submit.

## Success Criteria

### Measurable Outcomes

- **SC-FORM-001**: Authorized users can complete create flow and return to list with visible new banner in one session.
- **SC-FORM-002**: Authorized users can complete edit flow and verify updated banner in list in one session.
- **SC-FORM-003**: Unauthorized direct URL access to form routes is blocked and redirected to `/403` in 100% of checks.
- **SC-FORM-004**: Submission failures present explicit user feedback without silent failure.

## Assumptions

- Detailed field-level layout/validation for banner-form will be grounded by the dedicated form UI source during implementation.
- List-side behaviors are specified separately in `specs/010-banner-list/spec.md`.
- Existing permission middleware (proxy + PAGE_PERMISSIONS) remains the canonical enforcement mechanism.
