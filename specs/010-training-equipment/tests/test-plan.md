# Test Plan: E-03 Training Equipment Management (Phase 1)

**Spec**: [../spec.md](../spec.md)
**PO Spec**: `E-03` — トレーニング機材管理 (`crm/requirements/E-03.md`, version 260724_v4)
**Created**: 2026-08-11
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

---

## Scope

**In scope** (screens covered by the units below, sourced from the reviewed UI prototype `training-equipment-list.tsx` / `-detail.tsx` / `-form.tsx`):

- **トレーニング機材一覧** — list table, keyword search + 2 filters, sorting, pagination, filter result banner, empty/filtered-empty states, row selection + 一括設置状態変更 dialog, CSV export, 新規登録 entry → app route `/training-equipment`
- **トレーニング機材詳細** — 基本情報 / エクササイズ紐づけ / 変更履歴 tabs, status card + 設置状態変更 dialog, エクササイズを追加 dialog (candidate list, 種別不一致 approval), 紐づけ解除 confirmation, 削除 dialog with linked-exercise block, 編集 entry → app route `/training-equipment/[id]`
- **トレーニング機材 登録／編集フォーム** — one component in two modes (create + edit), 器具種別変更確認 dialog, unsaved-changes dialog, post-create 紐づけ設定へ follow-up → app routes `/training-equipment/create` and `/training-equipment/[id]/edit`

**Out of scope** (navigation targets / separate specs / Phase-2 deferrals — no unit may expand into these):

- **Y-08 エクササイズ管理 (`/exercises`, `/exercises/[id]`, exercise form)** — a separate spec. This plan verifies the linked-exercise table content rendered _inside_ the E-03 detail screen, not the Y-08 master itself. E-03 doc FR-008 also allows setting the same link from the **Y-08 exercise edit screen** ("双方向で同一データを参照"); that direction belongs to the Y-08 spec's test plan, not here.
- **The Y-08 exercise detail screen itself** — only the _navigation_ from a linked exercise name is in scope (FR-020: the link points at `/exercises/[id]` and the target record opens). Everything the Y-08 detail screen then shows belongs to the Y-08 spec's test plan.
- **Header store switcher / Y-02 店舗管理** — the store scope control is shared app chrome owned by another spec. In-scope here only as _the mechanism used to set scope_ for the list/CSV/create cases (FR-022), never as a unit of its own.
- **E-01 / E-02 store equipment screens (`equipment-list.tsx`, `equipment-detail.tsx`, `equipment-form.tsx`)** — deceptively similar filenames in the same mockup folder, but a different screen family (接点制御装置 / IoT control). E-03 doc explicitly separates the two. Do not open these mockups when authoring.
- **FR-012 全店舗機材保有状況サマリー** (E-03 doc, Could) — out of Phase 1 per the spec's traceability matrix. Confirm no such screen/affordance exists; not a unit.
- **History create/update/delete lifecycle** — Phase 1 history is read-only display (spec FR-016). Only the absence of editable controls is checked, inside the Detail unit.
- **Equipment images, split-quantity status change (`splitQuantity` / `splitRow`), optimistic-lock (`expectedUpdatedAt`)** — explicitly out of Phase 1 scope with no UI at all.
- **Mobile-app 店舗フィルタ / 利用不可表示 behaviour** — the downstream consumer of installation status; not a CRM screen.

---

## Unit Table

| #   | Unit          | Screen(s)                                                                                                                                                                      | Route                                                         | TC Doc Filename                                               |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | E-03-A List   | トレーニング機材一覧（検索・フィルタ・ソート・ページング・結果バナー・空状態・行選択＋一括設置状態変更Dialog・CSV出力・新規登録導線）                                          | `/training-equipment`                                         | `TC -【Fitness CRM】- [E-03-A][Training Equipment List].md`   |
| 2   | E-03-B Detail | トレーニング機材詳細（基本情報／エクササイズ紐づけ／変更履歴タブ、ステータスカード、設置状態変更Dialog、エクササイズ追加Dialog＋種別不一致承認、紐づけ解除Dialog、削除Dialog） | `/training-equipment/[id]`                                    | `TC -【Fitness CRM】- [E-03-B][Training Equipment Detail].md` |
| 3   | E-03-C Form   | トレーニング機材 登録／編集フォーム（create + edit の2モード、器具種別変更確認Dialog、変更破棄Dialog、保存後の紐づけ設定導線）                                                 | `/training-equipment/create`, `/training-equipment/[id]/edit` | `TC -【Fitness CRM】- [E-03-C][Training Equipment Form].md`   |

