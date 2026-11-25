# UI Parity Checklist: Store Master Detail (Y-02 FR-002〜FR-008)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` → `src/pages/store-detail.tsx` @ `47423ec` (2026-09-30, 2,735 lines). Drafted against `c1c7e2e` (2026-08-05).
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

> **Implementation status (2026-08-28)**: the screen has been built to this checklist — every region above now exists in `src/app/(private)/stores/[id]/`. The boxes stay unticked on purpose: ticking is QA's pass, done against the running screen. Four V0 elements were deliberately **not** built because the prototype has no counterpart in the current repo scope — see spec.md "Implementation Notes → What was removed"; nothing in this checklist covers them.

> All three clarifications are resolved (2026-08-28). **Q1 → editing is in scope**: PAR051, PAR055, PAR058, PAR060 and PAR147 are no longer satisfied by a rendered button — each must actually open its editing flow (spec FR-029–FR-029d, FR-074–FR-076); the V0 mockup has no handler behind them, so verify against the spec for behaviour and against V0 only for the affordance's placement and copy. **Q2 → the 変更履歴 tab is closed to Staff / Trainer / Observer** (spec FR-083), an intentional divergence from V0, which shows it to everyone — see PAR161a. **Q3 → the 1DayPass base price is the store's own default** (spec FR-050a); PAR091 and PAR125 must render that value, not the V0 fixture's ¥1,650.

> **Prototype sync 2026-10-02 (`c1c7e2e` → `47423ec`, spec.md Clarifications → Session 2026-10-02, D1–D25).**
>
> - **Re-opened** (`[ ]`, rewritten): PAR006, PAR008, PAR012, PAR013, PAR014, PAR015, PAR033, PAR035, PAR044, PAR047, PAR048, PAR049, PAR051, PAR052, PAR053, PAR055, PAR057, PAR058, PAR059, PAR060, PAR061, PAR066, PAR074, PAR102, PAR103, PAR111, PAR147, PAR148, PAR149, PAR150, PAR152, PAR153, PAR154, PAR155.
> - **New** (unticked): PAR004a, PAR018a, PAR031a, PAR031b, PAR035a, PAR035b, PAR035c, PAR035d, PAR048a, PAR051a, PAR051b, PAR051c, PAR055a, PAR061a, PAR061b, PAR061c, PAR061d, PAR066a, PAR149a, PAR155a, PAR155b, PAR155c, PAR155d, PAR155e, PAR155f, PAR155g, PAR155h, PAR155i, PAR155j.
> - **Withdrawn** (struck through): PAR010, PAR011, PAR038, PAR075.
> - **Line pointers**: new and re-opened items point at HEAD `47423ec`. Every untouched item still points at `c1c7e2e` — lines shifted by roughly +340 to +760, so re-point before using them as navigation.
> - Items marked "spec rule, no V0 source" check a validation the spec keeps although the prototype does not enforce it — verify against spec.md, not V0.

## Page shell

- [x] PAR001 Sidebar highlights the store entry as the current page — src: store-detail.tsx:L582
- [x] PAR002 Shared app header renders above the page header — src: store-detail.tsx:L583
- [x] PAR003 Main content scrolls independently; the page header stays outside the scroll region — src: store-detail.tsx:L581, L584, L601
- [x] PAR004 Back link labelled 店舗管理に戻る returning to the store list — src: store-detail.tsx:L587-L590
- [x] PAR005 Page title is the store name — src: store-detail.tsx:L592
- [x] PAR004a Header actions slot: **編集** button (default variant, small, pencil icon) opens the store edit form — spec FR-018 — src: store-detail.tsx:L934-L946
- [x] PAR006 Status badge beside the title: a pill with a leading dot over the four values 準備中 (info) / 営業中 (success) / 休業中 (warning) / 閉店 (muted), same tokens as the store list — spec FR-002 — src: store-detail.tsx:L927-L932
- [x] PAR007 Warning alert above the tabs with a triangle icon, verbatim: 機能制限や入退館設定の変更は、会員の利用に即時反映されます。 — src: store-detail.tsx:L602-L607
- [x] PAR008 Tab bar (line variant) in this order: 基本情報 / 営業設定 / 契約・料金 / 入退館設定 / 店舗マップ / 変更履歴 (変更履歴 role-gated per PAR161a) — spec FR-004 — src: store-detail.tsx:L959-L968
- [x] PAR009 基本情報 is the tab selected on load — src: store-detail.tsx:L288
- [ ] ~~PAR010 店舗マップ tab appears ONLY under the Phase 2 switch — Phase 1 must not render it — src: store-detail.tsx:L617-L619~~ — **Withdrawn 2026-10-02**: prototype `e5501a3` removed the Phase 2 gate; 店舗マップ is a Phase 1 tab (spec D1, FR-004) — see PAR155a, PAR155b, PAR155h–PAR155j.

## 基本情報 — header row

- [ ] ~~PAR011 Muted caption above the cards: 店舗の基本情報を管理します。 — src: store-detail.tsx:L630~~ — **Withdrawn 2026-10-02**: caption removed in prototype `a7d0c88` (spec D7).
- [x] PAR012 The edit action is no longer in the 基本情報 tab: it is the header 編集 button of PAR004a (label 編集, not 基本情報を編集) — spec FR-018 — src: store-detail.tsx:L934-L946
- [x] PAR013 編集 navigates to the store edit form — src: store-detail.tsx:L942
- [ ] PAR014 編集 gating: enabled for System / Headquarter, and for Staff only on their own store; disabled for others with tooltip 所属店舗の基本情報のみ編集できます (Staff on another store) or 本部権限が必要です (Manager / Trainer / Observer) — spec FR-018, FR-090 — src: store-detail.tsx:L541-L544, L936-L939 — ⚠ Gap: ENV-ACCOUNT: the only Staff account (lodu4289+staff, 職位 正社員スタッフ, own store KN-001 …203) gets can_edit_store_basic_info=false from /crm/me, so on its own store the control renders disabled with tooltip 「この操作は職位に許可されていません」. That matches the API's flags, but it means no available account can show the PAR's 'enabled for Staff (own store)' state. Staff on another store (…207) gets a full-page 「アクセス権限がありません / この店舗情報を閲覧する権限がありません。」, so no control renders there. Verified: System enabled on 203/207/208; Manager disabled with 「本部権限が必要です」 (shots/gate-mgr-203-\*.png). The PAR's Staff-other-store tooltip 所属店舗の基本情報のみ編集できます can never render, because the page itself is denied.

