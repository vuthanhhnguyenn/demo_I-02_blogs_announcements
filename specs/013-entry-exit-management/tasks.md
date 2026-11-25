# Tasks: B-01 入退館管理 (Entry-Exit Management) — Phase 1 Baseline Activity View

**Input**: Design documents from `/specs/013-entry-exit-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story (from spec.md, in priority order: US1 P1, US2 P2, US3 P2, US4 P3) to enable independent implementation and testing of each story.

**No test tasks**: Per `.specify/memory/constitution.md`'s absolute "No Testing Policy," this list contains zero test-writing tasks (no unit/integration/e2e/contract tests). Verification is manual, against `quickstart.md`'s checklist, plus `tsc --noEmit` and ESLint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4, mapping to spec.md's user stories
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature workspace and register the new route with app-level navigation/routing.

- [x] T001 Create `src/app/(private)/entry-exit/_components/` and `src/app/(private)/entry-exit/_hooks/` directories
- [x] T002 [P] Add a "入退館" top-level nav entry (icon: `LogIn` from `lucide-react`, `href: '/entry-exit'`) to the nav config in `src/components/layout/app-sidebar.tsx`, following the existing plain-string `href` style used by the "スタジオ管理" entry

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared mock-db table, base schemas, and page shell every user story renders into. No user-story work can start until this phase is complete.

**⚠️ CRITICAL**: This phase must fully complete before Phase 3+.

- [x] T003 Define `EntryExitLogsType` (table shape: `_rows`, `_seeded`, `_seed()`, plus method signatures for `listByDirection`, `getHourlySummary`, `getQuickView`) in `src/app/api/_mock-db/types/entry-exit-logs.type.ts`
- [x] T004 Add `entryExitLogs: EntryExitLogsType` field (with the corresponding import) to the `DbType` interface in `src/app/api/_mock-db/_db.types.ts`
- [x] T005 Create seed data in `src/app/api/_mock-db/seeds/entry-exit-log.seed.ts` covering every case from data-model.md's Phase 1 Seed Requirements: 5+ entry rows and 5+ exit rows for "today", one `frequency_badge: "regular"` row, one `"longAbsence"` row, one `inviter`/`invitee` same-day pair, one member with `visit_count: 0`, one member with no `avatar_url`, one orphaned exit (no matching same-day entry), and rows spanning 2+ stores
- [x] T006 Implement `createEntryExitLogTables(getDb)` in `src/app/api/_mock-db/tables/entry-exit-log.table.ts` with `listByDirection({direction, limit, date, storeId})`, `getHourlySummary({date, storeId})` (always returns 17 buckets, hours 6-22), and `getQuickView(logId)` (joins `db.members`, computes `recent_visits` by pairing exits with same-day entries), following the `createTrainingEquipmentTables` factory pattern in `src/app/api/_mock-db/tables/training-equipment.table.ts`
- [x] T007 Register the table in `src/app/api/_mock-db/_create-db.ts`: import `createEntryExitLogTables`, add `Object.assign(db, createEntryExitLogTables(() => db))`, and add `db.entryExitLogs._seed()` to the seed-call list
- [x] T008 Define base Zod schemas (`EntryExitDirectionSchema`, `ActivityRowSchema`, `FrequencyBadgeSchema`, `CompanionRoleSchema`) shared across all three endpoints in `src/app/api/_schemas/entry-exit-log.schema.ts`
- [x] T009 Create the Server Component page shell in `src/app/(private)/entry-exit/page.tsx`: `SharedSidebar`/`SharedHeader`-equivalent layout wrapper + `PageHeader` with `title="入退館"` and empty content slots for the chart, activity tables, and Quick View sheet (each added by its own story below)
- [x] T010 Run `npm run generate-routes` to register `/entry-exit` in `src/lib/routes/routes.config.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Review the most recent entry and exit activity (Priority: P1) 🎯 MVP

**Goal**: Show the 5 most recent entries and 5 most recent exits, each with identity, contract, time, and frequency/companion badges — no further navigation required.

**Independent Test**: Load `/entry-exit` and verify an "入館" table and a "退館" table each render up to 5 rows with avatar, name, furigana, contract type, time, and badges where applicable; verify empty-scope and loading states render correctly.

