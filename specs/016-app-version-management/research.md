# Research: App Version Management (List Screen)

**Feature**: 016-app-version-management
**Input**: [spec.md](spec.md)

All unknowns below were resolved by reading existing sibling implementations rather than external research, since this feature is a straightforward slice of an already-established pattern in this codebase (paginated/filterable admin list + role-gated mutation controls + mock DB → generated client).

## 1. API route path and shape

**Decision**: Implement the list endpoint at `GET /crm/app-versions`, returning `{ items: AppVersionRecord[], pagination: { page, limit, totalItems, totalPages } }`.

**Rationale**: `docs/api/Y-05.md` (the PO API spec) documents the endpoint as `GET /app-versions`, but every sibling CRM endpoint in this codebase lives under `/crm/*` (`/crm/banners`, `/crm/training-equipment`, `/crm/instructors`, etc. — see `src/app/api/crm/`). The response envelope (`items` + `pagination` with `page/limit/totalItems/totalPages`) already matches `docs/api/Y-05.md` exactly and mirrors `src/app/api/crm/banners/route.ts`, so no shape translation is needed — only the path prefix changes to match project convention.

**Alternatives considered**: Using the literal `/app-versions` path from the PO doc — rejected, would be the only CRM list endpoint outside the `/crm/*` namespace and would break the generated client's naming convention (`getCrmBannersOptions`-style factories).

## 2. Brand enum for this feature

**Decision**: Define a dedicated `AppVersionBrandEnumSchema = z.enum(['Joyfit', 'Fit365'])`, distinct from the existing shared `BrandEnumSchema` in `src/app/api/_schemas/brand.schema.ts`.

