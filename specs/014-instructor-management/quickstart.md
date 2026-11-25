# Quickstart: D-04 Instructor Management

**Goal**: Build and validate the Phase 1 instructor management flow (list, detail, create, edit, status toggle, delete, history) end-to-end with mock-backed data, without breaking the existing D-01 instructor picker.

---

## Implementation Checklist

- [ ] Extend `src/app/api/_schemas/lesson-schedule.schema.ts` `InstructorListItemSchema` with new optional/additive fields (`nickname`, `romaji_name`, `role_classifications`, `tab`, `brands`, `status`), keep `role`/`store_id`/`photo_url` as-is
- [ ] Add new schemas under `src/app/api/_schemas/instructor.schema.ts`: `InstructorSchema`, `BufferSettingsSchema`, `CrmAccountLinkSchema`, `PerformanceSummarySchema`, `AssignedLessonSummarySchema`, `UpcomingScheduleSchema`, `InstructorChangeHistoryEntrySchema`, `CreateInstructorRequestSchema`, `UpdateInstructorRequestSchema`, `UpdateInstructorStatusRequestSchema`
- [ ] Rework `src/app/api/_mock-db/types/instructors.type.ts` into a full `InstructorsType` (full profile fields, buffer settings, CRM link, status, change history array, `create`/`update`/`updateStatus`/`delete`/`getHistory` methods) — keep `getList`/`getById` signatures backward-compatible for the D-01 consumer
- [ ] Add brand-derivation and assigned-schedule-count helpers (query `db.lessons`/`lesson.table.ts` by instructor, join to studio → store.brand)
- [ ] Extend `src/app/api/crm/instructors/route.ts` `GET` handler with `tab`/`search`/`brand`/`status` params + role-based data scope; add `POST` handler
- [ ] Add `src/app/api/crm/instructors/[id]/route.ts` — `GET` (detail), `PUT` (update), `DELETE`
- [ ] Add `src/app/api/crm/instructors/[id]/status/route.ts` — `PATCH`
- [ ] Add `src/app/api/crm/instructors/[id]/history/route.ts` — `GET`
- [ ] Add server-side role/data-scope enforcement helper (e.g. `src/lib/utils/instructor-permissions.ts`, modeled after `studio-permissions.ts`) covering register/edit-full/edit-self/delete + list/detail scope
- [ ] Build list page `src/app/(private)/instructors/page.tsx` with tabs, search, filter panel, empty state
- [ ] Build create page `src/app/(private)/instructors/create/page.tsx` + shared `InstructorForm` (modeled after `StudioForm`/`LessonForm`) with buffer-setting selects, CRM-link staff combobox (reusing `GET /crm/staffs?search=`), confirm dialog
- [ ] Build detail page `src/app/(private)/instructors/[id]/page.tsx` — basic info, profile, buffer settings, CRM link, status card, performance summary, assigned lessons, upcoming schedule (3 inline + expand sheet), Change History tab
- [ ] Build edit page `src/app/(private)/instructors/[id]/edit/page.tsx` reusing `InstructorForm` with role-scoped field locking (Trainer self-edit: `name`/`role_classifications` read-only)
- [ ] Add status toggle action + delete dialog (disabled confirm when `assigned_schedule_count > 0`) on the detail page
- [ ] Add role-gated action buttons (`RoleGatedButton`) for Register/Edit/Delete per the permission matrix in `data-model.md`
- [ ] Run `npm run generate-routes` after adding new route segments
- [ ] Run `npm run generate-openapi` then `npm run generate-api` after finalizing all Zod schemas
- [ ] Verify D-01 lesson-scheduling instructor picker still compiles/works against the extended `GET /crm/instructors` response

---

