# UI Parity Checklist: Y-03 FC Company Master Management

**Purpose**: Verify the implemented screens reproduce every element and state of the V0 mockup.
**V0 Source**: `src/pages/fc-company-list.tsx`, `src/pages/fc-company-detail.tsx`, `src/pages/fc-company-form.tsx` @ dx-fitness/fitness-crm-ui `426a9b3` (as recorded in spec.md header)
**Re-sync 2026-09-24**: the real-API integration (`../integration-plan.md` §C) caught the UI up to prototype `0a73739` (2026-09-17). Items the newer prototype changed are struck through with their replacement; new items are PAR2xx at the end of the affected section. Verify against the 9/17 prototype, not the `426a9b3` line pointers, for those.

**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 attribute set, order, and copy.

**Two items (PAR087, PAR088) have no V0 line pointer** — they are attributes the PO spec (`Y-03` @ fitness-spec `b53dd30`) requires but that the older V0 prototype predates or contradicts. They carry a spec pointer instead and must still be built. See spec.md → Assumptions.

---

## List — Page shell & header (`fc-company-list.tsx`)

- [ ] PAR001 Sidebar highlights the FC company list entry as the current page — src: fc-company-list.tsx:L187
- [ ] PAR002 Page header rendered outside the scroll container, title `FC企業管理` — src: fc-company-list.tsx:L191-L193
- [ ] PAR003 Header shows the total record count next to the title — src: fc-company-list.tsx:L194
- [ ] PAR004 `新規登録` primary button with a plus icon, role-gated to `Headquarter` + `System`, navigates to the create form — src: fc-company-list.tsx:L196-L203
- [ ] PAR005 Main region scrolls independently of the page header — src: fc-company-list.tsx:L207

## List — Toolbar & filters (`fc-company-list.tsx`)

- [ ] PAR006 Search input with leading magnifier icon, placeholder `法人名で検索...`, max width 400px — src: fc-company-list.tsx:L213-L221
- [ ] PAR007 Typing in search resets pagination to page 1 — src: fc-company-list.tsx:L219
- [ ] PAR008 Search matches on both corporate name and FC company ID, case-insensitively — src: fc-company-list.tsx:L132-L135
- [ ] PAR009 Classification select, width 120px, options `全区分` / `直営` / `FC` / `業務委託` (業務委託 added per Y-03 A-2, user direction 2026-09-24), default `全区分` — src: fc-company-list.tsx:L224-L233
- [ ] PAR010 Status select, width 140px, options `全ステータス` / `有効` / `無効`, default `全ステータス` — src: fc-company-list.tsx:L234-L243
- [ ] PAR011 Both filters right-aligned in the toolbar row and always expanded (no collapse control, per the ≤2-filter convention) — src: fc-company-list.tsx:L222-L244
- [ ] PAR012 A filter whose value differs from its default is visually marked active (primary border + tinted background) — src: fc-company-list.tsx:L98-L102, L225, L235
- [ ] PAR013 Changing either filter resets pagination to page 1 — src: fc-company-list.tsx:L224, L234

## List — Filter result banner (`fc-company-list.tsx`)

- [ ] PAR014 Banner appears only when a filter is active or the search box is non-empty — src: fc-company-list.tsx:L248-L249
- [ ] PAR015 Banner reports matched count against total count — src: fc-company-list.tsx:L250-L251
- [ ] PAR016 Banner summary lists active conditions joined by `・`: quoted search text, `区分: <value>`, `ステータス: <value>` — src: fc-company-list.tsx:L170-L176
- [ ] PAR017 Banner clear action resets search text, both filters, and page number — src: fc-company-list.tsx:L178-L183, L253

## List — Table (`fc-company-list.tsx`)

