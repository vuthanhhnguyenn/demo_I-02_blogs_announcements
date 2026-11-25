# Test Plan: Member Management (List)

**Feature spec**: [spec.md](../spec.md)
**PO Spec**: `A-01` — 会員管理（一覧）
**Created**: 2026-07-24 · **Rewritten for phase 2**: 2026-09-18 · **Revised**: 2026-10-29 — D3: `priceMonthly` is stored tax-inclusive (API-087 v0.14), shown as returned
**Integration round**: **Round 2** — the screen is fully integrated against the real dev
backend (`NEXT_PUBLIC_REAL_API_URL = https://api.dev.fitness-v2.okamoto-hd.com`). No mock
data path remains: search, every filter, sort, paging, the plan/promo/store option lists and
the bulk change all go to the real API (integration report lượt 3–8, 2026-08-25 → 2026-08-28).
**Ladyroom slice** (added 2026-11-19): E-02 FR-016 / G-01 FR-M002 — a 主契約 whose areas carry a 性別の条件 (or
a G-01 性別制限) is sold only to matching members. Here it narrows the bulk-change dialog's target plans to
those that suit **every** selected member — **revised by decision 2026-11-19: not narrowed in the list; the server refuses a mismatch on 実行** (prototype `fitness-crm-ui@9428dc2` `member-list.tsx`). Its cases go
into the Unit 1 doc, tagged `[Ladyroom]`. The cross-feature run — order, `QA-E02-AREA-*` fixtures, pre-flight
gaps — is owned by the [029 test plan](../../029-equipment-management/tests/test-plan.md) §7e–§9.
**Consumed by**: `gen-testcases` → `execute-testcases`

---

## 1. Scope

**In scope** — the member **list** screen only (A-01, L1), route `/members`:

- Page shell, header count badge, search box, 詳細フィルター panel, result banner, sortable
  table, pagination footer, row action menu.
- Dialogs that exist **only inside** this screen and are therefore tested with it:
  - Select-all confirmation dialog (current-page vs all-matching).
  - Bulk primary-contract change dialog (FR-016/FR-017) and its result feedback.

**Out of scope** (navigation targets / separate specs — a case may confirm the link fires, never
the destination):

- Member **detail** `A-01-01` and its tabs — separate feature ([specs/032-member-detail](../../032-member-detail)),
  incl. how a booked plan change is surfaced there.
- Member **edit form** (`member-form`) — verify the menu item, its role/status gating and the
  navigation intent only.
- Blacklist screens, emergency-suspension screen — separate features.
- The shared header **store scope** selector and the 「デモ: ユーザー切替」 switcher — inputs/preconditions,
  not units under test (their own defects are recorded as observations, see B3).
- Login / password reset (`023`, `028`, `029`) — obtaining a session is a precondition here.

---

## 2. Unit table

One screen, one unit. The two dialogs are children of the list and only make sense on top of a
live roster + selection state, so splitting them off would break the flow under test.

| #   | Unit        | Screen(s)                                                 | Route      | TC doc filename                                    |
| --- | ----------- | --------------------------------------------------------- | ---------- | -------------------------------------------------- |
| 1   | Member list | 会員管理（一覧） + select-all dialog + bulk-change dialog | `/members` | `TC -【Fitness CRM】- [A-01][会員管理（一覧）].md` |

TC docs live under `specs/019-member-list/tests/cases/`. This doc already exists (88 cases,
last full run 2026-09-17) — `gen-testcases` **extends and reconciles** it against this plan
rather than starting a new file.

---

## 3. Sources per unit

| Unit            | Spec sections                                                                                 | UI prototype file                                           | FRs covered     |
| --------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------- |
| 1 — Member list | spec.md §Overview, User Stories 1–3, all Edge Cases, FR-001–FR-019, Key Entities, Assumptions | `.cache/fitness-crm-ui/src/pages/member-list.tsx`@`46253e3` | FR-001 – FR-019 |

Supporting sources for Unit 1, read **only** these slices:

