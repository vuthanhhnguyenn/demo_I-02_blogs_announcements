---
description: 'Task list for 025-enrollment-application-mgmt'
---

# Tasks: Enrollment Application Management (入会申請管理)

**Input**: Design documents from `/specs/025-enrollment-application-mgmt/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [checklists/parity.md](checklists/parity.md)

**Organization**: Tasks are grouped by user story so each story can be implemented, verified, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `[US1]`…`[US8]` map to the user stories in spec.md
- UI tasks cite their V0 source range and the `PAR###` items they satisfy
- V0 files live under `.cache/fitness-crm-ui/src/pages/` (repo `dx-fitness/fitness-crm-ui` @ `e99646c`)

## ⚠️ This is a REWORK, not greenfield

A complete C-01 **260410_v2** implementation already exists at `src/app/(private)/membership-applications/` (36 files) with 11 mock routes. Most tasks below **modify** files that exist. Read the current file before editing it — several already do part of the job, and a few do it in a way v5 contradicts (see [research.md](research.md) §2 for the full v2→v5 delta).

## ⚠️ No automated tests

Per the constitution's No Testing Policy this list contains **zero** test-writing tasks and none may be added. Verification is `tsc --noEmit` + ESLint + [quickstart.md](quickstart.md) + the parity gate.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Independent groundwork with no file conflicts — all three can run together.

- [x] T001 [P] Grant `Permission.MembershipApplicationsApprove` to `UserRole.Headquarter` (~L233), `UserRole.Manager` (~L404), and `UserRole.Staff` (~L492) in `src/constants/permission.constants.ts` — it is currently held by `System` alone; leave Observer at View-only and Trainer with no grant (FR-042, FR-063)
- [x] T002 [P] Rewrite `src/app/(private)/membership-applications/_constants/constants.ts` with the v5 vocabulary: six status labels + badge variants + the review-flow rank map (未審査 0 → 取り消し済 5), the three 入会経路 labels + badge variants (手動 warning / 紹介経由 info / モバイル muted), the 24 h overdue threshold, page sizes `[25, 50, 100, 200]` default 50, the brand minimum-age map (JOYFIT 15 / FIT365 16), the four rejection reasons, and the two refund-guidance strings (data-model.md §1)
- [x] T003 [P] Delete `src/app/api/crm/membership-applications/corporate-masters/route.ts` and its registration in `src/app/api/_routes/index.ts` — corporate enrolment leaves the admin form in v5 (research R8)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, mock data layer, and route-level security that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until T018 completes — the UI consumes only generated types and hooks.

### Schema (sequential — all edit the same file)

- [x] T004 Add the v5 enums to `src/app/api/_schemas/membership-application.schema.ts`: extend `MembershipApplicationStatusSchema` with `auto_approved`; add `EnrollmentRouteSchema` (`mobile|manual|referral`), `RejectionReasonSchema` (`identity_incomplete|age_restriction|blacklist_match|other`), `BlacklistCheckStateSchema` (`not_checked|no_match|matched|incomplete`), `EnrollmentFeeExemptionKindSchema` (`campaign|rejoin|staff|none`); keep `MembershipApplicationPaymentMethodSchema` and drop the now-unused `RiskReasonSchema` (data-model.md §1)
- [x] T005 Rework the list schemas in `src/app/api/_schemas/membership-application.schema.ts`: list item gains `enrollment_route`, `blacklist_state` (replacing `blacklist_match: boolean`), `brand_id`, `store_id`, `usage_start_date`, and `campaign_name: string | null`; query gains `route`, `limit` constrained to the four page sizes, and `sort_by` widened to `id|applicant_name|status|application_date|usage_start_date`; response gains `summary { pending_count, blacklist_count }` and `unfiltered_total` (contracts/list-applications.md)
- [x] T006 Rework `GetApplicationDetailResponseSchema` in `src/app/api/_schemas/membership-application.schema.ts` with the blocks in contracts/application-detail.md: face-photo state, structured `blacklist_conditions`, prepayment fields, `fee_rows` with `key`/`struck_through`, `brand_min_age`, consent timestamp/method, `contract_start_date`, proxy + `agreement_datetime`, `companion_upgrade`, `same_day_cancel_count`/`same_day_cancel_date`, `rejection_supplement`, and the **`.optional()`** `enrollment_fee_exemption` block
- [x] T007 Rework the decision schemas in `src/app/api/_schemas/membership-application.schema.ts`: approve takes an empty body; reject takes `rejection_reason` as the four-value enum (replacing the free-text `z.string().min(1)`) plus optional `rejection_supplement`; cancel response returns the updated `same_day_cancel_count` (contracts/application-decisions.md)
- [x] T008 Rework `DirectEnrollmentRequestSchema` in `src/app/api/_schemas/membership-application.schema.ts` to the v5 shape and **delete** `application_type`, the corporate block, and the employee-discount block; add required `consent.agreement_datetime`, `consent.parental_consent`, `contract.payment_method`, and `contract.enrollment_fee_master_id` (contracts/direct-enrollment.md)

### Mock data layer

