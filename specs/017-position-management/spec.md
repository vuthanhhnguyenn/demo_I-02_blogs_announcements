# Feature Specification: Y-01 Position Master Management (職位マスター管理)

**Feature Branch**: `017-position-management`
**Created**: 2026-07-16
**Status**: Draft
**PO Spec**: `Y-01` — スタッフ・権限管理 (Staff & Permission Management) — this spec covers the Position Master slice only (FR-006, FR-S001, plus the FR-009 permission preview realized inside the list screen)
**Source**: `src/pages/position-list.tsx`, `src/pages/position-form.tsx` (dx-fitness/fitness-crm-ui @ 426a9b3 2026-07-23) + `crm/requirements/Y-01.md` (dx-fitness/fitness-spec @ 89448e0, Y-01 260722_v4) + Staff & Permission Management API design **v0.3** (fitness-dx CRM API docs, downloaded 2026-07-29 — `/api/v1/admin/positions*`, `/api/v1/admin/permissions`, `/api/v1/admin/roles`)
**Input**: User description: "Create spec for screen Y-01 (Position Management). Spec: Y-01.md (FR-006, FR-S001). UI Code: position-list.tsx, position-form.tsx. Phase 1 only. Change history: seed only — no create/update/delete history handling. Use the Staff & Permission Management BE API design to create the API in this project."

## Clarifications

### Session 2026-09-17 (real-API integration round 2 — catalog becomes the sole source of truth)

The backend refreshed `src/lib/openapi.real.json` again (catalog gained a per-permission `description`; `PositionDto` gained a `permissions` map keyed by `permissionKey`, plus `staffCount`). **These are spec-level changes the PO and the design have not applied to this document yet.** Per the user's directive of 2026-09-17 the implementation **follows the API**, and the divergence is recorded here rather than silently absorbed. Every item below is an FE-side decision awaiting PO ratification.

- Q: The catalog now returns each permission's helper `description` (non-null on 13 keys). Keep the FE's own description map as well? → A: **No — delete it.** The FE defines no catalog metadata at all: keys, labels, order, categories, `type` and `description` are all server-owned (FR-009a amended). Consequence: the FE also stops declaring the 58-key literal list, so the compile-time key safety of `integration-plan.md` **D3** is gone — an unknown key is caught server-side as `E-VAL-001` instead.
- Q: `can_edit_gate_stop` (Q5) still has no catalog flag. Keep rendering the disabled 「API未対応」 row (the UI-first fallback of rounds 1–2)? → A: **No — the row is removed from the form.** Under "render only what the API returns", a permission absent from the catalog is absent from the UI. **This weakens Y-01 FR-006 v2 coverage** (ゲートストップ設定の変更 is no longer configurable per position) and is the item most in need of a PO call. Q5 stays OPEN as a BE ask; if the column ships, the toggle reappears through the catalog with no FE change.
- Q: The catalog's `type` field also classifies keys as `destructive`, contradicting FR-007a's fixed three-key 重要操作 set (Clarifications 2026-09-08 deliberately excluded `can_anonymize_member`). Which wins? → A: **The API classification wins** (same directive). The warning icon is driven by `type === 'destructive'`, so it appears on more categories than the prototype showed. The BE's own schema calls this classification "Otaki ruling pending" — tracked as **Q6**.
- Q: `PositionDto.staffCount` now exists — keep deriving the preview pane's count from the assigned-staff query? → A: **No**, read `staffCount` off the position detail (FR-008); the staff query is kept only for the top-3 names.
- Q (validation audit, same day): do the FE form/filter rules match the BE query and body schemas? → A: **Three gaps found and closed** — the list `search` box was uncapped (BE `maxLength: 100`), `page` was not clamped to the BE's `minimum: 1`, and `role` was validated as any non-empty string instead of the 6-value `crm_role` enum. Codified as a new **Input Validation Rules** table under Requirements; FR-002 and FR-005 amended. FR-005's page-size list was also corrected from 25/50/100/200 to **25/50/100** — the BE caps `limit` at 100, so 200 was never reachable (an undocumented drift dating from integration round 1, decision D4).

### Session 2026-09-08 (real-API integration — `src/lib/api-real`)

Raised while planning the Round 1 real-API integration (see [integration-plan.md](./integration-plan.md)); both answers were decided against the real API surface (`src/lib/openapi.real.json`, API-082) and the backend source of truth (`fitness-backend-v2`).

- Q: `can_edit_gate_stop` (ゲートストップ設定の変更) has no flag in the real catalog (58 keys) — drop the toggle, keep it disabled, or ask the BE for a dedicated column? → A: **Ask the BE for a dedicated `positions.can_edit_gate_stop` column.** The toggle **stays in the form**; Round 1 renders it disabled with an 「API未対応」 note and strips the key from every request body (sending it is `E-VAL-001`), and Round 2 wires it for real once the column exists. Q5 stays open as a concrete BE ask — **not** as "covered by `can_edit_gate_setting`" (see Q5 for the evidence that the two are different capabilities).
- Q: Should `can_anonymize_member` (会員の匿名化 — HQ-only, irreversible, 5-step guard, `confirmation="ANONYMIZE"` in the BE) join the FR-007a 重要操作 warning set? → A: **No — the set stays at the prototype's three keys** (強制退会の実行 / 請求確定後の変更 / 返金処理の実行). Widening it would dilute the warning; the integration changes no FR-007a behaviour.

### Session 2026-07-29 (API-team QA answers + prototype 7/23 design update)

The three contract gaps raised as QA to the API team were answered on 2026-07-29 (GChat, relayed by Yến). All three are now resolved in API design v0.3:

- Q (Otaki): Is `description` (説明) added to the position contract? → A: **Yes** — `positions.description` is now an official field on `PositionCreateBody` / `PositionUpdateBody` / `PositionDetail` / `PositionListItem` (nullable, ≤ 500 chars; PATCH: omitted = unchanged, explicit `null` = clear). The former mock-side extension (Clarification Q1) is no longer a gap; the mock aligns its limit to 500.
- Q (Otaki): Is there a standalone permission-catalog endpoint so the create form has a source for its toggles, or must the FE hardcode the keys? → A: **New endpoint `GET /api/v1/admin/permissions`** returns the full catalog (category / `permissionKey` / label, no `positionId`) and is the declared SoT for the create-form toggles and the preview item definitions. The mock mirrors it as `GET /api/crm/permissions`, and the form renders its categories from it instead of a hardcoded list.
- Q (Otaki): Confirm the permission-count divergence. → A: The API-side omission (追従漏れ) is **fixed** — the catalog is now **58 flags / 10 categories** with `csv_export` as an official independent category (FR-S001) and the Y-02 store-item flags added. Decision for this feature: the **rendered UI stays at the prototype's 36 toggles** (the 23 BE flags no prototype screen exposes join at the Phase 2 cutover); the mock adopts the BE `categoryKey` `csv_export`. `can_edit_gate_stop` (ゲートストップ設定の変更) is the **only remaining FE extension** — the API still has no flag for it although Y-01 FR-006 v2 requires it; kept in the catalog as an extension and re-raised to the API team.
- Q (Kyota): What is the 権限フラグ block in the preview pane for? → A: **権限フラグ = アクセス権限 — the same axis; merge into one** (the API needs no separate field). The prototype 7/23 update implements exactly this: the 権限フラグ section is **removed** from the preview pane, the list column is renamed 権限フラグ数 → **アクセス権限数**, and destructive permissions are instead surfaced as a warning icon on the owning category row.

