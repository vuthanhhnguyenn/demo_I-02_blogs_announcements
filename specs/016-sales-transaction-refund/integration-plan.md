# Real API Integration Plan: F-01-01 / 02 / 03 — 入出金明細 / 請求・未回収管理 / 返金手続き一覧

**Branch**: `feat/integration-api-sales` | **Date**: 2026-10-20
**Specs**: [016-sales-transaction-refund](./spec.md) · sibling plan [015-sales-management](../015-sales-management/integration-plan.md) (same branch; its T001 regen is a prerequisite)
**Requirements**: `F-01.md` @ fitness-spec `5c391cf` (2026-09-28) — FR-002-a, FR-002-b, FR-004, FR-004-a, FR-005..010
**API spec**: fitness-api all-docs `d4130c9` (2026-10-16) — API-116 (transaction ledger), API-117 (receivables), API-118 (refunds), API-119 (refund export)
**Prototype**: fitness-crm-ui `f2fe3f9` (2026-10-14) — `sales-transaction-list.tsx`, `sales-receivable-list.tsx`, `sales-refund-list.tsx`
**Backend checked**: fitness-backend-v2 main `a9019888` / `5989fb50` (2026-10-19); MR !808 open
**Scope**: `src/app/(private)/sales/transactions/**`, `sales/receivables/**`, `sales/refunds/**` (none of them import the shared `sales/_*` folders)
**Target API**: `src/lib/api-real`, regenerated from the dev swagger (015 T001)

## Guiding principle

