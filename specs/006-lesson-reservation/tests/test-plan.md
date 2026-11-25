# Test Plan: D-01 Lesson Reservation Detail (Round 1 — real API-113)

**Spec**: [spec.md](../spec.md)
**PO Spec**: `D-01 FR-007` — 予約一覧・詳細表示 (plus FR-006 manual booking, FR-008 cancel, FR-009 attendance, FR-011 memo, FR-015 limited profile)
**Created**: 2026-10-08
**Integration round**: Round 1 complete on API-113 v0.10 (see [integration-plan.md](../integration-plan.md) → "Round 1 result"). Booking list / stats / attend / no-show / revert / cancel / manual create, session memo CRUD and the limited profile are live against the dev backend. The four API-112 schedule-write dialogs (change instructor / time / studio, 3-step cancel wizard, 中止を取り消す) and the lesson-schedules list are **still on the mock client** and are out of scope here.
**Consumed by**: `gen-testcases` (one TC doc per unit below, under `tests/cases/`) → `execute-testcases` (runs them in the order given here)

**Source note**: the UI prototype (`.cache/fitness-crm-ui`) and the requirement docs (`.cache/fitness-spec`) are not present in this checkout. Every case is judged on `spec.md` alone; the delta table below lists what the prototype would normally have settled so the gap is visible, not silent.

---

## Scope

**In scope** — the single screen `/lesson-schedules/[id]/reservations` and the modals that exist only inside it, backed by `src/lib/api-real`:

- Page header (title, subtitle, remaining-seat badge / 中止済み badge, breadcrumb), space reservation grid + legend + cell popover, reservation list (7 per page, sort, status / attendance / cancel columns), 予約統計 panel, レッスン情報 card, 中止済み status card, PT limited-profile card
- Member limited-profile popover (all lesson types), 会員詳細を見る navigation
- Session memo card (studio free text / PT five structured fields → one memo), save = create or replace, delete
- Manual booking dialog (member search, 残回数 / penalty pre-checks, seat select for studio lessons, chip list, partial-failure handling)
- Reservation cancel dialog (three cancel causes), grid-popover 予約取消
- Attendance dropdown (未確認 / 出席確認済 / 無断キャンセル)
- Role × scope gating: System / Headquarter / Manager / Staff full; Trainer own-session only (backend 404 → `/403`); Observer read-only

**Out of scope** (separate owners or not yet integrated — tested elsewhere or in a later round):

- **API-112 schedule writes**: この回を変更 (講師 / 時間 / スタジオ), 中止にする wizard, 中止を取り消す. They still call the mock routes and will fail with a toast against a real UUID. Only "the control is present / disabled as the spec says" is checked from this screen; their behaviour is not.
- **Lesson-schedules list (005)** — stays mock (integration-plan D1). Reaching this screen is by direct URL with a real schedule UUID.
- **D-02 lesson content management** — the レッスン内容管理で編集 link target. Only the navigation is checked.
- **Member detail (D-05)** — 会員詳細を見る target. Only the navigation is checked.
- **Penalty release** — lives on member detail.
- **QR check-in** — attendance here is the manual override only.
- **Notification delivery (FR-012)** — sent by the backend; no UI, not observable from this screen.

---

## Unit Table

| #   | Unit                                | Screen(s)                                                                                                                                               | Route                                          | TC Doc Filename                                                                  |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Reservation Detail — read + profile | Page header, grid + legend + cell popover, list + pagination, stats panel, lesson info card, cancelled card, member popover, PT card, session memo card | `/lesson-schedules/[id]/reservations`          | `TC -【Fitness CRM】- [D-01-A][Lesson Reservation Detail - Real API].md`         |
| 2   | Reservation Detail — booking writes | 予約を追加する dialog, 予約をキャンセル dialog (list row + grid popover), attendance dropdown                                                           | `/lesson-schedules/[id]/reservations` (modals) | `TC -【Fitness CRM】- [D-01-B][Lesson Reservation Booking Writes - Real API].md` |

**Split rationale**: one screen, no child route, so one unit by the rule. It is split in two only because the write dialogs carry their own validation / error-code matrix and create data that unit 1 must not depend on. Unit 1 reads what already exists; unit 2 creates and cancels its own bookings.

