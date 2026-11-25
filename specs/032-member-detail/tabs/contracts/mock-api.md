# Phase 1 Contracts: Member Detail — The 10 Tabs

**Feature**: `022-member-detail-tabs` | **Date**: 2026-07-29 | **Plan**: [plan.md](./plan.md)

Two parts:

1. **Contract changes in this feature** — what Stream B edits in `src/app/api/_schemas/member.schema.ts` and the mock routes.
2. **Backend request register** — everything the design doc is missing or models differently, ready to hand to the backend team.

All Phase 1 routes are Next.js route handlers under `src/app/api/crm/…`, each registered through `registerRoute` so the Zod schema is the single source of the OpenAPI spec. After Stream B, run once:

```bash
npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client
```

---

## Part 1 — Contract changes in this feature

### C-1. `PATCH /crm/members/{id}/contracts/main-contract/change` — now creates an application (FR-013a)

**Request** (unchanged): `{ "contract_id": "MC002" }`

**Response 200** (changed): the main contract **as it still is**, now carrying the pending application.

```jsonc
{
  "id": "MC001",
  "planName": "レギュラー会員",
  "monthlyFee": 7700,
  "startDate": "2024-04-01",
  "pendingPlanChange": {
    "applicationId": "PPC-0001",
    "toPlanId": "MC002",
    "toPlanName": "プレミアム会員",
    "toMonthlyFee": 11000,
    "effectiveFrom": "2026-08-01",
    "requestedAt": "2026-07-29T10:12:00+09:00",
    "requestedBy": "管理者A",
  },
}
```

**Behaviour change**: the handler no longer mutates the member's plan. It records the application and returns the unchanged contract plus `pendingPlanChange`.

**New error**: `409` when a pending application already exists — `{ "code": "E-PLAN-409", "message": "A plan change is already pending" }`. FR-013a; the card also disables the trigger, but the server is the arbiter (research R-4).

**Existing errors**: `400` invalid body, `404` member/contract not found, `500`.

### ~~C-2. `POST /crm/members/{id}/contracts/main-contract/change/cancel`~~ — withdrawn 2026-09-09

The route was created for FR-013a's cancel affordance and **deleted on 2026-09-09** together with the UI
control, the two `CancelPlanChange*` schemas and its entry in `_routes/index.ts`. No requirement source
defines the operation (`A-01 FR-006`, the approved design doc, qa-137) — see spec.md FR-013a / Out of Scope.
A pending application now only advances at month start.

### C-3. `GET /crm/members/{id}/contracts/main-contract` — expose the pending application

**Response**: `MainContractSchema` gains the optional `pendingPlanChange` object (shape as in C-1). The member bundle's `currentMainContract` gains the same optional field, so the head-up card can reflect it without a second query.

### C-4. `GET /crm/members/{id}/contracts/summary` — add `nextBillingDate` (P-01)

```jsonc
{
  "planName": "レギュラー会員",
  "totalMonthlyFee": 11000,
  "billingDay": 27, // retained for Phase 2 compatibility
  "nextBillingDate": "2026-08-27", // NEW — the concrete date the card renders
  "paymentMethod": "credit_card",
  "unpaidAmount": 0,
}
```

Derived in the mock from `billingDay` relative to today. The card shows the date; `billingDay` is no longer rendered.

### C-5. `GET /crm/members/{id}/contracts/day-pass-history` — widen the status enum (P-02 / G-08)

`DayPassStatus`: `used | unused | expired` → **`active | pending_start | used | expired | cancelled`**.

| Value           | Label      | Meaning                             |
| --------------- | ---------- | ----------------------------------- |
| `active`        | 有効       | Purchased, usable now               |
| `pending_start` | 開始前     | Purchased, validity has not started |
| `used`          | 利用済み   | Consumed                            |
| `expired`       | 期限切れ   | Validity elapsed unused             |
| `cancelled`     | キャンセル | Purchase cancelled                  |

Seed data gains at least one row per new value so every badge is reachable in the mock.

### C-6. Option-contract writes — caller-role guard (FR-015a)

Applies to `POST /crm/members/{id}/contracts/option-contracts`, `PATCH …/option-contracts/change` and `PATCH …/option-contracts/cancel`.

Each resolves the caller from the `Authorization` bearer token and rejects roles outside 「オプション操作」:

**New errors**: `401` when the token is missing or invalid; `403` — `{ "error": "オプション操作の権限がありません" }` — for Trainer and Observer. `System`, `Headquarter`, `Manager` and `Staff` pass.

The matching `GET …/option-contracts` stays open to every role that can read the member (Observer included) — the matrix restricts the operation, not the view.

> The UI disables the controls too (FR-015a), but the server is the arbiter: hiding a button is not a permission check.