## 基本情報 — 一般情報 card (left column, 60%)

- [x] PAR015 Card titled 一般情報, fields laid out in a two-column grid (19 fields, テリトリー Phase 2) — src: store-detail.tsx:L975-L982
- [x] PAR016 店舗ID field — src: store-detail.tsx:L650-L653
- [x] PAR017 店舗名 field, rendered in medium weight — src: store-detail.tsx:L654-L657
- [x] PAR018 ブランド field rendered as a brand badge — src: store-detail.tsx:L658-L661
- [x] PAR018a サブブランド field directly after ブランド: the sub-brand for a JOYFIT-group store, muted — for FIT365 — spec FR-012a — src: store-detail.tsx:L994-L1002
- [x] PAR019 運営企業 field — FC company name, or 直営 when directly managed — src: store-detail.tsx:L662-L665
- [x] PAR020 テリトリー field showing the territory name — src: store-detail.tsx:L667-L671
- [x] PAR021 Territory hierarchy path (運営本部 › ブロック › エリア › テリトリー) directly beneath the territory name — src: store-detail.tsx:L672
- [x] PAR022 都道府県 field (label, not the stored JIS code) — src: store-detail.tsx:L673-L676
- [x] PAR023 郵便番号 field — src: store-detail.tsx:L677-L680
- [x] PAR024 住所 field — src: store-detail.tsx:L681-L684
- [x] PAR025 電話番号 field — src: store-detail.tsx:L685-L688
- [x] PAR026 FAX番号 field — src: store-detail.tsx:L689-L692
- [x] PAR027 店舗コード field — src: store-detail.tsx:L693-L696
- [x] PAR028 店舗名（カナ） field — src: store-detail.tsx:L697-L700
- [x] PAR031a 受付開始日 field after 店舗名（カナ）, YYYY/MM/DD or muted — — spec FR-012b — src: store-detail.tsx:L1042-L1050
- [x] PAR031b プレオープン日 field after 受付開始日, YYYY/MM/DD or muted — — spec FR-012b — src: store-detail.tsx:L1051-L1058
- [x] PAR029 開店日 field — src: store-detail.tsx:L701-L704
- [x] PAR030 閉店日 field, muted — with no value on an operating store — src: store-detail.tsx:L705-L709
- [x] PAR031 性別制限 field — src: store-detail.tsx:L710-L713
- [x] PAR032 備考 field spanning both grid columns, muted — when empty — src: store-detail.tsx:L714-L717
- [x] PAR033 Field order exactly: 店舗ID / 店舗名 / ブランド / サブブランド / 運営企業 / テリトリー / 都道府県 / 郵便番号 / 住所 / 電話番号 / FAX番号 / 店舗コード / 店舗名（カナ） / 受付開始日 / プレオープン日 / 開店日 / 閉店日 / 性別制限 / 備考 (テリトリー Phase 2 per spec FR-010) — src: store-detail.tsx:L982-L1080

## 基本情報 — right column (40%, sticky)

- [x] PAR034 Column is sticky to the top of the scroll region — src: store-detail.tsx:L724-L725
- [x] PAR035 Status card: tone and label follow the 4-value status (store icon); meta lines 閉店予定日: {date} (only when a closure date is set), 作成: {timestamp}, 更新: {timestamp} — spec FR-015 — src: store-detail.tsx:L1093-L1101
- [x] PAR035a Status card action: full-width outline ステータス変更 (RefreshCw icon), enabled for System / Headquarter only, deny tooltip ステータス変更権限がありません; for a 閉店 store disabled for everyone with reason 閉店した店舗のステータスは変更できません — spec FR-015a — src: store-detail.tsx:L1102-L1126
- [x] PAR035b Status dialog: title ステータス変更, description 店舗のステータスを変更します。, read-only 店舗名 + 現在のステータス badge, select 新しいステータス (placeholder ステータスを選択) listing 準備中 / 営業中 / 休業中 / 閉店 as badges; footer キャンセル / 変更する (disabled until a value is chosen) — spec FR-015b — src: store-detail.tsx:L155-L232, L2724-L2732
- [x] PAR035c Only 準備中→営業中, 営業中→休業中, 休業中→営業中 are selectable; other values are disabled with one reason: 現在のステータスです / 閉店した店舗のステータスは変更できません / 開業準備中には戻せません / 閉店日を設定すると自動的に閉店になります / この遷移はできません — spec FR-015c — src: store-detail.tsx:L136-L150, L201-L214
- [x] PAR035d Confirming updates the header badge and status card and shows toast {店舗名}のステータスを「{status}」に変更しました — spec FR-015d — src: store-detail.tsx:L553-L557
- [x] PAR036 店舗写真 card with a 3-column image grid showing the store's real photos in stored order — src: store-detail.tsx:L1130-L1143 (V0 renders 4 static placeholders; real photos per spec FR-016)
- [x] PAR037 Each photo slot is square; with no photos (or while loading) the slots show a muted image placeholder icon, never a broken image — src: store-detail.tsx:L1137-L1141
- [x] PAR037a **Dev-added, no V0 source**: 店舗写真 card header carries a right-aligned 編集 button (outline, small, pencil icon) — spec FR-016a
- [x] PAR037b **Dev-added, no V0 source**: 編集 opens this store's edit form at its 店舗写真 card — spec FR-016a
- [ ] PAR037c **Dev-added, no V0 source**: 編集 gating equals the header 編集 — enabled for System/HQ (any store) and Staff (own store); otherwise disabled with 所属店舗の基本情報のみ編集できます / 本部権限が必要です — spec FR-016a, FR-018 — ⚠ Gap: ENV-ACCOUNT: the only Staff account (lodu4289+staff, 職位 正社員スタッフ, own store KN-001 …203) gets can_edit_store_photo=false from /crm/me, so on its own store the control renders disabled with tooltip 「この操作は職位に許可されていません」. That matches the API's flags, but it means no available account can show the PAR's 'enabled for Staff (own store)' state. Staff on another store (…207) gets a full-page 「アクセス権限がありません / この店舗情報を閲覧する権限がありません。」, so no control renders there. Verified: System enabled on 203/207/208; Manager disabled with 「本部権限が必要です」 (shots/gate-mgr-203-\*.png). The tooltip 所属店舗の基本情報のみ編集できます is unreachable for the same reason.
- [ ] ~~PAR038 フロアマップ card with a 16:9 area; a missing map shows a muted image placeholder icon — src: store-detail.tsx:L751-L762~~ — **Withdrawn 2026-10-02**: the フロアマップ card was removed from 基本情報 in prototype `e5501a3`; the floor map is on the 店舗マップ tab (PAR155b, PAR155i, PAR155j).

