# Contracts: PATCH .../fees/{subBrandCode}/disable and DELETE .../fees/{subBrandCode}

**Feature**: 021-brand-management (Y-07)
**Phase**: Phase 1 mock route handler (existing routes — **bug fix**, research.md G1, G2)
**Purpose**: Fix a live runtime bug: both routes call mock-DB methods that were never implemented, so both currently fail with a 500 on every real invocation.

---

## PATCH /api/crm/brands/{id}/fees/{subBrandCode}/disable

**Current behavior (bug)**: `db.brands.disableFeeGroup(id, subBrandCode)` is called but does not exist on the `brands` table object in `src/app/api/_mock-db/tables/franchise.table.ts` → throws `TypeError`, caught by the route's try/catch, returns `500 { error: 'Failed to disable brand fee group' }` every time (FR-011 is unimplementable as-is).

**Fix**: Add `disableFeeGroup(code, subBrandCode)` to the `brands` table object:

- Finds the fee group by `parent_brand_code`/`sub_brand_code` (same lookup as `getFeeGroup`/`updateFeeGroup`).
- Returns `undefined` if not found (route already 404s on `undefined`).
- Sets `status: 'inactive'`, unchanged otherwise.
- Appends one `BrandChangeHistoryItem` (G2): `changed_field: "ステータス"`, `before_value: "有効"`, `after_value: "無効"`.
- Returns the updated, cloned `BrandFeeGroup` (matching `updateFeeGroup`'s existing `cloneBrandFeeGroup` pattern).

### Response — 200 (unchanged shape, now actually reachable)

```json
{
  "message": "費用マスタを無効化しました",
  "fee_group": { "...": "BrandFeeGroup with status: 'inactive'" }
}
```

### Authorization

Requires `Permission.BrandsEdit` — unchanged.

---

## DELETE /api/crm/brands/{id}/fees/{subBrandCode}

**Current behavior (bug)**: `db.brands.deleteFeeGroup(id, subBrandCode)` is called but does not exist → same `TypeError` → `500 { error: 'Failed to delete brand fee group' }` every time (FR-011 is unimplementable as-is).

**Fix**: Add `deleteFeeGroup(code, subBrandCode)` to the `brands` table object:

- Finds the fee group's index by `parent_brand_code`/`sub_brand_code`.
- Returns `false` if not found (route already 404s on `false`).
- Splices it out of `this._feeGroups`.
- No change-history row is appended (deleting removes the record itself; nothing remains to attribute a before/after diff to — consistent with delete behavior elsewhere in this mock-DB).
- Returns `true`.

### Response — 200 (unchanged shape, now actually reachable)

```json
{ "message": "費用マスタを削除しました", "deleted_sub_brand_code": "joyfit24" }
```

### Authorization

Requires `Permission.BrandsEdit` — unchanged.

---

## Downstream effect

`brand.fee_group_count` (read by `GET /crm/brands/{id}`, driving the 費用 tab's count badge, PAR025) is already derived from live `_feeGroups.length` — once `deleteFeeGroup` actually splices the array, the badge updates with no further change needed.
