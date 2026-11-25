# Test Plan: Forgot Password / Password Reset (029)

**Spec**: [../spec.md](../spec.md)
**PO Spec**: `Y-13` — 認証・ログイン, `FR-M006` パスワードリセット (`crm/requirements/Y-13.md`) — self-service reset for email/password (経路②) staff only
**Created**: 2026-08-18
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

---

## Scope

**In scope** (screens covered by the two units below):

- パスワードの再設定（申請） (Password Reset Request: email entry + "メールを送信しました" confirmation + resend cooldown + Google-SSO guidance note) — `password-reset.tsx` → app route `/password-reset`
- 新しいパスワードを設定（リセットリンクから） (Set New Password from reset link: policy checklist + confirmation, plus its expired/invalid-link and success states) — `password-set.tsx` → app route `/password-set`

**Out of scope** (navigation targets / separate specs — not covered by this plan):

- The login page itself — its own states (session-expired, locked, domain-unregistered, generic error), the Google/email sign-in it hosts, and the "パスワードをお忘れの方" link's presence — all owned by `specs/028-subsequent-login/`; this plan only picks up from that link's _destination_.
- Magic-link login (Y-13 FR-S001) — a separate, unrelated entry point per this spec's Assumptions.
- Google SSO's actual password-change flow at google.com — this feature only shows a guidance note pointing there; the destination is external and untestable here.
- The email-sending mechanism, reset-link token format/expiry duration, and the identity provider (IDaaS) issuing/validating the token — implementation concerns delegated to IDaaS integration per the spec's Assumptions, not user-facing requirements to verify directly (only their externally-observable effect — link works once, then shows invalid — is testable).

---

## Unit Table

| #   | Unit                         | Screen(s)                  | Route             | TC Doc Filename                                            |
| --- | ---------------------------- | -------------------------- | ----------------- | ---------------------------------------------------------- |
| 1   | Password Reset Request       | パスワードの再設定（申請） | `/password-reset` | `TC -【Fitness CRM】- [Y-13][02][パスワード再設定申請].md` |
| 2   | Set New Password (from link) | 新しいパスワードを設定     | `/password-set`   | `TC -【Fitness CRM】- [Y-13][03][新パスワード設定].md`     |

