# UI Parity Checklist: Staff & Permission Management

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `staff-list.tsx`@1cc2d6d, `staff-detail.tsx`@182bd6e, `staff-form.tsx`@c909e33 (dx-fitness/fitness-crm-ui) — as recorded in spec.md header
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Staff List — Page Header

- [ ] PAR001 Page title "スタッフ管理" with live scoped-count badge — src: staff-list.tsx:353-356
- [ ] PAR002 "スタッフを追加" action button (Plus icon), role-gated to Headquarter/System, navigates to staff-form create mode — src: staff-list.tsx:357-366

## Staff List — Toolbar & Filters

- [ ] PAR003 Search input, placeholder "名前・メールアドレスで検索..." — src: staff-list.tsx:376-385
- [ ] PAR004 Filter toggle button, label switches "詳細フィルター"/"閉じる", shows active-filter count badge and chevron up/down — src: staff-list.tsx:386-402
- [ ] PAR005 Role filter select: 全ロール / 本部 / マネージャー / スタッフ / トレーナー / 閲覧のみ — src: staff-list.tsx:407-419
- [ ] PAR006 Position filter select: 全職位 + 11 named positions (本部管理者, ブロック長, テリトリーマネージャー, 店舗責任者, 正社員スタッフ, 契約社員スタッフ, アルバイト（スーパー）, アルバイト（一般）, 社員トレーナー, 社外トレーナー, 閲覧専任) — src: staff-list.tsx:420-438
- [ ] PAR007 Store filter select: 全店舗 + 6 named stores; entire control hidden when header context is scoped to a single store — src: staff-list.tsx:439-454
- [ ] PAR008 Status filter select: 全ステータス / 有効 / 無効 / 招待中 — src: staff-list.tsx:455-465
- [ ] PAR009 FilterResultBanner: shown when any filter/search active, displays total vs filtered count, active-filter summary text, and a clear action — src: staff-list.tsx:470-476

## Staff List — Table

- [ ] PAR010 Column "スタッフID", sortable — src: staff-list.tsx:484-486
- [ ] PAR011 Column "氏名", sortable — src: staff-list.tsx:487-489
- [ ] PAR012 Column "メールアドレス" (not sortable) — src: staff-list.tsx:490
- [ ] PAR013 Column "ロール" (not sortable) — src: staff-list.tsx:491
- [ ] PAR014 Column "職位", sortable — src: staff-list.tsx:492-494
- [ ] PAR015 Column "所属店舗", hidden when header context is a single store — src: staff-list.tsx:495-497
- [ ] PAR016 Column "FC企業" — src: staff-list.tsx:499
- [ ] PAR017 Column "ステータス", sortable — src: staff-list.tsx:500-502
- [ ] PAR018 Column "最終ログイン", sortable — src: staff-list.tsx:503-505
- [ ] PAR019 Trailing unlabeled column for row action menu — src: staff-list.tsx:506
- [ ] PAR020 Sortable-header tooltip text toggles "クリックで降順ソート" / "クリックで昇順ソート" based on current sort state — src: staff-list.tsx:306-336
- [ ] PAR021 Empty state "filtered" variant (search/filter active, zero matches) with "条件をクリア" button — src: staff-list.tsx:510-523
- [ ] PAR022 Empty state "empty" variant (no staff at all), no clear action — src: staff-list.tsx:510-523
- [ ] PAR023 Row cell: スタッフID — src: staff-list.tsx:527
- [ ] PAR024 Row cell: 氏名 — shows italic muted "未登録" when status is 招待中, otherwise the name — src: staff-list.tsx:528-532
- [ ] PAR025 Row cell: メールアドレス — src: staff-list.tsx:533
- [ ] PAR026 Row cell: ロール badge, color varies by role, Japanese label via getRoleLabel — src: staff-list.tsx:534-538
- [ ] PAR027 Row cell: 職位 badge, clickable — clicking sets the position filter to that value and opens the filter panel — src: staff-list.tsx:539-550
- [ ] PAR028 Row cell: 所属店舗, hidden when header context is a single store — src: staff-list.tsx:551-553
- [ ] PAR029 Row cell: FC企業, shows "—" when not set — src: staff-list.tsx:554
- [ ] PAR030 Row cell: ステータス badge — 有効 = success color, 無効 = muted color, 招待中 = info color — src: staff-list.tsx:555-557, 124-134
- [ ] PAR031 Row cell: 最終ログイン — invited rows show "未ログイン" plus "招待: YYYY/MM/DD"; other rows show relative time with the full datetime as a hover title — src: staff-list.tsx:558-571
- [ ] PAR032 Clicking anywhere on a row (outside action cells) navigates to staff-detail — src: staff-list.tsx:526

