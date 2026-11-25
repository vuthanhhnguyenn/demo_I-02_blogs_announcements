# UI Parity Checklist: Y-04 Terms Document Master Management

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `.cache/fitness-crm-ui/src/pages/terms-list.tsx`@b519545, `.cache/fitness-crm-ui/src/pages/terms-detail.tsx`@b519545, `.cache/fitness-crm-ui/src/pages/terms-form.tsx`@b519545 (as recorded in spec.md header)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Terms List — Page Header & Access Control

- [x] PAR001 Page title "規約文書管理" with count badge (non-deleted document count) — src: terms-list.tsx:199-202
- [x] PAR002 "新規登録" button (role-gated: Headquarter/System) with Plus icon, navigates to terms-form — src: terms-list.tsx:203-212
- [x] PAR003 No-access card for restricted roles: "この画面を表示する権限がありません" + "規約文書管理はトレーナーロールでは参照できません。" — src: terms-list.tsx:217-225

## Terms List — Filter Banner & Toolbar

- [x] PAR004 Filter-result banner: "全 {N} 件中 {M} 件を抽出中" + filter-summary text (search term/brand/status), shown only when a filter or search is active — src: terms-list.tsx:229-240
- [x] PAR005 "条件をクリア" button (X icon) in the filter banner, resets search + brand + status filters — src: terms-list.tsx:238
- [x] PAR006 Type tabs (line variant): すべて / 会員規約 / プライバシーポリシー / 決済規約 / 同伴規約 / 退会規約 / 休会規約 — src: terms-list.tsx:244-252
- [x] PAR007 Search input, placeholder "規約ID・規約名で検索...", searches by partial ID/name match — src: terms-list.tsx:259-267
- [x] PAR008 Brand select filter (全ブランド / JOYFIT / FIT365), highlighted style when non-default — src: terms-list.tsx:269-278
- [x] PAR009 Status select filter (全ステータス / 公開中 / 適用終了 / 下書き), highlighted style when non-default — src: terms-list.tsx:279-289
- [x] PAR010 "削除済みも含めて表示" checkbox toggling inclusion of logically-deleted rows — src: terms-list.tsx:290-297

## Terms List — Table

- [x] PAR011 Table columns in order: ID, 規約名, 現行バージョン, ブランド, 適用開始日, ステータス, (actions, no header label) — src: terms-list.tsx:304-315
- [x] PAR012 Row cells: ID (muted text), 規約名 (medium font), 現行バージョン as secondary Badge, ブランド as one outline Badge per brand (a shared `null` row shows both JOYFIT and FIT365 badges), 適用開始日 as plain text, ステータス as outline Badge with per-status color (公開中=success, 適用終了=muted, 下書き=warning) — src: terms-list.tsx:100-109, 332-349
- [x] PAR013 Row click navigates to terms-detail; deleted rows rendered at 50% opacity — src: terms-list.tsx:333
- [x] PAR014 Row action menu (MoreHorizontal trigger) containing: 編集 (Pencil icon, role-gated Headquarter/System, navigates to terms-form edit mode) and 削除 (Trash2 icon, role-gated, destructive style, opens delete dialog), separated by a DropdownMenuSeparator — src: terms-list.tsx:350-372
- [x] PAR015 Empty state: "filtered" variant (with "条件をクリア" action button) when search/filters active, "empty" variant otherwise, entityLabel "規約文書" — src: terms-list.tsx:317-330

## Terms List — Delete Dialog & Pagination

- [x] PAR016 Delete confirmation AlertDialog: title "規約を削除しますか？", description naming the target document and explaining logical deletion + recoverability via "削除済みも含めて表示", キャンセル / 削除する (destructive) actions — src: terms-list.tsx:380-402
- [x] PAR017 Pagination footer summary text: "全 {totalCount} 件 / {totalPages} ページ / {start}-{end} を表示" — src: terms-list.tsx:405-408
- [x] PAR018 Pagination controls: 前へ / page-number links with ellipsis / 次へ, disabled state at first/last page — src: terms-list.tsx:409-441
- [x] PAR019 Page-size selector (25/50/100/200件), labeled "表示件数" — src: terms-list.tsx:442-452

## Terms Detail — Page Header

