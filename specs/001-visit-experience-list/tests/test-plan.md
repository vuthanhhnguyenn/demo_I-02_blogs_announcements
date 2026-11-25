# Test Plan — FR-S001 見学・体験の管理 (Visit/Experience Management)

**PO Spec**: `C-01.md` § `FR-S001` — 見学・体験の管理 (Phase 1)
**Spec links**:

- `specs/001-visit-experience-list/spec.md` (list page)
- `specs/003-visit-experience-detail/spec.md` (detail page)
  **Created**: 2026-08-11
  **Consumed by**: `gen-testcases` (per unit below) → `execute-testcases` (per generated TC doc)

> **Plan scope note**: FR-S001 spans two screens/routes — the queue list
> (`visit-experience-list.tsx`) and the reservation detail
> (`visit-experience-detail.tsx`) — backed by two separate feature specs
> (`001-visit-experience-list`, `003-visit-experience-detail`). They are not a
> step-flow or modal-in-parent relationship (detail is a full route with its
> own 4 user stories and 7 status variants), so the one-screen-per-unit rule
> keeps them as **two units**. This plan lives under `001-visit-experience-list/tests/`
> (the list is the entry screen); `003-visit-experience-detail` does not get
> its own plan file. Generated TC docs live under
> `specs/001-visit-experience-list/tests/cases/`.
>
> The feature is already implemented against the real mock-db (not just a
> prototype mockup): `src/app/(private)/visit-experiences/page.tsx` +
> `[id]/page.tsx`, backed by `src/app/api/crm/visit-experiences/route.ts`,
> `[id]/route.ts`, `summary/route.ts`, and `[id]/permit/route.ts`, seeded via
> `visit-experience.seed.ts`. Execution should run against this live app, not
> the UI-mockup prototype — see §6.

---

## 1. Scope

**In scope (2 units, one per screen):**

- S001-01 — Visit/Experience List (`visit-experience-list.tsx`): KPI cards, search, filter panel (status/brand/store/date-range/BL照合), active-filter banner, 9-column queue table, row-click navigation, pagination.
- S001-02 — Visit/Experience Detail (`visit-experience-detail.tsx`): 個人情報 card, ブラックリスト照合結果 card, タイムライン, ステータス+操作 merged card (5 state variants: default / info-missing / bl-match / visiting / completed, plus the 入会申請済 / キャンセル terminal states), 来店詳細情報, B-01 入退館連携情報, 見学許可確認ダイアログ, role-gated action buttons.

**Out of scope (navigation targets / separate specs / explicitly deferred — not tested here):**

- **BL entry detail page** (`該当BLエントリの詳細を確認` link on the bl-match card) — belongs to `specs/blacklist-management`; verify only that the link navigates, not the target page's content.
- **Enrollment application form** (`入会申請へ誘導` button, completed state) and **enrollment application detail** (`入会申請の詳細を確認` link, 入会申請済 terminal state) — belong to `specs/membership-applications` / the C-01-01 承認詳細 spec; verify only that navigation fires with the documented pre-fill fields (name/furigana/phone/email — per spec assumption), not the destination form's own validation.
- **B-01 在館者リスト** (occupant list monitoring in-progress visits) — a separate page per both specs' assumptions; this plan does not cover it, only the detail page's static B-01 connection-info display.
- **B-01 entry/exit gate hardware integration** and actual face-recognition entry enforcement — out of scope; test only that the permit action calls the mocked `[id]/permit` endpoint and the resulting UI/timeline update.
- **Face photo image display / eKYC** — Phase 1 renders registration status only (登録済み/未登録); actual photo upload/download is Phase 2 per spec assumptions — do not treat the absence of a real photo as a bug.
- **残り時間 (remaining-time) countdown** — explicitly removed in v3 of the design; the mockup's mock data even carries an unused `remainingTime` field. Write an explicit negative case (§4, S001-02) confirming no countdown ever renders, rather than skipping it as "obviously absent."
- **Phase 2 items**: 無人見学 (QR-code kiosk) reservation intake, automatic follow-up email — not part of Phase 1 CRM screens.

---

## 2. Unit table

