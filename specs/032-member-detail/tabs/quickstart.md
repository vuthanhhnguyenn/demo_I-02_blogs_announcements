# Quickstart / Manual Verification: Member Detail — The 10 Tabs

**Feature**: `022-member-detail-tabs` | **Date**: 2026-07-29 | **Plan**: [plan.md](./plan.md)

This is the QA gate. The project ships **no automated tests** (Constitution: No Testing Policy), so this checklist is the verification of record. Work through it in the running app and tick every box before the MR.

```bash
npm run dev          # http://localhost:3000
npm run lint
npm run type-check
```

Open a member: `/members/<id>` → the 会員詳細 screen. Section A is the tab shell; B–K are one section per tab; L covers the changes this feature makes.

---

## A. Tab shell (FR-001…FR-006)

- [ ] The tab bar shows exactly, left to right: 基本情報 / 契約操作 / 支払い履歴 / 利用履歴 / ポイント履歴 / アンケート回答 / トレーニング記録 / ボディーデータ / 紹介関係 / 変更履歴.
- [ ] 基本情報 is selected on first load and the URL has **no** `?tab=`.
- [ ] Selecting each other tab puts `?tab=<slug>` in the URL; reloading restores that tab.
- [ ] Editing the URL to `?tab=nonsense` falls back to 基本情報 (no blank panel).
- [ ] Browser Back after switching tabs returns to the previous tab without a full page reload.
- [ ] On a wide screen every tab renders 60/40 with the right column sticky while the left scrolls (アンケート回答 and 変更履歴 are single-column by design).
- [ ] Narrow the window: columns stack, no horizontal page scroll; wide tables scroll inside their own container.

## B. 基本情報 (FR-007…FR-011)

- [ ] 個人情報 shows 生年月日 with age, 性別 badge, one composed 住所 line, 電話番号, メールアドレス — and **no** edit control anywhere on the tab.
- [ ] 入会情報 shows 入会日 / 入会店舗 / ブランド / 紹介者 / 入会キャンペーン; 紹介者 is a link when present and `—` when absent.
- [ ] Clicking 紹介者 opens that member with a two-level breadcrumb back to this member.
- [ ] 家族会員 lists the current member with the 本人 badge plus each family member as a link, and states the remaining capacity (not a hard-coded number).
- [ ] 来館情報 shows 在籍期間 / 最終来館日 / 今月来館回数 / 累計来館回数.
- [ ] 入退館設定 shows 認証方法 / ICカード番号 / QRコード / ゲートストップ (設定中 or 設定なし, with the jargon tooltip).
- [ ] 通知受信設定 lists the 4 channels with ON/OFF + updated date, carries the 参照のみ badge, and offers **no** toggle.
- [ ] Force the family-members request to fail: only that card shows its error + retry — 個人情報 and 入会情報 stay rendered.

## C. 契約操作 — read (FR-012, FR-014, FR-015, FR-018, FR-019, FR-020)

- [ ] 主契約 shows プラン名 / 月額 / 適用開始日 / 状態; an 個別会費調整 適用中 badge appears only when one is active.
- [ ] 個別会費調整 rows show 期間 (month range) / パターン / 金額・率 with direction / 事由 / 設定者 / 状態; an 適用中 row ending within 14 days shows あと{n}日.
- [ ] オプション契約 lists オプション名 / 月額 / 適用開始日 / 状態 with a per-row ⋯ menu (変更 / 解約).
- [ ] キャンペーン適用 sorts active first, then newest; the filter switches between 全期間 / 適用中のみ / 終了済みのみ.
- [ ] 1DayPass購入履歴 shows 購入日 / 利用店舗 / 金額 / 有効期限 / 状態 for the picked month.
- [ ] 契約サマリー shows 主契約名 / 月額合計 / 次回請求日 / 決済方法 / 未納金額 (highlighted when non-zero).
- [ ] 休会・退会履歴 strip renders the month cells and 申請一覧を見る navigates to the member's application list.

## D. 契約操作 — writes (FR-013, FR-015a, FR-016, FR-017)

