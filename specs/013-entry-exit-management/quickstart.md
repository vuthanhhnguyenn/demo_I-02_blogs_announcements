# Quickstart: B-01 入退館管理 (Entry-Exit Management) — Phase 1 Baseline Activity View

**Goal**: Build and validate the Phase 1 entry-exit baseline end-to-end with mock-backed data.

---

## Implementation Checklist

- [x] Add `entry-exit-log.schema.ts` under `src/app/api/_schemas/` for log/activity-row/hourly-summary/quick-view request+response shapes
- [x] Add `entry-exit-log.table.ts` (query/aggregate methods) + `entry-exit-logs.type.ts` under `src/app/api/_mock-db/`
- [x] Seed `entry-exit-log.seed.ts` per data-model.md's Phase 1 Seed Requirements (zero-row scope, missing avatar, orphan exit, `visit_count = 0`, 2+ stores)
- [x] Implement `GET /api/crm/entry-exit-logs` (direction/limit/date/store_id)
- [x] Implement `GET /api/crm/entry-exit-logs/hourly-summary` (date/store_id)
- [x] Implement `GET /api/crm/entry-exit-logs/{id}/quick-view`
- [x] Run `npm run generate-openapi` then `npm run generate-client` to refresh `src/lib/api/` (ran per-endpoint, three times)
- [x] Add `_hooks/use-entry-exit-filters.hook.ts` (`nuqs` URL-state for `date`/`store_id` — no data-fetching hook; see research.md D11)
- [x] Build `page.tsx` Server Component shell for `/entry-exit` (delegates to a client `entry-exit-section.tsx`, following the `studios` RSC-shell + `_components` pattern rather than a direct client `page.tsx`)
- [x] Build `entry-exit-header-controls.tsx`: previous/next-day buttons, `Popover`+`Calendar` date picker, past-date "履歴データ" badge+tooltip, conditional store `Select`
- [x] Build `hourly-entry-chart.tsx` using `src/components/ui/chart.tsx` (Recharts `LineChart`, current-hour reference line)
- [x] Build `activity-table.tsx` (shared Entry/Exit table) wrapped in `DataStateBoundary` with a table-row `Skeleton` fallback
- [x] Build `entry-exit-badges.tsx`: frequency badge (常連/久しぶり) and companion badge (招待者/同伴者) with tooltips
- [x] Replace raw `<img>` avatars with `Avatar`/`AvatarImage`/`AvatarFallback`
- [x] Build `member-quick-view-sheet.tsx`: non-modal `Sheet` (`modal={false}`), fetches quick-view payload on row click, footer CTA to member detail + "open in new tab"
- [ ] **Deferred** — outbound "入退館履歴ですべて表示" link to the entry-exit history route: this app's `navigate()`/`RouteKey` system is strictly typed against routes that actually exist (auto-generated from `src/app/` by `generate-routes`), and B-01-01 is explicitly out of scope with no route to point to. Adding a raw string-literal href would violate this codebase's "no string-literal navigation" rule for a link that would only ever 404. Build this link when a future spec implements the B-01-01 screen.
- [x] Verify store-filter visibility rule — implemented as originally specified: `src/components/layout/app-header.tsx`'s store-selector slot (previously a static, non-functional placeholder) is now a real global selector (`src/contexts/current-store.context.tsx` + `src/components/layout/store-selector.tsx`), ported from the prototype's `shared-header.tsx`. `entry-exit-header-controls.tsx`'s page-local store filter now only renders when the header scope is "全店舗" AND the user has 2+ accessible stores, exactly matching FR-B01-11 and the prototype's `showStoreFilter` condition. See research.md D14.

---

## Suggested File Targets

```text
src/
├── app/
│   ├── api/
│   │   ├── crm/
│   │   │   └── entry-exit-logs/
│   │   │       ├── route.ts
│   │   │       ├── hourly-summary/route.ts
│   │   │       └── [id]/quick-view/route.ts
│   │   ├── _schemas/
│   │   │   └── entry-exit-log.schema.ts
│   │   └── _mock-db/
│   │       ├── tables/entry-exit-log.table.ts
│   │       ├── types/entry-exit-logs.type.ts
│   │       └── seeds/entry-exit-log.seed.ts
│   └── (private)/
│       └── entry-exit/
│           ├── page.tsx
│           ├── _hooks/
│           │   └── use-entry-exit-filters.hook.ts   # nuqs URL-state only (date, store_id) — no data-fetching hook
│           └── _components/
│               ├── entry-exit-header-controls.tsx
│               ├── hourly-entry-chart.tsx            # calls generated getCrmEntryExitLogsHourlySummaryOptions() directly
│               ├── activity-table.tsx                # calls generated getCrmEntryExitLogsOptions() directly
│               ├── entry-exit-badges.tsx
│               └── member-quick-view-sheet.tsx       # calls generated getCrmEntryExitLogsByIdQuickViewOptions() directly
└── components/
    └── ...                                # Reuse existing ui/common primitives — no new ones
```