---

## Part 2 — Backend request register

Ordered by blocking impact. Rows marked **(clarified)** were decided in the 2026-07-29 session and are commitments, not open questions.

### ~~BR-1 — Cancel a pending plan change~~ — **withdrawn 2026-09-09**

~~The design doc defines `POST …/contracts/{contractId}/plan-changes` (create) but no way to cancel a pending application. FR-013a requires one. Requested: `DELETE …/plan-changes/{planChangeApplicationId}` (or a status transition).~~ Nothing is asked of the backend: the cancel operation is out of scope (spec.md FR-013a / Out of Scope).

What **does** stand from this row: `pendingPlanChange` exposed on the member/contract read so the CRM can render the pending state — the client confirmed it in qa-137 (2026-08-05) and the dev API still lacks it.

### BR-2 — Member-scoped survey responses **(clarified — Q3)**

`GET /api/v1/admin/members/{memberId}/questionnaire-responses` → `items[] {id, questionnaireId, questionnaireName, questionnaireType (lifecycle|operational), respondedAt}` + pagination. Today only `GET /questionnaires/{id}/responses` exists, which cannot answer "all responses by this member" without a client-side fan-out (explicitly rejected by FR-033). Domain: `G-04`.

### BR-3 — Member-scoped notification opt-in **(clarified — Q1)**

A read returning this member's per-channel opt-in (`push` / `in_app` / `email` / `sms`, each with `enabled` + `updatedAt`). The existing brand/store settings and `GET /admin/notification-settings/resolved` describe policy, not the member's own choices, and must not be substituted. Domain: `I-03`.

### BR-4 — Explicit body-data consent status **(clarified — Q4)**

The design doc's `GET …/body-data` returns a `consent` object when granted and `403` otherwise — two states. FR-038 needs three: `granted` / `not_consented` / `refused`. Requested: an explicit consent-status field readable **without** fetching body data (ideally on the member bundle), so the CRM can pick the right message without ever requesting health data for a non-consenting member.

### BR-5 — Server-side billing-status derivation **(clarified — Q2)**

The API models `confirmStatus` (pending / confirmed / unconfirmed) × `collectionStatus` (8 values). `A-01 FR-009` and the UI need **one** badge. Requested: the backend publishes the mapping and returns the derived single status; collection state takes precedence once the bill is confirmed. Proposed mapping to confirm:

| Derived  | Condition                                                                  |
| -------- | -------------------------------------------------------------------------- |
| 未確定   | `confirmStatus = pending \| unconfirmed`                                   |
| 確定     | `confirmStatus = confirmed` and `collectionStatus ∈ {not_due, in_transit}` |
| 入金済み | `collectionStatus ∈ {collected, partially_refunded, fully_refunded}`       |
| 未回収   | `collectionStatus = uncollected`                                           |
| 貸倒     | `collectionStatus = written_off`                                           |

(`cancelled` needs a decision: hide the row or add a sixth badge.)

### BR-6 — Reads with no endpoint in the design doc

Each is a mock-only route today; the screen cannot drop the card (see spec Assumptions).

| #   | Card                     | Requested endpoint                          | Payload the UI needs                                                                                                                                  |
| --- | ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| a   | 家族会員                 | `GET …/members/{id}/family-members`         | members `{id, memberNumber, name}` + the family `limit` (the card shows remaining capacity)                                                           |
| b   | 入退館設定               | `GET …/members/{id}/access-settings`        | `authMethod`, `icCardNumber`, `qrCode`, `gateStop`                                                                                                    |
| c   | 契約サマリー             | `GET …/members/{id}/contract-summary`       | `planName`, `totalMonthlyFee` (main + options), `nextBillingDate`, `paymentMethod`, `unpaidAmount`                                                    |
| d   | 支払いサマリー           | `GET …/members/{id}/payment-summary?period` | `periodLabel`, `totalSales`, `refundTotal`, `netAmount`, `lastPaymentDate`, `paymentMethod`                                                           |
| e   | 利用状況                 | `GET …/members/{id}/usage-status`           | monthly visits + MoM delta, cumulative + last-30-day visits, peak time slot, frequent store, monthly lessons + delta, monthly option uses + breakdown |
| f   | オプション利用履歴       | `GET …/members/{id}/option-usages`          | `{date, storeName, optionName, count}` + pagination                                                                                                   |
| g   | 主契約 (read)            | —                                           | Either a dedicated read or a guarantee that the member bundle's contract block is authoritative (today we duplicate it)                               |
| h   | 個別会費調整 (list)      | `GET …/members/{id}/fee-adjustments`        | the create/delete pair exists; the list does not                                                                                                      |
| i   | オプション契約 (list)    | `GET …/members/{id}/option-contracts`       | the three writes exist; the list does not                                                                                                             |
| j   | トレーニング記録 summary | `GET …/training-records` + `summary`        | count, total minutes, total kcal, most-frequent routine for the selected period — the card cannot compute these from one page                         |

