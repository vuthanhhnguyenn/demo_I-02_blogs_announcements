# Test Plan: Staff & Permission Management (020)

**Spec**: [../spec.md](../spec.md)
**PO Spec**: `Y-01` — スタッフ・権限管理 (`crm/requirements/Y-01.md`) + `Y-01-01` — ユーザー作成 (sub-section)
**Created**: 2026-07-28
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

---

## Scope

**In scope** (screens covered by units below, all sourced from the reviewed UI prototype):

- スタッフ一覧 (Staff List) — `staff-list.tsx` → app route `/staffs`
- スタッフ新規登録 (Staff Registration, bulk) — `staff-form.tsx` (`mode="create"`) → app route `/staffs/create`
- スタッフ編集 (Staff Edit) — `staff-form.tsx` (`mode="edit"`) → app route `/staffs/[id]/edit`
- スタッフ詳細 (Staff Detail: basic info + permission history + lifecycle actions) — `staff-detail.tsx` → app route `/staffs/[id]`

**Out of scope** (navigation targets / separate specs — not covered by this plan):

- **職位マスター管理** (position-master CRUD: add/edit/delete position names and their permission flags) — Y-01 FR-006, a separate administrative screen. Staff Detail only links out to "この職位の権限を確認" (`position-list` route); that link's _target_ screen is out of scope, only its presence/navigation is a Detail-unit check.
- **職位別権限プレビュー** (per-position permission preview) — Y-01 FR-009, beyond the reference link noted above.
- **CSV出力権限の独立カテゴリー管理** — Y-01 FR-S001, an independent permission category managed elsewhere.
- **FC企業管理 (Y-03)** and **店舗管理 (Y-02)** master data screens — this feature only _consumes_ their store/FC-company option lists, it does not create or edit them.
- **Y-13 招待フロー** internals (token issuance/expiry mechanics) — only the user-facing triggers (create → auto-invite, resend invitation, issue magic link) are in scope; the email/token delivery system itself is not.

---

## Unit Table

| #   | Unit               | Screen(s)                              | Route               | TC Doc Filename                                       |
| --- | ------------------ | -------------------------------------- | ------------------- | ----------------------------------------------------- |
| 1   | Staff List         | スタッフ一覧                           | `/staffs`           | `TC -【Fitness CRM】- [Y-01][スタッフ一覧].md`        |
| 2   | Staff Registration | スタッフ新規登録（一括）               | `/staffs/create`    | `TC -【Fitness CRM】- [Y-01-01][スタッフ新規登録].md` |
| 3   | Staff Edit         | スタッフ編集                           | `/staffs/[id]/edit` | `TC -【Fitness CRM】- [Y-01][スタッフ編集].md`        |
| 4   | Staff Detail       | スタッフ詳細（基本情報／変更履歴タブ） | `/staffs/[id]`      | `TC -【Fitness CRM】- [Y-01][スタッフ詳細].md`        |

All four docs live under `specs/020-staff-permission-management/tests/cases/`.

**Split rationale**: The unit rule calls for one screen per unit, clustering only when screens are simple or tightly related. The reviewed mockup renders Create and Edit from a single `StaffForm` component (`mode` prop), which could argue for clustering — but the two modes differ substantially in acceptance-scenario content (US2's batch/duplicate/paste-distribution logic vs. US3's role-change confirmation and manager-scope gating) and the real app already implements them as two separate routes/pages (`/staffs/create` vs `/staffs/[id]/edit`). Splitting keeps each TC doc's coverage focus sharp and matches the actual navigable screens a tester opens. List and Detail are naturally distinct screens (index vs. record view) and are not clustered with anything.

---

## Sources per Unit

