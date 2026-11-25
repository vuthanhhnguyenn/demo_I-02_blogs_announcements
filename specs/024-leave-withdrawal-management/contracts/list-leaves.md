# Contract: List suspension & withdrawal applications

**Endpoint**: `GET /api/crm/leaves`
**Status**: exists — **modify**
**Schema**: `src/app/api/_schemas/leave.schema.ts` → `GetLeavesQuerySchema`, `GetLeavesResponseSchema`
**Handler**: `src/app/api/crm/leaves/route.ts`
**Generated client**: `getCrmLeavesOptions` / `getCrmLeavesQueryKey`
**Real-API counterpart**: `GET /api/v1/admin/suspension-withdrawal-applications`
**Requirements**: FR-003, FR-007 – FR-035a

## Query parameters

| Param              | Type                             | Default          | Change                      | Notes                                                                                                                                                                                |
| ------------------ | -------------------------------- | ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page`             | integer ≥ 1                      | `1`              | —                           |                                                                                                                                                                                      |
| `limit`            | integer 1–100                    | `25`             | **CHANGED** default 20 → 25 | Cap stays 100; 200 is rejected (research.md §1)                                                                                                                                      |
| `search`           | string                           | —                | —                           | Matches `application_number` or `member_name`, server-side (FR-019a)                                                                                                                 |
| `type`             | `LeaveType`                      | —                | —                           |                                                                                                                                                                                      |
| `status`           | `LeaveStatus`                    | —                | **CHANGED**                 | `completed` MUST be rejected as a list filter value (Q-10)                                                                                                                           |
| `brand`            | `Brand`                          | —                | **CHANGED**                 | Typed enum, matched on the record's brand (FR-024)                                                                                                                                   |
| `scope_store_id`   | string                           | —                | **ADDED**                   | Header store scope — applied _with_ the role scope, **before** `total_all` is counted (FR-003, FR-024). See "Why two store parameters" below                                         |
| `store_id`         | string                           | —                | —                           | In-screen 店舗 filter, applied _after_ the scope filter and _excluded_ from `total_all`                                                                                              |
| `scheduled_period` | `ScheduledPeriod`                | —                | —                           | Resolves to an inclusive JST range (FR-025a)                                                                                                                                         |
| `sort_by`          | `applied_at` \| `scheduled_date` | `scheduled_date` | **CHANGED**                 | `id` removed with its column; default was `applied_at`. **A-03 never sends this** — the screen has no sort control (Q-13); the parameter stays so the mock matches the real contract |
| `sort_order`       | `asc` \| `desc`                  | `asc`            | **CHANGED**                 | Was `desc`. **A-03 never sends this** — see `sort_by`                                                                                                                                |

## Response `200`

```jsonc
{
  "leaves": [
    /* LeaveListItem[] — see data-model.md entity 1 */
  ],
  "total": 8, // rows matching scope + all filters
  "total_all": 24, // NEW — rows matching scope only, for the filter banner (FR-027)
  "page": 1,
  "limit": 25,
  "total_pages": 1,
}
```

`total_all` is the banner's "全 N 件中" figure — the scoped baseline before in-screen filters. It mirrors the real contract's `pagination.totalAllItems`.

## Why two store parameters

The role scope alone does not express the caller's _effective_ scope. A Manager's role scope spans every managed store, but the header switcher narrows them to one store at a time — and FR-004 hides both the 店舗名 column and the in-screen 店舗 filter under that narrowing. Sending the header store as the ordinary `store_id` filter would therefore either hide the column over rows from several stores (if not sent) or corrupt `total_all` (if sent), because FR-026 excludes the header scope from the banner while FR-024 includes the in-screen filter in it.

`scope_store_id` carries the header selection and `store_id` carries the in-screen filter, so each lands on the correct side of the `total_all` cut. Only one of the two is ever populated by A-03: the header scope when it is a single store, the in-screen filter when it is 全店舗.

**Backend request**: the real endpoint currently exposes only `storeId`. This distinction needs to reach it, or `pagination.totalAllItems` will be wrong for Managers and for Headquarter users browsing a single store. Raised via the standing API QA process; mocked here in the meantime.

## Behaviour

1. **Scope first.** Apply the caller's role store scope, then `scope_store_id`, before any user filter (FR-003). System/HQ see all stores; Manager sees managed stores; Staff/Observer see their own. Trainer never reaches this endpoint. `total_all` is counted here.
2. **Exclude `completed`.** Filter it out server-side so `total` and `total_pages` stay truthful (research.md §3).
3. Apply `search`, `type`, `status`, `brand`, `store_id`, `scheduled_period`.
4. Sort by `sort_by` / `sort_order`.
5. Paginate; clamp the effective page to the last available page (FR-034).
6. Compute `cancellable` and `cancellation_blocked_reason` per row using the guard chain in data-model.md.

## Errors

| Status | When                                                                      |
| ------ | ------------------------------------------------------------------------- |
| `400`  | Query validation failure — including `limit > 100` and `status=completed` |
| `403`  | Trainer role                                                              |
| `500`  | Unexpected                                                                |

## Out of scope

No `include_completed` flag. No free-text search beyond application number and member name — member-centric search belongs to A-01 (spec Out of Scope).
