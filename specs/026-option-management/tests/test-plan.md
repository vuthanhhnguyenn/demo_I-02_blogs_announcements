# Test Plan: G-02 Option Master Management (Phase 2 — real API)

**Spec**: [spec.md](../spec.md) (last updated 2026-09-25, prototype `0a73739` for list/detail, form `47423ec` per integration report)
**PO Spec**: `G-02` — オプション管理 (incl. `G-02-01` オプション 新規登録), requirement doc `.cache/fitness-spec/crm/requirements/G-02.md` `260731_v3`
**Created**: 2026-09-23 — **rewritten 2026-09-30** (the 2026-09-23 draft assumed the screens were still on the mock client); **revised 2026-10-29** — price basis is now tax-inclusive (`feeMonthly` stored 税込, API-085 v0.12): D1 resolved to the 料金（税込）input, computed-value and stress expectations recomputed
**Integration round**: **Round 1 complete on all three screens** — list, detail and form run on `src/lib/api-real` (`GET/POST/PATCH /api/v1/admin/options…`, `/history`, `/active`, `/admin/stores`). Source of the gap register: `api-integration-output/option-{list,detail,form}/report.md` (dated 2026-09-30). **No `specs/026-option-management/integration-plan.md` exists**; the reports carry no open blocker rows, so the `Bn` table below holds _watch items_ only.
**Ladyroom slice** (added 2026-11-19): G-02 `261107_v9` redefined 「エリア制限設定」 as 「利用できるエリア」 (任意・複数, chosen from the E-02 FR-016 エリアマスタ; G-02 `261112_v15` FR-002); prototype `fitness-crm-ui@9428dc2` (`option-form.tsx`, `option-detail.tsx`, `components/available-areas.tsx`). Its cases go into the G-02-B / G-02-C docs, tagged `[Ladyroom]`, and **replace** the エリア制限 cases there (§2). The cross-feature run — order, `QA-E02-AREA-*` fixtures, data policy, pre-flight gaps AREA-BE / AREA-MOCK — is owned by the [029 test plan](../../029-equipment-management/tests/test-plan.md) §7e–§9.
**Consumed by**: `gen-testcases` → `execute-testcases`

---

## 1. Scope

**In scope** — the option **master** screens under `/options`:

- **List (`G-02`)**: keyword search (option name only), 詳細フィルター (ブランド / 種別 / サービス種別 / ステータス / 日割り / 店舗), filter result banner, header total badge, server-side sort (オプション名 / 料金(税込) / 登録日), pagination, セット割設定 button, 新規登録 button, row ⋯ menu (編集 only), ロッカー契約種類 badge + tooltip.
- **Form (`G-02-01`)**: create (`/options/create`) and edit (`/options/[id]/edit`), brand lock in edit, 「変更を破棄しますか？」 dialog, 未入力 footer, 料金（税込）basis (stored as entered), 無効/有効 switch (two-call save on edit), 会員公開用画像 add/remove.
- **Detail (`/options/[id]`)**: 基本情報 tab (all cards incl. 利用状況, ロッカー契約種類, 店舗での利用, 会員公開設定, その他情報) and 変更履歴 tab (real `/history`).
- **Role gating** of all three screens (System / Headquarter / Manager / Staff / Trainer / Observer), including server-enforced refusal.

**Out of scope** (checked only up to "the link/button goes to the right place"):

- **Set-discount screens `G-02-02` (`/option-discount` list / detail / form)** — separate screen set and its own implementation. Only the セット割設定 button (visibility + target) is tested here. It needs its own plan.
- **ロッカー管理 (E-01)** — target of the ロッカー契約種類 card link.
- **Store detail 契約・料金 tab (`/stores/{id}?tab=contract`)** — target of the 店舗での利用 card; only "opens that store with the tab selected".
- **Per-option store assignment** (`Y-02 販売設定`), **E-02 device gating**, **A-01-01-c member option operations**, **F-01 billing** — downstream consumers.
- Spec "Out of Scope for Phase 1": multiple images, `monthlySessionCount`, history paging/date range.
- **削除** — absent by design (FR-016); its _absence_ is tested.

---

## 2. Unit table

| #   | Unit          | Screen(s)                                                                                                                                                 | Route                                   | TC doc filename                                   |
| --- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| 1   | G-02-A List   | オプション管理 一覧 (search, 詳細フィルター, result banner, sort, paging, セット割設定 / 新規登録 buttons, row ⋯ menu, locker badge tooltip, empty state) | `/options`                              | `TC -【Fitness CRM】- [G-02-A][Option List].md`   |
| 2   | G-02-B Form   | オプション 新規登録 / 編集 (`G-02-01`) — one component in two modes, plus the 変更を破棄しますか？ dialog it owns                                         | `/options/create`, `/options/[id]/edit` | `TC -【Fitness CRM】- [G-02-B][Option Form].md`   |
| 3   | G-02-C Detail | オプション詳細 — 基本情報 tab (all cards) + 変更履歴 tab, access-denied view, not-found state                                                             | `/options/[id]`                         | `TC -【Fitness CRM】- [G-02-C][Option Detail].md` |

