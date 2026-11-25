# Tasks: Y-01 Position Master Management (職位マスター管理)

**Input**: Design documents from `/specs/017-position-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (7), quickstart.md, checklists/parity.md (75 items)

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

**V0 sources** (ground truth for UI tasks): `.cache/fitness-crm-ui/src/pages/position-list.tsx` (@426a9b3, 2026-07-23), `.cache/fitness-crm-ui/src/pages/position-form.tsx` (@426a9b3)

**No test tasks**: project constitution forbids automated tests — QA is `tsc --noEmit`, ESLint, and the quickstart manual-verification walk.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- UI tasks cite their V0 source range and the `PAR###` parity items they satisfy

---

## Phase 1: Setup

**Purpose**: Access-control groundwork for the new routes (no project init needed — existing app)

- [x] T001 Register page permissions for `/positions`, `/positions/create`, `/positions/[id]/edit` in the route-gating config (follow the routines-feature registration precedent; locate via `grep -r "PAGE_PERMISSIONS\|ROLE_PERMISSIONS" src/`), reusing existing `Permission.PositionsView/PositionsCreate/PositionsEdit/PositionsDelete` from src/types/permission.type.ts and granting all four to Headquarter (System receives all globally) — research R11, spec FR-017/FR-018

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Mock API contract + data + generated client — every user story consumes these

**⚠️ CRITICAL**: No user story work can begin until this phase is complete (T010 regenerates the client all UI imports)

- [x] T002 Extend src/app/api/_schemas/position.schema.ts: closed 36-key `PermissionMapSchema` with BE `can_\*`naming (exact key list in data-model.md §1 — 29 BE keys + 7 FE-extension keys),`PositionSchema` (+`description`, `permissions`, `is_system_managed`, `created_at`/`updated_at`; drop `features`), `GetPositionsQuerySchema`(search/permissionKey/role/page/limit/sort/order),`PositionListItemSchema` (+`staff_count`, `enabled_category_count`, `total_category_count`), `GetPositionsResponseSchema` (`items`/`pagination`/`totalAll`), `CreatePositionBodySchema`, `UpdatePositionBodySchema`(NO`role`field — Clarification Q3),`PositionPermissionsPreviewResponseSchema`, plus mock-internal category-grouping metadata (10 categories, data-model.md §1) — nothing outside src/app/api/ may import this file (research R3)
- [x] T003 [P] Rewrite src/app/api/\_mock-db/seeds/position.seed.ts: 13 Y-01 positions (ids 1–13) with `description` + full 36-key permission maps reproducing the V0 levels/flags (data-model.md §6); align src/app/api/\_mock-db/seeds/user.seed.ts (or the staff seed source feeding `staff.table.ts`) so ≥1 position has 0 staff, ≥1 position has ≥3 staff including one 無効, and store names resolve for the preview panel
- [x] T004 [P] Add seed-only staff change history (FR-019, research R9): src/app/api/\_mock-db/types/staff-change-histories.type.ts, src/app/api/\_mock-db/tables/staff-change-history.table.ts (`_seed()` + `getListByStaffId()` read accessor ONLY — no create/update/delete), src/app/api/\_mock-db/seeds/staff-change-history.seed.ts (≥5 rows, data-model.md §4) — no route handler, never written by position operations
- [x] T005 Extend src/app/api/\_mock-db/types/positions.type.ts + add src/app/api/\_mock-db/tables/position.table.ts: `list(query)` (search/permissionKey/role filters, sort role-enum-order|name|createdAt, paging, derived `staff_count` join vs staffs + category counts), `getById`, `create` ((role,name) uniqueness), `update` (no role; name uniqueness re-check), `delete` (guard order 404 → 422 is_system_managed → 409 staff_count≥1) — depends on T002, T003
- [x] T006 Wire the position table (new methods) and staff-change-history table into src/app/api/\_mock-db/\_create-db.ts — depends on T004, T005
- [x] T007 Upgrade src/app/api/crm/positions/route.ts to contracts/get-positions.md (GET: paginated `{items, pagination, totalAll}`) + contracts/create-position.md (POST: 201/400/409), re-`registerRoute` both; migrate the staffs-feature consumers of the old `{positions}` response shape (`grep -rn "getCrmPositions\|positions:" src/app/(private)/staffs src/hooks` and update to `items`) — research R2; depends on T005, T006
- [x] T008 [P] Add src/app/api/crm/positions/[id]/route.ts: GET detail (contracts/get-position-detail.md, full 36-key map), PATCH (contracts/update-position.md — 400 on `role`/`is_system_managed` presence, 404/409/422 rules), DELETE (contracts/delete-position.md — 204, guard order) — depends on T005, T006
- [x] T009 [P] Add src/app/api/crm/positions/[id]/permissions/route.ts per contracts/get-position-permissions.md: all 10 categories in fixed order with `{permissionKey, label, granted}` composed route-side from the mock metadata — depends on T005, T006
- [x] T010 Run `npm run generate-openapi` then `npm run generate-api`; verify src/lib/api/types.gen.ts exposes the 36-key permission map and the new query options/mutations in src/lib/api/@tanstack/react-query.gen.ts; `npm run type-check` passes (staffs migration from T007 compiles) — depends on T007, T008, T009
- [x] T011 Add feature-local constants: src/app/(private)/positions/\_constants/position-permissions.constant.ts (display catalog — 10 categories / 36 entries with label, description, `kind: 'view' | 'edit'` per data-model.md §1; flag→key mapping 請求確定後変更可→can_edit_after_billing_confirmed, 代理申請権限あり→can_create_proxy_application, アンケート作成権限あり→can_create_survey, 強制退会操作→can_force_withdrawal, 返金処理→can_execute_refund; CSV role defaults HQ/Manager=true others=false) typed `satisfies` against the generated permission-map type, and src/app/(private)/positions/\_constants/position.constants.ts (5 role options with labels 本部/マネージャー (Manager)/スタッフ (Staff)/トレーナー (Trainer)/閲覧のみ (Observer), page sizes 25/50/100/200 default 50) — depends on T010; research R3 revised (no imports from src/app/api/)