Same as the [015 plan](../015-sales-management/integration-plan.md#guiding-principle): spec first, spec'd
UI kept, values the API would reject stripped at one seam with `TODO(round2) Bn`; prototype-only
elements commented out with `TODO(round3) R3nn`. Mock routes, `_mock-db` and mock schemas are left
untouched.

**FR vs API divergences.** Round 1 follows the **API spec** where API-116/117/118 differ from
F-01.md — recorded in [spec.md → Clarifications → Session 2026-10-19](./spec.md#clarifications).
Only some of these carry an FR-owner notice in the API spec:

- 貸倒 replaces 払戻 — notice logged (API-116 §7.2 L648)
- refund approval → `processing` → mark-executed, with 7 statuses — notice logged (API-118 L1272)
- one 入出金明細 row = one billing — reversed by Otaki ruling B′ (2026-10-20): API-116 v0.7.3 returns one row per billing line (see Q5, B5)
- bad-debt exclusion per billing — **no notice**; asked Otaki, see Q1

## Endpoint mapping

Feasibility: **F-01-01 ~80%** · **F-01-02 ~85%** · **F-01-03 ~75%**.

| UI surface                                       | Real endpoint                                                                                                                                                                                                              | Hook                                                                                            | Round      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| **01** list + filters + 全N件                    | `GET /api/v1/admin/sales/transactions` (`fromDate` / `toDate` **required**, ≤12 months; `transactionType`, `storeIds`, `paymentMethod`, `memberName`, `status`, `sortBy` / `sortDir`, `page` / `limit`, `includeTotalAll`) | `adminTransactionControllerListOptions`                                                         | 1          |
| **01** CSV                                       | `GET …/transactions/export` (text/csv, same filters)                                                                                                                                                                       | `adminTransactionControllerExport` (blob)                                                       | 1          |
| **01** store dropdown                            | `GET /api/v1/admin/stores`                                                                                                                                                                                                 | `adminStoreControllerListOptions`                                                               | 1          |
| **01** refund dialog — lines + balances          | `GET /api/v1/admin/sales/billings/{billingId}` → `items[].refundableAmount`; alert from the tx row `refundApplyContext.alertVariant` (not on the billing detail)                                                           | `adminSalesBillingControllerDetailOptions`                                                      | 1          |
| **01** refund submit                             | `POST /api/v1/admin/sales/refund-applications`                                                                                                                                                                             | `adminRefundControllerCreateMutation` + 015's body util                                         | 1 → 2 (B1) |
| **02** 未回収 list + KPI cards                   | `GET /api/v1/admin/sales/receivables` (`summary.memberCount` / `totalUnpaid` / `byDisplayStatus`, `unpaidMonth`)                                                                                                           | `adminReceivableControllerListOptions`                                                          | 1          |
| **02** detail sheet                              | `GET …/receivables/{memberId}` (`includeKonbiniHistory`)                                                                                                                                                                   | `adminReceivableControllerMemberDetailOptions`                                                  | 1          |
| **02** コンビニURL発行                           | `POST …/receivables/{billingId}/konbini` (`additionalBillingIds` ≤11, `sendChannels` required)                                                                                                                             | `adminReceivableControllerIssueKonbiniMutation`                                                 | 1          |
| **02** 貸倒対象外 set / release                  | `POST` / `DELETE …/receivables/{billingId}/bad-debt-exclusion` (`reason` 1–500)                                                                                                                                            | `adminReceivableControllerSetExclusionMutation` / `…ReleaseExclusionMutation`                   | 1          |
| **02** 翌月請求予定 + SBPS / JACCS cards         | `GET …/billings/upcoming` (`summary.byPaymentMethod`)                                                                                                                                                                      | `adminReceivableControllerListUpcomingOptions`                                                  | 1          |
| **02** 全件一括確定                              | `POST …/billings/confirm-bulk` `mode=filter` → 202 `jobId`; poll `GET …/confirm-bulk/{jobId}`                                                                                                                              | `adminSalesBillingControllerBulkConfirmMutation` + `…BulkConfirmJobOptions` (new)               | 1          |
| **03** list + filters + sort                     | `GET …/refund-applications` (`displayStatus`, `paymentMethod`, `applicantRole`, `fromDate` / `toDate`, `q`, `sort` / `order`, `includeTotalAll`)                                                                           | `adminRefundControllerListOptions`                                                              | 1          |
| **03** 承認待ち count                            | same, `displayStatus=pending_approval`, `limit: 1`                                                                                                                                                                         | same                                                                                            | 1          |
| **03** detail sheet                              | `GET …/refund-applications/{applicationId}` (`lines`, `editableActions`, `refundability`)                                                                                                                                  | `adminRefundControllerDetailOptions`                                                            | 1          |
| **03** approve gate                              | `GET …/refund-applications/{applicationId}/refundability` (`blockReason`, `lines[].canRefund`)                                                                                                                             | `adminRefundControllerRefundabilityOptions`                                                     | 1          |
| **03** 承認 / 一括承認                           | `POST …/{applicationId}/approve` (`executionMethod` for JACCS), `POST …/bulk-approve`                                                                                                                                      | `adminRefundControllerApproveMutation`, `…BulkApproveMutation`                                  | 1          |
| **03** 却下                                      | `POST …/{applicationId}/reject` (`rejectionReason` 1–500 required)                                                                                                                                                         | `adminRefundControllerRejectMutation`                                                           | 1          |
| **03** 実行記録 (processing → refunded / failed) | `POST /api/v1/admin/sales/refunds/{refundId}/mark-executed` (Manager+, `can_execute_refund`)                                                                                                                               | `adminRefundControllerMarkExecutedMutation`                                                     | 1 (S4)     |
| **03** 返金CSV                                   | `POST …/refund-exports` → 202; poll `GET …/accounting-exports`; download via `csvUrl`                                                                                                                                      | `adminWriteoffAccountingControllerCreateRefundExportMutation` + `…ListAccountingExportsOptions` | 1 → 2 (B2) |

## Blockers carried into Round 2

| ID  | Blocker                                                                                                    | Spec says                                                                                                                                       | Round 1 behaviour (UI kept)                                                                                     | Round 2                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| B1  | `POST refund-applications` has no swagger body (MR !808)                                                   | FR-004 / API-118 §4                                                                                                                             | Reuse 015's `refund-application-body.util.ts` (single cast), `TODO(round2) B1`                                  | Regen after !808 → drop the cast                                              |
| B2  | `POST refund-exports` body typed `string` (MR !808)                                                        | FR-010 / API-119 §11: `{fromDate, toDate, brand?, storeIds?, refundMethods?}`; `refundMethods` ∈ cashpost / bank_transfer / cash / jaccs_manual | `refunds/_utils/refund-export-body.util.ts` (new): local type + single cast, `TODO(round2) B2`                  | Regen after !808 → drop the cast                                              |
| B3  | Before !808, `null` returns 400 for mark-executed `externalReferenceId` / `executorMemo` / `failureReason` | API-118 §12: optional                                                                                                                           | Omit empty keys; never send `null`. BE confirmed this stays valid after !808                                    | None — keep omitting                                                          |
| B4  | ~~Bad-debt exclusion grain~~ — resolved per billing (API-117 v0.11.2, 2026-10-20); nothing to change       | FR-007 L285                                                                                                                                     | Act per billing (`billingId`); the sheet's per-line action targets the line's billing and says so in the dialog | If Otaki picks B (per 明細): BE schema + EP change, FE switches to line-level |
| B5  | API-116 v0.7.3 one row per billing line (`rowKey`, `billingItemId`) — spec'd 2026-10-20, not in MR !808    | FR-002-a L383–386 / API-116 §3.5                                                                                                                | Billing-grain rows with joined `billingItemIds[]` (shipped)                                                     | R204                                                                          |
| B6  | `editableActions` lacks `markExecuted` (API-118 v0.14.4) — not in MR !808                                  | API-118 §6 / §12                                                                                                                                | FE derives the 実行記録 button (plan Round 1 result #3)                                                         | R205                                                                          |

## Spec'd but not built

| ID  | FR                                         | What the spec defines                                    | Missing in                                | Round 1?                                                                                                                     |
| --- | ------------------------------------------ | -------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| S1  | FR-004 (Dev Q&A 08-24)                     | 返金可能残高 in the 01 refund dialog, validated per line | code (validates against `amount_inc_tax`) | **Yes**                                                                                                                      |
| S2  | FR-004                                     | Partial refund per 明細 (choose line + amount)           | code (one amount box)                     | **Yes** — needed by G4 billing grain                                                                                         |
| S3  | FR-004-a 表示項目                          | 会員ID and 返金事由 columns in 返金一覧                  | code (detail sheet only)                  | No — noted                                                                                                                   |
| S4  | API-118 §12 (spec'd in the API, not in FR) | 実行記録 for non-SBPS refunds stuck in `processing`      | code + prototype                          | **Yes** — minimal: button in the detail sheet when `editableActions` allows it; outcome succeeded / failed + optional fields |

## Decisions

- **D1 — Transactions grain**: Round 1 ships one row = one billing (API-116 v0.7.1 as deployed). 請求明細ID shows `billingItemIds[]` joined (blank for `write_off`); 税率 shows 「混在」 when `taxRate` is null and the row is not `write_off`. **Superseded** by API-116 v0.7.3 (one row per line) — R204.
- **D2 — Transaction labels**: `sale` 売上 / `payment` 入金 / `refund` 返金 / `write_off` 貸倒 (API-116 §7.2). Status = `status` × `rawStatus.collectionStatus` → 確定 / 処理中 / キャンセル / 未収 (API-116 §7.2).
- **D3 — Date range**: when the filter is empty, send the default window (current month start → today); block ranges >12 months in the filter UI.
- **D4 — Search** → `memberName` (prefix match on member number / name / kana).
- **D5 — 01 refund dialog** loads the billing detail on open, lists its lines with `refundableAmount`, caps each amount (S1 / S2), alert copy from `refundApplyContext.alertVariant`.
- **D6 — Receivables actions** move from per-member to per-billing: konbini takes the oldest unpaid `billingId` + `additionalBillingIds` (≤11); `sendChannels` defaults to the member's registered channel(s).
- **D7 — KPI cards** come from `summary` (no more 200-row client aggregation).
- **D8 — 全件一括確定** = filter-mode job: show progress, poll `confirm-bulk/{jobId}` until done, then invalidate the upcoming list.
- **D9 — Refund status**: render the server's `displayStatus` (7 values: pending_approval / processing / refunded / failed / rejected / cancelled / expired). Labels shared with 015's 返金履歴 card.
- **D10 — Approve gate**: disable approve when `blockReason != null`; mark lines by `lines[].canRefund`. Copy for `ALREADY_REFUNDED` says the amount exceeds the refundable balance (it also covers over-amount). `no_payment_yet` falls into the default alert branch.
- **D11 — JACCS approval**: when `alertVariant = jaccs_manual_or_cashpost`, the approve dialog requires 手動返金 / CASHPOST (`executionMethod`). Bulk approve sends `executionMethod` only when every selected row is JACCS; otherwise rows that need it are reported as failures.
- **D12 — Reject**: required reason textarea (1–500) in the 却下 dialog.
- **D13 — Approver permission**: buttons follow the detail's `editableActions`; the list derives it from `appliedRole` / `approverLevel` vs the current role. The server still enforces it.
- **D14 — 返金CSV** is async: create → poll `accounting-exports` → download `csvUrl`; SBPS excluded (FR-010).
  - 2026-10-27 (review !214 #3): the export worker runs hourly (`:50`), so a request not ready within ~30 s is kept (per browser, `localStorage`) and listed in the dialog as 作成中 → ダウンロード once `exported` (15-min signed `csvUrl`, BE `e4144873`).
- **D15 — Errors by code**; local error toasts removed (shared `MutationCache`).

## Round 1 tasks

Prerequisite: 015 **T001** (regen) and **T003** (refund body util).

### Phase A — foundations

- [ ] **T101** [P] `sales/_constants/refund-status.constant.ts` (new, shared with 015 T027): 7 `displayStatus` labels + badge variants; `alertVariant` copy incl. `ALREADY_REFUNDED` wording (D10).
- [ ] **T102** [P] `transactions/_utils/transaction-labels.util.ts` (new): D1 / D2 mappers (type, status, tax-rate display, item ids).
- [ ] **T103** [P] `refunds/_utils/refund-export-body.util.ts` (new): B2 type + cast.

### Phase B — 01 入出金明細 (`transactions/**`)

- [ ] **T110** `_hooks/use-transactions-filters.hook.ts`: real query params, default date window, 12-month guard (D3, D4); page-size options capped at the schema `limit` max.
- [ ] **T111** `page.tsx` + `_components/transactions-table.tsx`: `adminTransactionControllerListOptions`, `includeTotalAll` for 全N件, D1 / D2 columns.
- [ ] **T112** `_components/transactions-filters.tsx`: store options from api-real; type options incl. 貸倒.
- [ ] **T113** `_components/transactions-csv-export-button.tsx`: export endpoint → blob download.
- [ ] **T114** `_components/transaction-refund-request-dialog.tsx` + schema: D5 (billing detail → per-line amounts capped by `refundableAmount`, reason required), body via 015 T003.

### Phase C — 02 請求・未回収 (`receivables/**`)

- [ ] **T120** `_hooks/use-receivables-filters.hook.ts` + `page.tsx`: receivables + upcoming list queries.
- [ ] **T121** `_components/unpaid-table.tsx` + `_utils/receivable-status.util.ts`: real row fields + `displayStatus` labels; KPI from `summary` (D7).
- [ ] **T122** `_components/unpaid-detail-sheet.tsx`: member detail endpoint; per-billing actions (D6, B4).
- [ ] **T123** `_components/convenience-payment-dialog.tsx`: konbini mutation, `additionalBillingIds`, `sendChannels`.
- [ ] **T124** `_components/bad-debt-exclusion-dialog.tsx` + schema: set / release per `billingId`, reason 1–500; HQ / Manager only (System removed).
- [ ] **T125** `_components/upcoming-billing-table.tsx` + `upcoming-billing-summary-cards.tsx`: upcoming list + `summary.byPaymentMethod`; comment out the 備考 column (R304).
- [ ] **T126** `_components/upcoming-billing-confirm-dialog.tsx`: filter-mode bulk confirm + job polling (D8).

### Phase D — 03 返金一覧 (`refunds/**`)

- [ ] **T130** `_hooks/use-refund-filters.hook.ts` + `_components/refund-filters.tsx`: `displayStatus` (7), `paymentMethod`, `applicantRole`, date range, `q`; sort limited to appliedAt / approvedAt / totalRefundAmount / status (R305 for the rest).
- [ ] **T131** `page.tsx` + `_components/refund-queue-table.tsx`: list query; comment out 対象商品 / 売上額 columns (R302).
- [ ] **T132** `_components/refund-pending-banner.tsx`: count from the `limit: 1` query; comment out the total amount (R301).
- [ ] **T133** `_components/refund-detail-sheet.tsx`: detail + refundability; D10 gate; S4 実行記録 action (omit empty keys, B3).
- [ ] **T134** `_components/refund-decision-dialog.tsx`: approve (D11 executionMethod) / reject (D12 reason).
- [x] **T135** `_components/refund-bulk-action-bar.tsx`: bulk approve. ~~Comment out 一括否認 (R303).~~ Removed 2026-10-27 (R303 closed).
- [ ] **T136** `_components/refund-csv-export-button.tsx`: async export (D14, B2).

### Phase E — verification

- [ ] **T140** `npm run type-check` = 0 errors; `npm run lint`.
- [ ] **T141** Live smoke on dev:
  - **01**: default window → each filter → >12-month block → CSV → partial refund over the limit (blocked) → valid refund.
  - **02**: KPI → detail sheet → konbini → exclusion set / release → upcoming → 全件一括確定 job.
  - **03**: filters → approve SBPS → approve JACCS (executionMethod) → `processing` → mark-executed → reject (reason) → bulk approve → CSV.
  - Permissions: one Staff-denied case and one Manager-vs-HQ approver case.
- [ ] **T142** Append **Round 1 result**; update `checklists/parity.md` where real-API behaviour changes a checked item.

## Round 2 backlog

- **R201 (B1)** After MR !808: regen → remove the refund-application cast (shared with 015 R202).
- **R202 (B2)** After MR !808: regen → delete `refund-export-body.util.ts`.
- ~~**R203 (B4)**~~ closed — Otaki ruled per billing.
- **R204 (B5)** After the BE ships API-116 v0.7.3: regen → key rows by `rowKey`, render `billingItemId` (8-char) instead of the joined `billingItemIds[]`, show the line's `taxRate`, start the refund from the row's own line (pre-select `billingItemId`, cap at the row's `refundApplyContext.applicableAmount`), hide the row action when `refundApplyContext` is `null`, and delete the 「混在」 branch for sale rows. Detail (EP #3) stays per billing. Est. 2–3 h.
- **R205 (B6)** After the BE returns `markExecuted` in `editableActions`: show 実行記録 from it and delete the FE-derived condition (processing + non-SBPS + Manager+ + `canExecuteRefund`). Est. 30 min.

## Round 3 backlog (phase 2)

- **R301** 承認待ち **total amount** in the banner (`refund-pending-banner.tsx`) — spec silent; no total in the API.
- **R302** 対象商品 / 売上額 columns (`refund-queue-table.tsx`) — not in FR-004-a; list DTO has no fields (detail has `lines[].description` / `amountWithTax`).
- **R303** ~~一括否認 (`refund-bulk-action-bar.tsx`)~~ — **Closed 2026-10-27**: Otaki ⑦ = 案B, bulk reject is out of scope (only approve can be done in bulk from the list). API-118 v0.16.1 §2 states it (doc only, no BE change). The commented-out button is removed and 016 spec.md FR-018 / FR-019 / US3 #5 now say bulk approve only.
- **R304** 備考 column on 翌月請求予定 (`upcoming-billing-table.tsx`) — `UpcomingBillingItemDto` has no note; spec silent.
- **R305** ~~Sort by 返金ID / 売上額 / 申請者~~ — **Closed 2026-10-26**: Otaki ruled the API-118 sort keys final (v0.13 「ソートキー変更なし」); FR-015 updated. The commented-out sort code stays out.

## Open questions

- ~~**Q1** FR-007 bad-debt exclusion grain~~ → **Resolved 2026-10-20: A, per billing** (API-117 v0.11.2; FR-007 「請求明細」 = the unpaid month's billing). Round 1 is already correct.
- **Q2 (Otaki, asked 2026-10-20)** API-118 internal contradictions (§7 L650 / §12.1 L990 `refunds.status`, §4 L257 `alertVariant`, §7 L652 `executionMethod`). FE follows the BE implementation (v0.14).
- **Q3 (花島, via the API notices)** FR-002-a 払戻 / FR-004 即時返金 / FR-004-a 3 statuses wording not yet updated. Non-blocking — UI follows the API spec.
- ~~**Q5** FR-002-a row grain~~ → **Resolved 2026-10-20: B′, one row per billing line** for sales / refunds (API-116 v0.7.3 §3.5). Waits for the BE implementation (B5 → R204).
- **Q6 (Otaki ⑧, asked by BE 2026-10-20)** — **Update 2026-10-23**: Otaki answered ⑧ on 2026-10-21 — `sent_at` = the first PSP send that got a response, never overwritten. Writers built in BE MR !839 (BAT-001 SBPS send, BAT-002 redrive, BAT-003 JACCS send, API-148 member pay), in live test, no date. After deploy, new sends fill `sentAt` / `lastBilledAt`; earlier sends get no backfill and stay 「—」; the API-114 409 / `X-Warning: psp-sent` check moves to `sent_at` in the same MR. No FE change expected. Original note: nothing writes `billings.sent_at`, so FR-002-b 最終請求日 (`COALESCE(last_attempt_at, sent_at)`) is blank on every receivables row, and the 015 PSP dialog shows 送信日時 「—」. FE keeps rendering 「—」 until answered.
- ~~**Q7 (BE debt)**~~ → **Resolved 2026-10-23**: 24 h replay merged to BE main in MR !816 (`f4f216e3`, merge `8a8678f7`, 2026-10-21) for #4 konbini, #5 re-dunning and #6 set-exclusion. Dev's swagger serves the replay text added in `f4f216e3`, so dev runs a build with it (not exercised live — group 2 writes not authorised). Semantics (API-117 §3): same key + billingId + body within 24 h → original response replayed; different billingId / body → 409 `E-RCV-104`; errors are not cached; DELETE release key is optional and not replayed. FE: konbini one key per dialog open, exclusion one key per billing per dialog open — both confirmed correct by BE. Original note: konbini `Idempotency-Key` is required with a 24 h replay cache in API-117 L99/L120; the BE accepts it but stores no replay yet. FE sends a fresh key per dialog open and disables double submit; a BE ticket was requested.
- **Q4 (spec)** S4 実行記録 has no prototype — minimal FE-designed action in the detail sheet. Confirm placement with the designer when convenient.

## Round 1 result (2026-10-20)

Same branch and gates as [015 → Round 1 result](../015-sales-management/integration-plan.md#round-1-result-2026-10-20):

- type-check: 0 errors
- lint: clean

### What shipped

- **01 入出金明細 (T102, T110–T114)**: all done.
  - The date window always defaults; a reversed or >12-month URL is clamped.
  - Arrays are sent as repeated params, and the live run confirmed the BE accepts that form.
  - The refund dialog loads the billing detail, caps each line at `refundableAmount`, requires a reason, and posts through 015's body util.
  - The refund button is enabled only when `refundApplyContext.applicable` is true.
- **02 請求・未回収 (T120–T126)**: all done.
  - KPI cards come from a baseline query's `summary`.
  - コンビニ: oldest billing + `additionalBillingIds` (≤11). SMS/メール default on. An `Idempotency-Key` is sent per dialog open.
  - Bad-debt exclusion is per `billingId`, HQ/Manager only. The dialog says the whole billing is affected (B4).
  - 全件一括確定 is the filter-mode job, polled every 2s.
  - 備考 is commented out (R304).
- **03 返金一覧 (T130–T136)**: all done.
  - `includeTotalAll` drives the counts. The 承認待ち count uses a `limit:1` query.
  - Page sizes are 20/50/100, because the API caps at 100.
  - Approve is gated on `blockReason`, and each line on `canRefund`.
  - JACCS requires `executionMethod`, and reject requires a reason.
  - Bulk approve reports `failed[]` per row.
  - S4 実行記録 dialog: `executedAt` and `outcome` are required, `failureReason` is required when failed (E-REF-016), and empty optional keys are omitted (B3).
  - CSV export is async: create → poll → `csvUrl`.

### Deviations from the plan

1. **D5**: the billing detail has no `refundApplyContext`. The 01 dialog uses the transaction row's `refundApplyContext.alertVariant`. It uses the API-116 vocabulary (`sbps_void` / `jaccs_manual` / `cash_onsite`), so its copy is local (`TRANSACTION_REFUND_ALERT_MESSAGES`).
2. **D13**: the approver check is strict — `role === approverLevel`, and the user is not the applicant (API-118 §13.1). HQ therefore no longer approves Staff applications, which the old mock `canApproveRefund` allowed. Confirmed 2026-10-20: F-01.md L91 / L250 (返金承認の階層: one role up) and API-118 L109 agree; the old mock rule was wrong.
3. The S4 button shows on `displayStatus = processing` + non-SBPS + Manager+ + `canExecuteRefund`, because the deployed `editableActions` has no mark-executed value. API-118 v0.14.4 adds `markExecuted` — R205.
4. 返金CSV opens a small dialog for the 返金日 range: `fromDate`/`toDate` are required and filter on `refunded_at`.
5. 02 row-level コンビニ / 貸倒対象外 act on all of the member's eligible billings. The exclusion dialog makes one call per billing and stops at the first error.
6. The 未納月 filter offers every month from the oldest unpaid month to now, because there is no month-list endpoint.
7. The refund detail DTO has no member or applicant names, so the sheet reads them from the list row.

### T141 live smoke — read-only API level (2026-10-20)

**All passed:**

- tx list
- tx with repeated `storeIds` / `transactionType` / `paymentMethod`
- tx >12 months returns **400 `E-TXN-003`**, as expected
- `memberName` search
- CSV export
- receivables list, including `storeIds`
- receivable member detail
- upcoming
- refund list, including the `displayStatus` filters and the pending count
- refund detail and refundability
- `accounting-exports` list
- staff-scoped receivables

**Not run (not authorized)**: コンビニ issue, 全件一括確定, approve, mark-executed, refund export.

### T141 live smoke — UI writes + browser pass (2026-10-20)

| Step                                                             | Target                      | Result                                                                    | Reversal / end state                               |
| ---------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| 返金申請 partial ¥100 (HQ, from 015 detail; 全額返金 switch OFF) | `BMV6EIEIXB7EB1E`           | `201`, application `041899b5…` `pending_approval`                         | —                                                  |
| 却下 by System (refunds sheet → 却下する → reason)               | `041899b5…`                 | `200 rejected`, toast OK                                                  | Contained: one `rejected` application stays on dev |
| 貸倒対象外指定 → 解除 (receivables row menu)                     | `DEV-BIL-01-2` (JF-9000001) | `201 active` → `200 released`, row badge 貸倒対象 → 貸倒対象外 → 貸倒対象 | Restored                                           |

D13 was confirmed live. The sheet for the HQ application showed 「承認にはSystem管理者が必要」, and System had 却下する / 承認する.

Browser pass, HQ and Staff, on transactions / receivables / refunds: renders, 0 API errors. Staff sees an empty transactions list and an empty refunds list (取引がまだありません / 返金手続きがまだありません), and 5 receivables in its store.

**Swagger re-check (2026-10-20)**: `TransactionRowDto.taxRate/billingType`, `RefundabilityResultDto.blockReason`, `RefundApplyContextDto.alertVariant` and `ReceivableListItemDto.latestKonbiniStatus` are now `nullable`. Round 2 can delete the `taxRate` / `blockReason` seams after `npm run generate-api:real` (already regenerated; seam removal not done in Round 1). `UpcomingBillingItemDto.billingType/confirmStatus` are still plain `string` with no enum.

**FE nit**: the transactions 請求明細ID cell joins every full item UUID of the billing (billing-grain row). Goes away with R204 (one `billingItemId` per row).

### Still open

- **TODO(round2)**:
  - `transactions/_utils/transaction-labels.util.ts` — `taxRate` nullable cast
  - `refunds/_utils/refund-api.util.ts` — `blockReason` nullable seam
  - `refunds/_components/refund-csv-export-button.tsx` — `exportIds` poll filter
  - `refunds/_utils/refund-export-body.util.ts` — B2
- **TODO(round3)**:
  - R301: `refund-pending-banner.tsx`
  - R302: `refund-queue-table.tsx`
  - ~~R303~~ closed 2026-10-27 (commented-out 一括否認 removed; `refund-decision-dialog.tsx` cites FR-004-a)
  - R304: `upcoming-billing-table.tsx`
  - ~~R305~~ closed 2026-10-26 (comments in `refund-queue-table.tsx` now cite FR-015)
- **New BE asks — swagger**:
  - ~~nullability of `taxRate` / `billingType` / `blockReason` / `alertVariant` / `latestKonbiniStatus`~~ — fixed 2026-10-20
  - `UpcomingBillingItemDto.billingType` / `confirmStatus` — plain `string`, no enum
- **Other new BE asks**:
  - `GET accounting-exports` declares no query params (`exportIds`, paging).
  - `editableActions` has no `markExecuted` — now spec'd (API-118 v0.14.4) but missing from MR !808's `editableActionsOf`; reported to BE 2026-10-20.
  - The refund detail has no member/applicant names.
  - The konbini `Idempotency-Key` is optional in the swagger but required in the spec.
  - `q` does not search by refund ID.

## Round 2 result (2026-10-23)

Swagger refreshed from dev `/docs-json` (API-116 v0.7.3, API-117 v0.11.2, API-118 v0.14.4 and the MR !808 typed bodies are deployed) → `npm run generate-api:real`.

| Item      | Status | What changed                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R201 (B1) | Done   | Refund create body is typed; the cast seam `sales/_utils/refund-application-body.util.ts` is deleted (shared with 015 R202).                                                                                                                                                                                                                                                                                           |
| R202 (B2) | Done   | `refund-export-body.util.ts` deleted; the export poll filters by `exportIds`.                                                                                                                                                                                                                                                                                                                                          |
| R204 (B5) | Done   | 請求明細ID renders the row's `billingItemId` (last 8 chars), 税率 the line's `taxRate` (「混在」 kept only for payment / write-off). The row refund dialog shows only that line, capped at min(`refundApplyContext.applicableAmount`, detail `refundableAmount`), keyed by `rowKey`. The row action is hidden (「—」) when `refundApplyContext` is `null`. `DataTable` keys rows by index, so no `getRowId` was added. |
| R205 (B6) | Done   | 実行記録 shows only when `editableActions` includes `markExecuted`; `MARK_EXECUTED_ROLES` and `isExternallyExecutedMethod` are deleted.                                                                                                                                                                                                                                                                                |
| B3        | Closed | The mark-executed optional fields are nullable in the deployed schema; the dialog still omits empty keys, which is valid.                                                                                                                                                                                                                                                                                              |
| New       | Done   | API-117 #6 set-exclusion now requires an `idempotency-key` header: one `crypto.randomUUID()` per billing per dialog open, so a retry replays the billings that already succeeded.                                                                                                                                                                                                                                      |

Gates: `npm run type-check` 0 errors, `npm run lint` clean. The only `TODO(round2)` left is 015 B1 (PDF renderer).

Live check (dev, HQ, read-only; group 2 writes not authorised):

- `GET /admin/sales/transactions` (2026-01-01〜10-31, 100 rows): 62 sale + 38 payment, all `rowKey` unique, every sale row has `billingItemId` and `taxRate`; 60 refundable, 2 `null` context.
- 入出金明細 page: 21 返金申請 buttons. Opening one shows a single line (FIT365 スタンダード, 10%, ¥961, cap ¥961); 全額返金 fills 961. Cancelled without submitting.

**FE fix**: ids are UUIDv7, so the first 8 chars are the timestamp prefix and are shared by every line of a billing (all lines of BMVIWWESUC1E209 read `01a16167`). Line ids now show the **last** 8 chars — transactions 請求明細ID, the row refund dialog and the 015 detail line card (`billing-line-items-card.tsx`). Application / billing ids elsewhere still show the first 8 (different create times, so they rarely collide).

### Group 2 live writes (2026-10-23, authorised by the user)

| Write           | Screen / role                                                     | Result                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Register (登録) | 請求の手動追加, HQ                                                | `POST /billings` 201 — billing `c0cbeb02` (MB-C0CBEB02), タム 61 / JOYFIT24 渋谷, 2026-11, 1 custom line ¥1,100, `pending`. Left in place (no delete endpoint); note「FE round 2 live test (thxnhi) — safe to ignore」. A one-off 503 `E-SYS-001` on `GET members/{id}/contracts` did not reproduce (3× 200).                                                                                                                |
| 全件一括確定    | 翌月請求予定, HQ                                                  | `confirm-bulk` mode=filter 2026-11 → 202 `jobId`, `matchedCount 2` (`c0cbeb02` + seed `DEV376-BIL-2611`); the dialog polled to 2 / 2 and toasted 「2件を確定しました」. Reverted with `unconfirm` (`revertReason`) → both now `unconfirmed` (no path back to `pending`).                                                                                                                                                     |
| Konbini issue   | 未回収一覧, HQ, email only (SMS unchecked: seed phones look real) | 502 `E-RCV-003` 「Konbini PSP (SBPS) upstream error」 on JF-9000024 (×2) and JF-9000001 — SBPS konbini is down on dev (traceIds `Root=1-6ada57cf-1b7528d66826cb105c8a4481`, `Root=1-6ada57e6-34b605cf6e08d8f70cea1a28`, `Root=1-6ada5804-56019eea48bab2a85b9ec3ec`). FE: one error toast from `userMessage`, dialog stays open, fresh UUID v4 key per dialog. Replay / 409 `E-RCV-104` not testable (errors are not cached). |
| Refund approve  | 返金手続き一覧, HQ applies → System approves                      | Application `847bcb5d` (佐藤 花子, SBPS line, ¥100 partial) → approve 200 → `processing`, refund `8b7ae154` `sbps_partial_refund` `pending` (by design: approve only creates the execution row). `editableActions` = `[]` for System and HQ, so 実行記録 is hidden (R205 negative case OK).                                                                                                                                  |
| 実行記録        | —                                                                 | **Not testable**: no refundable line on dev was paid by cash / JACCS (every refundable line's payment is `sbps_credit`). Needs a BE fixture.                                                                                                                                                                                                                                                                                 |

**FE fix from this run**: the approve success toast said 「返金実行後に実行記録を登録してください」 whenever `displayStatus = processing`, which includes SBPS. It now keys on `editableActions.includes('markExecuted')` (`refund-decision-dialog.tsx`).

## BE `d4f756c6` follow-up (2026-10-26)

Shared regen and 015 changes: `specs/015-sales-management/integration-plan.md` § BE `d4f756c6` follow-up.

- **FR-002-a 会員ID search**: the single search box sent only `memberName` (name match), so a 会員ID found nothing (live: a member-number prefix → 0 rows as `memberName`). API-116 v0.8 adds `memberNumber` (1–60 chars, prefix match on `member_number` / `legacy_member_code`, ANDed with the other filters). `use-transactions-filters.hook.ts` now sends a term of ASCII letters / digits / hyphens containing a digit as `memberNumber`, anything else as `memberName` — never both. List and CSV export share the params. Live: prefix → 50 rows, all matching.
- **alertVariant**: `TRANSACTION_REFUND_ALERT_MESSAGES` re-keyed to the API-118 values (5 messages).
- **`paymentMethod`**: `other` dropped from the filter and row enum → removed from `TRANSACTION_PAYMENT_METHOD_VALUES` and the label helper. (`other` in the bulk-refund `reasonCode` list is a different enum and stays.)
- **No FE impact**: removed `externalResponseCode` / `retryCount` / `accountingExportId` (unused), `E-RCP-005` (shared toast), `statusHistories` 10-value `source` (not rendered), run `errors[]` (unused), refund line ordering, `receiptIssuable` for `partially_refunded`, SBPS `in_transit` → `collected` after reconcile.
- **Still open**: konbini 502 `E-RCV-003` (BE passed the trace to quyndh, !855 owner); 実行記録 fixture (passed to the seed owner); SBPS refund call on approve (built, waiting on the SBPS encryption flag, then sandbox test + MR); PDF (!856 + infra, no ETA).

## BE `7cf0bf92` follow-up (2026-10-26)

Shared regen + PDF change: `specs/015-sales-management/integration-plan.md` § BE `7cf0bf92` follow-up.

- **Konbini 502 `E-RCV-003`**: BE reports it fixed (SBPS rejected the missing contract date `seiyakudate`). Re-tested 2026-10-27 04:18 JST (JF-9000024, email only, new key): **still 502 `E-RCV-003`**, traceId `Root=1-6adfa792-0cb8d30e267532d7112461cc` — sent back to BE.
- **2026-10-27 (review !214 #7)**: the detail sheet now sends `includeKonbiniHistory: true` and lists the issued payment numbers (notifications can be `skipped`, and re-issue is blocked by `E-RCV-004` until expiry); the issue dialog cannot be closed while the request is pending.
- **SBPS refund on approve (!868)**: single and bulk approve now send the refund to the SBPS sandbox. Refunds approved before the deploy (`8b7ae154`, `ccfe8124`, `22c1cfea`) stay `executionStatus: pending` and are never sent. **No FE change**: the decision dialog already says SBPS is refunded on approve and the 実行記録 toast keys on `editableActions.includes('markExecuted')`. **Re-test pending** — needs a _new_ application + approve (live write, user's go-ahead).
- **Live 2026-10-26 — konbini still 502**: UI (JF-9000024, SMS off / email on) and a direct API call with `sendChannels: ['email']` both → 502 `E-RCV-003` (traceIds `Root=1-6adf1706-1eb2e48a10a4cac36dafd144`, `Root=1-6adf1720-0bace7ff5516bfd75060c5a9`). FE: one error toast, dialog stays open. **G2 not fixed on dev** → back to BE.
- **Live 2026-10-26 — SBPS refund now called, but fails**: HQ applied `3c3612c8` (B-SBPS line `…b502`, ¥100 partial) → System approved → 200, `displayStatus: failed`, refund `8d27eac1` `sbps_partial_refund` `failed`, `failureReason: SBPS_API_ERROR:10105026`. So !868 is live (it reached SBPS); the sandbox rejected it. BE decoded `10105026` (2026-10-26): 101 credit / 05 桁数エラー / 026 SBPS transaction ID — the seed payment's ID is longer than SBPS's 32 chars, i.e. **bad seed data**; BE behaviour (refund `failed` + `SBPS_API_ERROR:<code>`) is per spec. FE detail sheet shows 失敗 + 失敗理由 correctly; 実行記録 hidden. **FE fix**: the approve toast said 「返金申請を承認しました」 even when the refund failed → now `executionStatus === 'failed'` shows an error toast 「返金申請を承認しましたが、返金に失敗しました」 with `executionFailureReason`; bulk approve adds 「N件は承認後の返金に失敗しました」 (`refund-decision-dialog.tsx`). Verified in the browser with the approve response mocked (no dev write).
- **Still open**: G2 konbini (BE); SBPS refund success path needs a payment with a real SBPS sandbox transaction ID (seed data); 実行記録 fixture (cash / JACCS line).
- **BAT-010 / export `167da2df` (quyndh log, 2026-10-26)**: exported at 15:50 JST, `refund_journal`, 0 records (non-SBPS scope; no cash / JACCS refunds on dev). Live read: list `status: exported`; `GET accounting-exports/{id}/download` → 200 but `csvUrl` = `accounting-exports/167da2df-….csv` (S3 key, not a URL), `expiresAt` / `byteSize` null — swagger: "ADR-033 CloudFront signed URL is not wired yet". So the FE download (`refund-csv-export-button.tsx` → `triggerDownload(csvUrl)`) cannot fetch the file yet → **G4 narrowed to: download not deliverable until ADR-033**. Ask BE for ETA / interim pre-signed S3 URL.
- **SBPS refund on approve — success path verified (TC run, 2026-10-26)**: application `f6347a1e` (¥1, line 9551eb42 on BMVOPXHJE55A476, SBPS payment made 2026-10-26) approved by System → refund `f56b868f` succeeded, list shows 返金済み. So !868 works end to end; G14 is limited to old seed payments (`3c3612c8` / `8d27eac1`). **BE follow-up**: after that success, refundability for the line still reports `refundableAmount 300` / `alreadyRefundedAmount 0` (expected 299 / 1).
- **Refund CSV**: exports `e47632e5` (HQ, UI) and `45dfb900` (Manager, API) created for 返金日 2026-10-26, pending BAT-010. Manager export is accepted by the server (202) while the FE disables the button (BUG-016D-06).
- **契約種別 on 未回収詳細 (BUG-016B-03) — BE contract gap**: API-117 member detail returns `itemType: 'monthly_fee'` for monthly seed lines (checked live 2026-10-26), a value outside the swagger `itemType` enum (`monthly_plan` …). The FE maps `monthly_plan` → 主契約 per the enum, so these lines fall through to 都度請求. Ask BE to return `monthly_plan` (or add `monthly_fee` to the enum); no FE change.

## FE shared fixes after the TC run (2026-10-26, uncommitted)

- **Double submit**: every sales write action goes through `useSingleFlight` (015A-06 and the other double-click NGs).
- **Selection** (015A-01): cleared whenever the list query changes; bulk actions use visible rows only.
- **1024px layout**: billing detail side column stacks below `xl`; long labels / names / reasons wrap or clamp; summary cards 3 per row below `xl`; unpaid sheet 明細ID shortened (015B-21/22, 015C-04/15, 015A-10/11, 016B-06, 016C-04, 016D-08). Open: store picker has no full-name tooltip (shared combobox).
- **Header store switch** (016B-01, 016A-05, 016D TC-098, 015A TC-017): `use-sales-store-scope.hook.ts` — a specific header store scopes every list / summary / banner query and hides the in-panel 店舗 filter; the filter shows under 全店舗 only. Also resolves the Manager filter listing all stores (015A-09, 015C-05, 016A-04).
- **請求区分 label** (015B-01, 015C-20, 016C-03): detail uses the same fine-grained label as the list / upcoming tab (manual → 手動請求); 都度請求 is per-use billing only (F-01 用語).
- **Per-screen FE fixes (groups 1–9)**: refund dialogs (cap at collected amount, SBPS >90 days blocked, integer-only amounts, 全額返金 switch on the transactions row), error states instead of empty / 0 (sales list, refunds, receivable tab badges), validation (`1e3`, 適用月 range, discount above price, empty bad-debt reason), arrears alert on member pick (HQ / System only — the receivables member API is 403 for Manager / Staff), dialog reset on cancel, Japanese failure messages, refetch after conflicts, permission gates (帳票 by role per 権限マトリクス; 返金CSV出力 by role, FR-020), plus Low polish. Not FE: 015B-17 (no full/partial field), 016A-08 (server CSV codes), 016D-04 (server status sort), 016B-05 (no arrears-month data / spec silent).

## 2026-10-27 — Otaki rulings ①–⑤ on dev (BE `2b99448e`: API-117 v0.12 / API-114 v0.12.10 / API-116 v0.9 / API-118 v0.16)

SDK regenerated from dev `/docs-json` (2026-10-27).

- ① 翌月請求予定: the list default is now `confirmStatus` [pending, unconfirmed] (array; `all` removed). The bar and the confirm dialog show `pendingCount + unconfirmedCount` / `pendingAmount + unconfirmedAmount` (「N件・¥X が未確定です」); the bulk confirm sends `filter.confirmStatus: ["pending","unconfirmed"]`. Dev: the 3 billings set back to 未確定 (¥18,900) are listed and counted.
- ② 入出金明細 CSV: labels instead of codes — BE only, no FE change.
- ③ 返金一覧 `sort=status`: BE sorts by `displayStatus` in the BR-REF-010 order before paging — no FE change (the ステータス column already sends `sort=status`). Dev asc: 処理中 → 返金済み → 失敗 → 却下.
- ④ `refundType` (full / partial, per application): 返金履歴 種別 column (015 R304) and the refund detail sheet's 部分返金 badge.
- ⑤ 未納月 options: `summary.unpaidMonths[]` of the store-scope baseline (newest first) replaces the oldest-month-to-now range; a month from the URL (`rf_month`) stays selectable.
