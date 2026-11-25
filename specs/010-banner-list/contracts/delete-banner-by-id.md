# DELETE /api/crm/banners/{id}

Delete a banner from list scope (hard delete in Phase 1).

## Request

**Method**: `DELETE`  
**Path**: `/api/crm/banners/{id}`

### Path Parameters

```ts
{
  id: string;
}
```

## Response

### 200 — Deleted

```ts
{
  message: 'バナーを削除しました';
  id: string;
}
```

### 404 — Not Found

```ts
{
  error: 'バナーが見つかりません';
}
```

### 500 — Internal Server Error

```ts
{
  error: string; // e.g. 'バナーの削除に失敗しました'
}
```

## Mock Implementation Notes

- Removes record from in-memory `db.banners`.
- Re-normalizes remaining order sequence to contiguous `1..N`.
- UI displays generic failure toast on non-2xx response.

## Test Cases

1. Existing id returns 200 and item no longer appears in list.
2. Unknown id returns 404.
3. Delete failure path returns 500 with generic error payload.
