# Feature Specification: G-01 Main Contract Master Management

**Feature Branch**: `feat/update-contract-master`
**Created**: 2026-08-13
**Status**: Implemented (CRM screens; real API-087 via `src/lib/api-real`)
**PO Spec**: `G-01` — 主契約管理 _(Main Contract Management)_
**Source**: `contract-list.tsx` + `contract-detail.tsx` + `contract-form.tsx` (dx-fitness/fitness-crm-ui@0a73739, 9/17 design update) + `crm/requirements/G-01.md` (dx-fitness/fitness-spec@a5abfdb) + API-087 Plan Master Management (backend dev Swagger `/docs-json`)
**Revised**: 2026-09-23 — all four screens re-synced to the 9/17 prototype on top of the real API; see [Prototype re-sync 2026-09-23](#prototype-re-sync-2026-09-23); 2026-10-02 — 複製 is allowed on a 子主契約 (G-01 FR-M005), only 子主契約を作成 is blocked on it. 2026-10-02 — amount / count inputs stay keyboard-editable (Bug_No9): only `e` / `E` / `+` are refused, and a cleared 料金 stays blank. 2026-10-05 — switching ブランド away and back re-fills the returning brand's 入会時費用 defaults (Bug_No10). 2026-10-05 — an uploaded サムネイル keeps its preview when the operator goes to step 2 / 3 and back to step 1 (Bug_No11). 2026-10-05 — 親主契約名 offers only masters of the chosen ブランド and is cleared when ブランド changes, so a cross-brand parent is caught at input time instead of failing on 登録する (Bug_No12). 2026-10-05 — the list defaults to newest-created first, so a just-registered master shows at the top (QnA_No13). 2026-10-05 — text a number input cannot parse (`1+2,5` typed through an IME, `1-2`, `1..2`) is rejected with `数字を入力してください` instead of being read as a blank field (Bug_No14). 2026-10-05 — a 利用可能時間 row re-validates both times together, so emptying the second time of a row clears the first one's stale `開始時刻を入力してください` / `終了時刻を入力してください` once the row becomes a valid 休業 day (Bug_No15). 2026-10-06 — 説明 / 説明文 / 備考 never keep more than 4,000 characters after an IME commit, and the 説明 card title turns red with its error like the other two labels (Bug_No16). 2026-10-06 — the four 入会時費用 amounts are converted 税込 ⇄ 税別 like 料金: sent as 税別, prefilled / shown as 税込 (customer review comment on the integration MR; API alignment #1). 2026-10-06 — an emptied 入会時費用 that the master already held is sent as `0` on 編集 / 複製 instead of being left out, so the old amount no longer survives the save (MR !188 review comment, k.iwaki). 2026-10-29 — the plan price masters are stored 税込 (API-087 v0.14, BE MR !880 for `priceMonthly` / `suspensionFee` / `cancellationFee`; API-087 v0.10 for the four 入会時費用): every amount is sent as typed and shown / prefilled as stored, with no 税込 ⇄ 税別 conversion; this supersedes the 2026-10-06 入会時費用 conversion (API alignment #1).
**Input**: "Update the contract screens to match the latest prototype; whatever the current code has that the prototype does not must be deleted as well. Update the matching spec.md."

## Overview

主契約 (main contract / plan) masters are the HQ-owned catalogue every membership is sold from: one master carries the plan's brand, contract type, price, usage window, suspension/withdrawal rules, and member-facing publication settings. Masters form a two-level tree — a parent master plus 子主契約 (derived children such as 学生 / シニア variants; the prototype's earlier 派生マスタ label) — and once a master has contract holders it becomes read-only, so operators register a new master instead of editing a live one.

**Screens in scope**

| Screen                                                                   | Route                  | Prototype source      |
| ------------------------------------------------------------------------ | ---------------------- | --------------------- |
| 主契約管理 — 一覧                                                        | `/contracts`           | `contract-list.tsx`   |
| 主契約 詳細（基本情報 / 料金・条件 / 変更履歴）                          | `/contracts/[id]`      | `contract-detail.tsx` |
| 主契約 新規登録 / 複製（`?copyFrom=<id>`）/ 子主契約作成（`&asChild=1`） | `/contracts/create`    | `contract-form.tsx`   |
| 主契約 編集                                                              | `/contracts/[id]/edit` | `contract-form.tsx`   |

**Explicitly out of scope**: store-side plan selection (Y-02 販売設定 owns which masters a store sells), option/campaign/set-discount masters (G-02 / G-03), and the member-side contract lifecycle (A-01 会員詳細 契約タブ). The prototype's 店舗設定 step was already removed for this reason and stays removed.

## User Scenarios _(mandatory)_

### User Story 1 - Browse the plan catalogue and drill into a master (Priority: P1)

An HQ staff member opens 主契約管理 to see every plan master, narrows it by contract type / brand / store / status / companion benefit, searches by plan name, and opens a master to read its full configuration.

**Why this priority**: This is the reference capability the rest of the feature hangs off. Without it no one can find a plan, and every other workflow starts from a row in this list.

**Verification**: Load 主契約管理; confirm each row shows ID / 主契約名 / 契約タイプ / ブランド / 店舗 / 料金(税込) / 同伴特典 / 親主契約 / 契約者数 / 状態; open 詳細フィルター, apply 契約タイプ and confirm the list narrows and the banner reports `全 X 件中 Y 件を抽出中`; click a row and confirm the detail opens.

**Acceptance Scenarios**:

