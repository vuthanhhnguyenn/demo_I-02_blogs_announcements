# Phase 1 Data Model: Transfer Management Update

> **Superseded (2026-10-05)**: this document describes the mock-API implementation round (prototype @ 1cc2d6d, 2026-07-18). The screen now runs on the real API-091 (`/admin/transfer-applications`, commit 4fe1f967) and the prototype @ 47423ec — free-word search, the 申請中 status, the 200-row page size and the 却下 wording are gone. Current behavior: [spec.md](spec.md) › _Prototype Alignment_ and [checklists/parity.md](checklists/parity.md). Kept as a historical record.

**Feature**: `024-transfer-management` | **Date**: 2026-08-05
**Source of truth**: `src/app/api/_schemas/transfer.schema.ts` (Zod) → registered via `src/app/api/_scripts/register-schemas.ts` → OpenAPI → regenerated into `src/lib/api/types.gen.ts`.

> Per Constitution II, components consume types **only** from `src/lib/api/types.gen.ts`. Every change below requires client regeneration before UI work consumes it. No hand-declared status unions (today `transfer-status-badge.tsx:7` violates this and must be deleted).

## Entity: TransferStatus (enum)

Five values, 1:1 with the FR-001 filter options. See research.md Decision 1.

| Value                 | Label (ja)     | Meaning                                                      | Change                               |
| --------------------- | -------------- | ------------------------------------------------------------ | ------------------------------------ |
| `pending`             | 申請中         | Created, not yet in the origin-store approval queue          | keep                                 |
| `from_store_pending`  | 移籍元承認待ち | Awaiting origin-store approval                               | **add**                              |
| `from_store_approved` | 移籍先承認待ち | Origin approved; awaiting destination approval (FIT365 only) | keep value, relabel                  |
| `completed`           | 完了           | Transfer executed; member's contracted store updated         | keep, relabel                        |
| `rejected`            | 否認           | Declined at any stage; case closed                           | keep, relabel                        |
| ~~`approved`~~        | —              | —                                                            | **remove** (folded into `completed`) |

Display metadata (badge classes, dot visibility, StatusCard tone/icon) lives in a feature-local constants file following `MEMBER_STATUS_CLASSES` (`members/_constants/constants.ts:60-77`):

| Status                | Badge class                                                | Dot | StatusCard tone | Icon       |
| --------------------- | ---------------------------------------------------------- | :-: | --------------- | ---------- |
| `pending`             | `bg-info/15 text-info border-info/20`                      |  ✓  | `info`          | `Clock`    |
| `from_store_pending`  | `bg-warning/15 text-warning border-warning/20`             |  ✓  | `warning`       | `Clock`    |
| `from_store_approved` | `bg-warning/15 text-warning border-warning/20`             |  ✓  | `warning`       | `Clock`    |
| `completed`           | `variant="secondary"` (no custom class)                    |  ✗  | `muted`         | `Check`    |
| `rejected`            | `bg-destructive/15 text-destructive border-destructive/20` |  ✓  | `destructive`   | `FileText` |

## Entity: ExclusionReason (enum) — **new**

| Value           | Label (ja)                  | Applies to  |
| --------------- | --------------------------- | ----------- |
| `unpaid`        | 未納あり                    | JOYFIT only |
| `campaign_lock` | 縛り期間中 (解約手数料期間) | JOYFIT only |

## Entity: TransferRequest (list row)

`TransferRequestSchema` — the shape returned by `GET /api/crm/transfers`.

| Field                          | Type                   | Req | Change       | Notes                                                      |
| ------------------------------ | ---------------------- | :-: | ------------ | ---------------------------------------------------------- |
| `id`                           | `string`               |  ✓  | —            | e.g. `TR-001`                                              |
| `member_id`                    | `string`               |  ✓  | —            |                                                            |
| `member_name`                  | `string`               |  ✓  | —            |                                                            |
| `brand`                        | `'joyfit' \| 'fit365'` |  ✓  | —            |                                                            |
| `from_store_id`                | `string`               |  ✓  | —            |                                                            |
| `from_store_name`              | `string`               |  ✓  | —            |                                                            |
| `to_store_id`                  | `string`               |  ✓  | —            |                                                            |
| `to_store_name`                | `string`               |  ✓  | —            |                                                            |
| `applied_at`                   | `string` (ISO)         |  ✓  | —            |                                                            |
| `scheduled_date`               | `string` (ISO)         |  ✓  | —            |                                                            |
| `status`                       | `TransferStatus`       |  ✓  | enum changed |                                                            |
| `auto_transfer_eligible`       | `boolean \| null`      |     | **add**      | `null` for FIT365 — renders `—` (PAR028)                   |
| `exclusion_reasons`            | `ExclusionReason[]`    |     | **add**      | empty when eligible; both values may be present together   |
| `unpaid_amount`                | `number \| null`       |     | **add**      | yen; required when `exclusion_reasons` includes `unpaid`   |
| `campaign_lock_remaining_days` | `number \| null`       |     | **add**      | required when `exclusion_reasons` includes `campaign_lock` |

