# Feature Specification: App Version Management (Create/Edit Form)

**Feature Branch**: `018-app-version-form`
**Created**: 2026-07-14
**Status**: Draft
**PO Spec**: `Y-05` — アプリ配信バージョン管理 (App Release Version Management), document version `261112_v3`
**Source**: `requirements/Y-05.md` 261112_v3 (dx-fitness/fitness-spec @ 3a2fdec — FR-M002, FR-M004, FR-S001 input check, 業務フロー, permission matrix) + backend contract `POST /api/v1/admin/app-versions`, `PATCH /api/v1/admin/app-versions/{id}`, `GET /api/v1/admin/app-versions?status=active` (fitness-backend-v2 `admin-app-version.controller.ts`, `dto/app-version.dto.ts`) + UI prototype `pages/app-version-form.tsx` (dx-fitness/fitness-crm-ui @ 9428dc2 — still at spec v1, visual patterns only; see [Decisions](#decisions-2026-11-13))
**Last synced**: 2026-11-13 — re-aligned to Y-05 261112_v3 + local BE (fitness-backend-v2 feat/anhnv/app-version-and-maintenance, commit e3381567)
**Input**: User description: "Create spec for screen \"Y05 アプリ配信バージョン管理\" (App version management). Screen Spec: requirements/Y-05.md. UI code: pages/app-version-form.tsx. API spec: docs/api/Y-05.md. Scope: This scope only includes the create/edit form (create/edit screen). The list screen and detail screen was completed earlier and is available for reference."

## Scope

This feature covers the **create/edit form of a version setting** — one screen with a registration mode (PO FR-M002) and an edit mode for scheduled settings only (FR-M004) — including the minimum-version raise/lower confirmation shown before saving. Entry points live on the list (`016-app-version-management`) and detail (`017-app-version-detail`) screens; deleting happens there. The version setting entity and the carry-over rule are defined in `016-app-version-management/data-model.md`.

## User Scenarios _(mandatory)_

### User Story 1 - Register a new version setting (Priority: P1)

After a new build is published and visible in the stores (PO 業務フロー 新しいバージョンのリリース), a Headquarters staff member registers a setting: the brand, when it takes effect, and only the version values that change. Blank values carry over from the brand's previous setting.

**Why this priority**: Without it no minimum or latest version can ever be set, and the app launch check has nothing to apply.

**Verification**: As a Headquarters/System user, register a setting with one pair filled and the rest blank; check the new row in the list (entered value plain, others carried over and muted). Then try each invalid input and check the inline messages.

**Acceptance Scenarios**:

1. **Given** a Headquarters staff member opens 「新規登録」, **Then** the form 「バージョン登録」 shows ブランド (JOYFIT selected), 適用開始日時 (now), four empty version fields — iOS 最低バージョン, iOS 最新バージョン, Android 最低バージョン, Android 最新バージョン, each marked 任意 with 「X.Y.Z 形式（例: 1.2.3）。空欄の場合は直前の設定を引き継ぎます」 — and an empty 備考.
2. **Given** brand, 適用開始日時 and only iOS 最新バージョン `3.0.0` / build `300` are entered, **When** 「登録する」 is pressed, **Then** (no minimum changes, so no confirmation) the setting is created, the toast 「アプリバージョンを登録しました」 is shown and the list opens with the new row showing iOS 最新 `3.0.0（300）` and the other slots carried over (「—」 where nothing was ever entered).
3. **Given** a version name that is not `X.Y.Z`, **When** submitting, **Then** submission is blocked with 「X.Y.Z 形式で入力してください（例: 1.2.3）」.
4. **Given** a build number that is not digits only, `0`, or above 2147483647, **When** submitting, **Then** submission is blocked with 「ビルド番号は数値で入力してください」 / 「ビルド番号は1以上の整数を入力してください」 / 「ビルド番号は2147483647以下で入力してください」.
5. **Given** a version name without a build number (or the reverse), **When** submitting, **Then** submission is blocked with 「バージョン名とあわせてビルド番号を入力してください」 (or 「ビルド番号とあわせてバージョン名を入力してください」).
6. **Given** a minimum and a latest of the same OS are both entered and the latest is lower, **When** submitting, **Then** submission is blocked with 「最新バージョンは最低バージョン以上にしてください。」 under the latest field.
7. **Given** 適用開始日時 was cleared, **When** submitting, **Then** submission is blocked with 「適用開始日時を選択してください」.
8. **Given** a submission was blocked, **Then** 「未入力または不正な形式の項目があります」 is shown at the left of the footer and the view scrolls to the first invalid field.
9. **Given** the server refuses the save, **Then** the message lands under the field it concerns: a setting of the same brand already starts in the same minute → 「同じブランド・適用開始日時のバージョン設定が既に存在します。」 under 適用開始日時 (E-APP-002); the start is earlier than the brand's active setting → 「適用開始日時は現在適用中の設定より前にできません。」 under 適用開始日時 (E-APP-005); a latest falls below a minimum after carry-over (E-APP-004) → the server's message, which names the setting, the OS and both versions, under that latest field when the setting being saved breaks the rule (e.g. 「この設定で、iOS の最新バージョン 1.0.0 が最低バージョン 2.8.0（引き継ぎ） を下回ります。」), or in an error toast when the first setting to break it is another one of the brand (e.g. 「2026/11/21 10:00 開始の設定で、iOS の最新バージョン 2.6.0 が最低バージョン 2.8.0 を下回ります。」).

---

### User Story 2 - Edit a scheduled setting (Priority: P2)

A Headquarters staff member corrects a setting that has not started yet. Settings in effect or ended are history: to change them, a new setting is registered (with 適用開始日時 = now).

**Why this priority**: Corrections are less frequent than registrations and reuse the same form.

**Verification**: Edit a 予約 setting (pre-fill, change, save); open the edit URL of an 適用中 setting and check the form is not offered.

**Acceptance Scenarios**:

1. **Given** a 予約 setting, **When** a Headquarters staff member opens its edit form, **Then** 「バージョン編集」 is pre-filled with the brand, 適用開始日時, 備考 and the version pairs entered on that setting; slots left blank on it stay blank (carried-over values are not copied in).
2. **Given** the edit form is open, **When** the staff member changes fields and presses 「保存する」, **Then** (after the confirmation, if a minimum changes) the setting is updated, the toast 「アプリバージョンの変更を保存しました」 is shown and the list opens.
3. **Given** the edit form is open, **When** invalid values are entered, **Then** the same validation as registration blocks submission.
4. **Given** an 適用中 or 終了 setting, **When** its edit URL is opened, **Then** no form is shown; instead 「このバージョン設定は編集できません」 with 「適用中・終了したバージョン設定は編集・削除できません。新しい設定を登録してください。」.
5. **Given** the setting started while the form was open, **When** saving, **Then** the server refuses with E-APP-003 and its message is shown in an error toast; nothing is saved.
6. **Given** a setting that does not exist or was deleted, **When** its edit URL is opened, **Then** 「アプリバージョンが見つかりません」 with 「指定されたアプリバージョンは存在しないか、削除された可能性があります。」 is shown.

---

### User Story 3 - Form access is restricted to authorized roles (Priority: P3)

Only System and Headquarters staff ever reach the registration or edit form; every other role is denied, even by direct URL.

**Why this priority**: Protects a setting that can stop members from using the app, but is secondary to the form working for allowed roles.

**Verification**: As Manager, Staff, Observer and Trainer, open the create and edit URLs directly and check the 403 page.

**Acceptance Scenarios**:

1. **Given** a Manager, Staff, Observer, or Trainer user, **When** they open the registration or edit form by any means, including direct URL, **Then** the standard 403 page is shown instead of the form.
2. **Given** a System or Headquarters user, **When** the form loads, **Then** all fields are editable and the submit button is enabled.

---

### User Story 4 - Confirm a minimum-version raise or lower before saving (Priority: P2)

Raising a minimum stops every older app until it is updated, so before saving the staff member sees which apps' minimum changes and confirms (PO FR-M002 引き上げの確認 / 引き下げの確認; 業務フロー 最低バージョンの引き上げ, 誤って登録したときの戻し).

**Why this priority**: It is the main safeguard against locking members out by mistake; it applies to both registration and edit.

**Verification**: With a known active setting for the brand, submit a higher minimum, a lower minimum, a mixed change, a first-ever minimum and an unchanged/blank minimum, and check the dialog title, rows and warning for each.

**Acceptance Scenarios**:

1. **Given** JOYFIT's active setting has the iOS minimum `2.0.0（200）` in effect, **When** a JOYFIT setting with iOS minimum `2.5.0` / `250` is submitted, **Then** before saving the dialog 「最低バージョンの引き上げの確認」 lists 「JOYFIT iOS」 `2.0.0（200）` → `2.5.0（250）` and the sentence 「このバージョン未満のアプリを使っている会員は、アップデートするまでアプリを使えなくなります。ストアで公開・反映済みであることを確認してください」, with 「キャンセル」 and 「登録する」 (「保存する」 in edit mode).
2. **Given** the entered minimum is lower than the one in effect, **When** submitting, **Then** the dialog 「最低バージョンの引き下げの確認」 lists the change without the warning sentence.
3. **Given** one OS's minimum is raised and the other's lowered, **When** submitting, **Then** the dialog 「最低バージョンの変更の確認」 lists both rows and shows the warning sentence.
4. **Given** the brand has no minimum in effect for that OS (no active setting, or none ever entered), **When** a minimum is entered and submitted, **Then** it counts as a raise and the row shows 「未設定」 → the new value.
5. **Given** every minimum is blank (carried over) or equal to the one in effect, **When** submitting, **Then** no dialog is shown and the setting is saved directly.
6. **Given** the dialog is open, **When** 「キャンセル」 is pressed, **Then** nothing is saved and the input is kept.
7. **Given** the dialog is open, **When** the save button is pressed, **Then** the setting is saved as in User Story 1 / 2; if the server refuses, the dialog closes and the error is shown as in US1-9.
8. **Given** the active setting cannot be read, **When** submitting, **Then** the server's message is shown in an error toast and nothing is saved.

### Edge Cases

- What happens with a 適用開始日時 in the past? It is accepted if it is not earlier than the brand's active setting — the new setting then takes effect immediately (適用中) and can no longer be edited. Earlier than the active setting → E-APP-005 (US1-9).
- What happens to seconds? The picker has minute granularity and the server stores 適用開始日時 to the minute, so "one setting per brand + 適用開始日時" means one per minute. Different brands may share the same time.
- What happens when two staff members register the same brand + minute at the same time? Only one is saved; the other gets E-APP-002.
- What is the confirmation compared against? Always the brand's setting in effect now (状態 適用中), fetched at submit time — also for a setting scheduled in the future and when editing a scheduled setting. In edit mode the dialog therefore appears whenever the setting's entered minimum differs from the active one, even if the minimum was not touched in this edit.
- Why can E-APP-004 occur when the form passed its own check? The client compares only a minimum and latest both entered on this form; the server checks the values after carry-over across the brand's whole history, including later scheduled settings that carry values over from this one. The server's message therefore names the setting that breaks the rule — 「この設定で、…」 for the one being saved, 「<YYYY/MM/DD HH:mm> 開始の設定で、…」 for another — marks a carried-over minimum with 「（引き継ぎ）」 and counts further breaks as 「（ほか N 件）」.
- Can the brand be changed in edit mode? Yes; the confirmation then uses the newly selected brand's active setting, and the server re-checks both brands' histories.
- Can all four pairs be blank? Yes — brand and 適用開始日時 are the only required items.
- What happens to a latest without any minimum? It is accepted; the app launch check then answers "no update" for that OS (PO FR-S001) — nothing is shown on the form.
- What happens with 備考 over 1000 characters? The textarea stops accepting input at 1000 characters.
- What happens when the staff member leaves with unsaved changes? 「キャンセル」, the back link 「アプリ管理に戻る」 and other navigation ask for confirmation through the shared unsaved-changes guard; without changes they return to the list directly.
- What happens when two staff members edit the same scheduled setting? The later save wins (no optimistic locking).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide one form screen with two modes: title 「バージョン登録」 (create) / 「バージョン編集」 (edit), back link 「アプリ管理に戻る」, a single 「バージョン情報」 card, and a footer with 「キャンセル」 and 「登録する」 / 「保存する」.
- **FR-002**: The card MUST contain, in order: ブランド (radio JOYFIT / FIT365, required, JOYFIT preselected on create); 適用開始日時 (date-time picker `YYYY/MM/DD HH:mm`, minute granularity, required, defaulting to now on create); the version fields in two columns — iOS (最低バージョン, 最新バージョン) and Android (最低バージョン, 最新バージョン) — each optional (任意), one row of version name (placeholder 「X.Y.Z」) + 「ビルド」 + build number (placeholder 「番号」), with the description 「X.Y.Z 形式（例: 1.2.3）。空欄の場合は直前の設定を引き継ぎます」; 備考 (optional textarea, placeholder 「バージョンに関する備考を入力」).
- **FR-003**: A version name (spaces trimmed) MUST be blank or `X.Y.Z` with each part a non-negative integer, else 「X.Y.Z 形式で入力してください（例: 1.2.3）」.
- **FR-004**: A build number (spaces trimmed) MUST be blank or a whole number from 1 to 2147483647: 「ビルド番号は数値で入力してください」 (not digits only), 「ビルド番号は1以上の整数を入力してください」 (`0`), 「ビルド番号は2147483647以下で入力してください」 (too large).
- **FR-005**: Version name and build number of a slot MUST be both filled or both blank: 「バージョン名とあわせてビルド番号を入力してください」 / 「ビルド番号とあわせてバージョン名を入力してください」. Each slot shows one error line — the version-name error first, else the build-number error.
- **FR-006**: When the minimum and the latest of the same OS are both entered on the form, the latest MUST be ≥ the minimum, compared part by part as numbers and then by build number (`1.10.0` > `1.9.0`); else 「最新バージョンは最低バージョン以上にしてください。」 under the latest slot. Comparisons involving carried-over values are left to the server (E-APP-004).
- **FR-007**: 備考 MUST be at most 1000 characters.
- **FR-008**: Field errors MUST appear only after the first submit attempt and are then re-evaluated as fields change. A blocked submission MUST show 「未入力または不正な形式の項目があります」 at the left of the footer and scroll to the first invalid field.
- **FR-009**: The request MUST always carry brand and 適用開始日時, every version pair as entered (name + integer build) or `null` / `null` when blank (= carry over), and 備考 (`null` when empty). The edit request sends the full set, so clearing a slot makes it carry over again.
- **FR-010**: On a valid submit, System MUST read the brand's setting in effect now (`status=active`, 1 item). For each OS whose minimum is entered and differs from that setting's effective minimum — no minimum in effect counts as a raise — a confirmation MUST be shown before saving: title 「最低バージョンの引き上げの確認」 (all raised) / 「最低バージョンの引き下げの確認」 (all lowered) / 「最低バージョンの変更の確認」 (mixed); one row per changed OS `<BRAND> <OS>  <before | 「未設定」> → <after>`; the warning 「このバージョン未満のアプリを使っている会員は、アップデートするまでアプリを使えなくなります。ストアで公開・反映済みであることを確認してください」 only when something is raised; buttons 「キャンセル」 / 「登録する」 or 「保存する」. Without a minimum change the setting is saved directly. If the lookup fails, an error toast is shown and nothing is saved.
- **FR-011**: On success, System MUST show 「アプリバージョンを登録しました」 (create) or 「アプリバージョンの変更を保存しました」 (edit), refresh the list (and, on edit, the detail) data, and return to the list with its previous filters and page.
- **FR-012**: Server refusals MUST be shown where they belong: E-APP-002 and E-APP-005 → the server's message under 適用開始日時; E-APP-004 → per `details.violations[]`: when the first violation is the setting being saved (`self`), the server's message goes under its `field` and any other latest field of this setting that breaks the rule gets 「最新バージョンは最低バージョン以上にしてください。」; when the first violation is another setting of the brand, the server's message (naming that setting's start) goes to the error toast; E-VAL-001 → a message per field built from `details[].code` (e.g. `required` → 「<label>を入力してください」); a field-level refusal also shows the footer message and scrolls to it. Anything else (E-APP-003, E-APP-001, 403, network) → error toast with the server's message.
- **FR-013**: The edit form MUST be pre-filled with the values entered on the setting (brand, 適用開始日時, the entered pairs, 備考); blank slots stay blank.
- **FR-014**: Only a 予約 setting can be edited: for an 適用中 or 終了 setting the edit screen MUST show 「このバージョン設定は編集できません」 with 「適用中・終了したバージョン設定は編集・削除できません。新しい設定を登録してください。」 and no form.
- **FR-015**: For a setting that does not exist or was deleted, the edit screen MUST show 「アプリバージョンが見つかりません」 with 「指定されたアプリバージョンは存在しないか、削除された可能性があります。」; other load failures show an error state with retry.
- **FR-016**: 「キャンセル」 and the back link MUST return to the list without saving; with unsaved changes, the shared unsaved-changes guard asks for confirmation first.
- **FR-017**: Only System and Headquarters MUST reach the registration and edit screens; Manager, Staff, Observer and Trainer get the standard 403 page, including by direct URL.
- **FR-018**: The submit button is role-gated to System / Headquarters with the deny tooltip 「本部権限が必要です」, consistent with role-restricted submit actions elsewhere, even though no other role reaches the screen.

### Key Entities _(include if feature involves data)_

- **Version Setting**: the setting being created or edited (`016-app-version-management/data-model.md`). This screen collects brand, 適用開始日時, the four version pairs as entered (blank = carry over) and 備考; ID, status, carried-over values and audit fields are system-assigned.
- **Minimum change**: per OS, the minimum in effect now (or none) versus the entered minimum, with its direction (raise / lower) — what the confirmation shows. Not stored.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A Headquarters staff member can register a setting that changes one app's version in under 2 minutes from opening the form.
- **SC-002**: 100% of submissions with a malformed version name or build number, a half-filled pair, a latest below the minimum entered on the same form, or a missing brand / 適用開始日時 are blocked inline before any request is sent.
- **SC-003**: 100% of saves that change a minimum against the brand's active setting show the confirmation before anything is saved; saves without a minimum change are never interrupted.
- **SC-004**: 100% of access attempts to the registration or edit screen by roles other than System / Headquarters are blocked with the standard 403 page.
- **SC-005**: 0% of 適用中 / 終了 settings can be changed through the form — the edit screen refuses them, and a setting that starts during editing is refused by the server.

## Assumptions

- Registration and edit share one form screen with two modes, as in the UI prototype.
- The brand stays editable in edit mode (PO FR-M004: same input checks as registration); the server re-validates both brands.
- The server is authoritative for cross-record rules (E-APP-002 one setting per brand + minute, E-APP-003 scheduled only, E-APP-004 latest ≥ minimum after carry-over, E-APP-005 not before the active setting); the client mirrors only format, pair completeness and latest ≥ minimum within the form.
- The confirmation compares against the brand's active setting (PO 今の有効な設定), fetched fresh at submit time.
- Route-level 403 gating uses the existing `PAGE_PERMISSIONS` entries (`AppVersionsCreate` / `AppVersionsEdit`).
- Role permissions follow the Y-05 v3 matrix: only System and Headquarters register or edit settings.
- Concurrent edits are last-write-wins; no optimistic locking is specified.

### Decisions (2026-11-13)

Agreed with the PO for this round; numbering is shared across 016 / 017 / 018 (D2 — store URL placement — concerns the list screen only).

- **D1 — Prototype lags the spec.** `pages/app-version-form.tsx` @ 9428dc2 still shows spec v1 (required iOS / Android version, リリース日 date picker). The form follows spec v3 (適用開始日時 date-time, four optional pairs with carry-over, raise/lower confirmation) and reuses the prototype's card, radio group and version + build input row.
- **D3 — Latest version now.** FR-S001 is implemented now because the backend supports it: the form includes iOS / Android 最新バージョン, with the latest ≥ minimum check.
- **D4 — Maintenance reminder removed.** The yellow alert 「メンテナンス中に強制アップデートのポップアップを表示させないように日時設定をしてください」 is removed: in v3 the launch check gives maintenance precedence, so 適用開始日時 does not need to avoid maintenance windows (PO 業務フロー メンテナンスとの関係). The prototype still shows it.
