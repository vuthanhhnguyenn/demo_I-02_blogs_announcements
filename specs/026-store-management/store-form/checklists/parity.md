# UI Parity Checklist: Store Master Registration & Edit Form (Y-02 FR-002)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` → `src/pages/store-form.tsx` @ `47423ec` (2026-09-30), 609 lines; plus `src/components/territory-combobox.tsx` (TerritoryCascadeSelect), `src/components/field-marker.tsx`, `src/hooks/use-unsaved-changes.ts`. Originally `b223fef` (2026-08-13, 484 lines).

> **2026-10-02 prototype sync** (spec Session 2026-10-02, F1–F13): items changed by `6bc1f1c` / `a7d0c88` / `1767864` / `3a6c29b` are **re-opened** (`[ ]`) and rewritten, new items are added unticked (PAR020c, PAR024a, PAR028a, PAR045a–PAR045e, PAR068a–PAR068c, PAR099a), and PAR045–PAR058 (searchable combobox) are withdrawn. PAR020 / PAR020b / PAR121 are no longer divergences — V0 now carries the client's answers. `src:` lines on untouched items still point at `b223fef`.
> **Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

> **Implementation status (2026-09-03)**: the screen has been built to this checklist — the form now lives in `src/app/(private)/stores/_components/store-form.tsx` with `store-form-shell.tsx`, `_utils/store-form.util.ts` and the two pages. The boxes stay unticked on purpose: ticking is QA's pass, done against the running screen. The controls the repo used to render and V0 has no source for (status select, is-FC toggle, 会計コード, メールアドレス, 店舗画像 card, ソーシャル card, rough-area select) were **removed** per Q2 — this checklist does not cover them, and their absence is itself verifiable via PAR160.

