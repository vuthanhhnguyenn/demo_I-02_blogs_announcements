# Feature Specification: Member Detail (会員詳細)

**Feature Branch**: `032-member-detail` (spec folder; work continues on `feat/integration-api-member`)
**Created**: 2026-07-31 (folder renamed from `specs/member-detail` and re-baselined 2026-09-23)
**Status**: Draft
**PO Spec**: `A-01` — 会員管理（一覧） / supplementary sections `A-01-01`, `A-01-01-a` … `A-01-01-i`
**Source**:

- Requirement spec: `dx-fitness/fitness-spec` @ `a5abfdb` (2026-09-12) — `crm/requirements/A-01.md` **v260901_v6** (last A-01 change `89c2c79`, 2026-09-01).
- UI prototype: `dx-fitness/fitness-crm-ui` @ `0a73739` (2026-09-17) — `src/pages/member-detail.tsx` (5,820 lines).
- **アプリ連携 (FR-026 – FR-030, added 2026-11-13)**: `crm/requirements/A-01.md` **261112_v17** (`origin/main` @ `f05f639`; FR-027 added in 261102_v13) + `mobile/requirements/APP-F-02.md` FR-M006 / FR-M009; prototype `fitness-crm-ui` @ `9428dc2` (design commit `7e636e9`, 2026-11-12) — `src/components/member-app-link.tsx`, `src/data/app-link.ts`. API: API-093 v0.15 §24 – §27 + the §4 detail's `linking`.
- Detailed sub-specs (this spec is the umbrella; they hold the field-level rules and the resolved source conflicts): [`header-actions/`](./header-actions/spec.md) (header sheets/dialogs), [`tabs/`](./tabs/spec.md) (the 10 tabs) (moved here from `specs/021-member-detail-header-actions` and `specs/022-member-detail-tabs` on 2026-09-23; `tabs/` also absorbed the former `payment-history/` and `usage-history/` sub-specs). Both sub-specs were re-baselined to the same sources on 2026-09-23.

**Input**: User description: "member detail, sửa tên thư mục cho khớp pattern với các màn khác"

## Overview

The member detail screen is the single-member operations hub of the CRM. From the member list a staff or headquarters user drills into one member to review their full profile and history and to perform member operations (status changes, contract operations, gate-stop, blacklist, personal-data handling). The screen is organised as a status-aware **head-up card** (with an at-a-glance summary strip and warning banners) plus **10 tabs** covering basic info, contracts, payments, usage, points, surveys, training, body data, referrals, and change history.

This spec covers the detail screen (A-01-01), its tab sub-screens and the action sheets/dialogs. The member list (A-01) and the member edit form (`020-member-form`) are separate features; this screen only links to them.

### Changes in this re-baseline (A-01 v4 → v6, prototype `426a9b3` → `0a73739`)

