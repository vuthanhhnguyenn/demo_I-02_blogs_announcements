# Test Plan — D-04 Instructor Management (List / Detail / Form)

**PO Spec**: `D-04` — 指導者管理 (Instructor Management)
**Spec link**: `specs/014-instructor-management/spec.md` (single spec covering the full D-04 Must + Should set)
**Created**: 2026-07-21
**Consumed by**: `gen-testcases` (per unit below) → `execute-testcases` (per generated TC doc)

> **Plan scope note**: unlike D-01/D-02/D-03, D-04 is authored as a single spec
> file, but it still describes **three distinct screens** in one document
> (confirmed against the mockup: `lesson-instructor.tsx` exports separate
> `InstructorListView`, `InstructorDetailView`, and `InstructorFormView`
> components, switched by `showDetail` / `showForm` props on the top-level
> `LessonInstructor`). Per the one-screen-per-unit rule, this plan splits the
> single spec into three units rather than generating one oversized TC doc.

---

## 1. Scope

**In scope (3 units, one per screen):**

- D04-01 — Instructor List (`lesson-instructor.tsx` → `InstructorListView`)
- D04-02 — Instructor Detail (`lesson-instructor.tsx` → `InstructorDetailView`), including status toggle, delete dialog, and change-history tab
- D04-03 — Instructor Registration/Edit Form (`lesson-instructor.tsx` → `InstructorFormView`), create + edit combined

**Out of scope (navigation targets / separate specs / explicitly excluded, not tested here):**

- D-01 lesson scheduling — Assigned Lessons and Upcoming Schedule entries on D04-02 link toward lesson/schedule data owned by D-01; only the navigation/display on D04-02 is tested here, not D-01 itself.
- D-02 lesson content — the "Assigned Lessons" link target belongs to D-02's lesson detail; not tested here.
- Y-01 staff/permission logic — the CRM Account Link (D04-03) only consumes a staff lookup; Y-01's own CRUD/permission behavior is out of scope.
- Standalone/independent rating card, review-count, or star-distribution breakdown — explicitly deferred per the spec's Out-of-Scope section pending the rating-data-source decision (D-Q09). Only the display-only average-rating figure inside the performance summary (D04-02) is in scope.
- Assigning/displaying an instructor's home store/brand directly on the instructor master — by design these are derived from D-01 schedule assignments, not stored or shown here.

---

## 2. Unit table

| #   | Unit   | Screen(s)                                                                                                                                                              | Route (mockup file)                              | TC doc filename                                                       |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | D04-01 | Instructor List (Studio Instructor / Personal Trainer tabs, search, filters, role-scoped rows)                                                                         | `lesson-instructor.tsx` (`InstructorListView`)   | `TC -【Fitness CRM】- [D04-01][Instructor List].md`                   |
| 2   | D04-02 | Instructor Detail (profile, buffer settings, CRM link display, performance summary, assigned lessons, upcoming schedule, status toggle, delete dialog, change history) | `lesson-instructor.tsx` (`InstructorDetailView`) | `TC -【Fitness CRM】- [D04-02][Instructor Detail].md`                 |
| 3   | D04-03 | Instructor Registration/Edit Form (create + edit combined)                                                                                                             | `lesson-instructor.tsx` (`InstructorFormView`)   | `TC -【Fitness CRM】- [D04-03][Instructor Registration Edit Form].md` |

**Unit-split rationale**: the spec bundles 6 user stories into one document, but they cluster cleanly onto 3 screens confirmed in the mockup. Status toggle, delete dialog, and change history exist only within the detail screen, so US5 and US6 (which read as standalone stories in the spec) are folded into D04-02 rather than becoming their own units. Create (US2) and Edit (US4) share one `InstructorFormView` component (`mode` prop, same pattern as `LessonForm` and `StudioFormView` elsewhere in this CRM), so they stay one unit (D04-03).

---

## 3. Sources per unit

