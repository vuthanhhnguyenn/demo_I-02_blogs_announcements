# Test Plan: FC Company Master Management (023)

**Spec**: [../spec.md](../spec.md)
**PO Spec**: `Y-03` — FC企業管理（マスタ） (`crm/requirements/Y-03.md`, doc version `260730_v3`)
**UI mockup**: `fc-company-list.tsx`, `fc-company-detail.tsx`, `fc-company-form.tsx` (dx-fitness/fitness-crm-ui @ `426a9b3`)
**Created**: 2026-08-03
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

---

## Scope

**In scope** (screens covered by the units below, sourced from the spec + reviewed UI prototype):

- **FC企業一覧 (FC Company List)** — `fc-company-list.tsx` → app route `/franchise-companies`. Search, two filters, filter-result banner, sortable columns, pagination, row navigation, row-action menu (edit / delete / delete-blocked), delete confirmation dialog, both empty states.
- **FC企業詳細 (FC Company Detail)** — `fc-company-detail.tsx` → app route `/franchise-companies/[id]`. Header badges and lifecycle actions, 基本情報 tab, 管轄店舗 tab (+ link and unlink dialogs), 変更履歴 tab, 集計 tab (Phase 2 view only), deactivate and delete confirmation dialogs. Split across two units — see split rationale.
- **FC企業登録・編集フォーム (FC Company Create/Edit Form)** — `fc-company-form.tsx` → app routes `/franchise-companies/create` and `/franchise-companies/[id]/edit`. All five sections, required-field validation, discard-changes dialog, create-vs-edit mode differences.

**Out of scope** (navigation targets / separate specs / deliberately deferred — no unit may silently expand into these):

- **店舗詳細 (Store Detail, `/stores/[id]`)** — the 管轄店舗 tab's rows and the link dialog's candidates navigate here. Unit 3 verifies that the row navigates to the **correct store's** detail screen and stops there; the store detail screen itself belongs to **Y-02 店舗管理**, a separate spec.
- **店舗マスタの編集・operating-company reference set from the store side** — Y-02 owns creating/editing stores and setting `storeOperationCompanyId` from the store screen. Only the company-side link/unlink is tested here (spec Out of Scope).
- **Y-11 職位管理 (Title Management)** — supplies the FC企業管理者職位 title that grants a Staff user read-only self-company visibility. This plan **consumes** that title to test FR-037/FR-038 gating; it does not test maintaining the title master.
- **Y-13 認証・ログイン (Auth / Login)** — the 認証方式 attribute (FR-011) is tested here only as a stored, validated form value. Whether a staff member is actually routed to Google SSO vs IDaaS at sign-in is Y-13's spec.
- **Y-14 ドメインマスタ管理 (Domain Master)** — domain-level vs company-level authentication-method reconciliation (Y-14 wins on conflict). Not exercised here.
- **F-01 売上管理 (Sales Management)** — the Phase 2 consumer of per-company sales joins. Unit 2 confirms only that the 集計 tab's sales section renders as an explicit "not yet implemented" placeholder with no figures.
- **Real KPI / sales aggregation figures** (Y-03 FR-007 / FR-008 substance) — Phase 2; spec delivers structure only (FR-040/FR-041). Testing the _numbers_ is out of scope; testing that **no** numbers appear is in scope.
- **Royalty calculation logic** — Y-03 defers the algorithm indefinitely. The royalty rate is tested as a stored reference value only (FR-042).
- **Legacy-data migration** of the old 店舗経営企業名 / 直営店フラグ pair — a data task with no screen surface.

---

## Unit Table

