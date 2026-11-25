# Implementation Plan: Forgot Password (Password Reset)

**Branch**: `029-password-reset` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/029-password-reset/spec.md`

## Summary

Add two new public auth screens — `/password-reset` (request a reset link) and `/password-set` (set a new password from that link) — that let a staff member who signs in via email+password (経路②) self-serve a password reset. Per `research.md` R1, this is implemented entirely against Amazon Cognito's public `ForgotPassword`/`ConfirmForgotPassword` API, extending the same `use-cognito-auth.ts` hook `023-first-time-login`/`028-subsequent-login` already use for `InitiateAuth`/`RespondToAuthChallenge` — no new fitness-api endpoint, no new mock-db surface, no new npm dependency. The set-password screen reuses the already-shared `PasswordSetForm` component built for exactly this purpose. This feature also wires up `028-subsequent-login`'s existing, already-rendered-but-unwired "パスワードをお忘れの方" link on `/login`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5 (not used for the Cognito calls themselves — those go through the existing `callCognito` fetch helper, same as `InitiateAuth`/`RespondToAuthChallenge` — but used for nothing new here since no fitness-api call is made), react-hook-form + Zod (existing shared `passwordSetFormSchema`, reused as-is), lucide-react, Tailwind CSS v4. Amazon Cognito's public auth API is called directly (fetch, no AWS SDK), reusing the exact `use-cognito-auth.ts` mechanism `023-first-time-login`/`028-subsequent-login` already established — no new npm packages.
**Storage**: None owned by this feature. Amazon Cognito owns the reset-code/link lifecycle entirely (research.md R1); the only client-held state is the two screens' own in-memory view-model state (`data-model.md`).
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application — single existing Next.js App Router project (`fitness-crm`); no new project/package.
**Performance Goals**: Standard interactive web responsiveness; spec.md SC-001/SC-002 (30s / 60s end-to-end) are met by the same single-round-trip request pattern `023-first-time-login`/`028-subsequent-login` already use for their Cognito calls.
**Constraints**: No new npm dependencies (Constitution V). No fitness-api or mock-db changes (research.md R1) — the reset flow is entirely a client-side Cognito integration, mirroring the existing sibling auth screens.
**Scale/Scope**: 2 new routes (`(public)/(auth)/password-reset`, `(public)/(auth)/password-set`), 1 existing shared file extended (`src/hooks/use-cognito-auth.ts` gains `forgotPassword`/`confirmForgotPassword`), 1 existing file modified to wire a previously-inert link (`login/_components/login-form.tsx`); no new backend or mock-db surface.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                                                                                                       | Notes                                                                                                        |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| I   | TypeScript Strictness  | ☑ All new code strict TS; Cognito response/error shapes typed (extending the existing `CognitoAuthError`/response interfaces already in `use-cognito-auth.ts`); no `any`                                                                                                    |                                                                                                              |
| II  | OpenAPI-First          | ☑ No new fitness-api endpoint and no change to `src/lib/api-real` (generated, untouched); the Cognito public API is a third-party IDaaS call outside the fitness-api boundary, same carve-out `028-subsequent-login` documented for `InitiateAuth`/`RespondToAuthChallenge` | See `research.md` R1 and `028-subsequent-login/plan.md`'s Constitution Check II note for the same carve-out. |
| III | Spec-Driven            | ☑ `spec.md` approved; no `[NEEDS CLARIFICATION]` tokens remain                                                                                                                                                                                                              |                                                                                                              |
| IV  | App Router & Simple UX | ☑ `"use client"` justified (interactive form state, browser `fetch` to Cognito — same justification already accepted for sibling auth screens); shadcn/ui + Tailwind only via the reused shared `PasswordSetForm`; single-form, no wizard, no modal                         |                                                                                                              |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; reuses the existing `use-cognito-auth.ts` hook and the existing shared `PasswordSetForm` rather than introducing new abstractions (research.md R5)                                                                                                   |                                                                                                              |

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/029-password-reset/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
├── checklists/
│   ├── requirements.md  # /speckit.specify output
│   └── parity.md        # /speckit.specify output — 24 items, PAR001-024
└── tasks.md             # Phase 2 output (/speckit.tasks - not created here)
```

### Source Code (repository root)

```text
src/app/(public)/(auth)/password-reset/
├── page.tsx                              # NEW - renders PasswordResetForm
└── _components/
    └── password-reset-form.tsx           # NEW - Card shell + email form + sent/cooldown
                                           #   state + Google-SSO guidance note; reproduces
                                           #   password-reset.tsx (V0), PAR001-010

src/app/(public)/(auth)/password-set/
├── page.tsx                              # NEW - Suspense-wrapped; reads `email`/`code`
│                                          #   search params; renders the confirm form or
│                                          #   the expired state
└── _components/
    ├── password-reset-confirm-form.tsx   # NEW - wraps the shared PasswordSetForm; calls
    │                                      #   confirmForgotPassword; owns 'form'/'done'
    │                                      #   phase (PAR011-018, PAR022-024)
    └── password-reset-expired-state.tsx  # NEW - "invalid or expired" card + CTA back to
                                           #   /password-reset (PAR019-021); used both for
                                           #   missing URL params and Cognito rejection

src/app/(public)/(auth)/login/_components/
└── login-form.tsx                        # MODIFIED - "パスワードをお忘れの方" button gains
                                           #   an onClick -> router.push(navigate('/password-reset'))
                                           #   (removes the "out of scope" comment from 028)

src/hooks/
└── use-cognito-auth.ts                   # MODIFIED - adds `forgotPassword` and
                                           #   `confirmForgotPassword`, using the existing
                                           #   `callCognito` helper (no new file, no new dep)
```

Not touched by this feature: `src/app/api/_mock-db/**`, `src/lib/openapi.real.json`, any file under `src/lib/api-real/` (generated), `src/components/common/auth/password-set-form.tsx` and its schema (consumed as-is, per `research.md` R5), `src/proxy.ts` (the new routes are auto-registered as public via the existing `(public)` route group, same as `/login`; no `PUBLIC_ROUTES_ALLOWED_WHEN_AUTHENTICATED` entry is needed since, unlike `/login-initial/success`, neither new screen is reached while already authenticated).

No `tests/` directory — per the constitution's No Testing Policy, verification is manual via `quickstart.md`.

**Structure Decision**: Single existing Next.js App Router project (this repo). Two new routes are added under the existing `(public)/(auth)/` route group, following the exact folder convention `login`/`login-initial` already use (route-local `_components/`, no route-local `_hooks`/`_schema` needed since both consumed schemas/components are already shared). One existing shared file (`use-cognito-auth.ts`) gains two functions rather than a new hook file, since they share the same `callCognito` transport and error type as the hook's existing functions (Constitution V — no new abstraction). One existing route (`login`) gets a one-line wiring change to a link it already renders.

## Complexity Tracking

No Constitution Check violations — this table is intentionally empty.