All three docs live under `specs/010-training-equipment/tests/cases/`.

**Split rationale**: The unit rule is one screen per unit, clustering only when screens are simple or tightly related (modals that exist only inside a parent screen, or a step flow). Three distinct routes → three units.

- The **bulk status dialog** never leaves `/training-equipment`, so it clusters into the List unit rather than becoming a fourth doc — but it is the unit's heaviest area (see Coverage Focus).
- The Detail unit absorbs **five** conditional dialogs plus three tabs, all inside one route/component; splitting them would fragment state that only exists together (e.g. delete-block depends on the link count the exercise tab mutates).
- **Create and edit share one form component**, differ only by mode-specific rules (read-only 設置店舗 and 設置状態, tool-type confirmation, follow-up action), and are tightly related in exactly the way the rule allows — so they cluster into one unit, matching the sibling D03/D04/Y-10 plans. Note the Y-01 (staff) plan split create and edit into separate docs; here the mode delta is small enough (two read-only fields + one dialog) that one doc with mode-tagged cases keeps the shared field-validation walk from being duplicated 1:1.

---

## Sources per Unit

| Unit          | Spec sections                                                                                                                                                                                                                                                                                                                                                                          | UI mockup file                  | FRs covered                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| E-03-A List   | User Story 1 (all AS); Edge Cases: zero result, current page > total pages, bulk dialog closed without applying, unauthorized role clicks CSV/registration; FR-001–FR-006, FR-013, FR-014, FR-015 (list actions), FR-019, FR-022; "Known non-defects" rows 1–3; "UI Alignment" → 一覧 bullets; "API Design Alignment" → list query / status filter two-parameter model / CSV export    | `training-equipment-list.tsx`   | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-013, FR-014, FR-015, FR-019, FR-022 |
| E-03-B Detail | User Story 3 (all AS); Edge Cases: tool-mismatch candidate selection, unauthorized role clicks edit/delete; FR-009–FR-012, FR-015 (detail actions), FR-016, FR-018 (single flow), FR-020, FR-021 (display side); "Known non-defects" row 4; "UI Alignment" → Detail bullets; "API Design Alignment" → status-history / exercise-links / 409 / 422 rows                                 | `training-equipment-detail.tsx` | FR-009, FR-010, FR-011, FR-012, FR-015, FR-016, FR-018 (single), FR-020, FR-021        |
| E-03-C Form   | User Story 2 (all AS); Edge Cases: required-field omissions; FR-007, FR-008, FR-015 (create/edit gating), FR-021, FR-022 (create scope); "UI Alignment" → Form / Edit bullets and the "Kept deliberately" unsaved-changes convention; "API Design Alignment" → manufacturer fixed list, create `installationStatus` all four values, `PATCH` carries no `storeId`/`installationStatus` | `training-equipment-form.tsx`   | FR-007, FR-008, FR-015, FR-021, FR-022                                                 |

**Cross-references (read for every unit)**:

- `crm/requirements/E-03.md` **権限マトリクス** is the authority on role gating and is _finer-grained than a single "authorized/unauthorized" split_ — each unit must validate against this table directly, not against the spec's FR-015 wording alone:

  | ロール      | 一覧・参照 | 登録・編集 | 設置状態変更 | 論理削除 | エクササイズ紐づけ | CSV出力    |
  | ----------- | ---------- | ---------- | ------------ | -------- | ------------------ | ---------- |
  | System      | ○          | ○          | ○            | ○        | ○                  | ○          |
  | Headquarter | ○          | ○          | ○            | ○        | ○                  | ○          |
  | Manager     | ×          | ×          | ×            | ×        | ×                  | ×          |
  | Staff       | ○ 所属店舗 | ○ 所属店舗 | ○ 所属店舗   | ×        | ×                  | ○ 所属店舗 |
  | Trainer     | ×          | ×          | ×            | ×        | ×                  | ×          |
  | Observer    | ○ 所属店舗 | ×          | ×            | ×        | ×                  | ○ 所属店舗 |

  Note the non-obvious rows: **Manager has no access at all** (unlike most other CRM features), **Staff can change status but cannot delete or link exercises**, and **Observer can export CSV**. Each unit must cover at least the roles whose column differs on that unit's actions.

