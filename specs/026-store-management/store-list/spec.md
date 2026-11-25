# Feature Specification: Store Master List (Y-02 FR-001)

**Feature Branch**: `026-store-list`
**Created**: 2026-08-28
**Status**: Draft
**Updated**: 2026-10-02 — synced to prototype `47423ec` (9/8, 9/16, 9/17 updates) and Y-02 260928_v6 (see Clarifications → Session 2026-10-02)
**PO Spec**: `Y-02` — 店舗管理（マスタ）
**Source**:

| Role         | Reference                                                                                                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement  | `dx-fitness/fitness-spec` → `crm/requirements/Y-02.md` @ `4655aea` (2026-09-28, doc version 260928_v6). v6 changes FR-005 only (business-calendar precedence); nothing on this screen moves. Originally drafted @ `b53dd30` (260803_v5).                                              |
| UI prototype | `dx-fitness/fitness-crm-ui` → `src/pages/store-list.tsx` @ `47423ec` (2026-09-30, 1,002 lines; last touched by `1767864` 2026-09-17). Originally drafted @ `c1c7e2e` (2026-08-05); the deltas `6bc1f1c` (9/8), `a7d0c88` (9/16), `1767864` (9/17) are recorded in Session 2026-10-02. |
| API design   | Backend dev Swagger `API-083 Admin - Store Master` (`GET/POST /api/v1/admin/stores`, `GET /api/v1/admin/stores/{id}/change-history`)                                                                                                                                                  |
| Prior QA     | `api-review-output/admin-store-master-api-083/get-stores/` (QA #201, answered by client 2026-08-24)                                                                                                                                                                                   |

**Input**: User description: "Create spec for screen store list — Phase 1 only; history seed only (no create/update/delete of history); use the backend API design to build the mock API inside this project; strict grounding on the UI code and requirement spec; mark mismatches with [NEED CLARIFICATION]."

---

## Overview

Y-02 FR-001 is the entry point of the store master. It lists the stores the signed-in user may see — for head office, all ~300 nationwide — lets an operator narrow the list down by keyword and by six independent filters, sort it, page through it, and jump to a store's detail or edit screen. It also carries the one bulk action Y-02 grants the list: reassigning the organisational **territory** of many stores at once during a reorganisation (Y-02 FR-001, delegated from Y-15 FR-M005).

The screen is read-heavy: no store is created, edited, or deleted on this screen — those actions navigate away to the store form. The only state this screen mutates is the territory assignment produced by the bulk action.

---

## Clarifications

### Session 2026-08-28

- Q: Store status — two values (prototype / Y-02 FR-001) or four (client answer to QA #201 + backend)? → A: **Two values (営業中 / 閉店), following the prototype.** The four-value set stays out for now; revisit only when the prototype itself is updated. The project mock exposes the same two values so screen and mock stay consistent. **Superseded 2026-10-02** — the prototype moved to four values at `a7d0c88` (2026-09-16), firing this answer's own revisit condition; see Session 2026-10-02 L1 and Q1.
- Q: Are filtering, sorting, and paging applied server-side or client-side? → A: **Server-side, all of it.** Keyword, all six filters, the sort, and the paging are sent to the API and applied over the whole permitted result set; only one page of stores is returned. The prototype's client-side approach is not carried over. Consequences: the mock gains area/territory filter parameters and territory-name keyword matching, prefecture filter options come from a dedicated scope-aware source rather than the current page, and the bulk dialog must resolve details for selected stores that are no longer on the current page.
- Q: Is the keyword/filter/sort/paging state persisted in the URL? → A: **Yes — all of it.** Keyword, all six filters, sort column, sort direction, page, and page size live in the URL query, so the list is deep-linkable and browser back/forward walks the filter history. This follows the project's existing convention rather than the prototype's local-state approach.
- Q: How does the bulk territory change behave when some stores fail? → A: **Partial success.** Stores that can be reassigned are reassigned; the outcome reports how many succeeded and how many failed, names the failed stores, and the selection is reduced to just the failures so the operator can retry them without rebuilding it.
- Q: Does the list scope rows by role? → A: **Yes — the full Y-02 FR-001 wording.** System / Headquarter see every store; Manager sees only their managed stores (所轄店舗); Staff (and Trainer / Observer, who share the same linkage) see only the store their staff record is linked to. A Manager's managed-store set already exists in the data model as a per-user list, and a Staff's store comes from their linked staff record.

### Session 2026-09-23 — エリア / テリトリー moved to Phase 2

- Q: Are the エリア / テリトリー elements and the bulk 「テリトリー変更」 Phase 1? → A: **No — Phase 2.** They all hang off the Y-15 organisational hierarchy, and the client's Notion board **CRM Category** lists **Y-15 組織階層管理 under Phase 2**. `Y-15.md` still reads 「Phase帰属: Phase 1」 and Y-02 v5 (FR-001 / FR-002) does not mark the hierarchy fields as Phase 2 either; both are stale on this point, and the client's board takes precedence. Everything that needs the hierarchy is therefore delivered in Phase 2 and implemented in the integration plan's **Round 3** (`integration-plan.md`, B1 / R301). Items tagged **[Phase 2 — Round 3]** below are the ones affected. In Phase 1 the screen ships without them, and the UI code is commented out with `TODO(round3) B1` so that Round 3 is an uncomment. It is not deleted. Concretely, Phase 1 has:
  - **no** テリトリー column (FR-003 lists six columns);
  - **four** filters in 詳細フィルター (ブランド / 都道府県 / 運営企業 / ステータス), with no エリア / テリトリー cascade;
  - a keyword that matches store name and business code only (placeholder 店舗名・クラブコードで検索...);
  - **no** selection column, bulk bar, 選択中のみ表示, select-all second step or bulk dialog. Selection exists only to serve the bulk territory change, so it moves to Phase 2 with it.

### Session 2026-10-02 — prototype sync (`c1c7e2e` → `47423ec`)

The prototype changed `store-list.tsx` three times after this spec was drafted. Every user-visible delta is listed with the decision taken; Y-02 v6 (260928) touches FR-005 only and changes nothing here.

| #   | Prototype change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Commit           | Decision / spec impact                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Status is four values** 準備中 / 営業中 / 休業中 / 閉店 as independent badges, shared with the detail screen through `data/stores.ts` (`STORE_STATUSES`, lifecycle order). Code comment: 「開発回答（2026/08/24）で…4値独立バッジに確定（旧『2値に統一（2026/04/22）』は撤回）」                                                                                                                                                                                                                                                            | `a7d0c88` (9/16) | **Adopted — Q1's own follow-up trigger fired** ("revisit when the prototype is updated"). FR-007 and FR-011 rewritten; Q1 reopened and re-resolved below; the mock's `StoreListStatus` goes back to four values and `store-008` / `store-009` regain 休業中 / 準備中. |
| L2  | Badge treatments: 営業中 success, 準備中 info, 休業中 warning, 閉店 muted (`data/stores.ts` L24-39)                                                                                                                                                                                                                                                                                                                                                                                                                                           | `a7d0c88` (9/16) | FR-007.                                                                                                                                                                                                                                                               |
| L3  | Search placeholder 店舗名・**クラブコード**・テリトリー名で検索... → 店舗名・**店舗コード**・テリトリー名で検索...                                                                                                                                                                                                                                                                                                                                                                                                                            | `6bc1f1c` (9/8)  | FR-010. Phase 1 placeholder (territory matching is Phase 2) becomes 店舗名・店舗コードで検索....                                                                                                                                                                      |
| L4  | 運営企業 filter options are no longer two hard-coded companies: they are the Y-03 FC company master's companies that are **active (有効) and of type FC**, kept only if at least one store in the data is operated by them (「選んで0件になる選択肢を作らない」), in master order, after 全運営企業 / 直営.                                                                                                                                                                                                                                   | `6bc1f1c` (9/8)  | FR-013 rewritten. Same "no zero-row option" rule as 都道府県 (FR-012) — derived over the whole permitted set, never the current page.                                                                                                                                 |
| L5  | Row menu 編集 is enabled for Staff **on their own store's row** (Y-02 権限マトリクス L203 基本情報編集（Staff限定項目）), still HQ/System-only on every other row.                                                                                                                                                                                                                                                                                                                                                                            | `6bc1f1c` (9/8)  | FR-038. The repo already ships Staff-enabled 編集 (PAR069, recorded as a divergence) — the prototype now agrees, so PAR069 stops being a divergence. Because FR-009 already limits a Staff user's rows to their own store, the two rules give the same screen.        |
| L6  | Page-size options 25 / 50 / 100 / **200** → 25 / 50 / 100 (default still 50)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `1767864` (9/17) | FR-020. Matches what the repo already shipped (PAR084 divergence closed).                                                                                                                                                                                             |
| L7  | Bulk dialog's destination picker: searchable `TerritoryCombobox` → `TerritoryCascadeSelect`, two `Select`s エリア → テリトリー (placeholders エリアを選択 / テリトリーを選択; テリトリー disabled with tooltip 先にエリアを選択してください until an area is chosen; changing the area clears the territory; inactive territories hidden except the selected one). The search box, 該当なし and the 「{テリトリー}（{エリア}）」 trigger label are gone. Comment: 「Y-02 v5 L132: 変更先も検索条件と同じ『エリア → テリトリー』の2段 Select」 | `1767864` (9/17) | **[Phase 2 — Round 3]** FR-030 rewritten; PAR097–PAR101 replaced. Nothing ships in Phase 1.                                                                                                                                                                           |
| L8  | Demo club codes `ST-###` → `TK-###` (「Y-02 仕様例に合わせて TK-###（2026/08/24 開発回答）」)                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `a7d0c88` (9/16) | Seed data only — the repo's mock already uses `TK-001`. No FR change.                                                                                                                                                                                                 |

---

## User Scenarios _(mandatory)_

### User Story 1 - Browse the store master (Priority: P1)

A head-office operator opens 店舗管理 and sees every store in the chain in one table (a Manager or Staff sees only the stores within their scope — see FR-009), with the count of stores shown next to the page title. Each row shows the store's business code, name, brand, prefecture, operating company, territory (with its parent area underneath), and lifecycle status. The operator pages through the list and can change how many rows are shown at a time.

**Why this priority**: Without the table, nothing else on the screen has anything to act on. Every other story is a refinement of this one. This alone is a usable screen: an operator can confirm which stores exist and what state they are in.

**Verification**: Open the store list. Confirm the header count matches the total in the pagination footer, that every column renders a value (or an explicit placeholder), and that moving to page 2 and changing the page size both re-render the table.

**Acceptance Scenarios**:

1. **Given** the store master holds stores, **When** the operator opens the screen, **Then** the first page of stores renders with columns 店舗コード / 店舗名 / ブランド / 都道府県 / 運営企業 / テリトリー / ステータス in that order, and the page title shows 店舗管理 with a badge holding the total store count.
2. **Given** a store is directly managed (no FC company), **When** its row renders, **Then** the 運営企業 column shows the literal 直営; **and given** the store is operated by an FC company, **Then** the column shows that company's name.
3. **Given** a store has a territory assigned, **When** its row renders, **Then** **[Phase 2 — Round 3]** the テリトリー cell shows the territory name on the first line and its parent area name on the second line; **and given** the store has no territory, **Then** the cell shows 未設定.
4. **Given** the operator is on page 1 of several pages, **When** they choose a different page size, **Then** the list returns to page 1 and the footer text 全 N 件 / M ページ / X-Y を表示 recomputes.
5. **Given** the list has more than seven pages, **When** the operator is in the middle of the range, **Then** the pager shows the first page, an ellipsis, the current page with its neighbours, another ellipsis, and the last page.
6. **Given** the signed-in user is a Manager, **When** the screen loads, **Then** only the stores in their managed-store set are listed and the header count reflects that number; **and given** the user is Staff, **Then** only their linked store is listed.

---

### User Story 2 - Narrow the list down to the stores in question (Priority: P1)

An operator searching for a specific store or reviewing a region types a keyword and/or opens the 詳細フィルター panel and applies filters for brand, prefecture, operating company, area, territory, and status. The area and territory filters are a two-tier cascade: territory only becomes selectable once an area is chosen, and it offers only the territories under that area. A banner reports how many of the total stores are currently showing and by which conditions, and offers a one-click reset.

**Why this priority**: With ~300 stores, the table alone is not workable. Y-02 FR-001 names search as a first-class part of the requirement, and the filter set is the screen's main day-to-day interaction.

**Verification**: Type a partial store name into the search box and confirm the row count drops and the banner appears. Open 詳細フィルター, pick an area, confirm the territory select becomes enabled and lists only that area's territories, then clear all conditions and confirm the full list returns.

**Acceptance Scenarios**:

1. **Given** the operator types into the search box, **When** the keyword matches part of a store name, business code, or territory name, **Then** only matching stores remain and the list returns to page 1.
2. **Given** no area is selected, **When** the operator hovers the territory filter, **Then** **[Phase 2 — Round 3]** it is disabled and a tooltip reads 先にエリアを選択してください.
3. **Given** an area is selected and a territory under it is selected, **When** **[Phase 2 — Round 3]** the operator changes the area, **Then** the territory filter resets to 全テリトリー and the list returns to page 1.
4. **Given** one or more filters differ from their default, **When** the operator looks at the 詳細フィルター button, **Then** it is visually emphasised and carries a badge with the number of active filters, and each non-default filter control is itself highlighted.
5. **Given** any filter or the keyword is active, **When** the list renders, **Then** a banner shows 全 {total} 件中 {count} 件を抽出中 followed by the active conditions joined by ・, plus a 条件をクリア action that resets the keyword and every filter and returns to page 1.
6. **Given** the operator has applied a keyword, filters, a sort, and moved to page 3, **When** they reload the page or share its address, **Then** the same keyword, filters, sort, page, and page size are restored; **and when** they press the browser's back button, **Then** the previous filter state is restored.
7. **Given** the applied conditions match no store, **When** the table renders, **Then** it shows an empty state reading 条件に一致する店舗がありません with a 条件をクリア action; **and given** the store master itself is empty, **Then** it shows 店舗がまだありません with no clear action.
8. **Given** the operator selects 直営 in the operating-company filter, **When** the list re-renders, **Then** only directly-managed stores remain.

---

### User Story 3 - Order the list by code or name (Priority: P2)

An operator clicks the 店舗コード or 店舗名 column header to sort the list ascending, clicks again to flip to descending, and can switch the sort to the other column.

**Why this priority**: Useful for scanning and for reconciling against external lists, but the screen is usable without it.

**Verification**: Click 店舗コード, confirm an ascending arrow appears and the order changes; click again and confirm the arrow and order flip.

**Acceptance Scenarios**:

1. **Given** no sort is applied, **When** the operator clicks a sortable header, **Then** the list sorts ascending on that column, the header shows an ascending indicator, and the list returns to page 1.
2. **Given** the list is sorted ascending on a column, **When** the operator clicks that same header, **Then** the sort flips to descending and the indicator flips.
3. **Given** the list is sorted on one column, **When** the operator clicks the other sortable header, **Then** the sort moves to that column, ascending.
4. **Given** the operator hovers a sortable header, **When** the tooltip appears, **Then** it states the direction the next click will apply (クリックで昇順ソート / クリックで降順ソート).

---

### User Story 4 - Reassign many stores to a new territory at once (Priority: P2) **[Phase 2 — Round 3]**

During an organisational reorganisation a System or Headquarter user selects stores across pages, reviews where they currently sit, picks the destination territory, is warned when the move also changes a store's area, and executes the change in one confirmed operation.

**Why this priority**: Named explicitly in Y-02 FR-001 as the list's bulk action and delegated from Y-15 FR-M005. It is the only write this screen performs, and it is destructive enough to warrant its own confirmation flow — but the screen still delivers value without it.

**Verification**: As a Headquarter user, tick several rows across two pages, open the bulk dialog, choose a destination territory in another area, confirm the warning appears, and execute.

**Acceptance Scenarios**:

1. **Given** the signed-in user is System or Headquarter, **When** the table renders, **Then** each row carries a selection checkbox and the header carries a select-all checkbox; **and given** the user holds any other role, **Then** the selection column is absent entirely.
2. **Given** at least one store is selected, **When** the toolbar renders, **Then** a bulk bar appears showing the total number selected, how many of those are on the current page, a 選択解除 action, a 選択中のみ表示 toggle, and a テリトリーを変更（N件） action.
3. **Given** the operator selects rows on page 1 and moves to page 2, **When** they select more rows, **Then** the earlier selection is retained and the bulk bar count reflects both pages.
4. **Given** the header checkbox is clicked while the filtered result exceeds one page, **When** the current page's rows become selected, **Then** a confirmation asks whether to select all {N} matching stores, offering このページのみ選択 and {N}件すべてを選択.
5. **Given** the header checkbox is clicked while every row on the page is already selected, **When** it is clicked, **Then** exactly the current page's rows are deselected and selections on other pages are retained.
6. **Given** 選択中のみ表示 is enabled, **When** the table renders, **Then** only selected stores are listed, and the paging and total counts reflect that reduced set.
7. **Given** the bulk dialog is open, **When** no destination territory has been chosen, **Then** the 実行 action is disabled and the 変更後 line reads 変更先のテリトリーを選択してください.
8. **Given** a destination territory is chosen, **When** the dialog renders, **Then** it shows the destination's full organisational path (運営本部 › ブロック › エリア › テリトリー), the pre-change distribution of the selected stores grouped as エリア／テリトリー with per-group counts (capped at five groups plus a 他 N テリトリー line), the post-change destination with the selected count, and a preview of up to five selected stores each showing its business code, name, and current territory → destination territory (plus a 他 N 件 line).
9. **Given** some selected stores currently sit in a different area from the destination, **When** the dialog renders, **Then** a warning states how many of the selected stores also change area, names the source areas and the destination area, and states that the area-based reservation view and analytics aggregation change accordingly.
10. **Given** a destination territory is chosen, **When** the operator confirms, **Then** the selected stores are reassigned to that territory, a success message confirms the number changed and the destination territory name, the selection is cleared, and 選択中のみ表示 is turned off.
11. **Given** several stores are selected and some of them cannot be reassigned, **When** the operator confirms, **Then** the reassignable stores are reassigned, the outcome states how many succeeded and how many failed and names the failed stores, and the selection is reduced to only the failed stores.
12. **Given** every selected store fails to reassign, **When** the operator confirms, **Then** nothing is changed, the failure is reported, and the whole selection is retained.
13. **Given** a selected store currently has no territory, **When** the dialog renders, **Then** it is grouped under 未設定 in the pre-change distribution and shown as 未設定 in the preview.

---

### User Story 5 - Move on to a single store (Priority: P3)

An operator clicks a row to open that store's detail screen, uses the row's overflow menu to jump straight into editing it, or uses 新規登録 to register a new store. Both write entry points are restricted to System and Headquarter.

**Why this priority**: Navigation only — the destination screens are separate features. Still required for the list to function as the master's entry point.

**Verification**: Click a row and confirm the store detail screen opens. As a non-HQ user, confirm 新規登録 is disabled with an explanatory tooltip and the row menu's 編集 is disabled and badged.

**Acceptance Scenarios**:

1. **Given** any row, **When** the operator clicks anywhere on it other than the checkbox or the overflow menu, **Then** the store detail screen for that store opens.
2. **Given** the operator clicks the row's checkbox or overflow menu, **When** the click is handled, **Then** the row navigation does **not** fire.
3. **Given** the signed-in user is System or Headquarter, **When** they use 新規登録 or the row menu's 編集, **Then** the store registration form or that store's edit form opens.
4. **Given** the signed-in user holds any other role, **When** the header renders, **Then** 新規登録 is disabled and a tooltip reads 本部権限が必要です; **and** the row menu's 編集 is inert and carries a 本部 badge.

### Edge Cases

- **Page index beyond the result set** — after filtering, the current page may exceed the new page count. The list must clamp to the last available page rather than showing an empty table.
- **Zero results with an empty master** — the empty state must distinguish "no store matches your conditions" from "no store exists yet"; only the former offers 条件をクリア.
- **Prefecture options that would yield zero rows** — the prefecture filter must only offer prefectures that at least one store actually uses, ordered north to south, so no option can produce an empty result on its own.
- **Territory filter without an area** **[Phase 2 — Round 3]** — disabled with an explanatory tooltip rather than showing all ~57 territories.
- **Inactive territories** **[Phase 2 — Round 3]** — territories flagged inactive are not offered in the area→territory filter, nor in the bulk-change destination picker (except the one currently selected, which stays visible).
- **Stores with no territory** **[Phase 2 — Round 3]** — render as 未設定 in the list, group as 未設定 in the bulk dialog's pre-change distribution, and are eligible for bulk assignment.
- **Selection surviving filter changes** **[Phase 2 — Round 3]** — selections are held by store, not by row position; changing filters or pages must not silently drop them, and the bulk bar reports both the overall count and the current page's share.
- **Bulk destination equal to the current territory** **[Phase 2 — Round 3]** — selecting a destination that some stores already belong to is permitted; those stores simply do not appear in the cross-area warning.
- **Long pre-change distribution / long preview** **[Phase 2 — Round 3]** — both are capped at five entries with an explicit "and N more" line so the dialog never scrolls.
- **Role change mid-session** — a user without bulk rights must not see the selection column at all, so no stale selection can be acted on.
- **User with an empty scope** — a Manager with no managed stores, or a Staff/Trainer/Observer whose staff record has neither a linked store nor a linked FC company, sees an empty list rather than the whole master.
- **Bulk change partly fails** **[Phase 2 — Round 3]** — successes stand, failures are named, and the selection narrows to the failures so a retry is one click. The operation is never rolled back, so the list after a partial failure is a legitimate mixed state.
- **Selected store disappears before execution** **[Phase 2 — Round 3]** — a store deleted or moved out of scope between selection and execution counts as a failure for that store only, and does not block the rest.
- **Every interaction is a round trip** — because filtering, sorting, and paging are server-side, each of them re-queries. The table must show a loading treatment during the query rather than an empty state, so a slow response is never mistaken for "no results"; a failed query must be distinguishable from an empty result too.
- **Deep link into a page that no longer exists** — an address naming a page beyond the current result count clamps to the last available page (FR-023) rather than showing an empty table.
- **Deep link with a territory but no area** **[Phase 2 — Round 3]** — the territory parameter is dropped so the cascade rule holds; the list renders unfiltered by territory rather than erroring.
- **Scoped user and the filters** — the area, territory, prefecture, and operating-company filters still apply within the scope, so a Staff user may see filter options that yield zero rows for them; the filtered empty state covers this.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Page shell

- **FR-001**: The screen MUST be titled 店舗管理 and display, beside the title, the number of stores within the signed-in user's permitted scope (FR-009) — the unfiltered total, not the count after filtering.
- **FR-002**: The screen MUST offer a 新規登録 action that opens the store registration form, restricted to System and Headquarter; for all other roles it MUST render disabled with the tooltip 本部権限が必要です.

#### Listing

- **FR-003**: The list MUST display, for each store and in this order: 店舗コード (the business/legacy club code), 店舗名, ブランド, 都道府県, 運営企業, テリトリー, ステータス. **[Phase 2 — Round 3]** テリトリー is Phase 2 (FR-005); Phase 1 renders the other six in the same order.
- **FR-004**: The 運営企業 column MUST show the operating FC company's name for franchised stores and the literal 直営 for directly-managed stores.
- **FR-005**: **[Phase 2 — Round 3]** The テリトリー column MUST show the store's territory name with its parent area name beneath it, or 未設定 when the store has no territory assigned.
- **FR-006**: ブランド MUST render as a badge, using one visual treatment per brand across JOYFIT / JOYFIT24 / JOYFIT YOGA / JOYFIT+ / FIT365.
- **FR-007**: ステータス MUST render as a badge with exactly four independent values, each with its own treatment: 準備中 (info), 営業中 (positive/success), 休業中 (warning), 閉店 (muted). The values are never merged (e.g. 準備中 / 休業中 are not shown as 営業中). The store master's vocabulary is that four-value set (`preparing` / `operating` / `temporarily_closed` / `closed`), in that lifecycle order, so every screen reading it — this list, the store detail, the store form's brand lock, Y-03 FC企業詳細 — uses the same four (prototype `a7d0c88`, 2026-09-16; client answer to QA #201, 2026-08-24; re-resolved 2026-10-02, Q1).
- **FR-008**: The store currently chosen in the global header store selector MUST NOT narrow this list — the list always shows everything within the signed-in user's permitted scope (FR-009), independent of that selector.
- **FR-009**: The list MUST scope its rows to the signed-in user's permitted stores, per Y-02 FR-001:
  - **System / Headquarter** — every store in the master, unrestricted.
  - **Manager** — only the stores in their managed-store set (所轄店舗). A Manager with an empty managed-store set sees no rows.
  - **Staff / Trainer / Observer** — only the store their staff record is linked to. Where a staff record is linked to an FC company instead of a single store, the scope is every store under that company. A user with neither linkage sees no rows.
  - Every count the screen reports — the header total, the filter banner's 全 N 件中 figure, and the pagination totals — MUST be computed within that permitted scope, never over the whole master.

#### Search and filtering

- **FR-010**: The screen MUST offer a free-text search that matches store name, business code, and territory name, with the placeholder 店舗名・店舗コード・テリトリー名で検索... (prototype `6bc1f1c`; formerly クラブコード). **[Phase 2 — Round 3]** Territory-name matching is Phase 2; Phase 1 matches store name and business code, with the placeholder 店舗名・店舗コードで検索.... The match MUST be performed over the whole permitted result set, not over the page currently displayed. The match MUST cover only what the list shows: the internal store id (`S-###`, not a column here) MUST NOT be matched — the request sends `keywordIncludeCode=false` whenever a keyword is present (Bug No.11), so a `-` keyword returns only stores whose name / kana / 店舗コード (clubCode) contain `-`. `%` and `_` are matched literally.
- **FR-011**: **[Phase 2 — Round 3]** (エリア / テリトリー only — Phase 1 ships the other four) The screen MUST offer a collapsible 詳細フィルター panel holding six filters: ブランド, 都道府県, 運営企業, エリア, テリトリー, ステータス — each defaulting to its "all" option (全ブランド / 全都道府県 / 全運営企業 / 全エリア / 全テリトリー / 全ステータス). The ステータス filter MUST offer exactly 全ステータス / 準備中 / 営業中 / 休業中 / 閉店, in that order, matching FR-007.
- **FR-012**: The 都道府県 filter MUST offer only prefectures present in the user's permitted store data, ordered north to south. The option list MUST be derived from the whole permitted set — never from the page currently displayed — so that no offered option can return zero rows and the options do not shift as the operator pages.
- **FR-013**: The 運営企業 filter MUST offer 全運営企業, then 直営, then the FC companies of the Y-03 FC company master that are active (有効) and of type FC, in the master's order. A company MUST be offered only when at least one store in the user's permitted set is operated by it, so that no option can return zero rows; as with FR-012, the list is derived from the whole permitted set, never from the current page (prototype `6bc1f1c`, 2026-09-08 — replaces two hard-coded company names).
- **FR-014**: **[Phase 2 — Round 3]** エリア and テリトリー MUST behave as a two-tier cascade: テリトリー is disabled until an area is chosen (with the tooltip 先にエリアを選択してください), offers only the active territories under the chosen area, and resets to 全テリトリー whenever the area changes.
- **FR-015**: The 詳細フィルター toggle MUST be visually emphasised and carry a badge with the count of non-default filters; each non-default filter control MUST itself be highlighted.
- **FR-016**: While a keyword or any non-default filter is applied, the screen MUST show a banner reading 全 {total} 件中 {count} 件を抽出中 followed by the active conditions joined by ・, with a 条件をクリア action that clears the keyword and every filter and returns to page 1.
- **FR-017**: Any change to the keyword, to a filter, to the sort, or to the page size MUST return the list to page 1.
- **FR-017a**: The keyword, all six filters, the sort column and direction, the page, and the page size MUST be reflected in the page's address, so that reloading or sharing the address reproduces the same list, and browser back/forward moves between successive states. Absent parameters MUST fall back to the documented defaults (no keyword, every filter at its "all" option, no sort, page 1, page size 50).
- **FR-017b**: An address carrying an unusable parameter MUST degrade to the default for that parameter and still render the list — never an error screen. In Phase 1 an `area_id` / `territory_id` in the address is ignored and not counted as an active filter. **[Phase 2 — Round 3]** In particular, a territory parameter without a matching area parameter MUST be dropped, keeping the cascade rule of FR-014 intact.
- **FR-018**: When no store matches, the table MUST show an empty state that distinguishes a filtered-out result (条件に一致する店舗がありません, with a 条件をクリア action) from an empty master (店舗がまだありません, no action).

#### Sorting and paging

- **FR-019**: 店舗コード and 店舗名 MUST be sortable. The first click sorts ascending; clicking the active column flips the direction; clicking the other column moves the sort there, ascending. The active column MUST show a direction indicator, inactive sortable columns a neutral one, and each MUST expose a tooltip naming the direction the next click applies.
- **FR-020**: The list MUST be paginated with a selectable page size of 25, 50, or 100, defaulting to 50 (the 200 step was dropped by prototype `1767864`, 2026-09-17, which also matches the API's maximum `limit` of 100).
- **FR-021**: The pagination footer MUST report 全 {total} 件 / {pages} ページ / {start}-{end} を表示, and MUST show 0 as the start index when there are no results. Per the project's shared GUI checklist (「1ページに収まる件数のときの確認」), the footer is hidden entirely — not shown disabled — when the whole result fits on one page; the prototype always renders it, and the project convention wins for this shared component.
- **FR-022**: The pager MUST list every page when there are seven or fewer, and otherwise abbreviate with ellipses around the current position; previous/next MUST be inert at the first/last page.
- **FR-023**: When the current page exceeds the number of pages available after filtering, the list MUST clamp to the last available page.
- **FR-023a**: Keyword, every filter, the sort, and the paging MUST all be applied over the whole permitted result set before a page is returned; the screen MUST NOT filter, sort, or paginate a locally-held subset. Every reported count (header total, filter banner, pagination totals) MUST therefore reflect the full matching set, not the rows on screen.

#### Bulk territory change **[Phase 2 — Round 3]**

- **FR-024**: Store selection and the bulk territory change MUST be available only to System and Headquarter. For every other role the selection column MUST NOT render.
- **FR-025**: Selection MUST persist across pages and across filter changes, keyed by store.
- **FR-025a**: The bulk dialog MUST be able to show the code, name, and current territory of every selected store, including stores selected on a page that is no longer displayed. Selecting all matching stores (FR-027) MUST likewise capture every store in the matching set, not only those on the current page.
  - **How**: the screen accumulates the full row of every store as it is ticked, keyed by store id, and keeps it until that store is unticked — the same mechanism the member list already uses for its cross-page bulk action. FR-027's second step reads the whole matching set page by page at the endpoint's `limit` ceiling of 100 — a single `limit = total` request would exceed the cap API-083 declares — and seeds the map from it. No by-id lookup endpoint is needed, and the dialog never has to re-query.
- **FR-026**: The header checkbox MUST select every row on the current page; when every row on the page is already selected it MUST deselect exactly those rows, leaving selections on other pages intact. It MUST render an indeterminate state when the page is partially selected.
- **FR-027**: When the header checkbox selects a page and the matching result set spans more than one page, the screen MUST offer a second-step confirmation to extend the selection to all {N} matching stores, with the choices このページのみ選択 and {N}件すべてを選択.
- **FR-028**: While at least one store is selected, a bulk bar MUST show the total selected count, the count on the current page, a 選択解除 action, a 選択中のみ表示 toggle, and a テリトリーを変更（N件） action.
- **FR-029**: 選択中のみ表示 MUST restrict the table to selected stores, with paging and totals reflecting that reduced set — including selected stores that fall outside the current page of the unrestricted result. Because the selection is already held in full (FR-025a), the reduced set is paged locally rather than re-queried, and turning the toggle on returns to page 1.
- **FR-030**: The bulk dialog MUST require a destination territory, chosen through a two-tier cascade of selects — エリア (placeholder エリアを選択) then テリトリー (placeholder テリトリーを選択) — the same cascade as the filter panel. テリトリー MUST be disabled with the tooltip 先にエリアを選択してください until an area is chosen, MUST list only the active territories under that area (keeping a currently selected inactive one), and MUST be cleared when the area changes. Only human-readable names are shown, never internal identifiers (prototype `1767864`, 2026-09-17 — replaces the searchable grouped picker). 実行 MUST stay disabled until a destination is chosen.
- **FR-031**: Once a destination is chosen, the dialog MUST show its full organisational path (運営本部 › ブロック › エリア › テリトリー).
- **FR-032**: The dialog MUST show the pre-change distribution of the selected stores grouped as エリア／テリトリー with per-group counts in descending count order, capping the display at five groups plus a 他 {N} テリトリー line, and grouping territory-less stores under 未設定.
- **FR-033**: The dialog MUST show the post-change destination as エリア／テリトリー with the number of stores being moved, or a prompt to choose a destination when none is chosen.
- **FR-034**: When any selected store's current area differs from the destination's area, the dialog MUST warn how many of the selected stores also change area, name the source areas and the destination area, and state that the area-based reservation view and the analytics/report aggregation change accordingly.
- **FR-035**: The dialog MUST preview up to five selected stores, each showing business code, store name, and current territory → destination territory, plus a 他 {N} 件 line when more are selected.
- **FR-036**: Executing the change MUST reassign the selected stores to the destination territory. When every selected store is reassigned, the screen MUST confirm with a message naming the number changed and the destination territory, clear the selection, turn off 選択中のみ表示, and show the reassigned territories in the refreshed list.
- **FR-036a**: The operation MUST allow partial success — a store that cannot be reassigned MUST NOT prevent the others from being reassigned. When at least one store fails, the screen MUST:
  - report how many stores were reassigned and how many failed;
  - identify the failed stores by name (or by code) so the operator knows what still needs attention;
  - reduce the selection to exactly the failed stores, so a retry needs no re-selection, and leave 選択中のみ表示 available to review them;
  - leave the successfully reassigned stores reassigned — the operation is never rolled back.
- **FR-036b**: When every selected store fails, the screen MUST report the failure, change nothing, and retain the full selection.

#### Navigation

- **FR-037**: Clicking a row MUST open that store's detail screen; clicks on the row's checkbox or overflow menu MUST NOT trigger row navigation.
- **FR-038**: Each row MUST offer an overflow menu containing 編集, which opens that store's edit form. It MUST be enabled for System and Headquarter on every row, and for Staff on the row of the store their staff record is linked to (Y-02 権限マトリクス 基本情報編集（Staff限定項目）; the form then limits Staff to its whitelisted fields — store form FR-083). On any other row, and for every other role, it MUST render inert with a 本部 badge (prototype `6bc1f1c`, 2026-09-08).

#### Data & history

- **FR-039**: Store change history (Y-02 FR-008) MUST be available as **seeded reference data only** for this feature — the mock data set MUST include change-history records, and this feature MUST NOT create, update, or delete them. No history is written when the bulk territory change executes. The mock exposes them read-only at `GET /crm/stores/{id}/change-history` (modelled on API-083 §change-history, Appendix A.2) so the store-detail feature can pick them up without another mock change.

### Key Entities

- **Store**: A physical club in the chain. Attributes surfaced by this screen: auto-numbered internal store ID, business/club code, name, brand, prefecture, operating FC company (or "directly managed"), lifecycle status, and assigned territory. The store ID is the foreign key every other CRM feature references.
- **Territory**: The lowest node of the Y-15 organisational hierarchy (運営本部 → ブロック → エリア → テリトリー → 店舗). A store belongs to at most one territory; its area, block, and head office are derived from that territory rather than stored on the store. Territories may be flagged inactive.
- **Area**: The hierarchy level above territory. Never selected directly on a store — it is derived from the store's territory, and appears on this screen as the second line of the テリトリー column and as the first tier of the cascade filter.
- **FC Company**: The franchise company operating a store (Y-03). Absent for directly-managed stores, which display as 直営.
- **Store Change History**: An append-only record of changes to a store, with who changed it, when, which logical change it was, and a snapshot. Seeded only for this feature (see FR-039).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An operator who knows a store's name or business code can locate its row in under 15 seconds from opening the screen, using the search box alone.
- **SC-002**: **[Phase 2 — Round 3]** An operator can narrow ~300 stores down to a single territory's stores in at most three interactions (open filters → choose area → choose territory).
- **SC-003**: 100% of listed stores show a value in every column, with territory-less stores explicitly marked 未設定 rather than blank.
- **SC-004**: **[Phase 2 — Round 3]** A reorganisation moving stores between territories is completed in a single confirmed operation, and the operator can see the full before/after distribution and every area-crossing consequence without leaving the confirmation dialog.
- **SC-004a**: **[Phase 2 — Round 3]** After a bulk change that partly fails, the operator can retry exactly the stores that failed without re-selecting anything, and can tell from the outcome message alone which stores still need attention.
- **SC-005**: **[Phase 2 — Round 3]** No store selected by an operator is lost when they move between pages or adjust filters within one bulk-change session.
- **SC-006**: Users without head-office rights are never presented with an actionable write control on this screen — every restricted control is visibly inert and states why.
- **SC-007**: Applying or clearing any filter always leaves the operator on a page that contains results (never an empty page caused by a stale page index).

---

## Assumptions

- **Screen scope** — this feature covers Y-02 **FR-001 only** (list, search, and the territory bulk action) plus the seeded history data of FR-008. Y-02 FR-002 through FR-007 (store registration/edit, sales settings, mutual-use settings, business calendar, store map, closure workflow) are separate screens and are out of this feature's scope; this screen only navigates to them.
- **Data source** — the screen is backed by the project's mock API. The mock is modelled on the backend's API-083 design (see Appendix A) rather than on the project's current legacy store mock, so that switching to the real API later is a client swap rather than a redesign.
- **Territory data is mocked in full** — the backend design has no organisational-hierarchy (Y-15) concept at all: `territory` appears zero times in the dev Swagger, `StoreSummaryDto` carries no territory or area field, there is no area/territory query parameter, and there is no bulk-territory-change endpoint. This is a known backend gap already recorded for BE (2026-08-19, cluster tracking) and is **not** a blocker: the mock API supplies `territoryId` / `territoryName` / `areaName` on the store, the area and territory filter parameters, the hierarchy lookup needed for the two-tier cascade and the destination picker, and a bulk-reassignment operation that persists.
- **The backend's `area` field is a different concept** — `StoreDetailDto.area` is a mobile-app area code (`1`–`8`) and the project's current legacy mock uses `kanto`/`kansai`/`chubu`/`other`. Neither is the Y-15 organisational area this screen displays. The screen uses the Y-15 area derived from the store's territory.
- **Status is four values, master included** (re-resolved 2026-10-02, Q1) — the screen, the project mock and the real API all use 準備中 / 営業中 / 休業中 / 閉店 (`preparing` / `operating` / `temporarily_closed` / `closed`), mapped one-to-one with no merging. The two stores the 2026-08-28 narrowing flattened (`store-008`, `store-009`) return to 休業中 / 準備中. _Historical (2026-08-28, superseded):_ the screen and the project mock both exposed only 営業中 / 閉店. `StoreListStatus` is `operating` | `closed`; the client's QA #201 answer of four badges (準備中 / 営業中 / 休業中 / 閉店) and the backend's four-value enum are deliberately **not** adopted yet, because the prototype is the reference for this screen and carries an explicit note that the set was unified to two on 2026/04/22. Narrowing the master rather than only the filter keeps every screen consistent: the two stores previously seeded 休業中 / 準備中 (`store-008`, `store-009`) are now 営業中, and Y-03 FC企業詳細's linked-store list and the store form now offer the same two values. This is a known, accepted divergence from the backend contract, to be re-mapped at real-API integration time.
- **店舗コード vs 店舗ID** — resolved by the client's answer to QA #201 (2026-08-24): the business code (`clubCode`, e.g. `TK-001`) is the list's first column, labelled 店舗コード; the auto-numbered `S-###` code is the internal 店舗ID and is **not** a column on this screen. Sorting is therefore offered on the business code.
- **Bulk change persists** — the prototype's bulk execution only raises a toast without mutating its in-memory data. Following the project's "mock first" rule for backend gaps, the mock API persists the territory reassignment so the change is visible on re-query.
- **No history is written by the bulk change** — per the explicit instruction for this feature, change history is seed-only.
- **Filter state lives in the address** — clarified 2026-08-28. Keyword, filters, sort, page, and page size are URL state, matching the convention the project already applies to its list screens (and unlike the prototype, which keeps them in local component state). Selection for the bulk action is **not** URL state — it is transient to the session and is cleared when the bulk change executes.
- **Server-side querying throughout** — clarified 2026-08-28. The screen holds no local copy of the store master: every keyword, filter, sort, and page change is a fresh query. This matches the API-083 contract (and the direction the project's existing store list already took), so switching from mock to real API is a client swap. Two prototype behaviours become server concerns as a result: territory-name keyword matching, and the data-derived prefecture option list.
- **The store master is seeded large enough to exercise the screen** — paging, cross-page selection, the select-all second step and the bulk dialog's before/after distribution are all unobservable on the 13 stores the mock held. 38 stores were appended (51 in total, ~1 page at the default size of 50, 3 pages at 25), following the prototype's own reason for expanding its list data. They are deliberately inert everywhere else: directly-managed (so Y-03's 管轄店舗 counts are unchanged), no main contract, no locker map, and excluded from the member seed's store round-robin — so no other screen's data moved. The original 13 keep their ids, codes, FC links and statuses, and gain only 都道府県 and テリトリー.

- **Roles** — the role vocabulary is the existing CRM one (System / Headquarter / Manager / Staff / Trainer / Observer). Write controls on this screen are gated to System and Headquarter, matching both Y-02's permission matrix (店舗登録 / 基本情報編集) and the prototype. The gate is the `stores.create` / `stores.edit` permission alone: `ROLE_PERMISSIONS` granted both to Staff, contradicting Y-02's matrix and leaving `/stores/create` reachable by URL, so the two entries were removed from the Staff role rather than worked around on this screen. Staff keeps `stores.view` (own store) and `stores.config_business` (営業カレンダー).
- **Row scoping reuses the existing linkage model** — the scope rule in FR-009 is exactly what the project's existing store-scope resolver already computes: unrestricted for System/Headquarter, the Manager's own managed-store list, and the linked store (or linked FC company's stores) for Staff/Trainer/Observer. No new data is needed; Manager users already carry a managed-store set and staff-linked users already resolve to a store. This deliberately diverges from the prototype, which applies no scoping at all, and from the backend, whose reads are currently unscoped.

---

## Out of Scope for Phase 1

| Item                                                                                                                                                      | Why excluded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store registration / edit forms (Y-02 FR-002)                                                                                                             | Separate screens; this feature only navigates to them.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Sales settings, mutual-use settings, business calendar, store map (Y-02 FR-003–FR-006)                                                                    | Separate screens under the store detail. Store map (FR-006) moved to **Phase 1** on 2026-10-02 (prototype `e5501a3` un-gated the detail tab) and has its own sub-spec, `../store-map-setup/spec.md`.                                                                                                                                                                                                                                                                                                                |
| 1DayPass price-range configuration UI                                                                                                                     | Y-02 FR-003: Phase 1 fixes the ¥700–¥1,800 range as a system constant; the configuration UI is a Y-07 extension scheduled for Phase 2 (#311).                                                                                                                                                                                                                                                                                                                                                                       |
| Closure workflow and bulk member transfer batch (Y-02 FR-007)                                                                                             | Batch processing is owned by the TAS team; the list surfaces the resulting status only.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 閉店予定日 column on the list                                                                                                                             | Y-02 FR-001's display item list does not include it, and the prototype does not render it.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Writing store change history (create/update/delete)                                                                                                       | Explicitly excluded for this feature — history is seeded reference data only (FR-039).                                                                                                                                                                                                                                                                                                                                                                                                                              |
| National-holiday master screens                                                                                                                           | The backend cluster exposes five holiday endpoints, but Y-02 FR-005 specifies automatic holiday import; no holiday management screen exists in the prototype, so none is built in Phase 1.                                                                                                                                                                                                                                                                                                                          |
| `asset_id` (I-01 store page) linkage                                                                                                                      | Y-02 records that only the FK design is fixed in Phase 1; the table itself lands in Phase 2.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| エリア / テリトリー: column, cascade filter, territory-name keyword match, row selection and the bulk 「テリトリー変更」 (FR-005, FR-014, FR-024–FR-036b) | **Phase 2**: Y-15 組織階層管理 is Phase 2 on the client's CRM Category board (clarified 2026-09-23). Implemented in integration-plan Round 3 (B1 / R301); the UI code is commented out with `TODO(round3) B1`.                                                                                                                                                                                                                                                                                                      |
| 店舗ページ管理 screens `store-page-list` / `store-page-form` (I-01)                                                                                       | Separate feature (I-01), `phases: ["2"]` in the prototype's `screens.ts`. Checked 2026-10-02 against `47423ec`: their changes since `c1c7e2e` are I-01-internal (page size 200 dropped; 写真並び順の管理 dialog; asset-sheet width) and touch no Y-02 field. The store-page form only **reads** Y-02 data (店舗名・ブランド・住所・電話番号・営業時間・休館日・店舗紹介文・アクセス情報) and links back to 店舗管理; the missing write path for 店舗紹介文 / アクセス情報 stays logged in the store form spec (Q2). |
| Store deletion                                                                                                                                            | Y-02 constraints: stores are never deleted; closure is expressed through status.                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## Traceability Matrix

| #   | UI element (`store-list.tsx`)                                   | Lines              | Requirement source                                                                                          | Spec FR        |
| --- | --------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | `PageHeader` title 店舗管理 + count badge                       | L501-504           | Y-02 FR-001 概要                                                                                            | FR-001         |
| 2   | 新規登録 `RoleGatedButton` (HQ/System)                          | L506-513           | Y-02 権限マトリクス「店舗登録: System/HQ のみ」                                                             | FR-002         |
| 3   | Search input (name / club code / territory name)                | L526-534           | Y-02 FR-001「検索条件: 店舗名…」                                                                            | FR-010         |
| 4   | 詳細フィルター toggle + active count badge                      | L536-550           | Y-02 FR-001 検索条件                                                                                        | FR-011, FR-015 |
| 5   | ブランド filter                                                 | L595-607           | Y-02 FR-001「検索条件: …ブランド…」                                                                         | FR-011         |
| 6   | 都道府県 filter (data-derived options)                          | L608-619           | Y-02 FR-001「検索条件: …都道府県…」                                                                         | FR-011, FR-012 |
| 7   | 運営企業 filter (incl. 直営)                                    | L620-631           | Y-02 FR-001「運営企業（FC企業名/直営）」                                                                    | FR-011, FR-013 |
| 8   | エリア filter                                                   | L632-643           | Y-02 FR-001 v5「検索条件: …エリア…」                                                                        | FR-011, FR-014 |
| 9   | テリトリー filter, disabled until area chosen                   | L644-668           | Y-02 FR-002「エリア → テリトリーの2段カスケードセレクト」                                                   | FR-014         |
| 10  | ステータス filter                                               | L669-678           | Y-02 FR-001「ステータス（営業中/閉店）」                                                                    | FR-011, FR-007 |
| 11  | `FilterResultBanner`                                            | L683-689           | Y-02 FR-001 検索 (UI convention)                                                                            | FR-016         |
| 12  | 店舗コード column, sortable                                     | L706               | Y-02 FR-001「店舗ID（コード）」+ QA #201 client answer                                                      | FR-003, FR-019 |
| 13  | 店舗名 column, sortable                                         | L707               | Y-02 FR-001「店舗名」                                                                                       | FR-003, FR-019 |
| 14  | ブランド column (`BrandBadge`)                                  | L708, L750         | Y-02 FR-001「ブランド」                                                                                     | FR-003, FR-006 |
| 15  | 都道府県 column                                                 | L709, L752         | Y-02 FR-001「都道府県」                                                                                     | FR-003         |
| 16  | 運営企業 column (FC name / 直営)                                | L711, L754         | Y-02 FR-001「運営企業（FC企業名/直営）」                                                                    | FR-003, FR-004 |
| 17  | テリトリー column (territory + area, 未設定)                    | L713, L756-765     | Y-02 FR-001 v4「エリア・テリトリー列」                                                                      | FR-003, FR-005 |
| 18  | ステータス column badge                                         | L714, L766-768     | Y-02 FR-001「ステータス（営業中/閉店）」                                                                    | FR-003, FR-007 |
| 19  | Selection checkbox column (HQ/System only)                      | L696-705, L738-746 | Y-02 FR-001「バルクアクション…権限は System / Headquarter のみ」                                            | FR-024, FR-026 |
| 20  | Bulk bar (count / 選択解除 / 選択中のみ表示 / テリトリーを変更) | L554-590           | Y-02 FR-001 バルクアクション                                                                                | FR-028, FR-029 |
| 21  | Select-all two-step dialog                                      | L846-864           | Y-02 FR-001「対象件数を確認ダイアログで明示」                                                               | FR-027         |
| 22  | Bulk territory change dialog                                    | L867-977           | Y-02 FR-001 + Y-15 FR-M005                                                                                  | FR-030–FR-036  |
| 23  | Destination `TerritoryCombobox`                                 | L884               | Y-02 FR-002 テリトリー選択                                                                                  | FR-030         |
| 24  | Destination hierarchy path line                                 | L885-889           | Y-02 FR-002「上位階層はテリトリーから自動確定」                                                             | FR-031         |
| 25  | Pre/post distribution block                                     | L892-924           | Y-02 FR-001「変更前分布 / 対象件数を確認」                                                                  | FR-032, FR-033 |
| 26  | Cross-area warning                                              | L926-936           | Y-02 FR-001 組織改編時の影響明示                                                                            | FR-034         |
| 27  | Target store preview (max 5 + 他 N 件)                          | L938-967           | Y-02 FR-001「対象件数を確認ダイアログで明示」                                                               | FR-035         |
| 28  | Execute + success toast                                         | L444-454, L970-975 | Y-02 FR-001 バルクアクション実行                                                                            | FR-036         |
| 29  | Empty state (filtered / empty)                                  | L719-732           | UI convention                                                                                               | FR-018         |
| 30  | Pagination footer + page-size select                            | L793-839           | UI convention (300-store master)                                                                            | FR-020–FR-023  |
| 31  | Row click → store detail                                        | L737               | Y-02 FR-001 一覧から詳細へ                                                                                  | FR-037         |
| 32  | Row overflow menu → 編集 (HQ/System)                            | L769-783           | Y-02 権限マトリクス「基本情報編集: System/HQ」                                                              | FR-038         |
| 33  | List ignores global store selector                              | L248-250           | Y-02 FR-001 参照スコープ (clarified 2026-08-28: rows scoped by role, header selector still does not narrow) | FR-008, FR-009 |

---

## Appendix A — Backend API Design Reference (basis for the project mock)

The mock API built for this screen mirrors the backend's API-083 design so the later swap to the real client is mechanical.

### A.1 Store list — modelled on `GET /api/v1/admin/stores`

| Query parameter              | Values                                                                                                                                                                                                                               | Present in BE design?                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `page`                       | number, default 1                                                                                                                                                                                                                    | ✅                                                        |
| `limit`                      | number, default 20 (clamped 1–100)                                                                                                                                                                                                   | ✅                                                        |
| `sort`                       | `code` \| `clubCode` \| `name` \| `createdAt`                                                                                                                                                                                        | ✅                                                        |
| `order`                      | `asc` \| `desc`                                                                                                                                                                                                                      | ✅                                                        |
| `keyword`                    | partial match on name / nameKana / code / clubCode                                                                                                                                                                                   | ✅ (territory-name matching is a mock addition — see A.3) |
| `brandEnum`                  | `Joyfit` \| `Joyfit24` \| `JoyfitYoga` \| `JoyfitPlus` \| `Fit365`                                                                                                                                                                   | ✅                                                        |
| `brandGroup`                 | `JOYFIT` \| `FIT365`                                                                                                                                                                                                                 | ✅                                                        |
| `prefecture`                 | prefecture code                                                                                                                                                                                                                      | ✅                                                        |
| `status`                     | BE design: `operating` \| `preparing` \| `temporarily_closed` \| `closed` — all four rendered one-to-one (準備中 / 営業中 / 休業中 / 閉店), per the 2026-10-02 re-resolution of Q1 (the 2026-08-28 two-value narrowing is withdrawn) | ✅                                                        |
| `fcCompanyId`                | company id or the literal `direct`                                                                                                                                                                                                   | ✅                                                        |
| `includeTotalAll`            | boolean                                                                                                                                                                                                                              | ✅                                                        |
| **area / territory filters** | —                                                                                                                                                                                                                                    | ❌ **missing in BE — mocked (see A.3)**                   |

Response item (`StoreSummaryDto`): `id`, `code` (`S-###`, auto-numbered internal store ID), `clubCode` (business code), `name`, `brandEnum`, `prefecture`, `fcCompanyId`, `fcCompanyName` (`直営` when not franchised), `status`, `createdAt` — plus `pagination` (`page`, `limit`, `totalItems`, `totalPages`).

**Narrowing withdrawn (2026-10-02)**: the status vocabulary is the backend's four values, mapped one-to-one — `preparing` 準備中 / `operating` 営業中 / `temporarily_closed` 休業中 / `closed` 閉店. No mapping decision is left open.

**Parameter naming**: the project mock keeps this repo's snake_case query convention rather than the backend's camelCase, so the swap to the real client is a rename, not a redesign:

| Mock (`GET /crm/stores`)                                                                               | Backend (`GET /api/v1/admin/stores`)                   |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `page`, `limit` (max 100 — the cap API-083 declares, and the screen's largest page size), `sort_order` | `page`, `limit` (max 100), `order`                     |
| `search`                                                                                               | `keyword` (plus territory-name matching — A.3)         |
| `brand`                                                                                                | `brandEnum` (`brandGroup` is unused by this screen)    |
| `prefecture` (display name, per the prototype)                                                         | `prefecture` (JIS code or romaji)                      |
| `fc_company_id` (incl. `direct`)                                                                       | `fcCompanyId` (incl. `direct`)                         |
| `status`                                                                                               | `status`                                               |
| `sort_by` — `club_code` \| `name` (the two sortable columns) \| `store_id` \| `created_at`             | `sort` — `clubCode` \| `name` \| `code` \| `createdAt` |
| `include_total_all` → `pagination.totalAllItems`                                                       | `includeTotalAll` → `pagination.totalAllItems`         |
| `area_id`, `territory_id`                                                                              | — (mock-only, A.3)                                     |

Response item (mock `StoreListItem`) is the store master row plus `territory_name` and `area_name`, resolved server-side the same way the backend resolves `fcCompanyName`. `pagination` is `page` / `limit` / `total` / `total_pages` (+ `totalAllItems`). A page index beyond the result set is clamped to the last page rather than returning an empty list (FR-023), and a caller with an empty permitted scope gets an empty list rather than `403` (FR-009 / Edge Cases).

### A.2 Store change history — modelled on `GET /api/v1/admin/stores/{id}/change-history`

Response item (`StoreHistoryEntryDto`): `id`, `changedBy`, `changedAt`, `changeAction`, `snapshot`; paginated, newest first. **Seed only for this feature** (FR-039).

### A.3 Gaps filled by the mock

| Gap                                                | Mock addition                                                                                                                                                                                                                                                                                                                                                                                                                                              | Backend status                                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| No organisational hierarchy at all                 | The store row carries `territory_id` and the list resolves `territory_name` / `area_name`; `GET /crm/org/areas` returns the 11 areas with their 57 territories (2 inactive) and each area's block / head-office name — one call feeds the cascade filter, the destination picker's area groups, and the hierarchy path line. Node names, IDs and ordering are taken verbatim from the prototype's `src/data/org-hierarchy.ts`, so the two stay comparable. | Raised to BE 2026-08-19; `territory` still appears 0 times in the dev Swagger as of 2026-08-27. Not asked to the client. |
| No area / territory query parameters               | `GET /crm/stores` accepts `area_id` and `territory_id`                                                                                                                                                                                                                                                                                                                                                                                                     | Same as above                                                                                                            |
| No bulk territory reassignment endpoint            | `PATCH /crm/stores/bulk-territory` — persists the new territory, allows partial success (`updated_store_ids` + `failed[]`), is HQ/System-only, and rejects an inactive destination                                                                                                                                                                                                                                                                         | Same as above                                                                                                            |
| `keyword` does not match territory name            | Mock extends keyword matching to territory name, matching the prototype's placeholder                                                                                                                                                                                                                                                                                                                                                                      | Not raised — the prototype filters client-side                                                                           |
| Operating-company filter options                   | Mock resolves `fcCompanyId` including the literal `direct` for directly-managed stores                                                                                                                                                                                                                                                                                                                                                                     | ✅ supported by BE design                                                                                                |
| No source for the 都道府県 / 運営企業 option lists | `GET /crm/stores/filter-options` — the distinct prefectures across the caller's permitted stores ordered north to south (FR-012), and the operating companies actually operating them plus `direct` = 直営 (FR-013)                                                                                                                                                                                                                                        | Not raised — client-side in the prototype                                                                                |
| No way to fetch a specific set of stores by id     | **Not needed** — the screen accumulates the full row of every selected store client-side (FR-025a), and the select-all step fetches the whole matching set in one query. No endpoint added.                                                                                                                                                                                                                                                                | Not raised — the prototype holds all rows locally                                                                        |
| Row scoping                                        | Mock scopes every list query and every count to the caller's permitted stores (FR-009)                                                                                                                                                                                                                                                                                                                                                                     | BE reads are 「currently unscoped — STUBS.md」                                                                           |

---

## Appendix B — Implementation map (2026-08-28)

The screen was rebuilt against the prototype on this date; anything the prototype does not have (the 店舗ID and クラブコード columns as separate columns, the FC ✓ column, the geographic エリア column and its filter) was removed from the list.

### Screen

| File                                                                                                                          | Role                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`page.tsx`](<../../src/app/(private)/stores/page.tsx>)                                                                       | Page shell (`PageHeader` + count badge + 新規登録), bulk bar, select-all second step, bulk execution + partial-failure handling, paging   |
| [`_hooks/use-stores-filters.ts`](<../../src/app/(private)/stores/_hooks/use-stores-filters.ts>)                               | URL state (keyword, 6 filters, sort, page, page size), area→territory cascade, active-filter count, banner summary, filter-option queries |
| [`_components/stores-filters.tsx`](<../../src/app/(private)/stores/_components/stores-filters.tsx>)                           | Search box + 詳細フィルター panel (6 selects, disabled-territory tooltip, active highlighting)                                            |
| [`_components/stores-table-columns.tsx`](<../../src/app/(private)/stores/_components/stores-table-columns.tsx>)               | Columns 店舗コード / 店舗名 / ブランド / 都道府県 / 運営企業 / テリトリー / ステータス, selection column, row menu, 2-state sort header   |
| [`_components/store-bulk-territory-dialog.tsx`](<../../src/app/(private)/stores/_components/store-bulk-territory-dialog.tsx>) | FR-030–FR-035 confirmation dialog                                                                                                         |
| [`_components/territory-combobox.tsx`](<../../src/app/(private)/stores/_components/territory-combobox.tsx>)                   | Destination picker (area-grouped, searches territory + area name, never shows an internal id)                                             |
| [`_constants/constants.ts`](<../../src/app/(private)/stores/_constants/constants.ts>)                                         | Brand / status labels and badges, the two-value status filter options, filter defaults                                                    |

Shared components reused rather than re-implemented: `PageHeader` (title + count badge + actions, sticky — the same header the rest of the app uses), `FilterResultBanner`, `TablePaginationWithSize`, `Empty`, `DataTable`, `RoleGatedButton`, `RoleGatedMenuItem`. The cross-page selection mechanism mirrors the member list's.

### Mock API

| Endpoint                                                                       | File                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `GET /crm/stores` (keyword, 6 filters, sort, paging, scoping, `totalAllItems`) | [`crm/stores/route.ts`](../../src/app/api/crm/stores/route.ts)                                         |
| `GET /crm/stores/filter-options`                                               | [`crm/stores/filter-options/route.ts`](../../src/app/api/crm/stores/filter-options/route.ts)           |
| `PATCH /crm/stores/bulk-territory`                                             | [`crm/stores/bulk-territory/route.ts`](../../src/app/api/crm/stores/bulk-territory/route.ts)           |
| `GET /crm/org/areas`                                                           | [`crm/org/areas/route.ts`](../../src/app/api/crm/org/areas/route.ts)                                   |
| `GET /crm/stores/{id}/change-history` (seed only, FR-039)                      | [`crm/stores/[id]/change-history/route.ts`](../../src/app/api/crm/stores/[id]/change-history/route.ts) |

Schemas: [`_schemas/store.schema.ts`](../../src/app/api/_schemas/store.schema.ts), [`_schemas/org-hierarchy.schema.ts`](../../src/app/api/_schemas/org-hierarchy.schema.ts).
Data: [`_mock-db/seeds/org-hierarchy.seed.ts`](../../src/app/api/_mock-db/seeds/org-hierarchy.seed.ts), [`_mock-db/tables/org-hierarchy.table.ts`](../../src/app/api/_mock-db/tables/org-hierarchy.table.ts), [`_mock-db/tables/store.table.ts`](../../src/app/api/_mock-db/tables/store.table.ts).
`src/lib/openapi.json` and the generated client under `src/lib/api/` were regenerated from the Zod schemas.

---

## Q&A / Clarification Needed

> Consolidated for `/speckit.clarify`. Everything else in this spec is grounded in the requirement document, the UI prototype, or an already-answered QA.

### Q1 — Store status: two values or four? ✅ **RE-RESOLVED 2026-10-02 — four values** (was: two, 2026-08-28)

**2026-10-02 decision**: four independent badges — 準備中 / 営業中 / 休業中 / 閉店. The prototype adopted them at `a7d0c88` (2026-09-16), shared between list and detail via `data/stores.ts`, with the comment 「開発回答（2026/08/24）で preparing / operating / temporarily_closed / closed の4値を独立バッジで扱う方針が確定（『準備中・休業中を営業中に含める』案は不採用）」. This is exactly the follow-up condition recorded below, so the four sources (prototype, client answer, backend, and — through FR-001's spirit — Y-02) now agree. Y-02.md's own FR-001 line still reads 「ステータス（営業中/閉店）」 in v6; the prototype + client answer govern, as for every other 開発回答 item. Applied in FR-007, FR-011, Assumptions, Appendix A. Knock-on: store form FR-015a (brand lock while 準備中) is unblocked; Y-03 FC企業詳細 TC-007's four-badge note becomes correct again.

_History (2026-08-28):_

**Decision**: the screen **and the project mock** expose exactly 営業中 / 閉店 (`operating` / `closed`). The client's four-badge answer and the backend's four-value enum are **not** adopted yet; revisit when the prototype is updated. Recorded in FR-007, FR-011, Assumptions, and Appendix A. The record of the conflict is kept below for that follow-up.

**Applied 2026-08-28**: `StoreListStatus` was narrowed from four values to two across the mock, so no screen can render 準備中 / 休業中 any more, and the two stores seeded with those values (`store-008`, `store-009`) became 営業中. Y-03 FC企業詳細 reads the same field, so its linked-store list now shows two badge kinds instead of four — the executed test case `specs/023-fc-company-management/tests/cases/TC -…[Y-03-B2]…` TC-007 carries a note observing the old four, which is now stale.

**Where**: FR-007, FR-011; `store-list.tsx` L97-109 (`status: "営業中" | "閉店"`), L214-221 (badge map), L669-678 (filter options).

**The mismatch**:

| Source                   | Value set                                                                                                                                      | Date                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Y-02 FR-001              | 「ステータス（営業中/閉店）」 — 2 values                                                                                                       | 2026-08-03          |
| UI prototype             | 2 values, with an explicit code comment: 「Y-02 FR-001 L119…に合わせて2値に統一（2026/04/22）」                                                | 2026-08-05          |
| Backend API-083 design   | `operating` / `preparing` / `temporarily_closed` / `closed` — described as 「4 independent badges (準備中 / 営業中 / 休業中 / 閉店) — FR-001」 | verified 2026-08-27 |
| Client answer to QA #201 | 「status enum đúng là 4 giá trị… hiển thị 4 badge riêng」 — 4 independent badges, explicitly _not_ merged into 2                               | **2026-08-24**      |

**Why it needed a decision**: the client's answer is the newest and most explicit source and the backend has already implemented it, but adopting it would mean this screen deliberately deviates from the prototype (extra badge variants, four filter options instead of two) and from the wording still standing in Y-02 FR-001.

**Outcome**: two values, following the prototype. **Follow-up owed** — when the prototype is updated to four badges, this screen, the mock's status vocabulary, and the real-API status mapping all move together.

### Q2 — Does the list scope rows by role? ✅ **RESOLVED 2026-08-28 — yes, full Y-02 FR-001 scoping**

**Decision**: HQ/System unrestricted, Manager limited to their managed stores, Staff (and Trainer/Observer on the same linkage) limited to their linked store. The managed-store set and the staff→store linkage already exist in the project's data model, so no new concept is introduced. Recorded in FR-008, FR-009, US1 scenario 6, Edge Cases, and Assumptions. The conflict record is kept below.

**Where**: FR-008, FR-009; `store-list.tsx` L248-250.

**The mismatch**:

| Source               | Statement                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Y-02 FR-001 処理内容 | 「HQ は全店舗。Manager は管轄店舗。Staff は所属店舗のみ参照可能」 — three different scopes                          |
| Y-02 権限マトリクス  | 店舗一覧・基本情報参照: HQ ○ 全店舗 / Manager ○ 全店舗 参照のみ / Staff ○ 所属店舗 — Manager sees everything        |
| Y-02 Manager note    | 「Yカテゴリーはマスタ・システム管理系のため、Manager のデータスコープは参照のみ（全データ）」(Y-01 v2.3)            |
| UI prototype         | `const scopedStores = STORES` with a comment citing the permission matrix — **no scoping for anyone**, deliberately |
| Backend API-083      | 「reads currently unscoped — STUBS.md」 — the real endpoint does not scope either, yet                              |
| Current project mock | Restricts Staff to their linked stores, and returns 403 when a role has no store                                    |

**Why it needed a decision**: it determines whether a Staff user sees one row or three hundred, and whether the mock must carry per-role scoping at all.

**Outcome**: the FR-001 prose wins over the permission matrix and over the prototype. The Manager scope is drawn from the managed-store set already attached to Manager users; the Staff/Trainer/Observer scope from the staff record's linked store (falling back to the linked FC company's stores). The Y-02 permission matrix line 「Manager ○ 全店舗 参照のみ」 is treated as superseded for this screen.

### Q3 — Informational: territory support is entirely mocked _(no answer needed)_

Recorded here so it is visible at planning time, not because it blocks: the Y-15 organisational hierarchy that this screen's テリトリー column, cascade filter, and bulk action all depend on does not exist in the backend design at all (see Appendix A.3). This was raised to the backend on 2026-08-19 and deliberately **not** escalated to the client — Y-15 was only specified on 2026-07-30 and the backend has not caught up. The mock supplies it; nothing here is blocked.
