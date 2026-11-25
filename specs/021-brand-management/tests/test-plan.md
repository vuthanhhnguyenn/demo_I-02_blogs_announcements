# Test Plan: Y-07 Brand Master Management (ブランド管理) — 021, Phase 2 (real API)

**Spec**: [../spec.md](../spec.md) · [../integration-plan.md](../integration-plan.md)
**PO Spec**: `Y-07` — ブランド管理（マスタ）, **260928_v3** (`.cache/fitness-spec/crm/requirements/Y-07.md`). The fee master rules come from the doc Y-07 cites for them: **`G-05.md`** (費用マスタ, FR-001/002/004/007/008, 権限マトリクス, 補足 運用方針, MOD-09)
**UI prototype**: `fitness-crm-ui` **9/30 デザイン更新** (`47423ec`): `src/pages/brand-list.tsx`, `src/pages/brand-detail.tsx`
**Created**: 2026-10-05
**Integration round**: **Round 2 (2026-10-05)**. Both routes run fully on the real API (`src/lib/api-real` → `NEXT_PUBLIC_REAL_API_URL`). Every Round 1 blocker B1–B5 is closed. Open items: G2, G3, B6/B7, D4 and D11 (see **Known Gaps**). The only live check so far was the Round 2 smoke test. **This plan is the first full test of the integration.**
**Supersedes**: the Phase 1 (mock) plan and its two TC docs, now in [`archive/phase1-mock/`](archive/phase1-mock/README.md). Do not reuse their cases. They were written to a spec and prototype that are no longer current.
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

> ⚠️ **Read this first. Every case in this plan edits real master data.** The backend has exactly **two
> brands (JOYFIT, FIT365). Both are real master records shared with other people. No case can create a
> throw-away brand.** Every write case must therefore **restore the value it changed, in the same
> case**, on the sandbox records named in **Execution Notes → Data policy**. That section binds every
> unit.

> ⚠️ **Source-precedence note.** `spec.md` dates from 2026-07-29, so it is older than Y-07 v3 and the 9/30
> prototype. Its FR numbering (FR-001…FR-015) is still used as the traceability key. **Where it
> conflicts with Y-07 v3 / G-05, the requirement docs win.** Each such row is in **Spec-vs-Prototype
> Deltas** and is marked "spec.md superseded".

---

## Scope

**In scope** (two routes, five units):

- **ブランド一覧** (`brand-list.tsx`, route `/brands`). The brand table (ブランドID, ブランド名), the header 件数 badge, the row ⋯ menu, and the **ブランド編集 Sheet** opened from the row 編集 menu.
- **ブランド詳細** (`brand-detail.tsx`, route `/brands/[brandGroup]`):
  - the header and back link
  - the access-denied state
  - the **基本情報** tab: 一般情報 card + 変更, and the その他情報 card
  - the **費用** tab: per-sub-brand fee cards with the 費用マスタ section, 有効/無効/未登録 states, the ⋯ menu, the 無効化 and 削除 confirmation dialogs, immediate 有効化, the CancelPolicyNote, and the 未登録 card with ［＋登録］
  - the **費用マスタ 登録/変更 Sheet**
  - the **変更履歴** tab: table + paging

**Out of scope** (no unit may expand into these):

- **ブランド新規登録** (R308). Y-07 says future brand additions are handled in Y-07/システム設定 later. The prototype has no create button. If the running app shows one, record it as an `NG` (a UI element no source defines). Do not test it.
- **サブブランド本体の無効化・削除・名称編集**. Y-07 v3 FR-001 excludes these explicitly. Confirm only that no such control exists. Every 無効化/削除 in this screen acts on the **費用マスタ**.
- **基本情報を編集 (B6)**: the maintenance cadence, `suspensionFee`, `reviewOverdueHours`, `minEnrollmentAge`. The API is ready but no UI was built, and the 9/30 prototype has no such editor. Test only that the FIT365 cadence caption is displayed.
- **ADD-09 入会金免除設定** (B7 ①②③). Not built, and Y-07 does not require it.
- **List ステータスフィルター / 有効無効 Badge** (R303, G-05 運用方針). A brand has no status (Y-07 v3, prototype 9/30).
- **G-01 主契約管理** (the downstream reader of these fee defaults), **Y-02 店舗管理**, and the brand chips shown on other screens. This plan checks the values saved and shown **here** only.
- **Scheduled-revision auto-cutover on the effective date**. This is a backend batch, not a user action. Test only that the caption 「（有効開始日当日に自動切替）」 is shown.
- **Login / session establishment** (specs 028/029). This plan only uses a signed-in session and tests how these screens react to a 401.

---

## Unit Table

| #   | Unit                   | Screen(s)                                                                                                                                              | Route                                                 | TC Doc Filename                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------- |
| 1   | ブランド一覧           | Brand table, 件数 badge, row ⋯ menu (編集), ブランド編集 Sheet (list entry point)                                                                      | `/brands`                                             | `TC -【Fitness CRM】- [Y-07][P2-01][ブランド一覧].md`           |
| 2   | ブランド詳細・基本情報 | Detail header + back link, tab bar + badges, role/access gating (incl. access-denied), 基本情報 tab (一般情報 + 変更 → ブランド編集 Sheet, その他情報) | `/brands/[brandGroup]` (基本情報 tab)                 | `TC -【Fitness CRM】- [Y-07][P2-02][ブランド詳細・基本情報].md` |
| 3   | 費用タブ               | Fee cards (registered / 無効 / 未登録), 費用マスタ ⋯ menu, 無効化 dialog, 削除 dialog, 有効化, ［＋登録］ entry, CancelPolicyNote                      | `/brands/[brandGroup]` (費用 tab)                     | `TC -【Fitness CRM】- [Y-07][P2-03][費用タブ].md`               |
| 4   | 費用マスタ登録・変更   | 費用マスタ Sheet in **変更** mode (現行設定 + 予約中の改定) and in **登録** mode                                                                       | `/brands/[brandGroup]` (費用 tab → 変更 / ［＋登録］) | `TC -【Fitness CRM】- [Y-07][P2-04][費用マスタ登録・変更].md`   |
| 5   | 変更履歴               | 変更履歴 tab: table, badge = total, paging                                                                                                             | `/brands/[brandGroup]` (変更履歴 tab)                 | `TC -【Fitness CRM】- [Y-07][P2-05][変更履歴].md`               |

All under `specs/021-brand-management/tests/cases/`. The `P2-nn` numbering follows the 020 phase-2 docs. It keeps the new docs apart from the archived `[Y-07][ブランド一覧/詳細]` pair.

**Split rationale**:

- **Unit 1 stands alone.** It is the index route. The ブランド編集 Sheet is clustered into it because it is a modal opened from a list row. Unit 2 re-tests the same Sheet only from its second entry point (一般情報 変更) and what that entry point refreshes (h1, その他情報). It does not repeat the full field walk.
- **The detail route is split by tab, not kept as one unit.** The Phase 1 single detail doc reached 118K, and on the real API the three tabs differ in every way a tester touches:
  - each tab has its own endpoint (`GET /brands/{g}`, `GET …/sub-brands/{e}` ×N, `GET …/history`)
  - each tab has its own role rule (Staff sees 基本情報 only)
  - each tab has its own write surface: rename (基本情報); status / delete / register (費用); none (変更履歴)