- `crm/requirements/E-03.md` **制限事項** supplies the business rules the spec compresses into FRs: 「なし（自重）」is not selectable as a tool type (BR-EQP-006), linked equipment is logical-delete-only, and a store move is 撤去済み + 新規登録 (FR-021).
- The spec's **"Known non-defects"** table is mandatory reading before authoring any search/link case — five behaviours there look like gaps but are the agreed Phase 1 spec.

---

## Coverage Focus per Unit

These are the unit-specific high-value areas, **added to** — not a replacement for — `gen-testcases`' full coverage walk (field-level validation, empty/loading/error states, GUI checklist items, etc.).

### E-03-A List

- **Header badge vs. filtered count** (FR-001, FR-006): the page header count must show the **unfiltered** total and stay unchanged while filters are applied; the in-card banner shows "全 N 件中 M 件を抽出中" + condition summary + 条件をクリア. Verify M can never exceed N — in particular when the active filter surfaces 廃棄 rows, which must still be counted in N.
- **Two-axis discarded model** (FR-004): default view hides 廃棄; 全ステータス includes it; selecting 廃棄 explicitly shows only those. Confirm all three states, not just the default — this is one status select mapping to two API parameters (`includeDiscarded` + `installationStatus`).
- **Sortable vs. non-sortable columns** (FR-003): 機材ID / 機材名 / 器具種別 / 設置場所 / 設置状態 / 最終更新日 sortable, and **数量 and エクササイズ紐づけ件数 must have no sort affordance at all** (a regression removed quantity sorting — confirm its absence). 設置場所 and 設置状態 must order by **enum definition order**, not by Japanese label alphabetical order (FR-019) — this is the kind of bug that passes a casual eyeball.
- **No default sort applied by the frontend** (FR-019): initial load order is 器具種別 (mst_tools.sortOrder) asc → 機材名 asc, with no sort indicator active on any column header.
- **Keyword scope** (FR-002 + Known non-defects 1–3): placeholder reads 「機材名で検索」; a 機材名 partial match works; an **installation-area keyword (e.g.「マシンエリア」) returning zero rows is correct spec, not NG**; and there must be **no 設置エリア filter and no collapsible 詳細フィルター panel** — both selects permanently visible.
- **Pagination** (FR-003): 25/50/100/200 with default 50; and the edge case where the current page exceeds total pages after a page-size or filter change (must land on a valid page, not a blank table).
- **Bulk status update** (FR-013, FR-018): checkboxes are **always rendered and disabled** (not hidden) for roles without the status-change permission — check Observer/Manager see disabled boxes rather than none; selection bar count and 選択解除; reason is mandatory, 1–500 chars, reported as an **inline field error with the submit button still enabled** (not a disabled button); the same reason applies to every selected record; closing the dialog without applying leaves statuses and selection untouched; selecting a mix that includes rows already at the target status must report `skipped` and write no history for those.
- **Selection lifecycle vs. conditions** (FR-013, FR-022 — added 2026-08-27 after the MR review): row selection is client state keyed by id, so it survives a change of conditions. Every axis that changes _which records the list shows_ — keyword, 器具種別, 設置状態, 表示件数, header store scope — must drop the selections that left the view while keeping the ones still on screen, and the bulk request must carry only visible ids (verify at the API/history level, not just via the 「N件選択中」 label). Cross-**page** selection is deliberately not asserted: the spec states no rule and it awaits a PO decision.
- **CSV export** (FR-014): applies search/filter/sort but **not** pagination (export a filtered set larger than one page and confirm row count); UTF-8-with-BOM so Japanese opens uncorrupted; cross-store (HQ) export filename `training_equipment_all_<date>.csv`; gated per the matrix (Observer **can** export).
- **Store scope** (FR-022): HQ 全店舗（本部）omits the store, every other role sends its own; the list must **wait for scope to resolve** and never fire a request without it (a non-HQ request without store is a `400`). Per the spec's mock-data caveat all seeds live in `store-001`, so HQ and store-001 views legitimately show identical rows — do not file that as a defect.
- **Empty states**: true-empty vs. filtered-empty (shared `EmptyState`, entity label 「トレーニング機材」) with a working 条件をクリア action.

