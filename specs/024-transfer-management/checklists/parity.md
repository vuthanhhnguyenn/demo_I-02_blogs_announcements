# UI Parity Checklist: Transfer Management (Member Store Transfers)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `transfer-list.tsx` + `transfer-detail.tsx` (dx-fitness/fitness-crm-ui @ 47423ec, 2026-09-30 — transfer screens last changed in 1767864, 2026-09-17) — as recorded in spec.md header
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.
**Legend**: `[x]` verified · `[ ]` changed or added in the 2026-10-05 re-sync, not yet re-verified on the running app · `[~]` deliberate deviation or retired (reason given; treat as resolved)

## List — Page Header

- [x] PAR001 Page title "移籍管理" with live result count badge — src: transfer-list.tsx:509-513

## List — Toolbar

- [~] PAR002 ~~Search input "申請ID・会員名で検索"~~ — **RETIRED**: removed from the prototype in 1767864 (free-word search is out of Phase 1 scope, spec FR-003). Must NOT be rendered — src: transfer-list.tsx:523
- [x] PAR003 "詳細フィルター" toggle button — SlidersHorizontal icon, active-filter count badge, chevron flips up/down, label toggles "詳細フィルター"/"閉じる"; it is the only toolbar control — src: transfer-list.tsx:524-540

## List — Expandable Filter Row (shown when toggled open)

- [ ] PAR004 Status select: 全ステータス / 移籍元承認待ち / 移籍先承認待ち / 完了 / 否認 — the prototype's 申請中 is not offered (API-091 has no such value; spec _Kept deviations_) — src: transfer-list.tsx:546-558
- [ ] PAR005 Origin-store (移籍元) select: "全店舗（移籍元）" + the stores returned by the store API (sorted by name) — src: transfer-list.tsx:559-569
- [ ] PAR006 Destination-store (移籍先) select: "全店舗（移籍先）" + the same store list as origin — src: transfer-list.tsx:570-580
- [~] PAR007 Brand select: 全ブランド / JOYFIT / FIT365 — JOYFIT is shown **disabled** (`brandEnum` takes one store brand, not the JOYFIT group; spec _Kept deviations_) — src: transfer-list.tsx:581-590
- [x] PAR008 Applied-period select: 全期間 / 今月 / 先月 / 今年 — src: transfer-list.tsx:591-601
- [x] PAR009 Auto-transfer eligibility select: "自動移籍: すべて" / "自動可のみ" / "除外あり" — src: transfer-list.tsx:603-612
- [x] PAR010 Any active (non-default) filter select renders a highlighted border/background state — src: transfer-list.tsx:303-307

## List — Bulk Approve Bar (shown only when ≥1 row selected, below the filter row)

- [x] PAR011 "{n}件選択中" label — src: transfer-list.tsx:619
- [x] PAR012 "選択解除" ghost button clearing all selections — src: transfer-list.tsx:620-622
- [x] PAR013 Vertical divider between clear-selection and bulk-approve controls — src: transfer-list.tsx:623
- [x] PAR014 Role-gated "選択した{n}件を一括承認" button — enabled for Headquarter/System/Manager only, deny tooltip "一括承認はHQ・Manager権限が必要です" — src: transfer-list.tsx:624-632

## List — Filter Result Banner

- [ ] PAR015 Banner shown when any filter is active, displaying total scoped count, filtered count, a joined summary of active filter labels, and a clear-all action — src: transfer-list.tsx:637-643

## List — Table Structure

- [x] PAR016 Sticky table header row — src: transfer-list.tsx:649
- [x] PAR017 Checkbox column header: select-all checkbox supporting checked/indeterminate/unchecked, disabled when no selectable rows on the page — src: transfer-list.tsx:651-660
- [x] PAR018 Column order: checkbox, 会員ID, 会員名, ブランド, 移籍元店舗, 移籍先店舗, 申請日, 移籍予定日, 自動移籍可否, ステータス, row-action — src: transfer-list.tsx:661-670

## List — Table Rows

