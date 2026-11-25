# Feature Specification: E-02 Connected Equipment List & Search

**Feature Branch**: `029-equipment-list`
**Created**: 2026-09-07
**Last updated**: 2026-10-22 — default sort changed to 登録日時 (`createdAt`) descending (Session 2026-10-22)
**Status**: Clarified — 16 questions answered across 2026-09-07 (2 sessions) and 2026-09-08 (prototype re-check & mock ⇄ design-doc alignment); 8 deferred with defaults adopted
**PO Spec**: `E-02` — 店舗機器管理 (Store Equipment Management), doc version `260731_v2`
**Source**:

- Requirement: `dx-fitness/fitness-spec@89c2c79` → `crm/requirements/E-02.md` (byte-identical to `dx-fitness/fitness-crm-ui@1bad949` → `public/requirements/E-02.md`)
- UI prototype: `dx-fitness/fitness-crm-ui@1bad949` → `src/pages/equipment-list.tsx` (last changed `65f1244`, 2026-08-29) — connected-equipment side only; the file's controller tab belongs to `008-controller-management`
- Backend API design: `https://api.dev.fitness-v2.okamoto-hd.com/docs-json` — `Admin - Connected Device Management (API-103)`

**Input**: User description: "Create spec for screen E-02 — Phase 1 only, strictly grounded in the provided UI code and requirement spec, with the backend API design used as the API contract; mark every code↔spec mismatch with `[NEED CLARIFICATION]` and consolidate them for `/speckit.clarify`."

---

## Clarifications

### Session 2026-09-07

- Q: The shipped `/equipment` screen has 8 columns and its own enum spellings, while the prototype (2026-08-29) has 12 and API-103 uses different wire values — which wins? → A: **Follow the prototype exactly** — this spec supersedes the shipped column set: migrate to the prototype's 12 columns and drop `制御接点番号`, `QRコードID` and `更新日時` from the list. Wire values follow API-103; the prototype governs what is displayed and in what order.
- Q: The 紐づき契約種別 column shows 主契約 / オプション契約 / 都度オプション (billing-type flavoured), but E-02 `260731_v2` FR-008 removed 課金種別 as a judgment axis in favour of サービス種別 — what should the column display? → A: ~~**Keep the prototype's three labels exactly** (主契約 / オプション契約 / 都度オプション); the divergence is raised as a QA rather than re-mapped.~~ — **superseded 2026-09-10**: the prototype itself moved to FR-008 v2 in `6bc1f1c` (9/8), so there is no divergence left to raise. See §Session 2026-09-10.
- Q: The bulk dialog has one free-text 変更理由, but API-103 wants a closed `changedReason` enum plus `changedNote`, and rejects the whole batch on a no-op transition — how should the dialog behave? → A: **Keep the prototype exactly** — the textarea maps to `changedNote`, `changedReason` is not sent (it is optional), and devices already holding the target status are **excluded client-side before the request** so the all-or-nothing rejection can never trigger.
- Q: Selection in the prototype is unbounded and survives every filter and store-scope change, while API-103 caps a batch at 100 — what lifecycle should selection have? → A: **Follow the established A-02 transfer pattern** (`members/transfers/page.tsx:137-176`): selection is keyed by device id, preserved across paging, and **pruned to the ids present in the newly-arrived result set** after any search / filter / store-scope change — pruned only once the new data has actually arrived, never against a stale page. No client-side cap on how many devices may be selected.
- Q: With no selection cap and a 100-device API batch ceiling, what happens when the selection exceeds 100? → A: **Send as one request and surface the rejection** — the screen tells the user to reduce the selection below 100 and retry, mirroring A-01's bulk-conflict toast. The batch is deliberately **not** split into chunks, because API-103 refuses partial success by design (a half-applied maintenance sweep is worse than none).

### Session 2026-09-07 (implementation alignment)

- Q: The mock status enum is shared with the contact-control device screens, but the design doc gives relay controllers a different enum (`active` / `inactive` / `maintenance`) — rename in place or split? → A: **Split into two enums** — connected equipment adopts the API-103 values, contact-control devices keep their own value set. The controller screens (`008-controller-management`) are not dragged into this change.
- Q: Align only the enum values, or the field names too (the design doc is camelCase with different names: `location`, `note`, `relayControllerId`)? → A: **Both** — the mock adopts the design doc's camelCase field names as well as its enum values, across the list, detail and form projections.
- Q: `制御接点番号` and `QRコードID` leave the list but `006-equipment-detail` still shows them, and the design doc has no field for either — where do they live? → A: **Move them to the detail projection only**, so the detail screen keeps working while the list matches the prototype.
- Q: `/crm/equipment/summary` has no counterpart in the design doc, yet it feeds both tab badges — remove it? → A: **Keep it** as a mock-only convenience and record the divergence; removing it would change the contact-control device screen owned by `008`.
- Q: The mock CSV export is `POST` returning a file, the design doc is `GET` returning `{ filename, rowCount, csv }` — which shape? → A: **Follow the design doc** — `GET` returning the JSON envelope; the export button assembles the file from the returned `csv` string.

---

### Session 2026-09-08 (prototype re-check & mock ⇄ design-doc alignment)

Re-checked the shipped screen against the latest prototype (`dx-fitness/fitness-crm-ui@1bad949`, `equipment-list.tsx` last changed `65f1244`) and against the API-103 design doc in `.cache/api/openapi.json`. Anything the prototype does not have was removed; where prototype and design doc disagree, the prototype wins.

- Q: The page header rendered `CSV出力` as a **dropdown** (per-tab export items) while the prototype has a single plain button — which stands? → A: **Single plain button**, as in the prototype. It exports whichever list is on screen, so the active tab decides both the endpoint and the permission checked (`EquipmentExport` on `/equipment`, `ControllerExport` on `/controllers`). This closes parity item PAR006.
- Q: The design doc's list description mentions `includeDiscarded=true` but declares no such parameter, while `status=discarded` is an accepted filter (gap A6) — should 廃棄 rows be hidden by default? → A: **No.** The prototype lists 廃棄 devices and offers 廃棄 in the 状態 filter, so the mock keeps returning them unfiltered. Recorded as a BE question rather than implemented.
- Q: The mock bulk endpoint accepted a no-op transition, but the design doc rejects the whole batch (422 `E-DEV-005`) — align it? → A: **Aligned.** The mock now returns 422 when any selected device already holds the target status, and writes one status-history row per updated device (design doc §6.4). The screen still drops no-op rows client-side (Q3), so the rejection is unreachable from the UI and stays a contract guarantee rather than a user-facing error.
- Q: `/crm/equipment/summary` returned an unscoped contact-control device count — is that acceptable? → A: **No.** Both badges follow the header store scope, as in the prototype (`scopedEquipmentCount` / `scopedControllerCount`). The controller seed's own store-code space is bridged to store ids inside the equipment seed, so scoping no longer requires touching `008`'s data.
- Q: 紐づき契約種別 badges rendered メイン契約 / オプション契約 / 都度利用 — which labels? → A: **The prototype's exactly** ~~(主契約 / オプション契約 / 都度オプション)~~ — **relabelled 2026-09-10** to 主契約 / サービス種別（○○）, per the prototype's own FR-008 v2 update.

### Session 2026-09-10 — prototype re-check (FR-008 v2)

Re-checked against `dx-fitness/fitness-crm-ui@46253e3`; `src/pages/equipment-list.tsx` last changed `6bc1f1c` (9/8), the same commit that reshaped the form and detail screens.

- Q: What does the 紐づき契約種別 column render now? → A: **One badge per judgment**: `主契約` for the main-contract axis, and `サービス種別（○○）` — service type in parentheses — per selected service type. The billing-flavoured `オプション契約` / `都度オプション` labels are gone, which closes the FR-008 v2 divergence recorded on 2026-09-07 (no QA needed).
- Q: The same commit adds a 店舗 column — when is it shown? → A: **Only under the 全店舗 header scope** (prototype `isAllStores`). Inside a single-store scope every row repeats the same store, so the column is dropped rather than rendered — the same rule `010-d03-studio-list` already follows. It sorts on a new `storeName` key, mock-side like the other extra sort keys (gap A3). The column count is therefore **12 columns (13 under 全店舗)**.
- Q: The 異常 filter chip gained a working × in the prototype — is the screen behind? → A: **No** — the chip's dismiss (`releaseAbnormalPin`) was already implemented here before the prototype caught up; no change needed.

### Session 2026-10-12 — PO decisions on real-API gaps (E-02 integration)

Raised by the real-API integration (`../integration-plan.md` §9) against `fitness-spec@c7ea80c` (E-02 `260731_v2`), `fitness-crm-ui@47423ec` and the API-103 / API-104 contract in `src/lib/openapi.real.json`. Answered by the user (PO-side) on 2026-10-12.

