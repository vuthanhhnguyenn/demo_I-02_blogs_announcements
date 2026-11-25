# Research: Y-06 App Maintenance Management

**Input**: [spec.md](spec.md) — all `[NEEDS CLARIFICATION]` tokens already resolved via `/speckit.clarify` (Q1, Q2, Q3, Q5, Q6). This document resolves the remaining _implementation-level_ unknowns needed before Phase 1 design, plus records the default resolution applied to the two low-impact open items (Q4, Q7) that spec.md left with a stated recommendation rather than a formal answer.

## 1. Mock-DB feature closest in shape: `banners` (010-banner-list/010-banner-form)

**Decision**: Model the `app-maintenances` table, schema, and routes directly on the `banners` feature (`src/app/api/_mock-db/{types,tables,seeds}/banner.*`, `src/app/api/_schemas/banner.schema.ts`, `src/app/api/crm/banners/{route.ts,[id]/route.ts}`), not on `instructors` or `entry-exit-logs`.

**Rationale**: `banners` is the only existing feature with the same shape — a start/end datetime range plus a status that is _computed on read from `now()` vs. the range_, never stored (`computeStatus(periodStart, periodEnd)` in `banner.table.ts`). This is exactly FR-007's rule. It also already establishes the snake_case-row / camelCase-request-response convention this plan follows (see §2), and the exact list/create/update/delete route split (`route.ts` for GET-list+POST, `[id]/route.ts` for GET-one+PATCH+DELETE) this feature needs.

**Alternatives considered**: `entry-exit-logs` (013/015) was considered for its _real_ auth pattern (see §4) but its data shape (point-in-time events, not a range+derived-status entity) doesn't match. `instructors` (014) has a closer detail-page pattern but no derived-status range concept and no precedent worth copying for that part.

## 2. Field naming convention: snake_case row / camelCase request-response

**Decision**: The seed/row schema (`AppMaintenanceSchema`) uses snake_case fields (`target_brand`, `starts_at`, `ends_at`, `created_by`, `updated_by`, `created_at`, `updated_at`) mirroring stored data; all request bodies (`CreateAppMaintenanceBodySchema`, `UpdateAppMaintenanceBodySchema`) and response schemas (`AppMaintenanceItemResponseSchema`, `AppMaintenanceDetailResponseSchema`) use camelCase (`targetBrand`, `startsAt`, `endsAt`), each response field re-using `AppMaintenanceSchema.shape.<snake_case_field>` to keep row and wire types in lockstep (exact pattern in `banner.schema.ts`'s `BannerItemResponseSchema`).

**Rationale**: This is the established, consistent split across every existing `_schemas/*.schema.ts` file (`banner.schema.ts`, `entry-exit-log.schema.ts`) — not a per-feature choice. Following it means the eventual `hey-api`-generated client (Phase 2) produces camelCase TS fields identical to every other generated model, with zero special-casing.

**Alternatives considered**: All-camelCase end-to-end (simpler, but diverges from every existing schema file and would look inconsistent in the generated OpenAPI doc next to every other resource).

## 3. ID format: `AM-{NNN}`

**Decision**: `AM-001`, `AM-002`, … — zero-padded 3-digit sequential, computed as `max(existing numeric suffixes) + 1`.

**Rationale**: This is the exact ID format already used in the UI prototype's static sample data (`AM-001`…`AM-005` in `app-maintenance-list.tsx`), and matches the repo-wide `PREFIX-NNN` convention (`BN-001` banners, `EQ-0001` equipment, etc. — width varies by feature, 3 digits fits banners' scale and this feature's "tens of rows" scale per the reference API design's own NFR note).

## 4. Authorization: real request-based auth (`getAuthUserFromRequest`), not the hardcoded-mock-role pattern

**Decision**: Use `src/app/api/_lib/auth.ts`'s `getAuthUserFromRequest(request)` in every route handler (list, detail, create, update, delete), returning 401 when absent/invalid. For write routes (POST/PATCH/DELETE), add an explicit role check: `if (authResult.user.role !== 'System' && authResult.user.role !== 'Headquarter') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })`. GET routes (list, detail) reject only `Trainer` with 403. _(Updated 2026-07-23 per the Y-06 v2 権限マトリクス; originally writes were `System`-only and reads were `System`/`Headquarter`-only.)_

**Rationale**: The spec's FR-014 is a real, security-relevant rule — per the Y-06 v2 (260713*v2) 権限マトリクス, `System`+`Headquarter` may write, `Manager`/`Staff`/`Observer` are view-only, and `Trainer` has no access. This warrants the newer, real-auth pattern (`entry-exit-logs`, 013/015) rather than the older `const MOCK_ROLE = 'headquarter'` hardcoded-constant pattern still used by `banners`/`instructors`/`studios`. Client-side, gating is permission-flag-based via the `Permission.AppMaintenance{View,Create,Edit,Delete}` enum entries (added to `src/types/permission.type.ts` and mapped in `src/constants/permission.constants.ts`) consumed by `RoleGatedButton`/`RoleGatedMenuItem` and `PAGE_PERMISSIONS`. *(This replaced the originally-planned role-based `allowedRoles={[UserRole.System]}` approach — the permission-flag route was chosen during implementation, see tasks.md T023.)\_

