# Tasks: Y-02 Store Management — 2026-10-02 prototype sync + store-map-setup

**Input**: [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api-contracts.md](./contracts/api-contracts.md), [quickstart.md](./quickstart.md), and the four sub-specs with their `checklists/parity.md`.
**Tests**: none (Constitution: No Testing Policy). Verification uses `tsc --noEmit` (0 errors outside `.next/`), `npm run lint`, [quickstart.md](./quickstart.md) and `/verify-parity`.

**Conventions**

- Paths are relative to the repo root.
- `S/` = `src/app/(private)/stores/`.
- `V0/` = `.cache/fitness-crm-ui/src/pages/` at `47423ec`.
- Parity ids are prefixed by sub-spec, because the numbering restarts per checklist: `list:`, `form:`, `detail:`, `map:`.
- Only **unchecked** (`[ ]`) parity items are in scope. Items already ticked `[x]` were verified in Round 1 and must not regress.
- All API calls use the generated hooks in `src/lib/api-real/@tanstack/react-query.gen.ts`. Never edit generated files.
- No commits are made without the user's go-ahead. The user keeps unrelated files staged, so commit with `git commit -- <paths>`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**:

| Story | Scope                                              | Priority |
| ----- | -------------------------------------------------- | -------- |
| US1   | store-list delta                                   | P1       |
| US2   | store-form field delta                             | P1       |
| US3   | store-form 店舗写真 card                           | P2       |
| US4   | detail header / 基本情報 / status change / gallery | P1       |
| US5   | detail 営業設定                                    | P1       |
| US6   | detail 契約・料金 + 入退館設定                     | P2       |
| US7   | detail 店舗マップ tab                              | P2       |
| US8   | store-map-setup screen                             | P2       |

---

## Phase 1: Setup

- [x] T001 Adopt the staged real-API regen as the working contract. Confirm `git diff --cached --stat` lists only `src/lib/openapi.real.json` and `src/lib/api-real/{index,sdk.gen,types.gen}.ts`, `src/lib/api-real/@tanstack/react-query.gen.ts`. Do not regenerate and do not edit them. Ask the user before committing (`git commit -- <those paths>`).
- [x] T002 Run `npx tsc --noEmit` and record the error list outside `.next/` as the baseline in the scratchpad. These errors come from the regen (research R1); they are fixed in T008.

---

## Phase 2: Foundational (blocks every story)

- [x] T003 [P] Change the status tones in `S/_constants/constants.ts` (`STORE_STATUS_TONES` and `STORE_STATUS_BADGE_CLASSES`): `preparing` → `info`, `operating` → `success`, `temporarily_closed` → `warning`, `closed` → `muted`. Use design tokens, not raw amber/orange — port from `V0/../data/stores.ts` L24-L39 (`getStoreStatusBadgeClass`, StatusCard tones); satisfies list:PAR066 (tone half), detail:PAR006 (tone half).
- [x] T004 [P] Widen the mock `StoreListStatus` in `src/app/api/_schemas/store.schema.ts:58` from `['operating','closed']` to the four values. This file is reused by `src/app/api/_schemas/franchise-company.schema.ts:235` for the Y-03 linked-stores tab (research R14).
- [x] T005 [P] Create `S/_utils/can-edit-store.util.ts` exporting `canEditStore(user, storeId): boolean` (System/Headquarter → true; Staff → `user.storeId === storeId`; others → false) and `editStoreDenyReason(user, storeId)`, which returns `所属店舗の基本情報のみ編集できます` (Staff, other store) or `本部権限が必要です`. Model it on `src/app/(private)/staffs/_utils/can-edit-staff.util.ts` (research R10).
- [x] T006 [P] Create `src/hooks/use-media-upload.hook.ts`: `useMediaUpload({ tag, maxSizeMB, acceptedTypes })` → `{ uploadFile(file): Promise<{ ok: true; s3Key: string } | { ok: false; reason: 'type' | 'size' | 'network' | 'rejected' }>, isUploading }`.
  - Call `mediaControllerPresignMutation` with `{ fileName, fileSize, contentType, tag }`.
  - Then `fetch(url, { method, headers: requiredHeaders, body: file })`, sending **every** `requiredHeaders` entry.
  - Mirror the outcome-union shape of `src/hooks/use-file-upload.hook.ts`, which stays untouched (research R7).
- [x] T007 [P] Create `src/components/common/unsaved-changes-bar.tsx`: a sticky bottom bar with a top border and background fill. The left side has a warning dot and `message` (default 未保存の変更があります). The right side has 破棄 (ghost, small) then 変更を保存 (primary). Props `{ message?, onDiscard, onSave, isSaving }`. Port from `.cache/fitness-crm-ui/src/components/unsaved-changes-bar.tsx` L60-L80; satisfies map:PAR121, map:PAR122, map:PAR126.
- [x] T008 Remove the `TODO(round2)` seams the regen closes:
  - **B3**: `S/_utils/store-api.util.ts:80`; `S/_utils/store-form.util.ts:128,148`; the settings tabs `business-hours-settings.tsx:104`, `exception-hours-settings.tsx:173`, `temporary-closure-days-settings.tsx:173`, `contract-tab/_components/one-day-pass-price-drawer.tsx:165`, `access-settings-tab/index.tsx:233`.
  - **B5**: `store-api.util.ts:141`; `store-form.util.ts:121`; `S/_schemas/store-form.schema.ts:83`.
  - **B9**: `store-api.util.ts:98`; `store-form.util.ts:94`.
  - **B11**: `S/_components/store-form.tsx:491,735`; `store-form.util.ts:152`; `S/create/page.tsx:67`.
  - **B12**: `store-form.tsx:60,65,156,506`; `store-form.util.ts:153,178`; `store-form.schema.ts:164`; `create/page.tsx:67`.
  - Delete `toNullableBody` and the `as StoreWeeklyHourDto` casts where the DTO is now typed.
  - Keep B2, B8, B10, B13, B14 and the floor-map half of B4.
  - Run `tsc --noEmit` until there are 0 errors outside `.next/`.
- [x] T009 [P] Create `S/_components/store-floor-map.tsx` (`StoreFloorMap`: an image centred at its natural aspect ratio, max width 100%, with a relative overlay; the image alt is `{店舗名}のフロア図`) and `S/_components/locker-marker.tsx` (`LockerMarker`).
  - `LockerMarker` props: `{ symbol, name, shapeLabel, x, y, selected, hovered, unsaved, readOnly, onPointerDown, onKeyDown, onClick }`. Positioned by `left/top %`, the only inline style allowed.
  - Marker look: 32px high and at least 32px wide, rounded, with a 2px border. Selected = primary fill + ring with offset. Hover = stronger shadow. Unsaved = warning dot. Visible focus ring.
  - The tooltip and aria-label read `{symbol}　{name}・{shape}`. Shape labels are 3列×9段 / 3列×7段 / 3列×5段 / 3列×2段.
  - Port from `.cache/fitness-crm-ui/src/components/store-floor-map.tsx` L40-L110 and `.cache/fitness-crm-ui/src/data/store-map.ts` L44-L79; satisfies map:PAR060-PAR069, map:PAR075 (cursor), map:PAR083 (readOnly cursor).