## 営業設定 — 営業カレンダー card (left column, 60%)

- [x] PAR039 Card titled 営業カレンダー — src: store-detail.tsx:L775
- [x] PAR040 本日 button returning the calendar to the current month — src: store-detail.tsx:L777, L298
- [x] PAR041 Month picker for choosing year/month — src: store-detail.tsx:L778-L783
- [x] PAR042 7-column grid with weekday headers 日 月 火 水 木 金 土 — src: store-detail.tsx:L290, L788-L792
- [x] PAR043 Leading blanks before the first of the month render as empty muted cells — src: store-detail.tsx:L795-L796
- [x] PAR044 Day cell tints: 臨時休業 info, 特別営業 success, 祝日営業 warning, 祝日休業 and 定休日 destructive, plain business day and un-overridden 祝日 untinted — spec FR-021 — src: store-detail.tsx:L662-L679, L1183-L1186
- [x] PAR045 Day number sits at the top-right of the cell, coloured per day class — src: store-detail.tsx:L336-L342, L802-L806
- [x] PAR046 Today's date renders as an inverted filled circle — src: store-detail.tsx:L803-L804
- [x] PAR047 Day labels inside the cell: 臨時休業 / 特別営業 / 祝日営業 / 祝日休業 / 定休日 / 祝日 (un-overridden holiday); none for a plain business day — spec FR-021 — src: store-detail.tsx:L437-L452, L1191-L1193
- [x] PAR048 Legend (wrapping) with five entries in order: 営業日 / 定休日・祝日休業 / 臨時休業 / 特別営業 / 祝日営業, each with its swatch — spec FR-023 — src: store-detail.tsx:L1200-L1221
- [x] PAR048a Y-02 v6 precedence: 臨時休業日 / 特別営業日 > 祝日の扱い (営業 / 休業) > weekday 定休日; a holiday at 曜日どおり follows its weekday — e.g. a 特別営業日 on a holiday set to 休業 renders 特別営業 — spec FR-024a — src: store-detail.tsx:L431-L452
- [x] PAR049 Day classification is driven by the store's real hours / 祝日の扱い / 個別日設定 / holidays (do NOT reproduce the V0 2026 sample holidays or SH/TC fixtures) — spec FR-024 — src: store-detail.tsx:L421-L452

## 営業設定 — 営業時間設定 card (right column, sticky)