- [x] T009 Create `src/app/api/_mock-db/tables/membership-application.table.ts` exporting `createMembershipApplicationTables(getDb)`, moving the `membershipApplications` block out of `src/app/api/_mock-db/tables/members.table.ts` (~L918+) unchanged as a first step, so the move and the behaviour changes stay separately reviewable
- [x] T010 Remove the now-duplicated `membershipApplications` block from `src/app/api/_mock-db/tables/members.table.ts` and register `createMembershipApplicationTables(() => db)` plus `db.membershipApplications._seed()` in `src/app/api/_mock-db/_create-db.ts`
- [x] T011 Create `src/app/api/_mock-db/seeds/membership-application.seed.ts` covering the full matrix in data-model.md §7 — all six statuses, all three routes, a multi-condition BL match and an `incomplete` check, a minor with and without consent, a companion candidate, a JACCS payer, an already-overdue 未審査 row, an admin-sourced row **missing** its agreement timestamp, a row with `campaign_id: null`, both brands, one row per exemption kind, and rows across at least two stores; delete `src/app/api/_mock-db/seeds/membership.seed.ts`
- [x] T012 Update `src/app/api/_mock-db/types/membership-applications.type.ts` with the new method signatures and discriminated result sentinels (`'not_found' | 'invalid_status' | 'agreement_missing' | 'usage_start_reached' | 'same_day_limit' | <row>`) — no `any`, no unnarrowed `unknown` (data-model.md §5)
- [x] T013 Implement scope filtering, the status rank map, and `summary`/`unfiltered_total` computation in `src/app/api/_mock-db/tables/membership-application.table.ts` — counts run over the caller's whole store scope, before pagination (research R3, R5)
- [x] T014 Implement the guarded mutations in `src/app/api/_mock-db/tables/membership-application.table.ts` — `approve` (status + agreement-timestamp gate), `reject` (enum reason + supplement), `cancel` (usage-start guard, same-day-limit guard with daily counter reset), `addMemo`/`deleteMemo` (system entries undeletable), and `createDirect` (always `pending` + `manual`) with their timeline side effects (data-model.md §5)
- [x] T015 ⚠️ Implement enrolment-fee exemption resolution in `src/app/api/_mock-db/tables/membership-application.table.ts` — precedence campaign → rejoin (180-day window) → staff, first match wins, never stacking, 入会金 line only — and **carry the FR-025a inline comment at the precedence decision itself**, stating the rules are provisional, reproduced from the V0 prototype, absent from C-01 revision 260624_v5, and pending PO confirmation

### Routes and client

- [x] T016 Add `getAuthUserFromRequest` + `getAllowedStoreIds` enforcement to every route under `src/app/api/crm/membership-applications/` (list, `[id]`, approve, reject, cancel, memos, memos/`[memoId]`, direct, enrollment-fee-masters, blacklist-check) — 401 unauthenticated, 403 without the required permission, **404** for in-existence-but-out-of-scope IDs; client-supplied `brand`/`store` params may only narrow within scope. None of these routes performs any auth check today (research §2.3 S1)
- [x] T017 Wire the reworked table methods into the route handlers under `src/app/api/crm/membership-applications/` — list (`route.ts`), detail (`[id]/route.ts`), `[id]/approve`, `[id]/reject`, `[id]/cancel`, `[id]/memos`, `direct`, `enrollment-fee-masters` — mapping each sentinel to its status code per contracts/application-decisions.md; replace the cancel stub that currently returns a hard-coded `refund_amount: 5000` with no guards
- [x] T018 Run `npm run generate-openapi && npm run generate-api`, then confirm `src/lib/api/types.gen.ts` carries the new fields and that `application_type`, the corporate block, and `corporate-masters` no longer appear anywhere in the generated client

**Checkpoint**: `npx tsc --noEmit` is clean and every screen still compiles against the regenerated client. User story work can begin.

---

## Phase 3: User Story 1 - Work the review queue (Priority: P1) 🎯 MVP

**Goal**: A staff member opens 入会申請管理 and can read the queue size, spot blacklist and overdue applications, and open one.

**Independent Test**: Sign in as Staff, load `/membership-applications`, confirm the two KPI cards match the queue (not the page), the 11 columns render in order, sorting by ステータス follows review-flow order, an overdue row is badged, a BL row is tinted, and clicking any row opens its detail screen.

- [x] T019 [US1] Render the page header — 入会申請管理 title outside the scroll area — in `src/app/(private)/membership-applications/page.tsx` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Page header (L645-647); satisfies PAR001
- [x] T020 [US1] Rework the KPI cards to two (未審査, BL要注意) in `src/app/(private)/membership-applications/_components/membership-applications-kpi-cards.tsx`, reading `summary` from the list response and **deleting the 未成年 card**; 未審査 keeps a persistent warning border, BL要注意 renders success at 0 and destructive with a destructive border above 0 — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › KPI cards (L365-377, L668-691); satisfies PAR003, PAR004, PAR005
- [x] T021 [US1] Rework the column set in `src/app/(private)/membership-applications/_components/membership-applications-table-columns.tsx` to the 11 v5 columns in order (申請ID / 氏名 / ステータス / BL照合 / ブランド / **申請店舗** / プラン / キャンペーン / 申請日時 / **入会経路** / 利用開始日) — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Table (L847-860); satisfies PAR015, PAR017
- [x] T022 [US1] Implement the five sortable headers (申請ID / 氏名 / ステータス / 申請日時 / 利用開始日) with ArrowDown/ArrowUp on the active column, muted ArrowUpDown otherwise, the three sort tooltips, a sticky muted header row, and the default 申請日時 descending with per-key direction reset — in `src/app/(private)/membership-applications/_components/membership-applications-table-columns.tsx` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Sortable headers (L412-428, L504-506, L522-531, L603-637, L848); satisfies PAR016, PAR018, PAR019
- [x] T023 [US1] Implement row interaction in `src/app/(private)/membership-applications/_components/membership-applications-table.tsx` — pointer cursor, destructive tint + destructive hover on blacklist-matched rows, muted hover otherwise, and row click navigating to the detail screen via `navigate()` wrapped in `<Link>` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Row interaction (L878-887); satisfies PAR020
- [x] T024 [US1] Implement the cell renderers in `src/app/(private)/membership-applications/_components/membership-applications-table-columns.tsx` — 申請ID muted small, 氏名 medium weight, ブランド outline badge, 申請店舗/プラン plain, キャンペーン muted rendering 「—」 when absent, 申請日時 `YYYY/MM/DD HH:mm`, 利用開始日 `YYYY/MM/DD` (both via `src/utils/date.util.ts` helpers) — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Table cells (L888-893, L923-933, L948); satisfies PAR021, PAR022, PAR026, PAR027, PAR028, PAR029, PAR031
- [x] T025 [US1] Implement the status badge with all six per-status colours and the 入会経路 badge with its three treatments in `src/app/(private)/membership-applications/_components/membership-applications-table-columns.tsx` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Status & route cells (L380-395, L894-896, L934-947); satisfies PAR023, PAR030
- [x] T026 [US1] Implement the 対応超過 badge (warning + AlertTriangle, tooltip 「未審査のまま24時間（運用設定値）を超過しています」) derived client-side from `application_date` for 未審査 rows only, and the BL照合 cell (destructive BL一致 badge with AlertTriangle when matched, muted 「—」 otherwise) in `src/app/(private)/membership-applications/_components/membership-applications-table-columns.tsx` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Overdue & BL cells (L430-442, L897-922); satisfies PAR024, PAR025
- [x] T027 [US1] Implement the pagination footer in `src/app/(private)/membership-applications/_components/membership-applications-table.tsx` — 「全 N 件 / M ページ / a-b を表示」, prev/next disabled at the ends, page-number links with ellipsis compaction past 7 pages, and the 表示件数 selector (25/50/100/200, default 50, resetting to page 1) — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Pagination footer (L460, L583-588, L957-1003); satisfies PAR033, PAR034, PAR035, PAR036
- [x] T028 [US1] Hide the brand and store filter controls and scope all counts to the signed-in user's stores when they are single-store scoped, in `src/app/(private)/membership-applications/_hooks/use-membership-applications-filters.ts` and `src/app/(private)/membership-applications/page.tsx` (FR-015; the server is authoritative — this is presentation only)

