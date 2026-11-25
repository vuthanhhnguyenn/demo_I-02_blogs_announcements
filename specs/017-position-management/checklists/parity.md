# UI Parity Checklist: Y-01 Position Master Management (職位マスター管理)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: dx-fitness/fitness-crm-ui @ **426a9b3** (2026-07-23 design update) — `src/pages/position-list.tsx`, `src/pages/position-form.tsx`
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.
**Re-baselined 2026-07-29** against the 7/23 prototype + API design v0.3: PAR004 (banner placement), PAR009 (trigger height), PAR015/PAR018 (アクセス権限数), PAR043a (new — 重要操作 warning icon), PAR044 (`csv_export`), PAR047 (権限フラグ section removed), PAR048/PAR049/PAR051 (割当スタッフ 3 rows with avatar + 無効 badge). Line references point at @426a9b3.

## Page Header & Shell (List)

- [x] PAR001 Sidebar highlights the position-list nav entry; shared header renders above the page — src: position-list.tsx:726-728
- [x] PAR002 Page header title "職位マスター管理" with outline badge "{totalCount}件" (count reflects current filter result) — src: position-list.tsx:730-733
- [x] PAR003 Header action "職位を追加" button with Plus icon, role-gated to Headquarter/System, navigates to the position form (create) — src: position-list.tsx:734-743

## Filter Result Banner

- [x] PAR004 Banner appears only while search text or a permission filter is active, rendered **inside the list card directly below the toolbar** (7/23 change: was above the two-pane grid) — src: position-list.tsx:809-818
- [x] PAR005 Banner copy: "全 {N} 件中 {M} 件を抽出中" with M bold — src: position-list.tsx:750-751
- [x] PAR006 Banner appends "： 権限「{label}」を持つ職位" when a permission filter is active and ": "{search}"" when search text is active — src: position-list.tsx:752-753
- [x] PAR007 Banner right side: ghost "条件をクリア" button with X icon; clears search + permission filter + resets to page 1 — src: position-list.tsx:755-758, 718-722

## List Toolbar

- [x] PAR008 Search input with leading Search icon, placeholder "職位名で検索...", max-width 360, resets page to 1 on change — src: position-list.tsx:768-776
- [x] PAR009 "権限で絞り込む" popover trigger with Filter icon, height h-8 (7/23 change: was h-9); variant switches outline → default (filled) while a filter is selected — src: position-list.tsx:777-789
- [x] PAR010 Popover content: Command palette w-280 with input placeholder "権限を検索...", scrollable list max-h-320 — src: position-list.tsx:786-789
- [x] PAR011 Command empty state text "該当する権限がありません" — src: position-list.tsx:790
- [x] PAR012 Permissions grouped by category headings (会員管理, 入退館管理, 入会申請管理, レッスン管理, 施設設備管理, 売上管理, 商材施策設定, コンテンツ, システム設定, CSV出力管理) with every fine permission listed under its group — src: position-list.tsx:557-618, 791-804
- [x] PAR013 Selecting a permission closes the popover, applies the filter, resets page to 1; check icon visible next to the currently selected permission on reopen — src: position-list.tsx:794-801
- [x] PAR014 Permission filter matches grant semantics: view-type permissions match at view or edit level; edit/operation permissions only at edit; flag-gated permissions (A-4 強制退会, C-3 代理申請, F-3 請求確定後変更, F-4 返金処理, G-3 アンケート作成) match only when the flag is enabled — src: position-list.tsx:620-646

## Position Table

