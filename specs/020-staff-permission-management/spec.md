# Feature Specification: Staff & Permission Management

**Feature Branch**: `020-staff-permission-management`
**Created**: 2026-07-28
**Status**: Draft
**PO Spec**: `Y-01` — スタッフ・権限管理 _(dx-fitness/fitness-spec @ 4c0199b, 2026-07-24 — unchanged as of the 2026-08-24 re-check)_
**Source**: UI prototype `staff-list.tsx` (dx-fitness/fitness-crm-ui @ 1cc2d6d, 2026-07-18), `staff-detail.tsx` (@ 182bd6e, 2026-07-15), `staff-form.tsx` (@ b223fef, 2026-08-13) + Requirement spec `crm/requirements/Y-01.md` + Design note `crm/design/Y-01_権限設計v2_3.md`
**Amended**: 2026-11-10 — **Manager multi-store affiliation** (Phase 1 interim from the 2026-11-02 meeting; BE `storeIds` contract per Dev Q&A 2026-11-07). See "Manager multi-store affiliation" under Requirements.
**Input**: User description: "Create spec for staff management, spec: Y-01.md, design v0: staff-list.tsx, staff-detail.tsx, staff-form.tsx"; re-verified against the current staff edit screen implementation and the same two source docs on 2026-08-24 (see Known Implementation Gaps below)

## User Scenarios _(mandatory)_

### User Story 1 - Browse and search staff accounts (Priority: P1)

A headquarters administrator or manager needs to find a specific staff account among all registered staff, to check who currently has access, spot dormant accounts, or locate someone before editing their permissions.

**Why this priority**: Without a working, correctly-scoped list, no other staff-management action (create, edit, deactivate) can be reached. It is the entry point for every other user story.

**Verification**: Log in as each role (headquarters, manager, staff, trainer, observer), open the staff management screen, and confirm the visible rows match that role's expected scope; apply search and filters and confirm the result set narrows correctly.

**Acceptance Scenarios**:

1. **Given** a headquarters user opens staff management, **When** the list loads, **Then** every staff account is shown with ID, name, role, position, affiliated store or FC company, status (active/inactive/invited), and last login shown as a relative time (e.g. "3 days ago").
2. **Given** a manager who oversees specific stores, **When** they open staff management, **Then** only staff affiliated with their managed stores appear; headquarters-wide staff and staff at other stores do not.
3. **Given** a staff account holder, **When** they open staff management, **Then** only their own account appears.
4. **Given** a trainer or observer account holder, **When** they attempt to open staff management, **Then** access is denied outright (per the Y-01 permission matrix: スタッフ一覧・参照 = ×) — not a filtered view of their own account.
5. **Given** a user types a name or email fragment into search, **When** results update, **Then** only accounts whose name or email contains that text remain.
6. **Given** a user narrows by role, position, store, and/or status filters, **When** the filters are applied, **Then** only matching rows remain and an indicator shows how many filters are active and how many results matched.
7. **Given** applied filters produce zero matches, **When** the list renders, **Then** an empty-results state appears with an option to clear all filters at once; this is visually distinct from the state shown when there are no staff at all.
8. **Given** an account has status "invited," **When** shown in the list, **Then** its name is masked as not-yet-registered and its last-login cell shows "not yet logged in" alongside the invitation date instead of a login time.

---

### User Story 2 - Register new staff accounts (Priority: P1)

A headquarters administrator needs to onboard one or more new staff members — for example when a new store opens or a hiring batch completes — granting each the correct role, position, and store/FC-company access so they can start using the CRM.

**Why this priority**: Account creation is the trigger for every downstream permission and access-control behavior; without it, the CRM has no way to onboard new staff.

**Verification**: As a headquarters user, submit the creation form with several people at once, with a duplicate email, and with missing required fields, and confirm the system responds correctly in each case.

**Acceptance Scenarios**:

1. **Given** a headquarters user fills in last name, first name, and email for three people plus a shared role, position, and store affiliation, **When** they submit, **Then** three accounts are created and each recipient's email address receives an initial password / invitation.
2. **Given** one row is left with a blank required field (last name, first name, or email) or no role is selected, **When** the user submits, **Then** submission is blocked, the offending fields are highlighted, and the view scrolls to the first error.
3. **Given** an entered email already belongs to a registered account, **When** the value is entered, **Then** a duplicate warning appears before submission.
4. **Given** two rows in the same batch share the same email, **When** the value is entered, **Then** a within-batch duplicate warning appears before submission.
5. **Given** a user pastes several newline-separated email addresses into one email field, **When** the paste completes, **Then** the system distributes them across that many new rows automatically, one email per row.
6. **Given** at least one row is filled in, **When** the user views the submit button, **Then** it indicates how many staff will be registered; submission is disabled while zero rows are filled in.
7. **Given** the role is Manager and the affiliation pattern is "store", **When** the user picks several stores, **Then** every picked store is kept, and each invited Manager is affiliated with — and manages — all of them. For any other role only one store can be picked. _(added 2026-11-10)_
8. **Given** several stores are picked for a Manager, **When** the user changes the role to a non-Manager role, **Then** the store selection is cleared and the form asks the user to pick one store again; submission is blocked until a store is picked or the pattern is switched. _(added 2026-11-10)_

---

### User Story 3 - Edit an existing staff account's details, role, and affiliation (Priority: P2)

A headquarters administrator or an authorized manager needs to update a staff member's name, contact email, role, position, or store/FC-company affiliation as responsibilities or employment details change.

**Why this priority**: Keeping staff records and access current is essential to operations, but it depends on accounts already existing (User Story 2) and being findable (User Story 1).

**Verification**: As headquarters, edit a staff account's role and confirm the change-confirmation dialog and history entry; as a manager, attempt to edit staff inside and outside managed stores and confirm access is correctly allowed or blocked.

**Acceptance Scenarios**:

1. **Given** a headquarters user opens a staff account's edit form, **When** they change the role and save, **Then** a confirmation dialog shows the current role, the new role, and a notice that the change takes effect at the staff member's next login; only after confirming is the change saved.
2. **Given** the same account is not being changed in role, **When** other fields (name, email, position, affiliation, note) are edited and saved, **Then** no role-change confirmation appears and the changes save directly.
3. **Given** a manager whose managed stores include the affiliated store of a "Staff"-role account, **When** they open that account's edit form, **Then** editing is allowed.
4. **Given** a manager whose managed stores do not include the account's affiliated store, or the account's role is not "Staff," **When** they attempt to edit, **Then** editing is blocked with an explanation of why.
5. **Given** an account currently affiliated with a single store, **When** the user switches the affiliation pattern to "FC company" (or vice versa), **Then** the previous selection is cleared and only the newly chosen pattern's selector is shown.
6. **Given** an FC company is selected as the affiliation, **When** shown, **Then** the full list of stores that company's affiliation grants access to is displayed.
7. **Given** unsaved changes exist on the form, **When** the user attempts to navigate away, **Then** a confirmation prompt requires them to explicitly discard or continue editing before leaving.
8. **Given** a headquarters user edits a Manager-role account, **When** they add or remove stores in 所属店舗 and save, **Then** the account's store set is replaced by exactly the selected stores, in selection order, and its managed stores equal that set. _(added 2026-11-10)_
9. **Given** a Manager-role account with several stores, **When** a headquarters user changes its role to a non-Manager role, **Then** the store selection is cleared and saving is blocked with 「ロールの変更により所属店舗の選択を解除しました。所属店舗を1店舗選び直してください」 until exactly one store is picked (or the pattern is switched to FC company). No store is kept automatically. _(added 2026-11-10)_
10. **Given** a manager whose stores include **any one** of a "Staff"-role account's stores, **When** they open that account's edit form, **Then** editing is allowed (scope = at least one shared store). _(added 2026-11-10)_

---

### User Story 4 - Deactivate or delete a staff account (Priority: P2)

A headquarters administrator needs to remove CRM access from a staff member who has left or changed roles, while preserving an audit trail of their prior activity.

**Why this priority**: Timely access revocation is an important access-control safeguard, but it is a less frequent action than day-to-day list browsing and account creation/editing.

**Verification**: As headquarters, deactivate one account and delete another, and confirm each requires explicit confirmation, produces the expected status/visibility change, and leaves historical records intact.

**Acceptance Scenarios**:

1. **Given** a headquarters user chooses to deactivate an active staff account, **When** they confirm the action, **Then** the account can no longer log in, its status becomes "inactive," and its historical records (including permission history) remain fully intact and visible.
2. **Given** a headquarters user chooses to delete a staff account, **When** they confirm the action, **Then** the account is hidden from active staff views while related operational records remain retained.
3. **Given** either action is initiated, **When** the confirmation dialog appears, **Then** the action does not take effect until the user explicitly confirms it.

