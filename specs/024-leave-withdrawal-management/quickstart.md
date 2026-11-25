# Quickstart: Leave & Withdrawal Management (A-03)

**Feature**: `024-leave-withdrawal-management` | **Date**: 2026-08-05

This project runs **without automated tests** (Constitution → No Testing Policy). This checklist is the verification gate: work through it manually before opening the MR.

## Setup

```bash
npm install
npm run dev
```

Screens: `/members/leaves` (list) and `/members/leaves/{id}` (detail), reachable from the sidebar under 会員管理 → 休会・退会管理.

Switch roles and header store scope using the existing dev role switcher — several checks below depend on it.

## Gate 0 — build quality (must pass before manual checks)

- [x] `npx tsc --noEmit` — no errors
- [x] `npm run lint` — no errors, no new warnings
- [x] After any change to `src/app/api/_schemas/leave.schema.ts`: regenerate the OpenAPI document, run `prettier --write` over it, regenerate the client, and confirm the diff is limited to the intended change. **Never hand-edit `src/lib/api/`.**

## Gate 1 — access & scope (FR-001 – FR-006)

- [x] As **Trainer** — the screen shows only the denial card 「この画面を表示する権限がありません」 with 「休会・退会管理はトレーナーロールでは参照できません。」; no table, no filters, no actions
- [x] As **Staff** — only own-store applications appear
- [x] As **Manager** — only managed-store applications appear
- [x] As **Headquarter/System** — all stores appear
- [x] Header scope set to a single store → 店舗名 column hidden, in-screen 店舗 filter hidden
- [x] Set the in-screen 店舗 filter, then switch the header to a single store → the in-screen filter resets to 全店舗
- [x] As **Observer** — the list is readable, but 退会取り消し is non-actionable and carries a permission indicator

## Gate 2 — list display (FR-007 – FR-018)

- [x] Title 「休会・退会管理」 with a count badge reflecting the **filtered** row count
- [x] Columns in exactly this order: 会員ID · 会員名 · ブランド · 店舗名 · ステータス · 申請日 · 予定日 · 終了日 · 未納金 · (row actions)
- [x] **No** 申請ID column and **no** 種別 column
- [x] 会員ID shows a member number (e.g. `JF-0000101`), never an internal id
- [x] Clicking 会員名 opens the member detail **without** also opening the application detail
- [x] Clicking anywhere else on the row opens the application detail
- [x] Status badges: 休会予定 (warning + dot) · 休会中 (info + dot) · 退会予定 (destructive + dot) · 退会処理待ち (warning + dot)
- [x] **処理完了 never appears** in the list or in the ステータス filter options
- [x] 終了日 shows the end month for suspensions and `—` for withdrawals
- [x] 未納金 shows `¥0` muted when zero, and `¥{amount}` destructive + medium weight when positive
- [x] Table header stays pinned while the body scrolls
- [x] No 個別会費調整中 badge anywhere (removed by Q-12)

## Gate 3 — search, filters, banner (FR-019 – FR-030)

- [x] Search by member name and by application number both work
- [x] **Search finds a row that is not on the current page** — this is the FR-019a check; a page-local search would fail it
- [x] Each filter narrows the result: 種別 · ステータス · ブランド (all five: Joyfit, Joyfit24, JoyfitYoga, JoyfitPlus, Fit365) · 店舗 · 予定日
- [x] **予定日 actually filters** — pick 今月 and confirm the rows change (the V0 control was inert)
- [x] ブランド matches the record's brand, not the store-name prefix — verify with a store whose name and brand differ
- [x] Active filters highlight their control and increment the count badge on 詳細フィルター
- [x] The header store scope does **not** count toward the badge
- [x] Filter-result banner reads 「全 N 件中 M 件を抽出中」 followed by a `・`-joined summary in the order 種別 → ステータス → ブランド → 予定: → 店舗
- [x] 条件をクリア resets everything and returns to page 1
- [x] Filtered-to-zero shows 「条件に一致する休会・退会がありません」 with a 条件をクリア button
- [ ] Genuinely empty scope shows 「休会・退会がまだありません」 **without** that button

## Gate 4 — pagination & sorting (FR-031 – FR-035a)

- [x] Page-size selector offers **25 / 50 / 100** — and **not 200**
- [x] Default page size is 25
- [x] Footer summary reads 「全 N 件 / M ページ / X-Y を表示」
- [x] 前へ dimmed on page 1; 次へ dimmed on the last page
- [ ] With more than 7 pages, ellipses appear and the first and last page stay reachable
- [x] Changing page size returns to page 1
- [x] Filtering down while on a high page clamps to the last available page rather than showing a blank table
- [x] **No column header sorts** — every header is plain text, as in V0 (Q-13, reversed back 2026-08-06)
- [x] Ordering is 予定日 ascending — most imminent first — applied server-side

## Gate 5 — cancel from the list (FR-045 – FR-052)

- [x] Suspension rows have **no** row-action menu
- [x] Withdrawal rows have a row-action menu
- [x] 退会予定 + cancellable → 退会取り消し enabled
- [x] 退会予定 + not cancellable → disabled, tooltip 「利用開始日以降のため取り消し不可」
- [x] 退会処理待ち → disabled, tooltip 「退会処理が開始されているため取り消し不可」
- [x] Confirm dialog titled 「退会取り消しを実行しますか？」 naming the member in bold with the member number in parentheses, and the two-line body
- [x] Confirming shows the success toast and the row leaves the 退会予定 state
- [x] Cancelling or dismissing changes nothing
- [x] Cancelling the **same** application twice surfaces the server's conflict message rather than a false success

