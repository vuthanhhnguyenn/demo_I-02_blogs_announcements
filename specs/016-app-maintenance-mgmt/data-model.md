# Data Model: Y-06 App Maintenance Management

**Input**: [spec.md](spec.md) Key Entities + Functional Requirements; conventions confirmed in [research.md](research.md).

## Entity: AppMaintenance (mock table `appMaintenances`)

Row shape (`AppMaintenanceSchema`, snake_case — internal/storage representation, per research.md §2):

| Field          | Type                         | Required       | Notes                                                 |
| -------------- | ---------------------------- | -------------- | ----------------------------------------------------- |
| `id`           | `string`                     | yes            | `AM-{NNN}` sequential, e.g. `AM-001` (research.md §3) |
| `target_brand` | `'joyfit' \| 'fit365'`       | yes            | Immutable after creation (research.md §8 / spec Q4)   |
| `starts_at`    | `string` (ISO 8601 datetime) | yes            | Maintenance window start                              |
| `ends_at`      | `string` (ISO 8601 datetime) | yes            | Must be after `starts_at` (FR-012)                    |
| `message`      | `string`, 1–1000 chars       | yes            | Member-facing maintenance message (FR-012)            |
| `created_by`   | `string`                     | yes            | Creator staff ID                                      |
| `updated_by`   | `string \| null`             | yes (nullable) | Last updater staff ID; `null` until first update      |
| `created_at`   | `string` (ISO 8601 datetime) | yes            | Set on insert                                         |
| `updated_at`   | `string \| null`             | yes (nullable) | Set on each update; `null` until first update         |

**Not part of the Phase 1 data model** (spec.md Out of Scope / research.md §8): `title`, `note`, and a third `'all'` value for `target_brand`.

### Derived field: `status` (never stored)

Computed identically to `banners`' `computeStatus()` (research.md §1), evaluated against `now()` at read time:

```
status =
  now() <  starts_at  → 'planned'       (予定)
  starts_at <= now() <= ends_at → 'in_progress'  (メンテナンス中)
  now() >  ends_at    → 'completed'     (完了)
```

`AppMaintenanceStatusSchema = z.enum(['planned', 'in_progress', 'completed'])`. This is FR-007; it is exposed on every response schema but accepted on **no** request schema (create or update).

### Validation rules (FR-012)

| Rule                                                                                 | Enforcement point                                                                                                                      |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `target_brand` one of `joyfit`/`fit365`                                              | Zod enum, create only                                                                                                                  |
| `starts_at` required, valid datetime                                                 | Zod, create                                                                                                                            |
| `ends_at` required, valid datetime, after `starts_at`                                | Zod `.refine()` on create; table-layer check on update (effective end vs. effective start, since either can be omitted in a PATCH)     |
| `message` required, 1–1000 chars                                                     | Zod, create + update                                                                                                                   |
| No two rows with the same `target_brand` may have overlapping `[starts_at, ends_at)` | Table-layer check (`create`, `update` excluding self), against **all** rows for that brand including `completed` ones (research.md §6) |
| `starts_at` cannot change while derived `status === 'in_progress'`                   | Table-layer check (`update`)                                                                                                           |
| Row cannot be deleted while derived `status === 'in_progress'`                       | Table-layer check (`delete`)                                                                                                           |

### State transitions

`status` has no explicit transition API — it is a pure function of `now()` vs. `starts_at`/`ends_at`, so it moves `planned → in_progress → completed` automatically as time passes, with two guarded transitions layered on top:

- While `in_progress`: `starts_at` is frozen (edit-locked) and the row cannot be deleted.
- `planned` and `completed` rows: fully editable (except `target_brand`) and deletable.

## Relationships

- `created_by` / `updated_by` reference a staff record (`db.staffs`) by ID — informational only for Phase 1 (no join is exposed in list/detail responses beyond the raw ID; matches spec's Key Entities, which lists "creator"/"last updater" without requiring a resolved staff name/avatar).
- No relationship to Y-05 (App Release Version Management) data at the schema level — the two features only need to stay logically consistent in _when_ their windows occur (spec's Out of Scope), which is a content/process concern for staff registering both, not a foreign key.
- No relationship to Y-10 (CRM Maintenance Management) — confirmed unrelated feature (spec's Source Discrepancy Note).

## Request/Response DTOs (camelCase — wire representation, per research.md §2)

- **`CreateAppMaintenanceBodySchema`**: `targetBrand`, `startsAt`, `endsAt`, `message` — all required.
- **`UpdateAppMaintenanceBodySchema`**: `startsAt?`, `endsAt?`, `message?` — all optional (partial update); **no `targetBrand` field** (immutable, research.md §8).
- **`AppMaintenanceItemResponseSchema`** (list row): `id`, `targetBrand`, `startsAt`, `endsAt`, `message`, `status`, `createdAt`.
- **`AppMaintenanceDetailResponseSchema`** (single-record): item fields + `createdBy`, `updatedBy`, `updatedAt`.
- **`GetAppMaintenancesQuerySchema`**: `page` (default 1), `limit` (25/50/100/200, default 50), `search?` (ID/message partial match), `brand?`, `status?`, `sort` (`startsAt` \| `endsAt`, default `startsAt`), `order` (`asc`\|`desc`, default `desc`) — mirrors FR-001–FR-005.
- **`GetAppMaintenancesResponseSchema`**: `{ items: AppMaintenanceItemResponse[], pagination: { page, limit, totalItems, totalPages } }`.

## Seed data

Base the 5 mock rows on the UI prototype's sample data (`app-maintenance-list.tsx`'s `MAINTENANCES` array — same brands, same message text, same relative ordering), translating brand labels to the lowercase enum and dates to ISO 8601. **Do not reuse the prototype's literal dates as-is**: all 5 (Feb–Apr 2026) are already in the past relative to this spec's reference date (2026-07-10), which would seed every row as `completed` and leave no `planned`/`in_progress` row to manually verify FR-007/FR-010/FR-011 against. Instead, compute seed dates **relative to the seed's own execution time** (e.g. `now - 90d`, `now - 60d`, `now - 30d`, `now - 7d`, `now + 14d`) so the set always contains a mix of `completed`, and at least one `planned`, row regardless of when the mock DB is seeded. Add one additional row whose window straddles `now()` (e.g. `now - 1h` to `now + 3h`) so `in_progress` (and its edit/delete locks) is also directly observable without waiting — this 6th row has no prototype equivalent but is necessary for manual QA (see [quickstart.md](quickstart.md)).

| id     | target_brand | starts_at (relative to seed time) | ends_at (relative to seed time) | purpose                                                                       |
| ------ | ------------ | --------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| AM-001 | fit365       | `now - 90d`                       | `now - 90d + 4h`                | completed                                                                     |
| AM-002 | joyfit       | `now - 60d`                       | `now - 60d + 2h`                | completed                                                                     |
| AM-003 | fit365       | `now - 30d`                       | `now - 30d + 4h`                | completed                                                                     |
| AM-004 | joyfit       | `now - 7d`                        | `now - 7d + 4h`                 | completed (recent)                                                            |
| AM-005 | fit365       | `now - 1h`                        | `now + 3h`                      | **in_progress** — exercises FR-010 (start-date lock) and FR-011 (delete lock) |
| AM-006 | joyfit       | `now + 14d`                       | `now + 14d + 4h`                | **planned** — exercises normal edit/delete flow                               |
