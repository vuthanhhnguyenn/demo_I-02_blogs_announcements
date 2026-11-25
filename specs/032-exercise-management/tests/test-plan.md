# Test Plan: Y-08 Exercise Master Management (エクササイズ管理)

**Spec**: [`.cache/fitness-spec/crm/requirements/Y-08.md`](../../../.cache/fitness-spec/crm/requirements/Y-08.md). This feature has no speckit `spec.md`, so the PO requirement is the spec.
**PO Spec**: `Y-08` — エクササイズ管理（マスタ）, version **260805_v2**
**UI prototype**: `.cache/fitness-crm-ui/src/pages/exercise-list.tsx`, `exercise-detail.tsx`, `exercise-form.tsx`, `exercise-master.tsx`
**Integration register**: [../integration-plan.md](../integration-plan.md). This is a register of known gaps, **not** an oracle.
**Created**: 2026-10-13
**Integration round**:

- All screens are on the **real dev API**: Round 1 is committed in `399c7e5d`, and Round 1b (sorting, CSV, タグ / 用語解説 tabs, EN editing) is on `feat/exercise-integration-api`.
- Nothing is still mocked.
- BE gaps are carried as `Bn` blockers (see **Known Round 1 Gaps**).

**Consumed by**:

- `gen-testcases` reads this plan to know WHAT to author, per unit.
- `execute-testcases` reads this plan for run order and execution notes.

**Test policy (user, 2026-10-13)**:

- Test the integrated parts now.
- Parts waiting on the BE still get cases **written to the spec as usual**. They execute as `Block (Bn)` and are retested when the BE fixes them.
- Test data for this feature may be created, edited and deleted freely, **as long as no pre-existing record is deleted or modified**.

---

## Scope

**In scope**:

- **エクササイズ一覧** (`/exercises`):
  - list table and header count;
  - keyword search plus the 詳細フィルター panel (5 filters), filter result banner, empty and filtered-empty states;
  - column sorting and pagination;
  - row actions: 編集, 公開にする / 非公開にする (with the unpublish confirm), 削除 (with blocked variants);
  - 「CSV出力」;
  - entry points to 参照マスタ管理 and 新規登録.
- **エクササイズ詳細** (`/exercises/[id]`):
  - three tabs: 基本情報 / 解説ステップ / 関連情報;
  - status card with the 公開 / 非公開 confirm and incomplete-step warning;
  - photo gallery, 動画URL, 紐づけ機材, タグ設定, 関連エクササイズ;
  - 編集 entry and the 削除 dialog.
- **エクササイズ 登録／編集フォーム** (`/exercises/create`, `/exercises/[id]/edit`). One form in two modes, with:
  - three tabs;
  - EN name and EN steps with machine translation (FR-014);
  - the 公開 switch;
  - three dialogs: 器具種別→なし（自重） 機材解除, 種別不一致, and 再翻訳上書き;
  - the unsaved-changes dialog.
- **参照マスタ管理** (`/exercise-master`):
  - six tabs: カテゴリ / 筋肉部位 / 器具種別 / エクササイズタイプ / タグ / 用語解説;
  - per tab: search, table, create and edit dialog, delete confirm, in-use block.

**Out of scope** (no unit may expand into these):

- **Mobile app behaviour.**
  - Covers 公開 hiding or showing an exercise, enabled tags offered at record time, the EN display, and 関連種目.
  - The CRM side (stored values) is tested; the app side is not a CRM screen.
  - B12 is listed in the gaps so nobody files an app-visibility result against the CRM.
- **E-03 トレーニング機材管理 screens** (`/training-equipment/**`).
  - Only the _navigation_ from a 紐づけ機材 row to `/training-equipment/[id]` is checked (the target opens).
  - The E-03 side of the same link belongs to the E-03 plan (`specs/010-training-equipment/tests/test-plan.md`).
  - Tool types (器具種別) are E-03-owned `mst_tools` rows shown in the 器具種別 tab. Only records this run creates are edited or deleted there.
- **Y-09 ルーティン管理.**
  - Used only to _set up_ the routine-linked delete block (FR-006), and only if a throw-away routine can be created (see Execution Notes).
  - No routine screen is tested.
- **Header store switcher, sidebar, login screen.** These are shared chrome; they are used only to sign in and switch role.
- **Per-sub-brand publish control.**
  - The spec keeps it as future room (Y-08 L47).
  - PO confirmed one shared flag (D18), so there is no UI to test.

---

## Unit Table

| #   | Unit                     | Screen(s)                                                                                                                                                                                     | Route                                       | TC Doc Filename                                                |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| 1   | Y-08-A List              | エクササイズ一覧（検索・詳細フィルター・結果バナー・空状態・ソート・ページング・行メニュー（編集／公開・非公開／削除）・非公開確認Dialog・削除Dialog・CSV出力・参照マスタ管理／新規登録導線） | `/exercises`                                | `TC -【Fitness CRM】- [Y-08-A][Exercise List].md`              |
| 2   | Y-08-B Detail            | エクササイズ詳細（基本情報／解説ステップ／関連情報タブ、ステータスカード＋公開・非公開確認Dialog、写真ギャラリー、紐づけ機材、タグ、関連エクササイズ、削除Dialog）                            | `/exercises/[id]`                           | `TC -【Fitness CRM】- [Y-08-B][Exercise Detail].md`            |
| 3   | Y-08-C Form              | エクササイズ 登録／編集（create + edit、3タブ、英語名・英語解説ステップの翻訳／再翻訳、公開スイッチ、機材解除Dialog、種別不一致Dialog、再翻訳上書きDialog、変更破棄Dialog）                   | `/exercises/create`, `/exercises/[id]/edit` | `TC -【Fitness CRM】- [Y-08-C][Exercise Form].md`              |
| 4   | Y-08-D Reference Masters | 参照マスタ管理（6タブ: カテゴリ／筋肉部位／器具種別／エクササイズタイプ／タグ／用語解説、検索、登録・編集Dialog、削除Dialog、参照中ブロック）                                                 | `/exercise-master`                          | `TC -【Fitness CRM】- [Y-08-D][Exercise Reference Masters].md` |

All four docs live under `specs/032-exercise-management/tests/cases/`.

