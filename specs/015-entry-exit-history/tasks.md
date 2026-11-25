# Tasks: Entry/Exit History (B-01-01)

**Input**: Design documents from `/specs/015-entry-exit-history/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story (from spec.md, in priority order: US1 P1, US2 P2, US3 P3) to enable independent implementation and testing of each story.

**No test tasks**: Per `.specify/memory/constitution.md`'s absolute "No Testing Policy," this list contains zero test-writing tasks (no unit/integration/e2e/contract tests). Verification is manual, against `quickstart.md`'s checklist, plus `tsc --noEmit` and ESLint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3, mapping to spec.md's user stories
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the feature's directory structure. No new npm dependencies, no new top-level navigation entry (this screen is a drill-down from `/entry-exit`, matching `/lockers/pending`'s pattern — no separate sidebar item).

- [x] T001 Create `src/app/(private)/entry-exit/history/_components/` and `src/app/(private)/entry-exit/history/_hooks/` directories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the shared `entry_exit_logs` mock-db table, add the two new permissions and the Observer store-scope fix, add shared/base schema pieces, and stand up the page shell every user story renders into. No user-story work can start until this phase is complete.

**⚠️ CRITICAL**: This phase must fully complete before Phase 3+.

- [x] T002 Extend `EntryExitLogRow` (add `auth_method: 'qr' | 'nfc'`, `result: 'success' | 'denied'`) and add the `listHistory(params)` method signature to `EntryExitLogsType` in `src/app/api/_mock-db/types/entry-exit-logs.type.ts`, per data-model.md
- [x] T003 Extend seed data in `src/app/api/_mock-db/seeds/entry-exit-log.seed.ts` per data-model.md's Seed Requirements: at least one completed visit, one in-progress visit (entry only, `result: 'success'`, `occurred_at` today, no matching exit), one denied record (`result: 'denied'`, no exit), one member whose home store differs from their visit store, coverage of both `auth_method` values, and one store/date-range combination yielding zero rows for the default filter state
- [x] T004 Implement `listHistory(params)` in `src/app/api/_mock-db/tables/entry-exit-log.table.ts`: filter by `search`/`date_from`/`date_to`/`store_id`/`auth_method`/`result`/`storeIds` (allowed scope), pair each `direction: 'entry'` row with its chronologically-next same-member/same-store `direction: 'exit'` row (reusing the pairing heuristic already used for `MemberQuickView.recent_visits`), derive `visit_status` (`'completed'`/`'in_progress'`/`'denied'`) from row presence, join `Member` fields (name, furigana, gender, avatar_url, contract_name, contract_id, home `store_id`/`store_name`), sort per `sort_by`/`sort_order`, and paginate
- [x] T005 [P] Add `EntryExitHistoryView = 'entry-exit-history.view'` and `EntryExitHistoryExport = 'entry-exit-history.export'` to the `Permission` enum in `src/types/permission.type.ts`
- [x] T006 Register `PAGE_PERMISSIONS['/entry-exit/history'] = Permission.EntryExitHistoryView` and add the `ROLE_PERMISSIONS` grants from research.md R5's table (Headquarter/Manager: both; Observer: view only; Staff/Trainer: neither) in `src/constants/permission.constants.ts` (depends on T005)
- [x] T007 ~~Fix `getAllowedStoreIds` for Observer~~ — **N/A, already resolved upstream**: `src/app/api/_lib/auth.ts` was independently updated (in-progress work already in the working tree, not part of this feature) to treat Observer as unrestricted (all stores) rather than a single linked store. No change needed here; consume as-is (research.md R6). Skip directly to T008.
- [x] T008 Add `HistoryVisitRowSchema` (shared by both the list endpoint and the export endpoint) to `src/app/api/_schemas/entry-exit-log.schema.ts`, per data-model.md's `HistoryVisitRow` field table
- [x] T009 Create the Server Component page shell in `src/app/(private)/entry-exit/history/page.tsx`: layout wrapper matching the sibling `src/app/(private)/entry-exit/page.tsx`, `PageHeader` with `title="入退館履歴"`, an empty `actions` slot (CSV export button added in US3), and an empty content slot (table added in US1)
- [x] T010 Run `npm run generate-routes` to register `/entry-exit/history` in `src/lib/routes/routes.config.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Search and review past entry/exit records (Priority: P1) 🎯 MVP

**Goal**: Show a paginated, filterable, searchable table of past visits (completed, in-progress, denied), scoped to the current user's accessible stores, with all FR-010 columns rendered correctly including blank/"in facility" handling.

