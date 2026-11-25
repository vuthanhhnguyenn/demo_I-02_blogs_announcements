# Feature Specification: CRM Maintenance Management

**Feature Branch**: `017-crm-maintenance-management`
**Created**: 2026-07-16
**Status**: Draft
**PO Spec**: `Y-10` — CRMメンテナンス管理 (CRM Maintenance Management)
**Source**: UI prototype (`crm-maintenance-list.tsx`, `crm-maintenance-detail.tsx`, `maintenance-form.tsx`) + Requirement spec `Y-10.md`
**Input**: User description: "Create spec for /home/amira/Desktop/DEV/amira/fitness/fitness-spec/crm/requirements/Y-10.md , UI code is in crm-maintenance-detail.tsx, crm-maintenance-list.tsx, maintenance-form.tsx"

## Clarifications

### Session 2026-07-20

- Q: How should advance notification (FR-007) be represented now, given the backend contract defines only a fire-and-forget send endpoint with no per-record notification status? → A: Bring FR-007 in scope as a full mock feature — the mock persists a per-record notification status (sent flag + kind auto/manual + sentAt), the list shows a 通知 (sent / unsent / — for completed) column, the detail shows a notification card, and send/re-send simulates success and updates that status. This is a mock-ahead-of-backend extension: the real list/detail responses carry no notification-status field yet — only the send action exists in the real API (async, 202 Accepted).
- Q: When a new maintenance record is created via the mock, what is its initial notification state? → A: Unsent (未) — `create()` leaves the notification status null; notification is sent manually via the detail-screen button. The mock stays simple; the "auto" kind is only used for seed records that represent past auto-on-registration sends. (Once the real backend performs server-side auto-send on registration, a refetch will naturally surface the sent/auto status without any UI change.)
- Q: What does clicking send / re-send do in the mock? → A: The mock send updates the record's persisted notification status to `{ kind: "手動送信" (manual), sentAt: now }` and invalidates the query so the list/detail refetch and show "済" with the latest timestamp. Re-sending an already-sent record updates `sentAt` to the new send time. (The real backend remains fire-and-forget with no status persisted; this state update is part of the mock-ahead-of-backend extension.)
- Q: (follow-up) The notification model above is too elaborate — how far should it be simplified? → A: Reduce it to a single `notified` boolean. Created → 未; the detail send button opens a confirmation popup (kept — UI requirement) and confirming sets `notified = true` (済). Remove send kind (auto/manual), send timestamp, recipient-count display, re-send, and the completed-status lock. The send remains a fake mock (flag flip only, no real delivery). This **supersedes** the kind/timestamp/count/re-send details recorded in the three bullets above.
- Q: (follow-up) After the boolean simplification removed re-send, should manual re-send be allowed again? → A: Yes — keep the single `notified` boolean, but the detail send button stays visible even after "済" (relabeled "通知を再送信") so a System user can manually re-send any number of times. This is a deliberate extension consistent with FR-007's manual-send trigger and its 異常系 (re-send on failure) clause; each re-send reuses the same confirm popup and the idempotent `notify()` flag set. This reverses only the "no re-send" point of the bullet above — everything else (single boolean, no kind/timestamp/count, no completed-lock) stands.

## User Scenarios _(mandatory)_

### User Story 1 - Register a CRM maintenance window with allowed users (Priority: P1)

A System-role staff member learns that the infrastructure team (TAS) will perform CRM server maintenance (e.g. infra work, a system update). Before that happens, they register the maintenance window in the CRM — its title, start/end date-time, the message users should see, and the list of staff (developers, QA) who must still be able to access the CRM admin screens during that window.

**Why this priority**: This is the core reason the feature exists — without a registered maintenance window and its allowed-user list, the infrastructure side has no configuration to enforce access control against during CRM maintenance. Nothing else in this feature has value without this capability.

**Verification**: As a System-role user, open CRM Maintenance Management, create a new record with a title, a start/end date-time, and a message; search for and add at least one staff member to the allowed-user list; confirm and save. Verify the new record appears in the list with the correct computed status and allowed-user count.

**Acceptance Scenarios**:

1. **Given** the registration form is open, **When** the user fills in title, start date-time, end date-time, and maintenance message, adds one allowed user, and confirms, **Then** the record is saved and appears in the maintenance list with an auto-generated ID.
2. **Given** the user leaves the title empty and submits, **When** validation runs, **Then** the system shows "タイトルは必須です。" and does not proceed to the confirmation step.
3. **Given** the user sets an end date-time earlier than the start date-time, **When** they submit, **Then** the system shows "終了日時は開始日時より後の日時を入力してください。" and blocks submission.
4. **Given** the new period overlaps an existing registered maintenance period, **When** the user submits, **Then** the system shows "登録しようとしている期間は既存のメンテナンス期間と重複しています。" and blocks submission.
5. **Given** the user opens the staff search dialog and searches by a user ID fragment, name fragment, or role, **When** results are found, **Then** they can select one or more staff and add them to the allowed-user list in a single action.
6. **Given** the staff search returns no matches, **When** the search is run, **Then** the system shows "該当するユーザーが見つかりません".

---

### User Story 2 - View the CRM maintenance list and record detail (Priority: P2)

A System or Headquarter staff member wants to see all planned, in-progress, and completed CRM maintenance windows at a glance — to plan around them, confirm who has emergency access, or check the details of a specific one.

**Why this priority**: Visibility is required for the feature to be useful day-to-day (planning, oversight, and coordination with other affected systems), but it depends on records already existing from Story 1.

**Verification**: Open the maintenance list as a System or Headquarter user; search, filter by status, and sort; click a record to view its full read-only detail including allowed users. Confirm a Manager/Staff/Trainer/Observer user is denied access.

**Acceptance Scenarios**:

1. **Given** maintenance records exist, **When** the list loads, **Then** each row shows ID, title, start date-time, end date-time, status, allowed-user count, and creation date, with status computed from the current date-time relative to the record's start/end.
2. **Given** the user searches by ID or title, **When** a match exists, **Then** only matching records are shown; if none match, an empty/filtered state is shown with an option to clear filters.
3. **Given** the user filters by status ("予定" / "メンテナンス中" / "完了"), **When** applied, **Then** only records with that computed status are shown.
4. **Given** the user selects a record from the list, **When** the detail view opens, **Then** all registered fields (title, period, message, notes, allowed users) are shown read-only.
5. **Given** the current user has the System role, **When** viewing the detail, **Then** edit and delete controls are shown; **given** the user has the Headquarter role, **when** viewing the same detail, **then** no edit or delete controls are shown.
6. **Given** the current user has the Manager, Staff, Trainer, or Observer role, **When** they navigate to CRM Maintenance Management, **Then** they see an access-denied message and no maintenance data.

---

### User Story 3 - Edit or delete an existing maintenance record (Priority: P3)

A System-role staff member needs to correct or cancel a previously registered maintenance window — for example, updating the message, extending the end time, adding an allowed user during an emergency, or removing a record that's no longer needed.

**Why this priority**: This is lifecycle management on top of Story 1/2 — valuable, but only relevant once records exist and only exercised occasionally (corrections, cancellations, emergency access grants).

**Verification**: As a System-role user, edit an existing record's message and allowed-user list, save, and confirm the changes persist. Attempt to change the start time or delete a record while it is "メンテナンス中" (in progress) and confirm both are blocked, then confirm the same record can still receive newly added allowed users while in progress.

**Acceptance Scenarios**:

1. **Given** an existing record with status "予定" (scheduled) or "完了" (completed), **When** the System user edits any field and confirms, **Then** the updated values are saved and reflected in the list and detail views.
2. **Given** a record's status is currently "メンテナンス中" (in progress), **When** the System user opens the edit form, **Then** the start date-time field is locked/disabled with an explanatory message, but all other fields remain editable.
3. **Given** a record's status is "メンテナンス中", **When** the System user adds a new allowed user via the search dialog and saves, **Then** the addition succeeds despite the record being in progress.
4. **Given** a record's status is "メンテナンス中", **When** the System user attempts to delete it, **Then** the delete action is unavailable/disabled and, if attempted, the system shows "メンテナンス実施中のため削除できません。".
5. **Given** a record's status is "予定" or "完了", **When** the System user chooses to delete it, **Then** a confirmation dialog ("このCRMメンテナンス情報を削除しますか？") is shown, and confirming removes the record and its allowed-user list.
6. **Given** the System user cancels the delete confirmation, **When** they dismiss the dialog, **Then** the record remains unchanged.

### Edge Cases

