# Quickstart: Y-04 Terms Document Master Management

**Feature**: `017-terms-management`

## Build order

Follow this order so each layer is curl-testable against `contracts/*.md` before any UI is built
on top of it (same discipline as `016-app-maintenance-mgmt`):

1. `src/app/api/_schemas/terms.schema.ts` — `TermsTypeSchema`, `TermsBrandSchema`,
   `TermsStatusSchema`, row/query/create/update/response schemas (see [data-model.md](data-model.md)).
2. `src/app/api/_mock-db/types/terms.type.ts` — row type + table interface.
3. `src/app/api/_mock-db/tables/terms.table.ts` — `computeStatus()`, `computeIsCurrentlyApplied()`,
   lineage grouping helper, CRUD methods.
4. `src/app/api/_mock-db/seeds/terms.seed.ts` — 9-row seed, dates relative to `now()` (see
   data-model.md's seed table).
5. Wire into `_mock-db/_db.types.ts` and `_mock-db/_create-db.ts` (`createTermsTables()`).
6. _(mock-era — superseded by the real API client in `src/lib/api-real`)_ `src/app/api/crm/terms/route.ts` (`GET` list / `POST` create) and
   `src/app/api/crm/terms/[id]/route.ts` (`GET` detail / `PATCH` update / `DELETE`), each calling
   `registerRoute()`.
7. Add the new route files' imports to `src/app/api/_routes/index.ts`.
8. `npm run generate-openapi && npm run generate-api` — regenerates
   `src/lib/api/@tanstack/react-query.gen.ts` with the new `getCrmTerms*`/`postCrmTerms*`/
   `patchCrmTermsById*`/`deleteCrmTermsById*` hooks. **Never hand-edit generated files.**
9. Manually curl each endpoint against `contracts/*.md` before touching any UI.
10. Build the list page (`/(private)/terms/page.tsx`), reusing `PageHeader`, `Empty`,
    existing `Pagination`/page-size pattern, `RoleGatedButton`/`RoleGatedMenuItem`.
11. Build the detail page (`/(private)/terms/[id]/page.tsx`) — two tabs (Basic Info, Version
    History), reusing `BackLink`, `Tabs`.
12. Build the shared registration/edit/new-version form (`_components/terms-form/`), reusing
    `DatePicker`, `useUnsavedChanges` (pattern from `lesson-schedules/create/_hooks/`), and a
    thin terms-local wrapper around `useImageUpload` (category `'document'`, `application/pdf`,
    10MB ceiling — see research.md #7).
13. Wire the three route pages (`create/`, `[id]/edit/`, `[id]/new-version/`) to that shared form
    component with a `mode` prop.

## Manual verification checklist (no automated tests — constitution "No Testing Policy")

- [ ] List: switch every tab; each shows only its `termsType`; "All" shows everything.
- [ ] List: search by partial id and by partial title; both narrow results.
- [ ] List: brand filter, status filter; active-filter-count badge and filter-summary banner
      appear/update; "clear conditions" resets everything including search.
- [ ] List: "include deleted" toggled off hides `TM-009`; toggled on shows it dimmed.
- [ ] List: page-size selector (25/50/100/200) and pagination controls behave correctly with the
      9-row seed (use a small page size to force multiple pages).
- [ ] List: log in as Trainer → "no permission" card, no table.
- [ ] List: log in as a brand-scoped Manager/Staff/Observer → only that brand's rows appear, even
      with no brand filter applied.
- [ ] Detail: open `TM-002` (published version) — Basic Info shows body text + PDF + preview
      action; management info shows all FR-010 fields.
- [ ] Detail: Version History tab shows `TM-001` + `TM-002` in chronological order, `TM-002`
      visually distinguished as applied; only `TM-002`'s entry shows a PDF link.
- [ ] Detail: a lineage with 4+ versions shows only 3 initially + a "show more" control.
- [ ] Create: submit with a required field missing → inline error + scroll-to-first-invalid.
- [ ] Create: upload a non-PDF or >10MB file → inline rejection, no state corruption.
- [ ] Create: valid PDF upload → extracted text preview appears labeled with the filename.
- [ ] Create: select both brands → two independent documents are created (verify via list).
- [ ] Create: log in as Manager/Staff/Observer/Trainer → "New Registration" is disabled/hidden.
- [ ] Edit: `termsType`/`brandEnum` shown disabled; editing `TM-002` (published) shows the
      active-version warning banner; save reflects in detail.
- [ ] Edit: attempt to navigate away with unsaved changes → discard-confirmation dialog.
- [ ] New Version: from `TM-002`'s Version History tab, "Create New Version" pre-fills
      name/type/brand/order/consent (locked) and shows the "Related Terms" reference to `TM-001`;
      submitting flips `TM-002` to `expired` once its effective window is superseded.
- [ ] Delete: from list row and from detail page, confirm dialog, row disappears from default
      list, reappears dimmed with "include deleted" checked; sibling lineage members untouched.
- [ ] Delete/Edit/Create/New-Version: attempt directly via `curl` as a non-Headquarter/System
      bearer token → 403, confirming server-side enforcement (not just UI hiding).

## Type-check & lint (per constitution — no automated tests)

```bash
npx tsc --noEmit
npm run lint
```
