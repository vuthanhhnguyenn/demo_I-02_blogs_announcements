# Contract: Amazon Cognito — public `ForgotPassword` / `ConfirmForgotPassword` actions

Source of truth: Cognito's public, unauthenticated User Pool API (`AWSCognitoIdentityProviderService.{Action}` over HTTPS `POST`), called directly from the browser via the existing `callCognito` helper in `src/hooks/use-cognito-auth.ts` — the same mechanism `023-first-time-login`/`028-subsequent-login` already use for `InitiateAuth`/`RespondToAuthChallenge`. **This feature makes no fitness-api or mock-db changes** — see `research.md` R1. `use-cognito-auth.ts` gains two new exported functions; no new file, no new npm dependency.

## `ForgotPassword` (request screen — `/password-reset`)

- **Request**: `{ ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID, Username: email }` — same `ClientId` env var already used by `InitiateAuth`. `Username` is capped at 128 characters by Cognito (a longer one returns 400 `InvalidParameterException`), so the form rejects >128 client-side with 「メールアドレスは128文字以内で入力してください」 and never sends it (`COGNITO_EMAIL_MAX_LENGTH`, Y-13 Bug-13).
- **200** `{ CodeDeliveryDetails: { Destination, DeliveryMedium, AttributeName } }` → `phase = 'sent'`, start the 60s cooldown (spec.md FR-004).
- **Account-state rejections** — `UserNotFoundException`, `InvalidParameterException` (no verified email/phone to deliver to), `NotAuthorizedException` (e.g. disabled user), `UserLambdaValidationException` → treated identically to 200: `phase = 'sent'`. Never surfaced as an error (`research.md` R3, Y-13 FR-M006_L221).
- **Retryable send failures** — throttling/availability (`LimitExceededException`, `TooManyRequestsException`, `InternalErrorException`, `ServiceUnavailableException`) or a network failure → `sendError = 'retryable'` (「メールの送信に失敗しました。時間をおいて再度お試しください。」); stays on the form, no fake "sent" state.
- **Misconfigured send failures** — delivery (`CodeDeliveryFailureException`) or user pool delivery config/permissions (`InvalidEmailRoleAccessPolicyException`, `InvalidSmsRoleAccessPolicyException`, `InvalidSmsRoleTrustRelationshipException`, `InvalidLambdaResponseException`, `UnexpectedLambdaException`, `ResourceNotFoundException`, `OperationNotEnabledException`, `ForbiddenException`) → `sendError = 'misconfigured'` (「メールの送信に失敗しました。管理者にお問い合わせください。」); retrying cannot fix these. Stays on the form.

## `ConfirmForgotPassword` (set-password screen — `/password-set`)

- **Request**: `{ ClientId, Username: email, ConfirmationCode: code, Password: newPassword }` — `email`/`code` come from the `/password-set` URL's query params (`data-model.md` `ResetLinkParams`), never a visible form field (`research.md` R2); `newPassword` comes from the shared `PasswordSetForm`'s already-policy-validated value.
- **200** (empty body) → `phase = 'done'`. All of the user's previously issued tokens are revoked by Cognito automatically as part of a password reset (`research.md` R4) — no extra sign-out call is made.
- **`ExpiredCodeException`** / **`CodeMismatchException`** / **`UserNotFoundException`** → `phase = 'expired'` (spec.md FR-009). These are collapsed into one state because the spec does not require distinguishing _why_ a link no longer works, only that it doesn't.
- **`LimitExceededException`** (AWS per-user hourly attempt cap, shared by `ForgotPassword` and `ConfirmForgotPassword`) → inline 「試行回数の上限に達しました。しばらく時間をおいてから再度お試しください。」 banner, stays on `phase = 'form'` (spec.md FR-012). Not `expired`: the code is still valid once the cap lifts, and sending the user back to request another mail only burns more of the same quota (Y-13 Bug-02).
- **`PasswordHistoryPolicyViolationException`** (new password matches one of the last 3 — Cognito password history = 3, i.e. current + 2 previous) → inline `PASSWORD_REUSED_MESSAGE` 「過去に使用したパスワードは設定できません。直近3回以内に使用したパスワード以外を設定してください。」 banner, stays on `phase = 'form'` (spec.md FR-011). The password is not changed.
- **`InvalidPasswordException`** → inline `PASSWORD_POLICY_REJECTED_MESSAGE` banner, stays on `phase = 'form'` — not treated as an expired link, since the code itself was valid.
- Any other error → inline 「パスワードの設定に失敗しました。もう一度お試しください。」 banner, stays on `phase = 'form'`.

## Missing/malformed URL params

If `email` or `code` is absent or empty (or `email` is longer than 128 characters, which no Cognito-issued link can contain) when `/password-set` mounts, the screen renders `phase = 'expired'` directly — **no Cognito call is made**. A hand-edited or truncated URL is indistinguishable, by design, from a link that has already expired (spec.md Story 2 Scenario 6, edge case "navigates to the set-new-password screen without ever requesting a reset").

## Env vars (all pre-existing, no new configuration)

`NEXT_PUBLIC_COGNITO_REGION`, `NEXT_PUBLIC_COGNITO_ENDPOINT`, `NEXT_PUBLIC_COGNITO_CLIENT_ID` — the same three already read by `use-cognito-auth.ts` for `InitiateAuth`.

## External dependency (infrastructure, not application code)

The Cognito User Pool's forgot-password message template must embed the confirmation code and username into a link pointing at this app's `/password-set` route (`research.md` R2) — e.g. `.../password-set?email={username}&code={####}` — instead of Cognito's default plain-code email copy. This is a Cognito-console/IaC configuration task outside this repository, tracked here as a dependency this feature's UX assumes is in place, the same way `028-subsequent-login` already assumes the User Pool's lockout and existence-error settings are configured.
