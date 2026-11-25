# Feature Specification: App Version Management (List Screen)

**Feature Branch**: `016-app-version-management`
**Created**: 2026-07-13
**Status**: Draft
**PO Spec**: `Y-05` — アプリ配信バージョン管理 (App Release Version Management), document version `261112_v3`
**Source**: `requirements/Y-05.md` 261112_v3 (dx-fitness/fitness-spec @ 3a2fdec — FR-M001, FR-M005, FR-M006, permission matrix) + backend contract `GET /api/v1/admin/app-versions`, `DELETE /api/v1/admin/app-versions/{id}`, `GET`/`PUT /api/v1/admin/app-store-urls` (fitness-backend-v2 `admin-app-version.controller.ts`, `admin-app-store-url.controller.ts`) + UI prototype `pages/app-management.tsx` (dx-fitness/fitness-crm-ui @ 9428dc2 — still at spec v1, visual patterns only; see [Decisions](#decisions-2026-11-13))
**Last synced**: 2026-11-13 — re-aligned to Y-05 261112_v3 + local BE (fitness-backend-v2 feat/anhnv/app-version-and-maintenance, commit e3381567)
**Input**: User description: "Create spec for scree \"Y05 アプリ配信バージョン管理\" (App version management). Screen Spec: requirements/Y-05.md. UI code: pages/app-management.tsx. API spec: docs/api/Y-05.md. Scope: This scope only includes the list screen. The create/edit form screens are not included and will be implemented later."

## Scope

This feature covers the **list screen of version settings** (バージョン設定). A version setting belongs to one brand (JOYFIT or FIT365), takes effect at its 適用開始日時, and sets per OS (iOS / Android) a **minimum version** (below it = required update) and a **latest version** (below it = optional update, PO FR-S001). Version values left blank carry over from the brand's previous setting (空欄の引き継ぎ).

Two interactions happen in place on this screen and are in scope: deleting a scheduled setting (confirmation dialog) and the **store URL settings** dialog (ストアの URL の設定, PO FR-M006). Registering/editing a setting (`018-app-version-form`) and its detail view (`017-app-version-detail`) are separate screens; this screen only provides their entry points. The app launch check (PO FR-M007) and the app-side update screens are backend/mobile concerns and out of scope.

## User Scenarios _(mandatory)_

### User Story 1 - Browse and filter version settings (Priority: P1)

A Headquarters staff member opens アプリ配信バージョン管理 to see which minimum and latest versions are in effect for each app and which settings are scheduled — for example before answering a member inquiry about a forced update.

**Why this priority**: This is the core purpose of the screen; without it, staff cannot see what the apps are being checked against.

**Verification**: Load the page, confirm the documented columns and the carried-over display, switch the brand and status filters, and confirm the list updates.

**Acceptance Scenarios**:

1. **Given** settings exist for both brands, **When** a Headquarters staff member opens the screen with no filter, **Then** settings of both brands are listed, newest 適用開始日時 first, each row showing brand, 適用開始日時 (`YYYY/MM/DD HH:mm`), 状態 badge, the four version columns and 備考.
2. **Given** the brand filter is set to 「JOYFIT」, **When** the list refreshes, **Then** only JOYFIT settings are shown and the count next to the title (`N件`) reflects the filtered total.
3. **Given** the status filter is set to 「予約」, **When** the list refreshes, **Then** only settings whose 適用開始日時 is still in the future are shown; brand and status filters combine (AND).
4. **Given** a setting left its Android minimum blank and an earlier JOYFIT setting entered `2.0.0` / build `200`, **When** the list loads, **Then** that row's Android 最低バージョン cell shows `2.0.0（200）` muted, with the hover text 「直前の設定から引き継ぎ」; a slot with no value entered up to that setting shows 「—」.
5. **Given** the screen is opened without a page-size choice, **When** the list loads, **Then** 50 rows are shown per page and the 表示件数 selector offers 25 / 50 / 100.
6. **Given** more settings exist than fit on one page, **When** the staff member selects the next page, **Then** the next set of settings loads and the "previous" control becomes enabled.

---

### User Story 2 - Read-only review for non-managing roles (Priority: P2)

A Manager, Staff member, or Observer opens the screen (and the store URL dialog) to answer member inquiries, without being able to change anything. Restricted controls stay visible but disabled; direct URLs to the create/edit screens are blocked.

**Why this priority**: These roles need the information for support, but only Headquarters-level staff may change what forces app updates.

**Verification**: Sign in as each read-only role, confirm the list and store URLs are visible, every write control is disabled, and the create/edit URLs show the 403 page.

**Acceptance Scenarios**:

1. **Given** a user with the Manager, Staff, or Observer role, **When** they open the screen, **Then** they can view and filter the list; 「新規登録」 is visible but disabled (tooltip 「本部権限が必要です」) and each row's 編集 / 削除 menu items are disabled with the 「本部」 badge.
2. **Given** a user with the Manager, Staff, or Observer role, **When** they open 「ストアの URL の設定」, **Then** they see the saved URLs and 更新 lines, but the four inputs are disabled and 「保存する」 is disabled (tooltip 「本部権限が必要です」).
3. **Given** a user without create or edit permission, **When** they navigate directly to the create or edit screen URL, **Then** the standard 403 Forbidden page is shown.
4. **Given** a user with the Trainer role, **When** they open the list screen by any means, including direct URL, **Then** the standard 403 Forbidden page is shown.

---

### User Story 3 - Delete a scheduled setting (Priority: P3)

A Headquarters staff member removes a scheduled (予約) setting that was registered by mistake (PO business flow 誤って登録したときの戻し ①). Settings that are in effect or ended stay as history and cannot be deleted; a change to them is made by registering a new setting.

**Why this priority**: Least frequent action, but mistakes must be removable before they take effect.

**Verification**: As a Headquarters/System user, delete a 予約 row (cancel once, then confirm) and check it disappears; open the menu of an 適用中 / 終了 row and check 編集 / 削除 are disabled with the explanation.

**Acceptance Scenarios**:

1. **Given** a Headquarters staff member opens the row menu of a 予約 setting, **When** they choose 「削除」, **Then** the dialog 「このバージョン設定を削除しますか？」 appears naming the setting as `<BRAND> <YYYY/MM/DD HH:mm>` (e.g. 「JOYFIT 2026/11/18 10:00 のバージョン情報を削除します。この操作は取り消せません。」).
2. **Given** the confirmation dialog is open, **When** the staff member cancels, **Then** the setting remains unchanged.
3. **Given** the confirmation dialog is open, **When** the staff member confirms, **Then** the setting is deleted, the toast 「アプリバージョンを削除しました」 is shown and the list is refreshed without it.
4. **Given** a Headquarters staff member opens the row menu of an 適用中 or 終了 setting, **Then** 編集 and 削除 are disabled and show the tooltip 「適用中・終了したバージョン設定は編集・削除できません。新しい設定を登録してください。」.
5. **Given** the server refuses the delete (the setting started in the meantime — E-APP-003; deleting it would leave a later setting carrying over a latest below its minimum — E-APP-004; already deleted — E-APP-001), **When** the staff member confirms, **Then** the server's message is shown in an error toast and nothing is removed.

---

### User Story 4 - Set the store URLs (Priority: P2)

A Headquarters staff member sets, per app, the store page that the app's アップデート button opens (PO FR-M006). The launch check returns this URL to the app.

**Why this priority**: Without a store URL the required-update screen has nowhere to send the member; it is a Must in v3.

**Verification**: Open the dialog as HQ, save four valid URLs, reopen and check values and 更新 lines; try an empty value and a non-URL and check each is refused inline; a URL naming a country or locale is saved.

**Acceptance Scenarios**:

1. **Given** any role that can view the list, **When** they press 「ストアの URL の設定」 (header, left of 「新規登録」), **Then** the dialog 「ストアの URL の設定」 opens with four inputs — 「JOYFIT の App Store の URL」, 「JOYFIT の Google Play の URL」, 「FIT365 の App Store の URL」, 「FIT365 の Google Play の URL」 — prefilled with the saved URLs, each with 「更新: <updater name> <YYYY/MM/DD HH:mm>」 below it when it was saved before.
2. **Given** a Headquarters staff member enters four valid URLs, **When** they press 「保存する」, **Then** all four are saved together, the toast 「ストアの URL を保存しました」 is shown, the dialog closes, and reopening it shows the new values and 更新 lines.
3. **Given** an input is empty, **When** 「保存する」 is pressed, **Then** nothing is saved and 「<label>を入力してください」 is shown under it.
4. **Given** a value that is not an absolute http(s) URL, **When** 「保存する」 is pressed, **Then** nothing is saved and 「URL の形式で入力してください」 is shown under it.
5. **Given** a URL that names a country or locale (e.g. `https://apps.apple.com/jp/app/id…`, `…/details?id=…&hl=ja&gl=JP`), **When** 「保存する」 is pressed, **Then** it is saved like any other URL — the country / locale is not checked (PO QA 2026-11-16).
6. **Given** the server rejects a URL (E-VAL-001), **Then** its message is shown under the matching input; a failure not tied to an input is shown in an error toast.
7. **Given** the staff member edited some inputs, **When** they press 「キャンセル」 or close the dialog, **Then** nothing is saved and reopening shows the saved values.

### Edge Cases

- What happens when no setting matches? The list shows 「条件に一致するアプリバージョンがありません」 with 「条件をクリア」 when a filter is active, otherwise 「アプリバージョンがまだありません」; the footer stays visible with `全 0 件`.
- What happens when the list fails to load? 「アプリバージョン一覧の取得に失敗しました」 with the server's message and 「再試行」; for 400/422 the action is 「条件をクリア」, for 403 there is no action.
- What happens when a 予約 setting's 適用開始日時 passes while the screen is open? Its status is computed by the server at request time, so the row shows 予約 until the list is refetched; a delete attempted meanwhile is refused with E-APP-003 (US3-5).
- What happens when two staff members delete the same setting nearly at once? The second gets the E-APP-001 toast; the row is gone after refresh.
- What happens to a setting without 備考? The cell is empty; long remarks are truncated with the full text on hover.
- What happens when a store URL was never saved? Its input is empty and has no 更新 line (until saved, the launch check returns no store URL for that app). If the URLs fail to load, the dialog shows a retry block and 「保存する」 stays disabled.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST list version settings with exactly these columns, in this order: ブランド (brand badge), 適用開始日時 (`YYYY/MM/DD HH:mm`), 状態 (badge), iOS 最低バージョン, Android 最低バージョン, iOS 最新バージョン, Android 最新バージョン, 備考, followed by a row-actions menu (編集 / 削除). No ID, 作成日 or 更新日 column.
- **FR-002**: Each version cell MUST show the value in effect at that setting after carry-over, as `<version name>（<build number>）` (e.g. `2.3.0（45）`). A value carried over from an earlier setting (left blank on this one) MUST be muted with the hover text 「直前の設定から引き継ぎ」; a slot with no value in effect MUST show 「—」.
- **FR-003**: 状態 is derived by the server and shown as 「適用中」 (success tone) = the brand's setting in effect now, 「予約」 (info tone) = 適用開始日時 in the future, 「終了」 (neutral tone) = replaced by a newer setting.
- **FR-004**: Users MUST be able to filter by ブランド (「全ブランド」 / JOYFIT / FIT365) and 状態 (「全状態」 / 適用中 / 予約 / 終了), combined with AND. Changing a filter returns to page 1. Filters, page and page size MUST be kept in the URL so the view can be shared and is restored on back navigation.
- **FR-005**: The list MUST be sorted by 適用開始日時, newest first; there are no sort controls.
- **FR-006**: System MUST paginate with the footer `全 N 件 / P ページ / X-Y を表示` and a 表示件数 selector (25 / 50 / 100, default 50); next/previous are disabled when there is no page in that direction.
- **FR-007**: System MUST show next to the page title the number of settings matching the current filters (`N件`).
- **FR-008**: The list MUST include scheduled settings and exclude deleted ones.
- **FR-009**: System MUST show 「新規登録」 routing to the creation screen for every role that can view the list; for roles without create permission it MUST be visible but disabled with the tooltip 「本部権限が必要です」.
- **FR-010**: Clicking a row MUST open that setting's detail screen; returning from it restores the list's filters and page.
- **FR-011**: Each row's 編集 (routes to the edit screen) and 削除 (opens the confirmation) MUST be enabled only when the role has the edit/delete permission **and** the setting is 予約. Without the permission the item is disabled with the 「本部」 badge; on an 適用中 / 終了 setting it is disabled with the tooltip 「適用中・終了したバージョン設定は編集・削除できません。新しい設定を登録してください。」.
- **FR-012**: Delete MUST require confirmation: title 「このバージョン設定を削除しますか？」, text 「<BRAND> <YYYY/MM/DD HH:mm> のバージョン情報を削除します。この操作は取り消せません。」, buttons 「キャンセル」 / 「削除する」. On success: toast 「アプリバージョンを削除しました」 and the list is refetched. On failure: the server's message in an error toast; the setting stays.
- **FR-013**: System MUST show a 「ストアの URL の設定」 button in the page header, left of 「新規登録」, for every role that can view the list; it opens the store URL dialog.
- **FR-014**: The store URL dialog MUST be titled 「ストアの URL の設定」 with the text 「アップデートのボタンから開くストアのページを、アプリごとに設定します。」 and show four required inputs in this order: 「JOYFIT の App Store の URL」, 「JOYFIT の Google Play の URL」, 「FIT365 の App Store の URL」, 「FIT365 の Google Play の URL」 — each prefilled with the saved URL (empty when never saved), placeholder `https://`, and, when saved before, the line 「更新: <updater name> <YYYY/MM/DD HH:mm>」.
- **FR-015**: Each store URL MUST be validated on save (leading/trailing spaces ignored): required (「<label>を入力してください」), at most 2048 characters (「<label>は2048文字以内で入力してください」), and an absolute http(s) URL (「URL の形式で入力してください」). The store host and any country / locale in the URL are not checked (PO QA 2026-11-16).
- **FR-016**: 「保存する」 MUST save the four URLs together. On success: toast 「ストアの URL を保存しました」, the dialog closes and the saved values (with their 更新 lines) are shown next time. Server field errors (E-VAL-001 `details`) MUST appear under the matching input — `required` / `too_short` → 「<label>を入力してください」, `too_long` → 「<label>の文字数が上限を超えています」, `invalid_format` → 「URL の形式で入力してください」, other → 「<label>の入力内容をご確認ください」; any other failure → error toast. 「キャンセル」 or closing discards unsaved input.
- **FR-017**: Only System and Headquarters can edit and save store URLs; for Manager, Staff and Observer the dialog is read-only — inputs disabled, 「保存する」 disabled with the tooltip 「本部権限が必要です」.
- **FR-018**: Manager, Staff and Observer MUST be able to view and filter the list with all write controls visible but disabled. The Trainer role MUST get the standard 403 page for the list screen. Direct URL access to the create/edit screens without the corresponding permission MUST show the 403 page.

### Key Entities _(include if feature involves data)_

- **Version Setting** (バージョン設定): brand (JOYFIT / FIT365 — no "all"), 適用開始日時 (to the minute), derived status (適用中 / 予約 / 終了), the four version pairs as entered (each version name + build number, or blank = carry over), the four pairs in effect after carry-over, 備考, creator/updater with display names, created/updated timestamps. Deletion is logical and allowed only while scheduled. Defined in [data-model.md](data-model.md).
- **Store URL** (ストアの URL): one per app (brand × OS — App Store for iOS, Google Play for Android): URL (empty until first saved), updater and update time.
- **List filters**: brand and status selections (plus page and page size), kept in the URL; they affect only what is displayed.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Headquarters staff member can find the setting in effect for a brand and read its iOS/Android minimum and latest versions within 15 seconds of opening the screen.
- **SC-002**: 100% of access attempts by the Trainer role — via navigation or direct URL — are blocked with the standard 403 page before any data is shown.
- **SC-003**: The list appears within 1 second of opening the screen or changing a filter, for 95% of page loads.
- **SC-004**: 100% of deletes require an explicit confirmation naming the setting, and 0% of 適用中 / 終了 settings can be deleted from the screen.
- **SC-005**: Manager, Staff and Observer users have a 0% success rate on create, edit, delete and store URL saves, through the UI or by direct URL.
- **SC-006**: 100% of store URL saves with an empty or non-URL value are refused with an inline message, and nothing is saved.

## Assumptions

- Create, edit and detail screens are specified separately (`017-app-version-detail`, `018-app-version-form`); this screen only links to them.
- Status and carried-over values are computed by the server for every read (over the brand's whole history); the screen does not recompute them.
- Sorting is fixed to 適用開始日時 descending (PO FR-M001 並び順); no user-facing sort controls.
- Deletion is logical and limited to scheduled settings (PO FR-M005); the backend refuses others with E-APP-003.
- Role permissions follow the Y-05 v3 permission matrix: System and Headquarters register/edit/delete settings and set store URLs; Manager, Staff and Observer are read-only; Trainer has no access.
- Permission enforcement follows this system's existing pattern: restricted buttons/menu items are shown but disabled rather than hidden, and restricted pages show the standard 403 page when opened directly.
- The store URL dialog saves the four URLs together (`PUT /api/v1/admin/app-store-urls`); the per-app endpoint `PUT /api/v1/admin/app-store-urls/{brand}/{os}` exists but is not used.

### Decisions (2026-11-13)

Agreed with the PO for this round; numbering is shared across 016 / 017 / 018.

- **D1 — Prototype lags the spec.** The prototype pages (`pages/app-management.tsx`, `app-version-detail.tsx`, `app-version-form.tsx` @ 9428dc2) still show spec v1 (single required iOS/Android version, リリース日, ID/作成日/更新日 columns). Where v3 adds or changes something the prototype lacks, the UI follows spec v3 and reuses the prototype's visual patterns (badges, card, row menu, dialogs, version + build input row). v1-only elements are dropped.
- **D2 — Store URL placement.** PO FR-M006 does not say where store URLs are set and the prototype has no UI for them: they live in a 「ストアの URL の設定」 header button on this list screen (next to 「新規登録」) that opens a dialog with the four URLs, all required and saved at once; HQ/System can save, Manager/Staff/Observer see it read-only.
- **D3 — Latest version now.** FR-S001 (Should, planned after the 11/18 release) is implemented now because the backend supports it: the list, detail and form include iOS / Android 最新バージョン. The app-side optional-update guidance remains out of scope.
