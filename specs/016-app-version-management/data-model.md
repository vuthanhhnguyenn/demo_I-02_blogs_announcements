# Data Model: App Version Management (List Screen)

**Feature**: 016-app-version-management
**Input**: [spec.md](spec.md) Key Entities; backend contract fitness-backend-v2 `services/bff/src/routes/auth/dto/app-version-response.dto.ts`, `dto/app-store-url.dto.ts` (commit e3381567); generated types `src/lib/api-real/types.gen.ts`
**Last synced**: 2026-11-13 — Y-05 261112_v3

This file holds the shared definition of the version setting; `017-app-version-detail` and `018-app-version-form` refer to it.

## AppVersionSetting (`AppVersionDto`)

One version setting of one brand. From its 適用開始日時 on, it sets per OS the minimum version (required update) and the latest version (optional update, PO FR-S001). List items and the detail response use the same projection.

| Field                                                   | Type                                                                              | Notes                                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                                                    | `string` (uuid)                                                                   |                                                                                                  |
| `brandEnum`                                             | `'Joyfit' \| 'Fit365'`                                                            | No `all` — each app has its own version (PO ブランド別設定構築)                                  |
| `effectiveAt`                                           | `string` (ISO 8601 UTC)                                                           | 適用開始日時; stored to the minute; displayed in JST as `YYYY/MM/DD HH:mm`                       |
| `status`                                                | `'active' \| 'scheduled' \| 'ended'`                                              | Derived by the server on every read — see [Status](#status-状態)                                 |
| `iosMinVersionName` / `iosMinBuildNumber`               | `string \| null` / `integer \| null`                                              | iOS minimum **as entered on this setting**; `null` = left blank (carried over)                   |
| `androidMinVersionName` / `androidMinBuildNumber`       | `string \| null` / `integer \| null`                                              | Android minimum as entered                                                                       |
| `iosLatestVersionName` / `iosLatestBuildNumber`         | `string \| null` / `integer \| null`                                              | iOS latest as entered (FR-S001)                                                                  |
| `androidLatestVersionName` / `androidLatestBuildNumber` | `string \| null` / `integer \| null`                                              | Android latest as entered (FR-S001)                                                              |
| `effective`                                             | `{ iosMin, androidMin, iosLatest, androidLatest }`, each `AppVersionPair \| null` | Values **in effect at this setting after carry-over**; `null` = never entered up to this setting |
| `remarks`                                               | `string \| null`                                                                  | 備考, ≤ 1000 characters                                                                          |
| `createdBy` / `createdByName`                           | `string` (uuid) / `string`                                                        | 作成者                                                                                           |
| `updatedBy` / `updatedByName`                           | `string \| null` / `string \| null`                                               | 更新者; `null` when never updated                                                                |
| `createdAt`                                             | `string` (ISO 8601 UTC)                                                           | 作成日時                                                                                         |
| `updatedAt`                                             | `string \| null`                                                                  | 更新日時; `null` when never updated                                                              |

Deleted settings are never returned (logical delete is internal to the backend; there is no `deletedAt` in the API).

### AppVersionPair (`AppVersionPairDto`)

| Field         | Type          | Notes                                                    |
| ------------- | ------------- | -------------------------------------------------------- |
| `versionName` | `string`      | バージョン名, `X.Y.Z` (each part a non-negative integer) |
| `buildNumber` | `integer` ≥ 1 | ビルド番号, numbered separately per OS                   |

Displayed as the full version (完全バージョン) `<versionName>（<buildNumber>）`, e.g. `2.3.0（45）`. Versions are compared numerically part by part (`1.10.0` > `1.9.0`), then by build number; never as strings, and only within the same OS.

### Status (状態)

Computed per brand over its non-deleted settings at request time:

| Value       | Label  | Tone    | Rule                                                                                       |
| ----------- | ------ | ------- | ------------------------------------------------------------------------------------------ |
| `active`    | 適用中 | success | The setting with the latest 適用開始日時 that is ≤ now (有効な設定); at most one per brand |
| `scheduled` | 予約   | info    | 適用開始日時 > now                                                                         |
| `ended`     | 終了   | neutral | 適用開始日時 ≤ now, replaced by a newer started setting                                    |

Only `scheduled` settings can be edited or deleted (the backend answers E-APP-003 otherwise).

### Carry-over (空欄の引き継ぎ)

Walking a brand's settings in 適用開始日時 order, each of the four slots (`iosMin`, `androidMin`, `iosLatest`, `androidLatest`) keeps the last pair that was entered; a blank pair inherits it. Version name and build number are one unit. PO FR-M002 example (JOYFIT, iOS only, build numbers omitted):

| JOYFIT                   | iOS latest | iOS min | Android latest | Android min |
| ------------------------ | ---------- | ------- | -------------- | ----------- |
| Previous effective       | 2.5.0      | 2.0.0   | 2.4.0          | 2.0.0       |
| This setting (entered)   | 3.0.0      | 2.5.0   | blank          | blank       |
| This setting (effective) | 3.0.0      | 2.5.0   | 2.4.0          | 2.0.0       |

**Display rule** for a slot (list cells and detail card): `effective.<slot>` is `null` → 「—」; the entered pair is `null` but `effective.<slot>` is set → the effective value, muted, hover 「直前の設定から引き継ぎ」; otherwise the entered value.

## Pagination (`PaginationDto`)

| Field        | Type           | Notes                                                                                   |
| ------------ | -------------- | --------------------------------------------------------------------------------------- |
| `page`       | `number` ≥ 1   | Current page                                                                            |
| `limit`      | `number` 1–100 | Page size actually applied; server default 20, this screen sends 25/50/100 (default 50) |
| `totalItems` | `number` ≥ 0   | Matching settings after filters                                                         |
| `totalPages` | `number` ≥ 1   | 1 even when empty                                                                       |

## List view state (URL, via `nuqs`)

| Param       | Values                                    | Default | Notes                          |
| ----------- | ----------------------------------------- | ------- | ------------------------------ |
| `page`      | integer ≥ 1                               | `1`     |                                |
| `limit`     | `25` / `50` / `100`                       | `50`    | Changing it resets `page` to 1 |
| `brandEnum` | `Joyfit` / `Fit365` / absent (all brands) | absent  | Changing it resets `page` to 1 |
| `status`    | `active` / `scheduled` / `ended` / absent | absent  | Changing it resets `page` to 1 |

「条件をクリア」 resets all four. Sort is not user state: every request sends `sort=effectiveAt&order=desc`.

## AppStoreUrl (`AppStoreUrlItemDto`)

| Field           | Type                    | Notes                                                 |
| --------------- | ----------------------- | ----------------------------------------------------- |
| `brand`         | `'joyfit' \| 'fit365'`  | Lower-case, unlike `brandEnum` of version settings    |
| `os`            | `'ios' \| 'android'`    | `ios` = App Store, `android` = Google Play            |
| `url`           | `string \| null`        | `null` until first saved                              |
| `updatedBy`     | `string \| null` (uuid) | 更新者                                                |
| `updatedByName` | `string \| null`        | Shown in the 「更新: <name> <YYYY/MM/DD HH:mm>」 line |
| `updatedAt`     | `string \| null`        | 更新日時                                              |

The backend always returns the four apps, in the order JOYFIT iOS, JOYFIT Android, FIT365 iOS, FIT365 Android.

### Store URL form (`AppStoreUrlFormSchema` → `PutAppStoreUrlsDto`)

| Key             | Label                            |
| --------------- | -------------------------------- |
| `joyfitIos`     | 「JOYFIT の App Store の URL」   |
| `joyfitAndroid` | 「JOYFIT の Google Play の URL」 |
| `fit365Ios`     | 「FIT365 の App Store の URL」   |
| `fit365Android` | 「FIT365 の Google Play の URL」 |

Rules per key (client and backend apply the same rule; checked in this order):

| Rule                            | Client message                              |
| ------------------------------- | ------------------------------------------- |
| Required (after trimming)       | 「<label>を入力してください」               |
| ≤ 2048 characters               | 「<label>は2048文字以内で入力してください」 |
| Absolute `http:` / `https:` URL | 「URL の形式で入力してください」            |

The store host is not checked (PO FR-M006 does not ask for it), nor any country / locale in the URL (PO QA 2026-11-16). Values are sent trimmed.

## Permissions

| Permission                                         | System | Headquarter | Manager | Staff | Observer | Trainer |
| -------------------------------------------------- | ------ | ----------- | ------- | ----- | -------- | ------- |
| `AppVersionsView` (list, detail, store URL dialog) | ✅     | ✅          | ✅      | ✅    | ✅       | —       |
| `AppVersionsCreate`                                | ✅     | ✅          | —       | —     | —        | —       |
| `AppVersionsEdit` (edit, store URL save)           | ✅     | ✅          | —       | —     | —        | —       |
| `AppVersionsDelete`                                | ✅     | ✅          | —       | —     | —        | —       |

`PAGE_PERMISSIONS` guards `/app-versions` and `/app-versions/:id` with `AppVersionsView`, `/app-versions/create` with `AppVersionsCreate`, `/app-versions/:id/edit` with `AppVersionsEdit`. The backend enforces the same split: read = system / headquarter / manager / staff / observer, write = system / headquarter; any other role gets 403 E-AUTH-103 from the BFF role guard.

## State / Lifecycle

```text
[scheduled 予約] --(適用開始日時 reached)--> [active 適用中] --(a newer setting of the brand starts)--> [ended 終了]
[scheduled 予約] --(DELETE, confirmed)--> [deleted — excluded from every read]
[active] / [ended] --(PATCH or DELETE)--> refused, 409 E-APP-003
```

See [contracts/list-app-versions.md](contracts/list-app-versions.md), [contracts/delete-app-version.md](contracts/delete-app-version.md) and [contracts/app-store-urls.md](contracts/app-store-urls.md).
