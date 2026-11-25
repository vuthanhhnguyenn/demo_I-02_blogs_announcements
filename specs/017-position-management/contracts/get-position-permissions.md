# Contract: GET /api/crm/positions/{id}/permissions

**Feature**: 017-position-management (Y-01)
**Phase**: Phase 1 mock route handler
**Purpose**: Grouped permission preview for the right pane (FR-007 — realizes source FR-009). Returns the **10** categories including `csv_export`, which API design v0.3 made official (FR-S001) — the former category-enum divergence is closed. The catalog _without_ `granted` is served by [get-permission-catalog.md](./get-permission-catalog.md).

---

## Request

`GET /api/crm/positions/6/permissions`

## Response 200

```json
{
  "id": 6,
  "position_name": "正社員スタッフ",
  "role": "staff",
  "categories": [
    {
      "categoryKey": "member",
      "categoryLabel": "会員管理",
      "permissions": [
        { "permissionKey": "can_view_member", "label": "会員情報の閲覧", "granted": true },
        { "permissionKey": "can_edit_member", "label": "会員情報の編集", "granted": true },
        {
          "permissionKey": "can_apply_transfer_suspension",
          "label": "移籍・休会の申請",
          "granted": false
        },
        { "permissionKey": "can_force_withdrawal", "label": "強制退会の実行", "granted": false }
      ]
    },
    { "categoryKey": "csv_export", "categoryLabel": "CSV出力管理", "permissions": [] }
  ]
}
```

| Field        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories` | Always all 10, in the catalog's fixed order, each listing its full permission set with `granted` per key. `categoryKey` = BE v0.3 enum (`member`…`system_setting`, `csv_export`); `permissionKey` = BE `can_*` names (36-key Phase 1 subset + the single FE-extension key `can_edit_gate_stop`, data-model.md §1). Grouping/labels are composed route-side from the same mock metadata the catalog endpoint uses, so the two can never disagree (nothing outside `src/app/api/` imports it). |

## Errors

| Status | When       |
| ------ | ---------- |
| 404    | unknown id |
| 500    | unexpected |

## Client-side derivation (research R5 — not in the response)

- Category level: no granted → アクセス不可; only `view`-kind granted → 閲覧のみ; any `edit`-kind granted → 閲覧・編集; `csv_export` renders 出力可/出力不可.
- Accordion badge: `grantedCount/total` per category.
- 重要操作 warning icon (FR-007a): shown on a category when any of `can_force_withdrawal`, `can_edit_after_billing_confirmed`, `can_execute_refund` is granted in it; tooltip 「強制退会・返金など重要操作を含みます」.
- **No 権限フラグ section** — the API team confirmed 権限フラグ ≡ アクセス権限 and it is merged into the accordion (2026-07-29); the BE deliberately carries no separate field for it.