**Checkpoint**: Mock API live (verifiable via curl per contracts), generated client fresh — user stories can begin

---

## Phase 3: User Story 1 - Browse positions and preview their permissions (Priority: P1) 🎯 MVP

**Goal**: Two-pane list screen — searchable/filterable paginated position table + read-only permission preview pane with assigned staff

**Independent Test**: Open `/positions` → 13 rows; search + permission filter narrow the list with banner; select a row (or deep-link `?positionId=`) → preview shows category levels, fine permissions, the 重要操作 warning icon, assigned staff with working links (quickstart step 1)

### Implementation for User Story 1

- [x] T012 [US1] Add src/app/(private)/positions/\_hooks/use-position-filters.hook.ts — nuqs URL state: `search`, `permissionKey`, `page`, `limit`, `positionId` (selection/deep-link), page-reset on condition change (follow use-routine-filters.hook.ts shape) — depends on T011
- [x] T013 [US1] Replace stub src/app/(private)/positions/page.tsx with RSC shell + `"use client"` content component: PageHeader title 職位マスター管理 + count badge `{N}件` + RoleGatedButton 職位を追加 (Plus icon → `/positions/create`) — port from .cache/fitness-crm-ui/src/pages/position-list.tsx › PositionList header (L726-L744); satisfies PAR001-PAR003
- [x] T014 [P] [US1] Add src/app/(private)/positions/\_components/position-table-columns.tsx — columns 職位名 (name + description sub-line) / 対象ロール (outline badge) / 権限フラグ数 (`enabled_category_count / total_category_count` tabular; header renamed アクセス権限数 in T037) / 割当スタッフ (`{N}名` link button selecting the row, or `—`) / actions — port from .cache/fitness-crm-ui/src/pages/position-list.tsx › Table (L810-L869); satisfies PAR015-PAR019
- [x] T015 [P] [US1] Add src/app/(private)/positions/\_components/position-permission-filter.tsx — 権限で絞り込む Popover + Command grouped by the 10 catalog categories, single-select with check mark, empty text 該当する権限がありません, active (filled) trigger state; filter param feeds the list query's `permissionKey` (grant semantics enforced server-side) — port from .cache/fitness-crm-ui/src/pages/position-list.tsx › perm filter popover + grant semantics (L777-L808, L620-L646); satisfies PAR009-PAR014
- [x] T016 [P] [US1] Add src/app/(private)/positions/\_components/position-row-actions.tsx — ⋯ DropdownMenu with role-gated 編集 (Pencil → `/positions/{id}/edit`) and 複製 (Copy → `/positions/create?cloneFrom={id}`), separator before the delete slot (delete item itself lands in T027) — port from .cache/fitness-crm-ui/src/pages/position-list.tsx › row menu (L870-L912); satisfies PAR023-PAR026
- [x] T017 [US1] Compose the list pane in src/app/(private)/positions/page.tsx content: search input 職位名で検索... with icon, filter-result banner 「全 {totalAll} 件中 {totalItems} 件を抽出中」 + condition summary + 条件をクリア, `getCrmPositionsOptions` query wiring, row click toggle-selection with bg-primary/10 highlight + `?positionId=` deep-link preselect, propagation-safe actions cell, Empty filtered/empty variants, pagination footer 「全 N 件 / P ページ / X-Y を表示」 with ellipsis >7 pages + 表示件数 select + page clamp — port from .cache/fitness-crm-ui/src/pages/position-list.tsx › banner/toolbar/table body/pagination (L746-L776, L810-L841, L858-L870, L913-L992 minus dialog, L686-L722); satisfies PAR004-PAR008, PAR020-PAR022, PAR031-PAR037 — depends on T012, T013, T014, T015, T016
- [x] T018 [US1] Add src/app/(private)/positions/\_components/permission-preview-panel.tsx — sticky 400px right pane: placeholder card (Eye icon, 職位を選択してください + helper), selected state header (name + role badge + description + 権限を編集 button → edit page), カテゴリ別アクセス権限 accordion over `getCrmPositionsByIdPermissionsOptions` with client-derived levels (view/edit `kind` from T011 catalog → 閲覧・編集/閲覧のみ/アクセス不可; csv → 出力可/出力不可), granted-count badges, fine-permission rows, separators — port from .cache/fitness-crm-ui/src/pages/position-list.tsx › right pane (L994-L1090) + level derivation (L650-L675); satisfies PAR038-PAR048 — depends on T012, T011
- [x] T019 [US1] Add the 割当スタッフ section inside permission-preview-panel.tsx — header + `{N}名` count, 割当なし zero state, top-2 staff sorted active-first via `GET /crm/staffs?position_id={id}` (existing generated query), each row name + store linking to `/staffs/{id}`, overflow link 「他 {N} 名を見る →」 else 「スタッフ一覧で見る →」 to `/staffs` pre-filtered by position — port from .cache/fitness-crm-ui/src/pages/position-list.tsx › assigned staff (L1091-L1137); satisfies PAR049-PAR052 — depends on T018