- **Unit 3 vs Unit 4: the fee Sheet is split from its parent tab** although it is a modal inside it. It is the only form with nested, growing rows (予約中の改定 ×≤20 per item), two modes with different bodies (`PATCH …/fees` vs `POST …/fee-master`), and four BE date rules. Clustering it into Unit 3 would bury the card-lifecycle cases (無効化/有効化/削除/未登録) under validation cases. The dialogs stay in Unit 3 because they are one-click confirmations of card actions.
- **Unit 5 is last and separate** because it **reads what Units 1–4 write**. Every write case in Units 1–4 has its history row checked here, in one sweep, against a write log those units record (see Data policy → Write log).

---

## Sources per Unit

| Unit                       | Spec sections                                                                                                                                                                                                                                                                | UI prototype file (9/30, `47423ec`)                                                                                                                                                                                      | FRs covered                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — ブランド一覧           | Y-07 v3 FR-001 (表示項目, 編集可能な項目, 本部のみ編集), 制限事項, 権限マトリクス; spec.md US1 AS1–AS2, US3 (all), Edge "zero-match search"                                                                                                                                  | `brand-list.tsx` (whole file: `BrandList`, `BrandEditSheet`, `BrandEditSheetBody`)                                                                                                                                       | spec.md FR-001, FR-002 (Δ1), FR-003 (navigation), FR-005, FR-012 (rename gating), FR-015; Y-07 FR-001, 権限マトリクス                  |
| 2 — ブランド詳細・基本情報 | Y-07 v3 FR-001, 権限マトリクス + データスコープ; G-05 権限マトリクス (Staff ×); spec.md US1 AS3–AS4, US3 AS1–AS2, SC-003, SC-004                                                                                                                                             | `brand-detail.tsx`: `BrandDetail` header, `canViewBrandDetail` branch, `TabsList`, 基本情報 `TabsContent` (一般情報 + その他情報), `BrandEditSheet` mount                                                                | spec.md FR-003 (tabs + badges), FR-004, FR-005, FR-012; Y-07 FR-001, 権限マトリクス                                                    |
| 3 — 費用タブ               | Y-07 v3 FR-001 (サブブランド本体の扱い, 費用マスタの無効化・物理削除, ［＋登録］), FR-002 (サブブランド単位カード, JOYFIT/FIT365 項目); G-05 FR-001 (項目表), 補足 運用方針, MOD-09; spec.md US4 AS1–AS3, Edge "FIT365 vs JOYFIT", SC-003                                    | `brand-detail.tsx`: `FEE_SLOTS`, `FeeCard` (incl. both `AlertDialog`s), `UnregisteredFeeCard`, `CancelPolicyNote`, `handleDisable` / `handleEnable` / `handleDelete`, 費用 `TabsContent`                                 | spec.md FR-006, FR-011, FR-012 (fee gating), FR-014 (superseded → Δ5); Y-07 FR-001 (費用マスタ lifecycle), FR-002; G-05 FR-001, MOD-09 |
| 4 — 費用マスタ登録・変更   | Y-07 v3 FR-002 (税込, 異常系 0以上の整数); G-05 FR-001 異常系, FR-002 (0円可, 過去日警告, 負値・小数不可), FR-007 (プレビュー), FR-008 (改定スケジュール); spec.md US2 (all 6 AS), Edge "fee amount 0", SC-002, SC-005; integration-plan R2-D3/D4/D5 (BE rules, see Δ11–Δ12) | `brand-detail.tsx`: `FeeItemSection`, `RevisionRow`, `parseFeeAmount`, `feeAmountError`, `validateFeeEdit`, `validateRevisions`, `handleOpenFeeEdit`, `handleOpenFeeRegister`, `handleSaveFeeEdit`, the 費用編集 `Sheet` | spec.md FR-007, FR-008, FR-009, FR-010, FR-012 (Save gating); Y-07 FR-002; G-05 FR-002, FR-007, FR-008                                 |
| 5 — 変更履歴               | G-05 FR-004 (記録項目, 削除・修正不可, 時系列); spec.md US4 AS4                                                                                                                                                                                                              | `brand-detail.tsx`: `CHANGE_HISTORY` shape, 変更履歴 `TabsContent`                                                                                                                                                       | spec.md FR-013, FR-003 (history badge); G-05 FR-004                                                                                    |

**Cross-reference for every unit**: the **Y-07 権限マトリクス** (参照 ○○○○××, 編集 ○○×××× for System/HQ/Manager/Staff/Trainer/Observer) and the **G-05 権限マトリクス** (費用マスタ閲覧・変更履歴参照: Staff ×) are the role oracles. Validate gating against these tables, not against the FR wording alone. Where they disagree, see **Δ7**.

---

## Spec-vs-Prototype Deltas

`gen-testcases` must put the **Δ id** in the Notes of every case it writes for a row below. "Spec" here means Y-07 v3 / G-05, plus `spec.md` where it is not superseded.