| #   | Unit    | Screen(s)                                                                                                         | Route (mockup file)           | TC doc filename                                              |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| 1   | S001-01 | Visit/Experience List (KPI, search, filters, BL-match row styling, pagination, row-click navigation)              | `visit-experience-list.tsx`   | `TC -【Fitness CRM】- [S001-01][Visit Experience List].md`   |
| 2   | S001-02 | Visit/Experience Detail (info panels, BL result, timeline, status+action card across all 7 states, permit dialog) | `visit-experience-detail.tsx` | `TC -【Fitness CRM】- [S001-02][Visit Experience Detail].md` |

**Unit-split rationale**: 1 spec = 1 screen, and each spec's own scope already treats these as independently testable (both specs' "Independent Test" notes describe standalone verification without the other screen). The permit-confirmation `AlertDialog` exists only inside the detail screen, so it clusters into S001-02 rather than becoming a third unit.

---

## 3. Sources per unit

| Unit    | Spec sections                                         | UI mockup file                                                | FRs covered   |
| ------- | ----------------------------------------------------- | ------------------------------------------------------------- | ------------- |
| S001-01 | `001-visit-experience-list/spec.md` — full document   | `.cache/fitness-crm-ui/src/pages/visit-experience-list.tsx`   | FR-001…FR-018 |
| S001-02 | `003-visit-experience-detail/spec.md` — full document | `.cache/fitness-crm-ui/src/pages/visit-experience-detail.tsx` | FR-001…FR-018 |

Also read where referenced: `.cache/fitness-spec/crm/requirements/C-01.md` § FR-S001 (見学・体験の管理) and § 権限マトリクス.

---

## 4. Coverage focus per unit

Added to — not a replacement for — `gen-testcases`' full coverage-dimension walk.

**S001-01 — Visit/Experience List**

