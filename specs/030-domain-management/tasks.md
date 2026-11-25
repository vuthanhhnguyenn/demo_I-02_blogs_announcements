# Tasks: Y-14 Domain Master Management

**Input**: Design documents from `/specs/030-domain-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (5), quickstart.md, checklists/parity.md (45 items + 3 deferred)

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

**V0 source** (ground truth for UI tasks): `.cache/fitness-crm-ui/src/pages/domain-list.tsx` (@6bc1f1c, 2026-09-08)

**No test tasks**: project constitution forbids automated tests — QA is `tsc --noEmit` and ESLint. Live/manual verification is explicitly **out of scope for this round** (see note below) rather than a task here.

**⚠️ 2026-09-09 verification note**: per explicit user instruction, this round's task list does **not** include an agent-executed manual-verification or browser-driven QA step. The app's login now goes through real AWS Cognito / Google SSO instead of the mock-credential flow this feature was originally verified against, so an agent cannot complete that login non-interactively. The user will verify the built screen themselves after implementation; `/speckit.implement`'s mandatory `verify-parity` hook is expected to fail or be skipped at the login step for the same reason (see `plan.md`'s Constitution Check deviation note) — that is expected, not a task failure to chase.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- UI tasks cite their V0 source range and the `PAR###` parity items they satisfy

---

## Phase 1: Setup — ✅ COMPLETE (2026-08-18)

**Purpose**: Access-control groundwork for the route (no project init needed — existing app)

- [x] T001 Added `Permission.DomainsView` / `DomainsCreate` / `DomainsEdit` / `DomainsDelete` to `src/types/permission.type.ts`; registered `PAGE_PERMISSIONS['/domains']` and `ROLE_PERMISSIONS[Headquarter]` in `src/constants/permission.constants.ts` — research R7, spec.md 権限マトリクス. **Unchanged this round** — verified still correct during 2026-09-09 planning.

---

## Phase 2: Foundational — ✅ COMPLETE (2026-08-18)

**Purpose**: Mock API contract + data + generated client — every user story consumes these

- [x] T002 Created `src/app/api/_schemas/domain.schema.ts` (all schemas incl. `authProvider`, `staffCount`, `linkedStaff`, `createdBy`/`createdAt`, `DeleteDomainBlockedResponseSchema`) — data-model.md §1-9, research R1/R2/R3
- [x] T003 Created `src/app/api/_mock-db/seeds/domain.seed.ts` — 5 rows (`D-001`…`D-005`), staff-linkage-exercising and zero-staff cases both present
- [x] T004 Created `src/app/api/_mock-db/tables/domain.table.ts` — `createDomainTables(getDb)`, `staffLinkage()`, `list/create/update/remove` with duplicate + 409-staff-block logic
- [x] T005 Wired `domains` into `_create-db.ts` / `_db.types.ts`
- [x] T006 [P] Added `src/app/api/crm/domains/route.ts` (`GET`/`POST`)
- [x] T007 [P] Added `src/app/api/crm/domains/[id]/route.ts` (`GET`/`PATCH`/`DELETE`, 409 includes `staffCount`)
- [x] T008 Regenerated API client — `getCrmDomainsOptions`, `postCrmDomainsMutation`, `getCrmDomainsByIdOptions`, `patchCrmDomainsByIdMutation`, `deleteCrmDomainsByIdMutation`, `DomainAuthMethod`/`DomainListItem`/`DomainDetail` types
- [x] T009 [P] Added `src/app/(private)/domains/_constants/domain.constants.ts` — `DOMAIN_AUTH_METHOD_LABELS`, `DOMAIN_PAGE_SIZE_OPTIONS`, `DOMAIN_DEFAULT_PAGE_SIZE`

**Unchanged this round** — verified during 2026-09-09 planning that the schema/mock-db/client already implement the full current spec (including `authProvider`/`staffCount`/`linkedStaff`); no regeneration needed (research R9).

---

## Phase 3-6: User Stories 1-4, first pass — ✅ COMPLETE (2026-08-18)

