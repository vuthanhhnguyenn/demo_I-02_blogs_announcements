# Quickstart: Y-10 CRM Maintenance Management

Manual verification checklist (per Constitution's No Testing Policy — no automated tests). Run through this after implementation, logged in as each role noted. Seed data assumed per [data-model.md](data-model.md)'s 6-row set (M-001…M-004 completed, M-005 in_progress, M-006 planned).

## Setup

1. `npm run dev`, navigate to `/crm-maintenance` logged in as a `System` user.
2. Confirm the mock DB seeded 6 rows and `npm run generate-openapi && npm run generate-api` have been run at least once after the schema/route files exist (so `src/lib/api/*` has typed hooks for this feature).

## List screen (FR-010, FR-011, FR-020, FR-021, User Story 2)

- [ ] All 6 rows render with correct columns (ID, title, start, end, status badge, allowed-user count "{n}名", created date).
- [ ] M-005's badge shows "メンテナンス中" (in_progress); M-006 shows "予定" (planned); the other 4 show "完了" (completed) — confirms FR-011 is computed from real time, not hardcoded.
- [ ] Typing part of an ID or title into search narrows the list; clearing restores it (FR-010).
- [ ] Status filter combines correctly with search; active-filter badge/summary banner text is correct; "条件をクリア" resets everything (FR-010).
- [ ] Clicking "開始日時"/"終了日時"/"作成日" column headers toggles asc/desc sort (FR-010).
- [ ] Temporarily filter to a status with zero matches → filtered-empty state with "条件をクリア" appears (FR-021).
- [ ] **[FR-007]** The 通知 column renders 済 for notified rows (M-005), 未 for the unnotified planned row (M-006), and — for every 完了 row (M-001…M-004) (FR-022).
- [ ] As `Headquarter`: list loads (200), row actions show no 編集/削除 controls.
- [ ] As `Manager`/`Staff`/`Trainer`/`Observer`: navigating to `/crm-maintenance` shows the access-denied screen, no table (FR-020).

## Create (FR-001–FR-009, User Story 1)

- [ ] As `System`: "新規登録" is enabled; opens the create form with title, start/end datetime, message, note, allowed-users card.
- [ ] Submit with a required field blank → inline error with the exact per-field message (FR-002), no submission.
- [ ] Submit with `endsAt` before `startsAt` → `終了日時は開始日時より後の日時を入力してください。`, no submission (FR-004).
- [ ] Submit with a period overlapping M-005 or M-006 → server-side 409 surfaces the overlap message, no submission (FR-005).
- [ ] Open "CRMユーザーを検索して追加" → search by a partial user ID, then by a partial name, then by role → each narrows correctly against the real `/crm/staffs` data (FR-007). Search with no matches shows "該当するユーザーが見つかりません" (FR-006 acceptance scenario 6 / FR-009).
- [ ] Select multiple staff in one search-dialog confirmation → all appear in the allowed-user list at once (FR-008).
- [ ] Re-opening the search dialog shows already-added users tagged "追加済み" and their checkbox pre-checked/disabled (FR-009).
- [ ] Remove one allowed user via its row's X button before saving → it disappears from the list (FR-008).
- [ ] Save with zero allowed users → succeeds (spec.md Edge Cases: empty allowed-user list is valid).
- [ ] Submit a valid, non-overlapping window with allowed users → confirmation dialog summarizes title/period/allowed-user count → confirm → success toast, returns to list, new row visible with correct derived status (FR-006).
- [ ] As `Headquarter`: "新規登録" is disabled with the deny tooltip (FR-012).

## Detail (FR-013, FR-014, User Story 2)

- [ ] Click any row (outside its action menu) → opens detail with all registered fields read-only, including the allowed-user table (ID/name/role per row) (FR-013).
- [ ] As `System` on the detail page: 編集 button and the delete overflow-menu item are visible.
- [ ] As `Headquarter` on the same detail page: no 編集/delete controls are shown (FR-014).
- [ ] Detail's status badge matches the list's computed status for the same record.

## Advance notification (FR-007 delta: FR-022–FR-027, SC-007)

- [ ] On M-006 (planned, seeded 未): the 事前通知 card shows the "対象CRMユーザーに…" helper text + a "通知を送信" button; as `System`, clicking it opens the confirm popup previewing title / period / message + the allowed-user access note (FR-025).
- [ ] Confirm → success toast "通知を送信しました"; the card switches to "通知済み" and the list's 通知 column for M-006 flips 未 → 済 after refetch (FR-027, SC-007).
- [ ] Once 済, the card shows "通知済み" **and** keeps a "通知を再送信" button; clicking it re-opens the confirm popup and a confirmed re-send succeeds again (manual re-send allowed, FR-024).
- [ ] As `Headquarter`: the send/re-send button (in both 未 and 済 states) is inactive with the System-only deny tooltip (FR-024).
- [ ] `POST /crm/maintenances/{id}/notifications` as a non-`System` user → 403; unknown id → 404 (server-side, not only UI gating).

## Edit (FR-015–FR-017, User Story 3)

- [ ] Edit M-006 (planned): all fields, including start datetime, are editable.
- [ ] Edit M-005 (in_progress): start-datetime field is disabled with the lock tooltip ("メンテナンス中のため開始日時は変更できません"); end datetime, message, note, and the allowed-user list remain editable (FR-016).
- [ ] On M-005 (in_progress), add a new allowed user via the search dialog and save → the addition succeeds despite the record being in progress (FR-017).
- [ ] Save a valid edit on any record → success toast, list and detail reflect the change (FR-015).
- [ ] As `Headquarter`: opening a row's detail still works (read access), but no Edit control is reachable.

## Delete (FR-018, FR-019, User Story 3)

- [ ] As `System`, on M-006 (planned) or a completed row: row action menu / detail overflow menu → 削除 → confirmation dialog "このCRMメンテナンス情報を削除しますか？" → confirm → row removed from list, allowed-user rows removed with it (FR-018).
- [ ] As `System`, on M-005 (in_progress): delete option is disabled with "削除できません / メンテナンス実施中のため"; clicking does nothing (FR-019).
- [ ] Cancelling the delete confirmation leaves the record unchanged.

## Cross-cutting

- [ ] `tsc --noEmit` passes with no errors (Constitution I).
- [ ] `npm run lint` passes (Constitution I / QA process).
- [ ] No manual edits under `src/lib/api/` — only regenerated via `generate-openapi`/`generate-api` (Constitution II).
- [ ] No new mock endpoint was added for staff search — confirm the Network tab shows calls to `/crm/staffs`, not a new `/crm/maintenances/...` search path (research.md §5).
