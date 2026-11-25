# Phase 0 Research: Sales Management (F-01)

No `[NEEDS CLARIFICATION]` markers remain in `spec.md` — this feature was fully scoped from the
existing PO spec and three UI prototypes before planning began. Phase 0 therefore focuses on
resolving _technical_ unknowns: how this feature's net-new data (billing records/line items/fee
adjustments/refund requests) and net-new capabilities (PDF download) fit the codebase's existing
conventions, discovered by surveying `014-instructor-management`, `011-studio-detail-page`,
`010-training-equipment`, `transfer-management`, and the member/contract mock data that already
exists.

## Decisions

### 1. Billing data model: new mock-DB tables, not an extension of member-scoped mock arrays

**Decision**: Create net-new `billingRecords`, `billingLineItems`, `feeAdjustments`, and
`refundRequests` sub-tables under `src/app/api/_mock-db/tables/billing.table.ts`, following the
`_rows` / `_seeded` / `_seed()` / CRUD-method factory convention used by every other table
(`tables/transfer.table.ts`, `tables/brand.table.ts`, etc.).

**Rationale**: `src/app/api/_mock-db/seeds/member.seed.ts` already exports loose mock arrays
(`MOCK_BILLING_LIST`, `MOCK_PAYMENT_HISTORY`, `getPaymentSummary()`) that back three
member-scoped endpoints (`GET /crm/members/{id}/billing`, `.../payment-history`,
`.../payment-summary`). These are flat, per-member, and have no `store_id`, no line items, no
confirmation status, no fee-adjustment/refund-request sub-entities — they cannot support a
cross-member, store-scoped list with bulk confirm, detail-level line items, or manual
registration. A real relational table is required. The three existing member-scoped endpoints are
left untouched (out of scope for this feature — they belong to the member detail page, not Sales
Management) to avoid an unplanned regression; the new `billingRecords` table seeds independently
and is the single source of truth for everything Sales Management reads and writes.

**Alternatives considered**: Extending `MOCK_BILLING_LIST` in place — rejected because it has no
room for `store_id`, line items, or audit trails without a breaking shape change to the three
existing member-detail endpoints, which are a live dependency outside this feature's scope.

### 2. Outstanding-balance source of truth

**Decision**: `Billing Record.outstanding_amount` is the field the whole feature reads to
determine "member has an outstanding unpaid balance" (FR-009, FR-015). A member has an
outstanding balance if any of their `billingRecord`s has `outstanding_amount > 0`. Computed via a
`billingRecords.hasOutstandingBalance(memberId)` table method.

**Rationale**: Two partial precedents exist today — `Member.has_unpaid` (boolean flag,
`membership.seed.ts`) and `UnpaidInfo.amount` (nullable, contract-level, `member.schema.ts`
`GetContractsResponse.unpaid_info`) — but neither is billing-record-level nor summable across a
store/month, which FR-001's summary card requires. Rather than reconciling three sources of
truth, the new `billingRecords` table becomes authoritative for anything Sales Management shows
or blocks on; `Member.has_unpaid`/`UnpaidInfo` remain as-is for their existing consumers (member
detail page) and are not modified by this feature.

**Alternatives considered**: Deriving outstanding balance from `UnpaidInfo` at read time —
rejected because `UnpaidInfo` is per-contract, not per-billing-record, and the manual
registration flow (User Story 3) needs a same-request check against records this feature itself
creates, which `UnpaidInfo` cannot reflect without a parallel write.

### 3. Role/permission model: extend `Permission` enum + a `sales-permissions.ts` data-scope helper

**Decision**: Add a `Sales*` block to `src/types/permission.type.ts` (`SalesView`,
`SalesConfirm`, `SalesRefundInitiate`, `SalesExport`, `SalesManualRegister`, `SalesFeeAdjust`,
`SalesLineItemAdd`), wire role→permission grants into `ROLE_PERMISSIONS` in
`src/constants/permission.constants.ts`, and add `src/lib/utils/sales-permissions.ts` modeled
directly on `resolveInstructorDataScope`/`canPerformInstructorAction` in
`src/lib/utils/instructor-permissions.ts` for store-scoped visibility (Headquarters → all,
Manager → managed stores, Staff → own store) and per-action gating.

**Rationale**: This is the established two-layer pattern (coarse `RoleGatedButton` UI gating +
a server-enforced data-scope predicate) used by every comparable feature; inventing a new
mechanism would violate Constitution Principle V (no abstractions beyond existing patterns).

