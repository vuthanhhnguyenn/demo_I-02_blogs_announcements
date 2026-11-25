# Real API Integration Plan: F-01 Sales Management (売上管理) — list / detail / register

**Branch**: `feat/integration-api-sales` | **Date**: 2026-10-20
**Specs**: [015-sales-management](./spec.md) · sibling plan [016-sales-transaction-refund](../016-sales-transaction-refund/integration-plan.md) (same branch)
**Requirements**: `F-01.md` @ fitness-spec `5c391cf` (2026-09-28) — FR-001..004, FR-008, FR-009, FR-011, FR-012
**API spec**: fitness-api all-docs `d4130c9` (2026-10-16) — API-114 (summary + confirmation), API-115 (manual billing / adjustments), API-118 (refunds), API-119 (receipts / invoices)
**Prototype**: fitness-crm-ui `f2fe3f9` (2026-10-14) — `sales.tsx`, `sales-detail.tsx`, `sales-register.tsx`
**Backend checked**: fitness-backend-v2 main `a9019888` / `5989fb50` (2026-10-19); MR !808 open
**Scope**: `src/app/(private)/sales/page.tsx`, `sales/[id]/**`, `sales/register/**`, `sales/_components|_hooks|_schemas|_utils/**`
**Target API**: `src/lib/api-real`, regenerated from the dev swagger (`/docs-json`) — see T001

## Guiding principle

**Spec first, UI kept.** The latest FR + API spec is the contract. Where the real API cannot yet
back a spec'd UI element, the element stays as the spec defines it; values the API would reject
are stripped at one seam, with a `TODO(round2) Bn` comment. No spec'd control, column or section is
deleted to fit the API.

**Round 3 = phase 2.** Prototype-only elements the spec does not define are **commented out, not
deleted**, headed `// TODO(round3) R3nn: <reason> — integrate in phase 2`.

Mock API routes under `src/app/api/crm/billing-records/**`, `src/app/api/_mock-db/**` and the mock
Zod schemas are **left untouched** (staffs / positions / stores / members convention) — they simply
stop being called by these screens.

