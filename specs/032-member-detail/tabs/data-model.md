# Phase 1 Data Model: Member Detail — The 10 Tabs

**Feature**: `022-member-detail-tabs` | **Date**: 2026-07-29 | **Plan**: [plan.md](./plan.md)

Nine of the ten tabs are read-only, so this document is mostly a **read model**: what each tab consumes and from where. Only 契約操作 writes, and only one of its writes changes shape in this feature (FR-013a). Field names below are the Phase 1 (project) names; the Phase 2 (design-doc) names are in [contracts/mock-api.md](./contracts/mock-api.md).

---

## 1. New in this feature

### PendingPlanChange (new)

The only new entity. Created by 主契約変更, consumed by the 主契約 card, removed by cancellation or by the month-start job.

| Field           | Type                | Notes                                                                            |
| --------------- | ------------------- | -------------------------------------------------------------------------------- |
| `applicationId` | string              | Identity (2026-09-09: no longer a cancel target — the operation is out of scope) |
| `toPlanId`      | string              | Destination plan master ID                                                       |
| `toPlanName`    | string              | Denormalised for display without a second query                                  |
| `toMonthlyFee`  | integer             | Denormalised; lets the card show 現行 → 変更後 without loading the plan master   |
| `effectiveFrom` | date (`YYYY-MM-01`) | Always the 1st of the month following creation (`A-01 FR-006`)                   |
| `requestedAt`   | datetime            | Audit                                                                            |
| `requestedBy`   | string              | Operator name; audit                                                             |

**Relationships**: exactly 0 or 1 per member's active main contract. Exposed as an optional `pendingPlanChange` on both `GetMainContractResponse` and the bundle's `currentMainContract` — the same optional-object shape already used by `activeFeeAdjustment`, `activeSuspension` and `pendingWithdrawal`.

**Validation rules**:

- Creating one while another is pending → rejected (`409`). FR-013a.
- `toPlanId` MUST differ from the current plan's master ID (the destination list already excludes it; the server re-checks).
- `effectiveFrom` is server-derived, never client-supplied.

**State transitions**:

```text
(none) ──create──▶ pending ──month-start job──▶ applied  (contract's plan + monthlyFee change; pending cleared)
```

2026-09-09: the `pending ──cancel──▶ (none)` transition was withdrawn — cancelling a pending
application is out of scope (spec.md FR-013a / Out of Scope), so `pending` only ever advances.

The `applied` transition is out of scope for Phase 1 — no job exists; the state is reachable in the mock only by seeding.

---

## 2. Changed in this feature

| Entity                                          | Change                                                                                                                                                                                            | Driver     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **ContractSummary**                             | Add `nextBillingDate` (date). `billingDay` (int 1–31) is retained for Phase 2 compatibility; the card renders the date.                                                                           | P-01       |
| **DayPassPurchase**                             | `status` widens from `used \| unused \| expired` to `active \| pending_start \| used \| expired \| cancelled`, matching the design doc. Labels: 有効 / 開始前 / 利用済み / 期限切れ / キャンセル. | P-02, G-08 |
| **MainContract (read)**                         | Gains the optional `pendingPlanChange` above.                                                                                                                                                     | FR-013a    |
| **MemberDetail bundle → `currentMainContract`** | Gains the same optional `pendingPlanChange`.                                                                                                                                                      | FR-013a    |

Nothing else in the data model changes.

---

## 3. Read model per tab (unchanged unless noted)

### Shared — Member detail bundle (`GET /crm/members/{id}`)

Consumed by the tab shell and by 基本情報, 契約操作 and ボディーデータ.

