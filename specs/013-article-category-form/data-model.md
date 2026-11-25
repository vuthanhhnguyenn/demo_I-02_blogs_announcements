# Phase 1 Data Model: Article Category Form (Notice & Blog Management)

**Feature**: `013-article-category-form`
**Spec**: [spec.md](./spec.md)

## Entity: ArticleCategory (unchanged — owned by `013-article-category-master`)

This feature does not modify the entity's shape. Reproduced here for reference only; the authoritative definition lives in `src/app/api/_schemas/article-category.schema.ts`.

| Field         | Type                                                                   | Required | Notes                                                                           |
| ------------- | ---------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `id`          | `string`                                                               | —        | `CAT-###`, server-generated on create, immutable on edit                        |
| `name`        | `string` (min 1)                                                       | ✓        | カテゴリ名                                                                      |
| `description` | `string`                                                               |          | 説明 (empty string allowed — not `null`, to match the existing schema)          |
| `type`        | `'notice' \| 'blog'`                                                   | ✓        | 種別                                                                            |
| `brand_enum`  | `'joyfit' \| 'joyfit24' \| 'joyfit_yoga' \| 'joyfit_plus' \| 'fit365'` | ✓        | 紐付けブランド — exactly one value, no "all brands" option (spec FR-001/FR-007) |
| `order`       | `number` (int, ≥ 0)                                                    |          | 表示順, 1–999 per spec; defaults to 1 in the form                               |
| `is_public`   | `boolean`                                                              |          | 公開状況; defaults to `true` (公開) in the form                                 |

Derived, not edited by this form: `articleCount` (computed from `articleCategoryMappings`, unaffected by create/edit).

---

## Form Values (new — this feature)

`ArticleCategoryFormSchema` (`src/app/(private)/article-categories/_schemas/article-category-form.schema.ts`) describes what the UI controls produce, validated on submit:

| Field         | Zod shape                                            | Validation message (on empty/invalid)      |
| ------------- | ---------------------------------------------------- | ------------------------------------------ |
| `name`        | `z.string().min(1)`                                  | "カテゴリ名を入力してください。"           |
| `description` | `z.string().default('')`                             | — (optional, no message)                   |
| `type`        | `z.enum(ArticleCategoryType)`                        | "種別を選択してください。"                 |
| `brandEnum`   | `z.enum(BrandEnum)`                                  | "ブランドを選択してください。"             |
| `order`       | `z.coerce.number().int().min(1).max(999).default(1)` | "表示順は1〜999の範囲で入力してください。" |
| `isPublic`    | `z.boolean().default(true)`                          | —                                          |

```typescript
export type ArticleCategoryFormValues = z.input<typeof ArticleCategoryFormSchema>;
export type ArticleCategoryFormSubmitValues = z.output<typeof ArticleCategoryFormSchema>;

export const emptyArticleCategoryFormValues: ArticleCategoryFormValues = {
  name: '',
  description: '',
  type: undefined,
  brandEnum: undefined,
  order: 1,
  isPublic: true,
};
```

This mirrors `BannerFormSchema`/`BannerFormValues`/`emptyBannerFormValues` in shape and intent (see `research.md` Decision 2), simplified to this form's six fields.

---

## Request/Response Bodies (new — this feature)

Added to `src/app/api/_schemas/article-category.schema.ts`, following the `Create*/Update*BodySchema` + `Create*/Update*ResponseSchema` naming already used by `banner.schema.ts`:

```typescript
export const CreateArticleCategoryBodySchema = z
  .object({
    name: ArticleCategorySchema.shape.name,
    description: ArticleCategorySchema.shape.description.default(''),
    type: ArticleCategoryTypeSchema,
    brandEnum: BrandEnumSchema,
    order: z.number().int().min(1).max(999).default(1),
    isPublic: z.boolean().default(true),
  })
  .openapi({ title: 'CreateArticleCategoryBody' });

export const UpdateArticleCategoryBodySchema = CreateArticleCategoryBodySchema.partial().openapi({
  title: 'UpdateArticleCategoryBody',
});
```

`UpdateArticleCategoryBodySchema` is `.partial()` (all fields optional on the wire) to match `UpdateBannerBodySchema`'s precedent, even though the form itself always submits every field — this keeps the contract flexible for any future partial-update caller without the form needing to change.

No new response schemas are introduced. All three endpoints return `ArticleCategoryItemResponseSchema` directly — the same schema the list endpoint already returns per item — with no `{ message, category }` wrapper:

```typescript
// POST   /crm/article-categories        → ArticleCategoryItemResponseSchema
// GET    /crm/article-categories/{id}   → ArticleCategoryItemResponseSchema
// PATCH  /crm/article-categories/{id}   → ArticleCategoryItemResponseSchema
```

---

## Mock Table Extensions (new methods on the existing `articleCategories` table)

`src/app/api/_mock-db/tables/article-category.table.ts` gains two methods on the already-existing `articleCategories` object (alongside `getList`/`getById`/`delete`):

```typescript
create(data: CreateArticleCategoryBody): ArticleCategory {
  this._seed();
  const ids = this._rows
    .map((c) => Number(c.id.replace('CAT-', '')))
    .filter((n) => !Number.isNaN(n));
  const nextNumber = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  const category: ArticleCategory = {
    id: `CAT-${String(nextNumber).padStart(3, '0')}`,
    name: data.name,
    description: data.description ?? '',
    type: data.type,
    brand_enum: data.brandEnum,
    order: data.order ?? 1,
    is_public: data.isPublic ?? true,
  };
  this._rows.push(category);
  return category;
}

update(id: string, data: UpdateArticleCategoryBody): ArticleCategory | undefined {
  this._seed();
  const index = this._rows.findIndex((c) => c.id === id);
  if (index === -1) return undefined;
  const current = this._rows[index];
  const updated: ArticleCategory = {
    ...current,
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.brandEnum !== undefined && { brand_enum: data.brandEnum }),
    ...(data.order !== undefined && { order: data.order }),
    ...(data.isPublic !== undefined && { is_public: data.isPublic }),
  };
  this._rows[index] = updated;
  return updated;
}
```

ID generation mirrors `banner.table.ts`'s `add()` (`Math.max` over existing numeric suffixes + 1) — see `research.md` Decision 6.

No changes to `articleCategoryMappings` — create/edit never touch article-to-category links (that only happens on delete, per 013).