- [x] T010 Register the routes `/stores/map` and `/stores/[id]/map` in `src/lib/routes/routes.config.ts` under the 店舗管理 sidebar entry, so the sidebar stays highlighted. Use the store read permission for viewing; editing is gated in-page by `canEditStore`. Satisfies map:PAR001.
- [ ] T011 Verify live per [quickstart.md](./quickstart.md) §0 V1–V6 and record the results in [research.md](./research.md) under R2 / R3 / R7 / R10. **V1 (PATCH without `status`) blocks the merge of US2 and US4.** If PATCH resets the status, add `status` echoing to `buildUpdateBody` in `S/_utils/store-form.util.ts`.

**Checkpoint**: `tsc` is clean, and all shared pieces exist. US1–US8 can now run in parallel.

---

## Phase 3: US1 — store-list delta (P1) 🎯 MVP slice

**Goal**: the list matches prototype `47423ec`: four statuses, the 店舗コード placeholder, FC-only company options, and the Staff own-row edit.
**Independent test**: [quickstart.md](./quickstart.md) §1.

- [x] T012 [P] [US1] Change the search placeholder in `S/_components/stores-filters.tsx:70` to `店舗名・店舗コードで検索...`. Update the Round 3 comment at `:67-68` to name `店舗名・店舗コード・テリトリー名で検索...` — port from `V0/store-list.tsx` › search Input (L546); satisfies list:PAR011.
- [x] T013 [US1] Restrict the 運営企業 filter in `S/_components/stores-filters.tsx:144-156` to `queryFilters={{ isActive: true, managementType: 'franchise' }}`, keeping 全運営企業 / 直営 pinned first. Render the filter only for roles that can read `/fc-companies` (System/HQ), so there is no 403 toast for Manager/Staff (research R11).
  - The "only companies with ≥1 store" facet is **not** built. Leave a `// BE gap: no facet endpoint (research R11)` comment.
  - Port from `V0/store-list.tsx` › COMPANY_OPTIONS (L111-L113, L640-L649); satisfies list:PAR029.
- [x] T014 [P] [US1] Check that the ステータス filter options in `S/_constants/constants.ts` (`STORE_LIST_STATUS_FILTER_OPTIONS`) read 全ステータス / 準備中 / 営業中 / 休業中 / 閉店 in lifecycle order, and fix the order if needed — port from `V0/store-list.tsx` L692-L697 + `data/stores.ts` L9; satisfies list:PAR035, list:PAR066 (with T003).
- [x] T015 [US1] Gate the row 編集 in `S/_components/stores-table-columns.tsx:232-246` with `canEditStore(user, row.original.id)` (T005) via `useAuthUser` inside a small cell component. When false, keep the inert + 本部 badge rendering — port from `V0/store-list.tsx` › RoleGatedMenuItem (L795); keeps list:PAR068/PAR069 green.

**Checkpoint**: US1 is shippable alone.

---

## Phase 4: US2 — store-form field delta (P1)

**Goal**: form fields, marks, copy and dialogs match prototype `47423ec` (store-form spec Session 2026-10-02 F1–F11).
**Independent test**: [quickstart.md](./quickstart.md) §2 steps 1–6, 9.

- [x] T016 [P] [US2] Add `<OptionalMark/>` to the 営業時間（曜日別デフォルト設定）label in `S/_components/store-form.tsx:513`, and append the helper sentence `祝日は「曜日どおり」のとき、その日の曜日の設定に従います`. Confirm every other non-required field already carries 任意.
  - Port from `V0/store-form.tsx` › FormField `optional` (L65-L72, L459).
  - Satisfies form:PAR019, form:PAR022, form:PAR034-PAR036, form:PAR038-PAR040, form:PAR060-PAR063, form:PAR065, form:PAR081.
- [x] T017 [US2] Rework `CompanyField` in `S/_components/store-form.tsx:658-708`.
  - First option: explicit `直営（運営企業なし）` (value `DIRECT_MANAGEMENT_VALUE`, `S/_schemas/store-form.schema.ts:48`).
  - Placeholder `選択してください`; helper `FC企業マスタから選択。直営の場合は「直営（運営企業なし）」を選択`; 任意 chip.
  - Options = active franchise companies (`isActive: true, managementType: 'franchise'`). Choosing 直営 sends `fcCompanyId: null`.
  - Port from `V0/store-form.tsx` › 運営企業 FormField (L59-L60, L377-L389); satisfies form:PAR031, form:PAR032.
- [x] T018 [P] [US2] Change the 店舗コード placeholder to `例: TK-001` (`S/_components/store-form.tsx:184`) and confirm the mode-dependent helper copy (`:129-133`) — port from `V0/store-form.tsx` L297-L317; satisfies form:PAR020.
- [x] T019 [US2] Add the store-code change warning to `S/_components/store-form.tsx`.
  - Add the prop `loadedClubCode?: string`, passed from `S/[id]/edit/page.tsx`.
  - In edit mode, while `club_code.trim() !== loadedClubCode`, render a warning `Alert` (warning tint, `AlertTriangle`) directly under the input: `店舗コードはロッカー・機器・商材など他機能から参照されています。変更すると影響範囲が大きくなります。`
  - Port from `V0/store-form.tsx` L308-L315; satisfies form:PAR020c, form:PAR166 (warning half).
- [x] T020 [US2] Add the code-change confirm `AlertDialog` to `S/[id]/edit/page.tsx:165-171`.
  - When the submitted code differs from the loaded one, open the dialog instead of submitting. Title `店舗コードを {旧コード} から {新コード} に変更しますか？`; body as T019; buttons キャンセル / 変更して保存する.
  - Only 変更して保存する submits. Cancel keeps the values and the dirty state.
  - Port from `V0/store-form.tsx` › code-change AlertDialog (L225-L235, L576-L590); satisfies form:PAR020b, form:PAR166.
- [x] T021 [P] [US2] Set the brand-lock tooltip copy to `営業中の店舗ではブランドを変更できません（開業準備中のみ変更可）` in `BRAND_LOCKED_TOOLTIP` (`S/_components/store-form.tsx:58`) and `BRAND_TRANSITION_MESSAGE` (`S/[id]/edit/page.tsx:60`). Keep the Staff tooltip precedence (`:152-153`) — port from `V0/store-form.tsx` L166-L168, L333-L334; satisfies form:PAR024a, form:PAR168.
- [x] T022 [US2] Rework the サブブランド field in `S/_components/store-form.tsx:257-316`.
  - Do not render it when the brand is FIT365; ブランド then sits alone in its row.
  - Disabled with 任意 when no brand is chosen. Required mark when JOYFIT.
  - Helper `JOYFITの場合に選択`.
  - Changing the brand clears both the sub-brand and any brand/sub-brand errors.
  - The validation message `サブブランドを選択してください` lives in the Zod schema (`S/_schemas/store-form.schema.ts`).
  - Port from `V0/store-form.tsx` L335, L344-L358, L205-L206; satisfies form:PAR026, form:PAR028, form:PAR029, form:PAR043, form:PAR099a.