- `.cache/fitness-spec/crm/requirements/A-01.md` — FR-001 (roster columns / search / last-visit /
  sort), FR-002 (view scope), FR-020 (bulk primary-contract change), 権限マトリクス (L563–L583),
  and FR-026 (L391–, only for the one open question in §5). Ignore the A-01-01 detail/tab
  supplementary sections — they belong to out-of-scope features.
- `.cache/fitness-spec/crm/requirements/G-06.md` FR-011 — source of the promotion-code filter.
- [checklists/parity.md](../checklists/parity.md) PAR001–PAR086 — element/state inventory.
- [api-integration-output/member-list/report.md](../../../api-integration-output/member-list/report.md) —
  **not an oracle**; the register behind §7.
- **Ladyroom slice** (tag `[Ladyroom]`): `E-02.md` (`261109_v6`) FR-016 (A-01 sale gating) + FR-008 (only
  女性 matches 女性のみ, only 男性 matches 男性のみ); `G-01.md` FR-M002 利用できるエリア / 性別制限; A-01 FR-020 for
  the surrounding flow; API `PlanListItemDto.genderCondition`, `POST /admin/members/bulk-plan-changes` (202 +
  job; per-target failures / skips in `GET …/bulk-plan-changes/{jobId}`); prototype `member-list.tsx`@`9428dc2`
  (`bulkContractOptions`; 性別 held per row, not displayed).

---

## 4. Spec-vs-prototype deltas

`gen-testcases` MUST mark each of these in the affected case's Notes.

