# Feature Specification: Store Map Setup — Floor Plan & Locker Placement (Y-02 FR-006 / Y-02-05)

**Feature Branch**: written into the current branch by request — no new branch (feature folder `specs/026-store-management/store-map-setup/`)
**Created**: 2026-10-02
**Status**: Draft
**PO Spec**: `Y-02` — 店舗管理（マスタ）, L2 `Y-02-05` 店舗マップ設定（ロッカー）
**Source**:

| Role          | Reference                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requirement   | `dx-fitness/fitness-spec` → `crm/requirements/Y-02.md` @ `4655aea` (doc version **260928_v6**, 2026-09-28): FR-006 (L175-180, listed under 必須要件(Must) at L82-89), 権限マトリクス row 「店舗マップ設定」 (L215), Staff限定項目 note naming フロアマップ (L217), 関連機能 E-01 (L237). Coupled requirement: `crm/requirements/E-01.md` @ `4655aea` — FR-016 ロッカーマップ表示 (Could, L135), 前提条件 「店舗マップ設定（Y-02-05）とのロッカー配置連携が前提」 (L153), 権限マトリクス (L346-355).                                                                                              |
| UI prototype  | `dx-fitness/fitness-crm-ui` → `src/pages/store-map-setup.tsx` @ `47423ec` (2026-09-30), 821 lines — rewritten at `e5501a3` (2026-09-26, +741/−549). Earlier deltas: `b223fef` (2026-08-13, font weight only), `6bc1f1c` (2026-09-08, locker name → locker-detail link). The `c1c7e2e` (2026-08-05) version was a multi-floor ロッカーマップ設定 screen under ロッカー管理 and is superseded in full.                                                                                                                                                                                             |
| Supporting UI | `src/data/store-map.ts` (new at `e5501a3` — types, `LOCKER_SHAPE_LABEL`, `STORE_MAP_EDITABLE_ROLES`, saved-state store) · `src/components/store-floor-map.tsx` (new at `e5501a3` — `StoreFloorMap`, `LockerMarker`) · `src/components/unsaved-changes-bar.tsx` (`e5501a3`) · `src/hooks/use-unsaved-changes.ts` · `src/pages/map/screens.ts` L1344-1354 (`store-map-setup`, `phases: ["1"]`) · `src/pages/store-detail.tsx` L532-539, L964-965, L2620-2689 (店舗マップ tab, primary entry) · `src/pages/locker-list.tsx` L524-528 and `src/pages/locker-form.tsx` L511, L604 (secondary entries) |
| API design    | This repo's generated client `src/lib/openapi.real.json` / `src/lib/api-real` (dev backend, regenerated 2026-10-02): `GET /api/v1/admin/lockers` and `PATCH /api/v1/admin/lockers/{lockerId}` (API-100 §4, §6.3 — `mapX` / `mapY`), `GET` / `PUT /api/v1/admin/stores/{id}/details` (API-135 / API-083 §18.2 — `gymMapS3Key`), `POST /api/v1/media/presign` (API-006, tag `store-image`). See Appendix A.                                                                                                                                                                                        |
| Sibling specs | `specs/026-store-management/store-detail/spec.md` (owns the read-only 店舗マップ tab that opens this screen) · `store-form/spec.md` · `store-list/spec.md` · `specs/022-locker-management/spec.md` (E-01, owns the cabinets this screen positions)                                                                                                                                                                                                                                                                                                                                               |

**Input**: User description: "specs/026-store-management — Kiểm tra lại git mới nhất của spec và prototype, khách có update, bổ sung mục khác đã thêm (Y-02.md, store-detail / store-form / store-list / store-map-setup / store-page-form / store-page-list). Listup các spec, ui mới từ lúc code trước đó, sau đấy update vào spec." Scope decision 2026-10-02: Y-02 FR-006 店舗マップ設定 is Phase 1 and gets this sub-spec.

---

## Overview

Store map setup is the **write** surface of a store's floor map: the one screen where an operator registers the store's floor-plan image and positions each of the store's locker cabinets (ロッカー筐体) on it. The saved result is what the store detail's 店舗マップ tab shows read-only (027). E-01's locker screens rely on it as their ロッカーマップ (FR-016).

The screen has two columns under a shared page header. On the left is the **フロア図** card: an image dropzone when none is registered, otherwise the image with one marker per placed cabinet. On the right is the **ロッカー筐体** panel, listing every cabinet of the store in two sections, 未配置 (unplaced) and 配置済み (placed). An editor places a cabinet with 配置 and adjusts it by dragging or with the arrow keys. They can also unplace it, or replace or delete the image. Nothing is stored until they press 変更を保存 on the unsaved-changes bar. Until then every change is a draft against the last saved state, and the draft can be thrown away with 破棄.

There is **one floor-plan image per store**. The `c1c7e2e` prototype's 1階 / 2階 / 地下1階 floors, フロア名 and 面積 fields are gone, and the backend likewise holds one `gymMapS3Key` per store. Positions are stored **relative to the image** (0.0–1.0 from the top-left), so they survive a re-render at any size.

Four states matter as much as the happy path:

- The **no-store state**: head office in 全店舗 scope with no store in the address is asked to pick one.
- The **read-only state** (閲覧のみ): roles without edit rights see the map but no controls.
- The **own-store rule**: Staff may edit only their own store.
- The **unsaved-changes guard**: leaving with a dirty draft asks first.

---

## Clarifications

### Session 2026-10-02 — decisions fixed before drafting

These are not open questions. They are recorded so the reasoning is visible at planning time.

- Q: Is Y-02 FR-006 Phase 1? → A: **Yes — user decision 2026-10-02.**
  - Y-02 lists FR-006 among 必須要件(Must) with no phase marker (L82-89, L175-180).
  - `Phase-Scope.md` maps Y-02 to Phase 1.
  - The prototype removed its Phase-2 switch from the store-detail tab at `e5501a3` (2026-09-26). At `c1c7e2e` / `b223fef` / `6bc1f1c` the tab was wrapped in `currentPhase === "2"` with 「Phase 2スコープを先行配置」.
  - `screens.ts` has always carried `store-map-setup` as `phases: ["1"]`.
  - This supersedes the store-detail spec's earlier "Phase 2, out of scope" reading (that spec is being updated in parallel).
- Q: May Staff edit any store's map? → A: **No — only their own store.**
  - Y-02's matrix reads 「店舗マップ設定 | ○ | ○ 全店舗 | × | ○ 所属店舗 | × | ×」 (L215).
  - The prototype grants edit to every Staff (`STORE_MAP_EDITABLE_ROLES = ["Headquarter","System","Staff"]`, `store-map.ts` L52) and does not check the store. This spec follows Y-02 and records the divergence (FR-062, PAR-divergence section).
