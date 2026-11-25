# Tasks: Blacklist Management (A-01 FR-015)

**Input**: Design documents from `/specs/025-blacklist-management/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/blacklist-api.md](./contracts/blacklist-api.md)

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `[US1]` / `[US2]` / `[US3]` — maps to the user stories in spec.md
- UI tasks cite their V0 source and the parity items they satisfy

## Path Conventions

Next.js App Router. Screens under `src/app/(private)/`, mock API under `src/app/api/`, generated client under `src/lib/api/` (never hand-edited).

**V0 source**: `.cache/fitness-crm-ui/src/pages/blacklist-list.tsx` (789 L) and `blacklist-detail.tsx` (278 L) @ `e99646c`.

> **No tests.** Constitution § No Testing Policy — no test files, no test frameworks, no test tasks. Verification is `tsc --noEmit`, ESLint, and [quickstart.md](./quickstart.md).

---

## Phase 1: Setup — Contract

**Purpose**: Declare the v0.4 shapes. Nothing downstream compiles until this and Phase 2's regeneration are done (plan § Execution Order — steps 1–2 are a hard barrier).

- [x] T001 Rewrite `src/app/api/_schemas/blacklist.schema.ts` to the v0.4 shape per [data-model.md](./data-model.md): enums `BlacklistSource` (`forced_withdrawal`/`manual`), `BlacklistReasonCategory` (5 values incl. `equipment_damage`), `BlacklistHistoryEventType`; objects `StaffRef`, `StoreSummary`, `BlacklistMemberRef`, `BlacklistMemberDetailRef`, `BlacklistHistoryEvent`, `BlacklistEntry`, `BlacklistEntryDetail`; request bodies `CreateBlacklistEntryRequest` (`reasonCategories` 1–5 unique required, `memo` ≤2000 nullable, `level` 1–5 optional) and `ReleaseBlacklistEntryRequest` (`isActive` literal `false`); query `GetBlacklistQuery` (`query` 1–60, `source`, `hasUnpaid`, `isActive` default true, `page`, `limit` 1–100 default 25, `includeTotalAll`). Delete `MatchConditionsSchema`, `BlacklistManualReasonSchema`, `BlacklistRegistrationSourceSchema`, `PostBlacklistBodySchema`. camelCase throughout (research §9).
- [x] T002 [P] Add `date_of_birth` (ISO date, nullable), `face_photo_url` (string, nullable) and `has_blacklist` (boolean) to `MemberListItemSchema` in `src/app/api/_schemas/member.schema.ts` (research §3; contract §5). Add a `match_mode` query param (`substring` default | `prefix`) to `GetMembersQuerySchema` so prefix matching is opt-in and existing callers are unaffected (research §4).
- [x] T003 Register the four routes with `registerRoute` per [contracts/blacklist-api.md](./contracts/blacklist-api.md): `GET /crm/blacklist`, `GET /crm/blacklist/{id}`, `PATCH /crm/blacklist/{id}/active`, `POST /crm/members/{id}/blacklist`. Remove the `POST /crm/blacklist` registration (FR-073).

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — the screens consume types that do not exist until T004 runs.

- [x] T004 Regenerate the API client: run the openapi generation script, then the hey-api client generation, then `prettier --write` over the generated output (a full regen is diff-clean only with it). Confirm `src/lib/api/types.gen.ts` exports `BlacklistSource`, `BlacklistReasonCategory`, `BlacklistEntry`, `BlacklistEntryDetail` and that `postCrmBlacklist` is gone.
- [x] T005 Create `src/app/api/_mock-db/tables/blacklist.table.ts` with `_rows`, `_seeded`, `_seed()`, `list(query)`, `getById(id)`, `create(memberId, input)`, `release(id)` — guards in contract order (contracts §3, §4) and the one-active-row invariant enforced in `create` (research §5, §7).
- [x] T006 [P] Create `src/app/api/_mock-db/seeds/blacklist.seed.ts` building rows from the existing member set with the coverage research §10 requires: both `source` values; auto rows carrying exactly `['unpaid']`; `unpaidAmount` zero and non-zero; **at least one released entry** with `removedAt`/`removedBy`; a member with no `primaryStore`; one with no `currentMainContract`; one with no `legacyMemberCode`; a `registered` event on every entry plus `removed` on released ones with `actor: null` for system registrations; more than 25 active rows.
- [x] T007 Remove the `memberBlacklist` block from `src/app/api/_mock-db/tables/transfer.table.ts` (L137+) and drop the `export type BlacklistRow = BlacklistDetail` alias from `src/app/api/_mock-db/seeds/transfer.seed.ts` (research §5).
- [x] T008 Delete `src/app/api/_mock-db/types/member-blacklist.type.ts`; retype the blacklist table in `src/app/api/_mock-db/_db.types.ts` and wire the new table in `src/app/api/_mock-db/_create-db.ts` and `src/app/api/_mock-db/index.ts`.
- [x] T009 Update the forced-withdrawal auto-registration call site at `src/app/api/_mock-db/tables/members.table.ts` L695 to the new shape — `source: 'forced_withdrawal'`, `reasonCategories: ['unpaid']`, `reason: null`, `isActive: true`, System actor — and append a `registered` history event (research §5). **Silent-failure risk**: if this is missed, auto-registered rows render wrong with no error.
- [x] T010 Implement `GET /crm/blacklist` in `src/app/api/crm/blacklist/route.ts` and remove its `POST` handler: validate `GetBlacklistQuery`, default `isActive` to `true`, apply `query`/`source`/`hasUnpaid`, paginate, and return `totalAllItems` only when `includeTotalAll=true` — computed as the count with every optional filter reset but `isActive` still applied (contracts §1).
- [x] T011 [P] Implement `GET /crm/blacklist/[id]` in `src/app/api/crm/blacklist/[id]/route.ts` returning `BlacklistEntryDetail` with the widened member block and the `history` array; a **released** entry MUST still resolve, not 404 (contracts §2, FR-069a).
- [x] T012 [P] Implement `PATCH /crm/blacklist/[id]/active` in `src/app/api/crm/blacklist/[id]/active/route.ts` (new file): guards in order — not found → 404, body not exactly `false` → 400, already released → 409. Effects: flip `isActive`, stamp `removedBy`/`removedAt`, append a `removed` event, leave `memberStatus` untouched (contracts §4, FR-065, FR-066).
- [x] T013 [P] Rewrite `POST /crm/members/[id]/blacklist` in `src/app/api/crm/members/[id]/blacklist/route.ts`: body `{ reasonCategories, memo?, level? }`, `source` written server-side as `manual` and never read from the request; guards — member not found → 404, active entry exists → 409 (contracts §3, FR-049, FR-050).
- [x] T014 [P] Implement `match_mode=prefix` in `src/app/api/crm/members/route.ts` — prefix matching on name, kana, email and phone, exact matching on member number and legacy member code; the default path keeps today's substring behaviour untouched (research §4, FR-038a). Populate the three new list fields from the member records, gating `has_blacklist` to HQ/System.

**Checkpoint**: `npx tsc --noEmit` clean, and all four endpoints answer correctly via the browser or a direct request.

---

## Phase 3: User Story 1 — Survey every blacklisted member (Priority: P1) 🎯 MVP

**Goal**: An HQ operator sees every active blacklist entry across all stores in one filterable, paginated table.

**Independent test**: Sign in as Headquarter, open `/members/blacklist`, confirm all six columns render the seeded rows, apply each filter, page through, and confirm the count badge, banner and footer agree. Sign in as any other role and confirm the screen is unreachable.

- [x] T015 [P] [US1] Rewrite `src/app/(private)/members/blacklist/_constants/blacklist.constants.ts`: `BLACKLIST_SOURCE_LABEL` (強制退会 / 手動登録), `BLACKLIST_REASON_CATEGORY_LABEL` (5 values), `UNPAID_FILTER_LABEL`, filter option lists, `getSourceBadgeClass`, and `BLACKLIST_PAGE_SIZE_OPTIONS = [25, 50, 100] as const` with `PAGE_SIZE` (25) as the default. Delete `MATCH_CONDITION_LABEL` and the `MatchConditions` type (Q-02).
- [x] T016 [US1] Rewrite `src/app/(private)/members/blacklist/_hooks/use-blacklist-filters.ts` on the A-03 pattern (`members/leaves/_hooks/use-leaves-filters.hook.ts`): `nuqs` `useQueryStates` for `page`/`page_size`/`search`/`source`/`unpaid` with `history: 'push'`, `shallow: false`; `useDebounce(searchInput, 500)`; every filter change resets `page` to 1; expose `queryParams` with `includeTotalAll: true`, `activeFilterCount`, `hasActiveFilters`, `clearFilters`.
- [x] T017 [P] [US1] Update `src/app/(private)/members/blacklist/_contexts/blacklist-filters-context.tsx` to provide the rewritten hook's value.
- [x] T018 [US1] Rewrite `src/app/(private)/members/blacklist/_components/blacklist-filters.tsx`: search input (max-w-400px, leading icon, placeholder 会員ID・氏名で検索) plus **two always-visible** selects (登録理由 `w-[140px] h-8 text-xs`, 未納金 same), right-aligned with `ml-auto`, active-value highlight `border-primary bg-primary/10 text-foreground`, and **no** 詳細フィルター collapse button — port from `.cache/fitness-crm-ui/src/pages/blacklist-list.tsx` › toolbar (L388-L426); satisfies PAR007-PAR013, PAR013a
- [x] T019 [P] [US1] Rewrite `src/app/(private)/members/blacklist/_components/blacklist-source-badge.tsx` to take `source` (was `registrationSource`): 強制退会 → `bg-destructive/15 text-destructive border-destructive/20`, 手動登録 → `bg-warning/15 text-warning border-warning/20` — port from `blacklist-list.tsx` › `getReasonBadgeClass` (L196-L203); satisfies PAR024
- [x] T020 [US1] Rewrite `src/app/(private)/members/blacklist/_components/blacklist-table-columns.tsx` with **six** columns in order — 会員ID (mono, muted, `w-[110px]`), 氏名 (link to member detail, `stopPropagation`), 店舗名 (em dash when `primaryStore` is null), 登録理由 (source badge), 未納金額 (right-aligned, destructive when > 0), 登録日. **No** 照合結果 column (Q-01) — port from `blacklist-list.tsx` › table (L436-L504); satisfies PAR018-PAR023, PAR025, PAR026, PAR028, PAR109
- [x] T021 [US1] Rewrite `src/app/(private)/members/blacklist/page.tsx`: HQ/System-only shell with `SidebarInset`, `PageHeader` (title ブラックリスト管理 + **filtered** count badge), the `Card` wrapper, `FilterResultBanner` (「全 N 件中 M 件を抽出中」 + `・`-joined summary + 条件をクリア), `DataTable`, filtered vs blank-slate empty states, `TablePaginationWithSize`, the servedPage clamp effect, and smooth scroll-to-top on page change — port from `blacklist-list.tsx` › `BlacklistList` (L364-L567); satisfies PAR001-PAR005, PAR014-PAR017, PAR029-PAR038
- [x] T022 [P] [US1] Add list loading and error states per the project's `@/components/common/data-state-boundary/{loading,empty}` convention — a skeleton while fetching, an error surface on failure, never a silently empty table (FR-070, FR-071); satisfies PAR104, PAR105

**Checkpoint**: US1 is independently shippable — the list works end to end without the Sheet or the detail.

---

## Phase 4: User Story 2 — Register a member by hand (Priority: P1)

**Goal**: An HQ operator resolves a member by number or by name/kana/phone/email and registers them, with the duplicate case caught before submit.

**Independent test**: Open 手動登録, resolve a member both ways, confirm the identity card, register, see the toast and the new row. Reopen and resolve the same member — the Sheet blocks before submit.

- [x] T023 [US2] Update `src/app/(private)/members/blacklist/_schemas/register-blacklist-form.schema.ts`: single required reason (mapped to a one-element `reasonCategories` array on submit), optional memo ≤2000, and a resolved-member field that gates submission.
- [x] T024 [US2] Check whether `@/components/common/searchable-select` exposes a slot-based item renderer; if not, extend it minimally to accept one (research §8). Do not fork it.
- [x] T025 [US2] Rewrite `src/app/(private)/members/blacklist/_components/blacklist-register-sheet.tsx` — Sheet shell (right, `w-[480px] sm:max-w-[480px]`, `p-0 gap-0`, bordered header 「ブラックリスト手動登録」 with sr-only description, scrollable body, full reset on close) — port from `blacklist-list.tsx` › Sheet (L569-L595, L764-L785); satisfies PAR039-PAR042, PAR064
- [x] T026 [US2] Implement the 会員番号 autofill field inside that Sheet: `RequiredMark`, placeholder 例：M-00001, success border when resolved, destructive border plus 「該当する会員が見つかりません」 when not, idle hint 「会員番号を入力すると氏名・生年月日・顔写真が自動反映されます」, and clearing the field clearing the resolved member — port from `blacklist-list.tsx` › 会員番号 block (L597-L623), `handleMemberIdInput` (L265-L284); satisfies PAR043-PAR047
- [x] T027 [US2] Implement the member combobox on `SearchableSelect` against `GET /crm/members` with `match_mode=prefix`: label 「または氏名・カナ・電話番号で検索」, trigger placeholder 「ID・氏名・カナ・電話番号・メールで検索」, `w-[400px]` popover, rows of avatar + name + muted `{id} ・ {kana} ・ {store}`, empty text 「該当する会員が見つかりません」, and selection filling the number field. Matching is **server-side and prefix-based** — do not reproduce V0's client-side `.includes()` (FR-038a) — port from `blacklist-list.tsx` › combobox (L625-L692), `filteredMembers` (L252-L262); satisfies PAR048-PAR057
- [x] T028 [US2] Implement the resolved-member identity card (`border-success/30 bg-success/10 p-3`, `size-20` photo, `UserCheck` icon, name, kana, 生年月日, mono 「ID: … / 店舗名」) and the already-blacklisted block: when the resolved member's `has_blacklist` is true, say so and keep 登録 disabled (FR-050a) — port from `blacklist-list.tsx` › identity card (L694-L711); satisfies PAR057a, PAR058, PAR065
- [x] T029 [US2] Implement the Sheet's 登録理由 select (迷惑行為 / 未納金 / 不正利用 / その他 — **no** 設備破損), the optional メモ textarea with `OptionalMark`, the full-bleed separator, and the warning alert 「ブラックリストに登録された会員の個人情報は削除できなくなります」 — port from `blacklist-list.tsx` › reason/memo/alert (L714-L759); satisfies PAR059-PAR063
- [x] T030 [US2] Wire submission: post `{ reasonCategories: [reason], memo }` to `POST /crm/members/{memberId}/blacklist`, show 「ブラックリストに登録しました」, close and reset the Sheet, invalidate the list query; surface the server's message on 409 duplicate and 404 member-not-found — port from `blacklist-list.tsx` › `handleRegister` (L286-L295); satisfies PAR066-PAR068
- [x] T031 [P] [US2] Add the 手動登録 header action (primary Button, `size-4` Plus icon) to `src/app/(private)/members/blacklist/page.tsx` opening the Sheet — port from `blacklist-list.tsx` › PageHeader actions (L375-L378); satisfies PAR006

**Checkpoint**: registration works from the list screen; US1 remains unaffected.

---

## Phase 5: User Story 3 — Read one entry and release it (Priority: P2)

**Goal**: An HQ operator reads an entry's full context and releases it, returning to a list where it is no longer present.

**Independent test**: Open an entry from the list, read both cards and the status card, release it, land back on the list without it, then reopen it by URL and see it rendered as released with no release action.

- [x] T032 [US3] Delete `src/app/(private)/members/blacklist/[id]/_components/blacklist-match-conditions.tsx` and every reference to it — the 照合条件 card is not built (Q-02).
- [x] T033 [US3] Rewrite `src/app/(private)/members/blacklist/[id]/page.tsx`: shell, `BackLink` 「ブラックリスト管理に戻る」, title = member name, mono member-ID badge + dot-prefixed source badge, the shared member head-up card (ID / 旧No / 所属 / kana / member-type + 主契約 badges, 会員詳細を開く action), and the 60/40 two-column layout with a `sticky top-0` right column — port from `blacklist-detail.tsx` › `BlacklistDetail` (L71-L115, L228-L230); satisfies PAR069-PAR080, PAR110, PAR111
- [x] T034 [P] [US3] Rewrite `src/app/(private)/members/blacklist/[id]/_components/blacklist-detail-info.tsx` — the 登録情報 card, two-column grid: 登録理由 (source badge), 登録日時, 登録者 (`registeredBy.displayName`), and メモ spanning both columns fed from **`reason`** (the v0.4 memo field, not 登録理由) — port from `blacklist-detail.tsx` › 登録情報 (L117-L143); satisfies PAR081-PAR086
- [x] T035 [P] [US3] Update `src/app/(private)/members/blacklist/[id]/_components/blacklist-unpaid-card.tsx` to the new field path — `text-2xl font-bold` amount, destructive with a 未収 badge when > 0, muted with no badge when 0 — port from `blacklist-detail.tsx` › 未納金 (L209-L225); satisfies PAR090-PAR092
- [x] T036 [US3] Create `src/app/(private)/members/blacklist/[id]/_components/blacklist-release-action.tsx` — `StatusCard` toned by `source` with the `ShieldBan` icon, source label and 「登録日: …」 meta, plus a `RoleGatedButton` (Headquarter/System, deny tooltip 「ブラックリスト解除は本部のみ操作できます」) and the `AlertDialog` 「ブラックリストから解除しますか？」 / 「{name} さんをブラックリストから解除します。解除後、再入会が可能になります。」 with キャンセル / 解除する — port from `blacklist-detail.tsx` › StatusCard + AlertDialog (L231-L247, L254-L275); satisfies PAR093-PAR101, PAR103
- [x] T037 [US3] Wire the release call: `PATCH /crm/blacklist/{id}/active` with `{ isActive: false }`, toast 「ブラックリストから解除しました」, then **navigate back to the blacklist list** (FR-064a, Q-11) with the list query invalidated; surface the server's message on 409 already-released — port from `blacklist-detail.tsx` › `onClick` (L265-L270); satisfies PAR102, PAR102a
- [x] T038 [US3] Implement the **released-entry** detail rendering (FR-069b): when `isActive` is false, the status card reflects the released state instead of repeating the source as though active, the release timestamp and releasing staff are shown, and no release action is offered. V0 has no counterpart — it renders one active entry from a constant; satisfies PAR108, PAR108a
- [x] T039 [P] [US3] Update `src/app/(private)/members/blacklist/[id]/_components/blacklist-detail-skeleton.tsx` to two cards, and add the detail error / not-found surface (FR-069, FR-071); satisfies PAR106, PAR107

**Checkpoint**: all three stories work; the feature is functionally complete.

---

## Phase 6: Polish & Cross-Cutting

- [x] T040 [P] Update `src/app/(private)/members/[id]/_components/blacklist-dialog.tsx` to post `{ reasonCategories: [reason], memo }` (was `{ reason, memo }`) at L115. **Visible behaviour must not change** — one required reason select, one optional memo, same copy, same role gating (FR-074).
- [x] T041 Verify no survivor of the old shape: `git grep -nE "registrationSource|manualReason|matchConditions|postCrmBlacklist|BlacklistManualReason|BlacklistRegistrationSource" -- src/` must return nothing (FR-073, FR-075, plan step 7).
- [x] T042 Run `npx tsc --noEmit` and `npm run lint`; fix everything they report.
- [x] T043 Work through [quickstart.md](./quickstart.md) end to end, including the deliberately awkward checks — the page-2 search (proves server-side evaluation), the mid-word combobox fragment (proves prefix matching), and the released entry reached by URL (the only route to FR-069b).
- [x] T044 Tick every item in [checklists/parity.md](./checklists/parity.md) that the built screens satisfy. `/speckit.implement` will not report done while any item is unchecked.
- [x] T045 **Delete `specs/blacklist-management/`** — the pre-contract spec for this same FR-015, superseded by this feature and stale on four axes (spec § Assumptions, decision 2026-08-07). This deletion belongs in the same merge request as the implementation.

---

## Execution Notes (deviations from the written order)

Two things ran differently from the order above, both recorded rather than silently absorbed:

1. **T004 ran after T005–T014, not before.** The written order put the client regeneration first, but `registerRoute` declarations live inside the route files and the handlers need the table — so schemas → table/seeds → routes → regenerate is the only order that compiles. The barrier itself held exactly as planned: no screen work started until the client existed.
2. **T008 kept `types/member-blacklist.type.ts` instead of deleting it.** Every other table in `_mock-db` has a matching `types/*.type.ts`; deleting this one would have made the blacklist the only exception. The file was rewritten to the v0.4 shape.

Two further corrections surfaced during implementation and are recorded in [research.md](./research.md) §9 and below:

3. **Schema casing is snake_case, not camelCase.** research §9 originally called for camelCase "to match the contract". That was wrong — `leave.schema.ts` (built against a camelCase live contract) and every other mock schema use snake_case. Following the draft would have made this the only mock endpoint with its own convention. §9 is corrected in place.
4. **`MemberHeadupCard` was promoted to `src/components/common/`.** Its own docstring instructed exactly this once a second screen used it, and the blacklist detail is that screen. A-03's local copy of `memberTypeLabel` moved to the shared members constants at the same time, so both callers resolve the enum through one helper. A-03 was regression-tested afterwards.

## Dependencies & Execution Order

```
Phase 1 (T001-T003)  ── contract
        │
Phase 2 (T004-T014)  ── HARD BARRIER: T004 regenerates the client
        │              nothing below compiles before it
        ├──────────────┬──────────────┐
Phase 3 (US1)    Phase 4 (US2)   Phase 5 (US3)
T015-T022        T023-T031       T032-T039
        └──────────────┴──────────────┘
                       │
              Phase 6 (T040-T045)
```

**Story dependencies**:

- **US1** depends only on Phase 2. It is the MVP — shippable alone.
- **US2** depends on Phase 2 and on T021 (it mounts its trigger on the list page via T031). Otherwise independent of US1's table work.
- **US3** depends only on Phase 2. It can be built in parallel with US1 and US2 — it shares no file with either.

**Within Phase 2**: T005 → T006 → T007/T008 (the table must exist before the old one is unwired); T004 must precede everything that imports generated types. T010–T014 are parallel once T005–T009 land.

**Ordering trap**: T031 edits `page.tsx`, which T021 rewrites. Run T021 first, or merge T031 into it.

---

## Parallel Execution Examples

**Phase 2, after T009**:

```
T010  GET /crm/blacklist
T011  GET /crm/blacklist/[id]        [P]
T012  PATCH /crm/blacklist/[id]/active [P]
T013  POST /crm/members/[id]/blacklist [P]
T014  member-list prefix matching      [P]
```

**Across stories, after Phase 2** — three developers, no file contention:

```
Dev A → US1: T015-T022   (list)
Dev B → US2: T023-T030   (Sheet)   … T031 after T021
Dev C → US3: T032-T039   (detail)
```

**Within US3**:

```
T034  detail-info card       [P]
T035  unpaid card            [P]
T039  skeleton + error       [P]
```

---

## Parity Coverage

All **111 active** parity items are claimed. The 4 struck items (PAR027 照合結果 cell, PAR087-PAR089 照合条件 card) are deliberately unbuilt per Q-01 and Q-02 and have no task.

| Range                                 | Task(s) |
| ------------------------------------- | ------- |
| PAR001-PAR005                         | T021    |
| PAR006                                | T031    |
| PAR007-PAR013, PAR013a                | T018    |
| PAR014-PAR017                         | T021    |
| PAR018-PAR023, PAR025, PAR026, PAR028 | T020    |
| PAR024                                | T019    |
| PAR029-PAR038                         | T021    |
| PAR039-PAR042                         | T025    |
| PAR043-PAR047                         | T026    |
| PAR048-PAR057                         | T027    |
| PAR057a, PAR058                       | T028    |
| PAR059-PAR063                         | T029    |
| PAR064                                | T025    |
| PAR065                                | T028    |
| PAR066-PAR068                         | T030    |
| PAR069-PAR080                         | T033    |
| PAR081-PAR086                         | T034    |
| PAR090-PAR092                         | T035    |
| PAR093-PAR101, PAR103                 | T036    |
| PAR102, PAR102a                       | T037    |
| PAR104, PAR105                        | T022    |
| PAR106, PAR107                        | T039    |
| PAR108, PAR108a                       | T038    |
| PAR109                                | T020    |
| PAR110, PAR111                        | T033    |

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1)** — T001-T022. That delivers the cross-store audit list the screen exists for (A-01 L265), which is the only part with no substitute elsewhere in the CRM.

**Increment 2 = US2** (T023-T031, plus T040) — manual registration. Note that HQ can already register from the member detail today, so this is a convenience surface rather than a new capability; T040 must land with it so both callers speak the same contract.

**Increment 3 = US3** (T032-T039) — detail and release. Release is genuinely new: no route to un-blacklist a member exists on `dev` at all.

**Always last**: Phase 6. T041 and T045 in particular are what stop the old contract and the superseded spec from surviving the merge.