**Checkpoint**: US1 fully functional — list, search, permission filter, pagination, preview, staff links (MVP)

---

## Phase 4: User Story 2 - Create a new position with its permission set (Priority: P1)

**Goal**: 職位 新規作成 form — name/role/description + 36 toggles in 10 accordions (sourced from the catalog endpoint since T035) with CSV role defaults (FR-S001), validation, unsaved-changes guard

**Independent Test**: 職位を追加 → select 本部 → CSV toggles ON, switch スタッフ → OFF; blank submit blocked with inline errors + summary + scroll; valid save → toast 職位を登録しました, new row in list; duplicate (role,name) → duplicate error (quickstart steps 2–3)

### Implementation for User Story 2

- [x] T020 [P] [US2] Add src/app/(private)/positions/\_schemas/position-form.schema.ts — Zod: `position_name` required trimmed ≤100 (message 職位名を入力してください), `role` required enum (message 対象ロールを選択してください), `description` optional, `permissions` full 36-key boolean map (default all false)
- [x] T021 [US2] Add src/app/(private)/positions/\_components/position-form/position-form.tsx + position-form-basic-info-section.tsx — RHF+zodResolver, mode prop `create|edit|clone`, page titles 職位 新規作成/編集/複製して作成, BackLink 職位マスター管理に戻る through the discard guard, 基本情報 card: 職位名 required input placeholder 例: 正社員（フロント）, 対象ロール required select (5 options from T011 constants, helper description text, placeholder 選択してください, max-w-280), 説明 optional textarea placeholder 職位の説明を入力（任意） — port from .cache/fitness-crm-ui/src/pages/position-form.tsx › FormField/basic info (L200-L232, L320-L459); satisfies PAR053-PAR060 — depends on T020, T011
- [x] T022 [US2] Add src/app/(private)/positions/\_components/position-form/position-form-permissions-section.tsx — 権限設定 card: 10 category accordions all open by default, per-category `{on} / {total}` badge + 全ON/全OFF bulk switch (stopPropagation, sets whole category), permission rows label + helper description + Switch, dirty tracking on every toggle; CSV role-default seeding (headquarter/manager→ON, others→OFF) applied on role change ONLY when the form was not prefilled (create-from-scratch; FR-011, research R8) — port from .cache/fitness-crm-ui/src/pages/position-form.tsx › PermissionRow/CategoryAccordionItem/CSV defaults (L173-L198, L234-L318, L421-L434, L461-L480); satisfies PAR062-PAR070 — depends on T021
- [x] T023 [US2] Wire form footer + guards in position-form.tsx — footer キャンセル (outline, discard guard) + submit 登録する/変更を保存する (size lg), invalid-submit summary 未入力の項目があります + scroll-to-first-invalid (reuse src/hooks/use-scroll-to-first-error.ts), unsaved-changes AlertDialog 変更を破棄しますか？ (編集を続ける/破棄する, only when dirty), success toasts 職位を登録しました/職位の変更を保存しました then navigate to `/positions` — port from .cache/fitness-crm-ui/src/pages/position-form.tsx › submit/footer/discard dialog (L342-L367, L483-L512); satisfies PAR071-PAR074 — depends on T022
- [x] T024 [US2] Add src/app/(private)/positions/create/page.tsx — mount the form in create mode, `postCrmPositionsMutation` on submit, surface 409 as a user-facing duplicate-name error on the 職位名 field (FR-010), invalidate positions list on success — depends on T023

