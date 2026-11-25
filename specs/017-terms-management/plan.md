# Implementation Plan: Y-04 Terms Document Master Management

**Branch**: `017-terms-management` | **Date**: 2026-07-14 | **Spec**: [specs/017-terms-management/spec.md](spec.md)
**Input**: Feature specification from `/specs/017-terms-management/spec.md`

## Summary

Implement CRUD + versioning management of terms documents (規約文書) for Y-04: a type-tabbed,
searchable/filterable/paginated list; a detail page with Basic Information and Version History
(timeline) tabs; a shared registration/edit/new-version form; and role-gated logical delete.
Grounded on the UI prototype (`terms-list.tsx`/`terms-detail.tsx`/`terms-form.tsx`), the Y-04
requirements doc, and the reference backend field snapshot (`mock-api-schema.md`), reconciled via
`/speckit.plan` research (see [research.md](research.md)). Models each terms document version as
one row in a single `terms` table — there is no separate "lineage" entity; lineage grouping,
computed status (Published/Expired/Draft), and "currently applied version" are all derived at read
time from `effective_from`/`effective_to`, directly implementing FR-015's "no manual status toggle
anywhere" requirement, following the identical computed-status precedent set by `banners` and
`016-app-maintenance-mgmt`. Brand is modeled as one value per document (`JOYFIT`/`FIT365`) or `null`
= a single shared document for both brands, reconciling the registration form's multi-select
checkboxes (both ticked → one `brandEnum: null` create) with the backend's nullable `brandEnum` and
Y-04's "terms are managed per brand" statement (research.md #2). PDF upload reuses the existing
`/crm/uploads/presign` + `useImageUpload` pattern already used by five other features; automatic
text extraction (FR-009) is mocked with a deterministic placeholder, since real PDF parsing is an
explicitly out-of-scope backend concern.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4
**Storage**: Phase 1 — `src/app/api/_mock-db/` (type/table/seed split, modeled on `banners`/`app-maintenance`); Phase 2 — generated REST client via hey-api
**Target Platform**: Node.js ≥ 24.0.0, browser (web), desktop-focused (min viewport 768px)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: List/filter/search feedback <200ms against in-memory mock data (9-row seed; no realistic scale concern for Phase 1)
**Constraints**: Role check (`Headquarter`/`System`-only writes; Trainer fully blocked; Manager/Staff/Observer brand-scoped read-only) MUST be enforced server-side via `getAuthUserFromRequest` in every route handler, not only client-side `RoleGatedButton`/`RoleGatedMenuItem` gating (FR-017); PDF format/size validation (application/pdf, ≤10MB) MUST be enforced both client-side (inline error, FR-008) and is bounded by the existing presign flow's content-type allowlist; status/currently-applied computation MUST happen at read time only (FR-015) — never stored, never toggled
**Scale/Scope** (mock-era; real endpoints are `/api/v1/admin/terms` + `/{id}/versions`, see contracts/): One list route (`GET /crm/terms`), one create route (`POST`, same path), one detail/update/delete route (`GET`/`PATCH`/`DELETE /crm/terms/{id}`), 5 pages (list, detail, create, edit, new-version) + ~8–10 route-local components; no new npm dependencies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                                                                                                                                                      |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | Types derived from Zod schemas in `terms.schema.ts`, per [data-model.md](data-model.md)                                                                                                                                                    |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | New routes registered via `registerRoute()` before use; Phase 2 swap is a follow-up, not this plan                                                                                                                                         |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | Zero `[NEEDS CLARIFICATION]` markers in spec.md; 11 modeling decisions reconciling spec/UI/reference-schema resolved in [research.md](research.md), none of which contradict an FR                                                         |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | List/detail pages are RSC shells + client data/table/tabs components (React Query); create/edit/new-version forms are `"use client"` (react-hook-form + file upload interactivity)                                                         |
| V   | Simplicity & Min. Deps | ☒ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses `RoleGatedButton`/`RoleGatedMenuItem`, `useImageUpload`, `useUnsavedChanges` pattern, `DatePicker`, `Empty`, `PageHeader`, `BackLink`; no new `Permission` enum entries (role check is a plain list comparison, per research.md #8) |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — Phase 1 design ([data-model.md](data-model.md),
[contracts/](contracts/)) introduces no new dependency and no abstraction beyond the
`banners`/`app-maintenance`/`article-categories` precedents it's modeled on. The one schema
addition beyond the reference snapshot (`body_text`, research.md #3) is required by already-approved
FRs (FR-009/FR-010/FR-011), not scope creep. Brand-scoped read filtering (research.md #9) reuses the
existing `StaffBrand` field already present on staff records — no new mock data or table needed.

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/017-terms-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── mock-api-schema.md    # Reference backend field snapshot (pre-existing input, not generated by this command)
├── contracts/            # Phase 1 output (/speckit.plan command)
│   ├── list-terms.md
│   ├── terms-detail.md
│   └── terms-mutations.md
├── checklists/
│   ├── requirements.md
│   └── parity.md
└── tasks.md              # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   ├── _db.types.ts                       # [EXTEND] register `terms` table type
│   │   │   ├── _create-db.ts                       # [EXTEND] wire createTermsTables()
│   │   │   ├── types/
│   │   │   │   └── terms.type.ts                   # [NEW] TermsRow + table interface
│   │   │   ├── tables/
│   │   │   │   └── terms.table.ts                  # [NEW] computeStatus, lineage grouping, CRUD
│   │   │   └── seeds/
│   │   │       └── terms.seed.ts                   # [NEW] 9-row seed (see data-model.md)
│   │   ├── _schemas/
│   │   │   └── terms.schema.ts                      # [NEW] row/query/create/update/response schemas
│   │   ├── _routes/
│   │   │   └── index.ts                              # [EXTEND] import new route files
│   │   └── crm/
│   │       └── terms/
│   │           ├── route.ts                          # [NEW] GET (list) / POST (create)
│   │           └── [id]/
│   │               └── route.ts                      # [NEW] GET (detail) / PATCH (update) / DELETE
│   └── (private)/
│       └── terms/
│           ├── page.tsx                               # [NEW] list page (tabs, search, filters, pagination)
│           ├── create/
│           │   └── page.tsx                           # [NEW] registration form page
│           ├── [id]/
│           │   ├── page.tsx                            # [NEW] detail page (Basic Info / Version History tabs)
│           │   ├── edit/
│           │   │   └── page.tsx                        # [NEW] edit form page
│           │   └── new-version/
│           │       └── page.tsx                        # [NEW] new-version form page (prefilled from [id])
│           ├── _components/                             # [NEW] terms-list-section, terms-filters, terms-tabs,
│           │                                             #        terms-detail/ (basic-info-card, version-timeline),
│           │                                             #        terms-form/ (shared create+edit+new-version form),
│           │                                             #        delete-dialog
│           ├── _constants/                               # [NEW] TERMS_TYPE_LABELS, TERMS_STATUS_LABELS,
│           │                                             #        TERMS_BRAND_LABELS, page-size options
│           ├── _hooks/                                    # [NEW] use-terms-filters.ts (nuqs), use-terms-pdf-upload.ts
│           │                                              #        (thin wrapper around useImageUpload)
│           └── _schemas/                                   # [NEW] react-hook-form + Zod schema for FR-007/008 client
│                                                            #        validation
└── components/
    └── common/
        ├── role-gated-button.tsx                          # [REUSE, no change] gates "New Registration"/"Edit"/"Create New Version"
        └── role-gated-menu-item.tsx                        # [REUSE, no change] gates "Delete" row/detail-page menu item

src/hooks/
└── use-image-upload.hook.ts                               # [REUSE, no change] presign+PUT flow (category: 'document')
```

**Structure Decision**: Single Next.js App Router project. Directory-per-feature convention under
`src/app/(private)/terms/` mirrors the `banners`/`app-maintenance`/`instructors` precedent (list +
`create/` + `[id]/` detail + `[id]/edit/`), extended with one additional route
(`[id]/new-version/`) unique to this feature's versioning workflow (US5). Mock persistence under
`src/app/api/_mock-db/`, modeled on the `banners`/`app-maintenance` type/table/seed split. No new
top-level directories, no new npm packages.

**Implementation Order Note**: See [quickstart.md](quickstart.md)'s numbered build order — schema
→ mock-db type/table/seed → wire into `_db.types.ts`/`_create-db.ts` → route handlers →
`_routes/index.ts` import → `npm run generate-openapi` then `npm run generate-api` → build
list/detail/create/edit/new-version UI consuming the generated `@tanstack/react-query.gen` hooks.
This lets each layer be manually curl-tested against `contracts/*.md` before any UI is built on top
of it.

## Phase 0: Research & Unknown Resolution

Research completed in [specs/017-terms-management/research.md](research.md).

Resolved items:

- Model terms as a single flat table (one row per version); "Terms Lineage" is derived by grouping
  on `parent_terms_id`, never a stored second table (#1).
- Brand is one value per document or `null` (shared by both brands); ticking both brand checkboxes
  issues one create with `brandEnum: null`, ticking one issues a single-brand create (#2).
- Extend the row schema with `body_text` (extracted PDF text) even though it's absent from the
  reference snapshot — required by already-approved FR-009/FR-010/FR-011; mocked via a
  deterministic placeholder since real extraction is an out-of-scope backend concern (#3).
- `status` (Published/Expired/Draft) and `is_currently_applied` are computed at read time from
  `effective_from`/`effective_to`, never stored — directly implements FR-015's no-manual-toggle
  requirement, matching `banners`/`app-maintenance` precedent (#4).
- Keep both `parent_terms_id` (root pointer) and `prev_terms_id` (immediate-source pointer) from
  the reference schema, since "Create New Version" always derives from whichever single document
  is currently open, not a per-row branch (#5).
- Mock ids follow the repo's `TM-{NNN}` convention, not the reference snapshot's literal ULID
  sample — an id-format detail, not an application concern (#6).
- PDF upload reuses the existing `/crm/uploads/presign` endpoint (already supports
  `application/pdf`) and the existing `useImageUpload` hook pattern already used by five other
  features, via a thin terms-local wrapper for the 10MB ceiling and filename/size capture (#7).
- No new `Permission` enum entries — plain `allowedRoles` role-list checks, matching
  `016-app-maintenance-mgmt`'s identical resolution for an equally flat permission matrix (#8).
- Brand-scoped viewing for Manager/Staff/Observer resolves through the existing per-staff `brand`
  field (`StaffBrandSchema`), via a new route-local helper — no new mock data required (#9).
- A dedicated narrow 2-value `TermsBrandSchema` (`JOYFIT`/`FIT365`, nullable on the row), not the project-wide 5-value
  `BrandEnumSchema`, matching Y-04's explicit 2-brand scope and `app-maintenance`'s identical
  precedent (#10).
- The Version History timeline's "change summary" (FR-011) is each version's own `remarks` field
  re-labeled in context — no new field; new-version mode leaves `remarks` blank per FR-014's
  precise copy-field list (#11).

## Phase 1: Design & Contracts Output

Artifacts generated:

- [specs/017-terms-management/data-model.md](data-model.md)
- [specs/017-terms-management/contracts/list-terms.md](contracts/list-terms.md)
- [specs/017-terms-management/contracts/terms-detail.md](contracts/terms-detail.md)
- [specs/017-terms-management/contracts/terms-mutations.md](contracts/terms-mutations.md)
- [specs/017-terms-management/quickstart.md](quickstart.md)

Design highlights:

- `status`/`version_kind`/`is_currently_applied` are computed-only response fields, never present
  on the stored row — mirrors `banners.computeStatus()` exactly, extended with a lineage-scoped
  "applied version" resolution unique to this feature's versioning requirement.
- `UpdateTermsBodySchema` has no `termsType`/`brandEnum` fields at all (not merely ignored ones) —
  the strictest, lowest-risk encoding of FR-012's immutability rule, matching `016`'s identical
  choice for its own immutable field.
- The detail response's `relatedVersions` array is the full lineage (chronological)
  and carries no PDF fields; each timeline entry has a プレビュー action that fetches that version's
  detail on click and opens its `pdfUrl` (FR-011, updated 2026-10-20: every entry, not only the
  currently-applied one).
- Manager/Staff/Observer brand-scoped reads return 404 (not 403) for out-of-scope detail ids, and
  are silently filtered (not surfaced with a scope-denied banner) on the list — consistent with
  existing store-scoping conventions (`getAllowedStoreIds` consumers) elsewhere in the codebase.
- Seed data (9 rows) is date-relative to `now()`, not literal past-tense dates, so it always
  exercises all three computed statuses plus one soft-deleted row and one real multi-version
  lineage — avoiding the "stale literal dates" pitfall `016`'s own plan called out about its
  predecessor.

## Complexity Tracking

No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    | N/A        | N/A                                  |
