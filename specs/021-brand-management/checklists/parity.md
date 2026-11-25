# UI Parity Checklist: Brand Master Management

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: dx-fitness/fitness-crm-ui@c909e33 — `src/pages/brand-list.tsx`, `src/pages/brand-detail.tsx` (as recorded in spec.md header). **Re-baselined in Round 2 against `47423ec` (9/30 デザイン更新)** for the items marked (9/30).
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

> **Note on this pass**: ticked from static code review (component source read end-to-end), not a live browser run — user will verify live separately. Items left unchecked below are genuine gaps found in the current code, not oversights in this review.

> **Real-API integration, Round 1 (2026-09-22)**: items below that the real backend cannot support
> are un-ticked and annotated with the blocker id from
> [`../integration-plan.md`](../integration-plan.md). The UI for each is commented out in place, not
> deleted, so the parity item is restored by uncommenting it in the round named. Everything still
> ticked was re-verified live against `NEXT_PUBLIC_REAL_API_URL`, not from code review.

> **Round 2 (2026-10-05)**: re-baselined on prototype 9/30 (`47423ec`) after the Y-07 260928_v3
> Q&A answer; every item touched by that redesign was rewritten and re-verified live (HQ write
> path, Manager / Staff / System role gating). New items PAR065–PAR069 cover elements 9/30 added.

## Brand List — Toolbar & Table

- [ ] PAR001 Search input — **removed in Round 1 (plan D4)**: the managed brands are a fixed pair (Y-07 FR-001) and `GET /admin/brands` takes no query params, so searching two always-visible rows is furniture. Markup commented out in `page.tsx`. Original: — placeholder "キーワードで検索...", filters by name/code — src: brand-list.tsx:141-149
- [ ] PAR002 Filter result banner — **removed in Round 1 (plan D4)**, with PAR001. Original: — shown only when search query non-empty, shows total/count/quoted query, "clear" action — src: brand-list.tsx:152-158
- [x] PAR003 Table header — columns in order: ブランドID, ブランド名, (blank actions column) — src: brand-list.tsx:163-168
- [x] PAR004 Table row — ブランドID cell rendered as monospace muted text — src: brand-list.tsx:188
- [x] PAR005 Table row — ブランド名 cell rendered as medium-weight text — src: brand-list.tsx:189
- [x] PAR006 Row click (excluding action cell) navigates to brand-detail — src: brand-list.tsx:187
- [x] PAR007 Empty state — "empty" variant when no search query and zero brands — src: brand-list.tsx:171-184
- [x] PAR008 Empty state — "filtered" variant with "条件をクリア" button when search yields zero results — src: brand-list.tsx:171-184
- [x] PAR009 Row action menu (⋮) — dropdown containing only "編集" (Pencil icon), role-gated to Headquarter/System. **Round 2 (2026-10-05)**: restored (Y-07 260928_v3 FR-001 makes ブランド名 HQ-editable); live: enabled for System, disabled with 本部 badge for Manager/Staff — src: brand-list.tsx:190-204
- [x] PAR010 Row action menu — no delete option present — src: brand-list.tsx:202

## Brand List — Pagination Footer

- [ ] PAR011 Summary text — **removed in Round 1 (plan D4)**: two fixed rows never paginate. Original: — "全 {total} 件 / {totalPages} ページ / {start}-{end} を表示" — src: brand-list.tsx:215-217
- [ ] PAR012 Pagination controls — **removed in Round 1 (plan D4)**. Original: — 前へ/次へ with disabled state at first/last page, numbered links with ellipsis for >7 pages — src: brand-list.tsx:218-250
- [ ] PAR013 Page-size selector — **removed in Round 1 (plan D4)**. Original: — options 25/50/100/200件, resets to page 1 on change — src: brand-list.tsx:251-261,76

## Brand List — Edit Sheet ("ブランド編集")

- [x] PAR014 Sheet title "ブランド編集" — src: brand-list.tsx:272
- [x] PAR015 Field "ブランド名" (required mark) — text input pre-filled with current name — src: brand-list.tsx:278-284
- [x] PAR016 Field "ブランドID" (required mark) — read-only/disabled input, pre-filled with current code — src: brand-list.tsx:286-295
- [x] PAR017 Helper text under ブランドID — "システム内部キーのため変更できません。" — src: brand-list.tsx:296-298
- [x] PAR018 Fee section note — heading "費用（入会金・手数料）" + text "費用の設定はブランド詳細画面の「費用」タブで管理します。" (no editable fee fields in this sheet) — src: brand-list.tsx:300-305
- [x] PAR065 Empty ブランド名 on save — error 「ブランド名を入力してください」 under the field, sheet stays open (prototype 9/30) — live-verified — src: brand-list.tsx (9/30) handleSave
- [x] PAR019 Footer buttons — "キャンセル" (outline) and "保存する" (primary) — src: brand-list.tsx:309-312

