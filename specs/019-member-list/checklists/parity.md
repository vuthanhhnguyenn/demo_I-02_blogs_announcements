# UI Parity Checklist: Member Management (List)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: dx-fitness/fitness-crm-ui `src/pages/member-list.tsx`@`46253e3` (2026-09-09; the list was rewritten at `1cc2d6d`, then changed again at `6bc1f1c`)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Page shell & header

- [ ] PAR001 Sidebar rendered with member-list marked as current page — src: member-list.tsx:L582
- [ ] PAR002 Shared top header rendered above content — src: member-list.tsx:L584
- [ ] PAR003 Page header in "outside" mode, title "会員一覧", count = filtered member count, unit "名" — src: member-list.tsx:L587-L592
- [ ] PAR004 Main content area scrolls independently; page shell is fixed height (`max-h-svh` overflow hidden) — src: member-list.tsx:L583, L594
- [ ] PAR005 Content wrapped in a single Card (`py-0 gap-0`) containing toolbar, table, and pagination footer — src: member-list.tsx:L598

## Toolbar — search & filter toggle

- [ ] PAR006 Search input with leading search icon — src: member-list.tsx:L602-L613
- [ ] PAR007 Search placeholder verbatim: "会員ID・氏名・カナ・電話番号・メールアドレス・旧会員Noで検索" — src: member-list.tsx:L606
- [ ] PAR008 Typing in search resets page to 1 — src: member-list.tsx:L608-L611
- [ ] PAR009 "詳細フィルター" toggle button; label switches to "閉じる" when open — src: member-list.tsx:L615-L629
- [ ] PAR010 Filter button variant is `default` when active filters > 0, else `outline`; sliders icon leading — src: member-list.tsx:L616, L621
- [ ] PAR011 Active-filter count badge shown on filter button when count > 0 — src: member-list.tsx:L623-L627
- [ ] PAR012 Chevron up/down icon reflects open/closed state — src: member-list.tsx:L628

## Bulk action bar (HQ/System only, when selection > 0)

- [ ] PAR013 Bulk bar renders only when `canBulkChange` (Headquarter/System) AND at least one row selected — src: member-list.tsx:L634
- [ ] PAR014 Bar is sticky at top of scroll area with primary-tinted background — src: member-list.tsx:L635
- [ ] PAR015 "{n}名選択中" label (total selected across pages) — src: member-list.tsx:L636-L638
- [ ] PAR016 "（このページで {m}名）" sub-count of selected-on-current-page — src: member-list.tsx:L639-L641
- [ ] PAR017 "選択解除" ghost button clears selection and turns off show-selected-only — src: member-list.tsx:L642-L651
- [ ] PAR018 "選択中のみ表示" toggle with eye icon narrows list to selected members — src: member-list.tsx:L654-L663
- [ ] PAR019 "主契約を変更（{n}名）" primary button with shuffle icon opens bulk dialog — src: member-list.tsx:L665-L668

## Detailed filter panel (expandable)

- [ ] PAR020 Panel visible only when filter toggle is open — src: member-list.tsx:L673
- [ ] PAR021 Store filter shown only when 2+ accessible stores AND the header scope is 全店舗 (`showStoreScopeFilter`); under a specific header store scope it is not rendered at all — src: member-list.tsx:L416, L701-L717
- [ ] PAR022 Store filter options: "全店舗" + each accessible store name — src: member-list.tsx:L685-L688
- [ ] PAR023 Status filter options: 全ステータス / 有効 / 休会中 / 退会予定 / 退会済み / ゲートストップ — src: member-list.tsx:L692-L704
- [ ] PAR024 Primary-contract-plan filter (label "全プラン"…): 全プラン / レギュラー会員 / デイタイム会員 / ナイト会員 / ウィークエンド会員 / プレミアム会員 — src: member-list.tsx:L705-L718
- [ ] PAR025 Brand filter options: 全ブランド / FIT365 / JOYFIT — src: member-list.tsx:L719-L728
- [ ] PAR026 Join-period filter options: 全期間 / 今月 / 先月 / 今年 / 昨年 — src: member-list.tsx:L729-L740
- [ ] PAR027 Last-visit filter options: 全期間（最終来館日） / 直近1週間 / 直近2週間 / 3週間以上来館なし / 1ヶ月以上来館なし — src: member-list.tsx:L741-L752
- [ ] PAR028 Promotion-code filter: 全プロモコード + one option per issued promotion code, each showing the code with its campaign name beneath — src: member-list.tsx:L753-L764. **Deviation from V0, intentional**: the mockup hard-codes three campaign-name strings (春の入会キャンペーン2023 / 夏のキャンペーン2023 / ウェルカム500円割引) as demo data, naming no data source; G-06 FR-011 filters on the promotion code used at enrollment, so the options are loaded from the promotion-code master and labelled by code. Tick this item against the code-based list, not the mockup's three names.
- [ ] PAR029 Each filter trigger shows active styling (primary border/tint) when value differs from its default — src: member-list.tsx:L330-L334, L681, L693, L707, L720, L730, L742, L755
- [ ] PAR030 Changing any filter resets page to 1 — src: member-list.tsx:L678, L692, L706, L719, L729, L741, L754
- [ ] PAR031 Last-visit filter pre-initialized from `lastVisit` URL param (1w/2w/3w-plus/1m-plus) — src: member-list.tsx:L282-L293, L360