The list row carries eligibility fields because the 自動移籍可否 column and the bulk-selection guard both need them without an N+1 fetch (research.md Decision 13).

## Entity: TransferDetail

`TransferDetailSchema` extends `TransferRequestSchema` with:

| Field              | Type                     | Req | Change  | Notes                                      |
| ------------------ | ------------------------ | :-: | ------- | ------------------------------------------ |
| `reason`           | `string`                 |  ✓  | —       | 移籍理由                                   |
| `applicant_name`   | `string`                 |  ✓  | —       |                                            |
| `applicant_role`   | `string`                 |  ✓  | —       | free-form label, e.g. スタッフ             |
| `is_proxy`         | `boolean`                |     | —       | existing, not rendered by the V0           |
| `proxy_agreed_at`  | `string`                 |     | —       | existing, not rendered                     |
| `proxy_method`     | `string`                 |     | —       | existing, not rendered                     |
| `updated_at`       | `string` (ISO)           |  ✓  | —       | 最終更新 in the StatusCard                 |
| `approval_history` | `ApprovalStep[]`         |  ✓  | —       | brand-shaped; see below                    |
| `unpaid_period`    | `string \| null`         |     | **add** | e.g. `2026年2月分` — detail-only (PAR047)  |
| `decisions`        | `TransferDecision[]`     |  ✓  | **add** | persisted approve/reject comments (FR-008) |
| `unlock`           | `TransferUnlock \| null` |     | **add** | manual-override audit (FR-012)             |

Member head-up fields required by PAR046 (`old_member_no`, `member_name_kana`, `member_type`, `contract_name`) are **not** duplicated onto the transfer — the detail screen resolves them from the member record it already links to. Confirm during implementation that the member detail endpoint exposes them; if not, add them to `TransferDetailSchema` rather than firing a second request.

## Entity: ApprovalStep

`ApprovalHistoryItem` — unchanged shape, corrected generation.

| Field          | Type                     | Notes                                           |
| -------------- | ------------------------ | ----------------------------------------------- |
| `step`         | `number`                 | 1-based                                         |
| `label`        | `string`                 | e.g. 移籍元承認                                 |
| `store_type`   | `'from' \| 'to' \| null` | drives the 移籍元 / 移籍先 badge (PAR056)       |
| `completed`    | `boolean`                |                                                 |
| `completed_at` | `string \| null`         |                                                 |
| `completed_by` | `string \| null`         |                                                 |
| `is_automatic` | `boolean`                | drives the 自動実行 badge + `Bot` icon (PAR054) |

**Brand-shaped generation** (FR-007). One builder used by both seed and `create()` — today `create()` hardcodes a FIT365-shaped 3-step history for every brand (research.md Decision 11.2).

- **JOYFIT — 3 steps**: `申請` → `移籍元承認` (`store_type: 'from'`) → `システム自動移籍実行` (`is_automatic: true`)
- **FIT365 — 4 steps**: `申請` → `移籍元承認` (`'from'`) → `移籍先承認` (`'to'`) → `移籍実行`

## Entity: TransferDecision — **new**

Records each approve/reject action so FR-008's comment is persisted rather than discarded.

| Field        | Type                     | Notes                                            |
| ------------ | ------------------------ | ------------------------------------------------ |
| `action`     | `'approve' \| 'reject'`  |                                                  |
| `comment`    | `string \| null`         | optional, `.max(TEXTAREA_MAX_LENGTH)` (1000)     |
| `actor_name` | `string`                 | resolved server-side from the authenticated user |
| `actor_role` | `UserRole`               |                                                  |
| `store_type` | `'from' \| 'to' \| null` | which side approved                              |
| `decided_at` | `string` (ISO)           |                                                  |

## Entity: TransferUnlock — **new**

Audit record for the FR-012 manual override; renders the success alert at PAR049.

| Field           | Type           | Notes                                                           |
| --------------- | -------------- | --------------------------------------------------------------- |
| `reason`        | `string`       | **required**, non-empty after trim, `.max(TEXTAREA_MAX_LENGTH)` |
| `operator_name` | `string`       | server-resolved                                                 |
| `unlocked_at`   | `string` (ISO) |                                                                 |

