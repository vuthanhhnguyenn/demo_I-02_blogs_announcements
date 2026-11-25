# UI Parity Checklist: Leave & Withdrawal Management (A-03)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: dx-fitness/fitness-crm-ui @ `e99646c` (2026-08-05) — `src/pages/leave-list.tsx`, `src/pages/leave-detail.tsx` (plus the shared components they compose: `filter-result-banner.tsx`, `empty-state.tsx`, `brand-badge.tsx`, `role-gated-menu-item.tsx`, `role-gated-button.tsx`, `member-headup-card.tsx`, `status-card.tsx`, `suspension-history-strip.tsx`, `back-link.tsx`, `jargon-tip.tsx`)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

---

## List — Shell & Access Control

- [x] PAR001 Sidebar active state on 休会・退会管理 (`currentPage="leave-list"`), inside the 日々の業務 group under 会員管理 — src: leave-list.tsx:L473; shared-sidebar.tsx:L112
- [x] PAR002 Page shell: `SidebarInset` with `max-h-svh overflow-hidden`, shared header, then a scrollable `main` with `px-6 py-4` — src: leave-list.tsx:L474-L483
- [x] PAR003 Access-denied card for Trainer — centred card (`min-h-[400px]`), bold line "この画面を表示する権限がありません", muted line "休会・退会管理はトレーナーロールでは参照できません。"; table, filters and pagination are not rendered at all — src: leave-list.tsx:L486-L493
- [x] PAR004 Screen visible to Headquarter / System / Manager / Staff / Observer only — src: leave-list.tsx:L337

## List — Page Header

- [x] PAR005 `PageHeader outside` with title "休会・退会管理" and a count reflecting the **filtered** row count (not the scoped total) — src: leave-list.tsx:L477-L481

## List — Toolbar

- [x] PAR006 Search input, max width 400px, leading Search icon, placeholder "申請ID・会員名で検索", `text-xs`; every change resets the page to 1. Unlike V0 the match must be evaluated **server-side across the whole filtered set**, not client-side over the loaded page (resolved 2026-08-05, Q-05) — src: leave-list.tsx:L503-L514
- ~~PAR007 View ToggleGroup (一覧 / 月別ビュー)~~ — **removed 2026-08-05 (Q-11)**: no view toggle in Phase 1, the toolbar holds only the search box and the 詳細フィルター button — src: leave-list.tsx:L517-L529
- [x] PAR008 詳細フィルター toggle button, `h-8 text-xs`, SlidersHorizontal icon; label switches 詳細フィルター ⇄ 閉じる; variant switches outline ⇄ default while any filter is active — src: leave-list.tsx:L531-L545
- [x] PAR009 Active-filter count badge on that button (`secondary`, `h-5 px-1 text-[10px]`), rendered only when the count is greater than 0 — src: leave-list.tsx:L539-L543
- [x] PAR010 Chevron on that button: ChevronUp when the panel is open, ChevronDown when closed — src: leave-list.tsx:L544

## List — Expandable Filter Row

- [x] PAR011 種別 select, width 120px, options 全種別 / 休会 / 退会; resets page to 1 — src: leave-list.tsx:L552-L561
- [x] PAR012 ステータス select, width 160px, options 全ステータス / 休会予定 / 休会中 / 退会予定 / 退会処理待ち — the V0 処理完了 option is **omitted** per the 2026-08-05 clarification (Q-10); resets page to 1 — src: leave-list.tsx:L562-L574
- [x] PAR013 店舗 select, width 160px, rendered **only** when the header scope is all-stores AND the user can access 2+ stores; options 全店舗 plus every accessible store name — src: leave-list.tsx:L338, L575-L590
- [x] PAR014 ブランド select, width 130px, options 全ブランド plus all five brands (Joyfit / Joyfit24 / JoyfitYoga / JoyfitPlus / Fit365) — the V0 two-option list and its store-name-prefix matching are **not** reproduced (resolved 2026-08-05, Q-04) — src: leave-list.tsx:L591-L600
- [x] PAR015 予定日 select, width 120px, options 全期間 / 今月 / 来月 / 今年; unlike V0 the selection **must actually filter** — each preset resolves to an inclusive JST range (resolved 2026-08-05, Q-01; the V0 control is inert and that defect is not reproduced) — src: leave-list.tsx:L601-L611
- ~~PAR016 表示 select (heatmap-only filter)~~ — **removed 2026-08-05 (Q-11)** — src: leave-list.tsx:L612-L623
- [x] PAR017 Every filter trigger whose value differs from its default gets the active treatment `border-primary bg-primary/10 text-foreground` — src: leave-list.tsx:L325-L329
- [x] PAR018 Switching the header scope to a single store resets the in-screen 店舗 filter back to 全店舗 — src: leave-list.tsx:L375-L379
- [x] PAR019 Active-filter count covers the five in-screen filters and excludes the header store scope — src: leave-list.tsx:L382-L384

