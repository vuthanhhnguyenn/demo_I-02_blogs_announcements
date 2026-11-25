# Feature Specification: E-02 Contact-Control Device (接点制御装置) Management

**Feature Branch**: `008-controller-management`  
**Created**: 2026-06-26  
**Last updated**: 2026-10-22 — default sort changed to 登録日時 (`createdAt`) descending (Session 2026-10-22)  
**Status**: Clarified — re-aligned 2026-09-09 against the latest prototype and the backend API design doc  
**PO Spec**: `E-02` — 店舗機器管理 (Store Equipment Management)  
**Source**:

- UI prototype: `dx-fitness/fitness-crm-ui@46253e3` → `src/components/controller-list-panel.tsx`, `src/pages/controller-form.tsx`, `src/pages/controller-detail.tsx`, `src/pages/equipment-list.tsx` (controllers tab) — contact-control device side only; the file's connected-equipment tab belongs to `029-equipment-list`
- Requirement: `.cache/fitness-crm-ui/public/requirements/E-02.md`
- Backend API design: `.cache/api/openapi.json` — `Admin - Relay Controller (API-104)`

**Input**: User description: "Create spec for screen E-02 店舗機器管理 — Phase 1 scope: FR-007 (Contact-Control Device management). The controller tab becomes its own route (not nested inside the equipment screen). History is seed-only (no create/update/delete of history)." Re-aligned 2026-09-08: "update the controller screens to the latest prototype, delete whatever the prototype no longer has, and move the mock API to the API design doc — prototype wins on any mismatch."

---

## Clarifications

### Session 2026-06-26

- Q: Should the view-only tier (Observer) be allowed to open the controller list/detail? → A: **Yes** — Observer may **view** the list and detail; configuration actions (register/edit/delete/status-change) remain denied.
- Q: Which fields must be submit-blocking on the controller form? → A: **Enforce all visually-required fields** — 装置名, 店舗コード, 設置場所, IPアドレス, 制御ポート数, ポート番号, 状態. (ファームウェアバージョン is optional.) ポート番号 is confirmed as an official, required Phase 1 field. _(Superseded 2026-09-08 — ポート番号 is no longer a form field; see below.)_
- Q: Given history is seed-only, what does the status-change dialog's "変更を保存" persist? → A: **Update the controller's current 状態 only** — do **not** write a history entry. The ステータス変更 dialog remains in Phase 1. _(Superseded 2026-09-08 — see below.)_

### Session 2026-09-08 (prototype re-check & mock ⇄ design-doc alignment)

Re-checked the shipped screens against the latest prototype (`dx-fitness/fitness-crm-ui@1bad949`) and against the API-104 design doc in `.cache/api/openapi.json`. Anything the prototype no longer has was removed; where prototype and design doc disagree, the prototype wins.

- Q: `ポート番号` (通信ポート) was a required form field and a detail item, but the prototype now omits it with an explicit note (`controller-form.tsx`: 「通信ポート番号は要件に無いため置かない」) — keep or drop? → A: **Drop it from every controller screen** (list, detail, form) and from the create/update payload. It survives as a seed-only mock field solely because the connected-equipment detail renders 接点制御装置 `IP:ポート` (`006-equipment-detail`); new controllers get the administrative default 80. This supersedes Q2/N1 of 2026-06-26.
- Q: `ゲート種別` was a column of the 紐付き機器一覧 tab; the prototype's table now has four columns — keep it? → A: **Remove the column** (and the mock's `gate_type` field). The tab is 機器ID · 機器名 · 接点番号 · ステータス, as the prototype renders it. This supersedes N5.
- Q: The status-change dialog collected 変更種別 and メモ that were then discarded (Q3 said "no history row") while the prototype visibly appends one — which stands? → A: **Write the history row.** 変更種別 becomes the row's 種別 and メモ its note, so a status change is traceable in the 変更履歴 tab. Field edits from the form still write no history row. This supersedes Q3. _(Partly superseded 2026-09-09 — the row is still written, but 変更種別 is gone and メモ is now 変更理由; see below.)_
- Q: The controller list showed a filter-result banner ("N件を抽出中") and its detail header used the 装置名 as the page title — prototype parity? → A: **Neither.** The prototype's controller panel has no banner (only the connected-equipment panel does), and its detail header is a fixed title 接点制御装置詳細 with the subtitle 「{店舗名} — {IPアドレス}」.
- Q: The panel had a 店舗 filter of its own and always showed the 店舗コード column — prototype parity? → A: **The header store selector is the only store scope.** There is no in-panel 店舗 filter, and the 店舗コード column is hidden while a single store is selected (prototype `showStoreColumn`). CSV export follows the same scope.
- Q: The 紐付き機器一覧 tab trigger carried a count badge and the 紐付き機器サマリー link switched to that tab — prototype parity? → A: **No badge on the trigger**, and 「機器一覧を見る」 leaves for the 接続機器一覧 screen, as the prototype navigates.
- Q: The status dialog's 廃棄 selection showed an extra warning block and relabelled the submit button — keep? → A: **Remove both**; the prototype has one 変更を保存 button and no warning. 変更種別 has no default and is submit-blocking alongside 新しいステータス. The current status stays out of the 新しいステータス options so the change is never a no-op. _(Superseded 2026-09-09 for the 変更種別 half — the field no longer exists; 新しいステータス alone blocks submit.)_
- Q: The mock spoke snake_case with its own field names, while API-104 is camelCase (`connectedDeviceCount`, `firmwareVersion`, …) — rename? → A: **Adopt the design doc's field names**, matching what `029-equipment-list` did for API-103, and reshape the list/devices responses to `{ items, pagination }`.
- Q: API-104 models the controller status as `active | inactive | maintenance` (three values); the prototype filters and renders 正常 / 異常 / メンテナンス中 / 廃棄 — which enum? → A: **Keep the prototype's four values**; the divergence is raised with BE rather than silently re-mapped (gap C1).
- Q: The controller CSV export was a `POST` returning a file stream — align it? → A: **Yes** — a `GET` returning `{ filename, rowCount, csv }`, the same envelope the connected-equipment export adopted from API-103 (API-104 declares no export endpoint of its own).
- Q: The controller's store lived in a code space of its own (`store_code: 'S-001'`, bridged to a different store id inside the equipment seed) — fix? → A: **Yes.** A controller now carries the design doc's `storeId` plus the mock-only `storeCode` / `storeName` labels the screens display, all consistent with the store table, and the bridge in the equipment seed is gone.

### Session 2026-09-09 (prototype re-check — status dialog & history alignment)

Re-checked against `dx-fitness/fitness-crm-ui@46253e3`, which reworked `controller-detail.tsx` so the
status dialog and the 変更履歴 tab match the ones on 接続機器詳細 (`equipment-detail.tsx`).

- Q: The ステータス変更 dialog collected 変更種別 (ステータス変更 / 故障報告 / 点検完了) and the 変更履歴 tab showed it as a 種別 column; the prototype has now removed both, folding the wording into the note instead (「点検完了。動作確認・清掃実施。異常なし。」) — keep or drop? → A: **Drop 変更種別 entirely.** The dialog is 対象装置情報 / 新しいステータス / 変更理由(任意) and 変更を保存 is blocked by 新しいステータス alone; the tab is 日時 · 操作者 · ステータス変化 · 変更理由. The creation row is identified by a null `previousStatus`, exactly as the connected-device status history does, so no history row carries a kind. This supersedes Q3 of 2026-06-26 and the 2026-09-08 answer that made 変更種別 the row's 種別.
- Q: The dialog's optional free-text field was labelled メモ — rename? → A: **変更理由**, the label the prototype and 接続機器詳細 both use. The payload field stays `changedNote`.
- Q: Rows of the 紐付き機器一覧 tab were static; the prototype now makes them clickable and marks an 異常 row with a left accent bar — adopt? → A: **Yes** — a row opens 接続機器詳細, and the 異常 row uses the same `bg-destructive/10` + inset accent the controller list already uses.
- Q: 状態 on 新規登録 had `正常` preselected while the prototype opens the select on its 状態を選択 placeholder — which? → A: **No default**; 状態 is submit-blocking, so the user always chooses it deliberately.
- Q: The 削除 button was disabled with a generic tooltip; the prototype names the blocking count — adopt? → A: **Yes** — 「接続機器が{N}台あるため削除できません。先に紐付き機器一覧の機器を削除または別装置へ移してください」.

