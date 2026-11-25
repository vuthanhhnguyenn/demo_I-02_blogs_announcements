# UI Parity Checklist: Visit/Experience Management — List Page

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` → `src/pages/visit-experience-list.tsx`@c1c7e2e (as recorded in spec.md header)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Page Shell

- [ ] PAR001 Sidebar — `SharedSidebar` with `currentPage="visit-experience-list"` — src: visit-experience-list.tsx:L381
- [ ] PAR002 Shared header — `SharedHeader` — src: visit-experience-list.tsx:L383
- [ ] PAR003 Page title — "見学・体験管理" — src: visit-experience-list.tsx:L385

## KPI Cards

- [ ] PAR004 KPI card "本日申込" — value + "件" suffix, sub-label "当日の見学申込数" — src: visit-experience-list.tsx:L393-398
- [ ] PAR005 KPI card "見学中" — value + "件" suffix, warning tone, sub-label "現在施設内" — src: visit-experience-list.tsx:L399-405
- [ ] PAR006 KPI card "入会申請済" — value + "件" suffix, success tone, sub-label "本日見学後に入会申請" — src: visit-experience-list.tsx:L406-412
- [ ] PAR007 KPI card "当日キャンセル" — value + "件" suffix, destructive tone only when count > 0 (default tone otherwise), sub-label "当日キャンセル数" — src: visit-experience-list.tsx:L413-419

## Toolbar

- [ ] PAR008 Quick-search input — placeholder "予約番号・氏名で検索...", leading Search icon, filters by 予約番号/氏名 — src: visit-experience-list.tsx:L427-438
- [ ] PAR009 "詳細フィルター" toggle button — label swaps "詳細フィルター" ↔ "閉じる", SlidersHorizontal icon, active-filter count badge, Chevron up/down icon swap — src: visit-experience-list.tsx:L440-458

## Expandable Filter Panel (visible only when toggle is open)

- [ ] PAR010 Status select — items: 全ステータス / 申込受付 / 申請者への確認待ち / BL照合結果あり・確認待ち / 見学中 / 見学終了 / 入会申請済 / キャンセル — src: visit-experience-list.tsx:L465-481
- [ ] PAR011 Brand select — items: 全ブランド / FIT365 / JOYFIT — src: visit-experience-list.tsx:L482-493
- [ ] PAR012 Store select (rendered only when acting user can view multiple stores) — items: 全店舗 / [accessible store names] — src: visit-experience-list.tsx:L494-506
- [ ] PAR013 Date-range select — items: 全期間 / 本日 / 直近3日 / 直近7日 — src: visit-experience-list.tsx:L507-519
- [ ] PAR014 Blacklist-match select — inline label "BL照合:", items: 全件 / 要注意者のみ — src: visit-experience-list.tsx:L520-532
- [ ] PAR015 Active-filter visual state — each select's trigger gets a primary-accent border/bg/text treatment when its value differs from default — src: visit-experience-list.tsx:L281-285

## Result Banner

- [ ] PAR016 Result banner — renders only when a filter or search is active; shows result count against the current scoped total, a plain-language filter summary, and a single clear action — src: visit-experience-list.tsx:L537-543

## Data Table

- [ ] PAR017 Table header row — sticky columns: 予約番号 / 氏名 / ステータス / BL照合 / ブランド / 店舗 (conditional) / 予約日時 / 見学開始 / 見学終了（予定/実績） — src: visit-experience-list.tsx:L546-560
- [ ] PAR018 Empty state, filtered variant — shown when zero rows AND a filter/search is active; includes "条件をクリア" action button — src: visit-experience-list.tsx:L563-576
- [ ] PAR019 Empty state, no-data variant — shown when zero rows AND no filter/search is active; no clear action rendered — src: visit-experience-list.tsx:L563-576
- [ ] PAR020 Table row — clickable (navigates to detail); destructive-tinted row background + hover state when `blMatch` true, plain hover otherwise — src: visit-experience-list.tsx:L578-587
- [ ] PAR021 予約番号 cell — muted small text — src: visit-experience-list.tsx:L588-590
- [ ] PAR022 氏名 cell — medium-weight text — src: visit-experience-list.tsx:L591-593
- [ ] PAR023 ステータス cell — outline badge, tone per status via `getStatusBadgeClass` — src: visit-experience-list.tsx:L594-601, L235-252
- [ ] PAR024 BL照合 cell — `BL一致` badge with AlertTriangle icon when `blMatch` true; "—" placeholder otherwise — src: visit-experience-list.tsx:L602-614
- [ ] PAR025 ブランド cell — outline badge — src: visit-experience-list.tsx:L615-619
- [ ] PAR026 店舗 cell (rendered only when acting user can view multiple stores) — src: visit-experience-list.tsx:L620-622
- [ ] PAR027 予約日時 cell — plain text — src: visit-experience-list.tsx:L623
- [ ] PAR028 見学開始 cell — value, or "—" placeholder when null — src: visit-experience-list.tsx:L624-628
- [ ] PAR029 見学終了（予定/実績） cell — shows `visitEndActual` with trailing "（実績）" label when present; otherwise `visitEndScheduled` with trailing "（予定）" label — src: visit-experience-list.tsx:L629-641

## Pagination Footer

- [ ] PAR030 Record-range summary text — "全 {total} 件 / {totalPages} ページ / {start}-{end} を表示" — src: visit-experience-list.tsx:L650-653
- [ ] PAR031 Pagination control — Previous (disabled state at first page) / numbered pages with ellipsis collapsing / Next (disabled state at last page) — src: visit-experience-list.tsx:L654-684
- [ ] PAR032 Page-size select — items: 25件 / 50件 / 100件 / 200件 — src: visit-experience-list.tsx:L685-695