- [x] PAR050 Card titled 営業時間設定 — src: store-detail.tsx:L850
- [ ] PAR051 編集 button (outline, small, pencil icon) role-gated to Headquarter / System / Staff, deny tooltip 営業時間編集の権限がありません; opens the hours Sheet (PAR051a) — src: store-detail.tsx:L1234-L1243 — ⚠ Gap: ENV-ACCOUNT: the only Staff account (lodu4289+staff, 職位 正社員スタッフ, own store KN-001 …203) gets can_edit_store_business_hours=false from /crm/me, so on its own store the control renders disabled with tooltip 「営業時間編集の権限がありません」. That matches the API's flags, but it means no available account can show the PAR's 'enabled for Staff (own store)' state. Staff on another store (…207) gets a full-page 「アクセス権限がありません / この店舗情報を閲覧する権限がありません。」, so no control renders there. Verified: System enabled on 203/207/208; Manager disabled with 「営業時間編集の権限がありません」 (shots/gate-mgr-203-\*.png). Outline/small/pencil styling and opening the Sheet are confirmed as System.
- [x] PAR051a Hours Sheet: title 営業時間を設定する (clock icon), guidance 「通常営業日の曜日別営業時間を設定します。定休日にした曜日は営業カレンダーに定休日として反映されます。祝日は「曜日どおり」のとき、その日の曜日の設定に従います。」, per weekday open 〜 close time inputs + 定休日 checkbox that disables them, footer キャンセル / 保存する, toast 営業時間設定を保存しました — spec FR-029 — src: store-detail.tsx:L1433-L1450, L1529-L1566
- [x] PAR051b Hours Sheet 祝日 row: select 祝日の扱い with 曜日どおり (default) / 営業 / 休業; open / close inputs (祝日 開店時刻 / 祝日 閉店時刻) appear only for 営業 — spec FR-029f — src: store-detail.tsx:L1452-L1490
- [x] PAR051c Saving with an open day (or 祝日 = 営業) missing a time is refused with an explanation — **spec rule, no V0 source** (FR-029)
- [x] PAR052 Weekly rows 月曜日〜日曜日 plus a 祝日 row — eight rows — src: store-detail.tsx:L1247-L1266
- [x] PAR053 Open weekday: clock icon, open, 〜, close; closed weekday: 定休日 (destructive). 祝日 row: 曜日どおり (muted) / 休業 (destructive) / open 〜 close when 営業 — spec FR-025 — src: store-detail.tsx:L1251-L1263
- [x] PAR054 スタッフ常駐時間帯 block separated by a top border, titled in small bold — src: store-detail.tsx:L882-L886
- [ ] PAR055 スタッフ常駐時間帯 編集 button (ghost, tiny) role-gated Headquarter / System / Staff, deny tooltip スタッフ常駐時間帯の編集権限がありません; opens the staff Sheet (PAR055a) — src: store-detail.tsx:L1273-L1284 — ⚠ Gap: ENV-ACCOUNT: the only Staff account (lodu4289+staff, 職位 正社員スタッフ, own store KN-001 …203) gets can_edit_store_business_hours=false from /crm/me, so on its own store the control renders disabled with tooltip 「スタッフ常駐時間帯の編集権限がありません」. That matches the API's flags, but it means no available account can show the PAR's 'enabled for Staff (own store)' state. Staff on another store (…207) gets a full-page 「アクセス権限がありません / この店舗情報を閲覧する権限がありません。」, so no control renders there. Verified: System enabled on 203/207/208; Manager disabled with 「スタッフ常駐時間帯の編集権限がありません」 (shots/gate-mgr-203-\*.png). Ghost/tiny (h-6, text-[10px]) styling and opening the Sheet are confirmed.
- [x] PAR055a Staff Sheet: title スタッフ常駐時間帯を設定する, guidance 「ゲートストップの判定に使用されるスタッフ常駐時間帯を曜日別に設定します。常駐しない曜日は「常駐なし」にしてください。」; per open day start / end inputs + 常駐なし checkbox; 定休日 days show 定休日; 祝日 shows 曜日どおり（その日の曜日の常駐時間帯） or 休業; toast スタッフ常駐時間帯を保存しました — spec FR-029a — src: store-detail.tsx:L1446-L1450, L1491-L1528
- [x] PAR056 Explanatory line verbatim: ゲートストップの判定に使用されます。常駐なしの場合は「—」と表示されます。 — src: store-detail.tsx:L898-L900
- [x] PAR057 Staff-hours rows repeat all eight days; no staffing shows —; a closed weekday shows 定休日; 祝日 shows 曜日どおり / 休業 per its override — src: store-detail.tsx:L1286-L1308
- [ ] PAR058 **特別営業日** block (renamed from 例外営業時間設定) with a 日付追加 action (ghost, plus icon), role-gated Headquarter / System / Staff, deny tooltip 営業カレンダー編集の権限がありません; empty text 特別営業日の設定はありません — spec FR-027 — src: store-detail.tsx:L1314-L1331 — ⚠ Gap: ENV-ACCOUNT: the only Staff account (lodu4289+staff, 職位 正社員スタッフ, own store KN-001 …203) gets can_edit_store_business_hours=false from /crm/me, so on its own store the control renders disabled with tooltip 「営業カレンダー編集の権限がありません」. That matches the API's flags, but it means no available account can show the PAR's 'enabled for Staff (own store)' state. Staff on another store (…207) gets a full-page 「アクセス権限がありません / この店舗情報を閲覧する権限がありません。」, so no control renders there. Verified: System enabled on 203/207/208; Manager disabled with 「営業カレンダー編集の権限がありません」 (shots/gate-mgr-203-\*.png). The block title 特別営業日, the ghost 日付追加 with a plus icon and the empty text 特別営業日の設定はありません are confirmed.
- [x] PAR059 Each 特別営業日 row (date ascending): bordered box with calendar icon + date, open 〜 close, edit and delete icon buttons (aria-labels {date} の特別営業日を編集 / 削除) — src: store-detail.tsx:L1332-L1367
- [ ] PAR060 臨時休業日 block with its own 日付追加 action, same gate and tooltip; empty text 臨時休業日の設定はありません — src: store-detail.tsx:L1371-L1388 — ⚠ Gap: ENV-ACCOUNT: the only Staff account (lodu4289+staff, 職位 正社員スタッフ, own store KN-001 …203) gets can_edit_store_business_hours=false from /crm/me, so on its own store the control renders disabled with tooltip 「営業カレンダー編集の権限がありません」. That matches the API's flags, but it means no available account can show the PAR's 'enabled for Staff (own store)' state. Staff on another store (…207) gets a full-page 「アクセス権限がありません / この店舗情報を閲覧する権限がありません。」, so no control renders there. Verified: System enabled on 203/207/208; Manager disabled with 「営業カレンダー編集の権限がありません」 (shots/gate-mgr-203-\*.png). The empty text 臨時休業日の設定はありません is confirmed.
- [x] PAR061 Each temporary-closure row (date ascending): calendar icon + date, reason in muted text (— when empty), edit and delete icon buttons — src: store-detail.tsx:L1389-L1424
- [x] PAR061a Add / edit dialog: title 特別営業日を追加 / 特別営業日を編集 / 臨時休業日を追加 / 臨時休業日を編集; description 「祝日や年末年始など、通常と異なる営業時間で営業する日を設定します。」 or 「工事・清掃等で休業する日を設定します。営業カレンダーに臨時休業として反映されます。」; 日付 (required, DatePicker 日付を選択); 特別営業日: 営業時間 (required, open 〜 close); 臨時休業日: 理由 (任意, placeholder 例: 設備点検); footer キャンセル / 追加する or 変更を保存 — spec FR-029b, FR-029c — src: store-detail.tsx:L1572-L1615
- [x] PAR061b Cross-kind one-per-date: picking a date that already has a 特別営業日 or 臨時休業日 (other than the row being edited) flags the date field and shows この日はすでに{特別営業日|臨時休業日}が登録されています。既存の設定を編集または削除してください; save disabled — spec FR-029b — src: store-detail.tsx:L603-L610, L1589-L1592, L1612
- [x] PAR061c Delete AlertDialog: title 特別営業日を削除しますか？ / 臨時休業日を削除しますか？, body {date} の設定を削除します。この日は祝日・曜日の設定に従います。, キャンセル / 削除する (destructive); toast 〜を削除しました — spec FR-029e — src: store-detail.tsx:L1618-L1633, L628-L634
- [x] PAR061d 特別営業日 close time after open time is enforced — **spec rule, no V0 source** (FR-029b)
- [x] PAR062 Every edit / add / delete affordance in this tab is inert for Manager / Trainer / Observer with its deny tooltip — src: store-detail.tsx:L853, L889, L929, L944, L953, L971, L986, L995

