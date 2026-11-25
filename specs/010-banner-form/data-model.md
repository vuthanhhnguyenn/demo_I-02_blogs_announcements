# Data Model: Banner Form Management (010)

> Phase 1 design output — entities, fields, validation rules, and Zod schemas for create/edit form scope.
>
> **Note:** Brand data uses the shared `BrandEnum` (client: `src/lib/api/types.gen.ts`, generated
> from OpenAPI; server: `BrandEnumSchema` in `src/app/api/_schemas/brand.schema.ts`), with 5 real
> values — `joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`. There is **no** server-side
> "select all" enum member. "JOYFIT全体" is a **form-only UI convenience**
> (`BRAND_ALL_VALUE = 'ALL'` in `src/app/(private)/banners/_constants/banner.constants.ts`) that
> expands the form's `brandEnum` field to all 5 real `BrandEnum` values when selected; it is never
> itself sent to the API. A banner can be associated with **multiple** brands (many-to-many); the
> form field and API field are both named `brandEnum` and hold an array of real `BrandEnum` values.

## Entities

### BannerFormInput

The form-level entity representing create/edit input payload. Maps to `CreateBannerBody` /
`UpdateBannerBody` on submit.

| Field           | Type             | Required | Constraints                                                                      | Notes                                                                                                                                                                                                                      |
| --------------- | ---------------- | -------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`         | `string`         | Yes      | Max 255 chars                                                                    | Banner management label                                                                                                                                                                                                    |
| `imageUrl`      | `string`         | Yes      | Valid uploaded image                                                             | File upload via `useImageUpload` hook → presigned URL → public URL; thumbnail preview via `next/image`                                                                                                                     |
| `brandEnum`     | `BrandEnum[]`    | Yes      | Non-empty array of: `joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365` | `z.array(z.enum(BrandEnum))` in `banner-form.schema.ts`; multi-select. UI-only "JOYFIT全体" option (`BRAND_ALL_VALUE`) expands selection to all 5 values and renders as the sole checked option whenever all 5 are present |
| `linkUrl`       | `string \| null` | No       | URL string or null                                                               | Optional link destination                                                                                                                                                                                                  |
| `periodStart`   | `string`         | Yes      | Date string (`YYYY/MM/DD`)                                                       | Start of display period                                                                                                                                                                                                    |
| `periodEnd`     | `string \| null` | No       | Date string (`YYYY/MM/DD`) or null                                               | End of display period; null = no end date                                                                                                                                                                                  |
| `webEnabled`    | `boolean`        | Yes      | Default `true`                                                                   | Display on WEB channel                                                                                                                                                                                                     |
| `mobileEnabled` | `boolean`        | Yes      | Default `true`                                                                   | Display on mobile app channel                                                                                                                                                                                              |
| `order`         | `number`         | No       | Positive integer                                                                 | Auto-set server-side if absent; provided in edit pre-fill                                                                                                                                                                  |

### BannerItemResponse

The API-facing entity returned by list/detail/create/update endpoints. The form maps this shape
to `BannerFormInput` for edit pre-fill (`bannerDetailToFormValues`), and maps `BannerFormInput`
back to `CreateBannerBody`/`UpdateBannerBody` for submit.

| Field           | Type             | Required | Constraints                                                                              | Notes                                                           |
| --------------- | ---------------- | -------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `id`            | `string`         | Yes      | Unique                                                                                   | e.g. `BN-001` (auto-generated server-side)                      |
| `order`         | `number`         | Yes      | Integer, unique in list                                                                  | Auto-assigned (appends to end)                                  |
| `imageUrl`      | `string`         | Yes      | URL string                                                                               |                                                                 |
| `title`         | `string`         | Yes      | Max 255                                                                                  |                                                                 |
| `brandEnum`     | `BrandEnum[]`    | Yes      | Values from `BrandEnumSchema` (`joyfit`/`joyfit24`/`joyfit_yoga`/`joyfit_plus`/`fit365`) | Enriched server-side from the banner-brand map table            |
| `linkUrl`       | `string \| null` | No       | URL string or null                                                                       |                                                                 |
| `periodStart`   | `string`         | Yes      | Date string (`YYYY/MM/DD`)                                                               |                                                                 |
| `periodEnd`     | `string`         | Yes      | Date string (`YYYY/MM/DD`), `''` if no end                                               | Not nullable in the response — empty string means "no end date" |
| `webEnabled`    | `boolean`        | Yes      | —                                                                                        |                                                                 |
| `mobileEnabled` | `boolean`        | Yes      | —                                                                                        |                                                                 |
| `status`        | `enum`           | Yes      | `published` \| `out_of_period` \| `draft`                                                | Computed server-side from `periodStart`/`periodEnd`             |

### FormMode

```ts
type FormMode = 'create' | 'edit';
```

| Behaviour       | Create                  | Edit                          |
| --------------- | ----------------------- | ----------------------------- |
| Page title      | "バナー新規登録"        | "バナー編集"                  |
| Submit button   | "保存する"              | "保存する"                    |
| Success toast   | "バナーを登録しました"  | "バナーの変更を保存しました"  |
| API method      | `POST /api/crm/banners` | `PATCH /api/crm/banners/{id}` |
| Pre-fill source | None (empty defaults)   | `GET /api/crm/banners/{id}`   |

## Validation Rules

### Required fields (always)

- `title` — error: "タイトルを入力してください。"
- `imageUrl` — error: "画像URLを入力してください。"
- `brandEnum` — error: "ブランドを選択してください。"
- `periodStart` — error: "掲載開始日を選択してください。"

### Format validation

- `imageUrl`: File upload via `useImageUpload` (`category: 'studio'`); hook validates size/type, acquires presigned URL, uploads file, and returns public URL stored on submit.
- `linkUrl`: If provided, must be a valid URL (zod `url().nullable().optional()`); empty string is transformed to `null`.
- `periodStart`: Must match `YYYY/MM/DD` date format.
- `periodEnd`: If provided, must match `YYYY/MM/DD` date format; empty string/null allowed.
- `order`: If provided, must be a positive integer.

## State Transitions

```
[Empty Form] ──(create mode)──> [Filled Form] ──(submit)──> [Success Toast] ──> [Banner List]

