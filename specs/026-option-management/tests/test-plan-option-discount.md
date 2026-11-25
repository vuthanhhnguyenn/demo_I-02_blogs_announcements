# Test Plan: G-02-02 Set Discount (セット割設定) — Phase 2, real API

**Spec**: [spec.md](../spec.md) → section "Set-Discount Alignment (G-02-02)" (incl. "Real API integration", last updated 2026-09-25); requirement doc `.cache/fitness-spec/crm/requirements/G-02.md` `260731_v3` (FR-006, 補足 G-02-02, 権限マトリクス)
**PO Spec**: `G-02-02` — セット割登録 (FIT365 only), L2 supplement of `G-02`
**Created**: 2026-09-30
**Sibling plan**: [test-plan.md](test-plan.md) covers the option **master** (`/options`). That plan stops at the セット割設定 button; this plan starts at the `/option-discount` route. The two share one data policy where noted (§8).
**Integration round**: **all three screens run on `src/lib/api-real`** (`GET/POST/PATCH /api/v1/admin/option-sets…`, `PATCH …/active`, `GET /admin/staff/{id}`, `GET /admin/options?brandEnum=Fit365…`). Gap register source: `api-integration-output/option-discount-{list,detail,form}/report.md` (list/detail 2026-09-30 / 2026-09-24, form 2026-09-30). **No `specs/026-option-management/integration-plan.md` exists**; the `Bn` table below holds one open item plus watch items.
**Consumed by**: `gen-testcases` → `execute-testcases`

> **File name note.** `test-plan.md` in this folder already belongs to the option master, so this plan is saved as `test-plan-option-discount.md`. Point `gen-testcases` at this file explicitly for the three units below.

---

## 1. Scope

**In scope** — the set-discount screens under `/option-discount`:

- **List**: keyword search (セット割名 only), 割引タイプ and ステータス selects, filter result banner 「全 N 件中 M 件を抽出中」 + 条件をクリア, empty state (empty vs filtered), server-side sort (セット割名 / 割引額 only), pagination, 新規登録 button, row ⋯ menu (編集 / 無効化する ⇄ 有効化する), 「FIT365 限定」 badge, breadcrumb back to オプション管理.
- **Form**: create (`/option-discount/create`) and edit (`/option-discount/[id]/edit`) — one component, two modes; 基本情報 (セット割名, 説明), 対象オプション candidates (FIT365, active, no locker contract types), 割引設定 (タイプ / 金額・率 with unit / 適用条件), ステータス switch (two-call save on edit), impact warning, discard dialog 「変更を破棄しますか？」.
- **Detail** (`/option-discount/[id]`): 基本情報, 対象オプション, 割引設定, 適用ルール (static), ステータス card, 適用状況 (対象会員数), その他情報 (作成/最終更新日時, 更新者 via staff lookup), header 編集 button and 無効にする / 有効にする menu, not-found state.
- **Role gating** of all three screens, including server-enforced refusal.

**Out of scope** (checked only up to "goes to the right place"):

- **The セット割設定 entry button on `/options`** and its JOYFIT hiding — owned by the option plan (unit G-02-A). Here it is only the _starting click_ of the flow.
- **Option master screens** — source of the candidate list; they are not edited here.
- **Discount _behaviour_ on member contracts** (A-01-01-c contract operations, C-01 enrolment, F-01 billing): G-02.md FR-006 rules "片方解除で割引解除 / 再追加で再適用 / キャンペーン併用時は不発動" execute downstream. This plan tests only that the rules are **stated** correctly on the form and detail.
- **Set-discount change history** and **削除** — removed by decision (dev answer 2026-08-24). Their **absence** is tested.
- Mock `/crm/option-discounts` routes — unused, not reachable from UI.

---

## 2. Unit table

| #   | Unit          | Screen(s)                                                                                              | Route                                                   | TC doc filename                                         |
| --- | ------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------- |
| 1   | G-02-D List   | セット割設定 一覧 (search, 2 selects, result banner, sort, paging, 新規登録, row ⋯ menu, empty states) | `/option-discount`                                      | `TC -【Fitness CRM】- [G-02-D][Set Discount List].md`   |
| 2   | G-02-E Form   | セット割 新規登録 / 編集 — one component in two modes, plus the 変更を破棄しますか？ dialog it owns    | `/option-discount/create`, `/option-discount/[id]/edit` | `TC -【Fitness CRM】- [G-02-E][Set Discount Form].md`   |
| 3   | G-02-F Detail | セット割 詳細 — all cards, status menu, not-found / error state                                        | `/option-discount/[id]`                                 | `TC -【Fitness CRM】- [G-02-F][Set Discount Detail].md` |