## Gate 6 — detail screen (FR-053 – FR-079)

- [x] Back link 「休会・退会管理に戻る」 returns to the list
- [x] Title reads 「{name} さんの{休会|退会}申請」
- [x] Header badges: application **number** (monospaced) + status badge (secondary for 処理完了, otherwise outline with a dot)
- [x] Head-up card shows photo, name, kana, 「ID: {member number}」, 「旧No: {legacy code}」, 「主契約店舗: {store}」, member-type badge, 「主契約: {name}」 badge, and 会員詳細を開く
- [x] The head-up card populates from the **same** request as the application — no second member lookup in the network tab (FR-057a)
- [x] Layout is 60/40 with the right column sticky while the left scrolls
- [x] 申請情報 labels switch by type: 休会開始月/休会終了月 vs 退会予定日/終了日 (`—`)
- [x] 承認フロー shows **2 steps** for suspensions and **3** for withdrawals, with **no** current-step highlight (intentional — Q-03)
- [x] 代理申請情報 card appears only for proxy applications, with 合意方法 as 来店/電話/メール/LINE
- [x] 関連情報 shows 休会費 `¥{n}/月` for suspensions and **a real 退会手数料 amount** for withdrawals — not `—`
- [x] 未消化レッスン shows a count for **both** types
- [x] 休会・退会履歴 strip: 12 months, 今月 badge and highlight, state badges, application numbers, period label, prev/next disabled at the range ends, 今へ戻る only when today is off-window, legend, 他の申請一覧を見る
- [x] Status card shows the right tone/icon/label per status and 「最終更新: …」
- [x] Action area appears **only** for 退会予定 and 処理完了
- [x] 処理完了 shows 「処理が完了しています」 and no button
- [x] **No 承認 / 却下 / 退会処理を実行 buttons anywhere** — removed by scope
- [x] Detail 退会取り消し dialog titled 「退会を取り消しますか？」 with a 取り消す action
- [x] Confirming it **actually cancels**, gives feedback and refreshes the detail (the V0 no-op is a defect)
- [x] A completed application's detail is still reachable by URL even though it never appears in the list

## Gate 7 — loading & errors (FR-081 – FR-083)

- [x] Throttle the network: the list shows a skeleton while the toolbar and filters stay mounted and usable
- [x] Detail shows its skeleton while loading
- [x] Force a list request to fail → error state with a retry action, not an empty table
- [x] Force a cancellation to fail → the view is kept and the server's message is surfaced
- [x] Unknown or out-of-scope detail id → not-found treatment, not a blank page and not a permission error

## Gate 8 — parity sweep

- [x] Walk [checklists/parity.md](./checklists/parity.md) and tick each of the 116 active items
- [x] **Read each item before ticking** — several deliberately depart from the V0 mockup (PAR006, PAR014, PAR015, PAR027, PAR078, PAR084, PAR107, PAR134). Diffing against V0 alone will mislead.
- [x] PAR072 is the only blocked item; it is resolved by FR-031 (25/50/100)

## Known gap — not a defect

A-03 L144 requires the current step of the 承認フロー timeline to be highlighted. Phase 1 does **not** implement this: it was deferred pending a UI treatment (Q-03), and the deferral is recorded in spec.md → Out of Scope. Do not raise it as a bug; do raise it before the feature is signed off against A-03.

---

## Verification record — 2026-08-06

Gates 0–8 worked through against `next dev` with the seeded mock DB, driven headlessly with Playwright across the Headquarter, Manager, Staff, Observer and Trainer roles. `npx tsc --noEmit` and `npm run lint` both clean; the OpenAPI document and client were regenerated after the final schema change and the diff is limited to the intended `scope_store_id` addition.

Notes on three items whose observed behaviour is worth recording:

- **Gate 1, Trainer** — the denial card never renders because the project-wide route guard (`/members/leaves` → `Permission.MembersLeavesView`) serves the shared 403 page first and the sidebar omits the entry. Stricter than the specified behaviour, not weaker. See the parity verification record.
- **Gate 4, ellipsis — left unticked.** Not reachable with the current seed: 132 rows at the largest page count (25/page) is 6 pages, and the ellipsis needs more than 7. The paging logic is the shared `TablePaginationWithSize`, already exercised by other screens. Re-check when the dataset grows.
- **Gate 3, genuinely empty scope — left unticked.** Every seeded store has at least one application, so the plain 「休会・退会がまだありません」 variant (no 条件をクリア button) has no reachable state to observe. The branch is wired — `Empty` receives `variant="empty"` and no `onAction` when no filter is active — but it has not been seen rendered. Re-check against a store with no history.
- **Gate 6, completed application reachable by URL** — verified through the equivalent path: a cancelled application (`lv-008`) leaves the list (`search` returns 0) while `GET /crm/leaves/lv-008` still answers `200`. Completed applications leave the list by the same mechanism (the row is dropped from `_rows`, the detail is retained).

A defect was found and fixed during Gate 1: the header store scope hid the 店舗名 column without narrowing the query, so a Manager saw rows from every managed store with no way to tell them apart. Fixed via a new `scope_store_id` parameter — details in [checklists/parity.md](./checklists/parity.md).
