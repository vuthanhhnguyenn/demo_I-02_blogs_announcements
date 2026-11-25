# Feature Specification: First-Time Login (AUTH-01 認証・ログイン)

**Feature Branch**: `023-first-time-login`
**Created**: 2026-08-03
**Status**: Draft
**PO Spec**: `AUTH-01` — 認証・ログイン _(covers the first-time login sub-flows only: `CRMログイン（初回・正常）`, `CRMログイン（初回・期限切れ）`, `初回ログイン完了`, and the temporary-password-change step of FR-007)_
**Source**: UI prototype (`login-initial.tsx`, `login-initial-expired.tsx`, `login-initial-success.tsx`, `first-time-password-set.tsx`) + Requirement spec `AUTH-01.md`
**Input**: User description: "Create spec for screen \"AUTH-01 認証・ログイン\". Scope: the complete first-time login flow, covering the first-time login, expired invitation link, first-time login completion, and temporary password change (first-time password set) screens. The login flow for subsequent logins, the password reset flow, and domain management will be implemented later."

## User Scenarios _(mandatory)_

### User Story 1 - First-time login with a temporary password (Priority: P1)

A newly invited staff member receives an invitation email, opens the CRM first-time login link, and signs in with their invited email address (shown automatically) and the temporary password from the invitation. Because this is a temporary password, they are immediately required to choose a new personal password before they can continue. Once the new password is set, they see a confirmation that their account is ready and proceed into the CRM.

**Why this priority**: This is the primary onboarding path for the majority of invited staff and is the only path that also exercises the mandatory password-change step — without it, invited staff cannot gain access to the CRM at all.

**Verification**: Open the first-time login link for an invited staff account, confirm the invited email is shown and cannot be edited, sign in with the temporary password, set a new password that meets all strength requirements, and confirm the flow ends on the "first-time login complete" screen with access to the dashboard.

**Acceptance Scenarios**:

1. **Given** a staff member has a valid, unused invitation link, **When** they open the link, **Then** the login screen loads with their invited email address pre-filled and locked (not editable).
2. **Given** the staff member enters the correct temporary password and submits, **When** authentication succeeds, **Then** they are taken to a screen requiring them to set a new password before proceeding further.
3. **Given** the staff member enters a new password that meets all strength requirements and matches the confirmation field, **When** they submit, **Then** their password is updated and they land on the first-time login completion screen.
4. **Given** the staff member is on the completion screen, **When** they choose to continue, **Then** they are taken into the main CRM application (dashboard).
5. **Given** the staff member enters an incorrect temporary password, **When** they submit, **Then** they see an error message and remain on the login screen able to retry.

---

### User Story 2 - First-time login with a Google account (Priority: P2)

An invited staff member whose account is configured for Google sign-in opens the first-time login link and signs in with their Google account in one step. Since there is no temporary password involved, they go straight from successful sign-in to the completion screen.

**Why this priority**: Provides a faster onboarding path for staff whose organization uses Google accounts, reducing setup friction, but it is a secondary path relative to the temporary-password flow which every non-Google-enabled invitee must use.

**Verification**: Open the first-time login link, choose "Sign in with Google", complete Google authentication, and confirm the flow lands directly on the first-time login completion screen without any password-setting step.

**Acceptance Scenarios**:

1. **Given** a staff member has a valid invitation link and a Google-linked account, **When** they choose to sign in with Google and authenticate successfully, **Then** they are taken directly to the first-time login completion screen (no password-change step is shown).
2. **Given** the Google sign-in attempt fails or is cancelled, **When** the staff member returns to the login screen, **Then** they can retry either sign-in option without needing a new invitation link.

---

### User Story 3 - Expired or invalid invitation link (Priority: P2)

A staff member opens a first-time login link that has already been used, has expired, or was revoked. Instead of a login form, they see a clear message explaining that the link is no longer valid and that they must ask their administrator for a new invitation.

**Why this priority**: Prevents confusion and failed login attempts for a meaningful share of invitations (links opened late, reused, or superseded by a re-invite), and sets the correct expectation that self-service recovery is not available.

**Verification**: Open a first-time login link that is expired, already used, or invalid, and confirm the screen shows the "link expired" message with no login form and no retry action, only guidance to contact the administrator.

**Acceptance Scenarios**:

1. **Given** a staff member opens a first-time login link that has expired, **When** the page loads, **Then** they see a message stating the invitation link has expired and to request a new invitation from the administrator, with no login fields shown.
2. **Given** a staff member opens a first-time login link that has already been used to complete a previous first-time login, **When** the page loads, **Then** they see the same "link no longer valid" message rather than being allowed to log in again through that link.
3. **Given** a staff member opens a first-time login link that was revoked (e.g., because the administrator issued a new invitation), **When** the page loads, **Then** they see the same "link no longer valid" message.

### Edge Cases