---

### Session 2026-10-12 — PO decisions on real-API gaps (E-02 integration)

Raised by the real-API integration (`../integration-plan.md` §9) against `fitness-spec@c7ea80c` (E-02 `260731_v2`), `fitness-crm-ui@47423ec` and the API-103 / API-104 contract in `src/lib/openapi.real.json`. Answered by the user (PO-side) on 2026-10-12.

- Q: API-104 models 状態 as `active | inactive | maintenance`; the prototype uses the device's four values 正常 / 異常 / メンテナンス中 / 廃棄; FR-007 lists 状態 without values — which set? → A: **The prototype's four values** (reaffirms the 2026-09-08 answer, gap C1). **BE dependency**: API-104's status enum becomes four values matching 正常 / 異常 / メンテナンス中 / 廃棄, with a migration for existing `active` / `inactive` rows decided by BE. Until then Round 1 keeps the BE's three values with the provisional labels 稼働中 / 停止中 / メンテナンス中 (integration B3, Round 2).
- Q: 装置ID is a UUID with no display code — what is shown? → A: **The short UUID** (last 8 characters, full value in a tooltip). The ID format is the BE's call; FE follows it.
- Q: CSV出力 on this tab has no API — keep it? → A: **Yes, keep it.** **BE dependency**: API-104 adds `GET /relay-controllers/export` (same scope rules as the list). The button stays disabled with 「接点制御装置のCSV出力はAPI未対応です」 until then; CSV is never built client-side (integration B8, Round 2).

### Session 2026-10-16 — BE answers for Round 2b (E-02 integration)

Source: `fitness-backend-v2/FE-feedback/equipment/BE-REQUESTS.vi.md` (BE confirmation 2026-10-16), BE running locally on branch `dulv/equipment-api-fix-gaps`. Spec `fitness-spec@5c391cf` unchanged.

- Q: Which enum carries the four controller states? → A: **The connected device's own enum** `normal / abnormal / under_maintenance / discarded` (BE No.13, migration 017: `active→normal`, `inactive→abnormal`, `maintenance→under_maintenance`). Labels 正常 / 異常 / メンテナンス中 / 廃棄 are shared with the device screens. Only `normal` controllers unlock gates / devices.
- Q: Can a controller go to 廃棄 while devices are still attached? → A: **No** — 409 `E-DEV-011`, the same rule as delete. The status dialog offers 廃棄 disabled with 「（紐付き機器あり）」 while `connectedDeviceCount > 0`. A device cannot be attached to a 廃棄 controller (422 `E-DEV-008`), so the device form's picker hides them.
- Q: The prototype's controller 変更履歴 tab and 変更理由 field (R301) — build them now that the BE serves `GET /relay-controllers/{id}/status-history` and PATCH takes `changedNote`? → A: **Yes** (user, 2026-10-16), although E-02 FR-007 still defines the history tab for connected devices only. Same columns as the device tab; 変更理由 = the free-text `changedNote`. **Spec gap**: FR-007 should name the controller history — raise with the PO.
- Q: ファームウェアバージョン rule? → A: **API rule only**: optional, `^[0-9A-Za-z._-]{1,64}$`, max 64 (BE No.9). 「vN.N.N 形式」 stays as helper text and is no longer enforced (supersedes BUG-E02-F-04).
- Q: 制御ポート数 lower bound on edit? → A: ~~Not below the live device count~~ (dropped 2026-11-09 — devices may share a port) **Not below the highest 出力ポート in use** (BE No.2, 422 `E-DEV-012`).

### Session 2026-10-22 — default sort order

Decided by the user on 2026-10-22. Supersedes the controller default in integration **D9** (`name` asc).

- Q: Which order does the controller list open in? → A: **登録日時 (`createdAt`) descending — newest first**, the same as the connected-device list. API-104 §4.1 already lists `createdAt` as a sort key. The key has no column, so no header shows a sort indicator; clicking a header sorts by that column, and clearing it (third click) returns to `createdAt desc`. CSV出力 without a sort param follows the same order.

### Session 2026-11-09 — 接点制御装置ID is entered (API-104 `relayId`)

Source: Notion 接点制御装置 仮仕様 (2026-11-08) as implemented by `fitness-backend-v2` `28b9f0cb`; the prototype (`fitness-crm-ui@4508cf7`) still shows 「（自動採番）」 and E-02 v5 is silent — PO spec update pending.

- Q: Is 接点制御装置ID still system-assigned? → A: **No.** It is the AWS IoT thing name the unlock command is published to (`fitness/interface-converter/<ID>/command`), so it is **typed in on 新規登録** (required, 半角英数字 / `_` / `-`, 1–128, placeholder 「例: yashio-rc*01」, helper 「変換器に設定した装置IDと同じ値を入力してください（登録後は変更できません）」) and **read-only on 編集** (not accepted on PATCH). Errors: format → 「半角英数字と「*」「-」のみ入力できます（例: yashio-rc_01）」; empty → 「接点制御装置IDを入力してください」; duplicate among live controllers → 409 `E-DEV-018` → inline 「この接点制御装置IDはすでに登録されています」. Existing controllers were backfilled with their UUID.
- Q: Where else is the ID shown? → A: Everywhere the controller's 装置ID appears — list column 装置ID (truncated, full value on hover), detail 接点制御装置ID (full, wrapped), the ステータス変更 dialog 装置ID, and the 接続機器 detail's 接点制御装置 card — it is the `relayId`, no longer the 8-char short UUID (supersedes Session 2026-10-12 Q5 for controllers; 接続機器ID stays the short UUID).

### Session 2026-11-09 — shared 出力ポート

- Q: Can several devices use the same relay output port — e.g. an 入館ゲート and a 退館ゲート wired to one physical gate? → A: **Yes** (user request, 2026-11-09). API-103 no longer refuses a port another live device on the controller already uses (`E-DEV-009` is no longer raised), and every device on that port is unlocked together.
  - **Controller edit:** the 制御ポート数 lower bound is now only the highest 出力ポート in use (422 `E-DEV-012`); the live device count is no longer a bound, since a controller can carry more devices than ports (e.g. 5 devices on a 4-port controller). The form's `E-DEV-012` message reads 「設定内容が不正です（制御ポート数が使用中の出力ポート番号を下回っていないか確認してください）」.
  - **Test cases:** E-02-F TC-117 added (TC-076 / TC-077 unchanged).

## Scope

### In Scope (Phase 1) — FR-007 only

| ID         | Requirement                                | Screen Coverage                                                                                       |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **FR-007** | Contact-control device settings management | Controller **list** (own route), controller **form** (create/edit), controller **detail** (read-only) |

FR-007 §処理内容 decomposed into the prototype screens:

| FR-007 sub-capability                                                                              | Screen / Component                                         |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Register / edit device settings (装置名・店舗コード・設置場所・IPアドレス・FW・制御ポート数・状態) | `controller-form` (create / edit)                          |
| Device list display + search                                                                       | `controller-list` (own route; was `ControllerListPanel`)   |
| Reference the devices connected to a controller                                                    | `controller-detail` → 紐付き機器一覧 tab                   |
| Deletion blocked when connected devices exist (異常系)                                             | `controller-detail` → delete button disabled + AlertDialog |

### Routing decision (per user direction)

