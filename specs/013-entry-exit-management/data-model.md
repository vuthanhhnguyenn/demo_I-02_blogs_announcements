# Data Model: B-01 入退館管理 (Entry-Exit Management) — Phase 1 Baseline Activity View

**Scope**: Entities and validation rules required for the entry-exit Phase 1 baseline (activity tables, hourly chart, Member Quick View panel).

---

## Entity: EntryExitLog (persisted, mock-db table)

**Purpose**: Canonical record of a single入退館 (entry or exit) event.

| Field             | Type         | Required | Validation                          | Notes                                                                 |
| ----------------- | ------------ | -------- | ----------------------------------- | --------------------------------------------------------------------- |
| `id`              | string       | yes      | non-empty                           | Log row identifier                                                    |
| `member_id`       | string       | yes      | non-empty, must reference `members` | Join key for identity display fields                                  |
| `store_id`        | string       | yes      | non-empty                           | Store where the event occurred                                        |
| `direction`       | enum         | yes      | `entry` \| `exit`                   | Which table the row belongs to                                        |
| `occurred_at`     | string       | yes      | ISO-8601 datetime                   | Event timestamp                                                       |
| `gate`            | string       | yes      | non-empty                           | Gate label (e.g. "ゲートA") — display only, not filterable in Phase 1 |
| `frequency_badge` | enum \| null | no       | `regular` \| `longAbsence` \| null  | Hardcoded/seeded per Q&A #3; no live threshold computation            |
| `companion_role`  | enum \| null | no       | `inviter` \| `invitee` \| null      | Hardcoded/seeded per Q&A #4; no live invite-source wiring             |
| `visit_count`     | integer      | yes      | min 0                               | Prior-visit count for this member; `0` displays as "初回"             |

---

## Entity: ActivityRow (response view-model — `EntryExitLog` joined with `Member`)

**Purpose**: Shape returned by the activity-table list endpoint; combines the log row with display fields from the member record.

