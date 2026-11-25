# Quickstart / Manual Verification: Member Detail — Header Popups & Side Sheets

**Feature**: `021-member-detail-header-actions` | **Date**: 2026-07-29

> **Amended 2026-09-18 — surface 11 (再入会) withdrawn.** The prototype removed the action on
> 2026-09-16 (`a7d0c88`); re-enrollment belongs to the `C-01` enrollment application
> (`POST /api/v1/admin/applications`), and its fee waiver is decided server-side. Everything
> below about 再入会 is kept as a record and no longer describes the screen — see
> [spec.md](./spec.md#amendment-2026-09-18--surface-11-再入会-withdrawn).

This project runs **no automated tests** (Constitution: No Testing Policy). This checklist _is_ the QA gate, alongside `npm run lint` and `npm run type-check`. Work through it in the running app before opening the MR.

## Setup

```bash
npm run dev
```

Open `http://localhost:3000/members` and drill into a member. The 12 surfaces live behind the header of `/members/[id]`.

### Seed members by status

Member records are seeded in `src/app/api/_mock-db/tables/members.table.ts` (`members._seed()`), **not** in `seeds/member.seed.ts` — that file holds the sub-resource mocks (payment history, billing, …). 200 members are generated, cycling status by `i % 6`.

Concrete IDs verified against the current seed. Open `/members/M-000NN`:

| Combination                                                           | Use for                                                                        | Example IDs                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| `active`                                                              | 休会申請, 退会申請, 移籍申請, ゲートストップ設定, 強制退会, ブラックリスト登録 | M-00006, M-00012, M-00018   |
| `active` + unpaid balance                                             | 休会申請 / 移籍申請 blocked with 未納金 reason                                 | M-00042, M-00084, M-00126   |
| `active` + fee adjustment **and** point discount                      | 休会申請's 適用中の値引き確認 block + point refund                             | M-00012, M-00024, M-00036   |
| `active` + cancellation-fee period                                    | JOYFIT: 移籍申請 blocked with 解約手数料期間中 reason; FIT365: not blocked     | M-00018, M-00048, M-00078   |
| `active` + reservation penalty                                        | Penalty banner + 予約ペナルティ解除                                            | M-00012, M-00042, M-00072   |
| `suspended` + active suspension                                       | 休会解除 (read-only block populated)                                           | M-00001, M-00013, M-00025   |
| `active` + gate-stop record                                           | ゲートストップ解除 (current-setting block populated)                           | M-00003, M-00015, M-00021   |
| `suspended` + gate-stop record                                        | 休会解除 **and** ゲートストップ解除 side by side (orthogonal axes)             | M-00007, M-00037, M-00067   |
| `provisional` / `pending_suspended` / `withdrawal_pending_processing` | Badge label only; no status-change items of their own                          | M-00009 / M-00019 / M-00029 |
| `pending_withdrawal`, usage **not** started                           | 退会取り消し **allowed**                                                       | M-00004, M-00016, M-00028   |
| `pending_withdrawal`, usage **already** started                       | 退会取り消し **blocked** (G-A)                                                 | M-00010, M-00022, M-00034   |
| `withdrawn`, no blacklist                                             | 再入会 / 個人情報削除 happy path                                               | M-00002, M-00014, M-00026   |
| `withdrawn` + active blacklist                                        | 再入会 and 個人情報削除 both blocked                                           | M-00008, M-00020, M-00032   |
| `forced_withdrawal` + active blacklist                                | Same, via the forced-withdrawal path                                           | M-00005, M-00011, M-00017   |

M-00012 is the most useful single member: active, with a fee adjustment, a point discount **and** a reservation penalty.

---

## 1. Header composition (FR-001 – FR-004)

- [ ] `active` member → header shows `編集`, `ステータス変更 ▾`, `⋯`.
- [ ] `ステータス変更` on `active` lists exactly 休会申請 / 退会申請 (red) / 移籍申請.
- [ ] `suspended` lists exactly 休会解除 / 退会申請.
- [ ] A gate-stopped `active` member lists 休会申請 / 退会申請 / 移籍申請 **plus** ゲートストップ解除.
- [ ] A gate-stopped `suspended` member lists 休会解除 / 退会申請 **plus** ゲートストップ解除 — gate stop never replaces the status entries.
- [ ] The head-up badge of a gate-stopped member reads ゲートストップ, and the gate-stop banner restates the member's own status.
- [ ] `pending_withdrawal` lists exactly 退会取り消し.
- [ ] `withdrawn` member → header shows only `再入会` and `⋯`, and the `⋯` menu contains only 個人情報削除.
- [ ] `⋯` on a non-withdrawn member shows the `管理操作` label, a separator, then ゲートストップ設定 / 強制退会 / ブラックリスト登録.
- [ ] ゲートストップ設定 is **absent** for any member with an active gate stop, whatever their status.
- [ ] ブラックリスト登録 is disabled with an inline reason when the member already has an active blacklist entry.
- [ ] Unpaid balance → 休会申請 and 移籍申請 disabled with `未納金があるため操作できません`; 退会申請 stays enabled.
- [ ] Cancellation-fee period, JOYFIT → 移籍申請 disabled with `解約手数料期間中のため移籍できません`, and that reason wins over the unpaid one when both apply. FIT365 in the period → 移籍申請 stays enabled.

## 2. Gap fixes — the point of this feature

- [ ] **G-A** `pending_withdrawal` member whose `usageStartDate` has passed → 退会取り消し is **disabled with a stated reason**. For one whose usage has not started → enabled and works.
- [ ] **G-B** ゲートストップ解除: ticking the acknowledgement checkbox enables the destructive button; pressing it opens a **confirm dialog**; only the dialog's action performs the release. The sheet shows 解除予定者 and 解除予定日時.
- [ ] **G-C** 予約ペナルティ解除: same two-step confirm; the sheet lists 対象となった予約 and states that the release is pushed to the member's app.
- [ ] **G-D** 個人情報削除: requires a 削除理由 **and** the operator typing `ANONYMIZE`; the button stays disabled until both are satisfied. Verify the client does not pre-fill the literal.
- [ ] **G-E** 移籍申請 with 代理申請 on → after submitting, the proxy staff, agreement timestamp and method are recorded (check the change-history tab / mock DB, not just the toast).
- [ ] **G-F** 退会申請 shows a **single free-text** 退会理由 — no picklist, no conditional detail field.
- [ ] **G-04** 退会予定日 within 7 days on a normal withdrawal → rejected with a clear message. A date before `usageStartDate` on a not-yet-started member → accepted as 入会取消.
- [ ] **G-01** 休会申請: past 休会開始月 rejected; 休会終了月 ≤ 休会開始月 rejected; a span over 12 months rejected. Each message points at the right field.
- [ ] **G-07** 休会解除: a past 復帰月 is rejected.
- [ ] **G-02** 代理申請: a future 合意日時 is rejected; the UI still shows 来店 / 電話 / メール / LINE while the request carries the enum key.
- [ ] **G-11** 退会取り消し accepts an optional comment and records it.
- [ ] **G-12** ブラックリスト登録 with **both** a reason and a memo → both survive; the reason is not overwritten by the memo.
- [ ] **FR-023** 再入会 is blocked, with a stated reason, for a blacklisted member and for one with an unpaid balance.

## 3. Shared behaviour (FR-005 – FR-012)

For each of the 12 surfaces:

- [ ] The read-only context block renders **before** any input and shows the real member's data — not a placeholder (no hard-coded `管理者A`, no fixed `¥1,100/月`).
- [ ] Required fields show a required marker; optional fields show an optional marker.
- [ ] The confirm dialog (where the surface has one) restates the concrete effect — actual dates, stores, amounts.
- [ ] Cancelling the confirm dialog returns to the sheet with the entered values **still there**.
- [ ] During submission the primary and cancel controls are disabled; double-clicking the primary control cannot submit twice.
- [ ] On success: the surface closes, a success toast appears, and the head-up card / banners / badges update **without a page reload**.
- [ ] On failure: the surface stays open, the entered values are intact, and the server's reason is shown. A rejection is never reported as success.
- [ ] Re-opening a surface after cancelling shows a clean form, and switching to a different member does not leak the previous member's entries.

## 4. Banners

- [ ] Gate-stop banner appears for a restricted member and names the pattern.
- [ ] Gate-stop banner is **suppressed** when the pattern is 常時入退館（ストップなし） — that is the unrestricted state.
- [ ] Penalty banner shows the block end date, no-show count and applied date, and its `解除...` button opens surface 7.
- [ ] Pending-withdrawal banner offers `詳細を見る` (jumps to 変更履歴) and `取り消す` (opens surface 8).
- [ ] After a successful release, the corresponding banner disappears on the next render.

## 5. Per-surface content spot-checks

- [ ] **休会申請** — with an active fee adjustment and point discount, the 適用中の値引き確認 block lists both; the ポイント返還 checkbox is disabled with a tooltip below Manager; ticking it requires a 返還事由 and shows the expected refund amount.
- [ ] **移籍申請** — current store read-only; a JOYFIT destination shows the 3-step workflow, a FIT365 destination the 4-step one.
- [ ] **休会解除** — 休会開始月 / 予定終了月 / 休会費用 read-only; the note says billing resumes on the 1st of 復帰月.
- [ ] **ゲートストップ設定** — four radio cards, each with its explanation; 設定理由 required; the immediate-effect warning is present; **no store-scope selector**.
- [ ] **強制退会** — the brand × payment-method table renders with the member's own brand highlighted; the destructive button stays disabled until a 理由 is entered.
- [ ] **ブラックリスト登録** — target-member block shows 氏名 / 会員ID / 登録日.
- [ ] **再入会** — previous contract (退会日, 旧プラン) read-only; plan list comes from the store's plan master with prices; submit stays disabled while plans load or when none exist.

## 6. Permissions

For each role, confirm the trigger is not merely hidden-but-clickable:

- [ ] A role without `members.suspend` cannot reach 休会申請 / 休会解除.
- [ ] A role without `members.withdraw` cannot reach 退会申請 / 退会取り消し.
- [ ] A role without `members.transfer` cannot reach 移籍申請.
- [ ] A role without `members.gate-stop` cannot reach either gate-stop surface.
- [ ] A role without `members.force-withdraw` cannot reach 強制退会.
- [ ] A role without `blacklist.create` cannot reach ブラックリスト登録.
- [ ] A role without `members.re-enroll` cannot reach 再入会.
- [ ] A role without `members.personal-data-delete` cannot reach 個人情報削除.
- [ ] A role without `lessons.penalty-release` cannot reach 予約ペナルティ解除.

## 7. Audit trail (FR-025)

- [ ] After each of the 12 operations, the 変更履歴 tab shows a row with the timestamp, the operator, the operation, and the reason/comment entered.
- [ ] No create / update / delete UI for history records exists — the tab is read-only and its data is seeded.

## 8. Gates before the MR

```bash
npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client
npm run lint
npm run type-check
```

- [ ] `git diff src/lib/openapi.json` shows **only** this feature's contract changes — no formatting churn. If thousands of array-wrapping lines appear, the prettier step was skipped.
- [ ] `git diff src/lib/api/` contains only regenerated output; no hand-edits.
- [ ] `npm run lint` clean — watch for `react-hooks/set-state-in-effect`; derive state in the change handler, not in an effect.
- [ ] `npm run type-check` clean — after removing `WithdrawReason`, confirm no other module still imports it.
