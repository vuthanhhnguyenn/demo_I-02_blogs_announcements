# Implementation Plan: Y-02 Store Management — 2026-10-02 prototype sync + store-map-setup

**Branch**: `feat/store-integration-api` (no new branch; feature folder `specs/026-store-management/`) | **Date**: 2026-10-02
**Specs**: [store-list](./store-list/spec.md) · [store-form](./store-form/spec.md) · [store-detail](./store-detail/spec.md) · [store-map-setup](./store-map-setup/spec.md) (each has a "Session 2026-10-02" delta table)
**Prior plan**: [store-list/integration-plan.md](./store-list/integration-plan.md) — real-API Round 1 (commit `90f502d9`), its blocker ids B1–B14, and Round 3 (= Phase 2, `TODO(round3) B1`).

> `setup-plan.sh` could not be used: the branch name is not a feature branch, and the prefix `026` is shared with `026-option-management`. This plan was created by hand from `.specify/templates/plan-template.md`.

## Summary

This plan delivers the spec deltas of the 2026-10-02 re-sync for the three store screens that already run on the real API (list, form, detail), plus the new screen 店舗マップ設定 (store map setup). It is a **delta plan**: everything not listed in a Session 2026-10-02 table stays as built in Round 1.

The approach:

- **Commit the staged `api-real` regen first.** It closes B3 / B5 / B9 / B11 / B12 and the photo half of B4 (research R1).
- **Build each delta on generated hooks only.** No mock-db work, and no new endpoints.
- **Shared foundations land first**:
  - status tokens;
  - an own-store gate for Staff;
  - a real presign upload hook;
  - an unsaved-changes bar;
  - floor-map and marker components.
- **Then four work packages that can run in parallel**: list, form, detail, map.

Key user decisions carried in:

- Four statuses (準備中 / 営業中 / 休業中 / 閉店 — preparing / operating / temporarily closed / closed).
- ステータス変更 (status change) is in Phase 1, via `PATCH status` (R2).
- 入退館設定 (entry/exit settings) follows the prototype fully. Partner add/remove is dropped (R6).
- The dev-added 店舗写真 (store photos) card on the form, and an 編集 (edit) button on the detail gallery. Writes use the full-set `PUT /images` (R7).
- 店舗マップ (store map) is Phase 1. The floor image is UI-only and unwired, with no mock. Locker positions use the real API (R8).

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui (Sheet / Dialog / AlertDialog / Select / Switch already present), TanStack React Query 5 via `src/lib/api-real` hooks, react-hook-form + Zod (form), lucide-react, Tailwind CSS v4, date-fns v4, nuqs (list URL state). No new npm packages.
**Storage**: Real API only (`src/lib/api-real`, regenerated from `src/lib/openapi.real.json`, staged 2026-10-02). No `src/app/api/_mock-db/` changes, except widening the mock `StoreListStatus` to four values for the Y-03 linked-stores tab (R14).
**Target Platform**: Node.js ≥ 24, browser.
**Project Type**: Web application — the existing Next.js monolith.
**Performance Goals**: no new targets.

- The list stays server-side paged (`limit` ≤100).
- The map screen loads ≤100 cabinets in one page; more are paged, BQ5.
- Photo upload runs per file, in parallel, capped at 20.
  **Constraints**:
- No automated tests (Constitution: No Testing Policy). Verification is through `quickstart.md`, `/verify-parity`, and `tsc --noEmit`, which must show 0 errors outside `.next/`.
- No manual edits to generated files.
- ~~Edit-mode weekly hours stay read-only while **B13** is open (user decision 2026-09-22, R9).~~ **B13 resolved 2026-10-07**: edit sends `businessHours` on the PATCH (R9).
- The floor-map image is never sent to the API (user decision 2026-10-02, R8).
  **Scale/Scope**:
- About 30 files modified.
- About 15 new files (map screen ~10, photo card, media hook, status dialog, map tab, unsaved bar, can-edit util).
- 4 sub-specs.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: still passes._

