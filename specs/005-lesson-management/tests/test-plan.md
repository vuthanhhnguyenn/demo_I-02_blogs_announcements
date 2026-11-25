# Test Plan — D-01 Lesson Management (Schedule / Reservation / Registration)

**PO Spec**: `D-01` — レッスン管理 (Lesson Management)
**Spec links**:

- `specs/005-lesson-management/spec.md` (D-01 FR-001/FR-002 — schedule list/monitor)
- `specs/006-lesson-reservation/spec.md` (D-01 FR-007 — reservation detail)
- `specs/weekly-schedule-create/spec.md` (D-01 FR-003 — schedule registration/edit)
  **Created**: 2026-07-21
  **Consumed by**: `gen-testcases` (per unit below) → `execute-testcases` (per generated TC doc)

> **Plan scope note**: D-01 is implemented as three separate screens across three
> spec folders. This plan file lives under `005-lesson-management/tests/` (the
> primary/entry screen for D-01) and governs all three units. Sibling spec
> folders (`006-lesson-reservation`, `weekly-schedule-create`) do not get their
> own plan file — this one is the single source of truth for the whole D-01
> cluster. Generated TC docs are written under
> `specs/005-lesson-management/tests/cases/` regardless of which sibling spec a
> unit's sources come from.

---

## 1. Scope

**In scope (3 units, one per screen):**

- D01-01 — Lesson Schedule List / Monitor (`lesson-schedule.tsx`)
- D01-02 — Lesson Reservation Detail (`lesson-reservation.tsx`)
- D01-03 — Weekly Schedule Registration Form, create + edit (`lesson-schedule-form.tsx`)

**Out of scope (navigation targets / separate specs, not tested here):**

- D-02 Lesson Content Management (`lesson-detail.tsx`, `lesson-form.tsx`) — reached via the "レッスン内容管理で編集" link on the reservation detail screen and the monthly-template note. Covered by the D-02 test plan.
- D-04 Instructor Management (`lesson-instructor.tsx`) — reached via instructor links / buffer-settings profile link. Covered by the D-04 test plan.
- Member detail screen — reached via "会員詳細を見る" from the limited-profile popover on D01-02. Not part of this CRM's D-group specs under test.
- LINE notification integration, in-app messaging, workout program delivery, note handoff, multi-store buffer auto-extension, cross-category (visit/trial) reservation list — all explicitly Phase 2+ per all three specs' "Out of Scope" sections.
- Monthly template _management_ screen — the specs state templates are edited inside `lesson-schedule-form.tsx` itself (covered by D01-03); no separate template screen exists.

---

## 2. Unit table

| #   | Unit   | Screen(s)                                                                                              | Route (mockup file)        | TC doc filename                                                |
| --- | ------ | ------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------- |
| 1   | D01-01 | Lesson Schedule List / Monitor (day / weekly / list views + all-store summary + Schedule Change modal) | `lesson-schedule.tsx`      | `TC -【Fitness CRM】- [D01-01][Lesson Schedule List].md`       |
| 2   | D01-02 | Lesson Reservation Detail (space grid, reservation list/stats, all reservation-management dialogs)     | `lesson-reservation.tsx`   | `TC -【Fitness CRM】- [D01-02][Lesson Reservation Detail].md`  |
| 3   | D01-03 | Weekly Schedule Registration Form — create & edit (single/recurring, studio/PT, templates)             | `lesson-schedule-form.tsx` | `TC -【Fitness CRM】- [D01-03][Schedule Registration Form].md` |

**Unit-split rationale**: each spec already targets exactly one screen/mockup file, so the natural split is 1 spec = 1 unit. Modals and dialogs that only exist inside a parent screen (Schedule Change modal on D01-01; Add/Cancel/Change-instructor/Change-time/Change-studio/Cancel-wizard/limited-profile-popover/session-memo on D01-02; template popover/save-dialog on D01-03) are clustered into their parent screen's unit rather than split out.

---

## 3. Sources per unit

| Unit   | Spec sections                                                                                                                                  | UI mockup file                                             | FRs covered                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| D01-01 | `005-lesson-management/spec.md` — full document (User Stories 1–6, Edge Cases, FR-001–FR-046, Key Entities, UI Component Hierarchy, UI States) | `.cache/fitness-crm-ui/src/pages/lesson-schedule.tsx`      | FR-001–FR-046                                                                         |
| D01-02 | `006-lesson-reservation/spec.md` — full document (User Stories 1–5, Edge Cases, all FR- ids, Key Entities)                                     | `.cache/fitness-crm-ui/src/pages/lesson-reservation.tsx`   | FR-007-01…17, FR-006-01…03, FR-011-01, FR-015-01…04, FR-S001-01, FR-009-01, FR-008-01 |
| D01-03 | `weekly-schedule-create/spec.md` — full document (User Stories 1–6, Edge Cases, all FR- ids, Key Entities)                                     | `.cache/fitness-crm-ui/src/pages/lesson-schedule-form.tsx` | FR-003-001…021 (incl. 014a), FR-013-001…003, FR-016-001…003, FR-004-001               |

