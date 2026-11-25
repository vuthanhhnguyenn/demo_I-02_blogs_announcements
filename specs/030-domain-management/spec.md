# Feature Specification: Domain Master Management

**Feature Branch**: `030-domain-management`
**Created**: 2026-08-18
**Status**: Draft
**PO Spec**: `Y-14` — ドメインマスタ管理 (Domain Master Management)
**Source**: `src/pages/domain-list.tsx` (dx-fitness/fitness-crm-ui @6bc1f1c, 2026-09-08) + `crm/requirements/Y-14.md` (dx-fitness/fitness-spec @96ddacd9, 2026-07-30 — unchanged since the original 2026-08-18 draft of this spec)
**Input**: User description: "Create spec for domain management, spec: Y-14.md, ui v0 - prototype: domain-list.tsx"
**Updated**: 2026-09-09 — refreshed against the current V0 mockup, which now implements the elements the 2026-08-18 draft flagged as missing (see Assumptions). Y-14.md's requirement text is unchanged; no functional requirement below changed as a result of this refresh — see the Assumptions section for what did.
**Updated**: 2026-11-03 — Y-01 Bug No.26: domain max length now depends on 認証方式 (Google SSO 252 / IDaaS 126) and the TLD must be alphabetic (FR-006, new FR-006a, US2 AS5–AS8, Edge Cases, **Q&A Q6**).

## User Scenarios _(mandatory)_

### User Story 1 - View and search the domain allowlist (Priority: P1)

A Headquarter staff member opens the domain management screen to see every email domain currently allowed to access the CRM, along with which authentication route each domain uses and how many staff accounts depend on it.

**Why this priority**: This is the read path every other action depends on — HQ must be able to see and locate a domain before registering, editing, or deleting one. Without it, HQ has no visibility into which companies/domains can reach the CRM.

**Verification**: Load the domain management screen as a Headquarter user, confirm the list shows ID, name, domain, authentication method, and staff count for every registered domain, then search by name/domain/authentication method and confirm the list filters correctly.

**Acceptance Scenarios**:

1. **Given** several domains are registered, **When** an HQ user opens the domain management screen, **Then** the list displays each domain's ID, management name (管理名), domain string, authentication method badge (Google SSO / IDaaS), and linked staff count.
2. **Given** the list is populated, **When** the user searches by a partial management name or domain string, **Then** only matching rows remain and a result-count summary reflects the filtered total.
3. **Given** the user filters by authentication method, **When** they select "Google SSO" or "IDaaS", **Then** only domains using that method are shown.
4. **Given** no domain matches the current search, **When** the search executes, **Then** an empty-state message is shown instead of a blank table.
5. **Given** a non-Headquarter/System role (Manager/Staff/Trainer/Observer), **When** they attempt to reach the domain management screen, **Then** access is denied entirely (menu entry and direct navigation both blocked).

---

### User Story 2 - Register a new domain (Priority: P1)

An HQ staff member adds a new company's email domain to the allowlist so its staff can start accessing the CRM, choosing which authentication route (Google SSO or IDaaS) applies to that domain.

**Why this priority**: Without registration, no new company/domain can ever be onboarded — this is the entry point for the whole feature's value.

**Verification**: Open the "add domain" dialog, fill in management name, domain, and authentication method, save, and confirm the new row appears in the list with a system-assigned ID.

**Acceptance Scenarios**:

1. **Given** the add-domain dialog is open, **When** the user enters a unique management name, a domain string, and selects an authentication method, **Then** saving creates a new domain record with a system-generated ID and the dialog closes.
2. **Given** a domain string that already exists (case-insensitive match), **When** the user attempts to save, **Then** the save is blocked and an inline error states the domain is already registered.
3. **Given** the domain field is empty or the management name is empty, **When** the user attempts to save, **Then** the save action is disabled/blocked until both required fields are filled.
4. **Given** the user enters a domain string containing "@" or other invalid characters, **When** they attempt to save, **Then** validation prevents saving until only the valid domain portion is entered.
5. **Given** the user enters a domain whose top-level label is not alphabetic (e.g. `test.2`, `example.123`) or is a single letter (e.g. `example.c`), **When** they attempt to save, **Then** the same format error 「ドメインの形式が正しくありません（例: joyfit.co.jp）」 is shown and saving is blocked (FR-006).
6. **Given** 認証方式 = Google SSO, **When** the domain is 252 characters, **Then** it is accepted; at 253 characters the inline error 「Google SSOのドメインは252文字以内で入力してください。」 is shown and saving is blocked. **Given** 認証方式 = IDaaS, the same holds at 126 / 127 characters with 「IDaaSのドメインは126文字以内で入力してください。」 (FR-006a).
7. **Given** a domain that fits Google SSO's cap but not IDaaS's (127–252 characters), **When** the user switches 認証方式 from Google SSO to IDaaS, **Then** the domain field's error appears immediately without retyping the domain, and switching back clears it (FR-006a).
8. **Given** the user pastes a domain longer than the cap, **When** the value lands in the field, **Then** it is kept as pasted (not silently truncated) and the length error is shown (FR-006a).

