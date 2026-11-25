# Feature Specification: Leave & Withdrawal Management (A-03)

**Feature Branch**: `024-leave-withdrawal-management`
**Created**: 2026-08-05
**Status**: Draft
**PO Spec**: `A-03` — 休会・退会管理一覧 (Leave & Withdrawal Management List), document version `260901_v3`
**Source**: UI prototype (`src/pages/leave-list.tsx`, `src/pages/leave-detail.tsx`) + Requirement spec `crm/requirements/A-03.md`
**Spec source**: `dx-fitness/fitness-spec` @ `5c391cf` (2026-10-05) — `crm/requirements/A-03.md` (`260901_v3`; originally specified against `b53dd30`, 2026-08-03)
**UI source**: `dx-fitness/fitness-crm-ui` @ `47423ec` (design update 9/17, `1767864`) — `src/pages/leave-list.tsx` (1005 L), `src/pages/leave-detail.tsx` (613 L) (originally specified against `e99646c`, 2026-08-05)
**Last synced with prototype**: 2026-10-05 — see Clarifications › Session 2026-10-05 and Q-17
**Last Updated**: 2026-10-07 — aligned with the real-API integration (list, 月別ビュー, detail, cancellation all on the backend; the mock-first gaps are closed — see _Backend API Contract Mapping_ and _Assumptions_).
**Backend API design**: fitness-dx CRM API `0.8.0`, tag `Suspension & Withdrawal Management` (inside `x-tagGroups` → backend contract is ready)
**Input**: User description: "Create spec for screen A-03 — Phase 1 only; history is seed-only (no create/update/delete of history); use the backend API design at https://all-docs.dn30t5gp2gjp.amplifyapp.com/crm/ as the API basis."

---

## Scope

### In Scope (Phase 1)

Both prototype screens are marked `phases: ["1"]` in the prototype's screen map (`src/pages/map/screens.ts` L1717-L1740):

| Screen       | Route slug     | Source requirement            |
| ------------ | -------------- | ----------------------------- |
| Leave list   | `leave-list`   | A-03 FR-001                   |
| Leave detail | `leave-detail` | A-03 FR-002 (detail sections) |

Covered source requirements: **FR-001** (list display / filtering) and **FR-002** (withdrawal cancellation, including the approval-flow Timeline, the proxy-application section, and the related-information section).

### Out of Scope for Phase 1

| Item                                                                                                                    | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A-03 FR-003 臨時休会の設定 (emergency temporary recess)**                                                             | The source spec (A-03 L153) explicitly places this on a **separate screen** — `emergency-suspension`, identical to A-01 FR-022 — and states it must **not** be mixed into the A-03 list ("A-03一覧には混在させない"). The prototype confirms this: the sidebar exposes `emergency-suspension` as its own HQ-only menu entry (`shared-sidebar.tsx` L114), and neither A-03 page references it. The backend endpoints for it (`POST/GET /api/v1/admin/bulk-temporary-recess-jobs*`) therefore belong to that feature, not this one.                                                                                |
| **変更履歴 (change-history) tab on the detail screen, and rendering `statusHistories` anywhere**                        | Confirmed out of scope by clarification on 2026-08-05 (Q-14). The prototype screen map still advertises a two-tab detail with a `変更履歴` tab (`screens.ts` L1732-L1738), but the implemented `leave-detail.tsx` renders a **single, tab-less** 申請情報 view (L443-L444) and ignores its `activeTab` prop (L390). The map entry is stale — it also lists 承認 / 却下 / 復帰処理 actions that the code reassigns to the member-detail screen and the System batch (L132-L134). The backend's `statusHistories[]` is therefore consumed by no Phase 1 surface; the 休会・退会履歴 strip covers the history need. |
| **History mutation (create / update / delete)**                                                                         | Per the feature request, suspension/withdrawal history data is **seed-only**. The screens are read-only over history; `statusHistories` and the 休会・退会履歴 strip are rendered from seeded data. No history write operations are in scope.                                                                                                                                                                                                                                                                                                                                                                    |
| **Application creation / approval / rejection**                                                                         | Suspension and withdrawal applications are raised from A-01-01 (member detail → status change). The detail screen's own code comment states approval/rejection is "会員詳細側の責務" and withdrawal execution is System-automated (`leave-detail.tsx` L132-L134). A-03 only reads applications and cancels withdrawals.                                                                                                                                                                                                                                                                                          |
| **Withdrawal execution batch**                                                                                          | A-03 L82 assigns the due-date withdrawal execution and the suspension-end processing to the **System** actor (batch). The screen only reflects the resulting state.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Free-text search on the list**                                                                                        | Removed by the 9/17 prototype update — the toolbar comment reads 「フリーワード検索は Phase 1 対象外のため撤去（絞り込みは詳細フィルターのみ）」. The backend endpoint never offered one either. The earlier request for a server-side search parameter (Q-05) is withdrawn; FR-019 / FR-019a are retired. See Q-17.                                                                                                                                                                                                                                                                                             |
| **Current-step highlight on the 承認フロー timeline, and the backend's `recess_start` / `recess_end` suspension steps** | Deferred by clarification on 2026-08-05 (Q-03). The timeline follows the prototype: two steps for suspensions, three for withdrawals, with completion derived from the application state. **Known gap**: A-03 L144 mandates "現在のステップをハイライト表示" and the backend already returns `state: "current"` on every step, so this is a deliberate deferral pending a UI treatment — not a rejected requirement. Revisit before the feature is considered complete against A-03.                                                                                                                             |
| **処理完了 rows in the list**                                                                                           | Dropped by clarification on 2026-08-05 (Q-10). A-03 L128 names four display states and the backend's `displayStatus` carries exactly those four, explicitly excluding `completed` / `cancelled` applications from the unified list. The prototype's fifth state, its filter option, and its two seeded rows are not built. 処理完了 remains valid on the **detail** screen.                                                                                                                                                                                                                                      |

---

## Clarifications

### Session 2026-10-30 — 合意日時 shows the time entered on A-01 (不具合 No4)

Defect: a 合意日時 entered as 2026/10/09 00:00 on A-01 on a UTC+7 browser was shown here as 2026/10/09 02:00. The detail was right to display JST; the A-01 input read the picked time in the browser's timezone. Fixed on the input side (A-01 header-actions FR-005, clarified 2026-10-30). FR-065 now states the round-trip.

### Session 2026-10-09 — 退会取り消し gate follows the 職位 flag `can_cancel_withdrawal` (Q-18)

Defect: a Staff user whose 職位 had `can_apply_transfer_suspension` on but `can_cancel_withdrawal` off saw an enabled 退会取り消し, confirmed the dialog and got 403 `E-WDR-100` 「退会申請を取り消す権限がありません。」. Cause: both entry points were gated by the generic withdraw permission, which was mapped to the 申請系 flag instead of the flag the backend actually checks. Resolution: a dedicated gate on `can_cancel_withdrawal` (FR-006, FR-078); the withdraw permission that gates _filing_ a withdrawal (A-01-01) is unchanged. See **Q-18**.

### Session 2026-10-05 — sync with prototype 9/17 and A-03 `260901_v3`

The screens were re-aligned with the latest prototype (`leave-list.tsx` / `leave-detail.tsx` @ `47423ec`) and A-03 v3. Rule applied: everything the prototype now shows is built; everything the code had that the prototype does not show is removed. Details and the few deliberate exceptions are in **Q-17**.

