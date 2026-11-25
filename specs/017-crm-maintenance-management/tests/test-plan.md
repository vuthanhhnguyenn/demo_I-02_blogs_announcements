# Test Plan — CRM Maintenance Management

**Spec**: [`specs/017-crm-maintenance-management/spec.md`](../spec.md)
**PO Spec ID**: `Y-10` — CRMメンテナンス管理 (CRM Maintenance Management)
**Requirement doc**: `.cache/fitness-spec/crm/requirements/Y-10.md`
**Created**: 2026-07-28
**Consumed by**: `gen-testcases` (reads this to know WHAT to author, per unit) → `execute-testcases` (reads this for run order + execution notes)

---

## 1. Scope

**In scope** — the three screens of this feature, each driven by one UI prototype file:

- CRM Maintenance **List** (`crm-maintenance-list.tsx`) — search/filter/sort/pagination, computed status, notify column, row-level edit/delete actions.
- CRM Maintenance **Detail** (`crm-maintenance-detail.tsx`) — read-only record view, delete dialog, advance-notification card + send/re-send confirmation.
- CRM Maintenance **Form** (`maintenance-form.tsx`, `mode="create"` / `mode="edit"`) — registration + edit, including the staff-search modal (FR-003/007-009) and the save-confirmation dialog (FR-006), both of which live only inside this screen.

**Out of scope** (navigation targets or separate specs — do not expand into these):

- **Y-01 Staff/permission master** (staff list/search screen) — the Form's staff-search dialog only _consumes_ this master as a data source; the master screen itself is a separate spec.
- **Y-06 App Maintenance Management** (`app-maintenance-*`) — explicitly independent per spec Assumptions and Y-10.md's 棲み分け table; mobile-app-only, no cross-effect.
- **FR-008 (Y-10) / maintenance-history view** — explicitly deferred per spec Assumptions ("not represented in the UI prototype ... out of scope for this spec's initial implementation"). Status-filter-by-完了 in the List (in scope, FR-010) is the only ad-hoc substitute.
- **TAS-side access enforcement** during the maintenance window (actually blocking non-allowed logins) — infra/platform-side per spec Assumptions; this feature only manages the configuration data, not the enforcement mechanism.
- **B-01 Entry/Exit management** — noted in Y-10.md as a downstream-affected system, not a screen of this feature.

---

## 2. Unit table

