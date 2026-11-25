# Test Plan: Y-09 Routine Master Management (ルーティン管理) — Phase 2, real API

**Spec**: [spec.md](../spec.md)
**PO Spec**: `Y-09` — ルーティン管理（マスタ）, requirement doc `260724_v2` (`.cache/fitness-spec/crm/requirements/Y-09.md`)
**Created**: 2026-10-14
**Integration round**: **Round 1** shipped 2026-10-14 (see [integration-plan.md](../integration-plan.md)) — every routine screen is on `src/lib/api-real`. Round 2 blockers B1a/B1b/B1c/B2/B3/B4 are open; Q2/Q3 open.
**Consumed by**: `gen-testcases` (one TC doc per unit below) → `execute-testcases` (runs them in the order given in **Suggested order**)

> **FR numbering warning.** This plan and every TC doc cite the **spec.md** FR ids (FR-001…FR-018).
> `integration-plan.md` and the source `Y-09.md` use the **PO** numbering (e.g. thumbnails = PO FR-011 =
> spec FR-013; duplicate = PO FR-012 = spec FR-014). When copying a blocker's "Spec says" text into a
> case, translate the FR id.

> **Delta decisions (requester, 2026-10-14)** — these override the spec where they conflict; §4 shows the
> resulting oracle per item:
>
> - **#1** Routine Category management → **Phase 2**. Not tested now.
> - **#2** Page size → follow **prototype / API**: `25 / 50 / 100`, default 50. The spec's 200 is dropped.
> - **#3** Published-routine delete on detail → follow **prototype**: blocked dialog with an in-place 「非公開にする」.
> - **#4** Publish toggle on the detail header → follow **prototype** (in scope).
> - **#9** Default set weight → **no default for now**: 重量 starts empty.
> - **Field limits, image format/size, publish switch on create** → the **spec** where it defines the rule,
>   otherwise the **API schema** (`src/lib/openapi.real.json`). The prototype's own numbers are not used as the oracle.

> **Writing rule for this round (from the requester).** Cases are written **in full, to the spec**, even
> where Round 1 has not implemented the behaviour. At execution, a case that fails because of a known
> Round 1 gap is recorded `Block (Bn)` — not skipped, not `NG`.

---

## 1. Scope

**In scope** — the four routes under `/routines`, all on the real API:

- Routine list (`/routines`): keyword search, カテゴリ / ステータス filters, active-condition badge, FilterResult banner + 条件をクリア, sortable columns, paging, header `N件` badge, the row action menu (編集 / 複製 / 公開する・非公開にする / 削除) and the dialogs it opens, filtered vs empty-catalog states.
- Routine detail (`/routines/[id]`): 基本情報 tab (fields + thumbnail gallery), エクササイズ構成 tab (exercise cards, set table, HQ comment, 合計 N種目 / Nセット), header actions (複製 / 編集 / 削除 / 公開する・非公開にする with its confirm dialog — delta #4) and the delete dialog including the published-routine block with in-place 「非公開にする」 (delta #3).
- Routine registration / edit form (`/routines/create`, `/routines/[id]/edit`): basic info, auto-numbered code, thumbnail section (max 5), exercise picker (published Y-08 only), reorder / remove exercise, HQ comment, set add / copy / remove / renumber, numeric validation, publish switch with the 0-exercise guard, required-field guidance, unsaved-changes guard.
- Role gating of the screen and every write action (System / Headquarter only), client-side **and** server-side.

**Out of scope** (no unit, no cases):

- **Routine Category CRUD** (PO FR-010) — **deferred to Phase 2** (decision 2026-10-14), even though the current prototype ships a 「ルーティンカテゴリ管理」 Sheet on the list (delta #1). The category **select** (filter + form) is in scope; managing categories is not.
- Weight-coefficient table (PO FR-013 full), superset configuration UI (PO FR-014), CSV export (PO FR-015), exercise-type-driven field enable/disable (integration S3), drag-and-drop reorder (S4) — all out per spec Clarifications / Out of Scope.
- **Y-08 Exercise Management** — the exercise-name link target (`/exercises/[id]`) is a navigation target only; Y-08 itself is still on the mock (D12).
- **Mobile app** — delivery / non-delivery to members (FR-009 tail, FR-010 "member copies unaffected", SC-006) is not observable from the CRM. Cases assert the CRM-side state (status, list presence) and say so in Notes.

---

## 2. Unit table

| #   | Unit   | Screen(s)                                                                                                                        | Route                                     | TC doc filename                                                    |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| 1   | Y09-01 | Routine List + row action menu + its publish / duplicate / delete dialogs                                                        | `/routines`                               | `TC -【Fitness CRM】- [Y09-01][Routine List].md`                   |
| 2   | Y09-02 | Routine Detail (基本情報 / エクササイズ構成 tabs, header actions, delete + published-block dialog)                               | `/routines/[id]`                          | `TC -【Fitness CRM】- [Y09-02][Routine Detail].md`                 |
| 3   | Y09-03 | Routine Registration / Edit Form (create + edit combined; exercise picker, set table, thumbnail, publish switch, discard dialog) | `/routines/create`, `/routines/[id]/edit` | `TC -【Fitness CRM】- [Y09-03][Routine Registration Edit Form].md` |

All docs live under `specs/016-routine-management/tests/cases/`.

**Split rationale**: three screens in the prototype (`routine-list.tsx`, `routine-detail.tsx`, `routine-form.tsx`) → three units. Row-menu dialogs exist only inside the list, header dialogs only inside detail, so each stays with its parent. Create and edit share one form component with the same fields and validation (spec US4 AC1), so they are one unit; edit-only behaviour (prefill, 更新者 recording, publish 公開→非公開) gets its own cases inside it. The form is the largest unit (exercise × set editor) — gen-testcases should group its cases by section rather than split the doc.

---

## 3. Sources per unit

Read only the listed slice. Also read `Y-09.md` (権限マトリクス + 補足: UI設計方針) for every unit.

| Unit   | Spec sections (`spec.md`)                                                                                                                                                          | UI prototype file                                    | FRs covered                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Y09-01 | US1 (all ACs), US4 AC3–AC5 (row-menu publish), US5 (row-menu duplicate), US6 (row-menu delete), Edge Cases 1, 2, 4, 5; FR-001–FR-005, FR-009, FR-010, FR-014, FR-017, FR-018       | `.cache/fitness-crm-ui/src/pages/routine-list.tsx`   | FR-001, 002, 003, 004, 005, 009 (list), 010 (list), 014 (list), 017 (list), 018            |
| Y09-02 | US2 (all ACs), US4 AC3–AC4 (header publish, delta #4), US5 AC1–2 (header duplicate), US6 AC1–3 (header delete), Edge Cases 2, 4, 7; FR-008, FR-009, FR-010, FR-014, FR-017, FR-018 | `.cache/fitness-crm-ui/src/pages/routine-detail.tsx` | FR-008, 009 (detail), 010 (detail), 013 (gallery display), 014 (detail), 017 (detail), 018 |
| Y09-03 | US3 (all ACs), US4 AC1–AC5, US5 AC2 (landing on the copy's edit screen), Edge Cases 3, 6, 7, 8; FR-006, FR-007, FR-010–FR-013, FR-015, FR-016, FR-017                              | `.cache/fitness-crm-ui/src/pages/routine-form.tsx`   | FR-006, 007, 010 (form), 011, 012, 013, 014 (landing), 015, 016, 017 (form), 018           |

Supporting: `integration-plan.md` §Blockers, §Decisions D4–D13, §Round 1 result (real error codes already observed) — not an oracle. **`src/lib/openapi.real.json`** — the oracle for field limits / image rules the spec does not define (per the 2026-10-14 decision; values copied into §4 so gen-testcases need not open it).

---

## 4. Spec-vs-prototype deltas

`gen-testcases` must mark each of these in the affected case's **Notes** (`Delta #n`). The **Oracle** column is final (decisions 2026-10-14).

| #   | Item                                              | In spec                                                                            | In prototype                                                                                         | Oracle (decided)                                            | How to test                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Routine Category management                       | Out of scope (Clarification 2026-07-10)                                            | 「ルーティンカテゴリ管理」 Sheet on the list (list / order / 使用数 / 有効・削除済 / CRUD)           | **Phase 2**                                                 | No cases this round. Category select (filter + form) is still tested.                                                                                                                                                                                                                                                                                                                                                                                              |
| 2   | Page-size options                                 | 25 / 50 / 100 / 200, default 50 (US1 AC7, FR-004)                                  | `[25, 50, 100]`; API caps `limit` at 100 (D5)                                                        | **Prototype / API**: 25 / 50 / 100, default 50              | Assert exactly 3 options, default 50. Stale `?rt_page_size=200` URL falls back to 50 with no error.                                                                                                                                                                                                                                                                                                                                                                |
| 3   | Published-routine delete from detail              | Dialog with a shortcut into the edit screen (US2 AC4)                              | 「このルーティンは削除できません」 + in-place 「非公開にする」 (閉じる / 非公開にする)               | **Prototype**                                               | Expect the prototype dialog copy; 「非公開にする」 unpublishes in place (status badge → 非公開, persists on reload); after that, 削除 opens the normal confirm dialog and deletes. 閉じる changes nothing.                                                                                                                                                                                                                                                         |
| 4   | Publish toggle on the detail header               | FR-010 names the row menu and the edit form only                                   | 公開する / 非公開にする with confirm dialog 「ルーティンを公開しますか？」 / 「…非公開にしますか？」 | **Prototype** (in scope)                                    | Full cases: both dialogs (copy, キャンセル, confirm), 0-exercise block, persistence, HQ/System only, server `E-RTM-003` on a stale 0-exercise publish.                                                                                                                                                                                                                                                                                                             |
| 5   | Thumbnail file rules                              | Up to 5 images, first = primary (FR-013); no format / size rule                    | 「JPG・PNG / 最大5MB」                                                                               | **Spec** (max 5, first = primary) + **API** (format / size) | API: `fileSize` 1 B – 100 MB (over → `E-MED-001`), `contentType` must be on the global MIME whitelist (else `E-MED-002`), `fileName` ≤ 255 with an extension (else `E-MED-006`). The prototype's JPG/PNG/5MB is **not** the oracle. All upload cases → `Block (B1b)` this round.                                                                                                                                                                                   |
| 6   | Field max lengths                                 | None stated                                                                        | 説明文 / 本部コメント `maxLength=1000`                                                               | **API**                                                     | ルーティン名: `maxLength 200` → boundary 200 OK / 201 rejected (client or `E-VAL-001`). 説明文 / 本部コメント: **no limit in the API schema** (typed `object`, D2) → no boundary assertion; one long-value case (e.g. 5,000 chars) records what is accepted, as an observation.                                                                                                                                                                                    |
| 7   | Publish switch on the **create** form             | FR-006: new routine defaults to 非公開                                             | Switch shown in both modes                                                                           | **Spec** for the default; **API** for the rest              | Assert the switch defaults to 非公開 on create. The create API takes no `publishStatus` (B4); switching it on at create is recorded as observed behaviour (save → publish chain), not pass/fail — Q3 still open.                                                                                                                                                                                                                                                   |
| 8   | Unauthorized role landing                         | FR-018: blocked at routing level                                                   | In-page 「アクセス権限がありません」 panel                                                           | Spec intent                                                 | Either the standard 403 / redirect or the in-page panel is `OK`, as long as no routine data and no action renders and the sidebar entry is hidden.                                                                                                                                                                                                                                                                                                                 |
| 9   | Default set weight                                | Equipment-based minimum weight (FR-012), system constants (Y-09 FR-008, 261020_v3) | Barbell 20 / dumbbell 5 / machine 10 / cable 10 / bodyweight 0                                       | **Spec** (Y-09 FR-008 constants)                            | Before a pick 重量 is empty. On picking an exercise, and on 「セットを追加」 for that exercise: 重量 = the 器具別最低重量 when the exercise's 器具種別 has one, **empty** otherwise. Re-pick replaces only empty or still-seeded weights — a value the user typed is kept, even when it equals the previous seed. Copied set keeps the source's value. 「セットを追加」 on a card loaded in edit mode starts empty (B3). Reps 10 / time 90 / RPE 0 still asserted. |
| 10  | Set numeric ranges                                | Reps / weight ≥ 0 (FR-012); time / distance / RPE optional                         | —                                                                                                    | **Spec** + **API**                                          | Reps / weight: 0 OK, negative blocked. API: `targetRpe` 0–10 → 10 OK / 11 rejected; decimal reps → `E-VAL-001`; `setNumber` ≥ 1 (auto-numbered, not user-editable).                                                                                                                                                                                                                                                                                                |
| 12  | List filter layout (found while authoring Y09-01) | US1 AC3: 「詳細フィルター」 toggle panel; FR-003: active-condition **count**       | Selects always visible (comment A8: ≤2 filters stay expanded); active state = highlight, no count    | **Open — needs a decision**                                 | Y09-01 TC-017 records the built layout (pass if both selectors reachable, default 'all'); TC-022 asserts the count per spec, marked `[Spec-only]`.                                                                                                                                                                                                                                                                                                                 |
| 11  | 「合計 N種目 / Nセット」 position                 | "followed by" — total precedes cards (US2 AC2); Y-09 補足 says 「タブ下部」        | Shown in the composition tab                                                                         | Spec (values)                                               | Assert the totals are correct; record the observed position in Notes, not as a pass/fail criterion.                                                                                                                                                                                                                                                                                                                                                                |

---

## 5. Coverage focus per unit

Added to — not a replacement for — gen-testcases' full coverage walk.

### Y09-01 — Routine List

- **Real totals and counts**: header `N件` = unfiltered total; FilterResult 「X件 / 全Y件」 uses the filtered `totalItems` and the unfiltered total (second `limit: 1` query, D6); footer total / pages / row range correct at 25 / 50 / 100 and on the last partial page. Create one fixture and confirm both numbers go up by 1 after returning to the list.
- **Search** (server-side `keyword`): partial match, full-width / half-width Japanese, a term that only matches a fixture, leading/trailing spaces, special characters (`%`, `_`, `'`), a very long term — no 500.
- **Filters**: each category (6 values + 全て) × status (公開 / 非公開 / 全て), AND with keyword, active-count badge (0/1/2/3 incl. keyword per FR-003), 条件をクリア resets filters **and** the search box together. URL state survives reload.
- **Sort**: each of name / exercise count / status / last-updated, asc ↔ desc, indicator icon; default = updatedAt desc (a fixture just edited is row 1). Sort + filter + page combined.
- **States**: filtered zero-result (with clear action) — real. Empty-catalog state — `Block (ENV)` (shared catalog cannot be emptied, pre-existing data must not be deleted). Legacy rows with null code / category render `—` / no badge (D4).
- **Row menu decision table**: status (公開 / 非公開) × exercise count (0 / ≥1) → which of 公開する / 公開できません(+reason) / 非公開にする / 削除 / 削除できません(+reason) is shown and enabled.
- **Publish / unpublish from the row**: 0-exercise routine blocked client-side; success toast + row badge + status filter consistency; persistence after reload.
- **Duplicate from the row**: new row exists, status 非公開 even from a 公開 source, lands on the copy's edit screen, name = 「…のコピー」 (`Block (B2)` while BE returns `… (copy)`).
- **Delete from the row**: 非公開 → confirm dialog (「元に戻せません」) → row gone, totals −1, detail URL of the deleted id no longer shows it; 公開 → blocked.
- **Real-API races (two tabs)**: tab A publishes a fixture, tab B (stale list) deletes it → server `409 E-RTM-002` shown via the shared toast and the list refetches; tab A deletes a fixture, tab B publishes / duplicates / opens it → server error surfaced, no ghost row; tab A removes all exercises from a fixture, tab B publishes it from the row → `422 E-RTM-003`.
- **401 expiry**: expire / clear the session, then sort or page → redirected to login, list does not render stale data as fresh.
- **Role gating (FR-017 / FR-018)**: Manager / Staff / Trainer / Observer — sidebar entry hidden, direct `/routines` blocked (delta #8), server `403 E-AUTH-100`. System and HQ both get every action.
- **Duplicate at the name limit**: duplicating a 200-char-name fixture — the copy's name would exceed the API's 200 (`… (copy)` / 「…のコピー」); record whether the server truncates, rejects (error surfaced via the shared toast) or 500s — a 500 is `NG`.
- **Stress at 1024px**: 200-char full-width Japanese name (API max), a 200-char unbroken ASCII token name, a long description (not shown in the list but must not leak), longest category label 運動不足解消 / ビギナー向け, 3-digit exercise count, a name grown by repeated duplication (`…のコピーのコピー…`) — no column overlap, truncation has a tooltip or wraps, row menu stays reachable, no horizontal page scroll.

### Y09-02 — Routine Detail

- **基本情報 fields** match what was saved on the form: name, description (line breaks preserved), category badge, exercise count, status badge, 最終更新日, 更新者 = updater's staff name (fallback creator, then `—`, D3). After an edit by a **different** account (System vs HQ), 更新者 changes.
- **Gallery**: 0 images → placeholder, not a broken `<img>`; stored key → neutral tile (`Block (B1c)` for the real preview); multiple images with prev/next + strip → `Block (B1a/B1b)` (only one key persists, upload fails).
- **エクササイズ構成**: cards in saved order with position numbers, target-area badge, set table (set no. / reps / weight / time / RPE) with blank values rendered blank (time-only exercise, edge case 8), HQ comment present vs absent, totals 「合計 N種目 / Nセット」 correct for 0, 1 and many.
- **Exercise-name link** → `/exercises/[id]` URL is correct; landing page content is `Block (D12)` (Y-08 still on mock, real uuid 404s).
- **Header actions**: 複製 → copy's edit screen (B2 for the name); 編集 → edit form prefilled; 削除 on 非公開 → confirm 「ルーティンを削除しますか？」 → list without the row; 削除 on 公開 → 「このルーティンは削除できません」 with in-place 「非公開にする」 (delta #3 — then delete succeeds).
- **Header publish toggle** (delta #4): 公開する / 非公開にする confirm dialogs (copy, キャンセル leaves status unchanged), 0-exercise routine blocked with 「エクササイズが0件のため公開できません…」, badge + list status consistent after reload; two tabs: tab A removes all exercises, tab B publishes from the header → `422 E-RTM-003`.
- **Real-API**: open a deleted / non-existent / malformed id → not-found handling, no crash; another tab edits the routine → reload shows new values; delete from detail when another tab already published it → `E-RTM-002`.
- **Role gating**: non-HQ direct URL to `/routines/{id}` blocked; HQ/System see all three actions.
- **Stress at 1024px**: 200-char name (API max) in the page header next to the status badge and the four action buttons; long description and HQ comment (the longest value Y09-03 managed to save) (wrapping, no overflow); an unbroken 200-char token in name / comment; 20+ exercises × 10 sets (scroll, totals); long exercise names from Y-08 in card headers.

### Y09-03 — Routine Registration / Edit Form

- **Required fields** (FR-016): name, category — each missing → inline error, 「未入力の項目があります」, scroll to the first invalid field; whitespace-only name. Server-side validation beyond the client: name over the server limit, decimal / negative / huge reps and weight → `E-VAL-001` surfaced via the shared toast, form stays filled.
- **Routine code**: 「保存後に自動採番されます」 on create, read-only on edit, unique and immutable after edit.
- **Exercise picker**: only published Y-08 exercises (verify with a known unpublished exercise if one exists on the backend, else `Block (ENV)`); keyword search; 該当なし; same exercise picked twice is prevented; picker beyond 50 hits (limit 50 — record whether more are reachable by search).
- **Default set on add**: reps 10, time 90, RPE 0, **重量 empty** (delta #9 — no default for now).
- **Set operations**: セットを追加 (auto-number, same defaults), copy icon inserts a duplicate **directly after** the source, remove renumbers, remove the last set of an exercise, many sets.
- **Numeric validation** (FR-012): reps / weight: 0 OK, negative blocked, non-numeric blocked, decimal (reps → server `E-VAL-001`), blank allowed; time / distance / RPE blank allowed; message 「推奨Rep数・重量は0以上の数値のみ許可されています」.
- **Reorder / remove exercise**: up on first and down on last disabled, swap updates numbering, removal leaves the Y-08 record intact (picker still offers it). Saved order survives reload (edit = full replace).
- **HQ comment / 説明文**: optional, multiline; no API limit (delta #6) → one long-value observation case each.
- **ルーティン名 length**: 200 OK / 201 rejected (API `maxLength 200`, delta #6); RPE 0–10 (11 rejected), delta #10.
- **Publish switch**: default 非公開 on create (delta #7); on + 0 exercises → blocked with 「公開するにはエクササイズを1件以上登録してください」; on + ≥1 → saved as 公開 (B4 chain — persistence checked after reload); edit 公開 → 非公開 always allowed; remove every exercise from a 公開 routine and save → expected blocked/handled (`E-RTM-003` from server if the client lets it through).
- **Thumbnail** (FR-013): upload JPG / PNG, reject other formats / > 5MB, max 5 (add tile hidden at 5), remove, first = primary — all `Block (B1b)`; persisted keys 2–5 → `Block (B1a)`; preview of stored key → `Block (B1c)`. Edit form of a legacy routine with a stored key shows the placeholder tile.
- **Save outcomes**: create → list with success toast 「ルーティンを登録しました」, status 非公開, new row on top; edit → 「ルーティンの変更を保存しました」, 最終更新日 / 更新者 updated; double-click on submit creates exactly one routine; persistence after reload and after re-login.
- **Unsaved-changes guard** (FR-015): back link and キャンセル with dirty form → 「変更を破棄しますか？」 (編集を続ける / 破棄する); clean form → no dialog; browser back / reload behaviour recorded.
- **Edit concurrency**: two tabs edit the same fixture and save → record observed behaviour (last-write-wins vs conflict); second tab saving a routine deleted in the first → server error surfaced, no silent re-creation.
- **401 expiry mid-form**: session expires before submit → redirected to login; record whether input is lost (no requirement — observation).
- **Role gating**: non-HQ direct URL to `/routines/create` and `/routines/{id}/edit` blocked; server rejects writes with `403 E-AUTH-100`.
- **Stress at 1024px**: 200-char full-width Japanese name and 200-char unbroken token in the name input, category select, page title; long description; 20+ exercises each with 10+ sets (table columns Rep / 重量 / 時間 / 距離 / RPE stay aligned, icons reachable); long Y-08 exercise names in the picker and card header; 5 thumbnail tiles (as far as B1b allows).

---

## 6. Known Round 1 gaps

From [integration-plan.md](../integration-plan.md). Treatment unless stated: **case written to the spec, result recorded `Block (Bn)`**.

| ID      | Blocker                                                                 | UI behaviour in Round 1                                                            | Test treatment                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B1a** | API stores one `thumbnailS3Key`, not an array of 5                      | Form keeps up to 5, only `keys[0]` is sent; edit prefill shows ≤1                  | Gallery / max-5 / order / primary-image persistence cases → `Block (B1a)`.                                                                                         |
| **B1b** | `POST /media/presign` rejects tag `routine-thumbnail` → `E-MED-011`     | Every upload fails with the shared error toast                                     | All upload cases → `Block (B1b)`. Still verify: the failure toast appears, the form stays usable and saves without a thumbnail.                                    |
| **B1c** | Detail returns a raw key, no signed `thumbnailUrl`                      | Stored thumbnails render as a neutral placeholder tile (form + detail)             | "Shows the real image" → `Block (B1c)`. "Placeholder, not broken `<img>`" is testable now → `OK` / `NG`.                                                           |
| **B2**  | Duplicate names the copy `… (copy)`                                     | Toast + edit screen show the API's name                                            | Name assertion → `Block (B2)`. Status 非公開, full content copy and landing on the edit screen are testable now.                                                   |
| **B3**  | No `toolName` on picker / composition DTOs (and no spec values, Q2)     | New set weight starts empty                                                        | **Superseded by decision #9** — expected result is now "重量 empty", so no `Block (B3)`; re-plan when Q2 gets values.                                              |
| **B4**  | Save body has no `publishStatus`; FE saves then calls `PATCH …/publish` | Chain works; if the second call fails the routine stays 非公開 with an error toast | Happy path is testable now. The partial-failure path (publish rejected after save) → only if it can be provoked (e.g. 0 exercises bypass); otherwise `Block (B4)`. |
| **D5**  | API `limit` max 100                                                     | Page sizes 25 / 50 / 100                                                           | **Superseded by decision #2** — 25 / 50 / 100 is the oracle; no Block.                                                                                             |
| **D12** | Y-08 still on mock                                                      | Exercise-name link to `/exercises/[id]` 404s for real ids                          | Link target URL testable; landing content → `Block (D12)`.                                                                                                         |
| **ENV** | Shared backend, no reset, pre-existing data must not be deleted         | —                                                                                  | Empty-catalog state, and "unpublished exercise hidden in picker" when no unpublished exercise exists → `Block (ENV)` with the reason.                              |

Known real error codes (already observed in the Round 1 smoke): `409 E-RTM-002` delete while published · `422 E-RTM-003` publish with 0 exercises · `E-RTM-004` non-selectable exercise · `400 E-VAL-001` field validation (e.g. decimal reps) · `403 E-AUTH-100` non-HQ role · `400 E-MED-011` presign tag · `400` on `limit > 100`. Each must surface through the shared error toast (no local toast, D8).

---

## 7. Traceability map

| FR                               | Unit(s)                                                    | Note                                        |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| FR-001 List rendering            | Y09-01                                                     | null code / category per D4                 |
| FR-002 Search                    | Y09-01                                                     |                                             |
| FR-003 Filters + count + clear   | Y09-01                                                     |                                             |
| FR-004 Sort & paging             | Y09-01                                                     | page sizes 25 / 50 / 100 (delta #2)         |
| FR-005 Empty states              | Y09-01                                                     | empty-catalog → `Block (ENV)`               |
| FR-006 Create                    | Y09-03                                                     | code auto-numbered, default 非公開          |
| FR-007 Edit                      | Y09-03 (+ Y09-02 for 更新者 display)                       |                                             |
| FR-008 Detail view               | Y09-02                                                     | link landing → `Block (D12)`                |
| FR-009 Delete with publish guard | Y09-01 (row) + Y09-02 (header)                             | mobile non-delivery not observable          |
| FR-010 Publish / unpublish       | Y09-01 (row) + Y09-02 (header, delta #4) + Y09-03 (switch) | member-copy effect not observable           |
| FR-011 Exercise composition      | Y09-03 (edit) + Y09-02 (display)                           |                                             |
| FR-012 Set definition            | Y09-03 (edit) + Y09-02 (display)                           | weight starts empty (delta #9)              |
| FR-013 Thumbnails                | Y09-03 (upload) + Y09-02 (gallery)                         | `Block (B1a/B1b/B1c)`                       |
| FR-014 Duplicate                 | Y09-01 + Y09-02 (trigger), Y09-03 (landing)                | name → `Block (B2)`                         |
| FR-015 Unsaved-changes guard     | Y09-03                                                     |                                             |
| FR-016 Required-field validation | Y09-03                                                     |                                             |
| FR-017 Role-gated actions        | Y09-01, Y09-02, Y09-03                                     | each unit gates only the actions it renders |
| FR-018 Screen-level access       | Y09-01, Y09-02, Y09-03                                     | direct URL per route (delta #8)             |

**Confirmed**: all 18 FRs land in ≥1 unit. FR-009/010/011/012/013/014/017/018 span units by design — each unit covers only its own screen's slice; do not duplicate full coverage. SC-006 (members never see unpublished routines) has no CRM-observable check — recorded as out of scope (mobile).

---

## 8. Execution notes (for execute-testcases)

**Credentials** (`src/lib/auth/demo-users.ts` — real Cognito accounts, all `Password@123`; the header's 「デモ: ユーザー切替」 switcher only appears when `NEXT_PUBLIC_APP_ENV=development`):

| Role        | Email                           | Use for                                                               |
| ----------- | ------------------------------- | --------------------------------------------------------------------- |
| Headquarter | `lodu4289+headquater@gmail.com` | Primary account — all positive-path cases                             |
| System      | `lodu4289+1@gmail.com`          | Positive-path spot checks; second updater for the 更新者-changes case |
| Manager     | `lodu4289+manager@gmail.com`    | Denied (UI + server `E-AUTH-100`)                                     |
| Staff       | `lodu4289+staff@gmail.com`      | Denied                                                                |
| Trainer     | `lodu4289+trainer@gmail.com`    | Denied                                                                |
| Observer    | `lodu4289+observer@gmail.com`   | Denied                                                                |

No login-form / wrong-password cases in this feature → no lockout risk.

**Environment**: `NEXT_PUBLIC_REAL_API_URL=https://api.dev.fitness-v2.okamoto-hd.com` — **shared** dev backend, no seed reset; other people use it at the same time. Totals in list cases are read live at the start of each case, never hard-coded.

**Data policy** (agreed with the requester for this feature):

- **Create, edit, publish/unpublish, duplicate and delete freely — but only on this run's own fixtures.** Prefix every fixture name `QA-Y09 <YYYYMMDD> …` (e.g. `QA-Y09 20261015 基本`).
- **Never edit, publish/unpublish or delete a pre-existing routine.** Pre-existing routines are read-only: list / search / filter / sort / paging / detail view only. Publishing changes what members see in the app, so even a toggle-and-revert is not allowed. Duplicating a pre-existing routine is allowed (it only creates a new 非公開 record) but prefer a fixture.
- **Cleanup is not required** (dev environment). Leave fixtures in place; the TC doc's Notes list what was left.
- Suggested fixture set (created early in Y09-03, reused later):

  | Fixture | Content                                                                            | Used by                                               |
  | ------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
  | F1      | `… 基本` — ビギナー向け, 2 exercises × 2 sets, one HQ comment, 非公開              | detail display, edit, list search / sort              |
  | F2      | `… 0種目` — 筋力アップ, 0 exercises, 非公開                                        | 0-exercise publish guard (row + form)                 |
  | F3      | `… 公開` — ≥1 exercise, published                                                  | delete-block (row + detail), duplicate-from-published |
  | F4-n    | `… 削除用-n` — throw-away, 非公開                                                  | each delete / race case gets its own                  |
  | F5      | `… 長文` — 200-char name, long description, 20+ exercises × 10 sets, long comments | stress / layout                                       |
  | F6      | 200-char unbroken ASCII token as name                                              | stress / layout                                       |

- Destructive or race cases (delete, two-tab conflicts) always use a fresh F4-n, never a fixture another case still needs.

**Known-gap policy**: a failure matching a row in §6 → `Block (Bn)` (or `Block (D12)` / `Block (ENV)`); an undocumented failure → `NG`. A mismatch against a §4 decided oracle is `NG`.

**Viewport**: run at **1024×768** for layout / stress cases and **≥1440px** for the wide check. Below 1024px is out of scope.

**Account safety**: no lockout cases. Run the denied-role cases at the end so HQ setup is not interrupted by role switches.

---

## 9. Suggested order

1. **Y09-03 — Registration / Edit Form** first: it creates fixtures F1–F6 that the other two units read, and it carries most of the P2 validation. Run create cases → edit cases → publish-switch cases → denied-role cases last.
2. **Y09-02 — Detail** second: read-mostly checks against F1 / F3 / F5 / F6 and pre-existing routines; its own delete cases use fresh F4-n at the end.
3. **Y09-01 — List** last: search / filter / sort / paging over a catalog that now contains known fixtures, then row-menu publish / duplicate, then delete and two-tab race cases (destructive, last), then denied roles.

---

## 10. Definition of done

- [ ] TC docs created for Y09-01, Y09-02, Y09-03 under `specs/016-routine-management/tests/cases/`, every case citing spec FR ids (see numbering warning).
- [ ] Every FR-001–FR-018 traced to ≥1 case; each delta in §4 marked in the case Notes.
- [ ] Gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` while authoring are fixed in the shared checklist first.
- [ ] Each doc executed once via `execute-testcases`; results recorded as OK / NG / `Block (Bn)`.
- [ ] Fixtures created by the run listed in each doc's Notes (no cleanup required — dev environment).
- [ ] Delta decisions (2026-10-14) reflected in case Notes; category management (delta #1) carried to the Phase 2 plan.
