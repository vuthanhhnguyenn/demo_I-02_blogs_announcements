# Test Plan: First-Time Login (023)

**Spec**: [../spec.md](../spec.md)
**PO Spec**: `AUTH-01` — 認証・ログイン (`crm/requirements/AUTH-01.md` / superseded by `Y-13.md`) — first-time login sub-flows only
**Created**: 2026-08-18
**Consumed by**: `gen-testcases` (reads this plan to know WHAT to author, per unit) → `execute-testcases` (reads this plan for run order + execution notes)

---

## Scope

**In scope** (screens covered by the unit below, sourced from the reviewed UI prototype and the real app route it maps to):

- 初回ログイン (First-Time Login: email pre-filled + temp password, or Google) — `login-initial.tsx` → app route `/login-initial`
- 招待リンク期限切れ (Invitation Link Expired/Invalid state) — `login-initial-expired.tsx` → rendered as `expired-state.tsx` inside `/login-initial` (same route, token-validity-driven state, not a separate URL)
- パスワードを設定（初回） (First-Time Password Set step) — `first-time-password-set.tsx` → rendered as `first-time-password-set-form.tsx` inside `/login-initial` (same route, post-auth step)
- 初回ログイン完了 (First-Time Login Complete) — `login-initial-success.tsx` → app route `/login-initial/success`

**Out of scope** (navigation targets / separate specs — not covered by this plan):

- Regular (subsequent) login screen and its states (session-expired, locked, domain-unregistered, generic error) — `specs/028-subsequent-login/`.
- Forgot-password request and set-new-password-from-reset-link screens — `specs/029-password-reset/`.
- Issuing the invitation itself (admin-side "invite staff" action) and the separate mobile-app magic-link recovery flow — both explicitly out of scope per spec Assumptions.
- Actual Google OAuth consent screen and actual Cognito temporary-password exchange — no test environment exists for either provider integration (per user instruction); only the CRM-side screen behavior around them is testable here.
- Dashboard content reached after "ダッシュボードへ進む" — a separate, unrelated feature.

---

## Unit Table

| #   | Unit                  | Screen(s)                                                                       | Route                                      | TC Doc Filename                                       |
| --- | --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| 1   | First-Time Login Flow | 初回ログイン + 招待リンク期限切れ + パスワードを設定（初回） + 初回ログイン完了 | `/login-initial`, `/login-initial/success` | `TC -【Fitness CRM】- [AUTH-01][01][初回ログイン].md` |

All under `specs/023-first-time-login/tests/cases/`.

**Split rationale**: The unit rule calls for one screen per unit, clustering only when tightly related as a step flow. All four prototype pages here are a single, linear, no-branching user journey reached from one invitation link: token check → (temp-password form _or_ Google button) → \[password-set step, temp-password path only\] → completion screen; the expired/invalid state is a terminal render of the same entry point, not an independent screen a tester navigates to directly. The real app already implements login-initial, the expired state, and the password-set step as one route (`/login-initial`) with state-driven sub-components, confirming they share one testable surface. Only the completion screen sits on its own route (`/login-initial/success`), but it has no independent form/validation logic (a static confirmation + one button) and is unreachable except as this flow's tail — bundling it avoids a near-empty fourth TC doc. One unit is therefore appropriate rather than a premature four-way split.

---

## Sources per Unit

| Unit                  | Spec sections                                                                     | UI mockup file(s)                                                                                            | FRs covered                                                                    |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| First-Time Login Flow | User Story 1 (all); User Story 2 (all); User Story 3 (all); Edge Cases (all five) | `login-initial.tsx`, `login-initial-expired.tsx`, `first-time-password-set.tsx`, `login-initial-success.tsx` | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010 |

**Cross-references**: Requirement doc `crm/requirements/Y-13.md` (successor to `AUTH-01.md`) FR-M002 defines the password-policy rules referenced by FR-005/FR-006, and FR-M004 defines the invitation/first-time-login flow this unit implements.

---

## Coverage Focus per Unit

Added to, not a replacement for, `gen-testcases`' full coverage walk (field-level validation, empty/loading/error states, etc. per the common checklists).