- [ ] As a non-HQ role, 主契約 変更 is not usable and states 主契約の変更は本部のみ可能です.
- [ ] As Observer, オプション契約's ＋追加 is disabled with オプション操作の権限がありません and the per-row 変更 / 解約 items are disabled with a 権限なし badge; as Manager or Staff the same controls stay usable.
- [ ] Calling `POST /crm/members/{id}/contracts/option-contracts` (and `…/change`, `…/cancel`) as Observer returns 403 — the block is not UI-only.
- [ ] As HQ, the 変更 sheet shows the current plan read-only, excludes it from the destination list, shows before → after with the difference, and states the next-month-1st effective date.
- [ ] 調整を追加 is available to HQ / System / Manager only; 開始月, 終了月, パターン, 金額・率, 事由 are all required; 終了月 before 開始月 is rejected; with 代理申請 on, 合意日時 is required. 調整後金額（税込） takes digits only: letters, `e`, `+`, `-`, `.` cannot be typed; pasting `1200.0` keeps `1200.0` and shows 「調整後金額は半角数字のみで入力してください」 at once (never `12000`), and no English browser bubble 「Please enter a number.」 appears.
- [ ] オプション追加 offers 今日から / 翌月から; 解約 offers 即時解約 / 翌月末解約 with a reason; 変更 states next-month application.
- [ ] For a 休会中 member: add / change / cancel are all blocked and the card states 休会中はオプション契約の変更・追加・解約ができません.
- [ ] For a 退会予定 member: the equivalent 退会 message blocks the same three.
- [ ] For a member with an unpaid balance: 追加 is blocked with the 未納金 message.
- [ ] After any successful write: the sheet closes, a success toast appears, and the card plus 契約サマリー plus the head-up card all refresh without a manual reload.

## E. 支払い履歴 (FR-021…FR-024)

- [ ] 入出金明細 shows 日付 / 種別 / 内容 / 金額 / 決済方法; refunds are negative and visually distinct.
- [ ] The period filter offers 全期間 / 今月 / 先月 / 過去3ヶ月 / 過去6ヶ月 / 期間指定 and the type filter 全種別 / 売上 / 返金.
- [ ] Choosing 期間指定 shows a date-range picker; picking a start and end day lists only rows inside it (inclusive), and 支払いサマリー's title names the dates.
- [ ] Changing either filter resets to page 1 and the previous rows stay visible while loading (no skeleton flash).
- [ ] 請求一覧 shows 請求月 / 請求種別 / 金額 / ステータス / 請求日 with one status badge from 未確定 / 確定 / 入金済み / 未回収 / 貸倒.
- [ ] 支払いサマリー's title names the selected period and its figures change with the ledger's period filter.

## F. 利用履歴 (FR-025…FR-029)

- [ ] 入退館履歴 shows one row per event with an 入館 / 退館 badge, paginated, filterable by date range (default: current month; max 12 months) and by store.
- [ ] レッスン予約履歴 shows 日付 / レッスン名 / 担当 / 状態 (受講済み / 欠席 / キャンセル / 予約中 — prototype wording per spec Q7).
- [ ] オプション利用履歴 shows 日付 / 店舗 / オプション名 / 回数.
- [ ] Pick a month with no data on レッスン / オプション利用: the column headers remain and the table shows この月のデータはありません。 — the MonthPicker is still usable. On 入退館履歴 a range or store with no rows shows 該当するデータはありません。 and both filters stay usable.
- [ ] 入退館履歴: pick a store and a date range → only that store's rows within the range; a start day beyond which days past 12 months are disabled.
- [ ] 利用状況 shows this month's visits with the MoM delta, peak time slot, frequent store, lesson count with delta, and option uses with the breakdown; a metric the API cannot supply is omitted, never shown as 0.
- [ ] There is no entry/exit edit or export control anywhere on the tab.

## G. ポイント履歴 (FR-030…FR-032)

- [ ] One unified table: 日付 / 種別 (獲得・消費 badge) / 事由 / ポイント数 (signed, colour-coded).
- [ ] 日付 and 種別 both sort ascending and descending, and the active sort is indicated.
- [ ] The card title uses the brand's point name (JOYFIT → ENJOYポイント, FIT365 → ベアレージポイント) — verify by opening one member of each brand.
- [ ] ポイントサマリー shows 残高 / 期間内獲得合計 / 期間内消費合計 / 失効予定 with its date, and the two period totals change with the month.
- [ ] There is no refund or adjustment control on this tab.

## H. アンケート回答 (FR-033, FR-034)

- [ ] Responses are listed newest-first with アンケート名, a 種別 badge (ライフサイクル / オペレーション) and the timestamp.
- [ ] Clicking one opens that response's detail screen.
- [ ] A member with no responses shows 回答なし.