- Q: Under the 全店舗 header scope, API-103 `GET /connected-devices` and `/export` require `storeId` (400 `E-VAL-001`), while FR-001 says 「選択した店舗」 and the actor table / データスコープ give HQ 全店舗 — per-store only, or a true all-stores view? → A: **All-stores view for System / HQ**, as the prototype (`isAllStores`, 店舗 column). **BE dependency**: make `storeId` optional on the list and on `/export` (gate-svc already treats it as optional — BFF-only change). Until then the Round 1 gate stays: 「店舗を選択してください」, CSV disabled, tab count `—` (integration B4, Round 2).
- Q: 接続機器ID is a UUID and API-103 `q` matches name / serial / location only — keep FR-002's 機器ID partial-match search? → A: **Follow the BE.** The ID format is the BE's call: the column shows the short UUID (last 8 characters, full value in a tooltip), and the FR-002 機器ID partial-match search **stays**: API-103 `q` matches the device id as text (`id::text ILIKE`, backend `6e600613`, 2026-10-09; verified live — the 8-char tail shown in the table, any case, hits), alongside 機器名 / シリアルナンバー / 設置場所. Closes Q10 below and integration B7.
- Q: The shared CSV出力 button has no API on the 接点制御装置 tab — device ledger only, or both? → A: **Both.** **BE dependency**: API-104 adds `GET /relay-controllers/export`. CSV is never built client-side, so the button stays disabled on that tab until the endpoint ships (integration B8, Round 2).

### Session 2026-10-22 — default sort order

Decided by the user on 2026-10-22. Supersedes the default in SR-001 and integration **D9** (`接続機器ID` asc in the prototype, `機器タイプ` asc live).

- Q: Which order does the list open in? → A: **登録日時 (`createdAt`) descending — newest first.** API-103 serves `sort=createdAt` (BE zod schema; not yet listed in the API-103 §5.2 `sort` table → BE doc follow-up). The key has no column, so no header shows a sort indicator; clicking a header sorts by that column as before, and clearing it (third click) returns to `createdAt desc`. CSV出力 without a sort param follows the same order.

### Session 2026-11-09 — 紐づき契約種別 badges per axis (prototype 11/7)

Re-checked against `dx-fitness/fitness-crm-ui@4508cf7` (11/7 「接続機器の利用制御ルール：主契約判定の全て・複数選択」, report `public/reports/20261107-equipment-usage-rule/`), `fitness-backend-v2@origin/main` `07993418` (API-103 `allowedContractTypes[]`) and `28b9f0cb` (API-104 `relayId`), and `fitness-spec@5e335ab` (`E-02` `261107_v5` — its FR-008 still reads 主契約タイプ 「単数Select」; the 11/5 データ設定会 decision and the prototype supersede it, PO spec update pending).

- Q: What does 紐づき契約種別 render now? → A: **One outline badge per judged axis**, stacked: `主契約（全て）` or `主契約（通常会員・家族会員）`, then `サービス種別（プロテイン・水素水）`. Three or more names collapse to `（○○ ほかN種）` with the full list (・-joined) in a tooltip; a badge whose text exceeds 16 characters also gets a tooltip. An axis that is not judged has no badge. Supersedes the per-service-type badges of Session 2026-09-10.
- Q: 機器タイプ filter? → A: Unchanged six types. 入退館タブレット (`gate_tablet`) rows show their label, but the list API's `deviceType` filter does not take it yet, so it is not a filter option.

### Session 2026-11-09 — entry/exit gate split (機器タイプ 退館ゲート)

- Q: Stores now install separate physical gates for check-in and check-out — how is that modelled? → A: **A new 機器タイプ** (user request, 2026-11-09). API-103 `deviceType` gains **`exit_gate`** and `entry_gate` becomes check-in only. Labels: `entry_gate` 入退館ゲート → **入館ゲート**, `exit_gate` → **退館ゲート** — 7 types, in this order: 入館ゲート / 退館ゲート / 水素水サーバー / 体組成計 / タンニングマシン / プロテインサーバー / その他 (the BE CSV exports use the same labels).
  - **Backend (API-108 gate judgment, fitness-backend-v2):** the member's position comes from their gate state — the last allowed gate event at the store within 24 h (入館 / 同伴入館 = inside, 退館 or none = outside). An `entry_gate` refuses a member who is already inside (`denied_duplicate`, 二重入館) and otherwise runs the usual guard chain; an `exit_gate` lets an inside member out unconditionally and refuses one who is outside (`denied_other`, detail `not_inside`). Gate terminal messages are unchanged (both refusals show the generic 「ご利用いただけません。スタッフにお声かけください」).
  - **List screen:** the 機器タイプ badge, the 詳細フィルター 機器タイプ select and the CSV use the 7 labels; `deviceType=exit_gate` is a valid list filter and sorts right after `entry_gate` (API-103 declaration order). Nothing else on the list changes.
  - **Test cases:** E-02-A TC-021 / TC-062 / TC-069 reset to Untested; TC-190, TC-191 added.

### Session 2026-11-19 — 機器タイプ エリア扉 (E-02 v5, ladyroom)

Re-checked against `fitness-spec@9e0e07e` (`E-02` `261109_v6` FR-001 / FR-003 / FR-016), `dx-fitness/fitness-crm-ui@9428dc2` (`data/equipment.ts` — badge builder) and `src/lib/openapi.real.json` (API-103 `deviceType` `area_door`, `area`).

- Q: What changes on the list? → A: The 機器タイプ badge, the 詳細フィルター 機器タイプ select and the CSV gain 「エリア扉」 (`deviceType=area_door`) — 8 labels. An エリア扉 row's 紐づき契約種別 is **one** outline badge `エリア（{エリア名}）` (no 主契約 / サービス種別 badge — an エリア扉 has no judgment axes). E-02 FR-001 does not mention the area, so the badge is **prototype-only**. The name is read live: renaming the area in the area master ([009-area-master](../009-area-master/spec.md)) changes the badge on the next load.
- Q: How does the CSV export the area? → A: **Not specified** — open point; the tester records what the export contains.
  - **Test cases:** E-02-A `[エリア扉]` cases per the 029 test plan §5.

## Scope

E-02 is a whole-screen requirement whose sibling capabilities are already specified elsewhere in this project. This spec covers **only the connected-equipment list screen** — the part of E-02 that has no spec yet.

### In Scope (Phase 1)

| ID         | Requirement                      | Tier   | Screen Coverage                                                                                                |
| ---------- | -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| **FR-001** | Connected equipment list display | Must   | 12-column table, row → detail navigation, empty state, pagination                                              |
| **FR-002** | Connected equipment search       | Must   | Toolbar keyword search + `詳細フィルター` panel (店舗 / 機器タイプ / 状態), AND-combined, filter result banner |
| **FR-010** | Bulk equipment status update     | Should | Selection checkboxes + bulk action bar + `一括状態変更` dialog                                                 |
| **FR-011** | Equipment ledger CSV export      | Could  | `CSV出力` button in the page header (role-gated)                                                               |

Plus the **connected-equipment side of the page chrome** that `equipment-list.tsx` renders around the table: the 店舗機器管理 title, the connected-equipment count badge, the `接続機器一覧` tab trigger and its badge, and the `接続機器を登録` entry point (SR-008).

### Separation from the contact-control device spec

The prototype renders the connected-equipment list and the contact-control device list in **one file** (`equipment-list.tsx`, two `Tabs`). This spec deliberately does **not** follow that packaging: everything on the 接点制御装置 side is specified by `specs/008-controller-management`, which already routes it to its own `/controllers` screen. The seam:

| Element                                                 | Owned by                                        |
| ------------------------------------------------------- | ----------------------------------------------- |
| `接続機器一覧` tab trigger + count badge                | **This spec** (SR-008)                          |
| `接続機器を登録` menu item                              | **This spec** (SR-008, entry point only)        |
| `CSV出力` button                                        | **This spec** (FR-011)                          |
| 店舗機器管理 title + connected-equipment count badge    | **This spec** (SR-008)                          |
| `接点制御装置一覧` tab trigger + count badge            | `008-controller-management`                     |
| `接点制御装置を登録` menu item                          | `008-controller-management` (§Entry point note) |
| `ControllerListPanel` table, filters, sorting, paging   | `008-controller-management`                     |
| Contact-control device count / `relay-controllers` data | `008-controller-management`                     |

Neither spec owns the tab-bar container itself; it is shared layout, and each spec owns only its own trigger. No requirement, scenario, success criterion or parity item in this document describes contact-control device data or behaviour.

### Out of Scope for Phase 1

