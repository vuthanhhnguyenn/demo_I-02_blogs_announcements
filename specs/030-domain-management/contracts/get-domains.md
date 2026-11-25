# Contract: GET /api/crm/domains

**Mock implementation** — `src/app/api/crm/domains/route.ts`
**Real backend** — not yet published

---

## Request

```
GET /api/crm/domains
```

### Query Parameters

| Parameter      | Type      | Required | Default | Validation                                             |
| -------------- | --------- | -------- | ------- | ------------------------------------------------------ |
| `query`        | `string`  | No       | —       | Partial match on `name` or `domain` (case-insensitive) |
| `authProvider` | `string`  | No       | —       | One of: `google_sso`, `idaas`                          |
| `page`         | `integer` | No       | `1`     | min: 1                                                 |
| `limit`        | `integer` | No       | `50`    | One of: 25, 50, 100, 200                               |

---

## Responses

### 200 OK

```json
{
  "items": [
    {
      "id": "D-001",
      "name": "ヤマウチ社",
      "domain": "yamauchi.co.jp",
      "authProvider": "google_sso",
      "staffCount": 3
    }
  ],
  "pagination": { "page": 1, "limit": 50, "totalItems": 4, "totalPages": 1 },
  "count": 4
}
```

`count` is the total number of domains in the system regardless of the current filters (page header's "N件" badge); `pagination.totalItems` is the count matching the current filters.

### 400 Bad Request

```json
{ "error": "limit must be one of 25, 50, 100, 200" }
```

### 500 Internal Server Error

```json
{ "error": "ドメイン一覧の取得に失敗しました" }
```

---

## Filtering Logic (mock implementation)

1. For each stored `Domain` row, compute `staffCount` by scanning `db.staffs` for rows whose `email`'s substring after `@` (lower-cased) equals the domain's `domain` field (lower-cased).
2. Apply `query`: keep records where `name` or `domain` contains the term, case-insensitive.
3. Apply `authProvider`: keep records where `auth_provider === authProvider`.
4. No sorting (natural/seed order) — neither `spec.md` nor the V0 mockup defines a sort control for this screen.
5. Paginate: skip `(page - 1) * limit`, take `limit`, against the **filtered** count for `pagination.totalItems`/`totalPages`.
6. Return `{ items, pagination, count }`, where `count` is the total row count before any filtering.