---

## Step-by-Step Flow

1. **Define schema contract first**
   - Zod schemas for `EntryExitLog`, `ActivityRow`, `HourlyEntryCount`, `RecentVisit`, `MemberQuickView`.
   - Export inferred TS types for reuse across route handlers and components.

2. **Seed mock data**
   - Add `entry_exit_logs` rows covering both directions, both frequency-badge values, an inviter/invitee pair, a zero-visit member, a no-avatar member, an orphaned exit, and 2+ stores.
   - Add table methods: `listByDirection({direction, limit, date, storeId})`, `getHourlySummary({date, storeId})`, `getQuickView(logId)`.

3. **Implement the three routes**
   - `GET /api/crm/entry-exit-logs` — validate `direction`, apply `limit`/`date`/`store_id`, join member fields, return `ActivityRow[]`.
   - `GET /api/crm/entry-exit-logs/hourly-summary` — aggregate `entry` logs into 17 hour buckets (6–22), always returning all 17.
   - `GET /api/crm/entry-exit-logs/{id}/quick-view` — resolve the log row, join member + contract + contact, compute `recent_visits` (last 3 exits, paired duration), 404 on unknown/out-of-scope id.

4. **Regenerate the API client**
   - `npm run generate-openapi` then `npm run generate-api`.
   - This produces `getCrmEntryExitLogsOptions`, `getCrmEntryExitLogsHourlySummaryOptions`, and `getCrmEntryExitLogsByIdQuickViewOptions` (exact names depend on the generated route paths) under `@/lib/api/@tanstack/react-query.gen`. Per this codebase's convention (research.md D11), these are called directly with `useQuery({ ...optionsFn(...) })` inside each component — there is no custom wrapper hook.

5. **Build the page**
   - `page.tsx` as a Server Component shell rendering `SharedSidebar`/`SharedHeader`/`PageHeader` equivalents already used by sibling pages, plus the client components below.
   - `_hooks/use-entry-exit-filters.hook.ts`: `nuqs`-backed URL state for `date`/`store_id`, following `use-training-equipment-filters.hook.ts` / `use-members-filters.ts` as the reference pattern.
   - `entry-exit-header-controls.tsx`: date nav + store filter + historical badge (client), reading/writing the filters hook above.
   - `hourly-entry-chart.tsx`: calls `useQuery({ ...getCrmEntryExitLogsHourlySummaryOptions({ query: { date, store_id } }) })` directly for the current filter state.
   - `activity-table.tsx`: one instance per direction, each calling `useQuery({ ...getCrmEntryExitLogsOptions({ query: { direction, date, store_id } }) })` directly; renders `DataStateBoundary` (loading skeleton / empty / error+retry) around the `Table`.
   - `member-quick-view-sheet.tsx`: opened via row-click state, calls `useQuery({ ...getCrmEntryExitLogsByIdQuickViewOptions({ path: { id: log_id } }) })` directly for the clicked row.

6. **Validate acceptance scenarios**
   - Run through spec.md's User Stories 1–4 acceptance scenarios manually.
   - Verify all Edge Cases from spec.md render as specified (empty/loading/missing-avatar/orphan-duration).

---

## Verification Commands

```bash
npm run lint
npm run type-check
```

Per the constitution's "No Testing Policy," no automated test suite exists or should be added. Quality assurance is: `tsc --noEmit`, ESLint/Prettier, manual verification against this quickstart, and code review.

---

## Implementation Command Order (Phase 1)

```bash
# 1) Refresh OpenAPI from registered route schemas
npm run generate-openapi

# 2) Regenerate API client from the latest openapi.json
npm run generate-client   # (generate-api also works — same output, wraps with dotenv)

# 3) Validate production compilation
npm run build
```

---

## Verification Log

