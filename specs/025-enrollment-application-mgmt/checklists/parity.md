specs/025-enrollment-application-mgmt/checklists/parity.md# UI Parity Checklist: Enrollment Application Management (入会申請管理)

**Purpose**: Verify the implemented screens reproduce every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` @ e99646c, **re-synced to @ 47423ec (2026-09-30)** — `src/pages/enrollment-application-list.tsx`, `src/pages/enrollment-application-detail.tsx`, `src/pages/enrollment-application-form.tsx`
**Re-sync note (2026-10-06)**: Items changed by the prototype updates 8/13–9/17 (spec.md › Clarifications › Session 2026-10-06) were rewritten against `47423ec` and new items PAR159–PAR165 added. Each rewritten/new item is ticked only where the Phase 0 smoke run (headless Playwright, Headquarter, mock API) actually observed it; the rest are reset to `[ ]` for the next verify-parity pass. `src:` line numbers on rewritten items refer to `47423ec`.
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

**Execution note (2026-08-07)**: Verified black-box against a freshly restarted dev server (headless Playwright), logged in as Headquarter/Observer/Trainer. Covered: full list screen (KPI, filters, sort, empty-filtered state, pagination, row navigation), all 6 statuses + BL matched/unmatched/incomplete + minor with/without consent + companion-upgrade + JACCS + admin-source-missing-agreement + all 3 exemption kinds on the detail screen, approve/reject/cancel dialogs (incl. BL-matched approve and disabled-until-valid gating), the overflow menu, role-gating for Observer (disabled+tooltip) and Trainer (403 route block), and a full admin-form submission end-to-end (age states, JOYFIT fee-master lookup, campaign options, prefill query params, confirm → completion → toast → list). 153/158 items confirmed. 5 left unchecked as genuinely not reproduced this run (see inline notes): PAR035 (seed has only 18 rows, can't reach >7 pages), PAR117–119 (cancel-error dialog's two blocked-message triggers), PAR142 (blacklist-matched state on the admin form). No real bugs found — implementation matches V0 closely, including exact copy strings.

---

# Screen 1 — Application list (`enrollment-application-list.tsx`)

## Page header

- [x] PAR001 Page title — 入会申請管理, rendered outside the main scroll area — src: enrollment-application-list.tsx:L645-647
- [x] PAR002 管理画面から入会登録 action — Plus icon + label; role-gated to Headquarter/System/Manager/Staff; deny tooltip 「管理画面から入会登録する権限がありません」; navigates to the enrolment form — src: enrollment-application-list.tsx:L648-658

## KPI cards

- [x] PAR003 Two-card grid above the table (2 columns) — src: enrollment-application-list.tsx:L668
- [x] PAR004 未審査 card — label 未審査, count in warning colour, 件 suffix, persistent warning border; counts **未審査 only** within the user's store scope (prototype 9/8) — src: enrollment-application-list.tsx@47423ec:L361-372 （2026-10-06 Phase 0 smoke ✓）
- [ ] PAR005 BL要注意 card — label BL要注意, count + 件 suffix; number is success-coloured at 0 and destructive above 0; destructive border only when above 0; counts 未審査 + 審査中 rows with a blacklist match — src: enrollment-application-list.tsx@47423ec:L361-372

## Toolbar

- [x] PAR006 Search input — Search icon inset left, placeholder 「申請ID・氏名で検索...」, max width 400px, resets to page 1 on change — src: enrollment-application-list.tsx:L699-710
- [x] PAR007 詳細フィルター toggle — SlidersHorizontal icon; label toggles 詳細フィルター ⇄ 閉じる; outline variant at 0 active filters and filled variant above 0; active-count badge; ChevronDown ⇄ ChevronUp — src: enrollment-application-list.tsx:L712-726

## Filter panel (expanded state)

- [x] PAR008 ステータス select — 全ステータス / 未審査 / 審査中 / 承認済 / 自動承認済 / 否認 / 取り消し済; active (non-default) styling — src: enrollment-application-list.tsx:L733-746
- [x] PAR009 ブランド select — 全ブランド / FIT365 / JOYFIT; rendered **only** in the all-stores view — src: enrollment-application-list.tsx:L748-759
- [x] PAR010 店舗 select — 全店舗 / individual store names; rendered **only** in the all-stores view — src: enrollment-application-list.tsx:L760-769
- [x] PAR011 申請日レンジ picker — CalendarIcon; label 「YYYY年M月D日 〜 YYYY年M月D日」 or 「期間を選択」; range mode, 2 months side by side, Japanese locale; defaults to the last 7 days; active styling when changed from default — src: enrollment-application-list.tsx:L454-458, L468-470, L771-808
- [x] PAR012 BL照合 select — trigger carries the muted 「BL照合:」 prefix; options 全申請 / 一致のみ / 一致なし — src: enrollment-application-list.tsx:L809-819
- [x] PAR013 入会経路 select — 全経路 / モバイル / 手動 / 紹介経由 — src: enrollment-application-list.tsx:L820-831

## Filter result banner

- [x] PAR014 Result banner — shown when any filter or the search term is active; reports filtered count against unfiltered total; summary string joins active conditions with 「 ・ 」 in the order ステータス / ブランド / 店舗 / BL照合 / 入会経路 / 検索: "…"; offers a clear action that resets every filter, the date range, the search term, and the page — src: enrollment-application-list.tsx:L543-552, L590-599, L836-842

## Table

- [x] PAR015 Column set **and order** — 申請ID / 氏名 / ステータス / BL照合 / ブランド / 申請店舗 / プラン / キャンペーン / 申請日時 / 入会経路 / 利用開始日 — src: enrollment-application-list.tsx:L847-860
- [x] PAR016 Sortable headers — 申請ID, 氏名, ステータス, 申請日時, 利用開始日; ArrowDown/ArrowUp on the active column, muted ArrowUpDown otherwise; tooltip 「クリックでソート」/「クリックで昇順ソート」/「クリックで降順ソート」 — src: enrollment-application-list.tsx:L603-637
- [x] PAR017 Non-sortable headers render as plain labels — BL照合, ブランド, 申請店舗, プラン, キャンペーン, 入会経路 — src: enrollment-application-list.tsx:L852-858
- [x] PAR018 Header row is sticky with a muted background — src: enrollment-application-list.tsx:L848
- [x] PAR019 Default sort — 申請日時 descending; switching column resets direction (ascending for all keys except 申請日時, which starts descending); status sorts by flow order 未審査→審査中→承認済→自動承認済→否認→取り消し済 — src: enrollment-application-list.tsx:L412-428, L504-506, L522-531
- [x] PAR020 Row interaction — pointer cursor; blacklist-matched rows use a destructive tint with a destructive hover, others a muted hover; clicking navigates to the detail screen — src: enrollment-application-list.tsx:L878-887
- [x] PAR021 申請ID cell — muted small text — src: enrollment-application-list.tsx:L888
- [x] PAR022 氏名 cell — medium-weight text — src: enrollment-application-list.tsx:L889-891
- [x] PAR023 ステータス cell — outline badge with per-status colour: 未審査 warning / 審査中 info / 承認済 success / 自動承認済 success / 否認 destructive / 取り消し済 muted — src: enrollment-application-list.tsx:L380-395, L894-896
- [x] PAR024 対応超過 badge — warning badge with AlertTriangle beside the status badge for 未審査 rows past the threshold; tooltip 「未審査のまま24時間（運用設定値）を超過しています」 — src: enrollment-application-list.tsx:L430-442, L897-910
  > Round 1 (real API): the badge is driven by `isReviewOverdue` and the tooltip shows each row's own `reviewOverdueHours` (48 on dev), not a fixed 24.
- [x] PAR025 BL照合 cell — destructive BL一致 badge with AlertTriangle when matched; muted 「—」 when not — src: enrollment-application-list.tsx:L913-922
- [x] PAR026 ブランド cell — plain outline badge — src: enrollment-application-list.tsx:L923-927
- [x] PAR027 申請店舗 and プラン cells — plain small text — src: enrollment-application-list.tsx:L928-929
- [x] PAR028 キャンペーン cell — muted text; renders 「—」 when the value is 「なし」 — src: enrollment-application-list.tsx:L930-932
- [x] PAR029 申請日時 cell — 「YYYY/MM/DD HH:mm」 — src: enrollment-application-list.tsx:L933
- [x] PAR030 入会経路 cell — outline badge with three treatments: 手動 warning, 紹介経由 info, モバイル muted — src: enrollment-application-list.tsx:L934-947
- [x] PAR031 利用開始日 cell — 「YYYY/MM/DD」 — src: enrollment-application-list.tsx:L948
- [x] PAR032 Empty state — spans the full table; `filtered` variant (with a 条件をクリア button) when filters or a search term are active, `empty` variant otherwise; entity label 入会申請 — src: enrollment-application-list.tsx:L863-876

## Pagination footer

- [x] PAR033 Count summary — 「全 N 件 / M ページ / a-b を表示」 — src: enrollment-application-list.tsx:L959-961
- [x] PAR034 Previous/Next controls — disabled (non-interactive, dimmed) at the first and last page respectively — src: enrollment-application-list.tsx:L964-969, L985-990
- [ ] PAR035 Page number links — active page highlighted; ellipsis compaction once past 7 pages, following the head/middle/tail patterns — src: enrollment-application-list.tsx:L583-588, L970-984
- [ ] PAR036 表示件数 selector — label 表示件数; options **25件 / 50件 / 100件** (200 dropped, prototype 9/8); default 50; resets to page 1 on change — src: enrollment-application-list.tsx@47423ec:L462

---

# Screen 2 — Approval detail (`enrollment-application-detail.tsx`)

## Page header

- [x] PAR037 Back link — 「入会申請管理に戻る」 returning to the list — src: enrollment-application-detail.tsx:L698-703
- [x] PAR038 Title — the applicant's name — src: enrollment-application-detail.tsx:L704
- [x] PAR039 Status badge beside the title, using the same per-status colours as the list — src: enrollment-application-detail.tsx:L363-378, L705-712
- [ ] PAR040 Overflow menu — MoreHorizontal trigger, rendered **only for 承認済 / 自動承認済**; single destructive item 「申請を取り消す」 with an X icon, role-gated to Headquarter/System/Manager/Staff with a 「権限なし」 badge when denied (prototype 9/8) — src: enrollment-application-detail.tsx@47423ec:L852-873

## Companion upgrade banner (conditional — companion-upgrade case only)

- [x] PAR041 Info-treatment card with ArrowUpCircle icon and title 「同伴者からの正会員昇格申請」 — src: enrollment-application-detail.tsx:L738-745
- [x] PAR042 Explanatory paragraph — companion (C) registration, Yamauchi-ID carried forward on approval, history inherited — src: enrollment-application-detail.tsx:L746-749
- [x] PAR043 引き継がれるYamauchi-ID — monospace, info-coloured — src: enrollment-application-detail.tsx:L750-756
- [x] PAR044 現在の区分 — 「C区分（同伴者）」 muted badge → arrow → 「A区分（正会員）」 success badge — src: enrollment-application-detail.tsx:L757-764
- [ ] PAR045 引き継ぐ同伴履歴 — History icon, count with 件 suffix — src: enrollment-application-detail.tsx:L765-773
  > Round 1 (real API): B8 — inherited counts are not served; the cell shows 「—」.
- [ ] PAR046 引き継ぐトレーニング記録 — Dumbbell icon, count with 件 suffix — src: enrollment-application-detail.tsx:L774-782
  > Round 1 (real API): B8 — inherited counts are not served; the cell shows 「—」.
- [x] PAR047 Phase-2-only note — Info icon + 「承認後、Yamauchi-IDの区分がC→Aに自動更新されます。」 — src: enrollment-application-detail.tsx:L784-791

## 申請者情報 card

- [ ] PAR048 Card title 申請者情報 with a right-aligned reveal-all button — Eye/EyeOff icon, label toggles 「個人情報を表示」 ⇄ 「個人情報を隠す」 — src: enrollment-application-detail.tsx:L797-812
  > Round 1 (real API): B3 — rendered but disabled with the tooltip 「個人情報の表示はAPI未対応です」 (the API never serves unmasked values).
- [x] PAR049 Face photo — 96px circle showing the registered photo itself (alt 「{氏名}の顔写真」, success border), or the User-icon 「顔写真」 placeholder when unregistered; no registration timestamp under the badge (prototype 9/17) — src: enrollment-application-detail.tsx@47423ec:L961-995 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR050 Face photo status badge — 登録済み (success, CheckCircle) or 未登録 (warning, AlertTriangle) — src: enrollment-application-detail.tsx:L823-839
- [x] PAR051 Face photo registration timestamp beneath the badge when registered — src: enrollment-application-detail.tsx:L840-844
- [x] PAR052 Plain fields — 氏名, フリガナ, 生年月日 rendered as 「YYYY/MM/DD（N歳）」, 性別 — src: enrollment-application-detail.tsx:L847-853
- [ ] PAR053 Masked 電話番号 and メールアドレス — masked as filled dots keeping the last 4 characters, monospace; per-field Eye/EyeOff toggle with an accessible label 「{項目}を表示する」/「{項目}を隠す」 — src: enrollment-application-detail.tsx:L409-444, L855-866
  > Round 1 (real API): B3 — the masked rendering is the API's own (`090-****-****`); the per-field eye is disabled with the 「API未対応」 tooltip.
- [x] PAR054 Masked 住所 — same masking behaviour, spanning both grid columns — src: enrollment-application-detail.tsx:L867-874

## ブラックリスト照合結果 card

- [ ] PAR055 Matched state — destructive card border and tint; AlertTriangle + 「照合済み：一致あり」; every matched condition listed as a bullet — src: enrollment-application-detail.tsx:L881-900
  > Round 1 (real API): B5 — matched conditions are not served; a single 「一致条件・該当BLエントリ: API未対応」 line replaces the bullets.
- [ ] PAR056 Matched state link — 「該当BLエントリの詳細を確認 →」 navigating to the blacklist entry — src: enrollment-application-detail.tsx:L901-908
  > Round 1 (real API): B5 — no BL entry id is served, so the link is not rendered.
- [x] PAR057 Unmatched state — CheckCircle + 「照合済み：該当なし」, no alert treatment — src: enrollment-application-detail.tsx:L910-917

## 契約情報 card

- [x] PAR058 Field set and order — ブランド (outline badge), 入会店舗, プラン名, 月額料金 (¥ formatted), 先払い期間 (「Nヶ月」 + brand note 「FIT365: 2ヶ月固定」 / 「JOYFIT: 主契約マスタ設定」), 契約開始日 (**「承認時に確定」 while 未審査/審査中**, prototype 9/17), 利用開始日 — src: enrollment-application-detail.tsx@47423ec:L1098-1112 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR059 適用キャンペーン — info-coloured badge, rendered only when a campaign applies — src: enrollment-application-detail.tsx:L952-961
- [x] PAR060 選択オプション — outline badge per option, spanning both grid columns — src: enrollment-application-detail.tsx:L962-975

## 費用・決済情報 card

- [x] PAR061 Fee table header — 項目 / 金額 (right-aligned) — src: enrollment-application-detail.tsx:L985-991
- [x] PAR062 JOYFIT fee rows — 入会金 / 登録事務手数料 / 初月会費（日割）/ 翌月会費 — src: enrollment-application-detail.tsx:L341-346
- [x] PAR063 FIT365 fee rows — カード発行料 / 初月会費（日割）/ 翌月会費 (no 入会金, no 登録事務手数料) — src: enrollment-application-detail.tsx:L348-352

  > ⚠️ **PAR064–PAR073 (and PAR100) are PROVISIONAL.** The enrolment-fee exemption is reproduced from the V0 prototype and is absent from C-01 revision 260624_v5; the precedence rule is not PO-confirmed and is expected to change. Build to parity, but the implementing code must carry an inline comment saying so (spec FR-025a).

- [ ] PAR064 Exemption UI appears **only** on the 入会金 row and while the status is **未審査 or 審査中** (prototype 9/8) — src: enrollment-application-detail.tsx@47423ec:L1153-1156
- [x] PAR065 Campaign exemption state — info badge 「キャンペーン割引（自動）」 when the discount is partial / 「キャンペーン免除（自動）」 when it reaches the list price, with Info icon, plus 「適用: {キャンペーン名}」 (prototype 9/17) — src: enrollment-application-detail.tsx@47423ec:L1163-1177 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR066 Re-enrolment rule line — 「再入会免除規則: 退会後 180日 以内」 with the day count emphasised (shown only when no campaign exemption applies) — src: enrollment-application-detail.tsx:L1019-1023
- [x] PAR067 Re-enrolment eligible state — success badge 「再入会免除に該当（自動）」 with CheckCircle, plus 「前回退会 {日付}・180日以内」 — src: enrollment-application-detail.tsx:L1024-1034
- [x] PAR068 Re-enrolment not-eligible state — muted badge 「再入会免除 非該当」, plus 「前回退会 {日付}・180日超過」 — src: enrollment-application-detail.tsx:L1035-1044
- [x] PAR069 No withdrawal history state — 「前回退会履歴なし」 — src: enrollment-application-detail.tsx:L1045-1047
- [x] PAR070 Staff exemption trigger — ghost button 「個別に免除する」, shown only when neither automatic exemption applies — src: enrollment-application-detail.tsx:L1051-1061
- [x] PAR071 Staff exemption panel — 免除理由 label with a required mark, 取消 button, textarea placeholder 「免除理由を入力してください（必須）...」, note 「スタッフの裁量による例外的な個別免除です。理由は承認ログに記録されます。」; the exemption only takes effect once the reason is non-empty — src: enrollment-application-detail.tsx:L523-527, L1062-1089
- [x] PAR072 Exempted amount cell — list price struck through in muted, the **reduced amount** in success (¥0 only for a full exemption), and the discount as 「-¥N」 (prototype 9/17) — src: enrollment-application-detail.tsx@47423ec:L1254-1265 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR073 合計 row — emphasised top border and muted background; total rendered in success colour when an exemption reduced it — src: enrollment-application-detail.tsx:L1110-1119
- [x] PAR074 支払方法 field beneath the table — src: enrollment-application-detail.tsx:L1122-1124
- [x] PAR075 Direct-debit alert — info alert with Info icon: 「JACCS（口座振替）利用者のため、初回請求は翌月合算になるケースがあります。請求タイミングにご注意ください。」, shown only for non-credit-card payment — src: enrollment-application-detail.tsx:L1125-1133

## 対応履歴・メモ card

- [x] PAR076 Timeline rail — dot per entry (muted for system records, primary for memos) with a connector line between entries — src: enrollment-application-detail.tsx:L1148-1154
- [x] PAR077 Entry header — timestamp, operator name, and a 「メモ」 badge on memo entries only — src: enrollment-application-detail.tsx:L1155-1161
- [x] PAR078 Memo delete affordance — Trash2 + 削除, right-aligned, revealed on row hover, destructive on hover; absent on system records — src: enrollment-application-detail.tsx:L1162-1172
- [x] PAR079 Entry body text; newest entry first — src: enrollment-application-detail.tsx:L1174
- [x] PAR080 Memo composer — label 「メモを追加」, note 「システム記録・操作ログは削除できません。追加したメモのみ後から削除できます。」, 3-row textarea with placeholder 「メモを入力してください...」, 追加 button disabled while empty or whitespace — src: enrollment-application-detail.tsx:L1181-1200
- [ ] PAR165 Free-text limits — memo, rejection 補足, cancellation reason and staff 免除理由 textareas accept at most 1,000 characters (prototype 8/13) — src: enrollment-application-detail.tsx@47423ec:L1238, L1345, L1672, L1741

## Right column — ステータス card (sticky)

- [x] PAR081 Status visual — 80px tinted circle with a status icon: 未審査 Clock/warning, 審査中 ClipboardCheck/info, 承認済 and 自動承認済 CheckCircle/success, 否認 XCircle/destructive, 取り消し済 Archive/muted — src: enrollment-application-detail.tsx:L380-396, L1215-1222
- [x] PAR082 Status badge and 「最終更新: {日時}」 — src: enrollment-application-detail.tsx:L1223-1229
- [x] PAR083 Approved block — success-tinted panel with 承認者, 承認日時 and **会員ID** (monospace), followed by an outline 「会員詳細を開く（{会員ID}）」 button with ChevronRight that opens the A-01 member detail; shown for 承認済 and 自動承認済 (C-01 FR-M005, prototype 9/8) — src: enrollment-application-detail.tsx@47423ec:L1391-1422 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR084 当日取り消し回数 row — 「N / 2」 with a destructive number at the limit; shown once approved or once at least one cancellation has occurred — src: enrollment-application-detail.tsx:L1239-1247
- [x] PAR085 Rejected block — destructive-tinted panel with 否認者, 否認日時, and 否認理由 — src: enrollment-application-detail.tsx:L1249-1258
- [x] PAR159 Cancelled block — muted panel with 取り消し者, 取り消し日時, and 取り消し理由 (when recorded), shown for 取り消し済 (C-01 FR-M008, prototype 9/8) — src: enrollment-application-detail.tsx@47423ec:L1416-1426 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR086 承認前チェック section heading, rendered while **未審査 or 審査中** (prototype 9/8) — src: enrollment-application-detail.tsx@47423ec:L1448 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR087 Check 1 — CheckCircle + 「ブラックリスト照合完了」, with a right-aligned destructive 「一致あり」 badge when matched — src: enrollment-application-detail.tsx:L1266-1274
- [ ] PAR088 Check 2, minor branch — AlertTriangle + 「未成年（N歳 / FIT365: 16歳以上 | JOYFIT: 15歳以上）」, right-aligned success badge 「保護者同意確認済み」 when consent is recorded, and a sub-line **「同意日時: {日時}」** (no consent method, prototype 8/27) — src: enrollment-application-detail.tsx@47423ec:L1475-1478
- [x] PAR089 Check 2, adult branch — CheckCircle + 「年齢条件: 成人（N歳 / {ブランド}: X歳以上）」 — src: enrollment-application-detail.tsx:L1293-1298
- [x] PAR090 Check 3 — CheckCircle + 「利用開始日: 2ヶ月以内」, or AlertTriangle + 「利用開始日: 契約開始日から2ヶ月超（{日付}）」 — src: enrollment-application-detail.tsx:L538-547, L1299-1310
- [x] PAR091 Blacklist warning alert above the actions — 「BL一致あり。慎重に審査してください。」 — src: enrollment-application-detail.tsx:L1320-1327
- [x] PAR092 Missing-agreement alert — 「代理申請の合意日時が未入力です。合意日時の入力は必須のため、承認操作をブロックしています。」, shown when the source is 管理画面 and no agreement timestamp exists — src: enrollment-application-detail.tsx:L549-550, L1328-1336
- [x] PAR093 Approve button — full width with Check icon; role-gated to Headquarter/Manager/Staff with deny tooltip 「入会申請承認の権限がありません」; label 「承認する」 normally and 「リスクを確認して承認する」 on a blacklist match (with an outline variant); disabled when the agreement timestamp is missing — src: enrollment-application-detail.tsx:L1337-1348
- [x] PAR094 Reject button — full width outline with X icon and destructive text; role-gated with deny tooltip 「入会申請否認の権限がありません」 — src: enrollment-application-detail.tsx:L1349-1358
- [x] PAR095 Checklist and action block are shown for **未審査 and 審査中** and hidden for every other status (prototype 9/8) — src: enrollment-application-detail.tsx@47423ec:L1448, L1504 （2026-10-06 Phase 0 smoke ✓）

## Right column — 申請情報 card

- [x] PAR096 Field set and order — 申請ID (monospace), 申請日時, 申請元, 入会経路, 更新日時 — src: enrollment-application-detail.tsx:L1366-1377
- [x] PAR097 代理申請者 and 合意日時 fields, rendered only when the source is 管理画面 and the value exists — src: enrollment-application-detail.tsx:L1378-1383

## Approve confirmation dialog

- [x] PAR098 Title 「入会申請を承認しますか？」 and description 「承認すると会員登録が完了し、契約完了通知が送信されます。」 — src: enrollment-application-detail.tsx:L1396-1401
- [x] PAR099 Summary rows — 申請者 / 店舗 / プラン — src: enrollment-application-detail.tsx:L1402-1414
- [x] PAR100 ⚠️ _provisional_ — Exemption rows (when an exemption applies) — 「入会金（定価）」 struck through, then 「入会金{割引|免除}（キャンペーン・{キャンペーン名}）」 or 「入会金免除（{種別}）」 with 「-¥N」 in success (prototype 9/17) — src: enrollment-application-detail.tsx@47423ec:L1608-1616 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR101 「初期費用合計」 row reflecting any exemption, plus the note 「確定金額は承認時に初回請求（売上管理）へ反映されます。」 — src: enrollment-application-detail.tsx:L1428-1434
- [x] PAR102 Blacklist alert inside the dialog — 「この申請にはブラックリスト一致があります。」 — src: enrollment-application-detail.tsx:L1436-1443
- [x] PAR103 Footer — キャンセル / 承認する — src: enrollment-application-detail.tsx:L1444-1447
- [x] PAR104 On confirm — status becomes 承認済, approver and timestamp are recorded, a system timeline entry 「入会申請を承認しました。会員登録完了通知を送信しました。」 is added, and a second entry records the exemption type and its justification when one applied — src: enrollment-application-detail.tsx:L559-593

## Reject dialog

- [x] PAR105 Title 「入会申請を否認」 — src: enrollment-application-detail.tsx:L1454-1456
- [x] PAR106 Payment-release info alert — 「否認すると、保留中の決済情報（{支払方法}）は即時解放されます。申請者へは否認の事実のみ通知されます。」 — src: enrollment-application-detail.tsx:L1458-1464
- [x] PAR107 否認理由 select — placeholder 「否認理由を選択してください」; exactly four options 本人確認不備 / 年齢制限 / BL該当 / その他 — src: enrollment-application-detail.tsx:L1465-1479
- [x] PAR108 補足 field — marked optional, 4-row textarea with placeholder 「否認理由を入力してください...」 — src: enrollment-application-detail.tsx:L1480-1488
- [x] PAR109 Footer — キャンセル / destructive 否認する, disabled until a standard reason is selected — src: enrollment-application-detail.tsx:L1490-1501
- [x] PAR110 On confirm — status becomes 否認, rejecter/timestamp/reason recorded, and two timeline entries added (the reason with any supplement, and the notification plus payment release) — src: enrollment-application-detail.tsx:L595-621

## Cancel dialog

- [x] PAR111 Title 「申請を取り消しますか？」 and description 「取り消すと申請者に通知されます。この操作は元に戻せません。」 — src: enrollment-application-detail.tsx:L1508-1513
- [x] PAR112 Same-day count alert — 「本日のキャンセル: N / 2回（上限）」 with three treatments (muted at 0, warning at 1, destructive at 2) and the suffixes 「─ 次回キャンセル後は当日操作不可になります」 at 1 and 「─ これ以上のキャンセルは操作不可です」 at 2 — src: enrollment-application-detail.tsx:L1514-1537
- [x] PAR113 Refund alert — info 「カード決済の取消処理を実行します（90日以内）。」 for credit card, warning 「口座振替の返金は手動対応となります（CASHPOSTまたは振込）。」 otherwise — src: enrollment-application-detail.tsx:L1538-1548
- [x] PAR114 取り消し理由 field — required mark, 3-row textarea with placeholder 「取り消し理由を入力してください...」 — src: enrollment-application-detail.tsx:L1549-1557
- [x] PAR115 Footer — キャンセル (clears the reason) / destructive 取り消す, disabled until a reason is entered — src: enrollment-application-detail.tsx:L1558-1567
- [x] PAR116 On confirm — status becomes 取り消し済, the same-day counter increments, and a timeline entry records the reason plus the payment-method-appropriate refund note — src: enrollment-application-detail.tsx:L647-667

## Cancel error dialog

- [ ] PAR117 Title 「キャンセルできません」 with a 閉じる action — src: enrollment-application-detail.tsx:L1571-1582
- [ ] PAR118 Past-usage-start message — 「利用開始日以降の申請はキャンセルできません。」, raised before the cancel dialog opens — src: enrollment-application-detail.tsx:L623-637
- [ ] PAR119 Same-day-limit message — 「当日のキャンセル操作は2回までです。」, raised when the count has already reached 2 — src: enrollment-application-detail.tsx:L638-643

---

# Screen 3 — Admin enrolment form (`enrollment-application-form.tsx`)

## Page header

- [x] PAR120 Back link 「入会申請管理に戻る」 and page title 「管理画面入会」; content constrained to a 960px centred column — src: enrollment-application-form.tsx:L258-271

## Section 1 — 入会経路

- [x] PAR121 Read-only route value in a bordered muted field — 「手動」, or 「紹介経由」 once a 紹介コード is entered — alongside the note 「管理画面からの入会は入会経路「手動」が自動付与されます（紹介コード入力時は「紹介経由」）。申請種別の選択は不要です。」; no application-type selector, and no corporate or employee-discount section anywhere on the form (prototype 9/16) — src: enrollment-application-form.tsx@47423ec:L211-217, L333-340 （2026-10-06 Phase 0 smoke ✓）

## Section 2 — 申請者情報

- [x] PAR122 Pre-fill notice — info alert with CheckCircle: 「見学・体験の登録情報から氏名等をプリセットしました。内容をご確認ください。」, shown only when values were carried over — src: enrollment-application-form.tsx:L186-193, L297-305
- [x] PAR123 氏名（姓）and 氏名（名）— both required, placeholders 「例: 山田」 / 「例: 太郎」, two-column row — src: enrollment-application-form.tsx:L306-321
- [x] PAR124 フリガナ（姓）and フリガナ（名）— both required, placeholders 「例: ヤマダ」 / 「例: タロウ」 — src: enrollment-application-form.tsx:L322-337
- [x] PAR125 生年月日 — required date picker, placeholder 「日付を選択」 — src: enrollment-application-form.tsx:L339-345
- [x] PAR126 性別 — required select, placeholder 「選択してください」, options 男性 / 女性 / その他 / 回答しない — src: enrollment-application-form.tsx:L346-358
- [x] PAR127 Age below the brand minimum — destructive alert with AlertTriangle: 「年齢条件不適合: N歳。{ブランド}はX歳以上が入会可能です。申請を受け付けられません。」 — src: enrollment-application-form.tsx:L41-56, L364-370
- [ ] PAR128 Minor state — warning alert 「未成年（N歳）— 保護者同意の確認が必要です。」, a required consent checkbox labelled 「申込者が保護者の同意を得た上で申し込む旨を確認しました」, and a two-column row 保護者氏名 (required, placeholder 「例: 山田 花子」) + 同意日時 (required date-time) (prototype 9/8) — src: enrollment-application-form.tsx@47423ec:L442-460
- [x] PAR129 Adult state — success alert 「年齢条件: 成人（N歳 / {ブランド}: X歳以上）」 — src: enrollment-application-form.tsx:L391-398
- [x] PAR130 Age entered before a brand — hint 「ブランドを選択すると年齢条件を判定します」 in place of any judgement — src: enrollment-application-form.tsx:L401-403
- [x] PAR131 電話番号 and メールアドレス — both required, placeholders 「例: 090-1234-5678」 / 「例: yamada@example.com」 — src: enrollment-application-form.tsx:L404-420
- [x] PAR132 住所 — split into 郵便番号 (required, placeholder 「例: 150-0001」, 200px), 都道府県 (required select, 47 prefectures, placeholder 「選択してください」), 市町村・番地 (required, placeholder 「例: 渋谷区神宮前1-1-1」) and 建物名 (任意, placeholder 「例: 神宮前ビル 3F」) (prototype 9/17) — src: enrollment-application-form.tsx@47423ec:L492-528 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR133 顔写真 — required; dashed drop zone with ImagePlus icon, 「顔写真をアップロード」, constraint line 「JPG・PNG / 最大5MB / 正面・無帽」, and the note 「BL照合精度向上・入退館顔認証に使用されます」 — src: enrollment-application-form.tsx:L424-436
- [x] PAR160 規約同意 card — note 「申請者が以下の規約に同意したことを確認してください。すべての規約への同意が必要です。」 and one required checkbox per term — 「会員規約に同意した」 第4版（2026/04/01改定）/ 「個人情報の取扱いに同意した」 第3版（2026/01/15改定）/ 「施設利用規約に同意した」 第2版（2025/10/01改定） (prototype 9/17) — src: enrollment-application-form.tsx@47423ec:L546-577 （2026-10-06 Phase 0 smoke ✓）

## Section 3 — 契約情報

- [x] PAR134 ブランド — required select, options FIT365 / JOYFIT — src: enrollment-application-form.tsx:L448-458
- [x] PAR135 入会店舗 — required store combobox — src: enrollment-application-form.tsx:L459-461
<!-- Superseded 2026-10-15 (案1 — campaign → plan auto-decided, 025 integration-plan D17)
- [x] PAR136 プラン — required select: レギュラー会員 / ナイト会員 / デイタイム会員 / ウィークエンド会員 / レギュラー会員（学生）/ レギュラー会員（シニア）— src: enrollment-application-form.tsx:L462-476
      -->
- [x] PAR166 契約情報 field order — ブランド / 入会店舗 / 適用キャンペーン / プラン / 利用開始日 / 紹介コード / 決済方法 (2026-10-15 案1 — **deliberate deviation** from prototype `47423ec`, which places プラン before 適用キャンペーン as independent selects; re-check when the separate UI instruction arrives) — src: spec.md FR-050, integration-plan.md D17 （2026-10-15 D17 run ✓ — TC-F-212 / TC-F-213 / TC-F-214 / TC-F-215）
- [x] PAR167 適用キャンペーン — **required** select, placeholder 「選択してください」, no 「なし」 option, listing only campaigns usable at the selected store (accepting, recruiting today, published) — src: spec.md FR-050, integration-plan.md D17 （2026-10-15 D17 run ✓ — TC-F-212 / TC-F-213 / TC-F-214 / TC-F-215）
- [x] PAR168 プラン — read-only, filled with the picked campaign's plan name; before a campaign is picked it shows the placeholder 「キャンペーンを選択すると自動設定されます」; cannot be opened or changed — src: spec.md FR-050, integration-plan.md D17 （2026-10-15 D17 run ✓ — TC-F-212 / TC-F-213 / TC-F-214 / TC-F-215）
- [x] PAR137 利用開始日 — required date picker — src: enrollment-application-form.tsx:L477-483
<!-- Superseded 2026-10-15 (案1 — campaign → plan auto-decided, 025 integration-plan D17)
- [x] PAR138 適用キャンペーン — **required** select with placeholder 「選択してください」 and no 「なし」 option, listing campaigns currently accepting applications (prototype 9/8) — src: enrollment-application-form.tsx@47423ec:L622-635 （2026-10-06 Phase 0 smoke ✓）
      -->
- [x] PAR161 紹介コード — 任意 field, placeholder 「例: ST001AB12C」, hint 「紹介コードがある場合に入力。入会経路が『紹介経由』になります」 (prototype 9/16) — src: enrollment-application-form.tsx@47423ec:L636-645 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR139 決済方法 — required select: 「クレジットカード（SBPS）」 / 「口座振替（JACCS）」 — src: enrollment-application-form.tsx:L499-509
- [x] PAR162 カードトークン — shown only for クレジットカード; required monospace input (placeholder 「リンク型登録などで取得したトークンを入力」, hint 「SBPSのリンク型登録などで取得済みのトークンを入力します」) beside a disabled outline 「取得リンクを送る」 button whose tooltip reads 「取得手順は仕様確定後に有効化されます」 (prototype 9/16) — src: enrollment-application-form.tsx@47423ec:L658-683 （2026-10-06 Phase 0 smoke ✓）

## Section 4 — 代理申請記録

- [x] PAR140 合意日時 — required date-time input with the hint 「申請者が申込内容に同意した日時を入力してください。未入力の場合は入会登録（承認）に進めません」 — src: enrollment-application-form.tsx:L521-531
- [x] PAR141 代理申請者 — read-only field showing the operator, plus the note 「代理申請者は操作ログから自動記録されます。」 — src: enrollment-application-form.tsx:L532-536

## Section 5 — ブラックリスト照合結果

- [ ] PAR142 Matched state — destructive card treatment, badge 「照合済み：一致あり」, and the note 「申請者情報がブラックリストと一致しています。審査を慎重に行ってください。」 — src: enrollment-application-form.tsx:L541, L547-555
- [x] PAR143 Unmatched state — success badge 「照合済み：該当なし」 and the note 「ブラックリストとの一致はありません。」 — src: enrollment-application-form.tsx:L556-565
- [ ] PAR144 Not-yet-checked state — warning badge 「未照合」 and the note 「氏名と生年月日、またはメール・電話・住所のいずれかを入力すると、照合が自動実行されます。」 (prototype 9/17) — src: enrollment-application-form.tsx@47423ec:L745-750
- [ ] PAR163 Check trigger — the check runs as soon as **any one** match key is entered (氏名＋生年月日 / メール / 電話 / 住所, OR) and the card reads 「未照合」 until then (C-01 FR-M003, prototype 9/17) — src: enrollment-application-form.tsx@47423ec:L236-241 （2026-10-06 Phase 0 smoke ✓）
  > Round 1 (real API): B14 — `blacklist-precheck` needs 姓・名・生年月日・電話・メール together; the check runs once all five are valid and the hint says so.

## Section 6 — 入会金・先払い費用

- [x] PAR145 FIT365 layout — カード発行料 (read-only, hint 「FIT365: 税別5,000円」), 初月会費（日割）(hint 「利用開始日から月末までの日割りで自動計算」, placeholder 「プランと利用開始日を選択」), 翌月会費 (hint 「プランの月額から自動適用」, placeholder 「プランを選択」); no 入会金 and no 登録事務手数料 — src: enrollment-application-form.tsx:L586-605
- [ ] PAR146 JOYFIT layout — 入会金（マスタ参照）select (hint 「システム設定 › 入会金マスタ から選択」, options 「{名称}（¥N）」 filtered to active masters matching the brand), 金額（マスタから自動適用）read-only showing the **amount after any campaign discount**, 登録事務手数料 (hint 「JOYFIT: 税別3,000円」), 初月会費（日割）, 翌月会費 — src: enrollment-application-form.tsx@47423ec:L787-830
  > Round 1 (real API): B12 — the 入会金 master select is read-only, showing 「プランの入会金（¥N）」 from `price-estimate`; nothing is selected or sent.
- [x] PAR147 No-brand hint — 「ブランドを選択すると費用項目が切り替わります」 — src: enrollment-application-form.tsx:L652-654
- [x] PAR148 Campaign discount folded into 入会金 — beneath the 金額 field: list price struck through, 「-¥N」 in success, and 「キャンペーン割引（{キャンペーン名}）」; capped at the 入会金 list price; no separate discount line above the total (prototype 9/17) — src: enrollment-application-form.tsx@47423ec:L275-287, L797-810 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR149 合計 line — larger emphasised total = sum of the lines minus the 入会金 campaign discount — src: enrollment-application-form.tsx@47423ec:L288, L838-845 （2026-10-06 Phase 0 smoke ✓）
- [x] PAR150 Prorated first-month fee — computed from the usage start date through the end of that month against the plan's monthly fee — src: enrollment-application-form.tsx:L152-160

## Footer actions

- [x] PAR151 キャンセル — large outline button returning to the list without saving — src: enrollment-application-form.tsx:L674-676
- [x] PAR152 入会登録 — large primary button, disabled while the applicant is below the brand minimum age, a minor's consent / 保護者氏名 / 同意日時 is missing, any term is unagreed, the agreement timestamp is empty, or a card payment has no token — the disabled button carries a tooltip naming the first unmet condition (「年齢条件不適合のため登録できません」/「保護者同意の確認が必要です」/「保護者氏名・同意日時の入力が必要です」/「すべての規約に同意が必要です」/「合意日時が未入力のため登録できません」/「カードトークンが未入力です」) (prototype 9/17) — src: enrollment-application-form.tsx@47423ec:L289-302, L854-861 （2026-10-06 Phase 0 smoke ✓）

## Confirmation dialog

- [x] PAR153 Title 「入会申請の内容を確認」 and description 「下記の内容で入会申請を登録します。申請は「未審査」として入会申請一覧に追加され、審査・承認後に会員レコードが生成されます。」 — src: enrollment-application-form.tsx:L692-697
- [ ] PAR154 Summary rows in order — 入会経路 (手動 / 紹介経由) / ブランド / 入会店舗 / プラン / 決済方法, each falling back to 「—」 when unset — src: enrollment-application-form.tsx@47423ec:L871-897
- [ ] PAR164 Fee rows in the confirmation dialog — 「入会金（定価）」 struck through and 「入会金{割引|免除}（キャンペーン・{キャンペーン名}）」 「-¥N」 when a campaign discount applies, then 「初期費用合計」 (prototype 9/17) — src: enrollment-application-form.tsx@47423ec:L897-913
- [x] PAR155 年齢 row — 「N歳」 plus a success 「保護者同意確認済み」 marker for a consented minor; shown only once an age is derivable — src: enrollment-application-form.tsx:L719-729
- [x] PAR156 Footer — 戻る / 申請を登録 — src: enrollment-application-form.tsx:L731-741

## Completion dialog

- [x] PAR157 Title 「入会申請を登録しました」 and description 「申請を「未審査」として入会申請一覧に追加しました。審査・承認後に会員レコードが生成されます。入会申請一覧に戻ります。」 — src: enrollment-application-form.tsx:L748-753
- [x] PAR158 完了 action — shows the success toast 「入会申請を登録しました（未審査）」 and returns to the list — src: enrollment-application-form.tsx:L754-764
