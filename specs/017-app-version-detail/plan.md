# Implementation Plan: Y-05 App Version Management (Detail Screen)

**Branch**: `017-app-version-detail` | **Date**: 2026-07-14 | **Spec**: [specs/017-app-version-detail/spec.md](spec.md)
**Input**: Feature specification from `/specs/017-app-version-detail/spec.md`

## Summary

Implement the Y-05 App Version Management **detail screen only**: a single read-only card showing every field of one app version record (brand, iOS/Android version + build, release date, remarks, audit fields) plus a maintenance-window reminder, with role-gated "Edit"/"Delete" controls that are visible-but-disabled for Manager/Staff/Observer, a delete confirmation dialog, and a not-found state for missing/logically-deleted IDs. This replaces the existing placeholder stub at `src/app/(private)/app-versions/[id]/page.tsx` (created by `016-app-version-management` solely to satisfy routing/403 requirements) with the real screen, following the simple single-card pattern already established by `training-equipment/[id]/page.tsx` (RoleGatedButton + `requiredPermission`, plain not-found paragraph, delete-then-navigate-to-list) rather than the tabbed pattern used by `studios/[id]`. Adds one new `GET /crm/app-versions/{id}` route + one mock-table `getById` method; reuses the `AppVersionDeleteDialog` component and `deleteCrmAppVersionsByIdMutation` already built for the list screen — no new dependencies, no permission changes (View/Edit/Delete permissions and the `/app-versions/:id` route guard already exist from `016-app-version-management`).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, Zod, lucide-react, Tailwind CSS v4
**Storage**: Phase 1 — `src/app/api/_mock-db/` (extends the existing `app-version.table.ts` from `016-app-version-management` with a `getById` method; no new table); Phase 2 — generated REST client via hey-api, zero application-code changes
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: Detail view loads within 1s for 95% of loads (mirrors list screen's SC-003 target); mirrors `docs/api/Y-05.md` NFR of admin API p95 ≤ 500ms
**Constraints**: Edit/create form screens are out of scope (separate future feature) — this screen only provides the "Edit" entry point; delete is in-scope and reuses the endpoint/dialog already built for the list screen; the page route and its `AppVersionsView` permission guard already exist (`016-app-version-management`) and are not modified
**Scale/Scope**: One new route (`GET /crm/app-versions/{id}`), one new mock-table method, one page rewrite (`[id]/page.tsx`, replacing the placeholder), zero new components beyond what already exists (`AppVersionDeleteDialog`, `RoleGatedButton`, `PageHeader`, `BackLink`); no new npm dependencies; no permission/route-config changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                                                                                               |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | Reuses the existing `AppVersionRecordSchema`-derived `AppVersionRecord` type; no new types needed beyond the route's request/response schemas                                       |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | New `GET /crm/app-versions/{id}` registered via `registerRoute()` before use; `src/lib/api/**` regenerated via `npm run generate-api`, never hand-edited                            |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | `spec.md` + its checklist have no open `[NEEDS CLARIFICATION]` markers                                                                                                              |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | Page is a client component (interactive delete dialog + role-gated buttons), justified same as every other detail page in this codebase; single Card, one confirm dialog, no wizard |
| V   | Simplicity & Min. Deps | ☒ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses `AppVersionDeleteDialog`, `RoleGatedButton`, `PageHeader`, `BackLink`, `Alert` — zero new shared components (research.md §1)                                                 |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — the only new server-side surface (`GET /crm/app-versions/{id}`) is a minimal, existing-pattern addition (mirrors `GET /crm/banners/{id}`); no new abstractions introduced by the data model or contract.

## Project Structure

### Documentation (this feature)

```text
specs/017-app-version-detail/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── get-app-version.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   └── tables/
│   │   │       └── app-version.table.ts        # [EXTEND] add getById(id) alongside existing getList/softDelete
│   │   ├── _schemas/
│   │   │   └── app-version.schema.ts           # [EXTEND] add GetAppVersionResponseSchema (reuses AppVersionRecordSchema)
│   │   └── crm/
│   │       └── app-versions/
│   │           └── [id]/
│   │               └── route.ts                # [EXTEND] add GET handler alongside existing DELETE
│   └── (private)/
│       └── app-versions/
│           └── [id]/
│               └── page.tsx                    # [REPLACE] placeholder "準備中" stub → real detail screen
└── lib/api/**                                   # [REGENERATE] via generate-routes/generate-openapi/generate-api — no manual edits
```

**Structure Decision**: Single Next.js App Router project, extending the exact `016-app-version-management` structure already in place — no new top-level directories, no new route segments (the `[id]/page.tsx` route, its `AppVersionsView` permission mapping, and `src/proxy.ts`'s 403 enforcement already exist and are untouched). The only additions are: one new API method (`GET` on the existing `[id]/route.ts` file, alongside the existing `DELETE`), one new mock-table read method, and the page content itself. No new shared UI components — `AppVersionDeleteDialog` (from `016-app-version-management/_components`) is reused as-is.

**Implementation Order Note**: Add the mock-table `getById` method and the `GetAppVersionResponseSchema` first, then the `GET /crm/app-versions/{id}` route, then run `npm run generate-routes`, `npm run generate-openapi`, and `npm run generate-api` in that order to produce `getCrmAppVersionsByIdOptions`/`getCrmAppVersionsByIdQueryKey`, then build the page itself last. See [quickstart.md](quickstart.md).

## Phase 0: Research & Unknown Resolution

Research completed in [specs/017-app-version-detail/research.md](research.md).

Resolved items:

- The simple single-card detail pattern from `training-equipment/[id]/page.tsx` (plain not-found paragraph, `RoleGatedButton` + `requiredPermission`, delete-mutation-then-`router.push`-to-list) is the right precedent — not the tabbed `studios/[id]` pattern (unneeded complexity for a single-card record) and not `studios`/`instructors`' `isNotFound = error?.message === 'NOT_FOUND'` check (that string is never actually set anywhere in this codebase's fetch/error pipeline, so that branch never fires there — this feature must not copy a check that doesn't work).
- Not-found detection instead uses `!isLoading && !data` after the query settles (mirrors `training-equipment`'s working `if (!equipment) return <NotFound/>` check), which correctly covers both the `404`/`E-APP-001` response and any other reason the record didn't come back.
- `docs/api/Y-05.md`'s `GET` endpoint is added at this project's `/crm/app-versions/{id}` path (matching the list endpoint's existing `/crm/*` prefix convention from `016-app-version-management`, same path-prefix adaptation already applied there).
- The response schema is the existing `AppVersionRecordSchema` (from `016-app-version-management`) reused as-is — the PO API doc's single-record shape is identical to the list item shape, so no new entity/type is introduced, only a thin response-envelope schema.
- Delete reuses the `DELETE /crm/app-versions/{id}` route and `AppVersionDeleteDialog` component built in `016-app-version-management` unchanged; only the post-delete navigation target is new (`router.push` back to `/app-versions` instead of an in-place list refresh).
- No permission or route-config changes are needed: `Permission.AppVersionsView` already guards `/app-versions/:id` and `Permission.AppVersionsEdit`/`Delete` already exist, from `016-app-version-management`'s `data-model.md`.

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/017-app-version-detail/data-model.md](data-model.md)
- [specs/017-app-version-detail/contracts/get-app-version.md](contracts/get-app-version.md)
- [specs/017-app-version-detail/quickstart.md](quickstart.md)

Design highlights:

- Reuses the `AppVersionActionPermissions` matrix defined in `016-app-version-management/data-model.md` verbatim (View: all roles but Trainer; Edit/Delete: System + Headquarters only) — no new matrix, since this screen introduces no new action beyond what that matrix already covers.
- `GET /crm/app-versions/{id}` follows the exact shape and business rules of `docs/api/Y-05.md`: excludes logically deleted records, returns `404` when not found, response is the flat `AppVersionRecord` object (no wrapper), per [contracts/get-app-version.md](contracts/get-app-version.md).
- The detail page is a single `Card` (matching the UI prototype `pages/app-version-detail.tsx` exactly: ID/brand/iOS/Android/release-date/created/updated in a 2-column grid, remarks below, maintenance-window `Alert` below that) with `PageHeader` actions for Delete/Edit, both `RoleGatedButton`s using `requiredPermission` (not `allowedRoles`, to stay consistent with the permission-matrix-as-single-source-of-truth approach already used for Edit/Delete gating elsewhere in this feature area).
- On confirmed delete, the mutation's `onSuccess` invalidates the list query key and `router.push`es back to `/app-versions` (per spec FR-005), rather than trying to re-render the now-nonexistent detail record in place.

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