| Unit   | Spec sections                                                                                                                                                                                                                                         | UI mockup file                                                        | FRs covered (primary)                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| D04-01 | `014-instructor-management/spec.md` — User Story 1, Edge Cases (search/filter zero-result, no-registration-permission), FR-001–FR-005                                                                                                                 | `.cache/fitness-crm-ui/src/pages/lesson-instructor.tsx` (list view)   | FR-001, FR-002, FR-003, FR-004, FR-005 (list half)                                                         |
| D04-02 | `014-instructor-management/spec.md` — User Stories 3, 5, 6, Edge Cases (self-vs-other Trainer, zero upcoming schedules, delete-blocked, sparse profile), FR-005 (detail half), FR-010–FR-013, FR-016, FR-017, FR-018 (detail actions), FR-019, FR-020 | `.cache/fitness-crm-ui/src/pages/lesson-instructor.tsx` (detail view) | FR-005 (detail half), FR-010, FR-011, FR-012, FR-013, FR-016, FR-017, FR-018 (detail half), FR-019, FR-020 |
| D04-03 | `014-instructor-management/spec.md` — User Stories 2, 4, Edge Cases (missing required field, direct-access blocked), FR-006–FR-009, FR-014, FR-015, FR-018 (form-entry gating)                                                                        | `.cache/fitness-crm-ui/src/pages/lesson-instructor.tsx` (form view)   | FR-006, FR-007 (create/edit half), FR-008 (create/edit half), FR-009, FR-014, FR-015, FR-018 (form half)   |

Also read where referenced: `.cache/fitness-spec/crm/requirements/D-04.md`.

---

## 4. Coverage focus per unit

Added to — not a replacement for — `gen-testcases`' full coverage-dimension walk.

**D04-01 — Instructor List**

- Two-tab record-count badges (Studio Instructor / Personal Trainer) — verify each tab's badge reflects only that tab's own filtered/scoped row count, independent of the other tab.
- Search across 4 fields simultaneously (name, nickname, romaji name, ID) — partial match on any one field should surface the row; combine with an active filter to confirm AND semantics.
- Role/brand/status filters + active-filter-count badge + "clear all" (must reset filters **and** the search field together, per FR-004 wording).
- Empty/filtered state with a "clear conditions" action when search+filter combination yields zero rows.
- 6-role data-scope decision table per FR-005: System/Headquarters (all instructors), Manager (managed-store instructors), Staff/Observer (own-store instructors), **Trainer (own profile only — a single-row scope)**. The Trainer case is qualitatively different from every other role (list of one) — write it as its own explicit case, not folded into a generic "restricted" bucket.
- "New Instructor Registration" button gating per FR-018: Headquarters/Manager/Staff enabled; Trainer/Observer disabled with an explanatory tooltip (per Edge Cases: "the action must remain disabled/blocked" even via direct access attempts).

**D04-02 — Instructor Detail**

- All sections render without missing-section layout breakage regardless of how sparse the profile is (SC-003) — explicit empty-state cases for missing nickname, missing romaji name, missing profile text/instructing history, and missing photo (Edge Cases item).
- Performance summary rendered as **one combined card** with 4 metrics (weekly lesson count, average reservation rate, average rating, monthly participant count) — verify layout intent explicitly (FR-011 states "not as separate independent cards"); a regression here (accidentally splitting into multiple cards) would be easy to miss without a dedicated case.
- Assigned Lessons compact list (name, weekday(s), time, reservation rate) + link-through to lesson detail; zero-assigned-lessons empty state.
- Upcoming Schedule: first 3 entries inline + "expand" opens a side panel with a recurring-setting summary plus the individual schedule list; zero-upcoming-schedules empty state (Edge Cases item — must show an empty count, not an error).
- **Trainer self-view exception vs Trainer-viewing-another** — this is the highest-value permission case in the whole D-04 cluster: a Trainer viewing their **own** detail page sees only Edit available (no Delete); the same Trainer viewing **another** instructor's detail page must fall back to the standard permission matrix (no self-exception leak) per the explicit Edge Case callout. Write both as separate, explicitly-labeled cases — do not assume one implies the other.
- Deactivate/Activate toggle (Headquarters/Manager only): deactivating shows a confirmation toast, removes the instructor from new-schedule-registration selection, and leaves existing schedules unaffected; re-activating reverts status to Active.
- Delete guardrail: deletion of an instructor with ≥1 assigned schedule is **blocked in every case**, not merely warned (per Edge Cases: "deletion must be blocked every time") — showing the assigned-schedule count and a disabled confirm; deletion of an instructor with 0 assigned schedules permanently removes the profile. Staff/Trainer/Observer must not see the delete action at all.
- Change-history tab: field-level diff rows (timestamp, operator, field, before, after) vs a distinct "Newly Created" entry for the initial creation event (no before/after shown for that row).
- Edit/Delete action-button gating decision table across all 6 roles, explicitly including the Trainer-self vs Trainer-other split above.

