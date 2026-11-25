# UI Parity Checklist: Store Master List (Y-02 FR-001)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` → `src/pages/store-list.tsx` @ `47423ec` (2026-09-30; last touched `1767864` 2026-09-17). Originally `c1c7e2e` (2026-08-05).

> **2026-10-02 prototype sync** (spec Session 2026-10-02): items changed by the 9/8–9/17 updates were **re-opened** (`[ ]`) and rewritten — PAR011, PAR029, PAR035, PAR066, PAR097–PAR101 (replaced by PAR097a–PAR097e). PAR069 and PAR084 are no longer divergences (V0 now agrees). `src:` line numbers on untouched items still point at `c1c7e2e`; V0 lines shifted by roughly +15–25.
> **Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

> Both clarifications are resolved (2026-08-28). Q1 → two status values, per the prototype — **re-resolved 2026-10-02 to four values** (PAR035 / PAR066 rewritten). Q2 → rows ARE scoped by role, which deliberately diverges from the V0 mockup: PAR004 has been rewritten to match the decision, and PAR004a added.

## Page shell

- [x] PAR001 Sidebar highlights the 店舗一覧 entry as the current page — src: store-list.tsx:L497
- [x] PAR002 Shared app header renders above the page header — src: store-list.tsx:L499
- [x] PAR003 Main content area scrolls independently of the page header (header stays outside the scroll region) — src: store-list.tsx:L498, L517
- [x] PAR004 The global header store selector does NOT narrow the list — selecting a single store there leaves the list unchanged — src: store-list.tsx:L248-L250
- [x] PAR004a **Intentional divergence from V0**: rows ARE scoped by role (System/HQ all · Manager managed stores · Staff/Trainer/Observer linked store). V0 applies no scoping — verify against spec FR-009, not against the mockup — src: store-list.tsx:L250 (V0 baseline) + spec.md FR-009

## Page header

- [x] PAR005 Title 店舗管理 — src: store-list.tsx:L503
- [x] PAR006 Count badge beside the title showing the total store count with 件 suffix — src: store-list.tsx:L504
- [x] PAR007 新規登録 button, right-aligned, with a Plus icon — src: store-list.tsx:L506-L513
- [x] PAR008 新規登録 navigates to the store registration form — src: store-list.tsx:L509
- [x] PAR009 新規登録 role-gated to Headquarter / System; other roles see it disabled at reduced opacity with tooltip 本部権限が必要です — src: store-list.tsx:L507 + role-gated-button.tsx

## Toolbar — search & filter toggle

- [x] PAR010 Search input with leading magnifier icon, max width 400px — src: store-list.tsx:L526-L534
- [x] PAR011 Search placeholder verbatim: 店舗名・店舗コード・テリトリー名で検索... (Phase 1, no territory matching: 店舗名・店舗コードで検索...) — src: store-list.tsx:L546 (`6bc1f1c`)
- [x] PAR012 Typing in search resets the list to page 1 — src: store-list.tsx:L532
- [x] PAR013 詳細フィルター toggle button, right-aligned, with a sliders icon — src: store-list.tsx:L536-L550
- [x] PAR014 Toggle label switches between 詳細フィルター (closed) and 閉じる (open) — src: store-list.tsx:L543
- [x] PAR015 Toggle renders as a filled/primary button when at least one filter is non-default, outline otherwise — src: store-list.tsx:L537
- [x] PAR016 Toggle carries a secondary badge with the count of non-default filters (hidden when zero) — src: store-list.tsx:L544-L548
- [x] PAR017 Toggle shows a chevron-up when the panel is open, chevron-down when closed — src: store-list.tsx:L549

## Toolbar — bulk selection bar (Headquarter / System, ≥1 selected)

