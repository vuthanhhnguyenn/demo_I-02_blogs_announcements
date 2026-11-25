# Data Model: Leave & Withdrawal Management (A-03)

**Feature**: `024-leave-withdrawal-management` | **Date**: 2026-08-05 | **Plan**: [plan.md](./plan.md)

Source of truth for Phase 1 is `src/app/api/_schemas/leave.schema.ts` (Zod → OpenAPI → generated client). This document describes the **target** shape; deltas from the schema as it stands today are marked **NEW** or **CHANGED**.

Field naming stays `snake_case` to match the existing schema and the rest of the project's mock API. The real backend uses `camelCase`; that translation is a Phase 2 concern and does not affect the UI, which consumes generated types either way.

---

## Enumerations

### `LeaveType`

| Value        | Display | Notes |
| ------------ | ------- | ----- |
| `suspension` | 休会    |       |
| `withdrawal` | 退会    |       |

### `LeaveStatus` (lifecycle — 5 values)

| Value                  | Display      | In list? | Notes                                                                                          |
| ---------------------- | ------------ | -------- | ---------------------------------------------------------------------------------------------- |
| `suspension_scheduled` | 休会予定     | ✅       |                                                                                                |
| `suspended`            | 休会中       | ✅       |                                                                                                |
| `withdrawal_scheduled` | 退会予定     | ✅       | The only state from which a cancellation may start                                             |
| `withdrawal_pending`   | 退会処理待ち | ✅       | Due date arrived, System batch pending                                                         |
| `completed`            | 処理完了     | ❌       | **CHANGED** — excluded from list responses and from the ステータス filter (Q-10). Detail only. |

The four list-facing values correspond 1:1 to the real contract's `displayStatus`; `completed` corresponds to its lifecycle `status`. Keeping one enum with a list-facing subset mirrors that split without duplicating the type.

### `CancellationBlockedReason` — **NEW**

| Value                      | Meaning                                                | Tooltip (FR-047 / FR-048)                |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| `not_cancellable_status`   | Application is not in a cancellable state              | 退会処理が開始されているため取り消し不可 |
| `batch_processing_started` | Member is `withdrawal_pending`; the batch owns the row | 退会処理が開始されているため取り消し不可 |
| `usage_started`            | Usage start date has arrived                           | 利用開始日以降のため取り消し不可         |

### `ScheduledPeriod`

`current_month` · `next_month` · `current_year` (absent = all periods). Each resolves to an inclusive JST date range (FR-025a).

### `ProxyAgreementMethod` — **NEW** (currently a free-text `consent_method`)

`in_person` (来店) · `phone` (電話) · `email` (メール) · `line` (LINE). Constrained to match the real contract (FR-066).

---

## Entities

### 1. Leave (list row) — `LeaveListItem`

One suspension or withdrawal application as it appears in the list.

| Field                         | Type                                | Req. | Notes                                                                                        |
| ----------------------------- | ----------------------------------- | ---- | -------------------------------------------------------------------------------------------- |
| `id`                          | string                              | ✅   | Internal record id — used for routing and query keys, **never displayed** (FR-009)           |
| `application_number`          | string                              | ✅   | **NEW** — human-readable receipt number; the value shown as 申請ID on the detail (FR-058)    |
| `member_id`                   | string                              | ✅   | Internal member id — routing only                                                            |
| `member_number`               | string                              | ✅   | **NEW** — the value shown in the 会員ID column, e.g. `JF-0000101` (FR-009)                   |
| `member_name`                 | string                              | ✅   | 会員名                                                                                       |
| `brand`                       | `Brand`                             | ✅   | **CHANGED** — typed to the project's 5-value `Brand` enum rather than a free string (FR-024) |
| `store_id`                    | string                              | ✅   | Scope + filter key                                                                           |
| `store_name`                  | string                              | ✅   | 店舗名 — column hidden under a single-store header scope (FR-004)                            |
| `type`                        | `LeaveType`                         | ✅   | Drives the row-action menu (FR-045); **no longer a visible column** (FR-008)                 |
| `status`                      | `LeaveStatus`                       | ✅   | Never `completed` in list responses                                                          |
| `applied_at`                  | string                              | ✅   | 申請日 — sortable (FR-035a)                                                                  |
| `scheduled_date`              | string                              | ✅   | 予定日 — suspension start / withdrawal due date; sortable, default sort key                  |
| `end_date`                    | string \| null                      | ✅   | 終了日 — null for withdrawals, rendered `—` (FR-012)                                         |
| `unpaid_amount`               | number                              | ✅   | 未納金 in yen (FR-013)                                                                       |
| `cancellable`                 | boolean                             | ✅   | **NEW** — server-derived; enables the row-action item (FR-046)                               |
| `cancellation_blocked_reason` | `CancellationBlockedReason` \| null | ✅   | **NEW** — null when `cancellable`; selects the tooltip (FR-047, FR-048)                      |