---

### User Story 3 - Edit a domain and review its linked staff (Priority: P2)

An HQ staff member opens an existing domain to correct its management name, change its domain string, or switch its authentication method, and checks which staff accounts are tied to it before making a change.

**Why this priority**: Details change after onboarding (renamed companies, corrected domains, authentication route migrations); this keeps the master data accurate without needing to delete and re-create records.

**Verification**: Open an existing domain's edit view, confirm the linked staff list and read-only creator/created-at fields are visible, change the authentication method, and confirm a warning dialog appears before the change is committed.

**Acceptance Scenarios**:

1. **Given** an existing domain, **When** HQ opens its detail/edit view, **Then** management name, domain, and authentication method are editable, and creator and created-at are shown read-only.
2. **Given** an existing domain, **When** HQ opens its detail/edit view, **Then** the list of staff accounts linked to that domain is displayed.
3. **Given** HQ opens the edit form on a domain with linked staff, **When** they look at the domain string and authentication method, **Then** both are read-only with the reason and the deactivate → edit → re-invite path; on a domain with zero linked staff, changing the authentication method instead opens a confirmation dialog stating the domain's name and domain string and the old → new authentication method before the change is committed (see **Q&A Q5** for why the route cannot be switched under existing staff).
4. **Given** HQ edits the domain string to a value that collides with a different existing domain, **When** they attempt to save, **Then** the save is blocked with the same duplicate-domain error as registration.

---

### User Story 4 - Delete a domain safely (Priority: P2)

An HQ staff member removes a domain that is no longer needed, and is protected from accidentally locking out active staff by a hard block when staff are still linked to that domain.

**Why this priority**: Deletion is destructive and irreversible; guarding it against orphaning active staff logins prevents an operational incident, so this ships alongside edit/register rather than as an afterthought.

**Verification**: Attempt to delete a domain with zero linked staff and confirm it succeeds; attempt to delete a domain with linked staff and confirm the deletion is blocked with the staff count shown.

**Acceptance Scenarios**:

1. **Given** a domain has zero linked staff, **When** HQ confirms deletion, **Then** the confirmation dialog names both the management name and domain string, and confirming removes the record from the list.
2. **Given** a domain has one or more linked staff, **When** HQ attempts to delete it, **Then** the deletion is blocked, the dialog states the number of linked staff, and the user is directed to reassign or deactivate those staff first (in Staff Management) before the domain can be deleted.

---

### User Story 5 - Enable/disable a domain without deleting it (Priority: P3, Phase 2)

An HQ staff member temporarily suspends CRM access for a domain's staff without permanently removing the domain record, then re-enables it later.

**Why this priority**: Lower priority because it is explicitly scoped to Phase 2 in the PO spec; Phase 1 ships with delete as the only way to revoke access. Included here for completeness and forward-planning, not for Phase 1 delivery.

**Verification**: Toggle a domain's status between 有効 (enabled) and 無効 (disabled) and confirm the state badge updates and staff on a disabled domain can no longer log in.

**Acceptance Scenarios**:

1. **Given** a domain is enabled, **When** HQ disables it, **Then** the domain's status badge changes to 無効 and its staff can no longer authenticate.
2. **Given** a domain is disabled, **When** HQ re-enables it, **Then** the domain's status badge changes to 有効 and its staff can authenticate again.

### Edge Cases

