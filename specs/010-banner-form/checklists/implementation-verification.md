# Implementation Verification: Banner Form Management

**Date**: 2026-07-06
**Status**: ✅ Implementation Complete

## Verification Results

| #   | User Story / Check                                               | Status  | Notes                                                                     |
| --- | ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| 1   | `/banners/create` renders with correct title                     | ✅ PASS | PageHeader shows "バナー新規登録"                                         |
| 2   | `/banners/[id]/edit` fetches and pre-fills with skeleton loading | ✅ PASS | Skeleton shown during loading, form pre-filled with banner data           |
| 3   | Required field validation blocks submit with inline errors       | ✅ PASS | Zod schema validates required fields: title, imageUrl, brand, periodStart |
| 4   | Create submit calls POST, shows success toast, navigates to list | ✅ PASS | `postCrmBannersMutation` via generated factory                            |
| 5   | Edit submit calls PATCH, shows success toast, navigates to list  | ✅ PASS | `patchCrmBannersByIdMutation` with path id                                |
| 6   | Image upload uses `useImageUpload` hook with file picker         | ✅ PASS | Category `'studio'`, JPEG/PNG, 5MB max                                    |
| 7   | Submit button disabled while uploading                           | ✅ PASS | `isUploading` disables submit button                                      |
| 8   | Non-Headquarter/System roles see disabled create/edit in list    | ✅ PASS | Permissions `BannersCreate`/`BannersEdit` already in ROLE_PERMISSIONS     |
| 9   | Direct URL access to form routes by unauthorized roles → `/403`  | ✅ PASS | PAGE_PERMISSIONS entries for `/banners/create` and `/banners/:id/edit`    |
| 10  | Submission failure shows generic error toast                     | ✅ PASS | `onError` handlers show toast                                             |
| 11  | `npm run type-check` passes                                      | ✅ PASS | 0 errors                                                                  |
| 12  | `npm run lint` passes                                            | ✅ PASS | 0 errors, 0 warnings                                                      |

## Files Created

| File                                                                          | Purpose                                                                                        |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/app/(private)/banners/create/page.tsx`                                   | Create mode page                                                                               |
| `src/app/(private)/banners/[id]/edit/page.tsx`                                | Edit mode page with loading skeleton                                                           |
| `src/app/(private)/banners/_components/banner-form/banner-form.tsx`           | Shared form component                                                                          |
| `src/app/(private)/banners/_components/banner-form/banner-form-skeleton.tsx`  | Loading skeleton                                                                               |
| `src/app/(private)/banners/_components/banner-form/banner-discard-dialog.tsx` | Unsaved-changes discard confirmation dialog                                                    |
| `src/app/(private)/banners/_components/banner-form/index.ts`                  | Barrel export (`BannerForm`, `BannerFormSkeleton`)                                             |
| `src/app/(private)/banners/_components/banner-form/sections/*.tsx`            | Per-field-group section components (basic info, image, brand, channel, period, order, actions) |
| `src/app/(private)/banners/_schemas/banner-form.schema.ts`                    | Client-side Zod schema                                                                         |
| `src/app/(private)/banners/_schemas/banner-form.mapper.ts`                    | Form ↔ API mapper                                                                              |

## Files Modified

| File                                          | Changes                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/constants/permission.constants.ts`       | Added `/banners/create` and `/banners/:id/edit` to PAGE_PERMISSIONS                               |
| `src/app/api/_schemas/banner.schema.ts`       | Added `BannerBrandIdSchema`, `CreateBannerBodySchema`, `UpdateBannerBodySchema`, response schemas |
| `src/app/api/_mock-db/types/banners.type.ts`  | Added `add()` and `update()` to type interface                                                    |
| `src/app/api/_mock-db/tables/banner.table.ts` | Added `add()` and `update()` methods with brand resolution                                        |
| `src/app/api/crm/banners/route.ts`            | Added POST handler                                                                                |
| `src/app/api/crm/banners/[id]/route.ts`       | Added GET and PATCH handlers                                                                      |
