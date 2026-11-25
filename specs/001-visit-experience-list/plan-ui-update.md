# Implementation Plan: Visit/Experience List — UI Sync Update

**Branch**: `feat/update-ui-logic-visit-experient-list` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md) (see "Revision note (2026-08-12)")
**Scope**: Delta only — closes the gap between the current implementation and the spec's 2026-08-12 revision. This is NOT a from-scratch plan; see [plan.md](./plan.md) for the original build plan and project structure (unchanged).

---

## Summary

Most of the spec's UI-sync delta (blacklist filter, store-scoped queue/KPIs/columns, split empty-state variants) is **already implemented** on the current branch. Two small gaps remain to bring the list page into full compliance with `spec.md` FR-007 and FR-008:

1. Two stale status-label strings (pre-260624_v5 PO patch).
2. A leftover duplicate "clear filters" button that FR-007 no longer calls for.

No new entities, API contracts, or data model changes are needed — Phase 0/1 research and data-model artifacts are skipped as not applicable.

---

## Already Implemented (verify only, no code change)

| Spec requirement                                  | Where                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-004 blacklist-match filter (全件/要注意者のみ) | `_constants/constants.ts` (`BL_MATCH_OPTIONS`), `_components/visit-experience-filters.tsx`, `_components/visit-experience-list-section.tsx`, `_schemas/visit-experience.schema.ts`, `crm/visit-experiences/route.ts`                      |
| FR-019 store-scoped queue/KPI/columns             | `crm/visit-experiences/route.ts` + `summary/route.ts` (`getAllowedStoreIds`), `visit-experience-list-section.tsx` (`showStoreColumn` via `useCurrentStore().canSelectAllStores`), `visit-experience-filters.tsx` (`showStoreFilter` prop) |
| FR-011 empty-state split (filtered vs. no-data)   | `visit-experience-list-section.tsx:211-227` — `hasActiveFilters` ternary already renders "条件をクリア" only for the filtered case                                                                                                        |

## Remaining Work

1. **Status label rename (FR-008)**
   - File: `src/types/api/visit-experience.type.ts`
   - Change `VISIT_EXPERIENCE_STATUS_LABELS`: `info_missing: '確認待ち'` → `'申請者への確認待ち'`; `bl_checking: 'BL照合中'` → `'BL照合結果あり・確認待ち'`.
   - This single map feeds both the status filter dropdown (`STATUS_OPTIONS` in `_constants/constants.ts`, derived from the map) and the table's status badge (`visit-experience-list-section.tsx:245`) — no other list-page file needs editing.
   - Enum values (`info_missing`, `bl_checking`) stay unchanged; only display text changes.

2. **Single clear-all affordance (FR-007)**
   - File: `src/app/(private)/visit-experiences/_components/visit-experience-filters.tsx:218-227`
   - Remove the standalone "すべてクリア" ghost button from the filter panel — the result banner in `visit-experience-list-section.tsx:166-181` already provides the page's one clear action.
   - `hasActiveFilters` becomes unused in this component once the button is removed (grep confirms it has no other call site here) — drop the prop from `VisitExperienceFiltersProps` and its pass-through in `visit-experience-list-section.tsx`.

## Out of Scope (cross-reference only, do not implement here)

- `src/app/(private)/visit-experiences/[id]/_components/status-panel.tsx` hardcodes its own separate `確認待ち` / `BL照合中` labels for the **detail** page (`003-visit-experience-detail`), not sourced from the shared map. Belongs to that feature's own plan.
- `src/lib/openapi.json`, `src/lib/api/types.gen.ts`: generated from the backend OpenAPI spec; regenerated via codegen when the backend publishes updated descriptions, not hand-edited here.
- `src/app/api/_mock-db/seeds/visit-experience.seed.ts`, `_schemas/visit-experience.schema.ts` `.describe()` text: non-user-facing metadata, no functional impact on list-page behavior.

---

## Constitution Check

| Principle                               | Status | Notes                                                                                                      |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| I — TypeScript Strictness               | PASS   | Label/text-only edit and a prop removal; no new `any`, types stay derived from existing enums.             |
| II — OpenAPI-First                      | PASS   | No API contract change; mock route already handles `bl_match`/store scoping.                               |
| III — Spec-Driven Development           | PASS   | Traces directly to `spec.md` FR-007/FR-008 revision.                                                       |
| IV — App Router Conventions & Simple UX | PASS   | Removes a redundant UI affordance (simpler UX, one clear action instead of two); no new client boundaries. |
| V — Simplicity & Minimal Dependencies   | PASS   | No new dependencies; net code reduction.                                                                   |

No violations.

---

## Verification (per constitution's No Testing Policy — manual only)

1. `tsc --noEmit` and `npm run lint` — no new errors.
2. Manually load `/visit-experiences` as a single-store role and as a multi-store (HQ) role: confirm 8 vs. 9 columns, store filter presence, and that all three status labels needing display (申請者への確認待ち / BL照合結果あり・確認待ち / other 5) read correctly in both the filter dropdown and table badges.
3. Apply a filter, confirm only the result-banner "クリア" button is present (no second button in the filter panel), and that it fully resets state.
4. Clear all filters/search with zero seed data pre-filtered to confirm the true "no data" empty state shows no clear button.