- [ ] PAR019 Empty state — "filtered" variant with "条件をクリア" button when a filter is active, plain "empty" variant otherwise, entity label "移籍" — src: transfer-list.tsx:674-687
- [ ] PAR020 Row checkbox cell (either brand): blank for decided rows (完了/否認); interactive checkbox for selectable pending rows; disabled checkbox + tooltip with the reason otherwise — the store-scope reason (PAR064) or "除外理由のため個別対応が必要です" for an excluded JOYFIT row — src: transfer-list.tsx:416-422, 700-729
- [x] PAR021 会員ID cell in monospace, muted color — src: transfer-list.tsx:730
- [x] PAR022 会員名 cell, medium weight, click opens the member detail (A-01-01) without opening the transfer — src: transfer-list.tsx:731-741
- [x] PAR023 Brand badge cell (JOYFIT primary / FIT365 destructive tokens) — src: transfer-list.tsx:743
- [x] PAR024 移籍元店舗 text cell — src: transfer-list.tsx:744
- [x] PAR025 移籍先店舗 text cell — src: transfer-list.tsx:745
- [x] PAR026 申請日 text cell, muted — src: transfer-list.tsx:746
- [x] PAR027 移籍予定日 text cell — src: transfer-list.tsx:747
- [x] PAR028 自動移籍可否 cell: "—" for non-JOYFIT or undefined eligibility; success "自動可" badge when eligible; stacked exclusion badges when not — src: transfer-list.tsx:243-296, 749-751
- [~] PAR029 Exclusion badge "除外: 未納あり" (destructive) — rendered **without** the "未納金: ¥{amount}" tooltip: the list response has no amount (spec _Kept deviations_) — src: transfer-list.tsx:260-273
- [~] PAR030 Exclusion badge "除外: 縛り期間中" (warning) — rendered **without** the "残り {n}日" tooltip: the list response has no remaining days (spec _Kept deviations_) — src: transfer-list.tsx:274-287
- [ ] PAR031 ステータス cell: outline badge with colored dot for 移籍元承認待ち(warning)/移籍先承認待ち(warning)/否認(destructive); secondary badge without dot for 完了 (no 申請中 — see PAR004) — src: transfer-list.tsx:213-241, 752-765
- [ ] PAR032 Row action cell: "…" (MoreHorizontal) menu shown only for pending rows, containing "承認" (CheckCircle) and "否認" (XCircle, destructive text) separated by a divider; 承認 is disabled with a tooltip when PAR064 or an exclusion (PAR065) applies, 否認 only when PAR064 applies — src: transfer-list.tsx:767-832
- [x] PAR033 Clicking anywhere on a row (outside checkbox/action cells) navigates to the transfer detail screen — src: transfer-list.tsx:694-698

## List — Pagination Footer

- [x] PAR034 Summary text "全 {total} 件 / {pages} ページ / {start}-{end} を表示" — src: transfer-list.tsx:845-847
- [x] PAR035 Prev/Next controls ("前へ"/"次へ") disabled at first/last page — src: transfer-list.tsx:850-884
- [x] PAR036 Numbered page links with ellipsis collapsing when total pages > 7 — src: transfer-list.tsx:477-489, 859-875
- [ ] PAR037 Page-size selector: 25 / 50 / 100件 — default is **25** (app-wide `PAGE_SIZE`) instead of the prototype's 50 (spec _Kept deviations_) — src: transfer-list.tsx:310, 343, 886-899

## List — Approve / Reject / Bulk-Approve Dialogs

- [x] PAR038 承認確認 dialog: title "移籍申請を承認しますか？"; description names member + brand-conditional copy (JOYFIT: auto-execute note; FIT365 at 移籍元承認待ち: destination-approval-requested note; otherwise: transfer-executes note); optional comment textarea; Cancel/"承認する" actions; success toast on confirm — src: transfer-list.tsx:907-953
- [x] PAR039 否認確認 dialog: title "移籍申請を否認しますか？"; description names member, states applicant will be notified and case closed; optional comment textarea (placeholder "否認理由を入力してください（任意）"); Cancel/destructive "否認する" actions; success toast on confirm — src: transfer-list.tsx:956-998
- [ ] PAR040 一括承認 dialog: title "{n}件の移籍申請を承認しますか？"; description "選択した各案件の現在のステップを承認します。JOYFITの案件は承認後、システムが自動で移籍を実行します。この操作は取り消せません。" plus, when FIT365 cases are selected, "FIT365の案件（{n}件）は現在のステップ（移籍元／移籍先）の承認として処理されます。"; optional comment textarea (OptionalMark); Cancel/"承認する" actions; clears selection and shows success toast on confirm — src: transfer-list.tsx:1001-1045