- In the prototype, the contact-control device list is rendered as the second tab (`接点制御装置一覧`) **inside** the `equipment-list` screen (`Tabs` in `equipment-list.tsx`).
- **Phase 1 decision**: the contact-control device list is given **its own dedicated route** (a standalone controller list screen) rather than being nested as a tab within the connected-equipment screen. The connected-equipment list (FR-001/FR-002) remains a separate screen, out of this spec's scope.
- All controller-related navigation (`controller-form`, `controller-detail`, back links) targets the dedicated controller list route. The prototype's `navigate("equipment-list", "controllers")` back-target is reinterpreted as "return to the controller list route".
- **As implemented (2026-09-08)**: that dedicated route is `/controllers`, and it renders inside the shared 店舗機器管理 layout — the same page header, 新規登録 menu, `CSV出力` button and two-tab bar that `/equipment` uses, with 接点制御装置一覧 as the active tab. The seam with `029-equipment-list` is the one that spec's §Separation table records: this spec owns the 接点制御装置一覧 trigger and its badge, the 接点制御装置を登録 menu item, the panel itself, and the controller data; neither spec owns the tab container.

### Out of Scope for Phase 1

| ID / Feature                                    | Reason                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 / FR-002                                 | Connected-equipment list & search — separate screen, not a contact-control device                                                                   |
| FR-003 / FR-005                                 | Connected-equipment create/edit — covered by `007-equipment-form`                                                                                   |
| FR-004 / FR-006                                 | Connected-equipment detail / delete — covered by `006-equipment-detail`                                                                             |
| FR-008 / FR-009                                 | Usage-control rule & authentication method — connected-equipment concerns, covered by `007-equipment-form`                                          |
| FR-010                                          | Bulk status update — defined for **connected equipment** only; explicitly NOT applied to contact-control devices (E-02 §要件の設計判断, 2026-04-22) |
| FR-011                                          | Equipment ledger CSV export                                                                                                                         |
| FR-012 / FR-013                                 | Status-change history record & usage-log reference (Could-tier)                                                                                     |
| Change-history write operations                 | The 変更履歴 tab is **seed/display-only** in Phase 1; creating, updating, or deleting history entries is out of scope (per user direction)          |
| Real-time device health monitoring              | E-02 §制限事項 — health monitoring is the contact-control device's own function; CRM only shows manually-updated status                             |
| Member authentication / start-up signal runtime | E-02 §制限事項 — judgment execution and signal sending are system-side, not configured on these screens                                             |

**Phase markers in code**: The four source files contain no explicit Phase 2 / future-scope placeholders, no disabled-for-future controls (the only disabled control is the read-only auto-numbered ID field and the delete button gated by connected-device existence), and no commented-out features. `HAS_CONNECTED_DEVICES` is a mock flag standing in for an API value.

---

## Feature Overview

| Item              | Detail                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Screen group name | 接点制御装置管理 (Contact-Control Device Management)                                                                                                         |
| Screens / slugs   | `controller-list` (list, own route) · `controller-form` (create/edit) · `controller-detail` (detail, read-only)                                              |
| Brands            | JOYFIT / FIT365 (common) — E-02 §ブランド適応範囲                                                                                                            |
| Purpose           | Staff and HQ users register, view, search, edit, and delete the contact-control units installed at a store, and inspect which devices are wired to each unit |
| Business role     | The contact-control device is the core unit that receives member authentication results and judges device start-up (E-02 §機能の定義 — 接点制御装置)         |

**Source**: E-02 §概要 / §機能の定義 / FR-007; basic-flow steps ① (physical install) and ② (FR-007 setting registration).

---

## Actors & Access Control

**Source**: E-02 §権限マトリクス (接点制御装置設定 column) + role-gated controls in the prototype.

| Role            | View list / detail | Register / Edit / Delete (接点制御装置設定) | Data Scope          |
| --------------- | ------------------ | ------------------------------------------- | ------------------- |
| **System**      | ○                  | ○                                           | All stores          |
| **Headquarter** | ○                  | ○                                           | All stores          |
| **Manager**     | ○ (jurisdiction)   | ○ (jurisdiction stores)                     | Jurisdiction stores |
| **Staff**       | ○ (own store)      | ○ (own store)                               | Own store           |
| **Observer**    | ○ (view only)      | ×                                           | Own store (view)    |
| **Trainer**     | ×                  | ×                                           | No access           |

- The prototype role-gates the create entry point, the 編集 button, and the 削除 button to `["Headquarter", "System", "Manager", "Staff"]` via `RoleGatedMenuItem` / `RoleGatedButton`. Observer/Trainer are denied these configuration actions.
- **View access (resolved Q1)**: Observer **may view** the controller list and detail (read-only), mirroring their general read tier; configuration actions remain denied. Trainer has no access. The view column above reflects this resolution.

---

## Component Hierarchy & Layout

### Screen A — Controller List (`controller-list`, own route)

**Source**: `controller-list-panel.tsx` (panel body) + `equipment-list.tsx` (page header, count badge, create entry point).

```
ControllerList (own route: /controllers, inside the 店舗機器管理 layout)
├── PageHeader  (shared with /equipment)
│   ├── title: 店舗機器管理  + count badge
│   └── actions: CSV出力  ·  新規登録 ▾ → 接点制御装置を登録 (RoleGated: HQ/System/Manager/Staff)
├── TabsList (line)  接続機器一覧 [n]  |  接点制御装置一覧 [n]   ← active
└── Card (controller panel)
    ├── Toolbar
    │   ├── Search input  [placeholder: 装置名、IPアドレスで検索]
    │   └── 詳細フィルター toggle  (active-filter count badge)
    │       └── (expanded) ステータス Select [全ステータス/正常/異常/メンテナンス中/廃棄] + すべてクリア
    ├── Table (9 columns, sortable headers)
    │   └── columns: 装置ID · 装置名 · 店舗コード* · 設置場所 · IPアドレス · FW · 制御ポート数 · 紐付き機器数 · ステータス
    │       │   * 店舗コード is rendered only while the header scope is 全店舗
    │       └── row click → controller detail; 異常 rows highlighted (left red bar)
    └── Pagination footer  (page size + page numbers; hidden on a single page)
```

> In the prototype the create entry point lives in the `equipment-list` page header (a `新規登録` dropdown whose `接点制御装置を登録` item is `RoleGatedMenuItem` for `["Headquarter","System","Manager","Staff"]`); the shipped screen keeps it there, in the shared layout, with the same role gate. The `CSV出力` button belongs to `029-equipment-list` (FR-011) and exports whichever tab is on screen — on this tab it exports the controller list under `Permission.ControllerExport`.
> The panel has **no** filter-result banner and **no** in-panel 店舗 filter: both belong to the connected-equipment panel only.

### Screen B — Controller Form (`controller-form`, create / edit)

**Source**: `controller-form.tsx`

```
ControllerForm (mode: create | edit)
├── SharedSidebar (currentPage="controller-form")
└── SidebarInset
    ├── SharedHeader
    ├── PageHeader (outside)
    │   ├── BackLink [店舗機器管理に戻る] → controller list route
    │   └── title: 接点制御装置 新規登録 (create) | 接点制御装置 編集 (edit)
    └── main → container (max-w-960px, centered, space-y-6)
        ├── Card: 基本情報 (3-col grid)
        │   ├── 接点制御装置ID *       (Input; create: typed relayId / edit: disabled)  (Session 2026-11-09)
        │   ├── 装置名 *               (Input)
        │   ├── 店舗コード *           (StoreCombobox, valueType="code")
        │   ├── 設置場所 *             (Input)
        │   ├── [Alert/Info] connection-info help note
        │   ├── IPアドレス *           (Input, pattern ^\d{1,3}(\.\d{1,3}){3}$) + helper text
        │   ├── ファームウェアバージョン (Input, no required mark) + helper text
        │   └── 制御ポート数 *         (Input number, min 1 / max 64) + helper text
        ├── Card: ステータス
        │   └── 状態 *                 (Select [正常/異常/メンテナンス中/廃棄]; edit default 正常)
        └── Footer actions (border-t)
            ├── キャンセル → controller list route
            └── 登録 (create) | 更新 (edit) → success toast → controller list route
```

