# UI Parity Checklist: Member Form Management (会員情報を編集)

**Purpose**: Verify the implemented screen reproduces every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` `src/pages/member-form.tsx` @ `426a9b3` (as recorded in spec.md header)
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.

## Shell & Page Header

- [x] PAR001 Global sidebar rendered with the member-management section marked as current — `currentPage="member-form"` — src: member-form.tsx:L138
- [x] PAR002 Global header rendered above the page content — src: member-form.tsx:L140
- [x] PAR003 Page body is a single scroll region; the shell itself does not scroll (viewport-height container, overflow hidden) — src: member-form.tsx:L139, L150
- [x] PAR004 Page header rendered outside the scroll region (`outside` variant) — src: member-form.tsx:L142-L143
- [x] PAR005 Back link in the page header, label verbatim 「会員管理に戻る」 — src: member-form.tsx:L145
- [x] PAR006 Back link click runs the unsaved-changes guard, then navigates to the member list — src: member-form.tsx:L145
- [x] PAR007 Page title verbatim 「会員情報を編集」 — src: member-form.tsx:L79, L147
- [x] PAR008 Form column centred with a max width of 960px, vertical gap between card and footer — src: member-form.tsx:L152

## Card 「個人情報」

- [x] PAR009 Exactly one section card on the page; card title verbatim 「個人情報」, semibold, base size — src: member-form.tsx:L154-L156
- [x] PAR010 Card content is a single vertical stack with uniform gaps between field rows — src: member-form.tsx:L158-L159
- [x] PAR011 Field order top-to-bottom: 氏名（姓）→ 氏名（名）→ フリガナ（姓）→ フリガナ（名）→ 生年月日 → 性別 → 郵便番号 → 住所 → 電話番号 → メールアドレス — src: member-form.tsx:L161-L262
- [x] PAR012 No 会員種別 field anywhere on the form (A-01 FR-004 編集対象外) — src: member-form.tsx:L154-L265
- [x] PAR013 No 所属店舗 / 店舗 field anywhere on the form (A-01 FR-004 編集対象外) — src: member-form.tsx:L154-L265

### Field-marker rendering

- [x] PAR014 Required fields show the shared required marker (red `*`) immediately after the label text — src: member-form.tsx:L66-L69, field-marker.tsx
- [x] PAR015 郵便番号 and 住所 render **no** marker at all — neither required nor 任意 — src: member-form.tsx:L225, L235 _(amended 2026-09-22: superseded upstream — prototype `0a73739` marks 郵便番号 / 都道府県 / 市町村・番地 required and gives 建物名 the 任意 marker; the shipped screen follows it per FR-010)_ _(amended 2026-10-08: 建物名 is now required too and carries the required marker, not 任意 — QA bug, FR-010.)_ _(amended 2026-11-23 — Bug-No1: reverted; 建物名 is optional again and carries the shared 任意 marker, FR-010 / FR-017. Re-verify.)_
- [x] PAR016 Each field renders label → control → (when invalid) destructive message beneath the control — src: member-form.tsx:L64-L74

### Row 1 — 氏名 (2-column)

- [x] PAR017 氏名（姓） text input, required marker, placeholder 「例: 山田」 — src: member-form.tsx:L162-L169
- [x] PAR018 氏名（名） text input, required marker, placeholder 「例: 太郎」 — src: member-form.tsx:L170-L177
- [x] PAR019 The two 氏名 fields sit side by side in a 2-column grid with equal widths — src: member-form.tsx:L161

### Row 2 — フリガナ (2-column)

- [x] PAR020 フリガナ（姓） text input, required marker, placeholder 「例: ヤマダ」 — src: member-form.tsx:L182-L189
- [x] PAR021 フリガナ（名） text input, required marker, placeholder 「例: タロウ」 — src: member-form.tsx:L190-L197
- [x] PAR022 The two フリガナ fields sit side by side in a 2-column grid — src: member-form.tsx:L181

### Row 3 — 生年月日 / 性別 (2-column)

- [x] PAR023 生年月日 uses the shared date picker, required marker, placeholder 「日付を選択」 — src: member-form.tsx:L202-L208
- [x] PAR024 性別 is a single-select, required marker, trigger placeholder 「選択してください」 — src: member-form.tsx:L209-L213
- [x] PAR025 性別 options, in order: 男性 / 女性 / その他 / 回答しない — exactly four, no more — src: member-form.tsx:L215-L218
- [x] PAR026 生年月日 and 性別 sit side by side in a 2-column grid — src: member-form.tsx:L201

### Row 4 — 郵便番号 (full-width row)

- [x] PAR027 郵便番号 occupies its own full-width row (not paired) — src: member-form.tsx:L225 _(amended 2026-09-23: still its own row, but the input is narrow — measured 200px at x=389 — not full-width; FR-008 describes it this way and the screen matches.)_
- [x] PAR028 郵便番号 input is constrained to a narrow fixed width (200px), not full-bleed — src: member-form.tsx:L228
- [x] PAR029 郵便番号 placeholder 「例: 150-0001」 — src: member-form.tsx:L227

### Row 5 — 住所 (full-width row)

- [x] PAR030 住所 occupies its own full-width row with a full-width input — src: member-form.tsx:L235-L241 _(amended 2026-09-23: superseded by the 2026-09-04 address split — the single 住所 box is now 市町村・番地 and 建物名, each on its own full-width row. Verified at 1024×768 and 1400×900.)_
- [x] PAR031 住所 placeholder 「例: 東京都渋谷区神宮前1-1-1」 — src: member-form.tsx:L237 _(amended 2026-09-23: superseded by the split — the live placeholders are 「例: 渋谷区神宮前1-1-1」 on 市町村・番地 and 「例: 神宮前ビル 3F」 on 建物名, both verbatim per FR-011.)_

### Row 6 — 電話番号 / メールアドレス (2-column)

- [x] PAR032 電話番号 text input, required marker, placeholder 「例: 090-1234-5678」 — src: member-form.tsx:L245-L251
- [x] PAR033 メールアドレス input with email type, required marker, placeholder 「例: yamada@example.com」 — src: member-form.tsx:L253-L260
- [x] PAR034 電話番号 and メールアドレス sit side by side in a 2-column grid — src: member-form.tsx:L244

## Footer action bar

- [x] PAR035 Footer row separated by a top border, actions right-aligned with a small gap — src: member-form.tsx:L268
- [x] PAR036 「キャンセル」 button — outline variant, large size, left of the primary action — src: member-form.tsx:L272-L274
- [x] PAR037 「保存する」 button — primary variant, large size, rightmost — src: member-form.tsx:L275-L277 _(deviation per spec Clarifications 2026-07-28: disabled until the form is dirty, superseding V0's always-enabled button)_
- [x] PAR038 Failed-submit summary 「未入力の項目があります」 rendered destructive, extra-small, pushed to the far left of the same footer row — src: member-form.tsx:L269-L271
- [x] PAR039 The summary is hidden until a submit has failed — src: member-form.tsx:L269

## Validation states

- [x] PAR040 Validation runs only on 「保存する」 — not on blur, not on change — src: member-form.tsx:L112-L115
- [x] PAR041 氏名（姓） blank → message 「氏名（姓）を入力してください」 — src: member-form.tsx:L101
- [x] PAR042 氏名（名） blank → message 「氏名（名）を入力してください」 — src: member-form.tsx:L102
- [x] PAR043 フリガナ（姓） blank → message 「フリガナ（姓）を入力してください」 — src: member-form.tsx:L103
- [x] PAR044 フリガナ（名） blank → message 「フリガナ（名）を入力してください」 — src: member-form.tsx:L104
- [x] PAR045 生年月日 blank → message 「生年月日を入力してください」 — src: member-form.tsx:L105
- [x] PAR046 性別 blank → message 「性別を選択してください」 — src: member-form.tsx:L106
- [x] PAR047 電話番号 blank → message 「電話番号を入力してください」 — src: member-form.tsx:L107
- [x] PAR048 メールアドレス blank → message 「メールアドレスを入力してください」 — src: member-form.tsx:L108
- [x] PAR049 Whitespace-only input counts as blank for all text fields — src: member-form.tsx:L101-L108
- [x] PAR050 郵便番号 and 住所 are never validated; a blank value submits successfully — src: member-form.tsx:L99-L109 _(amended per spec FR-016a/FR-017, 2026-07-28: blank still submits, but a NON-blank 郵便番号 must match the 7-digit format; format rules also apply to kana/phone/email — verified in-browser. Further amended 2026-09-22: superseded upstream — prototype `0a73739` rejects blank 郵便番号 / 都道府県 / 市町村・番地; only 建物名 still submits blank — FR-016, FR-017)_ _(amended 2026-09-23: **no longer true** — the PO settled B5 in favour of prototype `0a73739`, so 郵便番号 / 都道府県 / 市町村・番地 are required and a blank value is refused with its own message. 建物名 was then the one address control a blank still submitted. Verified live; see TC-010, TC-078, TC-087.)_ _(amended 2026-10-08: **no longer true for 建物名** — a blank 建物名 is refused with 「建物名を入力してください」 like the other address fields, FR-016/FR-017.)_ _(amended 2026-11-23 — Bug-No1: reverted; a blank 建物名 submits again (a cleared stored value is sent as `null`), FR-016/FR-017. Re-verify.)_
- [x] PAR051 Invalid controls are flagged `aria-invalid` (text inputs and the 性別 trigger) — src: member-form.tsx:L167, L175, L187, L195, L211, L250, L259
- [x] PAR052 On failed submit the first invalid control is scrolled into the centre of the viewport (smooth) — src: member-form.tsx:L117-L122
- [x] PAR053 Typing a non-blank value into a flagged text field clears that field's message immediately — src: member-form.tsx:L166, L174, L186, L194, L249, L258
- [x] PAR054 Choosing a date clears the 生年月日 message — src: member-form.tsx:L205
- [x] PAR054a 生年月日 below the brand minimum age (JOYFIT 15 / FIT365 16) → 「{n}歳未満の方はご利用できません」 under the field, save blocked — **not in V0**; added per spec FR-016b (2026-10-15), copy follows the member app
- [x] PAR055 Choosing any 性別 value clears the 性別 message — src: member-form.tsx:L210
- [x] PAR056 Clearing individual field messages does **not** clear the footer summary (it persists until the next submit) — src: member-form.tsx:L117, L126

## Save flow

- [x] PAR057 A valid submit clears all field messages and the footer summary — src: member-form.tsx:L125-L126
- [x] PAR058 A valid submit clears the dirty flag before navigating — src: member-form.tsx:L127
- [x] PAR059 A valid submit shows the success toast 「会員情報を更新しました」 — src: member-form.tsx:L128 _(V0 copy 「会員を登録しました」 superseded per spec Q2 resolution)_
- [x] PAR060 A valid submit navigates to the edited member's detail screen — src: member-form.tsx:L129 _(V0's member-list destination superseded per spec Q2 resolution)_

## Unsaved-changes guard

- [x] PAR061 Any change to any field marks the form dirty — src: member-form.tsx:L132-L134, L166-L258
- [x] PAR062 「キャンセル」 while clean navigates to the member list with no dialog — src: member-form.tsx:L272, use-unsaved-changes.ts
- [x] PAR063 「キャンセル」 while dirty opens the discard dialog instead of navigating — src: member-form.tsx:L272, use-unsaved-changes.ts
- [x] PAR064 Back link while dirty opens the same discard dialog — src: member-form.tsx:L145
- [x] PAR065 Browser close/reload while dirty triggers the native leave-confirmation — src: use-unsaved-changes.ts (`beforeunload`)

## Discard dialog

- [x] PAR066 Modal alert dialog, opens only when discard is pending — src: member-form.tsx:L284-L285
- [x] PAR067 Title verbatim 「変更を破棄しますか？」 — src: member-form.tsx:L287
- [x] PAR068 Description verbatim 「未保存の変更はすべて失われます。この操作は取り消せません。」 — src: member-form.tsx:L288-L290
- [x] PAR069 Cancel action labelled 「編集を続ける」 — closes the dialog, drops the pending navigation, keeps all edits — src: member-form.tsx:L293
- [x] PAR070 Confirm action labelled 「破棄する」 — closes the dialog, clears dirty, runs the pending navigation — src: member-form.tsx:L294
- [x] PAR071 Dismissing the dialog (overlay / Esc) behaves as 「編集を続ける」 — src: member-form.tsx:L284
- [x] PAR072 The form stays mounted behind the dialog with all entered values intact — src: member-form.tsx:L284-L297

## Entry points (role-gated, outside this page)

- [x] PAR073 Member list row menu shows an 「編集」 item with a pencil icon, gated to Headquarter / System only — src: member-list.tsx:L986-L994
- [x] PAR074 Member detail header shows an 「編集」 button with a pencil icon, gated to Headquarter / System only, and hidden entirely when the member is 退会済み — src: member-detail.tsx:L2941-L2946
  > Gating note (verified 2026-07-28): V0's own `RoleGatedButton`/`RoleGatedMenuItem` render the affordance **disabled with a deny tooltip** for non-permitted roles (role-gated-button.tsx L71-L80) — not hidden. The project reproduces exactly that convention via `Permission.MembersEdit` (System/HQ only); the withdrawn-member case hides the button entirely, as in V0.

## States absent from V0 (implement per spec Q&A, then tick)

- [x] PAR075 Loading state while the member is fetched — shared data-state boundary replaces the form, no partial render — **not in V0**; added per spec Q6 / FR-029
- [x] PAR076 Error state when the member fetch fails — shared data-state boundary with a retry action replaces the form — **not in V0**; added per spec Q6 / FR-030
- [x] PAR077 Save-failure feedback — error toast, operator stays on the form, entered values intact, form still dirty, no navigation — **not in V0**; added per spec Q6 / FR-031
- [x] PAR078 Page-level role gate — non-HQ/System direct URL access renders a permission-denied state instead of the form — **not in V0**; added per spec Q9 / FR-032
- [x] PAR079 Withdrawn-member block — direct URL access for a 退会済み / 強制退会 member renders 「退会済みの会員は編集できません」 with 再入会 guidance and a return-to-detail action — **not in V0**; added per spec Q7 / FR-033