| Change                                            | Source                                                                | Effect on this screen                                                                                                                                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-025 動作確認用アカウント** added             | A-01 v5 (2026-07-31) + prototype                                      | New toggle on 基本情報, System/Headquarter only, with a confirm step and an audit trail (FR-016)                                                                                                                                  |
| **FR-026 入会取り消し** is a standalone operation | A-01 v6 (2026-09-01) + prototype                                      | Its own menu item and dialog with a required 取消理由. 退会申請 is blocked before the usage start date and points to it (FR-018, FR-019). This supersedes `header-actions/` G-F, which derived 入会取消 inside the 退会申請 sheet |
| Summary strip is 3 items                          | prototype                                                             | 未納額 / 申請・調整 / 直近のイベント. The 来館頻度 item was removed                                                                                                                                                               |
| Head-up shows 主契約店舗 and 登録日               | A-01 FR-004 + prototype                                               | Added to the ID line                                                                                                                                                                                                              |
| Blacklist banner, HQ-only                         | A-01 FR-015 + prototype                                               | New banner (FR-006)                                                                                                                                                                                                               |
| FR-S001 ポイント手動返還                          | A-01 v3 + prototype                                                   | On 紹介関係, Manager and above (FR-014)                                                                                                                                                                                           |
| 強制退会 removed from the screen                  | client decision qa-223 (2026-09-15)                                   | Not in the 会員操作 menu, although the prototype still shows it (prototype-gap-list #2)                                                                                                                                           |
| 入退館設定 card removed                           | client decision qa-121                                                | 基本情報 shows a ゲートストップ card instead (FR-009)                                                                                                                                                                             |
| 代理申請 always on                                | API accepts only `applicationSource: proxy` from the CRM (report N20) | No switch; 合意日時 + 合意方法 always required (FR-020)                                                                                                                                                                           |

### PO decisions 2026-09-25 (Unit 1 test review)

Answers to the open questions raised by the Unit 1 test run (`tests/cases/TC -【Fitness CRM】- [A-01-01][…].md`, notes marked `PO 2026-09-25`).

| #   | Topic                                | Decision                                                                                                                                                                                             | Requirement touched    |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| P1  | Pending-application label            | Follow the prototype: for **every** application type (休会 / 退会 / 移籍) the status badge and the 申請・調整 cell show the pending-application label (e.g. 退会申請中), not the member status       | FR-002, FR-004         |
| P2  | Reception time in the pending banner | **Not required**                                                                                                                                                                                     | FR-007                 |
| P3  | Member outside the viewer's scope    | The server MUST answer **403** with a permission message (dev answers `404 E-MEM-001` today — backend item); the screen shows the message the server returns                                         | FR-025, Edge Cases     |
| P4  | Error copy                           | Error states show the server's `userMessage` (e.g. `404 E-MEM-001`, `400 E-VAL-001`) instead of a generic network-error message                                                                      | FR-025, `tabs/` FR-004 |
| P5  | Permission source                    | Gates follow the **permission flags of the viewer's position** (`GET /auth/crm/me` → `permissions`). A flag that is `true` grants the action whatever the role — e.g. 編集 follows `can_edit_member` | FR-021, FR-025         |
| P6  | 移籍 pending banner                  | **No** 「取り消す」 (prototype-gap-list #8 approved); the way back is 否認 in A-02                                                                                                                   | FR-007                 |
| P8  | 退会申請中 banner colour             | Follow the prototype: destructive (退会), warning (移籍), info (休会)                                                                                                                                | FR-007                 |
| P10 | 退会済み status badge                | No dot                                                                                                                                                                                               | FR-002                 |
| P12 | 「主契約: <name>」 badge             | Uses the plan's internal CRM name (`plan.name`), not `nameForMember`                                                                                                                                 | FR-002                 |
| P13 | 休会 end next to the badge           | Full date `YYYY/MM/DD` (not month)                                                                                                                                                                   | FR-003                 |

P7, P9, P11, P14, P15 concern the tabs and are recorded in [`tabs/spec.md`](./tabs/spec.md) (Amendment 2026-09-25).

### Amendment 2026-11-13 — A-01 FR-027 アプリ連携

A-01 v13 added FR-027 (the link between the member number and the member's Yamauchi app account, APP-F-02); the prototype drew it on 2026-11-12. It adds a 4th item to the summary strip and one sheet with its confirm dialogs (FR-026 – FR-030 below, User Story 6).

| #   | Topic                                    | Decision / source                                                                                                                                                                                                                                                                                                                                     | Status                                          |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| L1  | ロック解除 on a **temporary** lock       | Not offered. A-01 FR-027 defines ロック解除 for the **permanent** lock only, and APP-F-02 FR-M006 lifts the temporary lock on its own after 30 min; the counter flow (APP-F-02 ④) sends only 永続ロック to ロック解除. Staff can still 手動紐付け a temporarily locked member. The API's unlock also accepts a temporary lock — unused by the screen. | Closed (spec)                                   |
| L2  | Linked account shows email **and** phone | The prototype draws one value (email _or_ phone); the API returns both, masked. The screen joins the non-null ones as `email／phone` (one value alone when the other is null, 「—」 when both are)                                                                                                                                                    | **Closed (PO 2026-11-13): keep `email／phone`** |
| L3  | More than one search hit                 | The prototype never shows a list. The screen takes the first linkable account other than the member's own; with none, it shows the member's own (already linked), else linked-to-another, else not found                                                                                                                                              | FE decision                                     |
| L4  | Link / unlink fails after the confirm    | The prototype only draws success. The sheet reopens with the input kept and the server's `userMessage` is toasted (P4)                                                                                                                                                                                                                                | FE decision                                     |
| L5  | Display source after a write             | The screen re-reads the member detail and 変更履歴 after every write; it never draws from a write's response                                                                                                                                                                                                                                          | FE rule                                         |

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Review a member at a glance (Priority: P1)

A staff member opens a member's detail screen and immediately sees who the member is and their current situation. Any exceptional state (gate-stop, blacklist, reservation penalty, a pending application) is surfaced as a banner above the card.

**Why this priority**: Understanding the member's current state is the prerequisite for every operation. This alone is a usable MVP.

**Verification**: Open a member from the list; confirm the head-up card, the summary strip and any banner match the member's state.

**Acceptance Scenarios**:

1. **Given** a member detail loads, **Then** the head-up card shows avatar, display name, status badge, kana, `ID / 旧No`, 主契約店舗, 登録日, a member-type badge and a `主契約: <name>` badge, and a 4-item summary strip (未納額 / 申請・調整 / 直近のイベント / アプリ連携).
2. **Given** the member is 休会中 with a known end month, **Then** 「<month> まで休会」 appears next to the status badge; **given** 退会予定, 「退会予定日 <date>」 appears there.
3. **Given** the member is gate-stopped, blacklisted (and the viewer is Headquarter/System), has an active reservation penalty, or has a pending application, **Then** the corresponding banner appears above the card.
4. **Given** the data is loading, **Then** a loading state is shown; on error, an error state; there is no partial/blank render.

---

### User Story 2 — Review member history across tabs (Priority: P1)

The user switches between tabs to review the member's basic info, contracts, payments, usage, points, survey responses, training records, body data, referrals, and change history.

**Why this priority**: The tabs are the screen's second purpose (OOUI "person" hub) and are read by every role that can open the screen.

**Verification**: Click each tab in turn; reload with `?tab=<key>` and confirm the same tab opens.

**Acceptance Scenarios**:

1. **Given** the detail screen, **Then** the tabs are, in order: 基本情報, 契約操作, 支払い履歴, 利用履歴, ポイント履歴, アンケート回答, トレーニング記録, ボディーデータ, 紹介関係, 変更履歴, and the active tab is reflected in the URL.
2. **Given** the ボディーデータ tab and a member who has not consented, **Then** no body data is shown, and the message distinguishes "not consented" from "consent refused".
3. **Given** any history tab with filters (period / month / store), **When** the user changes a filter, **Then** the list narrows without flashing back to a skeleton.
4. **Given** the pending-application banner's 「詳細を見る」, **When** clicked, **Then** the 変更履歴 tab opens.

---

### User Story 3 — Perform status changes (Priority: P2)

An eligible user changes the member's status from the **ステータス変更** menu. The menu offers only the operations valid for the member's current status, and blocked operations are shown disabled with the reason.

**Why this priority**: Status changes are the main write operations of the screen, but they depend on US1 to be understood.

**Verification**: Open the menu for members in each status (有効 / 休会中 / 退会予定 / 利用開始日前 / 未納あり / 解約手数料期間中) and compare the items and disabled reasons with FR-017.

**Acceptance Scenarios**:

1. **Given** an 有効 member, **Then** the menu offers 休会申請, 退会申請 and 移籍申請; 休会申請 and 移籍申請 are disabled with 「未納金があるため操作できません」 when there are unpaid fees, and 移籍申請 is disabled with 「解約手数料期間中のため移籍できません」 when a **JOYFIT** member is inside the cancellation-fee period (A-02 ブランド別設定: FIT365 = 可能, so a FIT365 member in the period keeps 移籍申請 enabled).
2. **Given** a 仮会員 member (or an 有効 member) whose usage start date has not arrived, **Then** the menu offers 入会取り消し with 「利用開始日（YYYY/MM/DD）前のため対象」, and the 退会申請 sheet blocks submission and points to 入会取り消し.
3. **Given** a 退会予定 member whose usage start date has passed, **Then** 退会取り消し is disabled with 「利用開始日（YYYY/MM/DD）以降のため取り消しできません」.
4. **Given** an application sheet (休会 / 退会 / 移籍), **Then** it requires 代理申請 evidence (合意日時 + 合意方法, always on — no switch) and a confirm step before submitting.

---

### User Story 4 — Perform management operations (Priority: P2)

A Headquarter/System user (and, for gate-stop, a Manager/Staff user) performs a management action from the **会員操作 (…)** menu: ゲートストップ設定, ブラックリスト登録; for a withdrawn member, 個人情報削除. A Headquarter/System user also flags a member as a 動作確認用アカウント.

**Why this priority**: These are low-frequency, high-impact operations restricted to few roles.

**Verification**: Sign in as each role and confirm which items are enabled; run each operation through its confirm step.

**Acceptance Scenarios**:

1. **Given** the 会員操作 menu of a non-withdrawn member, **Then** it shows a 「管理操作」 group with ゲートストップ設定 (only while no gate stop is active) and ブラックリスト登録. 強制退会 is not offered (qa-223).
2. **Given** a withdrawn (退会済み) member, **Then** the 編集 button and the ステータス変更 menu are gone and the 会員操作 menu offers only 個人情報削除.
3. **Given** a Headquarter/System user on 基本情報, **When** they switch 動作確認用アカウント on or off, **Then** a confirm dialog appears first, and afterwards the setter/datetime (or releaser/datetime) is shown and recorded in 変更履歴.
4. **Given** a Manager/Staff/Observer user, **Then** the 動作確認用アカウント toggle is read-only with 「本部権限が必要です」.

---

### User Story 5 — Refund points manually (Priority: P3)

When the automatic refund of a point discount did not happen (e.g. a referral benefit at a 休会申請), a Manager-or-above user returns the points by hand from 紹介関係.

**Why this priority**: A Should requirement (FR-S001) covering an exception path.

**Verification**: As Manager, open 紹介関係 → ポイントを手動返還, enter points and a reason, confirm; as Staff, confirm the button is disabled with its tooltip.

**Acceptance Scenarios**:

1. **Given** a Manager/Headquarter/System user, **When** they submit 返還ポイント and 返還理由 (both required), **Then** the refund is recorded and a success toast shows the amount.
2. **Given** a Staff user, **Then** the button is disabled with 「ポイント手動返還はManager以上の権限が必要です」.

---

### User Story 6 — Manage the member's app link (Priority: P2)

A member who cannot link the app by themselves (identity check fails, member number unknown, linked to the wrong account, or locked out) comes to the counter. After checking the member's ID document, a staff member opens アプリ連携 from the head-up and links the member's Yamauchi account by hand, re-links it, releases a permanent lock, or (Manager and above) removes the link.

**Why this priority**: Without it a locked-out or mis-linked member cannot use the app's membership card or entry (A-01 FR-027, APP-F-02 FR-M009).

**Verification**: Open members in each state (未連携 / 連携済み / 一時ロック中 / 永続ロック中 / 退会済み) as each role; run 手動紐付け, 紐付け直し, ロック解除 and 連携解除 through their confirm step and check 変更履歴.

**Acceptance Scenarios**:

1. **Given** any viewer but Trainer, **Then** the summary strip's 4th item アプリ連携 shows the state (未連携 / 連携済み / 一時ロック中 / 永続ロック中) and opens the アプリ連携 sheet.
2. **Given** a 未連携 or 一時ロック中 member, **When** a Staff-or-above user searches the account by its exact email or phone, ticks the identity check and confirms 「このアカウントと紐付けますか？」, **Then** the member becomes 連携済み with route 手動紐付け and the operator shown, and 「アプリと紐付けました」 is toasted.
3. **Given** a 連携済み member, **When** the user picks 別のアカウントに紐付け直す and confirms, **Then** the old account is released and the new one linked in one step (no 連携解除 first).
4. **Given** a 永続ロック中 member, **When** the user picks ロックを解除する, ticks the identity check and confirms, **Then** the lock and the failure count are cleared and 「ロックを解除しました」 is toasted. A 一時ロック中 member offers no ロック解除 (L1).
5. **Given** a 連携済み member and a Manager-or-above user, **When** they pick 連携を解除する and confirm 「アプリ連携を解除しますか？」, **Then** the member becomes 未連携. For Staff the option is disabled with 「連携解除は本部・マネージャーの権限で行います」.
6. **Given** an Observer, **Then** the sheet is read-only: the operations are shown but disabled with 「閲覧のみの権限のため操作できません」, and account search and identity check are not shown.

### Edge Cases

- **Withdrawn / force-withdrawn member**: only 個人情報削除 is available, and it is blocked when the member is blacklisted or has unpaid fees. Re-enrolling a withdrawn member is not a member-detail action — it goes through the `C-01` enrollment application (021 amendment 2026-09-18).
- **Gate-stopped member**: gate stop restricts entry only; 休会申請 / 退会申請 / 移籍申請 remain available under the same conditions as an 有効 member, plus ゲートストップ解除.
- **Before the usage start date**: 退会申請 cannot be submitted (the sheet points to 入会取り消し); after it, 入会取り消し is not offered and 退会取り消し is blocked.
- **Opened from a family-member or referrer link**: the breadcrumb shows 会員管理 › <parent name> › <member name>; otherwise a 「会員管理に戻る」 back link.
- **Access outside scope**: reaching a member outside the permitted scope is rejected with a permission error — server `403`, its message shown on screen (P3, P4).
- **Consent-gated body data**: data is hidden unless the member granted CRM body-data consent.
- **Viewer without blacklist rights**: the blacklist banner is not shown, even if the member is blacklisted.
- **App link on a withdrawn member**: no link can be made (「退会済みのため紐付けできません」, APP-F-02 FR-M010); the server refuses with `E-MEM-219`.
- **App link, stale screen**: a write that races another change is refused by the server (`E-MEM-215` already linked, `E-MEM-233` not linked, `E-MEM-235` re-link to the account already held, `E-MEM-232` account linked to another member); the screen shows the server's message and re-reads the state.
- **Linked member number that is also locked**: failures against a linked number still count, so a lock can coexist with 連携済み; the state shows 連携済み.

## Requirements _(mandatory)_

### Functional Requirements

**Head-up & banners**

- **FR-001**: The page header MUST show the member's display name as its title, with a 「会員管理に戻る」 back link, or a 会員管理 › <parent> › <member> breadcrumb when opened from a family-member or referrer link.
- **FR-002**: The head-up card MUST show avatar, display name, status badge, kana, member ID and old member number, 主契約店舗, 登録日, a member-type badge and a 「主契約: <name>」 badge (the plan's internal CRM name, `plan.name` — P12). While an application is pending — of any type, 退会 included (P1) — the status badge MUST show the pending-application label instead of the status. The 退会済み badge carries no dot (P10).
- **FR-003**: Next to the status badge the card MUST show 「<YYYY/MM/DD> まで休会」 (the full suspension end date — P13; ~~<month>~~) for a 休会中 member and 「退会予定日 <date>」 for a 退会予定 member.
- **FR-004**: The card MUST show a 4-item summary strip: 未納額 (amount, or 「なし」), 申請・調整 (pending-application and 「個別会費調整中」 badges, or 「なし」), 直近のイベント (「最終来館 <date>」), and アプリ連携 (FR-026).
- **FR-005**: The screen MUST show a gate-stop banner (「ゲートストップ中（<pattern>） — 全店舗への入館が制限されています」) and a reservation-penalty banner (until-date, no-show count, applied date) with a 「解除...」 action for Staff and above.
- **FR-006**: For Headquarter/System viewers only, the screen MUST show a blacklist banner (「ブラックリスト登録済み（<date> 登録） — 個人情報の削除はできません」) with a 「ブラックリスト詳細」 link.
- **FR-007**: While an application is pending, the screen MUST show a banner with its message ~~and reception time~~ (not required — P2), coloured destructive for 退会, warning for 移籍 and info for 休会 (P8), a 「詳細を見る」 link that opens 変更履歴, and a 「取り消す」 action for 退会 (→ 退会取り消し, FR-020). The 移籍 banner has **no** 「取り消す」 (P6). The 休会 cancel has no entry point yet (report N21).

**Tabs**

- **FR-008**: The screen MUST present the tabs listed in User Story 2 in that order, with the active tab reflected in the URL.
- **FR-009**: 基本情報 MUST show 個人情報 (birth date/age, gender, address, phone, email), 入会情報 (join date, brand group, store, referrer, campaign), 家族会員, 来館情報, ゲートストップ, a read-only 通知受信設定 card, and the 動作確認用アカウント card (FR-024).
  - **家族会員** comes with the member detail itself: the group already includes the member being viewed (flagged as 本人) in a fixed order — parent first, then member number ascending — with the remaining-slot count supplied. The screen MUST NOT prepend the current member or compute the remaining slots itself, and offers no add action (members add family in the app).
  - **通知受信設定** is keyed by **topic** (10 fixed topics, always all of them, in a fixed order), not by delivery channel. It is read-only, and the update date is empty for topics the member has never changed.
  - **ゲートストップ** card (replaces 入退館設定, removed per qa-121): 「設定なし」, or the pattern, terminal message, setter and set datetime with a 「解除...」 link to ゲートストップ解除.
- **FR-010**: 契約操作 MUST show 主契約 (including the usage start date), 個別会費調整 (history + add; period + adjusted amount + required reason), オプション契約 (add/change/cancel), キャンペーン適用, 1DayPass購入履歴, 契約サマリー, and a 休会・退会履歴 strip.
- **FR-011**: 支払い履歴 MUST show 入出金明細 (period/type filters), 請求一覧, and a 支払いサマリー (detail: `tabs/spec.md` FR-021 → FR-024, FR-009-a…d).
- **FR-012**: 利用履歴 MUST show 入退館履歴, レッスン予約履歴, オプション利用履歴, and a 利用状況 summary (detail: `tabs/spec.md` FR-025 → FR-029, UH-1…UH-6).
- **FR-013**: ポイント履歴 MUST show a brand-aware point history with a period filter — 月次 (a month picker) or 期間指定 (an arbitrary start–end date range), per `A-01 FR-011` (empty month: 「この月のデータはありません。」, empty range: 「この期間のデータはありません。」) — and a summary with 期間内獲得合計 / 期間内消費合計 computed for the selected month or range (the prototype sums all months, which contradicts its own label); it is read-only.
- **FR-014**: アンケート回答 MUST list the member's survey responses; トレーニング記録 MUST list training records with a period filter (empty: 「この期間にトレーニング記録がありません」) and a summary; 紹介関係 MUST show referrer (or 「紹介者なし（紹介経由の入会ではありません）」), invitees and referral stats, plus the FR-S001 「ポイントを手動返還」 entry: Manager/Headquarter/System only, requires 返還ポイント and 返還理由, and goes through a confirm dialog.
- **FR-015**: ボディーデータ MUST be consent-gated with three states: **granted** → latest summary, body composition, body measurement (left/right values for upper arm, forearm, thigh, calf), a trend chart switchable by metric (体重 / 体脂肪率 / 骨格筋量), and a measurement history (latest 5, full list in a paged sheet), with 「まだボディーデータの記録がありません」 when there are none; **pending** → Lock message 「この会員はCRMへのボディデータ連携に同意していません。」; **denied** → ShieldOff message 「会員が情報連携を拒否しています」. No body data is shown unless granted.
- **FR-016**: 変更履歴 MUST show a change log (datetime, operator, field-level before→after), including 動作確認用アカウント set/release, reservation-penalty changes and the アプリ連携 writes (FR-030).

**Status changes (ステータス変更 menu)**

- **FR-017**: The ステータス変更 menu MUST offer, by status (Headquarter/System/Manager/Staff; hidden for Trainer/Observer):
  - **有効**: 休会申請 (disabled when unpaid), 退会申請, 入会取り消し (only before the usage start date), 移籍申請 (disabled when unpaid, or when a JOYFIT member is in the cancellation-fee period — FIT365 is not blocked by the period).
  - **仮会員** (approved, usage start date still ahead): 入会取り消し only.
  - **休会中**: 休会解除, 退会申請.
  - **Gate-stopped**: ゲートストップ解除, plus 休会申請 / 退会申請 / 移籍申請 under the same conditions as 有効.
  - **退会予定**: 退会取り消し (disabled once the usage start date has passed).
  - Disabled items MUST show the reason inline (copy per User Story 3).
- **FR-018**: 退会申請 MUST block submission for a member before the usage start date, with the guidance 「利用開始日（…）前の会員です。退会申請ではなく「入会取り消し」で処理してください。」 and a 「入会取り消しへ」 action.
- **FR-019**: 入会取り消し MUST be a standalone confirm dialog, offered to an 有効 or 仮会員 member whose usage start date has not arrived (an approved member stays 仮会員 until the start date), (「入会を取り消しますか？」) showing the target member (name, member ID, usage start date) and a **required** 取消理由. On success it voids the contract, updates the linked enrollment application to 取消, records operator/datetime/reason, and shows 「入会を取り消しました」.
- **FR-020**: 休会申請 / 退会申請 / 移籍申請 MUST collect 代理申請 evidence (合意日時 + 合意方法, always required — the CRM files on the member's behalf by definition) and a confirm step, and register a pending-application state that can be cancelled. 移籍申請 MUST show the brand-specific workflow (JOYFIT: 申請 → 移籍元承認 → 自動移籍; FIT365: 申請 → 移籍元承認 → 移籍先承認 → 移籍実行).

**Management operations (会員操作 menu) & header**

- **FR-021**: The 編集 button MUST be available to ~~Headquarter/System only~~ every user whose position grants `can_edit_member` (P5) and MUST be hidden for a withdrawn member.
- **FR-022**: The 会員操作 menu MUST show a 「管理操作」 group: ゲートストップ設定 (Headquarter/System/Manager, and Staff for their own store; hidden while a gate stop is active) and ブラックリスト登録 (Headquarter/System). 強制退会 MUST NOT be offered: it is the `A-01 FR-016` batch only (qa-223).
- **FR-023**: For a withdrawn member the header MUST offer only 個人情報削除 (Headquarter/System), which requires a reason (max 500 characters) and a typed confirmation, and MUST be blocked for blacklisted or unpaid members.
- **FR-024**: The 動作確認用アカウント toggle MUST be switchable by System/Headquarter only, MUST pass a confirm dialog (「動作確認用アカウントに設定しますか？」 / 「…を解除しますか？」), and MUST show the setter/set datetime and releaser/release datetime. Other roles see it read-only (Trainer cannot open the screen).

**App link (アプリ連携 — A-01 FR-027)**

- **FR-026**: The 4th summary-strip item アプリ連携 MUST show the state from the detail's `linking` as one button that opens the sheet: 未連携 (tooltip 「押すと紐付けできます」 for roles that can link — none for Observer), 連携済み (tooltip: link datetime and route), 一時ロック中 (tooltip: auto-release time, plus 「押すと紐付けできます」 for roles that can link), 永続ロック中 (tooltip 「窓口で本人確認のうえ解除が必要です」). A withdrawn member has no state of its own: the item reads 未連携 **without** a tooltip, and the sheet explains 「退会済みのため紐付けできません」 (FR-028). Original A-01 FR-027 is silent on the withdrawn case; this follows the prototype (corrected 2026-11-13 after the Unit 11 run, U11-a).
- **FR-027**: The sheet MUST show 今の状態 — 会員番号, 氏名, 状態, then per state:
  - **連携済み**: 連携日時, 連携経路 (NFCカード読取 / 会員番号入力 / 入館用タブレットの連携用QR / 手動紐付け; 「—」 when the route is not recorded), アカウント (masked contact from `linking.account`, shown as `email／phone` — L2), and 操作者 only when the route is 手動紐付け (`linking.linkedBy.displayName`).
  - **一時ロック中**: ロックした日時 (`lock.lockedAt`), 自動で解除する時刻 (`lock.lockedUntil`), 照合失敗（連続） (`lock.consecutiveFailures`), 照合失敗（累計） (`lock.failTotal`).
  - **永続ロック中**: ロックした日時, 照合失敗（累計）, and 「自動では解除されません」.
- **FR-028**: The operations offered MUST depend on the state: 未連携 and 一時ロック中 → 手動紐付け only; 永続ロック中 → a choice of ロックを解除する / 手動で紐付ける; 連携済み → a choice of 別のアカウントに紐付け直す / 連携を解除する; 退会済み → none. Permissions (A-01 アプリ連携（FR-027）の権限): 閲覧 = all but Trainer; 手動紐付け / 紐付け直し / ロック解除 = System, Headquarter, Manager, Staff; 連携解除 = System, Headquarter, Manager. Observer sees the operations disabled (FR-025).
- **FR-029**: 手動紐付け and 紐付け直し MUST search the account by **exact** email or phone (never a list, never partial — `GET …/app-link/candidates`), show the hit's masked contact and アカウント作成日 (hidden when unknown), refuse up front an account linked to another member (「別の会員と連携済みのアカウントは紐付けできません」) or the account the member already holds (「このアカウントはすでにこの会員と連携しています」), and show 「該当するアカウントが見つかりません。入力内容を確認してください」 when nothing matches. Every write except 連携解除 requires the identity check (「本人確認書類で、来店者が会員本人であることを確認しました」) next to the member's 氏名 / カナ / 生年月日. 手動紐付け, 紐付け直し and 連携解除 pass a confirm dialog (「このアカウントと紐付けますか？」 / 「このアカウントに紐付け直しますか？」 / 「アプリ連携を解除しますか？」); ロック解除 runs from the sheet. 紐付け直し sends `replace: true` (one transaction, no prior 連携解除).
- **FR-030**: Each write MUST be recorded in 変更履歴 with operator and datetime — 「アプリと連携しました」 (`app_linked`), 「アプリ連携を解除しました」 (`app_unlinked`; a 紐付け直し writes both), 「アプリ連携のロックを解除しました」 (`linking_unlocked`) — and the success toast offers 「履歴を見る」.

**Permissions**

- **FR-025**: The screen MUST follow the A-01 permission matrix. It MUST show only members in the viewer's scope (Headquarter/System: all stores; Manager: managed stores; Staff: own store; Observer: own store, read-only). Trainer has no access. Actions outside a role's rights are hidden or disabled with a reason. Each gate follows the permission flags of the viewer's position returned by `GET /auth/crm/me` — the role matrix above is the default those flags implement, and a flag set to `true` grants the action (P5). A member outside the viewer's scope MUST be refused by the server with **403** and a permission message, and the screen MUST show the message the server returns (P3, P4).

### Key Entities

- **Member detail bundle**: identity (ID, old number, name, kana, avatar), member type, status and its dates (suspension end, scheduled withdrawal), brand, personal info, 主契約店舗 / 入会店舗, 登録日, usage start date, current main contract (with active fee adjustment / suspension / pending withdrawal), gate-stop detail, blacklist (date), reservation penalty, referral, family group, notification settings (10 topics), test-account flag with its setter/releaser, visit and unpaid summary, body-data consent status, constraint flags (unpaid, cancellation-fee period, option restriction), and the app link (`linking`: state, link datetime, route, masked account contact, manual-link operator, and the lock with its type, times and failure counts).
- **Sub-resources**: contracts, fee adjustments, options, campaigns, one-day passes, billings, payments, points (incl. manual refunds), usage (entries / lessons / option usage), training records, body data, survey responses, referrals, change history, suspension history — each loaded per tab. Family members and notification settings are part of the member detail bundle, not sub-resources (backend design answer 2026-08-10).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can identify a member's current state (status, unpaid, pending applications, gate-stop/blacklist/penalty) within 5 seconds of the screen loading.
- **SC-002**: Switching tabs and changing history filters reflects results within 1 second without skeleton flashing.
- **SC-003**: Role- and status-restricted actions are visible/enabled only to eligible roles and states in 100% of cases, and every disabled status-change item states its reason.
- **SC-004**: Body data is never shown for a member who has not granted CRM consent.
- **SC-005**: 100% of 入会取り消し, 動作確認用アカウント set/release, manual point refunds and アプリ連携 writes (手動紐付け, 紐付け直し, ロック解除, 連携解除) leave an audit record (operator, datetime, reason where required) visible in 変更履歴.

## Assumptions

- `member.status` reuses the project's member-status enum (provisional / active / pending_suspended / suspended / pending_withdrawal / withdrawal_pending_processing / withdrawn / forced_withdrawal). Gate stop is **not** one of those values, although the prototype shows it as a status. Gate stop, the blacklist and the reservation penalty are independent flags that can hold alongside any status; the prototype's "ゲートストップ" menu branch applies whenever the gate-stop flag is on.
- The prototype's hard-coded values (e.g. ¥3,300 unpaid, the 2026/05/01 fallback 最終来館) are sample data, not requirements.
- Where the app deliberately differs from the prototype on a client decision, the difference is listed in [`api-integration-output/prototype-gap-list.md`](../../api-integration-output/prototype-gap-list.md) (e.g. #2 強制退会, #5 option-cancel label, #7 chart metrics, #8 移籍 banner 取り消す, #9 fee-adjustment 代理申請, #10 代理申請 always on).
- **入会取り消し endpoint**: the operation is the `C-01 FR-M008` cancellation (`POST /admin/applications/{applicationId}/cancel`, reason required). The API also accepts a withdrawal with `reasonCode: cancellation`; which of the two is canonical is to be confirmed with the backend.
- Where the API design has no endpoint for a prototype feature (survey responses, option usage, reservation penalty release), the screen is prototype-driven until the backend provides one.
- The member edit form, black-list management, and emergency-suspension screens are separate features; this screen only links to them.
- A-01 Could items FR-023 (申し送り) and FR-024 (BL auto-matching notification) are out of scope.
