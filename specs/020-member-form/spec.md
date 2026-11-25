# Feature Specification: Member Form Management (会員情報を編集)

**Feature Branch**: `020-member-form`
**Created**: 2026-07-28
**Status**: Draft
**Screen ID**: `member-form` — under **A-01** 会員管理 (FR-004, A-01-01-a 会員情報【ヘッドアップ】)
**PO Spec**: `A-01` — 会員管理（一覧） v260624*v4 — `crm/requirements/A-01.md` @ `89448e0` (identical copy at `.cache/fitness-crm-ui/public/requirements/A-01.md` @ `426a9b3`)
**UI Source**: dx-fitness/fitness-crm-ui `src/pages/member-form.tsx` @ `426a9b3`
**API Design**: fitness-dx CRM API `0.8.0` — <https://all-docs.dn30t5gp2gjp.amplifyapp.com/crm/> (tags \_Member Management*, _Member Relations History_)
**Phase**: Phase 1 only (A-01 is Phase 1 per `Phase-Scope.md`; no Phase-2 element exists on this screen)
**Input**: User description: "Create spec for screen A-01 (Member form Management). Phase 1 only." _(the original brief also said 「History = seed only」; that restriction was lifted on 2026-09-21 once the screen moved onto the real backend — see the 2026-09-21 clarification and FR-028.)_

---

## Overview

`member-form` is the standalone **member personal-information edit form** required by A-01 **FR-004**. A-01 states that personal information (name, address, contact details) may only be changed by the member themselves (mobile app) or by **Headquarter / System**; store roles see the head-up profile as read-only. To keep that rule enforceable, the edit UI is deliberately **not** embedded in the member detail head-up — it is a separate screen reachable only from role-gated entry points.

The screen presents a single **個人情報 (Personal Information)** card holding exactly the eight editable attribute groups A-01 FR-004 permits, validates them on submit, guards against accidental loss of unsaved edits, and returns the user to the edited member's detail screen on success.

**Explicitly excluded by FR-004**: 会員種別 (member type) — changed through main-contract change (FR-006) — and 所属店舗 (primary store) — changed through transfer (A-02). These must not appear on this form.

---

## Clarifications

### Session 2026-07-28