| #   | Item                                                           | In spec                                                                                                        | In prototype                                                                                                                                  | How to test                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Store filter + 店舗名 column under a single-store header scope | FR-003: roster limited to that store and the store filter **locked**                                           | `showStoreScopeFilter` / `showStoreColumn` **remove** both the filter and the column                                                          | **Conflict.** Current FE follows the prototype (remove). Test the prototype behaviour, mark the case 「spec says locked, prototype removes — PO to confirm」. See also B3.                                                                                                                                       |
| D2  | Bulk-change effective date                                     | FR-016: apply date is chosen by the **client**, 1st of a month, next month … 12 months ahead                   | Fixed 「翌月月初」, no control                                                                                                                | **Conflict.** Test the next-month-start value that the dialog shows (spec FR-017 + Assumptions agree with it) and record that FR-016's month picker has no UI anywhere.                                                                                                                                          |
| D3  | Contract price in the picker / preview                         | Spec silent on tax                                                                                             | 「（¥{price}）」 as-is                                                                                                                        | Client decision qa-181 §2 wins: assert **tax-inclusive** — since 2026-10-29 that is `priceMonthly` as returned (stored tax-inclusive, API-087 v0.14); a figure with tax added again fails.                                                                                                                       |
| D4  | Promotion-code filter options                                  | FR-006: options from the **promotion-code master**, value = the code string                                    | Three hard-coded campaign-name strings as demo data                                                                                           | Spec wins (PAR028 deviation is intentional). Assert code-based options; the campaign name may appear beneath.                                                                                                                                                                                                    |
| D5  | Page-size options                                              | Spec silent (FR-011: "selectable page size")                                                                   | 25/50/100/200, default **50**                                                                                                                 | Client decision qa-155 §7: 25/50/100, default **25**. Assert that; no 200 option.                                                                                                                                                                                                                                |
| D6  | Last-visit entry-URL param                                     | FR-010: "accept an initial value passed via the entry URL" (spelling unspecified)                              | `lastVisit=1w｜2w｜3w-plus｜1m-plus`                                                                                                          | App uses `last_visit=within_1w｜within_2w｜over_3w｜over_1m`. Test the app's spelling; note the accepted deviation.                                                                                                                                                                                              |
| D7  | Row ordering for rows missing the sorted value                 | Edge Cases (amended 2026-09-16): **server-owned**, not asserted                                                | Nulls last in both directions (mock sorted the whole array in memory)                                                                         | Spec wins: send `sort`/`order`, render as returned, **assert nothing** about null placement.                                                                                                                                                                                                                     |
| D8  | Search-term normalisation (全角/半角, case)                    | FR-002: pass through as typed, **matching is the server's to define**                                          | No normalisation code                                                                                                                         | Spec wins: assert the query reaches the API unchanged and the screen shows exactly what comes back. A surprising match is an API finding, not an `NG`.                                                                                                                                                           |
| D9  | Loading skeleton row count                                     | FR-005: "skeleton rows"                                                                                        | 7 rows                                                                                                                                        | Any skeleton satisfies the spec; implementation renders 20. OK-with-note.                                                                                                                                                                                                                                        |
| D10 | Brand filter option order                                      | FR-006: fixed 2-value list (JOYFIT / FIT365)                                                                   | 全ブランド / FIT365 / JOYFIT                                                                                                                  | Order is not required by the spec. OK-with-note.                                                                                                                                                                                                                                                                 |
| D11 | 編集 denial presentation                                       | FR-018 (amended 2026-09-16): visible-but-**disabled** + 本部 marker                                            | `RoleGatedMenuItem`: `opacity-50` + `cursor-not-allowed` + 本部 badge                                                                         | Aligned — assert disabled-with-badge, **not** hidden. (The old "hidden" expectation was retired with BUG-A01-04.)                                                                                                                                                                                                |
| D12 | **入会取り消し** reflection on the list                        | A-01 v6 FR-026 says the cancellation is reflected 「A-01一覧…への反映」; internal spec.md has **no FR** for it | No control, no status value                                                                                                                   | **Not tracked on this screen** — decided 2026-09-22: the prototype draws no control, no status value and no badge for it, and the API's `memberStatus` enum carries no 取消 value, so the screen has no oracle. TC-119 was withdrawn. It stays a BA/BE item; add a case only if the design introduces the state. |
| D13 | Promotion-code filter — screen ownership + input shape         | G-06 FR-011 mixes 「A-01-01（会員詳細）」 and 「会員一覧」, and says a code **string** is specified            | Prototype draws a dropdown                                                                                                                    | **Spec-only ambiguity.** Test the dropdown as built (search by code prefix, server-side) and mark the case with the BA question (see B7).                                                                                                                                                                        |
| D14 | **契約種別** (contract type) filter                            | A-01 FR-001 lists 契約種別 among the search conditions; spec.md FR-006 (added 2026-11-09)                      | Original prototype had 全契約種別 / 通常会員 / 1Day会員 / 家族会員; the 5/24 update replaced it with 主契約プラン — no 契約種別 control today | **Spec wins (user decision 2026-11-09).** The screen offers both 主契約プラン (`planId`) and 契約種別 (`contractType`). Test the 9-value G-01 vocabulary and AND with the plan filter; mark the case 「not in prototype — PO to confirm」.                                                                       |

**Ladyroom slice deltas** (prototype `@9428dc2`):

| #   | Item                                        | In spec                                                                       | In prototype                                       | How to test                                                                                                                    |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| LR1 | Bulk target plans gated by 性別             | E-02 FR-016 / G-01 FR-M002: sold only to matching members; A-01 FR-020 silent | Prototype narrows the list (`bulkContractOptions`) | **Decision 2026-11-19: not followed** — every plan stays in the list; the server refuses a mismatched member (422 `E-BPC-206`) |
| LR2 | Where the selected members' 性別 comes from | —                                                                             | The prototype holds 性別 per row                   | Moot after the decision (no client gating)                                                                                     |
| LR3 | Server refusal of a mismatched member       | E-02 FR-016                                                                   | —                                                  | The bulk call is asynchronous and documents no gender refusal → gap AREA-BULK (§6)                                             |

---

## 5. Coverage focus per unit

Added to — never a replacement for — `gen-testcases`' full coverage walk (every field, every
state, every control).

**Unit 1 — Member list**

_Real-API behaviours (phase 2, now in scope):_

- **Server-side validation beyond the client's**: a promotion code containing `-` is rejected
  `400 E-VAL-001` while swagger only declares `maxLength: 32` (B6); an over-long or unusual
  `query`; a `page` / `limit` outside the server's caps; a `store_id` that is not a real store id.
  The screen must surface a failure, never a silently empty roster.
