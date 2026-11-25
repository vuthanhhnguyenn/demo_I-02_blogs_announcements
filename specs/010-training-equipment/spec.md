# Feature Specification: E-03 Training Equipment Management (Phase 1)

**Feature Branch**: `010-training-equipment-phase1`  
**Created**: 2026-07-01  
**Last Updated**: 2026-08-10 — re-aligned to the latest prototype and to the backend API design document  
**Status**: Draft  
**PO Spec**: `E-03` - Training Equipment Management  
**Source**: `.cache/fitness-crm-ui/src/pages/training-equipment-list.tsx`, `.cache/fitness-crm-ui/src/pages/training-equipment-detail.tsx`, `.cache/fitness-crm-ui/src/pages/training-equipment-form.tsx`, `.cache/fitness-crm-ui/public/requirements/E-03.md`  
**API Design Source**: `.cache/api/openapi.json` (tag `Training Equipment Management`)  
**Input**: User description: "Create spec for screen E-03 Training Equipment Management. Phase 1 only. Exclude future scope. History is seed display only; no create/update/delete history."

**Conflict resolution rule**: when the prototype and the API design document disagree, the **prototype wins** and the deviation is recorded in "API Design Alignment" below.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse and find equipment in store scope (Priority: P1)

As HQ or store-level staff, I can open the training equipment list, search by keyword, apply filters, sort columns, and page through results to quickly find relevant equipment.

**Why this priority**: Listing and retrieval is the primary entry point for all equipment management operations.

**Independent Test**: Open the list page, apply search/filter/sort/pagination actions, and verify the table updates accordingly without navigating to other screens.

**Acceptance Scenarios**:

1. **Given** the user opens the list page, **When** no additional filter is selected, **Then** the table excludes "Discarded" status rows by default and renders current page rows.
2. **Given** the user enters a keyword, **When** the keyword matches equipment name or installation area, **Then** only matched rows are shown and a filter result banner is displayed.
3. **Given** the user changes category, status, sorting, page size, or page number, **When** each control is used, **Then** the list updates and keeps UI state consistent.
4. **Given** no row matches current conditions, **When** the table is rendered, **Then** an empty state appears and the user can clear conditions.

---

### User Story 2 - Register and edit equipment records (Priority: P2)

As HQ or authorized staff, I can create a new equipment record and edit an existing one from the dedicated form screen.

**Why this priority**: Registration and maintenance of equipment master data is core business functionality.

**Independent Test**: From list page, open create form and edit form, fill fields, submit, and confirm navigation and confirmation behavior for each mode.

**Acceptance Scenarios**:

1. **Given** the user clicks "New Registration", **When** the create form opens and required fields are provided, **Then** the record can be submitted and user is routed to detail view.
2. **Given** the user opens edit form from detail page and changes the tool type on a record that has exercise links, **When** submit is clicked, **Then** a confirmation dialog warns that all links will be released before the final save; with no links, the save proceeds directly.
3. **Given** the form is in edit mode, **When** viewing installation status field, **Then** status is read-only on form and user is guided to change status in detail page.
4. **Given** the form is in edit mode, **When** viewing the installation store field, **Then** the store is read-only with a note that store moves are handled as "Removed + new registration".
5. **Given** the user completes a new registration, **When** the record is saved, **Then** a follow-up action invites the user to configure exercise links for the new equipment.

---

### User Story 3 - View equipment detail, status, links, and deletion guardrails (Priority: P3)

As HQ or store-level staff, I can open a specific equipment detail page to review full information, manage exercise links, open status change dialog, and perform role-based delete/edit actions.

**Why this priority**: Detail screen centralizes record verification and operational actions.

**Independent Test**: Open detail page and test each tab/dialog action (status change dialog, exercise add/unlink dialog, delete dialog behavior).

**Acceptance Scenarios**:

1. **Given** the user opens a row from list page, **When** detail page loads, **Then** basic information, installation information, status card, notes, and tab structure are displayed.
2. **Given** the user opens exercise-link tab, **When** adding or unlinking exercises, **Then** linked count and table content update.
3. **Given** the user attempts delete on a record with linked exercises, **When** delete is confirmed, **Then** the system blocks deletion and shows the linked-exercise warning dialog.
4. **Given** history tab is opened, **When** records are displayed, **Then** only seeded read-only history entries are shown for Phase 1.

### Edge Cases

- Search and filters produce zero result.
- Current page becomes greater than total pages after changing page size or filter.
- User selects rows for bulk status change and closes the dialog without applying.
- User selects exercise candidates with tool mismatch warning.
- User with unauthorized role clicks action buttons (CSV export, registration, edit, delete).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001 (List Rendering)**: System MUST provide a training equipment list page with table columns for equipment ID, name (with model number as sub-text), tool type, quantity, installation area, installation status, linked exercise count, and last updated date. The page header badge MUST show the unfiltered total (the count after "条件をクリア"), not the filtered total.
- **FR-002 (Search and Filter)**: System MUST support keyword search (**equipment name only**), tool-type filter, status filter, and clear-all actions. Because the screen has only two filters, both selects MUST be permanently visible — no collapsible "詳細フィルター" panel. Narrowing by installation area (設置場所 / 設置エリア) is **not provided in Phase 1**: the backend's 2026-08-11 answer keeps `keyword` on the equipment name only, and the prototype's toolbar defines just the two filters above. Installation area stays a display + sort column. See "Known non-defects" below.
- **FR-003 (Sorting and Pagination)**: System MUST support column sorting on equipment ID, name, tool type, installation area, installation status, and last updated date; quantity and linked exercise count are NOT sortable. Pagination MUST offer page navigation and page-size selection (25/50/100/200, default 50).
- **FR-004 (Default Visibility Rule)**: System MUST hide "Discarded" rows by default and allow users to include them through the status filter, either via "全ステータス" (all statuses) or by selecting "廃棄" explicitly.
- **FR-005 (List Empty/Filtered States)**: System MUST show an empty/filtered state when no records are found and provide a direct action to clear conditions.
- **FR-006 (Filter Result Banner)**: When any search or filter is active, System MUST show a banner inside the table card stating the unfiltered total, the filtered count, and the active condition summary, with a "条件をクリア" action. The unfiltered total comes from `pagination.totalAllItems`; when the active filter surfaces discarded rows the API MUST count them in that total as well, so the filtered count can never exceed it.
- **FR-007 (Create Equipment)**: System MUST provide a create form with required fields (equipment name, tool type, quantity, installation store, status defaulting to "Installed") and optional fields (manufacturer — selected from a fixed list, not free text — model number, installation area, installation date, note). After a successful save the user MUST be guided to the exercise-linking step.
- **FR-008 (Edit Equipment)**: System MUST allow editing every create-form field except installation store and installation status. A confirmation dialog MUST appear on save only when the tool type changed **and** at least one exercise link exists; confirming releases all links.
- **FR-009 (Detail View)**: System MUST provide a detail page with tabbed sections for basic information, exercise linkage (with a linked-count badge), and change history. All three tabs are always rendered; role restrictions apply to the action buttons, not to tab visibility.
- **FR-010 (Status Display and Change Entry)**: System MUST display current status, last changed timestamp, and last actor on a dedicated status card, sourced from the status-change history rather than from the record's generic update timestamp, and allow opening a "設置状態変更" dialog from the detail page.
- **FR-011 (Exercise Link Management)**: System MUST support listing linked exercises (ID, name, tool type, difficulty, body part), adding exercises from a candidate list with keyword/difficulty/body-part filters, and unlinking through a confirmation dialog. The candidate list MUST filter server-side (keyword, difficulty, body part, already-linked exclusion) and load additional pages by infinite scroll, so a large Y-08 catalogue is never silently truncated; the difficulty/body-part options MUST come from the API (no hard-coded label lists). Tool-type mismatches MUST be flagged in the candidate list and require explicit approval before saving.
- **FR-012 (Delete Guardrails)**: System MUST provide a role-gated delete action and block deletion when linked exercises exist.
- **FR-013 (Bulk Status Update)**: System MUST allow selecting multiple rows and changing their installation status in one operation, with a mandatory change reason applied to every selected record. Row selection MUST be disabled for users without the status-change permission.
- **FR-014 (CSV Export)**: System MUST export the current list content (search/filter/sort applied, pagination not applied) as a UTF-8-with-BOM CSV file.
- **FR-015 (Role-Gated Actions)**: System MUST apply role-based restrictions for CSV export, create, edit, status change, exercise linking, and delete actions as represented in the UI.
- **FR-016 (History in Phase 1)**: System MUST provide read-only history display (timestamp, operator, from-status, to-status, reason) in the detail tab for Phase 1; users cannot create, update, or delete entries. Only installation-status changes are recorded — quantity and installation-area edits are attribute edits and leave no history. Every record MUST carry an initial registration row (`previousStatus = null`, reason auto-filled with "新規登録"), rendered as "未設定" → status, so the first row is never blank. Ordering is `changedAt` descending.
- **FR-017 (Traceability)**: System MUST preserve the mapping between E-03 requirement items and implemented UI controls described in the traceability matrix below.
- **FR-018 (Status Change Validation)**: System MUST enforce the status-change reason as mandatory in both single and bulk status-change flows, aligned with E-03 FR-007 / FR-009. The reason is free text of 1–500 characters (there is no classification select); a bulk change applies one reason to every selected record. Both dialogs MUST keep the submit button enabled and report missing input as inline field errors. The record's current status MUST NOT be offered as a target in the single-change dialog, and a change to the same status MUST NOT write a history row (matching the bulk flow's `skipped` behaviour).
- **FR-019 (Default Sorting Responsibility)**: System MUST treat default ordering as API/mock-data responsibility; the frontend list page does not apply default sorting on initial load. The API default is tool type (`mst_tools.sortOrder`) ascending, then equipment name ascending. The two enum sort keys (`locationInGym`, `installationStatus`) MUST order by enum definition order, not by the alphabetical order of their Japanese labels.
- **FR-022 (Store Scope)**: The list, CSV export, and create operations MUST be scoped to a store. HQ roles (`system` / `headquarter`) MAY omit `storeId` to work across every store — the header store switcher's "全店舗（本部）" option — and every other role MUST send its own store (omitting it is a `400`, sending another store's id is a `403`). Rows always carry `storeId` / `storeCode` / `storeName` so a cross-store row can be identified.
- **FR-020 (Exercise Navigation)**: Linked exercise names in the exercise-link tab MUST link to the Y-08 exercise detail page (E-03 FR-004, mirrored by the prototype), using the existing `/exercises/[id]` route.
- **FR-021 (Store Immobility)**: System MUST NOT allow changing a record's installation store; a store move is expressed as "set to Removed in the old store + register anew in the new store" (E-03 制限事項).