- [x] T023 [P] [US2] Update the restricted-Staff footer line in `S/_components/store-form-shell.tsx:121-123` to `店舗名・住所・電話番号・営業時間・店舗写真のみ編集できます。それ以外の項目は本部へ変更を依頼してください` (spec FR-085 / FR-086a) — port from `V0/store-form.tsx` L567; satisfies form:PAR089.
- [x] T024 [US2] Holiday mode in the weekly table (create mode; research R3/R9):
  - **`S/_schemas/store-form.schema.ts`**: add `holiday_mode: 'follow_weekday' | 'open' | 'closed'`, default `follow_weekday`.
  - **`S/_components/store-form.tsx:520-571`**: replace the 祝日 time row with the label 祝日 and a `Select` `aria-label="祝日の扱い"` offering 曜日どおり / 営業 / 休業. Only 営業 shows a second line with open〜close time inputs (aria-labels `祝日 開店時刻` / `祝日 閉店時刻`).
  - **`S/_utils/store-form.util.ts:96-104`**: map `follow_weekday` to no holiday row (7 rows), `open` to `{dayOfWeek:'holiday',isClosed:false,openTime,closeTime}`, `closed` to `{dayOfWeek:'holiday',isClosed:true}`.
  - **`S/create/page.tsx`**: send `businessHours` in the POST.
  - **Edit mode**: the table stays read-only (`HOURS_READ_ONLY`, B13), but renders the mode read from the API (a missing row → 曜日どおり).
  - Port from `V0/store-form.tsx` › HolidayMode (L131-L146, L461-L527); satisfies form:PAR066, form:PAR068, form:PAR068a-PAR068c.
- [x] T025 [US2] Check the Round 1 divergence list still holds in `S/_components/store-form.tsx`: no status select, no is-FC toggle, no 会計コード / メールアドレス / social / floor-map upload. Satisfies form:PAR160, form:PAR167.

---

## Phase 5: US3 — store-form 店舗写真 card (P2, dev-added, no V0 source)

**Goal**: add and delete store photos from the form, through the full-set `PUT /images` (store-form FR-055–FR-059f, FR-070a, FR-070c, FR-086a).
**Independent test**: [quickstart.md](./quickstart.md) §2 steps 7–9.
**Visual reference**: `V0/store-page-form.tsx` › 写真管理 card (L1023-L1120). This is the I-01 component, not a store-form source. Drop its 公開/非公開 dot, メイン badge and 並び順を編集.

- [x] T026 [US3] Add `photos: StorePhotoDraft[]` to `S/_schemas/store-form.schema.ts` (`{ s3Key, caption: string|null, previewUrl?, status: 'uploaded'|'uploading'|'failed' }`, max 20). Add `buildPhotoItems(list)` → `{ items: list.filter(uploaded).map(({s3Key, caption}) => ({ s3Key, caption })) }` and `photosChanged(loaded, current)` (ordered `s3Key` comparison) to `S/_utils/store-form.util.ts` (data-model.md).
- [x] T027 [US3] Create `S/_components/store-form-photos.tsx` (`"use client"`: file input + hover state). It satisfies form:PAR170-PAR178, form:PAR183, form:PAR184 — ref `V0/store-page-form.tsx` L1028-L1119.
  - **Header**: title 店舗写真, with the right-aligned counter `{n}枚 / 最大20枚`.
  - **Helper**: `店舗の外観・内装・設備の写真を登録します。表示順は登録した順です。`
  - **Grid**: 4 columns (`lg:` 5), 16:9 thumbnails with a rounded border.
  - **Thumbnail source**: `previewUrl ?? /api/v1/media/assets/{s3Key}`.
  - **Delete**: a hover X button at the top-right, `aria-label="写真を削除"`, which removes the photo from the form state at once.
  - **Add tile**: a dashed 写真を追加 tile with an Upload icon. Click or drop opens a JPG/PNG multi-select picker.
  - **Footer note**: `JPG, PNG / 最大10MB / 最大20枚`.
  - **Upload**: each accepted file shows an uploading tile through `useMediaUpload({ tag: 'store-image', maxSizeMB: 10, acceptedTypes: ['image/jpeg','image/png'] })` (T006). On success it is appended.
- [x] T028 [US3] Validation and errors in `S/_components/store-form-photos.tsx`. Messages render inline under the grid.
  - **Wrong type**: `JPG・PNG 以外の形式のため登録できません（選んだファイル: {name}）`.
  - **Over 10MB**: `10MBを超えているため登録できません（選んだファイル: {x.x}MB）`.
  - **Over 20**: `写真は最大20枚まで登録できます`. Files that still fit are kept; the add tile is disabled at 20.
  - **Upload failure**: remove the tile and show `写真のアップロードに失敗しました。もう一度お試しください`.
  - Satisfies form:PAR179-PAR182.
- [x] T029 [US3] Mount the card between 基本情報 and 備考 in `S/_components/store-form.tsx`, in create and edit modes, with `id="photos"` for the detail 編集 deep link. The card is never locked for restricted Staff (FR-086a). Disable the primary button in `S/_components/store-form-shell.tsx` while any photo is `uploading`. Satisfies form:PAR008, form:PAR185, form:PAR190.
- [x] T030 [US3] Edit mode in `S/[id]/edit/page.tsx`.
  - Initialise `photos` from `adminStoreControllerListImagesOptions({ path: { id } })`. While loading, show a loading treatment; on error, show an error with retry inside the card only.
  - On save, when `photosChanged`, call `adminStoreControllerReplaceImagesMutation` with `buildPhotoItems`.
  - Report a photo failure separately from the store-row failure (FR-070a): name the part and keep it dirty.
  - On success, invalidate the images query and the store detail query.
  - Never call the deprecated `adminStoreControllerAddImage/UpdateImage/DeleteImage`.
  - Satisfies form:PAR176, form:PAR186, form:PAR188, form:PAR189, form:PAR191.
- [x] T031 [US3] Create mode in `S/create/page.tsx`.
  - After `adminStoreControllerCreateMutation` succeeds and photos is non-empty, call `adminStoreControllerReplaceImagesMutation` for the new id.
  - If the PUT fails, keep the store, toast `店舗は登録しましたが、写真の保存に失敗しました。編集画面から再度登録してください`, and navigate to the list as on success (FR-070c).
  - Satisfies form:PAR187.

