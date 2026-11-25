# Research: Y-02 Store Management — 2026-10-02 delta + store-map-setup

**Plan**: [plan.md](./plan.md) | **Date**: 2026-10-02
**Contract audited**: `src/lib/openapi.real.json` + `src/lib/api-real/*` as staged on 2026-10-02 (regenerated, not yet committed). No network calls were made. Every **Verify live** item below must be confirmed against the dev backend before its task is closed (memory: the OpenAPI file can be stale).

Each entry: **Decision** / **Rationale** / **Alternatives considered**.

---

## R1 — The staged regen closes most Round 2 blockers

**Decision**: commit the staged `api-real` regen as the first task (WP0). Then remove the `TODO(round2)` seams it closes:

- **B3**: the `toNullableBody` / `object`-typed nullables.
- **B5**: staff times on business hours.
- **B9**: `genderRestriction` `mixed|women_only`.
- **B11**: `closedAt` on create.
- **B12**: `businessHours` on create.
- **B4, photos half**: `GET/PUT /images`.
  Run `tsc --noEmit`; the gate is 0 errors outside `.next/`.

**Rationale**: the code audit found these markers stale against the staged types: `store-api.util.ts:80,98,141`, `store-form.util.ts:94,121,128,148,152,153,178`, `store-form.tsx:60,65,156,491,506,735`, `create/page.tsx:67`, the settings tabs, and `basic-info-tab:190`. Leaving the casts in place hides real type errors.

**Still open after the regen**:

- **B2**: change-history field labels.
- **B6**: was the YOGA fee, now closed. `yogaUsageFee` / `payLaterEnabled` exist; see R6.
- **B7**: closed. `linkedAt` exists on partner stores.
- **B8**: campaign fields.
- **B10**: Staff `PATCH` whitelist, verify live.
- **B13**: `UpdateStoreDto` has no `businessHours`.
- **B14**: prefecture.
- **B4, image-URL half**.

**Alternatives**: keep the regen for a later round. Rejected, because photos (FR-055+) and the create-with-hours path need it now.

## R2 — Store status: four values, manual change through `PATCH /admin/stores/{id}`

**Decision**:

- **Vocabulary**: `operating | preparing | temporarily_closed | closed`, from the generated enum. It is already the single source in `_constants/constants.ts:62-94`. Only the tones change:
  - 準備中 (preparing) → `info`
  - 営業中 (operating) → `success`
  - 休業中 (temporarily closed) → `warning`
  - 閉店 (closed) → `muted`
    The raw amber/orange palette is replaced by tokens.
- **ステータス変更 (status change)**: sent as `adminStoreControllerUpdateMutation` with `{ status }` only. The FE enforces the transition matrix of detail FR-015c:
  - 準備中 → 営業中
  - 営業中 ⇄ 休業中
  - 閉店 is never offered; it is reached only through `closedAt` and the daily batch.
  - An illegal move the backend still refuses (422 `E-STR-006`) surfaces as a dialog error.
- **Gate**: System / Headquarter.

**Rationale**: the contract has no dedicated status endpoint. `UpdateStoreDto.status` takes the same enum, history records `changeAction=status_change`, and BR-STR-026 is referenced but not published.

**Closed 2026-10-07 (user): follow the BE contract.** Status changes go through `PATCH /admin/stores/{id}` as documented (BR-STR-026, refusal 422 `E-STR-006`); the FE keeps its transition matrix and does not echo `status` on form saves. No further BE ask. The original checklist is kept below.

**Verify live / ask BE (Q7)** _(closed)_:

1. The BR-STR-026 matrix.
2. That a manual `closed` is refused.
3. **`UpdateStoreDto.status` declares `default: "preparing"`**: confirm that a PATCH without `status` (every form save) does not reset it. If it does, every form save MUST echo the current status. This is a blocker for the form until it is confirmed.

**Alternatives**: wait for a dedicated endpoint. Rejected; the PATCH path is documented.

## R3 — Holiday 曜日どおり (follow-weekday): an absent holiday row means "follow the weekday"

**Decision**:

- `PUT /business-hours` accepts 1–8 rows. 曜日どおり is sent as **seven rows, with no `holiday` row**.
- 営業 (open) is `{ dayOfWeek: "holiday", isClosed: false, openTime, closeTime }`.
- 休業 (closed) is `{ dayOfWeek: "holiday", isClosed: true }`.
- On read, a missing `holiday` row = 曜日どおり.
- Applies to the detail hours Sheet (D12) and to the create body (form F11). Edit-mode form hours stay read-only (R9).

**Rationale**: no explicit mode exists; omission is the only lossless encoding the contract allows. This was option A of store-form Q4 / store-detail Q15. Those questions assumed a mock; the user has since chosen real API only.

**Closed 2026-10-07 (user): follow the BE contract.** An omitted `holiday` row is 曜日どおり, as decided above. No BE ask.

**Alternatives**: a new enum, which needs a BE change; storing the mode in the FE, which is impossible without a mock.

## R4 — 特別営業日 (special business day) = `exceptionType: "short_hours"`

**Decision**:

- 特別営業日 maps to `short_hours` and 臨時休業日 (temporary closure) maps to `closed`, on `/business-exceptions`.
- The one-per-date rule across both kinds is enforced on the client, because both kinds live in one list, and by the backend (409 `E-STR-004`).
- Editing the date is allowed; the PATCH moves it.
- `reason` is shown for 臨時休業日 only. Special days carry no reason in V0.

**Rationale**: the contract has only `short_hours | closed`. `short_hours` carries open/close times, which is exactly what a special business day needs.

**Closed 2026-10-07 (user): follow the BE contract.** The 2026-10-07 regen still offers only
`short_hours | closed`, so `short_hours` is the 特別営業日 type, including a day opened on a regular
closed day or a holiday-休業 day. Q10 is no longer asked.

## R5 — Calendar precedence (Y-02 v6)

**Decision**: classify each day in `business-calendar.tsx` by a pure function:

1. a per-date exception (`closed` → 臨時休業; `short_hours` → 特別営業)
2. a holiday that has an override row (営業 → 祝日営業; 休業 → 祝日休業)
3. the weekday row (closed → 定休日)
4. otherwise open
   A holiday without an override gets the label 祝日 only, with no tint.

Holiday dates come from the existing holiday source the calendar already uses. The audit found no new holiday endpoint in scope.

## R6 — Mutual use: one acceptance flag, labelled by brand group

**Decision**:

- `isAcceptEnabled` is the single flag. Its label and description depend on `brandGroup`:
  - JOYFIT: どこでもJOYの受入
  - FIT365: 相互利用オプション（¥500）の受入
- `payLaterEnabled` and `yogaUsageFee` are shown and edited for the JOYFIT group only.
- **Every `PUT /mutual-use` sends all fields**, including `payLaterEnabled` and `yogaUsageFee` for FIT365 (echoing the values read), because a PUT that omits them resets them to their defaults.
- Under-18 entry hours are written through `PATCH /admin/stores/{id}` (`minorEntryAllowedStart/End`, HQ-only), as a second write from the same Sheet.
- Writes are System / HQ.
- Partner add/remove UI is removed (user decision, D22). `permitted-store-select.tsx` is deleted.

**Rationale**: the contract has one flag. The defaults trap is documented in the PUT description.

**Closed 2026-10-07 (user): follow the BE contract.** The schema answers it: one `isAcceptEnabled` for both brand groups, and `payLaterEnabled` / `yogaUsageFee` are "JOYFIT-group only; unused for FIT365". Partners are same `brand_group` (`E-STR-012`).

## R7 — Photos: real presign hook, plus full-set `PUT /images`

**Decision**:

- **New shared hook `src/hooks/use-media-upload.hook.ts`**:
  - Calls `mediaControllerPresign` with `{ fileName, fileSize, contentType, tag }`.
  - Then `PUT`s the file to `url`, sending **every** `requiredHeaders` entry.
  - Returns `{ s3Key }` or a typed failure.
  - Mirrors the outcome-union shape of the mock `use-file-upload.hook.ts`, which is left untouched.
