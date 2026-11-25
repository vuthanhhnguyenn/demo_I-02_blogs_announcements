# GET /api/crm/banners

Retrieve banner list for management table with search/filter/sort/pagination.

## Request

**Method**: `GET`  
**Path**: `/api/crm/banners`

### Query Parameters

```ts
{
  page?: number;                 // default 1, >=1
  limit?: 25 | 50 | 100 | 200;   // default 50
  query?: string;                // title substring (case-insensitive)
  brandEnum?: 'joyfit' | 'joyfit24' | 'joyfit_yoga' | 'joyfit_plus' | 'fit365'; // single value, not an array
  channel?: 'web' | 'mobile';
  status?: 'published' | 'out_of_period' | 'draft';
  sort?: 'order' | 'title' | 'status';   // default 'order'
  order?: 'asc' | 'desc';                // default 'asc'
}
```

## Response

### 200 — OK

```ts
{
  items: Array<{
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
  }>;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  }
}
```

### 400 — Validation Error

```ts
{
  error: string; // invalid query params
}
```

### 500 — Internal Server Error

```ts
{
  error: string;
}
```

## Mock Implementation Notes

- Data source: `db.banners` in `_mock-db/tables/banner.table.ts`; brand associations live in a
  separate many-to-many map table (`_brandMap`, keyed by `{ banner_id, brand_enum }`) and are
  enriched onto each row via `getBrandEnum(bannerId)` + `enrichBanner`.
- Filtering order: search -> detailed filters (brandEnum/channel/status) -> sort -> paginate.
- `brandEnum` filter matches banners whose `brandEnum` array contains the given value (`.some()`).
- `channel=web` includes `webEnabled===true`; `channel=mobile` includes `mobileEnabled===true`.

## Test Cases

1. Default query returns first page with `limit=50` sorted by `order asc`.
2. Combined filters (`brandEnum + channel + status`) return intersection only.
3. `query` filters title by case-insensitive substring.
4. Invalid `sort` or `limit` returns 400.
