# Implementation Plan: First-Time Login (AUTH-01 認証・ログイン)

**Branch**: `023-first-time-login` | **Date**: 2026-08-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-first-time-login/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement the four first-time-login screens (invite-link login, expired-link message, forced temporary-password change, completion) by integrating directly with the real fitness-api endpoints already present in `openapi.real.json` (`GET /api/v1/auth/invite/verify`, `POST /api/v1/auth/crm/login`) via the generated `src/lib/api-real` client — this feature does not use the mock DB. The Google and Cognito identity-provider hops that produce the `idToken` those endpoints require are done client-side with zero new npm dependencies (Google Identity Services script tag; Cognito's public JSON API called via `fetch`). See `research.md` for the decisions behind each of these choices, in particular why the four mockup screens map to two Next.js routes rather than four (R4).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5 (via the generated `src/lib/api-real` hooks), react-hook-form + Zod (new-password form), lucide-react, Tailwind CSS v4, `universal-cookie` (existing dep, reused for session persistence). Google Identity Services and Amazon Cognito's public auth API are called directly (script tag / `fetch`) — no new npm packages (see `research.md` R2, R3).
**Storage**: None owned by this feature. The real fitness-api backend owns invitation and staff-account state; the only client-held state is the `CookieNames.Session` cookie (existing mechanism) and transient in-memory Cognito challenge state (never persisted — see `research.md` R3/R4).
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application — single existing Next.js App Router project (`fitness-crm`); no new project/package.
**Performance Goals**: Standard interactive web responsiveness; no specialized throughput target. Invite-verify and login round-trips should complete quickly enough that `spec.md` SC-001 ("under 2 minutes end-to-end on a normal connection") is met.
**Constraints**: The Cognito `Session` challenge token MUST stay in transient client component state only — never written to a cookie, `localStorage`, or a URL (research.md R3/R4). No new npm dependencies (Constitution V) — Google/Cognito integration uses a script tag and plain `fetch` respectively.
**Scale/Scope**: 2 new routes, 1 new shared layout component, 4 reproduced UI states; no new backend or mock-db surface.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                                                                                                       | Notes                                                                                                                                                                                                                                                                              |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent                                                                                                                                                                                          | DTOs come from the generated `src/lib/api-real/types.gen.ts`; Cognito response shapes get a small hand-written type since Cognito has no generated client.                                                                                                                         |
| II  | OpenAPI-First          | ☑ Uses the generated `src/lib/api-real` client with zero manual edits to generated files; no new mock-db table added                                                                                                                                                        | Google/Cognito calls are third-party identity-provider hops outside the fitness-api boundary, not represented in `openapi.real.json` by design (see `contracts/auth-crm.md`) — they are the _inputs_ to the one real endpoint this feature calls, not a second API surface we own. |
| III | Spec-Driven            | ☑ `spec.md` approved; no `[NEEDS CLARIFICATION]` tokens remain                                                                                                                                                                                                              |                                                                                                                                                                                                                                                                                    |
| IV  | App Router & Simple UX | ☑ `"use client"` justified (browser-only GIS script, `fetch`-based Cognito calls, and interactive form state); shadcn/ui + Tailwind only; the R4 two-route design is the _shorter_ path (avoids an extra navigation + state round-trip that four literal routes would need) |                                                                                                                                                                                                                                                                                    |
| V   | Simplicity & Min. Deps | ☑ No new npm packages — Google Identity Services via script tag, Cognito via native `fetch` (research.md R2, R3); no new abstraction layers beyond the existing route-local `_components`/`_hooks` convention                                                               |                                                                                                                                                                                                                                                                                    |

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/app/(public)/login-initial/
├── page.tsx                          # NEW — client component; verifies `token` on mount, renders
│                                      #        expired | login-form | first-time-password-set
├── _components/
│   ├── expired-state.tsx             # NEW — reproduces login-initial-expired.tsx
│   ├── login-form.tsx                # NEW — card shell + provider dispatch, reproduces login-initial.tsx
│   ├── google-login-form.tsx         # NEW — GIS button + ID-token callback branch of login-form.tsx
│   ├── cognito-login-form.tsx        # NEW — email/temp-password branch of login-form.tsx
│   └── first-time-password-set-form.tsx  # NEW — Cognito challenge submission + inline errors, wraps
│                                      #        the shared PasswordSetForm; reproduces first-time-password-set.tsx
├── _constants/
│   └── login-error-codes.constants.ts # NEW — crm/login + invite-verify error codes shared across the forms above
├── _hooks/
│   ├── use-google-sign-in.ts         # NEW — loads GIS script, exposes the ID-token callback
│   └── use-cognito-temp-password.ts  # NEW — InitiateAuth / RespondToAuthChallenge fetch calls
├── _lib/
│   └── persist-session.ts            # NEW — writes CookieNames.Session after crmAuthControllerLogin succeeds
└── success/
    └── page.tsx                     # NEW — reproduces login-initial-success.tsx

src/components/common/auth/
├── auth-shell.tsx                   # NEW — shared centered-card shell (ported from V0), used by both routes above
└── password-set-form.tsx            # NEW — shared new-password/confirm-password card (requirement checklist,
                                      #        strength bar); reused by first-time-password-set-form.tsx above and,
                                      #        later, AUTH-03's standalone password-set screen

src/schemas/
└── password-set-form.schema.ts      # NEW — password requirement/strength helpers + zod schema for password-set-form.tsx

src/lib/api-real/                    # EXISTING (generated) — crmAuthControllerInviteVerifyOptions,
                                      #   crmAuthControllerLoginMutation consumed as-is, no edits

src/types/global.enum.ts             # EXISTING — CookieNames.Session reused for the resulting session
src/utils/auth.util.ts               # EXISTING — getTokenExpiration reused for cookie expiry

public/logo-yamauchi.svg             # EXISTING — already present, reused by auth-shell.tsx

.env.example                         # MODIFIED — add NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                                      #   NEXT_PUBLIC_COGNITO_CLIENT_ID, NEXT_PUBLIC_COGNITO_REGION
```

Not touched by this feature: `src/app/api/_mock-db/**`, `src/lib/openapi.real.json`, any file under `src/lib/api-real/` (all generated), and the existing `src/app/(public)/login/**` (subsequent-login flow, explicitly out of scope per `spec.md`).

No `tests/` directory — per the constitution's No Testing Policy, verification is manual via `quickstart.md`.

**Structure Decision**: Single existing Next.js App Router project (this repo). Two new route segments under the existing `(public)` group (`login-initial` and `login-initial/success`), following the same route-local `_components`/`_hooks` co-location convention already used elsewhere in `src/app/(private)/**`, plus one new shared component under `src/components/common/` because it is used by both new routes (Constitution IV: route-local code co-located, shared code lives in `src/components/`).

## Complexity Tracking

No Constitution Check violations — this table is intentionally empty.
