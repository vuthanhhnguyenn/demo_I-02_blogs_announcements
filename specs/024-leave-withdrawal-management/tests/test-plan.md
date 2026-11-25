# Test Plan: Leave & Withdrawal Management (A-03)

**Feature spec**: [spec.md](../spec.md) (A-03 `260901_v3` @ fitness-spec `5c391cf`, prototype @ `47423ec` — synced 2026-10-05, Q-17)
**PO Spec**: `A-03` — 休会・退会管理一覧 (Leave & Withdrawal Management List)
**Created**: 2026-08-07 · **Rewritten**: 2026-10-06 (phase 2 — real API; supersedes the mock-DB plan written against A-03 `260527_v2`)
**Integration round**: **Round 1** on the real dev backend (API-092, commit `82cf3a09`). List, filters, 月別ビュー, both details, head-up card, 休会・退会履歴 strip and 退会取り消し all call the real API — **nothing on these screens is mocked any more**. The integration is a **limited** one by the user's decision of 2026-10-05: four server gaps remain (§6).
**Gap register**: there is no `integration-plan.md` for this feature; §6 is carried from [api-integration-output/member-leave/report.md](../../../api-integration-output/member-leave/report.md).
**Consumed by**: `gen-testcases` → `execute-testcases`

> The two TC docs currently under `cases/` (2026-08) predate this plan — they cover free-text search, the retired 取り消し済み audit block, a dialog without 取り消し理由, mock-DB seed rows and "no 月別ビュー / no 個別会費調整中" absence assertions that A-03 v3 reversed. `gen-testcases` must **regenerate** them from this plan, not patch them.

---

## 1. Scope

**In scope** — the A-03 screens on two routes, split into three units:

- **休会・退会管理 — 一覧 view** `/members/leaves` — page header + filtered count, Trainer denial card, toolbar (詳細フィルター left, 一覧 / 月別ビュー toggle right), filter panel (種別 / ステータス / 店舗 / ブランド / 予定日), filter-result banner, table (会員ID … 未納金 + row ⋯ menu), pagination footer, empty / loading / error states. The **退会取り消し dialog** (`退会取り消しを実行しますか？` + 取り消し理由) exists only inside this view and is tested with it.
- **休会・退会管理 — 月別ビュー** `/members/leaves?view=…` — the member × 7-month grid, its tooltips, the extra 表示 filter, its empty / error states.
- **休会・退会申請詳細** `/members/leaves/[id]` (`?type=suspension|withdrawal`) — back link, title + state badge + 個別会費調整中 badge, member head-up card, 申請情報, 承認フロー timeline, 代理申請情報, 関連情報, 休会・退会履歴 strip, sticky status card (退会取り消し / 処理完了 text / 休会中 hand-off). The detail's own **退会取り消し dialog** (`退会を取り消しますか？`) is tested with it. The two dialogs deliberately keep different wording (Q-08) — not a defect.

