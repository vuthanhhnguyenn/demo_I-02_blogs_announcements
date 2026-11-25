# Test Plan: Subsequent Login (028)

**Spec**: [../spec.md](../spec.md)
**PO Spec**: `Y-13`（旧 `AUTH-01`） — 認証・ログイン (`crm/requirements/Y-13.md`) — regular (second-login-onward) sign-in sub-flow only
**Created**: 2026-08-18
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

---

## Scope

**In scope** (screen covered by the unit below):

- ログイン（通常） (Regular Login: Google button + email/password form, always shown together, plus its session-expired / account-locked / domain-unregistered / generic-error banner states) — `login.tsx` → app route `/login`

**Out of scope** (navigation targets / separate specs — not covered by this plan):

- First-time login (invitation-link flow, temp-password change, first-time completion) — `specs/023-first-time-login/`, already implemented and used as this screen's reference pattern.
- Forgot-password request and set-new-password-from-reset-link screens — reachable via "パスワードをお忘れの方" on this screen, but the link is only wired to navigation; the target flow itself is `specs/029-password-reset/`.
- Magic-link login ("マジックリンクでログイン") — Y-13 FR-S001, a separate, unrelated entry point per this spec's own Assumptions; the link is visually present but not functionally in scope here.
- Multi-factor authentication (TOTP second step) — shown in the UI prototype's `navigate("mfa-verify")` call, but explicitly excluded from this spec's scope per its Assumptions (undecided item `Y-13-Q01`); the real app route tree confirms no `mfa-verify` route exists, so no MFA step is testable.
- Explicit logout (header user menu "ログアウト") and session-expiry redirect mechanics — User Story 3 describes these as reachable _via_ this login page (its `session-expired` banner state is in scope to test), but the logout action itself lives in the app shell/header, not on this screen.
- Domain-allowlist management (Y-14) and administrator-side session/lockout management — back-office capabilities out of scope per this spec's Assumptions.

---

## Unit Table

| #   | Unit          | Screen(s) | Route    | TC Doc Filename                                |
| --- | ------------- | --------- | -------- | ---------------------------------------------- |
| 1   | Regular Login | ログイン  | `/login` | `TC -【Fitness CRM】- [Y-13][01][ログイン].md` |

Under `specs/028-subsequent-login/tests/cases/`.

**Split rationale**: This feature is exactly one screen (one route, `/login`) with several banner/error states rendered conditionally on the same page rather than separate URLs (session-expired, locked, domain-unregistered, generic error) — there is nothing to cluster or split; it is a single natural unit.

---

## Sources per Unit

| Unit          | Spec sections                                                                                                                              | UI mockup file | FRs covered                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------- |
| Regular Login | User Story 1 (all); User Story 2 (all); User Story 3 (Acceptance Scenarios 2, 3 only — the login-page-facing parts); Edge Cases (all five) | `login.tsx`    | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-008, FR-009, FR-010, FR-011 (FR-007 partly — see note) |