| Δ       | Item                                                                          | In spec                                                                                                                                                                                                      | In prototype (9/30)                                                                                                                                                  | How to test                                                                                                                                                                                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Δ1**  | List keyword search, `FilterResultBanner`, pagination footer, 表示件数 select | spec.md FR-002 (search + clearable banner + filtered empty state); Y-07 v3 is silent                                                                                                                         | Present (search over name + ID, 「条件をクリア」, 25/50/100)                                                                                                         | **Conflict with the shipped app**: removed on the user's call, **D4**. Write the cases to the prototype + spec.md FR-002. The result is `Block (D4)` while the controls are absent. The "no search → both rows" and 件数 badge cases still run normally.                                                                                            |
| **Δ2**  | ブランドID value and route key                                                | Y-07: ブランドID is the immutable internal key; nothing says which casing                                                                                                                                    | `joyfit` / `fit365` (lowercase), route `brand-detail?id=joyfit`                                                                                                      | Real API key is `JOYFIT` / `FIT365` (**D3**). Expected result: the same ID string in the list cell, the 一般情報 ブランドID value and the Sheet's disabled ID field. `/brands/JOYFIT` opens, `/brands/joyfit` and `/brands/XYZ` show 「ブランドが見つかりません」 with no brand data. Do not file `NG` for the casing differing from the prototype. |
| **Δ3**  | Brand status badge in the detail header / 基本情報 StatusCard                 | spec.md US1 AS3 "an active-status badge" (**superseded**). Y-07 v3 defines no brand status                                                                                                                   | **Removed** (9/30). The right column is **その他情報** (作成日時/作成者/更新日時/更新者)                                                                             | Test to Y-07 v3 + prototype: no brand status badge, no StatusCard, その他情報 card shown.                                                                                                                                                                                                                                                           |
| **Δ4**  | 費用項目名 editability                                                        | spec.md FR-007 "edit each fee item's name" (**superseded**)                                                                                                                                                  | Fixed text (label 費用項目名 + value), no input. G-05 FR-001 fixes the names per brand                                                                               | Expected result: the name is **text, not an input**, in both modes. Saving does not send or change it.                                                                                                                                                                                                                                              |
| **Δ5**  | Re-registering a deleted fee master; empty state                              | spec.md FR-014 tab-level empty state, FR-015 "adding a fee entry … out of scope" (**both superseded**)                                                                                                       | Each slot keeps its card. A deleted slot becomes a **未登録** card (dashed section, 未登録 badge, ［＋登録］) **in the same position**. No tab-level 新規登録 button | Test to Y-07 v3 FR-001 「削除した費用マスタへの再登録（［＋登録］）もPhase 1で提供する」 + prototype. The tab never shows a whole-tab empty state, even with every slot 未登録 (reason the case from the slot model, but do not delete every slot, see Data policy).                                                                                |
| **Δ6**  | Action after 無効化                                                           | spec.md FR-011 "a disabled entry's own disable action MUST become unavailable"                                                                                                                               | ⋯ menu shows **費用マスタを有効化** instead of 無効化. 有効化 is **immediate, no dialog**, with toast 「「{card}」の費用マスタを有効化しました」                     | Both hold together. Test the prototype behaviour. 無効化 must be absent from the ⋯ menu of an inactive master.                                                                                                                                                                                                                                      |
| **Δ7**  | **Staff** visibility of 費用 / 変更履歴                                       | **Conflict between source docs**: Y-07 権限マトリクス Staff 参照 ○ (and spec.md SC-003 "Manager and Staff can view all brand and fee data"). **G-05 権限マトリクス Staff × (費用マスタ閲覧 / 変更履歴参照)** | No gate. Staff sees all tabs (read-only)                                                                                                                             | The API implements G-05 (`E-AUTH-103` on fees/history for staff). The app hides the two tabs (**D11**). **Expected result is G-05**: Staff sees 基本情報 only, a deep link to a hidden tab falls back to 基本情報, and no 403 toast appears. Flag in Notes: "Y-07 ↔ G-05 conflict, pending PO confirmation".                                        |
| **Δ8**  | FIT365 fee item labels                                                        | Y-07 FR-002: 「セキュリティ管理費・施設メンテナンス料」 / 「カード発行料」. G-05 FR-001: 「セキュリティ管理／施設メンテナンス料」 / 「会員カード発行料」                                                     | G-05 wording, order メンテナンス料 → カード発行料                                                                                                                    | **User ruling 2026-10-05**: the G-05 / prototype wording everywhere it renders (card, Sheet, preview, dialogs, toasts, 変更履歴). The old Y-07 wording appearing anywhere is an `NG`.                                                                                                                                                               |
| **Δ9**  | Auto-switch caption on 予約中の改定                                           | —                                                                                                                                                                                                            | 「（有効開始日当日に自動切替・BE）」                                                                                                                                 | **User ruling 2026-10-05**: 「・BE」 is a developer note. Expected text: 「（有効開始日当日に自動切替）」. The prototype shows this caption **only in the Sheet's 予約中の改定 heading** (Unit 4), not on the card. On the card (Unit 3), grade only the absence of 「・BE」.                                                                       |
| **Δ10** | Trainer / Observer access                                                     | spec.md FR-004 / SC-004: access-denied message on the **detail** page, 0 % fee-data exposure. Y-07 matrix: 参照 × (list included)                                                                            | In-page ShieldAlert 「アクセス権限がありません」 + 「ブランド設定はトレーナー・オブザーバー権限では参照できません。」 on detail only. The list is ungated            | Expected result (spec wins): **no brand or fee data on either route** (DOM **and** network), and an access-denied message is shown. The app's `/403` page (Round 1 observation) satisfies the spec. The exact prototype copy is a parity note, not an `NG`. List access for these roles follows the matrix (×), not the prototype.                  |
| **Δ11** | 現行設定 有効開始日 in the future                                             | spec.md FR-007 allows editing the current effective date. FR-010 warns on a past date. Nothing caps the future                                                                                               | Any date                                                                                                                                                             | **Real-API rule** (D8 / R2-D4): the 現行 date must be `<= today`. A future date gives a field error 「将来日付は「予約中の改定」に登録してください」 and **no request is sent**. Test today (accepted), tomorrow (rejected), and the past (accepted with a warning).                                                                                |
| **Δ12** | Additional BE rules on 予約中の改定                                           | spec.md FR-008/009: future revisions, no duplicate date per item                                                                                                                                             | Duplicate-date alert, past-date warning, unlimited rows                                                                                                              | Real-API rules (R2-D4): (a) a past-dated 改定 is allowed but must be **after the 現行 start**; (b) **at most 20** 改定 per fee item, so 「改定スケジュールを追加」 is disabled at 20; (c) duplicates blocked client-side **and** server-side. Write a case for each. (b) and (c) were **never exercised live** in Round 2.                          |
| **Δ13** | 定価 validation messages                                                      | Y-07 / G-05: required; integer ≥ 0; 0 allowed                                                                                                                                                                | 「定価を入力してください」 / 「定価は0円以上の整数で入力してください」                                                                                               | The label rule applies: a message must name the field by its exact label **「定価（税込）」**. Expected result is the label-exact wording (as the app showed in Round 2: 「定価（税込）を入力してください」). A message without the label is an `NG`. Non-integer (`1.5`), negative (`-1`) and `e`-notation must all be rejected. `0` must save.    |
| **Δ14** | その他情報 作成者                                                             | —                                                                                                                                                                                                            | `createdByName` value                                                                                                                                                | API has no `createdByName` at brand level (**G2**). Expected per prototype: a name. The app shows 「—」 → `Block (G2)`. 作成日時 / 更新日時 / 更新者 test normally.                                                                                                                                                                                 |
| **Δ15** | CancelPolicyNote (MOD-09)                                                     | G-05 補足 MOD-09 (fixed refund rule on the brand-detail fee card). Y-07 silent                                                                                                                               | Under every card, registered **and** 未登録, outside the 費用マスタ section, so it survives 削除                                                                     | Test presence + exact copy on every card in both states.                                                                                                                                                                                                                                                                                            |
| **Δ16** | 変更履歴 paging and badge                                                     | spec.md FR-013 / FR-003 (count on the tab). No paging defined                                                                                                                                                | 3 rows, no paging                                                                                                                                                    | Badge = server total (`totalItems`), not the visible row count. The paging footer appears only when there is more than one page (**R2-D7**). Spec-only paging was **never exercised live**.                                                                                                                                                         |
| **Δ17** | ブランド名 constraints                                                        | Y-07: brand name is editable (HQ/System). No length stated                                                                                                                                                   | Required → 「ブランド名を入力してください」, trimmed                                                                                                                 | Real-API rule: `displayName` 1–100 chars. Test 100 (accepted), 101 (blocked client-side or rejected with a Japanese, label-named message), whitespace-only (= empty), leading/trailing spaces (trimmed on save).                                                                                                                                    |
| **Δ18** | 費用 tab badge                                                                | spec.md FR-003 "item counts"                                                                                                                                                                                 | `fees.length` = registered masters                                                                                                                                   | Expected result: the number of slots whose master is **registered** (有効 + 無効), excluding 未登録 (R2-D2). JOYFIT 4 → 3 after a 削除 → 4 after ［＋登録］.                                                                                                                                                                                        |

