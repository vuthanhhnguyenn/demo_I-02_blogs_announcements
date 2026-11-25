# Contract: fitness-api — Auth endpoints consumed by this feature

Source of truth: `src/lib/openapi.real.json` (already generated into `src/lib/api-real`). This feature consumes these endpoints as-is — **no changes to the OpenAPI spec or generated client are made by this feature**.

## `POST /api/v1/auth/crm/login` (reused, no `inviteToken`)

Generated helper: `crmAuthControllerLoginMutation()` / class method `AuthCrm.crmAuthControllerLogin`. Same endpoint `023-first-time-login` already uses; this feature's only difference is the request body.

- **Body** (`CrmLoginRequestDto`): `{ idToken: string }` — `inviteToken` is omitted (every call from `/login` is, by definition, not a first login).
  - Google path: `idToken` = the GIS `credential`.
  - Cognito path: `idToken` = `AuthenticationResult.IdToken` from `InitiateAuth` (or, defensively, from `RespondToAuthChallenge` — see `research.md` R4).
- **200** `CrmLoginResponseDto` → `{ accessToken, refreshToken, expiresIn, staffId, role, isFirstLogin }`. Persist via the shared `persistStaffSession`, then navigate to `safeRedirect(redirectParam)` (FR-006).
- **401** (`E-AUTH-032`, id_token verification failed) → `SignInError = 'credentials'` (FR-004/FR-009 edge case).
- **403** (`E-AUTH-033` email not a staff record / `E-AUTH-034` deactivated staff) → `SignInError = 'account-status'` (FR-003), distinct from the 401 case.
- **404 / 410** (invite-token errors) → not reachable from this screen; no `inviteToken` is ever sent, so the backend cannot return these for a call originating here.
- **400** (`E-VAL-001`) → not reachable through normal UI use (`idToken` is always a non-empty string by construction); no dedicated UI state.

## `POST /api/v1/auth/crm/logout` (newly consumed by this feature)

Generated helper: `crmAuthControllerLogoutMutation()` / class method `AuthCrm.crmAuthControllerLogout`. Bearer-protected, **idempotent** (204 even if no session exists).

