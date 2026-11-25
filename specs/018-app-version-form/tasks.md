# Tasks: App Version Management (Create/Edit Form)

**Input**: Design documents from `/specs/018-app-version-form/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Tests**: No automated tests (constitution "No Testing Policy") — manual verification only, per [quickstart.md](./quickstart.md). No test tasks are generated.

**Organization**: Tasks are grouped by user story (US1 = registration, US2 = edit, US3 = access control) to enable independent implementation and verification. US3 requires zero new code (already enforced by `016-app-version-management`'s route/permission wiring) — its phase is verification-only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, or US3
- File paths are exact and repo-relative

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend the schemas, mock table, and route handlers that both US1 (create) and US2 (edit) depend on. Regenerate the API client.

- [x] T001 Add `CreateAppVersionBodySchema` and `UpdateAppVersionBodySchema` to `src/app/api/_schemas/app-version.schema.ts` per [data-model.md](./data-model.md#requestresponse-bodies-new--this-feature) — `UpdateAppVersionBodySchema` is `CreateAppVersionBodySchema.partial()`. Do not touch `AppVersionRecordSchema`, `AppVersionBrandEnumSchema`, `GetAppVersionsQueryParamsSchema`, or `GetAppVersionResponseSchema`.
- [x] T002 Add `create(data: CreateAppVersionBody): AppVersionRecord` and `update(id: string, data: UpdateAppVersionBody): AppVersionRecord | null` methods to the `appVersions` table object in `src/app/api/_mock-db/tables/app-version.table.ts` per [data-model.md](./data-model.md#mock-table-extensions-new-methods-on-the-existing-appversions-table) — reuse the existing `MOCK_CURRENT_STAFF_ID` placeholder pattern from `app-version.seed.ts`; `update()` returns `null` for a missing or logically-deleted `id`. Leave `getList`/`getById`/`softDelete` untouched. (depends on T001)
- [x] T003 Add a `POST` handler to `src/app/api/crm/app-versions/route.ts` per [contracts/POST-app-versions.md](./contracts/POST-app-versions.md): validate body against `CreateAppVersionBodySchema` (400 on failure with concatenated issue messages), call `db.appVersions.create(...)`, return the record with status 201. Existing `GET` untouched. (depends on T001, T002)
- [x] T004 Add a `PATCH` handler to `src/app/api/crm/app-versions/[id]/route.ts` per [contracts/PATCH-app-versions-id.md](./contracts/PATCH-app-versions-id.md): validate body against `UpdateAppVersionBodySchema` (400 on failure), call `db.appVersions.update(id, ...)` (404 if `null`), return the updated record with status 200. Existing `GET`/`DELETE` untouched. (depends on T001, T002)
- [x] T005 Run `npm run generate-routes`, `npm run generate-openapi`, `npm run generate-api` to regenerate `src/lib/api/` — confirm `postCrmAppVersionsMutation`, `patchCrmAppVersionsByIdMutation`, `CreateAppVersionBody`, `UpdateAppVersionBody` are generated. Do not hand-edit generated files. (depends on T003, T004)

**Checkpoint**: Mock API for create/update fully functional and regenerated client available — user story implementation can now begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Form-level Zod schema, mapper, and shared UI shell that both US1 and US2 (both modes of `AppVersionForm`) depend on.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T006 [P] Create `src/app/(private)/app-versions/_schemas/app-version-form.schema.ts` defining `AppVersionFormSchema` (brand `RadioGroup` enum bound to real `AppVersionBrandEnum` values, `iosVersionName`/`androidVersionName` regex `^\d+\.\d+\.\d+$`, `iosBuildNumber`/`androidBuildNumber` as `z.coerce.number().int().min(1)`, `releaseDate` as `z.string().min(1)`, `remarks` as `z.string().max(1000).default('')`), plus `AppVersionFormValues`/`AppVersionFormSubmitValues` types and `emptyAppVersionFormValues`, per [data-model.md](./data-model.md#form-values-new--this-feature). Model on `article-categories/_schemas/article-category-form.schema.ts`. (depends on T005)
- [x] T007 [P] Create `src/app/(private)/app-versions/_schemas/app-version-form.mapper.ts` with `appVersionFormValuesToCreateBody`, `appVersionFormValuesToUpdateBody`, and `appVersionRecordToFormValues` — the create/update mappers convert an empty-string `remarks` to `null`; `appVersionRecordToFormValues` converts a fetched `AppVersionRecord` (`remarks: string | null`) back into form values (`remarks` as `''` when `null`). Model on `article-categories/_schemas/article-category-form.mapper.ts`. (depends on T006)
- [x] T008 Create `src/app/(private)/app-versions/_components/app-version-form/app-version-form-skeleton.tsx` — loading skeleton shown while the edit page fetches the existing record, matching the single-Card layout of the real form. (depends on T005)
- [x] T009 Create `src/app/(private)/app-versions/_components/app-version-form/app-version-form.tsx` (`'use client'`) — `AppVersionForm({ mode, defaultValues?, versionId? })` using `react-hook-form` + `zodResolver(AppVersionFormSchema)`, one `<Card>` ("バージョン情報") containing: brand `RadioGroup` (`Controller`-driven, values `AppVersionBrandEnum.JOYFIT`/`.FIT365`, labels from `APP_VERSION_BRAND_LABELS`, per research.md Decision 3), iOS version+build `Input` pair and Android version+build `Input` pair (each in `grid grid-cols-2`), release date `DatePicker` (`Controller`-driven, `date={field.value ? parseISO(field.value) : undefined}`, `onDateChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}`), remarks `Textarea`, and the maintenance-window `Alert` (informational, FR-006). No `AlertDialog` confirm step, no discard-guard dialog on Cancel (research.md Decision 4). Wrap the submit button in `RoleGatedButton allowedRoles={["Headquarter", "System"]}`. Cancel button navigates directly to `/app-versions`. Model on `article-categories/_components/article-category-form/article-category-form.tsx`. (depends on T006, T007, T008)
- [x] T010 Create `src/app/(private)/app-versions/_components/app-version-form/index.ts` barrel export for `AppVersionForm` and `AppVersionFormSkeleton`. (depends on T009)

**Checkpoint**: `AppVersionForm` component and its schema/mapper exist and compile — both user story page-wiring tasks can now proceed.

---

## Phase 3: User Story 1 - Register a new app version release (Priority: P1) 🎯 MVP

**Goal**: A Headquarters/System user can open `/app-versions/create`, fill in all fields, and create a new `AppVersionRecord`.

**Independent Test**: As Headquarters/System, open the registration form from the list screen, fill in all required fields with valid values, submit, and confirm the new record appears at the top of the App Version list with the values just entered (quickstart.md "Register (US1)").

### Implementation for User Story 1

- [x] T011 [US1] Replace `src/app/(private)/app-versions/create/page.tsx` (currently the "準備中" placeholder) to render `<AppVersionForm mode="create" />` under a `PageHeader` (title "バージョン登録") and `BackLink` (label "アプリ配信バージョン管理に戻る", href `/app-versions`). (depends on T009)
- [x] T012 [US1] In `app-version-form.tsx`'s create-mode submit path, call `postCrmAppVersionsMutation` with `appVersionFormValuesToCreateBody(values)`; on success show `toast.success("アプリバージョンを登録しました")` and `router.push(navigate('/app-versions'))`. (depends on T009, T007, T011)

**Checkpoint**: User Story 1 is fully functional and independently testable — registration form creates records visible in the list, with inline validation per FR-002–FR-005 blocking invalid submissions.

---

## Phase 4: User Story 2 - Correct an existing app version record (Priority: P2)

**Goal**: A Headquarters/System user can open `/app-versions/{id}/edit` pre-filled with an existing record's values, change fields, and save.

**Independent Test**: As Headquarters/System, open the edit form for an existing record (pre-filled with its current values), change one or more fields, submit, and confirm the App Version list/detail screen reflects the updated values (quickstart.md "Edit (US2)").

### Implementation for User Story 2

- [x] T013 [US2] Replace `src/app/(private)/app-versions/[id]/edit/page.tsx` (currently the "準備中" placeholder) to `useQuery(getCrmAppVersionsByIdOptions({ path: { id } }))`, show `<AppVersionFormSkeleton />` while loading, render a not-found state if the query resolves with no record (FR-013), otherwise render `<AppVersionForm mode="edit" defaultValues={appVersionRecordToFormValues(data)} versionId={id} />` under a `PageHeader` (title "バージョン編集") and `BackLink`. Model on `article-categories/[id]/edit/page.tsx`. (depends on T009, T007)
- [x] T014 [US2] In `app-version-form.tsx`'s edit-mode submit path, call `patchCrmAppVersionsByIdMutation` with `{ path: { id: versionId } }` and `appVersionFormValuesToUpdateBody(values)`; on success show `toast.success("アプリバージョンの変更を保存しました")` and `router.push(navigate('/app-versions'))`. (depends on T009, T007, T013)

**Checkpoint**: User Stories 1 AND 2 both work independently — registration and edit both fully functional, sharing the same form component and validation rules.

---

## Phase 5: User Story 3 - Form access is restricted to authorized roles (Priority: P3)

**Goal**: Confirm Manager, Staff, Observer, Trainer, and unauthenticated sessions are denied access to both routes.

**Independent Test**: Sign in as each of Manager, Staff, Observer, and Trainer (and try an unauthenticated session), attempt to load the registration or edit form directly by URL, and confirm the standard 403 Forbidden page appears instead of the form in every case (quickstart.md "Access control (US3)").

### Implementation for User Story 3

No new code — `research.md` Decision 5 confirms `routes.config.ts`, `PAGE_PERMISSIONS`, `ROLE_PERMISSIONS`, and `src/proxy.ts` already gate `/app-versions/create` → `Permission.AppVersionsCreate` and `/app-versions/:id/edit` → `Permission.AppVersionsEdit` (held only by `Headquarter`/`System`), shipped by `016-app-version-management`.

- [x] T015 [US3] Manually verify access control per quickstart.md "Access control (US3)": as Manager, Staff, Observer, and Trainer (and logged out), navigate directly to `/app-versions/create` and to `/app-versions/{id}/edit` for an existing id — confirm immediate redirect to `/403` in every case, with no form field ever visible and no record created or changed as a side effect. (depends on T011, T013)

**Checkpoint**: All three user stories independently functional and verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories.

- [x] T016 [P] Run `npm test && npm run lint` and fix any violations introduced by this feature.
- [x] T017 Run the full [quickstart.md](./quickstart.md) "Manual Verification" checklist end-to-end (Register US1, Edit US2, Access control US3, and the "Brand binding" check confirming a submitted `Fit365`/`Joyfit` value round-trips correctly through the API rather than the reference design's literal `"FIT365"`/`"JOYFIT"` strings). (depends on T012, T014, T015)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T001 → T002 → {T003, T004} → T005.
- **Foundational (Phase 2)**: Depends on Phase 1 (T005) completion — BLOCKS both user stories. T006 → T007; T008 is independent of T006/T007 but still depends on T005; T009 depends on T006, T007, T008; T010 depends on T009.
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion.
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion. Independent of US1 (different page route), but both modify the same `app-version-form.tsx`, so implement sequentially in one branch to avoid merge conflicts even though they are logically independent.
- **User Story 3 (Phase 5)**: Verification-only; depends on US1's and US2's pages existing (T011, T013) so there's a form to attempt to reach.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Within Each User Story

- US1: page wiring (T011) before submit-mutation wiring (T012), since T012 edits the component T011 renders.
- US2: page wiring (T013) before submit-mutation wiring (T014).

### Parallel Opportunities

- T006 and T008 can run in parallel (schema vs. skeleton, different files) once T005 completes; T007 must follow T006.
- T016 (lint/test) can run in parallel with T017 (manual quickstart walkthrough).
- US1 (T011–T012) and US2 (T013–T014) touch different page files and could be implemented by different people in parallel after Phase 2, provided both agree on `app-version-form.tsx`'s shared submit-handler shape (mode-branching) before starting.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# After T005 (client regenerated), launch in parallel:
Task: "Create AppVersionFormSchema in src/app/(private)/app-versions/_schemas/app-version-form.schema.ts"
Task: "Create app-version-form-skeleton.tsx in src/app/(private)/app-versions/_components/app-version-form/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schemas, mock table, POST/PATCH routes, regenerated client).
2. Complete Phase 2: Foundational (form schema, mapper, `AppVersionForm` component, skeleton).
3. Complete Phase 3: User Story 1 (create page wired to `AppVersionForm mode="create"`).
4. **STOP and VALIDATE**: Run quickstart.md "Register (US1)" steps independently.
5. Demo if ready — registration alone is a complete, shippable increment.

### Incremental Delivery

1. Setup + Foundational → Phase 3 (US1) → validate → Phase 4 (US2) → validate → Phase 5 (US3, verification-only) → validate → Phase 6 (Polish).
2. Each phase's checkpoint is an independently testable increment; US1 and US2 could ship as separate PRs if desired, since they touch different page files and only share the already-built `AppVersionForm`.