## List — Filter Result Banner

- [x] PAR020 Banner shown only when a filter is active or the search box is non-empty; sits inside the table Card directly under the toolbar; `role="status"`, `border-y bg-card px-4 py-2` — src: leave-list.tsx:L628-L634; filter-result-banner.tsx:L419-L421
- [x] PAR021 Banner copy "全 {scoped total} 件中 **{filtered count} 件**を抽出中" — the total is the header-scoped row count, before in-screen filters — src: leave-list.tsx:L630-L631; filter-result-banner.tsx:L422-L425
- [x] PAR022 Banner summary is a `・`-joined list in the order 種別 → ステータス → ブランド → "予定: {value}" → store (all-stores view only); the header store scope is deliberately excluded — src: leave-list.tsx:L387-L397
- [x] PAR023 条件をクリア button in the banner (ghost, `h-6 text-xs`, X icon) — src: filter-result-banner.tsx:L426-L429

## List — Table (一覧 view)

- [x] PAR024 Column set and order: 会員ID (100px) · 会員名 · ブランド (100px) · 店舗名 (all-stores view only) · ステータス (120px) · 申請日 (100px) · 予定日 (100px) · 終了日 (100px) · 未納金 (100px, right-aligned) · row-actions (56px, unlabelled) — src: leave-list.tsx:L642-L653
- [x] PAR025 Header row is sticky (`sticky top-0 z-10`) with `bg-muted/50`, `text-xs font-semibold` — src: leave-list.tsx:L641-L653
- [x] PAR026 Horizontal scroll wrapper around the table — src: leave-list.tsx:L637
- [x] PAR027 会員ID cell — `text-xs text-muted-foreground font-mono`, showing the member **number** (e.g. `JF-0005678`), never an internal UUID; the V0 `M-00101` values are placeholders (Q-15) — src: leave-list.tsx:L680
- [x] PAR028 会員名 cell — `text-sm font-medium hover:underline cursor-pointer`; clicking it opens the member detail and stops the row click from also firing — src: leave-list.tsx:L683-L691
- ~~PAR029 個別会費調整中 badge under the member name~~ — **removed 2026-08-05 (Q-12)**: not rendered in A-03; the concept belongs to A-01-01 (A-01 FR-006) — src: leave-list.tsx:L692-L696
- [x] PAR030 ブランド cell renders `BrandBadge` (outline, `text-[10px]`, brand-specific class) showing the record's own brand notation, e.g. `Joyfit24` rather than a `JOYFIT` group label (Q-04) — src: leave-list.tsx:L699; brand-badge.tsx:L688-L692
- [x] PAR031 店舗名 cell (`text-xs`) rendered only in the all-stores view — src: leave-list.tsx:L700-L702
- [x] PAR032 ステータス badge, four variants: 休会予定 outline `bg-warning/15 text-warning border-warning/20` + warning dot · 休会中 outline `bg-info/15 …` + info dot · 退会予定 outline `bg-destructive/15 …` + destructive dot · 退会処理待ち outline warning + warning dot; all `text-[10px]`, dot `size-1.5 rounded-full mr-1`. The V0 処理完了 plain-secondary variant is **omitted** per the 2026-08-05 clarification (Q-10) — completed applications never reach the list — src: leave-list.tsx:L217-L240, L703-L716
- [x] PAR033 申請日 cell — `text-xs text-muted-foreground` — src: leave-list.tsx:L717
- [x] PAR034 予定日 cell — `text-xs` (not muted) — src: leave-list.tsx:L718
- [x] PAR035 終了日 cell — `text-xs text-muted-foreground`, shows the end period or the em dash `—` — src: leave-list.tsx:L719-L721
- [x] PAR036 未納金 cell — right-aligned `text-xs`; `¥{n.toLocaleString()}` in `text-destructive font-medium` when > 0, `¥0` in `text-muted-foreground` when 0 — src: leave-list.tsx:L722-L724
- [x] PAR037 Row is clickable (`cursor-pointer hover:bg-muted/50`) and opens the application detail — src: leave-list.tsx:L675-L679
- [x] PAR038 Filtered empty state — `Empty variant="filtered"`, SearchX icon, "条件に一致する休会・退会がありません", plus a 条件をクリア outline button — src: leave-list.tsx:L657-L670; empty-state.tsx:L467-L487
- [x] PAR039 Plain empty state — `Empty variant="empty"`, PackageOpen icon, "休会・退会がまだありません", **no** action button — src: leave-list.tsx:L660-L667; empty-state.tsx:L467-L487
- [x] PAR040 Empty-state cell spans all columns — 10 in the all-stores view, 9 in the single-store view — src: leave-list.tsx:L659