---

## Phase 6: US4 — store-detail header, 基本情報, status change, gallery (P1)

**Goal**: detail spec D3–D9 and D26.
**Independent test**: [quickstart.md](./quickstart.md) §3 steps 1–4, 10.

- [x] T032 [US4] Move the edit action to the page header in `S/[id]/page.tsx:109-117`: an **編集** button (default variant, small, pencil icon) linking to `/stores/{id}/edit`. Gate it with `canEditStore`; when false, it is disabled with `editStoreDenyReason` as the tooltip. Remove the 基本情報を編集 button and the caption 店舗の基本情報を管理します。 from `S/[id]/_components/tabs/basic-info-tab/index.tsx:97-110` — port from `V0/store-detail.tsx` › PageHeader actions (L934-L946, L541-L544); satisfies detail:PAR004a, detail:PAR012-PAR014.
- [x] T033 [P] [US4] Make the header status badge in `S/[id]/page.tsx:111-114` render a pill with a leading dot over the four values, using T003's tones — port from `V0/store-detail.tsx` L927-L932; satisfies detail:PAR006.
- [x] T034 [US4] Rework the 一般情報 card fields in `S/[id]/_components/tabs/basic-info-tab/index.tsx:120-170`.
  - ブランド shows the `brandGroup` label.
  - Add a サブブランド row directly after it: the `brandEnum` label for the JOYFIT group, else a muted —. Use `fromStoredBrand` (`S/_schemas/store-form.schema.ts:195`).
  - 受付開始日 / プレオープン日 sit after 店舗名（カナ）, as YYYY/MM/DD or a muted —.
  - Field order exactly as V0 (19 fields; テリトリー stays Round 3).
  - Port from `V0/store-detail.tsx` › 一般情報 (L975-L1080); satisfies detail:PAR015, detail:PAR018a, detail:PAR031a, detail:PAR031b, detail:PAR033.
- [x] T035 [P] [US4] Delete the フロアマップ card at `S/[id]/_components/tabs/basic-info-tab/index.tsx:207-223`, together with its `TODO(round2) B4` comment. The floor map moves to the 店舗マップ tab (US7). Keeps detail PAR038 withdrawn.
- [x] T036 [US4] StatusCard in `S/[id]/_components/tabs/basic-info-tab/index.tsx:176-188`.
  - The tone and label follow the four-value status.
  - The meta lines are `閉店予定日: {closedAt}` (only when set), then 作成 / 更新.
  - Add a full-width outline **ステータス変更** button (RefreshCw icon), enabled for System/HQ only, otherwise disabled with the tooltip `ステータス変更権限がありません`.
  - For a 閉店 store, it is disabled with `閉店した店舗のステータスは変更できません`.
  - Use the action slot of `src/components/common/status-card.tsx`, or add one.
  - Port from `V0/store-detail.tsx` L1090-L1126; satisfies detail:PAR035, detail:PAR035a.
- [x] T037 [US4] Create `S/[id]/_components/store-status-change-dialog.tsx` (`"use client"`, Dialog).
  - **Copy**: title ステータス変更; description `店舗のステータスを変更します。`; read-only 店舗名 and a 現在のステータス badge.
  - **Select** 新しいステータス (placeholder ステータスを選択) lists all four values. Unreachable ones are disabled with a reason:
    - the current value: 現在のステータスです;
    - any move from closed: 閉店した店舗のステータスは変更できません;
    - a move to preparing: 開業準備中には戻せません;
    - a move to closed: 閉店日を設定すると自動的に閉店になります;
    - anything else: この遷移はできません.
  - **Allowed moves**: 準備中→営業中 and 営業中⇄休業中.
  - **Buttons**: キャンセル / 変更する, disabled until a value is chosen.
  - **Submit**: `adminStoreControllerUpdateMutation({ path:{id}, body:{ status } })`. A 422 `E-STR-006` shows in the dialog.
  - **On success**: invalidate the store detail, list and change-history queries, and toast `{店舗名}のステータスを「{label}」に変更しました`.
  - Port from `V0/store-detail.tsx` › status dialog (L133-L232, L549-L557, L2724-L2732); satisfies detail:PAR035b-PAR035d.
- [x] T038 [US4] Rework the 店舗写真 gallery in `S/[id]/_components/tabs/basic-info-tab/index.tsx:190-205`.
  - Read `adminStoreControllerListImagesOptions` and render a 3-column grid of square thumbnails (`/api/v1/media/assets/{s3Key}`, alt = 店舗名) in stored order.
  - With no photos, while loading, or on error, render the V0 placeholder slots (muted Image icon). On error, add a muted `写真を読み込めませんでした`.
  - Add a header **編集** button (outline, small, pencil icon) → `/stores/{id}/edit#photos`, gated exactly like T032.
  - Remove the photos-half `TODO(round2) B4`.
  - Port from `V0/store-detail.tsx` › 店舗写真 (L1130-L1143); satisfies detail:PAR036, detail:PAR037, detail:PAR037a-PAR037c.

---

## Phase 7: US5 — store-detail 営業設定 (P1)

**Goal**: detail spec D10–D16 (Y-02 v6 precedence, the holiday mode, Sheets, 特別営業日).
**Independent test**: [quickstart.md](./quickstart.md) §3 steps 5–7.

- [x] T039 [US5] Add a pure `classifyDay(date, { weekly, holidayRow, holidays, exceptions })` to `S/[id]/_components/tabs/business-settings-tab/business-hours-shared.ts`. It returns `temporary_closed | special_open | holiday_open | holiday_closed | regular_closed | holiday_label_only | open` with the precedence exception > overridden holiday > weekday. An un-overridden holiday follows its weekday and gets the label only (research R5) — port from `V0/store-detail.tsx` L421-L452; satisfies detail:PAR048a, detail:PAR049.
- [x] T040 [US5] Use `classifyDay` in `S/[id]/_components/tabs/business-settings-tab/business-calendar.tsx:39-97`.
  - **Tints**: 臨時休業 info, 特別営業 success, 祝日営業 warning, 祝日休業 / 定休日 destructive; the 祝日 label alone has no tint. 短縮 is removed.
  - **Labels**: in-cell labels to match.
  - **Legend** (wrapping): 営業日 / 定休日・祝日休業 / 臨時休業 / 特別営業 / 祝日営業.
  - Port from `V0/store-detail.tsx` › calendar (L662-L679, L1183-L1221); satisfies detail:PAR044, detail:PAR047, detail:PAR048.