### E-03-B Detail

- **All three tabs always rendered** (FR-009): tab _visibility_ is never role-gated — only the actions are. Confirm Observer/Staff see 基本情報 / エクササイズ紐づけ / 変更履歴 with the linked-count badge, and that the badge count matches the actual rows in the tab (and the list column) after an add/unlink.
- **Status card sourced from history, not `updatedAt`** (FR-010): current status, 最終変更日時, 変更者 come from the latest status change. High-value check: edit a non-status attribute (e.g. 数量 or 設置場所) — the record's update timestamp changes but the **status card must not move** (FR-016: attribute edits leave no history).
- **設置状態変更 dialog** (FR-010, FR-018): the record's **current status must not be offered as a target**; reason mandatory 1–500 chars as an inline error with submit enabled; input capped at 500 with no character counter; a successful change updates the status card, the badge, and prepends a history row.
- **Exercise link add flow** (FR-011): candidate list filters **server-side** on keyword / difficulty / body part and excludes already-linked exercises; difficulty and body-part options come from the API (spot-check they are not a hard-coded label list); additional pages load by **infinite scroll** — verify a long catalogue is not silently truncated at the first page; tool-type mismatches carry a 種別不一致 badge and require the 「承認して追加」 confirmation before saving (cancelling must add nothing). Known non-defect 5: the dialog's 「…と一致するエクササイズのみ紐付けできます」 copy contradicting the listed mismatches is **copy, not a bug**.
- **Unlink** (FR-011): confirmation dialog, then the row disappears and the badge/list count both decrement.
- **Delete guardrail** (FR-012): with ≥1 link, confirming delete must **block** with the linked-exercise warning (API `409`) and leave the record intact; only after all links are removed does delete succeed. This is SC-004 — cover both halves, and confirm the action is HQ/System-only (Staff must not be able to delete even though Staff can change status).
- **Role gating on actions** (FR-015): 編集 / 削除 / 設置状態変更 / 紐づけ追加・解除 each against the matrix — Staff: edit ✓ status ✓ delete ✗ link ✗; Observer: all ✗; Manager/Trainer: no access to the screen at all. Confirm each control's hidden-vs-visibly-disabled treatment matches the prototype per control.
- **History tab, read-only** (FR-016): columns 日時 / 操作者 / 設置状態変化 / 変更理由; ordering `changedAt` **descending**; every record carries an initial registration row rendered as 「未設定」→ status with reason 「新規登録」 (so the first row is never blank — check a freshly created record too); 変更理由 is never empty; **no create/edit/delete controls anywhere** (SC-005); the footer warns if the response was truncated.
- **設置店舗 immutability** (FR-021): the detail screen offers no store-change affordance anywhere.

### E-03-C Form