**Rationale**: The shared `BrandEnumSchema` has 5 lowercase values (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`) covering brand _and_ sub-brand granularity, used by banners/lessons/etc. `docs/api/Y-05.md` and the UI prototype (`app-management.tsx`) both consistently use exactly 2 capitalized values (`Joyfit`, `Fit365`) — app versions are released per top-level brand only, sub-brands share the same mobile app build. Reusing the 5-value enum would let a nonsensical `brandEnum=joyfit24` pass validation with no matching data. A dedicated 2-value enum matches the PO contract exactly and fails fast on invalid input.

**Alternatives considered**: Reusing `BrandEnumSchema` and filtering sub-brand values in application code — rejected as unnecessary complexity for a field the contract already restricts to 2 values.

## 3. Soft-delete field shape and the DELETE endpoint

**Decision**: Mock table row carries `deletedAt: string | null`; `getList()` filters `deletedAt === null`; `softDelete(id)` sets `deletedAt = new Date().toISOString()`. Add a mechanical `DELETE /crm/app-versions/{id}` route following `src/app/api/crm/banners/[id]/route.ts`'s `DELETE` handler for auth/soft-delete/idempotency (404 if not found/already deleted), but returning a bare `204 No Content` on success rather than banners' `200` + `{ message, id }` body — see [contracts/delete-app-version.md](contracts/delete-app-version.md).

**Rationale**: `docs/api/Y-05.md` (the PO doc handed to this plan) only documents the List endpoint, but the feature's own spec (FR-009, SC-004, User Story 3) requires the list screen's delete-with-confirmation to actually remove the record — a spec requirement takes precedence over an incomplete source doc for an action explicitly in this feature's scope. Since deletion is logical, "actually remove" only requires a `softDelete` mutation on the same mock table already needed for the `deletedAt` exclusion filter (FR-005) — this is a few-line, low-risk addition that reuses an existing exact precedent, not a speculative new contract. It is not "inventing" the future create/edit form's API — it's completing the one action (delete) this list screen's own spec already commits to.

`docs/api/Y-05.md`'s business rule is phrased literally as "`deleted_at IS NOT NULL`" and "excluded through the partial index" — a timestamp column, not a boolean flag. `src/app/api/_mock-db/tables/training-equipment.table.ts` shows a sibling pattern using a boolean (`is_deleted`) instead; either works functionally, but a timestamp keeps the mock's semantics identical to the documented business rule.

**Alternatives considered**:

- Boolean `is_deleted` flag (training-equipment precedent) — rejected only because the PO doc explicitly specifies timestamp semantics; not a strong preference either way.
- Leaving delete as a client-only/no-op action pending the future create/edit feature — rejected: it would make spec FR-009/SC-004 ("delete removes the record... zero accidental deletions") false in the shipped screen, and the actual endpoint is a two-line mock-table method plus a copy of an existing route file, so deferring it saves no real complexity.

## 4. Permission model

**Decision**: Add four new `Permission` enum entries — `AppVersionsView`, `AppVersionsCreate`, `AppVersionsEdit`, `AppVersionsDelete` — to `src/types/permission.type.ts`, wired into `PAGE_PERMISSIONS` and every role's list in `src/constants/permission.constants.ts`, exactly matching the `TrainingEquipment*`/`Banners*` precedent.

**Rationale**: This codebase's established convention (confirmed across `banners`, `training-equipment`, `staffs`, `stores`, etc.) is one dedicated `Permission` per resource per action, not bare `allowedRoles` on components. `RoleGatedButton`/`RoleGatedMenuItem` already support `requiredPermission` and already render "visible but disabled + tooltip" when denied — the exact behavior the spec (revised) now requires — so no new UI primitive is needed, only new enum entries and their role wiring:

| Role        | View | Create | Edit | Delete |
| ----------- | ---- | ------ | ---- | ------ |
| System      | ✅   | ✅     | ✅   | ✅     |
| Headquarter | ✅   | ✅     | ✅   | ✅     |
| Manager     | ✅   | —      | —    | —      |
| Staff       | ✅   | —      | —    | —      |
| Observer    | ✅   | —      | —    | —      |
| Trainer     | —    | —      | —    | —      |

This exactly encodes the Y-05 permission matrix (`requirements/Y-05.md`) and the spec's FR-007–FR-011.

**Alternatives considered**: `allowedRoles` directly on the buttons — rejected as inconsistent with every comparable existing feature; would also require duplicating the role list in both the button props and the route guard instead of a single `Permission` source of truth.

## 5. Satisfying "403 on direct URL access" for out-of-scope create/edit screens (FR-013)

**Decision**: Create minimal stub pages at `src/app/(private)/app-versions/create/page.tsx` and `src/app/(private)/app-versions/[id]/edit/page.tsx` (and a stub detail page at `[id]/page.tsx` for row-click navigation), each rendering only a placeholder ("この画面は準備中です" + a back-link to the list). Give each route a `PAGE_PERMISSIONS` entry (`AppVersionsCreate`, `AppVersionsEdit`, `AppVersionsView` respectively).

**Rationale**: `src/lib/routes/routes.config.ts` is auto-generated by scanning `page.tsx` files under `src/app/(private)/` (`npm run generate-routes`); a route with no `page.tsx` simply doesn't exist in that config, so `src/proxy.ts`'s role check never runs for it and Next.js returns its default 404 instead of the system's 403 page. Since the spec (revised) requires a **403**, not a 404, for a role lacking create/edit permission that force-navigates to these URLs, the routes must physically exist — even though their real form UI is a separate, future feature. A tiny placeholder page is the minimum needed to get a real route entry and therefore real proxy-level enforcement; it is not the create/edit form itself.

**Alternatives considered**: Skipping the stub pages and relying on the "New Registration"/"Edit" buttons being disabled — rejected, since the spec explicitly calls out direct URL access as a separate case the disabled button doesn't cover (FR-013, edge case: "Manager/Staff/Observer directly navigates to the create/edit URL").

## 6. UI composition — no new shared components needed

**Decision**: Build the list page entirely from existing shared components: `PageHeader`, `Card`, `DataTable` (+ `DataTableRowActions` for the per-row edit/delete menu, already permission-aware), `TablePaginationWithSize`, `Empty`, `RoleGatedButton`, plus a small brand `<Select>` filter and an `AlertDialog`-based delete confirmation (mirroring `banner-delete-dialog.tsx`).

**Rationale**: `src/app/(private)/banners/page.tsx` and its `_components/` are structurally the closest precedent (list + brand filter + role-gated create button + per-row edit/delete + confirm dialog, no detail page complexity). `DataTableRowActions` already accepts a `permissions: { edit, delete }` map and renders through `RoleGatedButton`/`RoleGatedMenuItem` internally, so per-row gating requires zero new gating logic — just passing the new `Permission.AppVersionsEdit`/`Delete` entries.

**Alternatives considered**: None — this directly satisfies Constitution Principle V (no new abstractions/dependencies).
