# UI Parity Checklist: Store Map Setup — Floor Plan & Locker Placement (Y-02 FR-006 / Y-02-05)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` → `src/pages/store-map-setup.tsx` @ `47423ec` (2026-09-30), 821 lines (rewritten at `e5501a3`, 2026-09-26). Supporting files: `src/components/store-floor-map.tsx`, `src/data/store-map.ts`, `src/components/unsaved-changes-bar.tsx`, `src/hooks/use-unsaved-changes.ts`. Entry points come from `src/pages/store-detail.tsx`, `src/pages/locker-list.tsx` and `src/pages/locker-form.tsx`, all @ `47423ec`.
**Rule**: Tick an item `[x]` ONLY after confirming the element or state renders in the built screen and matches the V0 field set, order and copy. Items marked **Intentional divergence from V0** or **No V0 source** are verified against `spec.md`, not the mockup.

> One open clarification, spec Q1 (the floor-plan image URL, B4), means items that need a real image rendered (PAR040–PAR058, PAR080) may have to be run against a freshly uploaded file, or recorded Block, until it is resolved.

## Page shell and header

- [x] PAR001 Sidebar highlights the 店舗管理 entry (store-map-setup is one of its matched pages) — src: store-map-setup.tsx:L565
- [x] PAR002 Shared app header renders above the page header — src: store-map-setup.tsx:L567
- [x] PAR003 Page header sits outside the scrolling body; body scrolls on its own; bar sits below the body — src: store-map-setup.tsx:L566, L572-573, L617, L794
- [x] PAR004 Breadcrumb first item 店舗管理, a link to the store list, passing through the discard guard — src: store-map-setup.tsx:L578-585
- [x] PAR005 Breadcrumb second item = the store name, a link to the store detail opened on its 店舗マップ tab, guarded — src: store-map-setup.tsx:L587-599
- [x] PAR006 Breadcrumb last item 店舗マップ設定 (current page, not a link) — src: store-map-setup.tsx:L600-602
- [ ] PAR007 Breadcrumb row is 24px high, aligning the title with the store detail's title — src: store-map-setup.tsx:L575-576 — ⚠ Gap: Breadcrumb nav is h-6 (24px measured), but the title does not line up with the store detail title: h1 top = 120px on /stores/{201}/map vs 117px on /stores/{201} (detail uses a 16px 「店舗管理に戻る」 back-link row at top 85). Off by 3px at 1440x900 (c13.js)
- [x] PAR008 Page title 店舗マップ設定 — src: store-map-setup.tsx:L606
- [x] PAR009 Title badge: outline badge with a MapPin icon and the store name — src: store-map-setup.tsx:L607-614

## Store resolution and 全店舗 empty state

- [x] PAR010 Store in the address wins: the screen shows that store even when the header selector shows another store or 全店舗 — src: store-map-setup.tsx:L253-259
- [x] PAR011 No store in the address + single-store header scope → the header's store is shown (name in breadcrumb and badge) — src: store-map-setup.tsx:L257-262
- [x] PAR012 No store in the address + 全店舗 → a card holding the EmptyState with a MapPin icon replaces both columns — src: store-map-setup.tsx:L618-629
- [x] PAR013 EmptyState title 「対象店舗を選択してください」 — src: store-map-setup.tsx:L625
- [x] PAR014 EmptyState description 「ロッカーマップは店舗ごとに設定します。ヘッダーの店舗セレクターで対象店舗を選択すると、その店舗のフロアマップが表示されます。」 — src: store-map-setup.tsx:L626
- [x] PAR015 In the 全店舗 empty state the breadcrumb omits the store item and the title badge is absent — src: store-map-setup.tsx:L587, L607-608
- [x] PAR016 In the 全店舗 empty state the unsaved-changes bar never renders — src: store-map-setup.tsx:L794
- [x] PAR017 Picking a store in the header from the 全店舗 empty state renders that store's map — src: store-map-setup.tsx:L257-262

