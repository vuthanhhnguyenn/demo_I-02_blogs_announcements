# Feature Specification: Subsequent Login (AUTH-01 認証・ログイン)

**Feature Branch**: `028-subsequent-login`
**Created**: 2026-08-05
**Status**: Draft
**PO Spec**: `Y-13`（旧 `AUTH-01`） — 認証・ログイン _(covers only the regular, second-login-onward sign-in sub-flows: `CRMログイン（通常）`, `マジックリンクでログイン`, session-expired re-entry, account-lockout messaging, and logout — FR-M001, FR-M002 (excluding MFA), FR-M003, FR-M005, FR-S001, and the parts of FR-M007/FR-M008/FR-M009 that these screens must surface)_
**Source**: UI prototype (`login.tsx`, `magic-link-login.tsx`) + Requirement spec `Y-13.md` (認証・ログイン) + real API contract `openapi.real.json` (`Auth - CRM` tag) + existing implementation `specs/023-first-time-login/` (first-time login, used as the established pattern for Google/Cognito integration)
**Input**: User description: "Create spec for screen \"AUTH-01 認証・ログイン\". Screen Spec: requirements/AUTH-01.md. UI code: pages/login.tsx. API: Refer to the corresponding APIs defined in openapi.real.json and implement the screens by integrating them into the actual API flow. Scope: This scope only covers the login flow from the second login onward, using either Google or Cognito. The first-time login flow has already been completed and can be used as a reference."
**Amendment (2026-08-25)**: Added magic-link sign-in (`マジックリンクでログイン`, Y-13 FR-S001) to this feature's scope — user description: "prototype: `magic-link-login.tsx`, spec: `Y-13.md` — add the spec for sign-in via magic link". Magic link was previously listed in Assumptions as deferred; that deferral is now lifted and replaced by User Story 4, FR-012–FR-022, and SC-007–SC-010.

## User Scenarios _(mandatory)_

### User Story 1 - Returning staff member signs in with Google (Priority: P1)

A staff member whose account uses Google Workspace opens the CRM login page and signs in with one click using their Google account, landing on the CRM dashboard (or wherever they were headed before being asked to sign in).

**Why this priority**: Google sign-in is the primary, lowest-friction path for direct-store staff (the majority of daily logins) and must work standalone as a complete, valuable slice.

**Verification**: Open the login page, click "Googleでログイン", complete Google authentication with an account already linked to an active staff record, and confirm landing on the dashboard (or the originally requested page, if arriving via a redirect).

**Acceptance Scenarios**:

1. **Given** a staff member with an active account linked to Google, **When** they click "Googleでログイン" and complete Google authentication, **Then** they land on the CRM dashboard.
2. **Given** a staff member arrived at the login page after being redirected away from a specific CRM page they tried to open while signed out, **When** they successfully sign in with Google, **Then** they are returned to that original page rather than the dashboard.
3. **Given** a staff member's Google account email does not match any staff record (or matches a deactivated one), **When** Google authentication succeeds but the CRM rejects it, **Then** they see a message explaining their account is not registered/active in the CRM and to contact their administrator, and remain on the login page.
4. **Given** a staff member cancels or fails the Google sign-in prompt, **When** they return to the login page, **Then** they can retry immediately without any error state blocking them.

---

### User Story 2 - Returning staff member signs in with email and password (Priority: P1)

A staff member whose account uses the email/password sign-in path enters their email and password on the login page and signs in, landing on the CRM dashboard.

**Why this priority**: This is the only sign-in path for FC-store staff without a Google Workspace account, so it is equally load-bearing as Google sign-in and must independently deliver full login capability for that population.

**Verification**: Open the login page, enter a valid email and password for an email/password-based account, submit, and confirm landing on the dashboard.

**Acceptance Scenarios**:

1. **Given** a staff member with an active email/password account, **When** they enter the correct email and password and submit, **Then** they land on the CRM dashboard.
2. **Given** a staff member enters an incorrect email or password, **When** they submit, **Then** they see a single generic "incorrect email or password" message (without indicating which field is wrong) and can retry immediately on the same page.
3. **Given** a staff member's account has been temporarily locked after repeated failed attempts, **When** they attempt to sign in (or land on the page already locked), **Then** they see a message stating the account is temporarily locked and will unlock automatically, and the form does not accept further submissions until it is unlocked.
4. **Given** a staff member's account is deactivated, **When** they submit correct credentials, **Then** they see the same "account not registered/active — contact your administrator" message as in User Story 1, not the generic incorrect-credentials message.

---

### User Story 3 - Session expiration and sign-out (Priority: P2)

While using the CRM, a staff member's session eventually ends — either because it timed out from inactivity or because they explicitly signed out — and they are returned to the login page with a clear indication of why, then can sign back in through either path above.

**Why this priority**: Necessary for a complete, trustworthy login lifecycle (sessions must end somewhere, and staff need to know why they were signed out), but it depends on Story 1/2 being in place to be meaningful and is not itself a new sign-in path.

**Verification**: Trigger a session timeout (or use the header "ログアウト" action) and confirm the staff member is returned to the login page; for the timeout case, confirm an explanatory message is shown; for explicit logout, confirm signing back in works normally.

**Acceptance Scenarios**:

1. **Given** a signed-in staff member chooses "ログアウト" from the header user menu, **When** the action completes, **Then** their session is invalidated on the server and they are returned to the login page.
2. **Given** a staff member's session has expired (their access token could not be renewed), **When** they next interact with the CRM, **Then** they are redirected to the login page with a message stating their session expired and to sign in again.
3. **Given** a staff member is on the login page due to session expiration, **When** they sign in again successfully (Google or email/password), **Then** they proceed normally per User Story 1/2.

---

### User Story 4 - Returning staff member signs in via a magic link (Priority: P3)

A staff member who cannot (or does not want to) type a password opens the login page, follows "マジックリンクでログイン", enters their email address, and receives a one-time sign-in link by email; opening that link signs them straight into the CRM without a password.

**Why this priority**: A convenience/recovery path rather than a primary one — the requirement spec classifies it as a "Should" (FR-S001), and it only becomes meaningful once the primary sign-in paths (Stories 1 and 2) exist. It is nonetheless independently valuable and testable: it gives email/password staff a way in when their password is unavailable, without involving an administrator.

**Verification**: From the login page, follow "マジックリンクでログイン", submit the email address of an active staff account, confirm the "link sent" acknowledgement appears, open the emailed link, and confirm landing signed-in on the CRM dashboard.

**Acceptance Scenarios**:

1. **Given** a staff member on the login page, **When** they choose "マジックリンクでログイン", **Then** they reach a dedicated screen asking only for their email address, with a way back to the normal login page.
2. **Given** a staff member on the magic-link screen, **When** they submit the email address of an active staff account, **Then** the screen replaces the form with a confirmation naming the address the link was sent to, and stating that the link is valid for 15 minutes and can be used only once.
3. **Given** a staff member submits an email address that belongs to no staff account (or to a deactivated one), **When** the request completes, **Then** they see the exact same confirmation as in scenario 2 — the screen never reveals whether the address is a real staff account — but no usable link is delivered.
4. **Given** a staff member submits an empty or malformed email address, **When** they attempt to send, **Then** the field is flagged with a validation message and no request is sent.
5. **Given** a staff member is on the confirmation state, **When** they choose to resend, **Then** resending is blocked for a short cooldown (with a visible countdown) and, once allowed, a fresh link is sent while any previously sent link stops working.
6. **Given** a staff member opens a valid, unused, unexpired magic link, **When** it is accepted, **Then** they are signed in and land on the CRM dashboard with the same role and store scope they would have had via any other sign-in path.
7. **Given** a staff member opens a magic link that is expired, already used, or otherwise not valid, **When** it is rejected, **Then** they are returned to the login page with a single message that does not distinguish which of those cases occurred, and they can request a new link immediately.
8. **Given** a staff member's account has been deactivated between requesting the link and opening it, **When** they open an otherwise-valid link, **Then** they see the "account not registered/active — contact your administrator" message rather than the invalid-link message.

