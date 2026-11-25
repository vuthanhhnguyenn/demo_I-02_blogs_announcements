# Real API Integration Plan: Y-14 Domain Master Management (ドメイン管理)

**Branch**: `feat/domain-management` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/domains/**` — list, create, edit, delete, detail sheet
**Target API**: `src/lib/api-real` (generated from `src/lib/openapi.real.json`, API-071 Admin Domain Master)

## Guiding principle

**UI first.** Where the real API cannot yet back a UI element, the element **stays as it is
today**: rendered, but disabled with a short 「API未対応」 note, and the integration leaves a
`TODO(round2)` comment naming the blocker. No UI is deleted to fit the current API surface.
The user's direction for this feature is explicit: **the API must catch up to the UI, not the
other way around** — Round 1 wires everything the real API can already support and documents
everything it can't as a concrete BE ask, so Round 2 is a checklist of API additions, not a
UI redesign.

Mock API routes under `src/app/api/crm/domains/**`, `src/app/api/_schemas/domain.schema.ts` and
the mock-db table/seed (`_mock-db/tables/domain.table.ts`, `_mock-db/seeds/domain.seed.ts`) are
**left untouched** (same convention as the positions/staffs integrations) — they simply stop
being called by this feature.

## Endpoint mapping

| UI surface                                                               | Real endpoint                                                                                                                | Hook (`@/lib/api-real/@tanstack/react-query.gen`) | Round                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------- |
| List (table rows, header badge)                                          | `GET /api/v1/admin/domain-master`                                                                                            | `adminDomainMasterControllerListOptions`          | 1                           |
| Search by 管理名/ドメイン (FR-002), auth-method filter                   | _(no server param)_ — client-side over a full fetch                                                                          | same query, `limit: 100`                          | 1 (client-side, **B3**)     |
| Detail sheet — domain fields                                             | reuses the row already in hand from the list query (no separate GET-by-id call needed)                                       | —                                                 | 1                           |
| Detail sheet — 紐づくスタッフ (FR-010)                                   | `GET /api/v1/admin/staff?emailDomain=<domain>`                                                                               | `adminStaffPermissionControllerListStaffOptions`  | 1                           |
| Delete-confirm re-check (spec Edge Case, FR-013)                         | `GET /api/v1/admin/staff?emailDomain=<domain>&limit=1` (fresh read at confirm-time)                                          | same hook                                         | 1                           |
| Create domain (FR-004)                                                   | `POST /api/v1/admin/domain-master`                                                                                           | `adminDomainMasterControllerRegisterMutation`     | 1                           |
| Edit domain — name/domain/authProvider (FR-008)                          | ❌ no endpoint exists                                                                                                        | —                                                 | **Gap → 2**                 |
| Auth-method-change confirm dialog (FR-011)                               | same as above — has nothing to submit to                                                                                     | —                                                 | **Gap → 2**                 |
| Delete domain (FR-012)                                                   | `DELETE /api/v1/admin/domain-master/{id}`                                                                                    | `adminDomainMasterControllerRemoveMutation`       | 1                           |
| Block delete when staff linked (FR-013)                                  | BE does **not** enforce this (no-cascade design, only 404-checks existence) — enforced client-side from data already fetched | —                                                 | 1 (client-side, **D5**)     |
| 管理名 (name) field — column, search, form, detail, delete-confirm title | ❌ no field anywhere in the API (DB, DTOs)                                                                                   | —                                                 | **Gap → 2**                 |
| 作成者 (createdBy) display                                               | `DomainMasterSummaryDto.createdBy` (nullable uuid, not a name)                                                               | same list query                                   | 1 (shown as raw ID, **D4**) |

## Blockers carried into Round 2

| ID     | Blocker                                                                                                                                                                                            | Round 1 behaviour (UI kept)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Round 2 (after API fix)                                                                                                                                                                                                                                               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | The real `domain_masters` table / `DomainMasterSummaryDto` / `RegisterDomainMasterDto` have **no 管理名 (`name`) field at all** (FR-001, FR-002, FR-004, Key Entity all require it).               | 管理名 column, search box, form field and delete-confirm title **stay visible**. The list column and detail sheet render 「—」 with a 「API未対応」 badge in place of a name (nothing to show); the create/edit form's 管理名 input stays enabled for input **but is stripped from the POST body** — `TODO(round2)` at the strip point in `_utils/domain-api.util.ts`; search-by-name silently matches nothing until the field exists.                                                                               | **Blocked on BE adding a `name` column** to `domain_masters` + the field to `RegisterDomainMasterDto` / `DomainMasterSummaryDto` / `RegisterDomainMasterResponseDto`. Once it ships: stop stripping the field, render the real value everywhere, wire it into search. |
| **B2** | No update endpoint exists (`GET/POST/DELETE` only — no `PATCH .../{id}`). FR-008 (edit) and FR-011 (auth-method-change confirm) have nothing to call.                                              | 編集 button **stays visible** on the row-actions and the detail sheet, opens the existing `DomainFormDialog` in `mode="edit"` prefilled from the row, but the submit button is **disabled** with a 「API未対応」 tooltip instead of calling a mutation — `TODO(round2)` in `page.tsx` at the missing `updateMutation`. The FR-011 auth-method-change confirmation dialog is unreachable in Round 1 (nothing to confirm), left in the component as dead code with the same `TODO(round2)` marker rather than deleted. | **Blocked on BE adding `PATCH /api/v1/admin/domain-master/{id}`** (API-071 update). Once it ships: wire `updateMutation`, re-enable submit, restore the FR-011 confirm flow.                                                                                          |
| **B3** | List endpoint only accepts `page/limit/sort/order` — no `query` (name/domain partial match) or `authProvider` (exact) filter (FR-002). SC-001 assumes the filter scales "regardless of list size". | Round 1 fetches with `limit: 100` (the API's max) and filters/sorts/paginates **client-side** in `useDomainFilters`. Accepted risk, per user direction: if total domains ever exceed 100 rows, search/filter will miss rows beyond the first page — acceptable for the current allowlist scale. `TODO(round2)` on the query hook.                                                                                                                                                                                    | **Blocked on BE adding `search`/`domain` and `authProvider` query params** to `GET /admin/domain-master`. Once it ships: pass filters straight through, drop the full-fetch + client-filter path.                                                                     |
| **B4** | `DELETE` never returns a staff-linkage conflict (no-cascade by design) — only 404 on missing id. The mock's 409 + `staffCount` body (`DeleteDomainBlockedResponseSchema`) has no real equivalent.  | The delete-confirm dialog's block is **fully client-side**: computed from the list row's `staffCount`, re-verified immediately before calling the mutation via a `limit:1` staff query on `emailDomain` (satisfies the spec's "re-evaluate at confirm-time" edge case). The mutation itself is only ever called when that count is 0.                                                                                                                                                                                | No BE change strictly required — this is a client-owned safeguard reflecting product intent (FR-013), independent of what the backend enforces. Revisit only if product wants server-side enforcement too.                                                            |

## Decisions

- **D1 — No mapper layer.** Components import `DomainMasterSummaryDto`, `RegisterDomainMasterDto`,
  `StaffSummaryDto` from `@/lib/api-real/types.gen` directly; renames (`authProvider` value set,
  `id` type) happen in place. Mirrors the positions/staffs precedent.
- **D2 — authProvider value mapping.** Real enum is `google | cognito`, UI/spec vocabulary is
  Google SSO / IDaaS. One seam in `_utils/domain-auth-provider.util.ts`:
  `google ⇄ 'google_sso'`, `cognito ⇄ 'idaas'` for display/labels, converted back to
  `google`/`cognito` at the request boundary. `DOMAIN_AUTH_METHOD_LABELS` keys change to the real
  values directly (`google`, `cognito`) rather than keeping a translation table long-term — see T004.
- **D3 — IDs are UUIDs.** `DomainListItem.id` (mock `D-001` strings) becomes the real UUID.
  No cross-screen deep link references a domain id (checked — none found), so this is a pure
  type change, no link to fix.
- **D4 — createdBy shown as-is, no name resolution.** Real API gives a nullable staff UUID, not a
  display name. Round 1 renders the raw UUID (or 「—」 when null) rather than fanning out an extra
  per-row staff lookup just for this secondary field. Revisit only if product asks for it — not
  gated on a BE change (Round 2 backlog **R204**, optional).
- **D5 — Delete-block stays enforceable without BE help.** `staffCount` already exists on
  `DomainMasterSummaryDto` for the button's disabled state; the confirm dialog does one more
  `adminStaffPermissionControllerListStaffOptions({ emailDomain: domain.domain, limit: 1 })` call
  right before submitting delete and blocks if `pagination.totalItems > 0` (**B4**). The old
  409/`staffCount`-in-error handling path in `page.tsx` is removed — it can never fire against the
  real API.
- **D6 — Errors by code.** `ErrorResponseDto.code`: `E-DMN-001` (409 on register) → inline duplicate
  error (`setDuplicateError(true)`, replacing the current `.includes('既に登録されています')` string
  match); `E-DMN-002` (404 on delete) → generic error toast (dialog closes, list refetches — row was
  already gone); `E-AUTH-103` (403) → generic error toast (menu already gates this role-wise per
  FR-014, so this should be unreachable in practice). Per-mutation `onError` toasts for the create
  mutation stay only for the duplicate-domain case (inline field error, not a toast); all other
  paths rely on the shared `MutationCache` toast — no local success/duplicate toast is duplicated.
- **D7 — Pagination for the client-side filter (B3).** `useDomainFilters` fetches once with
  `limit: 100, sort: 'domain', order: 'asc'`, then applies `query` (against `domain`, case-insensitive
  substring — `name` search is a no-op until **B1** ships) and `authProvider` filtering, plus the
  existing page/pageSize slicing, entirely client-side. `DOMAIN_PAGE_SIZE_OPTIONS` unchanged
  (`[25, 50, 100, 200]`); a client-side page size above the fetched row count is simply capped by
  the available rows (matches existing empty-state behavior, no new state needed).
- **D8 — Header count badge.** Both `headerCount` (unfiltered) and the filtered count now come from
  the same single `limit: 100` fetch's `items.length` / filtered subset — the mock's separate
  `count` field (`GetDomainsResponse.count`) has no real equivalent, but isn't needed since Round 1
  no longer round-trips a second server query for it (unlike positions' D5 baseline-count pattern,
  this fetch already holds the full set).

## Round 1 tasks

IDs are per-file; `[P]` = parallelizable with its neighbours.

### Phase A — foundations

- **T001** `_utils/domain-auth-provider.util.ts` _(new)_ — `google ⇄ google_sso`, `cognito ⇄ idaas`
  mapping helpers (**D2**); `DomainAuthProviderReal` type alias off `RegisterDomainMasterDto['authProvider']`.
- **T002** `_utils/domain-api.util.ts` _(new)_ — `toRegisterDomainBody(values)` (strips `name`, **B1**,
  maps `authProvider` via T001), `getDomainErrorCode(error)` for **D6**.
- **T003** `[P]` `_constants/domain.constants.ts` — `DOMAIN_AUTH_METHOD_LABELS` keyed by real values
  (`google`, `cognito`); keep `DOMAIN_PAGE_SIZE_OPTIONS` / `DOMAIN_DEFAULT_PAGE_SIZE`.

### Phase B — list screen

- **T004** `_hooks/use-domain-filters.ts` — drop the server `authProvider`/`query` passthrough,
  fetch once at `limit: 100` (**B3**, `TODO(round2)`), filter/sort/paginate client-side (**D7**);
  `authProvider` values become `google`/`cognito`.
- **T005** `[P]` `_components/domain-table-columns.tsx` — `DomainMasterSummaryDto`, `id`/`domain`
  used directly (uuid), 管理名 column renders 「—」 + 「API未対応」 badge (**B1**, `TODO(round2)`),
  authProvider badge via T001 labels.
- **T006** `page.tsx` — real list query (single fetch, **D7**/**D8**), real create mutation (**T002**,
  **D6**), real delete mutation with the pre-flight `emailDomain` re-check (**D5**) replacing the
  409/`staffCount` error path, real query-key invalidation, uuid row identity throughout.