## Layout

- [x] PAR020 Two columns: フロア図 card on the left, flexible width — src: store-map-setup.tsx:L631-633
- [x] PAR021 ロッカー筐体 panel on the right, fixed width (w-80), sticky to the top while the body scrolls — src: store-map-setup.tsx:L744
- [x] PAR022 Panel card height capped to the viewport; its list scrolls inside the card — src: store-map-setup.tsx:L745, L754-755

## フロア図 card — header

- [x] PAR030 Card title フロア図 — src: store-map-setup.tsx:L635
- [x] PAR031 Read-only users: header action shows a Lock icon + 閲覧のみ (muted, small) — src: store-map-setup.tsx:L636-640
- [x] PAR032 Editors with an image: header action 画像を差し替え (outline, small, ImageUp icon) opens the file picker — src: store-map-setup.tsx:L642-652
- [x] PAR033 Editors with an image: ghost icon button (Trash2) with aria-label 画像を削除 and tooltip 画像を削除 — src: store-map-setup.tsx:L653-665
- [x] PAR034 Editors with no image: no header action at all — src: store-map-setup.tsx:L641-643
- [x] PAR035 Placement hint 「{name} を置きました。ドラッグして位置を合わせてください」 left of the actions, role=status — src: store-map-setup.tsx:L644-648
- [x] PAR036 Placement hint shows only while the just-placed cabinet is still selected and unmoved — src: store-map-setup.tsx:L270-271, L535-538
- [x] PAR037 Placement hint clears on drag, on arrow-key move, on selecting another cabinet, on unplacing it, and on image delete — src: store-map-setup.tsx:L360-363, L386-389, L420, L452, L498

## フロア図 card — no image / upload

- [x] PAR040 Editors, no image: dashed dropzone, min height 400px, centred content — src: store-map-setup.tsx:L713-722
- [x] PAR041 Dropzone Upload icon — src: store-map-setup.tsx:L723
- [x] PAR042 Dropzone line 1 「フロア図の画像を登録してください」 (medium weight) — src: store-map-setup.tsx:L725
- [x] PAR043 Dropzone line 2 「PNG・JPG（5MB まで）」 (muted, small; V0 lists SVG too — dropped, BQ1) — src: store-map-setup.tsx:L726
- [x] PAR044 Dropzone button 画像を選ぶ (outline) opens the file picker — src: store-map-setup.tsx:L728-730
- [x] PAR045 Dragging a file over the dropzone highlights it (ring border + muted fill); leaving the zone clears it — src: store-map-setup.tsx:L716-717, L426-434
- [x] PAR046 Dropping a file onto the dropzone applies it — src: store-map-setup.tsx:L436-441
- [x] PAR047 Hidden file input accepts image/png, image/jpeg (V0 also takes image/svg+xml — dropped, the presign refuses it, BQ1); it exists only for editors — src: store-map-setup.tsx:L66-67, L671-679
- [x] PAR048 Choosing the same file twice in a row still applies it (input cleared after each pick) — src: store-map-setup.tsx:L407-412
- [x] PAR049 Read-only users, no image: EmptyState (MapPin) titled 「フロア図が登録されていません」, no dropzone — src: store-map-setup.tsx:L732-737

## フロア図 card — image errors and replace notice