- [x] T010-T014 [US1] List/search/pagination (`use-domain-filters.ts`, `page.tsx` shell, `domain-table-columns.tsx`, toolbar/banner/table/pagination, 認証方式 filter hook wiring)
- [x] T015-T017 [US2] Register (`domain-form.schema.ts`, `domain-form-dialog.tsx` create mode, wiring + mutation)
- [x] T018-T020 [US3] Edit + linked staff (detail fetch, edit-mode fields, row-action wiring)
- [x] T021-T022 [US4] Delete (`domain-delete-dialog.tsx`, row-action wiring)
- [x] T023 [P] Sidebar entry + route registration
- [x] T024 Type-check + lint
- [x] T025 Manual verification walk (performed under the mock-login flow that existed at the time)
- [x] T026 Verified FR-015/Phase-2 absence
- [x] T027 Ticked parity.md (against the then-current, since-superseded V0 draft @7e9618b)

**Superseded this round**: T014 (認証方式 filter), the `authProvider` column in T012, and the `authProvider` field in T016 were built, then **commented out** shortly after (pending `qa-authprovider.md`, see `research.md` R9) — they are re-enabled below, not rebuilt from scratch. T018's linked-staff/creator display was folded into the edit Dialog; it is now extracted into a dedicated read-only Sheet (research R4 amendment) to match the refreshed V0.

---

## Phase 7: User Story 1 — View and search the domain allowlist — update (2026-09-09)

**Goal**: Re-enable the 認証方式 column and filter that already exist in code but are hidden, and align "名前"→"管理名" terminology with `spec.md`/the refreshed V0

**Independent Test**: Open `/domains` → 管理名 column header (not 名前); 認証方式 Badge column present; 認証方式 select filter next to search narrows the list and shows an active-filter highlight; filter-result banner summarizes both an active search and an active auth filter together

### Implementation for User Story 1

- [x] T028 [P] [US1] In `src/app/(private)/domains/_components/domain-table-columns.tsx`: uncomment the 認証方式 Badge column (delete the `// import { Badge }` / `// DOMAIN_AUTH_METHOD_LABELS` comment-outs along with it); rename the `name` column's header from "名前" to "管理名"; add `text-right` to the スタッフ数 cell's `className` (currently missing right-alignment vs. V0) — port from domain-list.tsx › column defs (L364-370, L400, L402-405); satisfies PAR007, PAR009, PAR011, PAR012
- [x] T029 [US1] In `src/app/(private)/domains/page.tsx`: uncomment the 認証方式 `Select` filter block and its imports, wiring `value`/`onValueChange` to `useDomainFilters()`'s already-implemented `authProvider`/`setAuthProvider` (no hook change — `use-domain-filters.ts` already returns them, per `research.md` R9); uncomment the `filterSummary` array's auth-label line so the `FilterResultBanner` joins both parts; rename the search input's placeholder from "ID / 名前 / ドメインで検索..." to "ID / 管理名 / ドメインで検索..." — port from domain-list.tsx › toolbar (L326-350, L194-199); satisfies PAR004, PAR005, PAR006 — depends on T028 (avoid touching the same column-header text from two places at once; otherwise file-independent)

**Checkpoint**: US1 fully matches the refreshed V0 for list/search/filter

---

## Phase 8: User Story 2 — Register a new domain — update (2026-09-09)

**Goal**: Re-enable the required 認証方式 field in the create/edit form, and align copy/labels/placeholders with the refreshed V0

**Independent Test**: "ドメインを追加" → dialog description reads the new CRM-access-focused copy; 管理名 field (not 名前) shows its helper text; 認証方式 select is required — the save button stays disabled until all three fields (管理名/ドメイン/認証方式) are filled

### Implementation for User Story 2