**Checkpoint**: US1 + US2 — positions can be found, previewed, and created with FR-S001 CSV defaults

---

## Phase 5: User Story 3 - Edit an existing position's permissions (Priority: P2)

**Goal**: 職位 編集 with full prefill, role selector disabled (immutable — Clarification Q3), PATCH save with duplicate-rename guard

**Independent Test**: Row ⋯ → 編集 (or preview 権限を編集) → prefilled fields, role disabled; flip a toggle → save → toast 職位の変更を保存しました; preview reflects the change; rename to an existing same-role name → duplicate error (quickstart step 4)

### Implementation for User Story 3

- [x] T025 [US3] Add src/app/(private)/positions/[id]/edit/page.tsx — fetch `getCrmPositionsByIdOptions(id)`, mount the form in edit mode with values prefilled (name/role/description/36-key map), render the 対象ロール select `disabled` showing the current role (clarified deliberate V0 deviation — no CSV re-seed possible), submit via `patchCrmPositionsByIdMutation` (body has NO role field), 409 rename → duplicate error, 404 → not-found state, success invalidates list + detail + permissions-preview queries — port prefill behavior from .cache/fitness-crm-ui/src/pages/position-form.tsx › edit prefill (L156-L171, L333-L337, L454); satisfies PAR061 and the PAR059 edit-mode note — depends on T023