- [x] PAR050 Wrong type → 「PNG・JPG 以外の形式のため登録できません（選んだファイル: {file name}）」; draft image unchanged — src: store-map-setup.tsx:L393-396
- [x] PAR051 Over 5MB → 「5MBを超えているため登録できません（選んだファイル: {x.x}MB）」, size to one decimal; draft image unchanged — src: store-map-setup.tsx:L68, L88-90, L397-400
- [x] PAR052 Error text renders below the image area in small destructive text — src: store-map-setup.tsx:L739
- [x] PAR053 A valid file clears the error and replaces the draft image immediately — src: store-map-setup.tsx:L401-404
- [x] PAR054 画像を削除 clears the error, removes the draft image, keeps every cabinet position — src: store-map-setup.tsx:L418-424
- [x] PAR055 Replace notice (warning Alert, AlertTriangle icon) renders above the image while a saved image exists and the draft image differs — src: store-map-setup.tsx:L322-323, L680-688
- [x] PAR056 Replace notice title 「画像を差し替えました」 — src: store-map-setup.tsx:L683
- [x] PAR057 Replace notice body 「ロッカーの位置は前の画像のままです。ずれていないか確認してください」 — src: store-map-setup.tsx:L684-686
- [x] PAR058 Replace notice does not render for a first registration or a deletion — src: store-map-setup.tsx:L94-98, L323

## Map and markers

- [x] PAR060 Image renders centred at its natural aspect ratio, max width 100%, capped height; not draggable as an image — src: store-floor-map.tsx:L96-103; store-map-setup.tsx:L690-694
- [x] PAR061 Image alt 「{店舗名}のフロア図」 — src: store-map-setup.tsx:L692
- [x] PAR062 One marker per placed cabinet, centred on its relative position (left/top %) — src: store-floor-map.tsx:L56; store-map-setup.tsx:L695-711
- [x] PAR063 Marker: 32px high, min 32px wide, rounded, 2px foreground border, background fill, location symbol in semibold tabular digits — src: store-floor-map.tsx:L49-50, L66
- [x] PAR064 Marker tooltip (top) and aria-label 「{symbol}　{name}・{shape}」 (full-width space), e.g. 「A　ロッカー棟A・3列×9段」 — src: store-floor-map.tsx:L43-46, L74; store-map.ts:L77-79
- [x] PAR065 Shape labels 3列×9段 / 3列×7段 / 3列×5段 / 3列×2段 — src: store-map.ts:L44-49
- [x] PAR066 Selected marker: primary fill, primary text, ring with offset, raised above others — src: store-floor-map.tsx:L52
- [x] PAR067 Hovered marker (or hovered row) gets a stronger shadow — src: store-floor-map.tsx:L51; store-map-setup.tsx:L700, L705
- [x] PAR068 Marker with a position differing from the saved state shows a warning dot at its top-right — src: store-floor-map.tsx:L67-72; store-map-setup.tsx:L703
- [x] PAR069 Marker focus shows a visible focus ring — src: store-floor-map.tsx:L50
- [x] PAR070 Clicking a marker selects its cabinet and highlights its row — src: store-map-setup.tsx:L518-524, L704
- [x] PAR071 Selecting a cabinet scrolls its row into view in the panel — src: store-map-setup.tsx:L527-530

## Marker drag and keyboard

- [x] PAR075 Editors: marker cursor is grab; grabbing while dragging; touch scrolling disabled on the marker — src: store-floor-map.tsx:L53-54
- [x] PAR076 A press moving less than 4px is a selection, not a drag — src: store-map-setup.tsx:L57-58, L491-494
- [x] PAR077 A drag keeps the grab offset (no jump), follows the pointer, selects the dragged cabinet — src: store-map-setup.tsx:L474-484, L494-505
- [x] PAR078 Drag position clamped to the image (0–1 on both axes) — src: store-map-setup.tsx:L78-80, L502-505
- [x] PAR079 The click ending a drag is not treated as a selection — src: store-map-setup.tsx:L508-524
- [x] PAR080 Arrow keys move the selected marker 1px of the rendered image; Shift+arrow moves 10px; clamped — src: store-map-setup.tsx:L70-76, L444-468
- [x] PAR081 Arrow keys on an unselected marker do nothing — src: store-map-setup.tsx:L445
- [x] PAR082 Pointer cancel ends the drag like pointer up — src: store-floor-map.tsx:L64
- [ ] PAR083 Read-only users: marker cursor default; no drag; no keyboard move; tooltip still shows; marker still selectable — src: store-floor-map.tsx:L53; store-map-setup.tsx:L445, L473, L702 — ⚠ Gap: BLOCK(B4): read-only users (Manager) get no file input and the image is session-only, so a read-only session can never show a floor image or markers. Cursor/drag/keyboard/tooltip on markers cannot be exercised. Row selection and 詳細 work for Manager