Prototype 7/23 (`@426a9b3`) additionally changed on this screen: the filter-result banner moved inside the list card (below the toolbar); the 割当スタッフ panel shows **3** staff with an initial-circle avatar, a 無効 badge, the store on a sub-line, a hover arrow, and a 無効{N}名 count next to the total.

### Session 2026-07-16

- Q: The position 説明 (description) field exists in the V0 prototype but not in the backend API design — keep, drop, or display-only? → A: Keep the field fully editable as in V0; extend the project's mock API/table with `description`; flag the gap to the BE team. **(Superseded 2026-07-29: the BE added the field — no longer an extension.)**
- Q: Which permission catalog is authoritative for Phase 1 — the prototype's 36 toggles / 10 categories (CSV independent, per FR-S001) or the BE design's 41 `can_*` flags / 9 preview categories (no `csv` key)? → A: The prototype's 36-key / 10-category catalog (CSV出力管理 as an independent category) is the Phase 1 catalog for the mock API and UI; the divergence from the BE 41-key/9-category structure is flagged to the API team as a contract gap. **(Refined 2026-07-29: the BE catalog is now 58 flags / 10 categories including `csv_export`; the rendered UI stays at 36 and the mock adopts the BE category key.)**
- Q: In edit mode, should the 対象ロール selector be disabled (BE: role immutable after creation) or stay editable (prototype leaves it enabled)? → A: Disable it in edit mode, showing the current role; create and clone modes keep it selectable. Deliberate deviation from the V0 prototype, consistent with the BE contract and the Y-01 three-layer model / FR-007 invariant.

## User Scenarios _(mandatory)_

### User Story 1 - Browse positions and preview their permissions (Priority: P1)

As a Headquarter (or System) user, I can open the Position Master Management screen, search positions by name, reverse-filter by a specific fine-grained permission, page through the list, and select a position to see a full read-only preview of what that position can do (category access, individual permissions, permission flags) and who currently holds it — so I can audit and explain the permission design without opening the edit form.

**Why this priority**: The list plus permission preview is the entry point for every other position workflow (create, edit, clone, delete) and on its own satisfies the "explain/confirm to staff" purpose of FR-009. Without it no other operation can be initiated.

**Verification**: Load the page, confirm the position table renders with counts, type a partial name into search, pick a permission in the "権限で絞り込む" popover, confirm the list narrows and the result banner appears, click a row and confirm the right pane shows category access levels, fine permissions, and assigned staff.

**Acceptance Scenarios**:

1. **Given** the screen is loaded, **When** the table renders, **Then** each row shows the position name with its description beneath, the target role as a badge, an アクセス権限数 count in "N / total" form, and the assigned-staff count ("N名" as a link, or "—" when zero), and the page header shows the total position count as a badge.
2. **Given** the list is displayed, **When** the user types a partial position name into the search box ("職位名で検索..."), **Then** only positions whose name contains that text (case-insensitive) remain, and a result banner reports "全 N 件中 M 件を抽出中" with the search text and a one-click "条件をクリア" action.
3. **Given** the user opens the "権限で絞り込む" popover, **When** they search and select one fine-grained permission (grouped by permission category), **Then** only positions that actually hold that permission remain (AND-combined with the name search), the filter button switches to its active visual state, the banner names the selected permission, and re-opening the popover shows a check mark on the selected item.
4. **Given** a search/filter combination matches zero positions, **When** the table renders, **Then** a "no match" empty state with a clear-conditions action is shown; **Given** the master itself has zero positions with no active conditions, **Then** a plain "no positions registered" empty state without a clear action is shown.
5. **Given** more positions exist than the page size, **When** the user changes the page-size selector (25/50/100/200, default 50) or uses the pagination controls (with ellipsis compression beyond 7 pages), **Then** the footer reports total count, total pages, and the visible row range, and previous/next are disabled at the boundaries.
6. **Given** no row is selected, **When** the user views the right pane, **Then** a placeholder card instructs "職位を選択してください"; **When** the user clicks a row (or arrives with a `positionId` URL parameter, or clicks the assigned-staff count link), **Then** the row is highlighted and the right pane shows: the position name, role badge, description, and a "権限を編集" button; a per-category accordion where each category shows an access-level icon and label (閲覧・編集 / 閲覧のみ / アクセス不可 — the CSV category instead shows 出力可 / 出力不可), a warning icon (tooltip "強制退会・返金など重要操作を含みます") when the category holds a granted 重要操作 permission, plus an enabled/total badge, expanding to the individual permissions each marked granted or not; clicking the same row again deselects it and restores the placeholder. There is **no** separate 権限フラグ section — it is the same axis as アクセス権限 and was merged into the accordion (API-team answer 2026-07-29).
7. **Given** a position is selected, **When** the user views the 割当スタッフ section, **Then** it shows the total count (plus a 無効{N}名 note when any shown staff is inactive), up to 3 assigned staff (active ones first) each rendered with an initial-circle avatar, name, a 無効 badge when inactive, their store on a sub-line and a hover arrow, linking to that staff's detail page, "割当なし" when none, and a link — "他 N 名を見る →" when more exist, otherwise "スタッフ一覧で見る →" — that opens the staff list pre-filtered to this position.

---

### User Story 2 - Create a new position with its permission set (Priority: P1)

As a Headquarter (or System) user, I can register a new position — name, target role, description, and the full set of permission toggles — so the organization can add job grades without development work, with CSV-export permissions defaulting per role as mandated by FR-S001.

**Why this priority**: Creating positions without development effort is the core stated purpose of FR-006 ("職位マスターは HQ が CRM 管理画面から追加・編集可能。開発工数不要").

**Verification**: Click "職位を追加", fill name and role, toggle some permissions, save, and confirm the new position appears in the list; repeat choosing role 本部 and confirm the three CSV toggles default ON.

**Acceptance Scenarios**:

1. **Given** the create form ("職位 新規作成") is open, **When** it renders, **Then** it shows a 基本情報 section (職位名 required text input; 対象ロール required single-select offering exactly 本部 / マネージャー / スタッフ / トレーナー / 閲覧のみ; 説明 optional textarea) and a 権限設定 section listing every permission category as an accordion item (all expanded by default), each with an enabled/total count badge, a bulk 全ON/全OFF switch, and one toggle per permission with its label and (when present) helper description.
2. **Given** a new form, **When** it initializes, **Then** all permission toggles start OFF and no role is selected.
3. **Given** the user selects a role, **When** the role is 本部 or マネージャー, **Then** the CSV出力管理 toggles (会員CSV / 入退館CSV / アンケートCSV) switch to ON as the role default; **When** the role is スタッフ, トレーナー, or 閲覧のみ, **Then** they switch to OFF; changing the role again in create mode re-applies that role's CSV defaults while leaving all other toggles untouched.
4. **Given** the user flips a category's bulk switch, **When** it is turned ON/OFF, **Then** every toggle in that category is set accordingly, and the switch reflects "全ON" only when all of the category's permissions are on.
5. **Given** 職位名 is blank or 対象ロール is unselected, **When** the user submits, **Then** submission is blocked, an inline error appears under each offending field ("職位名を入力してください" / "対象ロールを選択してください"), a footer summary "未入力の項目があります" appears, and the view scrolls to the first invalid field; typing into / selecting the field clears its inline error.
6. **Given** all required fields are valid, **When** the user submits, **Then** the position is created, a success confirmation "職位を登録しました" is shown, and the user returns to the list where the new position is visible.
7. **Given** a position with the same name already exists for the same role, **When** the user submits, **Then** the creation is rejected and the user is told the name is already in use for that role (name must be unique per role, max 100 characters).
8. **Given** the user has changed anything on the form, **When** they click キャンセル or the "職位マスター管理に戻る" back link, **Then** a discard-confirmation dialog ("変更を破棄しますか？") appears, and only explicit "破棄する" leaves the page; "編集を続ける" stays.

---

### User Story 3 - Edit an existing position's permissions (Priority: P2)

As a Headquarter (or System) user, I can open an existing position in the edit form ("職位 編集") — from the row menu or the preview pane's "権限を編集" button — change its name, description, and permission toggles, and save, so organizational/permission changes take effect immediately for all staff holding that position.

**Why this priority**: Editing is the operational core of "組織変更に即時追随" but requires the list and create flows to exist first.

**Verification**: From a row's ⋯ menu choose 編集, confirm the form is pre-filled with the position's current values, flip a toggle, save, and confirm the success message and updated values.

**Acceptance Scenarios**:

1. **Given** the user chooses 編集 (row menu) or 権限を編集 (preview pane), **When** the form opens, **Then** the title reads "職位 編集" and all fields — name, role, description, and every permission toggle — are pre-filled with the position's current values.
2. **Given** the edit form is open, **When** it renders, **Then** the 対象ロール selector shows the position's current role but is disabled — the role of an existing position can never be changed (per Clarifications; role is immutable after creation). CSV role-default seeding never runs in edit mode.
3. **Given** valid inputs, **When** the user saves, **Then** the changes persist, "職位の変更を保存しました" is shown, the user returns to the list, and the changed permissions apply to assigned staff from their next request/login (per FR-005/FR-006 immediate-effect rule).
4. **Given** unsaved edits exist, **When** the user attempts to leave, **Then** the same discard-confirmation guard as creation applies.
5. **Given** renaming collides with another position of the same role, **When** the user saves, **Then** the save is rejected with the duplicate-name message.

---

### User Story 4 - Clone a position as a starting point (Priority: P3)

As a Headquarter (or System) user, I can choose 複製 on a position to open a pre-filled "職位 複製して作成" form and save it as a new position, so I can define a variant (e.g., テリトリーMGR with survey-creation added) without re-entering dozens of toggles.

**Why this priority**: Convenience accelerator over Story 2; valuable but not blocking.

**Verification**: Choose 複製 from a row menu, confirm the form opens in clone mode pre-filled with the source's values, save under a new name, and confirm a new position appears while the source is unchanged.

**Acceptance Scenarios**:

1. **Given** the user chooses 複製 from a row's ⋯ menu, **When** the form opens, **Then** the title reads "職位 複製して作成" and the source position's role, description, and permission toggles are pre-filled; saving creates a NEW position (the source is untouched) with zero assigned staff.
2. **Given** the clone form, **When** the user saves without changing the name, **Then** the per-role duplicate-name rule applies exactly as in creation.

---

### User Story 5 - Delete an unused position, guarded by assignment (Priority: P3)

As a Headquarter (or System) user, I can delete a position that no staff currently holds, with a confirmation dialog, and I am prevented from deleting a position that still has assigned staff — so permission definitions can be cleaned up without ever stranding staff accounts.

**Why this priority**: Completes the master lifecycle; used rarely compared to browse/create/edit.

**Verification**: On a position with assigned staff, open the ⋯ menu and confirm 削除 is disabled and labeled "削除（割当あり）"; on a position with zero staff, choose 削除, confirm the dialog, and verify the row disappears.

**Acceptance Scenarios**:

1. **Given** a position with one or more assigned staff, **When** the user opens its ⋯ menu, **Then** the delete item is disabled and reads "削除（割当あり）".
2. **Given** a position with zero assigned staff, **When** the user (HQ/System) chooses 削除, **Then** a confirmation dialog "職位を削除しますか？" explains "「{職位名}」を削除します。この操作は取り消せません。"; confirming "削除する" permanently removes the position, canceling makes no change.
3. **Given** a deletion succeeds, **When** the list re-renders, **Then** the position no longer appears and the total count badge decreases; if the deleted position was selected, the preview pane returns to its placeholder.

### Edge Cases

