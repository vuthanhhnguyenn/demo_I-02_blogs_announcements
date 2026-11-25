# Contract: DELETE /api/crm/article-categories/{id}

**Phase 1 mock** — `src/app/api/crm/article-categories/[id]/route.ts`
**Phase 2 real** — `DELETE {BACKEND_BASE}/crm/article-categories/{id}` (not yet published)

---

## Request

```
DELETE /api/crm/article-categories/{id}
```

### Path Parameters

| Parameter | Type     | Required | Description           |
| --------- | -------- | -------- | --------------------- |
| `id`      | `string` | Yes      | Category ID to delete |

No request body (see `research.md` Decision 7 — no reason field, unlike staff delete).

---

## Responses

### 200 OK

```json
{ "message": "カテゴリを削除しました" }
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

1. Find the category by `id` in `db.articleCategories`.
2. If not found, return 404.
3. Reassign all `db.articleCategoryMappings` rows where `category_id === id` to the seeded "Unclassified" category (`CAT-000`), per `research.md` Decision 8. If `id === 'CAT-000'` itself, refuse the delete (the Unclassified fallback category cannot be removed) — return 400.
4. Remove the category record from the mock store.
5. Return the success message.

**Reassignment detail** (see `research.md` Decision 8): this is a real, working side-effect — not a UI-only promise. The `articleCount` shown in the pre-delete confirmation dialog comes from `ArticleCategoryResponseItem.articleCount` (computed from `db.articleCategoryMappings`, same as the list endpoint), and after deletion those same mapping rows are updated in place (`category_id` changed to `'CAT-000'`) rather than removed. The Unclassified category's own `articleCount` increases accordingly on the next list fetch.

**Explicitly out of scope** (see `research.md` Decision 7): server-side role/permission enforcement. This endpoint does not check the caller's role or permissions; access control is enforced client-side only — the row's "削除" action is gated by `Permission.ArticleCategoriesDelete` via `DataTableRowActions`, consistent with every other mock Route Handler in this codebase having no server-side authorization.
