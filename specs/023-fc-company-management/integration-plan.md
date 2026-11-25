# Real API Integration Plan: Y-03 FC Company Management (FC企業管理)

**Branch**: `feat/implement-staff-api` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md) · [parity](./checklists/parity.md)
**Scope**: `src/app/(private)/franchise-companies/**` — list, detail (基本情報 / 管轄店舗 / 変更履歴), create, edit, delete, activate/deactivate, store link/unlink
**Target API**: `src/lib/api-real` (generated from `src/lib/openapi.real.json`, API-075 Admin FC Company + API-083 Admin Store list)

**Sources pinned for this plan** (all fetched 2026-09-24):

| Source                                                                              | Revision                                                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| PO spec `dx-fitness/fitness-spec` `crm/requirements/Y-03.md`                        | `a5abfdb` — document version **260901_v4**                                      |
| Prototype `dx-fitness/fitness-crm-ui` `src/pages/fc-company-{list,form,detail}.tsx` | `0a73739` (last FC change `1767864`, 2026-09-17)                                |
| Backend `fitness-backend-v2`                                                        | `origin/main` `58373469` (2026-09-23)                                           |
| Current FE code                                                                     | last touched `85c5b4b5` (2026-08-22) — built against the **pre-8/13** prototype |

## Guiding principle

**Implement exactly per spec** (user direction, 2026-09-24). The UI follows Y-03 v4 (and the
latest prototype for layout) even where the backend cannot back it yet: spec-required fields stay
**enabled and required**, spec'd controls stay live. Whatever the BE does not accept yet — or gets
wrong — is **not** worked around in the UI; it is **stripped from the request body at one seam**
when sending it would break the request (every FC write body is Zod `.strict()` on the BFF → an
unknown key is `400 E-VAL-001`), marked `TODO(round2)` with its blocker id, and listed in Round 2
as "re-check the API". No UI is deleted or disabled to fit the current API.

This feature has one extra input the other integrations did not: the **prototype moved on**
after the FE was built (9/3, 9/8, 9/17 design updates + the 8/13 status-card rework). Per the
user's direction, Round 1 **also catches the UI up to the latest prototype** (§Prototype
catch-up) and the local spec up to Y-03 **v4** — these are UI/spec changes in their own right,
not concessions to the API.

Three rounds:

- **Round 1** — wire everything the real API backs + prototype catch-up + spec v4 sync.
- **Round 2** — close the `TODO(round2)` points once BE ships the asks in §Blockers. Nothing else.
- **Round 3 (Phase 2)** — prototype elements that belong to Y-03 Phase 2 (FR-007/FR-008). They
  are added to the code **commented out** with `TODO(round3)` in Round 1, and integrated in Phase 2.

Mock API routes under `src/app/api/crm/franchise-companies/**`, `src/app/api/_schemas/franchise-company.schema.ts`
and the mock-db table/seed (`_mock-db/tables/franchise.table.ts`, `_mock-db/seeds/franchise.seed.ts`)
are **left untouched** (same convention as positions/staffs/domains) — they simply stop being
called by this feature. `src/app/(private)/stores/_hooks/use-store-form-options.ts` still reads the
mock FC list; it belongs to the stores screen integration and is **out of scope** here.

## Endpoint mapping

| UI surface                                                                        | Real endpoint                                                                                                      | Hook (`@/lib/api-real/@tanstack/react-query.gen`) | Round                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------ |
| List rows, search (法人名), 区分 filter, ステータス filter, sort, paging (FR-001) | `GET /api/v1/admin/fc-companies`                                                                                   | `adminFcCompanyControllerListOptions`             | 1                                                |
| Header count badge / filter-result banner total (unfiltered)                      | same, `{ page: 1, limit: 1 }`, `enabled` only while a filter is active                                             | same                                              | 1                                                |
| Delete from row menu / detail header (FR-004)                                     | `DELETE /api/v1/admin/fc-companies/{id}` (409 `E-FC-001`)                                                          | `adminFcCompanyControllerRemoveMutation`          | 1                                                |
| Detail header, 基本情報 tab, StatusCard (FR-003)                                  | `GET /api/v1/admin/fc-companies/{id}`                                                                              | `adminFcCompanyControllerDetailOptions`           | 1                                                |
| 無効化 / 有効化 from the StatusCard                                               | `PATCH /api/v1/admin/fc-companies/{id}/active` `{ isActive }`                                                      | `adminFcCompanyControllerSetActiveMutation`       | 1 (`reason` → **B3**)                            |
| 管轄店舗 tab (incl. closed stores, muted badge) (FR-005)                          | `GET /api/v1/admin/fc-companies/{id}/stores?includeClosed=true&limit=100`                                          | `adminFcCompanyControllerListStoresOptions`       | 1                                                |
| 店舗を紐づけ dialog — candidates + 「現在: 〇〇」                                 | `GET /api/v1/admin/stores?keyword=&limit=100` → client-side exclude `fcCompanyId === id` and `status === 'closed'` | `adminStoreControllerListOptions`                 | 1                                                |
| 紐づけ / 付け替え (reassign confirm)                                              | `PUT /api/v1/admin/fc-companies/{id}/stores/{storeId}` (409 `E-FC-004`)                                            | `adminFcCompanyControllerAssignStoreMutation`     | 1                                                |
| 紐づけ解除                                                                        | `DELETE /api/v1/admin/fc-companies/{id}/stores/{storeId}` (409 `E-FC-006`)                                         | `adminFcCompanyControllerUnassignStoreMutation`   | 1                                                |
| 変更履歴 tab (FR-006)                                                             | `GET /api/v1/admin/fc-companies/{id}/change-history?limit=100`                                                     | `adminFcCompanyControllerHistoryOptions`          | 1 (store name → **B5**, operator title → **B6**) |
| Create form (FR-002)                                                              | `POST /api/v1/admin/fc-companies`                                                                                  | `adminFcCompanyControllerCreateMutation`          | 1                                                |
| Edit form (FR-003)                                                                | `PATCH /api/v1/admin/fc-companies/{id}`                                                                            | `adminFcCompanyControllerUpdateMutation`          | 1                                                |
| 認証方式 (form select, detail field)                                              | ❌ no field anywhere (DTO, DB)                                                                                     | —                                                 | **B1 → 2**                                       |
| 直営店フラグ (form checkbox)                                                      | `ownedStore` is **derived** from `managementType`, rejected on write                                               | read from detail                                  | 1 read-only (**B4**)                             |
| 集計 tab — KPI集計・店舗サマリー / 売上集計 (FR-007/FR-008, Phase 2)              | ❌ none                                                                                                            | —                                                 | **3** (commented out)                            |