- What happens when the same domain string is submitted twice in quick succession (race)? The second save must still be rejected as a duplicate once the first commits.
- How does the system handle a domain string entered with mixed case (e.g., `JoyFit.co.jp` vs `joyfit.co.jp`)? Uniqueness checks are case-insensitive.
- What happens when HQ tries to delete a domain that has become linked to staff after the delete confirmation dialog was opened but before it is confirmed? The block must be re-evaluated at confirm-time, not only when the dialog opened.
- How does the system handle a domain search that matches zero records? An empty-state message is shown with an option to clear the search.
- What happens when a non-HQ/System role reaches the domain management URL directly? Access must be denied the same as if no menu entry existed.
- What happens when a domain is registered at a length where no staff address can fit (e.g. a 253-char domain makes the shortest address `a@<domain>` 255 chars, over the 254 email limit)? It must be impossible: the domain cap is the auth route's email limit minus 2 (Google SSO 254 → 252, IDaaS 128 → 126) — see FR-006a and **Q&A Q6**.
- What happens when a domain's 認証方式 is edited (0 linked staff) from Google SSO to IDaaS while the domain is 127–252 characters? The change must be blocked by the IDaaS cap client-side, and the backend refuses it too (`400 E-VAL-001 { field: "domain", code: "too_long" }`).
- What happens to a domain's linked staff count display when staff are reassigned to a different domain elsewhere in Staff Management? The count must reflect the current linkage, not a stale snapshot.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a searchable list of all registered domains showing ID, management name (管理名), domain string, authentication method (Google SSO / IDaaS, shown as a badge), and count of linked staff (スタッフ数 = every linked staff in any status — 有効, 招待中 and 無効 — i.e. API `staffCount`, equal to the 紐づくスタッフ list total; display only, Y-14 Bug No.14).
- **FR-002**: System MUST allow filtering the domain list by management name (partial match), domain string (partial match), and authentication method (exact match via a selector).
- **FR-003**: System MUST show an empty-state message when the domain list or a filtered result set has zero rows.
- **FR-004**: System MUST allow Headquarter/System users to register a new domain by providing a management name, a domain string, and an authentication method (Google SSO or IDaaS).
- **FR-005**: System MUST enforce domain-string uniqueness (case-insensitive) at registration and at edit time, rejecting the save with an inline error ("このドメインは既に登録されています") when a duplicate is detected.
- **FR-006**: System MUST validate that the domain string does not contain "@" or other characters invalid for a bare domain (i.e., only the portion after "@" in an email address). The accepted shape matches the backend's `RegisterDomainMasterDto.domain` pattern: two or more labels, each 1–63 characters of `a-z0-9-` that neither starts nor ends with `-`, and an **alphabetic top-level label of 2–63 letters**. A numeric TLD such as `test.2` is rejected (`400 invalid_format` on the backend), because no staff email at it could pass invitation (API-070). A label longer than 63 characters (top-level label included) MUST be reported on the ドメイン field with its own message — 「ドメインの各ラベル（「.」で区切られた部分）は63文字以内で入力してください。」 — instead of the generic format error, and the save MUST be blocked client-side, so no request is sent (Y-14 Bug No.16; the backend's equivalent is `400 E-VAL-001 { field: "domain", code: "too_long" }`).
- **FR-006a**: System MUST cap the domain string's length by the selected authentication method — **Google SSO ≤ 252, IDaaS ≤ 126** characters (API-071 v0.6 §6.5.2; each is that route's email limit minus 2, so the shortest address `a@<domain>` still fits). Before an authentication method is chosen the larger cap (252) applies. The cap MUST be re-evaluated when the authentication method changes (add and edit), and an over-long value MUST be shown with an error rather than silently truncated at the input. Over the cap the backend answers `400 E-VAL-001 { field: "domain", code: "too_long" }` on both register and update (the update check uses the post-edit domain and method).
- **FR-007**: System MUST auto-assign a system-generated ID to every newly registered domain.
- **FR-008**: System MUST allow Headquarter/System users to view and edit an existing domain's management name, domain string, and authentication method.
- **FR-009**: System MUST display a domain's creator and creation date/time as read-only fields on its detail/edit view.
- **FR-010**: System MUST display the list of staff accounts linked to a domain on that domain's detail/edit view.
- **FR-011**: System MUST allow a domain's domain string and authentication method to be edited only while zero active staff (有効スタッフ = 有効 + 招待中, API `activeStaffCount`; 無効 staff do not count) are linked: with one or more linked, both fields MUST be presented as read-only with the reason and the operational path (deactivate the staff in Staff Management → edit the domain → re-invite), and a change attempted anyway MUST surface the backend's refusal (`409 E-DMN-005`) as an inline error rather than a silent failure. The management name stays editable at all times. When zero active staff are linked (無効 staff may still be linked), the system MUST still show a confirmation dialog before committing an authentication-method change, naming the domain and the old → new method.
- **FR-012**: System MUST allow Headquarter/System users to delete a domain, presenting a confirmation dialog that states both the management name and the domain string being deleted.
- **FR-013**: System MUST block deletion of a domain that has one or more active linked staff (有効 + 招待中, API `activeStaffCount`; a domain whose linked staff are all 無効 is deletable), and MUST display that active-staff count in the block message so HQ knows to reassign or deactivate those staff first.
- **FR-014**: System MUST restrict all domain management actions (view, register, edit, delete, and Phase 2 enable/disable) to System and Headquarter roles; Manager, Staff, Trainer, and Observer MUST have no access to this screen or its actions.
- **FR-015** (Phase 2, Should): System MUST allow Headquarter/System users to toggle a domain's status between 有効 (enabled) and 無効 (disabled) without deleting the record, showing a status badge in the list, and MUST treat disabled domains as blocking their staff's authentication.

