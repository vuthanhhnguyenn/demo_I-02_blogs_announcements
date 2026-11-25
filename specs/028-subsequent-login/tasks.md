---
description: 'Task list for Subsequent Login (AUTH-01 認証・ログイン)'
---

# Tasks: Subsequent Login (AUTH-01 認証・ログイン)

**Input**: Design documents from `/specs/028-subsequent-login/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-crm.md, checklists/parity.md

**Organization**: Tasks are grouped by user story (US1 Google sign-in, US2 email/password sign-in, US3 session expiry & sign-out, US4 magic-link sign-in — added 2026-08-25) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- UI tasks cite their V0 source range and the `PAR###` parity items they satisfy (`checklists/parity.md`)

## Path Conventions

Single project — `src/` at repository root (existing Next.js App Router app).

---

## Phase 1: Setup

**Purpose**: Small housekeeping that doesn't belong to any one story

- [x] T001 [P] Add `NEXT_PUBLIC_REAL_API_URL` to `.env.example` with a short comment (it is already read by `src/lib/client.real.config.ts` and required by `quickstart.md`'s prerequisites, but was never documented there)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Promote the four files `023-first-time-login` left route-local under `login-initial/` into shared locations (`research.md` R9), since this feature is their second consumer. **Both US1 and US2 need these to exist before `login-form.tsx` can be written.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Move `src/app/(public)/login-initial/_hooks/use-google-sign-in.ts` to `src/hooks/use-google-sign-in.ts` (identical content; delete the old file)
- [x] T003 [P] Move `src/app/(public)/login-initial/_hooks/use-cognito-temp-password.ts` to `src/hooks/use-cognito-auth.ts`, renaming the exported hook `useCognitoTempPassword` → `useCognitoAuth` (keep `initiateAuth`, `respondToNewPassword`, and the exported `CognitoAuthError` class unchanged; delete the old file)
- [x] T004 [P] Move `src/app/(public)/login-initial/_constants/login-error-codes.constants.ts` to `src/constants/auth-error-codes.constants.ts` (identical content; delete the old file)
- [x] T005 [P] Add `persistStaffSession(response: CrmLoginResponseDto)` to `src/utils/auth.util.ts`, moved from `src/app/(public)/login-initial/_lib/persist-session.ts` (identical logic; delete the old file)
- [x] T006 [P] Update `src/app/(public)/login-initial/_components/google-login-form.tsx`: import `useGoogleSignIn` from `@/hooks/use-google-sign-in`, `LOGIN_ERROR_CODES` from `@/constants/auth-error-codes.constants`, `persistStaffSession` from `@/utils/auth.util` (depends on T002, T004, T005)
- [x] T007 [P] Update `src/app/(public)/login-initial/_components/cognito-login-form.tsx`: import `useCognitoAuth` (was `useCognitoTempPassword`) and `CognitoAuthError` from `@/hooks/use-cognito-auth`, `LOGIN_ERROR_CODES` from `@/constants/auth-error-codes.constants`, `persistStaffSession` from `@/utils/auth.util`; update the call site from `useCognitoTempPassword()` to `useCognitoAuth()` (depends on T003, T004, T005)
- [x] T008 [P] Update `src/app/(public)/login-initial/_components/first-time-password-set-form.tsx`: import `useCognitoAuth` (was `useCognitoTempPassword`) from `@/hooks/use-cognito-auth`, `CognitoAuthError` from the same module, `LOGIN_ERROR_CODES` from `@/constants/auth-error-codes.constants`, `persistStaffSession` from `@/utils/auth.util`; update the call site accordingly (depends on T003, T004, T005)
- [x] T009 Remove the now-empty `src/app/(public)/login-initial/_hooks/`, `src/app/(public)/login-initial/_constants/`, and `src/app/(public)/login-initial/_lib/` directories (depends on T006, T007, T008)

**Checkpoint**: Foundation ready — `023-first-time-login` still works unchanged (imports only moved), and both user stories below can now be built.

---

## Phase 3: User Story 1 - Returning staff member signs in with Google (Priority: P1) 🎯 MVP

**Goal**: A staff member can sign in with a linked Google account and land on the dashboard (or their originally requested page); a rejected/unregistered identity or a generic failure shows the correct message.

**Independent Test**: Open `/login`, click "Googleでログイン", sign in with an active Google-linked staff account, confirm landing on the dashboard; visit a private page while signed out, confirm redirect back to it after signing in; sign in with a Google identity that has no matching staff record, confirm the "not registered" message.

### Implementation for User Story 1

- [x] T010 [US1] Create `src/app/(public)/login/_components/login-form.tsx`: card shell, header title, the full alert-state switch (`session-expired` / `account-status` / `credentials` / `locked` — all four JSX cases built now even though `locked` isn't reachable until US2), Google button + divider, and the two (inert) footer links — port from `.cache/fitness-crm-ui/src/pages/login.tsx` › `Login` (L63-L120, L166-L181); satisfies PAR001, PAR002, PAR003, PAR004, PAR005, PAR006, PAR007, PAR008, PAR013, PAR014
- [x] T011 [US1] Wire Google sign-in into `login-form.tsx`: `useGoogleSignIn` callback → `crmAuthControllerLoginMutation({ body: { idToken } })` (no `inviteToken`) → on success, `persistStaffSession(data)` then navigate to `safeRedirect(redirectParam)`; on 403 (`E-AUTH-033`/`E-AUTH-034`) set alert state to `account-status`; on 401 or a response missing the expected tokens, set alert state to `credentials` (FR-011) (depends on T010, T002, T005)
- [x] T012 [US1] Rewrite `src/app/(public)/login/page.tsx`: `Suspense`-wrapped client component reading the `redirect` and `variant` search params via `useSearchParams()`, passing them into `LoginForm`; remove the old mock `postAuthLoginMutation` usage entirely (depends on T010)

**Checkpoint**: User Story 1 is fully functional and testable independently — Google-only sign-in works end-to-end.

---

## Phase 4: User Story 2 - Returning staff member signs in with email and password (Priority: P1)

**Goal**: A staff member can sign in with email/password and land on the dashboard; wrong credentials, a locked account, and a deactivated account each show the correct, distinct message.

**Independent Test**: Enter valid email/password credentials, confirm landing on the dashboard; enter wrong credentials, confirm the generic retry message; trigger a lockout, confirm the distinct locked message and that the form stops accepting submissions; attempt sign-in against a deactivated account, confirm the same "not registered/active" message Story 1 uses.

### Implementation for User Story 2

- [x] T013 [US2] Add the email/password sub-form to `login-form.tsx`: email field, password field with show/hide toggle, submit button — port from `.cache/fitness-crm-ui/src/pages/login.tsx` › `Login` (L121-L164); satisfies PAR009, PAR010, PAR011, PAR012 (depends on T010)
- [x] T014 [US2] Wire Cognito sign-in into `login-form.tsx`: on submit, `useCognitoAuth().initiateAuth({ email, password })`; on `AuthenticationResult.IdToken`, call `crmAuthControllerLoginMutation({ body: { idToken } })` (same success/403/401 handling T011 already wired); on `NEW_PASSWORD_REQUIRED`, set alert state to `credentials` per `research.md` R4 (no second password-set UI on this screen); on a `CognitoAuthError` whose message matches the lockout phrase (`research.md` R5), set alert state to `locked`, otherwise `credentials` (depends on T013, T011, T003)
- [x] T015 [US2] Wire the existing `src/app/(public)/login/_schema/login.schema.ts` into the email/password sub-form via `react-hook-form` + `zodResolver` so empty/malformed fields are blocked client-side before any network request (FR-010) (depends on T013)

**Checkpoint**: User Stories 1 AND 2 both work independently — either sign-in path fully delivers a staff member into the app.

---

## Phase 5: User Story 3 - Session expiration and sign-out (Priority: P2)

**Goal**: Explicit "ログアウト" invalidates the session on the server; a session that can no longer be renewed redirects to `/login?variant=session-expired`, which already renders the banner built in US1 (T010).

**Independent Test**: Sign out from the header menu, confirm the previously issued access token no longer works against a private API call; force an access-token expiry, confirm redirect to `/login?variant=session-expired` showing the banner, and that signing in again from there works normally.

### Implementation for User Story 3

- [x] T016 [P] [US3] Add `refreshMockSession(refreshToken)` and `refreshRealSession(refreshToken)` to `src/utils/auth.util.ts`: each calls its respective backend's refresh endpoint (mock: `Auth.postAuthRefresh`; real: `AuthToken.tokenControllerRefresh`) and normalizes the differing response shapes (`accessToken`/`refresh_token` vs. `token`/`refreshToken`) into one `{ accessToken, refreshToken }` shape (`data-model.md` `RefreshResult`) — per `contracts/auth-crm.md`
- [x] T017 [US3] Modify `src/lib/services/ClientRequest.service.ts`: `ClientRequestServiceProps` gains a required `refresh: (refreshToken: string) => Promise<{ accessToken: string; refreshToken: string }>` function; `#handleRefreshToken` calls it instead of the hardcoded `Auth.postAuthRefresh`, computes cookie expiry from the new access token's `exp` claim via the existing `getTokenExpiration`, and on any failure calls `handleLogout({ sessionExpired: true })` (depends on T016)
- [x] T018 [US3] Modify `src/hooks/useClientRequest.ts`: accept a third `refresh` parameter and forward it into `new ClientRequestService({ client, syncRequestService, refresh })`; extend the `isAuthRequest` bypass check to also match `/api/v1/auth/refresh` and `/api/v1/auth/crm/logout` (depends on T017)
- [x] T019 [US3] Modify `src/providers/react-query.provider.tsx`: pass `refreshMockSession` into the `useClientRequest(mockClient, ...)` call and `refreshRealSession` into the `useClientRequest(realClient, ...)` call (depends on T016, T018)
- [x] T020 [P] [US3] Modify `src/utils/global.util.ts`: `handleLogout` accepts an optional `{ sessionExpired?: boolean }`; before removing the `CookieNames.Session` cookie, best-effort `await crmAuthControllerLogout()` (caught/ignored on failure — logout must never block on the network); after clearing the cookie, append `?variant=session-expired` to the `/login` redirect when `sessionExpired` is true

**Checkpoint**: All three user stories are independently functional — sign-in (Google or email/password), sign-out, and session-expiry redirect all work against the real backend.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T021 [P] Run `specs/028-subsequent-login/quickstart.md` end-to-end and record sign-off — **partially done**: `tsc --noEmit`, `eslint`, and `prettier --check` all pass repo-wide; a dev-server smoke test confirmed `/login` renders correctly (all four alert states verified by temporarily forcing each and reverting), the `redirect`/`variant` query params work, and `proxy.ts`'s existing redirect-to-login behavior is unaffected. **Not verified**: any scenario requiring live Google/Cognito credentials or a running fitness-api backend (none available in this environment) — i.e. an actual Google/Cognito sign-in round-trip, a real 403/401 from `crm/login`, a real Cognito lockout, `crm/logout` actually invalidating a server session, or a real access-token refresh. Re-run `quickstart.md` against a real environment before sign-off.
- [x] T022 [P] Tick off PAR001–PAR014 in `specs/028-subsequent-login/checklists/parity.md` once each is confirmed rendered correctly in the built screen

---

## Phase 7: User Story 4 - Returning staff member signs in via a magic link (Priority: P3, added 2026-08-25)

**Goal**: A staff member can request a one-time sign-in link by email from `/magic-link-login`, and opening a valid link (`/magic-link?token=…`) signs them in with the same role/scope as any other path; an expired/used/invalid link and a deactivated-account link each surface the correct, distinct outcome on `/login`. (Route names finalized post-implementation to match the backend's actual mailed link — `research.md` R11.)

**Independent Test**: From `/login`, follow "マジックリンクでログイン", submit an active staff email, confirm the identical acknowledgement for both a real and a non-existent staff address (FR-014/SC-008), open the received link and land signed-in on the dashboard, then confirm re-opening the same (or an expired/superseded) link produces one indistinguishable invalid-link banner while a deactivated-account link produces the existing account-status banner instead.

### Implementation for User Story 4

- [x] T023 [P] [US4] Create `src/app/(public)/(auth)/magic-link-login/_schema/magic-link-form.schema.ts`: Zod schema — `email` required, max `TEXT_MAX_LENGTH`, email format (message "正しいメールアドレスを入力してください") — near-copy of `password-reset/_schema/password-reset-form.schema.ts` (FR-013)
- [x] T024 [P] [US4] Create `src/hooks/use-resend-cooldown.ts`: extract the inline `RESEND_COOLDOWN_SECONDS`/`cooldown` `useState` + `useEffect` countdown currently duplicated in `src/app/(public)/(auth)/password-reset/_components/password-reset-form.tsx` (lines defining `cooldown`/the `setTimeout` effect) into a shared hook returning `{ secondsLeft, start(), isCoolingDown }` (`research.md` R9-style promotion on this becoming a second consumer)
- [x] T025 [US4] Create `src/app/(public)/(auth)/magic-link-login/_components/magic-link-request-form.tsx`: Card shell with title "マジックリンクでログイン" + description, `'form'`/`'sent'` phase state (`data-model.md` `MagicLinkRequestPhase`), email field + validation message, "ログインリンクを送信" button, 経路② guidance copy, sent-state success icon + echoed address + 15分/1回 note + resend button wired to `use-resend-cooldown`, "ログインに戻る" footer link; on submit calls `crmAuthControllerCrmMagicLinkIssueMutation({ body: { email } })` and moves to `'sent'` on any 2xx (never branching on `accepted` — `research.md` R13), showing the generic retry-able error (FR-021) only on a non-2xx/transport failure — port from `.cache/fitness-crm-ui/src/pages/magic-link-login.tsx` › `MagicLinkLogin` (L10-L114); satisfies PAR016, PAR017, PAR018, PAR019, PAR020, PAR021, PAR022, PAR023, PAR024, PAR025, PAR026, PAR027, PAR028, PAR029 (depends on T023, T024)
- [x] T026 [US4] Create `src/app/(public)/(auth)/magic-link-login/page.tsx`: RSC shell `<AuthShell><MagicLinkRequestForm/></AuthShell>`, mirroring `password-reset/page.tsx` exactly (depends on T025)
- [x] T027 [P] [US4] Add `MAGIC_LINK_INVALID: 'E-AUTH-030'` to `src/constants/auth-error-codes.constants.ts` (one code covers invalid/expired/already-used/superseded by design — `contracts/auth-crm.md`)
- [x] T028 [US4] Modify `src/app/(public)/(auth)/login/_components/login-form.tsx`: widen the `SignInError` union with `'magic-link-invalid'`, add a new destructive `Alert` case styled like the existing `locked`/`account-status`/`credentials` cases with copy "ログインリンクが無効か、有効期限が切れています。お手数ですが、もう一度お試しください。" (`research.md` R14 — no V0 source, this banner has no mockup counterpart), and remove `disabled` from the footer's "マジックリンクでログイン" button, replacing it with a `Link`-rendered `Button` (`nativeButton={false}`, `render={<Link href={navigate('/magic-link-login')}>...}`, same pattern as the "パスワードをお忘れの方" button above it) — satisfies PAR015 (depends on T027)
- [x] T029 [US4] Modify `src/app/(public)/(auth)/login/page.tsx`: widen the `initialVariant` prop type and the `variant === 'session-expired' ? ... : undefined` mapping in `LoginContent` to also pass through `'magic-link-invalid'` (depends on T028)
- [x] T030 [US4] Create `src/app/(public)/(auth)/magic-link/_components/magic-link-verify.tsx`: `"use client"` component that reads `token` via `useSearchParams()`, guards the call with a synchronous `useRef` latch so at most one verify request ever fires per mount (`research.md` R15), shows a `Spinner` while pending, and on mount (if `token` is present and non-blank) calls `crmAuthControllerCrmMagicLinkVerifyMutation({ body: { token } })` — mirroring `login-form.tsx`'s `loginMutation` `onSuccess`/`onError` shape (same file's T011): on success with both tokens present, `persistStaffSession(data)` then `navigate('/')` (FR-018, no `redirect` target honoured — `data-model.md`); in `onError`, match `error.code` (`ErrorResponseDto`) against `LOGIN_ERROR_CODES.STAFF_DEACTIVATED` (`E-AUTH-034`) → `navigate('/login?variant=account-status')` (FR-020), else (including `MAGIC_LINK_INVALID`/`E-AUTH-030`, any other code, and a missing/blank `token` that skips the call entirely) → `navigate('/login?variant=magic-link-invalid')` (FR-019) — no V0 source (mockup has no link-opening screen — `research.md` R14) (depends on T027, T029, T005)
- [x] T031 [US4] Create `src/app/(public)/(auth)/magic-link/page.tsx`: `Suspense`-wrapped RSC shell `<AuthShell><Suspense fallback={...}><MagicLinkVerify/></Suspense></AuthShell>`, matching the `Suspense` pattern already used in `login/page.tsx` for its own search-param-reading child (depends on T030)
- [x] T032 [P] [US4] Modify `src/app/(public)/(auth)/password-reset/_components/password-reset-form.tsx`: replace its inline `cooldown` `useState`/`useEffect` with `useResendCooldown` from `@/hooks/use-resend-cooldown` — no behavior change, this is the extraction's second call site (depends on T024)

**Checkpoint**: User Story 4 is fully functional and independently testable — magic-link request, non-disclosure, successful sign-in, and both link-failure paths all work end-to-end; `/login` and `/password-reset` remain unaffected in behavior.

---

## Phase 8: Polish — Magic Link (added 2026-08-25)

- [ ] T033 [P] Run `specs/028-subsequent-login/quickstart.md`'s "User Story 4 — Magic-link sign-in" section end-to-end (including the non-disclosure comparison in step 5, the StrictMode double-verify check in step 14, and the `/password-reset` regression check in step 15) and record sign-off — **prerequisite confirmed**: a live backend send showed the mailed link is `<crm-origin>/magic-link?token=…`; routes were renamed to match (request screen → `/magic-link-login`, consume screen → `/magic-link`, `research.md` R11) — **partially done**: `tsc --noEmit`, `eslint`, and `prettier --check` all pass repo-wide; a dev-server smoke test (Playwright against the running real backend on `NEXT_PUBLIC_REAL_API_URL`) confirmed step 1 (footer link enabled, navigates to `/magic-link-login`), step 2 (empty/malformed email blocked client-side, no request), step 3 (sent state renders with echoed address), step 4 (60s resend cooldown counts down and re-enables), and equivalents of step 4/edge-case 4 for `/magic-link` — an absent token and a garbage token both landed on `/login?variant=magic-link-invalid` with the spinner shown first and zero console errors, confirmed again after the route rename. **Not verified**: step 5's non-disclosure comparison, step 6/7's real-mailed-link sign-in and scope comparison, steps 8–10's single-use/supersede/expiry behavior, step 13's already-signed-in redirect, and step 15's `/password-reset` regression — all require either a real staff mailbox or a signed-in session, neither available in this environment. Re-run `quickstart.md`'s full User Story 4 section against a real environment before sign-off.
- [x] T034 [P] Tick off PAR015–PAR029 in `specs/028-subsequent-login/checklists/parity.md` once each is confirmed rendered correctly in the built screens

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: No dependency on Setup; BLOCKS both US1 and US2 (T010 needs T002/T005; T014 needs T003).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2 or US3.
- **User Story 2 (Phase 4)**: Depends on Foundational **and** on US1's T010/T011 (extends the same `login-form.tsx` file and reuses its alert-state plumbing) — not independent of US1 at the file level, though it is independently _testable_ once both phases land.
- **User Story 3 (Phase 5)**: Depends on Foundational only, not on US1/US2's UI work — it touches app-wide interceptor plumbing (`ClientRequestService.ts`, `useClientRequest.ts`, `react-query.provider.tsx`, `global.util.ts`), none of which US1/US2 touch. Can be built in parallel with US1/US2 by a different developer; the `session-expired` banner it makes reachable was already built by T010.
- **Polish (Phase 6)**: Depends on all three user stories being complete.
- **User Story 4 (Phase 7, added 2026-08-25)**: Depends on Foundational (needs `persistStaffSession` from T005). Independent of US1/US2/US3 at the _feature_ level (a wholly new request+verify flow), but T028/T029 touch the same `login-form.tsx`/`page.tsx` files US1/US2 created — sequence Phase 7 after Phase 4 to avoid a merge conflict on those two files, even though nothing in Phase 7 depends on US2's _logic_.
- **Polish — Magic Link (Phase 8)**: Depends on Phase 7 being complete.

### Parallel Opportunities

- T002, T003, T004, T005 (Foundational moves) — different files, run together.
- T006, T007, T008 (Foundational import updates) — different files, run together once T002–T005 land.
- T016 and T020 (US3) — different files, no shared dependency, run together.
- US3's entire phase (T016–T020) can proceed in parallel with US1+US2's phases once Foundational is done, since they touch entirely disjoint files.
- T021 and T022 (Polish) — different files, run together.
- T023, T024, T027 (US4 setup: schema, cooldown hook, constant) — different files, run together.
- T032 (password-reset refactor) can run in parallel with T025–T031 once T024 lands — different files, no shared dependency.
- T033 and T034 (Polish — Magic Link) — different files, run together.

---

## Parallel Example: Foundational Phase

```bash
Task: "Move use-google-sign-in.ts to src/hooks/use-google-sign-in.ts"
Task: "Move use-cognito-temp-password.ts to src/hooks/use-cognito-auth.ts (renamed hook)"
Task: "Move login-error-codes.constants.ts to src/constants/auth-error-codes.constants.ts"
Task: "Add persistStaffSession to src/utils/auth.util.ts"
```

## Parallel Example: User Story 4

```bash
Task: "Create magic-link-form.schema.ts"
Task: "Create use-resend-cooldown.ts hook"
Task: "Add MAGIC_LINK_INVALID to auth-error-codes.constants.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add refreshMockSession/refreshRealSession to src/utils/auth.util.ts"
Task: "Update handleLogout in src/utils/global.util.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks both P1 stories)
3. Complete Phase 3: User Story 1 (Google sign-in)
4. **STOP and VALIDATE**: Google-linked staff can sign in end-to-end; email/password staff still can't (expected — that's US2)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate → deploy (MVP: Google-only login works)
3. Add User Story 2 → validate → deploy (both sign-in paths work)
4. Add User Story 3 → validate → deploy (logout and session-expiry now correct against the real backend)
5. Polish → run `quickstart.md`, tick off `parity.md`
6. Add User Story 4 (magic-link sign-in, 2026-08-25) → validate → deploy (self-service sign-in without a password now works)
7. Polish — Magic Link → run `quickstart.md`'s new section, tick off `parity.md`'s new items

### Parallel Team Strategy

Once Foundational is done: one developer takes US1 → US2 (they share `login-form.tsx`, so sequencing beats parallelizing across people here); a second developer takes US3 independently (disjoint files, no coordination needed until both land in `dev`). User Story 4 can be picked up by either developer once US2 has landed (it shares `login-form.tsx`/`page.tsx` with US1/US2 for T028/T029 only) or by a third developer, coordinating just on those two files.

---

## Notes

- `login-form.tsx` is intentionally shared between US1 and US2 (per `spec.md` FR-002, the mockup shows the Google button and the email/password form together, always) — US2's tasks additively extend the file US1 creates rather than each story owning a separate file.
- Every `PAR###` item in `checklists/parity.md` is claimed above: PAR001–PAR008, PAR013–PAR014 by T010; PAR009–PAR012 by T013; PAR015 by T028; PAR016–PAR029 by T025. PAR014's underlying wiring (footer link now navigable) is also delivered by T028, though PAR014 itself was already ticked as a visual-only item.
- No test tasks are included per the constitution's No Testing Policy — `quickstart.md` (T021, and its new User Story 4 section via T033) is the QA gate.
- **User Story 4 addendum (2026-08-25)**: `magic-link-verify.tsx` (T030) and its new `magic-link-invalid` banner (T028) have no `PAR###` citation by design — the V0 mockup (`magic-link-login.tsx`) has no screen for opening a received link, so there is nothing in `parity.md` to claim there (`research.md` R14, and the note under `checklists/parity.md`'s magic-link section).
- T025's mutation call must not branch on the issue endpoint's `accepted` field (`research.md` R13) — this is a correctness constraint on the implementation, not just a UI detail, since branching on it would leak account existence.