**Out of scope** (a case may confirm the navigation fires, never the destination's behaviour):

- **A-01-01 会員詳細** — target of 会員名 (一覧 / 月別ビュー member cell), 会員詳細を開く, 「会員詳細で休会を解除する」. Its own 休会・退会履歴 strip and 「申請一覧を見る」 belong to [specs/032-member-detail](../../032-member-detail). Its status-change sheet (休会 / 退会申請) is used **only as a data-setup step** (§8).
- **A-01 member list / C-01 enrolment** — used only to create throw-away members.
- **臨時休会 `emergency-suspension`** (A-03 FR-003) — separate HQ-only screen; must not appear in the A-03 list (A-03 L153).
- **Application creation / approval / rejection / 休会 release** — raised on A-01-01; withdrawal execution and suspension start/end are System batches. No such affordance may exist on these screens (its presence is a **defect**).
- **変更履歴 tab / `statusHistories` rendering** (Q-14) — absence is asserted on the detail.
- **History mutation** (FR-074) — no create/update/delete path may exist.
- **Free-text search** (FR-019 / FR-019a retired, Q-17) — absence is asserted on the list.
- **Header store-scope selector** and **「デモ: ユーザー切替」** — shared header; treated as preconditions.

---

## 2. Unit table

Three units. The detail is its own route with its own data contract. The list route is split by **view**: 一覧 and 月別ビュー share the filter panel but render different surfaces from different fetch strategies — 一覧 is one paginated page, 月別ビュー walks every page of the filtered set at `limit=100` and aggregates per member (FR-043) — and they have disjoint element sets (row menu + pagination vs month grid + tooltip + 表示 filter). Filter mechanics are tested once, in Unit 1; Unit 2 only checks that the same filters drive the grid, plus its own 表示 filter. Each dialog stays with the screen that raises it.

| #   | Unit         | Screen(s)                                                                          | Route                                   | TC doc filename                                                |
| --- | ------------ | ---------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| 1   | Leave list   | 休会・退会管理 一覧 view + row ⋯ menu + 退会取り消し dialog                        | `/members/leaves`                       | `TC -【Fitness CRM】- [A-03][休会・退会管理（一覧）].md`       |
| 2   | Monthly view | 休会・退会管理 月別ビュー (grid, tooltip, 表示 filter)                             | `/members/leaves` (月別ビュー selected) | `TC -【Fitness CRM】- [A-03][休会・退会管理（月別ビュー）].md` |
| 3   | Leave detail | 休会・退会申請詳細 + head-up card + 履歴 strip + status card + 退会取り消し dialog | `/members/leaves/[id]?type=…`           | `TC -【Fitness CRM】- [A-03-01][休会・退会申請詳細].md`        |

All TC docs live under `specs/024-leave-withdrawal-management/tests/cases/`.

> Screen ID note: `A-03.md` assigns no id to the detail screen; `A-03-01` follows the repo's `A-01` / `A-01-01` convention.

---

## 3. Sources per unit

| Unit             | Spec sections                                                                                                                                                                                                                            | UI prototype file                                                                | FRs covered                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1 — Leave list   | §Scope, Clarifications › 2026-10-05, US1 AS-1…11, US3 AS-1…7 & AS-12, Edge Cases 1–7 & 10, FR-001 – FR-035a, FR-045 – FR-052, FR-081 – FR-082a, Backend mapping (list, filter, cancellation guard, cancellation reason), SC-001 – SC-010 | `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (一覧 block, dialog L958–L1002) | FR-001 – FR-018 (incl. FR-008a, FR-014), FR-020 – FR-035a, FR-045 – FR-052, FR-081, FR-082, FR-082a |
| 2 — Monthly view | US1 AS-11…14, Edge Cases 8–9, FR-014, FR-026 – FR-029 (表示 filter parts), FR-036 – FR-044, Q-02, Q-17                                                                                                                                   | `.cache/fitness-crm-ui/src/pages/leave-list.tsx` (L242–L314, L773–L891)          | FR-036 – FR-044 (+ FR-014 in the member cell / tooltip, FR-026 / FR-028 / FR-029 for 表示)          |
| 3 — Leave detail | US2 AS-1…10, US3 AS-8…12, Edge Cases 5–7, FR-006, FR-053 – FR-083, Key Entities (Timeline, Member summary), Q-03, Q-07, Q-08, Q-15, Q-16                                                                                                 | `.cache/fitness-crm-ui/src/pages/leave-detail.tsx`                               | FR-006, FR-053 – FR-080a (excl. retired FR-079a), FR-081 – FR-083                                   |

**Requirement doc** `.cache/fitness-spec/crm/requirements/A-03.md` (`260901_v3`) — read only: **FR-001** (display items incl. 個別会費調整中 and 月別ビュー・休会退会履歴, filter conditions, drill-down), **FR-002** (cancellation rule, 有効（通常） after cancel, mandatory 取り消し理由, Timeline / 代理申請情報 / 関連情報, 異常系), the 用語定義 table and the **権限マトリクス**. Skip FR-003 臨時休会.

**Parity source**: [checklists/parity.md](../checklists/parity.md) — Unit 1 and Unit 2 share the "List — …" sections (PAR001–PAR074; 月別ビュー items go to Unit 2), Unit 3 owns "Detail — …" (PAR075–PAR134). Parity predates v3: items struck through by Q-10 / Q-11 / Q-12 and the "absence" items for 月別ビュー / 個別会費調整中 are **reversed by Q-17** — where a PAR item contradicts spec.md, **the spec wins** and the case Notes cite the PAR id.

---

## 4. Spec-vs-prototype deltas

`gen-testcases` must mark each in the affected case's **Notes** (`Spec-only` / `Conflict (spec wins)` / `Open decision`). **C1–C3 are open**: the integrated build follows a third source, so the case outcome depends on a decision that has not been taken — resolve them with the user / PO before execution.

| #   | Item                                   | In spec                                                           | In prototype                                    | How to test                                                                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | 承認フロー steps + current highlight   | 2 / 3 steps, **no** highlight (FR-064a, Q-03 deferral)            | 2 / 3 steps, no highlight                       | **Open decision.** A-03.md FR-002 v3 demands 「現在のステップをハイライト表示」 and the integrated build renders the server's `timeline.steps` (休会 4 steps 申請 → 休会承認 → 休会開始 → 休会終了, current step highlighted). Cases written to the spec; if the decision follows A-03.md / the build, FR-064a must be amended and the cases rewritten.             |
| C2  | ブランド filter                        | 全ブランド + five brands, matched on `brandEnum` (FR-024, Q-04)   | 全ブランド / JOYFIT / FIT365, store-name prefix | **Open decision.** The integrated build uses the JOYFIT / FIT365 **group** on `brandGroup` (qa-155 ④, matches the prototype's options but on the record's brand). The project rule "spec vs prototype → follow the prototype" points to the group. Write the case to the decision; either way the match must be on the record's brand, never the store-name prefix. |
| C3  | Head-up card source (FR-057a)          | Inline member block, **no** second member request                 | — (static)                                      | **Open decision.** The build reads the card from `GET /admin/members/{memberId}` (QA #158). Do not assert the request count until decided; assert the fields (FR-057).                                                                                                                                                                                              |
| D1  | Default page size                      | 25 (options 25 / 50 / 100)                                        | 50 (options 25 / 50 / 100)                      | Conflict (spec wins, Q-06): assert 25 on first load.                                                                                                                                                                                                                                                                                                                |
| D2  | 退会手数料                             | The withdrawal's real fee (FR-067, Q-07)                          | Hardcoded `—`                                   | Conflict (spec wins): assert the amount.                                                                                                                                                                                                                                                                                                                            |
| D3  | 承認待ち branch of step 2              | Dropped — step 2 always complete (FR-063, Q-16)                   | Clock + 「承認待ち」 when status 申請中         | Conflict (spec wins): no case for 承認待ち.                                                                                                                                                                                                                                                                                                                         |
| D4  | Withdrawal months in 月別ビュー        | Withdrawal occupies its due-date month (FR-039, Q-02)             | Never renders (string-compare defect)           | Conflict (spec wins): a withdrawal row must show its month badge.                                                                                                                                                                                                                                                                                                   |
| D5  | 月別ビュー pagination footer           | None; whole filtered set (FR-043)                                 | Footer under both views (decorative)            | Conflict (spec wins): assert no footer in 月別ビュー.                                                                                                                                                                                                                                                                                                               |
| D6  | Member drill-down (`member_id`)        | Banner 「会員: …」, list narrowed to the member (FR-027 / FR-028) | Not shown                                       | Spec-only — **Block (B2)** for the narrowing.                                                                                                                                                                                                                                                                                                                       |
| D7  | Loading / error / not-found            | FR-081 – FR-083                                                   | None (static constants)                         | Spec-only: fake failures via route interception.                                                                                                                                                                                                                                                                                                                    |
| D8  | Server re-check & double cancel        | FR-052, Edge Cases 5–7                                            | —                                               | Spec-only: two-tab and console-replay cases.                                                                                                                                                                                                                                                                                                                        |
| D9  | Trainer denial                         | In-screen denial card (FR-002)                                    | Same card                                       | Known deviation: route guard serves the project 403 page first and the sidebar hides the entry — record **OK-with-note**, not NG.                                                                                                                                                                                                                                   |
| D10 | 処理完了 in the list                   | Not in list or ステータス filter (FR-010, FR-022, Q-10)           | Fifth state + filter option                     | Conflict (spec wins): assert absent; 処理完了 tested on the detail only.                                                                                                                                                                                                                                                                                            |
| D11 | 取り消し済み on the detail status card | Only the state; no audit block (FR-079a retired)                  | Same                                            | Assert no 実行日時 / 実行者 block.                                                                                                                                                                                                                                                                                                                                  |
| D12 | Detail `?type=` fallback               | — (one detail, two endpoints)                                     | —                                               | Spec-only (qa-160, FE decision): with / without / wrong `type` cases in Unit 3.                                                                                                                                                                                                                                                                                     |

---

## 5. Coverage focus per unit

Added to — not a replacement for — gen-testcases' full coverage walk.

### Unit 1 — Leave list (一覧)

**Business logic**

- **Role × scope gating (FR-001 – FR-006, SC-007/008):** Trainer → denial card 「この画面を表示する権限がありません」 / 「休会・退会管理はトレーナーロールでは参照できません。」 and nothing else (or the project 403 page — see §8 deviation); Staff / Observer own store, Manager managed stores, HQ / System all. Observer reads but 退会取り消し is non-actionable with a permission badge.
- **Header scope vs in-screen 店舗 filter (FR-004, FR-005, Edge Cases 1–2):** single-store header hides the 店舗名 column **and** the 店舗 filter **and** resets a chosen store to 全店舗; header scope never counts toward the badge nor appears in the banner. 店舗 filter shown only for all-stores view with ≥ 2 accessible stores.
- **Columns & type-dependent cells (FR-008 – FR-013, FR-015):** column order incl. **種別** (FR-008a — info 休会 / destructive 退会 outline badge); 会員ID = member number (mono, muted), never a UUID; 予定日 = suspension start vs withdrawal due date; 終了日 = end month vs `—`; 未納金 `¥0` muted vs `¥{n}` destructive+medium, never blank; brand badge in the brand's own notation.
- **個別会費調整中 badge (FR-014):** under 会員名 when the member has an adjustment in force — written to the spec, recorded **Block (B3)**.
- **No search box (FR-019 retired):** toolbar holds 詳細フィルター + view toggle only.
- **Filter panel (FR-020 – FR-025a, FR-030):** toggle label 詳細フィルター ⇄ 閉じる, chevron, filled style + count badge while active, **no 「すべてクリア」 inside the panel**; each filter alone then combined (AND). 種別 × ステータス contradiction (休会 + 退会予定) → filtered empty state. 予定日 今月 / 来月 / 今年 as inclusive JST ranges on the **real clock** (run date 2026-10-06 → 今月 = 2026-10-01…10-31) — check a row on the first and last day of the window where data permits.
- **ブランド filter (FR-024):** see §4 **C2** — open decision between the spec's five brands and the built JOYFIT / FIT365 group.
- **Banner accounting (FR-027 – FR-029, SC-010):** 「全 N 件中 M 件を抽出中」, summary order 会員: → 種別 → ステータス → ブランド → 予定: → 店舗, `・`-joined, defaults omitted; title count = banner M = footer total. N (scoped total before in-screen filters) → **Block (B1)**; the `会員:` drill-down part → **Block (B2)**. 条件をクリア resets everything and returns to page 1 without changing the view.
- **Empty-state split (FR-018):** 「条件に一致する休会・退会がありません」 **with** 条件をクリア vs 「休会・退会がまだありません」 **without** it (needs an empty scope — §8).
- **Pagination (FR-031 – FR-035):** default **25**, options 25 / 50 / 100, **no 200**; footer 「全 N 件 / P ページ / X-Y を表示」; 前へ / 次へ dimmed at ends; ≤ 7 page links with ellipsis beyond 7 pages; page-size change → page 1; page beyond range (URL edit or after filtering) clamps; scroll-to-top on page change.
- **No sort (FR-035a):** plain headers; rows in 予定日 ascending.
- **Row click isolation (FR-009, FR-017):** row → that application's detail (with the right `?type=`); 会員名 → member detail only; ⋯ cell never navigates.
- **Row-menu guard matrix (FR-045 – FR-048):** menu on withdrawal rows only; 退会取り消し enabled only for 退会予定 **and** `cancellable`; tooltips 「利用開始日以降のため取り消し不可」 vs 「退会処理が開始されているため取り消し不可」; no menu on suspension rows.
- **Cancellation dialog (FR-049 – FR-051, US3 AS-6/7):** exact title/body (`**{name}**（{会員ID}）…この操作は記録されます。`); 取り消し理由 required — label with required mark, placeholder, helper 「操作履歴に記録されます（500文字以内）」, 500-char cap; 取り消しを実行する disabled for empty **and whitespace-only**; キャンセル / Esc / outside-click discards the reason (reopen → empty); success toast 「{name} の退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。」; row leaves the list.

**Real-API behaviours**

- **Server-enforced scope (FR-003):** compare the HQ list with Staff / Manager / Observer — counts in title, banner and footer equal the server total for that account. A row outside the account's scope appearing is a **BE** issue (note it, see §8 Known-gap policy), not an FE NG.
- **Server filters:** every filter value round-trips to the server (`applicationType`, `displayStatus`, `brandGroup`, `storeId`, `scheduledFrom/To`, `page`, `limit`) and reload restores it from the URL.
- **Cancellation guard, server-side (FR-052, Edge Cases 5–7):** two tabs → cancel in A, cancel the same row in B → `409 E-WDR-200` message surfaced, no second success toast, B refreshes; `422 E-WDR-201` (usage started) message surfaced when the data exists. Comment rules enforced by the server too: whitespace-only / > 500 chars sent via console replay → `400`, nothing changed.
- **Server-enforced role:** as Observer, replay `POST …/withdrawal-applications/{id}/cancel` from the console with the session's own token → refused (403); application unchanged.
- **Persistence:** after cancel, reload and re-login → row gone from the list; its detail reads 取り消し済み; the member's head-up status (Unit 3) is 有効, not 仮 (A-03 FR-002 v3).
- **401 expiry:** clear the Cognito tokens with the list open, then filter / page / confirm a cancel → login redirect, no mutation; after re-login the list comes back.
- **Error state (FR-081, FR-082, FR-082a):** list 5xx / network drop → error state with retry, not the empty state; toolbar stays mounted during loading; cancel 5xx → toast with the server message, dialog/list unchanged.

**UI breakage under stress (1024 × 768 first, then ≥ 1440px)**

- Max-length full-width Japanese 会員名 and an equally long unbroken token in 会員名, a long 店舗名, the longest status badge (退会処理待ち) next to 種別 and ブランド badges, a 7-digit 未納金 — no overlap, no clipped badge, table scrolls inside its container (no page-level horizontal scroll).
- Banner summary with every filter active + `会員:`; 店舗 select with the full dev store list.
- Dialog body with the max-length name; a 500-char unbroken 取り消し理由 (textarea must wrap / scroll, buttons stay visible); toast with the max-length name.

### Unit 2 — Monthly view (月別ビュー)

**Business logic**

- **Toggle (FR-036):** 一覧 / 月別ビュー at the toolbar right, default 一覧; selection kept in the URL — reload and browser back restore it; 条件をクリア does not change the view.
- **Grid shape (FR-037):** one row per member, seven `YYYY/MM` columns centred on the current month (run date 2026-10-06 → 2026/07 … 2027/01).
- **Member cell (FR-038):** 会員ID (mono, muted), 会員名, brand badge, 店舗名 (all-stores view only), 個別会費調整中 badge (**Block (B3)**); click → member detail; long name / store wraps inside the cell.
- **Month cells (FR-039, FR-040, Q-02):** suspension covers start month → end month; withdrawal covers exactly its due-date month (the prototype's withdrawal-never-appears defect must not reproduce); 退会処理待ち abbreviated 「退会待ち」; `—` when uncovered; overlap priority 退会予定 → 退会処理待ち → 休会中 → 休会予定.
- **Tooltip & click (FR-041):** 申請ID, 種別, ステータス, 申請日, 予定日, 終了日 (when present), 未納金 (only when > 0), 個別会費調整中 (B3); month click → that application's detail.
- **表示 filter (FR-042, FR-026, FR-028):** only in 月別ビュー; options 「表示: 全て（休会・退会）」 / 「表示: 休会のみ」, trigger 「表示: 全て」 / 「表示: 休会のみ」; counts toward the badge and appears last in the banner summary as 「表示: 休会のみ」; hidden after switching back to 一覧.
- **Shared filters drive the grid:** spot-check one value per filter + header scope; counts in header / banner = number of **applications** in the filtered set (FR-043), not members.
- **Whole-set evaluation (FR-043, Edge Case 8):** a member whose applications sit on different pages of the paginated endpoint still gets every month right; no pagination footer in 月別ビュー.
- **Empty / error (FR-044):** filtered vs plain empty states as in 一覧; error with retry.

**Real-API behaviours**

- 月別ビュー requests every page at `limit=100` — verify in the network panel that it pages until `totalPages` and that filters / scope go on every page request.
- Scope per role as in Unit 1; 401 while switching views → login redirect.

**UI breakage under stress (1024 × 768, then ≥ 1440px)**

- Max-length 会員名 and long unbroken token, long 店舗名, both badges in the member cell — month columns must stay in view (the cell wraps, FR-038); tooltip with the max-length name and a 7-digit 未納金 stays inside the viewport at the rightmost column.

### Unit 3 — Leave detail

**Business logic**

- **Header (FR-053 – FR-056):** back link 「休会・退会管理に戻る」 → list; title 「{name} さんの{休会|退会}申請」; state badge (plain secondary at 処理完了 / 取り消し済み, else outline + dot); **no application-ID badge**; 個別会費調整中 badge with glossary tooltip → **Block (B3)**.
- **Head-up card (FR-057):** photo, name, kana, 会員ID, 旧No, store, member-type badge, 主契約 badge, 会員詳細を開く → member detail. Missing kana / photo / plan on a seed member renders a clean empty presentation, not `undefined`. FR-057a (single request) — see §4 **C3**.
- **申請情報 (FR-058 – FR-060):** 申請ID = application number (mono); 種別 badge tone; 休会開始月 / 休会終了月 vs 退会予定日 / 終了日 `—`; withdrawals only: full-width **利用開始日** `YYYY/MM/DD` + 「（利用開始前のため退会取り消し可）」 / 「（利用開始後のため退会取り消し不可）」, `—` when none (FR-059a); 理由 full width, 申請者, 申請日時.
- **承認フロー timeline (FR-061 – FR-064a):** see §4 **C1** — open decision. Written to the spec: 2 steps for suspensions, 3 for withdrawals, step 1 captioned timestamp + (proxy) applicant, step 2 always complete, step 3 complete only at 処理完了 (処理完了 / 待機中), no current-step highlight, no 休会開始 / 休会終了 steps.
- **代理申請情報 (FR-065, FR-066):** present only for proxy applications with 代理申請者 / 合意日時 / 合意方法 ∈ 来店 / 電話 / メール / LINE; absent otherwise.
- **関連情報 (FR-067, FR-068):** 休会費 `¥{fee}/月` vs 退会手数料 = the withdrawal's real fee (not a hardcoded `—`); 適用キャンペーン; 未消化レッスン `{n}回` on **both** types (suspension side → **Block (B4)**); 未納金 destructive when > 0.
- **休会・退会履歴 strip (FR-069 – FR-074):** 12-month window anchor−6 … anchor+5; 今月 badge + highlight; per-month badges + application ID beneath; period label; prev / next disabled at −24 / +12 months; 今へ戻る only while the current month is off-window; legend; 他の申請一覧を見る → list (its `member_id` filtering → **Block (B2)**); closed applications included (A-03 v3 「完了分含む」); no add / edit / delete affordance.
- **Status card (FR-075 – FR-079b):** five states × tone / icon / label + 「最終更新: …」, sticky while the left column scrolls; action area only for 退会予定 / 休会中 / 処理完了 (取り消し済み → no action area, no audit block — FR-079a retired); 処理完了 → 「処理が完了しています」; 休会中 → meta line 「休会の解除（早期復帰）は会員詳細のステータス変更から行います」 + 「会員詳細で休会を解除する」 → member detail.
- **Detail cancellation (FR-078, FR-080, FR-080a):** 退会取り消し for System / HQ / Manager / Staff; disabled tooltips 「利用開始日（YYYY/MM/DD）以降のため取り消し不可」 (date-less variant when unknown), 「退会処理が開始されているため取り消し不可」, 「退会取り消しの権限がありません」 (Observer). Dialog 「退会を取り消しますか？」 / 「{name} さんの退会予定を取り消します。…」 + the same 取り消し理由 rules as Unit 1 + キャンセル / 取り消す; confirm **really** cancels, toast 「{name} さんの退会申請を取り消しました。…」, detail refreshes to 取り消し済み.
- **Absence:** no 変更履歴 tab; no 承認 / 却下 / 復帰処理 / 退会処理を実行 buttons.

**Real-API behaviours**

- **Routing by `?type=` (qa-160):** `?type=withdrawal` / `?type=suspension` open directly; **no** `type` → suspension 404 then withdrawal 200 still renders the right detail; a **wrong** `type` for the id → still resolves or shows not-found, never another application's data or a crash.
- **Not-found / scope (FR-083):** unknown UUID, malformed id, and an existing application outside a Staff account's scope → 「対象の申請が見つかりません」 (not a permission error, not a blank page).
- **Closed applications by direct URL:** 処理完了 / 取り消し済み details answer by URL (they never appear in the list, Q-10).
- **Server guard:** stale page (cancel in tab A, confirm in tab B) → `409` message, detail refreshes; Observer console replay → 403; comment whitespace-only / > 500 → 400.
- **Persistence:** after cancel, reload + re-login → 取り消し済み; head-up / member status 有効（通常）; the list no longer has the row.
- **Partial failure:** member lookup or history strip API failing (fake 5xx via route) → that card shows its own error, the rest of the detail still renders.
- **401 expiry** with the dialog open and confirm → login redirect, no mutation.

**UI breakage under stress (1024 × 768, then ≥ 1440px)**

- Max-length 会員名 / long unbroken token in the title, head-up card, dialog body and toast; long kana; long 店舗名 and 主契約 name badges; long 理由 (full-width field wraps); long 代理申請者; 500-char 取り消し理由. The 60/40 columns must not collapse or overlap at 1024px; the status card stays sticky; the 12-month strip fits or scrolls inside its card.

---

## 6. Known Round 1 gaps

| Bn  | Blocker                                                                                                                                                                                                       | UI behaviour in Round 1                                                         | Test treatment                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `includeTotalAll` / `pagination.totalAllItems` missing on `GET /admin/suspension-withdrawal-applications` (in the design, dropped from dev swagger) — **BE**                                                  | The banner's 「全 N 件」 cannot be the scoped pre-filter total from the server  | Cases asserting N (FR-027, SC-010 for N) → `Block (B1)`. M, summary and 条件をクリア are tested normally.                                                                                                                                                                                                                                                       |
| B2  | No `memberId` filter param on the list (400 `E-VAL-001`) — qa-155 ②, client confirmed — **BE**                                                                                                                | `?member_id=` stays in the URL but is not sent: list shows the unfiltered scope | Member drill-down narrowing + 「会員: 」 banner part + 他の申請一覧を見る result → `Block (B2)`. The link's navigation itself is tested.                                                                                                                                                                                                                        |
| B3  | No `hasActiveFeeAdjustment` on list items / details — qa-155 ⑥, client confirmed (A-03 v3) — **BE**                                                                                                           | 個別会費調整中 badge hidden everywhere                                          | FR-014, FR-038 / FR-041 badge parts, FR-056 → `Block (B3)`. A badge appearing **without** the field is NG.                                                                                                                                                                                                                                                      |
| B4  | `relatedInfo.unusedLessonCount` missing on the **suspension** detail — qa-156 ① — **BE**                                                                                                                      | 未消化レッスン shows `—` on 休会 details (withdrawals OK)                       | FR-068 suspension half → `Block (B4)`.                                                                                                                                                                                                                                                                                                                          |
| B5  | Dev data is thin (3 list rows at integration; 1 suspension 休会中, 1 pending withdrawal, 1 already cancelled) and batch-driven states (退会処理待ち, 処理完了, 休会予定 → 休会中) cannot be created on demand | —                                                                               | Create what can be created (§8). Pure-UI rendering of states / volumes that cannot be created (pagination > 7 pages, 退会処理待ち row + tooltip, 処理完了 card, proxied application, cross-page 月別ビュー) → **fake data** via route interception, Notes say "fake data". Outcomes that depend on the server (guard codes, scope) with no data → `Block (B5)`. |

Not blockers (resolved in Round 1): cancellation `comment` required server-side; member status after cancel = `active` (有効); head-up card fields; 休会・退会履歴 strip via API-094.

---

## 7. Traceability map

Retired identifiers are listed so their gaps are visibly intentional.

| FR                   | Summary                                                                    | Unit(s)                   |
| -------------------- | -------------------------------------------------------------------------- | ------------------------- |
| FR-001 / FR-002      | Role access; Trainer denial                                                | 1 (+2, 3 spot)            |
| FR-003               | Store scope (server)                                                       | 1, 2, 3 (FR-083)          |
| FR-004 / FR-005      | Header single-store hides column + filter, resets; 店舗 filter condition   | 1 (+2 member cell)        |
| FR-006               | 退会取り消し roles                                                         | 1, 3                      |
| FR-007               | Title + filtered count                                                     | 1, 2                      |
| FR-008 / FR-008a     | Column set & order; 種別 badge                                             | 1                         |
| FR-009               | 会員ID = member number; 会員名 link isolation                              | 1                         |
| FR-010               | Four state badges, no fifth                                                | 1                         |
| FR-011 – FR-013      | 予定日 / 終了日 / 未納金 by type                                           | 1                         |
| FR-014               | 個別会費調整中 badge (list)                                                | 1, 2 — B3                 |
| FR-015               | Brand badge, own notation                                                  | 1, 2                      |
| FR-016 – FR-018      | Pinned header; row click; empty-state split                                | 1 (+2 FR-018 via FR-044)  |
| ~~FR-019 / FR-019a~~ | _retired (Q-17) — absence asserted in 1_                                   | —                         |
| FR-020 – FR-025a     | Filter panel, 種別 / ステータス / 店舗 / ブランド / 予定日                 | 1 — C2                    |
| FR-026 – FR-030      | Active count, banner, summary order, 条件をクリア, highlight               | 1 (+2 表示) — B1, B2      |
| FR-031 – FR-035a     | Pagination, clamping, scroll-to-top, no sort                               | 1                         |
| FR-036 – FR-044      | 月別ビュー toggle, grid, cells, priority, tooltip, 表示, whole set, states | 2                         |
| FR-045 – FR-048      | Row menu + guard / tooltip matrix                                          | 1                         |
| FR-049 / FR-049a     | List dialog copy; required 取り消し理由                                    | 1 (+3 FR-049a via FR-080) |
| FR-050 – FR-052      | Cancel effect + toast; dismiss; server re-check                            | 1 (+3 via FR-080a)        |
| FR-053 – FR-056      | Detail header, title, state badge, no ID badge, 個別会費調整中             | 3 — B3                    |
| FR-057 / FR-057a     | Head-up card; single request                                               | 3 — C3                    |
| FR-058 – FR-060      | 申請情報 incl. 利用開始日 (FR-059a)                                        | 3                         |
| FR-061 – FR-064a     | 承認フロー timeline                                                        | 3 — C1                    |
| FR-065 / FR-066      | 代理申請情報                                                               | 3 — B5 (data)             |
| FR-067 / FR-068      | 関連情報                                                                   | 3 — B4                    |
| FR-069 – FR-074      | 休会・退会履歴 strip; seed-only                                            | 3 — B2 (link result)      |
| FR-075 – FR-079      | Status card matrix, action area, detail 退会取り消し, 処理完了             | 3                         |
| ~~FR-079a~~          | _retired (Q-17) — absence asserted in 3_                                   | —                         |
| FR-079b              | 休会中 hand-off                                                            | 3                         |
| FR-080 / FR-080a     | Detail dialog; confirm really cancels                                      | 3                         |
| FR-081 / FR-082      | Skeletons with toolbar mounted; error + retry                              | 1, 2, 3                   |
| FR-082a              | Cancel failure → stay + server message                                     | 1, 3                      |
| FR-083               | Unknown / out-of-scope id → not-found                                      | 3                         |

**Requirements with no unit:** none — every live FR lands in ≥ 1 unit. FR-019 / FR-019a / FR-079a are retired and untraced on purpose.

**Success criteria:** SC-001 / SC-002 / SC-010 → 1 · SC-003 → 1 → 3 · SC-004 / SC-006 → 1 + 3 · SC-005 → 1 + 3 (timed happy path) · SC-007 / SC-008 → role sweep across 1–3 · SC-009 (100k-row performance) → **not testable** on dev (3 rows); recorded as N/A.

---

## 8. Execution notes (for execute-testcases)

- **Credentials** — real Cognito accounts from `src/lib/auth/demo-users.ts` (password `Password@123` for all):

  | Role        | Account                         | Used for                                                                                 |
  | ----------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
  | System      | `lodu4289+1@gmail.com`          | All stores; second HQ-level actor; fallback if the HQ login fails                        |
  | Headquarter | `lodu4289+headquater@gmail.com` | Default for every happy path, layout, stress and cancellation case                       |
  | Manager     | `lodu4289+manager@gmail.com`    | Managed-store scope (managed store at last check: JOYFIT 横浜 `…0203`); cancel permitted |
  | Staff       | `lodu4289+staff@gmail.com`      | Own-store scope (JOYFIT 横浜); cancel permitted; out-of-scope detail URL                 |
  | Trainer     | `lodu4289+trainer@gmail.com`    | Denial only                                                                              |
  | Observer    | `lodu4289+observer@gmail.com`   | Read-only, disabled 退会取り消し + permission badge, console replay                      |

  The pre-existing applications sit in 渋谷 (`…0201`) — Staff / Manager / Observer likely see **0 rows** unless a throw-away application is made in their store. Permission = role tier **AND** the `/crm/me` position flag: a control disabled by role tier although the flag is true is not NG. The header's 「デモ: ユーザー切替」 only appears when `NEXT_PUBLIC_APP_ENV=development`; otherwise sign out / in. One account = one live session — run two-tab cases as two tabs of the **same** browser session. The HQ session token has been seen to expire within minutes — re-login before each batch.

- **Environment** — app on **`http://localhost:3000`** pointing at `NEXT_PUBLIC_REAL_API_URL` = `https://api.dev.fitness-v2.okamoto-hd.com`; the backend allows CORS only from `localhost:3000` (check which checkout owns the port first). The backend is **shared** with other developers and testers: rows can change mid-run, so assert relationships (title = banner M = footer) rather than fixed numbers, and re-read the data at run start.

- **Data policy** — **no seed reset exists**; 退会取り消し is irreversible (no undo endpoint).
  - **Off-limits — read-only cases only, never cancel**: the pre-existing 休会中 application of **JF-0000038** (`2c84532a…`) and the pending withdrawal of **JF-0000284** (`5ddf23e5…`). The already-cancelled application of **JF-0000287** (`3d5e39fa…`) is the read-only 取り消し済み fixture.
  - **Create your own**: throw-away members named with prefix **`QA-TC-A03-<yyyymmdd>-<n>`** (procedure: `POST /admin/applications` `sbps_credit`, then bring the member to 有効), then file a withdrawal / suspension from A-01-01's status-change sheet or `POST /admin/members/{memberId}/status-changes/withdrawal`. One cancellation consumes one withdrawal — make one per mutating case (list cancel, detail cancel, double-cancel, 401-mid-cancel). Make at least one in **JOYFIT 横浜** so the Staff / Manager / Observer cases have rows, and one with a **max-length full-width name** for the stress cases. Put the same prefix in every 取り消し理由.
  - **Fake data** (route interception on the GET, Notes say "fake data") for pure-UI states the backend cannot be driven into — see B5. Never fake a server outcome (guard code, scope) to pass a case.
  - **Live writes**: if the session refuses live POSTs, mock the cancel POST via route (201 / 409 / 422 / 400 / 401) to cover FE handling, and list the real-write cases as **Untested** with the reason.
  - **Cleanup**: cancelled applications cannot be deleted — leave them and list the member numbers / application ids created in the TC doc's run notes.

- **Known-gap policy** — a failure matching a §6 row → `Block (Bn)`; an open §4 decision (C1–C3) → hold the case until decided, then record per the decision as `[PO decision]`; an undocumented FE failure → `NG`. Server-semantics issues (scope leaks, wrong amounts / dates returned by the API) are BE notes for the integration report, not FE NG.

- **Date-dependent cases** — 予定日 presets, the 月別ビュー window, the 履歴 strip anchor and the usage-start guard all use the real JST clock. Record the run date on each case and derive expectations from it (run date at writing: 2026-10-06).

- **Viewport** — layout cases at **1024 × 768** (supported floor) and one wide pass at **≥ 1440px**; below 1024px is out of scope.

- **Account safety** — no lockout case in this feature; do **not** type wrong passwords. For 401 cases, clear the Cognito tokens in the browser instead of waiting for expiry.

- **Scope discipline** — a defect found on A-01-01, the sidebar or the header is reported, not fixed here.

---

## 9. Suggested order

1. **Resolve C1–C3** with the user / PO — they change expected results in Units 2 and 3.
2. **Data setup** — create the `QA-TC-A03-*` members and withdrawals / suspensions (incl. JOYFIT 横浜 and max-length-name ones); note ids. Everything mutating depends on them.
3. **Unit 1 read-only** (HQ) — access, columns, filters, banner, pagination, row-menu guards, dialog validation **without confirming**, empty / error, stress. Safe on shared data.
4. **Unit 2** (HQ) — read-only by nature; reuses the filter knowledge from Unit 1.
5. **Unit 3 read-only** (HQ) — header, head-up, 申請情報, timeline, 代理申請情報, 関連情報, strip, status card per state, routing / not-found, stress.
6. **Role sweep** (System, Manager, Staff, Observer, Trainer) across all three units, including the Observer console replay — no mutations.
7. **Mutations last** — Unit 3 detail cancel, then Unit 1 list cancel, the two-tab 409 and the 401-mid-cancel cases; each consumes one throw-away withdrawal.

---

## 10. Definition of done

- [ ] Three TC docs generated by `gen-testcases` from this plan (§2 filenames) — the two existing docs regenerated, not patched; §4 deltas marked in Notes; §6 rows wired to `Block (Bn)`.
- [ ] C1–C3 decided and recorded in the affected cases' Notes as `[PO decision]`.
- [ ] Every live FR in §7 traced to ≥ 1 case in its unit; parity items reconciled against v3 (Q-17 reversals) and gaps fixed in the docs **before** execution.
- [ ] Each doc executed once across the §8 role matrix, OK / NG / Block recorded, every Block carrying its Bn or reason, fake-data cases labelled.
- [ ] Created `QA-TC-A03-*` members / applications listed in the run notes; no off-limits application was cancelled.

---

## Next step

Run **`gen-testcases`** on **Unit 1 — Leave list** (sources §3, coverage focus §5, deltas §4, gaps §6), after C1–C3 are settled.