- **Error codes the screen can receive**: `E-VAL-001` (400), `E-SYS-001` (500),
  `E-BPC-200` (409, duplicate member × plan × month), `E-BPC-205`
  (409 with `details.conflictingMemberIds[]` — FR-016 requires the members to be **named**), 422. Each must produce a distinguishable, Japanese, actionable message — and a failed list
  load must never read as 「会員がまだありません」 (regression guard for BUG-A01-07).
- **401 / session expiry**: the staff token lives ~1 hour. Cover the roster, a filter change and
  a bulk execute issued with an expired token — expect a re-authentication path, not a blank table.
- **Server-enforced scope (FR-003, FR-019)**: out-of-scope members never appear even when
  `store_id` is hand-edited in the URL; the roster the server returns, not a client filter, is
  what is asserted.
- **Real pagination totals (FR-007, FR-011)**: 「全 N 件中 M 件を抽出中」 uses `totalAllItems` from
  `includeTotalAll`; when the server refuses to count (`totalAllItems: null`, cap API-093
  TBD-A01-LIST-COUNT-CAP) the banner must not claim "N of N, nothing filtered" while filters are on.
  `showing X–Y of N / P pages` must match the real total across page-size changes.
- **Persistence after reload / re-login**: filters, search, sort and page survive (or deliberately
  reset) on reload per the URL contract; a **booked** bulk change is still booked after re-login —
  the confirmation must say reserved + effective date, never "changed" (FR-016).
- **Two-tab / concurrency**: the same selection bulk-executed twice (two tabs, or a double click)
  must not book twice — see BUG-A01-09.

_UI breakage under stress — run every one of these at the **1024px floor**:_

- Max-length full-width Japanese 氏名 and an equally long unbroken ASCII token, in the 氏名 cell,
  the bulk-dialog member preview and the select-all dialog copy.
- Longest plan name in the 主契約 column, in the 主契約プラン filter trigger, in the bulk-change
  picker and in the 「変更後: …」 preview line.
- Longest store name in the 店舗名 column, the 店舗 filter trigger and the result banner.
- Longest status label (ゲートストップ / 退会処理待ち) in the badge and in the ステータス filter trigger.
- Long e-mail / long promotion code in the search box and in the banner's condition summary.
- A banner carrying **all** filters plus a long search string at once; a 3-digit page count in the
  footer summary.
- In every case: no page-level horizontal overflow (the table keeps its own scroll container), no
  clipped or overlapping text, controls still reachable.

_Unit-specific business logic:_

- **Role × affordance gating (FR-012, FR-018, FR-019)**: selection column, bulk bar and bulk dialog
  **hidden** for non-HQ; the 編集 row item **visible-but-disabled** with the 本部 marker for
  non-HQ and disabled with 「退会済みのため編集できません」 for `withdrawn` / `forced_withdrawal`;
  Trainer has no access to the screen at all. Per role, not just the happy HQ path (see B1).
- **Status grouping (FR-006)**: each grouped option must select **both** backing statuses
  (有効 → `active` only, 休会中 → `suspended`+`pending_suspended`,
  退会予定 → `pending_withdrawal`+`withdrawal_pending_processing`,
  退会済み → `withdrawn`+`forced_withdrawal`); **ゲートストップ sends no status at all** and returns
  gate-stopped members of any status, incl. a 休会中 + gate-stopped member (spec US2 §2b), whose
  ステータス cell carries **both** badges — 休会中 and ゲートストップ.
- **AND-combined filtering + banner accounting (FR-007)**: all filters + search combine with AND;
  the active-filter badge counts correctly; the header store scope is **not** counted as a condition.
- **Search field matrix (FR-002)**: member ID, name, kana, phone, e-mail, former member number each
  narrow the roster independently.
- **Last-visit windows (FR-010)**: the four presets expanded to absolute dates against the **real**
  current date, and the two 「…来館なし」 buckets additionally keeping never-visited members
  (`includeNeverEntered`) — including combined with a search term (regression guard for BE ⑮).