- [ ] PAR018 Table horizontally scrolls inside its own container — src: fc-company-list.tsx:L257
- [ ] PAR019 Header row is sticky and tinted (`bg-muted/50`) — src: fc-company-list.tsx:L260
- [ ] PAR020 Column order is exactly: FC企業ID → 法人名（表示名） → 直営/FC区分 → 管轄店舗数 → ステータス → row-action — src: fc-company-list.tsx:L261-L290
- [ ] PAR021 `FC企業ID` header is a sort control with an up/down arrow icon that gains contrast on hover — src: fc-company-list.tsx:L261-L273
- [ ] PAR022 `FC企業ID` header tooltip reads `クリックで降順ソート` on top side — src: fc-company-list.tsx:L270
- [ ] PAR023 `法人名（表示名）` header is a sort control with the same arrow icon and hover behaviour, min width 280px — src: fc-company-list.tsx:L274-L286
- [ ] PAR024 `法人名（表示名）` header tooltip reads `クリックで降順ソート` — src: fc-company-list.tsx:L283
- [ ] PAR025 `直営/FC区分` header is plain text, width 120px — src: fc-company-list.tsx:L287
- [ ] PAR026 `管轄店舗数` header is plain text, right-aligned, width 120px — src: fc-company-list.tsx:L288
- [ ] PAR027 `ステータス` header is plain text, width 100px — src: fc-company-list.tsx:L289
- [ ] PAR028 Row-action header cell is empty, width 10 — src: fc-company-list.tsx:L290
- [ ] PAR029 ID cell renders in muted foreground — src: fc-company-list.tsx:L315
- [ ] PAR030 Corporate name cell renders medium weight — src: fc-company-list.tsx:L316
- [ ] PAR031 `直営` classification renders as a success-tinted outline badge labelled `直営` — src: fc-company-list.tsx:L318-L319
- [ ] PAR032 `FC` classification renders as a plain outline badge labelled `FC` — src: fc-company-list.tsx:L320-L321
- [ ] PAR033 Managed-store count cell is right-aligned with tabular numerals — src: fc-company-list.tsx:L324
- [ ] PAR034 Status `有効` renders as a success-tinted outline badge — src: fc-company-list.tsx:L104-L108, L326
- [ ] PAR035 Status `無効` renders as a muted outline badge — src: fc-company-list.tsx:L109-L110, L326
- [ ] PAR036 Row is pointer-cursored, highlights on hover, and navigates to the FC company detail screen on click — src: fc-company-list.tsx:L310-L314
- [ ] PAR037 Clicking inside the row-action cell does NOT trigger row navigation — src: fc-company-list.tsx:L328

## List — Row action menu (`fc-company-list.tsx`)

- [ ] PAR038 Trigger is a 32px ghost square with a horizontal-ellipsis icon that highlights on hover — src: fc-company-list.tsx:L330-L332
- [ ] PAR039 Menu is end-aligned — src: fc-company-list.tsx:L333
- [ ] PAR040 `編集` item with pencil icon, role-gated to `Headquarter` + `System`, opens the form in edit mode — src: fc-company-list.tsx:L334-L339
- [ ] PAR041 Separator between edit and delete — src: fc-company-list.tsx:L340
- [ ] PAR042 When managed-store count > 0: a disabled two-line item — first line trash icon + `削除できません`, second line indented `管轄店舗が存在するため` in smaller muted text — which does not close the menu on select — src: fc-company-list.tsx:L341-L352
- [ ] PAR043 When managed-store count is 0: a destructive-coloured `削除` item with trash icon, role-gated to `Headquarter` + `System`, opens the delete confirmation — src: fc-company-list.tsx:L353-L360

## List — Empty states (`fc-company-list.tsx`)

- [ ] PAR044 Empty state occupies a single row spanning all 6 columns, centred — src: fc-company-list.tsx:L295-L296
- [ ] PAR045 `filtered` variant used when a filter or search is active; entity label `FC企業` — src: fc-company-list.tsx:L297-L299
- [ ] PAR046 `filtered` variant includes an outline `条件をクリア` action that clears all conditions — src: fc-company-list.tsx:L300-L303
- [ ] PAR047 `empty` variant used when no record exists at all, with NO clear-conditions action — src: fc-company-list.tsx:L298, L303

## List — Pagination footer (`fc-company-list.tsx`)

- [ ] PAR048 Footer is top-bordered with summary left, page navigation centre, page-size right — src: fc-company-list.tsx:L373
- [ ] PAR049 Summary copy reads `全 {total} 件 / {pages} ページ / {start}-{end} を表示` — src: fc-company-list.tsx:L374-L376
- [ ] PAR050 Previous control labelled `前へ` — src: fc-company-list.tsx:L382-L383
- [ ] PAR051 Next control labelled `次へ` — src: fc-company-list.tsx:L406-L407
- [ ] PAR052 Previous is non-interactive at 50% opacity on page 1; Next likewise on the last page — src: fc-company-list.tsx:L385, L409
- [ ] PAR053 Page number links render, with the current page marked active — src: fc-company-list.tsx:L394-L401
- [ ] PAR054 Ellipsis placeholders appear per the ≤7-pages / near-start / near-end / middle windowing rules — src: fc-company-list.tsx:L153-L158, L389-L392
- [ ] PAR055 Changing page scrolls the window smoothly to the top — src: fc-company-list.tsx:L165-L168
- [ ] ~~PAR056 `表示件数` label with a 72px select offering `25件` / `50件` / `100件` / `200件` — src: fc-company-list.tsx:L122, L416-L427~~ — **superseded by prototype `0a73739` (9/17)** → PAR201
- [ ] PAR057 Default page size is 50 — src: fc-company-list.tsx:L123
- [ ] PAR058 Changing page size returns to page 1 — src: fc-company-list.tsx:L160-L163
- [ ] PAR059 Current page is clamped to the last available page rather than rendering a blank table — src: fc-company-list.tsx:L147-L151
- [ ] PAR201 `表示件数` select offers `25件` / `50件` / `100件` only (default 50; API max 100) — src: fc-company-list.tsx (9/17) `PAGE_SIZE_OPTIONS`

