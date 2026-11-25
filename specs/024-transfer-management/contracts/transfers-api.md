# Phase 1 Contract: Transfer Management API

> **Superseded (2026-10-05)**: this document describes the mock-API implementation round (prototype @ 1cc2d6d, 2026-07-18). The screen now runs on the real API-091 (`/admin/transfer-applications`, commit 4fe1f967) and the prototype @ 47423ec — free-word search, the 申請中 status, the 200-row page size and the 却下 wording are gone. Current behavior: [spec.md](../spec.md) › _Prototype Alignment_ and [checklists/parity.md](../checklists/parity.md). Kept as a historical record.

**Feature**: `024-transfer-management` | **Date**: 2026-08-05

Contract direction in this repo: Zod schemas in `src/app/api/_schemas/transfer.schema.ts` are registered by `src/app/api/_scripts/register-schemas.ts` into the OpenAPI document, which hey-api regenerates into `src/lib/api/types.gen.ts` + `@tanstack/react-query.gen.ts`. **The Zod schema is the contract**; this document specifies its target shape. `src/lib/api/**` is never hand-edited (Constitution II).

## Auth applies to every endpoint

All five endpoints call `getAuthUserFromRequest(request)` (`src/app/api/_lib/auth.ts:29`) and return `401` when it fails. Store scope comes from `getAllowedStoreIds(user)` (`:63`), where `null` = unrestricted.

Today **none** of the transfer routes authenticate and **none** scope by store; the `403` responses already declared in their OpenAPI metadata (`approve/route.ts:31-34`) are unreachable. This contract makes them reachable.

Visibility predicate, unique to this feature (OR across both stores):

```ts
const visible =
  allowed === null || allowed.includes(t.from_store_id) || allowed.includes(t.to_store_id);
```

---

## 1. `GET /api/crm/transfers` — list

**Permission**: `MembersTransfersView`. **Changed**: adds `store_id` + `auto_transfer`; rows gain eligibility fields; results are store-scoped.

### Query — `GetTransfersQuerySchema`

| Param            | Type                                                        | Default      | Change       | Notes                                                                                                       |
| ---------------- | ----------------------------------------------------------- | ------------ | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `page`           | int ≥ 1                                                     | `1`          | —            |                                                                                                             |
| `limit`          | int                                                         | `25`         | **change**   | was `20` in schema while the UI sent 25; align to `PAGE_SIZE`. Accepts 25/50/100/200 (FR-014)               |
| `search`         | string                                                      | —            | —            | matches `id` or `member_name`, case-insensitive                                                             |
| `status`         | `TransferStatus`                                            | —            | enum changed | see data-model.md                                                                                           |
| `from_store_id`  | string                                                      | —            | —            | side-specific narrowing                                                                                     |
| `to_store_id`    | string                                                      | —            | —            | side-specific narrowing                                                                                     |
| `store_id`       | string                                                      | —            | **add**      | header store-selector scope: matches **either** side                                                        |
| `brand`          | `'joyfit' \| 'fit365'`                                      | —            | —            |                                                                                                             |
| `applied_period` | `'this_month' \| 'last_month' \| 'this_year'`               | —            | —            |                                                                                                             |
| `auto_transfer`  | `'eligible' \| 'excluded'`                                  | —            | **add**      | FR-006 / PAR009. `eligible` → JOYFIT + `auto_transfer_eligible === true`; `excluded` → JOYFIT + `=== false` |
| `sort_by`        | `'applied_at' \| 'scheduled_date' \| 'member_name' \| 'id'` | `applied_at` | —            |                                                                                                             |
| `sort_order`     | `'asc' \| 'desc'`                                           | `desc`       | —            |                                                                                                             |

### Responses

