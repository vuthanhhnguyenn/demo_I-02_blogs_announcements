# Phase 0 Research: Article Category Form (Notice & Blog Management)

**Feature**: `013-article-category-form`
**Spec**: [spec.md](./spec.md)

No `[NEEDS CLARIFICATION]` markers were present in `spec.md`, so this phase focuses on confirming technical decisions against the existing codebase (013's shipped implementation and sibling forms) rather than resolving open questions.

---

## Decision 1 — Reuse 013's `ArticleCategory` schema/table/seed as-is

**Decision**: Do not introduce a parallel schema or type for the form. `ArticleCategorySchema`, `ArticleCategoryItemResponseSchema`, and the `articleCategories` mock table (`src/app/api/_schemas/article-category.schema.ts`, `src/app/api/_mock-db/tables/article-category.table.ts`) already fully model every field this form edits (`id`, `name`, `description`, `type`, `brand_enum`, `order`, `is_public`).

**Rationale**: 013 already shipped these as the single source of truth for the entity; duplicating them would violate Principle V (Simplicity & Minimal Dependencies) and risk drift between the list and form screens.

**Alternatives considered**: A separate `ArticleCategoryFormSchema`-as-entity (rejected — the form's Zod schema should describe _form values_, not redefine the entity; see Decision 2).

---

## Decision 2 — Form schema is a distinct `ArticleCategoryFormSchema`, mapped to/from the entity via a mapper file

**Decision**: Follow the `banner-form.schema.ts` + `banner-form.mapper.ts` split exactly: a `article-category-form.schema.ts` defines validation for what the `<input>`/`<Select>`/`<Switch>` controls actually produce (strings from `<Input>`, string enum from `<Select>`, boolean from `<Switch>`), and `article-category-form.mapper.ts` converts those form values to `CreateArticleCategoryBody`/`UpdateArticleCategoryBody` request bodies, and converts a fetched `ArticleCategoryItemResponse` back into form values for edit-mode prefill.

**Rationale**: Established, working precedent in this exact codebase (`010-banner-form`); keeps the entity schema (API contract) and the form schema (UI validation, e.g. required-field messages) independently evolvable.

**Alternatives considered**: Reusing `ArticleCategorySchema` directly as the form's `zodResolver` input (rejected — its `brand_enum` field is required with no default, and the entity schema does not encode UI-only validation messages like "カテゴリ名を入力してください。").

---

## Decision 3 — Linked brand is a single-select `BrandEnum`, not the multi-select pattern from `banner-form`

**Decision**: The form's `brandEnum` field is `z.enum(BrandEnum)` (single value, required), not `z.array(z.enum(BrandEnum))` like `BannerFormSchema.brandEnum`.

**Rationale**: Per spec FR-001/FR-007 and the reference design (`article-category-form.tsx`), a category's linked brand is exactly one of the five `BrandEnum` values (`joyfit`, `joyfit24`, `joyfit_yoga`, `joyfit_plus`, `fit365`) — this is a single `<Select>`, not banner's brand-checkbox multi-select. This also matches 013's own `ArticleCategorySchema.brand_enum`, which is already a single `BrandEnumSchema` value, not an array.

**Alternatives considered**: Multi-brand support like banners (rejected — out of scope per spec; the shipped entity schema from 013 doesn't support it either, so supporting it here would require an unrelated schema migration).

---

## Decision 4 — No confirmation-review dialog, no unsaved-changes discard guard

**Decision**: `ArticleCategoryForm` submits directly on valid `handleSubmit` — no `AlertDialog` review step before the mutation fires, and no `useUnsavedChanges`/discard-confirmation dialog on Cancel or the back link.

**Rationale**: This is an explicit, user-confirmed scope decision recorded in `spec.md`'s Assumptions. The reference design (`article-category-form.tsx`) imports neither `AlertDialog` nor any discard-guard hook — unlike `012-studio-create-edit` and `010-banner-form`, which both have these. The spec's submit-button-label requirement (FR-007: "入力内容を確認する" in both modes) is treated purely as a label convention here, not a signal that a review step exists.

**Alternatives considered**: Adding the review dialog anyway for consistency with sibling forms (rejected — would contradict both the reference design and the user's explicit spec revision).

---

## Decision 5 — Route-level 403 gating requires zero new permission/routing code

**Decision**: No changes to `src/constants/permission.constants.ts`, `src/types/permission.type.ts`, `src/proxy.ts`, or `src/lib/routes/routes.config.ts`.

**Rationale**: Traced the existing mechanism end-to-end:

1. `PAGE_PERMISSIONS` (already set by 013) maps `/article-categories/create` → `Permission.ArticleCategoriesCreate` and `/article-categories/:id/edit` → `Permission.ArticleCategoriesEdit`.
2. `ROLE_PERMISSIONS` (already set by 013) grants `ArticleCategoriesCreate`/`ArticleCategoriesEdit` only to `UserRole.Headquarter` (Manager/Staff/Observer/Trainer get only `ArticleCategoriesView`; `System` implicitly holds every permission per its own role block).
3. `src/proxy.ts` runs on every request matching a registered route pattern, calls `canRoleAccessPage(role, pattern)`, and redirects to `/403` (`NextResponse.redirect(new URL(navigate('/403'), request.url))`) whenever the caller's role lacks the required permission.

This is exactly FR-004/US3's required behavior, and it already runs today against these two exact route patterns — replacing the placeholder pages with the real form does not change or bypass it.

**Rationale for keeping `RoleGatedButton` anyway**: The reference design still wraps the submit button in `RoleGatedButton allowedRoles={["Headquarter", "System"]}`. Since only Headquarter/System can ever load the page (per the above), this is inert defence-in-depth rather than the primary gate — kept for parity with the design and consistency with 013's list screen, not because it does load-bearing access control here.

**Alternatives considered**: Adding a redundant client-side redirect-on-mount check (rejected — the route-level `proxy.ts` guard already runs before any React code executes, so a client-side check would be dead code that never fires).

---

## Decision 6 — New endpoints: `POST /crm/article-categories`, `GET /crm/article-categories/{id}`, `PATCH /crm/article-categories/{id}`

**Decision**: Add one new route (`POST`) to the existing `route.ts`, and two new methods (`GET`, `PATCH`) to the existing `[id]/route.ts` (which currently only has `DELETE`).

**Rationale**: The edit page needs a single-item fetch to pre-fill the form (mirrors `GET /crm/banners/{id}` powering `banners/[id]/edit/page.tsx`); create and edit need their own mutations (mirrors `POST /crm/banners` / `PATCH /crm/banners/{id}`). Request bodies follow the `Create*/Update*BodySchema` naming already used by `banner.schema.ts` — but, per explicit user direction, responses deviate from `banner.schema.ts`'s `{ message, banner }` wrapper: `POST`, `GET`-by-id, and `PATCH` all return `ArticleCategoryItemResponseSchema` directly (the same shape the list endpoint already returns per item), with no `message` field and no extra nesting. No `Create*/Update*/GetArticleCategoryResponseSchema` are defined.

**ID generation**: New category IDs follow the existing `CAT-###` numeric-increment pattern already seeded by 013 (`CAT-000` through `CAT-0NN`) — mirrors `banner.table.ts`'s `add()` method (`Math.max(...existingNumericIds) + 1`).

**Alternatives considered**: A single combined `PUT` upsert endpoint (rejected — inconsistent with every other master-data feature in this codebase, which uses distinct `POST` for create and `PATCH` for partial update). A `{ message, category }` wrapper matching `banner.schema.ts` (rejected per explicit user instruction — the response is the category object itself).

---

## Decision 7 — No server-side role/permission enforcement in the new mock route handlers

**Decision**: `POST`/`PATCH` handlers validate the request body against Zod but do not check the caller's role.

**Rationale**: Consistent with 013's own `DELETE` handler (documented in its `contracts/DELETE-article-categories-id.md`: "this endpoint does not check the caller's role or permissions; access control is enforced client-side only") and every other mock Route Handler in this codebase. Enforcement for this feature happens at the route level (Decision 5, `proxy.ts`) before any client code — including any fetch to these endpoints — can run for a disallowed role.

**Alternatives considered**: Adding server-side role checks now to anticipate Phase 2 (rejected — no other mock endpoint in the codebase does this; introducing it only here would be an inconsistent, unrequested abstraction, counter to Principle V).

---

## Decision 8 — Category name uniqueness and display-order uniqueness are not validated

**Decision**: Neither the Zod schema nor the mock route handlers reject a duplicate `name` or a `order` value that collides with another category's.

**Rationale**: Matches `spec.md`'s Assumptions verbatim (no such rule stated in FR-009, and the reference design performs no duplicate check). 013's own list-screen sort behavior already tolerates ties on `order` without requiring uniqueness upstream.

**Alternatives considered**: Adding a uniqueness check server-side "for safety" (rejected — not required by any acceptance scenario or success criterion; would be unrequested scope per Principle V).
