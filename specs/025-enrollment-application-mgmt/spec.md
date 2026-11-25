# Feature Specification: Enrollment Application Management (入会申請管理)

**Feature Branch**: `025-enrollment-application-mgmt`
**Created**: 2026-08-06
**Status**: Draft
**PO Spec**: `C-01` — 入会申請管理（一覧） / `C-01-01` — 入会承認詳細 (doc version 260624_v5)
**Source**: `crm/requirements/C-01.md` (dx-fitness/fitness-spec @ 1700eb8, 2026-08-06; re-checked @ 5c391cf, 2026-10-06 — unchanged, still 260624_v5) + `src/pages/enrollment-application-list.tsx`, `src/pages/enrollment-application-detail.tsx`, `src/pages/enrollment-application-form.tsx` (dx-fitness/fitness-crm-ui @ e99646c, 2026-08-05; **synced to @ 47423ec, 2026-09-30** — see Clarifications › Session 2026-10-06)
**Input**: User description: "Create spec for member application management / spec: C-01.md / prototype V0: enrollment-application-list.tsx, enrollment-application-detail.tsx, enrollment-application-form.tsx"

## Scope

This feature covers the CRM-side handling of **enrollment applications** (入会申請) across three screens:

1. **Application list (L1, C-01)** — a review queue showing applications that require staff review, plus a log of applications the system already auto-approved. Provides KPI cards, search, filtering, column sorting, an overdue-review alert, and pagination.
2. **Approval detail (L2, C-01-01)** — the full single-application review screen: applicant information with masked personal data, blacklist match result, contract information, fee breakdown with enrollment-fee exemption handling, activity timeline with staff memos, a pre-approval checklist, and the approve / reject / cancel operations.
3. **Admin-side enrollment form (FR-M009/FR-M010)** — the form staff use to enrol an applicant on their behalf when the mobile app cannot be used, including brand-dependent age validation, proxy-application record keeping, blacklist result display, and automatic fee calculation.

Under the current (260624*v5) design the **normal path is fully automatic**: an application submitted from the mobile app with no blacklist match, an adult applicant, and a mobile enrolment route is auto-approved and promoted to a member without any CRM action. Only \_review-required* cases — a blacklist match, a minor applicant, or a manual/admin-side enrolment — enter the review queue. Auto-approved applications still appear in the list as an approval log.

**Out of scope**: the mobile application enrolment flow itself; the visit/trial management screens (FR-S001 見学・体験, a separate screen set with no prototype in this request); corporate-member and employee-discount enrolment sections (FR-S002 / FR-S003 — the current revision explicitly _removes_ these from the admin form and routes them through the mobile app); the member record screens themselves (A-01); billing execution (F-01); and the blacklist master screens (linked to, not built here).

## Clarifications

### Session 2026-10-06

Prototype re-sync before the real-API integration ([integration-plan.md](./integration-plan.md) Phase 0). C-01 itself has not changed since 260624_v5; the prototype received five design updates after the `e99646c` baseline (8/13, 8/27, 9/8, 9/16, 9/17). Each is adopted as follows:

- Q: Does the 未審査 KPI still count 審査中? → A: No. It counts 未審査 only, so the card matches the status column; BL要注意 still counts BL matches across 未審査 + 審査中 (prototype 9/8). FR-004 updated.
- Q: Which page sizes are offered? → A: 25 / 50 / 100; 200 is dropped (prototype 9/8). FR-014 updated.
- Q: Can a 審査中 application be approved or rejected? → A: Yes — 未審査 and 審査中 are both reviewable: checklist, approve/reject and the 入会金 exemption UI show for both (prototype 9/8). FR-025, FR-027, FR-029 updated.
- Q: What does the status card show after approval and after cancellation? → A: After approval, the created member's 会員ID and a 「会員詳細を開く（{会員ID}）」 link to the A-01 member record (C-01 FR-M005); after cancellation, 取り消し者 / 取り消し日時 / 取り消し理由 (prototype 9/8). FR-040 updated.
- Q: Which applications offer 申請を取り消す? → A: Only 承認済 / 自動承認済 (C-01 FR-M008 「承認済みの入会申請」); roles without the permission see the item disabled with a 「権限なし」 badge (prototype 9/8). FR-033 updated.
- Q: How is 契約開始日 shown before a decision? → A: 「承認時に確定」 while the application is reviewable (prototype 9/17). FR-022 updated.
- Q: How is the face photo shown? → A: As the registered image itself (it is what staff compare on a BL match); the registration timestamp is no longer shown. Only phone / e-mail / address are masked (prototype 9/17). FR-018 updated.
- Q: How does a campaign affect 入会金? → A: As a discount on the 入会金 line capped at its list price — 「割引」 when partial, 「免除」 when it reaches the full price — shown as the struck-through list price, the discounted amount and `-¥N` (prototype 9/17). A campaign with no 入会金 discount does not count as the campaign exemption. FR-026 and FR-053 updated.
- Q: Is a consent method recorded with parental consent? → A: No — consent is the confirmation checkbox only; the detail shows 「同意日時」 alone (prototype 8/27, C-01 FR-M004 L266). FR-027 updated. On the admin form a minor additionally requires 保護者氏名 and 同意日時 (prototype 9/8). FR-047 updated.
- Q: How is the address collected on the admin form? → A: Split into 郵便番号 / 都道府県 / 市町村・番地 (required) and 建物名 (optional), matching the member form (prototype 9/17). FR-044 updated.
- Q: Is 適用キャンペーン optional? → A: No — required, without a 「なし」 option, listing campaigns currently accepting applications (C-01 L212, prototype 9/8). FR-050 updated.
- Q: How is a 紹介コード handled? → A: Optional field; when filled the enrolment route becomes 紹介経由 instead of 手動 (C-01 FR-M009 L354, prototype 9/16). FR-043, FR-050, FR-061 updated.
- Q: How is a card payment authorised on the admin form? → A: A カードトークン (SBPS) field, required when the payment method is クレジットカード, plus a disabled 「取得リンクを送る」 button reserved until the token-acquisition flow is specified (dev answer 2026/08/17, prototype 9/16). FR-050 and FR-056 updated.
- Q: Are terms agreed on the admin form? → A: Yes — a 規約同意 card listing 会員規約 / 個人情報の取扱い / 施設利用規約 with their versions (source: Y-04); every one is required (prototype 9/17). New FR-064.
- Q: When does the admin-form blacklist check run? → A: As soon as any one match key is entered — 氏名＋生年月日, メール, 電話, or 住所 (OR, C-01 FR-M003 L252) — and it stays 未照合 until then (prototype 9/17). FR-052 updated.
- Q: How does a disabled 入会登録 explain itself? → A: With a tooltip naming the first unmet condition (age, parental consent, guardian name/time, terms, agreement timestamp, card token) — the cross-screen rule that a disabled button carries its reason (prototype 9/17). FR-056 updated.
- Q: Are free-text inputs bounded? → A: Yes — memo, rejection supplement, cancellation reason and staff exemption reason accept at most 1,000 characters (prototype 8/13).

### Session 2026-10-15

Real-API integration hit `400 E-VAL-001` 「planId must equal the campaign plan」 on `price-estimate` and `POST /admin/applications` when the picked plan was not the campaign's plan. BE declined a `planId` filter on `GET /admin/stores/{id}/campaigns` (it would reverse C-01's order) and proposed 案1; the customer (Otaki, 2026-10-14) chose 案1 — no FR or API change, admin enrolment follows the same rule as the mobile flow.