- **Added**: 種別 column (list); 個別会費調整中 badge on list rows, on 月別ビュー rows/tooltips and in the detail header (A-03 FR-001 v3 — reverses Q-12); 一覧 / 月別ビュー toggle with the month grid and its 表示 filter (A-03 FR-001 v3 「月別ビュー・休会退会履歴」 — reverses Q-11); mandatory 取り消し理由 in both cancellation dialogs (A-03 FR-002 v3); 利用開始日 in the detail's 申請情報 for withdrawals; 休会中 hand-off (meta line + 「会員詳細で休会を解除する」) on the detail status card.
- **Removed**: the free-text search box (prototype: 「Phase 1 対象外のため撤去」 — reverses Q-05); the in-panel 「すべてクリア」 button (the banner's 条件をクリア remains); the application-number badge in the detail header (申請ID stays in 申請情報); the 取り消し済み audit block on the detail status card (FR-079a).
- **Kept although the prototype differs** (data/contract rules, not presentation): five-brand filter (Q-04), page size default 25 / options 25-50-100 (Q-06), real 退会手数料 (Q-07), the A-01-01 member drill-down filter (`member_id`), and the error/loading states (Q-09).

### Session 2026-08-07

- Q: FR-063 required the approval step to show 承認待ち "while the application is still awaiting approval" — but is there such a state on A-03? → A: No — **drop the branch** (option 1). Step 2 is always complete and captioned with the approval timestamp. Rationale: the incomplete branch was inherited from the prototype, whose mock `LEAVE.status` union carries a `申請中` value (`leave-detail.tsx` L40, L208, L227-L232) that exists nowhere else — A-03's own requirement never mentions it, the contract's `LeaveStatus` has six values and none of them means "awaiting approval", and A-03 L67-L70 defines the flow as 申請 on A-01-01 → **then** the case appears on A-03 as 休会予定 / 退会予定. A prototype detail had been raised to a MUST that no data could ever satisfy. The implementation had already resolved it the same way, so nothing changes on screen. Surfaced by test case TC-031 in `tests/cases/`, which had no reachable state to exercise.

### Session 2026-08-05

- Q: Is 月別ビュー (the monthly heatmap) in Phase 1? → A: No — defer it out of Phase 1 (option D). Ship the 一覧 list view alone; drop the view toggle, the heatmap table, the heatmap-only 表示 filter, and the nine requirements that described them. Rationale: the heatmap is a whole-set aggregation (group by member, then resolve a priority state per month) that cannot be computed correctly from one page of a flat, paginated application list — a member with applications spread across pages would render wrong month states, not just missing rows. Deferring also moots Q-02. _(**Superseded 2026-10-05** by A-03 `260901_v3` and the 9/17 prototype — see Q-17.)_
- Q: Where does the member head-up card get its data, given that A-03's member block carries only four fields? → A: Request an expanded member block inline on A-03's two detail responses (option A). 会員ID displays `member.memberNumber`, 申請ID displays `applicationNumber`, and the UUIDs are used only for routing. The head-up card keeps every field of the reviewed design, fed from the A-03 detail response rather than a second round-trip: the block gains the name kana, the legacy member code (the screen's 「旧No」), the member type, the primary contract name, and the face-photo URL. Noted alternative not taken: `GET /api/v1/admin/members/{memberId}` already exists and is described as the "OOUI head-up bundle", so the same data could be composed with a second query — inlining was preferred to keep the detail screen on a single request. Mock-first applies; see Assumptions.
- Q: Is the screen map's 変更履歴 tab stale metadata, or should Phase 1 restore it? → A: Stale — no tab (option A). The detail stays the single, tab-less 申請情報 view that V0 implements deliberately (the code comment says 「申請情報（タブなし・直接表示）」). The backend's `statusHistories[]` is not rendered in Phase 1. Rationale: `e99646c` is the reviewed design, and the map entry is demonstrably out of date — it also advertises 承認 / 却下 / 復帰処理 actions that the code explicitly reassigns to the member-detail screen and the System batch. The 休会・退会履歴 strip already covers the need to see a member's past suspensions and withdrawals.
- Q: Should the list keep its search box, given that A-03 does not ask for one and the backend has no search parameter? → A: Keep it and request a server-side search parameter (option C). The search MUST be evaluated server-side across the whole filtered set, never client-side over the loaded page — a page-local search silently reports "no results" for rows on other pages. Until the real endpoint gains the parameter, the project's mock API implements it (see Assumptions — mock-first policy). It matches on application number and member name, per the V0 placeholder 「申請ID・会員名で検索」. _(**Superseded 2026-10-05** by A-03 `260901_v3` and the 9/17 prototype — see Q-17.)_
- Q: How should the 関連情報 card handle 退会手数料 (hardcoded to `—` in V0 despite the backend supplying it) and 未消化レッスン (absent from the suspension detail response)? → A: Fix both (option B). 退会手数料 renders the withdrawal's actual `fee` snapshot instead of `—`; 未消化レッスン stays on **both** application types, which requires the backend to add `unusedLessonCount` to the suspension detail's `relatedInfo`. Rationale: A-03 L146 lists the four figures without distinguishing type, the backend already computes the count for withdrawals so extending it to suspensions is symmetric rather than new logic, and unused lessons are business-relevant for a member about to pause. **This introduces a backend dependency** — recorded under Assumptions.
- Q: Where should the 個別会費調整中 badge get its data, given that no A-03 response carries it? → A: Drop the badge from A-03 in Phase 1 (option A). FR-014 and FR-056 are deleted and their identifiers retired. Rationale: 個別会費調整 is a real, specified concept — A-01 FR-006 defines it and explicitly places it on the A-01-01 member-detail screen (「OOUI思想に基づき本画面に配置」), and the backend implements it (`POST`/`DELETE /api/v1/admin/members/{memberId}/fee-adjustments`) — but the data is exposed only through `Member_Management_CurrentMainContractDetail`, the member-detail response. None of A-03's four responses carry it, and rendering it per list row would require a member-detail call per row. A-03 itself never asks for the badge, so no backend change is requested; the badge stays on A-01-01 where it is specified. _(**Superseded 2026-10-05** by A-03 `260901_v3` and the 9/17 prototype — see Q-17.)_
- Q: Should the ブランド filter expose the backend's five brands or the prototype's two brand groups? → A: Expose all five (option A) — `Joyfit`, `Joyfit24`, `JoyfitYoga`, `JoyfitPlus`, `Fit365` — and filter on the record's own brand value via a single `brandEnum` parameter. The prototype's store-name-prefix matching is a defect and is not reproduced. Rationale: the endpoint's `brandEnum` accepts one value, not a list, so a "JOYFIT" group spanning four brands cannot be expressed in one request without a backend contract change; the V0 two-option list reflects impoverished mock data rather than a deliberate grouping decision. No API change requested.
- Q: What shape should the 予定日 filter take, given that the prototype's control is inert and the source spec asks for a range? → A: Keep the prototype's four presets and wire them to real filtering (option A). Each preset resolves to an inclusive scheduled-date range on the JST calendar — 今月 = first through last day of the current month, 来月 = first through last day of the next month, 今年 = 1 January through 31 December of the current year, 全期間 = no date bound — sent as `scheduledFrom` / `scheduledTo`. Rationale: presets are ranges, so this satisfies A-03 L131's 予定日レンジ while preserving the reviewed UI; the current V0 state is a defect (a control with no effect), not a design to preserve.
- Q: Should the 承認フロー timeline follow the prototype (2 suspension steps / 3 withdrawal steps) or the backend (4 / 3), and should the current step be highlighted? → A: Follow the prototype on both counts (option C). Suspension renders 申請 → 休会承認; withdrawal renders 申請 → 退会承認 → 退会処理実行. The backend's `recess_start` / `recess_end` steps are not rendered, and the current-step highlight is **deferred** — not rejected — because the visual treatment has not been designed yet. Consequence to accept and revisit: A-03 L144's "現在のステップをハイライト表示" is knowingly unmet in Phase 1, even though the backend already returns `state: "current"` per step at no extra cost. Reopen once a UI treatment exists.
- Q: Should 処理完了 appear as a fifth state in the list? → A: No — drop it from the list (option A). The list carries exactly the four states the source spec and the backend agree on (休会予定 / 休会中 / 退会予定 / 退会処理待ち); the ステータス filter loses its 処理完了 option, the list badge map drops the plain-secondary variant, and no completed applications are seeded into the list. 処理完了 remains a valid **detail-screen** state, since closed applications stay readable through their detail endpoints and are reached from A-01-01 or the 休会・退会履歴 strip. Rationale: the source requirement (A-03 L128) and the backend contract (`displayStatus` has four values; `completed` / `cancelled` applications are explicitly excluded from the unified list) agree independently, against a prototype-only convenience.

---

## User Scenarios _(mandatory)_

### User Story 1 - Survey suspension and withdrawal cases across the store scope (Priority: P1)

A store staff member, a manager, or an HQ operator opens 休会・退会管理 to see, in one table, every member who is scheduled to suspend, currently suspended, scheduled to withdraw, or waiting for withdrawal processing. They read each row's member, brand, store, type, state, application date, scheduled date, end date, outstanding arrears and whether an individual fee adjustment is in force, then narrow the table down with type / state / store / brand / scheduled-period filters and page through the result. When they need to see how a member's suspensions and withdrawals line up over time, they switch to 月別ビュー.

**Why this priority**: This is the whole reason the screen exists (A-03 L48, L125). Without the list there is no place to survey suspension/withdrawal cases at all, and every other story on this screen is reached through it.

**Verification**: Sign in as a Staff user, open 休会・退会管理, and confirm the table lists the seeded applications with all documented columns and the 個別会費調整中 badge on the affected members. Switch to 月別ビュー and back. Apply a type filter and a state filter, confirm the row count badge, the "全 N 件中 M 件を抽出中" banner, and the table body all update consistently. Clear the filters and confirm the full scoped list returns. Sign in as a Trainer and confirm the screen shows the permission-denied card instead.

**Acceptance Scenarios**:

1. **Given** seeded suspension and withdrawal applications exist within the user's store scope, **When** the list loads, **Then** each row shows 会員ID, 会員名, ブランド, 店舗名 (HQ view only), 種別, ステータス, 申請日, 予定日, 終了日, and 未納金, in that column order.
2. **Given** a suspension row, **When** it renders, **Then** 終了日 shows the suspension end month; **given** a withdrawal row, **then** 終了日 shows `—`.
3. **Given** a row whose outstanding arrears is greater than zero, **When** it renders, **Then** 未納金 shows the amount as `¥{amount}` in the destructive colour with medium weight; **given** zero arrears, **then** it shows `¥0` in the muted colour.
4. **Given** the member of a row has an individual fee adjustment in force, **When** the row renders, **Then** a 個別会費調整中 badge (warning tone) is shown under the member name; **given** none is in force, **then** no badge is shown. The toolbar has **no** free-text search box.
5. **Given** the user opens 詳細フィルター and selects a 種別 / ステータス / 店舗 / ブランド value, **When** the filter applies, **Then** only matching rows remain, the filter button shows the active-filter count badge, and the active control is highlighted.
6. **Given** at least one filter is active (or the list is narrowed to one member from A-01-01), **When** the table renders, **Then** the filter-result banner shows "全 {scoped total} 件中 {filtered count} 件を抽出中" followed by a `・`-joined summary of the active conditions and a 条件をクリア action.
7. **Given** the filters exclude every row, **When** the table renders, **Then** the filtered empty state ("条件に一致する休会・退会がありません") is shown with a 条件をクリア button.
8. **Given** no applications exist in scope at all, **When** the table renders, **Then** the plain empty state ("休会・退会がまだありません") is shown with no clear action.
9. **Given** the signed-in user has the Trainer role, **When** they open the screen, **Then** the table is not rendered and a card reading "この画面を表示する権限がありません" / "休会・退会管理はトレーナーロールでは参照できません。" is shown instead.
10. **Given** a single store is selected in the header scope, **When** the list renders, **Then** the 店舗名 column is hidden, the in-screen 店舗 filter is hidden, and any previously selected in-screen store filter is reset to 全店舗.
11. **Given** the list is shown, **When** the toolbar renders, **Then** 詳細フィルター sits on the left and an 一覧 / 月別ビュー toggle on the right, with 一覧 selected by default.
12. **Given** the user selects 月別ビュー, **When** the view renders, **Then** one row per member shows 会員ID, 会員名, ブランド, 店舗名 (HQ view only) and the 個別会費調整中 badge, followed by seven month columns (`YYYY/MM`, the current month and three months either side); each month that a member's application covers shows that application's state badge (退会処理待ち abbreviated 退会待ち), and an uncovered month shows `—`.
13. **Given** 月別ビュー is shown, **When** the user hovers a month badge, **Then** a tooltip shows the application ID, its type, ステータス, 申請日, 予定日, 終了日 (when present), 未納金 (when greater than zero) and the 個別会費調整中 badge (when applicable); **when** they click the month, **then** the application detail opens; **when** they click the member cell, **then** the member detail opens.
14. **Given** 月別ビュー is shown and 詳細フィルター is open, **When** the panel renders, **Then** it additionally offers a 表示 filter (表示: 全て（休会・退会） / 表示: 休会のみ) that counts as an active filter and appears in the banner summary as 「表示: 休会のみ」.

---

### User Story 2 - Open one application and read its full context (Priority: P1)

From the list, an operator clicks a row and lands on the application detail. There they read the application facts (ID, type, start/end, usage start date for withdrawals, reason, applicant, timestamp), see how far the application has progressed on an approval-flow timeline, check who applied on the member's behalf and how consent was obtained, review the adjacent business figures (suspension fee, campaign, unused lessons, arrears), and scan the member's month-by-month suspension/withdrawal history.

**Why this priority**: A-03 FR-002 (L144-L146) requires the Timeline, the proxy-application section, and the related-information section as first-class content of this screen. Together with the list this forms the read-only MVP: an operator can answer "what is going on with this member" without any write action.

**Verification**: Open a seeded suspension application from the list. Confirm the member head-up card, the 申請情報 card, the 承認フロー timeline, the 代理申請情報 card, the 関連情報 card, and the 休会・退会履歴 strip all render with the documented fields. Open a seeded withdrawal application and confirm the type-dependent labels and the third timeline step change accordingly. Open a non-proxy application and confirm the 代理申請情報 card is absent.

**Acceptance Scenarios**:

1. **Given** an application detail is opened, **When** the page header renders, **Then** it shows a back link "休会・退会管理に戻る", the title "{member name} さんの{type}申請", a state badge (plain secondary badge when the state is 処理完了, otherwise an outline badge with a coloured status dot), and — when the member has an individual fee adjustment in force — a 個別会費調整中 badge whose term carries the glossary tooltip. No application-ID badge is shown in the header.
2. **Given** the detail loads, **When** the member head-up card renders, **Then** it shows the member photo, name, name kana, member ID, legacy member number, store, member type badge, primary contract badge, and a 会員詳細を開く action that navigates to the member detail.
3. **Given** a **suspension** application, **When** the 申請情報 card renders, **Then** the two date fields are labelled 休会開始月 and 休会終了月 and both show a value; **given** a **withdrawal** application, **then** they are labelled 退会予定日 and 終了日, 終了日 shows `—`, and a full-width 利用開始日 field shows the usage start date followed by 「（利用開始前のため退会取り消し可）」 or 「（利用開始後のため退会取り消し不可）」.
4. **Given** a **suspension** application, **When** the 関連情報 card renders, **Then** the first figure is labelled 休会費 and shows `¥{fee}/月`; **given** a **withdrawal** application, **then** it is labelled 退会手数料 and shows that withdrawal's own fee amount, not a placeholder.
5. **Given** either application type, **When** the 関連情報 card renders, **Then** it also shows 適用キャンペーン, 未消化レッスン (`{n}回`), and 未納金 (`¥{amount}`, destructive colour when greater than zero).
6. **Given** the application was raised by proxy, **When** the detail renders, **Then** a 代理申請情報 card shows 代理申請者, 合意日時, and 合意方法; **given** it was not raised by proxy, **then** that card is not rendered.
7. **Given** the application detail renders, **When** the 承認フロー card is shown, **Then** step 1 申請 is always complete and captions `{applied timestamp} {proxy applicant when proxied, otherwise the applicant}`; step 2 is labelled 休会承認 or 退会承認 by type and is complete unless the state is 申請中 (captioned 承認待ち while incomplete, otherwise the last-updated timestamp); and step 3 退会処理実行 is rendered **only for withdrawals**, complete only when the state is 処理完了 (captioned 処理完了, otherwise 待機中).
8. **Given** the detail renders, **When** the 休会・退会履歴 strip is shown, **Then** it presents a rolling 12-month window centred on the current month with per-month state badges (休会中 / 休会予定 / 退会予定), the related application ID under each marked month, a 今月 badge on the current month, a period label "{window start} 〜 {window end}", previous/next period controls, a 今へ戻る control when the current month leaves the window, a colour legend, and a 他の申請一覧を見る link back to the list.
9. **Given** the right-hand column renders, **When** the status card is shown, **Then** it shows the state-specific tone, icon and label, plus a "最終更新: {timestamp}" line, and it remains sticky while the left column scrolls.
10. **Given** an application whose state is 休会中, **When** the status card renders, **Then** it adds the line 「休会の解除（早期復帰）は会員詳細のステータス変更から行います」 and a full-width 「会員詳細で休会を解除する」 button that opens the member detail.

---

### User Story 3 - Cancel a scheduled withdrawal (Priority: P2)

A member changes their mind before their usage start date. A staff member finds the withdrawal row, triggers 退会取り消し either from the list's row menu or from the detail's status card, enters the mandatory cancellation reason and confirms in a dialog, and the withdrawal application is cancelled and the member returns to a normal (valid) state. When the cancellation is not permitted — the usage start date has already passed, or the withdrawal batch has taken the row — the action is visibly disabled with the reason.

**Why this priority**: This is A-03 FR-002's core write action and the only mutation the screen owns. It is P2 rather than P1 because it depends on the list and detail already existing, and because it is an occasional corrective operation rather than the daily task.

**Verification**: As a Staff user, open the row menu of a 退会予定 row that is still cancellable, run 退会取り消し, confirm the dialog, and verify the success toast and the member's restored state. Repeat on a 退会予定 row that is no longer cancellable and confirm the disabled menu item and its tooltip. Repeat on a 退会処理待ち row and confirm the different tooltip. Confirm no row menu at all appears on suspension rows. Sign in as an Observer and confirm the action is blocked.

**Acceptance Scenarios**:

1. **Given** a row of type 退会, **When** the row renders, **Then** a row-action menu is available; **given** a row of type 休会, **then** no row-action menu is rendered.
2. **Given** a 退会予定 row that is still cancellable, **When** the user opens the row menu, **Then** an enabled 退会取り消し item (with an undo icon) is shown to System users and to Headquarter / Manager / Staff users whose 職位 grants `can_cancel_withdrawal`.
3. **Given** a 退会予定 row that is no longer cancellable, **When** the user opens the row menu, **Then** the 退会取り消し item is disabled and its tooltip reads "利用開始日以降のため取り消し不可".
4. **Given** a 退会処理待ち (or otherwise non-退会予定) withdrawal row, **When** the user opens the row menu, **Then** the 退会取り消し item is disabled and its tooltip reads "退会処理が開始されているため取り消し不可".
5. **Given** the user has the Observer or Trainer role, **When** they reach the row menu, **Then** the 退会取り消し item is non-actionable and carries a permission badge; the same holds for a Headquarter / Manager / Staff user whose 職位 lacks `can_cancel_withdrawal`.
6. **Given** the user activates 退会取り消し from the list, **When** the confirmation dialog opens, **Then** it is titled "退会取り消しを実行しますか？" and states "**{member name}**（{member ID}）の退会申請を取り消します。取り消し後、会員ステータスは有効（通常）に戻ります。この操作は記録されます。", followed by a required 取り消し理由 textarea (placeholder 「取り消し理由を入力してください...」, helper 「操作履歴に記録されます（500文字以内）」, max 500 characters), with キャンセル and 取り消しを実行する actions; 取り消しを実行する stays disabled while the reason is empty or whitespace only.
7. **Given** the confirmation dialog is open with a reason entered, **When** the user confirms, **Then** the withdrawal is cancelled with that reason and a success toast reads "{member name} の退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。"; **when** the user cancels or dismisses, **then** nothing changes and the entered reason is discarded.
8. **Given** an application detail whose state is 退会予定, **When** the status card renders, **Then** a 退会取り消し button is shown to System / Headquarter / Manager / Staff (for the latter three only when their 職位 grants `can_cancel_withdrawal`, FR-006) and is disabled with an explanatory tooltip when the member's usage start date has already arrived.
9. **Given** an application detail whose state is 処理完了, **When** the status card renders, **Then** no action button is shown and the text "処理が完了しています" is displayed instead.
10. **Given** an application detail whose state is none of 退会予定, 休会中 or 処理完了, **When** the status card renders, **Then** no action area is shown at all.
11. **Given** the detail's 退会取り消し button is activated, **When** the confirmation dialog opens, **Then** it is titled "退会を取り消しますか？" and states "{member name} さんの退会予定を取り消します。取り消し後、会員ステータスは有効（通常）に戻ります。", followed by the same required 取り消し理由 field as the list, with キャンセル and 取り消す actions; on success the toast reads "{member name} さんの退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。".
12. **Given** the cancellation is rejected by the server because the usage start date has passed or the batch already owns the row, **When** the response returns, **Then** the user sees the server's user-facing message and the row's state is unchanged.

### Edge Cases

- **Header store scope changes while an in-screen store filter is set** — switching the header from the HQ (all-stores) view to a single store must reset the in-screen 店舗 filter to 全店舗 so the two scopes cannot contradict each other; the header scope always wins.
- **Header scope is not a filter** — the header's single-store scope must be excluded from the filter-result banner summary and from the active-filter count; only the in-screen store filter counts.
- **The current page exceeds the filtered page count** — after filtering narrows the result, the effective page must clamp to the last available page rather than showing a blank table.
- **One member holds several applications at once** — a member may have both a suspension and a withdrawal on file. The list is per application, so that member legitimately occupies more than one row; the rows must not be merged or de-duplicated.
- **A withdrawal is cancelled by another operator first** — a second cancellation attempt on the same application must surface the server's conflict outcome rather than reporting success.
- **The usage start date is not yet fixed** — a member with no usage start date counts as "not started", so the withdrawal remains cancellable.
- **The scheduled date arrives between page load and the cancel action** — cancellability must be re-evaluated by the server at the moment of the action, not trusted from the loaded row.
- **月別ビュー across pages** — a member's applications may sit on different pages of the paginated list; 月別ビュー must evaluate the whole filtered set, never one page, or it would show wrong month states.
- **月別ビュー overlapping applications** — when several of one member's applications cover the same month, the cell shows the most consequential state, in the order 退会予定 → 退会処理待ち → 休会中 → 休会予定. A withdrawal occupies exactly the month of its due date.
- **Zero arrears vs. missing arrears** — the list always renders a value in 未納金 (`¥0` when there is nothing outstanding); the column is never blank.

---

## Requirements _(mandatory)_

### Functional Requirements

#### A. Access, roles and store scope

- **FR-001**: The system MUST allow the 休会・退会管理 screen to be viewed by System, Headquarter, Manager, Staff, and Observer users, and MUST deny it to Trainer users.
- **FR-002**: When a Trainer opens the screen, the system MUST render only a centred card reading "この画面を表示する権限がありません" with the supporting line "休会・退会管理はトレーナーロールでは参照できません。", and MUST NOT render the table, filters, or any action.
- **FR-003**: The system MUST restrict the visible applications by the caller's store scope — System and Headquarter see all stores and brands, Manager sees their managed stores, and Staff and Observer see their own store. An application's store is the store of its contract.
- **FR-004**: When the header store scope selects a single store, the system MUST hide the 店舗名 column, MUST hide the in-screen 店舗 filter, and MUST reset any previously selected in-screen store filter back to 全店舗.
- **FR-005**: The system MUST show the in-screen 店舗 filter only when the header scope is the all-stores view **and** the user can access two or more stores.
- **FR-006**: The system MUST allow 退会取り消し to be executed by System, Headquarter, Manager, and Staff users only, and MUST present the action as non-actionable (with a permission indicator) to Observer and Trainer users. _(Amended 2026-10-09, Q-18.)_ For Headquarter, Manager and Staff the role tier is necessary but not sufficient: the signed-in user's 職位 MUST also grant the position flag `can_cancel_withdrawal` (shown as 退会申請の取消 on the 職位 form and returned by `GET /auth/crm/me`). The gate MUST read exactly that flag — not `can_apply_transfer_suspension` or any other 申請系 flag. A permitted-role user whose 職位 lacks the flag gets the same non-actionable presentation as Observer / Trainer, and the cancel request is never sent. System is never narrowed by position flags.

#### B. List display

- **FR-007**: The system MUST show the page title "休会・退会管理" together with a count of the currently filtered rows.
- **FR-008**: The system MUST render the list view with the columns, in this order: 会員ID, 会員名, ブランド, 店舗名 (all-stores view only), 種別, ステータス, 申請日, 予定日, 終了日, 未納金 (right-aligned), and an unlabelled row-action column.
- **FR-008a**: The system MUST render 種別 as an outline badge — info tone for 休会, destructive tone for 退会 — using the same colouring as the detail's 申請情報「種別」 (FR-058). _(Added 2026-10-05, Q-17.)_
- **FR-009**: The system MUST render 会員ID as the member's **member number** (e.g. `JF-0005678`) in a monospaced muted style, and 会員名 as an underline-on-hover link that opens the member detail without also triggering the row's own navigation. Internal record identifiers MUST NOT be displayed — they are used only for navigation.
- **FR-010**: The system MUST render the state as an outline badge with a leading coloured dot for each of the four list states — 休会予定 (warning), 休会中 (info), 退会予定 (destructive), 退会処理待ち (warning). Completed and cancelled applications MUST NOT appear in the list at all, so no fifth badge variant is required here (the detail screen keeps its own 処理完了 presentation — see FR-055 and FR-076).
- **FR-011**: The system MUST show 予定日 as the suspension start month (`YYYY/MM`) for suspension rows and as the withdrawal due date (`YYYY/MM/DD`) for withdrawal rows. The same formats apply wherever the dates reappear (月別ビュー tooltip, detail 申請情報).
- **FR-012**: The system MUST show 終了日 as the suspension end month (`YYYY/MM`) for suspension rows and as `—` for withdrawal rows.
- **FR-013**: The system MUST show 未納金 as `¥{amount}` — in the destructive colour with medium weight when the amount is greater than zero, and as `¥0` in the muted colour otherwise.
- **FR-014**: When the row's member has an individual fee adjustment in force (A-01 FR-006), the system MUST show a 個別会費調整中 badge (warning tone) under the member name; otherwise no badge. _(Reinstated 2026-10-05 by A-03 `260901_v3` FR-001 — previously retired by Q-12; see Q-17.)_
- **FR-015**: The system MUST show the record's own brand as a brand-coloured badge, using the brand's own notation (e.g. `Joyfit24`, not a `JOYFIT` group label).
- **FR-016**: The system MUST keep the table header pinned while the table body scrolls, and MUST keep the row-action column pinned to the right edge when the table scrolls horizontally, so the ⋯ menu stays reachable.
- **FR-017**: The system MUST open the application detail when a list row is clicked.
- **FR-018**: When the table has no rows because filters excluded everything, the system MUST render the filtered empty state ("条件に一致する休会・退会がありません") with a 条件をクリア button; when there are no applications at all, it MUST render the plain empty state ("休会・退会がまだありません") without that button.

#### C. Filtering and the result banner

- ~~**FR-019**~~ / ~~**FR-019a**~~: _(retired 2026-10-05, Q-17 — the 9/17 prototype removed free-text search as 「Phase 1 対象外」; the list has no search input and the endpoint carries no search parameter)_
- **FR-020**: The system MUST provide a collapsible 詳細フィルター panel, placed at the left of the toolbar, whose toggle reads 詳細フィルター when closed and 閉じる when open, carries a chevron reflecting that state, switches to the filled button style while any filter is active, and displays the active-filter count as a badge. The panel MUST NOT carry its own clear-all button — clearing is offered by the result banner and the filtered empty state (FR-029).
- **FR-021**: The system MUST provide a 種別 filter with the options 全種別 / 休会 / 退会.
- **FR-022**: The system MUST provide a ステータス filter with the options 全ステータス / 休会予定 / 休会中 / 退会予定 / 退会処理待ち.
- **FR-023**: The system MUST provide a 店舗 filter listing 全店舗 plus every store the user can access, subject to FR-005.
- **FR-024**: The system MUST provide a ブランド filter with the option 全ブランド plus all five brands — Joyfit, Joyfit24, JoyfitYoga, JoyfitPlus, Fit365 — and MUST match on the record's own brand value. It MUST NOT infer the brand from the store name (the V0 store-name-prefix matching is a defect and is not reproduced).
- **FR-025**: The system MUST provide a 予定日 period filter offering 全期間 / 今月 / 来月 / 今年, and MUST apply the selected value to the result set (the V0 control is inert — that is a defect to fix, not behaviour to reproduce).
- **FR-025a**: Each 予定日 preset MUST resolve to an inclusive scheduled-date range on the JST calendar: 今月 = the first through the last day of the current month; 来月 = the first through the last day of the next month; 今年 = 1 January through 31 December of the current year; 全期間 = no date bound.
- **FR-026**: The system MUST count as "active" every filter whose value differs from its default — including the 月別ビュー 表示 filter while 月別ビュー is shown (FR-042) — and MUST exclude the header store scope from that count.
- **FR-027**: Whenever at least one filter is active (or the list is narrowed to one member from A-01-01), the system MUST show a result banner reading "全 {scoped total} 件中 {filtered count} 件を抽出中" followed by a `・`-joined summary of the active conditions, where the scoped total is the row count after the header store scope but before any in-screen filter (the backend's `pagination.totalAllItems`).
- **FR-028**: The banner summary MUST list, in order: the member drill-down prefixed "会員: " and showing the member's name looked up by id (falling back to the id while the name is unavailable) (when present), the 種別 value, the ステータス value, the ブランド value, the 予定日 value prefixed "予定: ", the in-screen store value (all-stores view only), and "表示: 休会のみ" (月別ビュー only) — each included only when it differs from its default.
- **FR-029**: The system MUST provide a 条件をクリア action — in the banner and in the filtered empty state — that resets every filter (including the 表示 filter) to its default and returns to the first page. It does not change the selected view.
- **FR-030**: The system MUST visually highlight each filter control whose value differs from its default.

#### D. Pagination

- **FR-031**: The system MUST paginate the filtered rows, defaulting to 25 rows per page, and MUST offer the page sizes 25 / 50 / 100. The V0 option of 200 MUST NOT be offered — both the project's own request contract and the real endpoint cap the page size at 100, so a request for 200 is rejected outright.
- **FR-032**: The system MUST show a footer summary reading "全 {total} 件 / {page count} ページ / {first}-{last} を表示". 一覧 keeps this footer when the result is empty.
- **FR-033**: The system MUST provide 前へ / 次へ controls that are non-interactive and dimmed at the first and last page respectively, plus numbered page links limited to seven entries — collapsing the middle into ellipses once there are more than seven pages, and always keeping the first and last page reachable.
- **FR-034**: The system MUST return to the first page when the page size changes, and MUST clamp the effective page to the last available page when the current page exceeds the filtered page count.
- **FR-035**: The system MUST scroll the page back to the top when the user moves to another page.
- **FR-035a**: The list MUST NOT offer sort controls — every column header is plain text, as in V0. Rows MUST arrive ordered by 予定日 ascending (most imminent first), applied server-side. The endpoint keeps its `sort_by` / `sort_order` parameters so the mock stays contract-shaped, but the screen never sends them (reversed back to the V0 behaviour 2026-08-06 — see Q-13 and research.md §2).

#### E. Monthly view (月別ビュー)

_Reinstated 2026-10-05 by A-03 `260901_v3` FR-001 「月別ビュー・休会退会履歴」 (previously deleted by Q-11; see Q-17). The identifiers FR-036 – FR-044 are re-used for the reinstated view._

- **FR-036**: The system MUST offer an 一覧 / 月別ビュー toggle at the right of the toolbar, defaulting to 一覧. The selected view MUST be kept in the URL so that reload and browser back restore it.
- **FR-037**: 月別ビュー MUST render one row per member and seven month columns labelled `YYYY/MM` — the current month (on the JST calendar) and three months either side.
- **FR-038**: The member cell MUST show 会員ID (member number, monospaced muted), 会員名, the brand badge, 店舗名 (all-stores view only) and the 個別会費調整中 badge when applicable (FR-014). Clicking it MUST open the member detail. A long name or store name MUST wrap inside the cell rather than push the month columns out of view.
- **FR-039**: A month cell MUST show the state badge of the application covering that month — 休会予定 / 休会中 / 退会予定 in the list colours (FR-010), and 退会処理待ち abbreviated to 「退会待ち」 — and `—` when no application covers it. A suspension covers its start month through its end month; a withdrawal covers exactly the month of its due date.
- **FR-040**: When several of one member's applications cover the same month, the cell MUST show the highest-priority one, in the order 退会予定 → 退会処理待ち → 休会中 → 休会予定.
- **FR-041**: Hovering a month badge MUST show a tooltip with the application ID, its type, ステータス, 申請日, 予定日, 終了日 (when present), 未納金 (when greater than zero) and the 個別会費調整中 badge (when applicable). Clicking the month cell MUST open that application's detail.
- **FR-042**: While 月別ビュー is shown, the 詳細フィルター panel MUST additionally offer a 表示 filter with the options 「表示: 全て（休会・退会）」 (default) and 「表示: 休会のみ」; its trigger reads 「表示: 全て」 / 「表示: 休会のみ」. It counts toward the active-filter badge and the banner summary (FR-026, FR-028) and is hidden in 一覧.
- **FR-043**: 月別ビュー MUST evaluate the entire filtered result set, not one page of it — a member whose applications fall on different pages would otherwise render wrong month states. It applies the same filters and store scope as 一覧, renders no pagination footer, and the header count and banner's 「M 件」 report the number of applications in the filtered set, after the 表示 scope (休会のみ) — the figure follows the rows the grid is built from, not the pre-表示 set.
- **FR-044**: 月別ビュー MUST show the same filtered / plain empty states as 一覧 (FR-018) when no member remains, and the same error state with retry when retrieval fails (FR-082).

#### F. Withdrawal cancellation from the list

- **FR-045**: The system MUST show a row-action menu only on withdrawal rows, and MUST NOT show one on suspension rows.
- **FR-046**: The row-action menu MUST offer a single 退会取り消し item, enabled only when the row's state is 退会予定 **and** the application is still cancellable.
- **FR-047**: When the row's state is 退会予定 but the application is no longer cancellable, the system MUST disable the item and explain it with the tooltip "利用開始日以降のため取り消し不可".
- **FR-048**: When the row is a withdrawal in any other state, the system MUST disable the item and explain it with the tooltip "退会処理が開始されているため取り消し不可".
- **FR-049**: Activating 退会取り消し MUST open a confirmation dialog titled "退会取り消しを実行しますか？" whose body reads "**{member name}**（{member ID}）の退会申請を取り消します。取り消し後、会員ステータスは有効（通常）に戻ります。この操作は記録されます。", followed by the 取り消し理由 field (FR-049a), with a キャンセル action and a 取り消しを実行する action.
- **FR-049a**: The 取り消し理由 field MUST be a required textarea (label 「取り消し理由」 with the required mark, placeholder 「取り消し理由を入力してください...」, helper 「操作履歴に記録されます（500文字以内）」) capped at 500 characters, counted as characters (not UTF-16 units, so emoji and rare kanji count once). The confirm action MUST stay disabled while the reason is empty or whitespace only (A-03 FR-002 v3 — 「取り消し理由の入力を必須とする」; 「取り消し理由未入力はバリデーションエラー」). _(Added 2026-10-05, Q-17.)_
- **FR-050**: Confirming the dialog MUST cancel the withdrawal application, restore the member to a valid (normal) state, record the operator, the timestamp and the entered reason, and show the success toast "{member name} の退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。".
- **FR-051**: Dismissing or cancelling the dialog MUST leave the application untouched and discard the entered reason.
- **FR-050a**: While a cancellation request is in flight, a repeated confirm (double click) MUST NOT send a second request — in both the list and the detail dialog.
- **FR-052**: The system MUST re-evaluate cancellability server-side at execution time and, when the guard rejects it, MUST surface the returned user-facing message and leave the application unchanged.

#### G. Application detail — header and member context

- **FR-053**: The detail page header MUST show a back link "休会・退会管理に戻る" that returns to the list.
- **FR-054**: The detail page title MUST read "{member name} さんの{type}申請".
- **FR-055**: The detail page header MUST show a state badge — a plain secondary badge when the state is 処理完了 (or 取り消し済み), otherwise an outline badge with a leading coloured dot. It MUST NOT show an application-ID badge (removed 2026-10-05 with the prototype; 申請ID remains in 申請情報, FR-058).
- **FR-056**: When the member has an individual fee adjustment in force (read from the member detail's current main contract — the application detail carries no flag of its own), the detail page header MUST show a 個別会費調整中 badge (warning tone) after the state badge, whose term carries the glossary tooltip for 個別会費調整. _(Reinstated 2026-10-05 by A-03 `260901_v3` — previously retired by Q-12; see Q-17.)_
- **FR-057**: The detail MUST show a member head-up card with the member's face photo, name, name kana, member number, legacy member code (labelled 旧No), 主契約店舗, member-type badge, primary-contract badge, and a 会員詳細を開く action that opens the member detail.
- **FR-057a**: The head-up card's data (and the fee-adjustment state of FR-056) comes from the member detail (`GET /api/v1/admin/members/{memberId}`), fetched by the member id the application detail returns. The application detail response is not extended with a member block; the card shows its loading state until the member lookup resolves. _(Revised 2026-10-07 — supersedes the single-request rule of Q-15.)_

#### H. Application detail — 申請情報

- **FR-058**: The 申請情報 card MUST show 申請ID as the application's human-readable **application number** (monospaced), and 種別 as a type-coloured badge (info for 休会, destructive for 退会).
- **FR-059**: The 申請情報 card MUST label its two date fields 休会開始月 and 休会終了月 for suspensions, and 退会予定日 and 終了日 for withdrawals, showing `—` for a withdrawal's 終了日.
- **FR-059a**: For withdrawals only, the 申請情報 card MUST show a full-width 利用開始日 field — the usage start date as `YYYY/MM/DD`, followed in muted small text by 「（利用開始前のため退会取り消し可）」 before the date and 「（利用開始後のため退会取り消し不可）」 from the date on; `—` when no usage start date is fixed (A-03 FR-002 — the basis of cancellability). _(Added 2026-10-05, Q-17.)_
- **FR-060**: The 申請情報 card MUST show 理由 across the full card width, plus 申請者 and 申請日時.

#### I. Application detail — 承認フロー Timeline

- **FR-061**: The detail MUST show an 承認フロー card that visualises the application's progress as an ordered, connected sequence of steps, marking completed steps with a success-toned check and pending steps with a muted clock.
- **FR-062**: Step 1 MUST be 申請, MUST always be complete, and MUST be captioned with the application timestamp followed by the proxy applicant when the application was raised by proxy, or the applicant otherwise.
- **FR-063**: Step 2 MUST be labelled 休会承認 for suspensions and 退会承認 for withdrawals, MUST always be complete, and MUST be captioned with the approval timestamp. _(Amended 2026-08-07, Q-16 — the previous wording carried an "unless the application is still awaiting approval / captioned 承認待ち" branch taken from the prototype's `申請中` mock status. A-03 asks for no such state, the contract has no such status, and an application only reaches this screen once approved (A-03 L67-L70), so the branch was unreachable by construction.)_
- **FR-064**: Step 3 退会処理実行 MUST be rendered for withdrawals only, MUST be complete only once the application reaches 処理完了, and MUST be captioned 処理完了 when complete and 待機中 otherwise.
- **FR-064a**: The timeline MUST render exactly two steps for suspensions and three for withdrawals. The backend's `recess_start` and `recess_end` steps MUST NOT be rendered in Phase 1, and no step MUST be visually highlighted as "current" (clarified 2026-08-05, Q-03 — deferred pending a UI treatment, see Out of Scope).

#### J. Application detail — 代理申請情報

- **FR-065**: When the application was raised by proxy, the detail MUST show a 代理申請情報 card containing 代理申請者, 合意日時, and 合意方法; when it was not, the card MUST NOT be rendered. 合意日時 MUST be shown as `YYYY/MM/DD HH:mm` in JST and MUST equal the 合意日時 entered on A-01, whatever the timezone of the browser that entered or views it (clarified 2026-10-30).
- **FR-066**: 合意方法 MUST be presented as one of 来店 / 電話 / メール / LINE.

#### K. Application detail — 関連情報

- **FR-067**: The 関連情報 card MUST show, for suspensions, 休会費 as `¥{fee}/月`, and for withdrawals, 退会手数料 as the withdrawal's own fee amount. It MUST NOT hardcode `—` for withdrawals (the V0 card does; that is a defect, since the cancellation fee is recorded on the application). Where no fee applies, `—` remains the empty presentation.
- **FR-068**: The 関連情報 card MUST show 適用キャンペーン, 未消化レッスン as `{n}回`, and 未納金 as `¥{amount}` rendered in the destructive colour when greater than zero. 未消化レッスン MUST be shown for **both** application types.

#### L. Application detail — 休会・退会履歴 (seed-only)

- **FR-069**: The detail MUST show a 休会・退会履歴 strip presenting a rolling twelve-month window, centred by default on the current month, running from six months before the anchor to five months after it.
- **FR-070**: Each month cell in the strip MUST show a state badge when the month carries a suspension or withdrawal state (休会中 / 休会予定 / 退会予定), the related application ID beneath it when one exists, the month number, and the two-digit year; the current month MUST additionally carry a 今月 badge and a highlighted background.
- **FR-071**: The strip MUST show a period label "{window start} 〜 {window end}" with previous and next period controls, which MUST be disabled at the ends of the navigable range — twenty-four months before through twelve months after the current month.
- **FR-072**: The strip MUST show a 今へ戻る control only while the current month lies outside the visible window, returning the window to the current month.
- **FR-073**: The strip MUST show a footer legend for 休会中 / 休会予定 / 退会予定 and a 他の申請一覧を見る link that returns to the list.
- **FR-074**: History data MUST be seed-only — the system MUST NOT provide any means to create, update, or delete history entries from these screens.

#### M. Application detail — status card and cancellation

- **FR-075**: The detail's right-hand column MUST show a status card, pinned while the left column scrolls, presenting the state's tone, icon and label plus a "最終更新: {timestamp}" line.
- **FR-076**: The status-card state presentation MUST be: 休会予定 warning with a clock icon, 休会中 info with a pause icon, 退会予定 destructive with a clock icon, 退会処理待ち warning with a cross icon, and 処理完了 muted with a check-circle icon.
- **FR-077**: The status card MUST show an action area only when the state is 退会予定, 休会中 or 処理完了; for any other state (including 取り消し済み) no action area MUST be rendered.
- **FR-078**: For state 退会予定 the status card MUST show a full-width 退会取り消し button, permitted for System / Headquarter / Manager / Staff, disabled when the application is no longer cancellable, with a tooltip explaining either the date restriction ("利用開始日（{YYYY/MM/DD}）以降のため取り消し不可", or without the date when none is known), the batch restriction ("退会処理が開始されているため取り消し不可") or the missing permission ("退会取り消しの権限がありません" — shown to Observer / Trainer and to a permitted-role user whose 職位 lacks `can_cancel_withdrawal`, FR-006).
- **FR-079**: For state 処理完了 the status card MUST show the text "処理が完了しています" in place of any action.
- ~~**FR-079a**~~: _(retired 2026-10-05, Q-17 — the prototype has no 取り消し済み block; a cancelled application shows only its state on the card. The executor, timestamp and reason are still recorded server-side per FR-050)_
- **FR-079b**: For state 休会中 the status card MUST add the meta line 「休会の解除（早期復帰）は会員詳細のステータス変更から行います」 and show a full-width outline button 「会員詳細で休会を解除する」 that opens the member detail. Releasing a suspension is A-01-01's status change; A-03 only hands off. _(Added 2026-10-05, Q-17.)_
- **FR-080**: Activating the detail's 退会取り消し MUST open a confirmation dialog titled "退会を取り消しますか？" reading "{member name} さんの退会予定を取り消します。取り消し後、会員ステータスは有効（通常）に戻ります。", followed by the 取り消し理由 field (FR-049a), with キャンセル and 取り消す actions. Each screen keeps its own wording; the two dialogs are not unified.
- **FR-080a**: Confirming the detail dialog MUST perform the same cancellation as the list entry point (FR-050, FR-052) — with the entered reason — and MUST give the operator the success toast "{member name} さんの退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。" or the server's failure message, then refresh the detail. The V0 behaviour — a confirm button that only closes the dialog — is a defect and MUST NOT be reproduced.

#### N. Loading and error states

- **FR-081**: While the list or the detail is retrieving data, the system MUST replace the affected content with a skeleton placeholder shaped like the eventual layout, following the project's established data-state convention. Toolbar and filter controls MUST remain mounted while the table body loads, so an in-flight request never removes the controls the operator is using.
- **FR-082**: When a retrieval fails, the system MUST replace the affected content with an error state carrying a message and a retry action, rather than showing an empty table.
- **FR-082a**: When a cancellation fails, the system MUST keep the operator on the current view and surface the server's returned user-facing message as a transient notification, leaving the application unchanged.
- **FR-083**: When an application referenced by a detail URL does not exist, is malformed (the backend answers 400), or lies outside the caller's store scope, the system MUST present a not-found treatment rather than disclosing the application's existence.

### Backend API Contract Mapping

Source: fitness-dx CRM API `0.8.0`, tag `Suspension & Withdrawal Management` (present in `x-tagGroups`, so the backend contract is considered ready).

| Screen behaviour                                                                  | Endpoint                                                                      |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| List display, filtering, pagination (FR-007 – FR-035)                             | `GET /api/v1/admin/suspension-withdrawal-applications`                        |
| 月別ビュー (FR-036 – FR-044) — every page of the filtered set at `limit=100`      | `GET /api/v1/admin/suspension-withdrawal-applications`                        |
| Suspension detail incl. timeline and histories (FR-053 – FR-074)                  | `GET /api/v1/admin/suspension-applications/{suspensionApplicationId}`         |
| Withdrawal detail incl. timeline, histories and cancellability (FR-053 – FR-078)  | `GET /api/v1/admin/withdrawal-applications/{withdrawalApplicationId}`         |
| Withdrawal cancellation (FR-049 – FR-052, FR-080) — body `{ comment }` (required) | `POST /api/v1/admin/withdrawal-applications/{withdrawalApplicationId}/cancel` |

**Display-state vocabulary** — the four list states map 1:1 onto the backend's `displayStatus`:

| Screen label | `displayStatus`                                                                         |
| ------------ | --------------------------------------------------------------------------------------- |
| 休会予定     | `pending_suspended`                                                                     |
| 休会中       | `suspended` (temporary-recess rows merge in here; the reason code is not distinguished) |
| 退会予定     | `pending_withdrawal`                                                                    |
| 退会処理待ち | `withdrawal_pending_processing` (due date arrived, System processing pending)           |

Completed and cancelled applications have no `displayStatus` and never enter the list (clarified 2026-08-05, Q-10); they remain readable through the two detail endpoints.

**Field mapping (list)**: 会員ID ← `member.memberNumber`; 会員名 ← `member.lastName` + `member.firstName`; ブランド ← `store.brandEnum`; 店舗名 ← `store.name`; ステータス ← `displayStatus`; 申請日 ← `appliedAt`; 予定日 ← `scheduledDate`; 終了日 ← `endDate` (always null for withdrawals); 未納金 ← `delinquentAmount`; 申請ID ← `applicationNumber` (the human-readable 10-digit receipt number), with `applicationId` + `applicationType` used for routing to the correct detail endpoint.

**Filter mapping**: ブランド → `brandEnum`; 店舗 → `storeId`; 種別 + ステータス → `displayStatus` (a comma-separated subset of the four values — the two suspension values express "suspensions only", the two withdrawal values "withdrawals only"); 予定日 → `scheduledFrom` / `scheduledTo`; pagination → `page` / `limit`; banner baseline count → `includeTotalAll=true` yielding `pagination.totalAllItems`. Default ordering is `scheduledDate` ascending, tie-broken on `appliedAt` then `applicationId`.

**Cancellation guard** — the backend evaluates, in order: application status must be `active` (else 409 `E-WDR-200`, reason `not_cancellable_status`); the member must not be `withdrawal_pending_processing` (else 409 `E-WDR-200`, reason `batch_processing_started`); the contract's usage start date must not have arrived, where a null date counts as not started (else 422 `E-WDR-201`, reason `usage_started`). On success the application becomes `cancelled`, the contract end date is cleared, and the member returns to `provisional`. The operation is **not** idempotent — repeating it returns 409. The withdrawal detail surfaces the same decision up front as `cancellable` plus `cancellationBlockedReason`, which the screen uses to drive FR-046 – FR-048 and FR-078.

**Cancellation reason** — the real `CancelWithdrawalRequestDto.comment` is **required** ("A-03 FR-002 v3: mandatory — a state change kept in history"); the screens send the trimmed 取り消し理由 as `comment`. The reason is 1–500 characters after trimming.

**Additions requested of the backend — all delivered** (2026-10-05 – 2026-10-07; the screens run on the real API):

1. `GET /api/v1/admin/suspension-applications/{id}` → `relatedInfo.unusedLessonCount`, mirroring the withdrawal detail's field (Q-07).
2. `GET /api/v1/admin/suspension-withdrawal-applications` items → `hasActiveFeeAdjustment` (true while the member has an individual fee adjustment in force, A-01 FR-006). Needed by FR-014, FR-038, FR-041. The detail header (FR-056) reads the member detail's `currentMainContract.activeFeeAdjustment` instead.
3. The list's `memberId` filter (A-01-01 drill-down, FR-027/FR-028) and `includeTotalAll` → `pagination.totalAllItems` (banner denominator, FR-027).
4. The expanded `member` block on the detail responses (Q-15) was **not** pursued: the head-up card is fed by `GET /api/v1/admin/members/{memberId}` (FR-057a).

**Not consumed by A-03**: `POST/GET /api/v1/admin/bulk-temporary-recess-jobs*` — these serve FR-003 臨時休会, which lives on the separate `emergency-suspension` screen.

### Key Entities

- **Suspension/Withdrawal Application (unified list row)**: one suspension or withdrawal application belonging to a member's contract. Carries its type discriminator, an internal identifier and a human-readable receipt number, its display state, the member and store it belongs to, the application timestamp, the scheduled date, the suspension end date (withdrawals: none), the member's live outstanding arrears, and whether the member has an individual fee adjustment in force.
- **Suspension Application (detail)**: adds the lifecycle status, the application route, the reason code and free-text reason, the suspension start and end dates, the suspension-fee snapshot, the proxy-application block, the creating staff member, the related-information block (arrears, campaign), the derived timeline, and the status-history list.
- **Withdrawal Application (detail)**: adds the lifecycle status, the application route, the reason code and reason, the withdrawal due date, the cancellation-fee snapshot, the usage start date, the server-derived cancellability and its blocking reason, the proxy-application block, the related-information block (arrears, arrears-at-application snapshot, suspension fee, campaign, unused lesson count), the derived timeline, and the status-history list.
- **Timeline**: the ordered progress steps of one application — for suspensions 申請 → 承認 → 休会開始 → 休会終了, for withdrawals 申請 → 承認 → 退会処理実行 — each with a progress state (completed / current / pending), a completion timestamp, and the acting staff member where one exists.
- **Status History Entry**: one recorded transition of an application, with its previous and new status, who changed it, when, and an optional operator comment. Returned by both detail endpoints but **not rendered by any Phase 1 surface** (clarified 2026-08-05, Q-14); read-only and seed-only.
- **Member (summary)**: the member an application belongs to — internal identifier plus the displayable member number and name. The detail's head-up card additionally shows the name kana, the legacy member code (the 旧No shown on screen), the member type, the primary contract name, and the face photo — these come from the member detail, not from the application detail (FR-057a; originally clarified 2026-08-05, Q-15).
- **Store (summary)**: the contract's store — identifier, store code, name, and brand.
- **Suspension History Month**: one month of the member's suspension/withdrawal history strip — the month key, its state, and the application it originates from. Seed-only.

### Traceability Matrix (UI → Source Requirement)

| UI element (prototype)                                                                                                        | Source                                                                               | Requirement                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Page title 休会・退会管理 + count (`leave-list.tsx` L477-L481)                                                                | A-03 L125                                                                            | FR-007                                                                                                              |
| Permission-denied card (`leave-list.tsx` L486-L493)                                                                           | A-03 L219 (Trainer ×)                                                                | FR-001, FR-002                                                                                                      |
| 会員ID / 会員名 columns (`leave-list.tsx` L642-L643, L680-L698)                                                               | A-03 L128 「会員ID・氏名」                                                           | FR-008, FR-009                                                                                                      |
| 店舗名 column (`leave-list.tsx` L645-L647, L700-L702)                                                                         | A-03 L128 「店舗名」                                                                 | FR-004, FR-008                                                                                                      |
| 種別 column (`leave-list.tsx` @ `47423ec` L631, L687-L691)                                                                    | A-03 FR-001 (type distinction)                                                       | FR-008, FR-008a                                                                                                     |
| ステータス column + badges (`leave-list.tsx` L648, L703-L716, L217-L240)                                                      | A-03 L128 「ステータス（休会予定/休会中/退会予定/退会処理待ち）」                    | FR-010                                                                                                              |
| 申請日 column (`leave-list.tsx` L649, L717)                                                                                   | A-03 L128 「申請日」                                                                 | FR-008                                                                                                              |
| 予定日 column (`leave-list.tsx` L650, L718)                                                                                   | A-03 L128 「予定日（休会開始日/退会予定日）」                                        | FR-011                                                                                                              |
| 終了日 column (`leave-list.tsx` L651, L719-L721)                                                                              | A-03 L128-L129 「終了日」                                                            | FR-012                                                                                                              |
| 未納金 column (`leave-list.tsx` L652, L722-L724)                                                                              | A-03 L128, L130 「未納金」                                                           | FR-013                                                                                                              |
| ブランド column (`leave-list.tsx` L644, L699)                                                                                 | A-03 L128 「ブランド」                                                               | FR-015                                                                                                              |
| 種別 / ステータス / 店舗 / ブランド / 予定日 filters (`leave-list.tsx` L552-L611)                                             | A-03 L131 「絞り込み条件: ブランド、店舗、ステータス種別、予定日レンジ」             | FR-021 – FR-025                                                                                                     |
| Row click → member detail drill-down (`leave-list.tsx` L678, L685-L688)                                                       | A-03 L132 「一覧から会員詳細（A-01-01）へのドリルダウン」                            | FR-009, FR-017                                                                                                      |
| Row menu 退会取り消し + guards (`leave-list.tsx` L726-L778)                                                                   | A-03 L136-L141, L148                                                                 | FR-045 – FR-048                                                                                                     |
| Cancellation confirm dialog + 取り消し理由 + toast (`leave-list.tsx` @ `47423ec` L958-L1002)                                  | A-03 FR-002 v3 (reason mandatory), L142-L143, L147                                   | FR-049 – FR-051                                                                                                     |
| 承認フロー timeline (`leave-detail.tsx` L187-L264)                                                                            | A-03 L144 「承認フロー Timeline」                                                    | FR-061 – FR-064                                                                                                     |
| 代理申請情報 card (`leave-detail.tsx` L266-L289)                                                                              | A-03 L145 「代理申請情報セクション」 (A-01 FR-017)                                   | FR-065, FR-066                                                                                                      |
| 関連情報 card (`leave-detail.tsx` L291-L322)                                                                                  | A-03 L146 「関連情報セクション（休会費・適用キャンペーン・未消化レッスン・未納金）」 | FR-067, FR-068                                                                                                      |
| Detail 退会取り消し button + usage-start guard (`leave-detail.tsx` @ `47423ec` L481-L495, L516-L547)                          | A-03 L139, L148, L208-L213; FR-002 v3                                                | FR-077, FR-078, FR-080                                                                                              |
| Detail 利用開始日 field (`leave-detail.tsx` @ `47423ec` L292-L303)                                                            | A-03 FR-002 「利用開始日前の退会予定会員のみ取り消し可能」                           | FR-059a                                                                                                             |
| Detail 休会中 hand-off (`leave-detail.tsx` @ `47423ec` L476, L496-L504)                                                       | A-03 前提条件 (applications / status changes belong to A-01-01)                      | FR-077, FR-079b                                                                                                     |
| Search box                                                                                                                    | removed from the prototype 9/17 (「Phase 1 対象外」)                                 | **Removed** — FR-019 / FR-019a retired (Q-17)                                                                       |
| 一覧 / 月別ビュー toggle + month grid (`leave-list.tsx` @ `47423ec` L512-L531, L773-L891)                                     | A-03 FR-001 v3 「月別ビュー・休会退会履歴」                                          | FR-036 – FR-044                                                                                                     |
| 処理完了 state in the list (`leave-list.tsx` L77, L572)                                                                       | _not in source_ — source lists four states (A-03 L128)                               | **Out of scope** — dropped 2026-08-05 (Q-10); the state survives only on the detail screen (FR-055, FR-076, FR-079) |
| Filter-result banner (`leave-list.tsx` L628-L634)                                                                             | _no source requirement_ — shared list convention                                     | FR-027, FR-028                                                                                                      |
| Pagination footer (`leave-list.tsx` L914-L970)                                                                                | _no source requirement_ — shared list convention                                     | FR-031 – FR-035                                                                                                     |
| 個別会費調整中 badge (`leave-list.tsx` @ `47423ec` L676-L680, L813-L817, L870-L874; `leave-detail.tsx` @ `47423ec` L586-L590) | A-03 FR-001 v3 「個別会費調整中」 (A-01 FR-006)                                      | FR-014, FR-038, FR-041, FR-056                                                                                      |
| Member head-up card (`leave-detail.tsx` L433-L441)                                                                            | _no source requirement_ — shared detail convention                                   | FR-057                                                                                                              |
| 休会・退会履歴 strip (`leave-detail.tsx` L324-L331)                                                                           | _no source requirement_ — prototype addition                                         | FR-069 – FR-074                                                                                                     |
| Status card (`leave-detail.tsx` L337-L366)                                                                                    | A-03 L128 (state surfacing)                                                          | FR-075 – FR-079b                                                                                                    |
| FR-003 臨時休会                                                                                                               | A-03 L150-L161, L153 (separate screen)                                               | **Out of scope**                                                                                                    |

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An operator can open 休会・退会管理 and identify every member in their scope who is suspended, scheduled to suspend, scheduled to withdraw, or waiting for withdrawal processing, without navigating to any other screen.
- **SC-002**: An operator can narrow the list to a single business question — one brand, one store, one type, one state, or one scheduled period — in at most three interactions, and can see at a glance how many rows the narrowing removed.
- **SC-003**: An operator can reach any one application's full context — application facts, progress, proxy-application details, and adjacent business figures — in a single click from the list.
- **SC-004**: An operator can tell, without attempting the action, whether a given withdrawal can still be cancelled and, when it cannot, why not.
- **SC-005**: A withdrawal that is still within its cancellation window can be cancelled and the member restored to a valid state in under 30 seconds from opening the list, with the outcome confirmed on screen.
- **SC-006**: A withdrawal that is outside its cancellation window is never cancelled — every attempt is refused with the specific reason shown to the operator.
- **SC-007**: A Trainer never sees suspension or withdrawal data on this screen, and an Observer can read the screen but can never execute a cancellation.
- **SC-008**: An operator viewing a single store never sees another store's applications, regardless of which in-screen filters were set beforehand.
- **SC-009**: The list returns its first page of results within one second for a store with a hundred thousand applications on file.
- **SC-010**: The list, its filter summary, its row count badge, and its pagination footer always agree on how many rows match the current conditions.

---

## Assumptions

- **Prototype fidelity is the baseline for presentation.** Every label, badge style, column order, tooltip, dialog wording, and empty-state message specified above is taken verbatim from the prototype (re-synced to `47423ec` on 2026-10-05; originally `e99646c`). Where the prototype and the source requirement disagree, the disagreement is recorded in Q&A rather than silently resolved.
- **Real API, no open backend gaps.** The list, 月別ビュー, both details and the cancellation run on the real backend. The additions this feature asked for (see _Additions requested of the backend_) are all delivered; the legacy mock endpoints under `src/app/api/crm/leaves` are no longer consumed by these screens.

- **The backend contract is the baseline for data and rules.** The `Suspension & Withdrawal Management` tag sits inside `x-tagGroups`, so its four A-03 endpoints are treated as agreed. Where the prototype's mock data shape differs from the contract (identifier formats, field availability), the contract governs the data model and the prototype governs the presentation.
- **Applications originate elsewhere.** Suspension and withdrawal applications are created from A-01-01; A-03 never creates one. The screen is read-plus-cancel only.
- **State transitions on date arrival are System-driven.** Suspension start, suspension end, and withdrawal execution are performed by backend batches (A-03 L82); the screen only reflects their results and never triggers them.
- **History is seed-only.** Both the status-history data and the 休会・退会履歴 strip are populated from seeded data; no create, update, or delete path exists in this feature.
- **`処理完了` is a detail-screen state only.** Completed and cancelled applications leave the list entirely (clarified 2026-08-05, Q-10) but stay readable through their detail endpoints. A-03 therefore offers no route of its own to a closed application; operators reach one from A-01-01 or from the 休会・退会履歴 strip.
- **Individual fee adjustment is owned by A-01-01, displayed on A-03.** A-03 v3 shows a read-only 個別会費調整中 badge as an input to suspension / withdrawal handling (Q-17, superseding Q-12). Setting, changing or ending an adjustment stays on A-01-01 (A-01 FR-006).
- **Role and store scope are enforced server-side.** The screen's role gating is a usability layer over the backend's own scope filter — an out-of-scope application is not merely hidden, it is not returned, and requesting one directly yields a not-found rather than a forbidden.
- **Brand and store master data is supplied by existing masters.** The brand and store filter options come from the user's accessible-store set and the brand master, not from the application records.
- **Standard CRM shell.** The screens sit inside the existing sidebar/header shell, use the project's shared list conventions (filter banner, empty state, pagination), and inherit the project's existing authentication.

---

## Q&A / Clarification Needed

Consolidated for `/speckit.clarify`. Each item states what was found, where, and why it cannot be resolved without a decision. **Legend** — _Impact_: **Scope** (changes what gets built) / **Rule** (changes behaviour) / **Data** (changes the model) / **UX** (changes presentation).

### Q-01 — The 予定日 filter is rendered but never applied, and its shape does not match the requirement — ✅ RESOLVED, 2026-08-05

**Impact**: Rule · **Refs**: FR-025, FR-025a · `leave-list.tsx` L601-L611 (control), L399-L415 (row predicate), L382-L384 (counted as active), L392 (in banner summary) · A-03 L131 · API `scheduledFrom` / `scheduledTo`

The prototype renders a 予定日 selector with the presets 全期間 / 今月 / 来月 / 今年, counts it toward the active-filter badge, and lists it in the banner summary — but the row-filtering predicate omits `scheduledPeriod` entirely, so choosing a value changes the badge and the banner while leaving the table untouched. Separately, the source spec asks for a 予定日**レンジ** and the backend exposes an inclusive `scheduledFrom` / `scheduledTo` date pair, neither of which is a fixed preset list.

**Resolution**: **Keep the four presets and make them work** (FR-025, FR-025a). Each preset resolves to an inclusive JST scheduled-date range and is sent as `scheduledFrom` / `scheduledTo`:

| Preset | `scheduledFrom`                | `scheduledTo`                   |
| ------ | ------------------------------ | ------------------------------- |
| 全期間 | _(omitted)_                    | _(omitted)_                     |
| 今月   | first day of the current month | last day of the current month   |
| 来月   | first day of the next month    | last day of the next month      |
| 今年   | 1 January of the current year  | 31 December of the current year |

Presets are ranges, so A-03 L131's 予定日レンジ is satisfied without departing from the reviewed UI. No date-range picker in Phase 1. Note that "keep V0 as-is" was not an available option here: the inert control is a prototype defect, not a design decision.

### Q-02 — Withdrawal rows can never appear in the monthly view — ✅ RESOLVED (moot), 2026-08-05 · ♻️ REOPENED & FIXED 2026-10-05

**Impact**: Rule · **Refs**: `leave-list.tsx` L270-L285 and L288-L302 (coverage test), L274-L276, L98-L214 (mock shapes), L619 (the filter label)

The coverage test compares a `YYYY/MM` column key against the row's `scheduledDate`. Suspension rows store `scheduledDate` as `YYYY/MM`, so they match. Withdrawal rows store it as `YYYY/MM/DD` (e.g. `2026/04/30`), and `"2026/04" >= "2026/04/30"` is false under string comparison while the no-end-date branch demands exact equality — so **no withdrawal row can ever produce a cell**. The heatmap nevertheless offers a 表示 filter whose default option is labelled "全て（休会・退会）", implying withdrawals should appear.

**Update 2026-10-05**: 月別ビュー is back (Q-17), so the defect is fixed rather than moot — FR-039 cuts both the withdrawal due date and the suspension bounds to `YYYY/MM` before comparing, so a withdrawal occupies exactly the month of its due date. The prototype still carries the defect; it is not reproduced.

**Original resolution**: Moot — Q-11 removed 月別ビュー from Phase 1, so there is no heatmap to fix. Recorded here because it is a real defect in the V0 prototype: if the view is revived in a later phase, the withdrawal due date must be normalised to its month before the coverage comparison, and the intended semantics (a withdrawal occupies exactly the month of its due date) still need confirming.

### Q-03 — The suspension timeline has two steps on screen and four in the contract — ✅ RESOLVED, 2026-08-05

**Impact**: Scope · **Refs**: FR-061 – FR-064a · `leave-detail.tsx` L193-L262 · API suspension-detail `timeline.steps[]` · A-03 L144

The prototype renders 申請 → 承認 for suspensions and 申請 → 承認 → 退会処理実行 for withdrawals. The backend derives four steps for suspensions — `applied` → `approval` → `recess_start` → `recess_end` — and three for withdrawals — `applied` → `approval` → `execution`. On step **count** the prototype agrees with the source spec (A-03 L144 describes 申請→承認→（退会の場合）退会処理実行); it is the backend that adds the two date-arrival milestones. On **highlighting** the positions reverse: the source spec mandates it, the backend supplies `state: "current"` on every step, and only the prototype omits it.

**Resolution**: **Follow the prototype on both counts.** Two suspension steps, three withdrawal steps, no current-step highlight (FR-064a). The two extra backend steps are simply not rendered.

The highlight is **deferred, not rejected** — the stated reason is that the visual treatment has not been designed yet. This leaves A-03 L144 knowingly unmet in Phase 1 for a requirement whose data is already available at zero backend cost, so it is recorded in Out of Scope as a known gap to revisit once a UI treatment exists, rather than closed.

### Q-04 — The brand filter is derived from the store name and offers two of five brands — ✅ RESOLVED, 2026-08-05

**Impact**: Data · **Refs**: FR-015, FR-024 · `leave-list.tsx` L591-L600 (options), L411-L413 (predicate), L99-L214 (mock `brand` values) · API `brandEnum`

The predicate ignores each row's own `brand` value and instead tests whether the store name starts with `"JOYFIT"` or `"FIT365"`. The filter offers only those two options, and the mock assigns `brand: "JOYFIT"` to stores named `JOYFIT24新宿店` and `JOYFIT+横浜店`. The backend's brand enumeration has five members — `Joyfit`, `Joyfit24`, `JoyfitYoga`, `JoyfitPlus`, `Fit365` — and the list endpoint filters on a single `brandEnum` value.

**Resolution**: **Expose all five brands** and match on the record's brand value (FR-024). The store-name-prefix matching is a defect and is not reproduced; the ブランド badge likewise shows the record's own brand notation (FR-015). No API change is requested — the decisive constraint was that `brandEnum` accepts one value rather than a comma-separated list, so a "JOYFIT" group spanning four brands could not be expressed in a single request without changing the contract. The V0 two-option list is read as a reflection of thin mock data, not a deliberate grouping decision.

### Q-05 — The list has a search box the backend does not support — ⛔ SUPERSEDED 2026-10-05 (Q-17: search removed)

**Impact**: Scope · **Refs**: FR-019, FR-019a · `leave-list.tsx` L507 (placeholder), L400-L403 (predicate) · API list description ("There is no free-text member search — member-centric search is A-01 FR-001's scope") · A-03 L131 (no search among the stated filter conditions)

The prototype searches locally over the application ID and the member name. The backend endpoint declares free-text search out of its scope and offers no corresponding parameter. Client-side search only sees the current page — against a paginated endpoint it would silently report "no results" for matches on other pages, which is worse than having no search at all.

**Resolution**: **Keep the search and request a server-side parameter.** FR-019a forbids page-local evaluation. The mock API implements the parameter for Phase 1 and the request is carried to the client through the API QA process, so this is not a delivery blocker. Matching is on application number and member name, consistent with the V0 placeholder.

### Q-06 — The 200-per-page option exceeds the backend limit — ✅ RESOLVED during `/speckit.plan`, 2026-08-05

**Impact**: Rule · **Refs**: FR-031 · `leave-list.tsx` L332 (`PAGE_SIZE_OPTIONS`), L349 (default 50) · API `limit` (default 20, maximum 100)

The prototype offers 25 / 50 / 100 / 200 rows per page and defaults to 50. The backend caps `limit` at 100 and defaults to 20.

**Resolution**: **Offer 25 / 50 / 100, default 25; drop 200.** Decided during planning on codebase evidence rather than by asking — see [research.md](./research.md) §1. The deciding fact is that 200 is rejected by the _project's own_ contract, not just the real one: `leave.schema.ts` declares `limit` as `max(100)`, so the mock route returns 400 for a 200-row request. Raising the cap in the mock alone would break the Phase 1 → Phase 2 behavioural equivalence the constitution requires. The default of 25 is the CRM-wide `PAGE_SIZE` constant every other list screen uses; V0's 50 was not carried over.

### Q-07 — 関連情報 has two fields out of step with the backend — ✅ RESOLVED, 2026-08-05

**Impact**: Data · **Refs**: FR-067, FR-068 · `leave-detail.tsx` L291-L322 (card), L303 (hardcoded `—`) · API suspension detail `relatedInfo { delinquentAmount, campaign }` + top-level `fee` vs. withdrawal detail `relatedInfo { delinquentAmount, delinquentAmountAtApply, suspensionFee, campaign, unusedLessonCount }` + top-level `fee`

The 関連情報 card shows the same four figures for both types, and two of them are wrong:

1. **退会手数料 is hardcoded to `—`** for withdrawals, even though the withdrawal detail carries `fee` — the 解約手数料 snapshot derived at creation from `plans.cancellation_fee_months`. A display defect, not a design choice.
2. **未消化レッスン has no source on the suspension side.** The withdrawal detail supplies `relatedInfo.unusedLessonCount`; the suspension detail's block carries only the arrears and the campaign. (The suspension fee is present, just at the top level as `fee` rather than inside `relatedInfo` — a mapping detail, not a gap.)

**Resolution**: **Fix both.** 退会手数料 renders the withdrawal's real `fee` (FR-067). 未消化レッスン is kept for both types (FR-068), which requires the backend to add `unusedLessonCount` to the suspension detail's `relatedInfo` — the same live count it already computes for withdrawals. A-03 L146 lists the four figures without distinguishing the two application types, so hiding the field for suspensions would not meet the source requirement. See Assumptions for the backend request this creates.

### Q-08 — The detail's cancellation dialog does nothing on confirm — ✅ RESOLVED by inference, 2026-08-05

**Impact**: Rule · **Refs**: FR-080 · `leave-detail.tsx` L369-L382 (confirm merely closes the dialog) vs. `leave-list.tsx` L995-L1004 (confirm shows a success toast)

The two cancellation dialogs differ in wording ("退会を取り消しますか？" / "{name} さんの退会予定を取り消します。" with a 取り消す action, versus the list's fuller copy with a 取り消しを実行する action) and in behaviour — the detail's confirm produces no feedback at all.

**Resolution** (inferred, not asked — the five-question quota was spent elsewhere): **the confirm must perform the cancellation** (FR-080a), because a confirm button that does nothing is a defect in the same class as the inert 予定日 filter (Q-01), the hardcoded 退会手数料 dash (Q-07) and the page-local search (Q-05) — all three of which were resolved by fixing the defect rather than reproducing it. Feedback follows the list entry point, after which the detail refreshes. **Wording is left as V0 has it on each screen**, deliberately: unifying the copy would mean inventing text neither screen was reviewed with. Override this if the two dialogs should share one wording.

### Q-09 — Neither screen defines a loading or an error state — ✅ RESOLVED by existing project convention, 2026-08-05

**Impact**: UX · **Refs**: FR-081, FR-082, FR-082a · `leave-list.tsx` L98-L214 and `leave-detail.tsx` L37-L84 (module-level mock constants; no fetch, no pending or failure branch)

Both prototypes render synchronously from constants, so there is no skeleton, spinner, retry, or error surface to copy. The backend defines 400 / 401 / 403 / 404 / 409 / 422 / 429 / 500 responses, each carrying a Japanese `userMessage`.

**Resolution**: No decision was needed — the project already has a settled convention, so these screens follow it rather than inventing one. `src/components/common/data-state-boundary/` resolves `isLoading` → skeleton, `isError` → an error view with a title and a retry action, `isEmpty` → the empty state; its own documentation notes that loading and error replace the whole subtree while filter controls stay mounted around it, which is why FR-081 keeps the toolbar outside the boundary. Failed mutations follow the existing `toast.error` pattern used by the implemented screens. This resolution was recorded without spending a clarification question and should be overridden if the intended treatment differs.

### Q-10 — 処理完了 is a fifth state on screen but not in the list contract — ✅ RESOLVED, 2026-08-05

**Impact**: Scope · **Refs**: FR-010, FR-022 · `leave-list.tsx` L77 (state union), L572 (filter option), L162-L184 (seeded 処理完了 rows), L227-L228 (badge style) · A-03 L128 (four states) · API `displayStatus` (four values; `completed` and `cancelled` applications are explicitly excluded from the list)

The source spec names four states. The prototype adds 処理完了 as a fifth — filterable, badged, and represented by two seeded rows. The backend excludes completed and cancelled applications from the unified list entirely, though it keeps their details readable.

**Resolution**: **Dropped from the list.** The source requirement and the backend contract agree independently on four states, against a prototype-only convenience — so no API change is requested. The ステータス filter (FR-022) loses its 処理完了 option, the list badge map (FR-010) drops the plain-secondary variant, and no completed applications are seeded into the list. The state is unaffected on the detail screen (FR-055, FR-076, FR-077, FR-079), where closed applications stay readable. Consequence to accept: A-03 no longer offers a route to a closed application's detail — operators reach one from A-01-01 or from the 休会・退会履歴 strip.

### Q-11 — The monthly view has no source requirement — ⛔ SUPERSEDED 2026-10-05 (Q-17: A-03 v3 requires it)

**Impact**: Scope · **Refs**: `leave-list.tsx` L517-L529, L242-L314, L788-L911 · A-03 FR-001 (L123-L134, which describes only a list)

月別ビュー is a substantial prototype addition — a second view mode, a seven-column heatmap, per-cell tooltips, a priority resolver, and its own 表示 filter — with no counterpart in A-03 and no supporting backend shape (the list endpoint returns flat rows, not month coverage).

**Resolution**: **Deferred out of Phase 1.** Phase 1 ships the 一覧 view only, with no view toggle. The decisive factor was that the heatmap is a whole-set aggregation, not a paginated projection: `buildHeatmapRows` groups by member and `getStatusForMonth` then resolves a priority state across _all_ of that member's applications (`leave-list.tsx` L258-L302). In V0 this is fed by the unpaginated `filteredList` (L419-L423), while only the list view slices to `pagedList` (L431) — the shared pagination footer at L913 sits outside both view blocks and is decorative in heatmap mode. Against the real endpoint (`limit` ≤ 100, flat per-application rows) a member whose applications straddle a page boundary would render _wrong_ month states, not merely missing ones. Correct behaviour requires fetching the entire filtered set outside pagination, which was judged out of Phase 1 scope. FR-036 – FR-044 were deleted and their identifiers retired.

### Q-12 — 個別会費調整中 has no source requirement and no backend field on A-03 — ⛔ SUPERSEDED 2026-10-05 (Q-17: A-03 v3 requires it)

**Impact**: Data · **Refs**: retired FR-014 / FR-056 · `leave-list.tsx` L94 (`hasActiveAdjustment`), L692-L696 · `leave-detail.tsx` L69, L422-L426 · A-03 (no mention) · A-01 FR-006 (L393-L405) · API `FeeAdjustmentRef`

The badge appears in the list rows and the detail page header and, on the detail, carries a jargon tooltip. It is absent from the A-03 requirement and from all four A-03 backend responses.

Investigation found the concept is nonetheless real and specified — just not here. **A-01 FR-006** defines 個別会費調整 and explicitly sites it on the A-01-01 member-detail screen (「個別会費調整（OOUI思想に基づき本画面に配置）」), and the backend implements it via `POST /api/v1/admin/members/{memberId}/fee-adjustments` and `DELETE /api/v1/admin/members/{memberId}/fee-adjustments/{adjustmentId}`. The read model, `FeeAdjustmentRef` (`feeAdjustmentId`, `startDate`, `endDate`, `adjustedMonthlyFee`, `reason`), is exposed only inside `Member_Management_CurrentMainContractDetail` — the member-detail response.

**Resolution**: **Dropped from A-03 in Phase 1.** FR-014 and FR-056 are retired. Rendering the badge per list row would need a member-detail call per row, and A-03 never asks for it, so no backend change is requested. The badge remains on A-01-01, where A-01 FR-006 places it.

### Q-13 — No sorting controls, though the endpoint supports sorting — ✅ RESOLVED, 2026-08-06 (reversed twice; final answer = follow V0)

**Impact**: UX · **Refs**: FR-035a · `leave-list.tsx` L638-L655 (no sortable headers) · API `sort` (`scheduledDate` / `appliedAt` / `displayStatus`) and `order`, default `scheduledDate` ascending

Neither V0 view offers a sort control, and the prototype renders its mock rows in array order. The backend's default — most imminent scheduled date first — is what the screen would receive.

**Resolution history**:

1. The spec originally assumed "no sort, as V0".
2. `/speckit.plan` (2026-08-05) **reversed** that to "keep sorting", on the grounds that the pre-spec `feat/member-leave` implementation already had it working end to end and the backend contract supports it — deleting shipped functionality to match a mockup looked like a regression dressed as fidelity.
3. **Final (2026-08-06): remove the sort controls.** The user reviewed the reversal and rejected it. The prototype is the reviewed design and it renders plain headers — `leave-list.tsx` contains no sorting logic at all (zero occurrences of `sort` in the file). Step 2 was the agent's own call made during planning, never presented for approval, and "the code already does it" is not evidence the design intends it: that code predates this spec.

**What ships**: plain column headers, no `sort_by` / `sort_order` in URL state, and no sort parameters sent from the screen. Ordering is fixed server-side at **`scheduled_date asc`** — the real contract's documented default — so what the operator sees is unchanged from what the sorted view showed on first load, and nothing shifts at the Phase 2 swap. The endpoint keeps both parameters in its schema so the mock stays contract-shaped; only the UI drops them.

**Note for parity**: no `PAR###` item covers sorting either way, so the parity gate could not have caught this in either direction. Sorting-related divergence has to be checked against this Q-13 entry.

### Q-14 — The screen map still advertises a 変更履歴 tab that the detail no longer has — ✅ RESOLVED, 2026-08-05

**Impact**: Scope · **Refs**: Out-of-scope note · `screens.ts` L1729-L1739 (two tabs: 申請情報 / 変更履歴, plus approval, rejection, and restoration actions) vs. `leave-detail.tsx` L390 (`activeTab` accepted but unused), L443-L444 ("申請情報（タブなし・直接表示）")

The map entry also lists 承認 / 却下 / 復帰処理 actions that the implemented detail does not render — the code comment at L132-L134 assigns approval and rejection to the member-detail screen and withdrawal execution to the System batch. The backend does supply `statusHistories` on both detail endpoints, so a change-history surface is buildable.

**Resolution**: **The map entry is stale; no tab is built.** The detail remains the single, tab-less 申請情報 view V0 implements on purpose. `statusHistories[]` is consumed by no Phase 1 surface — that is accepted, not an oversight: an endpoint returning more than a screen uses is normal. The 休会・退会履歴 strip (FR-069 – FR-074) covers the history need, and it satisfies the feature request's seed-only constraint without any change-history surface.

### Q-15 — Identifier formats differ, and the head-up card outruns A-03's member block — ✅ RESOLVED, 2026-08-05

**Impact**: Data · **Refs**: FR-009, FR-057, FR-057a, FR-058 · `leave-list.tsx` L102 (`memberId: "M-00101"`), L100 (`id: "LV-001"`) · `leave-detail.tsx` L44-L45 (`memberId: "USR-00042"`, `oldMemberNo: "JF-31085"`), L38 (`id: "LV-001"`) · `member-headup-card.tsx` L262-L307 · API `MemberSummary`, `Member_Management_MemberDetail`

The list's member identifier (`M-00101`) and the detail's (`USR-00042`) use different formats, and neither matches the contract's member-number shape. The application identifier shown as 申請ID (`LV-001`) matches neither the UUID nor the 10-digit receipt number.

Investigation widened the finding beyond identifier formatting. A-03's `MemberSummary` carries only `memberId`, `memberNumber`, `lastName`, `firstName` — while the head-up card additionally renders a name kana, a legacy member code, a member-type badge, a primary-contract badge and a face photo. **None of those four extra fields exists on any A-03 response**, so the card is largely unsupported by the contract as written, not merely mis-formatted.

**Resolution**: Identifiers — 会員ID shows `member.memberNumber`, 申請ID shows `applicationNumber`, and UUIDs are used only for routing (FR-009, FR-058); the V0 mock values are placeholders. Head-up card — kept in full, fed by an **expanded member block inlined on both A-03 detail responses** so the screen stays on one request (FR-057, FR-057a); see Assumptions for the mock-first request this creates.

Alternative considered and not taken: `GET /api/v1/admin/members/{memberId}` already exists, sits in `x-tagGroups`, and is described as the "OOUI head-up bundle" carrying exactly these fields — composing the card from a second query would need no backend change at all. Inlining was chosen instead to avoid a second round-trip and a second loading state on the detail screen.

### Q-16 — FR-063's 承認待ち branch describes a state A-03 cannot hold — ✅ RESOLVED, 2026-08-07

**Impact**: Rule · **Refs**: FR-063 · `leave-detail.tsx` L40 (mock status union incl. `申請中`), L208 (comment "completed if status is not 申請中"), L227-L232 (caption ternary) · `parity.md` PAR099 · A-03 L144 (the source requirement) and L67-L70 (the flow) · contract `LeaveStatusSchema` (6 values)

FR-063 was written as two clauses with different provenance. The **label** clause (休会承認 / 退会承認) traces to A-03 L144, which asks for a 申請→承認→（退会の場合）退会処理実行 timeline. The **incomplete** clause — "complete unless the application is still awaiting approval, captioned 承認待ち while incomplete" — traces to nothing in A-03; it was copied from the prototype, whose mock application carries a `申請中` status in its local union.

No such status exists in the A-03 contract: `LeaveStatus` enumerates suspension*scheduled / suspended / withdrawal_scheduled / withdrawal_pending / completed / cancelled. Nor should it — A-03 L67-L70 defines the flow as 申請 raised on A-01-01, after which the case \_appears* on A-03 as 休会予定 / 退会予定, i.e. already approved. The clause therefore mandated a rendering branch that no application could ever reach, which is how it surfaced: test case TC-031 had no state to exercise and no other path proving the requirement met.

**Resolution**: **Drop the incomplete branch** (option 1 of three offered). FR-063 now reads: step 2 is labelled by type, is always complete, and is captioned with the approval timestamp. The implementation had already settled on exactly this — `leave-detail-info.tsx` renders step 2 unconditionally complete and documents why — so this amendment aligns the spec with shipped, correct behaviour rather than requesting a change. `parity.md` PAR099 is amended to match; the prototype's own version is a mock-data artefact and is not reproduced.

Alternatives considered and not taken: (a) adding an "awaiting approval" status to the A-03 contract — only justified if the business wants unapproved applications listed on A-03, which A-03 L67-L70 contradicts, and it would ripple into the list, its filters and the permission matrix; (b) keeping the clause as a dormant future branch and marking TC-031 not-applicable — rejected because a MUST no data can satisfy reads as an unmet requirement at every later audit.

### Q-17 — Sync with prototype 9/17 and A-03 `260901_v3` — ✅ RESOLVED, 2026-10-05

**Impact**: Scope · Rule · Data · UX · **Refs**: `leave-list.tsx` / `leave-detail.tsx` @ `47423ec` (design update `1767864`, 2026-09-17) · A-03 `260901_v3` FR-001 / FR-002 · real `CancelWithdrawalRequestDto` (`comment` required)

A-03 v3 (2026-09-01) formalised three items this spec had deferred or dropped, and the 9/17 prototype followed it: the 個別会費調整中 badge, 月別ビュー, and a mandatory cancellation reason. The same prototype update removed the free-text search. The instruction for this sync was: build what the latest prototype shows, and remove from the screens whatever the prototype no longer shows.

**Resolution — added**

| Item                                                                     | Requirement                                    |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| 種別 column in 一覧                                                      | FR-008, FR-008a                                |
| 個別会費調整中 badge — list row, 月別ビュー row + tooltip, detail header | FR-014, FR-038, FR-041, FR-056 (reverses Q-12) |
| 一覧 / 月別ビュー toggle, month grid, 表示 filter                        | FR-036 – FR-044 (reverses Q-11; Q-02 fixed)    |
| 取り消し理由 required in both dialogs; sent as `comment`                 | FR-049, FR-049a, FR-050, FR-080, FR-080a       |
| 利用開始日 in 申請情報 (withdrawals)                                     | FR-059a                                        |
| 休会中 meta line + 「会員詳細で休会を解除する」                          | FR-077, FR-079b                                |
| Usage-start tooltip carries the date                                     | FR-078                                         |

**Resolution — removed**

| Item                                                   | Requirement                                  |
| ------------------------------------------------------ | -------------------------------------------- |
| Free-text search box (and the mock `search` parameter) | FR-019 / FR-019a retired (reverses Q-05)     |
| 「すべてクリア」 button inside the filter panel        | FR-020 (banner 条件をクリア remains, FR-029) |
| Application-number badge in the detail header          | FR-055                                       |
| 取り消し済み audit block on the status card            | FR-079a retired                              |

**Kept on purpose although the prototype differs** — each is a data or contract rule, not presentation, and was decided earlier on evidence the prototype does not change:

- ブランド filter offers all five brands, matched on the record's brand (Q-04) — the prototype still lists JOYFIT / FIT365 and prefix-matches the store name.
- Page size defaults to 25 with options 25 / 50 / 100 (Q-06) — the prototype defaults to 50.
- 退会手数料 shows the real fee (Q-07) — the prototype still hardcodes `—`.
- The `member_id` drill-down from A-01-01 — the prototype's member detail still links to the list with `memberId`, and the detail strip's 「他の申請一覧を見る」 keeps passing the member.
- Loading / error / not-found states (Q-09, FR-081 – FR-083).
- 月別ビュー renders no pagination footer — in the prototype the footer sits under both views but only ever paginates 一覧, so in 月別ビュー it is decorative (see Q-11's analysis); FR-043 fetches the whole filtered set instead.

**Backend dependency**: the real list and detail responses carry no 個別会費調整中 flag yet — raised as a mock-first request (Backend API Contract Mapping › Requested additions #2). The cancellation `comment` is already required by the real contract.

### Q-18 — 退会取り消し was gated by the wrong 職位 flag — ✅ RESOLVED, 2026-10-09

**Impact**: Rule · UX · **Refs**: A-03 権限マトリクス L221 · API-092 §6 (`POST /admin/withdrawal-applications/{id}/cancel`, 403 `E-WDR-100`) · `GET /admin/permissions` catalogue (`can_cancel_withdrawal` = 退会申請の取消) · qa-159

The A-03 matrix lets Staff cancel for their own store (○ 所属店舗分), but the backend additionally requires `positions.can_cancel_withdrawal` for Manager and Staff. The screens gated the action by the permission that governs _filing_ a withdrawal, which maps to `can_apply_transfer_suspension`; the flag the backend checks was read nowhere. A user whose 職位 had the application flag but not the cancel flag therefore saw an enabled action that always ended in 403.

**Resolution**: both entry points (list row menu, detail status card) gate on `can_cancel_withdrawal` through a dedicated permission, granted by role tier to System / Headquarter / Manager / Staff. Without the flag the action is non-actionable (list: permission badge 職位; detail: tooltip 「退会取り消しの権限がありません」) and nothing is sent. Filing a withdrawal (A-01-01) keeps its own gate.

**Open point for PO / backend**: which 職位 get the flag by default. The A-03 matrix reads as "Staff ○", yet the demo Staff account's 職位 (正社員スタッフ) has the flag off, so it cannot cancel until the flag is switched on in 職位管理.
