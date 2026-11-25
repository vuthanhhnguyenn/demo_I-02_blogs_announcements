# Contract: fitness-api — Auth CRM endpoints

Source of truth: `src/lib/openapi.real.json` (already generated into `src/lib/api-real`). This feature consumes these endpoints as-is — **no changes to the OpenAPI spec or generated client are made by this feature**.

## `GET /api/v1/auth/invite/verify`

Generated helper: `crmAuthControllerInviteVerifyOptions({ query: { token } })` (React Query `queryOptions`), class method `AuthCrm.crmAuthControllerInviteVerify`.

- **Query param**: `token` — 43-char base64url invitation token, taken verbatim from the `token` query param of the URL the staff member opened.
- **200** `CrmInviteVerifyResponseDto` → `{ authProvider: 'google' | 'cognito', email, staffName }`. Render `[login-form]` (FR-002).
- **400 / 404 / 410** → any of these renders `[expired]` (FR-003). The three distinct causes (not found / used / revoked / expired) are **not** disambiguated in the UI — all show the same "invitation no longer valid" message, per `AUTH-01.md` FR-003 ("リカバリ動線はテキスト案内のみ").

## `POST /api/v1/auth/crm/login`

Generated helper: `crmAuthControllerLoginMutation()` (React Query `UseMutationOptions`), class method `AuthCrm.crmAuthControllerLogin`.

- **Body** (`CrmLoginRequestDto`): `{ idToken: string, inviteToken?: string }`.
  - Google path: `idToken` = the GIS `credential` (see `research.md` R2). `inviteToken` = the `token` query param, always included on this screen (every call here is a first login).
  - Cognito path: `idToken` = the `AuthenticationResult.IdToken` returned by the Cognito `RespondToAuthChallenge` call (see `research.md` R3). `inviteToken` included, same as above.
- **200** `CrmLoginResponseDto` → `{ accessToken, refreshToken, expiresIn, staffId, role, isFirstLogin }`. Persist per `research.md` R5, then navigate to `/login-initial/success` (FR-007).
- **401** (`E-AUTH-032`, id_token verification failed) → inline error on whichever screen initiated the call (`[login-form]` for Google, `[set-new-password]` for Cognito after `RespondToAuthChallenge`), FR-009. Staff may retry.
- **403** (`E-AUTH-033` email not a staff record / `E-AUTH-034` deactivated staff) → render the deactivated/not-found guidance from FR-010 ("contact your administrator"), not the generic FR-009 retry message — this is an account-status failure, not a credentials failure.
- **404 / 410** (invite token invalid at this later point — e.g., consumed by a concurrent tab) → treat identically to the `/login-initial` `[expired]` state (FR-008): show the "invitation no longer valid" message.
- **400** (`E-VAL-001`) → not reachable through normal UI use (both `idToken` and, when present, `inviteToken` are always non-empty strings by construction); no dedicated UI state required.

Not used by this feature (out of scope): `POST /api/v1/auth/crm/logout` (belongs to the subsequent-login/session-management feature).

---

# Contract: External identity providers (not part of `openapi.real.json`)

These are third-party contracts this feature's frontend calls directly, per `research.md` R2/R3. They are documented here because the CRM screens' correctness depends on them, even though they are not fitness-api endpoints.

## Google Identity Services — Sign-In-With-Google

- Script: `https://accounts.google.com/gsi/client`.
- `google.accounts.id.initialize({ client_id: NEXT_PUBLIC_GOOGLE_CLIENT_ID, callback })`; render the button inside `[login-form]` when `authProvider === 'google'`.
- `callback({ credential })` → `credential` is the ID token JWT; pass through verbatim as `CrmLoginRequestDto.idToken`.
- Failure / user cancellation → GIS does not invoke `callback`; the button simply becomes interactive again — no separate error state to build (FR-009's "cancelled" scenario is naturally satisfied by GIS's own behavior).

## Amazon Cognito — `InitiateAuth` / `RespondToAuthChallenge`

Base: `POST https://cognito-idp.${NEXT_PUBLIC_COGNITO_REGION}.amazonaws.com/`, `Content-Type: application/x-amz-json-1.1`.

**Step 1 — temporary password**, header `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth`:

```json
{
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "<NEXT_PUBLIC_COGNITO_CLIENT_ID>",
  "AuthParameters": { "USERNAME": "<invited email>", "PASSWORD": "<temporary password>" }
}
```

- Response `ChallengeName: "NEW_PASSWORD_REQUIRED"` + `Session` → move to `[set-new-password]`, holding `{ username, session, inviteToken }` (`CognitoChallengeState`).
- Response `AuthenticationResult.IdToken` directly (no challenge) → proceed straight to `crmAuthControllerLogin` (defensive path; not expected on a true first login).
- Error (`NotAuthorizedException`, wrong password) → inline error on `[login-form]` (FR-009).

**Step 2 — set new password**, header `X-Amz-Target: AWSCognitoIdentityProviderService.RespondToAuthChallenge`:

```json
{
  "ChallengeName": "NEW_PASSWORD_REQUIRED",
  "ClientId": "<NEXT_PUBLIC_COGNITO_CLIENT_ID>",
  "ChallengeResponses": { "USERNAME": "<username from step 1>", "NEW_PASSWORD": "<new password>" },
  "Session": "<session from step 1>"
}
```

- Response `AuthenticationResult.IdToken` → call `crmAuthControllerLoginMutation({ idToken, inviteToken })` (FR-004 → FR-007).
- Error (`InvalidPasswordException`, policy mismatch) → should not occur given FR-005's client-side strength gate matches the Cognito User Pool policy; if it does, show the same inline error pattern as FR-009 rather than a silent failure.
- Error (`PasswordHistoryPolicyViolationException`, new password reuses one of the last 3 — including the temporary password itself) → inline `PASSWORD_REUSED_MESSAGE` 「過去に使用したパスワードは設定できません。直近3回以内に使用したパスワード以外を設定してください。」 on `[set-new-password]`, staff stays on the form and may retry (FR-011).
