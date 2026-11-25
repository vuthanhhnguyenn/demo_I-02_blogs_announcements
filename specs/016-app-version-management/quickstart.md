# Quickstart: App Version Management (List Screen)

**Goal**: Build and validate the Phase 1 App Version Management list screen — paginated/filterable list, role-gated (visible-but-disabled) create/edit/delete controls, delete confirmation, and 403-on-direct-URL-access for both the Trainer role (whole screen) and non-managing roles (create/edit URLs) — with mock-backed data.

---

## Implementation Checklist

- [ ] Add `Permission.AppVersionsView` / `AppVersionsCreate` / `AppVersionsEdit` / `AppVersionsDelete` to `src/types/permission.type.ts`
- [ ] Wire the 4 permissions into `PAGE_PERMISSIONS` (`/app-versions`, `/app-versions/:id`, `/app-versions/create`, `/app-versions/:id/edit`) and every role's list in `ROLE_PERMISSIONS`, per the matrix in [data-model.md](data-model.md)
- [ ] Add `AppVersionBrandEnumSchema` and list schemas to a new `src/app/api/_schemas/app-version.schema.ts` — see [research.md §2](research.md#2-brand-enum-for-this-feature)
- [ ] Add mock table `src/app/api/_mock-db/tables/app-version.table.ts` (`getList`, `softDelete`) + seed `src/app/api/_mock-db/seeds/app-version.seed.ts` (a handful of rows across both brands, including one with a future `releaseDate` and one with `remarks: null`, per spec Edge Cases)
- [ ] Register the table in `src/app/api/_mock-db/_create-db.ts` and its type in `_db.types.ts`
- [ ] Add `src/app/api/crm/app-versions/route.ts` — `GET` (list), per [contracts/list-app-versions.md](contracts/list-app-versions.md)
- [ ] Add `src/app/api/crm/app-versions/[id]/route.ts` — `DELETE` only, per [contracts/delete-app-version.md](contracts/delete-app-version.md) (follows `banners/[id]/route.ts`'s `DELETE` handler for auth/soft-delete/404 behavior, but returns `204 No Content` on success instead of a `200` + message/id body)
- [ ] `registerRoute(...)` both new route files + import them in `src/app/api/_routes/index.ts`
- [ ] Build list page `src/app/(private)/app-versions/page.tsx` (mirrors `banners/page.tsx`: `PageHeader`, brand filter, `DataTable` + `DataTableRowActions`, `TablePaginationWithSize`, `Empty` state)
- [ ] Add `_components/app-version-list-header-actions.tsx` ("New Registration" `RoleGatedButton` → `Permission.AppVersionsCreate`)
- [ ] Add `_components/app-version-table-columns.tsx` (columns per data-model.md; row-actions via `DataTableRowActions` with `permissions: { edit: AppVersionsEdit, delete: AppVersionsDelete }`)
- [ ] Add `_components/app-version-delete-dialog.tsx` (mirrors `banner-delete-dialog.tsx`)
- [ ] Add `_components/app-version-filters.tsx` (single brand `<Select>`, no other filters per spec)
- [ ] Add `_hooks/use-app-versions-filters.ts` (`nuqs`-backed `page`/`limit`/`brandEnum`, mirrors `use-banners-filters.ts`)
- [ ] Add stub `src/app/(private)/app-versions/create/page.tsx` and `src/app/(private)/app-versions/[id]/edit/page.tsx` — placeholder-only pages that exist solely to give the route a `PAGE_PERMISSIONS` entry so unauthorized direct navigation 403s (see [research.md §5](research.md#5-satisfying-403-on-direct-url-access-for-out-of-scope-createedit-screens-fr-013)); NOT the real create/edit form (future feature)
- [ ] Add stub `src/app/(private)/app-versions/[id]/page.tsx` — placeholder detail page (view-permission only) so row-click navigation (FR-012) has a target
- [ ] Run `npm run generate-routes` after adding the new route segments
- [ ] Run `npm run generate-openapi` then `npm run generate-api` after finalizing the Zod schema

---

## Suggested File Targets

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   ├── tables/
│   │   │   │   └── app-version.table.ts        # NEW: getList, softDelete
│   │   │   ├── seeds/
│   │   │   │   └── app-version.seed.ts         # NEW
│   │   │   ├── types/
│   │   │   │   └── app-versions.type.ts        # NEW
│   │   │   └── _create-db.ts                   # EXTEND: register table + seed call
│   │   ├── _schemas/
│   │   │   └── app-version.schema.ts           # NEW
│   │   ├── _routes/
│   │   │   └── index.ts                        # EXTEND: import new route file
│   │   └── crm/
│   │       └── app-versions/
│   │           ├── route.ts                    # NEW: GET (list)
│   │           └── [id]/
│   │               └── route.ts                # NEW: DELETE only
│   └── (private)/
│       └── app-versions/
│           ├── page.tsx                        # NEW: list page
│           ├── create/
│           │   └── page.tsx                    # NEW: 403-gated stub (out-of-scope form)
│           ├── [id]/
│           │   ├── page.tsx                    # NEW: view-gated stub (out-of-scope detail)
│           │   └── edit/
│           │       └── page.tsx                # NEW: 403-gated stub (out-of-scope form)
│           └── _components/
│               ├── app-version-list-header-actions.tsx
│               ├── app-version-table-columns.tsx
│               ├── app-version-delete-dialog.tsx
│               └── app-version-filters.tsx
│           └── _hooks/
│               └── use-app-versions-filters.ts
├── constants/
│   └── permission.constants.ts                 # EXTEND: PAGE_PERMISSIONS + ROLE_PERMISSIONS
└── types/
    └── permission.type.ts                      # EXTEND: 4 new Permission entries
```

---

## Step-by-Step Flow

1. **Wire permissions first**
   - Add the 4 `Permission.AppVersions*` entries and their `PAGE_PERMISSIONS`/`ROLE_PERMISSIONS` wiring per the matrix in [data-model.md](data-model.md) — this is the single source of truth both the UI buttons and `src/proxy.ts` will read from.

2. **Add schema + mock table + seed**
   - `app-version.schema.ts`: `AppVersionBrandEnumSchema`, `AppVersionRecordSchema`, `GetAppVersionsQueryParamsSchema`, `GetAppVersionsResponseSchema` (per [data-model.md](data-model.md) and [contracts/list-app-versions.md](contracts/list-app-versions.md)).
   - Seed at least: one Joyfit + one Fit365 record, one record with `remarks: null`, one with a future `releaseDate`, one with `deletedAt` set (to verify exclusion).

3. **Implement the route handlers**
   - `GET /crm/app-versions` — pagination/filter/sort per [contracts/list-app-versions.md](contracts/list-app-versions.md).
   - `DELETE /crm/app-versions/{id}` — soft-delete per [contracts/delete-app-version.md](contracts/delete-app-version.md).
   - Register both via `registerRoute(...)` and import them in `_routes/index.ts` so they reach `openapi.json`.

4. **Build the list page**
   - Brand filter, table with all documented columns, pagination, empty state.
   - "New Registration" button and per-row Edit/Delete via `RoleGatedButton`/`DataTableRowActions` — visible but disabled for Manager/Staff/Observer (per revised spec FR-007–FR-010).
   - Delete confirmation dialog naming the record; on confirm, call the `DELETE` mutation and invalidate the list query on success (mirrors `banner-delete-dialog.tsx` + `deleteCrmBannersByIdMutation` wiring in `banners/page.tsx`, except the success toast uses a static client-side string since the `204` response has no `message` field to read).

5. **Build the 403 stub routes**
   - `create/page.tsx`, `[id]/edit/page.tsx`: minimal placeholder content + a link back to the list. Their only functional job is to exist as real Next.js routes with a `PAGE_PERMISSIONS` entry.
   - `[id]/page.tsx`: same placeholder treatment, gated on `AppVersionsView` only (so Manager/Staff/Observer can still reach it, matching read-only detail access in the Y-05 permission matrix).

6. **Validate acceptance scenarios**
   - Walk through every acceptance scenario in [spec.md](spec.md) manually for each role: System, Headquarter, Manager, Staff, Observer, Trainer.
   - Specifically verify: brand filter narrows results; pagination boundaries disable correctly; future-dated release included; empty state on zero matches; delete requires confirmation and excludes the record afterward; Manager/Staff/Observer see disabled create/edit/delete controls with a tooltip; Trainer gets `/403` on the list URL; Manager/Staff/Observer get `/403` on `/app-versions/create` and `/app-versions/:id/edit` when navigating directly.

### Verification Results (recorded during implementation)

Ran against a live `npm run dev` instance, via direct `GET /crm/app-versions`/`DELETE /crm/app-versions/{id}` calls and mock-login cookies for each role (`trainer@example.com`, `manager@example.com`, `admin@example.com` — see `SEED_USERS`):

- `GET /crm/app-versions` (no params): returns all 6 seeded records minus the 1 soft-deleted one (5 items), most-recent `releaseDate` first — confirms FR-004/FR-005; the 2026-12-01 future-dated record is included first — confirms FR-006.
- `GET /crm/app-versions?brandEnum=Joyfit`: 3 items, all `Joyfit` — confirms FR-002.
- `GET /crm/app-versions?page=2&limit=2`: correct slice + `totalPages: 3` for 5 items — confirms FR-003.
- `GET /crm/app-versions?brandEnum=joyfit24` (invalid enum): `400` — confirms schema validation at the API boundary.
- `DELETE /crm/app-versions/{id}`: `204` on first call; second call on the same id and a call with an unknown id both return `404` — confirms the delete-twice edge case is handled safely, and the record is excluded from a subsequent `GET` — confirms FR-009/SC-004.
- `GET /app-versions` as Trainer: `307` → `Location: /403` — confirms FR-011/SC-002.
- `GET /app-versions` as Manager/Headquarter: `200` — confirms FR-010 (Manager can view).
- `GET /app-versions/create` and `GET /app-versions/{id}/edit` as Manager: both `307` → `Location: /403` — confirms FR-013.
- `GET /app-versions/create` and `GET /app-versions/{id}/edit` as Headquarter: both `200` — confirms FR-007/FR-008 for the permitted role.
- Rendered HTML for Manager's `GET /app-versions` includes the page title and the "新規登録" button text (present, not omitted from the DOM) — confirms the button is visible rather than hidden per FR-007 (client-side enabled/disabled state is driven by the same `RoleGatedButton`/`useAuthUser` mechanism already used and relied upon throughout this codebase).

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
# 1) Regenerate route registry after adding new route segments
npm run generate-routes

# 2) Refresh OpenAPI from registered route schemas
npm run generate-openapi

# 3) Regenerate API client from the latest openapi.json
npm run generate-api

# 4) Validate production compilation
npm run build
```

---

## Phase 2 Note

When the real backend OpenAPI for Y-05 is published:

- Regenerate the client; replace the Phase 1 mock `GET /crm/app-versions` usage with the generated `getCrmAppVersionsOptions`-style React Query factory — zero application-code changes beyond the import per Constitution Principle II.
- The out-of-scope create/edit/detail screens (this feature's stub pages) become the target of a future `017-app-version-form`-style feature; their `PAGE_PERMISSIONS` entries already in place should not need to change.
- Delete already targets a real (mock) `DELETE /crm/app-versions/{id}` in Phase 1 — Phase 2 only swaps the generated client call, no behavior change.
