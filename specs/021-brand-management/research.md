# Research: Brand Master Management (Y-07)

This is a **brownfield** planning pass — `src/app/(private)/brands/**` already exists (commits `02586203`, `6b505b4a` on this branch) and was built before `spec.md` and `checklists/parity.md` existed. Phase 0 here is therefore a line-by-line audit of the current implementation against `spec.md`'s FRs/User Stories and `checklists/parity.md`'s PAR items, not a from-scratch technology survey. Findings are grouped by severity; each becomes a task set in `/speckit.tasks`.

## G1 (bug) — `disableFeeGroup` / `deleteFeeGroup` are called but never implemented

- **Decision**: Implement both methods on the `brands` table object in `src/app/api/_mock-db/tables/franchise.table.ts` (this file, despite the misleading name, holds the real Y-07 `brands` table — `src/app/api/_mock-db/tables/brand.table.ts` holds unrelated `positions`/`mainContracts`/`campaigns` tables and does not define `brands` at all).
- **Evidence**: `BrandsType` (`src/app/api/_mock-db/types/brands.type.ts`) declares `disableFeeGroup(code, subBrandCode)` and `deleteFeeGroup(code, subBrandCode)`. Both route handlers (`.../fees/[subBrandCode]/disable/route.ts`, `.../fees/[subBrandCode]/route.ts` `DELETE`) call `db.brands.disableFeeGroup(...)` / `db.brands.deleteFeeGroup(...)`. Neither method exists on the object literal returned by `createFranchiseTables()`. Calling either today throws `TypeError: ... is not a function`, caught by the route's try/catch, returning a 500 — every "無効化" or "削除" click in the Fees tab fails.
- **Rationale**: This is a correctness bug independent of spec/design alignment; FR-011 cannot be satisfied while these throw.
- **Alternatives considered**: None — there is no reasonable interpretation where these should stay unimplemented.

## G2 (bug) — No mutation ever writes to `_changeHistories`

- **Decision**: `update()` (brand rename), `updateFeeGroup()`, and the new `disableFeeGroup()`/`deleteFeeGroup()` (G1) MUST each append one `BrandChangeHistoryItem` per changed field to `this._changeHistories`, using `patch.updated_by` (already accepted by `UpdateBrandFeeGroupRequestSchema`/`UpdateBrandRequestSchema`) or a `'STF-001'` mock fallback as `changed_by`, matching the existing seed-row shape (`changed_at`, `changed_by`, `target_display_name`, `changed_field`, `before_value`, `after_value`).
- **Evidence**: Neither `update()` nor `updateFeeGroup()` in `franchise.table.ts` touches `_changeHistories`; the array is only ever populated once, from `SEED_BRAND_CHANGE_HISTORIES`, at first `_seed()`.
- **Rationale**: FR-013 requires the 変更履歴 tab to reflect "each recorded change" — today it is permanently frozen seed data regardless of what a Headquarter user actually does. `brand.fee_group_count`/`change_history_count` badges (used by the tab-count badges, PAR025/PAR026) already read live array lengths, so once entries are appended the counts update automatically with no further change needed.
- **Alternatives considered**: Skip history recording as "future phase" — rejected; it's explicitly in-scope (FR-013, US4 AS4) and the display code for it already exists and is exercised by seed data, so the gap is purely on the write side.

## G3 (Must-have gap) — Scheduled fee revisions cannot be created, edited, or deleted

- **Decision**: Extend the write path end-to-end:
  1. `UpdateBrandFeeItemSchema` (`src/app/api/_schemas/brand.schema.ts`) gains an optional `scheduled_changes: BrandScheduledFeeChangeInputSchema[]` array (new schema: `effective_start_date` + `value_including_tax_yen`; `registered_at`/`registered_by` are server-set, not client-supplied).
  2. `franchise.table.ts`'s `updateFeeGroup()` replaces each item's `scheduled_changes` with the payload's list (stamping `registered_at`/`registered_by` for any entry that doesn't already exist by `effective_start_date`), instead of silently carrying over the old array untouched.
  3. `brand-fee-group-form.schema.ts` (frontend) gains a nested `feeItems[].scheduledChanges: {effectiveStartDate, valueIncludingTaxYen}[]` array with a `superRefine` rejecting duplicate `effectiveStartDate` values within the same item (US2 AS3 / FR-009).
  4. `BrandFeeGroupEditSheet` gains, per fee item: a `useFieldArray`-backed revision list (date picker + ¥ amount + delete), an "改定スケジュールを追加" button, a past-date warning per revision row (reusing the existing `isPastDate` helper — non-blocking per FR-010), and a "プレビュー（会員向け表示）" block showing the fee item's current display value.
