# Contract: GET /api/v1/admin/app-versions

**Feature**: 016-app-version-management (FR-001 – FR-008); also read by `018-app-version-form` for the minimum-change confirmation
**Backend**: fitness-backend-v2 `AdminAppVersionController.list` (commit e3381567) — operation `AdminAppVersionController_list`
**Client**: `adminAppVersionControllerListOptions` / `adminAppVersionControllerListQueryKey` (`src/lib/api-real`)
**PO source**: Y-05 261112_v3 FR-M001
**Last synced**: 2026-11-13

The former Phase 1 mock route `src/app/api/crm/app-versions` (v1 shape) is no longer called by these screens.

---

## Request

`GET /api/v1/admin/app-versions`

### Query Parameters

| Param       | Type    | Required | Default       | Allowed values                 | Description      |
| ----------- | ------- | -------- | ------------- | ------------------------------ | ---------------- |
| `page`      | integer | no       | `1`           | ≥ 1                            | Page number      |
| `limit`     | integer | no       | `20`          | 1–100                          | Items per page   |
| `sort`      | string  | no       | `effectiveAt` | `effectiveAt`, `createdAt`     | Sort key         |
| `order`     | string  | no       | `desc`        | `asc`, `desc`                  | Sort direction   |
| `brandEnum` | string  | no       | —             | `Joyfit`, `Fit365`             | Filter by brand  |
| `status`    | string  | no       | —             | `active`, `scheduled`, `ended` | Filter by status |

### Calls made by the CRM

| Caller                      | Query                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| List screen                 | `page`, `limit` (25/50/100, default 50), `sort=effectiveAt`, `order=desc`, `brandEnum` / `status` only when filtered |
| Form submit (`018`, FR-010) | `brandEnum=<selected brand>&status=active&limit=1` — the brand's setting in effect now (0 or 1 item), fetched fresh  |

**Authorization**: staff JWT; roles system / headquarter / manager / staff / observer.

---

## Response 200

```json
{
  "items": [
    {
      "id": "4c8b1e5a-2d39-4f70-8a61-b5c7d9e0f123",
      "brandEnum": "Joyfit",
      "effectiveAt": "2026-11-18T01:00:00.000Z",
      "status": "scheduled",
      "iosMinVersionName": "2.5.0",
      "iosMinBuildNumber": 250,
      "androidMinVersionName": null,
      "androidMinBuildNumber": null,
      "iosLatestVersionName": "3.0.0",
      "iosLatestBuildNumber": 300,
      "androidLatestVersionName": null,
      "androidLatestBuildNumber": null,
      "effective": {
        "iosMin": { "versionName": "2.5.0", "buildNumber": 250 },
        "androidMin": { "versionName": "2.0.0", "buildNumber": 200 },
        "iosLatest": { "versionName": "3.0.0", "buildNumber": 300 },
        "androidLatest": { "versionName": "2.4.0", "buildNumber": 240 }
      },
      "remarks": "iOS 3.0.0 release",
      "createdBy": "3d2f1a0b-8c7d-4e6f-9a1b-2c3d4e5f6071",
      "createdByName": "山田 太郎",
      "updatedBy": null,
      "updatedByName": null,
      "createdAt": "2026-11-12T09:12:33.000Z",
      "updatedAt": null
    }
  ],
  "pagination": { "page": 1, "limit": 50, "totalItems": 1, "totalPages": 1 }
}
```

Item shape = `AppVersionDto` ([data-model.md](../data-model.md)). In the example the Android pairs were left blank on this setting, so `effective.androidMin` / `effective.androidLatest` come from an earlier JOYFIT setting and the list shows them muted.

## Errors

| Status | Code              | When                                                                                           | CRM handling                                     |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 400    | E-VAL-001         | A query value outside the allowed values (e.g. `limit=0`)                                      | Error block with 「条件をクリア」                |
| 401    | E-AUTH-002 / -003 | Missing / invalid / expired staff JWT                                                          | Shared session handling                          |
| 403    | E-AUTH-103        | Role not allowed to read (trainer) — the BFF role guard answers E-AUTH-103 for any role denial | Error block without action (page is 403-guarded) |

Any other failure: error block 「アプリバージョン一覧の取得に失敗しました」 with the server's `userMessage` and 「再試行」.

---

## Behavioral Rules

1. Deleted settings are excluded before filtering and paging.
2. `status` and `effective` are computed at request time over each brand's whole history (not just the returned page); scheduled settings are included.
3. Default order is `effectiveAt desc`; ties are broken by `id`.
4. `brandEnum` and `status` are exact-match filters combined with AND.
5. No match returns `{ "items": [], "pagination": { "page": 1, "limit": <limit>, "totalItems": 0, "totalPages": 1 } }` — not an error; the UI shows the empty state.

## Checks

- No params → settings of both brands, newest `effectiveAt` first.
- `brandEnum=Fit365` → only FIT365; `totalItems` is the filtered count.
- `status=scheduled` → only settings starting in the future; `status=active&brandEnum=Joyfit&limit=1` → at most one item.
- A setting with blank pairs → `null` entered fields, `effective` filled from an earlier setting of the same brand.
