# Phase 1 Data Model: Member Detail — Header Popups & Side Sheets

**Feature**: `021-member-detail-header-actions` | **Date**: 2026-07-29

> **Amended 2026-09-18 — surface 11 (再入会) withdrawn.** The prototype removed the action on
> 2026-09-16 (`a7d0c88`); re-enrollment belongs to the `C-01` enrollment application
> (`POST /api/v1/admin/applications`), and its fee waiver is decided server-side. Everything
> below about 再入会 is kept as a record and no longer describes the screen — see
> [spec.md](./spec.md#amendment-2026-09-18--surface-11-再入会-withdrawn).

This feature owns no persistent entity of its own. It **reads** one aggregate (the member head-up bundle) and **writes** twelve operation payloads. This document records exactly which read fields drive which gating decision, and the target shape of each write payload after the gap fixes.

---

## 1. Read model — the member head-up bundle

Source: `GET /crm/members/{id}` → `GetCrmMembersByIdResponse`. Already implemented; **one addition required**.

### Fields this feature depends on

| Field                                                                                     | Type                                                                                                                                               | What it drives                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `memberStatus`                                                                            | `provisional \| active \| pending_suspended \| suspended \| pending_withdrawal \| withdrawal_pending_processing \| withdrawn \| forced_withdrawal` | Which header cluster renders and which `ステータス変更` items appear (FR-001, FR-002). Gate stop is NOT one of these values — it is an orthogonal flag |
| `mainBrand`                                                                               | `JOYFIT \| FIT365`                                                                                                                                 | Highlighted row in the 強制退会 threshold table (FR-021)                                                                                               |
| `memberNumber`, `personalInfo.lastName/firstName`                                         | string                                                                                                                                             | Target-member block in the ブラックリスト登録 dialog (FR-022)                                                                                          |
| `primaryStore.storeId`, `primaryStore.name`                                               | string                                                                                                                                             | Current store shown read-only in 移籍申請; source store for the workflow hint (FR-015)                                                                 |
| `withdrawnAt`                                                                             | date                                                                                                                                               | 退会日 in the 再入会 sheet's previous-contract block (FR-023)                                                                                          |
| `contractName`                                                                            | string                                                                                                                                             | 旧プラン in the same block                                                                                                                             |
| `unpaidAmount`                                                                            | number                                                                                                                                             | Blocker for 個人情報削除 and 再入会 (FR-024, FR-023)                                                                                                   |
| `constraints.hasUnpaidFee`                                                                | boolean                                                                                                                                            | Disables 休会申請 and 移籍申請 with an inline reason (FR-002)                                                                                          |
| `constraints.inCancellationPeriod`                                                        | boolean                                                                                                                                            | Disables 移籍申請; takes precedence over the unpaid reason (FR-015)                                                                                    |
| `blacklist.isActive`                                                                      | boolean                                                                                                                                            | Disables ブラックリスト登録; blocks 個人情報削除 and 再入会                                                                                            |
| `anonymizedAt`                                                                            | date \| null                                                                                                                                       | Already-anonymized guard for 個人情報削除                                                                                                              |
| `gateStop`                                                                                | object \| null                                                                                                                                     | Banner visibility; the read-only current-setting block in ゲートストップ解除                                                                           |
| `gateStop.pattern`                                                                        | `always_open \| staffed_hours_deny \| always_deny \| unstaffed_hours_deny`                                                                         | Banner is suppressed for `always_open`, which never appears on a stored record (FR-017, US2 §3)                                                        |
| `gateStop.reasonCategory`                                                                 | `nuisance \| unpaid \| fraudulent_use \| other`                                                                                                    | Why the stop was set; shown in the release sheet                                                                                                       |
| `gateStop.setAt`, `gateStop.setBy.displayName`, `gateStop.setAtStore`, `gateStop.message` | —                                                                                                                                                  | 現在の設定 block (FR-018). `setAtStore` is audit data (whose staff set it), never a scope — a stop always covers every store                           |
| `activePenalty`                                                                           | object \| null                                                                                                                                     | Penalty banner + the 現在のペナルティ block (FR-019)                                                                                                   |
| `activePenalty.penaltyType`, `endAt`, `noShowCount`, `appliedAt`                          | —                                                                                                                                                  | Same block                                                                                                                                             |
| `currentMainContract.usageStartDate`                                                      | date                                                                                                                                               | **Two uses**: disables 退会取り消し once passed (G-A / FR-020), and derives the withdrawal type (G-F / FR-014)                                         |
| `currentMainContract.cancellationFeeUntil`                                                | date                                                                                                                                               | Corroborates `inCancellationPeriod` for the 移籍申請 alert                                                                                             |
| `currentMainContract.activeSuspension.startDate/endDate`                                  | date                                                                                                                                               | 休会開始月 / 予定終了月 in the 休会解除 sheet (FR-016)                                                                                                 |
| `currentMainContract.activeFeeAdjustment`                                                 | object \| null                                                                                                                                     | 適用中の値引き確認 block in 休会申請 (FR-013)                                                                                                          |
| `currentMainContract.activePointDiscount.monthlyAmount/pointName`                         | —                                                                                                                                                  | The point-refund row and expected refund amount in the same block                                                                                      |
| `currentMainContract.pendingWithdrawal.scheduledWithdrawalDate`                           | date                                                                                                                                               | Pending-withdrawal banner text                                                                                                                         |
| `currentMainContract.pendingWithdrawal.withdrawalApplicationId`                           | string                                                                                                                                             | Phase 2 target of the application-keyed cancel endpoint (G-11)                                                                                         |

### Required addition (G-C)

| Field                                  | Type                                                               | Why                                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `activePenalty.triggeringReservations` | `string[]` (display strings, e.g. `2026/04/08(水) 19:00 ヨガ基礎`) | The prototype's 予約ペナルティ解除 sheet lists 対象となった予約. The penalty already owns `noShowCount`, so it should own the reservations that produced it (see [research.md](./research.md) R-2). Seed-only for Phase 1 — no write path. |

Also needed for the same sheet's 対象週 line, if not derivable: `activePenalty.targetWeek` (`string`, e.g. `2026/04/07〜04/13`). Seed-only.

**No other read-model change.** `permission.type.ts` already defines all eight permissions this feature gates on (`MembersEdit`, `MembersSuspend`, `MembersWithdraw`, `MembersTransfer`, `MembersGateStop`, `MembersForceWithdraw`, `MembersReEnroll`, `MembersPersonalDataDelete`, plus `BlacklistCreate` and `LessonsPenaltyRelease`).

---

## 2. Shared value object — the proxy application block

Used by surfaces 1, 2 and 3. Current shape is flat and sends a Japanese label; target shape sends the enum key (G-02).

| Field             | Current                                               | Target                                           | Rule                                                          |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `is_proxy`        | boolean                                               | boolean (unchanged)                              | Toggle                                                        |
| `proxy_agreed_at` | `string` (optional)                                   | `string` ISO 8601 (**required when `is_proxy`**) | Not in the future                                             |
| `proxy_method`    | `string` carrying `来店` / `電話` / `メール` / `LINE` | `'in_person' \| 'phone' \| 'email' \| 'line'`    | Japanese label stays in the UI; the enum key goes on the wire |

At the Phase 2 boundary this maps to the API's `applicationSource: mobile_app | proxy` discriminator plus a `proxy { agreementAt, agreementMethod }` block — `is_proxy: true` → `applicationSource: 'proxy'`.

---

## 3. Write payloads — target shape per surface

Changes from the current implementation are marked **▲**.

### 1. 休会申請 — `POST /crm/members/{id}/suspend`

| Field           | Type      | Required    | Rule                                      |
| --------------- | --------- | ----------- | ----------------------------------------- |
| `start_month`   | `YYYY-MM` | yes         | ▲ not before the current month            |
| `end_month`     | `YYYY-MM` | yes         | ▲ after `start_month`; ▲ span ≤ 12 months |
| `reason`        | string    | no          | 休会理由                                  |
| `return_points` | boolean   | no          | Manager-or-above only                     |
| `return_reason` | string    | conditional | Required when `return_points`             |
| proxy block     | —         | —           | §2                                        |

### 2. 退会申請 — `POST /crm/members/{id}/withdraw`

| Field               | Type                     | Required | Rule                                                               |
| ------------------- | ------------------------ | -------- | ------------------------------------------------------------------ |
| `scheduled_date`    | `YYYY-MM-DD`             | yes      | ▲ for 通常退会, ≥ today + 7 days; for 入会取消, < `usageStartDate` |
| `reason`            | **string (free text)**   | yes      | ▲ was a 6-value enum                                               |
| ~~`reason_detail`~~ | —                        | —        | ▲ **removed** — folded into `reason`                               |
| `withdrawal_type`   | `normal \| cancellation` | derived  | ▲ new, computed from `usageStartDate` — never operator-chosen      |
| proxy block         | —                        | —        | §2                                                                 |

### 3. 移籍申請 — `POST /crm/members/{id}/transfer`

| Field           | Type   | Required | Rule                                                             |
| --------------- | ------ | -------- | ---------------------------------------------------------------- |
| `to_store_id`   | string | yes      | ≠ current store                                                  |
| `to_store_name` | string | yes      | Display only; dropped in Phase 2 (G-06)                          |
| `reason`        | string | no       | Free text; maps to `reasonCode: other` + `memo` in Phase 2 (R-5) |
| proxy block     | —      | —        | ▲ §2 — **and the route handler must persist it** (G-E)           |

### 4. 休会解除 — `POST /crm/members/{id}/suspend-release`

| Field          | Type      | Required | Rule                                                                                                                              |
| -------------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `resume_month` | `YYYY-MM` | yes      | ▲ not before the current month — retroactive release unsupported; not after the month of `activeSuspension.endDate` (`E-SUS-217`) |

Semantics: shortens `activeSuspension.endDate`; does not create a separate release record. Real API (2026-10-02): `POST /admin/suspension-applications/{id}/release` takes `resumeMonth` (`YYYY-MM`) — the current month releases now, a later month moves `endDate` to the last day of the month before and the daily batch reinstates the member then.

### 5. ゲートストップ設定 — `POST /crm/members/{id}/gate-stop`

Unchanged. `pattern` (4 values), `reason` (4 values), `terminal_message`, `lock_after_message`.

### 6. ゲートストップ解除 — `DELETE /crm/members/{id}/gate-stop`

Unchanged on the wire (`reason` enum + `detail`). Phase 2 flattens both into the API's free-text `comment` (G-09).

### 7. 予約ペナルティ解除 — `POST /crm/members/{id}/penalty-release`

Unchanged on the wire (`reason` enum + `detail`). The changes are read-side (§1 addition) and UI-side (confirm dialog).

### 8. 退会取り消し — `POST /crm/members/{id}/withdraw-cancel`

| Field     | Type   | Required | Rule                                                     |
| --------- | ------ | -------- | -------------------------------------------------------- |
| `comment` | string | no       | ▲ new — 取り消し事由, recorded on the history row (G-11) |

### 9. 強制退会 — `POST /crm/members/{id}/force-withdraw`

Unchanged. `reason` (required free text). Side effect: automatic blacklist registration.

### 10. ブラックリスト登録 — `POST /crm/members/{id}/blacklist`

| Field    | Type         | Required | Rule                                                                                                                                 |
| -------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `reason` | 4-value enum | yes      | ▲ must be stored as its own field                                                                                                    |
| `memo`   | string       | no       | ▲ must be stored as its own field — the route currently writes `memo ?? reason`, losing the reason whenever a memo is present (G-12) |

### 11. 再入会 — `POST /crm/members/{id}/re-enroll`

| Field             | Type      | Required | Rule                                   |
| ----------------- | --------- | -------- | -------------------------------------- |
| `re_enroll_month` | `YYYY-MM` | yes      | —                                      |
| `plan_id`         | string    | yes      | Plan master ID, never the display name |
| `fee_waived`      | boolean   | yes      | —                                      |

▲ Guard: reject when `blacklist.isActive` or `unpaidAmount > 0` (FR-023) — the path bypasses `C-01`'s blacklist screening. Reuses the member row and `memberNumber`; does not issue a new one.

### 12. 個人情報削除 — `DELETE /crm/members/{id}/personal-data`

| Field          | Type                  | Required | Rule                                                            |
| -------------- | --------------------- | -------- | --------------------------------------------------------------- |
| `reason`       | string                | yes      | ▲ new — 削除理由, recorded for audit (G-D)                      |
| `confirmation` | literal `'ANONYMIZE'` | yes      | ▲ new — typed by the operator, not injected by the client (R-6) |

▲ Guard: reject when `blacklist.isActive` or unpaid balance, and when `anonymizedAt` is already set. Phase 2 moves this to `POST .../anonymize` (G-13).

---

## 4. State transitions

The header only ever moves the member between these states; every transition is one surface.

```text
                      ┌──────────────── 休会解除 (4) ─────────────────┐
                      ↓                                              │
                  ┌────────┐  休会申請 (1)                        ┌───┴────┐
                  │ active │ ───────────────────────────────────→ │suspended│
                  └───┬────┘                                      └───┬────┘
                      │                                              │
                      │ 退会申請 (2)                        退会申請 (2)│
                      └──────────────┐                               │
                                     ↓                               ↓
                                            ┌──────────────────┐
       退会取り消し (8) ─────────────────────→ │pending_withdrawal│
                      └───────────────────── └────────┬─────────┘
                                                      │ (batch, due date)
                                                      ↓
      強制退会 (9) ──────────────────────────→  ┌───────────┐  ←─ forced_withdrawal
                                              │ withdrawn │
                                              └─────┬─────┘
                                    再入会 (11) ─────┘ └───── 個人情報削除 (12)
                                        ↓                        ↓
                                     active              (PII overwritten,
                                                          status unchanged)
```

`provisional`, `pending_suspended` and `withdrawal_pending_processing` are reached
by flows outside this header (enrolment, the suspension due-date batch, the
withdrawal processing batch) and expose no status-change items of their own.

Orthogonal, not part of the status machine:

- **Gate stop** (surfaces 5 and 6) is an independent record only — it never changes `memberStatus`, and a member can be gate-stopped while active, on leave or scheduled to withdraw (backend design answer 2026-08-10). Pattern `always_allowed` means "set, but unrestricted" — the banner stays hidden. Whether a stop is in force is decided by the record, never by the status.
- **Reservation penalty** (surface 7) never changes `memberStatus`. It is `D-01`-owned and is released immediately, producing no pending application.
- **Blacklist registration** (surface 10) never changes `memberStatus` on its own; it is also a side effect of 強制退会 (surface 9).

---

## 5. Audit trail

Every one of the twelve operations appends one member-change-history row: timestamp, operator, operation, and the reason/comment captured by that surface (FR-025). For this feature the change-history data is **seed-only** — the 変更履歴 tab reads it, and no create / update / delete flow for history records is in scope.
