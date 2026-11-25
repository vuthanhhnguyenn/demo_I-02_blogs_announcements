# Data Model: Subsequent Login (AUTH-01)

This feature persists nothing of its own — all persistence (staff accounts, sessions) is owned by the real backend and, for identity verification, by Google/Cognito. The shapes below are what this feature's frontend code reads and holds in memory/cookies while driving the flow; they are not new database tables.

## StaffSession

Source: `POST /api/v1/auth/crm/login` response (`CrmLoginResponseDto`), on successful authentication (Google direct, or Cognito email/password) — the same shape `023-first-time-login` already produces and persists via the now-shared `persistStaffSession`.

| Field          | Type      | Notes                                                                                                                     |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| `accessToken`  | `string`  | Fitness staff JWT (60-min TTL) — mapped into the `CookieNames.Session` cookie as `access_token`                           |
| `refreshToken` | `string`  | 7-day TTL — mapped into the cookie as `refresh_token`                                                                     |
| `expiresIn`    | `number`  | Seconds; informational only — expiry is derived from the JWT's own `exp` claim (unchanged from `023-first-time-login` R5) |
| `staffId`      | `string`  | Not directly used by this screen                                                                                          |
| `role`         | `string`  | Not directly used by this screen (role-based access is enforced elsewhere, in `proxy.ts`)                                 |
| `isFirstLogin` | `boolean` | Expected `false` for every call from this screen (no `inviteToken` is ever sent); not branched on                         |

## RefreshResult (view-model only — R7)

The normalized shape both the mock and real refresh adapters produce for `ClientRequestService`, so the cookie-update logic that follows is identical regardless of which backend answered.

| Field          | Type     | Notes                                                                                                                                         |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `accessToken`  | `string` | Mock source: `postAuthRefresh` response's `accessToken`. Real source: `tokenControllerRefresh` response's `token` (`FitnessTokenResponseDto`) |
| `refreshToken` | `string` | Mock source: `refresh_token`. Real source: `refreshToken`.                                                                                    |

Cookie expiry is recomputed from `accessToken`'s JWT `exp` claim via the existing `getTokenExpiration`, never from either DTO's own expiry field — this is why the shapes can be normalized to just these two fields.

## SignInError (view-model only)

Derived, in-memory-only state `login-form.tsx` holds to pick which of the mockup's four alert states to show. Never sent anywhere; purely a rendering decision based on the outcome of the most recent sign-in attempt or the page's own `variant` query param.

| Value               | Trigger                                                                                                                         | Alert shown (mockup `PAR00x`) |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `null`              | Initial page load with no `variant=session-expired` in the URL, and no failed attempt yet                                       | none                          |
| `'session-expired'` | Page loaded with `?variant=session-expired` (set by `handleLogout({ sessionExpired: true })` — see R7/R8)                       | PAR003                        |
| `'locked'`          | A Cognito `InitiateAuth` failure whose message matches the lockout phrase (R5)                                                  | PAR004                        |
| `'account-status'`  | `crmAuthControllerLogin` 403 (`E-AUTH-033` staff not found / `E-AUTH-034` deactivated), Google or Cognito path                  | PAR005                        |
| `'credentials'`     | Any other authentication failure (Cognito `InitiateAuth` non-lockout error, or `crmAuthControllerLogin` 401/malformed-response) | PAR006                        |

Only one value is active at a time; a new sign-in attempt always clears whatever the URL-driven `session-expired` state was (submitting the form is itself evidence the staff member has moved past "why was I logged out" and into "let me log back in").

## State Transitions — `/login`

```
(mount, variant=<query param>)
        │
        ▼
  variant === 'session-expired' ? show PAR003 : show plain form
        │
        ├─ Google button clicked ──────────────► GIS callback(idToken)
        │                                              │
        │                                   crmAuthControllerLogin({idToken})
        │                                              │
        │                    ┌─────────────────────────┼─────────────────────────┐
        │                 200 OK                    403 (E-AUTH-033/034)      401 / malformed
        │                    │                            │                       │
        │           persistStaffSession            SignInError                SignInError
        │           navigate(safeRedirect)        = 'account-status'         = 'credentials'
        │
        └─ Email/password submitted ──────► InitiateAuth({email, password})
                                                       │
                              ┌────────────────────────┼─────────────────────────────┐
                     AuthenticationResult.IdToken   NEW_PASSWORD_REQUIRED      NotAuthorizedException
                              │                     (R4 — treated as a          (lockout phrase? R5)
                     crmAuthControllerLogin           generic failure)                 │
                     ({idToken})                            │                 ┌────────┴────────┐
                              │                     SignInError            lockout match      no match
                    (same 200/403/401 branches      = 'credentials'            │                 │
                     as the Google path above)                        SignInError='locked'  ='credentials'
```

`crmAuthControllerLogout` and `tokenControllerRefresh` are not part of this page's own state machine — they belong to the app-wide request-interceptor plumbing (R7/R8) that this feature fixes as a prerequisite for FR-007/FR-008, not to `/login` itself.

---

