# Research: App Version Management (Detail Screen)

**Feature**: 017-app-version-detail
**Input**: [spec.md](spec.md)

All unknowns below were resolved by reading existing sibling implementations rather than external research — this feature is a straightforward slice of an already-established pattern in this codebase (single-record admin detail view + role-gated mutation controls + mock DB → generated client), and it directly extends `016-app-version-management` (the list screen), which already shipped the permissions, route guard, and placeholder page this feature replaces.

## 1. Detail-page pattern to follow

**Decision**: Model the page on `src/app/(private)/training-equipment/[id]/page.tsx`: a single-card (no tabs) client component using `RoleGatedButton` with `requiredPermission` for Edit/Delete, a plain not-found fallback (`if (!record) return <div>...not found...</div>`), and a delete mutation whose `onSuccess` invalidates the list query and `router.push`es back to the list — not the tabbed pattern from `studios/[id]/page.tsx` or `instructors/[id]/page.tsx`.

**Rationale**: The UI prototype (`pages/app-version-detail.tsx`) is a single `Card` with no tabs — matching `training-equipment`'s structure far more closely than `studios`'/`instructors`' multi-tab (基本情報/変更履歴/etc.) layout, which this feature's spec does not call for (no history tab, no linked-entity cards). Reaching for the tabbed pattern would add UI surface the spec never asked for, violating Constitution Principle IV's "shortest path to the user's goal."

**Alternatives considered**: The `studios`/`instructors` tabbed pattern — rejected as unnecessary complexity for a single flat record with 10 fields and no sub-resources.

## 2. Not-found detection

**Decision**: Detect the not-found state as `!isLoading && !data` after the `GET` query settles (the same working check `training-equipment/[id]/page.tsx` uses), not `error?.message === 'NOT_FOUND'`.

**Rationale**: `studios/[id]/page.tsx` and `instructors/[id]/page.tsx` both contain a `const isNotFound = error?.message === 'NOT_FOUND'` check, but grepping the entire codebase (`src/lib/api/**`, `src/lib/client.config.ts`, every mock route) turns up no place that ever sets an error's `message` to the literal string `'NOT_FOUND'` — the generated hey-api client surfaces the mock route's raw `{ error: "..." }` JSON body as the error value, not a normalized `NOT_FOUND` code. That check in the two existing pages is therefore dead code masquerading as a real fallback; copying it here would silently produce no not-found UI at all when a record is missing, which fails spec FR-009/edge-case ("not-found state instead of a blank or broken page"). `training-equipment/[id]/page.tsx`'s simpler `if (!equipment) return <NotFoundParagraph/>` has no such gap — the query settling with no data is exactly the 404 case, regardless of how the error object is shaped.

**Alternatives considered**: Copying `studios`/`instructors`' `isNotFound` check for "consistency" — rejected because consistency with a non-functional check is worse than a working one; no other page in the codebase currently relies on that string, so this is not a regression risk elsewhere.

## 3. API route path and shape

**Decision**: Implement the single-record endpoint at `GET /crm/app-versions/{id}`, returning the flat `AppVersionRecord` object (same shape as one item in the list response) with no wrapper.

**Rationale**: `docs/api/Y-05.md` documents `GET` by `id` returning the record directly (no envelope), and every sibling single-record CRM endpoint in this codebase lives under `/crm/*` (e.g. `GET /crm/banners/{id}`) — `016-app-version-management` already established this same path-prefix adaptation for the list endpoint (its own research.md §1). No shape translation is needed beyond the path prefix.

**Alternatives considered**: Wrapping the response in a `{ data: ... }` envelope like `studios`' detail endpoint — rejected; `docs/api/Y-05.md`'s documented shape is already flat, and `AppVersionRecordSchema` (from `016-app-version-management`) already matches it exactly, so introducing a wrapper would be an unrequested shape change with no basis in either the PO doc or existing sibling code for this resource.

## 4. Response schema — reuse, not a new entity