## I. トレーニング記録 (FR-035…FR-037)

- [ ] Table shows 実施日 / ルーティン名 / 実施時間 / 消費カロリー, newest first.
- [ ] The period filter offers 全期間 / 今月 / 過去3ヶ月 / 過去1年 and stays usable while loading and on error.
- [ ] 記録サマリー names the selected period and shows 実施回数 / 合計時間 / 合計消費カロリー / 最多ルーティン, updating with the filter.
- [ ] A period with no records shows この期間にトレーニング記録がありません with the dumbbell icon.
- [ ] No edit or delete control exists.

## J. ボディーデータ (FR-038…FR-041) — privacy gate

- [ ] **Not consented member**: the lock message この会員はCRMへのボディデータ連携に同意していません。 is shown, and the browser network panel shows **no** body-data request.
- [ ] **Refused member**: 会員が情報連携を拒否しています / ボディーデータは閲覧できません。 in the destructive style, again with no body-data request.
- [ ] **Granted, zero measurements**: まだボディーデータの記録がありません — no summary of zeros.
- [ ] **Granted with records**: 最新記録サマリー names the measurement date and shows 体重 / BMI / 体脂肪率 / 骨格筋量 / 基礎代謝量.
- [ ] 体組成データ shows all 12 metrics; 身体データ shows all 10 measurements plus 身長.
- [ ] 体重推移 renders and 測定履歴 lists newest-first with a データソース badge per row.
- [ ] Switch from a granted member to a non-consenting one without a reload: the gate re-evaluates (no stale "granted" from the previous member).

## K. 紹介関係 & 変更履歴 (FR-042…FR-047)

- [ ] A referred member shows the 紹介経由 banner and the referrer as a link; a non-referred member states there is no referrer.
- [ ] 招待実績 lists 氏名 / 会員ID / 入会日 / 特典付与 (付与済み・未付与) with a count badge; clicking a row opens that member.
- [ ] 紹介サマリー shows 招待人数（合計） / 特典付与済み / 特典未付与 / 入会経路.
- [ ] 変更履歴 columns are 更新日時 / 操作者 / 変更フィールド / 変更前 / → / 変更後, newest first.
- [ ] A ステータス row renders the new value as a status badge; the creation row renders the 新規作成 badge; missing values render as `—`.
- [ ] A record touching several fields shows the timestamp and operator once, with the fields listed beneath.
- [ ] Pagination works and paging keeps the previous rows visible.
- [ ] There is no add / edit / delete control on the history tab (seed-only).

## L. Changes introduced by this feature

### L1. Pending plan change (FR-013a) — the new capability

- [ ] As HQ, submit 主契約変更. The plan on the card **does not change**; a pending block appears showing the destination plan and the effective month (1st of next month).
- [ ] The 変更 button is now disabled with the reason stated — a second change cannot be started.
- [ ] The pending block is **read-only** — it shows the destination plan and effective month with no cancel control (**Withdrawn 2026-09-09** (spec.md FR-013a / Out of Scope)).
- [ ] 契約サマリー and the head-up card refresh on submit, with no manual reload.
- [ ] Open the seeded member that already has a pending change: the state renders on first load, without performing a write.
- [ ] With one pending, call the change endpoint again (e.g. from a stale second tab): the server rejects it with `409` and the UI surfaces the error rather than reporting success.

### L2. Display corrections

- [ ] 契約サマリー shows a concrete 次回請求日 date (e.g. `2026/08/27`), not 毎月27日 (P-01).
- [ ] 1DayPass rows render all five statuses correctly — 有効 / 開始前 / 利用済み / 期限切れ / キャンセル — with no raw enum key visible (P-02).
- [ ] キャンペーン適用期間 renders at month granularity (`2025/07 〜 2025/09`) (P-03).
- [ ] Lesson statuses read the prototype's wording 受講済み / キャンセル / 予約中, with 欠席 still available for an absent booking (P-04, spec Q7).
- [ ] The training-records empty message is still period-scoped (P-05 — deliberately kept).

## M. Gate before the MR

- [ ] `npm run lint` passes.
- [ ] `npm run type-check` passes.
- [ ] `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client` leaves **only** this feature's intended diff — no unrelated churn, no hand-edit under `src/lib/api/`.
- [ ] No test file was added anywhere (Constitution: No Testing Policy).
- [ ] No new npm dependency was added.