- [x] T030 [US2] In `src/app/(private)/domains/_components/domain-form-dialog.tsx`: uncomment the 認証方式 `Select` field (and its imports/options built from `DOMAIN_AUTH_METHOD_LABELS`) and its helper text "このドメインのスタッフのCRM認証経路。Google Workspace保有企業はGoogle SSO、非保有企業はIDaaSを選択"; remove the `DEFAULT_AUTH_PROVIDER` fallback and its usage in `formValues` (create mode now starts with `authProvider: undefined`, matching the select's own "選択してください" placeholder — the RHF `values` prop already re-syncs correctly since this is the same live-values pattern used for edit mode, no new pitfall); rename the "名前" field label to "管理名" and add its helper text "ドメインに対応する管理用の名称。一覧での行識別と削除前の確認に使います"; update placeholders to "例: 株式会社ダフトクラフト" (管理名) / "例: daftcraft.co.jp" (ドメイン); update the create-mode `DialogDescription` copy to "CRMへのアクセスを許可するドメインと、そのドメインのスタッフに適用する認証方式を登録します。" — port from domain-list.tsx › Dialog body (L652-705); satisfies PAR032, PAR033, PAR035, PAR037 (the disabled-save condition already includes `!form.formState.isValid`, which now correctly requires `authProvider` since the schema already mandates it — no separate logic change needed)

**Checkpoint**: US2's register flow requires and persists 認証方式; US3 (below) builds on this same dialog for edit mode

---

## Phase 9: User Story 3 — Edit a domain and review its linked staff — update (2026-09-09)

**Goal**: Restore the auth-method-change confirmation with the exact V0 copy (naming the affected staff count), and split the read-only detail view (creator/created-at, linked-staff list) out of the edit Dialog into its own Sheet opened by clicking a row

**Independent Test**: Click a row → read-only Sheet opens showing ID/管理名/ドメイン/認証方式/スタッフ数/作成者/作成日時 and the 紐づくスタッフ一覧 (each with a status badge); from the Sheet, 編集 opens the edit Dialog containing only 管理名/ドメイン/認証方式 (no duplicated read-only block); changing 認証方式 and saving shows a confirmation naming the domain, the old→new method, and the exact affected-staff count before committing

### Implementation for User Story 3

- [x] T031 [US3] In `domain-form-dialog.tsx` (same file as T030 — sequential): restore the authentication-method-change confirmation `AlertDialog` (re-add `pendingValues`/`setPendingValues` state; un-comment the `AlertDialog` import and JSX), rewriting its copy to match V0 exactly — title "認証方式を変更しますか？", description "「{name}（{domain}）」の認証方式を {現在の認証方式ラベル} から {変更後の認証方式ラベル} に変更します。このドメインに紐づくスタッフ{n}名の認証経路は、次回ログインから変更されます。" using the already-fetched `detail.staffCount` (no new query), footer "キャンセル"/"変更して保存"; trigger it from `handleFormSubmit` only when `mode === 'edit' && values.authProvider !== detail?.authProvider` (duplicate-domain check still takes precedence, matching V0's `handleSave` ordering) — port from domain-list.tsx › `authChangeConfirmOpen` `AlertDialog` (L724-741); satisfies PAR038, PAR039, PAR040, PAR041 — depends on T030
- [x] T032 [P] [US3] Create `src/app/(private)/domains/_components/domain-detail-sheet.tsx` — read-only `Sheet`, props `{ domain: DomainListItem | null; onOpenChange; onEditClick; onDeleteClick }`; fetches `getCrmDomainsByIdOptions({ path: { id: domain?.id ?? '' } })` (enabled only while open); renders: `SheetTitle` with a `Globe` icon, the domain's 管理名, and an outline Badge for 認証方式; a 2-column info grid (ID, 管理名, ドメイン (full width, monospace), 認証方式, スタッフ数, 作成者, 作成日時 via `formatDateYYYYMMDD_HHMM`); a `Separator`; a "紐づくスタッフ" section with a count Badge, an empty-copy fallback "このドメインに紐づくスタッフはいません", and bordered rows (name/email, id, position-equivalent, status badge) for each linked staff member; a footer with outline-destructive "削除" (`onDeleteClick`) and outline "編集" (`onEditClick`), both role-gated to `Headquarter`/`System` via `RoleGatedButton` — port from domain-list.tsx › detail `Sheet` (L524-645); satisfies PAR024, PAR025, PAR026, PAR027, PAR028, PAR029, PAR030
- [x] T033 [US3] In `page.tsx`: add `detailTargetId` state; pass `onRowClick={(row) => setDetailTargetId(row.id)}` to `DataTable` (existing prop, already used by sibling screens — no `DataTable` change needed); find the row for `detailTargetId` from the already-loaded `items` and render the new `DomainDetailSheet`, wiring its `onEditClick`/`onDeleteClick` into the existing `setFormState`/`setDeleteState` handlers (reuse — do not duplicate dialog-opening logic); remove the folded-in 作成者/作成日時/紐づくスタッフ一覧 block from `domain-form-dialog.tsx`'s edit mode (now redundant with the Sheet) — port from domain-list.tsx › `setDetailTargetId` row `onClick` (L398) and Sheet wiring (L621-643); satisfies PAR014 — depends on T032, T031 (removes content T031's file still renders until this task runs)

**Checkpoint**: US1-US3 — full view/create/edit/detail lifecycle matching the refreshed V0 (independently testable)

---

## Phase 10: User Story 4 — Delete a domain safely — update (2026-09-09)

**Goal**: Match the refreshed V0's delete-confirmation copy and make the staff-linkage block proactive (from the row's own `staffCount`) instead of reactive (waiting for a 409), with a proper warning `Alert`