- Called from `handleLogout()` (`src/utils/global.util.ts`) **before** the `CookieNames.Session` cookie is removed, so the shared request interceptor (already attached to the same `realClient` singleton this method calls through) can still auto-attach `Authorization: Bearer <token>` from the cookie.
- **204** → proceed to clear the cookie and redirect to `/login`.
- Any error (network failure, 401 if the token was already invalid) → caught and ignored; the local logout (cookie removal + redirect) proceeds regardless (FR-007's guarantee is "best-effort server invalidation," not "logout blocks on the network").

## `POST /api/v1/auth/refresh` (newly consumed by this feature, for the real client)

Generated helper: `tokenControllerRefreshMutation()` / class method `AuthToken.tokenControllerRefresh`. Public endpoint (the refresh token itself is the credential — no bearer header).

- **Body** (`RefreshTokenRequestDto`): `{ refreshToken: string }`, read from the `CookieNames.Session` cookie's `refresh_token` field.
- **200** `FitnessTokenResponseDto` → `{ token, refreshToken, expiresAt }`. Note the field is `token`, **not** `accessToken` — normalize to `{ accessToken: token, refreshToken }` (`data-model.md` `RefreshResult`) before handing off to the same cookie-write logic the mock adapter uses, so `ClientRequestService` doesn't need to know which backend answered.
- **401** (`E-AUTH-002` expired / `E-AUTH-003` invalid signature / `E-AUTH-005` session gone) → refresh has definitively failed; call `handleLogout({ sessionExpired: true })` (FR-008).
- Called via the raw `AuthToken` class (not through a React Query hook), same bypass-the-declarative-cache pattern the existing mock refresh call already uses, so a refresh failure doesn't get funneled back through the same interceptor that triggered it.

## `useClientRequest.ts` bypass list (extended)

The 401-response interceptor's `isAuthRequest` check already skips retry-refresh for `/api/v1/auth/login` and `/api/v1/auth/crm/login` (a 401 there is a legitimate terminal sign-in failure, not "my session expired mid-use"). This feature adds two more URLs to that same bypass list, for the same reason:

- `/api/v1/auth/refresh` — a 401 here **is** the refresh failure that should trigger `handleLogout({ sessionExpired: true })` directly; it must not recursively attempt another refresh.
- `/api/v1/auth/crm/logout` — a 401 here means the session was already gone; `handleLogout()`'s own caller is already mid-logout, so this must not trigger a second, competing `handleLogout()` call from inside the interceptor.

---

## `POST /api/v1/auth/crm/magic-link` (newly consumed — magic-link amendment, 2026-08-25)

Generated helper: `crmAuthControllerCrmMagicLinkIssueMutation()` / class method `AuthCrm.crmAuthControllerCrmMagicLinkIssue`. Public (no bearer). Already generated — no OpenAPI or codegen change (`research.md` R10).

- **Body** (`CrmMagicLinkIssueRequestDto`): `{ email: string }`.
- **200** (`CrmMagicLinkIssueResponseDto`) → `{ accepted: true }`. **Always `true`**, whether or not the address matched an active staff record — the endpoint is contractually non-disclosing. The client shows the sent state on any 2xx and must **not** branch on this field (`research.md` R13 explains why adding a branch here could only re-introduce the leak).
- **400** (`E-VAL-001`) → nothing was sent; surface the generic retry-able error and keep the form (FR-021). Reachable only if client-side Zod validation is bypassed.
- **Transport failure** → same handling as 400: retry-able error, never a false "link sent" confirmation.
- Server-side behavior this feature relies on but does not implement: the link is one-time and 15-minute (the copy in FR-015 states these values, so they must not drift from the backend's), and **issuing a new link revokes any pending one** — which is what makes FR-017 true without any client-side bookkeeping.

## `POST /api/v1/auth/crm/magic-link/verify` (newly consumed — magic-link amendment, 2026-08-25)

Generated helper: `crmAuthControllerCrmMagicLinkVerifyMutation()` / class method `AuthCrm.crmAuthControllerCrmMagicLinkVerify`. Public (no bearer — the token _is_ the credential).

- **Body** (`CrmMagicLinkVerifyRequestDto`): `{ token: string }` — the 43-char base64url value read verbatim from `?token=` on `/magic-link`.
- **200** `CrmLoginResponseDto` → **the same DTO `crmAuthControllerLogin` returns**. Persist with the shared `persistStaffSession`, then `navigate('/')` (FR-018). No `redirect` target is honoured here — see `data-model.md`.
- **401** (`E-AUTH-030`) → token invalid, expired, already used, or superseded by a newer one. The backend returns **one code for all four** so the endpoint leaks no token state; the client must preserve that by mapping all of them to the single `magic-link-invalid` banner (FR-019). Redirect to `/login?variant=magic-link-invalid`.
- **403** (`E-AUTH-034`) → staff deactivated between issue and use. Redirect to `/login?variant=account-status`, reusing the existing account-status alert (FR-020) — the same code and the same message `crmAuthControllerLogin` already maps there.
- **400** (`E-VAL-001`) → treated identically to the 401 case; a body that fails validation means the URL's token was malformed, which is not worth a distinct message.
- **Called exactly once per mount**, behind a synchronous `useRef` latch — the token is genuinely single-use, so a StrictMode double-effect would burn a valid link and show the invalid-link banner for it (`research.md` R15).

### Link URL — confirmed against the real mailed link (2026-08-25)

`CrmMagicLinkIssueRequestDto` carries **only** `email`; the backend composes and mails the link, so the CRM frontend cannot influence its URL. The actual mailed link (confirmed from a live backend send) is:

```
<crm-origin>/magic-link?token=<43-char base64url token>
```

This is **not** the path `research.md` R11 originally guessed (`/magic-link/verify`) — the request screen was renamed to `/magic-link-login` and the consume/verify screen took over `/magic-link` to match the backend exactly, per R11's own contingency ("the frontend route is the cheap side to move").

## Not consumed by this feature

- `POST /api/v1/staff/magic-link` (`StaffController_issueMagicLink`) and `POST /api/v1/auth/magic-link/verify` (`MagicLinkController_verify`) are the **MobileApp** lane — they sign a staff member into the member app, a different token audience. The mock route at `src/app/api/crm/staffs/{id}/magic-link` is the administrator-proxy issuance surface belonging to Y-01 staff detail, held out of scope by `spec.md` Assumptions. None of the three is called from either screen in this feature.