**Removed from the visible table** (still in the payload where noted): 申請ID column and 種別 column — neither appears in FR-008's column list.

### 2. Leave (detail) — `LeaveDetail`

Everything in the list row, plus:

| Field                | Type                           | Req. | Notes                                                                           |
| -------------------- | ------------------------------ | ---- | ------------------------------------------------------------------------------- |
| `member`             | `LeaveMember`                  | ✅   | **NEW** — the expanded member block (see entity 3)                              |
| `reason`             | string                         | ✅   | 理由                                                                            |
| `applicant`          | string                         | ✅   | 申請者                                                                          |
| `is_proxy_applied`   | boolean                        | ✅   | Gates the 代理申請情報 card (FR-065)                                            |
| `proxy_applicant`    | string \| null                 | ✅   |                                                                                 |
| `consent_at`         | string \| null                 | ✅   | 合意日時                                                                        |
| `consent_method`     | `ProxyAgreementMethod` \| null | ✅   | **CHANGED** — enum, not free text (FR-066)                                      |
| `suspension_fee`     | number \| null                 | ✅   | 休会費 (¥/month), suspensions only                                              |
| `withdrawal_fee`     | number \| null                 | ✅   | **NEW** — 退会手数料, withdrawals only. Fixes the hardcoded `—` (Q-07 / FR-067) |
| `applied_campaign`   | string                         | ✅   | 適用キャンペーン                                                                |
| `unused_lessons`     | number                         | ✅   | 未消化レッスン — **must be populated for both types** (Q-07 / FR-068)           |
| `unpaid_amount`      | number                         | ✅   | 未納金                                                                          |
| `usage_start_date`   | string \| null                 | ✅   | **NEW** — the cancel-guard input, surfaced for transparency                     |
| `suspension_history` | `SuspensionHistoryMonth[]`     | ✅   | **NEW** — the strip's month map (see entity 4)                                  |
| `created_at`         | string                         | ✅   |                                                                                 |
| `updated_at`         | string                         | ✅   | 最終更新 on the status card (FR-075)                                            |

Both `suspension_fee` and `withdrawal_fee` are nullable and mutually exclusive by type; the 関連情報 card picks the label and the value by `type` (FR-067).

### 3. Leave member block — `LeaveMember` — **NEW**

Feeds the head-up card in a single request (FR-057a). Every field already exists on the real member-detail response; this is a projection onto A-03 (Q-15).

| Field                | Type           | Req. | Notes                                      |
| -------------------- | -------------- | ---- | ------------------------------------------ |
| `member_id`          | string         | ✅   | Routing to A-01-01                         |
| `member_number`      | string         | ✅   | Shown as "ID:"                             |
| `name`               | string         | ✅   |                                            |
| `name_kana`          | string \| null | ✅   |                                            |
| `legacy_member_code` | string \| null | ✅   | Shown as "旧No:"; null for net-new members |
| `member_type`        | string \| null | ✅   | Badge                                      |
| `contract_name`      | string \| null | ✅   | Badge, "主契約: {name}"                    |
| `store_name`         | string         | ✅   | Shown as "主契約店舗:"                     |
| `face_photo_url`     | string \| null | ✅   | Card avatar                                |

### 4. Suspension history month — `SuspensionHistoryMonth` — **NEW**

One marked month in the 休会・退会履歴 strip. **Derived** from the member's applications, not separately seeded (research.md §6), and read-only (FR-074).

