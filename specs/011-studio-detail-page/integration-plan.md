# Real API Integration Plan: D-03 Studio Detail (スタジオ詳細)

**Branch**: `feat/lesson-studio-integration-api` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/studios/[id]/` — `page.tsx` and every card under `_components/` (basic info, layout, images, linked lessons, utilization, history tab, delete dialog, header actions)
**Target API**: `src/lib/api-real` (see [010](../010-d03-studio-list/integration-plan.md) T001) — API-110 v0.7.2 #3 / #5 / #11 / #12 / #13 + the additive fields of BE !757 / !762
**Sibling plans**: [010 list](../010-d03-studio-list/integration-plan.md) · [012 create / edit](../012-studio-create-edit/integration-plan.md)

## Guiding principle

**UI first.** Every card the screen draws stays; where the API shape differs, the card is fed from
`_utils/studio-api.util.ts`, not reshaped. The mock `GET /crm/studios/{id}` bundled everything
(detail + layout + linked lessons + utilization); the real API splits it into separate reads, each
card owning its own query so one failing read does not blank the page.

Mock routes `src/app/api/crm/studios/[id]/**`, their schemas and the `_mock-db` studio tables are
**left untouched** — the screen simply stops calling them.

## Endpoint mapping

| UI surface                                                                                               | Real endpoint                                                                                | Hook                                        | Round |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- | ----- |
| Header (name, 区分, status), 基本情報 card, layout preview, images card, status card                     | `GET /api/v1/admin/studios/{studioId}`                                                       | `adminStudioControllerDetailOptions`        | 1     |
| 紐付きレッスン card; the in-use count of the delete dialog                                               | `GET /api/v1/admin/studios/{studioId}/linked-lessons`                                        | `adminStudioControllerLinkedLessonsOptions` | 1     |
| 利用状況 card — selected period (本日 / 今週 / 今月): レッスン数, 予約充足率, 稼働時間帯, 時間帯別稼働率 | `GET /api/v1/admin/studios/{studioId}/utilization?from=&to=&granularity=day`                 | `adminStudioControllerUtilizationOptions`   | 1     |
| 利用状況 card — 予約トレンド（直近7 枠 / 週 / ヶ月）                                                     | same, over the 7 periods (`granularity` = day / week / month; the 7 months need 3 calls, D5) | same                                        | 1     |
| 変更履歴 tab                                                                                             | `GET /api/v1/admin/studios/{studioId}/history?limit=100`                                     | `adminStudioControllerHistoryOptions`       | 1     |
| 無効化する / 有効化する                                                                                  | `PATCH /api/v1/admin/studios/{studioId}` `{ isActive, expectedUpdatedAt }`                   | `adminStudioControllerUpdateMutation`       | 1     |
| 削除                                                                                                     | `DELETE /api/v1/admin/studios/{studioId}` (409 E-STD-004 while future schedules exist)       | `adminStudioControllerRemoveMutation`       | 1     |

No Round 2 blocker on this screen.

### Spec'd but not built

- None. (The gate-2 draft listed the layout-configured state as S1; the layout card already has it —
  no seats → 「レイアウト情報が未設定です」 with a 「レイアウトを設定する」 link to the edit page — and it
  is kept.)

## Decisions

- **D1 — Card-per-query.** `page.tsx` reads the detail; the linked-lessons card, the utilization
  card and the history tab each run their own query (`enabled` on mount / tab open), with their
  own skeleton / error / retry.
- **D2 — Role gating follows the API (§6.6).** 利用状況 is rendered only for system / headquarter /
  manager / staff (trainer / observer get 403 E-STD-101 from #11 — D-03 KPI matrix ×). The 変更履歴
  tab is rendered only for system / headquarter / manager (#12). Edit / delete stay on the existing
  `RoleGatedButton` permissions (FR-003-09; delete = HQ / manager, the API agrees).
- **D3 — 基本情報.** 利用時間 = `startTime`–`endTime` (`HH:mm`); 所属店舗 = `store.name`; ID = the UUID
  (copyable text); 登録日 / 更新日 from `createdAt` / `updatedAt`; 設備・備品 = `equipment`, 備考 =
  `description`.
- **D4 — Layout preview.** Built from `seats[]` + `gridSize`: `normal` → 通常席 with its stored
  `seatNumber`, `equipment` → 器材席 (label = `displayLabel` ?? 器材), `structure` → 固定物 (label =
  `displayLabel` ?? 固定), `empty` → blank. No seats → the existing 未設定 state with its link to the edit
  page.
- **D5 — Utilization windows (JST calendar).** Selected period: 本日 = today; 今週 = Monday–Sunday of
  this week; 今月 = this calendar month. レッスン数 = Σ `trend[].scheduleCount`; 予約充足率 =
  `fillRate`; 稼働時間帯 = `activeHours` (「—」 when null); 時間帯別稼働率 = `timeBandUtilization`
  (null band → 「—」). Trend: 7 days (`granularity=day`), 7 Monday weeks (`week`, 49 days), 7 calendar
  months (`month`, split into ≤ 92-day calls of 3 + 3 + 1 months and concatenated — §4.3 asks
  clients to split). Bar value = `trend[].fillRate` (null → empty bar).
- **D6 — Time-band labels follow the spec** (Clarifications 2026-10-14): 朝（〜12時） / 昼（12〜16時） /
  夕方（16〜19時） / 夜（19時〜） — API-112 §6.13.5 bands, the same call made for the D-01 dashboard.
  The prototype's 6–12 / 12–15 / 15–18 / 18–22 labels are replaced.
- **D7 — Linked lessons.** Category badge = `kind` (定期 / 単発); schedule text = recurring:
  weekday initials from `daysOfWeek` (0 = 日) + `startTime`–`endTime`; single: `M/D` of `nextDate` +
  `startTime`–`endTime` (`endTime` null → start only); rate = `round(fillRate × 100)`%, null → 「—」;
  colour tier from the existing `studio-reservation-tier.util.ts` (80 / 60, FR-003-05).
- **D8 — Delete.** The dialog's in-use count = number of linked-lesson rows (active recurrences +
  lessons with future one-offs ≈ the API's in-use rule). The API stays authoritative: a 409
  E-STD-004 (`meta.suppressErrorToast`) switches the dialog to its in-use state and offers 無効化.
  無効化 = PATCH `{ isActive: false, expectedUpdatedAt }`.
- **D9 — History diff on the FE** (§5.2: "Diff rendering is FE-side"). Rows come back newest first;
  each row is diffed against the next (older) one over: スタジオ名, スタジオ区分, 物理定員, バッファ値,
  利用時間, 設備・備品, 備考, ステータス, スペースレイアウト (`rows×cols` + seat count), スタジオ画像
  (count). `created` → 新規作成 badge + 「{name}を新規登録」; `deleted` / `restored` → 無効化 / 有効化
  (or 削除); `meta.action` (image / layout) names the change when no field differs. `limit=100`; an
  oldest row without a predecessor on the page shows its event only. 操作者 = `changedByName`.
- **D10 — Errors by `code`.** Reads: E-STD-001 → the existing 「スタジオが見つかりません」 empty state.
  Mutations: the global `MutationCache` toast shows `userMessage`; no extra `onError` toast.

## Round 1 tasks

### Phase A — foundations

- **T101** `_utils/studio-api.util.ts` (from 010 T002) — add `toLayoutCells(seats, gridSize)`,
  `utilizationWindows(period, today)`, `formatLinkedSchedule(row)`, `TIME_BAND_LABELS`,
  `diffStudioSnapshots(newer, older)`.

### Phase B — detail screen

- **T102** `page.tsx` — real detail query; header badges from `studioType` / `isActive`; E-STD-001
  empty state; pass `isActive` / `updatedAt` to the status and delete parts.
- **T103** `[P]` `_components/studio-basic-info-card.tsx` — D3.
- **T104** `[P]` `_components/studio-layout-card.tsx` — D4.
- **T105** `[P]` `_components/studio-images-card.tsx` — `images[].url` (signed by the BFF).
- **T106** `[P]` `_components/studio-linked-lessons-card.tsx` — own query, D7.
- **T107** `_components/studio-utilization-card.tsx` (+ `_hooks/use-studio-utilization.hook.ts` _new_) —
  own queries per period, D5 / D6; hidden by role (D2).
- **T108** `_components/studio-history-tab.tsx` — own query, D9; tab hidden by role (D2).
- **T109** `_components/studio-delete-dialog.tsx` — DELETE / PATCH mutations, D8.

### Phase D — verification

- **T110** type-check / lint / prettier (shared with 010 T006).
- **T111** Live smoke on dev (own test studio only): detail of a studio with seats + images; linked
  lessons on a studio that has schedules; utilization 本日 / 今週 / 今月; history after an edit;
  無効化 → 有効化; delete refused on a studio with future schedules (409 → in-use state), delete of
  the test studio. One non-HQ account if available (KPI / history hidden).
- **T112** Record the result below.

## Round 2 backlog

- None.

## Open / Resolved questions

- **Resolved (Clarifications 2026-10-14)** — time-band labels follow the spec boundaries (D6).
- **Resolved Q1 — FR-003-10** (Quý, 2026-10-14). It excluded the KPI panel (FR-007), the edit /
  delete / deactivate workflow (FR-004 / FR-005) and layout editing (FR-006) from Phase 1, yet the code
  already ships all of them and API-110 v0.7 (2026-08-26 prototype-gap ruling, theme F) defines
  #11 / #12 / #13 as Phase 1 — FR-003-10 is treated as superseded and everything is integrated in
  Round 1 (Clarifications 2026-10-14 in spec.md).

## Round 1 result (2026-10-14)

**Status: shipped in this branch; live smoke run on dev.**

| Task      | File(s)                                           | Notes                                                                                                   |
| --------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| T101      | `_utils/studio-detail.util.ts` _(new)_            | Windows, band labels, linked-lesson text, history diff. A same-size layout edit shows 「（配置変更）」. |
| T102–T109 | `page.tsx`, the cards, history tab, delete dialog | As planned.                                                                                             |

### Verification (dev, system account)

- QA studio `01a11773-f3f1…` (5 linked lessons, bookings): stored seat numbers A1…B8; 利用状況 週次 /
  月次 — the 7 months as 3 calls (Apr–Jun, Jul–Sep, Oct), all 200; bands 朝 / 昼 / 夕方 / 夜 per spec;
  linked lessons 単発 with `10/20 10:00-11:00` and 「—」 rates; 削除 opens the in-use state (5件, 削除する
  disabled, 代わりに無効化する offered).
- Own test studio (created in 012's smoke): history rows 新規作成 / スペースレイアウト / スタジオ名 /
  バッファ値 / スタジオ画像 / ステータス, operator name; 無効化 → 有効化; 削除 → 204 and back to the list.
- Not exercised: the E-STD-004 fallback when no linked row shows; a non-HQ account (KPI / history hidden).
