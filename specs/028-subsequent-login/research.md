# Research: Subsequent Login (AUTH-01)

## R1. Which API client does this feature use, and does it need `inviteToken`?

**Decision**: Call the real backend via the generated `src/lib/api-real` client, specifically `crmAuthControllerLoginMutation()` with `{ idToken }` only — `inviteToken` is omitted entirely (it is optional on `CrmLoginRequestDto` and, per the contract, "present only on first login").

**Rationale**: Identical reasoning to `023-first-time-login` R1 — staff authentication is tied to a real identity provider that the mock DB cannot simulate, and the endpoint already exists and already distinguishes first-login (`inviteToken` present) from subsequent login (absent) by design.

**Alternatives considered**: None — this is the same endpoint the prior feature already validated end-to-end; the only difference is the request body shape.

## R2/R3. Google ID token and Cognito email+password — reuse or reimplement?

**Decision**: Reuse `023-first-time-login`'s exact mechanisms unchanged — Google Identity Services script-tag button (`use-google-sign-in.ts`) and Cognito's public `InitiateAuth` JSON API via `fetch` (the `initiateAuth` half of `use-cognito-temp-password.ts`). Promote both out of `login-initial`'s route-local `_hooks/` into `src/hooks/` since this feature is now a second consumer (see R9).

**Rationale**: These are the same two identity-provider hops (`AUTH-01.md` / `Y-13.md` FR-M001/FR-M002); re-deriving them would duplicate already-working, already-reviewed code for no benefit. Constitution IV requires shared code to live in `src/`, not a specific route's folder, once more than one route needs it.

**Alternatives considered**: Duplicating the hooks into `login/_hooks/` — rejected as direct, avoidable duplication (Constitution V) with no isolation benefit (neither hook holds route-specific state).

## R4. What happens if `InitiateAuth` returns `NEW_PASSWORD_REQUIRED` on this screen?

