# Data Model: Article Category Master List (Notice & Blog Management)

**Branch**: `013-article-category-master` | **Phase**: 1 — Design & Contracts
**Updated**: 2026-07-09 — synced to the shipped implementation
**Source file**: `src/app/api/_schemas/article-category.schema.ts`

---

## Entities

### 1. `ArticleCategoryType` (enum)

| Value    | Japanese label | Meaning                                     |
| -------- | -------------- | ------------------------------------------- |
| `notice` | お知らせ       | Time-bound / administrative notice category |
| `blog`   | ブログ         | Evergreen / marketing blog category         |

Zod: `ArticleCategoryTypeSchema = z.enum(['notice', 'blog'])`, generated as `ArticleCategoryType` in `types.gen.ts`. Japanese labels live in `ARTICLE_CATEGORY_TYPE_LABELS` (`src/app/(private)/article-categories/_constants/article-category.constants.ts`), per project convention (English enum values as API/storage keys, Japanese labels display-only).

---

### 2. Brand — reuses the existing generated `BrandEnum`, NOT a new or reused-from-Banners type

**Not a new type.** `ArticleCategory.brand_enum` reuses `BrandEnumSchema` / `BrandEnum` already defined in `src/app/api/_schemas/brand.schema.ts` and generated into `src/lib/api/types.gen.ts`. There is no separate `ArticleCategory`-specific brand enum and — contrary to an earlier draft of this document — it does **not** reuse the sibling Banner feature's `BannerBrandId`. `BrandEnum` has 5 members; there is no "brand overall" (`joyfit_all`) value.

| Value         | Japanese label (via shared `BRAND_LABELS`) |
| ------------- | ------------------------------------------ |
| `joyfit`      | JOYFIT                                     |
| `joyfit24`    | JOYFIT24                                   |
| `joyfit_yoga` | JOYFIT YOGA                                |
| `joyfit_plus` | JOYFIT+                                    |
| `fit365`      | FIT365                                     |

Japanese labels and badge rendering reuse existing shared code directly: `BRAND_LABELS` (`src/app/(private)/brands/_constants/brand.constants.ts`) for filter dropdown text, and the shared `<BrandBadge brand={...} />` component for the table's brand column. No local label map or bespoke badge styling was introduced for this feature.

---

### 3. `ArticleCategory` (stored entity)

Represents one row of the article category master, as persisted in the mock DB (`src/app/api/_mock-db/seeds/article-category.seed.ts`).

| Field         | Type                  | Nullable                             | Description                                                       |
| ------------- | --------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| `id`          | `string`              | No                                   | Unique category identifier (e.g., `CAT-001`)                      |
| `name`        | `string`              | No                                   | Category display name                                             |
| `description` | `string`              | No                                   | Free-text description of the category's purpose                   |
| `type`        | `ArticleCategoryType` | No                                   | Notice or Blog                                                    |
| `brand_enum`  | `BrandEnum`           | **Yes** (optional in the Zod schema) | The brand this category applies to                                |
| `order`       | `number`              | No                                   | Sort position used for external (WordPress/app) category ordering |
| `is_public`   | `boolean`             | No                                   | `true` = visible externally (公開); `false` = hidden (非公開)     |

**Validation rules** (from `ArticleCategorySchema`):

- `name` is required, non-empty (`min(1)`).
- `order` is a non-negative integer; uniqueness is not enforced across categories — Notice and Blog categories are numbered independently (Notice: 0–12, Blog: 1–17 in the current seed, `CAT-000` Unclassified uses `0`).
- `brand_enum` is `.optional()` — a category may have no brand assigned. No seeded row currently exercises this; the table simply renders no `<BrandBadge>` for such a row.
- `is_public` is a required boolean (no default).

**Display rules** (`article-category.constants.ts` / `article-category-table-columns.tsx`):

- `type = 'notice'` → Badge styled `bg-info/15 text-info border-info/20`; `type = 'blog'` → Badge styled `bg-secondary text-secondary-foreground border-border`.
- `isPublic = true` → Badge "公開" styled `bg-success/15 text-success border-success/20`; `isPublic = false` → Badge "非公開" styled `bg-muted text-muted-foreground border-border`.
- Brand column renders the shared `<BrandBadge brand={row.original.brandEnum} />` — no separate resolution step or nested brand object.