**Split rationale**: one screen per unit. There are four routes, so there are four units.

- **Create and edit share one form component.** The mode delta is small:
  - read-only エクササイズコード;
  - prefilled values;
  - EN states loaded from the server;
  - the submit label.

  So they cluster into one doc with mode-tagged cases, as in the E-03 and sibling plans.

- **FR-014 (translation) stays inside the Form unit.** It is the unit's heaviest area, but every state it has (badge, 翻訳中, failure, confirm dialog) lives inside that form.
- **The six reference-master tabs share one table, dialog and delete flow.**
  - They form one unit with a per-tab matrix for the parts that differ: code rule, name label, required 説明, client-side search.
  - Writing six docs would repeat the same walk six times.
- **The unpublish and delete dialogs on the list** appear only inside `/exercises`, so they cluster into the List unit.

---

## Sources per Unit

`Y-08.md` is the first-priority source and the prototype the second (see **Spec-vs-Prototype Deltas**).

| Unit                     | Y-08 spec sections                                                                                                                                                                                                    | UI prototype file                   | FRs covered                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Y-08-A List              | FR-001, FR-002, FR-006, FR-007 (one-click toggle), FR-016; 制限事項 (published / routine-linked delete); 権限マトリクス                                                                                               | `exercise-list.tsx`                 | FR-001, FR-002, FR-006, FR-007, FR-016                                 |
| Y-08-B Detail            | FR-004, FR-006, FR-007, FR-008 (補足: display), FR-009 / FR-014 (display), FR-010 (display), FR-012 (preview), FR-013 (display + navigation); 補足 UI方針; 権限マトリクス                                             | `exercise-detail.tsx`               | FR-004, FR-006, FR-007, FR-008, FR-009, FR-010, FR-012, FR-013, FR-014 |
| Y-08-C Form              | 基本フロー; FR-003, FR-005, FR-007 (form switch + warning), FR-008, FR-009, FR-010, FR-012, FR-013, FR-014 (whole section incl. 異常系); 制限事項 (auto code); 補足 UI方針 (5 images, any URL, 4 両手使用区分 values) | `exercise-form.tsx`                 | FR-003, FR-005, FR-007, FR-008, FR-009, FR-010, FR-012, FR-013, FR-014 |
| Y-08-D Reference Masters | FR-011, FR-015, FR-017; 機能の定義 (参照マスタ = six tables); 前提条件; 権限マトリクス (参照マスタ管理)                                                                                                               | `exercise-master.tsx` (4 tabs only) | FR-011, FR-015, FR-017                                                 |

**Cross-references (read for every unit)**:

- **Y-08 権限マトリクス** is the authority on gating. It is a plain split: **System and Headquarter can do every action; Manager, Staff, Trainer and Observer have no access at all**. That covers 参照・検索 too, so these roles cannot even view the screens. Each unit checks:
  - the HQ/System happy path;
  - at least one denied role on **direct URL access**, not only the hidden button.
- **`integration-plan.md` → Decisions D5–D23** explain _why_ a Round 1 screen looks the way it does. Use them to tell a known gap from a defect, never as the expected result. Most relevant:
  - D7 (delete gating by code);
  - D8 (publish warning);
  - D9 (form 公開 switch);
  - D18 (one publish flag);
  - D19 (sorting);
  - D20 (CSV);
  - D21 (タグ / 用語解説 tabs);
  - D22 (EN texts);
  - D23 (code rules).
- **Length limits follow the BE** (D17). Checks are on the schema error message; there is no input `maxLength`:

  | Field                   | Max length |
  | ----------------------- | ---------- |
  | Exercise name JP / EN   | 200        |
  | Steps JP / EN, overview | 4000       |
  | Master `code`           | 64         |
  | Master `name` / 用語    | 200        |
  | Master `description`    | 2000       |
  | Keyword                 | 100        |

  The prototype's step `maxLength={1000}` is superseded; see Deltas.

---

## Spec-vs-Prototype Deltas

`gen-testcases` must put each row below into the affected case's **Notes**. "Spec-only" means the spec defines it but no prototype control exists. "Conflict" means the two disagree, and the spec wins.