- [x] T041 [US5] Move the weekly-hours editor in `S/[id]/_components/tabs/business-settings-tab/business-hours-settings.tsx` into a right-side `Sheet`.
  - **Opener**: the 編集 button (outline, small, pencil icon) role-gated to Headquarter / System / Staff (own store via `canEditStore`).
  - **Header and guidance**: title `営業時間を設定する` (Clock icon); guidance `通常営業日の曜日別営業時間を設定します。定休日にした曜日は営業カレンダーに定休日として反映されます。祝日は「曜日どおり」のとき、その日の曜日の設定に従います。`
  - **Rows**: per-weekday open/close inputs and a 定休日 checkbox that disables them.
  - **Holiday row**: the 祝日 row is a `Select` 祝日の扱い (曜日どおり default / 営業 / 休業); times only for 営業.
  - **Read view**: 8 rows; open = clock + times; closed = 定休日; 祝日 = 曜日どおり / 休業 / times.
  - **Validation**: keep the spec rule that an open day needs both times (no V0 source).
  - **Save**: `ReplaceBusinessHoursMutation` with the R3 mapping (7 rows for 曜日どおり); toast `営業時間設定を保存しました`.
  - Port from `V0/store-detail.tsx` L1234-L1266, L1433-L1490, L1529-L1566; satisfies detail:PAR051, detail:PAR051a-PAR051c, detail:PAR052, detail:PAR053.
- [x] T042 [US5] Move the staff-hours editor in `business-hours-settings.tsx` into a Sheet the same way.
  - **Header and guidance**: title `スタッフ常駐時間帯を設定する`; guidance `ゲートストップの判定に使用されるスタッフ常駐時間帯を曜日別に設定します。常駐しない曜日は「常駐なし」にしてください。`
  - **Rows**: start/end per day with a 常駐なし checkbox; closed days show 定休日; 祝日 shows `曜日どおり（その日の曜日の常駐時間帯）` or 休業.
  - **Opener**: the 編集 button is ghost, tiny, gated as T041.
  - **Save**: toast `スタッフ常駐時間帯を保存しました`.
  - Port from `V0/store-detail.tsx` L1273-L1308, L1491-L1528; satisfies detail:PAR055, detail:PAR055a, detail:PAR057.
- [x] T043 [US5] Rename 例外営業時間設定 / 例外営業日 to **特別営業日** everywhere (titles, toasts, aria) in `exception-hours-settings.tsx:91,99,107,204` and `business-hours-shared.ts:76`. Map it to `exceptionType: 'short_hours'` (research R4).
  - **List**: rows sorted by date ascending, each a bordered box with a calendar icon + date + times.
  - **Empty state**: `特別営業日の設定はありません`.
  - **Block action**: 日付追加 (ghost, plus icon) gated as T041.
  - Port from `V0/store-detail.tsx` L1314-L1367; satisfies detail:PAR058, detail:PAR059.
- [x] T044 [US5] Rework `temporary-closure-days-settings.tsx`: rows sorted by date ascending (calendar icon + date, reason or —), the empty state `臨時休業日の設定はありません`, and a 日付追加 action gated as T041 — port from `V0/store-detail.tsx` L1371-L1424; satisfies detail:PAR060, detail:PAR061.
- [x] T045 [US5] Replace the inline add/edit rows in both settings files with one shared `Dialog`, in a new file `S/[id]/_components/tabs/business-settings-tab/exception-day-dialog.tsx`.
  - **Titles and descriptions**: titles 特別営業日を追加 / 特別営業日を編集 / 臨時休業日を追加 / 臨時休業日を編集. Descriptions `祝日や年末年始など、通常と異なる営業時間で営業する日を設定します。` / `工事・清掃等で休業する日を設定します。営業カレンダーに臨時休業として反映されます。`
  - **Fields**: 日付 (required DatePicker, 日付を選択; editable on edit). For special days, 営業時間 (required open〜close, with the spec rule close > open, no V0 source). For closures, 理由 (optional, placeholder `例: 設備点検`).
  - **Cross-kind one-per-date**: a red border plus `この日はすでに{特別営業日|臨時休業日}が登録されています。既存の設定を編集または削除してください`, and submit disabled. The backend 409 `E-STR-004` maps to the same message.
  - **Buttons**: キャンセル / 追加する or 変更を保存.
  - **Toasts**: 特別営業日を追加しました / 更新しました, and the 臨時休業日 equivalents.
  - Port from `V0/store-detail.tsx` L555-L610, L1572-L1615; satisfies detail:PAR061a, detail:PAR061b, detail:PAR061d.
- [x] T046 [US5] Add a delete `AlertDialog` to both lists: title `特別営業日を削除しますか？` / `臨時休業日を削除しますか？`; body `{date} の設定を削除します。この日は祝日・曜日の設定に従います。`; buttons キャンセル / 削除する (destructive). Toast …を削除しました — port from `V0/store-detail.tsx` L565-L588, L1618-L1633; satisfies detail:PAR061c.

---

## Phase 8: US6 — store-detail 契約・料金 + 入退館設定 (P2)

**Goal**: detail spec D17–D23.
**Independent test**: [quickstart.md](./quickstart.md) §3 steps 8–9.

- [x] T047 [P] [US6] Add a separate **区分** column between 料金（税込） and 紐づけ日 in `S/[id]/_components/tabs/contract-tab/_components/main-contract-section.tsx:126-150`. Column order: 主契約ID / 主契約名 / 契約タイプ / 料金（税込） / 区分 / 紐づけ日 / 操作. The badge reads 全社共通 (building icon, warning tint) when `storeId` is null, or 当店限定 (store icon, info tint). Remove the inline badge from the name cell, and update `contract-tab/contract-tab.data.ts:29-38` — port from `V0/store-detail.tsx` L1672-L1695; satisfies detail:PAR066, detail:PAR066a.
- [x] T048 [P] [US6] Remove the 親オプション column and its `TODO(round2)` from `contract-tab/_components/option-section.tsx:83-131`, and drop the options' `source:'hq'` origin badge. Column order: オプションID / オプション名 / 料金（税込） / 操作 — port from `V0/store-detail.tsx` L1761-L1768; satisfies detail:PAR074.
- [x] T049 [US6] Update the drawer candidates in `contract-tab/_components/drawer-list-item.tsx:32-45` (and `bind-items-drawer.tsx`).
  - Plan rows: checkbox + name + 区分 badge (全社共通 / 当店限定) + the meta line `{type} · {price}`.
  - Option rows: no origin badge; meta `{price} · {id}`.
  - Make `source` optional.
  - Port from `V0/store-detail.tsx` L2018-L2034, L2076-L2090; satisfies detail:PAR102, detail:PAR103, detail:PAR111.