- Content container max width: 960 px, centered. Minimum supported width: 768 px (project standard).
- Required fields use `RequiredMark`; `ファームウェアバージョン` uses neither mark (treated as optional in the prototype).

### Screen C — Controller Detail (`controller-detail`, read-only + actions)

**Source**: `controller-detail.tsx`

```
ControllerDetail (activeTab: basic | devices | history)
├── SharedSidebar (currentPage="controller-detail")
└── SidebarInset
    ├── SharedHeader
    ├── PageHeader (outside)
    │   ├── BackLink [店舗機器管理に戻る] → controller list route
    │   ├── title: 接点制御装置詳細   subtitle: "{店舗名} — {IPアドレス}"   badge: status
    │   └── actions
    │       ├── 削除  (RoleGated HQ/Sys/Mgr/Staff; disabled when HAS_CONNECTED_DEVICES) → AlertDialog
    │       └── 編集  (RoleGated HQ/Sys/Mgr/Staff) → navigate("controller-form", "edit")
    ├── main → Tabs (line)
    │   ├── Tab 基本情報
    │   │   ├── Left 60%: 接点制御装置情報 card (read-only):
    │   │   │     接点制御装置ID · 装置名 · 店舗コード · 設置場所 · IPアドレス · FW · 制御ポート数
    │   │   └── Right 40% (sticky):
    │   │         ├── StatusCard (icon Cpu, label=status, action: ステータス変更 → Dialog)
    │   │         ├── 紐付き機器サマリー card (紐付き機器数 / 正常 / 異常 + link 機器一覧を見る)
    │   │         └── その他情報 card (作成日時 / 更新日時)
    │   ├── Tab 紐付き機器一覧 (DevicesTab)
    │   │   └── Table: 機器ID · 機器名 · 接点番号 · ステータス  + summary footer (合計/正常/異常)
    │   └── Tab 変更履歴 (HistoryTab — seed/display-only)
    │       └── Table: 日時 · 操作者 · ステータス変化 · 変更理由 + summary footer (直近1年の対応 / 平均対応間隔)
    ├── Dialog: ステータス変更 (StatusChangeDialog)
    └── AlertDialog: 削除確認
```

---

## UI Element Traceability

### Screen A — Controller List

| Element                   | Behavior                                                                                                       | Source Requirement                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Tab trigger + count badge | "接点制御装置一覧" with the controller count for the header store scope                                        | FR-007 — 一覧表示                                                                        |
| Search input              | Free-text search; placeholder "装置名、IPアドレスで検索" (matches device name / IP address)                    | FR-007 — 検索機能                                                                        |
| 詳細フィルター toggle     | Expands the filter row; shows an active-filter count badge when filters differ from default                    | FR-007 — 検索機能                                                                        |
| ステータス filter         | Select: 全ステータス / 正常 / 異常 / メンテナンス中 / 廃棄                                                     | FR-007 + E-02 §機器状態 (4 states)                                                       |
| すべてクリア              | Resets the status filter to 全ステータス                                                                       | Standard UX                                                                              |
| Table column 装置ID       | Controller identifier (auto-assigned)                                                                          | FR-007 — 装置ID（自動採番）                                                              |
| Table column 装置名       | Controller name                                                                                                | FR-007 — 装置名                                                                          |
| Table column 店舗コード   | Store code the controller belongs to; **hidden while a single store is selected** in the header                | FR-007 — 店舗コード                                                                      |
| Table column 設置場所     | Install location                                                                                               | FR-007 — 設置場所                                                                        |
| Table column IPアドレス   | IP address                                                                                                     | FR-007 — IPアドレス                                                                      |
| Table column FW           | Firmware version                                                                                               | FR-007 — ファームウェアバージョン                                                        |
| Table column 制御ポート数 | Number of control ports                                                                                        | FR-007 — 制御ポート数                                                                    |
| Table column 紐付き機器数 | Count of connected devices ("{n}台")                                                                           | FR-007 — 装置に接続されている機器（参照用）                                              |
| Table column ステータス   | Status badge with colored dot (正常/異常/メンテナンス中/廃棄)                                                  | E-02 §機器状態                                                                           |
| Sortable headers          | Every data column is a sort trigger (server-side sort + order)                                                 | E-02 §要件の設計判断 (list columns are a design decision; sorting is prototype-added UX) |
| Store scope               | The header store selector is the only store scope — no in-panel 店舗 filter                                    | E-02 §データスコープ; prototype `effectiveStoreName`                                     |
| Row click                 | Navigates to the controller detail screen                                                                      | FR-004-analog — detail reference                                                         |
| 異常 row highlight        | Rows with status 異常 get a destructive-tinted background and left accent bar                                  | Prototype UX                                                                             |
| Empty result              | "条件に一致する接点制御装置がありません" + 条件をクリア (no filters: "登録されている接点制御装置はありません") | Project GUI checklist (the prototype renders an empty table body)                        |
| Pagination footer         | Page-size selector + page numbers; hidden while everything fits on one page                                    | Standard list UX                                                                         |

> **Column-set note**: E-02 §要件の設計判断 explicitly records that FR-007 does **not** specify list display columns; the 9-column set is an approved design decision (controller-list-panel.tsx). It is reproduced here verbatim.

### Screen B — Controller Form

| Field Label              | Control                          | Required mark | Default (create / edit)           | Source Requirement                                                       |
| ------------------------ | -------------------------------- | ------------- | --------------------------------- | ------------------------------------------------------------------------ |
| 接点制御装置ID           | Input (create) / disabled (edit) | ✅ (create)   | "" / record `relayId`             | FR-007 — 装置ID; API-104 `relayId` (Session 2026-11-09)                  |
| 装置名                   | Input                            | ✅            | "" / record value                 | FR-007 — 装置名                                                          |
| 店舗コード               | Store combobox                   | ✅            | "" / record store                 | FR-007 — 店舗コード (label = 「店舗名 (店舗コード)」, value = `storeId`) |
| 設置場所                 | Input                            | ✅            | "" / record value                 | FR-007 — 設置場所                                                        |
| IPアドレス               | Input (pattern)                  | ✅            | "" / record value                 | FR-007 — IPアドレス (optionality not stated in FR-007)                   |
| ファームウェアバージョン | Input                            | — (no mark)   | "" / record value                 | FR-007 — ファームウェアバージョン                                        |
| 制御ポート数             | Input (number)                   | ✅            | "" / record value (min 1, max 64) | FR-007 — 制御ポート数                                                    |
| 状態                     | Select                           | ✅            | 正常 / record value               | FR-007 — 状態; E-02 §機器状態 (4 states)                                 |

> `ポート番号` (通信ポート) was a form field until 2026-09-08 and is **gone**: the prototype omits it with the note 「通信ポート番号は要件に無いため置かない」, and FR-007 never listed it. See the 2026-09-08 clarification and gap C2.

- An informational `Alert` is shown between fields: "接続情報は装置本体のラベルまたは管理画面（http://[IP] にブラウザでアクセス）で確認できます。不明な場合は本部または導入業者にお問い合わせください。" — guidance only, no behavior.
- Helper texts appear under IPアドレス ("ローカルIPアドレス形式（例: 192.168.1.100）"), FW ("vN.N.N 形式") and 制御ポート数 ("通常 4 / 8 / 16").
- **Validation**: the prototype's `validateForm()` blocks submit on every visually-required field, and Phase 1 enforces the same set: 装置名, 店舗コード, 設置場所, IPアドレス, 制御ポート数, 状態. ファームウェアバージョン is optional. IPアドレス must also match the local-IP pattern, and 制御ポート数 must be an integer in 1–64.

### Screen B — Footer Actions

