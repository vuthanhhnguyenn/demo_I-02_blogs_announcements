# Test Plan: Y-04 Terms Document Master Management (規約文書管理（マスタ）) — 017

**Spec**: [../spec.md](../spec.md) · register of integration gaps: [`api-integration-output/terms/report.md`](../../../api-integration-output/terms/report.md) (there is **no** `integration-plan.md` for this feature)
**PO Spec**: `Y-04` — 規約文書管理（マスタ） (`crm/requirements/Y-04.md`, 260901_v3) — covers FR-001…FR-008 of the source; FR-009/010/011 are out of scope (see Scope)
**Created**: 2026-10-19
**Integration round**: **Fully on the real API** (API-076 §3–§8, `src/lib/api-real`, status table in `report.md` last updated 2026-10-19: all six endpoints `OK / OK`). No mock route is called by this feature any more. The feature has **no Round-1 blocker table**; every `❌` in `report.md` is struck through (closed). Live smoke was run by the integrator for each endpoint once (list 200, detail 200, POST 201, PATCH 200, POST versions 201, DELETE 204) — this plan is the first **full-screen** exercise.
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

> ⚠️ **Shared-backend directive**: terms rows can only be **logically** deleted and there is **no restore** (spec FR-016,
> Y-04 FR-007). Every row this run creates stays in the shared database forever (visible with 削除済みも含めて表示),
> and the dev list already carries ~83 deleted rows. Create **as little as the plan needs**, always with the `ZZQA_`
> prefix, and **never mutate a pre-existing document** — a _new version_ also rewrites its source's `effectiveTo`
> (FR-015), so it counts as a mutation of the source. See **Execution Notes → Data policy** — binding, not advisory.

---

## Scope

**In scope** (five routes):

- **規約文書管理 (list)** — type tabs (すべて + 6 types), search box「規約ID・規約名で検索...」, brand + status selects, 削除済みも含めて表示, active-filter count + summary banner, 条件をクリア, filtered-empty state, pagination 25/50/100, row ⋯ menu, delete confirmation dialog, Trainer no-permission panel — `terms-list.tsx` → `/terms`
- **規約詳細** — 基本情報 tab (name, notes, body-text card, PDF name/size, プレビュー, management panel, audit fields), バージョン履歴 tab (timeline, show-more beyond 3, current-version highlight), header actions 編集 / 新規バージョン作成 / ⋯ → 削除, deleted-document read-only state, delete dialog from the header — `terms-detail.tsx` → `/terms/[id]`
- **規約 新規登録** — registration form: multi-brand checkboxes (both ⇒ `brandEnum: null`), PDF upload + client-side text extraction + preview, required validation, unsaved-changes guard — `terms-form.tsx` (create mode) → `/terms/create`
- **規約 編集** — same form in edit mode: locked ID/type/brand, active-version warning, PDF replace, PATCH semantics — `terms-form.tsx` (edit mode) → `/terms/[id]/edit`
- **規約 新規バージョン作成** — same form in new-version mode: inherited/locked ID/type/brand, pre-filled editable name, 関連規約 reference, only version + start date + PDF required — `terms-form.tsx` (new-version mode) → `/terms/[id]/new-version`

**Out of scope** (navigation targets / separate specs — no unit may expand into these):

- **Mobile terms-retrieval API (Y-04 FR-009)**, **mobile revision-confirmation / consent capture (FR-010)**, **procedure-specific terms display in leave/withdrawal flows (FR-011)** — mobile / owning-feature work (spec → Out of Scope). This plan only produces the data they consume. _Side-effect awareness_: because mobile consumers read the same table, a **published** `ZZQA_` row is potentially visible to real dev-app users — see Data policy.
- **PDF text-extraction accuracy** — external capability (spec → Out of Scope). Tested only as "a normal text PDF yields visible body text"; accuracy of the text is not judged.
- **Member consent history (A-01)**, **main-contract linkage (G-01)**, **app maintenance (Y-05/06)** — separate specs.
- **Brand master management** beyond picking JOYFIT / FIT365.
- **Login / session establishment** — `specs/028-subsequent-login`, `specs/029-password-reset`. This plan consumes a signed-in session and tests only the 401-expiry _reaction_.
- **Wall-clock-driven status flips** (a document turning Published at midnight JST) — not waitable in a run; covered by _constructed_ dates instead (see Unit 1 / Unit 5 focus and **G3**).

---

## Unit Table

| #   | Unit                    | Screen(s)                                                                                     | Route                     | TC Doc Filename                                              |
| --- | ----------------------- | --------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| 1   | 規約文書管理 (list)     | 規約一覧 / タイプタブ / 検索・フィルタ / 行⋯メニュー / 削除確認ダイアログ / 権限なし表示      | `/terms`                  | `TC -【Fitness CRM】- [Y-04][01][規約文書管理].md`           |
| 2   | 規約詳細                | 基本情報タブ / バージョン履歴タブ / ヘッダー⋯メニュー / 削除確認ダイアログ / 削除済み閲覧状態 | `/terms/[id]`             | `TC -【Fitness CRM】- [Y-04][02][規約詳細].md`               |
| 3   | 規約 新規登録           | 規約 新規登録 (multi-brand, PDF upload)                                                       | `/terms/create`           | `TC -【Fitness CRM】- [Y-04][03][規約新規登録].md`           |
| 4   | 規約 編集               | 規約 編集 (locked fields, active warning, PDF replace)                                        | `/terms/[id]/edit`        | `TC -【Fitness CRM】- [Y-04][04][規約編集].md`               |
| 5   | 規約 新規バージョン作成 | 規約 新規バージョン作成 (inherited fields, 関連規約)                                          | `/terms/[id]/new-version` | `TC -【Fitness CRM】- [Y-04][05][規約新規バージョン作成].md` |

All under `specs/017-terms-management/tests/cases/`. Y-04 has no earlier TC docs, so numbering starts at `01`.

**Split rationale**:

- **Unit 1 stands alone** — the only screen with a data table, a URL/filter/pagination state machine and a role-scoped data set. The delete dialog is clustered **into** it (reachable only from a row; no own route).
- **Unit 2 stands alone** — two tabs, two timelines of derived data (status per version, current-version highlight, 3-item truncation) and the whole _deleted-document_ read-only state. Its delete dialog is clustered in; it is a second entry to the same DELETE call, tested once there in full and re-asserted here for the entry point.
- **Units 3 / 4 / 5 are split although they share `terms-form.tsx`**, because they differ on every axis a tester touches: route, verb (`POST /admin/terms` vs `PATCH /admin/terms/{id}` vs `POST /admin/terms/{id}/versions`), and which fields are locked / inherited / required. The _same field_ is behaviourally different per mode (brand: editable multi-select → disabled → disabled-inherited; PDF: required → optional replace → required; bodyText: sent → sent only with a new PDF → never inherited). Folding them would bury those inversions.
- **Unit 5 is not clustered into Unit 3** even though it is the smallest: it carries the one server side-effect no other screen has (the source version's `effectiveTo` is rewritten to `effectiveFrom − 1 day`) and the source-must-exist / not-deleted rules.

---

## Sources per Unit

| Unit                        | Spec sections                                                                                                                                                                                                  | UI prototype file                                  | FRs covered                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| 1 — 規約文書管理            | User Story 1 (all 9 scenarios); User Story 6 scenarios 1–4 (list entry); Edge Cases: zero-result tab, Trainer direct access, deleted row in list; Key Entities (status)                                        | `.cache/fitness-crm-ui/src/pages/terms-list.tsx`   | FR-001, 002, 003, 004, 005, 006, 015 (list status), 016, 017 |
| 2 — 規約詳細                | User Story 2 (all 7 scenarios); User Story 6 scenarios 1, 3, 4 (detail entry); Edge Cases: >3 versions, deleted doc viewable, Trainer direct access, future-dated Draft, sibling versions unaffected on delete | `.cache/fitness-crm-ui/src/pages/terms-detail.tsx` | FR-006, 010, 011, 015, 016, 017                              |
| 3 — 規約 新規登録           | User Story 3 (all 5 scenarios); FR-007/008/009; Edge Cases: PDF >10MB / non-PDF preserves state; Assumptions (extraction)                                                                                      | `.cache/fitness-crm-ui/src/pages/terms-form.tsx`   | FR-007, 008, 009, 017, 018                                   |
| 4 — 規約 編集               | User Story 4 (all 5 scenarios); FR-012/013; Edge Cases: editing a Published version is advisory, not blocked; deleted doc not editable                                                                         | `.cache/fitness-crm-ui/src/pages/terms-form.tsx`   | FR-008, 009, 012, 013, 017, 018                              |
| 5 — 規約 新規バージョン作成 | User Story 5 (all 4 scenarios); FR-014/015; Edge Cases: new version always inherits from the document currently open; deleting one version does not delete siblings                                            | `.cache/fitness-crm-ui/src/pages/terms-form.tsx`   | FR-008, 009, 014, 015, 017, 018                              |

**Cross-references for every unit** (read once, applied per unit):

- `contracts/list-terms.md`, `contracts/terms-detail.md`, `contracts/terms-mutations.md` (status header: **the Swagger wins** where they disagree) — the oracle for request/response shape, status codes and the `E-VAL-001` / `E-TERM-002` rules. Contracts are a tool for the _expected API outcome only_; the _screen_ expectation always comes from the spec.
- `research.md` #2 (brand `null` = shared), #9 (non-HQ brand-group scoping), #11 (remarks = change summary).
- `crm/requirements/Y-04.md` (permission matrix: 登録・編集・削除・バージョン作成 = System/HQ only; 参照 = everyone but Trainer).
- `tests/checklists/common-function-checklist.md` + `common-gui-validate-checklist.md` — the baseline coverage walk each unit is _added to_.

---

## Spec-vs-Prototype Deltas

One row per spec-only requirement and per spec↔prototype conflict. **The spec wins in every row**;
`gen-testcases` MUST mark each in the affected case's Notes so a tester never files an NG from the prototype.
(D-ids are referenced by the traceability and execution notes.)

| ID   | Item                                                                                                  | In spec                                                                                                                                                                                                                                                                                                                                                                                                                                  | In prototype                                                                                             | How to test                                                                                                                                                                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | **Both brands ticked ⇒ one shared document** (spec-only)                                              | FR-007: ticking both creates **one** document with `brandEnum: null`; ticking one = single-brand. Shared rows render as **both** brand badges; `brandFilter=JOYFIT` or `FIT365` **also returns** shared rows; non-HQ roles always see shared rows                                                                                                                                                                                        | Multi-select checkboxes exist; prototype data is per-brand mock, no shared semantics                     | Units 1, 2, 3: create with both ticked → exactly **one** row, both badges, appears under each brand filter; verify by reload. Never accept "two rows created". `qa-90` is the closed customer decision.                                                                                                                     |
| D-2  | **Legacy `tos` type** (spec-only, contract note)                                                      | Response `termsType` may be legacy `tos` (rows seeded before API-076); no tab exists for it; FE labels unknown types by raw value                                                                                                                                                                                                                                                                                                        | Six fixed types only                                                                                     | Unit 1: a `tos` row appears under すべて and under **no** type tab, label = raw `tos`, row still opens in detail. Do not NG the missing tab; do NG a crash / blank label.                                                                                                                                                   |
| D-3  | **Unfiltered baseline 「全 N 件中」** (spec-only, contract)                                           | FR-004 says "reflecting total count and the displayed range"; the baseline semantics live only in `list-terms.md` (`totalAllItems` = rows of the **current type tab**, brand scope kept, every other filter reset — live rows only, plus logically-deleted rows when `includeDeleted=true` (updated 2026-10-20 per product-owner decision, BUG-13 option A); `total <= totalAllItems`). `report.md` lists the spec update as **pending** | Count text exists, no baseline contract                                                                  | Unit 1: baseline is per-tab, ignores search/status/brand-select, follows includeDeleted (live only when off, live + deleted when on — updated 2026-10-20 per product-owner decision, BUG-13 option A), keeps non-HQ brand scope. `total > totalAllItems` is an `NG`. Note in the case that the spec text lags the contract. |
| D-4  | **Timeline PDF link on every entry** (resolved 2026-10-20)                                            | FR-011 / US2-3 (updated): every timeline entry has a プレビュー action                                                                                                                                                                                                                                                                                                                                                                   | プレビュー button rendered on **every** timeline entry; file name+size block only on 適用中              | Unit 2: every entry's プレビュー opens that version's PDF; the 規約本文 card shows the opened document's own name+size (see D-13). Spec now matches the prototype/implementation — no conflict left.                                                                                                                        |
| D-5  | **Status wording** (naming conflict)                                                                  | Published / Expired / Draft ⇒ 公開中 / 適用終了 / 下書き (Y-04 FR-001); Deleted ⇒「削除済み」                                                                                                                                                                                                                                                                                                                                            | Header badge 公開中, but the timeline's current entry reads **適用中**                                   | Unit 2: header badge and list use 公開中; the _timeline's_ current-version label is judged against the spec's intent (current version highlighted) — record the wording actually shown, do not NG 適用中 alone.                                                                                                             |
| D-6  | **Text extraction runs in the browser** (spec-only behaviour)                                         | FR-009 treats extraction as an automatic, reliable backend capability; no manual correction                                                                                                                                                                                                                                                                                                                                              | "CRM text input / mock preview"                                                                          | Units 3–5: text appears in the preview after upload. Real behaviour: FE extracts and sends `bodyText`; a PDF with **no text layer** (image-only) is **unspecified** → author the case, record observed behaviour as an _observation_, not OK/NG, and raise to the spec owner.                                               |
| D-7  | **Version "change summary" = the version's `remarks`** (spec↔Y-04 gap, customer decision **pending**) | FR-011 "change summary"; research #11 maps it to `remarks`                                                                                                                                                                                                                                                                                                                                                                               | `summary` string per version                                                                             | Unit 2/5: the 備考 typed on a version appears as its summary in the timeline. What shows for the **original** (remarks null) is unspecified — record, do not NG. Mark in Notes: pending customer answer.                                                                                                                    |
| D-8  | **"Copy all fields" vs. inherit-only** (Y-04 vs spec)                                                 | FR-014 / US5-1: only name, type, brand, display order, approval-button are inherited; version label, start date, PDF (and body text) are entered fresh; **remarks / expiry / notes are not** carried                                                                                                                                                                                                                                     | Y-04 FR-008 says "全項目をコピー"                                                                        | Unit 5: assert the spec list is prefilled and that version / start date / PDF start **empty**. Remarks/expiry prefilled from the source ⇒ record against the spec (inheritance not specified for them).                                                                                                                     |
| D-9  | **Reference link from a version doc to its original** (Y-04-only)                                     | spec.md has no scenario for a "link to original" on a derived document's detail; only the 関連規約 read-only field in the new-version form (US5-2)                                                                                                                                                                                                                                                                                       | Y-04 FR-005 requires it; prototype shows 関連規約 in the form only                                       | Unit 2: on a derived version's detail, observe whether a link to the original exists and record it as an observation (spec silent). Unit 5: 関連規約 shows source name + version, read-only (spec US5-2 — hard OK/NG).                                                                                                      |
| D-10 | **Deleted version dropped from lineage judgement** (Y-04-only)                                        | spec Edge Cases: deleting one version does not delete siblings; silent on how the **current version / timeline** change                                                                                                                                                                                                                                                                                                                  | Y-04 FR-008 異常系: a deleted version is excluded from the lineage and from the current-version decision | Unit 2: delete the _current_ version of a self-created 2-version lineage → siblings remain; judge timeline/current-highlight against Y-04 FR-008 and record (spec silent ⇒ observation).                                                                                                                                    |
| D-11 | **Trainer treatment of direct URLs** (spec wider than prototype)                                      | US1-6 + Edge Case: list **and detail** are no-access for Trainer                                                                                                                                                                                                                                                                                                                                                                         | Only the list shows the no-permission panel                                                              | Unit 1 (list) and Unit 2 (`/terms/{id}`), plus Units 3–5 direct URLs for every non-HQ role. Server answer is 403 (`list-terms.md`); the screen must show a no-permission treatment, not a blank/crash.                                                                                                                      |
| D-12 | **Field limits the spec does not state**                                                              | Required/optional only (no max lengths, no display-order range, no remarks limit)                                                                                                                                                                                                                                                                                                                                                        | `remarks` `maxLength={1000}`; `displayOrder` free number input                                           | Units 3–5: boundary cases are authored against the _server's_ verdict (record the observed 4xx / acceptance and the field's FE cap). A 500 on any boundary value is an `NG`.                                                                                                                                                |
| D-13 | **規約本文 card for every status** (resolved 2026-10-20)                                              | FR-010 / US2-1 (updated): the card shows the opened document's own body text, PDF name/size and プレビュー for Published, Expired, Draft and Deleted                                                                                                                                                                                                                                                                                     | One mock (適用中) only; badge 「{version} 適用中」 in the card title                                     | Unit 2: open a 公開中, 適用終了 and 下書き document — each shows its own text/file/プレビュー; the 適用中 badge only on the 公開中 one (TC-019, TC-021, TC-093).                                                                                                                                                            |