## ロッカー筐体 panel

- [x] PAR090 Panel title ロッカー筐体 — src: store-map-setup.tsx:L747
- [x] PAR091 Header badge (secondary) 「{total}棟」 counting every cabinet — src: store-map-setup.tsx:L748-752
- [x] PAR092 Section 未配置 first, then 配置済み, both sorted by symbol — src: store-map-setup.tsx:L532-534, L757-783
- [x] PAR093 未配置 heading with count: warning-toned outline badge when > 0, plain number when 0 — src: store-map-setup.tsx:L759-768
- [x] PAR094 未配置 empty → 「すべて配置済みです」 (muted, small) — src: store-map-setup.tsx:L769-773
- [x] PAR095 配置済み heading with a plain count — src: store-map-setup.tsx:L778-781
- [x] PAR096 配置済み with zero cabinets renders the heading and 0 only, with no empty text — src: store-map-setup.tsx:L777-783

## Locker rows

- [x] PAR100 Row: 24px symbol chip (border, semibold); chip filled primary when selected — src: store-map-setup.tsx:L101-112, L160
- [x] PAR101 Row name, truncated — src: store-map-setup.tsx:L163
- [x] PAR102 Row shape label beneath the name (muted, small) — src: store-map-setup.tsx:L189
- [x] PAR103 Row 未保存 indicator (warning dot + 未保存) beside the name when the position differs from the saved state — src: store-map-setup.tsx:L164-169
- [x] PAR104 Moving a cabinet back to its saved position removes its 未保存 indicator — src: store-map-setup.tsx:L82-86, L309-314
- [x] PAR105 Selected row highlighted (accent); hovered row muted; hover syncs with its marker — src: store-map-setup.tsx:L150-158
- [x] PAR106 Clicking a row selects its cabinet — src: store-map-setup.tsx:L156, L554
- [x] PAR107 Selected row shows link button 詳細 with an ExternalLink icon — src: store-map-setup.tsx:L170-183
- [x] PAR108 詳細 tooltip 「ロッカー詳細を別タブで開きます」 — src: store-map-setup.tsx:L185
- [x] PAR109 詳細 opens locker detail in a new browser tab; this screen keeps its draft with no dialog; it is shown to read-only users too — src: store-map-setup.tsx:L231-240
- [x] PAR110 Placed row whose image is absent shows 「画像がないため地図に表示できません」, and the row grows to fit — src: store-map-setup.tsx:L145, L153, L190-192
- [x] PAR111 Editors, unplaced row: 配置 button (outline, small, MapPin icon) — src: store-map-setup.tsx:L212-225
- [x] PAR112 配置 disabled with no draft image; reason 「フロア図の画像が未登録のため配置できません。先に画像を登録してください」 — src: store-map-setup.tsx:L216-217
- [x] PAR113 配置 puts the cabinet at the image centre, selects it, moves it to 配置済み, shows the placement hint — src: store-map-setup.tsx:L366-384
- [x] PAR114 配置 onto an occupied centre shifts diagonally by 0.04, up to 10 times — src: store-map-setup.tsx:L60-63, L371-380
- [x] PAR115 Editors, placed row: ghost icon button (X) aria-label 配置を外す, tooltip 配置を外す; returns the cabinet to 未配置 — src: store-map-setup.tsx:L195-211, L386-389
- [x] PAR116 Row buttons do not also select the row (click does not propagate) — src: store-map-setup.tsx:L176-177, L202-203, L218-219
- [x] PAR117 Read-only users: no 配置 / 配置を外す on any row — src: store-map-setup.tsx:L194