**Checkpoint**: the list reads correctly as Staff and as Headquarter; US1 is demoable on its own.

---

## Phase 4: User Story 2 - Narrow the queue down (Priority: P1)

**Goal**: Search, filter, see plainly what is active, and clear it in one action.

**Independent Test**: Type a partial ID; open the filter panel and set each control; confirm the toggle badge, the per-control active styling, and the result banner's filtered/total counts; clear and confirm every control — including search and the date range — returns to default at page 1.

- [x] T029 [US2] Rework the URL filter state in `src/app/(private)/membership-applications/_hooks/use-membership-applications-filters.ts` — add the `route` axis and the five sort keys, extend `status` to six values, default the date range to the last 7 days, and reset `page` to 1 on any filter/search/sort/page-size change (FR-014)
- [x] T030 [US2] Implement the search input (Search icon inset left, placeholder 「申請ID・氏名で検索...」, max-width 400px) and the 詳細フィルター toggle (SlidersHorizontal, label toggling 詳細フィルター ⇄ 閉じる, outline at 0 active filters and filled above 0, active-count badge, ChevronDown ⇄ ChevronUp) in `src/app/(private)/membership-applications/_components/membership-applications-filters.tsx` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Toolbar (L699-726); satisfies PAR006, PAR007
- [x] T031 [US2] Implement the filter panel controls in `src/app/(private)/membership-applications/_components/membership-applications-filters.tsx` — ステータス (7 options incl. 自動承認済), ブランド and 店舗 (**all-stores view only**), BL照合 (trigger prefixed 「BL照合:」, options 全申請/一致のみ/一致なし), and 入会経路 (全経路/モバイル/手動/紹介経由), each with non-default active styling and each `<Select>` receiving `items` via `toSelectItems` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Filter panel (L733-769, L809-831); satisfies PAR008, PAR009, PAR010, PAR012, PAR013
- [x] T032 [US2] Implement the 申請日レンジ picker in `src/app/(private)/membership-applications/_components/membership-applications-filters.tsx` using the shared `Datepicker` — CalendarIcon, label 「YYYY年M月D日 〜 YYYY年M月D日」 or 「期間を選択」, range mode with two months side by side in Japanese, defaulting to the last 7 days, active styling when changed — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Date range picker (L454-470, L771-808); satisfies PAR011
- [x] T033 [US2] Implement the filter result banner in `src/app/(private)/membership-applications/_components/membership-applications-filters.tsx` — filtered count against `unfiltered_total`, condition summary joined with 「 ・ 」 in the order ステータス / ブランド / 店舗 / BL照合 / 入会経路 / 検索: "…", and a clear action resetting every filter, the date range, the search term, and the page — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Result banner (L543-552, L590-599, L836-842); satisfies PAR014
- [x] T034 [US2] Implement the two empty states in `src/app/(private)/membership-applications/_components/membership-applications-table.tsx` — `filtered` (with a 条件をクリア button) when any filter or search term is active, `empty` otherwise, entity label 入会申請 — and clamp an out-of-range page to the last valid page after filtering — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Empty state (L863-876); satisfies PAR032

**Checkpoint**: the queue is fully workable — US1 + US2 together are a shippable list screen.

---

## Phase 5: User Story 3 - Review and approve (Priority: P1)

**Goal**: Open a review-required application, verify identity, blacklist, and the pre-approval checklist, read the charges, and approve.

**Independent Test**: Open a 未審査 application, reveal each masked field and then all three at once, confirm the checklist reflects the record's BL/age/usage-start state, approve through the dialog, and confirm the status, approver attribution, and timeline entry all update.