- **Create required vs. optional** (FR-007): required — 機材名, 器具種別, 数量, 設置店舗, 設置状態 (defaults to 設置中); optional — メーカー, 型番, 設置エリア, 設置日, 備考. Each required field blocks save with an inline message when blank; quantity boundary values (0, negative, non-integer, very large).
- **器具種別 excludes 「なし（自重）」** (E-03 制限事項 / BR-EQP-006): confirm it is absent from the select while all other 9 values including 「その他」 are present (その他 was previously hidden by an inactive seed flag — verify it is selectable).
- **メーカー is a searchable select over a fixed list, not free text** (FR-007): confirm no free-text entry is accepted.
- **設置エリア** is the provisional fixed 4 values (有酸素 / マシン / フリーウェイト / ストレッチ) and is optional.
- **設置店舗 select submits the internal id and displays the store code** beside the name (FR-022), and the value chosen is the store the record then appears under in the list and detail.
- **Create → 紐づけ設定へ follow-up** (FR-007, US2 AS5): after a successful save the user is routed to detail and offered the exercise-linking follow-up.
- **Edit-mode read-only fields** (FR-008, FR-021): 設置店舗 read-only with the "撤去済み + 新規登録" note; 設置状態 read-only with guidance to change it on the detail page. Verify neither is submitted by an edit (`PATCH` carries no `storeId` / `installationStatus`) and that neither can be forced via the UI.
- **Tool-type change confirmation is conditional** (FR-008): the dialog appears on save **only when the tool type changed AND ≥1 link exists**. Cover all four combinations — links + change (dialog, confirming releases every link), links + no change (no dialog), no links + change (saves directly, no dialog), no links + no change (no dialog). Confirming must actually clear the links (check the detail badge afterwards); cancelling must leave both the tool type and the links untouched.
- **Unsaved-changes dialog** (project convention, kept deliberately): 「変更を破棄しますか？」 on leaving a dirty create/edit form; not shown on a clean form.
- **Role gating** (FR-015): create/edit allowed for System/HQ/Staff (Staff within its own store), blocked for Manager/Trainer/Observer — including direct URL access to `/training-equipment/create` and `/[id]/edit`, not just the button state.

---

## Traceability Map

| FR     | Requirement (short)                                                                        | Unit(s)                                                                           |
| ------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| FR-001 | List columns + header badge shows unfiltered total                                         | E-03-A List                                                                       |
| FR-002 | Keyword (name only) + 2 always-visible filters + clear-all                                 | E-03-A List                                                                       |
| FR-003 | Column sorting (quantity/link-count excluded) + pagination 25/50/100/200                   | E-03-A List                                                                       |
| FR-004 | 廃棄 hidden by default, includable via 全ステータス or 廃棄                                | E-03-A List                                                                       |
| FR-005 | Empty / filtered-empty state with clear-conditions action                                  | E-03-A List                                                                       |
| FR-006 | Filter result banner: unfiltered total, filtered count, condition summary                  | E-03-A List                                                                       |
| FR-007 | Create form required/optional fields + post-save linking guidance                          | E-03-C Form                                                                       |
| FR-008 | Edit all fields except store/status; conditional tool-type confirmation                    | E-03-C Form                                                                       |
| FR-009 | Detail page with 3 always-rendered tabs + linked-count badge                               | E-03-B Detail                                                                     |
| FR-010 | Status card from status-change metadata + 設置状態変更 dialog entry                        | E-03-B Detail                                                                     |
| FR-011 | Link list / server-side candidate filtering + infinite scroll / mismatch approval / unlink | E-03-B Detail                                                                     |
| FR-012 | Role-gated delete, blocked when links exist                                                | E-03-B Detail                                                                     |
| FR-013 | Bulk status update with one mandatory reason; selection disabled w/o perm                  | E-03-A List                                                                       |
| FR-014 | CSV export (filter/sort applied, pagination not), UTF-8 BOM                                | E-03-A List                                                                       |
| FR-015 | Role gating: export, create, edit, status change, linking, delete                          | E-03-A List + E-03-B Detail + E-03-C Form (each for its own actions)              |
| FR-016 | Read-only history; status changes only; initial 新規登録 row; desc order                   | E-03-B Detail                                                                     |
| FR-017 | Traceability between E-03 items and UI controls                                            | All three units (satisfied collectively by this map — no standalone case)         |
| FR-018 | Mandatory 1–500-char reason, inline errors, no same-status history row                     | E-03-B Detail (single flow) + E-03-A List (bulk flow)                             |
| FR-019 | Default ordering is API-owned; enum sorts by definition order                              | E-03-A List                                                                       |
| FR-020 | Linked exercise name → Y-08 `/exercises/[id]`                                              | E-03-B Detail                                                                     |
| FR-021 | Store immutable; move = 撤去済み + 新規登録                                                | E-03-C Form (read-only store + note) + E-03-B Detail (no store-change affordance) |
| FR-022 | Store scope for list, CSV export, create; HQ may omit store                                | E-03-A List (list + export) + E-03-C Form (create)                                |

