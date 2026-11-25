# Research: Banner Form Management (010)

> Phase 0 output — all planning uncertainties resolved for Phase 1 implementation.

## Decisions

### D1. Form Component Architecture

**Decision**: A single `BannerForm` client component with a `mode` discriminated union prop.

```ts
type BannerFormMode = 'create' | 'edit';
```

- Uses `react-hook-form` + `zod` via `@hookform/resolvers/zod` (matches existing campaign-form pattern).
- `mode` drives: page title ("バナー新規登録" / "バナー編集"), success toast message, pre-fill behaviour.
- Submit button label is "保存する" for both modes.
- **Create**: empty defaults, `POST` mutation, success toast → navigate to banner list.
- **Edit**: pre-filled from `GET /api/crm/banners/{id}`, `PATCH` mutation, success toast → navigate to banner list.

**Rationale**: The spec defines create and edit as the two form modes. A shared component avoids duplication and matches the project's campaign-form pattern.

**Alternatives considered**:

- Separate `BannerCreateForm` and `BannerEditForm` components — rejected because the field layout is identical; only pre-fill and API method differ.

---

### D2. Page Routes

**Decision**: Two Next.js App Router page files, each passing the appropriate `mode` and `defaultValues` to `BannerForm`:

| Route                | Mode     | Default Values                           |
| -------------------- | -------- | ---------------------------------------- |
| `/banners/create`    | `create` | Empty (all defaults)                     |
| `/banners/[id]/edit` | `edit`   | Fetched from `GET /api/crm/banners/{id}` |

**Rationale**: Thin pages (~15 lines) per existing pattern. Navigation from list already targets these routes (`banner-list-header-actions.tsx` → `/banners/create`, `banners-table-columns.tsx` → `/banners/${id}/edit`).

---

### D3. Form Fields Layout

**Decision**: Single-page form with sections ordered per spec requirements:

| Field           | Type                             | Required | Notes                                                                                                                                                                                                                                                                                                 |
| --------------- | -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`         | Text input                       | Yes      | Max 255 chars                                                                                                                                                                                                                                                                                         |
| `imageUrl`      | File upload via `useImageUpload` | Yes      | File picker → presigned URL → public URL stored on submit                                                                                                                                                                                                                                             |
| `brandEnum`     | Multi-select (enum array)        | Yes      | Min 1; stored values are `BrandEnum` (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`). UI adds a form-only "JOYFIT全体" option (`BRAND_ALL_VALUE`) that expands selection to all 5 real values and displays as the sole checked box when all 5 are present; it is never sent to the API |
| `linkUrl`       | URL input                        | No       | Optional, max-width display in list                                                                                                                                                                                                                                                                   |
| `periodStart`   | Date input (`YYYY/MM/DD`)        | Yes      |                                                                                                                                                                                                                                                                                                       |
| `periodEnd`     | Date input (`YYYY/MM/DD`)        | No       | Nullable; no end date if omitted                                                                                                                                                                                                                                                                      |
| `webEnabled`    | Switch (boolean)                 | Yes      | Default: true                                                                                                                                                                                                                                                                                         |
| `mobileEnabled` | Switch (boolean)                 | Yes      | Default: true                                                                                                                                                                                                                                                                                         |
| `order`         | Number input                     | No       | Display sequence; auto-set server-side on create                                                                                                                                                                                                                                                      |

Note: Detail field-level layout/validation is grounded by the form UI source per spec Assumptions section. This plan covers the minimal fields needed for the list scope.

**Rationale**: Fields match the Banner entity from the list spec (data-model.md).

---

### D4. Zod Schemas

**Decision**: Two schema layers:

1. **`banner-form.schema.ts`** (client-side, in `banners/_schemas/`):
   - Full form shape with validation rules.
   - Exports `BannerFormValues` type and `emptyBannerFormValues` default.

2. **`banner.schema.ts`** enrichment (server-side, in `api/_schemas/`):
   - `CreateBannerBodySchema` — payload for `POST /api/crm/banners`.
   - `UpdateBannerBodySchema` — payload for `PATCH /api/crm/banners/{id}` (partial).
   - `GetBannerResponseSchema` — single banner detail response.
   - `CreateBannerResponseSchema` / `UpdateBannerResponseSchema` — success responses.

