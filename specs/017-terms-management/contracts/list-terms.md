> **Status (real API, updated 2026-10-19):** this feature now runs on the real backend,
> `/api/v1/admin/terms` (API-076 §3–§8, client `src/lib/api-real`, Swagger in
> `src/lib/openapi.real.json`). The old mock BFF paths (`/crm/terms`) and mock row shapes are kept
> only as historical context. Where this file disagrees with the Swagger, **the Swagger wins**.

# Contract: List Terms Documents

`GET /api/v1/admin/terms` (API-076 §3)

Backs US1 (browse/search) and the tab/filter/pagination behavior of FR-001–FR-005.

## Query Parameters

| Param             | Type                                                              | Required | Notes                                                                                                  |
| ----------------- | ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `termsType`       | `membership\|privacy\|withdrawal\|suspension\|payment\|companion` | No       | Tab filter; omit for the "All" tab                                                                     |
| `brandEnum`       | `JOYFIT\|FIT365`                                                  | No       | Single-select brand-group filter. **Also returns shared (`brandEnum: null`) rows** (research.md #2).   |
| `status`          | `draft\|published\|ended`                                         | No       | Derived status, evaluated server-side (JST)                                                            |
| `query`           | `string` (≤100)                                                   | No       | One search box: matches terms ID **or** title (`termsId` / `title` also exist as exact-purpose params) |
| `includeDeleted`  | `boolean`                                                         | No       | Default `false`; `true` includes logically deleted rows (dimmed client-side)                           |
| `includeTotalAll` | `boolean`                                                         | No       | Default `false`; `true` adds `pagination.totalAllItems` (baseline for 「全 N 件中」)                   |
| `page`            | `number`                                                          | No       | Default `1`                                                                                            |
| `limit`           | `number` (1–100)                                                  | No       | Default `20` (FE sends `50`)                                                                           |
| `sort` / `order`  | `displayOrder\|effectiveFrom\|createdAt` / `asc\|desc`            | No       | FE does not expose sort; default order is `displayOrder` then `effectiveFrom` desc                     |

## Authorization

- 401 if unauthenticated; 403 for roles without access (Trainer — FR-006, FR-017).
- System/Headquarter → unrestricted (`brandEnum`, if given, is a normal filter).
- Other roles → always additionally scoped to their own **brand group(s)** (`stores.brand_group`,
  research.md #9), whatever `brandEnum` is sent. Shared (`brandEnum: null`) rows always stay visible.

## Response 200

```json
{
  "items": [
    {
      "id": "018f3a2b-7c4d-7e91-8a02-b3c4d5e6f760",
      "parentTermsId": null,
      "termsType": "membership",
      "brandEnum": "JOYFIT",
      "title": "会員規約",
      "version": "1.2",
      "effectiveFrom": "2026-04-01",
      "effectiveTo": null,
      "requiresConsent": true,
      "displayOrder": 1,
      "status": "published",
      "isDeleted": false
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1, "totalPages": 1, "totalAllItems": 12 }
}
```

- `id` is a UUID (not `TM-NNN`).
- `termsType` in the **response** may additionally be the legacy value `tos` (rows seeded before
  API-076); the request enum does not include it. The FE labels unknown types with the raw value.
- `brandEnum: null` = shared by both brands → rendered as both brand badges (research.md #2).
- Pagination field is **`total`** (not `totalItems`); `totalPages` is `0` when there are no results.
- `totalAllItems` is present only with `includeTotalAll=true`: rows of the requested
  `termsType` tab with brand scope kept and every other filter reset — live rows only, plus
  logically-deleted rows when `includeDeleted=true` (updated 2026-10-20 per product-owner decision,
  BUG-13 option A); `total <= totalAllItems`.

## Behavior notes

- `status` is derived per row (JST, inclusive both ends): `draft` (starts in the future),
  `published` (today is within the window or open-ended), `ended` (past `effectiveTo`).
  The business wording "Expired / 適用終了" maps to the API value `ended`.
- Empty result (FR-005) is a normal 200 with `items: []`; the "clear conditions" UX is client-side.
