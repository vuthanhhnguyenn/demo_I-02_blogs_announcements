# Contract: GET /api/v1/admin/app-versions/{id}

**Feature**: 017-app-version-detail (FR-001 – FR-009); also used by `018-app-version-form` to load the edit form
**Backend**: fitness-backend-v2 `AdminAppVersionController.detail` (commit e3381567) — operation `AdminAppVersionController_detail`
**Client**: `adminAppVersionControllerDetailOptions` / `adminAppVersionControllerDetailQueryKey` (`src/lib/api-real`)
**PO source**: Y-05 261112_v3 FR-M003
**Last synced**: 2026-11-13

---

## Request

`GET /api/v1/admin/app-versions/{id}`

| Param | In   | Type          | Required | Description        |
| ----- | ---- | ------------- | -------- | ------------------ |
| `id`  | path | string (uuid) | yes      | Version setting ID |

**Authorization**: staff JWT; roles system / headquarter / manager / staff / observer. The page itself is guarded by `PAGE_PERMISSIONS['/app-versions/:id']` (`AppVersionsView`).

---

## Response 200

```json
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
    "androidLatest": null
  },
  "remarks": "iOS 3.0.0 release",
  "createdBy": "3d2f1a0b-8c7d-4e6f-9a1b-2c3d4e5f6071",
  "createdByName": "山田 太郎",
  "updatedBy": null,
  "updatedByName": null,
  "createdAt": "2026-11-12T09:12:33.000Z",
  "updatedAt": null
}
```

Flat `AppVersionDto`, the same projection as one list item (`016-app-version-management/data-model.md`). In the example the Android minimum is carried over from an earlier setting and no Android latest has ever been entered (shown as 「—」).

## Errors

| Status | Code              | `userMessage`                                | CRM handling                                         |
| ------ | ----------------- | -------------------------------------------- | ---------------------------------------------------- |
| 404    | E-APP-001         | 指定されたアプリバージョンが見つかりません。 | Not-found state 「アプリバージョンが見つかりません」 |
| 403    | E-AUTH-103        | この操作には本部管理者の権限が必要です。     | Error state (page is 403-guarded; trainer)           |
| 401    | E-AUTH-002 / -003 | —                                            | Shared session handling                              |

Any other failure → error state with 「再試行」.

---

## Behavioral Rules

1. A deleted setting is treated as not found (404 E-APP-001).
2. `status` and `effective` are resolved against the brand's history at request time.
3. No side effects; safe to repeat.

## Checks

- Existing setting → `200` with `status`, `effective`, `createdByName`.
- Unknown id, or an id deleted via `DELETE` → `404` E-APP-001.
- A setting with blank pairs → entered fields `null`, `effective` filled from an earlier setting of the same brand (or `null` if none).
