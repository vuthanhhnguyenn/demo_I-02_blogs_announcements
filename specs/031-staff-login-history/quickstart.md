# Quickstart: Manual Verification — Staff Detail Login History Tab (031)

Per the project's No Testing Policy (no automated tests), this checklist is the acceptance
mechanism. Run through it against `npm run dev` with the real backend (`NEXT_PUBLIC_REAL_API_URL`)
reachable, switching between roles as needed. Also run through `checklists/parity.md` afterward.

## Setup

- [ ] `npm run lint` and `tsc --noEmit` pass with zero errors.
- [ ] Sign in as a Headquarter (or System) user and open any staff account's detail page
      (`/staffs/{id}`) without console errors.

## US1 — Review a staff account's login history (P1)

- [ ] As Headquarter, a third tab "ログイン履歴" appears after "基本情報" and "変更履歴".
- [ ] Open it: for a staff account with prior sign-ins, rows show 日時, 認証方式 (one of "Google
      SSO" / "IDaaS" / "マジックリンク"), IPアドレス, and ユーザーエージェント, newest first.
- [ ] Hover a long user-agent value — the full string appears in a tooltip; the visible cell stays
      truncated.
- [ ] Footer shows the total entry count (e.g. "全8件").
- [ ] Open a staff account that has never signed in (still 招待中) — the table shows the same
      empty-state pattern as the 変更履歴 tab (not a blank white area, not an error).
- [ ] Switch the simulated user to Manager, Staff, Trainer, and Observer in turn (own account and
      another account's detail page) — the "ログイン履歴" tab does not render for any of them.
- [ ] While signed in as a non-HQ/System role, attempt the login-histories request directly (e.g.
      via browser devtools against the real API URL) — confirm a `403` comes back rather than data
      (server-side gate, independent of the hidden tab).

## US2 — Force-terminate a staff account's session (P2)

- [ ] On the "ログイン履歴" tab, the "アクティブセッション" card is visible to Headquarter/System,
      above the history table.
- [ ] For a staff account that is currently signed in, one session row shows: device icon
      (Monitor/Smartphone), device label derived from the user agent, IP address, and 最終アクティブ
      elapsed time. Y-13 FR-S002 specifies up to 3 rows; the backend serves one today (see
      `spec.md` header note), so exactly one row is expected until FR-S002 ships.
- [ ] For a staff account with no live session (never signed in, or already logged out), the card
      shows "現在ログイン中のセッションはありません。" instead of rows.
- [ ] Click "強制終了" on a row — a confirmation dialog names that row's device and IP.
- [ ] Confirm — a success message appears, the row shows "終了しました", and the card re-reads from
      the server (the row then drops to the empty state, since the account's one session is gone).
- [ ] Re-run the terminate against a staff account with no live session — the mutation still
      succeeds (idempotent; no error toast).
- [ ] View your own staff detail page — your row carries the "現在のセッション" badge and no
      強制終了 button.
- [ ] Switch to Manager and confirm the card and its action are not present/reachable.

## Sanity check (should NOT be present)

- [ ] No "保持期間1年間" footer text under the history table (the API does not return a retention
      value — see `checklists/parity.md`'s descope note).
- [ ] The 結果 column renders 成功 for every row: the endpoint records successful sign-ins only, so
      no 失敗/ロック value should appear until the backend adds `result` (Y-13 FR-M009 — see
      `checklists/parity.md` › "Known backend gaps").

## Final checks

- [ ] Re-run `checklists/parity.md` against the built screen; every non-descoped `PAR###` item is
      checked off.
- [ ] Re-run `checklists/requirements.md`; confirm it's still fully passing (no new
      `[NEEDS CLARIFICATION]` introduced by implementation-time decisions).