**Alternatives considered**: Hardcoded mock role constant (rejected — the whole point of resolving Q1 was a _real_ security boundary, not a cosmetic one); extending `Permission`/`ROLE_PERMISSIONS` for a flag-based check (rejected as unnecessary indirection when the rule is a single literal role comparison).

## 5. Brand type: narrow 2-value union, not the 5-value `BrandEnumSchema`

**Decision**: `AppMaintenanceTargetBrandSchema = z.enum(['joyfit', 'fit365'])`, a dedicated schema in `app-maintenance.schema.ts` — not a reference to the existing 5-value `BrandEnumSchema` (`src/app/api/_schemas/brand.schema.ts`, used by banners/studios/instructors) and not the display-only `Brand` TS enum (`brand-badge.tsx`).

**Rationale**: Per spec's resolved Q3, Phase 1 is exactly the 2-brand selector already in the prototype (JOYFIT/FIT365, no "all brands" option). The `lessons` feature (`009-lesson-content-form`) already establishes this exact narrow-union precedent (`LessonBrand = 'joyfit' | 'fit365'` in `src/app/(private)/lessons/_constants/constants.ts`, `brand: z.enum(['joyfit','fit365'])` in its form schema) — follow it, including a sibling `_constants.ts` with `APP_MAINTENANCE_BRAND_LABELS: Record<AppMaintenanceTargetBrand, string> = { joyfit: 'JOYFIT', fit365: 'FIT365' }` for display.

**Alternatives considered**: Reusing `BrandEnumSchema` (rejected — its 5 values, `joyfit24`/`joyfit_yoga`/`joyfit_plus` sub-brands, don't correspond to anything in this feature and would let invalid values through the API layer that the UI never offers).

## 6. Overlap conflict: server-side only, generic error surfaced

**Decision**: Brand-scoped period overlap (same `target_brand`, overlapping `[starts_at, ends_at)` interval) is checked only inside the mock table's `create()`/`update()` methods, comparing against every existing row for that brand (including `completed` ones, since a past record can still logically overlap a new one being back-dated). On conflict, the route returns `{ error: '登録しようとしている期間は既存のメンテナンス期間と重複しています。' }` with status 409. The client shows this string as a generic toast/inline banner — no lookup of which specific row conflicts (per spec's resolved Q6: the reference API design's own error shape doesn't expose that, and Phase 1 deliberately doesn't build UI to name it).

**Rationale**: Directly implements FR-012 and Q6's resolution with the least new surface area — no new "conflict detail" endpoint or response field.

## 7. In-progress edit/delete lock: enforced in the table layer, not just the route

**Decision**: `db.appMaintenances.update(id, patch)` returns a discriminated result (`'not_found' | 'start_locked' | 'period_conflict' | AppMaintenance`) and `.delete(id)` returns (`'not_found' | 'in_progress_locked' | true`) — mirroring the return-type convention already used by `instructors.delete()` (`'not_found' | 'in_use' | true`). `start_locked` fires when the patch would change `starts_at` (or leaves it implicit while the row is currently `in_progress`, computed via the same `computeStatus` helper) . The route maps each sentinel to its HTTP status (404 / 409 / 409) and the exact Japanese messages already specified in FR-010/FR-011's UI copy.

**Rationale**: Matches FR-010/FR-011 ("the backend independently rejects such a change/deletion"), and keeps the business rule in one place (the table) so the route handler stays a thin translator to HTTP, consistent with every other feature's table/route split.

## 8. Deferred decisions carried forward from spec.md's Q&A (Q4, Q7) — planning-time defaults applied

These two items were intentionally left open in spec.md (not formal `[NEEDS CLARIFICATION]` blockers — Constitution Principle III is satisfied) with a stated recommendation. This plan applies that recommendation so design can proceed; either can be revisited with a follow-up `/speckit.clarify` + a small follow-up change before or after `/speckit.tasks` without restructuring the data model:

- **Q4 (brand editable after creation?)**: Applied spec's own stated default — **not editable**. `UpdateAppMaintenanceBodySchema` has no `targetBrand` field at all (rather than an editable-but-ignored one), and the edit form's brand selector is rendered disabled. This is a stricter, not looser, interpretation, so it carries no risk of accidentally allowing something the backend design forbids.
- **Q7 (optional internal "Remarks/Note" field)**: No default was stated in spec.md. Applying the same "follow the prototype" pattern the user chose for every other Phase 1 scope question (Q2, Q3, Q6) for consistency: **excluded from Phase 1** (no `note` field in the schema, form, or table). This is the lowest-risk choice — the field is purely additive and optional in the backend API design, so adding it later is a non-breaking schema extension, not a rework.

## 9. Generated-client pipeline (Phase 2 readiness, not built now)

**Decision**: No action in this feature beyond following the existing registration convention (`registerRoute()` calls at module scope in each new `route.ts`, then adding an import line to `src/app/api/_routes/index.ts`). Running `npm run generate-openapi` then `npm run generate-api` is a task-list step (`/speckit.tasks`), not a planning concern.

**Rationale**: Constitution Principle II — Phase 1 ships against the mock DB; Phase 2's swap to the generated `hey-api` client is mechanical and out of this plan's scope.
