# Feature Specification: Blacklist Management (A-01 FR-015)

**Feature Branch**: `025-blacklist-management`
**Created**: 2026-08-07
**Status**: Draft
**PO Spec**: `A-01` — 会員管理（一覧）, document version `260731_v5` — § FR-015 ブラックリストの管理
**Source**: UI prototype (`src/pages/blacklist-list.tsx`, `src/pages/blacklist-detail.tsx`) + Requirement spec `crm/requirements/A-01.md` § FR-015
**Spec source**: `dx-fitness/fitness-spec` @ `1700eb8` (2026-08-06) — `crm/requirements/A-01.md` (593 L)
**UI source**: `dx-fitness/fitness-crm-ui` @ `47423ec` (2026-09-30, 9/30 デザイン更新) — `src/pages/blacklist-list.tsx` (858 L), `src/pages/blacklist-detail.tsx` (279 L). Originally specified against `e99646c` (2026-08-05); re-aligned on 2026-10-05 — see Clarifications › Session 2026-10-05.
**Backend API design**: fitness-dx CRM API `0.8.0`, tag `Member Management` (inside `x-tagGroups` → `Member Operations`, so the backend contract is ready), blacklist section v0.4
**Input**: User description: "Create spec for screen A-01 FR-015 Blacklist — Phase 1 only; history is seed-only (no create/update/delete of history); use the backend API design at https://all-docs.dn30t5gp2gjp.amplifyapp.com/crm/ as the API basis."

---

## Scope

### In Scope (Phase 1)

Both prototype screens are marked `phases: ["1"]` in the prototype's screen map (`src/pages/map/screens.ts` L1741-L1764):

| Screen                                         | Route slug         | Source requirement                 |
| ---------------------------------------------- | ------------------ | ---------------------------------- |
| Blacklist list                                 | `blacklist-list`   | A-01 FR-015 「BL一覧画面（独立）」 |
| Blacklist detail                               | `blacklist-detail` | A-01 FR-015 「BL詳細画面（独立）」 |
| Manual registration Sheet (on the list screen) | —                  | A-01 FR-015 「BL登録操作」         |
| Blacklist release (on the detail screen)       | —                  | _prototype addition_ — see Q-05    |

Covered source requirement: **FR-015 ブラックリストの管理** in full (list, detail, manual registration), plus the A-01 権限マトリクス row 「BL管理」 (System ○ / Headquarter ○ / Manager × / Staff × / Trainer × / Observer ×).

**Also in scope, by consequence** (decided 2026-08-07, Q-12): this feature owns the blacklist registration contract, so it carries the mechanical update of every existing caller of it — see FR-073 – FR-075. That reaches one file outside these two screens, the member-detail registration dialog, whose UI is otherwise A-01-01's.

### Out of Scope for Phase 1

| Item                                                                                                                                                        | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A-01 FR-016 強制退会の自動判定・実行**                                                                                                                    | A-01 L275-L286 assigns forced withdrawal to the **System** actor as a monthly batch. The auto-registration of a blacklist entry is a side effect of that batch (BAT-019 in the API design); this feature only **reads** the resulting `source = forced_withdrawal` rows. No screen triggers a forced withdrawal.                                                                                                                                                                                                                                                                            |
| **A-01 FR-024 ブラックリスト自動マッチング結果の管理者通知**                                                                                                | A-01 L169 classifies FR-024 as a **Could** requirement (希望要件). The backend confirms it is unimplemented: `BlacklistEntry.matchResult` is documented as a "Future placeholder for FR-024 … null at v0.4". **Settled with the client on 2026-07-29** through QA `member-management/qa06` — 「matchResult giữ ẩn cột (FR-024 'Could', ngoài scope)」. The list therefore ships without 照合結果 (seven columns since 2026-10-05). The detail's 照合条件 card was never itself put to the client, but the same rationale was applied to it on 2026-08-07 (Q-02), so it is not built either. |
| **A-01 FR-018 個人情報の削除（ダミー値置換）**                                                                                                              | A separate requirement on a separate surface. FR-015 only states the **invariant** that a blacklisted member's personal data cannot be deleted; enforcing it is FR-018's job. This feature surfaces the invariant as the warning copy in the registration Sheet (「ブラックリストに登録された会員の個人情報は削除できなくなります」) and nothing more.                                                                                                                                                                                                                                      |
| **History mutation (create / update / delete)**                                                                                                             | Per the feature request, blacklist history data is **seed-only**. The `history` array returned by the detail endpoint (`registered` / `removed` events derived from `member_change_histories`) is read-only and populated from seeds. No write path for history exists in this feature — history rows are a by-product of the register and release operations, never edited directly.                                                                                                                                                                                                       |
| **Rendering the `history` array on the detail screen**                                                                                                      | The reviewed prototype detail (`blacklist-detail.tsx`, 278 L) has no history section: it renders 登録情報 / 照合条件 / 未納金 cards plus a status card. The backend supplies `history`, and the data is seeded, but no Phase 1 surface displays it. See Q-06.                                                                                                                                                                                                                                                                                                                               |
| **BL level (`blacklists.level`, 1–5)**                                                                                                                      | The backend marks it `TBD-BLACKLISTS-LEVEL-DEFINITION pending`, states "No screen control exists and none is planned until the level definition lands", and stores every entry as null. The prototype exposes no level control on either screen and no level column. Not built. **Rendering rule already agreed** (client, 2026-07-29, QA `member-management/qa08`: 「level optional (null=未分類)」): whenever a level surface is eventually built, a null level renders as 「未分類」. Recorded so the rule does not have to be re-asked.                                                 |
| **The `reasonCategories` list filter and the `level` / `brandGroup` / `brandEnum` / `registeredFrom` / `registeredTo` / `sort` / `order` query parameters** | The endpoint opens these "for audit queries"; the prototype exposes no control for any of them. Phase 1 ships only the controls the prototype has: free-text search, 登録経路 (→ `source`), and 未納金 (→ `hasUnpaid`), with the default sort (`registeredAt` desc).                                                                                                                                                                                                                                                                                                                        |
| **The member-detail blacklist dialog's own UI, copy, placement and role gating (A-01-01)**                                                                  | A-01 L262 says BL registration 「は会員詳細画面から実行できる」, and the backend endpoint is member-scoped. That dialog's presentation belongs to the A-01-01 feature. **Its request shape does not** — see "Also in scope, by consequence" above (Q-12). This feature ships the **list-screen** Sheet the reviewed prototype implements, which resolves a member through the member-list search (Q-04) and then calls the same endpoint.                                                                                                                                                   |

---

## Clarifications

### Session 2026-08-07

- Q: Should the list keep its 照合結果 column, given that the contract returns null for `matchResult` at v0.4? → A: **No — hide the column** (Q-01, option A). This was already settled with the client through the API QA process: QA `member-management/qa06` put the gap to them directly and Otaki answered on 2026-07-29 — 「matchResult giữ ẩn cột (FR-024 'Could', ngoài scope)」 — keep the column hidden, FR-024 is a Could requirement and out of scope. The same answer also resolved two other items in that QA, and both are visible in the v0.4 contract: `unpaidAmount` plus the `hasUnpaid` filter were added, and the registration-path axis was split out of `reason` into the `source` enum. v0.4 is therefore the post-QA state of the contract, not a draft the client has yet to see. The list ships **six** columns.
- Q: Should ブラックリスト解除 be built, given that A-01 FR-015 never mentions release? → A: **Yes — build it** (Q-05, option A). Confirmed in writing by the client on 2026-07-29, in the answer to QA `member-management/qa08`: 「thêm PATCH /blacklist/{id}/active để解除」. QA `member-management/qa12` (answered 2026-08-05) closes the trail — 「Câu 1+2 (EP gỡ blacklist) đã chốt từ 07-29 ở #129」. The v0.4 contract implements the endpoint in full, with its guard decision table, audit columns and a `blacklist_removed` history event. FR-062 – FR-068 are in scope and the V0 dialog copy stands. A-01 FR-015 is the stale party and should be amended to describe release and its re-enrolment effect; that amendment is a documentation request, not a blocker.
- Q: Is the `source` / `reasonCategories` / `reason` split the agreed shape, and how does it map to the Sheet's controls? → A: **Yes, as the v0.4 contract states** — confirmed by the client on 2026-07-29 in the answer to QA `member-management/qa08`: 「reasonCategories mảng 5; reason định nghĩa lại thành memo(任意) map UI; level optional (null=未分類)」. So the Sheet's 登録理由 select writes `reasonCategories` (the five-value enum), the Sheet's メモ writes `reason`, and `level` stays optional. This settles the **write** direction only; whether the stored reason categories are displayed back on the list or the detail is a separate open question — see Q-03.
- Q: Where does the detail's member head-up card get 会員種別 / 主契約 / 旧会員No / 店舗, which the entry's `member{}` did not carry? → A: **Inline on the blacklist detail response, with no second call** — confirmed by the client on 2026-07-29 in the answer to QA `member-management/qa07`: 「head-up mở rộng member{} (legacyMemberCode/memberType/currentMainContract/kana...), khỏi gọi getMember; hội viên 退会済 vẫn lấy được」. This is already reflected in the v0.4 `BlacklistMemberDetailRef`, so FR-055 needs no backend request. The 「hội viên 退会済 vẫn lấy được」 half also removes a risk the edge-case list raised: a withdrawn or force-withdrawn member — the normal population of this screen — still resolves.
- Q: Should the detail keep its 照合条件 card, given that the contract has no counterpart for its four flags? → A: **No — drop the card** (Q-02, option A). The detail's left column holds two cards, 登録情報 and 未納金. This applies the client's own 2026-07-29 rationale for the list column — FR-024 is a Could requirement and out of scope — to the same gap on the other screen, keeping the two consistent. Unlike Q-01 this card was never itself put to the client (「照合」 appears zero times in QA qa07, qa08 and qa12), so it is a project-side decision rather than a client answer. FR-059 is deleted and its identifier retired.
- Q: Released entries are unreachable from any screen — should the list gain a status filter to expose them? → A: **No — ship active-only, as V0 does** (Q-07, option A). The toolbar keeps exactly two filters (登録経路, 未納金) and the list always requests active entries. Released entries stay retrievable in the data and through a direct entry URL, but Phase 1 offers no route to enumerate them. Consequence to accept: the contract's stated audit purpose for retaining released rows is met at the data layer only, not through the UI. Revisit if operators ask to review past releases.
- Q: Where does the registration Sheet's member lookup get its data? → A: **`GET /api/v1/admin/members` with its `query` parameter** (Q-04, option A), consistent with the client's demonstrated preference at qa07 for widening a payload over adding a round-trip. Verified against the contract: `query` already searches exactly the fields the combobox advertises — `member_number` / `legacy_member_code` / `email` / `phone` / `last_name` / `first_name` / `last_name_kana` / `first_name_kana` — and `MemberListItem` carries the member UUID the registration endpoint needs, plus the member number, name, name kana and primary store. **Two fields are genuinely absent** from that projection and must be requested: `dateOfBirth` and `facePhotoUrl`, both of which already exist on `PersonalInfo` in the member-detail response. Two consequences also fall out of the check and are recorded as requirements: the backend's search is **prefix-only** (`ILIKE 'kw%'`), not the substring match V0 does client-side; and `MemberListItem.hasBlacklist` (HQ/system only) lets the Sheet warn about an already-listed member **before** submitting instead of relying on the 409.
- ~~Q: The Sheet's required 登録理由 is stored but displayed nowhere afterwards — should the list or detail surface it? → A: **No — follow V0** (Q-03, option A).~~ **Superseded 2026-10-05** — the prototype itself now splits the two axes (see Session 2026-10-05). Both screens keep the V0 labels, and `reasonCategories` is written but never read back to the operator. Accepted consequence: the reason an operator is required to choose is write-only from the UI's point of view — retained for audit and available to the API, but invisible on screen; and 登録理由 continues to name two different axes across the feature (the registration path on the list and detail, the reason category in the Sheet). Recorded as FR-043a so the gap is deliberate and is not later 'fixed' by someone reading the contract without this decision.
- Q: The 表示件数 selector offers 200, which exceeds the endpoint's `limit` cap of 100 — what should it offer? → A: **25 / 50 / 100, default 25; drop 200** (Q-08). Decided on codebase evidence rather than by asking, exactly as spec 024 resolved the identical conflict (its Q-06): 200 is rejected by the _project's own_ mock contract as well as the real one, and 25 is the CRM-wide `PAGE_SIZE` constant (`src/constants/app.constants.ts`) that every other list screen uses. V0's default of 50 is not carried over — matching A-03 keeps the two list screens consistent.
- Q: What does the detail screen do after a release succeeds? → A: **Navigate back to the list** (Q-11, option C). The toast fires, the dialog closes, and the operator lands on ブラックリスト管理 where the released entry is no longer present — the absence reads as confirmation. **Not resolved by this answer**: the released-entry detail must still render coherently for the direct-URL route that FR-069a keeps alive, so FR-069b specifies the minimum — a status card that claims the member is still blacklisted would be factually wrong, and that is a correctness constraint rather than a design choice.
- Q: The member-detail blacklist dialog calls the very endpoint this feature re-contracts — is fixing it in scope? → A: **Yes, the request shape is** (Q-12, option A). This feature owns the registration contract, so it also carries the mechanical update of every caller: `reason: <enum>` becomes `reasonCategories: [<enum>]`, and the now-redundant list-scoped registration route is removed since v0.4 has only the member-scoped endpoint. The dialog's own UI does not change — one select and a memo, with the single choice sent as a one-element array. What stays with A-01-01 is the dialog's placement, copy and role gating. Leaving a known-broken caller on `dev` was rejected, as was keeping the old endpoint alive as a shim: two contracts for one operation would break the mock-equals-real equivalence the project requires.
- Q: Should the detail render the entry's `history` array? → A: **No — follow V0** (Q-06, option A). `history` is seeded and returned but consumed by no Phase 1 surface, matching how spec 024 treated `statusHistories` (its Q-14). The seed is kept rather than dropped: the contract declares `history` required, so the mock must return the array either way, and seeding it realistically is what keeps the mock equivalent to the real endpoint. The information a released entry actually needs on screen — who released it and when — is already covered by FR-069b, so a history card would mostly repeat it.

