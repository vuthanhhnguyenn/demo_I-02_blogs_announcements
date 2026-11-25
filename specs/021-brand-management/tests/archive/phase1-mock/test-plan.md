# Test Plan: Brand Master Management (021)

**Spec**: [../spec.md](../spec.md)
**PO Spec**: `Y-07` — ブランド管理（マスタ） (`crm/requirements/Y-07.md`)
**Created**: 2026-07-29
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

---

## Scope

**In scope** (screens covered by units below, sourced from the reviewed UI prototype):

- ブランド一覧 (Brand List) — `brand-list.tsx` → app route `/brands`
- ブランド詳細 (Brand Detail: 基本情報／費用／変更履歴 tabs, fee edit sheet, disable/delete confirmation dialogs, access-denied state) — `brand-detail.tsx` → app route `/brands/[id]`

**Out of scope** (navigation targets / separate specs / phase-gated affordances — not covered by this plan):

- **新規ブランド登録** (registering a wholly new brand) — FR-015 and Assumptions explicitly defer this to a later phase; the mockup shows no create affordance for it (unlike Staff, there is no disabled button to even smoke-test — the action simply doesn't exist in this phase).
- **基本情報を編集** (editing brand basic info beyond name) — the mockup's phase-gated, disabled "基本情報を編集" button only appears when `currentPhase === "2"`; out of scope for this phase per Assumptions. If visible in the running app, only confirm it stays disabled — not a full unit.
- **新規費用マスタ登録** (registering a brand-new fee entry from scratch, as opposed to editing an existing one) — same phase-gated/disabled treatment as above, on the 費用 tab.
- **G-01 主契約マスタ (Primary Contract Master)** — the downstream consumer of these fee values as defaults; this plan verifies the fee values are correctly saved/displayed here, not how G-01 consumes them.
- **Y-02 店舗管理 (Store Management)** — stores reference the brand master and carry their own サブブランド field; that screen is a separate spec and not exercised here.
- **ブランドバッジ／ブランドチップ (brand color badges)** used elsewhere in the app — explicitly called out in Assumptions as a shared display concern outside this feature's functional scope.

---

## Unit Table

| #   | Unit         | Screen(s)                                                                                             | Route          | TC Doc Filename                                |
| --- | ------------ | ----------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| 1   | Brand List   | ブランド一覧（検索・編集Sheet含む）                                                                   | `/brands`      | `TC -【Fitness CRM】- [Y-07][ブランド一覧].md` |
| 2   | Brand Detail | ブランド詳細（基本情報／費用／変更履歴タブ、費用編集Sheet、無効化・削除ダイアログ、アクセス拒否表示） | `/brands/[id]` | `TC -【Fitness CRM】- [Y-07][ブランド詳細].md` |

Both docs live under `specs/021-brand-management/tests/cases/`.

**Split rationale**: The unit rule calls for one screen per unit, clustering only when screens are simple or tightly related (e.g. modals that exist only inside a parent screen). The fee edit Sheet, the disable/delete `AlertDialog`s, and the access-denied render are all conditional UI within the single `brand-detail.tsx` route/component — they never navigate to a separate URL — so they cluster into one Brand Detail unit, mirroring how the Staff Detail unit absorbed its lifecycle-action dialogs in the sibling 020 plan. Brand List and Brand Detail are naturally distinct screens (index vs. record view) and map 1:1 to the two source files reviewed, so they are not clustered together.

---

## Sources per Unit

| Unit         | Spec sections                                                                                                                                                                                                                                                                  | UI mockup file     | FRs covered                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Brand List   | User Story 1 (AS1–AS3 list/search/navigation portion); User Story 3 (all); Edge Cases: zero-match search                                                                                                                                                                       | `brand-list.tsx`   | FR-001, FR-002, FR-003 (navigation only), FR-005, FR-012 (name-edit gating), FR-015                                      |
| Brand Detail | User Story 1 (AS3 tabs, AS4 access-denied); User Story 2 (all); User Story 4 (all); Edge Cases: fee amount of 0, non-editor direct-action rejection (server-side note only), sub-brand vs. no-sub-brand cards, scheduled-revision auto-cutover (BE-only, not user-facing here) | `brand-detail.tsx` | FR-003 (tabs/counts), FR-004, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012 (fee-action gating), FR-013, FR-014 |

**Cross-references**: Requirement doc `crm/requirements/Y-07.md` supplies the 権限マトリクス (permission matrix: 参照 ○/○/○/○/×/× and 編集 ○/○/×/×/×/× for System/Headquarter/Manager/Staff/Trainer/Observer) and the データスコープ note (全ブランド, no per-store scoping) — both units should validate against that matrix directly, not just the spec's FR wording.

---

## Coverage Focus per Unit

These are **added to**, not a replacement for, `gen-testcases`' full coverage walk (field-level validation, empty/loading/error states, etc. per the common checklists).

- **Brand List**: exactly two columns shown (brand ID, brand name) with no cost/fee column anywhere (FR-001); keyword search matches both name and code with a clearable `FilterResultBanner`, and the two distinct empty states — true-empty vs. filtered-empty-with-"条件をクリア" — render correctly; row click navigates to the correct brand's detail page (not always the first/last brand); row-menu 編集 action is role-gated to Headquarter/System only via `RoleGatedMenuItem` (confirm absence/disablement for Manager, Staff, Trainer, Observer — not just an assumption from one role); no delete action exists at the brand level at all (confirm its absence, not merely that it's gated); edit Sheet shows the brand ID field read-only with the "システム内部キーのため変更できません" note and the name field editable; saving reflects the updated name in the list immediately without a page reload.
- **Brand Detail**: 費用 and 変更履歴 tab badges show correct live item counts (FR-003); Trainer/Observer navigating directly to the URL see the ShieldAlert access-denied message with zero brand/fee data rendered anywhere in the DOM (FR-004, SC-004 — check network/DOM, not just the visible tab); Manager/Staff can view every tab and see zero enabled edit/disable/delete controls anywhere on the page (FR-012, SC-003); JOYFIT renders 4 sub-brand-labeled fee cards (JOYFIT／JOYFIT24／JOYFIT YOGA／JOYFIT＋) while FIT365 renders 1 brand-only-labeled card with no sub-brand suffix — the UI must not assume every brand has sub-brands; fee edit Sheet opens pre-populated with both fee items' current name/amount/effective date plus any existing scheduled revisions; adding a scheduled revision with a future date shows it under "予約中の改定" with effective date, amount, and registered-at/by immediately after save, no reload (FR-008, SC-005); duplicate effective-date across two revisions on the same fee item blocks save with a clear inline message (FR-009); a past effective date on either the current setting or a revision shows a non-blocking warning that the change applies immediately (FR-010); blank/negative/non-integer amount or blank effective date blocks save, while an amount of exactly 0 is explicitly permitted (FR-009, SC-002); disabling a fee entry flips its badge 有効→無効 and its own 無効化 action becomes unavailable afterward, while its 削除 action remains available (FR-011); deleting a fee entry removes it from the tab, and deleting the last remaining entry shows the dedicated empty state (not an empty list) (FR-011, FR-014); 変更履歴 tab rows show all six fields (timestamp, actor, target, changed field, before, after) with correct content, most-recent-first (FR-013).