**Delegated Staff confirmation (FR-005)**: The codebase already has a mechanism for
"individually delegated" permissions distinct from the static role matrix — `staff.schema.ts`'s
`staff_permissions: StaffPermissionRecord[]` (`permission_code` strings like `'Y-03.view'`,
attached per-staff via the Positions/Staff management feature). Sales Management reuses this
as-is: a `Staff` role user may confirm billing records only if their `staff_permissions` array
contains a `'F-01.confirm'`-style code, checked server-side alongside the static
`ROLE_PERMISSIONS[Staff]` check (which excludes `SalesConfirm` by default). No new delegation
mechanism is introduced.

**Alternatives considered**: A bespoke per-store "delegate" flag on the Billing Record itself —
rejected; the delegation is a property of the staff member/position, not the record, and
duplicating it per-record would drift from the existing Positions/Staff source of truth.

### 4. Store → Member → Line-items cascading gates (User Story 3)

**Decision**: The manual registration form has **two** chained gates, both confirmed against the
UI prototype (`sales-register.tsx` in the `fitness-crm-ui` reference repo, the named source for
this feature):

1. **Store → Member**: Build a new `_components/store-member-picker.tsx` composite,
   generalizing the `resetField`-on-parent-change pattern already used in
   `membership-applications/create/_components/enrollment-form.tsx` (`handleBrandChange` →
   `form.resetField('contract.plan_id')`). The `member_id` `Select`/`Combobox` is disabled and
   empty until `store_id` is chosen, its options come from a `useQuery` keyed on the watched
   `store_id`, and changing either field clears line items (FR-014 Acceptance Scenario 4).
2. **Member → Line items**: The 請求明細情報 (billing line items) section is a single,
   always-visible card containing: an "明細追加" (add line item) button and a running table of
   already-added items (label, excl-tax amount, tax rate, incl-tax amount, per-row delete) — it
   is a live builder embedded in the page, **not** a separate pre-registration preview step.
   Until `member_id` is set, both the card's "add" button and the table's empty-state "add"
   button are disabled, and the exact guard copy **「先に利用者を選択してください。」**
   ("Please select a member first.") is shown in place of the control. The same guard copy
   reappears _inside_ the add-line-item dialog's contract picker when the member's contract list
   is empty (which is always true before a member is selected, since contracts are derived from
   `member_id`) — i.e. the guard is enforced at both the outer section and the dialog's own
   contract field, not just one of them.

Additionally, submission is **two distinct actions**, not one button with a status dropdown:
"登録" submits immediately with `confirmation_status: 'unconfirmed'`; "確定状態で登録" opens a
confirmation dialog first (summarizing store, member, billing date, applicable month, line-item
count, and tax-included total) and only calls the API with `confirmation_status: 'confirmed'`
after the user confirms in that dialog (FR-016). Both actions share the same `canSubmit` gate:
member selected, no outstanding-balance block, at least one line item, and an applicable month
entered.