### Phase C — detail sheet, delete dialog, form

- **T007** `[P]` `_components/domain-detail-sheet.tsx` — reads the passed-in row (no separate
  GET-by-id, per the endpoint mapping); 管理名 row renders 「—」 + 「API未対応」 (**B1**); 紐づくスタッフ
  section switched to `adminStaffPermissionControllerListStaffOptions({ emailDomain, limit: 100 })`
  mapped to the existing `staffId`/`name`/`email`/`position`/`status` shape off `StaffSummaryDto`
  (`positionName` → `position`).
- **T008** `[P]` `_components/domain-delete-dialog.tsx` — 管理名 in the confirmation copy renders
  the 「API未対応」 fallback (**B1**) alongside the domain string (still enough to identify the row
  per FR-012's intent); `isBlocked` now also considers the fresh count from **D5**'s pre-check.
- **T009** `_components/domain-form-dialog.tsx` — create path wired to the real register mutation
  (**T002**); edit path (`mode="edit"`) keeps the dialog and its fields fully rendered and prefilled,
  but the submit button is disabled with a 「API未対応」 tooltip (**B2**, `TODO(round2)` at the missing
  update mutation call site) — the FR-011 auth-method-change `AlertDialog` becomes unreachable dead
  code, left in place with the same `TODO(round2)` marker rather than removed. Drops the
  `getCrmDomainsByIdOptions` edit-mode prefill query — prefill now comes straight from the row
  already in hand (`DomainListItem` → `DomainMasterSummaryDto`).
- **T010** `_schemas/domain-form.schema.ts` — no structural change; `authProvider` enum becomes
  `['google', 'cognito']`.

### Phase D — verification

- **T011** `npm run type-check` (gate: 0 errors outside `.next/`) + `npm run lint`.
- **T012** Live smoke run against `NEXT_PUBLIC_REAL_API_URL`: list → client-side search (domain
  string) → client-side auth-method filter → paging → row click → detail sheet (incl. 紐づくスタッフ)
  → create → duplicate-domain rejection (`E-DMN-001`) → delete (clean path + staff-linked blocked
  path) → edit button shows disabled/API未対応 → non-HQ direct-nav 403.
- **T013** Record the outcome in this file's _Round 1 result_ section; update
  `checklists/parity.md` only where real-API behaviour genuinely changes a checked item (expect:
  管理名-related PAR items need a note that the field is API未対応, not failing).

## Round 2 backlog (after the API is fixed)

- **R201** BE adds `name` to `domain_masters` + `RegisterDomainMasterDto` / `DomainMasterSummaryDto`
  / `RegisterDomainMasterResponseDto` → stop stripping `name` in `toRegisterDomainBody`, render it
  everywhere the 「API未対応」 badge currently sits, wire it into the client-side search (**B1**).
- **R202** BE adds `PATCH /api/v1/admin/domain-master/{id}` → wire `updateMutation` in `page.tsx`,
  re-enable the edit form's submit button, restore the FR-011 auth-method-change confirm flow
  (**B2**).
- **R203** BE adds `search`/`domain` + `authProvider` query params to `GET /admin/domain-master` →
  pass filters straight through in `use-domain-filters.ts`, drop the `limit: 100` full-fetch +
  client-side filter/paginate path (**B3**).
- **R204** (optional, product call) If a display name for `createdBy` is wanted, resolve it via
  `adminStaffPermissionControllerGetStaffOptions` — not gated on a BE change, just a UX choice
  deferred out of Round 1 (**D4**).

## Open questions

None outstanding — the three questions raised at Gate 1 (G1/G2 scope, B3 fallback, createdBy
display) were resolved by the user: keep UI as-is with 「API未対応」 + `TODO(round2)` for anything
the API can't yet do; the API is expected to catch up to the UI, not vice versa.

## Resolved questions

- **Edit-flow scope** → keep FR-008/FR-011 UI fully visible but non-functional (**B2**), not removed
  or descoped, pending the BE update endpoint.
- **管理名 field** → keep visible everywhere with an 「API未対応」 placeholder (**B1**), not dropped
  from the UI, pending the BE column/DTO fields.
- **Search/filter fallback** → client-side over a `limit: 100` fetch is an accepted Round 1
  compromise (**B3**); scale risk noted, not blocking.
- **createdBy display** → raw UUID, no name resolution in Round 1 (**D4**).

## Round 1 result (2026-09-09)

**Status: code complete, static gates green, live smoke run pending (owner: user — needs real Cognito credentials).**

### Shipped

| Task                    | File                                   | Notes                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T001 (merged into T002) | —                                      | A separate `domain-auth-provider.util.ts` mapping seam turned out unnecessary — `google`/`cognito` are used as the canonical values everywhere (constants, schema, filters), so this is a plain rename (D1/D2 pattern), not a translation seam. Documented as a deviation below.                                                                 |
| T002                    | `_utils/domain-api.util.ts` _(new)_    | `DOMAIN_ERROR_CODE` (`E-DMN-001`/`E-DMN-002`), `getDomainErrorCode`, `toRegisterDomainBody` (strips `name`, **B1**, `TODO(round2)`).                                                                                                                                                                                                             |
| T003                    | `_constants/domain.constants.ts`       | `DOMAIN_AUTH_METHOD_LABELS` keyed by `google`/`cognito`; added `DOMAIN_LIST_FETCH_LIMIT = 100` for **B3**.                                                                                                                                                                                                                                       |
| T004                    | `_hooks/use-domain-filters.ts`         | Split into URL/local filter state (unchanged shape) plus two new pure helpers, `filterDomains`/`paginateDomains`, applied in `page.tsx` against a single full fetch (**B3**, `TODO(round2)`); `authProvider` values now `google`/`cognito`.                                                                                                      |
| T005                    | `_components/domain-table-columns.tsx` | `DomainMasterSummaryDto`; 管理名 column renders an 「API未対応」 badge (**B1**); authProvider badge via the updated labels; ID/staffCount/actions unchanged (uuid `id` needed no code change — was already used as an opaque string).                                                                                                            |
| T006                    | `page.tsx`                             | Real list query (single `limit:100` fetch, **D7/D8**), real register mutation (**D6** — `E-DMN-001` → inline duplicate error, no local toast), real delete mutation with the pre-flight `emailDomain` re-check replacing the old 409/`staffCount` error path (**D5**), real query-key invalidation.                                              |
| T007                    | `_components/domain-detail-sheet.tsx`  | Drops the old GET-by-id query — detail now reads the row already in hand; 紐づくスタッフ switched to `adminStaffPermissionControllerListStaffOptions({ emailDomain, limit: 100 })` (`positionName` → position label); 管理名 row renders the 「API未対応」 badge (**B1**); 作成者 shows the raw `createdBy` uuid (**D4**).                       |
| T008                    | `_components/domain-delete-dialog.tsx` | `DomainMasterSummaryDto`; confirmation copy shows 「API未対応（ドメイン）」 in place of the missing 管理名 (**B1**).                                                                                                                                                                                                                             |
| T009                    | `_components/domain-form-dialog.tsx`   | Create wired to the real register mutation; `domainId` prop replaced by the full `domain` row (no separate prefill query needed); edit-mode submit disabled with an inline 「API未対応」 alert (**B2**, `TODO(round2)`); the FR-011 auth-method-change `AlertDialog` kept in place as unreachable dead code with the same `TODO(round2)` marker. |
| T010                    | `_schemas/domain-form.schema.ts`       | `authProvider` enum → `['google', 'cognito']`.                                                                                                                                                                                                                                                                                                   |

Mock surfaces (`src/app/api/crm/domains/**`, `_schemas/domain.schema.ts`, `_mock-db`) are untouched and simply no longer called by this feature.

### Verification

- **T011 green** — `npm run type-check` → 0 errors; `npm run lint` → 0 errors, 0 warnings (one `react-hooks/exhaustive-deps` warning surfaced during development and was fixed by inlining the `useMemo` dependency, not suppressed); `prettier --check` clean on all changed files.
- **T012 not run** — same blocker as the positions integration (`specs/017-position-management/integration-plan.md`): `NEXT_PUBLIC_REAL_API_URL` points at `https://api.dev.fitness-v2.okamoto-hd.com`, whose login goes through the real Cognito pool (`NEXT_PUBLIC_COGNITO_CLIENT_ID`). No QA mock credentials work there and none are available in this environment, so no authenticated session could be established from this session. Dev server was started and confirmed serving (`/` → `307` to `/login`); the user takes over the live run with real HQ/System credentials.
- **T013** — this section. `checklists/parity.md` not yet updated — deferred until the live smoke run confirms which parity items are affected (expected: 管理名-related items need an 「API未対応」 note, not a fail, per B1/B2).

### Still open after Round 1

- **Live smoke run (T012)** — needs a real HQ/System-role login on the dev Cognito pool. Once run, confirm: list loads all domains within the `limit:100` cap, client-side search (domain string) and auth-method filter behave correctly, paging, row click → detail sheet (incl. 紐づくスタッフ via `emailDomain`), create, duplicate-domain rejection (`E-DMN-001` → inline error), delete (clean path + staff-linked block via the pre-flight check), edit dialog opens but Save stays disabled, non-HQ direct-nav 403.
- **B1/B2/B3/B4** unchanged — see the Blockers table. None are resolvable from the FE side; all wait on the BE additions listed in Round 2 backlog.

### Deviations from the plan (deliberate)

1. **No separate `domain-auth-provider.util.ts` (dropped T001 as originally scoped).** The plan proposed a translation seam between `google_sso/idaas` and `google/cognito`. In practice every call site (constants, schema, filter hook) simply adopts the real values directly — there is no place left in the code that still speaks `google_sso`/`idaas`, so a mapping function would have nothing to translate. This matches decision D1's "renames happen in place" more literally than the plan's first draft.
2. **`_utils/domain-api.util.ts` absorbs both T001 and T002's scope** (error codes + request-body builder) in one file, mirroring `position-api.util.ts`'s single-file convention rather than splitting into two near-empty files.
3. **Edit-mode form has no prefill query at all**, not just a lighter one — the plan's endpoint mapping already noted the detail sheet needs no separate GET-by-id; the same reasoning applies to the edit dialog once its `domainId` prop became the full row, so `getCrmDomainsByIdOptions`-equivalent fetching was removed rather than kept-and-disabled.

---

## Round 2 (2026-09-17)

**Trigger**: `src/lib/openapi.real.json` was refreshed with the API-071 update and
`src/lib/api-real` regenerated (`npm run generate-api:real`). Every Round 1 blocker
(**B1**/**B2**/**B3**) is resolved by the new surface, and **B4** is now enforced server-side too.

### What the API added

| New / changed                                                                                   | Resolves                     |
| ----------------------------------------------------------------------------------------------- | ---------------------------- |
| `name` (管理名) on `DomainMasterSummaryDto`, `RegisterDomainMasterDto`, `UpdateDomainMasterDto` | **B1** / R201                |
| `PATCH /api/v1/admin/domain-master/{id}` (`UpdateDomainMasterDto`)                              | **B2** / R202                |
| `search` + `authProvider` + `sort(domain\|name\|createdAt)` + `includeTotalAll` on the list     | **B3** / R203                |
| `GET /api/v1/admin/domain-master/{id}` → `DomainMasterDetailResponseDto` with `createdByName`   | R204 (**D4** superseded)     |
| `DELETE` now returns 409 `E-DMN-004` when active staff are attached                             | **B4** — now server-enforced |
| `isActive` field + `PATCH /{id}/active` (`SetDomainMasterActiveDto`)                            | FR-015 — **new, see R301**   |
| `E-DMN-005` (409) — `domain`/`authProvider` change refused while staff are attached             | new constraint, see **D9**   |

### Shipped

| Task     | File                                   | Notes                                                                                                                                                                                                                                                                                                                                                                |
| -------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R201** | `_utils/domain-api.util.ts`            | `toRegisterDomainBody` no longer strips `name`; new `toUpdateDomainBody`; `DOMAIN_ERROR_CODE` gains `deleteBlockedByStaff` (`E-DMN-004`) and `editBlockedByStaff` (`E-DMN-005`).                                                                                                                                                                                     |
| **R201** | `_components/domain-table-columns.tsx` | 管理名 column renders the real `name` (the 「API未対応」 badge is gone).                                                                                                                                                                                                                                                                                             |
| **R201** | `_components/domain-delete-dialog.tsx` | Confirmation copy is 「{name}（{domain}）」 — FR-012 satisfied as written.                                                                                                                                                                                                                                                                                           |
| **R201** | `_schemas/domain-form.schema.ts`       | `name` max 100 / `domain` max 253 now mirror the API's own limits instead of the generic `TEXT_MAX_LENGTH` (255), so client validation fires before a 400 `E-VAL-001`.                                                                                                                                                                                               |
| **R202** | `page.tsx`                             | Real `updateMutation` (`adminDomainMasterControllerUpdateMutation`); `E-DMN-001` → inline duplicate error, `E-DMN-005` → inline blocked alert + list invalidate; on success the open detail row is patched and its detail query invalidated.                                                                                                                         |
| **R202** | `_components/domain-form-dialog.tsx`   | Edit-mode submit re-enabled (「API未対応」 alert removed), prefill now includes the real `name`, and the FR-011 auth-method-change `AlertDialog` is live again — no longer dead code. Adds the **D9** guard.                                                                                                                                                         |
| **R203** | `_hooks/use-domain-filters.ts`         | Exposes a ready-made `queryParams` (`search`, `authProvider`, `sort: 'domain'`, `order: 'asc'`, `page`, `limit`, `includeTotalAll: true`). `filterDomains`/`paginateDomains` deleted — filtering, sorting and paging are all server-side again.                                                                                                                      |
| **R203** | `page.tsx`                             | Single server-filtered query; `filteredTotal` = `pagination.totalItems`, `totalAll` = `pagination.totalAllItems ?? filteredTotal` (the field is nullable under load per API-093 — degrades to the filtered count rather than showing 0). Search placeholder is now 「管理名・ドメインで検索...」 (server matches both).                                              |
| **R203** | `_constants/domain.constants.ts`       | `DOMAIN_LIST_FETCH_LIMIT` removed; `DOMAIN_PAGE_SIZE_OPTIONS` **[25, 50, 100, 200] → [25, 50, 100]** because the endpoint clamps `limit` to 1–100 (200 would silently return 100 and desync the pager). Adds `DOMAIN_SEARCH_MAX_LENGTH` (100, the API's cap, enforced on the input) and the name/domain maxima.                                                      |
| **R204** | `_components/domain-detail-sheet.tsx`  | Adds `adminDomainMasterControllerDetailOptions({ path: { id } })`; 作成者 now shows `createdByName` (falling back to the raw uuid, then 「—」), 管理名 shows the real value, and the row falls back to the list row while the detail is in flight. 紐づくスタッフ still comes from the staff list's `emailDomain` filter (API-071 §5 delegates it there explicitly). |
| **B4**   | `page.tsx`                             | Confirm-time re-check switched from the staff list (`emailDomain`, limit 1) to `GET /domain-master/{id}` with `staleTime: 0` — the same `staffCount` the server enforces on, in one domain-scoped call. `E-DMN-004` handled as a backstop: the dialog stays open and flips to the blocked state instead of closing.                                                  |

### New decisions

- **D9 — 紐づくスタッフがいる間は ドメイン/認証方式 を編集不可にする.** `PATCH` refuses a
  `domain` or `authProvider` change while active staff are attached (409 `E-DMN-005`); 管理名 is
  always editable. The edit dialog therefore disables those two inputs when `activeStaffCount > 0`
  (有効 + 招待中; was `staffCount` until the Y-14 Bug No.14 contract change made `staffCount` an
  all-status display count — the delete block and deactivation warning follow the same field) and
  explains why, instead of letting the user compose a save that is guaranteed to be rejected.
  `E-DMN-005` is still handled on the mutation as a race backstop (staff linked while the dialog
  was open). Nothing is removed from the UI — the fields stay rendered and prefilled.
- **D10 — the whole form is PATCHed, not a diff.** The API treats a field carrying its current
  value as a no-op (`updatedAt` untouched) and rejects an empty body with 400 `E-VAL-001`, so
  sending all three fields is both safe and simpler than computing a diff — and it is what makes
  D9's "only 管理名 differs" case work on a staff-attached domain.
- **D11 — `totalAllItems` over a second baseline query.** `includeTotalAll=true` gives the
  unfiltered count in the same request, so the positions-style second `limit: 1` baseline query
  (their D5) is not needed here.

### Verification

- `npm run type-check` — **0 errors in `src/app/(private)/domains/**`and 0 in`src/lib/api-real/**`.**
  The repo-wide run is **not** clean: 2193 errors, all of them pre-existing and caused by the
  separately-staged **mock** API regeneration (`src/lib/api/@tanstack/react-query.gen.ts` deleted,
  `src/lib/api` export surface changed) — 316 are bare "cannot find module `@/lib/api/...`". None
  touch this feature. See _Out of scope_ below.
- `npx eslint` on all nine domain files — **0 errors, 0 warnings**; `prettier` clean.
- Dev server starts and `/domains` resolves (307 → `/login`, auth middleware). **Live smoke run is
  still pending** for the same reason as Round 1: the dev API sits behind the real Cognito pool and
  no usable credentials exist in this environment. Owner: user.

### Round 3 backlog

- **R301 — FR-015 有効/無効 (isActive).** The API is _ready_ (`isActive` on both list and detail
  DTOs, `PATCH /{id}/active`), but the UI is deliberately **not** built: `spec.md` scopes FR-015 to
  Phase 2 and states outright that "Phase 1 implementation must not expose this column or these
  actions". This is a **product/scope call, not an API gap** — say the word and Round 3 adds the
  状態 column + badge, the row/detail toggle action and its confirm dialog. Note that a deactivated
  domain is already included in the list today and currently renders indistinguishably from an
  active one, so until this lands the list quietly under-reports which domains actually grant access.
- **R302 — FR-011 can no longer state a non-zero staff count.** The spec wants the auth-method-change
  confirm to name "the number of linked staff affected", but `E-DMN-005` forbids changing
  `authProvider` exactly when staff are attached, so the dialog can only ever fire with 0名.
  **Phase 1**, not Phase 2 (only FR-015 / User Story 5 carries the Phase 2 tag), so it needs
  resolving in this phase.
  - **Root cause** — not BE strictness: identity is provisioned **at invitation** (API-070 creates a
    Cognito user only for a `cognito` invite) and the login route is resolved from the id_token's
    `iss` claim (API-069 `POST /auth/crm/login`), never re-read from the domain master. Flipping a
    domain's `authProvider` therefore does **not** re-route existing staff — it locks them out.
    FR-011/SC-004's premise (a hot-swappable auth route) is technically wrong.
  - **Decision (2026-09-17, user)** — **follow the BE**. Confirmed as the spec by Y-14.md
    `260912_v2` (2026-09-12): domain/認証方式 are editable only at 0 active staff, switching route
    goes Y-01 無効化 → ドメイン編集 → 再招待. FR-011/SC-004 in [spec.md](./spec.md) have been
    rewritten to match and **Q5** there is closed (Q1–Q4 in `qa-authprovider.md` cover a different,
    cross-system `authProvider` topic and remain open).
  - **State of the code** — behaviour already matches the BE (**D9**): 認証方式 is read-only while
    staff are attached, `E-DMN-005` handled as a race backstop. The FR-011 `AlertDialog` is
    **deliberately not deleted** — it stays rendered and reachable at `activeStaffCount === 0` so the
    decision is reversible either way, with a comment in `domain-form-dialog.tsx` pointing here.
  - **Still to do** — `checklists/parity.md` **PAR040** is currently ticked `[x]` but no longer
    holds (its 「スタッフ{n}名」 copy can only render 0名); PAR038 needs its note extended. Now
    unblocked by the v2 answer above.
- **R303 — `E-DMN-004` carries no staff count.** `ErrorResponseDto` is only
  `code/message/userMessage/traceId`, so in the race case (staff linked between the confirm-time
  re-check and the DELETE) the dialog falls back to the row's own `staffCount` for its message. Minor
  BE ask: include the blocking count in the 409 body.
- **R304 — column sorting.** The list now accepts `sort=domain|name|createdAt`, but every column is
  still `enableSorting: false` (unchanged since the mock era). Optional UX enhancement, no blocker.
- **R305 — live smoke run.** Carried over from Round 1's T012, now covering the Round 2 paths:
  server-side search across 管理名 + ドメイン, auth-method filter, paging at 25/50/100, detail sheet
  (incl. `createdByName` and 紐づくスタッフ), create, duplicate rejection (`E-DMN-001`), **edit —
  clean save, name-only save on a staff-attached domain, duplicate on edit, `E-DMN-005` race**,
  delete (clean + blocked via the confirm-time re-check + `E-DMN-004` race), non-HQ direct-nav 403.

### Out of scope (flagged, not touched)

The working tree carries a staged regeneration of the **mock** client (`src/lib/openapi.json`,
`src/lib/api/**`) in which `src/lib/api/@tanstack/react-query.gen.ts` was deleted while ~20 files
still import it. That breaks `npm run type-check` repo-wide (2193 errors) and is unrelated to this
feature — the domain screens moved off the mock client in Round 1. Re-running
`npm run generate-api` (or reverting those staged files) is the fix; left alone here deliberately.
