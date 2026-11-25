# Quickstart: Manual Verification — Staff & Permission Management (020)

Per the project's No Testing Policy (no automated tests), this checklist is the acceptance
mechanism. Run through it against `npm run dev` after implementation, switching the simulated
current user (via whatever mock-auth-switch mechanism the codebase already uses for
`getAuthMeOptions`) between roles as noted.

## Setup

- [ ] `npm run lint` and `tsc --noEmit` pass with zero errors.
- [ ] Navigate to `/staffs` as a Headquarter user; the page loads without console errors.

## US1 — Browse and search (P1)

- [ ] As Headquarter, list shows all staff with ID, name, role, position, store/FC company,
      status (有効/無効/招待中), and last login as relative time (e.g. "3日前").
- [ ] Switch simulated user to Manager (with `managed_store_ids` seeded to 1–2 stores); reload —
      only staff at those stores appear.
- [ ] Switch to Staff/Trainer/Observer; reload — only the caller's own row appears.
- [ ] Type a name fragment into search — list narrows to matches only.
- [ ] Apply role + position + store + status filters together — active-filter count badge and
      result count both update correctly; combining filters ANDs them.
- [ ] Clear-all-filters button resets every filter and search text in one click.
- [ ] Filter to a combination with zero matches — "filtered" empty state with a clear-filters
      action appears (distinct copy from the true-empty state).
- [ ] An invited row shows a masked/italic name and "未ログイン" + invitation date instead of a
      login time.

## US2 — Register new staff (P1)

- [ ] Open `/staffs/create`. Add 3 rows (last/first name + email), pick a shared role, position,
      and store affiliation, submit — 3 new accounts appear in the list with status 招待中.
- [ ] Leave one row's email blank and submit — submission blocked, the blank field is highlighted,
      view scrolls to the first error.
- [ ] Enter an email that already belongs to an existing account — inline duplicate warning
      appears before submit.
- [ ] Enter the same email in two rows of the same batch — within-batch duplicate warning appears.
- [ ] Paste 3 newline-separated emails into one row's email field — 3 rows are created
      automatically, one email each.
- [ ] Submit button label reflects the filled row count; it's disabled with zero filled rows.

## US3 — Edit staff, role, affiliation (P2)

- [ ] As Headquarter, edit a staff member's role and save — confirmation dialog shows old role →
      new role and the next-login-effective notice; only after confirming does it save, and a new
      entry appears on that staff's 変更履歴 tab.
- [ ] Edit a non-role field (e.g. note) and save — no role-change dialog appears.
- [ ] As Manager scoped to store A, open a Staff-role account affiliated with store A — edit is
      allowed. Open one affiliated with store B (not in scope) — edit is blocked with an
      explanatory tooltip/message.
- [ ] Switch an account's affiliation pattern from store to FC company (or back) — the previous
      selection clears and only the new pattern's selector shows; saving reflects the switch.
- [ ] Selecting an FC company shows the full list of stores it manages.
- [ ] Make an edit, then try to navigate away without saving — a discard-confirmation prompt
      blocks the navigation until confirmed or cancelled.

## US4 — Deactivate / delete (P2)

- [ ] Deactivate an active account (with and without entering a reason) — status becomes 無効,
      account can no longer "log in" (per whatever the mock auth check does), and its permission
      history / detail records remain fully visible.
- [ ] Delete an account — it disappears from the active list and detail view (404 or list
      exclusion), but a lookup of its permission-history entries (if reachable) still resolves.
- [ ] Both actions require explicit dialog confirmation — closing/cancelling the dialog performs
      no change.

## US5 — Permission history & access reissue (P3)

- [ ] Open a staff account with prior changes — 変更履歴 tab lists date/operator/description,
      newest first.
- [ ] Resend invite on an 招待中 account — success toast/message names the target email; action
      is unavailable (or errors) on a non-invited account.
- [ ] As Headquarter, issue a magic link for another account — success message names that
      account's email.
- [ ] As any non-headquarters role, issue a magic link for your own account — succeeds regardless
      of role.

## Cross-cutting

- [ ] Every action button/menu item that should be role-gated (edit, deactivate, delete, role
      change, resend-invite) is visibly disabled with a deny tooltip for roles lacking permission,
      not just hidden — confirm both hidden-vs-disabled matches what the reviewed V0 does per role.
- [ ] No new npm dependency was added; `git diff package.json` is empty (or justified in
      plan.md's Complexity Tracking if not).
