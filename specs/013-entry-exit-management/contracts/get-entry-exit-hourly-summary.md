# Contract: GET /api/crm/entry-exit-logs/hourly-summary

**Feature**: 013-entry-exit-management (B-01 Phase 1 baseline)
**Phase**: Phase 1 mock route handler
**Purpose**: Provide hourly entry counts (06:00–22:00) for the "時間帯別入館者数" chart.

---

## Request

`GET /api/crm/entry-exit-logs/hourly-summary`

### Query Parameters

| Param      | Type   | Required | Default | Description                                                            |
| ---------- | ------ | -------- | ------- | ---------------------------------------------------------------------- |
| `date`     | string | no       | today   | ISO date (`YYYY-MM-DD`)                                                |
| `store_id` | string | no       | —       | Scopes to one store; omitted or `all` aggregates all accessible stores |

---

## Response 200

```json
{
  "data": [
    { "hour": 6, "count": 3 },
    { "hour": 7, "count": 8 },
    { "hour": 8, "count": 5 },
    { "hour": 9, "count": 12 },
    { "hour": 10, "count": 18 },
    { "hour": 11, "count": 15 },
    { "hour": 12, "count": 10 },
    { "hour": 13, "count": 8 },
    { "hour": 14, "count": 6 },
    { "hour": 15, "count": 0 },
    { "hour": 16, "count": 0 },
    { "hour": 17, "count": 0 },
    { "hour": 18, "count": 0 },
    { "hour": 19, "count": 0 },
    { "hour": 20, "count": 0 },
    { "hour": 21, "count": 0 },
    { "hour": 22, "count": 0 }
  ]
}
```

---

## Response 500

```json
{ "error": "Failed to fetch hourly entry summary" }
```

---

## Behavioral Rules

1. Always returns exactly 17 entries (hours 6 through 22 inclusive), even when a given hour has zero entries — the chart's x-axis must not have gaps.
2. Only `direction = "entry"` logs are counted; exits are not part of this chart (matches FR-B01-08 / the prototype's "入館者数" label).
3. Aggregation is computed live from `entry_exit_logs`, not from a static/precomputed table.
4. Future hours relative to the current time on the requested date return `count: 0` rather than being omitted (matches prototype's "未来時間帯は実績未計上" convention), unless the requested `date` is in the past, in which case all 17 hours reflect final recorded counts.

---

## Contract Tests (minimum)

- Happy path: a date with entries in several hours returns non-zero counts only for those hours; all others are `0`.
- Happy path: a date with zero entries returns all 17 hours at `count: 0` (not an empty array).
- Store-scope path: `store_id` set to a specific store only counts that store's entries.
- Error path: simulated internal failure returns 500.