## Validation rules

| Rule                                                                         | Source                                                                             |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `unlock.reason` must be non-empty after trim                                 | FR-012, PAR050 — the confirm action stays disabled until satisfied                 |
| Approve/reject `comment` is optional, max 1000 chars                         | FR-008, code-rule IV (`TEXTAREA_MAX_LENGTH`)                                       |
| `auto_transfer_eligible` is `null` for FIT365                                | FR-006 — eligibility is a JOYFIT-only concept                                      |
| `exclusion_reasons` non-empty ⟺ `auto_transfer_eligible === false`           | FR-006                                                                             |
| `unpaid_amount` present ⟺ reasons include `unpaid`                           | FR-006                                                                             |
| `campaign_lock_remaining_days` present ⟺ reasons include `campaign_lock`     | FR-006                                                                             |
| Bulk approve accepts only JOYFIT rows with `auto_transfer_eligible === true` | FR-013, PAR020 — enforced by `enableRowSelection` **and** re-validated server-side |
| Staff may act only on their own store's side at the matching stage           | FR-004/FR-008 — see the state machine below                                        |

## State machine

```
                        ┌─────────── reject (any actor with rights) ──────────► rejected
                        │
pending ──route──► from_store_pending ──approve(from)──► ?
                                                        │
                        brand = joyfit ────────────────►┤ auto-execute ──► completed
                        (blocked while excluded,        │
                         unless unlocked)               │
                        brand = fit365 ────────────────►└─► from_store_approved
                                                              │
                                                    approve(to) │
                                                              ▼
                                                          completed
```

Transition rules:

| From                                         | Action            | Guard                                                                                                                   | To                                                   |
| -------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `pending`                                    | route (on create) | —                                                                                                                       | `from_store_pending`                                 |
| `from_store_pending`                         | approve           | actor may act on `from` side; JOYFIT additionally requires `auto_transfer_eligible !== false` **or** an `unlock` record | JOYFIT → `completed`; FIT365 → `from_store_approved` |
| `from_store_approved`                        | approve           | actor may act on `to` side (FIT365 only)                                                                                | `completed`                                          |
| `from_store_pending` / `from_store_approved` | reject            | actor may act on the current side                                                                                       | `rejected`                                           |
| `completed` / `rejected`                     | any               | —                                                                                                                       | terminal → 400                                       |

Fixes vs today (research.md Decision 11.3): a JOYFIT transfer at `from_store_approved` is currently a dead end, and **no path ever reaches `completed`**. The JOYFIT approve transition must perform the auto-execution — updating the member's contracted store — and mark step 3 complete.

**Side-effect on `completed`**: set the member's primary-contract store to `to_store_id` (FR-010/FR-011). This is the transfer's whole purpose and is currently never performed.

## Actor eligibility (row-level)

Pure helper, extracted from the JWT-reading code being deleted:

```
canActOnTransfer(user, transfer) →
  false if status ∈ {completed, rejected}
  false if !hasPermission(MembersTransfersApprove)
  true  if role ∈ {System, Headquarter, Manager}      // scope already applied by the query
  if role === Staff:
    true if status === from_store_pending  && user.store_id === transfer.from_store_id
    true if status === from_store_approved && brand === 'fit365'
                                          && user.store_id === transfer.to_store_id
  false otherwise
```

`Trainer` never reaches the screen (no `MembersTransfersView`); `Observer` holds view but not approve.

## Visibility scoping

A transfer is visible when `from_store_id ∈ allowedStores || to_store_id ∈ allowedStores`, where `allowedStores = getAllowedStoreIds(user)` and `null` means unrestricted (System/Headquarter). OR-across-both-sides is unique to this feature; every other scoped route matches a single store (research.md Decision 5).

## Seed data updates

`transfer.seed.ts` — 14 rows (TR-001…TR-014) need:

- `approved` rows remapped to `completed`; a subset of `pending` rows remapped to `from_store_pending` so every one of the five statuses is represented
- eligibility fields on all JOYFIT rows: at least one `auto_transfer_eligible: true`, one with `unpaid`, one with `campaign_lock`, and one carrying **both** reasons (spec edge case)
- `auto_transfer_eligible: null` on every FIT365 row
- brand-correct `approval_history` via the shared builder (3 steps JOYFIT / 4 steps FIT365)
- at least one row with a populated `decisions[]` and one with an `unlock` record, so the audit UI has something to render

> The mock DB is a `globalThis` singleton — seed edits require a full dev-server restart, not just HMR.
