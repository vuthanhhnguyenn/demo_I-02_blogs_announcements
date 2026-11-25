# Contract: GET /api/crm/permissions

**Feature**: 017-position-management (Y-01)
**Phase**: Phase 1 mock route handler — **NEW 2026-07-29**
**Purpose**: Serve the full permission catalog with no `positionId`, so the create form has a server-owned source for its toggles (FR-009a / research R14). Mirrors the BE's `GET /api/v1/admin/permissions`, added in API design v0.3 in answer to the FE's QA ("is there a standalone catalog endpoint, or does the FE hardcode the keys?").

---

## Request

`GET /api/crm/permissions`

No path params, no query params, no body.

## Response 200

```json
{
  "totalCategoryCount": 10,
  "totalPermissionCount": 36,
  "categories": [
    {
      "categoryKey": "member",
      "categoryLabel": "会員管理",
      "permissions": [
        { "permissionKey": "can_view_member", "label": "会員情報の閲覧" },
        { "permissionKey": "can_edit_member", "label": "会員情報の編集" },
        { "permissionKey": "can_apply_transfer_suspension", "label": "移籍・休会の申請" },
        { "permissionKey": "can_force_withdrawal", "label": "強制退会の実行" }
      ]
    },
    {
      "categoryKey": "csv_export",
      "categoryLabel": "CSV出力管理",
      "permissions": [{ "permissionKey": "can_export_member_csv", "label": "会員CSV出力" }]
    }
  ]
}
```

| Field                  | Notes                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `totalCategoryCount`   | 10 in Phase 1 and in the BE contract.                                                                                                                                                                                   |
| `totalPermissionCount` | **36** in Phase 1 (the prototype's rendered set — decision 2026-07-29); the real BE reports **58**.                                                                                                                     |
| `categories`           | Fixed catalog order: member, gate, application, lesson, facility, sales, promotion, content, system_setting, csv_export. Same grouping metadata the preview endpoint uses, minus `granted`, so the two cannot disagree. |
| `permissions[].label`  | Japanese display label. The contract carries **no** helper description and **no** view/edit kind — those are UI-only metadata joined client-side by `permissionKey` (FR-009a).                                          |

## Errors

| Status | When       |
| ------ | ---------- |
| 500    | unexpected |

## Consumers

- `position-form-permissions-section.tsx` — renders the 権限設定 accordions (categories, labels, order, per-category counts, bulk 全ON/全OFF) from this response; the form's default values and Zod shape still come from the compile-time 36-key list, so an unexpected key cannot corrupt form state.

## Notes

- The BE marks the response cacheable for 300 s (server constant). Phase 1 does not simulate cache headers; React Query's default caching is sufficient.
- Authorization in the BE design: `can_view_staff` (read). Not simulated in Phase 1.
