---
description: 'Task list for Forgot Password (Password Reset)'
---

# Tasks: Forgot Password (Password Reset)

**Input**: Design documents from `/specs/029-password-reset/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cognito-forgot-password.md, checklists/parity.md

**Organization**: Tasks are grouped by user story (US1 request a reset link, US2 set a new password from the link, US3 Google-SSO guidance) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- UI tasks cite their V0 source range and the `PAR###` parity items they satisfy (`checklists/parity.md`)

## Path Conventions

Single project — `src/` at repository root (existing Next.js App Router app).

---

## Phase 1: Setup

No tasks. All required environment variables (`NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_REGION`, `NEXT_PUBLIC_COGNITO_ENDPOINT`) are already documented in `.env.example` and already consumed by `src/hooks/use-cognito-auth.ts`; no new dependency, config, or project scaffolding is needed (`plan.md` Technical Context).

---

## Phase 2: Foundational (Blocking Prerequisites)

No cross-story blocking prerequisites. US1 and US2 build entirely disjoint routes and components; the only file they both touch (`src/hooks/use-cognito-auth.ts`) receives one independent, additive function per story (T001, T006 below) — sequenced to avoid a same-file conflict, not because either story depends on the other's function.

**Checkpoint**: Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Staff member requests a password reset link (Priority: P1) 🎯 MVP

**Goal**: A staff member can go from the login page to submitting their email on `/password-reset` and seeing a "メールを送信しました" confirmation, with a 60-second resend cooldown — identical messaging whether or not the email matches a real account.

**Independent Test**: From `/login`, click "パスワードをお忘れの方", submit a registered email, confirm the sent-confirmation state; submit a non-existent or malformed email, confirm the same confirmation (or a client-side format error) per spec.md Story 1.

### Implementation for User Story 1

- [x] T001 [P] [US1] Add `forgotPassword({ email }: { email: string })` to `src/hooks/use-cognito-auth.ts`: calls `callCognito('ForgotPassword', { ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID, Username: email })`, returning the `CodeDeliveryDetails` response typed alongside the file's existing Cognito response interfaces (per `contracts/cognito-forgot-password.md`)
- [x] T002 [P] [US1] Create `src/app/(public)/(auth)/password-reset/_components/password-reset-form.tsx`: Card shell with the request-form state (email field validated via `react-hook-form` + Zod email format, inline "正しいメールアドレスを入力してください" error, submit button, persistent Google-SSO guidance note) and the sent-confirmation state (success icon, "{email} 宛にリセットリンクを送信しました" copy, "メールを再送信" button with a 60-second cooldown countdown) and the shared "ログインに戻る" footer link — port from `.cache/fitness-crm-ui/src/pages/password-reset.tsx` › `PasswordReset` (L38-L108); satisfies PAR001, PAR002, PAR003, PAR004, PAR005, PAR006, PAR007, PAR008, PAR009, PAR010
- [x] T003 [US1] Wire `password-reset-form.tsx`'s submit handler to call `forgotPassword({ email })`: on success **or** a `UserNotFoundException`-shaped rejection, set `phase = 'sent'` and start the 60s cooldown (`research.md` R3, non-disclosure); on any other rejection (`LimitExceededException`, `InvalidParameterException`, network failure), set `sendError = 'unexpected'` and remain on the form (`contracts/cognito-forgot-password.md`) (depends on T001, T002)
- [x] T004 [US1] Create `src/app/(public)/(auth)/password-reset/page.tsx`: renders `PasswordResetForm` inside the shared `AuthShell` (depends on T002)
- [x] T005 [US1] Wire `src/app/(public)/(auth)/login/_components/login-form.tsx`'s existing "パスワードをお忘れの方" button: add `onClick={() => router.push(navigate('/password-reset'))}`, remove the stale "Out of scope per spec.md Assumptions" comment left by `028-subsequent-login` (`research.md` R6) — independent file, can run in parallel with T001-T004

**Checkpoint**: User Story 1 is fully functional and testable independently — the request/sent flow works end-to-end from `/login`.