**Independent Test**: Load `/entry-exit/history` and verify the table shows store-scoped rows with a record count and pagination; type a keyword into search, expand "詳細フィルター", set a date range/store/auth-method/result, and verify the visible rows narrow accordingly; verify "すべてクリア" resets every filter including the search box; verify the empty state distinguishes "no records match your filters" from "no records yet".

### Implementation for User Story 1

- [x] T011 [US1] Add `GetEntryExitHistoryQuerySchema` (page/limit/search/date_from/date_to/store_id/auth_method/result/sort_by/sort_order) and `GetEntryExitHistoryResponseSchema` (`{history: HistoryVisitRow[], pagination}`) to `src/app/api/_schemas/entry-exit-log.schema.ts`
- [x] T012 [US1] Implement `GET /api/crm/entry-exit-logs/history/route.ts`: call `getAuthUserFromRequest`, 403 when `getAllowedStoreIds(user)` resolves to an empty (non-null) array (matching the sibling `src/app/api/crm/entry-exit-logs/route.ts` exactly — no separate server-side `Permission.EntryExitHistoryView` check, since view-access is already enforced at the routing level via `PAGE_PERMISSIONS`/`proxy.ts`, per FR-017; no export route in this codebase does a server-side permission check either — research.md R11), validate query via `GetEntryExitHistoryQuerySchema`, intersect `store_id` with `getAllowedStoreIds(user)` (`resolveStoreScope`), call `db.entryExitLogs.listHistory(...)`, register via `registerRoute()`, return the paginated response (contracts/get-entry-exit-history.md, updated)
- [x] T013 [US1] Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmEntryExitLogsHistoryOptions`
- [x] T014 [P] [US1] Create `use-entry-exit-history-filters.hook.ts` in `src/app/(private)/entry-exit/history/_hooks/`: `nuqs`-backed `useQueryStates` for `page`/`limit`/`search`/`date_from`/`date_to`/`store_id`/`auth_method`/`result`/`sort_by`/`sort_order`, a debounced local `searchInput`, `updateFilter`/`clearFilters` (clearing the search box too, per research.md R8)/`hasActiveFilters`/`activeDetailFilterCount`, a `queryParams` object matching `GetEntryExitHistoryQuery`, and an `exportQueryParams` omitting `page`/`limit` — following `src/app/(private)/banners/_hooks/use-banners-filters.ts`
- [x] T015 [P] [US1] Create `entry-exit-history-table-columns.tsx` in `src/app/(private)/entry-exit/history/_components/`: `ColumnDef<HistoryVisitRow>[]` factory covering every FR-010 column (avatar/name/furigana, member ID, visit date, entry time, exit time, stay duration, contract type, gender, home store, visiting store, auth method badge, result badge), rendering exit time/stay duration as blank or an "在館中" indicator when `visit_status === 'in_progress'`, and blank when `visit_status === 'denied'`
- [x] T016 [US1] Create `entry-exit-history-filters.tsx` in `src/app/(private)/entry-exit/history/_components/`: search `Input`, "詳細フィルター"/"閉じる" toggle `Button` with active-filter count badge, expandable row with date-range `Popover`+`Calendar`, a store `Select` shown only per FR-004's visibility rule, `auth_method`/`result` `Select`s, and "すべてクリア" — following `src/app/(private)/banners/_components/banners-filters.tsx` (depends on T014)
- [x] T017 [US1] Create `entry-exit-history-content.tsx` in `src/app/(private)/entry-exit/history/_components/`: `'use client'` orchestrator calling `useEntryExitHistoryFilters()` and `useQuery({ ...getCrmEntryExitLogsHistoryOptions({ query: queryParams }), enabled: !isStoreScopeLoading })` (reading `isLoading` from `useCurrentStore()` as `isStoreScopeLoading`, matching the double-fetch-avoidance pattern already used by `entry-exit-section.tsx`/`activity-table.tsx` — research.md R6) directly, composing `entry-exit-history-filters.tsx`, `DataTable` (`variant="simple"`, columns from T015), `Empty` (`variant={hasActiveFilters ? 'filtered' : 'empty'}`, entityLabel "入退館履歴"), `TablePaginationWithSize`, and an inline error/retry block for `isError` — following `src/app/(private)/banners/page.tsx`'s composition (depends on T013, T014, T015, T016)
- [x] T018 [US1] Integrate `EntryExitHistoryContent` into `src/app/(private)/entry-exit/history/page.tsx`'s content slot (from Foundational T009)

**Checkpoint**: User Story 1 is independently functional and testable — `/entry-exit/history` shows the searchable, filterable, paginated table end to end.

---

## Phase 4: User Story 2 - Inspect a single visit from the history list (Priority: P2)

**Goal**: Clicking any history row opens the existing, reused Member Quick View panel with correct status (退館済み/在館中/入館拒否), without navigating away or losing filter/pagination state.

**Independent Test**: Click a completed row and verify the panel shows "退館済み"; click an in-progress row and verify "在館中"; click a denied row and verify "入館拒否"; close the panel and verify the table's filters/pagination/scroll position are unchanged.

### Implementation for User Story 2

- [x] T019 [US2] In `src/app/api/_schemas/entry-exit-log.schema.ts`, add `QuickViewContextSchema = z.enum(['entry', 'exit', 'in-building', 'denied'])` decoupled from `EntryExitDirectionSchema`, and change `MemberQuickViewSchema.context`'s type to `QuickViewContextSchema` (`GetEntryExitLogsQuerySchema.direction` keeps using `EntryExitDirectionSchema` unchanged)
- [x] T020 [US2] Update `src/app/api/crm/entry-exit-logs/[id]/quick-view/route.ts`'s response mapping: when the requested log row's `result === 'denied'`, return `context: 'denied'`; when it's a `direction: 'entry'` row with no paired exit row, return `context: 'in-building'`; otherwise return `context: row.direction` as before (013's existing behavior unaffected)
- [x] T021 [P] [US2] Update `src/app/(private)/entry-exit/_components/member-quick-view-sheet.tsx`'s status-badge label mapping: add `'in-building'` → "在館中" and `'denied'` → "入館拒否", alongside the existing `'entry'` → "入館" and `'exit'` → "退館済み"
- [x] T022 [US2] Run `npm run generate-openapi` then `npm run generate-api` to refresh the quick-view response type
- [x] T023 [US2] Add row-click handling to `entry-exit-history-content.tsx` (from US1, T017): `selectedLogId` state, `onRowClick` passing the row's `exit_log_id` when `visit_status === 'completed'` else `entry_log_id`, and render `../../_components/member-quick-view-sheet.tsx` with that id (`onOpenChange` clears it back to `null`)

**Checkpoint**: User Stories 1 AND 2 both work independently — the table renders, and clicking any row (completed, in-progress, or denied) opens a correctly-labeled Quick View panel.

---

## Phase 5: User Story 3 - Export filtered history to CSV (Priority: P3)

**Goal**: An authorized user can export the currently filtered/searched record set as a downloadable CSV file in one click; unauthorized roles see the action disabled with an explanatory tooltip.

**Independent Test**: As Headquarter/System/Manager, apply some filters, click "CSV出力", and verify a CSV file downloads whose rows match the filtered table; as a role without the permission (default Staff/Trainer), verify the button is disabled with the tooltip "入退館ログCSV出力の権限がありません".

### Implementation for User Story 3

- [x] T024 [US3] Add `ExportEntryExitHistoryQuerySchema = GetEntryExitHistoryQuerySchema.omit({ page: true, limit: true })` to `src/app/api/_schemas/entry-exit-log.schema.ts`
- [x] T025 [US3] Implement `POST /api/crm/entry-exit-logs/export/route.ts`: call `getAuthUserFromRequest`, enforce `Permission.EntryExitHistoryExport` (403 if missing), validate body via `ExportEntryExitHistoryQuerySchema`, reuse the same filter/sort logic as `listHistory` (T004) without pagination, build CSV rows/headers per contracts/export-entry-exit-history.md's column list (会員ID/氏名/ふりがな/性別/来館日/入館時刻/退館時刻/在館時間(分)/状態/契約名/所属店舗/入館店舗/認証方式/処理結果, leaving exit-time/duration blank for `in_progress`/`denied` rows), and return via `buildCsv()` + `csvFileResponse(csv, \`entry*exit_history*${csvDateStamp()}.csv\`)`from`src/app/api/\_lib/csv.ts`, registered via `registerRoute()`
- [x] T026 [US3] Run `npm run generate-openapi` then `npm run generate-api`
- [x] T027 [P] [US3] Create `use-entry-exit-history-csv-export.hook.ts` in `src/app/(private)/entry-exit/history/_hooks/`: `useMutation` calling the generated export mutation with `parseAs: 'blob'`, reading the filename via `getCsvFilenameFromContentDisposition(response.headers.get('content-disposition'), 'entry_exit_history.csv')`, calling `downloadCsv(data, filename)` on success with a success toast, and an error toast on failure — following `src/app/(private)/(equipment-management)/_components/equipment-csv-export-button.tsx`'s hook
- [x] T028 [US3] Create `entry-exit-history-csv-export-button.tsx` in `src/app/(private)/entry-exit/history/_components/`: `RoleGatedButton` with `requiredPermission={Permission.EntryExitHistoryExport}`, `denyTooltip="入退館ログCSV出力の権限がありません"`, calling the export hook (T027) with the filters hook's (T014) `exportQueryParams`, `disabled` while pending
- [x] T029 [US3] Integrate `EntryExitHistoryCsvExportButton` into `src/app/(private)/entry-exit/history/page.tsx`'s `PageHeader` `actions` slot (from Foundational T009)

**Checkpoint**: All three user stories are independently functional — the Phase 1 B-01-01 screen described in spec.md is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency and verification across all stories; no automated tests per constitution.

- [x] T030 [P] Run `npm run lint` and `npm run type-check`; fix any violations across all new/modified files
- [x] T031 Run `npm run build` to validate production compilation; record the result in `specs/015-entry-exit-history/quickstart.md`'s Verification Log
- [x] T032 Manually walk through spec.md's Success Criteria SC-001–SC-005 and every Edge Case (in-progress row, denied row, empty states, Trainer blocked from `/entry-exit/history` via `/403`, Staff's export button disabled by default); record pass/fail notes in `specs/015-entry-exit-history/quickstart.md`'s Manual Verification Checklist and Verification Log

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories.
- **User Stories (Phases 3-5)**: All depend on Foundational (Phase 2) completion. US2 additionally depends on US1's `entry-exit-history-content.tsx` existing (T023 modifies it); US3 additionally depends on US1's filters hook existing (T028 uses its `exportQueryParams`).
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on other stories — this is the MVP.
- **US2 (P2)**: Starts after Phase 2. Extends US1's `entry-exit-history-content.tsx` (T023) but the Quick View schema/route change and badge-label update (T019-T022) are independently built and testable once T023 lands.
- **US3 (P3)**: Starts after Phase 2. Fully independent endpoint/component; only reuses US1's filters hook (T014) for `exportQueryParams`.