> All three clarifications are resolved (2026-09-03). **Q1 (resolved 2026-09-03, superseded 2026-09-04 by the client's own answer)** — 店舗コード IS editable in edit mode for System / Headquarter (PAR020a), but its helper text is now the client-mandated **warning** rather than the prototype's prohibition line, and a changed code must be confirmed: PAR020 and PAR020b were V0 divergences until `a7d0c88` (2026-09-16) brought the client's copy into V0 — now plain parity (spec FR-012, FR-061a, FR-061b, Clarifications → Session 2026-09-04). **Q2 (resolved 2026-09-03)** — the store-page content and image controls are REMOVED from this form; no items here, and the repo's existing 店舗画像 / ソーシャル cards, 会計コード and メールアドレス must be gone from the built screen (spec FR-051). **Q3 (resolved 2026-09-03)** — three opening dates are built: PAR060 covers the V0 開店日, and PAR062/PAR063 cover the two spec-governed additions that have no V0 source.

## Page shell

- [x] PAR001 Sidebar highlights the store entry as the current page — src: store-form.tsx:L237
- [x] PAR002 Shared app header renders above the page header — src: store-form.tsx:L239
- [x] PAR003 Main content scrolls independently; the page header sits outside the scroll region — src: store-form.tsx:L238, L241-242, L249
- [x] PAR004 Back link labelled 店舗管理に戻る returning to the store list — src: store-form.tsx:L243-245
- [x] PAR005 Page title 店舗新規登録 in create mode — src: store-form.tsx:L136, L246
- [x] PAR006 Page title 店舗編集 in edit mode — src: store-form.tsx:L136, L246
- [x] PAR007 Body is a single centred column capped at 960px with 24px gaps between cards — src: store-form.tsx:L251
- [x] PAR008 Exactly three cards, in this order: 基本情報, 店舗写真 (dev-added, no V0 source — PAR170+), 備考 — src: store-form.tsx:L253-255, L436-438 (V0 has two)

## Permission wall (Manager / Trainer / Observer; Staff on create)

- [x] PAR010 Wall replaces the whole form — no cards, no footer buttons — src: store-form.tsx:L206-233
- [x] PAR011 Page title and back link still render above the wall — src: store-form.tsx:L212-218
- [x] PAR012 Back link on the wall does NOT prompt to discard — src: store-form.tsx:L215
- [x] PAR013 Shield icon, size 40, muted tone, centred — src: store-form.tsx:L221
- [x] PAR014 Heading アクセス権限がありません — src: store-form.tsx:L222
- [x] PAR015 Create-mode line, verbatim: 店舗の新規登録は本部・System 権限のみ操作できます。 — src: store-form.tsx:L225
- [x] PAR016 Edit-mode line, verbatim: 店舗情報の編集は本部・System 権限、または所属店舗のスタッフのみ操作できます。 — src: store-form.tsx:L226
- [x] PAR017 Content block is centred vertically and horizontally, max-width md, text centred — src: store-form.tsx:L219-220

## Field frame (applies to every field below)

- [x] PAR018 Each field renders label, then optional helper line, then control, then optional error line — src: store-form.tsx:L60-87
- [x] PAR019 Required mark is a red `*` immediately after the label; every non-required field carries the **任意** chip (muted filled chip) instead — required and 任意 are mutually exclusive (`6bc1f1c`; supersedes "the 任意 chip never appears") — src: field-marker.tsx:L13-L25, store-form.tsx:L65-L72

## 基本情報 card

- [x] PAR020 店舗コード — text input, required mark, placeholder 例: TK-001, width capped at 240px; helper create: 業務用コード。ロッカー・機器・商材など他機能から参照されるため、登録後の変更は影響範囲に注意 / edit: 業務用コード。ロッカー・機器・商材など他機能から参照されているため、変更すると影響範囲が大きくなります (V0 now carries the client's warning — no divergence) — src: store-form.tsx:L297-L317 (`a7d0c88`)
- [x] PAR020a 店舗コード stays editable in edit mode for System / Headquarter (spec FR-061a) — src: store-form.tsx:L266
- [x] PAR020b Saving a **changed** 店舗コード in edit mode first opens a confirmation dialog titled 店舗コードを {旧コード} から {新コード} に変更しますか？, body 店舗コードはロッカー・機器・商材など他機能から参照されています。変更すると影響範囲が大きくなります。, buttons キャンセル / 変更して保存する; proceeds only on 変更して保存する; cancelling keeps the typed value and the dirty state — src: store-form.tsx:L225-L235, L576-L590 (`a7d0c88`)
- [x] PAR020c Edit mode: while the typed code differs from the loaded one, a warning alert (warning tint, triangle icon) renders directly under the input: 店舗コードはロッカー・機器・商材など他機能から参照されています。変更すると影響範囲が大きくなります。 — hidden again when the value is restored — src: store-form.tsx:L308-L315 (`a7d0c88`)
- [x] PAR021 店舗名 — text input, required mark, placeholder 例: JOYFIT24新宿店, full width — src: store-form.tsx:L269-276
- [x] PAR022 店舗名（カナ）— text input, **任意 chip** (`6bc1f1c`), placeholder 例: ジョイフィット24シンジュクテン — src: store-form.tsx:L277-280
- [x] PAR023 ブランド and サブブランド sit side by side in a two-column row — src: store-form.tsx:L281, L307
- [x] PAR024 ブランド — select, required mark, helper JOYFIT の場合はサブブランドを併せて選択, empty state 選択してください — src: store-form.tsx:L282-292
- [ ] PAR024a Edit mode, store status ≠ 準備中: ブランド and サブブランド are disabled with tooltip 営業中の店舗ではブランドを変更できません（開業準備中のみ変更可）; for a restricted Staff user the Staff lock tooltip wins — src: store-form.tsx:L166-L168, L333-L334 (`a7d0c88`) — ⚠ Gap: BLOCK(env-account): the Staff test account (lodu4289+staff) is provisioned as 正社員スタッフ, not 店舗責任者, and /crm/me returns can_edit_store_basic_info=false and can_edit_store_photo=false. On its own store KN-001 (…0203) both 編集 buttons are disabled with tooltip この操作は職位に許可されていません, and /stores/…0203/edit redirects to /403. Restricted-Staff mode cannot be reached. The HQ half is OK: an 営業中 store's ブランド/サブブランド are disabled with tooltip 営業中の店舗ではブランドを変更できません（開業準備中のみ変更可）
- [x] PAR025 ブランド options are exactly JOYFIT, FIT365, in that order — src: store-form.tsx:L288-289
- [x] PAR026 サブブランド — select, helper JOYFITの場合に選択, empty state 選択してください; **required mark when the brand is JOYFIT, 任意 chip otherwise** — src: store-form.tsx:L345-L358 (`a7d0c88`)
- [x] PAR027 サブブランド options are exactly JOYFIT, JOYFIT24, JOYFIT YOGA, JOYFIT+, in that order — src: store-form.tsx:L300-303
- [x] PAR028 サブブランド is disabled while no brand is chosen, and **not rendered at all** when the brand is FIT365 (ブランド then stands alone in its row) — src: store-form.tsx:L344-L346 (`a7d0c88`)
- [x] PAR029 Choosing a brand other than JOYFIT clears any chosen sub-brand and any brand / sub-brand error in the same interaction — src: store-form.tsx:L335 (`a7d0c88`)
- [ ] PAR030 **[Phase 2 — Round 3]** テリトリー — required mark, helper 店舗が所属する組織階層。エリアを選ぶとテリトリーの選択肢が絞り込まれ、ブロック・運営本部はテリトリーから自動的に確定します, cascade plus breadcrumb stacked in a 400px column — src: store-form.tsx:L362-L376 (`1767864`) — ⏸ Deferred: Phase 2 — Round 3 per this checklist's own heading (B1); テリトリー is not rendered on the form
- [x] PAR031 運営企業（FC企業）— select, **任意 chip**, helper FC企業マスタから選択。直営の場合は「直営（運営企業なし）」を選択, empty state 選択してください, width capped at 400px — src: store-form.tsx:L377-L389 (`6bc1f1c`)
- [x] PAR032 運営企業 options: first 直営（運営企業なし）, then the FC company master's active companies — choosing 直営 on an FC store clears its operating company — src: store-form.tsx:L59-L60, L385-L389 (`6bc1f1c`)
- [x] PAR033 都道府県 and 郵便番号 sit side by side in a two-column row — src: store-form.tsx:L334, L350
- [x] PAR034 都道府県 — select, **任意 chip** (`6bc1f1c`), empty state 選択してください, all 47 prefectures — src: store-form.tsx:L335-346
- [x] PAR035 郵便番号 — text input, **任意 chip** (`6bc1f1c`), placeholder 例: 160-0022 — src: store-form.tsx:L347-349
- [x] PAR036 住所 — text input, **任意 chip** (`6bc1f1c`), placeholder 例: 新宿区新宿3-1-1, full width on its own row — src: store-form.tsx:L351-354
- [x] PAR037 電話番号 and FAX番号 sit side by side in a two-column row — src: store-form.tsx:L355, L363
- [x] PAR038 電話番号 — text input, **任意 chip** (`6bc1f1c`), placeholder 例: 03-1234-5678 — src: store-form.tsx:L356-359
- [x] PAR039 FAX番号 — text input, **任意 chip** (`6bc1f1c`), placeholder 例: 03-1234-5679 — src: store-form.tsx:L360-362
- [x] PAR040 性別制限 — select, **任意 chip** (`6bc1f1c`), empty state 選択してください, width capped at 240px — src: store-form.tsx:L418-428
- [x] PAR041 性別制限 options are exactly 混合, 女性専用, in that order — src: store-form.tsx:L424-425
- [x] PAR042 No store-status control anywhere on the form — src: store-form.tsx:L429-430
- [x] PAR043 Field order within 基本情報 is exactly: 店舗コード, 店舗名, 店舗名（カナ）, [ブランド | サブブランド (not for FIT365)], テリトリー (Phase 2), 運営企業（FC企業）, [都道府県 | 郵便番号], 住所, [電話番号 | FAX番号], [受付開始日 | プレオープン日], [開店日 | 閉店日], 営業時間, 性別制限 — src: store-form.tsx:L296-L545
- [x] PAR044 Fields are stacked with a 24px gap; the card body carries 16px horizontal padding — src: store-form.tsx:L257-258

## テリトリー picker **[Phase 2 — Round 3]**

> Rewritten 2026-10-02: V0 replaced the searchable combobox with a two-tier Select at `1767864` (2026-09-17). Former PAR045–PAR056 are withdrawn.

- [ ] PAR045a Two selects: エリア (placeholder エリアを選択) then テリトリー (placeholder テリトリーを選択) — src: territory-combobox.tsx:L37-L104 (`1767864`) — ⏸ Deferred: Phase 2 — Round 3 per this checklist's own heading (B1); テリトリー is not rendered on the form
- [ ] PAR045b テリトリー is disabled until an area is chosen, with tooltip 先にエリアを選択してください — src: territory-combobox.tsx:L97 — ⏸ Deferred: Phase 2 — Round 3 per this checklist's own heading (B1); テリトリー is not rendered on the form
- [ ] PAR045c Changing エリア clears the chosen テリトリー — src: territory-combobox.tsx — ⏸ Deferred: Phase 2 — Round 3 per this checklist's own heading (B1); テリトリー is not rendered on the form
- [ ] PAR045d テリトリー lists only active territories under the area, keeping a currently selected inactive one — src: territory-combobox.tsx — ⏸ Deferred: Phase 2 — Round 3 per this checklist's own heading (B1); テリトリー is not rendered on the form
- [ ] PAR045e Edit mode presets both selects from the saved territory; no internal id is ever shown — src: store-form.tsx:L364 comment (`1767864`) — ⏸ Deferred: Phase 2 — Round 3 per this checklist's own heading (B1); テリトリー is not rendered on the form
- [x] PAR057 Breadcrumb under the picker reads 運営本部 › ブロック › エリア › テリトリー in small muted text, with the territory itself in the foreground tone — src: territory-combobox.tsx:L129-140
- [x] PAR058 Breadcrumb renders nothing at all when no territory is chosen or the id does not resolve — src: territory-combobox.tsx:L126-127

## 日付フィールド（受付開始日 / プレオープン日 / 開店日 / 閉店日）

- [x] PAR060 開店日 — date picker, **任意 chip** (`6bc1f1c`), placeholder 日付を選択; the store's grand-open date — src: store-form.tsx:L365-372
- [x] PAR062 受付開始日 — date picker, **任意 chip** (`6bc1f1c`), placeholder 日付を選択, helper 入会受付を始める日 — src: store-form.tsx:L417-424 (`a7d0c88`)
- [x] PAR063 プレオープン日 — date picker, **任意 chip** (`6bc1f1c`), placeholder 日付を選択, helper プレオープンの日 — src: store-form.tsx:L425-432 (`a7d0c88`)
- [x] PAR064 The four dates render in chronological order: [受付開始日 | プレオープン日] on one two-column row, then [開店日 | 閉店日] on the next. — src: store-form.tsx:L415-433 (`a7d0c88`)
- [x] PAR061 閉店日 — date picker, **任意 chip** (`6bc1f1c`), placeholder 日付を選択, helper 閉店予定がある場合のみ設定。設定した日を過ぎると店舗ステータスが自動で「閉店」になります — src: store-form.tsx:L373-380

## 営業時間（曜日別デフォルト設定）

- [x] PAR065 Field label 営業時間（曜日別デフォルト設定）with the 任意 chip and helper 通常営業日の標準営業時間。営業カレンダーに年間一括適用され、例外日はカレンダー側で個別設定。祝日は「曜日どおり」のとき、その日の曜日の設定に従います — src: store-form.tsx:L459 (`3a6c29b`)
- [x] PAR066 Exactly eight rows, in this order: 月曜日, 火曜日, 水曜日, 木曜日, 金曜日, 土曜日, 日曜日 (time rows), then 祝日 (mode row, PAR068a) — src: store-form.tsx:L131-L146, L461-L527 (`3a6c29b`)
- [x] PAR067 Rows are stacked with an 8px gap and a small top offset from the helper line — src: store-form.tsx:L385
- [x] PAR068 Each **weekday** row lays out horizontally: day label (fixed 56px), open-time input, 〜 separator, close-time input, then the 定休日 checkbox group — src: store-form.tsx:L462-L489
- [x] PAR068a 祝日 row: label 祝日 (56px) and a select 祝日の扱い (aria-label, 112px, extra-small text) offering exactly 曜日どおり / 営業 / 休業, default 曜日どおり; no 定休日 checkbox — src: store-form.tsx:L491-L503 (`3a6c29b`)
- [ ] PAR068b Only when 営業 is chosen, a second line renders open-time 〜 close-time inputs (aria-labels 祝日 開店時刻 / 祝日 閉店時刻), indented under the label; edit mode pre-fills 10:00 / 18:00 — src: store-form.tsx:L504-L524 (`3a6c29b`) — ⚠ Gap: BLOCK(B13): create mode OK. Choosing 営業 adds a second line with the inputs 祝日 開店時刻 / 祝日 閉店時刻 at x=449, which is indented under the 56px label at x=381, and 曜日どおり/休業 remove that line. In edit mode every hour input and the 祝日の扱い select are disabled (KN-001), so the 10:00/18:00 pre-fill cannot be reached
- [x] PAR068c 曜日どおり and 休業 render no time inputs; changing the mode marks the form dirty — src: store-form.tsx:L493 (`3a6c29b`)
- [x] PAR069 Time inputs are native time controls, 32px tall, 112px wide, extra-small text — src: store-form.tsx:L389-405
- [x] PAR070 Separator between the two times is 〜 in extra-small muted text — src: store-form.tsx:L397
- [x] PAR071 Each time input carries an accessible name of the form "<day> 開店時刻" / "<day> 閉店時刻" — src: store-form.tsx:L395, L404
- [x] PAR072 定休日 checkbox is bound to its label; the label is extra-small with normal weight — src: store-form.tsx:L407-412
- [x] PAR073 Checking 定休日 disables that row's two time inputs; unchecking re-enables them — src: store-form.tsx:L393, L402, L409-410
- [x] PAR074 In create mode every time input starts empty and no row is marked 定休日 — src: store-form.tsx:L162, L392, L401
- [x] PAR075 In edit mode each row is pre-filled from the store's stored weekly set — src: store-form.tsx:L392, L401
- [x] PAR076 Weekly-hours controls stay enabled for a restricted Staff user — src: store-form.tsx:L382-383
- [x] PAR077 An untouched weekly table issues no weekly write on save. **No V0 source** — spec FR-045a; the mockup has no save behaviour at all
- [x] PAR078 Time inputs are tracked state, not uncontrolled defaults, so a change is detectable and FR-044 can validate. **Diverges from V0**, which uses uncontrolled `defaultValue` (store-form.tsx:L392, L401) — spec FR-045b

## 備考 card

- [x] PAR080 Card title 備考 — src: store-form.tsx:L437-439
- [x] PAR081 One text input labelled 備考, **任意 chip** (`6bc1f1c`), placeholder 補足事項があれば入力してください — src: store-form.tsx:L442-449

## Footer

- [x] PAR085 Footer is a right-aligned row above a top border with 16px padding, below both cards — src: store-form.tsx:L454
- [x] PAR086 キャンセル button — large, outline variant, left of the primary button — src: store-form.tsx:L460
- [x] PAR087 Primary button — large, solid; label 登録する in create mode, 保存する in edit mode — src: store-form.tsx:L461
- [x] PAR088 After a failed validation the footer shows 未入力の項目があります in extra-small destructive text, pushed to the far left — src: store-form.tsx:L455-456
- [ ] PAR089 For a restricted Staff user with no validation error the footer shows 店舗名・住所・電話番号・営業時間・店舗写真のみ編集できます。それ以外の項目は本部へ変更を依頼してください in extra-small muted text, pushed to the far left — **diverges from V0** (`a7d0c88` lacks 店舗写真) because the photo card is dev-added — spec FR-085 / FR-086a — src: store-form.tsx:L567 — ⚠ Gap: BLOCK(env-account): the Staff test account (lodu4289+staff) is provisioned as 正社員スタッフ, not 店舗責任者, and /crm/me returns can_edit_store_basic_info=false and can_edit_store_photo=false. On its own store KN-001 (…0203) both 編集 buttons are disabled with tooltip この操作は職位に許可されていません, and /stores/…0203/edit redirects to /403. Restricted-Staff mode cannot be reached.
- [x] PAR090 The validation summary takes precedence over the Staff guidance line — never both at once — src: store-form.tsx:L455-459

## Validation states

- [x] PAR095 店舗コード empty → 店舗コードを入力してください under the field — src: store-form.tsx:L171-172
- [x] PAR096 店舗コード duplicating an existing code → この店舗コードは既に使用されています — src: store-form.tsx:L173-176
- [x] PAR097 In edit mode the store's own current code does not trigger the duplicate message — src: store-form.tsx:L173
- [x] PAR098 店舗名 empty → 店舗名を入力してください — src: store-form.tsx:L177
- [x] PAR099 ブランド unset → ブランドを選択してください — src: store-form.tsx:L178
- [x] PAR099a Brand JOYFIT with no sub-brand → サブブランドを選択してください under サブブランド; choosing one clears it — src: store-form.tsx:L205-L206, L347 (`a7d0c88`)
- [x] PAR100 テリトリー unset → テリトリーを選択してください — src: store-form.tsx:L179-180
- [x] PAR101 Whitespace-only 店舗コード / 店舗名 are treated as empty — src: store-form.tsx:L171, L177
- [x] PAR102 Error text renders in extra-small destructive tone below the control with a small top offset — src: store-form.tsx:L85
- [x] PAR103 Every failing control is marked invalid for assistive technology — src: store-form.tsx:L265, L274, L284, L317
- [x] PAR104 A failed submit scrolls the first invalid control smoothly to the centre of the viewport — src: store-form.tsx:L189-192
- [x] PAR105 A failed submit neither saves nor navigates — src: store-form.tsx:L186-193
- [x] PAR106 Typing a non-blank 店舗コード clears that field's message immediately — src: store-form.tsx:L264
- [x] PAR107 Typing a non-blank 店舗名 clears that field's message immediately — src: store-form.tsx:L273
- [x] PAR108 Choosing a brand clears the brand message immediately — src: store-form.tsx:L283
- [x] PAR109 Choosing a territory clears the territory message immediately — src: store-form.tsx:L315

## Save

- [x] PAR110 Successful create shows the toast 店舗を登録しました — src: store-form.tsx:L198
- [x] PAR111 Successful edit shows the toast 店舗の変更を保存しました — src: store-form.tsx:L198
- [x] PAR112 A successful save returns the operator to the store list — src: store-form.tsx:L199
- [x] PAR113 A successful save clears the dirty state before navigating, so no discard dialog appears — src: store-form.tsx:L197

## Restricted-Staff mode (edit, Staff without head-office rights)

- [x] PAR120 店舗名 stays editable — src: store-form.tsx:L269-276
- [x] PAR121 店舗名（カナ）is disabled and carries the locked tooltip — V0 agrees since `a7d0c88` (client whitelist 店舗名 / 住所 / 電話番号; spec FR-083, FR-084) — src: store-form.tsx:L327-L330
- [x] PAR122 住所 stays editable — src: store-form.tsx:L351-353
- [x] PAR123 電話番号 stays editable — src: store-form.tsx:L356-358
- [x] PAR124 店舗コード is disabled and carries the locked tooltip — src: store-form.tsx:L259, L266
- [x] PAR125 ブランド is disabled and carries the locked tooltip — src: store-form.tsx:L282-283
- [x] PAR126 サブブランド is disabled and carries the locked tooltip — src: store-form.tsx:L293, L295
- [x] PAR127 テリトリー is disabled and carries the locked tooltip — src: store-form.tsx:L310, L316
- [x] PAR128 運営企業（FC企業）is disabled and carries the locked tooltip — src: store-form.tsx:L322-323
- [x] PAR129 都道府県 is disabled and carries the locked tooltip — src: store-form.tsx:L335-336
- [x] PAR130 郵便番号 is disabled and carries the locked tooltip — src: store-form.tsx:L347-348
- [x] PAR131 FAX番号 is disabled and carries the locked tooltip — src: store-form.tsx:L360-361
- [x] PAR132 開店日 is disabled and carries the locked tooltip — src: store-form.tsx:L365, L370
- [x] PAR133 閉店日 is disabled and carries the locked tooltip — src: store-form.tsx:L373, L378
- [x] PAR134 性別制限 is disabled and carries the locked tooltip — src: store-form.tsx:L418-419
- [x] PAR135 備考 is disabled and carries the locked tooltip — src: store-form.tsx:L442, L447
- [x] PAR136 The locked tooltip reads, verbatim: この項目の変更には本部権限が必要です — src: store-form.tsx:L149
- [x] PAR137 A locked field's control is wrapped so the tooltip opens on hover above the control, in extra-small text — src: store-form.tsx:L71-81

## Unsaved-changes guard

- [x] PAR140 Any change to any field marks the form dirty — src: store-form.tsx:L202, and every field's change handler
- [x] PAR141 キャンセル on a clean form leaves for the store list with no dialog — src: store-form.tsx:L460, use-unsaved-changes.ts:L44-47
- [x] PAR142 Back link on a clean form leaves for the store list with no dialog — src: store-form.tsx:L244
- [x] PAR143 キャンセル on a dirty form opens the discard dialog — src: store-form.tsx:L460
- [x] PAR144 Back link on a dirty form opens the discard dialog — src: store-form.tsx:L244
- [x] PAR145 Dialog title 変更を破棄しますか？ — src: store-form.tsx:L471
- [x] PAR146 Dialog body, verbatim: 未保存の変更はすべて失われます。この操作は取り消せません。 — src: store-form.tsx:L472-474
- [x] PAR147 Dialog cancel action 編集を続ける closes the dialog and keeps every entered value — src: store-form.tsx:L477
- [x] PAR148 Dialog confirm action 破棄する leaves for the store list — src: store-form.tsx:L478
- [x] PAR149 A dirty form raises the browser's own leave-confirmation on close/navigate-away — src: use-unsaved-changes.ts:L33-42

## Edit-mode data states

- [x] PAR150 While the store is being read, a loading state renders in place of the form
- [x] PAR151 When the read fails, an error state with a retry affordance renders in place of the form

> PAR150 and PAR151 have no V0 source: the prototype seeds its edit values from a local fixture (`store-form.tsx` L96-114) and so has no loading or error state. They are required by spec FR-006 and follow this repo's existing data-state convention — verify against the spec and the repo's other edit screens, not against V0.

## Deliberate divergences from V0 (verify against spec.md, not the mockup)

- [x] PAR160 None of these render anywhere on the form: a store-status select, an is-FC toggle, 会計コード, メールアドレス, a floor-map upload, any social-URL field, a rough エリア select. Store photos are now allowed — only via the dev-added 店舗写真 card (PAR170–PAR191) — spec FR-051 (Q2, revised 2026-10-02)
- [x] PAR161 Missing-hours message names the offending days beneath the weekly table when an open day has no times. **No V0 source** — V0 validates nothing here; spec FR-044
- [x] PAR162 Manager / Trainer / Observer reaching either route get the app's route-guard 403 page, NOT the prototype's mode-specific sentence — spec Implementation Notes §divergence 4. The page also keeps a screen-level `StoreFormNoAccess` behind the guard, so the rule holds even if the route guard is ever bypassed.
- [x] PAR163 A Staff deep-linking a store outside their scope gets the in-page wall with the prototype's edit-mode sentence, not the retry state — spec FR-081, Edge Cases
- [x] PAR164 Footer sits in flow at the end of the form column (V0 `store-form.tsx` L454), never fixed to the viewport — the guidance line must be fully readable beside the sidebar
- [x] PAR165 For a restricted Staff the disabled 運営企業 select shows the store's own company name (the FC master is closed to Staff), not an empty placeholder — spec Implementation Notes §divergence 5
- [x] PAR166 店舗コード renders the warning copy and the change-confirmation dialog instead of V0's prohibition line — spec FR-012, FR-061b, Implementation Notes §divergence 6. **Not built yet** (client answer recovered 2026-09-04)
- [ ] PAR167 In restricted-Staff mode 店舗名（カナ）is locked, unlike V0 — spec FR-083, FR-084. **Not built yet** — ⚠ Gap: BLOCK(env-account): the Staff test account (lodu4289+staff) is provisioned as 正社員スタッフ, not 店舗責任者, and /crm/me returns can_edit_store_basic_info=false and can_edit_store_photo=false. On its own store KN-001 (…0203) both 編集 buttons are disabled with tooltip この操作は職位に許可されていません, and /stores/…0203/edit redirects to /403. Restricted-Staff mode cannot be reached.
- [x] PAR168 ブランド / サブブランド are disabled once the store has opened, unlike V0 which lets head office change them in any state — spec FR-015a, Implementation Notes §divergence 7. **Blocked**: ships with the four-value status vocabulary (026 Q1), so it is not verifiable until then

## 店舗写真 card — dev-added, NO V0 source (2026-10-02)

> Not in the prototype. Built by dev on the team lead's instruction (2026-10-02), using the I-01 store-page form's 写真管理 card as the visual reference. Verify against spec FR-055–FR-059f and FR-086a, not against store-form.tsx. Reference: `store-page-form.tsx` L1023-L1120.

- [x] PAR170 Card sits between 基本情報 and 備考, in create and edit mode — spec FR-004, FR-055
- [x] PAR171 Header: title 店舗写真; right-aligned counter {n}枚 / 最大20枚 — spec FR-055 (ref store-page-form.tsx:L1028-L1030)
- [x] PAR172 Helper under the header: 店舗の外観・内装・設備の写真を登録します。表示順は登録した順です。 — spec FR-055a
- [x] PAR173 Thumbnail grid, 4 columns (5 on wide), 16:9 thumbnails with rounded border, in stored order — spec FR-056 (ref L1053-L1065)
- [x] PAR174 Dashed 写真を追加 tile with upload icon after the last photo; the only tile when there are no photos — spec FR-056 (ref L1108-L1117)
- [x] PAR175 Note under the grid: JPG, PNG / 最大10MB / 最大20枚 — spec FR-055a (ref L1119)
- [x] PAR176 Edit mode: grid pre-filled from the store's photos; loading treatment while reading; read error + retry inside the card only — spec FR-056
- [x] PAR177 写真を追加 opens a JPG/PNG multi-select picker; dropping files on the tile also works — spec FR-057
- [x] PAR178 Each accepted file shows an uploading state on its tile, then appears at the end of the grid — spec FR-057
- [x] PAR179 Wrong type → JPG・PNG 以外の形式のため登録できません（選んだファイル: {ファイル名}） — spec FR-057a
- [x] PAR180 Over 10MB → 10MBを超えているため登録できません（選んだファイル: {x.x}MB） — spec FR-057a
- [x] PAR181 Past 20 → 写真は最大20枚まで登録できます; files that fit are kept; tile disabled at 20 — spec FR-057a
- [x] PAR182 Failed upload → tile removed + 写真のアップロードに失敗しました。もう一度お試しください — spec FR-057b
- [x] PAR183 Hover reveals an X delete button top-right (accessible name 写真を削除); click removes it immediately, no dialog, form becomes dirty — spec FR-058 (ref L1095-L1104)
- [x] PAR184 No caption input, no reorder control, no 公開/非公開 dot, no メイン badge — spec FR-059
- [x] PAR185 Primary button disabled while any upload is in progress — spec FR-059c
- [x] PAR186 Save writes photos only when they changed: one full-set replace, items in grid order with s3Key + caption only (no id / sortOrder); deleting all sends an empty list — spec FR-059a, FR-059f
- [x] PAR187 Create mode: photos are written after the store is created; if only the photo write fails, the store stays and the toast 店舗は登録しましたが、写真の保存に失敗しました。編集画面から再度登録してください shows — spec FR-059b, FR-070c
- [x] PAR188 Edit mode partial failure names the photo part and keeps it dirty — spec FR-070a
- [x] PAR189 Discarding a dirty form restores deleted photos (nothing unlinked before save) — spec FR-058
- [ ] PAR190 Restricted Staff (own store): the photo card stays fully editable — not locked, no Staff lock tooltip — spec FR-086a — ⚠ Gap: BLOCK(env-account): the Staff test account (lodu4289+staff) is provisioned as 正社員スタッフ, not 店舗責任者, and /crm/me returns can_edit_store_basic_info=false and can_edit_store_photo=false. On its own store KN-001 (…0203) both 編集 buttons are disabled with tooltip この操作は職位に許可されていません, and /stores/…0203/edit redirects to /403. Restricted-Staff mode cannot be reached.
- [x] PAR191 After save, the detail screen's 店舗写真 card shows the new photos without a reload — spec FR-059e
