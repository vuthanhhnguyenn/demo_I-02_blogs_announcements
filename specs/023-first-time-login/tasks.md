---
description: 'Task list for First-Time Login (AUTH-01 認証・ログイン)'
---

# Tasks: First-Time Login (AUTH-01 認証・ログイン)

**Input**: Design documents from `/specs/023-first-time-login/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/auth-crm.md](contracts/auth-crm.md), [checklists/parity.md](checklists/parity.md)

**Organization**: Tasks are grouped by user story (US1/US2/US3 from `spec.md`) so each can be delivered and verified independently. Per `research.md` R4, all three stories share a single route (`/login-initial`, 3 internal states) rather than one route each — the Foundational phase builds that shared skeleton; each story then fills in its own state's UI/logic.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (temporary password, P1), US2 (Google, P2), US3 (expired link, P2)
- UI tasks cite their V0 source (`— port from <file> › <range>`) and the parity items they satisfy (`; satisfies PARnnn`), per `checklists/parity.md`

## Path Conventions

Single Next.js App Router project (this repo). All paths below are relative to the repository root.

---

## Phase 1: Setup

**Purpose**: Configuration and shared visual chrome needed before any route logic exists.

- [x] T001 Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_REGION` to `.env.example` with placeholder comments, per `plan.md`'s Project Structure section.
- [x] T002 [P] Create the shared auth layout in `src/components/common/auth/auth-shell.tsx` — centered card layout with the YAMAUCHI logo lockup and "JOYFIT CRM" label above the content slot — port from `.cache/fitness-crm-ui/src/components/auth-shell.tsx` (L1-22). Reuses the existing `public/logo-yamauchi.svg`. Not itself a `parity.md` item (shared shell, not one of the four screens) but required by every task below that renders a screen.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared route skeleton, completion screen, and session-persistence helper that all three user stories build on.

**⚠️ CRITICAL**: No user story phase can start until this phase is complete.

- [x] T003 Create `src/app/(public)/login-initial/page.tsx` as a client component: read the `token` query param, call `crmAuthControllerInviteVerifyOptions({ query: { token } })`, and manage a `'verifying' | 'expired' | 'valid' | 'set-new-password'` view state per `data-model.md`'s state-transition diagram (missing `token` or a query error/404/410 → `'expired'`; 200 → `'valid'`). Wrap rendered content in `<AuthShell>` (T002). Render placeholders for now (filled in by later phases) — port the outer `Card`/`CardHeader` shell from `.cache/fitness-crm-ui/src/pages/login-initial.tsx` (L40-46); satisfies PAR001. Depends on: T002.
- [x] T004 [P] Create `src/app/(public)/login-initial/success/page.tsx` — completion screen with success icon, "初回ログインが完了しました" title, "JOYFIT CRM をご利用いただけます" description, and a "ダッシュボードへ進む" button that navigates to `/` (the dashboard route) — port from `.cache/fitness-crm-ui/src/pages/login-initial-success.tsx` (L9-34); satisfies PAR018-PAR022. Depends on: T002.
- [x] T005 [P] Create `src/app/(public)/login-initial/_lib/persist-session.ts` exporting `persistStaffSession(response: CrmLoginResponseDto)` — writes the `CookieNames.Session` cookie via `universal-cookie` as `{ access_token: response.accessToken, refresh_token: response.refreshToken, token_type: 'Bearer' }`, with expiry computed from the access token's own `exp` claim via the existing `getTokenExpiration` util in `src/utils/auth.util.ts`, per `research.md` R5. No UI — not a `parity.md` item.
- [x] T006 Create `src/app/(public)/login-initial/_components/login-form.tsx` — renders `CardTitle` "初回ログイン" + `CardDescription` "招待されたメールアドレスでログインしてください" + the read-only, pre-filled email field, then a conditional slot: `authProvider === 'google' ? <GoogleLoginForm .../> : <CognitoLoginForm .../>` (both are placeholder imports until Phases 3-4 create them) — port from `.cache/fitness-crm-ui/src/pages/login-initial.tsx` (L40-46 header, L63-73 email field); satisfies PAR002, PAR003, PAR006. Depends on: T003.

**Checkpoint**: `/login-initial` loads, verifies the token, and shows the correct header/email chrome for a valid token. User story implementation can now begin.

---

## Phase 3: User Story 1 - First-time login with a temporary password (Priority: P1) 🎯 MVP

**Goal**: A `cognito`-provider invitee can log in with their temporary password, is forced to set a new password meeting all strength requirements, and lands on the completion screen with a persisted session.

