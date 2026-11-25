# Implementation Plan: Y-14 Domain Master Management — Update

**Branch**: `030-domain-management` (checked out as `feat/domain-management`) | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-domain-management/spec.md`, refreshed 2026-09-09 against the updated V0 mockup

## Summary

This is an **update plan**, not a greenfield build — the Phase 1 `/domains` screen was already fully implemented (2026-08-18, commit `56bc62b8`) and its backend (Zod schemas, mock table, seeds, permissions, routing) already implements the _entire_ current spec, including `authProvider`, `staffCount`, `linkedStaff`, `createdBy`/`createdAt`, and delete-blocking with a `409` + `staffCount` payload. Nothing on the backend needs to change.

What's outstanding is entirely in the frontend, and it exists today as **already-written code that is commented out**, guarded by `TODO(Y-14 Q&A pending, see specs/030-domain-management/qa-authprovider.md)` markers: the 認証方式 column, its list filter, and the create/edit form field were all built once and then hidden because the implementer read `qa-authprovider.md`'s open Q1-Q4 as blocking the whole field. Per spec.md's 2026-09-09 Assumptions update, Q1-Q4 are cross-system conflict-resolution questions (Y-14 vs Y-03 vs Y-13) — not whether the field belongs in Phase 1 — and the refreshed V0 mockup (`domain-list.tsx` @6bc1f1c) confirms the field, column, and filter are in scope regardless of how Q1/Q2 resolve. This plan un-hides that code and brings copy/behavior in line with the current V0 and `checklists/parity.md`.

One genuinely new piece of UI: V0 now splits "view" from "edit" — clicking a row opens a **read-only detail Sheet** (linked-staff list, creator/created-at) with its own 削除/編集 buttons, separate from the create/edit Dialog. The live app currently folds that read-only content into the edit Dialog itself; this plan extracts it into a new `domain-detail-sheet.tsx`, reusing the existing `DataTable.onRowClick` prop (already used by sibling screens — no new abstraction) and the existing `GET /domains/{id}` query.

**Verification note (per user instruction this round)**: the app's login flow now goes through real AWS Cognito / Google SSO instead of the mock-credential flow this feature was originally verified against. An agent-driven browser session cannot complete that login non-interactively, so this plan does **not** include an agent-executed manual-verification pass or an automated E2E/parity browser run — the user will verify the built screen themselves after implementation. `quickstart.md`'s Manual Verification checklist is kept as a reference for the user, not as a step this plan's execution performs. (See Constitution Check note on the `verify-parity` after-implement hook.)

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any) — unchanged
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, nuqs — unchanged, no additions
**Storage**: Mock table `src/app/api/_mock-db/tables/domain.table.ts` — already complete, no schema change
**API pipeline**: No schema change → **no** `generate-openapi`/`generate-api` regeneration needed this round; all client hooks used here (`getCrmDomainsOptions`, `postCrmDomainsMutation`, `getCrmDomainsByIdOptions`, `patchCrmDomainsByIdMutation`, `deleteCrmDomainsByIdMutation`) and generated types (`DomainAuthMethod`, `DomainListItem`, `DomainDetail`) already exist in `src/lib/api/`.
**Target Platform**: Node.js ≥ 24.0.0, browser (web) — unchanged
**Project Type**: Web application (Next.js App Router) — unchanged
**Performance Goals**: Unchanged — standard master-screen expectations, few-dozen-row scale
**Constraints**: UI parity with the refreshed V0 mockup (`domain-list.tsx` @6bc1f1c) per the regenerated `checklists/parity.md` (45 items, PAR001-045); FR-015 (status/enable-disable) stays fully excluded — PAR900-902 remain deliberately unchecked/deferred.
**Scale/Scope**: Same 1 route, same 5 endpoints (untouched). Frontend delta: 3 files edited to un-hide existing code (`domain-table-columns.tsx`, `page.tsx`, `use-domain-filters.ts` needs no change — already returns `authProvider`/`setAuthProvider`), 1 file edited to restore the auth-change confirm dialog and drop the folded-in detail block (`domain-form-dialog.tsx`), 1 file edited for copy/warning-Alert/proactive-disable fixes (`domain-delete-dialog.tsx`), 1 new file (`domain-detail-sheet.tsx`).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check | Notes                                                                                                                                                                                                  |
| --- | ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I   | TypeScript Strictness  | ☑     | No new types beyond what's already generated from `domain.schema.ts`; the Sheet reuses `DomainDetail`/`DomainListItem` as-is                                                                           |
| II  | OpenAPI-First          | ☑     | No backend/schema change this round; UI continues to consume only `@tanstack/react-query.gen` — nothing hand-edited in `src/lib/api/`                                                                  |
| III | Spec-Driven            | ☑     | `spec.md` re-validated 2026-09-09 (`checklists/requirements.md`), zero `[NEEDS CLARIFICATION]`; `qa-authprovider.md` Q1/Q2 remain open but are documented as non-blocking for this scope               |
| IV  | App Router & Simple UX | ☑     | Detail Sheet reuses the existing `DataTable.onRowClick` pattern already used by ~15+ sibling screens (e.g. `slot-detail-sheet.tsx`, `unpaid-detail-sheet.tsx`) — no new interaction pattern introduced |
| V   | Simplicity & Min. Deps | ☑     | Zero new npm packages; un-hiding existing code rather than rewriting; one new component file follows an established sibling-screen shape                                                               |

> All gates pass. One deviation is recorded below (not a constitution violation, a scoped-out step per explicit user instruction).

**Deviation — automated verification skipped this round**: The `after_implement` hooks in `.specify/extensions.yml` (`verify-parity`, `speckit.review`) are configured `optional: false`. `speckit.review` (static code-rule audit) is unaffected and still runs. `verify-parity` drives a headless Playwright session through the built screen, which requires logging in first; the app's login now requires real Cognito/Google authentication that a headless/agent session cannot complete non-interactively (consistent with prior findings — real-API screens reject the old mock QA credentials). Per the user's explicit instruction this round, the implementer should **not** attempt to force this hook through with mock credentials or treat a login failure there as a task blocker; the parity checklist stays unchecked for the agent to reason about structurally (code review against `domain-list.tsx`), and the user performs the actual live-browser verification and will tick/report parity themselves.

## Project Structure

### Documentation (this feature)

```text
specs/030-domain-management/
├── plan.md              # This file — rewritten as an update plan
├── research.md          # Unchanged (R1-R8 already anticipated the full current spec)
├── data-model.md        # Unchanged (schema already matches)
├── quickstart.md         # Amended: Manual Verification section reframed as user-executed, not agent-executed
├── contracts/            # Unchanged (5 endpoint contracts, already accurate)
├── checklists/
│   ├── requirements.md  # Re-validated 2026-09-09, all items still pass
│   └── parity.md        # Regenerated 2026-09-09 against V0 @6bc1f1c (45 + 3 deferred items)
├── qa-authprovider.md    # Unchanged — Q1/Q2 remain genuinely open, tracked separately from this build
└── tasks.md              # Phase 2 output (/speckit.tasks — NOT created by this command)
```

### Source Code (repository root) — delta only, everything else already exists and is correct

```text
src/app/(private)/domains/
├── page.tsx
│   # EDIT: un-comment the 認証方式 Select filter block + its imports/options; wire it to
│   #   useDomainFilters()'s already-existing authProvider/setAuthProvider; add
│   #   detailTargetId state + DataTable's onRowClick to open the new Sheet; wire the
│   #   Sheet's 編集/削除 buttons into the existing setFormState/setDeleteState handlers.
├── _components/
│   ├── domain-table-columns.tsx
│   │   # EDIT: un-comment the 認証方式 Badge column (DOMAIN_AUTH_METHOD_LABELS already
│   │   #   imported-and-ready); no change to the スタッフ数 column or actions column.
│   ├── domain-form-dialog.tsx
│   │   # EDIT: un-comment the 認証方式 Select field (drop DEFAULT_AUTH_PROVIDER fallback —
│   │   #   the schema already requires it); restore the auth-change confirm AlertDialog
│   │   #   (re-add pendingValues state), rewriting its copy to match V0 exactly: name +
│   │   #   domain, old → new method, and the affected linked-staff count (reuse
│   │   #   detail.staffCount already fetched for edit mode — no new query).
│   │   # REMOVE: the 作成者/作成日時/紐づくスタッフ一覧 block folded into this dialog —
│   │   #   it moves to the new Sheet below (V0 no longer shows it here).
│   ├── domain-delete-dialog.tsx
│   │   # EDIT: fix description copy to V0's current wording ("削除後、このドメインの
│   │   #   メールアドレスではCRMにログインできなくなります。"); replace the plain
│   │   #   destructive-text paragraph with a proper warning Alert (AlertTriangle icon);
│   │   #   compute the block proactively from the passed DomainListItem's own staffCount
│   │   #   (already available — no need to wait for the 409) while keeping the existing
│   │   #   409/blockedStaffCount handling as a race-condition fallback (spec.md Edge Cases).
│   └── domain-detail-sheet.tsx
│       # NEW: read-only Sheet, opened by row click. Fetches the same
│       #   getCrmDomainsByIdOptions query the edit dialog already uses. Renders:
│       #   ID/管理名/ドメイン/認証方式/スタッフ数/作成者/作成日時, then 紐づくスタッフ
│       #   一覧 (name, id · position-equivalent, status), then a footer with 削除
│       #   (opens domain-delete-dialog for this row) and 編集 (opens domain-form-dialog
│       #   in edit mode for this row) — mirrors the shape of sibling detail sheets like
│       #   `slot-detail-sheet.tsx` / `unpaid-detail-sheet.tsx`.
└── _hooks/use-domain-filters.ts
    # NO CHANGE — authProvider/setAuthProvider already implemented and already returned;
    #   only page.tsx currently fails to consume them.