- [x] PAR018 Bar renders only when the user may bulk-change AND at least one store is selected — src: store-list.tsx:L555
- [x] PAR019 Bar is sticky at the top of the scroll region with primary-tinted background and border — src: store-list.tsx:L556
- [x] PAR020 Text {N}件選択中 in primary colour — src: store-list.tsx:L557-L559
- [x] PAR021 Muted sub-text （このページで {M}件） — src: store-list.tsx:L560-L562
- [x] PAR022 選択解除 ghost button — clears the whole selection AND turns off 選択中のみ表示 — src: store-list.tsx:L563-L572
- [x] PAR023 Vertical divider between control groups (two occurrences) — src: store-list.tsx:L573, L584
- [x] PAR024 選択中のみ表示 toggle with an eye icon, outline variant, reflecting pressed state — src: store-list.tsx:L574-L583
- [x] PAR025 テリトリーを変更（{N}件） primary button with a shuffle icon — src: store-list.tsx:L585-L588

## Toolbar — expandable filter panel

- [x] PAR026 Panel renders only while 詳細フィルター is open; controls wrap on narrow widths — src: store-list.tsx:L593-L594
- [x] PAR027 ブランド select — options 全ブランド / JOYFIT / JOYFIT24 / JOYFIT YOGA / JOYFIT+ / FIT365, in that order — src: store-list.tsx:L595-L607
- [x] PAR028 都道府県 select — 全都道府県 plus only prefectures actually present in the data, ordered north to south (V0 derives these client-side; per the 2026-08-28 clarification they come from the server over the whole permitted set — same visible result) — src: store-list.tsx:L608-L619, L209-L211
- [ ] PAR029 運営企業 select — 全運営企業 / 直営 / then the Y-03 FC companies that are 有効 and type FC, in master order, offered only when they operate at least one store in the permitted set (no zero-row option) — src: store-list.tsx:L111-L113, L640-L649 (`6bc1f1c`) — ⚠ Gap: HQ (lodu4289+headquater) /stores → 詳細フィルター → 運営企業: options = 全運営企業 / 直営 / ZZQA*FC_A_20260929 / ZZQA_FC_B_20260929 / ZZQA_FC_C_A_20260929 / ZZQA_FC_C_FLAG_20260929 (each tagged 管轄0店舗) / ZZQA*長\_… (管轄1店舗). Four zero-store companies are offered; picking ZZQA_FC_A_20260929 gives banner 全 9 件中 0 件を抽出中 and empty state 条件に一致する店舗がありません — violates 'no zero-row option'. Control is also a searchable combobox (会社名で検索...) rather than a plain select. 有効/FC-type and master order not checkable: FC企業管理 (/franchise-companies) still renders mock rows (dc-001…fc-005), not the real companies. Manager/Staff: 運営企業 control absent (combos = ブランド/都道府県/ステータス/表示件数). Screenshots list-hq-company-open.png, list-hq-zero-company.png
- [x] PAR030 エリア select — 全エリア plus all 11 areas — src: store-list.tsx:L632-L643
- [x] PAR031 テリトリー select — 全テリトリー plus the active territories under the selected area only — src: store-list.tsx:L647-L660, L273-L274
- [x] PAR032 テリトリー select is disabled while エリア is 全エリア — src: store-list.tsx:L649
- [x] PAR033 Tooltip 先にエリアを選択してください shown on the disabled テリトリー select — src: store-list.tsx:L662-L666
- [x] PAR034 Changing エリア resets テリトリー to 全テリトリー and returns to page 1 — src: store-list.tsx:L266-L270
- [x] PAR035 ステータス select — 全ステータス / 準備中 / 営業中 / 休業中 / 閉店, in that order (four values, re-resolved 2026-10-02) — src: store-list.tsx:L692-L697 + data/stores.ts L9 (`a7d0c88`)
- [x] PAR036 Every non-default filter control is highlighted (primary border + tinted background) — src: store-list.tsx:L238-L242
- [x] PAR037 Changing any filter returns the list to page 1 — src: store-list.tsx:L595, L608, L621, L647, L669

## Filter result banner

- [x] PAR038 Banner shows only when at least one filter is non-default OR the keyword is non-empty — src: store-list.tsx:L683-L689
- [x] PAR039 Banner copy: 全 {total} 件中 {count} 件を抽出中 with the count emphasised — src: filter-result-banner.tsx
- [x] PAR040 Banner appends the active conditions joined by ・ in the order brand・prefecture・company・area・territory・status — src: store-list.tsx:L301-L310
  - Note: the keyword is listed first, before those six, as `"{keyword}"`. V0's `buildFilterSummary` omits it, but spec FR-016 raises the banner for a keyword alone, so the banner has to name it.