| #   | Principle              | Check                                                                                                                                                                                                                                                | Notes                                                                                                                   |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ Types come from the generated DTOs. FE view models (`HolidayMode`, `StorePhotoDraft`, `MapDraft`) are named for intent. The regen removes the `object`-typed casts (B3) instead of adding new ones                                                 | `StoreHistoryChangeDto.before/after` remain `unknown` (B2). They are narrowed in the existing label map, unchanged here |
| II  | OpenAPI-First          | ☑ Only generated `api-real` hooks are used, and no generated file is edited. Every endpoint in [contracts/api-contracts.md](./contracts/api-contracts.md) already exists. The regen is committed, not hand-edited                                    | The deprecated photo endpoints and `PUT /details` are explicitly not called                                             |
| III | Spec-Driven            | ☑ All four sub-specs have 0 `[NEEDS CLARIFICATION]`. The store-map-setup FR-083 was resolved by the user on 2026-10-02. The open items are **BE questions** with defaults chosen in research.md, so none of them blocks a task                       | Verify-live items are attached to the tasks that depend on them (quickstart §0)                                         |
| IV  | App Router & Simple UX | ☑ New pages are thin server shells around `"use client"` route-local components (interactive forms, drag, uploads — justified per file). shadcn + Tailwind only. Sheets and dialogs are the prototype's own interaction model (R13), not added steps | The map markers' drag uses pointer events. The only inline `style` is the dynamic `left/top %`                          |
| V   | Simplicity & Min. Deps | ☑ No new packages. One new shared hook (`use-media-upload`) and one new shared component (`unsaved-changes-bar`), each justified by ≥2 consumers (form photos + map; map screen + future). Drag is native pointer events, not a DnD library          | —                                                                                                                       |

## Project Structure

### Documentation (this feature)

```text
specs/026-store-management/
├── plan.md                 # this file
├── research.md             # Phase 0 (R1–R14)
├── data-model.md           # Phase 1
├── contracts/api-contracts.md
├── quickstart.md           # Phase 1 — manual verification
├── store-list/   spec.md · integration-plan.md · checklists/{requirements,parity}.md
├── store-form/   spec.md · checklists/{requirements,parity}.md
├── store-detail/ spec.md · checklists/{requirements,parity}.md
├── store-map-setup/ spec.md · checklists/{requirements,parity}.md   # NEW
└── tasks.md                # /speckit.tasks (not created here)
```

### Source Code (repository root)

```text
src/lib/api-real/**, src/lib/openapi.real.json        # COMMIT staged regen (WP0)
src/hooks/use-media-upload.hook.ts                    # NEW — real presign + S3 PUT w/ requiredHeaders (R7)
src/components/common/unsaved-changes-bar.tsx         # NEW — port of V0 bar (R12)
src/lib/routes/routes.config.ts                       # + /stores/[id]/map
src/app/api/_schemas/store.schema.ts                  # StoreListStatus → 4 values (R14)

src/app/(private)/stores/
├── _constants/constants.ts            # status tones → info/success/warning/muted (L2/D4)
├── _utils/can-edit-store.util.ts      # NEW — own-store gate (R10)
├── _utils/store-api.util.ts           # drop stale B3/B5/B9 seams
├── _utils/store-form.util.ts          # drop B3/B5/B9/B11/B12 seams; holiday mode mapping; photo diff
├── _schemas/store-form.schema.ts      # holiday_mode, photos[]
├── _components/
│   ├── stores-filters.tsx             # placeholder 店舗コード; FC filter franchise+active (L3/L4)
│   ├── stores-table-columns.tsx       # row 編集 via canEditStore (L5)
│   ├── store-form.tsx                 # F1/F2/F4/F6/F7/F8/F11 + mounts photo card
│   ├── store-form-photos.tsx          # NEW — 店舗写真 card (FR-055–059f)
│   ├── store-form-shell.tsx           # Staff footer line (F9/FR-086a); multi-write error reporting
│   ├── store-floor-map.tsx            # NEW — image + overlay, shared by map tab & map screen
│   └── locker-marker.tsx              # NEW — 32px marker, tooltip, readOnly | draggable
├── create/page.tsx                    # POST with businessHours; then PUT /images (FR-059b, FR-070c)
└── [id]/
    ├── page.tsx                       # header 編集 (D7); 店舗マップ tab (D1)
    ├── edit/page.tsx                  # code-change dialog (F5); PUT /images when dirty; guard via canEditStore
    ├── map/                           # NEW — store-map-setup screen (R12)
    │   ├── page.tsx
    │   └── _components/{store-map-setup.tsx, floor-image-card.tsx, locker-panel.tsx, use-store-map-draft.ts}
    └── _components/
        ├── store-status-change-dialog.tsx            # NEW (D5)
        └── tabs/
            ├── basic-info-tab/index.tsx              # D3 remove floor card; D5/D6 StatusCard; D8 brand/sub-brand; D26 gallery + 編集
            ├── business-settings-tab/
            │   ├── business-calendar.tsx             # D10/D11 precedence + legend
            │   ├── business-hours-settings.tsx       # D12/D13 Sheets + holiday mode
            │   ├── business-hours-shared.ts          # D14/D15 rename + cross-kind duplicate copy
            │   ├── exception-hours-settings.tsx      # D14–D16 特別営業日 dialog/empty/delete
            │   └── temporary-closure-days-settings.tsx # D15/D16
            ├── contract-tab/_components/
            │   ├── main-contract-section.tsx         # D17 区分 column
            │   ├── option-section.tsx                # D18 drop 親オプション + origin
            │   └── drawer-list-item.tsx              # D17/D18 badges
            ├── contract-tab/contract-tab.data.ts
            ├── access-settings-tab/index.tsx         # D20–D23 brand split, Sheet, partners read-only
            ├── access-settings-tab/mutual-use-sheet.tsx  # NEW (D21)
            ├── access-settings-tab/permitted-store-select.tsx  # DELETE (D22)
            └── store-map-tab/index.tsx               # NEW (D1/D2)

src/app/(private)/lockers/_components/locker-form-*.tsx, locker list   # entry links → /stores/{id}/map (map FR-071/072)
```