- [x] PAR015 Column set and order: 職位名 (min-w-200) / 対象ロール (w-110) / **アクセス権限数** (w-120; renamed from 権限フラグ数 — 7/23 change + API answer 2026-07-29) / 割当スタッフ (w-100) / actions (w-10), sticky header on muted background — src: position-list.tsx:107-114
- [x] PAR016 職位名 cell: name (xs, medium) with description sub-line (10px, muted) — src: position-list.tsx:843-848
- [x] PAR017 対象ロール cell: outline badge with role display name (本部 / マネージャー / スタッフ / トレーナー / 閲覧のみ) — src: position-list.tsx:849-851
- [x] PAR018 アクセス権限数 cell: "{on} / {total}" tabular numerals, on-count semibold, "/ total" muted — src: position-list.tsx:852-857
- [x] PAR019 割当スタッフ cell: "{N}名" as primary-colored underline-on-hover button that selects the row (does not toggle-deselect); em dash "—" muted when 0 — src: position-list.tsx:858-869
- [x] PAR020 Row click toggles selection; selected row highlighted bg-primary/10; hover bg-muted/50; cursor pointer — src: position-list.tsx:838-841
- [x] PAR021 `positionId` URL parameter preselects the matching row on load — src: position-list.tsx:686-690
- [x] PAR022 Row actions cell stops click propagation (menu clicks never change selection) — src: position-list.tsx:870

## Row Action Menu & Delete Dialog

- [x] PAR023 ⋯ (MoreHorizontal) trigger, size-8 rounded, hover bg-muted; menu aligned end — src: position-list.tsx:872-876
- [x] PAR024 Menu item "編集" with Pencil icon, role-gated HQ/System, navigates to form (edit) — src: position-list.tsx:877-882
- [x] PAR025 Menu item "複製" with Copy icon, role-gated HQ/System, navigates to form (clone) — src: position-list.tsx:883-888
- [x] PAR026 Separator between edit/clone and delete — src: position-list.tsx:889
- [x] PAR027 When staffCount > 0: disabled muted item "削除（割当あり）" with Trash2 icon (no dialog possible) — src: position-list.tsx:890-897
- [x] PAR028 When staffCount == 0 and user can manage: destructive "削除" item opens AlertDialog — src: position-list.tsx:898-901
- [x] PAR029 When staffCount == 0 and user cannot manage: role-gated destructive "削除" item (blocked affordance) — src: position-list.tsx:902-910
- [x] PAR030 Delete dialog: title "職位を削除しますか？", description "「{name}」を削除します。この操作は取り消せません。", buttons キャンセル / 削除する (destructive styling) — src: position-list.tsx:913-926

## Table Empty States

- [x] PAR031 Filtered-empty: Empty variant "filtered" for entity 職位 with outline "条件をクリア" button, spanning all 5 columns — src: position-list.tsx:822-835
- [x] PAR032 True-empty: Empty variant "empty" for entity 職位 without any action — src: position-list.tsx:825-831

## Pagination Footer

- [x] PAR033 Left text: "全 {N} 件 / {P} ページ / {start}-{end} を表示" — src: position-list.tsx:937-939
- [x] PAR034 Previous/Next controls disabled (pointer-events-none, 50% opacity) at first/last page — src: position-list.tsx:942-948, 966-972
- [x] PAR035 Numbered page links with active state; ellipsis compression once total pages > 7 (1,2,3,4,…,last / 1,…,x-1,x,x+1,…,last / 1,…,last-3..last) — src: position-list.tsx:711-716, 949-965
- [x] PAR036 Right side: label "表示件数" + select 25件/50件/100件/200件, default 50; changing it resets to page 1 — src: position-list.tsx:693-694, 975-990
- [x] PAR037 Current page clamps to last valid page when filters shrink the result set — src: position-list.tsx:705-706

## Permission Preview Pane (right, sticky, 400px)

