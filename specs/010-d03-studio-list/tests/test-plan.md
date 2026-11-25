# Test Plan — D-03 Studio Management (List / Detail / Create-Edit + Layout)

**PO Spec**: `D-03` — スタジオ管理 (Studio Management)
**Spec links**:

- `specs/010-d03-studio-list/spec.md` (D-03 FR-001 — list display)
- `specs/011-studio-detail-page/spec.md` (D-03 FR-003 — detail display)
- `specs/012-studio-create-edit/spec.md` (D-03 FR-002/FR-004/FR-006 — create/edit form + space layout editor)
  **Created**: 2026-07-21
  **Consumed by**: `gen-testcases` (per unit below) → `execute-testcases` (per generated TC doc)

> **Plan scope note**: all three D-03 specs source from the **same** UI file
> (`lesson-studio.tsx`), which internally exposes three views
> (`StudioListView`, `StudioDetailView`, `StudioFormView`) via a `showForm` /
> `showDetail` prop switch on the exported `LessonStudio` component. Despite
> sharing one file, they are three distinct screens/routes from a user's
> perspective, so the one-screen-per-unit rule still applies — they stay three
> units. This plan lives under `010-d03-studio-list/tests/` (the list is the
> entry screen); the sibling folders do not get their own plan file. Generated
> TC docs live under `specs/010-d03-studio-list/tests/cases/`.

---

## 1. Scope

**In scope (3 units, one per screen):**

- D03-01 — Studio List (`lesson-studio.tsx` → `StudioListView`)
- D03-02 — Studio Detail (`lesson-studio.tsx` → `StudioDetailView`), including its delete-confirmation dialog and change-history tab
- D03-03 — Studio Create/Edit Form + Space Layout Editor (`lesson-studio.tsx` → `StudioFormView`)

**Out of scope (navigation targets / separate specs / explicitly deferred, not tested here):**

