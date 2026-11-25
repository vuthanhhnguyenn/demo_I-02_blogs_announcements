# UI Parity Checklist: Staff Detail — Login History Tab

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup. One item — the "保持期間1年間" footer copy — remains descoped (see bottom section): it would require stating a retention period the frontend cannot verify. The 結果 column was initially descoped for lacking real backend data (no `result` field) and is built as a forward-compatible optional field defaulted to 成功 until the backend sends a real value (see `research.md` R2 addendum). The "アクティブセッション" card shipped first against local mock data (per `research.md` R1 addendum) and is now wired to the real `GET /admin/staff/{id}/sessions` endpoint (2026-09-09); its V0 list layout is kept intact because Y-13 FR-S002 requires it — see the "Active Sessions Card" section below.
**V0 Source**: `.cache/fitness-crm-ui/src/pages/staff-detail.tsx` @ `1bad949` (2026-09-03) — tab introduced in `c1c7e2e` (2026-08-05), as recorded in spec.md header.
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy (adjusted per the descope notes where applicable).

## Tab Bar

- [ ] PAR001 Third tab trigger "ログイン履歴", rendered only when the viewer's role is Headquarter/System — src: staff-detail.tsx:259-261
- [ ] PAR002 Tab bar order: 基本情報, 変更履歴, ログイン履歴 (login-history last, conditionally present) — src: staff-detail.tsx:257-261

## Active Sessions Card (real API — `GET /admin/staff/{id}/sessions`)

The V0's list layout stands: **Y-13 FR-S002 requires it** (「同時ログイン上限: 3デバイス」,
「上限超過時: 最も古いセッションを強制失効」, 「Y-01スタッフ詳細画面でアクティブセッション一覧を
表示し、個別にセッションを強制終了可能（HQ権限）」 — fitness-spec @ `89c2c79`, Y-13.md L275-281).

**2026-09-16: the backend shipped FR-S002.** The schema now carries `sessions[]` (every live
terminal, newest first), `maxConcurrent` (the limit auth-svc actually enforces, via
`CRM_MAX_CONCURRENT_SESSIONS`), `lastSeenAt` per session (the real 最終アクティブ, refreshed at
most once a minute), and an optional `sessionId` on the revoke body for per-row targeting. The
card now reads all four directly — the 1-element `session` adapter, the hard-coded 「3デバイス」
footer, and the account-wide revoke are all gone. `session` (singular) remains in the schema but
is `@deprecated` and is no longer read.

- [ ] PAR021 "アクティブセッション" card title, rendered above the login-history table — src: staff-detail.tsx:412-416
- [ ] PAR025 Per-row device icon (Monitor/Smartphone, derived from the `userAgent` string — the real session carries no `deviceType` field), device label, "現在のセッション" badge on rows where `isCurrent` — src: staff-detail.tsx:419-434
- [ ] PAR026 Per-row IP + 最終アクティブ text (from `ipAddress` / `lastSeenAt`, falling back to `loggedInAt` → `createdAt` for sessions opened before `lastSeenAt` was recorded), tabular-nums — src: staff-detail.tsx:436-438 (adjusted: real fields, may render "不明なIP"/"不明")
- [ ] PAR027 Per-row "強制終了" button on non-current rows; "終了しました" label after confirm; no action on the current row; empty-state copy "現在ログイン中のセッションはありません。" when the list is empty — src: staff-detail.tsx:440-452 (adjusted: empty state is new — the mock array was never empty, the real endpoint often is)
- [ ] PAR028 Footer note: device cap + oldest-session auto-eviction copy, with the cap read from the response's `maxConcurrent` rather than hard-coded, and the whole line hidden until it loads — src: staff-detail.tsx:457-459 (adjusted 2026-09-16: served by BE so the copy cannot drift from the enforced limit)
- [ ] PAR022 Confirmation dialog names the specific device + IP being terminated — src: staff-detail.tsx:565-567
- [ ] PAR023 Actions: "キャンセル" / destructive "強制終了する" — src: staff-detail.tsx:571-582
- [ ] PAR024 Confirming calls the real `sessions/revoke` mutation with `body: { sessionId }` so only the chosen terminal is ended, marks the row "終了しました", and invalidates the active-session query so the list re-reads from the server — src: staff-detail.tsx L556-585 (adjusted 2026-09-16: per-row targeting landed with FR-S002; omitting the body would end every session the staff holds, which this screen deliberately does not do)