- What happens when a user tries to edit or delete a record's allowed-user list at the exact moment its status transitions from "予定" to "メンテナンス中"? The system should always evaluate the current status at the time of the action, not a cached value.
- How does the system handle two maintenance periods that only touch at a boundary (one ends exactly when another starts)? Overlap detection must have a single unambiguous rule (touching boundaries are not treated as overlapping unless they truly intersect).
- What happens when no maintenance records exist at all (first-time use)? The list shows an empty state, not an error.
- What happens when a Headquarter user attempts to reach the create or edit form directly (e.g. via a stale link)? The action must be blocked the same way the button is disabled for that role.
- What happens when all allowed users are removed from a record before saving? The record must still save successfully with an empty allowed-user list (title/period/message are the only mandatory content).
- How does the system behave when a staff search matches a user already on the allowed-user list? That user should be indicated as already added and not addable a second time.
- Once a record is "済", the detail card keeps a manual send button (relabeled "通知を再送信") next to the "通知済み" indicator, so a System user can re-send at any time (FR-024).
- What happens when a Headquarter user opens the detail of a record? They see the notification status; the send/re-send button (shown in both "未" and "済" states) is inactive for the Headquarter role (System-only).
- How is the notification column rendered for a "完了" record? It shows "—" (not 済/未).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users with the System role to register a new CRM maintenance record with title (required), start date-time (required), end date-time (required), maintenance message (required), and notes (optional).
- **FR-002**: System MUST validate required fields on submission and show "{項目名}は必須です。" for each missing required field.
- **FR-003**: System MUST validate the start and end date-time format, showing "開始日時の入力形式は正しくありません。" or "終了日時の入力形式は正しくありません。" respectively for invalid values.
- **FR-004**: System MUST reject a maintenance record whose end date-time is not later than its start date-time, showing "終了日時は開始日時より後の日時を入力してください。"
- **FR-005**: System MUST reject a new or edited maintenance period that overlaps any other existing maintenance period (excluding the record being edited itself), showing "登録しようとしている期間は既存のメンテナンス期間と重複しています。"
- **FR-006**: System MUST show a confirmation step summarizing the title, period, and allowed-user count before finalizing a registration or an edit, and only persist the change once the user confirms.
- **FR-007**: System MUST let a System-role user search CRM staff by user ID (partial match), name (partial match), and role (exact match) in order to add them to a maintenance record's allowed-user list.
- **FR-008**: System MUST support adding multiple staff to the allowed-user list in one confirmation, and removing any individual allowed user from the list before saving.
- **FR-009**: System MUST show "該当するユーザーが見つかりません" when a staff search returns zero results, and MUST prevent adding a staff member who is already on the allowed-user list a second time.
- **FR-010**: System MUST display a list of all CRM maintenance records showing ID, title, start date-time, end date-time, computed status, allowed-user count, and creation date, with search (by ID/title), status filtering, column sorting (by start date-time, end date-time, created date), and pagination.
- **FR-011**: System MUST compute each record's status ("予定" / "メンテナンス中" / "完了") by comparing the current date-time to its stored start and end date-time; status MUST NOT be a manually set or persisted fixed value.
- **FR-012**: System MUST restrict the new-registration action to the System role; the control MUST be inactive for any other role that can view the list.
- **FR-013**: System MUST allow any user who can view the list to select a record and view its full detail (all registered fields plus the allowed-user list) in read-only form.
- **FR-014**: On the detail view, System MUST show edit and delete controls only to the System role; the Headquarter role MUST see the same detail with no edit or delete controls.
- **FR-015**: System MUST allow the System role to edit all fields of an existing record, including the allowed-user list, applying the same validation and overlap rules as registration (FR-002 through FR-005).
- **FR-016**: System MUST prevent changing the start date-time of a record whose computed status is "メンテナンス中" (in progress) — the field MUST be locked/disabled with an explanatory message, and if changed anyway on submission, the system shows "メンテナンス中のため開始日時は変更できません。"
- **FR-017**: System MUST allow the System role to add allowed users to a record even while its computed status is "メンテナンス中," independent of the start-date-time lock in FR-016.
- **FR-018**: System MUST allow the System role to delete a maintenance record and its associated allowed-user list, but only after the user confirms via a dialog: "このCRMメンテナンス情報を削除しますか？"
- **FR-019**: System MUST prevent deletion of a record whose computed status is "メンテナンス中" — the delete control MUST be disabled/unavailable, and if attempted anyway, the system shows "メンテナンス実施中のため削除できません。"
- **FR-020**: System MUST restrict all access to this feature (list, detail, create, edit, delete) to the System and Headquarter roles; the Manager, Staff, Trainer, and Observer roles MUST see an access-denied message and no maintenance data when they attempt to reach any screen in this feature.
- **FR-021**: System MUST show an empty-state message when no maintenance records exist, and a distinct filtered-empty state (with an option to clear filters) when search/filter criteria match zero records.

#### Advance Notification (FR-007 — Should; mock-implemented)