### Session 2026-10-05 — re-alignment to prototype `47423ec` (9/30)

The screens were re-checked against the latest prototype and the UI brought in line. Anything the code rendered that the prototype does not was removed, except states the prototype cannot express because it runs on constants (loading / error, the released entry, the already-blacklisted pre-check — see the last bullet).

- **登録経路 and 登録理由 are now two columns** (prototype comment: 「経路（強制退会/手動登録）と理由（迷惑行為等）は別語彙のため列を分ける」). The list has seven columns: 会員ID, 氏名, 店舗名, **登録経路** (`source` badge), **登録理由** (`reasonCategories` as text), 未納金額, 登録日. The filter is relabelled 全登録経路 / 強制退会 / 手動登録. This **supersedes Q-03**: the reason category is no longer write-only — it is read back on the list, the detail's 登録情報 card and the status card (FR-010a, FR-043a, FR-058, FR-061). It is the Q-03 option C (plus B) the prototype has now chosen; no backend change is needed, `reasonCategories` was already returned.
- **照合結果 stays hidden.** The prototype now keeps both the list column and the detail card behind a `SHOW_MATCH_RESULT = false` flag 「仕様オーナー確認中」, which matches Q-01 / Q-02. Nothing to build.
- **機器破損 is offered** in the registration Sheet (added in the 9/17 update) — five options, prototype order 迷惑行為 / 未納金 / 不正利用 / 機器破損 / その他. The former out-of-scope row for `equipment_damage` is removed.
- **Registration Sheet**: the combobox result rows no longer show a photo (「検索結果行は氏名＋ID・カナ・店舗のみ」) — the photo and birthdate appear only in the identity card once a member is chosen (FR-039). The Sheet uses the default Sheet width instead of a fixed 480 px (FR-034). The required / optional markers are the shared `RequiredMark` / `OptionalMark`.
- **Detail header**: the monospace member-number badge is removed; the header carries only the registration-path badge (FR-054). The member number remains in the head-up card.
- **Detail 登録情報 card**: 登録経路 (badge) / 登録理由 (text) / 登録日 (date) / 登録者 / メモ (FR-058). **Status card** meta: 「登録日: …」 and 「登録理由: …」 (FR-061).
- **表示件数**: the prototype now offers 25 / 50 / 100 (200 dropped in the 9/8 update), which is what Q-08 had already decided. The prototype's default remains 50; the screen keeps the CRM-wide default 25 per Q-08.
- **Kept although the prototype has no counterpart** — each is a state the constant-backed prototype cannot reach, not a design addition: loading / error states (FR-070, FR-071), the released-entry rendering (FR-069a, FR-069b), the already-blacklisted pre-check in the Sheet (FR-050a) and the member-lookup failure message. Removing them would show wrong data (a released entry presented as active) or a misleading message.

---

## User Scenarios _(mandatory)_

### User Story 1 — Survey every blacklisted member across all stores (Priority: P1)

An HQ operator opens ブラックリスト管理 and sees, in one cross-store table, every member currently on the blacklist — those the System auto-registered at forced-withdrawal time and those HQ registered by hand. They read each row's member ID, name, store, registration path, registration reason, outstanding balance, and registration date, then narrow the table with a free-text search and the 登録経路 / 未納金 filters, and page through the result.

**Why this priority**: A-01 L265 states the list screen's primary purpose is 「横断リスト参照・監査」 — cross-store reference and audit. Without the list there is no blacklist surface at all, and both other stories are reached through it.

**Verification**: Sign in as a Headquarter user, open ブラックリスト管理, and confirm the table lists every seeded active entry with all documented columns in order. Apply 登録経路 = 強制退会 and 未納金 = あり, and confirm the row-count badge, the filter banner, and the table body all agree. Clear the conditions and confirm the full list returns. Sign in as a Manager, Staff, Trainer, or Observer and confirm the screen is not reachable.

**Acceptance Scenarios**:

1. **Given** seeded active blacklist entries exist, **When** the list loads, **Then** each row shows 会員ID, 氏名, 店舗名, 登録経路, 登録理由, 未納金額, 登録日 in that column order.
2. **Given** an entry created by the forced-withdrawal batch, **When** its row renders, **Then** 登録経路 shows a 強制退会 badge in the destructive tone; **given** a manually registered entry, **then** it shows a 手動登録 badge in the warning tone. 登録理由 shows the entry's reason category as text (e.g. 迷惑行為), or `—` when it has none.
3. **Given** a row whose outstanding balance is greater than zero, **When** it renders, **Then** 未納金額 shows `¥{amount}` right-aligned in the destructive colour with medium weight; **given** a zero balance, **then** it shows `¥0` in the muted colour.
4. **Given** the operator types into the search box, **When** the input changes, **Then** the result narrows to matching members and the page resets to page 1.
5. **Given** the operator sets 登録経路 or 未納金 away from its default, **When** the filter applies, **Then** only matching rows remain, the trigger takes the active highlight, and the page resets to page 1.
6. **Given** any filter or search term is active, **When** the table renders, **Then** the filter-result banner shows 「全 {baseline total} 件中 {filtered count} 件を抽出中」 followed by a `・`-joined summary of the active conditions and a 条件をクリア action.
7. **Given** the conditions exclude every row, **When** the table renders, **Then** the filtered empty state 「条件に一致するブラックリストがありません」 is shown with a 条件をクリア button.
8. **Given** no blacklist entry exists at all, **When** the table renders, **Then** the plain empty state 「ブラックリストがまだありません」 is shown with no clear-conditions action.
9. **Given** a row, **When** the operator clicks anywhere on it except the name, **Then** the blacklist detail for that entry opens; **when** they click the member name, **then** the member detail (A-01-01) opens instead and the row navigation does not fire.

---

### User Story 2 — Register a member on the blacklist by hand (Priority: P1)

An HQ operator opens the 手動登録 Sheet from the list header, identifies the target member either by typing their member number (which auto-fills their identity) or by searching name / kana / phone / email in a combobox, picks a registration reason, optionally adds a memo, acknowledges the warning that the member's personal data will become undeletable, and registers.

**Why this priority**: A-01 L263 names manual registration as one of only two ways an entry is ever created, and it is the only one a human performs — the other is the System batch. Without it, HQ can only observe what the batch produced.

**Verification**: Open the Sheet, type a known member number, confirm the identity card appears with the member's name, kana, birthdate, ID and store. Clear it and instead search by name in the combobox; confirm selecting a result fills the member number field. Confirm 登録 stays disabled until a member is resolved, then register and confirm the success toast, the closed Sheet, and the new row in the list.

**Acceptance Scenarios**:

1. **Given** the Sheet is closed, **When** the operator clicks 手動登録, **Then** a right-hand Sheet titled ブラックリスト手動登録 opens with every field blank.
2. **Given** the operator types a member number that resolves, **When** the lookup succeeds, **Then** the input takes the success border and an identity card shows the member's photo, name, kana, birthdate, ID and store.
3. **Given** the operator types a member number that does not resolve, **When** the lookup fails, **Then** the input takes the destructive border and 「該当する会員が見つかりません」 is shown beneath it.
4. **Given** the member-number field is empty, **When** the Sheet renders, **Then** the hint 「会員番号を入力すると氏名・生年月日・顔写真が自動反映されます」 is shown.
5. **Given** the operator opens the combobox and types, **When** results return, **Then** each result shows the member's name and a muted line of ID・カナ・店舗名 (no photo); selecting one fills the member-number field and shows the identity card.
6. **Given** no member has been resolved, **When** the Sheet renders, **Then** the 登録 button is disabled.
7. **Given** a member is resolved and a reason is chosen, **When** the operator clicks 登録, **Then** the entry is created, the success toast 「ブラックリストに登録しました」 appears, the Sheet closes and resets, and the list reflects the new entry.
8. **Given** the target member already has an active blacklist entry, **When** the operator submits, **Then** the registration is refused and the backend's reason is shown; no duplicate entry is created.
9. **Given** the Sheet is open, **When** the operator clicks キャンセル or dismisses the Sheet, **Then** every field — member number, lookup status, selected member, reason, memo — resets.

---

### User Story 3 — Read one entry's full context and release it (Priority: P2)

An HQ operator opens a blacklist entry from the list and reads the member's head-up card, the registration facts (path, reason, date, registering staff, memo), and the outstanding balance. If the member should be allowed to enrol again, they release the entry through a confirmation dialog.

**Why this priority**: A-01 L266 asks for a detail screen for 「BL登録情報の詳細参照」, and the backend supplies a release endpoint. It ranks below the list and registration because an entry must exist and be findable before it can be read or released.

**Verification**: From the list, open an entry. Confirm the header shows the member's name plus the registration-path badge, and that the back link returns to the list. Confirm the two left-column cards and the right-column status card render the seeded values. Click ブラックリスト解除, confirm the dialog names the member, confirm, and verify the success toast, the return to the list, and the entry's absence from it. Then reopen that entry by its URL and confirm it renders as released with no release action.

**Acceptance Scenarios**:

1. **Given** an entry is opened, **When** the page renders, **Then** the header shows a back link 「ブラックリスト管理に戻る」, the member's name as the title, and a dot-prefixed registration-path badge coloured by path.
2. **Given** the entry is rendered, **When** the operator reads the 登録情報 card, **Then** it shows 登録経路 (badge), 登録理由 (text), 登録日, 登録者, and メモ spanning both columns.
3. **Given** the entry has an outstanding balance greater than zero, **When** the 未納金 card renders, **Then** the amount appears in destructive colour beside a 未収 badge; **given** a zero balance, **then** the amount is muted and no badge is shown.
4. **Given** the operator is Headquarter or System, **When** the status card renders, **Then** the ブラックリスト解除 button is enabled; **given** any other role, **then** it is disabled with the tooltip 「ブラックリスト解除は本部のみ操作できます」.
5. **Given** the operator clicks ブラックリスト解除, **When** the dialog opens, **Then** it asks 「ブラックリストから解除しますか？」 and states that the named member will be released and able to re-enrol.
6. **Given** the dialog is confirmed, **When** the release succeeds, **Then** the toast 「ブラックリストから解除しました」 appears, the dialog closes, the screen returns to the blacklist list, and the released entry is no longer among its rows.
   6a. **Given** a released entry is opened by its direct URL, **When** the detail renders, **Then** it shows the registration and release facts, its status card reflects the released state rather than the registration path, and no release action is offered.
7. **Given** the entry has already been released, **When** the operator confirms a release, **Then** the operation is refused and the backend's reason is shown.

---

### Edge Cases

- **Member with no primary store** — `member.primaryStore` is nullable for a provisional member. The 店舗名 column and the head-up card's 所属 line must degrade to an em dash rather than render "undefined".
- **Member with no active contract** — `currentMainContract` is documented as null in "the normal case once a forced-withdrawal contract closes", which is precisely the population this screen shows. The head-up card must omit the 主契約 badge rather than render an empty one. The member record itself still resolves: the client confirmed 「hội viên 退会済 vẫn lấy được」 (2026-07-29, QA `member-management/qa07`).
- **Net-new member with no legacy code** — `legacyMemberCode` is null; the head-up card omits the 旧No fragment.
- **Legacy row with no reason category** — migrated rows carry `[]`, never null. The 登録理由 rendering must not assume a first element exists; an empty array renders as an em dash.
- **A released entry reached by direct URL** — the detail endpoint still serves it (release flips a flag, it never deletes). The screen must render it with its removal facts rather than 404, must present it as released rather than active, and must not offer a second release. After FR-064a this is the only route to a released entry.
- **An entry whose member was auto-registered by the batch** — the registering actor is the System, so `history[].actor` can be null. Any actor rendering must tolerate that.
- **Concurrent release** — two operators releasing the same entry: the second gets the already-released refusal, not a silent success.
- **Concurrent registration** — a member force-withdrawn by the batch between the Sheet's lookup and its submit already has an active entry; the submit is refused as a duplicate.
- **Page beyond the result set** — narrowing the filters while on page 5 of 5 must clamp to the last valid page rather than show an empty table.
- **Search that matches nothing** — the filtered empty state, not the blank-slate empty state.
- **Neither screen defines a loading or an error state** — the prototype renders static mock data. Both must follow the project's existing list/detail conventions (skeleton while loading, error surface on failure).

---

## Requirements _(mandatory)_

### Functional Requirements

#### Access control

- **FR-001**: The blacklist list and blacklist detail screens MUST be reachable only by the **Headquarter** and **System** roles. Manager, Staff, Trainer and Observer MUST NOT be able to reach either screen (A-01 権限マトリクス, 「BL管理」 column; A-01 L268 「BL一覧・詳細参照はHQ以上のみ。Staff日常画面には表示しない」).
- **FR-002**: The sidebar entry ブラックリスト管理 MUST be rendered only for those roles (`hqOnly: true`), and MUST show as active for both the list and the detail route.
- **FR-003**: Access control MUST be enforced server-side, not only by hiding the menu entry: a non-HQ caller requesting any blacklist endpoint MUST be refused.
- **FR-004**: Blacklist data MUST NOT be scoped to the caller's stores. The list is explicitly a cross-store audit surface for HQ (A-01 L265).

#### List — display

- **FR-005**: The list screen MUST show the page title ブラックリスト管理 with a count badge reflecting the **filtered** row count.
- **FR-006**: The list MUST render a table with exactly these seven columns in this order: 会員ID, 氏名, 店舗名, 登録経路, 登録理由, 未納金額, 登録日. The prototype's eighth column, 照合結果 (behind a disabled `SHOW_MATCH_RESULT` flag), MUST NOT be built — the client settled this on 2026-07-29 (Q-01).
- **FR-007**: 会員ID MUST render the member's human-readable member number in a monospace, muted, extra-small style.
- **FR-008**: 氏名 MUST render the member's family and given name, and MUST itself be an independent link to the member detail (A-01-01) that does not trigger the row's own navigation.
- **FR-009**: 店舗名 MUST render the member's primary store name, or an em dash when the member has no primary store.
- **FR-010**: 登録経路 MUST render the **registration path** as a badge with exactly two values — 強制退会 (destructive tone) and 手動登録 (warning tone).
- **FR-010a**: 登録理由 MUST render the entry's **reason categories** as extra-small plain text using the Sheet's vocabulary (迷惑行為 / 未納金 / 不正利用 / 機器破損 / その他), `・`-joined if more than one, and an em dash when the array is empty (2026-10-05).
- **FR-011**: 未納金額 MUST be right-aligned, MUST render `¥{thousands-separated amount}`, MUST use the destructive colour with medium weight when the amount is greater than zero, and MUST use the muted colour showing `¥0` when it is zero.
- **FR-012**: 登録日 MUST render the registration date.
- **FR-013**: Clicking a row anywhere other than the member name MUST open that entry's blacklist detail.
- **FR-014**: The table header MUST stay pinned while the table body scrolls, and the table MUST scroll horizontally within its own container when it exceeds the viewport width.

#### List — search, filtering and pagination

- **FR-015**: The list MUST provide a free-text search input with the placeholder 会員ID・氏名で検索, capped at 400 px wide with a leading search icon.
- **FR-016**: The search MUST be evaluated server-side across the whole filtered set, never client-side over the loaded page — a page-local search silently reports "no results" for rows on other pages.
- **FR-017**: The list MUST provide a 登録経路 filter with the options 全登録経路 / 強制退会 / 手動登録, filtering on the registration path.
- **FR-018**: The list MUST provide a 未納金 filter with the options 未納金：全件 / 未納金：あり / 未納金：なし, filtering on whether the member has an outstanding balance.
- **FR-019**: Both filters MUST be permanently visible — with only two of them there is no collapse/expand affordance and no 詳細フィルター button.
- **FR-020**: Any filter trigger whose value differs from its default MUST take the active treatment (primary border, primary-tinted background, foreground text).
- **FR-021**: Changing the search term, either filter, or the page size MUST reset the current page to 1.
- **FR-022**: When at least one filter is active or the search term is non-empty, the filter-result banner MUST render directly beneath the toolbar showing 「全 {baseline count} 件中 {filtered count} 件を抽出中」, a `・`-joined condition summary, and a 条件をクリア action.
- **FR-023**: The condition summary MUST list the 登録経路 value verbatim and the 未納金 value prefixed 「未納金：」, in that order, omitting whichever is at its default.
- **FR-024**: 条件をクリア MUST reset the search term and both filters to their defaults and return to page 1.
- **FR-025**: The baseline count in the banner MUST be the row count with every optional filter reset — the number the operator reaches by pressing 条件をクリア — not a raw table count, and the UI MUST degrade gracefully when the server declines to supply it.
- **FR-026**: When the result set is empty and conditions are active, the filtered empty state 「条件に一致するブラックリストがありません」 MUST render with a 条件をクリア button.
- **FR-027**: When the result set is empty and no condition is active, the blank-slate empty state 「ブラックリストがまだありません」 MUST render with no clear-conditions action.
- **FR-028**: The pagination footer MUST show 「全 {total} 件 / {totalPages} ページ / {start}-{end} を表示」.
- **FR-029**: The pagination footer MUST provide 前へ / 次へ controls and numbered page links, capped at seven visible entries with ellipses, the first and last page always present, and the current page highlighted.
- **FR-030**: 前へ MUST be inert on the first page and 次へ inert on the last, each shown at reduced opacity.
- **FR-031**: Changing the page MUST scroll the view back to the top.
- **FR-032**: The footer MUST provide a 表示件数 selector offering 25 / 50 / 100 rows per page, defaulting to 25 (decided 2026-08-07, Q-08). The prototype dropped its 200 option in the 9/8 update, so the options now match V0; V0's default of 50 is replaced by the CRM-wide default so this screen matches every other list.
- **FR-033**: The list MUST show only **active** entries, and MUST expose no control that changes this (decided 2026-08-07, Q-07). Released entries MUST NOT appear in the list at all. They remain readable through a direct entry URL (FR-069a) and in the data, but Phase 1 provides no way to enumerate them.

