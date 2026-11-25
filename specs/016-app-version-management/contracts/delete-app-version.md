# Contract: DELETE /api/v1/admin/app-versions/{id}

**Feature**: 016-app-version-management (FR-011, FR-012, User Story 3); reused unchanged by `017-app-version-detail`
**Backend**: fitness-backend-v2 `AdminAppVersionController.remove` (commit e3381567) — operation `AdminAppVersionController_remove`
**Client**: `adminAppVersionControllerRemoveMutation` (`src/lib/api-real`); errors go through the shared mutation error toast
**PO source**: Y-05 261112_v3 FR-M005
**Last synced**: 2026-11-13

---

## Request

`DELETE /api/v1/admin/app-versions/{id}`

| Param | In   | Type          | Required | Description               |
| ----- | ---- | ------------- | -------- | ------------------------- |
| `id`  | path | string (uuid) | ✅       | Version setting to delete |

No body. **Authorization**: system / headquarter only. The CRM sends it only after the confirmation dialog, and only from a 予約 setting (row menu item enabled / detail buttons rendered).

---

## Response 204

No body. The client shows the toast 「アプリバージョンを削除しました」 and invalidates the list query; from the detail screen it then returns to the list.

## Errors

All are shown with the server's `userMessage` in an error toast; the setting stays and the dialog remains open.

| Status | Code              | `userMessage`                                                                        | When                                                                                           |
| ------ | ----------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 404    | E-APP-001         | 指定されたアプリバージョンが見つかりません。                                         | Unknown id, or already deleted                                                                 |
| 409    | E-APP-003         | 適用中・終了したバージョン設定は編集・削除できません。新しい設定を登録してください。 | The setting is active or ended (e.g. its 適用開始日時 passed after the screen loaded)          |
| 422    | E-APP-004         | Names the later setting, see below                                                   | Without this setting, a later setting of the brand would carry over a latest below its minimum |
| 403    | E-AUTH-103        | この操作には本部管理者の権限が必要です。                                             | Manager / staff / observer                                                                     |
| 401    | E-AUTH-002 / -003 | —                                                                                    | Missing / invalid / expired staff JWT                                                          |

E-APP-004 names the first later setting that would break, e.g. 「2026/11/21 10:00 開始の設定で、iOS の最新バージョン 2.5.0 が最低バージョン 2.8.0 を下回ります。（ほか 3 件）」; `details.violations[]` lists each one, all `self: false` (shape: [POST contract](../../018-app-version-form/contracts/POST-app-versions.md#e-app-004-details)).

---

## Behavioral Rules

1. Logical delete: the setting disappears from list and detail; a later `GET /api/v1/admin/app-versions/{id}` answers 404 E-APP-001.
2. Only a scheduled setting (`effectiveAt` > now at request time) can be deleted; active and ended settings stay as history (PO FR-M005).
3. The brand's remaining history is re-checked as if the setting were gone, because later settings may have carried values over from it (E-APP-004).

## Checks

- Delete a 予約 setting → `204`; the list no longer includes it.
- Delete the same id again → `404` E-APP-001.
- Delete an 適用中 or 終了 setting (by calling the API directly) → `409` E-APP-003.