## List — Delete confirmation dialog (`fc-company-list.tsx`)

- [ ] PAR060 Title `FC企業を削除しますか？` — src: fc-company-list.tsx:L439
- [ ] PAR061 Description reads `「{corporate name}」を削除します。変更履歴は保持されます。この操作は取り消せません。` with the targeted company's name interpolated — src: fc-company-list.tsx:L440-L442
- [ ] PAR062 Cancel action labelled `キャンセル`; confirm action labelled `削除する` in destructive colours — src: fc-company-list.tsx:L445-L451
- [ ] PAR063 Dismissing the dialog clears the delete target — src: fc-company-list.tsx:L436

---

## Form — Page shell & header (`fc-company-form.tsx`)

- [ ] PAR064 Sidebar highlights the FC company form entry as the current page — src: fc-company-form.tsx:L123
- [ ] PAR065 Title is `FC企業新規登録` in create mode and `FC企業編集` in edit mode — src: fc-company-form.tsx:L79, L134
- [ ] PAR066 Back link labelled `FC企業管理に戻る`, routed through the discard confirmation — src: fc-company-form.tsx:L128-L133
- [ ] PAR067 Content column is centred with a 960px max width and 24px section gaps — src: fc-company-form.tsx:L138
- [ ] PAR068 Every field renders label, optional description line, control, and an inline destructive error line below the control — src: fc-company-form.tsx:L41-L56
- [ ] PAR069 Required fields carry a required marker; explicitly optional fields carry an optional marker — src: fc-company-form.tsx:L45-L49

## Form — Section 1 法人基本情報 (`fc-company-form.tsx`)

- [ ] PAR070 Card titled `法人基本情報` — src: fc-company-form.tsx:L142
- [ ] PAR071 `法人名（正式名称）` — required, full width, placeholder `例: 株式会社フィットネスパートナーズ` — src: fc-company-form.tsx:L146-L152
- [ ] PAR072 `法人名（正式名称）` sets an invalid-state marker on the control when in error — src: fc-company-form.tsx:L151
- [ ] PAR073 `法人名（表示名）` — optional, description `CRM内の一覧等で表示される省略形`, placeholder `例: フィットネスパートナーズ` — src: fc-company-form.tsx:L154-L156
- [ ] PAR074 `直営/FC区分` and `法人番号` share a 2-column grid row — src: fc-company-form.tsx:L157-L173
- [ ] PAR075 `直営/FC区分` — required select, placeholder `選択してください`, options `直営`, `フランチャイズ（FC）` and `業務委託` (業務委託 added per Y-03 A-2, user direction 2026-09-24) — src: fc-company-form.tsx:L158-L169
- [ ] PAR076 `法人番号` — optional, placeholder `例: 1234567890123` — src: fc-company-form.tsx:L170-L172
- [ ] ~~PAR077 `直営店フラグ` — checkbox with clickable label, plus trailing muted note `旧システムとの互換性のために保持` — src: fc-company-form.tsx:L175-L181~~ — **superseded by the 2026-10-01 clarification** (spec.md Session 2026-10-01): the checkbox is read-only and follows 直営/FC区分; the note keeps `旧システムとの互換性のために保持`
- [ ] PAR078 `代表者名` — optional, placeholder `例: 山田 太郎` — src: fc-company-form.tsx:L182-L184
- [ ] PAR079 `本社所在地` — optional, placeholder `例: 福岡県福岡市中央区天神1-1-1` — src: fc-company-form.tsx:L185-L187
- [ ] PAR080 `電話番号` — optional, max width 240px, placeholder `例: 092-000-0000` — src: fc-company-form.tsx:L188-L190