| Code | Body                                                                                |
| ---- | ----------------------------------------------------------------------------------- |
| 200  | `{ transfers: TransferRequest[], pagination: { page, limit, total, total_pages } }` |
| 400  | `{ error }` — invalid query                                                         |
| 401  | `{ error }` — unauthenticated                                                       |
| 403  | `{ error: 'Forbidden' }` — resolved store scope is empty                            |
| 500  | `{ error }`                                                                         |

`total` must reflect the **scoped and filtered** count so `FilterResultBanner` and `TablePaginationWithSize` agree (PAR015, PAR034).

---

## 2. `GET /api/crm/transfers/{id}` — detail

**Permission**: `MembersTransfersView`. **Changed**: 404 when the row is outside the caller's store scope (do not leak existence); response gains `unpaid_period`, `decisions`, `unlock`.

| Code | Body                                                                    |
| ---- | ----------------------------------------------------------------------- |
| 200  | `{ transfer: TransferDetail }`                                          |
| 401  | `{ error }`                                                             |
| 404  | `{ error: 'Transfer request not found' }` — missing **or** out of scope |

---

## 3. `PATCH /api/crm/transfers/{id}/approve` — approve

**Permission**: `MembersTransfersApprove` **plus** row-level `canActOnTransfer` (data-model.md). **Changed**: comment is persisted (was validated then discarded); JOYFIT now auto-executes; exclusion blocks approval.

### Request — `ApproveTransferBodySchema`

| Field     | Type     | Req | Notes                                        |
| --------- | -------- | :-: | -------------------------------------------- |
| `comment` | `string` |     | optional, `.max(TEXTAREA_MAX_LENGTH)` = 1000 |

### Behaviour

