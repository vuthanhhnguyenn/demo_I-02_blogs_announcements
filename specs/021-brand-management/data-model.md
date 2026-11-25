# Data Model: Y-07 Brand Master Management

Derived from `spec.md`'s Key Entities, resolved against the **existing** Phase 1 mock-DB implementation (`src/app/api/_mock-db/tables/franchise.table.ts` — the actual `brands` table, despite `brand.table.ts`'s misleading name holding unrelated tables) and `research.md`'s decisions (G1-G3). Only fields that change are called out in full; unchanged fields are listed for completeness but not re-justified.

## Brand (existing, `BrandDetail` in `src/app/api/_schemas/brand.schema.ts`)

| Field                     | Type                     | Notes                                                                                                                                   |
| ------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `brand_id`                | `string`                 | Immutable internal key (FR-005). Unchanged.                                                                                             |
| `code`                    | `string`                 | Route/lookup key, equals `brand_id` today. Unchanged.                                                                                   |
| `display_name`            | `string`                 | Editable (FR-005, US3). Unchanged.                                                                                                      |
| `status`                  | `'active' \| 'inactive'` | Unchanged.                                                                                                                              |
| `fee_group_count`         | `number`                 | Derived from live `_feeGroups` length — already correct, no change needed.                                                              |
| `change_history_count`    | `number`                 | Derived from live `_changeHistories` length — becomes meaningful once G2 lands (currently always equals the static seed count).         |
| `created_at`/`updated_at` | `string` (ISO)           | `update()` already stamps `updated_at`; unchanged.                                                                                      |
| `created_by`/`updated_by` | `string \| null`         | `update()` already accepts `updated_by` from the request; **now also feeds the `changed_by` value on the history row it appends (G2)**. |

**Validation rules** (unchanged): `display_name` required, `brand_id` immutable after creation, brand-new-record creation is out of scope this phase (G4).

## Sub-Brand Fee Entry (existing, `BrandFeeGroup`)

| Field                                   | Type                     | Notes                                                             |
| --------------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| `parent_brand_code`/`parent_brand_name` | `string`                 | Unchanged.                                                        |
| `sub_brand_code`/`sub_brand_id`         | `string`                 | Unchanged.                                                        |
| `display_name`                          | `string`                 | Unchanged.                                                        |
| `status`                                | `'active' \| 'inactive'` | Flipped by `disableFeeGroup` — **now actually implemented (G1)**. |
| `fee_master_id`                         | `string`                 | Unchanged.                                                        |
| `fee_items`                             | `BrandFeeItem[]`         | See below.                                                        |

## Fee Item (existing `BrandFeeItem`, request shape extended — G3)

Response shape (`BrandFeeItemSchema`) is unchanged. The **request** shape (`UpdateBrandFeeItemSchema`) gains one field:

| Field                             | Type                             | Required | Notes                                                                                                                                                                               |
| --------------------------------- | -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `item_code`                       | `string`                         | yes      | Unchanged — identifies which existing item this patches.                                                                                                                            |
| `item_name`                       | `string` (max 255)               | yes      | Unchanged.                                                                                                                                                                          |
| `current_value_including_tax_yen` | `number` (int, ≥ 0)              | yes      | Unchanged.                                                                                                                                                                          |
| `effective_start_date`            | `string` (`yyyy/MM/dd`)          | yes      | Unchanged.                                                                                                                                                                          |
| `scheduled_changes` **(new)**     | `BrandScheduledFeeChangeInput[]` | no       | Full replacement list for this item's revisions (empty array clears all). Defaults to `[]` when omitted, preserving today's "no revisions" behavior for callers that don't send it. |

New request-only schema `BrandScheduledFeeChangeInputSchema`:

| Field                     | Type                    | Required | Notes                                                                                                                                                                       |
| ------------------------- | ----------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `effective_start_date`    | `string` (`yyyy/MM/dd`) | yes      | Must be unique within the item's `scheduled_changes` array (FR-009 / US2 AS3) — enforced client-side (Zod `superRefine`) and re-validated server-side in the route handler. |
| `value_including_tax_yen` | `number` (int, ≥ 0)     | yes      | FR-009 — non-negative integer.                                                                                                                                              |

`registered_at` / `registered_by` (response-only, `BrandScheduledFeeChangeSchema`) are **never** accepted from the client — the mock `updateFeeGroup()` stamps them: `registered_at` = today's date (`yyyy/MM/dd`), `registered_by` = the request's `updated_by` or the `'STF-001'` mock fallback, for any incoming entry whose `effective_start_date` doesn't match an existing revision (i.e., new entries get a fresh stamp; entries that already existed by that date keep their original `registered_at`/`registered_by`).

**Validation rules**:

- No two entries in the same item's `scheduled_changes` may share `effective_start_date` (FR-009, US2 AS3) — blocks save with a field-level error.
- No two entries may share `effective_start_date` with the item's own current `effective_start_date` either (a revision can't duplicate the current setting's date).
- `effective_start_date` in the past is permitted but surfaces a non-blocking warning, both for the item's current setting (already implemented) and for each revision row (FR-010, US2 AS4 — new).
- `value_including_tax_yen` must be a non-negative integer (FR-009) — reuses the existing `feeValueSchema` pattern from `brand-fee-group-form.schema.ts`.

## Scheduled Fee Revision (existing display type, now also a write target — see Fee Item above)

No structural change to the entity itself; it moves from "seed-only, read-only" to "user-writable via the fee edit sheet."

## Change History Entry (existing `BrandChangeHistoryItem`, now actually populated — G2)

| Field                        | Type     | Notes                                                                                                                                                                                                  |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `changed_at`                 | `string` | **New**: stamped at mutation time (`yyyy/MM/dd HH:mm:ss`, matching seed format) instead of only existing in seed rows.                                                                                 |
| `changed_by`                 | `string` | **New**: sourced from the mutation's `updated_by` input, falling back to a mock actor label when omitted.                                                                                              |
| `target_display_name`        | `string` | **New**: `"{parent_brand_name} / {sub_brand_name}"` for fee-group changes, or the brand's own `display_name` for brand-level changes (rename).                                                         |
| `changed_field`              | `string` | **New**: one row per changed field (e.g. `"ブランド名"`, `"入会金 定価"`, `"入会金 有効開始日"`) — a single save that changes N fields produces N rows, matching the existing seed data's granularity. |
| `before_value`/`after_value` | `string` | **New**: stringified previous/new value (currency formatted for yen fields, matching seed examples like `"¥10,000"`).                                                                                  |

**Write triggers** (all new — G2):

- `brands.update()` — brand rename: one row if `display_name` changed.
- `brands.updateFeeGroup()` — one row per changed field, across all fee items in the patch.
- `brands.disableFeeGroup()` **(new method, G1)** — one row: `changed_field = "ステータス"`, `before_value = "有効"`, `after_value = "無効"`.
- `brands.deleteFeeGroup()` **(new method, G1)** — no history row (the fee group itself is removed; nothing left to attribute a "change" to, consistent with how delete works elsewhere in this codebase).

## Out of scope for this feature (unchanged from spec.md)

- Creating a brand-new `Brand` record (FR-015, G4) — the `add()` method and `POST /crm/brands` route remain in the codebase but are no longer reachable from the UI.
- Creating a brand-new `Sub-Brand Fee Entry` from scratch (FR-015) — the fee tab's own "新規登録" stays disabled (G6).
- Editing `Brand` basic info beyond `display_name` — no new fields added to `BrandDetail`.
