# Research: Y-01 Position Master Management (職位マスター管理)

**Feature**: 017-position-management | **Date**: 2026-07-16
**Purpose**: Resolve all open technical decisions before Phase 1 design. No `NEEDS CLARIFICATION` tokens remain in the spec (3 resolved in the clarify session); the items below are implementation-level decisions grounded in the existing codebase and the BE API design.

---

## R1 — Extend the existing `positions` table/schema (do not create a parallel one)

- **Decision**: Extend `src/app/api/_schemas/position.schema.ts`'s `PositionSchema` and the existing `positions` mock table/seed in place: keep `id: number` and `position_name`; add `description: string | null`, `permissions: PermissionMap` (36-key flat boolean map), `is_system_managed: boolean`, `created_at` / `updated_at`. Replace the loose `features: Record<string, unknown>` JSON blob with the typed permission map (the `features` summaries move into `description`).
- **Rationale**: The staffs feature already consumes `GET /crm/positions` and stores `staff.position_id: number` as an FK. A second position source would fork the master; switching to UUID ids would break the staff FK and seeds. Adding typed fields is the smallest change that satisfies FR-006/FR-S001.
- **Alternatives considered**: (a) New `position-master` table alongside the old — rejected: two sources of truth for the same Y-01 concept. (b) UUID ids per BE design — rejected: breaks `staff.position_id` integration; id format is a Phase 2 client-regeneration concern, not a Phase 1 behavior. (c) Keep `features` blob and bolt permissions next to it — rejected: `no-explicit-any`/typed-domain principle; `features` has no remaining consumer role.

## R2 — List endpoint: BE-shaped pagination + mock-extension filters; migrate staffs-feature consumers

- **Decision**: Upgrade `GET /api/crm/positions` to the BE design's response shape `{ items: PositionListItem[], pagination: { page, limit, totalItems, totalPages } }` with query params `role?`, `page=1`, `limit=50`, `sort=role|name|createdAt` (default `role` = enum order), `order=asc|desc`, plus `search` (case-insensitive partial name match) and `permissionKey` (reverse permission filter honoring grant semantics). **Update 2026-07-29**: API v0.3 made both official — `search` verbatim and the reverse filter as `permission`; the mock's param was renamed to `permission` to match, and the baseline count moved to the BE shape `includeTotalAll` → `pagination.totalAllItems`. The response also carries `totalAll` (unfiltered count) via `includeTotalAll=true` → `pagination.totalAllItems` (BE v0.3 shape), so the filter banner can render "全 {totalAll} 件中 {totalItems} 件を抽出中". Update the existing staffs-feature consumers of the old `{ positions: [...] }` shape (dropdowns/filters) to read `items` after client regeneration.
- **Rationale**: Server-driven querying matches the sibling routines screen and the project's react-query.gen pattern. The params raised as gaps in 2026-07 are now part of the BE contract (v0.3), leaving only field-naming deltas to reconcile at the Phase 2 cutover. A breaking response-shape change is contained: only the staffs feature reads this endpoint today.
- **Alternatives considered**: (a) Keep `{ positions }` and filter/paginate client-side like the V0 mock — rejected: diverges from both the BE pagination contract and the established sibling-screen pattern. (b) Add a second endpoint for the new shape — rejected: duplicate surface for one resource (YAGNI, Principle V).

## R3 — Permission catalog: BE-matching `can_*` keys; contract in mock schema, display metadata feature-local (REVISED 2026-07-16; UPDATED 2026-07-29 for API v0.3)