**Decision**: Treat it as a generic sign-in failure (FR-004's "incorrect email or password" message), the same as any other `InitiateAuth` rejection — do **not** build a second password-set UI on this screen.

**Rationale**: A returning staff member should already have a personal password from first-time login; `NEW_PASSWORD_REQUIRED` reappearing here only happens through an out-of-band admin action (e.g., an administrator force-resets a password to a new temporary one outside the invitation flow), which is not a scenario `spec.md` describes or that `Y-13.md` assigns to this screen. Building a second copy of the first-time-login password-set flow here would duplicate `023-first-time-login`'s job and contradicts this feature's explicit scope boundary ("password reset ... out of scope," `spec.md` Assumptions). If this scenario needs first-class support later, it belongs to the deferred password-reset feature, not here.

**Alternatives considered**: Reusing the shared `PasswordSetForm` component here too — rejected for now as scope creep; noted for whoever specifies the password-reset feature next.

## R5. How is a Cognito account lockout (FR-M008 / `spec.md` FR-005) distinguished from an ordinary wrong password?

**Decision**: Cognito's public API returns the same `__type: "NotAuthorizedException"` for both an ordinary wrong password and a lockout — they differ only in the `message` text (lockout messages contain a recognizable phrase, e.g. "Password attempts exceeded" / "attempt limit exceeded"). `useCognitoAuth`'s caller inspects `CognitoAuthError.message` for that phrase and only then shows the lockout alert (`spec.md` FR-005 / mockup PAR004); any other `NotAuthorizedException` (or a message that doesn't match) falls back to the generic incorrect-credentials alert (FR-004).

**Rationale**: There is no separate, structurally distinct Cognito exception type for "locked out" versus "wrong password" — message-text matching is the only signal Cognito's public API exposes for this. Falling back to the generic message on an unrecognized phrase is a deliberate safe default: it never claims a false lockout, it just under-reports one in an edge case (e.g., a wording change on the Cognito side), which is the safer failure direction.

**Alternatives considered**: Tracking failed-attempt counts client-side to detect lockout independently — rejected; the actual 5-strikes/15-minute policy (`Y-13.md` FR-M008) is enforced server-side by Cognito's own User Pool configuration, so a client-side counter would just be a second, unsynchronized source of truth that can drift from the real lock state.

## R6. How does the staff member get back to the page they originally requested, and how is an already-signed-in visitor kept off `/login`?

**Decision**: No new mechanism needed for either half:

- **Redirect back on success**: reuse the existing `safeRedirect(redirectUrl)` helper (`src/utils/global.util.ts`, already present but currently unused) instead of re-deriving the same same-origin-validation logic the old mock `login/page.tsx` had inline. `login-form.tsx` reads `redirect` from `useSearchParams()` and, on `crmAuthControllerLoginMutation` success, navigates to `safeRedirect(redirectUrl)`.
- **Keeping an authenticated visitor off `/login`**: already handled by `src/proxy.ts`'s existing "redirect authenticated users away from public-only pages" branch — `/login` is `private: false` and not in `PUBLIC_ROUTES_ALLOWED_WHEN_AUTHENTICATED`, so this already satisfies FR-009 today, unchanged.

**Rationale**: Both mechanisms already exist and already do exactly what FR-006/FR-009 ask for; the only gap was that the old mock login page didn't call the existing `safeRedirect` helper and instead duplicated its logic inline. Using the shared helper removes that duplication as a side effect of the rewrite.

**Alternatives considered**: Re-deriving the redirect-target parsing inline (as the old mock page did) — rejected as needless duplication of `safeRedirect`, which already exists for exactly this purpose.

## R7. Why does session expiry (FR-008) require fixing `ClientRequestService`, and how?

**Problem found during planning**: `src/lib/services/ClientRequest.service.ts#handleRefreshToken` is hardcoded to call the **mock** API's refresh endpoint (`Auth.postAuthRefresh` from `@/lib/api`) on every 401, regardless of which client (`mockClient` or `realClient`) triggered it — `src/hooks/useClientRequest.ts` is called once per client but both instances share this one hardcoded refresh call. A staff member authenticated via this feature (or `023-first-time-login`) holds a **real** refresh token that the mock backend cannot recognize, so every 401 on a real-API call currently fails to refresh and falls straight through to `handleLogout()` — session renewal silently never works for a real session, even though nothing currently surfaces that as a bug (the staff member is simply logged out, which happens to look like "the session expired," satisfying `spec.md`'s observable behavior by accident rather than by design).

**Decision**: Make the refresh function an injected dependency rather than a hardcoded import. `ClientRequestServiceProps` gains a `refresh: (session: unknown) => Promise<{ accessToken: string; refreshToken: string }>` function; `useClientRequest(client, syncRequestService, refresh)` takes and forwards it; `react-query.provider.tsx` passes one implementation per client:

- Mock: wraps the existing `Auth.postAuthRefresh` call, normalizing its `{ accessToken, refresh_token }` response shape.
- Real: calls `AuthToken.tokenControllerRefresh({ body: { refreshToken } })` (raw generated class, bypassing the intercepted client — same bypass pattern the mock call already uses, to avoid the response interceptor recursing on the refresh call itself) and normalizes `FitnessTokenResponseDto`'s `{ token, refreshToken, expiresAt }` into the same `{ accessToken, refreshToken }` shape the mock adapter produces. Cookie expiry continues to be computed from the new access token's own JWT `exp` claim via the existing `getTokenExpiration` (consistent with `023-first-time-login` R5's choice to not trust a DTO's separate expiry field) — this sidesteps `expiresAt`/`expiresIn` naming differing between the two DTOs entirely.

On a refresh failure (either adapter throwing, or no usable token in the response), call `handleLogout({ sessionExpired: true })` instead of the current bare `handleLogout()`, so the staff member lands on `/login?variant=session-expired` (FR-008) rather than a bare, unexplained login form.

**Rationale**: This feature is the one whose functional requirement (FR-008) actually depends on this working correctly — the prior feature only ever produced a _fresh_ session (first-time login always ends in a brand-new token pair; it never needed the token to be _renewed_ mid-session), so it never exercised this path. Fixing it now with a constructor-injected function is the minimal change: no new abstraction layer, no new file, just parameterizing a call that was hardcoded to the wrong backend.

**Alternatives considered**:

- Leave it as-is (mock refresh always fails for real sessions → always falls through to logout): rejected — while this technically produces _a_ redirect to `/login`, it does so via the exception path on every single access-token expiry for every real-API staff member, forever, which is not "session renewal," it's "sessions never renew." That contradicts `spec.md`'s Assumptions section, which explicitly states renewal "is already handled by existing shared request-handling code" — an assumption this research step found to be false and is therefore correcting rather than building on top of.
- Two separate `ClientRequestService` subclasses (mock vs. real): rejected — the class has no other real-vs-mock-specific behavior; one injected function is simpler than a class hierarchy for a one-method difference (Constitution V).

## R8. How does explicit sign-out (FR-007) actually invalidate the server session?

**Decision**: `handleLogout()` (`src/utils/global.util.ts`) calls `crmAuthControllerLogout()` (the real, bearer-protected endpoint) **before** removing the `CookieNames.Session` cookie — not after. The call needs no manually-attached header: `crmAuthControllerLogout` is a generated class method that, like all `AuthCrm`/`AuthToken` methods, runs through the same shared `realClient` singleton (`src/lib/api-real/client.gen.ts`) that `useClientRequest(realClient, ...)` already attaches its request interceptor to — that interceptor auto-attaches `Authorization: Bearer <token>` from the cookie whenever a request has none. Calling it before clearing the cookie is what lets that auto-attach find a token at all; calling it after would send an unauthenticated request that can't identify which session to invalidate. The call is best-effort — a network failure or an already-expired token (the endpoint is idempotent and returns 204 even for a session that no longer exists) must never block the local logout (cookie removal + redirect), since a staff member's ability to leave the app cannot depend on a round-trip succeeding.

**Rationale**: The endpoint already exists and is exactly what FR-007 asks for ("MUST invalidate their session on the server, not just clear local state"). `023-first-time-login`'s `plan.md` explicitly named this endpoint as "belongs to the subsequent-login/session-management feature" — i.e., this one — rather than building it prematurely there.

**Alternatives considered**: Firing the logout call without awaiting it (pure fire-and-forget) — rejected in favor of a short `await` with a caught/ignored failure: on a full page navigation immediately after, an un-awaited `fetch` can be aborted by the browser before it leaves the client, defeating the point of calling it at all; awaiting (with a timeout-free catch) is the minimal change that actually gives the request a chance to complete before `window.location.href` navigates away.

## R9. Why promote four files out of `login-initial/` instead of leaving them route-local?

**Decision**: Move `use-google-sign-in.ts`, `use-cognito-temp-password.ts` (renamed `use-cognito-auth.ts`), `login-error-codes.constants.ts` (renamed `auth-error-codes.constants.ts`), and `persist-session.ts` (folded into `src/utils/auth.util.ts` as `persistStaffSession`) out of `login-initial`'s route-local `_hooks`/`_constants`/`_lib` folders into shared `src/` locations, updating `login-initial`'s three consumer files to import from the new locations. No logic changes to any of the four.

**Rationale**: Constitution IV: "Route-local code lives in `_components/`, `_hooks/`, `_contexts/` co-located with the page... shared code lives in `src/components/`" (and by the same principle, `src/hooks/`, `src/constants/`, `src/utils/`). These four files were correctly route-local when `login-initial` was their only consumer; this feature becoming their second consumer is exactly the trigger condition for promoting them, the same way `023-first-time-login` itself promoted `auth-shell.tsx` to `src/components/common/auth/` because _it_ needed two routes to share one shell.

**Alternatives considered**: Duplicating the four files into `login/_hooks/` etc.: rejected as avoidable duplication (Constitution V) that would let the two login screens' Cognito/Google/error-code logic drift apart over time for no reason — they describe the same two identity-provider integrations both times.

---

# Magic-Link Sign-In (added 2026-08-25 — spec User Story 4 / FR-012–FR-022)

## R10. Which API surface does magic-link sign-in use, and does anything need generating?

**Decision**: Nothing needs generating. Both endpoints are already in `src/lib/openapi.real.json` and already emitted into `src/lib/api-real`:

- Request a link — `POST /api/v1/auth/crm/magic-link`, helper `crmAuthControllerCrmMagicLinkIssueMutation()` / class method `AuthCrm.crmAuthControllerCrmMagicLinkIssue`. Body `{ email }`, response `{ accepted: true }`.
- Consume a link — `POST /api/v1/auth/crm/magic-link/verify`, helper `crmAuthControllerCrmMagicLinkVerifyMutation()` / `AuthCrm.crmAuthControllerCrmMagicLinkVerify`. Body `{ token }`, response `CrmLoginResponseDto` — **the same DTO `crmAuthControllerLogin` returns**.

**Rationale**: Constitution II is satisfied without any OpenAPI or codegen work — this feature is purely a new _consumer_ of already-generated code, exactly as R1/R8 were. That the verify response is `CrmLoginResponseDto` is the load-bearing detail: the existing shared `persistStaffSession` helper (promoted in R9) consumes it unchanged, so magic-link sign-in produces a session byte-for-byte identical to a Google or Cognito sign-in, which is what `spec.md` FR-018 and SC-010 require.

**Alternatives considered**: Routing magic link through the MobileApp lane (`POST /auth/magic-link/verify`, `AuthMagicLink`) — rejected; the contract states explicitly that lane "signs a staff into the member app instead" and is a different token audience. The CRM lane is the correct one.

## R11. What URL does the emailed link point at, and how is the landing screen routed?

**Decision**: Two routes, mirroring this codebase's existing split for the identical shape of flow:

| Purpose                  | This feature                | Existing precedent (029)     |
| ------------------------ | --------------------------- | ---------------------------- |
| Ask for a link by email  | `/magic-link-login`         | `/password-reset`            |
| Consume the emailed link | `/magic-link?token=<token>` | `/password-set?email=&code=` |

**Update (2026-08-25, post-implementation)**: the initial guess below (request at `/magic-link`, consume at `/magic-link/verify`) turned out not to match the backend's actual mailed link, confirmed from a live send: `<crm-origin>/magic-link?token=<43-char base64url token>`. Per this very decision's own contingency, the frontend route was the cheap side to move — the request screen was renamed to `/magic-link-login` and the consume screen took over `/magic-link` so the app matches the backend exactly, with no change to either endpoint or DTO.

The backend composes and mails the link, so the CRM frontend does not construct that URL — it only has to _be_ at the path the backend points to.

**Rationale**: A single route branching on the presence of a token would be marginally fewer files, but it collapses two screens with nothing in common (a form vs. a non-interactive consume-and-redirect step) into one component, and it breaks the symmetry with `/password-reset` → `/password-set` that a reader of this codebase already knows. Being under `(public)/(auth)/` also means the generated route config marks both `private: false`, which is what delivers FR-022 with no `proxy.ts` change (see R12).

**Alternatives considered**:

- Landing on `/login?token=…` and verifying from the login screen — rejected: it puts a non-interactive network step inside the screen whose job is the interactive fallback, and it would make the login page's already-four-way alert state machine responsible for a fifth, unrelated concern.
- Having the frontend build the link URL and pass it to the issue endpoint — rejected and not possible: `CrmMagicLinkIssueRequestDto` accepts only `email`; link composition is deliberately server-side so the token never transits the browser that requested it.

## R12. How are FR-022 (already-signed-in staff) and the already-signed-in link-opener handled?

**Decision**: No new mechanism. Both new routes sit under `(public)/`, so the route generator marks them `private: false`, and `proxy.ts`'s existing branch — "redirect authenticated users away from public-only pages" — sends an already-signed-in staff member straight to `/`. That satisfies FR-022 for the request screen for free, identically to how FR-009 is already satisfied for `/login` (R6).

The same rule also catches an already-signed-in staff member who opens a magic link: they are redirected to `/` **without the token being consumed**, leaving the link usable later. That is the better outcome than silently burning a valid one-time token to re-establish a session they already have, and it is the behavior `spec.md`'s edge-case list assumes when it says a second open "does not affect the first, already-established session."

**Rationale**: Reusing the existing proxy rule keeps FR-022 a zero-line requirement and avoids a second, competing source of truth for "who may see a public-only page."

**Alternatives considered**: Exempting `/magic-link` (the consume screen) from the public-only redirect so a signed-in staff member's click still consumes the token and swaps sessions — rejected as strictly worse: it burns a token to no benefit and would let a stale link silently replace an active session.

## R13. Does the non-disclosure rule (FR-014) need client-side masking, as password reset did?

**Decision**: No. The issue endpoint returns `{ accepted: true }` for every well-formed address by contract — "this public endpoint never discloses whether an email is a staff account" — so the client shows the sent state on any 2xx with no branching. The only failure the screen can surface is a transport failure or a `400 E-VAL-001`, both of which mean _nothing was sent_ and therefore correctly produce the retry-able error of FR-021 rather than a false confirmation.

**Rationale**: This is a genuine simplification over the sibling password-reset screen (029 R3), which had to catch Cognito's `UserNotFoundException` and _deliberately treat it as success_ to avoid leaking account existence. Here the backend already owns that guarantee, so the client must **not** add its own branch — any client-side special-casing could only re-introduce the leak the endpoint was designed to prevent.

**Alternatives considered**: Mirroring 029's defensive catch anyway, for symmetry — rejected; there is no error to catch, and dead defensive code around a security property invites a later reader to "fix" it in the wrong direction.

## R14. How do the verify step's two failure modes reach the staff member?

**Decision**: The verify screen never renders its own error UI. It redirects to `/login` with a banner variant, because `spec.md` FR-019/FR-020 both require the staff member to end up on the login page able to act immediately:

| Verify outcome                                                     | Code             | Redirect                            | Banner                                                                                                  |
| ------------------------------------------------------------------ | ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Token invalid **or** expired **or** already used **or** superseded | `401 E-AUTH-030` | `/login?variant=magic-link-invalid` | **New** alert: "ログインリンクが無効か、有効期限が切れています。お手数ですが、もう一度お試しください。" |
| Staff deactivated since the link was issued                        | `403 E-AUTH-034` | `/login?variant=account-status`     | Existing account-not-registered alert (V0 PAR005) — same one FR-003 already uses                        |
| Malformed/absent `token` in the URL, or a transport failure        | —                | `/login?variant=magic-link-invalid` | same as the 401 row                                                                                     |

`login-form.tsx`'s `initialVariant` prop and its `SignInError` view-model union each gain `'magic-link-invalid'`; `'account-status'` already exists and is reused as-is.

**Rationale**: The backend collapsing invalid/expired/used into one `E-AUTH-030` is exactly the non-disclosure property FR-019 asks for, so the client gets that requirement by faithfully _not_ attempting to distinguish them — one code in, one message out. Folding a malformed-token URL into the same bucket costs nothing and avoids a second message that would only ever be seen by someone who hand-edited the URL.

**Note on V0 parity**: the V0 mockup has no screen or banner for a failed link — `magic-link-login.tsx` ends at the sent state. The `magic-link-invalid` banner is therefore a spec-driven addition with no V0 counterpart, styled to match the existing destructive alerts (PAR004–PAR006). `checklists/parity.md` records this so it is not later mistaken for a parity miss in either direction.

**Alternatives considered**: An in-place error card on `/magic-link` (the consume screen) with a "request a new link" button — rejected; it adds a third screen to a two-screen flow and leaves the staff member one extra click from the login form they will need anyway, contradicting Constitution IV's "shortest path to the user's goal."

## R15. What stops the one-time token from being consumed twice by the client itself?

**Problem**: `/magic-link` (the consume screen) fires its mutation from an effect on mount. React StrictMode double-invokes effects in development, and any remount (fast refresh, a stray re-render from `useSearchParams`) would fire a second verify for the same token. Because the token is genuinely single-use server-side, the second call returns `401 E-AUTH-030` — so a **valid** link would show the invalid-link banner, and the race would decide which of the two responses won. This is a self-inflicted version of exactly the failure FR-019 describes.

**Decision**: Guard the call with a `useRef` latch set synchronously before the request is issued (`if (hasStartedRef.current) return; hasStartedRef.current = true;`), so at most one verify request exists per mounted component regardless of how many times the effect runs. Navigation away on both the success and failure paths means the component never legitimately needs to verify twice.

**Rationale**: A ref latch is the minimal, standard fix and is set synchronously, so it holds even for StrictMode's back-to-back synchronous effect invocations — which a `useState` flag would not, since its update is not visible until the next render. TanStack Query's `useMutation` gives no built-in de-duplication (unlike `useQuery`), so the guard has to be explicit.

**Alternatives considered**:

- Using `useQuery` instead, to get request de-duplication for free — rejected: this is a non-idempotent, state-changing POST; modelling it as a cache-backed query invites refetch-on-focus/reconnect to consume tokens as a side effect, which is far worse than the problem being solved.
- Disabling StrictMode — rejected outright: hiding a real double-invocation hazard app-wide to paper over one screen.
- Verifying server-side in a route handler instead of the browser — rejected; it would need a new mock/BFF route (Constitution II) and the session cookie is written client-side by `persistStaffSession` today, so it would fork the session-persistence path for one screen.