| #   | Unit                                 | Screen(s)                                                                                                                                             | Route                                                           | TC Doc Filename                                                          |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | FC Company List                      | FC企業一覧（検索・区分/ステータスフィルター・ソート・ページネーション・行アクション・削除ダイアログ・空状態）                                         | `/franchise-companies`                                          | `TC -【Fitness CRM】- [Y-03-A][FC企業一覧].md`                           |
| 2   | FC Company Detail — Info & Lifecycle | FC企業詳細（ヘッダーBadge/アクション、基本情報タブ、ステータス集約カード、無効化・有効化ダイアログ、削除ダイアログと削除不可状態、集計タブ＝Phase 2） | `/franchise-companies/[id]`                                     | `TC -【Fitness CRM】- [Y-03-B1][FC企業詳細 基本情報・ライフサイクル].md` |
| 3   | FC Company Detail — Stores & History | FC企業詳細（管轄店舗タブ、店舗紐づけダイアログ、紐づけ解除ダイアログ、変更履歴タブ）                                                                  | `/franchise-companies/[id]`                                     | `TC -【Fitness CRM】- [Y-03-B2][FC企業詳細 管轄店舗・変更履歴].md`       |
| 4   | FC Company Form (Create & Edit)      | FC企業登録／編集フォーム（法人基本情報・担当者情報・契約情報・備考・ステータスの5セクション、バリデーション、離脱確認ダイアログ）                     | `/franchise-companies/create`, `/franchise-companies/[id]/edit` | `TC -【Fitness CRM】- [Y-03-C][FC企業登録・編集フォーム].md`             |

All four docs live under `specs/023-fc-company-management/tests/cases/`.

**Split rationale**:

- **List, Detail and Form are three distinct screens** on three distinct routes and map 1:1 to the three reviewed mockup files, so they are never clustered together.
- **Create and edit cluster into one unit (#4)** even though they sit on two routes: the mockup is a single component driven by a `mode` prop, every field/validation/discard behaviour is shared, and the only differences are the title, the pre-filled values and the submit label. Splitting would duplicate ~40 identical field cases; the unit instead carries a mode-difference block plus one shared field/validation walk.
- **Detail is split into two units (#2 / #3)** — a deliberate exception to one-unit-per-screen, following the sibling `020-campaign-management` precedent (`G-03-B1/B2/B3`). Two independent reasons:
  1. **Volume**: the detail screen alone carries 17 FRs (FR-019…FR-035) plus four dialogs and four tabs. One document would dwarf the other three.
  2. **Mutual precondition interference**: unit #3's link/unlink cases change the managed-store count, which is exactly the precondition unit #2's delete-blocked cases (FR-030) assert on. Separating them lets each unit own a clean seed state and a clean reset point instead of interleaving destructive mutations in one pass.
- **Dialogs are never their own unit.** The delete/deactivate/link/unlink/discard dialogs are conditional UI inside a parent screen with no route of their own, so each folds into its parent's unit — same treatment as the fee-edit Sheet in the `021-brand-management` plan.

---

## Sources per Unit

Each unit reads **only** its slice below — not the whole spec.

| Unit                                    | Spec sections                                                                                                                                                                                                                                                | UI mockup file          | FRs covered                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1 — FC Company List                     | User Story 1 (all AS1–AS10); User Story 6 AS3 (row-menu delete-blocked half); User Story 7 AS1–AS2 (list-side scoping/gating); Edge Cases: zero-managed-store deletion, duplicate formal names, search-matches-ID, filtered-vs-true empty, page-size overrun | `fc-company-list.tsx`   | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-030 (row-menu half), FR-032, FR-036…FR-039                |
| 2 — FC Company Detail: Info & Lifecycle | User Story 2 AS1–AS4, AS9–AS10; User Story 6 (all); User Story 7 AS2–AS3 (detail-side gating); Edge Cases: classification-vs-legacy-flag disagreement, unset royalty rate, remarks line breaks, last-store-released re-enables delete                        | `fc-company-detail.tsx` | FR-019, FR-020, FR-021, FR-022, FR-029, FR-030, FR-031, FR-032, FR-036…FR-039, FR-040, FR-041, FR-042 (display half) |
| 3 — FC Company Detail: Stores & History | User Story 2 AS5–AS8; User Story 5 (all); User Story 4 AS4 (history entry produced by an edit); Edge Cases: deactivated company with existing links, last-store-released                                                                                     | `fc-company-detail.tsx` | FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-033, FR-034, FR-035, FR-036, FR-039                               |
| 4 — FC Company Form (Create & Edit)     | User Story 3 (all); User Story 4 AS1–AS3, AS5; Edge Cases: contract renewal date before start date, duplicate formal names, remarks line breaks                                                                                                              | `fc-company-form.tsx`   | FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-036, FR-042 (input half)  |

**Cross-references every unit must read directly (not via the spec's paraphrase)**:

- `crm/requirements/Y-03.md` → **権限マトリクス**: 一覧・詳細参照 = ○ System / ○ Headquarter 全企業 / × Manager / △ Staff（FC企業管理者職位のみ・自社情報のみ）/ × Trainer / × Observer; 登録・編集 / 削除 / 店舗紐づけ設定 = ○ System / ○ Headquarter / × all others. Validate against this table, not just the FR wording. Note that **Manager is `×` here** even though Y-03's open item D-2 leaves Manager's scope "under discussion" — the matrix wins (spec Assumptions).
- `crm/requirements/Y-03.md` → **補足: UI設計方針** — the three formalised decisions the cases must assert on: classification badge wins over the legacy 直営店フラグ; royalty rate is an **input on the Phase 1 form**; status is exactly two values (有効/無効).
- `crm/requirements/Y-03.md` → **FR-002** 認証方式（セレクト・必須）: `Google SSO` / `IDaaS`.
- `tests/checklists/common-function-checklist.md` and `tests/checklists/common-gui-validate-checklist.md` — the full coverage walk and the **Default field constraints** table (single-line text 255, textarea 1000, integer 9 digits, start ≤ end dates, full-width counted per char) for every field the spec leaves unbounded.

---

## Coverage Focus per Unit

These are **added to**, not a replacement for, `gen-testcases`' full coverage walk (field-level validation, empty/loading/error states, layout robustness, escaping, i18n, responsive tablet-and-up, per the two common checklists).

### Unit 1 — FC Company List

- **Column set and order exactly**: FC企業ID → 法人名（表示名） → 直営/FC区分 → 管轄店舗数 → ステータス → row-action. Confirm the list shows the **display** name, not the formal name (FR-001), and that 管轄店舗数 is right-aligned with tabular numerals so multi-digit counts stay aligned.
- **Search matches both name AND ID, case-insensitively** — a case that searches by ID (e.g. `fc-00`) is the one usually skipped and is an explicit Edge Case.
- **Filter combination as a decision table**: 区分 × ステータス × search text, including the combination that yields zero rows while the unfiltered list is non-empty — that must render the **filtered** empty state with `条件をクリア`, not the true-empty state (FR-006). Both empty states need distinct cases.
- **Active-filter affordance**: a non-default filter is visually marked active; returning it to `全区分` / `全ステータス` removes the marking.
- **Filter banner summary copy** is built by joining active conditions with `・` (quoted search text, `区分: …`, `ステータス: …`) — assert the composed string, including the two- and three-condition forms.
- **Pagination**: default page size **50** among 25/50/100/200; `全 {n} 件 / {p} ページ / {start}-{end} を表示` arithmetic at page boundaries; prev/next non-interactive at the ends; ellipsis windowing (≤7 pages, near-start, near-end, middle); page resets to 1 on **search change, filter change, and page-size change** (three separate triggers); current page clamps rather than showing a blank table. Note the data limitation below — multi-page states may need extra rows.
- **Delete gating in the row menu is data-driven, not role-driven**: with 管轄店舗数 > 0 the menu shows a **disabled two-line item** (`削除できません` + `管轄店舗が存在するため`) that does **not** close the menu on select; with 0 it shows an enabled destructive `削除` (FR-030). Both branches need a case, and the seeded row with 0 stores is the one to use for the enabled branch.
- **Row click navigates to the correct company's detail** (not always the first/last row) and clicking inside the row-action cell does **not** navigate.
- **Role × screen matrix, per role, not by inference**: 新規登録 and the row-menu 編集/削除 are gated to Headquarter + System; Manager / Trainer / Observer are denied the screen entirely; a Staff user **with** the FC企業管理者職位 sees exactly one row (their own company) and zero write affordances; a Staff user **without** it is denied. Include direct-URL access for every denied role.
- **Sort on both sortable headers** (FC企業ID, 法人名（表示名）) including that the sort survives an active filter, and that the tooltip copy `クリックで降順ソート` matches the current state rather than being a static string.
- **Layout robustness**: a 法人名（表示名） at/near the assumed 255-char default — both with spaces and as one unbroken token — in the table cell **and** in the filter-summary banner **and** in the delete dialog's interpolated `「{name}」`. Plus a 4–5 digit 管轄店舗数.

### Unit 2 — FC Company Detail: Info & Lifecycle

- **Header composition**: title is the **display** name; status badge carries a leading dot and flips success-tinted ↔ muted with the status; the classification badge renders `直営` (success-tinted) or `FC` (plain outline) — and per the 補足 UI設計方針, a record whose 直営店フラグ **contradicts** its classification must still badge by classification. Seed or edit such a record deliberately; this is the spec's own Edge Case and the check most likely to be missed.
- **Attribute-by-attribute walk of the 基本情報 tab** in mockup order — 法人基本情報 (FC企業ID, 法人番号, 法人名（正式名称）, 法人名（表示名）, 代表者名, 電話番号, 本社所在地 spanning both columns), 担当者情報, 契約情報, 備考 — plus the **認証方式** attribute the spec adds beyond V0. Every optional attribute needs an unset case asserting a neutral placeholder rather than a blank gap (FR-019).
- **Royalty rate display boundaries**: unset → `—` (explicitly **not** `0%`, an Edge Case); `0` → `0%`; a decimal such as `5.0` → `5.0%`.
- **Remarks with line breaks** preserved as entered; remarks containing `<script>`/HTML rendered as literal text.
- **Status summary card**: tone follows status; meta lines in order `管轄店舗数: {n}店舗` → `作成日` → `更新日`; the store count is **live** (re-check after unit 3's link/unlink if run in the same session).
- **Deactivate/activate round trip**: dialog copy verbatim (`FC企業を無効にしますか？` / `「{name}」のステータスを無効に変更します。変更履歴は保持され、後から再度有効化できます。`), cancel leaves status untouched, confirm flips status **and** the header badge **and** the summary-card tone without a reload, and the action button itself swaps 無効化 ↔ 有効化. Then confirm the list row reflects the new status.
- **Delete gating, both branches**: with ≥1 store the 削除 button renders **visibly disabled** (not hidden) and its tooltip reads `管轄店舗が存在するため削除できません`; with 0 stores it becomes an enabled destructive action whose dialog says `論理削除します。変更履歴は保持されます。` Also the **transition** case — releasing the last store must flip the button enabled without a reload (spec Edge Case). Confirm the deleted company leaves the default list view **and** its change history survives (hand off to unit 3 for the history half).
- **集計 tab is phase-gated**: in the Phase 1 view the tab is **absent entirely**, not merely disabled — assert against the DOM, not just what's visible. In the Phase 2 view both cards render with the `次フェーズ実装予定` badge, the bar-chart empty state, the exact titles/descriptions, and **zero figures, charts or numbers anywhere** (FR-040/FR-041).
- **Role × detail matrix**: Headquarter/System see every action enabled; Manager/Trainer/Observer are denied the screen (direct URL too); a Staff user with the FC企業管理者職位 can open **only their own** company's detail and sees zero enabled lifecycle actions — attempting another company's ID directly must be refused. This own-company scoping (FR-037) is the highest-value gating check in the feature and the one most likely to be unimplemented — see execution notes for NG-vs-Block handling.

### Unit 3 — FC Company Detail: Stores & History

- **Managed-store table column set and order**: 店舗ID → 店舗名 → ブランド → 都道府県 → ステータス → link-out icon → 解除. Brand renders as a brand badge — cover **more than one brand** (JOYFIT / JOYFIT24 / JOYFIT YOGA / JOYFIT+ / FIT365) so the badge isn't hard-coded to one value.
- **Empty state** with entity label 管轄店舗 and description `「店舗を紐づけ」からこのFC企業の管轄店舗を追加できます` — reachable by releasing every store, which is also the precondition for unit 2's enabled-delete case.
- **Link dialog candidate correctness — the highest-value logic check in this unit**: candidates must exclude stores **already linked to this company**; a released store must **return** to the candidate list within the same session; and a store already linked to a _different_ company must not be offered (a store belongs to at most one operating company). Candidate rows show name on line 1 and `{store ID}・{prefecture}` on line 2 plus a brand badge. Exhausting all candidates must show `紐づけ可能な店舗がありません`, not an empty list.
- **Link/unlink side-effect fan-out** — every one of these in the same case, since a partial update is the likely defect: the managed-store table, the table footer `全 {n} 件`, the status-summary card's `管轄店舗数`, the delete-button enablement in the header, and a new 変更履歴 entry. Plus the toast copy `「{store name}」を管轄店舗に紐づけました` / `「{store name}」の紐づけを解除しました`.
- **Unlink confirmation semantics**: the dialog must state the store itself is not deleted (`店舗自体は削除されません`); cancel leaves the link intact; after confirming, the store must still exist in the store master (verify via the link dialog's candidate list, not by navigating away).
- **Store row navigates to the correct store's detail** — then stop (Y-02 is out of scope).
- **Change-history content, not just presence**: columns 日時 (160px) / 操作者 (200px) / 変更内容; newest-first ordering with newly recorded entries **prepended**; operator recorded with role in parentheses (`田中 太郎（本部管理者）`); link/unlink entries phrased `店舗紐づけ追加: {store}` / `店舗紐づけ解除: {store}`; attribute edits phrased as a **before → after diff** (`担当者変更: 鈴木 一郎 → 佐藤 花子`), which is FR-034 and requires making an edit in unit 4 first or within this unit; initial registration recorded as `FC企業登録: {formal name}` by `システム（初期登録）`; footer `全 {n} 件`.
- **History survives logical deletion** (FR-035) — coordinate with unit 2's delete case; if the app offers no post-deletion route to the history, record it as an open question rather than an NG.
- **Role gating on this tab specifically**: the 店舗を紐づけ button and every 解除 button are Headquarter/System-only, and their deny affordance must state `店舗紐づけの設定には本部権限が必要です`. Confirm whether disallowed roles get a **visibly disabled** control or no control at all, and that it matches the mockup's per-control treatment rather than assuming one uniform pattern.
- **Long store names** in the table cell, the link-dialog row, and both dialogs' interpolated `「{name}」`.

### Unit 4 — FC Company Form (Create & Edit)

- **Required set is exactly three**: 法人名（正式名称）, 直営/FC区分, and 認証方式 (FR-009). Each needs an individually-omitted case, plus a whitespace-only case for the text field, plus the all-three-omitted case. Every other attribute must submit successfully when left empty (FR-012) — that "everything optional is truly optional" case is the one usually skipped.
- **認証方式 is a spec-mandated field absent from the V0 mockup** (spec FR-011, parity `PAR088`). Author its cases from `Y-03.md` FR-002: a required select with exactly two options `Google SSO` and `IDaaS`. Flag the V0 divergence in Notes so a missing field reads as a real finding rather than a mockup mismatch.
- **ロイヤリティ率 must be present in the Phase 1 view** per Y-03's 補足 UI設計方針 — the V0 mockup contradicts this by phase-gating the input (spec Assumptions records the resolution in favour of the PO spec). Write the case to the PO spec's intent and **flag the conflict in Notes**; also cover the numeric-input boundaries (0, negative, non-numeric, >100, decimals, 9-digit default).
- **Error-reporting mechanics, all three layers on one blocked submit**: the inline message under the offending field (verbatim `法人名（正式名称）を入力してください` / `直営/FC区分を選択してください`), the form-level footer message `未入力の項目があります`, and the smooth scroll bringing the first invalid control into view (FR-014). Then FR-015: supplying a valid value clears **that field's** error without re-submitting, and does not clear the others.
- **Discard-changes dialog as a decision table**: dirty × (cancel button / back link) → dialog shown with `編集を続ける` / `破棄する`; clean × either → navigate immediately with **no** dialog (FR-016); and successful submit → no dialog despite the form having been dirty (the dirty flag must be cleared before navigating). The clean-form no-dialog case is the common miss.
- **Create-vs-edit mode differences**, as a compact block rather than a duplicated field walk: title `FC企業新規登録` vs `FC企業編集`; every control empty (except the status switch defaulting to **on**) vs every control pre-filled from the record; submit label `登録する` vs `保存する`; success toast `FC企業を登録しました` vs `FC企業の変更を保存しました`; and in edit mode, clearing a previously-set required field must block the save (FR-009 applies to edit too).
- **FC企業ID is never an input** — assert its absence from the create form and that it is not editable in edit mode (FR-008, auto-assigned).
- **直営店フラグ checkbox** is independent of the 直営/FC区分 select — set classification `FC` with the flag checked, save, and confirm the detail screen badges by classification (hands the assertion to unit 2's Edge Case).
- **Date pickers**: contract start and renewal both accept a date via the picker and via the assumed ja-locale format; **renewal earlier than start is accepted in Phase 1** (spec Assumptions — write it as an accepted case with a note that cross-field validation is deferred, so it is not filed as an NG); plus a far-past and far-future date.
- **Default field constraints** for every unbounded field, per the common checklist: 法人名 both variants and 代表者名/本社所在地/担当者名 at 254/255/256 chars; 備考 at 999/1000/1001; 法人番号 and the two phone fields with full-width digits, hyphenated and unhyphenated forms; and full-width CJK at the character limit to confirm counting is per character. Mark each `assumed default; confirm with PO/schema owner`.
- **Escaping**: `<script>alert(1)</script>` into 法人名（正式名称）, 法人名（表示名）and 備考, then confirm literal-text rendering on the list, the detail screen, and inside the delete dialog's interpolated name.
- **Duplicate formal name is permitted** (spec Assumptions) — register a second company with an identical 法人名（正式名称） and confirm it saves, with distinct auto-assigned IDs.
- **Double-submit guard** on 登録する / 保存する — one record created, not two.
- **Role gating**: only Headquarter/System may reach either route; every other role is refused on direct URL to both `/franchise-companies/create` and `/franchise-companies/[id]/edit`.

---

## Traceability Map

| FR     | Requirement (short)                                                       | Unit(s)                                                |
| ------ | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| FR-001 | List shows ID / display name / classification / store count / status      | 1                                                      |
| FR-002 | Search (name + ID) and 区分 / ステータス filters, combining conjunctively | 1                                                      |
| FR-003 | Matched-vs-total banner + single clear-all-conditions action              | 1                                                      |
| FR-004 | Sort by FC company ID and by display name                                 | 1                                                      |
| FR-005 | Page-size options, total/pages/range summary, reset to page 1             | 1                                                      |
| FR-006 | Filtered-empty (with clear action) vs true-empty distinction              | 1                                                      |
| FR-007 | Row → detail; row menu → edit form and deletion                           | 1 (+ 2 for the detail landing, 4 for the form landing) |
| FR-008 | Register a company; FC company ID auto-assigned, never an input           | 4 (+ 1 for the 新規登録 entry point)                   |
| FR-009 | Formal name + classification + authentication method required             | 4                                                      |
| FR-010 | Exactly two classification values                                         | 4                                                      |
| FR-011 | Exactly two authentication-method values (Google SSO / IDaaS)             | 4 (input) + 2 (detail display)                         |
| FR-012 | Twelve optional attributes accepted, all genuinely optional               | 4                                                      |
| FR-013 | Status settable from form, defaults to active, helper copy                | 4                                                      |
| FR-014 | Field-level + form-level errors, scroll to first invalid                  | 4                                                      |
| FR-015 | Error clears on valid input without re-submit                             | 4                                                      |
| FR-016 | Discard warning when dirty, none when clean                               | 4                                                      |
| FR-017 | Success message + return to list                                          | 4                                                      |
| FR-018 | Edit mode pre-fills every attribute; title distinguishes mode             | 4                                                      |
| FR-019 | Detail groups attributes; neutral placeholder for unset values            | 2                                                      |
| FR-020 | Status / store-count / created / updated summary                          | 2 (+ 3 for the live store-count update)                |
| FR-021 | Status + classification badges; classification wins over legacy flag      | 2                                                      |
| FR-022 | Separately selectable areas + back-to-list                                | 2 (basic/aggregation) + 3 (stores/history)             |
| FR-023 | Managed-store list with 5 columns, total, row → store detail              | 3                                                      |
| FR-024 | Managed-store empty state                                                 | 3                                                      |
| FR-025 | Link a store; only unlinked candidates; "no candidate" copy               | 3                                                      |
| FR-026 | Release a store with confirmation that the store isn't deleted            | 3                                                      |
| FR-027 | Link/unlink reflected immediately in list + count + summary + toast       | 3 (+ 2 for the delete-button re-enable)                |
| FR-028 | Copy stating history is recorded and only HQ can set links                | 3                                                      |
| FR-029 | Deactivate with reversible/history-kept confirmation; reactivate          | 2                                                      |
| FR-030 | Deletion blocked while ≥1 store; unavailable-not-hidden + reason          | 2 (detail button + tooltip) + 1 (row-menu variant)     |
| FR-031 | Logical delete only, history retained, stated in confirmation             | 2 (+ 3 for history retention)                          |
| FR-032 | Exactly two status values                                                 | 2 (badges/actions) + 1 (filter options) + 4 (switch)   |
| FR-033 | History entry for register / edit / status / link / unlink                | 3 (assertions) — produced by 2 and 4                   |
| FR-034 | Attribute changes recorded as before/after diff                           | 3 (assertions) — produced by 4                         |
| FR-035 | History newest-first with total; retained after logical deletion          | 3 (+ 2 for the deletion trigger)                       |
| FR-036 | Write actions restricted to System + Headquarter                          | 1, 2, 3, 4                                             |
| FR-037 | System/HQ see all; Staff with FC-admin title sees own company read-only   | 1, 2                                                   |
| FR-038 | Manager / Trainer / Observer / untitled Staff denied entirely             | 1, 2, 3, 4                                             |
| FR-039 | Restricted controls visibly unavailable with permission explanation       | 1, 2, 3, 4                                             |
| FR-040 | Phase 2 view: KPI + sales placeholder sections, no figures                | 2                                                      |
| FR-041 | Phase 1 view: aggregation area absent entirely                            | 2                                                      |
| FR-042 | Royalty rate stored from Phase 1 as a reference value                     | 4 (input) + 2 (display)                                |

**Every FR-001…FR-042 lands in ≥1 unit — no orphaned requirements.**

Two requirements are **split across units by design** and must not be dropped by either side: FR-030 (detail-screen disabled button + tooltip in unit 2; row-menu disabled two-line item in unit 1) and FR-033/FR-034 (the _mutations_ happen in units 2 and 4, the _assertions_ live in unit 3). `gen-testcases` should carry an explicit cross-unit Note on those cases.

---

## Execution Notes (for `execute-testcases`)

- **Roles / credentials**: drive the mock-auth-switch mechanism (`getAuthMeOptions`) to simulate System, Headquarter, Manager, Staff, Trainer, Observer. Unlike sibling master features, this one needs a **seventh state**: a Staff user **holding the FC企業管理者職位 title and affiliated to a specific FC company** (FR-037). Re-run each unit's gating cases once per relevant role — never infer one role's result from another's.
- **The Staff-own-company scoping is the most likely mock-layer gap.** Y-03's `△ FC企業管理者職位のみ・自社情報のみ` needs both a title (Y-11) and a company affiliation on the staff record. If the mock auth/staff layer cannot express "Staff + FC-admin title + company X", record FR-037's cases as **`Block` — needs real API/data**, not `NG`. Reserve `NG` for a scoping rule that is _implemented but wrong_ (e.g. the Staff user sees **all** companies — that is a genuine defect, not a gap).
- **認証方式 (FR-011) — NG, not Block, if absent.** The field is missing from the V0 mockup but required by `Y-03.md` FR-002 as of `260730_v2`. It is fully FE-implementable, so an absent field is a real finding against the spec. Only downgrade to `Block` if the field renders but its persistence is demonstrably BE-owned.
- **ロイヤリティ率 phase conflict** — the PO spec puts the input on the Phase 1 form; the mockup phase-gates it. Per the spec's Assumptions the PO spec wins, so an input missing from the Phase 1 form is an **`NG` with the conflict cited in the case's Notes** — flag it for PO confirmation rather than silently passing.
- **BE-mocked caveats → `Block`, not `NG`**: FC company and store data live in the Phase 1 in-memory mock-db. Do not file `NG` for gaps the spec itself attributes to the backend or a later phase — real KPI/sales figures (FR-040 is satisfied by the placeholder alone), server-side validation message shapes, real 2-tab concurrency on the same company, real 401/403 payloads, or history retention after logical deletion if no post-deletion route exists. Record those `Block` with the reason.
- **Seed-reset points** — this feature needs more than the usual one-per-unit:
  - Reset/re-seed before each of the four units.
  - **Between unit 2 and unit 3**, and again **within unit 3** between the link-exhaustion cases and the unlink-everything (empty-state) cases: both directions are one-way mutations against the same store set, and the link-candidate pool must be restored.
  - **Within unit 2**, re-seed between the deactivate/reactivate cases and the delete case — the delete case consumes the record.
  - Unit 2's enabled-delete branch needs a company with **zero** managed stores; unit 1's enabled-row-menu-delete needs the same. The mockup's seed includes one such company (`FC-005`, 0 stores, 無効) — use it rather than manufacturing the state by unlinking, which would spend unit 3's fixtures.
  - ⚠️ **Editing seed files has no effect on a running dev server** — the mock-db is a `globalThis` singleton and HMR does not reset it. Fully restart the dev server after any seed change.
- **Pagination data limitation**: the mockup seeds only 5 companies, well under the default page size of 50. Multi-page cases (page 2, ellipsis windowing, next-enabled, clamping) are **unreachable without additional rows** — either seed ≥51 companies or record those cases as `Block — insufficient seed data` with the count noted. Do not mark them `NG`.
- **Phase switching**: the 集計 tab and the royalty-rate input are gated on the Phase 1 / Phase 2 view toggle. Run unit 2's aggregation cases **in both phases** — Phase 1 asserts absence (check the DOM, not just visibility), Phase 2 asserts the placeholder content.
- **Viewport**: tablet-and-up (back-office CRM screen family). No mobile-width cases; a single result column, no per-device split.
- **Cross-cutting gating check** (apply once per unit, not as its own unit): for every role-gated control, confirm whether the app renders it **hidden** or **visibly disabled with a permission tooltip**, and that this matches the mockup's per-control treatment — the mockup mixes both patterns (`RoleGatedButton` with `denyTooltip` on the store-link controls vs. plain gating elsewhere), so a uniform assumption will produce false results.
- **Live-update assertions must be checked without a reload.** Several FRs (FR-020, FR-027, and the delete-button re-enable in FR-030) specifically require the UI to update in place. Reloading the page before asserting would mask a real defect.

---

## Suggested Order

1. **Unit 1 — FC Company List.** The feature's entry point: row navigation must work before either detail unit is reachable, and its search/filter/pagination surface is independently shippable (US1, P1). It also establishes which seeded company has 0 managed stores, which both later units depend on.
2. **Unit 4 — FC Company Form (Create & Edit).** Promoted ahead of the detail units on purpose: it _creates_ the records the detail units read, and its edits are what produce the before/after change-history entries that unit 3 must assert on (FR-034). Running it early means unit 3 finds a populated history instead of only the seeded entries.
3. **Unit 2 — FC Company Detail: Info & Lifecycle.** Reads what units 1 and 4 established. Runs before unit 3 because its delete-blocked cases (FR-030) need the seeded store links **intact** — unit 3's unlink cases would otherwise destroy that precondition. Its own destructive cases (deactivate, delete) are confined to a re-seeded record.
4. **Unit 3 — FC Company Detail: Stores & History.** Last: it is the most destructive unit (link/unlink mutations plus emptying the store list), and it is the natural place to assert the accumulated change history produced by units 2 and 4. Within the unit, run the link cases before the unlink-everything cases so the candidate pool is exercised while it is still full.

---

## Definition of Done

- [ ] All four TC documents created under `specs/023-fc-company-management/tests/cases/`, one per unit, using the plan's filenames verbatim.
- [ ] Every FR-001…FR-042 traced to ≥1 unit (see Traceability Map — already confirmed complete), with explicit cross-unit Notes on the split requirements FR-030, FR-033 and FR-034.
- [ ] Any gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` while authoring are **fixed at the common level first**, before/alongside the per-screen cases (checklist-first workflow).
- [ ] The two spec-vs-mockup conflicts (認証方式 absent from V0; ロイヤリティ率 phase gating) are written to the PO spec's intent **and** flagged in the affected cases' Notes, not silently resolved.
- [ ] Each of the four TC documents executed once (`execute-testcases`) with OK / NG / Block recorded per case, and every `Block` carrying its reason (mock-db gap, insufficient seed data, or BE-owned).