- **First-Time Login Flow**: read-only/locked invited-email field (never editable, regardless of what the user tries); the three-way branch on link state (valid-unused → form, expired/used/revoked → invalid message, unknown/deactivated-staff → contact-administrator message) and that none of the invalid states ever render login fields or a self-service retry; incorrect-temp-password error message is distinct from and does not leak into the invitation-invalid message, and lets the user retry on the same screen; new-password real-time checklist (8+ chars, upper+lower, number, symbol — note this spec's FR-005 requires a symbol requirement in addition to the three shown in the `first-time-password-set.tsx` mockup, so verify which the real app actually enforces and flag any mismatch) updating live per keystroke with no submit required; submit-button disabled state driven by the compound condition (all strength rules met AND confirm matches AND confirm non-empty); confirm-mismatch message appears only once the confirm field has content (not on an empty confirm field); one-time-use consumption — reopening the same link after completing the password-set step (even without ever clicking through to the dashboard) must show the invalid-link state, not the form again; generic "something went wrong" messaging for a transient auth failure (Google or temp-password) that keeps the link retry-usable, distinguished from both the credentials-wrong and link-invalid messages; Google-path skips the password-set step entirely and lands straight on completion.

---

## Traceability Map

| FR     | Requirement (short)                                                                                  | Unit(s)               |
| ------ | ---------------------------------------------------------------------------------------------------- | --------------------- |
| FR-001 | Authenticate via linked Google account or email + temp password                                      | First-Time Login Flow |
| FR-002 | Verify invitation token on load; pre-fill read-only invited email                                    | First-Time Login Flow |
| FR-003 | Show "invitation no longer valid" (no form, no retry) for missing/invalid/expired/used/revoked token | First-Time Login Flow |
| FR-004 | Require new personal password after temp-password auth, before CRM access                            | First-Time Login Flow |
| FR-005 | Enforce 8+ chars, upper+lower, number, symbol; real-time requirement feedback                        | First-Time Login Flow |
| FR-006 | Block submission until all strength rules met and confirmation matches exactly                       | First-Time Login Flow |
| FR-007 | Show completion confirmation; let staff proceed into the CRM                                         | First-Time Login Flow |
| FR-008 | Invitation link usable exactly once; reuse treated as invalid per FR-003                             | First-Time Login Flow |
| FR-009 | Distinct, retryable error for incorrect/unverifiable credentials (not the link-invalid message)      | First-Time Login Flow |
| FR-010 | Deny login for not-found/deactivated staff account; direct to contact administrator                  | First-Time Login Flow |

Every FR-001…FR-010 lands in the single unit above. No orphaned requirements.

---

## Execution Notes (for `execute-testcases`)

- **Roles/credentials**: This flow precedes any authenticated session, so no CRM role/permission matrix applies. Testing needs multiple mock invitation-link states instead: valid-unused, expired, already-used, revoked, and pointing to a deactivated/non-existent staff record — seed or fake the token param for each.
- **No test environment for Google/Cognito**: Per instruction, there is no environment to actually exercise Google OAuth consent or the real Cognito temporary-password exchange. Record any case whose outcome depends on that real provider round-trip (e.g. "Google authentication succeeds") as `Block` with a note, not `NG` — this includes User Story 2's happy path in full and the temp-password happy path's actual credential verification. What IS testable and must be run as real cases: the CRM-side form (locked email field, password field, show/hide toggle), the new-password validation/strength/confirmation logic entirely client-side, the token-state branching (expired/used/revoked/not-found renders), and the client-side error message wiring for a simulated auth failure (mock the auth call's rejection/success rather than hitting the real provider).
- **BE-mocked caveats**: One-time-use consumption (FR-008) and deactivated/not-found detection (FR-010) depend on mock-DB invitation/staff records — verify against whatever the mock API actually returns; if the mock API doesn't yet support marking a token "used" after a completed flow, record that check as `Block`, not `NG`.
- **Seed-reset points**: Each token-state case (expired/used/revoked/valid) needs its own fresh mock invitation record; re-seed between cases so a "used" case doesn't leak into a "valid" case's fixture.
- **Viewport**: Tablet-and-up (back-office CRM; no mobile layout in scope).

---

## Suggested Order

1. **First-Time Login Flow** — the only unit; run token-invalid states first (cheapest, no auth needed), then the temp-password form's validation/strength logic, then the one-time-use consumption case last since it depends on a prior successful run through the flow.

---

## Definition of Done

- [ ] The TC document created under `specs/023-first-time-login/tests/cases/`.
- [ ] Every FR-001…FR-010 traced to the unit (see Traceability Map — already confirmed complete).
- [ ] Any gaps found in `tests/checklists/common-function-checklist.md` / `common-gui-validate-checklist.md` during authoring are fixed first, per the checklist-first workflow, before/alongside writing the case.
- [ ] The TC document has been executed at least once (`execute-testcases`) with OK/NG/Block recorded per case.
