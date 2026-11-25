# Data Model: First-Time Login (AUTH-01)

This feature persists nothing of its own — all persistence (invitations, staff accounts, sessions) is owned by the real backend and, for identity verification, by Google/Cognito. The entities below are the shapes this feature's frontend code reads and holds in memory/cookies while driving the flow; they are not new database tables.

## InvitationVerification

Source: `GET /api/v1/auth/invite/verify` response (`CrmInviteVerifyResponseDto`), read on `/login-initial` mount.

| Field          | Type                    | Notes                                                                   |
| -------------- | ----------------------- | ----------------------------------------------------------------------- |
| `authProvider` | `'google' \| 'cognito'` | Drives which login UI to render — Google button vs. email/password form |
| `email`        | `string`                | Pre-filled, read-only, on the login form                                |
| `staffName`    | `string`                | Not shown on any of the four in-scope screens; fetched but unused here  |

**Derived client state**: whether the invite `token` query param is present/valid is not a field on this DTO — it is derived from whether the query call succeeds (`expired` state) or fails with 404/410 (`login-form` state is only reachable on success; anything else renders `expired`).

## StaffSession

Source: `POST /api/v1/auth/crm/login` response (`CrmLoginResponseDto`), on successful authentication (Google direct, or Cognito after the new-password step).

| Field          | Type      | Notes                                                                                                                 |
| -------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| `accessToken`  | `string`  | Fitness staff JWT, 60-min TTL — mapped into the `CookieNames.Session` cookie as `access_token`                        |
| `refreshToken` | `string`  | 7-day TTL — mapped into the cookie as `refresh_token`                                                                 |
| `expiresIn`    | `number`  | Seconds; informational only (expiry is actually derived from the JWT's `exp` claim per [research.md](research.md) R5) |
| `staffId`      | `string`  | Not directly used by these screens (available for future features)                                                    |
| `role`         | `string`  | Not directly used by these screens                                                                                    |
| `isFirstLogin` | `boolean` | Expected `true` for every successful call in this flow (an `inviteToken` was always sent); not branched on further    |

## CognitoChallengeState

Transient, in-memory-only React state held by the `/login-initial` client component between the temporary-password submission and the new-password submission. **Never sent to the fitness-api backend and never persisted** (not in a cookie, not in the URL).

| Field         | Type     | Notes                                                                                                                              |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `username`    | `string` | The invited email address; required again for `RespondToAuthChallenge`                                                             |
| `session`     | `string` | Cognito's opaque `Session` token from the `NEW_PASSWORD_REQUIRED` challenge                                                        |
| `inviteToken` | `string` | The `token` query param from the invite link; carried forward so the eventual `crmAuthControllerLoginMutation` call can include it |

## PasswordStrength (view-model only)

Pure client-side derived state for `first-time-password-set`'s live requirement checklist and strength bar — not sent to any API in this shape (only the raw new password is sent, inside the Cognito `RespondToAuthChallenge` call).

| Field        | Type      | Rule                                              |
| ------------ | --------- | ------------------------------------------------- |
| `length`     | `boolean` | `password.length >= 8`                            |
| `upperLower` | `boolean` | Contains both an uppercase and a lowercase letter |
| `number`     | `boolean` | Contains at least one digit                       |
| `symbol`     | `boolean` | Contains at least one non-alphanumeric character  |

## State Transitions — `/login-initial`

```
(mount, token=<query param>)
        │
        ▼
  [verifying]  ──(invite/verify 404/410/error)──▶  [expired]  (terminal — FR-003)
        │
   (invite/verify 200)
        │
        ▼
  [login-form]  ──(Google sign-in succeeds)────────────────────▶  crmAuthControllerLogin({idToken}) ──▶ navigate /login-initial/success
        │
   (Cognito InitiateAuth: NEW_PASSWORD_REQUIRED)
        │
        ▼
  [set-new-password]  ──(RespondToAuthChallenge succeeds)──▶  crmAuthControllerLogin({idToken, inviteToken}) ──▶ navigate /login-initial/success
```

`[login-form]` also has a same-state error branch (FR-009): incorrect temporary password or a failed/cancelled Google attempt keeps the user on `[login-form]` with an inline error, no state transition.
