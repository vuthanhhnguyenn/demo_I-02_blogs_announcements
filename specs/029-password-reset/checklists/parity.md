# UI Parity Checklist: Forgot Password (Password Reset)

**Purpose**: Verify the implemented screens reproduce every element and state of the V0 mockups.
**V0 Source**: `dx-fitness/fitness-crm-ui` @ `c1c7e2e` (2026-08-05) — `src/pages/password-reset.tsx`, `src/pages/password-set.tsx`; `login.tsx` referenced only for the entry-point link (see Notes)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## password-reset.tsx — request form state

- [x] PAR001 Card, fixed width `w-[400px]`, centered within the shared auth shell background — src: src/pages/password-reset.tsx:L40-L40
- [x] PAR002 CardHeader — title "パスワードの再設定" (`text-lg`) + description "登録済みのメールアドレスを入力してください" — src: src/pages/password-reset.tsx:L41-L46
- [x] PAR003 Email field — label "メールアドレス", `type=email`, placeholder "example@joyfit.co.jp", `autoComplete=email`, `aria-invalid` bound to the validation-error state — src: src/pages/password-reset.tsx:L50-L60
- [x] PAR004 Inline validation error — "正しいメールアドレスを入力してください" (`text-destructive`), shown only after an invalid submission attempt — src: src/pages/password-reset.tsx:L61-L65
- [x] PAR005 "リセットリンクを送信" submit button — full width — src: src/pages/password-reset.tsx:L67-L69
- [x] PAR006 Persistent Google-SSO guidance note (`text-xs text-muted-foreground`) — "Googleアカウント（直営店など）でログインしている方は、パスワードは google.com から変更してください。" — always visible in the request-form state — src: src/pages/password-reset.tsx:L70-L74

## password-reset.tsx — sent/confirmation state

- [x] PAR007 Success icon — circular `bg-success/10` badge containing a `CheckCircle` icon — src: src/pages/password-reset.tsx:L78-L82
- [x] PAR008 Confirmation copy — "メールを送信しました" (medium weight) + "{email} 宛にリセットリンクを送信しました" (muted, interpolating the submitted address) — src: src/pages/password-reset.tsx:L83-L88
- [x] PAR009 "メールを再送信" button — outline, small size; label becomes "メールを再送信 (N秒)" and the button is disabled while a 60-second cooldown counts down, re-enabling with the plain label at zero — src: src/pages/password-reset.tsx:L89-L96

## password-reset.tsx — shared footer

- [x] PAR010 "ログインに戻る" link-style button, centered footer, navigates back to the login screen — src: src/pages/password-reset.tsx:L100-L107

## password-set.tsx — default (set-new-password) state

- [x] PAR011 Card, fixed width `w-[400px]` — src: src/pages/password-set.tsx:L111-L111
- [x] PAR012 CardHeader — title "新しいパスワードを設定" + description "安全なパスワードを設定してください" — src: src/pages/password-set.tsx:L112-L115
- [x] PAR013 New-password field — label "新しいパスワード", placeholder "パスワードを入力", show/hide toggle (ghost icon button, `Eye`/`EyeOff`, `tabIndex=-1`) overlaid at the field's right edge — src: src/pages/password-set.tsx:L118-L144
- [ ] PAR014 Live policy checklist, exactly 3 rows in this order: "8文字以上", "大文字・小文字を含む", "数字を含む" — each row shows a `Check` icon (success color) when satisfied or a `Circle` icon (muted) when not, updating on every keystroke — src: src/pages/password-set.tsx:L146-L162
- [ ] PAR015 Strength bar — 3 equal-width segments, each filled (`bg-muted`→destructive/warning/success by satisfied-rule count) once the running satisfied-rule count reaches its index — src: src/pages/password-set.tsx:L164-L174
- [x] PAR016 Confirm-password field — label "パスワード確認", placeholder "パスワードを再入力", same show/hide toggle pattern as PAR013 — src: src/pages/password-set.tsx:L177-L202
- [x] PAR017 Mismatch message — "パスワードが一致しません" (`text-xs text-destructive`), shown only once the confirm field is non-empty and differs from the new password — src: src/pages/password-set.tsx:L203-L205
- [x] PAR018 "パスワードを設定する" submit button — full width, large size; disabled unless every policy rule is satisfied AND confirm is non-empty AND matches the new password — src: src/pages/password-set.tsx:L208-L215

## password-set.tsx — expired/invalid-link state (`variant="expired"`)

- [x] PAR019 Destructive icon badge — circular `bg-destructive/10` containing an `AlertCircle` icon — src: src/pages/password-set.tsx:L59-L63
- [x] PAR020 Copy — title "リンクが無効または期限切れです" + description "パスワードリセットリンクの有効期限が切れているか、すでに使用済みです。" — src: src/pages/password-set.tsx:L64-L69
- [x] PAR021 "パスワードリセットをやり直す" outline button, navigates to the password-reset request screen — src: src/pages/password-set.tsx:L71-L75

## password-set.tsx — success/done state

- [x] PAR022 Success icon badge — circular `bg-success/10` containing a `CheckCircle` icon — src: src/pages/password-set.tsx:L87-L91
- [x] PAR023 Copy — title "パスワードを設定しました" + description "新しいパスワードでログインできます。" — src: src/pages/password-set.tsx:L92-L97
- [x] PAR024 "ログイン画面へ" full-width button, navigates to the login screen — src: src/pages/password-set.tsx:L100-L102

## Known divergence — PAR014 / PAR015 intentionally left unchecked

The built screen renders **4** checklist rows/strength segments ("8文字以上", "大文字・小文字を含む", "数字を含む", **"記号を含む"**), not the 3 shown in `password-set.tsx`. This is the shared `PasswordSetForm` component (`src/components/common/auth/password-set-form.tsx`), reused as-is per `research.md` R5 because its 4-rule policy matches the real Cognito User Pool's password policy — trimming it to 3 rows to match V0 would let a client-"valid" password still fail server-side with `InvalidPasswordException`. This is a deliberate, documented trade-off (correctness over literal V0 row-count), not an oversight — left unchecked here rather than ticked dishonestly. Flagged to the user for a call on whether to accept the divergence or revisit it.

## Notes on scope vs. V0 and vs. `specs/028-subsequent-login/`

- `login.tsx`'s "パスワードをお忘れの方" link itself (its rendering, label, and position) is already a tracked parity item — `PAR013` in `specs/028-subsequent-login/checklists/parity.md` — which that feature explicitly left as visual-only, deferring the actual navigation wiring to this feature. This feature's job is to make that existing link navigate to the `password-reset.tsx` screen (PAR001 above); it does not re-track the link's own visual parity to avoid double-booking the same checkbox across two specs.
- The V0 mockup's MFA-adjacent screens and `mfa-verify` navigation are unrelated to this flow and are not covered here.
