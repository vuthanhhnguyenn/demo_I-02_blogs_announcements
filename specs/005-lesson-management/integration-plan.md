# Real API Integration Plan: D-01 Lesson Schedule (レッスンスケジュール)

**Branch**: `feat/lesson-schedule-integration-api` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope (MR1)**: `src/app/(private)/lesson-schedules/` dashboard — `page.tsx`, `_components/*`, `_hooks/*`, `_utils/*`
**Target API**: `src/lib/api-real` (regenerated from the dev BFF `/docs-json`, 2026-10-07, API-112 v0.9)
**Board**: Notion `CRM API Status`, category D-01 — the 14 API-112 rows marked `🟢 READY INTEGRATE`

## Guiding principle

**UI first.** Where the real API cannot back a UI element, the element stays and the gap is a
`TODO(round2) Bn` comment at the one place the value is dropped. No UI is deleted to fit the API.

Mock routes under `src/app/api/crm/lesson-schedules/**`, `src/app/api/_schemas/lesson-schedule.schema.ts`
and the `_mock-db` lesson tables are **left untouched** — the integrated screens simply stop calling
them. The booking side of the screen (API-113: manual reservation modal) is wired in its own MR — see
"Manual reservation modal (FR-006, API-113)" at the end. The reservation detail page `[id]/reservations/**` — its API-113 booking panels
**and** its API-112 schedule writes (edit dialogs, 中止 wizard) — is FE !199; MR2 (!194) was closed
on 2026-10-11 so the two MRs do not wire the same page twice.

## MR split (D-01, API-112)

