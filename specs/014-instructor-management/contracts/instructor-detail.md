# Contract: GET /api/crm/instructors/{id} (NEW)

**Feature**: 014-instructor-management (FR-010, FR-011, FR-012, FR-013)
**Phase**: Phase 1 mock route handler
**Purpose**: Full detail payload for the instructor detail page.

---

## Request

`GET /api/crm/instructors/{id}`

No query parameters. Data scope enforced per [research.md](../research.md) item 6.

---

## Response 200

```json
{
  "data": {
    "instructor_id": "INS-0001",
    "name": "Taro Yamada",
    "romaji_name": "Yamada Taro",
    "nickname": "Taro",
    "role_classifications": ["trainer", "instructor"],
    "profile_text": "10 years of yoga and strength training experience.",
    "instructing_history": "Joined 2021, promoted to lead instructor 2023.",
    "photo_url": "/mock/instructors/ins-0001.jpg",
    "status": "active",
    "buffer_settings": {
      "min_booking_lead_hours": 24,
      "pre_buffer_minutes": 15,
      "post_buffer_minutes": 15
    },
    "crm_account_link": {
      "staff_id": "STF-0010",
      "staff_name": "Taro Yamada",
      "staff_role": "trainer"
    },
    "assigned_schedule_count": 5,
    "created_at": "2026-01-15T00:00:00.000Z",
    "updated_at": "2026-06-01T00:00:00.000Z"
  },
  "performance_summary": {
    "weekly_lesson_count": 6,
    "average_reservation_rate": 74,
    "average_rating": 4.6,
    "monthly_participant_count": 88
  },
  "assigned_lessons": [
    {
      "lesson_id": "LSN-0001",
      "lesson_name": "Yoga Basic",
      "weekdays": ["mon", "wed"],
      "time": "19:00",
      "reservation_rate": 82
    }
  ],
  "upcoming_schedule": {
    "recurring_summary": [{ "pattern_text": "Every Mon/Wed 19:00", "active_count": 2 }],
    "entries": [
      {
        "schedule_id": "SCH-1001",
        "lesson_name": "Yoga Basic",
        "date": "2026-07-08",
        "time": "19:00",
        "is_recurring": true
      }
    ]
  }
}
```

---

## Response 404

Returned when `id` does not exist or is outside the caller's data scope.

```json
{ "error": "Instructor not found" }
```

---

## Response 500

```json
{ "error": "Failed to fetch instructor detail" }
```

---

## Behavioral Rules

1. `crm_account_link` is `null` when no staff record is linked; `staff_name`/`staff_role` are resolved by joining `db.staffs` at read time (not stored redundantly).
2. `assigned_schedule_count` drives the delete-guard UI (FR-017) and must be `> 0`-consistent with `assigned_lessons`/`upcoming_schedule.entries` being non-empty.
3. `assigned_lessons` and `upcoming_schedule.entries` can both be empty arrays for an instructor with no schedules — UI still renders the cards with an empty-state message, not an error.
4. `upcoming_schedule.entries` returns the full list; the detail page renders only the first 3 inline and uses the same payload to populate the expand panel (no separate "expand" endpoint).
5. `average_rating` may be `null` if no mock rating was seeded for that instructor; UI shows an explicit "no rating yet" state rather than "0".
6. Action-button visibility (edit/delete) is not returned as explicit booleans in this payload; the UI derives it from the authenticated user's role and the permission matrix in [data-model.md](../data-model.md) (`InstructorActionPermissions`), same convention as `011-studio-detail-page`.

---

## Contract Tests (minimum)

- Happy path: instructor with schedules, CRM link, all optional fields populated.
- Happy path: instructor with zero assigned schedules — empty `assigned_lessons`, empty `upcoming_schedule.entries`, `assigned_schedule_count: 0`.
- Happy path: instructor with no nickname/romaji/profile/photo — fields are `null`, UI-side empty states apply.
- Guard path: instructor with `assigned_schedule_count > 0` used later to verify delete blocking.
- Scope path: Trainer requesting another instructor's ID receives 404.
- Error path: unknown ID returns 404.
