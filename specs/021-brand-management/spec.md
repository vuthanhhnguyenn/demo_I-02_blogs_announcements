# Feature Specification: Brand Master Management

**Feature Branch**: `021-brand-management`
**Created**: 2026-07-29
**Status**: Draft
**PO Spec**: `Y-07` — ブランド管理（マスタ） _(Brand Master Management)_
**Source**: `brand-list.tsx` + `brand-detail.tsx` (dx-fitness/fitness-crm-ui@c909e33) + `crm/requirements/Y-07.md` (dx-fitness/fitness-spec@ce6ad85)
**Input**: User description: "Create spec for brand management / spec: requirements/Y-07.md / design V0: brand-list.tsx, brand-detail.tsx"

## User Scenarios _(mandatory)_

### User Story 1 - Browse and drill into brand records (Priority: P1)

A Headquarter staff member (or a Manager/Staff viewer) opens the brand management screen to see all registered brands (JOYFIT, FIT365) and opens a brand's detail page to review its basic information, fee configuration, and change history.

**Why this priority**: This is the foundational reference capability every other workflow depends on. Without it, no one — including read-only roles — can find or inspect brand configuration.

**Verification**: Load the brand list, confirm both brands appear with ID and name, search by keyword and confirm the list filters, click a row and confirm the detail page opens on the correct brand with three tabs (basic info, fee, change history).

**Acceptance Scenarios**:

1. **Given** the brand list is loaded, **When** no search term is entered, **Then** all registered brands are shown with their brand ID and brand name (no cost columns).
2. **Given** a search term is entered that matches no brand, **When** the list filters, **Then** an empty/filtered state appears with an option to clear the search.
3. **Given** a brand row is clicked, **When** the detail page loads, **Then** the brand name, an active-status badge, and three tabs (基本情報/費用/変更履歴) are shown, with the 費用 and 変更履歴 tabs displaying their respective item counts.
4. **Given** the current user's role is Trainer or Observer, **When** they navigate directly to a brand detail page, **Then** the page shows an access-denied message instead of brand data.

---

### User Story 2 - Maintain per-sub-brand fee settings (Priority: P2)

A Headquarter staff member opens a brand's 費用 (Fee) tab and edits the enrollment fee / registration fee (or brand-specific equivalents) for a sub-brand, including scheduling a future price change, so that G-01 Primary Contract Master always has an up-to-date default to reference.

**Why this priority**: This is the feature's core Must-have (FR-002) and the reason the screen exists — it is the single source of truth that downstream contract defaults depend on.

**Verification**: Open a fee card, change the current amount/effective date, save, and confirm the card reflects the new values; add a scheduled revision with a future date and confirm it appears under "予約中の改定" with a pending badge.

**Acceptance Scenarios**:

1. **Given** a fee card for a sub-brand, **When** the user opens its edit action, **Then** an edit panel shows both fee items' current name, amount (tax-included), and effective date, plus any scheduled revisions.
2. **Given** the user enters a new scheduled revision with a future effective date and a valid amount, **When** they save, **Then** the fee card lists the revision under "予約中の改定" with its effective date, amount, and who/when it was registered.
3. **Given** the user enters a scheduled revision whose effective date duplicates another revision on the same fee item, **When** they attempt to save it, **Then** a validation message flags the duplicate date and the entry is not accepted.
4. **Given** the user enters a past effective date for the current setting or a revision, **When** they save, **Then** a warning is shown that the change applies immediately, but the save is still permitted.
5. **Given** the user leaves a required amount or effective date blank, or enters a negative/non-integer amount, **When** they attempt to save, **Then** a validation error is shown and the save is blocked.
6. **Given** the user's role is Manager, Staff, Trainer, or Observer, **When** they view the fee tab, **Then** no edit, disable, or delete controls are available to them.

---

### User Story 3 - Edit a brand's name (Priority: P3)

A Headquarter staff member opens the quick-edit panel from the brand list to correct or update a brand's display name. The brand ID itself cannot be changed because it is the internal system key.

**Why this priority**: Smaller in scope than fee maintenance but still a distinct Must-have from FR-001 ("本部のみが編集可能" / edit access restricted to Headquarter) and independently shippable.

**Verification**: Open a brand's edit action from the list, change the name, save, and confirm the list reflects the new name; confirm the brand ID field is read-only with an explanatory note.

**Acceptance Scenarios**:

1. **Given** the edit panel is open for a brand, **When** the user views the brand ID field, **Then** it is displayed read-only with a note that it cannot be changed because it is the internal system key.
2. **Given** the user changes the brand name and saves, **When** the panel closes, **Then** the brand list shows the updated name.
3. **Given** the user's role is not Headquarter or System, **When** they view the brand list, **Then** the edit action is not available to them.

---

### User Story 4 - Retire a fee entry and review change history (Priority: P4)

A Headquarter staff member disables or deletes a sub-brand's fee master entry when it is no longer applicable, and separately reviews the 変更履歴 (change history) tab to see who changed which fee field and when, for audit purposes.

**Why this priority**: Supporting/lifecycle functionality — valuable for data hygiene and auditability, but the feature is usable end-to-end without it.

**Verification**: Disable a fee entry and confirm its status badge flips to 無効 and its disable action becomes unavailable; delete a fee entry and confirm it disappears from the list (and that the tab shows an empty state if none remain); open the change history tab and confirm entries show timestamp, actor, target, field, before/after values.

**Acceptance Scenarios**:

1. **Given** an active fee entry, **When** the user confirms "無効にする" in the confirmation dialog, **Then** the entry's status badge changes to 無効 and its own disable action becomes unavailable.
2. **Given** any fee entry, **When** the user confirms "削除する" in the confirmation dialog, **Then** the entry is removed from the fee tab.
3. **Given** all fee entries for a brand have been removed, **When** the fee tab is viewed, **Then** an empty state is shown instead of an empty list.
4. **Given** the 変更履歴 tab is opened, **When** entries exist, **Then** each row shows changed-at timestamp, changed-by actor, target (brand/sub-brand), changed field, before value, and after value.

### Edge Cases

- What happens when a search term matches zero brands? → Filtered empty state with a "clear filters" action (already covered in US1 AS2).
- How does the system handle a fee amount of exactly 0? → Permitted; validation only rejects negative or non-integer values.
- How does the system handle a fee amount above the storage limit (e.g. 10 digits)? → Rejected client-side under the field with 「定価（税込）は2,147,483,647以下で入力してください」. Y-07/API-074 define no business maximum, so the cap is the API's integer column limit (BE MR !933 answers anything larger with 400 `E-VAL-001` `too_large`) (Y-07 - Bug No.1).
- What happens if a user without edit rights attempts to trigger an edit/disable/delete action via direct interaction (e.g., replayed request)? → The action must be rejected server-side per the permission matrix, independent of what the UI hides.
- How does the system handle a brand with no sub-brand distinction (FIT365) versus one with multiple (JOYFIT)? → Fee cards are keyed by sub-brand where applicable and by brand alone where not; the UI must not assume every brand has sub-brands.
- What happens when a scheduled revision's effective date arrives? → It becomes the new current setting automatically; this transition is a backend/system responsibility, not a user action within this screen.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a list of all registered brands showing brand ID and brand name only (no cost/fee columns in the list view).
- **FR-002**: System MUST support keyword search over the brand list (matching brand name and brand ID) with a clearable filtered-results indicator and an empty state when no brand matches.
- **FR-003**: System MUST allow navigating from a brand list row into that brand's detail page, showing basic info, fee, and change-history tabs, with the fee and change-history tabs showing their item counts.
- **FR-004**: System MUST restrict brand detail access to System, Headquarter, Manager, and Staff roles; Trainer and Observer roles MUST see an access-denied message instead of brand data when navigating to the detail page. Viewing roles see all brands with no per-store scoping restriction (data scope is brand-wide, not store-scoped).
- **FR-005**: System MUST allow Headquarter/System roles to edit a brand's name; the brand ID MUST be displayed read-only and MUST NOT be editable once created, since it is used as the internal system key.
- **FR-006**: System MUST manage enrollment/registration fee settings per sub-brand (JOYFIT, JOYFIT24, JOYFIT YOGA, JOYFIT+) or per brand where no sub-brand distinction exists (FIT365), with all monetary amounts stored and displayed tax-included.
- **FR-007**: System MUST allow Headquarter/System roles to edit each fee item's name, current amount, and current effective date.
- **FR-008**: System MUST allow Headquarter/System roles to schedule one or more future fee revisions (effective date + amount) per fee item, shown as "pending" until their effective date arrives.
- **FR-009**: System MUST validate that a fee item's required fields (effective date, amount) are present, that amounts are non-negative integers no greater than 2,147,483,647 (the API's integer limit), and that no two revisions on the same fee item share an effective date; validation failures MUST block save and surface a clear message.
- **FR-010**: System MUST warn (without blocking) when a current-setting or scheduled-revision effective date is in the past, noting the change takes effect immediately.
- **FR-011**: System MUST allow Headquarter/System roles to disable a fee entry (marking it 無効/inactive) and to delete a fee entry, each behind an explicit confirmation step; a disabled entry's own disable action MUST become unavailable.
- **FR-012**: System MUST restrict all brand-name edits and all fee create/edit/disable/delete actions to Headquarter and System roles; Manager, Staff, Trainer, and Observer MUST have no access to these actions (view-only, or no access at all per FR-004).
- **FR-013**: System MUST display a change-history log per brand showing, for each recorded change: timestamp, actor, target (brand/sub-brand), changed field, previous value, and new value. For a fee amount, the previous and new values each carry the 有効開始日 of their own side in one cell, e.g. 「¥3,000（2026/04/23〜）」 → 「¥3,300（2026/10/15〜）」 (G-05 FR-004 変更前/変更後有効開始日; API `changes[].beforeEffectiveDate` / `afterEffectiveDate`). The table keeps the prototype's three columns 変更項目 / 変更前 / 変更後; a side with no value shows 「—」 (G-05 Bug_No1).
- **FR-014**: System MUST show an empty state on the fee tab when a brand has no remaining fee entries.
- **FR-015**: System scope for this feature covers exactly the two currently defined brands (JOYFIT, FIT365); registering a wholly new brand or adding a fee entry from scratch is out of scope for this phase.