- Q: In which order are 適用キャンペーン and プラン chosen? → A: Campaign first, then the plan is **decided by the campaign** (C-01 基本フロー L100, 前提条件事項 L212 「キャンペーン選択→主契約が決まる（逆の操作は不可）」, API-098 §5.2 `planId = campaigns.plan_id`). プラン is placed after 適用キャンペーン, filled from the picked campaign's plan and read-only. FR-050 updated.
- Q: Which campaigns does 適用キャンペーン list? → A: Those usable at the selected store (API-088 §19.1a): `GET /admin/stores/{id}/campaigns?isAccepting=true&recruitmentActiveOn=<today>`, hiding links with `isPublished = false`. Whether 利用開始日 falls in the campaign's usage period is not checked client-side — the API answers `E-CMP-022`, shown on 利用開始日.

### Session 2026-11-19 (ladyroom — campaigns gated by the applicant's 性別)

Sources: `E-02.md` `261109_v6` FR-016 (「性別の条件があるエリアを含む主契約・オプションは、条件に合う会員にだけ販売・付与できる（アプリ・CRMとも。A-01・C-01）」) and FR-008 (who matches), `G-01.md` FR-M002 「利用できるエリア」 / 性別制限, `G-02.md` FR-002, `G-03.md` FR-006 (`fitness-spec@9e0e07e`); prototype `dx-fitness/fitness-crm-ui@9428dc2` `enrollment-application-form.tsx`, `data/campaigns.ts` (design PR #42, 11/12); API `StoreCampaignDto.planGenderCondition`, 422 `E-ARE-003`. `C-01.md` itself is silent.

- Q: Which campaigns does 適用キャンペーン list once a 主契約 can carry a 性別の条件? → A: The Session 2026-10-15 list **minus** every campaign whose 主契約 the applicant's 性別 does not meet (the campaign decides the plan, so the gate sits on the campaign). Only 女性 matches 女性のみ, only 男性 matches 男性のみ; その他 / 回答しない and 性別 **未入力** match neither; a 主契約 whose conditions contradict (`nobody`) matches no one.
- Q: What does the operator see? → A: One hint line under 適用キャンペーン, priority top-down: (1) no campaign accepting → the existing 「{brand}で受付中のキャンペーンがありません。キャンペーン管理で受付状況を確認してください」; (2) campaigns exist but none fits the applicant → 「{brand}で受付中のキャンペーンは、どれも性別の条件が申請者に合いません」 and the select disabled with 「適用できるキャンペーンがありません」; (3) a chosen campaign was removed by a 性別 change → 「性別を{x}に変えたため、選んでいたキャンペーン（{name}）を外しました。選び直してください」; (4) 性別 still empty while some campaign has a 性別の条件 → 「性別を選択すると、性別の条件があるキャンペーンも選べます」. (Prototype copy.)
- Q: 性別 changed after a campaign was chosen? → A: If the campaign no longer fits, it (and its read-only プラン) is cleared with the line (3); choosing another campaign or changing ブランド clears that line. **User decision 2026-11-19 (not the prototype):** any later 性別 change and a 入会店舗 change clear line (3) too, so it never names a 性別 the field no longer holds; a later change that drops a campaign again shows a new line (3).
- Q: Server side? → A: A mismatched create answers 422 `E-ARE-003`; the form keeps its input and shows the message.
- Q: Options granted by a campaign's 自動付与 (G-03 FR-006)? → A: G-02 FR-002 / E-02 FR-016 say 「販売・付与」, so an option whose area does not fit the applicant must not be granted. No prototype surface — **[Spec-only]**, verified on the created application (025 test plan LR4).

### Session 2026-10-30 (A-01 Bug-No19 — the member phone is E.164)

- Q: `members.phone` is now stored as E.164 (API-093 v0.14), so the revealed 電話番号 comes back as `+819012345678` while the masked value the API builds reads `090-****-****`. How is the revealed number shown? → A: **In the JP domestic display form for a `+81` number** (`+819012345678` → `090-1234-5678`), so the revealed value reads like the masked one; a number under any other country code is shown as returned (`+84901234567`), as the masked value also keeps it (`+84-****-****`). FR-019 updated.

### Session 2026-11-17 (C-01 Bug-No27 — uncollected first charge at approval)

- Q: A manual (手動入会) card application was approved, the toast said 「入会申請を承認しました。」, yet A-01 kept the member at 仮会員. Is the member status wrong? → A: **No** (BE investigation in the bug thread): approval leaves the member `provisional` unless the usage start date has arrived **and** the enrolment charge was collected (API-098 §6.5 step 1 / step 8, §6.6; BAT-013 §4.3.1). A future start date is promoted by BAT-016 at 0:30 JST on that date.
- Q: What must the screen do when the first charge does not collect? → A: C-01 FR-M005 異常系 「請求処理失敗時は会員昇格を保留しエラーを表示。スタッフに手動対応を促す」 — read `initialCharge` from the approve response (API-098 v1.26). When it is non-null and its `status` is not `paid` (`declined` / `gateway_error` / `card_not_registered`), show a warning kept on screen longer than the default (10 s, closable with ×) **instead of** the success toast (FR-030a). `initialCharge` null (口座振替, or a ¥0 invoice) or `paid` keeps the success toast. The warning copy is the FE's proposal (no spec wording); the detail GET carries no charge result, so the warning is shown only right after the approval.
- Q (2026-11-18, BA in the bug thread): Can the staff record the payment in F-01? → A: **No** — F-01 has no manual payment recording yet, so the warning only tells the staff to have the member register a card and pay the 未納 in the app. A 仮会員 can register a card in the app after linking the account (API-098 v1.26); approval failures (4xx/5xx) still roll back and keep the application status.

### Session 2026-11-18 (C-01 Bug-No11 — approving / cancelling around 利用開始日)

- Q: Approving a 未審査 application whose 利用開始日 has already passed fails with `E-ENR-004`. Is that a bug? → A: **No — per spec** (API-098 v1.23.4 §6 / §19 TBD-API098-USAGE-START-BASIS; Otaki 案A, 2026-11-17). The staff 否認 the application and the member re-applies with a new 利用開始日; an application whose 利用開始日 = today can still be approved. The FE shows the API's `E-ENR-004` message as returned — no change.
- Q: Why did the cancel-blocked message change? → A: **The API changed it.** BE MR !1048 (merged 2026-11-18) reworded `E-ENR-201` (cancel on or after 利用開始日) to 「利用開始日以降のため、キャンセルできません。」, because the block applies from 利用開始日 itself, not only after it has passed. The FE's own blocked-dialog copy (`USAGE_STARTED_MESSAGE`, used by both the client-side pre-check and the `E-ENR-201` response) is aligned to 「利用開始日以降の申請はキャンセルできません。」 (wording confirmed by Otaki). The guard logic is unchanged (blocked when `usageStartDate ≤ today`).

## User Scenarios _(mandatory)_

### User Story 1 - Work the review queue (Priority: P1)

A store staff member opens 入会申請管理 at the start of a shift and needs to know immediately how many applications are waiting and how many of them carry a blacklist warning. They scan the list, spot the applications that have been waiting too long, and open the ones that need attention.

**Why this priority**: Without the list there is no entry point to the whole feature, and the queue-size signal is the entire reason a review screen exists once normal applications are auto-approved.

**Verification**: Load the list screen as a store staff member; confirm the two KPI cards show counts consistent with the visible rows, the table shows every specified column in order, clicking a row opens that application's detail screen, and an application left unreviewed for more than the configured threshold shows a 対応超過 warning.

**Acceptance Scenarios**:

1. **Given** the list contains applications in several statuses, **When** the screen loads, **Then** the 未審査 KPI card shows the count of applications whose status is 未審査 or 審査中, and the BL要注意 card shows how many of _those_ also have a blacklist match.
2. **Given** the BL要注意 count is zero, **When** the screen loads, **Then** the card's number is rendered in the success treatment and the card carries no alert border; when the count is one or more, the number uses the destructive treatment and the card gains a destructive border.
3. **Given** a row has a blacklist match, **When** the list renders, **Then** that row is visually distinguished from non-matching rows and its BL照合 cell shows a BL一致 warning badge; a row with no match shows a neutral placeholder.
4. **Given** an application has been in 未審査 for longer than the configured overdue threshold, **When** the list renders, **Then** an 対応超過 badge appears next to its status badge with a tooltip explaining the threshold.
5. **Given** a user clicks any row, **When** the click is registered, **Then** the application's approval detail screen opens.
6. **Given** the signed-in user is scoped to a single store, **When** the list loads, **Then** only that store's applications are counted and listed, and the brand and store filters are not offered.

---

### User Story 2 - Narrow the queue down to what matters (Priority: P1)

A staff member needs to find one specific application, or to isolate a subset — only blacklist matches, only manual enrolments, only a given date range — and then be able to see plainly what filters are active and clear them in one action.

**Why this priority**: Ships with the list and is what makes the list usable beyond a handful of rows; a queue that cannot be narrowed cannot be worked.

**Verification**: Enter a partial application ID and confirm the list narrows; open the detail filter panel, set each filter, and confirm the result banner reports the active conditions and the reduced count; use the clear action and confirm every filter returns to its default.

**Acceptance Scenarios**:

1. **Given** the search box is empty, **When** the user types part of an application ID or an applicant name, **Then** only rows matching that ID or name remain and the list returns to page 1.
2. **Given** the filter panel is collapsed, **When** the user opens it, **Then** the status, application-date range, blacklist-result, and enrolment-route filters are shown, plus the brand and store filters when the user is in an all-stores view.
3. **Given** one or more filters differ from their default, **When** the list renders, **Then** the filter toggle shows a count badge, each changed control is visually marked as active, and a result banner summarises the active conditions with the filtered and total counts.
4. **Given** filters are active, **When** the user triggers the clear action (from the banner or the empty state), **Then** all filters — including search and the date range — return to their defaults and the list returns to page 1.
5. **Given** the applied filters match no applications, **When** the list renders, **Then** an empty state is shown that distinguishes "no results for these filters" from "no applications at all", offering a clear-filters action only in the former case.

---

### User Story 3 - Review and approve a single application (Priority: P1)

A staff member opens a review-required application, checks the applicant's identity and blacklist result, confirms the pre-approval checklist passes, reviews the initial charges, and approves — promoting the applicant to a member.

**Why this priority**: This is the decision the whole feature exists to support; the list without it is a read-only report.

**Verification**: Open a 未審査 application, reveal the masked personal fields, confirm the pre-approval checklist reflects the record's blacklist / age / usage-start state, approve through the confirmation dialog, and confirm the status, the approver attribution, and the timeline entry all update.

**Acceptance Scenarios**:

1. **Given** an application detail screen loads, **When** it first renders, **Then** phone number, e-mail address, and address are masked; each can be revealed individually, and a single control reveals or re-hides all three at once.
2. **Given** the application is 未審査, **When** the detail screen renders, **Then** the pre-approval checklist shows the blacklist-check result, the age condition (with the brand's minimum age, and for a minor the parental-consent state), and whether the usage start date falls within two months of the contract start date — each with a pass or warning indicator.
3. **Given** the application has a blacklist match, **When** the detail screen renders, **Then** the blacklist card is shown in the destructive treatment listing every matched condition with a link through to the matching blacklist entry, a warning alert appears above the action buttons, and the approve button's label changes to リスクを確認して承認する.
4. **Given** a staff member with approval permission presses approve, **When** the confirmation dialog opens, **Then** it summarises applicant, store, plan, and the initial charge total (net of any exemption), warns about the blacklist match when present, and only on confirming does the status become 承認済.
5. **Given** the approval completes, **When** the screen re-renders, **Then** the status card shows the approver and approval timestamp, and a system timeline entry records the approval and the completion notice.
6. **Given** the signed-in user's role has no approval permission, **When** the detail screen renders, **Then** the approve and reject actions are unavailable and explain why.

---

### User Story 4 - Reject an application with a recorded reason (Priority: P2)

A staff member determines the application must not be accepted and rejects it, choosing a standard reason and optionally adding a note, so the decision leaves an auditable trace and any held payment authorisation is released.

**Why this priority**: The negative half of the review decision; without it a problematic application can only be left in the queue indefinitely.

**Verification**: Open a 未審査 application, open the reject dialog, confirm submission is blocked until a standard reason is chosen, submit, and confirm the status, rejection attribution, and timeline entries update.

**Acceptance Scenarios**:

1. **Given** the reject dialog is open, **When** it renders, **Then** it states that the held payment information will be released immediately and that the applicant is told only of the rejection itself, offers exactly the four standard reasons (本人確認不備 / 年齢制限 / BL該当 / その他), and offers an optional free-text supplement.
2. **Given** no standard reason has been selected, **When** the user attempts to reject, **Then** the reject action is disabled.
3. **Given** a reason is selected and the user rejects, **When** the operation completes, **Then** the status becomes 否認, the status card shows the rejecting operator, timestamp, and reason, and timeline entries record both the reason (with any supplement) and the applicant notification plus payment release.

---

### User Story 5 - Cancel an approved enrolment before the usage start date (Priority: P2)

A staff member cancels an enrolment on the applicant's behalf before their usage start date, recording a mandatory reason, while the system enforces the same-day cancellation limit and explains how the refund will be handled for the applicant's payment method.

**Why this priority**: A required safeguard on an already-approved contract; lower than approval only because it applies to fewer applications.

**Verification**: Trigger cancel from the detail screen's overflow menu on an application whose usage start date is in the future; confirm the reason is mandatory, the same-day counter is shown, and confirm blocking behaviour on a past usage start date and on the third same-day attempt.

**Acceptance Scenarios**:

1. **Given** the usage start date has already been reached or passed, **When** the user triggers cancel, **Then** an error dialog blocks the operation and explains that applications past their usage start date cannot be cancelled.
2. **Given** two cancellations have already been performed for this application today, **When** the user triggers cancel, **Then** an error dialog blocks the operation and states the same-day limit of two.
3. **Given** the cancel dialog is open, **When** it renders, **Then** it shows the same-day cancellation count against the limit of 2 — escalating its treatment at one and at two — and shows refund guidance matching the payment method (card cancellation within 90 days for credit card; manual refund or CASHPOST for direct debit).
4. **Given** no cancellation reason has been entered, **When** the user attempts to confirm, **Then** the confirm action is disabled.
5. **Given** a reason is entered and cancellation is confirmed, **When** the operation completes, **Then** the status becomes 取り消し済, the same-day counter increments, and a timeline entry records the reason together with the applicable refund handling.

---

### User Story 6 - Enrol an applicant from the admin screen (Priority: P2)

A staff member enrols a walk-in applicant who cannot use the mobile app: they enter the applicant's details, the contract selection, and the agreement timestamp that proves the applicant consented, and register the application — which enters the queue as 未審査 with the 手動 enrolment route.

**Why this priority**: The documented fallback path for applicants the mobile flow cannot serve; independent of the review screens but only valuable once the queue exists.

**Verification**: Open the admin enrolment form from the list, fill every required field, confirm the age and agreement-timestamp rules gate submission, register, and confirm the application appears in the list as 未審査 with the 手動 route.

**Acceptance Scenarios**:

1. **Given** the form is open, **When** it renders, **Then** the enrolment route is displayed as a read-only 手動 value with an explanation, and no application-type, corporate, or employee-discount selection is offered.
2. **Given** a brand and a date of birth are entered, **When** the resulting age is below that brand's minimum (JOYFIT 15, FIT365 16), **Then** an error explains the age condition is not met and registration is blocked.
3. **Given** the resulting age is at or above the brand minimum but under 18, **When** the form renders, **Then** a minor warning appears with a mandatory parental-consent confirmation checkbox, and registration stays blocked until it is checked.
4. **Given** the agreement timestamp is empty, **When** the user attempts to register, **Then** registration is blocked, and the field states that without it the enrolment cannot proceed; the proxy applicant is shown read-only as recorded from the operator's session.
<!-- Superseded 2026-10-15 (案1 — campaign → plan auto-decided)
5. **Given** a brand, plan, usage start date, and campaign are selected, **When** the fee section renders, **Then** it shows the brand-appropriate charge items — card-issue fee for FIT365; enrolment fee selected from the master plus registration handling fee for JOYFIT — together with the prorated first-month fee, the following month's fee, any campaign discount, and the total.
   -->
6. **Given** a brand, store, campaign (which decides the plan) and usage start date are selected, **When** the fee section renders, **Then** it shows the brand-appropriate charge items — card-issue fee for FIT365; enrolment fee selected from the master plus registration handling fee for JOYFIT — together with the prorated first-month fee, the following month's fee, any campaign discount, and the total.
7. **Given** all validation passes and the user registers, **When** the confirmation dialog is accepted, **Then** a completion dialog states the application was added as 未審査, and returning to the list shows it there with the 手動 route.

---

### User Story 7 - Record and read the handling history (Priority: P3)

A staff member adds a note to an application so the next person to touch it understands what was checked or agreed, and reads the chronological record of everything the system and other staff have done.

**Why this priority**: Improves handover quality but no decision is blocked without it.

**Verification**: On any application detail screen, add a memo and confirm it appears at the top of the timeline attributed to the operator, is marked as a memo, and can be deleted — while system entries cannot.

**Acceptance Scenarios**:

1. **Given** the memo field is empty or whitespace, **When** the screen renders, **Then** the add action is disabled.
2. **Given** a memo is added, **When** the timeline re-renders, **Then** the memo appears as the newest entry with its timestamp, operator, and a memo marker, and offers a delete action.
3. **Given** an entry is a system record, **When** the timeline renders, **Then** it is visually distinguished from memos and offers no delete action, and the memo panel states that system records cannot be deleted.

---

### User Story 8 - Recognise a companion-to-member upgrade (Priority: P3)

When the applicant is already registered as a companion (C classification) holding a Yamauchi-ID, the reviewer needs to see before approving that approval will upgrade the existing ID rather than create a new member, carrying the existing visit and training history forward.

**Why this priority**: A comparatively rare case, but approving it blind risks duplicating a member record and losing history.

**Verification**: Open an application flagged as a companion upgrade and confirm the upgrade banner shows the inherited Yamauchi-ID, the C→A classification change, and the counts of inherited visit and training records.

**Acceptance Scenarios**:

1. **Given** the applicant is a registered companion, **When** the detail screen renders, **Then** a prominent upgrade banner explains that approving will carry the Yamauchi-ID forward to full-member (A) classification and shows the ID, the C→A transition, the inherited companion-visit count, and the inherited training-record count.
2. **Given** the applicant is not a registered companion, **When** the detail screen renders, **Then** no upgrade banner is shown.

### Edge Cases

- **Blacklist check unfinished**: when the blacklist comparison could not complete (for example the source was unreachable), the application is held rather than approved, and the pre-approval checklist must not report the check as passed.
- **Usage start date beyond two months**: the pre-approval checklist flags it as a warning showing the offending date; it warns rather than hard-blocks, leaving the judgement with the reviewer.
- **Proxy application missing its agreement timestamp**: an application whose source is the admin screen but which carries no agreement timestamp blocks approval outright, with an explanation shown above the action buttons.
- **Minor with no recorded parental consent**: the checklist shows the minor warning without the consent confirmation badge, so the reviewer can see consent is not evidenced.
- **First charge not collected at approval**: a card application whose charge right after approval is declined, hits a gateway error, or finds no registered card (the usual case for a 手動入会 card application, whose payer registers the card only after approval) is still approved; the member stays 仮会員 and the enrolment invoice becomes 未納. The member links the app account to the CRM member, registers a card and pays the 未納 in the app; BAT-016 promotes them to 有効 at 0:30 the next day (API-098 v1.26, BE !1036). The screen warns the staff to guide the member (FR-030a).
- **Direct-debit (JACCS) applicant**: the fee section warns that the first charge may be combined into the following month, so the reviewer does not expect immediate settlement.
- **Empty result vs empty dataset**: the list distinguishes "no applications match these filters" from "no applications exist", and only the former offers a clear-filters action.
- **Page out of range after filtering**: reducing the result set below the current page's range clamps to the last valid page rather than showing a blank table.
- **Campaign absent**: a row with no campaign renders a neutral placeholder rather than the literal word "なし".
- **Campaign decides the plan**: on the admin form, picking another campaign replaces the plan with that campaign's plan and re-estimates the fees; before a campaign is picked the plan shows a read-only placeholder. A plan that does not match the campaign can never be sent (API-098 §5.2 would answer E-VAL-001).
- **Age entered before brand**: on the admin form, entering a date of birth without a brand shows a hint that the brand determines the age condition, instead of judging against a guessed minimum.
- **Fee master with no applicable entry**: when no active enrolment-fee master matches the selected brand, the selector offers nothing and the amount stays empty rather than defaulting to zero silently.
- **Already-decided application**: for 承認済 / 自動承認済 / 否認 / 取り消し済 applications the pre-approval checklist and approve/reject actions are not offered; the screen reads as a record of the decision.

## Requirements _(mandatory)_

### Functional Requirements — Application list

- **FR-001**: The system MUST show a list of enrolment applications with these columns in this order: 申請ID, 氏名, ステータス, BL照合, ブランド, 申請店舗, プラン, キャンペーン, 申請日時, 入会経路, 利用開始日.
- **FR-002**: The system MUST support the six application statuses 未審査 / 審査中 / 承認済 / 自動承認済 / 否認 / 取り消し済, each rendered with a distinct status treatment.
- **FR-003**: The system MUST support the three enrolment routes モバイル / 手動 / 紹介経由, each rendered as a distinguishable badge, with 紹介経由 tracked independently of whether a campaign was applied.
- **FR-004**: The system MUST show two KPI cards above the table — 未審査 (applications whose status is 未審査) and BL要注意 (applications in 未審査 or 審査中 with a blacklist match) — computed from the data currently in the user's store scope. No minor-count card is shown.
- **FR-005**: Users MUST be able to search applications by partial application ID or applicant name.
- **FR-006**: Users MUST be able to filter by status, application-date range, blacklist result (全申請 / 一致のみ / 一致なし), and enrolment route; and additionally by brand and by store when viewing all stores.
- **FR-007**: The system MUST default the application-date range filter to the most recent 7 days and MUST offer range selection across two months of calendar at a time, in Japanese.
- **FR-008**: The system MUST indicate how many filters are active, mark each non-default control as active, and show a result banner summarising the active conditions with the filtered count against the unfiltered total, offering a one-action clear.
- **FR-009**: Users MUST be able to sort by 申請ID, 氏名, ステータス, 申請日時, and 利用開始日 by activating the column header, toggling between ascending and descending, with the active column and direction indicated; the default sort is 申請日時 descending.
- **FR-010**: When sorting by status, the system MUST order by the review-flow sequence 未審査 → 審査中 → 承認済 → 自動承認済 → 否認 → 取り消し済 rather than alphabetically.
- **FR-011**: The system MUST flag any application left in 未審査 beyond a configurable overdue threshold with an 対応超過 badge and a tooltip stating the threshold.
- **FR-012**: The system MUST visually distinguish rows with a blacklist match from the rest of the table and mark their BL照合 cell with a warning badge.
- **FR-013**: Selecting any row MUST open that application's approval detail screen.
- **FR-014**: The system MUST paginate the list, reporting the total count, total pages, and the visible range, offering page sizes of 25 / 50 / 100 with 50 as the default, and MUST return to page 1 whenever a filter, search term, sort, or page size changes.
- **FR-015**: The system MUST restrict the applications a user can see to their permitted store scope: 所属店舗 for Staff and Observer, 管轄店舗 for Manager, all stores for Headquarter and System. When the user is scoped to a single store, brand and store filters MUST NOT be offered.
- **FR-016**: The system MUST offer a 管理画面から入会登録 action that opens the admin enrolment form, available to Headquarter, System, Manager, and Staff, and unavailable — with an explanation — to Trainer and Observer.
- **FR-017**: When no applications match, the system MUST show an empty state that distinguishes a filtered-empty result (offering a clear-filters action) from a genuinely empty dataset.

### Functional Requirements — Approval detail

- **FR-018**: The system MUST show, for a selected application: the applicant's name, kana, date of birth with computed age, gender, phone number, e-mail address, address, and the face photo — rendered as the registered image, with its registered / unregistered state.
- **FR-019**: The system MUST mask the phone number, e-mail address, and address by default, MUST allow each to be revealed individually, and MUST offer a single control that reveals or re-hides all three together. A revealed `+81` phone number MUST be shown in the JP domestic display form (`090-1234-5678`); any other country code is shown as returned _(2026-10-30, A-01 Bug-No19)_.
- **FR-020**: The system MUST show the blacklist comparison result: when matched, every matched condition together with a link to the corresponding blacklist entry, in a destructive treatment; when not matched, a plain confirmation that the check ran and found nothing.
- **FR-021**: The system MUST NOT auto-reject an application on a blacklist match; the decision MUST remain with the reviewer.
- **FR-022**: The system MUST show the contract information: brand, enrolling store, plan name, monthly fee, prepayment period with its brand-specific rule, contract start date (shown as 「承認時に確定」 while the application is 未審査 or 審査中), usage start date, applied campaign, and selected options.
- **FR-023**: The system MUST show a brand-appropriate itemised fee breakdown with a total: for JOYFIT the enrolment fee, registration handling fee, prorated first-month fee, and following-month fee; for FIT365 the card-issue fee, prorated first-month fee, and following-month fee.
- **FR-024**: For an applicant paying by direct debit (JACCS) the system MUST warn that the first charge may be combined into the following month.
- **FR-025**: ⚠️ **PROVISIONAL — not yet confirmed by the PO, subject to change.** While an application is 未審査 or 審査中, the system MUST show the enrolment-fee exemption determination on the enrolment-fee line: a campaign exemption applied automatically; otherwise an automatic re-enrolment exemption judged against the configured post-withdrawal window, stating the rule, the previous withdrawal date, and whether it qualifies; otherwise a manual per-staff exemption that requires a written reason before it takes effect. Exactly one exemption applies at a time, resolved in that fixed precedence order — see the exemption note under Assumptions.
- **FR-026**: ⚠️ **PROVISIONAL — not yet confirmed by the PO, subject to change.** When an exemption applies, the system MUST show the original enrolment fee struck through against the reduced amount and the discount (`-¥N`), and MUST reduce the displayed total accordingly. A campaign reduces 入会金 by its own discount amount, capped at the list price, and is labelled 「割引」 when partial and 「免除」 when it reaches the full price; re-enrolment and staff exemptions waive 入会金 in full.
- **FR-025a**: Code implementing FR-025 and FR-026 MUST carry an inline comment recording that the enrolment-fee exemption rules are provisional — reproduced from the V0 prototype, absent from C-01 revision 260624_v5, and pending PO confirmation — so a future reader does not mistake them for a settled requirement.
- **FR-027**: The system MUST show a pre-approval checklist for 未審査 and 審査中 applications covering: blacklist check completion (flagging a match), the age condition against the brand's minimum (showing the minor state and any recorded parental consent with its 同意日時 — no consent method is recorded), and whether the usage start date is within two months of the contract start date.
- **FR-028**: The system MUST block approval when the application originated from the admin screen and carries no agreement timestamp, explaining why.
- **FR-029**: Users with approval permission MUST be able to approve a 未審査 or 審査中 application through a confirmation dialog that restates the applicant, store, plan, any exemption, and the resulting initial charge total, and that warns when a blacklist match is present. On a blacklist match the approve action MUST be labelled リスクを確認して承認する.
- **FR-030**: On approval the system MUST set the status to 承認済, record the approver and approval timestamp, and add a system timeline entry recording the approval and the completion notification; when an exemption was applied, a further entry MUST record which exemption and its justification.
- **FR-030a**: When the approval's first charge did not collect (approve response `initialCharge` non-null with `status` ≠ `paid`), the screen MUST show a warning toast that stays 10 s (longer than the default) and can be closed with ×, **instead of** the success toast (C-01 FR-M005 異常系). Title: 「入会申請を承認しましたが、入会費用（¥{amount}）を決済できませんでした。」. Description: the reason — `declined` 「クレジットカードの決済が拒否されました。」 / `gateway_error` 「決済サービスとの通信でエラーが発生しました。」 / `card_not_registered` 「会員のクレジットカードが未登録のため、決済を実行していません。」 / any other value 「決済を完了できませんでした。」 — followed by 「お支払いが完了するまで会員ステータスは「仮会員」のままです。会員にアプリでクレジットカードを登録し、未納分を支払うよう案内してください。利用開始日を迎えている場合は、お支払いの翌日に「有効」に切り替わります。利用開始日が未来の場合は、お支払い完了後も利用開始日までは「仮会員」のままです。」. `initialCharge` null or `paid` → the success toast 「入会申請を承認しました。」.
- **FR-031**: Users with approval permission MUST be able to reject an application, selecting one of exactly four standard reasons (本人確認不備 / 年齢制限 / BL該当 / その他) — mandatory — with an optional free-text supplement; the reject dialog MUST state that held payment information is released immediately and that the applicant is notified of the rejection only.
- **FR-032**: On rejection the system MUST set the status to 否認, record the rejecting operator, timestamp, and reason, and add timeline entries for both the reason and the applicant notification with payment release.
- **FR-033**: Users MUST be able to cancel a 承認済 or 自動承認済 application from the detail screen's overflow menu, with a mandatory cancellation reason; the menu is not offered for any other status, and roles without the cancel permission see the item disabled with a 「権限なし」 badge.
- **FR-034**: The system MUST block cancellation when the usage start date has been reached or passed, and MUST block a third cancellation of the same application on the same day, in both cases explaining why in a dialog.
- **FR-035**: The cancellation dialog MUST show the same-day cancellation count against the limit of two, escalating its treatment as the count rises, and MUST show refund guidance matching the payment method (card cancellation within 90 days; manual refund or CASHPOST for direct debit).
- **FR-036**: On cancellation the system MUST set the status to 取り消し済, increment the same-day cancellation count, and record a timeline entry with the reason and the applicable refund handling. Once at least one cancellation has occurred, the count MUST remain visible as evidence.
- **FR-037**: The system MUST show a chronological handling history combining system records and staff memos, newest first, each with timestamp, operator, and content; memos MUST be visually distinguished, deletable by staff, and system records MUST NOT be deletable.
- **FR-038**: Users MUST be able to add a memo; the add action MUST be unavailable while the memo is empty or whitespace.
- **FR-039**: The system MUST show the application metadata: application ID, application timestamp, application source, enrolment route, last-updated timestamp, and — for admin-screen applications — the proxy applicant and the agreement timestamp.
- **FR-040**: The system MUST show the current status with a status-specific icon and treatment, the last-updated timestamp, and — once decided — the approver/approval timestamp together with the created member's 会員ID and a 「会員詳細を開く（{会員ID}）」 link to the member record, the rejecting operator/timestamp/reason, or the cancelling operator/timestamp/reason.
- **FR-041**: When the applicant is a registered companion (C classification), the system MUST show an upgrade notice before approval stating that approval carries the existing Yamauchi-ID forward to full-member (A) classification, showing that ID, the C→A transition, and the counts of companion-visit and training records that will be inherited.
- **FR-042**: Approve and reject actions MUST be available to Headquarter, Manager, and Staff, and MUST be unavailable — with an explanation — to Trainer and Observer.

### Functional Requirements — Admin enrolment form

- **FR-043**: The form MUST display the enrolment route as a non-editable value with an explanation — 手動, or 紹介経由 once a 紹介コード is entered — and MUST NOT offer an application-type selection nor any corporate or employee-discount section.
- **FR-044**: The form MUST collect the applicant's family name, given name, family-name kana, given-name kana, date of birth, gender, phone number, e-mail address, address (郵便番号, 都道府県, 市町村・番地, 建物名), and face photo, marking each field's required or optional status; every field except 建物名 is required.
- **FR-045**: The gender selection MUST offer 男性 / 女性 / その他 / 回答しない.
- **FR-046**: The form MUST compute the applicant's age from the date of birth and judge it against the selected brand's minimum age (JOYFIT 15, FIT365 16), blocking registration below the minimum with an explanatory error.
- **FR-047**: When the applicant is at or above the brand minimum but under 18, the form MUST show a minor warning and require an explicit parental-consent confirmation together with the guardian's name (保護者氏名) and the consent date-time (同意日時) before registration is permitted.
- **FR-048**: When the applicant is an adult, the form MUST confirm the age condition is satisfied, naming the brand's minimum.
- **FR-049**: When a date of birth has been entered but no brand selected, the form MUST state that the brand determines the age condition rather than judging against a default.
<!-- Superseded 2026-10-15 (案1 — campaign → plan auto-decided)
- **FR-050**: The form MUST collect the contract selection: brand, enrolling store, plan, usage start date, applied campaign (chosen from the campaigns currently accepting applications, with no 「なし」 option), and payment method — all required — plus an optional 紹介コード; the payment method MUST offer クレジットカード（SBPS） and 口座振替（JACCS）, and choosing クレジットカード MUST add a required カードトークン field with a disabled 「取得リンクを送る」 action that explains it is enabled once the acquisition flow is specified.
  -->
- **FR-050**: The form MUST collect the contract selection in this order: brand, enrolling store, applied campaign, plan, usage start date, and payment method — all required — plus an optional 紹介コード. The applied campaign MUST be chosen from the campaigns usable at the selected store — accepting applications, with a recruitment period containing today, and published to that store — with no 「なし」 option. The plan MUST NOT be chosen independently: it is decided by the selected campaign (the campaign's 主契約), shown read-only, filled when a campaign is picked, and cleared when the campaign, store or brand is cleared or changed. The payment method MUST offer クレジットカード（SBPS） and 口座振替（JACCS）, and choosing クレジットカード MUST add a required カードトークン field with a disabled 「取得リンクを送る」 action that explains it is enabled once the acquisition flow is specified. The ブランド choice MUST offer only the brands of the signed-in staff's own stores (所属店舗, plus the FC company's stores for FC-company staff; a Manager's 管轄店舗), so the 入会店舗 list is never empty after a brand is picked; Headquarter and System keep every brand (C-01 Bug-No4). _(Added 2026-11-19, ladyroom)_ The applied-campaign list MUST also leave out every campaign whose 主契約 the applicant's 性別 does not meet (E-02 FR-016; 性別 未入力 meets no gender condition), with the hint lines and the clear-on-性別-change behaviour of Session 2026-11-19.
- **FR-051**: The form MUST require an agreement timestamp recording when the applicant consented, stating that registration cannot proceed without it, and MUST show the proxy applicant read-only as recorded from the operator's session.
- **FR-052**: The form MUST show the blacklist comparison result with three distinguishable states: not yet checked, checked with no match, and checked with a match (the last carrying guidance to review carefully). The check MUST run as soon as any one match key is entered — 氏名＋生年月日, メール, 電話, or 住所 — and MUST read 未照合 until then.
- **FR-053**: The form MUST calculate and display the initial charges from the selected brand, plan, usage start date, and campaign: for FIT365 the card-issue fee, prorated first-month fee, and following-month fee; for JOYFIT an enrolment fee chosen from the active enrolment-fee master entries applicable to the brand, its amount, the registration handling fee, the prorated first-month fee, and the following-month fee. A campaign discount MUST be folded into the 入会金 line (list price struck through, the discount and the campaign named beneath it), capped at the 入会金 list price, so the total can never fall below the other charges.
- **FR-054**: The prorated first-month fee MUST be calculated from the usage start date to the end of that month against the plan's monthly fee.
- **FR-055**: Until a brand is selected, the form MUST state that the fee items depend on the brand rather than showing an arbitrary set.
- **FR-056**: Registration MUST be blocked while the applicant is below the brand minimum age, while a minor's parental consent, guardian name or consent date-time is missing, while any consent term is unagreed, while the agreement timestamp is empty, or while a card payment has no card token — and the disabled 入会登録 action MUST state the first unmet condition in a tooltip.
- **FR-057**: Registration MUST pass through a confirmation dialog restating the enrolment route, brand, store, plan, payment method, any 入会金 campaign discount (list price, discount) and the initial charge total, and the applicant's age with any confirmed parental consent, followed by a completion notice stating the application was added as 未審査 and that the member record is created only after review and approval; the user MUST then be returned to the list.
- **FR-058**: The form MUST accept pre-filled applicant name, kana, phone number, and e-mail address carried over from a matched visit/trial record, and MUST tell the user when values were pre-filled so they can be verified.
- **FR-059**: The form MUST offer a cancel action returning to the list without registering.

### Functional Requirements — Cross-cutting

- **FR-060**: An application submitted from the mobile app with no blacklist match, an adult applicant, and the モバイル route is auto-approved and MUST appear in the list as 自動承認済 with a system timeline entry recording that the checks passed, the member record was generated, and the completion e-mail was sent — never in the review queue.
- **FR-061**: Applications reaching the CRM through the admin form MUST always enter the queue as 未審査 with the 手動 route — or 紹介経由 when a 紹介コード was entered — regardless of their blacklist or age result.
- **FR-062**: Applications MUST NOT be visible or reachable across brands or outside the signed-in user's store scope; direct access to an out-of-scope application MUST be refused.
- **FR-063**: Observer MUST be able to view the list and detail screens but MUST NOT be offered approve, reject, admin enrolment, or cancellation actions. Trainer MUST NOT reach the feature at all.
- **FR-064**: The admin form MUST collect consent to every enrolment term — 会員規約, 個人情報の取扱い, 施設利用規約, each shown with its current version (source: Y-04 規約文書管理) — and every term MUST be agreed before registration.

### Key Entities

- **Enrollment application (入会申請)**: an applicant's submitted request to join. Carries the application ID, applicant identity (name, kana, date of birth, gender, contact details, address, face photo), brand, enrolling store, selected campaign, plan, options, desired usage start date, contract start date, payment method, status, enrolment route, blacklist comparison result, application source, application and last-updated timestamps, and — once decided — the approver or rejecter with timestamp and reason.
- **Application status**: one of 未審査 / 審査中 / 承認済 / 自動承認済 / 否認 / 取り消し済, ordered by review flow.
- **Enrolment route (入会経路)**: モバイル / 手動 / 紹介経由 — how the application reached the CRM; 紹介経由 is independent of campaign application.
- **Blacklist comparison result**: whether the applicant matched, and on which conditions (name + date of birth, e-mail address, phone number, address), or that the comparison did not complete.
- **Timeline entry**: a dated, attributed record against an application — either a system record (not deletable) or a staff memo (deletable).
- **Proxy application record**: the agreement timestamp at which the applicant consented, plus the staff member who submitted on their behalf.
- **Enrollment-fee master entry**: a named, priced enrolment fee scoped to a brand and application type, active or inactive, referenced by the admin form.
- **Enrollment-fee exemption**: which exemption applies to the enrolment fee — campaign, re-enrolment (within the configured post-withdrawal window), staff-discretionary (requiring a written reason), or none — together with its justification for the approval log.
- **Companion upgrade context**: the existing Yamauchi-ID held under companion (C) classification, plus the companion-visit and training-record counts that would be inherited on promotion to full-member (A) classification.
- **Cancellation record**: the cancellation reason, the same-day cancellation count for the application, and the refund handling implied by the payment method.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A staff member opening the list can state how many applications await review and how many carry a blacklist warning within 5 seconds, without scrolling or opening any application.
- **SC-002**: A staff member can locate a specific application by ID or name in under 15 seconds from a queue of any size.
- **SC-003**: A staff member can complete a straightforward approval — open from the list, verify the checklist, approve — in under 60 seconds.
- **SC-004**: 100% of approvals, rejections, and cancellations leave an attributed, timestamped record naming the operator and, where applicable, the reason.
- **SC-005**: No application whose usage start date has passed, and no third same-day cancellation of the same application, can be cancelled through the interface.
- **SC-006**: No admin-screen application can be approved without a recorded agreement timestamp.
- **SC-007**: No applicant below their brand's minimum age, and no minor without confirmed parental consent, can be registered through the admin form.
- **SC-008**: A staff member unfamiliar with the screen can complete an admin enrolment without external guidance, with every blocked submission explaining which condition is unmet.
- **SC-009**: Applicant phone number, e-mail address, and address are hidden until a reviewer deliberately reveals them, in 100% of detail-screen loads.
- **SC-010**: A user in a role without approval permission is never presented with an approve, reject, cancel, or admin-enrolment action they cannot complete.
- **SC-011**: Applications waiting beyond the overdue threshold are visibly flagged in the list, so 100% of stale reviews are identifiable without opening them.
- **SC-012**: The initial charge total shown at approval matches the itemised breakdown, including any exemption, in every case.

## Assumptions

- **A prior implementation of these screens exists** at `/membership-applications`, built against C-01 revision 260410_v2. That revision differs materially from the current 260624_v5 basis of this spec — most notably it has no auto-approval status, uses a 申請種別 (application type) selection rather than an enrolment-route flag, and includes corporate and employee-discount sections that the current revision explicitly removes from the admin form. This spec describes the target behaviour; delivering it is therefore expected to be largely a rework of the existing screens rather than greenfield construction.
- The CRM does not itself execute the auto-approval decision for mobile applications — that happens on receipt, upstream of these screens. Within this feature's scope, auto-approved applications are read-only log records; the screens present them, they do not create them.
- 審査中 exists as a status for display, filtering, and sorting, but no transition into it is offered from these screens — the prototype provides no such affordance. Applications move directly from 未審査 to a decided status.
- The overdue-review threshold is a configurable operational value; 24 hours is used as the working default, matching the prototype.
- The re-enrolment exemption window is a configurable master value; 180 days after withdrawal is used as the working default, matching the prototype.
- Amounts are displayed tax-inclusive in Japanese yen, consistent with the prototype's figures (e.g. JOYFIT enrolment fee ¥2,200 against the spec's 税別2,000円).
- Face photos are captured for blacklist-matching accuracy and gate-side face recognition; they are explicitly _not_ formal identity verification (eKYC is not adopted).
- Payment authorisation is held rather than charged while an application is pending; approval settles it and rejection releases it. The CRM shows this state and its consequences but does not perform the payment operations itself.
- The blacklist entry linked to from the detail screen is owned by the existing blacklist management feature; this feature links to it and does not define it.
- Brand-specific rules follow C-01: minimum age JOYFIT 15 / FIT365 16; JOYFIT charges an enrolment fee plus registration handling fee while FIT365 charges a card-issue fee; FIT365's prepayment period is fixed at 2 months while JOYFIT's comes from the primary-contract master.

### ⚠️ Provisional: enrolment-fee exemption (FR-025 / FR-026)

The enrolment-fee exemption feature (campaign / re-enrolment / staff-discretionary) appears in the V0 prototype but is **not** described in C-01 revision 260624_v5, and the prototype's own source flags the multi-exemption case as unresolved (`複数免除が同時成立した場合の優先順位は要確認`).

**Decision (2026-08-06)**: build it exactly as the prototype does — **but treat it as provisional**.

- **Precedence**: campaign → re-enrolment → staff-discretionary, first match wins. Exactly one exemption applies; they never stack.
- **Scope**: the exemption applies only to the 入会金 line item, never to the registration handling fee, card-issue fee, or membership fees.
- **Status**: **not finalised.** These rules are reproduced from a prototype, not from an approved requirement. They are expected to change once the PO documents the exemption model in C-01, and the largest-wins and additive alternatives were both considered and deferred rather than rejected.
- **Carry-forward obligation**: every artefact derived from this decision — the spec requirements above, the parity items, the plan, the tasks, and the implementing code — must say plainly that the rules are provisional (FR-025a). Nothing downstream should present them as settled.

## Dependencies

- **A-01 会員管理** — approval generates or updates the member record; the outstanding-balance check is read from here.
- **B-01 入退館管理** — face recognition at the gate is the downstream re-enrolment safeguard this feature deliberately defers to.
- **F-01 売上管理** — the confirmed enrolment and prepayment charges are handed off here on approval.
- **G-01 主契約管理 / G-02 オプション管理 / G-03 キャンペーン管理** — masters for the plan, options, and campaign shown on the detail and form screens; the campaign is the origin of the plan selection.
- **Blacklist management** — source of the comparison result and target of the detail screen's entry link.
- **Enrollment-fee master** — source of the selectable enrolment fees on the admin form.
- **Y-01 スタッフ・権限管理** — supplies the role and store scope that gate every action in this feature.
- **APP-F-08 友達招待機能** — origin of the 紹介経由 enrolment route.

## Traceability

| V0 source                                   | Lines                                  | Requirements           |
| ------------------------------------------- | -------------------------------------- | ---------------------- |
| `enrollment-application-list.tsx`           | L65-90, L380-395                       | FR-001, FR-002, FR-003 |
| `enrollment-application-list.tsx`           | L361-377, L664-692                     | FR-004                 |
| `enrollment-application-list.tsx`           | L554-573, L697-834                     | FR-005, FR-006, FR-007 |
| `enrollment-application-list.tsx`           | L444-466, L533-552, L590-601, L836-842 | FR-008                 |
| `enrollment-application-list.tsx`           | L409-428, L522-531, L603-637           | FR-009, FR-010         |
| `enrollment-application-list.tsx`           | L430-442, L897-910                     | FR-011                 |
| `enrollment-application-list.tsx`           | L879-887, L913-922                     | FR-012                 |
| `enrollment-application-list.tsx`           | L397-407, L886                         | FR-013                 |
| `enrollment-application-list.tsx`           | L460, L575-588, L957-1004              | FR-014                 |
| `enrollment-application-list.tsx`           | L489-514, L560-562, L747-770           | FR-015, FR-062         |
| `enrollment-application-list.tsx`           | L645-659                               | FR-016                 |
| `enrollment-application-list.tsx`           | L863-876                               | FR-017                 |
| `enrollment-application-detail.tsx`         | L796-878                               | FR-018                 |
| `enrollment-application-detail.tsx`         | L408-444, L467-483, L801-810, L854-874 | FR-019                 |
| `enrollment-application-detail.tsx`         | L880-919                               | FR-020, FR-021         |
| `enrollment-application-detail.tsx`         | L921-978                               | FR-022                 |
| `enrollment-application-detail.tsx`         | L340-356, L980-1121                    | FR-023                 |
| `enrollment-application-detail.tsx`         | L1123-1134                             | FR-024                 |
| `enrollment-application-detail.tsx`         | L449-450, L498-536, L1000-1093         | FR-025                 |
| `enrollment-application-detail.tsx`         | L552-557, L1095-1119                   | FR-026                 |
| `enrollment-application-detail.tsx`         | L538-547, L1260-1314                   | FR-027                 |
| `enrollment-application-detail.tsx`         | L549-550, L1328-1336, L1343            | FR-028                 |
| `enrollment-application-detail.tsx`         | L1337-1348, L1393-1449                 | FR-029                 |
| `enrollment-application-detail.tsx`         | L559-593                               | FR-030                 |
| `enrollment-application-detail.tsx`         | L1451-1503                             | FR-031                 |
| `enrollment-application-detail.tsx`         | L595-621, L1249-1258                   | FR-032                 |
| `enrollment-application-detail.tsx`         | L713-728, L1549-1557                   | FR-033                 |
| `enrollment-application-detail.tsx`         | L623-645, L1571-1582                   | FR-034                 |
| `enrollment-application-detail.tsx`         | L1505-1548                             | FR-035                 |
| `enrollment-application-detail.tsx`         | L647-667, L1239-1247                   | FR-036                 |
| `enrollment-application-detail.tsx`         | L1137-1202                             | FR-037                 |
| `enrollment-application-detail.tsx`         | L669-686, L1181-1200                   | FR-038                 |
| `enrollment-application-detail.tsx`         | L1365-1386                             | FR-039                 |
| `enrollment-application-detail.tsx`         | L363-396, L1209-1258                   | FR-040                 |
| `enrollment-application-detail.tsx`         | L249-284, L737-794                     | FR-041                 |
| `enrollment-application-detail.tsx`         | L1337-1358                             | FR-042                 |
| `enrollment-application-detail.tsx`         | L225-247                               | FR-060                 |
| `enrollment-application-form.tsx`           | L195-196, L273-288                     | FR-043, FR-061         |
| `enrollment-application-form.tsx`           | L290-439                               | FR-044                 |
| `enrollment-application-form.tsx`           | L346-358                               | FR-045                 |
| `enrollment-application-form.tsx`           | L41-56, L211-218, L361-370             | FR-046                 |
| `enrollment-application-form.tsx`           | L371-390                               | FR-047                 |
| `enrollment-application-form.tsx`           | L391-398                               | FR-048                 |
| `enrollment-application-form.tsx`           | L401-403                               | FR-049                 |
| `enrollment-application-form.tsx`           | L441-512                               | FR-050                 |
| `enrollment-application-form.tsx`           | L229-230, L514-538                     | FR-051                 |
| `enrollment-application-form.tsx`           | L100-104, L540-577                     | FR-052                 |
| `enrollment-application-form.tsx`           | L106-160, L224-244, L579-670           | FR-053                 |
| `enrollment-application-form.tsx`           | L152-160                               | FR-054                 |
| `enrollment-application-form.tsx`           | L652-654                               | FR-055                 |
| `enrollment-application-form.tsx`           | L246-250, L677-683                     | FR-056                 |
| `enrollment-application-form.tsx`           | L689-766                               | FR-057                 |
| `enrollment-application-form.tsx`           | L162-209, L297-305                     | FR-058                 |
| `enrollment-application-form.tsx`           | L673-676                               | FR-059                 |
| `C-01.md`                                   | L534-548                               | FR-015, FR-042, FR-063 |
| `enrollment-application-form.tsx` @ 47423ec | L157-162, L252-254, L546-577           | FR-064                 |

> Line ranges above refer to the `e99646c` baseline unless a row names `47423ec`. Requirements changed by the 2026-10-06 prototype re-sync (see Clarifications) trace to the same functions in `47423ec`; the delta is itemised in [integration-plan.md](./integration-plan.md) › Phase 0 input.
