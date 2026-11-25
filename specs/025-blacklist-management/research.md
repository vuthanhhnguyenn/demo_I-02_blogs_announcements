# Research: Blacklist Management (A-01 FR-015)

**Feature**: `025-blacklist-management` | **Date**: 2026-08-07 | **Plan**: [plan.md](./plan.md)

All findings below were established by reading the repository and the v0.4 contract, not by assumption. Each records the decision, why, and what was rejected.

---

## §1 — The existing implementation is a rewrite target, not a starting point

**Decision**: Rewrite the blacklist feature against the v0.4 contract, reusing the existing route-local file layout but replacing every schema, table, seed and component that encodes the old shape.

**What is on disk today** (all under the old, pre-contract shape):

| Path                                                              | State                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/_schemas/blacklist.schema.ts`                        | `BlacklistItem` with `registrationSource` / `manualReason` / `memo` / string `memberId`; `MatchConditions`; snake-cased `pagination` |
| `src/app/api/crm/blacklist/route.ts`                              | `GET` + `POST /crm/blacklist`                                                                                                        |
| `src/app/api/crm/blacklist/[id]/route.ts`                         | `GET` only — no release route                                                                                                        |
| `src/app/api/crm/members/[id]/blacklist/route.ts`                 | `POST`, body `{ reason, memo }`                                                                                                      |
| `src/app/api/_mock-db/tables/transfer.table.ts` L137+             | `memberBlacklist` table, seeded inline                                                                                               |
| `src/app/api/_mock-db/types/member-blacklist.type.ts`             | `BlacklistRow = BlacklistDetail`, aliased from `seeds/transfer.seed`                                                                 |
| `src/app/(private)/members/blacklist/**`                          | 12 files — list page, detail page, filters, sheet, columns, constants, context, hook, 4 detail components                            |
| `src/app/(private)/members/[id]/_components/blacklist-dialog.tsx` | Posts `{ reason: <enum>, memo }`                                                                                                     |

**Rationale**: the delta is not additive. `blacklistId` becomes a UUID distinct from the member number; `registrationSource` becomes `source`; `manualReason` (single, nullable) becomes `reasonCategories` (array, required on create); `memo` and `reason` swap meanings; `isActive` / `removedAt` / `removedBy` / `level` / `history` are new; `matchConditions` is deleted. Every consumer of the old shape changes.

**Rejected**: incremental migration behind a compatibility layer. Spec FR-075 forbids it — two shapes behind one operation breaks the mock-equals-real equivalence Constitution §II requires, and the feature is small enough that a clean cut is cheaper than a shim.

---

## §2 — Page size: 25 / 50 / 100, default 25

**Decision**: `BLACKLIST_PAGE_SIZE_OPTIONS = [25, 50, 100] as const`, default `PAGE_SIZE` (25).

**Evidence**:

- `src/constants/app.constants.ts` L1 — `export const PAGE_SIZE = 25;` is the CRM-wide default.
- `src/app/(private)/members/leaves/_constants/constants.ts` — A-03 landed on exactly `[25, 50, 100]` for the identical conflict, with the same reasoning in a code comment.
- The v0.4 contract caps `limit` at 100; V0's 200 would be a 400.

**Rationale**: matching A-03 keeps the two list screens behaviourally identical, and the cap is real on both the mock and the live contract.

**Rejected**: keeping V0's default of 50 — it is a prototype artefact, not a design decision, and diverging from `PAGE_SIZE` would make this the only list screen with its own default. (Spec Q-08.)

---

## §3 — The mock's member-list projection is short three fields

**Decision**: add `date_of_birth`, `face_photo_url` and `has_blacklist` to `MemberListItemSchema`, and have the registration Sheet drive its lookup off `GET /crm/members?search=`.

**Evidence**:

- `src/app/api/_schemas/member.schema.ts` L83-L130 — `MemberListItemSchema` carries `id`, `old_member_number`, `member_number`, `name_kanji`, `name_kana`, `member_type`, `contract_type`, `status`, `store_name`, `store_id`, `brand`, `contract_name`. No birthdate, no photo, no blacklist flag.
- The same three are missing from the real contract's `MemberListItem` — `dateOfBirth` and `facePhotoUrl` exist only on `PersonalInfo` in the member-detail response, and `hasBlacklist` exists on the real list item but has no counterpart in the mock.
- `src/app/api/crm/members/route.ts` L114-L124 already implements free-text search across name / number / phone / email with phone-separator normalisation, so the search itself needs no work.

**Rationale**: the Sheet's identity card (FR-042) renders the birthdate and photo, and FR-050a needs the blacklist flag to pre-empt the duplicate 409. Adding them to the mock is the mock-first path spec Assumptions already sanction; the projection request goes to the client separately.

**Note on matching semantics**: the mock's search uses `.includes()` (substring); the real contract is prefix-only (`ILIKE 'kw%'`) except on the two unique keys. FR-038a governs, so the mock's search for **this Sheet** must be prefix-based to stay equivalent. Changing the shared member-list route's matching for every other caller is out of scope — see §4.

**Rejected**: a second `GET /crm/members/{id}` call on selection (spec Q-04 option B). It works with no schema change but adds a round-trip the client explicitly declined at QA qa07.

---

## §4 — Prefix matching is scoped to the Sheet, not to the member-list route

**Decision**: implement prefix matching as a dedicated query flag on the member-list route (an opt-in the Sheet sets), leaving the default substring behaviour untouched for every existing caller.

**Rationale**: `GET /crm/members` backs A-01's own member list and several pickers. Flipping its matching to prefix-only would silently change all of them, which is beyond this feature's scope and is not what FR-038a asks for — FR-038a is about the blacklist Sheet behaving the same against the mock as it will against the real endpoint.

**Rejected**: changing the shared route's default (breaks unrelated screens); doing the prefix filter client-side (defeats the point — FR-016 and FR-038a both require server-side evaluation).

---

## §5 — The blacklist table moves out of `transfer.table.ts`

**Decision**: create `src/app/api/_mock-db/tables/blacklist.table.ts` and `src/app/api/_mock-db/seeds/blacklist.seed.ts`; drop `types/member-blacklist.type.ts`.

**Evidence**: the `memberBlacklist` table is currently defined inside `tables/transfer.table.ts` (L137+) and its row type is aliased out of `seeds/transfer.seed.ts` — `export type BlacklistRow = BlacklistDetail`. Neither has anything to do with transfers.

**Rationale**: this feature owns the table and is rewriting it wholesale; leaving it lodged in an unrelated file would make the rewrite harder to review and keeps a false dependency. Every other domain in `_mock-db/tables/` has its own file.

**Care point**: `tables/members.table.ts` L695 calls `db.memberBlacklist.create(...)` inside the forced-withdrawal path (FR-016's auto-registration). That call site must be updated to the new shape — `source: 'forced_withdrawal'`, `reasonCategories: ['unpaid']` per the contract's note that auto-registered rows carry exactly `["unpaid"]` — and must keep writing a `registered` history event.

---

## §6 — Two registration routes collapse into one

**Decision**: delete `POST /crm/blacklist`; keep `POST /crm/members/{id}/blacklist` as the single registration endpoint. The list Sheet calls it once it has resolved a member.

**Evidence**: both exist today (`src/app/api/crm/blacklist/route.ts` and `src/app/api/crm/members/[id]/blacklist/route.ts`); v0.4 has only the member-scoped one. `src/app/(private)/members/[id]/_components/blacklist-dialog.tsx` L115 already targets the member-scoped route, so only its body changes.

**Rationale**: FR-073 – FR-075. The member-scoped route is the one the real contract keeps, and it is the one that can enforce the one-active-row invariant against a member.

---

## §7 — Release semantics

**Decision**: `PATCH /crm/blacklist/{id}/active` accepting `{ isActive: false }` only, mirroring the contract's guard order.

Guard chain, evaluated in this order:

1. entry not found → 404
2. `isActive !== false` in the body → 400
3. entry already released → 409

Effects: set `isActive = false`, stamp `removedBy` / `removedAt`, append a `removed` history event. The member's own status is untouched — releasing a force-withdrawn member means "may enrol again", not "the withdrawal is undone".

**Rationale**: taken verbatim from the contract so the mock and the live endpoint agree on every branch, which is what lets the Phase 2 switch be a no-op.

**Rejected**: a `DELETE` route. The contract keeps the row for audit and offers no delete; FR-065 requires retention.

---

## §8 — Screen-side patterns to follow

**Decision**: mirror A-03 (`src/app/(private)/members/leaves/`) file-for-file where the shapes match.

| Concern                 | Reuse                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| URL filter state        | `nuqs` `useQueryStates` in a `_hooks/use-*-filters.hook.ts`, with `history: 'push'`, `shallow: false`       |
| Debounced search        | `useDebounce(searchInput, 500)` writing back to the URL and resetting `page` to 1                           |
| Over-range page clamp   | the `servedPage < currentPage` effect guarded by `!isFetching` (leaves page L60-L67)                        |
| Table                   | `@/components/common/data-table` + a `_components/*-table-columns.tsx` factory                              |
| Pagination              | `@/components/common/table-pagination-with-size`                                                            |
| Filter banner           | `@/components/common/filter-result-banner`                                                                  |
| Empty / loading / error | `@/components/common/data-state-boundary/{empty,loading}`                                                   |
| Detail chrome           | `@/components/common/{back-link,page-header,status-card,role-gated-button}`                                 |
| Member combobox         | `@/components/common/searchable-select` — already does server-side search with debounce and infinite scroll |
| Forms                   | `react-hook-form` + Zod in `_schemas/*-form.schema.ts`                                                      |

**Rationale**: Constitution §IV and §V — no new abstractions, no new dependencies. `searchable-select` in particular already solves the Sheet's combobox, including the paging the V0 mock hand-rolled.

**Gap to close by hand**: `searchable-select` renders a text label per row; the Sheet's results need an avatar plus a two-line body (FR-039). Check whether its item renderer is already slot-based before extending it — extend only if it is not.

---

## §9 — Naming convention for the new schema — CORRECTED

**Decision**: **snake_case** for the mock API surface, matching every other schema in `_schemas/`. Nested `member` block on the detail, flattened member fields on the list — exactly the shape A-03 uses.

**Correction**: an earlier draft of this file called for camelCase "to match the v0.4 contract field-for-field". That was wrong, and following it would have made the blacklist the only mock endpoint in the project with its own casing.

**Evidence**:

- `leave.schema.ts` — the most recent feature (024), built against a **camelCase** real contract — is snake_case throughout: `application_number`, `member_number`, `member_name`, `store_name`, `applied_at`, `scheduled_date`, `unpaid_amount`, and an envelope of `total` / `total_all` / `total_pages`.
- It also flattens the member onto the list item (`member_id`, `member_number`, `member_name`) while nesting a wider `LeaveMemberSchema` on the detail — the same list/detail split this feature needs.
- `member.schema.ts`'s `MemberListItemSchema` is snake_case too.
- The existing `blacklist.schema.ts` is camelCase, which makes **it** the outlier, not the convention.

**Rationale**: A-03 already faced this exact tension — a camelCase live contract behind a snake_case mock — and chose project consistency. The camelCase↔snake_case mapping happens once, at the client boundary, whichever way the mock is written; introducing a second convention inside `_schemas/` costs more than it saves.

**Consequence**: the field names in [data-model.md](./data-model.md) and [contracts/blacklist-api.md](./contracts/blacklist-api.md) are written in the live contract's camelCase because those documents describe the **live** contract. The mock's snake_case equivalents are: `blacklistId`→`id`, `memberNumber`→`member_number`, `reasonCategories`→`reason_categories`, `unpaidAmount`→`unpaid_amount`, `isActive`→`is_active`, `registeredAt`/`registeredBy`→`registered_at`/`registered_by`, `removedAt`/`removedBy`→`removed_at`/`removed_by`, `reason`→`memo` on the mock (the mock names the field for what it now holds; see data-model § Entities).

## §10 — What the seeds must cover

**Decision**: seed from the existing member set, as the current table does, but cover the states the screens actually branch on.

Required coverage:

- both `source` values, with auto-registered rows carrying exactly `reasonCategories: ['unpaid']`
- `unpaidAmount` both zero and non-zero (FR-011's two renderings)
- at least one **released** entry — `isActive: false` with `removedAt` / `removedBy` set — reachable only by URL (FR-069a/b) and absent from the list (FR-033)
- a member with no `primaryStore`, and one with no `currentMainContract`, for the em-dash and omitted-badge branches
- a member with no `legacyMemberCode`
- `history` on every entry: a `registered` event always, plus a `removed` event on released ones, with `actor: null` on system-generated registrations
- enough rows to exceed one page at 25

**Rationale**: `history` is seed-only and rendered nowhere (FR-072), but the contract declares it required, so it must still be present and coherent. The released entry is the only way to exercise FR-069b at all, since no list view reaches one.

---

## §11 — No unresolved unknowns

Every `NEEDS CLARIFICATION` from the Technical Context is resolved above. Spec Q-01 – Q-12 are all closed (see spec `## Clarifications`). No open question blocks task generation.
