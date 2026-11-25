# Contract: GET /api/crm/article-categories/{id}

**Phase 1 mock** — `src/app/api/crm/article-categories/[id]/route.ts` (new `GET` export alongside the existing `DELETE`)
**Phase 2 real** — `GET {BACKEND_BASE}/crm/article-categories/{id}` (not yet published)

---

## Request

```
GET /api/crm/article-categories/{id}
```

### Path Parameters

| Parameter | Type     | Required | Description                  |
| --------- | -------- | -------- | ---------------------------- |
| `id`      | `string` | Yes      | Article category ID to fetch |

No request body.

---

## Responses

### 200 OK (`ArticleCategoryItemResponseSchema` — no wrapper; no separate response schema is defined for this endpoint)

```json
{
  "id": "CAT-004",
  "name": "トレーニング",
  "description": "筋トレ・有酸素運動など一般的なトレーニング記事",
  "type": "blog",
  "brandEnum": "joyfit",
  "order": 1,
  "isPublic": true,
  "articleCount": 24
}
```

### 404 Not Found

```json
{ "error": "カテゴリが見つかりません" }
```

### 500 Internal Server Error

```json
{ "error": "Internal server error" }
```

---

## Behavior (mock implementation)

1. Look up `db.articleCategories.getById(id)`.
2. If not found, return 404 (same message the existing `DELETE` handler already uses for the same case).
3. Enrich via `enrichArticleCategory(category, db.articleCategoryMappings.countByCategoryId(id))` — same helper the list `GET` and `DELETE` handlers already use — and return it directly (200).

## Consumer

`src/app/(private)/article-categories/[id]/edit/page.tsx` calls the generated `getCrmArticleCategoriesByIdOptions({ path: { id } })` via `useQuery`, then maps the result to form values with `articleCategoryDetailToFormValues()` (see `data-model.md` / `article-category-form.mapper.ts`) to pre-fill `<ArticleCategoryForm mode="edit" defaultValues={...} categoryId={id} />`, following the exact pattern already shipped in `src/app/(private)/banners/[id]/edit/page.tsx`.
