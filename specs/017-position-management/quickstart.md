# Quickstart: Y-01 Position Master Management (職位マスター管理)

**Goal**: Build and validate the Phase 1 position-master screens (two-pane list + preview, create/edit/clone form) end-to-end with mock-backed data, designed against the Staff & Permission Management BE API design **v0.3** (adapted to `/api/crm/*`), with UI parity enforced by `checklists/parity.md` (75 items — PAR043a added 2026-07-29).

---

## Implementation Checklist

### Mock API layer

- [ ] Extend `src/app/api/_schemas/position.schema.ts` — closed 36-key `PermissionMapSchema` with **BE `can_*` key naming** (data-model.md §1: 29 BE keys + 7 FE-extension keys), `PositionSchema` (+`description`, `permissions`, `is_system_managed`, `created_at`/`updated_at`; drop `features`), `GetPositionsQuerySchema`, `PositionListItemSchema` (+derived counts), `GetPositionsResponseSchema` (`items`/`pagination`/`totalAll`), `CreatePositionBodySchema`, `UpdatePositionBodySchema` (no `role`), `PositionPermissionsPreviewResponseSchema` + mock-internal category grouping metadata (nothing outside `src/app/api/` imports the mock layer — research R3 revised)
- [ ] Extend `src/app/api/_mock-db/seeds/position.seed.ts` — 13 positions with descriptions + full 36-key maps per data-model.md §6; align staff seeds (≥1 zero-staff position, ≥1 position with ≥3 staff incl. one 無効)
- [ ] Extend `src/app/api/_mock-db/types/positions.type.ts` + `tables/position.table.ts` — `list(query)` (search/permissionKey/role/sort/paging + derived `staff_count`, category counts), `getById`, `create` (uniqueness), `update` (no role), `delete` (guard order 404→422→409)
- [ ] Add seed-only `staff-change-history` (types + table `getListByStaffId` read accessor + seed ≥5 rows) — NO route, NO writes from position ops (FR-019)
- [ ] Wire tables into `src/app/api/_mock-db/_create-db.ts`
- [ ] Upgrade `GET`/add `POST` in `src/app/api/crm/positions/route.ts` (contracts/get-positions.md, create-position.md); update staffs-feature consumers of the old `{positions}` shape (research R2)
- [ ] Add `src/app/api/crm/positions/[id]/route.ts` — GET/PATCH/DELETE (contracts/get-position-detail.md, update-position.md, delete-position.md)
- [ ] Add `src/app/api/crm/positions/[id]/permissions/route.ts` (contracts/get-position-permissions.md)
- [ ] Add `src/app/api/crm/permissions/route.ts` — permission catalog, no `positionId` (contracts/get-permission-catalog.md, research R14); register it in `src/app/api/_routes/index.ts`
- [ ] Run `npm run generate-openapi` then `npm run generate-api` to refresh `src/lib/api/`

### Access control

- [ ] Register page permissions for `/positions`, `/positions/create`, `/positions/[id]/edit` using existing `Permission.PositionsView/Create/Edit/Delete` (research R11); Headquarter granted all four (System global)

### UI — list + preview (`/positions`)

- [ ] `_hooks/use-position-filters.hook.ts` — nuqs: `search`, `permissionKey`, `page`, `limit`, `positionId` (selection; deep-link preselect PAR021)
- [ ] Replace stub `page.tsx` — RSC shell + `"use client"` content: PageHeader 職位マスター管理 + count badge + RoleGated 職位を追加 (PAR001–003); filter banner with totalAll/totalItems + 条件をクリア (PAR004–007); search box + 権限で絞り込む Command popover grouped by category with grant-semantics filtering (PAR008–014); table columns 職位名+説明 / ロール badge / 権限フラグ数 N/10 / 割当スタッフ link / ⋯ menu (PAR015–022); empty vs filtered-empty states (PAR031–032); pagination footer + page-size select (PAR033–037)
- [ ] `position-row-actions.tsx` + `position-delete-dialog.tsx` — 編集 / 複製 (role-gated) / 削除（割当あり disabled when staff_count>0） / confirm dialog copy (PAR023–030)
- [ ] `permission-preview-panel.tsx` — placeholder card; header (name/role/description/権限を編集); category accordion with derived levels + CSV 出力可/出力不可 + granted counts + fine rows + 重要操作 warning icon (FR-007a); **no 権限フラグ section**; 割当スタッフ via `GET /crm/staffs?position_id=&sort_by=status` (top-3 active-first with avatar/無効 badge/store sub-line, 割当なし, 他 N 名を見る → staff list filtered) (PAR038–052)

