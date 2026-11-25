# Contract: GET /api/crm/entry-exit-logs/history

**Feature**: 015-entry-exit-history (B-01-01)
**Phase**: Phase 1 mock route handler
**Purpose**: Provide the paginated, filterable, searchable list of past (completed, in-progress, or denied) entry/exit visits for the history screen (FR-001–FR-011, FR-015, FR-018).

---

## Request

`GET /api/crm/entry-exit-logs/history`

### Query Parameters

| Param         | Type                                                                     | Required | Default                    | Description                                                                                   |
| ------------- | ------------------------------------------------------------------------ | -------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `page`        | number                                                                   | no       | `1`                        | Page number                                                                                   |
| `limit`       | number                                                                   | no       | `30` (max `100`)           | Page size                                                                                     |
| `search`      | string                                                                   | no       | —                          | Matches member name or member ID (FR-002)                                                     |
| `date_from`   | string (`YYYY-MM-DD`)                                                    | no       | screen default range start | Visit-date range start (FR-003)                                                               |
| `date_to`     | string (`YYYY-MM-DD`)                                                    | no       | screen default range end   | Visit-date range end (FR-003)                                                                 |
| `store_id`    | string                                                                   | no       | —                          | Visiting-store filter (FR-004); ignored/hidden client-side unless caller can access 2+ stores |
| `auth_method` | `qr` \| `nfc`                                                            | no       | —                          | FR-005                                                                                        |
| `result`      | `success` \| `denied`                                                    | no       | —                          | FR-006                                                                                        |
| `sort_by`     | `name` \| `visit_date` \| `entry_time` \| `exit_time` \| `contract_name` | no       | `visit_date`               | FR-011                                                                                        |
| `sort_order`  | `asc` \| `desc`                                                          | no       | `desc`                     | FR-011                                                                                        |

### Authorization

Requires `Permission.EntryExitHistoryView`, enforced at the page-route level by `proxy.ts` — this endpoint itself does not re-check the permission (research.md R11), matching the sibling `GET /crm/entry-exit-logs` endpoint, which likewise has no permission check of its own. Results are scoped server-side to `getAllowedStoreIds(user)` intersected with `store_id` if provided (FR-008) — a `store_id` outside the caller's allowed scope yields zero rows, not a 403. A 403 is returned only when `getAllowedStoreIds` resolves to an empty array (a role with zero store access).

---

## Response 200

```json
{
  "history": [
    {
      "entry_log_id": "EEL-000201",
      "exit_log_id": "EEL-000202",
      "member_id": "MEM-3750008421",
      "name": "田中太郎",
      "furigana": "タナカタロウ",
      "gender": "male",
      "avatar_url": "/avatars/3.jpg",
      "contract_name": "フィットネスクレジット会員(相互利用あり)",
      "contract_id": "3750008421",
      "visit_date": "2026-11-30",
      "entry_time": "2026-11-30T09:05:00.000Z",
      "exit_time": "2026-11-30T10:32:00.000Z",
      "stay_duration_minutes": 87,
      "visit_status": "completed",
      "home_store_id": "store-fit365-yashio",
      "home_store_name": "FIT365八潮店",
      "visit_store_id": "store-fit365-yashio",
      "visit_store_name": "FIT365八潮店",
      "auth_method": "qr",
      "result": "success"
    }
  ],
  "pagination": { "page": 1, "limit": 30, "total": 247, "total_pages": 9 }
}
```

## Response 200 (in-progress visit)

```json
{
  "entry_log_id": "EEL-000301",
  "exit_log_id": null,
  "entry_time": "2026-07-08T04:15:00.000Z",
  "exit_time": null,
  "stay_duration_minutes": null,
  "visit_status": "in_progress",
  "result": "success"
}
```

## Response 200 (denied record)

```json
{
  "entry_log_id": "EEL-000305",
  "exit_log_id": null,
  "entry_time": "2026-07-08T00:30:00.000Z",
  "exit_time": null,
  "stay_duration_minutes": null,
  "visit_status": "denied",
  "result": "denied"
}
```

## Response 200 (empty)

```json
{ "history": [], "pagination": { "page": 1, "limit": 30, "total": 0, "total_pages": 0 } }
```

The client distinguishes a filtered-to-zero result from a genuinely empty dataset by whether any filter differs from its default (FR-018) — this is a client-side concern, not signaled differently by this endpoint.

---

## Response 400

```json
{ "error": "date_to must not be earlier than date_from" }
```

## Response 403

```json
{ "error": "Forbidden" }
```

Returned when `getAllowedStoreIds(user)` resolves to an empty array (a role with zero store access), matching the sibling `GET /crm/entry-exit-logs` endpoint's behavior — not a permission check.

## Response 500

```json
{ "error": "Failed to fetch entry-exit history" }
```

---

## Behavioral Rules

1. `visit_status` is derived, not stored: `'denied'` when `result='denied'`; `'in_progress'` when `result='success'` and no paired exit row exists yet; `'completed'` otherwise.
2. For `visit_status` values other than `'completed'`, `exit_time` and `stay_duration_minutes` are always `null` — never a placeholder string (client renders the blank/"in facility" treatment per FR-010).
3. `search` matches case-insensitively against `name`, `furigana`, and `member_id`.
4. Sorting is applied server-side (`manualSorting`, matching `banners`/`lockers`); the client never re-sorts a fetched page.
5. `store_id`, `auth_method`, `result`, `date_from`, `date_to` are ANDed together; omitted filters place no constraint.
6. Results are always scoped to `getAllowedStoreIds(user)` regardless of the `store_id` param (FR-008) — this is a security boundary, not just a UX default.

---

## Contract Tests (minimum)

- Happy path: default filters return the caller's store-scoped rows, most recent visit date first.
- Filter path: each of `search`, `date_from`/`date_to`, `store_id`, `auth_method`, `result` independently narrows the result set.
- Combination path: multiple filters ANDed together narrow further, not OR.
- Pagination path: `page`/`limit` slice correctly; `pagination.total`/`total_pages` reflect the filtered (not global) count.
- In-progress path: a seeded in-progress row returns `exit_time: null`, `stay_duration_minutes: null`, `visit_status: "in_progress"`.
- Denied path: a seeded denied row returns `exit_time: null`, `stay_duration_minutes: null`, `visit_status: "denied"`.
- Scope path: a `store_id` outside the caller's allowed stores returns zero rows, not an error.
- Empty path: a filter combination matching nothing returns `{ "history": [], "pagination": {..., "total": 0} }`.
- Guard path: `date_to` earlier than `date_from` returns 400.
- Permission path: enforced at the page route (`proxy.ts`), not this endpoint — a caller without `EntryExitHistoryView` never reaches a state where the client calls this endpoint at all.
