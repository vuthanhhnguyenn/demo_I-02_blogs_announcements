# API Contracts: Staff & Permission Management (020)

Phase 1 target: `src/app/api/crm/staffs/**` mock routes (Next.js route handlers backed by
`src/app/api/_mock-db/`), declared in the OpenAPI spec per Constitution Principle II before
implementation. Phase 2 (out of scope for this feature) regenerates the `hey-api` client with
zero application-code changes.

Endpoints marked **(existing)** already exist and are modified in place; **(new)** are added.

## GET /crm/staffs — (existing, modified)

List staff, scoped by the caller's role.

- **Query** (`GetStaffsQuerySchema`, existing + no new params needed): `page`, `limit`, `search`,
  `role`, `brand`, `status`, `position_id`, `sort_by`, `sort_order`. `status` now accepts
  `invited` (FR-005). `sort_by` gains `last_login` handling for nulls (invited rows sort last
  under an ascending "last login" sort).
- **Server-side scoping (new behavior, FR-004)**: derived from the authenticated caller, not a
  query param — headquarters/system: no filtering; manager: only rows whose
  `staff_linkage.store_id ∈ caller.managed_store_ids`; staff: only the caller's own row
  (`id === caller.staff_id`); trainer/observer: 403 — this endpoint is not accessible to these
  roles at all (per the Y-01 permission matrix: スタッフ一覧・参照 = ×).
- **Response** (`GetStaffsResponseSchema`, existing): `staffs: StaffListItem[]` (see data-model.md
  for field changes), `pagination`.

## POST /crm/staffs — (new, replaces POST /crm/staffs/invite for the create flow)

Bulk-create one or more staff accounts in a single request (FR-007).

- **Request**: `{ staff: Array<{ last_name: string; first_name: string; email: string }>, role: StaffRole, position_id?: number, staff_linkage?: StaffLinkage, note?: string }`
- **Validation**: every row requires `last_name`, `first_name`, `email`; `role` required at the
  batch level; emails must be unique against existing accounts and within the batch (FR-008,
  FR-009) — server returns a 422 with per-row error detail on failure, matching the inline
  validation the form already performs client-side.
- **Effect**: creates N staff rows with `status: 'invited'`, `invited_at: now()`; no permission-
  history entries are written for brand-new accounts (history starts from the first subsequent
  change).
- **Response**: `{ message: string, created_count: number, staffs: StaffListItem[] }`

> `POST /crm/staffs/invite` (existing) is retained only if any other caller in the codebase still
> depends on its narrower email+role+brand shape; otherwise remove it once `/staffs/create`
> switches to the new endpoint, to avoid two divergent creation paths (confirm during
> implementation by grepping for other call sites before deleting).

## GET /crm/staffs/{id} — (existing, unchanged shape; scoping added)

- **Server-side access (new, FR-004)**: 403 unless caller is headquarters/system, is a staff caller
  who is the target themself, or is a manager whose `managed_store_ids` includes the target's
  `staff_linkage.store_id`. Trainer/observer callers always get 403, including for their own
  `staff_id` — this screen is entirely out of scope for those two roles.
- **Response** (`GetStaffDetailResponseSchema`, existing): unchanged shape, reflects the modified
  `StaffDetail` fields from data-model.md (`status` 3-way, `invited_at`, `managed_store_ids`,
  `last_login` nullable).

## PATCH /crm/staffs/{id} — (existing, modified)

Edit an existing staff account (FR-012).

- **Request** (`UpdateStaffRequestSchema`, existing shape retained): partial update of
  `personal_info`, `position_id`, `role`, `staff_linkage`, `note`, etc.
- **Server-side authorization (new, FR-013, FR-014)**: `role` field only accepted from callers
  with `role === 'headquarter' | 'system'`; presence of `role` in the body from any other caller
  is rejected with 403. Non-role fields follow the same edit-access rule as GET (headquarters, the
  manager-of-the-target's-store, or — for name/email/note only — the account owner themself).
- **Side effect (new, FR-021)**: if `role`, `position_id`, or `staff_linkage` differs from the
  stored record, append one `StaffPermissionHistoryEntry` describing the change before returning.
- **Response** (`UpdateStaffResponseSchema`, existing): unchanged shape.

## POST /crm/staffs/{id}/deactivate — (new, FR-018)

- **Request**: `{ reason?: string }` (optional, matches the reviewed dialog's non-mandatory textarea).
- **Authorization**: headquarters/system only.
- **Effect**: sets `status: 'inactive'`; appends a permission-history entry
  (`"アカウント無効化" [+ reason if provided]`).
- **Response**: `{ message: string, staff: StaffDetail }`

## DELETE /crm/staffs/{id} — (existing, modified)

- **Request** (`DeleteStaffRequestSchema`): `delete_reason` changes from required
  (`min(1)`) to **optional** — the reviewed delete dialogs (list and detail) carry no reason
  field at all.
- **Effect**: sets `deleted_at`; record is excluded from default `GET /crm/staffs` and
  `GET /crm/staffs/{id}` results (FR-019) but retained in storage for permission-history joins.
- **Authorization**: headquarters/system only (unchanged).
- **Response** (`DeleteStaffResponseSchema`, existing): unchanged shape.

## POST /crm/staffs/{id}/resend-invite — (new, FR-006)

- **Request**: none (empty body).
- **Preconditions**: 409 if `status !== 'invited'`.
- **Authorization**: headquarters/system only.
- **Effect**: refreshes `invited_at` to now; no permission-history entry (not a permission change).
- **Response**: `{ message: string }`

## POST /crm/staffs/{id}/magic-link — (new, FR-020)

- **Request**: none (empty body).
- **Authorization**: headquarters/system, or the caller themself (`caller.staff_id === id`).
- **Effect**: no persisted state change in the mock (no real token/email infra, per research #5);
  returns a success payload the UI renders into its confirmation dialog.
- **Response**: `{ message: string, sent_to: string }` (`sent_to` echoes the target's email for
  the confirmation copy, matching the reviewed dialog's "{email}にCRMのログイン用URLを送信しました").

## GET /crm/staffs/{id}/permission-history — (new, FR-021)

- **Query**: `page`, `limit` (standard pagination, defaults matching other list endpoints).
- **Authorization**: same read-access rule as `GET /crm/staffs/{id}`.
- **Response**: `{ history: StaffPermissionHistoryEntry[], pagination: {...} }`, newest first.

## GET /auth/me — (existing, modified)

- **Response** (`MeResponseSchema`): adds `staff_id: string` and `managed_store_ids?: string[]`
  (present only for `role: 'manager'`) — see data-model.md.
