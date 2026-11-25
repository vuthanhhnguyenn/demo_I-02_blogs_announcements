# PATCH /api/crm/banners/display-order

Persist display-order changes from banner order-management dialog.

## Request

**Method**: `PATCH`  
**Path**: `/api/crm/banners/display-order`  
**Content-Type**: `application/json`

### Request Body

```ts
{
  banners: Array<{
    id: string;
    order: number; // positive integer; non-positive values fail validation (400)
  }>; // min 1 item
}
```

## Response

### 200 — Updated

```ts
{
  message: 'バナーの並び順を更新しました';
  banners: Array<{
    id: string;
    order: number;
  }>;
}
```

### 400 — Validation Error

```ts
{
  error: string; // invalid id/order payload
}
```

### 404 — Not Found

```ts
{
  error: 'バナーが見つかりません'; // returned when any submitted id does not exist
}
```

### 500 — Internal Server Error

```ts
{
  error: string;
}
```

## Mock Implementation Notes

- Endpoint receives staged dialog state on `保存する`.
- `PatchBannersDisplayOrderRequestSchema` requires each item's `order` to be a positive integer via `z.coerce.number().int().positive()`; non-positive or non-numeric values fail validation and return 400 before reaching the DB layer (no silent sanitization).
- `db.banners.updateDisplayOrder` treats each submitted `order` as a sort key: it re-sorts the **full** banner list by the submitted orders (falling back to each banner's existing order for ids not included in the payload), then re-indexes the result into a contiguous `1..N` sequence.
- If any submitted `id` does not exist, `updateDisplayOrder` returns `null` and the route responds with 404 (`バナーが見つかりません`).
- Returned `banners` array reflects the final saved order (all banners, not just the ones submitted) to support immediate client sync.

## Test Cases

1. Valid reordered payload updates sequence and returns the final contiguous order values for all banners.
2. Payload with an unknown id returns 404.
3. Payload with a non-positive or non-numeric `order` value returns 400 (schema validation).
