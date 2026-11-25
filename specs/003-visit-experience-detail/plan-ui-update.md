# Implementation Plan: Visit/Experience Detail — UI Sync Update

**Branch**: `feat/update-ui-logic-visit-experient-list` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md) (see "Revision note (2026-08-12)")
**Scope**: Delta only — closes the gap between the current implementation and the spec's 2026-08-12 revision. This is NOT a from-scratch plan; see [plan.md](./plan.md) for the original build plan and project structure (unchanged). Mirrors the same delta-plan pattern used for the sibling list page (`001-visit-experience-list/plan-ui-update.md`).

---

## Summary

The spec's 2026-08-12 revision (re-sync against `visit-experience-detail.tsx` @ `c1c7e2e` and `C-01.md` @ `260624_v5`) introduced five concrete deltas. Investigation of the current app code shows two of them are already implemented; three require small, self-contained edits, one of which needs a schema/type/seed field addition plus a codegen re-run. No new pages, routes, or dependencies are needed.

---

## Already Implemented (verify only, no code change)

| Spec requirement                                                         | Where                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-019 terminal-state tones (入会申請済=success, キャンセル=destructive) | `_components/status-panel.tsx` `STATUS_CONFIG` — tones are already correct; only the two _labels_ are stale (see Remaining Work T1)                                                                                                                                                              |
| FR-006 入会申請日時/キャンセル日時 conditional fields                    | `_components/reservation-info-card.tsx:48-53`                                                                                                                                                                                                                                                    |
| FR-014 入退館連携情報 card shown for the enrolled state too              | `_components/b01-info-card.tsx` self-gates purely on `record.b01_entry_at` presence (no status check) + `_components/page.tsx` renders it unconditionally; seed record `VE-003` (membership_applied) already has `b01_entry_at`/`b01_exit_at` populated, so this already renders correctly today |
| "B-01" label dropped from staff-facing copy in the permit flow           | `_components/permit-actions.tsx` — "入退館連携状況" row, "入退館管理に時間制限入館を発行します" helper text, and the confirmation dialog description already say "入退館管理" with no "B-01" prefix                                                                                              |

## Remaining Work

1. **Status label rename (FR-005)**
   - File: `src/app/(private)/visit-experiences/[id]/_components/status-panel.tsx`
   - `STATUS_CONFIG.info_missing.label`: `'確認待ち'` → `'申請者への確認待ち'`; `STATUS_CONFIG.bl_checking.label`: `'BL照合中'` → `'BL照合結果あり・確認待ち'`.
   - `src/types/api/visit-experience.type.ts`'s `VISIT_EXPERIENCE_STATUS_LABELS` map already has the correct strings (fixed for the list page in the prior delta) — prefer sourcing `label` from that shared map instead of a second local literal, so this exact drift (two independent copies of the same label, one left behind) cannot recur. Keep `tone`/`icon` local to `STATUS_CONFIG` since the shared map has no tone/icon data.

2. **Status badge tone consistency (FR-019)**
   - File: `src/app/(private)/visit-experiences/[id]/page.tsx:35`
   - `STATUS_BADGE_CLASS.cancelled` is `'bg-muted text-muted-foreground border-border'` (muted) — this is the page-header badge, and it disagrees with `status-panel.tsx`'s ステータス card, which already renders cancelled as destructive. Change to `'bg-destructive/15 text-destructive border-destructive/20'` so both badges on the page agree with FR-005/FR-019.

3. **来店詳細情報: add 店舗 field (FR-006)**
   - File: `src/app/(private)/visit-experiences/[id]/_components/reservation-info-card.tsx`
   - Add `<Field label="店舗" value={record.store_name} />` as the first field, before 来店予定日時. `store_name` already exists on `VisitExperienceDetail` (inherited from the list-level `VisitExperience` type) — no schema/type change needed for this item.

4. **入退館連携情報 panel title (FR-014 / revision item 5)**
   - File: `src/app/(private)/visit-experiences/[id]/_components/b01-info-card.tsx:39`
   - `CardTitle` text: `"B-01 入退館連携情報"` → `"入退館連携情報"`. Component name (`B01InfoCard`) and its file/prop names are internal and unaffected — only the staff-facing label changes, consistent with `permit-actions.tsx`'s existing "入退館管理" wording.