---

## Coverage Focus per Unit

These **add to** `gen-testcases`' full coverage walk (common checklists: field validation, empty/loading/error states, keyboard, focus, double-submit, etc.). They do not replace it.

**Stress fixtures shared by all units**. Build them once and reuse them. The full-width and unbroken-token variants are **both mandatory** for every text field, in every place it renders:

| Fixture       | Value                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| **F-JP100**   | ブランド名: `ＺＺＱＡ` + 96 full-width kana/kanji = **100** chars                                    |
| **F-TOK100**  | ブランド名: `ZZQA_` + 95 unbroken ASCII chars (no spaces or hyphens) = **100** chars                 |
| **F-TOK101**  | the same token at **101** chars                                                                      |
| **F-AMT-MAX** | a large amount (`99999999` → `¥99,999,999`). Record the server's actual max if it rejects this value |
| **F-AMT-0**   | `0` → `¥0`                                                                                           |
| **F-AMT-ODD** | `1000`, a tax-included price the 10 % storage cannot hold (R2-D5 → `E-VAL-001` `invalid_format`)     |
| **F-REV20**   | 20 予約 rows on one fee item, plus one attempt at a 21st                                             |

### Unit 1 — ブランド一覧 (`/brands`)

- **Read**:
  - exactly two columns plus the action column: ブランドID, ブランド名, no fee/cost column anywhere (FR-001, Y-07 「一覧画面には費用列を持たない」)
  - both rows render in the server's definition order
  - header 件数 badge = server count (2)
  - the row click goes to **that** brand (`/brands/JOYFIT` vs `/brands/FIT365`, Δ2)
  - clicking the ⋯ cell does **not** navigate (`stopPropagation`)
- **Search / pagination (Δ1)**: write the prototype cases:
  - match on name and on ID, case-insensitive
  - `FilterResultBanner` 「全 2 件中 1 件…」
  - filtered empty state with 「条件をクリア」
  - footer 「全 2 件 / 1 ページ / 1-2 を表示」, 前へ/次へ disabled, 表示件数 25/50/100
  - All of them → `Block (D4)` while absent.
- **Rename Sheet**:
  - title 「ブランド編集」
  - ブランド名 prefilled, with its required mark
  - ブランドID **disabled**, with 「システム内部キーのため変更できません。」
  - the 費用 note block 「費用の設定はブランド詳細画面の「費用」タブで管理します。」
  - キャンセル discards the edit: reopen shows the server value
  - reopening for the other brand re-initialises the field (the prototype re-keys per brand)
  - 保存する → `PATCH /admin/brands/{g}`, the list row updates without a reload, success toast
- **Validation** (label-exact):
  - empty → 「ブランド名を入力してください」 under the field, Sheet stays open
  - whitespace-only = empty
  - trim on save
  - 100 / 101 (Δ17)
- **Real API**:
  - server-side rejection (101 if the client lets it through; a value the server refuses) maps to a **Japanese** message naming 「ブランド名」, never the raw English BE message or the `displayName` key
  - **persistence**: rename → reload → re-login as another role (Manager) → the new name is visible
  - **two tabs**: rename in tab A, then save a different name from a stale Sheet in tab B. Record which value wins and whether tab A refreshes. Last-write-wins is acceptable; a silent mismatch between list and detail is an `NG`.
  - **401**: expire the session, then 保存する → sign-in redirect, and no half-applied rename after re-login
  - double-click 保存する → one `PATCH`
- **Role × gating**:
  - row 編集: enabled for HQ and System; **disabled** for Manager and Staff (RoleGatedMenuItem); no brand data at all for Trainer/Observer (Δ10)
  - **no 削除 menu item** for any role. Confirm it is absent, not only gated
  - **server-enforced**: from a Manager session, replay the rename `PATCH` via the browser console → `403 E-AUTH-103`, name unchanged
- **UI stress at 1024px** (F-JP100 and F-TOK100, then restore), in each place: list cell (wraps or truncates with no horizontal page scroll; the ⋯ column stays reachable), Sheet input, success toast. Repeat the two worst at ≥1440.

### Unit 2 — ブランド詳細・基本情報 (`/brands/[brandGroup]`)

- **Header**:
  - h1 = brand name
  - back link 「ブランド管理に戻る」 → `/brands`
  - **no status badge** (Δ3)
- **Tabs**:
  - 基本情報 / 費用 / 変更履歴, line variant
  - 費用 badge = registered masters (Δ18)
  - 変更履歴 badge = server `totalItems` (Δ16)
  - the badges agree with the content of their tabs
  - a deep link / reload keeps the selected tab
- **基本情報**:
  - 一般情報: ブランドID (Δ2), ブランド名
  - 変更 opens the **same** ブランド編集 Sheet as Unit 1 (entry-point delta only: title, prefill, disabled ID)
  - after save: h1, 一般情報, その他情報 更新日時 / 更新者 all refresh without a reload; the list (Unit 1) shows the new name on back-navigation
- **その他情報**:
  - 作成日時, 作成者 (`Block (G2)`, Δ14), 更新日時, 更新者
  - format `YYYY/MM/DD HH:mm:ss` consistent with the app
  - after a rename, 更新者 = the signed-in user's name
- **Access / roles** (the core of this unit):
  - System and HQ: every control enabled
  - **Manager**: all three tabs visible; 一般情報 変更 **disabled** with a tooltip
  - **Staff**: 基本情報 only (Δ7, D11). A deep link to the 費用 or 変更履歴 tab falls back to 基本情報, with no 403 toast and no fees/history request in the network panel
  - **Trainer / Observer**: direct URL → access-denied, **zero** brand/fee data in the DOM and **zero** successful brand API responses (SC-004, Δ10). Also try `/brands/FIT365` and an invalid key.
  - Run each negative case on its own account. They are not interchangeable.
- **Invalid route**: `/brands/joyfit`, `/brands/XYZ`, `/brands/%20` → 「ブランドが見つかりません」, no crash, back link works (Δ2, `400 E-VAL-001` handled silently or in Japanese).
- **Real API**:
  - 401 expiry on load and on save
  - a 5xx / network failure on the detail fetch shows an error state, not an empty or half-rendered page (throttle or offline in devtools)
  - persistence after re-login
- **UI stress at 1024px**: F-JP100 and F-TOK100 in the h1 (wraps; the back link and tab bar are not pushed off-screen), the 一般情報 value (60 % column), the その他情報 更新者 (40 % column; a long staff name is read-only, observe only). The two columns must not overlap.

### Unit 3 — 費用タブ