- Q: Which store does the screen show? → A: **The store named in the address wins over the header's store selector.**
  - If the address names no store, a single-store scope uses the header's selected store.
  - The 全店舗 scope gets the 「対象店舗を選択してください」 empty state (`store-map-setup.tsx` L250-262, L618-629).
- Q: Does this feature write change-history rows? → A: **No — seed only**, matching the sibling specs.
  - This feature never creates, updates or deletes a history row.
  - The backend records its own history inside the store-details replace (`PUT /stores/{id}/details` writes `stores_history`, `scope = details`). That is a server side-effect the feature neither drives nor displays.
- Q: Mock-first or real API? → A: **Real API, with one gap.**
  - The backend already carries the coordinates on the cabinet: `LockerListItemDto.mapX` / `mapY`, read by `GET /admin/lockers?storeId=` and written pair-wise by `PATCH /admin/lockers/{lockerId}`. Its description reads 「This is also where the CRM saves a floor-plan drag」.
  - It also carries the image key on the store's CMS row (`gymMapS3Key`, `GET`/`PUT /admin/stores/{id}/details`).
  - The gap is the image **read**: `gymMapS3Key` is a raw S3 key, not a fetchable URL. This is the existing integration backlog item B4 / R204, see Q1.
  - The sibling store screens are already on `src/lib/api-real`, so this screen joins them rather than adding a mock-db table.
- Q: Who may open the screen at all? → A: **Informed default from Y-02's matrix:**
  - System, Headquarter, Manager and Staff can open it. Only System, Headquarter and own-store Staff can edit; Manager is read-only.
  - Trainer and Observer have no access: Y-02 gives them × on both 店舗一覧・基本情報参照 and 店舗マップ設定.
  - The prototype shows Trainer/Observer the read-only view (it gates only on the edit role list). That is recorded as a divergence (FR-061).
- Q: What does a Manager get, given E-01 grants Manager 「ロッカー（親）登録・編集 ○ 管轄店舗」? → A: **Read-only, per Y-02.**
  - Positions on the floor map are Y-02-05's concern, and Y-02 gives Manager × for 店舗マップ設定. E-01's grant covers the cabinet master (shape, slots, fees) on the locker screens.
  - The backend is looser: it refuses only Trainer, and Observer on writes, with E-LOC-101. The UI and the API layer of this feature still apply Y-02's rule (FR-064). Logged as BQ4.

### Session 2026-10-02 — resolved with the user

- Q: How does the floor-plan image render while the backend has no fetchable URL for `gymMapS3Key`? → A: **Build the UI first; integrate it when the API adds the URL; no mock API.** Locker positions go to the real API now. Recorded in FR-083 and Q1.

---

## User Scenarios _(mandatory)_

### User Story 1 - Position the store's lockers on its floor plan (Priority: P1)

A head-office operator opens a store's detail screen, goes to the 店舗マップ tab and presses 店舗マップ設定. The setup screen opens for that store, showing the store's floor-plan image with the placed cabinets as small lettered markers. Unplaced cabinets are listed in the right-hand panel under 未配置. The operator presses 配置 on one. It appears at the centre of the image, selected, with the hint 「{name} を置きました。ドラッグして位置を合わせてください」. The operator drags it into place and presses 変更を保存 on the bar at the bottom.

**Why this priority**: This is the whole point of Y-02-05. E-01's locker screens and the store-detail tab both depend on a saved map, and without positions there is no ロッカーマップ.

**Verification**: As Headquarter, open a store with at least one unplaced cabinet. Place it, drag it, save, then return to the store detail's 店舗マップ tab and confirm the marker shows at the saved position and the counts changed.

**Acceptance Scenarios**:

1. **Given** the store has a floor-plan image, **When** the screen renders, **Then**:
   - the title is 店舗マップ設定, with a store-name badge;
   - the breadcrumb reads 店舗管理 › {店舗名} › 店舗マップ設定;
   - the left card is titled フロア図 and shows the image with one marker per placed cabinet;
   - the right panel is titled ロッカー筐体, with the badge 「{total}棟」.
2. **Given** a cabinet is under 未配置, **When** the operator presses its 配置 button, **Then** it moves to 配置済み, a marker appears at the image centre (offset diagonally if another marker already sits there), the cabinet is selected, and the placement hint shows in the card header.
3. **Given** a placed cabinet's marker, **When** the operator drags it at least 4px, **Then** the marker follows the pointer without jumping, stays inside the image, and the placement hint disappears.
4. **Given** a marker is selected, **When** the operator presses an arrow key, **Then** the marker moves 1px in that direction (10px with Shift), clamped to the image.
5. **Given** at least one cabinet has moved, **When** the draft differs from the saved state, **Then** the cabinet's row and marker carry a 未保存 indicator, and the bottom bar reads 「未保存の変更があります（位置 N台）」 with 破棄 and 変更を保存.
6. **Given** only positions changed, **When** 変更を保存 is pressed, **Then** the positions are stored, the success toast reads 「ロッカーの位置を保存しました（N台）」, the 未保存 indicators clear and the bar disappears.
7. **Given** a placed cabinet, **When** the operator presses its 配置を外す button, **Then** it moves back to 未配置 and its marker disappears. Saving stores it as unplaced.

---

### User Story 2 - Register or replace the floor-plan image (Priority: P1)

A Staff member opens their own store's map for the first time. There is no image yet, so the フロア図 card shows a dashed dropzone: 「フロア図の画像を登録してください」 / 「PNG・JPG（5MB まで）」 / 画像を選ぶ. They drop a PNG on it, the image appears, and they place the cabinets and save. Months later the store is refitted. They press 画像を差し替え and pick the new plan. A warning reminds them that the markers kept their old positions, so they check each one and save.

**Why this priority**: Without an image nothing can be placed (配置 is disabled), so this is the precondition for Story 1 on every new store.

**Verification**: As own-store Staff, open a store with no image, register one, place a cabinet, save. Then replace the image and confirm the warning and the save toast.

**Acceptance Scenarios**:

1. **Given** the store has no image and the user can edit, **When** the screen renders, **Then** the dropzone shows the two lines and the 画像を選ぶ button. Every 未配置 row's 配置 button is disabled with the reason 「フロア図の画像が未登録のため配置できません。先に画像を登録してください」.
2. **Given** the dropzone, **When** a PNG or JPG of at most 5MB is dropped or chosen, **Then** the image renders in place and the bar reads 「未保存の変更があります（フロア画像の登録）」.
3. **Given** a file of another type, **When** it is chosen, **Then** the image is unchanged and the card shows 「PNG・JPG 以外の形式のため登録できません（選んだファイル: {file name}）」.
4. **Given** a file over 5MB, **When** it is chosen, **Then** the image is unchanged and the card shows 「5MBを超えているため登録できません（選んだファイル: {size}MB）」, with the size to one decimal.
5. **Given** a saved image, **When** the operator picks a new file through 画像を差し替え, **Then** the new image renders with the same markers at the same relative positions, and a warning reads 「画像を差し替えました」 / 「ロッカーの位置は前の画像のままです。ずれていないか確認してください」. The bar reads 「…（フロア画像の差し替え）」.
6. **Given** only the image changed, **When** 変更を保存 is pressed, **Then** the toast reads 「フロア図を保存しました」. **Given** the image and N positions changed, **Then** it reads 「フロア図とロッカーの位置を保存しました（N台）」.
7. **Given** a saved image, **When** the operator presses 画像を削除, **Then**:
   - the dropzone returns and the bar reads 「…（フロア画像の削除）」;
   - placed cabinets keep their positions, but each placed row shows 「画像がないため地図に表示できません」;
   - registering an image again brings the markers back where they were.

---

### User Story 3 - Look at the map without edit rights (Priority: P2)

An area manager opens a store's map from the detail screen to see where the lockers are. Everything renders, but the フロア図 card header says 閲覧のみ. There is no 配置, 配置を外す, 画像を差し替え or 画像を削除, markers cannot be dragged, and no save bar ever appears. Selecting a cabinet still shows its 詳細 link, so the manager can look the cabinet up.

**Why this priority**: Manager reference is part of Y-02's matrix (店舗一覧・基本情報参照 ○ 全店舗). It reuses Story 1's rendering with controls removed.

**Verification**: Log in as Manager, open a store's map and confirm no edit control renders and nothing can be moved.

**Acceptance Scenarios**:

1. **Given** a Manager, **When** the screen renders, **Then** the フロア図 card header shows a lock icon and 閲覧のみ, and no file input, dropzone, replace or delete button exists.
2. **Given** a Manager and a store with no image, **When** the screen renders, **Then** the card shows the empty state 「フロア図が登録されていません」 instead of the dropzone.
3. **Given** a Manager, **When** they hover a marker, **Then** the tooltip reads 「{symbol}　{name}・{shape}」, e.g. 「A　ロッカー棟A・3列×9段」. When they drag or press an arrow key on it, the marker does not move.
4. **Given** a Manager selects a row, **When** they press 詳細, **Then** that cabinet's locker detail opens in a new browser tab.
5. **Given** a Staff member opens a store other than their own, **When** the screen renders, **Then** an in-page permission wall renders instead of the map, and no write is possible (FR-062).

---

### User Story 4 - Arrive without a store chosen (Priority: P2)

A head-office operator working in 全店舗 scope opens 店舗マップ設定 from the locker list, which does not name a store. The screen cannot guess which store's map to show, so it asks them to pick one.