## Staff List — Row Actions & Dialogs

- [ ] PAR033 Row menu item "編集" (Pencil icon), role-gated Headquarter/System, navigates to staff-form edit mode — src: staff-list.tsx:578-583
- [ ] PAR034 Row menu item "再招待" (RefreshCw icon, info color), shown only when status is 招待中, role-gated, triggers success toast "招待メールを再送しました" with the email in the description — src: staff-list.tsx:584-599
- [ ] PAR035 Row menu item "無効化" (Ban icon, warning color), role-gated, opens the deactivate confirmation dialog — src: staff-list.tsx:601-608
- [ ] PAR036 Row menu item "削除" (Trash2 icon, destructive color), role-gated, opens the delete confirmation dialog — src: staff-list.tsx:609-616
- [ ] PAR037 Delete confirmation dialog: title "スタッフを削除しますか？", description recommending deactivation instead of deletion, キャンセル / 削除する actions — src: staff-list.tsx:627-648
- [ ] PAR038 Deactivate confirmation dialog: title "スタッフを無効化しますか？", description, キャンセル / 無効化する actions; confirming sets status to 無効 locally and shows a success toast naming the affected staff member — src: staff-list.tsx:651-684

## Staff List — Pagination

- [ ] PAR039 Footer count text "全 {total} 件 / {pages} ページ / {start}-{end} を表示" — src: staff-list.tsx:687-690
- [ ] PAR040 Pagination control: Previous / numbered pages with ellipsis for large page counts / Next, with disabled states at first/last page — src: staff-list.tsx:691-725
- [ ] PAR041 Page-size selector: 25 / 50 / 100件 options — src: staff-list.tsx:726-741
  - **Deliberate deviation from the prototype (2026-09-21).** The mockup offers a 4th 「200件」 option, but every
    paginated real endpoint declares `limit` `maximum: 100` (`GET /admin/staff`, `/admin/staff/{id}/login-histories`,
    `/admin/staff/{id}/change-histories`) and answers `400 E-VAL-001` above it. Decision: the FE follows the backend
    contract — the option is dropped instead of asking the backend to raise the cap (BUG-P2-01-01 / BUG-P2-05-04).
    Implemented as `API_PAGE_SIZE_OPTIONS` in `src/constants/app.constants.ts`, applied as the default of the
    shared `TablePaginationWithSize` (so it holds app-wide, not only on this screen).

## Staff Detail — Header

- [ ] PAR042 Breadcrumb "スタッフ管理に戻る" back link — src: staff-detail.tsx:149-151
- [ ] PAR043 Page title = staff full name (lastName + firstName) — src: staff-detail.tsx:152
- [ ] PAR044 Status badge next to title: colored dot + status label — src: staff-detail.tsx:153-158
- [ ] PAR045 Header action "CRMのログイン用URLを送る" (Link2 icon); role gate allows any role when viewing own account, otherwise Headquarter/System only; opens the magic-link dialog — src: staff-detail.tsx:161-171
- [ ] PAR046 Header action "削除" (Trash2 icon, destructive style), role-gated Headquarter/System, opens the delete dialog — src: staff-detail.tsx:173-181
- [ ] PAR047 Header action "編集" (Pencil icon), role-gated per manager-edit rule (Staff-role account at a store the manager manages, or Headquarter/System), shows a deny tooltip explaining the restriction, navigates to staff-form edit — src: staff-detail.tsx:182-191