## List — Row Actions (withdrawal rows only)

- [x] PAR041 Row-action cell swallows its own click so the row navigation does not fire — src: leave-list.tsx:L726
- [x] PAR042 Dropdown trigger (MoreHorizontal, `size-8 rounded-md hover:bg-muted`) rendered **only** when the row type is 退会; suspension rows show an empty action cell — src: leave-list.tsx:L727-L731
- [x] PAR043 Enabled 退会取り消し menu item with Undo2 icon, for 退会予定 + cancellable rows, role-gated to System / Headquarter / Manager / Staff — src: leave-list.tsx:L733-L739
- [x] PAR044 Disabled 退会取り消し item (`opacity-50 cursor-not-allowed`) with tooltip "利用開始日以降のため取り消し不可" for 退会予定 + non-cancellable rows — src: leave-list.tsx:L740-L756
- [x] PAR045 Disabled 退会取り消し item with tooltip "退会処理が開始されているため取り消し不可" for any other withdrawal state — src: leave-list.tsx:L757-L774
- [x] PAR046 Role-denied rendering — `opacity-50 cursor-not-allowed`, click suppressed, trailing 本部 badge (`h-4 px-1 text-[9px] rounded-sm`) — src: role-gated-menu-item.tsx:L552-L575

## List — Withdrawal Cancellation Dialog

- [x] PAR047 AlertDialog opens on 退会取り消し and closes on dismiss, clearing the target row — src: leave-list.tsx:L979-L980
- [x] PAR048 Title "退会取り消しを実行しますか？" — src: leave-list.tsx:L982
- [x] PAR049 Body: "**{member name}**（{member ID}）の退会申請を取り消します。" then a line break, then "取り消し後、会員ステータスは有効（通常）に戻ります。この操作は記録されます。" — the member name is bold — src: leave-list.tsx:L983-L991
- [x] PAR050 Footer: キャンセル (cancel) and 取り消しを実行する (action) — src: leave-list.tsx:L993-L1005
- [x] PAR051 Confirming shows the success toast "{member name} の退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。" and closes the dialog — src: leave-list.tsx:L996-L1001

## List — 月別ビュー (heatmap) — removed

**PAR052 through PAR066 were deleted by the 2026-08-05 clarification (Q-11)**, which took 月別ビュー out of Phase 1 (see `spec.md` → Out of Scope, and the retired FR-036 – FR-044). Their identifiers are retired rather than reused, so every PAR number cited elsewhere stays valid. Nothing in the heatmap is to be built: no view toggle, no month grid, no per-cell tooltip, no member grouping, no heatmap-only 表示 filter.

## List — Pagination Footer

- [x] PAR067 Footer bar `flex items-center justify-between px-4 py-3 border-t gap-4` beneath the table — src: leave-list.tsx:L914
- [x] PAR068 Summary text "全 {total} 件 / {pages} ページ / {start}-{end} を表示" (`text-xs muted`) — src: leave-list.tsx:L915-L917
- [x] PAR069 前へ control, dimmed and non-interactive on page 1 — src: leave-list.tsx:L922-L928
- [x] PAR070 次へ control, dimmed and non-interactive on the last page — src: leave-list.tsx:L946-L952
- [x] PAR071 Numbered page links with the active page highlighted; at most 7 entries — beyond that, first page + ellipsis + the window around the current page + ellipsis + last page — src: leave-list.tsx:L444-L456, L929-L945
- [x] PAR072 表示件数 select (`h-7 w-[72px] text-xs`) with options 25件 / 50件 / 100件 / 200件, defaulting to 50; changing it returns to page 1 — src: leave-list.tsx:L332, L349, L433-L436, L957-L969 — **200 option blocked on Q-06**
- [x] PAR073 Changing page scrolls the window to the top with smooth behaviour — src: leave-list.tsx:L438-L441
- [x] PAR074 The effective page clamps to the last available page when the current page exceeds the page count — src: leave-list.tsx:L428

---

## Detail — Shell & Page Header