| Group           | Fields used by the tabs                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity        | `memberId`, `memberNumber`, `personalInfo` (last/first name + kana, `dateOfBirth`, `gender`, `postalCode`, `prefecture`, `city`, `streetAddress`, `building`, `phone`, `email`)                                                                   |
| Enrollment      | `enrolledAt`, `primaryStore {storeId, code, name}`, `brandEnum`, `enrollmentCampaign {name}`, `referral.byMember {memberId, memberNumber, displayName}`                                                                                           |
| Activity        | `lastEntryAt`, `monthlyVisitCount`, `totalVisitCount`                                                                                                                                                                                             |
| Contract        | `currentMainContract {contractId, plan{planId,name,code,monthlyFee}, contractStatus, startDate, usageStartDate, cancellationFeeUntil, activeFeeAdjustment?, activePointDiscount?, activeSuspension?, pendingWithdrawal?, **pendingPlanChange?**}` |
| Status & gating | `memberStatus`, `constraints {hasUnpaidFee, inCancellationPeriod}`, `gateStop {pattern}`, `blacklist {isActive}`                                                                                                                                  |
| Privacy         | `bodyDataConsentStatus` — `granted \| pending \| denied`; the sole input to FR-038's three states                                                                                                                                                 |

### Tab 1 — 基本情報

| Card         | Source                                | Key fields                                                                                     |
| ------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 個人情報     | bundle                                | `personalInfo.*`, age computed from `dateOfBirth`                                              |
| 入会情報     | bundle                                | `enrolledAt`, `primaryStore.name`, `brandEnum`, `referral.byMember`, `enrollmentCampaign.name` |
| 家族会員     | `GET …/family-members`                | `members[] {id, member_number, name_kanji}`, `limit`; remaining = `limit − members.length`     |
| 来館情報     | bundle                                | tenure derived from `enrolledAt`, `lastEntryAt`, `monthlyVisitCount`, `totalVisitCount`        |
| 入退館設定   | `GET …/usage-history/access-settings` | `authMethod`, `icCardNumber`, `qrCode`, `gateStop`                                             |
| 通知受信設定 | `GET …/notification-settings`         | `channels[] {channel: push\|in_app\|email\|sms, enabled, updatedAt}` — read-only (FR-011)      |

### Tab 2 — 契約操作

| Card             | Source                                     | Key fields                                                                                                                                      |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 主契約           | `GET …/contracts/main-contract` + bundle   | `id`, `planName`, `monthlyFee`, `startDate`, **`pendingPlanChange?`**; `activeFeeAdjustment` drives the 適用中 badge                            |
| 主契約変更 sheet | `GET /crm/stores/{id}/main-contracts`      | `main_contracts[] {id, name, price_including_tax}`, current plan excluded by master ID                                                          |
| 個別会費調整     | `GET …/fee-adjustments`                    | `items[] {id, startDate, endDate, pattern, value, reason, setBy, status}` — `value` is an unsigned magnitude; the pattern carries the direction |
| オプション契約   | `GET …/contracts/option-contracts`         | `[] {id, name, monthlyFee, startDate, nextBillingDate, status}`                                                                                 |
| キャンペーン適用 | `GET …/contracts/campaigns`                | `active[]` + `history[]` of `{id, campaignName, discountContent, periodStart, periodEnd, status}`                                               |
| 1DayPass購入履歴 | `GET …/contracts/day-pass-history?from&to` | `dayPassHistory[] {id, purchasedAt, storeName, amount, expiresAt, **status (5 values)**}`                                                       |
| 契約サマリー     | `GET …/contracts/summary`                  | `planName`, `totalMonthlyFee`, `billingDay`, **`nextBillingDate`**, `paymentMethod`, `unpaidAmount`                                             |
| 休会・退会履歴   | `GET …/suspension-history`                 | `items[] {id, type, status, startMonth, endMonth}` → expanded to a per-month strip                                                              |

### Tab 3 — 支払い履歴