| MR      | Board rows                                                                                                    | Screens / files                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **MR1** | Dashboard (store & area) · Edit one schedule · Update-from-here (the dashboard modal's two scopes)            | `lesson-schedules/page.tsx`, `_components/*`, `_hooks/*`, `_utils/*`                 |
| ~~MR2~~ | Schedule detail · Cancel one · Cancel from here · Edit history · Recurrence detail · detail-page edit dialogs | → FE !199 (closed here; the detail page is wired there)                              |
| MR3     | Register a single schedule · Create a recurrence · Logical delete template                                    | `lesson-schedules/create/**`                                                         |
| MR4     | List recurrences (+ edit / delete recurrence if a UI is agreed)                                               | `lessons/[id]` / `instructors/[id]` 繰り返し設定 cards — needs D-02/D-04 on real ids |

## Endpoint mapping (MR1)

| UI surface                                                          | Real endpoint                                                                                                         | Hook                                                      | Round |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----- |
| Day / week / list calendar, 店舗別                                  | `GET /admin/lesson-schedules?view=store&storeId=` (every page of the window)                                          | `lessonScheduleAllPagesOptions` (`_utils`, wraps the SDK) | 1     |
| 自分のスケジュール                                                  | `GET /admin/lesson-schedules?view=trainer-self`                                                                       | same                                                      | 1     |
| All-store calendar (HQ, header on 全店舗)                           | `GET /admin/lesson-schedules?view=area&areaId=`                                                                       | same                                                      | 1     |
| KPI cards (本日のレッスン / 予約充足率 / 本日の変更 / 担当スタッフ) | `GET /admin/lesson-schedules/dashboard?storeId=&date=`                                                                | `adminLessonScheduleControllerStoreDashboardOptions`      | 1     |
| 要対応 badge / alert text on schedules                              | same — `alerts.items[]`                                                                                               | same                                                      | 1     |
| Area picker (new, required by the area endpoint)                    | `GET /admin/organization-nodes?nodeType=area&isActive=true`                                                           | `adminOrganizationControllerListOptions`                  | 1     |
| Area KPI (管理店舗数 / 要対応アラート数 / 異常店舗数) + 店舗一覧    | `GET /admin/lesson-schedules/area-dashboard?areaId=&date=`                                                            | `adminLessonScheduleControllerAreaDashboardOptions`       | 1     |
| Change modal — この回のみ                                           | `PATCH /admin/lesson-schedules/{id}`                                                                                  | `adminLessonScheduleControllerUpdateScheduleMutation`     | 1     |
| Change modal — 以降すべて                                           | `POST /admin/lesson-schedules/{id}/update-from-here`                                                                  | `adminLessonScheduleControllerUpdateFromHereMutation`     | 1     |
| Change modal — 変更の影響 (以降すべて)                              | `GET /admin/lesson-schedules/{id}/from-here-impact` — the from-here cohort, no date window (BE !724; k.iwaki on !193) | `adminLessonScheduleControllerFromHereImpactOptions`      | 2     |

## Endpoint mapping (MR3 — registration form)

| UI surface                                     | Real endpoint                                                                                      | Hook                                                          | Round |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----- |
| 店舗 select                                    | `GET /admin/stores?limit=100&sort=name` (HQ) · `restrictedStores` (other roles)                    | `adminStoreControllerListOptions`                             | 1     |
| スタジオ select + 定員の上限                   | `GET /admin/studios?storeId=&studioType=studio&isActive=true` (`capacity` + `bufferCapacity`)      | `adminStudioControllerListOptions`                            | 1     |
| レッスン select (kind + **store brand**)       | `GET /admin/stores/{id}` → `brandEnum`, then `GET /admin/lessons?lessonType=&brand=&isActive=true` | `useLessonOptions` (`create/_hooks`)                          | 1     |
| インストラクター select (+ trainer self-lock)  | `GET /admin/trainers?isActive=true` · `GET /admin/trainers/me`                                     | `adminTrainerControllerListOptions` / `…MeOptions`            | 1     |
| インストラクター重複 warning                   | `GET /admin/lesson-schedules?trainerId=&from=&to=` (every page), time overlap client-side          | `lessonScheduleAllPagesOptions`                               | 1     |
| 実施予定日 preview + 店舗休業日 warnings       | `GET /admin/holidays` + `GET /admin/stores/{id}/business-hours` + `…/business-exceptions`          | `useScheduleDatePlan` / `useHolidayChain` (`create/_hooks`)   | 1     |
| 登録 — 単発                                    | `POST /admin/lesson-schedules`                                                                     | `adminLessonScheduleControllerCreateScheduleMutation`         | 1     |
| 登録 — 繰り返し                                | `POST /admin/lesson-schedule-recurrences`                                                          | `adminLessonScheduleControllerCreateRecurrenceMutation`       | 1     |
| テンプレート — list / 保存 / 上書き保存 / 削除 | `GET` / `POST` / `PATCH` / `DELETE /admin/lesson-schedule-templates`                               | `adminLessonScheduleController…TemplateMutation` / `…Options` | 1     |

## Blockers carried into Round 2

| ID      | Blocker                                                                                                                                                                     | Round 1 behaviour (UI kept)                                                                                                                                                                                                                       | Round 2                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ~~B1~~  | 時間帯ヒートマップ — built in the エリア別 tab from `area-dashboard.heatmap[]` (D9).                                                                                        | —                                                                                                                                                                                                                                                 | —                                                              |
| **B2**  | No waitlist count on `LessonScheduleListItemDto` (the mock's 「キャンセル待ち N名」).                                                                                       | Line hidden; `TODO(round2) B2` in `timeline-item.tsx`.                                                                                                                                                                                            | Render once the API exposes a count.                           |
| **B3**  | 「予約者に変更通知を送信」 has no API field — API-112 always sends N-029 to the bookers.                                                                                    | Checkbox kept, value dropped at the submit seam; `TODO(round2) B3` in `schedule-change-modal.tsx`.                                                                                                                                                | Send it once an opt-out field exists, or remove per spec.      |
| **B7**  | `GET /admin/trainers` and `GET /admin/studios` accept `page` / `limit` (zod) but the Swagger omits them.                                                                    | `withPaging()` cast in `_utils/lesson-schedule-api.util.ts` sends `page` / `limit` (every page is read).                                                                                                                                          | BE documents the params → drop the cast.                       |
| **B4**  | No 「全エリア」 aggregate: `area-dashboard` takes exactly one area.                                                                                                         | The summary needs an area picked (defaults to the first active area).                                                                                                                                                                             | —                                                              |
| **B8**  | コース種別 (30分 / 60分 / 体験) has no API field — the session length comes from the lesson master's `durationMinutes`.                                                     | Radio kept, value not sent; `TODO(round2) B8` in `lesson-schedule-form.mapper.ts`.                                                                                                                                                                | Q&A: drop the radio or add a field.                            |
| **B9**  | A template stores store / lesson / studio / cadence / start time / holiday skip (v0.10, BE !654) but not the 終了条件 (FR-013 saves it).                                    | End condition neither saved nor restored; the save dialog says so; `TODO(round2) B9` in the mapper and the template popover.                                                                                                                      | Q&A FR-013.                                                    |
| **B10** | 予約設定 (最短受付期間 / 前後バッファ) belongs to the trainer (D-04 profile; `trainerRows` carry `minBookingHours` / `bufferBeforeMin` / `bufferAfterMin`).                 | Selects kept as prototype UI — not form fields, neither loaded nor saved; `TODO(round2) B10` in `lesson-schedule-form-reservation.tsx`.                                                                                                           | With the D-04 (instructor) integration.                        |
| **B11** | The list needs a `storeId` on `view=store` (API-112 §4.1, 400 E-VAL-001 otherwise — BE !666), so a trainer's schedules at OTHER stores cannot be read for the 重複 preview. | The probe sends `view=store&storeId=<selected store>&trainerId=…` — this store's clashes only; `TODO(round2) B11` in `lesson-schedule-form-instructors.tsx`. The save still checks every store (single: rejected, recurrence: `conflictedDates`). | A cross-store trainer read (or a conflict dry-run) on the API. |
| **B12** | 予約手動入力 コース 都度30分 / 都度60分 has no API field — `POST /lesson-bookings` takes `paymentType` only; the session length is the lesson's `durationMinutes`.          | Select kept; both send `per_use`; `TODO(round2) B12` in `manual-reservation-modal.tsx`.                                                                                                                                                           | Q&A: drop the split or add a field.                            |

### Spec'd but not built

| ID     | FR       | What the spec defines                         | Missing in |
| ------ | -------- | --------------------------------------------- | ---------- |
| ~~S1~~ | FR-001-a | エリア別 tab with a store × time-band heatmap | built (D9) |

## Decisions

- **D1 — No mapper layer.** Components take `LessonScheduleListItemDto`, `LessonScheduleDashboardDto`,
  `LessonAreaStoreRowDto` from `@/lib/api-real/types.gen` directly.
- **D2 — Store scope comes from the header store switcher** (`useCurrentStore`), as the prototype
  says (「ヘッダーで選択中の店舗に絞り込まれています」). The cross-store view is the エリア別 tab (D9);
  A Manager's header is always one of their stores, so they see that store's dashboard
  (TBD-Y15-MANAGER-SCOPE is open anyway).
- **D3 — The calendar loads the whole window** (day or week, every page at `limit=100`, up to the
  last page) and the studio / instructor filters run client-side, so the filter options don't
  collapse to the selection. URL keys `studio_id` / `instructor_id` / `area_id` hold real ids.
- **D4 — Cancelled sessions stay on the calendar** via `includeCancelled=true` (the pre-spec toggle;
  `isCancelled` cannot return both in one call). Status (実施中 / 終了 / 中止) is derived from
  `isCancelled` + the JST clock — the API has no status field.
- **D5 — Alerts are per store × day**: badges come from the store dashboard of the selected date. In
  week view only that day can carry a badge; in the all-store summary the per-store `alertCount` shows.
- **D6 — Errors by code** (`LESSON_SCHEDULE_ERROR_CODE` in `_utils/lesson-schedule-api.util.ts`);
  the shared `MutationCache` toasts. On `E-LSC-014` (stale) the modal also refetches.
- **D7 — Change modal**: one instructor select replaces the **primary** trainer and keeps any
  co-trainers; the end time is a disabled preview (the server derives it from the lesson length);
  `expectedUpdatedAt = updatedAt` is always sent; 以降すべて is disabled for one-off schedules
  (else 422 `E-LSC-017`).
- **D8 — Prototype labels**: one-to-one rows read 「パーソナル：<member>様」 with the 月次プラン / 都度N分
  tag; alerts read インストラクター未確定 / 直前キャンセル多発(N件) / スタジオ利用停止中.
- **D9 — Three view tabs per FR-001-a** (k.iwaki on !193). 店舗別 = ONE store's KPI + timeline;
  自分のスケジュール = `view=trainer-self`; エリア別 = area picker + 横断KPI + 店舗比較表 (server order,
  alerts first, until a header is clicked) + 時間帯ヒートマップ. エリア別 is enabled for system /
  headquarter / manager with the header on 全店舗 only — a single store disables it (tooltip), and
  `axis=area` then falls back to 店舗別. On 全店舗, 店舗別 picks its store in the toolbar from the
  area's stores (no 「すべて」; default = the first row, i.e. the store with most alerts); a row or a
  heatmap cell opens that store's 店舗別. The old all-store summary on 店舗別 (`focused_store_id`)
  and the `view=area` calendar are gone. Not done: a 管轄エリア header option for Manager (FR-001-a
  補足 — the shared header has 全店舗 + stores only).

- **D12 — Holiday chain mirrored client-side (MR3).** The API has no dry run, so the 実施予定日 preview
  and the 店舗休業日 warnings copy the backend: `useHolidayChain` = `holidayChain()` of API-112 §6.6.1
  v0.9.2 (BE !645 — a national holiday follows the store's `holiday` row, else its weekday row), and
  `useScheduleDatePlan` = `expandOccurrences()` (biweekly by epoch-week parity, monthly by weekday +
  its position in the month, unlimited up to today(JST) + 3 months). The success toast reports what
  the server actually did (`closureDates` / `skippedHolidayDates` / `warningsByDate`).
- **D13 — Lessons of the store's brand only.** The lesson picker filters by the selected store's
  `brandEnum` (400 E-VAL-001 otherwise) and drops a chosen lesson that no longer fits the kind or store.
- **D14 — Instructor candidates** = active trainers holding the coach type the lesson needs, plus
  those with none recorded (the API does not check the type; the dev seed trainers have none). The
  trainer master has no store link, so the list is not narrowed by store.
- **D15 — Templates** list the selected store's active templates; staff and trainers change / delete
  only their own (403 E-LSC-101). 読込 reads the lesson's kind (`GET /admin/lessons/{id}`) to set
  レッスン区分 before restoring the lesson + studio.
- **D16 — Every option is reachable, and a failed read says so** (k.iwaki's points on !193 / !200).
  - Lists that grow with the company are **searched on the server and read on scroll**, never read
    whole (a fixed page count still hides the rest — k.iwaki on !200, 2026-10-13): the HQ store
    picker is the shared `StoreSelectInput` (`keyword`); the lesson picker (`useLessonSearch`, `q`,
    plus the kind and the store's brand) and the instructor picker (`useTrainerSearch`, `q`; the
    coach-type filter stays client-side, the API has none) read `PICKER_PAGE_SIZE` (= the shared
    `PAGE_SIZE`) rows a page as the list scrolls, only while open. The chosen lesson's name, length
    and validity come from its detail (`useSelectedLesson`); a picked trainer keeps its name.
  - Lists bounded by their scope — one store's studios / templates, a date window's national
    holidays, store exceptions and schedules — are read whole by `allPagesQueryOptions` /
    `fetchAllPages` (`LIST_PAGE_SIZE` = 100), up to the last page with no fixed cap.
  - Each picker, the 実施予定日 preview, the single-date closure check and the instructor conflict
    probe show 「〇〇の取得に失敗しました」 + 再試行 (`ListLoadError`) on a failed read (first or a
    later page), rather than an empty list / an unadjusted calendar / no conflict. A store whose
    detail cannot be read no longer falls back to every brand's lessons.

## Round 1 result (MR1, 2026-10-07)

| Check                                                         | Result                                                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npm run type-check`                                          | 0 errors                                                                                                                   |
| `npm run lint` / `prettier --check` on the feature folder     | clean                                                                                                                      |
| Live smoke vs dev, system account, 全店舗: list over day/week | ✅ 200, 22 sessions on 2026-09-12 / 2026-08-13 render with lesson, studio, multiple trainers, booking count                |
| Header store = JOYFIT24 渋谷 (dev): KPI cards                 | ✅ match `dashboard` (8 コマ, PT 8, 0%, 前週比 hidden on `weekAgo: null`)                                                  |
| Week view, list view                                          | ✅                                                                                                                         |
| 自分のスケジュール (`view=trainer-self`) for a non-trainer    | ✅ empty page, as specified                                                                                                |
| Instructor filter (client-side)                               | ✅ no extra request                                                                                                        |
| Area summary / `area-dashboard`                               | ⚠️ not exercisable — dev has **no active `area` organization node**; the picker shows 「エリアが登録されていません」       |
| Change modal writes (PATCH / update-from-here)                | ⚠️ not run — dev has no future schedule to edit (all seed sessions are past). Needs a test schedule (MR3 form, or Swagger) |

Still open: B1–B4; the write path smoke; a role check with a staff / trainer account.

## Round 1 result (MR3) + write-path smoke for MR1–MR3 (2026-10-07)

Test data, all **unpublished** (モードB, no bookings) at FIT365 新宿 (dev) — JOYFIT24 渋谷 has no
Joyfit24 studio lesson on dev. Single `01a11681-6407-7a27-9294-c9adc51c0f10` (cancelled by the test);
recurrences `01a11683-3c99-7aaa-b6a1-44b36983e62e` (weekly Tue from 2026-10-27, count 3 — 11-10 onward
cancelled by the test, 10-27 still active) and `01a116a2-dd6b-7406-b7da-455bc3eaa5f6` (2026-11-03 × 1).
The SDK was refreshed from dev after `bc018fe2` (BE !645 / !647 / !654) was deployed.

| Check                                                   | Result                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run type-check` / lint / prettier                  | 0 errors in the feature (origin/dev's own `contracts/*` errors excepted) / clean                                                                                                                                                                                                                                             |
| Lesson picker by store brand                            | ✅ `brand=Fit365` for FIT365 新宿; JOYFIT24 渋谷 → `brand=Joyfit24` → no lesson on dev (the 400 E-VAL-001 seen before the filter is gone)                                                                                                                                                                                    |
| 登録 — 単発 (2026-10-21 10:00, studio A, 定員 12)       | ✅ 201; toast; back to the dashboard, which lists it as 内部                                                                                                                                                                                                                                                                 |
| 登録 — 繰り返し (Tue × 3, 祝日スキップ ON)              | ✅ 201 `generatedCount: 3`; toast 「祝日・休業日のためスキップ 1件」                                                                                                                                                                                                                                                         |
| Preview vs server for 2026-11-03 (文化の日)             | ⚠️→✅ first run: preview kept 11-03 (v0.9.2: the store's `holiday` row is open) but dev skipped it — dev ran `09f6011b`, before BE !645. After `bc018fe2` (with !645) reached dev: rule `01a116a2-dd6b-7406-b7da-455bc3eaa5f6` from 11-03 × 1 → preview 11-03, server `generatedCount: 1`, `skippedHolidayDates: []` — match |
| Instructor conflict probe                               | ✅ (10-07) `GET /admin/lesson-schedules?trainerId=…&from=&to=` per selected trainer → ⚠️ since BE !666 that query is 400 (storeId required) and the failure was silent; 10-13: scoped to the selected store (B11) and a failed probe now says so                                                                             |
| MR1 change modal — この回のみ (10:00 → 10:30)           | ✅ PATCH 200 with `expectedUpdatedAt`; end time preview 11:30; timeline refreshed                                                                                                                                                                                                                                            |
| MR1 change modal — 以降すべて from 11-10 (→ 11:00)      | ✅ label 「11月10日(火)以降の毎週 火」; `update-from-here` 200 `updatedCount: 2`                                                                                                                                                                                                                                             |
| Template save / 読込 / 上書き / delete (BE !654 on dev) | ✅ POST 201 with `lessonId` + `studioId` (now required); list shows lesson · studio; 読込 from PT mode restores レッスン区分 = studio, lesson, studio, 定員 (12), Tue, time; 上書き = PATCH 200 with `expectedUpdatedAt`; DELETE 204. Both test templates deleted                                                            |

## Manual reservation modal (FR-006, API-113) — 2026-10-30

**Branch**: `feat/lesson-manual-reservation-real-api` (from `dev` @45fbeddb) · **Spec**: D-01 FR-006
(fitness-spec `main@ce0f982`, synced 2026-10-24) · prototype `lesson-schedule` 予約手動入力 ·
API-113 v0.14 (`openapi.real.json` on dev, no SDK refresh needed). Supersedes the closed !198,
which used `GET /admin/members?query=` (closed to Trainer since the 2026-10-09 PO decision).

### Endpoint mapping

| UI surface                                     | Real endpoint                                                                                              | Hook                                                 | Round |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| セッション枠 select                            | `GET /admin/lesson-schedules?from=&to=` (the shown day) + the page's `view=store&storeId` / `trainer-self` | `lessonScheduleAllPagesOptions`                      | 1     |
| 会員検索 (会員ID・氏名), at most 5 rows        | `GET /admin/lesson-bookings/member-lookup?scheduleId&query&limit=5` (API-113 #20, every role)              | `adminLessonBookingControllerMemberLookupOptions`    | 1     |
| プラン・残回数 column, ペナルティ中, 異常系    | `GET /admin/members/{memberId}/lesson-remaining` (one per result row, as in the detail page's dialog)      | `adminLessonBookingControllerLessonRemainingOptions` | 1     |
| Studio seat (auto: first free) + 予約済み rows | `GET /admin/lesson-schedules/{scheduleId}/booking-stats` → `seats[]`                                       | `adminLessonBookingControllerBookingStatsOptions`    | 1     |
| 予約を登録                                     | `POST /admin/lesson-bookings` (`statusOnCreate: 'reserved'`; N-024 is sent by the BE)                      | `adminLessonBookingControllerCreateMutation`         | 1     |

### Decisions

- **M1 — セッション枠 before 会員検索.** The member lookup is bound to a schedule (API-113 #20: scope
  and Trainer's store rule come from it), and it is the only member search Trainer may call — the
  spec gives Trainer manual entry on their own sessions. The prototype lists 会員検索 first; the
  search stays disabled with 「先にセッション枠を選択してください」 until a slot is picked, and a new
  slot drops the picked member.
- **M2 — Member search per the prototype**: search box + result table (会員番号 / 会員名 /
  プラン・残回数 / 選択), at most 5 rows, server prefix match. The mock's full-list select is gone —
  the API has no member list for this screen.
- **M3 — Slots** = the day the screen shows (`filters.date`, today by default) in the page's list
  scope; live sessions with a seat left (`seatBookingCount < capacity`), unpublished ones included.
  No scope (エリア別, or 全店舗 with no store) → 「店舗を選択してください」.
- **M4 — 異常系.** Member level (course + 備考 disabled), as in the prototype: a monthly-plan member
  with no session left → 「残回数が不足しています」; a penalty on the slot's lesson type (read from
  `activePenalties`, not `activePenalty`, which is only the one ending last) →
  「予約不可期間中の会員です（M月D日まで）」. Course level: 月次プラン for a member with no
  monthly-plan option → 「月次プランの契約がありません」 (the API needs an `optionContractId`).
- **M5 — Body.** 月次プラン → `monthly_plan` on the contract with the most sessions left; 都度 →
  `per_use`, `feeCharged` left to the lesson's fee, or `0` for a lesson with no per-use fee. Studio
  slots send the first free seat (no seat picker in this modal). Refusals go through the shared
  MutationCache toast; slots / seats refetch.

### Open

- Spec FR-006 says 月次プラン 「残回数を1消費する」 at entry; the API decrements at attendance
  (API-113 §6.3 #6, D-Q02). The helper text is kept as specified.

### Round 1 result

| Check                                  | Result                 |
| -------------------------------------- | ---------------------- |
| `npm run type-check` / lint / prettier | 0 errors / clean       |
| `npm run build`                        | ✅                     |
| Live smoke vs dev                      | see the MR description |