| #   | Item                                            | In spec (Y-08)                                                                                                                   | In prototype                                                                                                          | How to test                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CSV export (FR-016, Could)                      | 「エクササイズデータのCSVエクスポート」 (no columns defined)                                                                     | **None**                                                                                                              | **Spec-only.** Test the 「CSV出力」 button (D20): placement and copy follow the training-equipment list. It exports the current filters without paging. Japanese must open in Excel without mojibake. Column content → B19.                                                                                                                                                                                                                                                |
| 2   | タグ / 用語解説 masters (FR-015, FR-017, Could) | 参照マスタ includes タグ and 用語解説 (機能の定義); FR-015 タグカテゴリ管理 (`mst_tag`); FR-017 用語解説管理 (`mst_explanation`) | Only 4 tabs (カテゴリ / 筋肉部位 / 器具種別 / エクササイズタイプ)                                                     | **Spec-only.** Test the two extra tabs (D21) with the same table, dialog and delete walk as the other four. Specifics: the 用語解説 name label is **用語** and 説明 is **required**.                                                                                                                                                                                                                                                                                       |
| 3   | Tag grouping by category                        | FR-010: list **all** tags with ON/OFF (no grouping). FR-015 name says タグ**カテゴリ** but defines no field                      | Tags grouped under category headings (グリップ / 向き / 幅 / 重心位置) in form and detail                             | **Conflict / pending PO (R302, B18).** Write cases to FR-010: every tag in the master is listed and ON/OFF works. Grouping is not authored until PO decides; a flat list is **not** NG.                                                                                                                                                                                                                                                                                    |
| 4   | Routine-linked delete message                   | FR-006: 「使用中のため削除できません」                                                                                           | Lists the routine names using the exercise, plus 「削除するには、先に各ルーティンからエクササイズを外してください。」 | **Conflict.** Expected = the spec message. The API gives no routine names (409 `E-EXM-003`). If the names list is absent, that is **not** NG.                                                                                                                                                                                                                                                                                                                              |
| 5   | Empty list message                              | FR-001: 「登録されたエクササイズはありません」                                                                                   | Shared `EmptyState` (entity label エクササイズ); filtered variant with 条件をクリア                                   | Spec text wins for the true-empty state; use the prototype for the filtered-empty variant. The true-empty state cannot occur on shared dev data (71 seeded rows), so the case uses a filter that returns 0 and marks true-empty as **Not run (no data)**.                                                                                                                                                                                                                  |
| 6   | Sortable columns                                | FR-001: default sort 最終更新日 desc only                                                                                        | エクササイズ名 / ステータス / 最終更新日 sortable; other columns not                                                  | **PO decision (D19):** default as spec, sortable columns as prototype. Test all three sortable headers, plus the absence of sorting on カテゴリ / 主働筋 / 器具種別 / レベル. Actual ordering → B5.                                                                                                                                                                                                                                                                        |
| 7   | Unpublish confirmation (list)                   | FR-007: status change is a one-click operation independent of edit                                                               | 公開にする = immediate; 非公開にする opens 「非公開にしますか？」 confirm                                             | Follow the prototype (one click to publish, confirm to unpublish). It is consistent with the spec's "independent of edit".                                                                                                                                                                                                                                                                                                                                                 |
| 8   | Incomplete-step warning on publish              | FR-007: 非公開→公開 with any of steps 0–4 empty → warning, save allowed                                                          | Detail: warning inside the publish confirm; Form: tab dot + steps-tab alert while the switch is 公開; List: none      | Test the warning at **every** publish entry: list menu, detail card, form switch. Expected = a warning is shown and the publish still succeeds. On the list the prototype shows nothing, so the spec governs. **Bug No.7 (2026-11-12):** list and form now both show the shared confirm dialog 「エクササイズを公開しますか？」 with the warning _before_ publishing (form: the switch flips only on 公開する; キャンセル changes nothing); no post-publish warning toast. |
| 9   | 協働筋 cardinality                              | 「任意設定」, cardinality not defined                                                                                            | Multi-select ToggleGroup                                                                                              | **PO confirmed multiple (2026-10-13).** Test multi-select and that all selected muscles persist → B6.                                                                                                                                                                                                                                                                                                                                                                      |
| 10  | レベル                                          | ビギナー / エキスパート, required                                                                                                | Same                                                                                                                  | Test to the spec (required in the form, shown on list, detail and filter). Persistence and display → B3 / B8.                                                                                                                                                                                                                                                                                                                                                              |
| 11  | Step text length                                | Not stated                                                                                                                       | `maxLength={1000}` on JP and EN textareas                                                                             | **Conflict with the BE limit**, and the project rule is that the BE wins (D17): 4000 chars, as a schema error with no hard cap. 1001–4000 chars must be accepted.                                                                                                                                                                                                                                                                                                          |
| 12  | Master code format                              | Not stated                                                                                                                       | Placeholder 「英数字・アンダースコア（例: chest）」, seeded codes with `_`                                            | **PO decision (D23): follow the BE.** See the per-tab rules in Y-08-D's focus. `_` is rejected for camelCase tabs, even though the prototype hint suggests it is allowed.                                                                                                                                                                                                                                                                                                  |
| 13  | Tool-mismatch confirm on save                   | Not in Y-08 (comes from E-03 L237, two-way link)                                                                                 | 「器具種別が一致しない機材があります」 dialog with 戻って修正する / このまま保存する                                  | **Prototype-only, E-03-derived.** Test it per the prototype; note the E-03 source.                                                                                                                                                                                                                                                                                                                                                                                         |
| 14  | Unsaved-changes dialog                          | Not in Y-08                                                                                                                      | 「変更を破棄しますか？」 on leaving a dirty form                                                                      | Project convention; test it per the prototype.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 15  | Image constraints                               | 補足: max **5** thumbnails                                                                                                       | 5-image cap; 「JPG・PNG / 最大5MB」                                                                                   | The 5 cap comes from the spec. The file type and size limits come from the prototype; note them as prototype-sourced.                                                                                                                                                                                                                                                                                                                                                      |
| 16  | 更新者 on detail                                | FR-005: record last-updated time **and updater** on save                                                                         | Detail shows 最終更新日 and 更新者                                                                                    | Test that both change after an edit by a different account (HQ, then System).                                                                                                                                                                                                                                                                                                                                                                                              |

---

## Coverage Focus per Unit

These are added to `gen-testcases`' full coverage walk (field validation, loading, empty and error states, GUI checklist); they do not replace it. Every unit also gets the **common real-API block** at the end of this section.

### Y-08-A List

- **Columns and header count** (FR-001):
  - Columns: エクササイズ名 (JP) with code below, カテゴリ, 主働筋, 器具種別, レベル, ステータス, 最終更新日.
  - The header count is the **unfiltered** total from the API (`pagination.totalItems`). It must not change while filters are applied.
  - 器具種別 and レベル cells → B2 / B3.
  - Seeded rows with legacy カテゴリ / 主働筋 strings → B16. Rows created by this run must show master **names**.
- **Default order and sorting** (FR-001, D19):
  - On first load, the 最終更新日 header shows the desc indicator.
  - Clicking a header toggles asc/desc, resets to page 1, and survives a reload (the state is in the URL).
  - The four non-sortable headers have no affordance.
  - Whether rows actually reorder → B5. Write those cases to the spec; they record `Block (B5)` until fixed.
- **Keyword** (FR-002):
  - Partial match on the **JP name and the EN name**. Create a test exercise whose EN name is unique to prove the EN side.
  - The keyword is AND-combined with filters.
  - Test 100 chars, 101 chars, and full-width input.
- **Filters** (FR-002):
  - Five single selects inside the collapsible 詳細フィルター panel. The button shows an active-count badge, and an active select is highlighted.
  - Filters combine with AND, and each change resets to page 1.
  - The banner shows 「全 N 件中 M 件」 plus a condition summary in the prototype wording (`カテゴリ: 胸、…`). 条件をクリア resets everything, keyword included.
  - Options come from the masters, not hard-coded lists:
    - categories and muscles are active masters in `sortOrder`;
    - the 器具種別 options include なし（自重）.
  - 器具種別 and レベル filtering → B4.
  - The 非公開 filter on seeded rows → B17. Prove it on rows this run created.