1. **Given** 主契約管理 is loaded, **When** no filter is applied, **Then** every master is listed with its plan code (`MC-0001`), plan name, contract-type badge, brand badge, store (特殊契約 only), tax-included price, companion-benefit badge, parent master (`└ name`), contract-holder count (`N名`, `0名` greyed), and status badge; the header badge shows the unfiltered total (`N件`).
2. **Given** 詳細フィルター is opened and a 契約タイプ / ブランド / 店舗 / ステータス / 同伴特典 filter is applied, **When** the list refreshes, **Then** only matching masters remain, the filter button shows the active-filter count, and a banner reports `全 X 件中 Y 件を抽出中` with a 条件をクリア action — the banner is the only clear action; the filter panel has no separate クリア button.
3. **Given** a plan name is typed in the search box (`契約名で検索...`), **When** the debounced query runs, **Then** the list narrows on plan name only, and the filter state is reflected in the URL so the view is shareable and survives reload.
4. **Given** a 店舗 is selected, **When** the list refreshes, **Then** the 特殊契約 masters limited to that store are listed.
5. **Given** a search or filter combination matches nothing, **When** the list renders, **Then** an empty state is shown while the search box, filters, and pagination stay mounted and usable.
6. **Given** a row's ⋯ menu is opened, **When** it renders, **Then** it offers 編集 / 複製 / 削除; 複製 is disabled with the tooltip `このプランは複製できません` on a master whose `isCopyable` is false (特殊契約) — a 子主契約 stays copyable, its copy inheriting the same 親主契約 (G-01 FR-M005) — and 編集 / 削除 follow US5 AS2 and US6 AS4.
7. **Given** a row is clicked, **When** 主契約詳細 loads, **Then** the header shows the plan name with its status and contract-type badges, and the 基本情報 / 料金・条件 tabs are available — plus 変更履歴 for a user holding the history permission.
8. **Given** a master that is not 特殊契約, **When** the 店舗 column renders, **Then** it shows `―`, even if the row carries a store.

---

### User Story 2 - Register a plan master through the 3-step form (Priority: P1)

An HQ staff member registers a new plan: basic identity and brand attributes in step 1, pricing and usage/withdrawal conditions in step 2, then reviews a summary before saving.

**Why this priority**: Nothing can be sold until a master exists. This is the entry point of the whole plan lifecycle.

**Verification**: Open 主契約 新規登録; confirm the warning banner and the 3-step stepper; confirm 主契約ID is read-only with an "auto-numbered on save" note; confirm 店舗 is disabled until 契約タイプ is 特殊契約; select a JOYFIT brand and confirm 入会金 / 登録事務手数料 appear in step 2; submit with a required field blank and confirm the error banner and the scroll to the first error; press キャンセル after typing and confirm the discard dialog; save and confirm the master appears in the list.

**Acceptance Scenarios**:

1. **Given** the create form, **When** it renders, **Then** a warning banner reads `料金や条件を変更すると、現在この契約プランに加入中の会員にも反映されます。` above the stepper (the prototype shows it in every mode), and step 1 shows 主契約ID disabled as `保存後に自動採番されます` — the form never accepts a hand-typed ID.
2. **Given** 契約タイプ is not 特殊契約, **When** step 1 renders, **Then** the 店舗 selector is disabled with the note `契約タイプが「特殊契約」の場合のみ入力できます`; **when** 契約タイプ becomes 特殊契約, **then** 店舗 becomes required, while switching away clears it. 企業 follows the same rule for 法人会員.
3. **Given** 契約タイプ is 特殊契約 and no 店舗 is chosen, **When** advancing or saving is attempted, **Then** `特殊契約の場合は店舗を選択してください` is shown and the step does not advance.
4. **Given** 他店舗利用可否 is 不可, **When** step 1 renders, **Then** 相互利用あり is switched off and disabled with the note `他店舗利用が不可のときは設定できません`.
5. **Given** a JOYFIT-family brand is selected, **When** step 2 renders, **Then** 入会金（税込） and 登録事務手数料（税込） are offered; **given** FIT365, **then** セキュリティ管理／施設メンテナンス料（税込） and 会員カード発行料（税込） are offered instead (qa-185 §1: one merged charge, two inputs per brand); **given** no brand yet, **then** neither pair is rendered and a hint explains that choosing the brand in step 1 reveals them. With a brand chosen, a `ブランド費用設定を見る →` link (brand view permission only) opens the brand's 費用 tab, going through the discard confirmation.
6. **Given** a brand is selected while 年齢制限（下限） is empty or still on the previous brand's default, **When** the brand changes, **Then** it follows the new brand's default (JOYFIT系 15 / FIT365 16); a value the operator typed themselves is never overwritten.
7. **Given** 主契約名 / 契約タイプ / ブランド / 料金（税込） / 税率 / 利用開始日 are missing, **When** the step is advanced or 登録する is pressed, **Then** validation messages appear and the view scrolls to the first invalid field; on a failed 登録する the banner `入力内容に不備があります。未入力の必須項目を確認してください。` is also shown and the form returns to the step owning the first error. No master is created.
8. **Given** a 料金 of more than 9 digits or a negative value, **When** validation runs, **Then** it is rejected with a 0円以上・9桁以内 message.
9. **Given** 規約 is set, **When** the options render, **Then** they come from the Y-04 規約文書管理マスタ (excluding deleted and 適用終了 documents) — never free text.
10. **Given** a fresh create form, **When** step 2 renders, **Then** every 利用可能時間 row (月〜日・祝日) starts at `00:00 〜 23:59` with 終日 off, and ステータス starts at 無効.
11. **Given** step 3, **When** the summary renders, **Then** it shows 基本情報 / ブランド・属性 / 料金・条件 / 対象制限 / ステータス, with 主契約ID as `保存後に自動採番` and the 料金・条件 card listing 料金（税込） / 休会時請求金額（税込） / 違約金（税込） / 税率 / 会計コード / 利用開始日 / 回数上限 / 休会可能月 / 退会可能月 plus the brand's 入会時費用.
12. **Given** the form has unsaved input, **When** キャンセル, the back link, the sidebar, or browser back is used, **Then** the dialog `変更を破棄しますか？` (編集を続ける / 破棄する) asks before leaving.

---

### User Story 3 - Duplicate an existing master as the basis for a new one (Priority: P1)

An HQ staff member copies a master (from the list row menu or the detail header) into a prefilled create form, renames it, adjusts what differs, and saves it as a new master.

**Why this priority**: G-01 FR-M004 makes a master with contract holders read-only, so "change a live plan" is operationally always "duplicate, adjust, activate". This is how plan revisions actually happen.

**Verification**: Choose 複製 on a row, confirm the form opens as `主契約 複製（<主契約ID>）` with every field prefilled, the name suffixed `（複製）`, the copy warning, and a 複製設定 card showing the read-only コピー元ID; save and confirm a new master is created with a freshly numbered ID.

**Acceptance Scenarios**:

1. **Given** 複製 is chosen on a list row or on the detail header, **When** the form opens, **Then** it is the create form at `/contracts/create?copyFrom=<id>` with the source master's values prefilled and the title `主契約 複製（<主契約ID>）`.
2. **Given** the duplicate form, **When** it renders, **Then** the plan name is the source name suffixed `（複製）`, the banner reads `<主契約ID> の内容をコピーしました。コードは必ず変更してください。`, and 主契約ID still reads `保存後に自動採番されます` because the copy is a new master.
3. **Given** the duplicate form, **When** step 1 renders, **Then** ブランド and 親主契約名 are read-only with `複製元のブランドを引き継ぎます（…）` / `複製元の親主契約を引き継ぎます` (API-087's copy `overrides` carries neither — prototype-gap-list #10), and **when** step 2 renders, **Then** a 複製設定 card shows コピー元ID read-only with `複製元の主契約ID（<主契約ID>から複製）`.
4. **Given** the duplicate is saved, **When** `POST /admin/plans/{planId}/copy` succeeds, **Then** a new master is created with a system-assigned ID and 0 contract holders, a toast confirms it, and the user returns to 主契約管理.
5. **Given** 複製 is invoked for an id that no longer exists, **When** the page loads, **Then** an empty/error state with a retry action is shown instead of a blank form.
6. **Given** the detail header, **When** 子主契約を作成 is chosen (G-01 FR-M007 — same permission as 複製; disabled with `このプランは複製できません` when the master is not copyable or is itself a 子主契約), **Then** the create form opens at `/contracts/create?copyFrom=<id>&asChild=1` titled `主契約 子主契約作成（<主契約ID>）`, prefilled like a 複製 but named `（子主契約）`, with 親主契約 locked to the source master (`元の主契約を親主契約に設定します`), the banner adding `親主契約に「<name>」を設定しています。`, and the copy saved with `asDerived: true`.

---

### User Story 4 - Read a master's full configuration (Priority: P1)

Any authorised staff member opens a master to read its identity and publication settings, its pricing and conditions — all read-only. The change history is narrower: it is available to System / Headquarter / Manager only.

**Why this priority**: G-01 FR-M003 requires every FR-M002 field to be viewable read-only; this is the screen operators verify a plan against before selling or amending it.

**Verification**: Open a master; on 基本情報 confirm the left column cards (基本情報 / 説明 / 会員公開設定) and the right column cards (status, 料金・利用状況, 契約マスタの関係); on 料金・条件 confirm 料金 with the brand's own 入会時費用 pair, 利用条件 with the per-day usage hours (including 祝日), 休会・退会, and 対象制限; on 変更履歴 confirm the diff rows.

**Acceptance Scenarios**:

1. **Given** the 基本情報 tab, **When** it renders, **Then** it shows 主契約ID (the plan code) / 主契約名 / 旧コード / 契約タイプ / 店舗 / ブランド / 他店舗利用可否 (可 / 不可) / 相互利用 / 主契約変更可否 / 同伴特典 / コピー元主契約, where 店舗 names the target store for 特殊契約 only and reads `―` otherwise, and コピー元主契約 links to the master this one was duplicated from as `name（主契約ID）` or reads `―` (the prototype's 変更前主契約, relabelled per API-087 v0.9 — prototype-gap-list #11).
2. **Given** the 説明 card, **When** the master has no description, **Then** the card still renders and reads `―`.
3. **Given** the 会員公開設定 card, **When** it renders, **Then** it shows 会員公開用主契約名, 企業, 規約, 説明文, and the thumbnail — with a 未設定 placeholder when no image is set.
4. **Given** the right column, **When** it renders, **Then** the status card carries 作成 / 更新 timestamps, 料金・利用状況 shows 料金（税込） / 休会時請求額 / 現在の契約者数, and 契約マスタの関係 shows exactly two entries — 親主契約 and `子主契約（N件）` — each as `name（主契約ID）` links, or なし when there is none.
5. **Given** 契約マスタの関係 lists a parent or a 子主契約, **When** that entry is clicked, **Then** the detail screen of that master opens.
6. **Given** the 料金・条件 tab, **When** the 入会時費用（ブランド費用・税込） block renders, **Then** it shows only the master's brand's own two items, each labelled `（税込）`; items of the other brand are not rendered at all, and a user holding the brand view permission gets a `ブランド費用設定を見る →` link to the brand's 費用 tab (Y-07 FR-002).
7. **Given** the 料金・条件 tab, **When** 利用可能時間（曜日別） renders, **Then** each of the eight rows — 月〜日 plus 祝日 — shows 終日（24時間）, its from–to window, or 休業 for a day the API stores as closed.
8. **Given** the 変更履歴 tab, **When** it renders, **Then** each changed field of each history entry is one row of 更新日時 / 変更者 / 変更フィールド / 変更前 → 変更後, with ステータス and 新規作成 rendered as badges, paginated 20 entries per page.
9. **Given** a user without the history permission (Staff and below), **When** the detail screen loads, **Then** the 変更履歴 tab is not rendered at all, and requesting `?tab=history` directly falls back to 基本情報.

---

### User Story 5 - Edit a master that has no contract holders (Priority: P2)

An HQ staff member corrects a master that nobody has contracted yet — a typo, a price before launch, a wrong condition — through the same 3-step form in edit mode.

**Why this priority**: Editing is only legal on masters with zero holders (FR-M004), so it is the narrower complement of US3, not the main revision path.

**Verification**: Open 編集 on a 0-holder master and confirm all values are loaded and 主契約ID is read-only; confirm the header 編集 button is disabled with a tooltip on a master that has holders, and that reaching `/contracts/[id]/edit` directly on such a master shows the block message instead of the form.

**Acceptance Scenarios**:

1. **Given** a master with 0 contract holders, **When** 編集 is opened, **Then** the form is prefilled from the master, titled `主契約 編集`, with the back link `主契約詳細に戻る`; 主契約ID shows the master's own code, and ブランド / 親主契約名 are read-only with `登録後は変更できません`.
2. **Given** a master with one or more contract holders, **When** the detail header and the list row menu render, **Then** 編集 is disabled with the tooltip `契約者が存在するため編集できません。新規マスタを登録してください`.
3. **Given** a master with contract holders, **When** `/contracts/[id]/edit` is opened directly by URL, **Then** the same block message is shown and no form is rendered.
4. **Given** a master with contract holders, **When** an update request is replayed against the API, **Then** it is rejected (409 `E-PLN-001`) — the guard is not UI-only.
5. **Given** a valid edit, **When** 変更を保存する succeeds, **Then** the list and detail caches are invalidated and the user lands back on the master's detail page; キャンセル and the back link also return to the detail page (through the discard dialog when there are unsaved changes).

---

### User Story 6 - Delete a master that is safe to remove (Priority: P2)

An HQ staff member removes a master that was never used — no contract holders and no 子主契約 — from the list row menu or the detail header.

**Why this priority**: G-01 FR-M006 exists so mistakes and abandoned drafts can be cleaned up; it is guarded tightly enough that it is never part of routine operation.

**Verification**: On a master with 0 holders and 0 children, choose 削除, confirm the dialog names the master and warns it cannot be undone, confirm the row disappears; on a master with holders or children confirm 削除 is disabled with a tooltip stating both counts.

**Acceptance Scenarios**:

1. **Given** a master with 0 contract holders and 0 子主契約, **When** 削除 is chosen from the list, **Then** a dialog titled `主契約を削除しますか？` reads `「<name>」を削除します。この操作は元に戻せません。`; **when** chosen from the detail header, **then** it is titled `主契約マスタを削除しますか？` and reads `…この操作は取り消せません。` (the prototype words the two differently).
2. **Given** the dialog is confirmed from the list, **When** deletion succeeds, **Then** the toast `「<name>」を削除しました` confirms it, the list refetches, and the user stays on the list.
3. **Given** the dialog is confirmed from the detail header, **When** deletion succeeds, **Then** the toast reads `主契約マスタ「<name>」を削除しました` and the user is returned to 主契約管理.
4. **Given** a master with contract holders **or** 子主契約, **When** the delete action renders, **Then** it is disabled with a tooltip (not a native `title`) reporting `契約者 N名・子主契約 M件が存在するため削除できません`. On the list the counts come from the `contracts/count` probe fired when the ⋯ menu opens; until it answers, 編集 / 削除 stay disabled with `契約者数を確認中です`.
5. **Given** such a master, **When** a delete request is replayed against the API, **Then** it is rejected (409 `E-PLN-002` / `E-PLN-003`) and the backend's message is toasted.
6. **Given** the delete dialog, **When** it renders, **Then** it asks only for confirmation — no 削除理由 input, matching both the prototype and the API contract.

### Edge Cases

- A filter combination matching nothing → empty state with the toolbar, filters, and 条件をクリア all still operable, so the user is never trapped.
- A master that is its own would-be parent → excluded from the 親主契約名 options.
- A parent of another brand → never selectable: API-087 rejects it on save (400 `E-VAL-001` `parentPlanId must name a live plan of the same brandEnum`), so the form MUST catch it at input time, not on 登録する (Bug_No12). 親主契約名 stays disabled with `先にブランドを選択してください` until ブランド is chosen, then offers only masters of that brand (`brandEnum` sent on the list query); switching ブランド clears an already chosen 親主契約 back to `なし`.
- 特殊契約 downgraded to another contract type → the store is cleared in the form; a store sent for a non-特殊契約 type is rejected by the API (400 `E-PLN-007`).
- Brand switched in step 1 → the other brand's two 入会時費用 values are cleared so a stale amount cannot be saved. Clearing them also resets the fields to untouched, so switching back (e.g. FIT365 → JOYFIT → FIT365) re-fills each pair with its brand's 費用 defaults on step 2 — whatever else was edited on step 1 in between. The pair MUST NOT be left blank because it was prefilled on an earlier visit (Bug_No10).
- 休会可能月 / 退会可能月 left blank → sent as null and rendered `―`, distinct from `0ヶ月`; re-saving with the field emptied clears it rather than keeping the old amount.
- 休会時請求金額 left blank → the create body omits it (the API defaults it from the brand, currently 0); an edit sends `0`, because `UpdatePlanDto.suspensionFee` is non-nullable (BE !526) and omitting it would keep the old amount. The detail then reads `¥0`. The original G-01 spec (FR-M002) says nothing about clearing this field.
- 入会時費用 (入会金 / 登録事務手数料 / 会員カード発行料 / セキュリティ管理／施設メンテナンス料) left blank → the four are non-nullable in `UpdatePlanDto` (a blank cannot travel as `null`) and **omitting** a field on update keeps the stored amount. So: 新規登録 omits a blank one (the API then fills it from the brand's 費用 default); 編集 / 複製 send `0` when the master (or the 複製 source) **already held an amount** and the operator emptied it — step 3 shows `¥0` and the detail reads `¥0` after saving; when the master held no amount and the field stays blank, nothing is sent and step 3 shows `―`. 複製 `overrides` follow the same rule against the source's prefilled values. The G-01 requirement doc and the prototype do not say what an emptied field means; this follows the MR !188 review comment (「空欄の場合は 0円として送信」).
- An amount or count input already holding a value (typed, brand-prefilled, or copied from the 複製 source) → Backspace / Delete / arrow / Home / End keys edit it like any text box, and select-all + Backspace empties it; only the exponent characters `e` / `E` / `+` are refused (typed or pasted). Emptying 料金 on a 複製 / 子主契約作成 / 編集 form leaves it blank — it MUST NOT snap back to the source value — and the save is then blocked with `料金を入力してください` (Bug_No9).
- Text a number input cannot parse (`1+2,5` or `１＋２` typed through an IME — the `e` / `E` / `+` key guard never sees IME keystrokes — or `1-2`, `1..2`) → the field is invalid, not blank: it shows `数字を入力してください` and blocks 次のステップ / save, in the optional fields (年齢制限, 回数上限, 休会・退会 counts, optional amounts) as well as in 料金. The typed text stays on screen so the operator can correct it; emptying the input clears the error (Bug_No14).
- 説明 / 説明文 / 備考 at their 4,000-character limit (typed, pasted, or prefilled by 編集 / 複製 with a longer stored value) and more text entered through an IME (Japanese or Vietnamese) → while the composition is open the browser does not apply `maxLength`, so the counter can read `4001/4000` and `4000文字以内で入力してください` shows for that moment; once the text is committed (Enter, conversion, or leaving the field) the field MUST hold at most 4,000 characters, the counter MUST read `4000/4000` and the message MUST be gone. All three fields MUST behave the same, and the error colours each field's title — the 説明 card title included (Bug_No16).
- 違約金 left blank → stored as null, which API-087 defines as "compute dynamically from the remaining term", not "no penalty".
- A 利用可能時間 row with both times blank (and 終日 off) → saved as 休業 (`isClosed: true`). It is a valid row: no message shows on it and 次のステップ is allowed. A row is validated as one unit whenever either time (or 終日) changes — after clearing one time (which shows `開始時刻を入力してください` / `終了時刻を入力してください`) and then the other, that message MUST disappear; a message MUST NOT stay on screen for a row the form then accepts (Bug_No15). Only one blank time, or an end at or before the start, blocks 次のステップ.
- A list query failing → the table keeps its previous rows, the toolbar stays usable, and the backend's message is toasted.
- A saved plan whose サムネイル upload fails → the plan stays saved and the picture error is toasted on its own.
- A サムネイル file that is not JPG / PNG (WebP included) → refused before any upload with `JPG・PNG形式の画像を選択してください`, whether it was picked through the file dialog or **dropped** onto the zone; the picker's `accept` filter never sees a dropped file, so the type check must not rely on it.
- サムネイル uploaded on step 1, then the operator moves to step 2 / 3 and back → step 1 still previews the uploaded picture (with its remove button). The form only holds the picture's `s3Key`, which an <img> cannot load (the asset endpoint needs the bearer token), so the preview of a fresh upload MUST outlive step 1 leaving the screen; the frame MUST NOT fall back to the bare key and show a broken-image icon. Same on 複製 / 子主契約作成 / 編集 after replacing the source's picture (Bug_No11).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST list plan masters with plan code, plan name, contract type, brand, store (特殊契約 only), tax-included price, companion-benefit flag, parent master, contract-holder count, and status, and MUST offer sorting on ID / 主契約名 / 契約タイプ / 料金 / 状態. 契約者数 is sortable server-side through `sort=contractCount` (accepted by API-087's `sort` enum since 2026-09-30); it MUST NOT be sorted in memory, because that would only order one page. With no column sort chosen (first load, 条件をクリア, or a sort cleared by the third header click) the list MUST be ordered by 作成日時 descending (`sort=createdAt&order=desc`), so a newly registered master appears first; no header shows an active sort arrow in that state (QnA_No13 — the original G-01 spec does not define a default order).
- **FR-002**: System MUST support the nine contract types `general / oneDay / family / kids / student / corporate / welfare / prepaid / special` (labels 通常会員 / 1Day Pass / 家族会員 / キッズ会員 / 学生会員 / 法人会員 / 福利厚生 / プリペイド会員 / 特殊契約) and the five brands `JOYFIT / JOYFIT24 / JOYFIT YOGA / JOYFIT+ / FIT365`, and no others.
- **FR-003**: System MUST search plan masters by plan name, and MUST filter by contract type, brand, store, status, and companion benefit.
- **FR-004**: The 複製 action (list row, detail header, and the `?copyFrom=` create route) MUST be disabled with `このプランは複製できません` when the master's `isCopyable` is false. A 子主契約 MUST NOT be blocked from 複製: the copy is a sibling that inherits the same 親主契約 (G-01 FR-M005). 子主契約を作成 (`&asChild=1`) MUST additionally be blocked on a 子主契約, since the tree is two levels deep.
- **FR-005**: System MUST auto-number 主契約ID on save and MUST NOT expose any input that accepts a hand-typed ID.
- **FR-006**: System MUST require 店舗 exactly when 契約タイプ is 特殊契約 and 企業 exactly when it is 法人会員, MUST disable each field otherwise, and MUST clear it when the type changes away.
- **FR-007**: System MUST require 主契約名, 契約タイプ, ブランド, 料金（税込）, 税率, and 利用開始日; 料金 and every other amount MUST be a non-negative integer of at most 9 digits. Every numeric input MUST refuse the exponent characters `e` / `E` / `+` and MUST otherwise accept normal keyboard editing (Backspace, Delete, arrows, Home / End, select-all), so a value can be corrected or cleared by keyboard alone. Text the browser cannot parse as a number (`validity.badInput`) MUST be rejected with `数字を入力してください`; it MUST NOT be treated as an empty value (Bug_No14).
- **FR-008**: System MUST render exactly the chosen brand's two 入会時費用 inputs — 入会金 / 登録事務手数料 for the JOYFIT family, セキュリティ管理／施設メンテナンス料 / 会員カード発行料 for FIT365 — and the detail screen MUST show only the brand's own pair, labelled 税込. Each amount is entered 税込 and MUST reach the API as typed (the API stores it 税込, API-087 v0.10); the detail and the edit / 複製 prefill MUST show the stored value as is. Both screens MUST offer the `ブランド費用設定を見る →` link to the brand's 費用 tab to users holding the brand view permission. An amount the operator empties on 編集 / 複製 while the master (or source) held one MUST be sent as `0` — omitting it would keep the old amount — and step 3 MUST show `¥0`; an amount that was never set and stays blank MUST NOT be sent.
- **FR-009**: System MUST default 年齢制限（下限） from the selected brand (JOYFIT系 15 / FIT365 16) and MUST NOT overwrite a value the operator typed themselves.
- **FR-010**: System MUST link 規約 to a document from the Y-04 規約文書管理マスタ, excluding deleted and 適用終了 documents, rather than accepting free text.
- **FR-011**: System MUST capture 利用可能時間 per day of week plus 祝日 (eight rows; qa-185 §4), with a 終日 toggle that locks that day to 00:00〜24:00; a new form starts every row at 00:00〜23:59 with 終日 off.
- **FR-012**: System MUST expose the master's relationships — parent master and each 子主契約 with its plan code, each linking to that master's detail.
- **FR-013**: System MUST block editing a master that has one or more contract holders, in the UI (disabled action with reason, plus a block message on direct URL access) **and** at the API (409).
- **FR-014**: System MUST block deleting a master that has contract holders or 子主契約, in the UI (disabled action reporting both counts) **and** at the API (409). Deletion MUST be confirmed through a dialog that requires no reason text.
- **FR-015**: System MUST provide a 複製 action from both the list row menu and the detail header that opens the create form prefilled from the source master, with the name marked as a copy, the source shown as コピー元ID, and the copy warning. The detail header MUST also offer 子主契約を作成 (G-01 FR-M007), the same prefilled copy with 親主契約 set to the source master.
- **FR-016**: System MUST expose a per-master 変更履歴 showing 更新日時 / 変更者 / 変更フィールド / 変更前 / 変更後. The tab MUST be restricted to System / Headquarter / Manager, matching API-087 §9 (staff → `E-AUTH-103`); G-01's permission matrix has no row for 変更履歴, and the three other master screens that do (D-02 / Y-12 / Y-15) all restrict it, so the API was followed.
- **FR-017**: The list MUST keep search, filter, sort, page, and page-size state in the URL search params so views are shareable and survive reload.
- **FR-018**: The list MUST show a filtered-results banner comparing the pre-filter total against the filtered total, with a 条件をクリア action, and MUST provide a page-size selector.
- **FR-019**: 新規登録 / 編集 / 複製 / 削除 / 変更履歴 MUST each be gated on the user's permission, with denied or blocked controls explaining why; a gated tab is hidden rather than shown disabled.
- **FR-020**: A filtered-to-empty list MUST keep its search box, filters, and clear action mounted and operable.
- **FR-021**: The create / 複製 / 子主契約作成 / 編集 form MUST ask `変更を破棄しますか？` before any exit while it holds unsaved input, and MUST show the form-level error banner when a save fails validation.
- **FR-022** _(added 2026-11-19, ladyroom — G-01 FR-M002 「利用できるエリア」)_: The form MUST offer 利用できるエリア (optional, multiple) chosen from the E-02 FR-016 area master, limited to the brand group of the selected ブランド; 複製 / 子主契約作成 MUST inherit the source's areas; the detail MUST show them read-only with the resulting sale condition. See [Ladyroom slice — 利用できるエリア](#ladyroom-slice--利用できるエリア-added-2026-11-19).

### Key Entities _(include if feature involves data)_

- **Main Contract Master (主契約マスタ, `PlanDetailDto`)**: `planId`, `planCode` (主契約ID), `name`, `legacyCode` (旧コード), `contractType`, `storeId` (特殊契約 only), `brandEnum`, `otherStoreAvailable` (他店舗利用可否, boolean), `isMultiUsable` (相互利用), `isChangeable` (主契約変更可否 / 変更可否), `hasCompanionBenefit`, `isCopyable`, `copiedFromPlanId/Code/Name` (コピー元主契約), `isActive`.
- **Publication settings (会員公開設定)**: `nameForMember`, `corporateId` / `corporateName` (企業, from the corporate master), `termsId` / `termsName` (規約), `publicDescription` (説明文), `images[]` (サムネイル — the `plans/{planId}/images` sub-resource), `remarks` (備考).
- **Pricing (料金)**: 料金（税込） entered on the form → `priceMonthly` (税込, API-087 v0.14), `suspensionFee` / `cancellationFee` (税込; `cancellationFee` null = dynamic), `taxRate`, `accountingCode`, and the brand pair `enrollmentFee` / `registrationFee` or `maintenanceFee` / `cardIssueFee` (税込 since API-087 v0.10). Every amount is stored, entered and shown 税込.
- **Conditions (利用条件・休会退会・対象制限)**: `usageStartDate`, `monthlyVisitLimit`, `usageHours[]`, `suspendableMonths`, `cancellationFeeMonths` (退会可能月), `prepaidMonths` (初回支払月数), `sameMonthWithdrawalAllowed`, `minAge` / `maxAge`, `limitOfSex`, `hasBilling`.
- **Master relationships**: `parentPlanId` / `parentPlanName`, `derivedChildren[]` (`planId`, `name`, `planCode`), `contractCount`, `derivedChildCount`.
- **Available areas (利用できるエリア, 2026-11-19)**: `areaIds[]` (E-02 FR-016 area ids of the plan's brand group; `[]` = none), `areas[]` (resolved `id` / `areaCode` / `name` / `genderCondition`, a deleted area dropped), and the derived `genderCondition` (`none` / `female_only` / `male_only` / `nobody`) computed from the areas' conditions **and** `limitOfSex` — who the master may be sold / granted to.
- **Usage hour (`PlanUsageHourDto`)**: `dayOfWeek` (月〜日 or 祝日), `openTime`, `closeTime`, `isClosed`; 終日 = 00:00〜24:00.
- **Change history entry**: `changedAt`, `changedByName`, `eventType`, `diff` (field → `prev` / `next`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can go from 主契約管理 to any master's full configuration in one interaction (row click), and to a prefilled duplicate form in two.
- **SC-002**: 100% of masters with one or more contract holders are non-editable — through the UI and through a replayed API request.
- **SC-003**: 100% of masters with contract holders or 子主契約 are non-deletable — through the UI and through a replayed API request.
- **SC-004**: 0% of non-特殊契約 masters can be saved with a store link, through the UI or a replayed request.
- **SC-005**: 100% of saves missing 主契約名 / 契約タイプ / ブランド / 料金 / 税率 / 利用開始日 are blocked with a message and a scroll to the first error, before any data changes.
- **SC-006**: Filtering the list to zero rows still leaves the search box, filters, and 条件をクリア operable 100% of the time.
- **SC-007**: A shared list URL reproduces the same searched, filtered, sorted, paginated view for another user with the same permissions.
- **SC-008**: Every field the form writes is readable on the detail screen — no write-only fields (コピー可否 excepted: it is carried unchanged, see Assumptions).

## API alignment _(API-087 Plan Master Management)_

All four routes read and write the real API through the generated client (`src/lib/api-real`) and use its DTOs directly — no mapping layer. Endpoints: `GET /admin/plans` (list, parent picker), `GET /admin/plans/{planId}` (detail, form prefill), `GET /admin/plans/{planId}/contracts/count` (list row guard, on menu open), `GET /admin/plans/{planId}/history`, `POST /admin/plans`, `PATCH /admin/plans/{planId}`, `POST /admin/plans/{planId}/copy` (複製 / 子主契約作成), `DELETE /admin/plans/{planId}`, `POST · DELETE /admin/plans/{planId}/images` + `POST /media/presign` (サムネイル), and the pickers `GET /admin/stores[/{id}]`, `GET /admin/terms[/{id}]`, `GET /admin/corporates`. Status and open backend items per endpoint are tracked in `api-integration-output/{contracts,contract-detail,contract-form}/report.md`.

### Where the screen follows the API rather than the prototype

The prototype is a UI reference, not a logic contract; where its data model disagrees with API-087 the API was followed:

1. **料金 is entered 税込, as the API stores it** — G-01 FR-M002 and the prototype label the input 料金（税込）, and `priceMonthly` is tax-inclusive (API-087 v0.14, BE MR !880, 2026-10-27; existing rows were converted by contracts migration 050). The form sends the typed value; edit / 複製 prefill, the list 料金(税込), the detail and step 3 show the stored value as is — no floor / ceil derivation. `suspensionFee` / `cancellationFee` are 税込 too and are sent as typed. **The four 入会時費用 amounts** (`enrollmentFee` / `registrationFee` / `cardIssueFee` / `maintenanceFee`) are tax-inclusive in `CreatePlanDto` / `UpdatePlanDto` / `PlanDetailDto` (API-087 v0.10, copied from API-074 `FeeAmount.priceInclTax`): sent as typed (e.g. 入会金 ¥11,000 @10% → `enrollmentFee: 11000`) and shown as stored in the edit / 複製 prefill and the detail's 入会時費用（ブランド費用・税込） block; a blank amount on 新規登録 stays out of the body (not `0`, so the brand default still applies), while on 編集 / 複製 an amount that was stored and then emptied is sent as `0` (see Edge Cases, 入会時費用 left blank). The 変更履歴 diff shows the stored values, so 料金 and the four 入会時費用 labels read `（税込）`. (History: the input was labelled 料金（税別） until 2026-10-02; from 2026-10-02 / 2026-10-06 the form converted 料金 and the 入会時費用 税込 ⇄ 税別 per qa-181 §2 and the MR review comment — superseded 2026-10-29 by the API change.)
2. **年齢制限 is two numbers** — `minAge` / `maxAge` instead of the prototype's single free-text field; the brand default seeds 下限. Raised with the prototype owner.
3. **企業 is a corporate-master picker** (`corporateId`, qa-185 §5), not the prototype's static list.
4. **ブランド / 親主契約 are immutable** after creation (qa-186 §3) and are not part of the copy `overrides` (qa-187 §1), so they are read-only on 編集 **and** on 複製 — prototype-gap-list #10.
5. **コピー元主契約 instead of 変更前主契約** on the detail (API-087 v0.9 GAP-172) — prototype-gap-list #11.
6. **利用可能時間 can be 休業** — `isClosed` has no prototype counterpart; a row with both times blank is saved closed, and the detail renders it as 休業.
7. **契約者数 sorts on the server** — API-087's `sort` enum accepts `contractCount` (2026-09-30), so the column is sortable as in the prototype; see FR-001.
8. **Row guard via probe** — the list DTO has no `derivedChildCount`, so the ⋯ menu probes `contracts/count` before enabling 編集 / 削除.
9. **After 登録 / 複製 the user returns to the list**, as in the prototype; after 編集, to the detail.
10. **Default order is newest first** — the prototype starts on ID ascending, which puts a new master on the last page; the list instead defaults to 作成日時 descending (QnA_No13), see FR-001.

### 複製 deviations

1. **主契約ID on the 複製 form** — the prototype fills that read-only field with the source master's code, which contradicts G-01 FR-M002's auto-numbering. The field keeps its `保存後に自動採番されます` note and the source is surfaced as コピー元ID in the 複製設定 card instead.
2. **親主契約 on the 複製 form** — G-01 FR-M005 reads 「主契約IDは新規採番。親主契約IDに複製元IDを自動設定する」, but API-087 was followed: `CopyPlanDto.asDerived` defaults to `false` ("inherits the source parent"), and only 子主契約作成 sends `asDerived: true`; `copiedFromPlanId` records the origin either way.

## Prototype re-sync 2026-09-23

All four screens were compared against `fitness-crm-ui@0a73739` (9/17). Changes applied, including the earlier detail pass of the same day:

| Screen | Area              | Change                                                                                                                                                                                              |
| ------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 一覧   | Table             | ID column shows `planCode`; 契約者数 column added between 親主契約 and 状態; contract-type labels 1Day Pass / 福利厚生                                                                              |
| 一覧   | Row menu          | 複製 disabled with `このプランは複製できません` when `isCopyable` is false; delete-blocked wording 子主契約                                                                                         |
| 一覧   | Filters           | `すべてクリア` button removed — clearing is the result banner's 条件をクリア only                                                                                                                   |
| 詳細   | Header            | 子主契約を作成 between 複製 and 編集; delete-blocked reason as a tooltip                                                                                                                            |
| 詳細   | 基本情報          | 店舗 after 契約タイプ; 主契約ID shows `planCode`; 他店舗利用可否 可 / 不可; 説明 card always rendered (`―` when empty)                                                                              |
| 詳細   | 契約マスタの関係  | 派生マスタ → 子主契約, entries link to their detail; the extra コピー元ID row removed (the origin is on 基本情報 as コピー元主契約)                                                                 |
| 詳細   | 料金・条件        | Brand's own 入会時費用 pair, 税込, with `ブランド費用設定を見る →`; 祝日 row                                                                                                                        |
| 詳細   | Delete dialog     | Detail wording `主契約マスタを削除しますか？` / `この操作は取り消せません。` / toast `主契約マスタ「…」を削除しました`                                                                              |
| Form   | Frame             | Warning banner in every mode (new create included); copy banner ends `コードは必ず変更してください。`; form-level error banner on a failed save; stepper left-aligned; edit button `変更を保存する` |
| Form   | Navigation        | `変更を破棄しますか？` guard on キャンセル / back link / sidebar / browser back; 編集 returns to the detail (`主契約詳細に戻る`)                                                                    |
| Form   | Step 1            | Edit-lock note `登録後は変更できません`; 相互利用 note `他店舗利用が不可のときは設定できません`                                                                                                     |
| Form   | Step 2            | コピー可否 control removed; 休業 hint under 利用可能時間 removed; `ブランド費用設定を見る →` link added; 複製設定 note `複製元の主契約ID（…から複製）`                                              |
| Form   | Step 3            | 料金・条件 order and labels as the prototype (休会時請求金額（税込） / 違約金（税込））; 説明 card removed                                                                                          |
| Form   | New-form defaults | ステータス starts 無効; 利用可能時間 starts 00:00〜23:59 with 終日 off                                                                                                                              |

## Removed against the prototype

Fields and controls earlier implementations had that the prototype does not, all removed rather than left dormant:

- **`code` (コード)** — the prototype has no コード column, field, or search target, and API-087 has only `legacyCode` (旧コード). Removed from list, detail, form, and search.
- **Extra list columns** (旧コード / 利用開始日 / 休会時請求額 / 回数上限 / 税率 / 休会可能月 / 退会可能月 / 他店舗利用 / 適用店舗) — the list carries the prototype's ten columns plus the action menu.
- **`store_range` / `family_contract_allowed` / `suspension_monthly_limit` / `usage_schedule` / a second 変更可否 field** — in neither the prototype nor API-087.
- **削除理由 (delete reason)** — the prototype's delete dialog only confirms, and API-087's `DELETE` takes no body.
- **現在の契約者数 duplicated in 基本情報 and 契約マスタの関係** — shown once, in 料金・利用状況.
- **2026-09-23**: the list filter panel's `すべてクリア`; the detail's コピー元ID row in 契約マスタの関係; the form's コピー可否 control; the 休業 hint under 利用可能時間; step 3's 説明 card.

## Ladyroom slice — 利用できるエリア (added 2026-11-19)

**Sources**: `G-01.md` `261112_v12` FR-M002 「利用できるエリア」, `E-02.md` `261109_v6` FR-008 / FR-016 (`fitness-spec@9e0e07e`); prototype `dx-fitness/fitness-crm-ui@9428dc2` (design PR #42, 11/12 — `contract-form.tsx`, `contract-detail.tsx`, `components/available-areas.tsx`); API-087 `CreatePlanDto` / `UpdatePlanDto.areaIds`, `PlanDetailDto.areas` / `genderCondition`. The area master itself is [029/009-area-master](../029-equipment-management/009-area-master/spec.md).

- **What it is**: the areas behind an エリア扉 that a member with this 主契約 may open (E-02 FR-008). An area with a 性別の条件 also limits who the 主契約 may be **sold / granted** to — only 女性 matches 女性のみ, only 男性 matches 男性のみ; その他 / 回答しない / 未設定 match neither (「アプリ・CRMとも」). The sale gate itself is enforced on the member screens (032 / 019 / 025), not here.
- **Form (step 2 料金・条件)**: a card 「利用できるエリア」 right below 対象制限, with the link 「エリアマスタ管理を見る」 (through the discard dialog when dirty). No ブランド → 「ブランドを選ぶと、そのブランドのエリアから選べます」; otherwise one checkbox per area of the brand group (JOYFIT sub-brands share the JOYFIT areas), each 女性のみ / 男性のみ area with an outline badge; a brand group with no area → 「{brand} のエリアはまだ登録されていません」. Optional — 0 areas is valid.
- **One status line under the checkboxes** (priority top-down): conflict alert → removed notice → result line.
  - Result: 「{女性}のみのエリアを含むため、この主契約は{女性}の会員にだけ販売・付与されます（アプリ・CRM とも）」.
  - Conflict (alert 「性別の条件が合いません」): 「女性のみと男性のみのエリアを両方選んでいるため、どの会員にも販売・付与できません」 or 「性別制限（{女性のみ|男性のみ}）と、エリアの性別の条件（{男性|女性}のみ）が合わないため、どの会員にも販売・付与できません」. **Saving is not blocked** (prototype); the API derives `genderCondition: nobody`.
  - Brand change (新規 / 複製 / 子主契約 — ブランド is locked on 編集): inside the JOYFIT group the selection stays; JOYFIT ⇄ FIT365 clears it with 「ブランドを {brand} に変えたため、選んでいたエリア（{names}）を外しました」; ticking an area clears the notice.
- **Step 3 (確認) and the detail**: a card 「利用できるエリア」 — one row per area (name + badge), 「設定なし」 when empty, then the result or conflict line (verb 「含む」).
- **複製 / 子主契約作成**: the areas are copied with every other field.
- **Edit lock**: a master with contract holders cannot change its areas either (FR-013, `E-PLN-001`).
- **API**: `areaIds` must be distinct ids of the plan's brand group — unknown / other-brand → 400 `E-VAL-001` (`areaIds.N`); `[]` clears.

## Assumptions

- **Editing is the narrow path; duplicating is the wide one.** FR-M004 makes a master with holders read-only, so 複製 is a first-class part of the screen rather than a convenience.
- **`isCopyable` is carried but not editable.** The prototype shows コピー可否 only behind its Phase-2 flag (a disabled `※ 次フェーズ実装予定` switch), and this project has no phase switch, so the form has no control: a new master is sent `isCopyable: true`, and 編集 / 複製 send the stored value back unchanged. Surfacing it is a Phase-2 item.
- **The plan tree is two levels deep.** The parent selector and the 子主契約 list model one level of children; deeper nesting is not modelled. So 子主契約を作成 is disabled on a 子主契約, while 複製 of a 子主契約 creates a sibling under the same 親主契約.
- **A master's 契約者数 is a single backend-owned number.** The list (`contractCount`), the detail, and the row probe read the same backend count.
- **The prototype is a UI reference, not a logic contract.** Where it hand-rolls a control this project has a shared component for (pagination with page size, filtered-results banner, empty state, searchable pickers, image upload, date picker, breadcrumb, discard dialog), the shared component was used; card typography follows the project's design system. Role gating uses this project's permission flags rather than the prototype's hard-coded role arrays, and a page the user may not open is stopped by the app-wide `PagePermissionGuard` (`src/app/(private)/layout.tsx`) instead of the prototype's per-screen アクセス権限がありません panel.
