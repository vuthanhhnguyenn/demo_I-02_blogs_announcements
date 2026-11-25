# Contract: GET /api/crm/entry-exit-logs/{id}/quick-view

**Feature**: 013-entry-exit-management (B-01 Phase 1 baseline)
**Phase**: Phase 1 mock route handler
**Purpose**: Provide the full Member Quick View panel payload for a clicked activity row (FR-B01-05/06).

---

## Request

`GET /api/crm/entry-exit-logs/{id}/quick-view`

### Path Parameters

| Param | Type   | Required | Description                                  |
| ----- | ------ | -------- | -------------------------------------------- |
| `id`  | string | yes      | `EntryExitLog.id` (the row that was clicked) |

No query parameters.

---

## Response 200

```json
{
  "data": {
    "member_id": "MEM-3750009251",
    "name": "伊藤健太",
    "furigana": "イトウ ケンタ",
    "gender": "male",
    "avatar_url": "/avatars/14.jpg",
    "context": "entry",
    "occurred_at": "2026-07-07T13:35:00.000Z",
    "contract_name": "プレミアムクレジット会員(相互利用あり)",
    "contract_id": "3750009251",
    "frequency_badge": "regular",
    "companion_role": "inviter",
    "phone": "090-1234-5678",
    "email": "kenta.ito@example.com",
    "recent_visits": [
      {
        "exit_occurred_at": "2026-11-01T12:20:00.000Z",
        "duration_minutes": 105,
        "store_name": "JOYFIT24新宿店"
      },
      {
        "exit_occurred_at": "2026-10-30T19:10:00.000Z",
        "duration_minutes": 55,
        "store_name": "JOYFIT24新宿店"
      },
      {
        "exit_occurred_at": "2026-10-27T18:40:00.000Z",
        "duration_minutes": null,
        "store_name": "JOYFIT24新宿店"
      }
    ]
  }
}
```

---

## Response 404

Returned when `id` does not reference an existing log row, or the row's store is outside the requesting user's access scope.

```json
{ "error": "Entry-exit log not found" }
```

---

## Response 500

```json
{ "error": "Failed to fetch member quick view" }
```

---

## Behavioral Rules

1. `context` is derived from the clicked row's `direction` (`"entry"` or `"exit"`) and controls the panel's context badge ("入館" vs "退館済み").
2. `recent_visits` returns at most 3 entries: the member's most recent completed visits (most recent `exit` events for that member, excluding the clicked row itself if it is an exit).
3. `duration_minutes` is `null` when no same-day `entry` row precedes a given `exit` row; the client MUST render "-" rather than "0分" in that case.
4. `phone`/`email` are read from the member's existing `members` record; either may be `null` if the member has no value on file — the client MUST omit that contact row rather than showing a blank line.
5. The client derives the member detail route itself from `member_id` via `navigate('/members/[id]', member_id)` (the app's typed router, per `code-rule.md`) for both the primary CTA and the "open in new tab" action — no server-provided path field is needed.

---

## Contract Tests (minimum)

- Happy path: entry-context row returns `context: "entry"` and the corresponding `occurred_at`.
- Happy path: exit-context row returns `context: "exit"`.
- Recent-visits path: member with 3+ prior completed visits returns exactly 3, most recent first.
- Recent-visits path: member with an orphan exit (no matching entry) returns `duration_minutes: null` for that entry.
- Contact path: member with no email on file returns `email: null`.
- Error path: unknown `id` returns 404.