All files under `specs/026-option-management/tests/cases/`.

**Split rationale**: one unit per screen. Create and edit share one component and one prototype file, and the discard dialog exists only inside it, so they cluster. Detail has its own route, two tabs and several conditional cards.

**Superseded cases (ladyroom, 2026-11-19)**: G-02 `261107_v9` removed the エリア制限 checkboxes (`ladies_area` / `tanning_area` / `protein_bar` / `locker_area`). `[G-02-B][Option Form]` **TC-022** (エリア制限 checkboxes) and **TC-042** (Area restrictions round trip), and `[G-02-C][Option Detail]` **TC-018** (エリア制限 badges) are rewritten in place as `[Ladyroom]` 利用できるエリア cases (same IDs, so the docs' numbering does not shift); further `[Ladyroom]` cases are appended.

---

## 3. Sources per unit

| Unit          | Spec sections                                                                                                                                                                                                  | UI prototype file                                   | FRs covered                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| G-02-A List   | User Story 1 (AS1–AS6); Edge Cases 1–3; FR-001–FR-005, FR-011 (badge), FR-016, FR-017, FR-019 (badge); API Design Alignment → list query mapping; Known non-defects rows 1–3; G-02.md FR-S001, 権限マトリクス  | `.cache/fitness-crm-ui/src/pages/option-list.tsx`   | FR-001, 002, 003, 004, 005, 008 (column), 011, 016, 017, 019 |
| G-02-B Form   | User Story 2 (AS1–AS7); Edge Case 7; FR-006–FR-012, FR-017, FR-018; Key Entities (enums); API Design Alignment → "Behaviour adopted", Deliberate deviations; G-02.md FR-002, FR-004, FR-005, 権限マトリクス    | `.cache/fitness-crm-ui/src/pages/option-form.tsx`   | FR-006, 007, 008, 009, 010, 011, 012, 017, 018               |
| G-02-C Detail | User Story 3 (AS1–AS7); Edge Cases 5–6; FR-008 (display), FR-010 (変更可否 display), FR-011, FR-013–FR-017, FR-018 (display), FR-019, FR-020; Known non-defects rows 4; G-02.md FR-003, FR-007, 権限マトリクス | `.cache/fitness-crm-ui/src/pages/option-detail.tsx` | FR-008, 010, 011, 013, 014, 015, 016, 017, 018, 019, 020     |

`gen-testcases` reads only its unit's slice. The "Set-Discount Alignment (G-02-02)" section of the spec is **not** a source for any unit.

**Ladyroom slice sources** (G-02-B / G-02-C, tag `[Ladyroom]`): **G-02.md** (`261112_v15`) FR-002 「利用できるエリア」 (v9 row of the 変更履歴), 前提条件 (エリアマスタ登録済み), 関連機能 E-02 / G-01. **E-02.md** (`261109_v6`) FR-016 (sale / grant limited to matching members), FR-008 (only 女性 matches 女性のみ, only 男性 matches 男性のみ). **API**: `CreateOptionDto` / `UpdateOptionDto.areaIds`, `OptionDetailDto.areas` / `genderCondition`, `GET /admin/areas?brandGroup=` (choices). **Prototype** `@9428dc2`: `option-form.tsx`, `option-detail.tsx`, `components/available-areas.tsx`, `data/facility-areas.ts`. The local spec.md FR-010 「Area Restriction」 (`ladies_area` …) is **superseded** by G-02 v9 — do not author cases from it.

---

## 4. Spec-vs-prototype deltas

`gen-testcases` must mark each of these in the Notes of the affected case(s).

| #   | Item                                                          | In spec                                                                                                                            | In prototype                                                                                           | How to test                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Price input basis (**resolved 2026-10-29**)                   | FR-018: input **料金（税込）**, sent as-is (`feeMonthly` stored 税込, API-085 v0.12); 税抜金額 = `ceil(税込 × 100 / (100 + 税率))` | Input is **料金（税込）**                                                                              | Spec = prototype. Label reads 料金（税込）, placeholder 1100; list / detail 税込 = the entered value; detail 税抜金額 by ceil (1,078 @ 8% → 999; 1,100 @ 10% → 1,000; 1,099 @ 10% → 1,000). A 税抜 input label or any value ≠ the entered 税込 is `NG`. |
| D2  | Sort axes / 登録日 column (**Conflict**)                      | FR-004: sort only オプション名 / 料金(税込) / 登録日; ID / 税率 / 状態 display-only; list has a 登録日 column                      | Sorts ID / 名 / 税込 / 税率 / 状態; **no** 登録日 column (gap `#12`)                                   | Test to the spec: 3 sortable headers, others not clickable; 登録日 column (`YYYY/MM/DD`) present. A sortable ID/税率/状態 header is `NG`. Missing 登録日 column is `NG` (spec wins).                                                                    |
| D3  | サービス種別 filter (**Spec-only**)                           | FR-002 / G-02 FR-S001: filter axis in 詳細フィルター (API `subcategory`)                                                           | No such filter (gap `#13`)                                                                             | Case written to the spec: select in the panel, 7 values + default, counts in the active-filter badge and the banner summary.                                                                                                                            |
| D4  | 変更可否 (**Conflict**)                                       | FR-010: **read-only** text 可/不可 derived from 利用可否ルール; `主オプション契約変更可否` is the only switch                      | 変更可否 is a togglable switch that saves nowhere (gap `#16`)                                          | Test to the spec: changing the radio flips the text; the text is not clickable. A toggleable 変更可否 is `NG`. Detail shows the same text.                                                                                                              |
| D5  | サービス種別 on 自動付与 (**Conflict** with G-02.md)          | FR-008: optional for 通常 / 都度 / 自動付与                                                                                        | Same as spec                                                                                           | Test to the spec: visible and savable for all three (backend dropped `E-OPT-002`). G-02.md wording (通常・都度 only) is Open question 7 — note it, never `NG` either way.                                                                               |
| D6  | 説明文 (member-facing) has no form input                      | FR-013: detail shows 説明文; FR-006 lists no 説明文 input                                                                          | Detail shows 説明文; form has 備考 and image only                                                      | Detail: 説明文 renders when the record has one, empty state otherwise. **No** form case for 説明文. (Value must come from data the tester did not create in the UI — use a pre-existing option.)                                                        |
| D7  | 備考 max length (**Conflict**)                                | No form-level cap stated; server limit documented ≤ 2000                                                                           | `maxLength={1000}`                                                                                     | Boundary at 1000 (1001st char blocked, no silent truncation on save). A cap above 2000 or a truncated save is `NG`.                                                                                                                                     |
| D8  | 適用店舗 chips                                                | FR-013: one chip **per store** in `storeNames[]`, or 「適用店舗がありません」                                                      | One chip per applicable store                                                                          | Test to the spec (count + one chip per store). Old single-chip rule is superseded.                                                                                                                                                                      |
| D9  | 人気ランキング footer sentence                                | Known non-defect: not rendered                                                                                                     | 「Wi-Fi利用（1位）…に次ぐ人気オプション」 (mock copy)                                                  | Absence is expected. Rank row renders only when a rank exists.                                                                                                                                                                                          |
| D10 | Brand display on detail                                       | `BrandBadge` kept (project convention)                                                                                             | Plain text                                                                                             | Expect a badge; plain text not a defect either way.                                                                                                                                                                                                     |
| D11 | Success / failure toasts + query invalidation (**Spec-only**) | "Kept deliberately"                                                                                                                | Toast text only                                                                                        | Success toast + fresh data on landing; Japanese error toast on server failure (never the backend's English message).                                                                                                                                    |
| D12 | セット割設定 hidden for which brands                          | FR-005 (updated 2026-10-07): hidden when the **header store's brand** is not FIT365; the page ブランド filter does not decide      | Prototype keys it off its brand filter (`brand !== "JOYFIT"`) because it has no header store context   | JOYFIT / JOYFIT24 / YOGA / + store → hidden; FIT365 store and 全店舗（本部） → shown; ブランド filter has no effect (TC-046, 047, 099, 100, 101).                                                                                                       |
| D13 | Access-denied view (**Spec-only UI**)                         | FR-017 / 権限マトリクス: Trainer / Observer have no access; no denial UI described                                                 | Detail shows 「アクセス権限がありません」「オプションマスタの参照はトレーナー・オブザーバー権限では…」 | Menu entry hidden + direct URL denied on list, detail, create and edit. Use the prototype copy as expected text on the detail.                                                                                                                          |
| D14 | 店舗での利用 card trigger                                     | FR-020: single store picked in the header store switcher; hidden in 全店舗 view                                                    | `isStoreScoped` (store-scoped user)                                                                    | HQ/System picking one store → shown, links to `/stores/{id}?tab=contract`; 全店舗 → hidden; store-scoped Manager/Staff → their store.                                                                                                                   |
| D15 | ブランド editable on edit (**Conflict** with G-02.md FR-004)  | FR-012: locked after registration (customer qa-193)                                                                                | Locked (gap `#14`)                                                                                     | Test to the spec. G-02.md FR-004 「全項目を編集可能」 is stale — never `NG` on it.                                                                                                                                                                      |
| D16 | 会員公開用画像 upload availability                            | FR-006 text still says upload is blocked and the button disabled                                                                   | Working add/remove control                                                                             | Spec text is older than the report (presign + register marked OK 2026-09-23, FE marked OK). **Test as working**; if it turns out blocked, record `Block (B1)`. Flag the stale FR-006 sentence in Notes.                                                 |

**Ladyroom slice deltas** (G-02-B / G-02-C):

| #   | Item                                   | In spec                                                                                         | In prototype                                                                                                                                                                                                                                                                                                                                                                                                                                                      | How to test                                                                                                                    |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| LR1 | 利用できるエリア card (B, C)           | G-02 FR-002 (v9): 任意・複数, chosen from the E-02 エリアマスタ; 「販売店舗の絞り込みではない」 | One checkbox per area of the form's brand group + gender badge; `ブランドを選ぶと、そのブランドのエリアから選べます` / `{brand} のエリアはまだ登録されていません`; `エリアマスタ管理を見る`; JOYFIT 系 ⇄ FIT365 clears + `ブランドを {brand} に変えたため、選んでいたエリア（{names}）を外しました`; result line `{女性}のみのエリアを含むため、このオプションは{女性}の会員にだけ販売・付与されます（アプリ・CRM とも）`; detail read-out, `設定なし` when empty | Spec = prototype on the field; UI detail from the prototype. API: other-brand / unknown id → 400 `E-VAL-001` (`areaIds.N`)     |
| LR2 | Contradicting gender conditions (B, C) | Not stated; FR-016 implies an option that matches no one cannot be sold                         | Alert `性別の条件が合いません` + `女性のみと男性のみのエリアを両方選んでいるため、どの会員にも販売・付与できません`; save **not** blocked; detail repeats the line. (Options have no 性別制限, so this is the only conflict.)                                                                                                                                                                                                                                     | **Prototype-only**. API derives `genderCondition: nobody`. Test warn-but-save; 032 checks that such an option is never offered |
| LR3 | エリア制限 removed (B, C)              | G-02 v9: 「エリア制限設定」 redefined as 利用できるエリア                                       | Card 制約設定・エリア制限 renamed 制約設定; the four checkboxes and the detail badges are gone                                                                                                                                                                                                                                                                                                                                                                    | Test their absence. TC-022 / TC-042 / TC-018 rewritten (§2). The local spec.md FR-010 area text is stale — never `NG` on it    |

---

## 5. Coverage focus per unit

Added **on top of** `gen-testcases`' full coverage walk.

### G-02-A List

- **Real-API behaviours**
  - Header badge = **unfiltered** total; banner 「全 N 件中 M 件を抽出中」 uses real totals; both stay consistent across page changes and filter clears (`B3`).
  - Keyword: name-only partial match, case-insensitive, 50-char cap (51st char blocked or handled cleanly — no 400 toast). Searching a code (`PRO-001`) → 0 rows = expected.
  - Each filter narrows server-side and combines with AND: ブランド, 種別 (自動付与 maps to `paymentType` + `isAutoAssigned`), サービス種別 (D3), ステータス, 日割り, 店舗 (store picker loaded from `/admin/stores`, label lookup by id after reload from the URL).
  - Sort is server-side across **all pages** (`sort` = name / feeMonthly / createdAt + `order`); clicking cycles asc → desc → cleared (unsorted, no `sort` / `order`; the 登録日 desc default only applies on first open; tooltip 「クリックで解除」, FR-004) — the prototype's two-state cycle is not followed; a bookmarked `?sort=id` style URL is ignored, not an error (D2).
  - Page size 25/50/100; page beyond total after filter/page-size change resets to a valid page (Edge Case 2).
  - 店舗 column `{n}店舗` or `―`, never 「全店舗」 / `0店舗`.
  - Enum labels render Japanese (ブランド, 利用可否, サービス種別), never raw wire literals (`Fit365`, `add_cancel_only`, `hydrogen_water`).
  - 401 mid-session (expired token, then sort/filter) → standard re-login, no silent empty table.
  - Persistence: filter/sort/page state survives reload and browser back (nuqs URL state).
- **Role × action**: 新規登録 / 編集 / セット割設定 enabled for System / HQ; absent or disabled for Manager / Staff; Trainer / Observer cannot reach the list. No 削除 for any role (FR-016, SC-004).
- **Business rules**: セット割設定 vs brand filter (D12); ロッカー badge + tooltip 「…契約形態コード「{code}」…」 only on `locker_option` rows.
- **UI breakage under stress (1024px)**: 100-char full-width option name **with** the ロッカー契約種類 badge; 30-char unbroken 会計コード; 999,999,999 税込 in the price column (shown as entered); longest 利用可否 label (追加・解約・変更すべて可能) and サービス種別 labels; 50-char keyword + all 6 filters active in the banner summary and filter-count badge; 13 columns (incl. 登録日) at 1024px scroll inside the card only. Wide check ≥1440px.

### G-02-B Form

- **Real-API behaviours**
  - Server-side validation beyond the client's: name ≤ 100, 会計コード ≤ 30, 料金 ≥ 0 integer ≤ 9 digits, 税率 only 8/10, 備考 (D7), required brand / name / オプション分類 / 料金 / 税率 / 日割り計算方式 (日割り ON). Error codes (`E-VAL-001`, `E-OPT-…`) surface as a field error or **Japanese** toast, never the English message.
  - Create returns to the list and the new option (opened from the list) shows auto-numbered `OP-xxxx`; edit lands on the detail with changed values; both **persist after reload and re-login**.
  - Edit save is two calls (`PATCH` then `PATCH /active` only when the switch changed): status-only change, field-only change, both — each ends consistent. Failure of the second call must not falsely report full success.
  - `category` sent only when changed; a tier-2 option (レッスンプラン / 1DayPass / 1TimePass) has オプション分類 locked (`E-OPT-009`) — needs a pre-existing tier-2 option, opened **read-only** (see Data policy; no save).
  - `[Ladyroom]` `areaIds` empty → saved as `[]` and read back as `設定なし` (replaces the old `areaRestrictions` check, LR3).
  - 401 on submit → re-login, no false success.
  - Two-tab edit of the same option — record observed behaviour (no conflict rule specified; not `NG` alone).
- **Computed values**: 税込 is stored and shown as entered; detail 税抜金額 = ceil at both rates (1,078 @ 8% → 999; 1 @ 8% → 1; 0 → 0; 1,099 @ 10% → 1,000; 999,999,999 @ 10% → 909,090,909), checked on detail and list after save, and the edit form reopens with the same 税込 (D1).
- **Conditional UI**: FIT365 → 日割りフラグ ON; 日割り ON → 日割り計算方式 appears and is required, OFF → hidden and not sent; サービス種別 visible for all three 課金種別, default 設定しない (D5); failed submit → scroll to first invalid field + footer 「未入力の項目があります」; 変更可否 read-only text follows 利用可否ルール (D4).
- **Edit mode**: ブランド disabled with the note; ID hint 「オプションIDは変更できません」; submit 「変更を保存する」; amber impact notice on **edit only** — hidden on create (2026-10-05, deviation from the prototype).
- **Discard guard**: dirty + キャンセル / back link → 「変更を破棄しますか？」 (編集を続ける / 破棄する); clean → no dialog; after successful save → no dialog.
- **Status**: 無効/有効 switch persists; badge on list + detail (FR-011). Fixtures default to 無効.
- **Image**: add / replace / remove on a `QA-OPT` fixture; oversize and non-image file handling (including a non-image file renamed to `.png` / `.jpg`, checked by content); the direct upload to storage failing (create: registered + error toast; edit: error toast, existing image kept); the "登録済み" tile vs real thumbnail (`B1`, `B2`, D16).
- **Role gating**: Manager / Staff / Trainer / Observer opening `/options/create` or `/options/[id]/edit` directly → denied; a save attempted with a lower-role session is refused by the server.
- **UI breakage under stress (1024px)**: 100-char full-width name; 30-char unbroken 会計コード; 1000-char 備考; ≥ 8 利用できるエリア ticked, with 100-char エリア名; every required-field error visible at once; sticky footer with 未入力 message + 2 buttons; long API `userMessage` in the toast.

### G-02-C Detail

- **Real-API behaviours**
  - Every FR-006 attribute rendered read-only and matching what G-02-B saved (round-trip), both prices (FR-018), 日割り計算方式 only when 日割り ON, サービス種別 always (「―」 unset), 変更可否 text (D4).
  - 紐付け契約数 from `activeContractCount`, label （現在の契約者数） vs （割当スロット）; 人気ランキング only when a rank exists, with 「/ N オプション中」.
  - 適用店舗: count + one chip per store, or the 全店舗 note (D8).
  - 変更履歴: columns 更新日時 / 操作者 / 変更フィールド / 変更前 / 変更後, one row per changed field, `created` → 「新規作成」, empty `changedByName` → `―`, image events per `metadata.action`; **pager** (20 events per page, `page` / `limit` sent, previous page kept while loading, last page ends at N); **an edit made in G-02-B appears as new rows**; no create/edit/delete controls; a role the endpoint refuses (`403`, e.g. Staff — `B5`) sees an **error state, not an empty table**.
  - Non-existent id (`404 E-OPT-001`) → 「オプションが見つかりません」 (not a network error with 再試行); malformed id → not-found, no crash.
  - 401 while on the page / switching tabs → re-login.
- **Conditional cards**: ロッカー契約種類 header badge + card (契約形態コード = `OP-xxxx`, ロッカー管理 link); 店舗での利用 per D14; 会員公開設定 with dashed 未設定 placeholder when no image (Edge Case 5), 「登録済み」/thumbnail otherwise (`B2`), 説明文 (D6).
- **Header**: 編集 is the only action (no ⋯, no 削除) for every role; 編集 absent/disabled for Manager / Staff; Trainer / Observer see the access-denied view (D13).
- **UI breakage under stress (1024px)**: 100-char full-width name in the header next to brand, status and ロッカー badges; 30-char unbroken 会計コード / 契約形態コード; 1000-char 備考 and long 説明文; ≥ 8 利用できるエリア rows with 100-char エリア名; many store chips (long store names, wraps inside card); long before/after values and a long 操作者 name in 変更履歴; right column (status / 利用状況 / ロッカー / 店舗での利用 / その他情報) stacked at 1024px.

### Ladyroom slice — 利用できるエリア (G-02-B / G-02-C, tag `[Ladyroom]`)

- **G-02-B Form**
  - Card states: no ブランド → hint; ブランド chosen → that brand group's areas (JOYFIT sub-brands share the JOYFIT areas; FIT365 never shows JOYFIT areas), each with its gender badge (none for なし); a brand group with no area → empty hint; optional — 0 areas saves (`[]`).
  - Create and edit send `areaIds`; edit prefill = API `areaIds`; add / remove / clear round-trip to the detail; the old エリア制限 checkboxes are absent (LR3).
  - Brand change on create (brand is locked on edit, D15): inside the JOYFIT group keeps the selection; JOYFIT ⇄ FIT365 clears it + the removed notice.
  - Conflict (LR2): 女性のみ + 男性のみ areas → alert, save allowed. One status line at a time: alert → removed notice → result line.
  - `エリアマスタ管理を見る` → `/area-master`, through the discard dialog when dirty.
  - Server: a replayed other-brand / unknown area id → 400 `E-VAL-001` (`areaIds.N`), Japanese message, shown once.
- **G-02-C Detail**: 利用できるエリア read-out = API `areas` (name + badge, in order), `設定なし` when empty, result / conflict line from `genderCondition`; no エリア制限 badges; the card titled 制約設定; an area renamed / re-conditioned / deleted in the area master shows the change after reload.
- **Fixtures**: the areas come from 029 Unit G. The options the ladyroom run needs (`QA-E02-AREA-OPT-F` / `-M` / `-N`) are created here — they **cannot be deleted**, so: no extra option for the conflict case (temporarily add a 女性のみ area to `…-OPT-M`, save, check, remove it again), create them 無効, and switch to 有効 only while 032 runs its option cases.

---

## 6. Known Round 1 gaps (watch items)

The integration reports list **no open blocker**. These are carried so a failure that matches one is `Block (Bn)` rather than `NG`. Where a report has struck a row through as resolved, the treatment is "test as working; downgrade only if it really fails".

| Bn  | Item (source)                                                                                                                                       | UI behaviour in Round 1                                                          | Test treatment                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| B1  | 会員公開用画像 upload: spec FR-006 says presign has no option tag (`E-MED-011`); report `option-form` marks presign/register/delete OK (2026-09-23) | Add button expected **working**; spec text says disabled                         | Case written as working (D16). Add fails with `E-MED-011` or button disabled → `Block (B1)`.                        |
| B2  | `primaryImageUrl` / `images[].url` returned as raw S3 key (spec FR-013; report `option-detail` struck through as OK)                                | Detail may show 「登録済み」 tile instead of the image                           | Either rendering passes; record which. Broken-image icon → `NG`.                                                    |
| B3  | `includeTotalAll` / `pagination.totalAllItems` unpublished (report `option-list`, FE works around with an extra `?page=1&limit=1` request)          | Header badge and banner N are correct but cost one extra request                 | Assert values only. Wrong/stale N after filter change → `NG`; no `Block` expected.                                  |
| B4  | 変更可否 has no API field (gap `#16`, qa-109)                                                                                                       | Read-only derived text; never persisted                                          | Not a blocker — this is D4. A toggleable control is `NG`.                                                           |
| B5  | `/history` returns `403` for Staff; oldest entry of a page can have `diff = null` (report `option-detail`, qa-194 withdrawn)                        | Error state for Staff; a `null`-diff entry renders as a row without field detail | Staff 403 → error state expected (OK). Empty table for Staff → `NG`. `null`-diff row without crash → OK.            |
| B6  | Swagger types `description` / `accountCode` as `object`, `subcategory` enum lacks `null` (reports; cast in FE)                                      | None visible; runtime correct                                                    | Black-box: round-trip 備考 / 会計コード / null サービス種別 must work. Failure → `NG` (not a known gap at runtime). |

**Ladyroom slice**: the pre-flight gaps **AREA-BE** (area API not confirmed on dev) and **AREA-MOCK** (screen not reading the real API) in the 029 plan §7e apply to every `[Ladyroom]` case → `Block (AREA-BE|AREA-MOCK)`.

---

## 7. Traceability map

| FR     | Unit(s)                   | Note                                                                                       |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------ |
| FR-001 | List                      | columns incl. 登録日 (D2), locker badge, 店舗 count, header total                          |
| FR-002 | List                      | name-only keyword + 6 filters incl. サービス種別 (D3) + すべてクリア                       |
| FR-003 | List                      | result banner                                                                              |
| FR-004 | List                      | 3 sortable columns (D2), paging                                                            |
| FR-005 | List                      | セット割設定 button, JOYFIT hide (D12)                                                     |
| FR-006 | Form                      | required / optional fields, auto ID, image (D16, B1)                                       |
| FR-007 | Form (+ Detail display)   | 日割りフラグ, FIT365 auto-ON, 計算方式 required                                            |
| FR-008 | Form, List column, Detail | 課金種別 + サービス種別 (D5)                                                               |
| FR-009 | Form, Detail              | 4 usability rules                                                                          |
| FR-010 | Form, Detail              | 主オプション契約変更可否 switch, 変更可否 read-only (D4); area checkboxes superseded (LR3) |
| FR-011 | Form, List, Detail        | status switch (two-call save) + badges                                                     |
| FR-012 | Form                      | edit mode, brand lock (D15), notice, discard guard                                         |
| FR-013 | Detail                    | all cards, 適用店舗 (D8), 会員公開設定 (D6, B2)                                            |
| FR-014 | Detail                    | 紐付け契約数 labels, 人気ランキング                                                        |
| FR-015 | Detail                    | 変更履歴 tab (B5)                                                                          |
| FR-016 | List, Detail              | no 削除 anywhere (SC-004)                                                                  |
| FR-017 | List, Form, Detail        | role matrix                                                                                |
| FR-018 | Form, List, Detail        | 税込 input stored as-is, 税抜 derived with ceil (D1)                                       |
| FR-019 | List, Detail              | locker badge / card                                                                        |
| FR-020 | Detail                    | 店舗での利用 card (D14)                                                                    |

**Ladyroom slice** (not in spec.md — the source is G-02.md + E-02.md): G-02 FR-002 利用できるエリア → Form (LR1, LR2) + Detail (read-out); G-02 v9 removal of エリア制限 → Form, Detail (LR3); E-02 FR-016 sale limited to matching members → Form / Detail result line only — the sale itself is tested in 032.

Every spec FR (FR-001–FR-020) lands in ≥1 unit. **No requirement without a unit.** Left out by spec decision, not omission: G-02.md FR-006 set discounts (`/option-discount`, needs its own plan). SC-001 / SC-002 are timing targets with no dedicated case; the tester notes a noticeably slow flow.

---

## 8. Execution notes (for execute-testcases)

**Credentials** — real Cognito accounts from `src/lib/auth/demo-users.ts`, password `Password@123`. The header 「デモ: ユーザー切替」 switcher appears only when `NEXT_PUBLIC_APP_ENV=development`; otherwise use the login form. **One account = one session**: signing in on a second browser kicks the first, and CORS allows port 3000 only.

| Role        | Email                           | Use for                                                                                            |
| ----------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Headquarter | `lodu4289+headquater@gmail.com` | Primary: all create / edit / positive cases                                                        |
| System      | `lodu4289+1@gmail.com`          | Full-access spot checks; second session for the two-tab case (run it sequentially — session limit) |
| Manager     | `lodu4289+manager@gmail.com`    | Read-only list / detail; no create / edit; store-scoped D14                                        |
| Staff       | `lodu4289+staff@gmail.com`      | Same as Manager; `/history` 403 case (B5)                                                          |
| Trainer     | `lodu4289+trainer@gmail.com`    | No access (menu + direct URL)                                                                      |
| Observer    | `lodu4289+observer@gmail.com`   | No access (menu + direct URL)                                                                      |

No wrong-password/lockout case belongs to this feature. If one is added, run it last on an account no other case needs (~15 min lockout).

**Environment**: `NEXT_PUBLIC_REAL_API_URL=https://api.dev.fitness-v2.okamoto-hd.com` — **shared** with other developers and testers; **no seed reset**. The screens are on the real client, so `Block` is not available for "mock can't do it" — a real-API case that fails is `NG` unless it matches a `Bn` row.

**Data policy**

- **Options cannot be deleted** (FR-016; the API has no DELETE). Every option this run creates **stays in the shared backend**. Keep fixtures to a minimum (target ≤ 5) and reuse them.
- **Prefix**: name `QA-OPT <YYYYMMDD>-<seq> …` (e.g. `QA-OPT 20260930-01 水素水`). The stress fixture uses the same prefix, padded with full-width characters to 100.
- **Create as 無効.** An active option is visible to member option operations (A-01-01-c) and locker slot choices. Switch a fixture to 有効 only inside the case that needs it and back to 無効 in the same case. A fixture with the ロッカー category must not be made 有効 at all.
- **Never save a pre-existing option** (anything without the `QA-OPT` prefix). Opening its detail is fine; opening its edit form to _inspect_ (brand lock, tier-2 category lock) is allowed only if the case ends with キャンセル / no save. Locker (FR-019), rank, multi-store-chip, 説明文 and image-present cases use existing records **read-only**; if none exists, record `Block` with reason "no fixture data" rather than creating a fake.
- **Images**: upload only to `QA-OPT` fixtures; remove the image before cleanup where the case allows.
- **Cleanup**: every `QA-OPT` fixture ends 無効; list fixture IDs left behind in each TC doc's result notes.
- **Ladyroom fixtures** follow the [029 plan §8](../../029-equipment-management/tests/test-plan.md): areas `QA-E02-AREA-*` (created by 029 Unit G), options `QA-E02-AREA-OPT-F` / `-M` / `-N` (created here — three permanent options on top of the ≤ 5 budget; create no others for the slice). **Never add or remove areas on a pre-existing option**, and never edit a pre-existing area. Cleanup: `areaIds` → `[]` and 無効 on the three, so 029 can delete the areas; list their IDs (they stay forever).

**Known-gap policy**: failure matching a `Bn` row → `Block (Bn)`; `AREA-BE` / `AREA-MOCK` (029 §7e) → `Block (AREA-…)`; undocumented failure → `NG`. Items in the spec's "Known non-defects" table and the `prototype-gap-list.md` entries `#12`, `#13`, `#14`, `#16` (tester does not file the prototype's side) are never `NG` against the app.

**Viewport**: 1024×768 (floor) for layout/stress cases; ≥1440px for the wide check. Below 1024px out of scope.

---

## 9. Suggested order

1. **G-02-A List** (read-only) — baseline totals, existing locker/multi-store/rank records located before any fixture exists.
2. **G-02-B Form — create** — creates the `QA-OPT` fixtures (normal; FIT365 + 日割り ON; 自動付与 + サービス種別; max-length stress; image fixture).
3. **G-02-C Detail** — round-trip of every field and the price formula on fixtures; existing records for locker / rank / store-chip states; 変更履歴 `created` rows.
4. **G-02-B Form — edit** — fixtures only (status-only, field-only, both); then back to Detail → 変更履歴 for the new rows. Read-only inspection of one tier-2 option.
5. **Re-check on G-02-A** — fixtures appear with the right columns; filters incl. サービス種別; sort across pages; long-name layout.
6. **Role gating (all units)** — Manager / Staff / Trainer / Observer sessions last so they don't interrupt HQ setup.
7. **Cleanup** — every fixture 無効; record IDs.
8. **Ladyroom slice** — runs inside the cross-feature order of the 029 plan §9 (step 9, after 029 Unit G and the 023 slice): G-02-B `[Ladyroom]` creates the three QA options, then G-02-C `[Ladyroom]`. Their cleanup (`areaIds` → `[]`, 無効) waits for 029's step 13.

---

## 10. Definition of done

- [ ] Three TC docs created under `specs/026-option-management/tests/cases/` (G-02-A / G-02-B / G-02-C).
- [ ] Every FR-001–FR-020 traced to ≥1 case; D1–D16 marked in the affected cases' Notes.
- [ ] Checklist gaps fixed first: re-check the `Bn` table against the current `api-integration-output/option-*/report.md` (and any future `integration-plan.md`); resolve D16 / B1 (spec FR-006 vs report) before writing the image cases.
- [ ] Each TC doc executed once via `execute-testcases`, results (OK / NG / Block (Bn)) written back.
- [ ] All `QA-OPT` fixtures 無効, IDs listed in the TC docs (they cannot be deleted).
- [ ] TC-022 / TC-042 (G-02-B) and TC-018 (G-02-C) rewritten as `[Ladyroom]` cases; LR1–LR3 marked in Notes; run in the 029 cross-feature order; `QA-E02-AREA-OPT-*` left 無効 with `areaIds` `[]`, IDs listed.