- [x] PAR075 Sidebar active state on 休会・退会詳細 (`currentPage="leave-detail"`); same `SidebarInset` + shared-header shell as the list — src: leave-detail.tsx:L393-L395
- [x] PAR076 BackLink "休会・退会管理に戻る" with ChevronLeft (`text-xs muted hover:text-foreground`), returning to the list — src: leave-detail.tsx:L400-L405; back-link.tsx:L707-L715
- [x] PAR077 Title "{member name} さんの{type}申請" — src: leave-detail.tsx:L406
- [x] PAR078 Application-ID badge — `secondary`, `text-xs font-medium font-mono`, showing the human-readable application **number**, never a UUID; the V0 `LV-001` values are placeholders (Q-15) — src: leave-detail.tsx:L409-L411
- [x] PAR079 Status badge — plain `secondary` for 処理完了; otherwise outline with a leading `size-1.5` dot, using the same warning / info / destructive / warning palette as the list — src: leave-detail.tsx:L116-L124, L412-L421
- ~~PAR080 個別会費調整中 badge with a JargonTip~~ — **removed 2026-08-05 (Q-12)**: not rendered in A-03 — src: leave-detail.tsx:L422-L426

## Detail — Member Head-up Card

- [x] PAR081 Card `mb-4 py-0 gap-0`, content row `px-4 py-4 flex items-center gap-4` — src: member-headup-card.tsx:L273-L274
- [x] PAR082 Member photo `size-24 rounded-lg object-cover`, sourced from the member's face-photo URL (Q-15); the V0 `pravatar` fallback is placeholder-only — src: member-headup-card.tsx:L275-L279
- [x] PAR082a Head-up card data arrives with the application detail in a single request — no second member lookup (FR-057a, Q-15) — src: leave-detail.tsx:L433-L441
- [x] PAR083 Line 1 name (`text-base font-bold`), line 2 name kana (`text-xs muted`) — src: member-headup-card.tsx:L282-L284
- [x] PAR084 Line 3 identifiers (`text-xs muted font-mono`): "ID: {member number}", "旧No: {legacy member code}", "主契約店舗: {storeName}" — the ID is the member number, not a UUID (Q-15) — src: member-headup-card.tsx:L286-L290
- [x] PAR085 Line 4 badges: member type, and "主契約: {contractName}" — both outline `text-[10px] font-normal` — src: member-headup-card.tsx:L292-L297
- [x] PAR086 会員詳細を開く ghost button with ArrowUpRight, opening the member detail for this member — src: member-headup-card.tsx:L299-L307

## Detail — Layout

- [x] PAR087 Two-column layout: left column 60%, right column 40%, `flex gap-4`; the right column is `sticky top-0` — src: leave-detail.tsx:L137-L139, L335-L336
- [x] PAR088 The detail renders 申請情報 directly with **no** tab bar — src: leave-detail.tsx:L443-L444 — **see Q-14**

## Detail — 申請情報 Card

- [x] PAR089 Card title "申請情報" (`text-base font-semibold`); body is a 2-column grid `gap-x-8 gap-y-4` — src: leave-detail.tsx:L141-L146
- [x] PAR090 申請ID field — `text-sm font-medium font-mono` — src: leave-detail.tsx:L147-L150
- [x] PAR091 種別 field — outline badge `text-[10px]`, `bg-info/15 text-info border-info/20` for 休会 and `bg-destructive/15 …` for 退会 — src: leave-detail.tsx:L108-L114, L151-L156
- [x] PAR092 Third field label switches 休会開始月 ⇄ 退会予定日 by type — src: leave-detail.tsx:L157-L162
- [x] PAR093 Fourth field label switches 休会終了月 ⇄ 終了日 by type; the value is the em dash `—` for withdrawals — src: leave-detail.tsx:L163-L170
- [x] PAR094 理由 field spans both columns — src: leave-detail.tsx:L171-L174
- [x] PAR095 申請者 and 申請日時 fields — src: leave-detail.tsx:L175-L182

## Detail — 承認フロー Card

