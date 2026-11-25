# Contract: GET /api/crm/entry-exit-logs

**Feature**: 013-entry-exit-management (B-01 Phase 1 baseline)
**Phase**: Phase 1 mock route handler
**Purpose**: Provide the 5 most recent entry (or exit) activity rows for the Entry/Exit tables.

---

## Request

`GET /api/crm/entry-exit-logs`

### Query Parameters

| Param       | Type   | Required | Default | Description                                                         |
| ----------- | ------ | -------- | ------- | ------------------------------------------------------------------- |
| `direction` | string | yes      | —       | `entry` or `exit`                                                   |
| `limit`     | number | no       | `5`     | Max rows to return (FR-B01-01 caps the UI at 5)                     |
| `date`      | string | no       | today   | ISO date (`YYYY-MM-DD`); scopes results to that calendar day        |
| `store_id`  | string | no       | —       | Scopes to one store; omitted or `all` returns all accessible stores |

---

## Response 200

```json
{
  "data": [
    {
      "log_id": "EEL-000123",
      "member_id": "MEM-3750009251",
      "name": "伊藤健太",
      "furigana": "イトウ ケンタ",
      "gender": "male",
      "avatar_url": "/avatars/14.jpg",
      "contract_name": "プレミアムクレジット会員(相互利用あり)",
      "contract_id": "3750009251",
      "occurred_at": "2026-07-07T13:35:00.000Z",
      "gate": "ゲートA",
      "frequency_badge": "regular",
      "companion_role": "inviter",
      "visit_count": 203
    }
  ]
}
```

## Response 200 (empty)

```json
{ "data": [] }
```

Returned when there are zero log rows for the requested `direction`/`date`/`store_id` scope. The UI renders the `DataStateBoundary` empty state, not an error (FR-B01-15).

---

## Response 400

```json
{ "error": "direction must be 'entry' or 'exit'" }
```

---

## Response 500

```json
{ "error": "Failed to fetch entry-exit logs" }
```

---

## Behavioral Rules

1. Exactly one `direction` per request — the client issues two separate calls (one per `ActivityTable`), never a combined feed.
2. Rows are ordered by `occurred_at` descending; only the top `limit` are returned.
3. `frequency_badge` and `companion_role` are read verbatim from the seeded log row — never computed by this endpoint (Q&A #3/#4).
4. `avatar_url` may be `null`; the client MUST render `AvatarFallback` in that case (FR-B01-17), not attempt a broken image request.
5. `store_id=all` (or omitted) with a multi-store user returns rows across all accessible stores; a single-store user always receives that store's rows regardless of `store_id`.

---

## Contract Tests (minimum)

- Happy path: `direction=entry` returns up to 5 rows ordered by most recent.
- Happy path: `direction=exit` returns up to 5 rows ordered by most recent.
- Empty path: a date/store scope with zero rows returns `{ "data": [] }`, not an error.
- Guard path: missing/invalid `direction` returns 400.
- Badge path: a row seeded with `frequency_badge = "regular"` and `companion_role = "inviter"` is returned unchanged.
- Avatar path: a row whose member has no `avatar_url` returns `avatar_url: null`.