- [x] PAR038 Two-pane grid layout 1fr / 400px, right pane sticky — src: position-list.tsx:763, 995
- [x] PAR039 No-selection placeholder card: circled Eye icon, "職位を選択してください" (sm, medium), helper "左の一覧から職位を選ぶと権限プレビューが表示されます" (xs), centered py-16 — src: position-list.tsx:996-1005
- [x] PAR040 Preview header: position name (sm bold) + role outline badge on one line, description (xs muted) beneath — src: position-list.tsx:1009-1017
- [x] PAR041 Preview header action: "権限を編集" button with Pencil icon → form (edit) — src: position-list.tsx:1018-1025
- [x] PAR042 Section label "カテゴリ別アクセス権限"; one accordion item per category (multiple-open allowed) — src: position-list.tsx:1030-1033
- [x] PAR043 Category trigger row: level icon (edit → green CheckCircle2, view → blue Eye, none → muted MinusCircle), category label (muted when none), level text colored by level — src: position-list.tsx:650-675, 1039-1043
- [x] PAR043a 重要操作 warning icon (7/23 addition): when a category holds at least one granted destructive permission (強制退会の実行 / 請求確定後の変更 / 返金処理の実行) the trigger shows a warning triangle in the warning colour whose tooltip reads "強制退会・返金など重要操作を含みます" — src: position-list.tsx:639-640, 1046, 1054-1063
- [x] PAR044 Level text copy: 閲覧・編集 / 閲覧のみ / アクセス不可; the `csv_export` category instead shows 出力可 (non-none) / 出力不可 (none) — src: position-list.tsx:661-667, 1053
- [x] PAR045 Category trigger badge: "{onCount}/{total}" secondary badge, tabular numerals — src: position-list.tsx:1035-1036, 1044
- [x] PAR046 Expanded category: fine-permission rows indented (pl-6), each with small CheckCircle2 (granted) or MinusCircle (not granted) and label muted when not granted — src: position-list.tsx:1047-1060
- [x] PAR047 **No 「権限フラグ」 section** in the preview pane — deleted in the 7/23 prototype after the API team confirmed 権限フラグ ≡ アクセス権限 and the two are merged into one (2026-07-29). The pane goes straight from the category accordion to 割当スタッフ — src: position-list.tsx:1086-1091 (section absent)
- [x] PAR048 A single separator between the category accordion and the 割当スタッフ section (the flags separator went away with PAR047) — src: position-list.tsx:1088
- [x] PAR049 Section "割当スタッフ" header with right-aligned "{N}名" count (shown only when > 0), plus a 「無効{M}名」 note when any displayed staff is inactive — src: position-list.tsx:1092-1106
- [x] PAR050 Zero-staff state: text "割当なし" — src: position-list.tsx:1099-1100
- [x] PAR051 Staff rows: at most **3** (SHOWN_STAFF), sorted 有効 before 無効, each a full-width hover row with an initial-circle avatar (dimmed when inactive), the name, a 無効 outline badge when inactive, the store on a sub-line, and an ArrowUpRight that fades in on hover, navigating to staff detail — src: position-list.tsx:1111-1148
- [x] PAR052 Overflow link "他 {N} 名を見る →" when staffCount exceeds the shown 3 rows, else "スタッフ一覧で見る →"; both navigate to staff list pre-filtered by this position — src: position-list.tsx:1150-1164

## Form — Shell & Header

- [x] PAR053 Sidebar/header shell; page header with back link "職位マスター管理に戻る" that runs the discard guard before navigating — src: position-form.tsx:389-397
- [x] PAR054 Page title by mode: "職位 新規作成" / "職位 編集" / "職位 複製して作成" — src: position-form.tsx:326-331
- [x] PAR055 Content column max-w-960 centered — src: position-form.tsx:401

## Form — Section 基本情報