**Why this priority**: This is a secondary entry point (E-01's locker list and locker form). A wrong store's map, edited by mistake, would be worse than an empty page.

**Verification**: As Headquarter in 全店舗 scope, open the screen with no store in the address, then pick a store in the header.

**Acceptance Scenarios**:

1. **Given** 全店舗 scope and no store in the address, **When** the screen renders, **Then**:
   - a card holds the empty state titled 「対象店舗を選択してください」 with the description 「ロッカーマップは店舗ごとに設定します。ヘッダーの店舗セレクターで対象店舗を選択すると、その店舗のフロアマップが表示されます。」;
   - the breadcrumb shows only 店舗管理 › 店舗マップ設定 and there is no store badge;
   - no unsaved bar can appear.
2. **Given** that state, **When** the operator picks a store in the header, **Then** that store's map renders.
3. **Given** the address names a store, **When** the header's store selector shows a different store or 全店舗, **Then** the screen still shows the addressed store.

---

### User Story 5 - Leave without losing a draft by accident (Priority: P3)

An operator has moved three markers, then clicks the store name in the breadcrumb to go back. A dialog asks whether to discard. They choose 編集を続ける, save, and leave.

**Why this priority**: Drafts can take several minutes of careful dragging, and losing them silently is costly. This reuses the app's existing guard.

**Verification**: Move a marker, click 店舗管理 in the breadcrumb, cancel; repeat and confirm; also try a browser reload.

**Acceptance Scenarios**:

1. **Given** a dirty draft, **When** a breadcrumb link is pressed, **Then** a dialog titled 「変更を破棄しますか？」 opens with the body 「未保存の変更はすべて失われます。この操作は取り消せません。」 and the choices 編集を続ける and 破棄する.
2. **Given** that dialog, **When** 編集を続ける is pressed, **Then** the dialog closes and the draft is intact. **When** 破棄する is pressed, **Then** the screen navigates and the draft is dropped.
3. **Given** a dirty draft, **When** the browser is closed or reloaded, **Then** the browser's own leave confirmation is raised.
4. **Given** a dirty draft, **When** 破棄 on the bar is pressed, **Then** the draft reverts to the saved state with no confirmation, the selection clears, any image error clears, and the toast reads 「変更を破棄しました」.
5. **Given** a dirty draft, **When** a selected row's 詳細 is pressed, **Then** the locker detail opens in a new tab and this screen keeps its draft with no dialog.

---

### Edge Cases

- **Placing onto an occupied centre**:
  - If another marker lies within 0.04 (relative) of the centre, the new marker shifts diagonally by 0.04, up to 10 times (`store-map-setup.tsx` L366-384).
  - Past ten shifts it stays where the last shift left it, possibly overlapping another marker.
- **Drag past the image edge**: the position is clamped to 0.0–1.0 on both axes, so a marker can never be stored outside the image (L78-80, L502-505).
- **Click vs drag**:
  - A press released less than 4px from its start is a selection (L57-58, L491-494).
  - A drag selects the marker it moved, and the click that follows a drag is swallowed, so it does not toggle anything (L508-524).
- **Arrow keys on an unselected marker, or as a read-only user**: ignored (L444-445).
- **A cabinet moved back to its saved position**: compared with a sub-pixel tolerance, it counts as unchanged and drops out of the 未保存 count (L82-86, L309-314).
- **Image chosen and then the same file chosen again**: the change still registers, because the file input is cleared after every pick (L407-412).
- **Image removed with cabinets placed**:
  - Positions are kept.
  - Each placed row shows 「画像がないため地図に表示できません」, and the row grows to fit it (L145-153, L190-192).
  - 配置 is disabled on unplaced rows.
- **Image replaced, then replaced back to the saved one before saving**: no image change is pending, so the replace warning disappears (L94-98, L322-323).
- **Save partly fails**:
  - The image and each cabinet's position are separate backend writes (Appendix A).
  - Whatever succeeded becomes the saved state. Whatever failed stays in the draft marked 未保存, and the operator is told which cabinets or the image did not save (FR-046).
  - The feature does not attempt to roll back the writes that succeeded.
- **A cabinet changed elsewhere since the screen loaded** (optimistic lock, 409 on `PATCH /lockers/{id}`): that cabinet's save fails as above. Re-reading the cabinet brings back its current position (FR-047).
- **A cabinet deleted or deactivated in E-01 while the screen is open**: on the next read it disappears from the panel. A pending draft position for it is dropped with the save failure reported.
- **The store has no cabinets**:
  - The panel shows 「ロッカー筐体」 「0棟」, 未配置 with 0 and 「すべて配置済みです」, and 配置済み with 0.
  - The image can still be registered.
- **Store in the address does not exist**: an error state renders in place of the two columns, never an empty map for an unnamed store.
- **Header store changed while no store is in the address and the draft is dirty**: the switch passes through the same discard confirmation as the breadcrumb. **No V0 source**: V0 swaps silently.
- **Staff deep-links another store**: the in-page permission wall renders; the map is not shown read-only (FR-062).
- **Many cabinets**: the panel scrolls inside its card, which stays pinned beside the map while the page scrolls (L744-745, L755). A selected row scrolls into view when its marker is picked (L527-530).

---

## Requirements _(mandatory)_

### Functional Requirements

#### Screen shell and store resolution

- **FR-001**: The feature MUST provide one store-map setup screen per store. The store is identified by the address, so a link from the store detail always opens that store.
- **FR-002**: The page header MUST carry:
  - a breadcrumb 店舗管理 › {店舗名} › 店舗マップ設定, in which 店舗管理 leads to the store list and {店舗名} leads to that store's detail on its 店舗マップ tab, both through the unsaved-changes guard (FR-050);
  - the title 店舗マップ設定;
  - a badge with a map-pin icon and the store name.
- **FR-003**: When the address names a store, the screen MUST show that store regardless of the header's store selector.
- **FR-004**: When the address names no store and the header scope is a single store, the screen MUST show the header's selected store.
- **FR-005**: When the address names no store and the header scope is 全店舗, the screen MUST render, in place of both columns, a card holding the empty state titled 「対象店舗を選択してください」 with the description 「ロッカーマップは店舗ごとに設定します。ヘッダーの店舗セレクターで対象店舗を選択すると、その店舗のフロアマップが表示されます。」. In that state:
  - the breadcrumb MUST omit the store segment;
  - the badge MUST be absent;
  - the unsaved-changes bar MUST never render.
- **FR-006**: The body MUST be two columns: the フロア図 card on the left, taking the remaining width, and the ロッカー筐体 panel on the right. The panel MUST be fixed-width and stay in view while the page scrolls.
- **FR-007**: While the store's map is being read the screen MUST render a loading state. When the read fails it MUST render an error state with a retry affordance, in place of the two columns. **No V0 source**: V0 seeds from a local fixture.

#### フロア図 card — image

- **FR-010**: The card MUST be titled フロア図. There is exactly one floor-plan image per store.
- **FR-011**: With no image and edit rights, the card body MUST be a dashed dropzone. It carries an upload icon, the lines 「フロア図の画像を登録してください」 and 「PNG・JPG（5MB まで）」, and a 画像を選ぶ button that opens the file picker. While a file is dragged over the zone, the zone MUST be highlighted.
- **FR-012**: With no image and no edit rights, the card body MUST be the empty state 「フロア図が登録されていません」.
- **FR-013**: Only PNG and JPEG files of at most 5MB MUST be accepted. **Intentional divergence from V0**, which also accepts SVG: the `store-image` presign does not take SVG (BQ1, answered 2026-10-05).
  - A file of another type MUST be rejected with 「PNG・JPG 以外の形式のため登録できません（選んだファイル: {file name}）」.
  - An oversized file MUST be rejected with 「5MBを超えているため登録できません（選んだファイル: {size}MB）」, the size in MB to one decimal.
  - The message MUST render beneath the image area. A rejected file MUST NOT change the draft image.
- **FR-014**: An accepted file MUST replace the draft image at once, MUST clear any previous file error, and MUST NOT be stored until 変更を保存 (FR-040).
- **FR-015**: With an image and edit rights, the card header MUST offer 画像を差し替え (opens the file picker; the same rules as FR-013 apply) and an icon button labelled 画像を削除, with a tooltip of the same text.
- **FR-016**: 画像を削除 MUST remove the draft image without touching any cabinet position. It MUST clear the placement hint and any file error.
- **FR-017**: While the draft image differs from a saved image that existed (a replacement), a warning MUST render above the image: title 「画像を差し替えました」, body 「ロッカーの位置は前の画像のままです。ずれていないか確認してください」.
- **FR-018**: The image MUST render at its natural aspect ratio within the available height, and MUST NOT be draggable as an image. Its alternative text MUST read 「{店舗名}のフロア図」.
- **FR-019**: Without edit rights the card header MUST show a lock icon and 閲覧のみ in place of the image actions.

#### Markers and placement

- **FR-020**: Each placed cabinet MUST render as a marker centred on its stored position on the image. The marker is a 32px rounded button showing the cabinet's location symbol.
  - Its tooltip and accessible name MUST read 「{symbol}　{name}・{shape label}」, with a full-width space after the symbol.
  - The shape labels are 3列×9段 / 3列×7段 / 3列×5段 / 3列×2段.
- **FR-021**: The selected marker MUST be visually distinct (filled, ringed, raised above others). A marker whose position differs from the saved state MUST carry a small warning-coloured dot at its top-right. Hovering a marker MUST highlight its panel row, and hovering a row MUST highlight its marker.
- **FR-022**: Pressing a marker or a row MUST select that cabinet. The selected row MUST scroll into view in the panel.
- **FR-023**: For an editor, pressing 配置 on an unplaced cabinet MUST:
  - place it at the image centre, or if a marker already lies within 0.04 of the centre, shift it diagonally by 0.04 up to 10 times;
  - select it;
  - show in the card header the hint 「{name} を置きました。ドラッグして位置を合わせてください」.
    The hint MUST disappear as soon as the cabinet is moved, another cabinet is selected or the selection clears, or the image is removed.
- **FR-024**: 配置 MUST be disabled while there is no draft image, exposing the reason 「フロア図の画像が未登録のため配置できません。先に画像を登録してください」.
- **FR-025**: For an editor, a marker MUST be draggable.
  - A press that moves at least 4px becomes a drag. One that moves less is a selection.
  - The marker MUST keep the offset at which it was grabbed, so it does not jump.
  - The position MUST be clamped to 0.0–1.0 on both axes.
  - The click that ends a drag MUST NOT be treated as a selection.
- **FR-026**: For an editor, the arrow keys MUST move the selected marker by 1px of the rendered image (10px with Shift), clamped to the image. Arrow keys on an unselected marker MUST do nothing.
- **FR-027**: For an editor, a placed cabinet's row MUST offer an icon button labelled 配置を外す, with a tooltip of the same text. It returns the cabinet to unplaced in the draft.
- **FR-028**: Positions MUST be stored relative to the image (0.0–1.0 from the top-left corner), never in pixels. A marker MUST therefore land on the same spot of the plan at any rendered size, on this screen and on the store-detail tab.
- **FR-029**: For a user without edit rights, markers MUST NOT move by drag or keyboard. They still show tooltips and can be selected.

#### ロッカー筐体 panel

- **FR-030**: The panel MUST be titled ロッカー筐体 with a badge 「{n}棟」 counting every cabinet of the store.
- **FR-031**: The panel MUST list the cabinets in two sections, 未配置 then 配置済み, each sorted by location symbol and each headed by its count.
  - The 未配置 count MUST render as a warning-toned badge when above zero.
  - When 未配置 is empty, it MUST read 「すべて配置済みです」.
- **FR-032**: Each row MUST show:
  - a symbol chip (filled when selected);
  - the cabinet name;
  - beneath the name, the shape label;
  - when its position differs from the saved state, a warning dot with the text 未保存 beside the name.
    The selected row MUST be highlighted.
- **FR-033**: When a placed cabinet's position cannot be drawn because there is no draft image, its row MUST add the line 「画像がないため地図に表示できません」.
- **FR-034**: The selected row MUST show a 詳細 link with an external-link icon and the tooltip 「ロッカー詳細を別タブで開きます」. The link opens **that cabinet's** locker detail (E-01) in a new browser tab, leaving this screen and its draft untouched with no confirmation. It is available to every role that can open the screen.
- **FR-035**: For an editor, unplaced rows MUST end with 配置 (FR-023/FR-024) and placed rows with 配置を外す (FR-027). Without edit rights, rows carry no action.
- **FR-036**: The cabinets listed MUST be exactly the store's active cabinets, as registered in E-01. This screen MUST NOT create, rename, reshape or delete a cabinet.

#### Draft, save and discard

- **FR-040**: Every change (place, move, unplace, image register, replace or delete) MUST apply to a draft only. The draft is compared with the last saved state, and nothing is stored until 変更を保存.
- **FR-041**: While the draft differs from the saved state and the user can edit, an unsaved-changes bar MUST render at the bottom of the screen, outside the scrolling body so it never covers the map.
  - Left side: a warning dot and the message 「未保存の変更があります（{parts}）」. {parts} joins with 「・」 the applicable parts 「位置 N台」 (N = cabinets whose position differs) and 「フロア画像の登録」 / 「フロア画像の差し替え」 / 「フロア画像の削除」.
  - Right side: 破棄 and the primary 変更を保存, in that order.
- **FR-042**: 変更を保存 MUST store the draft image (if it changed) and every changed position, then show one success toast:
  - 「フロア図とロッカーの位置を保存しました（N台）」 when the image and N > 0 positions changed;
  - 「フロア図を保存しました」 when only the image changed;
  - 「ロッカーの位置を保存しました（N台）」 when only positions changed.
- **FR-043**: After a fully successful save the saved state MUST equal the draft. All 未保存 indicators and the bar clear, and the replace warning disappears.
- **FR-044**: 破棄 MUST revert the draft to the saved state without a confirmation. It MUST clear the selection, the placement hint and any file error, and show the toast 「変更を破棄しました」.
- **FR-045**: A save MUST NOT be possible from the 全店舗 empty state or by a user without edit rights (the bar does not render).
- **FR-046**: When a save partly fails:
  - every write that succeeded MUST become part of the saved state;
  - every part that failed MUST stay in the draft, marked 未保存;
  - the screen MUST report which part failed (the image, or the named cabinets), and MUST NOT show the success toast.
- **FR-047**: A position write refused because the cabinet changed since it was read MUST be reported as "changed by someone else", not as invalid input. Re-reading the map MUST bring back the cabinet's current position.
- **FR-048**: A successful save MUST refresh every cached copy of this store's map, so the store-detail 店舗マップ tab shows the new map and counts without a manual reload. That includes the 配置済み / 未配置 counts.

#### Unsaved-changes guard

- **FR-050**: Both breadcrumb links MUST leave at once when the draft is clean, and MUST open a confirmation dialog when it is dirty. The dialog is titled 「変更を破棄しますか？」, with the body 「未保存の変更はすべて失われます。この操作は取り消せません。」 and the choices 編集を続ける (stay, draft intact) and 破棄する (leave, draft dropped).
- **FR-051**: While the draft is dirty the browser's own leave confirmation MUST be raised on close or reload.
- **FR-052**: Any other in-app navigation away from the screen with a dirty draft MUST go through the same dialog. This includes the sidebar and a header store change when the address names no store. **Spec-governed**: V0 guards only the breadcrumb; this follows the app's navigation-blocker convention.
- **FR-053**: A successful save MUST clear the dirty state, so no dialog appears on the way out.

#### Permissions

- **FR-060**: System, Headquarter, Manager and Staff MAY open the screen. Edit rights are granted to System and Headquarter for every store, and to Staff for their own store only (Y-02 L215).
- **FR-061**: Trainer and Observer MUST NOT reach the screen. They get the app's standard access-denied answer, and the entry points of FR-070–FR-072 MUST NOT be offered to them. **Intentional divergence from V0**, which shows them the read-only view.
- **FR-062**: A Staff user opening a store other than their own MUST see an in-page permission wall instead of the map. **Intentional divergence from V0**, which lets every Staff edit any store (`store-map.ts` L52).
- **FR-063**: A Manager MUST get the read-only view: FR-019, FR-029, no row actions, no bar. This holds even though E-01 lets a Manager edit the cabinet master of managed stores.
- **FR-064**: The API layer MUST refuse a position or image write from a role or for a store the rules above do not allow, independently of the UI. A refusal MUST be reported as "not permitted", distinct from a failed or invalid save.

#### Entry points

- **FR-070**: The store detail's 店舗マップ tab (027) is the primary entry. Its 店舗マップ設定 button, and the 「店舗マップ設定で登録する」 button in its empty state, MUST open this screen for that store. Both are offered only to users with edit rights for that store.
- **FR-071**: E-01's locker list MUST offer a 店舗マップ設定 button opening this screen. If the locker list is scoped to a store, the button MUST name that store. Otherwise this screen resolves the store per FR-004/FR-005.
- **FR-072**: E-01's locker form links labelled 店舗マップ設定 (in its floor-map preview and location help) MUST open this screen through the locker form's own unsaved-changes guard.
- **FR-073**: Returning from this screen MUST always lead to the store detail's 店舗マップ tab or the store list (FR-002), never back to the E-01 screen it was opened from. The breadcrumb names the screen's place, not the route taken (V0 L569-571).

#### Data

- **FR-080**: The screen MUST read the store's cabinets, with their positions, from the backend's locker list filtered by store, and MUST read the image reference from the store's content row. It MUST NOT keep a copy of either local to the screen.
- **FR-081**: A position change MUST be written to that cabinet as a coordinate pair, both values or both empty for unplaced, carrying the version it was read at.
- **FR-082**: A new or replaced image MUST be uploaded to storage first. Its reference is then stored on the store's content row, and a deleted image MUST clear that reference. The content-row write MUST carry every other field of that row unchanged, because the backend's write replaces the whole row (Appendix A.3).
- **FR-083**: The floor-plan image half of the screen (dropzone, type/size validation, preview, 画像を差し替え / 画像を削除, replace warning, draft/save of the image) MUST be built as UI now, exactly to V0, but MUST NOT be wired to any API in Phase 1 — neither the real one nor a mock (user decision 2026-10-02, Q1). It is wired to the real API in a later round, once the backend returns a fetchable address for `gymMapS3Key` (integration backlog B4 / R204). Until then the image is held only in the screen's own session state, and locker positions — which already have a real endpoint — are saved for real (FR-080–FR-082).
- **FR-084**: Change-history rows MUST NOT be created, updated or deleted by this feature. Any history the backend records as a side effect of the content-row write is not displayed here.
- **FR-085**: The order of writes on save MUST be: the image first, then the positions. A cabinet placed on a new image is then never stored against an image that failed to save.

### Key Entities

- **Store floor map (店舗マップ)**: one per store. It consists of a floor-plan image reference, which may be absent, plus the positions of that store's cabinets. Stored as the image reference on the store's content row (`store_details.gymMapS3Key`) and as a coordinate pair on each cabinet.
- **Locker cabinet (ロッカー筐体)**: owned by E-01. Attributes this screen reads:
  - identity;
  - location symbol (the location master's code, e.g. A);
  - display name;
  - shape (3列×9/7/5/2段);
  - active flag;
  - the position, the only attribute it writes: relative x/y in 0.0–1.0 from the image's top-left, both empty = unplaced;
  - a version stamp used to detect concurrent edits.
- **Store (店舗マスタ)**: the store whose map this is. It supplies the name for the breadcrumb, badge and alt text, and the scope used by the own-store rule.
- **Draft vs saved state**: the screen's working copy, compared position-by-position and for the image with the last saved state. It drives the 未保存 indicators, the bar message and the leave guard.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An editor can register an image and place five unplaced cabinets in under three minutes, and the saved map shows on the store-detail tab immediately afterwards.
- **SC-002**: 100% of the prototype's elements enumerated in `checklists/parity.md` render with the prototype's labels, copy, order and states, except the items flagged as intentional divergences.
- **SC-003**: A saved marker reopens on the same spot of the floor plan at three different window widths, verified against the saved relative position, on this screen and on the store-detail tab.
- **SC-004**: No unsaved draft is ever lost through a breadcrumb, sidebar or reload without a confirmation, and choosing to stay preserves every moved marker.
- **SC-005**: A Manager, and a Staff member on another store, cannot change any position or image. Neither can a write sent directly to the API layer on their behalf, which is verified without going through the screen.
- **SC-006**: Trainer and Observer cannot reach the screen from any entry point or by address.
- **SC-007**: After a partly failed save, the operator can see which cabinets or the image did not save, and can retry without redoing the parts that did.
- **SC-008**: Saving a replaced floor-plan image leaves every other field of the store's content row (店舗紹介文, アクセス情報, SNS URLs, …) byte-for-byte unchanged. This is verified by reading the row before and after.

---

## Assumptions

- **The prototype governs the UI; Y-02 governs the rules.** Where the prototype's role logic is looser than Y-02's 権限マトリクス (Staff on any store; Trainer and Observer seeing the read-only view), Y-02 wins and the divergence is flagged in `parity.md`.
- **One image per store.** Both the `e5501a3` prototype and the backend's single `gymMapS3Key` say so. The `c1c7e2e` multi-floor model, with フロア名 and 面積, is not built.
- **Real API, not mock-first.**
  - Coordinates and the image reference already exist on the backend (Appendix A). The store screens of 026 already run on `src/lib/api-real`.
  - The only gap is resolving the image key to a fetchable address. Per Q1 (resolved 2026-10-02) the image UI ships unwired, with no mock, and is integrated when the backend adds the address (FR-083).
- **The cabinet name shown is the location master's name** (`locationName`, e.g. 「ロッカー棟A」), falling back to the location code when the join misses. The symbol is the location code. Informed default; BQ6.
- **Only active cabinets are listed.** Inactive ones are hidden even if they hold a position, and their stored position is left untouched.
- **The 5MB / PNG・JPG limit is a screen rule** stricter than the storage service's 100MB. SVG is not on the storage whitelist (BQ1).
- **Saving is several writes, not one transaction.** The backend writes positions one cabinet at a time and offers no batch. FR-046 defines the partial-failure behaviour instead of assuming atomicity.
- **Locker detail opens per cabinet.** V0 opens a generic locker detail with no id (L236-240). The built screen opens the selected cabinet's own detail page.

---

## Out of Scope for Phase 1

- **Creating, editing or deleting cabinets, slots, shapes or location codes**: E-01 (`specs/022-locker-management`). This screen only positions existing cabinets.
- **Multiple floors per store**: the `c1c7e2e` prototype's 1階 / 2階 / 地下1階 tabs and its フロア名 / 面積 fields were removed at `e5501a3`, and the backend has one image per store.
- **Areas or rooms drawn on the map** (エントランス, ジムエリア, ロッカールーム…): the `c1c7e2e` SVG mock drew them, but the current screen has only the uploaded image.
- **Zoom, pan, rotation, snapping or grid alignment**: none in the prototype.
- **Showing slot status or occupancy on the map** (E-01 FR-016's "display" half on the locker screens, FR-014 稼働率): E-01's concern, and Could.
- **Change-history writing or display**: seed only. The store's history read surface belongs to 027.
- **The store-detail 店舗マップ tab's own rendering**: specified in `store-detail/spec.md`. This spec only requires that it opens this screen (FR-070) and refreshes after a save (FR-048).
- **Store photos and other store-page content** (I-01 / store_details text fields): not edited here, though FR-082 must preserve them.

---

## Traceability Matrix

| #   | UI element (`store-map-setup.tsx` @ `47423ec` unless noted)                                               | Lines                                                       | Requirement source                                                            | Spec FR                        |
| --- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| 1   | `screens.ts` `store-map-setup` — `phases: ["1"]`, 「主な入口は店舗詳細の店舗マップタブ…戻り先は店舗詳細」 | screens.ts L1344-1354                                       | Y-02 FR-006 (Must), user decision 2026-10-02                                  | FR-001, FR-070, FR-073         |
| 2   | Store resolution — `?storeId` > header store > 全店舗                                                     | L250-262                                                    | Y-02 FR-006 「店舗フロア図をベースに」 (per store)                            | FR-003, FR-004                 |
| 3   | 全店舗 EmptyState 「対象店舗を選択してください」                                                          | L618-629                                                    | Store-scoped screen convention                                                | FR-005                         |
| 4   | Breadcrumb 店舗管理 › {店舗名} › 店舗マップ設定 (guarded)                                                 | L572-605                                                    | Y-02-05 placement under 店舗管理                                              | FR-002, FR-050, FR-073         |
| 5   | Title 店舗マップ設定 + MapPin store badge                                                                 | L606-614                                                    | Y-02-05 画面名                                                                | FR-002                         |
| 6   | Two-column layout; sticky right panel                                                                     | L631-633, L744-745                                          | Prototype layout                                                              | FR-006                         |
| 7   | フロア図 card title; 閲覧のみ for non-editors                                                             | L634-641                                                    | Y-02 L215 (edit roles)                                                        | FR-010, FR-019                 |
| 8   | Dropzone 「フロア図の画像を登録してください」 / 「PNG・JPG（5MB まで）」 / 画像を選ぶ                     | L713-731                                                    | Y-02 FR-006 「店舗フロア図をベース」; Y-02 L217 フロアマップ (Staff-editable) | FR-011                         |
| 9   | Non-editor empty 「フロア図が登録されていません」                                                         | L732-738                                                    | —                                                                             | FR-012                         |
| 10  | File type / size validation messages                                                                      | L65-68, L392-405, L739                                      | Prototype rule                                                                | FR-013, FR-014                 |
| 11  | 画像を差し替え / 画像を削除                                                                               | L649-665, L414-424                                          | Y-02 FR-006                                                                   | FR-015, FR-016                 |
| 12  | Replace warning 「画像を差し替えました」                                                                  | L322-323, L680-688                                          | Prototype safeguard                                                           | FR-017                         |
| 13  | `StoreFloorMap` image + overlay, alt 「{店舗名}のフロア図」                                               | L689-712; store-floor-map.tsx L80-109                       | Y-02 FR-006                                                                   | FR-018, FR-028                 |
| 14  | `LockerMarker` — symbol, selected, unsaved dot, tooltip                                                   | store-floor-map.tsx L14-77; store-map.ts L77-79             | Y-02 FR-006 「ロッカーの配置座標を設定」                                      | FR-020, FR-021                 |
| 15  | Hover/selection sync, scroll into view                                                                    | L154-158, L527-530                                          | Prototype interaction                                                         | FR-021, FR-022                 |
| 16  | 配置 → centre with diagonal offset; placement hint                                                        | L60-63, L366-384, L644-648                                  | Y-02 FR-006                                                                   | FR-023                         |
| 17  | 配置 disabled reason (no image)                                                                           | L212-226                                                    | Prototype rule                                                                | FR-024                         |
| 18  | Drag (4px threshold, grab offset, clamp, click suppression)                                               | L57-58, L471-524                                            | Y-02 FR-006                                                                   | FR-025                         |
| 19  | Arrow keys 1px / Shift 10px                                                                               | L70-76, L444-468                                            | Accessibility of FR-025                                                       | FR-026                         |
| 20  | 配置を外す                                                                                                | L194-211, L386-389                                          | Y-02 FR-006                                                                   | FR-027                         |
| 21  | Relative coordinates                                                                                      | store-map.ts L17-21                                         | Backend `mapX`/`mapY` 0.0–1.0                                                 | FR-028, FR-081                 |
| 22  | ロッカー筐体 panel + 「{n}棟」                                                                            | L746-753                                                    | E-01 cabinets                                                                 | FR-030, FR-036                 |
| 23  | 未配置 / 配置済み sections, warning badge, 「すべて配置済みです」                                         | L757-783                                                    | Y-02 FR-006                                                                   | FR-031                         |
| 24  | Row: chip, name, 未保存, shape, no-image line                                                             | L101-112, L160-193                                          | Prototype                                                                     | FR-032, FR-033                 |
| 25  | 詳細 → locker detail in a new tab                                                                         | L170-187, L236-240                                          | E-01 FR-016 連携                                                              | FR-034                         |
| 26  | Draft vs saved diff; bar message parts                                                                    | L264-266, L308-321                                          | Prototype                                                                     | FR-040, FR-041                 |
| 27  | `UnsavedChangesBar` — 破棄 / 変更を保存                                                                   | L794-801; unsaved-changes-bar.tsx L42-76                    | App convention                                                                | FR-041, FR-045                 |
| 28  | Save toasts (three variants)                                                                              | L336-349                                                    | Prototype                                                                     | FR-042, FR-043                 |
| 29  | Discard toast 「変更を破棄しました」                                                                      | L351-357                                                    | Prototype                                                                     | FR-044                         |
| 30  | Leave dialog 「変更を破棄しますか？」; beforeunload                                                       | L275-281, L326-328, L805-818; use-unsaved-changes.ts L33-42 | App convention                                                                | FR-050, FR-051, FR-053         |
| 31  | `STORE_MAP_EDITABLE_ROLES` (HQ / System / Staff)                                                          | L247-248; store-map.ts L52                                  | Y-02 L215 — narrowed for Staff to 所属店舗                                    | FR-060, FR-062, FR-063         |
| 32  | Trainer / Observer — **no V0 source** for denial                                                          | —                                                           | Y-02 L207, L215 (× / ×)                                                       | FR-061                         |
| 33  | Store-detail 店舗マップ tab entry (店舗マップ設定 / 店舗マップ設定で登録する)                             | store-detail.tsx L532-539, L2620-2689                       | Y-02-05 「主な入口」                                                          | FR-070, FR-048                 |
| 34  | Locker list 店舗マップ設定 button                                                                         | locker-list.tsx L524-528                                    | E-01 FR-016                                                                   | FR-071                         |
| 35  | Locker form 店舗マップ設定 links                                                                          | locker-form.tsx L511, L604                                  | E-01 前提条件 L153                                                            | FR-072                         |
| 36  | Loading / error / partial-failure / conflict states — **no V0 source**                                    | —                                                           | Repo data-state convention; backend 409 optimistic lock                       | FR-007, FR-046, FR-047         |
| 37  | Image key storage and resolution — **no V0 source** (V0 uses a blob URL in memory)                        | L392-405 (blob)                                             | Backend `gymMapS3Key`; B4                                                     | FR-080, FR-082, FR-083, FR-085 |
| 38  | No history writes                                                                                         | —                                                           | User instruction (sibling convention)                                         | FR-084                         |

---

## Appendix A — Backend API reference (dev, `src/lib/openapi.real.json` @ 2026-10-02)

### A.1 Read cabinets with positions — `GET /api/v1/admin/lockers?storeId=&isActive=true` (API-100 §4)

- Returns `LockerListItemDto[]` with `id`, `storeId`, `isActive`, `lockerLocationId`, `locationCode`, `locationName`, `locationCaption`, `shapeType` (`three_by_nine` | `three_by_seven` | `three_by_five` | `three_by_two`), `mapX`, `mapY` and `updatedAt`.
- `mapX` / `mapY` are 「relative 0.0–1.0 from the floor-plan image's top-left origin, not pixels. Null when the cabinet has not been placed — always null together」.
- Paginated, with `limit` at most 100. The screen must page through all of a store's cabinets (BQ5).
- 403 is E-LOC-101: 「trainer on anything, observer on a write」.

### A.2 Save a position — `PATCH /api/v1/admin/lockers/{lockerId}` (API-100 §6.3)

- `UpdateLockerDto.mapX` / `mapY`: 「this is where a drag on the floor plan is saved (API-100 §6.3 #10; never regenerates slots). Relative 0.0–1.0. Send both mapX and mapY, or both null to unplace; anything else is 422 E-VAL-001」.
- `expectedUpdatedAt` is the optimistic lock, and a stale value is answered with 409.
- There is one call per cabinet and no batch endpoint (BQ3).

### A.3 Image reference — `GET` / `PUT /api/v1/admin/stores/{id}/details` (API-135 / API-083 §18.2)

- `StoreCmsDetailDto.gymMapS3Key` 「S3 key of the gym floor map. Null when unset.」
- The `PUT` is a 「Full replacement of the 1:1 `store_details` row … every omitted field is cleared to null」.
  - `gymMapS3Key` must start with `member-shared/store-image/`.
  - It 「Writes `stores_history` (`update`, `scope = details`)」.
  - Roles: 「system/headquarter/staff (own stores; another store → E-AUTH-101); manager → E-AUTH-103」.
- Hence FR-082's read-modify-write, and BQ2.

### A.4 Upload — `POST /api/v1/media/presign` (API-006) with `tag: "store-image"`

- Returns a presigned PUT URL, `requiredHeaders` and the `s3Key` to send in A.3.
- Limit: 100MB and a global content-type whitelist, E-MED-002 (BQ1).

### A.5 Gaps

- **B4 / R204**: no fetchable URL for `gymMapS3Key` (Q1).
- No batch position write (BQ3).
- Backend role rules looser than Y-02 for Manager on cabinets (BQ4).

---

## Q&A / Clarification Needed

### Q1 — How does the floor-plan image render on the real API? ✅ **RESOLVED 2026-10-02 — build the UI first, integrate when the API adds the URL; no mock API**

**Decision (user, 2026-10-02)**: none of options A/B/C as written. The image UI is built to V0 now and left unwired — no mock endpoint is added for it — and is connected to the real API once the backend resolves `gymMapS3Key` to a fetchable address (B4 / R204). Locker positions use the real API from the start. Recorded in FR-083. QA consequence: image persistence across reloads (and Story 1 against a saved image) is **Block** until B4 lands.

**Context**:

- The backend stores the image as `gymMapS3Key`, a raw `member-shared/store-image/…` key. Unlike `StoreImageDto.url`, nothing resolves it to an address the browser can load.
- The 026 integration plan already tracks this as **B4 / R204**: the store-detail basic-info tab shows 「API未対応」 on its フロアマップ card for the same reason.
- Without it, positions can be saved but not seen against the plan.

| Option | Answer                                                                                                         | Implications                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A      | Wait: ask the backend to return a resolved URL (e.g. `gymMapUrl` beside the key) before building               | Clean. The screen is blocked until the backend ships it.                                                              |
| B      | Build now: positions and upload on the real API, with the image shown as unavailable until B4 lands            | Most of the screen is verifiable now. Placing is impossible against a real image, so Story 1 is Block in QA until B4. |
| C      | Build now with a session-local preview: the just-uploaded file renders from memory; a reload shows unavailable | Matches V0's blob behaviour for the upload flow. A reopened screen still cannot show the saved image.                 |

### Backend questions (raise with BE; not blocking the spec)

- **BQ1 — Is `image/svg+xml` on the media whitelist for tag `store-image`?** **Answered 2026-10-05 (BE): no** — the presign takes PNG / JPG only. The screen drops SVG from V0's PNG / JPEG / SVG, so an SVG is refused locally with FR-013's type message (FR-013).
- **BQ2 — A partial update for `gymMapS3Key`.** `PUT /stores/{id}/details` clears every omitted field. Writing the map key alone needs a read-modify-write, which races with the store-page screen (I-01) writing the same row. Request a dedicated field write or `PATCH` semantics.
- **BQ3 — Batch position save.** Saving N moved cabinets costs N `PATCH` calls with no atomicity. Request `PUT /stores/{id}/locker-positions` (all pairs plus versions, one transaction), or confirm per-cabinet saves are intended (FR-046 covers it either way).
- **BQ4 — Role rules on `PATCH /lockers/{id}` for `mapX`/`mapY`.**
  - The backend refuses only Trainer, and Observer on writes.
  - Y-02 L215 gives Manager × for 店舗マップ設定, while E-01's matrix gives Manager ○ 管轄店舗 for ロッカー（親）登録・編集.
  - Ask whether a coordinate-only write should follow Y-02, and whether Staff writes are scoped to their own store.
- **BQ5 — `limit` max 100 on the locker list.** Confirm there is no "all cabinets of one store" variant. Paging is assumed.
- **BQ6 — Which field is the cabinet's display name?** V0 shows 「ロッカー棟A」 beside symbol 「A」. The DTO offers `locationName` (master) and `locationCaption` (free text). The assumption is `locationName`.

### Informational — recorded, not blocking

- **V0 diverges from Y-02 on roles twice**: Staff on any store, and Trainer/Observer seeing the read-only view. Both are resolved in favour of Y-02 (FR-061, FR-062), so nothing is asked of the client.
- **V0's 詳細 opens a generic locker detail** with no cabinet id (L236-240), a mock limitation. FR-034 requires the selected cabinet's page.
- **E-01 calls the map's location codes 「エリア記号（A〜N, R, S）」** in the locker form (locker-form.tsx L511-514). This screen shows them as the cabinet's symbol and never edits them.
- **The `c1c7e2e` version that 026's earlier documents describe** (ロッカーマップ設定, multi-floor, header 保存 button, フロア設定 card) no longer exists. Nothing from it is carried forward.