### Critical Ordering Constraints

- T013/T022/T026 (each story's `generate-openapi`+`generate-api` run) must follow that story's schema/route changes (T011-T012 / T019-T020 / T024-T025 respectively) and precede that story's component that calls the generated hook (T017 / T023 / T027).
- T006 (permission registration) must follow T005 (`Permission` enum values must exist first).
- T010 (`generate-routes`) must follow T009 (`page.tsx` must exist for the route scanner to find it).
- T004 (`listHistory` implementation) must follow T002-T003 (row type and seed data must exist first) and precede T012 and T025 (both routes call it).

---

## Parallel Opportunities

- Foundational: T005 and T007 can run in parallel (different files); T002→T003→T004 are sequential; T006 depends on T005; T008-T010 are sequential and depend on the schema/table work above.
- US1: T014 and T015 can run in parallel with each other and with T011-T013; T016 depends on T014; T017 depends on T013, T014, T015, T016.
- US2: T021 can run in parallel with T019-T020; T022 depends on T019-T020; T023 depends on T021 and T022.
- US3: T027 can run in parallel with T024-T026; T028 depends on T027; T029 depends on T028.
- Polish: T030 can run in parallel with nothing else in this phase (it gates T031).

---

## Parallel Example: User Story 1

```bash
# After T013 (generated client ready):
Task: "Create use-entry-exit-history-filters.hook.ts in src/app/(private)/entry-exit/history/_hooks/"   # T014
Task: "Create entry-exit-history-table-columns.tsx in src/app/(private)/entry-exit/history/_components/" # T015
# Then, once T014/T015/T016 are done:
Task: "Create entry-exit-history-content.tsx in src/app/(private)/entry-exit/history/_components/"       # T017
```

## Parallel Example: User Story 2

```bash
Task: "Update member-quick-view-sheet.tsx's status-badge label mapping"   # T021 (independent of the schema/route change)
Task: "Add QuickViewContextSchema and update the quick-view route"        # T019-T020
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks everything).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Load `/entry-exit/history`, confirm the table renders real store-scoped mock data with working search/filters/pagination and correct empty states.
5. This is a demonstrable MVP even without the Quick View panel or CSV export.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add US1 → validate independently → demo (MVP!).
3. Add US2 → validate Quick View independently → demo.
4. Add US3 → validate CSV export independently → demo.
5. Phase 6 polish once all three are in.

### Notes

- [P] tasks touch different files with no unresolved dependencies.
- Each user-story phase ends with a checkpoint — the feature is safe to pause there.
- No test-writing tasks exist anywhere in this list (constitution's absolute No Testing Policy) — validation is manual against `quickstart.md`.
- Commit after each task or logical group per repository convention.
