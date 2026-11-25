# Feature Specification: E-02 Connected Equipment Detail

**Feature Branch**: `006-equipment-detail`  
**Created**: 2026-06-24  
**Status**: Clarified  
**PO Spec**: `E-02` — 店舗機器管理 (Store Equipment Management)  
**Source**: `.cache/fitness-crm-ui/src/pages/equipment-detail.tsx` + `.cache/fitness-crm-ui/public/requirements/E-02.md`  
**Input**: User description: "Create spec for screen E-02 店舗機器管理 (Equipment Page Management) — Phase 1 scope: FR-004, FR-006, FR-012, connected equipment status change"

---

## Clarifications

### Session 2026-06-24

- Q: Should Phase 1 hide the 編集 button entirely, or show disabled with tooltip until FR-005 is implemented? → A: **Show disabled** with tooltip for all users in Phase 1 (FR-005 navigation not wired).
- Q: When should staff use status 廃棄 vs delete? Can both actions apply to the same device? → A: **Independent actions** — delete is allowed at any status; setting 廃棄 is optional and does not block delete.
- Q: What copy and actions for not-found / fetch-error states? → A: **Revised (align with project detail pages)**: API failures including **404** use the same error UI — `接続機器の取得に失敗しました。` + **再試行**; user returns to list via **PageHeader** back link (`接続機器`).
- Q: Should saving without changing status be blocked or allowed? → A: **Exclude current status** from the 新しいステータス select options — the dropdown lists only the 3 statuses other than the current one; same-status selection is impossible.
- Q: Are history summary metrics (直近1年の対応, 平均対応間隔) required for Phase 1 FR-012? → A: **Table only** — omit summary footer; the 4-column history table satisfies FR-012.

### Session 2026-11-09 — entry/exit gate split (機器タイプ 退館ゲート)

- Q: Stores now install separate physical gates for check-in and check-out — how is that modelled? → A: **A new 機器タイプ** (user request, 2026-11-09). API-103 `deviceType` gains **`exit_gate`** and `entry_gate` becomes check-in only. Labels: `entry_gate` 入退館ゲート → **入館ゲート**, `exit_gate` → **退館ゲート** — 7 types, in this order: 入館ゲート / 退館ゲート / 水素水サーバー / 体組成計 / タンニングマシン / プロテインサーバー / その他 (the BE CSV exports use the same labels).
  - **Backend (API-108 gate judgment, fitness-backend-v2):** the member's position comes from their gate state — the last allowed gate event at the store within 24 h (入館 / 同伴入館 = inside, 退館 or none = outside). An `entry_gate` refuses a member who is already inside (`denied_duplicate`, 二重入館) and otherwise runs the usual guard chain; an `exit_gate` lets an inside member out unconditionally and refuses one who is outside (`denied_other`, detail `not_inside`). Gate terminal messages are unchanged (both refusals show the generic 「ご利用いただけません。スタッフにお声かけください」).
  - **Detail screen:** the 機器タイプ badge shows the new labels. The 利用制御ルール card's ゲートストップ条件 box stays **入館ゲート only**, now worded 「入館ゲートの場合: ブラックリスト登録済み / 未納（滞納） / 家族会員利用中」; a 退館ゲート shows no box. The QR sticker modal works the same for both gates.
  - **Test cases:** E-02-B TC-011 / TC-027 reset to Untested; TC-158, TC-159 added.

### Session 2026-11-03 — QR sticker modal (reverses the 2026-09-08 QRコードID removal)

- Q: Members unlock gates and option devices by scanning a sticker (`<brand>://x-callback-url/unlock?major=<club code>&minor=<qrId>`), but no CRM screen shows or sets `qrId`. Show it? → A: **Added**, on the user's request, as a **QRコード** button in the header (before 削除 / 編集). The button opens a QRコード modal; it is not permission-gated, because anyone who can open the detail can view the QR.
  - **Sticker scheme and club code:** the scheme is `store.brandGroup` lower-cased (`joyfit` / `fit365`), and `major` = `store.clubCode` (Y-02 店舗マスタ クラブコード). `minor` = the device's `qrId`, an integer 1–2147483647, unique among the store's live devices. API-103 detail now returns `store.clubCode` / `brandEnum` / `brandGroup`, and the ready-built sticker text as `qrPayload` (null when no number is issued or the store is unresolved). The API owns the format; the CRM renders `qrPayload` as-is and does not build it.
  - **Header button:** `QRコード` (outline, QR icon) is the first header action, before `削除` / `編集`.
  - **Modal:** title `QRコード`, description = the device's 機器名 (long names wrap; the modal does not widen). It closes with `閉じる`, the × button or Esc.
  - **No `qrId`:** the modal shows `QRコード未発行` and a **`QRコードを発行`** button. It issues a number right away, with no confirmation: toast `QRコードを発行しました`, the QR appears in the same modal, and the button becomes `QRコードを再発行`.
  - **With `qrId`:** the modal shows:
    - the QR. The payload text is **not** shown and there is no copy button; hovering the QR shows the payload as a tooltip.
    - **`ダウンロード`** with two buttons: **`PNG`** saves `{機器名}_QR_{qrId}.png`, **`SVG`** saves `{機器名}_QR_{qrId}.svg` (vector, for printing at any size). Both decode to the same sticker text.
    - the footer buttons `閉じる` and **`QRコードを再発行`**.
  - **Reissue warning:** `QRコードを再発行` opens a confirmation dialog:
    - title `QRコードを再発行しますか？`
    - text `現在のQRコードは無効になり、印刷済みのステッカーは使用できなくなります。`
    - buttons `キャンセル` / `再発行する` (destructive)
    - `キャンセル` keeps the current number. `再発行する` replaces it: toast `QRコードを再発行しました`; the dialog closes; the modal stays open and shows the new QR. A sticker printed with the old number no longer unlocks the device.
  - **Store not resolvable** (no club code or brand): the modal shows `店舗のクラブコードまたはブランドを取得できないため、QRコードを表示できません。` and no QR or download.
  - **Errors:** a failed issue shows the shared error toast and keeps the modal open with the number unchanged. If the device was deleted meanwhile (404 `E-DEV-001`), the modal closes and the screen returns to `/equipment`.
  - **Backend:** both buttons call `POST /api/v1/admin/connected-devices/{deviceId}/qr-id`, which assigns a random number free in the store. Write roles only (Observer / Trainer → 403 `E-DEV-101`); a device outside the caller's store scope → 404 `E-DEV-001`.
  - **Permissions:** viewing the modal and downloading the PNG are open to every role that can open the detail. `QRコードを発行` / `QRコードを再発行` need `EquipmentEdit`; without it they are disabled with the tooltip `QRコード発行権限がありません`.
  - **Not in the prototype or the E-02 FR** (user request, 2026-11-03). This is the device QR sticker (会員読取型: the member scans the QR on the device). It is a different QR from the member's one-time QR in E-02 :144 / :239 (#173), which the member shows to the reader.
  - **Test cases:** E-02-B TC-004 (header order) and TC-118 onward. TC-010 still holds: no `QRコードID` label is shown.

