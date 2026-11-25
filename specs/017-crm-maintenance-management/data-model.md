# Data Model: Y-10 CRM Maintenance Management

**Input**: [spec.md](spec.md) Key Entities + Functional Requirements; conventions confirmed in [research.md](research.md).

## Entity: CrmMaintenance (mock table `crmMaintenances`)

Row shape (`CrmMaintenanceSchema`, snake_case — internal/storage representation, per research.md §2):

| Field        | Type                         | Required       | Notes                                                                                                                                                               |
| ------------ | ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `string`                     | yes            | `M-{NNN}` sequential, e.g. `M-001` (research.md §3)                                                                                                                 |
| `title`      | `string`, 1–255 chars        | yes            | Management-facing identifier (FR-001)                                                                                                                               |
| `starts_at`  | `string` (ISO 8601 datetime) | yes            | Maintenance window start                                                                                                                                            |
| `ends_at`    | `string` (ISO 8601 datetime) | yes            | Must be after `starts_at` (FR-004)                                                                                                                                  |
| `message`    | `string`, 1–1000 chars       | yes            | Message shown to restricted users during the window (FR-001)                                                                                                        |
| `note`       | `string \| null`             | yes (nullable) | Optional internal remarks (備考); `null` when omitted (FR-001)                                                                                                      |
| `created_by` | `string`                     | yes            | Creator staff ID                                                                                                                                                    |
| `updated_by` | `string \| null`             | yes (nullable) | Last updater staff ID; `null` until first update                                                                                                                    |
| `created_at` | `string` (ISO 8601 datetime) | yes            | Set on insert                                                                                                                                                       |
| `updated_at` | `string \| null`             | yes (nullable) | Set on each update; `null` until first update                                                                                                                       |
| `notified`   | `boolean`                    | yes            | **[FR-007 delta]** advance-notification sent flag; `false` = 未, `true` = 済. `create()` inserts `false` (FR-027). Mock-only — not in the real list/detail contract |

### Derived field: `status` (never stored)

Computed identically to `app-maintenances`' `computeStatus()` (research.md §1), evaluated against `now()` at read time:

```
status =
  now() <  starts_at                    → 'planned'      (予定)
  starts_at <= now() <= ends_at         → 'in_progress'  (メンテナンス中)
  now() >  ends_at                      → 'completed'    (完了)
```

`CrmMaintenanceStatusSchema = z.enum(['planned', 'in_progress', 'completed'])`. This is FR-011; it is exposed on every response schema but accepted on **no** request schema (create or update).

### Advance notification status (stored — FR-007 delta, mock-ahead-of-backend, simplified 2026-07-20)

The stored `notified` boolean column (above) is the feature's only new persisted state; it is `false` on insert (FR-027) and projected onto both the list item and the detail response as `notified` (optional in the schema so the client degrades to `false` when a real backend without it is wired in). `notify(id)` simply sets `notified = true` (a fake send — no real delivery, no kind, no timestamp, no completed-status lock). It is **idempotent**, so manual re-send after a record is already 済 is a harmless no-op flag set (the detail card keeps a "通知を再送信" button in the 済 state — 2026-07-20 follow-up clarification). Superseded design (kind auto/manual, sentAt timestamp, notifyTargetCount) was removed per the 2026-07-20 clarification.

## Entity: CrmMaintenanceAllowedUser (join table `crmMaintenanceAllowedUsers`)

Row shape — no `name`/`role` columns; resolved from `db.staffs` at read time (research.md §3):

| Field                | Type     | Required | Notes                                                                        |
| -------------------- | -------- | -------- | ---------------------------------------------------------------------------- |
| `crm_maintenance_id` | `string` | yes      | FK → `CrmMaintenance.id`                                                     |
| `staff_id`           | `string` | yes      | FK → `db.staffs`' `staff_id` (e.g. `STF-001`); unique per maintenance record |

**Resolution at read time**: for each `staff_id` on a record, look up `db.staffs.getList().find(s => s.staff_id === staff_id)` and project `{ staffId: staff_id, name: staff.name, role: staff.role }`. `role` here is `StaffRoleSchema` (lowercase: `system`/`headquarter`/`manager`/`staff`/`trainer`/`observer`) reused directly from `staff.schema.ts` — **not** the capitalized `UserRole` enum used for this feature's own page-level access gating (research.md §5). If a `staff_id` no longer resolves (staff deleted from the mock — not expected in Phase 1 but defensively handled), it is silently skipped from the resolved list rather than throwing.

### Validation rules (FR-002 through FR-009, FR-015 through FR-017)

| Rule                                                                                    | Enforcement point                                                                                                       |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `title` required, 1–255 chars                                                           | Zod, create + update                                                                                                    |
| `starts_at`/`ends_at` required, valid datetime                                          | Zod, create; table-layer check on update (effective value, since either can be omitted in a PATCH)                      |
| `ends_at` after `starts_at`                                                             | Zod `.refine()` on create; table-layer check on update (effective end vs. effective start)                              |
| `message` required, 1–1000 chars                                                        | Zod, create + update                                                                                                    |
| `note` optional, ≤1000 chars                                                            | Zod, create + update                                                                                                    |
| No two rows may have overlapping `[starts_at, ends_at)`, regardless of status           | Table-layer check (`create`, `update` excluding self), against **all** rows including `completed` ones (research.md §6) |
| `starts_at` cannot change while derived `status === 'in_progress'`                      | Table-layer check (`update`) — FR-016                                                                                   |
| Row cannot be deleted while derived `status === 'in_progress'`                          | Table-layer check (`delete`) — FR-019                                                                                   |
| Every `staff_id` in `allowedUserIds` must reference an existing `db.staffs` row         | Table-layer check (`create`, `update`) — FR-009 (rejects adding an unknown user)                                        |
| A `staff_id` already on the record's allowed-user set is not duplicated                 | Table-layer check (`create`, `update`) — de-duplicated on write, matching FR-009's "prevent adding twice"               |
| Adding/removing allowed users (via full-set `update`) is permitted regardless of status | No status check gates `allowedUserIds` in `update` — only `starts_at` is gated (see row above) — FR-017                 |

