# Quickstart: Y-14 Domain Master Management

**Branch**: `030-domain-management` | **Route**: `/domains` | **Phase**: 1 (mock API — no real backend)

No automated tests exist in this project (Constitution "No Testing Policy"). This doc is both the build order for `/speckit.tasks` to follow and a manual verification checklist.

**2026-09-09 update — this is a delta build, and verification is user-executed this round**: Steps 1-5 and 7 below (schemas, mock seed/table, route handlers, client generation, permissions, sidebar) are **already done** — see `plan.md`'s Summary. Only Step 6 (page/components) has outstanding work, scoped to un-hiding the commented-out 認証方式 UI and adding the new read-only detail Sheet (see `plan.md`'s Project Structure section for the exact file-by-file delta). Also, the app's login now goes through real AWS Cognito / Google SSO instead of the mock-credential flow this checklist was originally written against — an agent cannot complete that login non-interactively, so **the Manual Verification section below is for the user to run themselves** after implementation, not a step the implementer executes live. The implementer should instead confirm correctness by re-reading the built components against `checklists/parity.md` and the acceptance scenarios in `spec.md`.

---

## Implementation Order

> Steps 1-5 and 7 are historical build order, kept for reference — **already implemented and unchanged this round**. Only Step 6 has outstanding work; see its rewritten content below and `plan.md`'s Project Structure for the exact per-file delta.

### Step 1 — Zod schemas _(already done)_

**File**: `src/app/api/_schemas/domain.schema.ts`

`DomainAuthMethodSchema` (`data-model.md` §1), `DomainSchema` (§2), `DomainListItemSchema`/`DomainDetailSchema`/`DomainLinkedStaffSummarySchema` (§3–5), `GetDomainsQueryParamsSchema` (§6), `GetDomainsResponseSchema` (§7), `CreateDomainBodySchema`/`UpdateDomainBodySchema` (§8), `DeleteDomainResponseSchema` (§9). All types `z.infer<>`'d directly from this file, no separate hand-written type file (matches the `article-categories` precedent).

### Step 2 — Mock seed data _(already done)_

**Files**: `src/app/api/_mock-db/seeds/domain.seed.ts`, `src/app/api/_mock-db/tables/domain.table.ts`, wired into `_create-db.ts`

Seed at least the 4 rows from the V0 mockup's `INITIAL_DOMAINS` (`D-001`…`D-004`), each with a plausible `auth_provider`, `created_by`, `created_at`. Align the existing `staffs` seed so:

- At least one domain has 0 linked staff (delete succeeds).
- At least one domain has ≥2 linked staff whose `email` genuinely ends in that domain (delete blocked, detail view shows a real `linkedStaff` list).
- No two seeded domains share a `domain` value (case-insensitively) — the uniqueness rule must never be seed-violated.

`domain.table.ts` follows the `article-category.table.ts` factory pattern but takes a lazy `getDb: () => DbType` accessor (like `positions`/`staffs`) so it can query `db.staffs` for `staffCount`/`linkedStaff` without a circular import at module-load time. Exports `createDomainTables(getDb)` returning `{ domains: { getList, getById, create, update, delete, computeStaffLinkage(domain) } }`.

### Step 3 — Route Handlers _(already done)_

- `src/app/api/crm/domains/route.ts` — `GET` (contracts/get-domains.md), `POST` (contracts/create-domain.md)
- `src/app/api/crm/domains/[id]/route.ts` — `GET` (contracts/get-domain-detail.md), `PATCH` (contracts/update-domain.md), `DELETE` (contracts/delete-domain.md)

### Step 4 — Generate the API client _(already done — no regeneration needed this round, no schema change)_

```bash
npm run generate-openapi
npm run generate-api
```

Produces `getCrmDomainsOptions` / `getCrmDomainsQueryKey`, `postCrmDomainsMutation`, `getCrmDomainsByIdOptions`, `patchCrmDomainsByIdMutation`, `deleteCrmDomainsByIdMutation` in `src/lib/api/@tanstack/react-query.gen.ts`, plus `DomainAuthMethod`, `DomainListItem`, `DomainDetail`, etc. in `types.gen.ts`. Do not hand-edit generated files — fix the Zod schema and regenerate both steps if a shape is wrong.

### Step 5 — Permissions _(already done)_

**Files**: `src/types/permission.type.ts`, `src/constants/permission.constants.ts`

Add `Permission.DomainsView/Create/Edit/Delete`. `PAGE_PERMISSIONS['/domains'] = Permission.DomainsView`. `ROLE_PERMISSIONS[Headquarter]` gains all four; every other role gains none (System already has everything implicitly) — matches spec.md's 権限マトリクス exactly.

### Step 6 — Page and components _(outstanding work — this round's scope)_

The route, page shell, and most components already exist and are correct. The remaining work is: un-hide already-written 認証方式 UI that was commented out pending `qa-authprovider.md`, fix delete-dialog copy/behavior, and add one new component. No `npm run generate-routes` re-run needed (route already registered).

