# Phase 0 Research: App Version Management (Create/Edit Form)

**Feature**: `018-app-version-form`
**Spec**: [spec.md](./spec.md)

No `[NEEDS CLARIFICATION]` markers were present in `spec.md`, so this phase focuses on confirming technical decisions against the existing codebase (`016`/`017`'s shipped implementation and the closest sibling form, `013-article-category-form`) rather than resolving open questions.

---

## Decision 1 — Reuse 016/017's `AppVersionRecordSchema`/table/seed as-is

**Decision**: Do not introduce a parallel entity schema or type for the form. `AppVersionRecordSchema`, `AppVersionBrandEnumSchema`, and the `appVersions` mock table (`src/app/api/_schemas/app-version.schema.ts`, `src/app/api/_mock-db/tables/app-version.table.ts`) already fully model every field this form edits (`brandEnum`, `iosVersionName`, `iosBuildNumber`, `androidVersionName`, `androidBuildNumber`, `releaseDate`, `remarks`).

**Rationale**: `016-app-version-management` already shipped these as the single source of truth for the entity, reused unchanged by `017-app-version-detail`; duplicating them here would violate Principle V and risk drift between the list/detail and form screens.

**Alternatives considered**: A separate form-scoped entity type (rejected — same reasoning as `013-article-category-form` Decision 1).

---

## Decision 2 — Form schema is a distinct `AppVersionFormSchema`, mapped to/from the entity via a mapper file

**Decision**: Follow the `article-category-form.schema.ts` + `article-category-form.mapper.ts` split exactly: `app-version-form.schema.ts` defines validation for what the `<Input>`/`<RadioGroup>`/`<DatePicker>`/`<Textarea>` controls actually produce, and `app-version-form.mapper.ts` converts those form values to `CreateAppVersionBody`/`UpdateAppVersionBody` request bodies, and converts a fetched `AppVersionRecord` back into form values for edit-mode prefill.

**Rationale**: Established, working precedent in this exact codebase (`013-article-category-form`, itself modeled on `010-banner-form`); keeps the entity schema (API contract) and the form schema (UI validation, e.g. required-field messages) independently evolvable.

**Alternatives considered**: Reusing `AppVersionRecordSchema` directly as the form's `zodResolver` input (rejected — it includes server-assigned fields like `id`/`createdBy`/`createdAt` that the form never touches, and it doesn't encode UI-only required-field messages).

---

## Decision 3 — Brand is a single-select `RadioGroup` bound to the real `AppVersionBrandEnum` values, not the prototype's literal uppercase strings

**Decision**: The form's `brandEnum` field is `AppVersionBrandEnumSchema` (`'Joyfit' | 'Fit365'`), bound to a shadcn `RadioGroup`/`RadioGroupItem` pair whose `value`s are `AppVersionBrandEnum.JOYFIT`/`AppVersionBrandEnum.FIT365` (i.e. `'Joyfit'`/`'Fit365'`), with visible labels taken from the existing `APP_VERSION_BRAND_LABELS` constant (`'JOYFIT'`/`'FIT365'`).

**Rationale**: The reference design (`pages/app-version-form.tsx`) hardcodes `RadioGroupItem value="JOYFIT"` / `value="FIT365"` (uppercase) — but the real, already-generated `AppVersionBrandEnum` type (`src/lib/api/types.gen.ts`) and every other app-version screen use `'Joyfit'`/`'Fit365'` (mixed case) as the actual wire values, with `APP_VERSION_BRAND_LABELS` supplying the uppercase display text. Binding the RadioGroup directly to the prototype's literal casing would silently produce values the API schema rejects. This mirrors how `equipment-form-basic-info.tsx` wires a `RadioGroup` inside a real RHF field (`Controller`-driven, `value`/`onValueChange` bound to the entity's real enum values, not display strings).

**Alternatives considered**: Introducing a form-only uppercase brand enum and mapping it in the mapper (rejected — adds a translation layer with no benefit over binding directly to the real value and only mapping the _label_).

---

## Decision 4 — No confirmation-review dialog, no unsaved-changes discard guard

**Decision**: `AppVersionForm` submits directly on valid `handleSubmit` — no `AlertDialog` review step before the mutation fires, and no discard-confirmation dialog on Cancel.

**Rationale**: Matches the reference design (`pages/app-version-form.tsx`) exactly — its "キャンセル" button calls `navigate("app-management")` directly with no dialog, and its submit button fires the mutation immediately. Matches `spec.md`'s Edge Cases ("staff member cancels... they return to the App Version list, and no record is created or changed" — no mention of a confirmation step) and follows `013-article-category-form`'s explicit precedent for the same reason (Decision 4 there), rather than `012-studio-create-edit`/`010-banner-form`'s heavier discard-guard pattern.

