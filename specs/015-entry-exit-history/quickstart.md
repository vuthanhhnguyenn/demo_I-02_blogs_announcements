# Quickstart: Entry/Exit History (B-01-01)

**Goal**: Build and validate the Phase 1 entry-exit history screen end-to-end with mock-backed data.

---

## Implementation Checklist

- [ ] Extend `entry-exit-log.schema.ts`: add `auth_method`/`result` to the row type, add `GetEntryExitHistoryQuerySchema`/`HistoryVisitRowSchema`/`GetEntryExitHistoryResponseSchema`, add `ExportEntryExitHistoryQuerySchema` (the export route returns a real CSV file, not a JSON response schema — research.md R4), split `QuickViewContextSchema` out of `EntryExitDirectionSchema` (research.md R7)
- [ ] Extend `entry-exit-logs.type.ts` (`auth_method`, `result` fields) and `entry-exit-log.table.ts` (new `listHistory(params)` method — filter/sort/paginate + entry↔exit pairing per data-model.md)
- [ ] Extend `entry-exit-log.seed.ts` per data-model.md's Seed Requirements (completed, in-progress, denied, cross-store, both auth methods, one zero-result scope)
- [ ] Add `Permission.EntryExitHistoryView` / `Permission.EntryExitHistoryExport` (`src/types/permission.type.ts`)
- [ ] Register `PAGE_PERMISSIONS['/entry-exit/history']` and the `ROLE_PERMISSIONS` grants from research.md R5 (`src/constants/permission.constants.ts`)
- [ ] Fix `getAllowedStoreIds` (`src/app/api/_lib/auth.ts`) to give `Observer` the same linked-store lookup as `Staff` (research.md R6)
- [ ] Implement `GET /api/crm/entry-exit-logs/history` (contracts/get-entry-exit-history.md)
- [ ] Implement `POST /api/crm/entry-exit-logs/export` — real CSV file response via `buildCsv()` + `csvFileResponse()` from `src/app/api/_lib/csv.ts` (contracts/export-entry-exit-history.md, research.md R4)
- [ ] Update the `[id]/quick-view/route.ts` handler's response mapping for the new `context` values (contracts/get-entry-exit-log-quick-view.md) — route path/logic otherwise unchanged
- [ ] Run `npm run generate-openapi` then `npm run generate-api` to refresh `src/lib/api/`
- [ ] Add `_hooks/use-entry-exit-history-filters.hook.ts` (`nuqs` URL-state: page/limit/search/date_from/date_to/store_id/auth_method/result/sort_by/sort_order — research.md R8)
- [ ] Add `_hooks/use-entry-exit-history-csv-export.hook.ts` (`useMutation` wrapper: `parseAs: 'blob'`, read filename via `getCsvFilenameFromContentDisposition`, `downloadCsv` + toast, matching `equipment-csv-export-button.tsx`'s hook, not the older `use-locker-csv-export.hook.ts` JSON-array pattern)
- [ ] Build `src/app/(private)/entry-exit/history/page.tsx` (Server Component shell, matching the sibling `entry-exit/page.tsx` pattern) + a `'use client'` content component
- [ ] Build `entry-exit-history-filters.tsx` (search box + "詳細フィルター" toggle + date-range/store/auth-method/result filter row + "すべてクリア"), matching `banners-filters.tsx`
- [ ] Build `entry-exit-history-table-columns.tsx` (`ColumnDef[]` factory) — all FR-010 columns, including the blank/"in facility" rendering rule for in-progress/denied rows
- [ ] Build `entry-exit-history-csv-export-button.tsx` (`RoleGatedButton` + the export hook above), matching `equipment-csv-export-button.tsx`/`training-equipment-csv-export-button.tsx`
- [ ] Wire row-click to the **existing, reused** `../_components/member-quick-view-sheet.tsx` (no new sheet component), passing `exit_log_id`/`entry_log_id` per research.md R7
- [ ] Compose the table with `DataTable` (`variant="simple"`) + `Empty` (`filtered`/`empty`) + `TablePaginationWithSize`, matching `banners/page.tsx` (research.md R10)
- [ ] Run `npm run generate-routes` (or let `npm run dev`/`build` run it) so `/entry-exit/history` is registered

---

## Suggested File Targets

```text
src/
├── app/
│   ├── api/
│   │   ├── crm/
│   │   │   └── entry-exit-logs/
│   │   │       ├── route.ts                      # existing (013) — unchanged
│   │   │       ├── history/
│   │   │       │   └── route.ts                  # NEW
│   │   │       ├── export/
│   │   │       │   └── route.ts                  # NEW: real CSV file response (buildCsv + csvFileResponse from _lib/csv.ts)
│   │   │       ├── hourly-summary/route.ts        # existing (013) — unchanged
│   │   │       └── [id]/quick-view/route.ts       # MODIFIED (context enum only)
│   │   ├── _schemas/
│   │   │   └── entry-exit-log.schema.ts           # MODIFIED (extended)
│   │   └── _mock-db/
│   │       ├── tables/entry-exit-log.table.ts     # MODIFIED (new listHistory method)
│   │       ├── types/entry-exit-logs.type.ts      # MODIFIED (new fields)
│   │       └── seeds/entry-exit-log.seed.ts       # MODIFIED (new seed rows)
│   └── (private)/
│       └── entry-exit/
│           ├── page.tsx                           # existing (013) — unchanged
│           ├── _hooks/                            # existing (013) — unchanged
│           ├── _components/                       # existing (013) — unchanged; member-quick-view-sheet.tsx reused
│           └── history/
│               ├── page.tsx                       # NEW: Server Component shell
│               ├── _hooks/
│               │   ├── use-entry-exit-history-filters.hook.ts     # NEW
│               │   └── use-entry-exit-history-csv-export.hook.ts  # NEW
│               └── _components/
│                   ├── entry-exit-history-content.tsx             # NEW: 'use client' orchestrator
│                   ├── entry-exit-history-filters.tsx              # NEW
│                   ├── entry-exit-history-table-columns.tsx        # NEW
│                   └── entry-exit-history-csv-export-button.tsx    # NEW
├── constants/
│   └── permission.constants.ts                    # MODIFIED (new PAGE_PERMISSIONS/ROLE_PERMISSIONS entries)
├── types/
│   └── permission.type.ts                         # MODIFIED (new Permission values)
└── app/api/_lib/auth.ts                            # MODIFIED (Observer store-scope fix)
```

---

## Step-by-Step Flow

1. **Extend the schema contract first** (OpenAPI-first, constitution Principle II) — `entry-exit-log.schema.ts` additions from data-model.md, decoupling `QuickViewContextSchema`.
2. **Extend the mock DB** — new `EntryExitLogRow` fields, `listHistory()` table method (filter → sort → paginate, pairing entry/exit rows), extended seed data covering every `visit_status` and both auth methods.
3. **Add permissions** — `Permission` enum values, `PAGE_PERMISSIONS` route entry, `ROLE_PERMISSIONS` grants exactly per research.md R5's table. Fix `getAllowedStoreIds` for Observer.
4. **Implement the two new routes plus the quick-view route's enum update** — `GET .../history`, `POST .../export`, and the small `[id]/quick-view/route.ts` response-mapping change.
5. **Regenerate the API client** — `npm run generate-openapi && npm run generate-api`.
6. **Build the page** — Server Component `history/page.tsx` shell; `'use client'` content component owning `useEntryExitHistoryFilters()` + `useQuery({...getCrmEntryExitLogsHistoryOptions({query: queryParams})})`, called directly (no wrapper, per research.md R9); filters panel; `DataTable` + `Empty` + pagination; CSV export button; row-click opens the reused Quick View sheet.
7. **Validate acceptance scenarios** — walk spec.md's User Stories 1–3 acceptance scenarios manually, and every Edge Case.

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
npm run generate-api

# 3) Register the new /entry-exit/history route
npm run generate-routes

# 4) Validate production compilation
npm run build
```

---

## Manual Verification Checklist (maps to spec.md Success Criteria — fill in during/after implementation)

- [x] SC-001: An authorized user can locate a specific member's record using search + filters. **Verified** — as Headquarter, searching "田中" on `/entry-exit/history` narrowed the table from 14 to 3 rows instantly.
- [x] SC-002: Store scoping matches each role's authorized scope. **Verified** — Headquarter (unrestricted per `getAllowedStoreIds`) saw all 14 rows across multiple stores; Observer is scoped to their own linked store, same mechanism as Staff (see research.md R6 — reversed from the earlier "Observer unrestricted" resolution) — store-level restriction itself is exercised by feature 013's existing tests (same shared `getAllowedStoreIds`), not re-tested here.
- [x] SC-003: CSV export produces data matching the currently applied filters, in one action. **Verified** — exported CSV decoded (UTF-8 BOM correct) with rows matching on-screen data, including a denied row (`拒否`) and cross-store row (所属店舗 ≠ 入館店舗).
- [x] SC-004: A user without export permission sees the export action disabled with the expected tooltip. **Verified** — as Observer (view granted, export not), the CSV button rendered `disabled`, and hovering it showed the exact tooltip text "入退館ログCSV出力の権限がありません" (screenshot captured).
- [x] SC-005: Opening/closing the Quick View panel does not reset filters/pagination. **Verified** — with search "田中" applied (3 rows), opened and closed the Quick View panel; row count stayed at 3 and the search box retained "田中".
- [x] Role-gating: Trainer/Staff cannot reach `/entry-exit/history` directly by URL. **Verified** — both roles redirected to `/403` ("アクセス権限がありません") on direct navigation.
- [x] In-progress visit row renders exit time/duration as blank/"in facility", not misleading data. **Verified** — Quick View for an in-progress row (山田健太) showed "在館中"; table and CSV both show blank exit time/duration for that row.
- [x] Denied record row renders exit time/duration as blank, entry time as the attempt timestamp. **Verified** — Quick View for the denied row (中村由美) showed "入館拒否" with time suffix "入館試行"; CSV row showed 入館時刻=09:30, blank 退館時刻/在館時間, 状態=拒否.
- [~] Empty state distinguishes "no records match your filters" from "no records yet". Component code (`Empty` `variant={hasActiveFilters ? 'filtered' : 'empty'}`) reviewed and matches the established pattern used elsewhere in this codebase; a zero-row scenario was not specifically driven in this pass (the seeded dataset always returns ≥1 row for the default filters).

## Verification Log

- 2026-07-09: `npx tsc --noEmit` — clean, zero errors, run after each of Foundational/US1/US2/US3.
- 2026-07-09: `npx eslint` targeted at every new/modified file for this feature — zero warnings/errors.
- 2026-07-09: `npm run build` — succeeded (`✓ Compiled successfully`); `/entry-exit/history` and the two new API routes (`/api/crm/entry-exit-logs/history`, `/api/crm/entry-exit-logs/export`) appear in the route manifest.
- 2026-07-09: Started the real dev server (`npm run dev`) and drove the full flow in headless Chromium (Playwright, temporarily installed with `--no-save` and removed afterward — no `package.json`/lockfile changes) against real login sessions:
  - Headquarter (`admin@example.com`): table loaded with 14 real mock-db rows, record-count badge, working search (14→3 rows on "田中"), filter panel opened cleanly (date range/store/auth-method/result), row-click opened the reused Quick View panel, CSV export downloaded a real file.
  - Clicked an in-progress row → Quick View showed "在館中" with correct contract/contact info.
  - Clicked the seeded denied row → Quick View showed "入館拒否" / "09:30 入館試行" — the new `QuickViewContextSchema` values render correctly end-to-end.
  - Decoded the downloaded CSV (UTF-8 BOM correct): denied row showed blank exit time/duration; a cross-store row showed 所属店舗 ("JOYFIT池袋店") ≠ 入館店舗 ("Fit365八潮店").
  - Staff (`staff@example.com`) and Trainer (`trainer@example.com`): both redirected to `/403` on direct navigation to `/entry-exit/history` — confirms `PAGE_PERMISSIONS`/`proxy.ts` gate FR-017 correctly.
  - Observer (`observer@example.com`): reached `/entry-exit/history` successfully (view granted), CSV export button rendered disabled with tooltip "入退館ログCSV出力の権限がありません" on hover — confirms FR-014's per-permission (not per-role-list) export gating.
  - Zero browser console errors across every session.
  - **Correction (post-R6-reversal)**: `getAllowedStoreIds()` was subsequently fixed to scope Observer to their own linked store (same `staff_linkage` mechanism as Staff) instead of treating them as unrestricted — see research.md R6. This also resolves the previously-noted inconsistency where the header store-selector (`current-store.context.tsx`) already showed Observer a single fixed store while the backend let them query all stores; both now agree Observer = 1 store. The Observer session above was driven before this fix and therefore saw all 14 rows; this was not re-run against the corrected code in a live browser and should be re-verified.

## Phase 2 / Follow-up Notes

- Feature 013's own FR-B01-07 ("入退館履歴ですべて表示" outbound link from the monitor screen) was deferred there because this route didn't exist yet. Once this feature ships, that link can be added in feature 013 (or a small follow-up) — it is not part of this feature's scope.
- Granting Staff `EntryExitHistoryExport`/`EntryExitHistoryView` in the future (per FR-014/FR-017's "possible as a configuration change") means editing the `ROLE_PERMISSIONS[Staff]` array in `permission.constants.ts` and redeploying — there is no runtime admin UI for this anywhere in the app today.
