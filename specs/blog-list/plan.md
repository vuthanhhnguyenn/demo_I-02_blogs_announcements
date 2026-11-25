# Implementation Plan: Blog List (ブログ一覧)

**Branch**: `blog-list` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/blog-list/spec.md`

## Summary

Phase 1 (mock) build of the I-02 ブログ一覧 screen at `/blogs`, reproducing prototype `blog-list.tsx`@47d60ac with the spec extensions from Clarifications Q1–Q6. Data comes from a new mock module `/crm/notices` that mirrors the real `GET /api/v1/admin/notices` (shared 告知 / ブログ table with `type`, real field names and enums, `{ items, pagination }`); what the real API lacks is mocked per spec and handed to the backend as gaps B-01…B-10 (research.md R9). Detail / create / edit get placeholder routes (Q5).

Technical approach:

- **UI**: `src/app/(private)/blogs/` following the `banners` list slice — `PageHeader`, `DataTable` (manual sorting), one nuqs filter hook, `FilterResult`, `DataStateBoundary`, `TablePaginationWithSize`, `RoleGatedButton` / `RoleGatedMenuItem`, `AlertDialog` confirmations, preview `Dialog` with tabs.
- **Mock API**: `src/app/api/_schemas/notice.schema.ts`, `_mock-db/tables/notice.table.ts` + `seeds/notice.seed.ts`, routes `crm/notices` (GET), `crm/notices/[id]` (DELETE), `crm/notices/[id]/publish-status` (PATCH), `crm/notices/[id]/restore` (POST); then `generate-openapi` → `generate-api`.
- **Scope**: header store selector drives `storeId`; the mock applies the "reaches store" rule using a seeded directory of real dev store ids (R3, R4).
- **Permissions**: new `Blogs*` permissions + page mapping; Staff own-article rule on top (R5, R11).
- **Phase 2 gate**: `/blogs` joins its I-02 siblings in `PHASE2_ROUTE_PREFIXES` (R10).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any), Node.js ≥ 24  
**Primary Dependencies**: Next.js 16 (App Router), React 19, TanStack React Query 5 (generated `src/lib/api` hooks), TanStack Table 8, nuqs, shadcn/ui, lucide-react, sonner, Zod 4 (`@asteasolutions/zod-to-openapi`), `next/image`, date-fns v4 via `src/utils/date.util.ts` — all present, no additions  
**Storage**: Phase 1 — in-memory `src/app/api/_mock-db/` (new `notices` table + notice store directory seed); Phase 2 — `src/lib/api-real` once `/admin/notices` is in `openapi.real.json` (via `integrate-real-api`)  
**Testing**: none automated (constitution); `type-check`, `lint`, `build`, manual `quickstart.md`, `verify-parity`  
**Target Platform**: CRM web app, ≥ 768 px, WCAG AA  
**Project Type**: single Next.js app (UI + co-located mock route handlers)  
**Performance Goals**: row actions reflect within 2 s (SC-003); server-side paging (≤ 100 rows rendered)  
**Constraints**: header store selector and `/crm/me` are real-API backed while the list is mock → store / staff ids in seeds must be real dev ids (R3, R5); mock cannot identify real callers, so role enforcement in Phase 1 is UI-side (R4); I-02 routes are Phase-2 gated (R10)  
**Scale/Scope**: 4 page routes (1 real + 3 placeholders), ~10 route-local components, 1 filter hook, 4 mock endpoints, 1 schema, 1 table, 1 seed, permission + phase + sidebar wiring

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                         |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | Types from `types.gen.ts` / `z.infer` only                                    |
| II  | OpenAPI-First          | ☑ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | Routes registered via `registerRoute` → `generate-openapi` → `generate-api`   |
| III | Spec-Driven            | ☑ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | Q1–Q6 resolved; Q2 is a recorded proposal pending FIT QA #329 (not a blocker) |
| IV  | App Router & Simple UX | ☑ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | List page client (nuqs, dialogs) with comment; placeholder pages are RSC      |
| V   | Simplicity & Min. Deps | ☑ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses banners slice patterns                                                 |

**Initial gate**: PASS. **Post-design re-check**: PASS — design keeps data access in mock routes + generated hooks, adds no packages, and does not alter shared components.

## Project Structure

### Documentation (this feature)

```text
specs/blog-list/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R11, gap table B-01…B-10
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── get-notices.md
│   └── notice-row-actions.md
├── checklists/
│   ├── requirements.md
│   └── parity.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
src/app/(private)/blogs/
├── page.tsx                                  # list (client, Suspense wrapper)
├── create/page.tsx                           # placeholder (Q5)
├── [id]/page.tsx                             # placeholder detail (Q5)
├── [id]/edit/page.tsx                        # placeholder edit (Q5)
├── _components/
│   ├── blog-coming-soon.tsx                  # shared placeholder body + BackToListLink
│   ├── blog-list-header-actions.tsx          # カテゴリマスタを編集 / 新規登録
│   ├── blog-filters.tsx                      # search + 詳細フィルター panel
│   ├── blog-table-columns.tsx                # 11 columns, sort headers
│   ├── blog-row-menu.tsx                     # role + own-article gating
│   ├── blog-status-badge.tsx
│   ├── blog-wp-sync-badge.tsx
│   ├── blog-target-cell.tsx
│   ├── blog-confirm-dialogs.tsx              # publish / unpublish / delete
│   └── blog-preview-dialog.tsx               # PC / モバイル tabs
├── _hooks/
│   └── use-blog-filters.hook.ts              # single nuqs instance
├── _constants/
│   └── blog.constants.ts                     # labels, options, page sizes
└── _utils/
    └── blog-row.util.ts                      # display status, sync target, own-article

