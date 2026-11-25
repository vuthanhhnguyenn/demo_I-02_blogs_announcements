# Real API Integration Plan: Y-01 Position Master Management (職位マスター管理)

**Branch**: `feat/position-integration-` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/positions/**` — list + preview pane, create, edit/clone
**Target API**: `src/lib/api-real` (generated from `src/lib/openapi.real.json`, API-082 Staff & Permission Management)

## Guiding principle

**UI first.** Where the real API cannot yet back a UI element, the element **stays as it is today**
and the integration leaves a `TODO(round2)` comment naming the blocker. No UI is deleted to fit
the current API surface. Round 2 closes those TODOs once the BE side is fixed.

Mock API routes under `src/app/api/crm/positions/**`, `src/app/api/_schemas/position.schema.ts` and
the mock-db tables/seeds are **left untouched** (same convention as the staffs integration,
commits `750bce9d` / `be235f7c`) — they simply stop being called by this feature.

## Endpoint mapping

| UI surface                                      | Real endpoint                                  | Hook (`@/lib/api-real/@tanstack/react-query.gen`)          | Round |
| ----------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ----- |
| List (search / permission filter / paging)      | `GET /api/v1/admin/positions`                  | `adminStaffPermissionControllerListPositionsOptions`       | 1     |
| Filter banner baseline count                    | `GET /api/v1/admin/positions?page=1&limit=1`   | same, second query                                         | 1     |
| Preview pane header + form prefill (edit/clone) | `GET /api/v1/admin/positions/{id}`             | `adminStaffPermissionControllerGetPositionOptions`         | 1     |
| Preview pane category list                      | `GET /api/v1/admin/positions/{id}/permissions` | `adminStaffPermissionControllerPositionPermissionsOptions` | 1     |
| Preview pane 割当スタッフ                       | `GET /api/v1/admin/staff?positionId=`          | `adminStaffPermissionControllerListStaffOptions`           | 1     |
| Form toggles + filter dropdown source           | `GET /api/v1/admin/permissions`                | `adminStaffPermissionControllerPermissionCatalogOptions`   | 1     |
| Create / clone submit                           | `POST /api/v1/admin/positions`                 | `adminStaffPermissionControllerCreatePositionMutation`     | 1     |
| Edit submit                                     | `PATCH /api/v1/admin/positions/{id}`           | `adminStaffPermissionControllerUpdatePositionMutation`     | 1     |
| Delete                                          | `DELETE /api/v1/admin/positions/{id}`          | `adminStaffPermissionControllerDeletePositionMutation`     | 1     |

Every endpoint the three screens need exists. No screen is blocked as a whole.

## Blockers carried into Round 2

| ID     | Blocker                                                                                                                                                                            | Round 1 behaviour (UI kept)                                                                                                                                                                                                                                                                                                              | Round 2 (after API fix)                                                                                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | Catalog has no `can_edit_gate_stop` (「ゲートストップ設定の変更」). Real catalog = 58 keys; sending the key would be `E-VAL-001`.                                                  | The row **stays visible** in the form's システム設定 category, rendered from a client-side `LOCAL_ONLY_PERMISSIONS` entry, **disabled** with a 「API未対応」 note, and **stripped from every request body**. The preview pane cannot show it (no server data) — `TODO(round2)` comment at the injection point.                           | **Blocked on the BE adding a `positions.can_edit_gate_stop` column** (spec Q5, decided 2026-09-08). Once it ships: delete `LOCAL_ONLY_PERMISSIONS`, un-disable the row, and let the key flow through untouched. |
| **B2** | Catalog carries no `view` / `edit` classification, so `deriveCategoryLevel` cannot tell 閲覧のみ from 閲覧・編集 for the 23 newly exposed keys.                                    | FE classifies all 58 keys locally in `position-permissions.constant.ts` (table in **D3**). Same mechanism as today — the file already owns this UI-only metadata.                                                                                                                                                                        | If BE adds the field, drop the local table and read it from the catalog.                                                                                                                                        |
| **B3** | `description` is declared `type: object` + `maxLength: 500` in the BE OpenAPI, so codegen emits `{ [key: string]: unknown } \| null` on `CreatePositionDto` / `UpdatePositionDto`. | Textarea unchanged. One cast in `_utils/position-api.util.ts` (`as CreatePositionDto['description']`) — the single seam, `TODO(round2)`. **T014 smoke-tests it live**: if the BE rejects a string body, Round 1 stops sending `description` and the textarea gets an inline 「API未対応」 hint instead (still visible, still validated). | BE changes to `type: string, nullable: true` → regenerate → remove the cast.                                                                                                                                    |

## Decisions

- **D1 — No mapper layer.** Components consume `api-real` DTOs directly (`PositionListItemDto`,
  `PositionDto`, `PositionPermissionsResponseDto`, `CatalogCategoryDto`, `StaffSummaryDto`), matching
  the staffs feature. Renames (`position_name`→`name`, `staff_count`→`staffCount`,
  `is_system_managed`→`isSystemManaged`, `created_at`→`createdAt`) happen in place.
- **D2 — Form field names follow the DTO.** `position_name` → `name` in `PositionFormValues`, so
  `setError('name')` and the request body share one name. `description`, `role`, `permissions`
  keep their names.
- **D3 — Permission keys stay compile-time typed.** The real API types the permission map as
  `Record<string, boolean>`, which would lose the current key safety, so
  `position-permissions.constant.ts` becomes the single source: a 58-key literal tuple plus
  `kind` per key, with a type-level drift assertion — every `can*` field of `PositionDto` must map
  onto a listed key (a BE-side catalog change then fails `tsc`, not runtime).
  Classification of the 23 newly exposed keys (rule: `can_view_*` → `view`, everything else → `edit`):

  | kind        | keys                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
  | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `view` (1)  | `can_view_terms_documents`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
  | `edit` (22) | `can_approve_transfer`, `can_cancel_withdrawal`, `can_set_temporary_recess`, `can_anonymize_member`, `can_exempt_delinquency`, `can_adjust_fee`, `can_cancel_application`, `can_register_corporate_member`, `can_register_social_discount_member`, `can_register_special_contract`, `can_delete_others_application_memo`, `can_manage_trial_visit`, `can_manage_lesson_master`, `can_manage_trainer_profile`, `can_edit_own_trainer_profile`, `can_delete_trainer_profile`, `can_manage_studio_master`, `can_delete_studio_master`, `can_confirm_billing`, `can_add_manual_billing`, `can_manage_terms_documents`, `can_export_accounting_csv` |

  The other 35 keys keep the `kind` they have today; `can_edit_gate_stop` stays local-only (**B1**).
  `DESTRUCTIVE_PERMISSION_KEYS` keeps exactly today's 3 keys — `can_anonymize_member` is deliberately
  excluded (spec Clarifications 2026-09-08, FR-007a), so the integration changes no 重要操作 behaviour.

- **D4 — Pagination.** `POSITION_PAGE_SIZE_OPTIONS` = `[25, 50, 100]` (the API caps `limit` at 100);
  default stays 50. Out-of-range values in the URL fall back to the default, as today.
- **D5 — Counts.** Header badge and 全N件中M件 banner: the filtered count comes from
  `pagination.totalItems`; the baseline comes from a second `limit: 1` query enabled only while a
  filter is active (`staffs/page.tsx:100` precedent) — the API has no `includeTotalAll`.
  Preview pane 割当スタッフ count comes from the staff query's `pagination.totalItems`
  (`PositionDto` carries no `staffCount`).
- **D6 — Errors.** Read `code` off `ErrorResponseDto`: `E-STF-010` → inline duplicate-name error on
  the `name` field; `E-STF-011` → 「割当スタッフがいるため削除できません」 on delete; `E-STF-012` →
  system-managed guard. Per-mutation `onError` toasts are removed: the shared `MutationCache`
  already toasts `userMessage` (double-toast otherwise).
- **D7 — System-managed positions.** `isSystemManaged` rows get 編集 / 削除 disabled with a tooltip,
  so the 422 `E-STF-012` path becomes unreachable from the UI. 複製 stays allowed (it POSTs a new row).
- **D8 — Role `system`.** Added to `POSITION_ROLE_BADGE_LABELS` as 「システム」 so system rows render a
  badge; **not** added to `POSITION_ROLE_OPTIONS` (FR-018 keeps it unselectable).

## Round 1 tasks

IDs are per-file; `[P]` = parallelizable with its neighbours.

### Phase A — foundations (no UI change yet)

- **T001** `_constants/position-permissions.constant.ts` — rewrite as the 58-key source of truth:
  `POSITION_PERMISSION_KEYS` tuple, `PERMISSION_KIND_BY_KEY`, `PERMISSION_DESCRIPTION_BY_KEY`
  (existing 36 descriptions kept, new keys have none), `CSV_PERMISSION_KEYS` (now 4, incl.
  `can_export_accounting_csv`), `CSV_DEFAULTS_BY_ROLE` (+`system: false`),
  `LOCAL_ONLY_PERMISSIONS` for **B1**, `DESTRUCTIVE_PERMISSION_KEYS` unchanged, and the
  `PositionDto`-vs-catalog drift assertion (**D3**). Drops the `@/lib/api/types.gen` import.
  Key sets stay explicit: `POSITION_PERMISSION_KEYS` = the 58 server keys; `LOCAL_ONLY_PERMISSIONS`
  = `can_edit_gate_stop` only; `POSITION_FORM_PERMISSION_KEYS` = both (59) — the form state and zod
  shape cover all 59, request bodies only the 58.
- **T002** `_utils/position-permission.util.ts` _(new)_ — `PERMISSION_KEY_TO_DTO_FIELD`
  (snake key → `PositionDto` camel field, 58 explicit entries),
  `permissionMapFromPositionDto(dto)` for prefill, `buildAllOffPermissions()`,
  and `toRequestPermissions(map)` which strips `LOCAL_ONLY_PERMISSIONS` (**B1**).
- **T003** `_utils/position-api.util.ts` _(new)_ — `toCreatePositionBody()` / `toUpdatePositionBody()`
  (incl. the **B3** `description` cast) and `getPositionErrorCode(error)` for **D6**.
- **T004** `[P]` `_constants/position.constants.ts` — page-size options (**D4**), `system` badge
  label (**D8**).

### Phase B — list screen

- **T005** `_hooks/use-position-filters.hook.ts` — `positionId` becomes `parseAsString` (uuid),
  `permission` becomes `parseAsString` validated against `POSITION_PERMISSION_KEYS`, drop
  `includeTotalAll`, clamp `limit`, type `queryParams` off
  `AdminStaffPermissionControllerListPositionsData['query']`.
- **T006** `_components/position-table-columns.tsx` `[P]` — `PositionListItemDto`, `name` /
  `staffCount`, role badge via **D8**.
- **T007** `_components/position-row-actions.tsx` `[P]` — `PositionListItemDto`, `staffCount`,
  `isSystemManaged` gate (**D7**).
- **T008** `_components/position-delete-dialog.tsx` `[P]` — DTO + `name`.
- **T009** `page.tsx` — real list query + baseline query (**D5**), real delete mutation with
  `E-STF-011` handling and real query-key invalidation, uuid `selectedPositionId` / `goToEdit` /
  `goToClone`, per-mutation error toast removed (**D6**).
- **T010** `_components/position-permission-filter.tsx` — options built from the permission catalog
  query instead of the local category list (58 keys, server labels/order), skeleton while loading;
  `findPermissionLabel` resolves from the catalog with the key as fallback.
- **T011** `_components/permission-preview-panel.tsx` — uuid `positionId`; `getPosition` +
  `positionPermissions`; staff sub-list via `adminStaffPermissionControllerListStaffOptions`
  (`{ positionId, page: 1, limit: 3, sort: 'status', order: 'asc' }`), reading `items` and
  `pagination.totalItems` (**D5**); `storeName` / `fcCompanyName` straight off `StaffSummaryDto`
  → the per-staff `getCrmStoresById` fan-out and its TODO are deleted; `status: 'invited'` renders
  a 「招待中」 badge alongside the existing 「無効」; staff links use `staff.id`.

### Phase C — create / edit / clone

- **T012** `_schemas/position-form.schema.ts` — `name` field (**D2**), `description` max 500,
  permissions shape built from `POSITION_PERMISSION_KEYS`, prefill via
  `permissionMapFromPositionDto` (**T002**), bodies via **T003**, `applyCsvRoleDefaults` over the
  4 CSV keys.
- **T013** `_components/position-form/position-form.tsx` — real create/update mutations + catalog
  query, uuid `positionId`, `finish(id)` on `PositionDto.id`, `E-STF-010` → inline name error,
  `E-STF-012` guard, real query-key invalidation, local error toasts removed (**D6**).
- **T014** `_components/position-form/position-form-basic-info-section.tsx` — `name` field rename,
  description counter at 500, `POSITION_ROLE_OPTIONS` unchanged; **B3** live check happens here
  (create a position with a description against the dev API; on 400 switch to the documented
  fallback and note it in this file).
- **T015** `_components/position-form/position-form-permissions-section.tsx` — types from
  `CatalogCategoryDto`, catalog merged with `LOCAL_ONLY_PERMISSIONS` (**B1**, disabled row +
  「API未対応」 note + `TODO(round2)`), bulk toggle skips local-only keys.
- **T016** `create/page.tsx` `[P]` — `cloneFrom` as `parseAsString`, `getPosition` prefill.
- **T017** `[id]/edit/page.tsx` `[P]` — uuid `id` straight from the route (no `Number()`),
  `getPosition`, 404 → 「職位が見つかりませんでした」.

### Phase D — verification

- **T018** `npx tsc --noEmit` (gate: 0 errors outside `.next/`) + `npm run lint`.
- **T019** Live smoke run against `NEXT_PUBLIC_REAL_API_URL` (dev): list → search → permission
  filter → paging → select row → preview categories/staff → clone → create → edit → delete
  (both the assigned-staff 409 and the clean path), plus a system-managed row's disabled actions.
- **T020** Record the outcome (incl. the **B3** verdict) in this file's _Round 1 result_ section and
  update `checklists/parity.md` only where real-API behaviour genuinely changes a checked item.

## Round 2 backlog (after the API is fixed)

- **R201** BE adds the `positions.can_edit_gate_stop` column (spec Q5 ask) → remove `LOCAL_ONLY_PERMISSIONS`, un-disable the row,
  drop the strip in `toRequestPermissions`, show it in the preview pane (**B1**).
- **R202** `description` typed as `string` → regenerate `api-real`, remove the cast in
  `position-api.util.ts`; if the T014 fallback was taken, restore sending the field (**B3**).
- **R203** If the catalog gains a `kind` (or equivalent) field → delete `PERMISSION_KIND_BY_KEY`
  and derive category levels from the server (**B2**).
- **R204** If a `staffCount` is added to `PositionDto` → drop the extra staff query in the preview
  pane's count path (**D5**).
- **R205** If `includeTotalAll` (or `totalAllItems`) is added to the list response → drop the
  baseline query (**D5**).

## Resolved questions

Both questions this plan opened were cleared in the spec's **Clarifications — Session 2026-09-08**:

- **Q-A → closed.** `DESTRUCTIVE_PERMISSION_KEYS` stays at the prototype's three keys; `can_anonymize_member`
  is **not** added (FR-007a updated to say the set does not widen with the 58-flag catalog). No task change.
- **Q-B / spec Q5 → decision made, BE ask sharpened.** The absence of `can_edit_gate_stop` is **not** resolved by
  aliasing it to `can_edit_gate_setting` — backend evidence shows ゲートストップ is a member-level operation
  authorized by role + store scope (`E-AUTH-100` / `E-GAT-100`), while `can_edit_gate_setting` guards the HQ
  入退館 setting surface (`E-VIS-102`). The API team is asked for a **dedicated `positions.can_edit_gate_stop`
  column**; until it ships, **B1** stands as written (toggle rendered, disabled, stripped from bodies) and
  **R201** waits on the BE. Q5 therefore stays open in `spec.md` as a BE dependency, not as an FE decision.

## Round 1 result (2026-09-08)

**Status: code complete, static gates green, live smoke run pending (owner: user).**

### Shipped

| Task      | File                                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T001      | `_constants/position-permissions.constant.ts` | Rewritten on `api-real`: `POSITION_PERMISSION_KEYS` (58, catalog order), `LOCAL_ONLY_PERMISSIONS` (**B1**), `POSITION_FORM_PERMISSION_KEYS` (59), `PERMISSION_KIND_BY_KEY` (rule `can_view_*` → view, **B2**), `PERMISSION_DESCRIPTION_BY_KEY`, `CSV_PERMISSION_KEYS` (4), `CSV_DEFAULTS_BY_ROLE` (+`system`), `DESTRUCTIVE_PERMISSION_KEYS` (unchanged, 3). `POSITION_PERMISSION_CATEGORIES` / `findCatalogCategory` deleted — categories now come from the server catalog. |
| T002      | `_utils/position-permission.util.ts` _(new)_  | `PERMISSION_KEY_TO_DTO_FIELD` (58 explicit entries), `permissionMapFromPositionDto`, `buildAllOffPermissions`, `toRequestPermissions` (strips **B1**). Holds the **D3** drift assertion — see deviation 1.                                                                                                                                                                                                                                                                   |
| T003      | `_utils/position-api.util.ts` _(new)_         | `toCreatePositionBody` / `toUpdatePositionBody`, the single **B3** `description` cast, `POSITION_ERROR_CODE` (+`E-STF-009`) and `getPositionErrorCode`.                                                                                                                                                                                                                                                                                                                      |
| T004      | `_constants/position.constants.ts`            | Page sizes `[25,50,100]` (**D4**), `system: 'システム'` badge (**D8**), shared system-managed tooltip copy.                                                                                                                                                                                                                                                                                                                                                                  |
| T005      | `_hooks/use-position-filters.hook.ts`         | uuid `positionId`, `permission` validated against the 58 keys, `includeTotalAll` dropped, `limit` clamped, query typed off `AdminStaffPermissionControllerListPositionsData`. Also un-breaks the `staffs` detail deep link `/positions?positionId=<uuid>` (was silently dropped by `parseAsInteger`).                                                                                                                                                                        |
| T006–T008 | table columns / row actions / delete dialog   | `PositionListItemDto` (`positionId`, `name`, `staffCount`), role badge via **D8**, `isSystemManaged` gate on 編集/削除 with tooltip, 複製 still allowed (**D7**).                                                                                                                                                                                                                                                                                                            |
| T009      | `page.tsx`                                    | Real list query + baseline `limit:1` query gated on an active filter (**D5**), real delete mutation, real query-key invalidation, uuid row identity / `goToEdit` / `goToClone`.                                                                                                                                                                                                                                                                                              |
| T010      | `_components/position-permission-filter.tsx`  | Options from `adminStaffPermissionControllerPermissionCatalogOptions` (server labels/order) with a loading skeleton; `findPermissionLabel(key, catalog)` — see deviation 4.                                                                                                                                                                                                                                                                                                  |
| T011      | `_components/permission-preview-panel.tsx`    | `getPosition` + `positionPermissions` + `listStaff({ positionId, page:1, limit:3, sort:'status', order:'asc' })`; 割当スタッフ count from that query's `pagination.totalItems` (**D5**); `storeName` / `fcCompanyName` straight off `StaffSummaryDto` — the per-staff `getCrmStoresById` fan-out and its TODO are gone; 招待中 badge added; staff links use `staff.id`; 権限を編集 disabled for system-managed rows.                                                         |
| T012      | `_schemas/position-form.schema.ts`            | `name` (**D2**), description max 500, 59-key permission shape, prefill via `permissionMapFromPositionDto`, bodies via T003.                                                                                                                                                                                                                                                                                                                                                  |
| T013      | `_components/position-form/position-form.tsx` | Real create/update mutations + catalog query, `finish(PositionDto.id)`, `E-STF-010` → inline `name` error, `E-STF-012` → inline guard message, real invalidation, local error toasts removed (**D6**).                                                                                                                                                                                                                                                                       |
| T014      | `position-form-basic-info-section.tsx`        | `name` rename, `maxLength` 500 + a `n/500` counter (was the shared 1000-char textarea cap).                                                                                                                                                                                                                                                                                                                                                                                  |
| T015      | `position-form-permissions-section.tsx`       | Rows built from `CatalogCategoryDto` merged with `LOCAL_ONLY_PERMISSIONS` (disabled switch + 「API未対応」 badge + `TODO(round2)`); category count and bulk toggle skip local-only keys.                                                                                                                                                                                                                                                                                     |
| T016–T017 | `create/page.tsx`, `[id]/edit/page.tsx`       | `cloneFrom` as `parseAsString`, uuid route id used as-is, 404 / `E-STF-009` → 「職位が見つかりませんでした」.                                                                                                                                                                                                                                                                                                                                                                |

Mock surfaces (`src/app/api/crm/positions/**`, `_schemas/position.schema.ts`, `_mock-db`) are untouched
and simply no longer called by this feature.

### Verification

- **T018 green** — `npm run type-check` → 0 errors; `npm run lint` → no issues; `prettier --check` clean.
- **T019 not run** — the screens now hit `NEXT_PUBLIC_REAL_API_URL` (`https://api.dev.fitness-v2.okamoto-hd.com`),
  whose login goes through the real Cognito pool. The QA credentials sheet used for mock-API runs
  (`admin@example.com` / `password123`) is rejected there (Cognito 400), so no authenticated session
  could be established from this session. The user takes over the live run.
- **T020** — this section. `checklists/parity.md` is left untouched: no checked parity item changes
  behaviour in Round 1 (the visible diffs are new API-backed data, the 招待中 badge and the two
  system-managed disabled states, none of which a parity item asserted).

### Still open after Round 1

- **B3 undecided.** Whether the dev backend accepts a plain string for `description` is exactly what
  the live create/edit smoke answers. Until then the cast in `position-api.util.ts` sends the string.
  If the API answers `400 E-VAL-001` on a position with a description, take the documented fallback
  (stop sending `description`, add an inline 「API未対応」 hint on the textarea) and record it here.
- **B1 / B2** unchanged — `can_edit_gate_stop` renders disabled and is stripped from bodies (R201);
  the view/edit classification stays FE-side (R203).

## Round 2 result — pass 1 (2026-09-10)

**Status: 1 of 4 backlog items resolved by this BE update; code updated, static gates green, live smoke still pending (owner: user).**

`src/lib/openapi.real.json` was refreshed and `api-real` regenerated before this round started
(already staged when this round began). Diffing the new schema against the Round 1 baseline
schema-by-schema (not the raw text diff — the file was also re-pretty-printed, which touches
nearly every line) shows exactly one functional change relevant to this feature:

| Schema                                      | Round 1 → Round 2                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `CatalogPermissionDto`, `PermissionItemDto` | **Changed.** Both gained a `type: 'view' \| 'edit' \| 'destructive'` field per permission key.        |
| `CreatePositionDto`, `UpdatePositionDto`    | Unchanged. `description` is still `type: object` (**B3** — not fixed).                                |
| `PositionDto` (single GET)                  | Unchanged. Still no `staffCount` (**D5**/R204 — not fixed).                                           |
| `PositionListItemDto`                       | Doc-string wording only (clarifies `isSystemManaged` is always `false` on the list); no field change. |
| `GET /api/v1/admin/positions` query params  | Unchanged. Still no `includeTotalAll` (R205 — not fixed).                                             |
| `positions.can_edit_gate_stop`              | Still absent from the catalog and from `PositionDto` (**B1** — not fixed).                            |