- **Pagination**:
  - Page sizes 25 / 50 / 100.
  - Footer 「全 N 件 / P ページ / a-b を表示」.
  - Page links with an ellipsis.
  - A filter change while on a high page lands on a valid page.
- **Row menu** (FR-007, FR-006):
  - 編集 goes to the edit form.
  - 公開にする / 非公開にする are shown according to the current status. 公開にする is one click when steps 0–4 are all filled; with an empty step it opens the 「エクササイズを公開しますか？」 confirm with the warning (Bug No.7). 非公開にする opens a confirm. Cancel on either confirm changes nothing.
  - Success toasts: 「「<name>」を公開にしました」 / 「…を非公開にしました」.
  - Delete branches:
    - 公開 → blocked 「公開中のため削除できません。先に非公開に変更してください」 with only 閉じる;
    - routine-linked → blocked 「使用中のため削除できません」 (Delta 4);
    - otherwise → confirm, then the row disappears and the count decrements.
  - The **409 path** must also be covered: a row that turned 公開 in another tab since the list loaded must still be blocked server-side (`E-EXM-002`), not deleted.
- **CSV出力** (FR-016, D20):
  - The download contains **all** rows matching the current keyword and filters, not just the current page. Prove it with a filter whose result is larger than the page size.
  - Japanese opens correctly in Excel (UTF-8 BOM).
  - The filename comes from the server.
  - A success toast is shown.
  - Column content (names vs codes, レベル) → B19.

### Y-08-B Detail

- **Header**:
  - JP name as the title, the exercise code as the subtitle, and a status badge.
  - 「エクササイズ管理に戻る」 returns to the list **with the list's filters, page and sort intact**.
- **基本情報 tab** (FR-004):
  - Every field is shown:
    - EN name;
    - カテゴリ;
    - 主働筋;
    - 協働筋 as chips;
    - 器具種別;
    - エクササイズタイプ;
    - 両手使用区分 (four values incl. 片足);
    - レベル;
    - 休憩時間 「<n>秒」;
    - ステータス;
    - 最終更新日 and 更新者 (Delta 16).
  - Multiple 協働筋 → B6. レベル → B8.
- **Status card** (FR-007):
  - The button label follows the status. The confirm title and text match the prototype.
  - Publishing with any step 0–4 empty shows the warning but still publishes (Delta 8).
  - The badge, card and list all update.
  - Unpublish uses the destructive style.
- **Media** (FR-012):
  - The gallery handles 0, 1 and 5 images: prev/next, a 「n / N」 counter, and a thumbnail strip.
  - 0 images → 「写真未登録」.
  - Stored images not rendering → B11. The fallback 「画像を表示できません」 must appear instead of a broken icon.
  - 動画URL opens in a new tab.
- **紐づけ機材** (FR-008):
  - Lists the linked E-03 equipment names. Clicking a row opens `/training-equipment/[id]`.
  - An exercise with no links, or with tool = なし（自重）, shows an empty or none state, not an error.
- **解説ステップ tab** (FR-009, FR-014):
  - Steps 0–4 with fixed labels. An empty JP step shows 「未入力」; an empty EN step shows 「—」.
  - Long text wraps.
- **関連情報 tab** (FR-010, FR-013):
  - タグ設定 shows ON tags as outline and OFF tags as muted. All master tags are listed (Delta 3).
  - 関連エクササイズ: up to 3 rows with name, カテゴリ and レベル. Clicking a row opens that exercise's detail.
  - A related exercise that was later deleted must not break the tab.
- **削除**: the same three branches as the list (published / routine-linked / OK). After a successful delete, the page returns to the list and the row is gone.
- **Deleted or unknown id**: `/exercises/<deleted-or-random-uuid>` shows a not-found or error state, not a crash or blank page.

### Y-08-C Form

- **Required fields** (FR-003):
  - エクササイズ名（日本語）, カテゴリ, 主働筋, 器具種別, エクササイズタイプ, 両手使用区分, レベル.
  - Each blank required field shows its inline message **with the exact label**.
  - The footer shows 「未入力の項目があります」, and the page scrolls to the first invalid field **even when it is on another tab**.
- **Optional fields and defaults**:
  - 協働筋 (multi);
  - 休憩時間, default **90** in create; check 0, negative, decimal and very large values;
  - 関連エクササイズ (≤3);
  - images (≤5);
  - 動画URL. Any URL is accepted (補足), including non-YouTube URLs and a very long URL.
- **エクササイズコード** (制限事項):
  - Create shows 「保存後に自動採番されます」 and edit shows the code, both read-only.
  - After create, the detail shows a new `EX-nnnnn` code.
- **Create flow**:
  - Saving lands on the detail page. The toast reads 「エクササイズを登録しました」.
  - With the switch off, the status is **非公開** (FR-003).
  - With the switch on (公開), the record is saved and then published (D9). The list shows 公開.
- **Edit flow** (FR-005):
  - All fields are prefilled.
  - Saving persists every changed field after a **reload**.
  - 最終更新日 and 更新者 change.
  - The 公開 switch is applied only if it was changed.
  - Toast 「エクササイズの変更を保存しました」.
- **器具種別 → なし（自重）** (FR-008):
  - With ≥1 linked machine, the 「紐づけ機材を解除しますか？」 confirm appears with the count.
    - Confirm clears the links and sets the tool.
    - Cancel keeps both the tool and the links.
  - With 0 links, no dialog appears.
- **機材紐づけ** (FR-008):
  - Candidates come from E-03 for the selected tool type, with **server-side** name search.
  - **Infinite scroll (user decision 2026-10-13):** 20 per page, the next page loads at the end of the list, until every equipment of the type is listed; a failed page offers 「再読み込み」 without looping.
  - Selected items stay pinned at the top while searching, **by name even when they sit on a page not yet loaded** (also on edit load and on the detail page).
  - Mismatching tool types get a 種別不一致 badge and trigger the save-time confirm (Delta 13).
  - Linking persists and shows on the detail page.
- **タグ** (FR-010):
  - Every master tag has a switch, and ON/OFF persists after a reload → B15.
