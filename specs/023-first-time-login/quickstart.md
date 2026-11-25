# Quickstart: Manual Verification — First-Time Login (AUTH-01)

Per the project's No Testing Policy, this checklist is the QA gate for this feature — no automated tests exist or should be added.

## Prerequisites

- `NEXT_PUBLIC_REAL_API_URL` pointing at a running fitness-api instance.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set to a Google Cloud OAuth 2.0 Client ID with the CRM's dev origin authorized.
- `NEXT_PUBLIC_COGNITO_CLIENT_ID` and `NEXT_PUBLIC_COGNITO_REGION` set to a Cognito User Pool App Client with `USER_PASSWORD_AUTH` enabled.
- A staff invitation issued by an administrator (via `Y-01 スタッフ・権限管理`) for a `cognito`-provider staff account, and a second one for a `google`-provider account, each producing a first-time-login link (`/login-initial?token=...`).

## User Story 1 — Temporary password (P1)

1. Open the Cognito-provider invitation link. Confirm the email field shows the invited address and is not editable.
2. Enter the wrong temporary password → confirm an inline error appears and the form stays usable (FR-009).
3. Enter the correct temporary password → confirm the screen switches to "set a new password" without a URL change or full reload.
4. Try a new password that fails one requirement (e.g., 7 characters) → confirm the submit button stays disabled and the unmet requirement's icon is not a checkmark (FR-005, FR-006).
5. Enter a new password meeting all four requirements but a mismatched confirmation → confirm the mismatch message appears and submit stays blocked.
6. Enter a valid, matching new password → submit → confirm navigation to the completion screen (FR-007).
7. Click "ダッシュボードへ進む" → confirm you land in the authenticated app (session cookie present, dashboard loads).
8. Re-open the same invitation link → confirm it now shows the "invitation no longer valid" state (FR-008/SC-004).

## User Story 2 — Google account (P2)

1. Open the Google-provider invitation link → confirm the Google button (not an email/password form) is shown.
2. Cancel the Google sign-in popup → confirm you remain on the login screen, able to retry.
3. Complete Google sign-in successfully → confirm direct navigation to the completion screen with no password step shown.

## User Story 3 — Expired / invalid link (P2)

1. Open a link with an expired token → confirm the "招待リンクの有効期限が切れています" message, no form, no retry button (FR-003).
2. Open a link with a token that was already consumed in User Story 1 → confirm the same message.
3. Ask an administrator to re-invite the same staff member (revoking the old token), then open the old link → confirm the same message.

## Edge cases

1. Open a link for a staff account an administrator has since deactivated → confirm the "contact your administrator" account-status message, distinct from the generic retry error (FR-010).
2. During User Story 1 step 6, simulate a network failure (e.g., dev tools offline mode) on the `crm/login` call → confirm a generic retryable error, and that the invitation link is still valid afterward (edge case in `spec.md`).
3. Open `/login-initial` with no `token` query param at all → confirm it renders the same `[expired]` state as a genuinely expired token.

## Sign-off

All items above pass → feature is ready for code review per the constitution's Merge Request gate. No automated test suite to run.
