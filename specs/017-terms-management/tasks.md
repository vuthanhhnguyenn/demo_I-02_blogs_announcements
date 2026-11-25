# Tasks: Y-04 Terms Document Master Management

**Input**: Design documents from `/specs/017-terms-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, checklists/parity.md

**Organization**: Tasks are grouped by user story (from spec.md, in priority order: US1 P1, US2 P1, US3 P2, US4 P2, US5 P2, US6 P2) to enable independent implementation and testing of each story.

**No test tasks**: Per `.specify/memory/constitution.md`'s absolute "No Testing Policy," this list contains zero test-writing tasks (no unit/integration/e2e/contract tests). Verification is manual, against `quickstart.md`'s checklist, plus `tsc --noEmit` and ESLint.

**Backend-in-Foundational**: All six spec.md user stories are UI-shaped (browse, view, register, edit, version, delete), but the two backend route files each serve multiple stories on shared HTTP methods (`route.ts` = list GET **and** create POST; `[id]/route.ts` = detail GET **and** update PATCH **and** delete DELETE). Splitting a single file's methods across phases would force repeated edits to the same file from different "independent" stories. Per plan.md's Implementation Order Note, the full schema/table/routes/codegen are therefore built once in Foundational (thin, contract-driven per `contracts/*.md`), and every user-story phase is pure UI consuming the already-live, already-typed endpoints.

**Shared form consolidation**: `terms-form.tsx` (create/edit/new-version) is ~90% identical across its three modes (locked fields, PDF upload, extraction preview, validation). Following the precedent set by `016-app-maintenance-mgmt`'s `AppMaintenanceForm`, the full mode-aware component (all three modes' field-locking, prefill, and warning-banner logic) is built once in US3 — the first story that needs a form — and claims every `terms-form.tsx` parity item (PAR041–PAR066) there. US4 and US5 then only wire page-level data-fetching/prefill and mode selection into that already-complete component; this is a deliberate, minimal cross-story touch, not scope creep.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 / US5 / US6, mapping to spec.md's user stories
- Every task includes an exact file path
- UI tasks cite their V0 source range and the `PAR###` parity items they satisfy (from `checklists/parity.md`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the feature's directory structure. No new npm dependencies.

- [x] T001 Create `src/app/(private)/terms/_components/`, `_components/terms-detail/`, `_components/terms-form/`, `_constants/`, `_hooks/`, `_schemas/`, `create/`, `[id]/`, `[id]/edit/`, and `[id]/new-version/` directories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the mock-DB table, Zod schemas, both route files (all methods), wire codegen, and stand up all five page shells every user story renders into. No user-story work can start until this phase is complete.

**⚠️ CRITICAL**: This phase must fully complete before Phase 3+.

- [x] T002 Create `src/app/api/_schemas/terms.schema.ts` per data-model.md: `TermsTypeSchema` (6-value enum), `TermsBrandSchema` (`'joyfit'|'fit365'`), `TermsStatusSchema` (`'published'|'expired'|'draft'`, computed-only), row schema `TermsSchema` (snake_case: `id`, `parent_terms_id`, `prev_terms_id`, `terms_type`, `brand_enum`, `title`, `version`, `pdf_url`, `pdf_file_name`, `pdf_file_size`, `body_text`, `effective_from`, `effective_to`, `display_order`, `requires_consent`, `remarks`, `is_deleted`, `created_by`, `updated_by`, `created_at`, `updated_at`), `GetTermsQuerySchema` (termsType/brandEnum/status/query/includeDeleted/page/limit per contracts/list-terms.md), `CreateTermsBodySchema` (camelCase, `parentTermsId`/`prevTermsId` optional per contracts/terms-mutations.md), `UpdateTermsBodySchema` (camelCase, **no** `termsType`/`brandEnum` fields at all, PDF fields co-required via `.refine()`), `TermsListItemResponseSchema`, `TermsVersionEntrySchema` (for the `versions` array, with conditional `pdfUrl`/`pdfFileName`), `TermsDetailResponseSchema` (incl. `relatedTermsRef`, `versions`), `GetTermsResponseSchema`, `CreateTermsResponseSchema`, `UpdateTermsResponseSchema`, `DeleteTermsResponseSchema`, and all corresponding type exports
- [x] T003 [P] Create `src/app/api/_mock-db/types/terms.type.ts`: `TermsRow` (from `TermsSchema`) and `TermsType` table interface declaring `_rows`, `_seeded`, `_seed()`, `list(query, brandScope)`, `getById(id, brandScope)`, `create(body, createdBy)`, `update(id, patch, updatedBy)`, `delete(id)` — depends on T002
- [x] T004 [P] Create `src/app/api/_mock-db/seeds/terms.seed.ts`: `buildTermsSeed(db): TermsRow[]` — 9 rows (TM-001…TM-009) seeded **relative to the seed's execution time** (not literal past dates), per data-model.md's seed table (TM-001/002 core lineage + auto-expiry, TM-004/005 draft-pending-version, TM-009 soft-deleted), each with a placeholder `pdf_url`/`pdf_file_name`/`body_text` so FR-009/FR-010 render without manual upload — depends on T003
- [x] T005 Create `src/app/api/_mock-db/tables/terms.table.ts`: `createTermsTables(getDb)` factory implementing `computeStatus(effectiveFrom, effectiveTo)` (mirrors `banner.table.ts`'s `computeStatus`), `computeVersionKind(row)`, `lineageRootId(row)`, `lineage(rootId)` (groups non-deleted rows sharing a root, sorted `effective_from` ascending), `computeIsCurrentlyApplied(row, lineageRows)`, `list()` (termsType/brandEnum/status(derived)/query(partial id-or-title)/includeDeleted/brand-scope filter/paginate, sort per contracts/list-terms.md), `getById()` (assembles `relatedTermsRef` + full `versions` array with PDF fields only on the currently-applied entry, brand-scope check → `null` sentinel for out-of-scope), `create()` (generates next `TM-{NNN}` id, validates referenced `parentTermsId`/`prevTermsId` exist and are non-deleted else `'invalid_lineage_ref'` sentinel), `update()` (returns `'not_found' | TermsRow`, strips any `termsType`/`brandEnum` even if present), `delete()` (returns `'not_found' | true`, logical delete only) — depends on T003, T004
- [x] T006 Register the new table: add `terms: TermsType` to `DbType` in `src/app/api/_mock-db/_db.types.ts`, and call `createTermsTables(...)` in `src/app/api/_mock-db/_create-db.ts` — depends on T005
- [x] T007 [P] Create `src/app/api/crm/terms/_lib/brand-scope.ts`: `getRequesterBrandScope(user)` co-located helper (research.md #9) — returns `null` (unrestricted) for `System`/`Headquarter` or a staff record with `brand === 'all'`; otherwise resolves the requester's `brand` from `db.staffs.getList()` via `staff_id` and returns that single `TermsBrand` value for Manager/Staff/Observer to filter list/detail reads against
- [x] T008 Implement `src/app/api/crm/terms/route.ts`: `registerRoute()` calls for `GET` (list) and `POST` (create) per contracts/list-terms.md and contracts/terms-mutations.md; `GET` handler — `getAuthUserFromRequest`, 401 if unauthenticated, 403 for `Trainer`, parse `GetTermsQuerySchema`, resolve brand scope via T007, call `db.terms.list(...)`; `POST` handler — 403 unless role ∈ {`System`,`Headquarter`}, parse `CreateTermsBodySchema`, call `db.terms.create(data, authResult.user.name)`, map `'invalid_lineage_ref'` sentinel → 400 — depends on T002, T006, T007
- [x] T009 Implement `src/app/api/crm/terms/[id]/route.ts`: `registerRoute()` calls for `GET`/`PATCH`/`DELETE` per contracts/terms-detail.md and contracts/terms-mutations.md; same auth pattern as T008 (`GET` allows brand-scoped Manager/Staff/Observer via T007, returns 404 — not 403 — when the id's `brand_enum` falls outside their scope; `PATCH`/`DELETE` require `System`/`Headquarter`); `GET` → 404 if not found or out-of-scope; `PATCH` → parse `UpdateTermsBodySchema`, call `db.terms.update(id, data, authResult.user.name)`, 404 on `'not_found'`; `DELETE` → call `db.terms.delete(id)`, 404 on `'not_found'`, else `{ message: "規約を削除しました" }` — depends on T002, T006, T007
- [x] T010 Add import lines for both new route files to `src/app/api/_routes/index.ts` (alphabetically grouped, matching existing entries) — depends on T008, T009
- [x] T011 Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmTermsOptions`, `postCrmTermsMutation`, `getCrmTermsByIdOptions`, `patchCrmTermsByIdMutation`, `deleteCrmTermsByIdMutation` in `src/lib/api/` — depends on T010
- [x] T012 [P] Create `src/app/(private)/terms/_constants/constants.ts`: `TERMS_TYPE_LABELS` (6 entries: 会員規約/プライバシーポリシー/決済規約/同伴規約/退会規約/休会規約), `TERMS_BRAND_LABELS` (`{joyfit: 'JOYFIT', fit365: 'FIT365'}`), `TERMS_STATUS_LABELS` + badge-color map (`published`=success/`expired`=muted/`draft`=warning, matching `terms-list.tsx`'s `getStatusBadge`), `VERSION_KIND_LABELS` + badge-color map (`original`=primary/`version`=info), `PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const`
- [x] T013 Create page shells: `src/app/(private)/terms/page.tsx` (Server Component, `PageHeader` with an empty content slot), `create/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`, `[id]/new-version/page.tsx` (each `PageHeader` + `BackLink` to the appropriate parent, empty content slot) — following the sibling `banners`/`app-maintenance`/`instructors` shell convention — depends on T001
- [x] T014 Run `npm run generate-routes` to register `/terms`, `/terms/create`, `/terms/[id]`, `/terms/[id]/edit`, and `/terms/[id]/new-version` in `src/lib/routes/routes.config.ts` — depends on T013

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Browse and search terms documents (Priority: P1) 🎯 MVP

**Goal**: A type-tabbed, searchable, filterable, paginated list of every terms document with correctly auto-computed statuses, respecting role/brand access.

**Independent Test**: Open `/terms`; switch tabs, search by partial ID/name, apply brand/status filters, toggle "include deleted," and verify the table updates accordingly without navigating elsewhere; verify Trainer sees a no-permission card and brand-scoped roles see only their brand's rows.

### Implementation for User Story 1

- [x] T015 [US1] Create `src/app/(private)/terms/_hooks/use-terms-filters.ts`: `nuqs`-backed `useQueryStates` for `termsType`/`brandEnum`/`status`/`query`/`includeDeleted`/`page`/`limit`, a debounced local `searchInput`, `clearFilters` (resets search + all filters + page), `activeFilterCount`, and a `queryParams` object matching `GetTermsQuery` — following `src/app/(private)/banners/_hooks/use-banners-filters.ts`
- [x] T016 [P] [US1] Create `src/app/(private)/terms/_components/terms-columns.tsx`: `ColumnDef<TermsListItemResponse>[]` factory — ID (muted text), 規約名 (medium font), 現行バージョン as secondary Badge, ブランド as one outline Badge, 適用開始日 as plain text, ステータス as outline Badge with per-status color, row click navigates to detail, deleted rows at 50% opacity; leave the row action cell (`MoreHorizontal` dropdown) as an empty placeholder column for now (populated in US4/US6) — port from `.cache/fitness-crm-ui/src/pages/terms-list.tsx` › columns (L100-109, 304-315, 332-349); satisfies PAR011, PAR012, PAR013
- [x] T017 [P] [US1] Create `src/app/(private)/terms/_components/terms-filters.tsx`: type tabs (line variant: すべて/会員規約/プライバシーポリシー/決済規約/同伴規約/退会規約/休会規約), search `Input` (placeholder "規約ID・規約名で検索..."), brand `Select` (全ブランド/JOYFIT/FIT365, highlighted when non-default), status `Select` (全ステータス/公開中/適用終了/下書き, highlighted when non-default), "削除済みも含めて表示" checkbox, filter-result banner ("全 {N} 件中 {M} 件を抽出中" + criteria text, shown only when active) with "条件をクリア" button — port from `terms-list.tsx` › FilterBanner/Toolbar (L229-297); satisfies PAR004, PAR005, PAR006, PAR007, PAR008, PAR009, PAR010
- [x] T018 [US1] Create `src/app/(private)/terms/_components/terms-list-section.tsx`: `'use client'` orchestrator — role check rendering a no-access card ("この画面を表示する権限がありません" / "規約文書管理はトレーナーロールでは参照できません。") for `Trainer`, else `useTermsFilters()`, `useQuery(getCrmTermsOptions({query: queryParams}))`, `DataTable` (columns from T016), page-size `Select` (`PAGE_SIZE_OPTIONS`) + pagination controls (前へ/page-number links with ellipsis/次へ) + summary text ("全 {totalCount} 件 / {totalPages} ページ / {start}-{end} を表示"), `Empty` (`variant={hasActiveFilters ? 'filtered' : 'empty'}`, `entityLabel="規約文書"`) — port from `terms-list.tsx` › TermsListSection (L217-225, 317-330, 405-452); satisfies PAR003, PAR015, PAR017, PAR018, PAR019 — depends on T015, T016, T017
- [x] T019 [US1] Integrate `TermsListSection` into `page.tsx`'s content slot, with `PageHeader` `title="規約文書管理"` + non-deleted-count `Badge`, and a "新規登録" `RoleGatedButton` (`allowedRoles={[UserRole.Headquarter, UserRole.System]}`, Plus icon) navigating to `/terms/create` — port from `terms-list.tsx` › PageHeader (L199-212); satisfies PAR001, PAR002 — depends on T018, T013

**Checkpoint**: User Story 1 is independently functional and testable — `/terms` shows the tabbed, searchable, filterable, paginated list end to end, with role/brand scoping enforced.

---

## Phase 4: User Story 2 - View terms document detail (Priority: P1)

**Goal**: A detail page with Basic Information (body text, PDF, management/audit fields) and Version History (chronological lineage timeline) tabs.

**Independent Test**: Open a row from the list and verify every section renders (basic info, terms-body text + PDF, management info, version-history timeline with the currently-applied entry visually distinguished and a "show more" control past 3 entries).

### Implementation for User Story 2

- [x] T020 [US2] Create `src/app/(private)/terms/_components/terms-detail/basic-info-card.tsx`: "基本情報" card (規約名, 備考), "規約本文" card with `{version} 適用中` Badge + Method-D description text + scrollable extracted-text block (max-h 320px) + attached-PDF chip (FileText icon, filename link, size, "プレビュー" button opening the PDF in a new window) — shown only for the currently-applied version — port from `.cache/fitness-crm-ui/src/pages/terms-detail.tsx` › BasicInfoCard (L158-192); satisfies PAR025, PAR026, PAR027, PAR028, PAR029
- [x] T021 [P] [US2] Create `src/app/(private)/terms/_components/terms-detail/management-info-card.tsx`: "管理情報" card fields (ステータス Badge w/ dot, 適用中バージョン Badge, 承諾ボタン表示 オン/オフ, 規約タイプ, ブランド outline Badge, 適用開始日, 表示順) + audit sub-section (作成日時, 最終更新日時, 最終更新者) below a divider — port from `terms-detail.tsx` › ManagementInfoCard (L202-232); satisfies PAR030, PAR031
- [x] T022 [P] [US2] Create `src/app/(private)/terms/_components/terms-detail/version-timeline.tsx`: per-entry status dot (success if 適用中, else muted) connected by a vertical line, version label + version-kind Badge (オリジナル規約/バージョン規約) + status Badge + "プレビュー" button, applicable-period text ("{start} 〜 {end/現在}") + change-summary text, file section (適用中 entries only), 適用中-entry highlighted (success-tinted border/background), "過去のバージョンを表示（全{N}件）" expand control (shown only when >3 versions and not yet expanded) — port from `terms-detail.tsx` › VersionTimeline (L259-308); satisfies PAR034, PAR035, PAR036, PAR037, PAR038, PAR039
- [x] T023 [US2] Create `src/app/(private)/terms/_components/terms-detail/terms-detail-tabs.tsx`: `Tabs` (line variant) with 基本情報 (T020 + T021) and バージョン履歴 (helper text "新バージョンを公開すると、旧バージョンは自動的に適用終了になります" + "新規バージョン作成" `RoleGatedButton` navigating to `/terms/[id]/new-version` + T022) — port from `terms-detail.tsx` › DetailTabs (L146-150, 244-254); satisfies PAR024, PAR032, PAR033 — depends on T020, T021, T022
- [x] T024 [US2] Integrate into `[id]/page.tsx`: fetch via `useQuery(getCrmTermsByIdOptions({path: {id}}))`, `DataStateBoundary` for the not-found case, `BackLink` "規約文書管理に戻る", page title "契約条件" + status `Badge` (dot + label), "編集" `RoleGatedButton` navigating to `/terms/[id]/edit`, action dropdown (`MoreHorizontal`) shell for future 削除 entry (wired in US6), render `TermsDetailTabs` (T023) in the content slot — port from `terms-detail.tsx` › PageHeader (L103-123); satisfies PAR020, PAR021, PAR022 — depends on T023, T013

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Register a new terms document (Priority: P2)

**Goal**: A shared, mode-aware registration form (create/edit/new-version) that validates required fields, uploads/validates a PDF, and shows the extracted-text preview.

**Independent Test**: From the list page, click "New Registration," fill required fields, upload a PDF, submit, and verify a validation error appears when a required field or the PDF is left out; verify Manager/Staff/Observer/Trainer see the action unavailable.

### Implementation for User Story 3

- [x] T025 [US3] Create `src/app/(private)/terms/_schemas/terms-form.schema.ts`: react-hook-form Zod schema mirroring `CreateTermsBodySchema` — `brandEnum` (1+ checkbox selections in create mode), `title`/`termsType`/`version`/`effectiveFrom` required, `effectiveTo` optional (`.refine()` enforcing `> effectiveFrom`), `displayOrder` optional integer ≥ 1, `requiresConsent` required boolean, `remarks` optional, PDF required on create / optional replace on edit/new-version — implements FR-007/FR-008's client-side validation
- [x] T026 [US3] Create `src/app/(private)/terms/_hooks/use-terms-pdf-upload.ts`: thin terms-local wrapper around `useImageUpload` (`src/hooks/use-image-upload.hook.ts`) accepting `application/pdf` content type and a 10MB size ceiling, capturing `file.name`/`file.size` client-side before calling the shared `uploadFile`, returning `{ url, name, size }` (research.md #7)
- [x] T027 [US3] Create `src/app/(private)/terms/_components/terms-form/terms-form.tsx`: shared `mode: 'create' | 'edit' | 'new-version'`-aware presentational form — back link with unsaved-changes discard confirmation, dynamic title (規約編集/新規バージョン作成/規約新規登録), edit-mode warning `Alert` (AlertTriangle icon), ブランド checkboxes (JOYFIT/FIT365, disabled + "編集モードではブランドは変更できません（FR-006）" description when mode≠create), 規約名/規約タイプ (disabled when mode≠create)/バージョン required fields, 適用開始日/適用終了予定日 `DatePicker`s, 表示順 number input, 承諾ボタン表示 `Switch`, 備考 `Textarea`, PDF upload (T026) with existing-file/file-picker/selected-file states and format/size validation errors, 規約本文 extraction-preview block (or no-PDF placeholder), 関連規約 field (source reference chip in new-version mode, else "関連する規約が存在しません"), submit-error summary, キャンセル/保存する/登録する buttons, discard-confirmation `AlertDialog` — port from `.cache/fitness-crm-ui/src/pages/terms-form.tsx` › entire component (L97-461); satisfies PAR041, PAR042, PAR043, PAR044, PAR045, PAR046, PAR047, PAR048, PAR049, PAR050, PAR051, PAR052, PAR053, PAR054, PAR055, PAR056, PAR057, PAR058, PAR059, PAR060, PAR061, PAR062, PAR063, PAR064, PAR065, PAR066 — depends on T025, T026
- [x] T028 [US3] Integrate `TermsForm mode="create"` into `create/page.tsx`'s content slot: on submit, issue one `postCrmTermsMutation` call per selected brand (research.md #2 client-side fan-out), success toast + navigate to `/terms` — depends on T027, T013

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - Edit an existing terms document (Priority: P2)

**Goal**: Editing name, version, dates, display order, approval toggle, notes, and PDF while terms ID/type/brand stay locked, with an active-version warning.

**Independent Test**: Open edit from the detail page, verify locked vs. editable fields, verify the active-version warning appears when editing a "Published" document, save, and confirm the update is reflected in the detail view; verify unsaved-changes guard blocks navigation.

### Implementation for User Story 4

- [x] T029 [US4] Add a "編集" `RoleGatedMenuItem` (Pencil icon) entry to `terms-columns.tsx`'s row action dropdown (from US1, T016), navigating to `/terms/[id]/edit`, separated by a `DropdownMenuSeparator` from the (US6-added) delete entry — port from `.cache/fitness-crm-ui/src/pages/terms-list.tsx` › row action menu (L350-372); satisfies PAR014 — depends on T016
- [x] T030 [US4] Integrate `TermsForm mode="edit"` into `[id]/edit/page.tsx`: fetch via `useQuery(getCrmTermsByIdOptions({path: {id}}))`, `DataStateBoundary` for the not-found case, pass `defaultValues` + `currentStatus` (drives the active-version warning) into `TermsForm`, `patchCrmTermsByIdMutation` on submit, success toast + navigate to `/terms/[id]` — depends on T027, T013

**Checkpoint**: User Stories 1, 2, 3, AND 4 all work independently.

---

## Phase 7: User Story 5 - Create a new version of an existing terms document (Priority: P2)

**Goal**: From an existing document's Version History tab, start a pre-filled "new version" registration that auto-references the source document and requires only version label, effective date, and PDF.

**Independent Test**: From a terms document's Version History tab, click "Create New Version," verify pre-filled/locked fields and the "Related Terms" reference, complete the remaining required fields, submit, and verify the new version appears in the lineage while the previously-applied version's status transitions automatically.

### Implementation for User Story 5

- [x] T031 [US5] Integrate `TermsForm mode="new-version"` into `[id]/new-version/page.tsx`: fetch the source document via `useQuery(getCrmTermsByIdOptions({path: {id}}))`, compute prefill (`title`, `termsType`, `brandEnum`, `displayOrder`, `requiresConsent` copied from source per FR-014; `remarks` left blank per research.md #11; `parentTermsId = source.parentTermsId ?? source.id`; `prevTermsId = source.id` per research.md #5) and the "Related Terms" reference chip, pass into `TermsForm`, `postCrmTermsMutation` on submit, success toast + navigate to `/terms/[id]` (the new version's own id) — depends on T027, T013, T023 (Version History tab's "新規バージョン作成" button target)

**Checkpoint**: User Stories 1 through 5 all work independently.

---

## Phase 8: User Story 6 - Delete a terms document (Priority: P2)

**Goal**: Logical delete from list or detail view, after confirmation, recoverable via "include deleted."

**Independent Test**: Trigger delete from a list row and from a detail page, confirm the dialog, verify the record disappears from the default list, then verify it reappears (dimmed) with "include deleted" checked; verify sibling lineage members are untouched; verify Manager/Staff/Observer/Trainer cannot see the action.

### Implementation for User Story 6

- [x] T032 [US6] Create `src/app/(private)/terms/_components/terms-delete-dialog.tsx`: `AlertDialog` — title "規約を削除しますか？", description naming the target document and explaining logical deletion + recoverability via "削除済みも含めて表示", キャンセル/削除する (destructive) actions, `useMutation(deleteCrmTermsByIdMutation)` on confirm, on success → toast + invalidate the list/detail queries — port from `.cache/fitness-crm-ui/src/pages/terms-list.tsx` › DeleteDialog (L380-402) and `terms-detail.tsx` › DeleteDialog (L317-329); satisfies PAR016, PAR040
- [x] T033 [US6] Add a "削除" `RoleGatedMenuItem` (Trash2 icon, destructive style) entry to `terms-columns.tsx`'s row action dropdown (from US4, T029) and to `[id]/page.tsx`'s action dropdown shell (from US2, T024), both wired to open T032's dialog for the relevant document — port from `terms-list.tsx` › row action menu (L350-372) and `terms-detail.tsx` › action dropdown (L124-139); satisfies PAR014 (delete portion), PAR023 — depends on T032, T029, T024

**Checkpoint**: All six user stories are independently functional — full CRUD + versioning is live end to end.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T034 [P] Run `tsc --noEmit` and fix any type errors introduced by this feature's files (Constitution I)
- [x] T035 [P] Run `npm run lint` and fix any violations (Constitution I / QA process)
- [ ] T036 Work through quickstart.md's full manual verification checklist (list tabs/search/filters/pagination/role-scoping, detail tabs/lineage/show-more, create validation/upload/multi-brand fan-out/role-gating, edit locked-fields/warning-banner/unsaved-changes-guard, new-version prefill/auto-expiry, delete/recover/sibling-safety, and direct `curl` 403 checks for non-Headquarter/System write attempts)
- [x] T037 Confirm via `git diff --stat src/lib/api/` that all changed files under `src/lib/api/` are exclusively additions from `npm run generate-openapi && npm run generate-api` — no manual edits (Constitution II)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories. Internally sequential: T002 → T003 → T004 → T005 → T006 → {T008, T009} (both also need T007) → T010 → T011; T007 is independent; T012 is independent; T013 → T014.
- **User Stories (Phase 3–8)**: All depend on Foundational (Phase 2) completion.
  - US1 (Phase 3) has no dependency on US2–US6.
  - US2 (Phase 4) has no dependency on US1, but its "編集"/"新規バージョン作成"/delete-menu entry points target routes stubbed in Foundational (T013) and are wired live by US4/US5/US6.
  - US3 (Phase 5) builds the full shared, mode-aware `TermsForm` (T027) that US4 and US5 both reuse without modification.
  - US4 (Phase 6) modifies US1's columns file (T029) to add the edit entry point, and reuses US3's `TermsForm` (T030).
  - US5 (Phase 7) reuses US3's `TermsForm` and US2's "新規バージョン作成" button target (T023) — no new UI component, only page-level wiring.
  - US6 (Phase 8) modifies both US1's columns file (T029/T033) and US2's detail page (T024/T033) to add delete entry points.
- **Polish (Phase 9)**: Depends on all six user stories being complete.

### Parallel Opportunities

- Within Foundational: T003/T004/T005 are sequential (each needs the prior), but T007 (brand-scope helper) and T012 (constants) can run in parallel with the entire schema/table/route chain; T008 and T009 are parallel once T006/T007 land.
- Within US1: T016 and T017 are parallel (different files); T015 has no file overlap with either and can run alongside them.
- Within US2: T020, T021, T022 are parallel (different files); T023 needs all three.
- Across stories: once Foundational is done, US1, US2, and US3 can be staffed in parallel (US3 only needs the Foundational shells + generated hooks, not US1/US2's finished UI). US4, US5, and US6 are inherently sequential after US1/US2/US3 due to the shared-file touches and shared-component reuse noted above.

---

## Parallel Example: Foundational Phase

```bash
# Brand-scope helper and constants have no dependency on the schema/table/route chain:
Task: "Create src/app/api/crm/terms/_lib/brand-scope.ts"
Task: "Create src/app/(private)/terms/_constants/constants.ts"

# Once T006/T007 land, both routes can be implemented together:
Task: "Implement src/app/api/crm/terms/route.ts (list GET + create POST)"
Task: "Implement src/app/api/crm/terms/[id]/route.ts (detail GET + update PATCH + delete DELETE)"
```

## Parallel Example: User Story 2

```bash
Task: "Create basic-info-card.tsx in src/app/(private)/terms/_components/terms-detail/"
Task: "Create management-info-card.tsx in src/app/(private)/terms/_components/terms-detail/"
Task: "Create version-timeline.tsx in src/app/(private)/terms/_components/terms-detail/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently against quickstart.md's List section
5. Demo if ready — a searchable, filterable list of terms documents is already useful to all non-Trainer roles

### Incremental Delivery

1. Setup + Foundational → foundation ready (schema, table, both routes live, typed client generated, 5 page shells registered)
2. Add US1 (list) → validate → demo (MVP)
3. Add US2 (detail) → validate → demo
4. Add US3 (register, incl. the shared form) → validate → demo
5. Add US4 (edit, reusing the shared form) → validate → demo
6. Add US5 (new version, reusing the shared form) → validate → demo
7. Add US6 (delete) → validate → demo — full CRUD + versioning complete
8. Polish (Phase 9)

### Parallel Team Strategy

With multiple developers, after Foundational completes:

- Developer A: US1 (list)
- Developer B: US2 (detail) — independent of US1's finished UI
- Developer C: US3 (register + shared form) — independent of US1/US2, but US4/US5 should wait for this to land
- US4, US5, and US6 should follow sequentially after US1/US2/US3 land, since all three touch files those stories created

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test-writing tasks anywhere (Constitution's No Testing Policy) — quickstart.md is the verification artifact
- Every `PAR001`–`PAR066` parity item is claimed by at least one task (see per-task `satisfies PAR...` annotations)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