### BR-7 — Field-level mismatches deferred to Phase 2

Recorded so the Phase 2 switch is mechanical. No Phase 1 code change (research R-8).

| Gap  | Endpoint              | Mismatch                                                                                                                                                                                                                                                                                                     |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G-11 | payments              | Design: `paidAt`, `paymentMethod` enum, `paymentStatus`, `receiptNumber`, `storeName`, absolute `from`/`to`. Ours: `date`, `content`, `method`, signed `amount`, relative `period`, `sale`/`refund` type. Refund-as-negative-amount has no equivalent (the API uses `refunded` / `partial_refund` statuses). |
| G-12 | billings              | Two status axes + `billingType` (7 values vs our 月次/都度) + optional line `items`. See BR-5.                                                                                                                                                                                                               |
| G-14 | access-logs           | `companion_entry` event type, `result` (`allowed`/`denied`) + `denialReasonDetail`, `authMethod` × `authChannel`. We render one 認証方法 label and never show denied attempts.                                                                                                                               |
| G-15 | lesson-bookings       | 7 statuses (incl. who cancelled, `no_show`) vs our 4; plus `lessonSchedule.scheduledAt`/`storeName`, `isTrial`, `paymentType`.                                                                                                                                                                               |
| G-17 | points                | `balance[]` per brand group + one `transactions[]` (`eventType`, `balanceAfter`, `sourceType`, `expiredAt`) + pagination, vs our single balance, split earn/spend arrays and unpaginated month scope. `pointName` maps to `balance[].pointName`.                                                             |
| G-19 | training-records      | `startedAt`/`endedAt` (no `durationMin`), `trainingType`, `totalVolumeKg`, `totalSets`, `condition`, `memo`, `storeName`; absolute range only.                                                                                                                                                               |
| G-20 | body-data             | Paginated `bodyRecords` + `bodyMeasurements`, `*Kg`/`*Cm` names, `healthkit` / `health_connect` sources, no `height`, no `limbLeanMass`, no chart series.                                                                                                                                                    |
| G-21 | referrals             | No reward-granted flag (our 特典付与 column and two summary figures depend on it); `stats.approvedCount` vs our reward counts; `ownReferralCode` unused by the UI.                                                                                                                                           |
| G-22 | change-history        | `snapshot` + `source` (5-table UNION) + `changedBy {type, staffId, staffName, role, actor}` vs our pre-diffed `changes[]` + `operatorName`. **Who computes the diff must be settled** — if the backend ships snapshots, the client needs a diffing rule the spec does not define.                            |
| G-07 | campaign-applications | `current`/`historical`, `discountSummary`, `appliedFrom`/`appliedTo`, `promotionCode`, status `active`/`expired`/`cancelled` — our 適用予定 state has no equivalent in that enum.                                                                                                                            |
| G-08 | one-day-passes        | No purchase **amount** field, though the card shows 金額; `passType` (1DayPass / 1TimePass) and `optionName` unused.                                                                                                                                                                                         |
| G-10 | suspension history    | Only a cross-member application list exists; we read a member-scoped route.                                                                                                                                                                                                                                  |
| G-04 | plan changes          | Contract-keyed `POST …/plan-changes` vs our member-keyed `PATCH …/main-contract/change` (Phase 2 path switch; semantics already aligned by C-1).                                                                                                                                                             |

### BR-9 — Mock-DB limitation found during implementation (not a backend request)

`db.contracts` keys contract rows by **plan master**, and `getByMemberId` resolves through `member._listMeta.contract_id`, so members sharing a plan share one contract row. A pending plan change (C-1) registered for one member therefore shows on every member holding that plan, and seeding one would misrepresent the others. This is a pre-existing mock-DB modelling limitation, unaffected by Phase 2 (the real API keys plan changes by `contractId`). Fixing it means giving members their own contract rows — a mock-DB refactor outside this feature.

### BR-8 — Readiness question (Q5, resolved 2026-07-29)

**Answered: treat the member-history endpoints as design-only.** Phase 1 reads every tab from the project's mock API; the contracts above stay the Phase 2 target. The original question text follows for context.

The tags backing 14 of the 27 data sources (_Member Financial History_, _Member Activity History_, _Member Relations History_) are absent from `x-tagGroups`, which by project convention means "backend not ready" — but the umbrella group _Member History Tabs_ appears to stand for exactly them. Confirmation needed to sequence Phase 2 integration. It does not affect Phase 1: all of them run on mocks.
