# Research: Staff & Permission Management (020)

**Context**: This is not a greenfield build. An older implementation of staff management already
exists at `src/app/(private)/staffs/` (route `/staffs`), built against an earlier draft
(`specs/staff-management/`, targeting a `/settings/staff` route that was never actually used).
This research resolves how to evolve the existing code to satisfy the new `spec.md`
(020-staff-permission-management), which was written from the updated Y-01 v4 PO doc and the
refreshed `staff-list.tsx` / `staff-detail.tsx` / `staff-form.tsx` V0 mockups.

Each decision below states what exists today, what the new spec needs, and what to do about the gap.

---

## 1. Manager store-scope derivation (FR-004, FR-013 / SC-004)

**Decision**: Add an explicit `managed_store_ids: string[]` field to the Staff entity
(`StaffListItem` and `StaffDetail`), populated only when `role = manager`. Expose the
authenticated user's own `managed_store_ids` by extending `MeResponseSchema` with the same field,
computed server-side (mock DB) by looking up the caller's own staff record.

**Rationale**: The codebase already has `store.manager_staff_id`, but that field represents the
Y-01 **店舗責任者** (a single "Staff"-role position responsible for one store) — a different
relationship from the **Manager** role's "複数店舗横断管理" (oversight across several stores).
Repurposing `manager_staff_id` would conflate two distinct concepts from the PO spec and break
the 店舗責任者 use case. A dedicated field keeps both relationships intact and gives the frontend
a direct list of store IDs to scope by, matching how the V0 mockup's `accessibleStores` /
`user.scope.storeIds` are consumed in `staff-list.tsx` and `staff-detail.tsx`.

**Alternatives considered**:

- Reuse `store.manager_staff_id` reverse-lookup (`stores.filter(s => s.manager_staff_id === me.id)`) — rejected: semantically wrong (that field is for 店舗責任者, not Manager-role scope), and would require a linear scan on every request.
- Add a many-to-many `store_managers` join table — rejected as unnecessary complexity for the mock-DB phase (YAGNI); a denormalized array field is sufficient and mirrors how `staff_linkage`/`editable_scopes` already denormalize onto the staff record.

---

## 2. Three-way status (active / inactive / invited) (FR-005)

**Decision**: Extend `StaffStatusSchema` from `['active', 'inactive']` to
`['active', 'inactive', 'invited']`. Add `invited_at: string | null` to `StaffListItem` /
`StaffDetail`. Make `last_login` nullable; the UI shows "not yet logged in" plus the invitation
date when `status === 'invited'` and `last_login` is null.

**Rationale**: The current schema has no concept of a pending-first-login state at all — invited
staff are indistinguishable from active ones once a row is created. The new spec (FR-005, edge
case) requires masking the name and swapping the last-login cell for invited rows, which needs a
first-class status value, not a derived flag.

**Alternatives considered**: Deriving "invited" from `last_login === null` alone — rejected,
because a data-migration edge case (an active account that has genuinely never logged in) would
be indistinguishable from a pending invite; an explicit status avoids that ambiguity.

---

## 3. Relative-time last-login display (FR-001, FR-020)

**Decision**: Keep `last_login` as an ISO datetime string in the schema (rename the example to an
actual ISO 8601 value instead of the current `"2026-03-25 10:00"` free-form string). Add a small
client-side utility (`src/app/(private)/staffs/_utils/format-relative-time.util.ts`) built on
`date-fns`'s `formatDistanceToNow(date, { addSuffix: true, locale: ja })` — `date-fns` v4 and its
`ja` locale are already an approved dependency (Technology Stack), so no new package is needed.

**Rationale**: `date-fns` already covers this; introducing a second date library or hand-rolled
relative-time math would violate Constitution Principle V (Simplicity & Minimal Dependencies).