- **Sort semantics (FR-009)**: all five columns sortable (会員ID / 氏名 / ステータス / 入会日 /
  最終来館日 — BUG-A01-08 open), asc↔desc toggle, switching column starts at asc, page resets to 1.
- **Pagination boundaries (FR-011)**: page out of range clamps to the last valid page; page-size
  change resets to page 1; the footer summary and 表示件数 selector must still render on a
  single-page result (BUG-A01-10 open).
- **Cross-page selection (FR-013–FR-015)**: selection persists across pages and page-size changes;
  header checkbox on a multi-page result prompts current-page-vs-all; 「選択中のみ表示」 narrows to
  the selection; the bar reports total selected + count on this page.
- **Bulk-change rules (FR-016, FR-017)**: 実行 disabled until a target plan is chosen and guarded
  against a double submit; preview shows tax-inclusive price (D3), first-of-next-month date, a
  ≤5-member sample and 「他 n 名」; a partial refusal **names** the members; success clears the
  selection and 選択中のみ表示 and confirms as **booked**.
- **Empty / loading / error states (FR-005)**: skeleton while loading; 「no match」 (with 条件をクリア)
  vs plain 「no data」 vs **load failed** (再試行) are three distinct states.
- **Row click vs interactive cells (FR-004)**: the checkbox cell and the action-menu cell must not
  navigate.
- **Ladyroom slice (`[Ladyroom]`, LR1–LR3; fixtures from the 029 plan §8) — revised by decision 2026-11-19**: the
  target list is **not** narrowed by 性別; every plan is offered. Execute on throw-away members: a selection holding a
  member who does not meet the chosen plan's condition (女性のみ / 男性のみ area, 性別制限, `nobody`; その他 / 回答しない /
  未設定 meet neither) → 422 `E-BPC-206`, the message names the member(s), nothing is booked, the selection is kept;
  deselecting the named member and retrying books normally; members on other pages and select-all-matching are
  checked too; a matching selection is booked as usual.

---

## 6. Known Round 1/2 gaps

Carried from `api-integration-output/member-list/report.md` (this feature has no
`integration-plan.md`; that report is the register). Treatment for all rows: the case is **written
to the spec** and a failure matching the row is recorded **`Block (Bn)`** — an undocumented failure
is `NG`.

