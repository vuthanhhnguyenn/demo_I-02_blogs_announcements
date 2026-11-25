# Test Plan: Member Form (会員情報を編集)

**Feature spec**: [spec.md](../spec.md)
**PO Spec**: `A-01` — 会員管理 FR-004 (会員情報の参照・編集【ヘッドアップ】), screen id `member-form`
**Created**: 2026-09-21
**Integration round**: **Round 2** — prefill and save both run against the real dev backend
(`NEXT_PUBLIC_REAL_API_URL = https://api.dev.fitness-v2.okamoto-hd.com`): `GET /api/v1/admin/members/{memberId}`
for the prefill, `PATCH /api/v1/admin/members/{memberId}` for the save. No mock path remains on this screen
(integration report lượt 3–7, 2026-08-25 → 2026-09-04). **Lượt 7 (the 3-control address split) was never
verified in a browser or against the live API** — this run is its first real verification.
**Consumed by**: `gen-testcases` → `execute-testcases`

---

## 1. Scope

**In scope** — the standalone member **edit form**, route `/members/{memberId}/edit`:

- Page shell, page header (back link + title + member subtitle), the single 個人情報 card with all twelve
  controls, the footer action bar and its failed-submit summary.
- Client validation (blank + format), the save path, the cancel path.
- The discard dialog 「変更を破棄しますか？」 — it exists only inside this screen and only on top of a dirty
  form, so it is tested with it.
- The three non-form page states that replace the form: loading, load error, and the two block screens
  (role-denied FR-032, withdrawn-member FR-033).

**Out of scope** (navigation targets / other features' units — a case may confirm the link fires, never the
destination):

- Member **list** `/members` — [specs/019-member-list](../../019-member-list). The 編集 row-menu item, its
  role gate and its withdrawn-member gate are **already covered there** (TC-045, TC-046, TC-107).
- Member **detail** `/members/{id}` — [specs/032-member-detail](../../032-member-detail). The 編集 header button and
  its role gate are covered in that feature's Unit 1; the 変更履歴 tab and the 基本情報 tab are its units too.
- **New-member registration** (`member-form-create`) — no such mode exists in Phase 1 (spec Q1); members are
  created through C-01 入会申請管理.
- 会員種別 / 所属店舗 changes (→ FR-006 主契約変更, A-02 移籍), 個人情報の削除 (FR-018), ゲートストップ /
  ブラックリスト / ステータス変更 — all separate features on the member detail screen.
- The **変更履歴 tab's own UI** (columns, paging, empty state) — owned by [specs/032-member-detail](../../032-member-detail). The **audit record a save produces** is in scope here (FR-028, rewritten 2026-09-21): this unit asserts the record exists and describes the right change, read back on that tab.
- Login / password reset — obtaining a session is a precondition here.

---

## 2. Unit table

One screen, one unit. The discard dialog and the three block/error states are not reachable except from this
route and only make sense against a loaded (or deliberately unloadable) form, so splitting them off would
break the flow under test.

| #   | Unit        | Screen(s)                                                             | Route                      | TC doc filename                                  |
| --- | ----------- | --------------------------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| 1   | Member form | 会員情報を編集 + discard dialog + loading / load-error / block states | `/members/{memberId}/edit` | `TC -【Fitness CRM】- [A-01][会員情報を編集].md` |

The TC doc lives under `specs/020-member-form/tests/cases/`. It does **not** exist yet — `gen-testcases`
authors it from scratch.

---

## 3. Sources per unit

| Unit            | Spec sections                                                                                                                                                        | UI prototype file                                                     | FRs covered              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------ |
| 1 — Member form | spec.md §Overview, §Scope, User Stories 1–4, all Edge Cases, FR-001 – FR-033 (incl. FR-013a, FR-016a), §UI Structure, §UI States, §API Mapping, §Assumptions, Q1–Q12 | `.cache/fitness-crm-ui/src/pages/member-form.tsx` @ `0a73739` (362 L) | FR-001 – FR-033 (see §7) |

Supporting sources for Unit 1, read **only** these slices:

- `.cache/fitness-spec/crm/requirements/A-01.md` @ `a5abfdb` — **FR-004** (L364–374: the eight editable
  groups, the two 編集対象外 attributes, the HQ-only rule, the 変更履歴 obligation), **権限マトリクス**
  (L565–573, the 個人情報変更 column), and 前提条件 L186 (「個人情報の変更は本人または本部のみ」). Ignore
  every other A-01 FR — they belong to the list and detail features.
- [checklists/parity.md](../checklists/parity.md) PAR001–PAR079 — element/state inventory. ⚠️ **Stale for the
  address block**: PAR015, PAR027, PAR030, PAR031 and PAR050 were written against the one-box 住所 prototype
  (`426a9b3`). The prototype has since split the address (`0a73739`) and the screen shipped the split on
  2026-09-04. Re-sync those rows before ticking (see §10).
- [api-integration-output/member-form/report.md](../../../api-integration-output/member-form/report.md) —
  **not an oracle**; the register behind §6, and the source of the verified server-side constraints in §5.

---

## 4. Spec-vs-prototype deltas

The prototype moved (`426a9b3` → `0a73739`, 2026-09-17) **after** spec.md was written, so several of these are
new. `gen-testcases` MUST mark each of them in the affected case's Notes.