| #   | Unit                 | Screen(s)                                                                             | Route                                                                                                                                                                                      | TC doc filename                                            |
| --- | -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1   | List                 | `crm-maintenance-list.tsx`                                                            | Mockup uses internal `navigate("crm-maintenance-list")` key, not a literal URL — **confirm the real path at execution time** (black-box: observe the running app, don't read `src/app/**`) | `TC -【Fitness CRM】- [Y-10-A][CRM Maintenance List].md`   |
| 2   | Detail               | `crm-maintenance-detail.tsx`                                                          | `navigate("crm-maintenance-detail")` key — confirm real path (e.g. likely `/.../crm-maintenance/:id`) at execution                                                                         | `TC -【Fitness CRM】- [Y-10-B][CRM Maintenance Detail].md` |
| 3   | Form (Create + Edit) | `maintenance-form.tsx` (`mode=create` / `mode=edit`) + staff-search modal (in-screen) | `navigate("maintenance-form")` (create) / `navigate("maintenance-form", "edit")` — confirm real paths at execution                                                                         | `TC -【Fitness CRM】- [Y-10-C][CRM Maintenance Form].md`   |

All three files live under `specs/017-crm-maintenance-management/tests/cases/`.

Modals that exist only inside a parent screen (delete-confirm on List/Detail, notify-confirm on Detail, staff-search + save-confirm on Form) are **not** separate units — folded into their parent screen's unit per the unit rule.

---

## 3. Sources per unit

| Unit       | Spec sections                                                                                                                                                                                                                  | UI mockup file               | FRs covered                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| A — List   | User Story 2 (scenarios 1–3, 6); Edge Cases: "no records at all", "Headquarter direct-link"; FR-010, FR-011, FR-012, FR-020, FR-021, FR-022                                                                                    | `crm-maintenance-list.tsx`   | FR-010, FR-011\*, FR-012, FR-020\*, FR-021, FR-022, FR-027\* (list-side refetch)                          |
| B — Detail | User Story 2 (scenarios 4, 5); User Story 3 (scenarios 4–6, from the detail-screen delete action); Edge Cases: 済-record re-notify, Headquarter notify inactive, 完了 shows "—"; FR-013, FR-014, FR-018, FR-019, FR-023–FR-027 | `crm-maintenance-detail.tsx` | FR-011\*, FR-013, FR-014, FR-018, FR-019\*, FR-020\* (direct-URL), FR-023, FR-024, FR-025, FR-026, FR-027 |
| C — Form   | User Story 1 (all 6 scenarios); User Story 3 (scenarios 1–3); Edge Cases: overlap-touching-boundary, all-allowed-users-removed, status-transition-at-action-time; FR-001–FR-009, FR-015, FR-016, FR-017                        | `maintenance-form.tsx`       | FR-001–FR-009, FR-012\* (direct-URL), FR-015, FR-016, FR-017, FR-020\* (direct-URL)                       |

\* = the FR's primary home is elsewhere; this unit only re-verifies a slice of it (e.g. direct-URL access denial, or a refetch reflection). See the traceability map (§4) for the primary owner.

Do not expand a unit's reading beyond its row above — e.g. Unit A does not need to re-read `maintenance-form.tsx`.

---

## 4. Coverage focus per unit

These are **added to**, not a replacement for, `gen-testcases`' full coverage walk (main flow, fields/GUI, validation, permissions, states, list mechanics, layout robustness, URL state, concurrency, time/computed state, i18n, escaping, responsive, traceability).

**Unit A — List**

- **Time-boundary status computation**: 予定 / メンテナンス中 / 完了 must be exactly right at the start/end boundary instants, not just mid-range (FR-011, SC-002).
- **Role × scope gating**: System/Headquarter can view; Manager/Staff/Trainer/Observer get access-denied (FR-020, SC-004) — verify all 4 denied roles, including direct-URL access, in one batched pass since they share the exact same expected outcome.
- **Notify column visibility is environment-dependent**: the mockup only renders the 通知 column when `currentPhase === "2"` — a Phase-2-only preview gate (the FR-022 column has no backing field in the real list API yet). This branch's git history already contains a "hide column 通知" fix, so **confirm at execution whether the running app currently shows or hides this column** before writing List-side notify cases as pass/fail; if hidden, mark those specific cases `Block` (feature toggled off in this phase), not `NG`. The Detail-screen notify feature (Unit B) is unaffected by this gate.
- **Row-level action gating**: the ⋯ menu's 編集/削除 are System-only; the in-progress row's delete entry is a disabled state with an inline reason ("メンテナンス実施中のため"), not just an error toast — assert the disabled _state_, not just that a click does nothing.

**Unit B — Detail**

- **Role-differentiated controls**: System sees active 編集/削除/notify-send; Headquarter sees the same data with **no** edit/delete and an inactive notify-send control (FR-014, FR-024) — a decision table of (role) × (control) is more efficient here than one row per role per control.
- **Notification state model — spec supersedes the mockup**: the mockup's `MAINTENANCE.notification` object still models `{kind: "auto"|"manual", sentAt}` + `notifyTargetCount` display. The spec's Clarifications (2026-07-20, final bullet) **simplified this to a single `notified` boolean** with no kind/timestamp/recipient-count shown, and reversed the "no re-send" point so the send button stays visible (relabeled "通知を再送信") after 済. Write Unit B's cases to the **spec's simplified model** (boolean only, always-visible send/re-send button, popup preview of title/period/message) and flag the mockup's richer display as a resolved conflict in Notes — do not write cases asserting on kind/sentAt/notifyTargetCount as if they were still current.
- **完了 records**: notify send must be unavailable once status is 完了 (the mockup shows a disabled reason button here even though the spec's clarifications text doesn't explicitly re-state this exception — flag as a confirm-with-PO note, since FR-024's "any number of times" doesn't explicitly exclude 完了; the mockup does).
- **Delete gating mirrors List**: 削除 disabled + explanatory item during メンテナンス中 (FR-019), confirm dialog text exact-match otherwise (FR-018).

**Unit C — Form**

- **Full FR-001–FR-005 validation matrix** as a decision table: required-field × format × overlap, including the **touching-boundary** case explicitly called out in Edge Cases (one period ending exactly when another starts must NOT be flagged as overlapping) — boundary-value analysis, not just one overlap example.
- **Start-date lock is edit+in-progress only**: creation is never locked; editing a 予定/完了 record is never locked; only editing a メンテナンス中 record locks the field (FR-016) — a 2×2 combination (mode × status) rather than a single case.
- **Allowed-user add still works mid-maintenance** (FR-017) — independent of the start-date lock; test both together on the same in-progress record to prove they're independently gated, not coupled.
- **Staff-search dialog**: partial-match on ID and name, exact-match on role, zero-result message (FR-009), and the already-added-user affordance (checkbox disabled + "追加済み" label, cannot re-add) — this is a small but easy-to-under-cover modal.
- **Confirmation-step fidelity** (FR-006): the summary dialog's title/period/allowed-user-count must reflect the actual entered values, not placeholders — catches a class of bug where the confirm step silently shows stale state.

---

## 5. Traceability map

Every FR in `spec.md` (FR-001–FR-027) traced to its primary unit. `*` = also touched secondarily in another unit (see §3 footnote).

| FR     | Requirement                                                | Primary unit                                              |
| ------ | ---------------------------------------------------------- | --------------------------------------------------------- |
| FR-001 | Register record (required fields)                          | C                                                         |
| FR-002 | Required-field validation messages                         | C                                                         |
| FR-003 | Start/end format validation                                | C                                                         |
| FR-004 | End > start validation                                     | C                                                         |
| FR-005 | Overlap rejection                                          | C                                                         |
| FR-006 | Confirmation step before save                              | C                                                         |
| FR-007 | Staff search (ID/name/role)                                | C                                                         |
| FR-008 | Add multiple / remove individual allowed user              | C                                                         |
| FR-009 | Zero-result message + duplicate-add prevention             | C                                                         |
| FR-010 | List display + search/filter/sort/pagination               | A                                                         |
| FR-011 | Computed status (time-boundary)                            | A (also asserted at B's status badge, C's lock condition) |
| FR-012 | New-registration restricted to System                      | A (button) + C (direct-URL block)                         |
| FR-013 | Any list-viewer role can open detail                       | B                                                         |
| FR-014 | Edit/delete controls: System only, Headquarter none        | B                                                         |
| FR-015 | System can edit all fields incl. allowed users             | C                                                         |
| FR-016 | Start-date lock during メンテナンス中 (edit)               | C                                                         |
| FR-017 | Allowed users addable during メンテナンス中                | C                                                         |
| FR-018 | Delete confirmation dialog                                 | B                                                         |
| FR-019 | Delete blocked during メンテナンス中                       | B (also the row-level disabled state in A)                |
| FR-020 | Feature-wide role restriction (System/Headquarter only)    | A (entry gate) + B, C (direct-URL denial)                 |
| FR-021 | Empty-state vs filtered-empty state                        | A                                                         |
| FR-022 | List notify column (済/未/—)                               | A                                                         |
| FR-023 | Detail notify card + always-visible send button            | B                                                         |
| FR-024 | System-only send/re-send, inactive for Headquarter         | B                                                         |
| FR-025 | Send confirmation popup + success message                  | B                                                         |
| FR-026 | Notify targets all CRM users, fake send                    | B                                                         |
| FR-027 | New record starts 未; confirm sets 済; refetch reflects it | B (origin) + A (list reflects after refetch)              |

**Result**: all 27 FRs land in ≥1 unit. No orphaned requirement.

---

## 6. Execution notes (for execute-testcases)

- **Roles/credentials**: use the standard QA sheet in `execute-testcases/SKILL.md`.
  - `system@example.com` — System (full manage: create/edit/delete/notify).
  - `admin@example.com` — Headquarter (view-only: list + detail, no edit/delete/notify-send).
  - `manager@example.com`, `staff@example.com`, `observer@example.com`, `trainer@example.com` — all four must be **denied** (FR-020/SC-004); batch these as one pass per screen since the expected outcome (access-denied, no data) is identical across all four.
- **BE-mocked caveats (→ Block, not NG)**:
  - This feature's `notified` boolean, the list's 通知 column, and re-send idempotency are a **mock-ahead-of-backend extension** (spec Assumptions) — the real API only exposes a fire-and-forget send (202, no persisted status). Treat the FE mock's behavior as the current source of truth (spec says so explicitly) — don't Block these just for being mock-only.
  - The list's 通知 column is additionally gated by the prototype's `currentPhase === "2"` flag. **Confirm first** whether the running app currently renders this column (this branch already has a "hide column 通知" commit in its history — it may currently be hidden by design, not by bug). If hidden: mark the FR-022 list-column cases `Block` — "feature hidden in current phase", and note it's expected, not a defect.
  - Status/overlap-boundary test data is time-relative in the mockup (seeded records computed from `NOW`). The actual mock-db seed may differ — **read the real current status of each seeded record from the running list** before asserting boundary cases; don't assume the mockup's exact offsets hold in the real seed.
- **Seed-reset points**: after executing FR-018/FR-005 delete or FR-005 overlap-creation cases (Unit C), restart the dev server (kill port 3000 + `next-server`/`concurrently` processes, per the harness's "Handle state you mutate" step) before running Unit A's pagination/total-count-sensitive cases, so counts aren't polluted by mutations from a prior unit.
- **Viewport**: tablet-and-up only (default 1400×900). No mobile column.

---

## 7. Suggested order

1. **Unit A (List) first** — establishes the feature-wide role gate in one login pass per role (reused by B and C), and surfaces the _real_ current seed dataset + each record's live computed status, which B and C's data-dependent cases (e.g. "which record is currently メンテナンス中") need to reference accurately.
2. **Unit B (Detail) second** — mostly read-only; its only mutation is the `notified` boolean flip (low blast radius, doesn't disturb List's counts or Form's overlap-test data).
3. **Unit C (Form) last** — covers full create/edit/delete, the most state-mutating unit (new records change List's total count; deletes and overlap-test creations change the dataset A/B were run against). Running it last means A and B's results reflect the original seed, not a dataset already perturbed by C.

---

## 8. Definition of done

- [ ] All 3 TC docs generated (`gen-testcases`, one invocation per unit).
- [ ] Every FR-001–FR-027 traced to ≥1 case in its unit's doc (cross-check against §5).
- [ ] Any gap found in `tests/checklists/common-*-checklist.md` fixed at the shared-checklist level first, then reflected in the unit's cases (checklist-first rule).
- [ ] Each of the 3 TC docs executed exactly once (`execute-testcases`), in the order above, within one continuous session (shared login/server setup) — `/compact` between units rather than ending the session.
- [ ] Execution-summary tables (by status, by priority) filled and internally consistent in all 3 docs.
