# Implementation Plan: Member Detail — Header Popups & Side Sheets

**Branch**: `021-member-detail-header-actions` (planned while checked out on `022-member-detail-tabs` at the user's request — no branch switch performed) | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-member-detail/header-actions/spec.md`

> **Amended 2026-09-18 — surface 11 (再入会) withdrawn.** The prototype removed the action on
> 2026-09-16 (`a7d0c88`); re-enrollment belongs to the `C-01` enrollment application
> (`POST /api/v1/admin/applications`), and its fee waiver is decided server-side. Everything
> below about 再入会 is kept as a record and no longer describes the screen — see
> [spec.md](./spec.md#amendment-2026-09-18--surface-11-再入会-withdrawn).

## Summary

All 12 header surfaces already exist and are wired from [page.tsx](<src/app/(private)/members/[id]/page.tsx>). This is therefore a **correction pass**, not a build: bring the 12 surfaces to the target behaviour recorded in the spec by closing 6 prototype-parity gaps (G-A…G-F) and 13 API-contract gaps (G-01…G-13), and formally hand 6 items to the backend team.

Technical approach: the whole feature is confined to one route folder plus its mock API routes. No new pages, no new dependencies, no new architectural layers. Every contract change starts in a Zod schema under `src/app/api/_schemas/member.schema.ts`, then flows through the project's codegen chain to the typed client — so the generated client is never hand-edited (Constitution II).

**Import boundary**: `src/app/(private)/` and `src/app/api/` must not import each other, and shared code for the member screen stays scoped to the member folder rather than being hoisted into global `src/constants` / `src/utils`. Each tree keeps its own copy of the operation rules — `src/app/api/_lib/member-operation.ts` server-side (shared by 6 routes), `members/[id]/_utils/member-operation.util.ts` client-side. Values with a single consuming file are declared in that file, not in a `_constants` aggregator; message text is inline at its use site and interpolates the limit it quotes. UI-side enum types come from the generated client.

The single most valuable discovery during planning: **the member detail bundle already carries every field the gaps need** — `currentMainContract.usageStartDate` (drives G-A and G-F), `cancellationFeeUntil`, `activeSuspension`, `activeFeeAdjustment`, `activePointDiscount`, and `pendingWithdrawal.withdrawalApplicationId` (which resolves G-11's Phase 2 resource identity). No read-model expansion is required except one addition for G-C.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4
**Storage**: Phase 1 — `src/app/api/_mock-db/`; Phase 2 — generated REST client via hey-api
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application — single Next.js project, App Router, route-local co-location
**Performance Goals**: Interaction-level only. A surface opens on the same frame as the trigger click; after a successful write the head-up card, banners and badges reflect the new state via query invalidation with no manual reload (SC-004); a whole operation completes in under 60 s of operator time (SC-002).
**Constraints**: No automated tests of any kind (Constitution: No Testing Policy). No new npm packages (Constitution V). Quality gate is `npm run lint` + `npm run type-check` + manual verification against [quickstart.md](./quickstart.md). Four operations have no real backend endpoint and stay on mock routes for Phase 1.
**Scale/Scope**: 1 page, 12 modal surfaces + 1 shared proxy sub-component, 11 mock API routes, 1 Zod schema file, 1 permission enum (already complete). 19 tracked gaps.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check | Notes                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I   | TypeScript Strictness  | ☑     | All surface props and form values derive from generated types (`GetCrmMembersByIdResponse`, `WithdrawReason`, `GateStopPattern`, …) or from the feature's Zod schemas. Removing the `WithdrawReason` enum (G-F) shrinks hand-written types rather than adding any. No `any`, no unnarrowed `unknown`.                                                                                                              |
| II  | OpenAPI-First          | ☑     | Verified 2026-07-29: `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client` produces an **empty** diff against the committed spec — the committed `openapi.json` matches the Zod schemas exactly. Every contract change therefore starts in `_schemas/member.schema.ts` and reaches the client purely by regeneration. No file under `src/lib/api/` is edited by hand. |
| III | Spec-Driven            | ☑     | `spec.md` complete; 5 of 7 clarifications resolved in the 2026-07-29 session and folded into the requirements; Q6/Q7 deferred with a stated default each, neither affecting scope or data modelling. No `[NEEDS CLARIFICATION]` tokens remain. This `plan.md` precedes `tasks.md`.                                                                                                                                 |
| IV  | App Router & Simple UX | ☑     | All 12 surfaces are `'use client'` — justified: each is a form with local state, `react-hook-form` + Zod validation and a mutation. They stay in `_components/` co-located with the route. shadcn/ui + Tailwind only; icons from `lucide-react`. See the UX note below on confirm dialogs.                                                                                                                         |
| V   | Simplicity & Min. Deps | ☑     | Zero new packages. No new abstraction: the confirm-dialog and acknowledgement-checkbox patterns already exist in sibling surfaces and are copied, not generalised into a wrapper (a shared wrapper was considered and rejected — see [research.md](./research.md) R-6).                                                                                                                                            |

**UX note on Principle IV ("no unnecessary modals")**: this feature deliberately adds two confirm dialogs (G-B, G-C). That is not a violation. Each guards an immediate, hard-to-reverse restriction release, the prototype specifies it, and the spec requires it (FR-006, FR-007). The dialogs that already exist on the six sibling surfaces make their absence on these two the inconsistency. No wizard or multi-step flow is introduced anywhere — every surface remains a single form.

> No unchecked boxes. Complexity Tracking is therefore empty and omitted.

## Project Structure

### Documentation (this feature)

```text
specs/032-member-detail/header-actions/
├── spec.md              # Feature specification (with Clarifications + Gap Analysis)
├── plan.md              # This file
├── research.md          # Phase 0 — decisions behind each gap resolution
├── data-model.md        # Phase 1 — read model consumed + write payloads per surface
├── contracts/
│   └── mock-api.md      # Phase 1 — request/response contract changes, per endpoint
├── quickstart.md        # Phase 1 — manual verification checklist (the QA gate)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/app/(private)/members/[id]/
├── page.tsx                              # header clusters, banners, surface mounting  → G-A
├── _components/
│   ├── proxy-application-section.tsx     # shared 代理申請 block                        → G-02
│   ├── leave-sheet.tsx                   # 1 休会申請                                   → G-01
│   ├── withdraw-sheet.tsx                # 2 退会申請                                   → G-F, G-04
│   ├── transfer-sheet.tsx                # 3 移籍申請                                   → G-05
│   ├── leave-release-sheet.tsx           # 4 休会解除                                   → G-07
│   ├── gate-stop-set-sheet.tsx           # 5 ゲートストップ設定                          → (no change)
│   ├── gate-stop-release-sheet.tsx       # 6 ゲートストップ解除                          → G-B
│   ├── penalty-release-sheet.tsx         # 7 予約ペナルティ解除                          → G-C
│   ├── withdraw-cancel-dialog.tsx        # 8 退会取り消し                                → G-11
│   ├── force-retire-dialog.tsx           # 9 強制退会                                   → (no change)
│   ├── blacklist-dialog.tsx              # 10 ブラックリスト登録                         → (no change)
│   ├── re-enroll-sheet.tsx               # 11 再入会                                    → FR-023 guard
│   └── personal-data-delete-dialog.tsx   # 12 個人情報削除                              → G-D
└── _constants/gate-stop.ts               # pattern labels + restriction text            → (no change)

src/app/api/
├── _schemas/member.schema.ts             # Zod request/response contracts               → G-01, G-04, G-D, G-11, G-12, G-F
├── _mock-db/seeds/member.seed.ts         # seed data, incl. change history (seed-only)   → G-C
└── crm/members/[id]/
    ├── suspend/route.ts                  ├ suspend-release/route.ts
    ├── withdraw/route.ts                 ├ withdraw-cancel/route.ts
    ├── transfer/route.ts                 ├ force-withdraw/route.ts
    ├── gate-stop/route.ts                ├ blacklist/route.ts
    ├── penalty-release/route.ts          ├ personal-data/route.ts
    └── re-enroll/route.ts

src/lib/openapi.json                      # generated — regenerate, never hand-edit
src/lib/api/*.gen.ts                      # generated — regenerate, never hand-edit
src/types/permission.type.ts              # all 8 needed permissions already exist — no change
```

**Structure Decision**: keep the existing route-local co-location. Every file this feature touches is already in place; the work is editing, not scaffolding. The only new file is a seed addition for G-C. `page.tsx` stays the single owner of surface open/close state and of the trigger-level gating, and each surface stays the single owner of its own form, validation and mutation — that split already holds and is preserved.

## Work Breakdown

Three streams, executable in this order. Stream A is pure frontend and unblocks nothing else; Stream B changes contracts and must be followed by one codegen run; Stream C is documentation output for the backend team.

### Stream A — Prototype-parity fixes (frontend only, no contract change)

| Gap    | Change                                                                                                                                                                                                                  | File                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| G-A    | ~~Disable the 退会取り消し menu item when `currentMainContract.usageStartDate <= today`.~~ **Withdrawn 2026-08-11** — the rule is 入会取り消し's, not 退会申請取り消し's. The item is enabled for every 退会予定 member | `page.tsx`                           |
| G-B    | Add the confirm `AlertDialog` after the acknowledgement checkbox; add the 解除予定者 / 解除予定日時 block                                                                                                               | `gate-stop-release-sheet.tsx`        |
| G-C    | Add the confirm `AlertDialog`; add the 対象となった予約 list and the 会員への通知 disclosure                                                                                                                            | `penalty-release-sheet.tsx`          |
| G-E    | Persist the proxy block — the mock schema already accepts the three fields, the handler drops them                                                                                                                      | `crm/members/[id]/transfer/route.ts` |
| FR-023 | Block 再入会 when the member is blacklisted or has an unpaid balance, with a stated reason (guard the trigger and the submit)                                                                                           | `page.tsx`, `re-enroll-sheet.tsx`    |

### Stream B — Contract alignment (Zod → OpenAPI → client)

| Gap  | Change                                                                                                                                                                              | Where                                                                           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| G-F  | Drop the 6-value `WithdrawReason` picklist and the conditional detail field; 退会理由 becomes one required free-text field                                                          | `withdraw-sheet.tsx`, `member.schema.ts`                                        |
| G-04 | Derive the withdrawal type from `usageStartDate` (入会取消 before it, 通常退会 after); enforce the 7-day minimum on 退会予定日 for 通常退会                                         | `withdraw-sheet.tsx`, `withdraw/route.ts`                                       |
| G-01 | Validate the suspension range: 休会開始月 not in the past, 休会終了月 after 休会開始月, span ≤ 12 months                                                                            | `leave-sheet.tsx`, `member.schema.ts`                                           |
| G-07 | Validate 復帰月 ≥ current month                                                                                                                                                     | `leave-release-sheet.tsx`, `member.schema.ts`                                   |
| G-02 | Align the proxy block: send `agreementMethod` as the enum key (`in_person` / `phone` / `email` / `line`) instead of the Japanese label; validate `agreementAt` is not in the future | `proxy-application-section.tsx`, `member.schema.ts`                             |
| G-11 | Accept an optional `comment` on withdrawal cancellation and record it                                                                                                               | `withdraw-cancel-dialog.tsx`, `member.schema.ts`, `withdraw-cancel/route.ts`    |
| G-12 | Store the reason **and** the memo as separate fields instead of `memo ?? reason`                                                                                                    | `blacklist/route.ts`, `member.schema.ts`                                        |
| G-D  | Add a required 削除理由 and a typed `ANONYMIZE` confirmation to PII deletion                                                                                                        | `personal-data-delete-dialog.tsx`, `member.schema.ts`, `personal-data/route.ts` |

Then, exactly once, at the end of Stream B:

```bash
npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client
npm run lint && npm run type-check
```

### Stream C — Backend requests (documentation only)

Recorded in [contracts/mock-api.md](./contracts/mock-api.md) for hand-off; no code change in this feature.

1. **休会解除** endpoint — or a `PATCH` on the suspension application, since it is semantically an end-month update.
2. **予約ペナルティ解除** endpoint — expected under `D-01`, not `A-01`.
3. **再入会** endpoint — member-level, reuses the member row and member number, guarded on blacklist and delinquency.
4. **強制退会** endpoint — member-level manual execution, guarded on the brand × payment-method threshold, auto-registering a blacklist entry and notifying administrators.
5. **Gate stop**: add a `pattern` field to the gate-stop resource so `B-01` entry judgement can consume the `A-01 FR-014` model, and persist 設定理由.
6. **移籍申請**: accept a free-text reason, or confirm that the client should send `reasonCode: other` plus the free text as `memo` (see [research.md](./research.md) R-5).

## Deferred within this feature

- **G-03** (point refund as its own `points/refunds` call) stays folded into the suspension request for Phase 1. Splitting it would mean a two-write operation with partial-failure handling for no Phase 1 benefit; it becomes a Phase 2 concern when the real endpoints land.
- **G-06** (`to_store_name` sent alongside `to_store_id`) stays as-is — the mock uses the name for display. Phase 2 sends `toStoreId` only.
- **G-09** (gate-stop release reason enum → free-text `comment`) needs no Phase 1 change; the serialisation happens at the Phase 2 boundary.
- **G-13** (method/path of PII deletion: `DELETE .../personal-data` vs `POST .../anonymize`) is a Phase 2 path change. G-D adds the required payload now so the Phase 2 switch is mechanical.
- **Q6** (penalty-release endpoint ownership) and **Q7** (typed-confirmation UX) — Q7's recommended default is implemented by G-D, which settles it in practice.

## Post-Design Constitution Re-check

Re-evaluated after Phase 1 artifacts: **all five principles still pass, unchanged.** The design added no dependency, no page, no abstraction layer and no test file. The one new artifact is a mock seed addition (G-C). The codegen sequence verified in Phase 0 keeps Principle II satisfied without any hand-edit to generated output, which was the only principle at real risk going in.