| Element            | Behavior                                                                                                             | Source Requirement  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------- |
| キャンセル button  | Returns to the controller list route; a discard dialog guards unsaved edits (project standard, beyond the prototype) | Standard UX         |
| 登録 / 更新 button | `登録` (create) / `更新` (edit); shows success toast then returns to the list route                                  | FR-007 — 登録・編集 |

- Success toast text: create → "接点制御装置を登録しました"; edit → "接点制御装置の変更を保存しました".
- Unlike the connected-equipment form (`007-equipment-form`), this controller form has **no unsaved-changes discard dialog** in the prototype.

### Screen C — Controller Detail: Header

| Element        | Behavior                                                                                                 | Source Requirement                               |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| BackLink       | "店舗機器管理" → controller list route                                                                   | Navigation                                       |
| Title/subtitle | Fixed title "接点制御装置詳細" + subtitle 「{店舗名} — {IPアドレス}」 + status badge                     | FR-007 — 詳細参照                                |
| 編集 button    | RoleGated (HQ/Sys/Mgr/Staff); → controller form in edit mode                                             | FR-007 — 編集; E-02 §権限マトリクス              |
| 削除 button    | RoleGated (HQ/Sys/Mgr/Staff); **disabled while the controller has connected devices**; opens AlertDialog | FR-007 異常系 — 接続機器が存在する装置は削除不可 |

### Screen C — Tab 基本情報

| Field (read-only)        | Source Requirement          |
| ------------------------ | --------------------------- |
| 接点制御装置ID           | FR-007 — 装置ID (`relayId`) |
| 装置名                   | FR-007 — 装置名             |
| 店舗コード               | FR-007 — 店舗コード         |
| 設置場所                 | FR-007 — 設置場所           |
| IPアドレス               | FR-007 — IPアドレス         |
| ファームウェアバージョン | FR-007 — FW                 |
| 制御ポート数             | FR-007 — 制御ポート数       |

- The three tab triggers (基本情報 / 紐付き機器一覧 / 変更履歴) carry **no** count badges, as in the prototype.
- Right column: **StatusCard** (one Cpu icon for every status, tinted by status tone; status badge; action button ステータス変更 → opens StatusChangeDialog), **紐付き機器サマリー** (紐付き機器数 + 正常/異常 counts + link "機器一覧を見る"), **その他情報** (作成日時 / 更新日時).
- "機器一覧を見る" leaves for the connected-equipment list screen, which is out of this spec's scope (cross-link only).

### Screen C — Tab 紐付き機器一覧 (DevicesTab)

| Element            | Behavior                                                                                              | Source Requirement                            |
| ------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Table              | Columns: 機器ID · 機器名 · 接点番号 · ステータス (read-only), ordered by 接点番号                     | FR-007 — 装置に接続されている機器の一覧を参照 |
| Row click          | Opens that connected device's detail (`006-equipment-detail`) — a cross-link, not a prototype element | Project navigation standard                   |
| 異常 row highlight | Rows with status 異常 get a destructive-tinted background                                             | Prototype UX                                  |
| Empty state        | "紐付いている機器はありません"                                                                        | Project GUI checklist                         |
| Summary footer     | 合計 / 正常 / 異常 counts, derived from the rows on screen                                            | Prototype UX                                  |

> `ゲート種別` was a fifth column until 2026-09-08. The prototype's table has four, and neither FR-007 nor API-104 defines a gate kind for a connected device, so both the column and the mock field were removed (supersedes N5).

### Screen C — Tab 変更履歴 (HistoryTab — seed/display-only)

| Element        | Behavior                                                                                                                                                                     | Source Requirement                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Table          | Columns: 日時 · 操作者 · ステータス変化 · 変更理由 (read-only), newest first                                                                                                 | Prototype-added (relates to Could-tier FR-012) |
| ステータス変化 | From-badge → To-badge; a row with no previous status is the creation row and renders a single 新規作成 badge                                                                 | Prototype display                              |
| Empty state    | "履歴はありません"                                                                                                                                                           | Project GUI checklist                          |
| Summary footer | 直近1年の対応 (count of non-creation rows within the last year) · 平均対応間隔 (mean gap between them, "—" below two rows) — both derived client-side from the returned rows | Prototype display                              |

- **Phase 1 history handling**: the tab is **read-only** — there is no add / edit / delete of history records. The rows come from the seed plus whatever the ステータス変更 dialog has appended (see below); a form edit never writes one.
- E-02 §プロタイプで追記した要件外の機能 notes the equipment-detail 変更履歴 tab as requirement-external (FR-012 specifies "記録・参照" only, not a standalone tab). The same caveat applies to this controller 変更履歴 tab; it is retained as display-only by user direction.

### Screen C — StatusChangeDialog (ステータス変更)

| Element                  | Behavior                                                                             | Source Requirement   |
| ------------------------ | ------------------------------------------------------------------------------------ | -------------------- |
| 対象装置情報 (read-only) | Shows 装置ID and 現在のステータス badge                                              | Context display      |
| 新しいステータス Select  | The four states **minus the current one**, each with its status dot; submit-blocking | E-02 §機器状態       |
| 変更理由 Textarea        | Optional, max 1000 chars                                                             | Prototype            |
| キャンセル / 変更を保存  | Cancel closes and resets; 変更を保存 is enabled once 新しいステータス is set         | FR-007 — 状態 update |

- **Persistence (resolved 2026-09-09, supersedes Q3 and the 2026-09-08 answer)**: 変更を保存 updates the controller's 状態 **and appends one 変更履歴 row** — the transition as its ステータス変化 and 変更理由 as its note; no row carries a kind. Excluding the current status from the options keeps the change from ever being a no-op.
- The prototype has no 廃棄 warning block and no alternate submit label; neither is specified.

### Screen C — Delete AlertDialog

| Element        | Content                                          |
| -------------- | ------------------------------------------------ |
| Title          | 接点制御装置を削除しますか？                     |
| Description    | 「{ip}」を削除します。この操作は取り消せません。 |
| Cancel action  | キャンセル                                       |
| Confirm action | 削除する → returns to the controller list route  |

- The 削除 button is **disabled** while the controller has connected devices (its 紐付き機器数 > 0), implementing FR-007 異常系 ("接続機器が存在する装置は削除不可"), and carries the tooltip 「紐付き機器が存在するため削除できません」. The dialog is reachable only when no connected devices exist, so it states the deletion plainly — as in the prototype, it does not double as a "cannot delete" explainer. The API keeps the same guard (409) and a rejection surfaces as an error toast.

---

## Behavioral Logic

**Source**: `controller-form.tsx`, `controller-detail.tsx`, `controller-list-panel.tsx`.

1. **List filtering**: The list filters controllers by the status Select and a free-text search (device name / IP address, plus device id and location server-side). The active-filter count badge reflects the status filter; すべてクリア resets it. Filters, sort and page live in the URL. The default order is 登録日時 (`createdAt`) descending — newest first; no header shows a sort indicator in that state (Session 2026-10-22).
2. **Store scope**: The header store selector decides the scope. 全店舗 lists every store the user may reach and shows the 店舗コード column; a single store narrows the query and drops that column. The CSV export and the tab count badge follow the same scope.
3. **List → Detail navigation**: Clicking a controller row opens that controller's detail by id.
4. **Create vs Edit (form)**: The `mode` prop drives the page title (新規登録 / 編集), submit label (登録 / 更新), success-toast text, the read-only ID value (「（自動採番）」 vs the existing id), and edit-mode prefilled values. Edit submits only the fields the user actually changed.
5. **Validation**: The visually-required set is submit-blocking (see Screen B); the first invalid field is scrolled into view.
6. **Edit launch**: From the detail header, 編集 opens the form in edit mode.
7. **Deletion guard**: 削除 is disabled whenever connected devices exist; otherwise it opens a confirmation dialog and, on confirm, deletes and returns to the list. (FR-007 異常系.)
8. **Status change**: The detail StatusChangeDialog captures 新しいステータス and an optional 変更理由, then commits via 変更を保存: the controller's 状態 changes and one 変更履歴 row is appended.
9. **Connected-device reference**: The detail 紐付き機器一覧 tab lists the devices wired to the controller in 接点番号 order (read-only), and the 紐付き機器サマリー aggregates counts; "機器一覧を見る" cross-links to the connected-equipment list.
10. **Change history**: The 変更履歴 tab renders records read-only; its footer figures are derived from the rows returned.

