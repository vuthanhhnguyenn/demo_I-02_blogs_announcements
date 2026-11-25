# Phase 1 Contracts: Mock API changes & backend requests

**Feature**: `021-member-detail-header-actions` | **Date**: 2026-07-29

> **Amended 2026-09-18 — surface 11 (再入会) withdrawn.** The prototype removed the action on
> 2026-09-16 (`a7d0c88`); re-enrollment belongs to the `C-01` enrollment application
> (`POST /api/v1/admin/applications`), and its fee waiver is decided server-side. Everything
> below about 再入会 is kept as a record and no longer describes the screen — see
> [spec.md](../spec.md#amendment-2026-09-18--surface-11-再入会-withdrawn).

Two parts: **§A** the contract changes this feature makes to the project's mock API (Zod-first, then regenerated), and **§B** the requests handed to the backend team. All twelve endpoints already exist as mock routes under `src/app/api/crm/members/[id]/`; §A lists only what changes.

Source of truth for the request/response **shapes** is `src/app/api/_schemas/member.schema.ts`.

**Each tree owns its own copy of the rules.** Code under `src/app/(private)/` must never import
from `src/app/api/`, and neither may the reverse. There is no neutral shared module — and none is
needed, because the two sides use different halves of the logic.

| Tree    | Where                                          | Holds                                                                                                                                                                                 |
| ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api     | `src/app/api/_lib/member-operation.ts`         | 3 numeric limits, the `ANONYMIZE` literal, and the server validators `validateSuspensionRange` / `validateResumeMonth` / `validateProxyAgreement` — genuinely shared by 6 route files |
| private | `members/[id]/_utils/member-operation.util.ts` | `deriveWithdrawalType`, used by the 退会申請 form and its schema                                                                                                                      |
| private | the consuming file itself                      | each limit / literal the forms enforce, declared locally — see below                                                                                                                  |

**Nothing is extracted just because it looks extractable.** On the private side each rule had exactly
one consuming file, so `SUSPENSION_MAX_MONTHS` lives in `leave-sheet.tsx`, `WITHDRAWAL_MIN_LEAD_DAYS`
in `withdraw-form.schema.ts`, and the `ANONYMIZE` literal in `personal-data-delete-dialog.tsx`. A
`_constants/member-operation.constants.ts` aggregating the three was written and then removed: it
shared nothing between files, and `_constants/` here is for genuinely cross-file values
(`gate-stop.ts` has 4 consumers, `auth-method.ts` has 2).

Message text is likewise inline at its single use site, interpolating the limit it quotes
(`` `休会期間は最長${SUSPENSION_MAX_MONTHS}ヶ月です` ``) so the number in the text cannot disagree with
the number in the rule.

Enum **types** consumed by the UI come from the generated client (`@/lib/api/types.gen`), never from
the Zod schema module — e.g. `ProxyAgreementMethod`, `WithdrawalType`.

After the last edit, run once:

```bash
npm run generate-openapi && npx prettier --write src/lib/openapi.json && npm run generate-client
npm run lint && npm run type-check
```

Never edit `src/lib/openapi.json` or anything under `src/lib/api/` by hand (Constitution II; see [research.md](../research.md) R-1).

---

## §A — Mock API contract changes

### A-1 `SuspendRequestSchema` — `POST /crm/members/{id}/suspend`

Add cross-field validation (G-01, R-7). Field set is unchanged.

```
start_month : YYYY-MM  — REQUIRED, must not be before the current month
end_month   : YYYY-MM  — REQUIRED, must be after start_month, span ≤ 12 months
```

Implement as a Zod `.superRefine` on the object so all three messages can be attached to the right field. Route returns `400` with the joined issue messages (the existing pattern).

New rejection cases the route must produce:

| Case                        | Status | Message                                          |
| --------------------------- | ------ | ------------------------------------------------ |
| `start_month` in the past   | 400    | `休会開始月は今月以降を指定してください`         |
| `end_month` ≤ `start_month` | 400    | `休会終了月は休会開始月より後を指定してください` |
| span > 12 months            | 400    | `休会期間は最長12ヶ月です`                       |

### A-2 `WithdrawRequestSchema` — `POST /crm/members/{id}/withdraw`

The largest change (G-F, G-04).

```
scheduled_date  : YYYY-MM-DD — REQUIRED
reason          : string     — REQUIRED, free text          ▲ was WithdrawReasonSchema
reason_detail   : —          — ▲ REMOVED
withdrawal_type : 'normal' | 'cancellation' — ▲ NEW, derived by the client
proxy fields    : see A-6
```

- `WithdrawReasonSchema` and the `WithdrawReason` enum lose their only consumer. Remove the schema; the generated `WithdrawReason` disappears on regeneration. Check for other consumers before deleting (`src/app/(private)/members/leaves/**` may reference a withdrawal-reason label map — if so, that belongs to `A-03` and must keep its own copy).
- `withdrawal_type` is computed, never operator-entered: `cancellation` when `scheduled_date < currentMainContract.usageStartDate`, otherwise `normal`.
- Date rule per type:

| Type           | Rule                               | Status | Message                                                |
| -------------- | ---------------------------------- | ------ | ------------------------------------------------------ |
| `normal`       | `scheduled_date >= today + 7 days` | 400    | `退会予定日は7日以上先の日付を指定してください`        |
| `cancellation` | `scheduled_date < usageStartDate`  | 400    | `入会取り消しは利用開始日より前の日付のみ指定できます` |

### A-3 `SuspendReleaseRequestSchema` — `POST /crm/members/{id}/suspend-release`

Add the missing rule (G-07, Q3).

```
resume_month : YYYY-MM — REQUIRED, must not be before the current month
```

| Case                       | Status | Message                              |
| -------------------------- | ------ | ------------------------------------ |
| `resume_month` in the past | 400    | `復帰月は今月以降を指定してください` |

Route semantics: shorten the member's active suspension `end_month` to the month before `resume_month`. Do **not** insert a separate release record.

### A-4 `WithdrawCancelRequestSchema` — `POST /crm/members/{id}/withdraw-cancel`

New request schema — the route currently accepts no body (G-11).

```
comment : string — OPTIONAL, 取り消し事由, recorded on the change-history row
```

The route rejects only on the member's state, mirroring the real API:

| Case                            | Status | Message                        |
| ------------------------------- | ------ | ------------------------------ |
| member not `pending_withdrawal` | 409    | `退会予定の会員ではありません` |

There is deliberately **no** `usageStartDate` rejection: that rule belongs to 入会取り消し, not to revoking a
退会申請 (see FR-020 / G-A, resolved 2026-08-11).

### A-5 `RegisterBlacklistRequestSchema` + route — `POST /crm/members/{id}/blacklist`

Schema is already correct; the **route handler** is the bug (G-12). It currently writes:

```ts
reason: memo ?? reason; // ← loses the reason whenever a memo is present
```

Store both as separate fields. Also add the one-active-entry guard, matching the real API's `409 E-BL-200`:

| Case                                  | Status | Message                                |
| ------------------------------------- | ------ | -------------------------------------- |
| active blacklist entry already exists | 409    | `既にブラックリストに登録されています` |

### A-6 Proxy fields — shared by A-1, A-2 and the transfer schema

Align the wire format (G-02).

```
is_proxy        : boolean — REQUIRED
proxy_agreed_at : string (ISO 8601) — REQUIRED when is_proxy is true
proxy_method    : 'in_person' | 'phone' | 'email' | 'line'   ▲ was a free string carrying 来店/電話/メール/LINE
```

The Japanese labels stay in the UI; only the transmitted value changes. Validation:

| Case                                 | Status | Message                                            |
| ------------------------------------ | ------ | -------------------------------------------------- |
| `is_proxy` and no `proxy_agreed_at`  | 400    | `合意日時は必須です`                               |
| `proxy_agreed_at` in the future      | 400    | `合意日時に未来の日時は指定できません`             |
| `proxy_agreed_at` older than 60 days | 400    | `合意日時が60日以上前です。日付を確認してください` |

### A-7 `TransferRequestBodySchema` route handler — `POST /crm/members/{id}/transfer`

Schema already accepts the three proxy fields; the handler destructures only `to_store_id`, `to_store_name`, `reason` and silently drops them (G-E). Persist all three so the `A-01 FR-017` audit trail survives for transfers, matching what `suspend` already does.

### A-8 `DeletePersonalDataRequestSchema` — `DELETE /crm/members/{id}/personal-data`

New request schema — the route currently accepts no body (G-D, R-6).

```
reason       : string          — REQUIRED, 削除理由, recorded for audit
confirmation : 'ANONYMIZE'     — REQUIRED literal, typed by the operator
```

| Case                         | Status | Message                                    |
| ---------------------------- | ------ | ------------------------------------------ |
| `confirmation` ≠ `ANONYMIZE` | 400    | `確認文字列が一致しません`                 |
| active blacklist entry       | 422    | `ブラックリスト登録者のため削除できません` |
| unpaid balance               | 422    | `未納金があるため削除できません`           |
| already anonymized           | 409    | `既に個人情報が削除されています`           |
| member not withdrawn         | 422    | `退会済みの会員のみ削除できます`           |

Note: `DELETE` with a request body is legal but awkward. Since G-13 already earmarks a Phase 2 move to `POST .../anonymize`, **prefer switching this mock route to `POST /crm/members/{id}/personal-data/anonymize` now** — it removes the body-on-DELETE question and makes the Phase 2 switch a URL change only. Flagged as a small judgement call for `/speckit.tasks`.

### ~~A-9 `re-enroll` route guard — `POST /crm/members/{id}/re-enroll`~~ — **removed 2026-09-18** (mock route deleted)

No schema change. Add the guard that the bypassed `C-01` screening would have provided (FR-023):

| Case                   | Status | Message                                      |
| ---------------------- | ------ | -------------------------------------------- |
| active blacklist entry | 422    | `ブラックリスト登録者のため再入会できません` |
| unpaid balance         | 422    | `未納金があるため再入会できません`           |

### A-10 `activePenalty` read model — `GET /crm/members/{id}`

Seed-only addition for G-C (see [data-model.md](../data-model.md) §1):

```
activePenalty.triggeringReservations : string[]  — display strings for 対象となった予約
activePenalty.targetWeek             : string    — e.g. 2026/04/07〜04/13
```

Both are read-only and populated in `src/app/api/_mock-db/seeds/member.seed.ts`. No write path — consistent with the feature's seed-only history scope.

### Unchanged endpoints

`gate-stop` (set and clear), `force-withdraw`, and `penalty-release` need **no contract change**. Their gaps are either UI-side (G-B, G-C) or resolved as backend requests (G-08).

---

## §B — Backend requests

Six items for the backend team. None blocks this feature: each keeps its mock route for Phase 1.

### B-1 休会解除 — endpoint missing entirely

> **Resolved.** The endpoint exists (`POST /admin/suspension-applications/{id}/release`); it first accepted only `reason` and ended the recess today, and since 2026-10-02 it also accepts `resumeMonth` (`YYYY-MM`) with the semantics below. The text that follows is the original request.

No endpoint exists in fitness-dx CRM API v0.8.0. Semantically this is **an update to the active suspension's end month**, not a new record (resolved 2026-07-29). Either shape works:

- `PATCH /api/v1/admin/suspension-applications/{suspensionApplicationId}` with a new end date, or
- `POST /api/v1/admin/members/{memberId}/status-changes/suspension-release` with a resume month.

Constraint to encode: the resume month must be the current month or later — retroactive release is out of scope, so no invoice correction path is needed.

### B-2 予約ペナルティ解除 — endpoint missing entirely

Driven by `D-01 FR-010`, not `A-01`. Expected to live under the `D-01` lesson domain. Needs: a release reason, an optional detail, the operator and timestamp, immediate effect (no pending application), and a push notification to the member's app. Ownership confirmation is the deferred Q6.

### ~~B-3 再入会 — endpoint missing entirely~~ — **request WITHDRAWN 2026-09-18**, do not build

A **member-level** operation, explicitly not a `C-01` enrollment application (resolved 2026-07-29). Needs:

- Input: re-enrollment month, plan master ID, enrollment-fee waiver flag.
- Reuses the existing member row and `memberNumber` — does not issue a new number.
- Result: member status returns to active with no approval step.
- Guards: reject on an active blacklist entry and on an outstanding balance — this path bypasses `C-01`'s blacklist screening, so the guard cannot be inherited.

### B-4 強制退会 — endpoint deliberately absent, now requested

The withdrawal endpoint documents `forced` as "reserved for the FR-016 monthly batch and is not accepted here … admin EP commented-out". The manual dialog is nevertheless confirmed in Phase 1 scope (resolved 2026-07-29), so a member-level endpoint is requested. Needs:

- Input: a required free-text reason (the audit trail).
- Guards: the brand × payment-method delinquency threshold (`JOYFIT SBPS` 2 months consecutive / `JOYFIT JACCS` 1 month without subrogation / `FIT365 SBPS` 2 months consecutive / `FIT365 JACCS` after a 3-month grace period).
- Side effects: automatic blacklist registration and administrator notification, per `A-01 FR-016`.
- Explicitly independent of the FR-016 monthly batch, which stays server-side.

### B-5 Gate stop — add `pattern`, persist `reason`

`A-01 FR-014` (unified with `B-01 FR-M005` in v260624_v4) defines **four patterns** keyed on staffed-hours windows. The API models only `scope` + `messageType` + `message`. Requested:

1. Add a `pattern` field (`always_allowed` / `staffed_hours_denied` / `always_denied` / `unstaffed_hours_denied`) to the gate-stop resource, so `B-01` entry judgement can consume the model `A-01` actually specifies.
2. Persist 設定理由 — `A-01 FR-014` requires the reason to be recorded, and the current API drops it (only the operator and timestamp survive).

Mapping we will apply meanwhile: `lock_after_message` → `messageType` (`deny_after_confirm` when checked, else `allow_after_confirm`); `scope` sent as all-stores, since no scope selector exists in `A-01` or the prototype.

### B-6 移籍申請 — confirm the free-text reason mapping

`A-01` and the prototype give 移籍理由 as an optional free-text field; the API requires `reasonCode` from a 6-value enum. We intend to send `reasonCode: other` with the free text in `memo` (see [research.md](../research.md) R-5). Requesting confirmation that this is the intended use of `other`, or an explicit free-text reason field.

---

## Traceability: gap → contract item

| Gap      | Handled by                                      |
| -------- | ----------------------------------------------- |
| G-A      | Frontend (`page.tsx`) + defence in depth in A-4 |
| G-B, G-C | Frontend only (+ A-10 read model for G-C)       |
| G-D      | A-8                                             |
| G-E      | A-7                                             |
| G-F      | A-2                                             |
| G-01     | A-1                                             |
| G-02     | A-6                                             |
| G-03     | Deferred to Phase 2 (see [plan.md](../plan.md)) |
| G-04     | A-2                                             |
| G-05     | B-6                                             |
| G-06     | Deferred to Phase 2                             |
| G-07     | A-3 + B-1                                       |
| G-08     | B-5                                             |
| G-09     | Deferred to Phase 2                             |
| G-10     | B-2                                             |
| G-11     | A-4                                             |
| G-12     | A-5                                             |
| G-13     | A-8 (payload now) + Phase 2 path change         |