**Note**: FR-007 (explicit sign-out invalidating the server session) is triggered from the header user menu, not this screen — its testable surface for this unit is limited to "after logout, returning to `/login` shows the normal form" and "signing back in afterward works normally" (User Story 3, Scenario 1's tail end); the actual logout action itself belongs to whatever screen hosts the header, out of this plan's screen scope.

**Cross-references**: Requirement doc `crm/requirements/Y-13.md` FR-M001/FR-M002 (excluding MFA) define the two sign-in paths, FR-M003 defines domain-based routing (routed through Y-14), FR-M005/FR-M007/FR-M008 define the session-expiry/lockout messaging this unit's banner states implement.

---

## Coverage Focus per Unit

Added to, not a replacement for, `gen-testcases`' full coverage walk (field-level validation, empty/loading/error states, etc. per the common checklists).

- **Regular Login**: both sign-in options (Google button, email/password form) always visible together with no mode-selection step; empty-email/empty-password client-side block with field-level message before any request fires (FR-010) vs. a submitted-but-wrong-credentials request producing the single generic "incorrect email or password" message that never reveals which field was wrong (FR-004) — these are two distinctly-triggered states and must not be conflated; the account-locked banner not only displays but actually disables the Google button, the email/password fields, and the submit button (`disabled={isLocked}` in the mockup) so no submission of any kind is possible while locked; the "account not registered/active" message is shown identically whether reached via Google or via correct email/password on a deactivated account, and is visually/textually distinct from both the generic-incorrect-credentials and the locked messages; already-authenticated visits to `/login` redirect straight to the dashboard without ever flashing the form (edge case); a malformed/unprocessable success response from the identity step shows the generic "something went wrong" message and leaves no partial session behind, verified by confirming a subsequent app action still requires login; redirect-back-to-originally-requested-page behavior after a successful sign-in (User Story 1 Scenario 2) versus falling back to the dashboard when there was no prior page.

---

## Traceability Map

| FR     | Requirement (short)                                                                                          | Unit(s)                                  |
| ------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| FR-001 | Sign in with linked Google account                                                                           | Regular Login                            |
| FR-002 | Sign in with email + password, both options always shown together                                            | Regular Login                            |
| FR-003 | Reject non-active-staff identity with "contact administrator" message                                        | Regular Login                            |
| FR-004 | Generic "incorrect email or password" message, no field disclosure                                           | Regular Login                            |
| FR-005 | Distinct "account temporarily locked" message; block further submissions                                     | Regular Login                            |
| FR-006 | On success, establish session and return to originally-requested page or dashboard                           | Regular Login                            |
| FR-007 | Explicit sign-out invalidates server session, returns to login                                               | Regular Login (partial — see note above) |
| FR-008 | Redirect to login with "session expired" message when renewal fails                                          | Regular Login                            |
| FR-009 | Already-signed-in visit to login page redirects straight into the CRM                                        | Regular Login                            |
| FR-010 | Client-side required-field validation before email/password submission                                       | Regular Login                            |
| FR-011 | Generic retry-able error, no partial session, when CRM response is unprocessable after identity-step success | Regular Login                            |

Every FR-001…FR-011 lands in the single unit above (FR-007 with the scope caveat noted). No orphaned requirements.

---

## Execution Notes (for `execute-testcases`)

- **No test environment for Google/Cognito**: Per instruction, there is no environment to exercise real Google OAuth or real Cognito credential verification. Record as `Block` (not `NG`) any case whose outcome depends on the actual identity-provider round-trip — this includes User Story 1's full happy path and the credential-verification step of User Story 2's happy path. What IS testable and must be run as real cases: the always-visible dual-option layout, client-side required-field validation (FR-010), the banner states driven by page state/query-param rather than a live auth call (session-expired, locked, domain-unregistered — these can be simulated by mocking the auth response or by direct navigation to the state, per how the prototype's `variant` prop already models them), the generic-error and malformed-response handling (mock the auth call's response shape), and the already-authenticated-redirect check (FR-009).
- **Roles/credentials**: Needs one active email/password-based staff account (for the real credential-mismatch/lockout cases, mocked), one deactivated/unregistered identity (for FR-003), and a way to force the `locked` state without waiting out real lockout timing (seed the mock account as already locked, or use the prototype's `variant="locked"` state directly if the real app exposes an equivalent test hook).
- **BE-mocked caveats**: Lockout auto-expiry timing, real session-token issuance/renewal, and server-side session invalidation on logout are backend/mock-API concerns — verify what the mock API actually implements before marking a timing-dependent case `NG`; if the mock doesn't model lockout expiry at all, record it as `Block`.
- **Seed-reset points**: Reset the mock staff/session state between the locked-account case and any subsequent normal-login case, since a locked mock account must not leak into later cases.
- **Viewport**: Tablet-and-up (back-office CRM; no mobile layout in scope).

---

## Suggested Order

1. **Regular Login** — the only unit; within it, run the client-side validation and banner-state cases first (no auth dependency), then the mocked credential-mismatch/lockout/deactivated cases, leaving anything depending on a real Google/Cognito round-trip marked `Block` last.

---

## Definition of Done

- [ ] The TC document created under `specs/028-subsequent-login/tests/cases/`.
- [ ] Every FR-001…FR-011 traced to the unit (see Traceability Map — already confirmed complete, FR-007 scope caveat noted).
- [ ] Any gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` during authoring are fixed first, per the checklist-first workflow, before/alongside writing the case.
- [ ] The TC document has been executed at least once (`execute-testcases`) with OK/NG/Block recorded per case.
