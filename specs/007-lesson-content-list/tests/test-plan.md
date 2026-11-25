# Test Plan — D-02 Lesson Content Management (List / Detail / Form)

**PO Spec**: `D-02` — レッスン内容管理 (Lesson Content Management)
**Spec links**:

- `specs/007-lesson-content-list/spec.md` (D-02 FR-001 — list & search)
- `specs/008-lesson-content-detail/spec.md` (D-02 FR-003 — detail display)
- `specs/009-lesson-content-form/spec.md` (D-02 FR-002/FR-004/FR-006 — create/edit/duplicate form)
  **Created**: 2026-07-21
  **Consumed by**: `gen-testcases` (per unit below) → `execute-testcases` (per generated TC doc)

> **Plan scope note**: like D-01, D-02 spans three spec folders for one PO
> spec. This plan lives under `007-lesson-content-list/tests/` (the list is
> the entry screen) and governs all three units; the sibling folders
> (`008-lesson-content-detail`, `009-lesson-content-form`) do not get their own
> plan file. Generated TC docs live under
> `specs/007-lesson-content-list/tests/cases/`.

---

## 1. Scope

**In scope (3 units, one per screen):**

- D02-01 — Lesson Content List (`lesson.tsx`) — 3 tabs: Studio / Personal / Body care
- D02-02 — Lesson Content Detail (`lesson-detail.tsx`)
- D02-03 — Lesson Content Form, create + edit + duplicate (`lesson-form.tsx`)

**Out of scope (navigation targets / separate specs, not tested here):**

- D-01 lesson scheduling/reservation (`lesson-schedule`, `lesson-schedule-form`, `lesson-reservation`) — reached via "スケジュール追加" and recent-schedule-row links on D02-02. Covered by the D-01 test plan.
- D-04 instructor master (`lesson-instructor.tsx`) — reached via the instructor link(s) in the D02-02 schedule sheet. Covered by the D-04 test plan.
- FR-S002 member-app preview display — not present on any of these three screens per both the 008 and 009 specs' explicit "Out of Scope" notes; no preview control exists.
- Actual persistence of create/edit/duplicate/deactivate/delete and real image upload/rich-text serialization — all three specs state these are toast-and-navigate / visual-only in Phase 1 with no backend write contract defined. Test the UI flow and resulting toast/navigation, not real persistence.

---

## 2. Unit table

| #   | Unit   | Screen(s)                                                                                                 | Route (mockup file) | TC doc filename                                           |
| --- | ------ | --------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------- |
| 1   | D02-01 | Lesson Content List (Studio / Personal / Body care tabs, search, sort, detailed filters, Include-deleted) | `lesson.tsx`        | `TC -【Fitness CRM】- [D02-01][Lesson Content List].md`   |
| 2   | D02-02 | Lesson Content Detail (basic info, images, schedules, deactivate/delete dialogs, change history)          | `lesson-detail.tsx` | `TC -【Fitness CRM】- [D02-02][Lesson Content Detail].md` |
| 3   | D02-03 | Lesson Content Form — create, edit, duplicate (one shared form component)                                 | `lesson-form.tsx`   | `TC -【Fitness CRM】- [D02-03][Lesson Content Form].md`   |

**Unit-split rationale**: 1 spec = 1 screen for all three. The deactivate/delete `AlertDialog`s and the "show all schedules" `Sheet` exist only inside the detail screen, so they're clustered into D02-02 rather than split out. Create/Edit/Duplicate are one form component with three modes (per spec + confirmed in the mockup: `LessonForm` served by a single `mode`/`copy` flag), so they stay one unit (D02-03) rather than three.

---

## 3. Sources per unit

| Unit   | Spec sections                                       | UI mockup file                                      | FRs covered                                                                   |
| ------ | --------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| D02-01 | `007-lesson-content-list/spec.md` — full document   | `.cache/fitness-crm-ui/src/pages/lesson.tsx`        | FR-001-P1-01…15                                                               |
| D02-02 | `008-lesson-content-detail/spec.md` — full document | `.cache/fitness-crm-ui/src/pages/lesson-detail.tsx` | FR-003-P1-01…23                                                               |
| D02-03 | `009-lesson-content-form/spec.md` — full document   | `.cache/fitness-crm-ui/src/pages/lesson-form.tsx`   | FR-002-P1-01…18, FR-004-P1-01…05, FR-006-P1-01…02, FR-007-P1-01, FR-009-P1-01 |