- [x] PAR056 Card titled "基本情報" — src: position-form.tsx:403-406
- [x] PAR057 Field 職位名: required marker, input placeholder "例: 正社員（フロント）", inline error "職位名を入力してください", aria-invalid on error, error clears once non-blank text is entered — src: position-form.tsx:344-346, 410-417
- [x] PAR058 Field 対象ロール: required marker, helper description "この職位が属するロールを選択します。ロールにより利用できる機能の範囲が決まります", select placeholder "選択してください", max-w-280, inline error "対象ロールを選択してください" — src: position-form.tsx:347, 420-437
- [x] PAR059 Role options exactly: 本部 / マネージャー (Manager) / スタッフ (Staff) / トレーナー (Trainer) / 閲覧のみ (Observer) — no System option. NOTE (clarified 2026-07-16, deliberate deviation from V0): in edit mode the selector shows the current role but renders disabled (role immutable after creation); create/clone keep it enabled — src: position-form.tsx:439-445
- [x] PAR060 Field 説明: optional textarea, placeholder "職位の説明を入力（任意）", min-h-80, max 500 chars (BE contract v0.3) — src: position-form.tsx:450-456
- [x] PAR061 Edit mode prefill: name, role, description, and permission map populated from the existing position — src: position-form.tsx:333-337, 454
- [x] PAR062 Create mode: all permission toggles OFF initially; CSV toggles re-seed to the selected role's default (本部/マネージャー → ON, others → OFF) on every role change before save; prefilled (edit/clone) forms never re-seed — src: position-form.tsx:173-198, 425-434

## Form — Section 権限設定

- [x] PAR063 Card titled "権限設定" with one accordion item per category, all expanded by default. NOTE (2026-07-29): the categories/labels/order come from `GET /crm/permissions` (FR-009a), not a hardcoded FE list; a row-shaped skeleton shows while the catalog loads — src: position-form.tsx:462-478
- [x] PAR064 Category order and toggle counts: 会員管理(4) → 入退館管理(2) → 入会申請管理(3) → レッスン管理(3) → 施設設備管理(3) → 売上管理(4) → 商材施策設定(3) → コンテンツ(3) → システム設定(8) → CSV出力管理(3) = 36 total. Served by the catalog endpoint in this order; the BE contract holds 58 across the same 10 categories (decision 2026-07-29 keeps the rendered set at the prototype's 36) — src: position-form.tsx:56-154
- [x] PAR065 システム設定 category includes the four Y-02 store-item Staff-edit permissions with their helper descriptions: 店舗写真・フロアマップの編集 / 営業時間・休業日の編集 / 店舗基本情報の編集 / ゲートストップ設定の変更. NOTE: the first three are official BE flags as of v0.3; ゲートストップ設定の変更 (`can_edit_gate_stop`) remains an FE extension — open gap, spec Q5 — src: position-form.tsx:138-143
- [x] PAR066 CSV出力管理 (`csv_export`) permissions with descriptions: 会員CSV出力 / 入退館CSV出力 / アンケートCSV出力. NOTE: BE v0.3 also defines `can_export_accounting_csv` (会計CSV), which the prototype does not render and Phase 1 therefore omits — src: position-form.tsx:145-153
- [x] PAR067 Category trigger: label + secondary badge "{on} / {total}" + right-side bulk control labeled 全ON (all on) / 全OFF, small switch, clicks don't collapse the accordion — src: position-form.tsx:276-302
- [x] PAR068 Bulk switch sets every permission in that category to the chosen value — src: position-form.tsx:376-385
- [x] PAR069 Permission row: label (sm) + optional description (xs muted) left, Switch right, rows divided by borders — src: position-form.tsx:246-260, 303-315
- [x] PAR070 Every input/toggle interaction marks the form dirty — src: position-form.tsx:369-384, 414, 423

## Form — Footer, Validation & Dialogs

- [x] PAR071 Footer (top border): キャンセル outline button (runs discard guard) + primary submit labeled 登録する (create/clone) or 変更を保存する (edit), both size lg — src: position-form.tsx:483-493
- [x] PAR072 On invalid submit: footer summary "未入力の項目があります" (destructive, left-aligned via mr-auto) and smooth scroll to the first aria-invalid field — src: position-form.tsx:351-360, 484-486
- [x] PAR073 On valid submit: success toast "職位を登録しました" (create/clone) or "職位の変更を保存しました" (edit), dirty cleared, navigate back to list — src: position-form.tsx:362-366
- [x] PAR074 Discard dialog: title "変更を破棄しますか？", body "未保存の変更はすべて失われます。この操作は取り消せません。", buttons 編集を続ける / 破棄する; shown only when dirty — src: position-form.tsx:499-512