All files under `specs/026-option-management/tests/cases/`. IDs continue after `G-02-A/B/C` (option master).

**Split rationale**: one unit per screen. Create and edit share one component and one prototype file (`set-discount-form.tsx`); the discard dialog exists only inside it. Detail has its own route and the only read of `appliedContractCount` and the 更新者 lookup.

---

## 3. Sources per unit

| Unit          | Spec sections                                                                                                                                                                    | UI prototype file                                         | Requirements covered (see §7)         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| G-02-D List   | spec.md "Set-Discount Alignment" → Removed / Added-changed (List rows), Kept (row menu), Real API integration (sorting, filters); G-02.md FR-006 管理, FR-S001, 権限マトリクス   | `.cache/fitness-crm-ui/src/pages/set-discount.tsx`        | SD-01, 03, 04, 05, 06, 08             |
| G-02-E Form   | spec.md "Set-Discount Alignment" → Form rows, Kept (説明 / 適用条件 / 割引設定 notes), Real API integration (Validation, Candidates, After save); G-02.md FR-006, 権限マトリクス | `.cache/fitness-crm-ui/src/pages/set-discount-form.tsx`   | SD-01, 02, 03, 04, 05, 06, 07, 08, 10 |
| G-02-F Detail | spec.md "Set-Discount Alignment" → Detail rows, Not changed (有効開始日 removed), Real API integration (Detail fields); G-02.md FR-006 適用ルール, 権限マトリクス                | `.cache/fitness-crm-ui/src/pages/set-discount-detail.tsx` | SD-01, 02, 03, 04, 05, 06, 08, 09     |

`gen-testcases` reads only its unit's slice. The option-master sections of spec.md (User Stories, FR-001–FR-020) are **not** sources for these units.

---

## 4. Spec-vs-prototype deltas

`gen-testcases` must mark each of these in the Notes of the affected case(s). "Spec" = G-02.md FR-006 + spec.md alignment section + real contract.

| ID  | Item                                   | In spec / contract                                                                                                                                              | In prototype                                                                 | How to test                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Minimum 対象オプション**             | FR-006 「オプションの**組み合わせ**」; API `422 E-SET-003` = at least **two**                                                                                   | Form accepts one (seed rows have one option)                                 | Plan to spec: 0 and 1 checked → blocked with an error; 2 → passes. Do not file the prototype's single-option seed rows as a defect.                                                                                                                                                                                                         |
| D2  | **Form validation**                    | セット割名 required ≤ 100, 説明 ≤ 1000, fixed = integer ≥ 0 with **no upper bound** (decision 2026-10-01), percentage ≤ 100, no duplicate options (`E-SET-004`) | Only `RequiredMark`s; `handleSubmit` has no checks (prototype logic ≠ spec)  | Follow the contract; boundaries in §6 G-02-E. Prototype logic is not an oracle.                                                                                                                                                                                                                                                             |
| D3  | **Sortable columns**                   | `sort` = `name` / `discountValue` only (qa-196)                                                                                                                 | All five headers sort (ID, 名, タイプ, 額, 状態) — prototype-gap `#15`       | Only セット割名 and 割引額 show a sort affordance and reorder. ID / 割引タイプ / 状態 being non-sortable is **not** `NG`.                                                                                                                                                                                                                   |
| D4  | **有効開始日** (「{日付} より有効」)   | Not modelled in `OptionSetDetailDto`, design doc or FR-006; qa-252 (2026-10-05): customer dropped it                                                            | StatusCard shows `effectiveFrom` (prototype to be updated)                   | Active set: card reads 「更新: {yyyy/MM/dd HH:mm}」 like 無効 (no 「… より有効」). 「… より有効」 shown → `NG`.                                                                                                                                                                                                                             |
| D5  | **更新者 source**                      | API returns `updatedBy` UUID only; name via `GET /admin/staff/{id}`; `null` → 「—」                                                                             | Name literal                                                                 | Name resolves to the staff's display name; a set never edited by a person shows 「—」 (no broken request).                                                                                                                                                                                                                                  |
| D6  | **Who may _view_ set discounts**       | 権限マトリクス: 登録・編集 = System / Headquarter ○, all others ×. **Read access for Manager / Staff is not stated** for this row                               | Write controls gated `["Headquarter","System"]`; read not gated in prototype | Spec-only gap. Observe Manager/Staff on list/detail, record what happens, and raise a customer QA if ambiguous. Write controls must be disabled/hidden (firm).                                                                                                                                                                              |
| D7  | **JOYFIT**                             | FR-006 「JOYFIT では G-02-02 画面は表示しない」                                                                                                                 | No brand concept on these screens; entry hidden via option list              | Entry hiding is in the option plan. Here: the 「FIT365 限定」 badge is on list and detail; candidates contain only FIT365 options (brand badge each). Route guard (spec FR-021, 2026-10-07): under a non-FIT365 header store every `/option-discount*` URL redirects to `/options`; FIT365 store and 全店舗（本部） open (TC-068 – TC-073). |
| D8  | **適用ルール** (3 lines)               | FR-006 「適用ルール」, fixed, **not per-set data**                                                                                                              | Static text on detail; two helper notes on form                              | Exact copy on detail (3 lines) and on form (2 notes). Identical across every set.                                                                                                                                                                                                                                                           |
| D9  | **Discount value display**             | —                                                                                                                                                               | List 「¥330」 / 「10%」; detail label 割引金額 or 割引率 + 「 / 月」         | Both value formats, label switch by type, and unit (円 / %) beside the form input.                                                                                                                                                                                                                                                          |
| D10 | **`Permission.OptionDiscountsDelete`** | Removed 2026-10-05 (no usage, no delete endpoint)                                                                                                               | —                                                                            | Nothing to test beyond SC: no 削除 affordance anywhere on these screens.                                                                                                                                                                                                                                                                    |

