# Real API Integration Plan: D-04 Instructor Management (指導者管理)

**Branch**: `feat/lesson-instructor-integration-api` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Source read**: FR D-04 `260901_v3` (fitness-crm-ui spec mirror, synced 2026-10-21T23:13Z, `77d99f8`) · prototype bundle `index-Dtu5GjQ6.js` (2026-10-22)
**Scope**: `src/app/(private)/instructors/**` (list, detail, history, create / edit form)
**Target API**: `src/lib/api-real` refreshed from dev `/docs-json` on 2026-10-22 — API-109 v0.10 (trainers, BE !797 / !798 / !800 / !801 / !803 / !805) and API-112 v0.15 (`GET /lesson-schedules?trainerId` without `storeId`); photos via API-006 `POST /api/v1/media/presign` (`tag=facility-image`)

## Guiding principle

**UI first.** The screens keep their layout, columns, cards, dialogs and form sections; the real API is
wired in underneath. Where the API's shape differs (snapshots instead of field rows, a ratio instead of a
percentage, separate schedule / recurrence reads) the conversion lives in `_utils/instructor-api.util.ts`.

Mock routes `src/app/api/crm/instructors/**`, their schemas, `src/lib/utils/instructor-permissions.ts`
(still used by those routes) and the `_mock-db` instructor tables are **left untouched** — the screens
simply stop calling them.

## Endpoint mapping