### Key Entities _(include if feature involves data)_

- **Brand**: A top-level brand master record — immutable brand ID (internal key), editable display name, active status. Owns one or more fee entries.
- **Sub-Brand Fee Entry**: A fee master record scoped to a brand (and sub-brand where applicable) — two fee items (name, tax-included amount, effective date), active/inactive status, and zero or more scheduled revisions.
- **Scheduled Fee Revision**: A future-dated change to a fee item's amount, carrying its own effective date and an audit stamp (registered-at, registered-by) once saved.
- **Change History Entry**: An audit record of a single field-level change to a brand or fee entry — timestamp, actor, target, field name, before value, after value.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Headquarter staff can locate either registered brand from the list (via scan or search) in under 5 seconds.
- **SC-002**: 100% of fee-amount save attempts with a negative, non-integer, blank, or duplicate-date value are blocked with a validation message before any data changes.
- **SC-003**: Manager and Staff users can view all brand and fee data but are presented with zero enabled edit, disable, or delete controls.
- **SC-004**: Trainer and Observer users attempting to open a brand detail page are shown the access-denied message 100% of the time, with 0% exposure of underlying fee data.
- **SC-005**: A scheduled fee revision saved with a future date is visible as "pending" on the fee card immediately after save, with no page reload required.

## Assumptions

- Brand scope for this feature is fixed to the two currently defined brands (JOYFIT, FIT365); adding a brand-new brand record is explicitly deferred to a later phase, consistent with both the requirement doc's "将来的なブランド追加はシステム設定カテゴリー内で扱う" note and the V0 mockup's phase-gated (disabled) "新規登録" affordances.
- Editing a brand's basic info beyond its name (e.g., adding new descriptive fields) is out of scope; the V0 mockup shows a phase-gated, disabled "基本情報を編集" action reserved for a future phase.
- Registering a brand-new fee entry from scratch (as opposed to editing an existing one) is out of scope for this phase, mirroring the mockup's phase-gated "新規登録" action on the fee tab.
- Sub-brand values are a fixed enumeration owned by JOYFIT (JOYFIT, JOYFIT24, JOYFIT YOGA, JOYFIT+); FIT365 has no sub-brand distinction. Expanding this enumeration is a future requirements change, not a runtime configuration option.
- All monetary values are Japanese Yen, tax-included, and represented as non-negative integers.
- Downstream consumption of these fee values by G-01 Primary Contract Master (as default values, individually overridable per contract) is an existing integration point and is not re-specified here.
- Brand-level visual badges (e.g., color-coded brand chips used elsewhere in the app) are a shared display concern outside this feature's functional scope; this spec covers the brand management screens only.