---

## UI States

**Prototype implementation note**: The prototype files use local React state and mock/seed data, so no server loading, fetch-error or save-error states appear there. The specified behaviour below is what the screens implement.

| State                       | Behavior in prototype                                               | Specified behaviour                                                                       |
| --------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **List — loaded**           | Renders `CONTROLLER_DATA`; status filter + search apply client-side | Fetch controllers for the header store scope, filtered/sorted server-side                 |
| **List — filtered empty**   | Not explicitly handled (no empty-state block)                       | Empty state + 条件をクリア (see Screen A)                                                 |
| **List — loading / error**  | Not represented                                                     | Table loading state; a failed fetch renders the shared error boundary                     |
| **Form — create empty**     | All fields empty/default; ID shows 「（自動採番）」                 | Same                                                                                      |
| **Form — edit prefilled**   | Fields populated from the controller record                         | Fetch controller by id, then render populated form (店舗コード shows 「店舗名 (コード)」) |
| **Form — validation error** | Field-level messages under each input                               | Same, plus 「未入力の項目があります」 next to the footer actions                          |
| **Form — submitting**       | Not represented                                                     | Submit disabled and relabelled (登録中... / 保存中...)                                    |
| **Form — save success**     | Success toast + navigate to list                                    | Same, after the API confirms                                                              |
| **Form — save error**       | Not represented                                                     | Error toast; entered data is retained                                                     |
| **Detail — loaded**         | Renders mock controller                                             | Fetch controller detail by id; tabs fetch devices / history on demand                     |
| **Detail — loading**        | Not represented                                                     | Detail skeleton                                                                           |
| **Detail — delete blocked** | 削除 disabled when `HAS_CONNECTED_DEVICES` is true                  | Same, driven by the record's 紐付き機器数, with an explanatory tooltip                    |
| **History — read only**     | Renders seeded history rows read-only                               | Read-only rows (seed + status-change rows); no add/edit/delete controls                   |

---

## User Scenarios & Testing

### User Story 1 — Register a New Contact-Control Device (Priority: P1)

**As** a Staff or Headquarter user,  
**I need** to register a newly installed contact-control unit with its basic settings (name, store, location, IP, firmware, control ports, status),  
**So that** the unit is tracked in the store and connected devices can later be wired to it.

**Why this priority**: FR-007 registration is the prerequisite for connecting any device and for all downstream usage-control behavior (basic-flow step ②).

**Independent Test**: Open the controller form in create mode, fill the settings, submit, and confirm the success toast and return to the controller list.

**Acceptance Scenarios**:

1. **Given** the form opens in create mode, **When** it renders, **Then** the title shows 接点制御装置 新規登録, the submit button reads 登録, and 接点制御装置ID shows 「（自動採番）」 (read-only).
2. **Given** the form, **When** the user enters 装置名 / 店舗コード / 設置場所 / IPアドレス / 制御ポート数 / 状態, **Then** the values are accepted (店舗コード via the store combobox; IP follows the local-IP format hint).
3. **Given** all settings are entered, **When** the user clicks 登録, **Then** the success toast "接点制御装置を登録しました" appears and the user returns to the controller list route.
4. **Given** the user clicks キャンセル, **When** confirmed, **Then** the form closes and returns to the controller list route.

### User Story 2 — Browse, Search & Filter Contact-Control Devices (Priority: P1)

**As** a Staff or Headquarter user,  
**I need** to view and narrow the list of contact-control devices,  
**So that** I can quickly locate a specific unit (e.g., one in 異常 state).

**Why this priority**: FR-007 mandates list display and search; locating a unit is the entry point for edit/detail/delete.

**Independent Test**: Open the controller list, type into search, apply the status filter, and confirm the table narrows accordingly.

**Acceptance Scenarios**:

1. **Given** the header scope is 全店舗, **When** the controller list renders, **Then** the table shows the 9 columns (装置ID · 装置名 · 店舗コード · 設置場所 · IPアドレス · FW · 制御ポート数 · 紐付き機器数 · ステータス) and the tab badge shows the total count.
   1b. **Given** a single store is selected in the header, **When** the list renders, **Then** only that store's controllers are listed and the 店舗コード column is not rendered.
2. **Given** the search box, **When** the user types a device name or IP fragment, **Then** the list narrows to matching controllers.
3. **Given** the 詳細フィルター is expanded, **When** the user selects ステータス = 異常, **Then** only 異常 controllers remain and the active-filter badge reflects the active filter; すべてクリア resets it.
4. **Given** a 異常 controller row, **When** the list renders, **Then** the row is visually highlighted.
5. **Given** any controller row, **When** the user clicks it, **Then** the controller detail screen opens.

### User Story 3 — View Controller Detail & Connected Devices (Priority: P1)

**As** a Staff or Headquarter user,  
**I need** to inspect a controller's settings and the devices wired to it,  
**So that** I can understand the unit's configuration and connection state before maintenance.

**Why this priority**: FR-007 requires referencing the devices connected to a unit; the detail is the read surface for all controller data.

**Independent Test**: Open a controller detail, switch among the three tabs, and confirm each renders its data.

**Acceptance Scenarios**:

1. **Given** the controller detail, **When** the 基本情報 tab renders, **Then** all settings (ID, 装置名, 店舗コード, 設置場所, IPアドレス, FW, 制御ポート数) are shown read-only, plus a status card and connected-device summary, and the header reads 接点制御装置詳細 with 「{店舗名} — {IPアドレス}」.
2. **Given** the 紐付き機器一覧 tab, **When** it renders, **Then** the connected devices are listed (機器ID · 機器名 · 接点番号 · ステータス) with a count summary footer.
3. **Given** the 変更履歴 tab, **When** it renders, **Then** change-history rows are shown read-only with a summary footer (no add/edit/delete controls).
   3b. **Given** the 基本情報 tab, **When** an authorized user changes the status through the ステータス変更 dialog, **Then** the status badge updates and a matching row appears in 変更履歴 with the transition and the entered 変更理由.
4. **Given** the detail header, **When** an authorized user clicks 編集, **Then** the controller form opens in edit mode prefilled with the controller's values.

### User Story 4 — Edit Contact-Control Device Settings (Priority: P2)

**As** a Staff or Headquarter user,  
**I need** to update an existing controller's settings,  
**So that** the record stays accurate after firmware updates or relocation.

**Why this priority**: FR-007 edit keeps the controller ledger correct; it reuses the create form.

**Independent Test**: Open the form in edit mode, change a value, submit, and confirm the update toast and return to the list.

**Acceptance Scenarios**:

1. **Given** the form opens in edit mode, **When** it renders, **Then** the title shows 接点制御装置 編集, the submit reads 更新, and fields are prefilled from the record (店舗コード as 「店舗名 (コード)」).
2. **Given** the user changes a value and clicks 更新, **Then** the toast "接点制御装置の変更を保存しました" appears and the user returns to the controller list route.

### User Story 5 — Delete a Contact-Control Device (Priority: P2)

**As** a Staff or Headquarter user,  
**I need** to delete a contact-control unit that is no longer used,  
**So that** the store ledger reflects only active units — but only when no devices are still wired to it.

**Why this priority**: FR-007 deletion with the 異常系 guard (no delete while connected devices exist) protects data integrity.

**Independent Test**: On a controller with connected devices, confirm 削除 is disabled; on one without, confirm the dialog deletes and returns to the list.

