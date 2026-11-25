# Contract: GET /api/crm/instructors (extended)

**Feature**: 014-instructor-management (FR-001, FR-002, FR-003, FR-005)
**Phase**: Phase 1 mock route handler — EXTENDS the existing route in place
**Purpose**: Power the two-tab instructor list with search/filter/scope; remains backward-compatible with the D-01 lesson-schedule instructor picker.

---

## Request

`GET /api/crm/instructors`

### Query Parameters

| Param      | Type   | Required | Description                                                                              | Consumer               |
| ---------- | ------ | -------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| `store_id` | string | no       | Existing param — filter by store                                                         | D-01 (existing) + D-04 |
| `role`     | string | no       | Existing param — filter by legacy single-role string                                     | D-01 (existing)        |
| `tab`      | enum   | no       | NEW — `studio` or `pt`; omitted = both tabs                                              | D-04 list page         |
| `search`   | string | no       | NEW — matches name, romaji name, nickname, or instructor ID (case-insensitive substring) | D-04 list page         |
| `brand`    | string | no       | NEW — filter by derived brand (`joyfit`/`joyfit24`/`joyfit_yoga`/`joyfit_plus`/`fit365`) | D-04 list page         |
| `status`   | enum   | no       | NEW — `active` or `inactive`                                                             | D-04 list page         |

**Backward compatibility**: When only `store_id`/`role` are supplied (as D-01 does today), the response's existing fields (`instructor_id`, `instructor_name`, `store_id`, `role`, `photo_url`) are unchanged in value and meaning. New fields are additive.

**Data scope**: Server resolves the caller's role from the auth context (Phase 1: mock role constant, see [research.md](../research.md) item 6) and restricts results to System/Headquarter: all; Manager: managed stores; Staff/Observer: own store; Trainer: self only — applied before `store_id`/`tab`/`search`/`brand`/`status` filters.

---

## Response 200

```json
{
  "instructors": [
    {
      "instructor_id": "INS-0001",
      "instructor_name": "Taro Yamada",
      "nickname": "Taro",
      "romaji_name": "Yamada Taro",
      "role_classifications": ["trainer", "instructor"],
      "role": "trainer",
      "tab": "studio",
      "brands": ["joyfit", "joyfit24"],
      "store_id": "STORE-001",
      "status": "active",
      "photo_url": "/mock/instructors/ins-0001.jpg"
    }
  ]
}
```

---

## Response 500

```json
{ "error": "Failed to fetch instructors" }
```

---

## Behavioral Rules

1. `brands` is derived per-instructor from active assigned lesson schedules → studio → store; an instructor with zero assigned schedules returns `brands: []`.
2. `role` (legacy field) always mirrors `role_classifications[0]` for backward compatibility with the D-01 picker.
3. Search is a case-insensitive substring match across `instructor_name`, `romaji_name`, `nickname`, `instructor_id` — matching any one field includes the row.
4. `tab` filter is exact match; when omitted, both tabs are returned (D-01 picker relies on this default).
5. Zero matches returns `{ "instructors": [] }`, not an error — UI renders the empty/filtered state (FR-004).

---

## Contract Tests (minimum)

- Happy path: no new params (D-01 shape) — response still parses under the old `GetInstructorsResponseSchema` shape.
- Happy path: `tab=studio&search=yama` returns only matching studio-tab rows.
- Happy path: `brand=fit365` returns only instructors with at least one assigned schedule at a `fit365` store.
- Empty path: filters combine to zero matches — empty array, 200 status.
- Scope path: Trainer role caller receives only their own row regardless of other filters.