**Alternatives considered**: Adding a discard-guard dialog for consistency with `training-equipment`'s create/edit pages (rejected — would contradict both the reference design and this feature's own spec, which describes cancel as an immediate, unconditional return to the list).

---

## Decision 5 — Route-level 403 gating requires zero new permission/routing code

**Decision**: No changes to `src/constants/permission.constants.ts`, `src/types/permission.type.ts`, `src/proxy.ts`, or `src/lib/routes/routes.config.ts`.

**Rationale**: Traced the existing mechanism end-to-end:

1. `routes.config.ts` already registers `/app-versions/create` and `/app-versions/[id]/edit` (router fn, `filePath`, `pattern`) — these were pre-provisioned by `016-app-version-management` alongside the placeholder pages.
2. `PAGE_PERMISSIONS` (already set by `016-app-version-management`) maps `/app-versions/create` → `Permission.AppVersionsCreate` and `/app-versions/:id/edit` → `Permission.AppVersionsEdit`.
3. `ROLE_PERMISSIONS` (already set by `016-app-version-management`) grants `AppVersionsCreate`/`AppVersionsEdit` only to `Headquarter` (and implicitly `System`); Manager/Staff/Observer hold only `AppVersionsView`, and Trainer holds none of the `AppVersions*` permissions.
4. `src/proxy.ts` runs on every request matching a registered route pattern and redirects to `/403` whenever the caller's role lacks the required permission — before any React code for that page executes.

This is exactly spec FR-011/User-Story-3's required behavior, and it already runs today against these two exact route patterns — replacing the placeholder pages with the real form does not change or bypass it. This also resolves the self-consistency issue found while drafting this plan: the originally-drafted spec described Manager/Staff/Observer as reaching the form with a disabled submit button (mirroring the list/detail screens' "shown-but-disabled" pattern), which is inconsistent with the page-level guard traced above — `spec.md` was corrected accordingly before this plan was written (see its checklist notes).

**Rationale for keeping `RoleGatedButton` anyway**: The reference design still wraps the submit button in `RoleGatedButton allowedRoles={["Headquarter", "System"]}`. Since only Headquarter/System can ever load the page, this is inert defence-in-depth rather than the primary gate — kept for parity with the design and consistency with `013-article-category-form`'s identical choice, not because it does load-bearing access control here.

**Alternatives considered**: Adding a redundant client-side redirect-on-mount check (rejected — `proxy.ts` already runs before any React code executes; a client-side check would be dead code).

---

## Decision 6 — New endpoints: `POST /crm/app-versions`, `PATCH /crm/app-versions/{id}`; `GET /crm/app-versions/{id}` already exists

**Decision**: Add one new route (`POST`) to the existing `src/app/api/crm/app-versions/route.ts`, and one new method (`PATCH`) to the existing `src/app/api/crm/app-versions/[id]/route.ts` (which currently has `GET` from `017-app-version-detail` and `DELETE` from `016-app-version-management`).

**Rationale**: The edit page's pre-fill fetch is already fully covered by `017-app-version-detail`'s `GET /crm/app-versions/{id}` — no new read endpoint is needed. Create/edit need their own mutations, matching the exact shapes `docs/api/Y-05.md` documents for "1. Register an App Version Record" and "2. Edit an App Version Record". Unlike `016`/`017`'s `GET`/`DELETE` endpoints (which the PO spec never documented, so those features had to invent shape/status codes from internal convention), `docs/api/Y-05.md` is the explicit, authoritative source for these two exact operations — so this feature follows it precisely rather than the "always 200" convention seen on some older sibling forms (`010-banner-form`, `013-article-category-form`):

- `POST` responds **`201 Created`** (per `docs/api/Y-05.md` §1), not `200`.
- `PATCH` responds **`200 OK`** (per `docs/api/Y-05.md` §2).
- Both return the entity directly — no `{ message, ... }` wrapper — which conveniently is already true of every other app-version endpoint (`GET` list/by-id already return bare shapes), so there is no wrapper decision to make here at all, unlike `article-category-form`'s Decision 6.

**Response schema**: `docs/api/Y-05.md`'s documented POST/PATCH response fields (`id`, `brandEnum`, `iosVersionName`, `iosBuildNumber`, `androidVersionName`, `androidBuildNumber`, `releaseDate`, `remarks`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`) are identical to the already-existing `AppVersionRecordSchema`. No new response schema is introduced — both endpoints reuse `AppVersionRecordSchema` directly.

