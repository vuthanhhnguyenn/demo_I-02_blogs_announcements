# Data Model: Forgot Password (Password Reset)

This feature persists nothing of its own — the reset request and the reset link/code are entirely owned by Amazon Cognito (see `research.md` R1). The shapes below are view-model state this feature's frontend code holds in memory (never sent anywhere as-is) or reads from the URL; they are not new database tables.

## PasswordResetRequestState (view-model only)

Local state `password-reset-form.tsx` (the `/password-reset` screen) holds while driving Story 1.

| Field       | Type                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `email`     | `string`                                                    | The address the staff member typed; re-shown in the sent-confirmation copy ("{email} 宛に...")                                                                                                                                                                                                                                                                                                                                 |
| `phase`     | `'form' \| 'sent'`                                          | Which of the mockup's two card bodies to render (PAR001–006 vs. PAR007–009)                                                                                                                                                                                                                                                                                                                                                    |
| `cooldown`  | `number` (seconds)                                          | Counts down from 60 after each send; gates the "メールを再送信" button's disabled state                                                                                                                                                                                                                                                                                                                                        |
| `sendError` | `'invalid-email' \| 'retryable' \| 'misconfigured' \| null` | `'invalid-email'` for client-side format validation failures (FR-003); `'retryable'` (throttling/outage/network) or `'misconfigured'` (delivery or user pool config/permissions) for a genuine `ForgotPassword` failure that is not itself an existence disclosure (research.md R3, contracts/cognito-forgot-password.md) — a `UserNotFoundException`-shaped failure is _not_ an error state, it is treated as `phase: 'sent'` |

## ResetLinkParams (parsed from the `/password-set` URL)

| Field   | Type             | Notes                                                        |
| ------- | ---------------- | ------------------------------------------------------------ |
| `email` | `string \| null` | Cognito `Username` — read from the `email` query param       |
| `code`  | `string \| null` | Cognito confirmation code — read from the `code` query param |

If either is missing/empty on load, the screen renders the "invalid or expired link" state (spec.md Story 2 Scenario 6 / FR-009) without ever calling Cognito — a malformed or hand-typed URL is indistinguishable, by design, from a genuinely expired one.

## PasswordSetScreenPhase (view-model only)

Local state the `/password-set` screen holds, analogous to `password-set.tsx`'s own `variant`/`done` state.

| Value       | Trigger                                                                                                                                                                                    | Card shown (mockup)             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `'form'`    | Valid `email`+`code` present in the URL, no submission yet                                                                                                                                 | New-password form (PAR011–018)  |
| `'expired'` | Missing/empty `email`/`code` in the URL, **or** `ConfirmForgotPassword` rejects with `ExpiredCodeException` / `CodeMismatchException` / `LimitExceededException` / `UserNotFoundException` | Expired-link state (PAR019–021) |
| `'done'`    | `ConfirmForgotPassword` succeeds                                                                                                                                                           | Success state (PAR022–024)      |

`InvalidPasswordException` from Cognito is not expected in normal operation (the shared `PasswordSetForm`'s Zod schema already enforces the same policy Cognito's User Pool requires, per `research.md` R5) and, if it somehow occurs, is treated as the form's own generic "submission failed, retry" inline error rather than the `'expired'` state — it does not mean the link is invalid.

## State Transitions — `/password-reset`

```
(mount)
   │
   ▼
 phase = 'form'
   │
   ├─ invalid email format submitted ──────► sendError = 'invalid-email' (stays on 'form')
   │
   └─ valid email submitted ──► ForgotPassword({ Username: email })
                                        │
              ┌─────────────────────────┼─────────────────────────────┐
           success                UserNotFoundException          other error
              │                         │                              │
        phase = 'sent'            phase = 'sent'              sendError = 'retryable' | 'misconfigured'
        cooldown = 60             cooldown = 60                  (stays on 'form')

 (while phase = 'sent')
   └─ "メールを再送信" clicked, cooldown === 0 ──► ForgotPassword({ Username: email }) again
                                                        (same success/not-found/other branches, cooldown resets to 60)
```

## State Transitions — `/password-set`

```
(mount, email/code = <query params>)
        │
        ▼
  email && code present? ──No──► phase = 'expired'
        │Yes
        ▼
  phase = 'form'
        │
        └─ new password + confirm submitted (shared PasswordSetForm, already policy-valid) ──►
                 ConfirmForgotPassword({ Username: email, ConfirmationCode: code, Password: newPassword })
                        │
        ┌───────────────┼──────────────────────────────────────────┐
     success      Expired/CodeMismatch/LimitExceeded/UserNotFound   InvalidPasswordException / other
        │                       │                                          │
  phase = 'done'          phase = 'expired'                    inline "retry" banner (stays on 'form')
```