### Key Entities _(include if feature involves data)_

- **Training Equipment**: Record representing one equipment item in a store (`id`, `name`, `mstToolId`, `quantity`, `manufacturer`, `model`, `locationInGym`, `installationStatus`, `installedOn`, `note`, `createdAt`, `updatedAt`, store context).
- **Tool Type (`mst_tools`)**: Reference master shared with Y-08 (`id`, `code`, `name`, `sortOrder`). 10 values including "なし（自重）", which is excluded from equipment assignment (BR-EQP-006). Equipment references it by `mstToolId`, never by label.
- **Installation Status**: Lifecycle status of equipment (`installed`, `maintenance`, `removed`, `discarded`).
- **Status Card**: Installation-status metadata for the detail screen (`installationStatus`, `lastChangedAt`, `lastChangedByName`), derived from the latest status change rather than from the record's `updatedAt`.
- **Exercise Link**: Association between equipment and exercises (`exerciseId`, `exerciseCode`, `name`, `mstToolId`, `toolName`, `difficulty`, `bodyPart`).
- **History Entry (Read-Only in Phase 1)**: Log record containing `previousStatus` (nullable for the initial registration), `newStatus`, `changedReason`, `changedByName`, `changedAt`.

### Traceability Matrix (UI -> Source Requirement)

