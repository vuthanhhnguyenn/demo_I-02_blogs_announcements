# Developer Quickstart: App Version Management (Create/Edit Form)

**Branch**: `018-app-version-form`
**Routes**: `/app-versions/create`, `/app-versions/[id]/edit`
**Phase**: 1 (mock API — no backend required)

---

## Prerequisites

- Node.js ≥ 24.0.0
- Repo cloned and `npm install` run
- On branch `018-app-version-form`
- `016-app-version-management` and `017-app-version-detail` already merged (list/detail screens, `AppVersionRecord` schema/table/seed, permissions, routes)

---

## Implementation Order

### Step 1 — Extend the Zod schemas

**File**: `src/app/api/_schemas/app-version.schema.ts`

Add `CreateAppVersionBodySchema` and `UpdateAppVersionBodySchema` (partial of create) per [data-model.md](./data-model.md). No new response schemas — `POST` and `PATCH` both respond with the existing `AppVersionRecordSchema` directly, unwrapped. Do not touch `AppVersionRecordSchema`, `AppVersionBrandEnumSchema`, `GetAppVersionsQueryParamsSchema`, or `GetAppVersionResponseSchema` — they are unchanged.

### Step 2 — Extend the mock table

**File**: `src/app/api/_mock-db/tables/app-version.table.ts`