**Independent Test**: Open a valid Cognito-provider invitation link, submit the temporary password, set a new password, and confirm the flow ends on `/login-initial/success` with the session cookie set — all without any Google-related code or the expired-state component existing yet.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `src/app/(public)/login-initial/_hooks/use-cognito-temp-password.ts` exposing `initiateAuth({ email, password })` and `respondToNewPassword({ username, session, newPassword })`, calling Amazon Cognito's public JSON API (`InitiateAuth` / `RespondToAuthChallenge`) directly via `fetch` exactly as specified in `contracts/auth-crm.md`'s "Amazon Cognito" section and `research.md` R3. Surface `NotAuthorizedException` and `InvalidPasswordException` as typed, retryable errors. No UI — not a `parity.md` item.
- [x] T008 [US1] Create `src/app/(public)/login-initial/_components/cognito-login-form.tsx` — temporary-password input with Eye/EyeOff visibility toggle and a "ログイン" submit button that calls `use-cognito-temp-password`'s `initiateAuth`; on a `NEW_PASSWORD_REQUIRED` response, calls an `onChallenge({ username, session })` prop; on `NotAuthorizedException`, shows an inline error and stays on this form — port from `.cache/fitness-crm-ui/src/pages/login-initial.tsx` (L74-106); satisfies PAR007, PAR008, PAR009, PAR010. Depends on: T006, T007.
- [x] T009 [US1] Wire `src/app/(public)/login-initial/page.tsx`'s `'set-new-password'` state: on `<CognitoLoginForm>`'s `onChallenge`, store `{ username, session, inviteToken: token }` (the `CognitoChallengeState` from `data-model.md`) and switch to `'set-new-password'`, rendering `<FirstTimePasswordSetForm>` (T010). Depends on: T003, T008.
- [x] T010 [P] [US1] Create `src/app/(public)/login-initial/_components/first-time-password-set-form.tsx` — new-password input with visibility toggle, the 4-item live requirement checklist (8+ chars, upper+lower, number, symbol), the 4-segment strength bar with the destructive→warning→info→success color progression, and a confirm-password field with mismatch messaging, per FR-005/FR-006 — port from `.cache/fitness-crm-ui/src/pages/first-time-password-set.tsx` (L10-29 logic, L47-148 markup); satisfies PAR023-PAR034. Depends on: T006.
  - **Post-implementation refactor**: this form's fields/checklist/strength-bar/submit-button markup was extracted into the shared `src/components/common/auth/password-set-form.tsx` (schema in `src/schemas/password-set-form.schema.ts`) so a future AUTH-03 password-set screen can reuse it with a different title/description/submit handler; `first-time-password-set-form.tsx` now only supplies this flow's copy and the Cognito challenge/login submit logic, wrapping `<PasswordSetForm>`.
- [x] T011 [US1] Wire `first-time-password-set-form.tsx`'s submit button ("パスワードを設定する", disabled until all requirements + matching confirmation are met): call `use-cognito-temp-password`'s `respondToNewPassword`, then on success call `crmAuthControllerLoginMutation({ idToken: result.idToken, inviteToken })`, then `persistStaffSession` (T005), then `router.push('/login-initial/success')` — port from `.cache/fitness-crm-ui/src/pages/first-time-password-set.tsx` (L41-45, L149-156); satisfies PAR035, PAR036. Depends on: T007, T009, T010, T005, T004.
- [x] T012 [US1] Add `crm/login` error-branch handling to `cognito-login-form.tsx` and `first-time-password-set-form.tsx` per `contracts/auth-crm.md`: a 401 shows the same inline retry error as PAR010 (FR-009); a 403 shows an account-status "contact your administrator" message distinct from the retry error (FR-010); a 404/410 (invite consumed concurrently) switches `page.tsx` back to the `'expired'` view state (FR-008) — this reuses the `ExpiredState` component built in Phase 5 (T016), so complete this task after T016 lands. Depends on: T011, T016.

**Checkpoint**: User Story 1 is fully functional and independently testable end-to-end.

---

## Phase 4: User Story 2 - First-time login with a Google account (Priority: P2)

**Goal**: A `google`-provider invitee signs in with one click and lands directly on the completion screen with a persisted session, with no password step.