- **Decision** (supersedes the earlier "shared pure-data module in `_schemas/`" draft):
  1. **Key naming follows the BE design exactly.** API design v0.3 (2026-07-29) enumerates a **58-flag / 10-category** catalog in the `getPositionPermissions` description. The Phase 1 map uses the BE `can_*` permission keys for the 35 V0 toggles that map 1:1 to BE flags, and the same `can_*` convention for the single remaining FE-extension toggle with no BE flag (`can_edit_gate_stop` — see data-model.md §1). `categoryKey` values are the BE enum verbatim: `member, gate, application, lesson, facility, sales, promotion, content, system_setting, csv_export`.
  2. **The contract lives only in the mock schema layer** (`src/app/api/_schemas/position.schema.ts`): a closed Zod `PermissionMapSchema` enumerating the 36 keys as `z.boolean()`. This flows into OpenAPI → the generated client, so the UI gets the key union from `src/lib/api/types.gen` — never from mock internals.
  3. **Categories / keys / labels / order are served by the catalog endpoint** (`GET /api/crm/permissions`, mirroring the BE's new `GET /api/v1/admin/permissions`) — the API team's declared SoT for the create-form toggles. The form renders from that response; it does not hardcode a category list.
  4. **Only UI-presentation metadata stays feature-local** in `src/app/(private)/positions/_constants/position-permissions.constant.ts`: each permission's optional helper description, the `kind: 'view' | 'edit'` used for the preview's category-level derivation, the destructive-permission set (FR-007a), and the CSV role defaults. It is typed `satisfies` against the generated permission-map type so a key mismatch is a compile error, and it is joined to the catalog response by `permissionKey`.
- **Rationale**: The mock API layer is disposable — it is deleted in Phase 2, so nothing outside `src/app/api/` may import from it (user directive). The generated client is the only sanctioned bridge (Constitution II), and it survives the mock's removal unchanged. BE-matching key names make the Phase 2 switch mechanical: 35 keys already agree with the real `positions` columns; only `can_edit_gate_stop` still needs BE-side addition (spec Q5). Sourcing categories/labels from the catalog endpoint means the displayed permission set cannot drift from the server catalog — which is exactly the reason the BE added the endpoint — while the helper text and view/edit kind, which the catalog contract does not carry, stay with the screen that renders them.
- **Alternatives considered**: (a) Shared catalog module under `_schemas/` imported by the UI — rejected: couples UI to the disposable mock layer. (b) Keep the FE-invented `member_view`-style keys — rejected: every key would need renaming at Phase 2 cutover; BE names are published and stable. (c) `z.record(z.boolean())` open map — rejected: loses key-level type safety, admits unknown keys silently.

### BE catalog (verbatim from API design v0.3, 58 flags / 10 categories) — Phase 1 exposure

| categoryKey      | BE keys (v0.3)                                                                                                                                                                                                                                                     | Exposed in Phase 1 form?                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `member`         | can_view_member, can_edit_member, can_apply_transfer_suspension, can_approve_transfer, can_force_withdrawal, can_cancel_withdrawal, can_set_temporary_recess, can_anonymize_member, can_exempt_delinquency, can_adjust_fee                                         | 4 of 10 (first 3 + can_force_withdrawal)         |
| `gate`           | can_view_gate_log, can_edit_gate_setting                                                                                                                                                                                                                           | both (2)                                         |
| `application`    | can_view_application, can_approve_application, can_cancel_application, can_create_proxy_application, can_register_corporate_member, can_register_social_discount_member, can_register_special_contract, can_delete_others_application_memo, can_manage_trial_visit | 3 of 9                                           |
| `lesson`         | can_view_lesson_reservation, can_manage_lesson_reservation, can_manage_lesson_schedule, can_manage_lesson_master, can_manage_trainer_profile, can_edit_own_trainer_profile, can_delete_trainer_profile, can_manage_studio_master, can_delete_studio_master         | 3 of 9                                           |
| `facility`       | can_view_facility, can_edit_facility, can_manage_locker_contract                                                                                                                                                                                                   | all (3)                                          |
| `sales`          | can_view_sales, can_edit_sales, can_confirm_billing, can_add_manual_billing, can_edit_after_billing_confirmed, can_execute_refund                                                                                                                                  | 4 of 6                                           |
| `promotion`      | can_view_promotion, can_manage_promotion, can_create_survey                                                                                                                                                                                                        | all (3)                                          |
| `content`        | can_view_content, can_manage_content, can_manage_notification                                                                                                                                                                                                      | all (3)                                          |
| `system_setting` | can_view_staff, can_manage_staff, can_manage_position, can_manage_store_setting, can_view_terms_documents, can_manage_terms_documents, can_edit_store_photo, can_edit_store_business_hours, can_edit_store_basic_info                                              | 7 of 9 + 1 FE-extension key (can_edit_gate_stop) |
| `csv_export`     | can_export_member_csv, can_export_gate_log_csv, can_export_survey_csv, can_export_accounting_csv                                                                                                                                                                   | 3 of 4 (会計CSV not in the prototype)            |

23 BE flags have no V0 toggle and stay out of the Phase 1 form (decision 2026-07-29 keeps the UI at the prototype's 36); `can_edit_gate_stop` is the only FE-extension key left with no BE flag (spec Q5, R13).

**Closed since v0.2** (the API team's 追従漏れ fix): the independent `csv_export` category + its `can_export_*` flags (FR-S001), and three of the four Y-02 store-item flags (`can_edit_store_photo`, `can_edit_store_business_hours`, `can_edit_store_basic_info`) are now official BE columns — previously FE extensions.

## R4 — Derived list fields: `staffCount` and the アクセス権限数 column (renamed 2026-07-29)

- **Decision**: The list route computes per row: `staff_count` = count of non-deleted staffs whose `position_id` matches (join against the staffs table, mirroring the BE rule `COUNT(staffs WHERE position_id = id AND deleted_at IS NULL)`), and `enabled_category_count` / `total_category_count` = number of categories with ≥1 granted permission / 10. The UI renders these directly; no client-side permission math for the list column. The column header is **アクセス権限数** (prototype 7/23; 権限フラグ数 was renamed after the API team confirmed 権限フラグ ≡ アクセス権限).
- **Rationale**: Keeps the list a single query; `staffCount` semantics mirror the BE contract so Phase 2 needs no UI change. **Confirmed 2026-07-29**: API v0.3 added `grantedCategoryCount` / `totalCategoryCount` with identical semantics ("interpretation A — category axis"), so the Q4 assumption is now BE-backed and only the field names differ.
- **Alternatives considered**: Client-derived counts from a bundled permission map in the list response — rejected: bloats the list payload and diverges from the BE list item (which carries no permission data).

## R5 — Preview pane derivation (category level, 重要操作 indicator, CSV wording) — UPDATED 2026-07-29

- **Decision**: `GET /api/crm/positions/{id}/permissions` returns the BE-shaped grouped preview — `categories: [{ categoryKey, categoryLabel, permissions: [{ permissionKey, label, granted }] }]` — over the 10 categories, `csv_export` included (official in API v0.3, so the former category-enum divergence is closed). The UI derives each category's level from the feature-local `kind` metadata: no key granted → アクセス不可; only `view`-kind granted → 閲覧のみ; any `edit`-kind granted → 閲覧・編集; the `csv_export` category renders 出力可/出力不可 instead. The **権限フラグ section is removed** (API team: 権限フラグ ≡ アクセス権限, merged into one; prototype 7/23 deleted it). Its replacement is a warning icon on any category holding a granted destructive permission — `can_force_withdrawal`, `can_edit_after_billing_confirmed`, `can_execute_refund` — with the tooltip 「強制退会・返金など重要操作を含みます」 (FR-007a).
- **Rationale**: Matches the V0 derivation logic (`isFinePermissionEnabled` / `DESTRUCTIVE_PERM_IDS`) re-expressed over the flat map, keeps the preview endpoint BE-shaped, and needs zero extra state. Deriving the warning client-side avoids asking the BE for a field it explicitly said it does not need.
- **Alternatives considered**: Server-computed levels — rejected: the BE preview contract has no level field; adding one would deepen the contract gap for no benefit.

## R6 — No `GET /crm/roles` endpoint in Phase 1

- **Decision**: Do not implement the BE's `GET /api/v1/admin/roles`. The form's 対象ロール options are the fixed 5 selectable roles (本部 / マネージャー (Manager) / スタッフ (Staff) / トレーナー (Trainer) / 閲覧のみ (Observer)) as a constant, reusing the existing role-label mapping (`src/app/(private)/staffs/_utils/position-role.util.ts` precedent).
- **Rationale**: Roles are 6-fixed by design (FR-018) and the V0 form hardcodes the options; nothing on this screen consumes `positionCount` per role. YAGNI (Principle V).
- **Alternatives considered**: Implement for BE parity — rejected: unconsumed endpoint is dead surface; trivially added later if a screen needs role counts.
- **Contrast with R14**: the permission-catalog endpoint added on 2026-07-29 _is_ implemented because the form actually consumes it (it replaces a hardcoded FE list). The same YAGNI rule therefore keeps `/roles` out and lets `/permissions` in.

## R7 — Clone mode: client-side prefill via `?cloneFrom={id}`

- **Decision**: 複製 navigates to `/positions/create?cloneFrom={id}`. The create page reads the query param (nuqs), fetches the source position's detail, and prefills role, description, and the permission map — the name starts blank (V0 behavior: clone mode has no prefilled name) — and titles the page 職位 複製して作成. Save goes through the normal `POST /api/crm/positions`.
- **Rationale**: The BE design has no duplicate endpoint (unlike routines); URL-driven prefill is refresh-safe and matches the project's nuqs conventions. Spec assumption confirmed.
- **Alternatives considered**: Router state / context passing — rejected: lost on refresh; violates URL-state convention.

## R8 — Role immutability in edit (Clarification Q3)

- **Decision**: The edit page renders the 対象ロール select with the current value, `disabled`. `UpdatePositionBodySchema` (PATCH) contains **no** `role` field, so an edit can never change it — enforced at both UI and contract layers. CSV role-default seeding runs on role change only when the form was not prefilled (create-from-scratch); clone and edit never re-seed (FR-011).
- **Rationale**: Clarified decision; mirrors the BE PATCH contract exactly and preserves the FR-007 role/position invariant.
- **Alternatives considered**: Documented and rejected in the clarify session (editable role; staffCount-conditional editing).

## R9 — Staff change history: seed-only table (FR-019)

- **Decision**: Add `staff-change-history.table.ts` (rows + `_seed()` + `getListByStaffId()` read accessor only — no create/update/delete methods) with `staff-change-history.seed.ts` rows referencing seeded staff/positions (changed_at, changed_by, change_action, snapshot). **No route handler** and **no writes** from position operations.
- **Rationale**: User directive ("history thêm seed only"); the position screens display no history, so an endpoint would be dead surface (YAGNI) — the seeded data readies the staff screens' future FR-010 work.
- **Alternatives considered**: (a) Also expose `GET /crm/staffs/{id}/change-histories` — rejected: no consumer this feature. (b) Write history on position CRUD — explicitly excluded by the directive and FR-019.

## R10 — Delete semantics: physical delete with guards

- **Decision**: `DELETE /api/crm/positions/{id}` physically removes the row. Guards in order: 404 unknown id → 422 `is_system_managed=true` → 409 `staff_count >= 1` (position in use) → 204 on success. The UI additionally disables the menu item ("削除（割当あり）") when `staff_count > 0`, so the 409 is defense-in-depth. No soft delete (positions have no `deleted_at` in the BE design).
- **Rationale**: Mirrors the BE decision table (BR-STF-006) verbatim; UI guard matches V0.
- **Alternatives considered**: Soft delete like other tables — rejected: contradicts the BE contract ("no deleted_at column").

## R11 — Access control & routing registration

- **Decision**: Reuse the existing `Permission.PositionsView / PositionsCreate / PositionsEdit / PositionsDelete` enum values (already present in `src/types/permission.type.ts`). Register page permissions for `/positions`, `/positions/create`, `/positions/[id]/edit` following the established route-gating convention (as done for routines), granting write permissions to Headquarter (System receives all permissions globally). In-page affordances use `RoleGatedButton` / role-gated menu items for 職位を追加 / 編集 / 複製 / 削除 (FR-017).
- **Rationale**: The permission enum groundwork already exists; only registration + affordance gating remain.
- **Alternatives considered**: None — this is the single established pattern.

## R12 — Screen & selection architecture

- **Decision**: One list route (`/positions`) hosting the two-pane layout; the selected position id lives in the URL as `?positionId=` (nuqs) — satisfying the V0 deep-link preselect and making the preview pane shareable/refresh-safe. The preview pane fetches `GET /positions/{id}/permissions` for the selected id (react-query, keyed by id) and `GET /crm/staffs?position_id={id}&limit=…` for the 割当スタッフ panel (existing staffs endpoint already supports the `position_id` filter). No separate detail route — the preview pane is the detail surface (V0 has none either).
- **Rationale**: Matches V0 exactly (URL param preselect exists in the prototype), avoids duplicated state, reuses existing endpoints.
- **Alternatives considered**: Local `useState` selection — rejected: loses the V0 `positionId` URL-param behavior (PAR021).

## R13 — BE contract gaps: status after the 2026-07-29 QA answers

| #   | Gap raised (2026-07)                                                        | Status                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `description` on position create/update/detail/list (Q1)                    | **Closed** — official in API v0.3 (nullable, ≤500, PATCH-clearable). Mock limit tightened 1000 → 500.                                                                                     |
| 2   | Independent `csv` category + `can_export_*` flags (FR-S001, Q2/Q4-adjacent) | **Closed** — official as `csv_export` with 4 flags (`can_export_accounting_csv` added; not in the prototype, so not rendered).                                                            |
| 3   | Y-02 Staff-editable store-item flags (Q2)                                   | **Partially closed** — `can_edit_store_photo`, `can_edit_store_business_hours`, `can_edit_store_basic_info` are official; **`can_edit_gate_stop` is still missing** → see R13-open below. |
| 4   | No standalone permission catalog for the create form (Q2)                   | **Closed** — `GET /api/v1/admin/permissions` added and declared SoT (see R14).                                                                                                            |
| 5   | List `search` / reverse permission filter params (R2)                       | **Closed** — `search` and `permission` are official v0.3 query params.                                                                                                                    |
| 6   | List permission-count field (Q4)                                            | **Closed** — `grantedCategoryCount` / `totalCategoryCount`, same semantics as assumed.                                                                                                    |
| 7   | 権限フラグ block's purpose (position-kengen-flag QA)                        | **Closed** — 権限フラグ ≡ アクセス権限, merged into one; no API field needed. UI section removed, column renamed, warning icon added (R5).                                                |

**R13-open — the one remaining gap**: `can_edit_gate_stop` (ゲートストップ設定の変更). Y-01 FR-006 v2 lists it as a Staff-editable store item and the prototype renders it as its own toggle in システム設定, but API v0.3 has no such column. Phase 1 keeps it as the single FE-extension key; the API team is asked to add a flag or confirm it is meant to be `gate`'s `can_edit_gate_setting` (spec Q5).

**Naming deltas to reconcile at the Phase 2 cutover** (not gaps — same semantics, different names): mock `position_name` vs BE `name`; mock integer `id` vs BE UUID `positionId` (deliberate — research R1). ~~`permissionKey` query param / `enabled_category_count` / top-level `totalAll`~~ — **aligned to the BE names on 2026-07-29**: the list now takes `permission` + `includeTotalAll` and returns `grantedCategoryCount` / `totalCategoryCount` and `pagination.totalAllItems` (the latter matching the project's terms/routine/app-maintenance pattern).

## R14 — Permission catalog endpoint: mirror it, and actually consume it (NEW 2026-07-29)

- **Decision**: Add `GET /api/crm/permissions` to the mock API, returning `{ totalCategoryCount, totalPermissionCount, categories[{ categoryKey, categoryLabel, permissions[{ permissionKey, label }] }] }` composed from the mock layer's existing grouping metadata (the same source the preview endpoint uses, so the two can never disagree). The create/edit/clone form's 権限設定 section renders its categories from this response and merges the feature-local helper description by `permissionKey`; the form's default values and Zod shape still come from the compile-time key list, so an unexpected key cannot corrupt form state.
- **Rationale**: This is exactly what the FE asked for and the BE delivered (QA answer 2026-07-29) — the endpoint exists so the displayed permission set cannot drift from the server catalog. Mirroring it without consuming it would be dead surface (the R6 rule); consuming it makes the Phase 2 cutover a base-URL change rather than a rewrite, and it removes the hardcoded category list the QA flagged.
- **Alternatives considered**: (a) Keep rendering from the feature-local catalog and skip the endpoint — rejected: leaves the FE hardcoding what the BE now owns, and the answer to the QA would not be reflected in code. (b) Move helper descriptions and `kind` into the mock catalog response — rejected: they are presentation concerns the real BE contract does not carry, so they would vanish at the Phase 2 cutover. (c) Fetch the catalog in the preview pane too — unnecessary: the preview endpoint already returns labels with `granted`.