| Unit               | Spec sections                                                                                                         | UI mockup file                         | FRs covered                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Staff List         | User Story 1 (Acceptance Scenarios 1–8); Edge Cases: single-store header context, invited-status filtering            | `staff-list.tsx`                       | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006                                                           |
| Staff Registration | User Story 2 (Acceptance Scenarios 1–6); Edge Case: last-row-cannot-be-removed                                        | `staff-form.tsx` (create mode section) | FR-007, FR-008, FR-009, FR-010, FR-011, FR-016 (create-time), FR-017 (create-time), FR-022 (create-time) |
| Staff Edit         | User Story 3 (Acceptance Scenarios 1–7); Edge Cases: trainer/observer access-denied, affiliation pattern re-switching | `staff-form.tsx` (edit mode section)   | FR-012 (edit portion), FR-013, FR-014, FR-015, FR-016, FR-017, FR-022                                    |
| Staff Detail       | User Story 4 (all); User Story 5 (all); Edge Case: trainer/observer access-denied on detail                           | `staff-detail.tsx`                     | FR-012 (view portion), FR-013 (button gating), FR-018, FR-019, FR-020, FR-021                            |

**Cross-references**: Requirement doc `crm/requirements/Y-01.md` supplies the 6-role definitions, the 3-layer permission model (role → position → person), and the permission matrix (権限マトリクス) — all four units should validate against that matrix, not just the spec's FR wording, when checking role-gated buttons/menu items.

---

## Coverage Focus per Unit

These are **added to**, not a replacement for, `gen-testcases`' full coverage walk (field-level validation, empty/loading/error states, etc. per the common checklists).