- [x] PAR096 Card title "承認フロー"; steps stacked with a `size-6` circular marker and a 1px vertical connector (`min-height: 24px`) between them — src: leave-detail.tsx:L188-L200
- [x] PAR097 Completed marker: `bg-success/15 border-success/30` with a `size-3` success Check; pending marker: `bg-muted border-border` with a muted Clock — src: leave-detail.tsx:L196-L221
- [x] PAR098 Step 1 申請 — always complete; caption "{appliedAt} {proxy applicant when proxied, else applicant}" — src: leave-detail.tsx:L195-L206
- [x] PAR099 Step 2 — label 休会承認 for suspensions / 退会承認 for withdrawals; **always complete**, captioned with the approval timestamp. The V0 incomplete branch (muted label + 承認待ち caption while the state is 申請中) is **not** reproduced: `申請中` is a prototype-only mock status with no counterpart in the A-03 contract, and an application only reaches this screen once approved (amended 2026-08-07, Q-16) — src: leave-detail.tsx:L209-L234
- [x] PAR100 Step 2's outgoing connector is rendered only for withdrawals — src: leave-detail.tsx:L222-L224
- [x] PAR101 Step 3 退会処理実行 — withdrawals only; complete only at 処理完了; caption 処理完了 when complete, 待機中 otherwise — src: leave-detail.tsx:L236-L261
- [x] PAR102 Timeline renders exactly two steps for suspensions and three for withdrawals, with **no** current-step highlight — matches V0 verbatim; the backend's `recess_start` / `recess_end` steps and its `state: "current"` marker are deliberately not rendered (resolved 2026-08-05, Q-03 — highlight deferred pending UI design) — src: leave-detail.tsx:L193-L262

## Detail — 代理申請情報 Card

- [x] PAR103 Card rendered **only** when the application was raised by proxy — src: leave-detail.tsx:L267
- [x] PAR104 Card title "代理申請情報"; 2-column grid with 代理申請者, 合意日時, 合意方法 — src: leave-detail.tsx:L268-L286
- [x] PAR105 合意方法 renders one of 来店 / 電話 / メール / LINE — src: leave-detail.tsx:L284; A-03.md:L145

## Detail — 関連情報 Card

- [x] PAR106 Card title "関連情報"; 2-column grid `gap-x-8 gap-y-4` — src: leave-detail.tsx:L292-L297
- [x] PAR107 First field label switches 休会費 ⇄ 退会手数料 by type; `text-sm font-medium`. Value is `¥{fee}/月` for suspensions and — unlike V0, which hardcodes `—` — the withdrawal's **actual fee amount** for withdrawals (resolved 2026-08-05, Q-07; V0 L303 is a display defect and is not reproduced) — src: leave-detail.tsx:L298-L305
- [x] PAR108 適用キャンペーン field — src: leave-detail.tsx:L306-L309
- [x] PAR109 未消化レッスン field, rendered as "{n}回", shown for **both** application types (resolved 2026-08-05, Q-07) — ⚠️ suspension-side data depends on the backend adding `relatedInfo.unusedLessonCount` to the suspension detail; see spec.md → Assumptions — src: leave-detail.tsx:L310-L313
- [x] PAR110 未納金 field — `¥{n.toLocaleString()}`, `text-destructive` when > 0 — src: leave-detail.tsx:L314-L319

## Detail — 休会・退会履歴 Strip

- [x] PAR111 Card title "休会・退会履歴" — src: leave-detail.tsx:L326; suspension-history-strip.tsx:L113
- [x] PAR112 Twelve-month visible window running from anchor − 6 through anchor + 5, anchored on the current month by default — src: suspension-history-strip.tsx:L61-L86
- [x] PAR113 Period label "{window start} 〜 {window end}" (`tabular-nums text-xs muted`) between the two nav buttons — src: suspension-history-strip.tsx:L135-L137
- [x] PAR114 Previous / next period buttons (`size-8 p-0` ghost, ChevronLeft / ChevronRight, `aria-label` 前の期間 / 次の期間), disabled at the ends of the navigable range (current month − 24 … + 12) — src: suspension-history-strip.tsx:L70-L75, L126-L146
- [x] PAR115 今へ戻る ghost button (`h-7 text-xs text-primary`) shown **only** while the current month is outside the visible window — src: suspension-history-strip.tsx:L116-L125
- [x] PAR116 Per-cell badge row of fixed height 34px, bottom-aligned, so all month blocks share a top edge — src: suspension-history-strip.tsx:L166
- [x] PAR117 今月 badge (`bg-primary text-primary-foreground text-[9px]`) on the current month, plus the cell highlight `rounded-md bg-primary/5 px-1.5` — src: suspension-history-strip.tsx:L163, L168-L170
- [x] PAR118 State badges: 休会中 (info) / 休会予定 (warning) / 退会予定 (destructive), all outline `text-[9px] px-1 py-0` — src: suspension-history-strip.tsx:L172-L180
- [x] PAR119 Application ID line under the badges (`text-[9px] muted font-mono`), with a 14px spacer keeping alignment when absent — src: suspension-history-strip.tsx:L185-L190
- [x] PAR120 Month block (`w-full h-7 rounded-sm`) reading "{n}月" — solid fill on the current month (state-toned, or primary when normal), 20%-opacity tint on other months, muted when normal — src: suspension-history-strip.tsx:L193-L205
- [x] PAR121 Two-digit year line beneath every month block (`text-[10px] muted`) — src: suspension-history-strip.tsx:L207-L208
- [x] PAR122 Footer band (`bg-muted/50 rounded-b-xl border-t px-4 py-3`) with a three-item dot legend: 休会中 (info) / 休会予定 (warning) / 退会予定 (destructive) — src: suspension-history-strip.tsx:L217-L231
- [x] PAR123 他の申請一覧を見る link button in the footer, returning to the list — src: leave-detail.tsx:L329-L330; suspension-history-strip.tsx:L232-L238

