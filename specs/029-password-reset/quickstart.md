# Quickstart: Manual Verification — Forgot Password (Password Reset)

Per the project's No Testing Policy, this checklist is the QA gate for this feature — no automated tests exist or should be added.

## Prerequisites

- `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_REGION`, `NEXT_PUBLIC_COGNITO_ENDPOINT` already configured (same values `023-first-time-login`/`028-subsequent-login` use).
- The Cognito User Pool's forgot-password email template configured to link to `/password-set?email={username}&code={####}` (per `contracts/cognito-forgot-password.md`'s external dependency) — if this isn't configured yet in your test environment, you can still exercise Story 2 by manually constructing that URL with a code copied from the plain-code email Cognito sends by default.
- At least one active, email/password (Cognito) staff account you can reset without affecting anyone else's testing.
- A Google-linked staff account, to verify Story 3's non-disclosure behavior.
- Access to trigger `LimitExceededException` is optional/best-effort (rapid repeated requests); not blocking for sign-off if your test User Pool's rate limit is hard to hit deliberately.

## User Story 1 — Request a reset link (P1)

1. Open `/login`, click "パスワードをお忘れの方" → confirm you land on `/password-reset` (R6).
2. Submit the active Cognito staff account's email → confirm the "メールを送信しました" state appears, naming that email address, with a "メールを再送信" button.
3. Submit an email with no matching account at all (e.g. a made-up address) → confirm the identical "メールを送信しました" confirmation, not an error (FR-002).
4. Submit clearly malformed text (e.g. `not-an-email`) → confirm the inline "正しいメールアドレスを入力してください" message and no network request fires (FR-003).
5. On the sent state, click "メールを再送信" immediately → confirm it's disabled and counts down from 60 seconds; wait it out (or re-check after 60s) → confirm it becomes clickable and re-sends (FR-004).
6. Click "ログインに戻る" → confirm it returns to `/login`.

## User Story 2 — Set a new password from the link (P1)

1. Complete Story 1 for the active Cognito staff account, retrieve the emailed link (or construct `/password-set?email=...&code=...` per Prerequisites), and open it → confirm the new-password form appears with the 3-4 item requirement checklist and strength bar (PAR011–018).
2. Type a password that fails one or more policy rules → confirm the checklist updates live per keystroke and the submit button stays disabled.
3. Type a password meeting the policy but a non-matching confirmation → confirm "パスワードが一致しません" and the submit button stays disabled.
4. Type a valid, matching password and submit → confirm the "パスワードを設定しました" success screen appears, then click "ログイン画面へ" → confirm you land on `/login`.
5. Sign in at `/login` with the new password → confirm it works; try the _old_ password → confirm it's rejected.
6. If reachable in your test environment, confirm any other active session for that account was invalidated by the reset (SC-005) — e.g., a previously issued access token no longer works against a private API call.
7. Reuse the exact same reset link a second time (after step 4 already consumed it) → confirm the "リンクが無効または期限切れです" state, not the password form (FR-009).
8. Open `/password-set` with no `email`/`code` query params at all → confirm the same "invalid or expired" state, never the password form.
9. Click "パスワードリセットをやり直す" from the expired state → confirm it returns to `/password-reset`.

## User Story 3 — Google-SSO staff member guidance (P3)

1. Open `/password-reset` → confirm the "Googleアカウント（直営店など）でログインしている方は…google.com から変更してください" note is always visible, regardless of what's typed (FR-010).
2. Submit the Google-linked staff account's email on `/password-reset` → confirm the identical "メールを送信しました" confirmation as Story 1 (no special-casing at submission time).

## Edge cases

1. Request two reset links in a row for the same account (different tabs) before using either → confirm the most recently issued link works when submitted; do not assume the earlier link is required to fail (spec.md notes this is not a requirement either way).
2. Simulate a network failure during the `ForgotPassword` call (e.g., offline devtools throttling) → confirm a retry-oriented state on `/password-reset`, not a false "sent" confirmation.

## Sign-off

All items above pass → feature is ready for code review per the constitution's Merge Request gate. No automated test suite to run.