## Form — Section 2 担当者情報 (`fc-company-form.tsx`)

- [ ] PAR081 Card titled `担当者情報` — src: fc-company-form.tsx:L198
- [ ] PAR082 `担当者名` — optional, max width 320px, placeholder `例: 佐藤 花子` — src: fc-company-form.tsx:L202-L204
- [ ] ~~PAR083 `担当者連絡先` — optional, max width 240px, placeholder `例: 092-000-0001` — src: fc-company-form.tsx:L205-L207~~ — **superseded by prototype `0a73739` (9/17)** → PAR202, PAR203
- [ ] PAR202 `担当者メールアドレス` — optional (`任意`), email input, max width 320px, placeholder `例: sato@example.co.jp` — src: fc-company-form.tsx (9/17), Y-03 FR-002 v4
- [ ] PAR203 `担当者電話番号` — optional (`任意`), max width 320px, placeholder `例: 092-000-0001` — src: fc-company-form.tsx (9/17), Y-03 FR-002 v4

## Form — Section 3 契約情報 (`fc-company-form.tsx`)

- [ ] PAR084 Card titled `契約情報` — src: fc-company-form.tsx:L215
- [ ] PAR085 `FC契約開始日` and `FC契約更新日` share a 2-column grid row, each a date picker with placeholder `日付を選択` — src: fc-company-form.tsx:L219-L234
- [ ] ~~PAR086 `ロイヤリティ率(%)` — numeric input, max width 160px, placeholder `例: 5.0`, description `計算ロジックは次フェーズで提供予定。現時点は参考値のみ` — src: fc-company-form.tsx:L235-L239~~ — **superseded by prototype `0a73739` (9/17)** → PAR204
- [ ] PAR087 `ロイヤリティ率(%)` is present in the **Phase 1** view (deliberate deviation: V0 gates it behind Phase 2 at fc-company-form.tsx:L235; PO spec Y-03 補足「ロイヤリティ率の入力可否」places it on the Phase 1 form) — src: Y-03.md 補足: UI設計方針
- [ ] PAR204 `ロイヤリティ率(%)` always shown, `任意`, description `参考値として入力できます。計算ロジックは次フェーズで提供予定`; `FC契約更新日` description `次回の契約更新予定日`; renewal before start blocks save with `FC契約更新日はFC契約開始日以降の日付を指定してください` (field + footer) — src: fc-company-form.tsx (9/17)
- [ ] PAR209 Every optional field carries the `任意` marker (表示名, 法人番号, 代表者名, 本社所在地, 電話番号, 担当者×3, 契約日×2, ロイヤリティ率, 備考) — src: fc-company-form.tsx (9/17)

## Form — Authentication method (PO-spec addition, absent from V0)

- [ ] PAR088 `認証方式` — required select with exactly two options `Google SSO` and `IDaaS`, placeholder `選択してください`, blocking submission while unselected, placed in the 法人基本情報 card following the existing field pattern — src: Y-03.md FR-002「認証方式（セレクト・必須）」

## Form — Section 4 備考 (`fc-company-form.tsx`)

- [ ] PAR089 Card titled `備考` — src: fc-company-form.tsx:L247
- [ ] PAR090 `備考` textarea, min height 100px, placeholder `補足事項があれば入力してください` — src: fc-company-form.tsx:L250-L257

## Form — Section 5 ステータス (`fc-company-form.tsx`)

- [ ] ~~PAR091 Card titled `ステータス` — src: fc-company-form.tsx:L264~~ — **superseded by prototype `0a73739` (9/17)** → PAR205
- [ ] ~~PAR092 Row shows label `FC企業の有効/無効` with description `有効にすると、店舗との紐づけ候補に表示されます` on the left — src: fc-company-form.tsx:L268-L271~~ — **superseded by prototype `0a73739` (9/17)** → PAR205
- [ ] ~~PAR093 Right side shows muted `無効` text, a switch, then medium-weight `有効` text — src: fc-company-form.tsx:L272-L276~~ — **superseded by prototype `0a73739` (9/17)** → PAR205
- [ ] ~~PAR094 Switch defaults to on (active) in create mode — src: fc-company-form.tsx:L87~~ — **superseded by prototype `0a73739` (9/17)** → PAR205
- [ ] PAR205 The form has **no** ステータス card; status is changed only from the detail status card (new companies are created 有効) — src: fc-company-form.tsx (9/17) L311 comment