## Detail — Status Card & Cancellation

- [x] PAR124 Card title "ステータス"; body centred, with a `size-20` tinted circle holding a `size-10` icon — src: status-card.tsx:L359-L366
- [x] PAR125 Tone / icon / label per state: 休会予定 warning + Clock · 休会中 info + PauseCircle · 退会予定 destructive + Clock · 退会処理待ち warning + XCircle · 処理完了 muted + CheckCircle — src: leave-detail.tsx:L87-L106
- [x] PAR126 Dotted status badge below the circle — outline, `text-xs font-medium gap-1`, `size-2` tone dot — src: status-card.tsx:L368-L375
- [x] PAR127 Meta line "最終更新: {updatedAt}" (`text-xs muted mt-3`, centred) — src: leave-detail.tsx:L341; status-card.tsx:L377-L384
- [x] PAR128 Action area rendered **only** for states 退会予定 and 処理完了, separated by `border-t mt-4 pt-4` — src: leave-detail.tsx:L134, L342-L365; status-card.tsx:L386-L391
- [x] PAR129 退会取り消し button for 退会予定 — full width, outline, role-gated to Headquarter / System / Manager / Staff, disabled once the usage start date has arrived — src: leave-detail.tsx:L345-L359
- [x] PAR130 That button's deny tooltip switches between "利用開始日以降のため取り消し不可" (date guard) and "退会取り消しの権限がありません" (role guard) — src: leave-detail.tsx:L350-L354
- [x] PAR131 Role-denied button rendering — `opacity-50 cursor-not-allowed`, `disabled`, `aria-disabled="true"`, wrapped in a tooltip — src: role-gated-button.tsx:L659-L677
- [x] PAR132 処理完了 shows the centred text "処理が完了しています" (`text-xs muted py-2`) instead of any button — src: leave-detail.tsx:L360-L362
- [x] PAR133 Detail cancellation dialog — title "退会を取り消しますか？", body "{member name} さんの退会予定を取り消します。", footer キャンセル / 取り消す — src: leave-detail.tsx:L369-L382
- [x] PAR134 Confirming the detail dialog performs the same cancellation as the list entry point, gives the same success/failure feedback, then refreshes the detail — V0 only closes the dialog, which is a defect and is not reproduced (resolved 2026-08-05, Q-08) — src: leave-detail.tsx:L379

---

## Notes