| UI Element / Behavior                               | Source Requirement (E-03)         | Phase 1 Inclusion                                         |
| --------------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| List table with equipment metadata and linked count | FR-001                            | In Scope                                                  |
| Keyword search + tool type/status filters           | FR-002                            | In Scope                                                  |
| "Discarded excluded" default filter                 | FR-001 (default hidden discarded) | In Scope                                                  |
| Filter result banner with condition summary         | FR-002 related                    | In Scope                                                  |
| New registration form entry                         | FR-003                            | In Scope                                                  |
| Detail screen with status card metadata             | FR-004                            | In Scope                                                  |
| Edit action and tool-type change confirmation       | FR-005                            | In Scope (dialog only when links exist)                   |
| Delete action with linked-exercise block            | FR-006                            | In Scope                                                  |
| Status change dialog                                | FR-007                            | In Scope (with mandatory reason validation)               |
| Exercise link tab add/unlink flow                   | FR-008                            | In Scope                                                  |
| Bulk status update bar/dialog on list               | FR-009 (Should)                   | In Scope (mandatory reason applied to all selected)       |
| CSV export action button                            | FR-010 (Should)                   | In Scope                                                  |
| History tab read-only display                       | FR-011 (Could)                    | In Scope (display only)                                   |
| Linked exercise name navigation to Y-08 detail      | FR-004 related                    | In Scope (links to `/exercises/[id]`)                     |
| History tab full operational lifecycle              | FR-011 (Could)                    | Out of Scope for Phase 1 (no create/edit/delete controls) |
| Cross-store summary                                 | FR-012 (Could)                    | Out of Scope for Phase 1                                  |

### Out of Scope for Phase 1

- Full history lifecycle operations (create/update/delete/audit management); only read-only display is in scope.
- Cross-store summary dashboard (FR-012, Could).
- Any future placeholders in source notes such as unresolved installation-area master finalization beyond current UI options.
- Equipment images (`images` in the API design document) — the prototype has no image UI.
- Split-quantity status change (`splitQuantity` / `splitRow` in the API design document) — the prototype changes the status of the whole record.
- Sourcing the exercise-link candidate list from Y-08 `/admin/exercises`; a dedicated mock candidate endpoint is used until Y-08 exposes difficulty/body-part in the shape this dialog filters on.
- Searching or filtering by installation area (設置場所 / 設置エリア). Decided on 2026-08-11 by the PO: E-03 FR-002 asks for a keyword match on 機材名・設置場所, but the backend answered that `keyword` stays name-only because the area became an enum, and the prototype toolbar carries only the 器具種別 / 設置状態 filters. Adding a third filter is a design change, deferred to Phase 2. The API already accepts `locationInGym`, so closing this later is frontend-only work.

### Known non-defects (do not file as bugs)

Behaviour that looks like a gap against E-03 or the prototype but is the agreed Phase 1 specification. Testers: treat these as **spec**, not NG.

| Observed behaviour                                                                                                                       | Why it is not a defect                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keyword search matches 機材名 only; typing an installation area (e.g. 「マシンエリア」) returns no rows.                                 | E-03 FR-002 predates 設置場所 becoming an enum. Backend answer 2026-08-11: `keyword` は機材名の部分一致のみ. The list placeholder says 「機材名で検索」 accordingly.     |
| There is no 設置エリア filter in the toolbar, so 設置場所 cannot be narrowed at all.                                                     | PO decision 2026-08-11 (see "Out of Scope"): the prototype defines two filters and a third one is a design change. 設置場所 remains visible as a column and is sortable. |
| The prototype's search placeholder reads 「機材名、設置場所で検索」 but the screen shows 「機材名で検索」.                               | The prototype text predates the enum change; the implemented text matches the API contract.                                                                              |
| The exercise-add dialog says 「…と一致するエクササイズのみ紐付けできます」 yet also lists mismatched tool types with a 種別不一致 badge. | Wording copied verbatim from the prototype; FR-008 requires mismatches to be listed and explicitly approved. Copy change needs PO sign-off, not a code fix.              |