| ID / Feature                                    | Reason                                                                                                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-003 / FR-005                                 | Connected-equipment create / edit — covered by `specs/007-equipment-form`. This screen only provides the entry point.                                                                                                |
| FR-004 / FR-006 / FR-012                        | Connected-equipment detail / delete / status-change history — covered by `specs/006-equipment-detail`.                                                                                                               |
| FR-007 (all of it)                              | Contact-control device management — list, form, detail, **and its tab trigger, count badge and `接点制御装置を登録` entry point** — covered by `specs/008-controller-management`, which routes it to `/controllers`. |
| FR-008 / FR-009                                 | Usage-control rules & authentication-method configuration — covered by `specs/007-equipment-form`. This screen only displays them.                                                                                   |
| FR-013                                          | Equipment usage log reference (認証成功/失敗の履歴) — Could tier, no prototype screen exists.                                                                                                                        |
| Real-time device health monitoring              | E-02 §制限事項 — health monitoring belongs to the contact-control device; CRM shows manually-updated status only.                                                                                                    |
| Member authentication / start-up signal runtime | E-02 §制限事項 — contract judgment and signal dispatch are system-side, not configured on this screen.                                                                                                               |
| Cross-store equipment move                      | E-02 §制限事項 — handled as delete + re-register, not as a list action.                                                                                                                                              |
| Entry/exit & option usage history views         | E-02 §制限事項 (#402) — data is retained but not exposed to CRM or customers.                                                                                                                                        |

**Phase attribution**: `Phase-Scope.md:37` records `E-02 | 店舗機器管理 | 明示なし → Phase 1` — the whole screen is Phase 1. `equipment-list.tsx` contains **no** Phase 2 markers, no future-scope placeholders, and no disabled-for-future controls. The only non-functional affordance in the prototype's connected-equipment side is a mock stub (the CSV click handler is empty) — a prototype gap, not a deferred phase, and specified as functional below.

---

## Feature Overview

Store staff and head-office users need one place to see every contact-control-connected device installed at a store — entry gates, hydrogen-water servers, body-composition monitors, tanning machines, protein servers — with enough technical detail (serial, IP, MAC, location, install date) to identify a unit during a fault call, its current operating status, and which contract type gates its use.

The screen delivers three jobs:

1. **Find a device fast** — keyword search across ID / name / serial / location, plus store, device-type and status filters (FR-001, FR-002).
2. **Spot trouble at a glance** — abnormal rows are visually escalated, and the screen accepts a deep link that opens pre-filtered to 異常 (FR-001).
3. **Act in bulk** — select several devices and move them to a new status in one operation, e.g. before a maintenance sweep (FR-010); export the ledger for offline work (FR-011).

**Move to Happy alignment** (E-02 §Move to Happy との関連): staff grasp the state of every connected device from one list, so identifying a faulty unit and adjusting its usage control takes the shortest possible path.

---

## Actors & Access Control

Derived from E-02 §権限マトリクス (rows 接続機器一覧・検索 / 接続機器登録・編集・削除 / CSV出力) and the `RoleGatedButton` / `RoleGatedMenuItem` `allowedRoles` props in the prototype.

| Role                 | View list & search | Bulk status update (FR-010) | CSV export (FR-011) | 接続機器を登録 entry | Data scope       |
| -------------------- | ------------------ | --------------------------- | ------------------- | -------------------- | ---------------- |
| System               | ✅                 | ✅                          | ✅                  | ✅                   | All stores       |
| Headquarter (本部)   | ✅                 | ✅                          | ✅                  | ✅                   | All stores       |
| Manager              | ✅                 | ✅                          | ✅                  | ✅                   | Managed stores   |
| Staff (店舗スタッフ) | ✅                 | ✅                          | ✅                  | ✅                   | Own store        |
| Observer (閲覧のみ)  | ✅                 | ❌                          | ✅                  | ❌                   | Own store (read) |
| Trainer              | ❌                 | ❌                          | ❌                  | ❌                   | —                |

- Prototype evidence: `equipment-list.tsx:724` (`CSV出力` — `["Headquarter","System","Manager","Staff","Observer"]`, deny tooltip `CSV出力の権限がありません`); `equipment-list.tsx:745` (`接続機器を登録` — `["Headquarter","System","Manager","Staff"]`, deny badge `権限なし`).
- **Store scope** comes from the shared header store selector via `useCurrentUser()` (`accessibleStores`, `currentStoreId`). When `currentStoreId !== "all"`, the list is scoped to that store and the in-panel 店舗 filter is **unmounted** (`equipment-list.tsx:273,423-424`); the store filter renders only when `currentStoreId === "all"` **and** the user can reach ≥2 stores (`equipment-list.tsx:258`).
- **Gap**: the prototype does **not** role-gate row selection or the `一括状態変更` button inside the bulk bar (`equipment-list.tsx:469-478`), so an Observer could reach a write action. The already-shipped project implementation does gate it (`Permission.EquipmentEdit`). See Q6.

---

## Component Hierarchy & Layout

```
EquipmentList (page)                                    equipment-list.tsx:696
├── SharedSidebar currentPage="equipment-list"                            :711
└── SidebarInset (max-h-svh, overflow-hidden)                            :712
    ├── SharedHeader (global store-scope selector)                       :713
    ├── PageHeader outside                                               :715
    │   ├── title "店舗機器管理"                                          :717
    │   ├── count = scopedEquipmentCount (store-scoped, not filter-scoped) :718
    │   └── actions                                                       :720
    │       ├── RoleGatedButton "CSV出力" (Download icon)                 :722-731
    │       └── DropdownMenu "新規登録" (Plus + ChevronDown)              :733-759
    │           ├── RoleGatedMenuItem "接続機器を登録" → equipment-form   :744-750
    │           └── RoleGatedMenuItem "接点制御装置を登録"                :751-757  [out of scope → 008]
    └── main (flex-1, overflow-y-auto)                                    :765
        └── Tabs defaultValue={activeTab}                                 :768
            ├── TabsList variant="line"           (shared layout)         :769
            │   ├── TabsTrigger "接続機器一覧" + Badge {scopedEquipmentCount}  :770-775
            │   └── TabsTrigger "接点制御装置一覧" + Badge                :776-781  [out of scope → 008]
            ├── TabsContent "equipment" → EquipmentTablePanel             :784-786
            └── TabsContent "controllers" → ControllerListPanel           :788-790  [out of scope → 008]

EquipmentTablePanel                                                       :256
└── Card (py-0 gap-0)                                                     :390
    ├── Toolbar (px-4 py-3)                                               :392
    │   ├── Search Input (max-w-[400px], Search icon, placeholder)        :394-402
    │   ├── Button "詳細フィルター" / "閉じる" + count Badge + Chevron    :404-418
    │   ├── Filter row (conditional on filterExpanded)                    :421-467
    │   │   ├── Select 店舗 (conditional)                                 :424-439
    │   │   ├── Select 機器タイプ (7 options)                             :440-453
    │   │   └── Select 状態 (5 options)                                   :454-465
    │   └── Bulk action bar (conditional on selectedIds.size > 0)         :469-478
    │       ├── "{n}件選択中"                                             :471
    │       ├── Button "選択解除"                                          :472
    │       └── Button "一括状態変更"                                      :474-476
    ├── Active filter chip (conditional on filterStatus === "異常")       :481-489
    ├── FilterResultBanner (total / count / summary / onClear)            :490-496
    ├── Table                                                             :497
    │   ├── TableHeader — 12 columns, all sortable, each with tooltip     :498-569
    │   └── TableBody — EmptyState row OR data rows                       :570-634
    ├── Pagination footer                                                 :637-683
    │   ├── "全 {n} 件 / {p} ページ / {a}-{b} を表示"                     :638-640
    │   ├── Pagination (Previous / numbers / Ellipsis / Next)             :641-671
    │   └── 表示件数 Select (25 / 50 / 100 / 200)                          :672-682
    └── BulkStatusDialog                                                   :686-690

BulkStatusDialog                                                          :152
└── Dialog > DialogContent (max-w-md)                                     :165-166
    ├── DialogTitle "一括状態変更"                                         :168
    ├── DialogDescription "選択中 {n} 件の接続機器の状態を変更します。"     :169
    ├── Label "変更先状態" + Select (4 statuses, each with colour dot)     :173-206
    ├── Warning box (conditional on newStatus === "廃棄")                  :209-214
    ├── Label "変更理由" + OptionalMark + Textarea (rows=3, max 1000)      :217-223
    └── DialogFooter                                                       :225
        ├── Button "キャンセル" (outline)                                  :226
        └── Button "変更を保存" / "廃棄する" (disabled until status chosen) :227-233
```

**Routing divergence (already decided)**: the prototype renders the controller list as tab 2 **inside** this page. `specs/008-controller-management` §Routing decision gave the controller list its own route, and the project implements the two tabs as a route-group layout (`src/app/(private)/(equipment-management)/layout.tsx`) whose `TabsTrigger`s navigate between `/equipment` and `/controllers`. FR-007's _画面構成 2タブ_ requirement is satisfied by that layout, not by this screen. This spec therefore treats the tab bar as **shared layout it does not own**, and specifies only the `接続機器一覧` trigger; the nodes marked `[out of scope → 008]` above are reproduced solely to show where the file's seam falls.

---

## UI Element Traceability

Every user-visible element in `equipment-list.tsx` mapped to its E-02 requirement.

### Page shell

| UI element                 | Prototype ref | E-02 requirement                                         | Notes                                                                                                                                                     |
| -------------------------- | ------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title `店舗機器管理`       | `:717`        | §メタ情報 画面名                                         | —                                                                                                                                                         |
| Header count badge         | `:718`        | FR-001                                                   | Store-scoped total, **not** affected by search/filters                                                                                                    |
| `CSV出力` button           | `:722-731`    | FR-011 (Could) + §権限マトリクス CSV出力                 | Single plain outline button (no dropdown); exports the list on screen — the active tab picks the endpoint and the permission checked (Session 2026-09-08) |
| `新規登録` dropdown        | `:733-759`    | FR-001 §処理内容 "新規登録ボタン…へのアクセスを提供する" | Trigger is shared chrome; only the connected-equipment item is specified here                                                                             |
| ↳ `接続機器を登録`         | `:744-750`    | FR-003 (entry point only)                                | Target screen owned by `007-equipment-form`                                                                                                               |
| Tab `接続機器一覧` + count | `:770-775`    | SR-008                                                   | This screen's own tab trigger                                                                                                                             |

### Search & filter (FR-002)

| UI element                                                       | Prototype ref      | FR-002 condition                                        | Notes                                                                                                                                   |
| ---------------------------------------------------------------- | ------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Keyword input `機器ID、機器名、シリアル、設置場所で検索`         | `:396-401`, `:288` | 機器ID / 機器名 / シリアルナンバー / 設置場所 (partial) | One input covers 4 of the 6 FR-002 conditions; OR within the input, AND against the selects. 機器ID matches the UUID text (API-103 `q`) |
| `詳細フィルター` toggle (label flips to `閉じる`)                | `:404-418`         | — (progressive disclosure)                              | Button turns `default` variant and shows an active-count badge when ≥1 filter is non-default                                            |
| Select 店舗 (`全店舗` + accessible stores)                       | `:424-439`         | Not in FR-002; implied by FR-001 "選択した店舗"         | Rendered only for multi-store scope; see Actors                                                                                         |
| Select 機器タイプ (`全ての機器タイプ` + 6 types)                 | `:440-453`         | 機器タイプ (select)                                     | Options match E-02 §機能の定義 機器タイプ exactly                                                                                       |
| Select 状態 (`全ての状態` + 4 statuses)                          | `:454-465`         | 状態 (select)                                           | Options match E-02 §機能の定義 機器状態 exactly                                                                                         |
| Active-filter highlight on a non-default select                  | `:145-149`         | —                                                       | `border-primary bg-primary/10`                                                                                                          |
| `FilterResultBanner` (total, count, summary, clear)              | `:490-496`         | FR-002 §出力・結果                                      | Shown when any filter is non-default **or** the keyword is non-empty                                                                    |
| Filter summary copy `検索: "x"、店舗: y、機器タイプ: z、状態: w` | `:329-336`         | —                                                       | Store part appears only in multi-store scope                                                                                            |
| `異常` deep-link chip `異常 — {n}件` + X                         | `:481-489`         | FR-001                                                  | Rendered when the page is entered with `filterStatus="異常"`; locks the 状態 filter                                                     |

**Search/filter interaction rules read off the code**

- Every filter change and keyword keystroke resets pagination to page 1 (`:400,427,442,455`).
- Conditions combine with **AND** across keyword, store, device type and status (`:287-292`), matching FR-002 "複数条件はAND検索".
- When entered via the `異常` deep link, the status filter is pinned: `status` initialises to `異常` (`:264`), the status predicate is skipped (`:289`), and `clearAllFilters` deliberately does **not** reset it (`:325`).
- `clearAllFilters` resets keyword, store and device type (and status when not deep-linked) and returns to page 1 (`:321-327`).

### Result table (FR-001)

Column order is normative — 12 columns, left to right:

| #   | Column             | Prototype ref | Sort key          | Rendering                                                                                                                                                                 |
| --- | ------------------ | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | selection checkbox | `:500-506`    | —                 | Header checkbox with indeterminate state; page-scoped select-all                                                                                                          |
| 2   | `接続機器ID`       | `:507-519`    | `id`              | `text-xs text-muted-foreground`; default sort (`id` asc, `:267-268`)                                                                                                      |
| 3   | `接続機器名`       | `:520-532`    | `name`            | `text-sm font-medium`                                                                                                                                                     |
| 3a  | `店舗`             | `:549-551`    | `storeName`       | `text-xs text-muted-foreground`; **rendered only while the header scope is 全店舗** (see below)                                                                           |
| 4   | `機器タイプ`       | `:533-545`    | `equipmentType`   | `Badge variant="secondary"`                                                                                                                                               |
| 5   | `シリアルナンバー` | `:547`        | `serialNumber`    | monospace                                                                                                                                                                 |
| 6   | `IPアドレス`       | `:548`        | `ipAddress`       | monospace; `—` when null (`:612`)                                                                                                                                         |
| 7   | `MACアドレス`      | `:549`        | `macAddress`      | monospace; `—` when null (`:613`)                                                                                                                                         |
| 8   | `設置場所`         | `:550`        | `installLocation` | `text-sm`                                                                                                                                                                 |
| 9   | `設置日`           | `:551`        | `installDate`     | `YYYY/MM/DD`                                                                                                                                                              |
| 10  | `状態`             | `:552-564`    | `status`          | `Badge variant="outline"` + colour dot                                                                                                                                    |
| 11  | `認証方式`         | `:566`        | `authMethod`      | plain text — `会員読取型` / `機器読取型` / `なし`                                                                                                                         |
| 12  | `紐づき契約種別`   | `:567`        | `usageRule`       | one `Badge variant="outline"` per judged axis, stacked: `主契約（全て）` / `主契約（A・B）` / `サービス種別（A・B）`; ≥3 → `（A ほかN種）` + tooltip (Session 2026-11-09) |

This column set matches FR-001 §表示項目 exactly (機器ID・機器名・機器タイプ・シリアルナンバー・IPアドレス・MACアドレス・設置場所・設置日・状態・認証方式・紐づき契約種別); the prototype carries `E-02 L162` source comments on the columns added for it (`:546,565`).

**Status badge palette** (`:125-136`)

| 状態           | Dot / badge semantic |
| -------------- | -------------------- |
| 正常           | `success`            |
| 異常           | `destructive`        |
| メンテナンス中 | `info`               |
| 廃棄           | `muted-foreground`   |

**Row behaviour**

- Whole row is clickable → connected-equipment detail (`:599`); the checkbox cell stops propagation so ticking never navigates (`:601`).
- Abnormal rows are escalated with a tinted background **and** a 4px inset left border in destructive colour (`:598`).
- Sorting is string-based over the selected key, nulls coerced to `""` (`:295-301`); clicking the active column flips direction, clicking another column switches key and resets to ascending, and either action returns to page 1 (`:311-319`).
- Sort header tooltip copy is state-dependent: `クリックで降順ソート` when the column is active and ascending, otherwise `クリックで昇順ソート` (`:355,516`).

### Bulk status update (FR-010)

| UI element                                                       | Prototype ref | Behaviour                                                                                                                                                |
| ---------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header select-all checkbox                                       | `:500-506`    | Selects/clears **the current page only**; indeterminate when partially selected (`:363-364,366-376`)                                                     |
| Row checkbox                                                     | `:602`        | Toggles one device; selection is keyed by device ID and survives paging and re-filtering                                                                 |
| Bulk bar `{n}件選択中`                                           | `:471`        | Appears only while ≥1 device is selected                                                                                                                 |
| `選択解除`                                                       | `:472`        | Clears the whole selection set                                                                                                                           |
| `一括状態変更`                                                   | `:474-476`    | Opens the dialog                                                                                                                                         |
| Dialog description `選択中 {n} 件の接続機器の状態を変更します。` | `:169`        | Echoes the selected count                                                                                                                                |
| `変更先状態` select, placeholder `状態を選択`                    | `:174-205`    | All 4 statuses, each with its colour dot; no default selection                                                                                           |
| 廃棄 warning box                                                 | `:209-214`    | `廃棄への変更は取り消しが困難です` / `廃棄に変更すると機器の利用制御が停止されます。`                                                                    |
| `変更理由` textarea (optional, max 1000)                         | `:217-223`    | Placeholder `変更理由や作業内容を入力`, `rows=3`, marked optional via `OptionalMark`; stored as the change note — no structured reason code is collected |
| `キャンセル`                                                     | `:226`        | Closes without applying                                                                                                                                  |
| Submit button                                                    | `:227-233`    | Label `変更を保存`, becomes `廃棄する` with destructive styling when 廃棄 is chosen; disabled until a status is selected                                 |

E-02 FR-010 §処理内容 restricts bulk update to **connected equipment only**; contact-control devices are explicitly excluded from it, which is one more reason the two screens are specified apart.

### Pagination

| UI element                                | Prototype ref      | Behaviour                                                                      |
| ----------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `全 {n} 件 / {p} ページ / {a}-{b} を表示` | `:638-640`         | Counts reflect the **filtered** result set                                     |
| Previous / Next                           | `:644-647,665-668` | Disabled (`pointer-events-none opacity-50`) at the first / last page           |
| Page numbers with ellipsis                | `:83-88,649-663`   | ≤7 pages → all shown; else windowed with `…` (leading, trailing, or both)      |
| `表示件数` select                         | `:672-682`         | 25 / 50 / 100 / 200 — **default 50** (`:269`); changing it returns to page 1   |
| Page clamping                             | `:306`             | Current page is clamped to the last available page when the result set shrinks |

---

## UI States

| State                | Trigger                                                                 | Rendering                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Data rendered**    | ≥1 device matches                                                       | 12-column table, current page only, abnormal rows escalated                                                                |
| **Empty — no data**  | Zero devices in scope, no filter and no keyword                         | `EmptyState variant="empty" entityLabel="機器"`, title `登録されている機器はありません`, **no** action button (`:571-589`) |
| **Empty — filtered** | Zero matches while ≥1 filter is non-default or the keyword is non-empty | `EmptyState variant="filtered"`, title `条件に一致する機器はありません`, plus a `条件をクリア` button                      |
| **Filter active**    | ≥1 filter non-default or keyword non-empty                              | `FilterResultBanner` above the table + active-count badge on the toggle + primary outline on each non-default select       |
| **Deep-linked 異常** | Page entered with `filterStatus="異常"`                                 | Locked `異常 — {n}件` chip; the 状態 filter is pinned and excluded from `条件をクリア`                                     |
| **Bulk selection**   | ≥1 row selected                                                         | Primary-tinted bulk bar between the filters and the table                                                                  |
| **Dialog blocked**   | Bulk dialog open, no status chosen                                      | Submit disabled                                                                                                            |
| **Dialog warning**   | 廃棄 chosen in the bulk dialog                                          | Destructive warning box; submit relabelled `廃棄する` in destructive styling                                               |
| **Loading**          | List fetch in flight (not represented in the prototype)                 | Table skeleton, per project convention (`DataTable isLoading`)                                                             |
| **Error**            | List fetch failed (not represented in the prototype)                    | Inline error message + `再試行` action, per project convention                                                             |

---

## API Contract (Backend Design)

The backend design at `https://api.dev.fitness-v2.okamoto-hd.com/docs` already models this screen as **API-103 (Connected Device Management)**. That tag is the whole contract for this spec; **API-104 (Relay Controller)** belongs to `008-controller-management` and is not consumed here.

| Screen capability             | Endpoint                                            | Notes                                                                                                                                                                                |
| ----------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-001 / FR-002 list & search | `GET /api/v1/admin/connected-devices`               | Query: `storeId`, `deviceType`, `status`, `q`, `page`, `limit`, `sort`, `order`. Returns `{ items, pagination }`. Logically-deleted rows excluded.                                   |
| FR-011 CSV export             | `GET /api/v1/admin/connected-devices/export`        | Same filter/sort params; returns `{ filename, rowCount, csv }` — an inline UTF-8-BOM CRLF string, synchronous.                                                                       |
| FR-010 bulk status update     | `PATCH /api/v1/admin/connected-devices/bulk-status` | Body `{ deviceIds[≤100], status, changedNote? }` — `changedReason` deliberately omitted (Q3). All-or-nothing by design and never chunked (Q5); each device gets its own history row. |
| SR-008 count badges           | `GET /api/v1/admin/connected-devices`               | Read `pagination.total` under the current store scope; no separate aggregate endpoint exists (A10).                                                                                  |
| Row → detail navigation       | `GET /api/v1/admin/connected-devices/{deviceId}`    | Owned by `006-equipment-detail`; listed here only as the navigation target.                                                                                                          |

**Enum mapping (API ⇄ prototype label)**

| Concept      | API value                                                                                            | Prototype label                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deviceType` | `entry_gate` / `exit_gate` / `hydrogen_water` / `body_composition` / `tanning` / `protein` / `other` | 入館ゲート / 退館ゲート / 水素水サーバー / 体組成計 / タンニングマシン / プロテインサーバー / その他 (`exit_gate` and the 入館ゲート rename: Session 2026-11-09) |
| `status`     | `normal` / `abnormal` / `under_maintenance` / `discarded`                                            | 正常 / 異常 / メンテナンス中 / 廃棄                                                                                                                              |
| `authMethod` | `member_scan` / `device_scan` / `none`                                                               | 会員読取型 / 機器読取型 / なし                                                                                                                                   |

All three enums are 1:1 with the prototype and with E-02 §機能の定義 — no semantic gap.

**Gaps between the screen and the API design** (each also listed in Q&A below)

| #   | Gap                                                                                                                                                                                                                                           | Impact                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `ConnectedDeviceDto` (list projection) carries no linked-contract data — `allowedPlanIds` / `allowedOptionIds` exist only on `ConnectedDeviceDetailDto`.                                                                                      | Column 12 `紐づき契約種別` cannot be populated from the list call — mocked, and raised with BE as a QA (Q6 resolution).                                                                |
| A2  | List rows carry `storeId` only — no `storeName` / `storeCode`.                                                                                                                                                                                | Store labels must be resolved from the store master (Y-02).                                                                                                                            |
| A3  | `sort` accepts only `deviceType` / `name` / `installedOn` / `updatedAt`; the screen sorts 11 columns, and its default key is `id`.                                                                                                            | 8 of 11 sortable columns, including the default, are unsupported.                                                                                                                      |
| A4  | `limit` maximum is 100; the `表示件数` selector offers 200.                                                                                                                                                                                   | The 200 option would be rejected.                                                                                                                                                      |
| A5  | `q` matches name / serial / location only — device ID is not searchable, but the input promises `機器ID`.                                                                                                                                     | Searching by ID silently returns nothing.                                                                                                                                              |
| A6  | Response descriptions reference `includeDiscarded=true`, but no such query parameter is declared, while `status=discarded` is an accepted filter value.                                                                                       | Unclear whether the 廃棄 filter can ever return rows. **Decision (2026-09-08)**: the mock lists 廃棄 rows unconditionally, matching the prototype; the contradiction is a BE question. |
| A7  | Bulk update takes `changedReason` as a **closed enum** (`install` / `fault_report` / `maintenance_start` / `maintenance_complete` / `disposal`) plus free-text `changedNote`; the dialog offers only one free-text field labelled `変更理由`. | Resolved by design: `changedReason` is omitted (optional), textarea → `changedNote`.                                                                                                   |
| A8  | Bulk update rejects the **entire batch** (422 `E-DEV-005`) if any selected device already holds the target status; the dialog lets any status be chosen for a mixed selection.                                                                | Resolved by design: no-op devices are filtered out client-side before the call. The mock enforces the 422 as of 2026-09-08, so the guard is contract-tested rather than assumed.       |
| A9  | Device `id` is a UUID; the prototype shows a 3-digit sequential `接続機器ID` and FR-003 says the ID is system-assigned (自動採番).                                                                                                            | Display format for the ID column is undecided.                                                                                                                                         |
| A10 | No aggregate/summary endpoint exists for the header and tab count badges.                                                                                                                                                                     | Mock keeps a `/crm/equipment/summary` endpoint with no design-doc counterpart (Session 2026-09-07); against the real API the count comes from `pagination.total`.                      |

**Mock alignment decisions (Session 2026-09-07)**

| Aspect            | Decision                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Enum values       | Connected equipment adopts API-103 exactly (`normal` / `abnormal` / `under_maintenance` / `discarded`; `entry_gate` / `exit_gate` (added 2026-11-09) / `hydrogen_water` / `body_composition` / `tanning` / `protein` / `other`; `member_scan` / `device_scan` / `none`). |
| Status enum scope | **Split** — contact-control devices no longer share the equipment status enum; they keep their own value set so `008-controller-management` is unaffected.                                                                                                               |
| Field names       | The mock adopts the design doc's camelCase names, including `location` (was `install_location`), `note` (was `remarks`) and `relayControllerId` (was `controller_id`).                                                                                                   |
| List vs detail    | `接点制御先番号` exists on the **detail** projection only — it is not in FR-001 §表示項目, and the prototype shows it on the detail screen and nowhere else.                                                                                                             |
| Count badges      | `/crm/equipment/summary` is kept as a **mock-only** endpoint with no design-doc counterpart, because the shared tab bar reads both counts from it (A10).                                                                                                                 |
| CSV export        | `GET` returning `{ filename, rowCount, csv }` per the design doc; the client assembles the download from the `csv` string.                                                                                                                                               |

**Mock alignment decisions (Session 2026-09-08)**

| Aspect                     | Decision                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `QRコードID`               | **Deleted** from the detail projection, the seed and the detail screen — absent from both the prototype and API-103. (Supersedes the 2026-09-07 decision to park it on the detail.)                                                                                                                                                  |
| `接点制御先番号`           | No longer accepted from the client: **assigned server-side** as the next free contact port on the chosen controller. The prototype form never asks for it and API-103 declares no field.                                                                                                                                             |
| Store of a device          | **Derived from `relayControllerId`** (design doc §6.1) on create, and re-derived when the controller is re-pointed on edit; `storeId` is never accepted from the client.                                                                                                                                                             |
| Create/update requiredness | `authMethod` and `relayControllerId` are **required**, matching `CreateConnectedDeviceDto` and the prototype form's required marks (they were nullable-with-default before).                                                                                                                                                         |
| Status history projection  | Field names adopt API-103: `historyId`, `previousStatus`, `newStatus`, `changedReason`, `changedNote`, `changedBy{staffId,name}`, `changedAt`. The `eventType` flag is dropped — the install row is the one with a null `previousStatus`. The envelope stays a flat `{ history }` because the prototype's 変更履歴 tab has no pager. |
| Status writes              | Every status transition (single or bulk) appends a history row, with `changedReason` derived from the target status; a no-op transition is refused with **422** (design doc §6.4).                                                                                                                                                   |
| Count badges (scope)       | Both counts follow the header store scope. The controller seed's `store_code` space (`S-001`…) is mapped to store ids inside `equipment.seed.ts` rather than changing `008`'s seed.                                                                                                                                                  |
| 種別 option lists          | サービス種別 uses the prototype's single G-02 list (プロテイン / サプリメント / 日焼け / コラーゲン / 水素水 / 体組成計 / シャワー); the separate オプション種別 / 都度オプション種別 axes are gone (FR-008 v2, 2026-09-10).                                                                                                         |

**Divergence in the already-shipped project code** (`src/app/api/_schemas/equipment.schema.ts`, `src/app/(private)/(equipment-management)/equipment/`): the current mock contract and table differ from both the prototype and the API design — status `error` instead of `abnormal`, `hydrogen_water_server` / `body_composition_monitor` / `tanning_machine` / `protein_server` instead of the API's shorter values, `member_qr_scan` / `device_qr_scan` instead of `member_scan` / `device_scan`, and an 8-column table (`接続機器ID`, `接続機器名`, `制御接点番号`, `QRコードID`, `機器タイプ`, `ステータス`, `更新日時`) instead of the prototype's 12. **Decision (Session 2026-09-07)**: this spec supersedes the shipped screen. The list migrates to the prototype's 12 columns in the prototype's order; `制御接点番号`, `QRコードID` and `更新日時` are removed from the list (none appears in FR-001 §表示項目); and the wire enums adopt API-103's spellings behind the prototype's Japanese display labels.

**Divergences that remain on purpose (Session 2026-09-08)** — both live in shared components, so changing them would move every list screen in the project, not just this one:

| Element           | Prototype                                   | This project                                                        | Why it stands                                                                                                |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 店舗 filter       | plain 160px `Select` over accessible stores | shared searchable store select (`SearchableSelect`, `w-64`)         | The real store master is paged and searched server-side; every other list screen uses this control (PAR029). |
| Pagination footer | always rendered, even for a single page     | hidden when everything fits on one page (`TablePaginationWithSize`) | The project's shared GUI checklist requires hiding it below one page; applies to all lists (PAR100–PAR112).  |

---

## User Scenarios & Testing

### User Story 1 — Find a device during a fault call (Priority: P1)

A member reports the hydrogen-water server is dead. The staff member opens 店舗機器管理, types part of the device name or the serial printed on the unit, and reads back its serial, IP, location and current status to the support line.

**Why this priority**: This is the screen's core job and the reason E-02 lists FR-001 and FR-002 as Must. Without it there is no screen.

**Verification**: Open the connected-equipment tab, type a partial serial, confirm the table narrows to matching rows and every FR-001 display field is legible.

**Acceptance Scenarios**:

1. **Given** devices exist for the current store scope, **When** the screen loads, **Then** the table lists them with all 12 columns in the specified order, sorted by 登録日時 descending (newest first; updated 2026-10-22), 50 rows per page.
2. **Given** the list is displayed, **When** the user types a partial device name, serial number, installation location or device ID, **Then** only matching rows remain and the result banner reports matched count against the unfiltered total.
3. **Given** a keyword is active, **When** the user also picks 機器タイプ `水素水サーバー` and 状態 `異常`, **Then** all three conditions apply together (AND) and the filter badge reads `2`.
4. **Given** filters are active, **When** the user clicks `条件をクリア`, **Then** keyword, store and device-type filters reset, the banner disappears and the full scoped list returns to page 1.
5. **Given** a device has no IP or MAC recorded, **When** its row renders, **Then** those cells show `—` rather than an empty cell.
6. **Given** the user's scope is a single store, **When** the filter panel is opened, **Then** the 店舗 select is not rendered at all.

---

### User Story 2 — Triage abnormal equipment (Priority: P1)

A head-office user follows a dashboard alert into this screen and needs the abnormal devices, already filtered, without re-specifying anything.

**Why this priority**: Abnormal-state escalation is the operational trigger that makes the list worth opening daily, and the deep-link path is wired in the prototype.

**Verification**: Enter the screen with the 異常 deep link and confirm only abnormal rows appear, escalated, with the count chip matching the row count.

**Acceptance Scenarios**:

1. **Given** the screen is entered with the 異常 deep link, **When** it loads, **Then** only 異常 devices are listed and a chip reads `異常 — {n}件` where `{n}` equals the matched row count.
2. **Given** the 異常 deep link is active, **When** the user clicks `条件をクリア`, **Then** keyword / store / device-type filters reset but the 異常 restriction stays in force.
3. **Given** any list state, **When** a row's status is 異常, **Then** that row renders with the destructive tint and the 4px inset left marker.
4. **Given** a row is displayed, **When** the user clicks anywhere on it except its checkbox, **Then** the connected-equipment detail screen for that device opens.

---

### User Story 3 — Bulk status change before a maintenance sweep (Priority: P2)

Before a scheduled maintenance visit, a staff member selects the affected devices and moves them all to メンテナンス中 in one action, noting why.

**Why this priority**: FR-010 is a Should-tier efficiency requirement — valuable, but the screen is already usable without it via per-device status changes on the detail screen.

**Verification**: Select several rows, open `一括状態変更`, pick a status, save, and confirm every selected row shows the new status.

**Acceptance Scenarios**:

1. **Given** no rows are selected, **When** the list renders, **Then** no bulk action bar is shown.
2. **Given** at least one row is selected, **When** the bar appears, **Then** it reports `{n}件選択中` and offers `選択解除` and `一括状態変更`.
3. **Given** the header checkbox is clicked, **When** the current page is not fully selected, **Then** every row **on the current page** becomes selected and rows on other pages are untouched.
4. **Given** some rows on the page are selected, **When** the header checkbox renders, **Then** it shows the indeterminate state.
5. **Given** the bulk dialog is open, **When** no 変更先状態 has been chosen, **Then** the submit button is disabled.
6. **Given** 廃棄 is chosen, **When** the dialog re-renders, **Then** the irreversibility warning appears and the submit button reads `廃棄する` in destructive styling.
7. **Given** a status and an optional reason are entered, **When** the user submits, **Then** every selected device not already in that status moves to it, the dialog closes and the selection clears.
8. **Given** a mixed selection where some devices already hold the chosen status, **When** the user submits, **Then** those devices are omitted from the request and the remaining ones are updated successfully.
9. **Given** every selected device already holds the chosen status, **When** the user submits, **Then** no update is performed and the user is told no device needed changing.
10. **Given** the user clicks `キャンセル`, **When** the dialog closes, **Then** no device status changes and the selection is preserved.
11. **Given** the user lacks equipment-write permission, **When** the list renders, **Then** the bulk status action is not available to them.
12. **Given** devices are selected across two pages, **When** the user narrows the filter so some of them no longer match, **Then** only the still-matching devices remain selected and the selected count updates accordingly.
13. **Given** devices are selected, **When** the user switches the header store scope, **Then** devices outside the new scope are dropped from the selection.
14. **Given** more than 100 devices are selected, **When** the user submits the status change, **Then** the operation is refused as a whole and the user is asked to reduce the selection below 100.

---

### User Story 4 — Export the equipment ledger (Priority: P3)

A manager exports the device ledger to work through it offline or attach it to a maintenance contract.

**Why this priority**: FR-011 is Could-tier; it is a convenience over data the screen already shows.

**Verification**: Apply a filter, click `CSV出力`, and confirm the downloaded file contains exactly the filtered rows.

**Acceptance Scenarios**:

1. **Given** an authorised user, **When** they click `CSV出力`, **Then** a CSV of the devices matching the current filter and sort is delivered, opening in Excel without character corruption.
2. **Given** a Trainer, **When** the page header renders, **Then** `CSV出力` is unavailable and explains why (`CSV出力の権限がありません`).
3. **Given** an Observer, **When** the page header renders, **Then** `CSV出力` is available but `接続機器を登録` is refused with `権限なし`.

---

### Edge Cases

- **No devices at all in scope** → `登録されている機器はありません` with no clear-filter button (FR-001 §異常系).
- **Filters match nothing** → `条件に一致する機器はありません` plus `条件をクリア` (FR-002 §異常系).
- **Result set shrinks below the current page** (filter applied while on page 5) → the view clamps to the last existing page rather than showing a blank table.
- **Selection spans pages, then filters change** → ids still present in the new result set stay selected; ids filtered out are dropped, so the bulk count never reports devices the user can no longer see (Session 2026-09-07).
- **Bulk target status equals the status some selected devices already hold** → those devices are dropped from the request before it is sent, so the remaining ones still succeed (Session 2026-09-07).
- **Every selected device already holds the target status** → nothing is sent; the dialog closes and reports that no device needed changing.
- **Bulk selection exceeds 100 devices** → the request is sent whole and rejected; the screen tells the user to reduce the selection below 100 and retry. The batch is never split into chunks (Session 2026-09-07).
- **Store scope switched in the shared header while filters are active** → the list re-scopes, the in-panel 店舗 filter unmounts, the count badge follows the new scope, and the selection is pruned to the newly-scoped result set — so devices from the previous store can never be swept up in a bulk action.
- **Devices with status 廃棄** → selectable in the 状態 filter, but whether the API returns them is unresolved (A6).
- **Null IP / MAC / location / install date** → `—` for IP and MAC per the prototype; the API also allows `location` and `installedOn` to be null, which the prototype's type does not. Apply the same `—` fallback.
- **Trainer reaches the URL directly** → no view permission on either tab; the screen must not render device data.

---

## Requirements

### Functional Requirements (Phase 1)

Requirement IDs mirror E-02's numbering. `SR-xxx` are screen-level requirements read off the prototype that E-02 does not enumerate explicitly.

- **FR-001**: System MUST display the connected devices in the user's current store scope as a paginated table with these 12 columns in this order: selection checkbox, 接続機器ID, 接続機器名, 機器タイプ, シリアルナンバー, IPアドレス, MACアドレス, 設置場所, 設置日, 状態, 認証方式, 紐づき契約種別. Under the 全店舗 header scope the system MUST additionally render a 店舗 column between 接続機器名 and 機器タイプ (Session 2026-09-10); under a single-store scope that column MUST NOT be rendered. Status MUST render as a coloured badge (正常=success, 異常=destructive, メンテナンス中=info, 廃棄=muted), abnormal rows MUST be visually escalated, and unrecorded IP / MAC values MUST render as `—`. The 紐づき契約種別 column MUST render one badge per judgment using the prototype's labels verbatim — `主契約` and `サービス種別（○○）`, one badge per selected service type (Session 2026-09-10). The list MUST NOT carry columns absent from FR-001 §表示項目 — specifically `制御接点番号`, `QRコードID` and `更新日時` are excluded (Session 2026-09-07). When no device exists in scope the screen MUST show `登録されている機器はありません`.
- **FR-002**: System MUST let users narrow the list by keyword (partial match over 接続機器ID, 接続機器名, シリアルナンバー, 設置場所), 機器タイプ (select), 状態 (select) and — in multi-store scope only — 店舗 (select), combining all conditions with AND (機器タイプ includes エリア扉 — Session 2026-11-19). Active filters MUST be summarised in a result banner reporting matched count against the scoped total, with a one-click clear; when nothing matches the screen MUST show `条件に一致する機器はありません` and offer `条件をクリア`.
- **FR-010**: System MUST let authorised users select multiple connected devices and move them to a single new status in one operation, capturing an optional free-text reason (max 1000 characters) that is stored as the change note. No structured reason code is collected. Before submitting, the system MUST exclude any selected device that already holds the target status, so a mixed selection never fails wholesale; if that leaves nothing to change, no update is performed and the user is told no device needed changing. When more than 100 devices remain to be changed, the operation MUST be refused as a whole with a message asking the user to reduce the selection below 100 — the system MUST NOT split the batch, so a status sweep is never half-applied. Choosing 廃棄 MUST surface an irreversibility warning and relabel the confirm action to `廃棄する`. The action MUST be unavailable to roles without equipment-write permission, and MUST NOT be offered on the contact-control device tab (E-02 FR-010 §処理内容).
- **FR-011**: System MUST let authorised users export the devices matching the current filter and sort as a CSV that opens in Excel without character corruption. Availability MUST follow E-02 §権限マトリクス (Observer allowed, Trainer denied).
- **SR-008**: The screen MUST render under the 店舗機器管理 header with a connected-equipment count badge for the current store scope, its own `接続機器一覧` tab trigger carrying that same count, and a `新規登録` entry offering `接続機器を登録`. The contact-control device tab trigger and its `接点制御装置を登録` entry are specified by `008-controller-management`, not here.

- **SR-001**: Every data column MUST be sortable, with the active column flipping direction on re-click, a different column switching key and resetting to ascending, and either action returning to page 1. Default order MUST be 登録日時 (`createdAt`) descending — newest first; this key has no column, so no header shows a sort indicator, and clearing a column's sort returns to it. _(Updated 2026-10-22; was 接続機器ID ascending — Session 2026-10-22.)_
- **SR-002**: Pagination MUST offer 25 / 50 / 100 / 200 rows per page (default 50), report `全 {total} 件 / {pages} ページ / {from}-{to} を表示` over the filtered set, disable previous/next at the ends, elide long page ranges, and clamp the current page when the result set shrinks.
- **SR-003**: Select-all MUST apply to the current page only and MUST show an indeterminate state when the page is partially selected. Selections MUST be keyed by device id (never by row position) and MUST survive paging. After any search, filter or store-scope change, the selection MUST be pruned to the device ids present in the newly-arrived result set, and that pruning MUST happen only once the new data has arrived — never against the previous page still held for continuity. No cap is placed on how many devices may be selected.
- **SR-004**: The screen MUST accept an entry state that pre-filters to 異常, displaying a count chip and pinning the status filter so `条件をクリア` does not release it. The entry state is the URL search param `equipment_filter=abnormal` (`/equipment?equipment_filter=abnormal`) — the address callers such as a dashboard fault alert link to; while it is present the 状態 select renders 異常 disabled, and dismissing the chip removes the param and returns the full scoped list.
- **SR-005**: Clicking a row MUST open that device's detail screen; clicking its checkbox MUST toggle selection without navigating.
- **SR-006**: Store scope MUST follow the shared header selector — a single-store scope restricts the data and removes the in-panel 店舗 filter; header and tab count badges MUST reflect the scope, unaffected by search or filters.
- **SR-007**: The screen MUST show a table skeleton while the list is being fetched, and on failure an inline error message with a 再試行 action, matching the project's other list screens.

### Key Entities

- **Connected device (接続機器)**: A device wired to a contact-control unit whose use is gated by member contracts. Attributes: system-assigned ID, name, device type (entry gate / hydrogen-water server / body-composition monitor / tanning machine / protein server / other), serial number, optional IP and MAC address, installation location, installation date, status (正常 / 異常 / メンテナンス中 / 廃棄), authentication method (会員読取型 / 機器読取型 / なし), the contract types that permit start-up, and an internal note. Belongs to exactly one store and hangs off one contact-control unit.
- **Contact-control device (接点制御装置)**: The control unit a device connects to. Referenced only as the parent a connected device belongs to; the entity and every screen over it are owned by `008-controller-management`.
- **Store (店舗)**: Scope boundary for the list and the source of store labels in the filter. Owned by Y-02.
- **Status change record**: The audit entry a status change produces (operator, timestamp, from/to status, optional reason). Written by the bulk action here; displayed by `006-equipment-detail` (FR-012).
- **Usage-control rule (利用制御ルール)**: The conditions that permit device start-up, expressed as the two judgment axes `007-equipment-form` FR-008 specifies — 主契約判定 and サービス種別判定 (課金種別 is not an axis) — combined with OR semantics. Summarised in the 紐づき契約種別 column; configured in `007-equipment-form`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A staff member can locate a specific device by serial number, name or location in under 15 seconds from screen load, without paging manually.
- **SC-002**: Every field E-02 FR-001 §表示項目 lists is readable on the list screen without opening a detail page — 11 of 11 data columns present, in the specified order.
- **SC-003**: A user entering via the 異常 deep link sees only abnormal devices on first paint, with a count chip matching the row count exactly.
- **SC-004**: A staff member can move 10 devices to メンテナンス中 in under 60 seconds, including entering a reason, and all 10 rows reflect the new status afterwards.
- **SC-005**: 100% of bulk status changes are attributable — each affected device carries an audit entry with operator, timestamp, from/to status and the reason entered.
- **SC-006**: Choosing 廃棄 in the bulk dialog always requires passing an explicit irreversibility warning; zero accidental 廃棄 transitions in UAT.
- **SC-007**: Users without equipment-write permission (Observer, Trainer) can complete no write action from this screen, and Trainers see no device data at all.
- **SC-008**: An exported CSV opens in Excel with correct Japanese characters and contains exactly the rows matching the filter in force at export time.
- **SC-009**: Filtering, sorting and paging never leave the user on a blank page — an emptied result set always shows the matching empty-state message with a way back.

---

## Assumptions

- **Phase attribution**: E-02 as a whole is Phase 1 (`Phase-Scope.md:37`), so the Should-tier FR-010 and Could-tier FR-011 present in the prototype are treated as in-scope Phase 1 rather than deferred.
- **Requirement partition**: E-02's other FRs are already specified (`006-equipment-detail`, `007-equipment-form`, `008-controller-management`); this spec covers only FR-001 / FR-002 / FR-010 / FR-011 plus the connected-equipment page chrome (SR-008), and does not restate them. The prototype's single-file packaging of both lists is deliberately not mirrored — see §Separation.
- **Routing**: The two-tab 画面構成 is realised as a shared route-group layout over `/equipment` and `/controllers`, per the decision already recorded in `008-controller-management`. This screen occupies the `/equipment` slot only; the tab bar is shared layout owned by neither spec.
- **Backend contract**: API-103 in the dev Swagger is the authoritative contract for this screen (API-104 belongs to `008-controller-management`). Where a field the screen needs is missing (A1–A10), the mock layer supplies it and the gap is reported to BE rather than dropping the UI element (project convention: back-end gaps are mocked, not treated as blockers).
- **Label mapping**: The three API enums map 1:1 onto the prototype's Japanese labels as tabulated above; display labels follow the prototype.
- **Store labels**: Accessible stores and the current scope come from the authenticated user context, as in the prototype's `useCurrentUser()`; store names are resolved via the store master (Y-02), not returned by the device list.
- **Sorting semantics**: The prototype's client-side string sort is a mock stand-in; the shipped screen sorts server-side via `sort` + `order`, subject to Q2.
- **Optional reason**: The bulk dialog's `変更理由` is optional (`OptionalMark`) and capped at 1000 characters, matching the API's `changedNote` limit.
- **Selection lifecycle**: Implemented on the pattern already established by A-02 transfer management (`src/app/(private)/members/transfers/page.tsx:137-176`) — id-keyed selection pruned against freshly-arrived data — rather than a new mechanism invented for this screen.
- **Textual copy**: All Japanese labels, placeholders, tooltips, empty-state titles and warning copy are taken verbatim from the prototype and are normative.
- **Deleted devices**: Logically-deleted devices never appear (API-103 excludes them); 廃棄 is a status, not a deletion.

---

## Q&A / Clarification Needed

Clarification session **2026-09-07** closed. Five questions were **answered by the user** — Q5 (column set), Q6 (linked-contract labels), Q3 (bulk reason & no-op batches), Q4 (selection lifecycle), and one new question on batch-size overflow; all five decisions are recorded in §Clarifications. The remaining eight were **deferred with their recorded default adopted**, so nothing here blocks `/speckit.plan`. A1–A10 in §API Contract are the mechanical API gaps, repeated below only where they needed a product decision.

> Re-run `/speckit.clarify` after `/speckit.plan` if any deferred default proves wrong in implementation.

| #       | Topic                                         | Context                                                           | Question                                                                                                                                                                                                            |
| ------- | --------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~Q1~~  | ~~Loading & error states~~                    | **Deferred — recorded default adopted** (Session 2026-09-07)      | What should the list show while loading and when the fetch fails — a table skeleton + inline error with `再試行`, matching the project's other list screens?                                                        |
| ~~Q2~~  | ~~Sortable columns vs API support~~           | **Deferred — recorded default adopted** (Session 2026-09-07)      | Do we ask BE to widen the `sort` enum to the 11 prototype columns, or drop sort affordances from the unsupported columns and change the default order to `deviceType`?                                              |
| ~~Q3~~  | ~~Bulk change reason & no-op batches~~        | **Resolved** (Session 2026-09-07)                                 | Keep the prototype's single textarea → `changedNote`; omit `changedReason`; pre-exclude no-op devices client-side so 422 `E-DEV-005` is unreachable                                                                 |
| ~~Q4~~  | ~~Selection limits & cross-page persistence~~ | **Resolved** (Session 2026-09-07)                                 | Follow the A-02 transfer pattern — id-keyed, preserved across paging, pruned to the new result set after any search/filter/scope change once fresh data arrives; no selection cap                                   |
| ~~Q5~~  | ~~Existing implementation vs prototype~~      | **Resolved** (Session 2026-09-07)                                 | Follow the prototype exactly — 12 columns in prototype order, drop `制御接点番号` / `QRコードID` / `更新日時`; wire values per API-103                                                                              |
| ~~Q6~~  | ~~紐づき契約種別 column semantics~~           | **Resolved** (Session 2026-09-10)                                 | Prototype's labels verbatim — `主契約` / `サービス種別（○○）` (FR-008 v2; the 2026-09-07 "keep three billing labels" answer is superseded). Source field still missing from the list projection (A1) → mock + BE QA |
| ~~Q7~~  | ~~Bulk action role gating~~                   | **Deferred — recorded default adopted** (Session 2026-09-07)      | Confirm Observers see the checkboxes but cannot submit — or should selection checkboxes be hidden from read-only roles entirely?                                                                                    |
| ~~Q8~~  | ~~異常 chip dismissal~~                       | **Deferred — recorded default adopted** (Session 2026-09-07)      | Should the `X` release the 異常 restriction and return to the full list, or is the chip purely informational (in which case remove the `X`)?                                                                        |
| ~~Q9~~  | ~~廃棄 devices in the list~~                  | **Deferred — recorded default adopted** (Session 2026-09-07)      | Should discarded devices be listed by default, only when explicitly filtered, or never? If filterable, BE must expose the parameter.                                                                                |
| ~~Q10~~ | ~~接続機器ID display format~~                 | **Resolved** (Session 2026-10-12) — short UUID, ID search via `q` | Is there a human-facing device number distinct from the UUID, or should the column show the UUID (possibly truncated)?                                                                                              |
| ~~Q11~~ | ~~Count badge source~~                        | **Deferred — recorded default adopted** (Session 2026-09-07)      | Confirm the count derives from the list's `pagination.total` under the current store scope, or should BE add a summary endpoint?                                                                                    |
| ~~Q12~~ | ~~200-row page size~~                         | **Deferred — recorded default adopted** (Session 2026-09-07)      | Drop the 200 option, or ask BE to raise the `limit` ceiling?                                                                                                                                                        |

### Defaults adopted for the deferred questions

These are the decisions planning will proceed on — chosen so the prototype wins on presentation and the API wins on contract. Bold rows were deferred (default adopted, not user-confirmed); struck-through rows were explicitly answered.

| #       | Default                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------- |
| **Q1**  | Table skeleton while loading; inline error + `再試行` on failure, matching the project's other list screens.         |
| **Q2**  | Keep all 11 sort affordances, request the widened `sort` enum from BE, and mock the unsupported keys until it ships. |
| ~~Q3~~  | **Resolved** — prototype dialog unchanged; no-op devices filtered out before the call (Session 2026-09-07).          |
| ~~Q4~~  | **Resolved** — A-02 pruning pattern, no cap (Session 2026-09-07).                                                    |
| ~~Q5~~  | **Resolved** — prototype's 12 columns, API-103 wire values (Session 2026-09-07).                                     |
| ~~Q6~~  | **Resolved** — prototype's three labels verbatim (Session 2026-09-07); still mocked until A1 is closed.              |
| **Q7**  | Checkboxes visible to all viewers, submit gated on equipment-write permission (matches the shipped behaviour).       |
| **Q8**  | Treat the `X` as a dismissal that releases the 異常 pin and returns to the full scoped list.                         |
| **Q9**  | Exclude 廃棄 by default, include only when explicitly filtered; raise the missing parameter with BE.                 |
| ~~Q10~~ | **Resolved 2026-10-12** — short UUID (tail 8 chars, full in tooltip); 機器ID search via API-103 `q`.                 |
| **Q11** | Derive the count from the connected-device list's `pagination.total` under the current store scope.                  |
| **Q12** | Keep the 200 option in the UI and raise the `limit` ceiling with BE; clamp to 100 until it ships.                    |