- 2026-07-07: `npm run lint` — clean, zero errors/warnings across the full project.
- 2026-07-07: `npm run type-check` (`tsc --noEmit`) — clean, zero errors, run repeatedly after every phase.
- 2026-07-07: `npm run build` — succeeded; `/entry-exit` and all three new API routes (`/api/crm/entry-exit-logs`, `/api/crm/entry-exit-logs/[id]/quick-view`, `/api/crm/entry-exit-logs/hourly-summary`) compiled and appear in the route manifest.
- 2026-07-07: Started the real dev server and exercised all three new endpoints over HTTP with a real login-issued Bearer token (Headquarter role) — all returned correctly joined, real mock-db data (see contracts/\*.md for the exact shapes returned).
- 2026-07-07: Drove the actual `/login` form and `/entry-exit` page in headless Chrome. Confirmed: both activity tables render with real rows/avatars/badges on first load, the hourly chart renders with the current-hour reference line, and clicking an activity row opens the Member Quick View panel with correct identity/context/contract/contact/recent-visits data. Zero browser console errors. Screenshots reviewed directly (not just asserted from DOM text).
- 2026-07-07: Post-implementation review (`speckit-review`, mandatory `after_implement` hook) found and fixed 3 code-rule violations: `entry-exit-badges.tsx` importing domain types from the hand-written schema instead of generated `types.gen.ts`, and `hourly-entry-chart.tsx`/`member-quick-view-sheet.tsx` fetching data without `DataStateBoundary` (no loading skeleton or error/retry). Re-verified in browser after fixing — identical rendering, zero console errors.
- 2026-07-07: Implemented the global header store selector (research.md D14) after discovering `app-header.tsx`'s store-selector slot was a non-functional placeholder. Verified in browser as three separate roles/scenarios: (1) Headquarter — opened the header dropdown (search input, "全体"/"店舗" groups, brand badges, checkmark on current selection, screenshot confirmed), selected a specific store, confirmed the page-local override filter correctly disappeared and the activity tables/chart correctly re-scoped to that store's data (which is genuinely empty for the seeded dataset — this also incidentally verified the SC-006 zero-row empty state end-to-end, `DataStateBoundary`'s `Empty` state rendered correctly with recovery messaging); (2) Staff (single-store role) — header renders the non-interactive fixed display (no chevron), page-local filter correctly absent, data correctly scoped to that staff member's own store. Zero console errors across all scenarios.

---

## Manual Verification Checklist (maps to spec.md Success Criteria)

- [x] SC-001: Opening `/entry-exit` immediately shows both activity tables with no extra clicks. **Verified** — real browser screenshot shows both "入館" and "退館" cards populated on first load.
- [~] SC-002: Hovering a frequency or companion badge shows its explanatory tooltip. Badge components render correctly (confirmed via mock-db data + UI code review); the hover interaction itself was not driven in this pass.
- [~] SC-003: Chevron and calendar-pick date changes both work; historical badge appears for any date before today. Date control renders correctly ("2026年7月7日(火)"); chevron/calendar click-through and the historical badge's past-date state were not driven in this pass — logic verified by code review (`isBefore(startOfDay(...))` in `entry-exit-section.tsx`).
- [x] SC-004: store filter shown only for multi-store users with header scope = all stores; hidden otherwise. **Fully verified** per research.md D14 — HQ user: header dropdown interactive with 10 real stores, page-local filter visible while header="全店舗" and hidden immediately after picking a specific store; Staff user: header shows the fixed non-interactive display, page-local filter absent throughout.
- [~] SC-005: Row click → Quick View → "会員詳細を開く" reaches the member's profile in 2 clicks. Row click → Quick View opening **verified** via screenshot (correct identity, context, contract, contact info, recent-visits state); the final navigation click on "会員詳細を開く" was not driven in this pass.
- [x] SC-006: A date/store scope with zero logged rows shows the shared empty state. **Verified** (incidentally, while testing SC-004) — switching the header to "Fit365渋谷店" (a store with no seeded rows) showed `DataStateBoundary`'s `Empty` state ("本日の入館記録はありません" / "本日の退館記録はありません") on both tables, not a blank table.

**Verification method used**: started the real dev server (`npm run dev`), logged in as `admin@example.com` (Headquarter role) via the actual `/login` form, then loaded `/entry-exit` in headless Chrome (Playwright driver, temporarily installed with `--no-save` and removed afterward — no `package.json`/lockfile changes). Zero browser console errors. Also hit all three new endpoints directly over HTTP with a real Bearer token (`/crm/entry-exit-logs?direction=entry|exit`, `/crm/entry-exit-logs/hourly-summary`, `/crm/entry-exit-logs/{id}/quick-view`) — all returned correct, real-joined data.

## Phase 2 Note

When B-01's Phase 2 monitor (KPI counters, 在館者 tab, notification panel, real badge-threshold logic) is scoped:

- Implement it as an additive feature/spec rather than retrofitting a runtime phase-toggle into this page.
- Reuse the `entry_exit_logs` table and endpoints built here — Phase 2 mainly adds new aggregation endpoints (in-building roster, KPI counts) on top of the same data.
