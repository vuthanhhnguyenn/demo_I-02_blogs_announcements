# Feature Specification: E-01 Locker Management

**Feature Branch**: `feat/update-locker`
**Created**: 2026-08-11
**Status**: Implemented (CRM screens; mock API)
**PO Spec**: `E-01` — ロッカー管理 _(Locker Management)_
**Source**: `locker-list.tsx` + `locker-detail.tsx` + `locker-form.tsx` + `locker-contract-detail.tsx` + `locker-contract-form.tsx` (dx-fitness/fitness-crm-ui@e99646c, 2026-08-05) + `crm/requirements/E-01.md` (dx-fitness/fitness-spec@1700eb8, 2026-08-06)
**Input**: "update màn hình locker theo prototype mới nhất, những thứ prototype không có so với code hiện tại thì cũng xóa"

## Overview

Locker management covers the inventory and lifecycle of locker units (筐体, the parent) and locker slots (個別区画, the child that members actually contract). One sidebar entry — ロッカー管理 — hosts three tabs (ロッカー一覧 / 契約一覧 / 開放待ち一覧); locker detail, locker create/edit, contract detail, and contract edit are separate screens reached from those tabs.

**Screens in scope**

| Screen                                                 | Route                                   | Prototype source             |
| ------------------------------------------------------ | --------------------------------------- | ---------------------------- |
| ロッカー管理 — ロッカー一覧                            | `/lockers`                              | `locker-list.tsx` (tab 1)    |
| ロッカー管理 — 契約一覧                                | `/lockers/contracts`                    | `locker-list.tsx` (tab 2)    |
| ロッカー管理 — 開放待ち一覧                            | `/lockers/pending`                      | `locker-list.tsx` (tab 3)    |
| ロッカー詳細（ロッカー情報 / スロット管理 / 変更履歴） | `/lockers/[id]`                         | `locker-detail.tsx`          |
| ロッカー設備 新規登録 / 編集                           | `/lockers/create`, `/lockers/[id]/edit` | `locker-form.tsx`            |
| ロッカー契約 詳細（契約情報 / 変更履歴）               | `/lockers/contracts/[id]`               | `locker-contract-detail.tsx` |
| ロッカー契約 編集                                      | `/lockers/contracts/[id]/edit`          | `locker-contract-form.tsx`   |

**Explicitly out of scope**: FR-010 (member-facing slot availability in the mobile app) and the notification delivery mechanics of FR-011 (owned by I-03 通知管理) — sending is I-03's automatic batch (Clarifications 2026-10-16). Slot assignment from the CRM is in scope (FR-005 / FR-012).

## Clarifications

### Session 2026-10-16

Real-API integration (`integration-plan.md`), answers from the user against `crm/requirements/E-01.md` and API-100 / API-101.