Also read for all three units: `.cache/fitness-spec/crm/requirements/D-01.md` (shared source requirement doc) where the spec references it — but the spec.md files remain the oracle per `gen-testcases` philosophy.

---

## 4. Coverage focus per unit

These are **added to**, not a replacement for, `gen-testcases`' full coverage-dimension walk (main flow, fields/GUI, validation, permissions/roles, states, list mechanics, layout robustness, URL/state persistence, concurrency, time/computed state, i18n, escaping, responsive, traceability).

**D01-01 — Lesson Schedule List / Monitor**

- Role × axis lock: Trainer forced into my-schedule with store-axis disabled; non-Trainer roles freely switch (decision table across System/Headquarter/Manager/Staff/Trainer).
- All-store summary mode's 3-condition AND gate: current store context = all-store AND axis = store AND screen-level store filter = all-store. Test each condition individually failing to confirm summary mode does NOT show.
- Reservation-label business rule: full (booked = capacity), ≥85%-but-not-full (remaining seats shown), otherwise booked/capacity; separately, capacity = 1 uses PT semantics (booked / available) instead of the numeric label — boundary-test at capacity 1 vs 2.
- Studio/instructor filter narrowing correctness identically enforced across day, weekly, and list views (same underlying data, three renderings).
- Alert visual marking + counts: day-timeline header alert count, list-view alert badge vs dash when no alert.
- Current-time indicator: appears only when there is at least one prior completed lesson, inserted before the first in-progress/upcoming lesson — boundary case with zero completed lessons (no indicator) and all lessons completed (indicator position at end/absent — confirm against mockup).
- Public/internal (Mode A/B) badge + tooltip on internal (non-public) weekly cards.
- Schedule Change modal: field completeness (lesson summary, change-scope radio, time/instructor/studio controls, required reason, impact summary, notification checkbox), close/cancel restores page interactivity, and the Phase-1 "confirm completes with no extra validation" flow.
- Full-page skeleton vs component-level skeleton (independently loading regions) — two distinct loading states, not one.

**D01-02 — Lesson Reservation Detail**

- Space grid color coding (reserved/available/equipment/pillar) and cell-click → Add Reservation entry point.
- Reservation-stats bar chart: 5 status counts + percentages sum sanity-checked against the reservation list.
- Pagination boundary at exactly 7 / 8 reservations (page-size = 7).
- Add Reservation modal: remaining-count = 0 block ("残回数が不足しています"), active-penalty block ("予約不可期間中の会員です（〇月〇日まで）"), notification checkbox effect, "追加確定（N名）" count accuracy.
- Cancel dialog: 3 cancel-type radios (member/staff/instructor-initiated) each showing its own consequence text; notification checkbox.
- Change-instructor / change-time / change-studio dialogs: required reason field, notification checkbox, impact summary content, studio-conflict / instructor-conflict warnings.
- 3-step cancel wizard: step transitions (1 impact → 2 reason → 3 confirm), wizard resets to Step 1 when reopened after a mid-way close, and the resulting cancelled-state UI (header badge, status card, "中止にする"→"中止を取り消す" button swap, disabled "この回を変更").
- Limited-profile popover: confirm **no** protected PII (address/phone/email/contract/payment) renders, for both studio-lesson and PT session types.
- Penalty ("ペナルティ中") and remaining-count-insufficient ("残回数不足") badges + red-tinted row.
- Session memo: save appends with date/author, delete removes via trash icon.

**D01-03 — Weekly Schedule Registration Form**

