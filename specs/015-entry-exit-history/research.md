# Phase 0 Research: Entry/Exit History (B-01-01)

**Goal**: Resolve open technical unknowns and establish implementation-ready design decisions, grounded in this repository's actual implementation (`src/`) — including its sibling Phase-2 feature (`013-entry-exit-management`, already built at `src/app/(private)/entry-exit/`) — rather than the UI prototype (`.cache/fitness-crm-ui/`), which was only the source for `spec.md`'s business requirements.

---

## Decision R1: Route location — nested under the existing `/entry-exit` route

**Decision**: New route at `/entry-exit/history`, implemented as `src/app/(private)/entry-exit/history/page.tsx` — a child of the already-existing `(private)/entry-exit/` directory, not a new top-level `(private)/entry-exit-history/` directory.

**Rationale**: The PO spec frames this screen as "B-01（来館モニター）から遷移する管理者専用の履歴抽出画面" (a screen navigated to _from_ the B-01 monitor). Feature 013's own spec explicitly reserves an outbound link for this purpose (FR-B01-07: "入退館履歴ですべて表示"). This drill-down relationship matches the existing `/lockers` → `/lockers/pending` nesting convention exactly (parent screen + a linked-to sub-screen sharing the same feature family). `routes.config.ts` is auto-generated from the `src/app/(private)/...` directory tree (`npm run generate-routes`), so nesting under `entry-exit/` requires no manual route registration — only creating the new folder.

**Alternatives considered**:

- Top-level `(private)/entry-exit-history/` (mirroring the UI-prototype's separate `entry-exit-history.tsx` filename) — rejected: the prototype's flat file layout doesn't reflect a routing decision, and nesting better documents the parent-child navigation relationship the PO spec describes.

**Note (out of scope for this feature)**: Feature 013's own component tree (`entry-exit-section.tsx`, `activity-table.tsx`) does not yet contain the "入退館履歴ですべて表示" outbound link that FR-B01-07 requires — that gap belongs to feature 013, not this feature. This screen is fully reachable via its own route regardless; adding the missing link is a follow-up in 013, not part of this plan.

---

## Decision R2: Per-visit data model — extend `EntryExitLogRow`, derive a paired "history visit" view

**Decision**: Add two new fields directly to the existing `EntryExitLogRow` type (`src/app/api/_mock-db/types/entry-exit-logs.type.ts`), which already backs feature 013's per-event log table:

- `auth_method: 'qr' | 'nfc'` — set on every row (entry and exit direction alike).
- `result: 'success' | 'denied'` — set on entry-direction rows only; always `'success'` on exit-direction rows (an exit cannot be denied).

A new table method, `entryExitLogs.listHistory(params)`, derives **paired visit rows** for the history screen by matching each `direction: 'entry'` row to its same-member, same-store, chronologically-next `direction: 'exit'` row (reusing/generalizing the same nearest-following-exit heuristic feature 013 already uses for `MemberQuickView.recent_visits`). A denied entry row is never paired (it produced no exit). An entry row with no matching exit row yet is treated as an in-progress visit.

**Rationale**: `EntryExitLogRow` already models one row per swipe event (entry or exit are separate rows) — this is correct for feature 013's activity feed (which lists raw events) but not for this screen, which needs one row per _visit_ (FR-001/FR-010: entry time, exit time, duration together). Reusing the same underlying table (rather than introducing a parallel one) keeps a single source of truth for gate events; the "visit" shape is a query-time view, matching how `MemberQuickView.recent_visits` already derives paired visits from the same rows today.

**Alternatives considered**:

- A wholly separate `entry_exit_visits` table, written to directly by a (hypothetical) gate-authentication process — rejected: this codebase has no real gate-authentication backend (FR-M001–FR-M006 are explicitly out of scope per spec.md's Assumptions); introducing a second persisted table would just require the mock seed to keep two representations in sync for no benefit in a mock-DB Phase 1.
- Storing `entry_log_id`/`exit_log_id` foreign keys at seed time instead of pairing at query time — rejected: seed-time pairing would need to special-case "in progress" and "denied" rows anyway, and query-time pairing is already the established pattern (`buildRecentVisits`).

---

## Decision R3: Home store vs. visiting store — no schema change needed, already two distinct fields

**Decision**: "Visiting store" (入館店舗) is `EntryExitLogRow.store_id` (already exists — the store where the gate device recorded the swipe). "Home store" (所属店舗) is the member's own `store_id`/`store_name` (`member.schema.ts`, already exists on every member record — the member's registered/primary store). The history row simply joins both, exactly as feature 013 already joins member fields onto `ActivityRow` (research.md D1 in `013-entry-exit-management`).

**Rationale**: Both fields already exist independently in this codebase for an unrelated reason (member registration vs. gate location) — no new field or join concept is needed, just projecting both onto the same response row.

**Alternatives considered**: None — this was a discovery, not a design trade-off.

---

## Decision R4: CSV export — real file response (`csvFileResponse`), the pattern this codebase is actively converging on

**Decision**: `POST /crm/entry-exit-logs/export` accepts the same filters as the list query (minus `page`/`limit`) and returns an actual CSV file: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="entry_exit_history_<YYYYMMDD>.csv"`, built server-side via `buildCsv()` + `csvFileResponse()` (`src/app/api/_lib/csv.ts`). The client calls the generated mutation with `parseAs: 'blob'`, reads the filename via `getCsvFilenameFromContentDisposition()`, and passes the blob straight to `downloadCsv()` (`src/utils/csv.util.ts`) — matching `equipment-csv-export-button.tsx`/`training-equipment-csv-export-button.tsx`.

**Rationale**: This codebase has accumulated **three** distinct export response shapes over time, and this research went through two of them before finding the right one:

1. An `{exportId, status: 'processing'}` async-job shape (`member.schema.ts`) — dead code, never called from any UI.
2. A synchronous JSON-array shape (`locker.schema.ts`, `banner`-adjacent resources, `surveys/*`'s `{csv, filename}`-in-JSON variant) — working, but older (locker/banner/survey export routes predate July 2026).
3. A real file response via the shared `csvFileResponse()` helper (`src/app/api/_lib/csv.ts`, introduced 2026-07-01) — used by `equipment`, `controllers`, and `training-equipment`'s export routes, the **three most recently added** export features in the codebase (the latest, `training-equipment`, was added 2026-07-06 — the most recent commit touching any export route at all). `src/utils/csv.util.ts`'s `getCsvFilenameFromContentDisposition()` helper exists specifically to support this shape and is otherwise unused by the older JSON-based exporters.

Shape 3 is the one to follow: it's what every export feature actually being built right now uses, it produces a real downloadable file the browser handles natively (no client-side Blob construction from a JSON string), and it avoids baking BOM-handling/CSV-escaping logic into yet another page-local `_utils/*.util.ts` file the way the older JSON-array exporters each did independently.

**Alternatives considered**:

- The `{exportId, status}` async-job schema — rejected: dead code, would require building the only real async-export implementation in the entire codebase from scratch for a feature whose PO spec only asks for "抽出条件を保持したまま出力" (keep the applied filters on export), which a synchronous response already satisfies.
- The older JSON-array shape (lockers/banners) — rejected once the more-recent, actively-repeated `csvFileResponse` pattern was found; matching the _newest_ convention rather than an older one still present elsewhere in the codebase.

---

## Decision R5: New permissions — `EntryExitHistoryView` / `EntryExitHistoryExport`, following the `<resource>.<action>` convention

**Decision**: Add two entries to `Permission` (`src/types/permission.type.ts`):

- `EntryExitHistoryView = 'entry-exit-history.view'`
- `EntryExitHistoryExport = 'entry-exit-history.export'`

Register `PAGE_PERMISSIONS['/entry-exit/history'] = Permission.EntryExitHistoryView` (`src/constants/permission.constants.ts`) — enforced automatically by the existing `proxy.ts` → `canRoleAccessPage()` middleware, exactly as every other private page already is.

`ROLE_PERMISSIONS` additions, directly implementing spec.md FR-014/FR-017 and the PO permission matrix:
| Role | `EntryExitHistoryView` | `EntryExitHistoryExport` |
|---|---|---|
| System | ✓ (implicit — `System` holds `Object.values(Permission)`) | ✓ |
| Headquarter | ✓ | ✓ |
| Manager | ✓ | ✓ |
| Staff | ✗ (not granted by default) | ✗ (not granted by default) |
| Trainer | ✗ | ✗ |
| Observer | ✓ | ✗ |

**Rationale**: Matches the naming convention used by every existing permission pair (`LockersPendingView`/`LockersPendingExport`, `MembersBlacklistView`, etc.) and the exact per-role distribution the PO matrix and spec.md clarifications specify. "Granting Staff the permission later as a configuration change" (FR-014) means editing the `ROLE_PERMISSIONS[Staff]` static array — the same mechanism every permission grant in this app already uses; there is no separate dynamic/per-user permission override system anywhere in this codebase to build against, so this is not a limitation specific to this feature.

**Alternatives considered**: A single combined `EntryExitHistoryAccess` permission for both view and export — rejected: the PO matrix and FR-014/FR-017 require view and export to be independently grantable (Observer gets view but not export), which needs two permissions, matching the `View`/`Export` pair convention already used elsewhere.

---

## Decision R6: Observer store-scoping — reverted back to "own store only", matching Staff (supersedes the interim "unrestricted" resolution below)

**Original decision**: This research originally planned to extend `getAllowedStoreIds()`'s `Staff` branch to also cover `role === 'Observer'`, based on the PO matrix's "○ 所属店舗 参照のみ" (Observer sees their own store only) and the file's state at the time (Observer fell through to a zero-access `return []`, same as Trainer).

**Interim resolution (now reversed)**: Between this feature's planning and implementation, `src/app/api/_lib/auth.ts` was independently updated (uncommitted, in-progress work already present in the working tree, not authored by this feature) to a different resolution: `Observer` was treated as an unrestricted, org-wide read-only viewer (`getAllowedStoreIds` returned `null` for Observer, the same "all stores" behavior as System/Headquarter/Manager), with the rationale "Observer → read-only viewer with no store linkage." Spec.md's FR-008/SC-002 were updated to match at the time, and quickstart.md recorded a manual verification against that behavior.

**Why the interim resolution was wrong**: The "no store linkage" rationale was a factual claim, and it doesn't hold up against the prototype (`fitness-crm-ui`), the source of truth every other B-01 decision in this spec defers to:

- `src/pages/entry-exit-history.tsx:274`'s own permission-matrix comment reads `HQ全/Mgr管轄/Staff所属/Observer所属` — "Observer所属" groups Observer with Staff's "own store" scoping, not with HQ/Manager's "all stores."
- `src/pages/shared-header.tsx:90,188` hard-codes the UI split as "単一店舗ユーザー（Staff-A/Observer）" (single-store users: Staff-A/Observer) vs. the store-picker dropdown shown only to HQ/Manager/System — Observer is never in the "all stores" group.
- This codebase's own `src/app/api/_mock-db/tables/staff.table.ts` seed generator confirms the same shape: every generated staff record, including `role: 'observer'` ones, is assigned either a `linked_store_id` or a `linked_fc_company_id` via `staff_linkage` — identical to Staff. There is no generated Observer record with no linkage at all.
- `src/contexts/current-store.context.tsx` (frontend) already treats Observer as a single-store role ("Restricted roles (Staff/Trainer/Observer) have at most one linked store") — it was the backend's `getAllowedStoreIds` that had drifted from this, not the other way around.

The likely root cause: the mock-db's login-user seed (`src/app/api/_mock-db/seeds/user.seed.ts`) never set a `staff_id` on the sample Observer login (`observer@example.com`), so that one demo account genuinely had no resolvable linkage — which reads as "Observer has no store linkage" if you only look at that one seed row, even though every other Observer-role staff record in the system has one.

**Decision**: Reverse the interim resolution. `getAllowedStoreIds()`'s `Staff` branch now also covers `role === 'Observer'` (renamed to cover both), looking up the same `staff_linkage`/store record and returning `[linked_store_id]` (or the FC-company-wide list when only `linked_fc_company_id` is set). The sample Observer login now has a `staff_id` pointing at a staff record with a direct store linkage, so the demo account itself is no longer a special case. Spec.md's FR-008/SC-002 are reverted to say Observer sees only their own assigned store, matching the original plan.

**Rationale**: `getAllowedStoreIds` is the single shared authority for store scope used by every route (including this feature's `GET .../history` and `POST .../export`), so it must match the actual, demonstrated shape of Observer access rather than an assumption about one under-seeded demo row. This is the same "single source of truth, grounded in the actual codebase" principle the interim resolution itself invoked — it was simply applied to the wrong evidence (a missing seed link) instead of the prototype and the generic staff table, which are the real source of truth for this app's permission model.

**Follow-on implementation note**: The `isLoading` flag on `useCurrentStore()` and the `enabled` prop threaded through `ActivityTable`/`HourlyEntryChart` (feature 013's components), added alongside the interim resolution to avoid firing a query with the default "all stores" scope before the real, role-resolved scope is known, are unaffected by this reversal and still apply — `entry-exit-history-content.tsx` (this feature's T017) still MUST use the same `enabled: !isStoreScopeLoading` pattern.

**Alternatives considered**: Leave `getAllowedStoreIds` as the interim "Observer unrestricted" version and special-case Observer only inside this feature's own route handler — rejected, for the same reason as previously: duplicating store-scope logic locally would create a second, divergent source of truth. Leaving it as unrestricted permanently was also considered and rejected, since it contradicts the prototype, the UI's own single-store grouping, and the already-correct frontend `current-store.context.tsx`.

---

## Decision R7: Quick View reuse — extend the shared `context` enum rather than fork the component

**Decision**: Reuse `member-quick-view-sheet.tsx` and its backing `GET /crm/entry-exit-logs/{id}/quick-view` endpoint as-is for FR-012, passing the visit's `exit_log_id` when the visit is completed (yields `context: 'exit'` → "退館済み", matching the UI prototype's row-click behavior exactly) or `entry_log_id` when in-progress or denied. Decouple `MemberQuickViewSchema.context` from the stricter `EntryExitDirectionSchema` (`'entry' | 'exit'`, still used unchanged for `GetEntryExitLogsQuerySchema.direction`) into its own `QuickViewContextSchema = z.enum(['entry', 'exit', 'in-building', 'denied'])`, adding two new values only the history screen produces.

**Rationale**: Spec.md's Assumptions section already calls out this component as intentionally shared with the Phase 2 monitor screen. The existing two-value context (`'entry'`/`'exit'`) can't distinguish "still on-site" (FR-001's in-progress visits) or "denied" (FR-010) from a plain "just entered" event — both of which this screen introduces but feature 013 never needed. Splitting the enum keeps feature 013's existing calls (`activity-table.tsx`, always `'entry'` or `'exit'`) unaffected while giving this screen accurate labels.

**Alternatives considered**:

- Fork a second `HistoryQuickViewSheet` component — rejected: duplicates ~150 lines of UI for a single enum's worth of difference, and would need to be kept in sync with 013's sheet by hand.
- Force in-progress/denied visits into the existing `'entry'` value — rejected: silently mislabels a denied attempt as a successful entry in the same panel that legitimately shows successful entries, which is misleading to the staff member reading it.

---

## Decision R8: Filters — `nuqs` URL state, following the established list-screen hook shape

**Decision**: `use-entry-exit-history-filters.hook.ts` follows the exact shape of `use-banners-filters.ts`/`use-locker-pending-slots-filters.ts`: `useQueryStates` with `{page, limit, search, date_from, date_to, store_id, auth_method, result, sort_by, sort_order}`, a debounced local `searchInput` for the free-text box, `updateFilter`/`clearFilters`/`hasActiveFilters`/`activeDetailFilterCount` helpers, and a derived `queryParams` object shaped to match the generated `GetEntryExitHistoryQuery` type (plus an `exportQueryParams` omitting `page`/`limit` for the export mutation).

**Rationale**: This is the uniform convention across every filterable list screen already in this codebase (013's own `use-entry-exit-filters.hook.ts` included, for its simpler single-date/store case) — no reason to deviate for this screen. `clearFilters()` in the live convention (`use-banners-filters.ts`) does reset the search input too, which resolves spec.md's Q&A item on "Clear All" scope in favor of clearing search (matching the actual codebase convention, superseding the UI prototype's behavior, which didn't).

**Alternatives considered**: Plain component `useState` (matching the UI prototype exactly) — rejected: loses shareable/bookmarkable filter URLs and is inconsistent with every other list screen in this app.

---

## Decision R9: Data fetching — no custom wrapper hook; call generated React Query options directly

**Decision**: `history/page.tsx`'s content component calls `useQuery({...getCrmEntryExitLogsHistoryOptions({query: queryParams})})` directly (post `generate-openapi`/`generate-api`), exactly as `banners/page.tsx` calls `getCrmBannersOptions`. CSV export uses a small `useEntryExitHistoryCsvExport()` `useMutation` wrapper (matching `useLockerPendingSlotsCsvExport`), not because data-fetching needs wrapping in general, but because every export mutation in this codebase wraps its `onSuccess`/`onError` (CSV build + toast) once, for reuse if the button is ever needed in more than one place.

**Rationale**: Matches feature 013's own Decision D11 (no data-fetching wrapper hook) and the banners/lockers precedent exactly.

**Alternatives considered**: None — this is uncontested existing convention.

---

## Decision R10: Empty/loading/error states — `Empty` + inline error block, matching banners (not `DataStateBoundary`)

**Decision**: Use `Empty` (`variant="filtered"` when `hasActiveFilters`, else `variant="empty"`) as `DataTable`'s `emptyContent`, `DataTable`'s own `isLoading` prop for the loading state, and an inline retry block for `isError` — the exact composition `banners/page.tsx` uses, not feature 013's `DataStateBoundary` triad.

**Rationale**: `DataStateBoundary` is used by feature 013's simpler, unpaginated, non-filterable activity tables. Every screen in this codebase that has pagination + filters (banners, lockers) instead uses `DataTable`'s built-in `isLoading`/`emptyContent` composition with the shared `Empty` component — this is the correct precedent for _this_ screen's shape (filterable, paginated table), not the simpler sibling. This also directly satisfies spec.md's Clarifications answer on empty-result state (filtered vs. genuinely-empty distinction).

**Alternatives considered**: `DataStateBoundary` (013's pattern) — rejected: that component doesn't compose with `DataTable`'s pagination/sorting state the way `banners`/`lockers` already do; using it here would be inconsistent with every other paginated list screen.

---

## Decision R11: No server-side `hasPermission()` check on the history/export routes — page-level gate covers view access; export relies on client-side `RoleGatedButton`, matching every existing export route

**Decision**: `GET .../history` and `POST .../export` do **not** call a `hasPermission(Permission.EntryExitHistoryView/Export)` check server-side. `GET .../history` only 403s when `getAllowedStoreIds(user)` resolves to an empty array (identical to the sibling `entry-exit-logs/route.ts`). `POST .../export` performs no authorization check beyond `getAuthUserFromRequest`'s 401 (identical to `equipment/export/route.ts`, `controllers/export/route.ts`, `training-equipment/export/route.ts`).

**Rationale**: View access (FR-017) is already enforced before either endpoint is ever called — `proxy.ts` blocks any role without `Permission.EntryExitHistoryView` from reaching the `/entry-exit/history` page at all via `PAGE_PERMISSIONS`. For the export action (FR-014), a search across every existing export route in this codebase found **zero** that perform a server-side permission check — all of them (equipment, controllers, training-equipment) rely entirely on the client-side `RoleGatedButton` to disable the trigger, with no defense-in-depth at the API layer. `hasPermissions()` (`src/utils/permission.util.ts`) exists but is never called from any `route.ts` file. Introducing a novel, unprecedented server-side permission-check pattern for only this one feature's export endpoint — while every sibling export endpoint lacks it — would be inconsistent special-casing not requested by anyone, and would misrepresent this feature as more secure than the rest of the app in a way that isn't actually true (a determined caller can already bypass every other export's client-side gate the same way). Matching the existing, uniform convention is the more honest and consistent choice.

**Alternatives considered**: Add the server-side check anyway, as originally drafted in `contracts/export-entry-exit-history.md` — rejected after finding this codebase-wide precedent; kept as a documented gap instead (see quickstart.md's Phase 2/Follow-up Notes) rather than silently fixing every export route's authorization as an unrequested side effect of this feature.

---

## Implementation order

Following this codebase's OpenAPI-first convention (constitution Principle II, 013's Decision D10):

1. Extend `entry-exit-log.schema.ts` (new query/response/export schemas, extended `EntryExitLogRow` type, split `QuickViewContextSchema`).
2. Extend `entry-exit-log.table.ts` (`listHistory` method) and `entry-exit-log.seed.ts` (seed `auth_method`/`result`, plus denied and in-progress example rows).
3. Add `Permission.EntryExitHistoryView`/`EntryExitHistoryExport` and their `PAGE_PERMISSIONS`/`ROLE_PERMISSIONS` entries.
4. Fix `getAllowedStoreIds` for Observer.
5. New mock routes: `GET /crm/entry-exit-logs/history`, `POST /crm/entry-exit-logs/export` (built via `buildCsv()` + `csvFileResponse()` from `src/app/api/_lib/csv.ts`, per Decision R4).
6. `npm run generate-openapi && npm run generate-api`.
7. `src/app/(private)/entry-exit/history/page.tsx` + `_hooks/` + `_components/`, reusing `../_components/member-quick-view-sheet.tsx`.
8. `npm run generate-routes` (or let `npm run dev`/`build` run it automatically) so `/entry-exit/history` is registered.