**Rationale**: Constitution Principle III mandates Zod schemas. Existing `banner.schema.ts` already defines `BannerSchema`; only request/response schemas for create/update are new.

---

### D5. Mock API Routes

**Decision**: Add three handlers to existing banner route files:

| Route                   | Method  | Purpose                               | Notes                                         |
| ----------------------- | ------- | ------------------------------------- | --------------------------------------------- |
| `/api/crm/banners/{id}` | `GET`   | Fetch single banner for edit pre-fill | Already exists as `DELETE`; add `GET` handler |
| `/api/crm/banners`      | `POST`  | Create new banner                     | Add to existing `route.ts`                    |
| `/api/crm/banners/{id}` | `PATCH` | Update existing banner                | Add to existing `[id]/route.ts`               |

**Mock DB enrichment**: Add `db.banners.add()` and `db.banners.update()` methods to `banner.table.ts`.

**Rationale**: Consistent with existing campaign form pattern. Required so `npm run generate-client` generates the option factories.

---

### D6. React Query Hooks

**Decision**: Use auto-generated option factories from `npm run generate-client`:

- `getCrmBannersByIdOptions` — fetch single banner for edit pre-fill (generated from GET handler).
- `postCrmBannersMutation` — create submit (generated from POST handler).
- `patchCrmBannersByIdMutation` — update submit (generated from PATCH handler).

No direct `fetch` calls. Form submission uses `useMutation` wrapping the generated options.

---

### D7. Permission Gating

**Decision**: Entry-point gating via `PAGE_PERMISSIONS`:

- `/banners/create` → `Permission.BannersCreate` (add to `permission.constants.ts`).
- `/banners/[id]/edit` → `Permission.BannersEdit` (add to `permission.constants.ts`).
- `ROLE_PERMISSIONS` already grants `BannersCreate` and `BannersEdit` to Headquarter/System only.
- List-screen buttons already use `RoleGatedButton` with `BannersCreate`/`BannersEdit`.
- Route-level redirect enforcement remains in `src/proxy.ts` (no changes needed).

**Rationale**: Matches FR-FORM-001, FR-FORM-002, FR-FORM-007 and the project's existing permission architecture.

---

### D8. Submit Behaviour (Phase 1)

**Decision**:

- Validation: Zod schema + `form.handleSubmit`. Inline per-field errors on validation failure.
- On valid submit: show loading spinner on button; call `useMutation`.
- On success: show success toast → `router.push(navigate('/banners'))`.
- On failure: generic error toast (consistent with list spec assumed error handling pattern).

No confirmation dialog (unlike lesson form) — spec does not require one for create/edit submit.

---

### D9. Edit Pre-fill Loading

**Decision**:

- **Create mode**: Renders immediately (no loading).
- **Edit mode**: Shows `<BannerFormSkeleton />` while `useQuery` fetches the banner detail.

---

### D10. Image Handling

**Decision**:

- Image field uses the existing `useImageUpload` hook (`src/hooks/use-image-upload.hook.ts`).
- Hook flow: file picker → client-side validation (max 5 MB, JPEG/PNG only by default) → `POST /api/crm/uploads/presign` → `PUT` file to presigned URL → returned `public_url` stored on the banner record.
- A thumbnail preview of the uploaded image renders below the upload button using `next/image` after upload completes (or a placeholder message when no image has been uploaded yet).
- Upload category: `'studio'` (banner images).
- Loading state: submit button shows spinner while `isUploading` is true.

**Rationale**: Reuse existing image upload infrastructure instead of implementing URL-only input. The hook centralises size/type validation, presigned URL acquisition, and upload execution, consistent with other CRM forms.

---

## References

- Spec: `specs/010-banner-form/spec.md`
- Existing form pattern: `campaigns/create/page.tsx` + `campaigns/[id]/edit/page.tsx` (mode prop, shared form)
- Existing schema pattern: `campaigns/_schemas/campaign-form.schema.ts` (Zod + react-hook-form)
- Existing mock route pattern: Existing banner route files + campaign POST/PATCH handlers
- Existing mock DB: `src/app/api/_mock-db/tables/banner.table.ts`
- Sibling list spec: `specs/010-banner-list/plan.md`
- Permission config: `src/constants/permission.constants.ts`
- Banner list navigation: `banner-list-header-actions.tsx`, `banners-table-columns.tsx`
