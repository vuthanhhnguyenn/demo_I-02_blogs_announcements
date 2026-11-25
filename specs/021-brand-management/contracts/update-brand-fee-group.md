# Contract: PATCH /api/crm/brands/{id}/fees/{subBrandCode}

**Feature**: 021-brand-management (Y-07)
**Phase**: Phase 1 mock route handler (existing route, request/behavior extended — research.md G2, G3)
**Purpose**: Update a sub-brand's current fee settings and its scheduled future revisions (FR-007, FR-008, FR-009, FR-010).

---

## Request

`PATCH /api/crm/brands/{id}/fees/{subBrandCode}`

```json
{
  "fee_items": [
    {
      "item_code": "enrollment-fee",
      "item_name": "入会金",
      "current_value_including_tax_yen": 11000,
      "effective_start_date": "2025/04/01",
      "scheduled_changes": [
        { "effective_start_date": "2026/09/01", "value_including_tax_yen": 12000 }
      ]
    }
  ],
  "updated_by": "山田 花子（本部）"
}
```

### Body Fields

| Field                                                     | Type                  | Required | Notes                                                                                                                                                                        |
| --------------------------------------------------------- | --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fee_items[].item_code`                                   | string                | yes      | Unchanged — must match an existing item on this fee group; the route already 400s on unknown/missing/duplicate codes.                                                        |
| `fee_items[].item_name`                                   | string (max 255)      | yes      | Unchanged.                                                                                                                                                                   |
| `fee_items[].current_value_including_tax_yen`             | number (int, ≥ 0)     | yes      | Unchanged.                                                                                                                                                                   |
| `fee_items[].effective_start_date`                        | string (`yyyy/MM/dd`) | yes      | Unchanged.                                                                                                                                                                   |
| `fee_items[].scheduled_changes[].effective_start_date`    | string (`yyyy/MM/dd`) | no\*     | **New.** \*Field itself optional (omit → no revisions / clears existing ones); when present, must be unique within the item and must not equal `effective_start_date` above. |
| `fee_items[].scheduled_changes[].value_including_tax_yen` | number (int, ≥ 0)     | no\*     | **New.** Required alongside its sibling `effective_start_date` when an entry is present.                                                                                     |
| `updated_by`                                              | string                | no       | Unchanged (mock actor label). Now also used as `changed_by` on the change-history rows this request appends (G2).                                                            |

`registered_at` / `registered_by` on a `scheduled_changes` entry are **response-only** — never accepted in the request. The server stamps them: entries whose `effective_start_date` doesn't match anything already stored are treated as newly registered (`registered_at` = today, `registered_by` = `updated_by` ?? mock fallback `'STF-001'`\* — see note); entries that match an existing `effective_start_date` keep their original stamp.

\* Mirrors the existing fallback used by `brands.add()`/`brands.update()` elsewhere in this file.

### Server-side validation (new, in addition to the existing item-code checks)

- 400 if any item's `scheduled_changes` contains two entries with the same `effective_start_date`.
- 400 if any `scheduled_changes` entry's `effective_start_date` equals that same item's `effective_start_date`.
- Past-dated `effective_start_date` values (current or scheduled) are accepted without error — the past-date warning is a client-side-only, non-blocking affordance (FR-010).

### Response — 200

```json
{
  "message": "費用設定を保存しました",
  "fee_group": { "...": "BrandFeeGroup, scheduled_changes reflect the new state" }
}
```

Unchanged shape (`UpdateBrandFeeGroupResponseSchema`) — only the content of `fee_group.fee_items[].scheduled_changes` now reflects real writes instead of frozen seed data.

### Side effect — change history (new, G2)

One `BrandChangeHistoryItem` row is appended per changed field across all items in the payload (e.g. a request that changes item①'s price and adds a new revision to item② produces two rows: `"入会金 定価"` and `"登録事務手数料 予約中の改定"`). Rows use `target_display_name = "{parent_brand_name} / {display_name}"`.

### Authorization

Requires `Permission.BrandsEdit` (Headquarter/System only) — unchanged, already enforced client-side via `RoleGatedButton`; no change to server-side auth in this pass (existing routes in this codebase largely rely on the proxy-level `PAGE_PERMISSIONS` gate rather than per-mutation server checks — consistent with sibling features).