| Bn         | Blocker                                                                                                                                                                                                                                                                                                    | Behaviour in the running screen                                                                                                          | Test treatment                                                                                                                                                                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~**B1**~~ | ~~Real Cognito pool not configured~~ → **resolved 2026-09-18**: `.env` now points at the real dev pool (`NEXT_PUBLIC_COGNITO_ENDPOINT` commented out) and all six role accounts sign in through the app.                                                                                                   | Role-dependent expectations are testable for every role.                                                                                 | Closed. The role matrix ran on 2026-09-18; what still blocks it is **B3**, not credentials.                                                                                                                                                                                                                                     |
| **B2**     | No dev member that has a main contract **and** no pending plan change for the chosen plan/month; a repeat of (member × plan × month) answers `409 E-BPC-200` by design.                                                                                                                                    | The bulk-change **success** path (`202`) is hard to reach; every earlier attempt returned 422/409.                                       | Write the success case. If no eligible member can be found on the day of the run → `Block (B2)`, naming the members tried.                                                                                                                                                                                                      |
| ~~**B3**~~ | ~~Header store-scope switcher offers mock store ids~~ → **resolved 2026-09-21**: the switcher now reads the real store master (9 entries with code + brand) and the scope travels as a real store id (`00000000-…-0203`).                                                                                  | Roster loads for Manager/Staff/Observer; switching the HQ scope narrows the list (169 → 17) and removes the 店舗 filter + 店舗名 column. | Closed. The six cases it blocked (TC-031, TC-046, TC-076, TC-077, TC-078, TC-080) were executed 2026-09-21 and all passed. Two things it had been masking surfaced instead: **BUG-A01-14** (banner counts against the global total under a store scope) and TC-120, which now waits only on a Manager account with 2+ 管轄店舗. |
| ~~**B4**~~ | ~~Selection cleared in the failure path~~ → **fixed 2026-09-22**: `handleBulkChangeContract` now clears the selection only on success; `finally` just closes the dialog.                                                                                                                                   | After a refusal the named members stay selected.                                                                                         | Closed — TC-111 re-run 2026-09-22 and passed.                                                                                                                                                                                                                                                                                   |
| **B5**     | Test data cannot be injected through the UI: no way to create a ~255-char name, a hostile string or an empty roster from this screen.                                                                                                                                                                      | The long-value stress cases in §5 can only use what the dev seed actually carries.                                                       | Run each stress case against the longest value present on dev; where the seed carries nothing long enough → `Block (B5)` with the longest value found, and ask BE to seed one.                                                                                                                                                  |
| **B6**     | BE validates `promoCode` as `isAlphanumeric` while swagger declares only `maxLength: 32` and its own example is `JF24-SPRING-7K2M`; the naming rule for manually issued codes is unchosen.                                                                                                                 | Not reproducible today — all 12 dev codes are alphanumeric.                                                                              | Write the hyphenated-code case; if no such code exists on dev → `Block (B6)`.                                                                                                                                                                                                                                                   |
| **B7**     | BA confirmations still open on the promotion-code filter (D13): which screen owns it, and dropdown vs free code string.                                                                                                                                                                                    | Screen ships the dropdown.                                                                                                               | Test as built, Notes carry the open question; do **not** fail the screen for it.                                                                                                                                                                                                                                                |
| **B8**     | BE ⑲: one member can hold several pending jobs for the same month while `currentMainContract.pendingPlanChange` is a single object.                                                                                                                                                                        | Invisible on the list; affects the detail screen.                                                                                        | Out of unit — no case here. Note only, so a strange bulk result is not mistaken for a list defect.                                                                                                                                                                                                                              |
| ~~**B9**~~ | ~~Manager scoped to the account's home store~~ → **fixed 2026-10-08**: `/crm/me` carries only the home store, which a Manager need not manage; the screen sent it as `storeId` and the roster answered `400 E-VAL-001`. The managed stores now come from `GET /admin/staff/{staffId}` (`managedStoreIds`). | Manager roster loads (see TC-121). Open ask for BE: return `managedStoreIds` from `/auth/crm/me`.                                        |                                                                                                                                                                                                                                                                                                                                 |

Open bugs carried from the last run (these are `NG`, **not** `Bn` — they are screen defects, re-run to
confirm): `BUG-A01-08` (氏名 / ステータス not sortable), `BUG-A01-09` (no double-submit guard on 実行),
`BUG-A01-10` (pagination footer vanishes on a single-page result).

**Ladyroom slice** (AREA-BE / AREA-MOCK from the 029 plan §7e, plus two specific to this screen):

| ID                       | Gap                                                                                                                            | Treatment                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AREA-BE / AREA-MOCK      | See the 029 plan §7e                                                                                                           | `Block (AREA-BE)` / `Block (AREA-MOCK)`                                                                                                                                                                                                                                                                                                                                                                                                      |
| ~~**AREA-LIST-GENDER**~~ | ~~`MemberListItemDto` carries no `gender`~~                                                                                    | **Closed 2026-11-19 by decision**: no client gating, BE will not add `gender`; the cases check the server refusal instead                                                                                                                                                                                                                                                                                                                    |
| **AREA-BULK**            | `POST …/bulk-plan-changes` is asynchronous (202 + job; the worker applies at `effective_date`) and documents no gender refusal | Spec case: the mismatched member appears as a failure / skip in `GET …/bulk-plan-changes/{jobId}`. Booked / applied → `NG`, raised to BE. Still `pending` at run time (the check may only run in the worker) → `Block (AREA-BULK)` with the jobId, ask BE when the gender check runs, re-check after `effective_date`. The mismatch is sent by rewriting `toPlanId` in the outgoing request (Playwright), since a correct UI never offers it |

---

## 7. Traceability map (FR → unit)

