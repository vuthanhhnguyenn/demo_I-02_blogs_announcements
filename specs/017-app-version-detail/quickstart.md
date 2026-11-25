# Quickstart: App Version Management (Detail Screen)

**Goal**: Replace the `016-app-version-management` placeholder stub at `src/app/(private)/app-versions/[id]/page.tsx` with the real detail screen — full read-only record, role-gated (visible-but-disabled) Edit/Delete controls, delete confirmation reusing the list screen's dialog/endpoint, and a not-found state for missing/logically-deleted IDs — with mock-backed data. No permission or route-guard changes needed; both already exist from `016-app-version-management`.

---

## Implementation Checklist

- [ ] Add `getById(id): AppVersionRecord | null` to `src/app/api/_mock-db/tables/app-version.table.ts` (excludes `deletedAt !== null` rows, same predicate as `getList`) — see [research.md §5](research.md#5-mock-table-method)
- [ ] Add `GetAppVersionResponseSchema` (or reference `AppVersionRecordSchema` directly) in `src/app/api/_schemas/app-version.schema.ts` — see [research.md §4](research.md#4-response-schema--reuse-not-a-new-entity)
- [ ] Add a `GET` handler to the existing `src/app/api/crm/app-versions/[id]/route.ts` (alongside the existing `DELETE`), per [contracts/get-app-version.md](contracts/get-app-version.md)
- [ ] Run `npm run generate-routes`, `npm run generate-openapi`, `npm run generate-api` in that order to produce `getCrmAppVersionsByIdOptions`/`getCrmAppVersionsByIdQueryKey`
- [ ] Rewrite `src/app/(private)/app-versions/[id]/page.tsx`: replace the "準備中" placeholder with the real screen, following the `training-equipment/[id]/page.tsx` pattern (see [research.md §1](research.md#1-detail-page-pattern-to-follow)):
  - `PageHeader` with `BackLink` (label "アプリ配信バージョン管理に戻る", `href={navigate('/app-versions')}`) as breadcrumb, title "バージョン詳細"
  - Single `Card` with a 2-column field grid (ID, brand `Badge`, iOS version+build, Android version+build, release date, created date, updated date) + remarks below + the maintenance-window `Alert` below that — matching `pages/app-version-detail.tsx` exactly
  - `RoleGatedButton requiredPermission={Permission.AppVersionsDelete}` and `RoleGatedButton requiredPermission={Permission.AppVersionsEdit}` in `PageHeader`'s `actions`, matching `training-equipment`'s usage
  - Edit button navigates to `navigate('/app-versions/[id]/edit', id)` (the out-of-scope edit screen's stub route, already gated correctly)
  - Not-found: distinguish via `APP_VERSION_NOT_FOUND_MESSAGE` message-matching, fed into `DataStateBoundary`'s `isEmpty` — see [research.md §2](research.md#2-not-found-detection) and the code-review update below it
  - Delete: reuse `AppVersionDeleteDialog` from `016-app-version-management`'s `_components`; on confirm, call `deleteCrmAppVersionsByIdMutation`; `onSuccess` invalidates `getCrmAppVersionsQueryKey()` and `router.push(navigate('/app-versions'))`

---

## Suggested File Targets

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   └── tables/
│   │   │       └── app-version.table.ts        # EXTEND: add getById
│   │   ├── _schemas/
│   │   │   └── app-version.schema.ts           # EXTEND: add GetAppVersionResponseSchema
│   │   └── crm/
│   │       └── app-versions/
│   │           └── [id]/
│   │               └── route.ts                # EXTEND: add GET (alongside existing DELETE)
│   └── (private)/
│       └── app-versions/
│           └── [id]/
│               ├── page.tsx                    # REPLACE: placeholder → real detail screen
│               └── _components/
│                   └── app-version-detail-skeleton.tsx  # NEW: DataStateBoundary loading skeleton
```

Reuses `AppVersionDeleteDialog` from the sibling list page's `_components/` directory as-is; the one new file is a loading skeleton required by code-rule II ("loading states must use skeleton placeholders matching content shape").

---

## Step-by-Step Flow

1. **Extend the mock table and schema**
   - `getById` mirrors `getList`'s `deletedAt === null` filter; returns `null` on no match so the route can 404.
   - Reuse `AppVersionRecordSchema` for the response — no new entity.

2. **Add the `GET` route handler**
   - Mirror `GET /crm/banners/{id}`'s structure (try/catch, 404 on missing, 500 on unexpected error) but call `db.appVersions.getById(id)`.
   - `registerRoute(...)` the new `GET` alongside the existing `DELETE` registration in the same file.

3. **Regenerate the API client**
   - `npm run generate-routes && npm run generate-openapi && npm run generate-api`.
   - Confirms `getCrmAppVersionsByIdOptions`/`getCrmAppVersionsByIdQueryKey` now exist in `src/lib/api/@tanstack/react-query.gen.ts`.

4. **Build the detail page**
   - Fetch via `useQuery({ ...getCrmAppVersionsByIdOptions({ path: { id } }) })`.
   - Wrap the page in `DataStateBoundary` (code-rule II requires this for any data-fetching page): `isLoading` → a shape-matching skeleton (`AppVersionDetailSkeleton`, not a bare spinner), `isError` (excluding the not-found case — see below) → the built-in retry-able error state, `isEmpty` → the not-found state.
   - Distinguish "not found" from a genuine server error by checking the thrown error's message against `APP_VERSION_NOT_FOUND_MESSAGE` (exported from `app-version.schema.ts` and used by both the route's 404 response and the page) — the generated client's error type carries only the parsed response body, no HTTP status, so message-matching is the only signal available. Do **not** copy `studios`/`instructors`' `error?.message === 'NOT_FOUND'` check — nothing in this codebase ever sets that literal string, so that check is always false.
   - `DataStateBoundary`'s `isEmpty` branch only actually renders its `emptyContent` when `children` is a single stable, valid React element (not a conditional expression like `{data && <X/>}`, which evaluates to `false`/not-an-element and silently renders nothing). Structure the page's children as one `AppVersionDetailBody` component that accepts an `emptyContent` prop and decides internally whether to render the loaded UI or the not-found message + back-link.
   - Render the single `Card` matching the UI prototype field-for-field.
   - Wire Edit (navigate to edit stub) and Delete (reuse dialog + mutation, redirect to list on success).

5. **Validate acceptance scenarios**
   - Walk through every acceptance scenario in [spec.md](spec.md) for each role: System, Headquarter, Manager, Staff, Observer, Trainer.
   - Specifically verify: every field renders correctly including `remarks: null` as empty; back link returns to the list; delete requires confirmation and redirects to the list afterward with the record gone; Manager/Staff/Observer see disabled Edit/Delete with a tooltip; direct navigation to the edit URL 403s for those roles; Trainer gets `/403` on this detail URL directly; a nonexistent or logically-deleted ID shows the not-found state, not a blank page or crash.

### Verification Results (recorded during implementation)

Ran against a live `npm run dev` instance: direct `GET /crm/app-versions/{id}` calls via `curl`, page-level route checks via `curl` (redirect behavior), and full rendered-DOM checks via a headless Chrome session (cookie-authenticated per role) for button state and field content — using mock-login tokens for `admin@example.com` (Headquarter), `manager@example.com` (Manager), `observer@example.com` (Observer), `trainer@example.com` (Trainer):

- `GET /crm/app-versions/{id}` for an existing, active record: `200` with the full flat record — confirms FR-001, contract happy path.
- `GET /crm/app-versions/{id}` for a well-formed but nonexistent id: `404` — confirms FR-009.
- `GET /crm/app-versions/{id}` for a seeded record with `deletedAt` set: `404`, identical to the not-found case — confirms FR-009's logical-deletion rule.
- `GET /app-versions/{id}` as Headquarter/Manager/Observer: `200` — confirms View access for all non-Trainer roles (FR-006).
- `GET /app-versions/{id}` as Trainer: `307` → `Location: /403` — confirms FR-007/SC-002.
- `GET /app-versions/{id}/edit` as Manager and Observer (direct URL, bypassing the disabled button): both `307` → `Location: /403`; as Headquarter: `200` — confirms FR-008.
- Rendered DOM for Headquarter: "削除"/"編集" buttons both present and `disabled: false` — confirms FR-004/FR-003 for the permitted role.
- Rendered DOM for Manager and Observer: "削除"/"編集" buttons both present and `disabled: true` — confirms FR-006 (visible-but-disabled, not hidden).
- Rendered DOM for an active record: page text includes the iOS version/build (`3.2.1`, `321001`), brand label (`FIT365`), and the maintenance-window reminder text — confirms FR-001/FR-010.
- Rendered DOM for a record with `remarks: null`: the "備考" label renders with no value and no placeholder/error text — confirms the User Story 1 edge case.
- Rendered DOM for a nonexistent id: not-found message and the back link both render — confirms FR-009's UI behavior (not just the API's).
- Delete flow (Headquarter): clicking "削除" opens a dialog naming the record (`2.8.0` visible in the dialog text); clicking "キャンセル" leaves the URL/record unchanged; clicking "削除" again then "削除する" redirects to `/app-versions`; a subsequent `GET` on that id returns `404` — confirms FR-004/FR-005 and User Story 2's full flow including the cancel path.

---

## Verification Commands

```bash
npm run lint
npm run type-check
```

This project has **no automated test suite** (constitution's No Testing Policy) — do not add Jest/Vitest/Playwright. Verification is TypeScript strict compilation, ESLint, and the manual scenario walkthrough above.

---

## Implementation Command Order (Phase 1)

```bash
# 1) Regenerate route registry (no new route segments here, but safe/idempotent to re-run)
npm run generate-routes

# 2) Refresh OpenAPI from registered route schemas (new GET route + schema)
npm run generate-openapi

# 3) Regenerate API client from the latest openapi.json
npm run generate-api

# 4) Validate production compilation
npm run build
```

---

## Phase 2 Note

When the real backend OpenAPI for Y-05 is published:

- Regenerate the client; replace the Phase 1 mock `GET /crm/app-versions/{id}` usage with the generated `getCrmAppVersionsByIdOptions`-style React Query factory — zero application-code changes beyond the import, per Constitution Principle II.
- Delete already targets the real (mock) `DELETE /crm/app-versions/{id}` from `016-app-version-management` — Phase 2 only swaps the generated client call, no behavior change.
- The Edit entry point continues to route to `/app-versions/{id}/edit`, whose real form is a separate future feature; no change needed here when that feature ships.