- **Page-level role gate**: System/Headquarter/Manager/Staff/Observer can open the page; Trainer cannot (FR-001). Observer is view-only here (no write actions exist on this screen anyway, so this collapses to "page renders" for Observer).
- **Store-scope behavior**: the mockup reads `currentStoreId`/`accessibleStores` from the current-user context — when scoped to a single store, the 店舗 column and 店舗 filter are **hidden entirely** (not just disabled), rows are pre-filtered to that store, and the empty-state `colSpan` shifts from 9→8 accordingly. Test both an all-store role (System/Headquarter) and a single-store-scoped role (Staff) — verify KPI counts and table rows are both computed from the store-scoped subset, not the org-wide dataset (this exact class of bug — KPI cards ignoring store scope — was previously found and fixed on the sibling C-01 enrollment screen; verify it wasn't reintroduced here).
- **7 status values — confirm against the live app, not spec.md text**: `spec.md`'s status table and FR-008 use the **pre-v5** labels (確認待ち / BL照合中). The UI mockup and C-01.md v5 (変更履歴 260624_v5) already use the **updated** labels 申請者への確認待ち / BL照合結果あり・確認待ち. Write test cases against whichever labels the running app actually renders, and flag the spec.md/mockup label mismatch as a doc-drift note in the TC doc rather than silently picking one.
- **5th filter not in spec's FR-004**: the mockup has a **BL照合 filter** (全件 / 要注意者のみ) in addition to the 4 filters spec.md's FR-004/Key-Entities section documents (status/brand/store/date-range). Include it as a 5th independently-combinable filter dimension and note the spec gap.
- **Quick-search**: substring match (not prefix-only) on 予約番号 and 氏名 independently — confirm partial mid-string matches work on both fields, not just full-token matches.
- **Date-range filter**: operates on `reservedAt`; boundary-test 本日 (diffDays==0) / 直近3日 (≤2 days) / 直近7日 (≤6 days) — off-by-one at the 2/3-day and 6/7-day boundaries per the mockup's day-diff arithmetic.
- **BL-match visual treatment independent of status**: row background + `BL一致` badge apply purely off `blMatch`, regardless of which of the 7 statuses the row has — verify with a non-BL status row and confirm no false-positive badge, and a BL-match row on an otherwise "normal" status (e.g. 申込受付 + blMatch=true).
- **見学終了 column fallback logic**: `visitEndActual` shown with `（実績）` when present, else `visitEndScheduled` with `（予定）` — test both branches explicitly, plus the `visitStartAt: null` → `—` placeholder case.
- **KPI tone rules**: 当日キャンセル card is destructive-toned only when count > 0 (default tone at 0); 見学中 card is always warning-toned regardless of count (verify it does NOT flip to default at 0, unlike the cancellation card — an easy asymmetry to miss).
- **Pagination**: default page size observed in the mockup is **50**, not 25 (differs from the pattern noted for the Brand list) — verify the actual default rendered by the live app rather than assuming; page-size options 25/50/100/200; record-range text format `全 N 件 / P ページ / X–Y を表示`; page-number ellipsis collapsing at >7 pages.
- **No column sort**: unlike other list screens in this codebase, this table has no sortable column headers — write an explicit negative check (clicking a header does nothing) so a future PR silently adding sort doesn't slip through untested, and so testers don't waste time hunting for a sort feature.
- **Row click-through**: every row (regardless of status/BL-match) navigates to the detail view; empty-state clear-all button and the filter-banner clear-all button both fully reset search + all 5 filters + page 1.

**S001-02 — Visit/Experience Detail**

- **Page-level role gate**: same FR-001 rule as the list — Trainer blocked at page level; System/Headquarter/Manager/Staff/Observer can open.
- **7 states, not 5**: the design table in `003-visit-experience-detail/spec.md` (line ~39-46) lists only 5 variants (default/info-missing/bl-match/visiting/completed); the mockup additionally implements **enrolled** (入会申請済) and **cancelled** (キャンセル) as first-class variants with their own status-card config, icon, and 操作-panel content. Both are covered by spec prose (Edge Cases + FR-018) even though missing from the variant table — write cases for all 7, not just the 5 in the table.
- **Spec-vs-mockup contradiction — enrolled state action button**: FR-018 states 入会申請済 and キャンセル states show "no actionable buttons" in the 操作 panel. The mockup's `cancelled` variant matches this (no button), but the `enrolled` variant renders an active `入会申請の詳細を確認 →` link button. Flag this contradiction explicitly in the TC doc; test against the live app's actual rendered behavior for the enrolled state rather than the FR text.
- **Spec-vs-mockup contradiction — B-01 card scope**: FR-014 says the B-01 入退館連携情報 card shows "when the reservation is in the visiting or completed state." The mockup's `showB01Card` also includes the **enrolled** state. Test whether the live app follows the FR (2 states) or the mockup (3 states) and note which one it implements.
- **情報不足 (info-missing) blocking list**: warning `Alert` at top of 個人情報 card, each missing field ("未登録") individually — test each of phone/address/face-photo missing independently and in combination, plus the specific missing-items list rendered inside the disabled-button block in the ステータス card (list must match exactly which fields are actually missing, not a static list).
- **Face-photo warning styling** is gated on `info-missing` state AND `!facePhotoRegistered` together in the mockup — test a case where face photo is unregistered but the state is _not_ info-missing (should this still warn? — spec's Edge Cases §"BL match with normal-looking status" establishes independence for BL, but the mockup ties the face-photo warning to the variant, not to the raw registration flag; write this as an open-question / doc-drift case rather than assuming).
- **BL-match card independent of status**: destructive-toned card, match reason text, and the BL-detail link render purely off `blMatch`/`blMatchReason`, independent of whether personal info is otherwise complete (Edge Case in spec) — combine bl-match + info-missing in one record if the live data allows, to confirm both blocking signals surface simultaneously without one suppressing the other.
- **Permit confirmation dialog → timeline append**: clicking either permit button (default "見学を許可する（30分）" or bl-match "リスクを確認して見学を許可する（30分）") opens the same `AlertDialog` with applicant name + 30-minute scope + B-01 note; confirming appends a new timeline entry at the **top** (reverse-chronological) with the current operator and calls the mocked `[id]/permit` endpoint — verify the dialog's Cancel path makes no change and no API call.
- **Role gating on both action buttons**: `RoleGatedButton` allows Headquarter/System/Manager/Staff and denies **both** Trainer and Observer (note: Observer is denied here, unlike the list page's Observer-can-view rule — Observer has read-only access per the C-01 権限マトリクス, consistent with "承認・否認" style actions being blocked) for both 見学を許可する and 入会申請へ誘導 — test the disabled-tooltip text for a denied role on each button, in each state where that button appears.
- **Timeline ordering + dot color**: reverse-chronological across all 7 states' seed timelines; システム entries render a neutral/muted dot, non-システム (named operator) entries render a primary-toned dot — check at least one multi-entry timeline of each dot type, and confirm the newly-appended permit-issuance entry gets the primary dot (operator-initiated).
- **来店詳細情報 conditional fields**: 見学許可発行日時 only when `approvedAt` set; 見学終了日時 only when `visitEndAt` set; the mockup also conditionally shows 入会申請日時 (`enrolledAt`) and キャンセル日時 (`cancelledAt`) — neither of which appears in spec.md's FR-006 field list (来店予定日時 + the two conditional fields only) — verify the live app's actual field set for the enrolled/cancelled states and flag if it diverges from FR-006's documented list.
- **No remaining-time countdown, ever**: explicit negative case on the `visiting` state — confirm no countdown/timer UI renders even though the underlying mock data model carries a `remainingTime` value (removed in v3; see Out-of-Scope §1).
- **Back-link**: navigates to the list without discarding the list's current filter/search/page state (per FR-016 + list US1 scenario 5) — this needs the list's state to be set up _before_ navigating into detail, so sequence it after S001-01 cases exist.

---

## 5. Traceability map

Each spec's FR range maps entirely to its own unit — no split across units.

| FR range                                      | Unit    |
| --------------------------------------------- | ------- |
| FR-001…FR-018 (`001-visit-experience-list`)   | S001-01 |
| FR-001…FR-018 (`003-visit-experience-detail`) | S001-02 |

**Confirmed**: every FR in both source specs lands in exactly one unit. No orphaned requirements. (Note: both specs independently number their FRs 001–018 — these are two disjoint requirement sets sharing numbering by coincidence of template, not a cross-reference; do not conflate FR-005 of the list with FR-005 of the detail spec when writing TC IDs.)

---

## 6. Execution notes (for `execute-testcases`)

- **Roles**: exercise all 6 roles from the C-01 権限マトリクス — System, Headquarter, Manager, Staff, Observer (all page-accessible, per-role store/brand scope on S001-01), and Trainer (page-level access denied on both units, per FR-001 of each spec). On S001-02, additionally re-test Observer against both action buttons expecting denial (Observer is view-only for approvals per the matrix, unlike the plain page-view grant it gets on the list).
- **This feature is live, not just mocked-prototype**: both screens are already implemented against a real mock-db (`visit-experience.seed.ts`) with working API routes (list/detail/summary/permit). Default to running cases against the actual app; log `Block` (not `NG`) only for the genuinely out-of-scope items in §1 (BL/enrollment/B-01-occupant-list destination screens, face-photo image rendering, remaining-time countdown, Phase 2 kiosk flow) or if a route/endpoint turns out not to be wired up during execution.
- **Doc-drift caveats — do not auto-fail against spec.md text**: the 3 spec-vs-mockup mismatches called out in §4 (status label wording, enrolled-state action button, B-01 card scope for enrolled) should be tested against the **live running app's actual behavior**, recorded as-observed, and annotated with the mismatch rather than marked NG for "not matching spec.md."
- **Seed-reset points**: the permit action mutates the timeline (and presumably the record's status/approvedAt) — if the same seeded reservation is reused across multiple permit-flow test cases, reset or use a fresh reservation ID per case so the "default state → permit → visiting" transition is observed from a known-clean starting state each time.
- **Cross-unit dependency**: run S001-01 (list) before S001-02 (detail) — detail cases need real reservation IDs/rows from the list (or its seed data) to open, and the back-link scenario (§4, S001-02) needs a filtered list state to verify preservation against.
- **Viewport**: tablet-and-up only, per the shared template.

---

## 7. Suggested order

1. **S001-01 — Visit/Experience List** first: P1 entry point per its own spec; no dependency on the detail screen, and it's the source of the reservation rows/IDs the detail unit opens.
2. **S001-02 — Visit/Experience Detail** second: depends on reservation records existing (from S001-01/seed data) and on a known list-state to verify the back-link's state-preservation scenario; it's also the deeper unit (7 states, role-gated actions, permit dialog, timeline) so running it last means the queue data it inspects is already confirmed good.

---

## 8. Definition of done

- [ ] TC doc created for S001-01 and S001-02 under `specs/001-visit-experience-list/tests/cases/`.
- [ ] Every FR-id in §5 traced to its unit's TC doc (36 FRs total across both specs, none orphaned).
- [ ] Any gap found in `tests/checklists/common-function-checklist.md` or `common-gui-validate-checklist.md` while authoring cases is fixed in the shared checklist first.
- [ ] The 3 doc-drift items in §4/§6 (status labels, enrolled-state button, B-01 card scope) are captured as explicit notes in the relevant TC doc(s), not silently resolved one way.
- [ ] Each of the two TC docs executed once via `execute-testcases` (single-pass model — no Round 2).