## Staff Detail — Basic Info Tab

- [ ] PAR048 Tabs "基本情報" / "変更履歴" — src: staff-detail.tsx:199-202
- [ ] PAR049 基本情報 card: スタッフID field — src: staff-detail.tsx:215-218
- [ ] PAR050 基本情報 card: 氏名 field (full name) — src: staff-detail.tsx:219-222
- [ ] PAR051 基本情報 card: メールアドレス（ログインID）field, spans full width — src: staff-detail.tsx:223-226
- [ ] PAR052 所属・権限 card: ロール field with colored role badge — src: staff-detail.tsx:238-243
- [ ] PAR053 所属・権限 card: 職位 field with secondary badge — src: staff-detail.tsx:244-247
- [ ] PAR054 所属・権限 card: 所属 field, store pattern — shows affiliation name plus "パターンA: 店舗直接紐づき" — src: staff-detail.tsx:250-254
- [ ] PAR055 所属・権限 card: 所属 field, FC pattern — shows affiliation name plus "パターンB: FC企業紐づき（管轄N店舗）" and a badge per managed store — src: staff-detail.tsx:255-266
- [ ] PAR056 所属・権限 card: link "{職位名}の権限を確認" (ExternalLink icon) navigating to the position-list screen — src: staff-detail.tsx:269-279
- [ ] PAR057 備考 card, rendered only when a note is present — src: staff-detail.tsx:285-294
- [ ] PAR058 Right-column StatusCard: tone (success when 有効, muted otherwise), Check icon, status label, meta lines "作成: {date}" and "更新: {date}" — src: staff-detail.tsx:299-304
- [ ] PAR059 StatusCard action button "無効化する" (Ban icon, warning style), role-gated Headquarter/System, opens the disable dialog — src: staff-detail.tsx:305-315

## Staff Detail — History Tab

- [ ] PAR060 History table columns: 日時 / 操作者 / 変更内容 — src: staff-detail.tsx:326-330
- [ ] PAR061 History rows listing each permission change entry — src: staff-detail.tsx:333-339
- [ ] PAR062 History footer count text "全{N}件" — src: staff-detail.tsx:342-344

## Staff Detail — Dialogs

- [ ] PAR063 Disable confirmation dialog: title "このスタッフを無効化しますか？", description noting the action is reversible later, optional 無効化理由 textarea, キャンセル / 無効化する actions — src: staff-detail.tsx:353-370
- [ ] PAR064 Delete confirmation dialog: title "スタッフを削除しますか？", description recommending deactivation instead, キャンセル / 削除する actions — src: staff-detail.tsx:373-386
- [ ] PAR065 Magic-link-sent confirmation dialog: title "ログイン用URLを送信しました", description naming the staff member/email and stating the 1-hour link expiry, single 閉じる action — src: staff-detail.tsx:389-401

## Staff Form — Create Mode