The BE answers that shaped this plan (2026-10-19 / 10-20) are recorded in
[spec.md → Clarifications → Session 2026-10-19](./spec.md#clarifications).

## Endpoint mapping

Feasibility: **~80%** — every main surface has an endpoint; most work is shape change.

Hooks are from `@/lib/api-real/@tanstack/react-query.gen` **after T001**.

| UI surface                                                      | Real endpoint                                                                                                                                                                     | Hook                                                                                  | Round      |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| 5 summary cards (FR-001)                                        | `GET /api/v1/admin/sales/summary` (`month`, `storeIds`)                                                                                                                           | `adminSalesBillingControllerSummaryOptions`                                           | 1          |
| List rows + filters 月 / 店舗 / 区分 / 状態 / 未納のみ / search | `GET /api/v1/admin/sales/billings` (`month`, `storeIds[]`, `billingType`, `confirmStatus`, `collectionStatus`, `hasUnpaid`, `publicId`, `memberQuery`, `cursor`, `limit`, `sort`) | `adminSalesBillingControllerListOptions`                                              | 1          |
| Filter-banner baseline count                                    | same, without the secondary filters                                                                                                                                               | same                                                                                  | 1          |
| Bulk 確定 (selected ids)                                        | `POST /api/v1/admin/sales/billings/confirm-bulk` (`mode=ids`, ≤200 → 200 sync)                                                                                                    | `adminSalesBillingControllerBulkConfirmMutation`                                      | 1          |
| Bulk 返金申請                                                   | `POST /api/v1/admin/sales/refund-applications/bulk`                                                                                                                               | `adminRefundControllerBulkCreateMutation` (new)                                       | 1          |
| Detail 基本情報 / 集計 / 履歴 tabs                              | `GET /api/v1/admin/sales/billings/{billingId}` (`header`, `items`, `statusHistories`, `payments`, `refunds`) — no `refundApplyContext` here (Round 1 deviation 1)                 | `adminSalesBillingControllerDetailOptions`                                            | 1          |
| Detail 確定 / 未確定に戻す                                      | `POST …/billings/{billingId}/confirm`, `…/unconfirm` (409 `E-BIL-105` → resend with `acknowledgePspSent`)                                                                         | `adminSalesBillingControllerConfirmMutation`, `…UnconfirmMutation`                    | 1          |
| Add line (contract / option / custom)                           | `POST …/billings/{billingId}/items` (oneOf)                                                                                                                                       | `adminBillingRunControllerAddItemMutation`                                            | 1          |
| 会費調整 card (FR-012, 8 columns)                               | `GET /api/v1/admin/sales/billing-adjustments?memberId&contractId&appliedMonth`                                                                                                    | `adminBillingRunControllerListAdjustmentsOptions`                                     | 1          |
| 会費調整 dialog                                                 | `POST /api/v1/admin/sales/billing-adjustments`                                                                                                                                    | `adminBillingRunControllerCreateAdjustmentMutation`                                   | 1          |
| 返金申請 dialog (per line)                                      | `POST /api/v1/admin/sales/refund-applications` (`memberId`, `applicationReason`, `reasonCode?`, `lines[]`)                                                                        | `adminRefundControllerCreateMutation`                                                 | 1 → 2 (B2) |
| 返金履歴 card                                                   | `GET /api/v1/admin/sales/refund-applications?billingId=`                                                                                                                          | `adminRefundControllerListOptions`                                                    | 1          |
| 領収書 (per line) / 請求書                                      | `GET /api/v1/admin/sales/receipts/{billingItemId}`, `GET …/invoices/{billingId}`                                                                                                  | `adminWriteoffAccountingControllerReceiptOptions`, `…InvoiceOptions`                  | 1 → 2 (B1) |
| Register submit                                                 | `POST /api/v1/admin/sales/billings` (starts `pending`)                                                                                                                            | `adminBillingRunControllerCreateManualMutation`                                       | 1          |
| Register 確定状態で登録                                         | create, then `POST …/billings/{billingId}/confirm`                                                                                                                                | create + confirm mutations                                                            | 1 (D2)     |
| Register store / member pickers                                 | `GET /api/v1/admin/stores`, `GET /api/v1/admin/members?storeId`                                                                                                                   | `adminStoreControllerListOptions`, `adminMemberControllerListOptions`                 | 1          |
| Register contract picker (incl. inactive, #357)                 | `GET /api/v1/admin/members/{memberId}/contracts?includeInactive&storeId`, `…/option-contracts`                                                                                    | `adminMemberContractOpsControllerListContractsOptions`, `…ListOptionContractsOptions` | 1          |

Not used on these screens: `GET …/confirm-bulk/{jobId}` (filter-mode job — used by 016 receivables),
`GET /api/v1/sales/estimate-joining-fee` (the prototype computes 税込見積 on the client).

## Blockers carried into Round 2

| ID  | Blocker                                                                                                          | Spec says                                                | Round 1 behaviour (UI kept)                                                                                                                                                                      | Round 2                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| B1  | No PDF renderer: receipts / invoices return **502** `E-EXP-001`, no `pdfUrl` (no ETA, lead to decide)            | FR-009: download 領収書 / 請求書 PDF, 12-month limit     | Buttons stay live and call the endpoint; 502 → shared error toast (`userMessage` 「帳票を作成できませんでした。再度お試しください。」); retry allowed. `TODO(round2) B1` at the download handler | **Done (BE `7cf0bf92`, 2026-10-26)**: renderer on dev, `pdfUrl` non-null → opened in a new tab; TODO removed  |
| B2  | Swagger has no requestBody for `POST refund-applications` (codegen `body?: never`); fixed in MR !808, not merged | FR-004: select lines, amount per line, 返金事由 required | One typed body + one cast in `sales/_utils/refund-application-body.util.ts` (type from API-118 §4), `TODO(round2) B2`                                                                            | After !808: refresh `openapi.real.json` → `npm run generate-api:real` → delete the util's local type and cast |
| B3  | Before !808 merges, `null` for bulk `note` returns 400 `E-VAL-001`                                               | API-118 §4 bulk: `note` optional                         | Omit the key when empty (never send `null`). BE confirmed this stays valid after !808                                                                                                            | None needed — keep omitting                                                                                   |

## Spec'd but not built

| ID  | FR                     | What the spec defines                                       | Missing in                                                                                              | Round 1?                                                                                                  |
| --- | ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| S1  | FR-004 (Dev Q&A 08-24) | Per-line 返金可能残高; block over-refund; API computes it   | code (`billing-refund-request-dialog.tsx` validates against the original amount — over-refund possible) | **Yes** (D4) — `items[].refundableAmount`                                                                 |
| S2  | FR-003 異常系          | Warning when unconfirming a billing already sent to the PSP | code                                                                                                    | **Yes** (D4) — 409 `E-BIL-105` → confirm dialog → resend with `acknowledgePspSent: true`; `header.sentAt` |
| S3  | FR-002 異常系          | Per-member billing-calculation error alert + 再算出         | code (prototype has only a comment)                                                                     | No — noted. Needs `GET monthly-billing-runs/{runId}?includeErrors` + `POST billings/{id}/recompute`       |

## Decisions

- **D1 — 請求日** = date part of `header.createdAt` (API-114 §6.9). Not `dueDate`. (BE confirmed.)
- **D2 — 確定状態で登録** = `createManual` then `confirm`, two calls (FR-011 → FR-002 flow). If confirm fails the billing stays 未確定, the shared toast shows the error, and the user lands on the new detail page.
- **D3 — 会計CSV button** on the list header: the prototype moved it to a separate accounting-export screen. ~~Comment out the inline dialog (R301).~~ **Done 2026-10-27**: the button opens `/sales/accounting-export` (prototype `sales-accounting-export`), wired to API-119 §8–§10. 売上 sends `monthly_sales` + `enrollment_journal` (API-119 §8 UI ↔ journalTypes table); the month is fixed to the previous month (#305); the 未確定 warning uses API-114 §4 `confirmStatusCounts.pending + unconfirmed`; no per-type 件数/金額 preview (no API). Unfinished requests are kept per staff like the refund CSV (D14).
- **D4 — S1 + S2 in Round 1**; S3 noted only.
- **D5 — No mapper layer.** Components import DTOs from `@/lib/api-real/types.gen` and rename in place (staffs / stores precedent).
- **D6 — Paging.** The list is cursor-based (`nextCursor` / `totalCount`): prev / next with a cursor stack in component state; no page-number jump. Page size re-checked against the schema's `limit` max (T002).
- **D7 — Sort.** The API offers 4 fixed sorts, not per-column sort. Column headers lose sort affordance except the 4 mapped ones; the spec does not define sort, so nothing spec'd is lost.
- **D8 — Enums.** `confirmStatus`: `pending` + `unconfirmed` both render 未確定. `billingType` has 7 values → new label map. `reasonCode` `duplicate_charge` → `duplicate_billing`.
- **D9 — Payment method.** List / header `paymentMethod` is the member's **current** primary method; the FR-004 90-day SBPS alert uses `payments[].paymentMethod` + `paidAt`, and `refundApplyContext.alertVariant` decides the alert copy.
- **D10 — Per-line payment state** derives from `paidAt` / `refundableAmount`; the 領収書 button is gated by `receiptIssuable`.
- **D11 — 会費調整** moves from line-level to `contractId`-level, matching the API.
- **D12 — Errors by code**: `E-BIL-202` (outstanding debt, FR-011 異常系), `E-BIL-203` (add line to a confirmed billing), `E-BIL-105` (PSP sent). No Japanese substring matching. Local `onError` toasts are removed (shared `MutationCache` toasts).
- **D13 — Search** splits into `publicId` (billing ID pattern) and `memberQuery` (everything else); stores send `storeIds[]`.

## Round 1 tasks

### Phase A — foundations

- [ ] **T001** Replace `src/lib/openapi.real.json` with the dev `/docs-json`, run `npm run generate-api:real`, and fix any compile fallout in screens **outside** F-01 (shared with 016). Check that `adminRefundControllerBulkCreateMutation` and `adminSalesBillingControllerBulkConfirmJobOptions` exist.
- [ ] **T002** [P] `sales/_constants/sales-labels.constant.ts` (new): `billingType` (7), `confirmStatus`, `collectionStatus`, `paymentMethod`, `reasonCode` label maps typed against the generated enums. Record list `limit` max from the schema.
- [ ] **T003** [P] `sales/_utils/refund-application-body.util.ts` (new): local `CreateRefundApplicationBody` per API-118 §4 + the single cast (B2).
- [ ] **T004** [P] `sales/_utils/billing-date.util.ts` (new): `toBillingDate(header.createdAt)` (D1).

### Phase B — list (`sales/page.tsx`)

- [ ] **T010** `_hooks/use-sales-filters.hook.ts`: map filters to the real query (`month`, `storeIds`, `billingType`, `confirmStatus`, `collectionStatus`, `hasUnpaid`, `publicId` / `memberQuery`, `sort`); add the cursor stack (D6).
- [ ] **T011** `page.tsx`: list via `adminSalesBillingControllerListOptions`; baseline count query for the filter banner (`enabled` only while a secondary filter is active).
- [ ] **T012** `_components/sales-summary.tsx`: `adminSalesBillingControllerSummaryOptions`; comment out the 入金N件 / 返金N件 subtitles (R302).
- [ ] **T013** `_components/sales-table-columns.tsx`: real DTO fields, `billingId` / `publicId`, D7 sort, D8 labels.
- [ ] **T014** `_components/sales-filters.tsx`: store options from `adminStoreControllerListOptions`; billing-type options from T002.
- [ ] **T015** `_components/sales-bulk-confirm-dialog.tsx`: `confirm-bulk` `mode=ids` (≤200); show per-id failures from the response.
- [ ] **T016** `_components/sales-bulk-refund-dialog.tsx` + `_schemas/sales-bulk-refund-dialog.schema.ts`: `refund-applications/bulk`; omit empty `note` (B3).
- [x] **T017** ~~`_components/sales-csv-export-button.tsx`: comment out the inline 会計CSV dialog (R301, D3).~~ Replaced by the `/sales/accounting-export` screen (2026-10-27); the dead file is deleted.

### Phase C — detail (`sales/[id]/**`)

- [ ] **T020** `page.tsx` + `billing-detail-skeleton.tsx`: `adminSalesBillingControllerDetailOptions`; `[id]` is the billing UUID — grep `navigate('/sales` / `router.push(\`/sales/`and`parseAsInteger` for deep links that send the old id.
- [ ] **T021** [P] `billing-basic-info-card.tsx` / `billing-basic-tab.tsx`: header fields, 請求日 via T004, payment method per D9.
- [ ] **T022** [P] `billing-line-items-card.tsx`: `items[]`, per-line state (D10), `refundableAmount` column (S1), 領収書 per line gated by `receiptIssuable`.
- [ ] **T023** `billing-confirmation-status-card.tsx`: confirm / unconfirm mutations; S2 flow — catch 409 `E-BIL-105`, show the PSP warning dialog with `header.sentAt`, resend with `acknowledgePspSent: true`.
- [ ] **T024** `billing-add-line-item-dialog.tsx` + `sales/_schemas/add-line-item-form.schema.ts`: `addItem` oneOf body (contract / option / custom); `E-BIL-203` by code.
- [ ] **T025** `billing-fee-adjustments-card.tsx` + `billing-fee-adjustment-dialog.tsx` + schema: list / create at `contractId` level (D11).
- [ ] **T026** `billing-refund-request-dialog.tsx` + schema: lines from `items[]`, cap each amount at `refundableAmount` (S1), alert copy from `refundApplyContext.alertVariant`, body via T003.
- [ ] **T027** `billing-refund-history-card.tsx`: `adminRefundControllerListOptions({ billingId })`, `displayStatus` labels shared with 016 (7 values).
- [ ] **T028** `billing-document-export-menu.tsx`: receipt / invoice queries on click; 502 handling (B1).
- [ ] **T029** `billing-history-tab.tsx`: `statusHistories`, `payments`, `refunds`.

### Phase D — register (`sales/register/**`)

- [ ] **T030** `_components/store-member-picker.tsx`: stores + members (`storeId`) from api-real.
- [ ] **T031** `_utils/contract-options.util.ts` + `manual-registration-line-items.tsx`: contracts (`includeInactive`, `storeId`) + option contracts.
- [ ] **T032** `manual-registration-form.tsx` + `_schemas/manual-registration-form.schema.ts`: `createManual` body; comment out 請求日 / 請求方法 / 請求区分 (R303 — BE rejects `billingType` / `paymentMethod`); `E-BIL-202` by code.
- [ ] **T033** `manual-registration-confirm-dialog.tsx` + `register/page.tsx`: D2 create → confirm chain.

### Phase E — verification

- [ ] **T040** `npm run type-check` = 0 errors; `npm run lint`.
- [ ] **T041** Live smoke on dev: list → each filter → search (id + name) → paging next / prev → bulk confirm → detail → confirm / unconfirm (incl. PSP-sent 409) → add line → 会費調整 → 返金申請 (over-limit blocked) → receipt (expect 502) → register unconfirmed + confirmed → one staff-role denied action.
- [ ] **T042** Append **Round 1 result** to this file; update `checklists/parity.md` only where real-API behaviour changes a checked item.

## Round 2 backlog

- **R201 (B1)** When the PDF renderer ships: open `pdfUrl` in T028; delete the `TODO(round2) B1` comment.
- **R202 (B2)** After MR !808 deploys: refresh `openapi.real.json` → `npm run generate-api:real` → delete `refund-application-body.util.ts` local type + cast; switch T016 / T026 to generated body types.

## Round 3 backlog (phase 2)

- ~~**R301** Inline 会計CSV dialog (`sales-csv-export-button.tsx`) — prototype moved it to a separate accounting-export screen; integrate on that screen with `accounting-exports` once it is spec'd.~~ **Done 2026-10-27** (see D3).
- **R302** 入金N件 / 返金N件 subtitles (`sales-summary.tsx`) — not in FR-001 and not in `summary`; needs FR + API fields.
- **R303** Register 請求日 / 請求方法 / 請求区分 (`manual-registration-form.tsx`) — not in FR-011; BE rejects the keys; needs FR + API.

## Open questions

- **Q1 (lead)** B1 PDF renderer has no ETA — accept 502 + retry for release, or hide the buttons until it ships? Recommendation: keep them live (spec'd), 502 toast.
- **Q2 (Otaki)** none for this plan; the FR-007 grain question lives in the 016 plan.

## Round 1 result (2026-10-20)

Branch `feat/integration-api-sales` (off `dev` @ `1fdc5b9f`), uncommitted.

### What shipped

- **T001**: `openapi.real.json` replaced with the dev `/docs-json` (2026-10-20) and the client regenerated. Both new hooks are present, and no screen outside F-01 broke.
- **Foundations**:
  - `sales/_constants/sales-labels.constant.ts` (T002, plus the 016 T101 refund-status labels merged in)
  - `sales/_utils/refund-application-body.util.ts` (T003). It also sets `Content-Type: application/json`, which the SDK omits for this body-less endpoint.
  - `sales/_utils/billing-date.util.ts` (T004)
- **List (T010–T017)**: all done.
  - Cursor stack keyed by the query.
  - The baseline count query runs only while a filter is active.
  - 未確定 sends `pending` + `unconfirmed`.
  - Search sends `publicId` when the text matches `/^B-\d*$/i`, otherwise `memberQuery`.
  - Bulk confirm and bulk refund are capped at 200 rows and list failures per id. An empty `note` is omitted (B3).
- **Detail (T020–T029)**: all done.
  - S1: refundable-balance column, and the refund dialog caps each line.
  - S2: 409 `E-BIL-105` opens a warning dialog, then resends with `acknowledgePspSent`.
  - 会費調整 is at `contractId` level.
  - Receipt / invoice go through a mutation, so 502 reaches the shared toast (B1).
  - The history tab shows `statusHistories` / `payments` / `refunds`.
- **Register (T030–T033)**: all done.
  - Pickers search on the server.
  - Contracts load with `includeInactive`.
  - 確定状態で登録 = create, then confirm. A confirm failure lands on `/sales/{billingId}`.
  - `E-BIL-202` shows an inline 未納金 alert, using `meta.suppressErrorToast`.

### Deviations from the plan

1. **`refundApplyContext` is not on the API-114 detail** — it lives on the API-116 sale detail. The detail refund dialog loads `GET /admin/sales/transactions/sale/{billingId}`. It falls back to the latest `payments[]` method and the 90-day window. Its variants are `sbps_void` / `jaccs_manual` / `cash_onsite` (API-116 vocabulary, not API-118's), so their copy is local.
2. The register draft-line schema moved into `manual-registration-form.schema.ts`. `add-line-item-form.schema.ts` (detail only) is tightened to the API bounds: label ≤200, reason ≤500, integer amount.
3. The 未納金 guard on 明細追加 uses the billing's own `header.unpaidAmount`, because BR-BIL-104 applies only to `POST billings`.
4. Each of the 4 API sorts has one fixed direction. Clicking the active column resets to the default sort, but the tooltip still says 昇順/降順 (UX leftover).
5. The duplicate 会費調整履歴 table on the history tab was dropped. The spec'd card on the basic tab keeps it.
6. **New Round 3 item R304**: the 返金履歴 種別 (全額/部分) column is commented out, because the refund list DTO has no full/partial flag. **Done 2026-10-27**: API-118 v0.16 `refundType` (BR-REF-012, per application) drives the column; the refund detail sheet's 部分返金 badge uses it too instead of an FE calculation.

### Gates

- `npm run type-check`: 0 errors, whole repo.
- `npm run lint`: clean.
- The project has no `npm test` script.

### T041 live smoke — read-only API level (2026-10-20)

Run against `https://api.dev.fitness-v2.okamoto-hd.com` with the demo Cognito accounts (HQ, staff).

**All passed:**

- summary
- list, including:
  - repeated `storeIds` / `confirmStatus` / `billingType` (the repeated array form is accepted)
  - next cursor
  - `publicId` search
  - `memberQuery` search
- detail
- sale tx detail (`refundApplyContext`)
- refund history by `billingId`
- billing-adjustments (`memberId` + `contractId` + `limit`)
- contracts (`includeInactive`) and option-contracts
- members by store
- invoice and receipt both returned **502 `E-EXP-001`**, as expected (B1)
- staff-scoped list

**Notes:**

- `month` is **required** on `GET /billings`; the FE always sends it (the filter defaults to the current month).
- One `503 E-SYS-001` on billing-adjustments did not reproduce on 2 re-runs or 15 other billings; treated as transient.

**Not run (not authorized)**: register (no delete endpoint), 全件一括確定.

### T041 live smoke — UI writes + browser pass (2026-10-20)

All writes went through the UI (Playwright, headless, `localhost:3000` → dev API) so the FE request bodies were exercised. Each one was reversed or contained:

| Step                                   | Billing           | Result                                                            | Reversal / end state                                                                         |
| -------------------------------------- | ----------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Unconfirm a PSP-paid billing (S2)      | `BMV6EIEIXB7EB1E` | `409 E-BIL-105` → PSP warning dialog, no error toast → キャンセル | No change (still 確定済)                                                                     |
| 明細追加 (manual, ¥100 + 10%)          | `BMUQ5035NCEAEA3` | `201`, toast OK                                                   | `PATCH items/{id} {isExcluded:true}` by API; detail shows 「請求除外」, total back to ¥7,091 |
| 会費調整 (default `fixed_amount`, 100) | same              | `201`, toast OK                                                   | `DELETE billing-adjustments/{id}` by API → `cancelled`; card shows 「取消」                  |
| 確定 → 未確定に戻す                    | same              | `200` / `200`, both toasts OK                                     | Ends `unconfirmed` (was `pending`; both read 未確定)                                         |
| 返金申請 partial ¥100 (HQ)             | `BMV6EIEIXB7EB1E` | `201 pending_approval`                                            | Rejected by System in 016 (see that plan)                                                    |

Browser pass, HQ and Staff, on list / detail / register: renders with real data, labels resolved, 0 API errors. Staff is scoped to its store (JOYFIT 横浜, 4 rows), and 未確定に戻す / 明細追加 / 会費調整 are disabled. One React hydration-mismatch console error on Staff `/sales` did not reproduce on a re-run.

**Findings (BE)**:

- `GET /summary` `receivableTotal` / `receivableCount` ignore `month`: ¥176,000 / 20 for 2026-08, -09 and -10 alike, while the rows are month-scoped. This contradicts API-114 §11.8 ("same month and scope … agree"). The FE renders the API value as is. → fixed in MR !808.
- `GET /summary` `salesTotal` 2026-10 = ¥172,700, but the confirmed rows of the month sum to ¥1,100,533. Aug and Sep match exactly, so it looks like a stale snapshot (`computedAt` 05:00Z).
- On the detail of a PSP-paid billing, `header.sentAt` and `header.lastPaymentAt` are `null`, although `payments[0]` is `success` and the list row carries `lastPaymentAt`. The PSP dialog therefore shows 決済事業者送信日時 「—」.
- `DELETE billing-adjustments/{id}` requires a JSON body `reason`. There is no FE caller (no cancel UI per spec), so this is noted only.

**FE nits**: none blocking.

### Still open

- **TODO(round2) B1**: `sales/[id]/_hooks/use-billing-document-download.hook.ts`
- **TODO(round2) B2**: `sales/_utils/refund-application-body.util.ts`
- **TODO(round3)**:
  - R301 (done 2026-10-27): `sales/page.tsx`, `_components/accounting-export-form.tsx`, `accounting-export/page.tsx`
  - R302: `_components/sales-summary.tsx`
  - R303: `manual-registration-form.tsx`, `manual-registration-confirm-dialog.tsx`
  - R304 (done 2026-10-27): `[id]/_components/billing-refund-history-card.tsx`
- **BE answers (2026-10-20)** — checked against F-01 (fitness-spec `c400474`), prototype `f2fe3f9`, fitness-api `8249bf8` and MR !808 code:
  - **Fixed in MR !808 (not merged; regen after)**: `receivableTotal/Count` scoped to `billing_month = month` (FR-001 「当月」); swagger enums for upcoming `billingType` / `confirmStatus`, `payments[].paymentMethod` / `paymentStatus`, `refunds[].status`; `/billings` `limit` 1–200, `publicId` 1–40, `memberQuery` 1–50; refund list `q` matches an application-id prefix (4+ hex).
  - **`salesTotal` (A2)**: not a snapshot — enrollment / 都度 / 退会 billings stored `totalForAccounting = 0`. Fix + backfill wait on Otaki ⑥ (日割り lines). Even after it, `salesTotal` is the pre-campaign amount (API-114 L139, #393), so the card will not equal the row sum when a campaign applies; FR-002 names the pre-discount amount for 会計CSV only and the prototype sums row amounts — **open spec question for Otaki**.
  - **`sentAt` (A3)**: nothing writes `billings.sent_at` yet (Otaki ⑧). The PSP dialog keeps 「—」; the same gap blanks FR-002-b 最終請求日 (016 Q6) and means FR-003's 「送信完了」 warning has no signal between the 9日 send and the 13日 result.
  - **`lastPaymentAt`**: not in the API-114 §6.3 header by design. FR-002-a's 請求集計 card has no 最終入金日, so no FE change.
  - **By design, no BE change**: `refundApplyContext` only on API-116 sale detail (FE already calls it); no public id for billing items / refund applications (8-char UUID stays); arrears check stays submit-time `E-BIL-202` (our FR-015 = F-01 FR-011 異常系; FE renders it inline); `DELETE billing-adjustments` body `reason` (API-115 §12.1).

## Round 2 result (2026-10-23)

- **R202 (B2)** Done: swagger refreshed from dev (MR !808 deployed) → regen; `sales/_utils/refund-application-body.util.ts` deleted; the billing refund dialog sends the generated body type directly.
- **R201 (B1)** Still open: the PDF renderer is not deployed; `TODO(round2) B1` stays in `use-billing-document-download.hook.ts`. BE 2026-10-23: infra item outside the F-01 MRs, no ETA (BE asking their lead).
- **BE follow-ups (2026-10-23)**: `salesTotal` — **Otaki ⑥ answered 2026-10-21** (billings.dbml v0.4.19, API-115 BR-BIL-109): `total_for_accounting` = Σ `amount_with_tax` of non-excluded lines minus campaign-discount lines; a 日割り line counts at its prorated amount; "pre-campaign" (#393) leaves out only the campaign discount, so with a campaign the 売上合計 card is higher than the billed row sum **by design** (closes the A2 spec question — the card keeps showing `salesTotal`, no FE change); cancelled billings are excluded and the total may be negative. BE fix + backfill of today's `0` rows go in a separate MR (also journals / BAT-006 pair split), no date. MR !821 (API-114 v0.12.4, not merged) already drops cancelled billings. `sentAt` — writers in MR !839 (in live test); PSP dialog 送信日時 fills for sends after deploy only, and the 409 / `X-Warning: psp-sent` check moves to `sent_at` (016 Q6).
- Gates: `npm run type-check` 0 errors, `npm run lint` clean. Shared results (016 R204 / R205, exclusion `idempotency-key`) are in `specs/016-sales-transaction-refund/integration-plan.md` § Round 2 result.

## BE `d4f756c6` follow-up (2026-10-26)

BE main `d4f756c6` (API-114 v0.12.8, API-115 v0.15, API-116 v0.8) deployed to dev; swagger refreshed → `npm run generate-api:real`. BE !821, !839 and the ⑥ fix (`b397b293`, with backfill) are all in this deploy.

- **Contract changes (confirmed intended by BE 2026-10-26)**: `collectionStatus` lost `collecting` → label removed from `COLLECTION_STATUS_LABELS`. `refundApplyContext.alertVariant` now uses the API-118 values (`sbps_void` / `jaccs_manual_or_cashpost` / `cashpost` / `cash` / `bank_transfer`, `null` when not applicable) → `getRefundDialogAlert` maps `jaccs_manual_or_cashpost` → JACCS copy and `cashpost` / `cash` / `bank_transfer` → manual copy; the payment-method fallback maps `convenience_store` to the manual copy (BE: `cashpost`).
- **明細追加** disabled once `collectionStatus !== 'not_due'` (409 `E-BIL-210`; BE: exact spec rule, API-115 v0.15 §9; a confirmed billing hits `E-BIL-203` first; description-only edits stay allowed but the FE has no item edit).
- **確定 / 未確定に戻す** disabled on `cancelled` billings (409 `E-BIL-106`; BE: confirm is rejected too, API-114 §11.2 BR-BIL-002; the bulk job reports the row as failed with `E-BIL-106`, which the 全件一括確定 dialog already lists).
- **Summary error state**: queries run with `retry: false` and no toast, so a failed `/sales/summary` left the skeleton up for good. It now shows 「売上サマリーの取得に失敗しました」 + 再読み込み. Seen once live: 503 `E-SYS-001` on `month=2026-09` (`Root=1-6adef1ec-7c58df3e6d0b1e8f1d95d47d`), 200 on retry; BE: Redis blip in the auth / rate-limit check, retry is the right handling.
- **Dev check (read-only, HQ)**: `salesTotal` 2026-11 ¥18,866 = confirmed non-cancelled billings (cancelled ¥8,479 and unconfirmed ¥11,100 left out). 2026-10 ¥1,203,240 vs ¥1,201,680 row sum: BE confirmed the gap is `totalForAccounting` (pre-campaign-discount) on billings with a campaign line — by design (⑥). `sentAt` / `lastBilledAt` are still `null` everywhere (no backfill; next BAT-001 on dev is 2026-11-09; API-148 member payment sets it at once).
- Gates: `npm run type-check` 0 errors, `npm run lint` clean.
- **請求ID search fix (2026-10-26, found while testing bulk refund)**: `PUBLIC_ID_PATTERN` was `/^B-\d*$/`, but real IDs are `B` + 14 upper-case alnum (system billings, e.g. `BMVJ14BQJF8630F`) and `MB-` + 8 hex (manual, e.g. `MB-C0CBEB02`), so every 請求ID search went to `memberQuery` and found nothing. Now `/^M?B[A-Z0-9-]*$/i`, upper-cased (the `publicId` prefix match is case-sensitive). BE 2026-10-26: these are the only two formats today (TBD-BIL-PUBLIC-ID-FORMAT, BE will warn before a change); no ID starts with `JF-`; seed IDs like `DEV376-BIL-2611` fall to `memberQuery`. Live: `bmvj1` finds both test billings.
- **Sorting (2026-10-26)**: FR-002 narrowed to the four API-114 sorts (Otaki, API-114 v0.11 GAP-276); see spec Clarifications.

## BE `7cf0bf92` follow-up (2026-10-26)

`openapi.real.json` refreshed from dev `/docs-json` (dev runs main `7cf0bf92`) → `npm run generate-api:real`. Swagger delta: 728 paths / 1670 schemas unchanged in count; changed = `ReceiptPdfDto`, `InvoicePdfDto`, receipts / invoices / monthly-billing-runs paths, questionnaire DTOs (other team, tsc clean).

- **B1 PDF (API-119 v0.17, API-114 v0.12.7)**: both PDFs live. `pdfUrl` / `expiresAt` / `byteSize` no longer nullable (`pdfUrl` = 15-min S3 pre-signed URL) → `use-billing-document-download.hook.ts` drops the null guard and the `TODO(round2) B1`. One receipt per payment: the receipt covers every billing that payment settled, all must be issuable and in the caller's store scope (else `E-RCP-001` / `E-RCP-003`, shared toast); `receiptIssuable` uses the same rule, so the existing menu gating is unchanged. Numbers are `R-{YYYY-MM}-{NNNNNN}` / `INV-{YYYY-MM}-{NNNNNN}` (API-119 BR-RCP-005, JST month of first issue) — FE never renders the number (it is printed in the PDF). Tax summed per rate and rounded once (PDF content only). `forceRegenerate` is now accepted and ignored. New 502 `E-EXP-001` (number kept, retry returns the same one) → shared toast.
- **API-115 `hasErrors`**: `false` now returns only error-free runs (!870); member-only errors now count as `hasErrors: true` with a summary. **No FE impact** — no screen lists monthly billing runs.
- **Live 2026-10-26 (HQ, billing `…b102`)**: 帳票 → 領収書 (line `…b502`) and 請求書 → 200, new tab opened, toast 「領収書をダウンロードしました」 / 「請求書をダウンロードしました」. S3 URL 200 `application/pdf` (15,812 / 16,224 bytes, `X-Amz-Expires=900`); re-call keeps the number (`alreadyIssuedAt` set). PDF text: 発行日, number, 入金日 / 請求月 + 支払期限, 10%対象 ¥8,000 + 内消費税 ¥800, lines, 登録番号. Numbers `R-2026-10-000001` / `INV-2026-10-000001` match API-119 BR-RCP-005 (BE confirmed 2026-10-26: their `R-{YYYYMM}` note was wrong). Invoice object key sits under `media/receipts/…` (cosmetic, BE).

## BE !880 follow-up — tax-included price masters (2026-10-27)

BE !880 (main `4dbc353e`, on dev 2026-10-27, TC #8) stores and returns every price master 税込: plan `priceMonthly` / `suspensionFee` / `cancellationFee`, option `feeMonthly`, brand `suspensionFee`, 1DayPass prices, fixed-amount campaign discounts. `priceMonthlyWithTax` / `feeMonthlyWithTax` are removed (API-094 v0.13 §14B). SDK regenerated from dev `/docs-json`.

- 会費調整 cap (`billing-fee-adjustment-dialog.tsx`): `plan.priceMonthly` (was `priceMonthlyWithTax`).
- 手動請求「契約から選択」 (`contract-options.util.ts`, `manual-registration-line-items.tsx`, `manual-registration-form.tsx`): the master price is the line's 税込 as is; the 税抜 column shows `ceil(税込 × 100 / (100 + taxRate))` (TC #8: ¥7,091 → 6,447). Tax is no longer added to it for the 税込 column or 請求総額（税込）. Custom lines still take 税抜 input + 税込見積.
- 明細追加 picker (`billing-add-line-item-dialog.tsx`): the amount is labelled 税込.
- No FE change for API-115 v0.16 §9.2 (no line-edit UI) or API-114 `items[].sourceType` (not read).