# Magic-Link Sign-In (added 2026-08-25)

Still nothing persisted by this feature. The magic link itself — its 43-char token, its 15-minute expiry, its single-use flag, and the revocation of a pending link when a newer one is issued — is owned entirely by the real backend (`research.md` R10); the browser never holds it, and never sees it at all except as a query parameter it immediately hands back.

## MagicLinkIssue (request/response, no local persistence)

Source: `POST /api/v1/auth/crm/magic-link`.

| Field      | Direction | Type      | Notes                                                                                                     |
| ---------- | --------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `email`    | request   | `string`  | The address typed on `/magic-link-login`; validated for format client-side (FR-013) before the call       |
| `accepted` | response  | `boolean` | Always `true` by contract. **Not branched on** — it carries no information, by design (`research.md` R13) |

## MagicLinkVerify (request → StaffSession)

Source: `POST /api/v1/auth/crm/magic-link/verify`.

| Field        | Direction | Type                  | Notes                                                                                                                                                                                                              |
| ------------ | --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `token`      | request   | `string`              | Read verbatim from `?token=` on `/magic-link`; never stored, never logged                                                                                                                                          |
| _(200 body)_ | response  | `CrmLoginResponseDto` | **The same shape the login endpoint returns** — handed to the existing shared `persistStaffSession` unchanged, which is what makes the resulting session indistinguishable from a Google/Cognito one (spec SC-010) |

## MagicLinkRequestPhase (view-model only)

In-memory state of `magic-link-request-form.tsx`. Mirrors the two-phase shape the V0 mockup and the shipped `password-reset-form.tsx` both use.

| Value    | Meaning                                                   | Renders                                                                        |
| -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `'form'` | Initial, and after a send that failed to leave the client | Email field + "ログインリンクを送信" + the 経路② guidance copy (PAR018–PAR021) |
| `'sent'` | Any 2xx from the issue endpoint                           | Success icon, echoed address, the 15分/1回 note, resend button (PAR022–PAR026) |

Companion state: `sentEmail` (the address echoed back in the sent state), `sendError: 'unexpected' \| null` (FR-021 — the only error this screen can show, since non-disclosure means there is no "unknown address" branch), and the resend countdown, which comes from the shared `useResendCooldown` hook rather than a local timer.

**One-way transition**: `'form' → 'sent'` only. There is no path back to `'form'` within a mount — resending re-issues from the sent state (FR-016/FR-017), and leaving the screen and returning remounts at `'form'` with a cleared cooldown, which is the behavior the spec's last edge case describes.

## MagicLinkVerifyOutcome (view-model only)

`magic-link-verify.tsx` holds no rendered state beyond "still verifying" — every terminal outcome navigates away, so there is no error view to model (`research.md` R14).

| Outcome           | Source                                                          | Effect                                          |
| ----------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| verifying         | mount, token present                                            | Spinner only                                    |
| success           | `200`                                                           | `persistStaffSession(body)` → `navigate('/')`   |
| invalid link      | `401 E-AUTH-030`, missing/blank `?token=`, or transport failure | `navigate('/login?variant=magic-link-invalid')` |
| deactivated staff | `403 E-AUTH-034`                                                | `navigate('/login?variant=account-status')`     |

## SignInError — extended

The `SignInError` union in `login-form.tsx` (defined earlier in this document) gains one value:

| Value                  | Trigger                                                                  | Alert                                                            |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `'magic-link-invalid'` | Page loaded with `?variant=magic-link-invalid`, set by the verify screen | **New** destructive alert, no V0 counterpart (`research.md` R14) |

`'account-status'` is reused unchanged for the deactivated case — no new value needed.

## State Transitions — `/magic-link-login` and `/magic-link`

```
/magic-link-login  (mount, phase='form')
     │
     ├─ submit, email fails Zod ─────────► field error, no request        (FR-013)
     │
     └─ submit, email valid ────────► crmAuthControllerCrmMagicLinkIssue({email})
                                              │
                          ┌───────────────────┴───────────────────┐
                       2xx (always {accepted:true})          400 / transport
                          │                                       │
                 phase='sent', sentEmail=email             sendError='unexpected'
                 startCooldown(60)                         stay on phase='form'   (FR-021)
                          │
                          └─ resend (only when cooldown elapsed) ──► same call, restart cooldown
                                                                      (server revokes the prior link — FR-017)

/magic-link?token=…  (mount)
     │
     ├─ no/blank token ───────────────────────────────► /login?variant=magic-link-invalid
     │
     └─ ref-latched single call (R15) ─► crmAuthControllerCrmMagicLinkVerify({token})
                                              │
                     ┌────────────────────────┼────────────────────────┐
                   200                   401 E-AUTH-030           403 E-AUTH-034
                     │                        │                        │
           persistStaffSession        /login?variant=            /login?variant=
           navigate('/')              magic-link-invalid          account-status
```

Note the deliberate asymmetry with the login screen: magic-link success navigates to `/`, never to a `redirect` target. The link is normally opened from a mail client in a different browser, where no such target exists (spec Assumptions), so there is nothing to honour.