### UI — form (create / edit / clone)

- [ ] `_constants/position-permissions.constant.ts` — feature-local UI metadata (helper descriptions, kind view|edit, destructive key set + tooltip, CSV role defaults) typed `satisfies` against the generated permission-map type from `src/lib/api/types.gen` (research R3/R14 — no imports from the mock layer). Categories/labels/order come from the catalog endpoint.
- [ ] `_schemas/position-form.schema.ts` — Zod: `position_name` required ≤100 (「職位名を入力してください」), `role` required (「対象ロールを選択してください」), permissions map
- [ ] `position-form.tsx` + sections — 基本情報 (name / role select 5 options / description textarea, ≤500 chars) + 権限設定 rendered from `getCrmPermissionsOptions()` (accordions all open, per-row switches with helper text joined by key, per-category N/M badge + 全ON/全OFF bulk switch, skeleton while the catalog loads) (PAR053–070, FR-009a)
- [ ] CSV role-default seeding: create-from-scratch only, re-seed on role change; clone/edit never (FR-011, PAR062)
- [ ] `create/page.tsx` — 職位 新規作成; `?cloneFrom={id}` → 職位 複製して作成 with prefilled role/description/permissions, blank name (research R7)
- [ ] `[id]/edit/page.tsx` — 職位 編集, prefill via detail query, **role select disabled** (Clarification Q3, PAR059 note)
- [ ] Validation UX: inline errors, footer 「未入力の項目があります」, scroll-to-first-invalid (reuse `use-scroll-to-first-error`), unsaved-changes discard dialog (PAR071–074); success toasts + navigate to list (PAR073)
- [ ] 409 duplicate-name from create/rename surfaces as a user-facing duplicate error (FR-010)

### Wrap-up

- [ ] `npm run type-check` and `npm run lint` pass
- [ ] Walk `checklists/parity.md` against the running screen (V0 @426a9b3) and tick all 75 items (PAR059 per its clarified note)

---

## Manual Verification (constitution QA path)

1. **Browse & preview**: Open `/positions` → 13 rows, header badge 13件, column header reads アクセス権限数. Search "テリトリー" → banner appears inside the list card below the toolbar: 全13件中2件, clear works. 権限で絞り込む → アンケートの作成 → only 本部管理者 + テリトリーMGR(アンケート作成) remain. Click 正社員スタッフ → preview shows category levels, a 重要操作 warning icon on categories holding 強制退会/請求確定後変更/返金, **no 権限フラグ section**, and 割当スタッフ (active-first, max 3, avatar + 無効 badge + store sub-line, links work). Reload with `?positionId=` → preselected.
2. **Create + CSV defaults (FR-S001)**: 職位を追加 → the 権限設定 accordions render from `GET /crm/permissions` (10 categories, 36 toggles); select 本部 → 3 CSV toggles ON; switch to スタッフ → OFF; other toggles untouched. Submit blank → inline errors + summary + scroll. Valid save → toast, back to list, new row visible.
3. **Duplicate name**: create another position named 正社員スタッフ with role スタッフ → duplicate-name error (409).
4. **Edit**: row ⋯ → 編集 → all fields prefilled, role select disabled. Flip a permission, save → toast; preview reflects change.
5. **Clone**: ⋯ → 複製 → title 職位 複製して作成, permissions/description prefilled, name blank; save under new name → new row, source untouched, staff count 0.
6. **Delete guard**: position with staff → menu shows disabled 削除（割当あり）. Zero-staff position → 削除 → dialog → confirm → row gone; if it was selected, preview resets to placeholder.
7. **Role gating**: as Manager (mock user switch), 職位を追加 / 編集 / 複製 / 削除 are not usable (FR-017).
8. **History untouched**: perform create/edit/delete above → `staff-change-history` seed rows unchanged (FR-019).
9. **Catalog endpoint**: `curl localhost:3000/api/crm/permissions` → `totalCategoryCount: 10`, `totalPermissionCount: 36`, categories in fixed order ending with `csv_export`.
10. **description limit**: POST a position with a 501-char `description` → 400; ≤500 → created.