**D04-03 — Instructor Registration/Edit Form**

- Required-field validation: name and ≥1 role classification — each missing field shows "{field name} is required", and the confirmation dialog does not open while invalid.
- Role classification multi-select (Trainer / Instructor / Body-Care Therapist) — at least one required; multiple selectable.
- Buffer-settings selects: minimum lead time (9 options: 0/1/2/3/6/12/24/48/72 hours) × pre-buffer (5 options: 0/15/30/45/60 min) × post-buffer (5 options: 0/15/30/45/60 min) — use equivalence partitioning (min/mid/max of each axis) rather than the full 225-combination cross-product.
- CRM Account Link: optional searchable staff lookup, selected staff shown as a removable badge, link is not required for submission.
- Confirmation dialog summarizes name, nickname, role classifications, status, and linked CRM account (when present) — verify the CRM-link line is absent, not blank, when no link is set.
- **Trainer role-scoped field editability** (FR-015): a Trainer editing their **own** profile sees name and role classification as read-only ("cannot be self-edited"), while nickname/romaji/profile-text/photo/instructing-history/buffer-settings remain editable; Headquarters/Manager/Staff editing any profile see every field editable. Cross-check against FR-018's edit-permission scope ("edit: Headquarters/Manager/Staff/Trainer-self") — a Trainer must not be able to reach the edit form for anyone **other than** themselves at all; that access-denial case belongs here (entry gating), while the field-lock-once-inside case is the FR-015 case above — write both, they test different failure points.
- Create vs edit mode behavior: pre-fill accuracy in edit mode; **the spec does not explicitly state different confirmation-dialog wording for create vs edit** (unlike the D-02 lesson-content-form's differing dialog titles) — verify the actual mockup copy for both modes and record it as an open question in the TC doc if the two truly share identical dialog text, rather than assuming a difference that isn't in the spec.
- Direct-access attempt by an unauthorized role (Trainer/Observer for create; a non-self Trainer for edit) — per Edge Cases, the action must remain blocked even via a direct route, not just hidden at the button level.

---

## 5. Traceability map

| FR                                      | Unit(s)                                                                                                     | Note                                                                                                                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 (List Rendering & Tabs)          | D04-01                                                                                                      |                                                                                                                                                                                  |
| FR-002 (Search)                         | D04-01                                                                                                      |                                                                                                                                                                                  |
| FR-003 (Filters)                        | D04-01                                                                                                      |                                                                                                                                                                                  |
| FR-004 (Empty/Filtered States)          | D04-01                                                                                                      |                                                                                                                                                                                  |
| FR-005 (Data Scope by Role)             | D04-01 + D04-02                                                                                             | Spec text explicitly says "restrict **list and detail** visibility" — split across both units; each unit's TC doc tests its own screen's data-scope enforcement.                 |
| FR-006 (Create Instructor)              | D04-03                                                                                                      |                                                                                                                                                                                  |
| FR-007 (Buffer Settings)                | D04-03 (edit/create) + D04-02 (display)                                                                     | Buffer values are set on the form and displayed read-only on the detail page — D04-03 owns the editing behavior, D04-02 owns confirming the values display correctly after save. |
| FR-008 (CRM Account Link)               | D04-03 (edit/create) + D04-02 (display)                                                                     | Same split pattern as FR-007.                                                                                                                                                    |
| FR-009 (Registration/Edit Confirmation) | D04-03                                                                                                      |                                                                                                                                                                                  |
| FR-010 (Detail View)                    | D04-02                                                                                                      |                                                                                                                                                                                  |
| FR-011 (Performance Summary)            | D04-02                                                                                                      |                                                                                                                                                                                  |
| FR-012 (Assigned Lessons)               | D04-02                                                                                                      |                                                                                                                                                                                  |
| FR-013 (Upcoming Schedule)              | D04-02                                                                                                      |                                                                                                                                                                                  |
| FR-014 (Edit Instructor)                | D04-03                                                                                                      |                                                                                                                                                                                  |
| FR-015 (Role-Scoped Field Editability)  | D04-03                                                                                                      |                                                                                                                                                                                  |
| FR-016 (Deactivate/Activate)            | D04-02                                                                                                      |                                                                                                                                                                                  |
| FR-017 (Delete Guardrail)               | D04-02                                                                                                      |                                                                                                                                                                                  |
| FR-018 (Role-Gated Actions)             | D04-01 (registration button) + D04-02 (edit/delete buttons) + D04-03 (form-entry gating incl. Trainer-self) | Single requirement, three enforcement points — each unit tests only the gating visible/reachable from its own screen.                                                            |
| FR-019 (Change History)                 | D04-02                                                                                                      |                                                                                                                                                                                  |
| FR-020 (Average Rating Display)         | D04-02                                                                                                      | Part of the FR-011 performance summary; listed separately because the spec calls out its display-only, pending-data-source status.                                               |

**Confirmed**: all 20 FRs land in ≥1 unit. FR-005, FR-007, FR-008, and FR-018 intentionally land in more than one unit because the underlying requirement spans multiple screens — this is documented above so `gen-testcases` doesn't duplicate full coverage in both places, only the slice relevant to each screen.

---

## 6. Execution notes (for `execute-testcases`)

- **Roles**: exercise the full D-04 permission matrix — System, Headquarters, Manager, Staff, Observer, and **Trainer in two distinct identities** (self and other) for every gated action. The Trainer-self-vs-other distinction (D04-02, D04-03) requires either two separate Trainer test accounts or one Trainer account plus the ability to view/attempt-edit another instructor's record while logged in as that Trainer — confirm which is available in the test environment before execution and note the limitation if only one Trainer identity exists in seed data.
- **BE-mocked caveats** (log outcome as `Block`, not `NG`): CRM Account Link search queries a staff record (Y-01) — mark Block if that seed/mock is unavailable; average rating's underlying data source is explicitly unresolved (D-Q09) — test only that the figure renders in the performance summary, not that its value is "correct" against some external calculation.
- **Seed-reset points**: Deactivate/Activate and Delete on D04-02 mutate shared instructor state that D04-01's list and D04-03's edit-mode pre-fill both depend on — use disposable/dedicated test instructors for the deactivate/delete cases so list and edit-mode assertions elsewhere stay deterministic.
- **Viewport**: tablet-and-up only. Mobile/phone width is out of scope per the shared template.

---

## 7. Suggested order

1. **D04-01 — Instructor List** first: P1 entry point for the whole D-04 cluster, uses seeded instructor data with no dependency on the other two units.
2. **D04-03 — Instructor Registration/Edit Form** second: registering a test instructor here establishes a known-good record (and a known-good Trainer-owned record, if a Trainer test identity is available) for D04-02's detail assertions to reference.
3. **D04-02 — Instructor Detail** last: it is the deepest screen (permission-matrix edge cases, deactivate/delete, change history) and depends on an instructor record existing from D04-03 — running it last also means its mutating actions (deactivate, delete) don't disturb data the earlier two units still need.

---

## 8. Definition of done

- [ ] TC doc created for D04-01, D04-02, and D04-03 under `specs/014-instructor-management/tests/cases/`.
- [ ] Every FR-id in §5 traced to its unit's TC doc, including the multi-unit FRs (FR-005, FR-007, FR-008, FR-018) covered once per relevant screen without duplicating full coverage.
- [ ] Any gap found in `tests/checklists/common-function-checklist.md` or `common-gui-validate-checklist.md` while authoring cases is fixed in the shared checklist first.
- [ ] Each of the three TC docs executed once via `execute-testcases` (single-pass model — no Round 2).