---

## Traceability Map

| FR     | Requirement (short)                                                                                   | Unit(s)                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| FR-001 | List shows brand ID + name only, no cost columns                                                      | Brand List                                                                                             |
| FR-002 | Keyword search over name/ID, clearable, empty state                                                   | Brand List                                                                                             |
| FR-003 | Navigate list row → detail page with 3 tabs + counts                                                  | Brand List (navigation) + Brand Detail (tabs/counts)                                                   |
| FR-004 | Detail access restricted to System/HQ/Manager/Staff; Trainer/Observer access-denied; no store scoping | Brand Detail                                                                                           |
| FR-005 | HQ/System can edit brand name; brand ID read-only/immutable                                           | Brand List                                                                                             |
| FR-006 | Per-sub-brand (or per-brand) fee entries, tax-included amounts                                        | Brand Detail                                                                                           |
| FR-007 | HQ/System edit fee item name/current amount/current effective date                                    | Brand Detail                                                                                           |
| FR-008 | HQ/System schedule future fee revisions, shown as pending                                             | Brand Detail                                                                                           |
| FR-009 | Required-field + non-negative-integer + no-duplicate-date validation                                  | Brand Detail                                                                                           |
| FR-010 | Non-blocking past-date warning (immediate effect)                                                     | Brand Detail                                                                                           |
| FR-011 | Disable (with confirmation, own action then unavailable) and delete (with confirmation) fee entries   | Brand Detail                                                                                           |
| FR-012 | All name-edit and fee create/edit/disable/delete actions restricted to HQ/System                      | Brand List (name-edit gating) + Brand Detail (fee-action gating)                                       |
| FR-013 | Change-history log: timestamp/actor/target/field/before/after                                         | Brand Detail                                                                                           |
| FR-014 | Fee tab empty state when no entries remain                                                            | Brand Detail                                                                                           |
| FR-015 | Scope fixed to JOYFIT/FIT365; no new-brand/new-fee-from-scratch registration                          | Brand List + Brand Detail (both confirm absent/disabled creation affordances, not a dedicated FR test) |

