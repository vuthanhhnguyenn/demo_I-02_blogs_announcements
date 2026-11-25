# Data Model: Entry/Exit History (B-01-01)

Derived from `spec.md`'s Key Entities and Functional Requirements, resolved against this codebase's existing mock-DB structures per `research.md` (R2, R3, R6, R7).

## EntryExitLogRow (persisted, extended)

Location: `src/app/api/_mock-db/types/entry-exit-logs.type.ts` (existing table, extended — shared with feature 013).

| Field             | Type                                 | Notes                                                                                                                                        |
| ----------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`                             | Existing.                                                                                                                                    |
| `member_id`       | `string`                             | Existing.                                                                                                                                    |
| `store_id`        | `string`                             | Existing. The **visiting store** (入館店舗) — where the gate device recorded this event.                                                     |
| `direction`       | `'entry' \| 'exit'`                  | Existing.                                                                                                                                    |
| `occurred_at`     | `string` (ISO datetime)              | Existing.                                                                                                                                    |
| `gate`            | `string`                             | Existing.                                                                                                                                    |
| `frequency_badge` | `'regular' \| 'longAbsence' \| null` | Existing (Phase 2 only; not surfaced by this feature).                                                                                       |
| `companion_role`  | `'inviter' \| 'invitee' \| null`     | Existing (Phase 2 only; not surfaced by this feature).                                                                                       |
| `auth_method`     | `'qr' \| 'nfc'`                      | **New.** Set on every row, entry and exit alike.                                                                                             |
| `result`          | `'success' \| 'denied'`              | **New.** Only `'denied'` is possible on `direction: 'entry'` rows; always `'success'` on `direction: 'exit'` rows (an exit is never denied). |

**Validation rules**:

- A `direction: 'entry'` row with `result: 'denied'` MUST NOT have a corresponding `exit` row (a denied attempt produces no visit).
- `auth_method` is required on every row (no visit is authenticated without one of the two methods).

## HistoryVisitRow (derived response view-model, new)

Location: new schema in `src/app/api/_schemas/entry-exit-log.schema.ts`. Built by `entryExitLogs.listHistory()` (new table method) by pairing `EntryExitLogRow` rows per Decision R2, then joining `Member` fields (name, furigana, gender, avatar_url, contract_name, contract_id, home `store_id`/`store_name`).

| Field                                 | Type                                       | Notes                                                                                                                          |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `entry_log_id`                        | `string`                                   | The underlying entry-direction `EntryExitLogRow.id`.                                                                           |
| `exit_log_id`                         | `string \| null`                           | The paired exit-direction row's id; `null` while in progress or when denied.                                                   |
| `member_id`                           | `string`                                   | Joined.                                                                                                                        |
| `name`                                | `string`                                   | Joined from `Member`.                                                                                                          |
| `furigana`                            | `string`                                   | Joined from `Member`.                                                                                                          |
| `gender`                              | `Gender`                                   | Joined from `Member` (reuse `GenderSchema`).                                                                                   |
| `avatar_url`                          | `string \| null`                           | Joined from `Member`.                                                                                                          |
| `contract_name`                       | `string`                                   | Joined from `Member`'s active contract.                                                                                        |
| `contract_id`                         | `string`                                   | Joined from `Member`'s active contract.                                                                                        |
| `visit_date`                          | `string` (YYYY-MM-DD)                      | Derived from `entry_log_id`'s `occurred_at` (or the attempt timestamp, for a denied row).                                      |
| `entry_time`                          | `string` (ISO datetime)                    | For a denied row, this is the attempted-access timestamp (FR-010).                                                             |
| `exit_time`                           | `string \| null`                           | `null` when in progress or denied.                                                                                             |
| `stay_duration_minutes`               | `number \| null`                           | `null` when in progress or denied; otherwise `exit_time − entry_time`.                                                         |
| `visit_status`                        | `'completed' \| 'in_progress' \| 'denied'` | Drives FR-010's blank/"in facility" rendering rules; `'in_progress'` when `exit_log_id` is `null` and `result` is `'success'`. |
| `home_store_id` / `home_store_name`   | `string`                                   | The member's own registered store (所属店舗) — from `Member`, not the log row.                                                 |
| `visit_store_id` / `visit_store_name` | `string`                                   | The store where the visit occurred (入館店舗) — from the log row's `store_id`.                                                 |
| `auth_method`                         | `'qr' \| 'nfc'`                            | From the entry-direction row.                                                                                                  |
| `result`                              | `'success' \| 'denied'`                    | From the entry-direction row.                                                                                                  |

**Relationships**: One `HistoryVisitRow` corresponds to one or two `EntryExitLogRow`s (one for a denied/in-progress visit, two for a completed one) and one `Member`.

**State transitions** (implicit, not a stored state machine — derived at query time from row presence):
`denied` (entry row, `result='denied'`, no exit) → _(terminal, no further transition)_
`in_progress` (entry row, `result='success'`, no matching exit yet) → `completed` (once a matching exit row exists)

## QuickViewContextSchema (schema change, extends existing quick-view contract)

Location: `src/app/api/_schemas/entry-exit-log.schema.ts`. New enum, decoupled from `EntryExitDirectionSchema` per Decision R7.

| Value           | Meaning                                                                            | Used by                                           |
| --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| `'entry'`       | Just entered (event-level, feature 013's activity feed).                           | Existing (013), unchanged.                        |
| `'exit'`        | Exited (event-level, feature 013's activity feed; also a completed history visit). | Existing (013) + this feature (completed visits). |
| `'in-building'` | **New.** Still on-site (this feature's in-progress visits only).                   | This feature only.                                |
| `'denied'`      | **New.** Entry was denied (this feature's denied records only).                    | This feature only.                                |

`MemberQuickViewSchema.context` changes type from `EntryExitDirectionSchema` to `QuickViewContextSchema`; `GetEntryExitLogsQuerySchema.direction` (feature 013, list-by-direction) is unaffected — it keeps using `EntryExitDirectionSchema` as-is.

## Query/Filter parameters (GetEntryExitHistoryQuery, new)

| Field                   | Type                                                                                               | Notes                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page`                  | `number`, default `1`                                                                              | Standard pagination.                                                                                                                                     |
| `limit`                 | `number`, default `30`, max `100`                                                                  | Standard pagination (matches `GetLockerPendingSlotsQuerySchema`'s bounds).                                                                               |
| `search`                | `string?`                                                                                          | Matches member name or member ID (FR-002).                                                                                                               |
| `date_from` / `date_to` | `string?` (YYYY-MM-DD)                                                                             | Visit-date range filter (FR-003), matching the `cancel_date_from`/`cancel_date_to` naming convention already used by `GetLockerPendingSlotsQuerySchema`. |
| `store_id`              | `string?`                                                                                          | Visiting-store filter (FR-004); only meaningful when the caller can access 2+ stores.                                                                    |
| `auth_method`           | `'qr' \| 'nfc'?`                                                                                   | FR-005.                                                                                                                                                  |
| `result`                | `'success' \| 'denied'?`                                                                           | FR-006.                                                                                                                                                  |
| `sort_by`               | `'name' \| 'visit_date' \| 'entry_time' \| 'exit_time' \| 'contract_name'`, default `'visit_date'` | FR-011.                                                                                                                                                  |
| `sort_order`            | `'asc' \| 'desc'`, default `'desc'`                                                                | FR-011.                                                                                                                                                  |

`ExportEntryExitHistoryQuerySchema` = the same shape, omitting `page`/`limit` (Decision R4, matching `ExportLockerPendingSlotsQuerySchema`).

## Seed requirements

`entry-exit-log.seed.ts` must be extended to cover every state this screen renders, so manual verification (`quickstart.md`) can exercise each branch without further data setup:

- At least one **completed** visit (entry + exit rows, `result: 'success'`).
- At least one **in-progress** visit (entry row only, `result: 'success'`, no matching exit, `occurred_at` today).
- At least one **denied** record (`result: 'denied'`, no exit row).
- At least one member with `home_store_id !== visit_store_id` (相互利用, exercising the two-store-column display).
- Coverage of both `auth_method` values.
- At least one store/date-range combination that yields zero rows for the default filter state (exercises the empty-state distinction from Decision R10) — e.g. a store with no seeded activity in the default date range.