---

## 5. Coverage focus per unit

These are **added to** gen-testcases' full coverage walk, not a replacement.

### G-02-D List

- **Real-API behaviours**: `keyword` matches セット割名 **only** (an option name or description must not match); `discountType` + `isActive` filters, alone and combined with keyword; banner count 「全 N 件中 M 件」 equals the real filtered total; empty-state vs filtered-empty state and 条件をクリア; real pagination totals (「全 N 件中 a-b 件を表示」), prev/next disabled at the ends, page resets to 1 after a filter/sort change; sort asc/desc on セット割名 and 割引額 (割引額 sorts by **number**, mixing ¥ and % rows — note what the server does); 無効化する ⇄ 有効化する via `PATCH …/active` → toast 「「{name}」を無効化しました / 有効化しました」, badge and filtered result update after the call; state persists after reload and re-login; 401 (expired session) redirects to login; a 5xx/network error shows an error state, not a blank table.
- **UI breakage under stress (1024×768)**: 100-char full-width セット割名 and an equally long unbroken token in the name column and in the toast; a set with many 対象オプション (≥ 6 chips) wrapping in its cell; longest option name chip; large 割引額 (e.g. ¥999,999) in the right-aligned column; four+ filter chips in the banner summary; ⋯ menu position on the last row; horizontal scroll is confined to the table.
- **Role × gating**: 新規登録 and both menu items enabled for System / Headquarter only; Manager / Staff per D6; Trainer / Observer cannot reach the route (menu + direct URL).
- **Absence checks**: no 削除 item, no コード / 対象契約 / 店舗 / 適用数 columns, no `{N}件` header badge, no 詳細フィルター toggle, no 「すべてクリア」 (banner uses 条件をクリア).

### G-02-E Form