**ID generation**: New records use `crypto.randomUUID()` (no new dependency — already used identically for new-entity IDs in this codebase, e.g. `src/app/api/crm/uploads/route.ts`), consistent with the seed data's UUID-shaped IDs (`01912d4e-...`) — unlike `article-category`/`banner`, which use sequential prefixed codes (`CAT-###`) because their entities were seeded that way instead.

**Alternatives considered**: Matching `docs/api/Y-05.md`'s documented `ErrorResponseSchema` shape (`{ code, message, userMessage, traceId }`) for 400/404/500 bodies (rejected — `016`/`017`'s existing `GET`/`DELETE` handlers for this exact resource already return the simpler `{ error: string }` shape used everywhere else in this codebase's mock routes, and `ErrorResponseSchema` in `app-version.schema.ts` is already unused by them; introducing a second error shape only for the two new endpoints would fragment one resource's error handling for no functional benefit — the existing runtime convention for _this_ resource takes precedence over the PO doc's aspirational error shape). Always-200 status codes for parity with `article-category`/`banner` (rejected — see rationale above; this is the one place a PO doc explicitly specifies status codes for this resource, so it is followed).

---

## Decision 7 — `createdBy`/`updatedBy` are set to a hardcoded mock "current staff" ID, not derived from any real auth context

**Decision**: The mock `create`/`update` table methods set `createdBy`/`updatedBy` to the same placeholder staff UUID already used throughout `app-version.seed.ts` (`'01912d4e-8b4c-7d9e-af1a-2b3c4d5e6f01'`), rather than reading it from the client request body or any session/JWT context.

**Rationale**: `docs/api/Y-05.md` specifies `createdBy`/`updatedBy` are server-assigned "from `JWT.sub`" — accordingly, neither field is part of `CreateAppVersionBodySchema`/`UpdateAppVersionBodySchema` (the client never sends them). But this project's Phase 1 mock routes have no real JWT/session verification (per `013-article-category-form` Decision 7 and this feature's own Decision 5 — access control is enforced only at the page/route level, before any fetch call), so there is no real "current user" available server-side to assign. Reusing the seed data's existing placeholder ID keeps all records (seeded and newly created) attributed to the same recognizable mock staff member rather than inventing a second, inconsistent placeholder.

**Alternatives considered**: Reading a "current user id" from the client's `useAuthUser()` context and sending it in the request body (rejected — this would contradict the API spec, which defines these as server-assigned audit fields, not client-supplied ones; it would also need to be un-done once Phase 2's real backend is wired up, which is exactly the kind of Phase 1 → Phase 2 mismatch Principle II is designed to avoid).

---

## Decision 8 — No cross-record uniqueness or business-rule validation beyond what's specified

**Decision**: Neither the Zod schema nor the mock route handlers reject a duplicate brand+version combination, nor do they cross-check the release date against any maintenance window.

**Rationale**: Matches `spec.md`'s Assumptions verbatim — no such rule is stated in any FR, `docs/api/Y-05.md` defines none, and the reference design's maintenance-window `Alert` is explicitly informational only (spec FR-006, Edge Cases).

**Alternatives considered**: Adding a uniqueness check "for safety" (rejected — not required by any acceptance scenario or success criterion; would be unrequested scope per Principle V).

---

## Decision 9 — Form field wiring for `RadioGroup` and `DatePicker` follows `equipment-form-basic-info.tsx` / `training-equipment-form-fields.tsx`, not the reference design's plain `useState`

**Decision**: Unlike the reference design (which uses a local `useState` for `releaseDate` and an uncontrolled default `RadioGroup`, since it's a static prototype with no real form library), the real implementation wires every field through `react-hook-form`'s `Controller`/`form.register`, following `article-category-form.tsx`'s use of the shared `@/components/common/form-field` `FormField` wrapper (label/required/description/error) for layout, with `Controller` for `RadioGroup` (Decision 3) and `DatePicker` (`date={field.value ? parseISO(field.value) : undefined}`, `onDateChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}`, mirroring `training-equipment-form-fields.tsx`), and plain `form.register(...)` for the two version-name/build-number `<Input>` pairs and the remarks `<Textarea>`.

**Rationale**: This is the only way to get Zod validation, inline error messages, and submit-value coercion (e.g. build numbers as `number`, not the raw string an `<input type="number">` produces) — none of which the static prototype needed to handle.

**Alternatives considered**: The shadcn `@/components/ui/form` `Form`/`FormField`/`FormItem` context-based wiring used by `training-equipment-form-fields.tsx`/`equipment-form-basic-info.tsx` (rejected as the primary pattern — the reference design's own local `FormField` helper is structurally identical to `@/components/common/form-field`, the same component `article-category-form.tsx` already uses with plain `Controller`/`register`, so following that exact precedent is the more direct, lower-friction translation from prototype to real code).
