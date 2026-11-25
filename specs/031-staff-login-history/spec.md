# Feature Specification: Staff Detail — Login History Tab

**Feature Branch**: `031-staff-login-history`
**Created**: 2026-09-07
**Status**: Draft
**PO Spec**: `Y-13` — 認証・ログイン _(FR-M009 ログイン履歴・監査ログの記録; FR-S002 同時ログイン制御 — dx-fitness/fitness-spec @ 89c2c79)_, cross-referenced with `Y-01` — スタッフ・権限管理 _(host screen + 権限マトリクス L336-338, same commit)_
**Source**: UI prototype `staff-detail.tsx` (dx-fitness/fitness-crm-ui @ `1bad949`, 2026-09-03 — the ログイン履歴 tab was added in `c1c7e2e`, 2026-08-05, i.e. **after** sibling spec `020-staff-permission-management` pinned this file at `182bd6e`, 2026-07-15; that spec's later 2026-08-24 re-check did not re-pull the mockup and also missed it) + Requirement spec `crm/requirements/Y-13.md` (FR-M009, FR-S002) and `crm/requirements/Y-01.md` (権限マトリクス) + real backend contract `GET /api/v1/admin/staff/{id}/login-histories` and `POST /api/v1/admin/staff/{id}/sessions/revoke` (`src/lib/openapi.real.json`, already generated into `src/lib/api-real`)
**Input**: User description: "Kiểm tra lại spec đã có spec cho tab ログイン履歴 ở màn hình staff detail chưa, nếu chưa thì thêm, nếu có thì kiểm tra khớp với UI/spec mới nhất"

> **Gap found**: No existing spec covers this tab. `020-staff-permission-management/spec.md` only specs the `変更履歴` (permission-change history) tab. `028-subsequent-login/spec.md` explicitly defers FR-M009 ("Login history/audit logging... are back-office capabilities belonging to staff management, not to this login screen") to staff management — i.e., to this screen. The live app (`staffs/[id]/page.tsx`) currently renders only two tabs (`基本情報`, `変更履歴`); the `ログイン履歴` tab does not exist yet. This spec fills that gap.
>
> **Backend gap, not a requirement change (corrected 2026-09-10)**: an earlier revision of this
> spec claimed the V0 mockup's richer design — a multi-device active-session list with a 3-device
> cap and a 成功/失敗/ロック result column — was "speculative" and that the backend contract showed
> a settled product decision against it. **That was wrong.** Re-checking the PO spec shows the
> mockup follows it exactly:
>
> - **Y-13 FR-S002 (Should, Y-13.md L275-281)**: 「同時ログイン上限: 3デバイス」/「上限超過時: 最も古いセッションを強制失効させる」/「Y-01スタッフ詳細画面でアクティブセッション一覧を表示し、個別にセッションを強制終了可能（HQ権限）」
> - **Y-13 FR-M009 (Must, Y-13.md L250)**: 記録項目 includes 「結果（成功 / 失敗 / ロック）」 over 「全ログイン試行」
>
> What the backend implements today is narrower: one session per staff (`GET .../sessions` returns
> a lone `session` object, `POST .../sessions/revoke` takes no `sessionId`) and a login history of
> successful sign-ins only, with no `result` field. Neither narrowing is recorded as a product
> decision anywhere in Y-13 — and Y-13-Q02, the one open session-policy question (Y-13.md L156,
> L348), covers only auto-logout duration and shared-PC behavior, **not** the device count. So
> these are **backend to-dos**, and this spec builds to the requirement while adapting to what the
> API returns today. See Assumptions and `checklists/parity.md` › "Known backend gaps".

## User Scenarios _(mandatory)_

### User Story 1 - Review a staff account's login history (Priority: P1)

A headquarters user investigating a security concern (e.g. an unfamiliar access report, a suspected compromised account) or performing a routine audit opens a staff account's detail page and reviews the account's recent sign-ins — when each happened, how the person authenticated, and from where.

**Why this priority**: This is the Must-priority requirement (Y-13 FR-M009) the audit/security posture of the whole authentication feature depends on; without it, no login activity is reviewable from the CRM at all.

**Verification**: Log in as Headquarter, open any staff account's detail page, open the "ログイン履歴" tab, and confirm recorded sign-ins are listed with a plausible date, method, IP, and user agent, newest first.

**Acceptance Scenarios**:

1. **Given** a headquarters user viewing a staff account's detail page, **When** the page loads, **Then** a "ログイン履歴" tab appears alongside "基本情報" and "変更履歴".
2. **Given** the "ログイン履歴" tab is open, **When** sign-ins are recorded for that account, **Then** each row shows 日時, 認証方式 (Google SSO / IDaaS / マジックリンク), 結果 (currently always 成功 — see Assumptions), IPアドレス, and ユーザーエージェント (truncated with the full string available on hover), ordered newest first.
3. **Given** the login-history list, **When** it renders, **Then** a footer shows the total entry count.
4. **Given** a Manager, Staff, Trainer, or Observer user, **When** they open any staff account's detail page — including their own — **Then** no "ログイン履歴" tab is shown.

---

### User Story 2 - Force-terminate a staff account's CRM session (Priority: P2)

A headquarters user notices a staff member's account may still be signed in somewhere it shouldn't be (a lost device, a shared terminal) and wants to end that account's CRM access immediately, without deactivating the account itself.

**Why this priority**: This is the Should-priority requirement (Y-13 FR-S002 — currently served by a backend that keeps a single session instead of the specified 3-device control; see the header note); it strengthens the account-safety value of User Story 1 but the login-history record is useful on its own without it.

**Verification**: Open the "ログイン履歴" tab for any staff account, trigger the session-termination action, confirm it, and confirm a success message — including when the staff account has no live session at the time.

**Acceptance Scenarios**:

1. **Given** the "ログイン履歴" tab, **When** it loads, **Then** a "セッションを強制終了" action is available for a headquarters user (no session list or device detail is shown — the backend tracks and exposes at most one active session per staff account, and does not expose whether one currently exists).
2. **Given** a headquarters user clicks "セッションを強制終了", **When** they confirm in the resulting dialog (which explains the staff member will be signed out on their next request and will need to sign in again), **Then** the system terminates that account's CRM session and shows a success message.
3. **Given** a staff account with no live session at the time, **When** a headquarters user triggers the same action, **Then** it still completes successfully (this action is idempotent by design — "no session to end" is a valid outcome, not an error).

### Edge Cases

- What happens when a staff account has no recorded sign-ins yet (e.g., still "招待中", never completed a first login)? The login-history table shows an empty state consistent with the existing "変更履歴" tab's empty state.
- What happens if a Manager, Staff, Trainer, or Observer attempts to reach login-history data or the session-termination action directly (API call, saved URL) despite the tab being hidden for them? The request is denied — the same server-side check that hides the tab also gates the underlying data and action, for both the viewed account and the viewer's own account.
- What happens if a headquarters user terminates their own account's session while viewing their own staff detail page? The action still succeeds and signs that session out on its next request, same as for any other account — this screen does not special-case "viewing yourself."
- What happens to sign-ins beyond what the login-history endpoint returns? Only successful sign-ins are ever recorded server-side; failed or locked-out login attempts are not tracked by this endpoint and therefore cannot appear here (see Assumptions).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST show a "ログイン履歴" tab on the staff detail screen, positioned after "基本情報" and "変更履歴", visible only when the viewing user's role is Headquarter or System.
- **FR-002**: The "ログイン履歴" tab MUST NOT render for Manager, Staff, Trainer, or Observer roles, whether they are viewing their own account's detail page or another account's.
- **FR-003**: Within the tab, system MUST display a table of that staff account's recorded sign-ins with columns: 日時, 認証方式 (Google SSO / IDaaS / マジックリンク), 結果 (成功 / 失敗 / ロック — defaults to 成功 until the backend returns a real value, per Assumptions), IPアドレス, and ユーザーエージェント (truncated, full value available on hover), ordered newest first.
- **FR-004**: The login-history list MUST show a footer stating the total entry count.
- **FR-005**: Within the same tab, system MUST display that staff account's currently-live CRM sessions as a list — one row per terminal, newest first, each showing the device/browser (rendered from the session's user agent), its source IP and its last-active time, with the viewer's own session marked as 現在のセッション — and a Headquarter/System user MUST be able to force-terminate a session via a single confirming action, both for one chosen row and for every session the account holds at once (the latter being the correct response to a lost device). The list MUST also state the concurrent-session cap, **taking that number from the value the API serves rather than hard-coding it**, so the stated cap cannot drift from the limit actually enforced.

  > **Revised 2026-09-18.** This requirement previously read "no session list or per-device detail is shown, since none is available from the account" — a description of a backend gap that has since closed. `GET /api/v1/admin/staff/{id}/sessions` now returns `sessions[]` ("every terminal the staff currently holds, newest first — 0 to `maxConcurrent`") plus a served `maxConcurrent`, and marks the single-session `session` field **`deprecated`**; `POST .../sessions/revoke` now takes an optional `sessionId` (omitted = end every session). The wording above restores Y-13 FR-S002 (L275-281), which required the list and per-device termination all along, and which the Assumptions section below already described building to. See `specs/020-staff-permission-management/tests/cases/TC -【Fitness CRM】- [Y-13][P2-05][ログイン履歴・セッション].md` § "three places where the sources disagree", item A.