## 契約・料金 — banner

- [x] PAR063 Info-toned banner, verbatim: 「商材・施策」メニューで作成されたマスタから、この店舗で取り扱う商材・施策を紐づけます。料金・条件の変更は商材・施策メニューで行ってください。 — src: store-detail.tsx:L1018-L1023

## 契約・料金 — 主契約プラン section

- [x] PAR064 Card header: title 主契約プラン (with the 主契約 jargon tooltip) and a secondary badge {N}件 — src: store-detail.tsx:L1029-L1032
- [x] PAR065 紐づけ追加 button (outline, small, plus icon) role-gated Headquarter / System, deny tooltip 販売設定（主契約）はHQ/Systemのみ操作可能 — src: store-detail.tsx:L1033-L1043
- [x] PAR066 Table columns in order: 主契約ID / 主契約名 / 契約タイプ / 料金（税込） / 区分 / 紐づけ日 / 操作 (right-aligned) — spec FR-031 — src: store-detail.tsx:L1672-L1680
- [x] PAR066a 区分 cell: badge 全社共通 (building icon, warning tint) or 当店限定 (store icon, info tint) — spec FR-031a — src: store-detail.tsx:L1688-L1694
- [x] PAR067 Row values: id muted, name medium weight, type, price, link date — src: store-detail.tsx:L1060-L1064
- [x] PAR068 Unlink control is a destructive Link2Off icon button in the 操作 cell — src: store-detail.tsx:L1066-L1068
- [x] PAR069 Unlink dialog: title プランの紐づけを解除しますか？, body 「{name}」の紐づけを解除します。新規契約はできなくなります。, actions キャンセル / 解除する (destructive) — src: store-detail.tsx:L1071-L1083
- [x] PAR070 For non-HQ roles the unlink control is a disabled ghost button with tooltip 販売設定（主契約）はHQ/Systemのみ操作可能 — src: store-detail.tsx:L1087-L1102
- [x] PAR071 Table scrolls horizontally inside its own container — src: store-detail.tsx:L1046

## 契約・料金 — オプション section

- [x] PAR072 Card header: title オプション + secondary badge {N}件 — src: store-detail.tsx:L1112-L1115
- [x] PAR073 紐づけ追加 button role-gated Headquarter / System, deny tooltip 販売設定（オプション）はHQ/Systemのみ操作可能 — src: store-detail.tsx:L1116-L1126
- [x] PAR074 Table columns in order: オプションID / オプション名 / 料金（税込） / 操作 — no 親オプション, no origin column — spec FR-032 — src: store-detail.tsx:L1761-L1768
- [ ] ~~PAR075 親オプション shows — when the option has no parent — src: store-detail.tsx:L1145~~ — **Withdrawn 2026-10-02**: the 親オプション column was removed in prototype `6bc1f1c` (spec D18).
- [x] PAR076 Unlink dialog: title オプションの紐づけを解除しますか？, body 「{name}」の紐づけを解除します。新規契約はできなくなります。 — src: store-detail.tsx:L1152-L1164
- [x] PAR077 For non-HQ roles the unlink control is disabled with tooltip 販売設定（オプション）はHQ/Systemのみ操作可能 — src: store-detail.tsx:L1168-L1183

## 契約・料金 — キャンペーン section

- [x] PAR078 Card header: title キャンペーン + secondary badge {N}件 — src: store-detail.tsx:L1193-L1196
- [x] PAR079 紐づけ追加 role-gated Headquarter / System / Staff, deny tooltip キャンペーンの利用設定はHQ/Systemまたは店舗スタッフのみ操作可能 — src: store-detail.tsx:L1197-L1207
- [x] PAR080 Table columns in order: キャンペーンID / キャンペーン名 / 割引概要 / 募集期間 / 受付可否 / 紐づけ日 / 解除 — src: store-detail.tsx:L1213-L1221
- [x] PAR081 募集期間 renders as {start} 〜 {end} — src: store-detail.tsx:L1252
- [x] PAR082 受付可否 badge tokens: 受付中 success, 受付停止 muted, 上限到達 warning — src: store-detail.tsx:L155-L164, L1253-L1258
- [x] PAR083 A linked campaign not published to this store shows a 公開対象外 marker beside its name with tooltip 本部の公開店舗設定で自店舗が対象になっていないため利用できません — src: store-detail.tsx:L1233-L1247
- [x] PAR084 Expired / stopped / unpublished linked rows are NOT auto-removed from the table — src: store-detail.tsx:L1223-L1225
- [x] PAR085 Unlink dialog: title キャンペーンの紐づけを解除しますか？, body 『{name}』の紐づけを解除します。この店舗の入会申請でこのキャンペーンは選択できなくなります。 — src: store-detail.tsx:L1259-L1271
- [x] PAR086 Unlink success toast: 『{name}』の紐づけを解除しました — src: store-detail.tsx:L1567
- [x] PAR087 For Manager / Trainer / Observer the unlink control is disabled with tooltip キャンペーンの利用設定はHQ/Systemまたは店舗スタッフのみ操作可能 — src: store-detail.tsx:L1275-L1290

