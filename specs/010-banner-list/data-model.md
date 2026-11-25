# Data Model: Banner List Management (010)

> Phase 1 design output — entities, validations, and state transitions for list/delete/reorder scope.
>
> **Note:** Brand enums are standardized under the Brands module. `BrandEnumSchema` in
> `src/app/api/_schemas/brand.schema.ts` defines all selectable brand codes (`joyfit`, `joyfit24`,
> `joyfit_yoga`, `joyfit_plus`, `fit365`) — mirrored on the client as `BrandEnum` in
> `src/lib/api/types.gen.ts`. There is no "all brands" enum member; a banner that targets every
> brand simply lists all five values. A banner can be associated with **multiple** brands; the
> list/detail field is `brandEnum: BrandEnum[]`, rendered as multiple `BrandBadge`s.

## Entities

### Banner (BannerItemResponse)

Primary list-row entity for WEB/mobile promotional display.

| Field           | Type             | Required | Constraints                                                                                                | Notes                                       |
| --------------- | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `id`            | `string`         | Yes      | unique                                                                                                     | e.g. `BN-001`                               |
| `order`         | `number`         | Yes      | integer, unique in list, target range `1..N`                                                               | display order                               |
| `imageUrl`      | `string`         | Yes      | URL string                                                                                                 | fallback UI when load fails                 |
| `title`         | `string`         | Yes      | max 255                                                                                                    | search target (substring, case-insensitive) |
| `brandEnum`     | `BrandEnum[]`    | Yes      | Values from `BrandEnumSchema` / `BrandEnum` (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`) | rendered via `BrandBadge`, one per entry    |
| `linkUrl`       | `string \| null` | No       | URL string or null                                                                                         | table displays truncated text               |
| `periodStart`   | `string`         | Yes      | date string (`YYYY/MM/DD`)                                                                                 |                                             |
| `periodEnd`     | `string`         | Yes      | date string (`YYYY/MM/DD`), `''` if no end date                                                            |                                             |
| `webEnabled`    | `boolean`        | Yes      | —                                                                                                          | ON/OFF badge with icon                      |
| `mobileEnabled` | `boolean`        | Yes      | —                                                                                                          | ON/OFF badge with icon                      |
| `status`        | `enum`           | Yes      | `published` \| `out_of_period` \| `draft`                                                                  | UI label: 公開中/期間外/非公開              |

### BannerListQuery

Query model for list fetch and local URL state (`GetBannersQueryParams`).

| Field       | Type                | Default | Notes                                                                                                                                                                           |
| ----------- | ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page`      | `number`            | `1`     | resets to 1 on filter/search/sort/pageSize change                                                                                                                               |
| `limit`     | `number`            | `50`    | allowed: `25/50/100/200`                                                                                                                                                        |
| `query`     | `string`            | `''`    | title substring search (case-insensitive)                                                                                                                                       |
| `brandEnum` | `BrandEnum \| null` | `null`  | detailed filter; single `BrandEnum` value (`joyfit`\|`joyfit24`\|`joyfit_yoga`\|`joyfit_plus`\|`fit365`), not multi-select; matches banners whose `brandEnum` array contains it |
| `channel`   | `enum \| null`      | `null`  | `web` \| `mobile`                                                                                                                                                               |
| `status`    | `enum \| null`      | `null`  | `published` \| `out_of_period` \| `draft`                                                                                                                                       |
| `sort`      | `enum`              | `order` | sortable: `order`, `title`, `status`                                                                                                                                            |
| `order`     | `enum`              | `asc`   | `asc` \| `desc`                                                                                                                                                                 |

### BannerDisplayOrderDraft

Modal-local staged state for reordering (`DraftItem[]` in `banner-order-dialog.tsx`).

| Field           | Type             | Notes                                                                  |
| --------------- | ---------------- | ---------------------------------------------------------------------- |
| `id`            | `string`         | banner id                                                              |
| `title`         | `string`         | for row display                                                        |
| `imageUrl`      | `string \| null` | for thumbnail preview                                                  |
| `order`         | `string`         | staged input value (string, editable); not committed until save        |
| `originalOrder` | `number`         | snapshot of the order at dialog-open time, used to derive `hasChanges` |

`hasChanges` is derived by comparing each item's `order` (as string) against its `originalOrder`.

### DeleteBannerCommand

| Field | Type     | Notes            |
| ----- | -------- | ---------------- |
| `id`  | `string` | target banner id |

### UpdateBannerDisplayOrderCommand

| Field     | Type                                   | Constraints                                                   |
| --------- | -------------------------------------- | ------------------------------------------------------------- |
| `banners` | `Array<{ id: string; order: number }>` | full or partial set; final sequence resolves to unique `1..N` |

## Validation Rules

### List Query

- `page >= 1`
- `limit` must be one of `25,50,100,200`
- `sort` must be one of `order,title,status`
- `order` must be `asc|desc`
- Unknown filter enum values return 400 in API layer

### Delete

- `id` required
- 404 when record not found

### Reorder Save

- Each payload item requires a non-empty `id` and a positive integer `order` (`z.coerce.number().int().positive()`); invalid values are rejected with 400, not silently sanitized
- Server treats submitted `order` values as sort keys against the full banner list, then re-indexes the result into a contiguous `1..N` sequence
- Unknown `id` values in the payload cause the whole request to fail with 404

## State Transitions

### List

`Load page` -> `Fetch list` -> `Render rows` -> (`search/filter/sort/page`) -> `Refetch with query` -> `Render updated rows`

### Delete

`Row action: 削除` -> `AlertDialog open` -> `Confirm 削除する` -> `DELETE API` -> `Success toast + query invalidation` -> `Row removed`

### Reorder

`Click 並び順を編集` -> `Dialog opens with snapshot` -> `Up/Down or manual input (draft only)` ->

- `キャンセル` -> close + discard draft
- `保存する` -> normalize draft -> `PATCH display-order API` -> close + success toast + list refetch

## Zod Schema Plan

- `src/app/api/_schemas/banner.schema.ts`
  - `BannerSchema` (persisted row shape)
  - `BannerBrandMapEntrySchema` (many-to-many banner ↔ brand row)
  - `GetBannersQueryParamsSchema`
  - `BannerItemResponseSchema` (API-facing shape, includes enriched `brandEnum` + computed `status`)
  - `GetBannersResponseSchema` — `{ items: BannerItemResponse[]; pagination }`
  - `DeleteBannerResponseSchema`
  - `PatchBannersDisplayOrderRequestSchema`
  - `PatchBannersDisplayOrderResponseSchema`

These schemas are used by route handlers and OpenAPI registration, then consumed by generated client types/hook options.