Every FR-001…FR-022 lands in ≥1 unit. No orphaned requirements. Two items need calling out rather than plain coverage:

- **FR-020 is a functional case.** The candidate catalogue (`EX-011`…) is now seeded as real Y-08 exercise records (`exercise.seed.ts`), so every linked/linkable exercise resolves at `/exercises/[id]`. Author it as a normal pass/fail: click a linked exercise name → the Y-08 detail of that same ID opens (no error screen).
- **FR-017 gets no dedicated case.** It is a meta-requirement about preserving the E-03→UI mapping; it is discharged by this traceability map plus the per-unit source mapping, not by a testable UI behaviour.

---

## Execution Notes (for `execute-testcases`)

- **App URL**: the dev app runs on **port 3000** (the client calls `NEXT_PUBLIC_API_URL=localhost:3000/api`); run the whole pass against that origin so API calls resolve.
- **Roles/credentials**: use the mock-auth-switch mechanism (drives `getAuthMeOptions`) to simulate **System, Headquarter, Manager, Staff, Trainer, Observer**. This feature's matrix is unusually uneven — Manager and Trainer have **no access at all**, Staff can change status but cannot delete or link exercises, and Observer can export CSV — so re-run each unit's gating cases per relevant role rather than inferring one role's result from another's. Also test **direct URL access** for the denied roles, not only button state.
- **Store scope**: set scope through the existing header store switcher (「全店舗（本部）」is HQ-only). Per the spec's mock-data caveat **all seeded equipment lives in `store-001`**, so the HQ cross-store view and the store-001 view legitimately return identical rows; the cross-store list cannot be exercised end to end until a second store is seeded — record that as `Block`, not `NG`.
- **BE-mocked caveats** — data lives in the Phase 1 in-memory mock-db. Per project rule, **a wrong _value_ returned by the mock API is `Block`, not `NG`**; reserve `NG` for genuine frontend defects (wrong validation, wrong gating, wrong ordering applied client-side, wrong empty state, wrong dialog condition). Specifically expect as `Block`-class, not defects: missing cross-store rows; mobile-app 店舗フィルタ effects, which have no CRM-observable surface.
- **Everything in the spec's "Known non-defects" table is spec, not NG** — read it before recording any outcome on keyword search, the missing 設置エリア filter, the search placeholder wording, exercise-name linking, or the add-dialog copy.
- **One port for app and API (added 2026-08-27)**: the browser client reads `NEXT_PUBLIC_API_URL` (`.env` → `http://localhost:3000/api`), so a run is only valid when the page and the mock API are the same dev server. If port 3000 is taken by another checkout, start the server with a matching override — e.g. `NEXT_PUBLIC_API_URL=http://localhost:3100/api npx next dev -p 3100` — rather than testing a page on one port against an API on another.
- **Bulk-seeding recipe (added 2026-08-12)**: the shipped seed (5 records, all in `store-001`) blocks the whole pagination family and every Observer case. Both are unblockable **without touching the repo** by creating records through the app's own API from the logged-in browser: read the bearer token out of the `SESSION` cookie, learn the payload shape by `GET`-ing one existing record, then `POST /api/crm/training-equipment` in a loop. Field notes: `mstToolId` must be a real tool UUID (`a000000N-0000-4000-8000-00000000000N`), `locationInGym` is `aerobic_area` / `machine_area` / `free_weight_area` / `stretch_area` (**not** `cardio_area`), `installationStatus` is `installed` / `maintenance` / `removed` / `discarded`. ~175 records in `store-001` gives 4 pages at size 50 and 8 at size 25 (enough for the ellipsis case); ~8 records in the Observer's store (`store-010`) unblocks its read-only cases. Everything lives in the in-memory mock DB and is wiped by a dev-server restart.
- **Seed-reset points**: re-seed the training-equipment / exercise-link / status-history tables **before each unit**. Within units, also re-seed:
  - E-03-A: after the bulk status update cases (they mutate many rows at once and will skew the later filter/sort/count and CSV cases), and before the CSV row-count check.
  - E-03-B: between the exercise-link cases and the delete cases — the delete-block case needs a record that _still has_ links, and the delete-success case needs one with none; both consume the same fixture.
  - E-03-C: after each tool-type-change confirmation case, since confirming permanently releases that record's links.