- Arriving with a `positionId` URL parameter that matches no position → no row is selected; the placeholder preview is shown (no error).
- Name search and permission filter are AND-combined; clearing conditions resets both and returns to page 1.
- Changing search, permission filter, or page size resets the current page to 1; if the current page exceeds the new total pages (e.g., after deleting the last row of the last page), the display clamps to the last valid page.
- A permission-filter match must reflect actual grant state, not category labels — e.g., filtering by "アンケートの作成" matches only positions whose survey-creation permission is actually granted.
- The assigned-staff count link ("N名") selects the row without triggering the row's toggle-deselect behavior (event does not double-fire).
- Clone of a position with assigned staff → the new position starts with zero assigned staff.
- Deleting a position is blocked server-side as well when staff are assigned (defense in depth vs. the disabled menu item) and when the position is system-managed (seed-protected).
- Role change in the create form re-seeds only the three CSV toggles; manually-set CSV toggles are overwritten by the re-seed, other categories are never touched.
- In edit mode the role can never change (selector disabled; update API accepts no role) — so a position's staff/role consistency (FR-007 invariant) can never be broken from this screen.
- Duplicate (role, name) create/rename race → the request is rejected by the uniqueness rule; the user sees the duplicate-name error.
- A non-HQ/non-System user must not see usable 職位を追加 / 編集 / 複製 / 削除 actions (role-gated affordances).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001 (List Rendering)**: System MUST display a paginated table of position masters where each row shows: position name with description as a sub-line, target role (badge), an **アクセス権限数** count as "N / total" (renamed from 権限フラグ数 per the 2026-07-29 answer), and assigned-staff count ("N名" link when > 0, "—" when 0). The page header MUST show the screen title "職位マスター管理", the total count badge, and a role-gated "職位を追加" action.
- **FR-002 (Name Search)**: System MUST support case-insensitive partial-match search on position name. The search box MUST cap input at **100 characters**, mirroring the list endpoint's `search` (`maxLength: 100`) — an over-long keyword is capped where the operator can see it rather than returning `400 E-VAL-001` (added 2026-09-17, validation audit).
- **FR-003 (Reverse Permission Filter)**: System MUST let the user pick exactly one fine-grained permission from a searchable, category-grouped picker ("権限で絞り込む") and narrow the list to positions that hold that permission (respecting grant semantics), AND-combined with the name search. The trigger button MUST show an active state while a filter is applied, and the picker MUST show which permission is selected and an empty message ("該当する権限がありません") when the picker search matches nothing.
- **FR-004 (Result Banner & Clear)**: While any search/filter condition is active, System MUST show a banner **inside the list card, directly below the toolbar** (prototype 7/23 placement) reporting "全 {total} 件中 {matched} 件を抽出中" plus a summary of the active conditions, with a single "条件をクリア" action that resets search, filter, and page simultaneously.
- **FR-005 (Pagination)**: System MUST paginate with selectable page size (~~25/50/100/200~~ **25/50/100**, default 50 — the BE caps `limit` at 100, so 200 is not offered; corrected 2026-09-17) and MUST clamp the page number to **≥ 1** (BE: `page` `minimum: 1`), report "全 N 件 / P ページ / X-Y を表示", provide previous/next (disabled at boundaries) and numbered pages with ellipsis compression when total pages exceed 7, and reset to page 1 when conditions or page size change.
- **FR-006 (Empty States)**: System MUST distinguish a filtered-empty state (with a clear-conditions action) from a true empty master (no action) in the table body.
- **FR-007 (Selection & Permission Preview)**: System MUST support selecting a single position (row click toggles; `positionId` URL parameter preselects; assigned-staff count link selects) and render a permission preview pane: placeholder card when nothing is selected; otherwise the position's name, role badge, description, a "権限を編集" action, and a per-category accordion where each category shows an access-level indicator (edit / view-only / no-access; the CSV category renders as 出力可/出力不可), an enabled/total badge, and expands to individual permissions each marked granted/not granted. This realizes source FR-009 (職位別権限プレビュー) within the list screen. The pane MUST NOT render a separate 権限フラグ section (merged into the accordion — 2026-07-29 answer).
- **FR-007a (重要操作 Warning Indicator)**: When a category holds at least one **granted** destructive permission (強制退会の実行 / 請求確定後の変更 / 返金処理の実行), its accordion trigger MUST show a warning icon whose tooltip reads "強制退会・返金など重要操作を含みます". This is the prototype 7/23 replacement for the removed 権限フラグ list. ~~The 重要操作 set is **exactly these three keys** and does not widen with the real catalog's 58 flags — 会員の匿名化 (`can_anonymize_member`) is deliberately excluded (Clarifications 2026-09-08).~~ **Amended 2026-09-17 (FE-side, PO ratification pending — Q6)**: the set is no longer FE-held. A permission counts as 重要操作 when the catalog marks it `type: 'destructive'`, so the warning surfaces on more categories than the prototype's three keys (匿名化・各種削除 included). The tooltip copy is unchanged.
- **FR-008 (Assigned Staff Panel)**: For a selected position the preview MUST show the assigned-staff total (with a 無効{N}名 note when any displayed staff is inactive), up to 3 assigned staff sorted active-status-first — each showing an initial-circle avatar, the name, a 無効 badge when inactive, the store on a sub-line, and a hover arrow, linking to the staff detail screen — "割当なし" when zero, and a navigation link to the staff list pre-filtered by this position ("他 N 名を見る →" when more than the shown 3 exist, otherwise "スタッフ一覧で見る →").
- **FR-009 (Create Position)**: System MUST provide a create form ("職位 新規作成") with: 職位名 (required, non-empty, max 100 chars), 対象ロール (required; exactly one of the five selectable roles 本部/マネージャー/スタッフ/トレーナー/閲覧のみ — the System role is never selectable), 説明 (optional, max 500 chars per the BE contract), and per-permission toggles grouped into category accordions (all expanded initially) with per-category enabled/total badges and bulk 全ON/全OFF switches. All toggles default OFF except the CSV role defaults (FR-011). On success the system MUST confirm ("職位を登録しました") and return to the list. The 説明 field is an official BE field as of API design v0.3 (2026-07-29) — no longer a mock extension.
- **FR-009a (Permission Catalog Source)**: The form's permission categories, keys, labels, and ordering MUST come from the permission-catalog endpoint (`GET /api/crm/permissions`, mirroring the BE's `GET /api/v1/admin/permissions`) rather than a hardcoded FE list — this is the API team's declared SoT (2026-07-29 answer). ~~UI-only presentation metadata the catalog contract does not carry (each permission's optional helper description, and the view/edit `kind` used to derive the preview's category access level) MAY remain feature-local and is merged in by `permissionKey`.~~ **Amended 2026-09-17 (FE-side, PO ratification pending)**: the catalog now carries both — `description` (nullable helper text) and `type` (`view` / `edit` / `destructive`) — so **no catalog metadata is FE-held any more**. The FE declares no permission key, label, order, category, description or classification; a permission the catalog does not return is not rendered, and a catalog change needs no FE change.
- **FR-010 (Per-Role Name Uniqueness)**: System MUST reject creating or renaming a position when another position with the same role already uses the same name, with a user-facing duplicate-name error.
- **FR-011 (CSV Export Permission Category — source FR-S001)**: The permission catalog MUST include CSV output management ("CSV出力管理" — 会員CSV / 入退館CSV / アンケートCSV) managed independently of other categories, under the BE category key `csv_export`. In create mode, selecting a role MUST seed these CSV toggles to the role default — 本部 and マネージャー ON, スタッフ / トレーナー / 閲覧のみ OFF — and re-seed them whenever the role changes before first save; prefilled (edit/clone) forms MUST NOT re-seed. ~~The Phase 1 rendered catalog is the prototype's 36 permissions in 10 categories … `can_edit_gate_stop` remains the single FE extension with no BE flag (open gap).~~ **Amended 2026-09-17 (FE-side, PO ratification pending)**: the rendered catalog is **whatever `GET /api/v1/admin/permissions` returns** — currently 58 flags in 10 categories, i.e. the Phase 2 cutover happened implicitly. `can_edit_gate_stop` is **no longer rendered at all** (no catalog flag — Q5). The CSV keys the role default applies to are read from the catalog's `csv_export` category rather than an FE list; only the per-role ON/OFF rule stays FE-side.
- **FR-012 (Edit Position)**: System MUST provide an edit form ("職位 編集") pre-filled with the position's current name, role, description, and permission toggles, applying the same validation as creation, confirming success ("職位の変更を保存しました"), and returning to the list. The 対象ロール selector MUST be disabled in edit mode (role is immutable after creation — per Clarifications; the update API accepts no role change). Permission changes MUST take effect for assigned staff from their next request (no re-provisioning step).
- **FR-013 (Clone Position)**: System MUST provide a clone mode ("職位 複製して作成") that opens the create flow pre-filled with the source position's role, description, and permission toggles, and on save creates a new independent position with zero assigned staff, leaving the source untouched.
- **FR-014 (Delete with Assignment Guard)**: System MUST allow deleting a position only when its assigned-staff count is zero: the row-menu delete item MUST be disabled and labeled "削除（割当あり）" while staff are assigned; otherwise deletion MUST require confirmation via a dialog ("職位を削除しますか？" / "「{name}」を削除します。この操作は取り消せません。" / キャンセル / 削除する). Deletion is physical (no soft delete for positions) and MUST also be enforced server-side (assignment guard and system-managed guard).
- **FR-015 (Required-Field Validation & Guidance)**: The form MUST block submission when 職位名 is blank or 対象ロール is unselected, showing per-field inline errors ("職位名を入力してください" / "対象ロールを選択してください"), a footer summary "未入力の項目があります", and scrolling to the first invalid field; correcting a field clears its inline error immediately.
- **FR-016 (Unsaved-Changes Guard)**: The form MUST track dirty state across every input and toggle, and prompt a discard-confirmation dialog ("変更を破棄しますか？" — 編集を続ける / 破棄する) when the user leaves via キャンセル or the back link with unsaved changes; navigation proceeds only on explicit confirmation.
- **FR-017 (Role-Gated Actions)**: The 職位を追加, 編集, 複製, and 削除 actions MUST be gated to the Headquarter and System roles (source permission matrix: 職位マスター管理 = System ○ / Headquarter ○ / all others ×). Viewing the list and preview follows the staff-viewing permission.
- **FR-018 (Fixed Role Set)**: The role dimension MUST be the fixed 6-role set (System, Headquarter, Manager, Staff, Trainer, Observer); roles can never be created, renamed, or deleted from this screen, and only the five non-System roles are assignable to a position.
- **FR-019 (Change History — Seed Only, per user directive)**: Phase 1 MUST seed staff change-history records in the mock database (for consumption by the staff screens / FR-010 of the source spec) but MUST NOT write, update, or delete history records as a side effect of position create/edit/clone/delete operations on this screen.

