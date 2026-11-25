# Research: Blog List (ブログ一覧)

**Feature**: `specs/blog-list/spec.md` | **Date**: 2026-11-13

Sources read: spec.md (Clarifications Q1–Q6), prototype `fitness-crm-ui/src/pages/blog-list.tsx`@47d60ac, live backend swagger (`/api/v1/admin/notices*`, fetched 2026-11-11), sibling code (`banners`, `article-categories`, `announcements` stub), `current-store.context.tsx`, `use-current-user.ts`, `src/app/api/_lib/auth.ts`, `phase.constants.ts`, `permission.constants.ts`.

---

## R1 — Mock endpoint shape: mirror `/admin/notices`

**Decision**: One mock module `/crm/notices` shared by 告知 and ブログ, selected by `type` (only `type=blog` is served by this feature's UI). Field names, enum values, query names and the `{ items, pagination }` envelope copy the real `GET /api/v1/admin/notices` (`NoticeDto`, `PaginationDto`). Fields / params the real API lacks are added with the same naming style and listed in R9 as backend gaps.

**Rationale**: The customer decided one data module with a type column (QA #136). Mirroring names now makes Phase 2 a client swap plus removal of the gap fields, instead of a remap of every column.

**Alternatives**: `/crm/blogs` (blog-only mock) — rejected: diverges from the real path and would have to be merged later with the announcement mock.

## R2 — Brand / sub-brand representation

**Decision**: Use the real enums verbatim: `brandScope` `company | brand | store`, `brandCode` `Joyfit | Joyfit24 | JoyfitYoga | JoyfitPlus | Fit365`, `subBrandCodes: string[] | null`. Interpretation used by the mock (to confirm with BE, gap **B-08**):

- `brandCode` holds the brand family: `Joyfit` (JOYFIT family) or `Fit365`.
- `subBrandCodes = null` → whole family; otherwise the listed JOYFIT sub-brands only.
- 対象 badge: family label when `subBrandCodes` is null, else the sub-brand label(s) (`SUB_BRAND_LABELS` style, half-width "JOYFIT+" per prototype).

Filter semantics (Clarification Q3): `brandCode=Joyfit` → every row of family Joyfit; a sub-brand value → rows of family Joyfit whose `subBrandCodes` is null or contains it; `Fit365` → family Fit365; 全社 rows never match.

**Rationale**: The real enum mixes family and sub-brand values; the only coherent reading that supports "JOYFIT whole brand" is family + nullable sub-brand list. The app's shared lowercase `BrandEnum` (`joyfit`, …) stays untouched — this feature uses the real PascalCase codes in its own schema.

**Alternatives**: Reuse `BrandEnumSchema` (lowercase) — rejected: Phase 2 would need a value remap on every row and filter.

## R3 — Store identity in Phase 1 (header selector is real-API backed)

**Finding**: The header store selector (`CurrentStoreProvider`) and `/crm/me` already run on the real API, so `currentStoreId` is a real backend store UUID; the mock DB's stores (`store-001`…) never match it. The mock route also cannot see the real caller (real tokens fall back to mock admin `U-001`, `_lib/auth.ts`).

**Decision**:

- Seed a small **notice store directory** (`id`, `name`, `brandEnum`) with 4–6 real dev store UUIDs captured once from the running app (`GET /admin/stores` in the network tab) — at least one JOYFIT, one JOYFIT24, one FIT365 store, plus the home store of the Staff / Observer test accounts. 店舗指定 seed rows target these ids.
- The mock resolves a `storeId` query to its brand through that directory and applies the "reaches store X" rule (FR-014): `company` rows + `brand` rows of X's family/sub-brand + `store` rows targeting X. An unknown `storeId` still returns `company` rows and any `store` rows naming it.
- Store names on rows come from the directory (`targetStores: { id, name }[]`, gap **B-03**).
- The 店舗 filter's options use the real store master the header already uses (same as equipment / lockers screens).

**Rationale**: Keeps the query contract identical to the real API (`storeId` only, no mock-only brand param) and makes FR-014 / Q4 testable in Phase 1. If dev data is reset, rows degrade gracefully (store rows stop matching) instead of breaking.

**Alternatives**: (a) seed mock store ids — rejected: never match the header; (b) send the store's brand as an extra query param — rejected: a mock-only seam the real API doesn't need.

## R4 — Data scope per role

**Decision**: Scope is driven by the header store selector, not by server-side role checks in the mock:

- Staff / Observer: the selector is locked to their home store → the list sends `storeId` = home store → only articles reaching it (FR-014).
- System / Headquarter: may pick 全店舗 → no `storeId` → every article; picking a store narrows by the same rule.
- Manager: the existing selector does not offer 全店舗 to Managers (B-01 rule in `current-store.context.tsx`); a Manager views one managed store at a time and switches stores to see others. Same rule as `019-member-list`; spec FR-014 / US1-AC1 updated accordingly (analyze C1).

**Rationale**: The mock cannot identify real callers; the header already encodes the role's reach. The real API is expected to enforce scope from the token in Phase 2.

## R5 — "Own article" check (Clarification Q6)

**Decision**: Row `createdBy` (staff UUID, as in the real DTO) is compared with `useCurrentUser().staffId`. Staff + not author → 編集 / 公開にする / 非公開にする disabled with marker 「他者作成」. Mechanism follows the own-record pattern of `lesson-schedules/[id]/reservations/_utils/session-scope.util.ts` (`scopedManageRoles`): when the row is not the user's own, Staff is dropped from `allowedRoles`, so `RoleGatedMenuItem` takes its own denied path and renders the badge; `denyBadge` is 「他者作成」 for a Staff user and the default for other roles. (`RoleGatedMenuItem` shows the badge only on a role/permission denial, not on an external `disabled` — analyze I1.) Seed rows set `createdBy` to the dev staff ids of the test accounts (captured with R3) so both branches are testable.

## R6 — Deleted articles and restore

**Finding**: Real `DELETE /admin/notices/{id}` is a soft delete (Manager+, `E-NTC-005`), but the list excludes deleted rows, `publishStatus` has no deleted value and there is no restore endpoint.

**Decision**: Mock row adds `deletedAt: string | null` (gap **B-05**). Default list includes deleted rows (prototype behaviour); `publishStatus=deleted` (extra query value, gap **B-05**) returns only deleted rows, any other `publishStatus` excludes them. `POST /crm/notices/{id}/restore` (gap **B-06**) clears `deletedAt` and sets `publishStatus=unpublished`. `DELETE` returns 204 as the real API.

## R7 — WordPress sync on list rows (Clarification Q1)

**Decision**: Mock row adds `wordpressSync: { status: 'pending' | 'success' | 'failed'; syncedAt: string | null } | null`, a subset of the real detail's `wordpressSync` (gap **B-04**). UI decides "sync target" itself (`channelWeb && publishStatus in [published, unpublished] && !deletedAt`); non-targets show "—".

## R8 — Sort, paging, article number

**Decision**:

- `page` / `limit` (25/50/100, default 50): the real API returns `PaginationDto` and clamps `limit` 1–100 but declares no params (gap **B-07**, likely just undocumented).
- `sort` ∈ `articleNo | title | brandScope | target | publishStartAt | status`, `order` asc/desc, default `articleNo desc` (gap **B-07**).
- `articleNo` `BL-YYYY-NNNN` (`NT-` for notices) assigned at creation (gap **B-02**).

## R9 — API-vs-spec gap table (hand-off to backend)

| ID   | Need (spec ref)                                                | Real API today                                   | Mock (Phase 1)                                                                            |
| ---- | -------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| B-01 | 配信範囲 / 掲載先 filters (FR-010)                             | not supported                                    | `brandScope`, `channel=web\|app` query params                                             |
| B-02 | Article number `BL-YYYY-NNNN` (FR-003)                         | only UUID `id`                                   | `articleNo` field                                                                         |
| B-03 | Store names under 店舗指定 (FR-004)                            | list omits `targetStoreIds`; detail has ids only | `targetStores: {id,name}[]`                                                               |
| B-04 | WP sync state on list rows (FR-007)                            | detail only (`wordpressSync`)                    | `wordpressSync {status, syncedAt}` on rows                                                |
| B-05 | Deleted rows listed + 削除済み filter (FR-010, FR-020)         | soft-deleted rows excluded; no status value      | `deletedAt` field, `publishStatus=deleted`                                                |
| B-06 | Restore (FR-021)                                               | no endpoint                                      | `POST /crm/notices/{id}/restore`                                                          |
| B-07 | Sort + paging params (FR-012, FR-013)                          | none declared (pagination returned)              | `sort`, `order`, `page`, `limit`                                                          |
| B-08 | Brand vs sub-brand filter semantics (FR-010, Q3)               | `brandCode` only, semantics undocumented         | family + nullable `subBrandCodes`, rule in R2                                             |
| B-09 | 未分類 filter (FR-010)                                         | `categoryId` only                                | `categoryId=none` sentinel                                                                |
| B-10 | Category master link uses notice categories (FR-018)           | `/admin/notice-categories` exists                | existing mock `/crm/article-categories?type=blog`                                         |
| B-11 | Scoped total for header count / filter banner (FR-008, FR-011) | not returned                                     | `totalAllItems` next to `pagination` (project list convention, e.g. `article-categories`) |

Supported as-is (mirrored): `q`, `publishFrom`, `publishTo`, `publishStatus` (4 values), `storeId` (reaches-store rule), `brandCode`, `categoryId`, `type`; `PATCH …/publish-status`; `DELETE` (204, Manager+).

## R10 — Phase 2 gating and routes

**Finding**: I-02 screens (`/announcements`, `/banners`, `/article-categories`) are listed in `PHASE2_ROUTE_PREFIXES`, so the sidebar hides them and the proxy redirects direct URLs to `/todo`. `routes.config.ts` is generated by `npm run generate-routes` (runs on `dev` / `build`).

**Decision**: New routes `/blogs`, `/blogs/[id]`, `/blogs/create`, `/blogs/[id]/edit` (page files → regenerated config). `/blogs` is added to `PHASE2_ROUTE_PREFIXES` next to its I-02 siblings, and a 「ブログ管理」 entry is added to the コンテンツ sidebar group (hidden while Phase 2). Local verification temporarily removes the prefix (do not commit that change) — see quickstart.

**Alternatives**: Leave `/blogs` ungated — rejected: would expose one I-02 screen while its siblings stay hidden, contradicting scope 2026-10-23.

## R11 — Permissions

**Decision**: New `Permission` values `BlogsView / BlogsCreate / BlogsEdit / BlogsPublish / BlogsDelete / BlogsRestore` with page mapping (`/blogs` → View, `/blogs/create` → Create, `/blogs/:id/edit` → Edit, `/blogs/:id` → View), role grants per spec (View: System, Headquarter, Manager, Staff, Observer; Create / Edit / Publish: + no Observer; Delete / Restore: System, Headquarter, Manager), and position flags as banners (`canViewContent` for View, `canManageContent` for the rest). UI gates via `RoleGatedButton` / `RoleGatedMenuItem`; the Staff own-article rule is layered on top (R5). カテゴリマスタを編集 uses `allowedRoles` Headquarter / System (FR-018).