- [x] T035 [US3] Implement the detail page header in `src/app/(private)/membership-applications/[id]/_components/membership-application-detail.tsx` — back link 「入会申請管理に戻る」, applicant name as title, and the status badge using the same per-status colours as the list — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Page header (L363-378, L698-712); satisfies PAR037, PAR038, PAR039
- [x] T036 [US3] Rework `src/app/(private)/membership-applications/[id]/_components/applicant-info-card.tsx` — card title with a right-aligned reveal-all button (Eye/EyeOff, label toggling 「個人情報を表示」 ⇄ 「個人情報を隠す」), the 96 px face-photo circle with User icon and 顔写真 caption (success border when registered), the 登録済み/未登録 status badge, and the registration timestamp beneath it — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › 申請者情報 card (L797-844); satisfies PAR048, PAR049, PAR050, PAR051
- [x] T037 [US3] Implement the field grid and per-field masking in `src/app/(private)/membership-applications/[id]/_components/applicant-info-card.tsx` — plain 氏名 / フリガナ / 生年月日 as 「YYYY/MM/DD（N歳）」 / 性別; 電話番号 and メールアドレス masked as filled dots keeping the last 4 characters in monospace with a per-field Eye/EyeOff toggle and accessible label 「{項目}を表示する」/「{項目}を隠す」; 住所 masked the same way spanning both columns — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Applicant fields (L409-444, L847-874); satisfies PAR052, PAR053, PAR054
- [x] T038 [P] [US3] Rework `src/app/(private)/membership-applications/[id]/_components/blacklist-result-card.tsx` — matched state with destructive border and tint, AlertTriangle + 「照合済み：一致あり」, every matched condition as a bullet, and the link 「該当BLエントリの詳細を確認 →」 to the blacklist entry; unmatched state with CheckCircle + 「照合済み：該当なし」 and no alert treatment — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › ブラックリスト照合結果 card (L881-917); satisfies PAR055, PAR056, PAR057
- [x] T039 [P] [US3] Rework `src/app/(private)/membership-applications/[id]/_components/contract-info-card.tsx` — field set and order ブランド (outline badge) / 入会店舗 / プラン名 / 月額料金 (¥ formatted) / 先払い期間 (「Nヶ月」 plus the brand note 「FIT365: 2ヶ月固定」 or 「JOYFIT: 主契約マスタ設定」) / 契約開始日 / 利用開始日, plus the info-badged 適用キャンペーン rendered only when one applies and the 選択オプション badge row spanning both columns — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › 契約情報 card (L927-975); satisfies PAR058, PAR059, PAR060
- [x] T040 [US3] Rework the fee table in `src/app/(private)/membership-applications/[id]/_components/fee-payment-card.tsx` — header 項目 / 金額 (right-aligned), JOYFIT rows (入会金 / 登録事務手数料 / 初月会費（日割）/ 翌月会費) vs FIT365 rows (カード発行料 / 初月会費（日割）/ 翌月会費), the 合計 row with an emphasised top border and muted background, plus the 支払方法 field and the JACCS info alert shown only for non-credit-card payment — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › 費用・決済情報 card (L341-352, L985-991, L1110-1133); satisfies PAR061, PAR062, PAR063, PAR073, PAR074, PAR075
- [x] T041 [US3] ⚠️ **PROVISIONAL** — implement the enrolment-fee exemption UI in `src/app/(private)/membership-applications/[id]/_components/fee-payment-card.tsx`: the exemption block appears **only** on the 入会金 row and **only** while 未審査; campaign state (info badge 「キャンペーン免除（自動）」 + Info icon + 「適用: {キャンペーン名}」); the re-enrolment rule line 「再入会免除規則: 退会後 180日 以内」 with the day count emphasised, shown only when no campaign exemption applies; eligible (success badge + 「前回退会 {日付}・180日以内」), not-eligible (muted badge + 「…180日超過」), and no-history (「前回退会履歴なし」) states; the 個別に免除する ghost trigger shown only when neither automatic exemption applies; the staff panel (required 免除理由 label, 取消 button, textarea placeholder 「免除理由を入力してください（必須）...」, the approval-log note, taking effect only once the reason is non-empty); and the exempted amount cell (original struck through in muted, 「¥0」 in success, discount as 「-¥N」) with the 合計 turning success-coloured. **Carry the FR-025a inline comment here** stating the rules are provisional, from the V0 prototype, absent from C-01 260624_v5, and pending PO confirmation — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Exemption block (L498-536, L552-557, L993-1105); satisfies PAR064, PAR065, PAR066, PAR067, PAR068, PAR069, PAR070, PAR071, PAR072
- [x] T042 [US3] Rework the status card in `src/app/(private)/membership-applications/[id]/_components/status-action-card.tsx` — the 80 px tinted circle with a per-status icon (未審査 Clock/warning, 審査中 ClipboardCheck/info, 承認済 and 自動承認済 CheckCircle/success, 否認 XCircle/destructive, 取り消し済 Archive/muted), the status badge with 「最終更新: {日時}」, and the success-tinted approved block (承認者 / 承認日時) shown for both 承認済 and 自動承認済 — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › ステータス card (L380-396, L1215-1237); satisfies PAR081, PAR082, PAR083
- [x] T043 [US3] Create `src/app/(private)/membership-applications/[id]/_components/approval-checklist-card.tsx` rendering the 承認前チェック section **only while 未審査** — check 1 (CheckCircle + 「ブラックリスト照合完了」 with a right-aligned destructive 「一致あり」 badge when matched, and never reporting an `incomplete` comparison as passed); check 2 minor branch (AlertTriangle + 「未成年（N歳 / {ブランド}: X歳以上）」, success 「保護者同意確認済み」 badge when recorded, sub-line with the consent timestamp and method) and adult branch (CheckCircle + 「年齢条件: 成人（N歳 / {ブランド}: X歳以上）」); check 3 (CheckCircle + 「利用開始日: 2ヶ月以内」 or AlertTriangle + 「利用開始日: 契約開始日から2ヶ月超（{日付}）」 — a warning, never a block) — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › 承認前チェック (L538-547, L1260-1310); satisfies PAR086, PAR087, PAR088, PAR089, PAR090
- [x] T044 [US3] Implement the pre-action alerts and the approve button in `src/app/(private)/membership-applications/[id]/_components/status-action-card.tsx` — the blacklist warning 「BL一致あり。慎重に審査してください。」, the missing-agreement alert 「代理申請の合意日時が未入力です。…承認操作をブロックしています。」 shown when the source is 管理画面 with no agreement timestamp, and a full-width `RoleGatedButton` with Check icon (deny tooltip 「入会申請承認の権限がありません」, label 「承認する」 or 「リスクを確認して承認する」 with an outline variant on a BL match, disabled when the agreement timestamp is missing); hide the whole checklist and action block for any status other than 未審査 — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Actions (L549-550, L1316-1348); satisfies PAR091, PAR092, PAR093, PAR095
- [x] T045 [P] [US3] Rework `src/app/(private)/membership-applications/[id]/_components/application-meta-card.tsx` — 申請ID (monospace) / 申請日時 / 申請元 / 入会経路 / 更新日時, plus 代理申請者 and 合意日時 rendered only when the source is 管理画面 and the values exist — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › 申請情報 card (L1366-1383); satisfies PAR096, PAR097
- [x] T046 [US3] Rework `src/app/(private)/membership-applications/[id]/_components/approve-dialog.tsx` — title 「入会申請を承認しますか？」 with its description, the 申請者 / 店舗 / プラン summary rows, ⚠️ the _provisional_ exemption rows (「入会金（定価）」 struck through then 「入会金免除（{種別}）」 with 「-¥N」 in success), the 「初期費用合計」 row reflecting the exemption plus the 売上管理 note, the in-dialog blacklist alert, and the キャンセル / 承認する footer — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Approve dialog (L1396-1447); satisfies PAR098, PAR099, PAR100, PAR101, PAR102, PAR103
- [x] T047 [US3] Wire the approve mutation in `src/app/(private)/membership-applications/[id]/_components/membership-application-detail.tsx` using the generated hook — on success invalidate the detail and list queries so the status becomes 承認済 with approver and timestamp recorded, a system timeline entry 「入会申請を承認しました。会員登録完了通知を送信しました。」 appears, and a second entry records the exemption type and justification when one applied — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › handleApprove (L559-593); satisfies PAR104