- **Card model**:
  - JOYFIT renders **4** cards in slot order: 「JOYFIT / JOYFIT」, 「JOYFIT / JOYFIT24」, 「JOYFIT / JOYFIT YOGA」, 「JOYFIT / JOYFIT＋」 (full-width ＋)
  - FIT365 renders **1** card titled 「FIT365」 with no sub-brand suffix (spec Edge Case: do not assume sub-brands)
  - each card holds the 費用マスタ section: label, status badge 有効 / 無効, then 変更 and ⋯
  - 費用項目① / ② with 現行設定 定価（税込） + 有効開始日
  - JOYFIT items: 入会金 / 登録事務手数料
  - FIT365 items: 「セキュリティ管理／施設メンテナンス料」 then 「会員カード発行料」 (Δ8), with the cadence caption 「入会3ヶ月目に発生・以後1年ごと（税込）」 under item ①
  - **only the charged items** show: no ¥0 rows for uncharged fee types (D14)
  - amounts formatted `¥n,nnn`; dates `YYYY/MM/DD`
- **予約中の改定 display**: on a card that has one (created in Unit 4):
  - CalendarClock heading, 「n件」 badge
  - each row: 予約 badge, 「有効開始日 YYYY/MM/DD」, amount, 「登録: {date} / {name}」 (real `createdAt` / `createdByName`)
  - shown per item: an item ① schedule does not appear under item ②
  - no 「・BE」 anywhere on the card (Δ9; the caption itself lives in the Sheet, Unit 4)
- **Lifecycle** (HQ, on the sandbox slot only, see Data policy):
  - ⋯ → 費用マスタを無効化 → dialog:
    - title 「{card} の費用マスタを無効にしますか？」
    - body includes the item/amount summary, e.g. 「入会金 ¥2,200・登録事務手数料 ¥3,300」, built from **data**, so FIT365 shows its own item names
    - 「変わらないもの」 list of 3 items naming the sub-brand
    - キャンセル changes nothing
    - 無効にする → badge 無効, note 「この費用マスタは無効です。金額と予約中の改定はそのまま残っています。」, amounts and 予約 still visible, toast
  - ⋯ on an inactive master shows **有効化** (no 無効化). It is **immediate**, with toast, badge 有効 (Δ6)
  - 削除 dialog:
    - title 「{card} の費用マスタを削除しますか？」
    - body mentions 「予約中の改定 n件」 **only when n > 0**
    - the line 「一時的に止めるだけなら「費用マスタを無効化」を使ってください。」 appears **only when the master is active**
    - 「変わらないもの」 has 4 items, incl. 「これまでの変更履歴」
    - destructive styling on 削除する
    - confirm → the card turns **未登録** in the **same slot position**, ［＋登録］ shows, the tab badge decrements (Δ5, Δ18), toast
  - 削除 from the **inactive** state also works (G-05: 無効 then 物理削除)
  - CancelPolicyNote under every card in every state (Δ15)
  - no control anywhere acts on the sub-brand itself
- **Role × gating**:
  - Manager: cards visible; 変更, ⋯ and ［＋登録］ **disabled** (tooltip 「費用マスタの登録には本部権限が必要です」 on ［＋登録］)
  - Staff: no 費用 tab (Δ7)
  - Trainer / Observer: no access
  - **Server-enforced**: replay `PATCH …/fee-master/active` and `DELETE …/fee-master` from a Manager session → `403 E-AUTH-103`, state unchanged
- **Real API**:
  - each card loads independently (one `GET …/sub-brands/{e}` per card). A failure on one card must not blank the others (offline or block one request)
  - **two tabs**: tab B deletes the master while tab A has its ⋯ open, then tab A clicks 無効化. Expect a Japanese error toast and the card reconciles to 未登録 on refetch. A silent "success" or a ghost card is an `NG`.
  - double-click 無効にする / 削除する → one request
  - 401 on each action
  - persistence after reload and re-login (Manager sees the same 無効 badge HQ set)
- **UI stress at 1024px**:
  - F-JP100 / F-TOK100 as the **brand name**, which is part of every card title 「{brand} / {sub}」, the dialog titles, the dialog bodies and the toasts. Rename JOYFIT, check every place, then restore (Data policy → R-1).
  - F-AMT-MAX in both items (2-col grid, dialog summary)
  - F-REV20 on one item (the card grows vertically, no overflow)
  - the 「変わらないもの」 list with the long name
  - the 未登録 card title with the long name
  - Repeat the worst two at ≥1440.

### Unit 4 — 費用マスタ登録・変更 Sheet

- **変更 mode prefill**:
  - title 「{card}の費用マスタを変更」
  - per item: 費用項目名 as **fixed text** (Δ4), the 現行設定 heading, 有効開始日 + 定価（税込） with required marks, the existing 予約 rows
  - 「改定スケジュールを追加」 + helper 「将来日付を指定して改定を事前登録できます。」
  - the プレビュー（会員向け表示） box shows `¥n,nnn（税込）` + the item name and **updates live** as 定価 changes
  - footer キャンセル / 保存する
  - **opening alone shows no past-date warning**, even though the current date is in the past (warn only on change)
- **登録 mode** (from ［＋登録］ on a 未登録 slot):
  - title 「…を登録」
  - **no 現行設定 heading, no 予約 section, no 「改定スケジュールを追加」**
  - item names prefilled with the brand's fixed names (FIT365's are its own, Δ8)
  - 定価 **empty** (not 0) and dates empty
  - footer 登録する
  - `POST …/fee-master`
  - the card returns to 有効 in the same slot, badge +1
- **Validation** (each message under its field, label-exact, Δ13):
  - empty 有効開始日 → 「有効開始日を入力してください」
  - empty 定価 → 「定価（税込）を入力してください」
  - `-1`, `1.5`, `1e3` → the integer ≥ 0 message
  - **`0` saves** (F-AMT-0, spec Edge Case)
  - the same rules on **each 予約 row**
  - a duplicate date across two 予約 of the **same** item → 「有効開始日が重複しています。別の日付を指定してください。」, save blocked
  - the **same date on item ① and item ②** is allowed (duplicates are per item)
  - errors clear per field as it is fixed
  - Save scrolls to the first invalid field, and the Sheet stays open
  - **zero requests sent** on any client-side failure (SC-002)
  - a 予約 row added and left empty shows its required errors on save (the Round 1 `append` + `trigger` defect is fixed in Round 2; regression check)
  - a 予約 removed with its trash button is not validated and not sent
- **Date rules** (Δ11, Δ12):
  - 現行: today accepted; tomorrow → 「将来日付は「予約中の改定」に登録してください」; past + changed → the warning 「過去の日付が指定されています。登録は可能ですが、即座に適用が開始されます。」, non-blocking
  - 予約: future accepted; past + after the 現行 start → warning, then saved and applied at once (sandbox only); past and **before** the 現行 start → rejected with a Japanese, field-mapped message
  - 20-row cap: 「改定スケジュールを追加」 is disabled at 20 per item; item ② still allows its own 20 (F-REV20, no save needed)
  - DatePicker reaches today + 10 years (2036/12). Prerequisite P1: before the fix, 2027+ was unreachable.
- **Save path**:
  - one `PATCH …/fees` per Save (SC-005: the card shows the new 予約 as 予約 **without a reload**)
  - add, edit and remove 予約 in one save; removing every 予約 sends `scheduledChanges: []`, and the card loses the section
  - a 現行 correction (amount, then date) updates the card
  - キャンセル discards all edits; reopening shows server state
  - double-click → one request
