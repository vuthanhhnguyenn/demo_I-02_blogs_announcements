# Implementation Plan: Subsequent Login (AUTH-01 認証・ログイン)

**Branch**: `028-subsequent-login` (worked on `feat/implement-auth-login`) | **Date**: 2026-08-05, amended 2026-08-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/028-subsequent-login/spec.md`
**Amendment (2026-08-25)**: magic-link sign-in (spec User Story 4 / FR-012–FR-022) added to scope. See the Summary addendum below, `research.md` R10–R15, and the new rows in Project Structure.

## Summary

Replace the mock-backed `src/app/(public)/login/page.tsx` with a real implementation that signs staff in via Google or Cognito against `POST /api/v1/auth/crm/login` (no `inviteToken`, mirroring the pattern already proven by `023-first-time-login`), wires the existing header "ログアウト" action to actually invalidate the server-side session (`POST /api/v1/auth/crm/logout`), and fixes a latent gap this feature's own session-expiry requirement (FR-008) exposes: the shared 401-retry interceptor (`ClientRequestService`) is hardcoded to call the **mock** refresh endpoint for every client, so a real-API session can never actually renew — it always falls straight through to a forced logout. See `research.md` R7/R8 for why this fix belongs in this feature rather than being deferred again. The Google/Cognito browser-side hooks and the session-cookie-persistence helper introduced by `023-first-time-login` are promoted from that feature's route-local folders into shared locations (Constitution IV) since this feature is their second consumer.

**Magic-link addendum (2026-08-25)**: add two new public routes — `(public)/(auth)/magic-link-login` (request a one-time sign-in link) and `(public)/(auth)/magic-link` (consume the link and sign in) — backed by the already-generated `crmAuthControllerCrmMagicLinkIssueMutation` / `crmAuthControllerCrmMagicLinkVerifyMutation` helpers, and enable the login footer's currently-`disabled` "マジックリンクでログイン" button. The request screen is a near-twin of the already-shipped `password-reset-form.tsx` (029), so the one genuinely duplicated piece — the 60-second resend countdown — is promoted to a shared `useResendCooldown` hook rather than copy-pasted (same Constitution IV trigger as R9). The verify screen reuses the existing `persistStaffSession` helper and hands its two failure modes back to `/login` as banner variants. No OpenAPI edits, no codegen, no new npm packages: the endpoints are already present in `src/lib/api-real`. (Route names were finalized post-implementation to match the backend's actual mailed link — see `research.md` R11.)

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5 (via the generated `src/lib/api-real` hooks), react-hook-form + Zod (existing email/password schema, reused as-is), lucide-react, Tailwind CSS v4, `universal-cookie` (existing dep). Google Identity Services and Amazon Cognito's public auth API are called directly (script tag / `fetch`), reusing the exact mechanisms `023-first-time-login` already established — no new npm packages.
**Storage**: None owned by this feature. The real fitness-api backend owns staff-account and session state; the only client-held state is the `CookieNames.Session` cookie (existing mechanism, same shape written by `023-first-time-login`).
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application — single existing Next.js App Router project (`fitness-crm`); no new project/package.
**Performance Goals**: Standard interactive web responsiveness; `spec.md` SC-001/SC-002 (15s / 30s end-to-end sign-in) are met by the same request pattern already validated in `023-first-time-login`.
**Constraints**: No new npm dependencies (Constitution V). The refresh-token fix (R7) must not change the mock client's existing behavior — only the real client gains a working refresh path.
**Scale/Scope**: 1 route rewritten (`(public)/login`), 4 existing files promoted from route-local to shared (Constitution IV dedup), 3 existing shared files modified (`useClientRequest.ts`, `ClientRequest.service.ts`, `global.util.ts`, `auth.util.ts`) to close the refresh/logout gap; no new backend or mock-db surface. **+ magic link (2026-08-25)**: 2 new routes (5 new files), 1 new shared hook, 1 new shared constant entry, 2 existing files touched (`login-form.tsx` footer + variant union, `password-reset-form.tsx` adopting the shared cooldown hook); still no new backend, mock-db, OpenAPI, or npm surface.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                          | Check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Notes                                                                                           |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness              | ☑ All new/moved code stays strict TS; DTOs come from the generated `src/lib/api-real/types.gen.ts`; the refresh-response normalization introduces one small hand-written type (`RefreshResult`) since the mock and real refresh DTOs use different field names                                                                                                                                                                                                                                                                                                                                      |                                                                                                 |
| II  | OpenAPI-First                      | ☑ Uses `crmAuthControllerLoginMutation`, `crmAuthControllerLogout`/`crmAuthControllerLogoutMutation`, `tokenControllerRefresh` from the generated `src/lib/api-real` client as-is, zero edits to generated files; no new mock-db table                                                                                                                                                                                                                                                                                                                                                              | The real refresh/logout calls are new _consumers_ of already-generated code, not new endpoints. |
| III | Spec-Driven                        | ☑ `spec.md` approved; no `[NEEDS CLARIFICATION]` tokens remain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |                                                                                                 |
| IV  | App Router & Simple UX             | ☑ `"use client"` justified (browser-only GIS script, `fetch`-based Cognito calls, interactive form state — same justification already accepted for `023-first-time-login`); shadcn/ui + Tailwind only; promoting the 4 shared files out of `login-initial/` is _required_ by this principle now that a second route consumes them, not optional cleanup                                                                                                                                                                                                                                             |
| V   | Simplicity & Min. Deps             | ☑ No new npm packages; the refresh-fix (R7) adds one small injected function per client rather than a new abstraction layer, and removes duplication (R9) rather than adding it                                                                                                                                                                                                                                                                                                                                                                                                                     |                                                                                                 |
| —   | _Magic-link re-check (2026-08-25)_ | ☑ I: no new hand-written DTOs — request/response types come from `types.gen.ts`. ☑ II: both endpoints already exist in `openapi.real.json` and are already generated; zero edits to generated files, no mock-db route. ☑ III: `spec.md` User Story 4 / FR-012–FR-022 approved with no `[NEEDS CLARIFICATION]`. ☑ IV: `"use client"` justified on both new screens (interactive form state; token read + mutation on mount); shadcn/ui + Tailwind only; two plain screens, no wizard or modal. ☑ V: no new packages; the one duplicated mechanism (resend countdown) is extracted rather than copied | See `research.md` R10–R15                                                                       |

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/028-subsequent-login/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
src/app/(public)/login/
├── page.tsx                          # REWRITTEN — Suspense-wrapped; reads `redirect` and `variant`
│                                      #   search params; renders LoginForm; no longer calls the mock
│                                      #   postAuthLoginMutation
├── _components/
│   └── login-form.tsx                # NEW — Card shell + Google button + email/password form +
│                                      #   the 4 alert states (error / session-expired / locked /
│                                      #   domain-unregistered); reproduces login.tsx (V0)
└── _schema/
    └── login.schema.ts               # EXISTING — unchanged; email format + non-empty password
                                       #   validation already satisfies FR-010

src/hooks/
├── use-google-sign-in.ts             # MOVED from login-initial/_hooks/ — unchanged logic, now
│                                      #   imported by both login-initial and login (R9)
├── use-cognito-auth.ts               # MOVED + RENAMED from
│                                      #   login-initial/_hooks/use-cognito-temp-password.ts —
│                                      #   unchanged logic (initiateAuth, respondToNewPassword,
│                                      #   CognitoAuthError); renamed because it is no longer
│                                      #   temp-password-specific once login/ also calls initiateAuth
└── useClientRequest.ts               # MODIFIED — accepts a third `refresh` param (the
                                       #   client-appropriate refresh function, R7); extends the
                                       #   `isAuthRequest` bypass list with `/api/v1/auth/refresh`
                                       #   and `/api/v1/auth/crm/logout` (R7)

src/constants/
└── auth-error-codes.constants.ts     # MOVED from login-initial/_constants/login-error-codes.constants.ts
                                       #   — unchanged content

src/utils/
├── auth.util.ts                      # MODIFIED — adds `persistStaffSession` (moved from
│                                      #   login-initial/_lib/persist-session.ts, unchanged logic)
│                                      #   and `normalizeRefreshResult` adapters for R7
└── global.util.ts                    # MODIFIED — `handleLogout` gains an optional
                                       #   `{ sessionExpired?: boolean }` param; calls
                                       #   `crmAuthControllerLogout` (best-effort, before clearing
                                       #   the cookie so the bearer token is still attached) per
                                       #   FR-007; appends `?variant=session-expired` when
                                       #   `sessionExpired` is true, per FR-008

src/lib/services/
└── ClientRequest.service.ts          # MODIFIED — constructor accepts an injected `refresh`
                                       #   function instead of hardcoding the mock
                                       #   `Auth.postAuthRefresh` call; on refresh failure, calls
                                       #   `handleLogout({ sessionExpired: true })`

src/providers/react-query.provider.tsx  # MODIFIED — passes the mock-specific and real-specific
                                         #   refresh functions into the two `useClientRequest` calls

src/app/(public)/login-initial/         # MODIFIED (imports only, no behavior change) —
├── _components/google-login-form.tsx  #   import `useGoogleSignIn` from `@/hooks/use-google-sign-in`
├── _components/cognito-login-form.tsx  #   import `useCognitoAuth`/`CognitoAuthError` from
│                                        #   `@/hooks/use-cognito-auth`; import `LOGIN_ERROR_CODES`
│                                        #   from `@/constants/auth-error-codes.constants`
├── _components/first-time-password-set-form.tsx  # same import updates
├── _hooks/, _constants/, _lib/         # REMOVED once empty (contents moved above)
```