---

## Sources per Unit

| Unit | Spec sections                                                                                                                                                                             | UI prototype file              | FRs covered                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1    | User Story 1 (all), User Story 4 (all), User Story 5 (all), Edge Cases (cancelled lesson, remainingCount 0 badge, penalty badge), Clarifications 2026-10-07 (memo, Trainer scope, 会員ID) | not available in this checkout | FR-007-01…08, FR-007-14 (display half), FR-007-16, FR-007-17, FR-011-01, FR-015-01…04             |
| 2    | User Story 2 (all), User Story 3 scenarios 1–2, Edge Cases (残り0席, remainingCount 0, penalty, member search empty, attendance), Clarifications 2026-10-07 (no toggles, paymentType)     | not available in this checkout | FR-006-01…03, FR-007-05 (attendance + cancel columns), FR-007-12, FR-007-15, FR-008-01, FR-009-01 |

Out-of-scope FRs (API-112, mock): FR-007-09, FR-007-10, FR-007-11, FR-007-13, FR-007-14 (wizard half). Listed in the traceability map as "present, not executed".

---

## Spec-vs-prototype deltas

The prototype is absent, so no spec-vs-prototype conflict can be confirmed. The rows below are **spec-vs-real-API** deltas settled in the 2026-10-07 clarifications; `gen-testcases` must carry each into the case Notes.

| Item                                    | In spec (current)                                                                 | Earlier spec / prototype behaviour    | How to test                                                                                                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Notification toggles                    | No toggle in the add or cancel dialog (FR-006-01, FR-008-01)                      | Prototype had 「通知する」 checkboxes | Assert the checkbox is **absent** in both dialogs. The API-112 dialogs keep theirs — do not flag those.                                                                                                                              |
| Session memo shape                      | One memo per session, dated by `updatedAt`, no author (FR-011-01)                 | List of dated, authored entries       | Save twice → one entry whose date/content is the second save. No author text anywhere in the card.                                                                                                                                   |
| Trainer own-session scope               | Backend 404 `E-LSC-001` → page redirects to `/403` (Clarification 2026-10-07)     | Client compared trainer ids           | Sign in as Trainer, open a schedule they are not assigned to → `/403`. Positive case needs an assigned schedule (see data policy).                                                                                                   |
| 会員ID in the popover                   | From `memberNumber` on the booking row                                            | Shown from mock data                  | **B1** — line hidden on dev today. Case written to the spec, recorded `Block (B1)`.                                                                                                                                                  |
| Remaining count column in member search | 残回数 shows a number only for a monthly-plan lesson; per-use lesson shows 「—」  | Always a number                       | Open the add dialog on a per-use lesson → 「—」; on a monthly-plan lesson → `effectiveRemaining`.                                                                                                                                    |
| 予約数 / 残り席 source                  | Header badge = confirmed + pending over capacity; 残り from the API's `available` | Client-side count                     | Compare the badge with the 予約統計 rows after each write; never recompute by hand beyond the sum.                                                                                                                                   |
| Lesson info 繰り返し                    | "単発" when the schedule has no recurrence, else the recurrence label             | Label text from mock                  | Spec-only: the API gives a recurrence id, not a label. Check 単発 vs non-単発 only; exact pattern text is a known gap (see below).                                                                                                   |
| Member search matching                  | "by name or ID"                                                                   | —                                     | Real API matches a **name prefix** or the **full** 会員番号 only; a 会員番号 prefix returns nothing. Write the case to the spec wording and record the prefix miss as `NG` with a note — it is a BE question, not a Round 1 blocker. |

---

## Coverage Focus per Unit

Added to, not a replacement for, `gen-testcases`' full coverage walk (field validation, boundaries, role × scope matrix, empty / loading / error states).

### Unit 1 — read + profile + memo

**Real-API behaviours**