- [x] T050 [US6] Split the 相互利用設定 card in `S/[id]/_components/tabs/access-settings-tab/index.tsx:357-470` by `brandGroup`.
  - **JOYFIT**: label `どこでもJOYの受入`, description `どこでもJOYを利用する他のJOYFIT店舗の会員を受け入れる`.
  - **FIT365**: label `相互利用オプション（¥500）の受入`, description `相互利用オプション契約者（他のFIT365店舗の会員）の利用を受け入れる`.
  - **Acceptance badge**: 受入可 / 受入不可 (muted).
  - **1日単位の後払い設定 row**: badge 有効 / 無効, JOYFIT only.
  - **Period pair**: 相互利用受入可能期間（開始日／終了日）, — when unset.
  - **Editing**: the card's 編集 button (outline, small, pencil icon) is HQ/System-gated. Its deny tooltip is `相互利用設定はHQ/Systemのみ編集可能`.
  - Port from `V0/store-detail.tsx` L2426-L2490; satisfies detail:PAR147, detail:PAR148, detail:PAR149, detail:PAR149a, detail:PAR150.
- [x] T051 [US6] Rework the 相互利用グループ block in `access-settings-tab/index.tsx:552-635`.
  - Label `相互利用グループ（許可店舗・{brand}ブランドのみ）` with a secondary badge `{N}店舗`.
  - Columns 店舗名 / ブランド (badge using `STORE_BRAND_BADGE_CLASSES`) / 設定日 (`linkedAt`).
  - **Read-only**: remove 行追加, 行を削除 and their handlers (`:217`, `:288-322`), and delete `access-settings-tab/permitted-store-select.tsx` (D22, research R6).
  - Remove the B7 `TODO(round2)`.
  - Port from `V0/store-detail.tsx` L2492-L2516; satisfies detail:PAR152, detail:PAR153.
- [x] T052 [US6] Render the どこでもJOY YOGA利用料金 card in `access-settings-tab/index.tsx:653-690` only for the JOYFIT group: `YOGA利用料金（1日）` with `¥{yogaUsageFee}`, and the note 利用店舗に計上 on the right. Remove the B6 `TODO(round2)` markers (`:237,435,653`) — port from `V0/store-detail.tsx` L2522-L2538; satisfies detail:PAR154, detail:PAR155.
- [x] T053 [US6] Create `S/[id]/_components/tabs/access-settings-tab/mutual-use-sheet.tsx` (`"use client"` Sheet) to replace the inline edit mode (`isEditingSettings`, `index.tsx:145`).
  - **Header**: title 相互利用設定を編集する (Link2 icon).
  - **Acceptance**: a Switch 受入不可 / 受入可, labelled per brand group. Description `他のFIT365店舗の相互利用オプション契約者を受け入れる` / `他のJOYFIT店舗のどこでもJOY利用会員を受け入れる`.
  - **JOYFIT-only controls**:
    - a 1日単位の後払い設定 Switch 無効 / 有効, description `他店舗利用分を1日単位の後払いで請求する`;
    - YOGA利用料金（1日・税別）, a number input with a 円 suffix and the hint 利用店舗に計上されます.
  - **Period and time inputs**: DatePickers 受入可能期間（開始日／終了日）, and two time inputs for 18歳未満入館可能時間.
  - **Validation**: end ≥ start (spec rule, no V0 source).
  - **Save**:
    - `adminStoreSettingsControllerUpdateMutualUseMutation` with the **full** body, always including `payLaterEnabled` and `yogaUsageFee` (echo the read values for FIT365);
    - `adminStoreControllerUpdateMutation` with `minorEntryAllowedStart/End` when changed.
  - **Footer**: キャンセル / 保存する; toast 相互利用設定を保存しました.
  - Port from `V0/store-detail.tsx` L2543-L2617, L592-L650; satisfies detail:PAR155c-PAR155g.

---

## Phase 9: US7 — store-detail 店舗マップ tab (P2)

**Goal**: detail spec D1/D2 and FR-110–FR-114. The floor image stays unwired (research R8).
**Independent test**: [quickstart.md](./quickstart.md) §3 step 11.

- [x] T054 [US7] Add the 店舗マップ tab in `S/[id]/page.tsx:135-141`. Tab order: 基本情報 / 営業設定 / 契約・料金 / 入退館設定 / 店舗マップ / 変更履歴. It renders for every role that can open the detail — port from `V0/store-detail.tsx` L959-L968; satisfies detail:PAR008, detail:PAR155a.
- [x] T055 [US7] Create `S/[id]/_components/tabs/store-map-tab/index.tsx`.
  - **Data**: read `adminLockerControllerListLockersOptions({ query: { storeId, limit: 100 } })`.
  - **Card**: titled 店舗マップ. When a floor image exists, the description is `配置済み {N}台 ・ 未配置 {M}台`; 未配置 > 0 uses a warning badge, otherwise plain `未配置 0台`.
  - **Header action**:
    - when `canEditStore`: an outline **店舗マップ設定** button (Map icon) → `/stores/{id}/map`;
    - otherwise: Lock + 閲覧のみ.
  - **Floor image**: with an image, `StoreFloorMap` + read-only `LockerMarker`s (T009). The image source is unavailable until B4 (research R8), so the tab renders the empty state `フロア図が登録されていません`, with the button `店舗マップ設定で登録する` for editors.
  - **Floor-image branch**: implement it behind a `floorImageUrl` prop that is currently always `null`, with `// TODO(round2) B4`.
  - Port from `V0/store-detail.tsx` › 店舗マップ tab (L2620-L2689, L532-L539).
  - Satisfies detail:PAR155b, detail:PAR155h-PAR155j, map:PAR160-PAR164.

---

## Phase 10: US8 — store-map-setup screen (P2, new)

**Goal**: store-map-setup spec FR-001–FR-085, under the user's 2026-10-02 decision that the image is session-only with no API, while locker positions use the real API.
**Independent test**: [quickstart.md](./quickstart.md) §4.
**V0**: `V0/store-map-setup.tsx` (821 lines).

- [x] T056 [US8] Create `S/map/page.tsx` (no store in the path).
  - With the header store selector on a single store, redirect to `/stores/{storeId}/map`.
  - With 全店舗, render the page shell with the breadcrumb 店舗管理 › 店舗マップ設定 (no store item), the title 店舗マップ設定 without a store badge, and a card holding `EmptyState` (MapPin).
  - EmptyState title `対象店舗を選択してください`, description `ロッカーマップは店舗ごとに設定します。ヘッダーの店舗セレクターで対象店舗を選択すると、その店舗のマップを表示します。`. No unsaved bar.
  - Picking a store in the header redirects.
  - Port from `V0/store-map-setup.tsx` L253-L262, L587, L607-L608, L618-L629, L794; satisfies map:PAR011-PAR017.
- [x] T057 [US8] Create `S/[id]/map/page.tsx` (thin server shell) and `S/[id]/map/_components/store-map-setup.tsx` (`"use client"`: drag, file input, draft state).
  - **Store resolution**: the store in the path wins over the header selector.
  - **Data states**: a loading state while the store and lockers load; an error state with retry; a store that does not exist → error state (no V0 source).
  - **Breadcrumb**: 店舗管理 (→ list, guarded) › {店舗名} (→ `/stores/{id}` 店舗マップ tab, guarded) › 店舗マップ設定 (current). The row is 24px high.
  - **Title**: 店舗マップ設定, with an outline badge holding a MapPin icon and the store name.
  - **Layout**: the page header sits outside the scrolling body.
  - Port from `V0/store-map-setup.tsx` L565-L615; satisfies map:PAR002-PAR010, map:PAR170, map:PAR171.
