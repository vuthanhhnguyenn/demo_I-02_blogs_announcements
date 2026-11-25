# 権限 / Permissions

How the CRM decides what a signed-in staff member may see and do, now that the
answer comes from the backend instead of a hard-coded table.

## The four layers

```
GET /crm/me                     ← the authority. role + scope + 51 position flags
  │                               (flags are read fresh per call and are
  │                                deliberately NOT JWT claims)
  ▼
src/lib/auth/current-user.mapper.ts     ← the only place the DTO is read
  │  toAuthUser(dto): AuthUser            wire values in, FE model out
  ▼
src/types/permission.type.ts            ← the FE model
  │  UserRole            enum keys ours, VALUES are the API's ('system', …)
  │  StaffPermissionFlag the 58 backend flag names, verbatim
  │  Permission          the app's own fine-grained vocabulary (~180 entries)
  │  AuthUser            what every screen consumes
  ▼
src/utils/permission.util.ts            ← evaluation
     evaluatePermission(user, permission)
       = ROLE_PERMISSIONS[role] includes it        (role tier, static)
       AND PERMISSION_FLAG_RULES[permission]       (position grant, from /crm/me)
```

`src/contexts/auth-user.context.tsx` exposes the result to React; nothing else
should call the evaluator directly.

## Why two layers instead of just the backend flags

The backend has 58 coarse flags; the UI needs ~180 decisions (a "view" and a
"delete" on the same screen are different buttons). So:

- **Role tier** (`ROLE_PERMISSIONS`) is the ceiling from each feature's
  権限マトリクス. It is static because a role's ceiling is a product decision, and
  the backend enforces the same tiers itself — endpoint docs read
  "**system / headquarter / manager**".
- **Position grant** (`PERMISSION_FLAG_RULES`) is the part that is _not_
  hard-coded. Editing a 職位 in the position master changes what the UI offers on
  the next `/crm/me` fetch, with no deploy.

Both must allow an action. A `Permission` with no entry in
`PERMISSION_FLAG_RULES` has no backend flag behind it (brand master, banner
ordering, app versions — the flag catalogue has no equivalent) and stays governed
by the role tier alone.

`system` skips the flag layer (`FLAG_EXEMPT_ROLES`): it is the role that
maintains the position master, so gating it on a position's flags could lock the
only account that can fix a bad position out of the screen that fixes it.

## Using it

```tsx
const { user, hasPermission, checkPermission, hasRole, hasFlag, canAccessPage } = useAuthUser();

// Action gates — prefer the components, they handle the denied state for you
<RoleGatedButton requiredPermission={Permission.StaffsInvite}>招待</RoleGatedButton>
<RoleGatedMenuItem requiredPermission={Permission.StaffsDelete}>削除</RoleGatedMenuItem>

// Custom UI that needs the denial reason ('role' vs 'position')
const verdict = checkPermission(Permission.SalesConfirm);

// Escape hatch when no Permission maps cleanly to what you need
if (hasFlag('canEditAfterBillingConfirmed')) { … }
```

**Deny copy differs by reason.** A `role` denial is fixed for the account
("本部権限が必要です"); a `position` denial is something an administrator can
change ("この操作は職位に許可されていません"). `RoleGatedButton`,
`RoleGatedMenuItem` and the sidebar all pick their wording from the verdict, so
don't hard-code `denyTooltip` / `denyBadge` unless the screen needs something
more specific.

**Gates deny while loading.** `isLoading` is true until `/crm/me` resolves; every
helper returns "denied" during that window. Render a skeleton, not a disabled
button, if the difference is visible. For a **Manager** it stays true one request
longer — see "Manager store scope" below.

## Manager store scope

A Manager's scope is the set of stores they manage (`staff_stores`), **not** their
home store (`storeId`). The two are independent: the home store is where the staff
record is filed and need not be one of the managed stores (the dev Manager account
is filed under a closed store and manages a different one). The server filters by
`staff_stores`, and an explicit `storeId` outside it answers `400 E-VAL-001`
(`storeId is outside the caller store scope`).

`GET /auth/crm/me` carries only the home store, so `useCurrentUser`
(`src/hooks/use-current-user.ts`) fetches `managedStoreIds` from
`GET /admin/staff/{staffId}` (API-082 §2 #3) for the Manager role and merges it into
`AuthUser.managedStoreIds`. `isLoading` stays true until that call settles, so nothing
scopes itself to the home store in the meantime. If the call fails the array stays
empty (the previous behaviour) and no error toast is raised.

- `CurrentStoreProvider` derives the header store from `managedStoreIds`. A Manager
  cannot pick 全店舗; the header offers only the managed stores, and the current one
  is what screens send as `storeId`.
- A screen that sends the current store must wait for `useCurrentStore().isLoading`
  (see `useMembersFilters.isStoreScopeLoading`), or its first request can carry a
  fallback store and fail with 400.
- Ask for BE: return `managedStoreIds` from `/auth/crm/me` so the extra request can go.

## Page-level access

`PAGE_PERMISSIONS` maps a route pattern to the `Permission` needed to open it.
Two consumers read it, and they must agree:

- `PagePermissionGuard` (`src/app/(private)/layout.tsx`) — redirects to `/403`.
- `AppSidebar` — greys out the menu entry with a matching tooltip.

Both call `evaluatePageAccess`, so a link is never offered for a page that would
immediately bounce.

**The edge middleware (`src/proxy.ts`) does not check permissions.** It cannot:
the flags are not in the JWT. It only redirects on session presence
(private page + no cookie → `/login`, public-only page + cookie → `/`). Any
role-based gate there would contradict the real one.

None of this is a security boundary — the backend authorizes every request. The
FE gates exist so a screen isn't rendered only to fill up with 403s.

## Changing things

| I want to…                              | Edit                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| add a permission for new UI             | `Permission` in `permission.type.ts`, then `ROLE_PERMISSIONS`, then `PERMISSION_FLAG_RULES` if a backend flag governs it                 |
| gate a new page                         | `PAGE_PERMISSIONS`                                                                                                                       |
| react to a schema change                | the flag list in `permission.type.ts` — `STAFF_PERMISSION_FLAGS_MATCH_API` in the mapper fails to compile until it matches `PositionDto` |
| refresh permissions after a 職位 change | `useAuthUser().refetch()`                                                                                                                |

Entries in `PERMISSION_FLAG_RULES` marked `// ~` were inferred from the flag's
Japanese label rather than from an explicit mapping in the API contract. Verify
those against the position master before relying on them for a release.

## Schema drift

The committed `openapi.real.json` lags the running API: it declares 51 flags on
`PositionDto`, the live `/crm/me` sends 58 (verified 2026-08-26 — the extra seven
are the per-section 店舗設定 flags and the CSV出力 category). Two guards cover this:

- **Compile time** — `STAFF_PERMISSION_FLAGS_MATCH_API` diffs our list against
  `PositionDto`, with the known gap listed explicitly in `FlagsAheadOfSchema`.
  Trim that union as `npm run generate-api-real` catches up.
- **Runtime** — `findUnknownPermissionFlags` logs any flag the live API sends that
  this build has no name for. `useCurrentUser` prints it in development; that is
  how the seven missing flags were found. **An unknown flag is ignored by every
  gate**, so treat that warning as a task, not noise.
