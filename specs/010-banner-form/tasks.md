# Tasks: Banner Form Management (I-02 FR-005 Form Scope)

**Input**: Design documents from `/specs/010-banner-form/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: No explicit TDD/automated test-first request in spec. Validation tasks use lint/type-check and manual scenario verification from independent tests.

**Organization**: Tasks are grouped by phase for independent implementation and validation.

## Phase 1: Permissions & Route Registration

**Purpose**: Establish page-level gating for form routes so unauthorized access is blocked.

- [x] T001 Add `/banners/create` → `Permission.BannersCreate` to `PAGE_PERMISSIONS` in `src/constants/permission.constants.ts`
- [x] T002 Add `/banners/:id/edit` → `Permission.BannersEdit` to `PAGE_PERMISSIONS` in `src/constants/permission.constants.ts`

**Checkpoint**: Unauthorized direct URL access blocked per FR-FORM-007.

---

## Phase 2: Mock API Schemas

**Purpose**: Define request/response schemas for create and update endpoints.

- [x] T003 [P] Add `CreateBannerBodySchema` to `src/app/api/_schemas/banner.schema.ts`
- [x] T004 [P] Add `UpdateBannerBodySchema` (partial/all-optional) to `src/app/api/_schemas/banner.schema.ts`
- [x] T005 [P] Add `GetBannerResponseSchema`, `CreateBannerResponseSchema`, `UpdateBannerResponseSchema` to `src/app/api/_schemas/banner.schema.ts`

**Checkpoint**: All server-side schemas defined — blocks Phase 3.

---

## Phase 3: Mock DB Methods

**Purpose**: Add create and update operations to the in-memory banner store.

- [x] T006 [P] Add `add(data)` method to `src/app/api/_mock-db/tables/banner.table.ts` (generates ID, assigns next order)
- [x] T007 [P] Add `update(id, data)` method to `src/app/api/_mock-db/tables/banner.table.ts` (merges partial data)
- [x] T008 Wire banner method exports in `src/app/api/_mock-db/index.ts`

**Checkpoint**: Mock DB ready for route handlers — blocks Phase 4.

---

## Phase 4: Mock API Route Handlers

**Purpose**: Implement POST, GET-by-id, and PATCH route handlers.

- [x] T009 [P] Add `GET` handler to `src/app/api/crm/banners/[id]/route.ts` (fetch single banner via `db.banners.getById`)
- [x] T010 [P] Add `POST` handler to `src/app/api/crm/banners/route.ts` (create via `db.banners.add`)
- [x] T011 [P] Add `PATCH` handler to `src/app/api/crm/banners/[id]/route.ts` (update via `db.banners.update`)
- [x] T012 Regenerate API client via `npm run generate-client` and confirm new option factories exist

**Checkpoint**: Backend complete — generated React Query hooks available — blocks Phase 5.

---

## Phase 5: Client Schema + Mapper

**Purpose**: Create client-side Zod schema and mapper functions for the form.

- [x] T013 [P] Create `src/app/(private)/banners/_schemas/banner-form.schema.ts` with `BannerFormSchema`, `BannerFormValues`, `emptyBannerFormValues`
- [x] T014 [P] Create `src/app/(private)/banners/_schemas/banner-form.mapper.ts` with `bannerDetailToFormValues()`, `bannerFormValuesToCreateBody()`, and `bannerFormValuesToUpdateBody()`

**Checkpoint**: Client validation ready — blocks Phase 6.

---

## Phase 6: BannerForm Component

**Purpose**: Build the shared form component used by create and edit pages.

- [x] T015 [P] Create `src/app/(private)/banners/_components/banner-form/banner-form-skeleton.tsx` for edit loading state
- [x] T016 [P] Create `src/app/(private)/banners/_components/banner-form/banner-form.tsx` with:
  - `mode` prop (`'create' | 'edit'`)
  - `useForm` with `zodResolver` and `BannerFormSchema`
  - All form fields, each in its own `sections/*.tsx` component: title/linkUrl (basic-info), imageUrl (via `useImageUpload` hook with `category: 'studio'`), brand (checkboxes incl. form-only "JOYFIT全体"), period (periodStart/periodEnd), channel (webEnabled/mobileEnabled), order
  - `imageUrl` field: file picker → `useImageUpload().uploadFile(file)` → store returned public URL in form
  - Upload loading: submit button disabled while `useImageUpload().isUploading` is true
  - Create mode: `useMutation(postCrmBannersMutation)`, success toast → navigate to list
  - Edit mode: `useMutation(patchCrmBannersByIdMutation)`, success toast → navigate to list
  - Failure: generic error toast
  - Unsaved-changes discard confirmation dialog (`banner-form/banner-discard-dialog.tsx`) via `useUnsavedChanges`
  - Barrel export `banner-form/index.ts`

**Checkpoint**: Form component functional — blocks Phase 7.

---

## Phase 7: Page Files

**Purpose**: Create thin page files that wire routes to the form component.

- [x] T017 Create `src/app/(private)/banners/create/page.tsx` — render `<BannerForm mode="create" />`
- [x] T018 Create `src/app/(private)/banners/[id]/edit/page.tsx` — fetch via `useQuery(getCrmBannersByIdOptions)` → skeleton → render `<BannerForm mode="edit" />`

**Checkpoint**: Feature complete — ready for verification.

---

## Phase 8: Verification

**Purpose**: Final validation, hardening, and implementation notes.

- [x] T019 Run `npm run type-check` and `npm run lint`, fixing banner-scope issues
- [x] T020 Record manual verification outcomes for all user stories in `specs/010-banner-form/checklists/implementation-verification.md`

**Checkpoint**: Feature verified and ready for review.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Permissions)**: Starts immediately; independent.
- **Phase 2 (Schemas)**: Starts immediately; independent.
- **Phase 3 (Mock DB)**: Depends on Phase 2 (schema shapes).
- **Phase 4 (Routes)**: Depends on Phase 2 (schemas) + Phase 3 (mock DB methods).
- **Phase 5 (Client Schema)**: Starts immediately; independent of Phases 2-4.
- **Phase 6 (Form Component)**: Depends on Phase 4 (option factories) + Phase 5 (schema + mapper).
- **Phase 7 (Page Files)**: Depends on Phase 1 (permissions) + Phase 6 (form component).
- **Phase 8 (Verification)**: Depends on Phase 7.

### Execution Order

1. **Phase 1** (Permissions — independent)
2. **Phase 2** (Schemas — independent)
3. **Phase 5** (Client Schema — independent, can run with Phases 2-3)
4. **Phase 3** (Mock DB — depends on Phase 2)
5. **Phase 4** (Routes — depends on Phase 2+3)
6. **Phase 6** (Form Component — depends on Phase 4+5)
7. **Phase 7** (Page Files — depends on Phase 1+6)
8. **Phase 8** (Verification)

---

## Parallel Opportunities

- **Independent**: Phases 1, 2, and 5 can start in parallel.
- **Phase 2 → 3 → 4**: Sequential chain (schemas → mock DB → routes).
- **Phase 6**: Can start once Phase 4 completes.
- **Phase 7**: Can start once Phase 1 + Phase 6 complete.
- **Phase 8**: Final validation after all phases.

### Parallel Example: Independent Foundation

```bash
# Parallel — no dependencies between these
T001 [Phase 1] src/constants/permission.constants.ts
T003 [Phase 2] src/app/api/_schemas/banner.schema.ts
T013 [Phase 5] src/app/(private)/banners/_schemas/banner-form.schema.ts
```

### Parallel Example: Phase 4 Route Handlers

```bash
# Parallel — all three handlers can be built concurrently
T009 [Phase 4] src/app/api/crm/banners/[id]/route.ts (GET)
T010 [Phase 4] src/app/api/crm/banners/route.ts (POST)
T011 [Phase 4] src/app/api/crm/banners/[id]/route.ts (PATCH)
```

---

## Implementation Strategy

### Recommended Order

1. Complete **Phase 1** + **Phase 2** + **Phase 5** (independent foundation).
2. Complete **Phase 3** (mock DB methods).
3. Complete **Phase 4** (API routes + client regeneration).
4. Complete **Phase 6** (form component).
5. Complete **Phase 7** (page files).
6. Complete **Phase 8** (verification).

### Format Validation

All tasks in this file follow the required checklist pattern:

`- [ ] T### [P?] [US?] Description with file path`