### Source Code — magic-link addendum (2026-08-25, renamed post-implementation same day)

**Route naming note**: the routes below were originally planned as `/magic-link` (request) and `/magic-link/verify` (consume). Once implemented, the backend's actual mailed link was confirmed to be `<crm-origin>/magic-link?token=…` — not `/magic-link/verify` as `research.md` R11 had guessed. Per R11's own contingency ("the frontend route is the cheap side to move"), the request screen was renamed to `/magic-link-login` and the consume screen took over `/magic-link`, so the app matches the backend exactly. The tree below reflects the final, renamed structure.

```text
src/app/(public)/(auth)/magic-link-login/
├── page.tsx                          # NEW — RSC shell: <AuthShell><MagicLinkRequestForm/></AuthShell>,
│                                      #   mirroring password-reset/page.tsx exactly
├── _components/
│   └── magic-link-request-form.tsx   # NEW ("use client") — Card + email field + send button +
│                                      #   sent state (success icon, echoed address, 15分/1回 note,
│                                      #   resend w/ countdown) + "ログインに戻る" footer.
│                                      #   Reproduces magic-link-login.tsx (V0) — PAR016–PAR029
└── _schema/
    └── magic-link-form.schema.ts     # NEW — Zod: required + email format (FR-013); a near-copy of
                                       #   password-reset-form.schema.ts, kept separate so each
                                       #   screen's message wording stays independently editable

src/app/(public)/(auth)/magic-link/
├── page.tsx                          # NEW — RSC shell, Suspense-wrapped (reads ?token= via
│                                      #   useSearchParams in the child)
└── _components/
    └── magic-link-verify.tsx         # NEW ("use client") — consumes ?token= once (StrictMode-safe
                                       #   ref guard, R15), shows a spinner while verifying, then
                                       #   persistStaffSession + navigate('/'), or redirects to
                                       #   /login with the appropriate banner variant (R14)

src/hooks/
└── use-resend-cooldown.ts            # NEW — the 60s countdown currently inlined in
                                       #   password-reset-form.tsx, extracted on its second
                                       #   consumer (same Constitution IV trigger as R9).
                                       #   Returns { secondsLeft, start, isCoolingDown }

src/constants/
└── auth-error-codes.constants.ts     # MODIFIED — add MAGIC_LINK_INVALID: 'E-AUTH-030'
                                       #   (invalid / expired / already-used — one code for all
                                       #   three by design, R14)

src/app/(public)/(auth)/login/_components/login-form.tsx
                                      # MODIFIED — footer's "マジックリンクでログイン" button loses
                                      #   `disabled` and becomes a Link to navigate('/magic-link-login')
                                      #   (FR-012); `initialVariant` union and the SignInError
                                      #   view-model gain 'magic-link-invalid' (new alert, R14)

src/app/(public)/(auth)/password-reset/_components/password-reset-form.tsx
                                      # MODIFIED (no behavior change) — drops its inline cooldown
                                      #   useState/useEffect in favour of useResendCooldown

src/lib/routes/routes.config.ts       # REGENERATED (not hand-edited) — picks up /magic-link and
                                      #   /magic-link-login as `private: false` routes, which is
                                      #   what gives FR-022 its behavior for free via proxy.ts
```