| #   | Item                               | In spec                                                                                                                                                                                                     | In prototype (`0a73739`)                                                                                                        | How to test                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 郵便番号 obligation                | FR-010 / FR-016 / FR-017 (current text): **required**, with the shared required marker                                                                                                                      | `required` marker + blank message 「郵便番号を入力してください」 (L133, L265)                                                   | **No conflict.** The spec was re-resolved on 2026-09-22 in favour of the prototype and the PO reconfirmed it on 2026-09-23. Test as required. The earlier 'spec says optional' reading came from the superseded A2 / Q3 text.                                                 |
| D2  | 都道府県 obligation                | FR-010 / FR-016 / FR-017 (current text): **required**                                                                                                                                                       | `required` marker + 「都道府県を選択してください」 (L141, L271)                                                                 | Same as D1 — no conflict; test as required.                                                                                                                                                                                                                                   |
| D3  | 番地 label + obligation            | FR-007/FR-017: label **番地**, optional, no marker, ≤200 chars                                                                                                                                              | label **市町村・番地**, `required`, 「市町村・番地を入力してください」 (L142, L283)                                             | **Split verdict.** The _label_ 市町村・番地 is UI detail the prototype owns and the screen already ships it — assert 市町村・番地 and note that spec.md FR-007 still says 番地. The _obligation_ follows the spec (optional) and is part of **B5**.                           |
| D4  | 建物名 marker                      | FR-017 (amended 2026-11-23, Bug-No1): 郵便番号 / 都道府県 / 市町村・番地 required with the required marker; 建物名 optional with the 任意 marker _(2026-10-08 to 2026-11-23 it was required, no 任意 chip)_ | `optional` marker (任意 chip) on 建物名 (L292)                                                                                  | **Conflict.** Spec wins → assert no 任意 chip, note the prototype's chip. Folded into the **B5** question so all four address fields are decided together.                                                                                                                    |
| D5  | Address row layout                 | FR-008 (current text): 郵便番号 on **its own row** with a narrow fixed-width input; 都道府県 on a **half-width row of its own**; 市町村・番地 and 建物名 each full-width                                    | 郵便番号 alone on a full-width row (200px input), 都道府県 alone inside a 2-col grid, then 市町村・番地, then 建物名 (L262–295) | **No conflict.** FR-008 already describes exactly this arrangement; the 'two-column pair' reading was of the pre-2026-09-22 text. Assert the current FR-008.                                                                                                                  |
| D6  | Back-link label                    | FR-002 (current text): 「会員詳細に戻る」                                                                                                                                                                   | 「会員詳細に戻る」 when a `memberId` is in the URL, 「会員管理に戻る」 otherwise (L179)                                         | **No conflict.** FR-002 was rewritten on 2026-09-22 to the prototype's label; PO reconfirmed 2026-09-23. Assert 「会員詳細に戻る」.                                                                                                                                           |
| D7  | Back-link / キャンセル destination | FR-003 + FR-025 (current text): the edited member's **detail** screen                                                                                                                                       | `goBack()` → member **detail** when a target member is known (L114–120, L181, L326)                                             | **No conflict.** Both FRs were rewritten on 2026-09-22 to the detail destination, matching FR-024; PO reconfirmed 2026-09-23.                                                                                                                                                 |
| D8  | Page-header subtitle               | Silent — §UI Structure lists only breadcrumb + title                                                                                                                                                        | subtitle 「{氏名}（ID: {id} / 旧No: {formerNo}）」 (L184)                                                                       | **Spec-silent → prototype supplies the detail.** Test as built (whatever the screen renders), `OK`-with-note. If the screen renders no subtitle, that is a note for the PO, not an `NG`.                                                                                      |
| D9  | 建物名 placeholder                 | FR-011 (current text): 「例: 神宮前ビル 3F」                                                                                                                                                                | 「例: 神宮前ビル 3F」 (L294)                                                                                                    | **No conflict.** FR-011 already carries the prototype's string.                                                                                                                                                                                                               |
| D10 | 都道府県 stored value              | FR-013a: the select holds and sends the **2-digit JIS X 0401 code** (`01`–`47`); the 47-entry table lives in the frontend                                                                                   | the select's value **is the prefecture name** (`PREFECTURES.map`, L273–277)                                                     | **Spec wins** — the customer ruled directly (qa-167, 2026-08-21) and the API rejects names (`pattern ^(0[1-9]\|[1-3][0-9]\|4[0-7])$`). Invisible in the UI (both render names), so assert it **on the wire**: the PATCH body must carry `prefecture: "13"`, never `"東京都"`. |
| D11 | 郵便番号 / 電話番号 auto-format    | FR-016a + FR-017: typing digits only auto-inserts the separators (`1500001` → `150-0001`; `09012345678` → `090-1234-5678`), display-only; saved bare                                                        | no formatting code at all                                                                                                       | **Spec-only** (mobile-app parity, 2026-09-15). Test the full prefix table in FR-016a (3-4-4 / 4-3-4 / 4-3-3 / 2-4-4 / 3-3-4) and confirm the wire value is always bare digits.                                                                                                |
| D12 | Validation depth                   | FR-016a/FR-017: full semantic validation (katakana, JP phone, email shape, ≤50 / ≤200 / ≤100, 7-digit postal)                                                                                               | `validate()` checks **blank only** (L127–143)                                                                                   | **Spec wins** (Clarifications 2026-07-28 — A7 superseded). The prototype's blank-only rule is a mock artefact. Every format rule gets its own case.                                                                                                                           |
| D13 | 保存する enabled state             | FR-023: **disabled** while the form is pristine and while a save is in flight                                                                                                                               | always enabled (L334)                                                                                                           | **Spec wins** (explicit post-implementation decision). Assert disabled-on-pristine and disabled-during-submit.                                                                                                                                                                |
| D14 | Loading / load-error / save-error  | FR-029 / FR-030 / FR-031 — shared loading state, shared error state with retry, error toast that keeps the input                                                                                            | none (the prototype seeds from a constant)                                                                                      | **Spec-only.** Cases written to the spec; the prototype offers no reference rendering, so judge against the project's shared states used by sibling form screens.                                                                                                             |
| D15 | Role-denied / withdrawn block      | FR-032 / FR-033 — permission-denied state; 「退会済みの会員は編集できません」 with 再入会 guidance and a return-to-detail action                                                                            | none (the prototype has no page-level gate)                                                                                     | **Spec-only** (Q7, Q9). Cases written to the spec.                                                                                                                                                                                                                            |
| D16 | 番地 / 建物名 length caps          | FR-017: **200** / **100** characters, from the API                                                                                                                                                          | no cap                                                                                                                          | **Spec-only.** Assert the client cap **and** that the server agrees (`streetAddress` maxLen 200, `building` maxLen 100).                                                                                                                                                      |
| D17 | 変更履歴 audit record              | FR-028 (**rewritten 2026-09-21**): a successful save MUST be recorded with when / who / which attributes changed (before → after); a failed save MUST leave no record. The write is server-side             | n/a                                                                                                                             | **Spec-only, and now a real pass/fail outcome.** Read the record back on the member detail 変更履歴 tab after a save. The tab's own rendering is out of unit; the _record_ is not. Two backend gaps shape what the tab can show — see **B7**.                                 |