## Suggested File Targets

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   └── types/
│   │   │       └── instructors.type.ts             # REWORK: full profile + history + CRUD methods
│   │   ├── _schemas/
│   │   │   ├── instructor.schema.ts                # NEW: full D-04 schemas
│   │   │   └── lesson-schedule.schema.ts           # EXTEND: InstructorListItemSchema additive fields
│   │   └── crm/
│   │       └── instructors/
│   │           ├── route.ts                        # EXTEND: GET (+params), ADD: POST
│   │           └── [id]/
│   │               ├── route.ts                    # NEW: GET/PUT/DELETE
│   │               ├── status/
│   │               │   └── route.ts                # NEW: PATCH
│   │               └── history/
│   │                   └── route.ts                # NEW: GET
│   └── (private)/
│       └── instructors/
│           ├── page.tsx                            # NEW: list page
│           ├── create/
│           │   └── page.tsx                        # NEW
│           ├── [id]/
│           │   ├── page.tsx                        # NEW: detail page
│           │   ├── edit/
│           │   │   └── page.tsx                    # NEW
│           │   └── _components/
│           │       ├── instructor-basic-info-card.tsx
│           │       ├── instructor-buffer-settings-card.tsx
│           │       ├── instructor-crm-link-card.tsx
│           │       ├── instructor-status-card.tsx
│           │       ├── instructor-performance-summary-card.tsx
│           │       ├── instructor-assigned-lessons-card.tsx
│           │       ├── instructor-upcoming-schedule-card.tsx
│           │       ├── instructor-upcoming-schedule-sheet.tsx
│           │       ├── instructor-history-tab.tsx
│           │       ├── instructor-delete-dialog.tsx
│           │       └── instructor-detail-skeleton.tsx
│           └── _components/
│               ├── instructor-tabs.tsx
│               ├── instructor-search.tsx
│               ├── instructor-filters.tsx
│               ├── instructor-list-section.tsx
│               ├── instructor-form.schema.ts
│               └── instructor-form/
│                   ├── instructor-form.tsx
│                   ├── instructor-form-basic-info.tsx
│                   ├── instructor-form-profile.tsx
│                   ├── instructor-form-buffer-settings.tsx
│                   ├── instructor-form-crm-link.tsx
│                   ├── instructor-form-confirm-dialog.tsx
│                   └── instructor-form-skeleton.tsx
└── lib/
    └── utils/
        └── instructor-permissions.ts                # NEW: role/data-scope + field-editability helpers
```

---

## Step-by-Step Flow

1. **Extend schemas first**
   - Add additive fields to `InstructorListItemSchema` without breaking the existing `GetInstructorsResponseSchema`/D-01 consumer.
   - Define the new `instructor.schema.ts` schemas per [data-model.md](data-model.md).

2. **Rework the mock table**
   - Expand `InstructorsType` with full profile fields, `buffer_settings`, `crm_account_link_staff_id`, `status`, `_changeHistories`.
   - Add `create()`, `update()`, `updateStatus()`, `delete()`, `getHistory()`.
   - Add brand-derivation and `assigned_schedule_count` computation against `lesson.table.ts`.
   - Seed data per the Phase 1 Seed Requirements in `data-model.md`.

3. **Implement route handlers**
   - Extend list `GET`; add `POST`, detail `GET`/`PUT`/`DELETE`, status `PATCH`, history `GET` — per [contracts/](contracts/).
   - Enforce role/data-scope and field editability server-side via `instructor-permissions.ts`.

4. **Build the list page**
   - Tabs with count badges, search, expandable filter panel with active-filter count + clear-all, empty/filtered state.
   - Role-gated "New Instructor Registration" button.

5. **Build the create/edit form**
   - Single `InstructorForm` component with `mode: 'create' | 'edit'`, buffer-setting `Select`s, CRM-link `Popover`+`Command` combobox against `GET /crm/staffs?search=`, confirm dialog summarizing entered values before submit.
   - In edit mode for a Trainer editing their own profile, render `name`/`role_classifications` as read-only per FR-015.

6. **Build the detail page**
   - Two tabs: Basic Information, Change History.
   - Basic Information: header + basic info, profile/buffer/CRM-link cards on the left; performance summary, assigned lessons, upcoming schedule (3 inline + expand sheet) on the right.
   - Status card with Activate/Deactivate action (Headquarter/Manager/System only).
   - Delete dialog: blocking warning + disabled confirm when `assigned_schedule_count > 0`.
   - Role-gated Edit/Delete actions with explanatory tooltips when disabled.

7. **Validate acceptance scenarios**
   - Walk through each User Story's acceptance scenarios in `spec.md` manually.
   - Verify role matrix for list/detail scope, register/edit/delete gating, and Trainer self-edit field locking.
   - Verify delete guardrail blocks every time when schedules are assigned.
   - Verify D-01's instructor picker still functions against the extended list endpoint.

---

## Verification Commands

```bash
npm run lint
npm run typecheck
```

This project has **no automated test suite** (see constitution's No Testing Policy) — do not add Jest/Vitest/Playwright. Verification is TypeScript strict compilation, ESLint, and manual scenario walkthroughs against `spec.md`.

---

## Implementation Command Order (Phase 1)

```bash
# 1) Regenerate route registry after adding new route segments
npm run generate-routes

# 2) Refresh OpenAPI from registered route schemas
npm run generate-openapi

# 3) Regenerate API client from the latest openapi.json
npm run generate-api

# 4) Validate production compilation
npm run build
```

---

## Phase 2 Note

When stable backend OpenAPI for instructor management is published:

- Regenerate client with the project's API generation command.
- Replace Phase 1 mock endpoint usage with generated React Query option-factories for all instructor endpoints.
- Replace the Phase 1 mock-role constant in route handlers with real auth-context role resolution — this is also when the studios-route gap noted in [research.md](research.md) item 6 should be revisited for consistency.
- Keep response shapes at parity to avoid UI refactor.