Also read where referenced: `.cache/fitness-spec/crm/requirements/D-02.md` (shared source requirement doc) — the three spec.md files remain the oracle.

---

## 4. Coverage focus per unit

Added to — not a replacement for — `gen-testcases`' full coverage-dimension walk.

**D02-01 — Lesson Content List**

- 3-tab data-shape differences: Studio/Body-care columns (id, name, category, brand, duration, pricingType, status, genderRestriction) vs Personal columns (id, name, description, category, duration, price, reservations/maxReservations, brand, status) — confirm each tab renders its own column set, not a shared one.
- Active search (name/ID partial match, case-sensitivity per spec wording) combined with active sort (per-column ascending/descending toggle) and active detailed filters (category/brand/status/lesson-category) — all three are functional in Phase 1, not visual-only; test each independently and at least one 2-way combination.
- "Include deleted" toggle interaction with the other filters — confirm it operates as an independent axis, not overridden by detailed filters.
- "Clear all" resets every filter control (including Include-deleted) back to default and restores the full non-deleted list.
- Store-scoped visibility per user context (per FR-001-P1-07) — role/store combinations that should narrow visible rows.
- Loading skeleton and error states — both are newly added for Phase 1 (absent from the prototype per the spec), so verify they actually render, not just that the spec mentions them.
- "New Lesson Creation" button — cross-check its role gating against `009-lesson-content-form`'s FR-009-P1-01 clarification (`RoleGatedButton allowedRoles={["Headquarter","System"]}`), since the list spec (007) itself doesn't state the gating explicitly — flag if the two specs disagree at execution time.

**D02-02 — Lesson Content Detail**

- Studio vs Personal field difference: 実施時間 (implementation time) row for studio-type vs セッション時間 (session time) row for personal-type.
- Restrictions & pricing card: "制限なし" fallback when no restricted contracts are set; per-use-fee row visible only when pricing type = 有料（都次）.
- Image gallery: single-image state hides prev/next arrows; multi-image state wraps around at both ends; thumbnail click sets main image; "メイン" marker always on first thumbnail; position counter accuracy.
- Recent-schedule card (top 3) vs "全{n}件を表示" sheet (recurring-pattern summary + full per-session list, capacity color-coding: full=destructive / ≥80%=warning / >0=success / 0=muted).
- Multi-instructor rendering as clickable D-04 links, including the "n名" plural case.
- Edit / Duplicate / Delete / Deactivate role gating: Headquarter/System active, all other roles (Manager/Staff/Trainer/Observer) disabled + permission tooltip — full 6-role decision table, not just a HQ-vs-not split.
- Change-history tab visible only for Headquarter/System; absent (not just disabled) for other roles.
- Deactivate dialog: reason required before confirm enabled; confirmation copy about reservations remaining valid + re-activation possibility.
- Delete dialog: in-use (usage > 0) blocks with destructive alert + disabled confirm + link to in-use schedules (with count); unused (usage = 0) requires a delete reason before confirm enables.
- Inactive/soft-deleted master rendering: header badge + status card reflect inactive state, "有効化する" re-activation control replaces "無効化する" (still gated to HQ/System).
- Back-link context: `from=schedule` routes back to schedule/reservation context instead of the lesson list — verify both entry paths.
- Loading skeleton and error/not-found states (newly added for Phase 1, consistent with the list decision).

**D02-03 — Lesson Content Form (Create / Edit / Duplicate)**