- **FR-022**: System MUST display a notification-status column on the maintenance list for each record: "済" (advance notification sent), "未" (not yet sent), or "—" for records whose computed status is "完了".
- **FR-023**: On the detail view, System MUST show an advance-notification card indicating whether the record has been notified — "通知済み" when sent, or a helper message when not yet sent — and MUST always show the manual send button (labeled "通知を送信" while 未, "通知を再送信" once 済). The status is a single boolean; no send kind, timestamp, or recipient-count is displayed (simplified per the 2026-07-20 clarification).
- **FR-024**: System MUST let the System role send an advance notification from the detail view; the send control MUST be inactive for the Headquarter role. The send button remains available even after a record is notified (relabeled "通知を再送信"), so the System role MAY re-send manually any number of times — aligned with FR-007's manual-send trigger and its 異常系 (re-send on send failure) clause. Each send still goes through the confirmation popup (FR-025) and is guarded against double-fire while a send is in flight.
- **FR-025**: System MUST show a confirmation popup before sending that previews the notification content (title, start/end date-time, maintenance message) and notes that allowed users additionally receive a message that they retain access during the window; the notification is sent only after the user confirms, and the system shows "通知を送信しました" on success.
- **FR-026**: The advance notification targets all CRM users; its content is derived from the maintenance record (title, period, message), with allowed users receiving the additional access note. The mock is a fake send — it sets the flag only, with no real delivery.
- **FR-027**: A newly created maintenance record MUST start "未" (not-yet-notified); confirming the send MUST set the record's `notified` flag to true, and the list and detail views MUST reflect the updated status after refetch.

### Key Entities _(include if feature involves data)_

- **CRM Maintenance Record**: Represents one CRM server maintenance window. Attributes: system-assigned ID, title, start date-time, end date-time, maintenance message (shown to restricted users during the window), notes (optional), computed status, creation date/creator, last-updated date, and (mock-only, ahead of the backend contract) a `notified` boolean — `true` = 通知済み (済), `false` = 未 (not yet notified). Has a one-to-many relationship to allowed users.
- **Allowed User**: A staff member permitted to access the CRM admin screens during a given maintenance window. Attributes: staff user ID, name, role — sourced from the existing CRM staff master, not created or edited here.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A System-role user can register a complete CRM maintenance window (title, period, message, at least one allowed user) in under 2 minutes.
- **SC-002**: 100% of displayed maintenance records show a status that always matches the current date-time relative to their stored start/end period — there is no way for status to drift out of sync since it is never stored as a fixed value.
- **SC-003**: Attempts to save an overlapping maintenance period are blocked before the record is saved in all tested overlap scenarios (fully nested, partially overlapping, and adjacent-but-touching periods correctly distinguished from true overlaps).
- **SC-004**: Users in the Manager, Staff, Trainer, and Observer roles cannot view or reach any screen of this feature, verified for all four roles.
- **SC-005**: A System-role user can find and add a specific staff member to the allowed-user list in 3 or fewer interactions (search, select, confirm).
- **SC-006**: A maintenance record currently in progress can never be deleted and never has its start time changed, verified with zero successful attempts across repeated tries.
- **SC-007**: A System user can send an advance notification from the detail view (via the confirmation popup) and, after the action, sees the record's status change 未 → 済 on both the detail card and the list column after refetch; the send control is inactive for the Headquarter role.

## Assumptions

- The actual enforcement of access restriction during a maintenance window (blocking non-allowed users from logging in) is performed by the infrastructure/platform side (TAS); this feature only manages the configuration data (period, message, allowed users) that the platform side reads — it does not implement the access-blocking mechanism itself.
- Allowed-user search draws from the existing CRM staff master; this feature does not create, edit, or otherwise manage staff records.
- CRM maintenance periods cannot overlap with each other, consistent with the platform-side control this feature's data feeds into.
- CRM Maintenance Management operates system-wide — it is not configured per brand (JOYFIT / FIT365) and is fully independent of the separate mobile-app maintenance feature; actions in one do not affect the other.
- Advance notification of a scheduled maintenance window to CRM users (the source requirement's "Should"-priority FR-007) is now in scope for this feature as a mock-implemented capability (see the advance-notification requirements below and the Clarifications section). Because the backend list/detail responses do not yet carry a notification-status field, the per-record notification status surfaced in the UI is a mock-only extension ahead of the backend contract; in the real API only the send action exists (fire-and-forget, 202 Accepted, no status persisted or returned).
- A dedicated maintenance-history view (the "Could"-priority FR-008) is not represented in the UI prototype for this feature and is deferred — out of scope for this spec's initial implementation. Status filtering by "完了" in the list (FR-010) already provides basic ad-hoc access to past records in the meantime.
