# Data Model: D-04 Instructor Management

**Scope**: Entities and validation rules required for instructor list, detail, create/edit, status toggle, delete, and change history in Phase 1.

---

## Entity: InstructorListItem

**Purpose**: One row in the Studio Instructor / Personal Trainer list tabs.

| Field                  | Type           | Required | Validation                                                       | Notes                                                                |
| ---------------------- | -------------- | -------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `instructor_id`        | string         | yes      | non-empty                                                        | Existing field, unchanged                                            |
| `instructor_name`      | string         | yes      | 1..`TEXT_MAX_LENGTH` (255) chars                                 | Existing field, unchanged                                            |
| `nickname`             | string \| null | no       | max `TEXT_MAX_LENGTH` (255) chars                                | NEW                                                                  |
| `romaji_name`          | string \| null | no       | max `TEXT_MAX_LENGTH` (255) chars                                | NEW                                                                  |
| `role_classifications` | array          | yes      | 1..3 of `trainer`/`instructor`/`body_care_therapist`             | NEW — replaces ambiguous legacy `role` display in D-04 list only     |
| `tab`                  | enum           | yes      | `studio` or `pt`                                                 | NEW — determines which list tab the row belongs to                   |
| `brands`               | array          | yes      | 0..n of `joyfit`/`joyfit24`/`joyfit_yoga`/`joyfit_plus`/`fit365` | NEW — derived from assigned schedules, may be empty                  |
| `store_id`             | string \| null | no       | non-empty when present                                           | Existing field; legacy single-store consumer (D-01) still reads this |
| `status`               | enum           | yes      | `active` or `inactive`                                           | NEW                                                                  |
| `photo_url`            | string \| null | no       | non-empty URL/path when present                                  | Existing field, unchanged                                            |

**Note on backward compatibility**: `role` (legacy free-text string) stays present and populated (mirrors the first entry of `role_classifications`) so the existing D-01 `GetInstructorsResponseSchema` consumer keeps compiling and reading a valid value; new UI code reads `role_classifications` instead.

---

## Entity: Instructor (detail aggregate)

**Purpose**: Canonical full profile for the instructor detail page, create/edit forms.

| Field                     | Type                   | Required | Validation                                           | Notes                                               |
| ------------------------- | ---------------------- | -------- | ---------------------------------------------------- | --------------------------------------------------- |
| `instructor_id`           | string                 | yes      | non-empty                                            | Primary identifier                                  |
| `name`                    | string                 | yes      | 1..`TEXT_MAX_LENGTH` (255) chars                     | Required on create; read-only for Trainer self-edit |
| `romaji_name`             | string \| null         | no       | max `TEXT_MAX_LENGTH` (255) chars                    |                                                     |
| `nickname`                | string \| null         | no       | max `TEXT_MAX_LENGTH` (255) chars                    |                                                     |
| `role_classifications`    | array                  | yes      | 1..3 of `trainer`/`instructor`/`body_care_therapist` | Required on create; read-only for Trainer self-edit |
| `profile_text`            | string \| null         | no       | max `TEXTAREA_MAX_LENGTH` (1000) chars               |                                                     |
| `instructing_history`     | string \| null         | no       | max `TEXTAREA_MAX_LENGTH` (1000) chars               |                                                     |
| `photo_url`               | string \| null         | no       | non-empty URL/path when present                      |                                                     |
| `status`                  | enum                   | yes      | `active` or `inactive`                               | Mutated only via status-toggle endpoint             |
| `buffer_settings`         | BufferSettings         | yes      | see below                                            |                                                     |
| `crm_account_link`        | CrmAccountLink \| null | no       | see below                                            | Optional                                            |
| `assigned_schedule_count` | integer                | yes      | min 0                                                | Delete guard signal                                 |
| `created_at`              | string                 | yes      | ISO-8601 datetime                                    | Read-only metadata                                  |
| `updated_at`              | string                 | yes      | ISO-8601 datetime                                    | Read-only metadata                                  |

---

## Entity: BufferSettings

**Purpose**: Per-instructor scheduling constraints consumed by D-01.

| Field                    | Type | Required | Validation                     | Notes  |
| ------------------------ | ---- | -------- | ------------------------------ | ------ |
| `min_booking_lead_hours` | enum | yes      | one of `0,1,2,3,6,12,24,48,72` | FR-007 |
| `pre_buffer_minutes`     | enum | yes      | one of `0,15,30,45,60`         | FR-007 |
| `post_buffer_minutes`    | enum | yes      | one of `0,15,30,45,60`         | FR-007 |