Every FR-001…FR-015 lands in at least one unit. No orphaned requirements.

---

## Execution Notes (for `execute-testcases`)

- **Roles/credentials**: Use the mock-auth-switch mechanism (drives `getAuthMeOptions`) to simulate System, Headquarter, Manager, Staff, Trainer, and Observer. Per the Y-07 permission matrix, data scope is brand-wide for every viewing role (no per-store/per-manager scoping to seed) — simpler than sibling features in that respect. Re-run each unit's role-gating cases once per relevant role rather than assuming one role's pass implies another's.
- **BE-mocked caveats**: Brand/fee data lives in the Phase 1 in-memory mock-db (`franchise.table.ts`). Do not mark an outcome `NG` when the observed gap is a mock-layer/backend-only limitation explicitly called out in the spec's Edge Cases — e.g., a scheduled revision does not actually auto-flip to "current" when its effective date arrives, since that transition is documented as a backend/system responsibility outside this screen. Record such gaps as `Block`, and reserve `NG` for genuine UI/logic defects (wrong validation, wrong gating, wrong card content, wrong empty state, etc.).
- **Seed-reset points**: Reset/re-seed the mock brand/fee table before each unit's execution pass. Within the Brand Detail unit, re-seed again between the Disable and Delete cases, since both are one-way mutations against the same fee entries within a session and the Delete case should not consume an entry the Disable case still needs (or vice versa).
- **Viewport**: Tablet-and-up (back-office CRM screen family; no mobile layout in scope).
- **Cross-cutting check** (apply once per unit, not a separate unit): every role-gated control (name-edit menu item, fee 変更/無効化/削除 buttons) should be checked against the app's actual gating pattern (`RoleGatedMenuItem` / `RoleGatedButton`) for whether it renders hidden vs. visibly-disabled for disallowed roles — confirm this matches the reviewed prototype's per-control treatment rather than assuming one uniform behavior.

---

## Suggested Order

1. **Brand List** — entry point for the whole feature; row-click navigation must work correctly before Brand Detail can be reached, and the name-edit flow here is independently simple/shippable (US3).
2. **Brand Detail** — depends on List for navigation entry; contains the feature's core Must-have (fee maintenance, US2) and its destructive lifecycle actions (disable/delete, US4), so it runs after List-level checks are confirmed stable. Within this unit, the 変更履歴 tab is most meaningfully populated after at least one fee edit has been made to inspect.

---

## Definition of Done

- [ ] Both TC documents created under `specs/021-brand-management/tests/cases/`, one per unit above.
- [ ] Every FR-001…FR-015 traced to ≥1 unit (see Traceability Map — already confirmed complete).
- [ ] Any gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` during authoring are fixed first, per the checklist-first workflow, before/alongside writing the per-screen cases.
- [ ] Each of the two TC documents has been executed at least once (`execute-testcases`) with OK/NG/Block recorded per case.