- **Error codes end to end**: `E-LSC-001` (404 schedule) → `/403` for Trainer, generic error state for other roles; `E-LSB-030` (404 memo) → 「メモはありません」 empty state, **not** an error; `E-LSB-101` (403 limited profile) → popover shows 閲覧権限がありません, the rest of the page unaffected; `E-LSB-017` / `E-LSB-031` (409 stale / already exists memo) → shared error toast and the card refetches to the server value.
- **401 session expiry** mid-page (revoked token) → the app's common redirect-to-login path, not a silent blank page.
- **Server-side scope**: Trainer with no assigned schedule → every schedule is `/403`; Observer sees store schedules read-only (予約を追加 disabled, no 取消, attendance static); Manager / Staff see their store scope only.
- **Real pagination**: 8+ bookings → page 2 exists, "1-7 / N件" matches `pagination.totalItems`; row numbers continue across pages; sort is per page (documented behaviour).
- **Persistence**: memo survives reload and re-login; a memo saved in one tab is what a second tab sees after refetch (last edit wins).
- **Memo length caps are server caps**: studio 5,000, PT 10,000 (joined text). Boundary at cap and cap + 1; the counter and the server agree.

**Computed values**

- Header badge `{confirmed + pending}/{capacity} 予約済（残り{available}席）` against the stats panel; 中止済み badge replaces it on a cancelled schedule.
- 予約統計 percentages: each of the 5 rows over their sum, 0 % when the sum is 0, no division error on an empty schedule.
- Grid footer `{held}/{normal seats} 予約済（残り N席）`; pending holds render as held with a 仮予約 badge; equipment / structure cells are not clickable.
- 予約日時 column = schedule date + start time; 中止済み card = latest history entry (date, operator name, category label, reason).

**Limited profile (FR-015)**

- Field allow-list present (name, age/sex, 直近30日 N回, 最終来館, lesson history with 出席 / 欠席, body data, plan, remaining); protected fields absent (address, phone, email, contract). Body data hidden with the 本人の同意なし note when consent is false. `facePhotoUrl` avatar vs initial avatar. PT card shows the same data inline, for the single PT booking.

**UI breakage under stress (1024 px floor)**

- Longest lesson name in the header and the info card; three or more instructors stacked in the info card and joined in the subtitle; a 20-char full-width member name in the list cell, popover header, PT card and cancel dialog; a 5,000-char memo rendered in the card (scroll, no overflow); an 8-column grid with equipment / structure cells at 1024 px; 7 rows with every badge (ペナルティ中 + 残回数不足 + status) on one row.

### Unit 2 — booking writes

**Real-API behaviours**

- **Create**: 201 → toast 「予約を追加しました（N名）」, dialog closes, list / grid / badge / stats refresh together. Error matrix by code: `E-LSB-005` (reserved on an **unpublished** schedule — the default state of most dev seeds), `E-LSB-006` (month allowance exhausted), `E-LSB-008` (trial flag mismatch — not reachable from this UI), `E-LSB-009` (seat already held), `E-VAL-001` field errors. Partial failure with 2+ members: the failed member stays as a chip, the dialog stays open, succeeded ones are gone from the chip list and present in the list.
- **Cancel**: 200 → status `キャンセル済`, seat released in the grid, badge and stats updated; each `cancelledBy` value (member / staff / trainer) round-trips (verify the status label and the stats row). Cancelling an already-cancelled booking is not offered (取消 disabled on the row).
- **Attendance**: 出席確認済 → `attendedVia: manual`; 無断キャンセル before session start → 422 (expected BE refusal, surfaced by the shared toast, state unchanged); 未確認に戻す → `reserved`. Stats rows follow each change.
- **Pre-checks are advisory**: a member blocked client-side by 残回数 0 / penalty cannot be added; a member who passes client-side but is refused server-side (`E-LSB-006`) gets the toast and stays a chip.
- **paymentType derivation** (Clarification 2026-10-07): monthly-plan lesson + contract with remaining → `monthly_plan` with that `optionContractId`; otherwise `per_use`; free lesson → `per_use` + `feeCharged: 0` (**B2**). Verify by the plan column after creation (月{n}回 / 都度) — never by inspecting the request.
- **Seat handling**: studio lesson — manual seat select lists only free normal seats, 自動割り当て takes the first free seat in reading order, opening from a grid cell pre-selects that seat; PT / body care — no seat control at all.
- **401 expiry** inside the open dialog → common re-login path, no half-created state (verify via the list after re-login).

