# UI Parity Checklist: Blog List (ブログ一覧)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `fitness-crm-ui/src/pages/blog-list.tsx`@47d60ac (as recorded in spec.md header)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Page header

- [x] PAR001 Page title "ブログ管理" with a count of articles in the current view scope — src: blog-list.tsx:L414-L417
- [x] PAR002 Outline button "カテゴリマスタを編集" with FolderOpen icon; enabled for Headquarter / System only, otherwise disabled with tooltip "カテゴリマスタ管理は本部のみ操作できます"; navigates to the category master with origin "blog" — src: blog-list.tsx:L420-L430
- [x] PAR003 Primary button "新規登録" with Plus icon; enabled for Headquarter / System / Manager / Staff, otherwise disabled with tooltip "ブログ作成の権限がありません"; navigates to blog form — src: blog-list.tsx:L431-L440
- [x] PAR004 Button order in header: カテゴリマスタを編集 then 新規登録 — src: blog-list.tsx:L419-L441

## Toolbar

- [x] PAR005 Search input with Search icon, placeholder "タイトルで検索...", max width ~400px; typing resets to page 1 — src: blog-list.tsx:L452-L462
- [x] PAR006 Filter toggle button right-aligned: label "詳細フィルター" when closed / "閉じる" when open, SlidersHorizontal icon, ChevronDown / ChevronUp icon — src: blog-list.tsx:L463-L478
- [x] PAR007 Filter toggle uses filled (default) variant and shows a secondary count badge when ≥1 filter is active; outline variant otherwise — src: blog-list.tsx:L464-L476
- [x] PAR008 Active filter count includes category, brand, destination, status, scope, publishFrom, publishTo, and store only when the header store selector is on all stores — src: blog-list.tsx:L257-L268

## Detailed filters (expanded)