## 契約・料金 — 1DayPass価格設定 section (read view)

- [x] PAR088 Card header: title 1DayPass価格設定 + secondary badge {N}件 — src: store-detail.tsx:L1300-L1303
- [x] PAR089 Month picker appears only when at least one per-date price exists, and enables/marks only months that hold data — src: store-detail.tsx:L1305-L1315
- [x] PAR090 価格を設定 button (outline, pencil icon) role-gated Headquarter / System / Staff, deny tooltip 1DayPass価格の編集権限がありません — src: store-detail.tsx:L1316-L1324
- [x] PAR091 With no per-date price at all: centred message 個別の価格設定はありません。全日 基準価格（{base}）で販売されます。 and no table; `{base}` is the store's own default (Q3 / FR-050a), not the V0 fixture's ¥1,650. A failed read shows 1DayPass価格を取得できませんでした。 instead of naming a ¥0 base price — src: store-detail.tsx:L1330-L1333
  - Note: money renders as `¥700` / `¥1,800` rather than the prototype's `700円` / `1,800円` — the project-wide `formatYen` helper (see spec.md "Deliberate deviations that remain").
- [x] PAR092 Table columns: 適用日 / 販売価格（税込） / 備考 — src: store-detail.tsx:L1337-L1341
- [x] PAR093 適用日 renders the date plus its weekday in parentheses, in tabular figures — src: store-detail.tsx:L1352-L1355
- [x] PAR094 備考 shows — when empty — src: store-detail.tsx:L1357
- [x] PAR095 Rows are limited to the selected month and sorted ascending by date — src: store-detail.tsx:L398-L406
- [x] PAR096 A selected month with no data shows a single centred row: この月の価格設定はありません。 — src: store-detail.tsx:L1345-L1349

## Sheet — 主契約プランを紐づける

- [x] PAR097 Right-side sheet, 480px wide, titled 主契約プランを紐づける — src: store-detail.tsx:L1369-L1374
- [x] PAR098 Guidance line: 「商材・施策 > 主契約管理」で作成されたプランから、この店舗で扱うプランを選んで紐づけてください。 — src: store-detail.tsx:L1378-L1380
- [x] PAR099 Search input with a leading magnifier, placeholder プラン名・IDで検索 — src: store-detail.tsx:L1381-L1384
- [x] PAR100 Candidate count line: 未紐づけのプラン（{N}件） — reads {N}件以上 while further pages remain, because the catalog is paged and searched on the server (V0 filters a local fixture, so it always knows the total) — src: store-detail.tsx:L1387
- [x] PAR101 Empty result message: 紐づけ可能なプランはありません — src: store-detail.tsx:L1389
- [x] PAR102 Plan candidate row: checkbox + name + 区分 badge + meta line {type} · {price} · {id}; the whole row is clickable — src: store-detail.tsx:L2018-L2034
- [x] PAR103 Plan candidate badge: 全社共通 with a building icon in warning tint, 当店限定 with a store icon in info tint — spec FR-033 — src: store-detail.tsx:L2028-L2032
- [x] PAR104 A ticked row is highlighted with a primary border and tint — src: store-detail.tsx:L1394
- [x] PAR105 Footer status text: {N}件を選択中, or プランを選択してください when nothing is ticked — src: store-detail.tsx:L1419
- [x] PAR106 Footer actions: キャンセル (closes and clears the selection) and a link button disabled while nothing is ticked, labelled {N}件を紐づける / 紐づける with a link icon — src: store-detail.tsx:L1420-L1426
- [x] PAR107 Confirming attaches every ticked plan, closes the sheet, clears the selection, and sets the link date to today — src: store-detail.tsx:L495-L502

## Sheet — オプションを紐づける

- [x] PAR108 Sheet titled オプションを紐づける with guidance 「商材・施策 > オプション管理」で作成されたオプションから、この店舗で扱うオプションを選んで紐づけてください。 — src: store-detail.tsx:L1434-L1441
- [x] PAR109 Search placeholder オプション名・IDで検索 — src: store-detail.tsx:L1444
- [x] PAR110 Candidate count line 未紐づけのオプション（{N}件）, empty message 紐づけ可能なオプションはありません — same 件以上 qualifier as PAR100 while further server pages remain — src: store-detail.tsx:L1448-L1450
- [x] PAR111 Option candidate row: checkbox + name, **no origin badge**; meta line {price} · {id} — spec FR-033 — src: store-detail.tsx:L2076-L2090
- [x] PAR112 Footer status text オプションを選択してください / {N}件を選択中 and the same disabled-until-selected link button — src: store-detail.tsx:L1479-L1487

## Sheet — キャンペーンを紐づける

- [x] PAR113 Sheet titled キャンペーンを紐づける with guidance 「商材・施策 > キャンペーン管理」で作成されたキャンペーンから、この店舗で利用するものを選んで紐づけてください。 — src: store-detail.tsx:L1498-L1505
- [x] PAR114 Search placeholder キャンペーン名・IDで検索 — src: store-detail.tsx:L1508
- [x] PAR115 Candidate count line 未紐づけのキャンペーン（{N}件）, empty message 紐づけ可能なキャンペーンはありません — src: store-detail.tsx:L1512-L1514
- [x] PAR116 Already-linked campaigns are excluded from the candidate list — src: store-detail.tsx:L528-L530
- [x] PAR117 Blocked candidate renders at 50% opacity, without a checkbox, with its reason label on the right and a tooltip — src: store-detail.tsx:L1523-L1546
- [x] PAR118 Block reason precedence: ブランド対象外 > 公開対象外 > 募集期間終了 — src: store-detail.tsx:L535-L540
- [x] PAR119 Block tooltips verbatim — brand: 自店舗はFIT365ブランドのため、JOYFITブランドのキャンペーンは利用できません; publication: 本部の公開店舗設定で自店舗が対象になっていないため利用できません; period: 募集期間が終了しているため紐づけできません — src: store-detail.tsx:L1518-L1522
- [x] PAR120 受付停止 / 上限到達 candidates stay selectable — src: store-detail.tsx:L531-L533
- [x] PAR121 Selectable candidate row: checkbox + name + acceptance badge + meta {discount summary} · {start} 〜 {end} — src: store-detail.tsx:L1548-L1565
- [x] PAR122 Link success toast per campaign: title 『{name}』を紐づけました, description この店舗の入会申請で選択できるようになります when acceptance is open, otherwise 受付再開後に入会申請で選択できるようになります — src: store-detail.tsx:L546-L562
- [x] PAR123 Closing the sheet clears the pending selection — src: store-detail.tsx:L1492-L1495