### Implementation for User Story 1

- [x] T011 [US1] Add `GetEntryExitLogsQuerySchema` (`direction`, `limit`, `date`, `store_id`) and `GetEntryExitLogsResponseSchema` to `src/app/api/_schemas/entry-exit-log.schema.ts`
- [x] T012 [US1] Implement `GET /api/crm/entry-exit-logs` in `src/app/api/crm/entry-exit-logs/route.ts`: call `getAuthUserFromRequest`, validate query via `GetEntryExitLogsQuerySchema`, call `db.entryExitLogs.listByDirection(...)`, register via `registerRoute()` (mirroring `src/app/api/crm/training-equipment/route.ts`), return `ActivityRow[]` (empty array, not an error, when zero rows match)
- [x] T013 [US1] Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmEntryExitLogsOptions` in `src/lib/api/@tanstack/react-query.gen`
- [x] T014 [P] [US1] Create `entry-exit-badges.tsx` in `src/app/(private)/entry-exit/_components/`: `FrequencyBadge` (常連/久しぶり, with hover tooltip per data-model.md descriptions) and `CompanionBadge` (招待者/同伴者, with hover tooltip)
- [x] T015 [US1] Create `activity-table.tsx` in `src/app/(private)/entry-exit/_components/`: shared Entry/Exit table taking a `direction` prop, calling `useQuery({ ...getCrmEntryExitLogsOptions({ query: { direction, limit: 5 } }) })` directly, wrapped in `DataStateBoundary` (`isLoading`/`isEmpty`/`isError` with a table-row `Skeleton` fallback sized to 4 columns), rendering `Avatar`/`AvatarImage`/`AvatarFallback` (not raw `<img>`) and the badges from T014
- [x] T016 [US1] Integrate two `ActivityTable` instances (title="入館" / "退館", `direction="entry"` / `"exit"`) side by side into `src/app/(private)/entry-exit/page.tsx`'s content area

**Checkpoint**: User Story 1 is independently functional and testable — `/entry-exit` shows both activity tables end to end.

---

## Phase 4: User Story 2 - Inspect a member's detail from an activity row (Priority: P2)

**Goal**: Clicking any activity row opens a non-modal Member Quick View panel with identity, contract, badges, contact info, recent visits, and navigation to the member's full profile.

**Independent Test**: Click a row in either table and verify the panel opens on the right with correct context (入館/退館済み), time, and badges; verify "会員詳細を開く" and the new-tab button both work; verify clicking a different row replaces the panel's content.

### Implementation for User Story 2

- [x] T017 [US2] Add `GetEntryExitLogQuickViewResponseSchema` (incl. nested `RecentVisitSchema`) to `src/app/api/_schemas/entry-exit-log.schema.ts`
- [x] T018 [US2] Implement `GET /api/crm/entry-exit-logs/[id]/quick-view/route.ts`: validate `id` param, call `db.entryExitLogs.getQuickView(id)`, register via `registerRoute()`, return 404 when the log id doesn't exist or its store is outside the requesting user's access scope
- [x] T019 [US2] Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmEntryExitLogsByIdQuickViewOptions`
- [x] T020 [P] [US2] Create `member-quick-view-sheet.tsx` in `src/app/(private)/entry-exit/_components/`: non-modal `Sheet` (`modal={false}`) taking a `logId: string | null` prop, calling `useQuery({ ...getCrmEntryExitLogsByIdQuickViewOptions({ path: { id: logId } }), enabled: logId !== null })` directly, rendering avatar/name/furigana/gender/context badge/time/contract/status badges/contact rows (omitting `phone`/`email` when `null`)/recent-visits list (rendering "-" when `duration_minutes` is `null`)/footer CTA `navigate('/members/[id]', data.member_id)` + external-link `window.open` button
- [x] T021 [US2] Add `onSelect(logId: string)` row-click handling to `activity-table.tsx` (from Phase 3), calling a callback prop instead of managing panel state internally
- [x] T022 [US2] Add `selectedLogId` state to `page.tsx`, wire both `ActivityTable` instances' `onSelect` to it, and render `MemberQuickViewSheet` with that state (`onOpenChange` clears it back to `null`)

