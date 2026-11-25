# Real API Integration Plan: D-02 Lesson Content Detail (レッスン内容 詳細)

**Branch**: `feat/lesson-master-integration-api` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/lessons/[id]/` — `page.tsx`, `_components/*`, `_constants/*`, `_utils/*`, plus `_schemas/lesson-delete-dialog.schema.ts`
**Target API**: `src/lib/api-real` (regenerated from the dev BFF `/docs-json`, 2026-10-08, API-111 v0.6 + API-112 v0.9 schedule reads)
**Sibling plans**: [007 list](../007-lesson-content-list/integration-plan.md) · [009 form](../009-lesson-content-form/integration-plan.md) — blocker ids are unique across the three plans (B1–B4).
**Board**: also covers the D-01 row "List recurrences" (API-112 #10) — its only CRM surface is this screen's schedule sheet.

## Guiding principle

**UI first.** Where the real API cannot back a UI element, the element stays and the gap is a
`TODO(round2) Bn` comment at the one place the value is dropped. Mock routes under
`src/app/api/crm/lesson-contents/**` and the `_mock-db` lesson tables are **left untouched**.

## Endpoint mapping

| UI surface                                                                | Real endpoint                                                                                                | Hook                                                        | Round |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----- |
| Header, basic info, images, restrictions & fee, description, memo, status | `GET /api/v1/admin/lessons/{lessonId}`                                                                       | `adminLessonControllerDetailOptions`                        | 1     |
| 変更履歴 tab (paged, 20 per page)                                         | `GET /api/v1/admin/lessons/{lessonId}/history`                                                               | `adminLessonControllerHistoryOptions`                       | 1     |
| 無効化する / 有効化する                                                   | `PATCH /api/v1/admin/lessons/{lessonId}` `{ isActive, expectedUpdatedAt }`                                   | `adminLessonControllerUpdateMutation`                       | 1     |
| 削除                                                                      | `DELETE /api/v1/admin/lessons/{lessonId}` `{ deleteReason }` — 204 deleted, 200 `deactivated` when in use    | `adminLessonControllerRemoveMutation`                       | 1     |
| Delete guard (使用中のスケジュール N件)                                   | detail `scheduleCounts.upcomingScheduleCount`                                                                | (detail)                                                    | 1     |
| 直近のスケジュール card (top 3 + total)                                   | `GET /api/v1/admin/lesson-schedules?lessonId=&storeId=&from=today&to=+3 months&limit=3` (D10)                | `adminLessonScheduleControllerListSchedulesOptions`         | 1     |
| スケジュール sheet — sessions                                             | same, `limit=50`, next page on scroll (D12)                                                                  | `adminLessonScheduleControllerListSchedulesInfiniteOptions` | 1     |
| スケジュール sheet — recurring patterns (board #10)                       | `GET /api/v1/admin/lesson-schedule-recurrences?lessonId=&storeId=&isActive=true&limit=200`, every page (D12) | `fetchAllPages` + `AdminLessonScheduleManagementApi112`     | 1     |
| スケジュール sheet — studio names for recurrences                         | `GET /api/v1/admin/studios/{id}` (one per distinct studio)                                                   | `adminStudioControllerDetailOptions`                        | 1     |
| 無効化 reason                                                             | — (PATCH takes no reason)                                                                                    | —                                                           | 2     |
| 変更履歴 per-field before / after                                         | — (history rows are snapshots)                                                                               | —                                                           | 2     |

## Blockers carried into Round 2

| ID     | Blocker                                                                                  | Round 1 behaviour (UI kept)                                                                                                              | Round 2 (after API fix)                                     |
| ------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **B3** | No reason field on 無効化 / 有効化 (FR-003-P1-14 requires one).                          | The reason input stays required and validated, but is not sent — so it never reaches 変更履歴. `lesson-deactivate-dialog.tsx`.           | Send the reason; show it in 変更履歴.                       |
| **B4** | History rows carry the event and actor, not per-field changes.                           | 変更内容 compares each edit with the next-older snapshot on the same page; the last row of a page shows 「—」. `lesson-history.util.ts`. | Read the API's change detail; drop the snapshot comparison. |
| **B1** | (owned by [009](../009-lesson-content-form/integration-plan.md)) No tax rate on the API. | 都度利用料金（税込） = `feeToTaxIncluded(fee)` at 10% in `lesson-restriction-card.tsx`.                                                  | See 009 R201.                                               |

## Decisions

- **D1 — No mapper layer.** Components take `LessonDetailDto` directly; labels come from the shared
  `_utils/lesson-api.util.ts`.
- **D2 — Not found.** 404 `E-LSM-001` (unknown, deleted, or outside the caller's brand scope) and
  400 (not a UUID) render the not-found state (FR-003-P1-23).
- **D3 — Status lifecycle (spec Clarifications 2026-10-08).** 無効化 / 有効化 = `PATCH isActive`
  (the lesson stays listed); 削除 = `DELETE` (no longer listed, detail → not found). The dialog
  still blocks deletion while `upcomingScheduleCount > 0` (FR-003-P1-15); the API's 200
  `deactivated` reply (a schedule created in between) shows 「スケジュールで使用中のため、レッスンを無効化しました」
  and stays on the page. On 204 the list is refreshed and this lesson's detail / history are only
  marked stale, so the screen does not flash not-found before the redirect.
- **D4 — Description.** The form's editor stores HTML, so the card renders it with Quill in
  read-only mode (Quill parses the markup into its own model — no `dangerouslySetInnerHTML`).
  Found by the Round 1 smoke: the mock stored plain text, the real API returns the editor's HTML.
- **D5 — Gender restriction is not shown** (spec Clarifications 2026-06-26), although the API
  returns it.
- **D6 — Schedules.** The card shows the next 3 sessions from today (JST) to +3 months with the
  window's `totalItems`; the sheet lists up to 100 sessions plus the active recurrences
  (毎週 / 隔週 / 毎月, Monday first, start–end from `durationMinutes`). Rows link to the real
  schedule id's reservation page.
- **D7 — Instructor links** go to `/instructors/{trainerId}` with the real id (FR-003-P1-09a).
  D-04 is still on the mock, so the target page cannot resolve it yet — a cross-screen dependency,
  not an API gap, so no blocker id.
- **D8 — Errors.** The shared `MutationCache` toasts every failure; on `E-LSM-005` (stale) or
  `E-LSM-001` the dialogs refetch the detail and close. No local error toasts.
- **D9 — Restrictions.** Plan / option names from `planRestrictions[]` / `optionRestrictions[]`,
  inactive ones suffixed 「（無効）」; 「他N件」 when `restrictionSummary` counts more than the names returned.

- **D10 — Which store's schedules (2026-10-12).** API-112 §4.1 requires `storeId` on the store
  view for every role (BE !666, on dev since 2026-10-08; 400 `E-VAL-001` without it). The card and
  the sheet list one store: the lesson's own `storeId` for a store-specific lesson (it is only held
  there), otherwise the store picked in the header. A brand-wide lesson while the header is on
  全店舗 lists nothing and shows 「店舗を選択するとスケジュールを表示します」 — same rule as the D-01
  dashboard (FE !193). A failed read shows 「スケジュールを取得できませんでした」 instead of an empty
  list. `scheduleStoreId` in `_utils/lesson-detail.util.ts`.
- **D11 — Seats (2026-10-12).** `bookingCount` counts trial bookings too since API-112 v0.11 (BE !700).
  n/定員 uses `seatBookingCount`: `bookingCount − trialBookingCount` on an `additive` row (trials sit
  on top of `capacity`), `bookingCount` otherwise — the seat rule the API documents on the field.

- **D12 — The sheet lists everything (2026-10-13, k.iwaki on !200).** FR-003 「全件表示」: the
  sheet read one page of 100 sessions / 100 recurrences. Sessions are now an infinite list (50 a
  page, `SHEET_SCHEDULE_PAGE_SIZE`) that reads the next page as the sheet scrolls; the 繰り返し設定
  summary is read whole with `fetchAllPages` (200 a page, `RECURRENCE_PAGE_SIZE`, up to the last
  page — no fixed page cap; a lesson's rules in one store stay few). A failed read
  — first page, a later page or the recurrences — shows 「…の取得に失敗しました 再試行」, never
  「スケジュールはありません」.

## Round 1 tasks

### Phase A — foundations

- **T001** `_utils/lesson-detail.util.ts` _(new)_ — JST window, schedule-list query builder,
  time / recurrence formatting.
- **T002** `_utils/lesson-history.util.ts` _(new)_ — 操作 / 変更内容 per history row (**B3**, **B4**).
- **T003** `_constants/constants.ts` — history / recurrence / weekday labels.
- **T004** `_schemas/lesson-delete-dialog.schema.ts` — reason max 500.

### Phase B — detail screen

- **T005** `page.tsx` — real detail query, not-found (D2), delete flag (D3).
- **T006** `[P]` `lesson-detail-header-actions.tsx`, `lesson-info-tab.tsx`, `lesson-basic-info-card.tsx`
  (no gender row, D5), `lesson-internal-memo-card.tsx` (`note`), `lesson-description-card.tsx` (D4).
- **T007** `[P]` `lesson-restriction-card.tsx` (D9, **B1**), `lesson-image-gallery.tsx`
  (`displayOrder`, first = メイン).
- **T008** `lesson-status-card.tsx`, `lesson-deactivate-dialog.tsx` (**B3**, D8), `lesson-delete-dialog.tsx` (D3).
- **T009** `lesson-history-tab.tsx` — paged history (**B4**).
- **T010** `lesson-recent-schedule-card.tsx`, `lesson-schedule-sheet.tsx` (D6, D7).

### Phase D — verification

- **T011** type-check / lint / prettier. **T012** live smoke. **T013** record below.

## Round 2 backlog

- **R203** PATCH (or a deactivate endpoint) takes a reason (**B3**) → send it from
  `lesson-deactivate-dialog.tsx`; show it in 変更履歴.
- **R204** History returns per-field changes (**B4**) → replace the snapshot comparison in
  `lesson-history.util.ts`.

## Resolved questions

- **Inactive vs deleted (spec Clarifications 2026-10-08, shared with 007).** The list's
  「削除済みも含めて表示」 toggle is removed; deactivate and delete are separate outcomes
  (FR-003-P1-13 / -21 and Q4 revised).

## Round 1 result (2026-10-08)

**Status: shipped in FE MR !200; static gates green; live smoke run on dev.**

All tasks T001–T010 shipped as planned; the gender row added during implementation was removed
again to follow D5. Mock surfaces are untouched.

### Verification

- **T011** — `npm run type-check`: 0 errors outside the pre-existing `contracts/*` ones; lint and
  prettier clean.
- **T012** (dev, HQ account), on throwaway lessons created by the 009 smoke and deleted afterwards:
  - Detail: images (メイン), restrictions with 「（無効）」 on an inactive plan, 都度利用料金 ¥1,001
    for a ¥1,000 input (**B1** rounding), memo, status, 0 schedules.
  - **Bug found and fixed**: the description showed raw `<p>…</p>` → D4.
  - 変更履歴: 作成 / 編集 (レッスン名を変更) / 制限主契約を解除 / 画像を削除 / 画像を追加 / 画像の並び順を変更.
    The extra reorder call (one image left) led to a fix in `use-lesson-edit-save.ts` (see 009);
    that fix was not re-run live.
  - 無効化 (reason validated, not sent — **B3**) → badge 無効, list status filter shows it →
    有効化 → 有効.
  - 削除 with an empty reason → 「理由を入力してください」; with a reason → toast, list without it,
    detail URL → not-found state.
  - In-use lesson (QA-D01-20261008, 4 sessions): the delete dialog blocks with 「使用中のスケジュールを確認 (4件)」
    and a disabled confirm (not confirmed).
  - Schedule sheet: 4 sessions listed with seats. The recurring-pattern section was **not exercised
    with data** — the recurrences call (`lessonId`, `isActive=true`) returned 200, but no active
    recurrence exists on dev for the test lessons.
  - Not exercised: a **non-HQ role** (only an HQ account is available) — left for QA.

## Round 1 follow-up (2026-10-12)

The detail screen regressed against the current dev API, and the branch had fallen behind `dev`:

- **Merged `dev`**. The only conflicts were the generated client; `src/lib/openapi.real.json` was
  refreshed from the dev BFF `/docs-json` (paths / schemas kept in dev's order) and
  `npm run generate-api:real` re-run. API-111 since 2026-10-08 only adds the optional
  `isTrialCourse` (v0.7) — not shown here: D-02 FR-002 has no field for it yet.
- **Schedules 400** — the card and the sheet called the API-112 list without `storeId`, which the BE
  has rejected since 2026-10-08 → D10. Before, the 400 rendered as 「スケジュールはありません」.
- **Seats** → D11.
- The refreshed client makes `storeId` required on `GET /admin/lockers`, so the store map's
  invalidation (`stores/[id]/map/_components/store-map-setup.tsx`, from `dev`) now passes the
  screen's `storeId` — the key still matches every list / infinite variant for that store.

Round 2 backlog unchanged: B1 / B3 / B4 are still open on the BE (API-111 v0.7.1 has no tax rate,
no deactivation reason and no per-field history).

### Verification

- `npm run type-check` 0 errors; `npm run lint` clean; `npx prettier --check ./src` clean except
  `src/lib/utils.ts` (unchanged from `dev`); `npm run build` — see the MR note.
- Live smoke: see the MR note.