- Lesson-class switch (スタジオレッスン / パーソナルトレーニング) drives conditional fields: studio + capacity (studio) vs course-type dropdown (PT).
- Single vs recurring schedule mode: single-mode holiday warning banner; recurring-mode preview list + holiday-conflict count warning + "さらに表示" pagination (20 at a time).
- Trainer role instructor lock: self pre-filled, read-only chip with "（あなた）" + lock icon, no add/remove combobox — vs non-Trainer roles' free multi-select. This is the corrected-defect behavior (2026-06-25 clarification) — test it explicitly since the original prototype lacked it.
- Instructor double-booking conflict warning message format (names the instructor + conflicting lesson).
- Capacity vs studio physical-limit validation (boundary at exactly the physical cap).
- Template load (pre-fills 8 listed fields, excludes instructors) / save (name required) / delete.
- Publication toggle (Mode A "公開" vs Mode B "非公開") + description text swap; trial-slot sub-fields (内数/外数 radio, capacity 1–5) only for studio lessons.
- Edit mode: pre-fill accuracy across all field types; existing-reservation change confirmation requiring a mandatory change-reason before save.
- Required-field validation (date, time, ≥1 instructor) — first invalid field scrolls into view + footer summary.
- Unsaved-changes discard confirmation on navigate-away.

---

## 5. Traceability map

Each of the three source specs maps entirely to exactly one unit — no FR is split across units, so the map is stated as ranges rather than one row per FR-id.

| FR range                                                                                                         | Unit   |
| ---------------------------------------------------------------------------------------------------------------- | ------ |
| FR-001 – FR-046 (`005-lesson-management`)                                                                        | D01-01 |
| FR-007-01…17, FR-006-01…03, FR-011-01, FR-015-01…04, FR-S001-01, FR-009-01, FR-008-01 (`006-lesson-reservation`) | D01-02 |
| FR-003-001…021 (incl. FR-003-014a), FR-013-001…003, FR-016-001…003, FR-004-001 (`weekly-schedule-create`)        | D01-03 |

**Confirmed**: every requirement across all three specs lands in exactly one unit. No orphaned requirements.

**Cross-unit navigation note (not a coverage gap, but flag in each TC doc's Notes)**: `005-lesson-management` FR-027 ("navigate to reservation detail... destination out of scope for this spec") and FR-003 ("Schedule registration entry button... out of scope for this specification except entry point") both resolve _within_ this D-01 cluster — FR-027's destination is covered by D01-02, and the registration entry point's destination is covered by D01-03. Each unit's TC doc should verify only the _entry point_ (button/click → navigation fires) and let the target unit's own TC doc cover the destination screen's content, to avoid duplicate testing.

---

## 6. Execution notes (for `execute-testcases`)

- **Roles**: exercise the full D-01 permission matrix — System, Headquarter, Manager, Staff, Trainer for D01-01 and D01-03 (Trainer has the axis-lock / self-lock exceptions in both); D01-02 does not appear to gate by role in the spec beyond general Staff/Trainer access — verify against the D-01 permission matrix during execution and flag if a role should be blocked from the reservation-management actions.
- **BE-mocked caveats** (log outcome as `Block`, not `NG`, when the mock cannot exercise these): member search API in the Add Reservation dialog (006 US2, server-side query per clarification); actual notification delivery for all notification checkboxes across D01-01/02/03; actual refund processing tied to cancellation/change flows; real store-holiday-calendar integration (Y-02) feeding the holiday-warning banner and recurring-conflict count on D01-03; instructor-conflict detection depends on other seeded schedules existing at the same day-of-week/time — confirm seed data supports it before marking a conflict case NG.
- **Seed-reset points**: D01-03's template list and any schedule created during a test run mutate shared list state consumed by D01-01/D01-02 — reset or use disposable test data between D01-03 create/edit cases and D01-01/D01-02 verification cases so cross-unit assertions stay deterministic.
- **Viewport**: tablet-and-up only (tablet-landscape / desktop). Mobile/phone width is out of scope per the shared template.

---

## 7. Suggested order

1. **D01-01 — Lesson Schedule List / Monitor** first: it is the P1 entry point for the whole D-01 cluster and uses static/seeded schedule data that doesn't depend on the other two units.
2. **D01-03 — Weekly Schedule Registration Form** second: exercising create/edit here produces the schedule data that D01-02's reservation-detail assertions can reliably reference, and it is reached via D01-01's (out-of-scope-here) registration entry point.
3. **D01-02 — Lesson Reservation Detail** last: it is the deepest screen (most modals, most business rules) and is navigated to from a lesson row on D01-01/D01-03's output — running it last means the schedule data it inspects is already known-good from the prior two units.

---

## 8. Definition of done

- [ ] TC doc created for D01-01, D01-02, and D01-03 under `specs/005-lesson-management/tests/cases/`.
- [ ] Every FR-id in §5 traced to its unit's TC doc (spot-check during `gen-testcases`' own traceability walk).
- [ ] Any gap found in `tests/checklists/common-function-checklist.md` or `common-gui-validate-checklist.md` while authoring cases is fixed in the shared checklist first, per the checklist-first workflow.
- [ ] Each of the three TC docs executed once via `execute-testcases` (single-pass model — no Round 2).
