# Real API Integration Plan: E-02 Store Equipment Management (店舗機器管理)

**Branch**: `feat/equiqments-integration-api` | **Date**: 2026-10-08
**Specs**: [029-equipment-list](./029-equipment-list/spec.md) · [006-equipment-detail](./006-equipment-detail/spec.md) · [007-equipment-form](./007-equipment-form/spec.md) · [008-controller-management](./008-controller-management/spec.md)
**Scope**: `src/app/(private)/(equipment-management)/**` — 接続機器 (connected device) list / detail / create / edit / delete / status change / bulk status / CSV, and 接点制御装置 (relay controller) list / detail / create / edit / delete / status change / devices tab, plus the shared layout (tab counts) and CSV button.
**Target API**: `src/lib/api-real` (generated from `src/lib/openapi.real.json`; API-103 Admin Connected Device, API-104 Admin Relay Controller, API-083 Admin Store list)

**Sources pinned for this plan** (all fetched 2026-10-08):

| Source                                                       | Revision                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| PO spec `dx-fitness/fitness-spec` `crm/requirements/E-02.md` | `5c391cf` (2026-09-28) — document version **260731_v2**, unchanged since `c7ea80c` (2026-07-31)                                 |
| Prototype `dx-fitness/fitness-crm-ui`                        | `47423ec` (2026-09-30). Equipment/controller pages last changed `1767864` (9/17): only `PAGE_SIZE_OPTIONS` 200 dropped          |
| Backend `fitness-backend-v2`                                 | `origin/main` `83fd7d51` (2026-10-08)                                                                                           |
| Current FE code                                              | Built against `fitness-spec@89c2c79` + `fitness-crm-ui@46253e3` (9/8). No spec delta since; one prototype delta (page size 200) |