- **Evidence**: `BrandFeeItemSchema` (response) already carries `scheduled_changes`, and `fees-tab.tsx`'s `FeeItemBlock` already _displays_ them (read-only) — but `UpdateBrandFeeItemSchema` (request) has only `item_code`/`item_name`/`current_value_including_tax_yen`/`effective_start_date`; `brand-fee-group-form.schema.ts` and `BrandFeeGroupEditSheet` have no revisions field at all. `parity.md` PAR054-PAR059 describe this UI in full; none of it exists in the current sheet.
- **Rationale**: US2 is the spec's stated Must-have ("the reason the screen exists") and its own AS2/AS3 (add a scheduled revision; reject a duplicate effective date) are currently impossible to perform.
- **Alternatives considered**: Auto-promoting a scheduled revision to "current" when its effective date arrives — spec's own Edge Cases section already assigns this to "a backend/system responsibility, not a user action within this screen," so it is explicitly out of scope here; no cron/date-check logic is added.

## G4 (scope violation) — Brand List "新規登録" (create brand) flow

- **Decision (revised per user direction 2026-07-29 — "out-of-scope implemented features: comment out, do not delete")**: Comment out the create-brand entry point in `src/app/(private)/brands/page.tsx` — the `Plus`/`新規登録` `RoleGatedButton` in the page header, the `sheetMode`'s `'create'` branch, `handleCreateClick`, `createMutation`/`postCrmBrandsMutation` wiring, and `EMPTY_FORM_VALUES`'s create-mode usage — rather than removing it. Leave the commented block in place with a note pointing at this decision (e.g. `// Out of scope for this phase — FR-015 / research.md G4. Commented out, not deleted, pending a future phase.`), so it can be re-enabled with a small diff once brand creation is actually in scope. `BrandFormSheet` itself stays fully active (still needed for the in-scope rename flow), and the `POST /crm/brands` route/mock method are left completely untouched.
- **Evidence**: `spec.md` FR-015 and its Assumptions section explicitly place "registering a wholly new brand ... from scratch" out of scope for this phase, citing both Y-07.md's "将来的なブランド追加はシステム設定カテゴリー内で扱う" note and the V0 mockup's phase-gated affordances. `checklists/parity.md`'s Brand List section (PAR001-PAR010) has no create-brand item at all — the V0 `brand-list.tsx` toolbar only has search; there is no "新規登録" button in the source mockup.
- **Rationale**: The current code was built ahead of (and inconsistent with) the finalized spec/mockup; a working create-brand flow that neither the PO spec nor the V0 design calls for is scope creep that must not be visible/reachable in this phase. Commenting out (instead of deleting) preserves the already-written, previously-merged implementation for a fast follow-up once brand creation re-enters scope, per explicit user direction — no deletion of working code for an out-of-scope feature.

## G5 (parity gap) — Detail page "基本情報を編集" button is fully wired, V0 shows it disabled