### State transitions

`status` has no explicit transition API — it is a pure function of `now()` vs. `starts_at`/`ends_at`, moving `planned → in_progress → completed` automatically as time passes, with two guarded transitions layered on top:

- While `in_progress`: `starts_at` is frozen (edit-locked) and the row cannot be deleted; the allowed-user set remains fully editable (FR-017's emergency-add exception).
- `planned` and `completed` rows: fully editable and deletable.
- **Notification (FR-007 delta, simplified)**: independent of the status lifecycle. `notify()` sets `notified = true` (未 → 済) regardless of status; it never affects the CRUD locks above and is never part of overlap/period validation.

## Relationships

- `crmMaintenanceAllowedUsers.staff_id` → `db.staffs`' `staff_id` — resolved (not joined via a DB-style query) at every list/detail read; this is the feature's sole dependency on the existing Y-01 staff master (spec.md Assumptions, 2nd bullet).
- `created_by`/`updated_by` reference a staff record by ID — informational only for Phase 1 (raw ID, no resolved name in the response), matching spec's Key Entities.
- No relationship to Y-06 (App Maintenance Management, `appMaintenances`) — confirmed independent feature (spec.md Assumptions, 4th bullet); no shared table, schema, or route.

## Request/Response DTOs (camelCase — wire representation, per research.md §2)

- **`CreateCrmMaintenanceBodySchema`**: `title`, `startsAt`, `endsAt`, `message` — required; `note?`, `allowedUserIds?: string[]` — optional.
- **`UpdateCrmMaintenanceBodySchema`**: all of the above, all optional (partial update). `allowedUserIds`, when present, **replaces** the entire allowed-user set (research.md §6); omitting it leaves the existing set unchanged.
- **`CrmMaintenanceItemResponseSchema`** (list row): `id`, `title`, `startsAt`, `endsAt`, `status`, `allowedUserCount`, `createdAt`, **`notified?: boolean`** (FR-007 delta; optional — mock-ahead).
- **`CrmMaintenanceAllowedUserResponseSchema`**: `staffId`, `name`, `role` (`StaffRoleSchema`).
- **`CrmMaintenanceDetailResponseSchema`** (single-record): item fields (minus `allowedUserCount`) + `message`, `note`, `allowedUsers: CrmMaintenanceAllowedUserResponse[]`, `createdBy`, `updatedBy`, `updatedAt`, **`notified?: boolean`** (FR-007 delta; optional — mock-ahead).
- **`SendCrmMaintenanceNotificationResponseSchema`** (FR-007 delta): `{ message: string; notified: boolean }`, returned `200`. The send endpoint takes **no request body**.
- **`GetCrmMaintenancesQuerySchema`**: `page` (default 1), `limit` (25/50/100/200, default 50), `search?` (ID/title partial match), `status?`, `sort` (`startsAt`\|`endsAt`\|`createdAt`, default `startsAt`), `order` (`asc`\|`desc`, default `desc`) — mirrors FR-010.
- **`GetCrmMaintenancesResponseSchema`**: `{ items: CrmMaintenanceItemResponse[], pagination: { page, limit, totalItems, totalPages } }`.

## Seed data

Base the seed rows on the UI prototype's sample data (`crm-maintenance-list.tsx`'s `MAINTENANCES` array — same titles, same relative allowed-user counts), but computed **relative to the seed's own execution time** (research.md §7), not the prototype's literal 2025-12–2026-07 dates, so the set always contains a mix of `completed` and `planned` rows regardless of when the mock DB is seeded, plus one row deliberately straddling `now()` for `in_progress` (and its start-date/delete locks) to be directly observable without waiting.

| id    | title                     | starts_at (relative to seed time) | ends_at (relative to seed time) | allowed users         | purpose                                                                                                               |
| ----- | ------------------------- | --------------------------------- | ------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| M-001 | 初期メンテナンス          | `now - 120d`                      | `now - 120d + 4h`               | 3 staff (mixed roles) | completed                                                                                                             |
| M-002 | サーバー増強作業          | `now - 90d`                       | `now - 90d + 2h`                | 4 staff               | completed                                                                                                             |
| M-003 | DB移行作業                | `now - 60d`                       | `now - 60d + 5h`                | 5 staff               | completed                                                                                                             |
| M-004 | 緊急セキュリティパッチ    | `now - 30d`                       | `now - 30d + 2h`                | 2 staff               | completed (recent)                                                                                                    |
| M-005 | 検索インデックス再構築    | `now - 2h`                        | `now + 4h`                      | 2 staff               | **in_progress** — exercises FR-016 (start-date lock), FR-019 (delete lock), FR-017 (allowed-user add still permitted) |
| M-006 | 2026年7月定期メンテナンス | `now + 14d`                       | `now + 14d + 3h`                | 3 staff               | **planned** — exercises normal edit/delete flow                                                                       |

Each seed row's allowed-user `staff_id`s reference existing seeded `db.staffs` rows (`STF-001`, `STF-002`, …) so the join resolves real names/roles on first run with no extra setup.

**Notification seed values (FR-007 delta, simplified).** Seed `notified` so both the list column and detail card are observable:

- M-001…M-005: `notified = true` (済). List shows — for the `completed` ones (status-driven) and 済 for the `in_progress` M-005; detail shows 通知済み.
- The `planned` row (M-006): `notified = false` (未) → exercises the send flow and the list 未 badge.
