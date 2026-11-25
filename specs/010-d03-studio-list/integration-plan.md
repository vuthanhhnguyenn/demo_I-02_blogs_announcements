# Real API Integration Plan: D-03 Studio List (スタジオ管理 一覧)

**Branch**: `feat/lesson-studio-integration-api` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/studios/` list screen — `page.tsx`, `_components/studio-list-section.tsx`, `studio-filters.tsx`, `studio-search.tsx`, `_hooks/use-studio-list.ts`, plus the shared `_utils/studio-api.util.ts`
**Target API**: `src/lib/api-real`, regenerated from the dev BFF `/docs-json` once BE !762 is on dev (API-110 v0.7.2 + the additive fields of !757 / !762)
**Sibling plans**: [011 detail](../011-studio-detail-page/integration-plan.md) · [012 create / edit](../012-studio-create-edit/integration-plan.md) — blocker ids are unique across the three plans.

## Guiding principle

**UI first.** Where the real API cannot back a UI element, the element stays and the gap is a
`TODO(round2) Bn` comment at the one place the value is dropped.

Mock routes under `src/app/api/crm/studios/**`, their schemas and the `_mock-db` studio tables are
**left untouched** — the screen simply stops calling them.

## Endpoint mapping

| UI surface                            | Real endpoint                                                                                          | Hook (`@/lib/api-real/@tanstack/react-query.gen`) | Round |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ----- |
| Table rows, 「N件」, paging           | `GET /api/v1/admin/studios?q=&storeId=&studioType=&brand=&isActive=&sort=&order=&page=&limit=50`       | `adminStudioControllerListOptions`                | 1     |
| Columns 店舗名 / ブランド / 利用時間  | same — `storeName`, `brand`, `startTime` / `endTime` on each item                                      | same                                              | 1     |
| Store filter options                  | `GET /api/v1/admin/stores` (already integrated on the store screen)                                    | `adminStoreControllerListOptions`                 | 1     |
| Sort by ID / スタジオ名 / 区分 / 定員 | `sort=createdAt` (ids are UUID v7, so creation order is id order) / `name` / `studioType` / `capacity` | same                                              | 1     |
| Sort by 店舗名                        | — (no store-name sort; stores live in another service)                                                 | —                                                 | 2     |

## Blockers carried into Round 2

| ID     | Blocker                                                                                      | Spec says                                               | Round 1 behaviour (UI kept)                                                                      | Round 2                                                    |
| ------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **B1** | `sort` takes `name` / `createdAt` / `updatedAt` / `studioType` / `capacity` — no store name. | FR-001-03: sortable ID, スタジオ名, 店舗名, 区分, 定員. | 店舗名 renders as a plain (non-sortable) header; `TODO(round2) B1` in `studio-list-section.tsx`. | Add `storeName` to `SORT_KEY_BY_COLUMN`, re-enable header. |

## Decisions

- **D1 — No mapper layer.** Columns consume the generated `StudioListItemDto` directly. Enum
  labels / badge kinds and the FE ↔ API maps live in one file, `_utils/studio-api.util.ts`
  (shared by 011 / 012): studio type `studio-lesson | pt | body-care` ↔ `studio | personal_training |
body_care`, the five API brands (`Joyfit` … `Fit365`) ↔ the `BrandBadge` keys, status ↔ `isActive`.
- **D2 — URL state stays as is.** `use-studio-list.ts` keeps its `nuqs` keys (`search`, `store_id`,
  `studio_type`, `brand`, `status`, `sort_by`, `sort_order`, `page`); a single
  `toStudioListQuery(params)` in the util turns them into the API query (`q`, `storeId`,
  `studioType`, `brand`, `isActive`, `sort`, `order`, `page`, `limit`).
- **D3 — ID column.** The API id is a UUID: shown truncated with a tooltip (`TextWithTooltip`,
  as the lesson list does). Sorting by ID sends `sort=createdAt`.
- **D4 — Counts and paging.** 「N件」 = `pagination.totalItems`; pages from `pagination.totalPages`;
  page size stays 50 (≤ the API's `limit` max 100).
- **D5 — Scope is the server's.** The API already narrows the list to the caller's stores
  (manager `staff_stores`, staff / observer OwnStores, trainer own store). The store filter only
  offers what `GET /admin/stores` returns; picking a store outside the scope cannot happen from
  the UI (the API would answer 403 E-STD-100).
- **D6 — Search.** `q` = studio name, partial match (FR-001-04; the API also searches name only).

## Round 1 tasks

### Phase A — foundations (shared with 011 / 012)

- **T001** `src/lib/openapi.real.json` + `src/lib/api-real/**` — refresh from the dev BFF `/docs-json`
  after BE !762 is deployed; `npm run generate-api:real`. Separate commit
  `chore: refresh real API spec and generated client`.
- **T002** `_utils/studio-api.util.ts` _(new)_ — enum maps and labels (D1), `toStudioListQuery`
  (D2), `formatHours(startTime, endTime)` → `HH:mm–HH:mm`, `STUDIO_ERROR_CODE`,
  `invalidateStudioQueries(queryClient, id?)`.

### Phase B — list screen

- **T003** `_hooks/use-studio-list.ts` — sort keys `id | name | studio_type | capacity`
  (`store_name` kept but mapped to nothing, **B1**).
- **T004** `_components/studio-list-section.tsx` — real list query (D2), columns on
  `StudioListItemDto` (D3), `pagination` (D4), **B1** header.
- **T005** `[P]` `_components/studio-filters.tsx` — store options from the real store list; brand
  options = the five API brands; status → `isActive`.

### Phase D — verification

- **T006** `npm run type-check` + `npm run lint` + `npx prettier --check ./src`.
- **T007** Live smoke against dev: search → each filter → sort per column → paging → row → detail;
  one non-HQ account if available.
- **T008** Record the result below.

## Round 2 backlog

- **R201** API sorts by store name (**B1**) → map `store_name` in `SORT_KEY_BY_COLUMN`, re-enable
  the header.

## Open / Resolved questions

- None for the list. (The ID column change is a type change, not a spec question.)

## Round 1 result (2026-10-14)

**Status: shipped in this branch; static gates green; live smoke run on dev.**

| Task      | File(s)                                                               | Notes                                                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T001      | `openapi.real.json`, `api-real/**`                                    | Regenerated from dev (714 paths). API-100 v0.14.2 dropped `locationCaption` from the locker list item; the store map used it only as a fallback after `locationName`, so the fallback is removed (2 lines). |
| T002      | `_utils/studio-api.util.ts`                                           | As planned; the detail / form helpers live in `studio-detail.util.ts` / `studio-form.util.ts` (011 / 012).                                                                                                  |
| T003–T005 | `use-studio-list.ts`, `studio-list-section.tsx`, `studio-filters.tsx` | As planned, plus D5: the header store narrows the list when it is not 全店舗; a `store_id` from the URL reads the store name by id.                                                                         |

### Verification

- **T006** — `npm run type-check` 0 errors; `npm run lint` clean; `npx prettier --check ./src` flags only
  `src/lib/utils.ts` (unchanged, already so on `dev`); `npm run build` OK.
- **T007** (dev, system account, 全店舗): 5 studios with store name / brand / hours; sort 定員 desc;
  brand Fit365 → 1; search 「QA」 → 1; status 無効 → 0 (empty state).
- Not exercised: paging (5 rows < 50), the store-picker UI itself, a non-HQ account.