- **Real API**:
  - **F-AMT-ODD** (`¥1,000`) → `E-VAL-001` `invalid_format` surfaces as **one Japanese** toast (no duplicate local toast, D12), the Sheet stays open, nothing is persisted
  - a server-side duplicate (bypass the client check by editing a stale Sheet after another tab added the same date) → a Japanese error and no partial write. A save that commits some items but not others is an `NG` (the write must be transactional, B1)
  - **two tabs**: tab B deletes the master while tab A has the 変更 Sheet open, then tab A saves → error, no resurrection
  - 401 on save → re-login → nothing half-written
  - **persistence**: reload and re-login as Manager → the 予約 and 登録者 are visible, read-only
- **Role × gating**:
  - 保存する / 登録する is a RoleGatedButton: Manager cannot reach the Sheet (変更 is disabled). If the Sheet ever opens for Manager, Save must be disabled.
  - **server-enforced**: replay `PATCH …/fees` and `POST …/fee-master` from a Manager session → `403 E-AUTH-103`
- **UI stress at 1024px**:
  - the Sheet title with the F-JP100 / F-TOK100 brand name (header is fixed; the title wraps without pushing the close button out)
  - F-AMT-MAX in 定価 (input width 180px, ¥ prefix, preview)
  - F-REV20 (the scroll region scrolls, header and footer stay fixed)
  - duplicate and past warnings shown together on many rows
  - Repeat the worst two at ≥1440.

### Unit 5 — 変更履歴

