# Contract: PATCH /api/crm/brands/{id}

**Feature**: 021-brand-management (Y-07)
**Phase**: Phase 1 mock route handler (existing route, side effect added — research.md G2)
**Purpose**: Rename a brand (FR-005, US3). Request/response shape is unchanged; a change-history side effect is added.

---

## Request (unchanged)

`PATCH /api/crm/brands/{id}`

```json
{ "display_name": "JOYFIT（新)", "brand_id": "joyfit", "updated_by": "山田 花子（本部）" }
```

`brand_id` is accepted in the payload today but is not actually meant to change post-creation (FR-005 — it is rendered read-only in the UI and is the internal system key). No schema change in this pass; frontend continues to submit the existing (unchanged) `brand_id` value alongside the edited `display_name`.

## Response (unchanged)

```json
{ "message": "ブランド設定を保存しました", "brand": { "...": "BrandDetail" } }
```

## Side effect — change history (new, G2)

If `display_name` differs from the stored value, `brands.update()` appends one `BrandChangeHistoryItem`: `target_display_name` = the brand's own (new) `display_name`, `changed_field: "ブランド名"`, `before_value` = old name, `after_value` = new name. No row is appended if the submitted `display_name` is unchanged (e.g. the user only re-saves without editing anything).

## Reachability change (research.md G4, G5)

This route continues to exist and remains the brand-list row "編集" action's mutation. The detail-page "基本情報を編集" button (`brands/[id]/page.tsx`) has its call into this route commented out (source kept, not deleted — G5) and renders disabled with a Phase-2 tooltip per V0 — the route itself is unaffected. The only entry point being touched here is the brand-list **create** flow (`POST /crm/brands`, no request/response shape change — that call site is commented out, not deleted, per G4).

## Authorization

Requires `Permission.BrandsEdit` — unchanged.
