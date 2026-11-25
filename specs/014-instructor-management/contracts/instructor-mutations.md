# Contract: Instructor Create / Update / Status / Delete / History (NEW)

**Feature**: 014-instructor-management (FR-006, FR-007, FR-008, FR-009, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019)
**Phase**: Phase 1 mock route handlers

---

## POST /api/crm/instructors

Creates a new instructor. Allowed roles: Headquarter, Manager, Staff, System (FR-018).

### Request Body

```json
{
  "name": "Hanako Suzuki",
  "romaji_name": "Suzuki Hanako",
  "nickname": "Hana",
  "role_classifications": ["instructor"],
  "profile_text": "Pilates specialist.",
  "instructing_history": null,
  "photo_url": null,
  "buffer_settings": {
    "min_booking_lead_hours": 12,
    "pre_buffer_minutes": 15,
    "post_buffer_minutes": 0
  },
  "crm_account_link_staff_id": null
}
```

### Response 201

```json
{
  "data": {
    "instructor_id": "INS-0042",
    "...": "full Instructor aggregate, see instructor-detail.md"
  }
}
```

### Response 400

```json
{ "error": "name is required" }
```

Returned per-field for the first failing required field (`name`, `role_classifications`); mirrors the "{field name} is required" UX text in FR-006.

### Response 403

```json
{ "error": "You do not have permission to register instructors" }
```

Returned when the caller's role is Trainer or Observer (FR-018, defense-in-depth behind the disabled button).

### Behavioral Rules

1. `status` always initializes to `active`; not accepted in the request body.
2. Buffer settings default to `0`/`0`/`0` when the block or individual fields are omitted.
3. `crm_account_link_staff_id`, if provided, must resolve against `db.staffs`; unresolvable IDs return 400.
4. A single "Newly Created" change-history entry (`is_creation: true`) is appended on success.

---

## PUT /api/crm/instructors/{id}

Updates an existing instructor. Field set actually applied depends on caller role (FR-015):

- Headquarter/Manager/Staff/System: all fields in the body are applied.
- Trainer editing their own `id`: `name` and `role_classifications` in the body are ignored (server keeps existing values) even if present; all other fields apply normally.
- Trainer editing any other `id`, or Observer: 403.

### Request Body

Same shape as `POST`, all fields optional (partial update).

### Response 200

Full updated `Instructor` aggregate (same shape as `instructor-detail.md`'s `data`).

### Response 400 / 403 / 404

Same conventions as `POST` 400/403, plus 404 when `id` is unknown or out of the caller's data scope.

### Behavioral Rules

1. Same required-field validation as `POST` applies to the resulting merged record (e.g. clearing `role_classifications` to empty is rejected even on partial update).
2. One change-history row is appended per changed field (before/after values), timestamped and attributed to the calling operator.
3. `status` is rejected in this endpoint's body (400 `"status must be changed via the status endpoint"`) — see `PATCH .../status` below.

---

## PATCH /api/crm/instructors/{id}/status

Toggles Active/Inactive. Allowed roles: Headquarter, Manager, System (FR-016).

### Request Body

```json
{ "status": "inactive" }
```

### Response 200

```json
{ "data": { "instructor_id": "INS-0001", "status": "inactive" } }
```

### Response 403 / 404

Standard conventions.

### Behavioral Rules

1. No confirmation dialog is required client-side for this action (spec: "confirmation toast" only) — server applies immediately.
2. Setting an instructor to `inactive` excludes them from new schedule-registration instructor pickers going forward (enforced in the `list-instructors.md` scope logic used by D-01) but does not alter any existing schedules.
3. One change-history row (`field: "status"`) is appended.

---

## DELETE /api/crm/instructors/{id}

Permanently removes an instructor. Allowed roles: Headquarter, Manager, System (FR-017, FR-018).

### Response 204

No body.

### Response 409

```json
{ "error": "Cannot delete: instructor has 5 assigned schedule(s)" }
```

Returned whenever `assigned_schedule_count > 0`; the count is re-read from the mock table at request time, not trusted from the client.

### Response 403 / 404

Standard conventions.

---

## GET /api/crm/instructors/{id}/history

Returns field-level change history (FR-019).

### Response 200

```json
{
  "entries": [
    {
      "timestamp": "2026-06-01T09:00:00.000Z",
      "operator": "Manager Ito",
      "field": "buffer_settings.pre_buffer_minutes",
      "before": "0",
      "after": "15",
      "is_creation": false
    },
    {
      "timestamp": "2026-01-15T00:00:00.000Z",
      "operator": "Headquarter Sato",
      "is_creation": true
    }
  ],
  "total": 2
}
```

### Response 404

Same scope/existence convention as detail.

---

## Contract Tests (minimum, across this file)

- Create: missing `name` → 400 with field-specific message; missing `role_classifications` → 400.
- Create: Trainer/Observer caller → 403.
- Update: Trainer self-edit body includes `name` change → response shows unchanged `name`, history has no `name` entry.
- Update: Trainer editing another instructor's `id` → 403.
- Update: body includes `status` → 400.
- Status: Staff caller → 403.
- Delete: instructor with `assigned_schedule_count > 0` → 409, record still exists after the call.
- Delete: instructor with `assigned_schedule_count = 0` → 204, subsequent `GET` on the same `id` → 404.
- History: creation-only instructor → single entry with `is_creation: true` and no `field`/`before`/`after`.