Not touched by this feature: `src/app/api/_mock-db/**`, `src/lib/openapi.real.json`, any file under `src/lib/api-real/` (generated), `src/proxy.ts` (already redirects an unauthenticated visitor to `/login?redirect=...` and an authenticated one away from `/login` — both satisfy FR-006/FR-009 as-is, see `research.md` R6).

No `tests/` directory — per the constitution's No Testing Policy, verification is manual via `quickstart.md`.

**Structure Decision (magic-link addendum)**: Two new routes rather than one token-branching route, following this codebase's own established split for the same shape of flow (`/password-reset` requests, `/password-set` consumes) — see `research.md` R11. Both live under `(public)/(auth)/`, which is what makes them `private: false` in the generated route config and therefore already covered by `proxy.ts`'s existing "redirect authenticated users away from public-only pages" branch (FR-022, no proxy change needed).

**Structure Decision**: Single existing Next.js App Router project (this repo). One existing route (`(public)/login`) is rewritten in place; four small existing files move from `login-initial`'s route-local `_hooks`/`_constants`/`_lib` folders to shared `src/hooks`/`src/constants`/`src/utils` locations because this feature is their second consumer (Constitution IV: shared code lives in `src/`, route-local code stays co-located only while it has one consumer); three shared infrastructure files (`useClientRequest.ts`, `ClientRequest.service.ts`, `global.util.ts`) gain the minimal changes needed to make session refresh and logout actually work against the real backend, which this feature's own FR-007/FR-008 require.

## Complexity Tracking

No Constitution Check violations — this table is intentionally empty. The refresh-token interceptor change (R7) is a bug fix required by this feature's own functional requirements, not an added abstraction: it replaces one hardcoded call with one injected parameter, using the same interceptor shape that already exists.