**Checkpoint**: User Stories 1 AND 2 both work independently — activity tables render, and clicking any row opens a working Quick View panel.

---

## Phase 5: User Story 3 - Scope the displayed activity by date and store (Priority: P2)

**Goal**: Previous/next-day navigation, a calendar date picker, a past-date "履歴データ" indicator, and a conditional store filter all scope what the activity tables (and, once built, the chart) display.

**Independent Test**: Navigate to a past date and verify the "履歴データ" badge appears on both the date control and the page header; verify the store filter only appears for multi-store users viewing "全店舗"; verify changing date/store re-fetches the activity tables with the new scope.

### Implementation for User Story 3

- [x] T023 [US3] Create `src/app/(private)/entry-exit/_hooks/use-entry-exit-filters.hook.ts`: `nuqs`-backed `useQueryStates` for `date` (`parseAsString`, default = today's ISO date) and `store_id` (`parseAsString`, default `"all"`), following `src/app/(private)/training-equipment/_hooks/use-training-equipment-filters.hook.ts` as the reference pattern
- [x] T024 [P] [US3] Create `entry-exit-header-controls.tsx` in `src/app/(private)/entry-exit/_components/`: previous/next-day `Button`s, `Popover`+`Calendar` (`ja` locale) date picker, and a conditional store `Select` (shown only when the signed-in user has 2+ accessible stores AND the header-level store scope is "all"), all reading/writing the filters hook from T023
- [x] T025 [US3] Wire a past-date "履歴データ" `Badge`+`Tooltip` into `page.tsx`'s `PageHeader` badge slot, computed by comparing the filters hook's `date` against today's date
- [x] T026 [US3] Integrate `entry-exit-header-controls.tsx` into `page.tsx`'s `PageHeader` date-control slot, and pass the filters hook's `date`/`store_id` values into both `ActivityTable` instances' query (`getCrmEntryExitLogsOptions({ query: { direction, limit: 5, date, store_id } })`)
- [x] T027 [US3] In `src/app/api/crm/entry-exit-logs/route.ts`, confirm/extend the `date`/`store_id` query handling so `db.entryExitLogs.listByDirection` actually scopes by both (T012 already accepts the params — this task verifies the filtering logic itself, not just the schema)

**Checkpoint**: All of US1-US3 are independently functional — date/store scoping now drives what the activity tables show, with correct historical-data indication.

---

## Phase 6: User Story 4 - Read hourly entry volume at a glance (Priority: P3)

**Goal**: An hourly line chart (06:00–22:00) shows entry volume for the current date/store scope, with the current hour highlighted.

**Independent Test**: Load the page and verify the chart renders 17 hourly points with the y-axis in "人" units; verify the current hour's label and reference line are visually distinct; verify hovering a point shows a tooltip with the hour and count.

### Implementation for User Story 4

- [x] T028 [US4] Add `GetEntryExitHourlySummaryQuerySchema` and `GetEntryExitHourlySummaryResponseSchema` to `src/app/api/_schemas/entry-exit-log.schema.ts`
- [x] T029 [US4] Implement `GET /api/crm/entry-exit-logs/hourly-summary/route.ts`: validate query, call `db.entryExitLogs.getHourlySummary(...)`, register via `registerRoute()`, always return all 17 hour buckets (6-22) even when every count is 0
- [x] T030 [US4] Run `npm run generate-openapi` then `npm run generate-api` to produce `getCrmEntryExitLogsHourlySummaryOptions`
- [x] T031 [P] [US4] Create `hourly-entry-chart.tsx` in `src/app/(private)/entry-exit/_components/`: `ChartContainer` + Recharts `LineChart` (mirroring the existing chart config style in `src/components/ui/chart.tsx`), calling `useQuery({ ...getCrmEntryExitLogsHourlySummaryOptions({ query: { date, store_id } }) })` directly with the filters hook's current values (from Phase 5, if present, else defaults), highlighting the real current hour's x-axis label and drawing a "現在" reference line
- [x] T032 [US4] Integrate `HourlyEntryChart` into `page.tsx`'s "時間帯別入館者数" summary card, above the activity tables

**Checkpoint**: All four user stories are independently functional — the Phase 1 baseline described in spec.md is complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency and verification across all stories; no automated tests per constitution.

- [ ] T033 [P] **Deferred** — Wire the "入退館履歴ですべて表示" outbound link in `activity-table.tsx` to `navigate('/entry-exit-history')`. This app's `navigate()`/`RouteKey` system is strictly typed against routes that actually exist (auto-generated by `generate-routes` from `src/app/`); B-01-01 has no route yet, so this can't be added without either a raw string-literal href (forbidden by code-rule.md) or a route to a screen that's explicitly out of scope. Build this task once a future spec implements B-01-01.
- [x] T034 [P] Run `npm run lint` and `npm run type-check`; fix any violations across all new files
- [x] T035 Run `npm run build` to validate production compilation; record the result in `specs/013-entry-exit-management/quickstart.md`'s Verification Log
- [x] T036 Manually walk through spec.md's Success Criteria SC-001–SC-006 and record pass/fail notes in `specs/013-entry-exit-management/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS all user stories.
- **User Stories (Phases 3-6)**: All depend on Foundational (Phase 2) completion. US2 additionally depends on US1's `activity-table.tsx` existing (T021 modifies it); US3 additionally depends on US1's `ActivityTable` query call existing (T026 modifies it); US4 is independent of US2/US3 except for reusing the same filters hook if it already exists.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on other stories — this is the MVP.
- **US2 (P2)**: Starts after Phase 2. Extends US1's `activity-table.tsx` (T021) but the Quick View feature itself (panel content, its own endpoint) is independently built and testable once T021/T022 land.
- **US3 (P2)**: Starts after Phase 2. Extends US1's page wiring (T026) but the filter UI/logic itself is independently built and testable.
- **US4 (P3)**: Starts after Phase 2. Fully independent endpoint/component; only reuses US3's filters hook if present, else defaults to today/all-stores.

### Critical Ordering Constraints

- T013/T019/T030 (each story's `generate-openapi`+`generate-api` run) must follow that story's route implementation (T012/T018/T029 respectively) and precede that story's component that calls the generated hook (T015/T020/T031).
- T007 (register table in `_create-db.ts`) must follow T003-T006 and precede any route implementation that calls `db.entryExitLogs.*`.
- T010 (`generate-routes`) must follow T009 (page.tsx must exist for the route scanner to find it).

---

## Parallel Opportunities

- Setup: T001 and T002 can run in parallel.
- Foundational: T003 and T008 can run in parallel (different files); T004-T007 are sequential (each depends on the prior).
- US1: T014 can run in parallel with T011-T013; T015 depends on both T013 and T014.
- US2: T020 can run in parallel with T017-T019; T021/T022 depend on T020.
- US3: T024 can run in parallel with T023; T025-T027 depend on both.
- US4: T031 can run in parallel with T028-T030 up to the point of needing the generated client; T032 depends on T031.
- Polish: T033 and T034 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# After T013 (generated client ready):
Task: "Create entry-exit-badges.tsx in src/app/(private)/entry-exit/_components/"  # T014
# Then, once T014 is done:
Task: "Create activity-table.tsx in src/app/(private)/entry-exit/_components/"     # T015
```

## Parallel Example: User Story 3

```bash
Task: "Create use-entry-exit-filters.hook.ts in src/app/(private)/entry-exit/_hooks/"      # T023
Task: "Create entry-exit-header-controls.tsx in src/app/(private)/entry-exit/_components/" # T024 (can start structure in parallel, finish after T023's shape is known)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks everything).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Load `/entry-exit`, confirm both activity tables render with real mock data, badges, and correct empty/loading states.
5. This is a demonstrable MVP even without Quick View, date/store filtering, or the chart.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add US1 → validate independently → demo (MVP!).
3. Add US2 → validate Quick View independently → demo.
4. Add US3 → validate date/store scoping independently → demo.
5. Add US4 → validate hourly chart independently → demo.
6. Phase 7 polish once all four are in.

### Notes

- [P] tasks touch different files with no unresolved dependencies.
- Each user-story phase ends with a checkpoint — the feature is safe to pause there.
- No test-writing tasks exist anywhere in this list (constitution's absolute No Testing Policy) — validation is manual against `quickstart.md`.
- Commit after each task or logical group per repository convention.