## Unsaved-changes bar and toasts

- [x] PAR120 Bar renders only for editors, never in the 全店舗 state, and only while the draft differs from the saved state — src: store-map-setup.tsx:L316, L794-796
- [x] PAR121 Bar is sticky to the bottom, top border, background fill — src: unsaved-changes-bar.tsx:L64
- [x] PAR122 Bar left side: warning dot + message — src: unsaved-changes-bar.tsx:L65-68
- [x] PAR123 Message 「未保存の変更があります（位置 N台）」 when only positions changed — src: store-map-setup.tsx:L317-321
- [x] PAR124 Message part 「フロア画像の登録」 / 「フロア画像の差し替え」 / 「フロア画像の削除」 matching the image change — src: store-map-setup.tsx:L92-98, L319
- [x] PAR125 Both parts joined with 「・」, position part first, e.g. 「未保存の変更があります（位置 2台・フロア画像の差し替え）」 — src: store-map-setup.tsx:L317-321
- [x] PAR126 Bar right side: 破棄 (ghost, small) then 変更を保存 (primary), in that order — src: unsaved-changes-bar.tsx:L69-77
- [x] PAR127 Toast 「ロッカーの位置を保存しました（N台）」 when only positions changed — src: store-map-setup.tsx:L347
- [x] PAR128 Toast 「フロア図を保存しました」 when only the image changed — src: store-map-setup.tsx:L346
- [x] PAR129 Toast 「フロア図とロッカーの位置を保存しました（N台）」 when image and positions changed — src: store-map-setup.tsx:L345
- [x] PAR130 After save: 未保存 indicators, the replace notice and the bar all clear — src: store-map-setup.tsx:L336-349
- [x] PAR131 破棄 reverts the draft without a dialog, clears selection and file error, toast 「変更を破棄しました」 — src: store-map-setup.tsx:L351-357

## Leave dialog

- [x] PAR140 Dirty draft + breadcrumb link → AlertDialog opens — src: store-map-setup.tsx:L581, L592, L805
- [x] PAR141 Dialog title 「変更を破棄しますか？」 — src: store-map-setup.tsx:L808
- [x] PAR142 Dialog body 「未保存の変更はすべて失われます。この操作は取り消せません。」 — src: store-map-setup.tsx:L809-811
- [x] PAR143 Dialog buttons 編集を続ける (cancel, keeps the draft) then 破棄する (confirm, navigates) — src: store-map-setup.tsx:L813-816
- [x] PAR144 Clean draft + breadcrumb link → navigates with no dialog — src: use-unsaved-changes.ts:L44-48
- [x] PAR145 Dirty draft + browser close or reload → the browser's own leave confirmation — src: use-unsaved-changes.ts:L33-42; store-map-setup.tsx:L326-328

## Role gating

- [x] PAR150 System and Headquarter: full edit controls on every store — src: store-map.ts:L52; store-map-setup.tsx:L247-248
- [x] PAR151 Staff on their own store: full edit controls — src: store-map.ts:L52
- [x] PAR152 Manager: read-only view (閲覧のみ, no file input, no dropzone, no row actions, no bar, markers fixed) — src: store-map-setup.tsx:L636-640, L671, L732, L794
- [x] PAR153 **Intentional divergence from V0**: Staff opening another store's map get an in-page permission wall, not the editable map. V0 grants every Staff edit on any store (`store-map.ts` L52). Spec FR-062, Y-02 L215 「○ 所属店舗」
- [x] PAR154 **Intentional divergence from V0**: Trainer and Observer cannot reach the screen (app access-denied answer), and no entry point is offered to them. V0 shows them the read-only view. Spec FR-061, Y-02 L207/L215
- [ ] PAR155 **Intentional divergence from V0** (Manager rule unchanged but enforced server-side too): a position or image write sent for a Manager, or for Staff on another store, is refused by the API layer and reported as "not permitted". Spec FR-064 — ⚠ Gap: UNVERIFIED-WRITE: confirming a server-side refusal means sending a real locker PATCH or store-details PUT as Manager, or as Staff on another store, to the shared backend. The rules forbid that. The UI gives Manager no write control (no bar, no file input), and Staff on another store get the in-page wall