### UI Alignment with the Latest Prototype (2026-08-10)

Changes applied so the screens match `training-equipment-list.tsx` / `-detail.tsx` / `-form.tsx`:

**Added / changed**

- List filters are permanently expanded; the collapsible "詳細フィルター" panel and its "すべてクリア" button were **removed** (the prototype notes filters ≤ 2 are never collapsed).
- The filter result banner moved inside the table card and now shows "全 N 件中 M 件を抽出中" plus the condition summary, replacing the reduced banner that sat above the card.
- The page header count now reports the unfiltered total, so it no longer changes while filtering.
- Column header "紐づけ件数" renamed to "エクササイズ紐づけ件数"; quantity is no longer sortable.
- Empty / filtered-empty states use the shared `EmptyState` component with entity label "トレーニング機材".
- Row checkboxes are always rendered and are disabled (rather than hidden) for users without the status-change permission.
- Detail: status card action and dialog title use "設置状態変更"; the history column is "設置状態変化"; the status card reads from status-change metadata.
- Detail: exercise add/unlink buttons are role-gated (`training-equipment.exercise-links`); the plain tooltip-wrapped unlink button was removed.
- Detail: the exercise-link notice no longer names "Y-08" and matches the prototype wording.
- Form: manufacturer is a searchable select over a fixed list, replacing the free-text input.
- Form: the tool-type warning is shown whenever the form is in edit mode and states that all links will be released.
- Form: the create flow shows a "紐づけ設定へ" follow-up action after saving (FR-003 guidance).
- Edit: the tool-type confirmation dialog now appears only when links exist.

**Applied after the backend's 2026-08-11 answers (no new UI invented)**

- The list and CSV export now use the existing header store switcher for their scope: "全店舗（本部）" (HQ only) omits `storeId`, every other selection sends it. No new store control was added to the screen.
- The list query waits until the store scope resolves, so a single-store role never fires a request without `storeId` (which the API rejects with `400`).
- The 変更理由 textareas cap input at 500 characters, matching the API. No character counter was added — the prototype has none.
- The keyword placeholder is now "機材名で検索": the API matches the name only. No 設置エリア filter was added — narrowing by installation area is out of scope for Phase 1 (FR-002).
- The 設置店舗 select submits `store.id` and shows `store_id` beside the name, so the submitted `storeId` matches what the list and detail return.

**Removed (present in code, absent from the prototype)**

- Permission gating of the detail tabs — the exercise-link and history tabs used to be hidden entirely; the prototype always renders all three tabs and gates only the actions.
- Sorting affordance on the quantity column.
- The duplicated filter banner above the table card.

**Kept deliberately (project convention overrides the prototype)**

- The unsaved-changes ("変更を破棄しますか？") dialog on create/edit — a convention shared by 13 form screens.
- Pagination footer hidden when everything fits on one page — behavior of the shared `TablePaginationWithSize` component, per the shared GUI checklist.
- Success/failure toasts on API calls, which the static prototype has no need for.

### API Design Alignment

The mock API for this feature now mirrors `.cache/api/openapi.json` (tag `Training Equipment Management`): camelCase fields, doc-shaped resource paths, and the doc's two-axis discarded model. Endpoints:

| Mock route                                                                 | API design document                      |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| `GET /crm/training-equipment`                                              | `GET /admin/training-equipment`          |
| `POST /crm/training-equipment`                                             | `POST /admin/training-equipment`         |
| `GET/PATCH/DELETE /crm/training-equipment/{equipmentId}`                   | `.../{id}`                               |
| `PATCH /crm/training-equipment/{equipmentId}/installation-status`          | `.../{id}/installation-status`           |
| `POST /crm/training-equipment/bulk-status-update`                          | `.../bulk-status-update`                 |
| `GET/POST /crm/training-equipment/{equipmentId}/exercise-links`            | `.../{id}/exercise-links`                |
| `DELETE /crm/training-equipment/{equipmentId}/exercise-links/{exerciseId}` | `.../{id}/exercise-links/{exerciseId}`   |
| `GET /crm/training-equipment/{equipmentId}/status-history`                 | `.../{id}/status-history`                |
| `GET /crm/training-equipment/export`                                       | `GET .../export`                         |
| `GET /crm/training-equipment/exercise-candidates`                          | no counterpart (mock-only, pending Y-08) |

Behaviour adopted from the document:

- List query: `storeId`, `page`, `limit`, `sort`, `order`, `keyword`, `mstToolId`, `installationStatus`, `locationInGym`, `includeDiscarded`, `includeTotalAll`; response `{ items, pagination }` with `pagination.totalAllItems` = the count after "条件をクリア".
- `storeId` is **conditionally required**: optional for `system` / `headquarter` (omitted = every store), required for every other role. See FR-022.
- List rows carry `manufacturer` / `model` (both nullable) and `storeId` / `storeCode` / `storeName` (always returned, even when `storeId` was passed).
- `keyword` matches the equipment name only. `sort` accepts `locationInGym` / `installationStatus`, both ordered by enum definition order.
- `changedReason` is free text of 1–500 characters and is required on both status-change endpoints; the old 5-value enum (`install` / `fault_report` / `inspection_done` / `removal` / `disposal`) is gone.
- `GET .../{id}/status-history` always returns `changedReason` (never null), newest first, and includes the auto-generated "新規登録" row for the initial registration. It is paginated like the list (`page` / `limit` / `includeTotalAll` → `{ items, pagination }`); the history tab requests one large page because the prototype defines no pager, and warns in the footer if the response is truncated.
- CSV export uses the same store scope; a cross-store export names the file `training_equipment_all_<date>.csv`.
- The status filter is expressed as two parameters: "廃棄を除く" → `includeDiscarded=false`, "全ステータス" → `includeDiscarded=true`, a specific status → `installationStatus=<value>`.
- Default ordering is `sort=toolType` / `order=asc`, resolved through `mst_tools.sortOrder` and then equipment name.
- Equipment references its tool type by `mstToolId` (UUID), with `toolName` / `toolCode` returned for display.
- Status change and bulk status change require `changedReason`; bulk returns `{ updated, skipped }`.
- `PATCH .../{equipmentId}` carries no `storeId` (store is immutable) and no `installationStatus` (changed only through the dedicated endpoint).
- Deleting equipment that still has links returns `409 Conflict`; adding links with a tool-type mismatch and no `force` returns `422`.

Deliberate deviations (prototype or project convention wins):

