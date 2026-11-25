# Research: Forgot Password (Password Reset)

## R1. Which backend actually issues and confirms the reset link — a new fitness-api endpoint, a new mock-db table, or the existing Cognito integration?

**Decision**: Call Amazon Cognito's public, unauthenticated User Pool API directly — `ForgotPassword` (request screen) and `ConfirmForgotPassword` (set-password screen) — via the same `callCognito` fetch helper `028-subsequent-login`/`023-first-time-login` already established in `src/hooks/use-cognito-auth.ts` for `InitiateAuth`/`RespondToAuthChallenge`. No new fitness-api endpoint, no new mock-db table, no new npm dependency.

**Rationale**: `Y-13.md`'s FR-M006 delegates this entire flow to the IDaaS provider ("IDaaSのパスワードリセットフローに委譲"). `Y-13.md` itself still lists the IDaaS choice as pending PoC (`Y-13-Q03`), but the codebase has already committed to and shipped against AWS Cognito for both `023-first-time-login` and `028-subsequent-login` — `use-cognito-auth.ts` calls Cognito's public API directly with `fetch`, bypassing fitness-api entirely for this identity-provider hop, exactly as `028`'s own research (R2/R3) established as the precedent to reuse rather than reinvent. `ForgotPassword`/`ConfirmForgotPassword` are the same public, unauthenticated Cognito actions as `InitiateAuth`/`RespondToAuthChallenge` — same auth model, same error shape (`CognitoAuthError`), same `callCognito` helper — so extending that one file is the natural, zero-new-surface implementation. Inventing a mock-db-backed Phase-1 stand-in (the pattern used elsewhere in this project for domains with no backend yet) would be **more** work than reusing what already exists, and would have to be thrown away once real reset traffic needs to hit the real user pool — there is no "Phase 2 swap" benefit here the way there is for e.g. CRM business-data screens, because the identity provider is already real and already wired.

**Alternatives considered**:

- New fitness-api endpoints (`POST /auth/password-reset/request` + `.../confirm`) proxying to Cognito server-side — rejected: no such endpoints exist in `openapi.real.json`'s "Auth - CRM" tag today, and adding them would require backend work and an OpenAPI spec change outside this frontend feature's scope, when the client-side public API already does the job with zero backend involvement (consistent with how login/first-time-login already work).
- Mock-db Phase-1 stand-in (`src/app/api/_mock-db` + a new `POST /api/auth/password-reset/*` mock route, matching the legacy `/api/auth/login` pattern) — rejected: that pattern exists for CRM business-data domains awaiting a not-yet-built real backend; here the real backend (Cognito) already exists and is already integrated for sibling auth screens, so a mock stand-in would just be dead code to delete later.

## R2. The V0 mockup's `password-set.tsx` has no code-entry field — how does a link-based UX work with Cognito's code-based `ConfirmForgotPassword` API?

**Decision**: Cognito's `ForgotPassword` action emails a verification code, not a URL — but the User Pool's forgot-password message template can be customized (an existing Cognito-console configuration concern, not app code) to embed that code and the staff member's email into a link pointing at this app's `/password-set` route, e.g. `.../password-set?email={username}&code={####}`. The `/password-set` page reads `email` and `code` from the URL's search params (never rendering them as visible/editable fields, matching the mockup exactly) and passes them through silently when the staff member submits their new password via `ConfirmForgotPassword`.

**Rationale**: This reproduces the mockup's exact UX (a password-only form, no code to copy/paste) without needing a custom backend to mint its own tokens — the "one-time, time-limited, single-use" properties required by spec.md FR-005/FR-009 are exactly Cognito's own confirmation-code semantics (default 1-hour validity, single confirmed use, `ExpiredCodeException`/`CodeMismatchException` on reuse or expiry).

**Alternatives considered**: Adding a visible confirmation-code input to the set-password screen — rejected, it contradicts the V0 mockup this feature is scoped to reproduce (`password-set.tsx` has no such field) and adds a manual-copy step the mockup's link-based flow doesn't have.

**Dependency this creates**: The Cognito User Pool's forgot-password email template must be configured (in the Cognito console/IaC, outside this repo) to link to this app's `/password-set` route with `email`/`code` query parameters instead of Cognito's default plain-code email. This is an infrastructure/IDaaS-configuration task, not application code — the same kind of already-assumed-external Cognito configuration `028-subsequent-login` treats the lockout policy and "prevent user existence errors" setting as (see R3).