- [x] PAR020 Back link "規約文書管理に戻る" navigating to terms-list — src: terms-detail.tsx:103-110
- [x] PAR021 Page title "契約条件" with status Badge (dot + "公開中", success color) — src: terms-detail.tsx:111-117
- [x] PAR022 "編集" button (Pencil icon, role-gated Headquarter/System) navigating to terms-form edit mode — src: terms-detail.tsx:120-123
- [x] PAR023 Action dropdown (MoreHorizontal) containing "削除" (Trash2 icon, role-gated Headquarter/System, destructive) — src: terms-detail.tsx:124-139

## Terms Detail — Basic Information Tab

- [x] PAR024 Tabs: 基本情報 / バージョン履歴 (line variant) — src: terms-detail.tsx:146-150
- [x] PAR025 "基本情報" card with fields: 規約名, 備考 — src: terms-detail.tsx:158-168
- [x] PAR026 "規約本文" card title with "{currentVersion.version} 適用中" secondary Badge — src: terms-detail.tsx:171-176 (badge only on a 公開中 document; the card itself shows for every status — FR-010 updated 2026-10-20)
- [x] PAR027 Description text: "PDFはモバイルアプリで会員に配信されます。CRM 側ではテキスト本文で内容確認できます（Y-04 検討-01 方式D）" — src: terms-detail.tsx:180
- [x] PAR028 Scrollable extracted-text block (max-h 320px, whitespace-preserving) showing the opened document's own body text — src: terms-detail.tsx:181-183
- [x] PAR029 Attached-PDF chip: FileText icon, filename link, size text, "プレビュー" button (Eye icon) opening the PDF in a new window — src: terms-detail.tsx:184-192
- [x] PAR030 "管理情報" card fields: ステータス (Badge w/ dot), 適用中バージョン (Badge), 承諾ボタン表示 ("オン"/"オフ"), 規約タイプ, ブランド (outline Badge), 適用開始日, 表示順 — src: terms-detail.tsx:202-225
- [x] PAR031 Audit sub-section (below divider): 作成日時, 最終更新日時, 最終更新者 — src: terms-detail.tsx:226-232
- [x] PAR067 "基本情報" card + バージョン履歴 timeline, version documents only (`parentTermsId` set): "オリジナル規約" field after 規約名 — a link (original's version label, "（削除済み）" suffix when deleted) to the original's detail page, plus the timeline's オリジナル規約 badge links there too; hidden on an original (Y-04 FR-005 L169)

## Terms Detail — Version History Tab

- [x] PAR032 "バージョン履歴" card with helper text "新バージョンを公開すると、旧バージョンは自動的に適用終了になります" — src: terms-detail.tsx:244-249
- [x] PAR033 "新規バージョン作成" button (Plus icon, role-gated Headquarter/System) navigating to terms-form new-version mode — src: terms-detail.tsx:251-254
- [x] PAR034 Version timeline: per-entry status dot (success color if 適用中, else muted) connected by a vertical line — src: terms-detail.tsx:259-265
- [x] PAR035 Version entry content: version label, version-kind Badge (オリジナル規約=primary color / バージョン規約=info color), status Badge (適用中/適用終了/下書き, matching list-page color scheme), "プレビュー" button — src: terms-detail.tsx:266-280
- [x] PAR036 Version entry body: applicable period text ("{start} 〜 {end/現在}"), change summary text — src: terms-detail.tsx:281-282
- [x] PAR037 Version entry file section (適用中 entries only): "ファイル" label + FileText icon + filename link + size — src: terms-detail.tsx:283-293
- [x] PAR038 "適用中" entry highlighted with success-tinted border/background vs. plain border for others — src: terms-detail.tsx:267
- [x] PAR039 "過去のバージョンを表示（全{N}件）" expand control (ChevronDown icon), shown only when >3 versions exist and not yet expanded — src: terms-detail.tsx:297-308

## Terms Detail — Delete Dialog

- [x] PAR040 Delete confirmation AlertDialog: title "規約を削除しますか？", description naming "契約条件" and explaining logical deletion + recoverability, キャンセル / 削除する (destructive) actions — src: terms-detail.tsx:317-329

## Terms Form — Page Header & Warning

- [x] PAR041 Back link "規約文書管理に戻る" with unsaved-changes discard confirmation before navigating to terms-list — src: terms-form.tsx:189-192
- [x] PAR042 Dynamic page title: "規約編集" (edit) / "新規バージョン作成" (new-version) / "規約新規登録" (create) — src: terms-form.tsx:97-100, 193
- [x] PAR043 Edit-mode warning Alert (AlertTriangle icon, warning color): "適用中の規約を変更すると、同意済みの会員にも影響します。通常は新バージョンの作成を推奨します。" — shown only when mode="edit" — src: terms-form.tsx:199-207

## Terms Form — Card 1: 基本情報

- [x] PAR044 ブランド field: two checkboxes (JOYFIT/FIT365), multi-select, disabled + description "編集モードではブランドは変更できません（FR-006）" when prefilled (edit/new-version), else "対象ブランドを選択（複数可）"; both ticked → one shared document (`brandEnum: null`) — src: terms-form.tsx:218-243
- [x] PAR045 規約名 required text input, placeholder "例: 利用規約", inline error message — src: terms-form.tsx:244-251
- [x] PAR046 規約タイプ required select (会員規約/プライバシーポリシー/決済規約/同伴規約/退会規約/休会規約), disabled + description "編集モードでは変更できません（FR-006）" when prefilled — src: terms-form.tsx:252-270
- [x] PAR047 バージョン required text input, placeholder "例: v1.0", inline error message — src: terms-form.tsx:271-279

## Terms Form — Card 2: 適用設定

- [x] PAR048 適用開始日 required DatePicker, inline error message — src: terms-form.tsx:291-297
- [x] PAR049 適用終了予定日 optional DatePicker — src: terms-form.tsx:298-304
- [x] PAR050 表示順 optional number input, placeholder "1" — src: terms-form.tsx:305-307
- [x] PAR051 承諾ボタン表示 required Switch in a bordered row, with label + description "ONにすると、会員に対して規約への同意ボタンが表示されます" — src: terms-form.tsx:308-314

## Terms Form — Card 3: 内容

- [x] PAR052 備考 optional Textarea (4 rows), placeholder "規約に関する備考を入力" — src: terms-form.tsx:326-328
- [x] PAR053 ファイル required field, description "PDF形式のみ。10MB以下。" — src: terms-form.tsx:330
- [x] PAR054 Existing-file state (prefilled, not replacing): filename chip + "現在のファイル" caption + "差し替え" button (Upload icon) — src: terms-form.tsx:331-346
- [x] PAR055 File-picker state: hidden file input (accept=PDF), "現在のファイル「...」を差し替えます" caption when prefilled, "PDFを選択する" button (Upload icon) when nothing selected — src: terms-form.tsx:348-387
- [x] PAR056 Selected-file chip (once chosen): filename + "選択済みのファイル" caption + "変更" button — src: terms-form.tsx:361-376
- [x] PAR057 "キャンセル" ghost button to abandon a PDF replacement, shown only when prefilled and in file-picker state — src: terms-form.tsx:389-398
- [x] PAR058 PDF validation errors: non-PDF file → "PDF形式のファイルのみアップロードできます"; file >10MB → "ファイルサイズが10MBを超えています。10MB以下のファイルを選択してください" — src: terms-form.tsx:161-177
- [x] PAR059 規約本文 extraction-preview field, description "PDFアップロード時にテキストを自動抽出し、規約本文テキストとして保持します" — src: terms-form.tsx:403-406
- [x] PAR060 When a PDF is attached (existing or newly selected): scrollable extracted-text block (max-h 200px) + "抽出元: {filename}" caption — src: terms-form.tsx:407-413
- [x] PAR061 When no PDF is attached: placeholder text "PDFファイルを選択すると、本文テキストが自動抽出されて表示されます" — src: terms-form.tsx:414-416
- [x] PAR062 関連規約 field: in new-version mode, shows a chip with the source document's name + version and caption "オリジナル規約（自動設定）"; in edit mode, lists the other members of the lineage (the edited document excluded, newest first) with version label, kind badge, status and period when there is at least one (Y-04 不具合 No13 — prototype still shows the empty text here, spec wins); otherwise shows "関連する規約が存在しません" — src: terms-form.tsx:418-431

## Terms Form — Footer & Discard Dialog

- [x] PAR063 Submit-error summary text "未入力の項目があります", shown left-aligned only after a failed validation attempt — src: terms-form.tsx:438-440
- [x] PAR064 "キャンセル" outline button (with unsaved-changes discard confirmation) — src: terms-form.tsx:441
- [x] PAR065 Submit button, label "保存する" (edit mode) or "登録する" (create/new-version) — src: terms-form.tsx:442
- [x] PAR066 Discard-confirmation AlertDialog: title "変更を破棄しますか？", description "未保存の変更はすべて失われます。この操作は取り消せません。", "編集を続ける" / "破棄する" actions — src: terms-form.tsx:449-461
