---
description: 'Task list for feature implementation'
---

# Tasks: Staff & Permission Management

**Input**: Design documents from `/specs/020-staff-permission-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, checklists/parity.md

**Context**: This updates an **existing** implementation at `src/app/(private)/staffs/` (route
`/staffs`) and `src/app/api/crm/staffs/**` — it is not a greenfield build. Every task below states
whether it modifies an existing file or creates a new one.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to US1–US5 from spec.md
- UI tasks cite their V0 source range and the `PAR###` items they satisfy, per `checklists/parity.md`

## Path Conventions

Single Next.js App Router project. Feature UI: `src/app/(private)/staffs/**`. Feature API (mock
DB): `src/app/api/crm/staffs/**`, `src/app/api/auth/me/route.ts`, `src/app/api/_schemas/`,
`src/app/api/_mock-db/`.

---

## Phase 1: Setup

**Purpose**: Confirm the existing baseline before changing it; no new tooling needed.

- [x] T001 Run `npm run dev`, `npm run lint`, and `npm run type-check`; open `/staffs`, `/staffs/[id]`, `/staffs/[id]/edit` as a baseline sanity check before any modification (no file changes)
- [x] T002 [P] Confirm `date-fns` (v4) and its `ja` locale export are resolvable from `src/app/(private)/staffs/` (`import { ja } from 'date-fns/locale'`); no `package.json` change expected per Constitution Principle V

**Checkpoint**: Baseline confirmed working; no regressions to compare against later.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, mock-DB, and auth changes every user story depends on. No user-story UI/API
work should start before this phase is complete.

**⚠️ CRITICAL**: Phases 3–7 all read/write the fields and entities added here.

### Schemas

- [x] T003 Extend `StaffStatusSchema` to `z.enum(['active', 'inactive', 'invited'])` in `src/app/api/_schemas/staff.schema.ts`
- [x] T004 In `src/app/api/_schemas/staff.schema.ts`: add `invited_at: z.string().nullable()`, `managed_store_ids: z.array(z.string()).optional()`, `deleted_at: z.string().nullable().optional()` to `StaffListItemSchema` and `StaffDetailSchema`; change `last_login` to `z.string().nullable()` on both (depends on T003)
- [x] T005 [P] Add `StaffPermissionHistoryEntrySchema` (`id`, `staff_id`, `changed_at`, `operator_name`, `operator_position`, `change_description`) plus `GetStaffPermissionHistoryResponseSchema` (paginated) to `src/app/api/_schemas/staff.schema.ts`, per data-model.md
- [x] T006 [P] Add `DeactivateStaffRequestSchema` (`{ reason?: string }`), `DeactivateStaffResponseSchema`, `ResendInviteResponseSchema`, `MagicLinkResponseSchema` to `src/app/api/_schemas/staff.schema.ts`, per contracts/api-contracts.md
- [x] T007 [P] Change `DeleteStaffRequestSchema.delete_reason` from `z.string().min(1)` to `z.string().optional()` in `src/app/api/_schemas/staff.schema.ts`
- [x] T008 Add `CreateStaffsRequestSchema` (`{ staff: Array<{ last_name, first_name, email }>, role, position_id?, staff_linkage?, note? }`) and `CreateStaffsResponseSchema` (`{ message, created_count, staffs }`) to `src/app/api/_schemas/staff.schema.ts` (depends on T004)
- [x] T009 [P] Extend `MeResponseSchema` in `src/app/api/_schemas/auth.schema.ts` with `staff_id: z.string()` and `managed_store_ids: z.array(z.string()).optional()`

### Mock DB

- [x] T010 In `src/app/api/_mock-db/tables/staff.table.ts`: extend seed generation to populate `invited_at`/`deleted_at` (both `null` by default), `managed_store_ids` (populated for `role: 'manager'` seed rows only), and re-seed a few rows with `status: 'invited'` (`invited_at` set, `last_login: null`) so manual verification has invited-status data to check against (depends on T004)
- [x] T011 In `src/app/api/_mock-db/tables/staff.table.ts`: add an in-memory `staff_permission_history` table with `create(entry)` and `getByStaffId(staff_id)` (newest first) (depends on T005)
- [x] T012 In `src/app/api/_mock-db/types/staffs.type.ts`: add method signatures `deactivate(id, reason?): StaffDetail | undefined`, `resendInvite(id): StaffDetail | undefined`, `softDelete(id): boolean`, `recordPermissionChange(staff_id, description, operator): void`, `getPermissionHistory(staff_id): StaffPermissionHistoryEntry[]`; update `create()` to accept the new bulk-create shape and default new rows to `status: 'invited'` (depends on T008, T010, T011)
- [x] T013 Implement the new methods from T012 in the `staffs` table object in `src/app/api/_mock-db/tables/staff.table.ts`; `getList()`/`getById()`/`getDetailById()` must exclude rows where `deleted_at` is set (depends on T012)
- [x] T014 In `src/app/api/auth/me/route.ts`: compute and return `staff_id` (the caller's own `StaffListItem.id`) and, when `role === 'manager'`, `managed_store_ids` (looked up from the caller's own staff record) (depends on T009, T013)

**Checkpoint**: Schema, mock-DB, and `/auth/me` are ready. User-story phases can now begin.

---

## Phase 3: User Story 1 - Browse and search staff accounts (Priority: P1) 🎯 MVP

**Goal**: A correctly role-scoped, searchable, filterable staff list with the new 3-way status and
relative last-login display.

**Independent Test**: Per spec.md US1 Verification — log in as each role, confirm visible rows
match scope; apply search/filters and confirm narrowing; confirm empty states and invited-row
treatment.

### API

- [x] T015 [US1] In `src/app/api/crm/staffs/route.ts`: add server-side scoping to the `GET` handler — headquarters/system see all; manager sees rows where `staff_linkage.store_id ∈ caller.managed_store_ids`; staff/trainer/observer see only `id === caller.staff_id` (reads caller from the existing auth/session lookup used elsewhere in the route); extend `GetStaffsQuerySchema.status` handling to accept `'invited'`; `sort_by: 'last_login'` sorts `null` values last regardless of direction (depends on T003, T014)

### UI — List page

- [x] T016 [P] [US1] Add a small relative-time utility in `src/app/(private)/staffs/_utils/format-relative-time.util.ts` using `date-fns`'s `formatDistanceToNow(date, { addSuffix: true, locale: ja })`, returning `"未ログイン"`-equivalent handling delegated to the caller for `null` input (new file)
- [x] T017 [US1] In `src/app/(private)/staffs/page.tsx`: role-gate the "スタッフを追加" button with `RoleGatedButton allowedRoles={[UserRole.Headquarter, UserRole.System]}`, navigating to `/staffs/create` — port from `.cache/fitness-crm-ui/src/pages/staff-list.tsx` › page header (L353-L366); satisfies PAR001, PAR002 (depends on T014 for role context)
- [x] T018 [US1] In `src/app/(private)/staffs/_components/staffs-filters.tsx`: add "招待中" to the status filter options, and verify/align the search input, filter-toggle button, role/position/store selects, and the `FilterResultBanner` against staff-list.tsx's search+filter toolbar (L376-L465) and filter-result banner (L470-L476) — port from staff-list.tsx › toolbar & filters; satisfies PAR003, PAR004, PAR005, PAR006, PAR007, PAR008, PAR009
- [x] T019 [US1] In `src/app/(private)/staffs/_components/staffs-table-columns.tsx`: update the status column to render 有効/無効/招待中 badges with success/muted/info colors respectively — port from staff-list.tsx › `getStatusBadge` (L124-L134) and status cell (L555-L557); satisfies PAR030
- [x] T020 [US1] In `src/app/(private)/staffs/_components/staffs-table-columns.tsx`: update the name column to show an italic muted "未登録" when `status === 'invited'`, otherwise the name — port from staff-list.tsx › name cell (L528-L532); satisfies PAR024
- [x] T021 [US1] In `src/app/(private)/staffs/_components/staffs-table-columns.tsx`: update the last-login column to show "未ログイン" + invitation date for invited rows, or the relative time (via T016's util) with the full ISO datetime as a hover title for others — port from staff-list.tsx › last-login cell (L558-L571); satisfies PAR031 (depends on T016)
- [x] T022 [US1] In `src/app/(private)/staffs/_components/staffs-table-columns.tsx`: add/confirm columns for スタッフID, 氏名, メールアドレス, ロール (colored badge), 職位 (clickable badge that sets the position filter), 所属店舗 (hidden when a single-store context is active), FC企業 (shows "—" when unset) — port from staff-list.tsx › table header/body (L484-L554); satisfies PAR010, PAR011, PAR012, PAR013, PAR014, PAR015, PAR016, PAR023, PAR025, PAR026, PAR027, PAR028, PAR029
- [x] T023 [US1] In `src/app/(private)/staffs/_components/staffs-table-columns.tsx` (or the shared sortable-header component it uses): add the sort-direction tooltip text toggle ("クリックで降順ソート"/"クリックで昇順ソート") to the ID/氏名/職位/ステータス/最終ログイン sortable headers — port from staff-list.tsx › `renderSortableHead` (L306-L336); satisfies PAR017, PAR018, PAR019, PAR020
- [x] T024 [US1] In `src/app/(private)/staffs/page.tsx`: wire the two `Empty` variants — "filtered" (search/filter active, zero results, with a clear-filters button) and "empty" (no staff at all, no action) — port from staff-list.tsx › empty-state block (L510-L523); satisfies PAR021, PAR022
- [x] T025 [US1] Row click anywhere outside action cells navigates to `/staffs/[id]` — port from staff-list.tsx L526; satisfies PAR032 (verify existing `page.tsx` row-click handler covers this; adjust if action cells don't yet stop propagation)
- [x] T026 [US1] In `src/app/(private)/staffs/page.tsx` (or its pagination sub-component): confirm/align the footer count text ("全 {total} 件 / {pages} ページ / {start}-{end} を表示"), Previous/numbered/Next controls with ellipsis, and a 25/50/100/200件 page-size selector — port from staff-list.tsx › pagination footer (L687-L741); satisfies PAR039, PAR040, PAR041

**Checkpoint**: List page is independently functional and testable — role-scoped, searchable,
filterable, with correct invited-status and relative-time treatment.

---

## Phase 4: User Story 2 - Register new staff accounts (Priority: P1)

**Goal**: A dedicated bulk-creation page replacing the old invite modal, matching the reviewed
multi-row form.

**Independent Test**: Per spec.md US2 Verification — submit with several people at once, with a
duplicate email, and with missing required fields; confirm correct responses.

### API

- [x] T027 [US2] Implement `POST /crm/staffs` in `src/app/api/crm/staffs/route.ts` (new handler alongside the existing `GET`): validate every row has `last_name`/`first_name`/`email`, check email uniqueness against existing accounts and within the batch (422 with per-row detail on failure), create N rows with `status: 'invited'`, `invited_at: now()`, register the route via `registerRoute(...)` per the existing convention seen in the same file — satisfies FR-007–FR-011 (depends on T008, T012, T013)
- [x] T028 [US2] Grep the codebase for other callers of `POST /crm/staffs/invite` / `invite-staff-modal.tsx`; if none exist outside `staffs/`, delete `src/app/api/crm/staffs/invite/route.ts` and `src/app/(private)/staffs/_components/invite-staff-modal.tsx`; otherwise leave them and note the retained duplication in a code comment (depends on T027)

### UI — Create page

- [x] T029 [US2] Create `src/app/(private)/staffs/create/page.tsx` (new route, `"use client"`) implementing the bulk-registration form shell: breadcrumb back-link to `/staffs` guarded by the unsaved-changes hook from T035, and page title "スタッフ新規登録" — port from `.cache/fitness-crm-ui/src/pages/staff-form.tsx` › page shell (L418-L434); satisfies PAR066, PAR067
- [x] T030 [US2] In `src/app/(private)/staffs/create/page.tsx`: implement the 基本情報 card with a live "{N}名入力中" badge and the bulk-row table (姓*/名*/メールアドレス\*/remove-row column, remove disabled when only one row remains), plus an "スタッフを追加" button appending a new blank row — port from staff-form.tsx › create-mode table (L440-L527); satisfies PAR068, PAR069, PAR070, PAR073
- [x] T031 [US2] In `src/app/(private)/staffs/create/page.tsx`: implement inline duplicate-email detection (against existing accounts and within the batch) with the two distinct warning messages, and multi-line email paste-to-split-rows behavior — port from staff-form.tsx › `bulkEmailDuplicateStatus` and `handleBulkEmailPaste` (L300-L373, L492-L503); satisfies PAR071, PAR072, PAR074
- [x] T032 [US2] In `src/app/(private)/staffs/create/page.tsx`: implement the shared 権限設定 card (required ロール select, 職位 combobox disabled until a role is chosen) and 所属設定 card (パターンA/B radio, conditional 所属店舗/所属FC企業 selects, FC managed-stores preview) applied to the whole batch — port from staff-form.tsx › create-mode 権限設定/所属設定 (L529-L640); satisfies PAR075, PAR076, PAR077, PAR078, PAR079, PAR080
- [x] T033 [US2] In `src/app/(private)/staffs/create/page.tsx`: implement the optional 備考 Textarea card and the initial-password info alert — port from staff-form.tsx › create-mode 備考/alert (L642-L663); satisfies PAR081, PAR082
- [x] T034 [US2] In `src/app/(private)/staffs/create/page.tsx`: implement the footer (inline validation-error text, キャンセル with discard-guard, "{N}名を登録する" submit button disabled at zero filled rows) wired to `POST /crm/staffs` (T027) — port from staff-form.tsx › create-mode footer (L658-L679); satisfies PAR083, PAR084 (depends on T027, T029-T033)
- [x] T035 [US2] [P] Create `src/app/(private)/staffs/_hooks/use-staffs-unsaved-changes.hook.ts` (new file), copying the existing per-feature pattern from `src/app/(private)/lesson-schedules/create/_hooks/use-unsaved-changes.hook.ts` per research.md #10 — used by both create (T029) and edit (Phase 5)
- [x] T036 [US2] In `src/app/(private)/staffs/create/page.tsx` (and wherever the discard dialog renders): implement the discard-changes confirmation dialog ("変更を破棄しますか？" / "編集を続ける" / "破棄する") using the hook from T035 — port from staff-form.tsx › discard dialog (L937-L951); satisfies PAR097 (depends on T035)