- [x] PAR041 Banner offers 条件をクリア (with an X icon) which clears the keyword and all six filters and returns to page 1 — src: store-list.tsx:L312-L321
- [x] PAR042 Banner sits inside the table card directly under the toolbar (not above the card) — src: store-list.tsx:L683

## Table — header

- [x] PAR043 Header row uses the muted background and stays sticky while the body scrolls — src: store-list.tsx:L695, L697
- [x] PAR044 Selection checkbox column renders ONLY for Headquarter / System — src: store-list.tsx:L696-L705
- [x] PAR045 Header checkbox is checked when every row on the page is selected, indeterminate when only some are — src: store-list.tsx:L699-L700
- [x] PAR046 Header checkbox carries aria-label このページ全選択 — src: store-list.tsx:L702
- [x] PAR047 Column order: [checkbox] 店舗コード / 店舗名 / ブランド / 都道府県 / 運営企業 / テリトリー / ステータス / [actions] — src: store-list.tsx:L696-L715
- [x] PAR048 店舗コード header is sortable — src: store-list.tsx:L706
- [x] PAR049 店舗名 header is sortable — src: store-list.tsx:L707
- [x] PAR050 ブランド / 都道府県 / 運営企業 / テリトリー / ステータス headers are plain (not sortable) — src: store-list.tsx:L708-L714
- [x] PAR051 Trailing header cell for the row actions column is empty — src: store-list.tsx:L715
- [x] PAR052 Sortable header shows a neutral up-down icon when inactive, an up arrow when sorted ascending, a down arrow when descending — src: store-list.tsx:L476-L479
- [x] PAR053 Sortable header tooltip reads クリックで昇順ソート when it will sort ascending, クリックで降順ソート when it will flip to descending — src: store-list.tsx:L482-L488
- [x] PAR054 Clicking a new sortable column sorts it ascending; clicking the active one flips direction; either returns to page 1 — src: store-list.tsx:L282-L290

## Table — rows

- [x] PAR055 Row is clickable (pointer cursor + hover highlight) and opens the store detail screen — src: store-list.tsx:L737
- [x] PAR056 Clicking the row's checkbox cell does not trigger row navigation — src: store-list.tsx:L739
- [x] PAR057 Clicking the row's actions cell does not trigger row navigation — src: store-list.tsx:L769
- [x] PAR058 Row checkbox toggles just that store and carries aria-label {店舗名}を選択 — src: store-list.tsx:L740-L743
- [x] PAR059 店舗コード cell: monospace, muted colour — src: store-list.tsx:L747
- [x] PAR060 店舗名 cell: medium weight — src: store-list.tsx:L748
- [x] PAR061 ブランド cell renders a brand badge with a per-brand colour treatment — src: store-list.tsx:L749-L751
- [x] PAR062 都道府県 cell renders the prefecture name — src: store-list.tsx:L752
- [x] PAR063 運営企業 cell renders the FC company name for franchised stores and the literal 直営 otherwise — src: store-list.tsx:L753-L754
- [x] PAR064 テリトリー cell renders two stacked lines: territory name (medium) above area name (smaller, muted) — src: store-list.tsx:L756-L761
- [x] PAR065 テリトリー cell renders 未設定 in muted text when the store has no territory — src: store-list.tsx:L762-L764
- [x] PAR066 ステータス cell renders an outline badge with one treatment per value: 準備中 info, 営業中 success, 休業中 warning, 閉店 muted — src: store-list.tsx:L786-L788 + data/stores.ts L24-L39 (`a7d0c88`)
- [x] PAR067 Row actions cell renders a horizontal-ellipsis trigger that opens a dropdown aligned to the row's end — src: store-list.tsx:L769-L774
- [x] PAR068 Dropdown contains 編集 with a pencil icon, navigating to that store's edit form — src: store-list.tsx:L775-L780
- [x] PAR069 ~~**Intentional divergence from V0**~~ **V0 agrees since `6bc1f1c`** (store-list.tsx L795: Staff enabled on `item.id === ownStoreId` only — equivalent here because FR-009 shows Staff only their own store): 編集 is gated on the `stores.edit` permission, which Y-02 権限マトリクス grants to System / Headquarter for every field (L197) **and** to Staff for their own store's limited set (L198) — so Staff see it enabled, not inert. Other roles (Manager / Trainer / Observer) see it inert at reduced opacity with a trailing 本部 badge, and the gate matches the `/stores/:id/edit` route guard exactly — verify against spec `028-store-form` FR-083, not against the mockup — src: store-list.tsx:L776 (V0 baseline) + role-gated-menu-item.tsx