## Form — Validation & submission (`fc-company-form.tsx`)

- [ ] PAR095 Missing `法人名（正式名称）` shows inline error `法人名（正式名称）を入力してください` — src: fc-company-form.tsx:L96
- [ ] PAR096 Missing `直営/FC区分` shows inline error `直営/FC区分を選択してください` — src: fc-company-form.tsx:L97
- [ ] PAR097 Blocked submission shows form-level destructive message `未入力の項目があります` left-aligned in the footer — src: fc-company-form.tsx:L283-L285
- [ ] PAR098 Blocked submission smoothly scrolls the first invalid control into the centre of the view — src: fc-company-form.tsx:L106-L109
- [ ] PAR099 A field's error clears as soon as a valid value is entered, without re-submitting — src: fc-company-form.tsx:L150, L159
- [ ] PAR100 Footer is top-bordered, actions right-aligned: large outline `キャンセル`, then large primary `登録する` (create) / `保存する` (edit) — src: fc-company-form.tsx:L282-L288
- [ ] PAR101 Successful submit shows toast `FC企業を登録しました` (create) or `FC企業の変更を保存しました` (edit) and returns to the list — src: fc-company-form.tsx:L115-L116
- [ ] PAR102 Any field edit marks the form dirty — src: fc-company-form.tsx:L119
- [ ] PAR103 Successful submit clears the dirty state before navigating (no discard prompt fires) — src: fc-company-form.tsx:L114
- [ ] PAR104 Edit mode pre-fills every control from the stored record — src: fc-company-form.tsx:L59-L88
- [ ] ~~PAR105 Create mode leaves every control empty except the status switch — src: fc-company-form.tsx:L82-L87~~ — **superseded by prototype `0a73739` (9/17)** → PAR206
- [ ] PAR206 Create mode leaves every control empty (no status control exists) — src: fc-company-form.tsx (9/17)

## Form — Discard-changes dialog (`fc-company-form.tsx`)

- [ ] PAR106 Cancel or back-link with a dirty form opens the discard dialog; a clean form navigates straight away — src: fc-company-form.tsx:L131, L286
- [ ] PAR107 Title `変更を破棄しますか？` — src: fc-company-form.tsx:L297
- [ ] PAR108 Description `未保存の変更はすべて失われます。この操作は取り消せません。` — src: fc-company-form.tsx:L298-L300
- [ ] PAR109 Cancel action labelled `編集を続ける`; confirm action labelled `破棄する` — src: fc-company-form.tsx:L303-L304

---

## Detail — Page header (`fc-company-detail.tsx`)

- [ ] PAR110 Sidebar highlights the FC company detail entry as the current page — src: fc-company-detail.tsx:L172
- [ ] PAR111 Back link labelled `FC企業管理に戻る`, returning to the list — src: fc-company-detail.tsx:L178-L183
- [ ] PAR112 Title is the corporate **display** name (not the formal name) — src: fc-company-detail.tsx:L184
- [ ] PAR113 Status badge with a leading dot: success-tinted with a success dot when `有効`, muted with a muted dot when `無効` — src: fc-company-detail.tsx:L187-L197
- [ ] PAR114 Classification badge: success-tinted `直営` or plain outline `FC`, rendered after the status badge — src: fc-company-detail.tsx:L198-L202
- [ ] ~~PAR115 When status is `有効`: small outline `無効化` button with a ban icon in warning colour, role-gated to `Headquarter` + `System`, opens the disable confirmation — src: fc-company-detail.tsx:L208-L218~~ — **superseded by prototype `0a73739` (9/17)** → PAR207
- [ ] ~~PAR116 When status is `無効`: small outline `有効化` button with a check-circle icon, role-gated, activating immediately with toast `「{name}」を有効化しました` — src: fc-company-detail.tsx:L219-L232~~ — **superseded by prototype `0a73739` (9/17)** → PAR207
- [ ] PAR117 When the company has ≥1 managed store: `削除` button rendered disabled at 60% opacity with a not-allowed cursor, wrapped in a tooltip — src: fc-company-detail.tsx:L235-L248
- [ ] PAR118 That tooltip reads `管轄店舗が存在するため削除できません` on the bottom side — src: fc-company-detail.tsx:L249-L251
- [ ] PAR119 When the company has 0 managed stores: `削除` becomes an enabled destructive-coloured outline button, role-gated, opening the delete confirmation — src: fc-company-detail.tsx:L254-L265
- [ ] PAR120 The delete affordance flips from disabled to enabled as soon as the last store is released, without a reload — src: fc-company-detail.tsx:L133, L164
- [ ] PAR121 `編集` outline button with pencil icon, role-gated, opens the form in edit mode — src: fc-company-detail.tsx:L266-L275
- [ ] ~~PAR122 Action order in the header is: deactivate/activate → delete → edit — src: fc-company-detail.tsx:L206-L276~~ — **superseded by prototype `0a73739` (9/17)** → PAR208
- [ ] PAR207 無効化 / 有効化 live in the status summary card's action slot (full-width outline button: `無効化` warning with ban icon / `有効化` with check icon), both opening a confirmation dialog; the disable dialog has an optional `無効化理由` textarea — src: fc-company-detail.tsx (9/17) StatusCard `action`, Disable/Enable dialogs
- [ ] PAR208 Header actions are, in order: `削除` (outline, destructive; disabled + tooltip when stores exist) → `編集` — src: fc-company-detail.tsx (9/17) `actions`