- **Staff List**: role×scope visibility matrix (HQ=all, Manager=managed-stores-only, Staff=self-only, Trainer/Observer=no access per Y-01 permission matrix); combined multi-filter AND logic + active-filter-count accuracy; the two distinct empty states (true-empty vs. filtered-empty) and their differing "clear filters" affordance; invited-row name masking + "not yet logged in" + invitation-date rendering; single-store header context hiding the store column/filter; sort toggle behavior on sortable columns; row-menu quick actions (resend invite, deactivate, delete) role-gating and confirmation-dialog wiring.
- **Staff Registration**: bulk-row required-field validation (blank last name/first name/email, missing shared role) with correct field highlighting and scroll-to-first-error; duplicate detection split into two distinct triggers — against existing accounts vs. within the same batch — both surfacing before submission; newline-paste-to-multi-row distribution (including partial-fill first row); last-remaining-row cannot be removed; submit button's dynamic "N名を登録する" label and disabled-at-zero-rows state; unsaved-changes discard prompt on navigate-away.
- **Staff Edit**: role-change confirmation dialog content (old role → new role, next-login-effective notice) appearing _only_ when role actually changes, never for other-field-only edits; manager edit-access gating (allowed only for Staff-role accounts inside managed stores, blocked with explanation otherwise); affiliation pattern exclusivity (switching store↔FC clears the other pattern's in-progress selection, repeated switching stays consistent); FC-company selection revealing its full managed-store list; unsaved-changes discard prompt.
- **Staff Detail**: deactivate vs. delete distinction (deactivate = reversible/still-loginable-history-intact vs. delete = hidden-from-active-views/soft-deleted) each behind its own explicit confirmation; permission-history tab ordering (most-recent-first) and per-entry content (date/time, operator, description); magic-link issuance for another account (HQ-only) vs. for one's own account (HQ/Manager/Staff — whichever role can reach the screen); trainer/observer access-denied for this screen entirely, including their own account (per Y-01 permission matrix — not a view-only rendering).

---

## Traceability Map

| FR     | Requirement (short)                                                        | Unit(s)                                                |
| ------ | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| FR-001 | Display staff list with core columns + relative last-login                 | Staff List                                             |
| FR-002 | Search + combinable filters with active-count indicator                    | Staff List                                             |
| FR-003 | Clear all filters in one action                                            | Staff List                                             |
| FR-004 | Role-based visibility scope (HQ/Manager/self)                              | Staff List                                             |
| FR-005 | Distinct "invited" status with masked name + invite date                   | Staff List                                             |
| FR-006 | Resend invitation email (HQ only)                                          | Staff List                                             |
| FR-007 | Batch registration (required fields + shared role/position/affiliation)    | Staff Registration                                     |
| FR-008 | Required-field validation with field-level indication                      | Staff Registration                                     |
| FR-009 | Duplicate-email detection (existing + in-batch) before creation            | Staff Registration                                     |
| FR-010 | Paste newline-separated emails → auto-distribute rows                      | Staff Registration                                     |
| FR-011 | Auto-issue initial credentials/invitation on creation                      | Staff Registration                                     |
| FR-012 | View and edit name/email/role/position/affiliation                         | Staff Detail (view) + Staff Edit (edit)                |
| FR-013 | Edit-access restriction (HQ any / Manager scoped Staff-only / others none) | Staff Detail (button gating) + Staff Edit (form-level) |
| FR-014 | Role change restricted to HQ                                               | Staff Edit                                             |
| FR-015 | Explicit confirmation before role-change save                              | Staff Edit                                             |
| FR-016 | Exactly-one affiliation pattern, clears prior on switch                    | Staff Registration + Staff Edit                        |
| FR-017 | FC-company affiliation shows full managed-store list                       | Staff Registration + Staff Edit                        |
| FR-018 | Deactivate with confirmation, records retained                             | Staff Detail (+ quick action in Staff List)            |
| FR-019 | Soft-delete with confirmation, records retained                            | Staff Detail (+ quick action in Staff List)            |
| FR-020 | One-time login link (HQ for anyone, self for own account)                  | Staff Detail                                           |
| FR-021 | Chronological permission-change history                                    | Staff Detail                                           |
| FR-022 | Unsaved-changes warning on navigate-away                                   | Staff Registration + Staff Edit                        |

Every FR-001…FR-022 lands in at least one unit. No orphaned requirements.

---

## Execution Notes (for `execute-testcases`)

- **Roles/credentials**: Use the mock-auth-switch mechanism already in the codebase (drives `getAuthMeOptions`) to simulate Headquarter, Manager, Staff, Trainer, and Observer. For Manager, seed/select `managed_store_ids` covering exactly 1–2 stores so in-scope vs. out-of-scope store checks are meaningful. Re-run each unit's role-gating cases once per relevant role rather than assuming one role's pass implies another's.
- **BE-mocked caveats**: This app has no live backend — creation, edits, deactivation, deletion, invite emails, and magic links all resolve against the local mock API/DB. Do not mark an outcome `NG` when the observed behavior is a mock-layer limitation (e.g. no real email is sent, no real token expiry) — record it as `Block` with a note, and only `NG` genuine UI/logic defects (wrong dialog copy, wrong gating, wrong list update, etc.).
- **Seed-reset points**: Reset/re-seed the mock staff table before each unit's execution pass, since Staff List, Registration, Edit, and Detail all mutate the same underlying records (deactivate/delete are one-way status flips in the mock store within a session). Re-seed again between the Deactivate and Delete cases in the Detail unit so one doesn't consume the account the other needs.
- **Viewport**: Tablet-and-up (this is a back-office CRM screen family; no mobile layout is in scope).
- **Cross-cutting check** (apply once per unit, not a separate unit): every role-gated control (edit, deactivate, delete, role-change, resend-invite, magic-link) must render as visibly _disabled with a deny tooltip_ for roles lacking permission, not silently hidden — confirm this matches the reviewed prototype's per-control treatment, since some controls are hidden and some are disabled by design.

---

## Suggested Order

1. **Staff List** — entry point for every other flow; role/scope visibility must be verified first since later units' setup (e.g., confirming a created account appears) depends on the list rendering correctly.
2. **Staff Registration** — creates the accounts that Edit and Detail units will act on; run early so downstream units have fresh, known-state records to open.
3. **Staff Edit** — depends on accounts existing (from Registration or seed data) and being findable (from List); exercises role-change and manager-scope gating.
4. **Staff Detail** — last, since its deactivate/delete cases are destructive/one-way against whatever records the earlier units produced, and its history tab is most meaningfully populated after Edit has made at least one role/position/affiliation change to inspect.

---

## Definition of Done

- [ ] All four TC documents created under `specs/020-staff-permission-management/tests/cases/`, one per unit above.
- [ ] Every FR-001…FR-022 traced to ≥1 unit (see Traceability Map — already confirmed complete).
- [ ] Any gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` during authoring are fixed first, per the checklist-first workflow, before/alongside writing the per-screen cases.
- [ ] Each of the four TC documents has been executed at least once (`execute-testcases`) with OK/NG/Block recorded per case.