- **116 active parity items** (134 originally authored, minus 19 retired by the 2026-08-05 clarifications — PAR007, PAR016, PAR029, PAR052 – PAR066, PAR080 — plus PAR082a added). Retired identifiers are never reused, so every PAR number referenced elsewhere keeps its meaning.
- One item is tagged **blocked**: **PAR072** (page-size 200 vs. the API's `limit` cap of 100 — Q-06 still open). Resolve it before ticking; do not copy the V0 option list by default.
- **Several items deliberately depart from V0**, because the mockup contains defects the clarifications chose to fix rather than reproduce: PAR006 (search must be server-side), PAR014 (five brands, not a store-name prefix), PAR015 (the 予定日 filter must actually filter), PAR027 / PAR078 / PAR084 (real member and application numbers, not placeholders), PAR107 (real 退会手数料, not a hardcoded dash), PAR134 (confirm must cancel). Each says so inline — read the item, don't diff against V0 alone.
- Items citing a shared component (`filter-result-banner.tsx`, `empty-state.tsx`, `status-card.tsx`, `suspension-history-strip.tsx`, `member-headup-card.tsx`, `role-gated-*.tsx`, `brand-badge.tsx`, `back-link.tsx`) are satisfied by reusing the project's equivalent component, provided the props and copy match the V0 call site.
- **処理完了 is a detail-only state** (clarified 2026-08-05, Q-10). PAR012 and PAR032 were amended to omit it on the list side; the detail-side items (PAR079, PAR125, PAR128, PAR132) stand unchanged, since closed applications remain readable via their detail endpoints.

---

## Verification record — 2026-08-06

All 116 active items ticked. Verified against the running app (`next dev`, seeded mock DB) driven headlessly with Playwright, signing in as Headquarter, Manager, Staff, Observer and Trainer. Screens exercised: `/members/leaves` and `/members/leaves/{id}` for a suspension (`lv-001`), a cancellable withdrawal (`lv-002`), a withdrawal blocked by `usage_started` (`lv-006`), and one blocked by `batch_processing_started` (`lv-004`). Zero console or page errors in every pass.

Directly observed: column set and order, the four status badge variants, the sticky header, both empty states, the filter row and its highlight states, the filter-result banner and its summary order, `TablePaginationWithSize` with 25/50/100, sorting, the row-action menu (present on withdrawals, absent on suspensions, disabled with the right tooltip when blocked), both cancel dialogs and the full cancellation round-trip (toast, row removal, count 134 → 133), the detail header and badges, the head-up card, the 60/40 layout, the 2-step vs 3-step timeline, the proxy card with 合意方法 rendered as 来店, the real 退会手数料 amount, and the history strip including 今へ戻る appearing only once the current month leaves the window.

Two items rest on a mechanism rather than a direct sighting, and are recorded here rather than left implied:

- **PAR001 / PAR004 (Trainer denial card)** — the card exists with the specified copy, but a Trainer never reaches it: `/members/leaves` is mapped to `Permission.MembersLeavesView` in `permission.constants.ts`, so the project-wide route guard renders the shared 403 page first and the sidebar omits the entry entirely. The denial is therefore stricter than V0's, and the in-page card is defence in depth. This mirrors the terms screen, which is guarded the same way and also keeps its card.
- **PAR072 (page-size options)** — unblocked as the checklist anticipated: FR-031 settles it at 25/50/100, confirmed in the rendered selector, with 200 absent.

### Defect found and fixed during the sweep

The header store scope hid the 店舗名 column and the in-screen 店舗 filter without narrowing the query, so a Manager — whose role scope spans several managed stores — saw rows from all of them with no way to tell them apart. Fixed by sending the header selection as a new `scope_store_id` query parameter, distinct from the in-screen `store_id` filter so each lands on the correct side of the `total_all` cut (FR-024 vs FR-026). A Manager filtering by ステータス now reads 「全 12 件中 4 件」 against their selected store instead of 「全 39 件中 4 件」 against the whole managed set. See [contracts/list-leaves.md](../contracts/list-leaves.md) → "Why two store parameters"; the real endpoint needs the same distinction and it has gone to the API QA list.

### Correction — 2026-08-06 (card title typography)

The first sweep ticked PAR089, PAR096, PAR103, PAR106 and PAR124 on the _title text_ alone. The text matched, but the typography did not: V0 renders every card title on this screen at `text-base font-semibold`, while the project's ported cards used `text-sm`. The mismatch was visible on the built screen — the 休会・退会履歴 strip (ported fresh from the V0 component, so already correct) sat noticeably larger than the four cards beside it. Reported by the user, not caught by the sweep.

Fixed in `leave-detail-info.tsx` (申請情報 / 承認フロー / 代理申請情報 / 関連情報) and in the shared `src/components/common/status-card.tsx` (ステータス). All six titles now compute to `16px / 600`, verified in the browser.

The `status-card.tsx` change is deliberately outside A-03: that component is shared by ~13 detail screens, all of which also drifted from a V0 prototype that uses `text-base font-semibold`, so the single-line fix brings every one of them back into line rather than only this screen. Approved by the user before applying.

**Wider drift, not fixed here**: the project has no consistent card-title convention — 94 `text-base font-semibold`, 89 `text-sm`, 51 `text-base` and a long tail, against V0's near-uniform 349 × `text-base font-semibold`. Worth a dedicated typography pass; out of scope for this feature.

### Correction — 2026-08-06 (申請情報 field set)

PAR089–PAR095 describe exactly seven fields — 申請ID, 種別, the two type-dependent date fields, 理由, 申請者, 申請日時 — matching V0 `leave-detail.tsx` L141-L185 and FR-058 – FR-060. The card shipped with **nine**: it also carried 会員名 and 店舗名, left over from the pre-spec `feat/member-leave` implementation. T034 said "align", and the alignment pass corrected the field _contents_ without removing the two fields the spec does not list. Reported by the user, not caught by the sweep.

Both extras were also redundant by then: the head-up card added in T030/T033 already shows the member name as its heading (with the 会員詳細を開く link) and the store as 「主契約店舗: {store}」, so the same two values appeared twice on one screen. Removed; no information is lost.

Verified in the browser — 申請情報 now renders 7 labels for both a suspension and a withdrawal, 代理申請情報 3, 関連情報 4, all matching V0.

**Root cause common to both corrections on this date**: the sweep checked that each documented element was _present_, never that undocumented elements were _absent_, and compared label text without comparing typography. A parity item reading "Card title X; 2-column grid" is satisfiable by a card that also contains two extra fields — so presence-only checking cannot catch drift of this kind. Future sweeps should diff the rendered field list against the V0 range, not just confirm each listed field exists.

### Correction — 2026-08-06 (sort controls removed)

The list shipped with sortable 申請日 / 予定日 headers. V0 has none — `leave-list.tsx` contains zero occurrences of `sort` and every `<TableHead>` is plain text. Reported by the user.

This was not a sweep miss: **no `PAR###` item covers sorting in either direction**, so the parity gate was silent on it and always would have been. The divergence came from Q-13, where planning reversed the spec's original "no sort, as V0" position on the grounds that the pre-spec `feat/member-leave` code already had sorting working. That reversal was the agent's own call, made during `/speckit.plan` and never put to the user. The user rejected it on review.

Removed: sortable headers, `sort_by` / `sort_order` in URL state, and the `manualSorting` table options. The endpoint keeps both parameters so the mock stays contract-shaped; the screen simply never sends them, and the server's `scheduled_date asc` default supplies the ordering. Verified in the browser — zero header buttons, request query is `?page=1&limit=25`, URL stays clean, and the row order is unchanged from what the sorted view showed on first load.

**Lesson, distinct from the two earlier corrections**: those were failures to check. This was a failure of authority — treating pre-spec code as evidence of design intent. Code written before a screen was specified has never been reviewed against its mockup, so it cannot justify departing from that mockup. When implementation and prototype disagree and no clarification covers the gap, the prototype wins unless the user says otherwise.

### Re-verification — 2026-08-06 (rebase onto `feat/member`)

The branch was rebased from `dev` onto `feat/member`, which broke the build (37 type errors) and, relevant here, **replaced this feature's `src/components/common/suspension-history-strip.tsx` with its own**: `feat/member` had already added a component at that exact path in `e06c77e3` for the member-detail 契約操作 tab. Theirs is kept; A-03 now adapts to its API. PAR111–PAR123 were originally ticked against a component that no longer exists, so they were re-checked against the one that ships.

**Still satisfied, unchanged**: PAR111 (title), PAR112 (12-month window, anchor − 6 … anchor + 5, same ±24/12 navigable range), PAR113 (period label), PAR114 (prev/next buttons and their aria-labels), PAR115 (今へ戻る), PAR117 (今月 badge + `bg-primary/5`), PAR118 (state badges), PAR119 (application-number line and its spacer), PAR120 (month block, measured 28px), PAR121 (year line), PAR122 (footer legend).

**PAR116 — intent satisfied, implementation differs.** The item specifies a 34px bottom-aligned badge row "so all month blocks share a top edge". The shipped component instead uses a fixed 3-row grid (`grid-rows-[16px_16px_14px] gap-0.5`, measured 50px). The stated purpose holds — every month block was measured at the same top edge — and the grid is the more robust construction: V0's 34px cannot fit 今月 + a state badge + an application number simultaneously, which the A-03 seed data does produce. Accepted as-is rather than pushed back onto another feature's component.

**PAR123 — regression found and fixed.** After the rebase the footer link rendered as `<button onClick>` rather than `<Link>`, breaking code-rule V (navigational controls must be anchors so middle-click / ctrl-click / prefetch work). This feature's copy had been fixed during `/speckit-review`; the fix was lost with the file.

It was first logged here as another feature's problem, on the grounds that the shared component's `onViewApplications: () => void` prop belongs to the member-detail wrapper's contract. That was wrong, and the user said so: PAR123 is an item in _this_ feature's checklist, the defect is visible on _this_ feature's screen, and it is a regression in work already done here. A component living in `components/common/` means one extra caller to update, not a change of ownership — the same reasoning already applied when `status-card.tsx` was changed for 13 screens.

Fixed by replacing the callback prop with `viewApplicationsHref: string` and rendering through `<Link>`. Both callers updated: A-03's detail page and `members/[id]/_components/tabs/contracts-tab/suspension-history-strip.tsx`. Verified in the browser — both render `<a>` with the right `href` (`/members/leaves` and `/members/leaves?memberId=M-00001`, the latter keeping its query param) and both navigate; no console errors on either screen.

Verified end to end after the rebase: `npm run build` exits 0, list and detail render, the seeded 2026/01–03 suspension shows its 休会予定 badges and application numbers in the strip, and the cancellation round-trip still works (134 → 133).