#### List — manual registration Sheet

- **FR-034**: The page header MUST carry a 手動登録 action with a plus icon that opens a right-hand Sheet, at the shared Sheet's default width, titled ブラックリスト手動登録.
- **FR-035**: The Sheet MUST provide a required 会員番号 input, marked with the shared required marker, with the placeholder 例：M-00001.
- **FR-036**: Entering a member number MUST resolve the member as the operator types. On success the input MUST take the success border; on failure it MUST take the destructive border and show 「該当する会員が見つかりません」.
- **FR-037**: While the member-number input is empty, the hint 「会員番号を入力すると氏名・生年月日・顔写真が自動反映されます」 MUST be shown, and any previously resolved member MUST be cleared.
- **FR-038**: The Sheet MUST provide a secondary lookup labelled 「または氏名・カナ・電話番号で検索」 — a combobox whose placeholder reads 「ID・氏名・カナ・電話番号・メールで検索」 and which matches on member number, legacy member code, name, name kana, phone and email.
- **FR-038a**: The lookup MUST be evaluated server-side. Matching is **prefix-based** on each searchable field, except the member number and legacy member code which match exactly. V0's client-side substring matching MUST NOT be reproduced — it cannot be served by the backend and would make the control behave differently against real data than against mocks.
- **FR-039**: Each combobox result MUST show the member's name and a muted secondary line of member number ・ name kana ・ store name, and MUST NOT show the photo or birthdate — those appear only in the identity card once a result is chosen (FR-042). With no query the combobox MUST show a bounded default list; with a query it MUST show a bounded result list.
- **FR-040**: When the combobox returns nothing, it MUST show 「該当する会員が見つかりません」.
- **FR-041**: Selecting a combobox result MUST fill the 会員番号 input with that member's number and put the lookup into its resolved state.
- **FR-042**: Once a member is resolved, the Sheet MUST show an identity card on a success-tinted background with the member's photo, a check icon, their name, name kana, 生年月日, and a monospace 「ID: {member number} / {store name}」 line. The birthdate and the photo are the two fields the member-list projection does not yet carry (Q-04); both are required here because they are what lets an operator confirm they are blacklisting the right person.
- **FR-043**: The Sheet MUST provide a required 登録理由 single-select with the options 迷惑行為 / 未納金 / 不正利用 / 機器破損 / その他 (in that order) and the placeholder 理由を選択してください.
- **FR-043a**: The chosen reason category MUST be stored and MUST be displayed back as 登録理由 — on the list (FR-010a), the detail's 登録情報 card (FR-058) and the status card (FR-061). The label 登録理由 names the reason axis everywhere; the registration path is labelled 登録経路. (Re-decided 2026-10-05, superseding Q-03: the prototype now splits the two axes.)
- **FR-044**: The Sheet MUST provide an optional メモ textarea, marked with the shared optional marker, four rows tall, placeholder 補足情報を入力してください.
- **FR-045**: The Sheet MUST show a warning alert above the footer reading 「ブラックリストに登録された会員の個人情報は削除できなくなります」 (A-01 L267-L269).
- **FR-046**: The Sheet footer MUST hold two equal-width large buttons: キャンセル (outline) and 登録 (destructive).
- **FR-047**: 登録 MUST be disabled until a member is resolved.
- **FR-048**: Submitting MUST create a manual blacklist entry for the resolved member carrying the chosen reason and the memo, show the success toast 「ブラックリストに登録しました」, close and fully reset the Sheet, and refresh the list.
- **FR-049**: The registration path MUST NOT be selectable by the operator — every entry created here is a manual registration. The forced-withdrawal path is reachable only from the System batch.
- **FR-050**: When the target member already has an active blacklist entry, the submission MUST be refused with the backend's user-facing message and no duplicate created.
- **FR-050a**: When a resolved member is already blacklisted, the Sheet MUST say so **before** the operator submits, and MUST NOT let them submit. This is derived from the member-list projection's own already-blacklisted flag, which is served to HQ and System roles. FR-050 remains the authoritative guard — the pre-check is a courtesy that closes the common case, not a replacement for the server's one-active-row invariant, which still governs the race where a member is force-withdrawn between lookup and submit.
- **FR-051**: When the target member cannot be found, the submission MUST be refused with the backend's user-facing message.
- **FR-052**: Closing or cancelling the Sheet MUST reset the member number, the lookup status, the resolved member, the search query, the reason and the memo.

#### Detail — display

- **FR-053**: The detail header MUST show a back link 「ブラックリスト管理に戻る」 returning to the list.
- **FR-054**: The detail header title MUST be the member's name, accompanied by an outline badge holding the registration path prefixed with a tone-matched dot. No member-number badge is shown in the header (removed 2026-10-05, as in the prototype); the member number is in the head-up card.
- **FR-055**: The detail MUST render the shared member head-up card above the content, carrying the member number, the legacy member code, the name, the name kana, the member type, the main contract name, and the store name, with its 会員詳細を開く action pointing at the member detail.
- **FR-056**: The content MUST be a two-column layout — 60 % left, 40 % right — with the right column sticky to the top of the scroll container.
- **FR-057**: The left column MUST hold two cards in this order: 登録情報, 未納金.
- **FR-058**: The 登録情報 card MUST show, in this order, 登録経路 as a tone-matched badge, 登録理由 as text (FR-010a rules), 登録日 as a date, 登録者 as the registering staff member's display name, and メモ spanning the full card width.
- **FR-059**: _Retired 2026-08-07 (Q-02) — described the 照合条件 card, which is not built. Identifier not reused._
- **FR-060**: The 未納金 card MUST show the outstanding balance as a large `¥{thousands-separated amount}`, in destructive colour with an accompanying 未収 badge when greater than zero, and in the muted colour with no badge when zero.
- **FR-061**: The right column MUST hold the shared status card, toned by registration path (強制退会 → destructive, 手動登録 → warning), with a shield-ban icon, the registration path as its label, and two meta lines: 「登録日: {registered date}」 and 「登録理由: {reason categories}」.

#### Detail — release

- **FR-062**: The status card MUST carry a ブラックリスト解除 action, role-gated to Headquarter and System, shown disabled with the tooltip 「ブラックリスト解除は本部のみ操作できます」 for any other role.
- **FR-063**: Triggering it MUST open a confirmation dialog titled 「ブラックリストから解除しますか？」 whose body reads 「{member name} さんをブラックリストから解除します。解除後、再入会が可能になります。」 with キャンセル and 解除する actions.
- **FR-064**: Confirming MUST release the entry, show the toast 「ブラックリストから解除しました」, and close the dialog.
- **FR-064a**: After a successful release the screen MUST return to the blacklist list (decided 2026-08-07, Q-11). The released entry is absent from that list (FR-033), and that absence is the operator's confirmation. The operator MUST NOT be left on a detail screen that still presents the member as blacklisted.
- **FR-065**: Release MUST NOT delete the entry. The record MUST be retained with its release timestamp and releasing staff member so that it stays auditable.
- **FR-066**: Release MUST NOT alter the member's own status. Releasing a force-withdrawn member means "this person may enrol again", not "the withdrawal is undone".
- **FR-067**: Re-listing a released member MUST create a **new** entry through the registration path, never revive the released one.
- **FR-068**: Attempting to release an already-released entry MUST be refused with the backend's user-facing message.
- **FR-069**: Requesting a blacklist entry that does not exist MUST surface the backend's not-found message rather than an empty detail.
- **FR-069a**: Requesting a **released** entry by its identifier MUST render its detail, showing its registration and release facts, and MUST NOT offer a second release. Release flips a flag and never deletes the row, so the entry stays readable. This route survives FR-064a: after releasing, the operator leaves the detail, but a held or shared URL still resolves.
- **FR-069b**: A released entry's detail MUST NOT present the member as still blacklisted. Its status card MUST reflect the released state rather than repeat the registration path as though active, and the release timestamp and releasing staff member MUST be shown. This is a correctness constraint derived from FR-069a, not a separate design decision — the prototype has no released state to copy because V0 renders a single active entry from a constant.

#### Cross-cutting

- **FR-070**: Both screens MUST render a loading state while their data is in flight, following the project's existing skeleton conventions.
- **FR-071**: Both screens MUST surface a failed load rather than rendering an empty or partial page, following the project's existing error conventions.
- **FR-072**: All blacklist history events (`registered` / `removed`) MUST be **seed-only** and read-only in this feature. No screen creates, edits or deletes a history record directly, and **no screen renders the history array** (decided 2026-08-07, Q-06). It MUST still be seeded and returned, because the contract declares it required and the mock has to stay equivalent to the real endpoint. The release facts a reader needs are surfaced by FR-069b instead.

#### Contract alignment of existing callers

- **FR-073**: Exactly one registration endpoint MUST exist after this feature — the member-scoped one. The project's second, list-scoped registration route MUST be removed; the list Sheet reaches the member-scoped endpoint once it has resolved a member.
- **FR-074**: The member-detail registration dialog MUST be updated to the agreed request shape — the single chosen reason sent as a one-element reason-category array, alongside the optional memo. Its visible behaviour MUST NOT change: one required reason select, one optional memo, same copy, same role gating.
- **FR-075**: No compatibility shim MAY be left behind. The old request shape MUST NOT remain callable alongside the new one — two contracts for one operation would break the equivalence between the project's mock layer and the real API.

---

### Backend API Contract Mapping

Source: fitness-dx CRM API `0.8.0`, tag `Member Management` (present in `x-tagGroups` → `Member Operations`, so the backend contract is considered ready). Blacklist section is at contract revision **v0.4**.