- **Columns**: 変更日時 (seconds), 変更者, 対象, 変更項目, 変更前, 変更後 (FR-013, G-05 FR-004). Newest first.
- **One row per changed field**: a save that changes two fields gives two rows (D9).
- **対象 values**:
  - fee rows: the sub-brand label (e.g. 「JOYFIT / JOYFIT24」 per prototype; record the app's form and check it is consistent across rows)
  - brand-level rows (rename): the brand name (`brandEnum: null`)
- **Formatting**:
  - money: `¥n,nnn` tax-included
  - dates: `YYYY/MM/DD`
  - strings as-is
  - `null` → 「—」
  - a deleted staff (empty `changedByName`) → 「—」
- **Action labels** (every write type Units 1–4 performed has its row):
  - rename 「ブランド名 A → B」
  - 予約登録 / 予約取消 / 予約変更
  - 現行 correction
  - 無効化 / 有効化 (費用マスタ 有効 ⇄ 無効)
  - 削除 (費用マスタ 有効 → 未登録)
  - 登録 (未登録 → 有効)
  - Check each against the **write log** (Data policy): actor = the signed-in account, timestamp within the case window, correct 対象.
  - A write with **no** history row, or a row with the wrong actor/対象, is an `NG`.
  - **No raw enum** (`fee_master_deactivate`, `enrollmentFee`, `displayName`) may ever render.
- **Immutability**: no edit or delete control on any row (G-05 「変更履歴の削除・修正は不可」).
- **Badge / paging** (Δ16):
  - the badge equals `totalItems` and increments after each write without a manual reload (invalidation, R2-D6)
  - the footer is absent when there is one page
  - once the total exceeds one page (after this run it should), check:
    - page 2 continues without duplicates or gaps
    - page-size change resets to page 1
    - the total in the footer equals the badge
  - Record `Block (DATA)` if the total never exceeds one page.
- **Empty state**: FIT365 or JOYFIT will not be empty (seeded). Write the case, and run it only if a brand ever has 0 rows.
- **Role × gating**: HQ, System and Manager see the tab; Staff has no tab (Δ7, and `GET /history` is never requested); Trainer/Observer have no access.
- **Real API**: 401 on page change; a network failure on page 2 shows an error and keeps page 1 usable; persistence across re-login.
- **UI stress at 1024px**:
  - the rename rows carrying **F-JP100 / F-TOK100 in 変更前 and 変更後** (permanent rows written by Units 1–3; the six-column table must not force horizontal **page** scroll; a table-level scroll is acceptable only if the app uses one elsewhere)
  - a long 変更者
  - F-AMT-MAX values
  - Repeat at ≥1440.

---

## Known Gaps (carried from `integration-plan.md`, state after Round 2)

| ID          | Blocker / gap                                                                                                            | UI behaviour now                                       | Test treatment                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B1–B5**   | Round 1 blockers (fee Save, history total, fees total, group timestamps, before/after typing)                            | **Closed in Round 2**                                  | **Not gaps.** Test normally. A failure here is `NG` (regression).                                                                                                  |
| **D4**      | List search, banner and pagination removed by user decision (no BE ask)                                                  | Not rendered                                           | Cases written to prototype + spec.md FR-002 (Δ1) → **`Block (D4)`**. Lifted if the user restores the controls.                                                     |
| **D11**     | Staff: 費用 / 変更履歴 hidden (API returns `E-AUTH-103`, per G-05)                                                       | Tabs hidden, fallback to 基本情報                      | Expected result = G-05 (Δ7) → **`OK`** when hidden. Notes carry "Y-07 ↔ G-05 conflict, PO to confirm".                                                             |
| **G2**      | No brand-level `createdBy` / `createdByName`                                                                             | その他情報 作成者 = 「—」                              | Case written to prototype (a name) → **`Block (G2)`**.                                                                                                             |
| **G3**      | After 削除 → ［＋登録］, a JOYFIT sub-brand loses its seeded ¥0 `cardIssueFee` / `maintenanceFee` rows (`current: null`) | Not visible on this screen (D14 hides uncharged items) | No case fails on it. The **destructive pair leaves this residue**: record it in the TC result and hand it to the dev for the API-side restore (Data policy → R-4). |
| **B6 / G1** | Basic-info editor (cadence, suspension fee, …) not built                                                                 | No editor; cadence caption read-only                   | **Out of scope.** Verify only the caption (Unit 3). No `Block` cases.                                                                                              |
| **B7**      | ADD-09 入会金免除 not built (MOD-09 **is** shipped)                                                                      | Not rendered                                           | **Out of scope**, no cases. MOD-09 is tested (Δ15).                                                                                                                |
| **NL-1**    | Never exercised live in Round 2: history paging, the 20-row 予約 cap, the duplicate-date alert                           | —                                                      | No known defect. Test normally, at higher risk; budget time for these.                                                                                             |

---

## Traceability Map

| Requirement                                                    | Source                  | Unit(s)                                                   | Note                                  |
| -------------------------------------------------------------- | ----------------------- | --------------------------------------------------------- | ------------------------------------- |
| **Y-07 FR-001** 一覧表示・参照 (ID + 名, 費用列なし)           | Y-07 v3                 | 1, 2                                                      |                                       |
| **Y-07 FR-001** 編集可能な項目 = ブランド名のみ, ID 変更不可   | Y-07 v3                 | 1, 2                                                      |                                       |
| **Y-07 FR-001** サブブランド本体は無効化・削除・名称編集しない | Y-07 v3                 | 3                                                         | Absence of controls                   |
| **Y-07 FR-001** 費用マスタ 無効化・物理削除・［＋登録］        | Y-07 v3 + G-05 運用方針 | 3, 4                                                      |                                       |
| **Y-07 FR-002** 費用 per sub-brand / FIT365 per brand, 税込    | Y-07 v3 + G-05 FR-001   | 3, 4                                                      | Labels per Δ8                         |
| **Y-07 FR-002** 異常系 (必須, 0以上の整数)                     | Y-07 v3 + G-05 FR-002   | 4                                                         |                                       |
| **Y-07 権限マトリクス** + データスコープ (全ブランド)          | Y-07 v3                 | 1, 2, 3, 4, 5                                             | Staff per Δ7                          |
| **G-05 FR-004** 変更履歴 記録項目 / 削除・修正不可             | G-05                    | 5                                                         |                                       |
| **G-05 FR-007** 金額プレビュー                                 | G-05                    | 4                                                         |                                       |
| **G-05 FR-008** 有効開始日スケジュール                         | G-05                    | 4 (write), 3 (display)                                    |                                       |
| **G-05 MOD-09** キャンセルポリシー on fee card                 | G-05 補足               | 3                                                         | Δ15                                   |
| spec.md **FR-001** list columns                                | spec.md                 | 1                                                         |                                       |
| spec.md **FR-002** keyword search                              | spec.md                 | 1                                                         | `Block (D4)` (Δ1)                     |
| spec.md **FR-003** row → detail, 3 tabs, counts                | spec.md                 | 1 (nav), 2 (tabs, badges), 3 (費用 badge), 5 (履歴 badge) |                                       |
| spec.md **FR-004** detail access roles, no store scoping       | spec.md                 | 2 (+ 1 for list access, Δ10)                              |                                       |
| spec.md **FR-005** brand-name edit, ID read-only               | spec.md                 | 1, 2                                                      |                                       |
| spec.md **FR-006** fee settings per sub-brand / brand, 税込    | spec.md                 | 3                                                         |                                       |
| spec.md **FR-007** edit name / amount / date                   | spec.md                 | 4                                                         | Name part **superseded** (Δ4)         |
| spec.md **FR-008** scheduled revisions, pending                | spec.md                 | 4, 3                                                      |                                       |
| spec.md **FR-009** required, integer ≥ 0, no duplicate date    | spec.md                 | 4                                                         |                                       |
| spec.md **FR-010** past-date warning, non-blocking             | spec.md                 | 4                                                         |                                       |
| spec.md **FR-011** disable + delete with confirmation          | spec.md                 | 3                                                         | + 有効化 (Δ6)                         |
| spec.md **FR-012** writes HQ/System only                       | spec.md                 | 1, 2, 3, 4                                                | incl. server-side replay              |
| spec.md **FR-013** change history fields                       | spec.md                 | 5                                                         |                                       |
| spec.md **FR-014** fee-tab empty state                         | spec.md                 | 3                                                         | **Superseded** → per-slot 未登録 (Δ5) |
| spec.md **FR-015** two brands only, no new brand / fee entry   | spec.md                 | 1 (no brand create)                                       | Fee-entry half **superseded** (Δ5)    |
| spec.md **SC-001** locate a brand < 5 s                        | spec.md                 | 1                                                         | Scan path only (search is D4)         |
| spec.md **SC-002** 100 % invalid saves blocked                 | spec.md                 | 4                                                         |                                       |
| spec.md **SC-003** Manager/Staff zero enabled write controls   | spec.md                 | 1, 2, 3, 4                                                | Staff's view per Δ7                   |
| spec.md **SC-004** Trainer/Observer 0 % exposure               | spec.md                 | 2 (+ 1)                                                   | DOM + network                         |
| spec.md **SC-005** new 予約 visible without reload             | spec.md                 | 4                                                         |                                       |

**Every requirement lands in at least one unit.** None is unassigned. Three spec.md FRs are partly or fully **superseded** (FR-007 name part, FR-014, FR-015 fee-entry part). Their cases test the superseding rule. One FR (FR-002 search) runs as `Block (D4)`. **No coverage** exists for G-05 FR-003/005/006/009 (discount linkage, non-retroactivity, inbound flow reflection, notifications). These are other screens' or the backend's behaviour, and are out of scope here.

---

## Execution Notes (for `execute-testcases`)

### Credentials (`src/lib/auth/demo-users.ts`, real Cognito accounts)

| Role            | Account                         | 職位           | Used for                                                                      |
| --------------- | ------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| System          | `lodu4289+1@gmail.com`          | システム管理者 | Spot-check that System has HQ's write access in each unit                     |
| **Headquarter** | `lodu4289+headquater@gmail.com` | 本部管理者     | **Default account for every functional and write case**                       |
| Manager         | `lodu4289+manager@gmail.com`    | ブロック長     | Read-everything / write-nothing; **the account for server-side replay cases** |
| Staff           | `lodu4289+staff@gmail.com`      | 店舗責任者     | 基本情報-only view (Δ7), list read                                            |
| Trainer         | `lodu4289+trainer@gmail.com`    | 社員トレーナー | No access (Δ10)                                                               |
| Observer        | `lodu4289+observer@gmail.com`   | 閲覧専任       | No access (Δ10)                                                               |

The password for all six is `Password@123`. A pre-condition of "HQ user" means the Headquarter account. "A non-editor" means run on **Manager and Staff** separately. "No-access role" means run on **Trainer and Observer** separately. Switch roles with the header's **「デモ: ユーザー切替」** menu. **It renders only when `NEXT_PUBLIC_APP_ENV=development`.** If it is missing, check the env var before filing anything. Replay cases: copy the request from the HQ session's network panel. Re-issue it with `fetch` from the Manager session's console, so it uses the Manager's token.

### Environment

- App: the local dev server on **:3000**. The API allows CORS only from :3000; Round 2 hit this on :3100.
- API: `NEXT_PUBLIC_REAL_API_URL` = **`https://api.dev.fitness-v2.okamoto-hd.com`**. Record the active base URL in each TC doc header.
- **The backend is shared with other people.** A value that changes between two cases is not automatically a defect. Re-read it before recording `NG`. Before the run, **snapshot the baseline**: for both brands, the name; for every card, both items' 定価 / 有効開始日, the 予約 list and the status; the 変更履歴 total. Restores are checked against this snapshot.
- Mock routes under `src/app/api/crm/brands/**` still exist but are not called. If data looks like the prototype mock (¥11,000 入会金, 山田 花子), suspect a misconfigured base URL.

### Data policy (binding)

- **R-0. No new brands exist to play with.** JOYFIT and FIT365 are the only records. Any case may **read** them. Writes are allowed **only** as below, and **every write case restores the baseline before it ends**: the restore step is a numbered step in the case, not a cleanup note.
- **R-1. Rename** (Units 1, 2, and the stress cases in 3–5): only on **JOYFIT**, to values prefixed **`ZZQA_`** (or **`ＺＺＱＡ`** for F-JP100). Restore to exactly `JOYFIT` in the same case. Keep the renamed window to minutes: other people see the name on every screen. Group the stress checks that need a long name (Unit 3 titles/dialogs, Unit 4 Sheet title) into **one** renamed window rather than renaming per case. **Never rename FIT365.**
- **R-2. Fee writes** (Units 3, 4) only on the **sandbox slot JOYFIT / JOYFIT YOGA**, the slot Round 2 used:
  - **予約**: use dates in **2035–2036** only, far from any real schedule and inside the DatePicker range. Remove them before the case ends (one save with the 予約 deleted).
  - **現行 corrections and a past-dated 予約** apply immediately and create an applied generation that cannot be deleted (API-074 §6.4). Restore by saving the baseline amount and date back. Expect the history to show both writes. Run each at most **once**. Unit 3's F-AMT-MAX card-layout case (P2-03 TC-086) **shares** Unit 4's single 現行 correction (P2-04 TC-046): set F-AMT-MAX in that one correction, judge the card, then restore.
  - **FIT365**: read, open the Sheet, client-side validation, **and at most one reversible 予約 add/remove** (2035+) to prove the FIT365 item labels end-to-end. **No 無効化, 削除, 現行 correction or past-dated 予約 on FIT365.** Its single slot feeds G-01 defaults for the whole brand. FIT365-specific 未登録 / 登録 cases are written but recorded **`Block (DATA)`**.
  - Other JOYFIT slots: **read only**.
- **R-3. 無効化 / 有効化**: on JOYFIT YOGA only. Re-enable in the same case.
- **R-4. 削除 → ［＋登録］ is one destructive pair**: run on JOYFIT YOGA, **once**, at the end of the fee work (see Suggested Order). Register back the **baseline** amounts and date. Known residue (**G3**): the sub-brand's ¥0 `cardIssueFee` / `maintenanceFee` rows are gone after the pair. Record it in the TC result and ask the dev to restore them via the API, as in Round 2. The run is not "clean" until that is confirmed.
- **R-5. Write log**: every write case appends one line to the TC doc's result notes, in this shape: `time · account · action · target · before → after`. Unit 5 checks each line against the 変更履歴. History rows are **permanent** (G-05: no delete), so every run adds rows by design. This is expected; do not try to "clean" it.
- **R-6. Staff master and other screens are never touched** to make fixtures. Long 変更者 / 登録者 names are observed, never manufactured.
- **R-7. No overnight residue**: if a run stops mid-case, restore manually (rename back, delete the 2035 予約, re-enable, re-register) and note what was restored. Anything that cannot be restored goes in the TC result with record, value and reason.

### Known-gap policy

- A failure matching a row in **Known Gaps** → **`Block (<id>)`** (`D4`, `G2`), with the row's reason.
- A case the data policy forbids running (FIT365 destructive, history paging with too few rows) → **`Block (DATA)`**, with the reason.
- `D11` behaviour (Staff tabs hidden) is **`OK`** (Δ7).
- Behaviour matching a **Δ row's "How to test"** column is `OK` even where it contradicts the prototype. Behaviour matching the prototype column instead, where the Δ row says otherwise, is **`NG`**.
- Any other failure → **`NG`**, with observed vs expected and the FR/Δ reference. For a 4xx, include the request body and the `E-XXX-nnn` code, and say which side (FE rule or BE rule) is out of line.
- Error text: every error the operator sees must be **Japanese**. A raw English BE message or an API field key on screen is an `NG` (app-wide rule since `e7da69de`).

### Viewport

- **1024×768** (the supported floor) for every layout and stress case.
- **≥1440px** for the wide check on the two worst stress cases per unit.
- Below 1024px is **out of scope**. Do not report layout findings from a narrower window.

### Account safety

- The six accounts are real Cognito users. They lock for **~15 minutes** after repeated wrong-password attempts. **This plan has no wrong-password case.** For 401-expiry cases, **clear or expire the session token** (storage/cookies); never use failed sign-ins.
- Role switches are correct-password sign-ins and are safe to repeat.

---

## Suggested Order

| Step | Unit / part                                                                                                                                                     | Rationale                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Baseline snapshot (Environment)                                                                                                                                 | Every restore is checked against it                                                                                               |
| 1    | **Unit 2**: read, access and role cases (all six roles), invalid routes                                                                                         | Confirms the route, the role model and the data are sane before anything writes. Its findings (e.g. Δ10 behaviour) shape the rest |
| 2    | **Unit 1**: list read, role gating, rename + validation + restore                                                                                               | Smallest write surface; proves the restore discipline on the simplest record                                                      |
| 3    | **Unit 2**: rename from 一般情報 + その他情報 refresh                                                                                                           | Reuses Unit 1's Sheet; checks only the second entry point                                                                         |
| 4    | **Unit 3**: card read, FIT365 vs JOYFIT, role gating, 無効化 → 有効化 (sandbox)                                                                                 | Reversible lifecycle before any Sheet write                                                                                       |
| 5    | **Unit 4**: 変更 mode: validation (no requests), date rules, 20-cap, 予約 add/edit/remove (2035+), F-AMT-ODD, 現行 correction + restore, the single FIT365 予約 | Produces the 予約 Unit 3 displays. Re-check Unit 3's 予約 display cases here while the 予約 exists                                |
| 6    | **Long-name window** (R-1): rename JOYFIT to F-JP100, then F-TOK100; walk Unit 1/2/3/4 stress places; restore                                                   | One short window instead of many                                                                                                  |
| 7    | **Unit 3 + Unit 4, the destructive pair (R-4)**: 削除 dialog → 未登録 card → ［＋登録］ in 登録 mode → baseline restored                                        | The only irreversible-ish step, last among the writes; it is also the only way to reach 登録 mode                                 |
| 8    | **Unit 5**: history, against the write log; paging now that the total has grown; long-value rows from step 6                                                    | Reads what steps 2–7 wrote                                                                                                        |
| 9    | Restore audit vs the baseline + G3 hand-off                                                                                                                     | Definition of done                                                                                                                |

---

## Definition of Done

- [ ] Five TC docs created under `tests/cases/` with the filenames in the Unit Table, each listing its Δ ids and Known-gap ids in its header.
- [ ] Every requirement in the Traceability Map has at least one case. Superseded spec.md FRs cite their Δ row.
- [ ] Each doc carries the long-value matrix (field × render place × {full-width, token}) and the validation-label rule.
- [ ] Common-checklist gaps found while authoring are fixed in the docs **before** execution.
- [ ] Each doc executed once at 1024×768 (plus the ≥1440 checks). Every case has `OK` / `NG` / `Block (<id>)`, with evidence for every `NG`.
- [ ] Write log complete, and every entry matched in Unit 5.
- [ ] **Baseline restored**: JOYFIT named `JOYFIT`; JOYFIT YOGA 有効 with baseline amounts and dates; no 2035–2036 予約 left on any card; FIT365 untouched except its one reversible 予約. The **G3** residue is either restored by the dev or explicitly left with a note naming the rows.
- [ ] Open decisions for the user/PO listed in the run summary: **D4** (restore search?), **Δ7** (Staff fee visibility Y-07 vs G-05), **OQ-1** (G-05 limits Manager to 管理対象ブランドのみ, Y-07 grants Manager all brands; cases follow Y-07), **G2**, **G3**.
