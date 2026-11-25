# Contract: PATCH /api/v1/admin/app-versions/{id}

**Feature**: 018-app-version-form (User Story 2, FR-009 – FR-014)
**Backend**: fitness-backend-v2 `AdminAppVersionController.update` (commit e3381567) — operation `AdminAppVersionController_update`
**Client**: `adminAppVersionControllerUpdateMutation` (`src/lib/api-real`), with `meta.suppressErrorToast` — the form maps errors itself (`toAppVersionServerErrors`)
**PO source**: Y-05 261112_v3 FR-M004 (same input checks and confirmation as FR-M002)
**Last synced**: 2026-11-13

The edit form is loaded with `GET /api/v1/admin/app-versions/{id}` (`017-app-version-detail/contracts/get-app-version.md`) and shown only for `status: "scheduled"`. On submit it is preceded by the active-setting read for the confirmation (`016-app-version-management/contracts/list-app-versions.md`).

---

## Request

`PATCH /api/v1/admin/app-versions/{id}` — **Authorization**: system / headquarter only.

| Param | In   | Type          | Required | Description       |
| ----- | ---- | ------------- | -------- | ----------------- |
| `id`  | path | string (uuid) | ✅       | Setting to update |

### Body (`UpdateAppVersionDto`, strict)

Same fields and rules as `POST` (`CreateAppVersionDto`), all optional: an omitted key leaves the stored value unchanged, `null` clears a version field or 備考 (= blank, carry over).

```json
{
  "brandEnum": "Joyfit",
  "effectiveAt": "2026-11-18T03:00:00.000Z",
  "iosMinVersionName": "2.5.1",
  "iosMinBuildNumber": 251,
  "androidMinVersionName": null,
  "androidMinBuildNumber": null,
  "iosLatestVersionName": "3.0.0",
  "iosLatestBuildNumber": 300,
  "androidLatestVersionName": null,
  "androidLatestBuildNumber": null,
  "remarks": null
}
```

The CRM always sends all eleven keys (a full edit of the setting), so a slot cleared in the form goes back to carrying over.

---

## Response 200

The updated `AppVersionDto`, with `updatedBy` / `updatedByName` / `updatedAt` set. The client shows 「アプリバージョンの変更を保存しました」, invalidates the detail and list queries and returns to the list.

## Errors

Same as `POST` (E-VAL-001, E-APP-002, E-APP-004, E-APP-005, E-AUTH-103, 401 — see [POST-app-versions.md](./POST-app-versions.md)), plus:

| Status | Code      | `userMessage`                                                                        | When                                                                     | Shown       |
| ------ | --------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------- |
| 404    | E-APP-001 | 指定されたアプリバージョンが見つかりません。                                         | Unknown id, or deleted                                                   | Error toast |
| 409    | E-APP-003 | 適用中・終了したバージョン設定は編集・削除できません。新しい設定を登録してください。 | The setting is active or ended (e.g. it started while the form was open) | Error toast |

---

## Behavioral Rules (server)

1. Only a scheduled setting (`effectiveAt` > now) can be updated; otherwise E-APP-003 — a change to a setting in effect is a new setting.
2. The new values are merged onto the stored ones (omitted = unchanged), then checked like a registration against the brand's other settings: pairs, placement (E-APP-005, E-APP-002), latest ≥ minimum after carry-over (E-APP-004).
3. Moving the setting to the other brand also re-checks the old brand's history without it. In E-APP-004 `details.violations`, `self` marks the edited setting (`settingId` = its id); the old brand's re-check has no `self` entry.
4. Last write wins; no version / ETag check.

## Checks

- Change one pair of a 予約 setting → `200`; `updatedByName` / `updatedAt` set; list and detail show the new value.
- Same body on an 適用中 setting → `409` E-APP-003.
- Move `effectiveAt` onto another setting's minute of the same brand → `409` E-APP-002.
- Unknown id → `404` E-APP-001.
