# UI Parity Checklist: First-Time Login (AUTH-01 認証・ログイン)

**Purpose**: Verify the implemented screens reproduce every element and state of the V0 mockups.
**V0 Source**: `dx-fitness/fitness-crm-ui` @ `fe37453ac87722d55f728d3f11d61e58970837af` (2026-07-03) — `src/pages/login-initial.tsx`, `src/pages/login-initial-expired.tsx`, `src/pages/login-initial-success.tsx`, `src/pages/first-time-password-set.tsx`
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Screen: login-initial (初回ログイン)

- [x] PAR001 Card container, centered, fixed width `w-[400px]` — src: src/pages/login-initial.tsx:L40
- [x] PAR002 CardTitle "初回ログイン" — src: src/pages/login-initial.tsx:L42
- [x] PAR003 CardDescription "招待されたメールアドレスでログインしてください" — src: src/pages/login-initial.tsx:L43-45
- [x] PAR004 Google sign-in button — outline variant, full width, Google "G" icon + label "Googleでログイン" — src: src/pages/login-initial.tsx:L49-57
- [N/A] PAR005 "または" divider — separator line / "または" label / separator line — src: src/pages/login-initial.tsx:L58-62 — **superseded**: the real invite/verify response carries a single `authProvider` per staff account (`google` XOR `cognito`), so the built screen renders exactly one of the Google button or the password form, never both — see `contracts/auth-crm.md`. Not applicable to the built screen; do not tick.
- [x] PAR006 Email field — label "メールアドレス", value pre-filled from invite-token verification, `disabled`/read-only styling (muted background, not-allowed cursor) — src: src/pages/login-initial.tsx:L64-73
- [x] PAR007 Temporary-password field — label "仮パスワード", placeholder "仮パスワードを入力", `autoComplete=current-password` — src: src/pages/login-initial.tsx:L74-99
- [x] PAR008 Password visibility toggle (Eye/EyeOff icon button) on the temporary-password field — src: src/pages/login-initial.tsx:L84-97
- [x] PAR009 Submit button "ログイン" (full width) — on success with temporary password, proceeds to the new-password screen — src: src/pages/login-initial.tsx:L100-106
- [x] PAR010 State: incorrect credentials — error message shown, user remains on this screen and can retry — src: src/pages/login-initial.tsx:L100-106 (behavior only; no error UI in static mockup — see spec FR-009)
- [x] PAR011 State: Google sign-in success — proceeds directly to completion screen, skipping the new-password screen — src: src/pages/login-initial.tsx:L49-57 (behavior only; see spec User Story 2)

## Screen: login-initial-expired (招待リンク期限切れ)

- [x] PAR012 Card container, centered, fixed width `w-[400px]` — src: src/pages/login-initial-expired.tsx:L10
- [x] PAR013 Centered status icon — circular badge (`bg-destructive/10`), `AlertCircle` icon (`text-destructive`) — src: src/pages/login-initial-expired.tsx:L12-16
- [x] PAR014 CardTitle "招待リンクの有効期限が切れています" — src: src/pages/login-initial-expired.tsx:L17
- [x] PAR015 CardDescription "本部管理者に再度招待をご依頼ください" — src: src/pages/login-initial-expired.tsx:L18-20
- [x] PAR016 No login form, no CTA button, no retry action rendered on this screen — src: src/pages/login-initial-expired.tsx:L22
- [x] PAR017 State: reachable for all three invalidity causes (expired, already-used, revoked) with this same message — src: src/pages/login-initial-expired.tsx:L17-20 (behavior only; see spec User Story 3)

## Screen: login-initial-success (初回ログイン完了)

- [x] PAR018 Card container, centered, fixed width `w-[400px]` — src: src/pages/login-initial-success.tsx:L12
- [x] PAR019 Centered status icon — circular badge (`bg-success/10`), `CheckCircle` icon (`text-success`) — src: src/pages/login-initial-success.tsx:L14-18
- [x] PAR020 CardTitle "初回ログインが完了しました" — src: src/pages/login-initial-success.tsx:L19
- [x] PAR021 CardDescription "JOYFIT CRM をご利用いただけます" — src: src/pages/login-initial-success.tsx:L20
- [x] PAR022 CTA button "ダッシュボードへ進む" (full width) — proceeds into the main CRM application — src: src/pages/login-initial-success.tsx:L23-29

## Screen: first-time-password-set (パスワードを設定)

- [x] PAR023 Card container, centered, fixed width `w-[400px]` — src: src/pages/first-time-password-set.tsx:L49
- [x] PAR024 CardTitle "パスワードを設定" — src: src/pages/first-time-password-set.tsx:L51
- [x] PAR025 CardDescription "初回ログインでは新しいパスワードの設定が必要です" — src: src/pages/first-time-password-set.tsx:L52-54
- [x] PAR026 New-password field — label "新パスワード", placeholder "新しいパスワードを入力" — src: src/pages/first-time-password-set.tsx:L58-68
- [x] PAR027 Password visibility toggle (Eye/EyeOff icon button) on the new-password field — src: src/pages/first-time-password-set.tsx:L69-82
- [x] PAR028 Requirement checklist — 4 rows in order: "8文字以上", "大文字・小文字を含む", "数字を含む", "記号を含む" — src: src/pages/first-time-password-set.tsx:L87-103
- [x] PAR029 Requirement row state — `Check` icon (`text-success`) when met, `Circle` icon (`text-muted-foreground`) when unmet, per row, updating live as the password is typed — src: src/pages/first-time-password-set.tsx:L94-101
- [x] PAR030 Strength bar — 4 segments in a row, each `h-1 flex-1 rounded-full` — src: src/pages/first-time-password-set.tsx:L106-115
- [x] PAR031 Strength bar color progression — unmet segments `bg-muted`; filled segments colored by total requirements met: 1→`bg-destructive`, 2→`bg-warning`, 3→`bg-info`, 4→`bg-success` — src: src/pages/first-time-password-set.tsx:L23-29,L110-113
- [x] PAR032 Confirm-password field — label "パスワード確認", placeholder "パスワードを再入力" — src: src/pages/first-time-password-set.tsx:L118-128
- [x] PAR033 Password visibility toggle (Eye/EyeOff icon button) on the confirm-password field — src: src/pages/first-time-password-set.tsx:L129-142
- [x] PAR034 State: mismatch error — "パスワードが一致しません" (`text-destructive`), shown only once confirm field is non-empty and differs from the new password — src: src/pages/first-time-password-set.tsx:L144-146
- [x] PAR035 Submit button "パスワードを設定する" (full width) — src: src/pages/first-time-password-set.tsx:L149-156
- [x] PAR036 Submit button disabled state — disabled while any requirement is unmet, passwords don't match, or confirm field is empty; on success proceeds to the completion screen — src: src/pages/first-time-password-set.tsx:L153