1. Reject terminal states (`completed` / `rejected`) → 400.
2. Enforce `canActOnTransfer` → 403.
3. JOYFIT with `auto_transfer_eligible === false` and no `unlock` record → **409** (FR-006; the excluded row must not be approvable even if the UI is bypassed).
4. Append a `TransferDecision`; mark the current `approval_history` step complete with `completed_by` = actor.
5. Transition per the state machine: JOYFIT → `completed` (mark the `is_automatic` step complete **and update the member's contracted store to `to_store_id`**); FIT365 `from_store_pending` → `from_store_approved`; FIT365 `from_store_approved` → `completed` + contracted-store update.

| Code      | Body                                                           |
| --------- | -------------------------------------------------------------- |
| 200       | `{ transfer: TransferDetail }`                                 |
| 400       | invalid body, terminal state, or invalid transition            |
| 401 / 403 | unauthenticated / not permitted for this row                   |
| 404       | not found or out of scope                                      |
| 409       | `{ error }` — blocked by an unresolved auto-transfer exclusion |

---

## 4. `PATCH /api/crm/transfers/{id}/reject` — reject

**Permission**: `MembersTransfersApprove` + `canActOnTransfer`. **Changed**: comment persisted; `approval_history` is now updated (today `reject()` touches only `status` + `updated_at`).

Request: same optional `comment` as approve (`RejectTransferBodySchema`). Comment stays **optional** per FR-008 and the V0's placeholder 否認理由を入力してください（任意）.

Behaviour: append a `TransferDecision` with `action: 'reject'`, set `status: 'rejected'`, and notify the applicant (out-of-band; no synchronous contract). Same response codes as approve, minus 409.

---

## 5. `POST /api/crm/transfers/bulk-approve` — bulk approve — **NEW**

**Permission**: `MembersTransfersBulkApprove` (System / Headquarter / Manager) + `canActOnTransfer` per row. Satisfies FR-013.

### Request — `BulkApproveTransfersBodySchema`

| Field          | Type       | Req | Notes                                                       |
| -------------- | ---------- | :-: | ----------------------------------------------------------- |
| `transfer_ids` | `string[]` |  ✓  | min 1, max 200 (the largest page size)                      |
| `comment`      | `string`   |     | optional, max 1000 — applied to every decision in the batch |

### Behaviour

Per-item validation: each id must exist, be in scope, be JOYFIT, have `auto_transfer_eligible === true`, be in an approvable state, and pass `canActOnTransfer`. Process each independently and report per-item outcomes rather than failing the batch — a partial success is the useful answer for a 200-row batch.

| Code      | Body                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 200       | `{ approved: string[], failed: Array<{ id: string, reason: string }> }` |
| 400       | invalid body (empty or over-long `transfer_ids`)                        |
| 401 / 403 | unauthenticated / lacks bulk-approve permission                         |

The UI reports `approved.length` in its success toast and surfaces `failed` when non-empty (PAR040 shows only the success path; a partial failure must not be silently swallowed).

---

## 6. `PATCH /api/crm/transfers/{id}/unlock` — manual override — **NEW**

**Permission**: `MembersTransfersUnlock` (System / Headquarter / Manager). Satisfies FR-012, PAR048-050.

### Request — `UnlockTransferBodySchema`

| Field    | Type     | Req | Notes                                                      |
| -------- | -------- | :-: | ---------------------------------------------------------- |
| `reason` | `string` |  ✓  | **non-empty after trim**, max 1000 (`TEXTAREA_MAX_LENGTH`) |

### Behaviour

1. Row must carry `campaign_lock` in `exclusion_reasons` → otherwise 409 (nothing to unlock).
2. Write the `TransferUnlock` audit record (`reason`, `operator_name`, `unlocked_at`).
3. Clear the `campaign_lock` blocker so approval may proceed. If `unpaid` is also present the row stays excluded — unlock releases only the cancellation-fee/campaign lock, matching the V0, where the unpaid alert has no override control.

| Code      | Body                                        |
| --------- | ------------------------------------------- |
| 200       | `{ transfer: TransferDetail }`              |
| 400       | empty/whitespace-only or over-long `reason` |
| 401 / 403 | unauthenticated / lacks unlock permission   |
| 404       | not found or out of scope                   |
| 409       | no `campaign_lock` exclusion present        |

---

## 7. `POST /api/crm/members/{id}/transfer` — upstream, unchanged contract

Out of scope for A-02, but two internal changes are required:

- On create, populate the eligibility fields from `member.constraints` (research.md Decision 13) so A-02 can render them.
- Build `approval_history` with the **brand-aware** builder; `transfer.table.ts:59-87` currently hardcodes a FIT365-shaped 3-step history for every brand.

Existing pre-flight 409s (`inCancellationPeriod`, `hasUnpaidFee`) stay as-is (research.md Decision 14).

---

## Regeneration checklist

1. Edit `src/app/api/_schemas/transfer.schema.ts` — statuses, new fields, `BulkApproveTransfersBodySchema`, `UnlockTransferBodySchema`.
2. Register the new schemas in `src/app/api/_scripts/register-schemas.ts`.
3. Declare the two new routes in the OpenAPI route registry (`src/app/api/_routes/index.ts`).
4. Regenerate the client — `src/lib/api/**` must change only by regeneration.
5. Add the new page/action permissions to `src/types/permission.type.ts` + `src/constants/permission.constants.ts`.
6. `npx tsc --noEmit` must exit 0 before UI work begins — the removed `approved` status will surface every stale reference, which is the point.

## Contract → requirement trace

| Endpoint                        | Requirements                                           |
| ------------------------------- | ------------------------------------------------------ |
| `GET /transfers`                | FR-001, FR-002, FR-003, FR-004, FR-006, FR-014, FR-015 |
| `GET /transfers/{id}`           | FR-005, FR-006, FR-007                                 |
| `PATCH /transfers/{id}/approve` | FR-008, FR-009, FR-010, FR-011                         |
| `PATCH /transfers/{id}/reject`  | FR-008, FR-009, FR-011                                 |
| `POST /transfers/bulk-approve`  | FR-013                                                 |
| `PATCH /transfers/{id}/unlock`  | FR-012                                                 |
