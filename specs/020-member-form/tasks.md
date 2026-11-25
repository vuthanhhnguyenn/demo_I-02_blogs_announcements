# Tasks: Member Form Management (会員情報を編集)

**Input**: Design documents from `/specs/020-member-form/`
**Prerequisites**: plan.md ✔, spec.md ✔ (clarified), research.md ✔, data-model.md ✔, contracts/member-update.md ✔, checklists/parity.md ✔ (79 items — every PAR item is claimed by a task below)

**Organization**: Tasks are grouped by user story. This is a **rework** of the existing `/members/[id]/edit` screen (plan.md Delta Map D1–D13) — no project scaffolding is needed. Per the constitution's **No Testing Policy**, there are no test tasks; verification is `quickstart.md` + `checklists/parity.md`.

**V0 source**: `.cache/fitness-crm-ui/src/pages/member-form.tsx` @ `426a9b3` (all `port from` line refs below point into this file unless another file is named).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (save happy path), US2 (validation), US3 (unsaved-changes guard), US4 (permissions)

---

## Phase 1: Setup

**Purpose**: Confirm a green baseline so every later diff is attributable to this feature.

- [x] T001 Run `npm test && npm run lint` on branch `020-member-form` and confirm both pass before any edit (record baseline; fix nothing yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Enum + schema ground that US1 and US2 both build on. No user story work before this phase completes.

- [x] T002 Extend `GenderSchema` from `z.enum(['male','female','other'])` to `z.enum(['male','female','other','no_answer'])` in `src/app/api/_schemas/member.schema.ts` (research R2; contracts/member-update.md §3)
- [x] T003 [P] Surgical edit: add `NO_ANSWER: 'no_answer'` to the `Gender` const in `src/lib/api/types.gen.ts` (~L7663) with a one-line comment referencing plan.md Complexity Tracking (do NOT regenerate the client)
- [x] T004 [P] Update mock-DB seeds so at least one member has `gender: 'no_answer'` in `src/app/api/_mock-db/` (seed data for members) for manual round-trip verification (contracts/member-update.md §3)
- [x] T005 Rewrite `src/app/(private)/members/_schemas/member-form.schema.ts`: keep exactly the 10 fields of data-model.md `MemberFormValues`; blank-only (trimmed) validation on the 8 required fields with the verbatim messages of FR-016 (「氏名（姓）を入力してください」…「メールアドレスを入力してください」, 「性別を選択してください」); 郵便番号/住所 unvalidated; delete kana/phone/postal/email format regexes, max-50 caps, and the `emergency_contact_*`, `join_date`, `join_route`, `referrer_member_id`, `member_photo_url`, `notes` fields; gender typed to the 4-value `Gender`; add a `GENDER_OPTIONS` label map (男性/女性/その他/回答しない → male/female/other/no_answer); update `emptyMemberFormValues` (research R1/R2/R7); satisfies PAR041, PAR042, PAR043, PAR044, PAR045, PAR046, PAR047, PAR048, PAR049, PAR050

**Checkpoint**: Types compile (`npm test`), schema exports the new shape — user stories can begin.

---

## Phase 3: User Story 1 — Headquarters corrects a member's personal information (Priority: P1) 🎯 MVP

**Goal**: Prototype-parity form (1 card 「個人情報」, 10 inputs) that loads the member, saves `basic_info` only, toasts 「会員情報を更新しました」 and lands on the member detail.

**Independent Test**: quickstart.md §1 + §5 — edit 電話番号 as HQ, save, verify toast + detail shows the new value; 性別=回答しない round-trips; broken id shows the error state.

- [x] T006 [US1] Rework `src/app/(private)/members/_components/members-form.tsx` (part 1): delete the 基本情報/連絡先/契約情報/備考 cards and rebuild a single Card 「個人情報」 (CardTitle `text-base font-semibold`) with rows 1–2 — 氏名（姓/名） and フリガナ（姓/名） as 2-column grids, `RequiredMark` on all four labels, placeholders 「例: 山田」「例: 太郎」「例: ヤマダ」「例: タロウ」, per-field label→control→error layout — port from member-form.tsx › MemberForm card (L154-L198) and FormField (L51-L75); satisfies PAR009, PAR010, PAR011, PAR012, PAR013, PAR014, PAR015, PAR016, PAR017, PAR018, PAR019, PAR020, PAR021, PAR022
- [x] T007 [US1] Rework `src/app/(private)/members/_components/members-form.tsx` (part 2): rows 3–6 — 生年月日 (project DatePicker, placeholder 「日付を選択」) / 性別 (Select, placeholder 「選択してください」, exactly 男性/女性/その他/回答しない via `GENDER_OPTIONS`) as a 2-column grid; 郵便番号 full row with `w-[200px]` input, placeholder 「例: 150-0001」, no marker; 住所 full row, placeholder 「例: 東京都渋谷区神宮前1-1-1」, no marker; 電話番号 / メールアドレス (`type="email"`) 2-column grid with `RequiredMark`, placeholders 「例: 090-1234-5678」「例: yamada@example.com」 — port from member-form.tsx › rows (L201-L262); satisfies PAR023, PAR024, PAR025, PAR026, PAR027, PAR028, PAR029, PAR030, PAR031, PAR032, PAR033, PAR034
- [x] T008 [P] [US1] Rework the header of `src/app/(private)/members/[id]/edit/page.tsx`: replace BreadcrumbNav + 「会員編集」 with `BackLink` 「会員管理に戻る」 (→ `/members`; guard wiring lands in T017) + page title 「会員情報を編集」, rendered above the scrollable form area inside the standard private-layout shell — port from member-form.tsx › PageHeader block (L138-L152); satisfies PAR001, PAR002, PAR003, PAR004, PAR005, PAR006, PAR007, PAR008
- [x] T009 [US1] Replace the fixed bottom bar in `src/app/(private)/members/[id]/edit/page.tsx` with the inline footer row at the end of the form column: `border-t`, right-aligned 「キャンセル」 (outline, size lg) + 「保存する」 (primary, size lg, **always enabled** — remove the `!isDirty` disable per plan D7); reserve the left slot for the US2 summary — port from member-form.tsx › footer (L268-L278); satisfies PAR035, PAR036, PAR037
- [x] T010 [US1] Rework load/save mapping in `src/app/(private)/members/[id]/edit/page.tsx`: `mapMemberDetailToFormValues` trimmed to the 10 form fields (address = join of `prefecture/city/streetAddress/building` non-empty parts; gender passes `no_answer` through); submit sends **only** `basic_info` `{name_kanji, name_kana, gender, birthday, postal_code (normalized, omit blank), address (omit blank), phone, email}` — delete `profile_info`, `emergency_contact`, `notes` from the payload; on success keep toast 「会員情報を更新しました」, keep query invalidation (detail + list), navigate to `/members/[id]` (contracts/member-update.md §1–§2; research R5); satisfies PAR057, PAR058, PAR059, PAR060
- [x] T011 [US1] Verify and keep the load/save failure states in `src/app/(private)/members/[id]/edit/page.tsx` after the rework: `DataStateBoundary` for loading (no partial render) and fetch error with retry; save failure → toast 「会員情報の更新に失敗しました」, stay on form, values intact (FR-029/030/031); satisfies PAR075, PAR076, PAR077

**Checkpoint**: US1 independently verifiable via quickstart §1 + §5. This is the MVP.

---

## Phase 4: User Story 2 — The form blocks incomplete submissions (Priority: P1)

**Goal**: Submit-only validation with prototype-verbatim behaviour: inline messages, footer summary, scroll-to-first-error, clear-on-change.

**Independent Test**: quickstart.md §2 — clear three required fields, submit, verify the three messages + footer summary + scroll; fix one field and verify only its message clears.

- [x] T012 [US2] Wire validation behaviour in `src/app/(private)/members/[id]/edit/page.tsx` + `_components/members-form.tsx`: RHF `zodResolver` with `mode: 'onSubmit'`, `reValidateMode: 'onChange'` so a flagged field clears on entry of a non-blank value (性別/生年月日 clear on selection); `aria-invalid` on every invalid control including the 性別 Select trigger — port behaviour from member-form.tsx › validate/clear handlers (L99-L124, L161-L262); satisfies PAR040, PAR051, PAR053, PAR054, PAR055
- [x] T013 [US2] Add the failed-submit footer summary to the footer row from T009: on invalid submit set a `submitFailed` flag rendering 「未入力の項目があります」 (destructive, `text-xs`, `mr-auto`); hidden until a submit fails; **persists until the next submit re-evaluates it** (does not clear as fields are fixed); a valid submit clears it — port from member-form.tsx › submitError (L112-L127, L269-L271); satisfies PAR038, PAR039, PAR056
- [x] T014 [US2] Wire scroll-to-first-error on failed submit using the existing `src/hooks/use-scroll-to-first-error.ts` as the `handleSubmit` error callback in `src/app/(private)/members/[id]/edit/page.tsx` (smooth, centred, first invalid in DOM order) — port behaviour from member-form.tsx › scrollIntoView (L117-L122); satisfies PAR052

**Checkpoint**: US1 + US2 = complete save/validate loop (quickstart §1–§2).

---

## Phase 5: User Story 3 — Unsaved edits are protected (Priority: P2)

**Goal**: Dirty tracking → discard dialog on cancel/back-link, native prompt on tab close, no prompt after save.

**Independent Test**: quickstart.md §3 — edit → cancel shows the dialog; 編集を続ける keeps edits; 破棄する leaves to the member list; reload prompts; clean form navigates silently.

- [x] T015 [P] [US3] Create `src/hooks/use-unsaved-changes.hook.ts` porting the V0 hook contract (`dirty`, `setDirty`, `confirmDiscard(onConfirm)`, `discardDialogOpen`, `handleDiscardConfirm`, `handleDiscardCancel`, `beforeunload` listener while dirty) — port from `.cache/fitness-crm-ui/src/hooks/use-unsaved-changes.ts` (whole file); satisfies PAR065
- [x] T016 [P] [US3] Create `src/app/(private)/members/_components/member-edit-discard-dialog.tsx`: AlertDialog with title 「変更を破棄しますか？」, description 「未保存の変更はすべて失われます。この操作は取り消せません。」, cancel 「編集を続ける」, action 「破棄する」; dismiss (overlay/Esc) behaves as 編集を続ける; form stays mounted behind it — port from member-form.tsx › AlertDialog (L284-L297); satisfies PAR066, PAR067, PAR068, PAR069, PAR070, PAR071, PAR072
- [x] T017 [US3] Wire the guard in `src/app/(private)/members/[id]/edit/page.tsx`: sync RHF `isDirty` → `setDirty` via effect; 「キャンセル」 and the T008 BackLink call `confirmDiscard(() => router.push('/members'))` (**destination = member list**, plan D5/FR-025); any field change marks dirty; successful save calls `setDirty(false)` **before** navigating so no dialog fires (FR-022); render the T016 dialog; satisfies PAR061, PAR062, PAR063, PAR064

**Checkpoint**: quickstart §3 passes end-to-end.

---

## Phase 6: User Story 4 — Only Headquarter / System can reach the form (Priority: P2)

**Goal**: Page-level guards for direct URL access; entry-point gating verified.

**Independent Test**: quickstart.md §4 — Staff sees no 編集 anywhere and gets permission-denied on the direct URL; HQ on a withdrawn member gets the block screen.

- [x] T018 [US4] Add the page-level role gate to `src/app/(private)/members/[id]/edit/page.tsx`: `useAuthUser().hasRole([UserRole.System, UserRole.Headquarter])` — when false render a permission-denied state (existing empty-state pattern: message + link back to `/members`) before any form mount, checked before/independently of the member fetch (FR-032; research R6); satisfies PAR078
- [x] T019 [US4] Keep and align the withdrawn-member block in `src/app/(private)/members/[id]/edit/page.tsx`: statuses `WITHDRAWN`/`FORCE_WITHDRAWN` → message 「退会済みの会員は編集できません」 + 再入会 guidance line + button returning to `/members/[id]` (FR-033); satisfies PAR079
- [x] T020 [P] [US4] Verify both entry points remain correctly gated after the rework: `src/app/(private)/members/page.tsx` row-menu 編集 and `src/app/(private)/members/[id]/page.tsx` header 編集 render only for `System`/`Headquarter` (RoleGated components) and the detail header hides 編集 for withdrawn members — fix if drifted (FR-026); satisfies PAR073, PAR074

**Checkpoint**: quickstart §4 passes for all six roles.

---

## Phase 7: Polish & Cross-Cutting

- [x] T021 Verify no change-history writes: confirm the mock `updateBasicInfo` path in `src/app/api/_mock-db/` appends nothing to change-history seeds, and a save adds no row to the member detail 変更履歴 tab (FR-028; quickstart §6.1)
- [x] T022 Verify untouched-attribute preservation: after a save, 緊急連絡先 / 備考 / 入会日 / 入会経路 / 紹介者 / 会員写真 / contracts / store are unchanged on the member detail (FR-024; quickstart §6.3); remove now-unused exports (`JOIN_ROUTE_OPTIONS`, unused `_utils` helpers) flagged by lint
- [x] T023 Run `npm test && npm run lint`; fix all new violations (TypeScript strict, no-explicit-any, import order)
- [x] T024 Execute the full [quickstart.md](./quickstart.md) walk (§1–§6) and tick every item in [checklists/parity.md](./checklists/parity.md) (79/79) against the running screen — `/speckit.implement` gates on this

---

## Dependencies

```
T001 (baseline)
  └─► Phase 2: T002 ─► T003[P], T004[P] ; T005 (needs T003 for the Gender type)
        └─► US1: T006 ─► T007 (same file)   T008[P] ─► T009 ─► T010 ─► T011 (same file)
              └─► US2: T012 ─► T013 ─► T014          (builds on US1 form + footer)
                    └─► US3: T015[P], T016[P] ─► T017 (wiring into page)
                          └─► US4: T018 ─► T019 ; T020[P] (page file serial; T020 independent)
                                └─► Polish: T021[P], T022 ─► T023 ─► T024
```

- **Story order**: US1 → US2 → US3 → US4 (US2–US4 all edit `edit/page.tsx`, so they serialize on that file even though they are logically independent; US3/US4 could swap without harm).
- **Parallel opportunities**: T003+T004 after T002; T006–T007 (form file) in parallel with T008 (page header); T015+T016 (new files) in parallel; T020 in parallel with T018/T019; T021 in parallel with T022.

## Implementation Strategy

**MVP = Phase 1 + 2 + US1** (T001–T011): a working prototype-parity edit form that loads, saves correctly-scoped data and lands on the detail. Each later story is an independent increment verified by its quickstart section. Stop-and-ship is possible after any checkpoint.

## Parity coverage check

PAR001–PAR008 → T008 · PAR009–PAR022 → T006 · PAR023–PAR034 → T007 · PAR035–PAR037 → T009 · PAR038–PAR039, PAR056 → T013 · PAR040, PAR051, PAR053–PAR055 → T012 · PAR041–PAR050 → T005 · PAR052 → T014 · PAR057–PAR060 → T010 · PAR061–PAR064 → T017 · PAR065 → T015 · PAR066–PAR072 → T016 · PAR073–PAR074 → T020 · PAR075–PAR077 → T011 · PAR078 → T018 · PAR079 → T019

**All 79 parity items claimed — no orphans.**