Add `create()` and `update()` to the existing `appVersions` table object per [data-model.md](./data-model.md#mock-table-extensions-new-methods-on-the-existing-appversions-table). Leave `getList`/`getById`/`softDelete` untouched.

### Step 3 — Route Handlers

- `src/app/api/crm/app-versions/route.ts` — add `POST` per [contracts/POST-app-versions.md](./contracts/POST-app-versions.md). Existing `GET` unchanged.
- `src/app/api/crm/app-versions/[id]/route.ts` — add `PATCH` per [contracts/PATCH-app-versions-id.md](./contracts/PATCH-app-versions-id.md). Existing `GET`/`DELETE` unchanged.

### Step 4 — Regenerate the API client

```bash
npm run generate-routes
npm run generate-openapi
npm run generate-api
```

Confirms `postCrmAppVersionsMutation` and `patchCrmAppVersionsByIdMutation`, plus `CreateAppVersionBody`/`UpdateAppVersionBody` types, land in `src/lib/api/`. Do not hand-edit generated files (Principle II).

### Step 5 — Form schema + mapper

**Files**: `src/app/(private)/app-versions/_schemas/app-version-form.schema.ts`, `.../app-version-form.mapper.ts`

Per [data-model.md](./data-model.md#form-values-new--this-feature), modeled on `src/app/(private)/article-categories/_schemas/article-category-form.schema.ts` + `article-category-form.mapper.ts`. The mapper's create/update-body functions must convert an empty-string `remarks` to `null` (the entity's `remarks` is `string | null`, while the form field is always a plain string).

### Step 6 — Form component

**Files**: `src/app/(private)/app-versions/_components/app-version-form/app-version-form.tsx` (+ `app-version-form-skeleton.tsx`, `index.ts`)

Build with `react-hook-form` + `zodResolver(AppVersionFormSchema)`, modeled on `article-category-form.tsx`:

- One `<Card>` section ("バージョン情報") matching the reference design: brand `RadioGroup`, iOS version+build pair, Android version+build pair (both in a `grid grid-cols-2` layout), release date `DatePicker`, remarks `Textarea`, and the maintenance-window `Alert`.
- Brand `RadioGroup` is `Controller`-driven, bound to the real `AppVersionBrandEnum.JOYFIT`/`.FIT365` values with labels from `APP_VERSION_BRAND_LABELS` — **not** the reference design's literal `"JOYFIT"`/`"FIT365"` string values (see `research.md` Decision 3).
- Release date `DatePicker` is `Controller`-driven: `date={field.value ? parseISO(field.value) : undefined}`, `onDateChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}` (mirrors `training-equipment-form-fields.tsx`).
- **No** `AlertDialog` confirmation step, **no** discard-guard dialog on Cancel — submit directly on `handleSubmit(values => mutate(...))` (see `research.md` Decision 4).
- Wrap the submit button in `RoleGatedButton allowedRoles={["Headquarter", "System"]}` for parity with the reference design (inert defence-in-depth — see `research.md` Decision 5).
- On success: `toast.success(...)` with a client-side, mode-specific message ("アプリバージョンを登録しました" / "アプリバージョンの変更を保存しました") and `router.push(navigate('/app-versions'))`.

### Step 7 — Wire up the page routes

Replace the two placeholder pages (currently rendering a `Construction` icon + "この画面は準備中です"):

- `src/app/(private)/app-versions/create/page.tsx` → renders `<AppVersionForm mode="create" />` under a `PageHeader`/`BackLink` (label "アプリ配信バージョン管理に戻る", href `/app-versions`).
- `src/app/(private)/app-versions/[id]/edit/page.tsx` → `useQuery(getCrmAppVersionsByIdOptions({ path: { id } }))` (from `017-app-version-detail`), shows `<AppVersionFormSkeleton />` while loading, a not-found state if the record doesn't come back, then `<AppVersionForm mode="edit" defaultValues={appVersionRecordToFormValues(data)} versionId={id} />`. Mirrors `src/app/(private)/article-categories/[id]/edit/page.tsx`.

No changes needed to `page.tsx` (list), `[id]/page.tsx` (detail), `_constants/`, or the existing `_components/` (table columns, filters, delete dialog, header actions).

---

## Manual Verification

No automated tests exist in this project (constitution "No Testing Policy"). Verify manually:

### Register (US1)

1. `npm run dev`, log in as a Headquarter or System user.
2. Navigate to `/app-versions` → click "新規登録" → confirm you land on `/app-versions/create` with the title "バージョン登録", empty fields, brand defaulted to JOYFIT, and the maintenance-window warning visible.
3. Try submitting empty → confirm required fields show inline errors and nothing is created.
4. Enter an invalid version name (e.g. `2.1`) or a build number of `0` → confirm the specific inline error and blocked submission.
5. Fill in all required fields (leave remarks empty), submit → confirm an "アプリバージョンを登録しました" toast, redirect to `/app-versions`, and the new record visible at the top of the list with `remarks` rendering as empty.
6. Click "キャンセル" from a partially filled form → confirm it returns to the list immediately, without any confirmation prompt, and without creating anything.

### Edit (US2)

1. From the list or detail screen, click "編集" on an existing record → confirm the URL is `/app-versions/{id}/edit`, the title is "バージョン編集", every field (including brand) is pre-filled with that record's current values.
2. Change the iOS build number and remarks, submit → confirm an "アプリバージョンの変更を保存しました" toast, redirect to the list, and the row reflecting the new values.
3. Submit without changing anything → confirm it still succeeds (no-op update, per spec Edge Cases).
4. Manually navigate to `/app-versions/{deleted-or-unknown-id}/edit` → confirm a not-found state, not a blank or broken form.

### Access control (US3)

1. Log out, log back in as a Manager, Staff, Observer, or Trainer user.
2. Navigate directly to `/app-versions/create` — confirm immediate redirect to `/403`, no form field ever visible.
3. Navigate directly to `/app-versions/{id}/edit` for an existing id — confirm the same `/403` redirect.
4. Confirm no record was created or changed as a side effect of either attempt.

### Brand binding (research.md Decision 3)

1. As Headquarter, open the create form, select FIT365, fill the rest, submit.
2. Confirm the created record's `brandEnum` in the list is `Fit365` (not the literal string `"FIT365"`) and displays the "FIT365" badge — i.e. the RadioGroup's real value round-trips correctly through the API, not just its display label.
