# Contract: POST /api/crm/domains

**Mock implementation** — `src/app/api/crm/domains/route.ts`
**Real backend** — not yet published

---

## Request

```
POST /api/crm/domains
Content-Type: application/json
```

```json
{
  "name": "ヤマウチ社",
  "domain": "yamauchi.co.jp",
  "authProvider": "google_sso"
}
```

| Field          | Type     | Required | Validation                                                       |
| -------------- | -------- | -------- | ---------------------------------------------------------------- |
| `name`         | `string` | Yes      | Non-empty, trimmed (FR-004)                                      |
| `domain`       | `string` | Yes      | Non-empty, trimmed, bare-domain format — no `@` (FR-004, FR-006) |
| `authProvider` | `string` | Yes      | One of: `google_sso`, `idaas` (FR-004)                           |

---

## Responses

### 201 Created

```json
{
  "id": "D-005",
  "name": "ヤマウチ社",
  "domain": "yamauchi.co.jp",
  "authProvider": "google_sso",
  "staffCount": 0
}
```

### 400 Bad Request

```json
{ "error": "ドメイン形式が正しくありません" }
```

Returned when `domain` fails the bare-domain format check (contains `@`, whitespace, or is otherwise malformed) or when `name`/`domain` is empty.

### 409 Conflict

```json
{ "error": "このドメインは既に登録されています" }
```

Returned when `domain` (case-insensitive) already exists on another record (FR-005).

---

## Behavior (mock implementation)

1. Validate the body against `CreateDomainBodySchema`; 400 on shape/format failure.
2. Normalize `domain` to lower-case for the uniqueness check against all existing rows; 409 if a match is found.
3. Assign the next sequential `D-0xx` id.
4. Stamp `created_by` (request's acting-user id, or a mock fallback like `'STF-001'` if the mock has no authenticated-actor context) and `created_at` (now, ISO).
5. Insert the row; return it as a `DomainListItem`-shaped body (`staffCount: 0` — a brand-new domain has no linked staff yet) with `201`.
