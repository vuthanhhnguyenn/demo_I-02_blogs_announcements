# Contract: List enrollment applications

**Endpoint**: `GET /api/crm/membership-applications`
**Status**: existing route, **reworked** (`src/app/api/crm/membership-applications/route.ts`)
**Requirements**: FR-001 – FR-017, FR-062

## Query parameters

| Param                   | Type                                                                     | Default            | Notes                                                                                           |
| ----------------------- | ------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------- |
| `page`                  | int ≥ 1                                                                  | 1                  |                                                                                                 |
| `limit`                 | `25 \| 50 \| 100 \| 200`                                                 | 50                 | **changed** — was an unconstrained positive int (FR-014)                                        |
| `search`                | string                                                                   | —                  | partial match on application ID **or** applicant name (FR-005)                                  |
| `status`                | `MembershipApplicationStatus`                                            | —                  | now includes `auto_approved` (FR-002)                                                           |
| `route`                 | `mobile \| manual \| referral`                                           | —                  | **new** (FR-003, FR-006)                                                                        |
| `blacklist`             | `all \| match \| no_match`                                               | `all`              | unchanged                                                                                       |
| `brand`                 | brand id                                                                 | —                  | **changed** — id, not display name; ignored when the caller is single-store scoped              |
| `store`                 | store id                                                                 | —                  | **changed** — id, not display name; ignored when the caller is single-store scoped              |
| `date_from` / `date_to` | `YYYY-MM-DD`                                                             | last 7 days        | the 7-day default is applied by the **client** (FR-007); the server treats absence as unbounded |
| `sort_by`               | `id \| applicant_name \| status \| application_date \| usage_start_date` | `application_date` | **changed** — was a single-member enum (FR-009)                                                 |
| `sort_order`            | `asc \| desc`                                                            | `desc`             |                                                                                                 |

## Scope enforcement (FR-015, FR-062)

Before any filtering:

1. `getAuthUserFromRequest(request)` → 401 when unauthenticated.
2. Caller lacks `Permission.MembershipApplicationsView` → **403**.
3. `getAllowedStoreIds(user)` → `null` means unrestricted (Headquarter / System); otherwise the row set is narrowed to those `store_id`s **before** filtering, searching, counting, and paginating.
4. Client-supplied `brand` / `store` params can only narrow within that scope — never widen it. A single-store-scoped caller's `store` param is ignored entirely.

This is new behaviour: the route currently performs no auth check and filters solely on a client-supplied `store` name.

## Sorting

`sort_by=status` orders by the review-flow rank (未審査 0 → 審査中 1 → 承認済 2 → 自動承認済 3 → 否認 4 → 取り消し済 5), **not** alphabetically (FR-010). All other fields sort naturally. Ties break on `application_date desc` so ordering is stable across requests.

## Response `200`

```jsonc
{
  "applications": [
    {
      "id": "APP-2026-0001",
      "applicant_name": "山田 太郎",
      "status": "pending",
      "enrollment_route": "mobile", // NEW (FR-003)
      "blacklist_state": "no_match", // CHANGED from blacklist_match: boolean
      "brand_id": "BRD-002",
      "brand_name": "FIT365",
      "store_id": "STR-011",
      "store_name": "FIT365八潮店",
      "plan_name": "レギュラー会員",
      "campaign_name": null, // CHANGED — null, never the string "なし"
      "application_date": "2026-03-30T09:15:00+09:00",
      "usage_start_date": "2026-04-01",
      "is_minor": false,
    },
  ],
  "pagination": { "total": 47, "total_pages": 1, "current_page": 1, "limit": 50 },
  "summary": {
    // NEW — see Complexity Tracking in plan.md
    "pending_count": 12, // status ∈ {pending, review} within scope (FR-004)
    "blacklist_count": 3, // that set where blacklist_state === "matched"
  },
  "unfiltered_total": 128, // NEW — powers the "N件 / 全M件" result banner (FR-008)
}
```

`summary` is computed over the caller's **whole store scope**, ignoring the user's filters and pagination — the cards report the queue, not the current view (research R3). `unfiltered_total` is the scoped count before user filters, so the banner can state filtered-vs-total.

The 対応超過 flag is **not** a response field: the client derives it from `application_date` and the threshold constant (research R4).

## Errors

| Code | When                                                                  |
| ---- | --------------------------------------------------------------------- |
| 400  | invalid query parameter (e.g. `limit` outside the four allowed sizes) |
| 401  | unauthenticated                                                       |
| 403  | caller lacks `MembershipApplicationsView` (Trainer)                   |

## Client notes

- Filter/search/sort/page-size state lives in URL search params via `nuqs`; every change resets `page` to 1 (FR-014).
- An out-of-range page after filtering clamps to the last valid page rather than rendering a blank table (spec Edge Cases).
- The empty state distinguishes "no rows match these filters" (offers clear-all) from "no applications exist at all" (does not) by comparing `unfiltered_total` against 0 (FR-017).
  </content>
