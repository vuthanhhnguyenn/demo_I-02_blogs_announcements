# Tasks: Y-10 CRM Maintenance Management

**Input**: Design documents from `/specs/017-crm-maintenance-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, checklists/parity.md

**Organization**: Tasks are grouped by user story (from spec.md, in priority order: US1 P1 "Register", US2 P2 "View list & detail", US3 P3 "Edit/Delete") to enable independent implementation and testing of each story.

**No test tasks**: Per `.specify/memory/constitution.md`'s absolute "No Testing Policy," this list contains zero test-writing tasks (no unit/integration/e2e/contract tests). Verification is manual, against `quickstart.md`'s checklist plus `tsc --noEmit` and ESLint.

**Backend-in-Foundational**: All three spec.md user stories are UI-shaped, but the two backend route files each serve multiple stories on shared HTTP methods (`route.ts` = list GET **and** create POST; `[id]/route.ts` = detail GET **and** update PATCH **and** delete DELETE). Splitting a single file's methods across phases would force repeated edits to the same file from different "independent" stories. Per plan.md's Implementation Order Note, the full schema/table/routes/codegen/permission-wiring is therefore built once in Foundational (thin, contract-driven per `contracts/*.md`), and every user-story phase is pure UI consuming the already-live, already-typed endpoints.

**Sequencing note (Create=P1 before View=P2)**: Unlike the sibling `016-app-maintenance-mgmt` feature (where List was P1), spec.md orders this feature's stories as Register (P1) → View list/detail (P2) → Edit/Delete (P3). `quickstart.md` maps the full list rendering (columns, search, status filter, sort, pagination, empty states — FR-010/FR-011/FR-020/FR-021) and the detail page (FR-013/FR-014) entirely to **User Story 2**, not User Story 1. So while spec.md's own "Verification" prose for US1 says to "confirm the new record appears in the list," that full list UI does not exist yet when US1 alone is built. US1's Independent Test below is scoped accordingly: confirm success via the confirmation dialog + success toast + the `POST /crm/maintenances` response (Network tab) showing the correct `id`/`status`/`allowedUsers` — full visual confirmation in the list/detail screens becomes possible once US2 lands. This does not weaken FR coverage: every FR named in US1's acceptance scenarios (FR-001–FR-009) is independently exercised through the create form alone.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3, mapping to spec.md's user stories
- Every task includes an exact file path
- UI tasks cite their V0 source range and the `PAR###` parity items they satisfy, per `checklists/parity.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the feature's directory structure. No new npm dependencies.

- [x] T001 Create `src/app/(private)/crm-maintenance/_components/`, `_constants/`, `_hooks/`, `_schemas/`, `create/`, `[id]/`, and `[id]/edit/` directories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the mock-DB table (incl. the allowed-user join table), Zod schemas, both route files (all methods), wire codegen and permissions, and stand up the four page shells every user story renders into. No user-story work can start until this phase is complete.

**⚠️ CRITICAL**: This phase must fully complete before Phase 3+.

- [x] T002 Create `src/app/api/_schemas/crm-maintenance.schema.ts` per data-model.md: imports `StaffRoleSchema` from `staff.schema.ts` (research.md §5, no duplicate enum); `CrmMaintenanceStatusSchema` (`'planned'|'in_progress'|'completed'`); row schema `CrmMaintenanceSchema` (snake_case: `id`, `title`, `starts_at`, `ends_at`, `message`, `note`, `created_by`, `updated_by`, `created_at`, `updated_at`); `GetCrmMaintenancesQuerySchema` (page/limit 25-50-100-200 default 50/`search`/`status`/`sort`: `startsAt`\|`endsAt`\|`createdAt` default `startsAt`/`order` default `desc`); `CreateCrmMaintenanceBodySchema` (camelCase: `title` 1-255, `startsAt`, `endsAt` with `.refine()` enforcing `endsAt` after `startsAt` → `終了日時は開始日時より後の日時を入力してください。`, `message` 1-1000, `note?` ≤1000, `allowedUserIds?: string[]`); `UpdateCrmMaintenanceBodySchema` (all of the above, all optional); `CrmMaintenanceAllowedUserResponseSchema` (`staffId`, `name`, `role`: `StaffRoleSchema`); `CrmMaintenanceItemResponseSchema` (list row: `id`,`title`,`startsAt`,`endsAt`,`status`,`allowedUserCount`,`createdAt`); `CrmMaintenanceDetailResponseSchema` (item fields minus `allowedUserCount` + `message`,`note`,`allowedUsers[]`,`createdBy`,`updatedBy`,`updatedAt`); `GetCrmMaintenancesResponseSchema` (`{items, pagination}`); `CreateCrmMaintenanceResponseSchema`/`UpdateCrmMaintenanceResponseSchema` (`{message, crmMaintenance}`); `DeleteCrmMaintenanceResponseSchema` (`{message, id}`); and all corresponding type exports
- [x] T003 [P] Create `src/app/api/_mock-db/types/crm-maintenance.type.ts`: `CrmMaintenanceRow` (from `CrmMaintenanceSchema`), `CrmMaintenanceAllowedUserRow` (`{crm_maintenance_id, staff_id}`), a join-table type `CrmMaintenanceAllowedUsersTable` (`getByMaintenanceId(id)`, `setByMaintenanceId(id, staffIds)`, `deleteByMaintenanceId(id)`) mirroring `BannerBrandMapTable` in `banners.type.ts`; discriminated result types `CrmMaintenanceCreateResult = CrmMaintenanceRow | 'period_conflict' | 'unknown_staff_id'`, `CrmMaintenanceUpdateResult = CrmMaintenanceRow | 'not_found' | 'start_locked' | 'period_conflict' | 'unknown_staff_id'`, `CrmMaintenanceDeleteResult = 'not_found' | 'in_progress_locked' | true`; `CrmMaintenancesType` interface declaring `_rows`, `_allowedUsers: CrmMaintenanceAllowedUsersTable`, `_seeded`, `_seed()`, `list(query)`, `getById(id)`, `create(body, createdBy)`, `update(id, patch, updatedBy)`, `delete(id)` — depends on T002
- [x] T004 [P] Create `src/app/api/_mock-db/seeds/crm-maintenance.seed.ts`: `buildCrmMaintenanceSeed(db)` — 6 rows (M-001…M-006) seeded **relative to the seed's execution time**, per data-model.md's seed table: M-001 (`now-120d`, 3 staff, completed), M-002 (`now-90d`, 4 staff, completed), M-003 (`now-60d`, 5 staff, completed), M-004 (`now-30d`, 2 staff, completed), M-005 (`now-2h`…`now+4h`, 2 staff, **in_progress**), M-006 (`now+14d`…`+3h`, 3 staff, **planned**) — each allowed-user `staff_id` referencing a real seeded `db.staffs` row — depends on T003
- [x] T005 Create `src/app/api/_mock-db/tables/crm-maintenance.table.ts`: `createCrmMaintenanceTables(getDb)` factory implementing `computeStatus(startsAt, endsAt)` (mirrors `app-maintenances`' `computeStatus`), a join-table factory (mirrors `createBannerBrandMapTable()`), an interval-overlap helper checked against **every** row regardless of status with touching boundaries not treated as overlapping (FR-005, spec.md Edge Cases); `list()` (search id/title, status filter on the **derived** value, sort `startsAt`/`endsAt`/`createdAt`, paginate); `getById()` (resolves `allowedUsers` from `db.staffs` at read time, silently skipping any unresolvable `staff_id`); `create()` (validates every `allowedUserIds` entry exists in `db.staffs` → `'unknown_staff_id'`, checks overlap → `'period_conflict'`, generates next `M-{NNN}` id); `update()` (→ `'not_found'` | `'start_locked'` when the patch touches `startsAt` while derived status is `in_progress` | `'period_conflict'` (excluding self) | `'unknown_staff_id'` | the updated row; `allowedUserIds`, when present, **replaces** the entire join set, permitted regardless of status per FR-017); `delete()` (→ `'not_found'` | `'in_progress_locked'` | `true`, cascading the join-table rows) — depends on T003, T004
- [x] T006 Register the new table: add `crmMaintenances: CrmMaintenancesType` to `DbType` in `src/app/api/_mock-db/_db.types.ts`, and call `createCrmMaintenanceTables(...)` in `src/app/api/_mock-db/_create-db.ts` — depends on T005
- [x] T007 [P] Implement `src/app/api/crm/maintenances/route.ts` per contracts/list-crm-maintenances.md + contracts/crm-maintenance-mutations.md: `registerRoute()` for `GET` (list) and `POST` (create); `GET` — `getAuthUserFromRequest`, 403 unless role ∈ {`System`,`Headquarter`}, parse `GetCrmMaintenancesQuerySchema`, call `db.crmMaintenances.list(...)`; `POST` — 403 unless role === `System`, parse `CreateCrmMaintenanceBodySchema`, call `db.crmMaintenances.create(data, authResult.user.id)`, map `'period_conflict'`→409 `登録しようとしている期間は既存のメンテナンス期間と重複しています。`, `'unknown_staff_id'`→404 `該当するユーザーが見つかりません` — depends on T002, T006
- [x] T008 [P] Implement `src/app/api/crm/maintenances/[id]/route.ts` per contracts/crm-maintenance-detail.md + contracts/crm-maintenance-mutations.md: `registerRoute()` for `GET`/`PATCH`/`DELETE`; `GET` allows `System`+`Headquarter`, 404 `該当するメンテナンス情報が見つかりません。` if not found; `PATCH` requires `System`, parse `UpdateCrmMaintenanceBodySchema`, call `db.crmMaintenances.update(...)`, map `'not_found'`→404, `'start_locked'`→409 `メンテナンス中のため開始日時は変更できません。`, `'period_conflict'`→409, `'unknown_staff_id'`→404; `DELETE` requires `System`, map `'not_found'`→404, `'in_progress_locked'`→409 `メンテナンス実施中のため削除できません。` — depends on T002, T006
- [x] T009 Add import lines for both new route files to `src/app/api/_routes/index.ts` (alphabetically grouped, matching existing entries) — depends on T007, T008
- [x] T010 Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmMaintenancesOptions`, `postCrmMaintenancesMutation`, `getCrmMaintenancesByIdOptions`, `patchCrmMaintenancesByIdMutation`, `deleteCrmMaintenancesByIdMutation` in `src/lib/api/` — depends on T009
- [x] T011 [P] Add `Permission.CrmMaintenanceView` / `CrmMaintenanceCreate` / `CrmMaintenanceEdit` / `CrmMaintenanceDelete` (dot-string values, e.g. `crm-maintenance.view`) to `src/types/permission.type.ts`; wire `PAGE_PERMISSIONS` entries for `/crm-maintenance`, `/crm-maintenance/create`, `/crm-maintenance/:id`, `/crm-maintenance/:id/edit` in `src/constants/permission.constants.ts`; add `Permission.CrmMaintenanceView` to `ROLE_PERMISSIONS[UserRole.Headquarter]` (System already gets every permission via `Object.values(Permission)`) — implements FR-012/FR-014/FR-020 per research.md §4
- [x] T012 [P] Create `src/app/(private)/crm-maintenance/_constants/crm-maintenance.constants.ts`: `CRM_MAINTENANCE_STATUS_LABELS` (`{planned: '予定', in_progress: 'メンテナンス中', completed: '完了'}`) with a status→badge-tint map (info/warning/muted, matching parity PAR012/PAR033), `PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const`, and a capitalized-`UserRole`-label ↔ lowercase-`StaffRoleSchema` map for the staff-search dialog's role select and allowed-user role badges (research.md §5)
- [x] T013 Create page shells (Server Components, empty content slots): `src/app/(private)/crm-maintenance/page.tsx` (`PageHeader` title="CRMメンテナンス管理", empty `actions`/content slots), `create/page.tsx` (`PageHeader` with `BackLink` to the list + title="CRMメンテナンス新規登録"), `[id]/page.tsx` (detail shell, empty content slot), `[id]/edit/page.tsx` (`BackLink` + title="CRMメンテナンス編集") — following the `app-maintenance` shell convention — port from maintenance-form.tsx › page header (L211-217); satisfies PAR035 — depends on T011
- [x] T014 Run `npm run generate-routes` to register `/crm-maintenance`, `/crm-maintenance/create`, `/crm-maintenance/[id]`, and `/crm-maintenance/[id]/edit` in `src/lib/routes/routes.config.ts` — depends on T013

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Register a CRM maintenance window with allowed users (Priority: P1) 🎯 MVP

**Goal**: A System-role user can create a maintenance window (title, period, message, note) with an allowed-user sub-list built via search-and-add, validated per FR-001–FR-009, and confirmed via a summary dialog before saving.

**Independent Test**: As `System`, open the create form, submit invalid data (blank fields, bad date order, overlapping period) and see the exact inline errors; search for staff by ID/name/role fragment and add several in one action; remove one before saving; submit a valid, non-overlapping window and confirm the confirmation dialog's summary, the success toast, and that `POST /crm/maintenances`'s response (Network tab) contains the new `id`, correct `status`, and `allowedUsers` — see the Sequencing note above for why this doesn't yet include the visual list.

### Implementation for User Story 1

- [x] T015 [US1] Create `src/app/(private)/crm-maintenance/_schemas/crm-maintenance-form.schema.ts`: react-hook-form Zod schema mirroring `CreateCrmMaintenanceBodySchema` — `title`, `startsAt`, `endsAt` (`.refine()` enforcing `endsAt` after `startsAt`), `message`, `note?`, `allowedUserIds: string[]` — implements FR-002/FR-003/FR-004's client-side validation
- [x] T016 [P] [US1] Create `src/app/(private)/crm-maintenance/_components/crm-maintenance-form/allowed-user-list.tsx`: helper text (PAR042), "CRMユーザーを検索して追加" button (PAR043) opening T017's dialog, dashed-border empty state "許可ユーザーはまだ追加されていません" (PAR044), one row per allowed user (user ID, name, role badge, remove ✕ button) (PAR045), warning `Alert` (PAR046) — port from maintenance-form.tsx › AllowedUsersCard (L284-321); satisfies PAR042-PAR046
- [x] T017 [P] [US1] Create `src/app/(private)/crm-maintenance/_components/crm-maintenance-form/staff-search-dialog.tsx`: `'use client'` — ユーザーID/氏名 text inputs merged client-side into one `search` query param, ロール select mapped from capitalized labels to `StaffRoleSchema` (T012's map) before calling `useQuery(getCrmStaffsOptions(...))` (existing Y-01 endpoint, reused as-is per research.md §5); result rows with checkbox + user ID + name + role badge, pre-checked/disabled and dimmed with "追加済み" tag for users already on the list (PAR055); zero-results dashed-border state "該当するユーザーが見つかりません" (PAR054); footer キャンセル + "選択したユーザーを追加" (disabled until ≥1 checked), on confirm calls the parent's add-handler and shows toast "許可ユーザーに{count}名を追加しました" (PAR056) — port from maintenance-form.tsx › UserSearchDialog (L378-429); satisfies PAR052-PAR056
- [x] T018 [US1] Create `src/app/(private)/crm-maintenance/_components/crm-maintenance-form/confirm-dialog.tsx`: title "以下の内容で登録しますか？" (create) / "変更内容を保存しますか？" (edit) (PAR049); body summarizing タイトル, 期間, 許可ユーザー count (PAR050); キャンセル + confirm ("登録を確定する"/"更新を確定する"), on confirm shows success toast ("CRMメンテナンスを登録しました"/"CRMメンテナンスの変更を保存しました") and navigates to the list (PAR051) — port from maintenance-form.tsx › ConfirmDialog (L342-369); satisfies PAR049-PAR051
- [x] T019 [US1] Create `src/app/(private)/crm-maintenance/_components/crm-maintenance-form/crm-maintenance-form.tsx`: shared create+edit presentational form — 基本情報 card: タイトル (PAR036), 開始日時 (disabled + Lock icon + tooltip "メンテナンス中のため開始日時は変更できません" when `mode==='edit'` and `currentStatus==='in_progress'`) (PAR037), 終了日時 (PAR038), period-overlap error line below the date row (PAR039), メンテナンスメッセージ textarea (PAR040), 備考 textarea (PAR041); embeds T016's allowed-user card; footer キャンセル + submit ("登録する"/"保存する") opening T018's confirm dialog (PAR047/PAR048); owns the create (`postCrmMaintenancesMutation`) and update (`patchCrmMaintenancesByIdMutation`) mutations internally, keyed by its `mode` prop (matching the repo's `AppMaintenanceForm`/`BannerForm` shared-form convention); maps 409 responses to the inline period-overlap/start-locked messages — port from maintenance-form.tsx › MaintenanceForm (L211-369); satisfies PAR035-PAR041, PAR047, PAR048 — depends on T015, T016, T017, T018
- [x] T020 [US1] Integrate `CrmMaintenanceForm mode="create"` into `create/page.tsx`'s content slot (from Foundational T013); add a "新規登録" `RoleGatedButton` (`requiredPermission={Permission.CrmMaintenanceCreate}`, `denyTooltip="CRMメンテナンス登録は System 権限のみ可能です"`) to the list page's `PageHeader` `actions` slot — port from crm-maintenance-list.tsx › page header button (L305-316); satisfies PAR003 — depends on T019

**Checkpoint**: User Story 1 is independently functional — creating a record end-to-end works and is verifiable via the confirmation dialog, success toast, and the API response (full list/detail visual confirmation arrives with US2).

---

## Phase 4: User Story 2 - View the CRM maintenance list and record detail (Priority: P2)

**Goal**: A System or Headquarter user can browse all maintenance windows (search/filter/sort/paginate, correct computed status) and open any record's full read-only detail, including its allowed-user table; all other roles are denied.

**Independent Test**: As `System`/`Headquarter`, open `/crm-maintenance`; verify all 6 seeded rows render with correct columns/status/allowed-user count; search, filter by status, sort by each sortable column, and paginate; click a row to view its detail (all fields + allowed-user table); verify a `Manager`/`Staff`/`Trainer`/`Observer` user sees the access-denied screen instead (per quickstart.md's List/Detail sections).

### Implementation for User Story 2

- [x] T021 [US2] Create `src/app/(private)/crm-maintenance/_hooks/use-crm-maintenance-filters.hook.ts`: `nuqs`-backed `useQueryStates` for `page`/`limit`/`search`/`status`/`sortBy`/`sortOrder`, a debounced local `searchInput`, `clearFilters` (resets search + status + page), `activeFilterCount`, and a `queryParams` object matching `GetCrmMaintenancesQuery`
- [x] T022 [P] [US2] Create `src/app/(private)/crm-maintenance/_components/crm-maintenance-columns.tsx`: `ColumnDef<CrmMaintenanceItemResponse>[]` — ID, タイトル, sortable 開始日時/終了日時 (with sort-direction icon + tooltip), ステータス `Badge` (per T012's tint map), 許可ユーザー "{n}名" right-aligned tabular-nums, sortable 作成日, and a placeholder row-actions column (populated in US3) — port from crm-maintenance-list.tsx › columns (L159-168, L242-271, L400-410); satisfies PAR010-PAR013
- [x] T023 [P] [US2] Create `src/app/(private)/crm-maintenance/_components/crm-maintenance-filters.tsx`: search `Input` (placeholder "IDまたはタイトルで検索...") (PAR006), "詳細フィルター" toggle with active-count badge + chevron (PAR007), expandable ステータス select (全ステータス/予定/メンテナンス中/完了) (PAR008), "すべてクリア" shown only when a filter is active (PAR009), and the filter-result banner "全{N}件中{M}件を抽出中" + "条件をクリア" (PAR004/PAR005) — port from crm-maintenance-list.tsx › FilterBar (L322-392); satisfies PAR004-PAR009
- [x] T024 [US2] Create `src/app/(private)/crm-maintenance/_components/access-denied.tsx`: `ShieldAlert` icon, heading "アクセス権限がありません", body "CRMメンテナンス管理は本部・System 権限のスタッフのみ参照できます。", centered, no table — port from crm-maintenance-list.tsx › AccessDenied (L274-293); satisfies PAR001
- [x] T025 [US2] Create `src/app/(private)/crm-maintenance/_components/crm-maintenance-list-section.tsx`: `'use client'` orchestrator — renders T024 when the current role is not `System`/`Headquarter`; otherwise `useCrmMaintenanceFilters()` (T021) + `useQuery(getCrmMaintenancesOptions({query: queryParams}))`, `DataTable` (T022's columns, sortable headers wired to the hook), page-size `Select` (`PAGE_SIZE_OPTIONS`) + pagination summary/control (PAR020-PAR022), `Empty` (`variant={hasActiveFilters ? 'filtered' : 'empty'}`) (PAR014), row click (outside the actions cell) navigates to `/crm-maintenance/[id]` (PAR015), row-actions dropdown stops click propagation (PAR016, stub only — populated in US3) — port from crm-maintenance-list.tsx › ListSection (L301-534); satisfies PAR002, PAR014-PAR016 — depends on T021, T022, T023, T024
- [x] T026 [US2] Integrate `CrmMaintenanceListSection` into `page.tsx`'s content slot (from Foundational T013), including the page-title total-count badge (PAR002)
- [x] T027 [P] [US2] Create `src/app/(private)/crm-maintenance/_components/detail/detail-info-cards.tsx` and `src/app/(private)/crm-maintenance/_components/detail/detail-status-card.tsx`: 基本情報 card (ID/タイトル/開始日時/終了日時, 2-col grid) (PAR029), メンテナンスメッセージ card (whitespace preserved) (PAR030), 備考 card (only when non-empty) (PAR031), 許可ユーザー（{count}名） table (ユーザーID/氏名/ロール) (PAR032), and the sticky status card (tone/icon/label per status + "作成"/"更新" meta lines) (PAR033) — port from crm-maintenance-detail.tsx › DetailSections (L168-257); satisfies PAR029-PAR033
- [x] T028 [US2] Create `src/app/(private)/crm-maintenance/_components/detail/crm-maintenance-detail-section.tsx`: `'use client'` orchestrator — `useQuery(getCrmMaintenancesByIdOptions({path: {id}}))`, `DataStateBoundary` for the not-found case, back link "CRMメンテナンス管理に戻る" (PAR024), title + status badge (PAR025), "編集" `RoleGatedButton` (`requiredPermission={Permission.CrmMaintenanceEdit}`) (PAR026), overflow menu rendered only for `System` (PAR027) containing a delete item — enabled when deletable, disabled "削除（メンテナンス中）" when `status==='in_progress'` (PAR028, wired to T031 in US3) — renders T027's cards — port from crm-maintenance-detail.tsx › DetailPage (L70-257); satisfies PAR024-PAR028 — depends on T027
- [x] T029 [US2] Integrate `CrmMaintenanceDetailSection` into `[id]/page.tsx`'s content slot (from Foundational T013)

**Checkpoint**: User Stories 1 AND 2 both work independently — full read visibility plus role-gated denial is live, and US1's created records are now visually confirmable in the list/detail screens.

---

## Phase 5: User Story 3 - Edit or delete an existing maintenance record (Priority: P3)

**Goal**: A System-role user can edit any record (with the start-datetime locked while `in_progress`, and allowed-user changes always permitted) and delete any record that isn't `in_progress`, both gated to `System` only.

**Independent Test**: Edit a `planned`/`completed` record — all fields editable, save succeeds; edit the `in_progress` record — start-datetime locked with tooltip, other fields (incl. allowed users) still editable, save succeeds; delete a `planned`/`completed` record via the confirmation dialog and see it disappear from the list and its allowed-user rows removed; confirm the `in_progress` record's delete control is disabled with the exact explanatory text (per quickstart.md's Edit/Delete sections).

### Implementation for User Story 3

- [x] T030 [US3] In `crm-maintenance-columns.tsx` (US2, T022) and `crm-maintenance-list-section.tsx` (US2, T025): add a row-actions `DropdownMenu` with a "編集" `RoleGatedMenuItem` (`requiredPermission={Permission.CrmMaintenanceEdit}`, navigates to `/crm-maintenance/[id]/edit`) (PAR017), and a "削除" `RoleGatedMenuItem` (`requiredPermission={Permission.CrmMaintenanceDelete}`) that is disabled with two-line label "削除できません"/"メンテナンス実施中のため" when `status==='in_progress'` (PAR018), otherwise destructive-styled and opens T031's dialog (PAR019) — port from crm-maintenance-list.tsx › row actions (L443-477); satisfies PAR017-PAR019 — depends on T022, T025
- [x] T031 [US3] Create `src/app/(private)/crm-maintenance/_components/delete-dialog.tsx`: shared `AlertDialog` — title "このCRMメンテナンス情報を削除しますか？", description "「{title}」を削除します。紐づく許可ユーザーリストも削除されます。", キャンセル + destructive "削除する" (PAR023/PAR034 — same copy used by both list and detail); `useMutation(deleteCrmMaintenancesByIdMutation)` on confirm; on success `toast.success('CRMメンテナンス情報を削除しました')` + invalidate the list and detail queries — port from crm-maintenance-list.tsx › DeleteDialog (L542-554); satisfies PAR023, PAR034
- [x] T032 [US3] Wire T031's dialog into both the list's row-actions delete item (T030) and the detail page's overflow-menu delete item (US2, T028's PAR027/PAR028) — depends on T028, T030, T031
- [x] T033 [US3] Create `[id]/edit/page.tsx` content (from Foundational T013's shell): `useQuery(getCrmMaintenancesByIdOptions({path: {id}}))`, `DataStateBoundary` for the not-found case, pass `defaultValues` + `currentStatus` into `CrmMaintenanceForm mode="edit"` (US1, T019) — the start-datetime lock (PAR037) and allowed-user-editable-while-in-progress behavior (FR-017) are already implemented in T019, driven by the `currentStatus` prop — depends on T019

**Checkpoint**: All three user stories are independently functional — full CRUD is live end to end.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T034 [P] Run `tsc --noEmit` and fix any type errors introduced by this feature's files (Constitution I)
- [x] T035 [P] Run `npm run lint` and fix any violations (Constitution I / QA process)
- [x] T036 Run through `quickstart.md`'s full manual checklist (Setup, List, Create, Detail, Edit, Delete, Cross-cutting) against the running dev server, for both `System` and `Headquarter`, plus one denied role
- [x] T037 Confirm every `PAR001`–`PAR056` item in `checklists/parity.md` renders correctly in the built screens and check it off — an unclaimed or unverified item means a V0 element is missing
- [x] T038 Confirm via `git diff --stat src/lib/api/` that all changes under `src/lib/api/` come exclusively from `generate-openapi`/`generate-api` (Constitution II) — no manual edits

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories. Internally sequential: T002 → T003 → {T004, T005 (T005 also needs T004)} → T006 → {T007, T008} → T009 → T010; T011 and T012 are independent of the route/codegen chain; T013 depends on T011; T014 depends on T013.
- **User Stories (Phase 3–5)**: All depend on Foundational (Phase 2) completion.
  - US1 (Phase 3) has no dependency on US2/US3, aside from touching the list page's header `actions` slot (T020) which US2 later fills with list content (T026) — a documented, non-conflicting shared-file touch (different regions of `page.tsx`).
  - US2 (Phase 4) depends only on Foundational.
  - US3 (Phase 5) modifies US2's columns/list-section files (T030) to add row-action entries, and US1's form component is reused as-is for edit mode (T033) — both deliberate, minimal cross-story touches.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Parallel Opportunities

- Within Foundational: T011 and T012 can run any time in parallel with the T002→T010 chain; T007 and T008 are parallel (different files).
- Within US1: T016 and T017 are parallel (different files); T018 has no dependency on either and can run alongside them.
- Within US2: T022 and T023 are parallel (different files); T027 is independent of both and can run in parallel.
- Across stories: once Foundational is done, US1 and US2 can be staffed in parallel (US2 does not need US1's form to exist). US3 should follow both, since it touches files from each.

---

## Parallel Example: Foundational Phase

```bash
# After T006 (table registered), both routes can be built together:
Task: "Implement src/app/api/crm/maintenances/route.ts (list GET + create POST)"
Task: "Implement src/app/api/crm/maintenances/[id]/route.ts (detail GET + update PATCH + delete DELETE)"

# Permissions and UI constants have no backend dependency and can run any time:
Task: "Add Permission.CrmMaintenance* entries and wire PAGE_PERMISSIONS/ROLE_PERMISSIONS"
Task: "Create crm-maintenance.constants.ts (status labels, page-size options, role-label map)"
```

## Parallel Example: User Story 1

```bash
Task: "Create allowed-user-list.tsx in _components/crm-maintenance-form/"
Task: "Create staff-search-dialog.tsx in _components/crm-maintenance-form/"
```

## Parallel Example: User Story 2

```bash
Task: "Create crm-maintenance-columns.tsx in _components/"
Task: "Create crm-maintenance-filters.tsx in _components/"
Task: "Create detail-info-cards.tsx + detail-status-card.tsx in _components/detail/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm registration end-to-end via the confirmation dialog, success toast, and the API response (per the Sequencing note, full list/detail visuals land with US2)
5. Demo if ready — registering maintenance windows is already useful configuration data for the platform side (TAS) even before the CRM-side list/detail UI exists

### Incremental Delivery

1. Setup + Foundational → foundation ready (schema, table, both routes live, typed client generated, permissions wired, 4 page shells registered)
2. Add US1 (register) → validate → demo
3. Add US2 (view list + detail) → validate → demo (now US1's records are visually confirmable)
4. Add US3 (edit/delete) → validate → demo — full CRUD complete
5. Polish (Phase 6)

### Parallel Team Strategy

With multiple developers, after Foundational completes:

- Developer A: US1 (register + staff-search dialog)
- Developer B: US2 (list + detail) — independent of US1's finished UI, only needs the Foundational shells/hooks
- US3 should follow both, since it touches files from each (columns/list-section from US2, the shared form from US1)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test-writing tasks anywhere (Constitution's No Testing Policy) — quickstart.md and parity.md are the verification artifacts
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently

---

## Phase 7: FR-007 Advance Notification Delta (added 2026-07-20)

**Context**: The base CRUD (T001–T038) is complete and merged. This phase adds the advance-notification capability (spec **FR-022–FR-027**, **SC-007**) brought in scope by the 2026-07-20 Clarifications. It layers onto the existing `crmMaintenances` mock table and the existing list/detail screens — **no new mock table, no new page, no new npm dependency**. See plan.md § "Advance Notification (FR-007) — Design Delta", updated data-model.md, and `contracts/crm-maintenance-notify.md`.

**Story label**: `[NOTIF]` — the notification feature is cross-cutting on User Story 2's list & detail screens; spec.md has no separate user-story heading for it (FR-022–FR-027 are its requirements). New parity items: **PAR057–PAR060**.

**Decisions locked (Clarifications 2026-07-20)**: mock persists per-record notification status ahead of the backend contract; `create()` starts a record 未 (unnotified); the send endpoint is fire-and-forget `202 { recipientCount }` but the mock side-effects `{ kind: 'manual', sentAt: now }` so a client refetch surfaces 済; re-send refreshes `sentAt`; sending is System-only and rejected when 完了.

### Foundational (mock backend) — blocks the UI tasks (T047+)

- [x] T039 [NOTIF] Extend `src/app/api/_schemas/crm-maintenance.schema.ts`: add `CrmMaintenanceNotificationKindSchema = z.enum(['auto','manual'])`; add nullable `notification_kind` (`CrmMaintenanceNotificationKindSchema.nullable()`) and `notified_at` (`z.string().nullable()`) to the row `CrmMaintenanceSchema`; add optional `notified: z.boolean().optional()` to `CrmMaintenanceItemResponseSchema`; add optional `notification: z.object({ kind: CrmMaintenanceNotificationKindSchema, sentAt: z.string() }).nullable().optional()` and `notifyTargetCount: z.number().int().optional()` to `CrmMaintenanceDetailResponseSchema`; add `SendCrmMaintenanceNotificationResponseSchema = z.object({ recipientCount: z.number().int() })` (`.openapi({ title: 'SendCrmMaintenanceNotificationResponse' })`); add the matching type exports — per data-model.md "Advance notification status" + `contracts/crm-maintenance-notify.md`
- [x] T040 [NOTIF] Extend `src/app/api/_mock-db/types/crm-maintenance.type.ts`: add `CrmMaintenanceNotifyResult = CrmMaintenance | 'not_found' | 'completed_locked'`; add `notify(id: string): CrmMaintenanceNotifyResult` to the `CrmMaintenancesType` interface — depends on T039
- [x] T041 [NOTIF] Extend `src/app/api/_mock-db/seeds/crm-maintenance.seed.ts`: add `notification_kind`/`notified_at` to every seed row per data-model.md's "Notification seed values" — M-001…M-005 `kind:'auto'` with `notified_at ≈ created_at` (M-005 in_progress → shows 済), **M-006 both `null`** (planned → 未, exercises the manual send flow) — depends on T039
- [x] T042 [NOTIF] Extend `src/app/api/_mock-db/tables/crm-maintenance.table.ts`: (a) in `create()`, insert `notification_kind: null, notified_at: null` on the new row (FR-027); (b) add a `notify(id)` method to the `crmMaintenances` object — `_seed()`, find row → `'not_found'`; if `computeStatus(...) === 'completed'` → `'completed_locked'` (FR-024); else set `notification_kind = 'manual'`, `notified_at = new Date().toISOString()`, return the row; (c) add `notified: row.notified_at !== null` to `toCrmMaintenanceItemResponse`; (d) add a `notifyTargetCount: number` parameter to `toCrmMaintenanceDetailResponse` and derive `notification` in it (`row.notified_at ? { kind: row.notification_kind, sentAt: row.notified_at } : null`) — depends on T040, T041
- [x] T043 [NOTIF] Create `src/app/api/crm/maintenances/[id]/notifications/route.ts` per `contracts/crm-maintenance-notify.md`: `registerRoute()` for `POST /crm/maintenances/{id}/notifications` (path param `id`, responses 202/401/403/404/409/500, response schema `SendCrmMaintenanceNotificationResponseSchema`); handler — `getAuthUserFromRequest`, 403 unless role === `System` (FR-024), `db.crmMaintenances.notify(id)`, map `'not_found'`→404 `該当するメンテナンス情報が見つかりません。`, `'completed_locked'`→409 `完了したメンテナンスには通知できません`, else `202 { recipientCount: db.staffs.getList().length }` — depends on T042
- [x] T044 [NOTIF] Add the import line for `crm/maintenances/[id]/notifications/route.ts` to `src/app/api/_routes/index.ts` (alphabetically grouped with the sibling maintenance routes) — depends on T043
- [x] T045 [P] [NOTIF] Add `Permission.CrmMaintenanceNotify` (value `crm-maintenance.notify`) to `src/types/permission.type.ts`; no `PAGE_PERMISSIONS` entry (it gates an action, not a page) and no `ROLE_PERMISSIONS[Headquarter]` entry (System-only — System already receives every permission) — implements FR-024's server+client System-only gating
- [x] T046 [NOTIF] Update the detail-route call sites (`GET`/`PATCH` in `[id]/route.ts` and `POST` in `route.ts`) to pass the new `notifyTargetCount` arg to `toCrmMaintenanceDetailResponse` (`db.staffs.getList().length`), then run `npm run generate-openapi` && `npm run generate-api` so `src/lib/api/` gains the new fields and the `postCrmMaintenancesByIdNotificationsMutation` hook — depends on T042, T043, T044

**Checkpoint**: Backend live — `POST .../{id}/notifications` returns 202 and flips the record to 済; list/detail responses now carry `notified`/`notification`/`notifyTargetCount`. UI can begin.

### UI (consumes the generated hooks)

- [x] T047 [P] [NOTIF] Extend `src/app/(private)/crm-maintenance/_constants/crm-maintenance.constants.ts`: add `CRM_MAINTENANCE_NOTIFICATION_KIND_LABELS: Record<'auto'|'manual', string> = { auto: '登録時に自動送信', manual: '手動送信' }` and 済/未 badge class constants (success tint / muted, matching PAR057)
- [x] T048 [NOTIF] Add the 通知 column to `src/app/(private)/crm-maintenance/_components/crm-maintenance-columns.tsx` between the `status` and `allowedUserCount` columns: `accessorKey: 'notified'`, `enableSorting: false`, header "通知" (`w-[90px]`); cell renders muted "—" when `row.original.status === CrmMaintenanceStatus.COMPLETED`, else a 済 success badge (leading dot) when `row.original.notified`, else a 未 muted badge — port from crm-maintenance-list.tsx › table (L367-368, L403-417); satisfies PAR057
- [x] T049 [P] [NOTIF] Create `src/app/(private)/crm-maintenance/_components/detail/crm-maintenance-detail-notification-card.tsx`: a presentational `事前通知` Card. Props `{ status, notification, notifyTargetCount, onSend }`. Notified state → CheckCircle2 + `${KIND_LABELS[notification.kind]} ${formatDatetimeISO(notification.sentAt)}` + "対象 {notifyTargetCount}名"; not-notified → helper text "対象CRMユーザーにメンテナンス予定を通知します。". Send control = `RoleGatedButton` (`requiredPermission={Permission.CrmMaintenanceNotify}`, `denyTooltip="通知の送信は System 権限のみ可能です"`, BellRing icon, label "再通知を送信"/"通知を送信"); when `status === COMPLETED` render instead a **disabled `Button` wrapped in a `Tooltip`** with reason "完了したメンテナンスには通知できません" (no `DisabledReasonButton` exists in this repo). Read `notification ?? null` / `notifyTargetCount ?? 0` defensively — port from crm-maintenance-detail.tsx › 事前通知 card (L279-349); satisfies PAR058, PAR059
- [x] T050 [P] [NOTIF] Create `src/app/(private)/crm-maintenance/_components/detail/crm-maintenance-notify-dialog.tsx`: an `AlertDialog` confirm dialog. Props `{ open, onOpenChange, maintenance (title/startsAt/endsAt/message), notifyTargetCount, onConfirm, isPending }`. Title "メンテナンス予定を通知しますか？", body "対象CRMユーザー {N}名に、以下の内容を通知します。", preview block (タイトル / 開始日時 / 終了日時 / メンテナンスメッセージ) + footnote "※アクセスを許可されたユーザーには「メンテナンス中もアクセス可能」である旨が追記されます。", footer キャンセル + "通知を送信する" — port from crm-maintenance-detail.tsx › notify dialog (L375-422); satisfies PAR060
- [x] T051 [NOTIF] Wire notification into `src/app/(private)/crm-maintenance/_components/detail/crm-maintenance-detail-section.tsx`: consolidate the right column so the status card and the new notification card share one `w-[40%]` sticky `flex-col gap-4` container (refactor `crm-maintenance-detail-status-card.tsx` to render only its `StatusCard` inner content, moving the `w-[40%]`/sticky wrapper up into the section); add notify-dialog open state and a `useMutation({ ...postCrmMaintenancesByIdNotificationsMutation() })` whose `onSuccess` shows toast "通知を送信しました" and `invalidateQueries` for both `getCrmMaintenancesByIdOptions({ path:{ id }}).queryKey` (detail) and `getCrmMaintenancesQueryKey()` (list) so the status refetches to 済; render `<CrmMaintenanceDetailNotificationCard … onSend={() => setNotifyOpen(true)} />` + `<CrmMaintenanceNotifyDialog … onConfirm={() => notifyMutation.mutate({ path:{ id } })} />` — port from crm-maintenance-detail.tsx › right column + notify flow (L261-354, L375-422); satisfies PAR058, PAR059, PAR060
- [x] T052 [P] [NOTIF] Add a second skeleton Card (header + a few lines + a full-width button block) to the right column of `src/app/(private)/crm-maintenance/_components/detail/crm-maintenance-detail-skeleton.tsx` so the loading state matches the new two-card right column

### Polish

- [x] T053 [NOTIF] Run `tsc --noEmit` and `npm run lint`; resolve any strict-mode / lint issues introduced by the delta (Constitution I). Confirm no manual edits under `src/lib/api/` — only regenerated (Constitution II)
- [ ] T054 [NOTIF] Manually verify the "Advance notification" section of `quickstart.md` (FR-022–FR-027, SC-007): 済/未/— column states, System-only send + confirm dialog + toast, 未→済 after refetch, re-send timestamp refresh, 完了 disabled reason, Headquarter read-only (no button), and the server-side 403/409 on `POST .../notifications`; then tick PAR057–PAR060 in `checklists/parity.md`

### Phase 7 dependency graph

```
T039 → T040 → T042 → T043 → T044 ┐
   └→ T041 → T042                 ├→ T046 (regen) → [UI: T048, T049, T050, T051, T052]
T045 [P] (permission, independent)┘        T047 [P] (constants, independent of regen)
[UI complete] → T053 → T054
```

- **Parallel opportunities**: T045 (permission) and T047 (constants) are independent of the schema/regen chain. After T046 (regen), the three new UI files T049/T050/T052 are `[P]` (distinct files); T048 (columns) is also `[P]`. T051 must come last (it imports T049/T050 and refactors the status card).
- **MVP for this delta**: T039–T046 + T048 + T049 + T051 (list column + detail card + working send). T050 (confirm dialog) is required for FR-025 but the send can be smoke-tested before it; T052 skeleton is cosmetic.
