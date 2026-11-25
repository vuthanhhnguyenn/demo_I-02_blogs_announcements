# Quickstart: Banner Form Management (010)

> Recommended implementation order for Phase 1.

## Step 1 — Register Form Routes in Permissions

- Add `'/banners/create': Permission.BannersCreate` to `PAGE_PERMISSIONS` in `src/constants/permission.constants.ts`.
- Add `'/banners/:id/edit': Permission.BannersEdit` to `PAGE_PERMISSIONS`.
- Verify that `ROLE_PERMISSIONS` already grants these permissions to Headquarter/System (added by banner-list feature).
- **Depends on**: Nothing.
- **Verification**: `npm run type-check`.

## Step 2 — Enrich Mock API Schemas

- Add to `src/app/api/_schemas/banner.schema.ts`:
  - `CreateBannerBodySchema` — POST request payload.
  - `UpdateBannerBodySchema` — PATCH request payload (partial).
  - `GetBannerResponseSchema` — GET by ID response.
  - `CreateBannerResponseSchema` — POST success response.
  - `UpdateBannerResponseSchema` — PATCH success response.
- Reuse `BannerSchema`, `BannerBrandSchema`, `BannerStatusSchema`, `BannerChannelSchema` (already defined).
- **Depends on**: Nothing.
- **Verification**: `tsc --noEmit` passes.

## Step 3 — Enrich Mock DB Methods

- Add `add(data)` method to `banner.table.ts` — generates new ID, appends order to end, inserts row.
- Add `update(id, data)` method to `banner.table.ts` — merges partial data into existing row.
- Wire exports in `src/app/api/_mock-db/index.ts`.
- **Depends on**: Step 2 (schema shapes).
- **Verification**: Unit-level test or route verification in Step 4.

## Step 4 — Implement Mock API Handlers

- In `src/app/api/crm/banners/[id]/route.ts`:
  - Add `GET` handler (fetch single banner by ID).
  - Add `PATCH` handler (partial update banner).
- In `src/app/api/crm/banners/route.ts`:
  - Add `POST` handler (create new banner).
- Ensure `registerRoute()` is called in each handler for OpenAPI registration.
- **Depends on**: Step 2 (schemas) + Step 3 (mock DB methods).
- **Verification**: `npm run dev` + curl each endpoint.

## Step 5 — Regenerate API Client

- Run `npm run generate-client`.
- Confirm generated option factories/mutations exist:
  - `getCrmBannersByIdOptions`
  - `postCrmBannersMutation`
  - `patchCrmBannersByIdMutation`
- **Depends on**: Step 4 (routes registered with `registerRoute()`).
- **Verification**: Import the new factories in a temporary file.

## Step 6 — Create Client Schema + Mapper

- Create `src/app/(private)/banners/_schemas/banner-form.schema.ts` with `BannerFormSchema`, `BannerFormValues` type, and `emptyBannerFormValues`.
- Create `src/app/(private)/banners/_schemas/banner-form.mapper.ts` with `bannerDetailToFormValues()`, `bannerFormValuesToCreateBody()`, and `bannerFormValuesToUpdateBody()`.
- **Depends on**: Nothing.
- **Verification**: `tsc --noEmit` passes.

## Step 7 — Build BannerForm Component

- Create `src/app/(private)/banners/_components/banner-form/banner-form.tsx`:
  - Accepts `mode` prop and optional `defaultValues`.
  - Uses `useForm` with `zodResolver` and `BannerFormSchema`.
  - Renders one `Card` section per field group (basic info, image, brand, channel, period, order,
    actions), each extracted into `banner-form/sections/*.tsx`.
  - Submit triggers `useMutation` (POST for create, PATCH for edit).
  - Success: toast + `router.push(navigate('/banners'))`.
  - Failure: generic error toast.
  - Unsaved-changes discard confirmation via `banner-form/banner-discard-dialog.tsx`.
- Create `src/app/(private)/banners/_components/banner-form/banner-form-skeleton.tsx` for edit loading state.
- Export both from `src/app/(private)/banners/_components/banner-form/index.ts`.
- **Depends on**: Step 5 (option factories) + Step 6 (schema + mapper).
- **Verification**: Form renders and validates in isolation.

## Step 8 — Create Page Files

- Create `src/app/(private)/banners/create/page.tsx` — render `<BannerForm mode="create" />`.
- Create `src/app/(private)/banners/[id]/edit/page.tsx` — fetch via `useQuery(getCrmBannersByIdOptions)` → skeleton while loading → render `<BannerForm mode="edit" defaultValues={...} />`.
- **Depends on**: Step 1 (permissions) + Step 7 (BannerForm component).
- **Verification**: Navigate to each route; verify mode-specific behaviour.

## Step 9 — Verify

- Run `npm run type-check`.
- Run `npm run lint`.
- Run `npm run dev` and manually validate FR-FORM-001..FR-FORM-008 scenarios from spec.

## Validation Checklist

- [ ] `/banners/create` renders empty form with correct title.
- [ ] `/banners/[id]/edit` fetches and pre-fills banner data with skeleton loading.
- [ ] Required field validation blocks submit with inline errors.
- [ ] Create submit calls POST, shows success toast, navigates to list.
- [ ] Edit submit calls PATCH, shows success toast, navigates to list.
- [ ] Non-Headquarter/System roles see disabled create/edit buttons in list.
- [ ] Direct URL access to form routes by unauthorized roles redirects to `/403`.
- [ ] Submission failure shows generic error toast.
- [ ] `npm run type-check` passes.
- [ ] `npm run lint` passes.