**Business rules**

- 残り0席: counter shows 残り0席, 追加 disabled for every row, confirm hidden. Adding k members decrements the counter by k before confirming.
- Search: ≥1 character required, empty result state text, debounce (no request per keystroke observable as flicker), max 5 rows per query.
- Same member twice in one dialog → second 追加 is 追加済み; removing a chip re-enables it.

**Role × scope**

- Observer: add disabled, no 取消, attendance static (server would answer 403 — the UI must not even offer the action). Trainer on an assigned schedule: full write set. Manager / Staff: full set within store scope.

**UI breakage under stress (1024 px floor)**

- 10 chips of 20-char names in 追加予定; the longest penalty warning 「予約不可期間中の会員です（12月31日まで）」 in the row; cancel dialog with the longest member name + seat label; the shared error toast with the longest BE `userMessage`.

---

## Known Round 1 gaps (from integration-plan.md)

| Bn  | Blocker                                                                      | UI behaviour in Round 1                               | Test treatment                                                                                                                    |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Booking list has no `memberNumber` on backend main yet.                      | Popover 会員ID line hidden.                           | Case written to FR-015-01; result `Block (B1)` while the line is absent.                                                          |
| B2  | Backend rejects `feeCharged: 0` for a per-use free lesson (400 `E-VAL-001`). | Dialog sends it per spec; shared toast shows the 400. | Case written to the clarification; result `Block (B2)`. Needs a free lesson on dev — none exists today, so it is also a data gap. |
| B3  | `paymentType` optional on BE.                                                | Always sent.                                          | No observable UI difference; no case.                                                                                             |
| B4  | Staff-cause cancel has no notification event.                                | None.                                                 | Not observable from the UI; no case.                                                                                              |
| B5  | Deprecated keys still published by BE.                                       | Never read.                                           | No case.                                                                                                                          |

**Additional known gaps (not blockers, recorded by the Round 1 smoke)**

- Most dev seed schedules are `isPublished: false`; a manual booking there is refused with `E-LSB-005` by design. Unit 2 needs a **published** schedule — see data policy.
- 繰り返し label: the API returns `recurrenceId` only, so the card can say 単発 vs a generic recurring label, not "毎週 月・水・金". Record the exact-text case as `NG` with a note pointing at API-112 unless the spec owner relaxes FR-007-17.
- Two Base UI console warnings on the seat cell and member-name popover triggers (pre-existing on `dev`). Not a test failure; do not report as NG.

---

## Traceability Map

| FR        | Unit | Note                                                                           |
| --------- | ---- | ------------------------------------------------------------------------------ |
| FR-007-01 | 1    | header                                                                         |
| FR-007-02 | 1    | grid                                                                           |
| FR-007-03 | 1    | legend                                                                         |
| FR-007-04 | 1    | stats panel                                                                    |
| FR-007-05 | 1, 2 | columns in 1; attendance + cancel actions in 2                                 |
| FR-007-06 | 1    | status badges (7 real statuses map onto the 5 colours)                         |
| FR-007-07 | 1    | pagination                                                                     |
| FR-007-08 | 1    | empty state                                                                    |
| FR-007-09 | —    | API-112 (mock) — control presence only, not executed                           |
| FR-007-10 | —    | API-112 (mock) — control presence only                                         |
| FR-007-11 | —    | API-112 (mock) — control presence only                                         |
| FR-007-12 | 2    | cancel causes                                                                  |
| FR-007-13 | —    | API-112 (mock) — control presence only                                         |
| FR-007-14 | 1    | 中止済み badge / card / disabled dropdown (display); undo button presence only |
| FR-007-15 | 2    | grid popover 予約取消                                                          |
| FR-007-16 | 1    | header badge                                                                   |
| FR-007-17 | 1    | lesson info card (繰り返し exact text = known gap)                             |
| FR-006-01 | 2    | add dialog                                                                     |
| FR-006-02 | 2    | 残回数 0 block                                                                 |
| FR-006-03 | 2    | penalty block                                                                  |
| FR-011-01 | 1    | memo card                                                                      |
| FR-015-01 | 1    | popover (会員ID = B1)                                                          |
| FR-015-02 | 1    | protected data absent                                                          |
| FR-015-03 | 1    | ペナルティ中 badge                                                             |
| FR-015-04 | 1    | 残回数不足 badge                                                               |
| FR-009-01 | 2    | attendance override                                                            |
| FR-008-01 | 2    | cancel dialog, no toggle                                                       |

