# Feature Specification: Forgot Password (Password Reset)

**Feature Branch**: `029-password-reset`
**Created**: 2026-08-17
**Status**: Draft
**PO Spec**: `Y-13` — 認証・ログイン _(covers only FR-M006 パスワードリセット — the self-service "forgot password" sub-flow for staff who sign in via email + password (経路②); Google SSO staff are out of scope per FR-M006's own routing note)_
**Source**: UI prototypes (`password-reset.tsx`, `password-set.tsx`, `login.tsx`) + Requirement spec `Y-13.md` (認証・ログイン, FR-M006) + existing implementation `specs/028-subsequent-login/` (regular login, which explicitly deferred this flow and left the "パスワードをお忘れの方" link present but unwired)
**Input**: User description: "create spec for forgot password. spec: Y-13.md. prototype design: password-reset.tsx, login.tsx" (later expanded by the user to also include `password-set.tsx`, the "set new password" screen reached from the reset email link)

## User Scenarios _(mandatory)_

### User Story 1 - Staff member requests a password reset link (Priority: P1)

A staff member who signed in with email + password but forgot their password goes to the login page, follows "パスワードをお忘れの方", enters their email address, and receives a confirmation that a reset link has been sent.

**Why this priority**: This is the entry point of the whole flow and the only part visible to every requester regardless of whether their email is actually registered; it must work standalone before any later step matters.

**Verification**: From the login page, click "パスワードをお忘れの方", submit a registered email address, and confirm a "メールを送信しました" confirmation appears with a resend option.

**Acceptance Scenarios**:

1. **Given** a staff member is on the login page, **When** they click "パスワードをお忘れの方", **Then** they are taken to the password-reset request screen.
2. **Given** the staff member enters a syntactically valid, registered email address and submits, **When** the request completes, **Then** they see a confirmation state naming the email address the link was sent to, with a "メールを再送信" action.
3. **Given** the staff member enters an email address that has no matching staff record, **When** they submit, **Then** they see the exact same confirmation state as for a registered address (no indication of whether the account exists).
4. **Given** the staff member enters text that is not a validly formatted email address, **When** they submit, **Then** submission is blocked with a field-level "正しいメールアドレスを入力してください" message and no request is sent.
5. **Given** the staff member is on the confirmation state, **When** they click "メールを再送信" before a 60-second cooldown elapses, **Then** the action is disabled and shows the remaining wait time; once the cooldown reaches zero, they can resend.
6. **Given** the staff member is on the password-reset request screen, **When** they click "ログインに戻る", **Then** they return to the login page.

---

### User Story 2 - Staff member sets a new password from the reset link (Priority: P1)

A staff member who requested a reset link opens it from their email and sets a new password that meets the password policy, then is told to sign in with it.

**Why this priority**: Without this step the reset request from Story 1 has no effect — the two stories together deliver the complete, minimum viable "forgot password" capability.

**Verification**: Open a valid, unused reset link, enter a new password meeting all policy rules plus a matching confirmation, submit, and confirm a success screen appears with a way back to login.

**Acceptance Scenarios**:

1. **Given** a staff member opens a valid, unused, unexpired reset link, **When** the page loads, **Then** they see a "新しいパスワードを設定" form with a new-password field, a live checklist of the three policy rules (8+ characters; upper and lower case; a number), a strength indicator, and a confirmation field.
2. **Given** the staff member types a new password, **When** each policy rule becomes satisfied, **Then** its checklist item updates to a satisfied state immediately (no submission required).
3. **Given** the staff member's confirmation field does not match the new password, **When** they have typed something in the confirmation field, **Then** a "パスワードが一致しません" message appears and submission remains blocked.
4. **Given** the new password satisfies every policy rule and the confirmation matches, **When** the staff member submits, **Then** their password is updated, all of that staff member's existing sessions are invalidated, and they see a "パスワードを設定しました" success screen with a link to the login page.
5. **Given** the new password does not yet satisfy every policy rule, or the confirmation field is empty or mismatched, **When** the staff member looks at the submit control, **Then** it is disabled and no submission can occur.
6. **Given** a staff member opens a reset link that has already expired or already been used, **When** the page loads, **Then** they see a "リンクが無効または期限切れです" state instead of the password form, with an action that starts a new reset request.

---

### User Story 3 - Google SSO staff member is redirected to the right password-change path (Priority: P3)

A staff member who normally signs in with a Google Workspace account and mistakenly tries the CRM's password-reset flow is told that their password lives on Google's side, not the CRM's.

**Why this priority**: A minority, edge-of-scope case relative to Stories 1–2, but necessary so this feature doesn't silently mislead Google SSO staff into thinking they can reset a CRM-managed password they don't have.

**Verification**: With a Google SSO account's email, submit the password-reset request form and confirm the standard confirmation copy is shown (per Story 1's identical-response requirement) alongside/near the existing on-screen note directing Google-SSO users to google.com; separately, confirm the login page's own guidance text remains visible.

**Acceptance Scenarios**:

1. **Given** the password-reset request screen, **When** it is displayed (regardless of what email will be entered), **Then** a persistent note is shown stating that staff who sign in with a Google account should change their password at google.com instead.
2. **Given** a Google-SSO staff member submits their email on this screen, **When** the request completes, **Then** they see the same generic "メールを送信しました" confirmation as any other requester (consistent with Story 1's non-disclosure behavior) — the system does not need to detect or special-case their account type at submission time.

### Edge Cases

- What happens if the staff member closes the browser tab after requesting a reset link and reopens the emailed link later? As long as the link has not expired or already been used, the "set new password" form loads normally (Story 2, Scenario 1).
- What happens if a staff member submits the reset-request form multiple times in quick succession from different tabs/devices? Each valid request issues its own link; the most recently issued unused link should work, per Scenario 2's "one link, one password change" model — links do not need to invalidate sibling links from the same requester.
- What happens if the staff member uses a reset link a second time after already completing Story 2 once with it? It is treated as already-used, showing the same "invalid or expired" state as an expired link (Story 2, Scenario 6).
- What happens if the staff member navigates to the "set new password" screen without ever requesting a reset (no token, or a malformed one)? Treated the same as an expired/invalid link — the "invalid or expired" state, never the password form.
- What happens on the login page while this feature is inactive/unreachable for a given staff member? Out of scope for this feature to change; the login page itself (redirect target, session-expired/locked-account states, Google/email sign-in) is covered by `specs/028-subsequent-login/`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST let a staff member reach a password-reset request screen from a link on the login page.
- **FR-002**: System MUST accept an email address on the request screen and, after submission, MUST show the identical confirmation message regardless of whether that email matches an active, email/password-based staff account (no account-existence disclosure).
- **FR-003**: System MUST validate that the submitted value is a syntactically well-formed email address of at most 128 characters (the Cognito username limit, API-070 §3.5.6 — this screen serves Cognito/経路② staff only) before sending any request, blocking submission with an inline message otherwise (over-length: 「メールアドレスは128文字以内で入力してください」, no Cognito call).
- **FR-004**: System MUST let the staff member trigger a resend of the reset email from the confirmation state, but MUST prevent resending again until a 60-second cooldown has elapsed since the previous send.
- **FR-005**: System MUST send, for a matching active email/password account, a one-time password-reset link that is valid for a limited time and becomes unusable after either that time elapses or the link is used once.
- **FR-006**: System MUST, when a staff member opens a still-valid, unused reset link, present a form to set a new password with a live-updating checklist of the password policy (minimum 8 characters; both upper- and lower-case letters; at least one number) and a field to confirm the new password.
- **FR-007**: System MUST prevent submitting the new password unless every policy rule is satisfied and the confirmation field exactly matches the new password.
- **FR-008**: System MUST, upon a successful password change, invalidate all of that staff member's existing sessions and show a success screen directing them back to the login page.
- **FR-009**: System MUST, when a staff member opens a reset link that is expired or already used, show an "invalid or expired link" state instead of the password form, with an action that starts a new reset request.
- **FR-010**: System MUST display a persistent note on the request screen advising staff who sign in via Google that their password must be changed at google.com instead, since this flow does not apply to their account.
- **FR-011**: System MUST reject a new password that matches any of the staff member's last 3 passwords (current + 2 previous, Y-13 FR-M002), leave the password unchanged, keep the staff member on the form, and show 「過去に使用したパスワードは設定できません。直近3回以内に使用したパスワード以外を設定してください。」 — not the generic retry message.
- **FR-012**: System MUST, when the identity provider's attempt limit is exceeded on the set-new-password screen, keep the staff member on the form and show 「試行回数の上限に達しました。しばらく時間をおいてから再度お試しください。」 instead of the "invalid or expired link" state, since the link becomes usable again once the limit lifts.

### Key Entities

- **Password Reset Request**: A single staff member's ask to reset their password, identified by the email address they submitted; results in a one-time reset link being issued for a matching account.
- **Password Reset Link (Token)**: A time-limited, single-use credential emailed to the staff member; its state is either valid/unused, expired, or already-used, and determines whether the "set new password" form or the "invalid or expired" state is shown.
- **Staff Password**: The credential used for a staff member's email/password (経路②) sign-in; subject to the policy (8+ characters, mixed case, at least one number) and, per `Y-13`, not reusable from the staff member's last 3 prior passwords.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member can go from clicking "パスワードをお忘れの方" to seeing the "メールを送信しました" confirmation in under 30 seconds under normal conditions.
- **SC-002**: A staff member with a valid reset link can go from opening that link to seeing the "パスワードを設定しました" success screen in under 60 seconds under normal conditions.
- **SC-003**: 100% of reset-request submissions show the identical confirmation message whether or not the submitted email matches a real account, verified across both cases.
- **SC-004**: 100% of attempts to reuse an already-used or expired reset link result in the "invalid or expired" state rather than the password-setting form.
- **SC-005**: 100% of successful password changes result in prior sessions for that staff member no longer being usable.

## Assumptions

- Only staff who sign in via email + password (経路②/IDaaS) can use this flow; the request screen accepts any email and always responds identically, but no reset link is actually issued for a Google-SSO-only account, consistent with `Y-13` FR-M006's own routing note and the on-screen guidance to use google.com instead.
- The email-sending mechanism, reset-link token format, and the identity provider issuing/validating that token are implementation concerns delegated to the existing IDaaS integration (per `Y-13`, the specific IDaaS provider is still pending a separate decision, `Y-13-Q03`) and are not defined by this feature.
- The reset link's specific expiry duration is treated as a short, single-digit-minutes-to-low-tens-of-minutes window consistent with the IDaaS-delegated flow described in `Y-13` FR-M006; the exact figure is an implementation detail, not a user-facing requirement here.
- "Password reuse of the last 3 generations is disallowed" (from `Y-13`'s FR-M002 password policy) applies to this flow's new-password submission as well, but is enforced server-side; this spec does not require the client to predict or preflight that check.
- Login-page states (redirect targing, session-expired banner, account-lockout banner, domain-unregistered banner, Google/email sign-in itself) are out of scope here and remain owned by `specs/028-subsequent-login/`; this feature only adds the request and set-new-password screens plus the login page's existing (already-present) link into this flow.
- Magic-link sign-in (`Y-13` FR-S001), also deferred by `specs/028-subsequent-login/`, is a separate, unrelated entry point and is not part of this feature.