## Detail — Page Header

- [x] PAR041 BackLink "移籍管理に戻る" navigating back to the transfer list — src: transfer-detail.tsx:653-656
- [x] PAR042 Title "{memberName} さんの移籍申請" — src: transfer-detail.tsx:658
- [~] PAR043 ~~Request-ID badge next to the title~~ — **RETIRED**: no longer in the prototype; the header carries the status badge only (申請ID is shown in the 移籍情報 card, PAR051)
- [x] PAR044 Status badge: secondary variant for 完了; outline + colored dot (warning/destructive) otherwise — src: transfer-detail.tsx:659-671

## Detail — Demo Brand Switch

- [~] PAR045 Dashed-border demo control "デモ切替（ブランド）" select — JOYFIT（自動移籍）/ FIT365（手動2段階承認） — src: transfer-detail.tsx:676-689
  **NOT IMPLEMENTED — deliberate exclusion** (plan.md Complexity Tracking, 2026-08-05). This is a
  mockup-only affordance for previewing both brand flows on one static page. The real detail screen
  derives `brand` from the transfer record, so a manual brand switcher would let a user misrepresent
  a JOYFIT transfer as FIT365. Treat this item as resolved; do not build it.

## Detail — Member Headup Card

- [ ] PAR046 MemberHeadupCard rendering name, nameKana, "ID: {memberId} / 旧No: {oldMemberNo}" and "主契約店舗: {origin store}", 会員種別 / "主契約: {contract}" badges, and a ghost "会員詳細を開く" (ArrowUpRight) button opening the member detail — src: transfer-detail.tsx:691-699, member-headup-card.tsx:57-65

## Detail — Exclusion Alerts (JOYFIT only)

- [ ] PAR047 Unpaid-balance alert (destructive, AlertTriangle icon): title "自動移籍 除外: 未納金あり"; body states amount + billing period; "売上詳細を確認" link — opens the member detail's payment tab (no per-arrears sales detail route; spec _Kept deviations_) — src: transfer-detail.tsx:291-307
- [x] PAR048 Campaign-lock alert, locked state (warning styling, AlertTriangle icon): title "自動移籍 除外: キャンペーン縛り期間中（解約手数料期間）"; body states remaining days; role-gated "管理者権限で手動解除して移籍を通す" button (Headquarter/System/Manager only, deny tooltip "手動解除は管理者権限が必要です") — src: transfer-detail.tsx:318-342
- [~] PAR049 Campaign-lock alert, unlocked state (success styling, Check icon): title "管理者により手動解除済み"; body shows 解除理由, 実行者 + timestamp, and "移籍を進められる状態です。" — **NOT RENDERED**: the real detail carries no unlock record and there is no manual-release endpoint yet (spec _Kept deviations_) — src: transfer-detail.tsx:308-317
- [x] PAR050 手動解除 confirmation dialog: title "解約手数料期間中の移籍を強制実行しますか？"; body warns of irreversibility and possible member fee; required 解除理由 textarea (RequiredMark, example placeholder text); Cancel / destructive "解除して移籍を通す" action disabled until a reason is entered — src: transfer-detail.tsx:345-378

## Detail — Transfer Info (Left Column, 60%)

