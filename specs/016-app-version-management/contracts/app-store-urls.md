# Contract: GET / PUT /api/v1/admin/app-store-urls

**Feature**: 016-app-version-management (FR-013 – FR-017, User Story 4)
**Backend**: fitness-backend-v2 `AdminAppStoreUrlController.getAll` / `putAll` (commit e3381567) — operations `AdminAppStoreUrlController_getAll`, `AdminAppStoreUrlController_putAll`
**Client**: `adminAppStoreUrlControllerGetAllOptions` / `adminAppStoreUrlControllerGetAllQueryKey` / `adminAppStoreUrlControllerPutAllMutation` (`src/lib/api-real`)
**PO source**: Y-05 261112_v3 FR-M006
**Last synced**: 2026-11-13

---

## GET /api/v1/admin/app-store-urls

**Authorization**: system / headquarter / manager / staff / observer (403 E-AUTH-103 from the role guard otherwise). Fetched when the 「ストアの URL の設定」 dialog opens.

### Response 200

```json
{
  "items": [
    {
      "brand": "joyfit",
      "os": "ios",
      "url": "https://apps.apple.com/app/id0000000001",
      "updatedBy": "3d2f1a0b-8c7d-4e6f-9a1b-2c3d4e5f6071",
      "updatedByName": "山田 太郎",
      "updatedAt": "2026-11-13T02:00:00.000Z"
    },
    {
      "brand": "joyfit",
      "os": "android",
      "url": null,
      "updatedBy": null,
      "updatedByName": null,
      "updatedAt": null
    },
    {
      "brand": "fit365",
      "os": "ios",
      "url": null,
      "updatedBy": null,
      "updatedByName": null,
      "updatedAt": null
    },
    {
      "brand": "fit365",
      "os": "android",
      "url": null,
      "updatedBy": null,
      "updatedByName": null,
      "updatedAt": null
    }
  ]
}
```

Always the four apps, in the order JOYFIT iOS, JOYFIT Android, FIT365 iOS, FIT365 Android; an app never saved has `url: null` (its input starts empty and shows no 更新 line).

---

## PUT /api/v1/admin/app-store-urls

**Authorization**: system / headquarter only (403 E-AUTH-103 otherwise). Saves the four URLs together (FR-M006: どれも必須).

### Body (`PutAppStoreUrlsDto`, strict — unknown keys are refused)

```json
{
  "joyfitIos": "https://apps.apple.com/app/id0000000001",
  "joyfitAndroid": "https://play.google.com/store/apps/details?id=jp.joyfit.app",
  "fit365Ios": "https://apps.apple.com/app/id1521399707",
  "fit365Android": "https://play.google.com/store/apps/details?id=jp.fit365.fit365appandroid"
}
```

Each value: required, trimmed, 1–2048 characters, an absolute `http(s)` URL of the Japanese store page — no two-letter first path segment (`/jp/`, `/vn/`…) and no `l` / `hl` / `gl` query parameter. The store host is not checked.

### Response 200

The four items after the save, same shape as GET. The client replaces the GET cache with it, shows the toast 「ストアの URL を保存しました」 and closes the dialog.

### Errors

| Status | Code              | When                                                           |
| ------ | ----------------- | -------------------------------------------------------------- |
| 400    | E-VAL-001         | A value is missing or invalid — `details[]` names the body key |
| 403    | E-AUTH-103        | Manager / staff / observer                                     |
| 401    | E-AUTH-002 / -003 | Missing / invalid / expired staff JWT                          |

`details[].code` per key and the message the dialog shows under that input:

| `code`           | Raised when                 | Message under the input                 |
| ---------------- | --------------------------- | --------------------------------------- |
| `required`       | Key missing                 | 「<label>を入力してください」           |
| `too_short`      | Empty or whitespace only    | 「<label>を入力してください」           |
| `too_long`       | Over 2048 characters        | 「<label>の文字数が上限を超えています」 |
| `invalid_format` | Not an absolute http(s) URL | 「URL の形式で入力してください」        |
| other            | —                           | 「<label>の入力内容をご確認ください」   |

A failure without `details`, or with a detail for an unknown field, is shown in an error toast (server `userMessage`).

---

## Not used: PUT /api/v1/admin/app-store-urls/{brand}/{os}

Saves one app's URL (`{ "url": "…" }`, `brand` = `joyfit` / `fit365`, `os` = `ios` / `android`), same rule, returns the four items. The CRM always saves the four together.

## Checks

- GET on a fresh environment → four items with `url: null`.
- PUT four valid URLs → `200`; GET returns them with `updatedByName` / `updatedAt` set.
- PUT with `fit365Ios: ""` → `400`, `details: [{ field: "fit365Ios", code: "too_short" }]`.
- PUT with `joyfitIos: "https://apps.apple.com/jp/app/id1"` or `…?id=x&hl=ja` → `400`, `code: "invalid_format"`.
- PUT as a manager → `403` E-AUTH-103.