5. **入会申請済 detail link (FR-007 / FR-018 / FR-019, revision item 3)** — the one item needing a data-model addition:
   - Add `enrolled_application_id: string | null` to:
     - `src/app/api/_schemas/visit-experience.schema.ts` → `VisitExperienceDetailSchema` (nullable string, alongside `enrolled_at`)
     - `src/types/api/visit-experience.type.ts` → `VisitExperienceDetail` interface
     - `src/app/api/_mock-db/seeds/visit-experience.seed.ts` → `null` by default; set to an existing `APP-2026-000X` id (from `members.table.ts`'s `membershipApplications._seed()`, e.g. `APP-2026-0001`) on the seeded `membership_applied` fixtures (`VE-003`, `VE-009`, `VE-012`, `VE-015`) purely so the new link is clickable end-to-end in manual verification.
       - **Note**: no real business linkage between a visit-experience record and its resulting membership-application exists anywhere in the current data model — this is an illustrative mock correlation only, not a derived/enforced relationship. See Out of Scope below.
   - After the schema change, run `npm run generate-openapi && npm run generate-client` so `src/lib/openapi.json`, `src/lib/api/types.gen.ts`, `sdk.gen.ts`, and `@tanstack/react-query.gen.ts` pick up the new field (Constitution II — generated files must not be hand-edited; the field must flow through codegen).
   - File: `src/app/(private)/visit-experiences/[id]/_components/permit-actions.tsx` — in the `membership_applied` branch, add a plain `Button`/link (not `RoleGatedButton` — per spec, this is a read-only navigation, not gated) rendered only when `record.enrolled_application_id` is present: label "入会申請の詳細を確認 →", `onClick={() => router.push(navigate('/membership-applications/[id]', record.enrolled_application_id))}` (or the project's equivalent route-builder call for that dynamic route).

## Out of Scope (cross-reference only, do not implement here)

- **Enrollment-handoff prefill pipeline** (`permit-actions.tsx`'s `handleEnrollment()` → `/membership-applications/create`): the spec revision corrected FR-015's _documented_ field list (last/first name split, furigana split, phone, email — no birth date/address), but this is a pre-existing, larger gap unrelated to "these changes": the receiving `create/page.tsx` → `EnrollmentForm` never reads `useSearchParams()` at all today, so the prefill silently no-ops regardless of which fields the detail page sends. Reshaping `handleEnrollment()`'s payload to match the corrected FR-015 without also wiring `EnrollmentForm` to consume it would be cosmetic only. Belongs to a dedicated task against the enrollment-application module, not this delta.
- **Real visit → membership-application correlation**: item 5 above seeds an illustrative `enrolled_application_id`; deriving/enforcing this link automatically (e.g., when an application created from this handoff is later approved) is a backend/future-phase design decision, already flagged as open in `spec.md`'s Assumptions.
- `src/lib/openapi.json`, `src/lib/api/types.gen.ts`, `sdk.gen.ts`, `@tanstack/react-query.gen.ts`: regenerated via the codegen scripts noted in item 5 — never hand-edited.

---

## Constitution Check

| Principle                               | Status | Notes                                                                                                                                                                                                                         |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I — TypeScript Strictness               | PASS   | One new nullable `string` field added consistently to both the Zod schema and the hand-authored type; no new `any`.                                                                                                           |
| II — OpenAPI-First                      | PASS   | The new `enrolled_application_id` field is declared in the Zod schema first, then propagated to `openapi.json`/generated client via `npm run generate-openapi && npm run generate-client` — no hand-edits to generated files. |
| III — Spec-Driven Development           | PASS   | Every item traces directly to `spec.md`'s 2026-08-12 revision note and the FRs it touches (FR-005, FR-006, FR-014, FR-018, FR-019).                                                                                           |
| IV — App Router Conventions & Simple UX | PASS   | The new enrolled-state link is a plain `Button`/link, not a new modal or wizard step; no new client boundaries beyond the existing `'use client'` components.                                                                 |
| V — Simplicity & Minimal Dependencies   | PASS   | No new dependencies; the one new field is the minimum needed to make FR-007's enrolled-state link functional.                                                                                                                 |

No violations.

---

## Verification (per constitution's No Testing Policy — manual only)

1. `npm run generate-openapi && npm run generate-client` after the schema edit, then `tsc --noEmit` and `npm run lint` — no new errors.
2. Open `/visit-experiences/VE-003` (or any seeded `membership_applied` record) and confirm: ステータス badge (page header) and ステータス card both show 入会申請済 with success tone; 来店詳細情報 shows 店舗 and 入会申請日時; 入退館連携情報 card is visible with entry+exit times; 操作 panel shows the 入会申請日時 text plus the new "入会申請の詳細を確認 →" link, and clicking it navigates to the seeded application's detail page.
3. Open a seeded `cancelled` record and confirm both the page-header badge and the ステータス card now agree on destructive tone, and the 操作 panel shows only キャンセル日時 with no buttons.
4. Open an `info_missing` and a `bl_checking` record and confirm the ステータス card, page-header badge, and any other label sources all read "申請者への確認待ち" / "BL照合結果あり・確認待ち" — no lingering "確認待ち"/"BL照合中" anywhere on the page.
5. Confirm 店舗 renders correctly (non-empty) for every seeded record, since it is not conditional.