**Checkpoint**: the core review decision works end to end. US1 + US2 + US3 is the MVP.

---

## Phase 6: User Story 4 - Reject with a recorded reason (Priority: P2)

**Goal**: Reject an application with one of four standard reasons, leaving an auditable trace and releasing the held payment authorisation.

**Independent Test**: Open a 未審査 application, open the reject dialog, confirm submission is blocked until a standard reason is chosen, submit, and confirm the status, rejecter attribution, and both timeline entries.

- [x] T048 [US4] Add the reject button to `src/app/(private)/membership-applications/[id]/_components/status-action-card.tsx` — full-width outline with X icon and destructive text, role-gated with deny tooltip 「入会申請否認の権限がありません」 — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Reject button (L1349-1358); satisfies PAR094
- [x] T049 [US4] Rework `src/app/(private)/membership-applications/[id]/_components/reject-dialog.tsx` — title 「入会申請を否認」, the payment-release info alert naming the payment method, the 否認理由 select with placeholder 「否認理由を選択してください」 and **exactly four** options (本人確認不備 / 年齢制限 / BL該当 / その他) replacing the current free-text input, the optional 補足 4-row textarea, and the キャンセル / destructive 否認する footer disabled until a standard reason is selected — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Reject dialog (L1454-1501); satisfies PAR105, PAR106, PAR107, PAR108, PAR109
- [x] T050 [US4] Wire the reject mutation in `src/app/(private)/membership-applications/[id]/_components/membership-application-detail.tsx` — on success the status becomes 否認 with rejecter, timestamp, and reason recorded, and two timeline entries appear (the reason with any supplement, and the applicant notification plus payment release) — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › handleReject (L595-621); satisfies PAR110
- [x] T051 [US4] Render the destructive-tinted rejected block (否認者 / 否認日時 / 否認理由) in `src/app/(private)/membership-applications/[id]/_components/status-action-card.tsx` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Rejected block (L1249-1258); satisfies PAR085

**Checkpoint**: both halves of the review decision are complete.

---

## Phase 7: User Story 5 - Cancel before the usage start date (Priority: P2)

**Goal**: Cancel an enrolment on the applicant's behalf with a mandatory reason, under the same-day limit, with refund handling explained.

**Independent Test**: Trigger cancel from the overflow menu on a future-usage-start application; confirm the reason is mandatory and the same-day counter shows; then confirm the two blocked cases each raise their own error dialog.

- [x] T052 [US5] Add the overflow menu to `src/app/(private)/membership-applications/[id]/_components/membership-application-detail.tsx` — MoreHorizontal trigger with a single destructive 「申請を取り消す」 item and an X icon — and rework `src/app/(private)/membership-applications/[id]/_components/cancel-dialog-menu.tsx` accordingly — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Overflow menu (L713-728); satisfies PAR040
- [x] T053 [US5] Rework `src/app/(private)/membership-applications/[id]/_components/cancel-dialog.tsx` — title 「申請を取り消しますか？」 with its irreversibility description, the same-day count alert 「本日のキャンセル: N / 2回（上限）」 with three treatments (muted at 0, warning at 1, destructive at 2) and the two escalating suffixes, the payment-method refund alert (info for credit card, warning naming CASHPOST/振込 otherwise), the required 取り消し理由 3-row textarea, and the footer whose キャンセル clears the reason and whose destructive 取り消す stays disabled until a reason is entered — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Cancel dialog (L1508-1567); satisfies PAR111, PAR112, PAR113, PAR114, PAR115
- [x] T054 [US5] Rework `src/app/(private)/membership-applications/[id]/_components/cancel-error-dialog.tsx` to carry **two distinct** blocked messages behind the shared title 「キャンセルできません」 with a 閉じる action — 「利用開始日以降の申請はキャンセルできません。」 raised before the cancel dialog opens, and 「当日のキャンセル操作は2回までです。」 raised once the count has reached 2 — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Cancel error dialog (L623-643, L1571-1582); satisfies PAR117, PAR118, PAR119
- [x] T055 [US5] Wire the cancel mutation in `src/app/(private)/membership-applications/[id]/_components/membership-application-detail.tsx` — map the `usage_start_reached` and `same_day_limit` 409s onto their respective error dialogs, and on success set 取り消し済, increment the same-day counter from the response, and add the timeline entry carrying the reason plus the payment-method-appropriate refund note — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › handleCancel (L647-667); satisfies PAR116
- [x] T056 [US5] Render the 当日取り消し回数 row 「N / 2」 with a destructive number at the limit in `src/app/(private)/membership-applications/[id]/_components/status-action-card.tsx`, shown once approved or once at least one cancellation has occurred — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Same-day count row (L1239-1247); satisfies PAR084