---

## 5. Coverage focus per unit

Added to — never a replacement for — `gen-testcases`' full coverage walk (every field, every state, every
control).

**Unit 1 — Member form**

_Real-API behaviours (phase 2, in scope):_

- **Server-side validation beyond the client's.** The dev backend enforces every rule below; each one must
  surface as a usable Japanese message on the form, never as a silent no-op or a raw code. Verified constraints
  on `UpdateMemberProfileAdminDto` (integration report, lượt 6):
  | field | server rule |
  | --- | --- |
  | `lastName` / `firstName` | 1–50 |
  | `lastNameKana` / `firstNameKana` | 1–50, `^[ァ-ヶーヽ　 ]+$` (full-width katakana) |
  | `dateOfBirth` | `^\d{4}-\d{2}-\d{2}$` **and must be in the past** |
  | `email` | 3–254, `format: email` |
  | `phone` | ~~10–11, `^0[0-9]{9,10}$` — **JP domestic only**, no hyphens, no `+81`, no `+84`~~ JP domestic or E.164, `^0[0-9]{9,10}$\|^\+[1-9][0-9]{1,14}$`, max 16; stored as E.164 _(API-093 §18.3 v0.14, 2026-10-30 — A-01 Bug-No19)_ |
  | `postalCode` | exactly 7 digits, `^\d{7}$` — a hyphen on the wire is rejected |
  | `prefecture` | exactly 2 chars, `^(0[1-9]\|[1-3][0-9]\|4[0-7])$` |
  | `streetAddress` | 1–200, **rejects `null`** |
  | `building` | 1–100, **the only field `null` may clear** |
  | body `{}` | `400 "At least one field is required"` (B2) |
  Probe at least: a past-date boundary (today and tomorrow must be rejected), a hiragana / romaji フリガナ, a
  51st character, `+81…` and a hyphenated phone, a hyphenated postal code on the wire.
- **The `null` / omit contract (the lượt-7 change this run first verifies).** For a member that has a
  `building`: save **without touching anything** → `building` must come back unchanged (the old bug sent
  `building: null` every time and silently wiped it). Then clear 建物名 → ~~**(amended 2026-10-08)** the save must be refused with 「建物名を入力してください」 and no request sent~~ **(amended 2026-11-23, Bug-No1)** the save succeeds and the request carries `building: null`, which clears the stored value; 建物名 is optional again (TC-127, TC-153–TC-155). No other address key may ever be sent as `null`.
- **The prefecture round-trip.** Prefill of a member stored with a JIS code (`'27'`) must show 大阪府, and the
  next save must send `'27'`. Prefill of one of the 7 legacy rows stored with a **name** (`'青森県'`) must also
  show the right prefecture, and saving must normalise it to `'02'` (B3).
- **Error codes the screen can receive**: `400 E-VAL-001` (any of the rules above), `401 E-AUTH-002` (expired
  token), `403` (non-HQ save — FR-027), `404` (member gone), `409 E-MEM-229`, `500 E-SYS-001` (a `memberId`
  that is not a UUID — B1). Each must produce a distinguishable, Japanese, actionable message; a failed save
  must keep every entered value and leave the form dirty (FR-031).