## Detail — Tab bar (`fc-company-detail.tsx`)

- [ ] PAR123 Line-variant tab bar defaulting to 基本情報 — src: fc-company-detail.tsx:L281-L282
- [ ] PAR124 Tab order is `基本情報` → `管轄店舗` → [`集計` only in the Phase 2 view] → `変更履歴` — src: fc-company-detail.tsx:L283-L289
- [ ] PAR125 In the Phase 1 view the `集計` tab is absent entirely (not merely disabled) — src: fc-company-detail.tsx:L286-L288

## Detail — 基本情報 tab layout (`fc-company-detail.tsx`)

- [ ] PAR126 Two-column layout: 60% content column left, 40% summary column right, 16px gap — src: fc-company-detail.tsx:L293-L295, L390
- [ ] PAR127 Right column content is sticky to the top of the scroll area — src: fc-company-detail.tsx:L391

## Detail — 法人基本情報 card (`fc-company-detail.tsx`)

- [ ] PAR128 Card titled `法人基本情報`, attributes in a 2-column grid — src: fc-company-detail.tsx:L298, L301
- [ ] PAR129 Attribute order: FC企業ID → 法人番号 → 法人名（正式名称） → 法人名（表示名） → 代表者名 → 電話番号 → 本社所在地 — src: fc-company-detail.tsx:L302-L329
- [ ] PAR130 Each attribute renders a small muted label above its value — src: fc-company-detail.tsx:L303-L304
- [ ] PAR131 `法人名（正式名称）` value renders medium weight — src: fc-company-detail.tsx:L312
- [ ] PAR132 `本社所在地` spans both grid columns — src: fc-company-detail.tsx:L326

## Detail — 担当者情報 card (`fc-company-detail.tsx`)

- [ ] PAR133 Card titled `担当者情報`, 2-column grid — src: fc-company-detail.tsx:L336, L339
- [ ] PAR134 Attributes `担当者名` then `担当者連絡先` — src: fc-company-detail.tsx:L340-L347

## Detail — 契約情報 card (`fc-company-detail.tsx`)

- [ ] PAR135 Card titled `契約情報`, 2-column grid — src: fc-company-detail.tsx:L354, L357
- [ ] PAR136 Attribute order: FC契約開始日 → FC契約更新日 → ロイヤリティ率 — src: fc-company-detail.tsx:L358-L369
- [ ] PAR137 Royalty rate renders as `{value}%` when set, and as `—` when unset — src: fc-company-detail.tsx:L368

## Detail — 備考 card (`fc-company-detail.tsx`)

- [ ] PAR138 Card titled `備考` — src: fc-company-detail.tsx:L377
- [ ] PAR139 Remarks text preserves line breaks as entered — src: fc-company-detail.tsx:L381
- [ ] PAR140 Empty remarks render a muted `—` — src: fc-company-detail.tsx:L382-L384

## Detail — Status summary card (`fc-company-detail.tsx`)

- [ ] PAR141 Summary card tone is success when `有効` and muted when `無効` — src: fc-company-detail.tsx:L393
- [ ] PAR142 Summary card uses a building icon and labels itself with the current status text — src: fc-company-detail.tsx:L394-L395
- [ ] PAR143 Meta lines in order: `管轄店舗数: {n}店舗` → `作成日: {timestamp}` → `更新日: {timestamp}` — src: fc-company-detail.tsx:L396-L400
- [ ] PAR144 `管轄店舗数` in the summary reflects live link/unlink changes — src: fc-company-detail.tsx:L397

