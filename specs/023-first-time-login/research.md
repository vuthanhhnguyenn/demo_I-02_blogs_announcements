# Research: First-Time Login (AUTH-01)

## R1. Which API client does this feature use — mock DB or the real backend?

**Decision**: Call the real backend directly via the generated `src/lib/api-real` client (`AuthCrm` class / `crmAuthControllerInviteVerifyOptions`, `crmAuthControllerLoginMutation`). Do **not** add a mock-db table for invitations or staff auth.

**Rationale**: The feature description explicitly asks to integrate against `openapi.real.json`, and the three endpoints this flow needs (`GET /api/v1/auth/invite/verify`, `POST /api/v1/auth/crm/login`) already exist there. Staff authentication is inherently tied to a real identity provider (Google / Cognito) that a mock DB cannot meaningfully simulate (there is no such thing as a "mock Google login"). The base for running the real API client in parallel with the mock client was already merged (`5d526244`, `src/lib/api-real/*`, `useClientRequest.ts`), so this feature is the first consumer of that real client rather than something that needs new plumbing.

**Alternatives considered**:

- Build a mock `auth_tokens`/invitation table under `src/app/api/_mock-db/` (the Phase 1 pattern used by other features): rejected — it would require fabricating a fake identity-provider handshake, which doesn't exist for any other feature, and the user explicitly asked to integrate the real flow now.

## R2. How is the Google `id_token` obtained in the browser?

**Decision**: Load Google Identity Services (GIS) via its script tag (`https://accounts.google.com/gsi/client`), call `google.accounts.id.initialize({ client_id, callback })` and render the standard Sign-In-With-Google button. The `callback` receives a `credential` field, which **is** the Google ID token JWT — send it as-is as `idToken` to `crmAuthControllerLoginMutation`.

