# Implementation Plan: Staff Detail — Login History Tab

**Branch**: `031-staff-login-history` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-staff-login-history/spec.md`

## Summary

Add a third "ログイン履歴" tab to the existing staff detail screen (`src/app/(private)/staffs/[id]/page.tsx`), visible only to Headquarter/System, containing (1) a read-only table of that staff account's successful sign-ins and (2) a single "セッションを強制終了" action. Both are already fully supported by the real API: `GET /api/v1/admin/staff/{id}/login-histories` (generated as `adminStaffPermissionControllerStaffLoginHistoriesOptions`) and `POST /api/v1/admin/staff/{id}/sessions/revoke` (generated as `adminStaffControllerRevokeSessionsMutation`). No OpenAPI changes, no codegen, no new npm packages, no mock-db — this is a pure UI addition on top of an already-generated client, following the exact pattern the sibling `変更履歴` tab (`permission-history-tab.tsx`) already established on this same page.

The V0 mockup (`staff-detail.tsx`) additionally shows a multi-device active-session list (device/IP/last-active, 3-session cap, per-row terminate) and a 成功/失敗/ロック result column on the history table. Neither has a backing endpoint — `sessions/revoke`'s own doc comment states the backend keeps exactly one session per staff (a single Redis key, overwritten on every sign-in), and `login-histories`' doc comment states it "is a usage history, not a security audit log" recording successes only. `spec.md` was revised during this planning pass to match that authoritative real contract instead of the V0 mockup; this plan builds only the revised (buildable) scope. See `research.md` R1–R2 for the full reasoning and `checklists/parity.md` for the corresponding descope list.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5 (via the generated `src/lib/api-real` hooks), lucide-react, Tailwind CSS v4. No react-hook-form/Zod needed (no form — the session-termination dialog takes no input). No new npm packages.
**Storage**: Real API only — `src/lib/api-real` (already generated from `src/lib/openapi.real.json`, both `login-histories` GET and `sessions/revoke` POST already present). No mock-db surface for this feature; this screen has already fully moved off `src/app/api/_mock-db/` (see `research.md` R3).
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application — existing Next.js App Router monolith (`fitness-crm`); no new project/package.
**Performance Goals**: No new performance targets; a single paginated table fetch (default page size, same as the existing 変更履歴 tab) and a single mutation, consistent with this screen's existing baseline.
**Constraints**: No automated tests (Constitution: No Testing Policy) — `quickstart.md` is the verification mechanism. No new npm dependencies (Constitution V). No OpenAPI edits and no manual edits to generated `src/lib/api-real/*` files (Constitution II) — both endpoints already exist and are already generated.
**Scale/Scope**: 1 existing page modified (`staffs/[id]/page.tsx` — add the third tab trigger/content), 2 new route-local files (`_components/login-history-tab.tsx`, `_components/staff-session-terminate-action.tsx`), 0 new backend/mock-db/OpenAPI surface.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                                                                                                                                                    | Notes                                                                                                                                  |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ New code stays strict TS; the login-history item type is a hand-narrowed local interface (`{ id, loggedInAt, authProvider, sessionId, ipAddress, userAgent }`) cast from the generated DTO's untyped index-signature field — same pattern already used for `changedBy` in `permission-history-tab.tsx` |                                                                                                                                        |
| II  | OpenAPI-First          | ☑ Uses `adminStaffPermissionControllerStaffLoginHistoriesOptions` and `adminStaffControllerRevokeSessionsMutation` from the generated `src/lib/api-real` client as-is, zero edits to generated files, no new mock-db route                                                                               | Both operations already exist in `openapi.real.json` and are already generated — this feature is a new _consumer_, not a new endpoint. |
| III | Spec-Driven            | ☑ `spec.md` approved; no `[NEEDS CLARIFICATION]` tokens remain (revised during this plan to match the real backend contract — see Summary)                                                                                                                                                               |                                                                                                                                        |
| IV  | App Router & Simple UX | ☑ `"use client"` justified on both new files (interactive tab content using `useQuery`/`useMutation`, and a confirm-dialog action) — same justification already accepted for `permission-history-tab.tsx` / `staff-deactivate-action.tsx`; shadcn/ui + Tailwind only; single confirm dialog, no wizard   |                                                                                                                                        |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; no new abstraction layer — both new files are thin, single-purpose components mirroring existing siblings on the same page (`permission-history-tab.tsx`, `staff-deactivate-action.tsx`)                                                                                          |                                                                                                                                        |

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/031-staff-login-history/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/            # Phase 1 output
│   └── api-contracts.md
├── checklists/
│   ├── requirements.md   # /speckit.specify output
│   └── parity.md         # /speckit.specify output (UI parity gate)
└── tasks.md              # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
src/app/(private)/staffs/[id]/
├── page.tsx                                    # MODIFIED — add third TabsTrigger/TabsContent
│                                                #   "ログイン履歴", gated to Headquarter/System,
│                                                #   rendering <LoginHistoryTab staffId={id} />
└── _components/
    ├── permission-history-tab.tsx               # UNCHANGED — direct pattern reference
    ├── login-history-tab.tsx                     # NEW — login-history table (day/method/IP/UA),
    │                                              #   newest-first, footer count + <StaffSessionTerminateAction>
    └── staff-session-terminate-action.tsx        # NEW — "セッションを強制終了" button + confirm
                                                   #   AlertDialog + revoke mutation + success toast
```

**Structure Decision**: Single existing Next.js App Router project, no new project boundary. Both new files are route-local under `staffs/[id]/_components/`, matching every other component already on this page (Constitution IV: route-local code co-located with the page). `login-history-tab.tsx` renders `<StaffSessionTerminateAction>` inline (not a separate tab section) since the action has no list to sit above — this differs from the V0 mockup's two-card layout only because the "アクティブセッション" card itself is descoped (see Summary/research.md).

## Complexity Tracking

_No Constitution Check violations — table not needed._
