---
description: 'Task list for Staff Detail — Login History Tab'
---

# Tasks: Staff Detail — Login History Tab

**Input**: Design documents from `/specs/031-staff-login-history/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, checklists/parity.md

**Organization**: Tasks are grouped by user story (US1 view login history, US2 force-terminate a session) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- UI tasks cite their V0 source range and the `PAR###` parity items they satisfy (`checklists/parity.md`)

## Path Conventions

Single project — `src/` at repository root (existing Next.js App Router app). No backend/mock-db/OpenAPI work: both consumed endpoints already exist and are already generated into `src/lib/api-real` (plan.md Technical Context, research.md R1–R3).

---

## Phase 1: Setup

No tasks. No new npm dependency, environment variable, or project scaffolding is needed — both endpoints this feature consumes are already generated in `src/lib/api-real/@tanstack/react-query.gen.ts` (`adminStaffPermissionControllerStaffLoginHistoriesOptions`, `adminStaffControllerRevokeSessionsMutation`).

---

## Phase 2: Foundational (Blocking Prerequisites)

No separate foundational phase. The one piece of shared setup — adding the third tab trigger to `page.tsx` — is small enough that it is folded into User Story 1's first task (T002 below) rather than split into its own phase, consistent with how `028-subsequent-login` handled its single shared-file touch.

**Checkpoint**: Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Review a staff account's login history (Priority: P1) 🎯 MVP

**Goal**: A Headquarter/System user can open any staff account's detail page, see a "ログイン履歴" tab, and view that account's recorded sign-ins (日時/認証方式/IP/ユーザーエージェント, newest first, with a total-count footer and a proper empty state) — with the tab entirely absent for every other role.

