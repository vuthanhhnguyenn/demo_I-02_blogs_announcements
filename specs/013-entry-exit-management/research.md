# Phase 0 Research: B-01 入退館管理 (Entry-Exit Management) — Phase 1 Baseline Activity View

**Goal**: Resolve open technical unknowns and establish implementation-ready design decisions for Phase 1, grounded in this repository's actual implementation (`src/`) rather than the UI prototype (`.cache/fitness-crm-ui/`), which was only the source for `spec.md`'s business requirements.

---

## Decision D1: Activity row data comes from a real mock-db join, not static arrays

**Decision**: Persist entry/exit events in a new `entry_exit_logs` mock-db table keyed by `member_id` + `store_id` + `direction` + `occurred_at`. Display fields shown in the UI (name, furigana, gender, contract name, avatar) are **joined from the existing `members` table** at query time — they are not duplicated as static mock fields the way the prototype's `ENTRY_ROWS`/`EXIT_ROWS` constants did.

**Rationale**: The prototype is a static demo with no backing data; this app already has a real `members` mock-db table (`src/app/api/_mock-db/types/members.type.ts`) with the needed identity fields. Joining avoids duplicating member data in two places and keeps the mock DB internally consistent, which the spec's Assumptions section leaves open ("no requirement text... defines their real data source").

**Alternatives considered**:

- Duplicate name/furigana/gender/contract as static fields directly on the log row (mirrors the prototype exactly) — rejected: creates two sources of truth for member identity and doesn't match how every other feature in this codebase already models member references (by `member_id` + join).

---

## Decision D2: Frequency badge and companion role stay hardcoded per Q&A #3/#4 — but as seeded mock-db values, not UI constants

**Decision**: `frequency_badge` (`"regular" | "longAbsence" | null`) and `companion_role` (`"inviter" | "invitee" | null`) are columns on the `entry_exit_logs` seed rows, set to fixed values at seed time. No runtime computation (threshold logic, live invite lookup) is implemented for Phase 1.

**Rationale**: Directly implements the resolved Q&A #3 ("OK", no live threshold logic) and Q&A #4 ("hardcode giá trị trong mock data"). Storing them as seed columns (rather than a separate UI-only constant map, as the prototype did) keeps the data traveling through the same API contract Phase 2 will eventually populate with real values — the UI code doesn't need to change when FR-S002/FR-S003 and the real companion-invite logic ship.

**Alternatives considered**:

- Keep a UI-side lookup table keyed by member name (prototype's approach) — rejected: doesn't survive the move to a real API-backed table and would need to be thrown away in Phase 2 anyway.

---

## Decision D3: Loading / Empty / Error states use this app's existing `DataStateBoundary`, not the prototype's pattern

**Decision**: Wrap each activity table's body in the existing `DataStateBoundary` component (`src/components/common/data-state-boundary/index.tsx`), which already composes `Loading`, `Empty`, and `Error` sub-components with a retry action. Pass a custom `skeleton` node rendering table-row skeletons (via `src/components/ui/skeleton.tsx`) sized to the activity table's 4 columns.

**Rationale**: Spec.md's Q&A #6 was resolved by inspecting _some_ existing screens and found only a per-page `Empty` + ad hoc `Skeleton` rows pattern (looked at in `.cache/fitness-crm-ui/src/pages/member-list.tsx`, which is the _prototype_, not this app). Re-checking the **actual target codebase** (`src/components/common/data-state-boundary/`) shows this app already has a superior, reusable triad (`Loading`/`Empty`/`Error`) that other real routes are expected to use — including a real retryable error state, which the prototype-cache screens lacked entirely. Using the app's own canonical component is more consistent than importing the prototype's naming.

**Alternatives considered**:

- Recreate the prototype's local `Empty`/raw `Skeleton`-rows pattern in this app — rejected: duplicates a pattern this app already solved once, centrally.

**Supersedes**: spec.md's Q&A #6 reference to `Empty`/`Skeleton` component _names_ (those were correct as "a pattern exists somewhere in the ecosystem" but not as "the exact component to import here"). The functional requirement (FR-B01-15/16) — empty and loading states must exist — is unchanged; only the concrete component binding is corrected here, which is exactly Phase 0's job.

---

## Decision D4: Avatar fallback uses the existing shadcn `Avatar` composition

**Decision**: Replace the prototype's raw `<img>` tags with `Avatar`/`AvatarImage`/`AvatarFallback` from `src/components/ui/avatar.tsx` (already used elsewhere, e.g. `auto-layout-test.tsx`). Fallback renders the member's first character on a muted background. The male/female symbol (♂/♀) stays a separate small text element next to the avatar, exactly as in the prototype — it is not part of the `Avatar` component itself.

**Rationale**: Directly resolves Q&A #6's missing-avatar item using a component that already exists in this app (not just the prototype), confirmed present in `src/components/ui/avatar.tsx`.

---

## Decision D5: Hourly chart becomes a real aggregation endpoint, not a static array

**Decision**: Add `GET /api/crm/entry-exit-logs/hourly-summary?date=&store_id=` that aggregates `entry_exit_logs` rows with `direction = "entry"` into hour-of-day buckets (06:00–22:00) for the requested date/store scope. The chart component (`ChartContainer` + Recharts `LineChart`, already available via `src/components/ui/chart.tsx`) renders whatever this endpoint returns.

**Rationale**: FR-B01-08 requires the hourly chart; now that a real log table exists, computing it live is no more work than seeding a static array and is consistent with Principle II (OpenAPI-First / mock DB now, generated client later). "Current hour" uses the real client clock instead of the prototype's fixed demo value (`14:00`), per spec.md's Assumptions.

**Alternatives considered**:

- Compute hourly counts client-side from the already-fetched activity list — rejected: the activity list is capped at 5 rows per direction, which is not enough data to build an accurate hourly distribution.

---

## Decision D6: Member Quick View is fetched on demand via its own endpoint

**Decision**: Add `GET /api/crm/entry-exit-logs/{id}/quick-view` returning the full panel payload (identity, context, time, contract, badges, contact info, recent-visit history) for the log row that was clicked. The Sheet fetches this lazily (React Query) only when a row is clicked, keeping the activity-table fetch lightweight.

**Rationale**: FR-B01-05/06 require this panel; Q&A #5 confirmed it's a required Phase 1 deliverable ("Có cần sheet"). Because the log table now exists for real, "recent visits" can be computed instead of hardcoded: the most recent 3 **exit** events for that member, each paired with its matching same-day entry to compute stay duration (falling back to no duration shown if no matching entry is found). "Contact info" (phone/email) is read from the existing `members` mock-db record instead of the prototype's fabricated placeholder email — no reason to keep it fake now that the real field already exists in this app's data model.

**Alternatives considered**:

- Keep contact info and recent visits as hardcoded placeholders exactly like the prototype — rejected: the spec's Assumption only says the prototype _is_ mock; it does not require the real implementation to keep them fake when a real, already-existing data source is one join away. This does not conflict with the Q&A #3/#4 resolutions, which were specifically about the _badges_ staying hardcoded, not about every field in the panel.

**Update (post-implementation)**: the payload does NOT include a `member_detail_path` field. Every other feature in this codebase (members/blacklist, members/leaves, members/transfers, members/create, etc.) links to a member's detail page by calling `navigate('/members/[id]', member_id)` with the typed router — none of them fetch a server-provided path string. `member-quick-view-sheet.tsx` follows the same convention, deriving the link from the payload's existing `member_id` field. The `member_detail_path` field was removed from `entry-exit-log.schema.ts` and the mock-db table after being flagged as an unnecessary deviation from this established pattern.

---

## Decision D7: No `usePhase()` runtime toggle in this app

**Decision**: The real `page.tsx` implements only the Phase 1 baseline described in spec.md. There is no phase-context dependency, no `currentPhase === "2"` branches, and no dead code for the KPI counter / notification panel / in-building tab. Those are simply not built yet.

**Rationale**: The prototype's `usePhase()` toggle is a demo device for showing stakeholders both phases in one file; it has no equivalent elsewhere in this app (confirmed: no `usePhase` hook exists in `src/hooks` or `src/contexts`). Shipping dead Phase-2 branches into production code would violate Principle V (Simplicity — YAGNI) for no benefit, since Q&A #1/#2 already resolved that Phase 2 monitor features are excluded from this spec entirely, not merely hidden.

---

## Decision D8: Store filter reuses the existing `Select` + "全店舗" sentinel pattern

**Decision**: Model the store filter after `visit-experience-filters.tsx`'s existing pattern: a shadcn `Select` where `"全店舗"` is the "all stores" sentinel value, and store options are populated from the signed-in user's accessible stores. Visibility follows FR-B01-11 (2+ accessible stores AND header-level scope is "all stores").

**Rationale**: Matches an already-established, working pattern in this codebase (`members-filters.tsx`, `options-filters.tsx`, `option-discount-table-columns.tsx` all reference the same `全店舗`/`accessible_stores` convention) rather than inventing a new one.

---

## Decision D9: Date navigation reuses existing shadcn `Popover` + `Calendar` (date-fns v4, `ja` locale)

**Decision**: Previous/next-day buttons + a `Popover`/`Calendar` combo, exactly as structured in the prototype, using this app's existing `src/components/ui/calendar.tsx` and `src/components/ui/popover.tsx`. "Today" is the real client date (`new Date()`), not the prototype's fixed demo date.

**Rationale**: FR-B01-09/10 require this; the components already exist in this app with no gaps to fill.

---

## Decision D10: OpenAPI-first implementation order

**Decision**: Define Zod schemas first under `src/app/api/_schemas/entry-exit-log.schema.ts`, implement the three mock route handlers against them, then run `npm run generate-openapi` followed by `npm run generate-api` to refresh `src/lib/api/` and produce the generated React Query option factories.

**Rationale**: Constitution Principle II (OpenAPI-First) forbids manual edits to generated client files and requires new endpoints to be declared in the OpenAPI spec before implementation. This mirrors the implementation order already used by sibling features (e.g. `011-studio-detail-page`).

---

## Decision D11: No custom data-fetching hook — call generated React Query options directly; only filter _state_ gets a feature-local `_hooks/` file

**Decision**: Do **not** create `src/hooks/use-entry-exit-logs.hook.ts` (or any wrapper hook) around the generated API client. Instead, each component calls the generated option factory directly, e.g. `useQuery({ ...getCrmEntryExitLogsOptions({ query: { direction: 'entry', ... } }) })` inside `activity-table.tsx`, and the equivalent generated options for the hourly-summary and quick-view endpoints inside their respective components. The only new hook file is `src/app/(private)/entry-exit/_hooks/use-entry-exit-filters.hook.ts`, a `nuqs`-backed URL-state hook for `date`/`store_id`, matching the sibling `_hooks/use-<feature>-filters.hook.ts` convention.

**Rationale**: Surveying every existing feature confirms two separate, non-overlapping conventions in this codebase:

1. **Data fetching**: Never wrapped in a custom hook. Every checked page (`training-equipment/page.tsx` is representative) calls `useQuery({ ...getCrmXxxOptions(...) })` / `useMutation({ ...postCrmXxxMutation() })` directly from `@/lib/api/@tanstack/react-query.gen`, inline in the component. `src/hooks/` (the global folder) is reserved for genuinely cross-cutting, non-data hooks (`use-current-user.ts`, `use-debounce.hook.ts`, `use-image-upload.hook.ts`, `use-mobile.ts`) — there is no precedent anywhere in the app for a per-feature data-fetching wrapper hook.
2. **Feature-local `_hooks/`**: Every feature that has one (`training-equipment`, `members`, `options`, `staffs`, etc.) uses it exclusively for `nuqs`-backed URL query-state (`use-<feature>-filters.hook.ts` / `.ts`), not for data fetching. `studios` and `visit-experiences` have no `_hooks/` folder at all because they have no such URL-synced filter state to manage.

Since our screen's `selectedDate`/`storeFilter` are exactly this kind of URL-synced filter state (and should be bookmarkable/shareable, consistent with every other list-style page in this app), they get the `_hooks/use-entry-exit-filters.hook.ts` treatment — not the data fetching, which follows convention #1 instead.

**Alternatives considered**:

- A shared `use-entry-exit-logs.hook.ts` wrapping all three endpoints (the original plan.md draft) — rejected: no other feature in this codebase does this; it would be a one-off abstraction violating Principle V (Simplicity — no abstraction layers beyond what already exists).
- Putting the `nuqs` filter hook in the global `src/hooks/` instead of feature-local `_hooks/` — rejected: every existing filter hook of this kind is feature-local, not global, since the query keys are feature-specific.

---

## Decision D12: Store-filter visibility (superseded by D14 — see below)

**Original decision (kept for history)**: Drop FR-B01-11's "AND header-level store scope is 'all stores'" clause, since no client-visible header store-scope concept appeared to exist in this app; show the page-local store filter whenever `GET /api/crm/stores` returns 2+ stores.

**Superseded**: this turned out to be based on an incomplete read of `AppHeader` — see D14. `src/components/layout/app-header.tsx` already had a "Left: Store selector" slot; it was just a static, non-functional placeholder `<div>` (hardcoded "Fit365八潮店" text + a decorative image, no dropdown, no state). Once that was made functional, FR-B01-11's original intent (header-level store scope gates the page-local filter) became implementable as designed. D14 documents the actual implementation.

---

## Decision D14: Made the header store selector functional; entry-exit's page-local filter now narrows _within_ it

**Decision**: Implemented a real, global "current store" selector:

- `src/contexts/current-store.context.tsx` — `CurrentStoreProvider` + `useCurrentStore()`, exposing `currentStoreId` (`"all"` or a store id), `setCurrentStoreId`, `accessibleStores` (from `GET /crm/stores`), and `canSelectAllStores` (mirrors the server's `getAllowedStoreIds` unrestricted-role list: System/Headquarter/Manager). Selection persists to a cookie (`CookieNames.CurrentStore`) via `universal-cookie`, matching how the auth token is already persisted — not the URL, since this is an ambient app-wide setting, not a per-page filter.
- `src/components/layout/store-selector.tsx` — the actual dropdown UI (Popover + Command, searchable, "全体"/"店舗" groups, checkmarks), ported from the prototype's `shared-header.tsx`. Single-store users get the non-interactive display branch (no chevron, nothing to switch to) — same `canSelectAllStores || accessibleStores.length > 1` condition the prototype used.
- `src/components/layout/app-header.tsx` now renders `<StoreSelector />` instead of the static placeholder.
- `(private)/layout.tsx` wraps children in `<CurrentStoreProvider>` (nested inside `<AuthUserProvider>`, since it needs the user's role).
- `entry-exit-header-controls.tsx`'s page-local store filter is now a **narrowing filter on top of** the header scope, exactly matching the prototype's original relationship between `SharedHeader`'s selector and `entry-exit.tsx`'s own `showStoreFilter`: it only renders when `currentStoreId === "all"` (header unscoped) **and** `accessibleStores.length >= 2`. When the header is scoped to a specific store, that store is used directly and the page-local filter is hidden.
- `entry-exit-section.tsx` computes `effectiveStoreId = currentStoreId === "all" ? storeOverride : currentStoreId` and passes that single effective value into `ActivityTable`/`HourlyEntryChart`.

**Rationale**: The user pointed out the header already has a store-selector slot and asked for it to work like the prototype's `shared-header.tsx`. Making it real (rather than working around its absence, as D12 did) is strictly better: it fixes a decorative-but-broken piece of shared UI other features will likely also want, and it lets FR-B01-11 be implemented as originally specified instead of the simplified version D12 settled for.

**Alternatives considered**:

- Keep the header placeholder as-is and only fix the page-local filter (D12's approach) — superseded; leaves a fake, non-functional UI element in the shared header that any future feature reviewer would trip over the same way this one did.
- Store `currentStoreId` in the URL (`nuqs`) instead of a cookie — rejected: this is an ambient, app-wide setting a user expects to persist across navigation to _any_ page, not a property of one page's URL.

---

## Decision D13: `page.tsx` is a thin Server Component shell delegating to a client section component

**Decision**: `src/app/(private)/entry-exit/page.tsx` stays a Server Component (`<Suspense fallback={<Loading />}><EntryExitSection /></Suspense>`); all interactive content (filters, tables, chart, Quick View sheet) lives in `_components/entry-exit-section.tsx` (`'use client'`).

**Rationale**: Confirmed by inspecting `src/app/(private)/studios/page.tsx` (thin RSC shell + `<StudioListSection />`) versus `src/app/(private)/training-equipment/page.tsx` (a direct `'use client'` page with no RSC shell) — both patterns exist in this codebase, but the `studios` pattern is the one that actually satisfies Constitution Principle IV ("Components MUST default to React Server Components; `'use client'` MUST be justified"). Since our page has no server-only content of its own (no top-level data fetch in `page.tsx`), following the `studios` pattern was the correct, more-compliant choice between the two available precedents.

---

## Unknowns Resolved

| Unknown                                                                      | Resolution                                                                                                                                               |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concrete empty/loading/error state components in this repo                   | `DataStateBoundary` (`Loading`/`Empty`/`Error`) + `Skeleton` (D3)                                                                                        |
| Where/how data-fetching hooks and filter-state hooks are placed in this repo | No data-fetching wrapper hook anywhere in the app — call generated options directly; feature-local `_hooks/` is reserved for `nuqs` URL-state only (D11) |
| Concrete missing-avatar fallback component in this repo                      | `Avatar`/`AvatarImage`/`AvatarFallback` (D4)                                                                                                             |
| Whether hourly chart / activity data should react to date/store              | Yes — real aggregation query, since a real backing table now exists (D1, D5)                                                                             |
| Whether Quick View "recent visits" / "contact info" must be mock             | No — sourced from real `entry_exit_logs` history and `members` record (D6)                                                                               |
| Whether a `usePhase()`-equivalent toggle is needed in this app               | No — Phase 2 branches are simply not implemented; no runtime toggle exists or is added (D7)                                                              |

All `spec.md` Q&A items remain resolved as written; this document only fixes the _concrete implementation bindings_ (D3/D4/D11) and extends real-data design (D1/D2/D5/D6/D7) where spec.md left informed-guess room in its Assumptions section.