### Edge Cases

- What happens when a staff member who normally uses Google instead tries the email/password form (or vice versa)? They are not the intended path for that account, so the attempt is treated as a normal authentication failure for whichever path they tried (generic incorrect-credentials message for email/password; the "not registered" message for Google if their email has no email/password credential on file) — the system does not need to explain that they used the "wrong" method.
- What happens if a staff member is already signed in and navigates directly to the login page? They are redirected straight to the dashboard without seeing the login form (consistent with existing behavior for already-authenticated visits to public-only pages).
- What happens if the sign-in request succeeds but the response cannot be understood (malformed/missing tokens)? The staff member sees a generic "something went wrong, please try again" message and remains on the login page; no partial session is stored.
- What happens if a staff member submits the email/password form with an empty email or password? Submission is blocked client-side with a field-level validation message; no request is sent.
- What happens if a staff member's account was invited but has never completed first-time login, and they land on this regular login page instead? Out of scope for this feature to detect or redirect specially — first-time login is reached only via its own invitation link, per the existing first-time-login feature; this page assumes a staff member has already completed that flow at least once.
- What happens when a magic link is opened on a different device or browser than the one that requested it? It still works — the link carries everything needed to sign in, and no state from the requesting browser is required. Because there is no remembered destination in that browser, the staff member lands on the dashboard rather than on any previously attempted page.
- What happens when the same magic link is opened a second time (e.g. the staff member re-clicks the email)? The second attempt is rejected exactly like an expired or invalid link, with the same indistinguishable message; the first, already-established session is unaffected.
- What happens when a staff member requests a second magic link before using the first? Only the newest link works; the earlier one stops working immediately, and opening it produces the same invalid-link message.
- What happens when a staff member whose account is temporarily locked from repeated password failures requests a magic link? The request is accepted and the link works — the lockout guards the password path specifically, and magic link uses no password (mirroring how password reset stays available during a lockout).
- What happens when a Google-path staff member requests a magic link? The request is accepted the same way as for any other active staff account; the screen's own guidance notes the feature is intended for email/password staff, but the system does not refuse or single out Google-path accounts (which would also disclose account information).
- What happens if the request to send the link cannot be completed at all (e.g. the service is unreachable)? The staff member stays on the input form with a generic, retry-able error rather than a false "link sent" confirmation.
- What happens if a staff member leaves the confirmation state and returns to the magic-link screen? They see the empty input form again; the resend cooldown is not carried across visits, and requesting again simply issues a fresh link (invalidating the previous one).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST let a staff member sign in with a linked Google account from the login page ("経路①").
- **FR-002**: System MUST let a staff member sign in with an email address and password from the login page ("経路②"), with both the Google option and the email/password form always visible together (the system does not ask the staff member to pick a method in advance).
- **FR-003**: System MUST reject a sign-in attempt whose authenticated identity does not correspond to an active staff record, and MUST show a message directing the staff member to contact their administrator, distinct from a generic incorrect-credentials message.
- **FR-004**: System MUST show a single, generic "incorrect email address or password" message for a failed email/password attempt, without revealing which field is wrong.
- **FR-005**: System MUST show a distinct "account temporarily locked" message when a staff member's account is locked from repeated failed attempts, and MUST prevent further sign-in submissions for that account until it unlocks. The lockout is enforced by Cognito (1 s after 5 failures, doubling per further failure, max ~15 min — API-069 v0.10 §14.2), so the message MUST NOT promise a fixed 15-minute unlock; exact copy: 「アカウントが一時的にロックされています。しばらく待ってからもう一度お試しください（最大で約15分）。」 (Y-13 Bug-07).
- **FR-006**: System MUST, upon a successful sign-in (Google or email/password), establish a session and take the staff member to the CRM page they had originally tried to reach before being sent to the login page, or to the dashboard if there was none.
- **FR-007**: System MUST let a signed-in staff member explicitly sign out from the header user menu, which MUST invalidate their session on the server (not just clear local state), then return them to the login page.
- **FR-008**: System MUST redirect a staff member to the login page with a "your session has expired, please sign in again" message whenever their session can no longer be kept alive (e.g., renewal fails), and MUST let them sign in again immediately from that same page.
- **FR-009**: System MUST prevent an already-signed-in staff member from viewing the login page; visiting it MUST send them directly into the CRM instead.
- **FR-010**: System MUST validate that the email and password fields are both filled in before allowing an email/password submission, giving field-level feedback otherwise. The email field is capped at 128 characters (the Cognito username limit, API-070 §3.5.6); a longer value shows 「メールアドレスは128文字以内で入力してください」 and no Cognito call is made.
- **FR-011**: System MUST show a generic retry-able error, and MUST NOT store or apply a partial session, when a sign-in attempt succeeds at the identity-provider step but the CRM's own response cannot be processed.