- Q: Where the UI prototype and the published API design disagree, which one is authoritative? → A: **The prototype wins.** Build the screen exactly as `member-form.tsx` renders it; the API design is adapted to the prototype, not the other way round. This resolves Q4 (field set = FR-004's eight fields only), Q11 (single free-text 住所 box), Q12 (性別 keeps all four options including 回答しない) — and, by the same rule, Q1 (edit-only, no create mode: the prototype implements none), Q3 (郵便番号 / 住所 stay unvalidated with no marker, exactly as V0 renders them) and Q5 (the footer summary persists until the next submit, as V0 behaves).
- Q: Who writes the 変更履歴 audit record for an HQ edit? → A: ~~Per the standing work instruction, **change history is seed data only in Phase 1** — this feature writes no history records; the FR-004 audit obligation is knowingly deferred to the backend (Q8, FR-028).~~ **Superseded 2026-09-21** — see the clarification of that date.
- Q: The published API design has no endpoint for saving member personal information — which contract should the save use? → A: **Keep the project's existing mock contract** — update the member through the existing member-update operation with a `basic_info` payload carrying only the eight FR-004 field groups. The missing real endpoint is raised with the API owners as a follow-up (Q10).
- Q: The prototype has no loading, fetch-error or save-error state — what should the screen do? → A: **Reuse the project's shared data-state boundary** for the member fetch (loading placeholder, plus an error state with a retry action) and show an **error toast** on save failure, keeping the operator on the form with their input intact (Q6).
- Q: The prototype's success toast reads 「会員を登録しました」 ("registered") and always returns to the member list — what should an edit save do? → A: **Toast 「会員情報を更新しました」 and always return to the member detail** of the edited member (matching the current project implementation), so the operator immediately sees the updated values (Q2). The prototype's copy is a defect; its list destination is superseded.
- Q: The prototype gates only the entry affordances — should the form page itself guard direct URL access? → A: **Yes, both guards on the page**: non-HQ/System roles get a permission-denied state, and a withdrawn (退会済み / 強制退会) member gets the existing block screen (「退会済みの会員は編集できません」 with a link back to the member detail). Server-side rejection remains in force independently (Q7 + Q9).
- Q: V0's 「保存する」 is always enabled, so a pristine form can be "saved" (no-op PATCH + navigation) — keep that? → A: **No — 「保存する」 is disabled until the form has at least one change** (post-implementation decision, supersedes the V0 behaviour; the V0 always-enabled button is a prototype artefact of its static mock data).
- Q: Should client validation really be blank-only, as the V0 code implies? → A: **No — full semantic validation is required.** The prototype-wins rule governs the **UI** (layout, copy, flow) only; data-quality rules stay in force per code-rule.md §IV. On top of the verbatim blank messages, non-blank input is format-checked: フリガナ = full-width katakana, 電話番号 = 10–11 digits ignoring hyphens (normalized to digits on save), メールアドレス = email shape, 郵便番号 = 7 digits with optional hyphen (only when entered), 氏名/フリガナ ≤ 50 chars, other text ≤ 255 _(superseded for 番地/建物名 on 2026-09-15 — those follow the API's 200/100)_. This supersedes the earlier blank-only resolution of Q3/A7 and research R1.

### Session 2026-09-21

- Q: The screen now runs against the real backend. Does the 「change history is seed only」 restriction still hold? → A: **No — it is removed.** `member_change_histories` is a real, served source behind `GET /api/v1/admin/members/{memberId}/change-history`, and the member detail 変更履歴 tab reads it live. A-01 FR-004's audit obligation (「HQ/Systemによる編集時は変更履歴タブに記録」) is therefore **in force**: a successful save on this form must be recorded, and that outcome is verifiable and testable. The record itself is written **server-side** by the update endpoint — this screen still issues no separate history request — but the absence of a record after a successful save is now a **defect**, not an accepted gap (FR-028, Q8, A5 all rewritten).

### Session 2026-09-22

- Q: FR-010 / FR-016 / FR-017 record 郵便番号, 都道府県 and 市町村・番地 as optional and unmarked (the 2026-07-28 resolution of Q3), but prototype `0a73739` (2026-09-16) marks all three `required` and rejects them when blank — which wins? → A: **The prototype.** All three are required and carry the shared required marker; 建物名 is the only address control that stays optional, and it carries the 任意 marker the prototype gives it. FR-010, FR-011, FR-016 and FR-017 are rewritten accordingly and **A2** / **Q3** are superseded; the shipped screen already behaves this way.
- Q: QA reported that 建物名 is required in the member app's 「会員情報の登録」 (blank → 「建物名を入力してください」) but 任意 on this form — which wins? → A: **The app's behaviour, per the tester's expectation (2026-10-08).** 建物名 becomes required with the shared required marker and the blank message above; FR-010, FR-016, FR-017 and the 建物名-blank edge case are rewritten, the 任意 marker is gone from this form, and **A2**'s remaining optional reading is superseded. The original spec (`fitness-spec` A-01 FR-004) lists only 「住所」 and states no obligation for 建物名, so this is a product decision recorded here; the PO's confirmation and the backend (`building` is still nullable) are open follow-ups. Existing members whose stored 建物名 is empty cannot be saved until it is filled in. **Superseded 2026-11-23** (Q below).
- Q: The member app has made マンション名 / 建物名 任意 (client request 11/20), and QA reports (Bug-No1) that a member who enrolled through the app without a 建物名 cannot be saved on this form — which wins? → A: **The app's new behaviour.** 建物名 is optional again: no blank check, the shared 任意 marker beside its label, and a blank value sent as `null` (clears it). FR-010, FR-016, FR-017 and the 建物名-blank edge case are rewritten; the 2026-10-08 resolution above is superseded. 性別 (the app's reduction to 男性 / 女性) is out of scope here and still awaits a client ruling on members storing その他 / 回答しない.
- Q: The back link and 「キャンセル」 were specified as returning to the **member list**, but prototype `0a73739` (2026-09-16) labels the link 「会員詳細に戻る」 and sends both back to the edited member's detail — which wins? → A: **The prototype.** Leaving the form returns to the same screen a successful save does (FR-024), so the operator always lands where they came from and sees the member's current values. FR-002, FR-003 and FR-025 are rewritten accordingly; the member-list destination is superseded.

### Session 2026-10-15

- Q: QA reported that 生年月日 can be changed to a date that makes the member under 16 (e.g. 2020/04/23, shown as 「6歳」) and saved, while the member app's 会員情報の編集 refuses it with 「16歳未満の方はご利用できません」 — which wins? → A: **The member app's behaviour.** The form rejects a 生年月日 that puts the member below the minimum age of the member's own brand, with the app's message, and sends nothing. The minimum follows the brand configuration (G-01 ブランド別設定構築 — JOYFIT family 15歳以上 / FIT365 16歳以上), not a fixed 16, so the message carries the brand's own number. Server-side enforcement is out of scope for this FE spec. See FR-016b.

### Session 2026-09-23 (PO reconfirmation, after the A-01 test run)

- Q: QA executed the form against the real backend and reported five spec-vs-prototype conflicts — the obligation of the three address fields, the address row layout, the back-link label, the cancel/back destination and the 建物名 placeholder. Which source wins on each? → A: **The prototype, on all five.** This changes nothing in this document: the 2026-09-22 session had already resolved every one of them the same way, and FR-002, FR-003, FR-008, FR-010, FR-011, FR-017 and FR-025 already record the prototype's behaviour. The conflicts came from a test plan written against the superseded text (A2, Q3 and the pre-2026-09-22 wording), not from the shipped screen, which matches this spec. The only correction this session makes is the stale 「郵便番号 / 都道府県 / 番地 / 建物名 left blank」 edge case, which still claimed the save succeeds.
- Q: 203 of the 244 members on dev hold all three address fields as `null`, from before they became required. Must the form still refuse their save? → A: **Yes** — a required field is required whoever left it blank, so those members cannot be saved until an address is supplied. Back-filling them is a back-end matter, outside this feature. Recorded as an edge case.
- Q: QA filed five defects against the run. Which are fixed, and which are the expectation's fault? → A: **Fix four, keep one.** **BUG-MF-05** (validation skipped fields the operator never touched) and **BUG-MF-03** (full-width digits silently dropped) are product defects — fixed, and FR-018a / FR-016a / FR-017 now state the rules explicitly. **BUG-MF-02** (電話番号 message) is fixed in the app, not the spec: a number not starting with `0` now raises FR-016a's 「電話番号の形式が正しくありません」 like every other format failure, and the separate 「日本国内の電話番号を入力してください」 branch is gone. **BUG-MF-04** (a 401 does not route to login) is **accepted as-is** — keeping the operator's edits beats a redirect that discards them, recorded in FR-031. **BUG-MF-01** (double-submit) was withdrawn: 保存する already disables itself while a save is in flight, and the three requests QA saw came from dispatching three clicks in one JavaScript tick, which no mouse or keyboard can do.
- Q: Fixing BUG-MF-05 means a stored value that breaks a rule now blocks the save. What about the member whose stored 電話番号 is a foreign number (`+84962150299`)? → A: **It blocks, and that is correct.** FR-016a requires a JP domestic number, so the record cannot be saved until the number is migrated — the same principle as the members stored without an address. Measured 2026-09-23: **20** of the 244 members hold a non-conforming stored number. Two were corrected the same day with the PO's approval — `JF-0000030` to the seed's dummy convention and `JF-0000004` by the lossless `+81` → `0` fold — leaving **18** `+84…` records that cannot be saved at all. Those numbers cannot be derived, so the team decides each one. _(Superseded 2026-10-30 — the endpoint now takes E.164, so a stored `+84…` number is valid and no longer blocks the save; see Session 2026-10-30.)_

### Session 2026-08-21 (customer — qa-167)

- Q: Does the single 住所 box stay, or is the address split to match the API's three fields? → A: **Split it.** 住所 becomes 都道府県 (a select holding the 2-digit JIS X 0401 code) + 番地 + 建物名. This **overrides** the 2026-07-28 prototype-wins resolution of Q11: the customer ruled on the UI directly, and `member-form.tsx` has not been updated since 2026-06-22. Implemented 2026-09-04 — FR-007, FR-008, FR-011, FR-013a and FR-017 describe the shipped form.
- Q: There is no prefecture-master endpoint — where does the 47-entry code/name table live? → A: **The frontend owns it** (`PREFECTURES` in `src/constants/app.constants.ts`, already in JIS order, so the code is the 1-based index).

### Session 2026-10-30 (A-01 Bug-No19 — the member phone is E.164)

- Q: A member who registered in the app with a country code (`+84…`) cannot be saved from the CRM: the form refuses every number that does not start with `0`. Must the form accept it? → A: **Yes.** The backend now stores `members.phone` as E.164 (API-093 v0.14, Otaki ruling 2026-10-28 案B): a JP domestic number is converted to `+81…` on save, and a number under any other country code is kept as sent. `PATCH /admin/members/{memberId}` takes `phone` as either JP domestic digits or E.164 (`^0[0-9]{9,10}$|^\+[1-9][0-9]{1,14}$`, max 16). FR-016a is amended to accept both; this supersedes the Session 2026-09-23 answer that a stored `+84…` number blocks the save.
- Q: How does the form show a stored number now that `GET` returns E.164? → A: **A `+81` number keeps the JP domestic display form** (`+819012345678` → `090-1234-5678`), as the prefill already did for legacy `+81` values; any other country code is prefilled as stored (`+84901234567`) and saves back unchanged. The 基本情報 tab and the 変更履歴 tab show the value as the API returns it — the CRM screens other than this form do not reformat it.
- Q: Does the member-list free-text search need a frontend change? → A: **No.** The keyword is passed through; the backend reads a `0…` keyword as `+81…` in the phone source (API-093 §3.5 v0.14). A non-JP member is found by typing the country code (`+84…`).

### Session 2026-11-06 (MR review k.iwaki — a pasted phone number lost its last digits)

- Q: Pasting `+1 (202) 555-0123` into 電話番号 left `+1202555012` — the last `3` was gone, and the shorter number still passed validation and saved. Why, and what must the field do? → A: The input carried `maxLength=16`, which counts the **raw** text — spaces, brackets and hyphens included — before the field strips them, so the browser cut the paste to 16 characters; `formatPhone` then also cut anything past 11 (domestic) / 15 (E.164) digits. Both cuts produce a _different, valid-looking_ number. **The field MUST never drop a digit**: the input has no character cap, the separators are removed first, and a number whose digit count exceeds the rule is kept whole and rejected with 「電話番号の形式が正しくありません」. FR-016a is amended; this supersedes the 2026-10-30 "capped at 15 digits" wording.
- Q: Does 郵便番号 have the same defect? → A: **Yes, and it is fixed the same way.** Its input carried `maxLength=8` and the formatter kept only the first 7 digits, so `150-00012` / `15000012` became `150-0001` and saved silently, while a valid code pasted as `〒150-0001` or ` 150-0001` lost its last digit and was refused. FR-017 is amended: no input cap, no digit truncation, an over-long code is kept and rejected with 「郵便番号の形式が正しくありません」.

---

## Scope

### In scope (Phase 1)

- Edit mode of `member-form`: load an existing member's personal information, edit, validate, save, cancel.
- Role-gated entry from the member list row menu and from the member detail header.
- Unsaved-changes protection (in-app navigation + browser unload).
- Reading the edited member's current values.

### Out of Scope for Phase 1

| Item                                                                   | Why excluded                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New-member registration (新規登録) mode**                            | The prototype `member-form.tsx` implements edit only — the page title is hard-coded to 「会員情報を編集」 and the state is seeded from an existing member record. A-01 FR-004 defines this form purely as an HQ edit form; new members enter the system through **C-01 入会申請管理**. The screen map (`src/pages/map/screens.ts:1686`) still lists a `member-form-create` state — see **Q1**. |
| **契約情報 / 決済情報 sections**                                       | Listed in the screen-map description (`screens.ts:1682`) but absent from the implemented UI. Contract operations belong to A-01-01-c (FR-006 / FR-007); payment data belongs to F-01.                                                                                                                                                                                                          |
| **会員種別・所属店舗 editing**                                         | Explicitly out of FR-004 scope (→ FR-006 / A-02).                                                                                                                                                                                                                                                                                                                                              |
| **The 変更履歴 tab's own UI** (columns, paging, empty state, filters)  | The audit record this form's save produces is **in scope** (FR-028) and is verified on the member detail 変更履歴 tab, but that tab's rendering belongs to A-01-01 ([specs/032-member-detail](../member-detail)). This feature asserts that the record exists and carries the right change, not how the tab draws it.                                                                          |
| **個人情報の削除 (FR-018 anonymisation)**                              | Separate operation on the member detail screen.                                                                                                                                                                                                                                                                                                                                                |
| **ゲートストップ / ブラックリスト / ステータス変更**                   | Separate FR-014 / FR-015 / FR-005 features on the member detail screen.                                                                                                                                                                                                                                                                                                                        |
| **Emergency contact, join route, referrer, member photo, memo fields** | Not present in the prototype `member-form.tsx` and not listed in FR-004's editable set — see **Q4**.                                                                                                                                                                                                                                                                                           |

---

## User Scenarios _(mandatory)_

### User Story 1 — Headquarters corrects a member's personal information (Priority: P1)

A headquarters operator receives a correction request (e.g. a member moved house or mistyped their email at enrolment). From the member list row menu or the member detail header they choose 「編集」, land on the edit form pre-filled with the member's current values, change the affected fields, and press 「保存する」. A success toast confirms the update and they land on the member's detail screen, where the corrected values are immediately visible.

**Why this priority**: This is the entire purpose of the screen. Without it the FR-004 HQ edit path does not exist and personal-data corrections cannot be handled by the CRM at all.

**Verification**: As a Headquarter user, open the member list, use a row's 「編集」 menu item, confirm the form is pre-filled with that member's values, change 電話番号, press 「保存する」, confirm the toast 「会員情報を更新しました」 and navigation to that member's detail screen showing the new value, then re-open the form and confirm the new value persisted.

**Acceptance Scenarios**:

1. **Given** an existing member, **When** the edit form opens, **Then** every field is pre-populated with that member's current stored values and the page title reads 「会員情報を編集」.
2. **Given** the form is pre-filled, **When** the user edits one or more fields and presses 「保存する」 with all required fields filled, **Then** the changes are persisted, the toast 「会員情報を更新しました」 is shown, and the user is navigated to the edited member's detail screen.
3. **Given** the form is open, **When** the user has made no changes and presses 「キャンセル」 or the 「会員詳細に戻る」 back link, **Then** the user is navigated to the edited member's detail screen immediately with no confirmation prompt.

---

### User Story 2 — The form blocks incomplete submissions (Priority: P1)

The operator clears or forgets a mandatory field and presses 「保存する」. Nothing is saved; instead an inline message appears under each offending field, a summary message appears in the footer, and the page scrolls to the first offending field so the operator can see what to fix. As soon as they type a value into a flagged field, that field's message disappears.

**Why this priority**: Personal information is the identity backbone of every downstream member operation (billing, gate authentication, notifications). Saving a member without a name, birth date, phone or email would corrupt those flows, so validation ships together with the save path.

**Verification**: Clear 氏名（姓）, 生年月日 and メールアドレス, press 「保存する」, confirm no navigation occurs, three inline messages render, the footer shows 「未入力の項目があります」, the viewport scrolls to the first invalid control, then type into 氏名（姓） and confirm only that message clears.

**Acceptance Scenarios**:

1. **Given** one or more required fields are empty, **When** the user presses 「保存する」, **Then** no save occurs, each empty required field renders its own message, the footer renders 「未入力の項目があります」, and each offending control is marked invalid for assistive technology.
2. **Given** validation errors are displayed, **When** the errors were just raised, **Then** the view scrolls the first invalid control into the centre of the viewport.
3. **Given** a field is showing a validation message, **When** the user enters a non-blank value in that field, **Then** that field's message is removed immediately without re-submitting.
4. **Given** validation errors were raised, **When** the user subsequently fills every required field and presses 「保存する」 again, **Then** all messages and the footer summary clear and the save proceeds.

---

### User Story 3 — Unsaved edits are protected (Priority: P2)

The operator edits several fields and then clicks 「キャンセル」, the 「会員詳細に戻る」 back link, or tries to close the browser tab. Because there are unsaved changes, a confirmation is raised: 「変更を破棄しますか？」. They can either keep editing or discard and leave.

**Why this priority**: Re-keying a full personal-information record after an accidental navigation is a real time cost, but the screen is still usable without the guard, so it ranks below the save and validate paths.

**Verification**: Change one field, press 「キャンセル」, confirm the discard dialog appears; press 「編集を続ける」 and confirm you stay on the form with edits intact; press 「キャンセル」 again then 「破棄する」 and confirm navigation to the member detail.

**Acceptance Scenarios**:

1. **Given** at least one field has been changed since the form loaded, **When** the user activates 「キャンセル」 or the back link, **Then** a confirmation dialog titled 「変更を破棄しますか？」 is shown with the description 「未保存の変更はすべて失われます。この操作は取り消せません。」 and two actions, 「編集を続ける」 and 「破棄する」.
2. **Given** the discard dialog is open, **When** the user chooses 「編集を続ける」 (or dismisses the dialog), **Then** the dialog closes, the user stays on the form, and all entered values are preserved.
3. **Given** the discard dialog is open, **When** the user chooses 「破棄する」, **Then** the dialog closes and the originally requested navigation proceeds.
4. **Given** at least one field has been changed, **When** the user attempts to close or reload the browser tab, **Then** the browser's native leave-confirmation is triggered.
5. **Given** a save has just succeeded, **When** the post-save navigation runs, **Then** no discard confirmation is shown (the form is no longer considered dirty).

---

### User Story 4 — Only Headquarter / System can reach the form (Priority: P2)

A store Manager, Staff, Observer or Trainer browsing the member list or a member's detail does not see an 「編集」 affordance at all; the personal-information block stays read-only for them.

**Why this priority**: A-01 makes this a hard business rule (個人情報変更 = ○ for System/HQ, × for Manager/Staff/Trainer/Observer), but it is enforced at the entry points and by the server, so the form itself is deliverable before the gate is complete.

**Verification**: Sign in as each role and confirm the 「編集」 row-menu item (member list) and the 「編集」 header button (member detail) appear only for Headquarter and System.

**Acceptance Scenarios**:

1. **Given** the current user is Headquarter or System, **When** they view the member list row menu or the member detail header, **Then** an 「編集」 affordance is present and opens `member-form` for that member.
2. **Given** the current user is Manager, Staff, Trainer or Observer, **When** they view those same places, **Then** no 「編集」 affordance is rendered.

---

### Edge Cases

- **All required fields empty** — every required field shows its own message simultaneously; the footer summary appears once; the scroll lands on the first invalid field in DOM order (氏名（姓）).
- **Whitespace-only input** — a value consisting only of spaces is treated as empty for 氏名, フリガナ, 電話番号 and メールアドレス, and does not clear an existing message.
- **性別 error clearing** — because the control is a picker, selecting any value clears its message (there is no "blank" option to re-select).
- **郵便番号 / 都道府県 / 市町村・番地 left blank** — the save is refused; each of the three shows its own required message (「郵便番号を入力してください」 / 「都道府県を選択してください」 / 「市町村・番地を入力してください」) and 郵便番号 is format-checked on top when non-blank (FR-010, FR-016, FR-017). ~~the form saves successfully; none of the four address fields carries a required obligation~~ **Superseded 2026-09-22** (Q3 re-resolved in favour of prototype `0a73739`; reconfirmed by the PO 2026-09-23).
- **生年月日 below the brand's minimum age** — the save is refused with 「{n}歳未満の方はご利用できません」 under 生年月日 (n = 15 for a JOYFIT member, 16 for a FIT365 member), the footer summary appears, and no request is sent; age counts full years on the current date, so the day the member turns n is accepted and the day before is not (FR-016b).
- **建物名 left blank** — the save succeeds; a 建物名 the operator cleared is sent as `null` and removed (FR-017). _(Amended 2026-11-23 — Bug-No1: was required from 2026-10-08.)_
- **A stored member whose address was never captured** — 203 of the 244 members on dev hold `postalCode`, `prefecture` and `streetAddress` as `null`, all pre-dating the 2026-09-22 rule that makes the three required. Opening such a member presents three blank required fields the operator did not empty. The save MUST still be refused with those three messages, exactly as if the operator had cleared them — a required field is required whoever left it blank — so **correcting any other attribute on those members obliges the operator to supply a full postal address first**. Migrating or back-filling them is a back-end matter outside this feature _(measured 2026-09-23; see the A-01 test plan, gap B5)_.
- **A phone number or postal code pasted with separators or one digit too many** — `+1 (202) 555-0123` (17 raw characters) MUST be kept whole as `+12025550123`, and `〒150-0001` as `150-0001`; `090-1234-56789` (12 digits) and `150-00012` (8 digits) MUST be kept as typed and rejected with the field's format message, never shortened to a valid-looking `090-1234-5678` / `150-0001` _(2026-11-06, FR-016a / FR-017)_.
- **A stored member whose 電話番号 is not a JP domestic number** — members who registered in the app with a country code hold an E.164 number other than `+81` (`+84…`). The form MUST prefill it as stored and MUST save the record whether or not the number is touched; the number is valid under FR-016a _(2026-10-30, A-01 Bug-No19 — supersedes the 2026-09-23 rule that refused the save)_.
- **Footer summary persistence** — after a failed submit, the footer summary 「未入力の項目があります」 remains visible while the user fixes fields and is only re-evaluated on the next 「保存する」, even once all inline messages have cleared (resolved Q5 — prototype behaviour kept).
- **Member being edited cannot be loaded** (not found, outside the caller's permitted scope, network failure) — the shared error state with a retry action replaces the form; no partially populated form is ever shown (FR-030).
- **Save fails** (validation passed client-side but the request is rejected or times out) — an error toast is shown, the operator keeps every entered value, the form stays dirty, and no navigation occurs (FR-031).
- **Withdrawn / force-withdrawn member** — the member detail header hides the 編集 button, and the form page itself blocks direct URL access with 「退会済みの会員は編集できません」 (FR-033).
- **Non-HQ/System role via direct URL** — the page renders a permission-denied state instead of the form (FR-032); the server rejects any save regardless (FR-027).
- **Concurrent edit** — two HQ operators editing the same member simultaneously; last write wins, with no conflict detection. Because a save carries only the attributes that operator actually changed (FR-024), last-write-wins applies **per attribute**: a second, stale tab overwrites the fields it edited and leaves every other field the first tab saved intact _(verified 2026-09-23)_.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Screen shell & navigation

- **FR-001**: The screen MUST render inside the standard CRM application shell — global sidebar (with the member-management section marked as the current location) and global header — with the form area as the only scrollable region.
- **FR-002**: The screen MUST show a page header containing a back link labelled 「会員詳細に戻る」 and the page title 「会員情報を編集」.
- **FR-003**: The back link MUST route to the edited member's detail screen, subject to the unsaved-changes guard (FR-020) _(prototype `0a73739`, 2026-09-16 — see the 2026-09-22 clarification; the earlier member-list destination is superseded)_.
- **FR-004**: The form content MUST be constrained to a readable centred column and MUST remain vertically scrollable independently of the shell.

#### Data loading

- **FR-005**: On open, the screen MUST load the target member's current personal information and pre-populate every field with it.
- **FR-006**: The screen MUST be reachable only for a specific, already-existing member; there is no blank-form entry path in Phase 1.
- **FR-029**: While the member is being loaded, the screen MUST show the project's shared loading state in place of the form; the form MUST NOT render partially populated or blank-then-filled.
- **FR-030**: When the member cannot be loaded (not found, outside the caller's permitted scope, or a transport failure), the screen MUST show the project's shared error state with a retry action instead of the form.

#### Field set (個人情報 card)

- **FR-007**: The form MUST present exactly one section card titled 「個人情報」 containing, in this order: 氏名（姓）, 氏名（名）, フリガナ（姓）, フリガナ（名）, 生年月日, 性別, 郵便番号, 都道府県, 番地, 建物名, 電話番号, メールアドレス _(住所 is three controls since the 2026-08-21 customer decision — Q11)_.
- **FR-008**: 氏名（姓）/ 氏名（名）, フリガナ（姓）/ フリガナ（名）, 生年月日 / 性別, and 電話番号 / メールアドレス MUST each be laid out as a two-column pair; 郵便番号 MUST occupy its own row with a narrow fixed-width input, 都道府県 MUST occupy a half-width row of its own, and 市町村・番地 and 建物名 MUST each occupy their own full-width row _(supersedes the prototype's single full-width 住所 row — Q11; the row split follows prototype `0a73739`)_.
- **FR-009**: Each field MUST render a label, its input control, and — when invalid — a message directly beneath the control.
- **FR-010**: The eleven fields 氏名（姓）, 氏名（名）, フリガナ（姓）, フリガナ（名）, 生年月日, 性別, 郵便番号, 都道府県, 市町村・番地, 電話番号, メールアドレス MUST display the shared required marker beside their labels; 建物名 MUST display the shared 任意 marker instead _(prototype `0a73739`, 2026-09-16 made 郵便番号 / 都道府県 / 市町村・番地 required; 建物名 was required from 2026-10-08 to 2026-11-23 and is optional again — Bug-No1, following the member app)_.
- **FR-011**: Each text field MUST show an example placeholder: 「例: 山田」, 「例: 太郎」, 「例: ヤマダ」, 「例: タロウ」, 「例: 150-0001」, 「例: 渋谷区神宮前1-1-1」, 「例: 神宮前ビル 3F」, 「例: 090-1234-5678」, 「例: yamada@example.com」 _(建物名 follows prototype `0a73739`; the earlier 「例: 神宮前マンション101」 is superseded)_.
- **FR-012**: 生年月日 MUST be entered through a date picker with the placeholder 「日付を選択」.
- **FR-013**: 性別 MUST be a single-select with the placeholder 「選択してください」 and exactly the options 男性 / 女性 / その他 / 回答しない.
- **FR-013a**: 都道府県 MUST be a single-select with the placeholder 「選択してください」 and exactly the 47 prefectures in JIS X 0401 order. The value it holds and sends is the **2-digit JIS code** (`01`–`47`), never the prefecture name; because there is no prefecture-master endpoint, the frontend owns the 47-entry code/name table _(customer decision 2026-08-21 — qa-167)_.
- **FR-014**: The form MUST NOT contain 会員種別 or 所属店舗 fields (A-01 FR-004 「編集対象外」).

#### Validation

- **FR-015**: Validation MUST run only when 「保存する」 is activated (not on blur or on change).
- **FR-016**: The eleven required fields MUST be rejected when blank, each with its own message: 氏名（姓）を入力してください / 氏名（名）を入力してください / フリガナ（姓）を入力してください / フリガナ（名）を入力してください / 生年月日を入力してください / 性別を選択してください / 郵便番号を入力してください / 都道府県を選択してください / 市町村・番地を入力してください / 電話番号を入力してください / メールアドレスを入力してください. Text fields MUST treat whitespace-only input as blank. _(The three address messages come from prototype `0a73739` verbatim.)_
- **FR-016a**: Non-blank input MUST additionally satisfy semantic format rules _(session decision 2026-07-28 — prototype governs the UI only; supersedes the earlier blank-only reading)_: フリガナ（姓/名） = full-width katakana (「全角カタカナで入力してください」); 電話番号 = either a JP domestic number — 10–11 digits ignoring non-digits, starting with `0` — or an E.164 number — `+`, a non-zero first digit, 2–15 digits in all — as the endpoint's contract allows (API-093 §18.3 v0.14) (「電話番号の形式が正しくありません」), normalized on save to its digits, with the leading `+` kept for an E.164 number _(2026-10-30, A-01 Bug-No19)_. Full-width digits and the full-width hyphen MUST be folded to half-width before anything else, so a number typed with the IME still in Japanese input mode (`０９０１２３４５６７８`) is kept and formatted, never silently dropped _(2026-09-23 — the rule the earlier text left unstated)_. Like 郵便番号, the operator MUST be able to type digits only: the input **auto-formats** as it is typed (`09012345678` → `090-1234-5678`), placing the separators from the prefix — 3-4-4 for mobile and IP numbers (050/070/080/090), 4-3-4 for 0800, 4-3-3 for 0120, 2-4-4 for 03 / 06, and 3-3-4 for every other land line. JP area codes are 1–4 digits and only the MIC table resolves them exactly, so a 4- or 5-digit area code is grouped as if it were 3 digits; this is **display only** — the saved value is always the bare digits, so the fallback never affects data _(parity with the mobile app, 2026-09-15)_. A number typed with a leading `+` (half- or full-width `＋`) is E.164: the `+` is kept and no separators are inserted _(2026-10-30)_. The input MUST NOT cap or truncate entry — neither by a character `maxLength` (which would count a pasted number's spaces / brackets / hyphens and cut its last digits) nor by dropping digits past the limit; the digit count is checked after the separators are removed, and a number longer than 11 (domestic) / 15 (E.164) digits is kept as entered and rejected with the format message, so a paste such as `+1 (202) 555-0123` is kept whole (`+12025550123`) _(2026-11-06, MR review — supersedes the 15-digit input cap)_. A stored `+81` number is prefilled in the JP domestic display form (`+819012345678` → `090-1234-5678`); any other country code is prefilled as stored (`+84901234567`). A number that starts with neither `0` nor `+` (`9012345678`) is rejected with the same format message _(the separate 「日本国内の電話番号を入力してください」 message of 2026-09-22 was removed on 2026-09-23)_. メールアドレス = valid email shape (「メールアドレスの形式が正しくありません」); 氏名/フリガナ ≤ 50 characters (「50文字以内で入力してください」). A blank required field shows only its FR-016 blank message, never a format message.
- **FR-016b**: 生年月日 MUST additionally satisfy the member's brand minimum age _(session decision 2026-10-15 — QA bug: the member app refuses an under-age birth date, the CRM saved it)_. The age is the number of full years between 生年月日 and today; when it is below the minimum, the save MUST be refused with the message 「{n}歳未満の方はご利用できません」 shown under 生年月日 (n = the minimum), MUST NOT send a request, and the message clears per FR-019 as soon as another date is chosen. The minimum is the member's brand setting — 15 for a JOYFIT-family member, 16 for a FIT365 member (`defaultMinAgeForBrand`, G-01 ブランド別設定構築) — read from the loaded member's `brandGroup`; while the member is still loading no age rule applies (the form cannot be submitted then). The rule runs together with the past-date rule: a future or today date still shows 「生年月日は過去の日付を入力してください」.
- **FR-017**: 建物名 is optional: a blank or whitespace-only value MUST NOT block the save, and its label carries the shared 任意 marker. When the operator clears a stored 建物名, the save sends `null`, which clears it on the endpoint _(2026-11-23 — Bug-No1; supersedes the 2026-10-08 required reading)_. 郵便番号, 都道府県 and 市町村・番地 are required too (FR-010, FR-016) _(prototype `0a73739`, 2026-09-16 — supersedes the unvalidated, unmarked reading of Q3)_. 郵便番号 MUST match a 7-digit postal code with an optional hyphen in the 3-4 position (「郵便番号の形式が正しくありません」 — a format message, matching the メールアドレス / IPアドレス convention, not a re-statement of the input rule), and its input MUST NOT cap or truncate entry — neither by a character `maxLength` (which would count a pasted `〒` / space and cut the last digit of a valid code) nor by dropping digits past the seventh; a code longer than 7 digits is kept as entered and rejected with the format message, so `150-00012` is never shortened to a valid-looking `150-0001` _(2026-11-06 — supersedes the 8-character input cap)_. Full-width digits and the full-width hyphen MUST be folded to half-width first, as on 電話番号 (FR-016a). The operator MUST be able to type digits only: the input **auto-formats** as it is typed, keeping the digits and rendering the hyphen after the third (`1500001` → `150-0001`), and a stored value is shown in the same hyphenated form; the hyphen is stripped again on save _(parity with the mobile app, 2026-09-15)_. 番地 and 建物名 are free text, capped at the endpoint's own limits — **200** and **100** characters (「200文字以内で入力してください」/「100文字以内で入力してください」). The project's 255-character default does not apply here: the API is the only source that states a number _(2026-09-15)_. 都道府県 is rejected when no prefecture is selected (「都道府県を選択してください」).
- **FR-018**: When validation fails, the system MUST NOT save, MUST mark each offending control as invalid for assistive technology, MUST render the footer summary 「未入力の項目があります」, and MUST scroll the first invalid control into the centre of the viewport.
- **FR-019**: While a field is showing a message, entering a non-blank value in that field (or selecting any value, for 性別) MUST clear that field's message immediately.

#### Unsaved-changes protection

- **FR-020**: Any change to any field MUST mark the form dirty. While the form is dirty, activating 「キャンセル」 or the back link MUST open a confirmation dialog titled 「変更を破棄しますか？」, described as 「未保存の変更はすべて失われます。この操作は取り消せません。」, offering 「編集を続ける」 (stay, keep edits) and 「破棄する」 (leave, discard edits). When the form is not dirty, navigation MUST proceed immediately. The same confirmation MUST also guard leaving through the global sidebar, a header action such as logout, and the browser's Back / Forward buttons _(2026-09-22 — the screen uses the project's full unsaved-changes guard, as the FC企業 edit form does; `beforeunload` in FR-021 covers only reload / tab close, which the HTML spec reserves for the browser's own dialog)_.
- **FR-021**: While the form is dirty, an attempt to close or reload the browser tab MUST trigger the browser's native leave-confirmation.
- **FR-022**: A successful save MUST clear the dirty state before navigating, so no discard confirmation is raised by the post-save navigation.

#### Save & cancel

- **FR-023**: The footer MUST show, right-aligned, a secondary 「キャンセル」 action and a primary 「保存する」 action; the failed-submit summary MUST appear at the left of the same footer row. 「保存する」 MUST be disabled while the form has no changes and while a save is in flight _(session decision 2026-07-28 — supersedes V0's always-enabled button)_.
- **FR-024**: On a valid submit the system MUST persist the changed personal information for the member, show the success toast 「会員情報を更新しました」, and navigate to the **member detail** screen of the edited member. The save MUST carry only the eight FR-004 field groups; attributes the form does not render (emergency contact, join route, referrer, photo, memo, contract and store data) MUST be left untouched. _(Resolved Q2 — the prototype's 「会員を登録しました」 copy and member-list destination are superseded.)_
- **FR-025**: 「キャンセル」 MUST discard all edits (after the FR-020 confirmation when dirty) and return to the edited member's detail screen, the same destination as the back link (FR-003).
- **FR-018a**: Submit-time validation MUST cover **every** field on the form, not only the ones the operator edited. A required field left blank, or a stored value that breaks a format rule, MUST block the save and show its own message whoever put it there — including values that pre-date the rule _(PO ruling 2026-09-23; see the Edge Case on members stored without an address)_. Which fields the save then **sends** is a separate question, answered by FR-024.
- **FR-031**: When a save fails, the system MUST show an error toast, MUST keep the operator on the form with every entered value intact, MUST keep the form dirty, and MUST NOT navigate away. This holds for an **expired session** too: a `401` MUST show 「セッションの有効期限が切れました。再度ログインしてください。」 and leave the operator on the form with their edits, rather than routing to the login screen and losing them _(PO ruling 2026-09-23 — this screen departs from the shared Real-API checklist's 401 row, which sends the operator to login; the operator re-authenticates in another tab and presses 保存する again)_.

#### Permissions

- **FR-026**: The 「編集」 entry affordances (member list row menu; member detail header button) MUST be usable only by Headquarter and System roles, per the A-01 permission matrix (個人情報変更: System ○ / Headquarter ○ / Manager × / Staff × / Trainer × / Observer ×). Presentation follows the V0 role-gate convention: for non-permitted roles the affordance renders **disabled with a deny tooltip** (V0 `RoleGatedButton`), and it is hidden entirely for withdrawn members.
- **FR-027**: A save request from a role other than Headquarter or System MUST be rejected by the server, independently of the UI gate.
- **FR-032**: The form page itself MUST guard direct URL access: when the current user's role is not Headquarter or System, the page MUST render a permission-denied state instead of the form _(resolved Q9)_.
- **FR-033**: When the target member's status is 退会済み or 強制退会, the page MUST render a block screen instead of the form — message 「退会済みの会員は編集できません」 with guidance (再入会の手続き) and an action returning to the member detail _(resolved Q7; matches the entry-point rule that hides 編集 for withdrawn members)_.

#### Auditing

- **FR-028**: A successful save MUST be recorded in the edited member's 変更履歴, per A-01 FR-004 「HQ/Systemによる編集時は変更履歴タブに記録」. The record MUST identify **when** the change happened, **who** made it (the signed-in HQ/System operator, by name — not an internal id) and **which** attributes changed, with their before and after values; only the attributes the operator actually changed may appear. A save that fails MUST leave no record. The write itself is performed **server-side** by the update endpoint — this screen issues no separate history request — so the requirement is verified by reading the member detail 変更履歴 tab after a save, and a missing or wrong record is a **defect**. _(Rewritten 2026-09-21: the earlier 「change history is seed data only in Phase 1」 restriction is removed now that the screen runs against the real backend — see the 2026-09-21 clarification and **Q8**.)_

---

## UI Structure & Component Hierarchy

Derived from `src/pages/member-form.tsx` (300 lines).

> **Drift notice (customer decision 2026-08-21, implemented 2026-09-04)**: the tree below records the **prototype**, which still renders one full-width 住所 box and has not changed since 2026-06-22. The shipped screen replaces that box with 郵便番号 / 都道府県 as a two-column pair followed by 番地 and 建物名 (FR-007, FR-008, Q11); everything else below still matches. Re-sync this section once the prototype is updated.

```
MemberForm                                                    (L78)
├── SharedSidebar  currentPage="member-form"                   (L138)
└── SidebarInset  (flex column, max-h-svh, overflow hidden)    (L139)
    ├── SharedHeader                                           (L140)
    ├── PageHeader  outside                                    (L142–148)
    │   ├── breadcrumb: BackLink 「会員詳細に戻る」 → confirmDiscard → member-detail
    │   └── title: 「会員情報を編集」                            (L79, L147)
    └── main  (flex-1, scrollable, px-6 py-4)                  (L150)
        └── div  (flex column gap-6, max-w-960px, centred)     (L152)
            ├── Card 「個人情報」                                (L154–265)
            │   └── CardContent → flex column gap-6            (L158–263)
            │       ├── row (2 cols)  氏名（姓）* │ 氏名（名）*    (L161–178)
            │       ├── row (2 cols)  フリガナ（姓）* │ フリガナ（名）* (L181–198)
            │       ├── row (2 cols)  生年月日* (DatePicker) │ 性別* (Select) (L201–222)
            │       ├── row (full)    郵便番号  (Input, w-200px) (L225–232)
            │       ├── row (full)    住所      (Input)         (L235–241)
            │       └── row (2 cols)  電話番号* │ メールアドレス* (type=email) (L244–262)
            └── Footer  (flex, justify-end, gap-2, border-t)   (L268–278)
                ├── [conditional] 「未入力の項目があります」 (destructive, mr-auto) (L269–271)
                ├── Button outline lg 「キャンセル」 → confirmDiscard → member-list (L272–274)
                └── Button lg       「保存する」   → handleSubmit    (L275–277)

AlertDialog  (portal, open when discardDialogOpen)             (L284–297)
├── title:       「変更を破棄しますか？」
├── description: 「未保存の変更はすべて失われます。この操作は取り消せません。」
├── cancel:      「編集を続ける」  → handleDiscardCancel
└── action:      「破棄する」      → handleDiscardConfirm
```

**Shared building blocks**: `FormField` (label + required/optional marker + control + error text, L51–75), `RequiredMark` / `OptionalMark` (`@/components/field-marker` — mutually exclusive), `DatePicker`, `Select`, `Input`, `Card`, `Button`, `AlertDialog`, `PageHeader`, `BackLink`, `useUnsavedChanges` (`@/hooks/use-unsaved-changes`), `toast` (sonner), `navigate` (`@/lib/navigate`).

### Interaction map

| Trigger                            | Source                                         | Behaviour                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type in any text input             | L166, L174, L186, L194, L230, L239, L249, L258 | update value → mark dirty → if that field had a message and the trimmed value is non-blank, clear the message                                                                                                                                                                                                            |
| Pick a date (生年月日)             | L205                                           | update value → mark dirty → clear message when a date is chosen                                                                                                                                                                                                                                                          |
| Choose 性別                        | L210                                           | update value → mark dirty → clear message unconditionally                                                                                                                                                                                                                                                                |
| Press 「保存する」                 | L275                                           | run validation → on failure: store messages, set footer summary, scroll first invalid control into view after a short delay → on success: clear messages, clear dirty, toast 「会員情報を更新しました」, navigate to the member detail _(destination & copy per Q2; V0 went to member-list with 「会員を登録しました」)_ |
| Press 「キャンセル」               | L272                                           | `confirmDiscard(→ member-detail)` — dirty ⇒ discard dialog, clean ⇒ navigate                                                                                                                                                                                                                                             |
| Press back link 「会員詳細に戻る」 | L145                                           | same as 「キャンセル」                                                                                                                                                                                                                                                                                                   |
| Close / reload tab while dirty     | `use-unsaved-changes`                          | native `beforeunload` confirmation                                                                                                                                                                                                                                                                                       |
| 「編集を続ける」 in dialog         | L293                                           | close dialog, cancel the pending navigation, stay on form                                                                                                                                                                                                                                                                |
| 「破棄する」 in dialog             | L294                                           | close dialog, clear dirty, run the pending navigation                                                                                                                                                                                                                                                                    |

---

## UI States

| State                       | Trigger                                                   | Rendering                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data-rendered (default)** | Form opens for an existing member                         | All ten fields pre-populated from the member's stored values; no messages; footer summary hidden; discard dialog closed                                         |
| **Field-invalid**           | 「保存する」 with one or more blank required fields       | Offending controls flagged invalid; a destructive message under each; footer summary 「未入力の項目があります」; viewport scrolled to the first invalid control |
| **Partially corrected**     | User types into a flagged field                           | That field's message and invalid flag clear; other messages and the footer summary remain                                                                       |
| **Saving / saved**          | 「保存する」 with a valid form                            | Messages cleared, dirty cleared, toast 「会員情報を更新しました」, navigation to the edited member's detail screen (Q2)                                         |
| **Discard confirmation**    | Cancel / back link while dirty                            | Modal alert dialog over the form; the form remains mounted with all edits intact behind it                                                                      |
| **Loading**                 | Fetching the member being edited                          | Project's shared loading state replaces the form until the member is available (FR-029). _Not present in the prototype — added per Q6_                          |
| **Load error**              | Member fetch fails (not found / out of scope / transport) | Project's shared error state with a retry action replaces the form (FR-030). _Not present in the prototype — added per Q6_                                      |
| **Save error**              | Save request fails                                        | Error toast; the operator stays on the form with all entered values intact and the form still dirty (FR-031). _Not present in the prototype — added per Q6_     |
| **Empty**                   | —                                                         | Not applicable (a single-record form)                                                                                                                           |
| **Role-blocked**            | Non-HQ/System role reaching the page directly             | Permission-denied state replaces the form (FR-032). _Not present in the prototype — added per Q9_                                                               |
| **Withdrawn-member block**  | Direct URL access for a 退会済み / 強制退会 member        | Block screen 「退会済みの会員は編集できません」 with a return-to-detail action replaces the form (FR-033). _Not present in the prototype — added per Q7_        |

---

## Traceability

### UI element → requirement

| UI element (member-form.tsx)         | Spec requirement                                                                                            | Source                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Page title 「会員情報を編集」        | A-01 FR-004 「会員詳細から独立した編集フォーム（member-form）へ遷移可能」                                   | L79, L147                                              |
| BackLink 「会員詳細に戻る」          | A-01 FR-004 (entry from 会員詳細) / FR-001 list screen                                                      | L145                                                   |
| 氏名（姓）/ 氏名（名）               | A-01 FR-004 編集可能項目「氏名」                                                                            | L162–177                                               |
| フリガナ（姓）/ フリガナ（名）       | A-01 FR-004 編集可能項目「フリガナ」                                                                        | L182–197                                               |
| 生年月日                             | A-01 FR-004 編集可能項目「生年月日」                                                                        | L202–208                                               |
| 性別                                 | A-01 FR-004 編集可能項目「性別」                                                                            | L209–221                                               |
| 郵便番号                             | A-01 FR-004 編集可能項目「郵便番号」                                                                        | L225–232                                               |
| 都道府県 / 番地 / 建物名             | A-01 FR-004 編集可能項目「住所」 — three controls since 2026-08-21 (Q11, FR-013a)                           | prototype still renders one 住所 box (L235–241)        |
| 電話番号                             | A-01 FR-004 編集可能項目「電話番号」                                                                        | L245–252                                               |
| メールアドレス                       | A-01 FR-004 編集可能項目「メールアドレス」                                                                  | L253–261                                               |
| Absence of 会員種別 / 所属店舗       | A-01 FR-004 「編集対象外: 会員種別（→FR-006）・所属店舗（→A-02）」                                          | —                                                      |
| Role gate on 「編集」 entry points   | A-01 権限マトリクス 「個人情報変更」 (HQ/System ○ only); 前提条件事項「個人情報の変更は本人または本部のみ」 | member-list.tsx L986–994, member-detail.tsx L2943–2946 |
| Save → change-history record         | A-01 FR-004 「HQ/Systemによる編集時は変更履歴タブに記録」 / FR-003 変更履歴タブ                             | server-written on save — see FR-028                    |
| Discard dialog                       | No PO-spec counterpart — UI-prototype convention (`use-unsaved-changes`)                                    | L284–297                                               |
| Validation messages & footer summary | No PO-spec counterpart — UI-prototype convention                                                            | L99–124, L269–271                                      |

### A-01 requirement → coverage here

| A-01 requirement                                        | Covered on this screen?                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| FR-004 会員情報の参照・編集（ヘッドアップ） — edit half | **Yes** — this is the whole screen                                                               |
| FR-004 — read-only display half                         | No — belongs to A-01-01-a (member detail head-up)                                                |
| FR-003 変更履歴タブ                                     | Partly — the tab's own UI belongs to A-01-01; the **record this form's save produces** is FR-028 |
| FR-002 閲覧権限の制御                                   | Partly — FR-026 / FR-027 role gate                                                               |
| FR-006 主契約変更 / A-02 移籍                           | No — explicitly excluded by FR-004                                                               |
| FR-018 個人情報の削除                                   | No — separate operation on member detail                                                         |

---

## Key Entities

- **Member (会員)** — the person whose record is being edited. Identified by the CRM-issued user ID (旧会員No retained separately). Only the personal-attribute subset below is touched by this screen.
- **Member personal information (個人情報)** — 氏名（姓・名）, フリガナ（姓・名）, 生年月日, 性別, 郵便番号, 住所, 電話番号, メールアドレス. Every one of these is a personal-data field whose change is restricted to the member themselves or Headquarter/System.
- **Change-history entry (変更履歴)** — an audit record of a member-attribute change (timestamp, actor, before/after values), read on the member detail 変更履歴 tab. Written **server-side** when this form saves; its existence and contents are this feature's FR-028 outcome.

---

## API Mapping (design doc `fitness-dx CRM API 0.8.0`)

| Purpose                                    | Endpoint in the API design                                                                                                                                 | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load the member into the form              | `GET /api/v1/admin/members/{memberId}` — `getMember`, tag **Member Management**                                                                            | Available. Returns `personalInfo { lastName, firstName, lastNameKana, firstNameKana, gender, dateOfBirth, email, phone, postalCode, prefecture, streetAddress, building, … }`                                                                                                                                                                                                                                                                                                                               |
| **Save the edited personal information**   | `PATCH /api/v1/admin/members/{memberId}` — added 2026-08-10                                                                                                | **Closed.** The backend added the update endpoint (HQ / System only; withdrawn members remain editable, anonymised ones do not). Our transport still posts to `PATCH /crm/members/{id}` with `UpdateMemberRequest.basic_info`, now carrying family and given name as four separate fields to match. Remaining transport-level gaps are listed below                                                                                                                                                         |
| Read back the audit record a save produced | `GET /api/v1/admin/members/{memberId}/change-history` — `AdminMemberRelationsController_changeHistory`, tag **Admin - Member Relations History (API-097)** | Available and integrated on the member detail 変更履歴 tab. Two backend gaps affect how the record reads (both recorded against member-detail, not this form): the item's `snapshot` is a **raw DB row** instead of `changes[]{field, before, after}`, so the field-level diff is computed client-side; and only the `member_change_histories` source is served (the other four UNION sources are TODO upstream) — which is the source a personal-information edit writes to, so FR-028 is verifiable today |

### Field-level mismatches against the API design

**Resolution rule (Session 2026-07-28)**: where the prototype and the API design disagree, **the prototype is authoritative** and the transport layer adapts to it.

| Form field                                   | API design shape                                                                                                                                   | Mismatch                                                           | Resolution                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 都道府県 (select) + 番地 + 建物名            | `prefecture` (2-digit JIS X 0401 code) + `streetAddress` + `building` (three separate fields)                                                      | **Closed 2026-08-21** (qa-167) — implemented 2026-09-04            | **Three controls, mapped one-to-one**: the select holds the JIS code, 番地 → `streetAddress`, 建物名 → `building`. `building` is the only field a `null` clears; 郵便番号 / 都道府県 / 番地 are omitted from the payload when blank, because the API rejects `null` on them. Supersedes the single-box resolution of Q11 |
| 性別 (男性 / 女性 / その他 / **回答しない**) | `gender` enum = `male` \| `female` \| `other` \| `prefer_not_to_say`                                                                               | **Closed 2026-08-10** — the API now carries the fourth value       | **Keep all four options**, stored as `prefer_not_to_say`. The value round-trips as its own state and is never collapsed into 「その他」                                                                                                                                                                                  |
| Field set                                    | `personalInfo` also carries `emergencyContact`, `bloodType`, `facePhotoUrl`, `building`; the member record carries `memo`, `joinRoute`, `referral` | The API exposes more attributes than the form edits                | **Keep the prototype's ten inputs only** (A-01 FR-004's eight groups). Attributes the form does not render are left untouched by a save                                                                                                                                                                                  |
| 郵便番号 (7 digits, optional hyphen)         | `postalCode` — `pattern ^\d{7}$`, `minLength`/`maxLength` 7, documented as "7 digits, no hyphen"                                                   | The wire format takes digits only; the form accepts a typed hyphen | **Normalize on save** — non-digits are stripped before the request and anything but exactly 7 digits is rejected by the form (no input cap — FR-017, 2026-11-06), so the wire value is always 7 digits (FR-017)                                                                                                          |
| 番地 / 建物名 length caps                    | `streetAddress` `maxLength` 200; `building` `maxLength` 100                                                                                        | **Closed 2026-09-15** — the form used to cap both at 255           | **Follow the API** — the form caps 番地 at 200 and 建物名 at 100. Neither A-01 nor the prototype states a length, so the project's 255 default only stood while no other source had a number (FR-017)                                                                                                                    |

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A headquarters operator can correct a member's personal information and confirm the change end-to-end in under 60 seconds from opening the member list.
- **SC-002**: 100% of submissions with a blank required field are blocked, and the operator is shown, without scrolling manually, which field is at fault.
- **SC-003**: 100% of navigations away from a form with unsaved edits raise a confirmation before the edits are lost.
- **SC-004**: 0% of non-Headquarter/System users can reach or complete a personal-information edit.
- **SC-005**: Every field the source requirement declares editable (eight groups) is present on the form, and neither of the two declared non-editable attributes appears — verified item-by-item against the parity checklist.
- **SC-006**: After a successful save, the member's updated values are reflected wherever that member is displayed next (list row, detail head-up) with no manual refresh.

---

## Assumptions

- **A1** — The form always edits an existing member identified from the entry point; there is no anonymous/blank entry route in Phase 1.
- **A2** — ~~郵便番号, 都道府県, 番地 and 建物名 are optional, because the prototype never validates them and A-01 attaches no obligation to them. (Their labels carry no marker at all — Q3.)~~ **Superseded 2026-09-22**: prototype `0a73739` marks 郵便番号 / 都道府県 / 市町村・番地 required and rejects them when blank; 建物名 stayed optional at that time — **superseded again 2026-10-08**: 建物名 became required too; **reverted 2026-11-23** (Bug-No1): 建物名 is optional again (FR-010, FR-016, FR-017).
- **A3** — Save applies to the member's own personal-information record only; nothing on this screen alters contracts, store assignment, status, or billing.
- **A4** — The role gate is enforced both at the entry points and server-side; the client gate alone is not treated as the security boundary.
- **A5** — ~~"Change history is seed only" means the 変更履歴 tab is populated from seeded fixtures; the absence of a real audit write is a known, accepted Phase-1 gap against A-01 FR-004.~~ **Superseded 2026-09-21**: the 変更履歴 record is written server-side by the update endpoint and is read live by the member detail tab, so a missing record after a successful save is a defect, not an accepted gap (FR-028).
- **A6** — Standard CRM conventions apply for anything the prototype leaves unstated: Japanese UI copy, `ja` date formatting, toast-based feedback, and the shared application shell.
- **A7** — ~~Field-level format validation beyond "not blank" is not specified by either source.~~ **Superseded 2026-07-28**: full semantic validation applies per FR-016a/FR-017 (session decision — the prototype's lack of format rules is a mock artefact, not a requirement).

---

## Q&A / Clarification Needed

> **All 12 questions resolved in the 2026-07-28 clarification session** (see `## Clarifications`). Kept for traceability — each item records its context, impact, and final resolution.

### Q1 — Does `member-form` need a 新規登録 (create) mode in Phase 1?

**Context**: `src/pages/map/screens.ts:1679–1689` registers `member-form` with **two** states — `member-form-create` 「新規登録」 and `member-form-edit` 「編集」 — and describes it as 「会員の新規登録・編集フォーム。基本情報・連絡先・契約情報・決済情報・備考の5セクション。」. The implemented `member-form.tsx` has a hard-coded title 「会員情報を編集」, seeds itself from an existing record, and renders **one** section (個人情報). A-01 FR-004 defines only an edit form; new members arrive via C-01 入会申請管理.
**Question**: Is the create mode (and the 5-section shape) obsolete map metadata, or in-scope work?
**Impact**: Scope — an entire second mode plus four more sections.
**RESOLVED (2026-07-28)**: Prototype wins — the implemented `member-form.tsx` is edit-only with one section, so that is the scope. The screen-map metadata is treated as stale; create stays _Out of Scope for Phase 1_.

### Q2 — Where should a successful save land, and what should the toast say?

**Context**: `member-form.tsx:128–129` shows `toast.success("会員を登録しました")` (「registered」, not 「updated」) and then `navigate("member-list")`. But the form is an **edit** form, and one of its two entry points is the **member detail** header (`member-detail.tsx:2943`), so an operator who came from the detail screen is dropped on the list instead of back where they started.
**Question**: (a) Should the toast read 「会員情報を更新しました」? (b) Should the form return to the entry point (detail → detail, list → list) or always to the list?
**Impact**: UX — the current behaviour is a mismatch on both counts.
**RESOLVED (2026-07-28)**: Toast reads 「会員情報を更新しました」; a successful save always navigates to the **member detail** of the edited member (the operator immediately sees the updated values). This matches the current project implementation; the prototype's copy is treated as a defect and its list destination is superseded (FR-024).

### Q3 — Are 郵便番号 and 住所 optional, and should they carry the 任意 marker?

**Context**: `member-form.tsx:225` and `:235` call `FormField` with neither `required` nor `optional`, so **no** marker renders — while every other field on the card is marked required. `src/components/field-marker.tsx` states 必須と任意は排他 and expects the marker to be driven by those props, implying a field should carry one of the two.
**Question**: Are these two fields optional (and therefore should show the 任意 chip), or is the missing marker a prototype omission and they are in fact required?
**Impact**: UX + validation — affects FR-016 / FR-017.
**RESOLVED (2026-07-28)**: ~~Prototype wins — both fields are optional (never validated) and render **no marker**, exactly as V0 does (FR-017). The field-marker convention question is left to the prototype owners.~~
**RE-RESOLVED (2026-09-22)**: The prototype still wins, but it has since changed: `0a73739` (2026-09-16) marks 郵便番号, 都道府県 and 市町村・番地 `required` with blank messages of their own, and gives 建物名 the 任意 marker. The missing marker was therefore a prototype omission, now corrected upstream — the field-marker convention (必須と任意は排他) holds on every control of the card. FR-010, FR-011, FR-016 and FR-017 record the current rule.

### Q4 — Should the form carry any fields beyond A-01 FR-004's eight?

**Context**: A-01 FR-004 lists exactly 氏名・フリガナ・生年月日・性別・郵便番号・住所・電話番号・メールアドレス, and the prototype matches that list one-for-one. However the API design's `personalInfo` also carries `emergencyContact`, `bloodType`, `facePhotoUrl` and `building`, and the member record carries `memo`, `joinRoute` and `referral`.
**Question**: Is the FR-004 eight-field list authoritative for Phase 1, or should any of those extra attributes be editable here too?
**Impact**: Scope + data model.
**RESOLVED (2026-07-28)**: Prototype wins — the form renders exactly the ten inputs in `member-form.tsx` (FR-004's eight groups). The extra API attributes are _Out of Scope for Phase 1_ and are left untouched by a save.

### Q5 — Should the footer summary 「未入力の項目があります」 clear as fields are fixed?

**Context**: `member-form.tsx:117` sets the summary flag on a failed submit; the per-field messages are cleared on change (L166 etc.) but the summary flag is only reset inside `handleSubmit` (L126). The footer message therefore stays visible even after every inline message has gone.
**Question**: Should the summary disappear once the last inline message clears, or persist until the next submit?
**Impact**: Minor UX polish.
**RESOLVED (2026-07-28)**: Prototype wins — the summary persists until the next 「保存する」 press re-evaluates it.

### Q6 — What are the loading and error states for this screen?

**Context**: The prototype seeds the form from a constant (`EDIT_DATA`, L37–48), so it has no loading skeleton, no fetch-failure state, and no save-failure feedback. Against the real API the form must fetch `GET /api/v1/admin/members/{memberId}` and can fail (404, out-of-scope 403, network error).
**Question**: What should render while the member loads, and what should happen when the load or the save fails?
**Impact**: UX — three undefined states on a write screen.
**RESOLVED (2026-07-28)**: Use the project's shared data-state boundary for the fetch — loading placeholder, and an error state with a retry action (FR-029 / FR-030) — and an error toast for save failures that keeps the operator on the form with their input intact and the form still dirty (FR-031). This matches the sibling CRM form screens.

### Q7 — Can a withdrawn (退会済み / 強制退会) member's personal information be edited?

**Context**: `member-detail.tsx:2941` hides the 編集 button when the member's status is 退会済み, but the form itself has no guard, so a direct URL still opens an editable form. A-01 does not state whether a withdrawn member's PII is editable (it does forbid **deleting** PII for blacklisted / unpaid members, FR-018).
**Question**: Should the form refuse to edit a withdrawn member, and if so with what message?
**Impact**: Business rule + an additional screen state.
**RESOLVED (2026-07-28)**: Yes — block editing for 退会済み / 強制退会 on the page itself with 「退会済みの会員は編集できません」, 再入会 guidance, and a return-to-detail action (FR-033).

### Q8 — Who writes the 変更履歴 audit record for an HQ edit?

**Context**: A-01 FR-004 requires 「HQ/Systemによる編集時は変更履歴タブに記録」, and the API design describes `member_change_histories` as one of the five UNION sources behind `GET …/change-history`. The instruction at the time was that change history is **seed only** — no create/update/delete.
**Question**: Confirm that no audit record is produced by this feature in Phase 1, and that history writing is a backend responsibility tracked separately (i.e. the FR-004 audit obligation is knowingly deferred).
**Impact**: Compliance / audit trail.
**RESOLVED (2026-07-28)**: ~~Confirmed — seed only (FR-028); the gap is accepted for Phase 1.~~
**RE-RESOLVED (2026-09-21)**: The seed-only restriction is **removed**. The **backend** writes the record, inside the same `PATCH /api/v1/admin/members/{memberId}` transaction — this screen still issues no history request of its own. `member_change_histories` is the one source the change-history endpoint actually serves today, and the member detail 変更履歴 tab reads it live, so the obligation is both in force and testable: after a successful save the record must exist and must name the operator, the timestamp and the changed attributes (FR-028).

### Q9 — Should the form page itself enforce the HQ/System gate?

**Context**: The role gate lives only on the entry affordances (`RoleGatedMenuItem` in member-list, `RoleGatedButton` in member-detail). `member-form.tsx` renders no gate, so a Manager or Staff reaching the URL directly sees a fully editable form.
**Question**: Should the page render a permission-denied state for non-HQ/System roles, or is the server rejection (FR-027) considered sufficient?
**Impact**: Security / UX.
**RESOLVED (2026-07-28)**: The page renders its own permission-denied state for non-HQ/System roles (FR-032), in addition to the entry-point gate (FR-026) and the server rejection (FR-027).

### Q10 — There is no API for saving member personal information. Which contract should this screen use?

**Context**: In `fitness-dx CRM API 0.8.0` the _Member Management_ tag exposes only `GET /api/v1/admin/members/{memberId}` for the member resource — plus gate-stop, anonymise, blacklist, linking-QR and bulk plan-change. **No** `PUT` / `PATCH` / `POST` endpoint exists for updating a member's PII, and the tag description frames PII writes as "HQ-only PII **anonymization**" only. Without such an endpoint, FR-024 (save) has no backend contract.
**Question**: Is an update endpoint (e.g. `PATCH /api/v1/admin/members/{memberId}`) planned but not yet published, or is CRM-side PII editing intentionally excluded from the backend design (member-app-only)? If planned, what are its path, request shape and error codes?
**Impact**: **Blocking** — this is the screen's primary action; without an agreed contract the save path can only be implemented against the project's local mock.
**RESOLVED (2026-07-28)**: Use the project's **existing** member-update mock — `PATCH /crm/members/{id}` with `UpdateMemberRequest.basic_info` — sending only the eight FR-004 field groups (`profile_info` is not touched by this screen). Do **not** re-shape the mock to a speculative backend path. The absence of a published PII-update endpoint is raised with the API owners as a separate follow-up, and the client is realigned when the real contract lands.

### Q11 — How does the single 住所 input map to the API's three address fields?

**Context**: The form has one free-text 住所 box (`member-form.tsx:235–241`); `getMember.personalInfo` splits the address into `prefecture` (2-digit JIS X 0401 code), `streetAddress` and `building`.
**Question**: Should the form be split into 都道府県 (select) / 市区町村・番地 / 建物名 to match the API, or should a single string be sent and decomposed server-side?
**Impact**: Data integrity — a JIS prefecture code cannot be reliably derived from free text, and a round-trip through one box loses the `building` split.
**RESOLVED (2026-07-28)**: ~~Prototype wins — keep the single free-text 住所 box. The address is carried as one string; any decomposition is a transport-layer concern. Raise the three-part shape with the API owners as a follow-up rather than changing the form.~~
**RE-RESOLVED (2026-08-21, customer — qa-167; implemented 2026-09-04)**: **Split the box** into 都道府県 (select, JIS code) / 番地 / 建物名, mapping one-to-one onto the API's three fields. The prototype-wins rule does not apply: the customer overrode the prototype directly, and `member-form.tsx` has not been updated since 2026-06-22. The UI-structure section above still records the older one-box layout — see its drift notice.

### Q12 — 性別 has four options in the UI but three values in the API. Which wins?

**Context**: `member-form.tsx:215–218` offers 男性 / 女性 / その他 / 回答しない; the API design's `Member_Management_Gender` enum is `male` \| `female` \| `other` (nullable).
**Question**: Should 「回答しない」 map to `other`, to `null`, or should the option be removed from the UI?
**Impact**: Data integrity — 「その他」 and 「回答しない」 are semantically distinct and would collapse if both mapped to `other`.
**RESOLVED (2026-07-28)**: Prototype wins — all four options stay in the UI and 「回答しない」 must round-trip as its own value (it must not be collapsed into 「その他」). The three-value API enum is the side that needs extending; raise it with the API owners as a follow-up.