---

### User Story 5 - Track permission history and reissue access (Priority: P3)

A headquarters administrator needs to review what permission-related changes were made to a staff account and when, and needs to be able to (re-)issue login access to a staff member who has not yet completed their first login or who has lost their access link.

**Why this priority**: These are supporting/audit and recovery capabilities that add trust and operational safety but are not required for the core account lifecycle to function.

**Verification**: Open a staff account's change-history view and confirm past changes are listed with date, operator, and description; trigger a resend of an invitation and an issuance of a login link and confirm each succeeds with a clear confirmation message.

**Acceptance Scenarios**:

1. **Given** a staff account with prior role/position/affiliation changes, **When** its change-history is viewed, **Then** each entry shows the date/time, who made the change, and what changed, ordered most-recent first.
2. **Given** a staff account with status "invited," **When** a headquarters user selects "resend invitation," **Then** a confirmation message indicates the invitation email was resent to that address.
3. **Given** any staff account, **When** a headquarters user requests a one-time CRM login link for it, **Then** a confirmation message indicates the link was sent to that account's registered email.
4. **Given** a staff member is viewing their own account, **When** they request a one-time CRM login link for themselves, **Then** the request succeeds regardless of their role.

### Edge Cases

- What happens when a manager's header context is narrowed to a single store? The store column and store filter are hidden (redundant with the already-applied scope), and the list further narrows to that one store.
- What happens when a user removes bulk-registration rows down to the last one? The last remaining row cannot be removed; at least one row must always remain on the creation form.
- How does the system handle a staff account with no note/remarks entered? The remarks section is simply omitted or shown empty; it is never a required field.
- What happens if a trainer or observer opens a staff account's detail page? Per the Y-01 permission matrix, trainer and observer have no access (×) to staff list/detail at all — including their own account — and are blocked (access-denied), not shown a view-only page.
- How does the system handle switching affiliation pattern back and forth multiple times before saving? Each switch clears the other pattern's in-progress selection so only one pattern's data is ever submitted.
- What happens when a non-Manager account already holds several stores (e.g. created through the API, which accepts `storeIds` for every role)? The edit form shows the first store in the single-store picker together with 「マネージャー以外のロールは所属店舗を1店舗のみ選択できます」 and blocks saving until one store is chosen. _(added 2026-11-10)_
- What happens when a role is changed away from Manager and then back to Manager before saving? The cleared selection is not restored; the user picks the stores again. Manager allows zero stores, so the reselect demand is lifted while Manager is selected. _(added 2026-11-10)_
- What happens when an invited account (no first login yet) is searched or filtered by status "invited"? It appears like any other row but with masked name and the invitation-pending last-login treatment.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a list of staff accounts showing staff ID, name, role, position, affiliated store or FC company, status (active/inactive/invited), and last login shown as a relative time.
- **FR-002**: System MUST let users search staff by name or email, and filter by role, position, store, and status, combinable together, with an indicator of how many filters are active and how many results match.
- **FR-003**: System MUST let a user clear all applied search/filter criteria in a single action.
- **FR-004**: System MUST restrict which staff accounts a user can see based on their role: headquarters sees all staff; a manager sees only staff affiliated with stores they manage; staff sees only their own account; trainer and observer roles have no access to this screen (per the Y-01 permission matrix: スタッフ一覧・参照 = ×).
- **FR-005**: System MUST show a distinct "invited" status, separate from active/inactive, for accounts that have been sent credentials but have not yet completed their first login, masking the display name and showing invitation date instead of a login time for such accounts.
- **FR-006**: System MUST let a headquarters user resend the invitation email to any staff account currently in "invited" status.
- **FR-007**: System MUST let a headquarters user register one or more new staff accounts in a single submission, each requiring last name, first name, and email, with role and store/FC-company affiliation applied to the whole batch. Position is optional and also applies to the whole batch when given; when omitted, each account is created on the selected role's 未割当 position.
- **FR-008**: System MUST validate that last name, first name, email, and role are present for every filled-in row before allowing submission, and MUST indicate exactly which fields are missing. Position is not required for submission.
- **FR-009**: System MUST detect and block duplicate email addresses at submission time, both against already-registered accounts and against other rows in the same batch, before any account is created.
- **FR-010**: System MUST let a user paste multiple newline-separated email addresses into a single input and automatically distribute them across that many rows.
- **FR-011**: Upon successful account creation, system MUST automatically issue initial login credentials (or an invitation) to each new staff member's registered email address.
- **FR-012**: System MUST let an authorized user view and edit a staff account's name, email, role, position, and store/FC-company affiliation. Position is optional on save; leaving it blank keeps the account on the selected role's 未割当 position rather than blocking the save.
- **FR-013**: System MUST restrict edit access to a staff account so that: headquarters can edit any account; a manager can edit only "Staff"-role accounts affiliated with a store they manage; all other roles cannot edit accounts (including their own core fields via this screen).
- **FR-014**: System MUST restrict changing a staff account's role to headquarters users only.
- **FR-015**: System MUST require an explicit confirmation step before a role change is saved, displaying the current role, the new role, and a notice that the change takes effect at the affected staff member's next login. Independent of whether a change is pending, the role field MUST always display an inline notice stating that role changes take effect at the affected staff member's next login (per Y-01 260722_v4).
- **FR-016**: System MUST require exactly one affiliation pattern per staff account — either store affiliation (one store; **several stores for a Manager**, see FR-023) or a single FC company, never both — and MUST clear the prior pattern's selection when the pattern is switched. _(amended 2026-11-10)_
- **FR-017**: When a staff account is affiliated via an FC company, system MUST display the full set of stores that affiliation grants access to.
- **FR-018**: System MUST let a headquarters user deactivate a staff account after an explicit confirmation step; a deactivated account can no longer log in, while its historical records remain fully retained and visible.
- **FR-019**: System MUST let a headquarters user delete (soft-delete) a staff account after an explicit confirmation step; a deleted account is hidden from active staff views while related operational records remain retained.
- **FR-020**: System MUST let a headquarters user issue a one-time CRM login link for any staff account; a staff member MUST also be able to issue this link for their own account regardless of role.
- **FR-021**: System MUST record and display, per staff account, a chronological history of permission-related changes (role, position, affiliation), each entry including date/time, the operator who made the change, and a description of the change.
- **FR-022**: System MUST warn a user attempting to leave a staff creation or edit form with unsaved changes and require explicit confirmation before discarding those changes.
- **FR-023** _(added 2026-11-10)_: When the role is **Manager** and the pattern is store affiliation, the 所属店舗 input on the create and edit forms MUST allow selecting **multiple** stores; every selected store is a store that Manager manages (管轄店舗 = 所属店舗). For every other role the input MUST allow **at most one** store.
- **FR-024** _(added 2026-11-10)_: When the role is changed from Manager to any other role while more than one store is selected, system MUST clear the store selection and require the user to pick one store again before submitting (or to switch to the FC-company pattern). System MUST NOT keep any of the previous stores automatically. With zero or one store selected, the selection is kept.
- **FR-025** _(added 2026-11-10)_: The staff detail screen MUST list every 所属店舗 of the account (name and code); for a Manager it MUST also state that these are its managed stores and how many there are. The staff list's 所属店舗 column MUST show the first store plus 「他N店舗」 when there are several, with the full list available on hover.
- **FR-026** _(added 2026-11-10)_: A manager's edit scope (FR-013) MUST be evaluated against the target account's whole store set: editing is allowed when the two share at least one store.
- **FR-027** _(added 2026-11-10)_: The create and edit requests MUST send the store set as `storeIds` in selection order (the first id becomes the API's `storeId`), and the edit request MUST send it only when the set or its order changed. `fcCompanyId` is likewise sent only when it changed (a pattern switch sends both keys) — an unchanged `fcCompanyId: null` makes the BE log a spurious 「所属FC企業を解除しました」 history row (BUG-P2-06-02).

_Out of scope for this spec (not covered by the reviewed UI prototype; addressed elsewhere in Y-01)_:

- Managing the position-master catalog itself (defining/editing position names and their permission flags) — a separate administrative screen (Y-01 FR-006), only referenced here via a link to view a position's permissions.
- Per-position permission preview (Y-01 FR-009) beyond the reference link noted above.
- The independent CSV-export permission category (Y-01 FR-S001).
- Furigana (last/first name kana), gender, date of birth, postal code/prefecture/city/address/building, login method/social ID, the three per-account "additional permission" toggles (billing correction, refund request, transfer request), and a per-account "editable scope" (brand/store/date-range) table — none of these appear in Y-01, in `Y-01_権限設計v2_3.md`, or in the reviewed `staff-form.tsx` prototype; per-account permission overrides also conflict with Y-01's 3-layer role→position→person model, under which such flags belong on the position master (FR-006), not the individual account. See Known Implementation Gaps below.

### Field Validation Constraints (added 2026-09-18)

`Y-01.md` lists which fields are required and which are optional (FR-002) but **defines no lengths, formats or limits anywhere**. Per the 2026-09-18 decision, the **API contract is authoritative** where the requirement doc is silent — these are the limits the backend actually enforces, so a UI that allows more produces a value the save will reject or the backend will truncate. Source: `src/lib/openapi.real.json`.

| Field               | UI label                     | Required                          | Limit                                                                                                                            | DTO source                                                                                                                        |
| ------------------- | ---------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Last name           | 氏名（姓）                   | ✅                                | 1–50 characters                                                                                                                  | `BulkInviteRowDto.lastName`, `UpdateStaffRequestDto.lastName`                                                                     |
| First name          | 氏名（名）                   | ✅                                | 1–50 characters                                                                                                                  | `BulkInviteRowDto.firstName`, `UpdateStaffRequestDto.firstName`                                                                   |
| Email               | メールアドレス（ログインID） | ✅                                | ≤ 254 characters, unique                                                                                                         | `BulkInviteRowDto.email`, `UpdateStaffRequestDto.email` — edit: cognito-route staff only, ≤ 128 (Cognito), sent only when changed |
| Role                | ロール                       | ✅                                | one of `system` / `headquarter` / `manager` / `staff` / `trainer` / `observer`                                                   | `InviteStaffBulkRequestDto.role`                                                                                                  |
| Position            | 職位                         | ❌                                | UUID referencing the position master                                                                                             | `positionId`                                                                                                                      |
| Store / FC company  | 所属店舗 / 所属FC企業        | ❌ **optional** (確認 2026-09-18) | UUIDs; stores **XOR** FC company — neither is also valid on create. Stores: **1 for non-Manager, 1..N for Manager** (2026-11-10) | `storeIds` / `fcCompanyId` (`storeId` kept by the API as a one-store shorthand)                                                   |
| Affiliation pattern | 所属パターン                 | ✅ (UI only)                      | radio A/B — **no wire field**; selects which of the two keys above is sent                                                       | —                                                                                                                                 |
| Note                | 備考                         | ❌                                | ≤ **1000** characters                                                                                                            | `InviteStaffBulkRequestDto.memo`, `UpdateStaffRequestDto.memo`                                                                    |
| Deactivation reason | 無効化理由                   | ❌ **optional** (決定 2026-09-18) | ≤ **500** characters                                                                                                             | `DeactivateStaffRequestDto.deactivatedReason` — marked `required` on the wire, which is a **backend defect** under this decision  |
| Batch size          | —                            | ✅                                | **1–50 rows** per submission                                                                                                     | `InviteStaffBulkRequestDto.staff` (`minItems` 1, `maxItems` 50)                                                                   |

**Notes on four of these:**

- **備考 is 1000 and 無効化理由 is 500** — they are _not_ the same limit, even though both are multi-line free text and both coincide with (or were assumed to be) the project's 1000-character textarea default. The 500 is real and specific to the deactivation reason.
- **無効化理由 — RESOLVED 2026-09-18: optional.** This spec's Assumptions ("Deactivation reason capture is optional (not required to complete the action)") and the reviewed design's 「（任意）」 marking are authoritative. `DeactivateStaffRequestDto` marks `deactivatedReason` `required` and returns `400` (E-VAL-001) for a missing or empty value — under the same rule applied to the `PATCH` HQ-only gate, **the endpoint's required flag is a backend defect, not a narrowing of the requirement.** The UI no longer blocks an empty reason. ⚠️ **Consequence until the backend relaxes it: deactivating without a reason will fail with a 400**, surfaced by the global mutation error toast rather than hidden. This is a backend change request — see the test plan's gap **G9**.
- **所属店舗 / FC企業 — CONFIRMED 2026-09-18: optional, and 所属パターン is a separate thing.** All three sources agree the _value_ is optional: `Y-01.md` L178 lists 「所属店舗（パターンA）or FC企業（パターンB）」 under 「任意入力項目」; the reviewed prototype (`staff-form.tsx` @ `6bc1f1c`, L610 / L848) marks both 「（任意）」; and `InviteStaffRequestDto.required` contains only `email` / `role` / `lastName` / `firstName`, while `UpdateStaffRequestDto` requires no field at all and documents both keys as `nullable` with 「null clears it」. A staff with **no** affiliation is therefore a supported state, not an invalid one.
  - The **所属パターン** radio above it is marked required in the prototype and that is correct — but it is a UI-only discriminator with no wire field, it always holds a value (defaults to pattern A), and it does **not** make the selector beneath it required. Conflating the two is what produced the defect below.
  - ⚠️ The contract's field _description_ reads 「Provide **exactly one** of storeId / fcCompanyId (XOR)」, which taken literally would mandate one. The machine-readable schema contradicts that wording, so it should be corrected to **「at most one」** — raised as a backend documentation fix.
  - **Fixed 2026-09-18**: the create form was the lone dissenter — a `superRefine` in `staff-create.schema.ts` forced a selection (「店舗を選択してください」/「FC企業を選択してください」) and both labels carried a required `*`. Removed; the edit form's missing 「（任意）」 marks were added. `buildInviteStaffBulkPayload` now **omits** the key when nothing is selected instead of sending an empty string, which would fail `format: uuid`. **This was a regression** — the same defect was recorded and fixed in Phase 1 as `BUG-STAFF-CREATE-02` and reintroduced on 2026-08-24 during the real-API rewrite. Covered by Unit 2 TC-043 / TC-046 / TC-047 / TC-048 and Unit 3 TC-036 / TC-038.
- **Fields the spec places out of scope but the contract carries**: `lastNameKana` / `firstNameKana` (≤ 50 each) and `phone` (≤ 15). Per the 2026-09-18 decision Y-01 remains authoritative and these stay out of scope; the existing UI is retained with a `NOTE(spec-gap)` comment at each site rather than removed. Note the front-end applies a **stricter** rule to phone (a 10–11 digit regex) than the contract's 15-character cap — stricter is permissible but currently unsourced.

### Manager multi-store affiliation (added 2026-11-10)

**Background.** Y-01 has no separate 管轄店舗 setting for the Manager role ("【CRM-スタッフ】マネージャーの管轄店舗の設定（所属店舗との違い）"). The 2026-11-02 meeting chose a **Phase 1 interim**: a store set as a Manager's 所属店舗 is also a store it manages, and a Manager managing several stores selects them all in 所属店舗. In Phase 2 (Y-15 組織階層マスタ), a Manager's scope is expected to move to organisation levels (ブロック / エリア / テリトリー), so the multi-select is temporary.

**Decisions.**

| Topic                                         | Decision                                                                                                                                                          | Source                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Who may pick several stores                   | **Manager only**. Every other role keeps one store. The API accepts `storeIds` for every role (Dev Q&A 2026-11-07); restricting non-Managers is a FE product rule | Update-spec (FE proposal) + user decision 2026-11-10            |
| Primary store                                 | None. The selection order is kept and the first id is what the API returns as `storeId`                                                                           | API: `InviteStaffRequestDto.storeIds`, `StaffDetailDto.storeId` |
| Manager → other role with several stores (Q2) | Clear the selection and make the user pick one store again; **no automatic first store**                                                                          | User decision 2026-11-10                                        |
| Other role → Manager                          | Keep the current (zero or one) store                                                                                                                              | —                                                               |
| Managed stores                                | `managedStoreIds` = `storeIds` for a Manager, `[]` for other roles — computed by the BE                                                                           | `StaffDetailDto.managedStoreIds`                                |
| Manager edit scope                            | At least one shared store                                                                                                                                         | `GET /admin/staff/{id}` description                             |

**Manager header scope.** After a fresh sign-in a multi-store Manager's header store switcher lists exactly its stores (no 全店舗 — HQ/System only), and every store-scoped screen follows the selected store.

**Wire contract.** `POST /admin/staff/invite`, `POST /admin/staff/invite-bulk`: `storeIds: string[]` (XOR `fcCompanyId`). `PATCH /admin/staff/{id}`: `storeIds` replaces the whole set; `[]`/`null` clears it (with `fcCompanyId` for a move to pattern B); exactly one of stores / FC company must remain after the patch. List and detail return `storeIds` and `stores[]` (same order). `PUT /admin/staff/{id}/managed-stores` is superseded by `PATCH … storeIds` and is not used by any screen.

**Q1 (which store is primary)** from Update-spec is resolved by the API: there is no primary store. **Q2** is resolved by the 2026-11-10 decision above.

### Known Implementation Gaps (edit screen, re-verified 2026-08-24)

The current edit screen implementation (`src/app/(private)/staffs/[id]/edit/`) was checked against this spec, against Y-01 (unchanged since the last review), and against the current `staff-form.tsx` prototype (only change since the last review: the note field gained a 1000-character limit). Three gaps were found between what the screen presents/allows and what it actually saves or enforces:

- ~~**Email edits are silently dropped (violates FR-012).**~~ **RESOLVED 2026-11-04 (Y-01 - Bug No.16)** — see "Email change on the edit screen" below. _Original finding:_ The real backend's update contract (`UpdateStaffRequestDto`) has no email field yet. The form still renders the email input and its "重複確認" duplicate-check button as if editing were fully supported, and the save flow reports success — but any change to the email address is discarded without warning. The duplicate-check itself also still queries the mock staff dataset rather than the real one, so its result is unreliable regardless.
- **Several rendered fields are not backed by the real API and are silently discarded on save**, with no spec source authorizing them in the first place (see the out-of-scope bullet above): furigana, gender, date of birth, address fields, login method/social ID, the three additional-permission checkboxes, and the editable-scope table (whose store list is also a hardcoded local array, not wired to any store master). Users can fill these in, see a success toast, and have nothing persisted.
- **FR-013's manager-scope edit restriction is not enforced on the edit screen itself (frontend).** The only client-side check is a disabled "編集" button with an explanatory tooltip on the staff detail page (`staff-detail-header.tsx`); the equivalent row action on the staff list, and the edit page/route itself, have no role/store guard at all — there is no route layout or middleware under `staffs/[id]/edit`, and the edit form loads and submits fully for any authenticated user who reaches the URL directly, regardless of the target account's role or store. Whether this is caught server-side is unverified from the frontend; as written, Acceptance Scenario 4 of User Story 3 is not actually satisfied by direct URL navigation today.

#### Email change on the edit screen (Y-01 - Bug No.16, decided 2026-11-04)

Source: Y-01 FR-003 L189 (「FR-002 の全項目の参照・編集」), client confirmation on the bug ticket, and the backend contract API-070 v0.11.1 §6.5.3 (`PATCH /admin/staff/{id}` now accepts `email`).

- The メールアドレス（ログインID） input is **editable** unless the target staff's `StaffDetailDto.authProvider` is `google`. A Google-route address belongs to Google, so the input is disabled with the tooltip 「Googleアカウントのメールアドレスは変更できません」. `authProvider: null` (seeded without an invitation) is treated like `cognito`, as the API does.
- The FE does **not** additionally gate the input by operator role; the backend's System/Headquarter rule is enforced server-side and surfaced by the global error toast.
- `email` is sent in the `PATCH` body **only when it changed** (trimmed, case-insensitive). An unchanged address — including a case-only change — is omitted.
- A changed address over **128 characters** (Cognito's limit) is blocked client-side with 「メールアドレスは128文字以内で入力してください」.
- 「重複確認」 calls `GET /admin/staff/email-availability` and is enabled only while the value is a well-formed address **different from the current one** (the endpoint does not know which staff is being edited, so the staff's own address would read as "duplicate"). Results reuse the create screen's wording: 使用可能 / すでに登録されています / ドメイン未登録 / ドメイン無効 / 128文字超.
- Save-time rejections are pinned to the email field (the global toast still fires): `409 E-STF-002` 「このメールアドレスはすでに登録されています」, `422 E-DMN-006` 「このメールドメインはCRMのアクセス許可対象ではありません」, `422 E-STF-016` (domain on the other login route), `502 E-STF-005` (Cognito failure, nothing saved, retryable), `400 E-VAL-001` on `email`.
- **Re-invitation is the backend's job.** For a staff who has not completed the first login (`status = invited`), changing the email invalidates the pending invitation link; the FE makes **no** follow-up `POST /admin/staff/{id}/reinvite` call. Sending the new invitation on an email change is left to the backend (decision 2026-11-04).
- **Save toast follows `UpdateStaffResponseDto.reinvite`** (Otaki-san decision on the bug ticket, 2026-11-18). On an email change of an `invited` staff the backend re-sends the invitation inside the `PATCH` and reports it; the FE still makes no `POST /reinvite` call (that would mail twice):
  - `sent` → success 「スタッフ情報を更新しました。新しいメールアドレスに招待メールを送信しました。」
  - `failed` → warning 「スタッフ情報を更新しました。招待メールを送信できませんでした。一覧または詳細画面の「再招待」から再送してください。」 (the change IS saved; the staff stays 招待中)
  - `skipped` (deactivated staff) → success 「スタッフ情報を更新しました。無効のスタッフのため招待メールは送信していません。」
  - absent (already signed in, or email unchanged) → the usual 「スタッフ情報を更新しました」

#### Role change without a position (Y-01 - Bug No.19, decided 2026-11-05)

Source: Y-01 FR-002/FR-003 (ロール required, 職位 optional), FR-005 L206, and the backend's 案A (MR !932, deployed to dev 2026-11-03; API-070 still reads v0.15 pending client confirmation). `PATCH /admin/staff/{id}` now accepts `role`.

- Changing ロール with 職位 left empty **saves** (after the role-change confirmation dialog). The body carries `role` and no `positionId`; the backend parks the staff on the **new** role's 「未割当」 position and writes a `role_change` history row.
- Changing ロール with a 職位 of the new role sends `role` + `positionId`. A `positionId` of another role is `400 E-VAL-001`.
- `role` is sent **only when it differs** from the loaded record. A Manager (whose ロール select is locked) never sends it — a Manager sending `role` at all is `403 E-AUTH-103`.
- An explicit 職位「未割当」 clear (`positionId: ''`) is sent only while ロール is untouched, since `''` resolves to the 未割当 of the _current_ role.
- The 職位 picker keeps its 「未割当」 option during a role change; the helper text reads 「ロールを変更すると職位は選び直しになります。未選択の場合は新しいロールの「未割当」職位になります」. The former blocking error 「ロールを変更するには、新しいロールの職位を選択してください」 is removed.

These are flagged here as known gaps rather than resolved in either direction (extending Y-01 to formally cover the unspecced fields, adding the missing route guard, or removing the unspecced fields from the screen) — those calls are left to product/dev to make explicitly.

### Key Entities _(include if feature involves data)_

- **Staff Account**: A CRM user record — ID, name, login email, role, assigned position, affiliation (store or FC company), status (active/inactive/invited), last login, and free-text note.
- **Role**: One of six fixed classifications (Headquarter, Manager, Staff, Trainer, Observer, plus an internal-only System role) determining broad access scope.
- **Position**: A named permission-granularity label (managed elsewhere) assigned to a staff account within their role.
- **Affiliation**: A staff account's access scope, expressed as exactly one of: store affiliation — a single store, or **one or more stores for a Manager**, each of which it manages (2026-11-10) — or a single FC company (which in turn grants access to all stores that company manages).
- **Permission Change History Entry**: A record of a change to a staff account's role, position, or affiliation, including when it happened, who made it, and what changed.
- **Invitation**: The pending-access state of a staff account between account creation and that account's first completed login.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A headquarters administrator can register a batch of new staff accounts (e.g. 10+ people) in a single form submission, without repeating the creation flow per person.
- **SC-002**: Duplicate email addresses are caught before account creation in 100% of attempts, whether against existing accounts or within the same batch.
- **SC-003**: A user can locate a specific staff account among hundreds of records, using search and/or filters, in under 15 seconds.
- **SC-004**: A manager never sees or can act on staff accounts outside the stores they manage; a staff user never sees accounts other than their own; a trainer/observer user never sees this screen at all.
- **SC-005**: 100% of staff role changes pass through an explicit confirmation step and are captured in that account's permission history before taking effect.
- **SC-006**: A deactivated staff account is unable to log in immediately following the action, while all of that account's historical records remain fully retrievable.
- **SC-007**: An invited staff member can be issued a working one-time login link or a resent invitation within a single action from the CRM, with no manual email intervention required.

## Assumptions

- Position-master definitions (the catalog of position names and which permission flags they carry) are maintained through a separate administrative function; this spec assumes that catalog already exists and only covers assigning an existing position to a staff account.
- The list of selectable stores and FC companies is assumed to come from existing store/FC-company master data (maintained elsewhere); this spec does not cover creating or editing that master data.
- "Delete" is treated as a reversible-in-record (soft) delete that hides an account from active views while preserving operational/audit logs, consistent with the retention behavior already described for deactivation.
- Initial-password/invitation email delivery and one-time login-link mechanics rely on existing account-invitation infrastructure; this spec covers only the user-facing triggers (create, resend, issue link), not the underlying email/token delivery system.
- Deactivation reason capture is optional (not required to complete the action), matching the "reason" field being non-mandatory in the reviewed design.
