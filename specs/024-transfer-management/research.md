# Phase 0 Research: Transfer Management Update

> **Superseded (2026-10-05)**: this document describes the mock-API implementation round (prototype @ 1cc2d6d, 2026-07-18). The screen now runs on the real API-091 (`/admin/transfer-applications`, commit 4fe1f967) and the prototype @ 47423ec — free-word search, the 申請中 status, the 200-row page size and the 却下 wording are gone. Current behavior: [spec.md](spec.md) › _Prototype Alignment_ and [checklists/parity.md](checklists/parity.md). Kept as a historical record.

**Feature**: `024-transfer-management` | **Date**: 2026-08-05
**Nature**: Brownfield update — the feature exists at `src/app/(private)/members/transfers/**` and must be brought in line with A-02 v260527_v2 + the 2026-07-18 V0 mockups, and given real permission enforcement.

## Context: what exists today

The feature was implemented before the permission system landed and before the shared table/filter/header components were reworked. Verified current state:

| Area              | Today                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| List table        | `DataTable variant="simple"`, 8 columns: 申請ID, 会員名, 移籍元店舗, 移籍先店舗, 申請日, 移籍予定日, ステータス, actions |
| Row selection     | None                                                                                                                     |
| Bulk approve      | None (no UI, no endpoint)                                                                                                |
| Pagination        | `TablePagination` with `showPageNumbers={false}`, fixed `PAGE_SIZE = 25`, no size selector                               |
| Filters           | nuqs, 5 selects + debounced search — matches spec set already                                                            |
| Empty state       | `DataTable` fallback string `データがありません`                                                                         |
| Filter banner     | Not used                                                                                                                 |
| Detail            | 3 cards: `TransferDetailInfo`, `TransferApprovalFlow`, hand-rolled status card                                           |
| Exclusion alerts  | None                                                                                                                     |
| Manual unlock     | None                                                                                                                     |
| Permissions       | Page-level only (`PAGE_PERMISSIONS`); one in-feature check that decodes the session JWT directly                         |
| API enforcement   | Zero role checks, zero store scoping                                                                                     |
| Persisted comment | None — accepted then discarded                                                                                           |

Full inventory with line references is embedded in the Gap Analysis of [plan.md](./plan.md).

---

## Decision 1 — Status enum: 5 values remapped to the spec's 5 labels

**Problem**: FR-001 and the V0 both enumerate exactly five statuses — 申請中 / 移籍元承認待ち / 移籍先承認待ち / 完了 / 否認. The V0 mock data treats 申請中 and 移籍元承認待ち as _distinct_ rows in the same list (TR-002 vs TR-001). The current enum has five values that don't line up: `pending`, `from_store_approved`, `approved`, `rejected`, `completed` — with `approved` and `completed` semantically redundant and no value representing 移籍元承認待ち.

**Decision**: Remap to exactly five values, adding one and removing one.

| Spec label     | Target enum value     | Change                               |
| -------------- | --------------------- | ------------------------------------ |
| 申請中         | `pending`             | keep (label already 申請中)          |
| 移籍元承認待ち | `from_store_pending`  | **add**                              |
| 移籍先承認待ち | `from_store_approved` | keep value, relabel (was 店舗承認済) |
| 完了           | `completed`           | keep, relabel (was 移籍完了)         |
| 否認           | `rejected`            | keep, relabel (was 却下)             |
| —              | `approved`            | **remove** — folded into `completed` |

**Rationale**: A 1:1 mapping to the spec's filter options is required by FR-001/FR-002, and the redundant `approved` state is what frees the fifth slot. Because Phase 1 owns both the Zod schema and the generated client, adding/removing an enum value is a mechanical regeneration, not a migration.

**Alternatives considered**:

- _Relabel only, keep 5 existing values_ — rejected: cannot represent 移籍元承認待ち, so the FR-001 filter dropdown could not be built as specified.
- _Add a 6th value and keep `approved`_ — rejected: `approved` has no distinct business meaning once 完了 exists, and an unreachable status is a permanent source of confusion.

**Consequence**: `transfer.schema.ts`, `transfer.seed.ts` (14 rows), `transfer.table.ts` state machine, and the OpenAPI regeneration all change together. Any status string must be read from the generated type, never re-declared (today `transfer-status-badge.tsx:7` hand-declares the union — that must go).