## Table — empty states

- [x] PAR070 Empty row spans the full column count (9 with the checkbox column, 8 without) — src: store-list.tsx:L721
- [x] PAR071 With a keyword or any active filter: 条件に一致する店舗がありません plus a 条件をクリア outline button — src: store-list.tsx:L722-L730, empty-state.tsx
- [x] PAR072 With no keyword and no active filter: 店舗がまだありません and no action button — src: store-list.tsx:L723, empty-state.tsx
- [x] PAR073 Empty state renders its variant icon (search-x when filtered, package-open when empty) — src: empty-state.tsx

## Pagination footer

- [x] PAR074 Footer separated by a top border, laid out as [summary] [pager] [page-size] — src: store-list.tsx:L793
- [x] PAR075 Summary copy: 全 {total} 件 / {pages} ページ / {start}-{end} を表示 — src: store-list.tsx:L794-L796
- [x] PAR076 **Intentional divergence from V0**: the case cannot arise — the shared `TablePaginationWithSize` hides the whole footer at one page or fewer (shared GUI checklist, "Check when the number of records is less than 1 page"), so a zero-result list shows no footer rather than 全 0 件 / 0-0. The 0-start expression is still in the component for safety — src: store-list.tsx:L795 (V0 baseline) + table-pagination-with-size.tsx
- [x] PAR077 Previous control is inert (dimmed, non-clickable) on the first page — src: store-list.tsx:L800-L803
- [x] PAR078 Next control is inert (dimmed, non-clickable) on the last page — src: store-list.tsx:L821-L824
- [x] PAR079 With ≤7 pages, every page number is listed — src: store-list.tsx:L457
- [x] PAR080 **Intentional divergence from V0**: the page window comes from the shared `TablePaginationWithSize`, which renders 1 … current-1 current current+1 … last at every position, so near the start it is `1 2 … last` rather than V0's four-wide block. Shared across every list screen in the project — src: store-list.tsx:L458 (V0 baseline) + table-pagination-with-size.tsx
- [x] PAR081 **Intentional divergence from V0**: same shared-component window as PAR080 — near the end it is `1 … last-1 last` — src: store-list.tsx:L459 (V0 baseline) + table-pagination-with-size.tsx
- [x] PAR082 In the middle: 1 … prev current next … last — src: store-list.tsx:L460
- [x] PAR083 Current page number is visually active — src: store-list.tsx:L812
- [x] PAR084 ~~**Intentional divergence from V0**~~ **V0 agrees since `1767864`** (`PAGE_SIZE_OPTIONS = [25, 50, 100]`, store-list.tsx L258): labelled 表示件数, defaulting to 50, options 25件 / 50件 / 100件 — the 200 step is dropped because API-083 `GET /admin/stores` declares `limit` maximum 100, so a 200-row page is a request the real endpoint refuses — src: store-list.tsx:L828-L837, L244, L293 (V0 baseline) + use-stores-filters.ts `STORE_PAGE_SIZE_OPTIONS`
- [x] PAR085 Changing page size returns the list to page 1 — src: store-list.tsx:L830
- [x] PAR086 Current page clamps to the last available page when the result set shrinks — src: store-list.tsx:L370

## Select-all confirmation dialog