_Magic-link sign-in (Y-13 FR-S001):_

- **FR-012**: System MUST offer a "マジックリンクでログイン" entry point on the login page that leads to a dedicated magic-link request screen, and that screen MUST offer a way back to the normal login page.
- **FR-013**: The magic-link request screen MUST ask for an email address and nothing else, and MUST block submission with a field-level validation message when the address is empty or not a well-formed email address.
- **FR-014**: System MUST return the identical "link sent" acknowledgement for every well-formed address submitted, whether or not it belongs to an active staff account, and MUST NOT expose anywhere on the screen whether the address matched a staff account.
- **FR-015**: The acknowledgement MUST name the address the link was sent to and MUST state that the link expires after 15 minutes and can be used only once.
- **FR-016**: System MUST let the staff member request the link again from the acknowledgement state, MUST prevent a repeat request for one minute after each send, and MUST show the remaining seconds of that cooldown on the resend control while it is blocked.
- **FR-017**: System MUST invalidate any previously issued, still-pending magic link whenever a new one is issued for the same address, so that at most one link is usable at a time.
- **FR-018**: System MUST sign the staff member in and take them to the CRM dashboard when a valid, unexpired, unused magic link is opened, establishing a session equivalent in role, store scope, and lifetime to one established through the Google or email/password paths.
- **FR-019**: System MUST reject an expired, already-used, or otherwise invalid magic link with a single message that does not distinguish between those cases, MUST leave the staff member on the login page, and MUST let them request a new link without any further waiting.
- **FR-020**: System MUST show the "account not registered/active — contact your administrator" message (the same one used in FR-003) when a magic link is opened for a staff member whose account is no longer active, distinct from the invalid-link message of FR-019.
- **FR-021**: System MUST show a generic, retry-able error and keep the input form intact — never a "link sent" acknowledgement — when the request to issue a link cannot be completed.
- **FR-022**: System MUST prevent an already-signed-in staff member from viewing the magic-link request screen, sending them directly into the CRM instead (consistent with FR-009).

### Key Entities

- **Staff Session**: The signed-in state established after a successful Google or email/password sign-in — represents which staff member is active, what role they hold, and until when the session stays valid without re-authentication.
- **Sign-in Attempt**: A single try to authenticate via Google, email/password, or a magic link; outcomes are success, incorrect credentials, account not registered/active, temporarily locked, or (magic link only) invalid/expired/already-used link.
- **Magic Link**: A one-time, time-limited sign-in link mailed to a staff member's address on request — valid for 15 minutes, usable exactly once, and superseded (made unusable) as soon as a newer link is issued for the same address.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A returning staff member with valid Google credentials can go from opening the login page to reaching the dashboard in under 15 seconds under normal conditions.
- **SC-002**: A returning staff member with valid email/password credentials can go from opening the login page to reaching the dashboard in under 30 seconds under normal conditions.
- **SC-003**: 100% of sign-in attempts against a deactivated or unregistered identity result in the "contact your administrator" message rather than the generic incorrect-credentials message, verified across both Google and email/password paths.
- **SC-004**: 100% of sign-in attempts against a locked account are blocked with the lockout message rather than being forwarded as a normal authentication attempt.
- **SC-005**: 100% of staff members redirected to login mid-session (expired session) see the "session expired" explanation rather than a bare, unexplained login form.
- **SC-006**: Explicit sign-out ends the staff member's server-side session such that any previously issued access is no longer usable after sign-out.
- **SC-007**: A staff member can go from the login page to a submitted magic-link request in under 30 seconds, and opening the received link reaches the dashboard in under 15 seconds under normal conditions.
- **SC-008**: 100% of magic-link requests for well-formed addresses produce an identical acknowledgement, verified by comparing the screen for a real staff address against an address belonging to no staff account — the two are indistinguishable in wording and layout.
- **SC-009**: 100% of expired, already-used, and superseded magic links are refused with the same single message, with no case distinguishable from the others by the staff member.
- **SC-010**: A magic-link sign-in and an email/password sign-in for the same staff member produce the same role and store scope in the CRM, verified by comparing what the two sessions can see and do.