[Banner loaded via GET /banners/{id}] ──(edit mode)──> [Filled Form] ──(submit)──> [Success Toast] ──> [Banner List]
```

No intermediate persistence in Phase 1. All state is client-side until the final submit mutation.

## Zod Schemas

### Client-side: `banner-form.schema.ts`

```ts
// BrandEnum from '@/lib/api/types.gen' (auto-generated from OpenAPI spec):
//   { JOYFIT: 'joyfit', JOYFIT24: 'joyfit24', JOYFIT_YOGA: 'joyfit_yoga',
//     JOYFIT_PLUS: 'joyfit_plus', FIT365: 'fit365' }

const BannerFormSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください。').max(255),
  imageUrl: z.string().min(1, '画像URLを入力してください。'),
  brandEnum: z.array(z.enum(BrandEnum)).min(1, 'ブランドを選択してください。'),
  linkUrl: z
    .union([z.url('有効なURLを入力してください。'), z.literal('').transform(() => null), z.null()])
    .optional(),
  periodStart: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, '掲載開始日を選択してください。'),
  periodEnd: z
    .union([
      z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, '日付形式(YYYY/MM/DD)で入力してください。'),
      z.literal('').transform(() => null),
      z.null(),
    ])
    .optional(),
  webEnabled: z.boolean().default(true),
  mobileEnabled: z.boolean().default(true),
  order: z.number().int().positive().optional(),
});

// emptyBannerFormValues.brandEnum defaults to ALL_BRAND_ENUM_VALUES (all 5 real BrandEnum
// values), which is why the "JOYFIT全体" checkbox is checked by default on create.
```

### Server-side: `banner.schema.ts`

```ts
// BrandEnumSchema in brand.schema.ts defines all selectable brand codes:
//   BrandEnumSchema = z.enum(['joyfit', 'joyfit24', 'joyfit_yoga', 'joyfit_plus', 'fit365'])

const CreateBannerBodySchema = z.object({
  title: z.string().min(1).max(255),
  imageUrl: z.string().min(1),
  brandEnum: z.array(BrandEnumSchema).min(1),
  linkUrl: z.url().nullable().optional(),
  periodStart: z.string(), // YYYY/MM/DD
  periodEnd: z.string().nullable().optional(),
  webEnabled: z.boolean(),
  mobileEnabled: z.boolean(),
  order: z.number().int().positive().optional(),
});

const UpdateBannerBodySchema = CreateBannerBodySchema.partial();

// GET /crm/banners/{id} returns BannerItemResponseSchema directly (not wrapped)

const CreateBannerResponseSchema = z.object({
  message: z.string(),
  banner: BannerItemResponseSchema,
});

const UpdateBannerResponseSchema = z.object({
  message: z.string(),
  banner: BannerItemResponseSchema,
});
```

## Mapper Functions

```ts
// banner-form.mapper.ts

// Convert API banner detail (BannerItemResponse) to form values (for edit pre-fill)
function bannerDetailToFormValues(banner: BannerItemResponse): BannerFormValues;

// Convert form values to API request body (for create submit)
function bannerFormValuesToCreateBody(values: BannerFormSubmitValues): CreateBannerBody;

// Convert form values to API request body (for update submit)
function bannerFormValuesToUpdateBody(values: BannerFormSubmitValues): UpdateBannerBody;
```

## Relationships

```
BannerFormInput
  └── maps to → BannerItemResponse (API entity)
        ├── has brands → array of BrandEnum (many-to-many via BannerBrandMapEntry)
        ├── has optional → linkUrl
        └── has optional → order (display sequence; auto-assigned on create)
```

Server-side, the brand relationship is stored separately from the banner row via
`BannerBrandMapEntrySchema` (`{ banner_id, brand_enum }`), one row per banner/brand pair, and
enriched into `brandEnum: BrandEnum[]` on read (`enrichBanner`).