- [x] PAR087 Dialog opens when the header checkbox selects a page AND the matching result set exceeds one page — src: store-list.tsx:L430
- [x] PAR088 Title 該当する全件を選択しますか？ — src: store-list.tsx:L849
- [x] PAR089 Body: 現在のフィルター条件に該当する {N}件 すべてを選択しますか？ with the count emphasised — src: store-list.tsx:L850-L853
- [x] PAR090 **Intentional divergence from V0**: the sentence names the button instead — 現在ページ（{M}件）のみの選択を維持する場合は「このページのみ選択」を選んでください。 V0's own copy says キャンセルしてください while its cancel action is labelled このページのみ選択 (PAR091), so the verbatim wording points at a button that does not exist — src: store-list.tsx:L854 (V0 baseline)
- [x] PAR091 Cancel action labelled このページのみ選択 — src: store-list.tsx:L858
- [x] PAR092 Confirm action labelled {N}件すべてを選択, selecting every matching store — src: store-list.tsx:L859-L861, L434-L437

## Bulk territory change dialog

- [x] PAR093 Dialog opens from テリトリーを変更 with the destination cleared each time — src: store-list.tsx:L439-L442
- [x] PAR094 Title テリトリーの一括変更 — src: store-list.tsx:L870
- [x] PAR095 Description: 選択した {N} 件の店舗の所属テリトリーを一括で変更します。変更は即時反映され、エリア別の集計・レポートにも反映されます。 — src: store-list.tsx:L871-L874
- [x] PAR096 Field label 変更先のテリトリー followed by the required marker (red asterisk) — src: store-list.tsx:L880-L883
- [ ] PAR097a **[Phase 2 — Round 3]** Destination is a two-tier cascade: エリア select (placeholder エリアを選択) then テリトリー select (placeholder テリトリーを選択) — src: store-list.tsx:L905 + territory-combobox.tsx L37-L104 (`1767864`) — ⏸ Deferred: Checklist marks it [Phase 2 — Round 3] (B1: no Y-15 territory/area API)
- [ ] PAR097b **[Phase 2 — Round 3]** テリトリー select is disabled until an area is chosen, with tooltip 先にエリアを選択してください — src: territory-combobox.tsx L97 — ⏸ Deferred: Checklist marks it [Phase 2 — Round 3] (B1: no Y-15 territory/area API)
- [ ] PAR097c **[Phase 2 — Round 3]** Changing エリア clears the chosen テリトリー — src: territory-combobox.tsx — ⏸ Deferred: Checklist marks it [Phase 2 — Round 3] (B1: no Y-15 territory/area API)
- [ ] PAR097d **[Phase 2 — Round 3]** テリトリー select lists only active territories under the chosen area, keeping a currently selected inactive one — src: territory-combobox.tsx — ⏸ Deferred: Checklist marks it [Phase 2 — Round 3] (B1: no Y-15 territory/area API)
- [ ] PAR097e **[Phase 2 — Round 3]** No search box, no 該当なし, no 「{テリトリー名}（{エリア名}）」 trigger label — the former combobox PAR097–PAR101 are withdrawn — src: territory-combobox.tsx (`1767864`) — ⏸ Deferred: Checklist marks it [Phase 2 — Round 3] (B1: no Y-15 territory/area API)
- [x] PAR102 Once chosen, the full path renders as 運営本部 › ブロック › エリア › テリトリー in muted small text — src: store-list.tsx:L885-L889
- [x] PAR103 変更前 block lists the selected stores' current groups as {エリア名}／{テリトリー名} with a right-hand 件 count, ordered by descending count — src: store-list.tsx:L894-L903, L383-L393
- [x] PAR104 変更前 groups territory-less stores under 未設定 — src: store-list.tsx:L387
- [x] PAR105 変更前 caps at five groups and appends 他 {N} テリトリー — src: store-list.tsx:L898, L904-L908
- [x] PAR106 変更後 shows {エリア名}／{テリトリー名} in primary colour with the selected count — src: store-list.tsx:L911-L919
- [x] PAR107 変更後 shows 変更先のテリトリーを選択してください while no destination is chosen — src: store-list.tsx:L920-L922
- [x] PAR108 変更前 / 変更後 block sits on a muted rounded panel with the two labels left-aligned in a fixed-width column — src: store-list.tsx:L893-L924
- [x] PAR109 Cross-area warning appears only when a destination is chosen AND at least one selected store changes area — src: store-list.tsx:L927
- [x] PAR110 Warning uses a warning-tinted panel with a triangle-alert icon — src: store-list.tsx:L928-L929
- [x] PAR111 Warning copy: {N}件のうち {M}件 は所属エリアも変わります（{変更前エリア一覧・区切り} → {変更後エリア}）。予約管理の「エリア別」ビューと分析・レポートの集計対象が変わります。 — src: store-list.tsx:L930-L934
- [x] PAR112 Warning lists distinct source areas, using 未設定 for territory-less stores — src: store-list.tsx:L399-L401
- [x] PAR113 Preview label 対象店舗プレビュー（全 {N} 件） — src: store-list.tsx:L940-L942
- [x] PAR114 Preview rows are two-line: line 1 = monospace club code (fixed width) + store name (truncated) — src: store-list.tsx:L948-L951
- [x] PAR115 Preview line 2 = current territory name (or 未設定) → arrow → destination territory name (or ―), indented under the store name — src: store-list.tsx:L952-L958
- [x] PAR116 Preview caps at five stores and appends 他 {N} 件 above a top border — src: store-list.tsx:L946, L961-L965
- [x] PAR117 Cancel action labelled キャンセル — src: store-list.tsx:L971
- [x] PAR118 実行 action is disabled until a destination territory is chosen — src: store-list.tsx:L972
- [x] PAR119 Executing closes the dialog, clears the selection, clears the destination, and turns off 選択中のみ表示 — this is the full-success path (PAR131); on partial failure the selection is instead reduced to the failures per PAR133 — src: store-list.tsx:L444-L450
- [x] PAR120 Executing raises a success toast titled {N}件のテリトリーを変更しました with description 変更後: {テリトリー名} — src: store-list.tsx:L451-L453