### Backlog disposition

- **R203 — resolved.** The catalog (`GET /admin/permissions`) and the preview response
  (`GET /admin/positions/{id}/permissions`) both now carry `type` per key. Implemented:
  `_constants/position-permissions.constant.ts` — deleted `PERMISSION_KIND_BY_KEY` and the
  `PermissionKind` type, and dropped the now-dead `kind` field off `LOCAL_ONLY_PERMISSIONS` (it
  was only ever consumed by the deleted map — the preview endpoint never returns the local-only
  key in the first place, so it had no other reader). `deriveCategoryLevel` now takes
  `{ type, granted }` straight off the server response instead of looking up a local key→kind
  map; behaviour is unchanged (`view` stays `view`, `edit`/`destructive` collapse to `edit`,
  matching the old `can_view_*` rule). No caller changes needed —
  `permission-preview-panel.tsx` already passes `PermissionItemDto[]` through unmodified.
- **R201 (B1), R202 (B3), R204, R205 — still blocked.** No schema change landed for any of
  these; Round 1's fallbacks (local `can_edit_gate_stop` row, the `description` cast, the extra
  staff-count query, the extra baseline query) all stay as they are.
- **Not adopted:** `PermissionItemDto.type` also exposes a `'destructive'` value, which could in
  principle replace the FE-owned `DESTRUCTIVE_PERMISSION_KEYS` (3 keys, spec FR-007a). Left
  untouched — that set was a deliberate spec decision to exclude `can_anonymize_member`, and the
  server's own schema doc says the classification is "Otaki ruling pending." Switching to it
  needs a spec-level call, not a silent Round 2 substitution; noted here for a future
  `speckit-clarify` pass if the BE classification is later ratified.