Every in-scope FR lands in ≥1 unit. The four API-112 FRs have no executing unit by decision (out of scope until that integration).

---

## Execution Notes (for execute-testcases)

- **Credentials**: real Cognito accounts from `src/lib/auth/demo-users.ts`, one per role (System / Headquarter / Manager / Staff / Trainer / Observer, all `Password@123`). Map pre-conditions: "staff" cases → Staff or Manager; "trainer own session" → Trainer; read-only → Observer; everything else → System. The header 「デモ: ユーザー切替」 switcher only appears with `NEXT_PUBLIC_APP_ENV=development`.
- **Environment**: `NEXT_PUBLIC_REAL_API_URL=https://api.dev.fitness-v2.okamoto-hd.com`, **shared** with the backend team and other testers. Expect other people's data to appear and change.
- **Entry point**: direct URL only — `/lesson-schedules/<uuid>/reservations`. Known dev schedules at plan time: `00000000-0000-7000-8000-00000000a401` (studio, bookings, past), `…a301` (PT, one booking), `…a405` (studio, Observer-visible), `01a11681-6407-7a27-9294-c9adc51c0f10` (cancelled), `01a11683-3ca7-7b66-8ec7-90821b602f60` (future, 2026-10-27, unpublished). Re-verify before the run; seeds move.
- **Data policy** (no seed reset exists):
  - Unit 2 creates its own bookings on a **future, published** schedule. If none exists, create one through the schedule UI / API with lesson name prefix `QA-D01-` and publish it; unpublish or cancel it at the end.
  - Member for bookings: a member whose name starts with `QA-D01-` (create via member registration if absent). Never book or cancel real seeded members except the ones already used by the Round 1 smoke (`hj bn`, JF-0000083).
  - Memo cases run on the QA schedule only; never overwrite a memo on a seeded schedule.
  - Attendance cases run on the QA bookings only; revert to 未確認 at the end.
  - Never edit or delete the seeded schedules listed above; never run API-112 writes against them.
- **Known-gap policy**: a failure matching a `Bn` row → `Block (Bn)`; the 繰り返し label and the 会員番号-prefix search → `NG` with the note from this plan; any other failure → `NG`.
- **Viewport**: 1024×768 for layout cases, ≥1440 px for the wide check. Below 1024 px is out of scope.
- **Account safety**: no wrong-password cases in this feature. Do not sign the Trainer account in repeatedly in parallel sessions; Cognito rate-limits.
- **Trainer positive case**: the demo Trainer has no assigned schedule on dev. Assign the Trainer's staff record to the QA schedule (API-112 change instructor, via the schedule UI as System) before running the own-session cases; otherwise record them `Block (data)`.

---

## Suggested Order

1. **Unit 1 as System on `…a401`** — pure reads, establishes the baseline and the popover / memo cases without creating anything.
2. **Unit 1 role cases** (Trainer → `/403`, Observer read-only on `…a405`) — still no writes.
3. **Unit 2 on the QA schedule** — create first (bookings exist for the later cases), then attendance, then cancel; grid-popover cancel last since it consumes a seat.
4. **Unit 1 pagination / stress** — needs 8+ bookings, so it runs after unit 2 has created them.
5. **Clean-up** — cancel remaining QA bookings, delete the QA memo, unpublish the QA schedule.

---

## Definition of Done

- Two TC docs created under `tests/cases/` with the filenames above.
- Every in-scope FR traced to a case; the four API-112 FRs marked "present, not executed".
- `checklists/requirements.md` gaps fixed before execution.
- Each doc executed once against dev with results recorded (`OK` / `NG` / `Block (Bn)` / `Block (data)`).
- QA bookings cancelled, QA memo deleted, QA schedule unpublished, or an explicit note of what was left and why.