---

### 4. `ArticleCategoryMapping` (stored, one-to-many join table)

Maps articles to the category they belong to. No `Article` entity exists yet in this codebase (I-02 FR-001–FR-004 haven't been built), so `article_id` is a synthetic seed-only identifier used solely to make `articleCount` computable and to exercise the delete-reassignment flow.

| Field         | Type     | Nullable | Description                                     |
| ------------- | -------- | -------- | ----------------------------------------------- |
| `article_id`  | `string` | No       | Synthetic article identifier (e.g., `ART-0001`) |
| `category_id` | `string` | No       | References `ArticleCategory.id`                 |

**Validation rules**: each `article_id` should appear in at most one row (an article belongs to exactly one category); not hard-enforced by the mock store since nothing writes new mapping rows through an API — only seed data and the delete-reassignment routine (`db.articleCategoryMappings.reassignCategory`) touch it.

---

### 5. `ArticleCategoryResponseItem` (response-only, enriched entity)

What the list API actually returns per item, built by `enrichArticleCategory()` in `src/app/api/_mock-db/tables/article-category.table.ts`. There is **no** nested `brands`/brand-info object — the brand is returned as a flat enum value, resolved to a label only in the UI (via the shared `<BrandBadge>`/`BRAND_LABELS`).

| Field          | Type                     | Description                                                                                                 |
| -------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `id`           | `string`                 |                                                                                                             |
| `name`         | `string`                 |                                                                                                             |
| `description`  | `string`                 |                                                                                                             |
| `type`         | `ArticleCategoryType`    |                                                                                                             |
| `order`        | `number`                 |                                                                                                             |
| `isPublic`     | `boolean`                | camelCase in the response, though stored as `is_public`                                                     |
| `brandEnum`    | `BrandEnum \| undefined` | camelCase in the response, though stored as `brand_enum`                                                    |
| `articleCount` | `number`                 | `db.articleCategoryMappings` rows where `category_id` matches this category's `id` — **not** a stored field |

---

### 6. `GetArticleCategoriesQueryParams` (list query params)

Zod: `GetArticleCategoriesQueryParamsSchema` in `article-category.schema.ts`.

| Field       | Type                                    | Default | Description                                                                                                     |
| ----------- | --------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `query`     | `string?`                               | —       | Free-text; matches `name` or `description` (partial, case-insensitive)                                          |
| `type`      | `ArticleCategoryType?`                  | —       | Filter by type; omit for all types                                                                              |
| `brandEnum` | `BrandEnum?`                            | —       | Filter by brand; omit for all brands                                                                            |
| `isPublic`  | `boolean?`                              | —       | Filter by publish status; omit for all statuses (accepts the string `"true"`/`"false"` on the wire and coerces) |
| `sort`      | `"name" \| "order" \| "article_count"?` | —       | Omit for natural (seed/insertion) order                                                                         |
| `order`     | `"asc" \| "desc"`                       | `"asc"` | Sort direction; ignored when `sort` is omitted                                                                  |
| `page`      | `number`                                | `1`     | 1-based page number                                                                                             |
| `limit`     | `25 \| 50 \| 100 \| 200`                | `50`    | Records per page                                                                                                |

`sort: "article_count"` sorts on the computed value (resolved before pagination is applied), not a stored column. Note the sort-direction field is named `order` — the same name as the entity's own `order` (display order) field, but they live in different schemas and are not related.

---

### 7. `GetArticleCategoriesResponse` (list response)

```
{
  items: ArticleCategoryResponseItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  count: number;
}
```

| Field                   | Type                            | Description                                                                                                                   |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `items`                 | `ArticleCategoryResponseItem[]` | Records for the current page                                                                                                  |
| `pagination.totalItems` | `number`                        | Total records matching current filters                                                                                        |
| `pagination.page`       | `number`                        | Current page (1-based)                                                                                                        |
| `pagination.limit`      | `number`                        | Page size used                                                                                                                |
| `pagination.totalPages` | `number`                        | `Math.ceil(totalItems / limit)`                                                                                               |
| `count`                 | `number`                        | Total count of **all** categories, unfiltered — used for the page header's "N件" badge, distinct from `pagination.totalItems` |

---

### 8. `DeleteArticleCategoryResponse`

| Field     | Type     | Description                         |
| --------- | -------- | ----------------------------------- |
| `message` | `string` | Human-readable success message (JP) |

---

## Zod Schema File (actual, current)

**Location**: `src/app/api/_schemas/article-category.schema.ts`

Reuses `BrandEnumSchema` from `src/app/api/_schemas/brand.schema.ts` directly — it is not redefined, and `BannerBrandIdSchema`/`BannerBrandInfoSchema` are **not** used anywhere in this feature.

```typescript
import { z } from 'zod';

import { BrandEnumSchema } from './brand.schema';

export const ArticleCategoryTypeSchema = z.enum(['notice', 'blog']);

export const ArticleCategorySortSchema = z.enum(['name', 'order', 'article_count']);

export const ArticleCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  type: ArticleCategoryTypeSchema,
  brand_enum: BrandEnumSchema.optional(),
  order: z.number().int().nonnegative(),
  is_public: z.boolean(),
});

export const ArticleCategoryMappingSchema = z.object({
  article_id: z.string(),
  category_id: z.string(),
});

export const ArticleCategoryItemResponseSchema = z.object({
  id: ArticleCategorySchema.shape.id,
  name: ArticleCategorySchema.shape.name,
  description: ArticleCategorySchema.shape.description,
  type: ArticleCategorySchema.shape.type,
  brandEnum: ArticleCategorySchema.shape.brand_enum,
  order: ArticleCategorySchema.shape.order,
  isPublic: ArticleCategorySchema.shape.is_public,
  articleCount: z.number().int().nonnegative(),
});

export const GetArticleCategoriesQueryParamsSchema = z.object({
  query: z.string().optional(),
  type: ArticleCategoryTypeSchema.optional(),
  brandEnum: BrandEnumSchema.optional(),
  isPublic: z.preprocess((value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }, z.boolean().optional()),
  sort: ArticleCategorySortSchema.optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .refine((v) => [25, 50, 100, 200].includes(v))
    .default(50),
});

export const GetArticleCategoriesResponseSchema = z.object({
  items: z.array(ArticleCategoryItemResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int(),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  count: z.number().int().nonnegative(),
});

export const DeleteArticleCategoryResponseSchema = z.object({
  message: z.string(),
});

export type ArticleCategoryType = z.infer<typeof ArticleCategoryTypeSchema>;
export type ArticleCategorySort = z.infer<typeof ArticleCategorySortSchema>;
export type ArticleCategory = z.infer<typeof ArticleCategorySchema>;
export type ArticleCategoryMapping = z.infer<typeof ArticleCategoryMappingSchema>;
export type ArticleCategoryResponseItem = z.infer<typeof ArticleCategoryItemResponseSchema>;
export type GetArticleCategoriesQueryParams = z.infer<typeof GetArticleCategoriesQueryParamsSchema>;
export type GetArticleCategoriesResponse = z.infer<typeof GetArticleCategoriesResponseSchema>;
export type DeleteArticleCategoryResponse = z.infer<typeof DeleteArticleCategoryResponseSchema>;
```

There is no separate hand-written `src/types/api/article-category.type.ts` file in the shipped implementation — every type is Zod-inferred from the schema file above and consumed either directly from there (Route Handlers) or from the generated `src/lib/api/types.gen.ts` (client components), per the OpenAPI-first pipeline. `ARTICLE_CATEGORY_TYPE_LABELS`, `PUBLISH_STATUS_LABELS`, and related badge-class maps live in `src/app/(private)/article-categories/_constants/article-category.constants.ts` instead.

## Permissions

Not modeled as a data entity, but load-bearing for FR-008/FR-009: `src/types/permission.type.ts` defines `Permission.ArticleCategoriesView`, `ArticleCategoriesCreate`, `ArticleCategoriesEdit`, `ArticleCategoriesDelete`. `src/constants/permission.constants.ts` maps `/article-categories` → `View`, `/article-categories/create` → `Create`, `/article-categories/:id/edit` → `Edit` in `PAGE_PERMISSIONS`, and grants `View` to Headquarter/Manager/Staff/Observer (System implicitly has everything) and `Create`/`Edit`/`Delete` to Headquarter only in `ROLE_PERMISSIONS`. Trainer has no article-category permissions at all (not listed in spec.md's role set for this screen).