**Decision**: Reuse `AppVersionRecordSchema` (defined in `016-app-version-management`'s `app-version.schema.ts`) as the `GET`-by-id response schema; add only a thin `GetAppVersionResponseSchema` alias for OpenAPI documentation clarity if the route registration needs a distinctly-named schema, otherwise reference `AppVersionRecordSchema` directly.

**Rationale**: `docs/api/Y-05.md`'s single-record response fields are identical to the list endpoint's per-item fields (`id`, `brandEnum`, `iosVersionName`, `iosBuildNumber`, `androidVersionName`, `androidBuildNumber`, `releaseDate`, `remarks`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`) — there is no new entity here, only a new way to fetch one that already exists.

**Alternatives considered**: Defining a separate `AppVersionDetailSchema` — rejected as needless duplication (Constitution Principle V); would also risk the two schemas drifting apart over time for a resource with no detail-only fields.

## 5. Mock table method

**Decision**: Add `getById(id: string): AppVersionRecord | null` to the existing `createAppVersionTables()` factory in `app-version.table.ts`, returning `null` when the row doesn't exist or `deletedAt !== null` (mirrors the existing `getList()`'s exclusion filter and `softDelete()`'s not-found check).

**Rationale**: The mock table already centralizes the `deletedAt` exclusion rule in one place (`getList`); `getById` reuses the identical `deletedAt === null` predicate so the "logically deleted records are excluded" rule (spec FR-009, `docs/api/Y-05.md`'s business rule) cannot drift between the list and detail lookups.

**Alternatives considered**: Filtering `deletedAt` at the route-handler level instead of the table method — rejected, would duplicate a rule already correctly centralized in the table layer.

## 6. Delete action — full reuse, no new contract

**Decision**: Reuse the existing `DELETE /crm/app-versions/{id}` route, `AppVersionDeleteDialog` component, and generated `deleteCrmAppVersionsByIdMutation` unchanged (all built in `016-app-version-management`). The only new behavior is what happens in `onSuccess`: instead of the list page's "stay on the list, invalidate, close dialog," the detail page's `onSuccess` invalidates the list query key and `router.push`es back to `/app-versions`, since there is no record left to show on the current page.

**Rationale**: The spec (FR-004, FR-005) explicitly scopes delete-from-detail as reusing the already-implemented capability, not a new deletion mechanism — the dialog component takes an `item`/`onConfirm`/`isPending` prop contract already generic enough to be reused as-is from a single-record page (pass the one loaded record instead of a `deleteTarget` from a list row).

**Alternatives considered**: Building a detail-specific delete dialog — rejected, `AppVersionDeleteDialog` has no list-specific coupling and reuses cleanly.

## 7. Permission model

**Decision**: No new `Permission` entries and no `PAGE_PERMISSIONS`/`ROLE_PERMISSIONS` changes. `Permission.AppVersionsView` already guards `/app-versions/:id` (all roles but Trainer), and `Permission.AppVersionsEdit`/`AppVersionsDelete` (System + Headquarters only) already exist — all wired in `016-app-version-management`.

**Rationale**: This feature introduces no new action beyond what the existing `AppVersionActionPermissions` matrix already covers (View/Edit/Delete) — see `016-app-version-management/data-model.md`. Re-declaring or duplicating that matrix here would risk drift between the two features' understanding of who can do what.

**Alternatives considered**: None — this directly satisfies Constitution Principle V (no new abstractions where existing ones already cover the need).

## 8. Maintenance-window reminder note

**Decision**: Render the reminder ("メンテナンス中に強制アップデートのポップアップを表示させないように日時設定をしてください") as a static, always-visible `Alert` component below the remarks field, exactly as shown in the UI prototype — not conditioned on any data field.

**Rationale**: Neither `docs/api/Y-05.md` nor `requirements/Y-05.md` model this as data-driven; the UI prototype hard-codes it as a constant warning, and `requirements/Y-05.md`'s FR-002 shows the identical text as a registration-time reminder. It is informational scaffolding for staff, not a business rule the detail screen needs to evaluate.

**Alternatives considered**: Deriving it dynamically from the linked `Y-06` maintenance-window data — rejected as out of scope; `Y-06` is a separate feature (`関連機能` in `requirements/Y-05.md`) and the UI prototype never fetches maintenance data on this screen.
