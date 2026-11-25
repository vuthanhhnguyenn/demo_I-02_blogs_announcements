# Feature Specification: Member Detail — The 10 Tabs (会員詳細 タブ)

**Feature Branch**: `022-member-detail-tabs`
**Created**: 2026-07-29
**Status**: Draft — re-baselined 2026-09-23 (see Amendment 2026-09-23)
**PO Spec**: `A-01` — 会員管理（一覧） / supplementary sections `A-01-01` and `A-01-01-a` … `A-01-01-i`
**Parent spec**: [`../spec.md`](../spec.md) (umbrella)
**Source**:

- Requirement spec: `dx-fitness/fitness-spec` @ `a5abfdb` (2026-09-12) — `crm/requirements/A-01.md` **v260901_v6**.
- UI prototype: `dx-fitness/fitness-crm-ui` @ `0a73739` (2026-09-17) — `src/pages/member-detail.tsx` (5,820 lines); tab components at lines 1015 / 1365 / 2087 / 1899 / 2274 / 2474 / 2512 / 2631 / 3059 / 3285, tab bar at line 4001.
- API: the real backend (Swagger dev `/docs-json`, generated client `src/lib/api-real`). Per-endpoint status and open backend items: [`api-integration-output/member-detail/report.md`](../../../api-integration-output/member-detail/report.md); deliberate deviations from the prototype: [`api-integration-output/prototype-gap-list.md`](../../../api-integration-output/prototype-gap-list.md).
- History: first written 2026-07-29 against A-01 v4, prototype `426a9b3` and API design doc v0.8.0; absorbed the former `payment-history/` and `usage-history/` sub-specs on 2026-09-23.

**Input**: User description: "Tạo spec cho các tab trong màn hình member detail (10 cái), cái nào có rồi thì kiểm tra update. Phase 1 only. history thêm seed only, không cần xử lý update create delete history."

---

## Amendment 2026-09-23 — re-baseline to A-01 v6, prototype `0a73739` and the real API