## Detail — 管轄店舗 tab (`fc-company-detail.tsx`)

- [ ] PAR145 Helper line above the table: `店舗の紐づけ・解除は本部が設定できます。変更は変更履歴に記録されます。` — src: fc-company-detail.tsx:L411
- [ ] PAR146 `店舗を紐づけ` small primary button with plus icon, right-aligned, role-gated to `Headquarter` + `System` — src: fc-company-detail.tsx:L412-L421
- [ ] PAR147 That button's deny tooltip reads `店舗紐づけの設定には本部権限が必要です` — src: fc-company-detail.tsx:L415
- [ ] PAR148 Store table column order: 店舗ID → 店舗名 → ブランド → 都道府県 → ステータス → (link-out icon) → (release action) — src: fc-company-detail.tsx:L428-L434
- [ ] PAR149 Store ID cell muted; store name cell medium weight — src: fc-company-detail.tsx:L455-L456
- [ ] PAR150 Brand renders as a brand badge (JOYFIT / JOYFIT24 / JOYFIT YOGA / JOYFIT+ / FIT365) — src: fc-company-detail.tsx:L85, L457-L459
- [ ] PAR151 Store status renders as a success-tinted outline badge — src: fc-company-detail.tsx:L461-L465
- [ ] PAR152 A small muted external-link icon occupies its own column — src: fc-company-detail.tsx:L466-L468
- [ ] PAR153 Store row is pointer-cursored, hover-highlighted, and navigates to that store's detail screen — src: fc-company-detail.tsx:L450-L454
- [ ] PAR154 `解除` ghost button with an unlink icon in the last column, role-gated with the same deny tooltip, and clicking it does NOT trigger row navigation — src: fc-company-detail.tsx:L469-L481
- [ ] PAR155 Empty state spans all 7 columns, entity label `管轄店舗`, description `「店舗を紐づけ」からこのFC企業の管轄店舗を追加できます` — src: fc-company-detail.tsx:L438-L447
- [ ] PAR156 Table footer is top-bordered and reads `全 {n} 件` — src: fc-company-detail.tsx:L488-L490
- [ ] PAR210 `店舗を紐づけ` is disabled with tooltip `無効のFC企業には店舗を紐づけできません。有効化してから追加してください` while the company is 無効 (permission denial wins for non-HQ) — src: fc-company-detail.tsx (9/17)
- [ ] PAR211 Store status badge: 閉店 is muted (not success) — src: fc-company-detail.tsx (9/17) `getStoreStatusBadgeClass`
- [ ] PAR212 Link dialog rows show `{店舗ID}・{都道府県}` and `現在: {operator | 直営}`; linking a store of another company opens `運営企業を付け替えますか？` with action `付け替えて紐づける` — src: fc-company-detail.tsx (9/17). Deviation: a server-side search box is kept above the list (the real store master exceeds one API page)

## Detail — Link-store dialog (`fc-company-detail.tsx`)

- [ ] PAR157 Dialog title `店舗を紐づけ` — src: fc-company-detail.tsx:L593
- [ ] PAR158 Dialog description `このFC企業の管轄に追加する店舗を選択します。紐づけの変更は変更履歴に記録されます。` — src: fc-company-detail.tsx:L594-L596
- [ ] PAR159 Candidate list excludes stores already linked to this company, and a released store returns to the candidate list — src: fc-company-detail.tsx:L136-L138
- [ ] PAR160 Each candidate row shows the store name on the first line and `{store ID}・{prefecture}` on a second muted line — src: fc-company-detail.tsx:L604-L607
- [ ] PAR161 Each candidate row shows a brand badge and a small outline `紐づけ` button, rows separated by dividers — src: fc-company-detail.tsx:L601-L611
- [ ] PAR162 With no candidates left, the dialog body reads `紐づけ可能な店舗がありません` centred and muted instead of an empty list — src: fc-company-detail.tsx:L598-L599
- [ ] PAR163 Linking a store immediately adds it to the managed-store table and shows toast `「{store name}」を管轄店舗に紐づけました` — src: fc-company-detail.tsx:L156-L160
- [ ] PAR164 Linking a store appends change-history entry `店舗紐づけ追加: {store name}` — src: fc-company-detail.tsx:L158

## Detail — Unlink confirmation dialog (`fc-company-detail.tsx`)

