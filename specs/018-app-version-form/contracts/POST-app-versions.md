# Contract: POST /api/v1/admin/app-versions

**Feature**: 018-app-version-form (User Story 1, FR-009 – FR-012)
**Backend**: fitness-backend-v2 `AdminAppVersionController.create` (commit e3381567) — operation `AdminAppVersionController_create`
**Client**: `adminAppVersionControllerCreateMutation` (`src/lib/api-real`), with `meta.suppressErrorToast` — the form maps errors itself (`toAppVersionServerErrors`)
**PO source**: Y-05 261112_v3 FR-M002, FR-S001
**Last synced**: 2026-11-13

Preceded on submit by `GET /api/v1/admin/app-versions?brandEnum=<brand>&status=active&limit=1` (`016-app-version-management/contracts/list-app-versions.md`) for the minimum-change confirmation.

---

## Request

`POST /api/v1/admin/app-versions` — **Authorization**: system / headquarter only.

### Body (`CreateAppVersionDto`, strict — unknown keys are refused)

```json
{
  "brandEnum": "Joyfit",
  "effectiveAt": "2026-11-18T01:00:00.000Z",
  "iosMinVersionName": "2.5.0",
  "iosMinBuildNumber": 250,
  "androidMinVersionName": null,
  "androidMinBuildNumber": null,
  "iosLatestVersionName": "3.0.0",
  "iosLatestBuildNumber": 300,
  "androidLatestVersionName": null,
  "androidLatestBuildNumber": null,
  "remarks": "iOS 3.0.0 release"
}
```

| Field                                                                                            | Type            | Required | Rule                                                            |
| ------------------------------------------------------------------------------------------------ | --------------- | -------- | --------------------------------------------------------------- |
| `brandEnum`                                                                                      | string          | Yes      | `Joyfit` \| `Fit365`                                            |
| `effectiveAt`                                                                                    | string          | Yes      | ISO 8601 date-time with offset; truncated to the minute         |
| `iosMinVersionName`, `androidMinVersionName`, `iosLatestVersionName`, `androidLatestVersionName` | string \| null  | No       | `^\d+\.\d+\.\d+$`; `null` / omitted / `''` = blank (carry over) |
| `iosMinBuildNumber`, `androidMinBuildNumber`, `iosLatestBuildNumber`, `androidLatestBuildNumber` | integer \| null | No       | ≥ 1; `null` / omitted / `''` = blank                            |
| `remarks`                                                                                        | string \| null  | No       | ≤ 1000 characters                                               |

The CRM always sends all eleven keys, blank pairs as `null` / `null`.

---

## Response 201

The created `AppVersionDto` (same shape as `017-app-version-detail/contracts/get-app-version.md`), with `status` (`active` when the start is not in the future, else `scheduled`) and `effective` resolved. The client shows 「アプリバージョンを登録しました」, invalidates the list query and returns to the list.

## Errors

| Status | Code              | `userMessage`                                                | When                                                                                                                                                   | Shown                         |
| ------ | ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 400    | E-VAL-001         | リクエストの内容が正しくありません。                         | Field format (`details[].code` e.g. `invalid_format`, `too_small`, `too_long`, `invalid_date`), or a half-filled pair (`required` on the missing half) | Under each field in `details` |
| 409    | E-APP-002         | 同じブランド・適用開始日時のバージョン設定が既に存在します。 | Another setting of the brand starts in the same minute (also when two requests race)                                                                   | Under 適用開始日時            |
| 422    | E-APP-005         | 適用開始日時は現在適用中の設定より前にできません。           | 適用開始日時 earlier than the brand's active setting                                                                                                   | Under 適用開始日時            |
| 422    | E-APP-004         | Names the first violation, see below                         | After carry-over, some setting of the brand would have latest < minimum for an OS; `details: { violations: [...] }`, see below                         | See below                     |
| 403    | E-AUTH-103        | この操作には本部管理者の権限が必要です。                     | Not system / headquarter                                                                                                                               | Error toast                   |
| 401    | E-AUTH-002 / -003 | —                                                            | Missing / invalid / expired staff JWT                                                                                                                  | Shared session handling       |

### E-APP-004 `details`

Unlike E-VAL-001, `details` is an object, `{ violations: [...] }`, with one entry per (setting, OS) whose latest is below its minimum after carry-over, in start order (iOS before Android within a setting).

| Field                | Type                                        | Notes                                                                    |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| `settingId`          | string \| null                              | `null` = the setting being created                                       |
| `self`               | boolean                                     | `true` = the setting being saved                                         |
| `field`              | string, only when `self`                    | `iosLatestVersionName` / `androidLatestVersionName`                      |
| `effectiveAt`        | ISO 8601                                    | Start of the setting that breaks the rule                                |
| `os`                 | `ios` \| `android`                          |                                                                          |
| `minimum` / `latest` | `{ versionName, buildNumber, carriedOver }` | `carriedOver` = the setting left this pair blank and inherited the value |

`userMessage` describes the first entry: 「この設定で、」 when it is `self`, else 「<YYYY/MM/DD HH:mm> 開始の設定で、」 (JST), then 「<iOS / Android> の最新バージョン <latest> が最低バージョン <minimum> を下回ります。」, with 「（引き継ぎ）」 after a carried-over minimum and 「（ほか N 件）」 when more entries follow — e.g. 「この設定で、iOS の最新バージョン 1.0.0 が最低バージョン 2.0.0（引き継ぎ） を下回ります。」.

Shown: first entry `self` → `userMessage` under its `field`; a further `self` entry → 「最新バージョンは最低バージョン以上にしてください。」 under its `field`; first entry not `self` → error toast with `userMessage`.

---

## Behavioral Rules (server)

1. `effectiveAt` is truncated to the minute; "one setting per brand + 適用開始日時" is per minute (a partial unique index backs it against concurrent inserts). Different brands may share a time.
2. Checks run in this order: pair completeness (E-VAL-001) → placement: not before the active setting (E-APP-005), not on an occupied minute (E-APP-002) → latest ≥ minimum after carry-over over the brand's whole history including the new setting (E-APP-004).
3. A start between the active setting's start and now means "starts now": the new setting becomes the active one immediately.
4. `createdBy` comes from the staff JWT; `createdByName` is resolved on read.

## Checks

- Only brand + `effectiveAt` (all pairs `null`) → `201`; `effective` equals the previous setting's values.
- `iosMinVersionName: "2.5.0"` with `iosMinBuildNumber: null` → `400`, `details: [{ field: "iosMinBuildNumber", code: "required" }]`.
- Same brand + same minute as an existing setting → `409` E-APP-002.
- `effectiveAt` before the active setting's start → `422` E-APP-005.
- `iosLatest` `1.0.0` / `1` while the iOS minimum in effect is `2.0.0` → `422` E-APP-004, `details.violations[0]` = `{ settingId: null, self: true, field: "iosLatestVersionName", … }`.
- An iOS latest that suits its own setting but is carried into a later setting with a higher minimum → `422` E-APP-004, `details.violations[0].self = false`, `userMessage` 「<later start> 開始の設定で、…」.