- [x] T058 [US8] Access gate in `S/[id]/map/_components/store-map-setup.tsx` (Intentional divergence from V0):
  - **Edit** when `canEditStore` (System/HQ any store; Staff own store).
  - **Read-only** for Manager and for Staff on another store: 閲覧のみ, no file input, no dropzone, no row actions, no bar.
  - **Wall** for Trainer/Observer (the `StoreFormNoAccess` pattern from `S/_components/store-form-shell.tsx:71-83`).
  - Port from `V0/store-map-setup.tsx` L247-L248, L636-L640, L671, L732, L794 + `data/store-map.ts` L52; satisfies map:PAR150-PAR155.
- [x] T059 [US8] Create `S/[id]/map/_components/use-store-map-draft.ts`.
  - **Positions**: `saved` / `draft` maps of `lockerId → {x,y}|null`, built from `LockerListItemDto.mapX/mapY` (active cabinets only). Paged in 100s if the store has more.
  - **Floor image**: `savedImage` / `draftImage` (`{ file, previewUrl } | null`, session only, never sent; `// TODO(round2) B4`).
  - **Derived state**: `dirtyIds` (a position differing from saved; moving back clears it), `imageChange: 'register'|'replace'|'delete'|null`, `isDirty`.
  - **Actions**: `place`, `unplace`, `move`, `discard`, `markSaved`.
  - Port from `V0/store-map-setup.tsx` L82-L98, L270-L357; satisfies map:PAR104, map:PAR131 (logic), map:PAR177.
- [x] T060 [US8] Create `S/[id]/map/_components/floor-image-card.tsx`. Satisfies map:PAR030-PAR058, map:PAR178.
  - **Header**:
    - read-only: Lock + 閲覧のみ;
    - editors with an image: 画像を差し替え (outline, small, ImageUp) and a ghost Trash2 button `aria-label="画像を削除"`;
    - editors without an image: no actions.
  - **Placement hint**: `{name} を置きました。ドラッグして位置を合わせてください` sits left of the actions. It shows only while the just-placed cabinet is selected, and clears on drag, an arrow-key move, selecting another cabinet, or save/discard.
  - **No image, editors**: a dashed dropzone (min 400px) with an Upload icon and `フロア図の画像を登録してください` / `PNG・JPG（5MB まで）` / 画像を選ぶ (outline).
    - It highlights on drag-over, and dropping a file applies it.
    - The hidden input accepts png/jpeg (SVG dropped, BQ1) and is cleared after each pick.
  - **No image, read-only**: EmptyState `フロア図が登録されていません`.
  - **Errors**: wrong type → `PNG・JPG 以外の形式のため登録できません（選んだファイル: {name}）`; over 5MB → `5MBを超えているため登録できません（選んだファイル: {x.x}MB）`. Small destructive text below the image area. A valid file clears the error.
  - **画像を削除**: keeps the cabinet positions.
  - **Replace notice**: a warning Alert, `画像を差し替えました` / `ロッカーの位置は前の画像のままです。ずれていないか確認してください`, only after a replace.
  - **No legacy elements**: none of the `c1c7e2e` floor tabs or fields.
  - Port from `V0/store-map-setup.tsx` L66-L98, L322-L323, L393-L441, L635-L740.
- [x] T061 [US8] Render the map with markers inside `floor-image-card.tsx`. Satisfies map:PAR061, map:PAR062, map:PAR066-PAR083.
  - **Base**: `StoreFloorMap` (T009), alt `{店舗名}のフロア図`, with one `LockerMarker` per placed cabinet.
  - **Pointer drag**:
    - a press under 4px is a selection, not a drag;
    - the grab offset is kept;
    - positions are clamped to 0–1;
    - the click that ends a drag is not a selection;
    - pointer cancel ends the drag.
  - **Keyboard**: arrows move the selected marker 1px of the rendered image (Shift = 10px); no effect on an unselected marker.
  - **Selection**: clicking a marker selects its cabinet and scrolls its row into view.
  - **Read-only**: no drag and no keyboard move.
  - Port from `V0/store-map-setup.tsx` L57-L80, L444-L530, L690-L711.
- [x] T062 [US8] Create `S/[id]/map/_components/locker-panel.tsx`. Satisfies map:PAR020-PAR022, map:PAR090-PAR117, map:PAR175.
  - **Panel**: a sticky right panel (w-80) whose height is capped to the viewport, with an internal scroll list. Title ロッカー筐体 and a secondary badge `{total}棟`.
  - **Sections**: 未配置 first (count as a warning badge when > 0; empty → `すべて配置済みです`), then 配置済み (plain count; at zero only the heading and 0). Both sorted by symbol.
  - **Rows**: a 24px symbol chip (primary when selected), the truncated name, and the shape label below.
    - A 未保存 warning dot appears when the position changed.
    - Selected rows use the accent; hover syncs with the marker.
  - **Selected row**: a link button 詳細 (ExternalLink), tooltip `ロッカー詳細を別タブで開きます`. It opens **that cabinet's** locker detail (`/lockers/{lockerId}`) in a new tab.
  - **Placed row with no image**: `画像がないため地図に表示できません`.
  - **Editors**:
    - 配置 (outline, small, MapPin) is disabled with no draft image (`フロア図の画像が未登録のため配置できません。先に画像を登録してください`). It places the cabinet at the centre, shifting diagonally by 0.04 up to 10 times when the spot is taken, then selects it and shows the hint.
    - 配置を外す is a ghost X with tooltip.
  - **Row buttons**: they do not propagate a selection.
  - Port from `V0/store-map-setup.tsx` L101-L240, L366-L389, L532-L534, L744-L790.
- [x] T063 [US8] Save and discard in `store-map-setup.tsx` with `UnsavedChangesBar` (T007).
  - **Bar visibility**: editors only, never in 全店舗, only while dirty.
  - **Bar message**: `未保存の変更があります（{parts}）`, the parts being 位置 N台 and フロア画像の登録/差し替え/削除, joined by 「・」 with positions first.
  - **Save**:
    - for each dirty cabinet, `adminLockerControllerUpdateLockerMutation({ path:{lockerId}, body:{ mapX, mapY, expectedUpdatedAt } })` (null pair = unplaced);
    - the image change is committed to session state only (`TODO(round2) B4`).
  - **Toasts**:
    - positions only: `ロッカーの位置を保存しました（N台）`;
    - image only: `フロア図を保存しました`;
    - both: `フロア図とロッカーの位置を保存しました（N台）`.
  - **Partial failure**: succeeded cabinets become saved; failed ones stay 未保存 with an error. 422 `E-LOC-006` → `他の人が変更しました。再読み込みしてください` (spec FR-046/047).
  - **After save**: 未保存 indicators, the replace notice and the bar clear.
  - **破棄**: reverts without a dialog and clears the selection and file error.
  - Invalidate the lockers query so the detail tab updates.
  - Port from `V0/store-map-setup.tsx` L316-L357, L794-L801; satisfies map:PAR120, map:PAR123-PAR125, map:PAR127-PAR131, map:PAR165, map:PAR172, map:PAR173, map:PAR176 (image never written).