- **Form**: the photo card holds `{ s3Key, caption, previewUrl? }[]`. It initialises from `adminStoreControllerListImages`.
  - **Edit**: on save, and only if the list changed, call `adminStoreControllerReplaceImagesMutation` with `items: list.map(({ s3Key, caption }) => ({ s3Key, caption }))`.
  - **Create**: the same call runs after `POST` succeeds.
- **Display (detail gallery and form thumbnails)**: `StoreImageDto.url` is deprecated and equals the raw key. Render through `/api/v1/media/assets/{s3Key}` (`mediaAssetControllerGet`, 302 to signed S3). Freshly uploaded files preview from a local object URL.
- **Never call** the deprecated `POST`/`PATCH`/`DELETE /images`.

**Closed 2026-10-07 (user): follow the BE contract.** `store-image` is in the presign tag whitelist (member-shared), and `StoreImageDto.url` / `StoreCmsDetailDto.gymMapUrl` are the fetchable URLs. No BE ask. The original checks are kept below.

**Verify live** _(closed)_:

1. png/jpeg are accepted for tag `store-image`. If refused, the error is `E-MED-002`.
2. An `<img src="/api/v1/media/assets/{key}">` loads with the CRM session. If it does not, the gallery shows placeholders, and the item is logged under B4 as in R8.
3. The 10MB FE cap stands; the backend cap is 100MB.

**Rationale**: the BE answer of 2026-10-02 (API-083 §19.2). A full-set PUT is one transaction and one history row.

**Note**: photos are therefore a second write on save. This does not conflict with the 2026-09-22 "no second write" decision for weekly hours (D14): photos have no field on `UpdateStoreDto` at all, and the user explicitly asked for the card.

## R8 — Floor-map image: UI only, unwired (user decision 2026-10-02); locker positions real

**Decision**:

- On store-map-setup the image card is built to V0 and holds its file in session state only. No call is made to `PUT /stores/{id}/details` / `gymMapS3Key`, and no mock is added.
- Locker positions use `adminLockerControllerListLockersOptions({ storeId })` (`mapX`/`mapY`, relative 0..1, null pair = unplaced). Saves go through `adminLockerControllerUpdateLockerMutation` per moved cabinet, with `expectedUpdatedAt`. A stale write answers 422 `E-LOC-006` and is shown per cabinet. Partial success keeps the cabinets that failed marked 未保存 (unsaved).
- **Detail 店舗マップ tab**: placed/unplaced counts and read-only markers come from the same list. The image area shows its empty state until B4 lands.

**Rationale**: `gymMapS3Key` has no fetchable URL, and `PUT /details` replaces the whole row (BQ2). The user chose "build UI first, integrate when the API adds it; no mock".

## R9 — Weekly hours in the form: create sends them, edit stays read-only

**Decision**:

- **B12 is resolved**: `CreateStoreDto.businessHours` exists, so create mode makes the weekly table editable again (including the holiday mode of R3) and sends it in `POST`.
- **B13 is still open**: edit mode keeps `HOURS_READ_ONLY`, per the user's 2026-09-22 decision (integration-plan D14). The detail 営業設定 (business settings) tab remains the editor.
- The Staff footer line keeps 営業時間 (business hours) in its copy (spec FR-085) because Staff edits hours on the detail tab.

**Update 2026-10-07 — B13 resolved.** `UpdateStoreDto.businessHours` exists (full replace, same transaction, `staff` allowed on their own store). Edit mode makes the table editable and sends it in the `PATCH` only when the table or 祝日の扱い was touched; FR-044's rule applies only then. Stored staff-on-site windows are carried through for days that stay open, so the full replace does not wipe what the 営業設定 tab set.

## R10 — Own-store gate for Staff

**Decision**:

- New `src/app/(private)/stores/_utils/can-edit-store.util.ts`: `canEditStore(user, storeId)` returns true for System/HQ, or for Staff when `user.storeId === storeId`. It is modelled on `staffs/_utils/can-edit-staff.util.ts`.
- Used by:
  - the list row 編集 (edit) (L5)
  - the detail header 編集 (D7)
  - the photo-card 編集 (D26 / FR-016a)
  - the map-tab 店舗マップ設定 button (D2)
  - the store-map-setup wall
  - the edit page's guard