> **PO decisions of 2026-10-12 are in [§8 Resolved questions](#8-resolved-questions)** (Q1–Q4, Q7, Q8).
> Q1 and Q7 are FE work now ([§5b Round 1b](#5b-round-1b--fe-follow-up-from-the-2026-10-12-decisions)); Q2, Q3, Q4, Q8 wait on BE (Round 2).
> Q5, Q6, Q9, Q10 in §9 are BE-only and stay open.
>
> **Round 2 closed 2026-10-12** ([§Round 2 result](#round-2-result-2026-10-12)): B5, B6, B9 shipped / verified, plus the
> bulk-status and history contract changes. B2, B3, B4, B8 and Q9 still wait on the BE → **Round 2b**.
>
> **Round 2b closed 2026-10-16 against the BE running locally** ([§Round 2b result](#round-2b-result-2026-10-16)):
> B2, B3, B4, B8, Q9 and R301 shipped; every Swagger seam but one removed. Re-run on dev once the BE branch is deployed.

> **Round 3 opened 2026-11-09** ([§Round 3](#round-3--2026-11-09-主契約判定全て複数選択-relayid)): 主契約判定「全て」・複数選択
> (11/5 データ設定会, prototype 11/7, BE `allowedContractTypes[]`) plus the API-104 `relayId` the BE now requires. Closes Round 2b No.21.

## 1. Guiding principle

**Implement per spec, UI first.** E-02 v2 is the contract; the latest prototype decides layout.
Spec'd fields stay enabled and required even where the backend cannot back them yet. Whatever the
BE does not accept is stripped or adapted at **one seam** (`_utils/*.util.ts` / `_schemas/*`) with a
`TODO(round2) Bn` comment. Prototype-only elements that the spec does not define are **commented
out, not deleted**, with `TODO(round3) R3nn`.

Untouched mock surfaces (convention): `src/app/api/crm/equipment/**`, `src/app/api/crm/controllers/**`,
`src/app/api/_mock-db/**` and the mock Zod schemas stay as they are — they simply stop being called.

## 2. Endpoint mapping

| UI surface                                                            | Real endpoint                                                                                               | Hook (`@/lib/api-real/@tanstack/react-query.gen`)                                | Round      |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- | --- |
| 接続機器 list + search / filters / sort / paging                      | `GET /api/v1/admin/connected-devices` (`storeId` **required**)                                              | `adminConnectedDeviceControllerListOptions`                                      | 1 (B4)     |
| Filter-result banner baseline (全 N 件中)                             | same, `includeTotalAll: true` → `pagination.totalAllItems`                                                  | same                                                                             | 1          |
| Layout tab counts (接続機器 / 接点制御装置)                           | both lists with `limit: 1` → `pagination.totalItems` (replaces `/crm/equipment/summary`)                    | `…ConnectedDeviceControllerListOptions`, `…RelayControllerControllerListOptions` | 1 (B4)     |
| 紐づき契約種別 badges (list column, detail card)                      | derived from `isMainContractRequired` / `allowedServiceType` (replaces `linkedContractLabels`)              | —                                                                                | 1          |
| 接続機器 detail (info / status / usage rule / controller card / meta) | `GET /api/v1/admin/connected-devices/{deviceId}` (flat DTO, no `equipment` wrapper)                         | `adminConnectedDeviceControllerDetailOptions`                                    | 1          |
| 接続機器 変更履歴 tab                                                 | `GET /api/v1/admin/connected-devices/{deviceId}/status-history`                                             | `adminConnectedDeviceControllerHistoryOptions`                                   | 1 (B5)     |
| 接続機器 新規登録                                                     | `POST /api/v1/admin/connected-devices` → `PUT …/{deviceId}/usage-control`                                   | `…CreateMutation` → `…PutUsageControlMutation`                                   | 1 (B1, B2) |
| 接続機器 編集                                                         | `PATCH /api/v1/admin/connected-devices/{deviceId}` (+ `PUT …/usage-control` when the rule is dirty)         | `…UpdateMutation` (+ `…PutUsageControlMutation`)                                 | 1 (B1, B2) |
| 接続機器 status change dialog (detail)                                | `PATCH …/{deviceId}` with `status` + `changedNote`                                                          | `…UpdateMutation`                                                                | 1          |
| 接続機器 delete                                                       | `DELETE /api/v1/admin/connected-devices/{deviceId}`                                                         | `…RemoveMutation`                                                                | 1          |
| 一括状態変更 (bulk status)                                            | `PATCH /api/v1/admin/connected-devices/bulk-status` (Round 2: body `newStatus`, response `items[]`)         | `…BulkStatusMutation`                                                            | 1 → 2      |
| CSV出力 (接続機器 tab)                                                | `GET /api/v1/admin/connected-devices/export` (`storeId` required, `text/csv`)                               | SDK `adminConnectedDeviceControllerExportCsv` (blob)                             | 1 (B4)     |
| 接点制御装置 list + search / status filter / sort / paging            | `GET /api/v1/admin/relay-controllers` (`storeId` optional)                                                  | `adminRelayControllerControllerListOptions`                                      | 1 (B3)     |
| 店舗コード column / detail field (全店舗 scope)                       | `storeCode` / `storeName` on the API-104 list item + detail (Round 2; was a `/admin/stores/{id}` lookup)    | `…RelayControllerControllerListOptions` / `…DetailOptions`                       | 2          |
| Controller picker (device form)                                       | `GET /api/v1/admin/relay-controllers?storeId=` (infinite)                                                   | `adminRelayControllerControllerListInfiniteOptions`                              | 1          |
| Controller store field (controller form)                              | `GET /api/v1/admin/stores` (infinite)                                                                       | `adminStoreControllerListInfiniteOptions`                                        | 1          |
| 接点制御装置 detail                                                   | `GET /api/v1/admin/relay-controllers/{relayControllerId}`                                                   | `adminRelayControllerControllerDetailOptions`                                    | 1          |
| 紐付き機器一覧 tab                                                    | `GET /api/v1/admin/connected-devices?storeId=<ctrl.storeId>&relayControllerId=<id>` (carries `outputPort`)  | `adminConnectedDeviceControllerListOptions`                                      | 1          |
| Device summary card (total / 正常 / 異常)                             | total = `connectedDeviceCount`; 正常 / 異常 = same list with `status=normal                                 | abnormal`, `limit: 1`                                                            | same       | 1   |
| 接点制御装置 新規登録 / 編集 / status change                          | `POST /api/v1/admin/relay-controllers`, `PATCH …/{relayControllerId}` (`expectedUpdatedAt`)                 | `…CreateMutation`, `…UpdateMutation`                                             | 1 (B3)     |
| 接点制御装置 delete (409 when devices remain)                         | `DELETE …/{relayControllerId}` → `E-DEV-011`                                                                | `…RemoveMutation`                                                                | 1          |
| CSV出力 (接点制御装置 tab)                                            | **no endpoint** — button kept, disabled (B8). CSV / files always come from the API, never built client-side | —                                                                                | 2 (B8)     |
| 接点制御装置 変更履歴 tab                                             | **no endpoint**                                                                                             | —                                                                                | 3 (R301)   |

## 3. Blockers carried into Round 2

| ID     | Blocker                                                                                                                                                                                              | Spec says                                                                                                         | Round 1 behaviour (UI kept)                                                                                                                                                                                                                                                                                                                                                                              | Round 2                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **B1** | `outputPort` (relay contact 1–8) is **required when `authMethod≠none`** on POST/PATCH (`E-VAL-001`, gate-svc `assertOutputPort`); unique per controller (`E-DEV-009`). The form has no input for it. | FR-003 lists the create fields — **no 出力ポート**. Spec silent.                                                  | Form unchanged (no field). Body never sends `outputPort`. A create with 会員読取型 / 機器読取型, or an edit that changes なし → another method, fails with `E-VAL-001 field=outputPort`; the seam maps that to a **form-level submit error** `接点出力ポートが未設定のため登録できません（API未対応）`. Edits that do not touch `authMethod` keep the stored port. **Only なし devices can be created.** | **Resolved 2026-10-12 (Q1 = a)** → FE adds 出力ポート in Round 1b (E01–E04); no BE change.                                     |
| **B2** | `allowedServiceType` is **single**; the UI allows several サービス種別.                                                                                                                              | FR-008: 主契約 is 単数Select; サービス種別 count not stated. Prototype: 複数選択可.                               | Checkboxes kept. Schema seam adds a submit-time error on `service_types` when more than one is checked: `現在は1つのみ設定できます（API未対応）` (`TODO(round2) B2`). Exactly one → sent as `allowedServiceType`. Detail renders the single value as a one-item list.                                                                                                                                    | **Q2 = multi.** BE ships `allowedServiceTypes[]` → remove the guard, send the array (R202).                                    |
| **B3** | Controller `status` enum is `active / inactive / maintenance`; the UI has 正常 / 異常 / メンテナンス中 / 廃棄.                                                                                       | FR-007: 状態 is a registration item; **values not listed**. (Device 機器状態 = 4 values, but that is the device.) | Constants switch to the BE enum with **provisional labels** `active=稼働中`, `inactive=停止中`, `maintenance=メンテナンス中` (filter, badge, form select, status dialog). Labels live in one map in `controllers/_constants/constants.ts`, `TODO(round2) B3`.                                                                                                                                            | **Q3 = 4 values.** BE extends the API-104 enum → restore 正常 / 異常 / メンテナンス中 / 廃棄 (R203).                           |
| **B4** | Device list / export require `storeId`.                                                                                                                                                              | FR-001: "選択した店舗に設置されている接続機器の一覧". Actors: HQ "全店舗の機器…閲覧".                             | Single-store header scope: unchanged. **全店舗 scope** with no 店舗 filter: list query disabled, table shows empty state `店舗を選択してください`, CSV button disabled with tooltip, 接続機器 tab count shows `—`. Choosing a store in the filter loads normally; the 店舗 column stays (prototype `isAllStores`).                                                                                       | **Q4 = all-stores.** BE makes `storeId` optional (list + export) → drop the gate (R204).                                       |
| **B5** | `changedBy.name` is always `null` on status history.                                                                                                                                                 | FR-012: 機器状態変更履歴の記録・参照. Prototype column 操作者.                                                    | 操作者 column renders `—` when `name` is null (never the raw `staffId`).                                                                                                                                                                                                                                                                                                                                 | **Closed in Round 2** — `changedBy {id, name}` typed and joined (BE `7cfa6333`); `—` only when `name` is null.                 |
| **B6** | No store-scope enforcement (`E-DEV-100` not wired) on any device/controller endpoint — only role (`E-DEV-101`).                                                                                      | 権限マトリクス: Manager 管轄店舗, Staff / Observer 所属店舗.                                                      | No FE change: lists already send the header-scope `storeId`. Direct-URL access to another store's record is **not** blocked (BE security gap, reported, not an FE defect).                                                                                                                                                                                                                               | **Closed in Round 2** — BE `f12f07bf` enforces scope; verified live (Manager: 403 `E-DEV-100` / 404 `E-DEV-001`).              |
| **B7** | IDs are UUIDs; `q` matched name / serial / location only (device id added by backend `6e600613` — **closed 2026-10-12**, see §8 Q7).                                                                 | FR-001 機器ID column; FR-002 機器ID 部分一致 search; FR-003 / FR-007 自動採番.                                    | ID columns / fields render the **last** 8 chars of the UUID (ids are UUIDv7 — the head is a shared timestamp, verified live) in mono font with the full value in `title`. Search input keeps working via `q`; ID partial match simply does not hit (placeholder unchanged).                                                                                                                              | **Resolved 2026-10-12 (Q7 = b)** — short UUID is final; Round 1b drops the TODOs and 機器ID from the search placeholder (E05). |

| **B8** | No `GET /relay-controllers/export`. | 権限マトリクス has one CSV出力 column for the screen; FR-011 names the 機器台帳. | CSV出力 button stays on the 接点制御装置 tab, **disabled** with tooltip `接点制御装置のCSV出力はAPI未対応です`. **Rule (user, 2026-10-08): CSV / files always come from the API — never generated client-side.** | **Q8 = a.** BE adds `GET /relay-controllers/export` → wire it (R209). |
| **B9** | `RelayControllerListItemDto` has **no `ipAddress`** — only the detail carries it (gate-svc `toItem` vs `toDetail`). Found while implementing; `sort=ipAddress` is accepted but the value is not returned. | FR-007: 接点制御装置一覧 has 9 columns incl. IPアドレス. | Column kept; cells render `---` (`TODO(round2) B9`). The device-form controller picker shows 装置ID tail + 設置場所 instead of IP. No per-row detail fan-out. | **Closed in Round 2** — list item carries `ipAddress` (BE `71200802`). |

### 3b. Spec'd but not built

| ID     | FR     | What the spec defines                                    | Missing in                                                                                                                                      |
| ------ | ------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | FR-013 | 機器利用ログの参照 (auth success/failure history), Could | Code, prototype and API. Note the spec's own 制限事項 says the usage history is kept but **not viewable** in CRM (#402) — likely stays unbuilt. |

## 4. Decisions

| ID      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1**  | **No mapper layer.** Components import `ConnectedDeviceDto`, `ConnectedDeviceDetailDto`, `RelayControllerListItemDto`, `RelayControllerDetailDto`, `DeviceStatusHistoryEntryDto` from `@/lib/api-real/types.gen` and read fields directly (precedent: staffs, FC company round 1).                                                                                                                                                                                                                                                                                                                                                                   |
| **D2**  | Form field names stay as they are (device form snake_case, controller form camelCase — they are RHF keys). `equipment-form.util.ts` / `controller-form.util.ts` remain the only BE↔form seams.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **D3**  | **Create = 2 calls.** `POST /connected-devices` (no rule) then `PUT …/usage-control`. If the PUT fails, the device exists without a rule: navigate to its **edit** page so the user can retry; the global `MutationCache` toast shows the error. (BE ask to accept the rule on POST: Q9.)                                                                                                                                                                                                                                                                                                                                                            |
| **D4**  | **Edit = PATCH dirty fields** (existing `equipmentFormValuesToPatchBody`), then `PUT usage-control` only when `usage_control_rule` is dirty. `deviceType` is immutable on PATCH (`E-VAL-001`) → the 機器タイプ select is disabled in edit mode and never sent.                                                                                                                                                                                                                                                                                                                                                                                       |
| **D5**  | Usage-rule mapping: `main_enabled` ↔ `isMainContractRequired`; `main_contract_type` ↔ `allowedContractType` (BE enum `general…special`); `service_types[0]` ↔ `allowedServiceType` (BE enum `protein…shower`). Unchecked axis sends `null`. The BE's own guard (both off / contractType without main) matches the existing schema rule.                                                                                                                                                                                                                                                                                                              |
| **D6**  | **主契約タイプ options** become the BE enum, labelled from the existing contracts map (`src/app/(private)/contracts/_constants/constants.ts`, e.g. `general=通常会員`, `oneDay=1Day Pass`) — replaces the prototype's dummy スタンダード / プレミアム / ライト. JOYFIT-only types on a FIT365 store return `E-DEV-006` → inline error on 主契約タイプ.                                                                                                                                                                                                                                                                                               |
| **D7**  | **サービス種別 labels**: `protein=プロテイン, supplement=サプリメント, tanning=日焼け, collagen=コラーゲン, hydrogen_water=水素水, body_planner=体組成計, shower=シャワー` (prototype labels, G-02 order). `Record<ServiceType, string>` keyed on the DTO enum so a BE enum change fails `tsc`.                                                                                                                                                                                                                                                                                                                                                      |
| **D8**  | **Page size** options `[25, 50, 100]` for both lists (prototype 9/17 + BE `limit ≤ 100`); default stays 50 for devices / controllers as today. URL values above 100 fall back to the default.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **D9**  | **Sort keys** = intersection with the BE enums. Devices: `name, deviceType, serialNumber, ipAddress, macAddress, location, installedOn, status, authMethod, updatedAt`; default ~~`deviceType asc` (BE default)~~ **`createdAt desc`** (updated 2026-10-22 — spec 029 Session 2026-10-22; `createdAt` is a hidden key with no column). 接続機器ID / 店舗 / 紐づき契約種別 headers become non-sortable. Controllers: `name, ipAddress, firmwareVersion, controlPortCount, connectedDeviceCount, status`; 装置ID / 店舗コード / 設置場所 non-sortable; default ~~`name asc`~~ **`createdAt desc`** (updated 2026-10-22 — spec 008 Session 2026-10-22). |
| **D10** | **Counts**: list result count = `pagination.totalItems`; device filter banner baseline = `totalAllItems` (`includeTotalAll: true`) — returned live but missing from the shared `PaginationDto` schema, so it is read through one seam (`getTotalAllItems`). The controller list has no filter banner, so no baseline query is needed. Layout tab counts = `limit: 1` list queries (B4 applies to the device count).                                                                                                                                                                                                                                  |
| **D11** | **Errors by `code`** (never Japanese substrings): `E-DEV-003` → シリアルナンバー; `E-DEV-004` → 認証方式; `E-DEV-008` → 接続先接点制御装置; `E-DEV-009` / `E-VAL-001 field=outputPort` → form-level (B1); `E-DEV-006` → 主契約タイプ; `E-DEV-013` → controller IPアドレス; `E-DEV-012` → 制御ポート数; `E-DEV-014` → stale-edit message + refetch; `E-DEV-011` → existing 削除不可 dialog copy; `E-DEV-005` → bulk dialog message. Other codes fall through to the global toast.                                                                                                                                                                     |
| **D12** | **No duplicate error toasts**: delete every local `onError: () => toast.error(...)` on the migrated mutations; mutations that render the error inline pass `meta: { suppressErrorToast: true }`. Success toasts stay.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **D13** | **Optimistic lock**: controller PATCH always sends `expectedUpdatedAt = detail.updatedAt`. Device PATCH has no lock field.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **D14** | **Bulk status**: BE is all-or-nothing and rejects a device already in the target status (`E-DEV-005`). The dialog shows "N件中 M件を変更（K件は既に同じ状態）", sends only the M ids, and disables 実行 when M = 0. Success toast uses `updated`. `changedReason` not sent (no UI for it).                                                                                                                                                                                                                                                                                                                                                           |
| **D15** | **廃棄 rows are listed**: OpenAPI says `discarded` is hidden unless `includeDiscarded=true`, but the repository does not filter it (verified in `connected-device.repository.ts`). Keep current behaviour (廃棄 visible, filterable). Verify in the smoke run.                                                                                                                                                                                                                                                                                                                                                                                       |
| **D16** | **Controller devices tab + 紐付き機器サマリー** share one query: `GET /connected-devices?storeId&relayControllerId&limit=100&sort=outputPort` (carries `outputPort` for 接点番号; a controller drives ≤ 8 outputs). The summary's 合計 is `connectedDeviceCount`; 正常 / 異常 are counted from that list (no extra `limit: 1` queries).                                                                                                                                                                                                                                                                                                              |
| **D17** | **店舗コード / 店舗名 for controllers**: API-104 carries `storeId` only. `useStoreLookup` fetches `GET /admin/stores/{id}` once per distinct store on the page (`staleTime` 5 min, shared cache) — cheaper than paging the whole store master. Used by the list (店舗コード column under 全店舗), the detail subtitle and 基本情報. The edit form's store field resolves its own label by id.                                                                                                                                                                                                                                                        |
| **D18** | **Device detail controller card** reads `detail.relayController` (name, model, firmwareVersion, ipAddress, status). Its status uses the controller label map (B3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **D19** | **Read-only / role gating** unchanged (Trainer → 403 page, Observer → read + CSV only). BE returns `E-DEV-101` for the same matrix.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **D20** | **Cache invalidation**: `equipment-cache.util.ts` / `controller-cache.util.ts` switch to the real query keys (`…ListQueryKey`, `…DetailQueryKey`, `…HistoryQueryKey`); a device write also invalidates the controller list/detail (device count).                                                                                                                                                                                                                                                                                                                                                                                                    |

## 5. Round 1 tasks

Paths below are relative to `src/app/(private)/(equipment-management)/`.

### Phase A — foundations

| ID      | File                                                                                      | Change                                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 [P] | `equipment/_constants/constants.ts`                                                       | Types from `ConnectedDeviceDto`; add `MAIN_CONTRACT_TYPE` options (D6), `SERVICE_TYPE_LABELS` (D7); delete dummy option arrays; helper `deriveContractLinkTypes(dto)` (main / service).    |
| A02 [P] | `controllers/_constants/constants.ts`                                                     | Status enum from `RelayControllerListItemDto['status']`, provisional labels + badge map (B3).                                                                                              |
| A03     | `equipment/_schemas/equipment-form.schema.ts`                                             | Enum values from DTO types; `service_types` length > 1 submit error (B2).                                                                                                                  |
| A04     | `controllers/_schemas/controller-form.schema.ts`                                          | `CONTROLLER_STATUS_VALUES` = BE enum.                                                                                                                                                      |
| A05     | `equipment/_utils/equipment-form.util.ts`                                                 | `detailToFormValues(ConnectedDeviceDetailDto)`, `toCreateBody` (`CreateConnectedDeviceDto`, no rule), `toPatchBody` (no `deviceType`), `toUsageControlBody` (D5); B1 error mapping helper. |
| A06     | `controllers/_utils/controller-form.util.ts`                                              | Real create/update DTOs; `expectedUpdatedAt` (D13).                                                                                                                                        |
| A07 [P] | `equipment/_utils/equipment-cache.util.ts`, `controllers/_utils/controller-cache.util.ts` | Real query keys (D20).                                                                                                                                                                     |
| A08 [P] | new `_utils/device-error.util.ts`                                                         | `E-DEV-*` → field / message map (D11), shared by both forms.                                                                                                                               |

### Phase B — lists, detail, layout

| ID  | File                                                                                                                               | Change                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| B01 | `layout.tsx`                                                                                                                       | Tab counts via `limit: 1` list queries; device count `—` under 全店舗 (B4).                                               |
| B02 | `equipment/_hooks/use-equipment-filters.ts`                                                                                        | Real query params, sort set + default (D9), limits (D8), `includeTotalAll`, `enabled` gate for 全店舗 without store (B4). |
| B03 | `equipment/page.tsx`, `equipment/_components/equipment-filters.tsx`                                                                | Real list hook; 店舗を選択してください empty state (B4); banner baseline (D10); store filter uses real store list.        |
| B04 | `equipment/_components/equipment-table-columns.tsx`                                                                                | DTO fields; short UUID (B7); 紐づき契約種別 derived (A01); non-sortable headers (D9).                                     |
| B05 | `equipment/_components/equipment-bulk-status-dialog.tsx`, `_hooks/use-equipment-bulk-status.hook.ts`                               | Real mutation; pre-filter selection (D14); drop local error toast (D12).                                                  |
| B06 | `_components/equipment-csv-export-button.tsx`                                                                                      | Devices: real export blob; disabled under B4. Controllers: disabled, API未対応 (B8).                                      |
| B07 | `equipment/[id]/page.tsx` + `info-card`, `status-card`, `usage-rule-card`, `controller-card`, `meta-card`, `basic-info-tab`        | Flat DTO; `outputPort` for 接点制御先番号; usage-rule card from D5 fields; controller card from `relayController` (D18).  |
| B08 | `equipment/[id]/_components/equipment-history-tab.tsx`                                                                             | Real history hook (paged); 操作者 `—` (B5); `changedReason` label when present.                                           |
| B09 | `equipment/[id]/_components/equipment-status-dialog.tsx`, `equipment-delete-dialog.tsx`                                            | Real mutations; drop local error toasts.                                                                                  |
| B10 | `controllers/_hooks/use-controller-filters.ts`, `controllers/page.tsx`, `controller-filters.tsx`, `controller-table-columns.tsx`   | Real list; sort (D9); limits (D8); baseline query (D10); 店舗コード map (D17); short UUID (B7).                           |
| B11 | `controllers/[id]/page.tsx`, `controller-info-card`, `controller-status-card`, `controller-meta-card`, `controller-basic-info-tab` | Real detail; labels (B3).                                                                                                 |
| B12 | `controllers/[id]/_components/controller-devices-tab.tsx`, `controller-device-summary-card.tsx`                                    | D16 list; summary counts (mapping table).                                                                                 |
| B13 | `controllers/[id]/_components/controller-status-dialog.tsx`, `controller-delete-dialog.tsx`                                        | PATCH `status` + `expectedUpdatedAt`; `E-DEV-011` copy; 変更理由 field commented out (R301).                              |

### Phase C — forms

| ID  | File                                                                                                                                 | Change                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | `equipment/create/page.tsx`                                                                                                          | POST → PUT usage-control (D3); B1 error surface; inline errors (A08).                                                                                                                         |
| C02 | `equipment/[id]/edit/page.tsx`                                                                                                       | PATCH (+ PUT) (D4); 機器タイプ disabled in edit.                                                                                                                                              |
| C03 | `equipment/_components/equipment-form-basic-info.tsx`, `-connection.tsx`, `-usage-rule.tsx`, `-remarks.tsx`, `controller-picker.tsx` | Real enums / labels (D6, D7); picker on real controller list by `storeId`; picker `:port` commented out (R303); maxLength = BE (`name 100`, `serialNumber 100`, `location 200`, `note 1000`). |
| C04 | `controllers/create/page.tsx`, `controllers/[id]/edit/page.tsx`, `controller-form.tsx`, `controller-store-field.tsx`                 | Real create / update; store field on real store list; maxLength 255 / note n/a; `storeId` read-only on edit (immutable in BE).                                                                |

### Phase D — verification

| ID  | Task                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | `npm run type-check` = 0 errors; `npm run lint` clean; no remaining import from `@/lib/api` / `@/lib/api/types.gen` under the scope.                                                                                                                                                                                                                                                                                |
| D02 | Grep deep links into `/equipment` and `/controllers` (`navigate(`, `parseAsInteger`) from other screens; fix any id-type assumptions.                                                                                                                                                                                                                                                                               |
| D03 | Live smoke on `NEXT_PUBLIC_REAL_API_URL` (dev server on :3001, `run_in_background`): device list → search → each filter → sort → paging → row select → bulk → detail → history → create (なし, and 会員読取型 to record B1) → edit → status change → delete; controller list → detail → devices tab → create → edit (+ stale `E-DEV-014`) → delete with devices (`E-DEV-011`); one Observer case (read + CSV only). |
| D04 | Decide live: B4 (`storeId` missing → 400?), D15 (廃棄 visible?), B1 (exact error shape for missing `outputPort`).                                                                                                                                                                                                                                                                                                   |
| D05 | Append **Round 1 result** to this file; update each sub-feature `checklists/parity.md` only where real-API behaviour changes a checked item (status labels B3, page size, 全店舗 empty state B4).                                                                                                                                                                                                                   |

## 5b. Round 1b — FE follow-up from the 2026-10-12 decisions

No BE dependency; implement before Round 2. Paths relative to `src/app/(private)/(equipment-management)/`.

| ID  | File                                                          | Change                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E01 | `equipment/_schemas/equipment-form.schema.ts`                 | Add `output_port` (`number \| null`); required when `auth_method ≠ none`, must be empty when `none`.                                                                                                                         |
| E02 | `equipment/_utils/equipment-form.util.ts`                     | `detailToFormValues` reads `outputPort`; create / patch bodies send `outputPort` (`null` for なし, dirty-only on PATCH); delete the B1 form-level error mapping.                                                             |
| E03 | `equipment/_components/equipment-form-connection.tsx`         | 出力ポート Select 1…min(8, controller `controlPortCount`); ports used by other devices on the chosen controller disabled (devices list by `relayControllerId`, own port kept on edit); cleared on controller change or なし. |
| E04 | `_utils/device-api.util.ts` (`E-DEV-*` map)                   | `E-DEV-009` and `E-VAL-001 field=outputPort` → inline error on 出力ポート.                                                                                                                                                   |
| E05 | `equipment/_components/equipment-filters.tsx` + B7 call sites | Placeholder `機器名、シリアル、設置場所で検索`; every `TODO(round2) B7` becomes a plain comment (short UUID is final).                                                                                                       |
| E06 | Verification                                                  | type-check + lint; live: create 会員読取型 with a port (201), duplicate port on the same controller (`E-DEV-009` inline), edit なし → 会員読取型, edit 会員読取型 → なし (port cleared).                                     |

## 6. Round 2 backlog

| ID       | Closes | When the API / spec lands, delete or change                                                                                                                                                                                                                       |
| -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~R201~~ | B1     | **Moved to Round 1b** (E01–E04) — no BE dependency.                                                                                                                                                                                                               |
| ~~R202~~ | B2     | **Done 2026-10-16.** When API-103 takes `allowedServiceTypes[]` (PUT usage-control + detail / list DTOs): remove the `service_types.length > 1` guard, send / read the array, refresh codegen.                                                                    |
| ~~R203~~ | B3     | **Done 2026-10-16.** When API-104 ships the 4-value enum: replace the provisional 3-value map with 正常 / 異常 / メンテナンス中 / 廃棄 (filter, badge, form, status dialog, device controller card) and restore the 異常 row highlight in `controllers/page.tsx`. |
| ~~R204~~ | B4     | **Done 2026-10-16.** Remove the 全店舗 `enabled` gate, empty state and disabled CSV; device tab count un-dashed.                                                                                                                                                  |
| ~~R205~~ | B5     | Remove the `—` fallback for `changedBy.name`. **Done 2026-10-12.**                                                                                                                                                                                                |
| ~~R206~~ | B6     | No code — re-run the direct-URL cross-store case. **Done 2026-10-12.**                                                                                                                                                                                            |
| ~~R207~~ | B7     | **Closed 2026-10-12** — short UUID is final (Q7 = b); cleanup in Round 1b E05.                                                                                                                                                                                    |
| ~~R208~~ | Q9     | **Done 2026-10-16.** Collapse create into one POST if BE accepts the rule on create.                                                                                                                                                                              |
| ~~R209~~ | B8     | **Done 2026-10-16.** Wire the controller CSV to `GET /relay-controllers/export` and drop the disabled state + tooltip.                                                                                                                                            |
| ~~R210~~ | B9     | Render `ipAddress` in the controller list column and the device-form picker; delete the `---` placeholder. **Done 2026-10-12.**                                                                                                                                   |

### 6b. Round 3 backlog (phase 2)

| ID       | Prototype element                                                                                                             | Why out                                                                                              | Commented out in Round 1                                                                                                                        | Needs                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| ~~R301~~ | **Done in Round 2b (2026-10-16, user decision)** — 接点制御装置 変更履歴 tab + 変更理由 field in the controller status dialog | FR-007 defines the 変更履歴 tab for the **connected-device** detail only; no controller history API. | `controllers/[id]/page.tsx` (history TabsTrigger/Content), `controller-history-tab.tsx` (unused), `controller-status-dialog.tsx` (reason field) | Spec line for controller history + `GET /relay-controllers/{id}/status-history` |
| R302     | 最終確認日時 on the device status card                                                                                        | Not in E-02.                                                                                         | `equipment/[id]/_components/equipment-status-card.tsx`                                                                                          | Spec definition + API field                                                     |
| R303     | `IP:ポート` (controller HTTP port) on the device controller card and controller picker                                        | Port is not an FR-007 item; BE `httpPort` is always null (source-column gap).                        | `equipment-controller-card.tsx`, `controller-picker.tsx` (`:port` only — IP stays)                                                              | Spec definition + column                                                        |

## 7. Out of scope / not built

- API-only fields with no spec line: controller `model`, `serialNumber`, `installedOn`, `secretArn`, `note`; `changedReason` input. Not surfaced.
- Device `qrId` is now surfaced (2026-11-03) in the detail screen's QRコード modal (header button). The modal renders the API's `qrPayload` as a QR (payload hidden, hover tooltip only; PNG download); the CRM does not build the string. The sticker format is `<brandGroup lower-case>://x-callback-url/unlock?major=<store.clubCode>&minor=<qrId>`, with 発行 / 再発行 calling `POST /api/v1/admin/connected-devices/{deviceId}/qr-id`. See `006-equipment-detail/spec.md` Session 2026-11-03.
- QR sticker events in the device 変更履歴 (2026-11-07): each 発行 / 再発行 is a status-history row with `changedReason` `qr_create` / `qr_change` and an unchanged status (BE-REQUESTS No.27). `equipment-history-tab.tsx` renders it as one QR-icon badge (`EQUIPMENT_QR_HISTORY_LABELS` / `isQrHistoryReason` in `_constants/constants.ts`), 変更理由 `—`; `equipment-qr-dialog.tsx` invalidates `adminConnectedDeviceControllerHistoryQueryKey` after the mutation. No client regeneration — `changedReason` is already `string`. See `006-equipment-detail/spec.md` Session 2026-11-07.
- `controlPortCount` max stays 64 in the form (BE has no max). Note `outputPort` is capped at 8 by the BE regardless of the controller's port count (Q1).

## 8. Resolved questions

PO decisions, 2026-10-12. Written into the sub-feature specs (`### Session 2026-10-12` under `## Clarifications`).

| Q   | Decision                                                                                                                                                                                                          | Spec updated                                 | Next step                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------- |
| Q1  | **(a) Add 出力ポート to the device form** — Select 1–8, required when 認証方式 ≠ なし, cleared when なし, taken ports disabled.                                                                                   | 007 (supersedes the 2026-09-08 removal), 006 | FE Round 1b E01–E04          |
| Q2  | **(a) サービス種別 stays multi-select.**                                                                                                                                                                          | 007, 006                                     | **BE ask** → Round 2 (R202)  |
| Q3  | **(b) Controller 状態 = prototype's 4 values** 正常 / 異常 / メンテナンス中 / 廃棄.                                                                                                                               | 008                                          | **BE ask** → Round 2 (R203)  |
| Q4  | **(a) 全店舗 view for System / HQ** on the device list and export.                                                                                                                                                | 029                                          | **BE ask** → Round 2 (R204)  |
| Q7  | **(b) Short UUID is final** (ID format is the BE's call). 機器ID search **kept**: API-103 `q` matches the device id (backend `6e600613`, verified live 2026-10-12); API-104 `q` does not match the controller id. | 029, 006, 008                                | FE Round 1b E05; R207 closed |
| Q8  | **(a) Controller CSV is required.**                                                                                                                                                                               | 029, 008                                     | **BE ask** → Round 2 (R209)  |

### BE asks raised by these decisions

1. **API-103 `PUT /connected-devices/{id}/usage-control`** — accept `allowedServiceTypes: ServiceType[]` (OR semantics) instead of the single `allowedServiceType`; return the array on `ConnectedDeviceDto` / `ConnectedDeviceDetailDto`. (Q2)
2. **API-104 relay-controller `status`** — replace `active | inactive | maintenance` with four values matching 正常 / 異常 / メンテナンス中 / 廃棄 (e.g. `normal | abnormal | maintenance | discarded`, same as the device enum); migrate existing `active` / `inactive` rows. (Q3)
3. **API-103 `GET /connected-devices` and `GET /connected-devices/export`** — make `storeId` optional for System / HQ (all stores), still required / scoped for Manager / Staff / Observer. gate-svc already treats it as optional; BFF-only change. (Q4)
4. **API-104 `GET /relay-controllers/export`** — new CSV export with the list's filters and store scope (9 FR-007 columns). (Q8)
5. Still open from §9: Q9 rule on POST, Q10 `includeDiscarded` doc (the reverse-lookup endpoint now honours it; the device list still has no such param). Q5, Q6 and B9 closed in Round 2.

## 9. Confirmation needed (open questions)

Each question lists the evidence, the options, a recommendation, what Round 1 does until it is
answered, and which rows change. Spec-shaped ones (Q1–Q4, Q7, Q8) go through `speckit-clarify` and
are then written into the sub-feature `spec.md` (`## Clarifications` → `### Session YYYY-MM-DD`).

### Q1 — 出力ポート (relay output port) on device create/edit · **blocking create** · Spec + BE

> **Resolved 2026-10-12 — see §8.**

- **Evidence**: `CreateConnectedDeviceDto.outputPort` (1–8, nullable). gate-svc `connected-device.service.ts#assertOutputPort`: `authMethod≠none` and port null → `E-VAL-001 {field: outputPort, code: required}`; `authMethod=none` and port set → `E-VAL-001`. Uniqueness per controller → `E-DEV-009`. Re-validated on PATCH whenever `authMethod` or `outputPort` changes. The relay dispatcher (`relay-dispatch.client.ts`) uses it to pick which contact to fire, i.e. it is **physical wiring**.
- **Spec**: E-02 FR-003 field list has no port. Prototype has no input. The old mock showed a read-only 接点制御先番号 assigned "server-side" — the real BE does not assign it.
- **Options**:
  - (a) **Add 出力ポート to the form** (Select 1–8, required when 認証方式 ≠ なし, disabled + cleared when なし; ports already used on the chosen controller greyed out from the devices list). Spec change via `speckit-clarify`.
  - (b) BE auto-assigns the lowest free port when omitted (FE unchanged) — but the result may not match the physical wiring.
  - (c) Leave as is — only なし devices can be registered.
- **Recommendation**: (a). The value must match how the device is wired; neither FE nor BE can guess it.
- **Round 1 until answered**: B1 (form-level error for 会員読取型 / 機器読取型 create).
- **Affects**: B1, R201, C01–C03, B07 (detail shows `outputPort` already), A05.

### Q2 — サービス種別: single or multiple? · Spec + BE

> **Resolved 2026-10-12 — see §8.**

- **Evidence**: `PutDeviceUsageControlDto.allowedServiceType` — single enum, nullable. Prototype `equipment-form.tsx`: 「サービス種別（複数選択可）」 checkboxes, help text 「複数選択可・いずれか1つを満たせば起動許可」. FR-008 explicitly marks only 主契約 as **単数Select**; for サービス種別 it says 「指定したサービス種別に該当するオプション契約が有効であれば起動許可」 without a count. Business examples (水素水 / Tanning / Protein) are all one type per device.
- **Options**: (a) keep multi → BE changes to `allowedServiceTypes: string[]`; (b) spec settles on single → checkboxes become a Select.
- **Recommendation**: ask the PO; if they cannot name a real device needing two service types, (b) is cheaper and matches the BE.
- **Round 1 until answered**: B2 (multi UI, submit blocked when > 1).
- **Affects**: B2, R202, A03, A05, C03, B07 usage-rule card.

### Q3 — 接点制御装置 status values and labels · Spec + BE

> **Resolved 2026-10-12 — see §8.**

- **Evidence**: BE enum `active | inactive | maintenance` (`gate-svc/prisma/schema.prisma` `relay_controllers.status`, default `active`). Prototype `controller-list-panel.tsx`: 正常 / 異常 / メンテナンス中 / 廃棄 (copied from the device statuses). FR-007 lists 状態 as an item without values.
- **Options**:
  - (a) Follow the BE: 3 values with labels `稼働中 / 停止中 / メンテナンス中` (or `正常 / 停止 / メンテナンス中`).
  - (b) Keep the prototype's 4 values → BE adds `error` and `discarded` (and decides what `inactive` means for existing rows).
- **Recommendation**: (a) — the controller has no 死活監視 in CRM (制限事項: status is manual), so 異常 vs 停止 adds little; 廃棄 is covered by delete.
- **Round 1 until answered**: B3 with the provisional labels `稼働中 / 停止中 / メンテナンス中`.
- **Affects**: B3, R203, A02, A04, B10, B11, B13, D18, parity checklist of 008.

### Q4 — 全店舗 scope on the 接続機器 list · Spec + BE

> **Resolved 2026-10-12 — see §8.**

- **Evidence**: BFF `admin-connected-device.controller.ts` `@ApiQuery storeId required` ("§4.1 required — the list is per-store"); the gate-svc list/filter/repository already treat `storeId` as optional (`(q.storeId) || undefined`), so lifting it is a BFF-only change. Prototype (9/8) shows a 店舗 column and HQ total 6 under 全店舗. FR-001 says 「選択した店舗」; the actor table says HQ 「全店舗の機器…閲覧」.
- **Options**: (a) BE makes `storeId` optional for System/HQ (export too) → full 全店舗 view; (b) spec confirms per-store only → keep the Round 1 empty state permanently and drop the 店舗 column.
- **Recommendation**: (a) — matches the prototype and the controller list (whose `storeId` is already optional).
- **Round 1 until answered**: B4 (store must be picked under 全店舗).
- **Affects**: B4, R204, B01–B03, B06.

### Q5 — 操作者 name in status history · BE only

> **Resolved 2026-10-12 by the BE (`7cfa6333`) — closed in Round 2.**

- **Evidence**: OpenAPI and gate-svc both state `changedBy.name` is always `null` ("staff lookup lives in auth-svc and is not wired in").
- **Ask**: BE joins the staff display name. FE fan-out to `/admin/staffs/{id}` is not an option: Staff / Observer roles cannot read the staffs API.
- **Round 1**: `—`. **Affects**: B5, R205, B08.

### Q6 — store-scope enforcement · BE only (security)

> **Resolved 2026-10-12 by the BE (`f12f07bf`) — verified live in Round 2.**

- **Evidence**: gate-svc service header comment: "the staff_stores scope check (E-DEV-100) need[s]…" — only `requireRead` / role checks run. 権限マトリクス requires 管轄店舗 / 所属店舗 for Manager / Staff / Observer.
- **Ask**: wire `E-DEV-100` on every device and controller endpoint.
- **Round 1**: no FE change; cross-store direct-URL cases graded Block (BE), not NG. **Affects**: B6, R206.

### Q7 — 機器ID / 装置ID display and search · Spec + BE

> **Resolved 2026-10-12 — see §8.**

- **Evidence**: `id` is a UUID in both DTOs; no display code column; `q` = name / serial / location only (repository `whereFrom`). FR-001 / FR-007 list an ID column, FR-002 a 機器ID partial-match search, FR-003 「機器IDはシステムが自動採番」. The legacy `qrId` (sticker number) is a different concept.
- **Options**: (a) BE adds a sequential display code (e.g. `EQ-0001`, `RC-0001`) and includes it in `q`; (b) spec accepts the UUID — FE shows a short form and drops ID from the search description.
- **Recommendation**: (a) if field staff quote IDs on the phone / in tickets; otherwise (b).
- **Round 1 until answered**: B7 (last 8 chars — ids are UUIDv7 — + full in tooltip).
- **Affects**: B7, R207, B04, B10, B07, B11.

### Q8 — CSV for the 接点制御装置 tab · Spec + BE

> **Resolved 2026-10-12 — see §8.**

- **Evidence**: no `/relay-controllers/export`. FR-011 is 「**機器台帳**のCSVエクスポート」 (connected devices); 権限マトリクス has one CSV出力 column. The current shared button exports whichever tab is active.
- **Rule (user, 2026-10-08)**: CSV and files always come from the API; FE never builds them. Client-side generation is therefore not an option.
- **Options**: (a) BE adds `GET /relay-controllers/export`; (b) spec settles CSV on the 接続機器 tab only → hide the controller button.
- **Recommendation**: ask the PO; (b) if the controller ledger is not needed.
- **Round 1 until answered**: B8 (button disabled with API未対応 tooltip).
- **Affects**: B8, B06, R209, mapping table.

### Q9 — atomic create (device + usage rule) · BE, low priority

- **Evidence**: `CreateConnectedDeviceDto` has no rule fields; the rule is a separate `PUT …/usage-control`. FR-003 lists 紐づき契約種別 as **required** on registration, so a device can exist without a rule if the second call fails.
- **Ask**: accept `isMainContractRequired / allowedContractType / allowedServiceType` on POST.
- **Round 1**: D3 (two calls, redirect to edit on PUT failure). **Affects**: D3, R208.

### Q10 — `includeDiscarded` documentation · BE, info only

- **Evidence**: OpenAPI says `discarded` rows are hidden unless `includeDiscarded=true`, but the list has no such param and the repository does not filter by it.
- **Ask**: BE fixes the description (or the behaviour). FE relies on current behaviour (D15); confirmed in the smoke run.

## Round 1 result (2026-10-08)

### Shipped

- **Phase A** — shared `_utils/device-api.util.ts` (`E-DEV-*` codes, `E-VAL-001` field reader,
  single codegen cast `toCodegenNullable`, `getTotalAllItems`, `formatShortId`) and
  `_hooks/use-store-lookup.ts`; device constants keyed on the API-103 enums (主契約タイプ reuses the
  contracts map, サービス種別 labels per D7) with `satisfies` drift checks; controller status = BE
  enum with provisional labels (B3); form seams rewritten for `CreateConnectedDeviceDto` /
  `UpdateConnectedDeviceDto` / `PutDeviceUsageControlDto` / `Create|UpdateRelayControllerDto`
  (incl. `expectedUpdatedAt`); cache utils on the real query keys (list families matched by
  operation id because the device list key requires `storeId`).
- **Phase B** — layout counts, device list (B4 gate + empty state, sort/limit per D8/D9, banner
  baseline), filters on the real store master, columns, bulk status, device detail (flat DTO,
  `outputPort`, usage-rule card from the rule fields, controller card from `relayController`),
  history (paged, B5), device status dialog on `PATCH` (+`changedNote`), controller list / detail /
  devices tab / summary card, controller status dialog (`expectedUpdatedAt`) and delete
  (`E-DEV-011` copy; detail query removed after unmount to avoid a 404 refetch).
- **Phase C** — device create = `POST` → `PUT usage-control` (D3), edit = `PATCH` dirty fields →
  `PUT` when the rule is dirty (D4), 機器タイプ disabled on edit, controller picker limited to the
  device's store on edit, API maxLengths (100 / 100 / 200 / 1000); controller create / edit with
  inline `E-DEV-013` / `E-DEV-012`, stale `E-DEV-014` handling, store field locked on edit, FW
  version validated against the API pattern.
- **Round 3 comment-outs** — R301 controller 変更履歴 tab + 変更理由 field
  (`controller-history-tab.tsx` kept as a commented-out module), R302 最終確認日時, R303 `:port`.
- Local `onError` toasts removed; mutations that render errors inline use
  `meta: { suppressErrorToast: true }` (D12).
- `029-equipment-list/checklists/parity.md`: PAR020 / 054 / 064 / 075 / 081 re-graded, PAR109
  annotated (200件 dropped by the prototype).

### Verification

- `npm run type-check` → **0 errors**; `eslint` on the scope → clean; Prettier → clean.
- No import from `@/lib/api` remains under the scope except inside the R301 comment block.
- No cross-screen deep links into `/equipment` or `/controllers` exist (only `routes.config.ts`).
- **Live smoke** against `https://api.dev.fitness-v2.okamoto-hd.com` (dev server on :3000, HQ
  account; fixtures created and deleted by the run, seed data untouched except one bulk no-op-safe
  change on the fixture):

| Flow                                                                                     | Result                                                                                                                                               |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controller list under 全店舗 (店舗コード via store lookup, status labels, paging)        | OK — 5 rows, S-00x codes resolved                                                                                                                    |
| Device list under 全店舗, no store                                                       | OK — `店舗を選択してください`, no request, tab count `—`                                                                                             |
| Device list per store (4 stores), search `q`, 機器タイプ, 状態, 異常 pin, sort, limit 25 | OK — all `200`; `equipment_limit=200` falls back to 50                                                                                               |
| Device detail → 変更履歴 → 装置詳細 → 紐付き機器一覧 (接点番号 = `outputPort`)           | OK                                                                                                                                                   |
| Controller create (store picker on the real store master)                                | OK — `POST 201`                                                                                                                                      |
| Device create, 認証方式 なし                                                             | OK — `POST 201` → `PUT usage-control 200`                                                                                                            |
| Device create, 会員読取型                                                                | **B1 confirmed** — `400 E-VAL-001 {field: outputPort, code: required}`; form-level message shown                                                     |
| Device edit with 2 サービス種別                                                          | **B2** guard shown, no request                                                                                                                       |
| Device edit (name + 主契約 通常会員 + 1 サービス種別); 機器タイプ disabled               | OK — `PATCH 200` → `PUT 200`                                                                                                                         |
| Device status change with 変更理由                                                       | OK — `PATCH 200`; history shows the transition + reason, 操作者 `—` (B5)                                                                             |
| Bulk status (1 device)                                                                   | OK — `PATCH bulk-status 200`, toast `1件の状態を「正常」に変更しました`                                                                              |
| Controller delete while devices exist                                                    | OK — button disabled                                                                                                                                 |
| Controller edit in two tabs                                                              | OK — first `PATCH 200`, second refused (`E-DEV-014`) with the stale-edit toast                                                                       |
| Controller status change                                                                 | OK — `PATCH 200`                                                                                                                                     |
| Device delete, then controller delete                                                    | OK — `204` / `204` (a post-delete detail refetch `404` was seen and fixed afterwards)                                                                |
| Observer / Staff on 接点制御装置一覧                                                     | Observer: CSV出力 only, no write buttons. Staff: lists load; 新規登録 not offered — permission flags of the Staff test account, not this integration |

- **Decided live**: **B4** — `GET /connected-devices` without `storeId` → `400 E-VAL-001
{field: storeId, code: required}`. `totalAllItems` is returned (codegen gap only).
  **D15** — inconclusive: store 201 has no 廃棄 devices to observe.
- **Found during implementation**: **B9** (controller list has no `ipAddress`), UUIDv7 ids (short
  id switched to the tail).

### Still TODO(round2) / round3

- `TODO(round2)`: B1 (output port), B2 (single service type), B3 (controller status labels), B4
  (storeId required), B5 (operator name), B7 (display id / search), B8 (controller CSV), B9
  (controller list IP), codegen casts (`toCodegenNullable`, `getTotalAllItems`, usage-control
  nullable enums, `changedBy`, export blob, `previousStatus` nullability).
- `TODO(round3)`: R301, R302, R303.

### Deviations from the plan (deliberate)

- **Q8 / B8** — the plan's Round 1 default (client-side controller CSV) was replaced on user
  instruction: CSV and files always come from the API, so the controller CSV button is disabled.
- **D16 / D17** — simplified as recorded in the Decisions table above (shared device query; per-store
  detail lookup).

## Round 1b result (2026-10-12)

### Shipped

- **E01–E04 (Q1)** — `output_port` added to the device form schema (required unless 認証方式 なし,
  checked with zod `when` so it shows on the first submit); create / PATCH send `outputPort`
  (`null` for なし; PATCH sends it whenever the port, 認証方式 or controller changes, since the
  API re-validates it then); new `equipment/_hooks/use-output-port-options.ts` builds 1…min(8,
  制御ポート数) from the controller detail and marks ports used by other devices (device list by
  `relayControllerId`, own device excluded on edit); 出力ポート Select in 接続情報, disabled for なし
  / no controller, cleared on なし or a controller change; `E-DEV-009` and `E-VAL-001
field=outputPort` render inline on the field. The B1 form-level message and the `submitError`
  footer state on create / edit are gone.
- **E05 (Q7)** — every `TODO(round2) B7` became a plain comment; device search placeholder kept as
  `機器ID、機器名、シリアル、設置場所で検索` (API-103 `q` matches the id — verified live: tail 8 chars,
  upper-case, head and full id all hit; export too; controller `q` on an id → 0); controller picker search placeholder `装置名・設置場所で検索`
  (API-104 `q` = name / model / serial / location, verified in gate-svc
  `relay-controller-admin.repository.ts`).

### Verification

- `npm run type-check` → 0 errors; `eslint` on the scope → clean; Prettier → clean.
- **Live smoke (E06) not run**: the dev backend returned `503` (envoy) on every endpoint at the
  time, so `/auth/crm/login` failed after a successful Cognito sign-in. Handed to the user for a
  manual check.

## Schema refresh (2026-10-12) — type-check broken, Round 2 input

> **Fixed in Round 2** — see the next section.

The user regenerated `src/lib/openapi.real.json` + `src/lib/api-real/**` from the latest backend
(includes `6e600613`: API-103 `q` matches the device id). `npm run type-check` now reports **6
errors**; 5 are in this scope, all caused by changed DTOs. **Not fixed yet** — handled in Round 2
together with a full API-103 / API-104 schema diff and a re-check of B2 / B3 / B4 / B5 / B8 / B9.

| File                                                                  | Error                                                                                                                       | Cause                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `equipment/[id]/_components/equipment-history-tab.tsx:130`            | `historyId` does not exist on `DeviceStatusHistoryEntryDto`                                                                 | History entry DTO no longer carries `historyId`.                       |
| `equipment/_hooks/use-equipment-bulk-status.hook.ts:29-49` (4 errors) | `status` not in `BulkConnectedDeviceStatusDto` (body); `status` / `updated` not in `BulkDeviceStatusResponseDto` (response) | The 一括状態変更 (bulk status) request and response contracts changed. |
| `src/lib/auth/current-user.mapper.ts:147` (outside this scope)        | `Type 'true' is not assignable to type 'never'`                                                                             | Likely the permission key list in the schema changed.                  |

## Round 2 result (2026-10-12)

Re-assessed against `src/lib/openapi.real.json` regenerated from backend `origin/main` `1629762c`
(identical to the dev deployment's `/docs-json` for API-103 / API-104). Spec `fitness-spec@5c391cf`
and prototype `fitness-crm-ui@47423ec` unchanged since Round 1.

### Blocker status

| ID  | Status               | Evidence                                                                                                                                   |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| B5  | **Closed**           | `DeviceStatusHistoryEntryDto.changedBy` → `DeviceStatusChangedByDto {id, name}`, name joined from the staff directory (BE `7cfa6333`).     |
| B6  | **Closed (BE only)** | BE `f12f07bf`: list / export out of scope → 403 `E-DEV-100`; detail / PATCH / DELETE / history → 404 `E-DEV-001` (controller `E-DEV-010`). |
| B9  | **Closed**           | `RelayControllerListItemDto.ipAddress` (BE `71200802`).                                                                                    |
| B2  | Open → **Round 2b**  | `PutDeviceUsageControlDto.allowedServiceType` still single.                                                                                |
| B3  | Open → **Round 2b**  | Controller `status` still `active / inactive / maintenance`.                                                                               |
| B4  | Open → **Round 2b**  | `storeId` still `required` on `GET /connected-devices` and `/export` (BFF).                                                                |
| B8  | Open → **Round 2b**  | No `GET /relay-controllers/export`.                                                                                                        |
| Q9  | Open → **Round 2b**  | `CreateConnectedDeviceDto` still has no rule fields.                                                                                       |

### Shipped

- **Breaking contract changes (BE `7cfa6333`)** — bulk status sends `newStatus` (was `status`), reads
  `items[]` (was `{updated, status}`) for the success toast; bulk 変更理由 `maxLength` 500 (API cap,
  was the app-wide 1000); history rows keyed on `id` (was `historyId`).
- **B5** — 操作者 renders `changedBy.name`; the codegen cast and the always-`—` note are gone.
- **B9** — controller list IPアドレス column reads `ipAddress` (sortable as before); the device-form
  controller picker shows `IP ・ 設置場所 ・ 状態` (the `:ポート` part stays R303).
- **D17 retired** — controller list / detail / edit read `storeCode` / `storeName` from API-104;
  `_hooks/use-store-lookup.ts` deleted; the locked 店舗コード field on edit gets its label from the
  detail (`initialStore`), so no store request is made. Verified live: zero `/admin/stores` calls.
- `controlPortCount` is now nullable → list cell / info card render `---` / `—`.
- New seam `WITHOUT_TRACE_ID_HEADER` in `_utils/device-api.util.ts` (`TODO(round2)`): Swagger marks
  `x-amzn-trace-id` required on bulk-status while the BFF reads it as optional; the FE never invents a
  trace id.
- Outside the scope, needed for a clean gate: `canRegisterSocialDiscountMember` removed from
  `STAFF_PERMISSION_FLAGS` (`src/types/permission.type.ts`) — dropped by the BE in API-082 v0.10
  (`98cf2123`), which broke the drift assertion in `current-user.mapper.ts`.

### Verification

- `npm run type-check` → 0 errors (exit 0); `eslint` on the scope + `permission.type.ts` → clean;
  Prettier → clean.
- **Live smoke** (dev server :3001 + Chromium `--disable-web-security`, backend
  `api.dev.fitness-v2.okamoto-hd.com`; one fixture device created and deleted):

| Flow                                         | Result                                                                                                                                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controller list, 全店舗 (HQ)                 | OK — 店舗コード S-00x and IPアドレス populated, no store fan-out                                                                                                                                                             |
| Controller detail                            | OK — subtitle `<storeName> — <ip>`, 店舗コード from the DTO                                                                                                                                                                  |
| Controller edit                              | OK — locked store field shows `JOYFIT24 札幌北24条 (dev) (S-004)` with no store request                                                                                                                                      |
| Device create page → controller picker       | OK — options `name \| 10.99.0.10 ・ 1F 機械室 ・ 稼働中`                                                                                                                                                                     |
| Bulk status 正常 → 異常 with note (UI)       | OK — `200 {items:[…]}`, no trace header sent, toast `1件の状態を「異常」に変更しました`, textarea max 500                                                                                                                    |
| Device 変更履歴 tab                          | OK — 操作者 `HQ 1` on both rows (install + bulk), bulk note shown as 変更理由                                                                                                                                                |
| Manager scope (B6)                           | OK — device list 200 only for S-003, 403 `E-DEV-100` for the other 21 stores; controller list → S-003 only                                                                                                                   |
| Manager direct URL to an out-of-scope device | API 404 `E-DEV-001`. **Note**: the detail page shows the generic 「接続機器の取得に失敗しました」 + network-error copy rather than a not-found state — pre-existing `DataStateBoundary` behaviour, not a Round 2 regression. |

### Round 2b — still waiting on the BE

R202 (B2), R203 (B3), R204 (B4), R208 (Q9), R209 (B8) unchanged. BE asks to send along:

1. B2 / B3 / B4 / B8 / Q9 — as listed in §8 "BE asks raised by these decisions".
2. `PATCH /connected-devices/bulk-status`: declare `x-amzn-trace-id` optional (`@ApiHeader({ required: false })`) → drop `WITHOUT_TRACE_ID_HEADER`.
3. Codegen defects still behind seams: nullable fields declared `type: object` on `Update*Dto`
   (`toCodegenNullable`); `totalAllItems` missing from the device list's `PaginationDto`
   (`getTotalAllItems`; the controller list now uses `PaginationWithTotalAllDto`); nullable enums on
   `PutDeviceUsageControlDto`; `text/csv` export typed `string`.

### Round 3 note

R303 — the API now returns `httpPort` (list, detail, device `relayController`), but E-02 FR-007 still
does not define the port, so it stays commented out.

## Round 2b result (2026-10-16)

Integrated against the BE running locally (`fitness-backend-v2` branch `dulv/equipment-api-fix-gaps`, on top
of `origin/main` `c82fcbee`, uncommitted; BFF `http://localhost:3000`, DB seeded with
`seed-e02-equipment-dev.sql`), following `fitness-backend-v2/FE-feedback/equipment/BE-REQUESTS.vi.md`
("Hướng dẫn FE ghép với BE local"). Spec `fitness-spec@5c391cf` unchanged; prototype `fitness-crm-ui@f2fe3f9`
(10/7 design refresh — tone badges, 異常 row tint, no scope change). Answers recorded in 007 / 008
`### Session 2026-10-16`.

**Codegen refresh**: `src/lib/openapi.real.json` replaced with the local `/docs-json` →
`npm run generate-api:real`. The local BE carries newer `origin/main` work in other domains (lockers, studios,
sales, …); none of it broke `type-check` outside this scope.

### Blocker status

| ID / BE No.         | Status                                                       | What changed in FE                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B2 / No.12          | **Closed**                                                   | `allowedServiceTypes[]` read and sent; the `> 1` guard is gone; list shows one `サービス種別（○○）` badge per type, detail lists every type.                                                                                                                                                                                                                                      |
| B3 / No.13          | **Closed**                                                   | Controller status = device enum; `CONTROLLER_STATUS_LABELS` / `BADGE_MAP` alias the device maps (type assertion keeps the two enums equal). 異常 rows tinted (prototype f2fe3f9). 廃棄 disabled in the status dialog while devices remain (`E-DEV-011`); the device-form picker hides 廃棄 controllers (`E-DEV-008`).                                                             |
| B4 / No.14          | **Closed**                                                   | `storeId` omitted under 全店舗 with no 店舗 → list / export / tab count cover the caller's scope; empty state, disabled CSV and `—` count removed.                                                                                                                                                                                                                                |
| B8 / No.10          | **Closed**                                                   | 接点制御装置 CSV出力 wired to `GET /relay-controllers/export` (header scope + status / q / sort).                                                                                                                                                                                                                                                                                 |
| Q9 / No.15          | **Closed**                                                   | 新規登録 = one POST carrying the usage rule; the PUT-after-POST fallback and its error path are gone. 編集 keeps PATCH + PUT.                                                                                                                                                                                                                                                     |
| R301 / No.11        | **Shipped** (user decision; FR-007 still silent — PO to add) | `controller-history-tab.tsx` rebuilt on `GET /relay-controllers/{id}/status-history`; tab un-commented; status dialog's 変更理由 → `changedNote`; status change invalidates the history query.                                                                                                                                                                                    |
| No.2                | Verified                                                     | 8 → 4 on QA-E02-CTRL-8 (devices on ports 6/7) → 422 `E-DEV-012`, inline on 制御ポート数 (copy now names the output-port rule).                                                                                                                                                                                                                                                    |
| No.3 / No.5 / No.17 | Verified                                                     | Controller `q=10.250.` matches by IP. No FE change.                                                                                                                                                                                                                                                                                                                               |
| No.8                | **Closed**                                                   | Device IPアドレス validated as IPv4 / IPv6 (zod `ipv4()` / `ipv6()`), optional; `E-VAL-001 field=ipAddress` mapped inline as a fallback.                                                                                                                                                                                                                                          |
| No.9                | **Closed**                                                   | FW version validated with the API regex `^[0-9A-Za-z._-]{1,64}$`; the vN.N.N check (BUG-E02-F-04) and the stored-value exception are gone; helper text kept.                                                                                                                                                                                                                      |
| No.16               | **Closed**                                                   | 廃棄 never offered on 新規登録 (comment updated: settled, not provisional).                                                                                                                                                                                                                                                                                                       |
| No.18–20, 22        | **Closed**                                                   | Seams removed: `WITHOUT_TRACE_ID_HEADER`, `getTotalAllItems`, `toCodegenNullable`, the export Blob cast, the `relayController.status` cast.                                                                                                                                                                                                                                       |
| No.21               | **Open (codegen)**                                           | hey-api still drops `nullable` on the `allowedContractType` enum → one cast left in `toUsageControlBody` (`TODO(round2)`). BE ask: add `null` to the enum list.                                                                                                                                                                                                                   |
| No.4                | No change                                                    | Already gated: `Equipment*` / `Controller*` write permissions map to `canEditFacility` (`src/constants/permission.constants.ts`). Verified: Staff (flag off) sees 編集 / 削除 / ステータス変更 disabled.                                                                                                                                                                          |
| No.6                | **Open (BE / spec conflict)**                                | BE suggests 変更理由 = `changedReason`; spec 006 (§UI traceability, 変更理由 row) says the column shows `changedNote` and `changedReason` is not displayed, so the UI is unchanged. The real defect remains: a bulk change without a reason stores `bulk:<traceId>` in `changedNote`, which the column then shows. Needs a BE fix (leave `changedNote` null) or a PO spec change. |
| No.1                | **Open → separate task** (user decision)                     | `/crm/me` has no `managedStoreIds`; the header store scope (shared `current-store.context.tsx`) falls back to `storeId`, so a Manager sees one store only (local: S-001, cannot switch to S-003). Fix belongs to the shared auth layer (`GET /admin/staff/{id}`).                                                                                                                 |

### Verification

- `npm run type-check` → 0 errors; `eslint` on the scope → clean; Prettier → clean.
- No `TODO(round2)` left except No.21; `TODO(round3)` left: R302, R303.
- **Live smoke** (FE `:3001` with `NEXT_PUBLIC_REAL_API_URL=http://localhost:3000`, magic-link login, headless
  Chromium; one fixture device created and deleted, QA-E02-CTRL 100% toggled 異常 → 正常 → 異常):

| Flow                                                                | Result                                                                                                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HQ 接続機器一覧 under 全店舗                                        | OK — `GET /connected-devices?…` with no `storeId` 200, 9 rows, tab count `9件`, multi サービス種別 badges                                                                                          |
| HQ device CSV under 全店舗                                          | OK — `/connected-devices/export` 200 (no `storeId`), BOM + 17 columns                                                                                                                              |
| HQ 接点制御装置一覧                                                 | OK — 4-value labels, 異常 row `bg-destructive/10`, `q=10.250.` → 4 controllers                                                                                                                     |
| HQ controller CSV                                                   | OK — `/relay-controllers/export` 200, 9 FR-007 columns, enum codes (BE No.7)                                                                                                                       |
| Controller detail → 変更履歴                                        | OK — install row 新規作成, transitions with 操作者 and note                                                                                                                                        |
| Status dialog on CTRL-8 (6 devices) / CTRL 100% (0 devices)         | OK — 廃棄 disabled 「（紐付き機器あり）」 / enabled; 異常 → 正常 → 異常 with 変更理由 → `PATCH 200` ×2, both rows in history                                                                       |
| Controller edit 制御ポート数 8 → 4                                  | OK — 422 `E-DEV-012`, inline message, no toast                                                                                                                                                     |
| Device create (なし, CTRL-8, 主契約 通常会員 + プロテイン + 水素水) | OK — status options 正常 / 異常 / メンテナンス中; picker lists no 廃棄 controller; `256.1.1.1` blocked client-side (0 POST); `fe80::1` accepted; **one** `POST 201`, no PUT                        |
| Device detail / edit (drop 水素水)                                  | OK — rule card shows both types, then `PUT usage-control 200` → プロテイン only                                                                                                                    |
| Device delete (fixture)                                             | OK — `DELETE 204`                                                                                                                                                                                  |
| Staff (`can_edit_facility=false`)                                   | OK — lists + CSV; detail 編集 / 削除 / ステータス変更 disabled                                                                                                                                     |
| Manager                                                             | Lists + CSV OK, writes enabled; header limited to S-001 (No.1, separate task)                                                                                                                      |
| Observer                                                            | Read + CSV only. Its own store holds no E-02 rows locally (empty lists). The header shows 全店舗（本部） and `GET /admin/stores` → 403 `E-AUTH-100` — shared header behaviour, outside this scope. |

### Next

1. BE pushes `dulv/equipment-api-fix-gaps` → MR to `main` → dev deploy; refresh `openapi.real.json` from dev and
   re-run the E-02 TCs listed in BE-REQUESTS (Note column).
2. BE asks still open: No.21 (`null` in the `allowedContractType` enum), No.6 (`bulk:<traceId>` in `changedNote`).
3. PO: add the controller 変更履歴 to FR-007 (R301 shipped ahead of the spec).
4. Separate task: Manager `managedStoreIds` from staff detail (No.1).

### Hard-limit audit (2026-10-16)

Every API read under the scope was checked for a fixed single page. Paged lists, the layout's `limit: 1` counts
and the infinite pickers (controller, store) were already fine. Four single-page reads silently dropped rows
past 100 and were fixed; the "a controller drives at most 8 outputs, so 100 is enough" assumption was wrong —
認証方式 なし devices take no output port, so a controller's device count is unbounded.

| Where                                 | Was                                                  | Now                                                                                                                                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 紐付き機器一覧 tab                    | one `limit=100` page; footer counted the loaded rows | server-paged (`TablePaginationWithSize`, 25 / 50 / 100, default 50); footer 合計 = `totalItems`, 正常 / 異常 = `status=…&limit=1` counts                                                                                                          |
| 紐付き機器サマリー card               | 正常 / 異常 counted from that page                   | the same `limit: 1` counts (`useControllerDeviceStatusCounts`)                                                                                                                                                                                    |
| 接続機器 / 接点制御装置 変更履歴 tabs | one `limit=100` page                                 | server-paged with `TablePaginationWithSize` (25 / 50 / 100, default 50) — tables use the pager, never infinite scroll (user, 2026-10-16)                                                                                                          |
| Controller history footer stats       | computed from the loaded rows                        | whole history, independent of the page on screen: 直近1年 = `changedFrom=<1y>&limit=1` `totalItems` (− install row if registered within the year); 平均対応間隔 = newest action (`limit=1&page=1`) vs oldest action (`limit=1&page=totalItems−1`) |
| 出力ポート options (taken ports)      | `limit=100`, unsorted — a taken port could fall off  | `sort=outputPort` (NULLS LAST): the ≤ 8 port-holding devices always come first                                                                                                                                                                    |

Verified live on temporary fixtures (controller + 26 なし devices + 102 controller / 101 device status changes,
all deleted afterwards): summary 26 / 正常 20 / 異常 6; devices tab 26 rows at 50, 25 + 1 over two pages at 25;
controller history 「全 103 件 / 3 ページ」, page 3 = 3 rows ending on 新規作成, 直近1年 102回 on every page; device
history 「全 102 件 / 3 ページ」, page 3 ending on 新規作成.

---

## Round 3 — 2026-11-09: 主契約判定「全て」・複数選択, relayId

**Branch**: `feat/e02-usage-rule-multi-contract` (from `dev` `0b7b3952`)

**Sources pinned** (fetched 2026-11-09):

| Source                                            | Revision                                                                                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prototype `fitness-crm-ui`                        | `972726f`; equipment pages `4508cf7` (11/7 「接続機器の利用制御ルール：主契約判定の全て・複数選択」)                                                     |
| Backend `fitness-backend-v2` `origin/main`        | `07993418` (API-103 `allowedContractTypes[]`), `28b9f0cb` (API-104 `relayId`), gate tablets (!969)                                                       |
| `openapi.real.json`                               | regenerated from `https://api.dev.fitness-v2.okamoto-hd.com/docs-json` (739 paths)                                                                       |
| PO spec `fitness-spec` `crm/requirements/E-02.md` | `5e335ab` — `261107_v5`. FR-008 still says 主契約タイプ 「単数Select」: the prototype + BE follow the 11/5 データ設定会 decision; PO text update pending |

### What changed in FE

| Area                       | Change                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 利用制御ルール form        | 主契約判定 → 「対象の主契約タイプ」 radio 全て / タイプを指定 (no default) → 主契約タイプ checkboxes (複数, OR), filtered by the controller store's `brandGroup` (FIT365 hides キッズ会員・学生会員・福利厚生). New messages, option-bypass Alert, new-gate default (ON + 全て), controller-change confirm dialog. Body sends `allowedContractTypes` only. Closes **No.21** (no cast left). |
| 利用制御ルール detail card | 主契約判定 / サービス種別判定 rows (判定しない / 全て / badges) + bypass Alert; 紐づき契約種別 row removed.                                                                                                                                                                                                                                                                                 |
| List 紐づき契約種別        | one outline badge per axis, `ほかN種` + tooltip for ≥3.                                                                                                                                                                                                                                                                                                                                     |
| 機器タイプ `gate_tablet`   | label 入退館タブレット (list / detail / edit, type locked); not offered on 新規登録 and not a list filter (API filter enum lacks it). **R304** = tablet registration (用途・端末証明書ID・連動ゲート).                                                                                                                                                                                      |
| Controller form            | 接点制御装置ID = `relayId`, typed on create (required, `^[A-Za-z0-9_-]{1,128}$`), read-only on edit; 409 `E-DEV-018` inline. Detail shows `relayId`. Without this every create on dev failed (BE requires it).                                                                                                                                                                              |

### Not in this round

- E-02 v3 FR-014 入館システム設定, v4 FR-015 店舗QRコード, v5 エリア扉 / FR-016 エリアマスタ — separate features (v5 is 全国リリース; the BE has no エリア扉 yet).
- Multi-store 所属店舗 / Manager 管轄 (Dev Q&A 「マネージャーの管轄店舗の設定」, BE `8f77e19d` / `98bc31a6`) — a separate ticket. A first cut was written on this branch and parked in `git stash` (「multi-store scope (QA-manager-store, wrong ticket)」); **No.1 stays open** here.

### Verification

- `npm run type-check` 0 errors; eslint / prettier clean on the touched files.
- TC updates: 34 rows rewritten / 25 added across units A–F (tag `[R3 2026-11-09]`).
- **Live run 2026-11-09** (dev backend, HQ, 1400×900 + 1024×768): 59 R3 cases → **58 OK, 0 NG, 1 Block** (A TC-196: no `gate_tablet` device on dev). Verified: brand filter (FIT365 → 6 types + note), 全て / several types saved and read back (`allowedContractTypes` `[]` / list), option-bypass Alert on form + detail, new-gate default, controller-change dialog (cancel / apply / clears-all / 全て silent), list badges `主契約（全て）` / `（○○ ほかN種）` + tooltip, edit PUT usage-control, PATCH-only edit, `relayId` create / format / max / duplicate 409 E-DEV-018 inline / read-only on edit / shown on list, detail, status dialog.