### Verification

- `npm run type-check` → 0 errors. `npm run lint` → no issues.
- Live smoke not run: `NEXT_PUBLIC_REAL_API_URL` points at the shared dev Cognito-backed API and
  the QA mock credentials are rejected there (same limitation as Round 1's T019). B3's live
  verdict (does the dev API actually accept a string `description` despite the `object` schema?)
  is still open — take it up if/when real dev credentials are available.

### Deviations from the plan (deliberate)

1. **The D3 drift assertion lives in `_utils/position-permission.util.ts`**, not in the constants file:
   the assertion needs the snake→camel table, and keeping the two together avoids a circular import.
   Effect is what D3 asked for — a `PositionDto` flag that is not listed fails `tsc`.
2. **The delete mutation keeps one local error toast.** D6 removes per-mutation toasts because the
   shared `MutationCache` toasts `userMessage` — but the backend's `userMessage` strings are English
   (`packages/common/src/errors/error-codes.ts`: E-STF-011 → "This position cannot be deleted because
   staff members are assigned to it."), so the plan's Japanese 「割当スタッフがいるため削除できません」
   would be unreachable. The mutation therefore sets `meta: { suppressErrorToast: true }` and toasts the
   Japanese copy for `E-STF-011` itself. Create/update follow D6 as written (inline field errors only;
   the shared cache owns the toast).
3. **`findPermissionLabel` now takes the catalog as an argument** (`findPermissionLabel(key, catalog)`),
   since labels are server-owned; the list page reads the same cached catalog query for the filter banner.
4. **Edit page distinguishes 404 from a transport error** via `E-STF-009`, so 「職位が見つかりませんでした」
   only shows for a genuinely missing position.

## Round 2 result — pass 2 (2026-09-17)

**Status: B1 + R203/R204 closed, the FE-owned catalog metadata removed entirely, static gates green,
live smoke still pending (owner: user).**

`src/lib/openapi.real.json` was refreshed again and `api-real` regenerated before this pass
(staged when the pass began). Schema-by-schema diff against the pass-1 baseline — three functional
changes touch this feature:

| Schema                                      | Pass 1 → pass 2                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `CatalogPermissionDto`, `PermissionItemDto` | **Changed.** Both gained a required `description: string \| null` — server-owned helper text, non-null on 13 keys.                            |
| `PositionDto`                               | **Changed.** Gained `permissions` (`Record<string, boolean>` keyed by `permissionKey`), `staffCount`, `positionId`, `createdBy`, `updatedBy`. |
| `CreatePositionDto`, `UpdatePositionDto`    | Unchanged. `description` is still `type: object` (**B3** — not fixed).                                                                        |
| `PositionListItemDto`, list query params    | Unchanged. Still no `includeTotalAll` (R205 — not fixed).                                                                                     |
| `positions.can_edit_gate_stop`              | Still absent from the catalog and from `PositionDto`.                                                                                         |

### Directive for this pass

Per the user (2026-09-17): **the FE defines no part of the permission catalog anymore** — every key,
label, order, category and helper description comes from the API. This supersedes **D3** (the 58-key
literal tuple + drift assertion) and retires **B1**'s local row: a permission that the catalog does
not return is not rendered.

### Shipped

| File                                          | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_constants/position-permissions.constant.ts` | Deleted `POSITION_PERMISSION_KEYS` (58-key tuple), `PositionPermissionKey`, `LOCAL_ONLY_PERMISSIONS` / `LOCAL_ONLY_PERMISSION_KEYS` / `LocalOnlyPermissionKey`, `POSITION_FORM_PERMISSION_KEYS` / `PositionFormPermissionKey`, `PERMISSION_DESCRIPTION_BY_KEY`, `CSV_PERMISSION_KEYS` and `DESTRUCTIVE_PERMISSION_KEYS`. What remains is feature rule, not catalog data: `CSV_CATEGORY_KEY`, `CSV_DEFAULTS_BY_ROLE`, `DESTRUCTIVE_PERMISSION_TOOLTIP`, `isDestructivePermission` (thin wrapper over the server `type`), `deriveCategoryLevel`, the role/category type aliases. Each removal carries a `NOTE(spec-drift 2026-09-17)` comment pointing at `spec.md`. |
| `_utils/position-permission.util.ts`          | Deleted `PERMISSION_KEY_TO_DTO_FIELD` (58 snake→camel entries) and the **D3** drift assertion — `PositionDto.permissions` already speaks catalog keys. `permissionMapFromPositionDto` is now `{ ...position.permissions }`; `buildAllOffPermissions` → `buildEmptyPermissions` (`{}`; omitted keys default to false server-side); `toRequestPermissions` deleted (nothing to strip); new `csvPermissionKeys(catalog)` reads the CSV出力管理 keys off the catalog. 125 → 31 lines.                                                                                                                                                                                  |
| `_utils/position-api.util.ts`                 | Bodies send `values.permissions` unchanged. The **B3** `description` cast is the only seam left.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `_schemas/position-form.schema.ts`            | `permissions` is `z.record(z.string(), z.boolean())` instead of a 59-key literal shape. `applyCsvRoleDefaults(permissions, role, csvKeys)` takes the catalog's CSV keys as an argument.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `position-form-permissions-section.tsx`       | Renders `CatalogCategoryDto` / `CatalogPermissionDto` verbatim — no local merge, no 「API未対応」 row, no disabled switch. Helper text is `permission.description`, rendered only when non-null. Category counts and the bulk toggle cover every catalog key.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `position-form-basic-info-section.tsx`        | Reads the (shared, cached) catalog query for `csvPermissionKeys`. The 対象ロール select is disabled while that query is loading in create mode, so a role can never be picked before the CSV defaults can be applied.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `permission-preview-panel.tsx`                | 割当スタッフ count now comes from `PositionDto.staffCount` (**R204** closed); the staff query stays only for the first 3 names, with row-shaped skeletons while it resolves (the count now lands before the names do). 重要操作 ⚠ is driven by the catalog `type` (see below). The **B1** `TODO(round2)` comment is gone.                                                                                                                                                                                                                                                                                                                                          |
| `_hooks/use-position-filters.hook.ts`         | `permission` is `parseAsString` — validation belongs to the list endpoint (E-VAL-001), not to an FE key list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `position-permission-filter.tsx`              | `selectedKey` / `onSelect` are plain `string`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Net: −394 / +101 lines across 9 files. No `TODO(round2)` comment remains in the feature except the
`description` cast's.

### Backlog disposition

- **R201 (B1) — closed by removal, not by the BE.** `can_edit_gate_stop` is still absent from the
  catalog, and under this pass's directive the FE no longer renders a toggle the API does not return.
  The 「ゲートストップ設定の変更」 row is therefore **gone from the create/edit form**. This is a
  deliberate, user-directed departure from the plan's UI-first rule. Spec Q5 stays open as a BE ask:
  if the column ships, the row reappears on its own with no FE change.
- **R203 — fully closed.** Pass 1 took `type` off the catalog; this pass takes the helper
  `description` too, so no catalog metadata is FE-owned.
- **R204 — closed.** `PositionDto.staffCount` backs the preview pane count.
- **R202 (B3) — still blocked.** `description` remains `type: object`; the single cast in
  `position-api.util.ts` stays.
- **R205 — still blocked.** No `includeTotalAll`; the `limit: 1` baseline query stays.
- **Destructive classification — adopted from the API.** `DESTRUCTIVE_PERMISSION_KEYS` (3 keys) is
  deleted; the preview pane's ⚠ warning is now driven by `PermissionItemDto.type === 'destructive'`
  (`isDestructivePermission`). This contradicts spec FR-007a's fixed three-key set and the
  2026-09-08 clarification that excluded `can_anonymize_member`, and the server's own schema calls
  the classification "Otaki ruling pending" — but the user's 2026-09-17 directive is to follow the
  API where the PO/design have not yet updated the spec. Recorded as a spec drift in
  `spec.md` → Clarifications Session 2026-09-17, FR-007a and the new **Q6** (PO ratification
  pending). Expect the icon on more categories than the prototype showed.

### Behaviour changes a reviewer should expect

1. 「ゲートストップ設定の変更」 no longer appears in the permission form (see R201 above).
2. Helper text under the toggles is now whatever the catalog returns. The BE annotates the same 13
   keys the FE map used to, so the visible copy should be unchanged — worth an eyeball on the smoke run.
3. 対象ロール is briefly disabled on the create form while the permission catalog loads.
4. A hand-edited `?permission=<unknown-key>` URL now reaches the API and surfaces its E-VAL-001 error
   instead of being silently dropped; 絞り込み解除 clears it.
5. The 重要操作 ⚠ icon appears on more preview categories than before (server classification, not the
   three prototype keys) — see **Q6**.
6. The form now renders all 58 catalog flags, not the prototype's 36.

### Verification

- `npm run type-check` → 0 errors in `src/`. (6 pre-existing errors remain from uninstalled
  optional deps — `react-quill-new`, `@holiday-jp/holiday_jp`, `recharts` `TooltipValueType` — all
  outside this feature and present before this pass.)
- `npm run lint` → no findings in `src/app/(private)/positions/**`. `prettier --check` clean.
- Live smoke not run — same limitation as Round 1 / pass 1: `NEXT_PUBLIC_REAL_API_URL` points at the
  Cognito-backed dev API and the QA mock credentials are rejected there. Still to confirm live:
  the **B3** verdict (does the dev API accept a string `description`?), the 13 helper texts, and the
  CSV role-default seeding against the real catalog.

### Validation audit (2026-09-17, after the user's live check)

The form and filter rules were re-read field by field against the endpoint schemas in
`src/lib/openapi.real.json`. Three FE-side gaps were found and fixed; the full mapping now lives in
`spec.md` → **Input Validation Rules**.

| Gap                                                                                                       | Fix                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search` box was uncapped; the list endpoint declares `maxLength: 100` → a long paste returned E-VAL-001. | `POSITION_SEARCH_MAX_LENGTH = 100`: `maxLength` on the input, `normalize` on the debounced URL commit, and a slice on the outgoing query so a deep link is capped too.                                                                                      |
| `page` was passed through verbatim; the endpoint declares `minimum: 1` → `?page=0` returned E-VAL-001.    | Clamped with `POSITION_MIN_PAGE` (and `Math.trunc`) in `queryParams`, and the same clamped value is what the pagination footer renders.                                                                                                                     |
| `role` was `z.string().min(1)` — any string passed FE validation and was rejected server-side.            | Refined against `POSITION_ROLE_VALUES` (the 6 `crm_role` values). Kept a `string` field rather than `z.enum` so the unselected `''` state stays representable; the refine is also what makes the existing `as PositionRole` cast in the body mappers sound. |

Also corrected: `POSITION_PAGE_SIZE_OPTIONS` has been `[25, 50, 100]` since round 1 (D4 — the API
caps `limit` at 100) while spec FR-005 still said 25/50/100/200. The spec is now aligned; no code
change was needed.

Confirmed already correct: `name` ≤ 100 (FE additionally rejects blank — FR-015), `description` ≤ 500
with explicit `null` to clear on PATCH, the permission map keys (all catalog-sourced, so an unknown
key is unreachable), and the preview pane's staff query (`sort: 'status'` is in the staff endpoint's
sort enum).

Raised, not fixed: the OpenAPI `PATCH /positions/{id}` response list omits `400` and the `409`
duplicate-name case that FR-010 requires — a documentation gap on the BE side. The FE handles
`E-STF-010` on update regardless.