- **関連エクササイズ** (FR-013):
  - Server-side name search.
  - **Infinite scroll (user decision 2026-10-13):** 20 per page, search results page too.
  - The editing exercise itself is **never** a candidate (self-reference).
  - The placeholder shows the remaining count; at 3 the hint 「最大3件まで登録できます」 appears.
  - Removing one re-enables selection.
  - A self or more-than-3 combination forced through the API gives `E-EXM-005` as a field error.
- **解説ステップ** (FR-009):
  - Exactly 5 fixed steps.
  - Turning the 公開 switch on with an empty step first opens the 「エクササイズを公開しますか？」 confirm (キャンセル keeps 非公開; Bug No.7). After 公開する it shows the tab dot and the alert 「解説ステップが未入力です」, and saving is allowed (FR-007).
  - Step text over 1000 chars is accepted up to 4000 (Delta 11).
- **FR-014 English texts.** This is the highest-value area. Each bullet is one state on the EN name **and** on at least one step.
  - **Always editable**:
    - EN inputs are plain editable fields (never read-only), with placeholder 「保存時に自動生成されます」.
    - The name help text switches between 「保存時に英語名が自動生成されます」 and 「自動生成された英語名です。必要に応じて上書きできます。」.
  - **Hand-written EN persists**: type EN, save, reload, and the EN is unchanged. **No** 要再翻訳 badge appears for a field just hand-edited.
  - **要再翻訳 badge**:
    - After loading a record, edit the JP of a field that has EN. The badge and 「再翻訳する」 appear next to that field only.
    - Saving is **not** blocked, and the EN is **not** overwritten by the save.
  - **Re-translate, unedited EN** (no confirm, overwrite):
    - Success path → B9.
    - Today the failure state appears: 「英語版を生成できませんでした。日本語のみで保存できます。」 plus a 再翻訳 button, with the EN kept.
  - **Re-translate, hand-edited EN**:
    - Opens 「再翻訳で上書きしますか？」 with the prototype text.
    - **Cancel** (button, Esc and outside click): the badge disappears and the EN is kept.
    - **上書きして再翻訳する** runs the translation; the success path → B9.
  - **Save-time translation**: on save, only fields with **JP filled and EN empty** are translated.
    - While translating, the save button shows 「翻訳中...」, and save and cancel are disabled.
    - Success path → B9.
    - **Failure path (testable now)**: the record is saved JP-only, with a warning toast 「英語の自動翻訳に失敗しました」 / 「日本語の内容で保存されています。編集画面の「再翻訳」から再実行できます。」 plus the save toast.
    - In Round 1 **every** save with an empty EN field takes this path. That is expected (B9), not NG.
  - **States are exclusive**: badge, 翻訳中 and failure never show at the same time on one field.
  - **Clearing EN**: empty an EN field and save. It saves as empty (null) and does not resurrect.
  - **Scope**: overview and master names have no EN translation UI (FR-014 対象範囲).
- **Unsaved changes**:
  - A dirty form asks 「変更を破棄しますか？」 on キャンセル or 戻る (編集を続ける / 破棄する).
  - A clean form leaves without asking.
  - No prompt appears after a successful save.
- **Images** (FR-012):
  - Upload JPG and PNG. A 6th image is not possible.
  - Reject a non-image file and a file over 5MB with a message.
  - Remove an image.
  - New uploads preview locally. Stored images on reopen → B11.

- **No list cut at 100** (user decision 2026-10-13): master options (selects, 協働筋, タグ) load every API page. Observable today only as the request pattern; a >100-row check needs 101 own masters, otherwise Not run (data).

### Y-08-D Reference Masters

- **Tabs**:
  - Six tabs in spec order: カテゴリ / 筋肉部位 / 器具種別 / エクササイズタイプ / タグ / 用語解説. Each has a count badge.
  - Each tab keeps its own search text.
  - The header button reads 「<tab>を登録」 and opens the create dialog for **the active tab**.
- **Table**:
  - Columns: ID, コード, 名称 (用語 on 用語解説), 説明 (truncated), 順, 参照数, ステータス 有効/無効, 更新日.
  - The search placeholder follows the tab.
  - Search is server-side **keyword**, except for 器具種別, which filters client-side. Both must match name and code.
  - The banner shows the result count, and 条件をクリア clears it.
  - Filtered-empty shows 条件をクリア. True-empty shows 「<tab>を登録」 (用語解説 starts empty: 0 rows).
- **Create dialog**: title 「<tab>を新規登録」, fields コード* / 名称* / 説明 / 表示順\*.

  | Tab                                      | Code rule (D23)                | Message example  | Other                             |
  | ---------------------------------------- | ------------------------------ | ---------------- | --------------------------------- |
  | カテゴリ / 筋肉部位 / エクササイズタイプ | `^[a-z][a-zA-Z0-9.]*$`         | `lowerBody`      | —                                 |
  | タグ                                     | same                           | `gripWidth.wide` | —                                 |
  | 器具種別                                 | `^[a-z][a-zA-Z0-9]*$` (no dot) | `barbell`        | —                                 |
  | 用語解説                                 | `^[A-Z][A-Z0-9_]*$`            | `ROM`            | label **用語**, 説明 **required** |
  - Boundaries:
    - code 64 / 65 chars;
    - name 200 / 201;
    - description 2000 / 2001;
    - 表示順 0, 1, decimal, blank.
  - Each tab gets: a valid code, a code with `_` (rejected except on 用語解説), a code with uppercase first, and full-width characters.
  - A duplicate code returns 409 `E-EXM-008` as a **field error on コード**, not a generic toast.

- **Edit dialog**:
  - Title 「<tab>を編集」. コード is shown read-only.
  - Name, description and order persist after a reload.
- **Delete**:
  - Confirm 「<tab>を削除しますか？」 with the logical-delete text.
  - A row with 参照数 > 0 has 削除 disabled, with the tooltip 「エクササイズから参照中のため削除できません（n件使用中）」.
  - A master that became referenced after the page loaded is blocked server-side (409 `E-EXM-009`, shown as a message).
  - Proving the reference count means creating a test master, using it on a test exercise, and checking 参照数 becomes 1.
- **Downstream reflection**:
  - A master created here appears as an option in the form and list filters.
  - A deleted or inactive one disappears from the form options but still displays on existing exercises.
  - For 器具種別, the new row also exists for E-03, because the table is shared.