**Independent Test**: Delete a 0-staff domain → succeeds, and closes the detail Sheet if it was open for that row; delete a domain with linked staff (via the row menu or the Sheet) → a warning Alert states the exact count and the "削除する" button itself is disabled with that reason from the moment the dialog opens, not only after a failed attempt

### Implementation for User Story 4

- [x] T034 [US4] In `domain-delete-dialog.tsx`: change the `DomainDeleteDialog` props to also compute (or accept) the domain's own `staffCount` from the already-loaded `DomainListItem` (no new query); fix the description copy to "「{name}（{domain}）」を削除します。削除後、このドメインのメールアドレスではCRMにログインできなくなります。この操作は取り消せません。"; replace the plain destructive-text paragraph with a warning `Alert` (`AlertTriangle` icon, warning styling) shown whenever `staffCount > 0`, text "このドメインには {n} 名のスタッフが紐づいています。削除すると全員がログインできなくなるため、先にスタッフ管理で該当スタッフの所属変更または無効化を行ってください。"; disable the "削除する" `AlertDialogAction` proactively whenever `staffCount > 0` (in addition to the existing `isSubmitting` guard), carrying a tooltip/reason "紐づくスタッフが{n}名いるため削除できません。先にスタッフの所属変更または無効化を行ってください" — keep the existing `blockedStaffCount`/409 handling in `page.tsx` as a race-condition fallback (spec.md Edge Cases: staff can be linked after the dialog opens but before confirm) — port from domain-list.tsx › delete `AlertDialog` (L744-780); satisfies PAR043, PAR044, PAR045
- [x] T035 [US4] In `page.tsx`'s `deleteMutation.onSuccess`: also clear `detailTargetId` when it matches the just-deleted domain's id, so the detail Sheet (T033) closes automatically if it was open for the deleted row — port from domain-list.tsx › `handleDelete` (L278-283) — depends on T033, T034

**Checkpoint**: All 4 in-scope user stories match the refreshed V0 (US5/FR-015 intentionally still not built — research R5)

---

## Phase 11: Polish & Cross-Cutting Concerns

- [x] T036 Run `npm run type-check` and `npm run lint`; fix all findings — depends on T028-T035
- [x] T037 Verify by inspection (still) that `src/app/(private)/domains/**` contains no 状態 column, Badge, or 有効化する/無効化する menu item anywhere (FR-015 / research R5) — confirms PAR900-PAR902's correct disposition (absent, not built) is unaffected by this round's changes
- [x] T038 Walk `checklists/parity.md` against the built (not live-browser-verified — see the verification note above) code and tick every item satisfied by T028-T035 plus every item that was already correct and unchanged (PAR001-PAR003, PAR008, PAR010, PAR013, PAR015-PAR018, PAR019-PAR023, PAR031, PAR034, PAR036, PAR042); leave PAR900-PAR902 unchecked with a note pointing at T037/research R5. This is a structural/code-reading tick-off, not a live-browser confirmation — flag it as such in the checklist note so the user knows a live pass is still theirs to do.