---

## Phase 4: User Story 2 - Staff member sets a new password from the reset link (Priority: P1)

**Goal**: Opening a valid, unused reset link at `/password-set` shows a new-password form (live policy checklist + strength bar); a valid, matching submission sets the password and shows a success screen; a missing, expired, or already-used link shows an "invalid or expired" state instead.

**Independent Test**: Open `/password-set?email=...&code=...` with a valid code, set a policy-satisfying password, confirm the success screen and that sign-in works with the new password; reopen the same link a second time, confirm the "invalid or expired" state; open `/password-set` with no query params, confirm the same expired state.

### Implementation for User Story 2

- [x] T006 [US2] Add `confirmForgotPassword({ email, code, newPassword }: { email: string; code: string; newPassword: string })` to `src/hooks/use-cognito-auth.ts`: calls `callCognito('ConfirmForgotPassword', { ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID, Username: email, ConfirmationCode: code, Password: newPassword })` (per `contracts/cognito-forgot-password.md`) — same file as T001; sequence after it to avoid a same-file conflict
- [x] T007 [P] [US2] Create `src/app/(public)/(auth)/password-set/_components/password-reset-expired-state.tsx`: destructive icon badge, "リンクが無効または期限切れです" title + description, "パスワードリセットをやり直す" button navigating to `/password-reset` — port from `.cache/fitness-crm-ui/src/pages/password-set.tsx` › `PasswordSet` expired branch (L54-L79); satisfies PAR019, PAR020, PAR021
- [x] T008 [P] [US2] Create `src/app/(public)/(auth)/password-set/_components/password-reset-confirm-form.tsx`: wraps the shared `PasswordSetForm` (`src/components/common/auth/password-set-form.tsx`, reused as-is per `research.md` R5) with this screen's title/description/submit label, plus the success/"done" state (success icon badge, "パスワードを設定しました" copy, "ログイン画面へ" button navigating to `/login`) — port from `.cache/fitness-crm-ui/src/pages/password-set.tsx` › `PasswordSet` default + done branches (L82-L106, L109-L220); satisfies PAR011, PAR012, PAR013, PAR014, PAR015, PAR016, PAR017, PAR018, PAR022, PAR023, PAR024
- [x] T009 [US2] Wire `password-reset-confirm-form.tsx`'s `onSubmit` to call `confirmForgotPassword({ email, code, newPassword: data.newPassword })`: on success, set `phase = 'done'`; on `ExpiredCodeException` / `CodeMismatchException` / `LimitExceededException` / `UserNotFoundException`, render `PasswordResetExpiredState` instead; on `InvalidPasswordException`, show an inline "パスワードの設定に失敗しました。もう一度お試しください。" banner and remain on the form (mirrors `FirstTimePasswordSetForm`'s existing retry-banner pattern) (`contracts/cognito-forgot-password.md`) (depends on T006, T007, T008)
- [x] T010 [US2] Create `src/app/(public)/(auth)/password-set/page.tsx`: `Suspense`-wrapped, reads `email`/`code` from `useSearchParams()`; if either is missing or empty, renders `PasswordResetExpiredState` immediately with **no** Cognito call (`data-model.md` `ResetLinkParams`); otherwise renders `PasswordResetConfirmForm` (depends on T007, T008)

**Checkpoint**: User Stories 1 AND 2 both work independently — the full request → email link → set password → success journey is usable end-to-end.

---

## Phase 5: User Story 3 - Google SSO staff member is redirected to the right password-change path (Priority: P3)

**Goal**: A Google-SSO staff member who lands on `/password-reset` sees the same generic "メールを送信しました" confirmation as anyone else, alongside a persistent note directing them to google.com instead.

**Independent Test**: Open `/password-reset` and confirm the Google-SSO guidance note is visible before typing anything; submit a Google-linked staff account's email and confirm the identical confirmation state Story 1 produces for any other address.

### Implementation for User Story 3

