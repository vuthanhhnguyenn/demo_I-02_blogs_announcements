# Contract: GET /api/crm/article-categories

**Mock implementation** — `src/app/api/crm/article-categories/route.ts`
**Real backend** — not yet published

---

## Request

```
GET /api/crm/article-categories
```

### Query Parameters

| Parameter   | Type      | Required | Default | Validation                                                                                                        |
| ----------- | --------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `query`     | `string`  | No       | —       | Partial match on `name` or `description` (case-insensitive)                                                       |
| `type`      | `string`  | No       | —       | One of: `notice`, `blog`                                                                                          |
| `brandEnum` | `string`  | No       | —       | One of: `joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365` (`BrandEnum`, reused from `brand.schema.ts`) |
| `isPublic`  | `boolean` | No       | —       | `true` or `false` (accepted as the literal strings `"true"`/`"false"` on the wire)                                |
| `sort`      | `string`  | No       | —       | One of: `name`, `order`, `article_count` (`article_count` is computed — see below)                                |
| `order`     | `string`  | No       | `asc`   | One of: `asc`, `desc`; sort direction, applies whether or not `sort` is provided                                  |
| `page`      | `integer` | No       | `1`     | min: 1                                                                                                            |
| `limit`     | `integer` | No       | `50`    | One of: 25, 50, 100, 200                                                                                          |

---

## Responses

### 200 OK

```json
{
  "items": [
    {
      "id": "CAT-001",
      "name": "キャンペーン・イベント",
      "description": "入会キャンペーンや店舗イベント情報",
      "type": "notice",
      "brandEnum": "joyfit",
      "order": 1,
      "isPublic": true,
      "articleCount": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalItems": 10,
    "totalPages": 1
  },
  "count": 30
}
```

`count` is the total number of categories in the system regardless of the current filters (used for the page header's "N件" badge); `pagination.totalItems` is the count matching the current filters (used for the "showing X–Y of N" summary and empty-state logic).

### 400 Bad Request

```json
{ "error": "limit must be one of 25, 50, 100, 200" }
```

### 500 Internal Server Error

```json
{ "error": "カテゴリ一覧の取得に失敗しました" }
```

---

## Filtering Logic (mock implementation)

1. Enrich each stored `ArticleCategory` row into an `ArticleCategoryResponseItem` via `enrichArticleCategory()`: rename `is_public`/`brand_enum` to `isPublic`/`brandEnum`, and compute `articleCount` by counting `db.articleCategoryMappings` rows where `category_id` equals the category's `id`. There is no brand-name resolution step — `brandEnum` is returned as-is and labeled client-side.
2. Apply `query`: keep records where `name` or `description` contains the term, case-insensitive.
3. Apply `type`: keep records where `type === type`.
4. Apply `brandEnum`: keep records where `brandEnum === brandEnum`.
5. Apply `isPublic`: keep records where `isPublic === isPublic`.
6. Sort: if `sort` is provided, sort by that field (`name` via locale-aware compare, `order` numerically, or the computed `articleCount`), ascending or descending per `order`. If `sort` is omitted, no sort is applied (natural seed order) — note `order` (direction) still defaults to `"asc"` even when unused.
7. Paginate: skip `(page - 1) * limit`, take `limit`, against the **filtered** count for `pagination.totalItems`/`totalPages`.
8. Return `{ items, pagination: { page, limit, totalItems, totalPages }, count }`, where `count` is the total row count before any filtering.
