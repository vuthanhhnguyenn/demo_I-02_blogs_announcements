# UI Parity Checklist: Member Detail (会員詳細)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: dx-fitness/fitness-crm-ui `src/pages/member-detail.tsx`@`0a73739` (as recorded in spec.md header)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.
**Known deviations (do not tick, do not report as bugs)**: the app intentionally differs from the prototype on these items, by client or PO decision:

- PAR039, PAR435–PAR440: 強制退会 menu item and dialog were removed (qa-223, prototype-gap-list #2).
- PAR307: there is no 代理申請 switch; 合意日時 and 合意方法 are always required (API `applicationSource: proxy` only, report N20, prototype-gap-list #10). The rules in PAR308–PAR310 apply unconditionally.
- PAR131: 個別会費調整 has no 代理申請 block (prototype-gap-list #9, qa-242 pending).
- PAR429: 解約タイミング reads 即時解約 / 当月末で解約 (prototype-gap-list #5).
- PAR257: the chart metric switch offers all 12 metrics (prototype-gap-list #7).
- PAR054: the 移籍申請中 banner has no 取り消す (prototype-gap-list #8).
- PAR024: the prototype shows 入会取り消し under 有効; on real data a pre-start member is 仮会員, so the item appears in the 仮会員 menu (header-actions FR-026).
- PAR456: 取消理由 is capped at 500 characters (API `cancelReason` maxLength), not the prototype's 1000.
  **Scope note**: The prototype contains sample-only values (hard-coded amounts, dates, fallback avatar) and gate stop as a status value; spec.md Assumptions govern where they differ. `src:` pointers are lines of `src/pages/member-detail.tsx`.

## Page shell & state

- [ ] PAR001 Page layout shell — SharedSidebar with `currentPage="member-detail"` highlighted, SidebarInset (flex column, max-h-svh, overflow hidden), SharedHeader at top, then PageHeader rendered `outside`, then scrollable `<main>` (px-6 py-4, bg-background) — src: member-detail.tsx:L3573-L3577
- [ ] PAR002 URL params drive the page — reads `memberId`, `parentMemberId`, `parentName` from the query string; re-syncs on `popstate` and `client-navigate` events (client-side navigation to another member re-renders the page for that member) — src: member-detail.tsx:L3347-L3366
- [ ] PAR003 Member sample resolution — `memberId` selects the member record and constraint flags; unknown / missing `memberId` falls back to M-00001 (田中 太郎) — src: member-detail.tsx:L3372-L3374
- [ ] PAR004 Member change resets state — when `memberId` changes, member data is reloaded and any pending-application state (banner + pending badge) is cleared — src: member-detail.tsx:L3422-L3427
- [ ] PAR005 Initial tab — page opens on the tab given by `initialTab` (default `basic` = 基本情報); active tab is controlled state so banners/actions can switch to 変更履歴 programmatically — src: member-detail.tsx:L3346-L3380
- [ ] PAR006 Deep-link `?sheet=` param opens a sheet on load — `leave`→休会申請, `retire`→退会申請, `transfer`→移籍申請, `gate-release`→ゲートストップ解除, `contract-change`→主契約変更, `option-add`→オプション追加, `leave-release`→休会解除, `gate-stop-set`→ゲートストップ設定, `option-change`→オプション変更, `option-cancel`→オプション解約 — src: member-detail.tsx:L3429-L3443
- [ ] PAR007 Status-sample coverage (states that must be reachable) — 有効 (M-00001/M-00002/M-00016/M-00017), 休会中 with suspendEndDate 2026/06/30 (M-00003), ゲートストップ with gateStop=true + gateStopDetail pattern 常時入館不可 (M-00005), 退会予定 with withdrawalScheduledDate 2026/04/30 + contractStartDate 2026-06-01 (M-00006), 有効 + reservation penalty (M-00007), 退会済み + blacklisted 2025/12/20 (M-00008), 退会済み not blacklisted (M-00011), 有効 with future contractStartDate 2026-10-01 (M-00012, 入会取り消し target); M-00001 has hasActiveAdjustment=true — src: member-detail.tsx:L151-L562
- [ ] PAR008 Constraint flags — per-member `hasUnpaidFee`, `inCancellationPeriod`, `isOptionRestricted` drive disabled menu items and the 未納額 summary (all samples currently false, so disabled states only appear when a flag is true) — src: member-detail.tsx:L564-L576
- [ ] PAR009 Role derivation for manual point return — `canManualPointReturn` = Headquarter/System/Manager (declared here; not consumed in the header region) — src: member-detail.tsx:L3368-L3370
- [ ] PAR010 Role derivation for blacklist view — `canViewBlacklist = hasRole(["Headquarter","System"])` gates the blacklist banner (A-01 FR-015: BL info not shown to Manager/Staff and below) — src: member-detail.tsx:L3533-L3534
- [ ] PAR011 Usage-start-date gating — `isBeforeStart` = contractStartDate exists and is in the future (drives 入会取り消し visibility); `retireCancelBlocked` = contractStartDate exists and is NOT in the future (drives 退会取り消し disabled); no contractStartDate → not before start and not blocked — src: member-detail.tsx:L895-L898
- [ ] PAR012 Usage-start-date flags in page — computed from the current member's contractStartDate — src: member-detail.tsx:L3522-L3527
- [ ] PAR013 Usage-start-date display format — `YYYY-MM-DD` shown as `YYYY/MM/DD`; missing → `—` (used inside menu sub-lines) — src: member-detail.tsx:L890-L893
- [ ] PAR014 Personal-data-delete blockers — `isBlacklisted` or `hasUnpaidFeeForDelete` → blocker (consumed by the delete dialog) — src: member-detail.tsx:L3529-L3532

## Breadcrumb / back navigation

- [ ] PAR015 Back link (no parent member) — BackLink labelled 「会員管理に戻る」; click navigates to member-list — src: member-detail.tsx:L3604-L3607
- [ ] PAR016 3-level breadcrumb (opened from family member / referrer, `parentMemberId` present) — shadcn Breadcrumb: link 「会員管理」 (→ member-list) / separator / link `{parentName}` (→ member-detail with memberId=parentMemberId) / separator / current page `{displayName}` (not a link) — src: member-detail.tsx:L3582-L3603
- [ ] PAR017 Page title — PageHeader title = current member's name (`member.name`, resolved from memberId, also when arriving via family/referrer link) — src: member-detail.tsx:L3392-L3393
- [ ] PAR018 Page title placement — `title={displayName}` in PageHeader — src: member-detail.tsx:L3609

## Header actions (non-退会済み)

- [ ] PAR019 Header action set visibility — when status ≠ 退会済み, render in order: 編集 button, ステータス変更 dropdown, 会員操作 (…) dropdown — src: member-detail.tsx:L3610-L3613
- [ ] PAR020 編集 button — RoleGatedButton size sm, Pencil icon + 「編集」; allowed Headquarter/System only (others get role-gated state); click navigates to member-form — src: member-detail.tsx:L3614-L3617
- [ ] PAR021 ステータス変更 dropdown trigger — outlined h-7 button text 「ステータス変更」 + ChevronDown icon; non-modal menu, content aligned end — src: member-detail.tsx:L3619-L3625

## ステータス変更 menu — status 有効

- [ ] PAR022 休会申請 item (有効) — label 「休会申請」; allowed HQ/System/Manager/Staff (Trainer/Observer gated); disabled when hasUnpaidFee with sub-line 「未納金があるため操作できません」 (text-xs destructive); enabled click opens 休会申請 sheet — src: member-detail.tsx:L3626-L3640
- [ ] PAR023 退会申請 item (有効) — label 「退会申請」 in destructive color; allowed HQ/System/Manager/Staff; click opens 退会申請 sheet — src: member-detail.tsx:L3641-L3645
- [ ] PAR024 入会取り消し item (有効, only when usage start date is in the future) — destructive color; label 「入会取り消し」 + sub-line 「利用開始日（YYYY/MM/DD）前のため対象」 (text-xs muted); allowed HQ/System/Manager/Staff; click opens 入会取り消し dialog; hidden when start date reached or not set — src: member-detail.tsx:L3646-L3658
- [ ] PAR025 移籍申請 item (有効) — label 「移籍申請」; allowed HQ/System/Manager/Staff; disabled when hasUnpaidFee OR inCancellationPeriod; sub-line 「解約手数料期間中のため移籍できません」 when inCancellationPeriod (takes precedence), else 「未納金があるため操作できません」 when hasUnpaidFee; enabled click opens 移籍申請 sheet — src: member-detail.tsx:L3659-L3678 — **Deliberate deviation (2026-11-02):** the cancellation-fee block applies to JOYFIT only; a FIT365 member in the period keeps 移籍申請 enabled (A-02 L48, FIT365 = 可能; prototype logic is not spec)
- [ ] PAR026 Item order (有効) — 休会申請, 退会申請, [入会取り消し], 移籍申請 — src: member-detail.tsx:L3626-L3680

## ステータス変更 menu — status 休会中

- [ ] PAR027 休会解除 item (休会中) — label 「休会解除」; allowed HQ/System/Manager/Staff; click opens 休会解除 sheet — src: member-detail.tsx:L3681-L3688
- [ ] PAR028 退会申請 item (休会中) — destructive 「退会申請」; allowed HQ/System/Manager/Staff; opens 退会申請 sheet — src: member-detail.tsx:L3689-L3695

## ステータス変更 menu — status ゲートストップ

- [ ] PAR029 ゲートストップ解除 item (ゲートストップ) — label 「ゲートストップ解除」; allowed HQ/System/Manager/Staff (Staff own store only per comment); opens ゲートストップ解除 sheet — src: member-detail.tsx:L3696-L3704
- [ ] PAR030 休会申請 item (ゲートストップ) — same as 有効: disabled on hasUnpaidFee with 「未納金があるため操作できません」; opens 休会申請 sheet — src: member-detail.tsx:L3705-L3717
- [ ] PAR031 退会申請 item (ゲートストップ) — destructive 「退会申請」; opens 退会申請 sheet — src: member-detail.tsx:L3718-L3722
- [ ] PAR032 移籍申請 item (ゲートストップ) — same disabled rules and sub-lines as 有効 (「解約手数料期間中のため移籍できません」 / 「未納金があるため操作できません」); opens 移籍申請 sheet — src: member-detail.tsx:L3723-L3743 — **Deliberate deviation (2026-11-02):** the cancellation-fee block applies to JOYFIT only; a FIT365 member in the period keeps 移籍申請 enabled (A-02 L48, FIT365 = 可能; prototype logic is not spec)
- [ ] PAR033 Item order (ゲートストップ) — ゲートストップ解除, 休会申請, 退会申請, 移籍申請 (no 入会取り消し) — src: member-detail.tsx:L3696-L3743

## ステータス変更 menu — status 退会予定

- [ ] PAR034 退会取り消し item (退会予定, only item) — label 「退会取り消し」; allowed HQ/System/Manager/Staff; disabled when usage start date reached, with sub-line 「利用開始日（YYYY/MM/DD）以降のため取り消しできません」 (text-xs destructive); enabled click opens 退会取り消し dialog — src: member-detail.tsx:L3744-L3763
- [ ] PAR035 Menu for other statuses — no items render in ステータス変更 for statuses outside 有効/休会中/ゲートストップ/退会予定 (trigger still shown for any non-退会済み status) — src: member-detail.tsx:L3625-L3765

## 会員操作 (…) menu

- [ ] PAR036 会員操作 trigger — square 7x7 outlined icon button with MoreHorizontal icon (no text); non-modal, aligned end — src: member-detail.tsx:L3767-L3772
- [ ] PAR037 Menu group header — label 「管理操作」 (text-xs muted, normal weight) followed by a separator — src: member-detail.tsx:L3773-L3775
- [ ] PAR038 ゲートストップ設定 item — label 「ゲートストップ設定」; shown only for 有効 / 休会中 / 退会予定 (hidden for ゲートストップ); allowed HQ/System/Manager/Staff; opens ゲートストップ設定 sheet — src: member-detail.tsx:L3776-L3784
- [ ] PAR039 強制退会 item — destructive 「強制退会」; allowed Headquarter/System only; always present for non-退会済み; opens 強制退会 dialog — src: member-detail.tsx:L3785-L3790
- [ ] PAR040 ブラックリスト登録 item — destructive 「ブラックリスト登録」; allowed Headquarter/System only; opens ブラックリスト登録 dialog — src: member-detail.tsx:L3791-L3796
- [ ] PAR041 Item order (会員操作) — 管理操作 label, separator, [ゲートストップ設定], 強制退会, ブラックリスト登録 — src: member-detail.tsx:L3773-L3797

## Header actions (退会済み)

- [ ] PAR042 退会済み header — 編集 button and ステータス変更 dropdown are NOT rendered; only a … (MoreHorizontal) icon dropdown is shown — src: member-detail.tsx:L3802-L3807
- [ ] PAR043 個人情報削除 item (退会済み, only item, no group label) — destructive 「個人情報削除」; allowed Headquarter/System only; opens 個人情報削除 dialog — src: member-detail.tsx:L3808-L3820

## Banners (top of main, in this order)

- [ ] PAR044 Gate-stop banner — shown when live `member.gateStop` is true (disappears after release); destructive Alert (border-destructive/50, bg-destructive/15), ShieldAlert icon; text 「ゲートストップ中（{pattern}） — 全店舗への入館が制限されています」, pattern part omitted when no gateStopDetail (e.g. 「ゲートストップ中（常時入館不可） — …」 for M-00005) — src: member-detail.tsx:L3826-L3834
- [ ] PAR045 Blacklist banner — shown when `member.isBlacklisted` AND viewer is Headquarter/System; destructive Alert with ShieldBan icon; text 「ブラックリスト登録済み（{blacklistedAt} 登録） — 個人情報の削除はできません」 (date part omitted if absent); right-aligned outline small button 「ブラックリスト詳細」 → navigates to blacklist-detail; hidden for Manager/Staff/Trainer/Observer — src: member-detail.tsx:L3836-L3856
- [ ] PAR046 Reservation penalty banner — shown when live `member.penalty` set (disappears after release); destructive Alert with CalendarX2 icon; text 「予約ペナルティ中 — {until} までレッスン予約不可（無断キャンセル{noShowCount}回 / 適用日 {appliedAt}）」 (M-00007: 2026/04/20, 2回, 2026/04/14) — src: member-detail.tsx:L3858-L3866
- [ ] PAR047 Penalty 解除 button — RoleGatedButton outline h-6 text-xs 「解除...」; allowed HQ/System/Manager/Staff; denied roles (Trainer/Observer) get tooltip 「ペナルティ解除の権限がありません」; click opens ペナルティ解除 sheet — src: member-detail.tsx:L3867-L3877
- [ ] PAR048 Pending-application banner — shown after an application is submitted in this session; color by variant: destructive (退会申請中), warning (移籍申請中 / ゲートストップ設定中), info (休会申請中 / ゲートストップ解除申請中); text `{bannerMessage}（{timestamp} 受付）` — src: member-detail.tsx:L3883-L3887
- [ ] PAR049 Pending state 休会申請中 — badge label 「休会申請中」, info variant, banner 「{開始月} 〜 {終了月} の休会を申請中（承認待ち）」, timestamp 2026/04/20 — src: member-detail.tsx:L4262-L4268
- [ ] PAR050 Pending state 退会申請中 — badge label 「退会申請中」, destructive variant, banner 「退会予定日 {YYYY/MM/DD} で退会を申請中（承認待ち）」 — src: member-detail.tsx:L4397-L4403
- [ ] PAR051 Pending state 移籍申請中 — badge label 「移籍申請中」, warning variant, banner 「{主契約店舗} → {移籍先店舗} への移籍を申請中（承認待ち）」 — src: member-detail.tsx:L4539-L4545
- [ ] PAR052 Pending state ゲートストップ解除申請中 — badge label 「ゲートストップ解除申請中」, info variant, banner 「ゲートストップ解除を申請中（承認待ち）」 — src: member-detail.tsx:L4682-L4688
- [ ] PAR053 Pending state ゲートストップ設定中 — badge label 「ゲートストップ設定中」, warning variant, banner 「ゲートストップを設定中（即時反映）」 — src: member-detail.tsx:L5312-L5318
- [ ] PAR054 Pending-banner actions — link-style button 「詳細を見る」 switches to 変更履歴 tab; ghost h-6 button 「取り消す」 dismisses the banner and clears the pending badge — src: member-detail.tsx:L3888-L3897

## Head-up card — identity

- [ ] PAR055 Head-up card container — Card (no vertical padding/gap), content px-4 py-4 column gap-4: top identity row, Separator, summary strip — src: member-detail.tsx:L3900-L3902
- [ ] PAR056 Avatar — image 96px (size-24) rounded-lg object-cover, alt = member name (fixed placeholder photo) — src: member-detail.tsx:L3904-L3909
- [ ] PAR057 Name — bold base-size member name — src: member-detail.tsx:L3911-L3913
- [ ] PAR058 Status badge (no pending application) — outline Badge 10px with colored dot + `member.status` text, colors from shared member-status palette (有効/休会中/ゲートストップ/退会予定/退会済み) — src: member-detail.tsx:L3927-L3932
- [ ] PAR059 Status badge replaced by pending label — while an application is pending, the badge shows the pending label (休会申請中 / 退会申請中 / 移籍申請中 / ゲートストップ解除申請中 / ゲートストップ設定中) with dot + colors matching banner variant (destructive / warning / info) — src: member-detail.tsx:L3914-L3926
- [ ] PAR060 休会 end sub-text — when status 休会中 and suspendEndDate set: muted xs 「{suspendEndDate} まで休会」 next to badge (M-00003: 2026/06/30) — src: member-detail.tsx:L3933-L3936
- [ ] PAR061 退会予定日 sub-text — when status 退会予定 and withdrawalScheduledDate set: muted xs 「退会予定日 {date}」 next to badge (M-00006: 2026/04/30) — src: member-detail.tsx:L3937-L3939
- [ ] PAR062 Kana line — muted xs `member.nameKana` (e.g. タナカ タロウ) — src: member-detail.tsx:L3941-L3942
- [ ] PAR063 ID line — muted xs monospace 「ID: {id} / 旧No: {oldMemberNo}」 then sans 「主契約店舗: {contractStore}」 and 「登録日: {joinDate}」 (each ml-2); 旧No may be 「—」 — src: member-detail.tsx:L3943-L3948
- [ ] PAR064 Attribute badges — outline 10px normal-weight badges: `{memberType}` (e.g. 通常会員) and 「主契約: {contractName}」 — src: member-detail.tsx:L3949-L3953

## Head-up card — summary strip

- [ ] PAR065 Summary strip layout — Separator then 3-column grid: 未納額 / 申請・調整 / 直近のイベント — src: member-detail.tsx:L3957-L3960
- [ ] PAR066 未納額 cell — label 「未納額」; when hasUnpaidFee: destructive 「¥3,300」; else muted 「なし」 — src: member-detail.tsx:L3961-L3968
- [ ] PAR067 申請・調整 cell — label 「申請・調整」; stacked warning badges (dot + text): pending label when an application is pending (always warning color here regardless of variant), and 「個別会費調整中」 when hasActiveAdjustment (M-00001); neither → muted 「なし」 — src: member-detail.tsx:L3969-L3989
- [ ] PAR068 直近のイベント cell — label 「直近のイベント」; value 「最終来館 {lastVisit}」 (fallback 2026/05/01; may render 「最終来館 —」 for M-00012) — src: member-detail.tsx:L3990-L3993

## Tab bar

- [ ] PAR069 Tabs container — controlled by activeTab, line-variant TabsList, mt-6 below head-up card — src: member-detail.tsx:L4000-L4002
- [ ] PAR070 Tab order & labels — 基本情報 (basic), 契約操作 (contract), 支払い履歴 (payment), 利用履歴 (usage), ポイント履歴 (points), アンケート回答 (survey), トレーニング記録 (training), ボディーデータ (body), 紹介関係 (referral), 変更履歴 (history); ボディーデータ trigger has no extra decoration (plain text only) — src: member-detail.tsx:L4003-L4015
- [ ] PAR071 Programmatic tab switches — 詳細を見る (pending banner) and 基本情報 tab's history callback switch to 変更履歴 — src: member-detail.tsx:L4016-L4022

## 基本情報 — Layout

- [ ] PAR072 Two-column layout — left column 60% (個人情報 → 入会情報 → 家族会員 → 動作確認用アカウント), right column 40% sticky (来館情報 → ゲートストップ → 通知受信設定) — src: member-detail.tsx:L1052-L1055, L1251-L1253

## 基本情報 — 個人情報 card

- [ ] PAR073 Card title — "個人情報" — src: member-detail.tsx:L1057-L1060
- [ ] PAR074 Field order in 2-col grid — 生年月日, 性別, 住所 (full width), 電話番号, メールアドレス — src: member-detail.tsx:L1062-L1085
- [ ] PAR075 生年月日 value — format "{birthDate}（{age}歳）" — src: member-detail.tsx:L1063-L1066
- [ ] PAR076 性別 badge — outline badge; "女性" uses gender-female color, otherwise gender-male color — src: member-detail.tsx:L1067-L1072
- [ ] PAR077 住所 — full address spanning both columns (col-span-2) — src: member-detail.tsx:L1073-L1076
- [ ] PAR078 電話番号 / メールアドレス — plain text values — src: member-detail.tsx:L1077-L1084

## 基本情報 — 入会情報 card

- [ ] PAR079 Card title — "入会情報" — src: member-detail.tsx:L1090-L1093
- [ ] PAR080 Field order — 入会日, 入会店舗, ブランド, 紹介者, 入会キャンペーン (full width) — src: member-detail.tsx:L1095-L1125
- [ ] PAR081 紹介者 with referrer — link-style button "{referrer.name}（{referrer.id}）" navigating to member-detail of referrer (keeps parent member context for back navigation) — src: member-detail.tsx:L1108-L1117
- [ ] PAR082 紹介者 without referrer — muted "—" — src: member-detail.tsx:L1118-L1120
- [ ] PAR083 入会キャンペーン — value spanning both columns — src: member-detail.tsx:L1122-L1125

## 基本情報 — 家族会員 card

- [ ] PAR084 Card title — "家族会員" — src: member-detail.tsx:L1131-L1134
- [ ] PAR085 Empty state — "家族会員の登録はありません" — src: member-detail.tsx:L1137-L1138
- [ ] PAR086 Family member row — User icon + name; self shown as plain text, others as link "{name}（{id}）" navigating to that member's detail — src: member-detail.tsx:L1141-L1154
- [ ] PAR087 Row order — primary (parent) first, then by member number ascending — src: member-detail.tsx:L1136, L1141
- [ ] PAR088 本人 badge — primary-colored outline badge on isSelf row — src: member-detail.tsx:L1155-L1157
- [ ] PAR089 主会員 badge — muted outline badge on the first row (index 0) — src: member-detail.tsx:L1158-L1160
- [ ] PAR090 Remaining slots note — "家族枠 残り{n}名（本人1名＋家族最大3名）"; hidden when remainingSlots is null; no add button in CRM — src: member-detail.tsx:L1163-L1168

## 基本情報 — 動作確認用アカウント card

- [ ] PAR091 Card title — "動作確認用アカウント" — src: member-detail.tsx:L1175-L1178
- [ ] PAR092 参照のみ badge — shown only when role is not System/Headquarter — src: member-detail.tsx:L1031, L1179-L1183
- [ ] PAR093 Switch label + description — "メンテナンス中もアプリを利用可能にする" / "アプリメンテナンス期間中もモバイルアプリを利用できる検証用アカウントとして指定します。開発・QAの動作確認用途に限定してください" — src: member-detail.tsx:L1188-L1194
- [ ] PAR094 Last update line — "最終更新: {date}（{user}が{to}）" from latest test-account history entry; hidden when no history — src: member-detail.tsx:L1195-L1200
- [ ] PAR095 Switch (System/Headquarter) — enabled, checked = test-account state; toggling opens confirmation dialog (not immediate) — src: member-detail.tsx:L1202-L1208
- [ ] PAR096 Switch (other roles) — disabled, wrapped in tooltip "本部権限が必要です" — src: member-detail.tsx:L1209-L1220

## 基本情報 — 動作確認用アカウント confirmation AlertDialog

- [ ] PAR097 Title (set / release) — "動作確認用アカウントに設定しますか？" / "動作確認用アカウントを解除しますか？" — src: member-detail.tsx:L1232-L1234
- [ ] PAR098 Description (set) — "{name}様は、アプリメンテナンス期間中もモバイルアプリを利用できるようになります。開発・QAの動作確認用途に限定してください。操作者と日時は変更履歴に記録されます。" — src: member-detail.tsx:L1235-L1237
- [ ] PAR099 Description (release) — "{name}様は、アプリメンテナンス期間中はモバイルアプリを利用できなくなります。操作者と日時は変更履歴に記録されます。" — src: member-detail.tsx:L1238
- [ ] PAR100 Buttons — "キャンセル" (closes, no change) + action "設定する" / "解除する" — src: member-detail.tsx:L1241-L1245
- [ ] PAR101 Success toast — "動作確認用アカウントに設定しました" / "動作確認用アカウントを解除しました" with action "履歴を見る" (opens change history) — src: member-detail.tsx:L1037-L1049

## 基本情報 — 来館情報 card

- [ ] PAR102 Card title + fields — "来館情報"; 在籍期間, 最終来館日 (semibold values, 2-col) — src: member-detail.tsx:L1255-L1271

## 基本情報 — ゲートストップ card

- [ ] PAR103 Card title with jargon tooltip — "ゲートストップ" (JargonTip) — src: member-detail.tsx:L1274-L1277
- [ ] PAR104 Not set state — "設定なし" — src: member-detail.tsx:L1313-L1314
- [ ] PAR105 Set state pattern badge — destructive outline badge with dot + pattern (e.g. "常時入館不可") — src: member-detail.tsx:L1280-L1285
- [ ] PAR106 Set state details — 端末メッセージ (full width), 設定者, 設定日時 — src: member-detail.tsx:L1286-L1299
- [ ] PAR107 解除... button — outline sm, ShieldOff icon, "解除..."; role-gated Headquarter/System/Manager/Staff, deny tooltip "ゲートストップ解除の権限がありません"; opens gate-stop release sheet — src: member-detail.tsx:L1300-L1311

## 基本情報 — 通知受信設定 card

- [ ] PAR108 Card title + 参照のみ badge — "通知受信設定" + always-visible "参照のみ" — src: member-detail.tsx:L1320-L1327
- [ ] PAR109 Helper text — "会員がアプリ側で設定した通知種別ごとの受信ON/OFFです。管理者は参照のみ可能です。" — src: member-detail.tsx:L1330-L1332
- [ ] PAR110 Topic rows (10 fixed, definition order) — 来館・スタンプ, ポイント, 称号, トレーニングリマインダー, 体組成測定リマインダー, コンディション記録, フォロー申請, お知らせ, キャンペーン, 予約リマインダー — src: member-detail.tsx:L843-L854, L1333-L1347
- [ ] PAR111 Row state badge + updated date — "ON" (success) / "OFF" (muted) badge, then updatedAt or "—" when null; no editable control — src: member-detail.tsx:L1337-L1345

## 契約操作 — Layout

- [ ] PAR112 Two-column layout — left 60% (主契約 → 個別会費調整 → オプション契約 → キャンペーン適用 → 1DayPass購入履歴), right 40% sticky (契約サマリー → 休会・退会履歴) — src: member-detail.tsx:L1397-L1400, L1840-L1842

## 契約操作 — 主契約 card

- [ ] PAR113 Card title + adjustment badge — "主契約"; secondary badge "個別会費調整 適用中" when member has active adjustment — src: member-detail.tsx:L1402-L1410
- [ ] PAR114 変更 button — outline sm "変更"; role-gated Headquarter/System, deny tooltip "主契約の変更は本部のみ可能です"; opens main contract change flow — src: member-detail.tsx:L1411-L1419
- [ ] PAR115 Table columns in order — プラン名, 月額 (right-aligned), 適用開始日, 利用開始日, 状態 — src: member-detail.tsx:L1422-L1432
- [ ] PAR116 月額 normal — plan master price formatted "¥7,700" style — src: member-detail.tsx:L1435, L1446-L1448
- [ ] PAR117 月額 on leave — "¥1,100" (休会費) with sub-line "休会費（通常 {monthly}）" — src: member-detail.tsx:L1440-L1445
- [ ] PAR118 利用開始日 — YYYY/MM/DD, "—" when not set — src: member-detail.tsx:L891-L893, L1451
- [ ] PAR119 状態 badge — "有効" (success) normally; on leave "休会中（〜{suspendEndDate}）" (warning, suffix omitted when no end date) — src: member-detail.tsx:L1452-L1459

## 契約操作 — 個別会費調整 card

- [ ] PAR120 Card title + 調整を追加 button — "個別会費調整"; outline sm with Settings2 icon "調整を追加"; role-gated Headquarter/System/Manager, deny tooltip "本部・マネージャー権限が必要です"; opens add sheet — src: member-detail.tsx:L1469-L1485
- [ ] PAR121 Table columns in order — 期間, 調整後金額 (right-aligned), 事由, 設定者, 状態 — src: member-detail.tsx:L1487-L1496
- [ ] PAR122 Empty state — "個別会費調整はありません" (colSpan 5) — src: member-detail.tsx:L1498-L1503
- [ ] PAR123 期間 cell — two lines "{from}" / "〜 {to}" (YYYY/MM) — src: member-detail.tsx:L1509-L1513
- [ ] PAR124 Ending-soon badge — "あと{n}日" warning badge only for 適用中 rows ending within 0–14 days (end = last day of to month) — src: member-detail.tsx:L1387-L1395, L1506, L1514-L1518
- [ ] PAR125 調整後金額 / 事由 / 設定者 — ¥-formatted amount; reason truncated; setter muted — src: member-detail.tsx:L1520-L1524
- [ ] PAR126 状態 badge variants — 適用中 (success), 適用予定 (info), 終了/other (muted) — src: member-detail.tsx:L1525-L1535

## 契約操作 — 個別会費調整を追加 Sheet

- [ ] PAR127 Sheet header — 540px right sheet; Settings2 icon + "個別会費調整を追加" — src: member-detail.tsx:L1546-L1555
- [ ] PAR128 開始月 / 終了月 — side-by-side month inputs, both required (RequiredMark) — src: member-detail.tsx:L1560-L1573
- [ ] PAR129 調整後金額（税込） — required digits-only text input (inputMode numeric; non-digits blocked while typing, full-width folded; a pasted non-integer is kept and flagged inline, never stripped; deliberate deviation from the prototype's type=number), placeholder "例: 6930（円）" — src: member-detail.tsx:L1575-L1580
- [ ] PAR130 事由 — required textarea (3 rows, maxLength 1000), placeholder "例：長期在籍優待割引" — src: member-detail.tsx:L1582-L1587
- [ ] PAR131 代理申請 section — switch "スタッフが代理申請する"; when ON shows 合意日時 (datetime-local, required) and 合意方法 (select, required, placeholder "選択してください", options 来店/電話/メール/LINE) — src: member-detail.tsx:L973-L1012, L1590-L1601
- [ ] PAR132 Footer buttons — "キャンセル" (outline, closes) + "追加する" — src: member-detail.tsx:L1604-L1617
- [ ] PAR133 追加する disabled rule — disabled until 開始月, 終了月, 金額, 事由 filled, and (if proxy ON) 合意日時 + 合意方法 filled — src: member-detail.tsx:L1610
- [ ] PAR134 Success toast — "個別会費調整を追加しました" and sheet closes — src: member-detail.tsx:L1611-L1614

## 契約操作 — オプション契約 card

- [ ] PAR135 Card title + 追加 button — "オプション契約"; outline sm "+ 追加" opens option add flow — src: member-detail.tsx:L1623-L1635
- [ ] PAR136 + 追加 disabled — disabled when 休会中, 退会予定, or member has unpaid fee — src: member-detail.tsx:L1368, L1630
- [ ] PAR137 On-leave alert — warning "休会中はオプション契約の変更・追加・解約ができません" — src: member-detail.tsx:L1637-L1645
- [ ] PAR138 Retire-pending alert — warning "退会予定のため、オプション契約の変更はできません" (only when not on leave) — src: member-detail.tsx:L1646-L1654
- [ ] PAR139 Unpaid-fee alert — destructive "未納金があるため、追加費用が発生するオプション追加はできません" (only when not on leave / not retire-pending) — src: member-detail.tsx:L1655-L1663
- [ ] PAR140 Table columns in order — オプション名, 月額 (right-aligned), 適用開始日, 状態, (actions, no header) — src: member-detail.tsx:L1664-L1673
- [ ] PAR141 Empty state — "オプション契約はありません" (colSpan 5) — src: member-detail.tsx:L1675-L1680
- [ ] PAR142 状態 badge variants — 有効 (success), 解約予定 (warning), 解約済み (muted), 使用済み (muted, API `used` — not in the prototype), 翌月適用 (info, API `pending_start`) — src: member-detail.tsx:L908-L919, L1686-L1690
- [ ] PAR143 Row actions menu — MoreHorizontal trigger; items "変更" and "解約" (destructive text); both disabled when 休会中 or 退会予定; open option change / cancel flows for that option — src: member-detail.tsx:L1369, L1691-L1711

## 契約操作 — キャンペーン適用 card

- [ ] PAR144 Card title + filter select — "キャンペーン適用"; select default "全期間", options 全期間 / 適用中のみ / 終了済みのみ — src: member-detail.tsx:L1372, L1732-L1746
- [ ] PAR145 Filter behavior — 適用中のみ = status 適用中; 終了済みのみ = status other than 適用中 — src: member-detail.tsx:L1726-L1730
- [ ] PAR146 Sort order — 適用中 first, then period descending — src: member-detail.tsx:L1721-L1725
- [ ] PAR147 Table columns in order — キャンペーン名, 特典内容, 適用期間, ステータス — src: member-detail.tsx:L1748-L1756
- [ ] PAR148 Empty state — "該当するキャンペーンはありません" (colSpan 4) — src: member-detail.tsx:L1758-L1763
- [ ] PAR149 ステータス badge — 適用中 (success), other e.g. 終了 (muted) — src: member-detail.tsx:L1770-L1778

## 契約操作 — 1DayPass購入履歴 card

- [ ] PAR150 Card title + month picker — "1DayPass購入履歴"; small MonthPicker without arrows, defaults to latest month with data, months with data marked/enabled — src: member-detail.tsx:L1375, L1790-L1803
- [ ] PAR151 Table columns in order — 購入日, 利用店舗, 金額 (right-aligned), 有効期限, 状態 — src: member-detail.tsx:L1805-L1814
- [ ] PAR152 Empty state — "この月の購入はありません。" — src: member-detail.tsx:L1816-L1821
- [ ] PAR153 状態 badge variants — 利用済み (muted), 期限切れ (destructive) — src: member-detail.tsx:L921-L930, L1828-L1832

## 契約操作 — 契約サマリー card

- [ ] PAR154 Card title + field order — "契約サマリー"; 主契約名, 月額合計, 次回請求日, 決済方法, 未納金額 (full width) — src: member-detail.tsx:L1844-L1879
- [ ] PAR155 月額合計 — large semibold; main contract price (休会費 ¥1,100 when on leave) + sum of options not 解約済み — src: member-detail.tsx:L1854-L1862
- [ ] PAR156 決済方法 — CreditCard icon + "SBPS（クレジットカード）" — src: member-detail.tsx:L1868-L1874
- [ ] PAR157 次回請求日 / 未納金額 — date value; 未納金額 muted "¥0" — src: member-detail.tsx:L1864-L1867, L1875-L1878

## 契約操作 — 休会・退会履歴 strip

- [ ] PAR158 Suspension history strip — title "休会・退会履歴"; month statuses active / pending-leave / pending-retire relative to current month; link "申請一覧を見る" navigates to leave-list filtered by member — src: member-detail.tsx:L794-L799, L1883-L1890

## 利用履歴 — Layout

- [ ] PAR159 Two-column layout — left 60% (入退館履歴 → レッスン予約履歴 → オプション利用履歴), right 40% sticky (利用状況) — src: member-detail.tsx:L1907-L1910, L2041-L2043

## 利用履歴 — 入退館履歴 card

- [ ] PAR160 Card title + month picker — "入退館履歴"; small MonthPicker without arrows (scoped by date part of datetime) — **superseded 2026-10-14 (tabs Amendment T11): date-range picker + store select** — src: member-detail.tsx:L1903, L1912-L1919
- [ ] PAR161 Table columns in order — 日時, 店舗, 種別, 認証方法 — src: member-detail.tsx:L1920-L1928
- [ ] PAR162 Empty state — "この月のデータはありません。" — src: member-detail.tsx:L1930-L1931
- [ ] PAR163 種別 badge — 入館: info badge with LogIn icon; 退館: plain outline badge with LogOut icon — src: member-detail.tsx:L1936-L1948
- [ ] PAR164 認証方法 — muted text (e.g. ICカード / QRコード) — src: member-detail.tsx:L1949
- [ ] PAR165 Footer — "{n}件" count + "前へ" / "次へ" buttons (both disabled) — src: member-detail.tsx:L1954-L1960

## 利用履歴 — レッスン予約履歴 card

- [ ] PAR166 Card title + month picker — "レッスン予約履歴"; small MonthPicker without arrows — src: member-detail.tsx:L1904, L1964-L1971
- [ ] PAR167 Table columns in order — 日付, レッスン名, 担当, 状態 — src: member-detail.tsx:L1972-L1980
- [ ] PAR168 Empty state — "この月のデータはありません。" — src: member-detail.tsx:L1982-L1983
- [ ] PAR169 状態 badge variants — 受講済み (success), キャンセル (warning), 予約中 (info) — src: member-detail.tsx:L932-L943, L1989-L1993
- [ ] PAR170 No footer/pagination on this card — src: member-detail.tsx:L1996-L1998

## 利用履歴 — オプション利用履歴 card

- [ ] PAR171 Card title + month picker — "オプション利用履歴"; small MonthPicker without arrows — src: member-detail.tsx:L1905, L2001-L2008
- [ ] PAR172 Table columns in order — 日付, 店舗, オプション名, 回数 (right-aligned) — src: member-detail.tsx:L2009-L2017
- [ ] PAR173 Empty state — "この月のデータはありません。" — src: member-detail.tsx:L2019-L2020
- [ ] PAR174 回数 cell — "{count}回" — src: member-detail.tsx:L2026
- [ ] PAR175 Footer — "{n}件" count + "前へ" / "次へ" buttons (both disabled) — src: member-detail.tsx:L2031-L2037

## 利用履歴 — 利用状況 card

- [ ] PAR176 Card title — "利用状況" — src: member-detail.tsx:L2045-L2048
- [ ] PAR177 Top group — よく利用する時間帯 "18:00-20:00", よく利用する店舗 "JOYFIT渋谷店" — src: member-detail.tsx:L2051-L2060
- [ ] PAR178 レッスン予約数（今月） — "12回" + success "前月比 +2回" — src: member-detail.tsx:L2061-L2068
- [ ] PAR179 オプション利用数（今月） — "5回" + breakdown "水素水 3 / プロテインサーバー 1 / シャワールーム優先利用 1" — src: member-detail.tsx:L2069-L2075

## 支払い履歴 — Layout

- [ ] PAR180 Two-column layout — left column 60% (入出金明細 card, then 請求一覧 card stacked), right column 40% sticky (支払いサマリー card) — src: member-detail.tsx:L2118-L2229

## 支払い履歴 — 入出金明細 card

- [ ] PAR181 Card title — "入出金明細" left, two filter Selects right-aligned in header — src: member-detail.tsx:L2123-L2151
- [ ] PAR182 Period filter Select — default "全期間"; options in order: 全期間 / 今月 / 先月 / 過去3ヶ月 / 過去6ヶ月 — **extended 2026-10-14 (tabs Amendment T12): + 期間指定 with a date-range picker** — src: member-detail.tsx:L2128-L2139
- [ ] PAR183 Period filter behavior — 今月 = same year+month as today; 先月 = previous calendar month; 過去3ヶ月 / 過去6ヶ月 = date >= today minus 3/6 months; 全期間 = no filter — src: member-detail.tsx:L2091-L2108
- [ ] PAR184 Type filter Select — default "全種別"; options in order: 全種別 / 売上 / 返金; filters rows by type — src: member-detail.tsx:L2140-L2149, L2109
- [ ] PAR185 Table columns in order — 日付 / 種別 / 内容 / 金額 (right-aligned) / 決済方法; header row muted background — src: member-detail.tsx:L2153-L2162
- [ ] PAR186 日付 cell — date in YYYY/MM/DD format — src: member-detail.tsx:L2166
- [ ] PAR187 種別 badge — "売上" = default (filled) variant; "返金" = secondary variant; small text — src: member-detail.tsx:L2167-L2174
- [ ] PAR188 内容 cell — content text, medium weight (e.g. 月会費（4月分）, オプション（水素水）, 退会時日割り返金, 1DayPass) — src: member-detail.tsx:L2175, L626-L633
- [ ] PAR189 金額 cell — positive "¥8,800" format with thousands separator; negative shown as "-¥2,200" in destructive (red) color; right-aligned — src: member-detail.tsx:L2176-L2178
- [ ] PAR190 決済方法 cell — muted text (SBPS / 銀行振込 / 現金) — src: member-detail.tsx:L2179
- [ ] PAR191 Empty result state — no empty-state row in prototype (table body renders nothing when filter yields zero rows) — src: member-detail.tsx:L2163-L2182

## 支払い履歴 — 請求一覧 card

- [ ] PAR192 Card title — "請求一覧" (no filters) — src: member-detail.tsx:L2187-L2190
- [ ] PAR193 Table columns in order — 請求月 / 請求種別 / 金額 (right-aligned) / ステータス / 請求日 — src: member-detail.tsx:L2191-L2200
- [ ] PAR194 請求月 cell — e.g. "2026年4月", medium weight — src: member-detail.tsx:L2204
- [ ] PAR195 請求種別 badge — "都度" = outline variant; "月次" = default (filled) variant — src: member-detail.tsx:L2205-L2212
- [ ] PAR196 金額 cell — "¥9,900" format, right-aligned — src: member-detail.tsx:L2213
- [ ] PAR197 ステータス badge (outline) colors — 入金済み = success; 確定 = info; 未確定 = warning; 未回収 = destructive; 貸倒 = destructive; other = muted — src: member-detail.tsx:L2214-L2218, L945-L960
- [ ] PAR198 請求日 cell — YYYY/MM/DD, muted — src: member-detail.tsx:L2219
- [ ] PAR199 Empty state — none defined in prototype — src: member-detail.tsx:L2201-L2222

## 支払い履歴 — 支払いサマリー card

- [ ] PAR200 Card title — "支払いサマリー（{selected period}）" reflecting the period filter value, e.g. "支払いサマリー（全期間）" — src: member-detail.tsx:L2231-L2234
- [ ] PAR201 売上合計 — label "売上合計", large bold "¥{sum of 売上 in filtered rows}" — src: member-detail.tsx:L2237-L2240, L2113
- [ ] PAR202 返金合計 row — label "返金合計"; value "-¥{abs sum}" in destructive color when > 0, otherwise "¥0" muted — src: member-detail.tsx:L2242-L2247, L2114
- [ ] PAR203 差引合計 row — label "差引合計"; value "¥{売上合計 − 返金合計}" — src: member-detail.tsx:L2248-L2251, L2115
- [ ] PAR204 最終入金日 row — label "最終入金日"; latest positive-amount row date within filter, "—" when none — src: member-detail.tsx:L2252-L2255, L2116
- [ ] PAR205 決済方法 row — label "決済方法"; CreditCard icon + "SBPS" — src: member-detail.tsx:L2256-L2262

## ポイント履歴 — Layout

- [ ] PAR206 Two-column layout — left 60% history table card, right 40% sticky ポイントサマリー card — src: member-detail.tsx:L2308-L2406

## ポイント履歴 — {ポイント名}履歴 card

- [ ] PAR207 Card title — brand-dependent point name + "履歴": JOYFIT → "ENJOYポイント履歴", other brands → "ベアレージポイント履歴" — src: member-detail.tsx:L2275, L2315
- [ ] PAR208 Month picker — MonthPicker (small, no prev/next arrows) in card header right; scopes list to selected month; months with data marked, months without data disabled — src: member-detail.tsx:L2286, L2316-L2317. App adds a 月次 / 期間指定 mode Select + date-range picker beside it (A-01 FR-011, tabs FR-030-a — ahead of the prototype)
- [ ] PAR209 Unified list — 獲得 (earn) and 消費 (spend) records merged into one table — src: member-detail.tsx:L2280-L2283
- [ ] PAR210 Table columns in order — 日付 (sortable) / 種別 (sortable) / 事由 / ポイント数 (right-aligned) — src: member-detail.tsx:L2320-L2377
- [ ] PAR211 Sortable 日付 header — ghost button with sort icon: active asc = ArrowUp, active desc = ArrowDown, inactive = ArrowUpDown (muted, darkens on hover); default sort 日付 desc — src: member-detail.tsx:L2276-L2277, L2323-L2337
- [ ] PAR212 Sortable 種別 header — same icon rules as 日付; kind sort orders 獲得/消費 — src: member-detail.tsx:L2349-L2363, L2289-L2294
- [ ] PAR213 Sort toggle behavior — clicking active column toggles asc/desc; clicking another column switches to it with desc — src: member-detail.tsx:L2296-L2303
- [ ] PAR214 Sort header tooltip (top) — active asc: "クリックで降順ソート"; active desc: "クリックで昇順ソート"; inactive: "クリックで昇順ソート" — src: member-detail.tsx:L2339-L2345, L2365-L2371
- [ ] PAR215 日付 cell — YYYY/MM/DD, muted — src: member-detail.tsx:L2384
- [ ] PAR216 種別 badge (outline) — "獲得" = success colors; "消費" = destructive colors — src: member-detail.tsx:L2385-L2392
- [ ] PAR217 事由 cell — reason text, medium weight (e.g. 入会特典, グッズ交換（ロゴタオル）) — src: member-detail.tsx:L2393
- [ ] PAR218 ポイント数 cell — "+500pt" in success color for 獲得; "-300pt" in destructive color for 消費; thousands separator; semibold — src: member-detail.tsx:L2394-L2396
- [ ] PAR219 Empty month state — single full-width row "この月のデータはありません。" centered, muted — src: member-detail.tsx:L2380-L2381

## ポイント履歴 — ポイントサマリー card

- [ ] PAR220 Card title — "ポイントサマリー" — src: member-detail.tsx:L2407-L2410
- [ ] PAR221 残高 — label "残高"; large bold number (e.g. 1,250) + small muted "pt" suffix — src: member-detail.tsx:L2413-L2416
- [ ] PAR222 期間内獲得合計 row — label "期間内獲得合計"; "+{total}pt" in success color — src: member-detail.tsx:L2418-L2421, L2305
- [ ] PAR223 期間内消費合計 row — label "期間内消費合計"; "-{total}pt" in destructive color — src: member-detail.tsx:L2422-L2425, L2306
- [ ] PAR224 失効予定 row — label "失効予定"; value "{pt}pt（YYYY/MM/DD）" muted (e.g. "200pt（2026/06/30）") — src: member-detail.tsx:L2426-L2429
- [ ] PAR225 No manual point return in this tab — the FR-S001 ポイント手動返還 entry point lives in 紹介関係 tab, not here — src: member-detail.tsx:L2274-L2438

## アンケート回答 — アンケート回答履歴 card

- [ ] PAR226 Card title — History icon + "アンケート回答履歴" — src: member-detail.tsx:L2476-L2482
- [ ] PAR227 Response list — bordered clickable rows, sorted by response date desc — src: member-detail.tsx:L2487-L2504, L2462
- [ ] PAR228 Row content — top line: survey name (medium) left + type badge right; second line: response datetime "YYYY/MM/DD HH:mm" muted — src: member-detail.tsx:L2495-L2501
- [ ] PAR229 Type badge (outline) — "ライフサイクル" = info colors; "オペレーション" = warning colors — src: member-detail.tsx:L2465-L2472, L2497-L2499
- [ ] PAR230 Row click — navigates to survey response detail (hover accent background) — src: member-detail.tsx:L2489-L2494
- [ ] PAR231 Empty state — "回答なし" centered, muted — src: member-detail.tsx:L2484-L2485

## トレーニング記録 — Layout

- [ ] PAR232 Two-column layout — left 60% トレーニング記録 card, right 40% sticky 記録サマリー card — src: member-detail.tsx:L2545-L2598

## トレーニング記録 — トレーニング記録 card

- [ ] PAR233 Card title — "トレーニング記録" with period Select right — src: member-detail.tsx:L2549-L2553
- [ ] PAR234 Period filter Select — default "全期間"; options in order: 全期間 / 今月 / 過去3ヶ月 / 過去1年 (no 先月) — src: member-detail.tsx:L2553-L2563
- [ ] PAR235 Period filter behavior — 今月 = same year+month; 過去3ヶ月 = last 3 months; 過去1年 = last 12 months — src: member-detail.tsx:L2515-L2533
- [ ] PAR236 Table columns in order — 実施日 / ルーティン名 / 実施時間 (right) / 消費カロリー (right) — src: member-detail.tsx:L2572-L2580
- [ ] PAR237 Row cells — 実施日 muted date; ルーティン名 medium; 実施時間 "{n}分"; 消費カロリー "{n}kcal" — src: member-detail.tsx:L2582-L2588
- [ ] PAR238 Empty state — Dumbbell icon (faded) + "この期間にトレーニング記録がありません" centered; table hidden — src: member-detail.tsx:L2566-L2570

## トレーニング記録 — 記録サマリー card

- [ ] PAR239 Card title — "記録サマリー（{selected period}）" — src: member-detail.tsx:L2599-L2602, L2543
- [ ] PAR240 2x2 grid of stats in order — 実施回数 / 合計時間 / 合計消費カロリー / 最多ルーティン — src: member-detail.tsx:L2604-L2621
- [ ] PAR241 実施回数 — large bold count + "回" — src: member-detail.tsx:L2605-L2608
- [ ] PAR242 合計時間 — large bold total minutes + "分" — src: member-detail.tsx:L2609-L2612, L2535
- [ ] PAR243 合計消費カロリー — "{n,nnn} kcal" (thousands separator, space before kcal) — src: member-detail.tsx:L2613-L2616, L2536
- [ ] PAR244 最多ルーティン — most frequent routine name in filtered rows, "—" when none — src: member-detail.tsx:L2617-L2620, L2537-L2541

## ボディーデータ — Consent states

- [ ] PAR245 Consent gating — only status "granted" shows data; "pending"/"denied" show a single "ボディーデータ" card with message only and NO body data at all — src: member-detail.tsx:L2632, L2651-L2683
- [ ] PAR246 Denied state — ShieldOff icon (destructive) + "会員が情報連携を拒否しています" (semibold) + "ボディーデータは閲覧できません。" (muted), horizontal layout centered — src: member-detail.tsx:L2660-L2667
- [ ] PAR247 Pending (not consented) state — Lock icon in muted circle + "この会員はCRMへのボディデータ連携に同意していません。" (semibold) + "データを表示するには、会員がアプリから同意操作を行う必要があります。" (muted), vertically stacked centered — src: member-detail.tsx:L2668-L2677

## ボディーデータ — 最新記録サマリー card

- [ ] PAR248 Card title — "最新記録サマリー（{latest measurement date YYYY/MM/DD}）" — src: member-detail.tsx:L2689-L2692
- [ ] PAR249 5 bordered tiles in one row, order — 体重 ("72.5 kg", 1 decimal) / BMI (no unit) / 体脂肪率 ("18.2 %", 1 decimal) / 骨格筋量 ("57.8 kg", 1 decimal) / 基礎代謝量 ("1680 kcal") — src: member-detail.tsx:L2694-L2715

## ボディーデータ — 体組成データ card

- [ ] PAR250 Card title — "体組成データ" + muted suffix "Body Planner 連携" — src: member-detail.tsx:L2723-L2726
- [ ] PAR251 4-column grid of 12 fields in order — 体重 (kg) / BMI / 体脂肪率 (%) / 体脂肪量 (kg) / 内臓脂肪指数 / 骨格筋指数(SMI) / 骨格筋量 (kg) / 推定骨量 (kg) / 水分量 (kg) / 基礎代謝量 (kcal) / 除脂肪量 (kg) / 四肢除脂肪量 (kg); values rendered "{v} {unit}" — src: member-detail.tsx:L2728-L2777

## ボディーデータ — 身体データ card

- [ ] PAR252 Card title — "身体データ" + muted suffix "3DScanner 連携 / 手動入力" — src: member-detail.tsx:L2782-L2785
- [ ] PAR253 4-column grid of 15 fields in order, all "{v} cm" — 首周り / 肩幅 / 胸囲 / 腹囲 / 上腕（左） / 上腕（右） / 前腕（左） / 前腕（右） / 腰回り / ヒップ / 太もも（左） / 太もも（右） / ふくらはぎ（左） / ふくらはぎ（右） / 身長 — src: member-detail.tsx:L2787-L2848
- [ ] PAR254 Left/right separate values — 上腕・前腕・太もも・ふくらはぎ each show distinct left and right values (not a single averaged value) — src: member-detail.tsx:L2804-L2843, L728-L745

## ボディーデータ — Layout

- [ ] PAR255 Layout — summary card full width on top; below, left 60% (体組成データ then 身体データ), right 40% (推移グラフ then 測定履歴) — src: member-detail.tsx:L2686-L2854

## ボディーデータ — 推移グラフ card

- [ ] PAR256 Card title — Activity icon + "推移グラフ" — src: member-detail.tsx:L2858-L2862
- [ ] PAR257 Metric switcher — outline small ToggleGroup in header, options in order: 体重 / 体脂肪率 / 骨格筋量; default 体重; single select, cannot deselect all — src: member-detail.tsx:L2634, L2863-L2874, L773-L777
- [ ] PAR258 Line chart — 180px height; single line for selected metric, dots r=3 (active r=5); dashed horizontal grid only; data oldest→newest — src: member-detail.tsx:L2878-L2911, L766-L771
- [ ] PAR259 X axis — "MM/DD" date labels, no tick lines/axis line — src: member-detail.tsx:L2884-L2890, L767
- [ ] PAR260 Y axis — ~4 ticks, auto domain, tick label suffixed with metric unit (kg / % / kg) — src: member-detail.tsx:L2891-L2899
- [ ] PAR261 Tooltip — chart tooltip with series label "体重 (kg)" / "体脂肪率 (%)" / "骨格筋量 (kg)" — src: member-detail.tsx:L2900, L780-L784

## ボディーデータ — 測定履歴 card (latest 5)

- [ ] PAR262 Card title — "測定履歴" + secondary badge "全{total}件" — src: member-detail.tsx:L2916-L2921
- [ ] PAR263 Table columns in order — 測定日 / データソース / 体重 (right) / 体脂肪率 (right) — src: member-detail.tsx:L2923-L2931
- [ ] PAR264 Rows — only newest 5 records; 測定日 muted; データソース outline badge (Body Planner / 3DScanner / 手動); 体重 "{v.1} kg"; 体脂肪率 "{v.1} %" tabular numbers — src: member-detail.tsx:L2940-L2949, L762
- [ ] PAR265 Empty state — full-width row "まだボディーデータの記録がありません" centered muted — src: member-detail.tsx:L2933-L2938
- [ ] PAR266 Show-all button — full-width outline small button "全{total}件を表示" in bordered footer, shown only when total > 5; resets page to 1 and opens Sheet — src: member-detail.tsx:L2953-L2967

## ボディーデータ — 測定履歴 full-history Sheet

- [ ] PAR267 Sheet shell — right sheet 540px wide; header bordered; body scrolls; footer fixed — src: member-detail.tsx:L2971-L2973, L2984, L3010
- [ ] PAR268 Sheet title — "測定履歴" + secondary badge "全{total}件"; sr-only description "ボディーデータの測定履歴（全{total}件）" — src: member-detail.tsx:L2974-L2980
- [ ] PAR269 Sheet table columns in order — 測定日 / データソース / 体重 (right) / 体脂肪率 (right); full-bleed with first/last column padding aligned to header — src: member-detail.tsx:L2985-L2993
- [ ] PAR270 Sheet rows — current page of records (20 per page), same cell formats as card (source outline badge, "{v.1} kg", "{v.1} %") — src: member-detail.tsx:L2995-L3004, L763
- [ ] PAR271 Pagination footer left — range text "{start}-{end} 件を表示" (no total in text) — src: member-detail.tsx:L3010-L3013
- [ ] PAR272 Pagination footer right — Previous / page numbers / Next; Previous disabled (dimmed) on page 1, Next disabled on last page; active page highlighted — src: member-detail.tsx:L3014-L3048
- [ ] PAR273 Page number ellipsis rules — ≤7 pages show all; current ≤3: 1 2 3 4 … N; current ≥N-2: 1 … N-3 N-2 N-1 N; else 1 … p-1 p p+1 … N — src: member-detail.tsx:L2644-L2649, L3023-L3039

## 紹介関係 — Layout

- [ ] PAR274 Two-column layout — left 60% (入会経路 banner, 紹介者情報, 招待実績), right 40% (紹介サマリー) — src: member-detail.tsx:L3072-L3166

## 紹介関係 — 紹介経由 banner

- [ ] PAR275 Referral-entry banner — shown only when member has a referrer: info-tinted strip with badge "紹介経由" + text "この会員は紹介を経由して入会しました。" — src: member-detail.tsx:L3060, L3077-L3084

## 紹介関係 — 紹介者情報 card

- [ ] PAR276 Card title — "紹介者情報" — src: member-detail.tsx:L3087-L3090
- [ ] PAR277 Referrer present — label "紹介者"; link button "{name}（{memberId}）" navigating to that member's detail (with parent breadcrumb context) — src: member-detail.tsx:L3092-L3102
- [ ] PAR278 Referrer absent — "紹介者なし（紹介経由の入会ではありません）" muted — src: member-detail.tsx:L3103-L3104

## 紹介関係 — 招待実績 card

- [ ] PAR279 Card title — "招待実績" + secondary badge "{count}件" — src: member-detail.tsx:L3110-L3115
- [ ] PAR280 Table columns in order — 氏名 / 会員ID / 入会日 / 特典付与 — src: member-detail.tsx:L3118-L3125
- [ ] PAR281 Row cells — 氏名 medium; 会員ID small muted; 入会日 YYYY/MM/DD — src: member-detail.tsx:L3138-L3140
- [ ] PAR282 特典付与 badge — "付与済み" success outline; "未付与" warning outline — src: member-detail.tsx:L3141-L3150
- [ ] PAR283 Row click — navigates to invitee member detail only when invitee exists and is not current member (pointer + hover); otherwise non-clickable — src: member-detail.tsx:L3129-L3137
- [ ] PAR284 Empty state — "招待した会員はいません。" centered muted — src: member-detail.tsx:L3157-L3160

## 紹介関係 — 紹介サマリー card

- [ ] PAR285 Card title — "紹介サマリー" — src: member-detail.tsx:L3167-L3170
- [ ] PAR286 Stat rows in order — 招待人数（合計） "{n}名" / 特典付与済み "{n}名" / 特典未付与 "{n}名" — src: member-detail.tsx:L3172-L3183
- [ ] PAR287 入会経路 — after separator; label "入会経路"; "紹介経由" info badge when referred, else "通常入会" muted text — src: member-detail.tsx:L3184-L3194
- [ ] PAR288 Manual point return entry (FR-S001) — after separator; helper text "紹介特典などのポイント値引き分が自動返還されなかった場合に、手動で返還します。" + outline small button "ポイントを手動返還" — src: member-detail.tsx:L3195-L3211
- [ ] PAR289 Role gate — button enabled for Headquarter / System / Manager; others disabled with tooltip "ポイント手動返還はManager以上の権限が必要です" — src: member-detail.tsx:L3201-L3204

## 紹介関係 — ポイント手動返還 AlertDialog

- [ ] PAR290 Dialog title/description — "ポイントを手動返還しますか？"; "{会員名}様に指定したポイントを返還します。返還者・日時・理由は変更履歴に記録されます。" — src: member-detail.tsx:L3222-L3227
- [ ] PAR291 返還ポイント field — label "返還ポイント" + required mark; number input min 1; placeholder "例: 550" — src: member-detail.tsx:L3229-L3242
- [ ] PAR292 返還理由 field — label "返還理由" + required mark; textarea 3 rows, maxLength 1000, non-resizable; placeholder "例：休会申請時に自動返還されなかった紹介特典分を返還" — src: member-detail.tsx:L3243-L3256
- [ ] PAR293 Buttons — "キャンセル" (resets fields) and "返還する" — src: member-detail.tsx:L3258-L3272
- [ ] PAR294 Validation — "返還する" disabled while amount empty or ≤ 0, or reason blank/whitespace-only — src: member-detail.tsx:L3261
- [ ] PAR295 Success — closes dialog; toast "ポイントを返還しました" with description "{n,nnn}pt を {会員名}様に返還しました"; fields reset — src: member-detail.tsx:L3262-L3268
- [ ] PAR296 Close reset — closing dialog by any means clears amount and reason — src: member-detail.tsx:L3219, L3066-L3069

## 変更履歴 — Table

- [ ] PAR297 Card with table only (no title, no filters, no pagination) — src: member-detail.tsx:L3294-L3295
- [ ] PAR298 Table columns in order — 更新日時 / 操作者 / 変更フィールド / 変更前 / (blank narrow arrow column) / 変更後 — src: member-detail.tsx:L3296-L3305
- [ ] PAR299 更新日時 / 操作者 cells — "YYYY/MM/DD HH:mm"; operator name (e.g. 管理者A, システム) — src: member-detail.tsx:L3309-L3310
- [ ] PAR300 変更フィールド cell — field name medium; muted "—" when null (e.g. 新規作成 row) — src: member-detail.tsx:L3311-L3313
- [ ] PAR301 変更前 cell — value truncated to max width; muted "—" when null — src: member-detail.tsx:L3314-L3316
- [ ] PAR302 Arrow column — ArrowRight icon muted, centered — src: member-detail.tsx:L3317-L3319
- [ ] PAR303 変更後 cell — when field is "ステータス": outline badge with leading dot, colored by member status (e.g. 有効 / 休会中); when value is "新規作成": info outline badge; otherwise plain truncated text — src: member-detail.tsx:L3320-L3335
- [ ] PAR304 Row order — newest first; test-account set/release rows (FR-025) merged in and sorted by datetime desc — src: member-detail.tsx:L3287-L3292
- [ ] PAR305 PENALTY_CHANGE_HISTORY row — for penalty member (M-00007) only, prepended row: 2026/04/14 07:00 / システム / 予約ペナルティ / — / "ペナルティ適用（2026/04/14・無断キャンセル2回）" — src: member-detail.tsx:L3281-L3283, L3288
- [ ] PAR306 Empty state — none defined in prototype — src: member-detail.tsx:L3306-L3339

## 代理申請セクション (shared ProxyApplicationSection, used in 休会/退会/移籍/主契約変更/オプション追加/オプション変更/オプション解約)

- [ ] PAR307 Proxy section container — bordered box; row with label 「スタッフが代理申請する」 (clickable) + Switch on the right, default OFF (state reset to OFF when contract/option sheets open) — src: member-detail.tsx:L973-L981
- [ ] PAR308 Proxy sub-fields (only when Switch ON) — 「合意日時」<RequiredMark> datetime-local input, empty by default — src: member-detail.tsx:L982-L993
- [ ] PAR309 Proxy 合意方法 select — 「合意方法」<RequiredMark>, placeholder 「選択してください」, options in order 来店 / 電話 / メール / LINE — src: member-detail.tsx:L994-L1007
- [ ] PAR310 Proxy validation rule — when Switch ON, the host sheet's submit button stays disabled until both 合意日時 and 合意方法 are filled — src: member-detail.tsx:L4236-L4236

## 休会申請 Sheet

- [ ] PAR311 Sheet shell — right Sheet 540px wide; header with PauseCircle icon + title 「休会申請」; sr-only description 「休会申請フォーム」 — src: member-detail.tsx:L4087-L4097
- [ ] PAR312 Unpaid-fee alert (hasUnpaidFee only) — destructive alert 「未納金が発生しています。休会申請前に未納金の解消が必要です。」 at top of body — src: member-detail.tsx:L4100-L4108
- [ ] PAR313 Proxy section — shared 代理申請 block as first section, followed by a full-bleed separator — src: member-detail.tsx:L4109-L4120
- [ ] PAR314 休会開始月 field — label 「休会開始月」<RequiredMark>, month input (type="month") — src: member-detail.tsx:L4123-L4134
- [ ] PAR315 休会終了月 field — label 「休会終了月」<RequiredMark>, month input (type="month") — src: member-detail.tsx:L4135-L4146
- [ ] PAR316 Period info alert (both months set) — info alert 「{開始月} 〜 {終了月} の期間、月額料金が休止されます。」 — src: member-detail.tsx:L4147-L4153
- [ ] PAR317 適用中の値引き確認 section (hasActiveAdjustment only) — heading 「適用中の値引き確認」; warning alert 「この会員には現在、以下の値引きが適用されています:」 + bullet list — src: member-detail.tsx:L4158-L4164
- [ ] PAR318 Discount bullets — one bullet per 適用中 fee adjustment 「個別会費調整: 月額 {調整額}（通常 {主契約定価}・{理由}）」 then fixed bullet 「ポイント値引き: 月額 ¥550 相当（ENJOYポイント）」 — src: member-detail.tsx:L4165-L4172
- [ ] PAR319 Point-return checkbox — bordered row, Checkbox + label 「ポイント値引き分（¥550相当）を返還する」; disabled + 50% opacity + cursor-not-allowed for roles below Manager — src: member-detail.tsx:L4175-L4189
- [ ] PAR320 Point-return deny tooltip — for non-Manager+ users hover shows 「ポイント手動返還はManager以上の権限が必要です」 — src: member-detail.tsx:L4190-L4194
- [ ] PAR321 返還事由 field (checkbox ON and Manager+) — label 「返還事由」<RequiredMark>, textarea rows=2, maxLength 1000, placeholder 「例：休会期間中のポイント値引き分を返還」, helper 「返還予定額: ¥550（休会月数 × ¥550）」 — src: member-detail.tsx:L4197-L4212
- [ ] PAR322 Separator after discount section — full-bleed separator only when hasActiveAdjustment — src: member-detail.tsx:L4215-L4215
- [ ] PAR323 休会理由 field — label 「休会理由」 <OptionalMark>, textarea rows=3, maxLength 1000, placeholder 「例：産前産後のため」 — src: member-detail.tsx:L4217-L4227
- [ ] PAR324 Footer buttons — two equal-width buttons: outline 「キャンセル」 (closes sheet) and primary 「休会申請を送信」 — src: member-detail.tsx:L4230-L4244
- [ ] PAR325 Submit disabled rule — 「休会申請を送信」 disabled when hasUnpaidFee OR (proxy ON and 合意日時/合意方法 missing); months/返還事由 are NOT part of the rule — src: member-detail.tsx:L4234-L4236
- [ ] PAR326 Submit transition — clicking closes the sheet and opens the confirm AlertDialog (~150ms later) — src: member-detail.tsx:L4237-L4240

## 休会申請 確認 AlertDialog

- [ ] PAR327 Confirm copy — title 「休会申請を送信しますか？」, description 「{開始月} 〜 {終了月} の期間、月額料金が休止されます。」 — src: member-detail.tsx:L4249-L4256
- [ ] PAR328 Confirm buttons — 「キャンセル」 / 「送信する」 — src: member-detail.tsx:L4257-L4273
- [ ] PAR329 On confirm: pending state — sets header status to 「休会申請中」 (info variant) with banner 「{開始月} 〜 {終了月} の休会を申請中（承認待ち）」 received 2026/04/20 — src: member-detail.tsx:L4259-L4268
- [ ] PAR330 Success toast — 「休会申請を受け付けました」, description 「開始日：翌月1日」, action 「履歴を見る」 → switches to 変更履歴 tab — src: member-detail.tsx:L4269-L4272

## 退会申請 Sheet

- [ ] PAR331 Sheet shell — 540px Sheet; LogOut icon + title 「退会申請」; sr-only description 「退会申請フォーム」 — src: member-detail.tsx:L4279-L4289
- [ ] PAR332 Before-start redirect alert (isBeforeStart) — warning alert 「利用開始日（{YYYY/MM/DD}）前の会員です。退会申請ではなく「入会取り消し」で処理してください。」 + outline button 「入会取り消しへ」 that closes this sheet and opens the 入会取り消し dialog — src: member-detail.tsx:L4292-L4316
- [ ] PAR333 Proxy section — shared 代理申請 block, then separator — src: member-detail.tsx:L4317-L4328
- [ ] PAR334 退会予定日 field — label 「退会予定日」<RequiredMark>, DatePicker — src: member-detail.tsx:L4331-L4335
- [ ] PAR335 Retire-date info alert (date set) — info alert 「{YYYY/MM/DD} 付で退会処理されます。」 — src: member-detail.tsx:L4336-L4342
- [ ] PAR336 退会理由 field — label 「退会理由」<RequiredMark>, textarea rows=3, maxLength 1000, placeholder 「例：転居のため」 — src: member-detail.tsx:L4344-L4356
- [ ] PAR337 Footer buttons — 「キャンセル」 (outline) / 「退会申請を送信」 (primary) — src: member-detail.tsx:L4363-L4377
- [ ] PAR338 Submit disabled rule — disabled when isBeforeStart OR (proxy ON and 合意日時/合意方法 missing); date/reason not enforced — src: member-detail.tsx:L4367-L4369
- [ ] PAR339 Submit transition — closes sheet, opens 退会申請 confirm dialog — src: member-detail.tsx:L4370-L4373

## 退会申請 確認 AlertDialog

- [ ] PAR340 Confirm copy — title 「退会申請を確定しますか？」, description 「{会員名} さんの退会予定が登録されます。この操作は取り消しに別途手続きが必要です。」 — src: member-detail.tsx:L4382-L4389
- [ ] PAR341 Confirm buttons — cancel 「戻る」, destructive action 「確定する」 — src: member-detail.tsx:L4390-L4411
- [ ] PAR342 On confirm: pending state — status 「退会申請中」 (destructive variant), banner 「退会予定日 {YYYY/MM/DD} で退会を申請中（承認待ち）」 — src: member-detail.tsx:L4397-L4403
- [ ] PAR343 Success toast — 「退会申請を受け付けました」, description 「退会日：翌月末日」, action 「履歴を見る」 — src: member-detail.tsx:L4404-L4407

## 移籍申請 Sheet

- [ ] PAR344 Sheet shell — 540px Sheet; ArrowRightLeft icon + title 「移籍申請」; sr-only 「移籍申請フォーム」 — src: member-detail.tsx:L4417-L4427
- [ ] PAR345 Cancellation-period alert (inCancellationPeriod) — destructive 「解約手数料期間中のため移籍できません。管理者にお問い合わせください。」 — src: member-detail.tsx:L4430-L4438 — **Deliberate deviation (2026-11-02):** the cancellation-fee block applies to JOYFIT only; a FIT365 member in the period keeps 移籍申請 enabled (A-02 L48, FIT365 = 可能; prototype logic is not spec)
- [ ] PAR346 Unpaid-fee alert (not in cancellation period, hasUnpaidFee) — destructive 「未納金があるため操作できません。未納金を解消してから移籍申請を行ってください。」 — src: member-detail.tsx:L4439-L4447
- [ ] PAR347 Proxy section — shared 代理申請 block, then separator — src: member-detail.tsx:L4448-L4459
- [ ] PAR348 現在の主契約店舗 read-only — label 「現在の主契約店舗」, muted box with Store icon + store name — src: member-detail.tsx:L4462-L4468
- [ ] PAR349 移籍先店舗 select — label 「移籍先店舗」<RequiredMark>, placeholder 「選択してください」, options in order JOYFIT新宿店 / JOYFIT池袋店 / FIT365横浜店 / FIT365大宮店 — src: member-detail.tsx:L4469-L4484
- [ ] PAR350 移籍ワークフロー box (store selected) — caption 「移籍ワークフロー」; JOYFIT stores → 「① 申請 → ② 移籍元承認 → ③ 自動移籍」, others → 「① 申請 → ② 移籍元承認 → ③ 移籍先承認 → ④ 移籍実行」 — src: member-detail.tsx:L4485-L4490
- [ ] PAR351 移籍理由 field — label 「移籍理由」 <OptionalMark>, textarea rows=3, maxLength 1000, no placeholder — src: member-detail.tsx:L4495-L4504
- [ ] PAR352 Footer buttons — 「キャンセル」 / 「移籍申請を送信」 — src: member-detail.tsx:L4507-L4521
- [ ] PAR353 Submit disabled rule — disabled when hasUnpaidFee OR inCancellationPeriod OR (proxy ON and 合意日時/合意方法 missing); store not enforced — src: member-detail.tsx:L4511-L4513
- [ ] PAR354 Submit transition — closes sheet, opens 移籍申請 confirm — src: member-detail.tsx:L4514-L4517

## 移籍申請 確認 AlertDialog

- [ ] PAR355 Confirm copy — title 「移籍申請を送信しますか？」, description 「{現店舗} から {移籍先} への移籍を申請します。移籍先店舗に通知が送られます。」 — src: member-detail.tsx:L4526-L4533
- [ ] PAR356 Confirm buttons — 「キャンセル」 / 「送信する」 — src: member-detail.tsx:L4534-L4550
- [ ] PAR357 On confirm: pending state — status 「移籍申請中」 (warning variant), banner 「{現店舗} → {移籍先} への移籍を申請中（承認待ち）」 — src: member-detail.tsx:L4539-L4545
- [ ] PAR358 Success toast — 「移籍申請を受け付けました」, description 「移籍先店舗に通知を送りました」, action 「履歴を見る」 — src: member-detail.tsx:L4546-L4549

## ゲートストップ解除 Sheet

- [ ] PAR359 Sheet shell — 540px Sheet; ShieldOff icon + title 「ゲートストップ解除」; sr-only 「ゲートストップ解除フォーム」 — src: member-detail.tsx:L4556-L4566
- [ ] PAR360 現在の設定 block — caption 「現在の設定」; 2-col grid 「設定日時」 / 「設定者」 / 「パターン」 and full-width 「端末メッセージ」, each falling back to 「—」 — src: member-detail.tsx:L4569-L4592
- [ ] PAR361 解除理由 select — label 「解除理由」<RequiredMark>, placeholder 「選択してください」, options 問題解決済み / 誤設定 / 本人確認完了 / その他 — src: member-detail.tsx:L4597-L4612
- [ ] PAR362 詳細 field — label 「詳細」 <OptionalMark>, textarea rows=2, maxLength 500 — src: member-detail.tsx:L4613-L4622
- [ ] PAR363 解除情報 block — caption 「解除情報」; 「解除予定者」 管理者A（仮） / 「解除予定日時」 2026/05/18 — src: member-detail.tsx:L4623-L4635
- [ ] PAR364 Confirmation checkbox — 「上記の内容を確認し、ゲートストップを解除します」 — src: member-detail.tsx:L4636-L4645
- [ ] PAR365 Footer buttons — outline 「キャンセル」 / destructive 「解除する」, disabled until confirmation checkbox checked (解除理由 not enforced) — src: member-detail.tsx:L4649-L4664

## ゲートストップ解除 確認 AlertDialog

- [ ] PAR366 Confirm copy — title 「ゲートストップを解除しますか？」, description 「解除後、会員は全店舗への入館が可能になります。」 — src: member-detail.tsx:L4669-L4676
- [ ] PAR367 Confirm buttons — 「キャンセル」 / 「解除する」 — src: member-detail.tsx:L4677-L4692
- [ ] PAR368 On confirm: pending state — status 「ゲートストップ解除申請中」 (info), banner 「ゲートストップ解除を申請中（承認待ち）」 — src: member-detail.tsx:L4682-L4688
- [ ] PAR369 Success toast — 「ゲートストップを解除しました」 with action 「履歴を見る」 (no description) — src: member-detail.tsx:L4689-L4691

## 予約ペナルティ解除 Sheet

- [ ] PAR370 Sheet shell — 540px Sheet; CalendarX2 icon + title 「ペナルティ解除」; sr-only 「予約ペナルティ解除フォーム」 — src: member-detail.tsx:L4698-L4708
- [ ] PAR371 現在のペナルティ block — caption 「現在のペナルティ」; 「適用日」 2026/04/14, 「予約不可期限」 2026/04/20（自動解除予定）, 「無断キャンセル回数」 2回（対象週 2026/04/07〜04/13）, 「対象」 スタジオレッスン（全区分） — src: member-detail.tsx:L4711-L4730
- [ ] PAR372 対象となった予約 list — full-width 「対象となった予約」 with 2 lines 「2026/04/08(水) 19:00 ヨガ基礎」 / 「2026/04/11(土) 10:00 ピラティス」 — src: member-detail.tsx:L4731-L4735
- [ ] PAR373 解除理由 select — label 「解除理由」<RequiredMark>, placeholder 「選択してください」, options 体調不良・急病の申告があった / 店舗都合（レッスン中止・設備不具合） / 出席記録の誤り（実際は出席・事前連絡あり） / その他 — src: member-detail.tsx:L4743-L4758
- [ ] PAR374 詳細 field — label 「詳細」 <OptionalMark>, textarea rows=2, maxLength 1000 — src: member-detail.tsx:L4759-L4768
- [ ] PAR375 解除情報 block — 「解除実行者」 管理者A（仮）, 「解除日時」 2026/04/20, full-width 「会員への通知」 「解除完了を会員アプリへ自動送信します」 — src: member-detail.tsx:L4769-L4786
- [ ] PAR376 Confirmation checkbox — 「上記の内容を確認し、予約ペナルティを解除します」 — src: member-detail.tsx:L4787-L4796
- [ ] PAR377 Footer buttons — 「キャンセル」 / destructive 「解除する」, disabled until checkbox checked; click closes sheet and opens confirm — src: member-detail.tsx:L4800-L4815

## 予約ペナルティ解除 確認 AlertDialog

- [ ] PAR378 Confirm copy — title 「予約ペナルティを解除しますか？」, description 「解除後、会員はすぐにレッスン予約が可能になります。解除記録は変更履歴に残り、会員へ通知が送信されます。」 — src: member-detail.tsx:L4820-L4827
- [ ] PAR379 Confirm buttons — 「キャンセル」 / 「解除する」 — src: member-detail.tsx:L4828-L4840
- [ ] PAR380 On confirm effect — immediate: penalty cleared (banner disappears), NO pending status/banner issued — src: member-detail.tsx:L4834-L4835
- [ ] PAR381 Success toast — 「予約ペナルティを解除しました」, description 「会員に通知を送りました」, action 「履歴を見る」 — src: member-detail.tsx:L4836-L4839

## 主契約変更 Sheet

- [ ] PAR382 Sheet shell — 540px Sheet; RefreshCw icon + title 「主契約変更」; sr-only 「主契約変更フォーム」 — src: member-detail.tsx:L4846-L4856
- [ ] PAR383 現在の契約 block — caption 「現在の契約」; contract name + 「¥{定価}/月」 right-aligned; 「適用開始日: 2024/04/01」 — src: member-detail.tsx:L4859-L4868
- [ ] PAR384 変更先プラン select — label 「変更先プラン」<RequiredMark>, placeholder 「選択してください」, items 「{名称}　¥{価格}/月」 from レギュラー会員 ¥7,700 / デイタイム会員 ¥6,600 / ナイト会員 ¥5,500 / プレミアム会員 ¥11,000 excluding the current contract — src: member-detail.tsx:L3538-L3543
- [ ] PAR385 変更先プラン select render — select control rendering the PLANS list — src: member-detail.tsx:L4873-L4889
- [ ] PAR386 料金変更 box (plan selected) — caption 「料金変更」; 「¥{現}/月」 → arrow → 「¥{新}/月」 + diff 「+¥n」 (destructive) or 「-¥n」 (success), hidden when diff 0 — src: member-detail.tsx:L4890-L4907
- [ ] PAR387 Apply-timing alert — info 「翌月月初（2026年4月1日）から適用されます。」 — src: member-detail.tsx:L4908-L4912
- [ ] PAR388 Proxy section — shared 代理申請 block placed LAST (after separator) — src: member-detail.tsx:L4917-L4927
- [ ] PAR389 Footer buttons — 「キャンセル」 / 「変更申請を送信」; disabled only when proxy ON and 合意日時/合意方法 missing (plan not enforced); no confirm step — src: member-detail.tsx:L4930-L4944
- [ ] PAR390 Success toast — 「契約変更を受け付けました」, description 「翌月月初から適用されます」 — src: member-detail.tsx:L4937-L4940

## オプション追加 Sheet

- [ ] PAR391 Sheet shell — 540px Sheet; Plus icon + title 「オプション追加」; sr-only 「オプション追加フォーム」 — src: member-detail.tsx:L4949-L4959
- [ ] PAR392 Unpaid-fee alert (hasUnpaidFee) — destructive 「未納金があるため追加費用が発生する操作はできません。」 — src: member-detail.tsx:L4962-L4970
- [ ] PAR393 追加するオプション select — label 「追加するオプション」<RequiredMark>, placeholder 「選択してください」, items 「{名称}　¥{価格}/月」 in order プロテインサーバー ¥1,100 / 水素水 ¥1,100 / タオルセット ¥330 / パーソナルロッカー（S） ¥550 / パーソナルロッカー（L） ¥880 / 契約ロッカー ¥1,100, excluding already-contracted options — src: member-detail.tsx:L3546-L3555
- [ ] PAR394 追加するオプション select render — select control — src: member-detail.tsx:L4972-L4988
- [ ] PAR395 Selected option summary — muted box: name + 「¥{価格}/月」 + description (e.g. 「店内のプロテインサーバーを利用できます。」) — src: member-detail.tsx:L4989-L4997
- [ ] PAR396 開始タイミング label — 「開始タイミング」 (no required mark) — src: member-detail.tsx:L5003-L5003
- [ ] PAR397 Pro-rata option → date — DatePicker placeholder 「開始日を選択」 + helper 「指定した日から利用開始となり、月末までの日割り料金が適用されます。」 — src: member-detail.tsx:L5004-L5011
- [ ] PAR398 Non-pro-rata (or none selected) → radio cards — 「今日から」 sub 「2026年3月30日〜（日割り料金適用）」 (default) / 「翌月から」 sub 「2026年4月1日〜（3月31日までキャンセル可）」; selected card has primary border/bg — src: member-detail.tsx:L5012-L5040
- [ ] PAR399 JACCS note (今日から selected) — info 「JACCS契約の場合、月途中加入の日割り分は翌月の月額料金に合算して請求されます。」 — src: member-detail.tsx:L5041-L5047
- [ ] PAR400 Proxy section — shared 代理申請 block last — src: member-detail.tsx:L5054-L5064
- [ ] PAR401 Footer buttons — 「キャンセル」 / 「オプションを追加」; disabled when hasUnpaidFee OR proxy incomplete (option not enforced); no confirm step — src: member-detail.tsx:L5067-L5081
- [ ] PAR402 Success toast — 「オプションを追加しました」 — src: member-detail.tsx:L5074-L5077

## 休会解除 Sheet

- [ ] PAR403 Sheet shell — 540px Sheet; PlayCircle icon + title 「休会解除」; visible description 「休会中の会員の休会を解除します」 — src: member-detail.tsx:L5086-L5098
- [ ] PAR404 現在の休会情報 block — caption 「現在の休会情報」; 「休会開始月」 2026/04, 「予定終了月」 2026/06, 「休会費用」 ¥1,100/月 — src: member-detail.tsx:L5101-L5117
- [ ] PAR405 復帰月 field — label 「復帰月」<RequiredMark>, month input, helper 「選択した月の1日から課金が再開されます」 — src: member-detail.tsx:L5121-L5133
- [ ] PAR406 Billing-resume alert — info 「復帰後は通常月額の請求が再開されます」 — src: member-detail.tsx:L5137-L5143
- [ ] PAR407 Footer buttons — right-aligned size-lg 「キャンセル」 (outline) / 「休会解除する」; never disabled; no confirm step — src: member-detail.tsx:L5146-L5156
- [ ] PAR408 Success toast — 「休会を解除しました」 — src: member-detail.tsx:L5150-L5153

## ゲートストップ設定 Sheet

- [ ] PAR409 Sheet shell — 480px Sheet; ShieldAlert icon + title 「ゲートストップ設定」; visible description 「会員の入館を制限します」 — src: member-detail.tsx:L5161-L5173
- [ ] PAR410 パターン radio cards — label 「パターン」<RequiredMark>; no default; order 「スタッフ常駐時間のみ入館不可」 (sub 「スタッフがいる時間帯は入館を制限」) / 「常時入館不可」 (sub 「全ての時間帯で入館を制限」) / 「スタッフ常駐時間以外は入館不可」 (sub 「スタッフがいない時間帯は入館を制限」); no 常時入退館 option — src: member-detail.tsx:L5176-L5220
- [ ] PAR411 設定理由 select — label 「設定理由」<RequiredMark>, placeholder 「選択してください」, options 迷惑行為 / 未納金 / 不正利用 / その他 — src: member-detail.tsx:L5225-L5240
- [ ] PAR412 ゲート端末メッセージ field — label 「ゲート端末メッセージ」 <OptionalMark>, textarea rows=2, maxLength 500, placeholder 「ゲート端末に表示するメッセージ」 — src: member-detail.tsx:L5241-L5253
- [ ] PAR413 Lock checkbox — 「メッセージ確認後も入館不可にする」 (unchecked=allow_after_confirm, checked=deny_after_confirm) — src: member-detail.tsx:L5254-L5264
- [ ] PAR414 Immediate-effect alert — warning 「この設定はゲート端末に即時反映されます」 — src: member-detail.tsx:L5265-L5269
- [ ] PAR415 Footer buttons — 「キャンセル」 / destructive 「設定」, disabled until パターン AND 設定理由 chosen; opens confirm — src: member-detail.tsx:L5273-L5288

## ゲートストップ設定 確認 AlertDialog

- [ ] PAR416 Confirm copy — title 「ゲートストップを設定しますか？」, description 「設定後、会員の入館が制限されます。この設定はゲート端末に即時反映されます。」 — src: member-detail.tsx:L5293-L5300
- [ ] PAR417 Confirm buttons — 「キャンセル」 / destructive 「設定する」 — src: member-detail.tsx:L5301-L5323
- [ ] PAR418 On confirm: reset + pending state — form fields reset; status 「ゲートストップ設定中」 (warning), banner 「ゲートストップを設定中（即時反映）」 — src: member-detail.tsx:L5306-L5318
- [ ] PAR419 Success toast — 「ゲートストップを設定しました」 with action 「履歴を見る」 — src: member-detail.tsx:L5319-L5321

## オプション変更 Sheet

- [ ] PAR420 Sheet shell — 480px Sheet; RefreshCw icon + title 「オプション変更」; sr-only 「オプション変更フォーム」 — src: member-detail.tsx:L5329-L5339
- [ ] PAR421 現在のオプション — caption 「現在のオプション」, value 「{名称} ¥{価格}/月」 or 「—」 — src: member-detail.tsx:L5343-L5348
- [ ] PAR422 変更先オプション select — label 「変更先オプション」<RequiredMark>, placeholder 「選択してください」, options タオルセット / パーソナルロッカー（S） / パーソナルロッカー（L） / 契約ロッカー — src: member-detail.tsx:L5349-L5365
- [ ] PAR423 Apply-timing alert — info 「変更は翌月月初から適用されます」 — src: member-detail.tsx:L5366-L5370
- [ ] PAR424 Proxy section — shared 代理申請 block last — src: member-detail.tsx:L5375-L5385
- [ ] PAR425 Footer buttons — 「キャンセル」 / 「変更」, disabled when no 変更先 OR proxy incomplete; no confirm step — src: member-detail.tsx:L5388-L5402
- [ ] PAR426 Success toast — 「オプションを変更しました」, description 「翌月月初から適用されます」 — src: member-detail.tsx:L5395-L5398

## オプション解約 Sheet

- [ ] PAR427 Sheet shell — 480px Sheet; ShieldOff icon + title 「オプション解約」; sr-only 「オプション解約フォーム」 — src: member-detail.tsx:L5407-L5417
- [ ] PAR428 解約対象 — caption 「解約対象」, value 「{名称} ¥{価格}/月」 or 「—」 — src: member-detail.tsx:L5421-L5426
- [ ] PAR429 解約タイミング radio cards — label 「解約タイミング」<RequiredMark>; default 「即時解約」 (sub 「本日付で解約」) / 「翌月から解約」 (sub 「当月末まで利用・翌月分から契約なし」) — src: member-detail.tsx:L5428-L5458
- [ ] PAR430 解約理由 field — label 「解約理由」 <OptionalMark>, textarea rows=3, maxLength 1000 — src: member-detail.tsx:L5464-L5475
- [ ] PAR431 Re-add warning — warning 「解約後の再追加は翌月以降になります」 — src: member-detail.tsx:L5476-L5480
- [ ] PAR432 Proxy section — shared 代理申請 block last — src: member-detail.tsx:L5485-L5495
- [ ] PAR433 Footer buttons — 「キャンセル」 / destructive 「解約」, disabled only when proxy incomplete; no confirm step — src: member-detail.tsx:L5498-L5513
- [ ] PAR434 Success toast — 「オプションを解約しました」 — src: member-detail.tsx:L5506-L5509

## 強制退会 AlertDialog

- [ ] PAR435 Dialog copy — title 「強制退会を実行しますか？」, description 「この操作は取り消せません。ブラックリストに自動登録されます。」 — src: member-detail.tsx:L5518-L5525
- [ ] PAR436 強制退会の条件 table — bordered box heading 「強制退会の条件（ブランド×決済手段）」; 2 columns JOYFIT (「SBPS: 2ヶ月連続未納」, 「JACCS: 1ヶ月未納（代位弁済なし）」) / FIT365 (「SBPS: 2ヶ月連続未納」, 「JACCS: 3ヶ月猶予後」) — src: member-detail.tsx:L5527-L5550
- [ ] PAR437 Brand highlight — the SBPS row of the member's brand column is highlighted (muted bg, foreground text) — src: member-detail.tsx:L5533-L5544
- [ ] PAR438 理由 field — label 「理由」<RequiredMark>, textarea min-h 80px, maxLength 1000, placeholder 「強制退会の理由を入力...」 — src: member-detail.tsx:L5551-L5562
- [ ] PAR439 Buttons — 「キャンセル」 (clears reason) / destructive 「強制退会を実行」, disabled while reason blank (trim) — src: member-detail.tsx:L5564-L5576
- [ ] PAR440 Success toast — 「強制退会を実行しました」 — src: member-detail.tsx:L5569-L5572

## 個人情報削除 AlertDialog

- [ ] PAR441 Dialog copy — title 「個人情報を削除しますか？」, description 「氏名・住所・連絡先等をダミー値に置換します。この操作は取り消せません。」 — src: member-detail.tsx:L5583-L5596
- [ ] PAR442 Target member block — bordered grid: 「対象会員」 name / 「会員ID」 id (mono) / 「ステータス」 status — src: member-detail.tsx:L5598-L5608
- [ ] PAR443 Blocker alert (BL or unpaid) — destructive, replaces the form fields: both 「ブラックリスト登録者かつ未納金があるため削除できません」, BL only 「ブラックリスト登録者のため削除できません」, unpaid only 「未納金があるため削除できません」 — src: member-detail.tsx:L5609-L5618
- [ ] PAR444 削除理由 field (no blocker) — label 「削除理由」<RequiredMark>, textarea rows=3, maxLength 500, placeholder 「削除理由を入力してください...」, helper 「操作履歴に記録されます（500文字以内）」 — src: member-detail.tsx:L5621-L5635
- [ ] PAR445 Member-ID typed confirmation (no blocker) — label 「確認のため会員ID {会員ID(mono)} を入力」<RequiredMark>, mono input, placeholder 「会員IDを入力」, autocomplete off; input normalized (trim, full-width→half-width, uppercase) before comparing — src: member-detail.tsx:L5636-L5648
- [ ] PAR446 Buttons — 「キャンセル」 / destructive 「削除を実行」, disabled when blocker OR reason blank OR normalized ID ≠ member ID; fields reset on close/cancel — src: member-detail.tsx:L5652-L5666
- [ ] PAR447 Success toast — 「個人情報を削除しました」 — src: member-detail.tsx:L5657-L5662

## ブラックリスト登録 AlertDialog

- [ ] PAR448 Dialog copy — title 「ブラックリストに登録しますか？」, description 「この操作は取り消せません。登録後、会員の個人情報は削除不可になります。」 — src: member-detail.tsx:L5671-L5678
- [ ] PAR449 Target member block — 「対象会員」 name / 「会員ID」 id (mono) / 「登録日」 「本日（実行時に自動記録）」 — src: member-detail.tsx:L5680-L5690
- [ ] PAR450 登録理由 select — label 「登録理由」<RequiredMark>, placeholder 「理由を選択してください」, options 迷惑行為 / 未納金 / 不正利用 / 機器破損 / その他 — src: member-detail.tsx:L5691-L5709
- [ ] PAR451 メモ field — label 「メモ」<OptionalMark>, textarea rows=3, maxLength 1000, placeholder 「補足情報を入力してください」 — src: member-detail.tsx:L5710-L5723
- [ ] PAR452 Buttons — 「キャンセル」 / destructive 「登録を実行」, disabled until 登録理由 chosen; fields reset on close — src: member-detail.tsx:L5725-L5740
- [ ] PAR453 Success toast — 「ブラックリストに登録しました」, description 「{会員名}（{会員ID}）を登録しました」 — src: member-detail.tsx:L5733-L5735

## 入会取り消し AlertDialog

- [ ] PAR454 Dialog copy — title 「入会を取り消しますか？」, description 「利用開始日前のため、退会申請ではなく入会・契約自体を取り消します。取り消し後は契約が無効になり、この操作は取り消せません。」 — src: member-detail.tsx:L5745-L5755
- [ ] PAR455 Target member block — 「対象会員」 name / 「会員ID」 id (mono) / 「利用開始日」 YYYY/MM/DD (or 「—」) — src: member-detail.tsx:L5756-L5766
- [ ] PAR456 取消理由 field — label 「取消理由」<RequiredMark>, textarea min-h 80px, maxLength 1000, placeholder 「例：本人都合により入会を取りやめ」 — src: member-detail.tsx:L5767-L5778
- [ ] PAR457 Buttons — 「キャンセル」 / destructive 「入会を取り消す」, disabled while reason blank (trim); reason reset on close — src: member-detail.tsx:L5780-L5796
- [ ] PAR458 Success toast — 「入会を取り消しました」, description 「契約を無効化しました」, action 「履歴を見る」 — src: member-detail.tsx:L5788-L5791

## 退会取り消し AlertDialog

- [ ] PAR459 Dialog copy — title 「退会を取り消しますか？」, description 「会員ステータスを「有効」に戻します。」 — src: member-detail.tsx:L5801-L5808
- [ ] PAR460 Buttons — 「キャンセル」 / 「取り消す」 (default, non-destructive) — src: member-detail.tsx:L5809-L5815
- [ ] PAR461 Success toast — 「退会を取り消しました」, description 「ステータスを「有効」に戻しました」 — src: member-detail.tsx:L5811-L5814