| Card           | Source                                         | Key fields                                                                                                                            |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 入出金明細     | `GET …/payment-history?page&limit&period&type` | `items[] {id, date, type: sale\|refund, content, amount (signed), method}`, `total`, `limit`                                          |
| 請求一覧       | `GET …/billing?page&limit`                     | `items[] {id, month, type: monthly\|oneTime, amount, status, billingDate}`; `status` is the single server-derived badge (FR-022, R-5) |
| 支払いサマリー | `GET …/payment-summary?period`                 | `periodLabel`, `totalSales`, `refundTotal`, `netAmount`, `lastPaymentDate`, `paymentMethod`                                           |

### Tab 4 — 利用履歴

| Card               | Source                                            | Key fields                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 入退館履歴         | `GET …/usage-history/entries?from&to&page&limit`  | `items[] {id, occurredAt, storeName, eventType: entry\|exit, authMethod}`                                                                                                                                                |
| レッスン予約履歴   | `GET …/usage-history/lessons?from&to&page&limit`  | `items[] {id, lessonDate, lessonName, instructorName, status: attended\|absent\|cancelled\|reserved}`                                                                                                                    |
| オプション利用履歴 | `GET …/contracts/option-usage?from&to&page&limit` | `items[] {id, date, storeName, optionName, count}`                                                                                                                                                                       |
| 利用状況           | `GET …/usage-status`                              | `monthlyVisits(+Diff)`, `peakTimeSlot`, `frequentStore`, `monthlyLessons(+Diff)`, `monthlyOptions`, `monthlyOptionsBreakdown[] {label, count}` — nullable fields are omitted from the card, never rendered as 0 (FR-028) |

### Tab 5 — ポイント履歴

`GET …/points?from&to` → `pointName` (brand-resolved server-side, FR-031), `pointBalance`, `earnHistory[] {id, date, reason, points}`, `spendHistory[] {…}`, `expiringPoints`, `expiringAt`. The client merges earn+spend into one sorted table; it never derives the point name.

### Tab 6 — アンケート回答

`GET …/survey-responses` → `items[] {id, surveyName, surveyType: lifecycle\|operational, responseDate}`. One member-scoped read; no fan-out (FR-033).

### Tab 7 — トレーニング記録

`GET …/training-records?period` → `trainingHistory[] {id, date, routineName, durationMin, calories}` + `summary {trainingCount, totalDurationMin, totalCalories, mostFrequentRoutineName}`. Summary is server-computed for the selected period.

### Tab 8 — ボディーデータ

Consent from the bundle (`bodyDataConsentStatus`); data only when `granted`, from `GET …/body-data` → `latest`, `bodyComposition` (12 metrics), `bodyMeasurement` (10 + `height`), `weightChart[] {date, weight}`, `history[] {id, date, source, weight, fatPercent}`.

### Tab 9 — 紹介関係

`GET …/referrals` → `inboundFlag`, `referrer {memberId, memberNumber, displayName}`, `invitees[] {memberId, memberNumber, displayName, joinedAt, rewardGranted}`, `stats {totalReferred, rewardGrantedCount, rewardPendingCount}`.

### Tab 10 — 変更履歴

`GET …/change-history?page&limit` → `items[] {id, changedAt, operatorName, action, changes[] {field, fieldCode, before, after}}`, `total`, `limit`. Seed-only: no create / update / delete path exists or is added (FR-047).

---

## 4. Cross-cutting rules

- **Every list response carries `total` + `limit`** so the shared `TablePagination` can render without a second count query. The month-scoped lists (`from`/`to`) paginate within the selected month.
- **Aggregates are server-computed** (契約サマリー, 支払いサマリー, 利用状況, 記録サマリー, ポイントサマリー, 紹介サマリー). A card must never sum a paginated page — the figure would contradict the table next to it.
- **Enum → label mapping lives in the client**; enum _values_ are always the API's. No Japanese string is ever sent as a value.
- **`null` means "unknown"**, and a card omits the row rather than printing `0` (FR-004, FR-028).
- **Nothing on the read-only tabs mutates**: ポイント履歴, アンケート回答, トレーニング記録, ボディーデータ, 紹介関係 and 変更履歴 issue `GET` only.