- **401 / session expiry**: the staff token lives ~1 hour. Cover both an expired-token **prefill** (must land
  in the FR-030 error state or re-authentication, never a blank form) and an expired-token **save** (must not
  lose the operator's input).
- **Server-enforced role gate (FR-027)**: independent of the UI gate. Because FR-032 blocks the page for
  non-HQ roles, this is verified **outside the UI** — issue the same PATCH with a Manager / Staff / Observer /
  Trainer token and expect a rejection (403). Record the actual status and code.
- **Persistence**: after a successful save, re-open the form and confirm every changed value is what the
  server returns; then confirm the member detail head-up and the member list row show the new values with no
  manual refresh (SC-006 — the save invalidates the real list query key).
- **Two-tab / concurrency (spec Edge Case "Concurrent edit")**: two tabs on the same member, both dirty, saved
  one after the other — last write wins, no crash, no partial merge. Record what the second tab overwrites.
- **Untouched attributes stay untouched (FR-024)**: snapshot the member before the run and diff after the
  save — `emergencyContact`, `bloodType`, `facePhotoUrl`, `memo`, `joinRoute`, `referral`, contract and store
  data must be byte-identical.
- **Audit record (FR-028, now in scope)**: after a successful save, the member detail 変更履歴 tab must show a
  new entry for it. Verify **when** (timestamp of the save), **who** (the signed-in HQ/System operator by
  name, not a UUID), and **which** attributes changed with their before → after values — and that attributes
  the operator did not touch do **not** appear. Verify the negative too: a **failed** save (a server
  rejection from the group above) must leave **no** new record. A single-field edit and an all-fields edit
  give different expected record contents; cover both.

_UI breakage under stress — run every one of these at the **1024px floor**:_

- 50-character full-width Japanese 氏名（姓）and 氏名（名）together, plus the same length in フリガナ, in the
  inputs, in the page-header subtitle (D8) and wherever the form echoes them.
- A 200-character 市町村・番地 and a 100-character 建物名, and an equally long unbroken ASCII token in each.
- A 254-character メールアドレス; the longest prefecture label (神奈川県 / 鹿児島県) in the select trigger and
  in the open list.
- All eight blank-field messages showing **at once** (clear every required field and submit): the card must
  grow, nothing may clip or overlap, and the footer summary must stay on the same row as the two buttons.
- The discard dialog over a form with every field at maximum length.
- In every case: no page-level horizontal overflow, no clipped or overlapping text, the footer actions still
  reachable, and the scroll region still the form area only (FR-001, FR-004).
- One wide pass at **≥1440px**: the 960px column stays centred and capped.

_Unit-specific business logic:_

- **Field inventory (FR-007, FR-014, SC-005)**: exactly twelve controls in the declared order, inside exactly
  one 個人情報 card; **no** 会員種別 and **no** 所属店舗 anywhere on the page; no second section.
- **Required markers (FR-010)**: the eleven FR-010 required fields carry the required marker and 建物名 carries the shared 任意 marker (amended 2026-11-23, Bug-No1: 建物名 is optional again, matching the member app; it was required from 2026-10-08) — per D1–D4.
- **Prefill fidelity (FR-005)**: every one of the twelve controls pre-populated from the member's stored
  values, including 性別 = 回答しない round-tripping as itself and never collapsing into その他 (spec Q12), and
  an empty stored value rendering as an empty control, not as a placeholder-looking default.
- **Validation timing (FR-015)**: nothing validates on blur or on change — only 「保存する」.
- **The eight blank messages, verbatim (FR-016)**, plus whitespace-only treated as blank, plus the rule that a
  blank required field shows **only** its blank message and never a format message.
- **Message clearing (FR-019)**: typing a non-blank value clears that field's message immediately; choosing a
  date clears 生年月日; choosing any 性別 value clears it; and the **footer summary does not clear** until the
  next submit (FR-017's Edge Case / Q5).
- **Brand minimum age (FR-016b, added 2026-10-15)**: 生年月日 below the member's brand floor is refused with
  「{n}歳未満の方はご利用できません」 (JOYFIT 15 / FIT365 16 — the number must be the brand's own), no request is sent,
  the day the member turns n is accepted and the day before is not, and the message clears on choosing a valid
  date. Needs one JOYFIT and one FIT365 member; accepted-side cases must not write (intercept the PATCH).
- **Failed-submit behaviour (FR-018)**: no save request is issued at all (watch the network), every offending
  control is `aria-invalid`, the summary 「未入力の項目があります」 renders, and the **first** invalid control
  in DOM order (氏名（姓）) is scrolled to the centre.
- **Dirty tracking (FR-020 – FR-022)**: any change in any of the twelve controls marks dirty; cancel and the
  back link both raise the dialog while dirty and navigate immediately while clean; 「編集を続ける」 and a
  dismiss (Esc / overlay) both keep every edit; 「破棄する」 runs the pending navigation; `beforeunload` fires
  on reload/close while dirty; and a **successful save raises no dialog** on its own navigation.
- **Save path (FR-023, FR-024)**: 保存する disabled while pristine and while in flight (double-click guard),
  right-aligned footer order キャンセル → 保存する, toast 「会員情報を更新しました」, navigation to
  `/members/{memberId}`.
- **Block states (FR-032, FR-033)**: direct URL as Manager / Staff / Observer / Trainer → permission-denied,
  not a form; direct URL for a `withdrawn` / `forced_withdrawal` member as HQ → 「退会済みの会員は編集できません」
  with 再入会 guidance and a working return-to-detail action. Also confirm the reverse: System and Headquarter
  both reach the form.
- **Entry-point confirmation only (FR-026)**: one case that the member-list row 編集 and one that the member-detail
  header 編集 land on this route for the **right** member id. The gating itself is already covered by
  019 TC-045 / TC-046 / TC-107 and by the member-detail unit — do not re-author it here.

---

## 6. Known Round 1/2 gaps

Carried from [api-integration-output/member-form/report.md](../../../api-integration-output/member-form/report.md)
(this feature has no `integration-plan.md`; that report is the register). Treatment for all rows: the case is
**written to the spec** and a failure matching the row is recorded **`Block (Bn)`** — an undocumented failure
is `NG`.

| Bn     | Blocker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Behaviour in the running screen                                                                                                                                                                                                                 | Test treatment                                                                                                                                                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | BE, open since lượt 1 — a `memberId` that is not a UUID answers `500 E-SYS-001` instead of a `400` validation error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `/members/M-00001/edit` lands in the FR-030 error state, but for the wrong reason.                                                                                                                                                              | Write the malformed-id case to FR-030 (error state + retry). The state itself is a pass; record the `500` as `Block (B1)` if the case asserts the status.                                                                                                                                            |
| **B2** | BE, open since lượt 3 — `UpdateMemberProfileAdminDto.required = []` yet an empty body answers `400 "At least one field is required"`; the constraint is undocumented.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Unreachable from the UI today (保存する is disabled while pristine, FR-023), so no user-visible defect.                                                                                                                                         | No UI case. Note only, so an empty-payload `400` seen during a probe is not mistaken for a screen defect.                                                                                                                                                                                            |
| **B3** | BE — 7 dev members still store `prefecture` as a **prefecture name** (`青森県`×4, `北海道`×2, `滋賀県`×1); the API itself now rejects that value. **Verified on real data 2026-09-23 (TC-025 / TC-130)**: `JF-0000030` stores `青森県` and the form resolves it to its option and renders it correctly, so reads are safe. Writes do **not** normalise it: the form re-sends only changed keys, and because 都道府県's baseline is the resolved option, re-picking 青森県 leaves 保存する disabled. A legacy row is normalised only if the operator picks a **different** prefecture. Needs a BE migration; the form cannot fix it. **Count corrected 2026-09-23** — a full scan of all 244 dev members found **17**, not 7, storing a prefecture name: 青森県 x8, 北海道 x5, 岩手県 x2, 滋賀県 x1, 東京都 x1 (`JF-0000002 / 03 / 04 / 05 / 06 / 07 / 10 / 30 / 70 / 79 / 81 / 82 / 83 / 84 / 85 / 208 / 211`). **CLOSED 2026-09-23 — migrated.** All 17 rows were patched to their JIS code through the admin API and verified by read-back; a re-scan of all 244 members finds none left. Before-values are kept for rollback.                                                                                                                                                                                                                                                                                                                                                    | The form normalises on read, so the select shows the right prefecture and the next save rewrites it to the JIS code.                                                                                                                            | Write the legacy-row prefill case. If the save of such a member fails for the prefecture, → `Block (B3)`, naming the member.                                                                                                                                                                         |
| **B4** | BE — `JF-0000030` stores a non-JP phone (`+84962150299`); the API now accepts JP domestic only, so **that member cannot be saved at all**, even with no edits. **No longer reproduces (TC-135, 2026-09-23)**: a partial update on `JF-0000030` that changes only 建物名 succeeds (200, toast, 変更履歴 entry) although the stored phone is still `+84962150299`. The member is usable again; its phone remains unmigrated and renders unformatted. **REOPENED 2026-09-23 as a client-side block**: the BUG-MF-05 fix makes submit-time validation cover every field, so `JF-0000030`'s own stored `+84962150299` now fails FR-016a and the form refuses the save before any request is issued. The member is uneditable until BE migrates the number — accepted by the PO as the same principle as the address rule (B5). **PARTLY CLOSED 2026-09-23.** `JF-0000030` was migrated with the PO's approval (`+84962150299` → `09010000030`, the seed's own `0901000NNNN` dummy convention) and `JF-0000004` was folded losslessly from E.164 (`+819075463559` → `09075463559`); both verified by read-back, and TC-135 now passes. **Still open: 18 members hold a `+84…` number** and none of them can be saved at all now that validation covers every field. They were deliberately left alone — a JP number cannot be derived from a Vietnamese one, and the repeats (`+84962150299` on 5 records) look like real numbers belonging to the team. The team must decide per record. | Save answers `400 E-VAL-001` with the phone message although the operator changed nothing.                                                                                                                                                      | **Do not use `JF-0000030` as a test member.** If a case must use it, → `Block (B4)`. The FE cannot normalise a real foreign number. **Closed 2026-10-30** — the API takes E.164 (A-01 Bug-No19), so a stored `+84…` number is valid and saves (TC-135 re-run on `JF-0000081`).                       |
| **B5** | **CLOSED 2026-09-23 — the PO ruled for the prototype: the three are required.** This was never truly open: the spec had already been re-resolved the same way on 2026-09-22 (FR-010, FR-016, FR-017), and this plan quoted the superseded A2 / Q3 text. **Decision input, measured 2026-09-23**: 203 of 244 members (83%) hold `postalCode`, `prefecture` and `streetAddress` as null. Consequence the PO accepted: once BUG-MF-05 is fixed those 203 members cannot be saved until an address is supplied. Back-filling them is a BE matter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | The screen submits with all four blank.                                                                                                                                                                                                         | Test the **spec** (optional). Every affected case carries the open question in Notes; a mismatch with the prototype is **not** an `NG`. → `Block (B5)` only if the PO rules for "required" mid-run.                                                                                                  |
| **B6** | Dev seed depth — 31/72 members carry all form fields, only **7/72** carry a `building`, and nothing in the seed is near the 50 / 200 / 100 / 254-character caps.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Long-value stress cases can only use what the operator types in; the round-trip of a _pre-existing_ long value cannot be observed.                                                                                                              | Type the long values into the form (this screen **can** create its own test data, unlike the list). Where a case needs a pre-existing long stored value → `Block (B6)`, quoting the longest found.                                                                                                   |
| **B7** | Two BE gaps on `GET /api/v1/admin/members/{memberId}/change-history` (recorded against **member-detail**, integration report 2026-08-22, still open): the item's `snapshot` is a **raw DB row** instead of `changes[]{field, before, after}`, so the field-level diff is reconstructed client-side; and only the `member_change_histories` source is served (the other four UNION sources are TODO upstream).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | The 変更履歴 tab renders, and the source a personal-information edit writes to **is** the one served — so FR-028 is verifiable today. Field-level 変更フィールド / 変更前 / 変更後 may be incomplete or coarse because of the raw-snapshot gap. | Write the FR-028 cases to the spec. **A missing record after a successful save is an `NG`.** Only a shortfall attributable to the raw-snapshot gap (the entry exists and names the right member/operator/time, but the per-field diff is wrong or absent) is recorded `Block (B7)`, citing this row. |
| **B8** | Lượt 7 (the 3-control address split, 2026-09-04) shipped on `tsc` + `lint` only — **no browser and no live-API verification**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Unknown; the `building` preserve/clear contract and the payload shape have never been observed end-to-end.                                                                                                                                      | Not an excuse — this is precisely what the run must verify (§5, "the `null` / omit contract"). A defect found there is a normal `NG`.                                                                                                                                                                |

**Cross-screen consequence, out of this unit** (report lượt 6, still open): the member **detail** 基本情報 tab
concatenates `prefecture + streetAddress` the same way the form used to, so it renders
`27大阪市北区梅田1-4-4`. Any case here that ends on the detail screen will see it — record it as an
observation against the member-detail feature, do **not** mark this unit `NG` for it.

---

## 7. Traceability map (FR → unit)

| FR      | Summary                                                                                                                                                                                | Unit                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| FR-001  | Standard shell; the form area is the only scroll region                                                                                                                                | 1                                                                                                                                   |
| FR-002  | Page header: back link 「会員詳細に戻る」 + title 「会員情報を編集」                                                                                                                   | 1 (D6)                                                                                                                              |
| FR-003  | Back link → the edited member's detail, through the unsaved-changes guard                                                                                                              | 1 (D7)                                                                                                                              |
| FR-004  | Centred readable column, independently scrollable                                                                                                                                      | 1                                                                                                                                   |
| FR-005  | Load and pre-populate every field                                                                                                                                                      | 1                                                                                                                                   |
| FR-006  | Existing member only; no blank-form entry path                                                                                                                                         | 1                                                                                                                                   |
| FR-007  | Exactly one 個人情報 card, twelve controls in order                                                                                                                                    | 1                                                                                                                                   |
| FR-008  | Two-column pairs + full-width 番地 / 建物名                                                                                                                                            | 1 (D5)                                                                                                                              |
| FR-009  | Label → control → message beneath                                                                                                                                                      | 1                                                                                                                                   |
| FR-010  | Required marker on exactly the eight required fields                                                                                                                                   | 1                                                                                                                                   |
| FR-011  | Placeholder text per field                                                                                                                                                             | 1 (D9)                                                                                                                              |
| FR-012  | 生年月日 date picker, placeholder 「日付を選択」                                                                                                                                       | 1                                                                                                                                   |
| FR-013  | 性別 single-select, four options                                                                                                                                                       | 1                                                                                                                                   |
| FR-013a | 都道府県 select, 47 JIS entries, **code** on the wire                                                                                                                                  | 1 (D10)                                                                                                                             |
| FR-014  | No 会員種別 / 所属店舗 on the form                                                                                                                                                     | 1                                                                                                                                   |
| FR-015  | Validation on submit only                                                                                                                                                              | 1                                                                                                                                   |
| FR-016  | Eight verbatim blank messages; whitespace = blank                                                                                                                                      | 1                                                                                                                                   |
| FR-016b | 生年月日 brand minimum age (JOYFIT 15 / FIT365 16): message, boundary, brand-specific number, clears on new date                                                                       | 1 (added 2026-10-15; TC-157 – TC-165, TC-085 amended)                                                                               |
| FR-016a | Format rules: katakana, JP phone + auto-format, email, ≤50                                                                                                                             | 1 (D11, D12)                                                                                                                        |
| FR-017  | 郵便番号 / 都道府県 / 市町村・番地 required, 建物名 optional (amended 2026-11-23, Bug-No1; required 2026-10-08 → 2026-11-23); postal format + 8-char cap + auto-format; 200 / 100 caps | 1 (D1–D4, D16)                                                                                                                      |
| FR-018  | Block save, mark invalid, footer summary, scroll to first invalid                                                                                                                      | 1                                                                                                                                   |
| FR-018a | Submit-time validation covers every field, not only the edited ones                                                                                                                    | 1 (added 2026-09-23 after the PO ruling; TC-043, TC-046, TC-047, TC-152)                                                            |
| FR-019  | Message clears on non-blank input / any selection                                                                                                                                      | 1                                                                                                                                   |
| FR-020  | Dirty tracking + discard dialog on cancel / back                                                                                                                                       | 1                                                                                                                                   |
| FR-021  | Native `beforeunload` while dirty                                                                                                                                                      | 1                                                                                                                                   |
| FR-022  | Successful save clears dirty before navigating                                                                                                                                         | 1                                                                                                                                   |
| FR-023  | Footer actions; 保存する disabled while pristine / in flight                                                                                                                           | 1 (D13)                                                                                                                             |
| FR-024  | Persist the eight groups only; toast; navigate to member detail                                                                                                                        | 1                                                                                                                                   |
| FR-025  | キャンセル discards and returns to the edited member's detail                                                                                                                          | 1 (D7)                                                                                                                              |
| FR-026  | 編集 entry affordances are HQ/System only                                                                                                                                              | **Elsewhere** — gating in 019 TC-045/046/107 + member-detail Unit 1; this unit keeps only the two "lands on the right member" cases |
| FR-027  | Server rejects a save from a non-HQ/System role                                                                                                                                        | 1 — verified outside the UI (direct PATCH with a non-HQ token)                                                                      |
| FR-028  | A successful save is recorded in 変更履歴 (when / who / what); a failed save records nothing                                                                                           | 1                                                                                                                                   |
| FR-029  | Shared loading state; never a partial form                                                                                                                                             | 1                                                                                                                                   |
| FR-030  | Shared error state with retry when the member cannot load                                                                                                                              | 1                                                                                                                                   |
| FR-031  | Save failure: error toast, input intact, still dirty, no navigation                                                                                                                    | 1                                                                                                                                   |
| FR-032  | Page-level role gate → permission-denied state                                                                                                                                         | 1                                                                                                                                   |
| FR-033  | 退会済み / 強制退会 → block screen                                                                                                                                                     | 1                                                                                                                                   |

**Requirements with no unit**: none.
**Requirements deliberately without a pass/fail case**: only the _gating half_ of **FR-026** (owned by the two
entry-point screens' own units; re-authoring it here would duplicate 019 TC-046 / TC-107). **FR-028 is no
longer in this list** — the seed-only restriction was removed from the spec on 2026-09-21 and the audit record
is now a verified outcome of the save.

---

## 8. Execution notes (for `execute-testcases`)

**Credentials.** Real Cognito accounts, one per role, from `src/lib/auth/demo-users.ts`, password
`Password@123` (Headquarter: `lodu4289+headquater@gmail.com`). Sign in through the app (the real pool is configured: `NEXT_PUBLIC_COGNITO_ENDPOINT` is
commented out in `.env`), or use the header's 「デモ: ユーザー切替」 submenu, which is rendered only while
`NEXT_PUBLIC_APP_ENV=development` and signs in for real.

| PC   | Role        | Account                         | Used for                                            |
| ---- | ----------- | ------------------------------- | --------------------------------------------------- |
| PC-A | Headquarter | `lodu4289+headquater@gmail.com` | every functional case — the default session         |
| PC-B | System      | `lodu4289+1@gmail.com`          | FR-032 positive path (System also reaches the form) |
| PC-C | Manager     | `lodu4289+manager@gmail.com`    | FR-032 denial + FR-027 server rejection             |
| PC-D | Staff       | `lodu4289+staff@gmail.com`      | FR-032 denial + FR-027 server rejection             |
| PC-E | Observer    | `lodu4289+observer@gmail.com`   | FR-032 denial                                       |
| PC-F | Trainer     | `lodu4289+trainer@gmail.com`    | FR-032 denial (Trainer has no member access at all) |

If the app login path is unavailable, fall back to injecting the `SESSION` cookie on `localhost`
(`{access_token: <staff token>, token_type: 'Bearer'}`); the token's TTL is ~1 hour, so re-inject mid-run.

**Environment.** App on `http://localhost:3000`; API `https://api.dev.fitness-v2.okamoto-hd.com`. The backend
is **shared with other people** and there is **no seed reset**.

**Data policy — this is a write screen editing real personal data.**

- **Every save must be bracketed by snapshot → edit → restore.** Before touching a member, read
  `GET /api/v1/admin/members/{memberId}` and keep the full `personalInfo`; after the case, PATCH the original
  values back and confirm the diff against the snapshot is empty. Write the member id and the restore result
  into the case Notes.
- **Primary test member**: `JF-9000024` (`00000000-0000-7000-8000-000000000924`) — a purpose-made test record
  already used for the integration round-trips, with a full field set. For the `building` cases pick one of
  the 7 members that actually carry a `building`; for the legacy-prefecture case (B3) pick one of the 7 stored
  with a prefecture name.
- ~~**Never use `JF-0000030`** — its stored `+84…` phone makes every save fail (B4).~~ B4 closed 2026-10-30 — a stored `+84…` phone no longer blocks a save.
- **Never edit a member another feature's run is using**, and never touch a member's contract, status or store
  data from anywhere on this screen.
- Test values must be recognisable as test data (e.g. prefix free-text with `QA-`), and must still satisfy the
  server rules (a `QA-` prefix is illegal in フリガナ and in 電話番号 — use katakana / valid JP digits there).
- Anything left unrestored at the end of the run is listed at the bottom of the TC doc with the original value,
  so it can be put back by hand.

**Known-gap policy.** A failure matching a `Bn` row in §6 → `Block (Bn)`, citing the row. Any other failure →
`NG` with a bug id. Do not use §6 to excuse a defect it does not name. A wrong **value returned by the API**
is a `Block` against the backend; a wrong value produced by the frontend is an `NG`.

**Viewport.** **1024×768** (the supported floor) for every layout / long-value case, plus one wide pass at
**≥1440px**. Below 1024px is out of scope.

**Account safety.** Repeated wrong-password attempts lock a real Cognito account for ~15 minutes. Never
re-type a password to "retry" a session, and run the six-role sweep once, in order, rather than re-signing in
per case.

**Date sensitivity.** 生年月日 is validated against the **real** current date on both sides — the server
rejects today and any future date. Compute the boundary values at run time; do not hard-code them. The brand-minimum-age boundaries (FR-016b) are
relative to today too: n years ago today is accepted, n years ago plus one day is refused.

---

## 9. Suggested order

Single unit, so this is the order **within** the TC doc. Read-only first, writes last, destructive-shaped
cases at the very end.

1. **Shell, header, field inventory, prefill** (FR-001 – FR-014) — nothing else is meaningful until the form
   renders the right twelve controls with the right member's values; this also settles D5/D6/D8/D9 early.
2. **Loading / load-error / block states** (FR-029, FR-030, FR-032, FR-033, B1) — still read-only, and they
   establish which member ids and which roles are usable for everything that follows.
3. **Validation: blank, format, clearing, footer summary** (FR-015 – FR-019, D11, D12) — no save request is
   issued by any of these, so they run before a single byte is written.
4. **Long-value / 1024px stress sweep** — run on the populated form from step 1, still without saving, so a
   layout defect is never confused with a data change.
5. **Dirty tracking and the discard dialog** (FR-020, FR-021, FR-025, D7) — the last group that cannot write.
6. **Save — happy path** (FR-022, FR-023, FR-024, FR-028, SC-006) on the primary test member, with snapshot
   and restore. Includes the persistence re-read, the detail / list reflection, and the 変更履歴 record the
   save must produce — read it back on the member detail tab **before** the restore, so the restore's own
   record is not mistaken for the one under test.
7. **Save — the address contract** (D10, D16, the `null` / omit rules, B3, B6) — the lượt-7 behaviour this run
   exists to verify. Each sub-case snapshots and restores.
8. **Save — server-side rejections** (FR-031, `400` per rule, `409`, `404`, expired-token `401`) — failures by
   design, so they leave nothing behind, but they follow the happy path so a rejection is never mistaken for a
   broken save path.
9. **Server-enforced role gate** (FR-027) — a direct PATCH per non-HQ role, outside the UI.
10. **Concurrency** (two tabs, last-write-wins) — last, because it deliberately overwrites, and it needs the
    save path proven first. Restore afterwards.

---

## 10. Definition of done

_All items closed 2026-09-23. Per-case results, the status/priority roll-up and the evidence for every
finding live in the TC doc's own Execution summary — this plan does not restate them._

- [x] `TC -【Fitness CRM】- [A-01][会員情報を編集].md` authored from this plan — deltas D1–D17 marked in the
      affected cases' Notes, the §5 real-API and 1024px stress cases present, `Bn` treatments wired in.
- [x] Every FR-001 – FR-033 traced to ≥1 case, except the gating half of FR-026 (§7), which is recorded as a
      deliberate non-case. **FR-018a**, added to the spec on 2026-09-23, is traced too.
- [x] FR-028 verified end-to-end: a successful save produced a 変更履歴 record carrying the time, the operator's
      **name** and the per-field before/after values; a save the server rejected produced none. **B7 did not
      bite** — the per-field diff renders correctly.
- [x] Parity checklist PAR001–PAR079 reconciled against prototype `0a73739`. PAR015 was amended on 2026-09-22;
      PAR027, PAR030, PAR031 and PAR050 on 2026-09-23 once the PO settled B5, since they still described the
      single 住所 box and an unvalidated, always-submittable address block.
- [x] The doc executed end-to-end in the §9 order, at 1400×900 with a 1024×768 pass for the layout-stress
      group, with OK / NG / `Block (Bn)` recorded per case.
- [x] The lượt-7 address split verified live: all four controls prefill, `building` survives an untouched save,
      a cleared `building` sends `null`, `prefecture` goes up as a JIS code, and every request carried only the
      keys that changed (**closes B8**). The blank-address half became unreachable once B5 settled as required,
      so TC-128 was re-scoped to the null-vs-string contract.
- [x] Open questions answered by the PO on 2026-09-23 — **B5**, **D5**, **D6**, **D7** and **D9** all resolved
      in favour of the prototype, which is what the spec had already said since its 2026-09-22 session; the
      conflicts came from this plan quoting superseded text, now corrected in §4. **B7** remains a backend gap
      to chase.
- [x] Test data: every member edited by the run was restored and the empty diff verified by a raw read-back.
      Two records were changed permanently and on purpose — the B3 / B4 migrations in §6 — and are listed as
      such in the TC doc's test-data section.

---

## Next step

None — the plan is closed. Re-open it only if the PO reverses one of the 2026-09-23 rulings, or when BE clears
the two data debts named in §6: the 203 members stored with no address (**B5**) and the 18 whose stored phone
is a `+84…` number (**B4**). Both re-open a confirmation run.
