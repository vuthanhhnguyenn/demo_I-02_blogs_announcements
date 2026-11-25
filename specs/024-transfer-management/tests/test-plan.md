# Test Plan: Transfer Management (Member Store Transfers)

**Feature spec**: [spec.md](../spec.md) (Last Updated 2026-10-06, A-02 v3 + prototype @ 47423ec)
**PO Spec**: `A-02` — 移籍管理一覧 (Transfer Management List)
**Created**: 2026-08-05 · **Rewritten**: 2026-10-05 (phase 2 — real API; supersedes the mock-DB plan written against prototype @ 1cc2d6d)
**Integration round**: **Round 1** on the real dev backend (API-091 `/api/v1/admin/transfer-applications`, commit 4fe1f967). List / filters / 承認 / 否認 / 一括承認 / detail call the real API; 手動解除 (縛り期間 manual release) has no endpoint of its own by design — it calls the real approve with the reason as `comment` (updated 2026-10-06).
**Gap register**: there is no `integration-plan.md` for this feature; the Round 1 gaps in §6 are carried from [api-integration-output/transfer-list/report.md](../../../api-integration-output/transfer-list/report.md) and [api-integration-output/transfer-detail/report.md](../../../api-integration-output/transfer-detail/report.md).
**Consumed by**: `gen-testcases` → `execute-testcases`

> The two TC docs currently under `cases/` (2026-08-28) predate this plan — they cover free-word search, 却下 wording, 200-row paging and mock-DB seed rows. `gen-testcases` must **regenerate** them from this plan, not patch them.

---

## 1. Scope

**In scope** — the two transfer screens of A-02:

- **Transfer list** `/members/transfers` — page header + live count, 詳細フィルター toggle and filter row (status / 移籍元 / 移籍先 / brand / applied period / 自動移籍可否), filter-result banner, bulk-approve bar, table (selection checkbox … 自動移籍可否 … row ⋯ menu), pagination footer, empty states. Modals that exist only inside the list: row 承認 dialog, row 否認 dialog, 一括承認 dialog.
- **Transfer detail** `/members/transfers/[id]` — back link, title + status badge, member head-up card, JOYFIT exclusion alerts, 移籍情報 card, 承認フロー timeline (JOYFIT 3 / FIT365 4 steps), sticky status card with 承認 / 否認. Modals that exist only inside the detail: 承認 dialog, 否認 dialog, 手動解除 dialog.