### Input Validation Rules (mirrored from the BE contract)

Audited 2026-09-17 against `src/lib/openapi.real.json` (API-082). Every FE rule below MUST mirror the
server constraint so a valid form cannot produce a `400 E-VAL-001`, and an invalid one is caught
before the request. Where the FE is deliberately **stricter** than the server it is marked as such.

| Field / param                      | BE constraint                                                         | FE rule (required)                                                                                                           | Note                                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 職位名 `name` (create / edit)      | required, `type: string`, `maxLength: 100`; **no server minimum**     | required, trimmed, 1–100 chars; input `maxLength={100}`; messages per FR-015                                                 | **FE stricter**: blank/whitespace-only is rejected client-side (FR-015), the server would accept `""`             |
| 説明 `description` (create / edit) | `maxLength: 500`, nullable; PATCH omitted = unchanged, `null` = clear | optional, ≤ 500 chars, live `n/500` counter, input `maxLength={500}`; trimmed on submit, empty → `null` (clears)             | `type: object` in the BE schema is a codegen defect, not a validation rule — see integration-plan **B3**          |
| 対象ロール `role` (create / clone) | required, `enum` of the 6 `crm_role` values                           | required; value MUST be one of those 6 (was an unconstrained non-empty string until 2026-09-17)                              | Only the 5 non-System roles are _offered_ (FR-018); the schema mirrors the contract, the options the product rule |
| 対象ロール `role` (edit)           | not accepted by `PATCH` (immutable)                                   | selector disabled, never sent                                                                                                | FR-012 / Clarification Q3                                                                                         |
| 権限 `permissions`                 | map of catalog `permissionKey` → boolean; unknown key → `E-VAL-001`   | every key originates from the catalog response, so no unknown key can be produced; omitted keys default to false server-side | Since 2026-09-17 the FE holds no key list at all (FR-009a as amended)                                             |
| 検索 `search` (list)               | `maxLength: 100`                                                      | input `maxLength={100}`; the committed URL value and the request are both capped at 100                                      | Added 2026-09-17                                                                                                  |
| `page` (list)                      | `minimum: 1`                                                          | clamped to ≥ 1 before the request (a hand-edited `?page=0` must not reach the API)                                           | Added 2026-09-17                                                                                                  |
| `limit` (list)                     | `1 ≤ limit ≤ 100` (default 20)                                        | only 25 / 50 / 100 selectable; an out-of-range URL value falls back to 50                                                    | FR-005 as corrected                                                                                               |
| `permission` (list filter)         | any string, validated against the catalog → `E-VAL-001`               | not pre-validated client-side (the FE holds no key list); the picker can only emit catalog keys                              | A hand-edited unknown key surfaces the server error — accepted, see Clarifications 2026-09-17                     |

Server-side rules the FE surfaces but cannot pre-check: `(role, name)` uniqueness → `409 E-STF-010`
(inline error on 職位名, FR-010), assignment guard on delete → `409 E-STF-011`, system-managed guard →
`422 E-STF-012`, position not found → `404 E-STF-009`.

**Contract doc gap (raise with the API team)**: the OpenAPI `PATCH /api/v1/admin/positions/{id}`
response list documents 404 and 422 but **not** `400` (schema violation) or `409` (duplicate name on
rename), although FR-010 and the v0.3 design text both require the rename uniqueness re-check. The FE
handles `E-STF-010` on update regardless; the documentation should catch up.

### Key Entities

- **Position (職位マスター)**: A named permission bundle within one role. Attributes: id, name (unique per role, ≤100 chars), role (immutable after creation; edit form renders it disabled — per Clarifications), description (optional free text, ≤500 chars — official BE field as of API v0.3), permission map (flat boolean flags keyed by permission key), system-managed flag (seed-only; system-managed positions cannot be edited/deleted), assigned-staff count (derived from active staff), created/updated timestamps and actors.
- **Role (ロール)**: One of 6 fixed values with display names (本部, マネージャー, スタッフ, トレーナー, 閲覧のみ; System hidden from selection). Read-only reference data with a per-role position count.
- **Permission Catalog**: Server-served reference data (real API: `GET /api/v1/admin/permissions`) — the dictionary of fine-grained permissions grouped into 10 UI categories in fixed order. **As of the 2026-09-17 contract each entry carries `permissionKey`, `label`, `description` (nullable helper text, non-null on 13 keys) and `type` (`view` / `edit` / `destructive`)**, plus `totalCategoryCount` / `totalPermissionCount` on the response. ~~Phase 1 serves the prototype's 36 permissions …; each permission's optional helper description and its view/edit `kind` are UI-only metadata held feature-local and joined by key.~~ The catalog is now the **sole** source — 58 flags across the 10 categories, with no feature-local metadata joined in (FR-009a as amended).
- **Assigned Staff (reference)**: Staff records holding a position — consumed read-only here for counts, the preview's top-3 display (initial avatar, name, 無効 badge, store, active status), and navigation to staff screens.
- **Staff Change History (seed only)**: Audit records (changed-at, changed-by, action, post-change snapshot) seeded into the mock database only; never written by this screen (FR-019).