- [ ] PAR066 Breadcrumb "スタッフ管理に戻る" back link, guarded by unsaved-changes confirmation — src: staff-form.tsx:426-428
- [ ] PAR067 Page title "スタッフ新規登録" — src: staff-form.tsx:239, 429
- [ ] PAR068 基本情報 card header shows a live "{N}名入力中" badge once any row has content — src: staff-form.tsx:441-448
- [ ] PAR069 Bulk registration table columns: 姓* / 名* / メールアドレス\* / row-remove action — src: staff-form.tsx:452-455
- [ ] PAR070 Bulk row inputs for 姓, 名, メールアドレス; remove-row button disabled when only one row remains — src: staff-form.tsx:463-517
- [ ] PAR071 Inline duplicate-email warning "このメールアドレスはすでに登録されています" when email matches an existing account — src: staff-form.tsx:492-497
- [ ] PAR072 Inline duplicate-email warning "リスト内でメールアドレスが重複しています" when email repeats within the same batch — src: staff-form.tsx:498-503
- [ ] PAR073 "スタッフを追加" button (Plus icon) appends a new blank row — src: staff-form.tsx:521-526
- [ ] PAR074 Pasting multiple newline-separated emails into one email field auto-splits them into that many rows — src: staff-form.tsx:354-373
- [ ] PAR075 権限設定 card: ロール select, required, with description "ロールによって利用できる機能の範囲が決まります" — src: staff-form.tsx:536-557
- [ ] PAR076 権限設定 card: 職位 combobox, disabled until a role is chosen, placeholder text differs based on that state — src: staff-form.tsx:148-200, 559-561
- [ ] PAR077 所属設定 card: 所属パターン radio group (パターンA店舗直接紐づき / パターンB FC企業紐づき), required, with exclusivity description — src: staff-form.tsx:573-592
- [ ] PAR078 所属設定 card: 所属店舗 select, shown only when pattern = store — src: staff-form.tsx:594-606
- [ ] PAR079 所属設定 card: 所属FC企業 select, shown only when pattern = fc, each option shows managed-store count — src: staff-form.tsx:609-625
- [ ] PAR080 所属設定 card: selected-FC managed-stores preview panel with one badge per store — src: staff-form.tsx:626-635
- [ ] PAR081 備考 card: optional Textarea — src: staff-form.tsx:643-656
- [ ] PAR082 Info alert: "登録後、各スタッフのメールアドレスに初期パスワードが自動送信されます。..." — src: staff-form.tsx:658-663
- [ ] PAR083 Footer inline error text: "未入力の必須項目があります" or the duplicate-email message, left-aligned — src: staff-form.tsx:665-669
- [ ] PAR084 Footer buttons: キャンセル (discard-guarded) / "{N}名を登録する" (button disabled while zero rows are filled) — src: staff-form.tsx:670-677

## Staff Form — Edit Mode

- [ ] PAR085 Page title "スタッフ編集" — src: staff-form.tsx:239, 429
- [ ] PAR086 基本情報 card: 氏名（姓）and 氏名（名）required inputs, pre-filled from existing record — src: staff-form.tsx:690-707
- [ ] PAR087 基本情報 card: メールアドレス（ログインID）input plus a "重複確認" button (disabled while the field is empty) — src: staff-form.tsx:708-728
- [ ] PAR088 Email duplicate-check result message: success "このメールアドレスは使用可能です" (Check icon) or error "このメールアドレスはすでに登録されています" (AlertTriangle icon) — src: staff-form.tsx:729-740
- [ ] PAR089 権限設定 card: ロール select enabled for Headquarter/System, with description mentioning next-login timing — src: staff-form.tsx:753-776
- [ ] PAR090 権限設定 card: ロール select shown disabled with tooltip "ロール変更は本部権限が必要です" when the current user cannot change roles — src: staff-form.tsx:777-792
- [ ] PAR091 権限設定 card: 職位 combobox pre-filled with the existing position — src: staff-form.tsx:794-796
- [ ] PAR092 所属設定 card: same パターン radio / 所属店舗 / 所属FC企業 / managed-stores preview as create mode, pre-filled from existing record — src: staff-form.tsx:808-876
- [ ] PAR093 備考 card: Textarea pre-filled with the existing note — src: staff-form.tsx:878-893
- [ ] PAR094 Footer inline error text: "未入力の項目があります" — src: staff-form.tsx:897-899
- [ ] PAR095 Footer buttons: キャンセル (discard-guarded) / 保存する — src: staff-form.tsx:900-901

## Staff Form — Shared Dialogs

- [ ] PAR096 Role-change confirmation dialog (edit mode, shown only when the role was actually changed): title with AlertTriangle icon "ロール変更を保存しますか？", body showing old role → new role, a next-login-effective notice, a note that the change is recorded in permission history, キャンセル / "変更を保存する" actions — src: staff-form.tsx:910-934
- [ ] PAR097 Discard-changes confirmation dialog: title "変更を破棄しますか？", description warning changes will be lost, "編集を続ける" (cancel) / "破棄する" (confirm) actions — src: staff-form.tsx:938-951