- `_components/domain-table-columns.tsx` — un-comment the 認証方式 Badge column (`DOMAIN_AUTH_METHOD_LABELS` already imported and ready in the commented block). No change to スタッフ数 or the actions column.
- `_components/domain-form-dialog.tsx` — un-comment the 認証方式 Select field and drop the `DEFAULT_AUTH_PROVIDER` fallback (the schema already requires a value, so the fallback was only there to keep the hidden field passing validation). Restore the auth-change confirmation `AlertDialog` (re-add `pendingValues` state), rewriting its copy to match V0 exactly: domain name + domain string, old → new method, and the affected `linkedStaff`/`staffCount` already available from the edit-mode detail query (no new fetch). Remove the 作成者/作成日時/紐づくスタッフ一覧 block folded into this dialog — it moves to the new Sheet below.
- `_components/domain-delete-dialog.tsx` — fix the description copy to V0's current wording; replace the plain destructive-text paragraph with a proper warning `Alert` (`AlertTriangle` icon); disable the "削除する" button proactively from the passed row's own `staffCount` (already available on `DomainListItem` — no need to wait for a 409), keeping the existing `blockedStaffCount`/409 handling as a race-condition fallback per spec.md's Edge Cases.
- `_components/domain-detail-sheet.tsx` **(new)** — read-only `Sheet`, opened by row click, reusing the same `getCrmDomainsByIdOptions` query the edit dialog already uses. Renders ID/管理名/ドメイン/認証方式/スタッフ数/作成者/作成日時, then 紐づくスタッフ一覧 (name, id, status badge), then a footer with 削除 (opens the existing delete dialog for this row) and 編集 (opens the existing form dialog in edit mode for this row).
- `page.tsx` — un-comment the 認証方式 `Select` filter block and wire it to `useDomainFilters()`'s already-implemented `authProvider`/`setAuthProvider` (no hook change needed). Add `detailTargetId` state and pass `onRowClick` to `DataTable` to open the new Sheet; wire the Sheet's 編集/削除 buttons into the existing `setFormState`/`setDeleteState` handlers (reuse, don't duplicate).
- `_hooks/use-domain-filters.ts` — **no change**, `authProvider`/`setAuthProvider` are already implemented and returned; `page.tsx` was simply not consuming them.

### Step 7 — Sidebar navigation _(already done)_

**File**: `src/components/layout/app-sidebar.tsx`

Add `{ label: 'ドメイン管理', href: '/domains', group: '組織・店舗' }` to the existing システム設定 section's sub-items (alongside スタッフ管理/職位マスター管理/店舗管理/FC企業管理/ブランド管理).

### Step 8 — Type check + lint

```bash
npm run type-check   # must exit 0
npm run lint         # must exit 0
```

---

## Manual Verification (user-executed this round — see 2026-09-09 note above)

1. **View & search (US1)**: As Headquarter, open `/domains` → seeded rows show ID/管理名/ドメイン/認証方式 badge/スタッフ数. Search a partial name/domain → list filters, `FilterResultBanner` shows filtered vs total, clear works. Filter by 認証方式 → only matching rows remain, and the select shows an active-filter highlight. Clear all filters, then as Manager/Staff/Trainer/Observer, confirm `/domains` is unreachable (redirected, no sidebar entry).
2. **Register (US2)**: "ドメインを追加" → fill 管理名/ドメイン/認証方式 → save button stays disabled until all three are filled → save → new row appears with a fresh `D-0xx` id and `staffCount: 0`. Retry with a domain that already exists (any case) → inline duplicate error, dialog stays open. Try `foo@bar.com` as the domain value → validation blocks save until only `bar.com`-style input is given.
3. **Detail view + edit + linked staff (US3)**: Click a row with ≥1 linked staff → the read-only Sheet opens, showing ID/管理名/ドメイン/認証方式/スタッフ数/作成者/作成日時 and the 紐づくスタッフ一覧 with each staff's status badge. From the Sheet, click 編集 → the edit Dialog opens with only 管理名/ドメイン/認証方式 (no read-only block duplicated here). Change 認証方式 → confirmation dialog appears naming the domain, the old→new method, and the exact linked-staff count, stating the change applies from next login → confirm → save succeeds. Edit a different domain's `domain` value to collide with an existing one → 409 duplicate error surfaces the same as create.
4. **Delete guard (US4)**: From the row menu or the Sheet, attempt delete on the 0-staff seeded domain → confirmation names both 管理名 and ドメイン → confirm → row removed (and the Sheet closes if it was open for that row). Attempt delete on a domain with linked staff → a warning Alert states the exact staff count and directs the user to Staff Management first; the 削除する button itself is disabled with that reason (not just the row-menu item) — this should hold _before_ any submit attempt, not only after a 409.
5. **Phase-2 exclusion (FR-015 / research R5)**: Confirm no 状態 column, no 有効/無効 Badge, and no 無効化する/有効化する menu item appear anywhere on `/domains` — this is deliberately absent, not a bug.
6. **Role gating regression**: As System, confirm every action above works identically to Headquarter.

## Phase 2 Migration Checklist (future)

- [ ] Confirm the real backend's domain endpoints match this contract set, or update schemas + regenerate.
- [ ] Remove mock Route Handlers under `src/app/api/crm/domains/` and mock table/seed files.
- [ ] Wire Y-13's real login-routing to actually consult this master (currently unimplemented on the Y-13 side — research R8).
- [ ] Build FR-015 (enable/disable) as its own follow-up slice, including the Y-13-side "disabled domain blocks login" behavior.