- [x] T064 [US8] Leave guard: use `useUnsavedChangesGuard(isDirty)` (`src/hooks/use-unsaved-changes-guard.hook.ts`) and `DiscardChangesDialog`.
  - Title `変更を破棄しますか？`, body `未保存の変更はすべて失われます。この操作は取り消せません。`, buttons 編集を続ける / 破棄する.
  - It covers the breadcrumb, the sidebar, a header store change and browser back. Clean navigation has no dialog. Browser close/reload uses the native confirm.
  - Port from `V0/store-map-setup.tsx` L805-L818 + `hooks/use-unsaved-changes.ts` L33-L48; satisfies map:PAR140-PAR145, map:PAR174.
- [x] T065 [P] [US8] Entry points.
  - The locker list gets a **店舗マップ設定** button (outline, Map icon) → `/stores/map`, which resolves to the current store.
  - The locker form has two 店舗マップ設定 links (floor-map preview and location help) → `/stores/{storeId}/map`. Text-only today at `src/app/(private)/lockers/_components/locker-form-area-section.tsx:107-109` and `locker-form-floor-map.tsx:54`.
  - Opening from E-01 still shows the 店舗管理 breadcrumb.
  - Port from `V0/locker-list.tsx` L524-L528 and `V0/locker-form.tsx` L505-L512, L598-L605; satisfies map:PAR166-PAR168.

---

## Phase 11: Polish & cross-cutting

- [x] T066 [P] Round 3 comment-only updates; no runtime change. Satisfies the Phase-2 rows list:PAR097a-PAR097e, form:PAR030, form:PAR045a-PAR045e (as deferred).
  - Change the `TODO(round3) B1` comments in `S/_components/store-form.tsx:9,319-358` and `S/_components/store-bulk-territory-dialog.tsx:7` to say "uncomment as an エリア → テリトリー cascade (`AreaSelectInput` / `TerritorySelectInput`), not `TerritoryCombobox`".
  - Fix the grep-invisible marker `TODO(round3 ) B1` at `store-bulk-territory-dialog.tsx:209`.
- [x] T067 Run `npx tsc --noEmit` (0 errors outside `.next/`) and `npm run lint`. Fix any regressions.
- [ ] T068 Walk [quickstart.md](./quickstart.md) §1–§4 against the dev backend with real accounts. Record failures as findings, not silent fixes.
- [x] T069 Run `/verify-parity` for each of `store-list`, `store-form`, `store-detail`, `store-map-setup`. Items that depend on B4 (map image persistence, photo display if V4 failed) are reported as Block, not NG.
- [x] T070 [P] Update `specs/026-store-management/store-list/integration-plan.md`. Mark B3 / B5 / B6 / B7 / B9 / B11 / B12 and the photos half of B4 resolved by the 2026-10-02 regen. Add the new BE questions from research R2 / R3 / R4 / R6 / R7 / R11 (status-change matrix and PATCH default, holiday encoding, the special-day type, the FIT365 acceptance flag, the image URL, the FC list roles, presign roles).
- [x] T071 Tell BE that the FE has switched to `PUT /images`, so the deprecated `POST`/`PATCH`/`DELETE /images` can be removed (BE request 2026-10-02). Draft the message for the user to send; do not send it.

---

## Dependencies & execution order

- **Setup** (T001–T002) → **Foundational** (T003–T011). T008 depends on T001. T011 gates the **merge** of US2/US4, not the start.
- **Stories** depend only on Foundational:
  - US1: T003, T005.
  - US2: T008.
  - US3: T006, T008.
  - US4: T003, T005.
  - US5: T005, T008.
  - US6: T008.
  - US7: T005, T009.
  - US8: T005, T007, T009, T010.
- **Within stories**:
  - US3: T026 → T027/T028 → T029 → T030/T031.
  - US4: T036 → T037.
  - US5: T039 → T040; T045 → T046.
  - US8: T056/T057 → T058 → T059 → T060/T061/T062 → T063 → T064.
- **Shared files**:
  - `store-form.tsx` (T016–T025, T029): run sequentially.
  - `basic-info-tab/index.tsx` (T032, T034–T036, T038): run sequentially.
  - `access-settings-tab/index.tsx` (T050–T053): run sequentially.

## Parallel examples

```text
After Phase 2:
  Agent A → US1 (T012–T015) then US7 (T054–T055)
  Agent B → US2 (T016–T025) then US3 (T026–T031)
  Agent C → US4 (T032–T038) then US6 (T047–T053)
  Agent D → US5 (T039–T046)
  Agent E → US8 (T056–T065)
Inside US6: T047, T048 [P] run alongside T050–T053 (different files).
```

## Implementation strategy

1. **MVP**: Phase 1–2 + US1. This yields the four-status list and the own-store gate; it is small and low risk.
2. **Then** US2 + US4, after T011/V1 is confirmed, so the form and detail match the prototype.
3. **Then** US5 → US6 → US3.
4. **Last**: US7 + US8. The map is new and depends on B4 for the image.
5. Each story is closed only after its quickstart section passes and its parity items tick under `/verify-parity`. Wait for the user's verification before any commit.

## Parity coverage (unchecked items → tasks)

| Checklist       | Unchecked                                                                                                                                                                                                                | Claimed by                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| store-list      | PAR011, 029, 035, 066, 097a–e                                                                                                                                                                                            | T012, T013, T014, T003, T066 |
| store-form      | PAR008, 019, 020, 020b, 020c, 022, 024a, 026, 028–032, 034–036, 038–040, 043, 045a–e, 060–063, 065, 066, 068, 068a–c, 081, 089, 099a, 160, 166–168, 170–191                                                              | T016–T031, T066              |
| store-detail    | PAR004a, 006, 008, 012–015, 018a, 031a–b, 033, 035, 035a–d, 036, 037, 037a–c, 044, 047, 048, 048a, 049, 051, 051a–c, 052, 053, 055, 055a, 057–061, 061a–d, 066, 066a, 074, 102, 103, 111, 147–150, 149a, 152–155, 155a–j | T032–T055                    |
| store-map-setup | PAR001–017, 020–022, 030–037, 040–058, 060–083, 090–117, 120–131, 140–145, 150–155, 160–178                                                                                                                              | T007, T009, T010, T055–T065  |

**Unclaimed**: none.