- [x] T011 [US3] Verify Story 3's acceptance scenarios against T002's already-rendered Google-SSO guidance note (PAR006) and T003's already-uniform non-disclosure handling — no new code is expected, since both are inherent side effects of how US1 was built (`research.md` R3); if the note's text, placement, or always-visible behavior deviates from `password-reset.tsx` L70-L74, fix `password-reset-form.tsx` accordingly (depends on T002, T003)

**Checkpoint**: All three user stories are independently functional — request, set-password, and the Google-SSO guidance note all work as specified.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T012 [P] Run `specs/029-password-reset/quickstart.md` end-to-end and record sign-off
- [x] T013 [P] Tick off PAR001-PAR024 in `specs/029-password-reset/checklists/parity.md` once each is confirmed rendered correctly in the built screens
- [x] T014 [P] Confirm `tsc --noEmit`, `eslint`, and `prettier --check` all pass repo-wide (per the constitution's No Testing Policy QA gate)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks.
- **Foundational (Phase 2)**: No tasks; nothing blocks US1 or US2.
- **User Story 1 (Phase 3)**: No dependency on US2 or US3.
- **User Story 2 (Phase 4)**: No functional dependency on US1 — different routes, different components. Only shares a file with US1 at T001/T006 (`use-cognito-auth.ts`), sequenced rather than parallel there.
- **User Story 3 (Phase 5)**: Fully dependent on US1's output (T002, T003) — it has no route or component of its own; it is a verification pass over behavior US1 already delivers.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Parallel Opportunities

- T001 (US1) and T002 (US1) — different files, run together.
- T005 (US1) — different file from T001-T004, can run in parallel with any of them.
- T007 and T008 (US2) — different files, run together.
- T012, T013, T014 (Polish) — different files/concerns, run together.

---

## Parallel Example: User Story 1

```bash
Task: "Add forgotPassword to src/hooks/use-cognito-auth.ts"
Task: "Create password-reset-form.tsx (request + sent states)"
Task: "Wire login-form.tsx's forgot-password link to /password-reset"
```

## Parallel Example: User Story 2

```bash
Task: "Create password-reset-expired-state.tsx"
Task: "Create password-reset-confirm-form.tsx (wraps shared PasswordSetForm)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1
2. **STOP and VALIDATE**: A staff member can request a reset link and see the sent confirmation end-to-end
3. Note: without US2, the emailed link has nowhere real to land yet — pair US1+US2 for the first deployable increment in practice

### Incremental Delivery

1. Add User Story 1 → validate the request/sent flow
2. Add User Story 2 → validate the full request → set-password → success journey (this is the first genuinely end-to-end deployable increment)
3. Add User Story 3 → validate the Google-SSO note/non-disclosure behavior (likely a no-op check, per T011)
4. Polish → run `quickstart.md`, tick off `parity.md`

### Parallel Team Strategy

One developer takes US1 (T001-T005), a second takes US2 (T006-T010) — genuinely disjoint files apart from the shared `use-cognito-auth.ts` (coordinate T001/T006 landing order); US3 (T011) is a short verification pass best done last, by either developer, once US1 has landed.

---

## Notes

- Every `PAR###` item in `checklists/parity.md` is claimed above: PAR001-PAR010 by T002; PAR011-PAR018 and PAR022-PAR024 by T008; PAR019-PAR021 by T007.
- No test tasks are included per the constitution's No Testing Policy — `quickstart.md` (T012) is the QA gate.
- US3 intentionally has almost no implementation of its own (T011 is verification-only) — its one requirement (the Google-SSO guidance note, FR-010) and its one behavior (non-disclosure at submission time) are both already delivered as part of how US1 was built, per `research.md` R3.
- **PAR014/PAR015 left unchecked** (T013): the shared `PasswordSetForm` renders a 4-row policy checklist/strength bar (adds "記号を含む"), not V0's 3 — an intentional divergence per `research.md` R5 (matches Cognito's real password policy). See `checklists/parity.md`'s "Known divergence" note.