## Blockers carried into Round 2

| ID     | Blocker                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Round 1 behaviour (UI kept)                                                                                                                                                                                                                                                                                                                                                                                                                   | Round 2 (after API fix)                                                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | `authMethod` does not exist in `CreateFcCompanyDto` / `UpdateFcCompanyDto` / `FcCompanyDetailDto`, nor in the `fc_companies` prisma model (`services/contracts-svc/prisma/schema.prisma` `model FcCompany`). Y-03 FR-002 (v2+) makes it **required**; prototype renders it required in form + detail.                                                                                                                                                                            | Per spec: 認証方式 select **enabled and required** on create and edit (Google SSO / IDaaS). The value is **stripped from the POST/PATCH body** (sending it = `E-VAL-001`, nothing could be saved) — `TODO(round2) B1` at the body builder in `_utils/fc-company-api.util.ts`. Known Round 1 side effect: the value is not persisted, so the edit form opens with it empty and the user must re-select it before saving; detail renders 「—」. | **BE ask**: add `auth_method` (`google_sso` \| `idaas`) column + DTO field (required on create). Round 2: re-check the API; when present, stop stripping, pre-fill edit from the detail, render it in detail.             |
| **B2** | Codegen defect: 11 nullable body fields (`royaltyRate`, `corporateNumber`, `representativeName`, `headOfficeAddress`, `phone`, `contactPersonName`, `contactPersonPhone`, `contactPersonEmail`, `fcContractStartDate`, `fcContractRenewalDate`, `note`) are declared `type: object` → typed `{ [key: string]: unknown } \| null`. BE TS source is `string \| number \| null` (`services/bff/src/routes/contracts/dto/fc-company.dto.ts`, `@ApiPropertyOptional` without `type`). | Exactly **one cast** in `_utils/fc-company-api.util.ts` (`toNullableBodyField`) with `TODO(round2) B2`. No other `as` casts. `openapi.real.json` is **not** hand-edited.                                                                                                                                                                                                                                                                      | **BE ask**: add `type: String` / `type: Number` to those `@ApiPropertyOptional` (same fix as `ae2c40d7` did for `PATCH /admin/staff`). Then: replace `openapi.real.json` → `npm run generate-api:real` → delete the seam. |
| **B3** | `PATCH /{id}/active` body is `fcCompanyActiveSchema = z.object({ isActive }).strict()` (`packages/zod-schemas/src/contracts/fc-company.schema.ts`) — **a `reason` key is rejected with 400 `E-VAL-001`**, which would make deactivation fail entirely. User direction: keep the 無効化理由 textarea and send the reason.                                                                                                                                                         | Textarea (任意, max 1000) **stays** in the disable dialog. The body is built in one place (`toSetActiveBody`) which _would_ include `reason`; Phase D smoke sends it once to confirm the rejection live. **Live verdict (2026-09-24): rejected** — `400 E-VAL-001`, `details: [{ field: 'reason', code: 'invalid_format', message: "Unrecognized field 'reason'" }]`. The seam drops `reason` (`TODO(round2) B3`), so 無効化 keeps working.   | **BE ask**: accept optional `reason` (≤1000) on `PATCH /active` and store it in the history snapshot. Round 2 = only re-check the API; if present, stop stripping in the seam and render the reason in the history line.  |
| **B4** | `ownedStore` (直営店フラグ) is derived from `managementType === 'direct_management'`, never stored, rejected on write. Y-03 FR-002 says 「直営店フラグ（既存システムとの互換性のため保持）」 and the form offers it as an editable checkbox.                                                                                                                                                                                                                                     | Per spec: checkbox **editable** (「旧システムとの互換性のために保持」), edit pre-fills from `ownedStore`. The value is **stripped from the body** (`TODO(round2) B4`), so an edit that disagrees with the classification is not persisted; display follows the classification (FR-021).                                                                                                                                                       | **BE ask**: store the flag (or PO confirms it is derived). Round 2: re-check the API; if accepted, stop stripping.                                                                                                        |
| **B5** | Change-history `assign_store` / `unassign_store` snapshot carries only `targetStoreId` / `targetStoreCode` — no store **name**, and a reassign's `assign_store` row has no **previous company**. Prototype line: 「店舗紐づけ追加: {店舗名}（{旧企業} から付け替え）」.                                                                                                                                                                                                          | History line renders the store **code**: 「店舗紐づけ追加: S-042」 / 「店舗紐づけ解除: S-042」; the 「（… から付け替え）」 suffix is omitted. `TODO(round2) B5` in `_utils/fc-company-history.util.ts`.                                                                                                                                                                                                                                       | **BE ask**: add `targetStoreName` (+ `previousFcCompanyName` on reassign) to the link snapshot. Then render the prototype sentence.                                                                                       |
| **B6** | `changedByName` is the bare staff name; prototype shows a role/title suffix 「田中 太郎（本部管理者）」 (prototype-only, not in spec — user item B3).                                                                                                                                                                                                                                                                                                                            | Operator column shows `changedByName` (「—」 when empty). `TODO(round2) B6`.                                                                                                                                                                                                                                                                                                                                                                  | **BE ask**: expose the actor's position/role name on history entries. Then append 「（…）」.                                                                                                                              |
| **B7** | List `sort` accepts only `legalName` \| `createdAt` \| `code` — no `displayName`, but the sortable column shows 法人名（表示名） (FR-004).                                                                                                                                                                                                                                                                                                                                       | The 法人名（表示名） column header sorts by `legalName` (closest available; equal for companies whose display name was left empty). `TODO(round2) B7` at the sort-key map.                                                                                                                                                                                                                                                                    | **BE ask**: add `sort=displayName`. Then map the column to it.                                                                                                                                                            |