Both under `specs/029-password-reset/tests/cases/`. (Numbered `02`/`03` to sit alongside `028-subsequent-login`'s `[Y-13][01]` regular-login doc, since all three specs share PO Spec `Y-13`.)

**Split rationale**: These are two distinct routes reached through fundamentally different entry points — Request is opened directly from the login page within one sitting, while Set-New-Password is only reachable via a token-bearing link delivered by email, i.e. there is a real-world context switch (leaving the browser, checking email) between them, unlike a same-session step flow. They are not clustered under the unit rule's "step flow" exception because a tester cannot exercise both back-to-back as one continuous in-app journey the way first-time-login's form→password-set→completion sequence works. Each also carries independently substantial validation/state logic (Request: email-format validation + resend cooldown; Set-New-Password: three-rule live policy checklist + confirmation matching + expired/used-link and success states), so each earns its own full TC doc.

---

## Sources per Unit

| Unit                         | Spec sections                                                                                        | UI mockup file       | FRs covered                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------- |
| Password Reset Request       | User Story 1 (all); User Story 3 (all); Edge Cases: multi-tab/device resubmission                    | `password-reset.tsx` | FR-001, FR-002, FR-003, FR-004, FR-010 |
| Set New Password (from link) | User Story 2 (all); Edge Cases: reopen-after-close, reuse-after-completion, no-token/malformed-token | `password-set.tsx`   | FR-005, FR-006, FR-007, FR-008, FR-009 |

**Cross-references**: Requirement doc `crm/requirements/Y-13.md` FR-M002 supplies the password policy (8+ chars, mixed case, number, last-3-reuse-disallowed — the last-3-reuse rule is server-side per this spec's Assumptions and not client-preflightable, so it is a `Block`-if-untestable note for Unit 2, not a UI assertion) and FR-M006 defines the reset-link lifecycle both units implement together.

---

## Coverage Focus per Unit

Added to, not a replacement for, `gen-testcases`' full coverage walk (field-level validation, empty/loading/error states, etc. per the common checklists).

- **Password Reset Request**: email-format validation blocking submission client-side with the exact "正しいメールアドレスを入力してください" message before any request fires; identical confirmation state and copy regardless of whether the submitted email matches a real/active account (no existence disclosure — test with both a known-seeded email and an obviously-unregistered one and diff the responses); confirmation state names the submitted email address back to the user; resend button disabled with a visibly counting-down remaining-time label during the 60-second cooldown, becoming enabled at exactly zero; the persistent Google-SSO guidance note is present on the request screen regardless of what's typed or submitted (not conditionally rendered); "ログインに戻る" navigates back to the login page from either the initial or the confirmation state.
- **Set New Password (from link)**: live-updating three-rule checklist (8+ chars, upper+lower case, number — note this screen's policy is three rules per the mockup and spec FR-006, distinct from Unit 1/023's four-rule policy that includes a symbol; confirm the real app doesn't cross-wire the two) with no submission needed to see each item flip satisfied; confirmation-mismatch message appears only once the confirmation field has content, not while it's still empty; submit control's compound disabled condition (any unmet rule, OR empty confirmation, OR mismatched confirmation); expired-or-already-used link shows the invalid-link state instead of the form, with a "パスワードリセットをやり直す" action back into Unit 1's request screen; a link that was already fully consumed by a prior successful submission shows the same invalid-link state on a second open (not the form again); a missing or malformed token (direct navigation to the screen with no valid token) is treated identically to expired/used, never rendering the password form; successful submission shows the "パスワードを設定しました" success screen with a link back to login, and (per FR-008) is expected to invalidate the staff member's other existing sessions — flag as `Block` if there's no way to observe that server-side effect from the UI alone.

---

## Traceability Map

| FR     | Requirement (short)                                                                         | Unit(s)                                                            |
| ------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| FR-001 | Reach password-reset request screen from a login-page link                                  | Password Reset Request                                             |
| FR-002 | Identical confirmation regardless of account existence (no disclosure)                      | Password Reset Request                                             |
| FR-003 | Client-side email-format validation before request                                          | Password Reset Request                                             |
| FR-004 | Resend from confirmation state, gated by 60s cooldown                                       | Password Reset Request                                             |
| FR-005 | Issue one-time, time-limited reset link for matching active account                         | Password Reset Request (issuance) / Set New Password (consumption) |
| FR-006 | Present new-password form with live 3-rule checklist + confirmation, on a valid unused link | Set New Password                                                   |
| FR-007 | Block submission unless every rule met and confirmation matches exactly                     | Set New Password                                                   |
| FR-008 | On success, invalidate all existing sessions and show success screen back to login          | Set New Password                                                   |
| FR-009 | Expired/used link shows invalid-link state, not the form, with a restart action             | Set New Password                                                   |
| FR-010 | Persistent Google-SSO guidance note on the request screen                                   | Password Reset Request                                             |

Every FR-001…FR-010 lands in at least one unit. No orphaned requirements.

---

## Execution Notes (for `execute-testcases`)

- **No test environment for Google/Cognito**: Per instruction, actual reset-link issuance/delivery through the real IDaaS and any Google-account-side behavior are untestable here. Record as `Block` (not `NG`) whatever depends on a genuinely-delivered email or real IDaaS token validation; what IS testable and must be run as real cases: both screens' client-side form validation, the resend-cooldown timer, the identical-response-regardless-of-account-existence behavior (observable purely from the UI's confirmation state), and the token-state branching (valid/expired/used/malformed) — the last of these can be driven by controlling the token query param directly against however the mock API validates it, without needing a real emailed link.
- **Roles/credentials**: No authenticated session exists during this flow. Needs: one seeded email/password-based active staff account (to exercise the real-account path, even though the response is identical either way), one email with no matching account, and a way to mint reset tokens in each of the four states (valid-unused, expired, already-used, malformed/absent) against the mock API — check whether the mock API exposes a way to fabricate these token states directly; if not, note as `Block` for whichever states can't be reached.
- **BE-mocked caveats**: Actual reset-link expiry timing, last-3-password-reuse enforcement (FR-M002, server-side per spec Assumptions), and cross-session invalidation on password change (FR-008) are backend/mock-API concerns — do not mark `NG` for a mock-layer limitation on these; record as `Block` with a note instead, and reserve `NG` for genuine client-side/UI defects (wrong copy, wrong gating, checklist not updating live, etc.).
- **Seed-reset points**: Re-seed or re-mint a fresh reset token before each token-state case in Unit 2 so a "used" token doesn't leak into a "valid" case's fixture; reset the resend-cooldown timer state between Unit 1 cases that depend on it.
- **Viewport**: Tablet-and-up (back-office CRM; no mobile layout in scope).

---

## Suggested Order

1. **Password Reset Request** — the entry point; run first since it's the only way (short of directly minting a token) to reach a fresh reset link for Unit 2's setup.
2. **Set New Password (from link)** — depends on Unit 1 (or a directly-minted mock token) for its valid-link cases; run its expired/used/malformed-link states first (no live token dependency), then the valid-link form/validation cases, ending with the one-time-consumption case last since it needs a token that has already been used once.

---

## Definition of Done

- [ ] Both TC documents created under `specs/029-password-reset/tests/cases/`, one per unit above.
- [ ] Every FR-001…FR-010 traced to ≥1 unit (see Traceability Map — already confirmed complete).
- [ ] Any gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` during authoring are fixed first, per the checklist-first workflow, before/alongside writing the per-screen cases.
- [ ] Each of the two TC documents has been executed at least once (`execute-testcases`) with OK/NG/Block recorded per case.
