# PATCH /api/crm/banners/{id}

Update an existing banner record.

## Request

**Method**: `PATCH`
**Path**: `/api/crm/banners/{id}`
**Content-Type**: `application/json`

### Path Parameters

| Parameter | Type     | Required | Description                |
| --------- | -------- | -------- | -------------------------- |
| `id`      | `string` | Yes      | Banner ID (e.g., `BN-001`) |

### Request Body

All fields optional — only provided fields are updated.

```ts
{
  title?: string;                        // タイトル (max 255)
  imageUrl?: string;                     // 画像URL (non-empty)
  brandEnum?: Array<'joyfit' | 'joyfit24' | 'joyfit_yoga' | 'joyfit_plus' | 'fit365'>; // min 1 if provided (multi-select)
  linkUrl?: string | null;               // リンクURL (valid URL or null)
  periodStart?: string;                  // 掲載開始日 (YYYY/MM/DD)
  periodEnd?: string | null;             // 掲載終了日 (YYYY/MM/DD) or null
  webEnabled?: boolean;                  // WEB表示
  mobileEnabled?: boolean;               // モバイル表示
  order?: number;                        // 表示順 (optional)
}
```

## Response

### 200 — Updated

```ts
{
  message: 'バナーの変更を保存しました',
  banner: {
    id: string;
    order: number;
    imageUrl: string;
    title: string;
    brandEnum: Array<'joyfit' | 'joyfit24' | 'joyfit_yoga' | 'joyfit_plus' | 'fit365'>;
    linkUrl: string | null;
    periodStart: string;
    periodEnd: string; // '' if no end date
    webEnabled: boolean;
    mobileEnabled: boolean;
    status: 'published' | 'out_of_period' | 'draft';
  };
}
```

### 400 — Validation Error

```ts
{
  error: string; // Zod issue messages
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
  error: string;
}
```

## Mock Implementation Notes

- Look up by ID in `db.banners` in-memory store.
- Merge provided fields with existing record; if `brandEnum` is provided, replace the brand map
  rows for this banner (`setByBannerId`), otherwise keep the existing associations.
- Return the full updated, enriched banner object (`brandEnum` + computed `status`).

## Test Cases

1. **Happy path**: Valid partial payload → 200 with updated data.
2. **Not found**: Non-existent ID → 404.
3. **Full update**: All fields provided → 200 with complete update.