## Filter result banner

- [ ] PAR032 Result banner shown when any filter active OR search non-empty — src: member-list.tsx:L578, L769-L775
- [ ] PAR033 Banner shows scoped total, matched count, condition summary, and a clear action — src: member-list.tsx:L770-L774
- [ ] PAR034 Summary excludes header-scope store (single-store view) and includes only the HQ store filter when applicable — src: member-list.tsx:L404-L415

## Member table — header

- [ ] PAR035 Header row sticky with muted background — src: member-list.tsx:L781
- [ ] PAR036 Selection header checkbox column shown only for HQ/System; supports indeterminate state — src: member-list.tsx:L782-L791
- [ ] PAR037 Column order: [checkbox (HQ)] 会員ID / 氏名 / [店舗名 — 全店舗 scope only] / ステータス / 主契約 / 入会日 / 最終来館日 / [action] — src: member-list.tsx:L792-L894
- [ ] PAR038 "会員ID" sortable header with sort-direction icon and tooltip — src: member-list.tsx:L792-L811
- [ ] PAR039 "氏名" sortable header with sort icon and tooltip — src: member-list.tsx:L812-L831
- [ ] PAR040 "店舗名" plain (non-sortable) header, rendered ONLY while the header store scope is 全店舗 (`showStoreColumn`) — src: member-list.tsx:L417, L858-L860
- [ ] PAR041 "ステータス" sortable header with sort icon and tooltip — src: member-list.tsx:L833-L852
- [ ] PAR042 "主契約" plain (non-sortable) header — src: member-list.tsx:L853
- [ ] PAR043 "入会日" sortable header with sort icon and tooltip — src: member-list.tsx:L854-L873
- [ ] PAR044 "最終来館日" sortable header with sort icon and tooltip — src: member-list.tsx:L874-L893
- [ ] PAR045 Trailing empty header cell for row action column — src: member-list.tsx:L894
- [ ] PAR046 Sort tooltip copy toggles "クリックで昇順ソート"/"クリックで降順ソート" per current state — src: member-list.tsx:L808
- [ ] PAR047 Unsorted columns show muted ArrowUpDown icon that darkens on hover — src: member-list.tsx:L804
- [ ] PAR048 Clicking a sorted column toggles asc/desc; switching columns starts at asc and resets page to 1 — src: member-list.tsx:L373-L381

## Member table — body states

- [ ] PAR049 Loading state renders 7 skeleton rows matching column layout (incl. HQ checkbox cell) — src: member-list.tsx:L898-L932
- [ ] PAR050 Empty state: variant "filtered" (with "条件をクリア" button) when search/filters active, else variant "empty" — src: member-list.tsx:L933-L946
- [ ] PAR051 Empty-state cell spans all columns (9 for HQ, else 8) — src: member-list.tsx:L935

## Member table — data row

