# Implementation Plan: Member Detail — The 10 Tabs

**Branch**: `022-member-detail-tabs` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-member-detail/tabs/spec.md`

## Summary

All 10 tabs already exist under `src/app/(private)/members/[id]/_components/tabs/` and are mounted from [page.tsx](<src/app/(private)/members/[id]/page.tsx>). This is a **verify-and-update pass**, and after the 2026-07-29 clarification session it has exactly one genuinely new capability:

> **FR-013a — 主契約変更 becomes a pending plan-change application** with a visible pending state on the 主契約 card (the cancel path was withdrawn 2026-09-09 — see spec.md FR-013a). Everything else is display corrections, one enum widening, and documentation for the backend team.

Technical approach: stay inside the one route folder plus its mock API routes. Every contract change starts as a Zod schema in `src/app/api/_schemas/member.schema.ts` and reaches the typed client purely by regeneration — the generated client is never hand-edited (Constitution II). No new page, no new dependency, no new abstraction layer.

Two findings shaped the plan:

1. **The codegen chain is clean.** Verified 2026-07-29 on this branch: `npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client` produces an **empty diff** against the committed `src/lib/openapi.json` and `src/lib/api/*.gen.ts`. Contract work is therefore mechanical: edit Zod → regenerate → consume typed output.
2. **The member bundle does not yet model a pending plan change.** `MemberCurrentMainContractSchema` ([member.schema.ts:701](src/app/api/_schemas/member.schema.ts)) carries `usageStartDate`, `cancellationFeeUntil`, `activeFeeAdjustment`, `activePointDiscount`, `activeSuspension` and `pendingWithdrawal` — but nothing for a scheduled plan change. FR-013a is the only requirement in this feature that needs a new read-model field and a new write path.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4, recharts (already used by the body-data chart)
**Storage**: Phase 1 — `src/app/api/_mock-db/`; Phase 2 — generated REST client via hey-api
**Target Platform**: Node.js ≥ 24.0.0, browser (web)
**Project Type**: Web application — single Next.js project, App Router, route-local co-location
**Performance Goals**: Interaction-level only. A tab switch is a client-side panel change with no full-page reload (SC-008); a filter change keeps prior rows on screen under a dimming indicator instead of a skeleton (SC-007); a successful contract write refreshes the affected cards and the head-up card by query invalidation with no manual reload (SC-006).
**Constraints**: No automated tests of any kind (Constitution: No Testing Policy). No new npm packages (Constitution V). Quality gate is `npm run lint` + `npm run type-check` + manual verification against [quickstart.md](./quickstart.md). Nine data sources have no real backend endpoint and stay on mock routes for Phase 1 (see [contracts/mock-api.md](./contracts/mock-api.md)).
**Scale/Scope**: 1 page, 10 tabs, 27 cards across 27 project components, ~24 mock API routes, 1 Zod schema file. 47 functional requirements, 11 prototype gaps (P-01…P-11), 22 API-contract gaps (G-01…G-22), 5 resolved clarifications.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check | Notes                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑     | Every tab already types its props and rows from generated types (`GetMemberDetailResponse`, `GetCrmMembersByIdChangeHistoryResponse`, `BodyDataSource`, …). The new pending-plan-change model is added as a Zod schema and consumed through its generated type — no hand-written mirror type, no `any`, no unnarrowed `unknown`.                                                          |
| II  | OpenAPI-First          | ☑     | **Verified 2026-07-29 on this branch**: the full codegen chain produces an empty diff, so the committed spec matches the Zod schemas exactly. All contract changes in Stream B start in `_schemas/member.schema.ts`; nothing under `src/lib/api/` is edited by hand.                                                                                                                      |
| III | Spec-Driven            | ☑     | `spec.md` complete; Q1/Q2/Q3/Q4/Q8 resolved in the 2026-07-29 clarification session and folded into FR-011, FR-013a, FR-022, FR-033, FR-038; Q5/Q6/Q7 answered the same day before implementation and folded into FR-026, FR-032, FR-037 and gaps P-04/P-05. **No `[NEED CLARIFICATION]` markers remain and the requirements checklist is complete.** This `plan.md` precedes `tasks.md`. |
| IV  | App Router & Simple UX | ☑     | All tab components are `'use client'` — justified: each owns filter state and a React Query subscription. They stay under `_components/tabs/` co-located with the route. shadcn/ui + Tailwind only, icons from `lucide-react`. FR-013a adds an inline pending block — no wizard, no extra page (the confirm dialog on cancel was withdrawn 2026-09-09).                                   |
| V   | Simplicity & Min. Deps | ☑     | Zero new packages. The pending-plan-change state reuses the existing card + `AlertDialog` patterns rather than introducing a generic "pending application" abstraction (rejected — see [research.md](./research.md) R-2). Billing-status derivation stays a single server-supplied field instead of a client-side rule engine (R-5).                                                      |

**Principle III note on the last three answers (2026-07-29, pre-implementation)**: Q5 — the member-history endpoints are **design-only**, so Phase 1 reads every tab from the mock API and any missing mock route is created here (no UI consequence; it settles Phase 2 sequencing). Q6 — **follow the prototype**: the point refund stays inside 休会申請 (feature `021`), so both ポイント履歴 and 紹介関係 stay read-only. Q7 — **the prototype wins**: レッスン状態 is relabelled to 受講済み / キャンセル / 予約中 (欠席 kept for the `absent` state the prototype never renders), and the training-records empty message is unchanged. Only Q7 changes code, and only in one label map — Stream A absorbs it.

> No unchecked boxes. Complexity Tracking is empty and omitted.

## Project Structure

### Documentation (this feature)

```text
specs/032-member-detail/tabs/
├── spec.md              # Feature specification (Clarifications + Gap Analysis + Q&A)
├── plan.md              # This file
├── research.md          # Phase 0 — decisions behind each resolution
├── data-model.md        # Phase 1 — read model per tab + write payloads
├── contracts/
│   └── mock-api.md      # Phase 1 — endpoint-by-endpoint contract changes + backend requests
├── quickstart.md        # Phase 1 — manual verification checklist (the QA gate)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/app/(private)/members/[id]/
├── page.tsx                                        # tab bar, ?tab= sync, tab mounting        → (no change)
└── _components/tabs/
    ├── basic-info-tab/index.tsx                    # 1 基本情報                                → (no change)
    ├── contracts-tab/
    │   ├── index.tsx                               # 2 契約操作 layout                         → (no change)
    │   ├── main-contract-card.tsx                  #   主契約 + 変更 sheet                     → FR-013a
    │   ├── fee-adjustment-card.tsx / -sheet.tsx    #   個別会費調整                            → (no change)
    │   ├── option-contracts-card.tsx               #   オプション契約 + 3 sheets                → (no change)
    │   ├── campaigns-card.tsx                      #   キャンペーン適用                         → P-03
    │   ├── day-pass-history-card.tsx               #   1DayPass購入履歴                        → P-02
    │   ├── contract-summary-card.tsx               #   契約サマリー                            → P-01
    │   └── suspension-history-strip.tsx            #   休会・退会履歴                           → (no change)
    ├── payment-history-tab/                        # 3 支払い履歴 (4 files)                    → (no change)
    ├── usage-history-tab/                          # 4 利用履歴 (6 files)                      → (no change)
    ├── points-tab/index.tsx                        # 5 ポイント履歴                             → (no change)
    ├── survey-response-tab/index.tsx               # 6 アンケート回答                           → (no change)
    ├── training-records-tab/index.tsx              # 7 トレーニング記録                          → (no change)
    ├── body-data-tab/index.tsx                     # 8 ボディーデータ                            → (no change)
    ├── referral-tab/index.tsx                      # 9 紹介関係                                 → (no change)
    └── change-history-tab/index.tsx                # 10 変更履歴                                → (no change)

src/app/api/
├── _schemas/member.schema.ts                       # Zod contracts                             → FR-013a, P-01, P-02
├── _mock-db/seeds/member.seed.ts                   # seed data (change history stays seed-only) → FR-013a
└── crm/members/[id]/contracts/
    ├── main-contract/route.ts                      # GET 主契約                                 → FR-013a (expose pending)
    ├── main-contract/change/route.ts               # create the plan-change application         → FR-013a
    ├── day-pass-history/route.ts                   # 5-value status                             → P-02
    └── summary/route.ts                            # nextBillingDate                            → P-01

src/lib/openapi.json                                # generated — regenerate, never hand-edit
src/lib/api/*.gen.ts                                # generated — regenerate, never hand-edit
```

**Structure Decision**: keep the existing route-local co-location — every file this feature touches already exists except one new mock route. `page.tsx` stays the sole owner of the tab bar and `?tab=` sync; each tab owns its own filters and queries; each card owns its own query and its own loading/error/empty boundary. That split already holds across all 27 cards and is preserved, which is why 22 of the 27 cards need no change at all.

## Work Breakdown

Four streams. Stream A is display-only and can ship independently; Stream B changes contracts and ends with exactly one codegen run; Stream C is a verification sweep; Stream D is documentation for the backend team.

### Stream A — Display corrections (frontend only, no contract change)

| Gap  | Change                                                                                                                                                                                              | File                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| P-03 | Render キャンペーン適用期間 at month granularity (`2025/07 〜 2025/09`) to match the prototype, instead of full dates                                                                               | `contracts-tab/campaigns-card.tsx`          |
| P-04 | **Relabel** レッスン状態 to the prototype's 受講済み / キャンセル / 予約中, keeping 欠席 for the `absent` state the prototype never renders (Q7 answered: the prototype wins)                       | `usage-history-tab/lesson-status-badge.tsx` |
| P-05 | **No code change** — the period-scoped empty message already follows the prototype (Q7). Recorded with a comment so a later `A-01`-parity pass does not "correct" it into the unconditional wording | `training-records-tab/index.tsx`            |

### Stream B — Contract changes (Zod → OpenAPI → client)

| Req / Gap       | Change                                                                                                                                                                                                                                                                                     | Where                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **FR-013a**     | Add `MemberPendingPlanChangeSchema` (`applicationId`, `toPlanId`, `toPlanName`, `toMonthlyFee`, `effectiveFrom`, `requestedAt`, `requestedBy`) and expose it as `pendingPlanChange` on both the main-contract read and the member bundle's `currentMainContract`                           | `_schemas/member.schema.ts`                                                                     |
| **FR-013a**     | Turn `PATCH …/contracts/main-contract/change` into "create a pending application" — it records the application instead of mutating the contract, and rejects a second one with `409` while one is pending                                                                                  | `contracts/main-contract/change/route.ts`                                                       |
| ~~**FR-013a**~~ | ~~New `POST …/contracts/main-contract/change/cancel` — cancels the pending application~~ **Withdrawn 2026-09-09** (spec.md FR-013a / Out of Scope) — route deleted                                                                                                                         | ~~`contracts/main-contract/change/cancel/route.ts`~~                                            |
| **FR-013a**     | Seed one member with a pending plan change so the state is reachable without performing a write                                                                                                                                                                                            | `_mock-db/seeds/member.seed.ts`                                                                 |
| **FR-013a**     | 主契約 card: render the pending block (destination plan + effective month; read-only — the cancel button + confirm dialog were withdrawn 2026-09-09); disable 変更 while pending with the reason stated; invalidate the main-contract, contract-summary and member-detail queries on write | `contracts-tab/main-contract-card.tsx`                                                          |
| **P-01**        | Add `nextBillingDate` to `GetContractSummaryResponseSchema`, compute it in the mock from `billingDay`, and render the concrete date (keep `billingDay` for Phase 2 compatibility)                                                                                                          | `_schemas/member.schema.ts`, `contracts/summary/route.ts`, `contract-summary-card.tsx`          |
| **P-02 / G-08** | Widen `DayPassStatus` from 3 to the design doc's 5 values (`active` / `pending_start` / `used` / `expired` / `cancelled`) and label them 有効 / 開始前 / 利用済み / 期限切れ / キャンセル — adopting the prototype's 利用済み wording                                                      | `_schemas/member.schema.ts`, `contracts/day-pass-history/route.ts`, `day-pass-history-card.tsx` |

Then, exactly once, at the end of Stream B:

```bash
npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client
npm run lint && npm run type-check
```

### Stream C — Verification sweep (no code unless a defect is found)

The other 22 cards are asserted correct by inspection during planning; Stream C confirms that against the running app using [quickstart.md](./quickstart.md) — every tab's four states, every filter's keep-previous-data behaviour, the three body-data consent states, and the read-only assertions on the five read-only tabs. Any defect found becomes a task, not a silent fix.

### Stream D — Backend requests (documentation only)

Recorded in [contracts/mock-api.md](./contracts/mock-api.md) for hand-off; no code change in this feature.

1. ~~**Cancel endpoint for a pending plan-change**~~ — **Withdrawn 2026-09-09** (spec.md FR-013a / Out of Scope): the operation is out of scope, so nothing is requested from the backend.
2. **`GET /admin/members/{memberId}/questionnaire-responses`** — member-scoped survey responses (`G-04` domain, Q3).
3. **Member-scoped notification opt-in read** — `I-03` domain; the brand/store `resolved` endpoint is not a substitute (Q1).
4. **Explicit body-data consent status** — so 拒否 is distinguishable from 未同意 (Q4).
5. **Server-side billing-status derivation** — the documented mapping from `confirmStatus` × `collectionStatus` onto 未確定 / 確定 / 入金済み / 未回収 / 貸倒 (Q2).
6. **Six mock-only reads with no design-doc endpoint**: 家族会員, 入退館設定, 契約サマリー, 支払いサマリー, 利用状況, オプション利用履歴 — plus the missing list endpoints for fee adjustments and option contracts, and the training-records summary block.

## Deferred within this feature

- **P-06** metric-switchable body-data chart — `A-01 FR-013` defers the chart's UI spec to the design phase; Phase 1 ships the prototype's fixed weight chart (already in the spec's Out of Scope).
- **P-07** body-data zero-measurement handling — the project's tab-level empty state is kept deliberately; reverting to the prototype's in-table empty row would render a summary of zeros.
- **P-09** change-history `source` / date filters — absent from the prototype; the tab stays seed-only and unfiltered in Phase 1.
- **P-10 / P-11** — dead prototype code and an unrendered mock field; nothing to build.
- **G-11 / G-14 / G-15 / G-17 / G-19 / G-20 / G-21 / G-22** — Phase 2 shape reconciliations at the real-API boundary. Changing our mock to the design doc's shape now would mean rewriting working cards twice; the mapping is recorded per endpoint in `contracts/mock-api.md` so the Phase 2 switch stays mechanical.
- **Q5 / Q6** — answered with no code consequence: the tabs already read from mocks (Q5), and the point refund already lives in feature `021`'s 休会申請 sheet (Q6). Q7 is the only one of the three that changes code, in Stream A's P-04 row.

## Post-Design Constitution Re-check

Re-evaluated after the Phase 1 artifacts: **all five principles still pass, unchanged.** The design adds no dependency, no page and no abstraction layer; it adds one mock route, one Zod schema block, one enum widening and one field. The only principle at real risk going in was II (OpenAPI-First), and the empty-diff verification plus the single end-of-stream codegen run keeps it satisfied without any hand-edit to generated output.