| FR     | Summary                                                                  | Unit |
| ------ | ------------------------------------------------------------------------ | ---- |
| FR-001 | Paginated roster + 7 columns                                             | 1    |
| FR-002 | Free-text search over 6 fields, pass-through matching                    | 1    |
| FR-003 | Store-scoped roster + store filter under header scope                    | 1    |
| FR-004 | Row click → detail; interactive cells don't navigate                     | 1    |
| FR-005 | Loading skeleton + empty states (no-data vs no-match) + load failure     | 1    |
| FR-006 | Detailed-filter panel incl. status grouping, gate stop, brand, promo     | 1    |
| FR-007 | AND semantics + active-filter badge + result banner                      | 1    |
| FR-008 | Clear all filters + search in one action                                 | 1    |
| FR-009 | Five sortable columns w/ asc/desc toggle                                 | 1    |
| FR-010 | Last-visit windows + never-visited kept + URL entry value                | 1    |
| FR-011 | Pagination, page size, summary, page-reset rules                         | 1    |
| FR-012 | Selection / bulk affordances HQ-only, hidden otherwise                   | 1    |
| FR-013 | Row + header checkbox selection, persists across pages                   | 1    |
| FR-014 | Header checkbox multi-page → current-page-vs-all prompt                  | 1    |
| FR-015 | 「選択中のみ表示」 + clear selection                                     | 1    |
| FR-016 | Bulk dialog: require target, preview, booked-not-applied, named refusals | 1    |
| FR-017 | Execute → booked from first of next month, clear, confirm                | 1    |
| FR-018 | Row action menu; 編集 role-gated (disabled) + withdrawn-disabled         | 1    |
| FR-019 | A-01 permission matrix across six roles                                  | 1    |

**Requirements with no unit**: none of FR-001–FR-019.
**Ladyroom slice**: E-02 FR-016 / G-01 FR-M002 applied to A-01 FR-020 (bulk target plans) → Unit 1, LR1–LR3.
Not in spec.md; the PO specs are the source.
**Requirement deliberately not tracked here**: `A-01` **FR-026** 入会取り消し — the prototype draws no state for it
and the API's `memberStatus` enum carries no 取消 value, so this screen has nothing to assert (user's decision
2026-09-22; TC-119 withdrawn). It stays a BA/BE item; add a case only if the design introduces the state.

---

## 8. Execution notes (for `execute-testcases`)

**Credentials.** There is **no `src/lib/auth/demo-users.ts` in this repo** — the QA credentials sheet
does not exist for this screen, and the header 「デモ: ユーザー切替」 submenu (visible only when
`NEXT_PUBLIC_APP_ENV=development`) is served by the **mock** `/api/crm/users` and changes only the
mock session. The real API authorises by the bearer token in the `SESSION` cookie:

- Sign in through the app **once the real Cognito pool/client is in `.env`**. Until then, inject
  `SESSION = encodeURIComponent(JSON.stringify({ access_token: <staff token>, token_type: 'Bearer' }))`
  on `localhost`, with a token obtained from BE (**TTL ~1 hour** — re-inject mid-run when it expires).
- Role mapping for pre-conditions: `PC-H` (Headquarter/System) → the token BE supplies today;
  `PC-A` (any authenticated) → the same; Manager / Staff / Observer / Trainer → **no token today**,
  their cases are `Block (B1)`.

**Environment.** App on `http://localhost:3000`; API `https://api.dev.fitness-v2.okamoto-hd.com`.
The backend is **shared with other people** and there is **no seed reset**.

**Data policy.**

- The list screen is read-only except for one action: `POST /members/bulk-plan-changes`, which
  **books a real plan-change job** on shared dev data and **cannot be cancelled from the CRM**.
- Get the user's explicit go-ahead **before every** bulk execute, keep the selection to the
  smallest possible (1 member), and write the member id, target plan and target month into the
  case Notes so the booking is traceable.
- Vary the (member × plan × month) triple between runs — repeating one returns `409 E-BPC-200`.
- **Never** book a change on a member another feature's run is using, and never edit or delete any
  pre-existing record; this screen cannot create its own member, so the "create what you destroy"
  rule degrades to "book the minimum and report it" — left-behind bookings are listed at the end of
  the TC doc for BE to clear.