| Field                | Type                                            | Req. | Notes                     |
| -------------------- | ----------------------------------------------- | ---- | ------------------------- |
| `year_month`         | string                                          | ✅   | `YYYY/MM`                 |
| `status`             | `active` \| `pending-leave` \| `pending-retire` | ✅   | Drives the badge (FR-070) |
| `application_number` | string \| null                                  | ✅   | Shown beneath the badge   |

Unmarked months are simply absent from the array; the strip renders them as normal.

---

## Relationships

```text
Member ──1:N──> Leave ──0:1──> Store          (via store_id — the scope boundary)
  │
  └──derives──> SuspensionHistoryMonth[]      (projection over that member's Leaves)

Leave.member ──1:1──> LeaveMember             (embedded projection, detail only)
```

A member may hold several applications at once — one suspension and one withdrawal, for instance — so the list is per application and rows must never be merged by member (spec Edge Cases).

---

## State transitions

Only one transition is in A-03's scope. Everything else is performed by A-01-01 or by a System batch (spec Out of Scope).

```text
withdrawal_scheduled ──[退会取り消し]──> (application closed; member returns to normal)
```

**Guard chain** (evaluated server-side, in order, at execution time — FR-052):

1. `status !== 'withdrawal_scheduled'` → blocked, `not_cancellable_status`
2. `status === 'withdrawal_pending'` → blocked, `batch_processing_started`
3. `usage_start_date != null && usage_start_date <= today` (JST) → blocked, `usage_started`
4. otherwise → allowed

A null `usage_start_date` counts as "not started" and passes (spec Edge Cases). The guard is re-evaluated on execution, never trusted from the loaded row.

Transitions **not** in scope, listed so they are not reintroduced: `→ approved`, `→ rejected`, `withdrawal_pending → completed` (batch), `suspension_scheduled → suspended` (date arrival), `suspended → completed` (date arrival).

---

## Validation rules

| Rule                                                                                               | Source                  |
| -------------------------------------------------------------------------------------------------- | ----------------------- |
| `limit` ∈ [1, 100]; page-size selector offers 25 / 50 / 100                                        | FR-031, research.md §1  |
| `page` ≥ 1; effective page clamps to the last available page                                       | FR-034                  |
| `sort_by` ∈ {`applied_at`, `scheduled_date`}, default `scheduled_date`; `sort_order` default `asc` | FR-035a, research.md §2 |
| List responses never contain `status = completed`                                                  | FR-010, FR-022          |
| `end_date` is null whenever `type = withdrawal`                                                    | FR-012                  |
| `withdrawal_fee` is null whenever `type = suspension`, and vice versa for `suspension_fee`         | FR-067                  |
| `proxy_applicant` / `consent_at` / `consent_method` are non-null whenever `is_proxy_applied`       | FR-065                  |
| `cancellation_blocked_reason` is null iff `cancellable` is true                                    | FR-046 – FR-048         |
| Store scope is applied server-side before any user filter                                          | FR-003, research.md §5  |
| Search matches `application_number` or `member_name`, server-side over the whole filtered set      | FR-019, FR-019a         |

---

## Mock table & seed

`src/app/api/_mock-db/tables/member-leave.table.ts` — **NEW**, following the `banners` / `app-maintenance` table pattern. `src/app/api/_mock-db/types/member-leaves.type.ts` already declares the shape and needs trimming to the surviving operations: `list()`, `getById()`, `getActiveSuspensionByMemberId()`, `cancelWithdrawal()`. The `approve` / `reject` / `executeWithdrawal` / `create` / `createSuspension` members are dropped with the routes that use them.

`src/app/api/_mock-db/seeds/member-leave.seed.ts` — **NEW**. Must cover, so the quickstart checklist is exercisable:

- at least one row per list status (4 rows minimum), none `completed`
- at least one withdrawal that **is** cancellable and one blocked by each of the three reasons
- at least one proxy application and one non-proxy application
- at least one member holding two concurrent applications (row-merging edge case)
- rows across ≥ 2 stores and ≥ 3 brands, to exercise scope and the brand filter
- a member whose suspension history produces a non-contiguous strip (e.g. suspended, normal, suspended, scheduled)