| #   | Tab                     | Change                                                                                                                                                             | Why                                                                                                                                                       | Sections touched                                                |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| T1  | 基本情報                | The **入退館設定 card is removed**. A **ゲートストップ card** takes its place: pattern badge, 端末メッセージ, 設定者, 設定日時, and a 「解除...」 button           | qa-121: 認証方法 / ICカード番号 / QRコード are not member attributes (report N52); prototype `0a73739`                                                    | FR-011, UH-5, Traceability                                      |
| T2  | 基本情報                | **動作確認用アカウント card added**                                                                                                                                | `A-01 FR-025` (v5) + prototype                                                                                                                            | FR-011a (new), FR-045                                           |
| T3  | 基本情報                | 通知受信設定 is keyed by **topic** (10 fixed topics), not by channel. 家族会員 comes with the member bundle, including the member themself and the remaining slots | Backend design answer 2026-08-10; report N14 / N15 closed                                                                                                 | FR-009, FR-011, Q1                                              |
| T4  | 契約操作                | 個別会費調整 has **no パターン**: period + 調整後金額（税込） + 事由                                                                                               | Prototype removed 調整パターン; API takes `adjustedAmount` (report N17)                                                                                   | US2, FR-014                                                     |
| T5  | 契約操作                | 主契約変更 and オプション追加 / 変更 / 解約 carry an **always-on 代理申請** (合意日時 + 合意方法 required). 個別会費調整 has none                                  | qa-239; the API accepts only `applicationSource: proxy` (N20); the fee-adjustment DTO has no proxy field (prototype-gap-list #9, qa-242 pending)          | FR-013, FR-014, FR-017                                          |
| T6  | 契約操作                | 主契約 table adds **利用開始日** and shows the suspension fee while 休会中. 解約 timing reads 即時解約 / 当月末で解約. Campaign status has no 適用予定             | Prototype; prototype-gap-list #5; report FE item                                                                                                          | FR-012, FR-017, FR-018                                          |
| T7  | 紹介関係 / ポイント履歴 | **ポイント手動返還 moves to 紹介関係** (Manager and above)                                                                                                         | Prototype `0a73739` now follows `A-01 FR-S001`; Q6 is superseded. The point-discount return inside 休会申請 also remains (header-actions FR-013)          | FR-032, FR-044a (new), P-08, Q6                                 |
| T8  | ボディーデータ          | The trend chart is **metric-switchable**, and 身体データ shows **left/right** values. 測定履歴 shows the latest 5 plus a full-history sheet                        | qa-240; the prototype has 3 metrics and the app has all 12 (prototype-gap-list #7). Full-history pagination is on hold (PO, 2026-09-16; report N43 / N44) | US3, FR-040, FR-041, P-06, Out of Scope                         |
| T9  | 変更履歴                | Shows 動作確認用アカウント set/release rows and reservation-penalty rows                                                                                           | `A-01 FR-025`; prototype                                                                                                                                  | FR-046                                                          |
| T10 | all                     | Every tab reads the real API. The mock-vs-design mapping is replaced by the integration report                                                                     | Integration round 1/2 done                                                                                                                                | Clarifications, API Contract Mapping, Gap Analysis, Assumptions |

## Amendment 2026-09-25 — PO decisions from the Unit 1 test review

The umbrella [`../spec.md`](../spec.md) holds the full list (P1 – P15); these are the ones that change a tab requirement.

| #   | Tab      | Change                                                                                                                    | Sections touched     |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| P4  | all      | An error state shows the server's `userMessage` when the response carries one, instead of a generic network-error message | FR-004, Edge Cases   |
| P5  | 基本情報 | Editing is reached from 編集 by every user whose position grants `can_edit_member` (not HQ / System by role)              | FR-007               |
| P7  | 基本情報 | 今月来館回数 and 累計来館回数 are **removed** from 来館情報 — neither `A-01` nor the prototype has them                   | FR-010, Key Entities |
| P9  | 基本情報 | 通知受信設定 helper text follows the prototype wording (already the FR-011 text)                                          | FR-011               |
| P11 | 基本情報 | 在籍期間 reads `n年nヶ月`, and `nヶ月` alone under one year (no 「0年」)                                                  | FR-010               |
| P14 | all      | A tab's filter MAY reset to its default when the user switches tabs and comes back                                        | US1                  |
| P15 | all      | The 60 / 40 split holds at the 1024px floor; there is no single-column collapse inside the supported range                | FR-003               |

## Amendment 2026-10-14 — 入退館履歴 filter: date range + store; 入出金明細 filter: custom date range

| #   | Tab        | Change                                                                                                                                                                                                                                                                                                                              | Sections touched                       |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| T11 | 利用履歴   | 入退館履歴's month picker is replaced by a **date-range filter** and a **store filter**, per `A-01 FR-010` 「日付・店舗でフィルタリング可能」 (defect raised against the month-only filter). This supersedes the 2026-09-29 test decision U6-4 "follow the prototype: month only". The prototype still shows only the month picker. | FR-025, UH-1, Edge Cases               |
| T12 | 支払い履歴 | 入出金明細's period Select gains a **「期間指定」** option that opens a **date-range picker**, per `A-01 FR-009` 「日付・種別でフィルタリング可能」 (defect raised against the preset-only period filter). The five preset periods stay. The prototype still shows the preset Select only.                                          | FR-021, FR-023, FR-024, FR-009-a, P-12 |

## Amendment 2026-11-19 — ladyroom: 主契約 / オプション gated by the area's 性別の条件 (契約操作)

**Sources**: `E-02.md` `261109_v6` FR-016 (「性別の条件があるエリアを含む主契約・オプションは、条件に合う会員にだけ販売・付与できる（アプリ・CRMとも。A-01・C-01）」) and FR-008 (who matches), `G-01.md` FR-M002 / `G-02.md` FR-002 「利用できるエリア」 (`fitness-spec@9e0e07e`); prototype `dx-fitness/fitness-crm-ui@9428dc2` `member-detail.tsx` (design PR #42, 11/12); API `StorePlanDto.genderCondition`, `StoreOptionDto.genderCondition`, 422 `E-ARE-003`. `A-01.md` itself is silent — the rule comes from E-02 / G-01 / G-02.

| #   | Tab      | Change                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T13 | 契約操作 | **Who matches**: a 主契約 / オプション whose areas carry 女性のみ is sold / granted only to a member whose 性別 is 女性, 男性のみ only to 男性; その他 / 回答しない / 未設定 match neither; a master whose conditions contradict each other (`nobody` — 女性のみ + 男性のみ areas, or the 主契約's 性別制限 against its area) matches no one. A 主契約's own 性別制限 (G-01) gates the same way.                           |
| T14 | 契約操作 | **主契約変更 sheet**: a destination plan the member does not match is **left out** of the candidates (not shown disabled). If none remains (and the member is not a 法人会員), the select is disabled with the placeholder 「変更できる主契約はありません」, the note line reads 「会員の性別に合う変更先の主契約がありません。」 and the submit is disabled.                                                              |
| T15 | 契約操作 | **オプション追加 / オプション変更 sheets**: an option the member does not match is left out of the candidates (the change targets come from the same list). None left → select disabled, placeholder 「追加できるオプションはありません」 / 「変更できるオプションはありません」.                                                                                                                                          |
| T16 | 契約操作 | **Server backstop**: a mismatched 主契約変更 / オプション追加 sent anyway answers 422 `E-ARE-003`; nothing is saved and the error is shown. A change of an area's 性別の条件 in the area master ([029/009-area-master](../../029-equipment-management/009-area-master/spec.md)) applies from the next load. What happens to a member who **already holds** an item that later becomes gated is not specified (open point). |

---

## Overview

The member detail screen (`A-01-01`) is the OOUI "person-first" hub required by `A-01 FR-003`: a status-aware head-up card plus **10 tabs** that aggregate everything known about one member. This feature covers **the tabs only** — the head-up card and the header surfaces (status changes, gate stop, blacklist, PII deletion, 入会取り消し …) are `../header-actions/` (formerly feature 021) and are not re-specified here.

Nine of the ten tabs are read surfaces. One — 契約操作 — is the single tab that also writes: main-contract change, individual fee adjustment, and option-contract add / change / cancel. Those four write surfaces were explicitly deferred by `021` ("Not in scope: opened from the 契約操作 tab") and are therefore **in scope here**.

### The 10 tabs in scope

| #   | Tab (label)      | URL slug                    | Requirement                                                       | Prototype anchor         | Project component                                                                                                  | Already in project |
| --- | ---------------- | --------------------------- | ----------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------ |
| 1   | 基本情報         | `basic` (default, no param) | `A-01 FR-004` (`A-01-01-a`)                                       | `member-detail.tsx:1015` | [basic-info-tab/index.tsx](<src/app/(private)/members/[id]/_components/tabs/basic-info-tab/index.tsx>)             | ✅                 |
| 2   | 契約操作         | `contracts`                 | `A-01 FR-006 / FR-007 / FR-008 / FR-019` (`A-01-01-c`)            | `member-detail.tsx:1365` | [contracts-tab/](<src/app/(private)/members/[id]/_components/tabs/contracts-tab/>) (7 cards + sheet)               | ✅                 |
| 3   | 支払い履歴       | `payment`                   | `A-01 FR-009` (`A-01-01-d`)                                       | `member-detail.tsx:2087` | [payment-history-tab/](<src/app/(private)/members/[id]/_components/tabs/payment-history-tab/>)                     | ✅                 |
| 4   | 利用履歴         | `usage`                     | `A-01 FR-010` (`A-01-01-e`)                                       | `member-detail.tsx:1899` | [usage-history-tab/](<src/app/(private)/members/[id]/_components/tabs/usage-history-tab/>)                         | ✅                 |
| 5   | ポイント履歴     | `points`                    | `A-01 FR-011` (`A-01-01-f`)                                       | `member-detail.tsx:2274` | [points-tab/index.tsx](<src/app/(private)/members/[id]/_components/tabs/points-tab/index.tsx>)                     | ✅                 |
| 6   | アンケート回答   | `survey`                    | **not in `A-01`** — `G-04 FR-004` (individual response reference) | `member-detail.tsx:2474` | [survey-response-tab/index.tsx](<src/app/(private)/members/[id]/_components/tabs/survey-response-tab/index.tsx>)   | ✅                 |
| 7   | トレーニング記録 | `training`                  | `A-01 FR-012` (`A-01-01-g`)                                       | `member-detail.tsx:2512` | [training-records-tab/index.tsx](<src/app/(private)/members/[id]/_components/tabs/training-records-tab/index.tsx>) | ✅                 |
| 8   | ボディーデータ   | `body-data`                 | `A-01 FR-013` (`A-01-01-h`)                                       | `member-detail.tsx:2631` | [body-data-tab/index.tsx](<src/app/(private)/members/[id]/_components/tabs/body-data-tab/index.tsx>)               | ✅                 |
| 9   | 紹介関係         | `referral`                  | `A-01 FR-S001` (`A-01-01-i`)                                      | `member-detail.tsx:3059` | [referral-tab/index.tsx](<src/app/(private)/members/[id]/_components/tabs/referral-tab/index.tsx>)                 | ✅                 |
| 10  | 変更履歴         | `history`                   | `A-01 FR-003` (変更履歴タブ)                                      | `member-detail.tsx:3285` | [change-history-tab/index.tsx](<src/app/(private)/members/[id]/_components/tabs/change-history-tab/index.tsx>)     | ✅                 |

**All 10 tabs already exist in the project and are mounted from [page.tsx](<src/app/(private)/members/[id]/page.tsx>).** This feature is therefore a **verify-and-update** pass, not a greenfield build: the requirements below state the target behaviour, and the Gap Analysis records every place where the current implementation diverges from the prototype, from `A-01`, or from the API design doc.

Two tabs carry requirements beyond the plain `A-01` read lists: アンケート回答 (`G-04`) and 紹介関係 (`FR-S001`, whose manual point refund now lives on the tab — Amendment T7). Those cross-document links are recorded in Traceability and Q&A rather than silently absorbed.

---

## Clarifications

### Session 2026-07-29

- Q: Does 主契約変更 create a pending plan-change application, or apply directly from next month's 1st? → A: Application — it creates a pending plan-change record applied by a job at month start, so the tab must show the pending change and offer a cancel path (spec Q8 resolved).
- Q: The アンケート回答 tab needs all responses by one member, which the design doc cannot answer — add an endpoint, stay on mock, or drop the tab? → A: Request a member-scoped endpoint (`GET /admin/members/{memberId}/questionnaire-responses`) under `G-04`; the tab stays in scope and runs on the mock route until the backend ships it (spec Q3 resolved).
- Q: 通知受信設定 has no member-level data source in the design doc — keep the card, drop it, or derive it from the resolved settings endpoint? → A: **Resolved by the backend (2026-08-10)**: it is part of the member detail response, keyed by topic. ~~Keep the card and request a member-scoped read endpoint under `I-03`; it stays read-only and runs on the mock route until the backend ships it (spec Q1 resolved).~~
- Q: Does ボディーデータ keep the prototype's three consent states, or collapse to the API's two? → A: Three states — granted / 未同意 / 拒否 stay distinct, and the backend must expose an explicit consent status so 拒否 can be told apart from "not yet consented" (spec Q4 resolved).
- Q: Does 請求一覧 show one derived status badge or two columns for the API's confirmation and collection axes? → A: One derived badge over the `A-01 FR-009` vocabulary; collection status wins once the bill is confirmed, and the derivation is owned server-side rather than computed in the client (spec Q2 resolved).
- Q: Are the member-history endpoints (Member Financial / Activity / Relations History) backend-ready, or design-only? → A: **Superseded — they are live and integrated** (report). ~~Treat them as **design-only**; Phase 1 reads every tab from the project's mock API, and any mock route a tab still needs is created here (spec Q5 resolved).~~
- Q: Does ポイント手動返還 live on the 紹介関係 tab (`A-01 FR-S001`) or inside the 休会申請 sheet (prototype)? → A: **Superseded 2026-09-23** — prototype `0a73739` added the refund to 紹介関係, matching `A-01 FR-S001` (Amendment T7). ~~Follow the prototype — the refund stays in 休会申請 (feature `021`); 紹介関係 and ポイント履歴 are read-only, and `A-01 FR-S001`'s tab placement is stale (spec Q6 resolved).~~
- Q: Where the prototype and `A-01` use different wording, which wins? → A: **The prototype wins.** レッスン状態 labels become 受講済み / キャンセル / 予約中 (the `absent` state, which the prototype never renders, keeps 欠席), and the training-records empty message keeps the prototype's period-scoped phrasing (spec Q7 resolved).

---

## User Scenarios _(mandatory)_

### User Story 1 — Read a member's whole picture across the tabs (Priority: P1)

A store staff member opens a member's detail screen and moves through the tabs to answer a question at the counter: who is this person, what are they contracted for, have they paid, how often do they come, how many points do they have, what did they answer in the survey, how are they training, what does their body data say, who referred them, and what changed recently. Every tab loads independently, has its own filter (it may reset to its default after a tab switch — P14), and reflects the active tab in the URL so the view can be shared or reloaded.

**Why this priority**: This is the reason `A-01 FR-003` exists — a single person-first screen. Nine of the ten tabs deliver value on their own, and each is independently shippable.

**Verification**: Open a member, click each of the 10 tabs in order, and confirm every tab renders its cards with real data, a skeleton while loading, an error state with retry on failure, and a stated empty state when there is nothing to show.

**Acceptance Scenarios**:

1. **Given** the member detail screen, **Then** the tab bar shows exactly, in order: 基本情報, 契約操作, 支払い履歴, 利用履歴, ポイント履歴, アンケート回答, トレーニング記録, ボディーデータ, 紹介関係, 変更履歴.
2. **Given** any tab other than 基本情報 is selected, **Then** the URL carries `?tab=<slug>`; selecting 基本情報 removes the parameter; reloading the URL restores the same tab.
3. **Given** an unknown or absent `?tab=` value, **Then** 基本情報 is shown rather than an empty panel.
4. **Given** a tab is loading, **Then** a skeleton shaped like the target content is shown; **given** the request fails, **Then** an error state with a retry control is shown and retrying re-fetches without a page reload.
5. **Given** a tab with a period / month filter, **When** the filter changes, **Then** the previously loaded rows stay visible under a dimming indicator instead of collapsing back to a skeleton.
6. **Given** a filter that matches nothing, **Then** the table keeps its column headers and shows its own empty row (「この月のデータはありません。」 / 「該当する履歴はありません」), not a whole-card empty state — so the filter can still be changed.

---

### User Story 2 — Operate the member's contracts from the 契約操作 tab (Priority: P1)

A headquarters operator changes the member's main contract, registers an individual fee adjustment for a fixed period, or adds / changes / cancels an option contract. Each action opens a side sheet, states when the change takes effect (today / next month / next month's 1st), and is blocked with a stated reason when the member's status or unpaid balance forbids it.

**Why this priority**: This is the only tab that writes, and it carries `A-01`'s Must requirements `FR-006` and `FR-007` plus the audit-critical fee-adjustment reason. Each sheet is independently shippable.

**Verification**: As HQ, change the plan and confirm the effective-from note, the success toast, and that 主契約 / 契約サマリー / the head-up card all refresh. Repeat for a fee adjustment and for each option operation. Then repeat for a member on 休会中 and confirm every option control is blocked with its reason. Finally repeat as Observer and confirm every write control on the tab is refused, not merely hidden.

**Acceptance Scenarios**:

1. **Given** the 主契約 card, **Then** it shows プラン名 / 月額 / 適用開始日 / 利用開始日 / 状態 and a 変更 button restricted to Headquarter · System; other roles see the reason 「主契約の変更は本部のみ可能です」 rather than a hidden control.
2. **Given** the 主契約変更 sheet, **Then** the current plan is shown read-only, the destination list excludes the current plan, choosing one shows the before → after monthly price with the difference, and an informational note states that the change applies from the 1st of next month.
3. **Given** the 個別会費調整 card, **Then** each adjustment row shows 期間 (month range) / 調整後金額 / 事由 / 設定者 / 状態 (適用中 · 適用予定 · 終了), and an 適用中 row ending within 14 days additionally shows an 「あと{n}日」 badge.
4. **Given** the 調整を追加 sheet (Headquarter · System · Manager only), **Then** 開始月, 終了月, 調整後金額（税込） and 事由 are all required, 終了月 cannot precede 開始月, and the sheet has **no** 代理申請 block (Amendment T5; the prototype still shows one — prototype-gap-list #9). 調整後金額（税込） accepts **digits only** (integer yen, 0–1,000,000): any other character — letters, `e`, `+`, `-`, `.` — cannot be **typed** (full-width digits are folded to half-width); a **pasted / dropped / autofilled** value is never rewritten (`1200.0` must not become `12000`): it is kept as entered and validated at once, so a non-integer shows 「調整後金額は半角数字のみで入力してください」 under the field (review comment 2026-11-02), and the browser's native validation bubble (English 「Please enter a number.」) never appears; errors are the Japanese field messages.
5. **Given** an Observer opens 契約操作, **Then** オプション契約's ＋追加 button and the per-row 変更 / 解約 items are all disabled with the reason stated (tooltip / badge), and the operations stay refused when the underlying endpoints are called directly.
6. **Given** the member is 休会中, **Then** option add / change / cancel are disabled and the card shows 「休会中はオプション契約の変更・追加・解約ができません」; **given** 退会予定, the equivalent 退会 message; **given** an unpaid balance, add is blocked with 「未納金があるため、追加費用が発生するオプション追加はできません」.
7. **Given** the オプション追加 sheet, **Then** the start timing is a choice of 今日から / 翌月から; the 解約 sheet offers 即時解約 / 当月末で解約 (「翌月から利用不可」) with an optional reason; the 変更 sheet states the change applies from next month; all four application sheets (主契約変更 and the three option sheets) require 合意日時 + 合意方法.
8. **Given** any contract write succeeds, **Then** the sheet closes, a success toast appears, and the affected cards plus the head-up card refresh without a manual reload.
9. **Given** a 主契約変更 has been submitted, **Then** the 主契約 card shows the pending change (destination plan + effective month), read-only (cancel withdrawn 2026-09-09, second-application block removed 2026-09-16 — FR-013a).

---

### User Story 3 — Review privacy-gated and cross-system data (Priority: P2)

A staff member opens ボディーデータ for a member who has not opted in and is told so instead of seeing data; opens it for a consenting member and sees the latest summary, body composition, body measurements, the weight trend and the measurement history; opens トレーニング記録 and 紹介関係 and sees read-only records sourced from the mobile app and from the referral programme.

**Why this priority**: `A-01 FR-013` makes consent a hard privacy gate — getting it wrong exposes health data. Lower operational frequency than US1/US2, but non-negotiable correctness.

**Verification**: Load the tab for a member in each consent state (granted / not consented / refused) and confirm no body values are fetched or rendered in the latter two.

**Acceptance Scenarios**:

1. **Given** the member has not consented, **Then** ボディーデータ shows a lock message 「この会員はCRMへのボディデータ連携に同意していません。」 with the app-side remedy, and **no** body-data request is issued.
2. **Given** the member refused linkage, **Then** the tab shows 「会員が情報連携を拒否しています」 / 「ボディーデータは閲覧できません。」 in a destructive style.
3. **Given** consent is granted but there are zero measurements, **Then** the tab shows 「まだボディーデータの記録がありません」 rather than a summary of zeros.
4. **Given** consent is granted with records, **Then** the tab shows the 最新記録サマリー (with its measurement date), the 12 体組成 metrics, the 身体データ metrics with separate left/right values, a 推移グラフ switchable by metric, and the 測定履歴 table (latest 5, with 「全{n}件を表示」 opening the full list) with a per-row データソース badge.
5. **Given** トレーニング記録 / ボディーデータ / 紹介関係 / アンケート回答 / ポイント履歴, **Then** no create, edit or delete control is offered on the records themselves — they are read-only in the CRM. The only write is 紹介関係's ポイントを手動返還 (FR-044a).

---

### User Story 4 — Audit what changed (Priority: P3)

A manager opens 変更履歴 to see who changed what and when — attribute edits, option-contract operations, status transitions and the member's creation — in reverse-chronological order with before → after values.

**Why this priority**: Required by `A-01 FR-003` for attribute-edit accountability, but consulted occasionally rather than daily. Per the scope note, history data is seed-only in Phase 1.

**Verification**: Open 変更履歴 for a seeded member and confirm the rows, the paging, the status badge on ステータス changes and the 新規作成 badge on the creation row.

**Acceptance Scenarios**:

1. **Given** the 変更履歴 tab, **Then** the table columns are 更新日時 / 操作者 / 変更フィールド / 変更前 / → / 変更後, newest first.
2. **Given** a row whose changed field is ステータス, **Then** the 変更後 value renders as a member-status badge with the status colour; **given** the member-creation row, **Then** 変更後 renders as a 新規作成 badge.
3. **Given** a change record touching several fields at once, **Then** the timestamp and operator are shown once and the affected fields are listed under them.
4. **Given** more records than fit one page, **Then** pagination is offered and paging keeps the previous rows visible while loading.
5. **Given** no records, **Then** 「変更履歴はありません」 is shown.

### Edge Cases

- **Member outside the viewer's scope**: the detail request is rejected server-side with `403` and a permission message, which the screen shows in its error state rather than partially-rendered tabs (`A-01 FR-002`; umbrella P3, P4).
- **A single tab's data source fails while others succeed**: only that card shows its error state with retry — one failing card never blanks the tab (e.g. 家族会員 failing must not hide 個人情報).
- **A month with no data**: month-scoped tables (レッスン / オプション利用 / 1DayPass / ポイント) keep their MonthPicker (ポイント: also its 月次 / 期間指定 Select and range picker) outside the error boundary so the user can navigate to a month that has data even after a failed fetch. 入退館履歴 does the same with its date-range and store filters.
- **Zero family members**: the card shows 「家族会員の登録はありません」; when the member has a family group, the member themself appears in it with the 本人 badge.
- **Referrer / family link to a member the viewer cannot see**: following the link lands on the destination screen's standard access-denied state, not a broken card.
- **Point balance with no transactions this month**: the balance and 失効予定 still render; only the table is empty.
- **Body-data consent revoked between page load and tab open**: the tab must re-read the consent state from the member bundle rather than a cached "granted" from a previous member.
- **A fee adjustment whose 終了月 is in the past**: it stays visible as 終了 (history is not hidden), and the 「あと{n}日」 badge is suppressed.
- **Withdrawn member**: the tabs remain readable (history must not disappear on withdrawal); only the 契約操作 write controls are unavailable.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Tab shell (applies to all 10 tabs)

- **FR-001**: The screen MUST present the 10 tabs in the order listed in the overview table, with 基本情報 as the default.
- **FR-002**: The active tab MUST be reflected in the URL (`?tab=<slug>`, omitted for the default) and restored on reload; an unrecognised value MUST fall back to the default.
- **FR-003**: Each tab MUST render on a 60 / 40 two-column layout (基本情報: left 個人情報 → 入会情報 → 家族会員 → 動作確認用アカウント; right 来館情報 → ゲートストップ → 通知受信設定) — detail tables on the left, a sticky summary column on the right. The split holds at the 1024px floor (P15); ~~collapsing to a single column on narrow viewports~~. アンケート回答 and 変更履歴 are single-column by design.
- **FR-004**: Every data-backed card MUST distinguish four states: loading (skeleton), error (message + retry — the server's `userMessage` when the response carries one, P4), empty (stated reason), and data. A card MUST NOT render placeholder zeros in place of missing data.
- **FR-005**: Filter controls (MonthPicker, period Select, type Select) MUST remain interactive during loading and error states, so the user can always change the filter to recover.
- **FR-006**: Changing a filter or page MUST keep the previously loaded rows visible under a dimming/spinner indicator rather than reverting to a skeleton.

#### Tab 1 — 基本情報 (`A-01 FR-004`)

- **FR-007**: 個人情報 MUST show 生年月日 (with computed age), 性別 (badge), 住所 (postal code + prefecture/city/street + building composed into one line), 電話番号 and メールアドレス — all read-only for every role, with editing reached only from the header's 編集 button (every user whose position grants `can_edit_member` — P5; ~~HQ / System~~).
- **FR-008**: 入会情報 MUST show 入会日, 入会店舗, ブランド, 紹介者 (a link to the referrer's detail when present, `—` otherwise) and 入会キャンペーン (the campaign applied at enrollment, not today's contract campaign).
- **FR-009**: 家族会員 MUST list the family group exactly as the member bundle returns it — parent first (主会員 badge), then member number ascending, the viewed member marked 本人 and shown as plain text, the others as 「{name}（{id}）」 links — and state 「家族枠 残り{n}名（本人1名＋家族最大3名）」 from the server's remaining-slot count (hidden when it is null). The client MUST NOT prepend the member or compute the slots, and offers no add action.
- **FR-010**: 来館情報 MUST show 在籍期間 (`n年nヶ月`, `nヶ月` under one year — P11) and 最終来館日. ~~今月来館回数 and 累計来館回数~~ — **removed 2026-09-25** (P7).
- **FR-011**: The right column MUST show a **ゲートストップ** card (title with a jargon tooltip): 「設定なし」 when there is no gate stop; otherwise a destructive pattern badge, 端末メッセージ, 設定者 and 設定日時, and a 「解除...」 button (Headquarter / System / Manager / Staff; tooltip 「ゲートストップ解除の権限がありません」 otherwise) that opens the header's ゲートストップ解除 sheet. ~~入退館設定 (認証方法 / ICカード番号 / QRコード)~~ — **removed 2026-09-23** (Amendment T1).
  通知受信設定 MUST list the **10 fixed topics** in definition order (来館・スタンプ, ポイント, 称号, トレーニングリマインダー, 体組成測定リマインダー, コンディション記録, フォロー申請, お知らせ, キャンペーン, …) with an ON/OFF badge and the update date (`—` when the member never changed it), labelled 参照のみ with the helper 「会員がアプリ側で設定した通知種別ごとの受信ON/OFFです。管理者は参照のみ可能です。」. The data comes with the member bundle; brand- or store-level settings MUST NOT be substituted. The CRM MUST NOT offer any control to change it.
- **FR-011a (動作確認用アカウント)** — `A-01 FR-025`: the left column MUST show a 動作確認用アカウント card with the switch 「メンテナンス中もアプリを利用可能にする」 and its description, plus 「最終更新: {date}（{user}が{設定/解除}）」 from the latest set/release record (hidden when there is none). System / Headquarter can toggle it; toggling opens a confirm dialog (「動作確認用アカウントに設定しますか？」 / 「…を解除しますか？」) and, on success, a toast with 「履歴を見る」. Other roles see the switch disabled with the tooltip 「本部権限が必要です」 and a 参照のみ badge. Set and release are recorded in 変更履歴 (FR-046).

#### Tab 2 — 契約操作 (`A-01 FR-006`, `FR-007`, `FR-008`, `FR-019`)

- **FR-012**: 主契約 MUST show プラン名 / 月額 / 適用開始日 / 利用開始日 / 状態, plus an 「個別会費調整 適用中」 badge when an adjustment is currently active. While 休会中, 月額 shows the suspension fee with 「休会費（通常 {monthly}）」 and 状態 reads 「休会中（〜{end}）」. 利用開始日 is the basis of the 入会取り消し / 退会取り消し gates (header-actions FR-020, FR-026).
- **FR-013**: 主契約変更 MUST be restricted to Headquarter · System (other roles see the restriction reason), MUST show the current plan read-only, MUST exclude the current plan from the destination list, MUST show the resulting price difference, and MUST state that the change applies from the 1st of next month, and MUST require 合意日時 + 合意方法 (always-on 代理申請, Amendment T5) — stores MUST NOT be able to alter the plan's price.
- **FR-013a**: Submitting 主契約変更 MUST create a **pending plan-change application** (applied by a job at month start), not an immediate mutation. While one is pending, the 主契約 card MUST show the pending change (destination plan + effective month). ~~a second application MUST NOT be creatable while one is pending~~ — **Amended 2026-09-16**: removed. No requirement source defines it (`A-01 FR-006` and `FR-020` are both silent), and the dev API accepts a second booking, so how a pending change affects a later one is the backend's to decide. ~~MUST offer a way to cancel it~~ — **Amended 2026-09-09**: the cancel affordance is **withdrawn**. No requirement source defines it — `A-01 FR-006` specifies only 「変更先の主契約マスタを選択・翌月月初から適用」, the approved design doc models the application (`Member_Contract_Operations_PlanChangeApplication`) without a cancel operation, and qa-137 (client answer 2026-08-05) settled only the 予約 semantics plus `currentMainContract.pendingPlanChange`. The pending block stays read-only; see Out of Scope.
- **FR-014**: 個別会費調整 MUST list every adjustment (期間 by month, 調整後金額, 事由, 設定者, 状態; empty 「個別会費調整はありません」) and MUST flag an active adjustment ending within 14 days with 「あと{n}日」. Registration (「調整を追加」) MUST be restricted to Headquarter · System · Manager (tooltip 「本部・マネージャー権限が必要です」) and MUST require 開始月, 終了月, 調整後金額（税込） and 事由 (audit trail per `A-01 FR-006`), with 終了月 ≥ 開始月. 調整後金額（税込） MUST accept digits only (integer yen, 0–1,000,000 per `CreateFeeAdjustmentDto.adjustedAmount`): non-digit characters MUST be blocked while typing (full-width digits folded to half-width), while a pasted / dropped / autofilled value MUST NOT be rewritten — it is kept as entered and validated immediately (inline 「調整後金額は半角数字のみで入力してください」), because stripping characters silently changes the amount (`1200.0` → `12000`; review comment 2026-11-02) and the form MUST NOT surface the browser's native validation message — validation text is the Japanese field message only (bug report 2026-10-14; prototype `type="number"` deviation, PO-confirmed). ~~パターン / 金額・率~~ removed (Amendment T4). The sheet has **no** 代理申請 block (T5, pending qa-242).
- **FR-015**: オプション契約 MUST list each option (オプション名 / 月額 / 適用開始日 / 状態) with a per-row menu offering 変更 and 解約. The list is paged server-side at 25 rows per page (cancelled and used contracts are listed too, so it can pass 100) with the shared pager (「{n}件中 x-y 件を表示」, 前へ / 次へ) shown whenever there is more than one page; a page left empty by a cancellation steps back to the new last page.
- **FR-015a**: オプション契約の追加・変更・解約 MUST be restricted to Headquarter · System · Manager · Staff per `A-01` 権限マトリクス「オプション操作」; Observer (and Trainer, who cannot reach the screen at all) MUST see the restriction reason on a disabled control rather than a usable one. This is a **different** right from 個人情報変更 — Manager and Staff hold 「オプション操作」 but not 個人情報変更, so the member-edit permission MUST NOT be reused as the gate. Staff's `※職位に依る` granularity is resolved server-side; the client gates at role level only.
- **FR-016**: Option operations MUST be blocked, with the blocking reason stated on the card, when the member is 休会中 (all three), 退会予定 (all three), inside the cancellation-fee period, or has an unpaid balance (add only) — per `A-01`'s 制限事項.
- **FR-017**: オプション追加 MUST offer 今日から / 翌月から; 変更 MUST apply from the 1st of next month; 解約 MUST offer 即時解約 / 当月末で解約 (「翌月から利用不可」, sent as `next_month`) with an optional reason — per `A-01 FR-007` (label per prototype-gap-list #5). All three MUST require 合意日時 + 合意方法 (Amendment T5). The option pickers of オプション追加 and オプション変更 search the store's option master **server-side** (a partial match on option name or option code), page it 25 at a time by scrolling the list, and keep the chosen option (name, price, description, pro-rata flag) on the sheet when the search is changed or cleared afterwards; options the member already holds, and the option being changed, are left out of the list. "Already holds" means a **live** contract (`active` / `pending_start` / `pending_cancel` — the rows the server's duplicate check `E-OPT-005` counts); `cancelled` and `used` contracts do not count, so such an option can be added again. The held set is read on its own (every page of the member's live contracts, only while a sheet is open), never from the paged オプション契約 table, so it does not depend on which table page is shown. Until that read has finished the picker stays locked, and if it fails the picker stays locked with a 「再読み込み」 retry rather than offering options the member may hold. Whether `used` and `pending_cancel` should block a re-add is still to be confirmed with the PO. Two points are open and block parts of the flow: whether a pro-rata option may start on any chosen date (report N40 — the add is still on mock), and what オプション変更 means when the API cannot change `optionId` (report N16).
- **FR-017a** _(added 2026-11-19, ladyroom — Amendment T13–T16)_: The 主契約変更, オプション追加 and オプション変更 candidates MUST leave out every 主契約 / オプション whose sale condition (`genderCondition`, from its areas' 性別の条件 and, for a 主契約, its 性別制限) the member's 性別 does not meet; when none remains the select MUST be disabled with the reason; a mismatched request MUST be refused by the server (422 `E-ARE-003`).
- **FR-018**: キャンペーン適用 MUST list applied campaigns (キャンペーン名 / 特典内容 / 適用期間 / ステータス 適用中 · 終了), sorted active-first then newest-first, filterable by 全期間 / 適用中のみ / 終了済みのみ (empty 「該当するキャンペーンはありません」), and MUST be read-only (changes belong to `G-03`). There is no 適用予定 state.
- **FR-019**: 1DayPass購入履歴 MUST show 購入日 / 利用店舗 / 金額 / 有効期限 / 状態 for the selected month, making the ticket expiry explicit per `A-01 FR-019`.
- **FR-020**: The right column MUST show 契約サマリー (主契約名, 月額合計, 次回請求日, 決済方法, 未納金額 — highlighted when non-zero) and the 休会・退会履歴 strip with a link to the member's application list.

#### Tab 3 — 支払い履歴 (`A-01 FR-009`)

- **FR-021**: 入出金明細 MUST list 日付 / 種別 (売上・返金) / 内容 / 金額 (refunds negative and visually distinct) / 決済方法, filterable by **date** — the period Select (全期間 / 今月 / 先月 / 過去3ヶ月 / 過去6ヶ月 / **期間指定**; Amendment T12) — and by type (全種別 / 売上 / 返金). Choosing 期間指定 shows a **date-range picker** (「日付を選択」 placeholder; trigger shows `{YYYY}年{M}月{D}日 〜 {YYYY}年{M}月{D}日`); the window is inclusive on both ends and sent as JST `YYYY-MM-DD` `from` / `to`. Picking a start day filters that single day (`from` = `to`) until an end day is picked; with a full range already selected, a click moves the nearest end (shared calendar behaviour, as on 入退館履歴). Until a day is picked, 期間指定 behaves like 全期間 and the summary title reads `支払いサマリー（期間指定）`. There is no span limit. The range is held by the tab, not in the URL, and is kept when the user switches to a preset and back.
- **FR-022**: 請求一覧 MUST list 請求月 / 請求種別 (月次・都度) / 金額 / ステータス / 請求日, with the status vocabulary of `A-01 FR-009` (未確定 / 確定 / 入金済み / 未回収 / 貸倒) shown as **one** badge. Where the source models confirmation and collection separately, the single displayed status MUST be derived server-side — collection state taking precedence once the bill is confirmed — so the client never re-implements the precedence rule.
- **FR-023**: 支払いサマリー MUST aggregate over the ledger's selected period — naming that period in its title (for 期間指定, the picked dates as `YYYY/MM/DD〜YYYY/MM/DD`) — and show 売上合計, 返金合計, 差引合計, 最終入金日 and 決済方法.
- **FR-024**: Both tables MUST paginate server-side; changing the period, the picked date range or the type filter MUST reset to page 1.

#### Tab 4 — 利用履歴 (`A-01 FR-010`)

- **FR-025**: 入退館履歴 MUST list one row per gate event — 日時 / 店舗 / 種別 (入館・退館 badge) / 認証方法 — paginated and filterable by **date range** and by **store** (`A-01 FR-010`; Amendment T11). ~~scoped to a selected month~~ — the month picker is replaced by the date-range filter.
- **FR-026**: レッスン予約履歴 MUST list 日付 / レッスン名 / 担当 / 状態 for the selected month, covering the four states `A-01 FR-010` requires (参加 / 欠席 / キャンセル / 予約). The labels follow the prototype: **受講済み / キャンセル / 予約中**; the 欠席 state, which the prototype never renders, keeps the label 欠席.
- **FR-027**: オプション利用履歴 MUST list 日付 / 店舗 / オプション名 / 回数 for the selected month.
- **FR-028**: 利用状況 MUST show 今月来館回数 with the month-over-month delta, よく利用する時間帯, よく利用する店舗, レッスン予約数（今月） with its delta, and オプション利用数（今月） with a per-option breakdown; a metric the source cannot supply MUST be omitted rather than shown as 0.
- **FR-029**: The tab MUST NOT offer any entry/exit editing; detailed device-level logs stay outside the CRM's normal display per `A-01 FR-010`.

#### Tab 5 — ポイント履歴 (`A-01 FR-011`)

- **FR-030**: The tab MUST show one unified history table (日付 / 種別 獲得・消費 / 事由 / ポイント数 signed and colour-coded) for the selected period (FR-030-a), with 日付 and 種別 sortable in both directions and the current sort indicated.
- **FR-031**: The card title MUST use the brand's point name resolved dynamically from the brand master (JOYFIT → ENJOYポイント, FIT365 → ベアレージポイント) — the name MUST NOT be hard-coded in the client.
- **FR-030-a**: The tab MUST offer the period filter that `A-01 FR-011` asks for (「期間フィルタリング（月次・任意期間指定）に対応」): a mode Select with 月次 (default) and 期間指定. 月次 shows the month picker (default: the current month). 期間指定 shows a date-range picker (placeholder 「日付を選択」); the range is applied as soon as it has a start and an end date. The shared picker treats the first click as a one-day range (start = end) and a second click extends it, so a window is never half-open; clearing the range (clicking the same single day again) returns to the month filter. Both bounds are inclusive and sent as `from` / `to` (`YYYY-MM-DD`, operator's local date). Changing the mode, the month or the range returns the table to page 1 and keeps the current sort; the sort covers the whole filtered window. The mode Select and the pickers stay outside the error boundary (FR-005). An empty window reads 「この月のデータはありません。」 in 月次 and 「この期間のデータはありません。」 in 期間指定. Prototype `0a73739` offers the month picker only — the date range is **ahead of the prototype** (source: `A-01 FR-011`, decided 2026-10-15; earlier month-only decision of 2026-09-29 withdrawn).
- **FR-032**: ポイントサマリー MUST show the current 残高, the selected period's (month or range) 期間内獲得合計 and 期間内消費合計, and the 失効予定 amount with its expiry date (server-supplied; hidden when the brand has no expiry). The tab MUST be read-only; the manual refund lives on 紹介関係 (FR-044a).

#### Tab 6 — アンケート回答 (`G-04 FR-004`)

- **FR-033**: The tab MUST list the member's survey responses newest-first as selectable cards showing アンケート名, a 種別 badge (ライフサイクル / オペレーション) and the response timestamp. The list MUST come from a single member-scoped read — the client MUST NOT fan out over every questionnaire to assemble it (a member-scoped endpoint is a tracked backend dependency; the mock route stands in until it ships).
- **FR-034**: Selecting a response MUST navigate to that response's detail screen; with no responses the tab MUST state 「回答なし」.

#### Tab 7 — トレーニング記録 (`A-01 FR-012`)

- **FR-035**: The tab MUST list 実施日 / ルーティン名 / 実施時間 / 消費カロリー in reverse-chronological order, filterable by 全期間 / 今月 / 過去3ヶ月 / 過去1年.
- **FR-036**: 記録サマリー MUST name the selected period and show 実施回数, 合計時間, 合計消費カロリー and 最多ルーティン.
- **FR-037**: Records MUST be read-only (the mobile app is the system of record); with no records in the selected period the tab MUST say so explicitly, and a source-system failure MUST be reported with a retry affordance per `A-01 FR-012` 異常系. The empty message keeps the prototype's period-scoped wording 「この期間にトレーニング記録がありません」 (resolved 2026-07-29 — the prototype wins on UI copy).

#### Tab 8 — ボディーデータ (`A-01 FR-013`)

- **FR-038**: The tab MUST be consent-gated with three presentation states — **granted** → full display; **not consented (未同意)** → lock message inviting the member to opt in from the app; **refused (拒否)** → destructive message stating the member declined. In the two non-granted states the client MUST NOT request or render any body value. The three states MUST come from an explicit consent status supplied by the server — an HTTP error alone cannot distinguish 拒否 from 未同意 (tracked backend dependency).
- **FR-039**: When granted, the tab MUST show 最新記録サマリー (measurement date + 体重 / BMI / 体脂肪率 / 骨格筋量 / 基礎代謝量) and 体組成データ with the 12 metrics of `A-01 FR-013` block 1 (体重, BMI, 体脂肪率, 体脂肪量, 内臓脂肪指数, 骨格筋指数(SMI), 骨格筋量, 推定骨量, 水分量, 基礎代謝量, 除脂肪量, 四肢除脂肪量), labelled as the Body Planner link.
- **FR-040**: 身体データ MUST show the block-2 measurements (首周り, 肩幅, 胸囲, 腹囲, 上腕（左/右）, 前腕（左/右）, 腰回り, ヒップ, 太もも（左/右）, ふくらはぎ（左/右） — left and right as separate values, qa-240) plus 身長 (self-reported, not part of the measurement history), labelled as the 3DScanner / manual-input link.
- **FR-041**: 測定履歴 MUST list the newest 5 measurements (測定日 / データソース badge / 体重 / 体脂肪率) under a 「全{n}件」 badge, with 「全{n}件を表示」 opening the full list in a side sheet; with zero measurements it MUST show 「まだボディーデータの記録がありません」. A **推移グラフ** MUST be switchable by metric (qa-240: all 12 体組成 metrics; the prototype offers 体重 / 体脂肪率 / 骨格筋量 — prototype-gap-list #7). Body data MUST be read-only in the CRM. Open backend items: the chart has no dedicated series endpoint (report N43), and the full list cannot be merged correctly across its two paginated arrays (N44); paging of the full list is on hold (PO, 2026-09-16).

#### Tab 9 — 紹介関係 (`A-01 FR-S001`)

- **FR-042**: When the member joined through a referral, the tab MUST show a 紹介経由 flag banner; 紹介者情報 MUST show the referrer as a link to their detail, or state that there is no referrer.
- **FR-043**: 招待実績 MUST list the members this member referred (氏名 / 会員ID / 入会日 / 特典付与 badge 付与済み・未付与) with a count badge, each row navigating to that member's detail; with none, the tab MUST say so.
- **FR-044**: 紹介サマリー MUST show 招待人数（合計）, 特典付与済み, 特典未付与 and the 入会経路 (紹介経由 / 通常入会).
- **FR-044a (ポイント手動返還)** — `A-01 FR-S001`: the tab MUST offer 「ポイントを手動返還」 with the note 「紹介特典などのポイント値引き分が自動返還されなかった場合に、手動で返還します。」, enabled for Manager / Headquarter / System only (tooltip 「ポイント手動返還はManager以上の権限が必要です」). It opens a confirm dialog 「ポイントを手動返還しますか？」 requiring 返還ポイント (≥ 1) and 返還理由 (max 1000); on success the toast 「ポイントを返還しました」 / 「{n}pt を {会員名}様に返還しました」 appears and the refund is recorded in 変更履歴.

#### Tab 10 — 変更履歴 (`A-01 FR-003`)

- **FR-045**: The tab MUST list change records newest-first with 更新日時, 操作者, 変更フィールド, 変更前 → 変更後; a multi-field change MUST group under one timestamp/operator.
- **FR-046**: A ステータス change MUST render its new value as a member-status badge; the member-creation record MUST render as a 新規作成 badge; a missing before/after value MUST render as `—`. 動作確認用アカウント set/release (FR-011a) and reservation-penalty application/release MUST appear as rows, labelled in Japanese (the backend vocabulary for `test_account_*` is still missing — report).
- **FR-047**: The list MUST paginate. Per the scope note, change-history records are **seeded only** in Phase 1 — the tab MUST NOT offer create / update / delete of history records.

### Key Entities

- **Member detail bundle**: the head-up payload the tabs read shared context from — personal info, brand, primary store, enrollment date/campaign, referral, last visit, current main contract (with active fee adjustment / suspension / pending withdrawal), gate stop, constraints (`hasUnpaidFee`, `inCancellationPeriod`) and the body-data consent state.
- **Main contract**: the member's plan — plan master, monthly fee, start date, status. Changed only by HQ, effective from next month's 1st.
- **Fee adjustment**: a period-bounded override of the monthly fee — start/end month, pattern (amount / discount amount / discount rate / markup amount), value, mandatory reason, operator, derived status (適用中 / 適用予定 / 終了). Billing effect executes in `F-01`.
- **Option contract**: an add-on — option master, monthly fee, start date, status (有効 / 翌月適用 / 解約予定 / 解約済み / 使用済み — one badge per API `contractStatus`: `active` / `pending_start` / `pending_cancel` / `cancelled` / `used`; 使用済み is a consumed per-use ticket and, like 解約済み, offers neither 変更 nor 解約), with add / change / cancel timing rules.
- **Campaign application**: a campaign applied to this member — name, benefit, period, status. Read-only here; managed in `G-03`.
- **1Day/1TimePass purchase**: a per-visit ticket — purchase date, store, amount, expiry, usage status.
- **Payment transaction / Billing**: the money in and out (date, type, description, amount, method) and the monthly/one-off bills (month, type, amount, status, billing date).
- **Access log / Lesson booking / Option usage**: the member's activity records feeding 利用履歴, sourced from `B-01`, `D-01` and the option masters.
- **Point balance & transaction**: brand-scoped balance plus earn/spend records with reason and date, and the upcoming expiry.
- **Survey response**: a submitted questionnaire answer (survey name, type, submitted at) owned by `G-04`.
- **Training record**: a mobile-app session (date, routine, duration, calories) owned by `Y-08` / `Y-09`.
- **Body data**: consent state + measurement records (body composition and body measurements) with a data source, owned by the mobile app / `E-02` devices.
- **Referral relationship**: inbound (who referred this member) and outbound (whom they referred, with reward status) plus aggregate stats.
- **Change-history record**: timestamp, operator, source, action and the field-level before/after values.

---

## API Contract Mapping

**Rewritten 2026-09-23.** All 10 tabs read the real API. The endpoint per card, its status and the open backend items (`N…`) are kept in [`report.md`](../../../api-integration-output/member-detail/report.md) (sections Tab 01 … Tab 10) and are not duplicated here. The 2026-07-29 table (design doc v0.8.0 against the mock routes) is in git history.

Open items that change what this spec can promise:

| Item      | Tab · card                                      | Effect                                                                                       |
| --------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| N40       | 契約操作 · オプション追加 (pro-rata start date) | The add is still on mock until the client decides between prototype and API                  |
| N16       | 契約操作 · オプション変更                       | The API cannot change `optionId`; the business meaning of 変更 is open                       |
| qa-242    | 契約操作 · 個別会費調整                         | Whether the sheet needs 代理申請 (prototype yes, API no)                                     |
| N43 · N44 | ボディーデータ · 推移グラフ / 測定履歴          | No series endpoint; the full history cannot be merged across two paginated arrays            |
| —         | 変更履歴                                        | No Japanese label yet for `test_account_enabled` / `test_account_disabled`                   |
| —         | 基本情報 · 称号 / 連携解除                      | Real endpoints exist, but the prototype has no place for them (scope question to Kyota / BA) |

---

## Gap Analysis — current implementation vs. target

### Prototype / requirement behaviour not yet matched

| ID       | Tab              | Gap                                                                                                                                                                                                                                                                         |
| -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P-01** | 契約操作         | 契約サマリー's 次回請求日 renders as 「毎月{n}日」 (a billing day) while the prototype shows a concrete next-billing **date** (`2026/04/01`). Decide what the field promises.                                                                                               |
| **P-02** | 契約操作         | 1DayPass 状態 labels: prototype uses 利用済み / 期限切れ; the project uses 使用済み / 未使用 / 期限切れ. Wording differs, and neither covers the design doc's `active` / `pending_start` / `cancelled`.                                                                     |
| **P-03** | 契約操作         | キャンペーン適用期間 is rendered as a full date range; the prototype shows a month-granularity range (`2025/07〜09`).                                                                                                                                                       |
| **P-04** | 利用履歴         | レッスン状態 labels: prototype 受講済み / キャンセル / 予約中 vs project 参加済み / 欠席 / キャンセル / 予約済み. **Resolved 2026-07-29: the prototype wins** — relabel to 受講済み / キャンセル / 予約中, keeping 欠席 for the `absent` state the prototype never renders. |
| **P-05** | トレーニング記録 | Empty message is 「この期間にトレーニング記録がありません」 (prototype) while `A-01 FR-012` specifies 「まだトレーニング記録がありません」. **Resolved 2026-07-29: the prototype wins** — the period-scoped wording stays, so no change.                                    |
| **P-06** | ボディーデータ   | **Resolved 2026-09-15 (qa-240)** — metric-switchable chart over all 12 metrics; the prototype `0a73739` has 3 (prototype-gap-list #7). ~~`A-01 FR-013` asks for a **metric-switchable** trend chart; prototype and project both ship a fixed 体重推移 chart only.~~         |
| **P-07** | ボディーデータ   | The prototype keeps the 測定履歴 table mounted with an in-table empty row; the project promotes "zero measurements" to a tab-level empty state (deliberate — a summary of zeros would otherwise render). Confirm the deviation is accepted.                                 |
| **P-08** | 紹介関係         | **Superseded 2026-09-23** — the prototype now has the refund on this tab (FR-044a). ~~`A-01 FR-S001` places ポイント手動返還 in this tab; the prototype implements it inside the 休会申請 sheet, so the tab has no refund control (Q6).~~                                   |
| **P-09** | 変更履歴         | Neither prototype nor project exposes the `source` / date-range filters the design doc offers for the 5-table UNION.                                                                                                                                                        |
| **P-10** | 利用履歴         | The prototype passes an unused `onGateStopRelease` hook into the usage tab (dead code). The project does not wire it — intentional; gate-stop release is reached from the 基本情報 ゲートストップ card and the header.                                                      |
| **P-11** | 基本情報         | The prototype's mock carries 緊急連絡先 (emergency contact) but no card renders it, and `A-01 FR-004` does not list it. Out of scope unless the PO adds it.                                                                                                                 |
| **P-12** | 支払い履歴       | 入出金明細 filters by preset period only in the prototype (no custom range); `A-01 FR-009` asks for 日付 filtering. **Amended 2026-10-14 (T12):** the project adds 期間指定 + a date-range picker; the prototype is not yet updated.                                        |

### API-contract gaps

**Superseded 2026-09-23.** G-01 … G-22 compared the mock routes with design doc v0.8.0. The tabs now run on the real API, so open API issues are tracked in [`report.md`](../../../api-integration-output/member-detail/report.md); the table is in git history.

### Already ahead of the prototype (keep as-is)

- Every card has explicit loading / error / empty states with retry; the prototype renders static mock arrays only.
- Server-side pagination on 入出金明細, 請求一覧, 入退館履歴, レッスン予約履歴, オプション利用履歴 and 変更履歴; the prototype has disabled 前へ/次へ stubs.
- Filters stay mounted outside the error boundary, so a failed fetch never traps the user in a dead month/period.
- ポイントサマリー totals are computed over the selected month or date range; the prototype computes them over the whole dataset regardless of the filter (a prototype bug that must not be copied).
- 契約操作 blocks option operations during the cancellation-fee period in addition to the prototype's three conditions.
- Family capacity comes from the server-provided remaining-slot count rather than a hard-coded figure.
- 変更履歴 groups multi-field changes under one timestamp/operator instead of repeating the header per field.
- 主契約変更 excludes the current plan by master ID rather than by display name.

---

## Tab 3 / Tab 4 detail rules (merged 2026-09-23 from the retired sub-specs)

The 支払い履歴 and 利用履歴 tabs used to have their own sub-specs, `payment-history/spec.md` (2026-04-22) and `usage-history/spec.md` (realigned 2026-07-28). Both were folded in here and deleted. The rules below are the ones those sub-specs held that FR-021 → FR-029 do not already state. Their original IDs (`FR-009-a…d`, and `UH-1…UH-6` for the former usage `FR-1…FR-6`) are kept so test cases keep resolving. **Where a rule here conflicts with FR-021 → FR-029, the FR wins.** Those conflicts are listed at the end.

### 支払い履歴 (former `payment-history/spec.md`)

- **FR-009-a 入出金明細**: rows are sorted newest date first. Sales show as `¥9,900`; refunds show as `-¥2,200` in the destructive colour. The 種別 badge is default for 売上 and secondary for 返金. The period (including 期間指定's date range) and type filters are those of FR-021 and combine with AND.
- **FR-009-b 請求一覧**: five statuses with the prototype's colours (PO decision 2026-07-28): 入金済み = success, 確定 = info, 未確定 = warning, 未回収 = destructive, 貸倒 = destructive. 未確定 means not yet confirmed or invoiced. 未回収 means past the due date and still being collected. 貸倒 means judged uncollectable and written off. The 請求種別 badge is default for 月次 and outline for 都度.
- **FR-009-c 支払いサマリー**: a right-hand column, sticky. The items shown are the ones in **FR-023** (5 items over the selected period; PO decision 2026-07-28). When an unpaid or uncollected amount is shown and is greater than 0, it is highlighted in the destructive colour.
- **FR-009-d Access**: the tab is always visible and fully usable, including for a member who has only option contracts. A member outside the viewer's scope is rejected with a permission error.
- **Empty and error states**:
  - No transactions: 「入出金履歴はありません」.
  - No billing: 「請求履歴はありません」.
  - A filter with no result: 「該当する履歴はありません」.
  - A failed section shows an error message with a manual retry.
  - The prototype defines none of these; they are project decisions.
- **Page size**: 25 rows per page on both tables — the project-wide `PAGE_SIZE` shared by every paginated tab (decision 2026-09-29).
- **Constraints**:
  - Billing from another brand is never shown.
  - The payment methods (SBPS / JACCS / 現金 …) come from configuration, not hard-coded values.
  - Display is the same for both brands.
  - The tab is read-only.

### 利用履歴 (former `usage-history/spec.md`)

- **UH-1 入退館履歴**:
  - A **date-range picker** (「期間を選択」 placeholder; trigger shows `{YYYY}年{M}月{D}日 〜 {YYYY}年{M}月{D}日`) selects the period, defaulting to the **current calendar month** (first to last day). Picking only a start day filters that single day. The filter is inclusive on both ends and sent as JST `YYYY-MM-DD` `from` / `to`.
  - The span is limited to **12 months** (the API rejects a longer `from`–`to`). While the end day is still to be picked, days more than 12 months from the start are disabled; if a pick would still make the span longer (only possible when a full range is already selected), no request for that span is sent and the selection restarts from the day just clicked — which then filters that single day until the end day is picked.
  - A **store** searchable select (「全店舗」 default, search placeholder 「店舗名で検索...」, empty 「該当する店舗がありません」) lists the stores from the store master, searched on the server and paged 20 at a time by scrolling. Choosing a store sends `storeId`; 「全店舗」 clears it. It does not depend on the header store scope — a member can visit several stores. The store and date filters combine (AND).
  - Changing either filter resets to page 1 and keeps the previous rows visible (dimmed) while fetching.
  - Both filters stay usable while the card shows an error, so the user can change them to recover.
  - The filter is not kept in the URL.
  - The 種別 badge shows 「入館」 in the info colour with a log-in icon, and 「退館」 in the default colour with a log-out icon.
  - A visit still in progress shows only its 入館 row. There is no 滞在中 column; in-building status belongs to B-01.
  - An empty result shows 「該当するデータはありません。」 (was 「この月のデータはありません。」 while the filter was month-only).
- **UH-2 レッスン予約履歴**: the same month picker, pagination and empty behaviour as UH-1. The state labels are the ones in **FR-026**.
- **UH-3 オプション利用履歴**: 回数 is right-aligned as `{count}回`. The month picker, pagination and empty behaviour are the same as UH-1.
- **UH-4 利用状況**:
  - A right-hand card, sticky.
  - 前月比 is hidden when the difference is 0. A positive difference is shown in the success colour, a negative one in the destructive colour.
  - よく利用する時間帯 and よく利用する店舗 are hidden when the source has no value.
- **UH-5 入退館設定 is not on this tab**: ~~it lives on 基本情報~~ — the card was removed from the screen on 2026-09-23 (Amendment T1). Gate stop is shown on 基本情報's ゲートストップ card and released from there or from the header.
- **UH-6 Error handling**: each card loads and fails on its own. Loading shows a skeleton; an error shows a message with a manual retry. One failing card never blanks the tab.
- **認証方法 vocabulary** (入退館履歴 only): `qr` = QRコード, `nfc` = ICカード, `face` = 顔認証, `manual` = 手動解錠. The B-01 入退館履歴 screen labels `nfc` 「NFCカード」; the keys match, so only the wording differs, and that is still open.
- **Permissions**: Headquarter, Manager, Staff and Observer can view; Trainer cannot. The tab has no write actions.

### Conflicts between the retired sub-specs and this spec

| Topic                | Retired sub-spec                                                               | This spec (wins)                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 支払いサマリー items | 今月請求額 / 未回収合計 / 最終入金日 / 決済方法                                | FR-023: 売上合計 / 返金合計 / 差引合計 / 最終入金日 / 決済方法, over the selected period                                                                                                            |
| レッスン状態 labels  | 参加済み / 欠席 / キャンセル / 予約済み                                        | FR-026: 受講済み / 欠席 / キャンセル / 予約中                                                                                                                                                       |
| 請求ステータス       | 4 values (no 確定), 未確定 = info, 未回収 = warning                            | FR-009-b above: 5 values, prototype colours (PO 2026-07-28)                                                                                                                                         |
| 支払い履歴 page size | 50 (clarification 2026-04-22) and 10 (未解決事項 #2), contradicting each other | 25 per page on both tables — the project-wide `PAGE_SIZE`, same as the other tabs (decision 2026-09-29; neither `A-01` nor the prototype sets a page size)                                          |
| FR-009-d scope       | tab always accessible for option-only members                                  | Unchanged, but `A-01 FR-009` says a store with option contracts sees **only that member's billing**. The two are compatible only if the store-scoped filter applies inside the tab. Confirm with PO |

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 10 tabs render their full card set for a fully-populated member with no console errors and no placeholder values, in 100% of tab visits.
- **SC-002**: A staff member can answer any single-tab question (last visit, unpaid amount, point balance, latest weight, who referred them) within 15 seconds of opening the member detail, without leaving the screen.
- **SC-003**: 100% of data-backed cards show a distinguishable loading, error-with-retry and empty state; 0% show a summary computed from missing data.
- **SC-004**: For a member without body-data consent, 0 body-data values are transmitted to or rendered by the client — verified by inspecting network traffic.
- **SC-005**: 100% of blocked contract operations (休会中 / 退会予定 / 解約手数料期間中 / 未納金) are disabled with the reason visible before the user opens the sheet.
- **SC-006**: Every successful contract write refreshes the affected cards and the head-up card with 0 manual page reloads.
- **SC-007**: Switching a month/period filter never blanks the table: the previous rows remain visible in 100% of filter changes.
- **SC-008**: The active tab survives a browser reload and a shared URL in 100% of cases.

---

## Assumptions

- The head-up card, its banners and the header surfaces are owned by [`../header-actions/`](../header-actions/spec.md) and the umbrella [`../spec.md`](../spec.md); this spec only consumes the member bundle they share.
- ~~Where the design doc has no endpoint, the project keeps its current mock route.~~ Updated 2026-09-23: every card reads the real API; the only mutation still on mock is オプション追加 (N40), and the 利用状況 card moves to the new `usage-summary` endpoint (N23).
- Aggregate cards (契約サマリー, 支払いサマリー, 利用状況, 記録サマリー, 紹介サマリー, ポイントサマリー) are computed server-side and consumed as-is, so their figures cannot disagree with a paginated table on screen.
- Status vocabularies that are richer in the API than in the UI (billing, lesson booking, 1Day pass) are **mapped down** for display in Phase 1, not dropped from the data model. For billing the mapping is server-side (FR-022); for the others the client maps for display only.
- The brand point name is resolved server-side and echoed to the client; the client never maps brand → point name itself.
- Month-scoped tables default to the current month; period-scoped tables default to 全期間 — matching the prototype's `useMonthScope` and default Select values.
- Tab slugs (`contracts`, `body-data`) may differ from the prototype's internal keys (`contract`, `body`); the slug is an internal URL contract, not a user-visible label.
- The 60/40 split and the sticky right column are prototype layout decisions carried over verbatim.
- Role gating uses the project's existing permission constants wherever `A-01`'s role matrix already maps onto one. 「オプション操作」 was the exception: no existing constant carried it (the member-edit right maps to 「個人情報変更」, which Manager and Staff do **not** hold), so a dedicated `members.option-contract-operate` permission was added rather than borrowing a near-miss — see FR-015a. Any future column of the matrix without a matching constant is expected to follow the same rule.

---

## Out of Scope for Phase 1

- **Head-up card, banners and the header surfaces** — `../header-actions/` (formerly feature 021) and `../spec.md`.
- **Change-history writes**: per the scope note, history is seed-only — no create / update / delete flow for history records, and no history-write UI on any tab.
- **会員情報編集フォーム (member-form)** — feature `020-member-form`; the tabs are read-only for personal information.
- **Campaign management** (`G-03`), **survey authoring / aggregation** (`G-04`), **lesson management** (`D-01`), **sales & billing operations** (`F-01`) — the tabs read from or link to them but do not manage them.
- **Entry/exit detail export** (`A-01 FR-010`: 「必要時に出せる形（エクスポート等）で保持」) — no export control on the 利用履歴 tab in Phase 1.
- ~~**Metric-switchable body-data trend chart**~~ — back in scope 2026-09-15 (qa-240, FR-041).
- **Paging of the 測定履歴 full list** — on hold by PO (2026-09-16) until N44 is solved.
- **入退館設定 (認証方法 / ICカード番号 / QRコード)** — removed from the screen (qa-121).
- **称号 area and 連携解除 button** — real endpoints exist but the prototype has no place for them; waiting on Kyota / BA.
- **1DayPass purchase creation** — the tab is a purchase _history_ view only.
- **Suspension / withdrawal / transfer approval flows** (`A-02` / `A-03`) — the 休会・退会履歴 strip only links out to the application list.
- **Emergency-contact display** (P-11) — present in prototype mock data, rendered nowhere, absent from `A-01 FR-004`.
- **Bulk main-contract change** (`A-01 FR-020`) — a member-list bulk action, not a tab.
- **Cancelling a pending plan-change application** (withdrawn 2026-09-09) — the 主契約 card only _displays_ the pending application. No requirement source (`A-01 FR-006`, the approved design doc, qa-137) defines the operation, so neither the UI control nor a backend endpoint request stands. Re-open only if a later spec asks for it (FR-013a).

---

## Traceability

| UI element (prototype)                                         | Requirement source                                                                   | Spec requirement                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------- |
| Tab bar (10 tabs, ordered)                                     | `A-01 FR-003`（タブ領域の切り替え表示）                                              | FR-001, FR-002                   |
| 個人情報 card                                                  | `A-01 FR-004` 表示項目                                                               | FR-007                           |
| 入会情報 card (紹介者 link)                                    | `A-01 FR-004` + `FR-S001` 入会経路                                                   | FR-008                           |
| 家族会員 card                                                  | `A-01` 前提条件（本人1+家族3名）                                                     | FR-009                           |
| 来館情報 card                                                  | `A-01 FR-001` 最終来館日 / `FR-010`                                                  | FR-010                           |
| ゲートストップ card (replaces 入退館設定)                      | `A-01 FR-014`                                                                        | FR-011                           |
| 動作確認用アカウント card                                      | `A-01 FR-025`                                                                        | FR-011a                          |
| 通知受信設定 card (参照のみ, 10 topics)                        | not in `A-01` — prototype-driven, app-owned (`I-03` FR-011)                          | FR-011, Q1                       |
| 主契約 card + 変更 sheet                                       | `A-01 FR-006`                                                                        | FR-012, FR-013                   |
| 個別会費調整 card + sheet                                      | `A-01 FR-006` 個別会費調整（期間指定・事由必須・HQ/Manager）                         | FR-014                           |
| オプション契約 card + 追加/変更/解約 sheets                    | `A-01 FR-007` + 制限事項（休会中・退会前・未納金）+ 権限マトリクス「オプション操作」 | FR-015, FR-015a, FR-016, FR-017  |
| キャンペーン適用 card                                          | `A-01 FR-008`                                                                        | FR-018                           |
| 1DayPass購入履歴 card                                          | `A-01 FR-019`（Should）                                                              | FR-019                           |
| 契約サマリー / 休会・退会履歴 strip                            | `A-01 FR-006` 表示 + `A-03` linkage                                                  | FR-020                           |
| 入出金明細 / 請求一覧                                          | `A-01 FR-009`                                                                        | FR-021, FR-022                   |
| 支払いサマリー                                                 | not in `A-01` — prototype-driven aggregate                                           | FR-023                           |
| 入退館履歴 / レッスン予約履歴                                  | `A-01 FR-010`（`B-01`・`D-01` data）                                                 | FR-025, FR-026                   |
| オプション利用履歴 / 利用状況                                  | not in `A-01` — prototype-driven                                                     | FR-027, FR-028                   |
| ポイント履歴 table + 残高                                      | `A-01 FR-011`（残高上部表示・獲得/消費・期間フィルタ・ブランド別名称）               | FR-030, FR-030-a, FR-031, FR-032 |
| アンケート回答履歴                                             | `G-04 FR-004`（out-of-document reference）                                           | FR-033, FR-034, Q3               |
| トレーニング記録 + 記録サマリー                                | `A-01 FR-012`                                                                        | FR-035, FR-036, FR-037           |
| ボディーデータ 同意ゲート                                      | `A-01 FR-013` 同意確認（プライバシー保護）                                           | FR-038                           |
| 最新記録サマリー / 体組成 / 身体データ / 測定履歴 / 推移グラフ | `A-01 FR-013` データブロック1・2・履歴一覧・推移グラフ + qa-240                      | FR-039, FR-040, FR-041, P-06     |
| 紹介経由フラグ / 紹介者情報 / 招待実績 / 紹介サマリー          | `A-01 FR-S001`                                                                       | FR-042, FR-043, FR-044           |
| ポイント手動返還 (紹介関係)                                    | `A-01 FR-S001`                                                                       | FR-044a                          |
| 変更履歴 table                                                 | `A-01 FR-003` 変更履歴タブ                                                           | FR-045, FR-046, FR-047           |

---

## Q&A / Clarification Needed

**All eight questions are resolved** (2026-07-29). Q1, Q5 and Q6 were later overtaken by the backend and the prototype — see their notes. No `[NEED CLARIFICATION]` markers remain; the open items are listed under API Contract Mapping.

### ~~Q1 — 通知受信設定: where does member-level notification opt-in live?~~ — RESOLVED 2026-07-29

**Overtaken 2026-08-10**: the backend put 通知受信設定 in the member detail response, keyed by topic (FR-011). ~~**Answer: A — keep the card, request a member-scoped endpoint.** A member-level notification opt-in read is a tracked backend dependency under `I-03`; the card stays read-only on its mock route until the endpoint ships, and the brand/store `resolved` endpoint must not be substituted (FR-011, G-02).~~

### ~~Q2 — 請求ステータス: one badge or two axes?~~ — RESOLVED 2026-07-29

**Answer: A — one derived badge.** Collection state takes precedence once the bill is confirmed, and the derivation onto 未確定 / 確定 / 入金済み / 未回収 / 貸倒 is owned server-side, not re-implemented in the client. Specifying that mapping is a backend request (FR-022, G-12).

### ~~Q3 — アンケート回答: is there a member-scoped responses endpoint?~~ — RESOLVED 2026-07-29

**Answer: A — request a member-scoped endpoint.** `GET /admin/members/{memberId}/questionnaire-responses` is a tracked backend dependency under `G-04`; the tab stays in Phase 1 scope and runs on its mock route until the endpoint ships. A client-side fan-out over questionnaires is explicitly rejected (FR-033).

### ~~Q4 — ボディーデータ: two consent states or three?~~ — RESOLVED 2026-07-29

**Answer: A — three states.** granted / 未同意 / 拒否 stay distinct so staff know whether inviting the member to opt in is appropriate. The backend must expose an explicit consent status (a tracked dependency); until then the state comes from the member bundle. See FR-038 and G-20.

### ~~Q5 — Are the member-history endpoints backend-ready?~~ — RESOLVED 2026-07-29

**Overtaken**: the endpoints are live and every tab is integrated (report). ~~**Answer: design-only — build the mocks we need.** The member-history endpoints are treated as not-yet-implemented, so every tab reads from the project's mock API in Phase 1 and any mock route a tab still needs is created in this feature. The design-doc contracts stay recorded in [contracts/mock-api.md](./contracts/mock-api.md) as the Phase 2 target. No UI consequence — this settles integration sequencing only.~~

### ~~Q6 — ポイント手動返還: which surface owns it?~~ — RESOLVED 2026-07-29

**Overtaken 2026-09-23**: the prototype `0a73739` puts the refund on 紹介関係, as `A-01 FR-S001` says (FR-044a). ~~**Answer: A — follow the prototype.** The manual point refund stays inside the 休会申請 sheet (feature `021`). ポイント履歴 and 紹介関係 are read-only and gain no refund control (FR-032, FR-043). `A-01 FR-S001`'s placement of the refund on the 紹介関係 tab is stale and should be corrected in the requirement document.~~

### ~~Q7 — Which wording wins where the prototype and `A-01` disagree?~~ — RESOLVED 2026-07-29

**Answer: the prototype wins.** レッスン状態 is relabelled to the prototype's 受講済み / キャンセル / 予約中; the `absent` state, which the prototype never renders, keeps 欠席 so all four `A-01 FR-010` states stay expressible (FR-026, gap P-04). The training-records empty message keeps the prototype's period-scoped 「この期間にトレーニング記録がありません」 — no change (FR-037, gap P-05).

### ~~Q8 — 主契約変更: immediate change or approval application?~~ — RESOLVED 2026-07-29

**Answer: A — plan-change application.** Submitting creates a pending record applied by a job at month start; the 主契約 card shows the pending change. ~~A second application is blocked while one is pending.~~ (removed 2026-09-16, FR-013a) See FR-013a, API Contract Mapping row 6, and G-04. ~~the 主契約 card … offers a cancel path … (a cancel endpoint must be requested from the backend)~~ — the cancel path was this session's own addition, not something any requirement source asked for, and was **withdrawn 2026-09-09** (FR-013a).