# Untouched — already correct, verified during this plan's investigation:
#   src/app/api/_schemas/domain.schema.ts
#   src/app/api/_mock-db/{seeds,tables,types}/domain*.ts
#   src/app/api/crm/domains/**
#   src/types/permission.type.ts, src/constants/permission.constants.ts
#   src/components/layout/app-sidebar.tsx
#   src/lib/api/** (generated)
```

**Structure Decision**: No structural change to the feature's file layout — same single route, same mock API, same permission wiring. The only new file is `domain-detail-sheet.tsx`, added alongside the existing `_components/` siblings, following the same read-only-Sheet-triggered-by-row-click shape already established elsewhere in this codebase (e.g. `lockers/[id]/_components/slot-detail-sheet.tsx`).

## Complexity Tracking

No constitution violations — table intentionally left empty. The verification-scope deviation above is a user-directed process decision, not a complexity/architecture violation.

## Next steps

1. Run `/speckit.tasks` to turn this delta into ordered tasks. Expected shape: (a) un-hide 認証方式 column/filter/field in the three existing files, (b) restore + rewrite the auth-change confirm dialog, (c) fix the delete dialog's copy/warning/proactive-disable, (d) build `domain-detail-sheet.tsx` and wire row-click, (e) `npm run type-check && npm run lint`. No schema/permission/routing/client-generation tasks are needed.
2. `/speckit.implement` should tick `checklists/parity.md` items PAR001-045 through structural/code review against `domain-list.tsx`, and run `speckit.review` (static code-rule audit) — but should **not** attempt the `verify-parity` Playwright login-driven pass this round (see Constitution Check deviation note); leave that checklist's live confirmation to the user.
