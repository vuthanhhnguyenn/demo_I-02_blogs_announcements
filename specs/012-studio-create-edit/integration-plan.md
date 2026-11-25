# Real API Integration Plan: D-03 Studio Create / Edit + Space Layout (スタジオ登録・編集)

**Branch**: `feat/lesson-studio-integration-api` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/studios/create/page.tsx`, `[id]/edit/page.tsx`, `_components/studio-form.schema.ts`, `_components/studio-form/**` (form, basic info, images, status, confirm dialog, space layout editor)
**Target API**: `src/lib/api-real` (see [010](../010-d03-studio-list/integration-plan.md) T001) — API-110 v0.7.2 #1 / #4 / #6 / #7 / #8 / #10 + BE !762 `seats[].activeBookingCount`; uploads via API-006 `POST /api/v1/media/presign` (`tag=facility-image`)
**Sibling plans**: [010 list](../010-d03-studio-list/integration-plan.md) · [011 detail](../011-studio-detail-page/integration-plan.md)

## Guiding principle

**UI first.** The form keeps every field, the confirm dialog and the right-hand layout editor. The
real API saves the studio, its seat grid and its images through separate endpoints, so one save of
the form becomes a short sequence (D3) — the screen does not change.

Mock routes `src/app/api/crm/studios/**`, `src/app/api/crm/uploads/presign`, their schemas and the
`_mock-db` studio tables are **left untouched** — the screens simply stop calling them.

## Endpoint mapping

| UI surface                                        | Real endpoint                                                                                          | Hook / helper                                           | Round |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ----- |
| 店舗名 select                                     | `GET /api/v1/admin/stores?limit=100`                                                                   | `adminStoreControllerListOptions`                       | 1     |
| Edit: pre-fill (fields, images, layout)           | `GET /api/v1/admin/studios/{studioId}`                                                                 | `adminStudioControllerDetailOptions`                    | 1     |
| Image upload (drag & drop / 画像を追加)           | `POST /api/v1/media/presign` `tag=facility-image` → S3 PUT                                             | `useMediaUpload({ tag: 'facility-image' })`             | 1     |
| Create: 入力内容を確認する → 登録                 | `POST /api/v1/admin/studios` (fields + `images[{ imageS3Key }]`) → `PUT …/{studioId}/seats`            | `adminStudioControllerCreateMutation`, `…ReplaceSeats…` | 1     |
| Edit: 変更を保存する                              | `PATCH …/{studioId}` → `PUT …/seats` → `DELETE` / `POST …/images` (+ `PATCH …/images/{imageId}` order) | `useStudioSave` _(new hook, D3)_                        | 1     |
| Layout editor: per-cell booking warning           | `seats[].activeBookingCount` on the detail read                                                        | —                                                       | 1     |
| Edit warning banner (料金や制限条件を変更すると…) | linked-lesson count from `GET …/{studioId}/linked-lessons` (011 D8)                                    | `adminStudioControllerLinkedLessonsOptions`             | 1     |

No Round 2 blocker on these screens.

## Decisions

- **D1 — Form values stay FE-shaped.** The Zod schema keeps its fields; `studio-api.util.ts` converts
  both ways: `operatingHours` `HH:mm~HH:mm` ↔ `startTime` / `endTime` (sent as `HH:mm:ss`);
  `studioType` ↔ API enum; `status` ↔ `isActive`; `equipmentNotes` ↔ `equipment`; `internalNotes` ↔
  `description` (empty → `null`); `bufferValue` ↔ `bufferCapacity`. Images become
  `{ id, s3Key, url }` (`id` = the API image id once saved, a local id before).
- **D2 — Store is immutable on edit** (§6.2 #1): the 店舗名 select is disabled in edit mode; PATCH
  never sends `storeId`.
- **D3 — Save sequence (not atomic, as on the lesson-master form).** Create: POST (with the initial
  images) → PUT seats when the grid has any non-empty cell. Edit: PATCH (`expectedUpdatedAt` = the
  `updatedAt` read for the form) → PUT seats (`expectedUpdatedAt` = the PATCH answer's `updatedAt`)
  → delete removed images, add new ones, PATCH `displayOrder` where the order changed. A failure
  after the first step keeps the user on the form with 「一部の保存に失敗しました」 and refreshes the
  detail, so a retry starts from what was saved.
- **D4 — Seat grid ↔ editor.** The editor's cells (`x`, `y`, kind) map to `columnIndex`, `rowIndex`,
  `seatType` (通常席 `normal`, 器材席 `equipment`, 固定物 `structure`, 未使用 `empty`); the full grid,
  empty cells included, is sent (§7.5). On load the grid size is `gridSize`; a size outside the
  editor's options (rows 2–5, columns 6 / 8 / 10 — FR-006-03) is rounded up to the next option, and a
  grid larger than 5 × 10 opens the editor read-only with a notice (none exist today; the API allows
  larger grids).
- **D5 — Seat numbers are kept** (Clarifications 2026-10-14). A cell that already holds a `normal`
  seat keeps its stored `seatNumber`; a newly placed 通常席 gets `max(numeric seat numbers) + 1`; a seat
  re-typed away from 通常席 loses its number. The editor's continuous 1..N renumbering is removed, so a
  member's booked seat number never changes because another cell was edited.
- **D6 — Booking warning per cell** (Clarifications 2026-10-14; D-03 FR-006 異常系, prototype dialog).
  Cells whose seat has `activeBookingCount > 0` carry a marker. Changing such a cell away from 通常席,
  or shrinking the grid over it, opens 「このスペースには既存の予約が{n}件あります。予約を取り消してから
  変更してください。」 and the change is not applied (the API would refuse it with 409 E-STD-009). A
  race still answers E-STD-009 at save; its `userMessage` is toasted by the global `MutationCache`.
- **D7 — Images.** Upload with `useMediaUpload({ tag: 'facility-image' })` (JPG / PNG / WebP, 5 MB,
  per FR-002-02); the form keeps the returned `s3Key` and shows a local preview; saved images show the
  BFF-signed `images[].url`.
- **D8 — Errors by `code`.** The existing `onError` toasts are removed (the global `MutationCache`
  toasts `userMessage`); E-STD-006 on a stale save tells the user to reload (stale lock — §6.2 #8).

## Round 1 tasks

### Phase A — foundations

- **T201** `_utils/studio-api.util.ts` (from 010 T002 / 011 T101) — `studioToFormValues(detail)`,
  `formValuesToCreateBody`, `formValuesToPatchBody`, `layoutToSeatInputs(layout, seats)` (D4 / D5),
  `diffImages(before, after)`.
- **T202** `_components/studio-form.schema.ts` — image item `{ id, s3Key?, url }`; layout cells carry
  `seatId?`, `seatNumber?`, `activeBookingCount?`.

### Phase C — forms

- **T203** `_hooks/use-studio-save.hook.ts` _(new)_ — D3 sequence for create and edit.
- **T204** `_components/studio-form/studio-form.tsx` — real store list, `useStudioSave`, warning banner
  from the linked-lesson count, D8.
- **T205** `[P]` `_components/studio-form/studio-form-basic-info.tsx` — real stores; store select
  disabled on edit (D2).
- **T206** `[P]` `_components/studio-form/studio-form-images.tsx` — D7.
- **T207** `_components/studio-form/space-layout-editor.tsx` — seat numbers (D5), booking markers and
  dialog (D6), grid-size handling (D4).
- **T208** `[id]/edit/page.tsx` + `create/page.tsx` — real detail read; `studioToFormValues`;
  `updatedAt` kept for the lock.
- **T209** `[P]` `_components/studio-form/studio-form-confirm-dialog.tsx` — store name from the real
  list.

### Phase D — verification

- **T210** type-check / lint / prettier (shared with 010 T006).
- **T211** Live smoke on dev with an own test studio: create with 2 images + a 2 × 8 grid → detail;
  edit name / hours / buffer, add + remove an image, add a row of seats (numbers kept, new ones
  appended) → detail; stale save (edit in two tabs) → E-STD-006; a booked seat (test booking on an own
  future schedule, notifications off) → marker + dialog; PT with capacity 4 → E-STD-007; delete the
  test studio afterwards.
- **T212** Record the result below.

## Round 2 backlog

- None.

## Open / Resolved questions

- **Resolved (Clarifications 2026-10-14)** — keep existing seat numbers (D5); per-cell booking warning
  built in Round 1 (D6).
- **Open** — FR-002-02 still lists スタジオ区分 options ノーマル / ホットヨガ / バーチャル; 010's
  Clarifications 2026-07-01 already chose スタジオレッスン用 / PT用 / ボディケア用 (what the code and the API
  use). Recommendation: amend FR-002-02 to the three API types.

## Round 1 result (2026-10-14)

**Status: shipped in this branch; live smoke run on dev.**

| Task      | File(s)                                                                               | Notes       |
| --------- | ------------------------------------------------------------------------------------- | ----------- |
| T201–T202 | `_utils/studio-form.util.ts` _(new)_, `studio-form.schema.ts`                         | As planned. |
| T203–T209 | `use-studio-save.hook.ts` _(new)_, form, basic info, images, layout editor, edit page | As planned. |

### Verification (dev, system account, FIT365 新宿 (dev); the test studio was deleted afterwards)

- Create with 2 images (canvas PNGs through API-006 presign) and a 2 × 8 grid: POST 201 with
  `images[{ imageS3Key: public/facility-image/… }]` → PUT seats 200 → detail; signed image URLs render.
- Edit: removed seat 2 and placed a new seat → `1 · 3 4 … 5` (stored numbers kept); store select
  disabled; save = PATCH `{ name, bufferCapacity, expectedUpdatedAt }` 200 → PUT seats 200 → DELETE
  image 204.
- Status switch: PATCH `{ isActive: false }` then `{ isActive: true }`, each with the latest `updatedAt`.
- QA studio edit (nothing saved): seat A1 held by 1 booking shows the marker 「予約1件」; turning it into
  未使用 opens the dialog and leaves the grid unchanged.
- Not exercised: a stale save (E-STD-006) — a second tab ended the session on refresh rotation, so this
  was dropped; the partial-save path; PT capacity ≠ 1 (E-STD-007); a grid larger than 5 × 10 (none on dev).