### API Design Reference (backend contract to mirror in the mock API)

Per the user directive, the in-project mock API MUST follow the Staff & Permission Management API design (fitness-dx CRM API docs, **v0.3** — downloaded 2026-07-29):

| Endpoint                                        | Purpose                      | Key rules from the design                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/admin/positions`                   | List positions (FR-001)      | Filters: `role`, `search` (partial name match), `permission` (a catalog `permissionKey`; unknown key → 400) — all three official in v0.3; paging `page`/`limit`; `sort` = role (enum order, default) / name / createdAt + `order`. Items carry `positionId, name, description, role, isSystemManaged, staffCount, grantedCategoryCount, totalCategoryCount, createdAt, updatedAt`. Mock aligned to the BE names (2026-07-29): `permission`, `includeTotalAll` → `pagination.totalAllItems`, `grantedCategoryCount`/`totalCategoryCount`; remaining deltas are `position_name` vs `name` and integer `id` vs UUID (research R1). |
| `POST /api/v1/admin/positions`                  | Create (FR-009)              | Body `{name, role, description?, permissions?}`; name ≤100; `description` ≤500, nullable; `(role, name)` unique → 409; unknown permission keys → 400; omitted keys default false; `is_system_managed` not settable.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `GET /api/v1/admin/positions/{id}`              | Detail for edit form         | Returns `description` + the flat boolean permission map. **2026-09-17**: alongside the 58 camelCase flags it now also returns `permissions` keyed by catalog `permissionKey` (the shape POST/PATCH use), plus `staffCount`, `positionId`, `createdBy`, `updatedBy` — so the edit prefill and the preview pane's 割当スタッフ count both come straight from this response. 404 when unknown.                                                                                                                                                                                                                                     |
| `PATCH /api/v1/admin/positions/{id}`            | Update (FR-012)              | Partial; `role` not accepted (immutable); `description` omitted = unchanged, explicit `null` = clear; system-managed → 422; rename re-checks uniqueness → 409; only provided permission keys updated; changes effective on staff's next request.                                                                                                                                                                                                                                                                                                                                                                                |
| `DELETE /api/v1/admin/positions/{id}`           | Delete (FR-014)              | Physical delete; assigned staffCount ≥ 1 → 409 (in use); system-managed → 422; unknown → 404; success → 204.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `GET /api/v1/admin/positions/{id}/permissions`  | Permission preview (FR-007)  | Grouped into 10 fixed-order categories of `{permissionKey, label, description, type, granted}` (`description` / `type` added 2026-09-17). `csv_export` is official in v0.3 (FR-S001), so the former category-enum divergence is closed.                                                                                                                                                                                                                                                                                                                                                                                         |
| `GET /api/v1/admin/permissions`                 | Permission catalog (FR-009a) | **NEW in v0.3**, extended 2026-09-17 — the full catalog with no `positionId`: `{totalCategoryCount, totalPermissionCount, categories[{categoryKey, categoryLabel, permissions[{permissionKey, label, description, type}]}]}`. `description` = nullable helper text (non-null on 13 keys); `type` = `view` / `edit` / `destructive`. **Sole** SoT for the create-form toggles, their helper text, the preview's category access level and the 重要操作 warning; MAY be cached 300 s.                                                                                                                                             |
| `GET /api/v1/admin/roles`                       | Role reference (FR-018)      | Fixed 6 roles in enum order with `displayName` and `positionCount`. Not implemented in Phase 1 (research R6).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `GET /api/v1/admin/staff?positionId=...`        | Assigned staff (FR-008)      | Existing staff list filter used for the preview's assigned-staff panel and the pre-filtered staff-list navigation (mock: `position_id` + `sort_by=status` for active-first ordering).                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/v1/admin/staff/{id}/change-histories` | History (FR-019)             | Seed-only in Phase 1: mock table + seed data provided; no history rows written by position operations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Authorization in the design: read = `can_view_staff`, write = `can_manage_position` (HQ-only by seed) — consistent with FR-017.

### Traceability Matrix (UI → Source Requirement)

| UI Element / Behavior (file:line)                                                                                                                       | Source Requirement (Y-01)                                        | Inclusion                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Page header 職位マスター管理 + count badge + role-gated 職位を追加 (position-list.tsx:730-744)                                                          | FR-006 職位の新規追加                                            | In Scope                                                    |
| Position table: name+description, role badge, permission count, staff count (position-list.tsx:810-932)                                                 | FR-006 職位マスターの管理                                        | In Scope                                                    |
| Name search box (position-list.tsx:768-776)                                                                                                             | FR-006 (UI addition — list usability)                            | In Scope                                                    |
| Reverse permission filter popover (position-list.tsx:777-808)                                                                                           | FR-009 (reverse lookup of 権限→職位; UI addition)                | In Scope                                                    |
| Result banner + 条件をクリア (position-list.tsx:748-760)                                                                                                | UI addition (established list pattern)                           | In Scope                                                    |
| Pagination + page size selector (position-list.tsx:936-991)                                                                                             | UI addition (established list pattern)                           | In Scope                                                    |
| Empty states filtered/empty (position-list.tsx:822-836)                                                                                                 | UI addition (established list pattern)                           | In Scope                                                    |
| Row selection + right-pane permission preview: category levels, fine permissions, 重要操作 warning icon (position-list.tsx:838-841, 1003-1086 @426a9b3) | FR-009 職位別権限プレビュー                                      | In Scope (権限フラグ section removed per 2026-07-29 answer) |
| CSV category preview shows 出力可/出力不可 (position-list.tsx:1043)                                                                                     | FR-S001 CSV出力権限の独立カテゴリー管理                          | In Scope                                                    |
| 割当スタッフ panel + links to staff-detail / filtered staff-list (position-list.tsx:1091-1137)                                                          | FR-007 スタッフへの職位割り当て (read-only view of assignments)  | In Scope (display/navigation only)                          |
| Row menu 編集 / 複製, role-gated (position-list.tsx:876-888)                                                                                            | FR-006 職位の編集 (複製 = UI addition)                           | In Scope                                                    |
| Delete disabled "削除（割当あり）" when staffCount>0; confirm dialog otherwise (position-list.tsx:889-927)                                              | FR-006 職位の削除 + guard                                        | In Scope                                                    |
| Form 基本情報: 職位名 required / 対象ロール required 5 options / 説明 optional (position-form.tsx:402-459)                                              | FR-006 職位名・対象ロール設定 (説明 = official BE field, v0.3)   | In Scope (Q1 answered 2026-07-29)                           |
| Form 権限設定: category accordions, per-permission switches, bulk 全ON/OFF, count badges (position-form.tsx:461-480, 234-318)                           | FR-006 権限フラグのON/OFF設定                                    | In Scope (catalog served by GET /permissions — FR-009a)     |
| Y-5..Y-8 store-item Staff edit permissions in Y category (position-form.tsx:138-143)                                                                    | FR-006 v2 — Y-02 Staff編集可能項目の定義                         | In Scope                                                    |
| CSV role defaults + re-seed on role change in create (position-form.tsx:173-198, 425-434)                                                               | FR-S001 デフォルト: HQ・Manager可 / Staff・Observer・Trainer不可 | In Scope                                                    |
| Validation: inline errors, summary, scroll-to-invalid (position-form.tsx:344-360, 484-486)                                                              | FR-006 (UI addition — standard form validation)                  | In Scope                                                    |
| Unsaved-changes discard dialog (position-form.tsx:342, 499-512)                                                                                         | UI addition (established form pattern)                           | In Scope                                                    |
| Clone mode 職位 複製して作成 (position-form.tsx:321-331)                                                                                                | UI addition over FR-006                                          | In Scope                                                    |
| Success toasts + return to list (position-form.tsx:365-366)                                                                                             | FR-006                                                           | In Scope                                                    |
| Staff list/detail screens, staff CRUD, invite/re-invite, magic link (Y-01 FR-001〜FR-005, FR-007, FR-008)                                               | Y-01 other slices                                                | Out of Scope (separate staff-management feature)            |
| Change-history recording on position operations (Y-01 FR-010)                                                                                           | FR-010                                                           | Out of Scope for writes — seed only (user directive)        |