## Entry points

- [x] PAR160 Store detail 店舗マップ tab: card titled 店舗マップ — src: store-detail.tsx:L2621-2624
- [ ] PAR161 Tab counts below the title when an image exists: 「配置済み N台」・ then 「未配置 N台」 as a warning badge when > 0 or plain 「未配置 0台」 — src: store-detail.tsx:L2626-2640 — ⚠ Gap: BLOCK(B4): the tab never gets an image. Even after a successful (intercepted) save on the map screen, navigating to ?tab=map shows 「フロア図が登録されていません」, so the 配置済み/未配置 counts never render (c15.js)
- [x] PAR162 Editors: tab header button 店舗マップ設定 (outline, small, Map icon) opens this screen for that store — src: store-detail.tsx:L532-539, L2641-2647
- [x] PAR163 Non-editors: tab header shows Lock + 閲覧のみ instead of the button — src: store-detail.tsx:L2648-2653
- [x] PAR164 Tab with no image: EmptyState 「フロア図が登録されていません」 with the button 「店舗マップ設定で登録する」 for editors only — src: store-detail.tsx:L2667-2680
- [ ] PAR165 After saving here, the tab shows the new map and counts without a reload — spec FR-048 (V0 shared store: store-map.ts:L81-106) — ⚠ Gap: BLOCK(B4): after saving (toast 「フロア図とロッカーの位置を保存しました（1台）」, lockers GET refetched twice), the store-detail 店舗マップ tab still shows the no-image EmptyState because the floor image is session-only. The new map and counts cannot appear
- [x] PAR166 Locker list: 店舗マップ設定 button (outline, Map icon) opens this screen — src: locker-list.tsx:L524-528
- [x] PAR167 Locker form: two 店舗マップ設定 links (floor-map preview, location help) open this screen through the locker form's discard guard — src: locker-form.tsx:L505-512, L598-605
- [x] PAR168 Opening this screen from E-01 still shows the 店舗管理 › {店舗名} › 店舗マップ設定 breadcrumb (place, not route) — src: store-map-setup.tsx:L569-571

## States with no V0 source (verify against spec.md)

- [x] PAR170 Loading state while the store's map is read; error state with retry when the read fails — spec FR-007
- [x] PAR171 Store in the address does not exist → error state, never an unnamed empty map — spec Edge Cases
- [x] PAR172 Partial save failure: succeeded parts become saved; failed image or named cabinets stay 未保存 and are reported; no success toast — spec FR-046
- [x] PAR173 A cabinet changed elsewhere since load → reported as changed by someone else; re-read shows its current position — spec FR-047
- [x] PAR174 Dirty draft + sidebar navigation or header store change (no store in the address) → same discard dialog. V0 guards only the breadcrumb — spec FR-052
- [x] PAR175 詳細 opens the selected cabinet's own locker detail, not a generic one (V0 passes no id, store-map-setup.tsx:L236-240) — spec FR-034
- [ ] PAR176 Saving a floor-plan image leaves every other store-page content field unchanged — spec FR-082, SC-008 — ⚠ Gap: BLOCK(B4): image save is session-only. An image-only save sent no request at all (no PUT …/details observed; only the toast 「フロア図を保存しました」), so the read-modify-write of store-page fields cannot be exercised
- [x] PAR177 Only the store's active cabinets are listed — spec FR-036
- [x] PAR178 None of the `c1c7e2e` elements render: floor tabs (1階 / 2階 / 地下1階), フロア設定 card (フロア名 / フロア画像 / 面積), header 保存 button, 配置済みロッカー / 未配置ロッカー tables — spec Out of Scope