**Structure Decision**: the existing single Next.js App Router project, with route-local code under `src/app/(private)/stores/**`. Cross-screen pieces go to `src/hooks` / `src/components/common` only when two or more consumers exist: the media upload hook (form photos + map image later) and the unsaved bar (map screen). The floor-map and marker components sit in `stores/_components/` because only store routes use them.

## Work packages

Dependency order: **WP0** first, then **WP1–WP4** in parallel. WP4 needs `store-floor-map` / `locker-marker` from WP0.

### WP0 — Shared foundations

1. Commit the staged regen. Run `tsc --noEmit` and remove the stale `TODO(round2)` seams for B3 / B5 / B9 / B11 / B12 and the photos half of B4. The audit lists the file:line locations (R1). Keep the markers that are still valid: B2, B8, B10, B13, B14, and the floor-map half of B4. The regen closes B6 and B7 as well, but their markers are removed inside WP3, where the mutual-use UI is rebuilt.
2. Status tones (L2/D4), and widen the mock `StoreListStatus` (R14).
3. `can-edit-store.util.ts` (R10).
4. `use-media-upload.hook.ts` (R7).
5. `unsaved-changes-bar.tsx` (R12).
6. `store-floor-map.tsx` + `locker-marker.tsx` (R8): the read-only mode and the draggable mode.
7. Verify live (quickstart §0) before WP2 or WP3 merge:
   - R2 PATCH without `status`;
   - R3 7-row hours;
   - R7 presign png/jpeg and the `/media/assets` `<img>`;
   - R10 Staff list scope.

### WP1 — store-list (S)

- **L3**: placeholder.
- **L4**: FC filter `franchise` + `isActive`, hidden for roles without access (R11).
- **L5**: row 編集 via `canEditStore`.
- **L7**: Round 3 only — fix the `TODO(round3 ) B1` marker typo so grep finds it.
- **Parity re-open**: PAR011, PAR029, PAR035, PAR066.

### WP2 — store-form (L)

- **F1, F2, F4, F5, F6, F7, F8, F9**, as in the delta table.
- **F11**: create mode only, holiday mode + 7/8-row mapping (R3/R9); edit sends them on the PATCH since B13 closed (2026-10-07).
- **店舗写真 card**, FR-055–FR-059f:
  - grid, add tile, hover delete;
  - validation (JPG/PNG, 10MB, 20 max);
  - disable submit while uploading;
  - edit: `PUT /images` only when the list changed; create: after `POST`;
  - FR-070a / FR-070c failure reporting;
  - invalidate `ListImages` + store detail.
