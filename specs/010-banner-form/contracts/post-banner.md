# POST /api/crm/banners

Create a new banner record.

## Request

**Method**: `POST`
**Path**: `/api/crm/banners`
**Content-Type**: `application/json`

### Request Body

```ts
{
  title: string;                        // タイトル (required, max 255)
  imageUrl: string;                     // 画像URL (required, non-empty)
  brandEnum: Array<'joyfit' | 'joyfit24' | 'joyfit_yoga' | 'joyfit_plus' | 'fit365'>; // required, min 1 (multi-select)
  linkUrl?: string | null;              // リンクURL (optional, valid URL or null)
  periodStart: string;                  // 掲載開始日 (YYYY/MM/DD)
  periodEnd?: string | null;            // 掲載終了日 (YYYY/MM/DD), optional/null = no end date
  webEnabled: boolean;                  // WEB表示 (default: true)
  mobileEnabled: boolean;               // モバイル表示 (default: true)
  order?: number;                       // 表示順 (optional)
}
```

## Response

### 200 — Created

```ts
{
  message: 'バナーを登録しました',
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

### 500 — Internal Server Error

```ts
{
  error: string;
}
```

## Mock Implementation Notes

- Generate a new ID (`BN-XXX`), auto-assign `order` as `max(order) + 1` if not provided.
- Add the new banner row to `db.banners` in-memory store; write the `brandEnum` array into the
  separate many-to-many brand map table (`setByBannerId`), deduping repeated values.
- Return the full enriched banner object (with `brandEnum` and computed `status`) in the response.

## Test Cases

1. **Happy path**: Valid payload → 200 with success message + banner data.
2. **Missing required field**: Omit `title` → 400 with validation error.
3. **Invalid enum value**: `brandEnum: ['invalid']` → 400 with validation error.
4. **Empty brand array**: `brandEnum: []` → 400 with validation error (min 1).
5. **Invalid URL**: `imageUrl` empty string → 400 with validation error.