- [ ] PAR165 Title `店舗の紐づけを解除しますか？` — src: fc-company-detail.tsx:L628
- [ ] PAR166 Description `「{store name}」をこのFC企業の管轄から外します。店舗自体は削除されません。変更は変更履歴に記録されます。` — src: fc-company-detail.tsx:L629-L631
- [ ] PAR167 Cancel labelled `キャンセル`; confirm labelled `解除する` — src: fc-company-detail.tsx:L634-L635
- [ ] PAR168 Confirming removes the store from the table and shows toast `「{store name}」の紐づけを解除しました` — src: fc-company-detail.tsx:L162-L167
- [ ] PAR169 Confirming appends change-history entry `店舗紐づけ解除: {store name}` — src: fc-company-detail.tsx:L165
- [ ] PAR170 Dismissing the dialog clears the unlink target and leaves the link intact — src: fc-company-detail.tsx:L620-L624

## Detail — 集計 tab, Phase 2 view only (`fc-company-detail.tsx`)

- [ ] PAR171 Two stacked cards, KPI summary first then sales aggregation — src: fc-company-detail.tsx:L500-L533
- [ ] PAR172 First card titled `KPI集計・店舗サマリー` with a muted outline badge `次フェーズ実装予定` on the same header row — src: fc-company-detail.tsx:L503-L506
- [ ] PAR173 First card body is an empty state with a bar-chart icon, title `FC企業別KPI集計・店舗サマリーは次フェーズで実装予定です`, description `管轄店舗の売上・会員・入退館ログを集計して表示します` — src: fc-company-detail.tsx:L509-L514
- [ ] PAR174 Second card titled `売上集計` with the same `次フェーズ実装予定` badge — src: fc-company-detail.tsx:L519-L521
- [ ] PAR175 Second card body is an empty state with a bar-chart icon, title `FC企業別売上集計は次フェーズで実装予定です`, description `この企業に紐づく店舗の売上を集計表示します` — src: fc-company-detail.tsx:L525-L530
- [ ] PAR176 Neither card displays any figure, chart or number — src: fc-company-detail.tsx:L508-L531

## Detail — 変更履歴 tab (`fc-company-detail.tsx`)

- [ ] PAR177 Table column order and widths: `日時` (160px) → `操作者` (200px) → `変更内容` (fills) — src: fc-company-detail.tsx:L541-L545
- [ ] PAR178 Timestamp cell small and muted; operator cell normal; change-description cell muted — src: fc-company-detail.tsx:L550-L552
- [ ] PAR179 Entries listed newest-first, with newly recorded changes prepended — src: fc-company-detail.tsx:L145-L153
- [ ] PAR180 Operator is recorded with role in parentheses, e.g. `田中 太郎（本部管理者）` — src: fc-company-detail.tsx:L103, L149
- [ ] PAR181 Attribute changes are described as a before/after difference, e.g. `担当者変更: 鈴木 一郎 → 佐藤 花子` and `FC契約更新日: 2024/04/01 → 2025/04/01` — src: fc-company-detail.tsx:L104-L112
- [ ] PAR182 Initial registration is recorded as `FC企業登録: {formal name}` by operator `システム（初期登録）` — src: fc-company-detail.tsx:L113-L118
- [ ] PAR183 Table footer is top-bordered and reads `全 {n} 件` — src: fc-company-detail.tsx:L557-L559

## Detail — Deactivate confirmation dialog (`fc-company-detail.tsx`)

- [ ] PAR184 Title `FC企業を無効にしますか？` — src: fc-company-detail.tsx:L569
- [ ] PAR185 Description `「{display name}」のステータスを無効に変更します。変更履歴は保持され、後から再度有効化できます。` — src: fc-company-detail.tsx:L570-L572
- [ ] PAR186 Cancel labelled `キャンセル`; confirm labelled `無効にする` — src: fc-company-detail.tsx:L575-L583
- [ ] PAR187 Confirming sets status to `無効`, closes the dialog, and shows toast `「{display name}」を無効化しました` — src: fc-company-detail.tsx:L577-L581
- [ ] PAR188 The status change is reflected in the header badge and the status summary card without a reload — src: fc-company-detail.tsx:L190, L393-L395

## Detail — Delete confirmation dialog (`fc-company-detail.tsx`)

- [ ] PAR189 Title `FC企業を削除しますか？` — src: fc-company-detail.tsx:L644
- [ ] PAR190 Description `「{display name}」を論理削除します。変更履歴は保持されます。` — src: fc-company-detail.tsx:L645-L647
- [ ] PAR191 Cancel labelled `キャンセル`; confirm labelled `削除する` in destructive colours — src: fc-company-detail.tsx:L650-L651
