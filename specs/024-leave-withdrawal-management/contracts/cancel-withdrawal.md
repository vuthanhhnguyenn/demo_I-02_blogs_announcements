# Contract: Cancel a scheduled withdrawal

**Endpoint**: `POST /api/crm/leaves/{id}/cancel-withdrawal`
**Status**: exists — **modify**
**Schema**: `src/app/api/_schemas/leave.schema.ts` → `CancelWithdrawalRequestSchema`, `LeaveActionResponseSchema`
**Handler**: `src/app/api/crm/leaves/[id]/cancel-withdrawal/route.ts`
**Generated client**: `postCrmLeavesByIdCancelWithdrawalMutation`
**Real-API counterpart**: `POST /api/v1/admin/withdrawal-applications/{id}/cancel`
**Requirements**: FR-006, FR-049 – FR-052, FR-077 – FR-080a

This is the **only** mutation A-03 owns.

## Request

```jsonc
{ "comment": "会員より継続の申し出" } // optional — 取り消し事由 / operator note
```

## Response `200`

```jsonc
{
  "leave": {
    /* the updated LeaveDetail */
  },
}
```

The application closes and the member returns to a normal (valid) state. The executing operator and the timestamp are recorded (FR-050).

## Guard chain

Evaluated inside the handler at execution time — never trusted from the client's loaded row (FR-052). Order matters; the first failure wins.

| #   | Condition                                                     | Status | `cancellation_blocked_reason` |
| --- | ------------------------------------------------------------- | ------ | ----------------------------- |
| 1   | `status !== 'withdrawal_scheduled'`                           | `409`  | `not_cancellable_status`      |
| 2   | `status === 'withdrawal_pending'`                             | `409`  | `batch_processing_started`    |
| 3   | `usage_start_date != null && usage_start_date <= today` (JST) | `422`  | `usage_started`               |

A null `usage_start_date` counts as "not started" and passes.

**Not idempotent** — repeating a successful cancellation returns `409` (`not_cancellable_status`), because the row is no longer `withdrawal_scheduled`. This matches the real contract and is the concurrent-loser outcome when two operators race (spec Edge Cases).

## Authorisation

| Role                | Allowed           |
| ------------------- | ----------------- |
| System, Headquarter | ✅ all stores     |
| Manager             | ✅ managed stores |
| Staff               | ✅ own store      |
| Observer            | ❌ `403`          |
| Trainer             | ❌ `403`          |

The role tier is necessary but not sufficient: Headquarter / Manager / Staff also need the 職位 flag `positions.can_cancel_withdrawal`; without it the call answers `403` `E-WDR-100` ("退会申請を取り消す権限がありません。"). The UI gates on the same flag (FR-006, Q-18) so this stays unreachable from the screens.

An in-scope-but-unauthorised caller gets `403`; an out-of-scope id gets `404` (row visibility equals operability scope).

## Errors

| Status | When                                                                       | UI treatment                                                                  |
| ------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `403`  | Observer / Trainer, missing `can_cancel_withdrawal`, or insufficient scope | Should be unreachable — the action is role- and flag-gated in the UI (FR-006) |
| `404`  | Unknown id or out of scope                                                 | Not-found treatment (FR-083)                                                  |
| `409`  | Guard 1 or 2                                                               | Surface the message, leave the row unchanged (FR-052, FR-082a)                |
| `422`  | Guard 3                                                                    | Same                                                                          |
| `500`  | Unexpected                                                                 | Same                                                                          |

## UI contract

Both entry points call this endpoint and both must give feedback (FR-080a — the V0 detail dialog's no-op is a defect, not a design):

| Entry point                 | Dialog title                 | Confirm label      | On success                                                                               |
| --------------------------- | ---------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| List row menu (FR-049)      | 退会取り消しを実行しますか？ | 取り消しを実行する | Toast: 「{name} の退会申請を取り消しました。会員ステータスを有効（通常）に戻しました。」 |
| Detail status card (FR-080) | 退会を取り消しますか？       | 取り消す           | Same cancellation, same feedback, then refresh the detail                                |

Wording deliberately differs per screen — each keeps its reviewed V0 copy rather than inventing unified text (Q-08).

On success both must invalidate the list query and, on the detail, the detail query.

## Removed sibling endpoints

`POST .../approve`, `POST .../reject` and `POST .../execute-withdrawal` exist today and are **deleted** with this feature: approval and rejection belong to A-01-01, and withdrawal execution is a System batch (spec Out of Scope, plan gap A1/A3). Their request schemas (`ApproveLeaveRequestSchema`, `RejectLeaveRequestSchema`, `ExecuteWithdrawalRequestSchema`) go with them.
