# Implementation Plan: Banner List Management (I-02 FR-005 List Scope)

**Branch**: `010-banner-list` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-banner-list/spec.md`

## Summary

Implement a new Banner List screen for Phase 1 with full list rendering, search/detail filters, sortable columns, role-gated row/header actions, delete confirmation, display-order management dialog, pagination metadata, and empty states. The implementation will follow existing list patterns (`surveys`) and mock API architecture (Zod schema + `registerRoute` + generated React Query client), introducing a new `banners` feature module in both App Router UI and mock API routes.

Technical approach:

- UI: `src/app/(private)/banners/` with `DataTable`, `nuqs` query-state filters, `RoleGatedButton`, `RoleGatedMenuItem`, `AlertDialog`, `Dialog`, `TablePaginationWithSize`, and `Empty`.
- API mock: `src/app/api/crm/banners` list/delete/reorder endpoints backed by `_mock-db` module (`src/app/api/_mock-db/index.ts`) and table builders under `src/app/api/_mock-db/tables/`.
- Contracts and typing: Zod schemas in `src/app/api/_schemas/banner.schema.ts`; OpenAPI registration through `_routes/index.ts`; generated client consumed via TanStack React Query hooks.
- Permissions: add banner-specific permissions and page-level mapping; route-level redirect enforcement remains in `src/proxy.ts`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-explicit-any`), Node.js >= 24.0.0  
**Primary Dependencies**: Next.js 16 (App Router), React 19, TanStack React Query 5, TanStack Table 8, nuqs, shadcn/ui (Dialog/AlertDialog/Table/Badge/Button/Input/Select), lucide-react, sonner, Zod 4, `next/image`  
**Storage**: Phase 1 in-memory mock DB module (`src/app/api/_mock-db/`); Phase 2 real REST API via generated client  
**Testing**: `npm run type-check`, `npm run lint`, local route verification via `npm run dev` + mock endpoint calls; contract docs maintained in `specs/010-banner-list/contracts/`  
**Target Platform**: CRM web app (desktop-first, minimum viewport 768px)  
**Project Type**: Single Next.js web application (frontend + colocated mock API routes)  
**Performance Goals**: Respect constitution budgets (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1, route JS <= 250kB gzip) and feature goals in spec (filter interaction <300ms for <=500 rows)  
**Constraints**: Phase 1 mock-only; no server-side pagination required for expected volume (<200 banners); no realtime status refresh; no client-side order-input hard validation (server sanitizes/rejects)  
**Scale/Scope**: 1 new list route, 1 feature hook, ~7-9 UI components, 3 mock endpoints (GET list, DELETE item, PATCH reorder), schema + permission + route wiring updates

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Gate                                                                          | Status | Notes                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| I. Spec-First                 | Implementation traces to approved I-02 requirement and finalized feature spec | PASS   | Uses `specs/010-banner-list/spec.md` as source of truth for FR-001..FR-020          |
| II. Two-Phase                 | Phase 1 built fully on mock route handlers and `_mock-db`                     | PASS   | New banner endpoints are mock-only and generated-client compatible                  |
| III. Strict Type Safety       | No `any`; Zod schema contracts; strict TS across UI/API boundary              | PASS   | Add banner schemas in `_schemas`; shared types inferred from Zod/generated client   |
| IV. Component Purity          | Use existing design system components + tokens; no new primitives             | PASS   | Reuse `PageHeader`, `DataTable`, `RoleGated*`, `Empty`, shadcn primitives           |
| V. React Query / No raw fetch | Server state via generated React Query option factories                       | PASS   | UI consumes generated hooks/options from `src/lib/api/@tanstack/react-query.gen.ts` |
| VI. Performance Budget        | Keep client islands minimal, use `next/image`, avoid unnecessary heavy libs   | PASS   | List page is single client route with lightweight local state and memoized columns  |

**Initial gate result**: PASS. No constitutional violations identified.

**Post-design re-check (after Phase 1)**: PASS — Phase 1 artifacts keep data access in mock APIs + generated query layer, maintain strict typing, and reuse project UI primitives only.

## Project Structure

### Documentation (this feature)

```text
specs/010-banner-list/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── get-banners.md
│   ├── delete-banner-by-id.md
│   └── patch-banners-display-order.md
├── checklists/
└── tasks.md                # created by /speckit.tasks (not by this command)
```

### Source Code (repository root)

```text
src/app/(private)/banners/
├── page.tsx
├── _hooks/
│   └── use-banners-filters.ts
├── _constants/
│   └── banner.constants.ts
└── _components/
    ├── banner-list-header-actions.tsx
    ├── banners-filters.tsx
    ├── banners-sort-header.tsx
    ├── banners-table-columns.tsx
    ├── banner-delete-dialog.tsx
    ├── banner-order-dialog.tsx
    └── banner-thumbnail.tsx

src/app/api/_schemas/
└── banner.schema.ts

src/app/api/crm/banners/
├── route.ts
├── [id]/route.ts
└── display-order/route.ts

src/app/api/
├── _mock-db/
│   ├── index.ts
│   ├── _create-db.ts
│   └── tables/
└── _routes/index.ts

src/types/
└── permission.type.ts

src/constants/
└── permission.constants.ts
```

**Structure Decision**: Add a new `banners` vertical slice following the same list-page architecture used by `surveys`, with route-generation handled by `npm run generate-routes` (do not manually edit `src/lib/routes/routes.config.ts`).

## Complexity Tracking

No constitution violations or exceptional complexity requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| _(none)_  | —          | —                                    |
