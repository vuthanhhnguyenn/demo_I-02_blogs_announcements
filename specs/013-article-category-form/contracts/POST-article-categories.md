# Contract: POST /api/crm/article-categories

**Phase 1 mock** — `src/app/api/crm/article-categories/route.ts` (new `POST` export alongside the existing `GET`)
**Phase 2 real** — `POST {BACKEND_BASE}/crm/article-categories` (not yet published)

---

## Request

```
POST /api/crm/article-categories
Content-Type: application/json
```

### Body (`CreateArticleCategoryBody`)

```json
{
  "name": "トレーニング",
  "description": "筋トレ・有酸素運動など一般的なトレーニング記事",
  "type": "blog",
  "brandEnum": "joyfit",
  "order": 1,
  "isPublic": true
}
```

| Field         | Type      | Required | Notes                                                               |
| ------------- | --------- | -------- | ------------------------------------------------------------------- |
| `name`        | `string`  | Yes      | Min length 1                                                        |
| `description` | `string`  | No       | Defaults to `''`                                                    |
| `type`        | `string`  | Yes      | `'notice' \| 'blog'`                                                |
| `brandEnum`   | `string`  | Yes      | One of `joyfit \| joyfit24 \| joyfit_yoga \| joyfit_plus \| fit365` |
| `order`       | `number`  | No       | Int, 1–999, defaults to 1                                           |
| `isPublic`    | `boolean` | No       | Defaults to `true`                                                  |

---

## Responses

### 200 OK (`ArticleCategoryItemResponseSchema` — no wrapper)

```json
{
  "id": "CAT-031",
  "name": "トレーニング",
  "description": "筋トレ・有酸素運動など一般的なトレーニング記事",
  "type": "blog",
  "brandEnum": "joyfit",
  "order": 1,
  "isPublic": true,
  "articleCount": 0
}
```

### 400 Bad Request

```json
{ "error": "カテゴリ名を入力してください。, 種別を選択してください。" }
```

Returned when Zod validation fails (concatenated issue messages, matching the existing `GET`/`DELETE` handlers' error format).

### 500 Internal Server Error

```json
{ "error": "カテゴリの作成に失敗しました" }
```

---

## Behavior (mock implementation)

1. Parse the JSON body and validate against `CreateArticleCategoryBodySchema`. On failure, return 400 with concatenated issue messages.
2. Call `db.articleCategories.create(validationResult.data)` — generates the next `CAT-###` id (see `data-model.md`), stores the row.
3. Return the newly created category enriched via `enrichArticleCategory(category, 0)` — a brand-new category always starts with `articleCount: 0` (no `articleCategoryMappings` rows reference it yet).
4. Return 200 with the enriched category object directly (no `{ message, category }` wrapper).

**Explicitly out of scope** (see `research.md` Decision 7): server-side role/permission enforcement. Access control for this endpoint is enforced entirely at the route level (`proxy.ts` redirecting non-Headquarter/System roles to `/403` before the create page — and therefore any call to this endpoint — can ever render), consistent with every other mock Route Handler in this codebase.
