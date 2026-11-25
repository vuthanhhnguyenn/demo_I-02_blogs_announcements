# Data Model: Staff & Permission Management (020)

This describes the **delta** on top of the existing schemas in `src/app/api/_schemas/staff.schema.ts`,
`auth.schema.ts`, and the mock-DB tables in `src/app/api/_mock-db/`. Fields/entities marked
**(existing)** are unchanged and listed only for relationship context; **(modified)** and
**(new)** are what this feature changes.

## Staff Account (`StaffListItem` / `StaffDetail`) — modified

| Field                                              | Type                | Change                                                                         | Notes                                                                                                                 |
| -------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `id`, `staff_id`                                   | string              | (existing)                                                                     | unchanged                                                                                                             |
| `personal_info.last_name` / `first_name` / `email` | string              | (existing)                                                                     | unchanged; already required                                                                                           |
| `role`                                             | `StaffRoleSchema`   | (existing)                                                                     | `system \| headquarter \| manager \| staff \| trainer \| observer` — already matches spec's 6 roles                   |
| `position_id` / `position_name`                    | number / string     | (existing)                                                                     | FK → positions master; unchanged                                                                                      |
| `status`                                           | `StaffStatusSchema` | **modified**: `'active' \| 'inactive'` → `'active' \| 'inactive' \| 'invited'` | drives FR-005 masked-name / last-login treatment                                                                      |
| `invited_at`                                       | `string \| null`    | **new**                                                                        | ISO datetime; set on create/invite, refreshed by resend-invite (#5 in research)                                       |
| `last_login`                                       | `string \| null`    | **modified**: now nullable ISO datetime (was a free-form display string)       | relative-time formatting moves to the client (research #3)                                                            |
| `staff_linkage` (`StaffLinkageSchema`)             | object              | (existing)                                                                     | `type: 'direct_store' \| 'fc_company'`, mutually exclusive `store_id`/`fc_company_id` — already matches FR-016/FR-017 |
| `managed_store_ids`                                | `string[]`          | **new**                                                                        | populated only when `role = 'manager'`; drives FR-004/FR-013 list-and-edit scoping (research #1)                      |
| `brand`, `brand_display_name`                      | (existing)          | unchanged                                                                      | not part of the reviewed V0 columns but retained for backward compatibility with other consumers                      |
| `deleted_at`                                       | `string \| null`    | **new**                                                                        | soft-delete marker; hides the record from active list/detail views (FR-019) while retaining it for history joins      |

### State transitions

```
invited ──(first login completes, out of scope of this mock)──▶ active
invited ──(resend-invite)──▶ invited (invited_at refreshed)
active ──(deactivate)──▶ inactive
inactive ──(reactivate, not in current spec scope)──▶ active
any ──(delete)──▶ deleted_at set (record hidden, not returned by default list/detail queries)
```

## Permission Change History Entry — new entity

New table `staff_permission_history`, schema `StaffPermissionHistoryEntrySchema`.

| Field                | Type                  | Notes                                                          |
| -------------------- | --------------------- | -------------------------------------------------------------- |
| `id`                 | number                | auto-increment                                                 |
| `staff_id`           | string                | FK → staff                                                     |
| `changed_at`         | string (ISO datetime) | server-stamped at mutation time                                |
| `operator_name`      | string                | denormalized display name of the staff who made the change     |
| `operator_position`  | string                | denormalized position label of the operator, e.g. "本部管理者" |
| `change_description` | string                | human-readable summary, e.g. "ロール変更: Trainer → Staff"     |

**Written by**: `PATCH /crm/staffs/{id}` whenever `role`, `position_id`, or `staff_linkage`
changes (diffed server-side against the pre-update record); `POST /crm/staffs/{id}/deactivate`.
Never mutated or deleted after creation (append-only).

**Read by**: `GET /crm/staffs/{id}/permission-history`, newest first.

## Auth / Current User (`MeResponseSchema`) — modified

| Field                                     | Type       | Change            | Notes                                                                                                                                                              |
| ----------------------------------------- | ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`, `email`, `name`, `role`, `position` | (existing) | unchanged         |                                                                                                                                                                    |
| `managed_store_ids`                       | `string[]` | **new**, optional | present only when `role = 'manager'`; computed server-side by looking up the caller's own staff record's `managed_store_ids`                                       |
| `staff_id`                                | `string`   | **new**           | the caller's own `StaffListItem.id`, so the frontend can detect "is this account mine?" (used by the magic-link self-service rule, FR-020) without a second lookup |

## Position (existing, read-only for this feature)

No changes. `positions` table/schema (`position.schema.ts`, `position.seed.ts`) already models
role→position mapping with a `features` blob per position. This feature only **reads** it (for
the 職位 combobox and the "確認" link in staff-detail) — managing the catalog itself is out of
scope (see spec.md's Out of Scope note, Y-01 FR-006).

## Validation rules carried over from spec.md

- `last_name`, `first_name`, `email`, `role` are required for every row submitted via bulk create (FR-008). `position_id` is optional on both bulk create and edit (FR-007/FR-012) — when omitted, the account is left on the selected role's 未割当 position.
- Email must be unique across existing accounts and within the same batch (FR-009).
- Exactly one of `staff_linkage.store_id` / `staff_linkage.fc_company_id` may be set, enforced by
  the existing `StaffLinkageSchema.superRefine` (FR-016) — no change needed, already correct.
- `role` changes require headquarters (`Permission.StaffsEdit` + `role === 'headquarter'`) —
  enforced both client-side (`RoleGatedButton`/disabled select) and server-side in the
  `PATCH /crm/staffs/{id}` handler.
- Manager edit access requires: target `role === 'staff'` AND target's `staff_linkage.store_id`
  is present in the manager's own `managed_store_ids` (FR-013).
