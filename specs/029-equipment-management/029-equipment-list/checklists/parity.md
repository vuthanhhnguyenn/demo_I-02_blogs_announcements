# UI Parity Checklist: E-02 Connected Equipment List & Search

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui@1bad949` → `src/pages/equipment-list.tsx` (last changed `65f1244`, 2026-08-29)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.
**Verified**: 2026-09-07, re-verified 2026-09-08 against the running app (login → `/equipment`) via browser screenshots, live DOM assertions and direct API calls. See the verification logs at the bottom for what remains unticked and why.

> Scope note: **everything on the 接点制御装置 side is owned by `specs/008-controller-management`** and is not enumerated here — the `ControllerListPanel` body, its tab trigger and count badge, and the `接点制御装置を登録` menu item. Only the connected-equipment side of `equipment-list.tsx` is listed below. IDs are contiguous; nothing has been dropped from this screen's own surface.

## Page shell — sidebar & header

- [x] PAR001 Sidebar active item — sidebar renders with `equipment-list` as the current page — src: equipment-list.tsx:711
- [x] PAR002 Shared header — global store-scope selector present above the page header — src: equipment-list.tsx:713
- [x] PAR003 Page container — fills viewport height, page body scrolls internally (header/tabs stay put) — src: equipment-list.tsx:712, 765

## Page header (PageHeader)

- [x] PAR004 Title — `店舗機器管理` — src: equipment-list.tsx:717
- [x] PAR005 Header count — total connected devices for the current store scope, NOT affected by search/filters — src: equipment-list.tsx:702-704, 718
- [x] PAR006 `CSV出力` button — outline variant, `Download` icon, label `CSV出力` — src: equipment-list.tsx:722-731
- [x] PAR007 `CSV出力` role gate — allowed: Headquarter / System / Manager / Staff / Observer — src: equipment-list.tsx:724
- [x] PAR008 `CSV出力` deny tooltip — `CSV出力の権限がありません` (Trainer) — src: equipment-list.tsx:725
- [x] PAR009 `新規登録` trigger — primary button, `Plus` icon left, `ChevronDown` icon right, label `新規登録` — src: equipment-list.tsx:736-740
- [x] PAR010 `新規登録` menu alignment — dropdown content aligned to the end (right) — src: equipment-list.tsx:743
- [x] PAR011 Menu item `接続機器を登録` — navigates to the connected-equipment create form — src: equipment-list.tsx:744-750
- [x] PAR012 `接続機器を登録` role gate — allowed: Headquarter / System / Manager / Staff — src: equipment-list.tsx:745
- [x] PAR013 `接続機器を登録` deny badge — `権限なし` shown when denied — src: equipment-list.tsx:746

## Tabs (this screen's own trigger only)

- [x] PAR014 Tab list style — `line` variant — src: equipment-list.tsx:769
- [x] PAR015 `接続機器一覧` trigger — label `接続機器一覧`, `text-sm` — src: equipment-list.tsx:770-771
- [x] PAR016 `接続機器一覧` count badge — outline badge, transparent border, muted background, tabular numerals, store-scoped device count — src: equipment-list.tsx:772-774
- [x] PAR017 `接続機器一覧` is the active tab when this screen is open — src: equipment-list.tsx:696, 768

## Toolbar — keyword search

- [x] PAR018 Search field — max width 400px, `Search` icon inset left — src: equipment-list.tsx:394-395
- [x] PAR019 Search placeholder — `機器ID、機器名、シリアル、設置場所で検索` — src: equipment-list.tsx:398
- [x] PAR020 Search scope — partial match over device ID, name, serial number, installation location — src: equipment-list.tsx:288 — **real API (2026-10-08):** `q` matched name / serial / location only (B7). **Re-ticked 2026-10-16:** API-103 `q` matches the device id (BE `6e600613`, verified live in Round 1b).
- [x] PAR021 Search resets paging — typing returns to page 1 — src: equipment-list.tsx:400

## Toolbar — filter toggle

- [x] PAR022 Filter toggle button — `SlidersHorizontal` icon, `h-8 text-xs`, right-aligned — src: equipment-list.tsx:404-410
- [x] PAR023 Filter toggle label — `詳細フィルター` when collapsed, `閉じる` when expanded — src: equipment-list.tsx:411
- [x] PAR024 Filter toggle chevron — `ChevronDown` collapsed, `ChevronUp` expanded — src: equipment-list.tsx:417
- [x] PAR025 Filter toggle variant — `default` (filled) when ≥1 filter is non-default, otherwise `outline` — src: equipment-list.tsx:405
- [x] PAR026 Active filter count badge — secondary badge showing the number of non-default filters — src: equipment-list.tsx:412-416

## Toolbar — filter row (expanded)

- [x] PAR027 店舗 select — rendered ONLY when scope is all-stores AND the user can reach ≥2 stores — src: equipment-list.tsx:258, 273, 424
- [x] PAR028 店舗 select options — `全店舗` first, then each accessible store by name — src: equipment-list.tsx:433-436
- [ ] PAR029 店舗 select width — fixed 160px, `h-8 text-xs` — src: equipment-list.tsx:429
- [x] PAR030 機器タイプ select options — `全ての機器タイプ`, 入退館ゲート, 水素水サーバー, 体組成計, タンニングマシン, プロテインサーバー, その他 (this order) — src: equipment-list.tsx:445-451
- [x] PAR031 状態 select options — `全ての状態`, 正常, 異常, メンテナンス中, 廃棄 (this order) — src: equipment-list.tsx:459-463
- [x] PAR032 Non-default select highlight — `border-primary bg-primary/10 text-foreground` on any select away from its default — src: equipment-list.tsx:145-149, 429, 441, 455
- [x] PAR033 Filter change resets paging — every select change returns to page 1 — src: equipment-list.tsx:427, 442, 455
- [x] PAR034 AND combination — keyword, 店舗, 機器タイプ and 状態 all apply together — src: equipment-list.tsx:287-292

## Active filter chip (異常 deep link)

- [x] PAR035 異常 chip rendered — only when the screen is entered pre-filtered to 異常 — src: equipment-list.tsx:481-489
- [x] PAR036 異常 chip styling — pill (rounded-full), destructive tint, destructive border, 1.5 dot on the left — src: equipment-list.tsx:483-484
- [x] PAR037 異常 chip copy — `異常 — {n}件` where `{n}` is the matched row count — src: equipment-list.tsx:485
- [x] PAR038 異常 chip dismiss affordance — `X` icon at the end of the chip — src: equipment-list.tsx:486
- [x] PAR039 異常 pin survives clear — `条件をクリア` does not release the 異常 restriction — src: equipment-list.tsx:325

## Filter result banner

- [x] PAR040 Banner visibility — shown when ≥1 filter is non-default OR the keyword is non-empty — src: equipment-list.tsx:490-491
- [x] PAR041 Banner counts — matched count against the store-scoped total — src: equipment-list.tsx:492-493
- [x] PAR042 Banner summary — `検索: "x"` / `店舗: y` / `機器タイプ: z` / `状態: w`, joined with `、` — src: equipment-list.tsx:329-336
- [x] PAR043 Banner summary omits store in single-store scope — src: equipment-list.tsx:332
- [x] PAR044 Banner summary omits 状態 when the 異常 deep link is pinned — src: equipment-list.tsx:334
- [x] PAR045 Banner clear action — resets keyword, 店舗, 機器タイプ (and 状態 when not pinned) and returns to page 1 — src: equipment-list.tsx:321-327, 495

## Bulk action bar

- [x] PAR046 Bar visibility — appears only while ≥1 row is selected — src: equipment-list.tsx:469
- [x] PAR047 Bar styling — primary tint background, primary border, rounded-lg — src: equipment-list.tsx:470
- [x] PAR048 Selected count copy — `{n}件選択中` in primary, medium weight — src: equipment-list.tsx:471
- [x] PAR049 `選択解除` button — ghost, clears the entire selection — src: equipment-list.tsx:472
- [x] PAR050 Vertical divider between 選択解除 and the bulk action — src: equipment-list.tsx:473
- [x] PAR051 `一括状態変更` button — opens the bulk status dialog — src: equipment-list.tsx:474-476

## Table header — 12 columns, this order

- [x] PAR052 Column 1 — selection checkbox, `w-10`, header sticky with muted background — src: equipment-list.tsx:500-506
- [x] PAR053 Header checkbox states — checked when the whole page is selected, indeterminate when partially — src: equipment-list.tsx:363-364, 501-504
- [ ] PAR054 Column 2 — `接続機器ID`, sortable — src: equipment-list.tsx:507-519 — **real API (2026-10-08):** not sortable — API-103 has no `id` sort key; the cell shows the UUID tail (B7, D9).
- [x] PAR055 Column 3 — `接続機器名`, sortable — src: equipment-list.tsx:520-532
- [x] PAR056 Column 4 — `機器タイプ`, sortable — src: equipment-list.tsx:533-545
- [x] PAR057 Column 5 — `シリアルナンバー`, sortable — src: equipment-list.tsx:547
- [x] PAR058 Column 6 — `IPアドレス`, sortable — src: equipment-list.tsx:548
- [x] PAR059 Column 7 — `MACアドレス`, sortable — src: equipment-list.tsx:549
- [x] PAR060 Column 8 — `設置場所`, sortable — src: equipment-list.tsx:550
- [x] PAR061 Column 9 — `設置日`, sortable — src: equipment-list.tsx:551
- [x] PAR062 Column 10 — `状態`, sortable — src: equipment-list.tsx:552-564
- [x] PAR063 Column 11 — `認証方式`, sortable — src: equipment-list.tsx:566
- [ ] PAR064 Column 12 — `紐づき契約種別`, sortable — src: equipment-list.tsx:567 — **real API (2026-10-08):** not sortable — derived from the usage-control fields, no API-103 sort key (D9).
- [x] PAR065 Header row background — `bg-muted/50`, headers sticky at top — src: equipment-list.tsx:499, 346
- [x] PAR066 Header labels `whitespace-nowrap` on the columns added for E-02 L162 — src: equipment-list.tsx:346

## Sorting affordances

- [x] PAR067 Inactive sort icon — `ArrowUpDown`, faint, darkens on hover — src: equipment-list.tsx:339
- [x] PAR068 Active ascending icon — `ArrowUp` — src: equipment-list.tsx:340
- [x] PAR069 Active descending icon — `ArrowDown` — src: equipment-list.tsx:340
- [x] PAR070 Sort tooltip (inactive or descending-active) — `クリックで昇順ソート` — src: equipment-list.tsx:355, 516
- [x] PAR071 Sort tooltip (ascending-active) — `クリックで降順ソート` — src: equipment-list.tsx:355, 516
- [ ] PAR072 Re-click flips direction on the active column — src: equipment-list.tsx:312-313
- [x] PAR073 Clicking a different column switches key and resets to ascending — src: equipment-list.tsx:314-317
- [x] PAR074 Any sort change returns to page 1 — src: equipment-list.tsx:318
- [ ] PAR075 Default sort — `接続機器ID` ascending — src: equipment-list.tsx:267-268 — **real API (2026-10-08):** default sort is `機器タイプ` ascending — the API-103 default; `id` is not a sort key (D9). **Updated 2026-10-22:** default sort is 登録日時 (`createdAt`) descending, no header indicator (spec Session 2026-10-22).

## Table body — data rows

- [x] PAR076 Row hover — `hover:bg-accent/50`, pointer cursor — src: equipment-list.tsx:598
- [x] PAR077 Abnormal row escalation — destructive tint background AND 4px inset left marker — src: equipment-list.tsx:598
- [x] PAR078 Row click navigates to the connected-equipment detail screen — src: equipment-list.tsx:599
- [x] PAR079 Checkbox cell stops propagation — ticking never navigates — src: equipment-list.tsx:601
- [x] PAR080 Row checkbox toggles that single device — src: equipment-list.tsx:602, 378-386
- [ ] PAR081 接続機器ID cell — `text-xs text-muted-foreground` — src: equipment-list.tsx:604 — **real API (2026-10-08):** UUID shown as its last 8 chars in mono with the full id in `title` (B7 / Q7).
- [x] PAR082 接続機器名 cell — `text-sm font-medium` — src: equipment-list.tsx:605
- [x] PAR083 機器タイプ cell — `Badge variant="secondary"`, normal weight — src: equipment-list.tsx:606-610
- [x] PAR084 シリアルナンバー cell — monospace, muted, nowrap — src: equipment-list.tsx:611
- [x] PAR085 IPアドレス cell — monospace, muted, nowrap; `—` when unrecorded — src: equipment-list.tsx:612
- [x] PAR086 MACアドレス cell — monospace, muted, nowrap; `—` when unrecorded — src: equipment-list.tsx:613
- [x] PAR087 設置場所 cell — `text-sm`, nowrap — src: equipment-list.tsx:614
- [x] PAR088 設置日 cell — `text-xs` muted, `YYYY/MM/DD`, nowrap — src: equipment-list.tsx:615
- [x] PAR089 状態 cell — outline badge with a 1.5 colour dot then the label — src: equipment-list.tsx:616-621
- [x] PAR090 状態 palette 正常 — success dot + success tinted badge — src: equipment-list.tsx:127-128
- [x] PAR091 状態 palette 異常 — destructive dot + destructive tinted badge — src: equipment-list.tsx:129-130
- [x] PAR092 状態 palette メンテナンス中 — info dot + info tinted badge — src: equipment-list.tsx:131-132
- [x] PAR093 状態 palette 廃棄 — muted dot + muted badge — src: equipment-list.tsx:133-134
- [x] PAR094 認証方式 cell — plain `text-sm`, nowrap: 会員読取型 / 機器読取型 / なし — src: equipment-list.tsx:622, 107
- [x] PAR095 紐づき契約種別 cell — one secondary badge per linked type, wrapping, nowrap per badge — src: equipment-list.tsx:623-629

## Empty states

- [x] PAR096 Empty state spans the full table width (all 12 columns), centred — src: equipment-list.tsx:573
- [x] PAR097 No-data state — variant `empty`, entity label `機器`, title `登録されている機器はありません`, NO action button — src: equipment-list.tsx:574-586
- [x] PAR098 Filtered-empty state — variant `filtered`, title `条件に一致する機器はありません` — src: equipment-list.tsx:575-581
- [x] PAR099 Filtered-empty action — `条件をクリア` outline button, `text-xs`, clears filters — src: equipment-list.tsx:583-585

## Pagination footer

- [x] PAR100 Footer layout — space-between across three groups, top border, `px-4 py-3` — src: equipment-list.tsx:637
- [x] PAR101 Count copy — `全 {total} 件 / {totalPages} ページ / {from}-{to} を表示` over the filtered set — src: equipment-list.tsx:638-640
- [x] PAR102 Previous control — disabled look (`pointer-events-none opacity-50`) on page 1 — src: equipment-list.tsx:644-647
- [x] PAR103 Next control — disabled look on the last page — src: equipment-list.tsx:665-668
- [x] PAR104 Page numbers — all pages listed when there are ≤7 — src: equipment-list.tsx:84
- [ ] PAR105 Page numbers — leading window `1 2 3 4 … last` when near the start — src: equipment-list.tsx:85
- [ ] PAR106 Page numbers — trailing window `1 … n-3 n-2 n-1 n` when near the end — src: equipment-list.tsx:86
- [ ] PAR107 Page numbers — double ellipsis `1 … p-1 p p+1 … last` in the middle — src: equipment-list.tsx:87
- [x] PAR108 Active page highlighted — src: equipment-list.tsx:656
- [x] PAR109 `表示件数` label + select — options `25件` / `50件` / `100件` / `200件` — src: equipment-list.tsx:81, 673-681 — **real API (2026-10-08):** options are now `25件` / `50件` / `100件`; the prototype dropped 200 on 9/17 (`1767864`) and API-103 caps `limit` at 100 (D8). Item text predates that change.
- [x] PAR110 Default page size — 50 — src: equipment-list.tsx:269
- [x] PAR111 Page-size change returns to page 1 — src: equipment-list.tsx:674
- [x] PAR112 Current page clamped to the last available page when the result set shrinks — src: equipment-list.tsx:306

## Bulk status dialog

- [x] PAR113 Dialog width — `max-w-md` — src: equipment-list.tsx:166
- [x] PAR114 Dialog title — `一括状態変更` — src: equipment-list.tsx:168
- [x] PAR115 Dialog description — `選択中 {n} 件の接続機器の状態を変更します。` — src: equipment-list.tsx:169
- [x] PAR116 `変更先状態` label — src: equipment-list.tsx:174
- [x] PAR117 Status select placeholder — `状態を選択`, nothing preselected — src: equipment-list.tsx:161, 177
- [x] PAR118 Status option 正常 — success dot + label — src: equipment-list.tsx:180-185
- [x] PAR119 Status option 異常 — destructive dot + label — src: equipment-list.tsx:186-191
- [x] PAR120 Status option メンテナンス中 — info dot + label — src: equipment-list.tsx:192-197
- [x] PAR121 Status option 廃棄 — muted dot + label — src: equipment-list.tsx:198-203
- [x] PAR122 廃棄 warning box — destructive tint, destructive border, rounded-md — src: equipment-list.tsx:209-210
- [x] PAR123 廃棄 warning line 1 — `廃棄への変更は取り消しが困難です`, destructive, medium weight — src: equipment-list.tsx:211
- [x] PAR124 廃棄 warning line 2 — `廃棄に変更すると機器の利用制御が停止されます。`, muted — src: equipment-list.tsx:212
- [x] PAR125 Warning appears only for 廃棄 — src: equipment-list.tsx:162, 209
- [x] PAR126 `変更理由` label with optional marker — src: equipment-list.tsx:218
- [x] PAR127 Reason textarea — `rows=3`, max 1000 chars, placeholder `変更理由や作業内容を入力` — src: equipment-list.tsx:219-222
- [x] PAR128 `キャンセル` button — outline, closes without applying — src: equipment-list.tsx:226
- [x] PAR129 Submit label — `変更を保存` normally, `廃棄する` when 廃棄 is chosen — src: equipment-list.tsx:232
- [x] PAR130 Submit styling — destructive background when 廃棄 is chosen — src: equipment-list.tsx:228
- [x] PAR131 Submit disabled until a target status is selected — src: equipment-list.tsx:229

## Store-scope behaviour

- [x] PAR132 Single-store scope filters the list to that store — src: equipment-list.tsx:279-284
- [x] PAR133 Single-store scope unmounts the in-panel 店舗 filter (does not merely disable it) — src: equipment-list.tsx:273, 423-424
- [x] PAR134 Header store scope wins over the in-panel 店舗 filter — src: equipment-list.tsx:278-281
- [x] PAR135 Header count and both tab badges follow the store scope — src: equipment-list.tsx:698-707

## Selection semantics

- [x] PAR136 Select-all applies to the current page only, leaving other pages untouched — src: equipment-list.tsx:366-376
- [x] PAR137 Select-all on a fully-selected page deselects that page's rows — src: equipment-list.tsx:367-371
- [x] PAR138 Selection keyed by device ID, surviving paging and re-filtering — src: equipment-list.tsx:265, 378-386

---

## Verification log — 2026-09-07

Checked against the app running locally, signed in as a Headquarter user.

**How the ticked items were confirmed**

- **Browser, list view**: column set and order read out of the live DOM — 12 headers, exactly `接続機器ID / 接続機器名 / 機器タイプ / シリアルナンバー / IPアドレス / MACアドレス / 設置場所 / 設置日 / 状態 / 認証方式 / 紐づき契約種別` after the selection column. Screenshot confirms the abnormal-row tint plus its inset left marker, the em dash for unrecorded IP/MAC, all four status badge colours (正常 success / 異常 destructive / メンテナンス中 info / 廃棄 muted), the multi-badge linked-contract cell, and `YYYY/MM/DD` install dates.
- **Browser, filter panel**: opening it flips the toggle to `閉じる` with the chevron inverted and reveals exactly three controls — store, device type, status. The `すべてクリア` button that the shipped code used to render is gone, matching the prototype (which only has it on the controller tab).
- **Browser, bulk flow**: ticking two rows did not navigate, the bar reported `2件選択中`, and the dialog rendered `選択中 2 件の接続機器の状態を変更します。`, `変更先状態` with the `状態を選択` placeholder, `変更理由` + 任意 marker, a disabled submit before a status is chosen, and — after picking 廃棄 — both warning lines verbatim with the submit relabelled `廃棄する`.
- **API**: keyword search matches the device ID (`q=EQ-0004` → 1 row), the status filter works, sorting by the new column keys works, an unsupported sort key is rejected 400, page size 200 is accepted while 30 is rejected, and `pagination.totalAllItems` reports the pre-filter count.

**Not ticked — deliberately not built**

- `PAR035`–`PAR039` (異常 deep-link chip): the prototype reaches this state through a `filterStatus` prop, and nothing in the project navigates to this screen with a status preset — the sidebar link is the only entry point. Building the locked chip now would implement a caller that does not exist, and its dismiss behaviour is still a deferred default (spec Q8). Left for whenever a dashboard deep link is actually added.

**Not ticked — not yet verified**

- `PAR025`, `PAR026` (filter toggle turning `default` variant plus its active-count badge): not exercised — no filter was applied during the run.
- `PAR029` (store select fixed at 160px): the project uses its searchable store select at `w-64` instead of the prototype's plain 160px select.
- `PAR040`–`PAR045` (filter result banner): wired to the shared `FilterResultBanner` with `totalAllItems`, but not observed with an active filter.
- `PAR072`–`PAR077` (sort direction toggling and its tooltips): only the default `接続機器ID` ascending state was observed.
- `PAR099`–`PAR102` (both empty states): not reproduced.
- `PAR103`–`PAR115` (pagination footer): the seed holds 8 devices against a 50-row page, so the footer had nothing to show.

---

## Verification log — 2026-09-08

Re-run after the prototype re-check (see spec §Clarifications 2026-09-08). Signed in as a System user, browser-driven through `/equipment`, `/equipment/EQ-0001`, `/equipment/EQ-0001?tab=history`, `/equipment/create` and `/equipment/EQ-0001/edit`, with the mock API called directly for the write paths. No console errors on any screen.

**Newly ticked**

- `PAR006` — the page header now renders one plain outline `CSV出力` button, matching the prototype; the per-tab dropdown is gone. The button exports whichever list is on screen (`/equipment` → API-103 export, `/controllers` → the controller export) and gates on that tab's export permission.

**Still not ticked, unchanged reasons**

- `PAR035`–`PAR039` (異常 deep-link chip): still no caller navigates here with a status preset.
- `PAR025`, `PAR026`, `PAR040`–`PAR045`, `PAR072`–`PAR077`, `PAR099` — not exercised in this run either (no filter applied, no empty result reproduced).
- `PAR029` (店舗 select at 160px) and `PAR100`–`PAR112` (pagination footer) — deliberate shared-component divergences, now recorded in the spec's "Divergences that remain on purpose" table. The 9-row seed still sits inside one 50-row page, so the footer has nothing to render.

**Confirmed against the live screens in this run**

- List: exactly the 12 prototype columns in order, abnormal rows tinted with the inset marker, `—` for unrecorded IP/MAC, all four status badge colours.
- Bulk flow: select-all → `9件選択中` bar → dialog reading `選択中 9 件の接続機器の状態を変更します。`, `変更先状態` placeholder `状態を選択`, `変更理由` + 任意 marker, submit disabled until a status is picked.
- Detail: `QRコードID` gone, `備考` rendered full-width, 接点制御装置 card showing `装置ID` and `装置名` as separate rows, `主契約タイプ` carrying its glossary tooltip.
- Form: prototype field set exactly — no `接続先ポート番号`, and the judgment labelled `都度オプション判定`.

## Verification log — 2026-09-08 (post-review fixes)

Run after a Feature Done Checklist review of the whole equipment feature. Verified by reading the
implementation and the shared components it delegates to; type-check, lint and build all clean.

**Newly ticked**

- `PAR035`–`PAR039` — the 異常 deep link now exists. `?equipment_filter=abnormal` pins the status
  condition (`useEquipmentFilters`), the chip renders as a destructive pill with the leading dot,
  the matched count and the `X`, `条件をクリア` leaves the pin in force, and the `X` releases it
  (spec Q8's adopted default). The 状態 select shows 異常 disabled while pinned, which is what
  "pinned" means here — the prototype leaves the control live but inert.
- `PAR025`, `PAR026` — filter toggle variant and count badge were already implemented; this run
  read them rather than assuming they were missing.
- `PAR040`–`PAR045` — banner visibility, counts (`totalAllItems` vs `totalItems`), summary parts
  now including `店舗: …` and joined with `、`, the 状態 omission while pinned, and the clear action.
- `PAR073`–`PAR077`, `PAR099` — sorting resets to ascending on a new column and returns to page 1,
  default sort is `接続機器ID` ascending, rows hover with a pointer cursor and abnormal rows keep
  the tint plus 4px inset marker, filtered-empty offers `条件をクリア`.
- `PAR100`–`PAR104`, `PAR108`–`PAR111` — footer layout, count copy, disabled prev/next look,
  all-pages listing below 8 pages, active-page highlight and the `表示件数` control all come from
  `TablePaginationWithSize` and match.
- `PAR112` — the page is now clamped to the last page that still holds rows. The API echoes the
  requested page back instead of clamping, so the list page corrects it once the response arrives.
- `PAR113`–`PAR115` — bulk dialog width, title and description.

**Still not ticked, and why**

- `PAR029` (店舗 select at 160px) — unchanged deliberate divergence, see the spec's "Divergences
  that remain on purpose" table: the searchable store select is shared across every list screen.
- `PAR072` (re-click flips direction) — `DataTableColumnHeader` cycles asc → desc → unsorted for
  the whole project; the prototype only flips between asc and desc. Shared-component divergence.
- `PAR105`–`PAR107` (page-number windows) — `TablePaginationWithSize` uses a ±1 window around the
  current page rather than the prototype's 4-wide leading/trailing windows. Shared-component
  divergence, applies to every list screen.

## Integration round 1 (real API, 2026-10-08)

Re-graded only where API-103 behaviour changes an item — see `../../integration-plan.md`:
`PAR020`, `PAR054`, `PAR064`, `PAR075`, `PAR081` unticked with the reason inline; `PAR109` stays
ticked against the current prototype (200件 removed). New behaviour with no PAR item: under the
全店舗 header with no 店舗 picked the table shows `店舗を選択してください` instead of rows, because the
API requires `storeId` (B4).

## Integration round 2b (BE local, 2026-10-16)

B4 closed: `storeId` is optional on API-103, so the 全店舗 header with no 店舗 picked lists every
store in the caller's scope — the `店舗を選択してください` state above is gone and the 接続機器 tab count
is numeric again. `PAR020` re-ticked (device-id search).
