# Data Model: App Version Management (Create/Edit Form)

**Feature**: `018-app-version-form`
**Input**: [spec.md](./spec.md); entity definition in `016-app-version-management/data-model.md`; backend `dto/app-version.dto.ts` + `@fitness/zod-schemas` `maintenance/app-version.schema.ts` (fitness-backend-v2 commit e3381567)
**Last synced**: 2026-11-13 — Y-05 261112_v3

## Entity: AppVersionSetting — owned by `016-app-version-management`

The form writes the editable subset: `brandEnum`, `effectiveAt`, the eight entered version fields and `remarks`. `id`, `status`, `effective`, `createdBy(Name)`, `updatedBy(Name)`, `createdAt`, `updatedAt` are server-assigned.

---

## Form values (`AppVersionFormSchema`, `src/app/(private)/app-versions/_schemas/app-version-form.schema.ts`)

Slots: `iosMin`, `androidMin`, `iosLatest`, `androidLatest`; each has `<slot>VersionName` and `<slot>BuildNumber`.

| Field                  | Control                              | Create default | Rule → message                                                                                                                                                                         |
| ---------------------- | ------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brandEnum`            | Radio JOYFIT / FIT365                | `'Joyfit'`     | `Joyfit` \| `Fit365` → 「ブランドを選択してください」                                                                                                                                  |
| `effectiveAt`          | Date-time picker (minute)            | now (ISO)      | Not empty → 「適用開始日時を選択してください」                                                                                                                                         |
| `<slot>VersionName` ×4 | Text, placeholder 「X.Y.Z」          | `''`           | Trimmed; `''` or `^\d+\.\d+\.\d+$` → 「X.Y.Z 形式で入力してください（例: 1.2.3）」                                                                                                     |
| `<slot>BuildNumber` ×4 | Text (numeric), placeholder 「番号」 | `''`           | Trimmed; `''` or digits → 「ビルド番号は数値で入力してください」; ≥ 1 → 「ビルド番号は1以上の整数を入力してください」; ≤ 2147483647 → 「ビルド番号は2147483647以下で入力してください」 |
| `remarks`              | Textarea (maxLength 1000)            | `''`           | ≤ 1000 → 「備考は1000文字以内で入力してください。」                                                                                                                                    |

Cross-field rules, per slot / per OS:

| Rule                                                      | Error on                | Message                                                |
| --------------------------------------------------------- | ----------------------- | ------------------------------------------------------ |
| Name filled, build blank                                  | `<slot>BuildNumber`     | 「バージョン名とあわせてビルド番号を入力してください」 |
| Name blank, build filled                                  | `<slot>VersionName`     | 「ビルド番号とあわせてバージョン名を入力してください」 |
| Both `<os>Min` and `<os>Latest` complete and latest < min | `<os>LatestVersionName` | 「最新バージョンは最低バージョン以上にしてください。」 |

A slot shows one error line: its version-name error, else its build-number error. Versions compare part by part as numbers, then by build number (`compareAppVersionPair`).

The build-number maximum matches the backend's PostgreSQL `integer` column.

## Edit seed (`appVersionRecordToFormValues`)

`brandEnum`, `effectiveAt` and `remarks` (`null` → `''`) from the record; each version field from the value **entered** on the setting (`null` → `''`). `effective` (carried-over values) is never copied in, so a blank slot keeps carrying over after the edit.

## Request bodies (`appVersionFormValuesToCreateBody` / `appVersionFormValuesToUpdateBody`)

Create and update send the same eleven keys:

| Key                    | Value                                                            |
| ---------------------- | ---------------------------------------------------------------- |
| `brandEnum`            | As selected                                                      |
| `effectiveAt`          | ISO 8601 string from the picker (server truncates to the minute) |
| `<slot>VersionName` ×4 | Trimmed string, `''` → `null`                                    |
| `<slot>BuildNumber` ×4 | `Number(value)`, `''` → `null`                                   |
| `remarks`              | `''` → `null`                                                    |

`null` on a pair means blank = carry over (PO FR-M002 空欄の引き継ぎ). On update, sending every key makes the edit a full replacement of the setting's editable values.

## Minimum change (`AppVersionMinChange`, `getAppVersionMinChanges`)

Computed on submit from the brand's active setting (`GET /api/v1/admin/app-versions?brandEnum=<brand>&status=active&limit=1`, item 0 or none) and the form values:

| Field       | Type                     | Notes                                                                                  |
| ----------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `os`        | `'ios' \| 'android'`     |                                                                                        |
| `before`    | `AppVersionPair \| null` | Active setting's `effective.<os>Min`; `null` = no minimum in effect (shown 「未設定」) |
| `after`     | `AppVersionPair`         | Minimum entered on the form                                                            |
| `direction` | `'raise' \| 'lower'`     | `before === null` counts as `raise`                                                    |

An OS is listed only when its minimum is entered and differs from `before`; a blank minimum (carry over) or an equal one changes nothing. Dialog title: all `raise` → 「最低バージョンの引き上げの確認」, all `lower` → 「最低バージョンの引き下げの確認」, mixed → 「最低バージョンの変更の確認」. The warning sentence appears when any change is a `raise`. No change → save directly.

## Server error mapping (`toAppVersionServerErrors`)

| Code (status)                                             | Lands on                                                                  | Message                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| E-APP-002 (409)                                           | `effectiveAt`                                                             | 「同じブランド・適用開始日時のバージョン設定が既に存在します。」 |
| E-APP-005 (422)                                           | `effectiveAt`                                                             | 「適用開始日時は現在適用中の設定より前にできません。」           |
| E-APP-004 (422)                                           | First `details.violations[]` entry `self` → its `field`; else error toast | Server `userMessage`, see below                                  |
| E-VAL-001 (400)                                           | Each `details[].field` (first detail per field)                           | From `details[].code` + label, see below                         |
| E-APP-003 (409), E-APP-001 (404), E-AUTH-103 (403), other | — (error toast)                                                           | Server `userMessage`                                             |

E-VAL-001 messages: `required` → 「<label>を入力してください」, `too_long` → 「<label>の文字数が上限を超えています」, `too_small` → 「<label>が下限を下回っています」, `too_large` → 「<label>が上限を超えています」, `invalid_format` / `invalid_date` → 「<label>の形式が正しくありません」, other → 「<label>の入力内容をご確認ください」. Labels: ブランド, 適用開始日時, iOS 最低バージョン, iOS 最低バージョンのビルド番号, Android 最低バージョン, Android 最低バージョンのビルド番号, iOS 最新バージョン, iOS 最新バージョンのビルド番号, Android 最新バージョン, Android 最新バージョンのビルド番号, 備考. A detail for an unknown field (e.g. `body`), or an E-VAL-001 without details, also raises the error toast.

E-APP-004 `details.violations[]` lists every (setting, OS) whose latest is below its minimum after carry-over; only an entry of the setting being saved (`self`) has a `field` (`iosLatestVersionName` / `androidLatestVersionName`). The server `userMessage` names the first entry, so it goes under that entry's `field` when the entry is `self`, else to the error toast; any further `self` field gets 「最新バージョンは最低バージョン以上にしてください。」.

A half-filled pair that reaches the server (client check bypassed) comes back as E-VAL-001 with `code: "required"` on the missing half, e.g. 「iOS 最低バージョンのビルド番号を入力してください」.

## Permissions (reused from `016-app-version-management/data-model.md`)

`/app-versions/create` requires `AppVersionsCreate`, `/app-versions/:id/edit` requires `AppVersionsEdit` (System, Headquarter only); every other role gets the 403 page before the form renders. The backend refuses writes from other roles with 403 E-AUTH-103.

## State / Lifecycle

```text
[create form] --(valid submit)--> [read active setting] --(minimum changes)--> [confirmation] --(confirm)--> POST → 201 → [toast, list]
                                                        --(no change)-----------------------------------> POST → 201 → [toast, list]
[edit form, 予約] --(same flow)--> PATCH → 200 → [toast, list]
[POST/PATCH refused] --> [confirmation closed; field message or error toast; input kept]
[edit route, 適用中 / 終了] --> [「このバージョン設定は編集できません」, no form]
[edit route, unknown / deleted id] --> [「アプリバージョンが見つかりません」]
```

See [contracts/POST-app-versions.md](./contracts/POST-app-versions.md), [contracts/PATCH-app-versions-id.md](./contracts/PATCH-app-versions-id.md); the active-setting read uses `016-app-version-management/contracts/list-app-versions.md`, the edit load `017-app-version-detail/contracts/get-app-version.md`.
