# UI Parity Checklist: Subsequent Login (AUTH-01 認証・ログイン)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` @ `c1c7e2e` (2026-08-05) — `src/pages/login.tsx`
**V0 Source (magic link, added 2026-08-25)**: `dx-fitness/fitness-crm-ui` @ `7e9618b` (2026-08-13) — `src/pages/magic-link-login.tsx`
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Card shell

- [x] PAR001 Card, fixed width `w-[400px]`, centered within the shared auth shell background — src: src/pages/login.tsx:L64-L65
- [x] PAR002 CardHeader — title text "ログイン" (`text-lg`) — src: src/pages/login.tsx:L66-L68

## Alert banners (mutually exclusive by variant/state)

- [x] PAR003 Session-expired alert — info style (`border-info/50 bg-info/15`), `Info` icon, copy "セッションの有効期限が切れました。再度ログインしてください。" — shown only when arriving in the session-expired state — src: src/pages/login.tsx:L70-L78
- [x] PAR004 Account-locked alert — destructive style, `ShieldAlert` icon, copy "アカウントが一時的にロックされています。しばらく待ってからもう一度お試しください（最大で約15分）。" (copy changed from the mockup per Y-13 Bug-07) — shown only when the account is locked — src: src/pages/login.tsx:L79-L87
- [x] PAR005 Account-not-registered alert — destructive style, `UserX` icon, copy "CRMに登録されていないアカウントです。管理者にお問い合わせください。" — shown when the authenticated identity has no active staff record — src: src/pages/login.tsx:L88-L96
- [x] PAR006 Incorrect-credentials alert — destructive style (no icon), copy "メールアドレスまたはパスワードが正しくありません。" — shown after a failed email/password attempt — src: src/pages/login.tsx:L97-L104

## Google sign-in

- [x] PAR007 "Googleでログイン" button — outline variant, large size, full width, Google "G" logo (multi-path SVG) + label, disabled while the account-locked state is active — src: src/pages/login.tsx:L105-L115
- [x] PAR008 Divider row — two flex-1 separators around a centered "または" label — src: src/pages/login.tsx:L116-L120

## Email/password form

- [x] PAR009 Email field — label "メールアドレス", `type=email`, placeholder "example@joyfit.co.jp", `autoComplete=email`, disabled while account-locked — src: src/pages/login.tsx:L121-L132
- [x] PAR010 Password field — label "パスワード", `autoComplete=current-password`, placeholder "パスワードを入力", disabled while account-locked — src: src/pages/login.tsx:L133-L145
- [x] PAR011 Password show/hide toggle — ghost icon button overlaid at the field's right edge, swaps `Eye`/`EyeOff` icon, not part of tab order (`tabIndex=-1`) — src: src/pages/login.tsx:L146-L159
- [x] PAR012 "ログイン" submit button — full width, large size, disabled while account-locked — src: src/pages/login.tsx:L162-L164

## Footer links

- [x] PAR013 "パスワードをお忘れの方" link-style button — src: src/pages/login.tsx:L167-L173
- [x] PAR014 "マジックリンクでログイン" link-style button — src: src/pages/login.tsx:L174-L181

## マジックリンクでログイン screen — card shell (`magic-link-login.tsx`)

- [x] PAR015 Screen reachable from the login page's "マジックリンクでログイン" link (PAR014) — src: src/pages/magic-link-login.tsx:L106
- [x] PAR016 Card, fixed width `w-[400px]`, centered within the same shared auth shell background as the login card — src: src/pages/magic-link-login.tsx:L39-L40
- [x] PAR017 CardHeader — title "マジックリンクでログイン" (`text-lg`) + description "登録済みのメールアドレスを入力してください" — src: src/pages/magic-link-login.tsx:L41-L46

## マジックリンクでログイン — request state (form not yet submitted)

- [x] PAR018 Email field — label "メールアドレス", `type=email`, placeholder "example@joyfit.co.jp", `autoComplete=email` — src: src/pages/magic-link-login.tsx:L50-L60
- [x] PAR019 Email field invalid state — field marked invalid (`aria-invalid`) with destructive-styled message "正しいメールアドレスを入力してください" below it, shown only after a failed send attempt — src: src/pages/magic-link-login.tsx:L59-L65
- [x] PAR020 "ログインリンクを送信" primary button — full width — src: src/pages/magic-link-login.tsx:L67-L69
- [x] PAR021 Explanatory micro-copy below the button — `text-xs text-muted-foreground`, verbatim "パスワードを使わずにログインできます。経路②（メール認証）のスタッフ向けの機能です。" — src: src/pages/magic-link-login.tsx:L70-L73

## マジックリンクでログイン — sent state (replaces the form in-place)

- [x] PAR022 Success icon block — centered `CheckCircle` (`size-8 text-success`) inside a rounded-full `bg-success/10` badge — src: src/pages/magic-link-login.tsx:L77-L81
- [x] PAR023 Confirmation heading — medium-weight "マジックリンクを送信しました" — src: src/pages/magic-link-login.tsx:L83
- [x] PAR024 Confirmation sub-line — `text-sm text-muted-foreground`, echoes the submitted address: "{email} 宛にログインリンクを送信しました" — src: src/pages/magic-link-login.tsx:L84-L86
- [x] PAR025 Validity note — `text-xs text-muted-foreground`, verbatim "メール内のリンクは15分間有効・1回のみ使用できます" — src: src/pages/magic-link-login.tsx:L87-L89
- [x] PAR026 "メールを再送信" button — outline variant, small size — src: src/pages/magic-link-login.tsx:L91-L98
- [x] PAR027 Resend cooldown state — button disabled while the countdown runs and its label becomes "メールを再送信 (N秒)", counting down once per second from 60 to 0, then reverting to the plain label and re-enabling — src: src/pages/magic-link-login.tsx:L13-L20,L30,L95-L97
- [x] PAR028 Sent state is entered only on a valid address; an invalid address keeps the form visible with PAR019 and never shows the sent state — src: src/pages/magic-link-login.tsx:L22-L31

## マジックリンクでログイン — footer

- [x] PAR029 "ログインに戻る" link-style button, centered in the CardFooter, present in BOTH the request state and the sent state — src: src/pages/magic-link-login.tsx:L102-L110

## Notes on scope vs. V0

- The V0 mockup's "ログイン" submit navigates to a `mfa-verify` mock screen; per `spec.md` Assumptions, MFA has no real-API backing yet and is out of scope — PAR012's _disabled state_ and _field set_ are in scope for parity, but the post-submit MFA hop is not.
- PAR013 is a parity item for the **visual element only** (button renders with the correct label and position) — per `spec.md` Assumptions, wiring its destination (password reset, `specs/029-password-reset/`) is out of scope for this feature.
- PAR014 was previously visual-only for the same reason; as of the 2026-08-25 amendment its destination **is** in scope, and PAR015 covers the navigation actually working.
- The V0 magic-link mockup has no screen for _opening_ a received link — it ends at the sent state. The link-opening outcomes are specified in `spec.md` FR-018 to FR-020 and carry no parity items because V0 has nothing to compare against. Of the two failure outcomes, the deactivated-account one reuses the existing PAR005 banner; the invalid/expired/used one is a **new** destructive banner on `/login` with no V0 counterpart (`research.md` R14), styled to match PAR004–PAR006. Its absence from this checklist is deliberate — do not log it as a parity miss in either direction.
- PAR027's 60-second cooldown is the V0 mockup's own value; `spec.md` treats the exact duration as an anti-abuse affordance rather than a requirement-spec rule, but parity is checked against the mockup's 60 seconds.