- What happens when the invitation link points to a staff record that no longer exists or has been deactivated since the invitation was issued? System denies the login attempt with a message indicating the account is not available and to contact the administrator.
- What happens when the staff member submits a new password that meets strength requirements but does not match the confirmation field? System blocks submission and shows a mismatch message until the fields match.
- What happens when the staff member closes the browser mid-flow (e.g., after setting a new password but before reaching the completion screen) and reopens the same invitation link? Because the invitation was already consumed, they see the "link no longer valid" message and must instead use the regular (subsequent-login) sign-in, which is out of scope here but must not be blocked by this flow.
- What happens if authentication (Google or temporary password) fails due to a temporary service problem rather than bad credentials? System shows a generic "something went wrong, please try again" message and keeps the invitation link usable for a retry.
- What happens when the staff member reaches the completion screen but never clicks through to the dashboard? Their session remains valid; revisiting the completion screen's link later is out of scope — normal application navigation takes over.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST let an invited staff member authenticate using either a linked Google account or an email address with a temporary password, for the purpose of completing first-time login.
- **FR-002**: System MUST verify the invitation link's token as soon as the first-time login screen loads, and when valid, pre-fill the invited email address as a read-only field.
- **FR-003**: System MUST replace the login form with a clear "invitation no longer valid" message — and no login fields or self-service retry — whenever the invitation token is missing, invalid, expired, revoked, or already used.
- **FR-004**: System MUST require staff who authenticate with a temporary password to set a new personal password immediately afterward, before they can access the rest of the CRM.
- **FR-005**: System MUST enforce that a new password contains at least 8 characters, includes both upper and lower case letters, includes at least one number, and includes at least one symbol, and MUST show the staff member real-time feedback on which of these requirements are currently met.
- **FR-006**: System MUST prevent the new-password form from being submitted until the new password satisfies every strength requirement and matches the confirmation entry exactly.
- **FR-007**: System MUST show a first-time login completion confirmation once authentication (and, when applicable, the new-password step) succeeds, and MUST let the staff member proceed from there into the main CRM application.
- **FR-008**: System MUST ensure an invitation link can be successfully consumed only once; any subsequent attempt to use the same link MUST be treated as invalid per FR-003.
- **FR-009**: System MUST show staff a clear, actionable error when a login attempt (Google or temporary password) fails due to incorrect or unverifiable credentials, distinct from the invitation-link-invalid message, and MUST allow them to retry without leaving the screen.
- **FR-010**: System MUST deny first-time login for a staff account that is not found or has been deactivated, and MUST show a message directing the staff member to contact their administrator.
- **FR-011**: System MUST reject a new password that matches any of the staff member's last 3 passwords (including the temporary password, Y-13 FR-M002), keep them on the new-password form, and show 「過去に使用したパスワードは設定できません。直近3回以内に使用したパスワード以外を設定してください。」 — not the generic retry message.

### Key Entities

- **Invitation**: Represents a one-time, time-limited first-time-login link issued to a staff member. Key attributes: the invited email address, the staff member it belongs to, its current state (usable / used / expired / revoked), and its expiry time.
- **Staff Account**: The staff member's identity record. Key attributes relevant to this flow: email address, sign-in method (Google-linked vs. temporary-password), active/deactivated status, and whether first-time login has been completed.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An invited staff member with a valid link can go from opening the first-time login link to reaching the dashboard in under 2 minutes, including setting a new password when required.
- **SC-002**: 100% of expired, revoked, or already-used invitation links result in the "invitation no longer valid" message rather than a login form, verified across all three invalidity causes.
- **SC-003**: 0% of new-password submissions that fail any of the four strength requirements or the confirmation match are able to proceed past the password-setting screen.
- **SC-004**: Each invitation link can be successfully used to complete first-time login exactly once; a second attempt with the same link never grants access.
- **SC-005**: Staff attempting first-time login with incorrect credentials receive an error message and can retry on the same screen without needing a new invitation.

## Assumptions

- New-password strength requirements for this flow are the same as those already defined for the standalone password-reset flow (8+ characters, upper and lower case, a number, and a symbol), so both flows present a consistent bar to staff.
- The invited email address shown on the first-time login screen is fixed to the address the invitation was issued to and cannot be changed by the staff member on this screen.
- Setting the new password during first-time login is performed as part of the authentication step itself (i.e., handled by the sign-in provider during the temporary-password exchange), not as a separate CRM data-update step — the CRM screen only collects and validates the new password before triggering that exchange.
- Issuing the invitation itself (an administrator inviting a staff member) and the separate "magic link" recovery flow for the mobile app are out of scope for this feature; this feature only covers a staff member's experience consuming a first-time login link they already received.
- Regular (subsequent) login, the self-service "forgot password" reset flow, and email-domain allow-list management are explicitly out of scope, as stated in the feature description, and will be specified separately.
