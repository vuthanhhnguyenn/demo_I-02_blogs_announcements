# Quickstart: Y-09 Routine Master Management (ルーティン管理)

**Goal**: Build and validate the Phase 1 routine master management screens end-to-end with mock-backed data, designed directly against the real Phase-2 API contract (`backend-api.md`).

---

## Implementation Checklist

- [ ] Add `src/app/api/_schemas/routine-category.schema.ts` (`RoutineCategorySchema`, `GetRoutineCategoriesResponseSchema`) and `src/app/api/_schemas/routine.schema.ts` (`RoutineListItemSchema`, `RoutineDetailSchema`, `GetRoutinesQuerySchema`, `UpsertRoutineBodySchema`, `UpdateRoutinePublishStatusBodySchema`, per data-model.md)
- [ ] Add `src/app/api/_mock-db/seeds/routine-category.seed.ts` (6 fixed categories) and `tables/routine-category.table.ts` (`list()` only — read-only, research.md R3)
- [ ] Add `src/app/api/_mock-db/seeds/routine.seed.ts` per data-model.md's Seed Requirements (published w/ exercises, unpublished w/ 0 exercises, unpublished w/ exercises, time-only-set exercise, multi/zero-thumbnail routines, all 6 categories covered, one zero-result filter combination) and `types/routines.type.ts` + `tables/routine.table.ts` (`list`/`getById`/`create`/`update`/`updatePublishStatus`/`delete`/`duplicate`, following `exercise.table.ts`'s method shape)
- [ ] Wire both new tables into `src/app/api/_mock-db/_create-db.ts`
- [ ] Add `Permission.RoutinesView` / `RoutinesCreate` / `RoutinesEdit` / `RoutinesDelete` / `RoutinesPublish` (`src/types/permission.type.ts`, new "Routines (Y-09)" section)
- [ ] Register `PAGE_PERMISSIONS['/routines']` / `['/routines/create']` / `['/routines/:id']` / `['/routines/:id/edit']` and the `ROLE_PERMISSIONS[UserRole.Headquarter]` grants (research.md R11) — `System` already receives everything via `Object.values(Permission)`
- [ ] Implement `GET /api/crm/routines` + `POST /api/crm/routines` (contracts/get-routines.md, contracts/create-routine.md)
- [ ] Implement `GET /api/crm/routines/{id}` + `PATCH /api/crm/routines/{id}` + `DELETE /api/crm/routines/{id}` (contracts/get-routine-detail.md, contracts/update-routine.md, contracts/delete-routine.md)
- [ ] Implement `PATCH /api/crm/routines/{id}/publish-status` (contracts/update-routine-publish-status.md)
- [ ] Implement `POST /api/crm/routines/{id}/duplicate` (contracts/duplicate-routine.md)
- [ ] Implement `GET /api/crm/routine-categories` (contracts/get-routine-categories.md)
- [ ] Run `npm run generate-openapi` then `npm run generate-api` to refresh `src/lib/api/`
- [ ] Add `_hooks/use-routine-filters.hook.ts` (`nuqs` URL-state: page/limit/search/categoryId/publishStatus/sortBy/sortOrder — matches `use-training-equipment-filters.hook.ts`'s shape)
- [ ] Build `src/app/(private)/routines/page.tsx` (Server Component shell) + a `'use client'` content component: search box, "詳細フィルター" toggle (category + status selects, active-count badge, "すべてクリア"), filter-result banner, sortable table (name/exerciseCount/publishStatus/updatedAt), row-click → detail, row action menu (edit/duplicate/publish-toggle/delete, each `RoleGatedMenuItem`-gated and disabled-with-reason where blocked), pagination with page-size selector
- [ ] Build `src/app/(private)/routines/create/page.tsx` and `[id]/edit/page.tsx` sharing one form component: Section 1 basic info (name/category/description — reuse `use-image-upload.hook.ts` per project convention for thumbnails, up to 5, first = primary), Section 2 exercise composition (search/select from `GET /api/crm/exercises?publishStatus=public`, add/reorder/remove exercise, per-exercise HQ comment, per-exercise set table with add/copy/remove set, default-value seeding per research.md R5's table), Section 3 publish/unpublish switch (blocked with inline message when 0 exercises), footer Cancel/Submit wired through `useUnsavedChanges` for the discard-confirmation dialog
- [ ] Build `src/app/(private)/routines/[id]/page.tsx`: `Tabs` — "基本情報" (name/description/category/exerciseCount/status/updatedAt/updatedBy + thumbnail gallery) and "エクササイズ構成" (running "合計 N種目/Nセット" total + ordered exercise cards, each with name linking to `/exercises/{id}` (Y-08 detail), category badge, per-set table, HQ comment); header actions (複製/編集/削除, each `RoleGatedButton`-gated; delete blocked-with-explanation while published)
- [ ] Compose list/detail loading, empty, and filtered-empty states using `Empty`, matching the established `variant="filtered"`/`"empty"` convention used by sibling list screens
- [ ] Run `npm run generate-routes` (or let `npm run dev`/`build` run it) so `/routines*` routes are registered

---

## Suggested File Targets

```text
src/
├── app/
│   ├── api/
│   │   ├── crm/
│   │   │   ├── routines/
│   │   │   │   ├── route.ts                       # NEW
│   │   │   │   ├── [id]/route.ts                  # NEW
│   │   │   │   ├── [id]/publish-status/route.ts   # NEW
│   │   │   │   └── [id]/duplicate/route.ts        # NEW
│   │   │   └── routine-categories/route.ts        # NEW
│   │   ├── _schemas/
│   │   │   ├── routine.schema.ts                  # NEW
│   │   │   └── routine-category.schema.ts         # NEW
│   │   └── _mock-db/
│   │       ├── tables/routine.table.ts             # NEW
│   │       ├── tables/routine-category.table.ts    # NEW
│   │       ├── types/routines.type.ts              # NEW
│   │       ├── types/routine-categories.type.ts    # NEW
│   │       ├── seeds/routine.seed.ts               # NEW
│   │       ├── seeds/routine-category.seed.ts      # NEW
│   │       └── _create-db.ts                       # MODIFIED (wire in both new tables)
│   └── (private)/
│       └── routines/
│           ├── page.tsx                            # NEW: Server Component shell
│           ├── create/page.tsx                     # NEW
│           ├── [id]/page.tsx                        # NEW
│           ├── [id]/_components/                    # detail-page-only (matches training-equipment/instructors convention)
│           │   ├── routine-detail-basic-info-tab.tsx                # NEW
│           │   └── routine-detail-exercise-composition-tab.tsx      # NEW
│           ├── [id]/edit/page.tsx                   # NEW
│           ├── _hooks/
│           │   └── use-routine-filters.hook.ts      # NEW
│           ├── _schemas/
│           │   └── routine-form.schema.ts           # NEW
│           └── _components/                          # shared across list/create/edit/detail-header
│               ├── routine-list-content.tsx         # NEW
│               ├── routine-filters.tsx              # NEW
│               ├── routine-table-columns.tsx        # NEW
│               ├── routine-row-actions-menu.tsx     # NEW
│               ├── routine-delete-dialog.tsx        # NEW (shared: list row menu + detail page header)
│               ├── routine-form.tsx                 # NEW (shared: create + edit)
│               ├── routine-form-basic-info-section.tsx            # NEW
│               ├── routine-form-thumbnail-section.tsx              # NEW
│               ├── routine-form-exercise-composition-section.tsx   # NEW
│               ├── routine-form-exercise-row.tsx                   # NEW
│               └── routine-form-status-section.tsx                 # NEW
├── constants/
│   └── permission.constants.ts                     # MODIFIED (new PAGE_PERMISSIONS/ROLE_PERMISSIONS entries)
└── types/
    └── permission.type.ts                          # MODIFIED (new Permission.Routines* values)
```

---

## Step-by-Step Flow

1. **Schemas first** (OpenAPI-first, Constitution II) — `routine-category.schema.ts`, then `routine.schema.ts`, both designed directly against `backend-api.md`'s field/error-code shapes (data-model.md).
2. **Mock DB** — new `routineCategories` table (seed + read-only `list()`), new `routines` table (seed covering every data-model.md Seed Requirement + `list`/`getById`/`create`/`update`/`updatePublishStatus`/`delete`/`duplicate`), both wired into `_create-db.ts`.
3. **Permissions** — 5 new `Permission` values, `PAGE_PERMISSIONS` entries for all 4 routes, `ROLE_PERMISSIONS[Headquarter]` grants.
4. **Routes** — implement all 8 endpoints per their `contracts/*.md` files, in the order: categories (simplest) → list/create → detail/edit/delete → publish-status → duplicate.
5. **Regenerate the API client** — `npm run generate-openapi && npm run generate-api`.
6. **Build the list page** — filters hook, table columns, row actions, pagination, empty states.
7. **Build the create/edit form** — shared component, basic info + thumbnail + exercise composition (exercise picker calls the existing Y-08 exercises endpoint) + publish switch + discard guard.
8. **Build the detail page** — tabs, thumbnail gallery, exercise composition cards linking to Y-08 exercise detail.
9. **Validate acceptance scenarios** — walk spec.md's User Stories 1–6 acceptance scenarios manually, and every Edge Case.

---

## Verification Commands

```bash
npm run lint
npm run type-check
```

Per the constitution's "No Testing Policy," no automated test suite exists or should be added. Quality assurance is: `tsc --noEmit`, ESLint/Prettier, manual verification against this quickstart, and code review.

---

## Implementation Command Order (Phase 1)

```bash
# 1) Refresh OpenAPI from registered route schemas
npm run generate-openapi

# 2) Regenerate API client from the latest openapi.json
npm run generate-api

# 3) Register the new /routines* routes
npm run generate-routes

# 4) Validate production compilation
npm run build
```

---

## Manual Verification Checklist (maps to spec.md Success Criteria — fill in during/after implementation)

- [ ] SC-001: An authorized user can locate a specific routine via search/filter/sort in under 20 seconds for a standard-sized catalog.
- [ ] SC-002: An authorized user can register a new routine (basic info + thumbnail + multi-exercise/multi-set composition) in one continuous session, without data loss between sections.
- [ ] SC-003: Publishing a routine with 0 exercises is blocked with a clear explanation; deleting a published routine is blocked with guidance to unpublish first.
- [ ] SC-004: Duplicating a routine is a single action, preserves 100% of exercise/set data, and always lands on the new copy's edit screen with "非公開" status.
- [ ] SC-005: Write actions (create/edit/delete/duplicate/publish) are never exposed as usable to a role outside Headquarter/System.
- [ ] SC-006: An unpublished or newly created routine is never returned by any endpoint a member-facing surface would call (verified indirectly in Phase 1 — no mobile client exists to test against directly; verify the mock's `publishStatus`/`deletedAt` filtering is correct on `GET /api/crm/routines`).
- [ ] Role-gating: A role other than Headquarter/System cannot reach `/routines*` directly by URL.
- [ ] Empty state distinguishes "no routines match your filters" from "no routines are registered yet."
- [ ] A routine with 0 exercises shows "0種目" normally in the list but its publish action is disabled with an explanation, both in the list row menu and the edit form's switch.
- [ ] A time-only exercise (e.g. a plank) can be saved with reps/weight left blank.
- [ ] Duplicating a **published** routine still produces an **unpublished** copy.
- [ ] Leaving the create/edit form with unsaved changes (via back-link or Cancel) triggers the discard-confirmation dialog.

## Verification Log

### 2026-07-10 — Phase 1 implementation complete

- **`npm run type-check`**: EXIT 0 (clean, whole project).
- **`npm run lint`** (routine files): EXIT 0, no errors/warnings.
- **`npm run build`**: EXIT 0. All 4 routes registered: `/routines`, `/routines/[id]`, `/routines/[id]/edit`, `/routines/create`.
- **Runtime API verification** (dev server, `curl` against `/api/crm/*`, no auth — server-side gating is page-level per FR-018, matching sibling `exercises` endpoints):
  - `GET /routine-categories` → 6 fixed categories in `sortOrder` order.
  - `GET /routines` → 7 seeded routines, default sort `updatedAt desc` (RT-00001 newest first); `?publishStatus=unpublished` → 2 rows; `?search=全身` → 1 row.
  - `GET /routines/RT-004` → time-only plank sets render `targetReps/targetWeightKg = null`, `targetDurationSeconds = 90/90/60`; `exerciseName` "プランク" and `categoryName` "腹筋" resolved from Y-08 masters; `updatedByName` populated.
  - `PATCH /routines/RT-006/publish-status {published}` (0 exercises) → **422 `E-RTN-003`** (publish blocked). ✓ SC-003
  - `DELETE /routines/RT-001` (published) → **409 `E-RTN-002`** (delete blocked, unpublish first). ✓ SC-003
  - `PATCH /routines/RT-005/publish-status {published}` (≥1 exercise) → 200, `publishedAt` set.
  - `POST /routines` (valid, published exercise) → 201, `RT-008`/`RT-00008`, `publishStatus: unpublished`. ✓ SC-002/SC-006 (create defaults unpublished)
  - `POST /routines` (exercise `EX-003`, non-published) → **422 `E-RTN-004`**. ✓ FR-011
  - `POST /routines` (duplicate `exerciseId`) → **400 `E-VAL-001`**.
  - `POST /routines` (empty name) → 400.
  - `POST /routines/RT-002/duplicate` → 201, name "上半身集中プログラムのコピー", `publishStatus: unpublished`, full 3-exercise composition copied. ✓ SC-004
  - `DELETE /routines/RT-006` (unpublished) → 200, removed from subsequent list.
- **Not runtime-verified in this pass** (require a browser session / auth context, deferred to manual QA): the client-side role-gate redirect for non-HQ/System roles (SC-005 is enforced via `PAGE_PERMISSIONS` at the proxy layer + inline `canAccess` guard in each page, same mechanism as `exercise-master`), the unsaved-changes discard dialog, and the thumbnail upload flow (depends on the presign upload endpoint). Code paths reviewed and follow established, already-shipped conventions.

## Phase 2 / Follow-up Notes

- **`brandEnum` gap (research.md R6)**: confirm with the API/PO team whether routines are genuinely single-brand (add a UI selector) or genuinely brand-shared (revisit the real API's required single-valued field) before the Phase 2 cut-over.
- **Thumbnail cardinality gap (research.md R7)**: confirm whether the real API's schema should become `thumbnailS3Keys: string[]` (max 5) to match the approved spec, or the spec should be narrowed to one thumbnail to match the real API as currently documented.
- **Routine Category CRUD, full weight-coefficient table, superset configuration UI, CSV export** — all explicitly out of scope for this feature (spec.md Out of Scope); track separately if/when needed.