### Out of Scope for Phase 1

- **Staff account management** (Y-01 FR-001 staff list/search, FR-002 creation/bulk invite/magic link, FR-003 detail/edit, FR-004 deactivate/delete, FR-005 role assignment, FR-007 position assignment UI, FR-008 store/FC-company linking): none of these screens are part of the provided position UI; the position screen only _reads_ staff data for counts/preview and _navigates_ to the staff screens.
- **Change-history writing** (Y-01 FR-010): per the user directive, Phase 1 only seeds history data in the mock database; position create/edit/clone/delete do not produce history records. No history UI exists on the position screens.
- **System-managed position UX**: the backend design defines `is_system_managed` (read-only, non-deletable seed positions) with 422 guards, but the prototype has no visual treatment for it. Phase 1 mirrors the API guard in the mock API only; no seed position is flagged system-managed and no dedicated UI state is built (documented in Assumptions).
- **Role master editing**: roles are fixed by design (FR-018); no create/edit/delete of roles anywhere.
- **CSV-export permission enforcement in other features** (the actual gating of 会員CSV / 入退館CSV / アンケートCSV buttons across A/B/G screens): this spec covers only defining the permission values on the position; enforcement points live in their respective features.
- **Y-01 open questions Q-V01〜Q-V04** from the source document (initial master fit, which positions get 請求確定後変更/代理申請, FC-company initial account flow): PO-level, unresolved in source; not blocking the position screen.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An HQ user can locate any position by name or by a held permission and open its full permission preview in under 15 seconds on a standard-size master (≈ tens of positions), without leaving the list screen.
- **SC-002**: An HQ user can define a brand-new position — name, role, description, and a complete permission set — and see it live in the list in a single uninterrupted session, with zero developer involvement.
- **SC-003**: 100% of create attempts with the CSV defaults untouched match the FR-S001 default matrix (本部/マネージャー = exportable, スタッフ/トレーナー/閲覧のみ = not exportable).
- **SC-004**: 100% of delete attempts on positions with assigned staff are blocked (disabled affordance in the UI and rejection at the API), and 0 staff accounts are ever left referencing a deleted position.
- **SC-005**: Position write actions (add/edit/clone/delete) are never usable by roles other than Headquarter/System, matching the Y-01 permission matrix 100% of the time.
- **SC-006**: A permission change saved on a position is reflected in what its assigned staff can do from their next request/login, with no additional propagation step.

## Assumptions

- **Slice scoping**: The Y-01 document covers the whole Staff & Permission domain; this feature implements only the position-master screens delivered in the prototype (`position-list.tsx`, `position-form.tsx`) — source FR-006 and FR-S001 in full, FR-009 as realized by the list's preview pane, and read-only touchpoints of FR-007 (assignment display). The staff screens are a separate feature (see Out of Scope).
- **Clone is a client-side prefill**: The backend design has no duplicate endpoint; 複製 opens the create flow pre-filled and saves via the normal create operation. The prototype's clone mode does not pre-fill the name field (it starts blank in clone mode per the code), so the user always names the copy explicitly.
- **List-row permission count**: The "アクセス権限数 N / 10" column is server-computed. The BE v0.3 list item carries `grantedCategoryCount` / `totalCategoryCount` with exactly the semantics Phase 1 assumed (categories holding ≥1 granted flag, over the category total) — the mock keeps its own field names `enabled_category_count` / `total_category_count` (naming delta only). Q4's assumption is therefore confirmed by the BE.
- **Preview access levels are derived**: The right pane's three-level indicator (閲覧・編集 / 閲覧のみ / アクセス不可) is derived from the flat boolean permission map (view-type key granted → at least 閲覧のみ; any edit/operation key granted → 閲覧・編集; none → アクセス不可), matching the prototype's derivation logic (`isFinePermissionEnabled`, position-list.tsx:632-646). The mock preview endpoint returns per-permission `granted` values; the UI computes the level.
- **権限フラグ section (removed 2026-07-29)**: The prototype's five special flags were the UI surface of specific fine permissions rather than a separate data structure. The API team confirmed 権限フラグ and アクセス権限 are the same axis and are merged into one (no separate API field), and prototype 7/23 deleted the section. Its replacement is FR-007a's warning icon over the three destructive permissions (強制退会の実行 / 請求確定後の変更 / 返金処理の実行).
- **Mock data**: Phase 1 seeds the 13 initial positions from the Y-01 初期定義 table (as reflected in the prototype mock) plus staff records with position assignments (so staffCount/assigned-staff preview are real) and staff change-history seed rows (FR-019). No system-managed position is seeded.
- **Screen access**: Route-level gating follows the established per-screen convention: the position screens are reachable by Headquarter/System (write) — read visibility aligned with the staff-view permission per the API design; Manager and below do not manage positions (matrix row 職位マスター管理: ×).
- **Rate limits / NFRs** in the API design (60 read/min, 20 write/min, p95 ≤ 2s) are backend concerns; the mock API does not simulate rate limiting.
- **Language**: All UI copy is Japanese exactly as in the prototype; this spec quotes it verbatim where it is contractual.

---