- **FR-006**: The session-termination action MUST succeed (and report success) whether or not the staff account currently has a live session — absence of a session is a valid outcome, not an error.
- **FR-007**: Server-side access to a staff account's login-history data and its session-termination action MUST be restricted to Headquarter/System roles, independent of and in addition to the tab being hidden in the UI for other roles.
- **FR-008**: When a staff account has no login-history entries, system MUST show an empty state for the login-history table, consistent with the existing "変更履歴" tab's empty-state pattern.

### Key Entities

- **Login History Entry**: One successful sign-in by a specific staff account — timestamp, authentication method used (Google SSO / IDaaS / マジックリンク), source IP address, user agent string. Failed or locked-out attempts are not recorded and have no representation here.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A headquarters user can determine the method and originating IP of any recorded sign-in for any staff account without leaving that account's detail page.
- **SC-002**: A headquarters user can force-terminate a staff account's CRM session in two actions (trigger the action, confirm), and the account is signed out on its next request.
- **SC-003**: Manager, Staff, Trainer, and Observer users are never shown login-history data or the session-termination action for any staff account, including their own, anywhere in the CRM.
- **SC-004**: Every recorded successful sign-in for a staff account remains available for review (subject to whatever retention the backend enforces; see Assumptions).

## Assumptions

- **The V0 mockup's 成功/失敗/ロック result column has no backend field behind it today** — `GET /api/v1/admin/staff/{id}/login-histories` documents itself as "a usage history, not a security audit log" that records successful sign-ins only, and its response DTO has no `result` field. Per explicit product direction (see `research.md` R2 addendum), the column is nonetheless built now as a forward-compatible optional field defaulted to `success` (成功) whenever absent — the one value guaranteed true for every row the endpoint can currently return — so it renders real 失敗/ロック values with no frontend change once the backend adds them. If product wants failed-attempt/lockout tracking sooner, that still requires a backend change (new data model + endpoint field), independent of this frontend readiness.
- **The multi-device active-session list and its 3-concurrent-session cap are required by Y-13 FR-S002 (L275-281) but not yet implemented server-side** — `GET /api/v1/admin/staff/{id}/sessions` returns a lone `session` object (or `null`) rather than `sessions[]`, and `POST .../sessions/revoke` takes no `sessionId`, so it ends the account's one session rather than a chosen one. The card is built to the requirement — list layout, per-row 強制終了, 3-device footer copy — and adapts the single returned value into a 1-element array at one seam, so the swap to `sessions[]` is a one-line change with no UI rework. Until FR-S002 lands, the cap copy states intended behavior that nothing server-side enforces, and per-row targeting is nominal (there is only ever one row). Card content is real data throughout — the earlier mock-array implementation (`research.md` R1 addendum) was replaced on 2026-09-09 when the read endpoint shipped.
- Account lockout (Y-13 FR-M008) is out of scope for this tab. Note its unlock action —「HQはY-01スタッフ詳細画面からロックを手動解除可能（IDaaS API経由）」(Y-13.md L243) — is **not** built anywhere on this screen either: no unlock endpoint exists under `/api/v1/admin/staff/*`, so it is a backend gap, not a deliberate descope. The deactivate/reactivate controls already on this screen are a different operation (account status, not IDaaS lockout).
- The anomaly-detection notification described in Y-13 FR-M009 ("同一アカウントへの短時間内の大量失敗を検知した場合、HQへ通知する") is a system-level alert delivered outside this screen and is out of scope here — consistent with there being no failed-attempt data for this screen to draw on in the first place.
- 認証方式 display labels (Google SSO / IDaaS / マジックリンク) are a client-side mapping of the backend's `authProvider` values (`google` / `cognito` / `magic_link`); IP address and user agent are captured and returned by the backend as-is, with no client-side derivation.
- Manager is excluded from viewing login history and triggering session termination even for staff within their managed stores — a stricter gate (System/Headquarter only, enforced server-side with a 403) than the manager-scoped-editing pattern used elsewhere on this screen — per the Y-01/Y-13 permission matrices and the real endpoints' own access rules.