### Session 2026-11-07 — QR sticker events in 変更履歴

- Q: Issuing or re-issuing the QR sticker number changes how members open the device, but nothing records who did it or when. Record it? → A: **Recorded** in the 変更履歴 tab (FR-012), on the user's request.
  - **Backend:** API-103 writes a history row for every sticker-number move, with no new field: `changedReason` = `qr_create` (no number → number: `QRコードを発行`, or a device registered with a number) or `qr_change` (number → another number: `QRコードを再発行`). `changedBy` is the operator and `changedAt` the time. The status does not move, so `previousStatus` = `newStatus` = the device's current status, and the row is never taken for the install row. Clearing the number (API-only; no CRM action) writes no row.
  - **Table:** 日時 and 操作者 as for every row. ステータス変化 shows one badge (QR icon) — **`QRコード発行`** / **`QRコード再発行`** — instead of a from → to transition. 変更理由 shows `—` (no memo on these rows).
  - **Refresh:** after 発行 / 再発行 in the QRコード modal the 変更履歴 tab refetches, so the new row appears without a reload.

### Session 2026-09-08 — prototype & API-design alignment

Re-checked against the latest prototype (`dx-fitness/fitness-crm-ui@1bad949` → `src/pages/equipment-detail.tsx`, last changed `65f1244`) and the backend design doc (`.cache/api/openapi.json` → `Admin - Connected Device Management (API-103)`). Where the two disagree, the prototype wins.

- Q: `QRコードID` appears on the detail screen but in neither the prototype nor API-103 — keep it? → A: **Removed** from the screen, the detail projection and the mock seed. Nothing in E-02 lists it as a display item.
- Q: 備考 is an FR-003 registration item the prototype shows read-only on the detail, but the screen omitted it — add it? → A: **Added** as a full-width row at the end of 接続機器情報, `—` when unset. It maps to API-103's detail-only `note`.
- Q: 接点制御装置 card showed a single `装置名` row rendering `装置ID: {id}` — is that right? → A: **Split into two rows** (装置ID, 装置名), as the prototype renders them; FR-007 treats them as separate items.
- Q: The status dialog carried a 廃棄 warning box and a `廃棄する` submit label — keep them? → A: **Removed.** The prototype's detail dialog has neither (only the list screen's bulk dialog does); the submit is always `変更を保存`.
- Q: The status-history projection used its own field names (`id` / `occurredAt` / `operatorName` / `eventType` / `fromStatus` / `toStatus`) — align with API-103? → A: **Aligned** to `historyId` / `changedAt` / `changedBy{staffId,name}` / `previousStatus` / `newStatus` / `changedReason` / `changedNote`. `eventType` is dropped: the install row is the one with a null `previousStatus`.
- Q: A status change now appends a history row server-side (API-103 §6.2/§6.4) — does the screen need to react? → A: Yes — the dialog invalidates the 変更履歴 query alongside the detail query, so the new row appears without a reload.
- Q: The history response is a flat `{ history: [] }` while API-103 paginates (`items` + `pagination`) — follow the doc? → A: **Keep the flat array.** The prototype's 変更履歴 tab has no pager; recorded as a divergence rather than adding paging UI the prototype does not have.
- Q: 都次オプション種別 was spelled with 都次 — typo? → A: Yes. Corrected to **都度オプション種別** everywhere, matching the prototype.

### Session 2026-09-10 — prototype re-check (FR-008 v2)

Re-checked against `dx-fitness/fitness-crm-ui@46253e3` (`src/pages/equipment-detail.tsx` last changed `6bc1f1c`, 9/8) and `fitness-spec@89c2c79` (`crm/requirements/E-02.md` revision `260731_v2`).

- Q: The 利用制御ルール card listed 紐づき契約種別 / オプション種別 / 主契約タイプ / 都度オプション種別 — does FR-008 v2 change it? → A: **Yes.** 課金種別 is no longer a judgment axis, so the card now shows **主契約タイプ** then **サービス種別** (one badge per type) plus the note 「課金種別（通常/都度）を問わず、同じサービス種別のオプションがいずれか1つ有効であれば起動を許可します」. The オプション種別 / 都度オプション種別 rows are gone, and the 紐づき契約種別 badge reads `サービス種別` instead of `オプション契約`. Mirrors `007-equipment-form` §Session 2026-09-10.

