# Feature Specification: Member Detail — Header Popups & Side Sheets (会員詳細 ヘッダー操作)

**Feature Branch**: `021-member-detail-header-actions`
**Created**: 2026-07-29
**Status**: Draft — re-baselined 2026-09-23 (see Amendment 2026-09-23)
**PO Spec**: `A-01` — 会員管理（一覧） / supplementary section `A-01-01-b ステータス変更【ヘッドアップ】`
**Parent spec**: [`../spec.md`](../spec.md) (umbrella — head-up card, banners, permissions)
**Source**:

- Requirement spec: `dx-fitness/fitness-spec` @ `a5abfdb` (2026-09-12) — `crm/requirements/A-01.md` **v260901_v6**; `A-03` `260901_v3` FR-002 for 退会取り消し.
- UI prototype: `dx-fitness/fitness-crm-ui` @ `0a73739` (2026-09-17) — `src/pages/member-detail.tsx` (5,820 lines).
- API: the real backend (Swagger dev `/docs-json`, generated client `src/lib/api-real`). Per-endpoint status and open backend items live in [`api-integration-output/member-detail/report.md`](../../../api-integration-output/member-detail/report.md); deliberate deviations from the prototype live in [`api-integration-output/prototype-gap-list.md`](../../../api-integration-output/prototype-gap-list.md).
- History: first written 2026-07-29 against A-01 v4, prototype `426a9b3` and API design doc v0.8.0.

**Input**: User description: "Tạo spec cho các Popup / Sidebar mở từ header trong màn hình member detail (12 cái), cái nào có rồi thì kiểm tra update. Phase 1 only. history thêm seed only, không cần xử lý update create delete history."

---

## Amendment 2026-09-18 — surface 11 (再入会) withdrawn

Surface **11 再入会** is no longer part of this screen. The UI prototype removed both the `再入会`
button and its sheet from `src/pages/member-detail.tsx` in `a7d0c88` _"design: 9/16 デザイン更新"_
(2026-09-16); the action was not moved elsewhere. `A-01` never described it, and re-enrollment now
belongs to the `C-01` enrollment-application flow: `POST /api/v1/admin/applications` accepts an
existing `memberId` for a member in provisional or withdrawn status, and the enrollment-fee waiver
that the sheet exposed as an 入会金を免除する toggle is decided **server-side** — `G-05` ADD-09
(キャンペーン > 再入会 > 個別, single application) and API-098 §12 (`reenrollmentFeeWaiverDays`
per brand, `reenrollmentWaiver { ruleDays, eligible, daysSinceWithdrawal, excludedReason }` derived
on read).

This supersedes **Q2** and **FR-023**, and retires the backend endpoint request for
`POST /crm/members/{id}/re-enroll` in API Contract Mapping row 11 — no dedicated endpoint is needed.
Removed in the same change: `re-enroll-sheet.tsx`, the mock route, its Zod schemas, and the
`members.re-enroll` permission.

---

## Amendment 2026-09-23 — re-baseline to A-01 v6, prototype `0a73739` and the real API

| #   | Change                                                           | Why                                                                                                                                                                                                                                                                                | Sections touched                                 |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A1  | **Surface 9 強制退会 removed from the screen**                   | Client decision qa-223 (2026-09-15): forced withdrawal is the `A-01 FR-016` batch, and the human step is the 例外除外 exemption. The API rejects `reasonCode: forced` (`E-WDR-213`). The prototype still shows the item, which is recorded as prototype-gap-list #2 and report N42 | Overview, US3, FR-003, FR-021, Q1                |
| A2  | **Surface 13 入会取り消し added**                                | `A-01 FR-026` (v6) + prototype: a standalone confirm dialog with a required 取消理由, offered only before the usage start date                                                                                                                                                     | Overview, US1, US3, FR-002, FR-014, FR-026 (new) |
| A3  | **退会申請 no longer derives 入会取消**                          | v6 FR-005 points a pre-start member to FR-026 instead. The sheet blocks submission and links to 入会取り消し. This supersedes the 2026-07-29 clarification and G-F                                                                                                                 | Clarifications, FR-014, G-F, G-04                |
| A4  | **代理申請 is always on**                                        | The API only accepts `applicationSource: proxy` from the CRM (`crm_direct` is rejected; report N20). Every application sheet collects 合意日時 **and** 合意方法 with no switch. The prototype still has a switch that defaults to OFF                                              | FR-005, US1                                      |
| A5  | 個人情報削除: reason + typed member-ID confirmation              | The prototype now has both. The client sends the literal `ANONYMIZE` once the typed ID matches                                                                                                                                                                                     | FR-024, G-D, Q7                                  |
| A6  | ブラックリスト登録: 5 reasons                                    | The prototype added 機器破損                                                                                                                                                                                                                                                       | FR-022                                           |
| A7  | ゲートストップ解除 reached from the 基本情報 ゲートストップ card | The 入退館設定 card was removed (qa-121, report N52). The prototype's replacement card carries a 「解除...」 button                                                                                                                                                                | Overview row 6                                   |
| A8  | Permissions stated per surface                                   | From the prototype's role gates and the A-01 権限マトリクス                                                                                                                                                                                                                        | FR-004                                           |
| A9  | API mapping replaced by the integration report                   | All surfaces now run on the real API                                                                                                                                                                                                                                               | API Contract Mapping, Gap Analysis               |

---

## Overview

The member detail screen (`A-01-01`) exposes all member-level write operations through **modal surfaces opened from the page header** (13 numbered, 11 active after the 2026-09-18 and 2026-09-23 amendments) (plus the two warning banners rendered directly under it, which carry two of the triggers). Nothing in this feature changes the tabs — the tabs are read surfaces already covered by `specs/032-member-detail/spec.md`.

The header is status-aware and renders these trigger clusters:

| Cluster            | Trigger                              | Visible when                          |
| ------------------ | ------------------------------------ | ------------------------------------- |
| Edit               | `編集` button                        | member is not withdrawn               |
| Status change      | `ステータス変更 ▾` dropdown          | member is not withdrawn               |
| Management actions | `⋯` dropdown, group label `管理操作` | member is not withdrawn               |
| Withdrawn actions  | `⋯` dropdown (個人情報削除 only)     | member is withdrawn / force-withdrawn |

### The surfaces in scope