- Mode-specific chrome: title ("新規レッスン作成" vs "スタジオレッスン編集"/"パーソナルトレーニング編集"), submit label ("入力内容を確認する" vs "変更を保存する"), edit-only warning banner presence.
- Lesson-type-driven duration option set: personal → {30分, 60分} only; studio/bodycare → full 7-option set including 120分 — this is a hard partition, test both sides plus the switch-between-types behavior (options change when type changes mid-fill).
- Pricing-type-driven per-use-fee field: appears + becomes required only for 有料（都次）; hidden (and cleared) for the other two pricing types.
- Required-field validation: レッスン名, ブランド, 所要時間, 料金種別, and conditionally 都次利用料金 — each shows its own "{項目名}は必須です。" and clears on edit; footer summary appears only while ≥1 error exists; confirmation dialog is suppressed while invalid.
- Restriction multi-select (main + option contracts): add/remove via badge, check-mark sync in the popover list, empty-search feedback text (distinct wording for main vs option).
- Image section: add / delete / drag-reorder, "メイン" marker always tracks the first position, empty-state (upload zone only, no grid) when zero images.
- Description heading/placeholder swap: "トレーニング内容説明" (personal) vs "レッスン内容説明" (studio/bodycare).
- Status section: switch ↔ badge (有効 green / 無効 muted) stay in sync in both directions.
- Confirmation dialog content by mode: create ("以下の内容で登録します。よろしいですか？") vs edit ("この内容で変更を保存しますか？"), both summarizing type/name/pricing-type/status.
- Duplicate mode: name field pre-filled verbatim from the `name` query param (already carrying "（コピー）" from the caller) — this screen does not append the suffix itself; verify it renders the passed value unchanged and otherwise behaves exactly like create.
- Skeleton loading state for edit/duplicate pre-fill only — create mode must render immediately with no skeleton.
- Cancel / back-link discard behavior — no unsaved-changes warning is specified for this screen (unlike D01-03's schedule form), confirm that absence is intentional per the spec, not a missed case.

---

## 5. Traceability map

Each of the three source specs maps entirely to one unit — no FR split across units.

| FR range                                                                                                  | Unit   |
| --------------------------------------------------------------------------------------------------------- | ------ |
| FR-001-P1-01…15 (`007-lesson-content-list`)                                                               | D02-01 |
| FR-003-P1-01…23 (`008-lesson-content-detail`)                                                             | D02-02 |
| FR-002-P1-01…18, FR-004-P1-01…05, FR-006-P1-01…02, FR-007-P1-01, FR-009-P1-01 (`009-lesson-content-form`) | D02-03 |

**Confirmed**: every requirement across all three specs lands in exactly one unit. No orphaned requirements.

**Cross-unit consistency flag (not a coverage gap, but verify at execution)**: D02-01's "New Lesson Creation" button gating and D02-02's Edit/Duplicate/Delete/Deactivate gating both cite the same Headquarter/System-only rule, and D02-03's FR-009-P1-01 is the requirement that actually mandates the list-button gating (007's own spec doesn't state it). When executing D02-01's TC doc, treat FR-009-P1-01 (from the D02-03 sources) as the oracle for that specific button, and note the cross-spec reference rather than treating it as ungrounded.

---

## 6. Execution notes (for `execute-testcases`)

- **Roles**: exercise the D-02 authority matrix — Headquarter and System are privileged (full create/edit/duplicate/delete/deactivate + change-history visibility); Manager/Staff/Trainer/Observer are view-only on the detail screen and cannot reach the form. Cover all 6 roles for every gated action, not just a privileged-vs-not split.
- **BE-mocked caveats** (log outcome as `Block`, not `NG`): image upload/reorder persistence and rich-text formatting persistence (both explicitly visual-only in Phase 1 per `009`'s Out-of-Scope section); actual soft-delete/deactivation write and its effect on the list's "include deleted" filter (D02-01 and D02-02 are tested independently — confirm cross-screen effect only if seed data supports it, otherwise mark data-dependent); change-history entries in D02-02 are seed data, not live-generated from actions taken during the test pass.
- **Seed-reset points**: duplicate-mode and edit-mode pre-fill both depend on a specific source master's sample values (e.g. the studio sample "ヨガ基礎クラス" / a personal sample) — confirm which sample record the mockup uses before writing exact-value assertions, and reset to that known sample between edit-mode test runs if a prior case mutated it.
- **Viewport**: tablet-and-up only. Mobile/phone width is out of scope per the shared template.

---

## 7. Suggested order

1. **D02-01 — Lesson Content List** first: P1 entry point for the whole D-02 cluster, uses static/seeded tab data with no dependency on the other two units.
2. **D02-02 — Lesson Content Detail** second: reached from a D02-01 row click; testing it establishes what "current master state" (active/inactive, usage count) looks like before create/edit is exercised.
3. **D02-03 — Lesson Content Form** last: both its edit and duplicate modes depend on an existing master's data (as observed via D02-02), and its own create-flow output (a newly registered master) is what a re-run of D02-01/D02-02 would need to verify — running it last avoids mutating shared list/detail state that earlier units depend on.

---

## 8. Definition of done

- [ ] TC doc created for D02-01, D02-02, and D02-03 under `specs/007-lesson-content-list/tests/cases/`.
- [ ] Every FR-id in §5 traced to its unit's TC doc.
- [ ] Any gap found in `tests/checklists/common-function-checklist.md` or `common-gui-validate-checklist.md` while authoring cases is fixed in the shared checklist first.
- [ ] Each of the three TC docs executed once via `execute-testcases` (single-pass model — no Round 2).