- Q: Is the CRM locker contract "edit-only" (FR-012)? → A: **No.** E-01 FR-005 covers assigning from the CRM (line 154: the CRM side assigns from the admin screen); the permission matrix gives スロット契約・割当 ○ to HQ, manager and staff; `POST /admin/locker-slots/{slotId}/contract` is live. FR-012 corrected; assignment entry point is the cabinet detail (slot grid / slot sheet).
- Q: Can the contract edit form move the slot or change the start date? → A: Not yet — API-101 §14 `TBD-E01-SLOT-MOVE` (owner 花島さん). The fields are removed from the edit form until it is answered _(closed as not adopted, see Session 2026-10-20)_; release → assign is not a substitute (422 E-LOC-015 inside the fee period).
- Q: Does the CRM send the forgotten-property reminder (FR-011)? → A: No manual send. E-01 FR-011 hands sending to I-03 as an automatic batch (line 370), including the failed-send alert. The 通知を送信 button and CRM send history are out (Round 3 R306).
- Q: Contract status labels? → A: `optionStatus` active → 利用中, pending_cancel → 解約予定, cancelled → 終了, pending_start → 開始前 (API-101). Distinct from slot status (使用中 / 開放待ち / 利用可). 解約 is offered only for active / pending_start (API-101 §6.2 #2).

### Session 2026-10-20

Otaki's answers to the four E-01 BE questions (API-100 v0.15 / API-101 v0.10.2 / API-086 v0.4).

- Q: Can HQ list cabinets across all stores? → A: **Yes.** API-100 §4.1: `storeId` is optional for HQ / system (omitted = all stores) and still required for manager / staff / observer. `totalAllItems` follows CONV-001 §3.4.1 (HQ: all stores) once BE MR !810 merges.
- Q: How is a cabinet named in the all-stores list? → A: `storeCode` + `locationCode`, from the row's own `storeCode` / `storeName` (API-100 v0.15, BE !804; not null after !810). `id` stays the row key.
- Q: Where does the contract detail's セット割 come from? → A: Nowhere yet — no per-member set-discount record exists. The per-contract display is added with API-086 §13 `TBD-SET-BILLING-APPLICATION`. The row stays, on hold, showing 「—」.
- Q: Slot move, contract period edit, field-level contract history, cabinet-list CSV? → A: **Closed, not adopted** (API-101 §14 `TBD-E01-SLOT-MOVE`, API-100 §13 `TBD-E01-LOCKER-CABINET-CSV`). Removed from the CRM: the slot move and start / end date fields of the contract edit form, the field-level rows of the contract 変更履歴 (slot status history stays — API-101 #8 / #12), and 「ロッカー一覧をCSV出力」. The pending-release and contract-list CSVs stay.

### Session 2026-10-28

E-01 FR-013 260901_v4 (QA Bug No.3 「スロット毎に契約を設定できてない」; Otaki ruling 2026-10-28 — API-100 v0.16 / API-101 v0.15 / API-136 v0.4, BE !899).

- Q: Can a 契約種類 be set on any slot, or only on the bottom row? → A: **Any slot.** `PUT /admin/locker-slots/{slotId}/fee-option` (API-101 §6.5) accepts every slot; `isBottomRow` only picks the cabinet default, never whether an override is allowed. US6, FR-010 and SC-003 rewritten.
- Q: How many cabinet-level codes does the form register? → A: **One — 契約形態コード (`optionId`),** the initial value for every slot (FR-001). `bottomOptionId` stays in the API for migrated cabinets but is not shown or sent by the CRM.
- Q: What does a slot without an override show? → A: The cabinet default: `isBottomRow ? (bottomOptionId ?? optionId) : optionId` — so a new cabinet's bottom row shows 契約形態コード, not 未割当. Effective fee = `feeOptionId ?? default`.
- Q: Does editing 契約形態コード reach the bottom row of a migrated cabinet (`bottomOptionId` set, MIG-002 sets both to 9001)? → A: **Yes, when the bottom default only mirrored the old code.** BE confirmed 2026-11-02: on an `optionId` change the CRM also sends `bottomOptionId: null` (API-100 §6.3 #6) when `bottomOptionId` equals the old `optionId`; a deliberately different bottom default is kept.

### Session 2026-10-21

BE answers to the E-01 test-run asks (API-100 v0.15 / API-101 v0.10.2, fitness-api `2cbb2ed`; E-01 FR `77d99f8`).

- Q: Is the shape 3段×N列 or N段×3列? → A: **列×段.** E-01 用語 defines 形状 as 「列×段（3x9 / 3x7 / 3x5 / 3x2）」: 3 columns × 9 rows. Labels are the API-100 §7.5 strings 「3 列 × 9 段」 … (the CRM must not compose its own). FR-002 corrected.
- Q: Which four numbering patterns? → A: API-100 §7.5 `orderType`: 左上→右上 / 右上→左上 / 左上→左下 / 右上→右下 (E-01 FR-003 says only 「全4パターン」; the legacy enum names them).
- Q: Is 形状 read-only on edit? → A: **No.** Shape / numbering can change while every slot is 利用可; otherwise `422 E-LOC-006` (API-100 §6.3 #3–#4). US2 #5 corrected. Cabinet default changes never propagate to existing slots (§6.3 #5).
- Q: Who may create / edit lockers? → A: By **role and store scope** only (API-100 §6.6 / API-101 §8.1) — system / headquarter / manager / staff write, observer reads. No position flag is checked, so the CRM gates lockers on `ROLE_PERMISSIONS` alone.
- Q: 南京錠 on create? → A: Selectable (API-100 §7.5) except for new FIT365 cabinets (dial only); `ic_lock` is reserved and not selectable. FR-003 corrected.
- Q: Store on the contract list under 全店舗? → A: Not on the contract row (API-101 §4.2 has `storeId` only); the CRM names it from the cabinet lookup's `storeName`.

## User Scenarios _(mandatory)_

### User Story 1 - Browse locker inventory and drill into a unit (Priority: P1)

A store staff member opens ロッカー管理 to see the locker units in scope, filters by shape, and opens a unit to review its configuration, slot layout, and utilisation.

**Why this priority**: This is the foundational reference capability. Without it no one can find a locker, and every other workflow (contract, release, PIN change) starts from here.

**Verification**: Load ロッカー一覧, confirm each unit shows locker ID / area / shape / option contract / slot count / free-vs-in-use / numbering pattern; filter by 形状 and confirm the list narrows with a filtered-results banner; click a row and confirm ロッカー詳細 opens with three tabs.

**Acceptance Scenarios**:

1. **Given** ロッカー一覧 is loaded, **When** no filter is applied, **Then** every accessible locker is listed with locker ID, area, shape badge, option contract, slot count, 空き/使用中 counts, and numbering pattern.
2. **Given** a 形状 value is selected, **When** the list refreshes, **Then** only lockers of that shape remain and a banner reports `全 X 件中 Y 件を抽出中` with a 条件をクリア action.
3. **Given** a search term or filter matches no locker, **When** the list refreshes, **Then** a filtered empty state is shown **and** the search box and filter controls remain usable so the user can clear the condition.
4. **Given** a locker row is clicked, **When** ロッカー詳細 loads, **Then** the header shows `{エリア} — {形状}` with store name and locker ID, and three tabs (ロッカー情報 / スロット管理 / 変更履歴) are available.
5. **Given** the user lacks slot-management permission, **When** ロッカー詳細 loads, **Then** the スロット管理 tab is not offered and requesting it via URL falls back to ロッカー情報.

---

### User Story 2 - Register and configure a locker unit with auto-numbered slots (Priority: P1)

A store or HQ staff member registers a newly installed locker: picks the store and location symbol, sets the shape, numbering pattern, default open/lock method and default slot size, then reviews the auto-generated slot layout before saving.

**Why this priority**: A locker cannot be contracted until it exists with its slots generated. This is the entry point of the whole lifecycle (E-01 業務フロー step ①→②).

**Verification**: Open ロッカー設備 新規登録, select a store and an unused location symbol, choose a shape, and confirm the slot preview and the per-slot lock table render the correct slot count and numbers; confirm no manual "slot number start value" input exists; save and confirm the unit appears in ロッカー一覧 with the derived numbering pattern.

**Acceptance Scenarios**:

1. **Given** the create form, **When** a shape and location symbol are selected, **Then** a slot layout preview and a per-slot lock-setting table are rendered with slot numbers derived from the shape and the selected numbering pattern, with no field to enter a starting number.
2. **Given** a location symbol already used by another locker in the same store, **When** it is selected, **Then** an inline duplicate error is shown and saving is blocked.
3. **Given** required fields (store, location symbol, shape, default open method, default lock method, default slot size W/H/D) are missing or non-numeric, **When** save is attempted, **Then** validation messages appear, the view scrolls to the first error, and no record is created.
4. **Given** the selected store's brand is FIT365, **When** the create form's lock-method options are shown, **Then** シリンダー錠 is not selectable and any already-selected cylinder value is reset to ダイヤル錠, with an explanatory note.
5. **Given** edit mode, **When** the form loads, **Then** 形状 / numbering pattern are editable only while every slot is 利用可 (otherwise locked with a notice that shape changes affect existing contracts; the API answers `422 E-LOC-006`), and slots that are 使用中 have their lock method locked. _(Corrected 2026-10-21 — was "形状 is read-only"; API-100 §6.3.)_
6. **Given** a per-slot PIN of fewer than 4 digits, **When** it is entered, **Then** the field is flagged with `4桁で入力してください` and saving is blocked.

---

### User Story 3 - Manage slot state and release cleaned slots (Priority: P1)

A store staff member opens スロット管理, reads the slot layout at a glance, and releases 開放待ち slots (individually or in bulk) after cleaning so they become contractable again.

**Why this priority**: This is the daily operational loop the screen exists for (FR-004 / FR-007) and the only way inventory returns to circulation.

**Verification**: Open スロット管理, confirm the layout colour-codes 利用可 / 使用中 / 開放待ち and marks the bottom row as 最下段; check a 開放待ち row, confirm 一括開放 enables, confirm the dialog lists the target slots, confirm the slots flip to 利用可 and their member data is cleared.

**Acceptance Scenarios**:

1. **Given** スロット管理 is open, **When** the layout renders, **Then** each slot is colour-coded by state with a legend, the bottom row carries a 最下段 marker, and slots with an individual fee (any row) carry a ¥ marker.
2. **Given** no slot is selected, **When** the user hovers 一括開放, **Then** the button is disabled and a tooltip explains that slots must be selected first.
3. **Given** one or more 開放待ち slots are selected, **When** 一括開放 is confirmed, **Then** those slots become 利用可 and their member number, member name, and cancellation date are cleared.
4. **Given** a slot is not in 開放待ち, **When** release is attempted, **Then** the operation is rejected (no release affordance is offered for other states).
5. **Given** 開放待ちのみ表示 is checked and no slot is pending, **When** the table renders, **Then** a `開放待ちのスロットはありません。` message with a 条件をクリア action is shown instead of an empty table.
6. **Given** the user lacks 清掃・開放 permission, **When** the toolbar renders, **Then** release actions are disabled with a permission tooltip.

---

### User Story 4 - Work a cross-store release worklist (Priority: P2)

An HQ or manager user opens 開放待ち一覧 to pull every pending-release slot across stores, narrows it by store / location / cancellation-date range, exports it to CSV for the cleaning round, and bulk-releases when done.

**Why this priority**: FR-008 exists so the release backlog can be worked in one place rather than locker by locker; it is a distinct, independently shippable view from US3.

**Verification**: Open 開放待ち一覧, apply a store and a cancellation-date range, confirm the list narrows and the banner reports pre-/post-filter counts, export CSV and confirm the filtered rows are written, select rows across pages and bulk-release.

**Acceptance Scenarios**:

1. **Given** 開放待ち一覧 is loaded, **When** rows render, **Then** each shows slot number, location, locker name, member name/ID, cancellation date, days-pending (colour-escalating at 14 and 30 days), slot size, and lock method.
2. **Given** 詳細フィルター is expanded, **When** a store, location, or cancellation-date From/To is set, **Then** the list narrows and the filter state is reflected in the URL so the view is shareable and survives reload.
3. **Given** the filters match no slot, **When** the list renders, **Then** `対象なし` is shown with a 条件をクリア action while the filter controls stay usable.
4. **Given** rows are selected across more than one page, **When** 一括開放 is confirmed, **Then** every selected slot is released regardless of which page it was selected on.
5. **Given** CSV出力 is triggered, **When** the file is produced, **Then** it contains the currently filtered and sorted rows with human-readable dates (not raw timestamps).

---

### User Story 5 - Maintain a slot's PIN and per-slot settings (Priority: P2)

A store staff member opens a slot's detail sheet to change the dial-lock PIN when the contract holder changes, or to adjust that slot's size / open method / lock method.

**Why this priority**: FR-009 is a Must-have with a hard operational trigger (contract holder change); members cannot self-serve, so staff must be able to do it.

**Verification**: Open a 使用中 dial-lock slot, confirm the current PIN is masked with a reveal toggle and a 最終変更日 is shown, change it to 4 digits and save, confirm the last-changed date updates; open a cylinder-lock slot and confirm no PIN section appears.

**Acceptance Scenarios**:

1. **Given** a dial-lock slot with a contract, **When** the sheet's PIN section renders, **Then** the current PIN is masked with a reveal toggle and the PIN's last-changed date is displayed.
2. **Given** a PIN of other than 4 digits is entered, **When** save is attempted, **Then** a validation message is shown and the save is blocked.
3. **Given** a 4-digit PIN is saved, **When** the sheet refreshes, **Then** the last-changed date reflects the change.
4. **Given** a cylinder-lock slot, **When** the sheet renders, **Then** no PIN section is offered at all.
5. **Given** a slot that is 使用中, **When** the lock-method 変更 action is viewed, **Then** it is disabled with a tooltip explaining the slot must be released first.

---

### User Story 6 - Assign a slot's individual 契約種類 (Priority: P3)

An HQ or store staff member assigns a contract type (defined in G-02) to any slot — typically a discount/surcharge on the bottom row — so that its occupant is billed at that rate rather than the cabinet's 契約形態コード. _(Rewritten 2026-10-28 — E-01 FR-013 260901_v4: was bottom-row only.)_

**Why this priority**: FR-013 is a Should-have; the feature is usable end-to-end on the cabinet's 契約形態コード alone.

**Verification**: In スロット管理, confirm every slot's 契約種類 cell shows a static value plus a 変更 action; assign a discount type to a non-bottom slot and to a bottom slot, and confirm the value, the ¥ marker on the layout, and the ロッカー情報 tab's individual-fee summary all update; clear one and confirm it falls back to the cabinet default.

**Acceptance Scenarios**:

1. **Given** any slot (bottom row or not), **When** its 契約種類 cell renders, **Then** the effective type — the slot's own type, else the cabinet default — is shown statically with a 変更 action, never an immediately-committing select, so browsing cannot change data by accident.
2. **Given** a slot with no type of its own, **When** the cell renders, **Then** it shows the cabinet default (`isBottomRow ? (bottomOptionId ?? optionId) : optionId`); a new cabinet's bottom row therefore shows 契約形態コード, not 未割当.
3. **Given** the assignment editor is open, **When** no type is chosen, **Then** 保存 is disabled; **when** a type is chosen and saved, **then** the cell shows the type with its monthly price; **when** the slot's type is cleared, **then** the cell returns to the cabinet default.
4. **Given** a slot has its own type assigned, **When** the layout and ロッカー情報 tab render, **Then** the slot carries a ¥ marker and the スロット個別料金 summary counts it, whatever its row.

---

### User Story 7 - Review and amend a locker contract; terminate it (Priority: P2)

A store staff member opens a locker contract to review the holder, the assigned slot and the applied fee; amends the assignment or contract dates; or terminates the contract with a cancellation date.

**Why this priority**: FR-005 / FR-006 close the lifecycle. Contracts are created outside the CRM, so review-amend-terminate is the CRM's whole contract responsibility.

**Verification**: Open a contract detail, confirm the four cards (契約基本情報 / 契約者情報 / ロッカー情報 / 暗証番号情報) and the status card; open 編集, move the slot, change the contract type, save; terminate with a date and confirm the status badge and change history update.

**Acceptance Scenarios**:

1. **Given** a contract detail page, **When** it renders, **Then** 契約基本情報 shows contract ID, store, option contract, start/end dates, and cancellation date (or `—（未解約）`), and ロッカー情報 shows locker ID, slot number, size, area, and lock method.
2. **Given** the contract's slot uses a cylinder lock, **When** the detail renders, **Then** the 暗証番号情報 card is omitted entirely.
3. **Given** the edit form, **When** it renders, **Then** the contract holder is read-only (no member re-assignment) and only slot assignment, contract dates, contract type, and PIN are editable.
4. **Given** a slot already held by another member is selected, **When** the form renders, **Then** a warning naming the occupying member is shown and saving is blocked.
5. **Given** a contract, **When** its applied fee renders, **Then** it is the slot's effective type — the slot's own type if set, else the cabinet's 契約形態コード — whatever the row. _(Rewritten 2026-10-28 — FR-013 v4.)_
6. **Given** the store's brand is not FIT365, **When** the contract-type options render, **Then** the set-discount type is not offered.
7. **Given** the member has an unpaid balance, **When** the edit form renders, **Then** an unpaid-balance alert is shown and saving is blocked; otherwise a `未納金: 0円（契約可能）` confirmation is shown.
8. **Given** a cancellation date on or after today is confirmed in the terminate dialog, **When** it saves, **Then** the contract records the date, the status badge reflects termination, and the change is written to 変更履歴.
9. **Given** a contract end date earlier than its start date, **When** save is attempted, **Then** a validation message blocks the save.

---

### User Story 8 - Send a forgotten-property reminder before cancellation (Priority: P3)

A store staff member opens a slot whose contract is terminating soon and sends the member a forgotten-property reminder, then reviews the send history.

**Why this priority**: FR-011 is a Should-have quality-of-service step; the lifecycle completes without it.

**Verification**: Open a slot that is 使用中 with a cancellation date, confirm the reminder card shows the scheduled cancellation date, a timing selector, and the delivery channels; send and confirm the status and history update; confirm a slot with no cancellation date shows no reminder card.

**Acceptance Scenarios**:

1. **Given** a slot that is 使用中 **and** has a cancellation date (i.e. before the date arrives), **When** the sheet renders, **Then** the reminder card is shown with the scheduled cancellation date, a timing selector rendering readable labels (`解約日の7日前` etc.), and the push / in-app channels.
2. **Given** a slot with no cancellation date, **When** the sheet renders, **Then** no reminder card is shown.
3. **Given** a previous send failed, **When** the card renders, **Then** a destructive alert instructs staff to follow up by phone.
4. **Given** sends exist, **When** the history table renders, **Then** each row shows the send date-and-time, channel, and delivery status.

### Edge Cases

- A search or filter combination that matches nothing → filtered empty state, with the search box, filters, and pagination all still mounted so the user is never trapped.
- A locker that still has 使用中 or 開放待ち slots → 削除 is disabled with a tooltip, and the delete dialog explains that all slots must be 利用可 first.
- A slot released while its detail sheet is open → the sheet closes and the list refreshes from the server rather than showing stale member data.
- Cancellation dates on 使用中 slots vs 開放待ち slots → both render as 解約日; 使用中 means the date has not yet passed (reminder eligible), 開放待ち means it has (release eligible).
- Bottom-row identity is derived from the generated slot positions, never hard-coded to a number range, so it stays correct for every shape and numbering pattern.
- Non-integer or negative slot dimensions → rejected by validation before submit.
- A list query failing → a toast reports the failure; the table keeps its previous rows and the toolbar stays usable (no full-region error swap).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST manage locker units with store, location symbol, guide text, staff note, photo, shape, and contract-type code, and MUST reject a location symbol already used within the same store. A unit with any 使用中 or 開放待ち slot MUST NOT be deletable.
- **FR-002**: System MUST support exactly four shapes — 3 列 × 9 段 / 3 列 × 7 段 / 3 列 × 5 段 / 3 列 × 2 段 (3 columns × N rows; labels per API-100 §7.5) — and no others. _(Corrected 2026-10-21 — was 「3段×9列」 …; E-01 用語 defines 形状 as 列×段.)_
- **FR-003**: System MUST manage per-slot attributes: slot number (auto-assigned), size (W×H×D in cm), open method (扉型 / 引き出し型), lock method (ダイヤル錠 / シリンダー錠 / 南京錠; new FIT365 cabinets ダイヤル錠 only — API-100 §7.5), and 4-digit PIN (dial only). A unit-level default size, open method, and lock method MUST be captured at registration and applied to all generated slots, with per-slot overrides available.
- **FR-004**: System MUST auto-assign slot numbers from the unit's shape and one of four numbering patterns (左上→右上 / 右上→左上 / 左上→左下 / 右上→右下 — API-100 §7.5), and MUST NOT expose any manual slot-number or start-value input.
- **FR-005**: System MUST NOT allow changing the lock method of a slot that is 使用中.
- **FR-006**: System MUST model exactly three slot states — 利用可 / 使用中 / 開放待ち — and MUST only offer the 開放待ち → 利用可 transition as a staff action; releasing MUST clear the slot's member number, member name, and cancellation date.
- **FR-007**: System MUST support releasing several slots at once, both from a locker's スロット管理 tab and from the cross-store 開放待ち一覧 tab, behind an explicit confirmation listing the target slots.
- **FR-008**: System MUST provide a cross-store 開放待ち一覧 filterable by store, location, and cancellation-date range, with CSV export of the filtered result and a `対象なし` state when nothing matches.
- **FR-009**: System MUST record and display the PIN's last-changed date, MUST validate PINs as exactly 4 digits, and MUST omit the PIN affordance entirely for cylinder-lock slots (both on the slot sheet and on contract detail).
- **FR-010**: System MUST let staff assign a contract type to any slot (`PUT /admin/locker-slots/{slotId}/fee-option`, API-101 §6.5), and MUST show each slot's effective type as `feeOptionId ?? (isBottomRow ? (bottomOptionId ?? optionId) : optionId)`. The locker form registers one 契約形態コード (`optionId`); `bottomOptionId` is neither shown nor sent. Assignment MUST use a static display plus an explicit 変更 step, not an immediately-committing control. _(Rewritten 2026-10-28 — E-01 FR-013 260901_v4: was bottom-row only.)_
- **FR-011**: System MUST offer the forgotten-property reminder only for slots that are 使用中 **and** carry a cancellation date, MUST show the send status and history, and MUST surface a follow-up-by-phone alert when a send has failed.
- **FR-012**: System MUST let staff assign a member to an empty slot from the CRM cabinet detail (E-01 FR-005; `POST /admin/locker-slots/{slotId}/contract`). On an existing contract the holder is read-only; moving the slot or changing the start / end date is not offered (API-101 §14 `TBD-E01-SLOT-MOVE`, closed as not adopted 2026-10-20). _(Corrected 2026-10-16 — was "edit-only"; see Clarifications.)_
- **FR-013**: System MUST block saving a locker contract when the member has an unpaid balance, and MUST block assigning a slot already held by another member (showing that member's name).
- **FR-014**: System MUST offer the set-discount contract type only for FIT365 stores, and MUST offer only ダイヤル錠 for new lockers at FIT365 stores.
- **FR-015**: System MUST accept a cancellation date of today or later when terminating a contract, record it, and write the status change to the contract's 変更履歴.
- **FR-016**: System MUST expose a per-locker 変更履歴 (timestamp, actor, action, detail) and a per-contract 変更履歴 (timestamp, actor, changed field, before, after).
- **FR-017**: All three list tabs MUST keep filter, sort, page, and page-size state in the URL search params so views are shareable and survive reload.
- **FR-018**: All three list tabs MUST show a filtered-results banner comparing the pre-filter total against the filtered total, and MUST provide a page-size selector (25 / 50 / 100 / 200, default 50).
- **FR-019**: Tab visibility and every mutating action (locker create/edit/delete, slot edit, PIN change, release, contract edit/terminate, CSV export) MUST be gated on the user's permissions, with disabled controls explaining why.
- **FR-020**: A failing list query MUST surface a toast while keeping the previous rows and the search/filter toolbar mounted; it MUST NOT replace the region with an error state that hides the controls.

### Key Entities _(include if feature involves data)_

- **Locker (ロッカー / 筐体)**: The parent unit — display ID, store, area label, location symbol (slot prefix), shape, numbering pattern, option contract type + contract-type code, guide text, staff note, photo, default slot size / open method / lock method, and a derived numbering-pattern label and slot summary.
- **Locker Slot (ロッカースロット)**: The contractable child — slot number, row/column position, bottom-row flag, state, lock method, open method, size, PIN and PIN-last-changed date, assigned member, cancellation date, contract type code, individual fee, and reminder history.
- **Locker Contract (ロッカー契約)**: A member's hold on one slot — contract ID, store, member (name/ID/phone/email), locker + slot, option contract, contract type code, start/end dates, termination date, PIN, status.
- **Pending-Release Slot (開放待ちスロット)**: The cross-store worklist row — slot number, location, locker name, member, cancellation date, days pending, size, lock method.
- **Reminder Notification**: One forgotten-property send — sent-at, channel (push / in-app), status (unsent / sent / failed).
- **Locker Change History Entry**: An audit row on a locker — timestamp, actor, action, detail.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can go from ロッカー管理 to a specific slot's detail in three interactions or fewer (tab → row → slot).
- **SC-002**: 100% of PIN saves with other than 4 digits, and 100% of slot-size saves with a non-positive or non-integer value, are blocked with a message before any data changes.
- **SC-003**: 100% of slots, bottom row or not, can be given and cleared of their own contract type from スロット管理, and a slot without one shows the cabinet default — never 未割当 or `—` while the cabinet has a 契約形態コード.
- **SC-004**: Releasing N selected 開放待ち slots leaves all N at 利用可 with member data cleared, in one confirmation, with no per-slot follow-up.
- **SC-005**: Typing in any list tab's search box never returns the table to a skeleton state; the previous rows stay visible under a refetch indicator.
- **SC-006**: Filtering any list tab to zero rows still leaves the search box, filters, and clear-condition action operable 100% of the time.
- **SC-007**: A shared list URL reproduces the same filtered, sorted, paginated view for another user with the same permissions.
- **SC-008**: The reminder card appears for exactly the set of slots that are 使用中 with a cancellation date — no false positives on 開放待ち or unassigned slots.

## Assumptions

- ~~**Locker contracts are edit-only in the CRM.**~~ _Superseded 2026-10-16 (see Clarifications): E-01 FR-005 has the CRM assign slots from the admin screen._ The prototype's contract form is fixed to edit mode (`ロッカー契約は編集のみ（新規登録は別システム）`), and the locker list header offers only ロッカーを登録. The contract-create page, its POST endpoint, its request/response schemas, and the `lockers-contracts.create` permission were therefore removed rather than left dormant. If contract creation is later brought into the CRM it is a new requirement, not a regression.
- **Slot numbering has no user-facing start value.** FR-003 makes numbering system-owned, so the start value is fixed at 1 internally and is not part of the create/update contract.
- **Shape is a closed set of four values.** The previously implemented `3x6 / 2x10 / 2x4` values had no basis in E-01 and were replaced by `3x7 / 3x5 / 3x2`; locker option-master codes were renamed to match.
- **Bottom row is derived from the numbering pattern, not enumerated.** Which slot numbers land on row 1 depends entirely on the unit's numbering pattern, so the bottom row is whatever the generated layout says is row 1. The physical bottom row is the highest `row_index` (API-100 §6.1 `bottomRow = rows - 1`), so for a 3 列 × 9 段 cabinet it holds 3 slots. _(Corrected 2026-10-21 — the former LK-001 「左下から右下へ」 example assumed 3段×9列 and a pattern the API does not have.)_
- **A bottom-row slot is not automatically discounted.** FR-013 assigns the discount/surcharge per slot (`選択して割り当てる`), so a bottom-row slot may legitimately stay on the standard price. _(Resolved 2026-10-28 — the former open point on `bottom_contract_type_code` is settled by FR-013 v4: a slot with no type of its own falls back to `bottomOptionId ?? optionId` on the bottom row, `optionId` elsewhere; see Clarifications.)_
- **A cancellation date can coexist with 使用中.** FR-006 keeps a slot 使用中 until the cancellation date passes, so the slot's 解約日 is sourced from its contract's termination date, and the batch transition to 開放待ち remains a backend responsibility outside this screen.
- **G-02 owns contract-type definitions.** Prices, names, and applicability text for 定価 / 割増 / 割引 come from the option master; this feature only assigns them to slots and contracts.
- **I-03 owns notification delivery.** The CRM triggers a send and displays status/history; channel configuration and actual delivery are out of scope.
- **The prototype is a UI reference, not a logic contract.** Where the prototype's own mock data contradicts its numbering helper, or where it hand-rolls a control that this project has a shared component for (pagination with page size, filtered-results banner, empty state, date picker, searchable select), the project's shared components and derived logic were used. Card title typography likewise follows the project's design system rather than the prototype's per-page overrides.
- **Filter layout follows the shared GUI rule A8**: tabs with two or fewer filters (ロッカー一覧, 契約一覧) render them inline with no 詳細フィルター collapse; 開放待ち一覧, with four, keeps the collapse.
- **Store selection uses server-side search.** Store and locker pickers use the shared searchable select with server-side querying rather than a high fixed `limit`, so candidate lists are never silently truncated.
- **Phase 1 backs these screens with the in-memory mock DB** (`src/app/api/_mock-db/tables/locker.table.ts`) behind the generated hey-api client; the Phase 2 swap to a real backend is a schema-compatible change.