**Acceptance Scenarios**:

1. **Given** a controller with connected devices, **When** the detail renders, **Then** the 削除 button is disabled (FR-007 異常系).
2. **Given** a controller with no connected devices, **When** an authorized user clicks 削除, **Then** the confirmation dialog "接点制御装置を削除しますか？" appears.
3. **Given** the confirmation dialog, **When** the user clicks 削除する, **Then** the controller is deleted and the user returns to the controller list route.
4. **Given** an Observer or Trainer, **When** viewing the detail, **Then** the 削除 and 編集 actions are not available to them (role gate).

### Edge Cases

- Submitting the create/edit form with empty required fields → blocked; the enforced set is 装置名, 店舗コード, 設置場所, IPアドレス, 制御ポート数, 状態. ファームウェアバージョン may be left empty.
- IPアドレス entered in a non-local-IP format, or 制御ポート数 outside 1–64 → blocked by the field constraint.
- Status filter or search yielding zero controllers → empty state with 条件をクリア.
- Deletion attempted on a controller with connected devices → blocked at the UI (button disabled + tooltip) and by the API (409), reflecting FR-007 異常系.
- ステータス変更 committed → 状態 updated and one 変更履歴 row appended; the current status is not offered, so a no-op transition cannot be submitted.
- A controller whose 変更履歴 holds fewer than two non-creation rows → 平均対応間隔 renders "—" instead of a misleading 0日.
- Network/API failure on save, status change or delete → error toast; the screen keeps the entered data.
- A controller with no 装置名 or no FW → the list renders "---" and the detail an em dash.

---

## Requirements

### Functional Requirements (Phase 1 — FR-007)

