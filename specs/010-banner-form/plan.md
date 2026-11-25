# Implementation Plan: Banner Form Management (I-02 FR-005 Form Scope)

**Branch**: `010-banner-form` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-banner-form/spec.md`

## Summary

Build the Phase 1 Banner **create/edit form screen** — a shared `BannerForm` client component used by two page routes (`/banners/create`, `/banners/[id]/edit`). The form uses `react-hook-form` + `zod` and covers image (file upload via `useImageUpload`), title, brands (multi-select, `brandEnum`), link URL, period (start/end date inputs), WEB/mobile channel toggles, order inputs. Create mode opens with empty defaults; Edit mode pre-fills via `useQuery`. Submit calls the generated React Query mutation (`POST` for create, `PATCH` for update), shows a success toast, and navigates to the banner list.

Technical approach: shared `BannerForm` component at `src/app/(private)/banners/_components/banner-form/banner-form.tsx` with `mode: 'create' | 'edit'`. Two thin page files pass mode + default values. Mock API handlers (POST create, PATCH update, GET by ID detail) live in the existing banner route handler files, backed by enriched mock-DB `add()` / `update()` methods and a separate many-to-many brand map table for `brandEnum`. Client-side validation uses a new `banner-form.schema.ts`; server-side request/response schemas were added to the existing `banner.schema.ts`. Entry-point gating via `PAGE_PERMISSIONS` (Create → `BannersCreate`, Edit → `BannersEdit`). Image upload uses `useImageUpload` hook (file picker → presigned URL → stored public URL)

## Technical Context

**Language/Version**: TypeScript 5.x (strict, `no-explicit-any`); Node.js ≥ 24.0.0
**Primary Dependencies**: Next.js 16 (App Router), React 19, TanStack React Query 5, react-hook-form + `@hookform/resolvers/zod`, shadcn/ui (Input, Checkbox, Switch, Badge, Card, Button, Label, DatePicker, AlertDialog, Sonner) plus `common/form-field`, lucide-react, `next/image`, date-fns v4
**Storage**: Phase 1 in-memory mock DB (`src/app/api/_mock-db/tables/banner.table.ts`) enriched with `add()` / `update()` / `getById()` methods
**Testing**: `npm run type-check`, `npm run lint`, local route verification via `npm run dev` + mock endpoint calls; contract docs in `specs/010-banner-form/contracts/`
**Target Platform**: CRM web app (desktop-first, minimum viewport 768px)
**Performance Goals**: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, initial JS ≤ 250 kB gzip per route
**Constraints**: Phase 1 mock-only; image upload via `useImageUpload` hook with presigned URL flow (size/type validation client-side); no form auto-save; no dirty-field tracking; status is static badge (computed server-side per list spec)
**Scale/Scope**: 1 shared form component, 2 page routes, 2 new mock API handlers (POST + PATCH), 1 GET-by-id handler, enriched existing schemas and mock-DB, permission config updates

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Gate                                                                             | Status | Notes                                                                                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Spec-First                 | Implementation traces to approved I-02 requirement and finalized feature spec    | PASS   | Uses `specs/010-banner-form/spec.md` as source of truth for FR-FORM-001..FR-FORM-008                                                                                                                                                                           |
| II. Two-Phase (Mock now)      | Phase 1 uses mock Route Handlers + `_mock-db/tables/`; seed ≥ 3 banners          | PASS   | Enriches existing `db.banners` with `add()`/`update()`; new POST/PATCH routes are mock                                                                                                                                                                         |
| III. Strict Type Safety       | No `any`; Zod schemas in `_schemas/`; types reusable; `tsc --noEmit` clean       | PASS   | Extends existing `banner.schema.ts` with create/update payload schemas and response schemas                                                                                                                                                                    |
| IV. Component Purity          | Only `ui/` + `common/` components; design tokens; lucide icons                   | PASS   | Reuses shadcn `Input`, `Checkbox`, `Switch`, `Badge`, `Card`, `Button`, `Label`, `DatePicker`, `AlertDialog`; `common/form-field` (`FormField`); existing `PageHeader` with a custom breadcrumb back-button (unsaved-changes aware, not the static `BackLink`) |
| V. React Query / no raw fetch | Hooks use generated option-factories; query keys from factories; no global store | PASS   | `useQuery` for edit pre-fill; `useMutation` for create/update submit; generated option factories                                                                                                                                                               |
| VI. Performance Budget        | RSC default, `'use client'` minimal, `next/image`, no heavy dynamic imports      | PASS   | Form page is a single client island; skeleton shown during edit pre-fill fetch                                                                                                                                                                                 |

**Initial gate result**: PASS. No violations requiring Complexity Tracking.

**Post-design re-check (after Phase 1)**: PASS — design keeps all data access behind React Query hooks against mock routes, reuses shared/ui components only, introduces no new primitives, no `any`, and no global state store. See `research.md` decisions D1–D7.

## Project Structure

### Documentation (this feature)

```text
specs/010-banner-form/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (mock API contracts)
│   ├── get-banner-by-id.md     # GET /api/crm/banners/{id}
│   ├── post-banner.md          # POST /api/crm/banners
│   └── patch-banner-by-id.md   # PATCH /api/crm/banners/{id}
├── checklists/
│   └── requirements.md  # Pre-existing spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/app/(private)/banners/create/
└── page.tsx                              # NEW: render <BannerForm mode="create" />