**Checkpoint**: all three decision paths (approve / reject / cancel) are complete and guarded.

---

## Phase 8: User Story 6 - Enrol an applicant from the admin screen (Priority: P2)

**Goal**: Staff enrol a walk-in applicant the mobile app cannot serve; the application enters the queue as 未審査 with the 手動 route.

**Independent Test**: Open the form from the list, fill every required field, confirm the age and agreement-timestamp rules gate submission, register, and confirm the application appears in the list as 未審査 / 手動.

- [x] T057 [US6] Add the 管理画面から入会登録 action to `src/app/(private)/membership-applications/page.tsx` — Plus icon + label, role-gated to Headquarter/System/Manager/Staff with deny tooltip 「管理画面から入会登録する権限がありません」, wrapped in `<Link>` to the enrolment form — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-list.tsx` › Header action (L648-658); satisfies PAR002
- [x] T058 [US6] **Delete** `src/app/(private)/membership-applications/create/_components/application-type-section.tsx`, `corporate-info-section.tsx`, and `employee-discount-section.tsx`, and remove their usage from `enrollment-form.tsx` — the 申請種別 axis and both enrolment variants leave the admin form in v5 (research R8)
- [x] T059 [US6] Rework the page shell in `src/app/(private)/membership-applications/create/page.tsx` — back link 「入会申請管理に戻る」, title 「管理画面入会」, content constrained to a 960 px centred column — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Page header (L258-271); satisfies PAR120
- [x] T060 [US6] Create `src/app/(private)/membership-applications/create/_components/enrollment-route-section.tsx` — read-only 手動 value in a bordered muted field with the note 「管理画面からの入会は入会経路「手動」が自動付与されます。申請種別の選択は不要です。」 — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Section 1 (L195-196, L273-288); satisfies PAR121
- [x] T061 [US6] Rework the identity fields in `src/app/(private)/membership-applications/create/_components/applicant-info-section.tsx` — the pre-fill info alert shown only when values were carried over, 氏名（姓/名） and フリガナ（姓/名） as two-column required rows with their placeholders, the required 生年月日 `Datepicker`, the required 性別 select (男性/女性/その他/回答しない), the required 電話番号 and メールアドレス with their placeholders, the optional 住所, and the required 顔写真 drop zone with its constraint and purpose lines — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Section 2 (L186-193, L297-345, L404-436); satisfies PAR122, PAR123, PAR124, PAR125, PAR126, PAR131, PAR132, PAR133
- [x] T062 [US6] Implement the four age states in `src/app/(private)/membership-applications/create/_components/applicant-info-section.tsx` — below-minimum destructive alert naming the brand and its minimum; minor warning alert plus the required consent checkbox 「申込者が保護者の同意を得た上で申し込む旨を確認しました」; adult success alert; and the 「ブランドを選択すると年齢条件を判定します」 hint when a birth date is entered before a brand — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Age states (L41-56, L361-403); satisfies PAR127, PAR128, PAR129, PAR130
- [x] T063 [US6] Rework `src/app/(private)/membership-applications/create/_components/contract-info-section.tsx` — required ブランド select (FIT365/JOYFIT), required 入会店舗 combobox, required プラン select with its six options, required 利用開始日 `Datepicker`, optional 適用キャンペーン select with placeholder 「なし」, and required 決済方法 select (クレジットカード（SBPS） / 口座振替（JACCS）) — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Section 3 (L448-509); satisfies PAR134, PAR135, PAR136, PAR137, PAR138, PAR139
- [x] T064 [US6] Rework `src/app/(private)/membership-applications/create/_components/proxy-record-section.tsx` — the required 合意日時 date-time input with the hint 「…未入力の場合は入会登録（承認）に進めません」, and the read-only 代理申請者 field with the note 「代理申請者は操作ログから自動記録されます。」 — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Section 4 (L521-536); satisfies PAR140, PAR141
- [x] T065 [P] [US6] Verify and align the three states in `src/app/(private)/membership-applications/create/_components/blacklist-result-section.tsx` — matched (destructive card, 「照合済み：一致あり」 badge, careful-review note), unmatched (success badge, 「ブラックリストとの一致はありません。」), and not-yet-checked (warning 「未照合」 badge, 「申請者情報を入力後、照合が自動実行されます。」) — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Section 5 (L541, L547-575); satisfies PAR142, PAR143, PAR144
- [x] T066 [US6] Rework `src/app/(private)/membership-applications/create/_components/fee-section.tsx` — the FIT365 layout (カード発行料 read-only with its 税別 hint, 初月会費（日割）, 翌月会費, and **no** 入会金 or 登録事務手数料), the JOYFIT layout (入会金（マスタ参照） select filtered to active masters for the brand and rendering options as 「{名称}（¥N）」 with the two placeholders, the read-only 金額, 登録事務手数料 with its hint, 初月会費（日割）, 翌月会費), the no-brand hint 「ブランドを選択すると費用項目が切り替わります」, the campaign discount line, and the emphasised 合計 floored at zero — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Section 6 (L106-130, L586-666); satisfies PAR145, PAR146, PAR147, PAR148, PAR149
- [x] T067 [US6] Implement the prorated first-month fee — usage start date through the end of that month against the plan's monthly fee, using `date-fns` for the arithmetic — in `src/app/(private)/membership-applications/create/_components/fee-section.tsx` — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › calcProratedFee (L152-160); satisfies PAR150
- [x] T068 [US6] Rework `src/app/(private)/membership-applications/create/_schemas/enrollment-form.schema.ts` to the v5 field set with the cross-field rules — age at or above the brand minimum, parental consent required under 18, agreement timestamp required — removing the application-type, corporate, and employee-discount fields. Call `form.trigger()` on brand and birth-date changes so the cross-field errors do not silently vanish, and enforce `TEXT_MAX_LENGTH`/`TEXTAREA_MAX_LENGTH` plus email and phone patterns
- [x] T069 [US6] Implement the footer actions in `src/app/(private)/membership-applications/create/_components/enrollment-form.tsx` — large outline キャンセル returning to the list without saving, and large primary 入会登録 disabled while the applicant is below the brand minimum, while a minor's consent is unchecked, or while the agreement timestamp is empty — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Footer (L246-250, L674-683); satisfies PAR151, PAR152
- [x] T070 [US6] Implement the confirmation dialog in `src/app/(private)/membership-applications/create/_components/enrollment-form.tsx` — title 「入会申請の内容を確認」 with its 未審査 description, the summary rows in order 入会経路 / ブランド / 入会店舗 / プラン / 決済方法 each falling back to 「—」, the 年齢 row with its success 「保護者同意確認済み」 marker for a consented minor shown only once an age is derivable, and the 戻る / 申請を登録 footer — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Confirmation dialog (L692-741); satisfies PAR153, PAR154, PAR155, PAR156
- [x] T071 [US6] Implement the completion dialog and submit wiring in `src/app/(private)/membership-applications/create/_components/enrollment-form.tsx` — POST via the generated `direct` mutation, then the completion dialog 「入会申請を登録しました」 with its description, and a 完了 action that fires the toast 「入会申請を登録しました（未審査）」 and returns to the list — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-form.tsx` › Completion dialog (L748-764); satisfies PAR157, PAR158
- [x] T072 [P] [US6] Delete `src/app/(private)/membership-applications/create/_components/minor-consent-dialog.tsx` if T062's inline consent checkbox fully replaces it; otherwise record in the file why a dialog is still required (V0 uses an inline checkbox, not a modal — Constitution IV favours the shortest path)