## Brand Detail — Page Header & Access Gate

- [x] PAR020 Breadcrumb/back link — "ブランド管理に戻る" navigates to brand-list — src: brand-detail.tsx:838-843,869-873
- [x] PAR021 Page title — brand display name — src: brand-detail.tsx:845,875
- [x] PAR022 No status badge next to the title — **Round 2 (2026-10-05)**: prototype 9/30 dropped the brand 有効 badge (Y-07 defines no brand status); live: h1 renders alone — src: brand-detail.tsx (9/30) PageHeader
- [ ] PAR023 Access-denied state — for Trainer/Observer roles: ShieldAlert icon, heading "アクセス権限がありません", body "ブランド設定はトレーナー・オブザーバー権限では参照できません。" (page header/back link still shown, tabs/content withheld) — src: brand-detail.tsx:830-859
<!-- Accepted deviation (research.md G7): Trainer/Observer are redirected to the shared /(private)/403 page by the proxy-level PAGE_PERMISSIONS gate (src/proxy.ts:102-103) before this page ever mounts, instead of an in-page ShieldAlert message. Functionally equivalent; intentionally left unticked since the V0 copy/element itself is not rendered. -->

## Brand Detail — Tabs Bar

- [x] PAR024 Tab "基本情報" — src: brand-detail.tsx:889
- [x] PAR025 Tab "費用" with count badge = number of registered fee masters (a deleted master is not counted) — live: JOYFIT 4 → 3 after 削除 → 4 after ［＋登録］ — src: brand-detail.tsx (9/30) TabsTrigger 費用
- [x] PAR026 Tab "変更履歴" with count badge — **Round 2 (2026-10-05)**: restored from `pagination.totalItems` (B2 closed); live: JOYFIT 8 → 16 after the write smoke — src: brand-detail.tsx (9/30) TabsTrigger 変更履歴

## Brand Detail — 基本情報 Tab

- [x] PAR027 No helper text above the 基本情報 cards — prototype 9/30 removed 「ブランドの基本情報を管理します。」; not rendered — src: brand-detail.tsx (9/30) TabsContent 基本情報
- [x] PAR028 一般情報 card header — "変更" button (Pencil), role-gated Headquarter/System, opens the shared ブランド編集 sheet — **Round 2 (2026-10-05)**: replaces the disabled 基本情報を編集 placeholder; live: rename JOYFIT → JOYFIT SMOKE → JOYFIT round-trip, disabled for Manager/Staff — src: brand-detail.tsx (9/30) 一般情報 CardHeader
- [x] PAR029 Card "一般情報" (left column) — fields ブランドID (monospace) and ブランド名 in 2-col grid — src: brand-detail.tsx:926-942
- [~] PAR030 その他情報 card (right column, sticky) — 作成日時 / 作成者 / 更新日時 / 更新者 from `BrandDetailDto` (B4 closed). **作成者 renders 「—」 — G2**: the DTO has no brand-level `createdBy*`. Live: 作成日時 2026/09/30 00:30:41, 更新 moved to the rename time with 更新者 HQ 1 — src: brand-detail.tsx (9/30) その他情報

## Brand Detail — 費用 Tab (Fee Cards)