- **F5 dialog**: on `[id]/edit/page.tsx`.
- **Blocker**: this WP must not merge until R2's PATCH-default question is confirmed. If PATCH resets `status`, echo the loaded status.

### WP3 — store-detail (L)

- **D1/D2**: map tab, counts, read-only markers, image empty state, button via `canEditStore`.
- **D3**: remove the floor-map card.
- **D5/D6**: StatusCard + `store-status-change-dialog` (`PATCH {status}`, the matrix, reasons, toast).
- **D7**: header 編集 + deny copy.
- **D8**: ブランド / サブブランド rows.
- **D10/D11**: calendar classifier + legend.
- **D12/D13**: hours Sheets + holiday select.
- **D14–D16**: rename to 特別営業日, add/edit Dialog, cross-kind duplicate error, empty states, delete AlertDialog.
- **D17/D18**: 区分 column; drop 親オプション / option origin.
- **D20–D23**: brand split, mutual-use Sheet (full PUT incl. `payLaterEnabled` / `yogaUsageFee`, plus minor-hours PATCH), partners read-only, delete `permitted-store-select.tsx`.
- **D26**: real gallery through `/media/assets/{s3Key}` + 編集 → `/stores/{id}/edit#photos`.

### WP4 — store-map-setup (L, new)

- **Route and permissions**: `/stores/[id]/map`, wall for Manager / Trainer / Observer, edit via `canEditStore`.
- **Header**: breadcrumb.
- **Floor image card**: built to V0 and session-only (R8):
  - dropzone (PNG / JPG ≤5MB; SVG dropped, BQ1);
  - type and size errors;
  - 画像を差し替え (replace image) / 画像を削除 (delete image);
  - replace warning.
- **Cabinet panel**: 未配置 (unplaced) / 配置済み (placed), 配置 (place) / 配置を外す (unplace), 未保存 (unsaved) dot, 詳細 (details) opens a new tab.
- **Markers**: drag with a 4px threshold, arrow keys (1px, Shift 10px).
- **Draft and save**:
  - draft hook;
  - `UnsavedChangesBar`;
  - save = per-cabinet `PATCH {mapX,mapY,expectedUpdatedAt}`;
  - partial-failure handling;
  - toasts.
- **Discard**: dialog + `useUnsavedChangesGuard`.
- **Entry links**: from the locker list / form (map FR-071/072).

## Risks & open BE items (non-blocking; defaults in research.md)

| Ref                      | Item                                                                       | Default taken                                                                    | Affects           |
| ------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- |
| R2 / detail Q7           | Transition matrix; manual `closed`; **PATCH `status` default `preparing`** | FE matrix, `closed` not offered — **closed 2026-10-07**, follows the BE contract | WP2, WP3          |
| R3 / form Q4, detail Q15 | 曜日どおり encoding                                                        | Omit the holiday row — **closed 2026-10-07**                                     | WP2 (create), WP3 |
| R4 / detail Q10          | 特別営業日 = `short_hours`                                                 | Yes — **closed 2026-10-07**, follows the BE contract                             | WP3               |
| R6 / detail Q12          | One acceptance flag for both brands                                        | Single `isAcceptEnabled` — **closed 2026-10-07**, the schema answers it          | WP3               |
| R7 / R8 / B4             | No fetchable image URL; presign whitelist                                  | Fetchable `url` / `gymMapUrl` — **closed 2026-10-07**                            | WP2, WP3, WP4     |
| R11                      | FC list HQ-only; "≥1 store" facet                                          | Filter hidden for other roles — **closed 2026-10-07**, not FE scope              | WP1               |
| BQ3 / BQ4                | No batch position save; Manager may PATCH lockers on BE                    | Per-cabinet PATCH; FE blocks Manager                                             | WP4               |
| B13                      | Hours on PATCH                                                             | **Resolved 2026-10-07** — sent on PATCH                                          | WP2               |

## Complexity Tracking

_No Constitution Check violations — table not needed._