**Checkpoint**: the admin enrolment path is complete; a registered application appears in the queue built in US1.

---

## Phase 9: User Story 7 - Record and read the handling history (Priority: P3)

**Goal**: Add a memo the next reviewer can read, and read the chronological record of everything done.

**Independent Test**: On any detail screen, add a memo, confirm it appears newest-first attributed to the operator with a memo marker and a delete action, and confirm system entries offer none.

- [x] T073 [US7] Rework the timeline in `src/app/(private)/membership-applications/[id]/_components/activity-timeline-card.tsx` — the rail with a per-entry dot (muted for system records, primary for memos) and a connector line, the entry header (timestamp, operator, 「メモ」 badge on memos only), the hover-revealed Trash2 + 削除 affordance present on memos only, and the entry body newest-first — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › 対応履歴 timeline (L1148-1174); satisfies PAR076, PAR077, PAR078, PAR079
- [x] T074 [US7] Implement the memo composer in `src/app/(private)/membership-applications/[id]/_components/activity-timeline-card.tsx` — label 「メモを追加」, the note 「システム記録・操作ログは削除できません。追加したメモのみ後から削除できます。」, a 3-row textarea with placeholder 「メモを入力してください...」 and `TEXTAREA_MAX_LENGTH`, and a 追加 button disabled while the value is empty or whitespace — wiring the add and delete mutations with query invalidation — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Memo composer (L669-686, L1181-1200); satisfies PAR080

---

## Phase 10: User Story 8 - Recognise a companion-to-member upgrade (Priority: P3)

**Goal**: Before approving, the reviewer sees that approval upgrades an existing Yamauchi-ID rather than creating a new member.

**Independent Test**: Open a companion-flagged application and confirm the banner shows the inherited ID, the C→A transition, and both inherited counts; confirm a non-companion application shows no banner.

- [x] T075 [US8] Create `src/app/(private)/membership-applications/[id]/_components/companion-upgrade-banner.tsx` — info-treatment card with ArrowUpCircle and title 「同伴者からの正会員昇格申請」, the explanatory paragraph, the monospace info-coloured 引き継がれるYamauchi-ID, the 現在の区分 「C区分（同伴者）」 muted badge → arrow → 「A区分（正会員）」 success badge, 引き継ぐ同伴履歴 with a History icon and 件 suffix, 引き継ぐトレーニング記録 with a Dumbbell icon and 件 suffix, and the Info-icon note 「承認後、Yamauchi-IDの区分がC→Aに自動更新されます。」 — rendered only when `companion_upgrade` is present — port from `.cache/fitness-crm-ui/src/pages/enrollment-application-detail.tsx` › Companion upgrade banner (L738-791); satisfies PAR041, PAR042, PAR043, PAR044, PAR045, PAR046, PAR047
- [x] T076 [US8] Mount the banner above the 申請者情報 card in `src/app/(private)/membership-applications/[id]/_components/membership-application-detail.tsx`, and extend `src/app/(private)/membership-applications/[id]/_components/membership-application-detail-skeleton.tsx` so the loading shape still matches the rendered content

---

## Phase 11: Polish & Cross-Cutting Concerns