**Checkpoint**: US1–US3 — full read/create/edit lifecycle with role immutability enforced UI + contract side

---

## Phase 6: User Story 4 - Clone a position as a starting point (Priority: P3)

**Goal**: 複製 opens 職位 複製して作成 prefilled (role/description/permissions, blank name); save creates a NEW position via the normal create path

**Independent Test**: ⋯ → 複製 → clone title, toggles/description prefilled, name empty, no CSV re-seed on the prefilled state; save under a new name → new row appears, source untouched, staff count 0 (quickstart step 5)

### Implementation for User Story 4

- [x] T026 [US4] Extend src/app/(private)/positions/create/page.tsx with `?cloneFrom={id}` (nuqs): fetch the source detail, prefill role + description + permission map with name blank, switch title/mode to clone (職位 複製して作成), suppress CSV role-default seeding for the prefilled state (research R7/R8), invalid/missing cloneFrom → plain create form; verify row-action 複製 from T016 lands here — satisfies the clone variant of PAR054 (title map already built in T021) — depends on T024

**Checkpoint**: US1–US4 — variants can be authored without re-entering 36 toggles

---

## Phase 7: User Story 5 - Delete an unused position, guarded by assignment (Priority: P3)

**Goal**: Physical delete with confirmation, blocked (disabled item) while staff are assigned; server guard as defense-in-depth

**Independent Test**: Position with staff → ⋯ menu shows disabled 削除（割当あり）; zero-staff position → 削除 → dialog 職位を削除しますか？ → 削除する → row gone, count badge decreases, selection resets to placeholder if it was selected (quickstart step 6)

### Implementation for User Story 5

- [x] T027 [US5] Add src/app/(private)/positions/\_components/position-delete-dialog.tsx and complete the delete slot in position-row-actions.tsx — `staff_count > 0` → disabled muted item 削除（割当あり） (Trash2); else role-gated destructive 削除 opening AlertDialog (title 職位を削除しますか？, body 「{name}」を削除します。この操作は取り消せません。, キャンセル/削除する destructive), confirm → `deleteCrmPositionsByIdMutation` → invalidate list and clear `positionId` selection param when it matches the deleted id; surface 409/422/404 as error toasts — port from .cache/fitness-crm-ui/src/pages/position-list.tsx › delete menu branches + dialog (L889-L927); satisfies PAR027-PAR030 — depends on T016, T017

**Checkpoint**: All 5 user stories functional

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T028 Run `npm run type-check` and `npm run lint`; fix all findings (constitution QA gates)
- [x] T029 Execute the quickstart.md Manual Verification walk (8 steps incl. role-gating as Manager and FR-019 history-untouched check) and fix any deviations
- [x] T030 Walk specs/017-position-management/checklists/parity.md against the running screen and tick all 75 items (PAR059 per its clarified edit-disabled note) — /speckit.implement gates on this file being fully checked

---

## Phase 9: API QA answers 2026-07-29 + prototype 7/23 alignment

**Purpose**: Apply the API team's answers to the three open position QAs (API design v0.3) and the prototype 7/23 design update. Decisions: rendered catalog stays at the prototype's 36 toggles; `can_edit_gate_stop` stays an FE extension with the gap re-raised (spec Q5).