- Copy:
  - Staff on another store: 所属店舗の基本情報のみ編集できます
  - Other roles: 本部権限が必要です

**Rationale**: today every gate is `Permission.StoresEdit` alone (`stores-table-columns.tsx:238`, `basic-info-tab:100`, `edit/page.tsx:70`), and Staff holds it. `current-store.context.tsx:70-79` notes that `GET /admin/stores` may not be caller-scoped, so Staff could see 編集 enabled on every row.

**Verify live**: list scoping for Staff (the API doc says "staff see own stores").

## R11 — 運営企業 (operating company) options

**Decision**:

- **List filter and form select**: `adminFcCompanyControllerListOptions({ isActive: true, managementType: "franchise" })` through the existing `FcCompanySelectInput`, with 直営 (direct management) pinned first. In the form it is labelled 直営（運営企業なし）, mapping to `DIRECT_MANAGEMENT_VALUE` (null `fcCompanyId`).
- **Not implemented** in this round: the "only companies with ≥1 store in the permitted set" rule of list FR-013. There is no facet endpoint, and deriving it client-side would need the full store set (max `limit` 100). It is logged as a BE gap.
- **Manager/Staff 403 on `/fc-companies`**:
  - The list filter is hidden for roles without access.
  - The form is HQ-only for this field anyway; Staff sees it locked, showing the stored name from the store row.

**Closed 2026-10-07 (user)**: not FE scope (decision of 2026-10-05); `GET /admin/fc-companies` stays HQ-only and QA reports Manager/Staff access to the BE as a bug. No facet endpoint is built.

**Ask BE** _(closed)_:

- Does `entrustment` count as FC? The query takes one value.
- Access for Manager.

## R12 — store-map-setup routing and permissions

**Decision**:

- **Route**: `src/app/(private)/stores/[id]/map/page.tsx`, i.e. `/stores/{id}/map`. It is registered in `routes.config.ts`, and the breadcrumb reads 店舗管理 › {店舗名} › 店舗マップ設定.
- **Store from URL path**: the spec's `?storeId=` rule is satisfied by the path segment. Entry points from the locker list/form without a store link to `/stores/{currentStoreId}/map`. With 全店舗 (all stores) and no current store, the entry is disabled with the spec's empty-state copy.
- **Permission**: reuse the read permission for viewing. Editing is gated by `canEditStore`; Manager / Trainer / Observer get the spec's no-access wall.
- **Unsaved-changes bar**: a new `src/components/common/unsaved-changes-bar.tsx`, ported from the V0 component (copy 未保存の変更があります / 破棄 / 変更を保存).
- **Guards**: `useUnsavedChangesGuard` and `DiscardChangesDialog`, both existing.

**Alternatives**: a top-level `/store-map?storeId=`. Rejected: every other store screen is nested under `/stores/[id]`, and the path makes the store explicit.

## R13 — Detail-tab editing surfaces move into Sheets/Dialogs

**Decision**: follow V0 (D13, D15, D16, D21), using shadcn `Sheet` / `Dialog` / `AlertDialog`, which already exist.

- The inline editors in `business-hours-settings.tsx`, `exception-hours-settings.tsx`, `temporary-closure-days-settings.tsx` and `access-settings-tab/index.tsx` are replaced.
- The existing validation is kept, including the spec rules that have no V0 source.

**Constitution IV note**: these are the prototype's own interaction model, not extra modals.

## R14 — Mock surface

**Decision**: no new mock-db work. These screens are on the real API since round 1.

- The mock `StoreListStatus` two-value enum (`src/app/api/_schemas/store.schema.ts:58`, reused by `franchise-company.schema.ts:235`) is widened to four values only because Y-03's FC linked-stores tab still reads the mock.
- The spec's "mock first" wording (old Q1 / Q4 text) is superseded by real-API-only, per the user decision.