- **Real-API behaviours**: create → `POST`, returns to list with toast 「セット割引を登録しました」 and the row appears (reload-proof); edit → prefilled from `GET` (name, 説明, options, type, value, 適用条件, status), save → `PATCH`, **plus** `PATCH …/active` only when the switch changed (status-only, field-only, both), returns to detail with 「セット割引を更新しました」; error mapping: `E-SET-003` (< 2 options), `E-SET-004` (duplicate), `E-SET-002` and any other refusal shows the API's `userMessage`, never raw English or a stack; `404 E-SET-001` on `/option-discount/<unknown>/edit` → 「セット割が見つかりません」; `400 E-VAL-001` for a malformed id (`/option-discount/not-a-uuid/edit`) → no crash; double-click on 登録する creates **one** record; a server refusal keeps the user's input.
- **Candidates**: only active FIT365 options, no `locker_option` contract types, brand badge on each; an inactive / JOYFIT option is absent; in edit, an option already in the set stays visible and checked even if it would otherwise be filtered (saving must not drop it). Candidate list beyond the first 100 (request uses `limit=100`) — see W3.
- **Boundaries**: セット割名 empty / whitespace-only / 100 / 101 chars; 説明 1000 / 1001 (`maxLength`); 定額値引: empty, 0, negative, decimal, non-numeric, full-width digits, very large integer; 定率値引: 0, 1, 100, 100.5, 101; switching type after typing a value (unit, placeholder, and the value's validity re-evaluate); 適用条件 required, three choices only.
- **Copy & state**: impact warning 「割引条件を変更すると…」 in **edit mode only** — hidden on create (2026-10-05, deviation from the prototype); helper 「無効化すると新規入会フローでの選択肢から外れます」; create default status = 有効 per prototype — **verify against the data policy in §8** before saving (create fixtures 無効); submit label 「登録する」 / 「変更を保存する」; discard dialog from キャンセル and the back link only when dirty, 「編集を続ける」 keeps the form, 「破棄する」 leaves; browser back / reload with a dirty form.
- **UI breakage under stress (1024×768)**: 100-char full-width name in the input and after save in list/detail; 1000-char 説明; candidate grid (3 columns) with a long option name + brand badge; 割引設定 3-column row with the longest 適用条件 label and the error text under each field.
- **Role × gating**: submit disabled/hidden for non-HQ/System; a non-HQ/System user opening `/option-discount/create` or an edit URL directly gets a denied view or a server refusal, never a silent success.

### G-02-F Detail

- **Real-API behaviours**: every field round-trips from what the form saved (type label, value + 「 / 月」, 適用条件, 説明 or 「—」, option names); 更新者 name via staff lookup (D5); 対象会員数 = `appliedContractCount` with note 「構成オプションをすべて契約中の会員数」 (needs member data — `Block` "no fixture data" if unverifiable, never invent); 無効にする / 有効にする calls `PATCH …/active`, toast, StatusCard switches (both 有効 and 無効: 「更新: {日時}」, per D4), list reflects it; `404 E-SET-001` → 「セット割が見つかりません」 with no retry button; other errors → error state with retry; 401 expiry; survives reload.
- **Copy**: セット割ID with the セット割 glossary tooltip; 「FIT365 限定」 badge beside the status badge; label **割引金額** for 定額値引 vs **割引率** for 定率値引; 適用ルール 3 lines (D8); 説明 always rendered (「—」 when empty); **no tabs, no 変更履歴, no コード, no 対象契約, no 削除** (SC-absence checks).
- **UI breakage under stress (1024×768)**: 100-char full-width name in the header and breadcrumb/back area and in the toast; unbroken 1000-char 説明 (no overflow outside the card); ≥ 6 option chips wrapping; long staff name in 更新者; largest 対象会員数 with thousands separator.
- **Role × gating**: 編集 button and the status menu item enabled for System / Headquarter only; other roles per D6.

---

## 6. Known gaps (`Bn`) and watch items

| Bn     | Blocker / watch item                                                                                                                                                                                                        | UI behaviour today                       | Test treatment                                                                                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~B1~~ | ~~**有効開始日** has no source~~ — resolved 2026-10-05: qa-252 answered "remove the date"                                                                                                                                   | Active StatusCard reads 「更新: {日時}」 | No longer a gap; covered by D4                                                                                                                                               |
| W2     | `description` declared `type: object` on `Create/UpdateOptionSetDto` (server accepts string or `null`); client casts at one seam                                                                                            | Runtime correct per report               | Not a blocker. A save with / without 説明 that fails on type → `NG` and note the Swagger item                                                                                |
| W3     | Candidate request is `limit=100`; if more than 100 active FIT365 options exist, some are not selectable                                                                                                                     | Silent truncation                        | Count candidates vs `/options` FIT365 active total; if > 100 exist, `NG`; if not reachable → no case, note                                                                   |
| W4     | `appliedContractCount` value semantics (members holding **all** constituent options) cannot be checked without member-contract fixtures                                                                                     | Number shown                             | Compare only with data the tester can see; otherwise `Block` "no fixture data"                                                                                               |
| W5     | Paging needs > 1 page of data (list `limit`/page size); the shared backend may hold < 1 page of sets                                                                                                                        | —                                        | Do **not** create dozens of fixtures; run paging cases on **fake data** (intercept the list GET → 60 sets, server-style paging) — `Block` only if interception is impossible |
| ~~W6~~ | ~~Dev backend refused every QA login with `E-DMN-007` (domain allowlist) on 2026-10-01 — the fixes of that day were checked on fake auth/data only~~ — closed 2026-10-05: the cases were re-run on the real backend, all OK | —                                        | Re-run the cases listed in each TC doc's 2026-10-01 notes once login works; do not mark them `NG` for the login refusal                                                      |

Prototype-side items (`prototype-gap-list.md` **#15** sort columns) are never `NG` against the app.

---

## 7. Traceability map

G-02.md FR-006 is one requirement with several bullets, and spec.md's `FR-001–FR-020` belong to the option master — so this plan traces **FR-006's parts**, numbered `SD-xx` here so every part lands in a unit.

| ID    | Requirement (source)                                                                                 | Unit(s)              | Note                                                     |
| ----- | ---------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------- |
| SD-01 | セット割の定義: combination of options (FR-006)                                                      | Form, Detail, List   | D1; candidates; chips                                    |
| SD-02 | 割引設定: amount **or** rate (FR-006 #269)                                                           | Form, Detail         | D2, D9; boundaries                                       |
| SD-03 | 管理: list / create / edit / 無効化 (FR-006)                                                         | List, Form, Detail   | status via `/active`, two-call save                      |
| SD-04 | FIT365 only (FR-006 ブランド別差異, #353)                                                            | List, Form, Detail   | D7; badge, candidates                                    |
| SD-05 | 権限: System / Headquarter edit (権限マトリクス)                                                     | List, Form, Detail   | D6 for read access                                       |
| SD-06 | 適用条件 3 choices (G-02.md decision)                                                                | Form, Detail, List   | list badge is not shown; detail + form                   |
| SD-07 | 適用ルール text: 常時募集 / 解除で解除・再追加で再適用 / キャンペーン併用時不発動 (FR-006 #70, #425) | Form (notes), Detail | D8; **behaviour is downstream**, only the copy is tested |
| SD-08 | 削除・変更履歴なし (spec "Removed", dev answer 2026-08-24)                                           | List, Form, Detail   | absence checks                                           |
| SD-09 | 対象会員数 display (spec "Added/changed")                                                            | Detail               | W4                                                       |
| SD-10 | Unsaved-change guard + impact warning (spec "Added/changed")                                         | Form                 | both modes                                               |
| SD-11 | List search / filter / sort UX (FR-S001 as applied to set discounts)                                 | List                 | D3                                                       |

Every part lands in ≥1 unit. **Not traced, by decision**: the downstream _execution_ of the FR-006 rules on member contracts and billing (out of scope, §1). SC-001/002-style timing targets have no dedicated case; the tester notes a noticeably slow flow. **Open point for the customer**: D6 (read access for Manager / Staff).

---

## 8. Execution notes (for execute-testcases)

**Credentials** — the same real Cognito accounts as the option plan (`src/lib/auth/demo-users.ts`, password `Password@123`). The header 「デモ: ユーザー切替」 switcher appears only when `NEXT_PUBLIC_APP_ENV=development`; otherwise use the login form. **One account = one session** (a second sign-in kicks the first); CORS allows port 3000 only.

| Role        | Email                           | Use for                                                          |
| ----------- | ------------------------------- | ---------------------------------------------------------------- |
| Headquarter | `lodu4289+headquater@gmail.com` | Primary: all create / edit / toggle / positive cases             |
| System      | `lodu4289+1@gmail.com`          | Write spot-check; sequential second session only (session limit) |
| Manager     | `lodu4289+manager@gmail.com`    | D6 observation; write controls off; direct-URL refusal           |
| Staff       | `lodu4289+staff@gmail.com`      | Same as Manager                                                  |
| Trainer     | `lodu4289+trainer@gmail.com`    | No access (menu + direct URL)                                    |
| Observer    | `lodu4289+observer@gmail.com`   | No access (menu + direct URL)                                    |

No wrong-password / lockout case belongs to this feature. If one is added, run it last on an account no other case needs (~15 min lockout).

**Environment**: `NEXT_PUBLIC_REAL_API_URL=https://api.dev.fitness-v2.okamoto-hd.com` — **shared** with other developers and testers; **no seed reset**. These screens are on the real client, so `Block` is **not** available for "mock can't do it"; a real-API case that fails is `NG` unless it matches a `Bn` row or is a "no fixture data" case.

**Data policy**

- **Set discounts cannot be deleted** (no DELETE endpoint; 削除 absent by design). Every set this run creates **stays** in the shared backend. Keep fixtures to a minimum (target ≤ 5) and reuse them.
- **Prefix**: name `QA-SET <YYYYMMDD>-<seq> …` (e.g. `QA-SET 20260930-01 水素水＋ロッカー`). The stress fixture uses the same prefix, padded with full-width characters to 100.
- **Create as 無効.** An active set is offered in the new-enrolment flow and discounts real members' contracts on the shared backend. The form defaults the switch to 有効 (prototype) — **turn it off before 登録する** for every fixture. Switch a fixture to 有効 only inside the case that needs it (status toggle, 有効 StatusCard, filter by 有効) and back to 無効 **in the same case**.
- **Writes with limited scope are allowed** (decided 2026-10-01): a case may write to the shared backend as long as it never touches all of the data — only records this run created (prefix rules below), never a pre-existing set or option. A **pure-UI** case with no suitable data (long names, > 1 page, empty 更新者, an error / 401 / offline state, a write that would leave a record) is run on **fake data**: intercept the request in the browser (Playwright `route`) and fulfil it with the needed payload; nothing reaches the backend. Say "fake data" in the case's Notes.
- **Options used as constituents**: pick **pre-existing** active FIT365 options, _read-only_ — selecting them in a set does not edit the option. Do not create, edit or activate options from this plan (the `QA-OPT` fixtures of the option plan are created 無効 and will not appear as candidates). If fewer than two eligible options exist, record `Block` "no fixture data".
- **Never save a pre-existing set** (anything without the `QA-SET` prefix, e.g. the seeded 「ロッカー + 水素水 セット (dev)」). Opening its detail is fine; opening its **edit** form to inspect prefill / discard guard is allowed only if the case ends with キャンセル / 破棄 and **no save**. Toggling a pre-existing set's status is **forbidden** — use fixtures.
- **Error cases** (`E-SET-003`, `E-SET-004`, malformed / unknown id) must not leave records: they are refusals. If a refusal case unexpectedly **succeeds**, record it `NG` and add the created set to the leftover list.
- **Cleanup**: every `QA-SET` fixture ends 無効; list the fixture IDs left behind in each TC doc's result notes.

**Known-gap policy**: failure matching a `Bn` row → `Block (Bn)`; undocumented failure → `NG`. Items in spec.md "Not changed, deliberately" and prototype-gap `#15` are never `NG` against the app. D1–D10 are applied as written in §4.

**Viewport**: 1024×768 (floor) for layout / stress cases; ≥ 1440px for the wide check. Below 1024px out of scope.

---

## 9. Suggested order

1. **G-02-D List** (read-only) — baseline totals; note which existing sets and eligible options exist _before_ any fixture; locate a many-options set for chip wrapping.
2. **G-02-E Form — create** — creates the `QA-SET` fixtures (normal 定額; 定率; max-length stress; multi-option). Refusal cases (`E-SET-003/004`, boundaries) run here, before/around creates.
3. **G-02-F Detail** — round-trip every field on fixtures; 更新者; static 適用ルール; read-only look at an existing set for 対象会員数 and StatusCard.
4. **G-02-E Form — edit** — fixtures only (field-only, status-only, both → two-call save); read-only inspection of one pre-existing set (cancel/discard); then back to Detail to check updated values.
5. **G-02-D List re-check** — fixtures appear with correct badges / values; filters, search-by-name-only, sort; 無効化する ⇄ 有効化する on a fixture; long-name layout.
6. **Role gating (all units)** — Manager / Staff / Trainer / Observer last so they do not interrupt HQ setup.
7. **Cleanup** — every fixture 無効; record IDs.

---

## 10. Definition of done

- [ ] Three TC docs created under `specs/026-option-management/tests/cases/` (G-02-D / G-02-E / G-02-F).
- [ ] Every SD-01–SD-11 traced to ≥1 case; D1–D10 marked in the affected cases' Notes.
- [ ] Checklist gaps fixed first: re-check the `Bn`/`W` table against the current `api-integration-output/option-discount-*/report.md` (B1 closed by qa-252, 2026-10-05); resolve D6 (Manager / Staff read access) or keep it as an "observe and record" case.
- [ ] Each TC doc executed once via `execute-testcases`, results (OK / NG / Block (Bn)) written back.
- [ ] All `QA-SET` fixtures 無効, IDs listed in the TC docs (they cannot be deleted).