- [x] T031 Align the mock permission catalog to BE v0.3 in src/app/api/\_schemas/position.schema.ts: `categoryKey` `csv` → **`csv_export`** (both `PositionCategoryKeySchema` and `POSITION_PERMISSION_CATEGORY_DEFS`), tighten `description` to `POSITION_DESCRIPTION_MAX_LENGTH = 500` on create/update (BE v0.3 maxLength), and update the header comment to record that BE holds 58 flags / 10 categories while Phase 1 renders 36 and `can_edit_gate_stop` is the sole remaining FE extension — spec Clarifications 2026-07-29, research R3/R13
- [x] T032 Add the permission-catalog endpoint (research R14, contracts/get-permission-catalog.md): `GetPermissionCatalogResponseSchema` + `buildPermissionCatalog()` in position.schema.ts (composed from the same grouping metadata the preview uses), new src/app/api/crm/permissions/route.ts (`GET`, `registerRoute`), and register it in src/app/api/\_routes/index.ts — depends on T031
- [x] T033 Regenerate the client: `npm run generate-openapi` then `npm run generate-api`; verify `getCrmPermissionsOptions` exists in src/lib/api/@tanstack/react-query.gen.ts and `csv_export` replaced `csv` in src/lib/api/types.gen.ts — depends on T032
- [x] T034 Update src/app/(private)/positions/\_constants/position-permissions.constant.ts: `categoryKey`/`CSV_CATEGORY_KEY` → `csv_export`; **delete `POSITION_PERMISSION_FLAGS`** (権限フラグ ≡ アクセス権限, merged — Kyota's answer); add `DESTRUCTIVE_PERMISSION_KEYS` (can_force_withdrawal / can_edit_after_billing_confirmed / can_execute_refund) + `DESTRUCTIVE_PERMISSION_TOOLTIP` 「強制退会・返金など重要操作を含みます」 and `PERMISSION_DESCRIPTION_BY_KEY` for joining helper text to the catalog response — depends on T033
- [x] T035 Rewrite src/app/(private)/positions/\_components/position-form/position-form-permissions-section.tsx to render its categories from `getCrmPermissionsOptions()` instead of the hardcoded constant (FR-009a): map over `catalog.categories`, key rows by `permissionKey`, join helper text via `PERMISSION_DESCRIPTION_BY_KEY`, accordion `defaultValue` from the returned category keys, row-shaped skeleton while loading; keep bulk 全ON/全OFF and dirty tracking — port target .cache/fitness-crm-ui/src/pages/position-form.tsx unchanged; depends on T034
- [x] T036 [P] Update src/app/(private)/positions/\_components/permission-preview-panel.tsx: **remove the 権限フラグ section** and its separator; add the 重要操作 warning icon (AlertTriangle + Tooltip) on any category with a granted destructive permission (FR-007a); `isCsv` check → `csv_export`; 割当スタッフ → 3 rows via `sort_by=status&sort_order=asc` (resolves the PAR051 TODO), initial-circle avatar, 無効 badge, store on a sub-line, hover ArrowUpRight, and a 無効{N}名 note beside the total — port from .cache/fitness-crm-ui/src/pages/position-list.tsx (L1039-L1167 @426a9b3); satisfies PAR043a, PAR047, PAR049, PAR051; depends on T034
- [x] T037 [P] Rename the list column 権限フラグ数 → **アクセス権限数** in src/app/(private)/positions/\_components/position-table-columns.tsx (PAR015/PAR018) — port from position-list.tsx:L111 @426a9b3
- [x] T038 [P] Move the filter-result banner inside the list card in src/app/(private)/positions/page.tsx: swap `FilterResult` for the shared `FilterResultBanner` placed between the toolbar and the table, and drop the filter-button height to `h-8` in position-permission-filter.tsx (PAR004-PAR007, PAR009) — port from position-list.tsx:L806-L815 @426a9b3
- [x] T039 [P] Tighten 説明 validation to 500 chars in src/app/(private)/positions/\_schemas/position-form.schema.ts (was `TEXTAREA_MAX_LENGTH` 1000) to match the BE contract, with message 「説明は500文字以内で入力してください」
- [x] T040 Run `npm run type-check` and `npm run lint`; then verify against the running app on port 3000: `GET /api/crm/permissions` returns 10/36 with `csv_export` last, the preview pane shows warning icons and no 権限フラグ section, the create form renders its toggles from the catalog and still seeds CSV defaults on role change, and a 501-char `description` is rejected with 400 — depends on T031-T039

- [x] T041 Align the list contract's remaining names to BE v0.3 (follow-up, user decision 2026-07-29): query `permissionKey` → **`permission`**, add **`includeTotalAll`** (boolean, default false) and move the baseline count from top-level `totalAll` to **`pagination.totalAllItems`** (returned only when requested — matches the terms/routine/app-maintenance pattern), list item `enabled_category_count`/`total_category_count` → **`grantedCategoryCount`/`totalCategoryCount`**; also cap `search` at 100 chars (BE `maxLength`). Touches position.schema.ts, position.table.ts, use-position-filters.hook.ts, page.tsx, position-table-columns.tsx + regenerate client. Remaining deltas: `position_name` vs `name`, integer `id` vs UUID (research R1) — depends on T040

**Checkpoint**: API design v0.3 + prototype 7/23 fully reflected; the only open item is spec Q5 (`can_edit_gate_stop`), which is a question for the API team and needs no code change.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately
- **Foundational (Phase 2)**: independent of T001; **blocks all user stories** (T010's regenerated client is imported by every UI task; T011 blocks T012/T015/T018/T021)
- **US1 (Phase 3)**: after Phase 2 — no other story dependencies (MVP)
- **US2 (Phase 4)**: after Phase 2 — independent of US1 (form components are separate files; the 職位を追加 entry point from T013 is convenience, not a dependency)
- **US3 (Phase 5)**: after US2 (reuses the form from T023)
- **US4 (Phase 6)**: after US2 (extends create/page.tsx from T024)
- **US5 (Phase 7)**: after US1 (extends row actions from T016/T017)
- **Polish (Phase 8)**: after all desired stories
- **API v0.3 / prototype 7/23 alignment (Phase 9)**: after Phase 8 — T031 → T032 → T033 → T034 → (T035 ∥ T036 ∥ T037 ∥ T038 ∥ T039) → T040

### Within-phase ordering

- Phase 2: T002 → (T003 ∥ T004) → T005 → T006 → (T007 ∥ T008 ∥ T009) → T010 → T011
- Phase 3: T012 → T013 → (T014 ∥ T015 ∥ T016) → T017 → T018 → T019
- Phase 4: T020 → T021 → T022 → T023 → T024

### Parallel Opportunities

- T003 ∥ T004 (different seed/table files)
- T007 ∥ T008 ∥ T009 (three separate route files) after T006
- T014 ∥ T015 ∥ T016 (three separate components) after T013
- After Phase 2: US1 (dev A) ∥ US2 (dev B); then US3+US4 follow US2 while US5 follows US1

## Parallel Example: after T006 completes

```bash
Task: "Upgrade GET/POST in src/app/api/crm/positions/route.ts + migrate staffs consumers"   # T007
Task: "Add src/app/api/crm/positions/[id]/route.ts (GET/PATCH/DELETE)"                      # T008
Task: "Add src/app/api/crm/positions/[id]/permissions/route.ts"                             # T009
```

## Implementation Strategy

**MVP first**: Phase 1 → Phase 2 → Phase 3 (US1) → validate quickstart step 1 → demo. Then increments: US2 (create) → US3 (edit) → US4 (clone) → US5 (delete), validating each checkpoint independently. Single developer: straight T001→T030. Two developers: split at the Phase 2 checkpoint (A: US1→US5; B: US2→US3→US4).

## Parity coverage map (all 75 claimed)

| PAR range                          | Task |
| ---------------------------------- | ---- |
| PAR001-003                         | T013 |
| PAR004-008, PAR020-022, PAR031-037 | T017 |
| PAR009-014                         | T015 |
| PAR015-019                         | T014 |
| PAR023-026                         | T016 |
| PAR027-030                         | T027 |
| PAR038-048                         | T018 |
| PAR049-052                         | T019 |
| PAR053-060                         | T021 |
| PAR061 (+PAR059 edit note)         | T025 |
| PAR062-070                         | T022 |
| PAR071-074                         | T023 |
| PAR054 clone variant               | T026 |
| PAR015/018 rename (アクセス権限数) | T037 |
| PAR004-007 banner placement        | T038 |
| PAR043a/047 重要操作 icon          | T036 |
| PAR049/051 割当スタッフ 3件        | T036 |