## Loading & error states

> **Not present in V0** — the mockup renders static local data, so it has no async states. These come from the 2026-08-28 server-side clarification; verify against spec Edge Cases, not against the mockup.

- [x] PAR124 Table shows a loading treatment while a query is in flight (never the empty state) — src: spec.md Edge Cases
- [x] PAR125 A failed query is visibly distinct from a zero-result query — src: spec.md Edge Cases

## URL state

> **Not present in V0** — the mockup keeps filter state in local component state. These come from the 2026-08-28 URL-state clarification; verify against spec FR-017a / FR-017b, not against the mockup.

- [x] PAR126 Keyword, all six filters, sort column, sort direction, page, and page size are reflected in the address — src: spec.md FR-017a
- [x] PAR127 Reloading or opening a shared address restores exactly that list state; absent parameters fall back to the defaults (no keyword, all filters at their "all" option, no sort, page 1, page size 50) — src: spec.md FR-017a
- [x] PAR128 Browser back/forward moves between successive filter states — src: spec.md FR-017a
- [x] PAR129 An unusable parameter degrades to its default and still renders the list; a territory parameter without a matching area is dropped — src: spec.md FR-017b

## Bulk change outcome — partial success

> **Not present in V0** — the mockup always raises a success toast. These come from the 2026-08-28 partial-success clarification; verify against spec FR-036 / FR-036a / FR-036b, not against the mockup.

- [x] PAR131 Full success: message names the number changed and the destination territory; selection cleared; 選択中のみ表示 turned off; list shows the new territories — src: spec.md FR-036
- [x] PAR132 Partial failure: outcome reports the succeeded and failed counts and names the failed stores — src: spec.md FR-036a
- [x] PAR133 Partial failure: selection is reduced to exactly the failed stores (retry needs no re-selection) — src: spec.md FR-036a
- [x] PAR134 Partial failure: successfully reassigned stores stay reassigned — no rollback — src: spec.md FR-036a
- [x] PAR135 Total failure: nothing changes, the failure is reported, and the full selection is retained — src: spec.md FR-036b

## Cross-page selection behaviour

- [x] PAR121 Selection is held per store across pages — moving pages never drops it — src: store-list.tsx:L355-L356
- [x] PAR122 Header checkbox on a fully-selected page deselects exactly that page's rows, retaining other pages' selections — src: store-list.tsx:L417-L424
- [x] PAR123 選択中のみ表示 restricts the table to selected stores, with totals and paging recomputed over that reduced set — src: store-list.tsx:L363-L373
