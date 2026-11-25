# Quickstart: Y-06 App Maintenance Management

Manual verification checklist (per Constitution's No Testing Policy — no automated tests). Run through this after implementation, logged in as each role noted. Seed data assumed per [data-model.md](data-model.md)'s 6-row set (AM-001…AM-004 completed, AM-005 in_progress, AM-006 planned).

## Verification already performed (2026-07-10, this implementation pass)

> **⚠️ Superseded 2026-07-23**: The role-gating results below reflect the original 2026-07-10 rule (System-only writes, Headquarter read-only, Manager blocked entirely). The Y-06 v2 (260713_v2) 権限マトリクス has since changed this — `System`+`Headquarter` may write; `Manager`/`Staff`/`Observer` are view-only; only `Trainer` has no access. See spec FR-014 and the updated Checklist below. This section is retained as an implementation-history record.

No browser-automation tool was available in this environment, so the checklist below was **not** clicked through visually in a real browser. Instead, the dev server was started and the underlying business logic was verified directly against the running mock API (`curl`, with real login tokens for `system@example.com`/`admin@example.com`/`manager@example.com`) and by inspecting the rendered page HTML for crashes:

- List: `GET /crm/app-maintenances` returns all 6 seeded rows with correct `status` values computed live from `now()` (one `in_progress`, one `planned`, four `completed` — confirms FR-007 is never hardcoded); `search`, `brand`, and `status` query params correctly filter (e.g. `search=データベース` → only `AM-003`; `status=in_progress` → only `AM-005`).
- Auth/role gating (FR-014): `Manager` gets 403 on the list API and is redirected to `/403` at the page-routing layer (`src/proxy.ts` + the new `PAGE_PERMISSIONS`/`ROLE_PERMISSIONS` entries); `Headquarter` can view the list (200) and open `/app-maintenance` but is redirected to `/403` when hitting `/app-maintenance/create` or `/app-maintenance/:id/edit` directly by URL; `System` reaches all three routes (200); a request with no auth token gets 401.
- Create (FR-012): valid non-overlapping submission → 201; missing `message` → 400 with the expected Japanese message; `endsAt` before `startsAt` → 400; a period overlapping `AM-005` (same brand) → 409 with the exact conflict message from contracts/app-maintenance-mutations.md.
- Edit lock (FR-010): `PATCH` on `AM-005` (in_progress) changing `startsAt` → 409 "メンテナンス中のため開始日時は変更できません。"; patching only `message` on the same row → 200 and persists.
- Delete lock (FR-011): `DELETE` on `AM-005` (in_progress) → 409 "メンテナンス実施中のため削除できません。"; deleting a non-in-progress row → 200, and a subsequent `GET` on that id → 404.
- Page rendering: `/app-maintenance`, `/app-maintenance/create`, and `/app-maintenance/:id/edit` all return correctly-titled, non-crashed HTML (no error boundary / digest text) when authenticated as `System`.

**Not verified**: actual clicking/typing in a rendered browser (filter UI interactions, sort-header clicks, form field entry, dialog confirmation clicks, toast appearance, disabled-tooltip hover text). The checklist below should still be run through in a real browser before sign-off — recommend the user (or a future session with browser tooling) complete it.

## Checklist

## Setup

1. `npm run dev`, navigate to `/app-maintenance` logged in as a `System` user.
2. Confirm the mock DB seeded 6 rows and `npm run generate-openapi && npm run generate-api` have been run at least once after the schema/route files exist (so `src/lib/api/*` has typed hooks for this feature).

## List screen (FR-001–FR-006, User Story 1)

- [ ] All 6 rows render with correct columns (ID, brand, start, end, message, status badge).
- [ ] AM-005's badge shows "メンテナンス中" (in_progress); AM-006 shows "予定" (planned); the other 4 show "完了" (completed) — confirms FR-007 is computed from real time, not hardcoded.
- [ ] Typing part of an ID or message into search narrows the list; clearing restores it (FR-002).
- [ ] Brand filter + status filter combine correctly with each other and with search; active-filter badge count is correct; "clear all" resets everything (FR-003).
- [ ] Clicking "Start datetime" column header toggles asc/desc; clicking "End datetime" does too; default load order is start datetime descending (FR-004).
- [ ] Changing page size to 25 with 6 rows still shows all 6 on page 1; pagination controls disable appropriately at the boundaries (FR-005).
- [ ] Temporarily filter to a brand/status with zero matches → filtered empty state with "clear conditions" appears (FR-006). (Emptying the whole table is not practical to test without deleting all seed rows — skip the "no data at all" empty state or verify it against a fresh/empty mock DB reset.)

## Create (FR-008, FR-009, FR-012, FR-015, FR-016, User Story 2)

- [ ] As `System`: "New Registration" is enabled; opens the create form with brand (radio), start datetime, end datetime, message.
- [ ] Warning notice about app unavailability + forced-update suppression is visible (FR-009).
- [ ] Submit with a field blank → inline error next to that field, no submission (FR-012).
- [ ] Submit with `endsAt` before `startsAt` → inline error, no submission (FR-012).
- [ ] Submit with a period overlapping an existing same-brand window (e.g. same brand/time as AM-006) → server-side 409 surfaces as a generic error message (FR-012, Q6); no submission.
- [ ] Submit a valid, non-overlapping window → success message, returns to list, new row visible with correct derived status (FR-015).
- [ ] Click "Cancel" mid-fill → returns to list, nothing saved (FR-016).
- [ ] As `Headquarter`: "New Registration" is enabled and the create flow works (write access — Y-06 v2 matrix, FR-014).
- [ ] As a view-only role (`Manager` / `Staff` / `Observer`): "New Registration" is disabled/hidden (FR-014).

## Edit (FR-010, FR-013, User Story 3)

- [ ] Click any row (not its action menu) → opens edit form pre-filled with that row's actual data (not the same static values regardless of row — this closes the prototype's mock-binding gap).
- [ ] Edit AM-005 (in_progress): start-datetime field is disabled with tooltip; brand selector is disabled; end datetime and message remain editable (FR-010, Q4).
- [ ] Edit AM-006 (planned): start-datetime is fully editable; brand selector still disabled (Q4 applies regardless of status).
- [ ] Save a valid edit → success message, list reflects the change.
- [ ] As `Headquarter`: opening a row works and Edit/Delete controls are enabled (write access — FR-014).
- [ ] As a view-only role (`Manager` / `Staff` / `Observer`): the row opens read-only with Edit/Delete controls disabled/hidden (FR-014).

## Delete (FR-011, User Story 4)

- [ ] As `System`, on AM-006 (planned): row action menu → Delete → confirmation dialog names brand + start time → confirm → row removed from list.
- [ ] As `System`, on AM-005 (in_progress): Delete option in the row action menu is disabled with inline explanation; clicking does nothing (FR-011).
- [ ] As `Headquarter`: Delete option is available and works on a non-in-progress row (write access — FR-014).
- [ ] As a view-only role (`Manager` / `Staff` / `Observer`): Delete option is disabled/hidden entirely (FR-014).

## Cross-cutting

- [ ] `tsc --noEmit` passes with no errors (Constitution I).
- [ ] `npm run lint` passes (Constitution I / QA process).
- [ ] No manual edits under `src/lib/api/` — only regenerated via `generate-openapi`/`generate-api` (Constitution II).