- [ ] PAR051 "移籍情報" card fields, in order: 申請ID (mono), 移籍予定日, 移籍元店舗, 移籍先店舗, 移籍理由 (full-width row), ブランド (brand badge), 申請者, 申請日時 — 申請者 shows the name only (`createdBy` has no role; a member's own filing reads 「会員本人」 — spec _Kept deviations_) — src: transfer-detail.tsx:443-486
- [ ] PAR052 "承認フロー" card header with a **brand-colored** flow badge: "自動移籍" for JOYFIT, "手動移籍（2段階承認）" for FIT365 — src: transfer-detail.tsx:490-497
- [x] PAR053 Brand explanatory note text: FIT365 — "FIT365の移籍は移籍元・移籍先の両店舗の承認が必要です。"; JOYFIT — "JOYFITの移籍は移籍元店舗の確認・承認後、システムが自動で移籍を実行します。" — src: transfer-detail.tsx:500-509
- [ ] PAR054 Approval timeline step indicator: success circle + Check icon when completed; info circle + Bot icon for the pending automatic step; muted circle + Clock icon otherwise — no separate "current step" highlight or 対応待ち badge — src: transfer-detail.tsx:511-529
- [x] PAR055 Connecting vertical line between steps, colored success when the step above is completed — src: transfer-detail.tsx:530-532
- [x] PAR056 Step content: label (muted when not completed), optional "移籍元"/"移籍先" store-type badge, optional "自動実行" badge, and description sub-line — src: transfer-detail.tsx:534-557
- [x] PAR057 JOYFIT timeline has exactly 3 steps: 申請 → 移籍元承認 → システム自動移籍実行 (marked isAutomatic) — src: transfer-detail.tsx:134-160
- [x] PAR058 FIT365 timeline has exactly 4 steps: 申請 → 移籍元承認 → 移籍先承認 → 移籍実行 — src: transfer-detail.tsx:161-193

## Detail — Transfer Info (Right Column, 40%, sticky)

- [ ] PAR059 StatusCard tone/icon by status: 移籍元承認待ち→warning/Clock, 移籍先承認待ち→warning/Clock, 否認→destructive/FileText, 完了→muted/Check (no 申請中 — see PAR004) — src: transfer-detail.tsx:230-248, 569-572
- [x] PAR060 StatusCard label = current status text; meta lines show 申請日, 最終更新, plus an extra "移籍先店舗の承認待ちです" line only for FIT365 at 移籍先承認待ち — src: transfer-detail.tsx:573-577
- [ ] PAR061 StatusCard action area shown only while pending: "承認" button (label becomes "移籍先として承認" at 移籍先承認待ち) and outline destructive "否認" button, both for Headquarter/System/Manager/Staff with deny tooltips "移籍承認の権限がありません" / "移籍否認の権限がありません"; 承認 is disabled with a reason tooltip when PAR064 or an exclusion (PAR065) applies, 否認 only when PAR064 applies — src: transfer-detail.tsx:578-622

## Detail — Approve / Reject Dialogs

- [x] PAR062 承認 dialog: title "移籍申請を承認しますか？"; description "{name} さんの {fromStore} から {toStore} への移籍を承認します。"; optional コメント textarea (OptionalMark); Cancel/"承認する" actions — src: transfer-detail.tsx:710-738
- [ ] PAR063 否認 dialog: title "移籍申請を否認しますか？"; description "{name} さんの移籍申請を否認します。否認後、申請者へ通知され、案件はクローズされます。"; optional コメント textarea (OptionalMark, placeholder "否認理由を入力してください（任意）"); Cancel/destructive "否認する" actions — src: transfer-detail.tsx:740-768

## Cross-screen — Action Gating (added 2026-10-05)

- [ ] PAR064 Store-scope block: when the store that owns the current step (origin while 移籍元承認待ち, destination while 移籍先承認待ち) is not the Staff/Manager user's store, 承認 and 否認 are disabled (list menu + detail status card) and the row checkbox is disabled, all with the tooltip "{移籍元|移籍先}店舗（{store}）の承認待ちのため、所属店舗からは操作できません"; HQ/System are never blocked — src: transfer-list.tsx:324-333, transfer-detail.tsx:401-415
- [ ] PAR065 Exclusion block on 承認: an excluded JOYFIT request shows 承認 disabled with the tooltip "未納金があるため承認できません。未納解消後に再申請してください" (未納) or, for 縛り期間, "キャンペーン縛り期間中のため承認できません。移籍詳細から管理者権限で手動解除してください" (list) / "キャンペーン縛り期間中のため承認できません。管理者権限で手動解除すると承認できます" (detail); 否認 stays enabled — src: transfer-list.tsx:200-206, transfer-detail.tsx:417-428
- [ ] PAR066 A role without the approve permission (Observer) sees neither the checkbox column nor the row-action column in the list — not disabled controls (BUG-A02-030; project decision, the prototype role-gates per item)
