# Research: Y-04 Terms Document Master Management

**Feature**: `017-terms-management` | **Date**: 2026-07-14

All items below resolve open modeling questions between the three source materials — the feature
`spec.md`, the V0 UI prototype (`terms-list.tsx` / `terms-detail.tsx` / `terms-form.tsx`), and the
reference backend field snapshot (`mock-api-schema.md`) — plus the repo's existing mock-DB
conventions. No `[NEEDS CLARIFICATION]` tokens remain in `spec.md`; everything here is a design
decision, not an open question.

## 1. Table shape: one row per version, no separate "lineage" table

**Decision**: A "Terms Document" (spec's Key Entity) is stored as one row per version — the
original and every derived version are peers in the same `terms` table. "Terms Lineage" is not a
separate table; it's derived by grouping rows that share the same root id (`parent_terms_id` if
set, else the row's own `id`).

**Rationale**: `mock-api-schema.md`'s "terms list" sample is already a flat list of
version-level rows (an original v1.0 style row has `parentTermsId: null`); the list page (US1)
shows every version as its own row (`terms-list.tsx`'s mock rows include both `会員規約 v1.2`
and `会員規約 v1.3` as separate list entries). The detail page's "Version History" tab (US2, FR-011)
re-groups those same rows into a per-lineage timeline at read time. Modeling a second table would
duplicate data that's fully derivable.

**Alternatives considered**: A `terms` (identity) + `terms_versions` (revisions) two-table split —
rejected as unnecessary complexity; every field the UI needs (title, type, brand, dates, PDF) lives
on the version row itself per the reference schema, so there is no identity-only data to split out.

## 2. Brand is one value per document, or `null` = one shared document for both brands

**Decision** (updated 2026-10-19 after the customer ruling on Y-04 / API-076): each terms document
row has one `brand_enum` — `JOYFIT` | `FIT365` (the brand _group_, as the backend returns it) — or
`null`, meaning **one shared document that applies to BOTH brand groups**. The registration form's
brand checkboxes (`terms-form.tsx`, FR-007 "multi-select") map to the request as:

- only JOYFIT ticked → one `POST /api/v1/admin/terms` with `brandEnum: "JOYFIT"`;
- only FIT365 ticked → one `POST` with `brandEnum: "FIT365"`;
- both ticked → **one** `POST` with `brandEnum: null` (a single shared record, one lineage).

(Previously: N brands ticked = N independent single-brand `POST`s. Superseded.)

**Rationale**: Y-04's 概要 says terms are managed per brand, and the customer confirmed that a term
ticked for both brands is a single shared document rather than two copies. The backend column is
nullable and every read path already treats a brand-less row as global. A `TermsBrandMapTable`
mirroring `banners` is still rejected — a lineage never spans a _chosen subset_ of brands with
diverging histories; "both" is just the `null` value.

**Read-side consequences**:

- List: a `brandEnum` filter (and the non-HQ brand scope, research.md #9) always keeps `null` rows,
  since they apply to every brand.
- Detail/list UI: a `null` row renders as a shared marker (both brand badges), not an empty cell.
- `brand_enum` stays locked after create (edit / new-version); a new version inherits it, including `null`.

## 3. Extracted body text: add `body_text`, not present in the reference snapshot

**Decision**: Extend the row schema with `body_text: string | null`, even though
`mock-api-schema.md`'s sample payloads omit it.

**Rationale**: FR-009/FR-010/FR-011 (spec.md) and Y-04 FR-003/FR-004 both require the automatically
extracted PDF text to be stored and redisplayed — this is core, load-bearing scope (US2 AS1, US3
AS3), not optional. The reference snapshot is a partial field list (it also omits PDF filename/size,
needed by FR-010's "attached PDF's filename and size"); spec.md's explicit requirements supersede
an abbreviated reference sample per Principle III (spec is the source of truth once approved).

**Mock extraction behavior**: real PDF parsing is out of scope (spec's "Out of Scope" section,
Y-04 confirmed Method D: PDF stays authoritative, extraction is a backend concern). The Phase 1
mock table synthesizes a deterministic placeholder body text whenever `pdf_url` is set or replaced
(e.g. built from the title), so the UI's body-text card and PDF always appear together (SC-003) —
it never manually reconciles or edits this text.

## 4. Status and "currently applied" are computed at read time, never stored

**Decision**: `status` (`published` | `ended` | `draft`; the mock called `ended` "expired") is computed per row from
`effective_from` / `effective_to` vs. `now()`, exactly like `banners.computeStatus()` and
`app-maintenance`'s derived status. `is_currently_applied` (a lineage-scoped boolean: "is this the
one version currently in effect") is also computed at read time — the row within a lineage group
whose computed status is `published`.

**Rationale**: FR-015 requires the previous version's status to flip to `expired` automatically the
moment a new version's effective date arrives, "with no manual status toggle... anywhere in the
UI." Storing either field would require a background job to keep them in sync; computing them on
every read makes FR-015 trivially and always correct, matching the two most recent precedent
features' identical choice.

**Edge case**: if no row in a lineage currently has `published` status (e.g., all versions are
either not-yet-effective or already expired — possible if a gap exists in effective ranges), no
row is "currently applied." The "applied" timeline highlight and the 適用中 badge are simply
omitted in that case; this is a valid, if unusual, state and not an error. The basic-info
body-text/PDF card does not depend on it: it always shows the opened document's own text and PDF
(FR-010, updated 2026-10-20).

## 5. Lineage linking: keep both `parent_terms_id` and `prev_terms_id`

**Decision**: Keep both fields from the reference schema. `parent_terms_id` always points at the
lineage's root/original document (`null` on the original itself). `prev_terms_id` points at the
specific document a version was created from.

**Rationale**: Per spec's Edge Cases, "Creating a new version always inherits name/type/brand from
the terms document currently open... there is no per-row branch-from-this-version option." So the
"Create New Version" action (US5) is only ever invoked from whichever single document is currently
open (its Version History tab), and:

- `prev_terms_id` = the id of that currently-open source document (may itself be a version, not
  necessarily the original)
- `parent_terms_id` = that source document's own `parent_terms_id`, or its own `id` if the source
  document has none (i.e., the source document is itself the original)

This guarantees `parent_terms_id` always resolves the lineage root in one hop (used for the FR-014
"Related Terms" reference and for lineage grouping), while `prev_terms_id` preserves the exact
derivation chain for potential future use, matching the reference schema's shape.

## 6. ID format: sequential `TM-{NNN}`, not the reference's ULID sample

**Decision**: Mock-layer ids follow this repo's existing `{PREFIX}-{NNN}` convention (`BN-001`,
`AM-001`, `CAT-001`), i.e., `TM-001`, `TM-002`, ... — not `mock-api-schema.md`'s literal
`01J5K8M3N2P4Q6R7S9T0V1W800`-style ULID sample.

**Rationale**: Matches the most recent precedent's (`016-app-maintenance-mgmt`) identical
resolution: the mock DB's own id format is an implementation detail of Phase 1, and switching to
whatever real format the backend uses (ULID or otherwise) is a Phase 2, mock-only concern with zero
application-code impact per Principle II.

## 7. PDF upload: media presign with tag `terms`, S3 key sent to the API

**Decision** (updated for the real API): upload via `POST /api/v1/media/presign` with
`tag: "terms"` (the BE whitelists `terms`; `document` was only a temporary stand-in), `PUT` the
file to the presigned URL, then submit the returned **S3 key** as `pdfS3Key` on create / edit /
new version. The FE also extracts the PDF text client-side (`pdf-text.util.ts`) and sends it as
`bodyText` in the same request (§6.2 pairing rule). `pdfFileName` / `pdfFileSize` are not sent —
the BE derives them on read. The form still caps size at 10MB (FR-008) although the server allows 100MB.

**Superseded:** the mock-era plan (`/crm/uploads/presign`, category `document`, submit `public_url`
as `pdf_url`, send filename/size).

## 8. Role gating: plain role-list checks, no new `Permission` enum entries

**Decision**: Gate "New Registration" / "Edit" / "Delete" / "Create New Version" via
`RoleGatedButton`/`RoleGatedMenuItem` with `allowedRoles={[UserRole.Headquarter, UserRole.System]}`.
Gate list/detail _page access_ (not a button) via a direct `hasRole([...five non-Trainer
roles])` check rendering the "no permission" card when false (matching the prototype's
`canViewTermsList` pattern). No new `Permission` enum entries.

**Rationale**: Every action in Y-04's permission matrix collapses to the same two-role vs.
everyone-else-blocked rule — there is no per-action differentiation (unlike `staffs`, which needs
fine-grained `StaffsInvite` separate from `StaffsEdit`). `016-app-maintenance-mgmt` made the
identical call for the same reason ("no new Permission enum entries needed — role check is a
single literal comparison"); this feature's matrix is equally flat, so the same minimal approach
applies.

**Server-side enforcement**: writes (`POST`/`PATCH`/`DELETE /api/v1/admin/terms...`) MUST re-check
`role !== 'Headquarter' && role !== 'System'` inside the route handler via
`getAuthUserFromRequest`, not only via client-side button gating — same rule 016 established for
FR-014-equivalent write protection here (spec's FR-017).

## 9. Brand-scoped viewing for Manager/Staff/Observer

**Decision**: Add a small helper (co-located with the terms route handlers, not a generic
`_lib/auth.ts` export, since terms is — so far — the only feature needing brand-scoped _reads_)
that resolves the authenticated user's assigned brand from their staff record
(`db.staffs.getList().find(s => s.staff_id === user.staff_id)?.brand`, using the existing
`StaffBrandSchema` value: `'all' | 'joyfit' | 'fit365' | ...`) — **mock-era**; on the real API the BE scopes non-HQ roles by brand _group_ (`stores.brand_group`) and the FE sends no scope. System/Headquarter → unrestricted
(`null`). Manager/Staff/Observer with `brand === 'all'` → unrestricted. Manager/Staff/Observer with
a specific brand → list/detail results are filtered to `brand_enum === thatBrand`; requesting a
detail id outside their brand scope returns 404 (same "not found" pattern `getAllowedStoreIds`
consumers use elsewhere, not 403, so scope doesn't leak which ids exist).

**Rationale**: FR-006 requires brand-scoped view-only access for these three roles. The existing
`getAllowedStoreIds` helper is store-scoped and unrelated; staff records already carry the
`brand` field this feature needs (`StaffBrandSchema`, used today for Staff invite scoping), so no
new mock data is required — only a new read-side filter.

## 10. Narrow 2-value brand enum, not the 5-value `BrandEnumSchema`

**Decision**: `TermsBrandSchema = z.enum(['JOYFIT', 'FIT365'])` (real API value; the mock used lowercase), a dedicated narrow enum — not the
project-wide 5-value `BrandEnumSchema` (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`,
`fit365`).

**Rationale**: Y-04's 概要 explicitly scopes this feature to "2ブランド共通（JOYFIT・FIT365）" only
(the 3 JOYFIT sub-brands are out of scope for terms and roll up to JOYFIT). This exactly matches
`016-app-maintenance-mgmt`'s identical decision for the same reason (its `targetBrand` field), and
the reference schema's own `"brandEnum": "Joyfit"` sample confirms a 2-value set, not 5.

## 11. Version-history "change summary" is the version's own `remarks`, not a new field

**Decision**: No new "change summary" field is introduced. FR-011's per-version "change summary"
in the timeline is simply that version row's own `remarks` field, redisplayed with a different
label in the Version History tab context than in the Basic Info tab (where the _currently-applied_
version's `remarks` shows as "備考"/notes).

**Rationale**: FR-007/FR-012's field lists include only one free-text field ("notes"); nothing in
spec.md introduces a second one, yet FR-011 requires each timeline entry to show a change summary.
Since every version is its own document row with its own `remarks`, the natural reading is that
each version's author describes what changed in that version's own notes field, and the timeline
simply surfaces it under a more contextually apt label. This requires no schema change.

**New-version prefill note**: per FR-014's explicit copy list ("name, type, brand, display order,
approval-button-display" — `remarks` is not listed), `remarks` starts **blank** on the "Create New
Version" form, not copied from the source. The V0 prototype's shared `EDIT_DATA.note` prefill for
`new-version` mode is a prototype shortcut, not a rule to replicate — spec.md's precise field list
governs.

## Summary of resolved unknowns

| #   | Question                              | Resolution                                                                              |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Separate lineage table?               | No — derive lineage by grouping on `parent_terms_id`                                    |
| 2   | Multi-brand documents?                | One brand, or `null` = one shared document; both brands ticked → one create with `null` |
| 3   | Extracted text field?                 | Add `body_text` (absent from reference snapshot; mocked via placeholder)                |
| 4   | Status/applied-version storage?       | Computed at read time, never stored                                                     |
| 5   | `parent_terms_id` vs `prev_terms_id`? | Keep both; root-pointer vs. immediate-source-pointer                                    |
| 6   | Mock id format?                       | Mock: `TM-{NNN}`. Real API: UUID                                                        |
| 7   | PDF upload mechanism?                 | `POST /media/presign` tag `terms` → S3 key as `pdfS3Key` + client `bodyText`            |
| 8   | New `Permission` entries?             | None — plain `allowedRoles` checks, mirroring 016                                       |
| 9   | Brand-scoped viewing?                 | Real API: BE scopes non-HQ by brand group; shared (`null`) rows always visible          |
| 10  | Brand enum width?                     | Narrow 2-value `TermsBrandSchema`, not the 5-value project-wide enum                    |
| 11  | Timeline "change summary" source?     | Reuses each version's own `remarks`; no new field                                       |