| Screen behaviour                                                       | Endpoint                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------ |
| List display, search, filtering, pagination (FR-005 – FR-033)          | `GET /api/v1/admin/blacklist`                          |
| Detail display (FR-053 – FR-061, FR-069)                               | `GET /api/v1/admin/blacklist/{blacklistId}`            |
| Manual registration (FR-034 – FR-052)                                  | `POST /api/v1/admin/members/{memberId}/blacklist`      |
| Release (FR-062 – FR-068)                                              | `PATCH /api/v1/admin/blacklist/{blacklistId}/active`   |
| Member lookup inside the registration Sheet (FR-036 – FR-042, FR-050a) | `GET /api/v1/admin/members` (decided 2026-08-07, Q-04) |

**Two axes on one entry.** The contract separates _how_ an entry was created from _why_:

| Axis              | Field              | Values                                                                  | Screen surface                                                                                                                         |
| ----------------- | ------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Registration path | `source`           | `forced_withdrawal` / `manual`                                          | 登録経路: the list's column and filter; the detail's header badge, 登録情報 badge and status-card tone/label                           |
| Reason category   | `reasonCategories` | `unpaid` / `equipment_damage` / `nuisance` / `fraudulent_use` / `other` | 登録理由: the registration Sheet's select (write), and the list column, the 登録情報 card and the status-card meta (read) — 2026-10-05 |

Up to 2026-10-05 the screen labelled both axes 登録理由. The 9/30 prototype separates them — 登録経路 for the path and 登録理由 for the reason — and reads the reason back, so the label collision recorded in Q-03 no longer exists.

**Registration-path vocabulary**:

| Screen label | `source`            |
| ------------ | ------------------- |
| 強制退会     | `forced_withdrawal` |
| 手動登録     | `manual`            |

**Reason-category vocabulary** (registration Sheet):

| Screen label | `BlacklistReasonCategory`                                    |
| ------------ | ------------------------------------------------------------ |
| 迷惑行為     | `nuisance`                                                   |
| 未納金       | `unpaid`                                                     |
| 不正利用     | `fraudulent_use`                                             |
| 機器破損     | `equipment_damage` (offered since the 9/17 prototype update) |
| その他       | `other`                                                      |

**Field mapping (list)**: 会員ID ← `member.memberNumber`; 氏名 ← `member.lastName` + `member.firstName`; 店舗名 ← `member.primaryStore.name` (nullable); 登録経路 ← `source`; 登録理由 ← `reasonCategories`; 未納金額 ← `unpaidAmount` (integer, never null, `0` when nothing outstanding); 登録日 ← `registeredAt`. `blacklistId` routes to the detail; `member.memberId` routes to the member detail.

**Filter mapping**: search → `query` (1–60 chars, "same source set as the member list"); 登録経路 → `source`; 未納金 → `hasUnpaid`; pagination → `page` / `limit`; banner baseline count → `includeTotalAll=true` yielding `pagination.totalAllItems`; active-only default → `isActive` (defaults to `true` server-side). Default ordering is `sort=registeredAt`, `order=desc` — the screen exposes no sort control, so the defaults apply.

**Field mapping (detail)**: header badge ← `source`; head-up card ← `member.memberNumber`, `member.legacyMemberCode`, `member.lastName`/`firstName`, `member.lastNameKana`/`firstNameKana`, `member.memberType`, `member.currentMainContract.plan`, `member.primaryStore.name`; 登録情報 ← `source` (登録経路), `reasonCategories` (登録理由), `registeredAt` (登録日), `registeredBy.displayName`, `reason` (the screen's メモ); 未納金 ← `unpaidAmount`; status card ← `source` + `registeredAt` + `reasonCategories`.

> **`reason` is the memo.** The contract records a v0.4 semantic change: up to v0.3 `reason` was a required free-text 登録理由; it is now the optional 補足メモ that the screen labels 「メモ」. The reason axis moved to `reasonCategories`. Any older mapping of `reason` → 登録理由 is stale.

**Registration guards** — the backend evaluates, in a locking transaction: the member must exist and be in scope (else 404 `E-MEM-001`); no active entry may already exist for the member, including one auto-created by the forced-withdrawal path (else 409 `E-BLK-200`). `source` is never accepted from the request — every entry created here is written as `manual` server-side. The operation is **not** idempotent. On success it inserts the entry and a `blacklist_registered` history event; no member-facing notification is sent.

**Release guards** — the entry must exist (else 404 `E-BLK-001`); the request body must be exactly `{ "isActive": false }` (else 400 `E-VAL-001`); the entry must still be active (else 409 `E-BLK-201`). On success it flips `isActive`, stamps `removedBy` / `removedAt`, and inserts a `blacklist_removed` history event. The member's own status is left untouched, and the forced-withdrawal batch cannot re-list a released member because its candidate pool excludes force-withdrawn members.

**Member lookup projection** — `GET /api/v1/admin/members?query=` returns `MemberListItem`, which supplies everything the Sheet needs except two fields: 会員番号 ← `memberNumber`; 氏名 ← `lastName` + `firstName`; カナ ← `lastNameKana` + `firstNameKana`; 店舗名 ← `primaryStore.name`; the registration endpoint's path id ← `memberId`; the already-blacklisted pre-check (FR-050a) ← `hasBlacklist` (documented as "**HQ / system roles only**", which is exactly this screen's audience). The `query` parameter searches `member_number` / `legacy_member_code` / `email` / `phone` / `last_name` / `first_name` / `last_name_kana` / `first_name_kana`, **prefix-only** (`ILIKE 'kw%'`) except the two unique keys which match by equality — hence FR-038a. The exact-member-number autofill (FR-036) is the equality path of the same parameter.

**Not consumed in Phase 1**:

- `matchResult` — documented as "Future placeholder for FR-024 … null at v0.4", with the note that "the CRM screen keeps the column hidden". The client confirmed the hidden-column reading on 2026-07-29 (Q-01), so the list has no 照合結果 column, and the detail's 照合条件 card is dropped on the same rationale (Q-02).
- `level` — no screen control, stored null pending `TBD-BLACKLISTS-LEVEL-DEFINITION`.
- `history` — returned by the detail endpoint and seeded, but rendered by no Phase 1 surface (decided 2026-08-07, Q-06).
- Query parameters `reasonCategories`, `level`, `brandGroup`, `brandEnum`, `registeredFrom`, `registeredTo`, `sort`, `order` — opened for audit queries; no prototype control exists.
- `isActive=false` listing — no screen control exposes released entries; the list always requests active ones (decided 2026-08-07, Q-07).

---

### Key Entities

- **Blacklist Entry**: one member's listing. Carries its own identifier, the member it belongs to, the registration path (forced-withdrawal or manual), the reason categories, an optional memo, a severity level (unused in Phase 1), the member's live outstanding balance, whether it is still active, when and by whom it was registered, and — once released — when and by whom it was released. A member may hold at most one active entry at a time.
- **Blacklist Entry Detail**: adds a wider member block (legacy member code, name kana, member type, current main contract) and the entry's history event list.
- **Blacklist History Event**: one registration or removal of an entry, with its timestamp, the acting staff member (null for System-generated events), and event metadata carrying the registration path. Read-only and **seed-only** in this feature.
- **Member (list reference)**: the listed member — internal identifier, member number, family and given name, member status, brand group, and the primary store (nullable).
- **Member (detail reference)**: adds the legacy member code, the name kana, the member type, and the current main contract summary (nullable — the normal case once a forced-withdrawal contract closes).
- **Registering / Releasing Staff**: the staff member who performed the action — identifier and display name.
- **Outstanding Balance**: the member's live arrears total, summed over months not covered by an exemption. Computed per request, never stored on the entry, always an integer and never null.

---

### Traceability Matrix (UI → Source Requirement)

