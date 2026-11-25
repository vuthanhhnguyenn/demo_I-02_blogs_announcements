# Contract: PATCH /api/crm/article-categories/{id}

**Phase 1 mock** — `src/app/api/crm/article-categories/[id]/route.ts` (new `PATCH` export alongside the existing `DELETE`)
**Phase 2 real** — `PATCH {BACKEND_BASE}/crm/article-categories/{id}` (not yet published)

---

## Request

```
PATCH /api/crm/article-categories/{id}
Content-Type: application/json
```

### Path Parameters

| Parameter | Type     | Required | Description                   |
| --------- | -------- | -------- | ----------------------------- |
| `id`      | `string` | Yes      | Article category ID to update |

### Body (`UpdateArticleCategoryBody` — all fields optional; the form always sends all six)

```json
{
  "name": "トレーニング（更新）",
  "description": "筋トレ・有酸素運動など一般的なトレーニング記事",
  "type": "blog",
  "brandEnum": "joyfit24",
  "order": 2,
  "isPublic": false
}
```

---

## Responses

### 200 OK (`ArticleCategoryItemResponseSchema` — no wrapper)

```json
{
  "id": "CAT-004",
  "name": "トレーニング（更新）",
  "description": "筋トレ・有酸素運動など一般的なトレーニング記事",
  "type": "blog",
  "brandEnum": "joyfit24",
  "order": 2,
  "isPublic": false,
  "articleCount": 24
}
```

`articleCount` is unaffected by this update — it is still derived from `articleCategoryMappings`, which this endpoint never touches (per spec Edge Cases: changing `type`/`brandEnum` on a category with linked articles does not re-validate or reassign them).

### 400 Bad Request

```json
{ "error": "表示順は1〜999の範囲で入力してください。" }
```

### 404 Not Found

```json
{ "error": "カテゴリが見つかりません" }
```

### 500 Internal Server Error

```json
{ "error": "カテゴリの更新に失敗しました" }
```

---

## Behavior (mock implementation)

1. Parse the JSON body and validate against `UpdateArticleCategoryBodySchema`. On failure, return 400.
2. Call `db.articleCategories.update(id, validationResult.data)`. If it returns `undefined` (no matching row), return 404.
3. Return the updated category enriched via `enrichArticleCategory(category, db.articleCategoryMappings.countByCategoryId(id))`.
4. Return 200 with the enriched category object directly (no `{ message, category }` wrapper).

**Explicitly out of scope** (see `research.md` Decisions 7 & 8): server-side role/permission enforcement, and uniqueness checks on `name` or `order`.