### Common real-API block (all four units)

- **Server-side validation beyond the client.** Force over-limit or invalid values that the client would block, by editing the request in DevTools or by direct API calls in the `execute-testcases` helper.
  - The server must reject them with `E-VAL-001`, and the UI must show one error toast.
  - Duplicate code (`E-EXM-008`), in-use master (`E-EXM-009`), published delete (`E-EXM-002`) and routine-linked delete (`E-EXM-003`) must each show their dedicated message, never a raw code.
- **Single error toast.** No failure shows two toasts.
- **401 expiry.** Expire or clear the session tokens mid-session, then trigger a list load, a save and a delete. Expected: one redirect to login, no stuck spinner, no partial save.
- **403 / role gating.** Sign in as Manager, Staff, Trainer and Observer.
  - The menu entry is absent, and **direct URLs** (`/exercises`, `/exercises/<id>`, `/exercises/create`, `/exercises/<id>/edit`, `/exercise-master`) are denied.
  - The API still answering Manager with 200 → B14. That half of the case records `Block (B14)`; the UI half is tested now.
- **Persistence.** Every write is verified after a **reload and after re-login as a different HQ-level account** (System), not only by the toast.
- **Real totals.** Counts (list header, banner, tab badges, pagination) match the API totals, not the page length.
- **Two-tab conflict.** Edit or delete the same record in two tabs. The second action gets a clear error or the latest state, with no silent overwrite of a deleted record.
- **UI breakage under stress, at 1024×768 and at ≥1440px.**
  - Values to check:
    - name of 200 full-width JP chars;
    - an unbroken 200-char ASCII token;
    - EN name of 200 chars;
    - step of 4000 chars;
    - master name of 200 chars and code of 64 chars;
    - description of 2000 chars;
    - 用語 of 200 chars.
  - Where to check them:
    - list name cell;
    - detail title and breadcrumb area;
    - status card;
    - delete, unpublish and re-translate dialogs (the name is inside 「…」);
    - toasts;
    - related-exercise chips and the detail related table;
    - linked equipment rows;
    - the master table (説明 truncates);
    - master dialog titles;
    - the CSV.
  - Also check:
    - **many chips**: all 30 muscles as 協働筋, all tags ON, 3 related, 5 images;
    - the longest badges and labels: 「自重（補助）＆回数」, 「なし（自重）」, エクササイズタイプ;
    - no horizontal page scroll at 1024px and no overlap with the sticky right column on the detail page.

---

## Known Round 1 Gaps

Copied from `integration-plan.md` (Blockers carried into Round 2). By default the case is **written to the spec** and executes as **`Block (Bn)`**. Retest when the BE ships the fix (Round 2 backlog R2nn).

| Bn  | Blocker                                                                    | UI behaviour in Round 1                                                                                      | Test treatment                                                                                                                     |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Admin create DTO name clash in OpenAPI (typing only)                       | None. Create works.                                                                                          | No case impact. Create cases run normally.                                                                                         |
| B2  | List has no 器具種別                                                       | Column rendered, cell `—`                                                                                    | Case expects the tool name → `Block (B2)`.                                                                                         |
| B3  | List has no spec レベル                                                    | Column rendered, cell `—`                                                                                    | Case expects ビギナー/エキスパート → `Block (B3)`.                                                                                 |
| B4  | List API has no `toolId` / レベル params                                   | Both filters selectable and kept in the URL, but do not narrow the list                                      | Narrowing assertion → `Block (B4)`. Control presence, options and banner summary are tested now.                                   |
| B5  | List API has no `sort` / `order`                                           | Headers toggle and URL updates; rows stay in creation order                                                  | Row-order assertions → `Block (B5)`. Header affordance, indicator, URL and page reset are tested now.                              |
| B6  | Only one `secondaryMuscleId`                                               | Multi-select kept; only the **first** selected muscle persists                                               | "All selected 協働筋 persist and show" → `Block (B6)`.                                                                             |
| B8  | No explicit レベル field (create sends a fixed `isBeginnerVisible`)        | レベル required in the form, but not saved; detail and edit show it empty / `—`                              | Persistence and display of レベル → `Block (B8)`. The required-field validation is tested now.                                     |
| B9  | No machine-translation endpoint                                            | Every translate (save-time and 再翻訳) takes the **failure path**                                            | Success-path cases → `Block (B9)`. Failure-path, hand-edit, badge, confirm and persistence cases are tested now (**OK expected**). |
| B10 | Videos stored as `videoS3Key`; no URL field                                | URL round-trips unchanged (verified)                                                                         | No block; test normally. Retest on R209.                                                                                           |
| B11 | Stored images have no fetchable URL (asset path 401)                       | Detail gallery and form thumbnails show the 「画像を表示できません」 fallback; fresh uploads preview locally | "Stored image renders on detail and reopened form" → `Block (B11)`. Upload, cap, remove and fallback are tested now.               |
| B12 | Mobile APIs ignore publish state                                           | CRM publish works                                                                                            | Out of CRM scope; no CRM case blocks. Note on publish cases: "app-side visibility not verifiable (B12)".                           |
| B13 | Master `description` typed as object (typing only)                         | None                                                                                                         | No case impact.                                                                                                                    |
| B14 | Exercise APIs not role-guarded (Manager GET → 200)                         | UI gates screens and actions to System / HQ                                                                  | UI gating tested now. "Server rejects a non-HQ role (403)" → `Block (B14)`.                                                        |
| B15 | `enabledTagIds` → 500                                                      | Tag switches work, but changes are **not saved**                                                             | Tag ON/OFF persistence (form and detail) → `Block (B15)`.                                                                          |
| B16 | Seeded list rows carry legacy カテゴリ / 主働筋 strings                    | Legacy values render raw (`lower_body`)                                                                      | Run-created rows must show names (tested now). Raw strings on **seeded** rows → `Block (B16)`, not NG.                             |
| B17 | Seeded exercises have no brand link                                        | Seeded rows match neither 公開 nor 非公開 filter                                                             | Prove the status filter on run-created rows (tested now). Seeded rows missing under 非公開 → `Block (B17)`.                        |
| B18 | Tag master has no category                                                 | Flat tag list everywhere                                                                                     | Grouping not authored (Delta 3, pending PO / R302). Flat list is **not** NG.                                                       |
| B19 | CSV writes codes, BE `level`, no tool / spec レベル / status label, no BOM | FE adds the BOM; content as the BE writes it                                                                 | Download, filter scope, all rows and Excel-readable Japanese tested now. "Columns show names and spec fields" → `Block (B19)`.     |
| B20 | Seeded tag codes contain `_`                                               | Cannot be re-created via the API                                                                             | No case creates a code with `_` expecting success on a camelCase tab. Seeded tags are never edited. Note only.                     |