- D-01 lesson scheduling — the space-layout grid this cluster configures ultimately powers the reservation grid in `lesson-reservation.tsx` (D-01), but consuming it there is covered by the D-01 test plan, not here.
- D-02 lesson content — linked-lesson row click on D03-02 navigates to lesson detail; covered by the D-02 test plan.
- FR-007 Studio utilization KPI panel (day/week/month) — present in the `StudioDetailView` prototype but explicitly a Should/future-phase item per both `010` and `011` specs' Out-of-Scope sections.
- Status active/inactive toggle button shown in the `StudioDetailView` prototype's status card — `011`'s traceability table marks it "Present in UI, out of scope for this FR-003 spec" (belongs to FR-005, tracked separately, not in any of the three specs' active FR lists).
- Real image-upload persistence and the space-layout data-management method (JSON vs image reference) — `012` states the storage method is undetermined (D-Q10); test the visual/interaction affordance only.

---

## 2. Unit table

| #   | Unit   | Screen(s)                                                                                         | Route (mockup file)                      | TC doc filename                                             |
| --- | ------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| 1   | D03-01 | Studio List (search, filter panel, sort, role-scoped rows, action-button gating)                  | `lesson-studio.tsx` (`StudioListView`)   | `TC -【Fitness CRM】- [D03-01][Studio List].md`             |
| 2   | D03-02 | Studio Detail (basic info, linked lessons, images, layout preview, delete dialog, change history) | `lesson-studio.tsx` (`StudioDetailView`) | `TC -【Fitness CRM】- [D03-02][Studio Detail].md`           |
| 3   | D03-03 | Studio Create/Edit Form + Space Layout Editor                                                     | `lesson-studio.tsx` (`StudioFormView`)   | `TC -【Fitness CRM】- [D03-03][Studio Create Edit Form].md` |

**Unit-split rationale**: same as D-01/D-02 — 1 spec = 1 screen. The delete `AlertDialog` and change-history tab exist only within the detail screen, so they cluster into D03-02. Create and Edit share one `StudioFormView` component (confirmed via `mode` prop, mirroring `LessonForm` and `InstructorFormView`), so they stay one unit (D03-03) together with the Space Layout Editor, which only ever renders alongside the form.

---

## 3. Sources per unit

| Unit   | Spec sections                                    | UI mockup file                                                    | FRs covered                              |
| ------ | ------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------- |
| D03-01 | `010-d03-studio-list/spec.md` — full document    | `.cache/fitness-crm-ui/src/pages/lesson-studio.tsx` (list view)   | FR-001-01…13                             |
| D03-02 | `011-studio-detail-page/spec.md` — full document | `.cache/fitness-crm-ui/src/pages/lesson-studio.tsx` (detail view) | FR-003-01…13                             |
| D03-03 | `012-studio-create-edit/spec.md` — full document | `.cache/fitness-crm-ui/src/pages/lesson-studio.tsx` (form view)   | FR-002-01…06, FR-004-01…02, FR-006-01…06 |

Also read where referenced: `.cache/fitness-spec/crm/requirements/D-03.md`.

---

## 4. Coverage focus per unit

Added to — not a replacement for — `gen-testcases`' full coverage-dimension walk.

**D03-01 — Studio List**

- 6-role data-scope decision table: System/Headquarter (all stores/brands), Manager (assigned/managed stores only), Staff (single assigned store), Trainer/Observer (assigned store, read-only) — verify zero out-of-scope rows leak for any role.
- Keyword search: case-insensitive, partial match on studio name only; clearing restores the full scoped list; no-match shows the empty-state message.
- 4 independent filters (store/type/brand/status) combined with AND semantics; "Clear" resets all four simultaneously; filter panel collapse retains active filters (only visual collapse, not a reset).
- Sortable columns (ID, Name, Store, Type, Capacity) ascending→descending toggle on repeat click; non-sortable columns (Available Hours, Brand, Status) must show no sort control at all — a specific negative check, not just "doesn't respond to click."
- Default sort = Studio ID ascending on first load, before any user interaction.
- "+ 新規登録" button visibility: **note a spec-internal wording nuance** — FR-001-09 states it's visible for System/Headquarter/Manager/Staff and hidden for Trainer/Observer, while User Story 5's acceptance scenarios only explicitly test Headquarter/Manager (#4) and Staff (#5) as visible and Trainer/Observer (implied) as hidden; treat FR-001-09 as the authoritative 6-role list when writing cases, and explicitly add a System-role case since no acceptance scenario names it directly.
- Row-level action buttons: view-detail always present; edit/delete gated per role (Headquarter/Manager: both; Staff: edit only; Trainer/Observer: neither) — **note this list-level gating differs from FR-001-10**, which states action buttons render only in the detail-view header, not inline in the list table. Flag this direct contradiction between User Story 5 (list-level buttons) and FR-001-10 (detail-only buttons) in the TC doc's Notes rather than silently picking one — verify against the actual mockup and record which one the mockup implements.
- Type/Brand/Status badge rendering: TypeBadge (studio-lesson/pt/body-care visual treatment), BrandBadge (5-value enum), active/inactive status badge.

**D03-02 — Studio Detail**

- Basic info completeness: studio ID, name, type, physical capacity (物理定員), buffer value (バッファ値) — both required per the 2026-07-03 clarification — usage hours, store, created/updated dates, optional equipment/notes blocks only when data exists.
- Linked-lessons reservation-rate color thresholds: ≥80% success, 60–79% warning — boundary-test at 59/60/79/80/100 to catch off-by-one threshold bugs.
- Linked-lesson row click → navigation to lesson detail (D-02, out of scope for content — verify the navigation fires only).
- Studio image card: image count badge matches actual thumbnail count.
- Space layout preview: rendered only when layout data exists; absent (not an empty grid) when it doesn't.
- Edit/Delete role gating — 3-tier decision table per FR-003-09: System/Headquarter/Manager (both visible), Staff (edit only, no delete), Trainer/Observer (neither) — this is stricter than a simple privileged/not split, test all 6 roles.
- Delete dialog: blocked + destructive warning when the studio is assigned to ≥1 lesson; confirm button stays disabled even if the dialog is closed and reopened.
- Change-history tab: 作成 (creation) actions render a "新規作成" badge with optional note instead of before/after; update actions with multiple field diffs expand into one row per changed field — verify a multi-field update produces the correct row count, not a single collapsed row.
- **Open-question items** the spec itself flags as `[NEED CLARIFICATION]` — do not invent an expected result for these; write them as explicit open-question / `Block` cases per the gen-testcases philosophy: (a) zero-linked-lessons UI state (empty card vs message vs hidden — undefined in spec), (b) page-level loading/not-found/API-error states (not modeled in the current UI code).

**D03-03 — Studio Create/Edit Form + Space Layout Editor**

- Two-mode form sharing one component: title swap ("スタジオ編集" in edit mode), submit-label swap ("入力内容を確認する" create / "変更を保存する" edit), full pre-fill accuracy in edit mode.
- Required-field validation: 店舗名, スタジオ名, スタジオ区分, 収容人数 (capacity), バッファ値 — each shows "{項目名}は必須です。". **Flag a spec-internal discrepancy**: FR-002-02 states 利用可能時間 (operating hours) is "Not explicitly marked required in UI but required per spec" — write both an as-required case and note the ambiguity, since the mockup and the spec text disagree on whether the field is visually marked required.
- 収容人数 / バッファ値 numeric boundaries: both capped at max 500 — boundary-test 499/500/501 for each field independently.
- Confirmation dialog summarizes exactly: スタジオ名, 所属店舗, スタジオ区分, 定員, 利用可能時間, ステータス — verify no extra/missing field vs this exact list.
- Space Layout Editor: 4 placement modes (通常席/器材席/固定物/未使用) with ring-indicator on the active mode; cell click paints the selected type; dynamic grid resize on column (6/8/10) and row (2/3/4/5) change — cells within new bounds preserve their type, cells outside the new bounds are discarded (test both a grow and a shrink resize to hit both preserve and discard paths); "リセット" restores the exact default 2×8 empty grid.
- Summary counts (総スペース数 / 予約可能スペース / 利用不可スペース) recompute correctly after every cell-type change and every grid resize — 予約可能 = available-cell count, 利用不可 = equipment + pillar counts, 総 = full grid size regardless of cell type.
- Legend color mapping matches `SpaceReservationGrid` in `lesson-reservation.tsx` (D-01) exactly — a cross-screen visual-consistency check, not just "a legend exists."
- **Flag a spec-internal inconsistency**: User Story 2's acceptance scenario #3 describes a warning shown "when modifying pricing or restriction fields" during edit — but the studio form's field list (FR-002-02) contains no pricing or restriction fields at all. Write this as an open question in the TC doc rather than fabricating pricing/restriction fields that don't exist on this form; the warning banner condition needs PO clarification.
- Delete entry point cross-reference: `012`'s FR-DELETE-01 describes the same delete-confirmation behavior already covered under D03-02 (§5 below) — do not author a duplicate delete-flow case here; this unit only needs to confirm the Cancel button on the form itself (`window.history.back()`), not the delete dialog.

---

## 5. Traceability map

Each of the three source specs maps entirely to one unit — no FR split across units, with one explicit cross-spec exception noted below.

| FR range                                                            | Unit                                    |
| ------------------------------------------------------------------- | --------------------------------------- |
| FR-001-01…13 (`010-d03-studio-list`)                                | D03-01                                  |
| FR-003-01…13 (`011-studio-detail-page`)                             | D03-02                                  |
| FR-002-01…06, FR-004-01…02, FR-006-01…06 (`012-studio-create-edit`) | D03-03                                  |
| FR-DELETE-01 (`012-studio-create-edit`)                             | **D03-02**, not D03-03 — see note below |

**Cross-spec duplication note**: `012-studio-create-edit` defines `FR-DELETE-01` ("The delete action is available from the studio detail page... [UI: lesson-studio.tsx StudioDetailView]"), which describes the exact same delete-confirmation-dialog behavior that `011-studio-detail-page` already specifies as `FR-003-08`. Since the delete dialog physically renders on the Studio Detail screen (not the Create/Edit Form), `FR-DELETE-01` is mapped to **D03-02** for test-authoring purposes, even though it's textually defined inside the `012` spec. This avoids writing the same delete-dialog case twice under two different unit TC docs.

**Confirmed**: every requirement across all three specs (including the cross-referenced `FR-DELETE-01`) lands in exactly one unit. No orphaned requirements.

---

## 6. Execution notes (for `execute-testcases`)

- **Roles**: exercise the full D-03 authority matrix across all 6 roles for every gated action — System/Headquarter/Manager (list: full; detail: view+edit+delete), Staff (list: view+edit, no delete; detail: view+edit, no delete), Trainer/Observer (list: view only, no register button; detail: view only).
- **BE-mocked caveats** (log outcome as `Block`, not `NG`): Store select population depends on Y-02 store-management data — mark Block if that mock endpoint/seed is unavailable; real image-upload persistence (visual affordance only, per Phase 1); the space-layout storage mechanism (JSON vs image) is explicitly undetermined (D-Q10) — test only the editor's in-session behavior, not what gets persisted; page-level loading/not-found/error states on D03-02 are unmodeled in the current UI — see the open-question cases in §4.
- **Seed-reset points**: the Space Layout Editor's dynamic resize is destructive to out-of-bounds cells — reset to the default 2×8 grid ("リセット") between resize test cases so each resize assertion starts from a known state.
- **Viewport**: tablet-and-up only. Mobile/phone width is out of scope per the shared template.

---

## 7. Suggested order

1. **D03-01 — Studio List** first: P1 entry point, uses seeded studio data with no dependency on the other two units.
2. **D03-03 — Studio Create/Edit Form + Space Layout Editor** second: registering (or editing) a studio here produces the studio + layout data that D03-02's detail assertions (layout preview, linked-lesson reservation rates depend on real schedule data outside this cluster, but the studio record itself) can reliably reference.
3. **D03-02 — Studio Detail** last: it depends on a studio existing (from D03-03) and is the deepest screen (change history, delete guard, layout preview, linked lessons) — running it last means the studio/layout data it inspects is already known-good.

---

## 8. Definition of done

- [ ] TC doc created for D03-01, D03-02, and D03-03 under `specs/010-d03-studio-list/tests/cases/`.
- [ ] Every FR-id in §5 traced to its unit's TC doc, including the `FR-DELETE-01` cross-reference landing once (on D03-02) rather than twice.
- [ ] Any gap found in `tests/checklists/common-function-checklist.md` or `common-gui-validate-checklist.md` while authoring cases is fixed in the shared checklist first.
- [ ] Each of the three TC docs executed once via `execute-testcases` (single-pass model — no Round 2).