| UI element (prototype)                                                     | Source                                                                   | Requirement                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Sidebar entry ブラックリスト管理, `hqOnly` (`shared-sidebar.tsx` L113)     | A-01 L268 「BL一覧・詳細参照はHQ以上のみ」; 権限マトリクス 「BL管理」    | FR-001, FR-002                                             |
| Page title + count badge (`blacklist-list.tsx` L422-L432)                  | A-01 L265 「BL一覧画面（独立）」                                         | FR-005                                                     |
| 会員ID column (`blacklist-list.tsx` L493, L528)                            | A-01 L265 「BL登録日・登録理由・照合結果を一覧表示」 + 会員識別          | FR-007                                                     |
| 氏名 column + member drill-down (`blacklist-list.tsx` L494, L529-L539)     | A-01 L262 「BL登録操作は会員詳細画面から実行できる」 (drill-down)        | FR-008                                                     |
| 店舗名 column (`blacklist-list.tsx` L495, L540)                            | A-01 L265 (cross-store audit)                                            | FR-009                                                     |
| 登録経路 column + badges (`blacklist-list.tsx` L497, L541-L545, L239-L246) | A-01 L265 「登録理由」 (registration path)                               | FR-010                                                     |
| 登録理由 column (`blacklist-list.tsx` L498, L546)                          | A-01 L265 「登録理由」                                                   | FR-010a, FR-043a                                           |
| 未納金額 column (`blacklist-list.tsx` L499, L547-L549)                     | A-01 L96, L267 「未納金ありの会員も含む」/「未納金ありの会員も削除不可」 | FR-011                                                     |
| 登録日 column (`blacklist-list.tsx` L500, L550)                            | A-01 L265 「BL登録日」                                                   | FR-012                                                     |
| 照合結果 column, flag off (`blacklist-list.tsx` L76, L501-L503, L551-L570) | A-01 L265 「照合結果」 — but the mechanism is **FR-024 (Could)**         | **Out of scope** — client decision 2026-07-29 (Q-01)       |
| Row click → blacklist detail (`blacklist-list.tsx` L526)                   | A-01 L266 「BL詳細画面（独立）」                                         | FR-013                                                     |
| Search box (`blacklist-list.tsx` L442-L453)                                | _no source requirement_ — shared list convention                         | FR-015, FR-016                                             |
| 登録経路 filter (`blacklist-list.tsx` L456-L465)                           | A-01 L265 (registration path is a listed display axis)                   | FR-017                                                     |
| 未納金 filter (`blacklist-list.tsx` L466-L475)                             | A-01 L96 「未納金ありの会員も含む」                                      | FR-018                                                     |
| Filter-result banner (`blacklist-list.tsx` L480-L486)                      | _no source requirement_ — shared list convention                         | FR-022 – FR-025                                            |
| Empty states (`blacklist-list.tsx` L507-L520)                              | _no source requirement_ — shared list convention                         | FR-026, FR-027                                             |
| Pagination footer + 表示件数 (`blacklist-list.tsx` L578-L635)              | _no source requirement_ — shared list convention                         | FR-028 – FR-032                                            |
| 手動登録 button (`blacklist-list.tsx` L427-L430)                           | A-01 L263 「BL登録操作: …手動登録（本部のみ）」                          | FR-034                                                     |
| 会員番号 autofill field (`blacklist-list.tsx` L669-L695)                   | A-01 L263 (manual registration needs a member)                           | FR-035 – FR-037, FR-042                                    |
| Member search combobox (`blacklist-list.tsx` L697-L780)                    | A-01 L262 「会員検索と兼ねられるため」                                   | FR-038 – FR-042                                            |
| 登録理由 select (`blacklist-list.tsx` L782-L800)                           | A-01 L265 「登録理由」                                                   | FR-043                                                     |
| メモ textarea (`blacklist-list.tsx` L802-L814)                             | _no source requirement_ — prototype addition                             | FR-044                                                     |
| Deletion-warning alert (`blacklist-list.tsx` L820-L828)                    | A-01 L267-L269, L189, L305-L308                                          | FR-045                                                     |
| Sheet footer キャンセル / 登録 (`blacklist-list.tsx` L832-L851)            | A-01 L263                                                                | FR-046 – FR-048, FR-052                                    |
| Back link (`blacklist-detail.tsx` L91-L96)                                 | _no source requirement_ — shared detail convention                       | FR-053                                                     |
| Detail header title + badge (`blacklist-detail.tsx` L97-L103)              | A-01 L266 「BL登録情報の詳細参照」                                       | FR-054                                                     |
| Member head-up card (`blacklist-detail.tsx` L108-L116)                     | _no source requirement_ — shared detail convention                       | FR-055                                                     |
| 登録情報 card (`blacklist-detail.tsx` L123-L154)                           | A-01 L266                                                                | FR-057, FR-058                                             |
| 照合結果 card, flag off (`blacklist-detail.tsx` L39, L157-L207)            | A-01 L265 「照合結果」 — mechanism is **FR-024 (Could)**                 | **Out of scope** — dropped 2026-08-07 (Q-02)               |
| 未納金 card (`blacklist-detail.tsx` L210-L226)                             | A-01 L96, L267                                                           | FR-060                                                     |
| Status card (`blacklist-detail.tsx` L232-L248)                             | A-01 L266                                                                | FR-061                                                     |
| ブラックリスト解除 button + role gate (`blacklist-detail.tsx` L238-L246)   | _no source requirement_ — prototype addition, backed by the API          | FR-062 – FR-068 (in scope; client decision, Q-05)          |
| Release confirmation dialog (`blacklist-detail.tsx` L256-L276)             | _no source requirement_ — prototype addition                             | FR-063, FR-064                                             |
| A-01 FR-016 強制退会の自動判定・実行                                       | A-01 L275-L286 (System batch)                                            | **Out of scope**                                           |
| A-01 FR-024 BL自動マッチング結果の管理者通知                               | A-01 L169 (Could)                                                        | **Out of scope** — confirmed by the client 2026-07-29      |
| A-01 FR-018 個人情報の削除                                                 | A-01 L300-L308 (separate requirement)                                    | **Out of scope** — only its invariant is surfaced (FR-045) |

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An HQ operator can see every currently blacklisted member across every store on one screen, without visiting any other screen and without selecting a store first.
- **SC-002**: An operator can narrow the blacklist to a single audit question — one registration path, or presence/absence of arrears, or one member — in at most two interactions, and can see at a glance how many rows the narrowing removed.
- **SC-003**: An operator can reach one entry's full context — registration facts, arrears, and the member's identity — in a single click from the list.
- **SC-004**: An operator can register a member found only by name, kana, phone or email — with no member number in hand — in under 60 seconds from opening the list, with the resolved member's identity confirmed on screen before submitting.
- **SC-005**: A member is never listed twice: every attempt to register a member who already holds an active entry is refused with a reason shown to the operator.
- **SC-006**: An operator can release an entry and see the member leave the active list in under 30 seconds, with the outcome confirmed on screen.
- **SC-007**: A released entry is never lost — its registration and release facts remain retrievable after release by opening that entry directly. (Phase 1 provides no way to _enumerate_ released entries; see Q-07.)
- **SC-008**: Releasing an entry never changes the member's own membership status.
- **SC-009**: No Manager, Staff, Trainer or Observer can see blacklist data, whether through the menu, a direct URL, or a direct request to the underlying service.
- **SC-010**: The list, its count badge, its filter summary and its pagination footer always agree on how many rows match the current conditions.
- **SC-011**: The list returns its first page within one second for an organisation with a hundred thousand blacklist entries on file.
- **SC-012**: Before registering, the operator is always shown that the member's personal data will become undeletable.

---

## Assumptions

- **The prototype is authoritative for presentation only — never for logic.** Every label, badge tone, column order, tooltip, dialog wording, toast text, hint and empty-state message above is taken verbatim from the prototype at `47423ec` (re-aligned 2026-10-05; originally `e99646c`). Its _behaviour_ carries no authority: it runs on module-level constant arrays with no backend, so anything it computes client-side is a mock convenience, not a specification. Where the prototype's logic and the backend contract differ, the contract wins outright and the divergence is **not** a question for the client. FR-038a is the instance of this in Phase 1 — the prototype filters its 15-row member array with `.includes()` (substring); the real endpoint matches by prefix, so prefix is what gets built. Where the prototype and the **source requirement** disagree, that _is_ recorded in Q&A, because both are specifications.
- **The backend contract is the baseline for data and rules.** `Member Management` sits inside `x-tagGroups`, so its four blacklist endpoints are treated as agreed. Where the prototype's mock data shape differs from the contract (identifier formats, field availability, enum values), the contract governs the data model and the prototype governs the presentation.
- **Mock-first delivery.** Where the real API does not yet expose something this feature needs, the project's mock API layer implements it with the semantics described here and development proceeds against the mock; the gap is raised with the client through the API QA process rather than blocking this feature. **No gap remains for the FR-024 match surfaces**: both were resolved by removal rather than by a backend request — the list's 照合結果 column by the client on 2026-07-29 (Q-01) and the detail's 照合条件 card on the same rationale on 2026-08-07 (Q-02). The blacklist section of the contract went through the API QA process in July and v0.4 is its post-QA state.

  **One real gap remains**, found while resolving Q-04: `GET /api/v1/admin/members` does not return **`dateOfBirth`** or **`facePhotoUrl`** on `MemberListItem`, and the registration Sheet's identity card renders both (FR-042). Neither is new data — both already exist on `PersonalInfo` in the member-detail response, so this is a projection request, not a modelling one. The mock implements them now; a QA raising the addition should be filed alongside this feature. Falling back to a second `GET /members/{memberId}` call on selection is the alternative if the request is declined, but it runs against the round-trip preference the client stated at qa07.

- **This feature owns the list screen's registration Sheet, not the member-detail one.** A-01 L262 also places a BL registration action on the member detail. Both call the same member-scoped endpoint; the member-detail surface belongs to the A-01-01 feature.
- **The forced-withdrawal path is System-driven.** Auto-registration happens inside the forced-withdrawal batch (A-01 FR-016). This feature only reads its output and never triggers it.
- **A member holds at most one active entry.** The contract enforces a one-active-row invariant in a locking transaction; the screen relies on it rather than checking client-side.
- **Re-listing creates a new entry.** A released entry is never revived — the contract states reviving one would break the one-active-row invariant and erase the audit boundary between the old offence and the new one.
- **History is seed-only.** History events are a by-product of registration and release and are populated from seeds; no create, update or delete path for history exists in this feature, and no Phase 1 surface renders them.
- **The screen shows only active entries.** `isActive` defaults to `true` server-side and the prototype exposes no control to change it; confirmed as the Phase 1 behaviour on 2026-08-07 (Q-07), so the default view is the only view. Released entries are reachable only by holding an entry's URL.
- **Standard CRM shell.** The screens sit inside the existing sidebar/header shell, use the project's shared list conventions (filter banner, empty state, pagination, skeletons) and shared detail conventions (back link, head-up card, status card), and inherit the project's existing authentication.
- **This feature supersedes `specs/blacklist-management` and its implementation.** An earlier spec for the same FR-015 and the same two screens exists at `specs/blacklist-management/` (list) and `specs/blacklist-management/detail/` — written 2026-05-07/08 in the pre-speckit format, against the May prototype and a bespoke contract of its own invention. It is stale on four axes: it describes no release capability at all (解除 appears zero times in either file), it describes the 登録理由 / 未納金 filters as collapsible behind a 詳細フィルター button (the reviewed prototype makes them permanently visible — `blacklist-list.tsx` L402), it has no 照合結果 list column, and its data model predates the v0.4 contract (`registrationSource` / `manualReason`, no `blacklistId`, no `isActive`, no `source` / `reasonCategories` split, `reason` still meaning 登録理由 rather than メモ).

  The shipped code matches that older spec: `src/app/api/crm/blacklist/` exposes only `GET`/`POST /crm/blacklist` and `GET /crm/blacklist/[id]` with no release route, and `blacklist-filters.tsx` still renders the 詳細フィルター collapse. Aligning all of it to the v0.4 contract is part of this feature's work, not a separate migration. That alignment reaches one file beyond these two screens — the member-detail registration dialog, which calls the endpoint being re-contracted (Q-12, FR-073 – FR-075).

  **Decision (2026-08-07)**: `specs/blacklist-management/` stays in place for now, so the code currently running is never left without a spec that describes it, and so it can be diffed against while the old implementation is refactored. It MUST be deleted in the same merge request that lands this feature's implementation. `/speckit.tasks` MUST emit that deletion as an explicit final task, and `/speckit.implement` MUST NOT report done while the directory still exists.

---

## Q&A / Clarification Needed

**Status after the 2026-10-05 re-alignment**: Q-03 is superseded by the prototype (see Clarifications › Session 2026-10-05); nothing new is open.

**Status after the 2026-08-07 clarification session**: all twelve items are resolved — see `## Clarifications` for the decisions and their basis. Q-01 and Q-05 were answered by the client through the API QA process; Q-08 and Q-11 – Q-12 were decided on codebase and contract evidence; the rest were decided in session. Nothing is outstanding.

