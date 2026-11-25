# Contract: PATCH /api/crm/domains/{id}

**Mock implementation** — `src/app/api/crm/domains/[id]/route.ts`
**Real backend** — not yet published

---

## Request

```
PATCH /api/crm/domains/{id}
Content-Type: application/json
```

```json
{
  "name": "ヤマウチ社（本社）",
  "domain": "yamauchi.co.jp",
  "authProvider": "idaas"
}
```

Same shape and validation as `CreateDomainBody` (`data-model.md` §8) — the widened edit dialog always submits all three fields together, matching V0's existing `handleSave` behavior extended with the new `authProvider` field.

---

## Responses

### 200 OK

Returns the updated record in the same shape as `GET /api/crm/domains/{id}` (§ `get-domain-detail.md`) — `linkedStaff`/`staffCount` recomputed against the (possibly changed) `domain` value.

### 400 Bad Request

Same shape as `create-domain.md`'s 400 — malformed `domain` or empty required field.

### 404 Not Found

```json
{ "error": "ドメインが見つかりません" }
```

### 409 Conflict

```json
{ "error": "このドメインは既に登録されています" }
```

Returned when the (possibly changed) `domain` collides with a **different** existing record (case-insensitive, excluding the record's own id) — FR-005/FR-008.

---

## Behavior (mock implementation)

1. Find the domain by `id`; 404 if not found.
2. Validate the body; 400 on shape/format failure.
3. Normalize `domain` to lower-case and check uniqueness against every **other** row (`id !== :id`); 409 on collision.
4. Apply the update. `created_by`/`created_at` are never touched by this endpoint (read-only, per FR-009).
5. Return the updated `DomainDetail`.

**Client-side responsibility, not this endpoint's**: the FR-011 confirmation dialog ("linked staff's authentication route will change starting from their next login") is shown by the UI _before_ calling this endpoint whenever the submitted `authProvider` differs from the record's current value and `staffCount > 0` — research R8. This endpoint itself has no special-cased behavior for an `authProvider` change beyond persisting it like any other field.
