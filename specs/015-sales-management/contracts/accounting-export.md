# Contract: POST /api/crm/billing-records/export

**Feature**: 015-sales-management (FR-007)
**Phase**: Phase 1 mock route handler — NEW route, follows the existing `training-equipment/export` CSV template exactly (research.md §6)
**Purpose**: Accounting-linked CSV export for a selected month, per entry type or combined.

---

## Request

`POST /api/crm/billing-records/export`

**Request body**

```json
{
  "billing_month": "2026-07",
  "store_id": "STORE-001",
  "entry_type": "all"
}
```

`entry_type`: `'sales' | 'payment' | 'refund' | 'expense' | 'bad_debt' | 'all'` — `'all'` combines
every entry type into one CSV with an `entry_type` column; a specific value outputs only that
entry type's rows (FR-007: "choosing to output each entry type individually or combined").

**Authorization**: `Permission.SalesExport` required — Headquarters/Manager/System only (FR-005);
`403` for Staff/Trainer/Observer regardless of delegation (export is not part of the delegated
Staff confirmation permission).

**Data scope**: Same `resolveSalesDataScope` narrowing as the list — a Manager exporting without
`store_id` gets all their managed stores' data, not a 400.

---

## Response 200

`Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment;
filename="billing-export-<entry_type>-<YYYYMMDD>.csv"` (via `csvFileResponse`/`csvDateStamp`,
`src/app/api/_lib/csv.ts`).

Combined (`entry_type: 'all'`) header row:

```
entry_type,billing_record_id,store_name,member_name,billing_month,amount,date,notes
```

Single-entry-type header rows omit the `entry_type` column.

## Response 403

```json
{ "error": "Accounting export is restricted to Headquarters, Manager, and System roles" }
```

---

## Behavioral Rules

1. `bad_debt` entry type includes only `BillingRecord`s with `is_bad_debt: true`.
2. `refund` entry type includes one row per `RefundRequest` with `status: 'completed'` (pending/
   rejected refunds are not accounting-final and excluded), amount as a negative value.
3. Zero matching rows still returns a `200` CSV with header-only content, not an error or `204`
   (consistent with the existing export endpoints' empty-selection behavior).

---

## Contract Tests (minimum)

- Combined export: `entry_type=all` — every row carries a populated `entry_type` column.
- Single export: `entry_type=bad_debt` — only bad-debt-flagged records, no `entry_type` column.
- Denied path: Staff caller — `403`, even with a delegated `sales.confirm` permission (export is
  a separate permission).
- Scope path: Manager with no `store_id` — combined rows from all managed stores only.
