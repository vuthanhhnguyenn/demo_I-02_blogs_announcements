# GET /api/crm/banners/{id}

Retrieve a single banner by ID for edit form pre-fill.

## Request

**Method**: `GET`
**Path**: `/api/crm/banners/{id}`

### Path Parameters

```ts
{
  id: string; // e.g. "BN-001"
}
```

## Response

### 200 — OK

Response body is the `BannerItemResponse` object directly (**not** wrapped in a `banner` key):

```ts
{
  id: string;
  order: number;
  imageUrl: string;
  title: string;
  brandEnum: Array<'joyfit' | 'joyfit24' | 'joyfit_yoga' | 'joyfit_plus' | 'fit365'>;
  linkUrl: string | null;
  periodStart: string; // YYYY/MM/DD
  periodEnd: string; // YYYY/MM/DD, '' if no end date
  webEnabled: boolean;
  mobileEnabled: boolean;
  status: 'published' | 'out_of_period' | 'draft';
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

- Data source: `db.banners` in `_mock-db/tables/banner.table.ts`.
- Uses existing `getById()` method; enriches with `brandEnum` from the many-to-many brand map
  table (`getBrandEnum(id)`) and computed `status` via `enrichBanner`.

## Test Cases

1. Existing id returns 200 with the full enriched banner object.
2. Unknown id returns 404.