---

## Coverage Focus per Unit

These are **added to**, not a replacement for, `gen-testcases`' full coverage walk.

### Unit 1 — 規約文書管理 (`/terms`)

**Real-API behaviours**

- **Server-side filtering is the truth**: `query` matches terms ID **or** title (partial; ≤100 chars — test the 100/101-char boundary by paste); the brand select maps to `brandEnum` and returns shared rows too (D-1); the status select maps to `draft|published|ended` evaluated in **JST** (a row whose `effectiveFrom` is _today_ must read 公開中, inclusive both ends — build one at each boundary with a self-created doc: start = today, end = today, end = yesterday, start = tomorrow).
- **Real pagination totals**: `total`, range text 「a–b 件」, `totalPages` (0 when empty — no 「0 / 0」 page text), page-size 25/50/100 (default **50**), page reset to 1 on any filter/tab/search change, clamp when the last page empties after a filter. Baseline (D-3) under each filter combination.
- **Include-deleted**: toggle on ⇒ deleted rows appear **dimmed** and their ⋯ menu offers only 詳細を見る; toggle off ⇒ they vanish; `includeDeleted` combined with a type tab and with the brand/status filters.
- **Role scope server-enforced**: HQ/System see all; Manager/Staff/Observer see only their **brand group + shared rows**, brand select **fixed and disabled**, fixed brand not counted as an active filter and absent from the summary banner (US1-8). Trainer ⇒ no-permission panel (US1-6); verify the _network_ answer is 403 and that no list data flashes before the panel. Learn each non-HQ account's brand group from what the list shows (not documented) and record it in the TC header.
- **401 expiry** mid-session (token cleared/expired, then change a filter) ⇒ redirect to login / session-expired treatment, not a silent empty list.
- **Persistence**: filters/tab/page survive reload and browser back (the integrator's `filter-search-browser-back` work); a stale deep-link with a bad `page` does not 500.
- **Delete from the row** (HQ/System): dialog copy names the document, 論理削除 wording; confirm ⇒ 204 ⇒ row gone from default list and present under 削除済みも含めて表示 (**SC-005**); cancel ⇒ nothing; delete of an already-deleted id (open the list in two tabs) ⇒ `404` handled as a clean message, list refreshes. Delete works on self-created rows only (Data policy).
- **Role-gated affordances**: 新規登録 and ⋯ 編集/削除 hidden or absent for non-HQ roles (the spec says _unavailable_, i.e. hidden — record it if a disabled control is shown instead); direct route access is covered by Units 3–5.

**Computed values & business rules**

- Status badge per row = server `status`; legacy `tos` row (D-2); brand badges: single, both (shared), none/blank must not render as an empty cell.
- Tab counts / empty-state: filtered-empty (has 条件をクリア) vs the **true-empty** state (see **G2**).
- Active-filter-count indicator + summary banner contents for each filter and for 3 simultaneous filters; 条件をクリア resets search, brand and status (US1-3: "every filter and the search field"); whether it also resets 削除済みも含めて表示 is unspecified — record it as an observation.

**UI breakage under stress (1024px floor)**

- A self-created doc with a **100-char full-width Japanese title** and one with a **100-char unbroken ASCII token** — in the name column, in the delete-dialog sentence, in the filter summary (if searched by it), at **1024×768**: no horizontal page scroll, ⋯ menu still reachable, no column overlap.
- The longest type label (プライバシーポリシー) as a tab **and** in the row; all 7 tabs on one row at 1024px (wrap or scroll acceptable, but every tab reachable and the active one visible).
- Version label at its longest accepted length in the 現在バージョン column; both brand badges + longest status badge in one row.
- 3 simultaneous filters: the summary banner must wrap, not overflow. Wide check at ≥1440px.

### Unit 2 — 規約詳細 (`/terms/[id]`)

**Real-API behaviours**

- **Detail GET contract**: `pdfUrl` opens (new window — verify it is a real, loadable PDF and not the bare S3 key — a closed `report.md` ❌), `pdfFileName` / `pdfFileSize` shown (not `—`) for a document created _by the run_ with a known file name and size (exact size formatting: bytes/KB/MB boundaries — author with a ~900 KB and a ~1.2 MB PDF), body-text card scrolls and preserves line breaks.
- **`404` unknown id** and **malformed id** (non-UUID) ⇒ clean not-found treatment, not a blank shell/500. **Deleted id**: spec says viewable ⇒ detail loads with 削除済み badge and **no** Edit / Delete / 新規バージョン作成 anywhere (header, ⋯ menu, version tab) for **every** role (FR-017) — hidden, not disabled.
- **`relatedVersions`**: every version carries its own `remarks` (D-7), period text with `effectiveTo` null = open-ended (「〜 現在」/ equivalent, expiry on the management panel shows `—`), status badge per version (Published/Expired/Draft), kind badge (Original / Version), current version highlighted, only **one** current version at a time (FR-015).
- **>3 versions ⇒ 3 most recent + show-more** (US2-4): build a self-created lineage of 5 (1 original + 4 new versions via Unit 5 — this is the main reason Unit 5 runs before Unit 2); verify order (chronological, most recent first as the spec shows), 3 shown, reveal all, collapse state after tab switch/reload.
- **Role scope**: Manager/Staff/Observer may open documents of their own brand group (and shared); a document of the _other_ brand group by direct id ⇒ server answers (403/404) and the screen shows a no-access treatment — record which. Trainer ⇒ no-permission (D-11).
- **Header actions by role**: HQ/System see 編集 (outline), 新規バージョン作成 (primary), ⋯ → 削除; Observer/Manager/Staff see none (US2-6, FR-017); Version History tab's secondary 新規バージョン作成 follows the same gate.
- **Delete from the header ⋯**: dialog → 204 → return to the list with the doc absent; delete of a version in a lineage leaves siblings intact (spec Edge Case) and the timeline of a sibling no longer lists the deleted one (D-10 observation).
- **401 expiry** on tab switch / action click; **persistence** after reload (tab selection may reset — record).

**Computed values & business rules**

- Status boundaries per version (draft / published / ended) using constructed dates (**G3**): a future-dated version shows 下書き; the version it supersedes is auto-closed (`effectiveTo = effectiveFrom − 1 day`) and shows 適用終了 once that date has passed — assert the _stored_ `effectiveTo` the management panel shows for a freshly versioned source.
- 承諾ボタン表示 shown as a clear on/off value (not `true`/`false`); 表示順 `—` when unset; audit fields: created at, last updated at, last updated by (name, not id; for a doc updated by a staff whose account later changes — read-only check).
- Timeline PDF-link rule (D-4).

**UI breakage under stress (1024px floor)**

- 100-char title + 1000-char remarks (the form's cap) + 5 versions each with a long remarks in the timeline: card heights, the management panel's value column, and the timeline's summary text must wrap without overflow; the body-text card with a **very long unbroken line** and with **thousands of lines** must scroll inside its card, not stretch the page.
- Long file name (e.g. 100-char Japanese `.pdf` name) in the PDF row and the timeline's file block; both brand badges + status + kind badge on one timeline header row.
- Header action row with the longest title: 編集 / 新規バージョン作成 / ⋯ must stay reachable. Wide check ≥1440px.

### Unit 3 — 規約 新規登録 (`/terms/create`)

**Real-API behaviours**

- **Create contract**: `POST /admin/terms` → 201, then the detail route shows exactly what was typed (reload-verified): title, type, version, dates, display order, requiresConsent, remarks, brand.
- **Brand semantics (D-1)**: one brand ticked ⇒ that brand; **both** ⇒ one row with both badges, visible under both brand filters; **none** ⇒ required-field error, nothing sent.
- **Upload pipeline**: presign (`tag: terms`) → PUT to S3 → create with the S3 key + `bodyText`. A **text PDF** shows the extracted preview labelled with its filename (US3-3); **>10 MB** and **non-PDF** (rename a `.png` to `.pdf` too — content check) rejected inline with the exact copy, and — Edge Case — the **previously selected valid file stays attached** after the rejected second pick; exactly **10 MB** (10 485 760 B) accepted, 10 485 761 B rejected; 0-byte PDF; a PDF whose extraction yields no text (D-6, observation); a password-protected PDF (observe, no crash).
- **Server validation beyond the client's**: `E-TERM-002` (`effectiveTo < effectiveFrom`) ⇒ error surfaces on the date field(s), no new row; `effectiveTo == effectiveFrom` accepted; `E-VAL-001` (`pdfS3Key` without `bodyText`) must be unreachable from the UI — if reachable (e.g. blank text PDF), that is an FE `NG` or a D-6 observation, say which; `displayOrder` boundaries (0, −1, 1.5, 999999999, non-numeric via paste) judged by the server's verdict (D-12); `version` and `title` at 1 / 100 / 101 chars and whitespace-only; duplicate (type + brand + title + version) create — **observe** and record (spec silent).
- **Double submit**: double-click 登録 ⇒ exactly **one** row (check the list, search by the unique title).
- **Server-enforced role**: Manager/Staff/Observer/Trainer opening `/terms/create` directly ⇒ no access; if the page renders, a submit must still be refused with `403` and surfaced cleanly (FR-017, SC-006). **401 expiry** between upload and submit ⇒ clean redirect, no orphan half-state.
- **Success**: 「規約を登録しました」 confirmation and return to the list with the new row at its status position.

**Computed values & business rules**

- Required set exactly: brand, 規約名, 規約タイプ, バージョン, 適用開始日, PDF (+ 承諾ボタン表示 has a default). Each missing field ⇒ inline message, submission blocked, **scroll to the first invalid field** (US3-1); typing/selecting clears that field's error. Optional: 適用終了予定日, 表示順, 備考.
- **Date-order error is re-evaluated live (Y-04 不具合 No9)**: with start > end, correcting **or clearing** either date removes 「適用終了予定日は適用開始日以降の日付を入力してください。」 at once; choosing an end date while 適用開始日 is empty never shows it. The form is shared, so this also holds on edit and new-version.
- Resulting status from dates (start in future ⇒ 下書き; start today ⇒ 公開中; end in past ⇒ 適用終了 — create-time check of the contract).
- **Unsaved-changes guard (FR-018)**: dirty via any input (including just a brand tick, or a file pick), then キャンセル / back link ⇒「変更を破棄しますか？」 with 編集を続ける / 破棄する; untouched form leaves silently; browser-back and tab close behaviour recorded.

**UI breakage under stress (1024px floor)**

- 100-char full-width title, 100-char unbroken ASCII title/version, 1000-char remarks (counter if any) — field, error text and the footer buttons must stay on screen; the preview card with a PDF of **many pages / very long text** scrolls inside its card; 100-char file name in the filename label and in the rejection error.
- Longest 規約タイプ label (プライバシーポリシー) in the closed Select and in the open list; two brand checkboxes + both inherit-note copies; all inline errors visible at once (everything blank + submit) without overlapping neighbouring fields. Wide check ≥1440px.

### Unit 4 — 規約 編集 (`/terms/[id]/edit`)

> **Every case in this unit runs on a document the run created itself** (Data policy). The _unchanged-fields_ and _locked-fields_ checks may additionally be **looked at** on a pre-existing document, but never saved.

**Real-API behaviours**

- **PATCH semantics (partial update, FE sends only dirty fields)**: change only the title ⇒ other values survive (reload-verify); clear 適用終了予定日 / 備考 ⇒ the value is actually cleared (`null`) — not silently kept; change only the PDF ⇒ new `pdfS3Key` **and** re-extracted `bodyText` go together (`E-VAL-001` otherwise) and the detail page shows the new file name / size / body text; change **only** body text is not a UI path — confirm no such control exists.
- **Locked fields**: terms ID, 規約タイプ, ブランド are disabled with the note「編集モードではブランドは変更できません」-style copy; they are **not** in the PATCH body (strict server schema would answer 400 — a 400 here is an FE `NG`); verify by inspecting request payload where the runner can.
- **Active-version warning (FR-013)**: shown when the document's computed status is 公開中, **not** shown for 下書き / 適用終了 (US4-2); advisory only — saving is not blocked (Edge Case), and the edit succeeds server-side (`contracts` note).
- **Server validation**: `E-TERM-002` on a date change that makes `effectiveTo < effectiveFrom`; moving `effectiveFrom` later/earlier than the document's own timeline neighbours — **observe** (spec silent, may create overlapping versions) and record; same title/version/remarks/displayOrder boundaries as Unit 3 (D-12).
- **Deleted / unknown id**: `/terms/{deletedId}/edit` ⇒ not editable (spec FR-012 / Y-04 FR-006 異常系) — a clean refusal, not a prefilled form that fails on save; unknown id ⇒ not-found treatment. **Concurrent edit** (two tabs, A saves then B saves): there is no spec rule — record last-write-wins vs. conflict error as an observation. **Concurrent delete** (edit open, doc deleted in another tab, save ⇒ `404`) ⇒ handled cleanly.
- **Server-enforced role** & **401 expiry** as in Unit 3 (direct URL for Manager/Staff/Observer/Trainer).
- **Success**: 「規約の変更を保存しました」 then the **detail view** (not the list) shows the updated values (US4-4) — reload-verified.

**Computed values & business rules**

- **Prefill completeness**: every editable field matches the stored value, including a null 適用終了予定日 (empty, not `null` text), 承諾ボタン toggle state, the existing PDF's name/size/body-text preview; locked fields show the inherited values.
- **PDF replace order (US4-3)**: invalid replacement ⇒ inline error and the **prior file stays shown**; valid replacement ⇒ preview text replaced; cancelling the edit leaves the stored PDF untouched.
- **関連規約 on the edit form (Y-04 不具合 No13, US4-6)**: on a document whose lineage has derived versions — opened from the original **and** from a version — the field lists the rest of the lineage — the detail's バージョン履歴 entries minus the document being edited, same order/status; a lone original reads 「関連する規約が存在しません」.
- **Saving with no changes**: permitted (or no-op) — nothing lost, no error.
- **Unsaved-changes guard**: dirty via any control incl. PDF pick ⇒ discard dialog; reverting a field to its original value and leaving — record whether the form still counts as dirty.

**UI breakage under stress (1024px floor)**

- Edit the long-title / long-remarks document from Unit 3 and confirm the **prefilled** long values render (different code path from typing): title, 1000-char remarks at its cap, the long file name; the active-version warning banner + 100-char title + locked-field notes all on screen together; wide check at ≥1440px.

### Unit 5 — 規約 新規バージョン作成 (`/terms/[id]/new-version`)

> **Source documents are self-created only.** Creating a version rewrites the source's `effectiveTo`, so it must never target a pre-existing document. This unit **creates the multi-version lineages** that Unit 2 reads.

**Real-API behaviours**

- **`POST /admin/terms/{id}/versions` contract**: the new row shares the lineage of the source (same type, **same brand incl. `null`**, same title), appears in the source's 関連規約 timeline and **not** as a separate lineage in the list view's grouping; the server derives parent/prev — the screen sends none (US5-3). Reload-verify.
- **Auto-close of the previous version (FR-015)**: after creating v2 with `effectiveFrom = D`, the source's `effectiveTo` becomes **D − 1 day** (read it on the source's management panel) and, once D has been reached, its status is 適用終了 — use the **constructed** case: source start = 3 days ago (published), v2 start = today ⇒ v2 公開中, source 適用終了 immediately; and v2 start = tomorrow ⇒ v2 下書き, source still 公開中 (see **G3** for the clock-driven flip).
- **Server validation**: `bodyText` is required and **never inherited** — a new version whose PDF yields no text must not silently reuse the source's text (observe/record, D-6); `effectiveFrom` **before** the source's `effectiveFrom`, **equal** to it, or **inside** the source's window — spec is silent on the legal range ⇒ author, record the server verdict (observation), and escalate any that produce overlapping _current_ versions; `E-TERM-002` on a bad date pair; a title edit on a version (name is _locked_ by the spec — verify it cannot be edited and is not sent).
- **Source rules**: source **deleted** ⇒ new version refused (Y-04 FR-008 異常系 / FR-017: button hidden **and** direct URL refused with a clean message); unknown id ⇒ not-found; source being the **original** vs. a **later version** — new version inherits from the document _currently open_, regardless of which timeline row the user came from (Edge Case); inheriting from a **shared (`null`)** source keeps `null` (shows both brand badges, not a stale single brand).
- **Server-enforced role** & **401 expiry**, as in Unit 3. **Double submit** ⇒ exactly one new version (check timeline length). Version label duplicate of an existing version in the lineage — observe and record.
- **Success**: 「規約を登録しました」 (new-version copy is **unspecified** — record the wording) and return target (list vs detail) recorded.

**Computed values & business rules**

- **Locked/inherited fields (US5-1, SC-004)**: terms ID (read-only), タイプ, ブランド disabled, each with the note「オリジナル規約から引き継がれます（変更できません）」-equivalent (quote the spec's English: "New versions inherit this from the original terms (cannot be changed)"); 規約名 (pre-filled), 表示順 and 承諾ボタン表示 **editable** (規約名 unlocked 2026-10-20, FR-014); 関連規約 read-only showing the source's name + version (D-9).
- **Only three required fields** (SC-004): version label, effective date, PDF — missing each ⇒ inline error and scroll-to-first; nothing else may be required. Version label / start date / PDF start **empty** (D-8).
- **Lineage build-out for downstream units**: create v2…v5 so Unit 2 can test the >3 truncation; the remarks typed here are the timeline summaries (D-7).
- **Unsaved-changes guard** as Unit 3.

**UI breakage under stress (1024px floor)**

- Source with a 100-char full-width title and both brands: the pre-filled name field, the 関連規約 line (name **and** version concatenated — the longest combination), and the five inherit notes must wrap without pushing the footer off-screen; a 100-char version label; wide check ≥1440px.

---

## Known Gaps

`report.md` carries **no open FE/BE blocker** — every row's `API Status` and `FE Status` is `OK` with its `❌` items struck through. There is therefore **no `Bn` table to import**; instead the items below are (a) the _"Đang chờ"_ spec/customer waits from `report.md` that still change an expected result, and (b) gaps this plan adds. `gen-testcases` **must still write the case**; `execute-testcases` records the listed result instead of `NG`.

| ID     | Source                              | Gap                                                                                                                                                                              | UI behaviour today                                               | Test treatment                                                                                                                                                                                                                                          |
| ------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **W1** | report.md → _Đang chờ_ (spec owner) | Spec text still lacks `includeTotalAll` / `totalAllItems` and says `totalItems` where the BE returns `total`                                                                     | List baseline 「全 N 件中」 works per `list-terms.md`            | Not a defect. Author per **D-3**; `OK` when the contract holds. Record "spec lags contract" in Notes.                                                                                                                                                   |
| **W2** | report.md → _Đang chờ_ (spec owner) | Spec still shows `BrandEnum` of the terms API as the old brand set / does not state non-HQ scope by brand group / does not state `null` = shared                                 | UI follows the customer decision of 2026-10-19 (research #2, #9) | Test to **D-1** and the contract. A mismatch with the _old_ Swagger wording is not an NG.                                                                                                                                                               |
| **W3** | report.md → _Đang chờ_ (customer)   | Whether a version's 備考 _is_ the change note, or a separate `changeSummary` field is wanted                                                                                     | Timeline summary = `remarks` (research #11)                      | Test to **D-7**; if the customer later wants a separate field, the Unit 2 / Unit 5 summary cases change. Mark `OK` on the current mapping and flag in the TC header.                                                                                    |
| **G1** | this plan                           | **No hard delete, no restore.** Every created `ZZQA_` row survives as a deleted row; created PDFs stay in S3                                                                     | Delete only sets `deletedAt`                                     | Not blockable — governs Data policy. Reflect in the cleanup step (logical delete + note), never as an `NG`.                                                                                                                                             |
| **G2** | this plan                           | **True-empty list state is unreachable** — real data always has rows (and non-HQ brand scope could in theory be empty but the dev data has shared rows that always stay visible) | spec FR-005 "no data at all" empty state                         | Author the "no terms at all" case; record `Block (G2)` — "cannot empty a shared table". The **filtered**-empty state is fully testable and must be `OK`.                                                                                                |
| **G3** | this plan                           | **Clock-driven status flips cannot be waited for** (a document becoming 公開中 at its start date / 適用終了 after `effectiveTo`)                                                 | Status is computed server-side at read time in JST               | Do not `Block` the _computation_: construct start/end dates around today (yesterday / today / tomorrow) and read the status. Only the "flips by itself at midnight, no action" sentence of US5-4 / Edge Case is recorded `Block (G3)` with that reason. |
| **G4** | this plan                           | **Brand group of the non-HQ accounts is undocumented**, and the data set that Manager/Staff/Observer may see depends on it                                                       | Scope is applied server-side                                     | Discover on the first non-HQ login (list rows + fixed brand select) and record in the TC header. A _cross-scope_ row (other brand group) must be **created by the run** (as HQ) to prove the negative — never edit master data to make one.             |
| **G5** | this plan                           | **Mobile consumers read the same table** — a _published_ test row can reach real dev-app users                                                                                   | n/a                                                              | Not blockable; governs Data policy: published fixtures use `requiresConsent=false` where the case allows it, are short-lived, and are deleted first at cleanup.                                                                                         |
| **G6** | this plan                           | **Role accounts' pre-existing session state** — the six Cognito accounts are shared; Observer/Staff/Manager may have _no_ store assignment, making brand-scope cases ambiguous   | n/a                                                              | If an account sees **no** non-shared rows at all, record the account and `Block (G4)` on the scoped-visibility cases for it; keep all other cases running.                                                                                              |

---

## Traceability Map

| FR     | Requirement (short)                                                                                          | Unit(s)                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| FR-001 | All tab + 6 type tabs; row = ID, name, version, brand(s), start date, computed status                        | 1 (legacy `tos` → D-2)                                                       |
| FR-002 | Search ID/name partial, brand + status filters, active-filter count, summary banner, 条件をクリア            | 1                                                                            |
| FR-003 | 削除済みも含めて表示 toggle, dimmed rows                                                                     | 1 (re-checked in 2 for the deleted detail)                                   |
| FR-004 | Pagination 25/50/100, totals and displayed range                                                             | 1 (baseline → D-3, W1)                                                       |
| FR-005 | Filtered-empty vs true-empty state                                                                           | 1 (true-empty → `Block (G2)`)                                                |
| FR-006 | Scope & view-only access: HQ/System all, Manager/Staff/Observer own brand group + fixed filter, Trainer none | 1, 2 (G4 for scope proof)                                                    |
| FR-007 | Create form: brand multi (both ⇒ `null`), required fields, validation                                        | 3                                                                            |
| FR-008 | PDF only, ≤10 MB, inline error                                                                               | 3, 4, 5                                                                      |
| FR-009 | Automatic text extraction + preview beside the PDF                                                           | 3, 4, 5 (D-6)                                                                |
| FR-010 | Detail — Basic Information incl. body text and PDF preview                                                   | 2                                                                            |
| FR-011 | Detail — Version History timeline, current highlighted, 3 + show-more                                        | 2 (built by 5; D-4, D-7)                                                     |
| FR-012 | Edit: name/version/dates/order/approval/notes/PDF; ID/type/brand locked                                      | 4                                                                            |
| FR-013 | Active-version edit warning                                                                                  | 4                                                                            |
| FR-014 | New version: inherit + lock + 関連規約 + only 3 required                                                     | 5 (D-8, D-9)                                                                 |
| FR-015 | Automatic status transition; new version closes the previous                                                 | 1 (status display), 2 (timeline), 5 (auto-close) — clock flip → `Block (G3)` |
| FR-016 | Logical delete with confirmation, only via 削除済みも含めて表示                                              | 1 (list entry), 2 (detail entry, D-10)                                       |
| FR-017 | Role-gated New/Edit/Delete/New-version; hidden on deleted docs for every role; Trainer no access             | 1, 2, 3, 4, 5 (affordance **and** route)                                     |
| FR-018 | Unsaved-changes discard guard                                                                                | 3, 4, 5                                                                      |

**Requirements with no unit**: **none** of the spec's 18 FRs is orphaned. Three source (Y-04) requirements are deliberately outside this plan — **Y-04 FR-009, FR-010, FR-011** (mobile retrieval, mobile consent, procedure-specific display; spec → Out of Scope). Two _source-only_ behaviours have no spec scenario and are carried as **observations** rather than pass/fail: the link from a derived document back to its original (**D-9**) and the effect of deleting a version on the lineage's current-version decision (**D-10**).

---

## Execution Notes (for `execute-testcases`)

### Credentials (`src/lib/auth/demo-users.ts` — real Cognito accounts)

| Role            | Account                         | 職位 (label)   | Used for                                                                                          |
| --------------- | ------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| System          | `lodu4289+1@gmail.com`          | システム管理者 | Spot-check that System has the same write access and the same all-brand view as HQ (FR-006/017)   |
| **Headquarter** | `lodu4289+headquater@gmail.com` | 本部管理者     | **The default account for every functional case in Units 1–5** (create / edit / version / delete) |
| Manager         | `lodu4289+manager@gmail.com`    | ブロック長     | FR-006/017 negatives + **brand-scoped read** baseline                                             |
| Staff           | `lodu4289+staff@gmail.com`      | 店舗責任者     | FR-006/017 negatives + brand-scoped read                                                          |
| Trainer         | `lodu4289+trainer@gmail.com`    | 社員トレーナー | **No access** — list, detail and direct URLs of Units 3–5 (D-11)                                  |
| Observer        | `lodu4289+observer@gmail.com`   | 閲覧専任       | View-only + brand-scoped read                                                                     |

Password for all six: `Password@123`.

- A case whose pre-condition says "HQ user" / "HQ or System" → the Headquarter account. A case that says "a non-HQ/non-System user" → run it on **all four** of Manager / Staff / Trainer / Observer unless the case says otherwise (Trainer differs from the other three: no _read_ access either).
- Role switching uses the header's **「デモ: ユーザー切替」** menu (signs in for real). **It only renders when `NEXT_PUBLIC_APP_ENV=development`** — if it is missing, check that variable before filing anything. (`.env` currently has `development`.)

### Environment

- App: the local dev server. API: **whatever `NEXT_PUBLIC_REAL_API_URL` in `.env` says** (user decision 2026-10-19: the `.env` value is the correct target; currently `http://localhost:4000`). Do not switch it to another URL. Record the value actually read in every TC doc header at run time.
- **The backend is shared with other people.** A row count that moves between two cases is not automatically a defect — re-verify before recording `NG`. Dev data already contains ~83 deleted terms; an unfiltered list can be large.
- Mock BFF routes under `src/app/api/crm/terms/**` (if present) are **not called** by this feature. Seed-looking ids (`TM-001`) mean a misconfigured base URL — real ids are **UUIDs**.

### Data policy (binding)

- **Pre-existing terms documents are shared master data and are READ-ONLY.** They may be listed, searched, filtered, opened in detail, previewed, and opened in edit / new-version forms **to look at the prefill** — then left untouched via the discard guard **only if nothing was changed**. Never saved, deleted, or used as the source of a new version.
- **Every create / edit / delete / new-version case runs on a record the run created itself.** Title prefix **`ZZQA_`**, then purpose and run date — e.g. `ZZQA_登録_20261019`, `ZZQA_版元_20261019`, `ZZQA_削除_20261019`. A single `ZZQA` search on the list screen (with 削除済みも含めて表示 on) finds every leftover.
  - The **max-length** case carries the prefix: `ZZQA_` + 95 more characters = exactly 100.
  - Use a **type + version pair unique to the run** (e.g. version `ZZQA-v1`, `ZZQA-v2`…) so duplicates and lineages are traceable.
- **Minimise created rows** — they cannot be removed: create the fixtures in the order listed under _Suggested Order_ and **reuse** them across units rather than creating one per case. Destructive cases (delete) get their own throw-away row created immediately before the case.
- **Mobile exposure (G5)**: published fixtures use `requiresConsent = false` unless the case is _about_ the toggle, and are deleted promptly. Use `effectiveFrom` in the **future (下書き)** wherever the case does not need 公開中.
- **Brand choice for fixtures**: single-brand fixtures alternate JOYFIT / FIT365 only when a scope case needs the _other_ brand; otherwise JOYFIT. The both-brands fixture is created **once**.
- **PDF fixtures**: small text PDFs (named e.g. `ZZQA_small.pdf`), one ~900 KB, one ~1.2 MB, one exactly 10 485 760 B, one 10 485 761 B, one non-PDF renamed `.pdf`, one image-only PDF — prepared **before** the run. Uploaded files remain in S3 (G1).
- **Cleanup is part of the run**: at the end, search `ZZQA` with 削除済みも含めて表示 **on**, logically delete every live match (non-deleted), confirm that with the toggle **off** the search returns zero rows. Records that are already deleted stay as the permanent residue — **list their count and titles in the run notes** (G1). If a row cannot be deleted (run ended mid-case), leave it and record title + reason.
- **Never touch** other terms, the member consent records, or any staff/brand master.

### Known-gap policy

- A failure matching a `W1`–`W3` or `G1`–`G6` row → **`Block (<id>)`** (or `OK` where the row says so) with that row's reason.
- Any other failure → **`NG`**, with observed vs expected and the spec/FR reference.
- A behaviour matching a **delta row (D-1…D-12)**'s _spec_ column is an **`OK`** even where it contradicts the prototype; matching only the _prototype_ column ⇒ **`NG`**. Rows that say **observation** are recorded with the observed behaviour and neither `OK` nor `NG`; the TC doc's summary lists them for the spec owner.
- **Closed `report.md` items are regression checks**, not gaps: `pdfUrl` openable, `pdfFileName`/`pdfFileSize` present, `remarks` per version, `sort=createdAt` not 500, `effectiveTo`/`remarks` accepted as strings, presign tag `terms` accepted, `query` search by ID, brand enums `JOYFIT|FIT365`, shared (`null`) rows. If any of them regresses it is an `NG` (not a `Block`), flagged to the integration owner.

### Viewport

- **1024×768** (the supported floor) for every layout / stress case.
- **≥1440px** for the wide check on the two worst stress cases per unit.
- Below 1024px is **out of scope** — do not report layout findings from a narrower window.

### Account safety

- The six Cognito accounts are real and lock for ~15 minutes after repeated wrong-password attempts. **This plan contains no intentional wrong-password case** — login is a pre-condition (it belongs to `specs/028-subsequent-login`). For 401-expiry cases force expiry by **clearing/expiring the session token**, never by failed sign-ins.
- Switching roles repeatedly is normal and safe (each switch is a correct-password sign-in). The Trainer account is used only for no-access cases, so a lock on it would affect nothing else.

---

## Suggested Order

1. **Unit 3 — 規約 新規登録** (`/terms/create`). **First**, because it is the only unit that creates the `ZZQA_` base fixtures everything else needs, and because it exercises the full upload pipeline (presign → S3 → create) — the most failure-prone integration path. Create in order: the plain single-brand fixture, the stress fixture (100-char title / 1000-char remarks / long file name), the both-brands (`null`) fixture, a future-dated 下書き fixture, and the date-boundary fixtures (start = today, end = today, end = yesterday). Run the validation / upload-rejection / unsaved-guard cases (which create nothing) in the same sitting.
2. **Unit 5 — 規約 新規バージョン作成** (`/terms/[id]/new-version`). Needs Unit-3 sources, and **builds the 5-version lineage** that Unit 2's truncation / timeline cases depend on. Also proves the auto-close of the source, so run the date-sensitive cases before Unit 2 reads the statuses.
3. **Unit 4 — 規約 編集** (`/terms/[id]/edit`). Runs entirely on Unit-3/5 fixtures; the active-version warning case needs a 公開中 fixture (so create-time dates matter). Do the PDF-replace and PATCH-null cases after the others, since they leave the fixture with new file data.
4. **Unit 2 — 規約詳細** (`/terms/[id]`). Read-heavy and the most data-dependent: the lineage from Unit 5 gives the timeline, the stress fixture gives the layout cases, the both-brands fixture gives the badge case. Run non-destructive cases first (tabs, truncation, PDF preview, role gating, 404); the deleted-state cases wait until a document has been deleted in step 5.
5. **Unit 1 — 規約文書管理** (`/terms`). Its non-destructive cases (tabs, search, filters, pagination, scope per role, Trainer panel, baselines) run next, now that `ZZQA_` rows give the search a guaranteed hit and fixtures cover every status/brand combination. Then the **delete cases — last**: delete a throw-away `ZZQA_削除_` row from the list, then confirm 削除済みも含めて表示 re-shows it; delete a **second** throw-away from the detail header (Unit 2's destructive cases); then return to Unit 2 for the deleted-document read-only checks (hidden actions for every role, direct URLs for edit / new-version).
6. **Cleanup pass.** Search `ZZQA` with 削除済みも含めて表示 on; logically delete every remaining live match; confirm zero rows with the toggle off; note residue (G1).

---

## Definition of Done

- [ ] Five TC documents created under `specs/017-terms-management/tests/cases/`, one per unit in the Unit Table, with the exact filenames given there.
- [ ] Every FR-001…FR-018 traced to ≥1 unit (see Traceability Map); Y-04 FR-009/010/011 explicitly out of scope with the rationale carried into each TC doc header.
- [ ] Every **delta row D-1…D-12** appears in the Notes of the case(s) it affects, naming the winning clause (or marking the case an _observation_).
- [ ] Every **W1–W3 and G1–G6** row has a written case whose expected result names its treatment — gaps are covered on paper, not omitted.
- [ ] Gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` while authoring are fixed **first**, per the checklist-first workflow.
- [ ] Each of the five TC documents executed at least once (`execute-testcases`) with OK/NG/Block recorded per case, at 1024×768 plus the ≥1440px wide check; **active API base URL recorded** in each header.
- [ ] **All `ZZQA_`-prefixed live data logically deleted**, verified by a `ZZQA` search (toggle off) returning zero rows; the already-deleted residue (count + titles) listed in the run notes. **No pre-existing terms document was edited, deleted, or used as a version source by the run.**
- [ ] The **observations** (D-6 image-only PDF, D-7 original-version summary, D-9 link to original, D-10 deleted-version lineage, overlapping version windows, duplicate create) and the **non-HQ brand groups** (G4) reported to the spec owner / integration owner.
- [ ] The customer decision on **W3** (remarks vs `changeSummary`) re-raised with the evidence the run produced.