- **Ordering caveat**: several checks (enum sort order, history desc order, default 器具種別 order) depend on multiple records existing with distinguishable values — confirm the seed actually contains them before recording `NG` on an ordering case.
- **Viewport**: tablet-and-up (back-office CRM screen family; no mobile layout in scope).
- **Scope discipline**: a bug found in a screen _outside_ the unit under test (e.g. the Y-08 exercise detail reached from a link, or the header store switcher) is **reported, not fixed and not recorded as that unit's NG** — keep each unit's outcomes on its own screen.

---

## Suggested Order

1. **E-03-A List** — the feature's entry point and its only P1 user story (US1). Search/filter/sort/pagination and the store-scope resolution must be sound before anything downstream is trustworthy, and this unit is where a wrong list count or wrong default ordering would otherwise be misread as a Detail/Form bug. Its bulk-update and CSV cases are self-contained on this screen.
2. **E-03-C Form** — run before Detail because Detail's most valuable cases need records you control: a record with links, a record with none, and a **freshly created** record to prove the initial 「新規登録」 history row (FR-016) and the post-create linking follow-up (FR-007). Creating those here doubles as the Form unit's own coverage.
3. **E-03-B Detail** — last, as the dependent consumer: it needs list navigation (unit 1) to be reachable, records from unit 2 to exercise history and delete guardrails against, and it holds the destructive one-way actions (unlink, delete) that would otherwise consume fixtures the earlier units still need. Within the unit, run 基本情報 → 変更履歴 read-only checks → status change → exercise links → delete, so each destructive step happens after the reads that depend on its pre-state.

---

## Definition of Done

- [x] All three TC documents created under `specs/010-training-equipment/tests/cases/`, one per unit above — E-03-A 163 cases, E-03-C 112 cases, E-03-B 138 cases (413 total), authored 2026-08-11 (E-03-A grew from 155 to 163 on 2026-08-27: eight selection-lifecycle cases added after the MR review — TC-089a…089g, TC-103a).
- [x] Every FR-001…FR-022 traced to ≥1 unit (see Traceability Map — confirmed complete), with FR-017 explicitly noted as discharged by the map. FR-020 was authored as a known-non-defect confirmation and **execution resolved it**: the exercise name is a real link to `/exercises/[id]` and the target record opens, so the spec's Known-non-defect row is out of date and should be retired by the PO.
- [x] Any gaps found in the repo-root `tests/checklists/common-function-checklist.md` / `tests/checklists/common-gui-validate-checklist.md` during authoring are fixed first, per the checklist-first workflow, before/alongside writing the per-screen cases.
- [x] Each of the three TC documents has been executed at least once (`execute-testcases`) with OK/NG/Block recorded per case, in the suggested order above — final counts after the fix-verification runs (E-03-A run 5, E-03-B / E-03-C run 6) — E-03-A **163 OK / 0 NG / 0 Block**, E-03-B **136 OK / 0 NG / 2 Block**, E-03-C **112 OK / 0 NG / 0 Block** (**411 OK / 0 NG / 2 Block** of 413). No open NG remains in any unit; the two Blocks (E-03-B TC-068, TC-090) are the Phase-1 candidate-catalogue stub, per the Execution Notes caveat. E-03-A's eight new cases were all executed on 2026-08-27 (run 5) against the selection-prune fix, TC-089g after the bulk-seeding recipe below. **All three reflect the frozen build**: E-03-B ran post-freeze, E-03-A was fully re-run post-freeze, and E-03-C's one contested case (TC-060) was re-verified post-freeze.
- [x] Every `Block` outcome names which caveat from Execution Notes it falls under, so no mock-layer limitation is left looking like an unexplained failure.
