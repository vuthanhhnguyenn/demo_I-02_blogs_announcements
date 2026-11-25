# Test Plan: Y-01 Position Master Management (職位マスター管理) — 017

**Spec**: [../spec.md](../spec.md) · [../integration-plan.md](../integration-plan.md)
**PO Spec**: `Y-01` — スタッフ・権限管理 (`crm/requirements/Y-01.md`, Y-01 260722_v4) — this plan covers the **Position Master slice only** (source FR-006, FR-S001, and FR-009 as realized by the list's preview pane)
**Created**: 2026-09-17
**Integration round**: **Round 2, pass 2 (2026-09-17)** — all three screens are fully on the real API (`src/lib/api-real` → `NEXT_PUBLIC_REAL_API_URL`). No mock route is called by this feature any more. Static gates green; **live smoke has never been run** — this test plan is the first live exercise of the integration.
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

> ⚠️ **Master-data directive (user, 2026-09-17)**: the backend now holds **real master data**. No test may
> edit, rename, or delete a pre-existing position. Every create/edit/delete case must work on a position
> **the run created itself** with the agreed prefix, and must delete it before the run ends. See
> **Execution Notes → Data policy** — it is binding on every unit, not advisory.

---

## Scope

**In scope** (the three routes below):

- **職位マスター管理** — two-pane list screen: position table, name search, 権限で絞り込む reverse-permission popover, filter-result banner, pagination, the right-hand permission preview pane (category accordion + 重要操作 warning + 割当スタッフ panel), the row ⋯ menu and its delete confirmation dialog — `position-list.tsx` → `/positions` (`?positionId=` preselect)
- **職位 新規作成 / 職位 複製して作成** — the create form and its clone mode (same route, `?cloneFrom={id}`): 基本情報 section, 権限設定 catalog accordions with bulk 全ON/全OFF, CSV role-default seeding, required-field validation, unsaved-changes guard — `position-form.tsx` → `/positions/create`
- **職位 編集** — the same form in edit mode: prefill from the position detail, **disabled** 対象ロール, PATCH semantics (description clear), rename-uniqueness rejection — `position-form.tsx` → `/positions/[id]/edit`

**Out of scope** (navigation targets / separate specs — no unit may expand into these):

- **Staff account management** — the staff list/detail/create/edit screens (`specs/020-staff-permission-management/tests/cases/[Y-01][01..04]`). This feature only _reads_ staff for counts and the preview's top-3, and _navigates_ to them; a click that lands on a staff screen is verified as "correct destination + correct pre-filter", nothing beyond.
- **Change-history writing** (Y-01 FR-010) — FR-019 makes history seed-only; position operations write none, and no history UI exists on these screens.
- **Role master editing** — roles are a fixed 6-value set (FR-018); nothing creates/renames/deletes a role anywhere.
- **CSV-export enforcement in other features** — this plan verifies that the CSV permission _values_ are set on the position, never that an A/B/G screen's CSV button obeys them.
- **System-managed position UX** — `is_system_managed` exists in the contract with a 422 guard, but no dedicated UI state was built and no position is known to be flagged (spec → Out of Scope, Assumptions). See **Known gaps → G3**.
- **Login / session establishment itself** — owned by `specs/028-subsequent-login` and `specs/029-password-reset`. This plan only consumes a signed-in session (and tests the 401-expiry _reaction_ of these three screens).

---

## Unit Table

| #   | Unit                              | Screen(s)                                                                                                 | Route                                                    | TC Doc Filename                                          |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| 1   | 職位マスター管理 (list + preview) | 職位一覧テーブル / 権限プレビューペイン / 権限で絞り込むポップオーバー / 行⋯メニュー / 削除確認ダイアログ | `/positions` (`?positionId={id}`)                        | `TC -【Fitness CRM】- [Y-01][05][職位マスター管理].md`   |
| 2   | 職位 新規作成・複製               | 職位 新規作成 / 職位 複製して作成 (same component, clone = query param)                                   | `/positions/create` · `/positions/create?cloneFrom={id}` | `TC -【Fitness CRM】- [Y-01][06][職位新規作成・複製].md` |
| 3   | 職位 編集                         | 職位 編集                                                                                                 | `/positions/[id]/edit`                                   | `TC -【Fitness CRM】- [Y-01][07][職位編集].md`           |

All under `specs/017-position-management/tests/cases/`. Numbered `05`–`07` to continue the `[Y-01][01..04]`
staff docs in `specs/020-staff-permission-management/` — all four specs share PO Spec `Y-01`.

**Split rationale**:

- **Unit 1 stands alone** — it is the only screen with a data table, a URL-driven filter/pagination state machine, and a second pane. The preview pane, the 権限で絞り込む popover and the delete dialog are clustered **into** it (unit rule's "modals that exist only inside a parent screen"): none is reachable except from a list row, and none has its own route.
- **Units 2 and 3 are split from each other** although they share one React component, because they differ on every axis a tester touches: different route, different data source (empty vs `GET /positions/{id}` prefill), different HTTP verb (`POST` vs `PATCH` — with PATCH-only semantics like _omitted = unchanged / explicit `null` = clear_), and one behaviour that is **inverted** between them (対象ロール selectable + CSV re-seeding in create; disabled + never re-seeded in edit, FR-012/FR-011). Merging them would make every case carry a mode qualifier.
- **Clone is clustered into Unit 2, not split off** — it is literally `/positions/create` plus `?cloneFrom={id}`, saves through the same `POST`, and its only delta is the prefill (role/description/permissions filled, **name deliberately blank**). That is a handful of cases inside Unit 2, not a screen.

---

## Sources per Unit

| Unit                    | Spec sections                                                                                                                                                                                                                                                                                                          | UI prototype file                                   | FRs covered                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1 — 職位マスター管理    | User Story 1 (all 7 scenarios); User Story 5 (all 3 scenarios); Edge Cases: `positionId` no-match, AND-combination, page reset/clamp, grant-state filter match, staff-count link double-fire, delete server-side guard, role-gated affordances; Input Validation Rules rows `search` / `page` / `limit` / `permission` | `.cache/fitness-crm-ui/src/pages/position-list.tsx` | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-007a, FR-008, FR-014, FR-017, FR-018 (display side) |
| 2 — 職位 新規作成・複製 | User Story 2 (all 8 scenarios); User Story 4 (both scenarios); Edge Cases: role re-seeds only CSV, duplicate (role,name) race, clone starts with zero staff; Input Validation Rules rows `name` / `description` / `role` (create) / `permissions`                                                                      | `.cache/fitness-crm-ui/src/pages/position-form.tsx` | FR-009, FR-009a, FR-010, FR-011, FR-013, FR-015, FR-016, FR-017, FR-018 (selectable set)                       |
| 3 — 職位 編集           | User Story 3 (all 5 scenarios); Edge Cases: role can never change in edit, duplicate rename; Input Validation Rules rows `name` / `description` / `role` (edit); the PATCH row of **API Design Reference**                                                                                                             | `.cache/fitness-crm-ui/src/pages/position-form.tsx` | FR-010, FR-012, FR-015, FR-016, FR-017                                                                         |

**Cross-references for every unit** (read once, applied per unit):

- Spec → **Input Validation Rules** table (the FE/BE constraint mirror, audited 2026-09-17) — the oracle for every boundary case.
- Spec → **API Design Reference** table — the endpoint each surface calls and the error codes it can receive.
- Spec → **Clarifications, Session 2026-09-17** — the source of every delta row below; `gen-testcases` must quote it in the affected cases' Notes.
- `crm/requirements/Y-01.md` (FR-006 職位マスター, FR-S001 CSV出力権限, FR-009 職位別権限プレビュー, and the 職位マスター管理 = System ○ / Headquarter ○ / others × permission-matrix row that FR-017 implements).
- `tests/checklists/common-function-checklist.md` + `common-gui-validate-checklist.md` — the baseline coverage walk each unit is _added to_.

---

## Spec-vs-Prototype Deltas

One row per spec-only requirement and per spec↔prototype conflict. **The spec wins in every row**;
`gen-testcases` MUST mark each of these in the affected case's Notes so a tester never files an NG
against the prototype's behaviour.

| #    | Item                                    | In spec                                                                                                                                                                     | In prototype (`@426a9b3`)                                                                              | How to test                                                                                                                                                                                                           |
| ---- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | 対象ロール in edit mode                 | **Disabled**, shows the current role, never sent (FR-012, Clarification Q3 — role immutable, PATCH accepts no role)                                                         | Selector stays **enabled**; the code even derives an `isRoleChanged` warning (`position-form.tsx:243`) | Unit 3: assert the select is disabled/non-interactive and the role is still displayed. A working selector is an **NG**, not a pass. Notes must cite Q3.                                                               |
| D-2  | Page-size options                       | **25 / 50 / 100**, default 50 — the BE caps `limit` at 100 (FR-005 as corrected 2026-09-17)                                                                                 | `PAGE_SIZE_OPTIONS = [25, 50, 100, 200]` (`position-list.tsx:596`)                                     | Unit 1: assert exactly three options and no 200. Also assert a hand-edited `?limit=200` falls back to 50 (Input Validation Rules).                                                                                    |
| D-3  | Rendered permission catalog size        | **Whatever `GET /api/v1/admin/permissions` returns** — currently **58 flags / 10 categories** (FR-009a, FR-011 as amended); FE declares no key, label, order or description | Hardcoded `PERMISSION_CATEGORIES` = the prototype's **36** toggles                                     | Units 1–3: never assert a fixed toggle count or a specific label list. Assert the form/preview render _exactly_ the catalog response (count categories/permissions from the API response, not from the mockup).       |
| D-4  | 「ゲートストップ設定の変更」 toggle     | **Not rendered at all** — no catalog flag (Clarification 2026-09-17, R201 closed by removal). Spec Q5 stays open as a BE ask                                                | Present as a normal toggle in the システム設定 category                                                | Units 2–3: assert the row is **absent**. Notes must record that this **weakens Y-01 FR-006 v2 coverage** and is the item most needing a PO call (spec Q5). Its absence is expected, not a defect.                     |
| D-5  | 重要操作 ⚠ classification               | **API-driven** — `type === 'destructive'` from the catalog (FR-007a amended 2026-09-17, PO ratification pending → Q6); appears on more categories than three keys           | Fixed three keys (強制退会の実行 / 請求確定後の変更 / 返金処理の実行)                                  | Unit 1: derive the expected ⚠ set from the catalog's `type` field for the position under test, not from the three prototype keys. Tooltip copy「強制退会・返金など重要操作を含みます」is unchanged and IS asserted.   |
| D-6  | Helper text under each toggle           | **Server-owned** `description` (nullable; non-null on 13 keys) rendered only when non-null (FR-009a amended)                                                                | FE-held description map                                                                                | Unit 2: assert helper text matches the catalog response verbatim, and that keys with `description: null` render **no** helper line. Integration-plan "Behaviour changes" #2 flags this as needing an eyeball.         |
| D-7  | 権限フラグ section in the preview pane  | **Must not exist** — merged into the アクセス権限 accordion (FR-007, API answer 2026-07-29)                                                                                 | Already removed in the 7/23 prototype (consistent)                                                     | Unit 1: assert absence explicitly — it is a contractual "MUST NOT render", cheap to regress.                                                                                                                          |
| D-8  | 対象ロール disabled while catalog loads | **Spec-only** — no FR covers it; introduced by the pass-2 integration so a role can never be picked before CSV defaults can apply                                           | No such state                                                                                          | Unit 2: on a cold create-form load, the role select is briefly disabled, then enabled. Judge on intent (a role picked before the catalog resolves must still get its CSV defaults). Not an NG if too fast to observe. |
| D-9  | Unknown `?permission=` key              | **Spec-only** (Input Validation Rules) — reaches the API and surfaces `E-VAL-001`; 条件をクリア clears it                                                                   | Filter is a client-side array lookup; an unknown key silently matches nothing                          | Unit 1: hand-edit the URL with a nonsense key → the screen must show the server error state, not an empty table, and must recover via 条件をクリア.                                                                   |
| D-10 | Blank/whitespace-only 職位名            | **FE stricter than BE** — rejected client-side (FR-015) although the server would accept `""`                                                                               | Same (`positionName.trim()`)                                                                           | Unit 2/3: a whitespace-only name must be blocked **before** any request fires (verify no network call), with the inline message.                                                                                      |

---

## Coverage Focus per Unit

These are **added to**, not a replacement for, `gen-testcases`' full coverage walk against the two common
checklists.

### Unit 1 — 職位マスター管理 (`/positions`)

**Real-API behaviours**

- **Real pagination totals**: the header count badge, the banner's「全 {total} 件中 {matched} 件」and the footer「全 N 件 / P ページ / X-Y を表示」must all agree with the live dataset — not with the 13 seeded positions the spec's Assumptions describe. Assert internal consistency (badge = footer total; X-Y range = page size × page), never a literal number.
- The baseline/unfiltered total comes from a **second query** (`?page=1&limit=1`) because the list response still has no `includeTotalAll` (**G2/R205**) — check the banner's「全 N 件」stays correct while a filter is applied, and that it does not flicker to the filtered count.
- **Server-side validation the FE now pre-clamps**: `?page=0` and `?page=-1` must be clamped to 1 client-side (no `E-VAL-001` reaches the UI, and the footer renders the clamped page); `?limit=200` / `?limit=0` fall back to 50; a >100-character search value in the URL is capped at 100 before the request. Each of these is a _deep-link_ case — type them into the address bar, don't drive the control.
- **Error codes this screen can receive**: `400 E-VAL-001` (unknown `?permission=` key — D-9), `404 E-STF-009` (`?positionId=` pointing at a deleted/unknown position — spec Edge Case says **no error, placeholder preview**; confirm the 404 from the detail query does not surface as an error toast), `409 E-STF-011` (delete of an in-use position — see **G1**), `422 E-STF-012` (system-managed — see **G3**), `403` (non-HQ role).
- **401 session expiry**: with the list open, let/force the session expire, then trigger a refetch (change page or re-search) → the screen must route to login rather than render an empty or broken table. Re-login must land back on a working list.
- **Server-enforced permissions vs affordances (FR-017)**: for Manager / Staff / Trainer / Observer, the 職位を追加 button and the ⋯ menu's 編集 / 複製 / 削除 must not be usable. Verify **both** layers: the affordance is hidden/disabled **and** a direct navigation to `/positions/create` is refused. Read access itself follows the staff-view permission — record what each role actually sees (full list / no access) as the observed baseline.
- **Persistence after reload / re-login**: search + permission filter + page + page size + `positionId` all live in the URL — a full reload must restore the identical view, and so must a re-login that returns to the same URL.

**Computed values & business rules**

- **アクセス権限数「N / total」** is server-computed (`grantedCategoryCount` / `totalCategoryCount`). Cross-check one row against its own preview pane: N must equal the number of categories whose accordion shows a level other than アクセス不可 (CSV category: 出力可 counts).
- **Preview access-level derivation**: 閲覧・編集 / 閲覧のみ / アクセス不可 derived from the flat boolean map (any `edit`/`destructive`-type key granted → 閲覧・編集; only a `view`-type key → 閲覧のみ; none → アクセス不可); the CSV出力管理 category renders 出力可 / 出力不可 instead. Test one category at each level on the same position.
- **重要操作 ⚠** per D-5 — expected set derived from the catalog `type`, and the icon appears only when the destructive permission is **granted**, not merely present.
- **割当スタッフ panel (FR-008)**: count now comes from `PositionDto.staffCount` while the names come from a separate staff query — assert the count renders **before** the names (skeletons) and that the two never disagree once settled. Also: max 3 shown, active-first ordering, initial-circle avatar, 無効 badge + 無効{N}名 note, store sub-line, hover arrow, and the correct trailing link (「他 N 名を見る →」when total > 3, otherwise「スタッフ一覧で見る →」), landing on the staff list **pre-filtered to this position**. 「割当なし」at zero.
- **Reverse filter semantics (FR-003)**: matching must reflect the **actual grant state**, not the category label — pick a permission, then open each returned position's preview and confirm that exact permission is granted; then confirm a position you know lacks it is absent.
- **Selection state machine**: row click selects; clicking the same row again deselects and restores the placeholder; the「N名」staff-count link selects the row **without** double-firing into a deselect; `?positionId=` preselects; a `positionId` matching nothing → placeholder, no error.
- **Empty-state split (FR-006)**: filtered-empty (with 条件をクリア) vs true-empty master (no action). The true-empty state is almost certainly unreachable against real master data → author it, expect `Block (G4)`.
- **Reset/clamp rules**: changing search, permission filter, or page size resets to page 1; deleting the last row of the last page clamps to the last valid page.
- **Delete guard (FR-014)**: on a position **with** assigned staff, the ⋯ menu's delete item is disabled and reads「削除（割当あり）」— **open the menu and look; never click through**. On the run's own throw-away position (zero staff), the dialog copy「職位を削除しますか？」/「「{職位名}」を削除します。この操作は取り消せません。」/ キャンセル / 削除する, cancel = no change, confirm = row gone + total badge decreases + preview returns to placeholder if it was selected.

**UI breakage under stress (at the 1024px floor)**

- A position created with a **100-character full-width Japanese name** (the `maxLength` boundary) and a **500-character description**: check the list row's name + description sub-line, the preview pane header, the delete dialog's「「{name}」を削除します」 sentence, and the filter banner's condition summary — no overflow, no layout break, truncation with a tooltip/ellipsis where the design truncates.
- The same at 100 characters of an **unbroken ASCII token** (no wrap opportunities) — the harsher case for CSS word-breaking.
- The **longest role badge label** and the longest category/permission label the catalog returns, in the table header row, the badge column, and every accordion trigger.
- A position granted **all 58 permissions** → every accordion expanded, ⚠ icons on many categories, a full 割当スタッフ panel: the right pane must scroll internally without pushing the table off-screen.
- A search box filled to its 100-character cap; the banner must not wrap the 条件をクリア action out of reach.
- Repeat the two worst of these at **≥1440px** for the wide check.

### Unit 2 — 職位 新規作成・複製 (`/positions/create`)

**Real-API behaviours**

- **The `description` cast is the single unresolved integration seam (B3/G5)** — `CreatePositionDto.description` is typed `object` in the OpenAPI. **This is the highest-value case in the whole plan**: create a position with a non-empty description and confirm the dev API accepts a string body (200/201, description readable back in the list and the edit prefill). A `400 E-VAL-001` here is `Block (G5)`, not NG, and must be reported immediately — the integration plan's own verification section names it as never having been smoke-tested.
- **`409 E-STF-010` duplicate (role, name)** (FR-010): create the run's own position, then attempt a second create with the **same name and same role** → rejected with a user-facing duplicate-name message surfaced as an **inline error on 職位名**, form state preserved, nothing created. Then the same name with a **different role** → must succeed (uniqueness is per role) — remember to delete both.
- **`400 E-VAL-001` on unknown permission key** should now be unreachable (every key is catalog-sourced). Assert positively that the request body's permission keys all come from the catalog response.
- **Catalog is the sole source (FR-009a)**: the categories, their order, the per-category totals and the helper text all come from `GET /api/v1/admin/permissions`. Assert the rendered structure equals the response (see D-3/D-6). The catalog may be cached 300 s — a reload must not change the rendering.
- **401 expiry mid-form**: fill the form, let the session expire, submit → must route to login without silently dropping the user on a dead form claiming success.
- **Server-enforced write permission (FR-017)**: as Manager/Staff/Trainer/Observer, direct navigation to `/positions/create` must be refused (not merely a hidden button on the list).
- **Persistence**: after a successful create, reload the list — the new position is really there (not just optimistic UI); and it is visible after a full re-login.

**Computed values & business rules**

- **CSV role-default seeding (FR-011 / FR-S001 / SC-003)** — the highest-value business rule here. Select 本部 → the CSV出力管理 toggles (会員CSV / 入退館CSV / アンケートCSV, read from the catalog's `csv_export` category) go **ON**; マネージャー → ON; スタッフ / トレーナー / 閲覧のみ → **OFF**. Then: change the role again → CSV toggles **re-seed** (overwriting manual CSV edits) while **every other category is untouched** — set a few non-CSV toggles first and prove they survive.
- **Clone mode never re-seeds**: `?cloneFrom={id}` prefills role/description/permissions with the **name left blank**. The role selector is still selectable here (clone follows create-mode rules), but the form is prefilled — so per FR-011 changing the role in clone mode must **NOT** re-seed the CSV toggles. Author this explicitly; it is the subtlest rule on the screen and the easiest to implement backwards.
- **Clone independence**: saving the clone leaves the source **untouched** (re-open the source's preview and diff), and the new position has **zero assigned staff**.
- **All toggles default OFF and no role selected** on a fresh create form.
- **Bulk 全ON/全OFF** per category: sets every toggle in that category; the switch reads 全ON only when _all_ of the category's permissions are on; flipping one member off must flip the bulk switch back.
- **Per-category enabled/total badges** update live as toggles change, and the totals equal the catalog's per-category counts.
- **Required-field validation (FR-015)**: blank 職位名 and/or unselected 対象ロール → submission blocked, inline「職位名を入力してください」/「対象ロールを選択してください」, footer summary「未入力の項目があります」, and the view **scrolls to the first invalid field**; typing/selecting clears that field's inline error immediately.
- **Boundaries**: 職位名 at 0 / 1 / 100 / 101 chars (input `maxLength={100}` should make 101 unreachable by typing — test by paste); whitespace-only (D-10); 説明 at 0 / 500 / 501 chars with a live `n/500` counter; full-width vs half-width counting on both.
- **Unsaved-changes guard (FR-016)**: dirty via _any_ input — name, role, description, a single toggle, a bulk switch — then キャンセル or the「職位マスター管理に戻る」back link →「変更を破棄しますか？」with 編集を続ける (stays) / 破棄する (leaves). An **untouched** form must leave without the dialog.
- **Success path**: 「職位を登録しました」confirmation and a return to the list with the new position visible.

**UI breakage under stress (1024px floor)**

- 100-character full-width Japanese name + 500-character description in the form: field, counter, and the inline error position must all survive; the counter must not be pushed off-card.
- The same with a 100-character unbroken ASCII token.
- All 58 catalog toggles with every accordion expanded (the default) — the 権限設定 card must scroll without the footer buttons becoming unreachable; the longest permission label + its longest helper `description` must not overlap its switch.
- The footer error summary + both action buttons must stay on one reachable row at 1024px.
- Wide check at ≥1440px on the fully expanded form.

### Unit 3 — 職位 編集 (`/positions/[id]/edit`)

> **Every case in this unit runs on a position the run created itself.** Editing an existing master
> position is forbidden (see Data policy). Entry from the row ⋯ menu's 編集 and from the preview pane's
> 「権限を編集」button must both be exercised — but only on the run's own position.

**Real-API behaviours**

- **PATCH semantics the FE must get right**: 説明 left unchanged → field **omitted** from the body (value survives); 説明 cleared to empty → sent as explicit **`null`** (value is cleared, and the list row's description sub-line disappears). This is a spec-level rule (`Input Validation Rules`, API Design Reference) with no prototype equivalent — verify by reload, not by the form's own state.
- **Role is never sent** (D-1): the disabled selector must not put `role` in the PATCH body.
- **`409 E-STF-010` on rename collision** (FR-010, US3 scenario 5): rename the run's own position to the name of another position **of the same role** → rejected with the duplicate-name error inline on 職位名; the position keeps its original name after reload. The **record being renamed must be one the run created**; the collision target should also be a self-created position, so the case never depends on a master record's name staying put. Note: the OpenAPI response list for PATCH omits both `400` and this `409` — a **documented BE doc gap** (spec → Input Validation Rules). A 409 that arrives as an unhandled generic error is an NG in the FE handling, not in the contract.
- **`404 E-STF-009`**: navigate to `/positions/{unknown-id}/edit` → a clean not-found treatment, not a blank prefilled form.
- **`422 E-STF-012` system-managed** → see **G3**; expect `Block`.
- **401 expiry mid-edit** and **server-enforced write permission** (direct navigation as a non-HQ role) — same shape as Unit 2.
- **Immediate effect (FR-006 / SC-006)**: after saving a permission change, the position's preview pane and its アクセス権限数 reflect it immediately on return to the list. The _staff-side_ effect ("applies from their next request/login") is not observable from this screen → author it, expect `Block (G6)`.

**Computed values & business rules**

- **Prefill completeness**: title reads「職位 編集」and **every** field — name, role (displayed, disabled), description, and each of the 58 toggles — matches the position's stored values. Cross-check the toggle states against the same position's preview pane in Unit 1.
- **CSV role-default seeding never runs in edit mode** (FR-011/FR-012) — confirm the CSV toggles keep their stored values even though the role is displayed.
- The same validation, boundary, dirty-guard and success-path coverage as Unit 2 (FR-015/FR-016), with the edit confirmation copy「職位の変更を保存しました」.
- **Saving with no changes**: permitted, and nothing is lost.

**UI breakage under stress (1024px floor)**

- Edit the 100-char-name / 500-char-description position from Unit 2 and confirm the **prefilled** long values render correctly (a different code path from typing them): the description counter must read `500/500` on load.
- All 58 toggles prefilled ON, every accordion expanded, at 1024px; wide check at ≥1440px.

---

## Known Gaps (carried from `integration-plan.md` + this plan's own data-policy limits)

`B1`–`B3` are the integration plan's blocker IDs; `G1`–`G6` are gaps this plan adds. `gen-testcases`
**must still write the case**; `execute-testcases` records the listed result instead of `NG`.

| ID     | Blocker / gap                                                                                                                                    | UI behaviour today                                                                                                              | Test treatment                                                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | `can_edit_gate_stop` (「ゲートストップ設定の変更」) has no catalog flag. **R201 was closed by removal**, not by the BE — spec **Q5 still open**. | The toggle is **gone from the create/edit form**; the preview pane cannot show it. FR-006 v2 coverage is weakened (Units 2, 3). | Case written to the spec-as-amended: assert the row is **absent** → `OK`. Add a standing note in the doc header that Y-01 FR-006 v2's ゲートストップ requirement is **not covered by any case** pending the PO call on Q5.    |
| **B2** | Catalog `view`/`edit` classification — **closed** in pass 1 (the catalog now carries `type`).                                                    | `deriveCategoryLevel` reads the server `type`. No gap remains.                                                                  | No special treatment; the preview access-level cases run normally (Unit 1).                                                                                                                                                   |
| **B3** | `description` is `type: object` + `maxLength: 500` in the BE OpenAPI → codegen emits `Record<string, unknown> \| null`; the FE casts it.         | Textarea unchanged; one cast in `_utils/position-api.util.ts`. **Never smoke-tested against the dev API.**                      | Run it for real (Unit 2, first). If the dev API rejects a string `description` → `Block (B3)` on every description-carrying case, and **report immediately** — R202 and the Round-1 T014 fallback both depend on it.          |
| **G1** | **Delete-guard 409 (`E-STF-011`) is unreachable safely.** Proving it needs a `DELETE` on a position that has staff — i.e. on real master data.   | The ⋯ menu's delete item is disabled as「削除（割当あり）」.                                                                    | Verify the **disabled affordance only** (open the menu, observe, do not click) → `OK`. The server-side 409 case is written but recorded `Block (G1)` with the reason "would risk master data". Also blocks SC-004's API half. |
| **G2** | No `includeTotalAll` / `totalAllItems` on the list response (**R205**).                                                                          | The unfiltered「全 N 件」baseline comes from an extra `?page=1&limit=1` query.                                                  | Not a defect — but assert the baseline stays correct under a filter. If the two queries disagree, that **is** an `NG` (FE bug), not a `Block`.                                                                                |
| **G3** | **No system-managed position is known to exist**, and none may be created (`is_system_managed` is not settable).                                 | No dedicated UI state exists (spec → Out of Scope).                                                                             | Author the `422 E-STF-012` edit/delete cases; expect `Block (G3)` — "no system-managed record available; not creatable from the UI". If one _is_ found in the real master, **do not** attempt to edit or delete it.           |
| **G4** | **True-empty master state is unreachable** — real master data always has positions, and emptying it is forbidden.                                | FR-006's "no positions registered" empty state (no clear action).                                                               | Author it; record `Block (G4)`. The **filtered**-empty state is fully testable and must be `OK`.                                                                                                                              |
| **G5** | Live smoke has **never** been run on this integration (integration-plan → Verification, all three passes).                                       | Unknown-unknowns: the 13 helper texts, the CSV role defaults against the real catalog, the B3 verdict.                          | Treat the first run as an integration smoke: any failure in these three areas is a genuine `NG` unless it matches B3, and should be reported to the integration owner, not just recorded.                                     |
| **G6** | "Permission change applies to assigned staff from their next request" (FR-012, SC-006) is not observable from these screens.                     | No UI surface shows it.                                                                                                         | Author it; record `Block (G6)` — would require signing in as an affected staff account, which is Unit-out-of-scope and would touch staff master.                                                                              |

---

## Traceability Map

| FR      | Requirement (short)                                                                                                           | Unit(s)                                    |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| FR-001  | Paginated table: name+description, role badge, アクセス権限数 N/total, staff count, header total badge, role-gated 職位を追加 | 1                                          |
| FR-002  | Case-insensitive partial name search, capped at 100 chars                                                                     | 1                                          |
| FR-003  | Reverse permission filter (single pick, category-grouped, AND with search)                                                    | 1                                          |
| FR-004  | Result banner inside the list card + 条件をクリア                                                                             | 1                                          |
| FR-005  | Pagination: 25/50/100 (default 50), page ≥ 1, totals/range, ellipsis, reset                                                   | 1                                          |
| FR-006  | Filtered-empty vs true-empty states                                                                                           | 1 (true-empty → `Block (G4)`)              |
| FR-007  | Selection + permission preview pane (no 権限フラグ section)                                                                   | 1                                          |
| FR-007a | 重要操作 ⚠ on categories with a granted destructive permission (API-classified)                                               | 1                                          |
| FR-008  | 割当スタッフ panel: total, 無効{N}名, top-3 active-first, links                                                               | 1                                          |
| FR-009  | Create form: 基本情報 + 権限設定 accordions, confirmation, return to list                                                     | 2                                          |
| FR-009a | Catalog is the sole source of keys/labels/order/description/type                                                              | 2 (rendering), 1 (preview + filter picker) |
| FR-010  | Per-role name uniqueness on create **and** rename                                                                             | 2 (create), 3 (rename)                     |
| FR-011  | CSV出力管理 category + per-role defaults, re-seed on role change, never on prefill                                            | 2 (seeding), 3 (never re-seeds in edit)    |
| FR-012  | Edit form prefill, role disabled, success copy, immediate effect                                                              | 3 (staff-side effect → `Block (G6)`)       |
| FR-013  | Clone mode: prefill, blank name, new independent position, source untouched                                                   | 2                                          |
| FR-014  | Delete with assignment guard (disabled item + confirm dialog + server guard)                                                  | 1 (server 409 → `Block (G1)`)              |
| FR-015  | Required-field validation, inline errors, footer summary, scroll-to-first                                                     | 2, 3                                       |
| FR-016  | Unsaved-changes discard guard                                                                                                 | 2, 3                                       |
| FR-017  | Role-gated 追加/編集/複製/削除 (HQ + System only), both affordance and route                                                  | 1, 2, 3                                    |
| FR-018  | Fixed 6-role set; only the 5 non-System roles assignable                                                                      | 2 (selectable set), 1 (badge display)      |
| FR-019  | Change history seed-only — no history written by position operations                                                          | **None — see below**                       |

**Requirements with no unit**:

- **FR-019** is untestable from these screens by construction: it is a _negative_ mock-database requirement ("seed only, never write"), it has **no UI surface on any position screen** (spec → Out of Scope), and its observation point is the staff detail screen's change-history tab, which belongs to `specs/020-staff-permission-management/`. **Not covered by this plan — deliberately.** If a regression check is wanted, it belongs as a cross-check case in the staff-detail TC doc: "create/edit/delete a position → no new row appears in any staff's change history".
- **Y-01 FR-006 v2's ゲートストップ設定の変更** sub-requirement has no case because the toggle no longer exists (**B1**). Recorded here so the loss is visible rather than silent; blocked on PO decision Q5.
- **Spec Q6** (does the API's `destructive` classification supersede FR-007a's three keys?) is **unresolved**. Unit 1's ⚠ cases are authored against the API classification (D-5); if the PO rules the other way, those expected results change. Flag in the doc header.

---

## Execution Notes (for `execute-testcases`)

### Credentials (`src/lib/auth/demo-users.ts` — real Cognito accounts)

| Role            | Account                         | 職位 (label)   | Used for                                                                                  |
| --------------- | ------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| System          | `lodu4289+1@gmail.com`          | システム管理者 | Spot-check that System has the same write access as HQ (FR-017)                           |
| **Headquarter** | `lodu4289+headquater@gmail.com` | 本部管理者     | **The default account for every functional case in Units 1–3** (the only role with write) |
| Manager         | `lodu4289+manager@gmail.com`    | ブロック長     | FR-017 negative: no write affordances, direct route refused                               |
| Staff           | `lodu4289+staff@gmail.com`      | 店舗責任者     | FR-017 negative                                                                           |
| Trainer         | `lodu4289+trainer@gmail.com`    | 社員トレーナー | FR-017 negative                                                                           |
| Observer        | `lodu4289+observer@gmail.com`   | 閲覧専任       | FR-017 negative + read-visibility baseline                                                |

Password for all six: `Password@123`.

- A case whose pre-condition says "HQ user" / "HQ or System" → the Headquarter account. A case that says "a non-HQ/non-System user" → run it on **all four** of Manager/Staff/Trainer/Observer unless the case says otherwise; they are not interchangeable (read visibility may differ even where write access does not).
- Role switching uses the header's **「デモ: ユーザー切替」** menu, which signs in as that account for real. **It only renders when `NEXT_PUBLIC_APP_ENV=development`** — if the menu is missing, check the env var before filing anything.

### Environment

- App: the local dev server; API: **`NEXT_PUBLIC_REAL_API_URL`** — the real dev backend
  **`https://api.dev.fitness-v2.okamoto-hd.com`** (the `.env` also carries a `http://localhost:8000`
  variant; confirm which one is active before the run and record it in the TC doc header).
- **This backend is shared with other people.** Data can change under the run: a count that moves
  between two cases is not automatically a defect — re-verify before recording `NG`.
- Mock routes under `src/app/api/crm/positions/**` still exist but are **not called** by this feature.
  If a response ever looks like seed data (e.g. exactly 13 positions named from the Y-01 初期定義 table),
  suspect a misconfigured base URL rather than reporting a data bug.

### Data policy (binding — from the user directive of 2026-09-17)

- **Pre-existing positions are master data and are READ-ONLY.** They may be searched, filtered,
  selected, previewed, sorted, paged and opened in a form **to look at the prefill** — but never saved,
  renamed, re-permissioned, or deleted. The ⋯ menu's 編集/複製/削除 may be **opened** on them to check the
  affordance state; 編集 may be **opened** and then left via the discard guard **only if nothing was
  touched**.
- **Every create/edit/delete case runs on a record the run created itself.** Name prefix: **`ZZQA_`**,
  followed by a short purpose and the run date — e.g. `ZZQA_作成テスト_20260917`, `ZZQA_複製元_20260917`,
  `ZZQA_重複名_20260917`. The prefix makes leftovers findable with a single `ZZQA` search on the list
  screen.
  - The **max-length** case still carries the prefix: `ZZQA_` + 95 more characters = exactly 100.
  - The **duplicate-name** case needs two records: the original and the colliding attempt (the second
    never persists, so only one needs cleanup) — plus a third for the same-name-different-role proof.
- **Destructive cases get their own throw-away record**: create it immediately before the case, in the
  same role, with zero staff (a freshly created position always has zero — that is exactly why the
  delete-success path is testable at all).
- **The 409 delete-guard case is NOT run** — see **G1**. Never click a delete on a position with staff.
- **Cleanup is part of the run, not an afterthought**: at the end, search the list for `ZZQA` and delete
  every match. **There is no seed reset** — anything left behind stays in the shared master forever.
  If a record cannot be deleted (e.g. the run ended mid-case), leave it and record it explicitly in the
  TC doc's result notes with its name and why.
- **Staff master is never touched.** The preview's 割当スタッフ panel and the staff-list navigation are
  verified by reading only; no staff is assigned, edited, or deactivated to manufacture a fixture.

### Known-gap policy

- A failure that matches a `B1`/`B3` row or a `G1`–`G6` row → **`Block (<id>)`** with the row's reason.
- Any other failure → **`NG`**, with the observed vs expected and the spec/FR reference.
- A behaviour that matches a **delta row (D-1…D-10)**'s _spec_ column is an **`OK`** even where it
  contradicts the prototype; a behaviour that matches the _prototype_ column instead is an **`NG`**.
- **`G5` caveat**: because this is the integration's first live run, be slower than usual to call `NG` on
  a 4xx — check the request body against the **Input Validation Rules** table first, and say in the note
  which side (FE rule vs BE constraint) is out of line.

### Viewport

- **1024×768** (the supported floor) for every layout / stress case.
- **≥1440px** for the wide check on the two worst stress cases per unit.
- Below 1024px is **out of scope** — do not report layout findings from a narrower window.

### Account safety

- The six Cognito accounts are real and lock for ~15 minutes after repeated wrong-password attempts.
  **This plan contains no intentional wrong-password case** — login is a pre-condition here, not a
  subject (it belongs to `specs/028-subsequent-login`). If a 401-expiry case needs a forced expiry,
  reach it by **clearing/expiring the session token**, never by failed sign-ins.
- Switching roles six times in a run is normal and safe; each switch is a correct-password sign-in.

---

## Suggested Order

1. **Unit 2 — 職位 新規作成・複製** (`/positions/create`). **Run first, against the plan's usual "list first" habit**, for two reasons: it is the only unit that can create the `ZZQA_` fixtures every later destructive case needs (Unit 1's delete, Unit 3's whole surface), and it carries **B3** — the never-smoke-tested `description` cast. If B3 fails, a large share of Units 1–3 becomes `Block` and the run's shape changes; find that out in the first ten minutes, not the last. Create, in order: the plain fixture, the stress fixture (100-char name / 500-char description / all-58-ON), the clone source + clone, and the duplicate-name pair.
2. **Unit 3 — 職位 編集** (`/positions/[id]/edit`). Runs entirely on the Unit-2 fixtures (edit is forbidden on master data), so it cannot precede them. Ends with the rename-collision case, which needs two self-created positions to exist.
3. **Unit 1 — 職位マスター管理** (`/positions`). Read-heavy and the most data-dependent, so it benefits from the `ZZQA_` records already being in the list (they give the name search a guaranteed hit, the stress fixture gives the layout cases a real long-name row, and the all-58-ON fixture gives the preview pane its richest state). Run its non-destructive cases — rendering, search, filter, pagination, preview, 割当スタッフ, role gating — in full first.
4. **Unit 1's delete cases — last.** The disabled「削除（割当あり）」affordance check (read-only, on a master position, menu opened but never clicked), then the delete-success path on a **freshly created throw-away** `ZZQA_削除_20260917`. These are the only truly destructive actions in the run.
5. **Cleanup pass.** Search `ZZQA` on the list, delete every remaining match, confirm zero results, and note anything that could not be removed.

---

## Definition of Done

- [ ] Three TC documents created under `specs/017-position-management/tests/cases/`, one per unit in the Unit Table, with the exact filenames given there.
- [ ] Every FR-001…FR-018 traced to ≥1 unit (see Traceability Map). **FR-019 is explicitly out of scope** and its rationale is carried into the TC doc headers rather than silently dropped.
- [ ] Every **delta row D-1…D-10** appears in the Notes of the case(s) it affects, naming the spec clause that wins.
- [ ] Every **B1/B3 and G1–G6** row has a written case whose expected result names the `Block (<id>)` treatment — the gaps are _covered on paper_, not omitted.
- [ ] Gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` while authoring are fixed **first**, per the checklist-first workflow.
- [ ] Each of the three TC documents executed at least once (`execute-testcases`) with OK/NG/Block recorded per case, at 1024×768 plus the ≥1440px wide check.
- [ ] **All `ZZQA_`-prefixed test data deleted**, verified by a `ZZQA` search returning zero rows — or, where deletion failed, each leftover named explicitly in the run notes with the reason. **No pre-existing position was created, modified, renamed, re-permissioned or deleted by the run.**
- [ ] The **B3** verdict (does the dev API accept a string `description`?) reported back to the integration owner — it decides R202 and the Round-1 T014 fallback.
- [ ] The **Q5** (ゲートストップ toggle removed) and **Q6** (destructive classification) PO questions re-raised with the evidence the run produced.