| #   | Surface                                                       | Type                   | Opened from                                                                                                       | Prototype anchor         | Already in project                                                                                              |
| --- | ------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 1   | 休会申請 (suspension application)                             | Sheet + confirm dialog | ステータス変更 (status = 有効)                                                                                    | `member-detail.tsx:4087` | [leave-sheet.tsx](<src/app/(private)/members/[id]/_components/leave-sheet.tsx>)                                 |
| 2   | 退会申請 (withdrawal application)                             | Sheet + confirm dialog | ステータス変更 (有効 / 休会中)                                                                                    | `member-detail.tsx:4279` | [withdraw-sheet.tsx](<src/app/(private)/members/[id]/_components/withdraw-sheet.tsx>)                           |
| 3   | 移籍申請 (transfer application)                               | Sheet + confirm dialog | ステータス変更 (status = 有効)                                                                                    | `member-detail.tsx:4417` | [transfer-sheet.tsx](<src/app/(private)/members/[id]/_components/transfer-sheet.tsx>)                           |
| 4   | 休会解除 (suspension release)                                 | Sheet                  | ステータス変更 (status = 休会中)                                                                                  | `member-detail.tsx:5086` | [leave-release-sheet.tsx](<src/app/(private)/members/[id]/_components/leave-release-sheet.tsx>)                 |
| 5   | ゲートストップ設定 (gate-stop set)                            | Sheet + confirm dialog | 管理操作                                                                                                          | `member-detail.tsx:5161` | [gate-stop-set-sheet.tsx](<src/app/(private)/members/[id]/_components/gate-stop-set-sheet.tsx>)                 |
| 6   | ゲートストップ解除 (gate-stop release)                        | Sheet + confirm dialog | ステータス変更 (whenever a gate stop is active, any status); also 「解除...」 on the 基本情報 ゲートストップ card | `member-detail.tsx:4556` | [gate-stop-release-sheet.tsx](<src/app/(private)/members/[id]/_components/gate-stop-release-sheet.tsx>)         |
| 7   | 予約ペナルティ解除 (reservation-penalty release)              | Sheet + confirm dialog | `解除...` button inside the penalty banner                                                                        | `member-detail.tsx:4698` | [penalty-release-sheet.tsx](<src/app/(private)/members/[id]/_components/penalty-release-sheet.tsx>)             |
| 8   | 退会取り消し (withdrawal cancellation)                        | Dialog                 | ステータス変更 (status = 退会予定) + `取り消す` in the pending banner                                             | `member-detail.tsx:5801` | [withdraw-cancel-dialog.tsx](<src/app/(private)/members/[id]/_components/withdraw-cancel-dialog.tsx>)           |
| 9   | ~~強制退会 (forced withdrawal)~~ — **removed 2026-09-15**     | ~~Dialog~~             | — (prototype still shows it at `member-detail.tsx:5518`; prototype-gap-list #2)                                   | —                        | — (see Amendment 2026-09-23 A1)                                                                                 |
| 10  | ブラックリスト登録 (blacklist registration)                   | Dialog                 | 管理操作                                                                                                          | `member-detail.tsx:5671` | [blacklist-dialog.tsx](<src/app/(private)/members/[id]/_components/blacklist-dialog.tsx>)                       |
| 11  | ~~再入会 (re-enrollment)~~ — **withdrawn 2026-09-18**         | ~~Sheet~~              | —                                                                                                                 | —                        | — (see Amendment 2026-09-18)                                                                                    |
| 12  | 個人情報削除 (PII deletion)                                   | Dialog                 | `⋯` (withdrawn)                                                                                                   | `member-detail.tsx:5583` | [personal-data-delete-dialog.tsx](<src/app/(private)/members/[id]/_components/personal-data-delete-dialog.tsx>) |
| 13  | 入会取り消し (enrollment cancellation) — **added 2026-09-23** | Dialog                 | ステータス変更 (status = 有効, before the usage start date) + 「入会取り消しへ」 in the 退会申請 sheet            | `member-detail.tsx:5744` | [enrollment-cancel-dialog.tsx](<src/app/(private)/members/[id]/_components/enrollment-cancel-dialog.tsx>)       |

**Every active surface exists in the project and is wired from [page.tsx](<src/app/(private)/members/[id]/page.tsx>).** This feature is therefore a _verify-and-update_ pass, not a greenfield build: the requirements below state the target behaviour, and the Gap Analysis records every place the current implementation diverges from the prototype or the API design doc.

Not in scope (opened from the **契約操作 tab**, not the header): 主契約変更, オプション追加 / 変更 / 解約, 個別会費調整.

---

## Clarifications

### Session 2026-10-30 — 合意日時 is entered in JST (A-03 不具合 No4)

Defect: a 合意日時 picked as 2026/10/09 00:00 in the 退会申請 sheet on a UTC+7 browser read 2026/10/09 02:00 on the A-03 detail. Cause: the shared date-time picker read the picked fields in the browser's timezone, while every screen displays JST. Resolution: the picker reads and shows its value as JST wall-clock time whatever the browser timezone (FR-005); the instant sent as `proxy.agreementAt` is the JST time picked. The same picker serves every 合意日時 in the application sheets and the contract operations of the 契約 tab.

- Q: 強制退会 — is the manual header dialog a real Phase 1 requirement, or a prototype artefact to remove/relabel? → A: ~~Keep the manual dialog and request a backend endpoint.~~ **Superseded 2026-09-15 (qa-223): removed from the screen** — see Amendment A1. The prototype is the approved design and HQ needs a manual override for cases the monthly batch misses; the missing endpoint is a backend follow-up, not a reason to drop approved UI.
- Q: Gate stop — is the `A-01 FR-014` 4-pattern model or the API's `scope`/`messageType` model authoritative, and does the set sheet need a scope selector? → A: `A-01 FR-014` is authoritative — the 4 patterns stay. A gate stop applies system-wide; no scope selector is added (neither the prototype nor `A-01` has one). The backend is asked to add a `pattern` field and to persist 設定理由.
- Q: 再入会 — does it create a `C-01` enrollment application (approval-gated), or is it an immediate member-level operation? → A: **Superseded 2026-09-18** (surface removed, see Amendment 2026-09-18). ~~An immediate member-level operation with its own endpoint. The member row and member number are reused rather than re-issued. Because it bypasses `C-01`'s blacklist check, the re-enrollment path must carry its own blacklist / outstanding-delinquency guard.~~
- Q: 休会解除 — what does 復帰月 change, and may it be retroactive? → A: It shortens the active suspension's end month (an update to the existing suspension, not a new release record), and 復帰月 must be the current month or later. Retroactive release is not supported, so no invoice correction and no `F-01` dependency arises.
- Q: 退会申請 — how are the withdrawal _type_ and the member's _motivation_ captured? → A: **Type part superseded 2026-09-23 by `A-01 FR-026` (v6)** — before the usage start date the sheet blocks and points to 入会取り消し, so 退会申請 always files `normal`; the motivation part (single required free-text 退会理由) still stands. ~~The type (`normal` vs 入会取消) is derived automatically from the member's state — 入会取消 before the contract usage start date, 通常退会 otherwise — and is never picked by the operator. The motivation is a single required free-text 退会理由, matching the prototype. The project's current 6-value reason enum is therefore dropped.~~ (enum removal still stands)

---

## User Scenarios _(mandatory)_

### User Story 1 - Submit a status-change application from the header (Priority: P1)

A store staff member opens a member's detail screen, opens `ステータス変更`, and submits a suspension, withdrawal, or transfer application. Each opens a right-hand side sheet with a 代理申請 (proxy application) block at the top, the operation's own fields below, and a two-step commit: the sheet's primary button validates and opens a confirmation dialog, and only the dialog's action performs the write. On success the sheet closes, a success toast appears, the member detail refreshes, and the resulting pending state is visible in the head-up card and its banner.

**Why this priority**: These three are the daily operational core of `A-01 FR-005` and the reason the header exists. Each is independently shippable — one menu item, one sheet, one endpoint.

**Verification**: Open a member with status 有効, submit each of the three applications, and confirm the toast, the refreshed status/banner, and the created application record.

**Acceptance Scenarios**:

1. **Given** a member with status 有効, **When** the user opens `ステータス変更`, **Then** the menu lists 休会申請, 退会申請 (destructive styling), 入会取り消し (destructive, only before the usage start date, sub-line 「利用開始日（YYYY/MM/DD）前のため対象」) and 移籍申請 — and nothing else.
2. **Given** the member has an unpaid balance, **Then** 休会申請 and 移籍申請 are disabled and each shows the inline reason `未納金があるため操作できません`; 退会申請 stays enabled.
3. **Given** a **JOYFIT** member is inside the cancellation-fee period, **Then** 移籍申請 is disabled with the inline reason `解約手数料期間中のため移籍できません`, and that reason takes precedence over the unpaid-fee reason. **Given** a **FIT365** member is inside the period, **Then** the period does not block 移籍申請 (A-02 L48 「解約手数料期間中の移籍」 FIT365 = 可能; API-094 §5.4 #10 returns `E-TRF-007` for JOYFIT only) — only the unpaid / pending-transfer / no-main-contract reasons still apply.
4. **Given** the 休会申請 sheet, **When** the user enters 休会開始月 and 休会終了月, **Then** an informational note states that the monthly fee is paused for that range, and the confirm dialog repeats the same range.
5. **Given** the 退会申請 sheet, **When** the user picks a 退会予定日, **Then** an informational note states the member will be withdrawn as of that date, and the confirm dialog names the member.
6. **Given** the 移籍申請 sheet, **When** the user selects a destination store, **Then** the current primary store is shown read-only and a workflow hint is rendered: 3 steps (`① 申請 → ② 移籍元承認 → ③ 自動移籍`) for a JOYFIT destination, 4 steps (`① 申請 → ② 移籍元承認 → ③ 移籍先承認 → ④ 移籍実行`) otherwise.
7. **Given** any of the three sheets, **When** 合意日時 or 合意方法 is empty, **Then** the primary button cannot progress to the confirm dialog and the field shows a validation error — 代理申請 is always on (Amendment A4).
8. **Given** a member whose usage start date has not arrived, **When** the 退会申請 sheet is opened, **Then** a warning 「利用開始日（YYYY/MM/DD）前の会員です。退会申請ではなく「入会取り消し」で処理してください。」 with a 「入会取り消しへ」 button replaces submission, and 退会申請を送信 stays disabled.
9. **Given** a blocked member, **When** the sheet is opened anyway (banner / deep link), **Then** the blocking reason is shown as a destructive alert at the top of the sheet body and the submit button is disabled.

---

### User Story 2 - Release an active restriction (Priority: P1)

A staff member removes a restriction currently limiting the member: a suspension (休会解除), a gate stop (ゲートストップ解除), or a lesson-reservation penalty (予約ペナルティ解除). Each surface first shows the **current state of the restriction** read-only, then asks for a release reason, and — for the two releases that take effect immediately — requires an explicit "I have reviewed the above" acknowledgement before the destructive primary button becomes enabled.

**Why this priority**: A restriction that cannot be lifted from the CRM forces a manual back-office request. Each release is a self-contained slice.

**Verification**: For a suspended member, a gate-stopped member, and a member with an active penalty, open the matching surface, confirm the current-state block reflects real member data, release, and confirm the banner/badge disappears after the refresh.

**Acceptance Scenarios**:

1. **Given** a member with status 休会中, **Then** `ステータス変更` lists exactly 休会解除 and 退会申請; the 休会解除 sheet shows 休会開始月, 予定終了月 and 休会費用 read-only, asks for 復帰月 (required), and notes that billing resumes on the 1st of the selected month.
2. **Given** a member with an active gate stop, **Then** `ステータス変更` lists ゲートストップ解除 **in addition to** whatever that member's own status offers (a 休会中 gate-stopped member gets 休会解除, 退会申請 and ゲートストップ解除), and 管理操作 hides ゲートストップ設定; the release sheet shows the current setting (設定日時, 設定者, pattern, target store, gate message), asks for 解除理由 (required, fixed list) and 詳細 (optional), shows the operator and date the release will be recorded under, and requires the acknowledgement checkbox.
3. **Given** the gate-stop banner, **When** the gate-stop pattern is 常時入退館（ストップなし）, **Then** no banner is shown — that pattern is the normal, unrestricted state.
4. **Given** a member with an active reservation penalty, **Then** the penalty banner shows the block end date plus no-show count and applied date and offers `解除...`; the release sheet shows the current penalty read-only, asks for 解除理由 (required) and 詳細 (optional), discloses that the member is notified on release, and requires the acknowledgement checkbox.
5. **Given** any release succeeds, **Then** the corresponding banner disappears on the next render without a manual page reload.

---

### User Story 3 - Perform an HQ-only administrative action (Priority: P2)

A headquarters operator performs an administrative action: setting a gate stop, registering a blacklist entry, cancelling a scheduled withdrawal, cancelling an enrollment before the usage start date, or deleting a withdrawn member's PII. Each is permission-gated; ineligible users never see an enabled control.

**Why this priority**: Lower frequency and HQ-restricted, but required for `A-01 FR-014 / FR-015 / FR-016 / FR-018` completeness.

**Verification**: Sign in as each role and confirm the visibility/enabled matrix in FR-004; then execute each action as HQ against a suitable member and confirm the audit trail lands in the 変更履歴 tab.

**Acceptance Scenarios**:

1. **Given** the 管理操作 dropdown, **Then** it shows the `管理操作` label, a separator, then ゲートストップ設定 (hidden when an active gate stop already exists) and ブラックリスト登録 (destructive). 強制退会 is not offered (Amendment A1).
2. **Given** the ゲートストップ設定 sheet, **Then** it offers the three _settable_ `A-01 FR-014` patterns as radio cards — スタッフ常駐時間のみ入館不可 / 常時入館不可 / スタッフ常駐時間以外は入館不可 (常時入退館（ストップなし）is the absence of a stop and belongs to the release action) — plus 設定理由 (required), ゲート端末メッセージ (optional), a `メッセージ確認後も入館不可にする` checkbox, and a warning that the setting reaches the gate device immediately; submission is confirmed by a dialog.
3. ~~**Given** the 強制退会 dialog, **Then** it warns the action is irreversible and auto-registers a blacklist entry, renders the brand × payment-method threshold table with the member's own brand highlighted, and requires a free-text 理由 before the destructive action is enabled.~~ Removed 2026-09-15 (Amendment A1).
4. **Given** the ブラックリスト登録 dialog, **Then** it shows the target member (氏名, 会員ID, 登録日 = recorded at execution), requires 登録理由 from a fixed list (迷惑行為 / 未納金 / 不正利用 / 機器破損 / その他), accepts an optional メモ, and is unavailable when the member already has an active blacklist entry.
5. **Given** a member with status 退会予定 whose contract usage start date has not arrived, **Then** 退会取り消し is offered and the dialog states the status returns to 有効; **given** the usage start date has arrived, **Then** both entry points are disabled with the reason shown.
6. **Given** a withdrawn member, **Then** the header shows only the `⋯` menu with 個人情報削除 (再入会 was removed on 2026-09-18).
7. **Given** the 個人情報削除 dialog, **When** the member is blacklisted and/or has an unpaid balance, **Then** a destructive alert names each applicable blocker and the delete action is disabled; otherwise 削除理由 and a typed member-ID confirmation are both required.
8. **Given** an 有効 member before the usage start date, **When** 入会取り消し is confirmed with a 取消理由, **Then** the contract is voided, the linked enrollment application becomes 取消, and the toast 「入会を取り消しました」 / 「契約を無効化しました」 appears.

### Edge Cases

- **Concurrent applications**: a second suspension while one is pending, or a suspension while a withdrawal is pending, is rejected by the server; the sheet surfaces the error and stays open so the entry is not lost.
- **Status changed elsewhere**: the member's status changed since load and the submitted operation no longer applies. The server rejects it; the screen refetches and the menu re-renders for the new status.
- **Gate-stop pattern reset**: 常時入退館（ストップなし）is not offered in the _set_ sheet at all — it means "no gate stop", the backend rejects it on the set endpoint, and the screen already has a dedicated release action (backend design answer 2026-08-10).
- **Re-set after release**: setting a gate stop again after a release creates a new record rather than reviving the released one — the released record stays for audit.
- **Member without the restriction**: opening a release surface for a member whose restriction is already gone shows a "no information" placeholder instead of a broken read-only block.
- **Proxy agreement timestamp in the future**: a future timestamp is rejected.
- **Viewer outside JST**: on a browser set to another timezone (e.g. Vietnam, UTC+7) the picker still means JST — 00:00 picked is sent as 00:00 JST (`…T15:00:00.000Z` the previous day), and "not in the future" is judged against the current instant.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Header composition & gating

- **FR-001**: The header MUST render, for a non-withdrawn member: `編集`, `ステータス変更 ▾`, and the `⋯` 管理操作 dropdown; and for a withdrawn / force-withdrawn member: only a `⋯` dropdown containing 個人情報削除.
- **FR-002**: The `ステータス変更` menu contents MUST be derived from the member status: **有効** → 休会申請 / 退会申請 / 入会取り消し (only while the usage start date has not arrived) / 移籍申請; **仮会員** (approved, usage start date still ahead) → 入会取り消し only; **休会中** → 休会解除 / 退会申請; **退会予定** → 退会取り消し. No other combination is offered.
  - Gate stop is **not** a status and MUST NOT be part of that mapping: ゲートストップ解除 MUST be offered whenever an active gate stop exists, on top of the entries the member's own status already contributes, because a member can be gate-stopped while on leave or scheduled to withdraw (backend design answer 2026-08-10).
- **FR-003**: The `⋯` 管理操作 menu MUST contain ゲートストップ設定 (hidden when an active gate stop already exists — decided by the gate-stop record, never by the member status) and ブラックリスト登録 — not 強制退会 (Amendment A1) — (disabled with an inline reason when an active blacklist entry exists), under a `管理操作` group label and separator.
- **FR-004**: Every menu item and button MUST be permission-gated: a user without the permission MUST NOT be able to trigger the surface. Blocking _business_ constraints MUST be shown as an inline destructive reason on the enabled-looking item rather than by silently hiding it. The role gates are:

  | Surface                                                                 | Headquarter / System | Manager | Staff                                | Observer                                         | Trainer                 |
  | ----------------------------------------------------------------------- | -------------------- | ------- | ------------------------------------ | ------------------------------------------------ | ----------------------- |
  | 編集                                                                    | ○                    | ×       | ×                                    | ×                                                | no access to the screen |
  | 休会申請 / 退会申請 / 移籍申請 / 休会解除 / 退会取り消し / 入会取り消し | ○                    | ○       | ○ (職位に依る, resolved server-side) | ×                                                | 〃                      |
  | ゲートストップ設定 / 解除                                               | ○                    | ○       | ○ own store only                     | ×                                                | 〃                      |
  | 予約ペナルティ解除                                                      | ○                    | ○       | ○                                    | × (tooltip 「ペナルティ解除の権限がありません」) | 〃                      |
  | ブラックリスト登録 / 個人情報削除                                       | ○                    | ×       | ×                                    | ×                                                | 〃                      |

#### Shared behaviour across all surfaces

- **FR-005**: Application-type surfaces (休会申請 / 退会申請 / 移籍申請) MUST include a 代理申請 block that is **always on** — 合意日時 (required, not in the future) and 合意方法 (required: 来店 / 電話 / メール / LINE) — and the operation MUST NOT be submittable without both, satisfying `A-01 FR-017`. 合意日時 MUST be entered and shown as JST wall-clock time whatever the browser timezone, so the value read back on A-03 (and anywhere else it is displayed) is the one picked (clarified 2026-10-30). There is no `スタッフが代理申請する` switch: a filing from the CRM counter is a proxy filing by definition and the API accepts only `applicationSource: proxy` (Amendment A4). The prototype's switch (default OFF) is a known deviation — prototype-gap-list #10.
- **FR-006**: Surfaces marked "Sheet + confirm dialog" MUST commit in two steps: the sheet's primary button validates the form and opens a confirmation dialog restating the concrete effect (dates, stores, amounts); only the dialog's action performs the write. Cancelling the dialog MUST preserve the entered values.
- **FR-007**: Surfaces whose effect is immediate and hard to reverse (ゲートストップ解除, 予約ペナルティ解除) MUST additionally require an explicit acknowledgement checkbox (ゲートストップ設定 relies on its confirm dialog) before the destructive primary control is enabled.
- **FR-008**: On success every surface MUST close, raise a success toast, and invalidate the member detail plus the affected sub-resources so the head-up card, banners, and 変更履歴 tab reflect the change without a manual reload.
- **FR-009**: On failure the surface MUST stay open with the entered values intact and surface the server's reason (error toast and/or an inline destructive alert). A server-side rejection MUST NOT be reported as success.
- **FR-010**: While a write is in flight the primary and cancel controls MUST be disabled so the operation cannot be double-submitted.
- **FR-011**: Every surface MUST render a read-only context block first (the current restriction / previous contract / target member) so the operator can confirm they are acting on the right record before entering anything.
- **FR-012**: Required fields MUST carry a required marker and optional fields an optional marker, consistently with the rest of the CRM.

#### Per-surface requirements

- **FR-013 (休会申請)**: Fields — 休会開始月 (required, month), 休会終了月 (required, month), 休会理由 (optional). When an unpaid balance exists the sheet MUST show a destructive alert and disable submission. When the member has an active discount, the sheet MUST show an 適用中の値引き確認 block listing the active individual fee adjustment and the active point discount, plus a `ポイント値引き分を返還する` checkbox restricted to Manager-or-above (with an explanatory tooltip when not permitted); ticking it MUST require a 返還事由 and MUST show the expected refund amount — implementing `A-01 FR-S001`. The pickers work in months; the request carries dates — `startDate` is the 1st of 休会開始月, except when 休会開始月 is the current month, where it is **today** (the API rejects a `startDate` before today, BR-SUS-001, and a month already under way cannot start on its 1st); `endDate` is the last day of 休会終了月 (updated 2026-10-12).
- **FR-014 (退会申請)**: Fields — 退会予定日 (required, date, at least 7 days out per BR-WDR-001) and 退会理由 (required, **free text**, sent as `memo`). Selecting a date MUST show 「{YYYY/MM/DD} 付で退会処理されます。」. The confirm dialog MUST name the member and state that reversing the application requires a separate procedure. The sheet always files a normal withdrawal (`reasonCode: normal`). **Before the usage start date the sheet MUST NOT submit**: it shows the warning 「利用開始日（YYYY/MM/DD）前の会員です。退会申請ではなく「入会取り消し」で処理してください。」 and a 「入会取り消しへ」 button that closes the sheet and opens FR-026 — `A-01 FR-005` v6. ~~The withdrawal type MUST be derived by the system (resolved 2026-07-29).~~ Superseded by Amendment A3. The sheet MUST NOT present a reason picklist.
- **FR-015 (移籍申請)**: Fields — 現在の主契約店舗 (read-only), 移籍先店舗 (required, from the store master), 移籍理由. Selecting a destination MUST show the applicable approval workflow (JOYFIT: 3-step auto transfer; FIT365: 4-step manual). Submission MUST be blocked while the member has an unpaid balance, or while a JOYFIT member is inside the cancellation-fee period (FIT365 is not blocked by the period — A-02 ブランド別設定), each with its own destructive alert.
- **FR-016 (休会解除)**: MUST show the active suspension (休会開始月, 予定終了月, 休会費用) read-only, ask for 復帰月 (required, month), state that billing resumes on the 1st of that month, and note that normal monthly billing resumes after the return. Releasing **shortens the active suspension's end month** rather than creating a separate release record (resolved 2026-07-29). 復帰月 MUST be the current month or later — a past month MUST be rejected with a validation message, since retroactive release is not supported and no invoice correction is performed — and MUST NOT be later than the month the suspension is already scheduled to end, because a release never extends a suspension (API `E-SUS-217`). Choosing the current month releases the member immediately; a later month keeps the member 休会中 until the last day of the month before 復帰月 (updated 2026-10-02, once the API accepted `resumeMonth`).
- **FR-017 (ゲートストップ設定)**: MUST offer the three settable `A-01 FR-014` patterns as radio cards, each with a one-line explanation; 設定理由 (required: 迷惑行為 / 未納金 / 不正利用 / その他); ゲート端末メッセージ (optional); a `メッセージ確認後も入館不可にする` checkbox; and a warning that the setting reaches the gate device immediately. Submission goes through a confirm dialog. The **pattern is the authoritative restriction model** — confirmed by the backend on 2026-08-10, which adopted the 4-pattern enum and dropped its own store-scope field. The sheet MUST NOT offer a store-scope selector: a gate stop always applies to every store. The store carried on the gate-stop record is **audit information** (whose staff set it) and is displayed read-only in the release sheet only; it MUST NOT be labelled or read as a scope.
- **FR-018 (ゲートストップ解除)**: MUST show the current setting (設定日時, 設定者, パターン, 端末メッセージ — each `—` when absent) read-only, ask for 解除理由 (required: 問題解決済み / 誤設定 / 本人確認完了 / その他) and 詳細 (optional), display the release operator and release date that will be recorded, and require the acknowledgement checkbox. The confirm dialog MUST state that the member regains entry.
- **FR-019 (予約ペナルティ解除)**: MUST show the current penalty read-only (適用日, 予約不可期限, 無断キャンセル回数, 対象), ask for 解除理由 (required) and 詳細 (optional), disclose that the release is pushed to the member's app, and require the acknowledgement checkbox. The release takes effect immediately — it does **not** create a pending application. Source requirement: `D-01 FR-010`; `A-01` does not define it.
- **FR-020 (退会取り消し)**: MUST state that the member status returns to 有効. It MUST be offered while the member is 退会予定 **and** the contract usage start date has not arrived (a null date counts as not arrived); from that date on both the menu item and the banner button MUST be disabled with the tooltip 「利用開始日以降のため取り消し不可」 — `A-03 FR-002` scopes the operation to 一覧または会員詳細 and permits it 利用開始日前のみ (A-03 L141, L143, L151). This supersedes the 2026-08-11 MR-review call that dropped the gate (see G-A). The 取り消し事由 MUST be required (A-03 L145), and a server rejection MUST surface the API's own `userMessage` rather than a generic failure toast.
- **FR-021 (強制退会)** — **superseded 2026-09-15, see Amendment A1**: ~~The manual forced-withdrawal dialog IS in Phase 1 scope (resolved 2026-07-29). It MUST warn that the action is irreversible and auto-registers a blacklist entry, render the brand × payment-method threshold table (`JOYFIT SBPS: 2ヶ月連続未納` / `JOYFIT JACCS: 1ヶ月未納（代位弁済なし）` / `FIT365 SBPS: 2ヶ月連続未納` / `FIT365 JACCS: 3ヶ月猶予後`) with the member's brand row highlighted, and require a free-text 理由 before enabling the destructive action — `A-01 FR-016`. It operates on a single member on demand and is independent of the FR-016 monthly batch, which stays server-side and out of scope. The backend endpoint does not exist yet (see the API Contract Mapping row 9); the project keeps its mock route until the backend supplies one, and the request to add it is a tracked dependency of this feature.~~
- **FR-022 (ブラックリスト登録)**: MUST show the target member block (氏名, 会員ID, 登録日 = 「本日（実行時に自動記録）」), require 登録理由 (迷惑行為 / 未納金 / 不正利用 / 機器破損 / その他, sent as a one-element `reasonCategories`), accept an optional メモ, and warn that the entry is irreversible and makes the member's PII undeletable — `A-01 FR-015`.
- **FR-023 (再入会)** — **superseded 2026-09-18, see Amendment**: MUST show the previous contract (退会日, 旧プラン) read-only, ask for 再入会月 (required, month), a plan (required, radio list from the store's plan master showing name + monthly price), and an 入会金を免除する toggle. Submission MUST stay disabled while plans load or when none are available. Re-enrollment is an **immediate member-level operation, not a `C-01` enrollment application** (resolved 2026-07-29): it reactivates the existing member row and keeps the existing member number rather than issuing a new one, and the member's status is expected to be 有効 straight after success — no approval step. Because it bypasses `C-01`'s blacklist screening, re-enrollment MUST be blocked, with a stated reason, when the member has an active blacklist entry or an outstanding balance.
- **FR-024 (個人情報削除)**: MUST state that name / address / contact details are overwritten with dummy values and that the action is irreversible, and show the target member (対象会員 / 会員ID / ステータス); MUST be blocked — with a destructive alert naming each applicable blocker (「ブラックリスト登録者かつ未納金があるため削除できません」 / 「ブラックリスト登録者のため削除できません」 / 「未納金があるため削除できません」) — when the member is blacklisted and/or has an unpaid balance, per `A-01 FR-018`. Otherwise it MUST require 削除理由 (max 500, 「操作履歴に記録されます（500文字以内）」) and the operator typing the member ID (trimmed, full-width folded to half-width, case-insensitive); only then is 削除を実行 enabled, and the client sends the API literal `confirmation: "ANONYMIZE"`.
- **FR-026 (入会取り消し)** — **added 2026-09-23**, `A-01 FR-026`: a confirm dialog 「入会を取り消しますか？」 stating that, being before the usage start date, the enrollment and contract themselves are cancelled, the contract becomes void and the action is irreversible. It MUST show 対象会員 / 会員ID / 利用開始日, require 取消理由 (max 500 — API `cancelReason` maxLength; the original A-01 FR-026 sets no limit, placeholder 「例：本人都合により入会を取りやめ」), and keep 「入会を取り消す」 disabled while the reason is blank. It MUST be offered only while the usage start date has not arrived (Staff and above — `C-01` 権限マトリクス「入会取り消し」, permission `membership-applications.cancel`). **Status mapping**: the prototype shows the item under 有効, but the API keeps an approved member **仮会員 (`provisional`) until BAT-016 promotes them on the usage start date**, so on real data the item appears for 仮会員 members; an 有効 member with a future start date also gets it. On success: the contract is voided, the linked `C-01` enrollment application becomes 取消, operator / datetime / reason are recorded, and the toast 「入会を取り消しました」 (description 「契約を無効化しました」, action 「履歴を見る」) appears. **Endpoint**: `POST /api/v1/admin/applications/{applicationId}/cancel` — the `C-01 FR-M008` operation itself (`cancelReason` required, usage start date must be after today, at most 2 same-day cancellations, voids contract and member, sets the application to 取り消し済, triggers the refund). The member bundle carries no enrollment-application id, so the dialog first resolves it with `GET /api/v1/admin/applications?memberId=…&status=approved`. `status-changes/withdrawal` with `reasonCode: cancellation` is **not** used for this dialog.

#### Audit & history

- **FR-025**: Every operation MUST be recorded in the member change history (timestamp, operator, operation, reason/comment) so the 変更履歴 tab is the single audit surface. Per the user's scope note, change-history data for this feature is **seeded only** — no create / update / delete flows for history records themselves.

### Key Entities

- **Member head-up bundle**: what the header reads from — status, brand, member type, primary store, current main contract (with active suspension, active fee adjustment, active point discount, pending withdrawal), gate stop, active blacklist entry, active reservation penalty, unpaid amount, withdrawal date, and the constraint flags (`hasUnpaidFee`, `inCancellationPeriod`).
- **Status-change application**: a suspension / withdrawal / transfer application created by surfaces 1–3. Carries its dates or destination store, a reason, an application source (member-initiated vs staff proxy) and — when proxied — the proxy staff, agreement timestamp, and agreement method. Feeds the `A-02` / `A-03` list screens.
- **Gate stop**: a single active restriction per member — pattern, target scope/store, gate-device message, message-confirmation behaviour, set-by/set-at, cleared-by/cleared-at. Consumed by `B-01` entry judgement.
- **Blacklist entry**: one active entry per member — reason, optional memo/level, registered by/at, and its source (manual from this header vs automatic from forced withdrawal).
- **Reservation penalty**: `D-01`-owned state, orthogonal to member status — penalty type, applied at, block end, no-show count.
- ~~**Re-enrollment**~~ — removed 2026-09-18.
- **Enrollment cancellation**: voids a not-yet-started contract and its enrollment application — reason, operator, datetime.

---

## API Contract Mapping

**Rewritten 2026-09-23.** Every active surface now calls the real API. The live status of each endpoint, and the open backend items it references (`N…`), are kept in [`report.md`](../../../api-integration-output/member-detail/report.md) and are not duplicated here. The 2026-07-29 table (design doc v0.8.0 against the mock routes) is in git history.

| #   | Surface            | Real endpoint                                                                                                                                             | Open item that affects this spec                                                         |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | 休会申請           | `POST /api/v1/admin/members/{memberId}/status-changes/suspension`                                                                                         | —                                                                                        |
| 1b  | ポイント値引き返還 | `POST /api/v1/admin/members/{memberId}/points/refunds`                                                                                                    | —                                                                                        |
| 2   | 退会申請           | `POST /api/v1/admin/members/{memberId}/status-changes/withdrawal` (`normal`)                                                                              | —                                                                                        |
| 3   | 移籍申請           | `POST /api/v1/admin/members/{memberId}/status-changes/transfer`                                                                                           | N45 cancellation-fee exception path · N46 移籍元 store source                            |
| 4   | 休会解除           | `POST /api/v1/admin/suspension-applications/{id}/release`                                                                                                 | N21 — a `pending_suspended` member has no entry point to `/cancel`                       |
| 5   | ゲートストップ設定 | `PATCH /api/v1/admin/members/{memberId}/gate-stop`                                                                                                        | —                                                                                        |
| 6   | ゲートストップ解除 | `DELETE /api/v1/admin/members/{memberId}/gate-stop`                                                                                                       | —                                                                                        |
| 7   | 予約ペナルティ解除 | `POST /api/v1/admin/lesson-penalties/{penaltyId}/clear`                                                                                                   | —                                                                                        |
| 8   | 退会取り消し       | `POST /api/v1/admin/withdrawal-applications/{id}/cancel`                                                                                                  | N6 — no member filter on the application list; gate from `pendingWithdrawal.cancellable` |
| 9   | ~~強制退会~~       | not used (N42)                                                                                                                                            | —                                                                                        |
| 10  | ブラックリスト登録 | `POST /api/v1/admin/members/{memberId}/blacklist`                                                                                                         | —                                                                                        |
| 12  | 個人情報削除       | `POST /api/v1/admin/members/{memberId}/anonymize`                                                                                                         | —                                                                                        |
| 13  | 入会取り消し       | `POST /api/v1/admin/applications/{applicationId}/cancel` (id via `GET /api/v1/admin/applications?memberId=…&status=approved`) — **not in the report yet** | The withdrawal endpoint's `reasonCode: cancellation` is no longer used by the CRM        |

Read side: `GET /api/v1/admin/members/{memberId}` (head-up bundle incl. `gateStop`, `blacklist`, `activePenalty`, `currentMainContract.pendingWithdrawal` / `pendingTransfer` / `activeSuspension`) and `GET /api/v1/admin/stores` (transfer destinations).

---

## Gap Analysis — current implementation vs. target

Re-checked against the code on 2026-09-23.

### Missing prototype behaviour

| ID      | Surface            | Gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G-A** | 退会取り消し       | The prototype disables the menu item once the contract start date has passed (with a `開始後` deny badge). ~~**Withdrawn 2026-08-11**: the prototype's gate carries the 入会取り消し rule, which does not apply to revoking a 退会申請; the API's `422 E-WDR-201` is expected to be dropped from this endpoint.~~ **Reinstated 2026-09-14** — the withdrawal was wrong: source spec A-03 `260901_v3` FR-002 (dated after that call) scopes the operation to 一覧または会員詳細 and allows it 利用開始日前のみ, with 利用開始日以降 an error path (A-03 L141, L143, L151, L191-L193). The gate now lives on both entry points, driven by `currentMainContract.usageStartDate`; `E-WDR-201` stays. Two further A-03 FR-002 deltas: the 取り消し理由 is **required** (A-03 L145, L151 — the field was 任意 and is now mandatory), and the post-cancel member status must be 有効（通常）, which A-03 L144 records as an API-side fix (the endpoint returns `provisional`). |
| **G-B** | ゲートストップ解除 | **Closed** (verified 2026-09-23 — confirm dialog and 解除予定者 / 解除予定日時 block present). ~~No confirm dialog. The prototype has an acknowledgement checkbox **and** a confirm dialog; the project has only the checkbox. Also missing the 解除予定者 / 解除予定日時 block.~~                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **G-C** | 予約ペナルティ解除 | **Closed** (verified 2026-09-23). ~~Same: no confirm dialog. Also missing the 対象となった予約 list and the 会員への通知 disclosure the prototype shows.~~                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **G-D** | 個人情報削除       | ~~No 削除理由 field and no typed confirmation, although the API requires both (`reason`, `confirmation: "ANONYMIZE"`, described in the doc as "UI shows a typed-confirmation modal").~~ **Closed** — the dialog collects both: a required 削除理由 textarea (max 500, matching the API cap) and a typed `ANONYMIZE` gate that keeps 削除を実行 disabled until it matches. Confirmed 2026-07-29 (Otaki): the API keeps both fields required and the FE supplies them, The prototype `0a73739` now has both (typed **member ID**, not the literal), so only the literal sent to the API differs — FR-024.                                                                                                                                                                                                                                                                                                                                                                 |
| **G-E** | 移籍申請           | **Closed** — the real client always sends `applicationSource: proxy` with the `proxy` block (Amendment A4). ~~The proxy block is collected in the form and accepted by the mock schema, but the route handler drops `is_proxy` / `proxy_agreed_at` / `proxy_method` — the `A-01 FR-017` audit trail is silently lost for transfers.~~                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **G-F** | 退会申請           | **Closed 2026-09-23** — picklist removed earlier; the type derivation was replaced by the FR-014 pre-start block and the FR-026 dialog (`enrollment-cancel-dialog.tsx`), and the sheet always files `normal`. ~~The project presents a 6-value 退会理由 picklist plus a detail field where the prototype has a single required free-text 退会理由. Resolved 2026-07-29 in favour of the prototype: remove the picklist and the detail field from the sheet, the form schema, and the mock request schema, and derive the withdrawal type from the contract usage start date instead.~~                                                                                                                                                                                                                                                                                                                                                                                  |

### API-contract gaps

**Superseded 2026-09-23.** G-01 … G-13 compared the mock routes with design doc v0.8.0. The screen now runs on the real API, so the open API issues are tracked in [`report.md`](../../../api-integration-output/member-detail/report.md); the table is in git history.

### Already ahead of the prototype (keep as-is)

- ブラックリスト登録 is disabled when an active entry exists — matches the API's `409 E-BL-200`; the prototype has no such guard.
- The gate-stop banner is suppressed for pattern 常時入退館（ストップなし）, correctly treating it as the unrestricted state.
- Surfaces are mounted conditionally and reset on close, so stale form state cannot leak between members.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For each member status (and with / without an active gate stop, before / after the usage start date), the header offers exactly the operations listed in FR-001–FR-003 and nothing more — verified across 100% of status × role combinations.
- **SC-002**: A staff member can complete any single header operation — open, fill, confirm, see the result — in under 60 seconds without leaving the member detail screen.
- **SC-003**: 100% of blocked operations (unpaid balance, cancellation-fee period, active blacklist, usage already started, already anonymized) are surfaced _before_ submission, as a disabled control with a stated reason or a destructive alert inside the surface.
- **SC-004**: 0% of successful operations require a manual page reload for the head-up card, badges, and banners to show the new state.
- **SC-005**: 100% of the operations leave a change-history record naming the operator, the operation, and the reason.
- **SC-006**: No operation can be submitted twice by double-clicking the primary control.

---

## Assumptions

- Member status drives most of the header, but it is not the only switch: the statuses that expose status-change items (有効 / 休会中 / 退会予定) are mutually exclusive, while gate stop, blacklist and reservation penalty are independent flags that can coexist with any of them and contribute their own header entries and banners. Gate stop in particular is an orthogonal axis, not a status (backend design answer 2026-08-10).
- Permission gating stays with the project's existing permission constants rather than raw role names; the mapping from the `A-01` role matrix to those permissions is already established and is not re-litigated here.
- ~~Three operations have no backend endpoint yet — 休会解除, 予約ペナルティ解除, 強制退会.~~ Updated 2026-09-23: 休会解除 and 予約ペナルティ解除 now have real endpoints; 強制退会 and 再入会 were removed from the screen. 入会取り消し (FR-026) uses the C-01 cancel endpoint.
- Reason vocabularies that exist as enums on our side but as free text in the API (ゲートストップ解除, ブラックリスト登録) are UI-side pick lists that serialise into the API's free-text field; they are not treated as new backend enums. 退会理由 is the exception and is free text on both sides (FR-014).
- The prototype's mock values inside read-only context blocks (e.g. hard-coded 管理者A（仮）, ¥1,100/月 休会費用, the 2026/04/20 banner timestamp, toast descriptions such as 「開始日：翌月1日」) are placeholders; the real screen renders them from the member bundle.
- 代理申請 agreement-method labels shown to the user stay Japanese; the value sent to the backend uses the API's enum keys.

---

## Out of Scope for Phase 1

- **契約操作 tab surfaces**: 主契約変更, オプション追加 / 変更 / 解約, 個別会費調整. Opened from the tab, not the header — they belong to the contracts-tab feature.
- **Change-history writes**: per the user's scope note, change history is seed-only here — no create / update / delete flows for history records.
- **臨時休会 (`A-01 FR-022`)**: a separate HQ-only screen (`emergency-suspension`), not a header surface. The API's bulk temporary-recess job endpoints belong to that feature.
- **主契約一括変更 (`A-01 FR-020`)**: a bulk action on the member **list**, not the detail header.
- **ブラックリスト一覧 / 詳細 (`A-01 FR-015`)**: independent HQ screens. Only the _registration_ action belongs to this header.
- **移籍・休会・退会の承認フロー**: owned by `A-02` / `A-03`. This feature only creates the applications.
- **強制退会 (`A-01 FR-016`)**: both the monthly batch and — since qa-223 (2026-09-15) — the manual dialog. The screen only shows the result.
- **休会申請 cancellation for a `pending_suspended` member**: no entry point until the prototype adds one (report N21).
- **移籍申請 cancellation**: no spec or API operation; the 移籍申請中 banner has no 取り消す (prototype-gap-list #8).
- **会員情報編集フォーム (member-form)**: the `編集` button navigates to it; the form itself is feature `020-member-form`.
- **Deep-link `?sheet=` parameters**: present in the prototype for manual testing only, not a product requirement.

---

## Traceability

| UI element (prototype)                       | Requirement source                                                                 | Spec requirement |
| -------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------- |
| `ステータス変更` dropdown                    | `A-01 FR-005`, supplementary `A-01-01-b`                                           | FR-002           |
| `管理操作` dropdown                          | `A-01 FR-014`, `FR-015`, `FR-016`                                                  | FR-003           |
| 休会申請 sheet                               | `A-01 FR-005` (休会申請)                                                           | FR-013           |
| 適用中の値引き確認 + ポイント返還            | `A-01 FR-S001`                                                                     | FR-013           |
| 退会申請 sheet                               | `A-01 FR-005` (退会申請)                                                           | FR-014           |
| 移籍申請 sheet + workflow hint               | `A-01 FR-005` (移籍申請) + brand-difference table (JOYFIT 自動 / FIT365 手動2段階) | FR-015           |
| 休会解除 sheet                               | `A-01` 休会 definition (有効扱い・休会費はマスタ管理) — no dedicated FR            | FR-016           |
| ゲートストップ設定 sheet (4 patterns)        | `A-01 FR-014` (4 patterns, aligned with `B-01 FR-M005`)                            | FR-017           |
| ゲートストップ解除 sheet                     | `A-01 FR-014` (解除者・解除日時を記録)                                             | FR-018           |
| 予約ペナルティ解除 sheet                     | `D-01 FR-010` (out-of-document reference)                                          | FR-019           |
| 退会取り消し dialog                          | `A-03 FR-002` — 一覧または会員詳細から、利用開始日前のみ、取り消し理由必須         | FR-020           |
| ~~強制退会 dialog~~ — removed 2026-09-15     | `A-01 FR-016` (batch only, qa-223)                                                 | ~~FR-021~~       |
| ブラックリスト登録 dialog                    | `A-01 FR-015` (BL登録操作は会員詳細から)                                           | FR-022           |
| ~~再入会 sheet~~ — withdrawn 2026-09-18      | not in `A-01`; re-enrollment belongs to `C-01` 管理画面入会 (Amendment 2026-09-18) | ~~FR-023~~       |
| 個人情報削除 dialog                          | `A-01 FR-018`                                                                      | FR-024           |
| 入会取り消し dialog + 退会申請 redirect      | `A-01 FR-026`, `FR-005` (v6)                                                       | FR-026, FR-014   |
| 代理申請 block (all applications)            | `A-01 FR-017` + API `applicationSource: proxy` only                                | FR-005           |
| ゲートストップ / ペナルティ / 申請中 banners | `A-01 FR-003` (ヘッドアップ集約)                                                   | FR-011, US2      |

---

## Q&A / Clarification Needed

All questions are resolved and kept, struck through, as a decision record. The open items that remain are backend or prototype items tracked in the report (N6, N21, N45, N46) and the FR-026 backend gap.

### ~~Q1 — 強制退会: manual dialog vs. batch-only~~ — RESOLVED 2026-07-29, **SUPERSEDED 2026-09-15**

~~Keep the manual dialog and request a backend endpoint.~~ The client chose batch-only (qa-223); the item is removed from the screen. See Amendment A1.

### ~~Q2 — 再入会: dedicated endpoint or reuse the enrollment-application flow?~~ — RESOLVED 2026-07-29, **SUPERSEDED 2026-09-18**

The 2026-07-29 answer below no longer holds — the action was removed from the screen (see Amendment 2026-09-18); re-enrollment reuses the enrollment-application flow after all.

An immediate member-level operation with its own endpoint; the existing member row and member number are reused; it carries its own blacklist / delinquency guard. See FR-023 and API Contract Mapping row 11.

### ~~Q3 — 休会解除: what does 復帰月 actually change?~~ — RESOLVED 2026-07-29

It shortens the active suspension's end month; 復帰月 must be the current month or later; retroactive release is unsupported, so no `F-01` invoice correction is involved. See FR-016 and G-07.

### ~~Q4 — Gate stop: reconcile the 4-pattern model with the API's scope/messageType model~~ — RESOLVED 2026-07-29

`A-01 FR-014` is authoritative: the 4 patterns stay, no scope selector is added, and the backend is asked to add a `pattern` field and persist 設定理由. See FR-017 and G-08.

### ~~Q5 — Withdrawal reason vocabulary~~ — RESOLVED 2026-07-29

The withdrawal type is derived automatically from the contract usage start date; the motivation is a single required free-text 退会理由; the project's 6-value enum and detail field are removed. See FR-014, G-04 and G-F.

### ~~Q6 — 予約ペナルティ解除 ownership~~ — RESOLVED by the backend (2026-09)

It stays on this header and uses the `D-01`-side endpoint `POST /api/v1/admin/lesson-penalties/{penaltyId}/clear`.

<details><summary>Original question</summary>

**Context**: This surface is driven by `D-01 FR-010`, has no endpoint in the design doc, and no `A-01` requirement, yet it is rendered on the member detail screen.

**What we need to know**: Does the reservation-penalty release stay on the member detail header in Phase 1, and if so, is the endpoint expected under `D-01`? Confirm this is Phase 1 and not a later-phase placeholder.

</details>

### ~~Q7 — 個人情報削除 confirmation strength~~ — RESOLVED 2026-07-29 (Otaki) and matched by the prototype `0a73739`

Typed confirmation + required reason. The prototype asks for the member ID; the client then sends the API literal. See FR-024.

<details><summary>Original question</summary>

**Context**: The API requires a typed literal (`confirmation: "ANONYMIZE"`) plus a mandatory `reason`, and describes a typed-confirmation modal. Neither the prototype's dialog nor the project's has either.

**What we need to know**: Adopt the API's typed-confirmation UX (deviating from the prototype), or keep the prototype's simple confirm and let the client inject the literal? _Recommended_: adopt typed confirmation + required reason — the operation is irreversible and the API mandates the fields.

</details>