- [x] PAR009 Filters appear in order: カテゴリ, ブランド, 配信範囲, 店舗, 掲載先, ステータス, 公開日 range — src: blog-list.tsx:L482-L579
- [x] PAR010 カテゴリ select options: 全カテゴリ (default), 未分類, then blog categories — src: blog-list.tsx:L484-L499
- [x] PAR011 ブランド select options: 全ブランド (default), JOYFIT, JOYFIT+, JOYFIT YOGA, JOYFIT24, FIT365 — src: blog-list.tsx:L500-L512 — spec extension (Clarification Q3): a sub-brand selection also returns JOYFIT whole-brand articles; JOYFIT returns all JOYFIT articles (V0 matches the brand name exactly)
- [x] PAR012 配信範囲 select options: 全配信範囲 (default), 全社, ブランド指定, 店舗指定 — src: blog-list.tsx:L513-L524
- [x] PAR013 店舗 select: 全店舗 (default) + accessible stores; rendered only when header store selector is "all" — src: blog-list.tsx:L525-L539 — spec extension (Clarification Q4): selecting a store returns every article reaching it (全社 + its brand's ブランド指定 + its 店舗指定), not 店舗指定 rows only as in V0
- [x] PAR014 掲載先 select options: 全掲載先 (default), WEBサイト, モバイルアプリ — src: blog-list.tsx:L540-L549
- [x] PAR015 ステータス select options: 全ステータス (default), 公開中, 公開予定, 下書き, 非公開, 削除済み（ゴミ箱） — src: blog-list.tsx:L550-L562
- [x] PAR016 公開日 range: two date pickers, placeholders "公開日（開始）" / "公開日（終了）", separated by "〜" — src: blog-list.tsx:L563-L578
- [x] PAR017 Each filter control whose value differs from default is highlighted (primary border + tinted background) — src: blog-list.tsx:L202-L206, L485, L569, L576
- [x] PAR018 Changing any filter resets to page 1 — src: blog-list.tsx:L484-L577

## Filter result banner

- [x] PAR019 Banner shown when any filter or search is active; shows filtered count vs scoped total, condition summary joined with "・" (search in quotes, "公開日From: …" / "公開日To: …"), and a clear action that resets search + all filters + page — src: blog-list.tsx:L269-L280, L297-L309, L583-L589

## Table — header

- [x] PAR020 Column order: ID, (thumbnail, no label), タイトル, カテゴリ, 配信スコープ, 対象, 掲載先, 公開日, ステータス, WP連携, (menu, no label) — src: blog-list.tsx:L594-L620
- [x] PAR021 Sortable headers: ID, タイトル, 配信スコープ, 対象, 公開日, ステータス; non-sortable: カテゴリ, 掲載先, WP連携 — src: blog-list.tsx:L596-L618
- [x] PAR022 Sort header shows ArrowUpDown (muted) when unsorted, ArrowUp / ArrowDown when active; tooltip "クリックで昇順ソート" / "クリックで降順ソート"; first click ascending, toggles thereafter; resets page 1 — src: blog-list.tsx:L287-L295, L379-L406
- [x] PAR023 Header row is sticky with muted background — src: blog-list.tsx:L595-L619

## Table — row

- [x] PAR024 Row is clickable (pointer, hover background) and navigates to blog detail; clicks in the menu cell do not navigate — src: blog-list.tsx:L648-L652, L734
- [x] PAR025 ID cell shows `BL-YYYY-NNNN` in muted small text — src: blog-list.tsx:L653
- [x] PAR026 Thumbnail cell: 48×32 rounded image when present; dashed placeholder with ImageIcon when absent — src: blog-list.tsx:L654-L663
- [x] PAR027 Title cell: title text; 削除済み destructive outline badge next to it for deleted rows — src: blog-list.tsx:L665-L670
- [x] PAR028 Category cell: secondary badge with name; dashed muted "未分類" badge when no category — src: blog-list.tsx:L671-L677
- [x] PAR029 配信スコープ cell: badge 全社 (default variant) / ブランド指定 (secondary) / 店舗指定 (outline) — src: blog-list.tsx:L168-L177, L678-L680
- [x] PAR030 対象 cell: "全ブランド・全店舗" muted text for 全社; brand badge otherwise; store name as muted sub-text under the badge for 店舗指定 — src: blog-list.tsx:L681-L693
- [x] PAR031 掲載先 cell: outline badge Globe + "WEB" and/or Smartphone + "アプリ" — src: blog-list.tsx:L694-L707
- [x] PAR032 公開日 cell: `YYYY/MM/DD HH:mm`, "—" when none — src: blog-list.tsx:L708
- [x] PAR033 ステータス badge colours: 公開中 success, 公開予定 info, 下書き muted, 非公開 warning, 削除済み destructive — src: blog-list.tsx:L138-L151, L709-L711
- [x] PAR034 WP連携 cell: Check + "同期済み" muted outline badge with tooltip "最終同期 {日時}" for sync targets; muted "—" for non-targets (WEB off, or 下書き / 公開予定 / 削除済み) — src: blog-list.tsx:L184-L188, L712-L733 — spec extension (Clarification Q1): also 同期失敗 and 未同期 badges, not in V0
- [x] PAR035 Deleted rows rendered at reduced opacity — src: blog-list.tsx:L650

## Row menu

- [x] PAR036 Menu trigger: MoreHorizontal icon button (32×32) — src: blog-list.tsx:L735-L738
- [x] PAR037 Non-deleted menu order: プレビュー (Eye) · 編集 (Pencil) · separator · 非公開にする (Ban, warning colour) when 公開中/公開予定 OR 公開にする (Globe, success colour) when 下書き/非公開 · separator · 削除 (Trash2, destructive colour) — src: blog-list.tsx:L740-L775
- [x] PAR038 編集 / 公開にする / 非公開にする enabled for HQ / System / Manager; for Staff only when they are the author; disabled otherwise with marker "他者作成" (Staff non-author) or "本部" — src: blog-list.tsx:L641-L646, L744-L765
- [x] PAR039 削除 enabled for HQ / System / Manager only — src: blog-list.tsx:L767-L774
- [x] PAR040 Deleted-row menu shows only 復元する (RotateCcw, success colour) — src: blog-list.tsx:L777-L787 — spec extension (Clarification Q2): enabled for HQ / System / Manager only, disabled with role marker otherwise (V0 leaves it ungated)
- [x] PAR041 Restore result: status 非公開 + toast "記事を復元しました" / "非公開の状態で復元されています" — src: blog-list.tsx:L780-L783

## Dialogs

- [x] PAR042 Unpublish dialog: title "記事を非公開にしますか？", description "この記事は公開中の状態から非公開に変更されます。WEBサイトやアプリから表示されなくなります。", buttons キャンセル / 非公開にする; on confirm status 非公開 + toast "記事を非公開にしました" — src: blog-list.tsx:L799-L824
- [x] PAR043 Publish dialog: title "記事を公開しますか？", description "この記事は即時公開され、WEBサイトやアプリに表示されるようになります。", buttons キャンセル / 公開する; on confirm status 公開中 (publish date filled if empty) + toast "記事を公開しました" — src: blog-list.tsx:L826-L857
- [x] PAR044 Delete dialog: title "記事を削除しますか？", description "削除した記事はゴミ箱に移動されます。一定期間内であれば復元できます。", buttons キャンセル / 削除する (destructive); on confirm status 削除済み + toast "記事を削除しました" / "ゴミ箱に移動しました。一定期間内であれば復元できます" — src: blog-list.tsx:L859-L885
- [x] PAR045 Dialogs are controlled: closing / キャンセル clears the target and changes nothing — src: blog-list.tsx:L800-L803, L827-L830, L860-L863

## Preview dialog

- [x] PAR046 Dialog title "プレビュー", wide (max-w-4xl), scrollable; tabs PC (Monitor) / モバイル (Smartphone), PC default — src: blog-list.tsx:L939-L954
- [x] PAR047 PC tab: browser frame with URL bar "https://www.joyfit.jp/blog/{id}", category badge, title, publish date or "未公開", image placeholder, body placeholder "記事の本文がここに表示されます...", note "※ 実際のWEBサイト表示と異なる場合があります" — src: blog-list.tsx:L956-L988
- [x] PAR048 モバイル tab: 375px phone frame with status bar "9:41", section label "ブログ", image placeholder, category badge, title, body placeholder, publish date or "未公開", note "※ 実際のアプリ表示と異なる場合があります" — src: blog-list.tsx:L990-L1018

## Empty states

- [x] PAR049 No rows + no filters: empty state for entity "ブログ", no action — src: blog-list.tsx:L623-L636
- [x] PAR050 No rows + filters/search active: filtered empty state with outline button "条件をクリア" — src: blog-list.tsx:L627-L633

## Pagination footer

- [x] PAR051 Left text "全 {N} 件 / {P} ページ / {a}-{b} を表示" (a = 0 when empty) — src: blog-list.tsx:L888-L891
- [ ] PAR052 Center pagination: previous / next disabled at bounds; page numbers with ellipsis rules (≤7 all; near start 1-4…last; near end 1…last-3..last; middle 1…p-1,p,p+1…last) — src: blog-list.tsx:L211-L216, L892-L922 — ⏸ Deferred: accepted deviation (decision 2026-11-13): the shared `TablePaginationWithSize` (used by ~47 screens) keeps its ±1 window (page 2 of 10 → 1 2 3 … 10; page 9 → 1 … 8 9 10); not changed for one screen. Prev/next bounds verified.
- [x] PAR053 Right "表示件数" select: 25件 / 50件 / 100件, default 50; changing resets to page 1 — src: blog-list.tsx:L209, L254, L923-L933

## Store view scope

- [x] PAR054 When header store selector is a single store, rows show 全社 + ブランド指定 articles and only 店舗指定 articles of that store; header count reflects this scoped set — src: blog-list.tsx:L222-L227, L311-L315, L417 — spec extension (Clarification Q4): ブランド指定 rows are limited to the selected store's brand (V0 keeps every brand)