src/app/(private)/banners/[id]/edit/
└── page.tsx                              # NEW: fetch detail → render <BannerForm mode="edit" />

src/app/(private)/banners/_components/banner-form/
├── banner-form.tsx                       # NEW: shared form component (mode prop)
├── banner-form-skeleton.tsx              # NEW: loading skeleton for edit pre-fill
├── banner-discard-dialog.tsx             # NEW: unsaved-changes confirm dialog
├── index.ts                              # NEW: barrel export (BannerForm, BannerFormSkeleton)
└── sections/                             # NEW: one component per form card
    ├── banner-basic-info-section.tsx     # title, linkUrl
    ├── banner-image-section.tsx          # image upload + preview
    ├── banner-brand-section.tsx          # brand checkboxes (incl. JOYFIT全体)
    ├── banner-channel-section.tsx        # webEnabled / mobileEnabled switches
    ├── banner-period-section.tsx         # periodStart / periodEnd date pickers
    ├── banner-order-section.tsx          # order number input
    └── banner-form-actions.tsx           # cancel / submit buttons

src/app/(private)/banners/_schemas/
├── banner-form.schema.ts                # NEW: Zod schema + FormValues type (form validation)
└── banner-form.mapper.ts                # NEW: mapper between API detail and form values

src/app/api/_schemas/
└── banner.schema.ts                     # ENRICH: add CreateBannerBodySchema, UpdateBannerBodySchema, response schemas

src/app/api/crm/banners/
├── route.ts                             # ENRICH: add POST handler (create)
└── [id]/route.ts                        # ENRICH: add GET handler (detail) + PATCH handler (update)

src/app/api/_mock-db/tables/
└── banner.table.ts                      # ENRICH: add add() and update() methods

src/app/api/_mock-db/
└── index.ts                             # ENRICH: export new banner methods
```

### Source files NOT changed

```text
src/types/permission.type.ts              # Banner permissions already exist (no change)
src/constants/permission.constants.ts     # Only PAGE_PERMISSIONS entries added (no ROLE_PERMISSIONS changes)
src/app/(private)/banners/_components/banner-list-header-actions.tsx  # Already navigates to /banners/create
src/app/(private)/banners/_components/banners-table-columns.tsx       # Already navigates to /banners/${id}/edit
```

**Structure Decision**: Single Next.js App Router web app. The form is a shared client component under `banners/_components/`. The two page files are thin (~15-30 lines) and delegate to `BannerForm` with the appropriate `mode`. Phase 1 data is served by two new mock handlers (POST/PATCH), consumed through `useMutation` with generated option factories. Banner permissions (`BannersCreate`, `BannersEdit`) already exist from the banner-list feature; only `PAGE_PERMISSIONS` entries need adding.

## Complexity Tracking

> No constitution violations require justification. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| _(none)_  | —          | —                                    |