- **Decision (revised per user direction 2026-07-29)**: Comment out the working rename wiring on this specific button at `src/app/(private)/brands/[id]/page.tsx:165-176` (its `onClick={() => setSheetOpen(true)}` plus the `BrandFormSheet` instance/`updateMutation` block this page owns for that entry point) rather than deleting it, and replace the live button with a `disabled` `RoleGatedButton` carrying `tooltip="ブランド基本情報の編集は次フェーズで実装予定です"`, matching `PAR028`. The list row's own "編集" action (a separate code path in `brands/page.tsx`) is untouched and remains the one live rename entry point per US3/V0.
- **Evidence**: `parity.md` PAR028: "'基本情報を編集' button — disabled ... tooltip ... (Phase-2-only, hidden in current phase)." Current code instead wires this button to a fully working rename flow, giving Headquarter two live entry points to the same mutation where V0 defines exactly one (the list row). Per `spec.md`'s own Assumptions section, this button is V0's placeholder for a **broader** future basic-info editor (not just the name) — repurposing it for today's name-only rename is itself the scope confusion being corrected here.
- **Rationale**: US3's own verification steps only exercise the list-row edit action; keeping a second, V0-undocumented entry point live is an unreviewed parity deviation. Commenting out (rather than deleting) the wiring keeps the working code ready to graft onto the real future basic-info editor instead of being rewritten from scratch.

## G6 (parity gap) — Fee tab "新規登録" button missing tooltip / wrong disable condition

- **Decision**: In `fees-tab.tsx:354-363`, change `disabled={isEmpty}` to an unconditional `disabled` and add `tooltip="費用マスタの新規登録は次フェーズで実装予定です"`.
- **Evidence**: `parity.md` PAR032 specifies this button is disabled unconditionally (Phase-2-gated), with that exact tooltip copy. Current code only disables it when the fee list is empty, and carries no tooltip at all — so on any brand with at least one fee group, the button renders enabled today.
- **Rationale**: FR-015 places new-fee-entry registration out of scope for this phase, same reasoning as G4.

## G7 (accepted deviation) — Access-denied UX for Trainer/Observer

- **Decision**: Keep the existing app-wide pattern — `'/brands/:id'` is already registered in `PAGE_PERMISSIONS` (`Permission.BrandsView`) and enforced by `canRoleAccessPage` in `src/proxy.ts`, which redirects Trainer/Observer to the shared `/(private)/403` page before the brand detail page ever renders. Do **not** add a second, brand-specific in-page `ShieldAlert` state inside `brands/[id]/page.tsx`.
- **Evidence**: `parity.md` PAR023 describes an in-page state (back link retained, brand-specific copy: "ブランド設定はトレーナー・オブザーバー権限では参照できません。"). Every other role-gated detail page in this codebase (`lockers/[id]`, `training-equipment/[id]`, etc.) relies on the same proxy-level redirect to the generic 403 page rather than a bespoke in-page message — there is no existing per-feature "access denied within the page" component to reuse.
- **Rationale**: FR-004's substance — Trainer/Observer never see brand/fee data — is already fully satisfied by the proxy-level gate (data is never fetched; the page component never mounts). Building a second, feature-specific denial UI purely to match the mockup's copy would duplicate an access-control mechanism the rest of the app deliberately centralizes, which Constitution Principle V (Simplicity & Minimal Dependencies — "no abstraction layers beyond what already exists") weighs against.
- **Alternatives considered**: Add the in-page state to match V0 pixel-for-pixel — rejected as inconsistent with every sibling feature's established pattern; would also require carving out an exception in `src/proxy.ts` for this one route.

## Summary of decisions carried into Phase 1

| #   | Area                  | Action                                                                                                                       |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| G1  | Mock-db               | Implement `disableFeeGroup`/`deleteFeeGroup` (bug fix)                                                                       |
| G2  | Mock-db               | Append change-history rows on every brand/fee mutation (bug fix)                                                             |
| G3  | Schema + mock-db + UI | Add full scheduled-revision CRUD to the fee edit sheet (Must-have gap)                                                       |
| G4  | Frontend              | Comment out (do not delete) brand-list create-brand entry point; render list header without it (scope violation)             |
| G5  | Frontend              | Comment out (do not delete) detail-page "基本情報を編集" rename wiring; render it disabled with Phase-2 tooltip (parity gap) |
| G6  | Frontend              | Fix fee-tab "新規登録" disable condition + tooltip (parity gap)                                                              |
| G7  | —                     | No change — existing proxy-level 403 gate already satisfies FR-004 (accepted deviation from V0's in-page copy)               |
