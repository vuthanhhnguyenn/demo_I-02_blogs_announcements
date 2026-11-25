# Quickstart: Manual Verification — Subsequent Login (AUTH-01)

Per the project's No Testing Policy, this checklist is the QA gate for this feature — no automated tests exist or should be added.

## Prerequisites

- `NEXT_PUBLIC_REAL_API_URL` pointing at a running fitness-api instance.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_REGION` already configured (same values `023-first-time-login` uses).
- At least one staff account that has already completed first-time login for each provider: one Google-linked, one email/password (Cognito) — both **active**.
- A second email/password staff account your test environment can deactivate on demand (for the account-status scenario).
- Access to trigger a Cognito lockout (repeated wrong-password attempts against a disposable test account) and to force an access-token expiry (e.g., temporarily shortening the JWT TTL, or waiting out the real 60-minute TTL if that's the only option in your environment).

## User Story 1 — Google sign-in (P1)

1. Open `/login`. Confirm both the "Googleでログイン" button and the email/password form are visible together (no provider pre-selection).
2. Click "Googleでログイン" and complete sign-in with the active Google-linked staff account → confirm landing on the dashboard.
3. Visit a private page while signed out (e.g., `/members`) → confirm redirect to `/login?redirect=...` → sign in with Google → confirm landing back on `/members`, not the dashboard (FR-006).
4. Cancel the Google prompt partway through → confirm you're back on `/login` with no error blocking a retry.
5. Sign in with a Google account whose email has no matching staff record (or one that's deactivated) → confirm the "CRMに登録されていないアカウントです" message (FR-003), not the generic credentials message.

## User Story 2 — Email/password sign-in (P1)

1. Enter the correct email and password for the active email/password staff account → submit → confirm landing on the dashboard.
2. Enter a wrong password → confirm "メールアドレスまたはパスワードが正しくありません" and that the form is immediately usable again (FR-004).
3. Trigger a lockout on the disposable test account (repeated wrong attempts) → confirm the distinct "アカウントが一時的にロックされています" message and that the form fields/submit are disabled while locked (FR-005).
4. Deactivate the second email/password staff account, then attempt sign-in with correct credentials → confirm the same account-status message as User Story 1 step 5, not the generic wrong-password message (FR-003).
5. Submit with an empty email or empty password → confirm client-side field validation blocks submission with no network request (FR-010).

## User Story 3 — Session expiry and sign-out (P2)

1. While signed in, open the header user menu and choose "ログアウト" → confirm redirect to `/login`, and — if you can inspect network calls — confirm `POST /api/v1/auth/crm/logout` fired before the cookie was cleared (R8).
2. After signing out, confirm the previously issued access token no longer works against a private API call (401) — i.e., the server-side session is actually gone, not just the local cookie (SC-006).
3. Force the access token to expire while the tab stays open (shortened TTL, or wait it out), then trigger any API call (e.g., navigate to a private page) → confirm you land on `/login?variant=session-expired` with the "セッションの有効期限が切れました。再度ログインしてください。" banner (FR-008), and that signing in again from there works normally.
4. As a regression check on R7: before this feature's fix, this same expiry would have silently logged you out with **no** banner — confirm the banner _does_ appear, which is the signal the refresh-adapter fix (R7) actually took effect for the real client.

## User Story 4 — Magic-link sign-in (P3, added 2026-08-25)

**Extra prerequisite — do this first**: confirmed (2026-08-25) against a live backend send that the CRM magic-link mail is composed as `<crm-origin>/magic-link?token=…` — the app's routes were renamed to match (`research.md` R11): the request screen is `/magic-link-login`, the consume screen is `/magic-link`. You also need access to the inbox of an active email/password staff account.

1. On `/login`, confirm the footer's "マジックリンクでログイン" is now an enabled link (it shipped `disabled`) and follow it → confirm you land on `/magic-link-login` with an email field, a "ログインリンクを送信" button, the 経路② guidance copy, and a "ログインに戻る" footer link (FR-012, PAR016–PAR021, PAR029).
2. Submit with an empty field, then with `not-an-email` → confirm a field-level validation message each time and **no** network request (FR-013).
3. Submit the address of the active staff account → confirm the form is replaced by the sent state: success icon, "マジックリンクを送信しました", the address echoed back, and the "メール内のリンクは15分間有効・1回のみ使用できます" note (FR-014/FR-015, PAR022–PAR025).
4. Confirm the resend button is disabled and counting down as "メールを再送信 (N秒)" from 60, and that it re-enables at 0 (FR-016, PAR026–PAR027).
5. **Non-disclosure check** — open `/magic-link-login` in a fresh tab and submit an address belonging to no staff account at all → confirm the resulting screen is _indistinguishable_ from step 3 in wording and layout, and that the network response is `{ accepted: true }` (FR-014, SC-008). This is the single most important step in this section: a difference here is a security defect, not a cosmetic one.
6. Open the link from the inbox → confirm a brief spinner on `/magic-link`, then landing signed-in on the dashboard (FR-018).
7. Compare scope: with that magic-link session, confirm the sidebar, visible stores, and permitted actions match what the _same_ staff member sees after an ordinary email/password sign-in (SC-010).
8. **Single use** — press Back / re-open the same link → confirm you land on `/login` with the invalid-link banner, and that the session established in step 6 is still working in the other tab (FR-019).
9. **Supersede** — request a link, then request a second one before using the first; open the **first** link → confirm the same invalid-link banner (FR-017), then open the second → confirm it signs you in.
10. **Expiry** — request a link, wait out the 15 minutes, then open it → confirm the invalid-link banner. Confirm steps 8, 9, and 10 all produce _the same_ message, with nothing distinguishing which case occurred (FR-019, SC-009).
11. **Deactivated staff** — request a link, deactivate that staff account, then open the link → confirm the "CRMに登録されていないアカウントです" account-status banner, **not** the invalid-link one (FR-020).
12. **Send failure** — block the `crm/magic-link` request (offline, or a devtools request block) and submit → confirm a retry-able error with the form still filled in, and specifically that the sent state does **not** appear (FR-021).
13. **Already signed in** — while signed in, navigate to `/magic-link-login` → confirm you're redirected straight into the app (FR-022). Then, still signed in, open a valid magic link → confirm you're redirected to `/` and that the link is **not** consumed: sign out and open that same link again → it should still work (`research.md` R12).
14. **StrictMode double-verify regression check** — in a dev build (StrictMode on), open a fresh valid link → confirm it signs you in rather than showing the invalid-link banner. A banner here means the ref latch (`research.md` R15) is not holding and every valid link is being burned twice.
15. **Password-reset regression** — `/password-reset` now uses the extracted `useResendCooldown` hook. Re-run 029's send + 60-second resend countdown and confirm no behavior change.

## Edge cases

1. While signed in, navigate directly to `/login` → confirm you're redirected straight into the app, never seeing the login form (FR-009 / already-existing `proxy.ts` behavior).
2. Simulate a network failure on the `crm/login` call after a successful Google/Cognito identity-provider step → confirm a generic retryable error and that no session cookie is written (FR-011).
3. On the mock client (unrelated staff, if still exercised anywhere) — confirm mock-backed flows are unaffected by the `ClientRequestService` refresh-adapter change (R7 must not change the mock client's existing behavior).
4. Hand-edit the verify URL to `/magic-link` with no `token`, and again with `?token=garbage` → confirm both land on `/login` with the same invalid-link banner and no crash (`research.md` R14).
5. Confirm a Google-path staff member can also request a magic link and that the screen behaves identically — it must not refuse or single them out, which would itself disclose their auth path (spec Assumptions).

## Sign-off

All items above pass → feature is ready for code review per the constitution's Merge Request gate. No automated test suite to run.