- **FR-007-A (List & Search)**: System MUST display a list of contact-control devices showing 装置ID, 装置名, 店舗コード, 設置場所, IPアドレス, ファームウェアバージョン, 制御ポート数, 紐付き機器数, and ステータス, scoped to the store selected in the header (and never beyond the user's accessible stores), and MUST let users search by device name / IP address and filter by status (正常 / 異常 / メンテナンス中 / 廃棄). While a single store is selected the 店舗コード column MUST be omitted.
- **FR-007-B (Register)**: System MUST allow authorized users to register a contact-control device capturing 装置名, 店舗コード, 設置場所, IPアドレス, ファームウェアバージョン, 制御ポート数, and 状態 (default 正常). 接点制御装置ID (`relayId`) MUST be entered on registration (required, `^[A-Za-z0-9_-]{1,128}$`, unique — E-DEV-018) and read-only afterwards (Session 2026-11-09). On success the system MUST confirm and return the user to the controller list.
- **FR-007-C (Edit)**: System MUST allow authorized users to edit an existing contact-control device using the same form, prefilled from the record, and MUST confirm and return to the list on success.
- **FR-007-D (Detail)**: System MUST display a read-only controller detail with the full settings, a status summary, a connected-device summary (counts), and the list of connected devices (機器ID · 機器名 · 接点番号 · ステータス).
- **FR-007-E (Delete with guard)**: System MUST allow authorized users to delete a contact-control device only after a confirmation dialog, and MUST prevent deletion while the device has connected devices (FR-007 異常系).
- **FR-007-F (Status change)**: System MUST allow authorized users to change a controller's status via the status-change dialog, requiring 新しいステータス (変更理由 optional), MUST exclude the current status from the options, and MUST both update the controller's 状態 and append one change-history entry carrying the transition and the 変更理由.
- **FR-007-G (Change history — read only)**: System MUST display the controller's change history (日時 · 操作者 · ステータス変化 · 変更理由) read-only, newest first, with 直近1年の対応 and 平均対応間隔 summary figures. Only a status change appends a row (FR-007-F); users MUST NOT be able to create, edit or delete history records.
- **FR-007-H (Access control)**: System MUST restrict register / edit / delete / status-change to roles `System`, `Headquarter`, `Manager` (jurisdiction), and `Staff` (own store), per E-02 §権限マトリクス (接点制御装置設定), and MUST deny these actions to `Trainer` and `Observer`. `Observer` MUST be able to **view** the controller list and detail (read-only); `Trainer` MUST have no access (Q1).
- **FR-VAL-007 (Validation)**: System MUST enforce the following required fields as submit-blocking on the controller form: 装置名, 店舗コード, 設置場所, IPアドレス, 制御ポート数, 状態. ファームウェアバージョン is optional. IPアドレス MUST additionally match the local-IP address format, and 制御ポート数 MUST be an integer between 1 and 64.
- **FR-007-I (CSV export)**: While the 接点制御装置一覧 tab is active, the shared `CSV出力` action MUST export the controller list under the current search / status filter, sort and header store scope, with the nine list columns as its headers, gated by the CSV-export permission. (The button itself belongs to `029-equipment-list` FR-011.)

### Key Entities

- **Contact-Control Device (接点制御装置)**: Store-scoped control unit. Attributes: ID (system-assigned, read-only), 店舗 (id + the 店舗コード / 店舗名 labels the screens show), 装置名, 設置場所, IPアドレス, ファームウェアバージョン (optional), 制御ポート数, 状態, 紐付き機器数 (derived), 作成日時, 更新日時.
- **Connected Device (接続機器 — referenced)**: Device wired to a controller; shown read-only on the detail as 機器ID, 機器名, 接点番号, ステータス. Owned by FR-001–FR-006 (out of this spec); referenced here for the connected-device list/summary.
- **Controller Status (状態)**: One of 正常 / 異常 / メンテナンス中 / 廃棄 (default 正常). E-02 §機器状態.
- **Change History Entry (変更履歴) — read only**: Record with 日時, 操作者, ステータス変化 (from → to; the creation row is the one with no from), 変更理由. Written only by a status change; never edited or deleted from the UI.

---

## API Contract (mock ⇄ backend design doc)

**Design doc**: `.cache/api/openapi.json` → `Admin - Relay Controller (API-104)`. The mock endpoints under `/api/crm/controllers` speak the design doc's field names and response shapes so the switch to the real API is a base-path change, not a rename. Values follow the prototype wherever the two disagree.

| Screen use                  | Mock endpoint                       | Design-doc counterpart (API-104)                                          |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| List / search / sort / page | `GET /crm/controllers`              | `GET /admin/relay-controllers` §4.1                                       |
| Detail                      | `GET /crm/controllers/{id}`         | `GET /admin/relay-controllers/{relayControllerId}` §5.1                   |
| Register                    | `POST /crm/controllers`             | `POST /admin/relay-controllers` §6.1                                      |
| Edit / status change        | `PATCH /crm/controllers/{id}`       | `PATCH /admin/relay-controllers/{relayControllerId}` §6.2                 |
| Delete (with guard)         | `DELETE /crm/controllers/{id}`      | `DELETE /admin/relay-controllers/{relayControllerId}` §6.3                |
| 紐付き機器一覧 tab          | `GET /crm/controllers/{id}/devices` | `GET /admin/relay-controllers/{relayControllerId}/connected-devices` §4.2 |
| 変更履歴 tab                | `GET /crm/controllers/{id}/history` | **none** — mock-only (gap C4)                                             |
| CSV export                  | `GET /crm/controllers/export`       | **none** — mock-only, shaped like the API-103 device export (gap C5)      |
| Tab count badge             | `GET /crm/equipment/summary`        | **none** — mock-only, owned by `029-equipment-list`                       |

A controller carries the design doc's `id`, `storeId`, `name`, `location`, `ipAddress`, `firmwareVersion`, `controlPortCount`, `status`, `connectedDeviceCount`, `createdAt`, `updatedAt`; the list and devices responses are `{ items, pagination }` with the design doc's `PaginationDto` fields.

### Divergences (raise with BE, do not silently re-map)

| #   | Divergence                                                                                                                                                                      | Resolution taken                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Status enum: API-104 has `active` / `inactive` / `maintenance`; the prototype filters and renders 正常 / 異常 / メンテナンス中 / 廃棄 (E-02 §機器状態, four states).            | **Prototype wins** — `normal` / `error` / `maintenance` / `discarded`. BE question: the three-value enum cannot express 廃棄 or distinguish 異常 from メンテナンス中.                                                      |
| C2  | `port` (通信ポート番号) exists in neither API-104 nor the prototype's controller screens, yet `006-equipment-detail` renders 接点制御装置 `IP:ポート`.                          | Kept as a **seed-only mock field**, absent from every controller screen and from the create/update payload; new controllers default to 80. BE question: does the connected-device card's ポート have a source?             |
| C3  | `storeId` is marked immutable on PATCH in API-104, but the prototype's edit form offers 店舗コード as an editable combobox.                                                     | **Prototype wins** — the field stays editable and the mock accepts it. BE question: is a store move really rejected, and if so should the field be read-only on edit?                                                      |
| C4  | API-104 exposes no change-history endpoint, while the prototype's detail has a 変更履歴 tab.                                                                                    | Mock-only endpoint, shaped like the API-103 status history (`previousStatus` / `newStatus` / `changedBy` / `changedNote`) (no kind field, as of the 2026-09-09 prototype). BE question: will controller history be served? |
| C5  | API-104 exposes no CSV export, but the shared `CSV出力` button exports whichever tab is open.                                                                                   | Mock-only `GET …/export` returning `{ filename, rowCount, csv }`, the same envelope as the API-103 device export.                                                                                                          |
| C6  | API-104's `sort` enum covers `name` / `installedOn` / `updatedAt`; the prototype sorts every displayed column.                                                                  | The wider sort key set is served mock-side (same divergence the connected-equipment list records). BE question: widen `sort`.                                                                                              |
| C7  | API-104 carries `model`, `serialNumber`, `installedOn`, `secretArn`, `note`; no prototype controller screen shows any of them, and `installedOn` is even a documented sort key. | Not modelled in the mock. No screen requirement — recorded so nothing looks lost when the real API arrives.                                                                                                                |
| C8  | The prototype's controller detail shows 店舗コード and its header the 店舗名, but API-104 returns only `storeId`.                                                               | The mock resolves `storeCode` / `storeName` from the store table and returns them alongside `storeId`. BE question: will the controller payload embed the store labels, or must the FE join a store lookup?                |

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Authorized users can register a new contact-control device and reach the success confirmation in under 2 minutes.
- **SC-002**: From the controller list, a user can locate a specific unit (by name/IP search or status filter) in under 30 seconds for a store with up to 50 controllers.
- **SC-003**: 100% of controllers that have connected devices have their delete action blocked (button disabled), preventing accidental deletion (FR-007 異常系).
- **SC-004**: Users editing a controller see all previously saved settings prefilled with zero manual re-entry of unchanged fields.
- **SC-005**: The controller detail accurately reflects the count and status of connected devices (summary totals equal the connected-device list rows).
- **SC-006**: Role-restricted actions (register / edit / delete / status-change) are unavailable to Trainer and Observer 100% of the time.

---

## Assumptions

- The contact-control device list is a **dedicated route** (per user direction) rendered as the 接点制御装置一覧 tab of the shared 店舗機器管理 layout; the prototype's single-file tab embedding is reinterpreted accordingly.
- 接点制御装置ID auto-numbering is performed server-side; the form only displays it read-only.
- 店舗 is selected via the store combobox, scoped to the user's accessible stores: the label is 「店舗名 (店舗コード)」 and the value sent is the store id.
- The list, detail, connected-device and history data are fetched from the API (mock today, API-104 later); the prototype uses seed data (`CONTROLLER_DATA`, `HAS_CONNECTED_DEVICES`, devices/history seeds).
- Users never author history records; the only writer is the status change (FR-007-F).
- `紐付き機器数` and connected-device summaries are derived server-side from the connected-equipment records (FR-001–006, out of scope here).
- 直近1年の対応 and 平均対応間隔 are computed from the history rows the API returns; there is no aggregate endpoint for them.
- Role-based access for register/edit/delete/status-change follows E-02 §権限マトリクス; Observer may view the list/detail read-only while configuration remains denied (Q1).

---

## Q&A / Clarification — Resolved (Session 2026-06-26)

> All blocking items resolved by the user. No open clarifications remain. Two of the three were superseded by the 2026-09-08 prototype re-check.

| #   | Topic                                             | Resolution                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | View access for the controller list/detail        | **A — Observer may view** the list/detail (read-only); configuration actions (register/edit/delete/status-change) remain denied. Trainer: no access.                                                                                                                            |
| Q2  | Required-field enforcement on the controller form | **A — Enforce all visually-required fields.** ~~装置名, 店舗コード, 設置場所, IPアドレス, 制御ポート数, ポート番号, 状態~~ → **Superseded 2026-09-08**: ポート番号 left the form entirely, so the enforced set is 装置名, 店舗コード, 設置場所, IPアドレス, 制御ポート数, 状態. |
| Q3  | Status-change dialog vs seed-only history         | ~~**A — Update current 状態 only**; do NOT write a history entry.~~ → **Superseded 2026-09-09**: the dialog updates 状態 **and** appends one 変更履歴 row (transition + 変更理由, no kind), as the prototype shows; only user-authored history editing stays out of scope.      |

### Non-blocking observations (documented defaults applied)

| #   | Code ↔ Requirement discrepancy                                                                                                                    | Default applied in this spec                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | `ポート番号` appears in `controller-form` and `controller-detail` but is **not** in the FR-007 registration/edit item list.                       | ~~Resolved (Q2): confirmed an official, required Phase 1 field.~~ **Superseded 2026-09-08**: the prototype dropped it ("要件に無いため置かない") and so did every controller screen — see gap C2. |
| N2  | `IPアドレス` carries a required marker in the form, but FR-007 does not state its optionality.                                                    | Treated as required (per the prototype marker).                                                                                                                                                   |
| N3  | `ファームウェアバージョン` is an FR-007 listed item but carries **no** required marker in the form.                                               | Treated as optional (per the prototype).                                                                                                                                                          |
| N4  | The 変更履歴 tab is requirement-external (E-02 notes FR-012 specifies "記録・参照", not a standalone tab).                                        | Retained as **read-only** per user direction; the only writer is a status change (FR-007-F).                                                                                                      |
| N5  | `ゲート種別` (入口扉/出口扉/その他) column on the connected-device sub-table is not defined by FR-007.                                            | ~~Reproduced as a read-only display attribute from the prototype.~~ **Superseded 2026-09-08**: the column is gone from the prototype and from the screen.                                         |
| N6  | Store identifier inconsistency in mock data (detail 基本情報 shows 店舗コード `S-004` while list/form use `YS-001`; subtitle store text differs). | Prototype mock noise. **Fixed mock-side 2026-09-08**: a controller carries one consistent store id / code / name triple taken from the store table — see gap C8.                                  |
| N7  | The prototype list (`ControllerListPanel`) has no empty-result block, and pagination is a single static page.                                     | Both implemented per project standard (empty state + real paging).                                                                                                                                |
| N8  | The controller form has **no** unsaved-changes discard guard (unlike `equipment-form`).                                                           | The shipped form keeps the project-standard discard dialog; the prototype's omission is treated as a prototype gap, not a requirement.                                                            |

### Added 2026-10-12 (integration PO decisions)

| #   | Topic                  | Resolution                                                                                                                           |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Q4  | Controller 状態 values | **Prototype's four** (正常 / 異常 / メンテナンス中 / 廃棄). BE extends the API-104 enum; provisional 3-value labels until then (B3). |
| Q5  | 装置ID display         | **Short UUID** (tail 8 chars, full in tooltip) — BE owns the ID format.                                                              |
| Q6  | Controller CSV         | **Required.** BE adds `GET /relay-controllers/export`; button disabled until then (B8).                                              |