### Session 2026-10-12 — PO decisions on real-API gaps (E-02 integration)

Raised by the real-API integration (`../integration-plan.md` §9) against `fitness-spec@c7ea80c` (E-02 `260731_v2`), `fitness-crm-ui@47423ec` and the API-103 / API-104 contract in `src/lib/openapi.real.json`. Answered by the user (PO-side) on 2026-10-12.

- Q: Where does 接点制御先番号 come from now that the BE does not assign it? → A: **API-103 `outputPort`**, entered on the form as 出力ポート (`007-equipment-form`, Session 2026-10-12). `—` for なし devices (port is null by contract).
- Q: 利用制御ルール card — one service type or several? → A: **Several** (one line per service type), following the multi-select decision in `007-equipment-form`. Rendered as a one-item list until API-103 returns an array (integration B2, Round 2).
- Q: 機器ID is a UUID with no display code — what does the card show? → A: **Accept the UUID, shortened** (last 8 characters, UUIDv7 tail; full value in a tooltip). The ID format is the BE's call; FE follows it. No display code will be requested.

### Session 2026-11-09 — 主契約判定「全て」・複数選択 (prototype 11/7)

Re-checked against `dx-fitness/fitness-crm-ui@4508cf7` (11/7 「接続機器の利用制御ルール：主契約判定の全て・複数選択」, report `public/reports/20261107-equipment-usage-rule/`), `fitness-backend-v2@origin/main` `07993418` (API-103 `allowedContractTypes[]`) and `28b9f0cb` (API-104 `relayId`), and `fitness-spec@5e335ab` (`E-02` `261107_v5` — its FR-008 still reads 主契約タイプ 「単数Select」; the 11/5 データ設定会 decision and the prototype supersede it, PO spec update pending).