**Rationale**: No existing composite store→member picker exists in the codebase (confirmed by
search); the closest precedent is the brand→plan cascade, which uses the same
watch-parent/reset-child shape and is the pattern to generalize, per Constitution Principle V
(reuse existing patterns, no new abstraction beyond what's needed). The member→line-items gate
and exact guard copy are taken directly from the prototype rather than re-derived, since the
prototype is spec.md's named source for this screen.

**Alternatives considered**: A generic multi-step wizard — rejected per Constitution Principle IV
("no multi-step wizards where a single form suffices"); a single form with cascading fields and
an inline live line-items table is sufficient and matches both the `enrollment-form.tsx`
precedent and the prototype. A single submit button with a status toggle instead of two actions —
rejected; the prototype deliberately gates the "confirmed" path behind an extra confirmation
dialog (since confirming immediately forecloses further edits) while leaving the "unconfirmed"
path a single click, and this plan preserves that distinction (FR-016).

### 5. Receipt/Invoice PDF download (FR-013): mocked binary response in Phase 1, no new dependency

**Decision**: Phase 1 implements `GET /crm/billing-records/{id}/line-items/{lineItemId}/receipt`
and a billing-record-level `GET /crm/billing-records/{id}/invoice` by returning a minimal static
placeholder PDF byte buffer (checked into the repo under
`src/app/api/_mock-db/assets/placeholder-receipt.pdf`) via a new `pdfFileResponse(buffer,
filename)` helper in `src/app/api/_lib/pdf.ts`, cloned from the existing
`csvFileResponse`/`buildCsv` pattern in `src/app/api/_lib/csv.ts` but with
`Content-Type: application/pdf`. The route enforces the block-when-unconfirmed rule (FR-013) by
checking the line item's/record's status before returning the file; no real PDF rendering
(dynamic content, member name, amounts) is generated in Phase 1.

**Rationale**: The codebase has zero PDF-generation capability today (`grep -i pdf` across `src/`
only finds `application/pdf` as an accepted upload MIME type) and zero PDF-related npm
dependencies. Adding a PDF-rendering library (e.g. `@react-pdf/renderer`, `pdf-lib`) is a new
dependency requiring justification under Constitution Principle V ("New npm dependencies MUST NOT
be added without explicit justification and team consensus") — that consensus has not been
sought as part of this plan, and the spec's own verification criteria (User Story 2 scenario 4;
"receipt download is disabled/blocked" for unconfirmed items) test the _gating_ behavior, not
the PDF's rendered content. Phase 1 therefore proves the gating and the download pipeline
end-to-end with a static file; wiring in a real PDF renderer is a Phase 2 concern to be raised
separately if/when the team adopts a PDF library project-wide (this avoids a one-off dependency
added silently inside a single feature).

**Alternatives considered**: Adding a PDF library now — rejected, no team consensus captured;
Deferring the whole download button until Phase 2 — rejected, it would leave FR-013's disabled/
enabled gating logic (the acceptance-tested part of the requirement) unimplemented.

### 6. CSV accounting export: reuse the existing export pattern exactly

**Decision**: Add `POST /crm/billing-records/export` following the exact
`training-equipment/export/route.ts` template: a `ExportBillingRecordsRequestSchema` (entry-type
selector: `sales | payment | refund | expense | bad_debt | all`, plus the same
store/month/type/status filters as the list), built with `buildCsv`/`csvFileResponse` from
`src/app/api/_lib/csv.ts`, gated by a new `Permission.SalesExport`. Client button mirrors
`training-equipment-csv-export-button.tsx` (own `<Suspense>`, `useMutation` with
`parseAs: 'blob'`, `downloadCsv`).

**Rationale**: This pattern is already proven across seven existing export endpoints; FR-007's
"output each entry type individually or combined" maps directly onto the entry-type enum
parameter already modeled by other export request schemas.

**Alternatives considered**: A dedicated accounting-export micro-service or scheduled job —
rejected as far beyond FR-007's scope (an on-demand CSV download) and inconsistent with the
existing per-feature CSV export precedent.

### 7. List/summary/detail page composition

**Decision**:

- List page: one `'use client'` page (Suspense-wrapped for `nuqs`) composing a summary section
  (KPI cards, modeled on `family-registrations-summary.tsx`'s `KpiCard` grid, backed by a new
  `GET /crm/billing-records/summary` endpoint) above a `DataTable` with `nuqs`-backed
  search/filter state and `RowSelectionState`-driven bulk actions (bulk confirm, bulk simplified
  refund), modeled on `training-equipment/page.tsx`.
- Detail page: two-column layout (`min-w-0 flex-1` main content + `w-[360px] shrink-0` sidebar)
  modeled on `studios/[id]/page.tsx`, with a status/confirmation card modeled on
  `instructor-status-card.tsx` (icon + badge + `RoleGatedButton` status-toggle mutation) and a
  fee-adjustment/change-history tab modeled on the `BrandChangeHistoryItemSchema` array pattern
  used by `brands`, `campaigns`, `instructors`, etc.
- Manual registration: a single-page form (not a wizard, per Constitution IV), sections as
  stacked `Card`s (Store/Member → Line Items → Billing Month), modeled on
  `instructor-form.tsx`'s section-per-`Card` + confirm-dialog submit pattern.

**Rationale**: Every one of these shapes has a direct, current precedent in the codebase; reusing
them keeps the feature visually and structurally consistent with the rest of the CRM (Constitution
IV) without inventing new UI patterns (Constitution V).

## Outstanding Non-Blocking Notes

- The three related L2 screens referenced in `spec.md`'s Assumptions (入出金明細 / F-01-01,
  請求・未回収管理 / F-01-02, 返金手続き一覧 / F-01-03) are out of scope; this plan only adds the
  navigation link targets as inert placeholders (routes not yet built), not their content.
- `Refund Request.status` includes `approved`/`rejected` states per the Key Entities section, but
  no approval-queue UI is in scope here (that's F-01-03) — Phase 1 exposes creation and a
  read-only status field only, consistent with spec.md's User Story 2 verification (submit +
  observe state, not adjudicate).