## Sheet — 1DayPass価格を設定する

- [x] PAR124 Sheet titled 1DayPass価格を設定する — src: store-detail.tsx:L1592-L1597
- [x] PAR125 Constraint band: 基準価格 {value} on the left, 本部設定レンジ with a 700円 〜 1,800円 badge on the right; 基準価格 is the store's own default (Q3 / FR-050a) — src: store-detail.tsx:L1603-L1612
  - Note: money renders as `¥700` / `¥1,800` rather than the prototype's `700円` / `1,800円` — the project-wide `formatYen` helper (see spec.md "Deliberate deviations that remain").
- [x] PAR126 Guidance line: 価格を変える日をカレンダーで選択してください。色のない日は基準価格で販売されます。 — src: store-detail.tsx:L1615-L1617
- [x] PAR127 Month navigator: 本日 button, previous and next chevrons, month label {YYYY}年{M}月 — src: store-detail.tsx:L1620-L1630
- [x] PAR128 7-column calendar with 日〜土 headers; leading blanks are empty squares — src: store-detail.tsx:L1633-L1641
- [x] PAR129 Day states — plain (base price), info-tinted ring with the price shown beneath the day number (already priced), primary ring (selected), info tint + primary ring (selected AND already priced) — src: store-detail.tsx:L1647-L1650, L1663-L1666
- [x] PAR130 Day buttons are disabled and non-selectable when the user may not edit prices — reached the stricter way FR-062 requires: 価格を設定 is inert for Manager / Trainer / Observer, so the panel holding those buttons never opens for them — src: store-detail.tsx:L1655-L1657
- [x] PAR131 Legend with three entries: 基準価格 / 個別設定あり / 選択中 — src: store-detail.tsx:L1669-L1682
- [x] PAR132 Selecting a single already-priced day (with nothing else selected) pre-fills price and note — src: store-detail.tsx:L436-L444
- [x] PAR133 Inline panel appears only when ≥1 day is selected, with a primary-tinted border — src: store-detail.tsx:L1685-L1686
- [x] PAR134 Panel summary row: 設定対象 {N}日 — src: store-detail.tsx:L1689
- [x] PAR135 既存設定を上書き warning badge when any selected day already has a price — src: store-detail.tsx:L1690-L1694
- [x] PAR136 選択をクリア action clearing both the selection and the form — src: store-detail.tsx:L1695-L1705
- [x] PAR137 Selected dates listed, sorted ascending, joined by 、, clamped to one line — src: store-detail.tsx:L1707-L1709
- [x] PAR138 価格（税込） field: required marker, number input with min 700 / max 1800, placeholder 例：1200, a 円 suffix inside the field — src: store-detail.tsx:L1714-L1732
- [x] PAR139 Helper line 設定可能範囲：700円〜1,800円, replaced by the destructive 700円〜1,800円の範囲で入力してください when out of range, with the field itself flagged — src: store-detail.tsx:L1733-L1738
  - Note: money renders as `¥700` / `¥1,800` rather than the prototype's `700円` / `1,800円` — the project-wide `formatYen` helper (see spec.md "Deliberate deviations that remain").
- [x] PAR140 備考 field: optional marker, placeholder 例：GW特別価格 — src: store-detail.tsx:L1740-L1748
- [x] PAR141 設定を解除 action (destructive, trash icon) shown only when a selected day already has a price — src: store-detail.tsx:L1751-L1760
- [x] PAR142 Clear dialog: title 選択した日の価格設定を解除しますか？, body 選択した日の価格設定を解除します。以降これらの日は基準価格で販売されます。, actions キャンセル / 解除する (destructive) — src: store-detail.tsx:L1765-L1786
- [x] PAR143 Footer status text: {N}日を選択中 or 日付を選択してください — src: store-detail.tsx:L1793
- [x] PAR144 Footer actions: 閉じる (resets selection and form) and the apply button, labelled {N}日に適用 / 適用, disabled while the price is empty, out of range, or no day is selected — src: store-detail.tsx:L1794-L1798
- [x] PAR145 Applying upserts every selected day with the entered price and note, then clears the selection and the form — src: store-detail.tsx:L448-L472
- [x] PAR146 Closing the sheet discards the pending selection and form input — src: store-detail.tsx:L1583-L1590

## 入退館設定 — 相互利用設定 card