Default on create when unset: `min_booking_lead_hours = 0`, `pre_buffer_minutes = 0`, `post_buffer_minutes = 0`.

---

## Entity: CrmAccountLink

**Purpose**: Optional association to a Y-01 staff record (resolved via join, not denormalized).

| Field        | Type   | Required | Validation | Notes                                              |
| ------------ | ------ | -------- | ---------- | -------------------------------------------------- |
| `staff_id`   | string | yes      | non-empty  | Stored on the instructor record                    |
| `staff_name` | string | yes      | non-empty  | Resolved from `db.staffs` at read time, not stored |
| `staff_role` | string | yes      | non-empty  | Resolved from `db.staffs` at read time, not stored |

When absent, `crm_account_link` is `null` in the detail response.

---

## Entity: PerformanceSummary

**Purpose**: Combined read-only performance card on the detail page (FR-011).

| Field                       | Type           | Required | Validation | Notes                                              |
| --------------------------- | -------------- | -------- | ---------- | -------------------------------------------------- |
| `weekly_lesson_count`       | integer        | yes      | min 0      | Count of active assigned schedules in the week     |
| `average_reservation_rate`  | number         | yes      | 0..100     | Mean of `reservation_rate` across assigned lessons |
| `average_rating`            | number \| null | no       | 0..5       | Static mock value pending D-Q09 (FR-020)           |
| `monthly_participant_count` | integer        | yes      | min 0      | Sum of participants across the month's sessions    |

---

## Entity: AssignedLessonSummary

**Purpose**: Compact assigned-lesson list on the detail page (FR-012).

| Field              | Type    | Required | Validation           | Notes              |
| ------------------ | ------- | -------- | -------------------- | ------------------ |
| `lesson_id`        | string  | yes      | non-empty            | Navigation target  |
| `lesson_name`      | string  | yes      | 1..120 chars         |                    |
| `weekdays`         | array   | yes      | 1..7 of `mon`..`sun` |                    |
| `time`             | string  | yes      | `HH:mm` format       | Session start time |
| `reservation_rate` | integer | yes      | 0..100               | Percentage         |

---

## Entity: UpcomingScheduleEntry

**Purpose**: Individual entries in the "Upcoming Schedule" card/expand panel (FR-013).

| Field          | Type    | Required | Validation     | Notes                               |
| -------------- | ------- | -------- | -------------- | ----------------------------------- |
| `schedule_id`  | string  | yes      | non-empty      |                                     |
| `lesson_name`  | string  | yes      | non-empty      |                                     |
| `date`         | string  | yes      | ISO-8601 date  | Concrete occurrence date            |
| `time`         | string  | yes      | `HH:mm` format |                                     |
| `is_recurring` | boolean | yes      |                | Distinguishes recurring vs. one-off |

### Entity: RecurringSettingSummary

**Purpose**: Summary block shown above the individual entries in the expand panel.

| Field          | Type    | Required | Validation | Notes                            |
| -------------- | ------- | -------- | ---------- | -------------------------------- |
| `pattern_text` | string  | yes      | non-empty  | e.g. "Every Mon/Wed 19:00"       |
| `active_count` | integer | yes      | min 0      | Number of active recurring rules |

---

## Entity: InstructorActionPermissions

**Purpose**: Effective permission map for header actions (registration/edit/delete), enforced server-side per [research.md](research.md) item 6.

| Role        | List/Detail Scope | Register | Edit (full) | Edit (self, limited)   | Delete |
| ----------- | ----------------- | -------- | ----------- | ---------------------- | ------ |
| System      | all               | yes      | yes         | —                      | yes    |
| Headquarter | all               | yes      | yes         | —                      | yes    |
| Manager     | managed stores    | yes      | yes         | —                      | yes    |
| Staff       | own store         | yes      | yes         | —                      | no     |
| Trainer     | self only         | no       | no          | yes (own profile only) | no     |
| Observer    | own store         | no       | no          | —                      | no     |

"Edit (self, limited)" = `nickname`, `romaji_name`, `profile_text`, `photo_url`, `instructing_history`, `buffer_settings` only; `name` and `role_classifications` stay read-only.