## R3. Non-disclosure of account existence (spec.md FR-002) vs. Cognito's default `UserNotFoundException`

**Decision**: Treat `UserNotFoundException` (and any other "this identity doesn't exist in this user pool" shaped error) from `ForgotPassword` identically to a successful call — always show the generic "メールを送信しました" confirmation. Only a genuinely unexpected failure (network error, `LimitExceededException`) surfaces a different, retry-oriented state.

**Rationale**: `Y-13.md` FR-M006 explicitly requires identical messaging regardless of account existence, and `028-subsequent-login`'s login screen already depends on Cognito's User Pool being configured with "Prevent User Existence Errors" (`ENABLED` mode) for its own generic incorrect-credentials message (`InitiateAuth` there never distinguishes "wrong password" from "no such user" either) — the same User Pool configuration causes `ForgotPassword` to return a normal-looking response (fake `CodeDeliveryDetails`) for a non-existent user rather than throwing, in which case this decision only needs to hold as a defensive fallback for any edge case the User Pool setting doesn't cover. A Google-SSO-only staff member (who has no Cognito user pool entry at all) naturally lands in this same "treat as sent" bucket, which is exactly the behavior FR-M006/Story 3 need — the client never has to know or ask whether a given email uses Google SSO.

**Alternatives considered**: Looking up the email against the real staff directory first (to decide whether to even attempt `ForgotPassword`) — rejected, no such lookup endpoint is exposed to an unauthenticated caller, and doing so would itself be an existence-disclosure side channel (timing/behavior difference) this feature must avoid.

## R4. Session invalidation on successful reset (spec.md FR-008)

**Decision**: Rely on Cognito's built-in behavior — a successful `ConfirmForgotPassword` already revokes all of that user's previously issued tokens automatically (a standard Cognito security behavior on password change/reset). No additional sign-out call is made by this feature.

**Rationale**: There is no unauthenticated "sign out all sessions" Cognito action this flow could call even if it wanted to (`GlobalSignOut` requires an access token, which an unauthenticated password-reset flow never has) — so relying on Cognito's own revoke-on-reset behavior is not just simplest but the only mechanism actually available at this step.

**Alternatives considered**: None — no alternative unauthenticated mechanism exists.

## R5. Reuse of the existing shared `PasswordSetForm` component/schema despite its stricter password policy

**Decision**: Reuse `src/components/common/auth/password-set-form.tsx` (`PasswordSetForm`) and `.../_schemas/password-set-form.schema.ts` as-is for the "set new password" screen, rather than building a slimmer component matching the V0 mockup's exact 3-rule checklist (length, upper/lower, number).

**Rationale**: That shared component already exists specifically for this purpose — its own doc comment reads "later, the standalone AUTH-03 password-set screen," anticipating this exact feature — and was already promoted out of route-local code once `023-first-time-login` needed it, per Constitution IV/V (dedup over reinvention, no new abstraction). It enforces a 4th rule (a symbol is required) that the V0 mockup and `Y-13.md`'s literal FR-M002 text don't mention; this is because the real Cognito User Pool's actual password policy (already configured for `023`/`028`'s real submissions) requires a symbol, and the shared component was built to match that live policy rather than the textual spec. Building a separate, 3-rule-only component for this screen would silently accept passwords Cognito itself will then reject with `InvalidPasswordException` — a strictly worse outcome than the minor visual divergence from the mockup's checklist.

**Alternatives considered**: A new 3-rule component matching the mockup exactly — rejected per above; would reintroduce a client/server policy mismatch `023`/`028` already solved.

## R6. Wiring the login page's existing "パスワードをお忘れの方" link

**Decision**: `login-form.tsx`'s existing, already-rendered-but-unwired link (`028-subsequent-login`, marked "Out of scope per spec.md Assumptions ... visually present, not wired") gets an `onClick` that navigates to the new `/password-reset` route, using the same generated `navigate()`/`router.push()` pattern every other in-app link already uses. The link's own visual parity was already ticked off by `028`'s parity checklist (`PAR013`); this feature only adds the missing behavior.

**Rationale**: Avoids re-implementing or duplicating the link itself; `028-subsequent-login`'s spec.md explicitly deferred exactly this wiring to "a separate [feature]" — this is that feature.

**Alternatives considered**: None — the link already exists in the one place it needs to.