Consolidated for `/speckit.clarify`. Each item states what was found, where, and why it cannot be resolved without a decision. **Legend** — _Impact_: **Scope** (changes what gets built) / **Rule** (changes behaviour) / **Data** (changes the model) / **UX** (changes presentation).

### Q-01 — The list's 照合結果 column has no backend field, and the contract says to hide it — ✅ RESOLVED by the client, 2026-07-29

**Resolution**: **Option A — drop the column.** Answered by the client through the API QA process (`api-review-output/member-management/qa06`), not inferred here: Otaki, 2026-07-29 — 「matchResult giữ ẩn cột (FR-024 'Could', ngoài scope)」. The list ships six columns. A-01 L265's 「照合結果」 is knowingly unmet until FR-024 lands. The rest of this entry is retained as the record of what was put to the client.

**Impact**: Scope + Data

**Found**: `blacklist-list.tsx` L107 defines `MatchResult = "一致" | "要確認" | "不一致"`, L447 renders a 照合結果 column, and L205-L214 tones it destructive / warning / muted. A-01 L265 does list 「照合結果」 among the columns the BL list should display.

**Conflict**: The backend's `BlacklistEntry.matchResult` is an empty nullable object documented as a _"Future placeholder for FR-024 (BL 自動マッチング結果). null at v0.4 too, and the CRM screen keeps the column hidden — FR-024 is a Could requirement and the match-result SoT runs application → blacklist, so one entry maps to 0..N match events."_ So the contract (a) has no data, (b) expects the column absent, and (c) states the cardinality is wrong — a blacklist entry does not have _a_ match result, it has zero or more match events belonging to membership applications. A-01 L169 independently classifies FR-024 as a **Could** requirement, i.e. not Phase 1.

**Why it cannot be resolved here**: A-01 L265 asks for the column and the prototype renders it, but there is no field to render and the contract says the shape is wrong. Three defensible outcomes, and picking one changes what ships.

**Options**:

| Option | Answer                                                      | Implications                                                                                                                                                                                |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | Drop the 照合結果 column in Phase 1 (follow the contract)   | Six columns instead of seven. A-01 L265 is knowingly unmet until FR-024 lands. Smallest, most honest build.                                                                                 |
| B      | Keep the column, mock a derived value                       | Seven columns, but the value is invented — an audit screen showing a fabricated match verdict is worse than no verdict. Requires a backend request that contradicts the stated cardinality. |
| C      | Keep the column, render every row as `—` until FR-024 lands | Preserves the reviewed layout and signals the gap, at the cost of a permanently empty column.                                                                                               |

**Recommendation**: **A**. The contract's cardinality objection is substantive, not cosmetic, and FR-024 is a Could.

---

### Q-02 — The detail's 照合条件 card has no backend counterpart at all — ✅ RESOLVED, 2026-08-07

**Resolution**: **Option A — drop the card.** The detail's left column holds 登録情報 and 未納金 only. This extends the client's own 2026-07-29 rationale for the list column (FR-024 is a Could requirement, out of scope) to the identical gap on the detail, so the two screens stay consistent. Unlike Q-01 this card was never itself raised in an API QA — 「照合」 appears zero times in qa07, qa08 and qa12 — so this is a project-side decision. FR-059 retired.

**Impact**: Scope + Data

**Found**: `blacklist-detail.tsx` L45-L50 mocks `matchConditions: { nameAndBirthdate, email, phone, address }`, and L146-L206 renders them as a four-row 照合条件 card with 一致 / 不一致 badges.

**Conflict**: `BlacklistEntryDetail` carries no such field — not as `matchConditions`, not nested under `matchResult`, nowhere. Like Q-01 this is FR-024 territory, and FR-024 is a Could requirement whose source of truth runs application → blacklist rather than living on the entry.

**Why it cannot be resolved here**: The card is a substantial part of the detail's left column. Dropping it changes the screen's shape; keeping it requires either invented data or a backend addition that duplicates FR-024's model on the wrong entity.

**Options**:

| Option | Answer                                                                 | Implications                                                                                                                 |
| ------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| A      | Drop the 照合条件 card in Phase 1                                      | The left column holds two cards (登録情報, 未納金). Consistent with resolving Q-01 as A. Revisit when FR-024 lands.          |
| B      | Keep the card, request four boolean match flags on the detail response | Preserves the reviewed screen but asks the backend to model FR-024 on the entry, which its own documentation argues against. |
| C      | Keep the card, render all four as 不一致 / 未判定 until FR-024 lands   | Preserves layout, shows nothing false, but a card of four permanently-negative badges reads as a real verdict to an auditor. |

**Recommendation**: **A**, resolved together with Q-01 — the two are the same gap on two screens.

---

### Q-03 — 登録理由 names two different things on the same feature — ⏭️ SUPERSEDED, 2026-10-05

**Superseded**: the 9/30 prototype (`47423ec`) splits the axes itself — 登録経路 for the path, 登録理由 for the reason — and displays the reason on the list, the detail's 登録情報 card and the status card. That is option C plus B below. FR-010a / FR-043a / FR-058 / FR-061 were rewritten accordingly. The original resolution is kept as the record:

**Resolution (2026-08-07, no longer in force)**: **Option A — follow V0; do not surface `reasonCategories` anywhere.** No UI change, no backend change. Two consequences accepted: the operator's required reason choice is write-only from the screen's point of view, and the label 登録理由 keeps naming two axes across the feature. Captured as FR-043a so the decision survives a later reader who finds `reasonCategories` in the contract and assumes the omission was a mistake.

**Impact**: UX + Data

**Found**: The list's 登録理由 column and filter offer 強制退会 / 手動登録 (`blacklist-list.tsx` L409-L411, L444) — these are registration **paths**. The registration Sheet's 登録理由 select offers 迷惑行為 / 未納金 / 不正利用 / その他 (L725-L728) — these are **reasons**. The detail's 登録情報 card labels the path 登録理由 as well (L124). The backend separates the two axes explicitly (`source` vs `reasonCategories`) and notes the collision itself, describing the screen's dropdown as _"a registration-path axis, not a reason axis"_.

**Conflict**: An operator who registers an entry as 迷惑行為 will find it in the list under 登録理由 = 手動登録, with 迷惑行為 nowhere on the list or the detail. The reason they chose is stored (`reasonCategories`) but never displayed back.

**Why it cannot be resolved here**: The prototype is internally consistent with A-01, which also uses 登録理由 loosely (L265 lists it as a display column; L263 uses it for the manual-registration input). Fixing the labels is a design decision; surfacing the stored reason is a scope decision.

**Partially settled, 2026-07-29** (QA `member-management/qa08`): the client confirmed the two-axis model and the write-side mapping — 「reasonCategories mảng 5; reason định nghĩa lại thành memo(任意) map UI」. What remains open is the **read** side: nothing in that answer says whether the stored reason categories are shown back to the operator anywhere.

**Options**:

| Option | Answer                                                                                                          | Implications                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A      | Keep both labels as V0 has them; do not surface `reasonCategories` anywhere on the list or detail               | Zero UI change. The operator's chosen reason is write-only — recorded for audit but invisible on screen. |
| B      | Keep both labels; add the reason categories to the detail's 登録情報 card as a second field (e.g. 「詳細理由」) | One small addition, no backend change (the field is already returned). Closes the write-only gap.        |
| C      | Rename the list column and filter to 登録経路 and keep 登録理由 for the reason axis only                        | Clearest model, but diverges from both the reviewed V0 and A-01's own wording.                           |

**Recommendation**: **B**. It costs one field, needs no backend change, and stops the Sheet's required input from vanishing after submit.

---

### Q-04 — The registration Sheet's member lookup has no designated endpoint — ✅ RESOLVED, 2026-08-07

**Resolution**: **Option A — `GET /api/v1/admin/members` with its `query` parameter.** Verified against the contract rather than assumed:

- `query` searches `member_number` / `legacy_member_code` / `email` / `phone` / `last_name` / `first_name` / `last_name_kana` / `first_name_kana` — a superset of what the combobox advertises. Matching is **prefix-only** except the two unique keys, so V0's substring matching is not reproducible and is not reproduced (FR-038a).
- `MemberListItem` supplies `memberId` (the registration endpoint's path id), `memberNumber`, name, name kana and `primaryStore`.
- It also supplies `hasBlacklist`, restricted to HQ / system roles — which turns the duplicate-registration 409 into something the Sheet can pre-empt (FR-050a). Not anticipated when this question was written.
- **Missing**: `dateOfBirth` and `facePhotoUrl`. Both exist on `PersonalInfo` in the member-detail response, so a projection request is filed; the mock implements them meanwhile. Option B (a second call on selection) is the fallback if declined.

**Impact**: Data

**Found**: The Sheet resolves members two ways — an exact member-number autofill (`blacklist-list.tsx` L265-L284) and a multi-field combobox matching ID, name, kana, phone and email (L252-L262). Both run against a 15-row local mock (`MEMBER_LOOKUP_DATA`, L89-L105). The combobox needs the member's **photo, name, kana, birthdate and store**; registration needs the member's **UUID** for the endpoint path.

**Conflict**: No blacklist endpoint serves member lookup. `GET /api/v1/admin/members` exists and is described as supporting search, and the blacklist list's own `query` parameter is documented as using "the same source set as the member list", which strongly implies it is the intended lookup. But that is an inference, and it is unconfirmed whether the member-list projection carries the birthdate and face photo the Sheet's identity card renders.

**Why it cannot be resolved here**: Choosing the endpoint determines whether the identity card renders as designed or loses fields.

**Options**:

| Option | Answer                                                                                                            | Implications                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A      | Use `GET /api/v1/admin/members` with its search parameter, and request any missing identity-card fields           | One endpoint, reuses A-01 FR-001's search. May need a small projection request (birthdate, face photo).               |
| B      | Use `GET /api/v1/admin/members` for search, then `GET /api/v1/admin/members/{memberId}` on selection for the card | No backend change — the member-detail "OOUI head-up bundle" certainly carries every field. Costs a second round-trip. |
| C      | Request a dedicated lightweight member-lookup endpoint                                                            | Cleanest fit for the Sheet, but a new endpoint for one control.                                                       |

**Recommendation**: **A**, falling back to **B** if the member-list projection turns out to lack the birthdate or the photo.

**Signal from the client, 2026-07-29** (QA `member-management/qa07`): asked where the detail's head-up card should source its member attributes, they chose to widen the blacklist response inline — 「head-up mở rộng member{} …, khỏi gọi getMember」 — rather than have the screen make a second call. That is a preference for widening a payload over adding a round-trip, which argues for **A** and against **B**. It is a signal, not an answer: qa07 concerns the detail screen, not the Sheet's lookup, and a lookup is inherently a search call.

---

### Q-05 — ブラックリスト解除 exists on screen and in the API, but not in A-01 — ✅ RESOLVED by the client, 2026-07-29

**Resolution**: **Option A — build it.** Confirmed in writing, twice. QA `api-review-output/member-management/qa08`, answered 2026-07-29: 「thêm PATCH /blacklist/{id}/active để解除」. QA `api-review-output/member-management/qa12`, answered 2026-08-05: 「Câu 1+2 (EP gỡ blacklist) đã chốt từ 07-29 ở #129」. The gap had been raised against v0.1, whose own contract admitted `removedAt` / `removedBy` were 「Always null … (no removal EP); legacy columns preserved for a Phase 2 endpoint」; v0.4 implements the endpoint in full. FR-062 – FR-068 are in scope, and the V0 dialog copy (including 「解除後、再入会が可能になります」) stands. **Follow-up**: request that A-01 FR-015 be amended to describe release and its re-enrolment effect — a documentation gap, not a blocker.

**Impact**: Scope

**Found**: `blacklist-detail.tsx` L237-L245 renders a role-gated ブラックリスト解除 button and L255-L275 its confirmation dialog. The backend implements it fully as `PATCH /api/v1/admin/blacklist/{blacklistId}/active` (v0.4), with guards, audit fields and a history event.

**Conflict**: A-01 FR-015 (L260-L269) describes only 登録・参照・管理 and never mentions release. Its 異常系 is 「なし」. The screen's own dialog copy states 「解除後、再入会が可能になります」 — re-enrolment eligibility — which is a business rule with no source-requirement backing in A-01.

**Why it cannot be resolved here**: Both the prototype and the backend implement it, so building it is the low-friction path; but shipping a business capability that its own requirement document does not describe should be an explicit decision, not a default.

**Options**:

| Option | Answer                                                                 | Implications                                                                                                          |
| ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A      | Build it — prototype + API agree, and treat A-01 FR-015 as out of date | Ships the reviewed screen whole. Request that A-01 FR-015 be amended to describe release and its re-enrolment effect. |
| B      | Build it but leave the re-enrolment claim out of the dialog copy       | Same capability, no unsourced business promise. Diverges from V0 copy.                                                |
| C      | Defer release to a later phase; render the detail read-only            | Strictly source-faithful, but a blacklist with no exit is an operational trap and wastes an implemented endpoint.     |

**Recommendation**: **A**. Two independent sources implement it; the requirement document is the stale party. Flag the amendment.

---

### Q-06 — The detail endpoint returns a history the screen does not render — ✅ RESOLVED, 2026-08-07

**Resolution**: **Option A — do not render it; keep seeding it.** Matches spec 024's treatment of `statusHistories` (its Q-14) and keeps V0 fidelity. The seed is retained rather than dropped because the contract declares `history` required — the mock must return the array regardless, and seeding it realistically is what preserves mock-equals-real equivalence. FR-069b already surfaces the release facts a reader would otherwise go to a history card for.

**Impact**: Scope

**Found**: `BlacklistEntryDetail.history` is required and carries `registered` / `removed` events with timestamps, actors and metadata, sorted ascending. The reviewed detail screen has no history section.

**Conflict**: The feature request specifies history as seed-only with no create/update/delete handling — which settles the **write** side but not the **read** side. Seeded data that nothing displays is unverifiable.

**Why it cannot be resolved here**: Adding a history section changes the detail's layout; omitting it means seeded history exists only to satisfy the contract.

**Options**:

| Option | Answer                                                                            | Implications                                                                                                     |
| ------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A      | Do not render history in Phase 1 — follow V0                                      | Zero UI change. `history` is seeded and returned but unused. Consistent with how A-03 treated `statusHistories`. |
| B      | Add a 履歴 card to the detail's left column showing the registered/removed events | Makes release auditable in the UI and gives the seeded data a purpose. New card not present in V0.               |

**Recommendation**: **A**, for V0 fidelity and consistency with the precedent set on A-03 (spec 024, Q-14).

---

### Q-12 — The member-detail dialog calls the endpoint this feature re-contracts — ✅ RESOLVED, 2026-08-07

**Found**: the project has **two** registration paths where v0.4 has one. `src/app/(private)/members/[id]/_components/blacklist-dialog.tsx` L115 posts `{ reason: <enum>, memo }` to `POST /crm/members/{id}/blacklist`, while the list Sheet posts to `POST /crm/blacklist`. The v0.4 contract keeps only the member-scoped endpoint and takes `{ reasonCategories: [...], memo, level }`. The spec had declared the member-detail surface out of scope while simultaneously changing the contract underneath it — the two could not both hold.

**Resolution**: **Option A — the request shape comes into scope; the dialog's UI does not.** FR-073 – FR-075. Rejected: leaving a known-broken caller on `dev` (option B), and keeping the old endpoint alive as a shim (option C), which would put two contracts behind one operation and break mock-equals-real equivalence.

**Impact**: Scope

---

### Q-11 — What the detail does after a successful release — ✅ RESOLVED, 2026-08-07

**Found**: `blacklist-detail.tsx` L266-L269 fires a toast and closes the dialog; being a constant-backed mock, nothing else changes. With Q-05 (release ships) and Q-07 (released entries never appear in the list) both landing, the operator would otherwise be left on a detail whose status card still presents the member as blacklisted, and with `removedAt` / `removedBy` having nowhere to render.

**Resolution**: **Option C — navigate back to the list** (FR-064a). The released entry's absence from the list is the confirmation. The released-detail rendering is still required for the direct-URL route and is specified as FR-069b, derived from FR-069a rather than chosen: a status card that claims an active listing for a released entry is wrong, not merely a different design.

**Impact**: UX

---

### Q-07 — Released entries are unreachable from any screen — ✅ RESOLVED, 2026-08-07

**Resolution**: **Option A — ship active-only, as V0 does.** No third filter; the toolbar keeps 登録経路 (then labelled 登録理由) and 未納金 only, preserving the V0 always-expanded pattern. Accepted consequence: the audit value of retaining released rows is realised at the data layer and through direct entry URLs, not through any list view. Revisit if operators ask to review past releases.

**Impact**: UX

**Found**: The list endpoint's `isActive` defaults to `true`, so the list shows active entries only. The prototype exposes no control to change it. Release preserves the row explicitly "so the entry stays auditable" — but with no filter, no operator can ever see a released entry again except by holding its URL.

**Conflict**: The contract's stated audit purpose is unreachable through the UI.

**Why it cannot be resolved here**: Adding a third filter changes the toolbar, which the prototype comments deliberately kept at two (`blacklist-list.tsx` L402: 「A8: フィルター2個以下は常時展開（折りたたみなし）」 — a third control may push it into the collapsible pattern).

**Options**:

| Option | Answer                                                                                  | Implications                                                                                                               |
| ------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A      | Ship active-only, as V0 does                                                            | Zero UI change. Released entries are UI-unreachable in Phase 1; the audit trail exists in data only.                       |
| B      | Add a ステータス filter (有効 / 解除済み / 全件) as a third permanently-visible control | Makes release auditable. Three filters still fit the always-expanded pattern; the released rows need a visual distinction. |

**Recommendation**: **B** if Q-05 resolves as "build release" — releasing entries into a state no one can look at undercuts the reason for keeping them.

---

### Q-08 — The 表示件数 options exceed the endpoint's page-size cap — ✅ RESOLVED, 2026-08-07

**Resolution**: **Offer 25 / 50 / 100, default 25; drop 200.** Decided on codebase evidence, not by asking — the same route spec 024 took for the identical conflict (its Q-06). Two deciding facts: 200 is rejected by the project's own mock contract, not only the real one, so shipping it would break the Phase 1 → Phase 2 behavioural equivalence the constitution requires; and `PAGE_SIZE = 25` in `src/constants/app.constants.ts` is what every other CRM list screen defaults to, so V0's 50 is not carried over.

**Impact**: Rule

**Found**: `blacklist-list.tsx` L229 offers 25 / 50 / 100 / 200 with a default of 50. The endpoint caps `limit` at 100 with a default of 20.

**Conflict**: Selecting 200 would be rejected by the backend as a validation error.

**Why it cannot be resolved here**: The identical conflict arose on A-03 (spec 024, Q-06) and was resolved during `/speckit.plan` — the resolution should be applied consistently rather than re-decided here.

**Options**:

| Option | Answer                                               | Implications                                                               |
| ------ | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| A      | Drop the 200 option; offer 25 / 50 / 100, default 50 | Matches the cap, keeps the V0 default. Assumed to match A-03's resolution. |
| B      | Keep 200 and request the backend raise the cap       | Preserves V0 exactly; needs a contract change for a rarely-used option.    |

**Recommendation**: **A**, aligned with whatever A-03 settled on.

---

### Q-09 — Neither screen defines a loading or an error state

**Impact**: UX

**Found**: Both prototype pages render module-level constant mock data (`BLACKLIST`, `BLACKLIST_ENTRY`) with no fetch, so no skeleton, spinner or error surface exists in the source.

**Resolution by existing project convention**: The project already has established list-skeleton and detail-skeleton conventions and an error-surface convention, applied across every previously specified screen. FR-070 and FR-071 adopt them. Recorded here for completeness rather than as an open question — raise it only if a blacklist-specific treatment is wanted.

---

### Q-10 — The list count badge and the filter banner count different things

**Impact**: UX

**Found**: The page-header count badge is fed the **filtered** count (`blacklist-list.tsx` L373 — `count={filteredList.length}`), while the filter banner reads 「全 {BLACKLIST.length} 件中 {filteredList.length} 件を抽出中」 (L430-L431), where the first number is the unfiltered total.

**Conflict**: This is consistent within V0 (badge = filtered, banner = both), but the banner's baseline is a client-side array length. Against a paginated endpoint the baseline must come from `includeTotalAll=true` → `pagination.totalAllItems`, which the contract warns may be null under load and which explicitly means "all rows in the screen's baseline view" — that is, active entries only, not every row in the table.

**Resolution by inference**: FR-025 adopts `totalAllItems` with graceful degradation when null, and treats the baseline as active-entry count. Recorded for confirmation; raise only if the banner should instead show a raw total including released entries.