**Rationale**: This is exactly the "Google IdP → id_token" hop described in `AUTH-01.md`, and GIS requires no npm dependency (it's a script tag + global `window.google` object), keeping Constitution Principle V (no new dependencies without justification) satisfied.

**Alternatives considered**:

- `@react-oauth/google` npm package: rejected — thin wrapper around the same GIS script; adds a dependency for no functional gain.
- Full OAuth2 popup/redirect flow (`google.accounts.oauth2`): rejected — that flow yields an access token for calling Google APIs, not an ID token; the One Tap / Sign-In-With-Google button flow is the one that yields the ID token this feature needs.

**New configuration required**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (OAuth 2.0 Client ID for a Google Cloud project, configured with the CRM's origin as an authorized JavaScript origin). Provisioning this Google Cloud OAuth client is an external/infra dependency, not a code change in this feature.

## R3. How is the Cognito `id_token` obtained for the email + temporary-password path, including the forced password change?

**Decision**: Call Amazon Cognito's public, unauthenticated JSON API directly with `fetch` — no AWS SDK. `POST https://cognito-idp.<region>.amazonaws.com/` with header `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth` and `AuthFlow: USER_PASSWORD_AUTH` to submit the temporary password. If the response is `AuthenticationResult.IdToken`, the account has no forced change pending (not expected on first login, but handled defensively). If the response is `ChallengeName: NEW_PASSWORD_REQUIRED` + `Session`, hold `{ session, username }` in local component state and show the new-password screen; submitting it calls the same endpoint with `X-Amz-Target: AWSCognitoIdentityProviderService.RespondToAuthChallenge`, sending the new password and the held `Session`, which returns `AuthenticationResult.IdToken` on success.

**Rationale**: Cognito's InitiateAuth/RespondToAuthChallenge JSON API is public and requires only the App Client ID — no AWS credentials — so it can be called with plain `fetch`, avoiding `amazon-cognito-identity-js` or `@aws-sdk/client-cognito-identity-provider` as new dependencies (Constitution Principle V). The `Session` string Cognito returns is opaque and must round-trip back to Cognito in the follow-up call; that requirement is what determines the client-side state architecture in R4.

**Alternatives considered**:

- `amazon-cognito-identity-js` / `aws-amplify` npm packages: rejected — pull in a full Cognito client SDK for two REST calls that plain `fetch` handles directly; no justification for the added dependency weight.
- Doing the Cognito exchange server-side (a new Next.js API route): rejected — `AUTH-01.md` and the real `crm/login` contract both model this as a client-side IdP hop (the backend only ever sees the resulting `idToken`), and introducing a server hop would duplicate that logic for no benefit.

**New configuration required**: `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_REGION`. Provisioning the actual Cognito User Pool + App Client (and configuring `USER_PASSWORD_AUTH` as an allowed auth flow) is an external/infra dependency.

## R4. How do the four V0 screens map to actual Next.js routes?

**Decision**: Two routes, not four:

- `src/app/(public)/login-initial/page.tsx` — a single client component that, on mount, verifies the `token` query param via `crmAuthControllerInviteVerifyOptions`. It renders one of three internal states: `expired` (verify failed), `login-form` (verify succeeded — reproduces `login-initial.tsx`), or `set-new-password` (only entered after a Cognito `NEW_PASSWORD_REQUIRED` challenge — reproduces `first-time-password-set.tsx` and `login-initial-expired.tsx`'s content for the expired state).
- `src/app/(public)/login-initial/success/page.tsx` — reproduces `login-initial-success.tsx`, reached via router navigation once `crmAuthControllerLoginMutation` succeeds.

**Rationale**: The Cognito `Session` token from R3 is short-lived, opaque, and must not be serialized into a URL (history/log exposure) or lost on an intermediate navigation. Keeping the temporary-password submission and the new-password submission as two states of one client component (plain `useState`) — rather than two separate routes — means that data never needs to leave memory. The invitation link itself is also a single stable URL a staff member opens from an email; whether it's currently valid or expired is a result of calling the API when that URL loads, not a separate destination — so `expired` is a rendered state of `/login-initial`, not its own route. The completion screen carries no sensitive or step-specific data, so it is a real, bookmarkable-in-principle route.

**Alternatives considered**:

- Four literal routes mirroring the four mockup files 1:1 (`/login-initial`, `/login-initial/expired`, `/first-time-password-set`, `/login-initial/success`): rejected — would force the Cognito `Session` and the pending invite token through URL query params or `sessionStorage` between `/login-initial` and `/first-time-password-set`, adding a persistence concern the mockup (a fake in-memory SPA router) never had to deal with.

## R5. How is the resulting staff session persisted after successful first-time login?

**Decision**: Reuse the existing `CookieNames.Session` cookie (via `universal-cookie`), the same mechanism `src/app/(public)/login/page.tsx` already uses for the (separate, later) subsequent-login flow. Write `{ access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer' }`, mapping `CrmLoginResponseDto`'s `accessToken`/`refreshToken` fields into the shape `useClientRequest.ts` already expects when it reads `token?.access_token` for the `Authorization` header. Compute the cookie expiry from the JWT's own `exp` claim via the existing `getTokenExpiration` util (consistent with how `(public)/login/page.tsx` already does it), rather than trusting the DTO's separate `expiresIn` seconds value, so both login paths derive expiry the same way.

**Rationale**: Reusing the exact cookie name and shape means the rest of the app's auth plumbing (request interceptor, refresh-token handling in `ClientRequestService`) works for a first-time-logged-in staff member with no changes — this feature only needs to produce a cookie in the shape that code already consumes.

**Alternatives considered**:

- A new cookie name/shape scoped to "first-time login": rejected — would require teaching `useClientRequest.ts` and the refresh-token interceptor about a second session shape for no benefit, since a first-time login and a subsequent login both end in "staff is now authenticated."

## R6. Does either identity-provider integration need PKCE?

**Decision**: No. PKCE only protects the OAuth2 **Authorization Code** grant — the step where a `code` returned via redirect is later exchanged for tokens at a token endpoint. Neither R2 nor R3's chosen mechanism has that shape:

- **Google (R2)**: `google.accounts.id.initialize(...)`'s callback receives the ID token JWT (`credential`) directly — there is no `code` and no separate exchange step. PKCE would only become relevant if this feature instead used `google.accounts.oauth2.initCodeClient` (the Authorization Code variant of GIS), which R2 already rejected because it yields an access token rather than the `id_token` the backend contract needs.
- **Cognito (R3)**: `InitiateAuth`/`RespondToAuthChallenge` is Cognito's direct User Pool API (`USER_PASSWORD_AUTH` flow) — username/password (or challenge response) in, tokens out, in the same call. This bypasses Cognito's Hosted UI entirely. PKCE would only become relevant if this feature instead used the Hosted UI's `/oauth2/authorize` redirect + `/oauth2/token` exchange, which was never the chosen design (R3 calls the User Pool API directly specifically to avoid that redirect hop).

**Alternatives considered**: Switching either provider to its Authorization Code variant (with PKCE) was not evaluated as a real alternative — it would reintroduce a redirect + exchange round-trip that R2/R3 already avoid for simplicity, without buying anything relevant to a first-party CRM screen (PKCE defends against code interception on redirect-based flows in less-trusted contexts, e.g. mobile app custom-scheme redirects; it is not a requirement for a same-origin JS callback or a direct password-grant-style API call).