- [x] PAR031 No helper text above the fee cards — prototype 9/30 removed it — src: brand-detail.tsx (9/30) TabsContent 費用
- [x] PAR032 No tab-level "新規登録" button — prototype 9/30 moved registration onto each 未登録 card (PAR067) — src: brand-detail.tsx (9/30) TabsContent 費用
- [x] PAR033 Fee card title — "{brandName} / {subBrand}" for JOYFIT, "{brandName}" alone for FIT365 — live: 「JOYFIT / JOYFIT24」, 「FIT365」 — src: brand-detail.tsx (9/30) FeeCard cardTitle
- [x] PAR034 費用マスタ section heading — "費用マスタ" + status badge 有効 (success) / 無効 (muted), data-driven from `feeMasterStatus` — **Round 2 (2026-10-05)**: R301 closed for the fee master; live: 有効 → 無効 → 有効 — src: brand-detail.tsx (9/30) FeeCard section heading
- [x] PAR035 No fee ID badge — prototype 9/30 removed `EF00n` from the card (R306 moot) — src: brand-detail.tsx (9/30) FeeCard
- [x] PAR036 費用マスタ section action "変更" (Pencil icon) — role-gated Headquarter/System, opens the fee sheet in 変更 mode — src: brand-detail.tsx (9/30) FeeCard
- [x] PAR037 ⋯ menu — "費用マスタを無効化" (Ban) when active / "費用マスタを有効化" (CheckCircle2, immediate) when inactive, separator, "費用マスタを削除" (Trash2, destructive); HQ/System only, disabled ⋯ for others — **Round 2 (2026-10-05)**: R302 closed; live: all three actions, ⋯ disabled for Manager — src: brand-detail.tsx (9/30) FeeCard DropdownMenu
- [x] PAR038 無効化 confirm dialog — title "{card} の費用マスタを無効にしますか？", body with the items + amounts, 「変わらないもの」 list (サブブランド「X」（店舗で選ぶ区分）/ X の店舗・会員の登録 / 入会済みの会員の入会時の費用…), キャンセル / 無効にする — live: copy verified verbatim — src: brand-detail.tsx (9/30) 無効化 AlertDialog
- [x] PAR039 削除 — via the ⋯ menu (PAR037), destructive item — **Round 2 (2026-10-05)**: R304 closed (`DELETE .../fee-master`) — src: brand-detail.tsx (9/30) FeeCard DropdownMenu
- [x] PAR040 削除 confirm dialog — title "{card} の費用マスタを削除しますか？", body with items + amounts (+ 「、予約中の改定 N件」), 「…には費用マスタが無い状態になり、元に戻せません。」, the 無効化 hint while active, 「変わらないもの」 incl. これまでの変更履歴, キャンセル / 削除する (destructive) — live: copy verified — src: brand-detail.tsx (9/30) 物理削除 AlertDialog
- [x] PAR041 費用項目① block — label "費用項目①: {name}", "現行設定" caption (no 現行 badge in 9/30), 2-col grid (定価（税込）bold / 有効開始日) — src: brand-detail.tsx (9/30) FeeCard 費用項目①
- [x] PAR070 Fee item names — G-05 / prototype wording: JOYFIT 入会金 / 登録事務手数料, FIT365 セキュリティ管理／施設メンテナンス料 / 会員カード発行料 (user decision 2026-10-05; was Y-07's wording) — src: brand-detail.tsx (9/30) FIT365_FEES / FEE_ITEM_DEFAULTS
- [x] PAR042 費用項目① note line — FIT365 「入会3ヶ月目に発生・以後1年ごと（税込）」, derived from `maintenanceFeeStartMonth` / `maintenanceFeeCycleMonth` — live: FIT365 card — src: brand-detail.tsx (9/30) feeItem1Note
- [x] PAR043 Scheduled revisions on the card — CalendarClock + "予約中の改定" + count badge; each row (fill, no border): "予約" badge + "有効開始日 {date}" + bold price + "登録: {at} / {by}" — live: 「予約 有効開始日 2027/04/01 ¥3,456 登録: 2026/10/05 / HQ 1」 — src: brand-detail.tsx (9/30) FeeCard revisions
- [x] PAR044 Divider between fee item① and ② — src: brand-detail.tsx:670
- [x] PAR045 費用項目② block — label "費用項目②: {feeItem2Name}", "現行" badge, 2-col grid (定価（税込）/ 有効開始日) — src: brand-detail.tsx:672-691
- [x] PAR046 費用項目② scheduled revisions — same structure as PAR043 — src: brand-detail.tsx:692-717
- [x] PAR047 キャンセルポリシー sits outside the 費用マスタ section (kept when the master is deleted) — live: still shown on the 未登録 card — src: brand-detail.tsx (9/30) CancelPolicyNote placement
- [x] PAR048 キャンセルポリシー note — Info icon + 「キャンセルポリシー：申請日〜利用開始日の間にキャンセルした場合のみ全額返金可。利用開始後は返金不可。」 (G-05 MOD-09, B7 partly closed) — live: one per card — src: brand-detail.tsx (9/30) CancelPolicyNote
- [x] PAR066 Inactive note — 「この費用マスタは無効です。金額と予約中の改定はそのまま残っています。」 at the top of the section, only while 無効 — live-verified — src: brand-detail.tsx (9/30) !fee.isActive
- [x] PAR067 未登録 card — same frame, dashed 費用マスタ section with heading + 未登録 (muted) badge + "＋ 登録" (role-gated, deny tooltip 「費用マスタの登録には本部権限が必要です」), キャンセルポリシー below — live: after 削除 — src: brand-detail.tsx (9/30) UnregisteredFeeCard
- [x] PAR049 Fee tab empty state — DollarSign icon + "費用マスタが登録されていません" when zero fee entries — src: brand-detail.tsx:996-1005

## Brand Detail — Fee Edit Sheet

- [x] PAR050 Sheet title — "{card}の費用マスタを変更" / "…を登録" — live: both modes — src: brand-detail.tsx (9/30) SheetTitle
- [x] PAR051 Each fee item as a card titled "費用項目①/②", 費用項目名 shown as **text** (label + value), not an input — R307 now matches the prototype — src: brand-detail.tsx (9/30) FeeItemSection
- [x] PAR052 現行設定 block — "現行設定" heading (hidden in 登録 mode), 有効開始日 DatePicker + 定価（税込）input with ¥ prefix; required errors under each field on save — live: 「定価（税込）を入力してください」 — src: brand-detail.tsx (9/30) FeeItemSection 現行設定
- [x] PAR053 Past-date warning — only when the date is **changed** to a past one (opening on the stored 2026/04/23 shows none; live-verified) — 「過去の日付が指定されています。登録は可能ですが、即座に適用が開始されます。」 — src: brand-detail.tsx (9/30) isPastCurrent
- [~] PAR054 予約中の改定 list (edit mode, when revisions exist) — count badge + note **「（有効開始日当日に自動切替）」**: the prototype's 「・BE」 suffix is a design annotation for developers and is deliberately not shown to operators (confirmed by the user 2026-10-05) — src: brand-detail.tsx (9/30) FeeItemSection revisions
- [x] PAR055 RevisionRow — 有効開始日 DatePicker + 定価（税込）input, delete (Trash2) button — src: brand-detail.tsx:146-201
- [x] PAR056 RevisionRow — duplicate-date alert shown live (「有効開始日が重複しています。別の日付を指定してください。」); other date conflicts (vs. 現行 start) use the same alert slot with their own message — not exercised live — src: brand-detail.tsx (9/30) RevisionRow isDuplicate
- [x] PAR057 RevisionRow — past-date warning alert (when not duplicate) — src: brand-detail.tsx:141,182-189
- [x] PAR058 "改定スケジュールを追加" (Plus) + 「将来日付を指定して改定を事前登録できます。」 — edit mode only; disabled at 20 (`maxItems`) — live: added a 2027/04/01 row through the picker (year range now reaches 2036) — src: brand-detail.tsx (9/30) addRevision
- [x] PAR059 金額プレビュー block — "プレビュー（会員向け表示）" label, bold price + "（税込）", item name — src: brand-detail.tsx:348-359
- [x] PAR068 登録 mode — empty 有効開始日 / 定価, no 現行設定 heading, no 予約 section or add button, footer 登録する; toast 「「{card}」の費用マスタを登録しました」 — live: re-registered JOYFIT YOGA — src: brand-detail.tsx (9/30) handleOpenFeeRegister
- [x] PAR069 Toasts — 無効化 「…を無効にしました」, 有効化 「…を有効化しました」, 削除 「…を削除しました」, rename 「ブランド情報を更新しました」; 変更 save closes without a toast, as in the prototype — src: brand-detail.tsx (9/30) handlers
- [x] PAR060 費用項目② section — identical structure to items PAR051-PAR059, independent state — src: brand-detail.tsx:1036-1046
- [x] PAR061 Sheet footer — "キャンセル" + role-gated "保存する" / "登録する" (`RoleGatedButton`) — src: brand-detail.tsx (9/30) footer

## Brand Detail — 変更履歴 Tab

- [x] PAR062 Card header — History icon + title "変更履歴" — src: brand-detail.tsx:1076-1081
- [x] PAR063 Table columns in order — 変更日時, 変更者, 対象, 変更項目, 変更前, 変更後 — src: brand-detail.tsx:1083-1091
- [x] PAR064 Table rows populated from change-history records, one row per entry — src: brand-detail.tsx:1094-1103
