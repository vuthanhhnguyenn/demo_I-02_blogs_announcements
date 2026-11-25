# Feature Specification: App Version Management (Detail Screen)

**Feature Branch**: `017-app-version-detail`
**Created**: 2026-07-14
**Status**: Draft
**PO Spec**: `Y-05` — アプリ配信バージョン管理 (App Release Version Management), document version `261112_v3`
**Source**: `requirements/Y-05.md` 261112_v3 (dx-fitness/fitness-spec @ 3a2fdec — FR-M003, FR-M005, permission matrix) + backend contract `GET` / `DELETE /api/v1/admin/app-versions/{id}` (fitness-backend-v2 `admin-app-version.controller.ts`) + UI prototype `pages/app-version-detail.tsx` (dx-fitness/fitness-crm-ui @ 9428dc2 — still at spec v1, visual patterns only; see [Decisions](#decisions-2026-11-13))
**Last synced**: 2026-11-13 — re-aligned to Y-05 261112_v3 + local BE (fitness-backend-v2 feat/anhnv/app-version-and-maintenance, commit e3381567)
**Input**: User description: "Create spec for screen \"Y05 アプリ配信バージョン管理\" (App version management). Screen Spec: requirements/Y-05.md. UI code: pages/app-version-detail.tsx. API spec: docs/api/Y-05.md. Scope: This scope only includes the detail screen. The create/edit form screens are not included and will be implemented later. The list screen was completed earlier and is available for reference."

## Scope

This feature covers the **detail screen of one version setting** (PO FR-M003): a read-only view of every item, its status and audit information, plus deleting the setting in place while it is still scheduled (FR-M005), reusing the list screen's delete (`016-app-version-management`). Editing happens on `018-app-version-form`; this screen only links to it. The version setting entity is defined in `016-app-version-management/data-model.md`.

## User Scenarios _(mandatory)_

### User Story 1 - Review one version setting (Priority: P1)

A Headquarters staff member opens a setting from the list to confirm its brand, 適用開始日時 and status, the minimum and latest version in effect per OS (including values carried over from earlier settings), remarks, and who created or last updated it.

**Why this priority**: This is the purpose of the screen.

**Verification**: Open a setting from the list, check every item against the list row and the backend record, then use the back link.

**Acceptance Scenarios**:

1. **Given** an existing setting, **When** a Headquarters staff member opens its detail screen, **Then** the title is `<BRAND> <YYYY/MM/DD HH:mm>` (e.g. 「JOYFIT 2026/11/18 10:00」) with `ID: <id>` below it, and the 「バージョン情報」 card shows ブランド, 状態, 適用開始日時; iOS 最低バージョン, iOS 最新バージョン, Android 最低バージョン, Android 最新バージョン; 備考; 作成者, 作成日時, 更新者, 更新日時.
2. **Given** a version slot left blank on this setting but entered on an earlier setting of the brand, **When** the screen loads, **Then** the slot shows the carried-over value (e.g. `2.0.0（200）`) muted, with the hover text 「直前の設定から引き継ぎ」; a slot with no value in effect shows 「—」.
3. **Given** a setting never updated, **When** the screen loads, **Then** 更新者 and 更新日時 show 「—」; empty 備考 shows nothing, and line breaks in 備考 are kept.
4. **Given** the detail screen was opened from the list, **When** the staff member selects 「アプリ配信バージョン管理に戻る」, **Then** they return to the list with its previous filters and page.
5. **Given** an ID that does not exist or belongs to a deleted setting, **When** the detail screen is opened (including by direct URL), **Then** the not-found state 「アプリバージョンが見つかりません」 is shown.

---

### User Story 2 - Delete a scheduled setting from its detail view (Priority: P2)

A Headquarters staff member reviewing a scheduled setting notices it is wrong and deletes it without going back to the list. Settings in effect or ended are history and offer no edit or delete.

**Why this priority**: Reviewing the details is often when a mistake is noticed, but it is secondary to viewing.

**Verification**: As a Headquarters/System user, open a 予約 setting, delete it (cancel once, then confirm) and check the list; open an 適用中 and an 終了 setting and check there are no 編集 / 削除 buttons.

**Acceptance Scenarios**:

1. **Given** a Headquarters staff member views a 予約 setting, **When** they select 「削除」, **Then** the dialog 「このバージョン設定を削除しますか？」 appears with 「<title> のバージョン情報を削除します。この操作は取り消せません。」 (e.g. 「JOYFIT 2026/11/18 10:00 のバージョン情報を削除します。この操作は取り消せません。」).
2. **Given** the dialog is open, **When** the staff member cancels, **Then** nothing changes.
3. **Given** the dialog is open, **When** the staff member confirms, **Then** the setting is deleted, the toast 「アプリバージョンを削除しました」 is shown and the user returns to the list, where it no longer appears.
4. **Given** an 適用中 or 終了 setting, **When** any user opens its detail screen, **Then** no 「編集」 or 「削除」 button is shown.
5. **Given** the server refuses the delete (started in the meantime — E-APP-003; a later setting would carry over a latest below its minimum — E-APP-004; already deleted — E-APP-001), **When** the staff member confirms, **Then** the server's message is shown in an error toast and the user stays on the screen.

---

### User Story 3 - Read-only review for non-managing roles (Priority: P3)

A Manager, Staff member, or Observer opens a setting to answer a member inquiry, without being able to change it.

**Why this priority**: Read access matters for support, but these roles cannot change anything either way.

**Verification**: Sign in as each read-only role, open a 予約 and an 適用中 setting, and try the edit URL directly.

**Acceptance Scenarios**:

1. **Given** a Manager, Staff, or Observer user opens a 予約 setting, **Then** every item is shown and 「編集」 / 「削除」 are visible but disabled (tooltip 「本部権限が必要です」); triggering them does nothing.
2. **Given** a Manager, Staff, or Observer user opens an 適用中 or 終了 setting, **Then** every item is shown and there are no buttons (same as for Headquarters).
3. **Given** a user without edit permission, **When** they open the edit screen URL directly, **Then** the standard 403 page is shown.
4. **Given** a Trainer, **When** they open the detail screen by any means, **Then** the standard 403 page is shown.

### Edge Cases

- What happens when loading fails for a reason other than 404? An error state with 「再試行」 is shown instead of the not-found state.
- What happens when a 予約 setting's 適用開始日時 passes while the screen is open? The status and buttons reflect page load time; 「編集」 then leads to the edit screen's "cannot be edited" state, and 「削除」 is refused with E-APP-003 (US2-5).
- What happens when the setting is deleted by someone else while the screen is open? Confirming the delete shows the E-APP-001 message; reloading shows the not-found state.
- Where is the former yellow reminder 「メンテナンス中に強制アップデートのポップアップを表示させないように日時設定をしてください」? It is no longer shown (D4).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display read-only, in the 「バージョン情報」 card: ブランド (brand badge), 状態 (badge 適用中 / 予約 / 終了), 適用開始日時 (`YYYY/MM/DD HH:mm`); iOS 最低バージョン, iOS 最新バージョン, Android 最低バージョン, Android 最新バージョン; 備考 (line breaks kept, empty when unset); 作成者, 作成日時, 更新者, 更新日時 (更新者 / 更新日時 「—」 when never updated). The record ID appears only in the subtitle.
- **FR-002**: Each version slot MUST follow the list's display rule (`016` FR-002): the value in effect after carry-over as `<version name>（<build number>）`; carried over → muted with 「直前の設定から引き継ぎ」; none → 「—」.
- **FR-003**: The page title MUST be `<BRAND> <YYYY/MM/DD HH:mm>` and the subtitle `ID: <id>`.
- **FR-004**: System MUST provide the back link 「アプリ配信バージョン管理に戻る」 to the list, restoring the list's filters and page when the screen was reached from it.
- **FR-005**: The 「編集」 and 「削除」 header buttons MUST be rendered only when 状態 is 予約; for 適用中 and 終了 they are not rendered for any role (PO FR-M003).
- **FR-006**: When rendered, both buttons MUST be visible to every role that can view the screen; for roles without edit/delete permission they are disabled with the tooltip 「本部権限が必要です」.
- **FR-007**: 「編集」 MUST route to the edit screen of this setting, keeping the list as the return destination.
- **FR-008**: 「削除」 MUST open the same confirmation as the list (`016` FR-012), naming the setting by its page title. On success: toast 「アプリバージョンを削除しました」 and return to the list. On failure: the server's message in an error toast; the screen stays.
- **FR-009**: When the setting does not exist or is deleted (404 E-APP-001), System MUST show the not-found state 「アプリバージョンが見つかりません」; other load failures show an error state with retry.
- **FR-010**: Manager, Staff and Observer MUST be able to view the screen; the Trainer role MUST get the standard 403 page.
- **FR-011**: Direct URL access to the edit screen without edit permission MUST show the standard 403 page.

### Key Entities _(include if feature involves data)_

- **Version Setting**: the setting being viewed — brand, 適用開始日時, derived status, the four version pairs as entered and in effect after carry-over, 備考, creator/updater names and timestamps. Same entity as `016-app-version-management/data-model.md`; this screen adds no fields.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Headquarters staff member can read the minimum and latest version in effect for both OSes of a setting within 10 seconds of opening it.
- **SC-002**: 100% of access attempts by the Trainer role — via navigation or direct URL — are blocked with the standard 403 page before any data is shown.
- **SC-003**: 100% of deletes require an explicit confirmation, and no 適用中 / 終了 setting offers an edit or delete entry point.
- **SC-004**: 100% of requests for a non-existent or deleted setting show the not-found state rather than a blank page or an unhandled error.
- **SC-005**: Manager, Staff and Observer users have a 0% success rate on edit/delete, through the UI or by direct URL.

## Assumptions

- The edit screen (`018-app-version-form`) is specified separately; this screen only links to it.
- The setting is read with `GET /api/v1/admin/app-versions/{id}`; status and carried-over values come from the server at load time.
- Delete reuses the list screen's `DELETE /api/v1/admin/app-versions/{id}` (`016-app-version-management/contracts/delete-app-version.md`), unchanged.
- Role permissions follow the Y-05 v3 matrix, identical to the list: System and Headquarters edit/delete; Manager, Staff and Observer read only; Trainer no access.
- For a 予約 setting the system's visible-but-disabled pattern applies; for 適用中 / 終了 settings the buttons are hidden for everyone, because PO FR-M003 says to show edit/delete only while the status is 予約.

### Decisions (2026-11-13)

Agreed with the PO for this round; numbering is shared across 016 / 017 / 018 (D2 — store URL placement — concerns the list screen only).

- **D1 — Prototype lags the spec.** `pages/app-version-detail.tsx` @ 9428dc2 still shows spec v1 (ID field, single iOS/Android version code, リリース日, 作成日 / 更新日). The screen follows spec v3 (状態, 適用開始日時, four version slots, 作成者 / 更新者) and reuses the prototype's card and header layout.
- **D3 — Latest version now.** FR-S001 is implemented now because the backend supports it: the card shows iOS / Android 最新バージョン next to the minimums.
- **D4 — Maintenance reminder removed.** The yellow alert 「メンテナンス中に強制アップデートのポップアップを表示させないように日時設定をしてください」 is removed: in v3 the launch check gives maintenance precedence, so the 適用開始日時 does not need to avoid maintenance windows (PO 業務フロー メンテナンスとの関係). The prototype still shows it.