**Checkpoint**: List (US1) and creation (US2) both work independently — the two P1 stories
together form the MVP.

---

## Phase 5: User Story 3 - Edit staff details, role, and affiliation (Priority: P2)

**Goal**: Role-gated editing of an existing staff account, including a confirmed, audited role
change and store/FC affiliation switching.

**Independent Test**: Per spec.md US3 Verification — as Headquarter, change a role and confirm the
dialog + history entry; as Manager, confirm edit is allowed/blocked based on managed-store scope.

### API

- [x] T037 [US3] In `src/app/api/crm/staffs/[id]/route.ts`: add server-side access rules to `GET` (403 unless caller is headquarters/system, the target themself, or a manager whose `managed_store_ids` includes the target's `staff_linkage.store_id`) and to `PATCH` (`role` field only accepted from headquarters/system callers; non-role fields follow the same access rule, with name/email/note additionally allowed for the account owner) — satisfies FR-012, FR-013, FR-014 (depends on T014)
- [x] T038 [US3] In `src/app/api/crm/staffs/[id]/route.ts`: in the `PATCH` handler, diff the incoming `role`/`position_id`/`staff_linkage` against the stored record before applying the update, and call `recordPermissionChange(...)` (from T012/T013) when any differ, before returning — satisfies FR-021 (depends on T013, T037)

### UI — Detail page (non-history parts)

- [x] T039 [US3] In `src/app/(private)/staffs/[id]/page.tsx` and `_components/staff-detail-header.tsx`: implement the breadcrumb back-link, title (full name), status badge (colored dot + label), and role-gated "編集" button (manager-edit rule with deny tooltip) — port from `.cache/fitness-crm-ui/src/pages/staff-detail.tsx` › header (L149-L158, L182-L191); satisfies PAR042, PAR043, PAR044, PAR047 (depends on T037)
- [x] T040 [US3] In `src/app/(private)/staffs/[id]/page.tsx`: confirm/implement the `Tabs` shell ("基本情報" / "変更履歴") — port from staff-detail.tsx › Tabs (L198-L202); satisfies PAR048 (変更履歴 tab **content** is Phase 7, not this task)
- [x] T041 [US3] [P] In `_components/staff-personal-info-card.tsx`: render スタッフID, 氏名, メールアドレス（ログインID）fields — port from staff-detail.tsx › 基本情報 card (L209-L229); satisfies PAR049, PAR050, PAR051
- [x] T042 [US3] [P] In `_components/staff-permission-card.tsx`: render ロール badge, 職位 badge, 所属 field for both store and FC patterns (with managed-stores badges for FC), and the "{職位}の権限を確認" link — port from staff-detail.tsx › 所属・権限 card (L231-L282); satisfies PAR052, PAR053, PAR054, PAR055, PAR056
- [x] T043 [US3] In `src/app/(private)/staffs/[id]/page.tsx`: render the 備考 card only when a note is present — port from staff-detail.tsx L285-L294; satisfies PAR057

### UI — Edit page

- [x] T044 [US3] In `src/app/(private)/staffs/[id]/edit/page.tsx`: set the page title "スタッフ編集"; in `_components/personal-info-section.tsx`: pre-fill and validate 氏名（姓）/氏名（名）required inputs, and メールアドレス（ログインID）with a "重複確認" button and its success/error result messages — port from `.cache/fitness-crm-ui/src/pages/staff-form.tsx` › page shell (L239, L429) and edit-mode 基本情報 (L690-L741); satisfies PAR085, PAR086, PAR087, PAR088
- [x] T045 [US3] In `_components/permission-settings-section.tsx`: implement the enabled ロール select (Headquarter/System) vs. the disabled-with-deny-tooltip variant for other roles, and the pre-filled 職位 combobox — port from staff-form.tsx › edit-mode 権限設定 (L753-L796); satisfies PAR089, PAR090, PAR091 (depends on T037 for role-gating source of truth)
- [x] T046 [US3] Implement the 所属設定 card (same パターン radio / 所属店舗 / 所属FC企業 / managed-stores preview as create mode, pre-filled) in the edit page's affiliation section — port from staff-form.tsx › edit-mode 所属設定 (L808-L876); satisfies PAR092
- [x] T047 [US3] [P] Pre-fill the 備考 Textarea in the edit page — port from staff-form.tsx L878-L893; satisfies PAR093
- [x] T048 [US3] Implement the edit page footer (inline "未入力の項目があります" error, キャンセル discard-guarded via T035's hook, 保存する) — port from staff-form.tsx › edit-mode footer (L895-L901); satisfies PAR094, PAR095 (depends on T035)
- [x] T049 [US3] Implement the role-change confirmation dialog (shown only when role actually changed: old→new role, next-login-effective notice, permission-history notice) wired to `PATCH /crm/staffs/{id}` (T037/T038) — port from staff-form.tsx › role-change dialog (L909-L934); satisfies PAR096 (depends on T038, T045)
- [x] T050 [US3] Add the edit-menu entry point: in `src/app/(private)/staffs/_components/staffs-table-columns.tsx` (list row menu), add the role-gated "編集" item (Pencil icon) navigating to `/staffs/[id]/edit` — port from staff-list.tsx › row menu edit item (L578-L583); satisfies PAR033

**Checkpoint**: US1–US3 all work independently — browsing, creation, and editing (with audited
role changes) are complete.

---

## Phase 6: User Story 4 - Deactivate or delete a staff account (Priority: P2)

**Goal**: Distinct, explicitly-confirmed deactivate and delete actions with correct retention
semantics.

**Independent Test**: Per spec.md US4 Verification — deactivate one account, delete another;
confirm dialogs, status/visibility changes, and retained history.

### API

- [x] T051 [US4] Create `src/app/api/crm/staffs/[id]/deactivate/route.ts` (new): `POST` handler validating `DeactivateStaffRequestSchema`, headquarters/system-only, calls `deactivate(id, reason)` (T012/T013) which sets `status: 'inactive'` and appends a permission-history entry, registers the route via `registerRoute(...)` — satisfies FR-018 (depends on T006, T012, T013)
- [x] T052 [US4] In `src/app/api/crm/staffs/[id]/route.ts`: wire the `DELETE` handler to the now-optional `delete_reason` (T007) and to `softDelete(id)` (T012/T013), excluding the record from subsequent `GET` list/detail results while retaining it for permission-history joins — satisfies FR-019 (depends on T007, T013)

### UI

- [x] T053 [US4] In `src/app/(private)/staffs/_components/staffs-table-columns.tsx` (row menu): add role-gated "無効化" (Ban icon, warning) and "削除" (Trash2 icon, destructive) menu items opening their respective confirmation dialogs — port from `.cache/fitness-crm-ui/src/pages/staff-list.tsx` › row menu (L601-L616); satisfies PAR035, PAR036
- [x] T054 [US4] In `src/app/(private)/staffs/page.tsx`: implement the list-page delete confirmation dialog (title, deactivation-recommended description, キャンセル/削除する) and deactivate confirmation dialog (title, description, キャンセル/無効化する), wired to T051/T052 — port from staff-list.tsx › dialogs (L627-L684); satisfies PAR037, PAR038
- [x] T055 [US4] In `_components/staff-detail-header.tsx`: add the role-gated "削除" header action (Trash2, destructive) opening the detail-page delete dialog — port from `.cache/fitness-crm-ui/src/pages/staff-detail.tsx` › header delete action (L173-L181); satisfies PAR046
- [x] T056 [US4] In `_components/staff-status-card.tsx`: render tone/icon/label/meta lines ("作成:"/"更新:") and the role-gated "無効化する" action button opening the disable dialog — port from staff-detail.tsx › StatusCard (L299-L315); satisfies PAR058, PAR059
- [x] T057 [US4] In `src/app/(private)/staffs/[id]/page.tsx`: implement the detail-page disable dialog (optional 無効化理由 textarea) and delete dialog, wired to T051/T052 — port from staff-detail.tsx › dialogs (L353-L386); satisfies PAR063, PAR064

**Checkpoint**: US1–US4 independently functional — deactivate/delete are audited, confirmed, and
correctly scoped.

---

## Phase 7: User Story 5 - Track permission history and reissue access (Priority: P3)

**Goal**: Surface the permission change history, and let authorized users resend invitations or
issue magic links.

**Independent Test**: Per spec.md US5 Verification — view change-history entries; resend an
invite; issue a magic link for self and for another account (as Headquarter).

### API

- [x] T058 [US5] Create `src/app/api/crm/staffs/[id]/resend-invite/route.ts` (new): `POST` handler, 409 unless `status === 'invited'`, headquarters/system-only, refreshes `invited_at` via a new mock-DB method, registers the route — satisfies FR-006 (depends on T012, T013)
- [x] T059 [US5] Create `src/app/api/crm/staffs/[id]/magic-link/route.ts` (new): `POST` handler, authorized for headquarters/system or `caller.staff_id === id`, returns `{ message, sent_to }` with no persisted state change, registers the route — satisfies FR-020 (depends on T014)
- [x] T060 [US5] Create `src/app/api/crm/staffs/[id]/permission-history/route.ts` (new): `GET` handler with pagination, same read-access rule as `GET /crm/staffs/{id}`, returns entries newest-first via `getPermissionHistory(id)` (T012/T013), registers the route — satisfies FR-021 (depends on T013, T037)

### UI

- [x] T061 [US5] In `_components/permission-history-tab.tsx` (new file) and `src/app/(private)/staffs/[id]/page.tsx`'s 変更履歴 `TabsContent`: render the 日時/操作者/変更内容 table fed by T060, plus the "全{N}件" footer count — port from `.cache/fitness-crm-ui/src/pages/staff-detail.tsx` › history tab (L321-L346); satisfies PAR060, PAR061, PAR062 (depends on T060, T040)
- [x] T062 [US5] In `src/app/(private)/staffs/_components/staffs-table-columns.tsx` (row menu): add the role-gated "再招待" item (RefreshCw icon, info color), shown only when `status === 'invited'`, calling T058 and showing a success toast naming the email — port from staff-list.tsx › row menu (L584-L599); satisfies PAR034
- [x] T063 [US5] In `_components/staff-detail-header.tsx`: add the "CRMのログイン用URLを送る" (Link2 icon) header action, role-gated to allow any role for the caller's own account and headquarters/system otherwise, calling T059 — port from staff-detail.tsx › header magic-link action (L161-L171); satisfies PAR045
- [x] T064 [US5] In `src/app/(private)/staffs/[id]/page.tsx`: implement the magic-link-sent confirmation dialog (title, name/email + 1-hour expiry copy, single 閉じる action) — port from staff-detail.tsx › magic-link dialog (L389-L401); satisfies PAR065 (depends on T063)

**Checkpoint**: All five user stories independently functional — the full 020-staff-permission-management scope is complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Repo-wide consistency and the manual verification pass (this project has no automated tests).

- [x] T065 Run `npm run generate-openapi` then `npm run generate-client` to regenerate `src/lib/api/` from the updated Zod schemas (per Constitution Principle II) — do not hand-edit generated files (depends on all API tasks: T015, T027, T037, T038, T051, T052, T058, T059, T060)
- [x] T066 [P] Update `src/app/(private)/staffs/_hooks/use-staffs-filters.ts` and `_contexts/staffs-filters-context.tsx` if the new `invited` status value or `managed_store_ids` scoping requires filter-state shape changes (verify against T015, T018)
- [x] T067 Delete or update `src/app/(private)/staffs/_schemas/invite-staff.schema.ts` to match whichever outcome T028 produced (removed vs. retained invite endpoint)
- [x] T068 Run `npm run lint` and `npm run type-check`; fix all violations across changed files
- [x] T069 Execute every checklist item in `specs/020-staff-permission-management/quickstart.md` manually against `npm run dev`, switching simulated users across all 6 roles as instructed; fix any discrepancy found
- [x] T070 Cross-check `specs/020-staff-permission-management/checklists/parity.md` — confirm every `PAR001`–`PAR097` item is now checked off, and that no item was missed by the tasks above

---

## Phase 9: Real-API Edit Screen Alignment (Addendum — 2026-08-24)

**Context**: Branch `feat/staff-implement-api` migrated `staffs/[id]/edit/` from the mock-DB API to
the real `hey-api`-generated client (`adminStaffControllerUpdateMutation`, `PositionSelectInput`,
`StoreSelectInput`, etc.) — that swap is already done in the working tree, no task needed for it.
While re-verifying the screen against Y-01, `Y-01_権限設計v2_3.md`, and the current
`staff-form.tsx` prototype (spec.md's "Known Implementation Gaps", 2026-08-24), three gaps were
found and planned in plan.md's addendum / research.md items 13–15. This phase implements that
plan.

**Goal**: The edit form only exposes fields Y-01/the prototype actually specify and the real API
can persist (or clearly marks the one exception, email, as pending); FR-013's manager-scope edit
restriction is enforced on the edit route itself, not only as a disabled button elsewhere.

**Independent Test**: As Headquarter, open a staff account's edit form — confirm the furigana,
gender, date-of-birth, address, login-method/social-ID fields and the 追加権限/編集可能情報
blocks are gone, and that name/phone/role/position/affiliation/note still save correctly. Confirm
the email field is visibly disabled with an explanatory tooltip. As Manager, attempt to open the
edit URL directly for a non-"Staff"-role account or one outside your managed stores — confirm you
get an access-denied state rather than a loaded, submittable form.

- [x] T071 [US3] In `src/app/(private)/staffs/[id]/edit/_schemas/staff-edit-form.schema.ts`: remove `last_name_kana`, `first_name_kana`, `gender`, `birthday`, `postal_code`, `prefecture`, `city`, `address`, `building`, `login_method`, `social_id`, `billing_correction`, `refund_request`, `transfer_request`, `editable_scopes` (and the now-unused `staffEditableScopeSchema`); keep `last_name`/`first_name`/`email`/`phone`/`role`/`position_id`/`affiliation_type`/`affiliation_store_id`/`affiliation_fc_company_id`/`note` — satisfies research.md #13/#14
- [x] T072 [P] [US3] In `_components/personal-info-section.tsx`: delete the furigana (`last_name_kana`/`first_name_kana`), `gender`, `birthday`, and address (`postal_code`/`prefecture`/`city`/`address`/`building`) `FormField` blocks and their now-dead imports (`GENDER_OPTIONS`, `PREFECTURES`, `DatePicker` if no longer used) — satisfies research.md #13 (depends on T071)
- [x] T073 [US3] In `_components/personal-info-section.tsx`: make the email `Input` `disabled` and wrap it (and the "重複確認" button, also disabled) in the same `Tooltip`/`TooltipContent` pattern already used for the role field in `permission-settings-section.tsx`, explaining that email changes aren't saved yet; point the duplicate-check query at the real staff-list endpoint already used elsewhere on this page instead of the mock `getCrmStaffsOptions` — satisfies research.md #14; intentionally diverges from parity.md PAR087/PAR088's fully-interactive expectation (documented deviation, not a missed item) (depends on T071) — **superseded 2026-11-04 (Y-01 - Bug No.16)**: email is now editable for non-Google staff, 重複確認 calls `email-availability` (spec.md › "Email change on the edit screen")
- [x] T074 [US3] Delete `src/app/(private)/staffs/[id]/edit/_components/login-settings-section.tsx` and remove its import/usage (`<LoginSettingsSection />`) from `src/app/(private)/staffs/[id]/edit/page.tsx` — satisfies research.md #13 (depends on T071)
- [x] T075 [US3] In `_components/permission-settings-section.tsx`: delete the "追加権限" checkbox group (`billing_correction`/`refund_request`/`transfer_request`) and the "編集可能情報" `editable_scopes` table together with its `useFieldArray`/`append`/`remove` wiring and the now-unused local `STORES` array — satisfies research.md #13 (depends on T071)
- [x] T076 [P] [US3] Create `src/app/(private)/staffs/_utils/can-edit-staff.util.ts` exporting `canEditStaffAccount(user, staff)`, replicating the existing `isManagerEditAllowed` logic in `staff-detail-header.tsx` (Headquarter/System → allowed; Manager → allowed only if the target's role is "staff" and its store is in the user's `managedStoreIds`; every other role → not allowed) — satisfies research.md #15
- [x] T077 [US3] In `_components/staff-detail-header.tsx`: replace the inline `isManagerEditAllowed` check with `canEditStaffAccount` from T076 (no behavior change — pure de-duplication) — satisfies research.md #15 (depends on T076)
- [x] T078 [US3] In `src/app/(private)/staffs/_components/staffs-table-columns.tsx`: gate the "編集" row action with `canEditStaffAccount` from T076, matching how other role-gated row actions in this table are already disabled/hidden — satisfies research.md #15 (depends on T076). Found during implementation: the row action was already wrapped in `RoleGatedMenuItem`, but with a static `allowedRoles=[HQ, System]` that excluded Manager entirely — stricter than FR-013, and inconsistent with the detail page's conditional allowance. Replaced with a per-row `editAllowedRoles` computed via `canEditStaffAccount`, matching the detail-header pattern.
- [x] T079 [US3] In `src/app/(private)/staffs/[id]/edit/page.tsx` (`StaffEditDataProvider`): after `staff` loads, check `canEditStaffAccount` from T076 against the current user; render an access-denied message instead of `StaffEditFormContent` when it fails — closes the FR-013 direct-URL gap (depends on T076)
- [x] T080 [US3] Run `npm run lint` and `npm run type-check`; fix any fallout from the field/component removals (unused imports, orphaned types) — depends on T071, T072, T074, T075. Both clean (`npm run lint`, `npm run type-check`).
- [~] T081 [US3] Manually re-verify the edit screen per spec.md's User Story 3 acceptance scenarios and the Independent Test above; re-run the relevant rows of `tests/cases/TC -【Fitness CRM】- [Y-01][03][スタッフ編集].md` that cover the removed/changed fields — depends on T072, T073, T074, T075, T077, T078, T079. **Partially done**: confirmed via `npm run dev` that `/staffs/{id}/edit` renders without a server crash and correctly redirects unauthenticated requests to `/login` (307). Full role-based live verification (HQ editing, Manager access-denied on out-of-scope direct URL, disabled-email tooltip) was **not performed** — this session has no way to authenticate against the real Cognito-backed backend (`NEXT_PUBLIC_REAL_API_URL`) non-interactively. Needs a follow-up interactive pass (e.g. via `execute-testcases`) before this task is fully closed.

**Checkpoint**: The edit screen matches Y-01/the current prototype field-for-field (with email's
documented exception), and FR-013 is enforced at the point of entry, not just as a UI hint.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (schema/mock-DB/auth changes every story reads or writes)
- **User Stories (Phase 3–7)**: All depend on Foundational completion
  - US1 (Phase 3) and US2 (Phase 4) have no dependency on each other — both P1, can run in parallel
  - US3 (Phase 5) depends on US1's list page existing for its row-menu edit-entry task (T050) and reuses US2's unsaved-changes hook (T035) — otherwise independent
  - US4 (Phase 6) reuses US1's row-menu component (extends the same file T053/T019/T020/T021/T022/T023 already touch) and US3's detail-header component (T039) — sequence after US1/US3, not parallel with them on those specific files
  - US5 (Phase 7) reuses US1's row-menu component and US3's detail-header/tabs shell — sequence after US1/US3 for those files
- **Polish (Phase 8)**: Depends on all desired user stories being complete
- **Real-API Edit Screen Alignment (Phase 9)**: Depends on Phase 5 (US3) and the real-API migration already underway on `feat/staff-implement-api`; independent of Phases 6–8

### Shared-File Sequencing Note

`staffs-table-columns.tsx` (row menu) and `staff-detail-header.tsx` are each touched by multiple
stories (US1 builds the base; US3, US4, US5 each add one menu item / header action). These
additions are small and additive — implement them in phase order (US1 → US3 → US4 → US5) rather
than in parallel to avoid merge conflicts within the same file.

### Parallel Opportunities

- T003–T009 (schema tasks) marked [P] can mostly run in parallel once T003/T004 land (they touch the same file but different, non-overlapping schema blocks — coordinate if working with multiple people)
- Phase 3 (US1) and Phase 4 (US2) can be built by two people simultaneously once Phase 2 is done — they touch almost entirely disjoint files (`page.tsx`/`staffs-table-columns.tsx`/filters vs. `create/page.tsx`)
- Within Phase 3: T016 (utility) is independent of T017–T026 and can run in parallel
- Within Phase 4: T035 (unsaved-changes hook) is independent of T029–T034 and can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
Task: "Add StaffPermissionHistoryEntrySchema in src/app/api/_schemas/staff.schema.ts"      # T005
Task: "Add Deactivate/ResendInvite/MagicLink schemas in src/app/api/_schemas/staff.schema.ts" # T006
Task: "Make delete_reason optional in src/app/api/_schemas/staff.schema.ts"                # T007
Task: "Extend MeResponseSchema in src/app/api/_schemas/auth.schema.ts"                     # T009
```

## Parallel Example: User Story 1 vs. User Story 2

```bash
# Developer A — Phase 3 (US1, list page)
Task: "Add relative-time utility in src/app/(private)/staffs/_utils/format-relative-time.util.ts" # T016
Task: "Role-gate the add-staff button in src/app/(private)/staffs/page.tsx"                        # T017

# Developer B — Phase 4 (US2, create page), concurrently
Task: "Create src/app/(private)/staffs/create/page.tsx page shell"                                 # T029
Task: "Create src/app/(private)/staffs/_hooks/use-staffs-unsaved-changes.hook.ts"                  # T035
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 — both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks everything)
3. Complete Phase 3 (US1) and Phase 4 (US2), in parallel if staffed
4. **STOP and VALIDATE**: run the US1/US2 sections of quickstart.md independently
5. Deploy/demo if ready — a headquarters user can browse staff and onboard new ones

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 + US2 → validate → MVP demo (browse + create)
3. US3 → validate → editing and role changes now audited and role-gated
4. US4 → validate → deactivate/delete lifecycle complete
5. US5 → validate → permission history + resend/magic-link complete
6. Polish (Phase 8) → full parity + lint/type-check clean

### Parallel Team Strategy

1. Team completes Setup + Foundational together (schema/mock-DB changes are the critical path)
2. Once Foundational is done: Developer A takes US1, Developer B takes US2 (near-zero file overlap)
3. After US1 lands, Developer C can start US3 (needs US1's row-menu file and US2's unsaved-changes hook)
4. US4 and US5 follow US3, each adding one row-menu item / header action — coordinate on
   `staffs-table-columns.tsx` and `staff-detail-header.tsx` to avoid clobbering each other's edits

---

## Notes

- [P] tasks = different files (or clearly non-overlapping regions), no dependencies
- [Story] label maps each task to US1–US5 for traceability back to spec.md
- Every `PAR###` parity item (1–97) is claimed by exactly one task above; T070 is the final cross-check against `checklists/parity.md`
- This project has **no automated tests** (Constitution: No Testing Policy) — `quickstart.md` (T069) is the acceptance mechanism, not a test suite
- T071–T081 (Phase 9) are a later addendum, not part of the original PAR001–097 scope — they remove fields that were never in the reviewed prototype and were therefore never assigned a PAR id; T073 is a deliberate, documented departure from PAR087/PAR088's fully-interactive expectation (research.md #14), not an unclaimed item
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
- Avoid: vague tasks, unnecessary same-file conflicts, cross-story dependencies that break independent testability