**Alternatives considered**: `Intl.RelativeTimeFormat` — viable but requires manual bucket-size
math (seconds/minutes/hours/days) that `date-fns` already provides; not chosen, to avoid
duplicating logic the approved dependency already solves.

---

## 4. Bulk staff creation replaces the invite modal (FR-007–FR-011)

**Decision**: Replace `invite-staff-modal.tsx` (dialog-based, email+role+brand only) with a
dedicated `/staffs/create` page mirroring the reviewed `staff-form.tsx` V0 (`mode="create"`):
a table of rows (last name / first name / email), one shared role/position/store-or-FC
affiliation section, paste-to-split email handling, and per-row/duplicate validation. The
existing `/staffs/[id]/edit` page keeps its own route (`mode="edit"`) and is updated in place
(see #6, #7).

**Rationale**: The new UI needs full-page real estate for a batch of 10+ rows plus a shared
permission/affiliation section (SC-001) — a modal doesn't have room for that, and the V0 design
is explicitly a full page, not a dialog. The existing invite modal's shape (email + role + brand,
no name fields, no store/FC affiliation) cannot represent the new required fields without
becoming a modal-in-a-modal, so replacing it is simpler than extending it in place.

**Alternatives considered**: Keep the modal and add fields to it — rejected: a modal with a
growing table of rows plus radio-selected affiliation and FC managed-store previews would be
cramped and diverges from the reviewed design; a page-level route also lets the "leave with
unsaved changes" guard (FR-022) work the same way it already does elsewhere in the app (route
navigation guard, not a dialog-close guard).

---

## 5. Resend invitation & magic link (FR-006, FR-020, US5)

**Decision**: Add two new mock endpoints:

- `POST /crm/staffs/{id}/resend-invite` — valid only when `status === 'invited'`; re-stamps
  `invited_at` and returns a success message.
- `POST /crm/staffs/{id}/magic-link` — valid for any account; headquarters can call it for
  anyone, a staff member can call it for their own account (enforced client-side via
  `RoleGatedButton`'s existing self-vs-others pattern already proven in `staff-detail.tsx`, and
  server-side by checking `caller.id === staffId || caller.role === 'headquarter'`).

**Rationale**: Both are distinct actions with different pre-conditions and audiences from the
existing `POST /crm/staffs/invite` (batch-create) endpoint; overloading one endpoint with three
meanings would make request validation and the OpenAPI contract harder to read. This project's
mock-DB phase doesn't need real token/email infrastructure (Constitution: Phase 1 mock DB) — the
endpoints just need to return a believable success shape for the UI to render its confirmation
toast/dialog against.

**Alternatives considered**: Folding resend/magic-link into the existing `PATCH /crm/staffs/{id}`
as side-effecting flags — rejected: conflates a data update with a fire-and-forget notification
action, and would force every detail-save request to reason about whether an email should also
be sent.

---

## 6. Deactivate vs. delete are separate actions (FR-018, FR-019)

**Decision**: Add `POST /crm/staffs/{id}/deactivate` (optional `reason` field, sets
`status = 'inactive'`). Change the existing `DeleteStaffRequestSchema.delete_reason` from
required (`min(1)`) to fully optional, matching the reviewed `staff-detail.tsx` /
`staff-list.tsx` delete dialogs, which carry no reason field at all (only the deactivate dialog
has an optional reason textarea).

**Rationale**: Today, "deactivate" doesn't exist as its own action — only `status` can be patched
generically via `UpdateStaffRequestSchema`, and the only confirmed destructive action is delete
(with a currently-mandatory reason that contradicts the new design). Splitting them out makes the
two audit-relevant, irreversible-feeling actions each get their own explicit confirmation
contract, matching FR-018/FR-019's distinct wording ("blocking login while retaining records" vs.
"hidden from active views, operational history retained").