| Field             | Type           | Required | Validation                         | Notes                                           |
| ----------------- | -------------- | -------- | ---------------------------------- | ----------------------------------------------- |
| `log_id`          | string         | yes      | non-empty                          | Maps to `EntryExitLog.id`                       |
| `member_id`       | string         | yes      | non-empty                          |                                                 |
| `name`            | string         | yes      | 1..100 chars                       | From `members`                                  |
| `furigana`        | string         | yes      | 1..100 chars                       | From `members`                                  |
| `gender`          | enum           | yes      | `male` \| `female`                 | From `members`                                  |
| `avatar_url`      | string \| null | no       | non-empty URL/path when present    | From `members`; `null` renders `AvatarFallback` |
| `contract_name`   | string         | yes      | non-empty                          | From member's current main contract             |
| `contract_id`     | string         | yes      | non-empty                          | From member's current main contract             |
| `occurred_at`     | string         | yes      | ISO-8601 datetime                  | From `EntryExitLog`                             |
| `gate`            | string         | yes      | non-empty                          | From `EntryExitLog`                             |
| `frequency_badge` | enum \| null   | no       | `regular` \| `longAbsence` \| null | From `EntryExitLog` (Q&A #3)                    |
| `companion_role`  | enum \| null   | no       | `inviter` \| `invitee` \| null     | From `EntryExitLog` (Q&A #4)                    |
| `visit_count`     | integer        | yes      | min 0                              | From `EntryExitLog`                             |

---

## Entity: HourlyEntryCount (derived, not persisted)

**Purpose**: One point on the "時間帯別入館者数" chart.

| Field   | Type    | Required | Validation | Notes                                                                                |
| ------- | ------- | -------- | ---------- | ------------------------------------------------------------------------------------ |
| `hour`  | integer | yes      | 6..22      | Hour of day                                                                          |
| `count` | integer | yes      | min 0      | Count of `direction = "entry"` logs in that hour, for the requested date/store scope |

---

## Entity: RecentVisit (derived, not persisted)

**Purpose**: One row in the Member Quick View's "直近の来館" list.

| Field              | Type            | Required | Validation         | Notes                                                                                      |
| ------------------ | --------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `exit_occurred_at` | string          | yes      | ISO-8601 datetime  | The exit event this visit is anchored to                                                   |
| `duration_minutes` | integer \| null | no       | min 0 when present | `exit.occurred_at - matched same-day entry.occurred_at`; `null` if no matching entry found |
| `store_name`       | string          | yes      | non-empty          | Store where the visit occurred                                                             |

---

## Entity: MemberQuickView (response view-model)

**Purpose**: Full payload for the non-modal Quick View panel opened from an activity row.

| Field             | Type            | Required | Validation                            | Notes                                            |
| ----------------- | --------------- | -------- | ------------------------------------- | ------------------------------------------------ |
| `member_id`       | string          | yes      | non-empty                             |                                                  |
| `name`            | string          | yes      | 1..100 chars                          |                                                  |
| `furigana`        | string          | yes      | 1..100 chars                          |                                                  |
| `gender`          | enum            | yes      | `male` \| `female`                    |                                                  |
| `avatar_url`      | string \| null  | no       | non-empty URL/path when present       |                                                  |
| `context`         | enum            | yes      | `entry` \| `exit`                     | Which activity table the click came from         |
| `occurred_at`     | string          | yes      | ISO-8601 datetime                     | Entry or exit time for the clicked row           |
| `contract_name`   | string          | yes      | non-empty                             |                                                  |
| `contract_id`     | string          | yes      | non-empty                             |                                                  |
| `frequency_badge` | enum \| null    | no       | `regular` \| `longAbsence` \| null    |                                                  |
| `companion_role`  | enum \| null    | no       | `inviter` \| `invitee` \| null        |                                                  |
| `phone`           | string \| null  | no       | E.164 or JP local format when present | From `members` record                            |
| `email`           | string \| null  | no       | valid email format when present       | From `members` record                            |
| `recent_visits`   | `RecentVisit[]` | yes      | 0..3 items                            | Most recent completed visits (see `RecentVisit`) |

Note: no `member_detail_path` field — the client derives the "会員詳細を開く" link itself via `navigate('/members/[id]', member_id)`, matching how every other feature in the codebase links to a member detail page (see `research.md` D6).

---

## Response Models

```typescript
interface GetEntryExitLogsResponse {
  data: ActivityRow[];
}

interface GetEntryExitHourlySummaryResponse {
  data: HourlyEntryCount[];
}

interface GetEntryExitLogQuickViewResponse {
  data: MemberQuickView;
}
```

---

## Validation Rules

- `direction` must be exactly `entry` or `exit`; the list endpoint MUST NOT mix both in a single response (each `ActivityTable` fetches one direction).
- `occurred_at` must be a parseable ISO-8601 datetime, and MUST fall on the requested `date` scope when one is supplied.
- `visit_count = 0` MUST be displayed as "初回", not "0回" (matches prototype convention).
- `HourlyEntryCount.hour` is restricted to `6..22` inclusive, matching FR-B01-08's chart range; hours outside this range are not returned.
- `RecentVisit.duration_minutes` is `null` only when no same-day entry precedes the exit; the UI MUST render "-" in that case rather than "0分".
- `frequency_badge` and `companion_role` are never computed at request time in Phase 1 — they are read verbatim from the seeded `EntryExitLog` row (Q&A #3/#4).

---

## State Transitions (Phase 1 scope)

- None — every entity in this spec is read-only display data for Phase 1. No create/update/delete operation on `EntryExitLog` is part of this spec (writing log rows is FR-M003, explicitly out of scope — see spec.md FR-B01-14).

---

## Phase 1 Seed Requirements

- At least 5 `entry` and 5 `exit` rows for "today" so both activity tables have full data by default.
- At least one row with `frequency_badge = "regular"` and one with `"longAbsence"`, to verify badge rendering + tooltip.
- At least one `inviter`/`invitee` pair sharing the same day, to verify companion badge rendering.
- At least one member with zero prior visits (`visit_count = 0`), to verify "初回" display.
- At least one member with **no** `avatar_url`, to verify `AvatarFallback` rendering (FR-B01-17).
- At least one store/date combination with **zero** log rows, to verify the `DataStateBoundary` empty state (FR-B01-15).
- At least one exit row with no matching same-day entry, to verify `duration_minutes = null` handling in Quick View recent visits.
- Seed data MUST span at least 2 stores, to exercise the store filter (FR-B01-11).