**Not a task this round**: an agent-executed run of `quickstart.md`'s Manual Verification section — see the verification note at the top of this file and `plan.md`'s Constitution Check deviation.

---

## Dependencies & Execution Order

### Phase Dependencies (this round)

- **Phases 1-6**: already complete, unchanged — no action
- **Phase 7 (US1)**: independent of Phases 8-10 (different files) — can start immediately
- **Phase 8 (US2)**: independent of Phase 7 (different file: `domain-form-dialog.tsx` vs. `domain-table-columns.tsx`/`page.tsx`)
- **Phase 9 (US3)**: T031 depends on T030 (same file); T032 is file-independent and can run any time; T033 depends on both T031 and T032, and also touches `page.tsx` (shared with T029 — land T029 first to avoid a merge conflict on the same file, though they touch different regions)
- **Phase 10 (US4)**: T034 is file-independent; T035 depends on T033 (needs `detailTargetId` to exist in `page.tsx`) and T034
- **Phase 11 (Polish)**: after all of Phases 7-10

### Within-phase ordering

- Phase 7: T028 → T029 (T029 depends on T028 only to avoid a simultaneous edit to the same header text; otherwise independent)
- Phase 8: T030 (standalone)
- Phase 9: T030 → T031; T032 (parallel to T030/T031) → T033 (needs both T031 and T032)
- Phase 10: T034 (standalone) → T035 (needs T033 and T034)

### Parallel Opportunities

- T028 (`domain-table-columns.tsx`) ∥ T030 (`domain-form-dialog.tsx`) ∥ T032 (new `domain-detail-sheet.tsx`) ∥ T034 (`domain-delete-dialog.tsx`) — four different files, no shared state
- T029 should land after T028 (same conceptual change, different files) but could technically run in parallel if care is taken not to conflict on the shared `filterSummary`/placeholder review
- T033 and T035 are the only tasks that must run late, since they integrate everything else into `page.tsx`

## Parallel Example: this round

```bash
Task: "Uncomment 認証方式 column + rename 名前→管理名 in domain-table-columns.tsx"   # T028
Task: "Uncomment 認証方式 field + copy/label fixes in domain-form-dialog.tsx"        # T030
Task: "Create domain-detail-sheet.tsx"                                              # T032
Task: "Fix copy/warning/proactive-disable in domain-delete-dialog.tsx"              # T034
```

## Implementation Strategy

This round is a small, fully-scoped delta — no MVP staging needed. Suggested order for a single implementer: T028 → T029 → T030 → T031 → T032 → T033 → T034 → T035 → T036 → T037 → T038. With two developers: split at Phase 7/8 vs. Phase 9/10 (they touch disjoint files until T033), converging for Phase 11.

## Parity coverage map (48 items total: 45 in scope, 3 deferred)

| PAR range                      | Task                                                                |
| ------------------------------ | ------------------------------------------------------------------- |
| PAR001-PAR003                  | Already correct — ticked by T038                                    |
| PAR004-PAR006                  | T029                                                                |
| PAR007, PAR009, PAR011, PAR012 | T028                                                                |
| PAR008, PAR010                 | Already correct — ticked by T038                                    |
| PAR013                         | Already correct — ticked by T038                                    |
| PAR014                         | T033                                                                |
| PAR015-PAR018                  | Already correct — ticked by T038                                    |
| PAR019-PAR023                  | Already correct — ticked by T038                                    |
| PAR024-PAR030                  | T032                                                                |
| PAR031                         | Already correct — ticked by T038                                    |
| PAR032, PAR033, PAR035, PAR037 | T030                                                                |
| PAR034, PAR036                 | Already correct — ticked by T038                                    |
| PAR038-PAR041                  | T031                                                                |
| PAR042                         | Already correct — ticked by T038                                    |
| PAR043-PAR045                  | T034                                                                |
| PAR900-PAR902 (deferred)       | Verified absent by T037 (research R5) — remain unchecked, by design |
