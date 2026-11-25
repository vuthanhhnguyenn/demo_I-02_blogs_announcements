# Real API Integration Plan: D-02 Lesson Content List (レッスン内容管理 一覧)

**Branch**: `feat/lesson-master-integration-api` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/lessons/` list screen — `_components/lessons-page-content.tsx`, `lesson-table*.tsx`, `personal-*.tsx`, `lessons-filter-bar.tsx`, `_hooks/use-lessons-filters.ts`, plus the shared `_utils/lesson-api.util.ts`
**Target API**: `src/lib/api-real` (regenerated from the dev BFF `/docs-json`, 2026-10-08, API-111 v0.6)
**Sibling plans**: [008 detail](../008-lesson-content-detail/integration-plan.md) · [009 form](../009-lesson-content-form/integration-plan.md) — blocker ids are unique across the three plans (B1–B4).

## Guiding principle

**UI first.** Where the real API cannot back a UI element, the element stays and the gap is a
`TODO(round2) Bn` comment at the one place the value is dropped. Elements are removed only when the
spec says so (Clarifications 2026-10-08 — see Resolved questions).

Mock routes under `src/app/api/crm/lesson-contents/**`, their schemas and the `_mock-db` lesson
tables are **left untouched** — the screen simply stops calling them.

## Endpoint mapping

| UI surface                                        | Real endpoint                                                                                    | Hook (`@/lib/api-real/@tanstack/react-query.gen`) | Round |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ----- |
| Studio / Personal / Body care tables              | `GET /api/v1/admin/lessons?lessonType=&brand=&feeType=&isActive=&q=&sort=&order=&page=&limit=25` | `adminLessonControllerListOptions`                | 1     |
| Tab count badges + header 「N件」                 | same, `limit=1` per tab → `pagination.totalItems`                                                | same, one query per tab                           | 1     |
| Brand scope of the header store                   | `GET /api/v1/admin/stores/{id}` → `brandEnum`                                                    | `adminStoreControllerDetailOptions`               | 1     |
| Sort by ID / brand / 料金種別 / status / 性別制限 | — (API sorts by name / createdAt / updatedAt / durationMinutes only)                             | —                                                 | 2     |

## Blockers carried into Round 2

| ID     | Blocker                                                                                                                                     | Round 1 behaviour (UI kept)                                                                                           | Round 2 (after API fix)                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **B2** | `sort` accepts `name` / `createdAt` / `updatedAt` / `durationMinutes` only (FR-001-P1-12 asks for column sorting).                          | レッスン名 / プラン名 and 所要時間 headers sort server-side; the other headers render as plain (non-sortable) labels. | Extend `SORT_BY_COLUMN` in `use-lessons-filters.ts` and re-enable those headers. |
| **B1** | (owned by [009](../009-lesson-content-form/integration-plan.md)) No tax rate on the API — the PT tab's 料金 column converts at a fixed 10%. | `feeToTaxIncluded(fee)` (floor) in `personal-table-columns.tsx`.                                                      | See 009 R201.                                                                    |

## Decisions

- **D1 — No mapper layer.** Columns consume `LessonListItemDto` directly; labels / badge classes for
  the API enums live in `_utils/lesson-api.util.ts` (brand ×5, feeType, genderRestriction), shared
  with the detail and form screens.
- **D2 — Brand scope from the header store.** The list sends `brand` = the brand filter, else the
  `brandEnum` of the store picked in the header (a `storeId` would hide the brand-wide masters);
  全店舗 sends no brand. Lists wait for that store read (`isScopeReady`) so they never flash every
  brand first. The API additionally narrows to the caller's brand group (API-111 v0.6).
- **D3 — Counts.** Each tab badge is its own `limit: 1` query scoped only by brand (not by the
  detailed filters), read from `pagination.totalItems`; the header 「N件」 is their sum. The
  filtered row count comes from the table query's `pagination.totalItems`.
- **D4 — Filters (spec Clarifications 2026-10-08).** Brand (5 values), 料金種別 (`feeType`, new —
  FR-S001 and item 6 of the 2026-08-26 gap ruling) and status (`isActive`). The 区分 / カテゴリ
  axis, the PT プラン区分 column and the 「削除済みも含めて表示」 toggle are removed. With no
  status filter both active and inactive masters are listed; soft-deleted masters never are.
- **D5 — Search.** `q` = name only (FR-001-P1-11, clarified 2026-10-08); placeholders say
  「レッスン名で検索…」 / 「プラン名で検索…」.
- **D6 — Paging.** `LESSONS_PAGE_SIZE` = 25 (≤ the API's `limit` max 100); pages from
  `pagination.totalPages`.

## Round 1 tasks

### Phase A — foundations

- **T001** `_utils/lesson-api.util.ts` _(new)_ — API enum types, tab ↔ `lessonType` maps, brand /
  fee type / gender labels and classes, duration options, tax helpers (**B1**), `LESSON_ERROR_CODE`,
  `invalidateLessonQueries`.
- **T002** `_constants/constants.ts` — drop the category option lists (D4).

### Phase B — list screen

- **T003** `_hooks/use-lessons-filters.ts` — URL state for brand / fee type / status / search /
  sort / page; header-store brand (D2); `lessonListQuery(tab)` / `lessonCountQuery(tab)`.
- **T004** `_components/lessons-page-content.tsx` — tab counts (D3).
- **T005** `[P]` `_components/lesson-table.tsx`, `personal-training-table.tsx` — real list query,
  `pagination` paging, `enabled: isScopeReady`.
- **T006** `[P]` `_components/lesson-table-columns.tsx`, `personal-table-columns.tsx` —
  `LessonListItemDto` columns; PT プラン区分 column removed (D4); **B2** comment.
- **T007** `_components/lessons-filter-bar.tsx` — brand ×5, 料金種別, status; category selects and
  the deleted toggle removed (D4).

### Phase D — verification

- **T008** `npm run type-check` + `npm run lint` + prettier.
- **T009** Live smoke against dev: tabs → search → each filter → sort → paging → row → detail.
- **T010** Record the result below.

## Round 2 backlog

- **R202** API sorts by more keys (**B2**) → add them to `SORT_BY_COLUMN`, re-enable the headers.
- **R201** Tax master (**B1**) — see 009.

## Resolved questions

Cleared in [spec.md](./spec.md) **Clarifications — Session 2026-10-08**:

- **Category axis + 「削除済みも含めて表示」 → removed** per the 2026-08-26 API-111 gap ruling
  (API-111 v0.5 dropped `includeDeleted`). FR-001-P1-02 / -04 / -13 updated. No Round 2 item — the
  API will not bring them back.
- **Brand filter → the 5 API brands** (same set as the form, spec 009 FR-002-P1-05).
- **Search → name only.** FR-001-P1-11 / SC-006 updated.

## Round 1 result (2026-10-08)

**Status: shipped in FE MR !200; static gates green; live smoke run on dev.**

| Task      | File(s)                                                 | Notes                                                                                    |
| --------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| T001–T002 | `_utils/lesson-api.util.ts`, `_constants/constants.ts`  | Foundations shared by 007/008/009; dead category constants removed.                      |
| T003–T007 | filters hook, page content, tables, columns, filter bar | As planned. The 料金種別 filter is new; the category controls / deleted toggle are gone. |

Mock surfaces are untouched.

### Verification

- **T008** — `npm run type-check`: 0 errors outside the 6 pre-existing `contracts/*` errors on
  `origin/dev`; `npm run lint` and prettier clean.
- **T009** (dev, HQ account, 全店舗):
  - Tabs: studio 6 / personal 2 / body care 0, header 8件; counts update after a create.
  - Search 「QA-D01」 → 5 rows (name match).
  - Filters: 料金種別 per_use → 4, free → 1; brand Fit365 → 1; status inactive → 0, then the
    deactivated copy (008 smoke) → 1.
  - Sort: PT tab by 所要時間 desc.
  - PT tab has no プラン区分 column.
  - Not exercised: **paging** (7 studio rows < page size 25) and a **non-HQ role** (only an HQ
    account is available) — left for QA.