### Phase-1 scope (PO 2026-10-20)

Decided after the Round 2 BE check (`../BE_REQUEST.vi.md` § Đánh giá Round 2; `../integration-plan.md` D24–D27). These are **phase 2**, not defects: a case that needs them is `Block (phase 2)`, never NG.

| Item                                      | Phase 1 behaviour                                                                                                          | Test treatment                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tag CRUD (FR-015, BE_REQUEST No.7, R303)  | Tags are seed data. タグ tab lists and searches only: no 「タグを登録」, no ⋯ menu. Tag ON/OFF on an exercise is unchanged | Create / edit / delete of a tag, or a case that needs a run-created tag → `Block (phase 2)`. Read-only tab: D-TC-146               |
| Machine translation (FR-014, No.11, R304) | EN name / steps typed by hand, saved as typed. No save-time translation, 要再翻訳, 再翻訳, 翻訳中 or failure toast         | Translation cases → `Block (phase 2)`; copy without 「自動生成」 (placeholder 「英語で入力（任意）」, label 「英語版」 / 「英語」) |
| 器具種別 paging (No.17, R305, Q&A)        | Browser-side search over every row, one page, no pagination footer                                                         | D-TC-147                                                                                                                           |
| レベル (B8, D27)                          | `isBeginnerVisible` (true = ビギナー, false = エキスパート) — accepted for this phase                                      | B3 / B8 cases are re-tested in Round 2, not blocked                                                                                |

**Spec'd but previously not built**: S1 (FR-014 v2), S2 (FR-016) and S3 (FR-015 / FR-017) were all built in Round 1b, so they are in scope above. No other spec item is unbuilt.

---

## Traceability Map

| FR     | Requirement (short)                                                                  | Unit(s)                                                                       |
| ------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| FR-001 | List columns; default sort 最終更新日 desc; empty message                            | Y-08-A                                                                        |
| FR-002 | Keyword (JP/EN partial) + 5 single-select filters, AND                               | Y-08-A                                                                        |
| FR-003 | Create: required/optional fields, auto code, initial 非公開                          | Y-08-C                                                                        |
| FR-004 | Detail shows all sections                                                            | Y-08-B                                                                        |
| FR-005 | Edit all FR-003 fields; code immutable; records updated time + updater               | Y-08-C (edit) + Y-08-B (更新者 / 最終更新日 display)                          |
| FR-006 | Logical delete with confirm; blocked when 公開 or routine-linked                     | Y-08-A (row menu) + Y-08-B (header menu)                                      |
| FR-007 | 公開/非公開; incomplete-step warning on publish; one-click toggle                    | Y-08-A (row menu) + Y-08-B (status card) + Y-08-C (form switch + steps alert) |
| FR-008 | E-03 equipment link (multi); なし（自重） auto-release with confirm                  | Y-08-C (edit) + Y-08-B (display + navigation)                                 |
| FR-009 | Fixed 5 explanation steps, JP input                                                  | Y-08-C (input) + Y-08-B (display)                                             |
| FR-010 | Per-exercise tag ON/OFF from `mst_tag`                                               | Y-08-C (edit) + Y-08-B (display)                                              |
| FR-011 | Reference masters CRUD (4 tables); in-use code not deletable                         | Y-08-D                                                                        |
| FR-012 | Image / video upload + preview                                                       | Y-08-C (upload) + Y-08-B (preview)                                            |
| FR-013 | Related exercises ≤3, name search, no self-reference                                 | Y-08-C (edit) + Y-08-B (display + navigation)                                 |
| FR-014 | EN name + EN steps: save-time translation, editable, 要再翻訳, confirm, failure path | Y-08-C (all behaviour) + Y-08-B (EN display)                                  |
| FR-015 | タグ master management                                                               | Y-08-D (タグ tab)                                                             |
| FR-016 | CSV export                                                                           | Y-08-A                                                                        |
| FR-017 | 用語解説 master management                                                           | Y-08-D (用語解説 tab)                                                         |
| 権限   | System / HQ only for every operation                                                 | All four units                                                                |
| 補足   | 5 thumbnails, any video URL, 4 両手使用区分 values                                   | Y-08-C (+ Y-08-B display)                                                     |

Every FR-001…FR-017 lands in ≥1 unit, so no requirement is orphaned. Two items need calling out rather than plain coverage:

- **FR-015's タグ"カテゴリ"**: the spec names a category concept but defines no field, and the BE has none (B18). Cases cover tag CRUD only. Grouping waits for the PO (R302).
- **FR-001 true-empty message**: this cannot be produced on shared dev data without deleting seeded rows, which is forbidden. It is authored and recorded as **Not run (no data)**.

---

## Execution Notes (for execute-testcases)

### Credentials

Use the real Cognito accounts from `src/lib/auth/demo-users.ts`; the passwords are in that file.

| Role        | Account                         | Use                                                                                     |
| ----------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| Headquarter | `lodu4289+headquater@gmail.com` | **Default** for every case pre-condition "HQ".                                          |
| System      | `lodu4289+1@gmail.com`          | Second allowed role: 更新者 change (Delta 16), re-login persistence, System happy path. |
| Manager     | `lodu4289+manager@gmail.com`    | Denied role (UI) + B14 API check.                                                       |
| Staff       | `lodu4289+staff@gmail.com`      | Denied role.                                                                            |
| Trainer     | `lodu4289+trainer@gmail.com`    | Denied role.                                                                            |
| Observer    | `lodu4289+observer@gmail.com`   | Denied role.                                                                            |