**Independent Test**: Open a valid Google-provider invitation link, complete Google sign-in, and confirm direct navigation to `/login-initial/success` — independent of anything built in Phase 3 (US1's Cognito/password code is never exercised).

### Implementation for User Story 2

- [x] T013 [P] [US2] Create `src/app/(public)/login-initial/_hooks/use-google-sign-in.ts` — loads the Google Identity Services script (`https://accounts.google.com/gsi/client`) once, calls `google.accounts.id.initialize({ client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, callback })`, and exposes a `renderButton(container)` function, per `research.md` R2. No UI of its own — not a `parity.md` item.
- [x] T014 [US2] Create `src/app/(public)/login-initial/_components/google-login-form.tsx` — renders the GIS button via `use-google-sign-in`; on receiving `credential`, calls `crmAuthControllerLoginMutation({ idToken: credential, inviteToken })`, then `persistStaffSession` (T005), then `router.push('/login-initial/success')`; on a 401/403 error, show the same FR-009/FR-010 messages as T012 — port from `.cache/fitness-crm-ui/src/pages/login-initial.tsx` (L48-57); satisfies PAR004, PAR011. Depends on: T006, T013, T005, T004.
- [x] T015 [US2] Wire `login-form.tsx`'s conditional slot (built as a placeholder in T006) to actually import and render `<GoogleLoginForm>` when `authProvider === 'google'`. Depends on: T006, T014.

**Checkpoint**: User Stories 1 and 2 both work independently; a single invited staff account only ever exercises one of the two branches.

---

## Phase 5: User Story 3 - Expired or invalid invitation link (Priority: P2)

**Goal**: Any staff member opening an invalid, expired, revoked, or already-used invitation link sees a clear, non-actionable message instead of a login form.

**Independent Test**: Open `/login-initial` with a missing/garbage/expired `token` query param and confirm the expired-state message renders with no form and no retry action — independent of Phases 3-4.

### Implementation for User Story 3

- [x] T016 [P] [US3] Create `src/app/(public)/login-initial/_components/expired-state.tsx` — destructive-colored `AlertCircle` icon in a circular badge, "招待リンクの有効期限が切れています" title, "本部管理者に再度招待をご依頼ください" description, no buttons — port from `.cache/fitness-crm-ui/src/pages/login-initial-expired.tsx` (L7-26); satisfies PAR012-PAR017. Depends on: T002.
- [x] T017 [US3] Wire `src/app/(public)/login-initial/page.tsx` to render `<ExpiredState>` (T016) whenever the view state is `'expired'` (missing token, or `invite/verify` returning 400/404/410). Depends on: T003, T016.

**Checkpoint**: All three user stories are independently functional. (Note: T012 in Phase 3 also depends on T016 landing, since it reuses `<ExpiredState>` for the invite-consumed-mid-flow edge case — see `spec.md` Edge Cases.)

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 [P] Run every checklist item in `quickstart.md` manually against a real backend + Cognito User Pool + Google OAuth client; fix any deviation found.
- [x] T019 [P] Run `npm run type-check` and `npm run lint`; resolve all errors (per the constitution's No Testing Policy, these two commands plus manual quickstart verification are the entire QA gate).
- [x] T020 Tick every item in `checklists/parity.md` (PAR001-PAR036, excluding the documented PAR005 N/A) after confirming each renders correctly in the built screens; confirm none were missed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup (T002) — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational (T003, T005, T006). Its last task (T012) additionally depends on User Story 3's T016.
- **User Story 2 (Phase 4)**: Depends on Foundational (T003, T004, T005, T006) only — no dependency on Phase 3.
- **User Story 3 (Phase 5)**: Depends on Foundational (T002, T003) only — no dependency on Phase 3 or 4.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### User Story Dependencies

- US1 and US2 both depend only on the Foundational phase and are otherwise mutually independent (different auth-provider branches of the same account, never exercised together for one invite).
- US3 depends only on the Foundational phase.
- The one cross-story edge: US1's T012 (invite-consumed-mid-flow handling) reaches into US3's `<ExpiredState>` component. Build order should therefore be Foundational → US3 (or at least T016) → US1 → US2, even though US1 is the higher-priority story — T007-T011 of US1 can still be built and demoed before T012/T016 land; only the final edge-case wiring in T012 needs to wait.

### Parallel Opportunities

- T001 and T002 (Setup) run in parallel.
- T004 and T005 (Foundational) run in parallel with each other and with T003 once T002 is done.
- T007 (US1 Cognito hook) and T010 (US1 new-password form) run in parallel.
- T013 (US2 Google hook) can run in parallel with all of Phase 3 (US1) once Foundational is done.
- T016 (US3 expired component) can run in parallel with all of Phase 3/4 once Foundational is done.
- T018 and T019 (Polish) run in parallel.

---

## Parallel Example: after Foundational completes

```bash
# US1, US2, and US3's independent leaf pieces can start together:
Task: "Create use-cognito-temp-password.ts hook (T007)"
Task: "Create use-google-sign-in.ts hook (T013)"
Task: "Create expired-state.tsx (T016)"
Task: "Create first-time-password-set-form.tsx (T010)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 5's T016 only (just the `<ExpiredState>` component, not its wiring) so Phase 3's T012 has something to reuse — or ship US1 first with a temporary generic error message in T012 and upgrade it once Phase 5 lands.
3. Complete Phase 3 (User Story 1).
4. **STOP and VALIDATE** against `quickstart.md`'s User Story 1 section.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate independently → demo (MVP).
3. Add User Story 3 → validate independently → demo (also finishes US1's T012 edge case).
4. Add User Story 2 → validate independently → demo.
5. Polish (T018-T020).
