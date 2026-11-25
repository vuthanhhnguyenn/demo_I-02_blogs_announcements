# Developer Quickstart: Article Category Form (Notice & Blog Management)

**Branch**: `013-article-category-form`
**Routes**: `/article-categories/create`, `/article-categories/[id]/edit`
**Phase**: 1 (mock API — no backend required)

---

## Prerequisites

- Node.js ≥ 24.0.0
- Repo cloned and `npm install` run
- On branch `013-article-category-form`
- `013-article-category-master` already merged (list screen, `ArticleCategory` schema/table/seed, permissions)

---

## Implementation Order

### Step 1 — Extend the Zod schemas

**File**: `src/app/api/_schemas/article-category.schema.ts`

Add `CreateArticleCategoryBodySchema` and `UpdateArticleCategoryBodySchema` (partial of create) per [data-model.md](./data-model.md). No new response schemas — `POST`, `GET`-by-id, and `PATCH` all respond with the existing `ArticleCategoryItemResponseSchema` directly, unwrapped. Do not touch the existing `ArticleCategorySchema`/`ArticleCategoryItemResponseSchema`/`GetArticleCategoriesQueryParamsSchema` — they are unchanged.

### Step 2 — Extend the mock table

**File**: `src/app/api/_mock-db/tables/article-category.table.ts`

Add `create()` and `update()` to the existing `articleCategories` table object per [data-model.md](./data-model.md#mock-table-extensions-new-methods-on-the-existing-articlecategories-table). Leave `articleCategoryMappings` untouched.

### Step 3 — Route Handlers

- `src/app/api/crm/article-categories/route.ts` — add `POST` per [contracts/POST-article-categories.md](./contracts/POST-article-categories.md). Existing `GET` unchanged.
- `src/app/api/crm/article-categories/[id]/route.ts` — add `GET` per [contracts/GET-article-categories-id.md](./contracts/GET-article-categories-id.md) and `PATCH` per [contracts/PATCH-article-categories-id.md](./contracts/PATCH-article-categories-id.md). Existing `DELETE` unchanged.

### Step 4 — Regenerate the API client

```bash
npm run generate-openapi
npm run generate-api
```

Confirms `postCrmArticleCategoriesMutation`, `patchCrmArticleCategoriesByIdMutation`, `getCrmArticleCategoriesByIdOptions`/`QueryKey`, and the `CreateArticleCategoryBody`/`UpdateArticleCategoryBody` types land in `src/lib/api/`. Do not hand-edit generated files (Principle II).

### Step 5 — Form schema + mapper

**Files**: `src/app/(private)/article-categories/_schemas/article-category-form.schema.ts`, `.../article-category-form.mapper.ts`

Per [data-model.md](./data-model.md#form-values-new--this-feature), modeled on `src/app/(private)/banners/_schemas/banner-form.schema.ts` + `banner-form.mapper.ts`.

### Step 6 — Form component

**Files**: `src/app/(private)/article-categories/_components/article-category-form/article-category-form.tsx` (+ `article-category-form-skeleton.tsx`, `index.ts`)

Build with `react-hook-form` + `zodResolver(ArticleCategoryFormSchema)`, modeled on `banner-form.tsx` but simplified:

- Two `<Card>` sections matching the reference design: 基本情報 (name, description, type, brand, order) and 公開設定 (publish `<Switch>`).
- **No** `AlertDialog` confirmation step, **no** discard-guard dialog on Cancel/back — submit directly on `handleSubmit(values => mutate(...))` (see `research.md` Decision 4).
- Submit button label is `"入力内容を確認する"` in both create and edit mode (spec FR-007) — do not vary it by mode like `BannerForm` does.
- Wrap the submit button in `RoleGatedButton allowedRoles={["Headquarter", "System"]}` for parity with the reference design (inert defence-in-depth — see `research.md` Decision 5).
- On success: `toast.success(...)` with a client-side, mode-specific message ("カテゴリを登録しました" / "カテゴリの変更を保存しました") — the mutation response is the bare category object with no `message` field to read from — and `router.push(navigate('/article-categories'))`.

### Step 7 — Wire up the page routes

Replace the two placeholder pages (currently rendering a `Construction` icon + "準備中です"):

- `src/app/(private)/article-categories/create/page.tsx` → renders `<ArticleCategoryForm mode="create" />` under the existing `PageHeader`/`BackLink` (label "カテゴリ管理に戻る", href `/article-categories`).
- `src/app/(private)/article-categories/[id]/edit/page.tsx` → `useQuery(getCrmArticleCategoriesByIdOptions({ path: { id } }))`, shows `<ArticleCategoryFormSkeleton />` while loading, then `<ArticleCategoryForm mode="edit" defaultValues={articleCategoryDetailToFormValues(data)} categoryId={id} />`. Mirrors `src/app/(private)/banners/[id]/edit/page.tsx` exactly.

No changes needed to `page.tsx` (list), `_constants/`, `_hooks/`, or the existing `_components/` (table columns, filters, delete action).

---

## Manual Verification

No automated tests exist in this project (constitution "No Testing Policy"). Verify manually:

### Create (US1)

1. `npm run dev`, log in as `admin@example.com` (Headquarter).
2. Navigate to `/article-categories` → click "新規登録" → confirm you land on `/article-categories/create` with the title "カテゴリ登録", empty fields, 表示順 defaulted to `1`, 公開状況 defaulted to 公開, and the submit button reading "入力内容を確認する".
3. Try submitting empty → confirm カテゴリ名/種別/紐付けブランド show inline errors and nothing is created.
4. Fill in all fields, submit → confirm a "カテゴリを登録しました" toast and redirect to `/article-categories`, with the new category visible in the list.
5. Click "キャンセル" from a partially filled form → confirm it returns to the list without creating anything (no discard-confirmation prompt).

### Edit (US2)

1. From the list, click "編集" on an existing category → confirm the URL is `/article-categories/{id}/edit`, the title is "カテゴリ編集", every field is pre-filled with that category's current values, and the submit button also reads "入力内容を確認する".
2. Change the description and 表示順, submit → confirm a "カテゴリの変更を保存しました" toast, redirect to the list, and the row reflecting the new values.

### Access control (US3)

1. Log out, log back in as `manager@example.com` (Manager), `store-manager@example.com` (Staff), or `observer@example.com` (Observer).
2. Navigate directly to `/article-categories/create` — confirm immediate redirect to `/403`, no form field ever visible.
3. Navigate directly to `/article-categories/{id}/edit` for an existing id — confirm the same `/403` redirect.
4. Confirm no category was created or changed as a side effect of either attempt.

### Brand options (spec FR-001/FR-007)

1. As Headquarter, open the create form and open the 紐付けブランド `<Select>` — confirm exactly five options: JOYFIT, JOYFIT24, JOYFIT YOGA, JOYFIT+, FIT365, with no "JOYFIT全体" entry.
