# Contract: GET /api/crm/domains/{id}

**Mock implementation** — `src/app/api/crm/domains/[id]/route.ts`
**Real backend** — not yet published

---

## Request

```
GET /api/crm/domains/{id}
```

| Parameter | Type     | Required | Description |
| --------- | -------- | -------- | ----------- |
| `id`      | `string` | Yes      | Domain id   |

---

## Responses

### 200 OK

```json
{
  "id": "D-001",
  "name": "ヤマウチ社",
  "domain": "yamauchi.co.jp",
  "authProvider": "google_sso",
  "staffCount": 2,
  "createdBy": "STF-001",
  "createdAt": "2026-07-01T09:00:00.000Z",
  "linkedStaff": [
    { "id": "STF-014", "name": "山内 太郎", "email": "taro.yamauchi@yamauchi.co.jp" },
    { "id": "STF-021", "name": "山内 花子", "email": "hanako.yamauchi@yamauchi.co.jp" }
  ]
}
```

### 404 Not Found

```json
{ "error": "ドメインが見つかりません" }
```

---

## Behavior (mock implementation)

1. Find the domain by `id` in `db.domains`; 404 if not found.
2. Scan `db.staffs` for rows whose `email`'s domain suffix (case-insensitive) matches this domain's `domain` — build `linkedStaff` (`id`, `name`, `email`) and derive `staffCount` from its length (same derivation the list endpoint uses, kept consistent by sharing one helper).
3. Return the full `DomainDetail` shape (§4 in `data-model.md`), including the read-only `createdBy`/`createdAt` fields set at creation time (never mutated by `PATCH`).

This is the endpoint the widened edit dialog (research R4) fetches when it opens, so the create/list flows never need to pay for `linkedStaff` computation on rows the user isn't currently editing.