## Decisions

- **D1 — No mapper layer.** Components import `FcCompanySummaryDto`, `FcCompanyDetailDto`,
  `FcManagedStoreDto`, `FcCompanyHistoryEntryDto`, `StoreSummaryDto`, `CreateFcCompanyDto`,
  `UpdateFcCompanyDto` from `@/lib/api-real/types.gen` and use them directly; renames happen in
  place (`display_name`→`displayName`, `type`→`managementType`, `status`→`isActive`,
  `managed_store_count`→`managedStoreCount`, …). Precedent: staffs/positions/domains.
- **D2 — Form field naming = API naming.** Zod form keys become the camelCase DTO keys
  (`legalName`, `displayName`, `managementType`, `contactPersonName`, `contactPersonPhone`,
  `contactPersonEmail`, `fcContractStartDate`, …) so the body builder is a straight copy. The
  two UI-only fields (`authMethod`, `ownedStore`) stay in the form schema but are never sent (B1, B4).
- **D3 — `id` vs `code`.** Routing uses the UUID `id`; every place that _displays_ 「FC企業ID」
  shows `code` (`FC-001`). The list 「FC企業ID」 sort maps to `sort=code`.
- **D4 — `managementType` has 3 values, all selectable** (user direction 2026-09-24, Y-03 A-2
  直営・FC・業務委託). Badge/filter labels 直営 / FC / 業務委託, form labels 直営 / フランチャイズ（FC） /
  業務委託 — the first two from the prototype, the third from the spec wording (the prototype has
  no third value).
- **D5 — Page size.** `[25, 50, 100]` (= `API_PAGE_SIZE_OPTIONS`, API `limit` max 100, and what
  the 9/17 prototype shows); default stays 50. A stale `?limit=200` URL is clamped to 100.
- **D6 — Where each count comes from.** List 管轄店舗数 + detail StatusCard 「管轄店舗数」 +
  delete guard = `managedStoreCount` (BE: **non-closed** linked stores — exactly what
  `E-FC-001` guards). 管轄店舗 tab 「全 N 件」 = `pagination.totalItems` of the
  `includeClosed=true` list (so a closed store is listed, muted, but does not block delete).
  Header badge / banner total = baseline query `pagination.totalItems`.
- **D7 — Errors by `ErrorResponseDto.code`**, in `_utils/fc-company-api.util.ts` (pattern:
  `position-api.util.ts`): `E-FC-001` delete blocked → switch the delete dialog to its blocked
  variant + refetch; `E-FC-002` → not-found state (also accept bare 404); `E-FC-003` /
  `E-AUTH-100` / `E-AUTH-103` → permission-denied state; `E-FC-004` closed store, `E-FC-005`
  store gone, `E-FC-006` not linked → refetch stores + candidates. The shared `MutationCache`
  already toasts every failed mutation (`userMessage`): **all local `onError: toast.error(...)`
  are deleted**; success toasts stay.
- **D8 — Partial PATCH.** Edit sends **only the dirty fields** (precedent `toUpdatePositionBody`;
  since Round 2 the regenerated `UpdateFcCompanyDto` is all-optional, so `legalName` +
  `managementType` are no longer always sent). Clearing a
  field sends `null`. `displayName` empty → omitted on create (server copies `legalName`), and on
  edit sent as `legalName` (BE rejects `""`, `min(1)`).
- **D9 — Validation bounds = real Zod** (`fc-company.schema.ts`): `legalName`/`displayName` ≤255,
  `corporateNumber` exactly 13 digits, `phone`/`contactPersonPhone` `^[0-9-]{1,20}$`,
  `representativeName`/`contactPersonName` ≤100, `headOfficeAddress` ≤500,
  `contactPersonEmail` email ≤254, `note` ≤1000, `royaltyRate` 0–100. BE does **not** check
  renewal ≥ start (Y-03 v4) — FE keeps that rule in `superRefine`.
- **D10 — Status lives on the detail screen only** (prototype 8/13+, and the API: create/edit
  bodies have no `isActive`; `PATCH /active` is "the ONLY surface that changes isActive").
  New companies are created active (server default). The form's ステータス card is removed.
- **D11 — Link candidates (FR-005 / FR-025).** No `linkable-stores` endpoint; the dialog
  searches `GET /admin/stores` (`keyword`, debounced, `limit: 100`) and filters out stores already
  on this company and `closed` stores (BE would 409 `E-FC-004`). Each row shows
  「現在: {fcCompanyName}」 (`直営` when `fcCompanyId` is null). A store owned by **another**
  company opens the 付け替え confirmation before `PUT` (user item B4 → Round 1; BE moves the store
  and writes `unassign_store` on the old company in the same TX).
- **D12 — Link disabled while inactive (user item B2).** FE-only rule from the prototype: when
  the company is 無効, 「店舗を紐づけ」 renders disabled with the reason tooltip
  「無効のFC企業には店舗を紐づけできません。有効化してから追加してください」; permission denial
  takes precedence over the state reason. 無効化 / 有効化 always go through the confirm dialog
  before calling `PATCH /active`. BE does not enforce this rule.