- [x] T077 [P] Add skeleton blocks for the new detail cards (checklist, companion banner, exemption rows) to `src/app/(private)/membership-applications/[id]/_components/membership-application-detail-skeleton.tsx` and confirm every fetching page is wrapped in `DataStateBoundary` with a user-visible retry
- [x] T078 [P] Sweep `src/app/(private)/membership-applications/` for code-rule violations: no raw colour values, no inline `date-fns` `format()` (use `src/utils/date.util.ts`), `<Link>` rather than `onClick` navigation, `toSelectItems` on every `<Select>`, `lucide-react` icons only, and a justifying comment on every `'use client'`
- [x] T079 [P] Remove the v2 leftovers the rework orphans — `RiskReasonSchema`, `application_type`, and the corporate/employee-discount types — from `src/app/api/_schemas/membership-application.schema.ts`, `src/types/api/membership-application.type.ts`, and `src/app/api/_mock-db/types/membership-applications.type.ts`, then regenerate the client
- [x] T080 Verify the FR-025a provisional comment is present at **both** exemption sites — `src/app/api/_mock-db/tables/membership-application.table.ts` (T015) and `src/app/(private)/membership-applications/[id]/_components/fee-payment-card.tsx` (T041) — and that neither reads as a settled requirement
- [x] T081 Run `npx tsc --noEmit` (0 errors outside `.next/`) and `npm run lint`
- [ ] T082 Restart the dev server fully (the mock DB is a `globalThis` singleton — HMR will not reload a changed seed) and walk all 48 steps of [quickstart.md](quickstart.md)
- [ ] T083 Walk [checklists/parity.md](checklists/parity.md) end to end and tick each of the 158 `PAR###` items against the built screens; `/speckit.implement` will not report done while any remain unchecked
- [x] T084 Update `specs/membership-applications/` with a pointer noting it is superseded by this feature (C-01 260410_v2 → 260624_v5), so the stale spec is not mistaken for current

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies — T001, T002, T003 run in parallel
- **Foundational (Phase 2)**: T004→T008 are sequential (same schema file); T009→T010→T011/T012→T013→T014→T015 follow the table extraction order; T016/T017 need the table; **T018 blocks every user story**
- **User stories (Phases 3–10)**: all depend on T018; then:
  - US1 and US2 both touch the list components — run US1 first, then US2 (T029 depends on T028's scope handling)
  - US3 is independent of US1/US2 once the foundation lands
  - US4 and US5 depend on US3's `status-action-card.tsx` and `membership-application-detail.tsx` (T042, T044, T047)
  - US6 is fully independent of US3/US4/US5 — a second developer can take it in parallel
  - US7 and US8 are independent of everything except the foundation
- **Polish (Phase 11)**: after every story in scope

### Within a story

Server contract → shared components → screen composition → mutation wiring. Files touched by more than one task in the same phase are deliberately left un-`[P]`.

### Parallel opportunities

- **Phase 1**: T001, T002, T003 together
- **Phase 2**: T011 and T012 after T010; nothing else parallelises safely
- **Phase 5 (US3)**: T038, T039, T045 are separate card files and run together
- **Phase 8 (US6)**: T065 and T072 are independent of the rest of the form work
- **Across stories**: US6 (Phase 8) can proceed alongside US3/US4/US5 with a second developer — they share no files
- **Phase 11**: T077, T078, T079 together

---

## Parallel Example: User Story 3

```bash
# After T037, these three detail cards are independent files:
Task: "T038 Rework blacklist-result-card.tsx"
Task: "T039 Rework contract-info-card.tsx"
Task: "T045 Rework application-meta-card.tsx"
```

---

## Implementation Strategy

### MVP first

1. Phase 1 (Setup) → Phase 2 (Foundational) — the foundation is the bulk of the risk here, because it changes the shape of every record
2. Phase 3 (US1) → **STOP and validate**: the queue reads correctly for Staff and Headquarter
3. Phase 4 (US2) → the list screen is shippable
4. Phase 5 (US3) → approval works end to end — **this is the MVP**

### Incremental delivery

US4 (reject) → US5 (cancel) → US6 (admin form) → US7 (memos) → US8 (companion banner). Each adds value without disturbing the previous ones. US6 is the natural candidate for a second developer working in parallel from the checkpoint after T018.

### Risk notes

- **The foundation is where this feature can go wrong.** T009–T015 change the shape of every application record and the security posture of every route. Complete and compile-check that phase before touching UI.
- **Restart the dev server after any seed edit** — the mock DB is a `globalThis` singleton and HMR does not reset it. A "seed change had no effect" symptom is almost always this.
- **⚠️ The exemption (T015, T041, T046, T080) is provisional.** Build it to parity and comment it as unconfirmed. If C-01 documents the exemption model before implementation reaches T041, re-open FR-025 / FR-026 rather than shipping the prototype's precedence as settled.

---

## Task Summary

| Phase | Story                           | Tasks     | Count  |
| ----- | ------------------------------- | --------- | ------ |
| 1     | Setup                           | T001–T003 | 3      |
| 2     | Foundational                    | T004–T018 | 15     |
| 3     | US1 — review queue (P1)         | T019–T028 | 10     |
| 4     | US2 — filter the queue (P1)     | T029–T034 | 6      |
| 5     | US3 — review and approve (P1)   | T035–T047 | 13     |
| 6     | US4 — reject (P2)               | T048–T051 | 4      |
| 7     | US5 — cancel (P2)               | T052–T056 | 5      |
| 8     | US6 — admin enrolment form (P2) | T057–T072 | 16     |
| 9     | US7 — memos and history (P3)    | T073–T074 | 2      |
| 10    | US8 — companion upgrade (P3)    | T075–T076 | 2      |
| 11    | Polish                          | T077–T084 | 8      |
|       | **Total**                       |           | **84** |

### Parity coverage

All **158** `PAR###` items are claimed:

| Story | Parity items                                                              | Count |
| ----- | ------------------------------------------------------------------------- | ----- |
| US1   | PAR001, PAR003–PAR005, PAR015–PAR031, PAR033–PAR036                       | 25    |
| US2   | PAR006–PAR014, PAR032                                                     | 10    |
| US3   | PAR037–PAR039, PAR048–PAR075, PAR081–PAR083, PAR086–PAR093, PAR095–PAR104 | 52    |
| US4   | PAR085, PAR094, PAR105–PAR110                                             | 8     |
| US5   | PAR040, PAR084, PAR111–PAR119                                             | 11    |
| US6   | PAR002, PAR120–PAR158                                                     | 40    |
| US7   | PAR076–PAR080                                                             | 5     |
| US8   | PAR041–PAR047                                                             | 7     |

No parity item is unclaimed. ⚠️ PAR064–PAR073 and PAR100 are the **provisional** exemption items (T041, T046) and carry the FR-025a comment obligation verified by T080.
</content>