| Topic                         | API design document                                                | Implemented                                         | Reason                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sortable columns              | `toolType`,`name`,`updatedAt`,`locationInGym`,`installationStatus` | also `id`                                           | The prototype sorts on 機材ID.                                                                                                                                               |
| Create `installationStatus`   | `installed` / `maintenance` only                                   | all four values, default `installed`                | The prototype's create form offers all four.                                                                                                                                 |
| Exercise link payload         | `exerciseId`,`exerciseCode`,`name`                                 | plus `mstToolId`,`toolName`,`difficulty`,`bodyPart` | The prototype's linked table and add dialog show them.                                                                                                                       |
| Detail payload                | no `storeName`                                                     | `storeName` included                                | The prototype shows 設置店舗 by name.                                                                                                                                        |
| Equipment images              | `images[]` on create/update/detail                                 | omitted                                             | No image UI in the prototype.                                                                                                                                                |
| Status change response        | `{ original, splitRow }`                                           | `{ original }`                                      | Split-quantity is out of Phase 1 scope.                                                                                                                                      |
| Status change request         | plus `splitQuantity`, `expectedUpdatedAt`                          | `newStatus` + `changedReason` only                  | Split-quantity is out of scope; no optimistic-lock UI yet.                                                                                                                   |
| Exercise-link list pagination | paginated                                                          | `{ items }` only                                    | The prototype's linked-exercise tab is unpaginated.                                                                                                                          |
| Manufacturer options          | free string, no master table and no options endpoint               | fixed FE list, submitted as a free string           | The backend keeps `manufacturer` free text and states that curating the choices is the frontend's responsibility, so the list lives in `training-equipment-form-fields.tsx`. |
| 店舗 column on the list       | `storeCode` / `storeName` returned for cross-store row identity    | returned but not rendered as a column               | The prototype's list has no 店舗 column; adding one is a design decision, not a code gap.                                                                                    |
| CSV export                    | `GET` with query parameters                                        | `GET` with query parameters                         | Aligned with the document (this feature diverges from the other export routes, which use POST).                                                                              |
| Field naming                  | camelCase                                                          | camelCase                                           | Same as the doc; also matches `exercise.schema.ts` (Y-08).                                                                                                                   |

`storeId` carries the internal store id (`stores.id`, e.g. `store-001`), matching the document's "UUID" framing; the display code (`stores.store_id`, e.g. `S-001`) is returned separately as `storeCode`. The create form's 設置店舗 select therefore submits `store.id` and shows `store_id` as the secondary label.

Additionally, the tool-type master seed had `その他` flagged inactive, which hid it from the dropdowns; it is now active because both the prototype and E-03 list it as a selectable 器具種別.

**Mock data caveat**: all seeded equipment lives in `store-001`, so the HQ "全店舗（本部）" view and the `store-001` view return the same rows. The store-scope branches are still observable through the API (a non-HQ role without `storeId` gets `400`, another store's id gets `403`) but the cross-store list needs seed rows in a second store to be exercised end to end.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Authorized users can complete equipment discovery (search/filter/sort and open target detail) in under 60 seconds for standard datasets.
- **SC-002**: Authorized users can complete equipment registration from form open to submit confirmation in under 3 minutes.
- **SC-003**: 100% of detail pages display status metadata (current status, changed timestamp, changed by) and exercise-link count.
- **SC-004**: Deletion attempts on equipment with linked exercises are blocked in all tested cases.
- **SC-005**: For Phase 1, history tab consistently displays seeded read-only records with no editable controls exposed.

## Assumptions

- Phase 1 covers E-03 Must items plus the two Should items the prototype implements (FR-009 bulk status update, FR-010 CSV export); Could items stay excluded except for the read-only history display.
- The mock API mirrors the backend design document's contract so the Phase 2 swap to the real backend is a base-URL change, not a payload change.
- Prototype text and role matrices are the source of truth when they conflict with the API design document; conflicts are recorded in "API Design Alignment".
- Store scope filtering follows the store context currently selected in the authenticated user's session.

## Clarification Resolutions

1. Status-change reason follows the source spec and is mandatory; validation applies to both the single and bulk flows.
2. Default list ordering is handled in mock/API logic; frontend does not apply initial default sorting.
3. Linked-exercise navigation to Y-08 is in scope (FR-020). The mock candidate catalogue (`EX-011`…) is seeded as real Y-08 exercise records in `exercise.seed.ts`, so `/exercises/[id]` resolves for every linkable exercise.
4. Where the API design document and the prototype disagree, the prototype wins; every such case is listed in "API Design Alignment" for the PO to confirm with the backend team.
5. The installation-area master remains the provisional fixed four values (E-03 260724_v4); a per-store master is a Phase 2 decision.