**Out of scope** (a case may confirm the navigation fires, never the destination's behaviour):

- **A-01-01 member detail** — target of the 会員名 link, 会員詳細を開く and 売上詳細を確認 (payment tab). Its 移籍申請 sheet is used **only as a data-setup step** (§8 Data policy), not tested here.
- **A-01 member list / member form** — used only to create throw-away members for data setup.
- **Header store-scope selector** and **「デモ: ユーザー切替」** switcher — shared header; treated as preconditions (the selector's own UI). Its **effect on this list** (FR-004 narrowing) is in scope for Unit 1.
- **Y-01 staff / role master** — roles are a precondition (sign in as the role, observe gating).
- **Notifications** to applicant / member / stores (FR-008, FR-011, A-02 FR-003) — not observable inside the CRM. Only the dialog copy that promises them is asserted.
- **System-actor scheduling mechanism** — only its user-visible result (status 完了, contracted store changed) is tested.
- **Prototype 「デモ切替（ブランド）」 select** (PAR045) — mockup-only, deliberately not built; record as intentionally absent.

---

## 2. Unit table

Two units, one per **route**: list and detail differ in data shape (paged rows vs one request), action surface (row menu + bulk vs status card + manual release) and core logic (scope / filter / selection vs brand-branched timeline / exclusions). Each screen's modals stay with it.

| #   | Unit            | Screen(s)                                                           | Route                     | TC doc filename                                    |
| --- | --------------- | ------------------------------------------------------------------- | ------------------------- | -------------------------------------------------- |
| 1   | Transfer list   | 移籍管理一覧 + 承認 / 否認 / 一括承認 dialogs                       | `/members/transfers`      | `TC -【Fitness CRM】- [A-02][移籍管理（一覧）].md` |
| 2   | Transfer detail | 移籍申請詳細 + 承認 / 否認 / 手動解除 dialogs + 承認フロー timeline | `/members/transfers/[id]` | `TC -【Fitness CRM】- [A-02-01][移籍申請詳細].md`  |

All TC docs live under `specs/024-transfer-management/tests/cases/`.

> Screen ID note: `A-02.md` assigns no id to the detail screen; `A-02-01` follows the repo's `A-01` / `A-01-01` convention.

---

## 3. Sources per unit

| Unit                | Spec sections                                                                                                                                                                                                             | UI prototype file                                     | FRs covered                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Transfer list   | US1 (AS-1…5), US2 AS-4/5/6/7 (list menu), US3 AS-1/4/5, Edge Cases 1/3/4/5, FR-001–FR-006, FR-008, FR-009, FR-013–FR-015, _Prototype Alignment_ (list bullets + kept deviations), SC-001/002/003/004/005                  | `.cache/fitness-crm-ui/src/pages/transfer-list.tsx`   | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-008, FR-009, FR-010 (dialog copy), FR-011 (status advance), FR-013, FR-014, FR-015 |
| 2 — Transfer detail | US2 (AS-1…7), US3 AS-1/2/3, Edge Cases 1/2/3, FR-004 (direct-URL access), FR-006–FR-012, FR-016, Key Entities (Approval Step, Exclusion Reason), _Prototype Alignment_ (detail bullets + kept deviations), SC-002/003/005 | `.cache/fitness-crm-ui/src/pages/transfer-detail.tsx` | FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-016                                                        |

**Requirement doc** `.cache/fitness-spec/crm/requirements/A-02.md` (v3, @ 5c391cf) — read only: Unit 1 → `ブランド別設定構築`, `FR-001`, `FR-002` (一括承認 bullet), `権限マトリクス`; Unit 2 → `基本フロー`, `FR-002`, `FR-003`, `業務フロー`, `権限マトリクス`. Skip `変更履歴` / `メタ情報` / `関連機能`.

**Parity source**: [checklists/parity.md](../checklists/parity.md) — Unit 1 owns PAR001–PAR040 + PAR064–PAR066 (list side); Unit 2 owns PAR041–PAR063 + PAR064/PAR065 (detail side). Where a PAR item contradicts spec.md (see §5 rows D1, D3, D5), **the spec wins** and the case Notes cite the PAR id.

---

## 4. Coverage focus per unit

Added to — not a replacement for — gen-testcases' full coverage walk.

### Unit 1 — Transfer list

**Business logic**

- **Status set & 申請中 (FR-001):** five statuses render with their badge style (warning dot for both 承認待ち, destructive dot for 否認, secondary no-dot for 完了, and 申請中). 申請中 is displayable and filterable but **no 承認/否認** and no enabled checkbox (approve accepts only the two 承認待ち statuses).
- **No free-word search (FR-003):** the toolbar holds only 詳細フィルター — assert the search box is absent.
- **Filter panel (FR-002):** toggle shows the active-filter count, label flips 詳細フィルター ⇄ 閉じる, chevron flips; each select gets the highlighted non-default style; no clear-all inside the panel. Every filter alone, then combined (AND). 移籍元/移籍先 options come from the store API sorted by name. Applied period 今月 / 先月 / 今年 evaluated against the **real clock** (today) — derive expectations from 申請日 values on screen.
- **Brand filter (FR-002):** JOYFIT means the JOYFIT group (Joyfit / Joyfit24 / JoyfitYoga / JoyfitPlus), FIT365 means Fit365, matched on the **request's brand**, not on the store-name prefix (§5 D3).
- **自動移籍可否 (FR-006):** `自動可` / `除外: 未納あり` / `除外: 縛り期間中` / both stacked (Edge Case 1) / `—` for FIT365 and for JOYFIT rows without eligibility data. Tooltip only when the figure exists: no amount on the list; 残り N日 only when `cancellationFeeEndDate` is returned (§5 D5). Filter 自動可のみ / 除外あり returns JOYFIT rows only.
- **Banner accounting (FR-002, FR-015):** 「全N件中M件」 — N is the **scoped** total (not the global one), M the filtered total, plus the summary string (`{status}`・`移籍元: …`・`移籍先: …`・`{brand}`・`申請: …`・`自動移籍: …`); banner clear resets every filter and returns to page 1.
- **Checkbox tri-state (FR-013, US3 AS-5, PAR020/PAR064):** blank for 完了 / 否認; enabled for a pending row the user's store owns with no exclusion (**either brand**); disabled + tooltip for (a) another store owns the current step — "{移籍元|移籍先}店舗（{store}）の承認待ちのため、所属店舗からは操作できません", (b) excluded JOYFIT — "除外理由のため個別対応が必要です". Header select-all covers only selectable rows of the current page; checked / indeterminate / unchecked; disabled when the page has none.
- **Selection across paging / filter (Edge Case 4):** selection survives page changes and is included in the bulk action; on a **filter change**, only selections present on page 1 of the new result stay (§5 D4). Bar count = dialog-title count.
- **Bulk bar & dialog (FR-013, US3 AS-4, PAR011–014, PAR040):** bar below the filters with 「N件選択中」 / 選択解除 / 「選択したN件を一括承認」; button gated to HQ/System/Manager, Staff sees it disabled with "一括承認はHQ・Manager権限が必要です". Dialog title count, irreversible copy, extra FIT365 line only when FIT365 rows are selected, optional comment; confirm clears selection + toast; cancel keeps selection and discards the comment. Post-confirm: JOYFIT rows 完了 (see B1), FIT365 rows advance exactly one step.
- **Row ⋯ menu (FR-008, US2 AS-6/7, PAR032/PAR065):** only for pending rows. 承認 disabled for store-block or exclusion (未納: "未納金があるため承認できません。未納解消後に再申請してください"; 縛り期間 list copy "…移籍詳細から管理者権限で手動解除してください"); 否認 disabled **only** for store-block.
- **Approve / reject dialog copy (FR-008, FR-010, FR-011):** JOYFIT → auto-execute note; FIT365 at 移籍元承認待ち → destination-request note; FIT365 at 移籍先承認待ち → transfer-executes note; 否認 → title "移籍申請を否認しますか？", "否認後、申請者へ通知され、案件はクローズされます。", placeholder "否認理由を入力してください（任意）", action "否認する". Wording is **否認** everywhere — never 却下.
- **Row click isolation (FR-005, PAR022/033):** checkbox, 自動移籍可否 and action cells don't navigate; 会員名 opens the member detail (not the transfer); any other cell opens **that row's** detail id.
- **Pagination (FR-014):** default **25**, options 25 / 50 / 100; page-size change → page 1; 前へ/次へ disabled at ends; ellipsis when > 7 pages; 「全 N 件 / P ページ / X-Y を表示」.
- **Role × gating (FR-004, FR-009, SC-005):** HQ/System see everything and act on everything; Manager / Staff act only where their store owns the current step; Staff cannot bulk-approve; **Observer sees no checkbox column and no action column** (PAR066); Trainer has no menu entry and a direct URL is refused.

**Real-API behaviours**

- **Server-enforced scope (FR-004):** compare a Staff/Manager list with HQ — out-of-scope requests absent, a request whose only accessible side is the destination is present; header store scope narrows further to requests whose origin **or** destination is the picked store (`storeId`, API-091 v0.9 — Bug-No8), ANDed with the in-screen filters, and a header switch returns to page 1 and prunes the selection. Counts in header badge, banner and footer match the server total.
- **Server-side validation:** approve/reject/bulk comment > 500 chars → error surfaced, nothing changed; bulk > 50 ids (page size 100 + select-all) → the UI caps the selection at 50 (checkboxes disabled with a reason, select-all fills only up to 50, also across pages, bar shows 上限50件); a bulk mix where some ids fail → per-row result reflected (`summary` / `results[]`), not a blanket success toast.
- **Stale state / two tabs (SC-002):** approve in tab A, then approve or reject the same row in tab B → server refuses (status no longer matches `expectedStatus`), tab B shows an error and refreshes; nothing double-applied.
- **Persistence:** after approve/reject/bulk, reload and re-login → status, step and list position persist; list and detail agree without manual refresh (SC-002).
- **Member-screen cache (FR-017, SC-002):** open the member list, the member detail and its 契約操作 tab in a second tab _before_ deciding; approve from the list row, the detail screen, 手動解除 and 一括承認 → on return those screens show the destination 主契約店舗 / contract summary without a reload (the network shows the member list, member detail, main-contract and contract-summary reads refetching). 否認 changes no member data. A 409 also refetches.
- **401 expiry:** expire the session (clear Cognito tokens) while on the list, then filter / page / approve → redirected to login, no half-applied action; after re-login the screen comes back.
- **Error states:** list API 5xx / network drop → error state, not an empty state.

**UI breakage under stress (1024px floor, then ≥1440px)**

- Max-length full-width Japanese 会員名 and an equally long unbroken token in 会員名, the longest real store names in 移籍元 / 移籍先, both exclusion badges stacked, the longest status label (移籍元承認待ち), the full banner summary with all six filters active — no overlap, no clipped badge, table scrolls horizontally inside its container (no page scroll).
- Store selects with the full dev store list (long option text, scroll inside the popover).
- Bulk bar with a 3-digit count; dialog title with a 3-digit count; a 500-char comment in each dialog.

### Unit 2 — Transfer detail

**Business logic**

- **Layout order (FR-016):** back link → title "{会員名} さんの移籍申請" + status badge only (no 申請番号 badge) → head-up card (ID, 旧No, 主契約店舗 = origin store, 会員種別 / 主契約 badges, 会員詳細を開く) → exclusion alerts → 60/40 body (left 移籍情報 + 承認フロー, right sticky status card).
- **移籍情報 fields (FR-016):** 申請ID (mono), 移籍予定日, 移籍元店舗, 移籍先店舗, 移籍理由 (full width), ブランド badge, 申請者, 申請日時. 申請者 = "name (role)"; member's own filing → 「会員本人」; system role → no suffix (§5 D8).
- **Brand-branched timeline (FR-007) — core:** JOYFIT exactly 3 steps (申請 → 移籍元承認 → システム自動移籍実行, bot icon + 自動実行 badge), FIT365 exactly 4 (申請 → 移籍元承認 → 移籍先承認 → 移籍実行); completed = success check + success connector; others muted clock; 移籍元 / 移籍先 side badges; **no current-step highlight / 対応待ち badge** (§5 D9). Header badge brand-coloured 自動移籍 / 手動移籍（2段階承認） + flow note.
- **Timeline ↔ status consistency:** for each of 申請中 / 移籍元承認待ち / 移籍先承認待ち / 完了 / 否認 the completed-step pattern matches the header and status card; 否認 never shows downstream steps complete; Edge Case 2 — a FIT365 rejected at destination doesn't present the origin approval as carried over.
- **Status card (PAR059–061):** tone/icon per status; 申請日 / 最終更新; FIT365-only "移籍先店舗の承認待ちです" line at 移籍先承認待ち; actions only while pending; 承認 relabels to 「移籍先として承認」 at 移籍先承認待ち.
- **Approve flows (FR-010, FR-011, US2 AS-1/2/3):** JOYFIT origin approval → 完了, all 3 steps complete, contracted store = destination (B1, B2); FIT365 origin approval → 移籍先承認待ち, steps 1–2 complete; FIT365 destination approval → 完了, 4 steps complete, contracted store = destination (B2). Verify the store change on the member head-up card (主契約店舗) after reload.
- **Reject (FR-008, FR-011, US2 AS-4):** either stage, either brand → 否認, actions disappear, comment optional; copy as in Unit 1.
- **Action gating (US2 AS-5/6/7, PAR061/064/065):** store-block disables both with the 移籍元/移籍先 tooltip; exclusion disables 承認 only (未納 copy; 縛り期間 detail copy "…管理者権限で手動解除すると承認できます"); deny tooltips "移籍承認の権限がありません" / "移籍否認の権限がありません" for Observer.
- **Exclusion alerts (FR-006, Edge Case 1):** 未納 → destructive alert with amount **and** billing period + 「売上詳細を確認」 → member detail payment tab (§5 D6); 縛り期間 → warning alert with 残り N日; both → stacked; absent for FIT365 and eligible JOYFIT (B4 for data).
- **Manual release (FR-012, US3 AS-2/3):** button visible/enabled for HQ/System/Manager only, tooltip "手動解除は管理者権限が必要です" otherwise; disabled when the user's store does not own the current step (store-block tooltip) or when 未納 is also present (未納 tooltip); dialog confirm disabled while 解除理由 is empty **or whitespace-only**; 解除理由 max 500 (approve `comment`); cancel discards the reason; confirm sends **one** approve with `comment` = the trimmed reason and `expectedStatus` → JOYFIT request 完了, alerts and actions gone, no 「管理者により手動解除済み」 alert (§5 D7). All of it needs an excluded request → **B4**.
- **Navigation (FR-005):** landing from a list row shows that request; 移籍管理に戻る returns to the list (filters/page state as the spec allows); 会員詳細を開く opens A-01-01 for this member.

**Real-API behaviours**

- **Direct URL / scope (FR-004):** a non-existent UUID, a malformed id, and an existing request outside a Staff user's scope → not-found / forbidden state, never a crash or another request's data.
- **Server-enforced role (Edge Case 3, SC-005):** while signed in as Observer, replay `POST …/{id}/approve` and `…/reject` from the browser console with the session's own token → server refuses (403); state unchanged. Same for a Staff user against a request whose current step belongs to another store.
- **Server-side validation:** comment > 500 chars; approve on a request already 完了 / 否認 (stale page) → error, timeline unchanged.
- **Two tabs:** same as Unit 1 — second decision is refused; tab B ends on the true status after refresh.
- **Persistence:** reload + re-login after every mutation; list row for the same id agrees (SC-002).
- **401 expiry:** expire the session with a dialog open and confirm → login redirect, no mutation.

**UI breakage under stress (1024px floor, then ≥1440px)**

- Max-length full-width 会員名 in the title, the head-up card and the dialog descriptions; long unbroken token in 会員名; longest store names in 移籍元 / 移籍先 and in the "{fromStore} から {toStore}" dialog sentence and the store-block tooltip; longest 移籍理由 label; 申請者 with a long name + role; both exclusion alerts stacked with the manual-release button; 500-char comment and 解除理由. The 60/40 columns must not collapse or overlap at 1024px; status card stays sticky.

---

## 5. Spec-vs-prototype deltas

`gen-testcases` must mark each of these in the affected case's **Notes** (`Spec-only` / `Conflict (spec wins)`).

| #   | Item                       | In spec                                                                                                | In prototype                                   | How to test                                                                                                                          |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | 申請中 actions             | Displayed + filterable; **no** 承認/否認, not bulk-selectable (FR-001, kept deviation)                 | Actionable — origin store approves; selectable | Conflict: assert no action menu / no enabled checkbox on a 申請中 row; filter offers 申請中 (PAR004 says it doesn't — spec wins)     |
| D2  | Default page size          | 25 (options 25/50/100)                                                                                 | 50                                             | Conflict: assert 25 on first load                                                                                                    |
| D3  | Brand filter semantics     | JOYFIT / FIT365 brand group of the request (FR-002)                                                    | Matches store-name **prefix** of from/to store | Conflict: a JOYFIT request is returned by JOYFIT only; JOYFIT option enabled (PAR007 says disabled — record actual state, spec wins) |
| D4  | Selection on filter change | Only selections on page 1 of the new result survive (Edge Case 4)                                      | Selection kept untouched                       | Conflict: select rows, change a filter, check bar count + dialog count                                                               |
| D5  | 自動移籍可否 tooltip       | Shown only when API carries the figure: no amount on list; 残り N日 when `cancellationFeeUntil` exists | Always 未納金 ¥N / 残り N日                    | Conflict: assert no 未納 tooltip on the list; 縛り tooltip present iff end date (PAR029/030 wording outdated)                        |
| D6  | 売上詳細を確認 target      | Member detail payment tab                                                                              | `sales-detail` page                            | Conflict: assert landing on A-01-01 payment tab                                                                                      |
| D7  | 手動解除済み state         | Not rendered; the release **is** the approval (reason → approve `comment`), request moves straight on  | Success alert + 承認 unlocked                  | Conflict (spec wins): assert confirm completes the request and no 手動解除済み alert appears                                         |
| D8  | 申請者                     | "name (role)"; 「会員本人」 for member filing; no suffix for system                                    | "name (role)" only                             | Spec-only extension: one case per variant (data permitting)                                                                          |
| D9  | Current-step highlight     | None (FR-007) — A-02.md FR-002 asks for ハイライト                                                     | None                                           | Conflict (requirement doc vs spec): assert no highlight; Note cites A-02.md FR-002                                                   |
| D10 | Observer columns           | No checkbox / action columns (PAR066, FR-009)                                                          | Per-item role-gated (disabled)                 | Conflict: assert columns absent                                                                                                      |
| D11 | Trainer access             | No access (FR-009)                                                                                     | No denied-access screen                        | Spec-only: menu hidden + direct URL refused                                                                                          |
| D12 | Server-side refusal        | Edge Case 3                                                                                            | —                                              | Spec-only: console replay as Observer (§4 Unit 2)                                                                                    |
| D13 | Two-tab / stale status     | `expectedStatus` lock (kept deviation)                                                                 | —                                              | Spec-only: two-tab cases in both units                                                                                               |
| D14 | Demo brand switch          | —                                                                                                      | 「デモ切替（ブランド）」 (PAR045)              | Prototype-only: record intentionally absent, not NG                                                                                  |
| D15 | Notifications              | Applicant notified on 否認 / completion                                                                | Copy only                                      | Spec-only, not observable: assert dialog copy only                                                                                   |

---

## 6. Known Round 1 gaps

| Bn     | Blocker                                                                                                                                                           | UI behaviour in Round 1                                                        | Test treatment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1     | JOYFIT origin approval moves the request to `pending_destination_approval` instead of 完了 (BE bug, A-02 FR-003)                                                  | JOYFIT row/detail shows 移籍先承認待ち after 承認; a second approval is needed | Cases written to FR-010 / US2 AS-1 → `Block (B1)` when this reproduces (also bulk JOYFIT rows)                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| B2     | A 完了 request does not change the member's contracted store (BE bug)                                                                                             | Head-up card / member detail still show the origin store                       | Store-update assertions (US2 AS-1/3, FR-010/011) → `Block (B2)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ~~B3~~ | ~~No manual-release endpoint (FR-012)~~ — closed 2026-10-06: the release is the real approve with `comment`, by API-091 design                                    | —                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| B4     | Dev has 0 excluded requests (no arrears, no member in a cancellation-fee period); FE cannot create one (campaign list API 500)                                    | 自動可 / `—` only; no alerts, no disabled-by-exclusion controls                | All exclusion cases (badges, alerts, 承認 block, disabled checkbox, 自動移籍: 除外あり result, manual release) → `Block (B4)`; re-check data at run start. ~~**Decision 2026-10-06**: the live run of this branch is skipped while dev has no member in a cancellation-fee period (0/81 contracts carry `cancellationFeeUntil`)~~ **Superseded 2026-10-06**: the goal is FE bugs only, so these cases run on faked responses (Playwright route interception, shapes per API-091) — result `OK` / `NG` is an FE verdict; BE persistence is not covered |
| B5     | Pending requests are scarce (1 pending on dev at last check, `e94b99aa…`, off-limits) and decisions are irreversible; bulk-approve success path never called live | —                                                                              | Each mutation uses a request created per §8 Data policy; if no request of the needed brand/status can be created, **fake the list / detail / approve / reject responses** (writes stay narrow, never dev-wide) instead of recording `Block (B5)`; keep `Block (B5)` only for what a fake cannot prove (real BE transition / persistence)                                                                                                                                                                                                              |
| B6     | Bulk > 50 ids requires ≥ 51 selectable pending requests                                                                                                           | —                                                                              | Write the case; `Block (B6)` unless that volume exists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

## 7. Traceability map

| FR     | Summary                                                                | Unit(s)                              |
| ------ | ---------------------------------------------------------------------- | ------------------------------------ |
| FR-001 | Columns + 5 statuses; 申請中 display/filter only                       | 1                                    |
| FR-002 | 詳細フィルター panel, 6 filters, AND, no clear-all in panel            | 1                                    |
| FR-003 | No free-word search                                                    | 1 (negative)                         |
| FR-004 | Role-based store scope                                                 | 1 (list), 2 (direct URL)             |
| FR-005 | Open detail from any row                                               | 1 → 2                                |
| FR-006 | JOYFIT eligibility + exclusion reasons                                 | 1 (badges), 2 (alerts) — B4          |
| FR-007 | Brand-branched timeline                                                | 2                                    |
| FR-008 | Approve / 否認 with optional comment; store ownership; exclusion block | 1 (menu), 2 (status card)            |
| FR-009 | Trainer no access; Observer read-only                                  | 1, 2                                 |
| FR-010 | JOYFIT auto-execution after origin approval                            | 2 (+1 dialog copy, bulk) — B1, B2    |
| FR-011 | FIT365 sequential approval; reject closes                              | 2 (+1 status advance) — B2           |
| FR-012 | Manual release with required reason (= approve with comment)           | 2 — B4                               |
| FR-013 | Bulk approve, either brand, checkbox rules, bar, 50-item cap           | 1 — B5, B6                           |
| FR-014 | Pagination, page size, totals                                          | 1                                    |
| FR-015 | Filtered empty state with clear                                        | 1                                    |
| FR-016 | Detail layout and field set                                            | 2                                    |
| FR-017 | Member screens refreshed after approve / override / bulk               | 1 (row, bulk), 2 (approve, 手動解除) |

**Requirements with no unit:** none — FR-001…FR-017 each land in ≥1 unit. Not testable in either unit: the applicant/store **notifications** in FR-008 / FR-011 / A-02 FR-003 (copy only, §1).

**Success criteria:** SC-001 → 1 · SC-002 → 1 + 2 (assert after every mutation) · SC-003 → 1 + 2 (≤ 3 interactions) · SC-004 → 1 · SC-005 → 1 + 2 (role sweep + console replay).

---

## 8. Execution notes (for execute-testcases)

- **Credentials** — real Cognito accounts from `src/lib/auth/demo-users.ts` (password `Password@123` for all):

  | Role        | Account                         | Used for                                                             |
  | ----------- | ------------------------------- | -------------------------------------------------------------------- |
  | System      | `lodu4289+1@gmail.com`          | Full access; second HQ-level actor                                   |
  | Headquarter | `lodu4289+headquater@gmail.com` | Default for happy paths, bulk, manual release                        |
  | Manager     | `lodu4289+manager@gmail.com`    | Managed-store scope, bulk allowed, store-block                       |
  | Staff       | `lodu4289+staff@gmail.com`      | Own-store scope, individual approve only, bulk disabled, store-block |
  | Trainer     | `lodu4289+trainer@gmail.com`    | No access                                                            |
  | Observer    | `lodu4289+observer@gmail.com`   | Read-only, columns absent, console replay                            |

  At run start read each account's store(s) from the header to know which requests it owns. The header's 「デモ: ユーザー切替」 only appears when `NEXT_PUBLIC_APP_ENV=development`; otherwise sign out / in. **One account = one live session**: signing the same account in elsewhere kills the first session — do the two-tab cases as two tabs of the **same** browser session. The backend CORS allows only `http://localhost:3000`.

- **Environment** — app on `localhost:3000` pointing at `NEXT_PUBLIC_REAL_API_URL` = `https://api.dev.fitness-v2.okamoto-hd.com`. The backend is **shared** with other developers and testers: counts and rows can change mid-run, so assert relationships (banner = footer = header count) rather than fixed numbers.
- **Data policy** — **no seed reset exists**; every 承認 / 否認 / 一括承認 is irreversible.
  - **Off-limits**: every pre-existing transfer request, including pending `e94b99aa…` and the two 完了 requests — read-only cases only, never decide them.
  - **Create your own**: for each mutating case, create a member via A-01 named with prefix `QA-TC-A02-<yyyymmdd>-<n>` (with a primary store set — a member without one gets `409 E-TRF-006`), then file a transfer from A-01-01's 移籍申請 sheet. One pending transfer per member, so make one member per mutating case. Need both brands: a JOYFIT-store member and a FIT365-store member; for store-block cases pick an origin outside the Staff/Manager account's store.
  - Put the same prefix in every comment typed into approve / reject / bulk / release dialogs.
  - **Cleanup**: decided transfers cannot be deleted — leave them, listing the ids created in the TC doc's run notes.
- **Known-gap policy** — a failure that matches a §6 row → `Block (Bn)`; any undocumented failure → `NG`. Re-check B4/B5 data at run start; if BE has seeded exclusion data, run those cases for real.
- **Viewport** — layout cases at **1024×768** (supported floor) and one wide pass at **≥1440px**; below 1024px is out of scope.
- **Account safety** — no lockout case in this feature; do **not** type wrong passwords. For the 401 case, clear the Cognito tokens in the browser instead of waiting for expiry.
- **Verify visibility** — many affordances are tooltip-gated; hover and screenshot before recording NG on present/absent.

---

## 9. Suggested order

1. **Data setup** — create the `QA-TC-A02-*` members + pending transfers (JOYFIT ×≥3, FIT365 ×≥3, plus store-block ones), note ids. Everything after depends on them.
2. **Unit 1 read-only** (HQ) — layout, columns, filters, banner, paging, row-click, empty states, stress at 1024 / 1440. Safe on shared data.
3. **Unit 2 read-only** (HQ) — layout, timeline per brand and status, status card, gating tooltips, direct-URL handling, stress.
4. **Role sweep** (Manager, Staff, Observer, Trainer) across both units, including console replay — no mutations, so it can run before the destructive work.
5. **Unit 2 mutations** — FIT365 origin → destination approve, JOYFIT approve (B1/B2), rejects at each stage, two-tab conflict, 401 mid-action, manual-release dialog (B4 — run on faked exclusion responses, 2026-10-06).
6. **Unit 1 mutations last** — row approve/reject, then 一括承認 (mixed brands, then server-validation cases) — it consumes the most requests.

---

## 10. Definition of done

- [ ] Both TC docs regenerated by `gen-testcases` from this plan (§2 filenames), §5 deltas marked in Notes, §6 rows wired to `Block (Bn)`.
- [ ] Every FR-001…FR-016 traced to ≥ 1 case per §7.
- [ ] Parity items PAR001–PAR066 each map to ≥ 1 case in the owning unit; un-ticked parity gaps fixed in the doc **before** execution.
- [ ] Each doc executed once against the §8 role matrix and both brands, OK / NG / Block recorded.
- [ ] Created `QA-TC-A02-*` members / transfers listed in the run notes (cannot be deleted); no pre-existing request was decided.

---

## Next step

Run **`gen-testcases`** on Unit 1 (Transfer list) — sources in §3, coverage focus in §4, deltas §5, gaps §6.