## Assumptions

- Multi-factor authentication (a second, code-based verification step) shown in the UI prototype's flow is not yet supported end-to-end by the real system (sign-in currently completes right after identity-provider verification, with no second step), and its introduction is an explicitly undecided item (`Y-13-Q01`) in the requirement spec; it is therefore excluded from this feature's scope and will be added later once that decision is made and supported.
- Self-service "forgot password" reset is reachable from a link on the login screen in the UI prototype but is out of scope here — it is specified separately (`specs/029-password-reset/`); the link remains visually present but is not wired to a working flow by this feature. The sibling "マジックリンクでログイン" link **is** in scope as of the 2026-08-25 amendment (User Story 4).
- The magic-link request screen makes no attempt to determine which sign-in path an address belongs to before sending — doing so would require disclosing account information on a screen that is deliberately non-disclosing (FR-014). The screen carries explanatory copy noting the feature is intended for email/password ("経路②") staff, but that is guidance, not enforcement.
- The 15-minute validity and single-use nature of a magic link are treated as fixed product rules taken from the requirement spec (Y-13 FR-S001), not as configurable settings; the resend cooldown (one minute, per the UI prototype) is an anti-abuse affordance on the screen rather than a requirement-spec rule, and is the one value here that may be tuned without a spec change.
- Administrator-initiated magic links — the "マジックリンク発行" action on the Y-01 staff detail screen, which lets HQ issue a link on a staff member's behalf (Y-13 FR-S001 発行経路2) — are out of scope for this feature, which covers only staff self-service issuance from the login screen. A link issued through that administrator route is nonetheless expected to be consumed by the same link-opening flow specified here (FR-018 to FR-020).
- Magic-link sign-in does not return the staff member to a page they were trying to reach before being asked to sign in (unlike FR-006): the link is commonly opened from an email client in a different browser or device, where no such destination is known, so the dashboard is the consistent landing place.
- Delivery of the email itself (formatting, sender, deliverability, retries) is owned by the notification/mail infrastructure, not by this feature; this feature is responsible only for requesting a link, for what the requesting screen shows, and for what happens when a link is opened.
- Which sign-in path (Google vs. email/password) a given staff member should use is not looked up ahead of time on this screen (unlike the first-time-login screen, which knows the provider from the invitation); both options are always shown together, and each provider's own verification naturally rejects an attempt through the non-applicable path.
- Session auto-renewal (silent refresh while the staff member is active) is already handled by existing shared request-handling code and is not introduced by this feature; this feature is only responsible for what the login page shows when that renewal has definitively failed.
- "Session expired" and "account locked" are surfaced as page states reachable via how the staff member arrives at the login page (e.g., redirected after a failed renewal, or after a failed sign-in against a locked account); this feature does not define new mechanisms elsewhere in the app for detecting every possible cause of expiry beyond what already exists.
- Login history/audit logging (FR-M009 in the requirement spec) and administrator-side session/lockout management (viewing active sessions, manually unlocking accounts) are back-office capabilities belonging to staff management, not to this login screen, and are out of scope here.