| UI surface                                             | Real endpoint                                                                                                                                      | Hook / helper                                         | Round |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----- |
| List rows (both tabs)                                  | `GET /api/v1/admin/trainers` — `coachTypes` (tab, D2), `q`, `isActive`, `brandGroup`, `storeId` (header store), `sort` / `order`, `page` / `limit` | `adminTrainerControllerListOptions`                   | 1     |
| Tab badges + header count                              | same endpoint, `limit=1`, no search / filter → `pagination.totalItems`                                                                             | `adminTrainerControllerListOptions`                   | 1     |
| Detail: basic info, profile, buffers, CRM link, status | `GET /api/v1/admin/trainers/{trainerId}`                                                                                                           | `adminTrainerControllerDetailOptions`                 | 1     |
| 実績サマリー + 担当レッスン                            | `GET /api/v1/admin/trainers/{trainerId}/summary`                                                                                                   | `adminTrainerControllerSummaryOptions`                | 1     |
| 直近のスケジュール + sheet 個別スケジュール一覧        | `GET /api/v1/admin/lesson-schedules?trainerId&from&to&isPublished=true&sort=scheduledDate&order=asc` (no `storeId`, API-112 v0.15)                 | `adminLessonScheduleControllerListSchedules…`         | 1     |
| Sheet 繰り返し設定                                     | `GET /api/v1/admin/lesson-schedule-recurrences?trainerId&isActive=true` + end time / studio from `/summary` `assignedLessons` by `recurrenceId`    | `adminLessonScheduleControllerListRecurrencesOptions` | 1     |
| 変更履歴 tab                                           | `GET /api/v1/admin/trainers/{trainerId}/history` (+ one-row read for the page's older neighbour) · staff names via `GET /api/v1/admin/staff/{id}`  | `adminTrainerControllerHistoryOptions`                | 1     |
| ステータス card: 無効化する / 有効化する               | `PATCH /api/v1/admin/trainers/{trainerId}` `{ isActive, expectedUpdatedAt }`                                                                       | `adminTrainerControllerUpdateMutation`                | 1     |
| 削除                                                   | `DELETE /api/v1/admin/trainers/{trainerId}` — 204 deleted · 200 in use → deactivated instead                                                       | `adminTrainerControllerRemoveMutation`                | 1     |
| 新規指導者登録                                         | `POST /api/v1/admin/trainers`                                                                                                                      | `adminTrainerControllerCreateMutation`                | 1     |
| 指導者編集 (HQ / Manager / Staff)                      | `PATCH /api/v1/admin/trainers/{trainerId}` (changed fields + `expectedUpdatedAt`)                                                                  | `adminTrainerControllerUpdateMutation`                | 1     |
| 指導者編集 (Trainer, own profile)                      | `PATCH /api/v1/admin/trainers/me` (changed self-editable fields + `expectedUpdatedAt`)                                                             | `adminTrainerControllerUpdateMeMutation`              | 1     |
| 画像 upload                                            | `POST /api/v1/media/presign` `tag=facility-image` → S3 PUT (key under `member-shared/facility-image/`)                                             | `useMediaUpload({ tag: 'facility-image' })`           | 1     |
| CRMアカウント紐づけ picker                             | `GET /api/v1/admin/trainers/linkable-staff?q`                                                                                                      | `adminTrainerControllerLinkableStaffOptions`          | 1     |

No Round 2 blocker: every field and action the screens show has an API source.

## Blockers carried into Round 2

None.

## Spec'd but not built

| Sn  | FR     | What the spec defines                                                | Missing in                                                                                            |
| --- | ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| S1  | FR-005 | 無効化 / 有効化 as a confirmed action (the prototype opens a dialog) | code (the status card toggles on click). Kept as is in Round 1 — the API call is the same either way. |

## Decisions

- **D1 — No mapper layer.** Components read `TrainerListItemDto` / `TrainerDetailDto` / `TrainerSummaryDto`
  directly. `_utils/instructor-api.util.ts` holds the coach-type labels, the tab → `coachTypes` sets, the
  list query builder, brand grouping, error codes, cache invalidation and the form ↔ body converters;
  `_utils/instructor-detail.util.ts` holds the schedule / recurrence / summary text and the history diff.
- **D2 — Tabs and the role filter (Clarifications 2026-10-22).** スタジオインストラクター = `coachTypes=instructor`,
  パーソナルトレーナー = `coachTypes=trainer,body_care_therapist` (the API matches ANY listed type, so a person
  with both kinds of role appears in both tabs). The 役割区分 filter offers only the active tab's roles and
  narrows `coachTypes` to the one chosen.
- **D3 — Brand = brand group (prototype).** The filter offers JOYFIT / FIT365 → `brandGroup`; the ブランド column
  folds `derivedBrands` (the trainer's schedule stores) into JOYFIT / FIT365 badges.
- **D4 — Search** sends `q` (kanji / romanized name, nickname, full name with or without a space). The
  placeholder drops 「ID」: the API does not search ids (Clarifications 2026-10-22).
- **D5 — Ids are UUIDs.** The ID column shows the UUID truncated with a tooltip (studios precedent); sorting
  by ID sends `sort=createdAt` (UUID v7 order), by 氏名 `sort=lastName`; the other columns stay unsortable.
  Server paging, 50 per page (`limit` max 100).
- **D6 — Header store.** A specific header store narrows the list with `storeId` (trainers with schedules
  there); 全店舗 sends none. Counts use the same scope.
- **D7 — Counts.** Each tab badge is the `totalItems` of that tab's unfiltered `limit=1` read; the header
  count reads every coach type at once (`coachTypes=instructor,trainer,body_care_therapist`): a person in both
  tabs counts once, and a legacy row without any coach type (in no tab) is not counted.
- **D8 — 直近のスケジュール (FR-003, Clarifications 2026-10-22).** One read: `from` = today (JST), `to` =
  today + 3 calendar months (the API's widest window), published and not cancelled, ascending. Today's
  sessions that already started are dropped client-side (they sort first, so the badge count is
  `totalItems` minus the dropped rows). The card shows the first **5**; the sheet lists everything in the
  3-month window, loading further pages (200 per page) on demand.
- **D9 — 繰り返し設定** lists the active rules from `GET /lesson-schedule-recurrences?trainerId` whose end date
  is not past: 毎週 / 隔週 / 毎月 + weekdays, start–end time, period, lesson and studio. The rule read has
  no end time or studio name; both come from `/summary` `assignedLessons` (same `recurrenceId`), falling
  back to the start time alone and 「—」.
- **D10 — 担当レッスン** comes from `/summary` `assignedLessons`: weekday chips from `daysOfWeek` (0 = Sunday)
  or, for a single session, the weekday of `nextDate`; time `startTime–endTime`; 予約率 = `bookingRate`
  × 100 (「—」 when null). Each row links to the D-02 lesson detail `/lessons/[id]` (FR-003: "D-02への導線"),
  replacing the mock link to a schedule's reservations.
- **D11 — 実績サマリー**: 週間レッスン数 `weeklyLessonCount`, 平均予約率 `bookingRate` × 100 (「—」 when null),
  評価平均 `ratingAvg` (評価なし when null), 今月参加者数 `monthlyParticipantCount`.
- **D12 — 変更履歴 (spec silent → prototype; Clarifications 2026-10-22).** Shown to System / Headquarter /
  Manager only (the API answers 403 E-TRN-101 to other roles). The API returns one snapshot per event; rows
  are rebuilt FE-side by diffing each snapshot with the next older one (the page's last row against a
  one-row read of the next page — studios precedent). A changed CRM link shows the staff names, read with
  `GET /admin/staff/{id}` (HQ / Manager can read it); a photo change shows 設定あり / なし.
- **D13 — Editability comes from the API.** The edit page locks inputs by the detail's `editableFields`
  (`["*"]` = all; Staff = all but `isActive`; the trainer on their own profile = nickname, romanized names,
  profile, career, photo, buffers; others = none → 編集権限がありません). A Trainer saves through
  `PATCH /trainers/me`; everyone else through `PATCH /trainers/{id}`. Only changed fields are sent, always
  with `expectedUpdatedAt` = the `updatedAt` the form was opened with. The form pins that version: the
  diff and the lock come from it, never from a later refetch (review on !212). E-TRN-012 (stale) opens a
  dialog 「他の担当者がこの指導者を更新しました — 最新のデータを取得してフォームを更新します。編集中の内容は破棄されます。」;
  on consent the latest detail resets the form values and the pinned version together, so stale values are
  never sent over another user's change (キャンセル keeps the form; a retry is refused again). The edit
  mutations suppress the shared toast and toast every other error themselves. A `coachTypes` change carries the held `primaryCoachType` while it is still
  in the set (the form has no primary input; a write without it would clear the primary).
- **D14 — Self.** "Own profile" = `detail.staffId === user.id` (the trainer row's linked staff account),
  replacing the mock's id comparison.
- **D15 — Delete (FR-005).** The dialog blocks 削除する while `usageSummary.inUse`, with
  `activeScheduleCount` in the message. DELETE answering 200 (it became in use meanwhile) means the trainer
  was deactivated instead: success toast says so and the user stays on the detail.
- **D16 — Form bounds follow the API.** 氏名 / ニックネーム ≤ 100; 英字表記 ≤ 100, letters / spaces / hyphens
  only; プロフィール文 / 指導歴 keep the FE's 1000 (stricter than the API's 4000). `middleNameRomanized` is not
  on the form and never sent.
- **D17 — Photo.** `useMediaUpload({ tag: 'facility-image', maxSizeMB: 2, acceptedTypes: [jpeg, png] })`
  (the form's stated limits); the form keeps the returned `facePhotoS3Key` plus a local preview URL; saved
  photos show the BFF-signed `facePhotoUrl`. 削除 sends `facePhotoS3Key: null`. The photo section tracks
  the whole upload (presign + S3 PUT — the hook's flag covers the presign only) and the form blocks
  確認 / 保存 with 「画像のアップロードが完了するまでお待ちください。」 until the key is in the form (review on
  !212, studios precedent).
- **D18 — CRM link picker** reads `linkable-staff` (active trainer-role staff not linked to any trainer),
  labels options 「氏名（職位）」, and is locked when `staffId` is not editable (Trainer self-edit). The
  current link is shown from the detail's `linkedStaff` (it is not in the linkable list).
- **D19 — Errors by `code`.** Local `onError` toasts are removed (the shared `MutationCache` toasts the
  `userMessage`). Codes the UI reacts to: E-TRN-001 (not found / out of scope → empty state), E-TRN-004
  (staff already linked), E-TRN-012 (stale → reload), E-TRN-013 (coach types), E-TRN-101 (role).

## Round 1 tasks

### Phase A — foundations

- **T001** `src/lib/openapi.real.json` + `src/lib/api-real/**` — refresh from dev `/docs-json`, regenerate (own commit).
- **T002** `_utils/instructor-api.util.ts` _(new)_ — D1–D7, D13, D16, D19.
- **T003** `_utils/instructor-detail.util.ts` _(new)_ — D8–D12.
- **T004** `_components/instructor-form.schema.ts` — bounds (D16), `facePhotoS3Key` + preview URL (D17).

### Phase B — list and detail

- **T005** `_hooks/use-instructor-list.ts` — `sort_by` / `sort_order` / `page`.
- **T006** `[P]` `_components/instructor-filters.tsx`, `instructor-search.tsx` — role options per tab (D2), brand groups (D3), placeholder (D4).
- **T007** `_components/instructor-list-section.tsx` — real list, counts, paging, sorting, header store (D2–D7).
- **T008** `[id]/page.tsx` — real detail, self (D14), history tab gating (D12).
- **T009** `[P]` `[id]/_components/instructor-basic-info-card.tsx`, `-crm-link-card`, `-profile-card`, `-buffer-settings-card` — DTO fields.
- **T010** `[P]` `[id]/_components/instructor-performance-summary-card.tsx`, `-assigned-lessons-card` — `/summary` (D10, D11).
- **T011** `[id]/_components/instructor-upcoming-schedule-card.tsx`, `-sheet` — D8, D9.
- **T012** `[id]/_components/instructor-status-card.tsx`, `-delete-dialog` — D15, D19.
- **T013** `[id]/_components/instructor-history-tab.tsx`, `[id]/_constants/labels.ts` — D12.

### Phase C — forms

- **T014** `_components/instructor-form/instructor-form.tsx` — create / PATCH / PATCH me, changed fields, lock (D13, D19).
- **T015** `[P]` `instructor-form-basic-info.tsx`, `instructor-form-photo.tsx`, `instructor-form-crm-link.tsx` — D16–D18.
- **T016** `create/page.tsx`, `[id]/edit/page.tsx` — real detail, `editableFields`, `updatedAt`.

### Phase D — verification

- **T017** `npm run type-check` (0 errors) · `npm run lint` · `npx prettier --check ./src` · `npm run build`.
- **T018** Live smoke on dev (port 3000, a signed-in HQ account): list → search → each filter → paging → tab
  switch → detail (summary, schedule card + sheet, history) → create with a photo and a CRM link → edit →
  stale save (two tabs) → 無効化 / 有効化 → delete an unused test trainer; one Trainer-role self-edit.
- **T019** Record the result below.

## Round 2 backlog

- None.

## Round 3 backlog (phase 2)

- None — every prototype element on these screens is either spec'd or follows the prototype where the
  spec is silent (変更履歴, D12).

## Open / Resolved questions

- **Resolved (Clarifications 2026-10-22)** — 直近のスケジュール shows the first 5 (FR-003 v3); the role filter
  offers the active tab's roles only (D2); the sheet covers the next 3 months (D8); 変更履歴 is wired in
  Round 1 for HQ / Manager (D12).
- **Open (outside this screen)** — the D-01 trainer pickers (`lesson-schedules/create`, the change-instructor
  dialog) still read `GET /admin/trainers`, which v0.10 scopes to the caller's stores; API-109 #10
  `GET /admin/trainers/lookup` is the unscoped picker read. Recommendation: switch them in a D-01 follow-up.

## Round 1 result (2026-10-22)

**Status: shipped in this branch; static gates pass; live smoke run on dev (System account) — the Trainer self-edit and a stale save were not exercised.**

| Task      | File(s)                                                                                                          | Notes                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| T001      | `src/lib/openapi.real.json`, `src/lib/api-real/**`                                                               | Own commit; 723 paths. No other screen needed a change.                |
| T002–T004 | `_utils/instructor-api.util.ts` _(new)_, `_utils/instructor-detail.util.ts` _(new)_, `instructor-form.schema.ts` | As planned, plus the held `primaryCoachType` on a `coachTypes` change. |
| T005–T013 | list hook / filters / search / list section, detail page and cards, history tab, `_constants/labels.ts`          | As planned.                                                            |
| T014–T016 | form, basic info, photo, CRM link, edit page                                                                     | As planned; `create/page.tsx` needed no change.                        |

### Verification

- `npm run type-check`: 0 errors · `npm run lint` (instructors): clean · `prettier --check` (changed paths): clean · `npm run build`: OK.
- Cross-screen links: D-01 (`lesson-schedule-form-reservation`) and D-02 (`lesson-schedule-sheet`) already pass real trainer ids to `/instructors/[id]`; they now open the real detail.
- **D7 adjusted by the smoke**: dev holds 2 legacy trainers without any coach type, so an unfiltered header count
  (3) exceeded what the tabs show (1 person, in both tabs). The header count now asks for every coach type
  (`coachTypes=instructor,trainer,body_care_therapist`) and counts exactly the people shown in either tab.

### Live smoke (dev, 2026-10-22, System account on `localhost:3000`; the test trainer was deleted afterwards)

- List: studio / PT tabs (`coachTypes=instructor` / `trainer,body_care_therapist`), counts by `limit=1` reads; PT role
  filter offers トレーナー / ボディケアセラピスト only → `coachTypes=body_care_therapist` (0 rows, empty state);
  brand FIT365 → 0, JOYFIT + 有効 + 「QA」 → 1; 無効 → 0; sort by 氏名 → `sort=lastName`.
- Detail (QA-D01 Trainer): basic info, CRM link 「Trainer 1 / Employee Trainer」, summary 3 / 3% / 評価なし / 1,
  4 assigned lessons linking to `/lessons/[id]` (D-02 detail opens), 3 upcoming sessions from
  `GET /lesson-schedules?trainerId&from=2026-10-22&to=2027-01-22&isPublished=true…` (no `storeId`); the sheet
  lists them with booked / capacity; the recurrence read answered 200 with no rule, so 繰り返し設定 stays hidden.
  History: the 新規作成 row. Delete dialog blocked (「4件のスケジュール」, 削除する disabled).
- Create 「ZZテスト D04削除予定」: romanized 「Test1」 refused client-side; photo through API-006 (presign 201 →
  S3 PUT 200 under `member-shared/facility-image/`), CRM link picked from `linkable-staff` (「Test Trainer3（Employee
  Trainer）」) → `POST` → detail with the signed photo URL rendered.
- Edit: nickname, drop インストラクター, 後バッファ 30分, remove the CRM link → saved; history shows exactly those four
  rows (the unlinked staff named through `GET /admin/staff/{id}`).
- 無効化する → 有効化する: both `PATCH`es succeeded, the second with the refreshed `updatedAt`; history rows
  ステータス 有効 → 無効 → 有効.
- Delete the test trainer: `DELETE` 204 → toast → list (counts back).
- No console errors.
- **Not exercised**: the Trainer self-edit through `PATCH /trainers/me` (needs a Trainer-role sign-in); the
  繰り返し設定 rows (no trainer on dev has an active rule); paging beyond one page (fewer than 50 trainers).

### Review fixes (2026-10-23, k.iwaki on !212) — re-run on dev

- Photo upload: sampling every 20 ms, 入力内容を確認する was disabled with the waiting notice from 43 ms to 818 ms
  (presign 201 + S3 PUT 200), then enabled with the photo in the form; create → detail rendered the signed photo.
- Stale save, the reviewer's scenario on a test trainer: tab A opens the edit form; tab B changes プロフィール文 and
  saves (200); tab A changes ニックネーム and saves → 409 E-TRN-012 → the dialog, no toast, form untouched;
  キャンセル + save again → 409 again (nothing overwritten); 最新のデータを読み込む → the form shows tab B's
  プロフィール文 and the original ニックネーム; changing ニックネーム again saves (200). History: one row for
  tab B's プロフィール文, one for tab A's ニックネーム — tab B's change survived. The test trainer was deleted (204).
