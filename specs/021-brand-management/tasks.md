# Tasks: Brand Master Management (Y-07)

**Input**: Design documents from `/specs/021-brand-management/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, checklists/parity.md)
**Prerequisites**: plan.md (brownfield gap audit G1-G7), spec.md (US1-US4), research.md, data-model.md, contracts/

**Brownfield note**: `src/app/(private)/brands/**` already exists and mostly works. Tasks below implement only the gaps research.md identified (G1-G6; G7 is an accepted no-change deviation) — there is no from-scratch scaffolding. Per explicit user direction (2026-07-29), G4 and the rename wiring in G5 are **commented out in place, never deleted**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to spec.md's user stories (US1-US4)
- Every UI task cites its V0 source (where applicable) and the `PAR###` parity items it satisfies

---

## Phase 1: Setup (Schema-First Change — Constitution II)

**Purpose**: The one piece of work that must land before any dependent mock-db or UI code (G3's request-schema addition). No other gap has cross-cutting prerequisites.

- [x] T001 Add `BrandScheduledFeeChangeInputSchema` (`effective_start_date`: `yyyy/MM/dd`-regex string, required; `value_including_tax_yen`: non-negative int, required — no `registered_at`/`registered_by`, those are server-stamped only) and extend `UpdateBrandFeeItemSchema` with an optional `scheduled_changes: BrandScheduledFeeChangeInputSchema[]` field, in `src/app/api/_schemas/brand.schema.ts` (new schema goes near the existing `BrandScheduledFeeChangeSchema` at L133-155; `UpdateBrandFeeItemSchema` to extend starts at L184) — per data-model.md "Fee Item" and contracts/update-brand-fee-group.md
- [x] T002 Regenerate the OpenAPI doc and hey-api client from the updated schema: `npm run generate-openapi` then `npm run generate-client` — verify no manual edits are needed/made to generated files under `src/lib/api/**` (Constitution II)

**Checkpoint**: Request schema for scheduled fee revisions exists and the generated client knows about it — US2's mock-db/UI work can begin.

---

## Phase 2: Foundational

**Purpose**: Per-story blocking prerequisites.

No cross-story blocking work applies here. Each remaining gap (G1, G2, G4, G5, G6) is self-contained within a single user story's files; G3's only shared prerequisite is T001/T002 above (Setup, not Foundational, since it blocks only US2). Proceed directly to the user story phases below.

---

## Phase 3: User Story 1 - Browse and drill into brand records (Priority: P1) 🎯 MVP baseline

**Goal**: This story has **no implementation gaps** — the audit in research.md found the list/detail browsing experience already matches spec.md/parity.md, aside from the accepted G7 deviation (proxy-level `/403` redirect instead of an in-page access-denied message). Tasks here are verification-only.

**Independent Test**: quickstart.md's list/detail browsing steps and "Role-based spot checks" section; parity PAR001-PAR013, PAR020-PAR022, PAR024-PAR027, PAR029-PAR030, PAR023 (as a documented deviation).

- [ ] T003 [P] [US1] Manual verify — brand list search/filter, filtered-empty state, table columns, row navigation, pagination footer, and page-size selector render unchanged and match parity — verify against `src/app/(private)/brands/page.tsx`; satisfies PAR001-PAR013
- [ ] T004 [P] [US1] Manual verify — brand detail breadcrumb/title/status badge, tabs bar with live 費用/変更履歴 counts, and 基本情報 tab's read-only fields + status card render unchanged — verify against `src/app/(private)/brands/[id]/page.tsx`, `_components/basic-info-tab.tsx`; satisfies PAR020-PAR022, PAR024-PAR027, PAR029-PAR030
- [ ] T005 [US1] Manual verify — Trainer/Observer navigating directly to `/brands/<code>` are redirected to `/(private)/403` by the existing proxy-level gate (`src/proxy.ts` + `PAGE_PERMISSIONS`), per quickstart.md "Role-based spot checks"; confirms G7's accepted deviation — satisfies PAR023 (documented deviation: V0's in-page access-denied message is intentionally NOT built, per research.md G7 — not an oversight)

**Checkpoint**: US1 confirmed already fully functional; no code changes made in this phase.

---

## Phase 4: User Story 2 - Maintain per-sub-brand fee settings (Priority: P2) 🎯 Core Must-have

**Goal**: Land G3 (scheduled fee revisions become fully creatable/editable/deletable — the spec's stated reason the screen exists), G2's change-history write for fee edits, and G6 (fee-tab "新規登録" disable condition + tooltip).

**Independent Test**: quickstart.md "G3 — Scheduled fee revisions are fully editable" and "G6 — Fee tab 新規登録 always disabled with tooltip" sections.

### Mock-DB & Route (schema → data layer, per Constitution II ordering)

- [x] T006 [US2] Implement `scheduled_changes` write handling in `updateFeeGroup()` (`src/app/api/_mock-db/tables/franchise.table.ts:132-162`): for each patched fee item, replace `scheduled_changes` with the payload's list; for any entry whose `effective_start_date` doesn't match an existing revision, stamp `registered_at` = today (`yyyy/MM/dd`) and `registered_by` = `patch.updated_by ?? 'STF-001'`; entries matching an existing date keep their original stamp — per data-model.md "Fee Item", contracts/update-brand-fee-group.md
- [x] T007 [P] [US2] Add server-side validation in `PATCH /api/crm/brands/{id}/fees/{subBrandCode}` (`src/app/api/crm/brands/[id]/fees/[subBrandCode]/route.ts:89-110`, alongside the existing item-code checks): 400 if any item's `scheduled_changes` contains two entries with the same `effective_start_date`, or if any entry's `effective_start_date` equals that item's own `effective_start_date` — per contracts/update-brand-fee-group.md "Server-side validation"
- [x] T008 [US2] Inside `updateFeeGroup()` (same method as T006, `franchise.table.ts:132-162`), append one `BrandChangeHistoryItem` per changed field (including new/changed `scheduled_changes` entries) to `this._changeHistories`, using `patch.updated_by ?? 'STF-001'` as `changed_by` and `target_display_name = "{parent_brand_name} / {display_name}"` — per research.md G2, data-model.md "Change History Entry"

### Frontend Form Schema

- [x] T009 [P] [US2] In `src/app/(private)/brands/[id]/_schemas/brand-fee-group-form.schema.ts`, add a `brandScheduledFeeChangeFormSchema` (`effectiveStartDate`: same `DATE_REGEX` pattern as `brandFeeItemFormSchema`; `valueIncludingTaxYen`: reuse the existing `feeValueSchema`), add `scheduledChanges: z.array(brandScheduledFeeChangeFormSchema)` to `brandFeeItemFormSchema`, and add a `superRefine` rejecting (a) duplicate `effectiveStartDate` values within an item's `scheduledChanges`, and (b) a `scheduledChanges` entry whose date duplicates that item's own `effectiveStartDate` — per data-model.md, FR-009, US2 AS3

### Fee Edit Sheet UI

- [x] T010 [US2] In `BrandFeeGroupEditSheet` (`src/app/(private)/brands/[id]/_components/brand-fee-group-edit-sheet.tsx`), add a `useFieldArray`-backed revision list per fee item (nested at `feeItems.${index}.scheduledChanges`, alongside the existing per-item block at L192-296), each row rendering a 有効開始日 `DatePicker` + 定価（税込）`Input` + delete (Trash2) button, a duplicate-date validation alert, and a past-date warning alert (reuse the existing `isPastDate` helper, L54-58); since fee items are already rendered via `fields.map` (L188), this uniformly covers both 費用項目① and ② — port from `.cache/fitness-crm-ui/src/pages/brand-detail.tsx` › RevisionRow (L146-201); satisfies PAR043, PAR046, PAR054-PAR057, PAR060
- [x] T011 [US2] In the same sheet, add an "改定スケジュールを追加" button (Plus icon) below each item's revision list that appends a blank `scheduledChanges` entry via the field array's `append` — port from `.cache/fitness-crm-ui/src/pages/brand-detail.tsx` › (L332-346); satisfies PAR058
- [x] T012 [US2] In the same sheet, add a "プレビュー（会員向け表示）" block per fee item showing the current bold price + "（税込）" + item name via `useWatch` — port from `.cache/fitness-crm-ui/src/pages/brand-detail.tsx` › (L348-359); satisfies PAR059

### Fee Tab Parity Fix

- [x] T013 [P] [US2] Fix the "新規登録" button in `src/app/(private)/brands/[id]/_components/fees-tab.tsx:354-363` — change `disabled={isEmpty}` to unconditional `disabled`, add `tooltip="費用マスタの新規登録は次フェーズで実装予定です"` — per research.md G6, parity PAR032

### Verification

- [ ] T014 [P] [US2] Manual verify — fee tab helper text, fee card title/fee-id badge/変更 action, 費用項目①② blocks (price/effective date/optional note/divider), cancellation-policy alert, empty state, and the edit sheet's title/item-name field/現行設定 block/past-date warning/footer buttons all render unchanged around T006-T013's changes — verify against `fees-tab.tsx`, `brand-fee-group-edit-sheet.tsx`; satisfies PAR031, PAR033, PAR035, PAR036, PAR041, PAR042, PAR044, PAR045, PAR047-PAR053, PAR061

**Checkpoint**: A Headquarter user can add/edit/delete scheduled fee revisions with validation and past-date warnings, edits write real change-history rows, and the fee-tab's Phase-2 "新規登録" affordance matches V0.

---

## Phase 5: User Story 3 - Edit a brand's name (Priority: P3)

**Goal**: Land G2's change-history write for brand renames, and resolve the two scope/parity issues that share these files: G4 (comment out the brand-list create-brand flow, do not delete) and G5 (comment out the detail-page's duplicate rename wiring, do not delete; replace with a disabled + tooltip button matching V0).

**Independent Test**: quickstart.md "G4 — Brand-list create-brand flow removed" and "G5 — Detail-page 基本情報を編集 disabled" sections, plus renaming via the list row's 編集 action and confirming a new 変更履歴 row.

- [x] T015 [US3] In `update()` (`src/app/api/_mock-db/tables/franchise.table.ts:116-131`), append one `BrandChangeHistoryItem` when the patched `display_name` differs from the stored value (`target_display_name` = the new `display_name`, `changed_field: "ブランド名"`, `before_value`/`after_value` = old/new name); append nothing when `display_name` is unchanged — per research.md G2, contracts/update-brand.md
- [x] T016 [P] [US3] In `src/app/(private)/brands/page.tsx`, comment out the create-brand entry point — the header `Plus`/`新規登録` `RoleGatedButton` (L218-226), the `sheetMode`'s `'create'` branch (L146-172), `handleCreateClick` (L119-…), the `createMutation`/`postCrmBrandsMutation` wiring (L84-…), and `EMPTY_FORM_VALUES`'s create-mode usage (L47-54) — wrap with `// Out of scope for this phase — FR-015 / research.md G4. Commented out, not deleted, pending a future phase.`; leave `BrandFormSheet`'s edit-mode usage (the list row's 編集 action) fully active and untouched — per research.md G4 (comment out, do not delete)
- [x] T017 [P] [US3] In `src/app/(private)/brands/[id]/page.tsx`, comment out this page's rename wiring on the "基本情報を編集" button — its `onClick={() => setSheetOpen(true)}` (L171), the `updateMutation` block this page owns (L56-…), and its `BrandFormSheet` instance (L192-199) — with the same "commented out, not deleted — research.md G5" note; replace the live button with a `disabled` `RoleGatedButton` carrying `tooltip="ブランド基本情報の編集は次フェーズで実装予定です"` — per research.md G5, parity PAR028 (the list row's separate 編集 action, touched in T016, remains the one live rename entry point)
- [ ] T018 [P] [US3] Manual verify — brand-list "ブランド編集" sheet (title, ブランド名 input, read-only ブランドID + helper text, fee-section note, footer buttons) still renders and functions unchanged after T016's comment-out — verify against `brands/page.tsx`, `_components/brand-form-sheet.tsx`; satisfies PAR014-PAR019

**Checkpoint**: Renaming a brand from the list row works and writes history; the brand-list header no longer shows a create-brand affordance; the detail page's basic-info edit button is disabled with the Phase-2 tooltip — all with the prior working code preserved as comments, not deleted.

---

## Phase 6: User Story 4 - Retire a fee entry and review change history (Priority: P4)

**Goal**: Fix the live G1 bug (disable/delete a fee entry currently 500s) and confirm the 変更履歴 tab reflects real writes from every mutation landed in US2/US3/this story.

**Independent Test**: quickstart.md "G1 — Disable / delete fee entry no longer 500s" and "G2 — Change history reflects real edits" sections.

- [x] T019 [US4] Implement `disableFeeGroup(code, subBrandCode)` on the `brands` table object in `src/app/api/_mock-db/tables/franchise.table.ts` (insert after `updateFeeGroup()`, ~L162): look up the group by `parent_brand_code`/`sub_brand_code` (reuse the lookup pattern at L140-144), return `undefined` if not found, set `status: 'inactive'`, append one `BrandChangeHistoryItem` (`changed_field: "ステータス"`, `before_value: "有効"`, `after_value: "無効"`), return the cloned group via the existing `cloneBrandFeeGroup` helper — per research.md G1/G2, contracts/disable-and-delete-brand-fee-group.md
- [x] T020 [US4] Implement `deleteFeeGroup(code, subBrandCode)` on the same `brands` table object (same file as T019 — sequential to avoid edit conflicts): find the fee group's index by `parent_brand_code`/`sub_brand_code`, return `false` if not found, splice it out of `this._feeGroups`, return `true`; append **no** change-history row (deleting removes the record itself — consistent with delete behavior elsewhere in this mock-DB) — per research.md G1, contracts/disable-and-delete-brand-fee-group.md
- [ ] T021 [P] [US4] Manual verify — 変更履歴 tab (`history-tab.tsx`) renders live rows (timestamp, actor, target, field, before/after) produced by T008 (fee edits), T015 (rename), and T019 (disable), reading the already-correct `_changeHistories`/`change_history_count` — no UI code change needed; satisfies PAR062-PAR064
- [ ] T022 [P] [US4] Manual verify — 無効化/削除 confirm dialogs (`fee-group-disable-dialog.tsx`, `fee-group-delete-dialog.tsx`) and their fee-card action buttons now complete successfully end-to-end (no 500, status badge flips to 無効, deleted card disappears) after T019/T020 — satisfies PAR034, PAR037-PAR040

**Checkpoint**: All 7 gaps (G1-G7) resolved or explicitly accepted; `checklists/parity.md` items PAR001-PAR064 all claimed by a task above.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T023 [P] Run `npm run lint` and `npm run type-check` across all files touched in T001-T022 (Constitution I — strict TypeScript, no `any`)
- [x] T024 Re-run `npm run generate-openapi && npm run generate-client` if T007/T009 required any late schema adjustments beyond T001; confirm `src/lib/api/**` still has zero manual edits
- [ ] T025 Execute the full `quickstart.md` checklist (G1-G6 + role-based spot checks) end-to-end as final sign-off — no automated tests exist for this project (Constitution "No Testing Policy")

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Blocks only US2 (T006-T014 need the T001 schema field).
- **Foundational (Phase 2)**: Empty — see note above.
- **US1 (Phase 3)**: No dependencies — verification only, can run anytime, including in parallel with everything else.
- **US2 (Phase 4)**: Depends on Phase 1 (T001/T002).
- **US3 (Phase 5)**: No dependency on Phase 1/US2 — can run in parallel with US2.
- **US4 (Phase 6)**: No dependency on Phase 1 — can run in parallel with US2/US3. T019/T020 do not depend on T006/T008/T015, but all four share `franchise.table.ts`, so if working sequentially by phase this is a non-issue; if parallelizing across stories, coordinate edits to this one file to avoid merge conflicts.
- **Polish (Phase 7)**: Depends on all prior phases desired for this release.

### Within Each Story

- US2: T001/T002 (Setup) → T006 → T008 (same method, sequential) ; T007, T009 can run alongside T006 (different files) ; T010 → T011 → T012 (same file, sequential, after T009) ; T013 independent (different file) ; T014 last (verifies the finished story).
- US3: T015 independent; T016 and T017 touch different files so can run in parallel; T018 last (verifies).
- US4: T019 → T020 (same file, sequential); T021/T022 last (verify, after T019/T020 land).

### Parallel Opportunities

- T003, T004, T005 (US1) — all read-only verification, fully parallel, and independent of every other phase.
- T007 and T009 (US2) — different files, no shared dependency beyond T001.
- T016 and T017 (US3) — different files (`brands/page.tsx` vs `brands/[id]/page.tsx`).
- T021 and T022 (US4) — both read-only verification once T019/T020 land.

---

## Parallel Example: User Story 2

```bash
# After T001/T002 (Setup) land:
Task: "T006 updateFeeGroup() scheduled_changes write handling — franchise.table.ts"
Task: "T007 [P] route-level duplicate-date validation — fees/[subBrandCode]/route.ts"
Task: "T009 [P] frontend Zod schema + superRefine — brand-fee-group-form.schema.ts"
# then, once T006/T009 land:
Task: "T010 revision list UI in BrandFeeGroupEditSheet"
```

---

## Implementation Strategy

### Recommended order (not P1→P4 by default, since US1 has no gaps)

1. **Phase 1 (Setup)** — schema-first, unblocks US2.
2. **Phase 4 (US2)** — the spec's actual Must-have gap (G3) and its largest chunk of new code; deliver this first for the highest-value increment.
3. **Phase 5 (US3)** and **Phase 6 (US4)** — can proceed in parallel with each other and with US2 once Setup is done; both are smaller, self-contained fixes.
4. **Phase 3 (US1)** — run its verification tasks anytime; they don't block or get blocked by anything.
5. **Phase 7 (Polish)** — last, gated on `quickstart.md` passing in full.

### MVP framing

Since US1 requires no code changes, the smallest _code-shipping_ increment is **US2 alone** (Setup + Phase 4) — it closes the one Must-have gap the spec calls out as "the reason the screen exists." US3 and US4 are independently valuable follow-ups, not prerequisites for US2.

---

## Parity Coverage Confirmation

All 64 items in `checklists/parity.md` (PAR001-PAR064) are claimed by at least one task above:

- PAR001-013 → T003 · PAR014-019 → T018 · PAR020-022, 024-027, 029-030 → T004 · PAR023 → T005 (documented deviation) · PAR028 → T017
- PAR031, 033, 035, 036, 041, 042, 044, 045, 047-053, 061 → T014 · PAR032 → T013 · PAR034, 037-040 → T022
- PAR043, 046, 054-057, 060 → T010 · PAR058 → T011 · PAR059 → T012 · PAR062-064 → T021

No parity item is left unclaimed.