## Q&A / Clarification Needed

> The `/speckit.clarify` session of 2026-07-16 resolved Q1–Q4 locally; the API team answered the corresponding QAs on **2026-07-29** and API design v0.3 now covers them. No open [NEED CLARIFICATION] markers remain. **Two items stay open and both need a PO call: Q5** (the `can_edit_gate_stop` gap, now user-visible — the toggle was removed on 2026-09-17) **and Q6** (whether the BE's `destructive` classification supersedes FR-007a's three-key set).

### Q1: Position 説明 (description) field — CLOSED BY BE (2026-07-29)

Answer (Otaki): `positions.description` was **added** to the BE contract — create / update / detail / list item, nullable, ≤ 500 chars, PATCH-clearable with explicit `null`. The 2026-07-16 mock-side extension is no longer an extension; the mock's limit was tightened from 1000 to 500 to match.

### Q2: Authoritative permission catalog — CLOSED BY BE, UI SCOPE UNCHANGED (2026-07-29)

Answer (Otaki): the API-side omission (追従漏れ) is **fixed** — the catalog is now **58 flags / 10 categories**, with `csv_export` as an official independent category (FR-S001) and the Y-02 store-item flags present. A standalone catalog endpoint `GET /api/v1/admin/permissions` was added as the SoT for the create-form toggles, so the FE no longer hardcodes keys (FR-009a).

Decision for this feature: ~~the **rendered UI stays at the prototype's 36 toggles**; the mock adopts the BE `categoryKey` `csv_export` and serves the catalog endpoint. The 23 BE flags no prototype screen exposes join at the Phase 2 cutover.~~ **Superseded 2026-09-17** — the screen renders the catalog verbatim (58 flags / 10 categories), so the Phase 2 cutover has effectively happened. See Clarifications Session 2026-09-17.

### Q3: Role editability in edit mode — RESOLVED (Session 2026-07-16)

Resolved: the 対象ロール selector is disabled in edit mode (role immutable after creation, per the BE contract and the Y-01 three-layer/FR-007 invariant); create and clone modes keep it selectable. Deliberate, documented deviation from the V0 prototype (which left it enabled). See Clarifications.

### Q4: List-row count derivation — CONFIRMED BY BE (2026-07-29)

The BE list item now carries `grantedCategoryCount` / `totalCategoryCount` with exactly the semantics Phase 1 assumed (categories holding ≥1 granted flag, over the category total — the API doc calls it "interpretation A, category axis"). The column is renamed 権限フラグ数 → **アクセス権限数** per Kyota's answer that 権限フラグ and アクセス権限 are one axis.

**FE confirm-back requested by Otaki, and hereby confirmed**: the "8/10" cell is the **category axis** — numerator = catalog categories holding ≥1 granted flag, denominator = **10 = the category count**. It is _not_ a flag count, and specifically not "out of 58". Verified against the running mock: 本部管理者 renders **10/10** on the category axis while its flag axis would be 36/36 (58/58 once the BE's full catalog is live) — the two axes are numerically different, so the distinction is observable, not cosmetic.

### Q5: `can_edit_gate_stop` (ゲートストップ設定の変更) — STILL OPEN (BE ask sharpened 2026-09-08)

API design v0.3 added three of the four Y-02 Staff-editable store-item flags (`can_edit_store_photo`, `can_edit_store_business_hours`, `can_edit_store_basic_info`) but **no flag for ゲートストップ設定の変更**, which Y-01 FR-006 v2 lists as Staff-editable and the prototype renders as its own toggle in システム設定. The real catalog (`GET /api/v1/admin/permissions`) confirms the gap: 58 keys, none of them `can_edit_gate_stop`.

**Evidence gathered 2026-09-08 against the backend (`fitness-backend-v2`)** — the two candidate answers are _not_ interchangeable:

- The `positions` table has no gate-stop column (`services/auth-svc/prisma/migrations/008_staff_permission_management/migration.sql`).
- ゲートストップ in the backend is a **member-level operation**, `PATCH` / `DELETE /api/v1/admin/members/{memberId}/gate-stop`, authorized by **role + managed-store scope only** — observer/trainer → `E-AUTH-100`, an `all_stores`-scoped stop without full access → `E-GAT-100` (`services/auth-svc/src/services/member-admin.service.ts`). No position flag gates it.
- `can_edit_gate_setting` guards a **different** capability: the HQ 入退館 setting surface (visit-badge thresholds, `E-VIS-102` on PUT) — matching the prototype's treatment of the two as distinct permissions.
- The CRM already maps its own member gate-stop action onto the other flag (`Permission.MembersGateStop` → `['canEditGateSetting']`, `src/constants/permission.constants.ts`), which is why the ask must be explicit rather than resolved by aliasing.

**Decision (2026-09-08)**: re-raise to the API team as a **request for a dedicated `positions.can_edit_gate_stop` column** gating the member gate-stop operation. The "confirm it is covered by `can_edit_gate_setting`" alternative is **declined** — per the evidence above they are separate capabilities. ~~Until the column exists, the toggle stays rendered but disabled with an 「API未対応」 note and is never sent (Round 1); `integration-plan.md` **B1** / **R201** track the wiring.~~

**Status change 2026-09-17 — the gap is now user-visible.** Under the directive to render only what the API returns, the disabled placeholder row was **removed from the create/edit form**. Until the BE adds the column, ゲートストップ設定の変更 **cannot be configured per position at all**, so Y-01 FR-006 v2 is not covered on this screen. Nothing in the FE needs to change when the column ships — the toggle will reappear through the catalog. **PO decision needed**: accept the temporary loss of coverage, or restore an FE-side placeholder row until the BE lands. `integration-plan.md` **B1** / **R201** keep the history.

### Q6: 重要操作 classification — FE now follows the API, PO ratification needed (opened 2026-09-17)

The catalog's new `type` field classifies every permission as `view` / `edit` / `destructive`. Its own schema description says: _"Classification proposed by BE 2026-09-09, **Otaki ruling pending**."_

This collides with **FR-007a**, which fixed the 重要操作 warning set at exactly three keys (強制退会の実行 / 請求確定後の変更 / 返金処理の実行) and — per Clarifications 2026-09-08 — deliberately **excluded** 会員の匿名化 (`can_anonymize_member`) on the grounds that widening the set dilutes the warning.

**Implemented 2026-09-17 (per the user's "follow the API" directive)**: the preview pane derives the warning from `type === 'destructive'`. The FE's three-key list is deleted. Expect the ⚠ icon on **more** categories than the prototype showed.

**Open for the PO**:

1. Ratify the BE classification as the 重要操作 definition (then FR-007a's three-key sentence should be rewritten, not merely struck through), **or**
2. Keep FR-007a's narrow set as a product decision — in which case the FE needs an explicit allow-list again and the BE should expose the narrow set separately.

Until answered, the rendered behaviour is (1). Code note: `_constants/position-permissions.constant.ts` → `isDestructivePermission`.