- [x] PAR147 Card titled 相互利用設定 with a 編集 button (outline, small, pencil) role-gated Headquarter / System, deny tooltip 相互利用設定はHQ/Systemのみ編集可能; opens the Sheet of PAR155c — spec FR-074 — src: store-detail.tsx:L2426-L2441
- [x] PAR148 Acceptance row by brand: JOYFIT — label どこでもJOYの受入, description どこでもJOYを利用する他のJOYFIT店舗の会員を受け入れる; FIT365 — label 相互利用オプション（¥500）の受入, description 相互利用オプション契約者（他のFIT365店舗の会員）の利用を受け入れる; badge 受入可 (success) / 受入不可 (muted) — spec FR-070 — src: store-detail.tsx:L2443-L2458
- [x] PAR149 **JOYFIT stores only**: 1日単位の後払い設定 row above a top border with description どこでもJOYの他店舗利用分を1日単位の後払いで請求する + badge 有効 / 無効 — spec FR-070a — src: store-detail.tsx:L2460-L2472
- [x] PAR149a FIT365 store: no 1日単位の後払い設定 row — spec FR-070a — src: store-detail.tsx:L2460
- [x] PAR150 相互利用受入可能期間（開始日） and （終了日） as a two-column pair, — when unset — src: store-detail.tsx:L2471-L2480
- [x] PAR151 18歳未満入館可能時間（開始） and （終了） as a two-column pair — src: store-detail.tsx:L1866-L1874
- [x] PAR152 Block labelled 相互利用グループ（許可店舗・{brand}ブランドのみ） with a secondary badge {N}店舗 — spec FR-072 — src: store-detail.tsx:L2492-L2496
- [x] PAR153 Partner table columns: 店舗名 / ブランド (BrandBadge) / 設定日; partners of the same brand only; read-only (no add / remove — FR-076 out of Phase 1) — src: store-detail.tsx:L2497-L2516

## 入退館設定 — どこでもJOY YOGA利用料金 card

- [x] PAR154 **JOYFIT stores only**: card titled どこでもJOY YOGA利用料金; a FIT365 store shows no such card — spec FR-073 — src: store-detail.tsx:L2522-L2527
- [x] PAR155 YOGA利用料金（1日） label with ¥{amount}, and the note 利用店舗に計上 on the right (top-aligned) — src: store-detail.tsx:L2528-L2537

## 入退館設定 — Sheet 相互利用設定を編集する

- [x] PAR155c Sheet title 相互利用設定を編集する (link icon); acceptance Switch between 受入不可 / 受入可 labelled per brand, description 他のJOYFIT店舗のどこでもJOY利用会員を受け入れる / 他のFIT365店舗の相互利用オプション契約者を受け入れる — spec FR-075 — src: store-detail.tsx:L2543-L2567
- [x] PAR155d JOYFIT only: 1日単位の後払い設定 Switch between 無効 / 有効 (他店舗利用分を1日単位の後払いで請求する) and the number input YOGA利用料金（1日・税別） with a 円 suffix and hint 利用店舗に計上されます — spec FR-075 — src: store-detail.tsx:L2569-L2591
- [x] PAR155e 受入可能期間（開始日） / （終了日） DatePickers (日付を選択) and 18歳未満入館可能時間 as two time inputs — src: store-detail.tsx:L2592-L2609
- [x] PAR155f Footer キャンセル / 保存する; saving updates the card and shows toast 相互利用設定を保存しました — src: store-detail.tsx:L2612-L2615, L642-L650
- [x] PAR155g Acceptance-period end before start is refused on save — **spec rule, no V0 source** (FR-075)

## 店舗マップ tab

- [x] PAR155a 店舗マップ tab renders in Phase 1, between 入退館設定 and 変更履歴, for every role that can open the store — spec FR-004, FR-110 — src: store-detail.tsx:L964-L965, L2621
- [ ] PAR155b Card titled 店舗マップ; with a floor image, the description reads 配置済み {N}台 ・ 未配置 {M}台, 未配置 as a warning badge when M > 0, plain 未配置 0台 otherwise — spec FR-111 — src: store-detail.tsx:L2622-L2640 — ⚠ Gap: BLOCK(B4): no store has a fetchable floor image (gymMapS3Key is not a URL, and the store-map-setup image is session-only). 203/207/208 render only the card title 店舗マップ and the empty state, with no 配置済み/未配置 description. 203 has active lockers (GET /admin/lockers returned items), but the description only renders with a floor image.
- [x] PAR155h Header action: outline 店舗マップ設定 button (map icon) for System / Headquarter / Staff on own store, opening store-map-setup for this store; every other caller sees a lock icon + 閲覧のみ (Staff own-store limit follows the Y-02 matrix, not V0 — spec FR-114, Q9) — src: store-detail.tsx:L2641-L2653, L533-L539
- [ ] PAR155i Floor image (alt {店舗名}のフロア図) with one read-only marker per placed locker cabinet (tooltip only); unplaced cabinets not drawn — spec FR-112 — src: store-detail.tsx:L2656-L2667 — ⚠ Gap: BLOCK(B4): there is no floor image to render, so the <img alt="{店舗名}のフロア図"> and the cabinet markers cannot be reached. Every store shows フロア図が登録されていません.
- [x] PAR155j No floor image: empty state フロア図が登録されていません with action 店舗マップ設定で登録する for editors only — spec FR-113 — src: store-detail.tsx:L2668-L2680

## 変更履歴 tab

- [x] PAR156 Card header with a history icon and the title 変更履歴 — src: store-detail.tsx:L1941-L1946
- [x] PAR157 Table columns in order: 変更日時 / 変更者 / 変更項目 / 変更前 / 変更後 — src: store-detail.tsx:L1949-L1955
- [x] PAR158 Row values: timestamp muted, actor, item in medium weight, before muted, after in medium weight — src: store-detail.tsx:L1959-L1963
- [x] PAR159 A row with no prior value shows — in 変更前 — src: store-detail.tsx:L262-L268
- [x] PAR160 Rows are ordered newest first — src: store-detail.tsx:L240-L270
- [x] PAR161 The tab is read-only: no add / edit / delete affordance anywhere in it — src: store-detail.tsx:L1938-L1966
- [x] PAR161a **Intentional divergence from V0**: the tab is unavailable to Staff / Trainer / Observer, and a direct attempt shows a not-permitted state. V0 shows it to every role — verify against spec FR-083, not the mockup — src: store-detail.tsx:L621 (V0 baseline) + spec.md FR-083