## Login History Tab — Login History Table

- [ ] PAR013 Table columns in order: 日時 / 認証方式 / 結果 / IPアドレス / ユーザーエージェント — src: staff-detail.tsx:468-472
- [ ] PAR014 日時 cell: muted small text, formatted from `loggedInAt` — src: staff-detail.tsx:478 (adjusted: real field is `loggedInAt`, not a pre-formatted string)
- [ ] PAR015 認証方式 cell: plain text value, mapped from backend `authProvider` (`google`→"Google SSO", `cognito`→"IDaaS", `magic_link`→"マジックリンク") — src: staff-detail.tsx:479 (adjusted: label mapping is new, values come from the real field)
- [ ] PAR016 結果 cell: color-coded outline badge (成功/失敗/ロック), defaulted to 成功 when the backend doesn't yet return `result` — src: staff-detail.tsx:480-484 (adjusted: frontend-declared field, backend-pending — see data-model.md)
- [ ] PAR017 IPアドレス cell: muted tabular-nums text, from `ipAddress` — src: staff-detail.tsx:485
- [ ] PAR018 ユーザーエージェント cell: muted text truncated with `max-w-xs truncate`, full string in `title` tooltip, from `userAgent` — src: staff-detail.tsx:486-488
- [ ] PAR019 Rows ordered newest-first (as returned by the API; no client-side re-sort) — src: staff-detail.tsx:110-117 (adjusted)
- [ ] PAR020 Footer: total entry count from `pagination.totalItems`, shown via the shared `TablePaginationWithSize` component (drop the "保持期間1年間" clause — not a value the API returns; see descope note) — src: staff-detail.tsx:494 (adjusted)

## Descoped — no backend support (informational only, not implement-gating)

These V0 elements are intentionally NOT being built against real data, with no forward-compatible placeholder either. Do not re-add these as checkbox items unless a backend change actually introduces the missing data:

- "保持期間1年間" retention copy — src: staff-detail.tsx:494 — not a value returned by the API. Note this is a **backend gap, not a spec gap**: Y-13 FR-M009 does state 「ログ保持期間: 1年間」 (Y-13.md L253); the endpoint simply doesn't expose it, so the frontend cannot assert it.

## Known backend gaps (Y-13 requirements the API does not yet satisfy)

Raised with BE 2026-09-10. These are **not** descopes and **not** requirement changes — the frontend
builds to the spec and adapts to what the API currently returns. Sources: fitness-spec @ `89c2c79`,
`crm/requirements/Y-13.md`.

- ~~**FR-S002 同時ログイン制御 (Should, L275-281)**~~ — **closed 2026-09-16.** The API now serves `sessions[]` + `maxConcurrent` and accepts `sessionId` on `POST /sessions/revoke`; the card is wired to all three (see PAR024/PAR026/PAR028). Oldest-session auto-eviction is enforced server-side and is not observable from this screen beyond the list shrinking.
- **FR-M009 記録項目 (Must, L250)** — still open as of the 2026-09-16 schema. Spec: 結果（成功 / 失敗 / ロック）over 全ログイン試行. API: `StaffLoginHistoryItemDto` has no `result` field and records successful sign-ins only, self-describing as "a usage history, not a security audit log" — which contradicts FR-M009's own title (監査ログ) and stated goal (セキュリティ監査要件を充足する). Handled by PAR016's forward-compatible optional field.
- **FR-M009 異常検知 (Must, L254)** — HQ notification on burst login failures; impossible while failures are not recorded.
- **FR-M008 ロック手動解除 (Must, L243)** — still open as of the 2026-09-16 schema. 「HQはY-01スタッフ詳細画面からロックを手動解除可能」 has no endpoint (`/api/v1/admin/staff/*` exposes no unlock route), so no UI is built for it.