- [ ] PAR052 Row is clickable → navigates to member-detail with memberId; hover highlight — src: member-list.tsx:L950-L953
- [ ] PAR053 Row selection checkbox cell (HQ only); cell click stops row navigation — src: member-list.tsx:L955-L963
- [ ] PAR054 会員ID cell: monospace, muted — src: member-list.tsx:L964
- [ ] PAR055 氏名 cell: medium-weight name — src: member-list.tsx:L965-L967
- [ ] PAR056 店舗名 cell, present only when the 店舗名 column is (PAR040) — src: member-list.tsx:L968
- [ ] PAR057 ステータス cell: outline badge with status-specific color class — src: member-list.tsx:L969-L976
- [ ] PAR058 Status badge shows a colored leading dot only for statuses where `shouldShowMemberStatusDot` is true — src: member-list.tsx:L971-L973
- [ ] PAR059 主契約 cell — src: member-list.tsx:L977
- [ ] PAR060 入会日 cell: muted — src: member-list.tsx:L978
- [ ] PAR061 最終来館日 cell — src: member-list.tsx:L979
- [ ] PAR062 Row action dropdown (MoreHorizontal trigger); cell click stops row navigation — src: member-list.tsx:L980-L995
- [ ] PAR063 Dropdown "編集" item with pencil icon, role-gated to Headquarter/System, navigates to member-form — src: member-list.tsx:L1019-L1046
- [ ] PAR063a Dropdown "編集" is disabled with tooltip 「退会済みのため編集できません」 for a withdrawn member — src: member-list.tsx:L1020-L1039 (added at `6bc1f1c`)

## Pagination footer

- [ ] PAR064 Summary text "全 {total} 件 / {pages} ページ / {start}-{end} を表示" — src: member-list.tsx:L1007-L1009
- [ ] PAR065 Pagination with "前へ" previous (disabled/dimmed on first page) — src: member-list.tsx:L1014-L1020
- [ ] PAR066 Numbered page links with active-page highlight — src: member-list.tsx:L1021-L1037
- [ ] PAR067 Ellipsis rendered for large page ranges (max 7 visible, leading/trailing ellipsis) — src: member-list.tsx:L558-L571, L1022-L1025
- [ ] PAR068 "次へ" next (disabled/dimmed on last page) — src: member-list.tsx:L1038-L1044
- [ ] PAR069 Navigating pages scrolls to top smoothly — src: member-list.tsx:L553-L556
- [ ] PAR070 Page-size selector "表示件数" with options 25/50/100/200件 (default 50) — src: member-list.tsx:L1048-L1061, L337, L364
- [ ] PAR071 Changing page size resets to page 1 — src: member-list.tsx:L548-L551

## Select-all confirmation dialog (2-step)

- [ ] PAR072 Ticking header checkbox when result spans >1 page selects current page then opens select-all dialog — src: member-list.tsx:L491-L514
- [ ] PAR073 Dialog title "該当する全件を選択しますか？" — src: member-list.tsx:L1072
- [ ] PAR074 Dialog description states the full matching count and the current-page count, verbatim structure — src: member-list.tsx:L1073-L1078
- [ ] PAR075 "このページのみ選択" cancel action keeps current-page selection — src: member-list.tsx:L1081
- [ ] PAR076 "{n}件すべてを選択" confirm action selects all members in filtered list — src: member-list.tsx:L1082-L1084, L517-L520

## Bulk primary-contract change dialog (FR-020)

- [ ] PAR077 Dialog title "主契約の一括変更" — src: member-list.tsx:L1093
- [ ] PAR078 Description: "選択した {n} 名の主契約を一括で変更します。変更は翌月月初から適用されます。" — src: member-list.tsx:L1094-L1097
- [ ] PAR079 "変更先の主契約" select with required marker, placeholder "選択してください" — src: member-list.tsx:L1102-L1119
- [ ] PAR080 Contract options show name + formatted price "（¥{price}）" from contract master — src: member-list.tsx:L1112-L1116, L86-L92
- [ ] PAR081 Change preview block (shown after target chosen): "変更後: {name} ¥{price}" and "適用開始: {date}（翌月月初）" — src: member-list.tsx:L1121-L1138
- [ ] PAR082 Target member preview labeled "対象会員プレビュー（全 {n} 名）" — src: member-list.tsx:L1141-L1144
- [ ] PAR083 Preview lists up to 5 members: id (mono) / name / current contract → arrow → target contract — src: member-list.tsx:L1146-L1163
- [ ] PAR084 "他 {n} 名" overflow line when more than 5 selected — src: member-list.tsx:L1164-L1168
- [ ] PAR085 "キャンセル" cancel and "実行" execute actions; execute disabled until a target contract is chosen — src: member-list.tsx:L1173-L1181
- [ ] PAR086 Executing shows success toast "{n}名の主契約を変更しました（{date} 適用）" and clears selection/show-selected-only — src: member-list.tsx:L527-L534