### Key Entities _(include if feature involves data)_

- **Domain**: A registered email-domain allowlist entry. Key attributes: system-assigned ID, management name (管理名 — a human-readable label distinct from the raw domain string, used for row identification and delete confirmation), domain string (the portion of a staff email address after "@"), authentication method (Google SSO or IDaaS — read by Y-13's login routing), linked staff count (derived from Y-01 staff records whose email matches this domain; all statuses for display, plus a separate active-staff count — 有効 + 招待中 — that drives the edit lock and delete block), creator, created-at, and (Phase 2 only) enabled/disabled status.
- **Staff** _(referenced, owned by Y-01)_: An existing CRM staff account. Relevant to this feature only via its email domain, which determines which Domain record it links to and therefore which authentication route applies at login.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An HQ user can locate any specific domain in the list (by name, domain string, or authentication method) in under 10 seconds regardless of list size.
- **SC-002**: 100% of attempts to register or edit a domain into a duplicate domain string are rejected before a duplicate record is created.
- **SC-003**: 0% of domains with at least one linked staff account can be deleted without the deletion first being blocked and the staff count surfaced to the user.
- **SC-004**: 100% of attempts to change a domain's domain string or authentication method while one or more active staff are linked are blocked, with the blocking reason and the deactivate → edit → re-invite path surfaced to the HQ user.
- **SC-005**: 0% of users outside the System/Headquarter roles can view or act on the domain management screen, whether reached via menu or direct navigation.

## Assumptions

- The V0 prototype (`domain-list.tsx`) was updated on 2026-09-08 and now implements every element the original 2026-08-18 draft of this spec flagged as missing from the earlier "AUTH-02" draft: the authentication-method column/badge and search filter, the linked-staff-count column, a read-only detail view (opened by clicking a row) showing creator/created-at and the linked-staff list, delete-blocking-when-staff-linked (with the blocked-staff count surfaced), and the authentication-method-change confirmation dialog (whose 「スタッフ{n}名」 copy can only ever render 0名 against the real backend — see **Q&A Q5**, FR-011 and User Story 3, AS3). Y-14.md's requirement text did not change; the mockup simply caught up to it. No further net-new UI/behavior remains to reconcile for Phase 1.
- The current implementation (`src/app/(private)/domains`) has the `authProvider` (認証方式) column commented out pending PO answers recorded in `qa-authprovider.md` (Q1-Q4). Those questions concern cross-system conflict/priority logic between Y-14, Y-03 (FC company master), and Y-13 (login routing) — not whether the field or column belongs in Phase 1. The updated V0 confirms the column, the required select field, and the search filter are in scope for Phase 1 regardless of how Q1-Q4 resolve; only the deeper cross-reference validation behavior in Q1/Q2 remains genuinely open.
- The status column and enable/disable toggle in the V0 prototype correspond to FR-015 (Phase 2). The mockup now gates both behind its own Phase 1/Phase 2 preview toggle and hides them in the Phase 1 view by default — reinforcing, not contradicting, that Phase 1 implementation must not expose this column or these actions.
- Domain-string uniqueness comparison is case-insensitive, consistent with the V0 prototype's existing implementation.
- New domain records default to 有効 (enabled) status once the status field is introduced in Phase 2.
- System-generated IDs follow the existing `D-0xx`-style sequential pattern shown in the prototype's mock data.
- Authentication method is constrained to exactly two values — Google SSO and IDaaS — matching Y-13's two supported login routes.
- Domains belong to the company/organization, not to a specific brand; there is no brand-scoping filter for this screen (per Y-14's ブランド適応範囲 note).

## Q&A

### Q6. FR-006 / FR-006a — domain max length vs. staff email limit (**RESOLVED**, Y-01 Bug No.26)

**Raised**: 2026-11 (tester bug 「Bug-No26\_[UI] 【スタッフ新規登録】最大桁数（253文字）のドメイン作成時、メールアドレスの文字数制限（254文字）によりアカウント作成が不可となる」).

**Question**: Y-14 allowed a 253-character domain (RFC 1035 max), but the staff email limit is 254, so
`a@<253-char domain>` (255) can never be invited on Y-01. The same report also found that a domain
such as `test.2` could be registered although every staff email at it is rejected as invalid.

**Answer** — BE decision (API-071 v0.6 §6.5.2, BE MR !918, deployed to dev): the domain cap depends on
the authentication method — **Google SSO 252 / IDaaS (Cognito) 126**, i.e. the route's email limit
(254 / 128) minus 2. Over it: `400 E-VAL-001 { field: "domain", code: "too_long" }`, checked on
register and on update (post-edit domain + method). The domain pattern requires an alphabetic TLD
(`test.2` → `400 invalid_format`). On Y-01, `GET /admin/staff/email-availability` `reason` is now the
enum `duplicate | domain_not_registered | domain_inactive | email_too_long` (`email_too_long` = IDaaS
address over 128 chars).

**Implementation**: `_constants/domain.constants.ts` (`DOMAIN_STRING_MAX_LENGTH_BY_AUTH_PROVIDER`),
`_schemas/domain-form.schema.ts` (alphabetic-TLD regex + per-method cap in `superRefine`; no input
`maxLength` so a paste is never cut silently), `_components/domain-form-dialog.tsx` (re-validates
ドメイン on 認証方式 change); Y-01 `staffs/create` maps the two new reasons to their own copy.
`src/lib/openapi.real.json` / `src/lib/api-real` regenerated from the dev backend. Supersedes the
"ドメイン max 253" figure in Y-14.md `260912_v2` and integration-plan **R201**.

### Q5. FR-011 / SC-004 — authentication method cannot be changed while staff are linked (**RESOLVED**)

**Raised**: 2026-09-17 (integration round 2 — see [integration-plan.md](./integration-plan.md) **R302**)
· **Resolved**: 2026-09-12, upstream. The cross-system `authProvider` questions (Y-14 ↔ Y-03 ↔ Y-13)
are a separate, still-open set in [qa-authprovider.md](./qa-authprovider.md) (Q1–Q4).

**Question**: FR-011/SC-004 assumed a domain's authentication method can be changed while staff are
linked — the confirmation dialog naming the N affected staff, whose login route then switches from
their next login. The backend refuses exactly that case (`409 E-DMN-005`), so the dialog could only
ever render 「0名」. The premise is technically wrong, not merely strict: identity is provisioned **at
invitation** (a `cognito` invite creates a Cognito user; a `google` invite creates nothing) and the
login route is resolved from the id_token's `iss` claim, never re-read from the domain master — so
flipping `authProvider` would lock existing staff out rather than re-route them. Should FR-011 be
rewritten to the backend's deactivate → edit → re-invite flow, and what becomes of SC-004?

**Answer** — the backend behaviour **is** the spec. Y-14.md `260912_v2` (2026-09-12,
dx-fitness/fitness-spec @`a5abfdb`) settled this before the question was filed, via the PO Dev Q&A
answered 2026-08-24 plus the BE completion report of 2026-09-11. It states
「ドメイン・認証方式の変更（編集）および削除は、紐づく有効スタッフが0名のときのみ可能」 with the operational path
「Y-01で該当スタッフを無効化 → ドメイン編集 → 再招待」, and documents `409 E-DMN-005` under FR-M003's
異常系. FR-011 and SC-004 above are rewritten to match; the confirmation dialog is kept but is
reachable — and meaningful — only at zero linked staff. No PO input is outstanding.

**Implementation**: already conformant, no code change needed. Domain string and authentication
method are read-only with a reason while `activeStaffCount > 0` (was `staffCount` before the Y-14 Bug No.14 contract change), `E-DMN-005` is handled as a race backstop,
and the confirm dialog fires only at zero linked staff — `_components/domain-form-dialog.tsx`,
decision **D9** in [integration-plan.md](./integration-plan.md).
