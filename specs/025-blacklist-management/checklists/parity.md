# UI Parity Checklist: Blacklist Management (A-01 FR-015)

**Purpose**: Verify the implemented screens reproduce every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` @ `e99646c` (2026-08-05) — `src/pages/blacklist-list.tsx` (789 L), `src/pages/blacklist-detail.tsx` (278 L), plus the shared components they compose: `page-header.tsx`, `filter-result-banner.tsx`, `empty-state.tsx`, `field-marker.tsx`, `back-link.tsx`, `member-headup-card.tsx`, `status-card.tsx`, `role-gated-button.tsx`, `shared-sidebar.tsx`
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

---

## List — Shell & Access Control

- [x] PAR001 Sidebar entry ブラックリスト管理, `hqOnly: true`, active for both `blacklist-list` and `blacklist-detail` — src: shared-sidebar.tsx:L113
- [x] PAR002 Page shell: `SidebarInset` with `flex flex-col max-h-svh overflow-hidden`, shared header, then a scrollable `main` with `px-6 py-4 bg-background` — src: blacklist-list.tsx:L366-L382
- [x] PAR003 Screen reachable by Headquarter / System only; Manager, Staff, Trainer, Observer cannot reach it by menu or direct URL — src: shared-sidebar.tsx:L113 (`hqOnly`); A-01 権限マトリクス
- [x] PAR004 Content wrapper `flex flex-col gap-6` holding a single `Card` with `py-0 gap-0` — src: blacklist-list.tsx:L384-L386

## List — Page Header

- [x] PAR005 `PageHeader outside`, title "ブラックリスト管理", count = the **filtered** row count (not the scoped total) — src: blacklist-list.tsx:L370-L373
- [x] PAR006 Header action: primary Button with a `size-4` Plus icon and label "手動登録" — src: blacklist-list.tsx:L375-L378

## List — Toolbar

- [x] PAR007 Toolbar block `px-4 py-3 space-y-3` inside the card, above the filter banner — src: blacklist-list.tsx:L388-L426
- [x] PAR008 Search input: `flex-1 max-w-[400px]`, leading Search icon at `left-3`, `pl-9 text-xs`, placeholder "会員ID・氏名で検索"; every change resets the page to 1. Unlike V0 the match must be evaluated **server-side across the whole filtered set**, not client-side over the loaded page — src: blacklist-list.tsx:L390-L401
- [x] PAR009 No 詳細フィルター collapse button — both filters are permanently visible, per the V0 comment 「A8: フィルター2個以下は常時展開（折りたたみなし）」 — src: blacklist-list.tsx:L402
- [x] PAR010 Filter group right-aligned (`ml-auto`), `flex items-center gap-2` — src: blacklist-list.tsx:L403
- [x] PAR011 登録理由 select, `w-[140px] h-8 text-xs`, options 全登録理由 / 強制退会 / 手動登録; resets page to 1 — src: blacklist-list.tsx:L404-L413
- [x] PAR012 未納金 select, `w-[140px] h-8 text-xs`, options rendered as 未納金：全件 / 未納金：あり / 未納金：なし (the trigger shows the item label verbatim); resets page to 1 — src: blacklist-list.tsx:L414-L423
- [x] PAR013 Any filter trigger whose value differs from its default takes the active treatment `border-primary bg-primary/10 text-foreground` — src: blacklist-list.tsx:L222-L226
- [x] PAR013a Exactly two filters, matching V0 — no ステータス / 有効・解除済み control is added (decided 2026-08-07, Q-07); the list always requests active entries — src: blacklist-list.tsx:L402-L423

## List — Filter Result Banner

- [x] PAR014 Banner renders only when at least one filter is active OR the search term is non-empty — src: blacklist-list.tsx:L362, L428-L434
- [x] PAR015 Banner text: 「全 {baseline} 件中 **{count} 件**を抽出中」 followed by `: {summary}` in muted text, with a `条件をクリア` ghost button carrying an X icon; sits directly beneath the toolbar inside the card, `border-y bg-card px-4 py-2` — src: filter-result-banner.tsx:L23-L36
- [x] PAR016 Summary string: active 登録理由 value verbatim, then 「未納金：{value}」, joined with `・`, omitting whichever filter is at its default — src: blacklist-list.tsx:L302-L307
- [x] PAR017 条件をクリア resets the search term, both filters, and the page to 1 — src: blacklist-list.tsx:L309-L314

## List — Table

- [x] PAR018 Table wrapped in an `overflow-x-auto` container — src: blacklist-list.tsx:L436
- [x] PAR019 Sticky header row `bg-muted/50 sticky top-0 z-10`, every head cell `text-xs font-semibold bg-muted/50` — src: blacklist-list.tsx:L440
- [x] PAR020 Column set and order: 会員ID (`w-[110px]`) → 氏名 → 店舗名 → 登録理由 (`w-[110px]`) → 未納金額 (`w-[110px]`, right-aligned) → 登録日 (`w-[110px]`). **Six columns** — the V0 seventh column 照合結果 is removed per the client's 2026-07-29 decision (Q-01) — src: blacklist-list.tsx:L441-L447
- [x] PAR021 会員ID cell: `text-xs text-muted-foreground font-mono` — src: blacklist-list.tsx:L472
- [x] PAR022 氏名 cell: `text-sm font-medium hover:underline cursor-pointer`; clicking it navigates to the member detail and **stops propagation** so the row navigation does not also fire — src: blacklist-list.tsx:L473-L483
- [x] PAR023 店舗名 cell: `text-xs` — src: blacklist-list.tsx:L484
- [x] PAR024 登録理由 cell: outline Badge, `text-[10px]`; 強制退会 → `bg-destructive/15 text-destructive border-destructive/20`, 手動登録 → `bg-warning/15 text-warning border-warning/20` — src: blacklist-list.tsx:L196-L203, L485-L489
- [x] PAR025 未納金額 cell: `text-xs text-right`; > 0 → `¥{toLocaleString}` in `text-destructive font-medium`; = 0 → `¥0` in `text-muted-foreground` — src: blacklist-list.tsx:L490-L492
- [x] PAR026 登録日 cell: `text-xs` — src: blacklist-list.tsx:L493
- ~~PAR027 照合結果 cell (badge 一致 / 要確認 / 不一致)~~ — **removed 2026-07-29 (Q-01)**: settled with the client through QA `member-management/qa06` — 「matchResult giữ ẩn cột (FR-024 'Could', ngoài scope)」. Not built — src: blacklist-list.tsx:L205-L214, L447, L494-L498
- [x] PAR028 Row hover `hover:bg-muted/50 cursor-pointer`; clicking the row (outside the name) opens the blacklist detail — src: blacklist-list.tsx:L467-L471
- [x] PAR029 Empty state occupies a single cell spanning all columns, centred — src: blacklist-list.tsx:L451-L464
- [x] PAR030 Filtered empty state (`variant="filtered"`, `entityLabel="ブラックリスト"`): SearchX icon, 「条件に一致するブラックリストがありません」, plus an outline `size="sm" text-xs` 条件をクリア button — src: blacklist-list.tsx:L454-L462; empty-state.tsx:L34-L56
- [x] PAR031 Blank-slate empty state (`variant="empty"`): PackageOpen icon, 「ブラックリストがまだありません」, no action button — src: blacklist-list.tsx:L455, L458-L460; empty-state.tsx:L34-L42

## List — Pagination Footer

- [x] PAR032 Footer `flex items-center justify-between px-4 py-3 border-t gap-4` — src: blacklist-list.tsx:L507
- [x] PAR033 Left text `text-xs text-muted-foreground shrink-0`: 「全 {total} 件 / {totalPages} ページ / {start}-{end} を表示」 — src: blacklist-list.tsx:L508-L510
- [x] PAR034 前へ control, disabled-styled (`pointer-events-none opacity-50`) on page 1 — src: blacklist-list.tsx:L515-L521
- [x] PAR035 次へ control, disabled-styled on the last page — src: blacklist-list.tsx:L539-L545
- [x] PAR036 Numbered page links, current page `isActive`; at most 7 entries — first and last always shown, ellipses inserted when the current page is more than 2 away from either end — src: blacklist-list.tsx:L348-L360, L522-L538
- [x] PAR037 Changing page scrolls the window to the top with smooth behaviour — src: blacklist-list.tsx:L342-L345
- [x] PAR038 表示件数 selector on the right: muted `text-xs` label 「表示件数」 plus a `h-7 w-[72px] text-xs` select rendering each option as "{n}件"; changing it resets to page 1. Options **25 / 50 / 100, default 25** — V0's 200 exceeds the endpoint's `limit` cap and V0's default of 50 is replaced by the CRM-wide `PAGE_SIZE` (decided 2026-08-07, Q-08) — src: blacklist-list.tsx:L229, L337-L340, L550-L562

## List — Manual Registration Sheet: Shell

- [x] PAR039 Right-hand Sheet, `w-[480px] sm:max-w-[480px]`, `flex flex-col p-0 gap-0 overflow-hidden` — src: blacklist-list.tsx:L581
- [x] PAR040 Header block `px-6 py-4 border-b shrink-0`, title 「ブラックリスト手動登録」 at `text-sm font-semibold`, with a screen-reader-only description 「対象会員をブラックリストに手動登録します」 — src: blacklist-list.tsx:L584-L591
- [x] PAR041 Scrollable body `flex-1 overflow-y-auto px-6`, inner `py-4 flex flex-col gap-4` — src: blacklist-list.tsx:L594-L595
- [x] PAR042 Closing or dismissing the Sheet resets member number, lookup status, selected member, search query, reason and memo — src: blacklist-list.tsx:L570-L580

## List — Sheet: 会員番号 autofill

- [x] PAR043 Label 「会員番号」 `text-sm font-medium` followed by the shared `RequiredMark` (a destructive `*`) — src: blacklist-list.tsx:L599-L602; field-marker.tsx:L13-L15
- [x] PAR044 Input placeholder 「例：M-00001」 — src: blacklist-list.tsx:L604
- [x] PAR045 Resolved state: input takes `border-success focus-visible:ring-success/30` — src: blacklist-list.tsx:L608-L609
- [x] PAR046 Unresolved state: input takes `border-destructive focus-visible:ring-destructive/30` and shows 「該当する会員が見つかりません」 in `text-xs text-destructive` beneath — src: blacklist-list.tsx:L610-L617
- [x] PAR047 Idle state (empty input): hint 「会員番号を入力すると氏名・生年月日・顔写真が自動反映されます」 in `text-xs text-muted-foreground`; clearing the input also clears any previously resolved member — src: blacklist-list.tsx:L267-L272, L618-L622

## List — Sheet: member search combobox

- [x] PAR048 Muted label 「または氏名・カナ・電話番号で検索」 — src: blacklist-list.tsx:L627-L629
- [x] PAR049 Combobox trigger: full-width bordered row, `min-h-9`, with a trailing `ChevronsUpDown size-4 opacity-50` — src: blacklist-list.tsx:L631-L650
- [x] PAR050 Trigger placeholder when nothing is resolved: muted 「ID・氏名・カナ・電話番号・メールで検索」 — src: blacklist-list.tsx:L646-L648
- [x] PAR051 Trigger when a member was selected via the combobox (not the ID field): `size-5` round avatar + name + monospace muted `({member id})` — src: blacklist-list.tsx:L636-L645
- [x] PAR052 Popover `w-[400px] p-0`, aligned start, containing a Command with `shouldFilter={false}` (filtering happens in the query, not the component) — src: blacklist-list.tsx:L651-L652
- [x] PAR053 CommandInput placeholder 「ID・氏名・カナ・電話番号・メールで検索...」 — src: blacklist-list.tsx:L653-L657
- [x] PAR054 CommandEmpty text 「該当する会員が見つかりません」 — src: blacklist-list.tsx:L659
- [x] PAR055 Result row `flex items-center gap-3 py-2`: `size-9` round avatar, then `text-sm font-medium` name over a truncated muted `text-xs` line 「{id} ・ {kana} ・ {store}」 — src: blacklist-list.tsx:L662-L685
- [x] PAR056 Search matches member number, legacy member code, name, name kana, phone and email; with no query a bounded default list is shown, with a query a bounded result list. Evaluated **server-side**, and **prefix-only** except the two unique keys which match exactly — V0's client-side substring matching is a mock artefact and is not reproduced (decided 2026-08-07, Q-04) — src: blacklist-list.tsx:L252-L262
- [x] PAR057 Selecting a result fills the 会員番号 input, marks the lookup resolved, closes the popover and clears the search query — src: blacklist-list.tsx:L665-L671
- [x] PAR057a Resolved member who is **already blacklisted**: the Sheet says so and blocks submission before the operator can press 登録 (FR-050a, derived from `MemberListItem.hasBlacklist`, HQ/system-only) — src: _no V0 counterpart_
- [x] PAR058 Resolved identity card: `rounded-md border border-success/30 bg-success/10 p-3 mt-1`, `size-20` round photo, a `UserCheck size-3 text-success` icon beside the `text-sm font-medium` name, then muted `text-xs` lines for kana, 「生年月日：{date}」, and monospace 「ID: {id} / {store}」 — src: blacklist-list.tsx:L694-L711

## List — Sheet: reason, memo, warning, footer

- [x] PAR059 Label 「登録理由」 + `RequiredMark`; select placeholder 「理由を選択してください」 — src: blacklist-list.tsx:L716-L722
- [x] PAR060 登録理由 options, in order: 迷惑行為 / 未納金 / 不正利用 / その他 — `equipment_damage` is **not** offered — src: blacklist-list.tsx:L725-L728
- [x] PAR061 Label 「メモ」 + the shared `OptionalMark` (a muted 「任意」 chip); Textarea `rows={4}`, placeholder 「補足情報を入力してください」 — src: blacklist-list.tsx:L735-L744; field-marker.tsx:L18-L24
- [x] PAR062 Full-bleed Separator (`-mx-6 w-[calc(100%+48px)]`) between the form fields and the warning alert — src: blacklist-list.tsx:L749
- [x] PAR063 Warning Alert `bg-warning/10 border-warning/20 text-warning` with a `TriangleAlert size-4` icon and the `text-sm` copy 「ブラックリストに登録された会員の個人情報は削除できなくなります」 — src: blacklist-list.tsx:L751-L759
- [x] PAR064 Footer `flex items-center gap-2 border-t p-4 shrink-0` with two `size="lg" flex-1` buttons: キャンセル (outline) then 登録 (destructive) — src: blacklist-list.tsx:L764-L782
- [x] PAR065 登録 is disabled while no member is resolved, and also while the resolved member is already blacklisted (FR-050a) — src: blacklist-list.tsx:L777
- [x] PAR066 Successful registration shows the toast 「ブラックリストに登録しました」, closes the Sheet and resets every field — src: blacklist-list.tsx:L286-L295
- [x] PAR067 Duplicate-registration refusal (member already has an active entry) surfaces the backend's user-facing message; no such state exists in V0 — src: _no V0 counterpart_ (backend guard E-BLK-200)
- [x] PAR068 Member-not-found refusal on submit surfaces the backend's user-facing message — src: _no V0 counterpart_ (backend guard E-MEM-001)

## Detail — Shell & Header

- [x] PAR069 Sidebar active on ブラックリスト管理 with `currentPage="blacklist-detail"` — src: blacklist-detail.tsx:L73
- [x] PAR070 Page shell: `SidebarInset` with `flex flex-col max-h-svh overflow-hidden`, shared header, scrollable `main` with `px-6 py-4 bg-background` — src: blacklist-detail.tsx:L74-L100
- [x] PAR071 `PageHeader outside` with a `BackLink` breadcrumb labelled 「ブラックリスト管理に戻る」 returning to the list — src: blacklist-detail.tsx:L78-L85
- [x] PAR072 Header title = the member's name — src: blacklist-detail.tsx:L86
- [x] PAR073 Header badges, in order: a `secondary` `text-xs font-medium font-mono` badge holding the member ID, then an outline `text-xs font-medium gap-1` badge holding the registration path prefixed with a `size-1.5` tone-matched dot (destructive for 強制退会, warning for 手動登録) — src: blacklist-detail.tsx:L87-L97

## Detail — Member head-up card

- [x] PAR074 `MemberHeadupCard` above the two-column layout, fed memberId, oldMemberNo, name, nameKana, memberType, contractName, storeName — src: blacklist-detail.tsx:L102-L110
- [x] PAR075 Card renders a `size-24` rounded-lg photo, the name as `text-base font-bold`, the kana as muted `text-xs`, then a monospace line 「ID: {id}」 with 「旧No: {code}」 and 「主契約店舗: {store}」 appended when present — src: member-headup-card.tsx:L30-L47
- [x] PAR076 Attribute badges row: member type, then 「主契約: {contract}」, each an outline `text-[10px] font-normal` badge, rendered only when the value exists — src: member-headup-card.tsx:L48-L54
- [x] PAR077 Ghost 「会員詳細を開く」 action with a trailing `ArrowUpRight size-4`, navigating to the member detail — src: member-headup-card.tsx:L55-L64

## Detail — Layout

- [x] PAR078 Two-column `flex gap-4`: left `w-[60%] flex flex-col gap-4`, right `w-[40%]` — src: blacklist-detail.tsx:L113-L115, L229
- [x] PAR079 Right column content is `sticky top-0 flex flex-col gap-4` — src: blacklist-detail.tsx:L230
- [x] PAR080 Left column card order: 登録情報 → 未納金. **Two cards** — the V0 middle card 照合条件 is removed per the 2026-08-07 decision (Q-02) — src: blacklist-detail.tsx:L117, L209

## Detail — 登録情報 card

- [x] PAR081 CardTitle 「登録情報」 at `text-base font-semibold`; content `px-4` — src: blacklist-detail.tsx:L118-L121
- [x] PAR082 Two-column grid `gap-x-8 gap-y-4` — src: blacklist-detail.tsx:L122
- [x] PAR083 登録理由 field: muted `text-xs` label over a tone-matched outline `text-[10px]` badge — src: blacklist-detail.tsx:L123-L128
- [x] PAR084 登録日時 field: muted `text-xs` label over a `text-sm font-medium` date-and-time value — src: blacklist-detail.tsx:L129-L132
- [x] PAR085 登録者 field: muted `text-xs` label over the registering staff member's `text-sm font-medium` display name — src: blacklist-detail.tsx:L133-L136
- [x] PAR086 メモ field spanning both columns (`col-span-2`): muted `text-xs` label over a `text-sm` body — src: blacklist-detail.tsx:L137-L140

## Detail — 照合条件 card — **REMOVED (Q-02)**

> Dropped 2026-08-07. The contract has no counterpart for any of these four flags at v0.4, and the client had already ruled the same FR-024 mechanism out of scope for the list column on 2026-07-29 (Q-01). Unlike that column, this card was never itself put to the client (「照合」 appears zero times in qa07, qa08 and qa12), so this is a project-side decision applying the client's rationale consistently. Retained struck through as the record of what V0 had.

- ~~PAR087 CardTitle 「照合条件」, two-column grid~~ — **removed 2026-08-07 (Q-02)** — src: blacklist-detail.tsx:L146-L151
- ~~PAR088 Four rows — 氏名＆生年月日一致, メール一致, 電話一致, 住所一致~~ — **removed 2026-08-07 (Q-02)** — src: blacklist-detail.tsx:L152-L203
- ~~PAR089 一致 / 不一致 badge tones~~ — **removed 2026-08-07 (Q-02)** — src: blacklist-detail.tsx:L156-L162

## Detail — 未納金 card

- [x] PAR090 CardTitle 「未納金」 at `text-base font-semibold`; content `px-4`, inner `flex items-center gap-2` — src: blacklist-detail.tsx:L209-L214
- [x] PAR091 Amount `text-2xl font-bold` as `¥{toLocaleString}`; destructive colour when > 0, muted when 0 — src: blacklist-detail.tsx:L215-L217
- [x] PAR092 A 「未収」 outline badge `text-[10px] bg-destructive/15 text-destructive border-destructive/20` beside the amount, rendered **only** when the amount is > 0 — src: blacklist-detail.tsx:L218-L222

## Detail — Status card & release

> Release is **in scope** — settled 2026-08-07 (Q-05): QA `member-management/qa12` reported the missing endpoint and the v0.4 contract now implements `PATCH /blacklist/{blacklistId}/active` in full.

- [x] PAR093 `StatusCard` with CardTitle 「ステータス」, tone destructive for 強制退会 and warning for 手動登録 — src: blacklist-detail.tsx:L63-L65, L231-L232; status-card.tsx:L44
- [x] PAR094 `size-20` round tinted circle holding a `size-10` ShieldBan icon — src: blacklist-detail.tsx:L233; status-card.tsx:L47-L49
- [x] PAR095 Dot-prefixed outline status badge whose label is the registration path — src: blacklist-detail.tsx:L234; status-card.tsx:L52-L59
- [x] PAR096 Meta line 「登録日: {registeredAt}」, muted `text-xs`, centred — src: blacklist-detail.tsx:L235; status-card.tsx:L62-L68
- [x] PAR097 Action area separated by a top border (`border-t mt-4 pt-4`) holding a full-width outline button labelled 「ブラックリスト解除」 in `text-destructive hover:text-destructive` — src: blacklist-detail.tsx:L237-L245; status-card.tsx:L71-L75
- [x] PAR098 Button role-gated to Headquarter / System; for any other role it renders `opacity-50 cursor-not-allowed` and disabled, with the tooltip 「ブラックリスト解除は本部のみ操作できます」 — src: blacklist-detail.tsx:L238-L239; role-gated-button.tsx:L28-L31
- [x] PAR099 AlertDialog title 「ブラックリストから解除しますか？」 — src: blacklist-detail.tsx:L258
- [x] PAR100 AlertDialog description 「{member name} さんをブラックリストから解除します。解除後、再入会が可能になります。」 — src: blacklist-detail.tsx:L259-L261
- [x] PAR101 AlertDialog footer: キャンセル then 解除する — src: blacklist-detail.tsx:L263-L272
- [x] PAR102 Confirming shows the toast 「ブラックリストから解除しました」 and closes the dialog — src: blacklist-detail.tsx:L266-L269
- [x] PAR102a After a successful release the screen returns to the blacklist list, where the released entry is absent (decided 2026-08-07, Q-11) — src: _no V0 counterpart_
- [x] PAR103 Already-released refusal surfaces the backend's user-facing message; no such state exists in V0 — src: _no V0 counterpart_ (backend guard E-BLK-201)

## States with no V0 counterpart (project convention)

> V0 renders module-level constant mock data on both pages, so it defines no async states. These follow the project's existing conventions (resolved, Q-09).

- [x] PAR104 List loading state — table skeleton per the project's list convention — src: _no V0 counterpart_
- [x] PAR105 List error state — error surface per the project's list convention, not a silently empty table — src: _no V0 counterpart_
- [x] PAR106 Detail loading state — detail skeleton per the project's convention — src: _no V0 counterpart_
- [x] PAR107 Detail error / not-found state — surfaces the backend's not-found message rather than an empty detail — src: _no V0 counterpart_ (backend guard E-BLK-001)
- [x] PAR108 Released entry reached by direct URL renders with its removal facts and offers no second release. This is the **only** route to a released entry in Phase 1 — the list never lists one (Q-07) and the release flow navigates away (Q-11) — src: _no V0 counterpart_
- [x] PAR108a A released entry's status card reflects the released state instead of repeating the registration path as though active, and the release timestamp + releasing staff are shown (FR-069b) — src: _no V0 counterpart_ (V0 renders one active entry from a constant)
- [x] PAR109 Member with no primary store: 店舗名 column and the head-up card's 主契約店舗 fragment degrade to an em dash / omission rather than "undefined" — src: _no V0 counterpart_ (contract: `member.primaryStore` nullable)
- [x] PAR110 Member with no active contract: the head-up card omits the 主契約 badge — src: member-headup-card.tsx:L48-L54 (contract: `currentMainContract` nullable)
- [x] PAR111 Member with no legacy code: the head-up card omits the 旧No fragment — src: member-headup-card.tsx:L44 (contract: `legacyMemberCode` nullable)