- Everything else (filters, sort, paging, selection) is client state and resets on reload.
- **Ladyroom slice**: the candidate checks are read-only (open the dialog, キャンセル). The one AREA-BULK case
  books a job → throw-away member with the needed `gender` only, go-ahead first, listed at the end; no
  throw-away member with a main contract → `Block (B2)`. Fixtures per the
  [029 plan §8](../../029-equipment-management/tests/test-plan.md).

**Known-gap policy.** A failure matching a `Bn` row in §6 → `Block (Bn)`, with the row cited. Any
other failure → `NG` with a bug id. Do not use §6 to excuse a defect it does not name.

**Viewport.** **1024×768** (the supported floor) for every layout / long-value case, plus one wide
pass at **≥1440px**. Below 1024px is out of scope.

**Account safety.** No login case belongs to this unit, but repeated wrong-password attempts lock a
real Cognito account for ~15 minutes and would block every remaining case — never re-type a password
to "retry" a session; ask for a fresh token instead.

**Date sensitivity.** Last-visit and join-period windows are computed against the **real** current
date (the prototype's `TODAY = 2026/04/30` does not apply): compute the expected bounds at run time.
The bulk-change effective date is the 1st of the **next** month relative to the run date.

---

## 9. Suggested order

Single unit, so this is the order **within** the TC doc:

1. **P1 roster, search, states** (FR-001–FR-005) — nothing downstream is meaningful until the roster
   renders against the real API; also settles the load-failure vs empty distinction early.
2. **P2 filters, sort, pagination** (FR-006–FR-011) — builds on the roster and produces the filtered
   population that "select all matching" later consumes.
3. **Long-value / 1024px stress sweep** — run on the populated roster from step 2, before any
   mutation, so a layout defect is never confused with a data change.
4. **P3 selection + select-all dialog** (FR-013–FR-015) — read-only, needs a multi-page result.
5. **Bulk-change dialog, non-executing paths** (FR-016: disabled 実行, preview, price, effective
   date, cancel) — still no server write.
6. **Bulk execute** (FR-017 + the refusal paths) — **last of the functional cases**: it is the only
   step that writes to shared data, needs the user's go-ahead, and leaves a booking behind.
7. **Permission matrix sweep** (FR-019, FR-012, FR-018) — run across whatever roles have tokens;
   the rest go `Block (B1)`. Kept last because it needs repeated re-authentication.
8. **`[Ladyroom]` cases** — inside the cross-feature order of the 029 plan §9 (step 11), after the 023 slice
   created the QA 主契約; the AREA-BULK execute follows step 6's rules (go-ahead, last).

---

## 10. Definition of done

- [ ] `TC -【Fitness CRM】- [A-01][会員管理（一覧）].md` reconciled against this plan — the deltas
      D1–D13 marked in Notes, the §5 real-API and 1024px stress cases added, `Bn` treatments wired in.
- [ ] Every FR-001–FR-019 traced to ≥1 case; FR-026 (D12) deliberately out of this screen's tracking (see §4).
- [ ] Parity checklist PAR001–PAR086 reconciled — any element/state without a case added **before**
      execution.
- [ ] The doc executed once end-to-end in the §9 order, at 1024×768 plus one ≥1440px pass, with
      OK / NG / `Block (Bn)` recorded per case.
- [ ] Open bugs re-checked: `BUG-A01-08`, `BUG-A01-09`, `BUG-A01-10`.
- [ ] Test data: every bulk-change booking created by the run listed (member id, plan, month) at the
      end of the TC doc, with a note that it cannot be cleaned up from the CRM.
- [ ] `[Ladyroom]` cases (LR1–LR3) added and run in the 029 cross-feature order; TC-125 – TC-135 rewritten for the 2026-11-19 decision and re-run
      if it blocks.

---

## Next step

Run **`gen-testcases`** on Unit 1 (Member list) — sources in §3, deltas in §4, coverage focus in §5.