src/app/api/_schemas/notice.schema.ts
src/app/api/_mock-db/types/notices.type.ts    # NoticesType
src/app/api/_mock-db/tables/notice.table.ts   # + register in _create-db / _db.types / types/index
src/app/api/_mock-db/seeds/notice.seed.ts     # rows + store directory (real dev ids)
src/app/api/crm/notices/route.ts              # GET
src/app/api/crm/notices/[id]/route.ts         # DELETE
src/app/api/crm/notices/[id]/publish-status/route.ts   # PATCH
src/app/api/crm/notices/[id]/restore/route.ts          # POST

src/types/permission.type.ts                  # Blogs* permissions
src/constants/permission.constants.ts         # page map, role grants, flag rules
src/constants/phase.constants.ts              # '/blogs' under I-02
src/components/layout/app-sidebar.tsx         # コンテンツ › ブログ管理
src/lib/routes/routes.config.ts               # regenerated (npm run generate-routes)
src/lib/api/**                                # regenerated (generate-openapi → generate-api)
```

**Structure Decision**: New `blogs` vertical slice cloned from the `banners` list architecture; mock module named after the real resource (`notices`) so 告知 can reuse it later.

## Connection Points (Do Not Break)

- `article-categories` screen and its mock (`articleCount` mapping table) — read-only use of `?type=blog`.
- `/announcements` stub page — untouched (announcement list is out of scope).
- Shared `BrandEnum` (lowercase) and `BRAND_LABELS` — untouched; notices use real PascalCase codes.
- `CurrentStoreProvider` behaviour (Manager cannot pick 全店舗) — consumed as is (R4).
- `PHASE2_ROUTE_PREFIXES` — only appended to; local un-gating must not be committed.

## Risks & Open Items

- **Q2 / FIT QA #329** still Open: restore gating and deleted-row visibility are our proposal; if the customer answers differently, only `blog-row-menu.tsx` gating and `ROLE_PERMISSIONS[BlogsRestore]` change.
- **Manager scope (R4)**: resolved — FR-014 / US1-AC1 now follow the header rule of `019-member-list` (Manager views one managed store at a time).
- **Real dev ids in seeds (R3, R5)**: degrade gracefully if dev data is reset; re-capture then.
- **B-08 brand semantics**: mock assumption; confirm with BE before Phase 2.

## Complexity Tracking

No constitution violations. One deviation from `code-rule.md` §III:

| Violation                                                                                               | Why Needed                                                                | Simpler Alternative Rejected Because                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Paged table (`useQuery` + `TablePaginationWithSize`, 25/50/100) instead of `useInfiniteQuery` ≤ 50/page | Spec FR-013 and the prototype require numbered pages and a 100-row option | Infinite scroll would drop the page-number footer (PAR051–PAR053); paged tables are the de facto list pattern (≈49 screens, incl. `banners`) |