**Alternatives considered**: Keep deactivation as a generic `PATCH status=inactive` call —
rejected: it would bypass the dedicated confirmation-dialog contract and wouldn't produce a
uniform permission-history entry the way a dedicated endpoint can (see #7).

---

## 7. Permission change history is a new entity (FR-021, US5)

**Decision**: Add a new table `staff_permission_history` and schema
`StaffPermissionHistoryEntrySchema` (`id`, `staff_id`, `changed_at`, `operator_name`,
`operator_position`, `change_description`), plus `GET /crm/staffs/{id}/permission-history`.
Any mutation that changes `role`, `position_id`, or `staff_linkage` (via
`PATCH /crm/staffs/{id}`) appends one entry automatically in the mock-DB layer, mirroring how
`staff_permissions` rows are already replaced as a side effect of updates today.

**Rationale**: No history concept exists at all currently. A dedicated append-only table is the
simplest model that satisfies "chronological, who/when/what" (FR-021) without overloading the
staff record itself with an ever-growing embedded array (which the `StaffDetail` GET response
would otherwise have to always include, even when unused).

**Alternatives considered**: Store history as an embedded array on `StaffDetail` (like
`editable_scopes`) — rejected: history is unbounded and append-only, unlike the small,
user-edited `editable_scopes` list; a separate queryable table is a better fit and keeps the
detail payload lean.

---

## 8. Role-change confirmation & "next login" semantics (FR-013, FR-015)

**Decision**: The confirmation dialog and permission-history entry are implemented in Phase 1 as
specified; the "changes apply at next login" wording is treated as user-facing copy only — no
session-invalidation logic is implemented, because this mock-DB phase has no real session/token
system to invalidate (there is one simulated current user per browser session via
`getAuthMeOptions`).

**Rationale**: Building real session invalidation would require login/session infrastructure that
doesn't exist yet and is out of scope for this feature. Recording the change (history entry) and
showing the correct copy satisfies the spec's user-facing acceptance criteria without inventing
unneeded backend machinery (Constitution Principle V, YAGNI).

**Alternatives considered**: None seriously considered — building session invalidation now would
be pure speculative scope for a feature whose PO spec and UI never require it to be demonstrated
end-to-end with two concurrent sessions.

---

## 9. Role-gating wiring (FR-004, FR-013, FR-014, FR-018–FR-020)

**Decision**: Reuse the existing `useAuthUser()` / `RoleGatedButton` / `RoleGatedMenuItem` /
`Permission` / `UserRole` infrastructure already in `src/contexts/auth-user.context.tsx` and
`src/types/permission.type.ts`. The `Permission` enum already has `StaffsView/Create/Edit/Delete/
Invite` — no new permission codes are needed except wiring them into the `staffs/` pages, which
currently use none of this (confirmed: zero `role-gated` usages in `staffs/` today).

**Rationale**: This is the single biggest existing-code gap relative to the new spec — the whole
role-scoping story (FR-004, FR-013, FR-014, FR-018–020) has zero enforcement today; the
infrastructure to fix it already exists project-wide and is proven in other features. No new
component or permission-model work is needed, only integration.

**Alternatives considered**: N/A — this is a direct reuse of existing, working infrastructure.

---

## 10. Unsaved-changes guard reuse (FR-022)

**Decision**: Copy the existing per-feature pattern
(`lesson-schedules/create/_hooks/use-unsaved-changes.hook.ts`) into
`staffs/_hooks/use-staffs-unsaved-changes.hook.ts` rather than promoting it to a new shared
`src/hooks/` utility.

**Rationale**: The codebase already has two independent, feature-scoped copies of this exact
pattern (`exercises/_hooks/use-exercise-unsaved-changes.ts` and the lesson-schedules one) — that
is the established convention in this repo, not an oversight. Introducing a new shared
abstraction now, from a single additional consumer, would be exactly the kind of premature
abstraction Constitution Principle V warns against; if a fourth feature needs it later, that is
the right time to extract a shared hook.

**Alternatives considered**: Promote to `src/hooks/use-unsaved-changes.ts` now — rejected per the
YAGNI/no-premature-abstraction guidance above.

---

## 11. Superseded draft spec

**Note (not a decision requiring action)**: `specs/staff-management/` is an older, unused draft
(targeted a `/settings/staff` route that was never built; the real implementation lives at
`/staffs`). It is left untouched — this plan does not delete or modify it, since removing another
spec directory is outside this feature's scope and not something the user asked for.

---

## Addendum (2026-08-24): Real-API migration — Edit screen alignment

**Context**: Item 12 below is already in flight on branch `feat/staff-implement-api` (Phase 2, the
`hey-api`-generated `api-real` client, was explicitly out of scope for the original Phase 1 plan
above — see plan.md's Storage line). Items 13–15 were found by re-checking the edit screen's
current implementation against `spec.md`, Y-01, `crm/design/Y-01_権限設計v2_3.md`, and the current
`staff-form.tsx` prototype (see spec.md's "Known Implementation Gaps" section, added 2026-08-24).
This addendum plans the remaining edit-screen work to close those gaps.

## 12. Edit screen backing store: mock-DB → real API

**Decision**: `src/app/(private)/staffs/[id]/edit/page.tsx` and its data-fetching now use
`adminStaffPermissionControllerGetStaffOptions` / `adminStaffControllerUpdateMutation` from
`@/lib/api-real/...` instead of the Phase 1 mock-DB routes. `PositionSelectInput` /
`StoreSelectInput` (new shared components under `src/components/common/data-select-input/`) already
replace the ad-hoc position/store `<Select>` implementations and are wired to the real
`adminPositionController`/`adminStoreController` list endpoints.

**Rationale**: This is the actual backend the feature ships against; continuing to build against
the mock DB would require a second migration later for no benefit.

**Alternatives considered**: Keep mock-DB for this feature and defer migration — rejected; the
branch name and current diff show migration is already the active task, not a future one.

## 13. Un-spec'd personal/permission fields on the edit form

**Decision**: Remove the following from `personal-info-section.tsx`,
`login-settings-section.tsx` (whole component), and `permission-settings-section.tsx`, and drop
the matching fields from `staff-edit-form.schema.ts`: furigana (`last_name_kana`/
`first_name_kana`), `gender`, `birthday`, the address group (`postal_code`/`prefecture`/`city`/
`address`/`building`), `login_method`/`social_id`, the three additional-permission checkboxes
(`billing_correction`/`refund_request`/`transfer_request`), and the "編集可能情報"
`editable_scopes` table (and its `useFieldArray`).

**Rationale**: None of these appear in Y-01, in `Y-01_権限設計v2_3.md`, or in the current
`staff-form.tsx` prototype; none are accepted by `UpdateStaffRequestDto`, so they render as
interactive fields that silently discard input on save (spec.md's Known Implementation Gaps
bullet 2). The three permission checkboxes additionally conflict with Y-01's 3-layer
role→position→person model — `Y-01_権限設計v2_3.md` §1-1 defines "請求確定後変更" /
"代理申請権限" as flags that live on the **position master** (FR-006), not as a per-account
override; exposing them per-account here pre-empts a decision that FR-006's screen (out of this
feature's scope) owns. `login_method`/`social_id` have a loose tie to a real, separate feature
(Y-13 §148: "ソーシャルログイン（Microsoft/Apple等）はPhase 1では対象外（Google SSOのみ）" — i.e.
Y-13 does define a login-method concept for CRM auth generally), but the current select only ever
offers "メール" (the "ソーシャル" option is commented out in the source) and nothing here is
persisted — the field is a placeholder for a Y-13 concept, not something Y-01's staff-edit screen
itself specs. If/when Y-13 needs to surface login method per staff account, that belongs in a
Y-13-driven change to this screen, not as a standing unwired stub.

**Alternatives considered**:

- Keep the fields and wire them to the real API — rejected: no endpoint exists for any of them,
  and adding one is a backend scope decision (and, for the permission checkboxes, a design
  decision that contradicts the position-master model) that isn't this frontend task's to make.
- Keep the fields visible but disabled with an api-gap tooltip (matching the email treatment in
  item 14) — rejected for this group specifically, because unlike email they have zero basis in
  any reviewed source; keeping them would still imply they are a planned, spec'd part of this
  screen. Removing them is reversible (git history) the day Y-01 or a sibling spec formally adds
  them.

## 14. Email field: keep editable, disable until the API supports it

> **SUPERSEDED 2026-11-04 (Y-01 - Bug No.16).** The backend now accepts `email` on `PATCH /admin/staff/{id}` (API-070 v0.11.1 §6.5.3). The input is editable except for Google-route staff; see spec.md › "Email change on the edit screen". The text below is kept as the historical decision.

**Decision**: Keep the email input and "重複確認" button in `personal-info-section.tsx` (both are
in the current `staff-form.tsx` prototype and required by Y-01 FR-002/FR-003 via FR-012), but
render the input `disabled` with the same tooltip pattern already used for the role field
(`permission-settings-section.tsx`'s `canChangeRole` branch) explaining that email changes aren't
saved yet, instead of letting it silently no-op. Point the duplicate-check query at the real staff
list endpoint already used elsewhere on this page rather than the mock `getCrmStaffsOptions`.

**Rationale**: Unlike the item-13 fields, email edit is genuinely in scope (Y-01, FR-012, and the
prototype all require it) — the gap is purely that `UpdateStaffRequestDto` hasn't grown an email
field yet. Silently discarding a value the user believes they saved is a correctness bug
(spec.md's Known Implementation Gaps bullet 1); disabling with an explanation reuses an existing,
already-understood UI pattern in this exact file rather than inventing a new one, and is easy to
revert to fully-editable the moment the backend contract adds the field.

**Alternatives considered**:

- Leave it editable and silently drop the change (status quo) — rejected, this is the bug being
  fixed.
- Remove the field entirely — rejected, unlike item 13's fields this one has a firm basis in Y-01
  and the prototype; hiding a required field would be a bigger spec deviation than disabling it.

## 15. Manager-scope edit guard (FR-013)

**Decision**: Extract the existing `isManagerEditAllowed` check currently duplicated only in
`staff-detail-header.tsx` into a shared helper (e.g.
`src/app/(private)/staffs/_utils/can-edit-staff.util.ts`), and apply it in two places that
currently have no such check at all: (a) `StaffEditDataProvider` in
`staffs/[id]/edit/page.tsx` — render an access-denied state instead of the form when the check
fails, instead of loading and allowing submission unconditionally; (b) the "編集" row action in
`staffs-table-columns.tsx`, which today is a plain `onClick` with no gating, unlike other
role-gated actions in the same table.

**Rationale**: Per the background investigation done during the 2026-08-24 spec re-check, FR-013
is currently enforced nowhere except as a disabled button/tooltip on the detail page — direct
navigation to `/staffs/[id]/edit` bypasses it completely, and the list row's edit action has no
gate either. Sharing one helper between the three call sites (detail-page button, list-row action,
edit-page guard) removes the drift that let two of the three sites go unguarded, and matches how
this codebase already handles other role-gated actions (`RoleGatedButton`/`RoleGatedMenuItem`).
Whether the real backend also rejects an unauthorized `PATCH` is unverified from the frontend and
out of this task's ability to confirm — this decision only closes the client-side gap.

**Alternatives considered**: Rely on the backend to reject unauthorized updates and leave the
frontend as-is — rejected as insufficient on its own: even if the backend enforces this correctly,
letting an unauthorized manager load a full, seemingly-editable form and only fail at submit time
is a worse experience than not being able to open it, and the codebase's established pattern here
is to gate at the UI layer too.