---

## Entity: InstructorChangeHistoryEntry

**Purpose**: Field-level audit row for the Change History tab (FR-019).

| Field         | Type    | Required | Validation                   | Notes                                                          |
| ------------- | ------- | -------- | ---------------------------- | -------------------------------------------------------------- |
| `timestamp`   | string  | yes      | ISO-8601 datetime            | Display as `yyyy/MM/dd HH:mm`                                  |
| `operator`    | string  | yes      | non-empty                    | Name of the user who made the change                           |
| `field`       | string  | no       | omitted for creation entries | e.g. `nickname`, `buffer_settings.pre_buffer_minutes`          |
| `before`      | string  | no       | omitted for creation entries |                                                                |
| `after`       | string  | no       | omitted for creation entries |                                                                |
| `is_creation` | boolean | yes      |                              | `true` renders the "Newly Created" indicator instead of a diff |

---

## Response Models

```typescript
interface GetInstructorsResponse {
  instructors: InstructorListItem[];
}

interface GetInstructorDetailResponse {
  data: Instructor;
  performance_summary: PerformanceSummary;
  assigned_lessons: AssignedLessonSummary[];
  upcoming_schedule: {
    recurring_summary: RecurringSettingSummary[];
    entries: UpcomingScheduleEntry[]; // full list; UI shows first 3 inline
  };
}

interface GetInstructorHistoryResponse {
  entries: InstructorChangeHistoryEntry[];
  total: number;
}

interface CreateInstructorRequest {
  name: string;
  romaji_name?: string | null;
  nickname?: string | null;
  role_classifications: RoleClassification[]; // min 1
  profile_text?: string | null;
  instructing_history?: string | null;
  photo_url?: string | null;
  buffer_settings?: Partial<BufferSettings>;
  crm_account_link_staff_id?: string | null;
}

// UpdateInstructorRequest = Partial<CreateInstructorRequest>, server enforces
// role-scoped field editability (see InstructorActionPermissions) independent
// of which fields the client includes in the body.

interface UpdateInstructorStatusRequest {
  status: 'active' | 'inactive';
}
```

---

## Validation Rules

- `name` required, 1..100 chars, on create; immutable by Trainer self-edit.
- `role_classifications` requires at least 1 entry, max 3 (all distinct), on create; immutable by Trainer self-edit.
- `buffer_settings.min_booking_lead_hours` must be one of the 9 allowed values; `pre_buffer_minutes`/`post_buffer_minutes` must each be one of the 5 allowed values.
- `crm_account_link_staff_id`, when provided, must resolve to an existing `db.staffs` record; otherwise reject with 400.
- `status` is never set via `POST`/`PUT` bodies — always defaults to `active` on create and is only mutated via `PATCH .../status`.
- `DELETE` is rejected (409) whenever `assigned_schedule_count > 0`, regardless of client-side state.
- Server-side role check on every read/write: requested `instructor_id` must be within the caller's data scope (see [research.md](research.md) item 6); out-of-scope requests return 404 (not 403, to avoid leaking existence — consistent with the `011-studio-detail-page` precedent).

---

## State Transitions (Phase 1 scope)

- `status`: `active <-> inactive`, only via `PATCH /crm/instructors/{id}/status`, by Headquarter/Manager/System only.
- `assigned_schedule_count`: read-only, recomputed from `lesson.table.ts` assigned-schedule rows; not directly mutated by this feature.
- Every successful `POST`/`PUT`/`PATCH .../status` appends one or more rows to the instructor's change-history array (one row per changed field; a single "Newly Created" row for `POST`).

---

## Phase 1 Seed Requirements

- At least one `studio` tab and one `pt` tab instructor.
- At least one instructor with zero assigned schedules (empty brands, empty assigned lessons/upcoming schedule, `assigned_schedule_count = 0`) to verify empty states and unblocked delete.
- At least one instructor with `assigned_schedule_count > 0` to verify the delete guard.
- At least one instructor with no nickname/romaji/profile text/photo to verify empty-state rendering (edge case).
- At least one instructor with a `crm_account_link` and one without.
- At least one `inactive` instructor.
- At least one instructor whose `role_classifications` includes all three values (multi-role rendering).
- Seed data spanning at least 2 stores across at least 2 different roles' data scope (Manager's managed stores vs. others) to exercise FR-005 scoping.
