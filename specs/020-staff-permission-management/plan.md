# Implementation Plan: Staff & Permission Management

**Branch**: `020-staff-permission-management` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-staff-permission-management/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This is an **update to an existing feature**, not a greenfield build. An older implementation of
staff management already lives at `src/app/(private)/staffs/` (route `/staffs`), built against a
now-superseded draft spec (`specs/staff-management/`, which targeted an unused `/settings/staff`
route). The current Y-01 v4 PO doc and refreshed V0 mockups (`staff-list.tsx`, `staff-detail.tsx`,
`staff-form.tsx`) require several deltas on top of that existing code:

1. **Role-based access enforcement** — wire the already-existing `useAuthUser()` /
   `RoleGatedButton` / `RoleGatedMenuItem` / `Permission` infrastructure into `staffs/`, which
   currently uses none of it (list scoping, edit-access rules, action gating).
2. **Three-way status** (active/inactive/**invited**) with masked names and relative last-login
   display, replacing today's two-way status and free-form last-login string.
3. **Bulk staff creation as a full page** (`/staffs/create`), replacing the existing
   `invite-staff-modal.tsx`, to match the reviewed multi-row form with shared role/position/
   store-or-FC affiliation.
4. **New actions**: resend-invite, magic-link issuance, a dedicated deactivate action distinct
   from delete (whose `delete_reason` becomes optional to match the reviewed dialogs).
5. **New entity**: permission change history, surfaced on the existing detail page's "変更履歴" tab.
6. **Manager store-scoping**: a new `managed_store_ids` field (Staff + `/auth/me`) since no
   existing relationship models "which stores does this Manager oversee" (the existing
   `store.manager_staff_id` models a different, single-store 店舗責任者 relationship).

Full rationale for each decision is in `research.md`; the resulting field/entity changes are in
`data-model.md`; the endpoint-level contract is in `contracts/api-contracts.md`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4 (adds `formatDistanceToNow` + `ja` locale usage, no new package)
**Storage**: Phase 1 — `src/app/api/_mock-db/` (tables: `staffs`, `staff_permissions`, new `staff_permission_history`); Phase 2 — generated REST client via hey-api (out of scope for this feature)
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application (Next.js App Router monolith — existing single-project layout, no new project boundary introduced)
**Performance Goals**: No new performance targets beyond the existing app's baseline; list/filter/sort operate over the existing mock-DB in-memory arrays (hundreds of rows), consistent with other CRM list screens already in the codebase.
**Constraints**: No automated tests (Constitution: No Testing Policy) — quickstart.md is the verification mechanism. No new npm dependencies (Constitution Principle V).
**Scale/Scope**: 3 existing pages modified (`staffs/page.tsx`, `staffs/[id]/page.tsx`, `staffs/[id]/edit/page.tsx`), 1 new page (`staffs/create/page.tsx`), ~7 mock-API endpoints (4 modified, 3–4 new), 1 new mock-DB table (permission history), extension of `MeResponseSchema`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                                                                                                                                                                                                                                | Notes |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| I   | TypeScript Strictness  | ☑ All new/modified schemas are Zod-derived (`staff.schema.ts`, `auth.schema.ts`); no `any` introduced; new fields explicitly typed and documented in data-model.md                                                                                                                                                                                                                                   |       |
| II  | OpenAPI-First          | ☑ All new/changed endpoints are mock-DB routes under `src/app/api/crm/staffs/**` and `src/app/api/crm/auth/me`; declared via Zod `.openapi()` schemas before route implementation, per existing project convention; no manual `src/lib/api/` edits (that dir is hey-api-generated and untouched in Phase 1)                                                                                          |       |
| III | Spec-Driven            | ☑ `spec.md` has zero `[NEEDS CLARIFICATION]` markers (confirmed at spec creation); this plan is grounded in it plus `research.md`'s resolved decisions                                                                                                                                                                                                                                               |       |
| IV  | App Router & Simple UX | ☑ Reuses existing shadcn/ui + Tailwind components exclusively (`RoleGatedButton`, `StatusCard`, `PageHeader`, `Empty`, `FilterResultBanner`, `AlertDialog`, etc.); new `/staffs/create` page replaces a modal specifically because the modal no longer fits the required content — shortest-path UX, not added complexity; forms use `react-hook-form` + Zod per existing `staffs/[id]/edit` pattern |       |
| V   | Simplicity & Min. Deps | ☑ No new npm packages (date-fns already approved); `use-unsaved-changes` is copied per-feature following the codebase's existing convention (2 prior precedents) rather than introducing a new shared abstraction from a single new consumer                                                                                                                                                         |       |

> All gates pass. No unresolved items requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/020-staff-permission-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── api-contracts.md # Phase 1 output (/speckit.plan command)
├── checklists/
│   ├── requirements.md  # from /speckit.specify
│   └── parity.md        # from /speckit.specify — UI-fidelity gate for /speckit.implement
└── tasks.md              # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

Single Next.js App Router project — no new project boundary. Existing feature folder is modified
in place; one new route is added. Paths marked **(modify)** already exist (see research.md for
what changes); **(new)** does not exist yet.

```text
src/app/(private)/staffs/
├── page.tsx                                  (modify — add role-gated scoping, relative last-login, invited-status row treatment)
├── create/
│   └── page.tsx                              (new — replaces invite-staff-modal.tsx; mode="create" bulk form)
├── [id]/
│   ├── page.tsx                              (modify — role-gated actions, 変更履歴 tab, magic-link/deactivate/resend-invite wiring)
│   ├── edit/
│   │   └── page.tsx                          (modify — role-gated field access, role-change confirmation dialog)
│   ├── _components/
│   │   ├── staff-detail-header.tsx           (modify — role-gated header actions)
│   │   ├── staff-status-card.tsx             (modify — deactivate action, status copy)
│   │   ├── staff-permission-card.tsx         (modify — read-only "position permissions" link, unchanged scope)
│   │   ├── staff-personal-info-card.tsx      (existing, minor field alignment only if needed)
│   │   ├── staff-login-info-card.tsx         (existing, minor field alignment only if needed)
│   │   └── permission-history-tab.tsx        (new — 変更履歴 tab content)
│   └── edit/_components/
│       ├── personal-info-section.tsx         (existing, minor changes)
│       ├── login-settings-section.tsx        (existing, minor changes)
│       ├── permission-settings-section.tsx   (modify — role-change confirm dialog, disabled-role-for-non-HQ state)
│       └── role-change-confirm-dialog.tsx    (new)
├── _components/
│   ├── staffs-table-columns.tsx              (modify — status/last-login/affiliation column changes)
│   ├── staffs-filters.tsx                    (modify — status filter gains "invited" option)
│   ├── staff-delete-action.tsx               (modify — delete_reason becomes optional; add deactivate action alongside)
│   ├── staff-row-menu.tsx                    (new, or extend existing row-action component — resend-invite/deactivate/delete menu items, role-gated)
│   └── invite-staff-modal.tsx                (remove — superseded by create/page.tsx, after confirming no other call sites)
├── _hooks/
│   ├── use-staffs-filters.ts                 (existing, minor: invited status option)
│   └── use-staffs-unsaved-changes.hook.ts    (new — copied per-feature pattern, see research.md #10)
└── _utils/
    ├── position-role.util.ts                 (existing, unchanged)
    └── format-relative-time.util.ts          (new — date-fns formatDistanceToNow wrapper)

src/app/api/crm/
├── staffs/
│   ├── route.ts                              (modify — GET scoping, POST bulk-create replacing invite semantics)
│   ├── invite/route.ts                       (remove or retain per research.md #4's grep-first caveat)
│   └── [id]/
│       ├── route.ts                          (modify — GET access rule, PATCH role/authorization + history side-effect, DELETE reason optional)
│       ├── deactivate/route.ts               (new)
│       ├── resend-invite/route.ts            (new)
│       ├── magic-link/route.ts               (new)
│       └── permission-history/route.ts       (new)
└── auth/me/route.ts                          (modify — add managed_store_ids, staff_id)

src/app/api/_schemas/
└── staff.schema.ts                           (modify — status enum, invited_at, managed_store_ids, deleted_at, new StaffPermissionHistoryEntrySchema, deactivate/resend/magic-link request+response schemas)

src/app/api/_schemas/auth.schema.ts            (modify — MeResponseSchema additions)

src/app/api/_mock-db/
├── types/staffs.type.ts                      (modify — new fields/methods: deactivate, resendInvite, getPermissionHistory)
├── tables/staff.table.ts                     (modify — seed data for new fields, new staff_permission_history table)
└── seeds/                                    (modify seed data only if new sample invited/managed-store rows are needed for manual verification)

src/contexts/auth-user.context.tsx             (no change — already provides hasRole/hasPermission; just consumed by staffs/)
src/types/permission.type.ts                   (no change — Permission.Staffs* already defined)
```

**Structure Decision**: Extend the existing single Next.js App Router project in place — no new
top-level directory, package, or project boundary. Route-local code stays co-located under
`src/app/(private)/staffs/_components/`, `_hooks/`, `_schemas/`, `_utils/` per Constitution
Principle IV. The one net-new route (`staffs/create/`) follows the same co-location convention as
the existing `staffs/[id]/edit/` route.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Not applicable — the Constitution Check above has no unresolved violations. All new
entities/endpoints (permission history table, deactivate/resend-invite/magic-link routes,
`managed_store_ids`) are additive to the existing mock-DB pattern and reuse existing shared
components; no new dependency, project boundary, or abstraction layer was introduced.

---

## Addendum (2026-08-24): Edit screen real-API alignment

**Branch**: `feat/staff-implement-api` | **Trigger**: re-check of the edit screen's logic/UI
against Y-01, `Y-01_権限設計v2_3.md`, and the current `staff-form.tsx` prototype (spec.md's
"Known Implementation Gaps", added 2026-08-24) + explicit request to align the edit screen with
the latest UI. Full rationale in research.md items 12–15.

### Summary

The Phase 1 plan above scoped the mock-DB implementation and explicitly excluded the real-API
migration ("Phase 2 — generated REST client via hey-api (out of scope for this feature)"). That
migration is now the active work on this branch. This addendum scopes the remaining edit-screen
delta on top of it:

1. Finish the mock-DB → real-API swap already underway for `staffs/[id]/edit/` (research.md #12) — largely done; `PositionSelectInput`/`StoreSelectInput` already replace the ad-hoc selects.
2. Remove six field groups from the edit form that have no basis in Y-01, the design note, or the current prototype, and are silently discarded on save (research.md #13): furigana, gender, birthday, address fields, the three additional-permission checkboxes, and the "編集可能情報" scope table.
3. Keep the email field (in-scope per Y-01/FR-012/prototype) but disable it with an api-gap tooltip instead of silently dropping edits, and point its duplicate-check at the real staff list (research.md #14).
4. Close the FR-013 enforcement gap: extract a shared `canEditStaffAccount` helper and apply it as an actual guard on the edit route and the list-row edit action, not just a disabled button on the detail page (research.md #15).

### Constitution Check (re-run for this addendum)

| #   | Principle              | Check                                                                                                                                                                                                                  |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ Field removals shrink `staffEditFormSchema`; no `any` introduced; the new `canEditStaffAccount` helper is fully typed against existing `StaffDetailDto`/`UserRole` types.                                            |
| II  | OpenAPI-First          | ☑ No new endpoints; this addendum only removes unbacked client fields and adds a client-side guard — no `src/lib/api-real/` (generated) edits.                                                                         |
| III | Spec-Driven            | ☑ Grounded in spec.md's "Known Implementation Gaps" section and research.md #12–15; no new `[NEEDS CLARIFICATION]` markers.                                                                                            |
| IV  | App Router & Simple UX | ☑ Reuses the existing disabled+tooltip pattern already in this file (role field) for email, and the existing `RoleGatedButton`/`RoleGatedMenuItem` convention for the new edit guard — no new UI primitive introduced. |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; one small new shared util (`can-edit-staff.util.ts`) replaces a duplicated inline check rather than adding an abstraction layer.                                                                |

> All gates pass.

### Project Structure delta

```text
src/app/(private)/staffs/
├── _utils/
│   └── can-edit-staff.util.ts                (new — shared FR-013 check, used by items below)
├── _components/
│   └── staffs-table-columns.tsx              (modify — gate "編集" row action with can-edit-staff.util.ts)
├── [id]/
│   ├── _components/
│   │   └── staff-detail-header.tsx           (modify — isManagerEditAllowed replaced by the shared util)
│   └── edit/
│       ├── page.tsx                          (modify — StaffEditDataProvider renders access-denied when the shared util fails)
│       ├── _components/
│       │   ├── personal-info-section.tsx     (modify — remove kana/gender/birthday/address fields; disable email + real dedupe query)
│       │   ├── permission-settings-section.tsx (modify — remove additional-permission checkboxes + editable_scopes table/useFieldArray)
│       │   └── login-settings-section.tsx    (remove — no spec basis; see research.md #13 note on the login/social fields)
│       └── _schemas/
│           └── staff-edit-form.schema.ts     (modify — drop last_name_kana/first_name_kana/gender/birthday/postal_code/prefecture/city/address/building/login_method/social_id/billing_correction/refund_request/transfer_request/editable_scopes)
```

### Out of scope for this addendum

- Adding an email field to `UpdateStaffRequestDto` (backend team's call) — the frontend disables
  the field pending that change rather than assuming a timeline for it.
- Formally re-adding the removed permission-flag fields to Y-01's position-master screen (FR-006)
  — a separate feature.
- Re-running `tests/cases/TC -【Fitness CRM】- [Y-01][03][スタッフ編集].md` against the changed
  screen — follow-up for the `execute-testcases` skill once this addendum is implemented, not part
  of planning.