## Decision 2 — Permissions expressed as `Permission` members, not role lists

**Decision**: Add three action-level permissions alongside the existing view permission, and grant them per the A-02 権限マトリクス.

| Permission                              | Value                            | System | Headquarter | Manager | Staff | Trainer | Observer |
| --------------------------------------- | -------------------------------- | :----: | :---------: | :-----: | :---: | :-----: | :------: |
| `MembersTransfersView` _(exists)_       | `members.transfers-view`         |   ✓    |      ✓      |    ✓    |   ✓   |    ✗    |    ✓     |
| `MembersTransfersApprove` **(new)**     | `members.transfers-approve`      |   ✓    |      ✓      |    ✓    |   ✓   |    ✗    |    ✗     |
| `MembersTransfersBulkApprove` **(new)** | `members.transfers-bulk-approve` |   ✓    |      ✓      |    ✓    |   ✗   |    ✗    |    ✗     |
| `MembersTransfersUnlock` **(new)**      | `members.transfers-unlock`       |   ✓    |      ✓      |    ✓    |   ✗   |    ✗    |    ✗     |

**Rationale**: `permission.constants.ts:452-455` documents permissions as the default and role lists as the exception for dynamic cases. Bulk-approve and unlock are restricted to HQ/System/Manager, matching the V0's `allowedRoles={["Headquarter","System","Manager"]}` on both controls. `System` needs no explicit grant — `ROLE_PERMISSIONS.System` is `Object.values(Permission)`.

**Alternatives considered**: `allowedRoles` lists everywhere — rejected: duplicates role knowledge across call sites and bypasses the central matrix, the anti-pattern already present in `instructor-permissions.ts` / `studio-action-permissions.util.ts`.

## Decision 3 — Read identity from `useAuthUser()`, delete the JWT-decoding helper

**Problem**: `transfer-status-action.tsx:26-41` decodes the session cookie's JWT in the client and **falls back to `role: 'headquarter'`** whenever the cookie is missing or undecodable — an unauthenticated viewer is silently promoted to the highest privilege.

**Decision**: Delete `getCurrentUserRole()`. Use `const { hasPermission, hasRole, user, isLoading } = useAuthUser()` from `@/contexts/auth-user.context`, already mounted for every private route in `src/app/(private)/layout.tsx:17-18`. Gate controls with `RoleGatedButton` / `RoleGatedMenuItem`. While `isLoading`, deny rather than allow (the pattern `app-sidebar.tsx:231` already follows).

**Rationale**: One identity source, no client-side token parsing, no fail-open default.

## Decision 4 — Staff approval eligibility stays a business rule on top of the permission

`canUserApprove()` (`transfer-status-action.tsx:43-60`) already encodes the correct A-02 rule: Staff may approve only the side and stage that belongs to their store — `pending`/`from_store_pending` + `store_id === from_store_id`, or `from_store_approved` + `brand === 'fit365'` + `store_id === to_store_id`.

**Decision**: Keep this logic, move it into a pure, unit-reviewable helper `src/app/(private)/members/transfers/_utils/transfer-permission.util.ts`, and compose it with the permission check: the permission decides _whether the role may ever approve_, the helper decides _whether this user may approve this row now_. Feed identity in as arguments (from `useAuthUser`), never read cookies inside it.

**Rationale**: Permission ≠ row-level eligibility; conflating them would either over-grant Staff or under-grant HQ.

## Decision 5 — Store scoping uses OR-across-two-stores, not the single-store idiom

**Problem**: Every existing scoped feature filters on one `store_id`. A transfer touches two stores, and A-02 scopes Staff to "所属店舗関連" — either side.

**Decision**:

- **Client**: `useCurrentStore()` → when `currentStoreId !== ALL_STORES`, pass it as a single `store_id` query param meaning _either side_; keep the existing `from_store_id` / `to_store_id` filters as independent side-specific narrowing. Suppress the query with `enabled: !isStoreScopeLoading`.
- **Server**: `getAuthUserFromRequest` → `getAllowedStoreIds` → 403 on `[]`; a row passes when `from_store_id ∈ allowed || to_store_id ∈ allowed`, then intersect with any explicitly requested side filters.