- **D13 — History sentence** is composed FE-side (the API says it is "the CRM's side") in
  `_utils/fc-company-history.util.ts`: `create` → 「FC企業登録: {snapshot.legalName}」,
  `update` → one line per `changes[]` item 「{label}: {before} → {after}」 (field → label via a
  `Record<keyof FcCompanyDetailDto, string>` subset, values formatted: enum labels, dates
  `YYYY/MM/DD`, booleans), `isActive` → 「ステータス変更: 有効 → 無効」, `delete` / `restore` /
  `migrate` fixed labels, `assign_store` / `unassign_store` per B5. Unknown `field` keys fall
  back to the raw key (no crash on BE additions).
- **D14 — History / managed-stores paging.** Both fetched with `limit: 100`, count from
  `totalItems`; the prototype has no pager on either tab. Accepted risk: rows past 100 are not
  shown (TODO note, not a blocker; revisit if a company exceeds 100 stores/entries).
  **Update 2026-10-30 (user direction):** the history tab now uses `DataTable` + `TablePaginationWithSize`
  with server paging (`page` / `limit`, 25/50/100, default 25) — no hard limit. Managed stores unchanged.
- **D15 — Permissions (user G6 / A4).** Screen/control gating stays on `Permission.FCCompanies*`
  (resolved from the staff's 職位 permissions). BE scopes FC-manager Staff to their own company on
  detail/stores and makes list/history HQ-only; FE does not re-implement that — a 403
  (`E-AUTH-100` / `E-FC-003`) renders the shared permission-denied state inside the affected
  tab/screen.
- **D16 — Store DTO labels.** `FcManagedStoreDto`/`StoreSummaryDto` carry `brandEnum`
  (`Joyfit`, `Joyfit24`, …), `prefecture` as JIS X 0401 code (`"13"`) and a 4-value `status`.
  Local constants in `[id]/_constants/detail.constants.ts`: brand label/colour map (copy of
  `REAL_BRAND_BADGE_CONTENT` in `store-selector.tsx`), prefecture = `PREFECTURES[Number(code) - 1]`
  (fallback raw), status labels 準備中 / 営業中 / 休業中 / 閉店 with 閉店 (and 休業中) muted as in the
  9/17 prototype. The stores screen's mock-typed constants are no longer imported.
- **D17 — Deep links.** Store rows link to `/stores/[id]` with the real store UUID. The stores
  screen is still on the mock API, so that link resolves only after the stores integration —
  noted, not fixed here. No other screen deep-links to an FC company id (grep: sidebar only).

## Spec / prototype / code status (user request)

### A. Defined in spec, not yet done in code or prototype

| #   | Item                                                                                                                                                                                                                                                          | Status                                                                                          | Plan                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| A1  | Y-03 v4: 担当者連絡先 split into **担当者メールアドレス** + **担当者電話番号** (both optional)                                                                                                                                                                | prototype ✅, code ❌ (single 担当者連絡先), API ✅ (`contactPersonEmail`/`contactPersonPhone`) | Round 1 (T011/T014/T021)                                |
| A2  | Local `spec.md` still at Y-03 v3: FR-012 has one contact field; FR-002 says search by "name **or FC company ID**" (Y-03: 法人名・直営/FC区分・ステータス); FR-013 puts status on the form (prototype moved it to the detail StatusCard); no renewal-date rule | spec ❌                                                                                         | Round 1 — update `spec.md` to v4 (T030)                 |
| A3  | 認証方式 required (FR-002 v2+)                                                                                                                                                                                                                                | spec ✅ prototype ✅ code ✅, **API ❌**                                                        | Round 1 UI per spec, body strip — B1 → Round 2 re-check |
| A4  | Staff (FC企業管理者職位) reads own company only (FR-003, 権限マトリクス)                                                                                                                                                                                      | code/prototype: gated by permission only; BE enforces scope                                     | Round 1 per D15 (職位 permissions + BE 403)             |
| A5  | FR-007 / FR-008 Phase 2 集計 (KPI・店舗サマリー / 売上集計)                                                                                                                                                                                                   | prototype ✅ (Phase 2 view only), code ❌, API ❌                                               | **Round 3** — commented-out tab (T024)                  |
| A6  | FC契約更新日 ≥ FC契約開始日 (v4)                                                                                                                                                                                                                              | prototype ✅ code ✅ (message wording differs), BE ❌                                           | Round 1 FE rule (D9), wording per prototype             |

### B. In the prototype, not defined in spec

| #     | Item                                                        | Plan                                                                                  |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| B-i   | 無効化理由 textarea in the disable dialog                   | Round 1 UI kept + sent via seam, stripped if rejected (**B3**); Round 2 re-check only |
| B-ii  | 「店舗を紐づけ」 disabled while the company is 無効         | Round 1, FE-only (D12)                                                                |
| B-iii | Operator title suffix in history                            | **B6** → Round 2 (BE ask)                                                             |
| B-iv  | 付け替え confirm dialog + 「現在: 〇〇」 in the link dialog | Round 1 (D11)                                                                         |

### C. Prototype catch-up (code built on the pre-8/13 prototype)

Round 1, Phase C/B tasks below: remove the form ステータス card (D10); 無効化/有効化 move from the
header ⋯ menu into the StatusCard `action`; header actions become 「削除」 (outline, disabled +
tooltip 「管轄店舗が存在するため削除できません」 when `managedStoreCount > 0`) and 「編集」; header
badge order = status then 区分; 「任意」 markers on every optional field; 法人名（表示名） optional
hint; royalty field always shown with the new hint copy; renewal-date hint 「次回の契約更新予定日」;
footer message split 「未入力の項目があります」 vs the renewal-date message; disable/enable
dialog copy; closed-store badge muted; page size `[25, 50, 100]`.

## Round 1 tasks

### Phase A — foundations

- **T001 [P]** `_constants/constants.ts` — re-key on real enums: `MANAGEMENT_TYPE_LABELS`
  (3 values, D4), `MANAGEMENT_TYPE_FORM_OPTIONS` / filter options (2 values), active/inactive
  labels + badge classes keyed by `boolean`, `FC_COMPANY_PAGE_SIZE_OPTIONS = API_PAGE_SIZE_OPTIONS`,
  sort-key map (`id`→`code`, `displayName`→`legalName` + `TODO(round2) B7`), auth-method labels
  (select stays per spec). Imports move from `@/lib/api` to `@/lib/api-real/types.gen`.
- **T002 [P]** `_utils/fc-company-api.util.ts` (new) — `FC_COMPANY_ERROR_CODE`,
  `getFcCompanyErrorCode`, `isFcCompanyNotFoundError`, `isPermissionDeniedError` (D7);
  `toNullableBodyField` (single B2 cast); `toCreateFcCompanyBody` / `toUpdateFcCompanyBody(values, dirty)`
  (D8, strips `authMethod` B1 and `ownedStore` B4 — the only place they are dropped); `toSetActiveBody(isActive, reason)` (B3 seam).
- **T003 [P]** `_utils/fc-company-history.util.ts` (new) — `formatHistoryLines(entry)` (D13)
  with the field-label map and a type-level assertion that its keys ⊆ `keyof FcCompanyDetailDto`.
- **T004 [P]** `[id]/_constants/detail.constants.ts` — real store brand / prefecture / 4-status
  labels (D16); basic-info labels for 担当者メールアドレス / 担当者電話番号; drop mock-typed re-exports.

### Phase B — list + detail

- **T010** `_hooks/use-franchise-companies-filters.ts` — URL state → real query:
  `keyword`, `managementType`, `isActive` (`'true'|'false'` in URL), `sort` (`code`/`legalName`),
  `order`; clamp `limit` to 100 (D5).
- **T011** `page.tsx` — `adminFcCompanyControllerListOptions`, `items` / `pagination.totalItems`,
  baseline `limit:1` query; delete-blocked reason from `managedStoreCount`.
- **T012 [P]** `_components/franchise-companies-table-columns.tsx`, `franchise-company-row-actions.tsx`,
  `franchise-companies-filters.tsx` — DTO renames, `code` column, 3-value badge, boolean status.
- **T013** `[id]/page.tsx` — detail query; header per §C (status badge → 区分 badge; 削除 + 編集
  buttons, no ⋯ menu); not-found / permission-denied states (D7/D15); tab wiring.
- **T014 [P]** `[id]/_components/basic-info-tab.tsx` — DTO renames, `code`, 認証方式 「—」
  until the API returns it (B1), 担当者メールアドレス + 担当者電話番号 (A1), royalty `x.x%`; StatusCard gets
  the 無効化 / 有効化 `action` (§C) opening the dialogs.
- **T015 [P]** `[id]/_components/franchise-company-status-dialog.tsx` — split into the
  prototype's disable dialog (copy + 無効化理由 textarea, B3) and enable dialog;
  `adminFcCompanyControllerSetActiveMutation` via `toSetActiveBody`; no local error toast.
- **T016 [P]** `[id]/_components/franchise-company-delete-dialog.tsx` — `RemoveMutation`;
  `E-FC-001` → blocked variant + refetch; invalidate real query keys; no local error toast.
- **T017** `[id]/_components/linked-stores-tab.tsx` — `ListStoresOptions` (`includeClosed: true`,
  `limit: 100`), `FcManagedStoreDto` columns (code, name, brand badge, prefecture label, 4-state
  status), 「全 N 件」 = `totalItems`; 店舗を紐づけ disabled while inactive (D12).
- **T018** `[id]/_components/link-store-dialog.tsx` — candidate search via
  `adminStoreControllerListOptions` (D11), 「現在: 〇〇」 line, `AssignStoreMutation`; new
  付け替え AlertDialog 「運営企業を付け替えますか？」 for stores of another company.
- **T019 [P]** `[id]/_components/unlink-store-dialog.tsx` — `UnassignStoreMutation` with
  `storeId`; `E-FC-006` → refetch; no local error toast.
- **T020 [P]** `[id]/_components/history-tab.tsx` — `HistoryOptions` (`limit: 100`), rows from
  `formatHistoryLines`, operator `changedByName` (B6), permission-denied state for non-HQ (D15).

### Phase C — forms

- **T021** `_schemas/franchise-company-form.schema.ts` — camelCase keys (D2), bounds per D9,
  `contactPersonEmail` added, `authMethod` **required** per spec (B1), `ownedStore` editable per spec (B4), `status` removed
  (D10), renewal ≥ start message per prototype.
- **T022** `_components/franchise-company-form.tsx` — §C catch-up (任意 markers, hints, royalty
  always shown, status card removed, footer message split); 認証方式 enabled + required (B1);
  直営店フラグ editable (B4); 担当者メールアドレス + 担当者電話番号 inputs (A1); disabled
  業務委託 option only when editing such a company (D4).
- **T023** `create/page.tsx`, `[id]/edit/page.tsx` — `CreateMutation` / `UpdateMutation` with the
  T002 builders, dirty-field PATCH, detail → form defaults from `FcCompanyDetailDto`, invalidate
  real list/detail keys, delete local error toasts, keep success toasts; edit not-found state.
- **T024** `[id]/page.tsx` — Phase 2 集計 tab (KPI集計・店舗サマリー / 売上集計, 「次フェーズ実装予定」)
  added **commented out** with `TODO(round3) FR-007/FR-008` (A5). Not rendered in Round 1.

### Phase D — spec, verification

- **T030** `spec.md` — sync to Y-03 v4 (A2): FR-012 contact split, FR-002 search scope,
  FR-013 status on detail only, renewal-date rule, `Clarifications → Session 2026-09-24` recording
  this session's decisions (G5/G6/B1–B4/C); authentication-method BE dependency stays OPEN.
- **T031** `checklists/parity.md` — re-point items the 9/17 prototype changed (form status card,
  header actions, StatusCard action, contact fields, page sizes, reassign dialog).
- **T032** `npm run type-check` (0 errors) → `npm run lint`.
- **T033** Live smoke against `NEXT_PUBLIC_REAL_API_URL` (HQ account): list → keyword →
  区分 filter → ステータス filter → sort by ID / 表示名 → paging + page size → row → detail tabs →
  create (all fields, renewal < start rejected) → edit (clear a field → `null`) → 無効化 with
  reason (**decides B3**) → 有効化 → 紐づけ (direct store) → 付け替え (other company's store) →
  history lines → 解除 → delete with linked store (`E-FC-001`) → delete empty company. Plus one
  non-HQ / FC-manager staff pass (list 403 / own detail OK / history 403).
- **T034** Append **Round 1 result** to this plan.

## Round 2 backlog (after the API is fixed)

- **R201 (B1)** ✅ closed 2026-09-29 — API field is `authProvider` (`google` | `cognito`); see §Round 2 result.
- **R202 (B2)** ✅ closed 2026-09-29 — `toNullableBodyField` deleted.
- **R203 (B3)** ✅ closed 2026-10-01 — `reason` sent on 無効化, shown in the history line; see §Round 2 re-check.
- **R204 (B4)** ✅ closed 2026-10-01 by decision (not an API change) — 直営店フラグ is derived from 区分 and shown read-only; see §Round 2 re-check.
- **R205 (B5)** ✅ closed 2026-09-29 — store name + 「（{旧企業} から付け替え）」 rendered; code kept as fallback for legacy rows.
- **R206 (B6)** BE adds actor role/title → append 「（…）」 to the operator column. _Still open (2026-10-01); proposed to move to Round 3 — prototype-only._
- **R207 (B7)** ✅ closed 2026-09-29 — the column sorts by `displayName`.

## Round 3 backlog (Phase 2)

- **R301 (A5)** FR-007 / FR-008: uncomment the 集計 tab and wire it once KPI / sales aggregation APIs exist.

## Open questions

- **Q4 — B2 wording.** User note "khi click disable hiện thị popup mới call API" is read as:
  無効化/有効化 always confirm in a dialog before calling the API, and 店舗を紐づけ is disabled
  (with reason) while inactive. Confirm if a different flow was meant.

## Resolved questions (2026-09-24, user)

- **G5 search** — Y-03 search conditions are 法人名・直営/FC区分・ステータス; `keyword` covers it → Round 1, no gap.
- **G6 / A4 permissions** — implement as-is; Staff access is defined by 職位 permissions → Round 1 (D15).
- **A2** — update local spec to Y-03 v4 in Round 1 (T030).
- **B1 無効化理由** — keep UI, request BE support, send the field; Round 2 only re-checks (B3 / R203).
- **B2** — FE-implementable → Round 1 (D12).
- **B3 operator title** — BE ask → Round 2 (B6).
- **B4 付け替え** — Round 1 (D11).
- **C** — update to the latest prototype in Round 1.
- **Principle** — implement per spec; anything BE cannot satisfy or gets wrong → Round 2 re-check. Resolves former Q1 (認証方式 kept required per spec, BE ask), Q2 (直営店フラグ editable per spec, BE ask), Q3 (three values selectable — D4).

## Round 1 result (2026-09-24)

### Shipped

- **Phase A** — `_constants/constants.ts` re-keyed on the real enums (3-value `managementType` labels, 2 selectable; boolean status; page sizes `[25, 50, 100]`; sort-key map with the B7 fallback; 認証方式 values). New `_utils/fc-company-api.util.ts` (error codes, not-found / permission helpers, the single B2 cast, create / partial-PATCH / set-active body builders — the only place `authMethod`, `ownedStore` and `reason` are dropped). New `_utils/fc-company-history.util.ts` (history sentences, field-label map `satisfies Partial<Record<keyof FcCompanyDetailDto, string>>`). `[id]/_constants/detail.constants.ts` got real store labels (4-state status, JIS prefecture, `brandEnum` badge map).
- **Phase B** — list on `adminFcCompanyControllerList*` (keyword / managementType / isActive / sort / order, baseline `limit:1` count, `limit` clamped to 100, 403 → permission state). Detail on `…Detail`: header per 9/17 (status → 区分 badges; `削除` + `編集`), StatusCard owns 無効化 / 有効化 (`…SetActive`, disable dialog with 無効化理由), 管轄店舗 tab on `…ListStores` (`includeClosed`), link dialog on `adminStoreControllerList` with 「現在: 〇〇」 + 付け替え confirmation (`…AssignStore`), unlink (`…UnassignStore`), history on `…History`. The 集計 tab is added commented out (`TODO(round3) R301`).
- **Phase C** — form schema on camelCase DTO keys with the real bounds; 認証方式 enabled + required (spec) but stripped (B1); 直営店フラグ editable (spec) but stripped (B4); 担当者メールアドレス / 担当者電話番号 split (v4); status card removed; `任意` markers and 9/17 copy. Create = `…Create`, edit = `…Update` with dirty-field PATCH.
- **Phase D** — `spec.md` synced to Y-03 v4 (`## Clarifications → Session 2026-09-24`, FR-002 / FR-012 / FR-013 rewritten, FR-043 added, assumptions/edge cases updated). `checklists/parity.md` re-pointed: 11 items struck as superseded by the 9/17 prototype, PAR201–PAR212 added.
- Every local `onError: toast.error(...)` on the migrated mutations was removed (the shared `MutationCache` toasts). The delete dialog uses `meta.suppressErrorToast` so `E-FC-001` renders its blocked variant instead of a toast.

### Verification

- `npm run type-check` — **0 errors in `src/app/(private)/franchise-companies/**`**. The repo-wide run shows 6 errors in `src/app/(private)/staffs/[id]/edit/page.tsx`, caused by the uncommitted `src/lib/api-real`/`openapi.real.json` refresh already in the working tree (the staff PATCH body fields changed type). Not touched here. The same refresh did **not** change any FC schema or path (diffed).
- `npx eslint src/app/(private)/franchise-companies` — 0 errors, 0 warnings; `prettier --check` clean.
- **Live smoke (T033)** against `NEXT_PUBLIC_REAL_API_URL` (dev), Playwright, HQ account `lodu4289+headquater@gmail.com`. Records created with the `TC-FC-<ts>` prefix and deleted afterwards. The one pre-existing store touched (S-002 FIT365 新宿 (dev), 直営) was linked → reassigned → unlinked and ended back on 直営:

  | Step                                                                                                                                                                                                                                                                      | Result      |
  | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
  | List, header count, 区分 filter (`managementType=franchise`), ステータス filter (`isActive=false`), filter banner                                                                                                                                                         | OK          |
  | Sort 法人名（表示名） → `sort=legalName` (B7); `?limit=200` → request `limit=100`                                                                                                                                                                                         | OK          |
  | Create: empty submit → 「未入力の項目があります」 + 「認証方式を選択してください」; full create → 201                                                                                                                                                                     | OK          |
  | Search by 法人名 → 1 row; detail shows email / phone / royalty `5.5%`                                                                                                                                                                                                     | OK          |
  | Edit: 認証方式 must be re-selected (B1 side effect, as documented); PATCH 200, history shows only 「担当者名: テスト 太郎 → テスト 花子」 (partial PATCH)                                                                                                                 | OK          |
  | **B3 probe**: `PATCH /active` + `reason` → **400 E-VAL-001 "Unrecognized field 'reason'"**                                                                                                                                                                                | Confirms B3 |
  | 無効化 (as shipped) 200 → 店舗を紐づけ disabled; 有効化 200                                                                                                                                                                                                               | OK          |
  | Link dialog: candidates with 「現在: 直営」; 紐づけ → PUT 200, store listed; 削除 disabled while linked                                                                                                                                                                   | OK          |
  | Second company: candidate shows 「現在: TC-FC-…-A株式会社」 → 付け替え dialog → PUT 200; 解除 → 204                                                                                                                                                                       | OK          |
  | History: 「FC企業登録」, 「ステータス変更: 有効 → 無効 / 無効 → 有効」, 「店舗紐づけ追加 / 解除: S-002」 (code, B5); the reassign also wrote 「店舗紐づけ解除」 on company A                                                                                              | OK          |
  | Delete both test companies from the detail screen → 204 + redirect                                                                                                                                                                                                        | OK          |
  | Staff (`lodu4289+staff@gmail.com`, 店舗責任者): the screen is reachable by 職位 permission, the list API returns 403 → first run showed 「取得に失敗しました / 再試行」 (retry can never succeed) → **fixed**: now 「FC企業一覧を参照する権限がありません」 (re-verified) | Fixed       |

- Not exercised live: date pickers (the renewal ≥ start rule is covered by the schema, and the message was checked in code only); the `E-FC-001` server-side block (the UI disables 削除 before it can happen); FC企業管理者 staff (no seeded Cognito account).

### Still TODO(round2) / round3

- `TODO(round2)` B1 (認証方式), B2 (codegen cast), B3 (無効化理由), B4 (直営店フラグ), B5 (store name in history), B6 (operator title), B7 (displayName sort) — unchanged, see §Blockers.
- **New for Round 2 re-check (G6)**: the 店舗責任者 職位 grants `fc-companies.view` on the FE (menu + route open), while the BE list is HQ-only. Per user direction, access stays 職位-driven. Round 2: confirm with BE/PO which 職位 should see the list, and whether the BE should scope instead of refusing.
- `TODO(round3)` R301 — the 集計 tab (FR-007 / FR-008).

### Deviations from the plan (deliberate)

1. **Link dialog keeps a search box.** The 9/17 prototype lists candidates without one, but the real store master is larger than one API page (100). The dialog therefore keeps a debounced server-side keyword search above the prototype's row layout (PAR212 note).
2. **Phone validation stays on the JP-phone validator** (`isJapanesePhoneNumber`). It is stricter than the API's `^[0-9-]{1,20}$` and keeps the existing messages and test cases.
3. **直営/FC区分 offers all three values** (form + list filter), changed after the first Round 1 pass on user direction — see D4.

## Round 2 result (2026-09-29)

**Re-check sources**: BE `origin/main` `b2732500` (API-075 fixes `9f0d5ffa`, `d0c0c2a5`, `f2d4869f`,
`3ddd5fa6`). `src/lib/openapi.real.json` + `src/lib/api-real/**` were refreshed in the working tree
(uncommitted, identical to dev `/docs-json`); against it the Round 1 FC code failed `tsc` with 2 errors.
Spec Y-03 unchanged (`5c391cf`, still 260901_v4). Prototype `47d60ac` has one FC change (`e5501a3`,
9/26: 店舗を紐づけ moved into a 管轄店舗 CardHeader, table padding) — layout only, not part of Round 2.

### Closed

| ID     | API                                                              | What changed                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | `POST` / `PATCH /api/v1/admin/fc-companies[/{id}]`, `GET …/{id}` | Form key renamed `authMethod` → `authProvider` (D2); values `google` / `cognito` labelled Google SSO / IDaaS (`FC_AUTH_PROVIDER_*`, keyed on the DTO type). Sent on create, sent on PATCH when dirty, edit pre-fills it, detail renders it (「—」 for companies registered before migration 032 — their edit form stays required, so the first save fills it). History labels `authProvider` changes. |
| **B2** | same write bodies                                                | `toNullableBodyField` cast deleted; body fields are plain `string` / `number` / `null`. The dirty-field copy uses a generic helper (`pickDirty`) — no cast.                                                                                                                                                                                                                                           |
| **B5** | `GET …/{id}/change-history`                                      | `assign_store` / `unassign_store` name the store by `snapshot.targetStoreName`; `assign_store` appends 「（{prevFcCompanyName} から付け替え）」 when `prevFcCompanyId` is set (prototype wording). Legacy rows fall back to the store code.                                                                                                                                                           |
| **B7** | `GET /api/v1/admin/fc-companies?sort=`                           | 法人名（表示名） column sorts by `displayName`.                                                                                                                                                                                                                                                                                                                                                       |
| D8     | `PATCH …/{id}`                                                   | Only dirty fields are sent (DTO now all-optional).                                                                                                                                                                                                                                                                                                                                                    |

### Still open

- **B3** 無効化理由 (`PATCH …/{id}/active` still `{ isActive }.strict()`) and **B6** operator title
  (history still only `changedByName`) — both are **prototype-only / not in Y-03**; proposed to move
  to Round 3 (pending user confirmation).
- ~~**B4** 直営店フラグ~~ — resolved 2026-10-01 by decision: derived from 区分, read-only on the form (see §Round 2 re-check).
- **G6** list access for non-HQ 職位 — BE list still HQ-only; unchanged.

### Verification

- `npm run type-check` — 0 errors under `src/app/(private)/franchise-companies/**` (the 6 remaining
  repo errors are in `staffs/[id]/edit`, pre-existing). `eslint` + `prettier --check` clean.
- **Live smoke** (dev API, Playwright, HQ account), **18/18 OK**; test companies `TC-FC-R2-<ts>-{A,B}`
  deleted afterwards, S-002 ended back on 直営:
  sort=displayName request · create body carries `authProvider: 'cognito'` and numeric
  `royaltyRate: 5.5` · detail 「認証方式 IDaaS」 · edit pre-fills IDaaS · editing 担当者名 sends
  `{ contactPersonName }` only · switching 認証方式 sends `{ authProvider: 'google' }` only · history
  「認証方式: IDaaS → Google SSO」 · link A → reassign to B → unlink: B shows 「店舗紐づけ追加:
  FIT365 新宿 (dev)（TC-FC-R2-…-A株式会社 から付け替え）」 and 「店舗紐づけ解除: FIT365 新宿 (dev)」,
  A shows both lines by store name · legacy FC-007 (`authProvider: null`): detail 「—」, edit save
  blocked with 「認証方式を選択してください」.

## Round 2 re-check (2026-10-01)

**Re-check source**: `src/lib/openapi.real.json` + `src/lib/api-real/**` refreshed by the user on
2026-10-01 (working tree). FC DTO/path diff against the 9/29 tree: `PATCH /{id}/active` body gains
`reason`; history `snapshot` documents `reason`, `targetStore*`, `prevFcCompany*`, `newFcCompany*`;
list / stores / history gain `includeTotalAll` → `PaginationWithTotalAllDto.totalAllItems`;
`FcManagedStoreDto.brandGroup` removed (unused by the FE).

| ID     | Endpoint                                                                    | Result                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B3** | `PATCH /api/v1/admin/fc-companies/{id}/active`, `GET …/{id}/change-history` | **Closed.** `toSetActiveBody` sends the trimmed `reason` only with `isActive: false` and when non-blank (API: "Blank = none"). History appends 「（理由: {snapshot.reason}）」 to the 有効 → 無効 line (TC-029 wording).                                                                                                                                               |
| —      | `GET /api/v1/admin/fc-companies?includeTotalAll=`                           | **Adopted.** The header badge / banner total reads `pagination.totalAllItems` (requested only while a filter is active). The old `{ page: 1, limit: 1 }` query remains only as a fallback when the server returns `totalAllItems: null`.                                                                                                                               |
| B4     | `POST` / `PATCH /api/v1/admin/fc-companies[/{id}]`, `GET …/{id}`            | Still open — `ownedStore` "Derived from `managementType` — never stored", absent from both write DTOs.                                                                                                                                                                                                                                                                 |
| B6     | `GET …/{id}/change-history`                                                 | **Closed (2026-10-30).** API v0.7 adds `changedByRole` (CURRENT role, not the role at change time). Operator cell renders 「{changedByName}（{STAFF_ROLE_LABELS[role]}）」 via `formatHistoryOperator`; `system` / null / empty name → no suffix. Wording follows `STAFF_ROLE_LABELS` as-is (「本部」, not the prototype's 「本部管理者」) — user decision 2026-10-30. |
| G6     | `GET /api/v1/admin/fc-companies`                                            | Still open — "system / headquarter only".                                                                                                                                                                                                                                                                                                                              |

Not adopted: `unassign_store` now carries `newFcCompanyName`, but the prototype has no sentence for
the old company's side, so its line stays 「店舗紐づけ解除: {店舗名}」.

**Verification**: `npm run type-check` — 0 errors under `src/app/(private)/franchise-companies/**`
(the 6 repo errors in `staffs/[id]/edit` are pre-existing); `eslint` + `prettier --check` clean.
Live re-test 2026-10-01 (dev API, Playwright, HQ) per
[tests/test-plan.md §Re-test plan (2026-10-01)](./tests/test-plan.md): **26 cases run, 23 OK, 3 NG**.
B3 confirmed live — `PATCH /active` bodies `{ isActive: false, reason: "契約終了のため" }` / `{ isActive: false }` /
`{ isActive: true }`, history 「ステータス変更: 有効 → 無効（理由: 契約終了のため）」, blank reason → no suffix, surrounding
spaces trimmed, 1000 chars saved, markup rendered as text. `includeTotalAll=true` only while a filter is
on, no `limit=1` request, banner N ≤ M. The 3 NG (Y-03-B2 TC-066–TC-068) are the existing BUG-Y03B2-01: history
cells do not wrap, so a long reason runs out of the card. Pre-existing BUG-Y03B1-02/-06 still make 無効にする
unreachable by mouse with a very long reason (keyboard works)..

**B4 follow-up (2026-10-01)**: form checkbox made read-only and bound to 区分; `ownedStore` removed from
the form schema, the edit defaults and the body-builder note. Verified in the browser (create form: 直営
checked, FC / 業務委託 unchecked, always disabled, click has no effect; edit form of 直営 FC-002 checked;
no write request). Y-03-C TC-034 / TC-035 rewritten to the decision and recorded OK.
