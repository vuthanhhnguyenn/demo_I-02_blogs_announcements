# Quickstart: Banner List Management (010)

> Recommended implementation order for `/speckit.implement`.

## Step 1 — Scaffold Banner Route + Feature Slice

- Create `src/app/(private)/banners/page.tsx`.
- Add initial `_hooks/`, `_components/`, `_constants/` directories under `src/app/(private)/banners/`.
- Run `npm run generate-routes` to add typed route entries.
- Verify route opens at `/banners`.

## Step 2 — Define Banner Permissions

- Extend `Permission` enum in `src/types/permission.type.ts` with banner capabilities (`view/create/edit/delete/reorder`).
- Add page-level route permission for `/banners` in `src/constants/permission.constants.ts`.
- Update role permission sets so Headquarter/System can mutate and other roles remain view-only for list scope.
- Verify unauthorized route behavior still redirects to `/403` through `src/proxy.ts`.

## Step 3 — Add Mock API Schemas

- Create `src/app/api/_schemas/banner.schema.ts` with list query, list response, delete response, reorder request/response.
- Align schema field names with generated-client conventions.
- Verify `tsc` type inference compiles cleanly.

## Step 4 — Implement Mock API Endpoints

- Add `src/app/api/crm/banners/route.ts` (GET list with filter/sort/pagination).
- Add `src/app/api/crm/banners/[id]/route.ts` (DELETE).
- Add `src/app/api/crm/banners/display-order/route.ts` (PATCH bulk reorder).
- Register imports in `src/app/api/_routes/index.ts`.
- Add/extend `db.banners` operations in `src/app/api/_mock-db/tables/` and expose via `src/app/api/_mock-db/index.ts` (`getList`, `delete`, `updateDisplayOrder`).

## Step 5 — Regenerate API Client

- Run `npm run generate-client`.
- Confirm generated options/mutations exist for banner endpoints in `src/lib/api/@tanstack/react-query.gen.ts`.
- Confirm generated types include banner query/response shapes.

## Step 6 — Build Filters + Table Columns

- Implement `use-banners-filters.ts` with `nuqs` state, debounce, and clear/reset behavior.
- Implement `banners-filters.tsx` with search + detailed filters + active filter count + clear actions.
- Implement `banners-table-columns.tsx` with sortable columns (order/title/status), channel badges, status badge, and role-gated row actions.
- Ensure row-menu and dialog interactions call `stopPropagation`.

## Step 7 — Implement Dialogs + Header Actions

- `banner-delete-dialog.tsx`: AlertDialog copy/action style per spec.
- `banner-order-dialog.tsx`: staged draft state, up/down swaps, manual order input, save/cancel semantics.
- `banner-list-header-actions.tsx`: role-gated `新規登録` and `並び順を編集` buttons.

## Step 8 — Compose Page

- Integrate `PageHeader`, filter toolbar, filter-result alert banner, `DataTable`, pagination footer metadata text, and Empty variants.
- Wire list query + delete mutation + reorder mutation + toasts + query invalidation.
- Ensure current page resets to 1 on search/filter/sort/page-size changes.

## Step 9 — Verify

- Run `npm run type-check`.
- Run `npm run lint`.
- Run `npm run dev` and manually validate FR-001..FR-020 scenarios from spec.

## Implementation Status

All tasks in [tasks.md](./tasks.md) marked complete. See [checklists/implementation-verification.md](./checklists/implementation-verification.md) for the full verification record.

## Validation Checklist

- [x] List renders all required columns and badges.
- [x] Search, detailed filters, clear actions, and filter-result banner work.
- [x] Sort toggles for `order/title/status` with correct icons.
- [x] Unauthorized roles see disabled header and row actions (not hidden).
- [x] Delete dialog copy/actions and destructive flow work.
- [x] Display-order dialog supports up/down and staged manual input until save.
- [x] Pagination metadata and page-size behavior match spec.
- [x] Empty and filtered-empty states render correctly.
