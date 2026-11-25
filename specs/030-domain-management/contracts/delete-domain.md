# Contract: DELETE /api/crm/domains/{id}

**Mock implementation** — `src/app/api/crm/domains/[id]/route.ts`
**Real backend** — not yet published

---

## Request

```
DELETE /api/crm/domains/{id}
```

| Parameter | Type     | Required | Description |
| --------- | -------- | -------- | ----------- |
| `id`      | `string` | Yes      | Domain id   |

No request body.

---

## Responses

### 200 OK

```json
{ "message": "ドメインを削除しました" }
```

### 404 Not Found

```json
{ "error": "ドメインが見つかりません" }
```

### 409 Conflict

```json
{
  "error": "このドメインには紐づくスタッフが3名います。先にスタッフの所属変更または無効化を行ってください。",
  "staffCount": 3
}
```

Returned when one or more staff are still linked to this domain (FR-013) — `staffCount` lets the client render the exact count without a second request.

---

## Behavior (mock implementation)

1. Find the domain by `id`; 404 if not found.
2. Compute `staffCount` the same way `GET /api/crm/domains/{id}` does (research R2); if `staffCount >= 1`, return 409 with the count — **do not** delete, and do not reassign linked staff to any other domain (research R6 — hard block, no silent reassignment).
3. Otherwise, physically remove the row from `db.domains`.
4. Return the success message.

**Client-side responsibility, not this endpoint's**: the delete confirmation dialog is shown for every delete attempt regardless of `staffCount` (naming both `name` and `domain`, per FR-012); the 409's `staffCount` is additionally surfaced there if the block occurs. The row's delete affordance is also disabled client-side whenever the already-fetched list row shows `staffCount > 0`, so the 409 path is defense-in-depth rather than the primary UX signal (matching the `positions` delete-guard precedent).