**Rationale**: Reuses the existing helpers and the `resolveStoreScope` shape from `entry-exit-logs/history/route.ts:28-48`, but with OR semantics the single-store version can't express.

**Alternatives considered**: Client-side-only scoping (what the members feature does) — rejected: A-02 makes visibility a permission boundary, and the list endpoint currently returns every store's transfers to anyone.

## Decision 6 — Enforce in the API route, not only the UI

**Decision**: All five transfer endpoints authenticate; the list scopes rows; approve / reject / bulk-approve / unlock re-check role and row eligibility server-side and return 403 on failure. The `403` responses already declared in the OpenAPI metadata (`approve/route.ts:31-34`) become reachable.

**Rationale**: The spec's SC-005 asserts 100% of denied attempts are blocked, and its edge cases explicitly require rejection "regardless of UI gating". UI-only gating (the members-feature precedent) cannot satisfy that. Precedent for a literal role comparison in a route: `franchise-companies/route.ts:156-158`.

## Decision 7 — `MemberHeadupCard` becomes a shared component

**Problem**: PAR046 requires the member head-up card on transfer detail. No such component exists — the member detail page (`members/[id]/page.tsx`) inlines it from `Card` + `Avatar` + `Badge` + `Separator`.

**Decision**: Extract `src/components/common/member-headup-card.tsx` with props `{ memberId, oldMemberNo, name, nameKana, memberType, contractName, storeName }`, use it on transfer detail, and refactor the member detail page onto it in the same change.

**Rationale**: Two consumers justify a shared component; leaving it inlined would mean copy-pasting the whole block, which is what the constitution's Simplicity principle exists to prevent. Extracting without migrating the original would leave two divergent copies.

**Alternatives considered**: Inline a transfer-local copy — rejected as deliberate duplication.

## Decision 8 — Reuse the shared `StatusCard`; drop the hand-rolled one

**Decision**: Replace the bespoke card in `transfer-status-action.tsx:82-113` with `StatusCard` from `@/components/common/status-card`, passing `tone`, `icon`, `label`, `meta` (申請日 / 最終更新 / conditional 移籍先店舗の承認待ちです) and the two `RoleGatedButton`s via the `action` slot.

**Rationale**: `StatusCard`'s contract reserves `action` for AlertDialog-backed business actions — exactly approve/reject. Tone/icon maps for all five statuses come straight from the V0 (`transfer-detail.tsx:210-228`).

## Decision 9 — List screen migrates to the current list-screen spine

**Decision**: Adopt the pattern of the newest list screen (`members/page.tsx`, commit `1667c485`):

```
page.tsx → Suspense(fallback=<Loading/>) → Content('use client')
  → PageHeader(title, badge=<Badge>{n}件</Badge>)
  → Card
      → filters (isFilterOpen owned by the page)
      → FilterResultBanner(show, totalCount, filteredCount, filterSummary, onClear)
      → DataTable(variant="simple", isLoading, isFetching, emptyContent=<Empty/>,
                  tableOptions={rowSelection, getRowId, manualSorting})
      → TablePaginationWithSize(total, currentPage, pageSize, onPageChange, onPageSizeChange)
```

Specific corrections this forces:

- `PageHeader` has **no** `count` or `outside` prop (contrary to the V0's own prop names) — count goes through `badge`.
- Do **not** wrap `DataTable` in `DataStateBoundary`; surface query errors as a `sonner` toast (`data-state-boundary/index.tsx:28-32`).
- Import `Empty` from `@/components/common/data-state-boundary/empty` — the single consolidated copy (the former `EmptyState` duplicates at `@/components/common/empty-state` and `@/components/common/data-state-boundary/empty-state` were removed). It renders the standard outline action button itself via `onAction`/`actionLabel`; use the `action` ReactNode slot only for non-standard actions (icons, permission-gated buttons).
- `TablePaginationWithSize` takes `total`, not `totalPages`, and defaults to `[25, 50, 100, 200]` — satisfying FR-014 and PAR037.
- Memoize the columns array or the sort tooltip blinks on every `keepPreviousData` refetch.

**Rationale**: The user's brief explicitly calls out that table/filter/header components have changed; matching the newest screen is what "latest UI" means in this repo.

## Decision 10 — Row selection is hand-rolled; ineligible rows are non-selectable

**Decision**: `DataTable` has no built-in selection. Add a leading `select` column following `members-table-columns.tsx:50-74` (header select-all-on-page + `DataTableColumnCheckbox` for cells), wire `getRowId` + `state.rowSelection` + `onRowSelectionChange` through `tableOptions`, and set `enableRowSelection: (row) => row.original.brand === 'joyfit' && row.original.auto_transfer_eligible === true` so FIT365 and excluded rows cannot enter a bulk batch (PAR020, FR-013).

**Rationale**: Enforcing eligibility at the table level makes the invalid batch unconstructible rather than validated after the fact.

## Decision 11 — Fix the four latent defects found during the survey

These are pre-existing bugs in scope of this update:

1. `transfer-filters.tsx:133` compares `v === 'all '` (trailing space), so clearing 移籍元店舗 sets `from_store_id='all'` instead of clearing it.
2. `transfer.table.ts:59-87` `create()` hardcodes a 3-step FIT365-shaped history regardless of brand, so transfers created from member detail get the wrong flow. Must call the same brand-aware builder as `transfer.seed.ts:30-128`.
3. `transfer.table.ts:93-124` — a JOYFIT transfer at `from_store_approved` can never advance, and **no code path ever sets `completed`**: there is no auto-execution step (FR-010).
4. `transfer.table.ts:93,126` discard the approve/reject comment. FR-008 requires it to be recorded with the action.

**Rationale**: (2) and (3) make FR-007/FR-010 untestable; (4) makes FR-008 unmet; (1) is a visible filter bug. Fixing them is prerequisite, not scope creep.

## Decision 12 — Filter store options come from the store API, not a hardcoded array

**Decision**: Replace `MOCK_STORES` (`transfer-filters.tsx:18-28`, 8 hardcoded stores) with the store list fetched from the stores endpoint, narrowed to the caller's accessible stores.

**Rationale**: The hardcoded list already drifts from the 11 stores in the V0 and from seed data; with store scoping (Decision 5) the dropdown must anyway only offer stores the user can see.

## Decision 13 — Exclusion data is modelled on the transfer, computed at application time

**Problem**: The unpaid / cancellation-period conditions exist today only as 409 checks inside `POST /api/crm/members/[id]/transfer` (`route.ts:80-86`, reading `member.constraints`). Nothing surfaces on the A-02 screens (FR-006, PAR028-030, PAR047-050).

**Decision**: Persist eligibility on the transfer record — `auto_transfer_eligible`, `exclusion_reasons[]`, `unpaid_amount`, `unpaid_period`, `campaign_lock_remaining_days`, plus unlock audit fields — populated from `member.constraints` when the transfer is created, and cleared/overridden by the unlock endpoint. JOYFIT-only; `null`/absent for FIT365.

**Rationale**: The list must render eligibility badges without an N+1 fetch per row, and the exclusion reason as it stood _at application time_ is what staff are adjudicating. Computing it live on every read would make a row's displayed reason drift from the decision being reviewed.

**Alternatives considered**: Join to the member on read — rejected for the N+1 and the drift above.

## Decision 14 — Keep the member-detail 409 block; the unlock override lives on the transfer

**Decision**: Leave the pre-flight 409s in the member-detail application route (JOYFIT + cancellation period is blocked at application time per A-02 制限事項). The A-02 unlock flow (FR-012) applies to an _existing_ transfer that carries a `campaign_lock` exclusion, and requires a non-empty reason plus HQ/Manager permission.

**Rationale**: The two guards sit at different points in the lifecycle; A-02's 異常系 says the block is administratively releasable, which is exactly the unlock endpoint.

---

## Unknowns resolved

No `[NEEDS CLARIFICATION]` markers remain in [spec.md](./spec.md) — the specification-quality checklist passed on its first pass.

## Single item to confirm with the PO before implementation

**Status semantics (Decision 1)**: whether 申請中 and 移籍元承認待ち are genuinely distinct business states, or whether the V0's mock data simply illustrates variety. The plan assumes distinct (the V0 shows both simultaneously). If the PO says they are one state, drop `from_store_pending` and the enum stays at four meaningful values plus `rejected` — a smaller change that does not otherwise alter this plan. Flagged rather than blocking, since every other workstream is independent of the answer.