- Q: How does the 利用制御ルール card read now? → A: Two labelled rows, mirroring the form: **主契約判定** — 「判定しない」 (muted), or an outline badge 「全て」 with 「タイプを問わず、有効な主契約があれば起動します」, or one outline badge per 主契約タイプ (G-01 order); **サービス種別判定** — 「判定しない」, or one badge per type plus the 課金種別 note. The separate 紐づき契約種別 row is gone. When 主契約 is 全て (or every type the store's brand allows) and サービス種別判定 is on, the amber Alert 「オプションの有無を問わず起動します」 follows. ゲートストップ条件 unchanged.

### Session 2026-11-19 — 機器タイプ エリア扉 (E-02 v5, ladyroom)

Re-checked against `fitness-spec@9e0e07e` (`E-02` `261109_v6` FR-003 / FR-004 / FR-008 / FR-016), `dx-fitness/fitness-crm-ui@9428dc2` (`equipment-detail.tsx`) and `src/lib/openapi.real.json` (API-103 `areaId` / `area`).

- Q: How does the detail show an エリア扉? → A: 機器タイプ badge 「エリア扉」. The 利用制御ルール card shows two rows instead of 主契約判定 / サービス種別判定: **エリア** (the area name) and **性別の条件** (なし / 女性のみ / 男性のみ), from API-103 `area` (resolved). No ゲートストップ条件 box. 認証方式 is 会員読取型 (the only method API-103 accepts for `area_door`).
- Q: The area is renamed or its 性別の条件 changed in the area master ([009-area-master](../009-area-master/spec.md))? → A: The detail shows the new values on its next load (read live, not copied onto the device).
- Q: `area` is null (area master unreadable)? → A: **Not specified** by the PO spec or the prototype — open point; the tester records what renders.
  - **Test cases:** E-02-B `[エリア扉]` cases per the 029 test plan §5.

## Clarified Decisions

> Session 2026-06-24 — 5 questions resolved:

1. **編集 button (Phase 1)**: Visible but **disabled** with tooltip `編集機能は準備中です` (no navigation).
2. **廃棄 vs delete**: **Independent actions** — delete permitted at any status; 廃棄 is optional.
3. **Fetch error (incl. 404)**: `接続機器の取得に失敗しました。` + 再試行; back to list via PageHeader back link.
4. **Same-status prevention**: **Exclude current status** from 新しいステータス select (3 options only); 変更を保存 disabled until selection.
5. **History tab footer**: **Omit** 直近1年の対応 / 平均対応間隔 summary — table only per FR-012.

---

## Scope

### In Scope (Phase 1)

| ID                | Requirement                                          | Screen Coverage                                            |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| **FR-004**        | Connected equipment detail display (read-only)       | Full detail screen — Basic Info tab, header, sidebar cards |
| **FR-006**        | Connected equipment deletion                         | Delete button + confirmation dialog                        |
| **FR-012**        | Equipment status change history — record & reference | 変更履歴 tab (history table only)                          |
| **Status Change** | Manual connected-equipment status update             | ステータス card + ステータス変更 dialog                    |

### Out of Scope for Phase 1

| ID / Feature                       | Reason                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| FR-001, FR-002                     | Equipment list & search (separate list screen)                                                                               |
| FR-003                             | New equipment registration                                                                                                   |
| FR-005                             | Equipment edit form/navigation — **編集 button visible but disabled with tooltip in Phase 1**                                |
| FR-007                             | Contact-control device (接点制御装置) settings management — summary card + link only; full controller management is separate |
| FR-008                             | Usage-control rule **configuration** — detail screen displays rules read-only only                                           |
| FR-009                             | Authentication method settings management                                                                                    |
| FR-010                             | Bulk status update                                                                                                           |
| FR-011                             | CSV export                                                                                                                   |
| FR-013                             | Equipment usage log reference                                                                                                |
| `equipment-form` (edit) navigation | Tied to FR-005                                                                                                               |
| Full `controller-detail` page      | Linked from summary card; not part of this screen's Phase 1 deliverable                                                      |
| History tab summary footer         | 直近1年の対応 / 平均対応間隔 — prototype-only; omitted per Clarified Q5                                                      |

---

## Feature Overview

| Item        | Detail                                                                                                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen name | 接続機器詳細 (Connected Equipment Detail)                                                                                                                                                                                    |
| UI slug     | `equipment-detail`                                                                                                                                                                                                           |
| Parent list | `equipment-list` (接続機器一覧)                                                                                                                                                                                              |
| Brands      | JOYFIT / FIT365 (common)                                                                                                                                                                                                     |
| Purpose     | Staff and HQ users view a single connected device's full ledger information, usage-control rule summary, linked controller summary, manually update device status, review status change history, and delete obsolete devices |

**Source**: E-02 §概要, FR-004, FR-006, FR-012; constraints §制限事項 — "CRM管理画面では状態の手動更新と一覧参照のみ"

---

## Actors & Access Control

**Source**: E-02 §権限マトリクス, UI `RoleGatedButton` annotations (L467–482)

| Role            | View Detail             | Status Change | Delete | Edit Button (Phase 1)           |
| --------------- | ----------------------- | ------------- | ------ | ------------------------------- |
| **System**      | ○                       | ○             | ○      | Visible, **disabled** + tooltip |
| **Headquarter** | ○ (all stores)          | ○             | ○      | Visible, **disabled** + tooltip |
| **Manager**     | ○ (jurisdiction stores) | ○             | ○      | Visible, **disabled** + tooltip |
| **Staff**       | ○ (own store)           | ○             | ○      | Visible, **disabled** + tooltip |
| **Observer**    | ○ (read-only)           | ×             | ×      | Visible, **disabled** + tooltip |
| **Trainer**     | ×                       | ×             | ×      | × (no page access)              |

**Edit button tooltip (Phase 1)**: `編集機能は準備中です` — shown on hover for all roles with page access. Click does not navigate.

**Data scope**: System / Headquarter → all stores; Manager → jurisdiction stores; Staff / Observer → own store only.

---

## Component Hierarchy & Layout

**Source**: `equipment-detail.tsx`

```
EquipmentDetail
├── SharedSidebar (currentPage="equipment-detail")
└── SidebarInset (flex col, max-h-svh, overflow hidden)
    ├── SharedHeader
    ├── PageHeader (outside)
    │   ├── BackLink → navigate("equipment-list")  [label: 接続機器]
    │   ├── title: equipment name
    │   ├── subtitle: "{storeName} — 接続機器ID: {id}"
    │   ├── badge: current status
    │   └── actions: [削除] [編集]  (RoleGatedButton)
    ├── main (flex-1, overflow-auto, px-6 py-4)
    │   └── Tabs (default: basic | history)
    │       ├── Tab "基本情報" → BasicInfoTab
    │       │   ├── Left column 60%
    │       │   │   ├── Card: 接続機器情報 (2-col grid)
    │       │   │   └── Card: 利用制御ルール
    │       │   └── Right column 40% (sticky top-0)
    │       │       ├── Card: ステータス (+ ステータス変更 button)
    │       │       ├── Card: 接点制御装置 (summary + link)
    │       │       └── Card: その他情報
    │       └── Tab "変更履歴" → HistoryTab
    │           └── Table (4 columns) — no summary footer
    ├── Dialog → StatusChangeDialog
    └── AlertDialog → delete confirmation
```

- Minimum supported width: 768 px (project standard)
- Right column on Basic Info tab is sticky (`sticky top-0`)
- Two-column split: 60% / 40%

---

## UI Element Traceability

### Page Header

| UI Element               | Location | Source Requirement                                                                      |
| ------------------------ | -------- | --------------------------------------------------------------------------------------- |
| Back link "接続機器"     | L452–455 | FR-004 navigation from list (implicit via FR-001)                                       |
| Equipment name as title  | L457     | FR-004 — 機器名 display                                                                 |
| Subtitle with store + ID | L458     | FR-004 — store context; 機器ID                                                          |
| Status badge in header   | L459–464 | FR-004 — 状態 display                                                                   |
| 削除 button              | L468–478 | FR-006                                                                                  |
| 編集 button              | L479–482 | FR-005 — **Phase 1: visible, disabled, tooltip `編集機能は準備中です`** (no navigation) |

### Basic Info Tab — 接続機器情報 Card

| Field Label      | Example Value (prototype)      | Source Requirement                                                          |
| ---------------- | ------------------------------ | --------------------------------------------------------------------------- |
| 接続機器ID       | `1`                            | FR-004 / FR-003 — 機器ID (system-assigned)                                  |
| 接続機器名       | 水素水サーバー                 | FR-004 — 機器名                                                             |
| 機器タイプ       | Badge: 水素水サーバー          | FR-004 — 機器タイプ                                                         |
| シリアルナンバー | SN-20250101-001 (mono)         | FR-004 — シリアルナンバー                                                   |
| IPアドレス       | 192.168.1.101 (mono)           | FR-004 — IPアドレス                                                         |
| MACアドレス      | AA:BB:CC:DD:EE:FF (mono)       | FR-004 — MACアドレス                                                        |
| 設置場所         | 1F 休憩スペース                | FR-004 — 設置場所                                                           |
| 設置日           | 2025/02/16                     | FR-004 — 設置日                                                             |
| 認証方式         | 会員読取型                     | FR-004 / FR-009 (display only in Phase 1)                                   |
| 接点制御先番号   | `1`                            | FR-003 — 接続先接点制御装置 (contact-output port; assigned server-side)     |
| 備考             | full-width row, `—` when unset | FR-003 §登録項目「備考（任意）」 / FR-004 — every registered item read-only |

> `QRコードID` was **removed** on 2026-09-08: it is absent from the prototype detail screen and from the API-103 design doc alike. See §Clarifications 2026-09-08. **Superseded 2026-11-03**: the QR sticker is shown again in a QRコード modal opened from the header (§Clarifications 2026-11-03).

### Basic Info Tab — 利用制御ルール Card (read-only)

| Field Label                              | Example                                                     | Source Requirement                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 主契約判定                               | 判定しない / Badge 「全て」 + note / Badge per 主契約タイプ | FR-008 — 主契約判定 (Session 2026-11-09)                                                            |
| サービス種別判定                         | 判定しない / Badge per type: 水素水                         | FR-008 v2 — サービス種別判定 (課金種別を問わない)                                                   |
| Alert オプションの有無を問わず起動します | shown for 全て (or all types) + サービス種別判定            | Session 2026-11-09                                                                                  |
| ゲートストップ条件 info box              | Static explanatory text                                     | FR-008 — gate-stop conditions, 入館ゲート (`entry_gate`) only — not 退館ゲート (Session 2026-11-09) |

- The サービス種別 row carries the prototype's note verbatim: 「課金種別（通常/都度）を問わず、同じサービス種別のオプションがいずれか1つ有効であれば起動を許可します」. Empty selections render `—`.

> Configuration of usage-control rules (FR-008 write operations) is **Out of Scope for Phase 1**. This card is read-only display per FR-004.

### Basic Info Tab — ステータス Card (right column)

| UI Element                    | Content                   | Source Requirement                       |
| ----------------------------- | ------------------------- | ---------------------------------------- |
| Status icon (Check in circle) | Visual indicator for 正常 | Prototype UX — not specified in E-02     |
| Status badge                  | 正常                      | FR-004 — 状態; E-02 §機器状態 (4 states) |
| 最終確認日時                  | 2026/03/05 09:00          | [NEED CLARIFICATION: not in E-02 spec]   |
| ステータス変更 button         | Opens status dialog       | Constraints — manual status update       |

**Equipment states** (E-02 §機器状態): 正常 / 異常 / メンテナンス中 / 廃棄

| State          | Badge styling (prototype)                                                               |
| -------------- | --------------------------------------------------------------------------------------- |
| 正常           | success (green dot + outline)                                                           |
| 異常           | destructive (red)                                                                       |
| メンテナンス中 | warning in dialog select; info in history tab [NEED CLARIFICATION: color inconsistency] |
| 廃棄           | muted (grey)                                                                            |

### Basic Info Tab — 接点制御装置 Card (summary)

| Field               | Example               | Source Requirement                                          |
| ------------------- | --------------------- | ----------------------------------------------------------- |
| 装置ID              | CTRL-001              | FR-007 — linked controller reference (separate item)        |
| 装置名              | 制御装置 新宿 1号     | FR-007 — 装置名 (separate item; `—` when unresolved)        |
| IP:ポート           | 192.168.1.107:81      | FR-007 — IPアドレス (display includes port in prototype)    |
| ステータス          | 正常 badge            | FR-007 — 状態                                               |
| 装置詳細を見る link | → `controller-detail` | FR-007 — cross-reference (target page out of Phase 1 scope) |

### Basic Info Tab — その他情報 Card

| Field    | Example    | Source Requirement                        |
| -------- | ---------- | ----------------------------------------- |
| 作成日時 | 2025/02/16 | Audit metadata — not explicitly in FR-004 |
| 更新日時 | 2025/07/02 | Audit metadata — not explicitly in FR-004 |

### 変更履歴 Tab — History Table (FR-012)

| Column         | Content                                      | API-103 field                    | Source Requirement                    |
| -------------- | -------------------------------------------- | -------------------------------- | ------------------------------------- |
| 日時           | e.g. 2026/02/15 10:00                        | `changedAt`                      | FR-012 — history timestamp            |
| 操作者         | e.g. 山田太郎                                | `changedBy.name` (`—` when null) | FR-012 — who performed the change     |
| ステータス変化 | from → to badges, or "新規作成" for creation | `previousStatus` → `newStatus`   | FR-012 — status change record         |
| 変更理由       | memo text or em dash                         | `changedNote`                    | Status dialog 変更理由 field + FR-012 |

**History row types observed in prototype**:

1. Status transition (from badge → to badge) — `previousStatus` is non-null
2. Creation event ("新規作成" badge, no from-state, no memo) — **identified by `previousStatus === null`**, which is exactly how the design doc marks the install row; there is no separate event-type field
3. QR sticker event ("QRコード発行" / "QRコード再発行" badge, no memo) — **identified by `changedReason` `qr_create` / `qr_change`**; status unchanged (§Clarifications 2026-11-07)

> `changedReason` (`install` / `fault_report` / `maintenance_start` / `maintenance_complete` / `disposal`) is carried by the API and recorded on every transition, but **not displayed**: the prototype's 変更理由 column shows the free-text note.

> **Out of Scope for Phase 1**: Prototype summary footer (直近1年の対応, 平均対応間隔) below the table — omitted per Clarified Q5.

### Status Change Dialog

| Element               | Behavior                                                             | Source Requirement                   |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Title                 | ステータス変更                                                       | Manual status update                 |
| Description           | 接続機器のステータスを変更します。                                   | —                                    |
| Read-only target info | 接続機器名 + 現在のステータス                                        | Context for operator                 |
| 新しいステータス      | Select listing **only statuses other than current** (3 of 4 options) | E-02 §機器状態; Clarified Q4         |
| 変更理由              | Optional textarea (OptionalMark)                                     | Supports FR-012 audit trail          |
| キャンセル            | Closes dialog                                                        | Standard UX                          |
| 変更を保存            | Submits change; disabled until a new status is selected              | Manual status update + FR-012 record |

### Delete Confirmation Dialog (FR-006)

| Element     | Content                                            | Source Requirement           |
| ----------- | -------------------------------------------------- | ---------------------------- |
| Title       | 接続機器を削除しますか？                           | FR-006 — confirmation dialog |
| Description | 「{name}」を削除します。この操作は取り消せません。 | FR-006                       |
| キャンセル  | Closes dialog                                      | Standard UX                  |
| 削除する    | Executes delete → navigates to `equipment-list`    | FR-006                       |

---

## UI States

**Prototype implementation note**: The UI code uses hardcoded mock data. No loading, empty, or error states are implemented in `equipment-detail.tsx`.

| State                          | Expected Behavior (to be implemented)                                                    | Prototype Coverage                         |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Loading**                    | Skeleton or spinner while fetching equipment by ID                                       | Not in prototype                           |
| **Data-rendered**              | Full layout with populated fields                                                        | Default prototype state                    |
| **Error (incl. 404)**          | Error state: `接続機器の取得に失敗しました。` + **再試行**; PageHeader back link to list | Aligns with locker/campaign detail pattern |
| **Permission denied**          | 403 or redirect for Trainer / unauthorized store scope                                   | Not in prototype                           |
| **Dialog: Status change open** | `showStatusChange` prop / `statusDialogOpen` state                                       | Supported via prop                         |
| **Dialog: Delete open**        | `showDeleteDialog` prop / `deleteDialogOpen` state                                       | Supported via prop                         |
| **Tab: History active**        | `activeTab="history"` prop                                                               | Supported via prop                         |

---

## User Scenarios & Testing

### User Story 1 — View Connected Equipment Detail (Priority: P1)

**As** a Staff or Headquarter user,  
**I need** to view all details of a connected device in read-only form,  
**So that** I can verify device configuration and usage-control rules before taking operational action.

**Why this priority**: FR-004 is the core read path; all other actions depend on viewing detail first.

**Independent Test**: Navigate to equipment detail from list; verify all fields in 接続機器情報, 利用制御ルール, ステータス, 接点制御装置, and その他情報 cards match API data.

**Acceptance Scenarios**:

1. **Given** a user with list access opens a connected device from the equipment list, **When** the detail page loads, **Then** the page displays the equipment name as title, store name and equipment ID in subtitle, and current status badge in the header.
2. **Given** the Basic Info tab is active, **When** data is loaded, **Then** all fields in the 接続機器情報 card are shown read-only in a 2-column grid (ID, name, type, serial, IP, MAC, location, install date, auth method, controller reference, QR code ID).
3. **Given** usage-control rules are configured, **When** viewing the 利用制御ルール card, **Then** linked contract type, option type, main contract type, per-use option type, and gate-stop info (for gates) are displayed read-only.
4. **Given** the device is linked to a contact-control device, **When** viewing the 接点制御装置 card, **Then** controller ID, IP:port, and status are shown with a link to controller detail.
5. **Given** the user clicks the back link "接続機器", **When** navigation completes, **Then** the user returns to the equipment list.
6. **Given** the API returns 404 or any other fetch failure for the equipment ID, **When** the page loads, **Then** an error state displays `接続機器の取得に失敗しました。` with a **再試行** button, and the PageHeader back link to the equipment list remains available.

---

### User Story 2 — Change Connected Equipment Status (Priority: P1)

**As** a Staff or Headquarter user,  
**I need** to manually update a connected device's operational status,  
**So that** I can reflect maintenance, faults, or decommissioning in the CRM ledger.

**Why this priority**: Manual status update is the primary operational action on this screen (per E-02 constraints) and feeds FR-012 history.

**Independent Test**: Open status change dialog, select new status, optionally enter reason, save; verify status updates across header badge, status card, and history tab.

**Acceptance Scenarios**:

1. **Given** a user with edit permission views the ステータス card, **When** they click ステータス変更, **Then** the status change dialog opens showing read-only equipment name and current status.
2. **Given** the dialog is open and current status is e.g. 正常, **When** the user opens the 新しいステータス select, **Then** only 異常, メンテナンス中, and 廃棄 are listed — the current status is excluded.
3. **Given** the dialog is open, **When** the user selects a new status and clicks 変更を保存, **Then** the equipment status is updated and reflected in the page header badge and status card.
4. **Given** the dialog is open, **When** the user enters text in 変更理由 (optional) and saves, **Then** the reason is stored and appears in the 変更履歴 tab for that change.
5. **Given** the dialog is open with no new status selected, **When** the user views 変更を保存, **Then** the button is disabled.
6. **Given** the dialog is open, **When** the user clicks キャンセル, **Then** the dialog closes with no status change.
7. **Given** the user role is Observer, **When** viewing the detail page, **Then** the ステータス変更 action is not available (or is disabled with permission tooltip).

---

### User Story 3 — Delete Connected Equipment (Priority: P2)

**As** a Staff or Headquarter user,  
**I need** to delete a connected device record after confirmation,  
**So that** removed or replaced equipment no longer appears in the store ledger.

**Why this priority**: FR-006 is in Phase 1 scope but is a destructive, less frequent action than viewing or status updates.

**Independent Test**: Click 削除, confirm in dialog, verify redirect to list and record removal.

**Acceptance Scenarios**:

1. **Given** a user with delete permission, **When** they click 削除 in the page header, **Then** a confirmation dialog appears naming the equipment and stating the action cannot be undone.
2. **Given** the confirmation dialog is open, **When** the user clicks 削除する, **Then** the equipment is deleted and the user is navigated to the equipment list.
3. **Given** the equipment status is 正常, 異常, メンテナンス中, or 廃棄, **When** an authorized user deletes the device, **Then** deletion proceeds without requiring a prior 廃棄 status change.
4. **Given** the confirmation dialog is open, **When** the user clicks キャンセル, **Then** the dialog closes and the equipment remains.
5. **Given** the user role is Observer or Trainer, **When** viewing the page, **Then** the 削除 button is disabled with tooltip "削除権限がありません".

---

### User Story 3b — Edit Button Placeholder (Priority: P3)

**As** a user with page access,  
**I see** the 編集 button in the header but cannot use it in Phase 1,  
**So that** the UI layout matches the prototype while edit functionality is deferred to FR-005.

**Acceptance Scenarios**:

1. **Given** any role with detail page access (HQ, System, Manager, Staff, Observer), **When** viewing the page header, **Then** the 編集 button is visible but disabled.
2. **Given** the disabled 編集 button, **When** the user hovers, **Then** tooltip `編集機能は準備中です` is shown.
3. **Given** the disabled 編集 button, **When** the user clicks it, **Then** no navigation occurs.

---

### User Story 4 — Review Status Change History (Priority: P2)

**As** a Staff or Headquarter user,  
**I need** to review the history of status changes for a device,  
**So that** I can audit past maintenance, faults, and recovery actions.

**Why this priority**: FR-012 (Could in source spec) is explicitly included in Phase 1 per user scope.

**Independent Test**: Switch to 変更履歴 tab; verify table rows only (no summary footer).

**Acceptance Scenarios**:

1. **Given** the user selects the 変更履歴 tab, **When** history data exists, **Then** a table displays 日時, 操作者, ステータス変化 (from→to badges or 新規作成), and 変更理由 columns.
2. **Given** a status change was saved with a reason, **When** viewing history, **Then** that reason appears in the 変更理由 column.
3. **Given** the equipment was newly registered, **When** viewing history, **Then** a 新規作成 entry appears with creation timestamp and operator.
4. **Given** the 変更履歴 tab is rendered, **When** the page loads, **Then** no summary footer (直近1年の対応 / 平均対応間隔) is displayed below the table.

---

### Edge Cases

- Equipment ID not found (404) or other fetch failure → error state `接続機器の取得に失敗しました。` + 再試行; back link via PageHeader (project-standard detail pattern)
- User accesses equipment outside their store data scope → deny access (403)
- Delete attempted while device has active dependencies → no delete constraints for connected equipment in E-02; deletion allowed at any status (Deferred to Plan — aligns with Q7)
- Status select excludes current status — only the 3 other statuses appear in 新しいステータス dropdown; 変更を保存 disabled until selection (Clarified Q4)
- Delete at any status → authorized users may delete regardless of current status (正常 / 異常 / メンテナンス中 / 廃棄); 廃棄 status change is optional and not a prerequisite for delete (Clarified Q2)
- Empty history (new device with only creation row) → table shows at minimum the 新規作成 row
- Network/API failure on status save or delete → toast error message; keep dialog open for retry (Deferred to Plan)

---

## Requirements

### Functional Requirements (Phase 1)

- **FR-004**: System MUST display all connected-equipment detail fields read-only on the Basic Info tab, including usage-control rule summary (FR-008 display portion) and permission-gated action buttons per role. For an エリア扉 the rule summary is エリア + 性別の条件 (Session 2026-11-19).
- **FR-006**: System MUST show a confirmation dialog before deleting a connected device and remove the record upon confirmed deletion, then return the user to the equipment list. Delete MUST be permitted at any equipment status (正常 / 異常 / メンテナンス中 / 廃棄) without requiring a prior 廃棄 status change.
- **FR-012**: System MUST record each manual status change (timestamp, operator, from/to status, optional reason) and display the history in the 変更履歴 tab as a 4-column table. Summary footer metrics (直近1年の対応, 平均対応間隔) are **not** required.
- **FR-SC-001** (Status Change): System MUST allow authorized users to change connected-equipment status among 正常, 異常, メンテナンス中, and 廃棄 via the ステータス変更 dialog, with optional 変更理由 captured for the audit trail. The 新しいステータス select MUST exclude the current status (show only the 3 other options). 変更を保存 MUST remain disabled until a new status is selected.
- **FR-UI-001** (Edit button placeholder): System MUST render the 編集 header button for all users with page access in Phase 1, but keep it **disabled** with tooltip `編集機能は準備中です`; it MUST NOT navigate to the edit form until FR-005 is implemented.
- **FR-ERR-001** (Fetch error): When equipment detail fetch fails (including HTTP 404 not found), system MUST show `接続機器の取得に失敗しました。` with a 再試行 button that retries the fetch. PageHeader back link to the equipment list MUST remain visible (same pattern as locker/campaign detail pages).

### Key Entities

- **Connected Equipment (接続機器)**: Store-scoped device linked to one contact-control device. Key attributes: ID, name, type, serial number, IP, MAC, location, install date, status, auth method, controller reference, QR code ID, linked contract rules, created/updated timestamps.
- **Equipment Status**: One of 正常, 異常, メンテナンス中, 廃棄. Manually updated in CRM (no real-time monitoring in CRM per E-02 constraints).
- **Status Change History Entry**: Timestamp, operator name, field changed (ステータス), previous value, new value, optional memo/reason. Creation event recorded as 新規作成.
- **Usage Control Rule (display)**: Linked contract type, option type, main contract type, per-use option type, gate-stop conditions — read-only on this screen.
- **Contact-Control Device (summary)**: Controller ID, IP:port, status — summary reference only on this screen.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Authorized users can open a connected-equipment detail page and locate any displayed attribute within 30 seconds without editing.
- **SC-002**: Authorized users can complete a status change (open dialog → select status → save) in under 1 minute.
- **SC-003**: 100% of manual status changes performed through the dialog appear in the 変更履歴 tab with correct from/to values and operator.
- **SC-004**: Delete flow requires explicit confirmation; zero accidental deletions in UAT (users must confirm 削除する).
- **SC-005**: Observer and Trainer users cannot perform status change or delete actions on the detail screen.

---

## Assumptions

- Equipment list screen (FR-001) exists as the entry point; users reach detail by selecting a row.
- Store context (brand, store name) is resolved from the equipment record or session.
- Contact-control device summary data is joinable from the equipment's controller reference.
- Usage-control rule display data is joinable from equipment configuration (FR-008 data exists but configuration UI is out of scope).
- Status change persists server-side and appends a history row; prototype uses local mock data only.
- 最終確認日時 on the status card = timestamp of last manual status change (Deferred to Plan — Q4)
- Edit button is visible but disabled with tooltip `編集機能は準備中です` for all page-access roles in Phase 1 (Clarified Q1).
- Decommissioning via status 廃棄 and hard delete (FR-006) are independent actions per E-02 §基本フロー step ⑦ (Clarified Q2).
- Not-found and fetch-error copy follow project detail-screen conventions (Clarified Q3).
- Status change dialog filters out the current status from selectable options (Clarified Q4).
- History tab shows table only; no summary footer statistics (Clarified Q5).

---

## Q&A / Clarification Needed

| #       | Topic                        | Context                                                                           | Question                                                                                                                   |
| ------- | ---------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Q1      | Controller field label       | UI: 接点制御先番号; E-02 FR-003: 接続先接点制御装置                               | Should the detail screen label show controller **number**, **name**, or **ID**? Prototype shows numeric reference only.    |
| Q2      | Missing 備考 field           | FR-003/004 list 備考; prototype detail omits it                                   | Should 備考 be displayed on the detail screen? If yes, where (接続機器情報 card or separate section)?                      |
| Q3      | QRコードID field             | Shown in prototype; not in E-02 FR-003/004 registration fields                    | Is QRコードID a required display field for Phase 1? What is the source of truth for this value?                            |
| Q4      | 最終確認日時                 | Status card shows "最終確認日時: 2026/03/05 09:00"                                | What event updates this timestamp — last manual status change, last staff verification, or system heartbeat?               |
| Q5      | メンテナンス中 badge color   | Dialog select uses `warning`; history rows use `info` styling                     | Which semantic color is canonical for メンテナンス中 across the application?                                               |
| ~~Q6~~  | ~~History summary footer~~   | **Resolved**                                                                      | Omit footer — table only for FR-012 (Session 2026-06-24)                                                                   |
| Q7      | Delete constraints           | FR-007 blocks controller delete when devices exist; no inverse rule for equipment | Are there conditions under which connected equipment cannot be deleted (e.g., status 廃棄 only, active usage logs)?        |
| ~~Q8~~  | ~~Status 廃棄 vs delete~~    | **Resolved**                                                                      | Independent actions — delete at any status; 廃棄 optional (Session 2026-06-24)                                             |
| ~~Q9~~  | ~~Same-status save~~         | **Resolved**                                                                      | Exclude current status from select — only 3 other options shown (Session 2026-06-24)                                       |
| ~~Q10~~ | ~~Edit button in Phase 1~~   | **Resolved**                                                                      | Show disabled with tooltip `編集機能は準備中です` (Session 2026-06-24)                                                     |
| ~~Q11~~ | ~~Not-found / error states~~ | **Resolved**                                                                      | 404 + fetch errors → `接続機器の取得に失敗しました。` + retry; back via PageHeader (revised to match project detail pages) |

### Deferred to Plan (prototype-aligned defaults)

| #   | Topic                        | Plan default                                                                                         |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Q1  | Controller field label       | Use prototype label **接点制御先番号**; display numeric controller port/reference                    |
| Q2  | 備考 field                   | Omit from Phase 1 detail screen (prototype omits; add when FR-005 ships)                             |
| Q3  | QRコードID                   | Include per prototype/list; show em dash when null                                                   |
| Q4  | 最終確認日時                 | Timestamp of **last manual status change**                                                           |
| Q5  | メンテナンス中 badge color   | Use **warning** semantic consistently (dialog select)                                                |
| Q7  | Delete constraints           | **No constraints** — any authorized user may delete at any status (E-02 silent on inverse of FR-007) |
| —   | Dialog save/delete API error | Toast error + keep dialog open for retry                                                             |
