# Data Model: App Version Management (Detail Screen)

**Feature**: 017-app-version-detail
**Input**: [spec.md](spec.md) Key Entities; entity definition in `016-app-version-management/data-model.md`
**Last synced**: 2026-11-13 — Y-05 261112_v3

## AppVersionSetting (`AppVersionDto`) — defined in 016

This feature adds no fields; it reads one setting with `GET /api/v1/admin/app-versions/{id}`. How the screen uses the fields:

| UI item                | Field(s)                                                      | Display                                                                                                                   |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Title                  | `brandEnum`, `effectiveAt`                                    | `<BRAND> <YYYY/MM/DD HH:mm>`, e.g. 「JOYFIT 2026/11/18 10:00」                                                            |
| Subtitle               | `id`                                                          | `ID: <id>`                                                                                                                |
| ブランド               | `brandEnum`                                                   | Brand badge                                                                                                               |
| 状態                   | `status`                                                      | 適用中 (success) / 予約 (info) / 終了 (neutral) badge                                                                     |
| 適用開始日時           | `effectiveAt`                                                 | `YYYY/MM/DD HH:mm` (JST)                                                                                                  |
| iOS 最低バージョン     | `effective.iosMin`, `iosMinVersionName` / `iosMinBuildNumber` | Carry-over display rule (016): value `2.3.0（45）`, muted + 「直前の設定から引き継ぎ」 when carried over, 「—」 when none |
| iOS 最新バージョン     | `effective.iosLatest`, `iosLatest*`                           | Same rule                                                                                                                 |
| Android 最低バージョン | `effective.androidMin`, `androidMin*`                         | Same rule                                                                                                                 |
| Android 最新バージョン | `effective.androidLatest`, `androidLatest*`                   | Same rule                                                                                                                 |
| 備考                   | `remarks`                                                     | Multi-line, empty when `null`                                                                                             |
| 作成者 / 作成日時      | `createdByName` / `createdAt`                                 | Name / `YYYY/MM/DD HH:mm`                                                                                                 |
| 更新者 / 更新日時      | `updatedByName` / `updatedAt`                                 | 「—」 when `null`                                                                                                         |

The version slots are laid out in two columns: iOS 最低 | iOS 最新, then Android 最低 | Android 最新.

## Action availability

| `status`           | 「編集」 / 「削除」 | System / Headquarter | Manager / Staff / Observer               |
| ------------------ | ------------------- | -------------------- | ---------------------------------------- |
| `scheduled` (予約) | Rendered            | Enabled              | Disabled, tooltip 「本部権限が必要です」 |
| `active` / `ended` | Not rendered        | —                    | —                                        |

## Lookup by ID

| Field | Type          | Notes                                                                  |
| ----- | ------------- | ---------------------------------------------------------------------- |
| `id`  | string (uuid) | Path parameter; unknown or deleted → `404` E-APP-001 → not-found state |

## Permissions

Reused from `016-app-version-management/data-model.md`: `AppVersionsView` guards `/app-versions/:id` (Trainer → 403); `AppVersionsEdit` / `AppVersionsDelete` gate the two buttons.

## State / Lifecycle

```text
[viewing 予約] --(delete confirmed → 204)--> [toast 「アプリバージョンを削除しました」, back to the list]
[viewing 予約] --(delete refused: E-APP-003 / E-APP-004 / E-APP-001)--> [error toast, stays on the screen]
[viewing 適用中 / 終了] --> [read-only, no actions]
[any] --(id unknown or deleted → 404)--> [not-found state]
```

See [contracts/get-app-version.md](contracts/get-app-version.md) and `016-app-version-management/contracts/delete-app-version.md` (reused unchanged).