**Independent Test**: As Headquarter, open a staff account with prior sign-ins — confirm the tab and its table render correctly, newest first, with a working truncated-UA tooltip and correct footer count. Open a never-logged-in ("招待中") account — confirm the empty state. Switch to Manager/Staff/Trainer/Observer (own account and another's) — confirm the tab does not render at all.

### Implementation for User Story 1

- [x] T001 [US1] Create `src/app/(private)/staffs/[id]/_components/login-history-tab.tsx`: `useQuery(adminStaffPermissionControllerStaffLoginHistoriesOptions({ path: { id: staffId }, query: { page: currentPage, limit: pageSize } }))` with local `useState` page/pageSize (default 10), reading `data?.items ?? []` / `data?.pagination.totalItems ?? 0`; declare a local `LoginHistoryEntry` interface (`{ id, loggedInAt, authProvider, result?, sessionId, ipAddress, userAgent }`, per `data-model.md`) and cast each item to it (same one-line-comment pattern already used for `ChangedBy` in `permission-history-tab.tsx`); render via the shared `DataTable` (`variant="simple"`) + `TablePaginationWithSize` (same pattern as `staffs/page.tsx`), columns 日時 (via `formatDateYYYYMMDD_HHMM`) / 認証方式 (mapped `google`→"Google SSO", `cognito`→"IDaaS", `magic_link`→"マジックリンク") / 結果 (color-coded outline badge, defaulted to 成功 when `result` is absent — frontend-declared ahead of backend support, see `research.md` R2 addendum) / IPアドレス / ユーザーエージェント (`max-w-xs truncate` with full value in a `title` tooltip); empty state via the existing `Empty` component — port from `.cache/fitness-crm-ui/src/pages/staff-detail.tsx` › ログイン履歴 table (L463-472, L478-484, L485-496, adjusted: no "保持期間1年間" footer clause — see `checklists/parity.md` descope notes); satisfies PAR013, PAR014, PAR015, PAR016, PAR017, PAR018, PAR019, PAR020
- [x] T002 [US1] In `src/app/(private)/staffs/[id]/page.tsx`: add a third `TabsTrigger value="login-history"` labeled "ログイン履歴" after "変更履歴", rendered only when the viewing user's role is Headquarter/System (reuse whatever role-check hook the page already uses for other role-gated elements on this page), with its matching `TabsContent` rendering `<LoginHistoryTab staffId={id} />` — port from `.cache/fitness-crm-ui/src/pages/staff-detail.tsx` › Tabs (L255-262, adjusted: role check is Headquarter/System only, no Manager/self-exception) (depends on T001); satisfies PAR001, PAR002

**Checkpoint**: At this point, User Story 1 is fully functional and independently testable — the tab shows real login history, correctly empty, correctly hidden from other roles.

---

## Phase 4: User Story 2 - Force-terminate a staff account's CRM session (Priority: P2)

**Goal**: A Headquarter/System user can, from the same tab, trigger a single confirming action that ends the staff account's live CRM session — succeeding whether or not one currently exists — without any per-device list (none exists server-side; see `research.md` R1).

**Independent Test**: On the "ログイン履歴" tab, click "セッションを強制終了", confirm the dialog's copy (no device/IP named), confirm, and see a success message. Repeat against an account known to have no live session — confirm it still reports success, not an error. Switch to Manager — confirm the action is not present.

### Implementation for User Story 2

- [x] ~~T003 [P] [US2] Create `staff-session-terminate-action.tsx`~~ — **superseded by T007 below**: product asked for the full V0 "アクティブセッション" card (mock data, real terminate action) instead of a standalone account-level button; the standalone component was deleted and its logic folded into `active-sessions-card.tsx`'s confirm dialog. See `research.md` R1 addendum and `spec.md` Assumptions.
- [x] T007 [US2] Create `src/app/(private)/staffs/[id]/_components/active-sessions-card.tsx`: ports the V0 "アクティブセッション" card (device icon, device label, "現在のセッション" badge, IP + 最終アクティブ, per-row "強制終了"/"終了しました", 3-device-cap footer copy) against a component-local `MOCK_ACTIVE_SESSIONS` array (no real session-list endpoint exists yet — explicitly UI-first per product direction, not a Constitution-II violation since it's clearly marked and temporary); the confirm dialog (named device + IP, キャンセル/強制終了する) still calls the real `adminStaffControllerRevokeSessionsMutation` on confirm, so termination has a genuine backend effect even though the row list is mock — port from `.cache/fitness-crm-ui/src/pages/staff-detail.tsx` L412-461, L556-585; satisfies PAR021, PAR022, PAR023, PAR024, PAR025, PAR026, PAR027, PAR028
- [x] T004 [US2] In `login-history-tab.tsx` (from T001), render `<ActiveSessionsCard staffId={staffId} />` above the login-history table within the same tab content (depends on T001, T007)

**Checkpoint**: Both user stories are independently functional — history viewing and session termination both work, and both are gated to Headquarter/System only.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [x] T008 [US2] **(2026-09-16, BE schema refresh)** Rewire `active-sessions-card.tsx` to FR-S002's real multi-session contract, now that the schema serves it: read `data?.sessions ?? []` instead of adapting the `@deprecated` singular `session`; render 最終アクティブ from the new `lastSeenAt` (falling back to `loggedInAt` → `createdAt`); drive the footer's device cap from the served `maxConcurrent` instead of a hard-coded 3 (hide the line until it loads); send `body: { sessionId }` on revoke so 強制終了 ends exactly the targeted terminal rather than the whole account. Also drop the now-false "generated DTO is a raw passthrough" cast in `login-history-tab.tsx` (items have always been typed `StaffLoginHistoryItemDto`) and handle its nullable `ipAddress`/`userAgent`. Re-verified that `result` is **still** absent from `StaffLoginHistoryItemDto`, so PAR016's forward-compatible `result?` default stays as-is. Updates PAR024, PAR026, PAR028; closes the FR-S002 entry in `checklists/parity.md` › Known backend gaps

- [x] T005 [P] Run `npm run lint` and `tsc --noEmit`; fix any issues surfaced in the new/modified files (`login-history-tab.tsx`, `active-sessions-card.tsx`, `page.tsx`, `table-pagination-with-size.tsx`) — clean on both, re-run after T007
- [ ] T006 Run `quickstart.md` end-to-end (all five roles, empty-history state, idempotent no-session termination) and tick off every non-descoped item in `checklists/parity.md` (PAR001, PAR002, PAR013-PAR028) — leave the "Descoped" section as-is (informational only, not gating) (depends on T001-T004, T007) — not yet run this session (browser self-test explicitly deferred; requires Cognito login)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks.
- **Foundational (Phase 2)**: No tasks — folded into US1.
- **User Story 1 (Phase 3)**: T002 depends on T001 (same-file-adjacent: `page.tsx` imports the component T001 creates). No dependency on US2.
- **User Story 2 (Phase 4)**: T003 has no dependency (new standalone file) and can run in parallel with T001/T002. T004 depends on both T001 (the file it edits) and T003 (the component it renders).
- **Polish (Final Phase)**: T005 can run any time after T001/T003 exist; T006 depends on T001–T004 all being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on User Story 2 — fully independently testable and shippable alone (MVP).
- **User Story 2 (P2)**: Its component (T003) is independent, but wiring it in (T004) requires US1's `login-history-tab.tsx` (T001) to exist first, since both stories' UI live in the same tab.

### Parallel Opportunities

- T003 (`staff-session-terminate-action.tsx`) can be built in parallel with T001/T002, since it shares no file with either.
- T005 (lint/tsc) can start as soon as any file exists, though it's most useful run once after T004.

---

## Parallel Example: Cross-story

```bash
# These two can run in parallel — different files, no shared dependency:
Task: "Create login-history-tab.tsx in src/app/(private)/staffs/[id]/_components/login-history-tab.tsx"   # T001 [US1]
Task: "Create staff-session-terminate-action.tsx in src/app/(private)/staffs/[id]/_components/staff-session-terminate-action.tsx"  # T003 [US2]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (T001, T002).
2. **STOP and VALIDATE**: run US1's Independent Test above — a Headquarter user can review any staff account's login history; every other role sees no tab.
3. This alone is a shippable increment: FR-M009's audit/security value lands even before session-termination exists.

### Incremental Delivery

1. T001 → T002 → validate US1 → demo/ship (MVP).
2. T003 → T004 → validate US2 → demo/ship.
3. T005 → T006 → final polish and parity sign-off.

---

## Notes

- [P] tasks = different files, no dependencies.
- Only 2 new files and 1 modified file total — this is a small, single-page addition consuming two already-generated endpoints; no backend, mock-db, or OpenAPI work of any kind.
- Every `PAR###` item in `checklists/parity.md` (PAR001, PAR002, PAR013-PAR015, PAR017-PAR024) is claimed by T001–T004 above; the checklist's separate "Descoped" section is intentionally not claimed by any task (see `research.md` R1–R2).
- Commit after each task or logical group; stop at the Phase 3 checkpoint to validate US1 independently before starting US2.