- The header 「デモ: ユーザー切替」 switcher appears only when `NEXT_PUBLIC_APP_ENV=development`. Otherwise sign out and in.
- No case in this feature needs wrong-password attempts, so there is **no lockout risk**. If a login case is added later, run it last, on Trainer.

### Environment

- The app runs locally (`npm run dev`, `http://localhost:3000`) against the **real dev backend** from `NEXT_PUBLIC_REAL_API_URL` (`https://api.dev.fitness-v2.okamoto-hd.com`).
- The backend is **shared** with other developers and testers. Counts can change between steps, so assert relative to a fresh read, never a hard-coded total.
- **Round 2 re-test (2026-10-20 →):** the app runs on `http://localhost:3001` against the **local** backend (`fitness-backend-v2` `feat/anhnv/y08-exercise-api-gaps`), magic-link login with the `crm-*@crm-test.example.com` accounts — see `../../016-routine-management/LOCAL_API_LOGIN.vi.md`. Cases that need S3 images or the dev seed rows wait for the dev deploy (`../integration-plan.md` § Re-test plan).
- The BE may redeploy mid-run (502/503 were seen on 2026-10-12). When that happens, re-run the step; it is not NG unless it reproduces.

### Data policy

The user decided on 2026-10-13 that this feature's data can be created, edited and deleted freely, **as long as no pre-existing record is deleted or modified**.

- **Create your own records with a prefix:**

  | Record type             | Pattern                                      | Example              |
  | ----------------------- | -------------------------------------------- | -------------------- |
  | Exercises               | name `TC-EX-<yyMMddHHmm>-<n>`                | `TC-EX-2610131030-1` |
  | Masters, camelCase tabs | code `tcex<yyMMddHHmm><n>`                   | `tcex26101310301`    |
  | Masters, name           | `TC-EX-<…>`                                  | `TC-EX-2610131030-1` |
  | 用語解説                | code `TCEX_<yyMMddHHmm>_<n>`, 用語 `TC-EX-…` | `TCEX_2610131030_1`  |

- **Never edit or delete pre-existing records:**
  - the 71 seeded exercises;
  - the seeded masters: 12 categories, 30 muscles, 10 tool types (E-03 also uses them), 6 exercise types, 9 tags;
  - other people's records;
  - E-03 equipment.

  Read-only use is fine: open, search, filter, and use them as options and link targets. Linking an existing E-03 equipment item or an existing exercise as 関連 is allowed **from your own test exercise**, because that changes only your record.

- **Destructive cases get their own record.** Delete, unpublish, publish-then-delete-blocked, in-use master and two-tab conflict cases all act on records the run created, made in the case's pre-condition.
- **Routine-linked delete (FR-006, `E-EXM-003`)** needs a routine that references a test exercise.
  - If Y-09 allows creating a throw-away routine (`TC-EX-…`), create one, run the case, then delete the routine and then the exercise.
  - If not, record the case as **Not run (no routine fixture)**, with a note. Never attach a test exercise to an existing routine.
- **Cleanup at the end of the run:**
  - unpublish, then delete, every `TC-EX-` exercise;
  - delete every `tcex…` / `TCEX_…` master. Masters must be deleted after the exercises that reference them.
  - List anything left behind (e.g. blocked by a gap) in the run report.
- **No seed reset exists.** A mistake on a seeded record must be reported immediately, not silently fixed.

### Known-gap policy

- A failure that matches a `Bn` row above → **`Block (Bn)`**.
- A failure that matches a Delta row's documented behaviour → **OK**, with a note.
- Anything else → **`NG`**, with a request/response capture: URL, status, `code`, `userMessage`.
- A `Bn`-blocked case whose behaviour unexpectedly passes → **OK**, and flag it so the blocker can be closed.

### Viewport

- Layout and stress cases run at **1024×768**, the supported floor.
- The wide check runs at **≥1440px**.
- Below 1024px is out of scope.

### Evidence

- Network captures for every write and every blocked case.
- A screenshot for every UI-breakage case at both widths.
- The CSV file opened in Excel (or a hexdump showing the BOM) for FR-016.

---

## Suggested Order

1. **Y-08-D Reference Masters, create and edit parts.**
   - Read-only checks first, then create the test masters (one per tab).
   - These masters are needed later for the 参照数 and option-reflection checks.
   - Leave deletion for step 5.
2. **Y-08-C Form.**
   - Creates the test exercises that the other units read. Make at least:
     - one full record (all optional fields, 5 images, 3 related, linked equipment, multiple 協働筋, EN hand-written);
     - one minimal record;
     - one using a test master;
     - one stress record (max-length values).
   - Then run edit and the FR-014 states on these records.
3. **Y-08-B Detail.**
   - Reads the records from step 2.
   - Publish and unpublish from the status card.
   - Delete only throw-away records.
4. **Y-08-A List.**
   - Read-only first: columns, keyword (JP and EN), filters, sort, paging, CSV. Uses both seeded rows and step-2 rows.
   - Then the row-menu publish/unpublish and the delete branches on throw-away records.
5. **Y-08-D Reference Masters, destructive part.**
   - The in-use delete block uses the test master referenced in step 2.
   - Then delete the exercise and the now-unreferenced master.
6. **Role gating (all units)** with Manager, Staff, Trainer and Observer. These need no data and can run any time; they are listed last so account switching doesn't interrupt the data flow.
7. **Cleanup** per the Data policy.

---

## Definition of Done

- Four TC docs exist under `specs/032-exercise-management/tests/cases/` with the filenames in the Unit Table.
- Every FR-001…FR-017, plus 権限 and 補足, traces to ≥1 case. Every Delta row is reflected in the Notes of the affected cases.
- Every `Bn` row with a case impact has its cases written to the spec, tagged with the blocker id.
- Each doc's checklist gaps (from `gen-testcases`' self-check) are fixed before execution.
- Each doc is executed once against the dev API, with OK / NG / `Block (Bn)` / Not run recorded per case and evidence attached.
- All `TC-EX-` / `tcex…` / `TCEX_…` test data is cleaned up, or listed in the run report with the reason it remains.
- `Block (Bn)` cases are listed per blocker in the run summary, so they can be retested when the BE ships the Round 2 fix.
