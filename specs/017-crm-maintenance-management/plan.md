# Implementation Plan: Y-10 CRM Maintenance Management

**Branch**: `017-crm-maintenance-management` | **Date**: 2026-07-16 (updated 2026-07-20) | **Spec**: [specs/017-crm-maintenance-management/spec.md](spec.md)
**Input**: Feature specification from `/specs/017-crm-maintenance-management/spec.md`

## Summary

Implement CRUD management of CRM server maintenance windows for Y-10: a filterable/sortable/paginated list (search by ID/title, status filter), a create form, an edit form (start-datetime locked while in progress), a read-only detail view, and role-gated delete (blocked while in progress) — plus an allowed-user sub-list per window (search-and-add from the existing CRM staff master, remove before save). Grounded on the UI prototype (`crm-maintenance-list.tsx`/`crm-maintenance-detail.tsx`/`maintenance-form.tsx`) and the reference backend API design (`backend-api.md`, root of repo).

**2026-07-20 update — Advance Notification (FR-007) now in scope.** The CRUD feature above is already implemented and merged. This revision plans the delta added by the 2026-07-20 clarifications: the UI prototype gained an advance-notification affordance (a 通知 sent-status column on the list, and a 事前通知 card with a send / re-send button on the detail), and the source requirement's "Should"-priority FR-007 is now brought in scope as a **mock-implemented capability**. The backend contract (`backend-api.md`) already defines the fire-and-forget _send_ endpoint (`202 { recipientCount }`, async), but carries **no per-record notification-status field** on the list/detail responses. Per the clarifications, the mock persists a per-record notification status (sent flag + kind auto/manual + sentAt) ahead of the backend contract so the UI has something to render and demo; the real Phase-2 backend keeps its send action and, once it also returns status, a refetch surfaces it with no UI change.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4
**Storage**: Phase 1 — `src/app/api/_mock-db/` (table/type/seed pattern, modeled on `app-maintenances`, joined against the existing `staffs` table for allowed-user resolution); Phase 2 — generated REST client via hey-api, designed directly against `backend-api.md`
**Target Platform**: Node.js ≥ 24.0.0, browser (web), desktop-focused (min viewport 768px)
**Project Type**: Web application (Next.js App Router), single project
**Performance Goals**: List/filter/search feedback <200ms against in-memory mock data (small seed set; `backend-api.md`'s own NFR calls the real table "tens of rows")
**Constraints**: Role check (`System`-only writes, `System`+`Headquarter` reads, all other roles denied) MUST be enforced server-side via `getAuthUserFromRequest` in every route handler, not only client-side gating (FR-012/FR-014/FR-020); period-overlap, in-progress start-date lock, and in-progress delete lock (FR-005, FR-016, FR-019) MUST be enforced in the mock table's `create`/`update`/`delete` methods; adding allowed users MUST remain permitted while a record is `in_progress` (FR-017). **New for the notification delta**: sending a notification MUST be `System`-only (server-side, FR-024) and MUST be rejected when the derived status is `completed` (FR-024); a newly created record MUST start unnotified (FR-027); the notification status is a **mock-only extension** absent from the real list/detail contract — response fields carrying it MUST be optional so the client degrades to "未" (treats missing status as not-yet-notified) when a real backend without those fields is wired in.
**Scale/Scope**: Existing (already built): one list+create route (`GET`/`POST /crm/maintenances`), one detail/update/delete route (`GET`/`PATCH`/`DELETE /crm/maintenances/{id}`), 4 pages (list, create, detail, edit) + route-local components; reuses `GET /crm/staffs` for allowed-user search — no new staff-search endpoint. **Notification delta adds**: one new send endpoint (`POST /crm/maintenances/{id}/notifications` → `202 { recipientCount }`), 2 new detail components (notification card + confirm dialog), 1 new list column, and extensions to the mock schema/type/table/seed + permission wiring. No new npm dependencies.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                   | Notes                                                                                                                                                                                                                                                                                        |
| --- | ---------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☒ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent      | Notification fields derived from Zod schemas in `crm-maintenance.schema.ts`; a `CrmMaintenanceNotificationKindSchema` enum (`auto`/`manual`) added alongside the existing `CrmMaintenanceStatusSchema`; table-layer `notify()` returns a discriminated sentinel like the other methods       |
| II  | OpenAPI-First          | ☒ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits   | New send route registered via `registerRoute()`; the send endpoint's `202 { recipientCount }` shape matches `backend-api.md` exactly so the Phase-2 swap is mechanical. The notification-**status** response fields are a documented mock-ahead extension (see Delta §, Complexity Tracking) |
| III | Spec-Driven            | ☒ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved                       | Notification behavior resolved by the 2026-07-20 Clarifications (3 Q/A); FR-022–FR-027 + SC-007 added to spec.md; zero `[NEEDS CLARIFICATION]` markers remain                                                                                                                                |
| IV  | App Router & Simple UX | ☒ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path | Notification card + confirm dialog live inside the already-`"use client"` detail section (React Query mutation + dialog state); no new modal beyond the single required send-confirmation dialog the prototype specifies                                                                     |
| V   | Simplicity & Min. Deps | ☒ No new npm packages; no abstraction layers beyond existing patterns                   | Reuses `RoleGatedButton`, the `registerRoute()` shape, and the existing status-badge/label constant pattern; notify persists via a side-effect on the same `crmMaintenances` table (no new table); recipient count derived from the existing `db.staffs` list (no stored field)              |

**Initial gate result**: PASS — no constitutional violations.

**Post-design re-check**: PASS — the notification delta introduces no new dependency and no new mock table; it reuses the established schema/type/table/route/seed split and the `RoleGatedButton`/status-constant UI patterns. The single deliberate contract divergence (mock persists notification status the real list/detail responses don't yet return) is documented in Complexity Tracking and encoded as optional response fields so the Phase-2 swap stays graceful.

> Any ☐ left unchecked MUST be addressed before implementation begins, or justified in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/017-crm-maintenance-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (updated for notification delta)
├── quickstart.md        # Phase 1 output (updated for notification delta)
├── contracts/           # Phase 1 output
│   ├── list-crm-maintenances.md
│   ├── crm-maintenance-detail.md
│   ├── crm-maintenance-mutations.md
│   └── crm-maintenance-notify.md      # [NEW] advance-notification send contract
├── checklists/
│   ├── requirements.md
│   └── parity.md
└── tasks.md             # Phase 2 output (/speckit.tasks — regenerate for the notification delta)
```

### Source Code (repository root) — actual current layout, with notification-delta touchpoints marked

```text
src/
├── app/
│   ├── api/
│   │   ├── _mock-db/
│   │   │   ├── types/
│   │   │   │   └── crm-maintenance.type.ts            # [EXTEND] add notify() to table iface + CrmMaintenanceNotifyResult sentinel
│   │   │   ├── tables/
│   │   │   │   └── crm-maintenance.table.ts           # [EXTEND] notification cols null on create; notify() method; item/detail mappers add status
│   │   │   └── seeds/
│   │   │       └── crm-maintenance.seed.ts            # [EXTEND] seed notification_kind/notified_at (mix of auto-sent, manual-sent, unsent)
│   │   ├── _schemas/
│   │   │   └── crm-maintenance.schema.ts              # [EXTEND] kind enum; row cols; item.notified; detail.notification + notifyTargetCount; send response
│   │   ├── _routes/
│   │   │   └── index.ts                               # [EXTEND] import the new notifications route
│   │   └── crm/
│   │       └── maintenances/
│   │           ├── route.ts                           # [UNCHANGED] GET (list) / POST (create)
│   │           └── [id]/
│   │               ├── route.ts                       # [UNCHANGED] GET (detail) / PATCH / DELETE
│   │               └── notifications/
│   │                   └── route.ts                   # [NEW] POST send advance notification → 202 { recipientCount }
│   └── (private)/
│       └── crm-maintenance/
│           ├── page.tsx                               # [UNCHANGED] list page
│           ├── create/page.tsx                        # [UNCHANGED]
│           ├── [id]/page.tsx                          # [UNCHANGED] detail page
│           ├── [id]/edit/page.tsx                     # [UNCHANGED]
│           ├── _components/
│           │   ├── crm-maintenance-columns.tsx        # [EXTEND] add 通知 column (済 / 未 / — for completed)
│           │   ├── crm-maintenance-list-section.tsx   # [UNCHANGED] (column added via columns file)
│           │   ├── crm-maintenance-delete-dialog.tsx  # [UNCHANGED]
│           │   ├── crm-maintenance-filters.tsx        # [UNCHANGED]
│           │   ├── crm-maintenance-form/…             # [UNCHANGED]
│           │   └── detail/
│           │       ├── crm-maintenance-detail-section.tsx        # [EXTEND] render notification card in right column; wire send mutation + invalidate
│           │       ├── crm-maintenance-detail-info-cards.tsx     # [UNCHANGED]
│           │       ├── crm-maintenance-detail-status-card.tsx    # [UNCHANGED]
│           │       ├── crm-maintenance-detail-notification-card.tsx  # [NEW] 事前通知 card (sent state / kind / sentAt / target count / send button)
│           │       ├── crm-maintenance-notify-dialog.tsx          # [NEW] send-confirmation dialog w/ content preview
│           │       └── crm-maintenance-detail-skeleton.tsx        # [EXTEND?] add a skeleton block for the notification card (optional)
│           └── _constants/
│               └── crm-maintenance.constants.ts       # [EXTEND] notification kind labels (登録時に自動送信 / 手動送信) + 済/未 badge classes
└── types/
    ├── permission.type.ts                             # [EXTEND] add Permission.CrmMaintenanceNotify
    └── … + permission.constants.ts                    # [EXTEND] wire CrmMaintenanceNotify into ROLE_PERMISSIONS (System only)
```

**Structure Decision**: Single Next.js App Router project; unchanged from the base feature. The notification delta stays inside the existing `crm-maintenance` feature folder and the existing `crmMaintenances` mock table — no new top-level directory, no new mock table, no new npm package. The one new backend route (`.../notifications/route.ts`) follows the established nested-route + `registerRoute()` convention; the two new UI files live under the existing `_components/detail/` folder that already groups the detail sub-components.

## Phase 0: Research & Unknown Resolution

Research completed in [research.md](research.md) for the base CRUD feature. The 2026-07-20 clarifications resolve the notification-delta unknowns directly (recorded in spec.md's Clarifications):

- **Scope**: FR-007 is now in scope as a full mock feature (Clarification Q1). This **reverses** the prior research note that listed "Send advance notification" as out of scope — that decision is now superseded.
- **Initial state**: `create()` leaves the record unnotified (未); notification is sent manually via the detail button (Clarification Q2, FR-027). The `auto` kind is used only for seed rows representing past auto-on-registration sends.
- **Send effect**: the mock `notify()` persists `{ kind: 'manual', sentAt: now }` and the client invalidates the list + detail queries so a refetch shows 済; re-send updates `sentAt` (Clarification Q3, FR-027 + Edge Cases).
- **Recipient count**: derived at read time from the `db.staffs` list (all CRM users), consistent with the real send endpoint's `recipientCount`; not a stored field (spec Assumptions).
- **Contract shape**: the send endpoint returns `202 { recipientCount }`, matching `backend-api.md` verbatim, so the Phase-2 swap is mechanical. The per-record notification **status** carried on list/detail responses is a mock-ahead extension the real contract does not yet define (documented below).

## Phase 1: Design & Contracts Output

Artifacts (updated for the notification delta):

- [data-model.md](data-model.md) — notification fields added to the `CrmMaintenance` entity + seed + response DTOs + the `notify()` table method
- [contracts/list-crm-maintenances.md](contracts/list-crm-maintenances.md) — list item gains `notified`
- [contracts/crm-maintenance-detail.md](contracts/crm-maintenance-detail.md) — detail gains `notification` + `notifyTargetCount`
- [contracts/crm-maintenance-notify.md](contracts/crm-maintenance-notify.md) — **[NEW]** the send endpoint
- [quickstart.md](quickstart.md) — notification verification steps

### Advance Notification (FR-007) — Design Delta

**Mock storage (row, snake_case).** Add two nullable columns to `CrmMaintenanceSchema`:

- `notification_kind: 'auto' | 'manual' | null` — how it was sent (`null` = not sent)
- `notified_at: string | null` — ISO send timestamp (`null` = not sent)

Both `null` ⇒ unnotified (未). `create()` always inserts both `null` (FR-027). Status remains derived and never stored; the notification columns are the feature's only new stored state.

**Table layer.**

- `notify(id): CrmMaintenanceNotifyResult` — `'not_found' | 'completed_locked' | CrmMaintenance`. Rejects when derived status is `completed` (FR-024); otherwise sets `notification_kind = 'manual'`, `notified_at = now()` and returns the row. First-send and re-send are the same operation (re-send just overwrites `notified_at`).
- `toCrmMaintenanceItemResponse` gains `notified: notified_at !== null`.
- `toCrmMaintenanceDetailResponse` gains `notification: notified_at ? { kind, sentAt: notified_at } : null` and `notifyTargetCount: <count derived from db.staffs>`.

**Route.** `POST /crm/maintenances/{id}/notifications` — `System`-only server-side (403 for others incl. Headquarter, FR-024); `404` if the id is unknown; `409` (`完了したメンテナンスには通知できません`) when status is `completed`; otherwise `202 { recipientCount }` (recipientCount = derived target count). Registered in `_routes/index.ts`.

**Response fields are optional.** `notified`, `notification`, and `notifyTargetCount` are declared `.optional()` in their Zod response schemas so the generated type marks them optional — the UI reads them with fallback (`notified ?? false`, `notification ?? null`) and stays compilable/correct if a real backend omits them.

**UI.**

- List: a 通知 column between ステータス and 許可ユーザー — renders 済 (success badge) when `notified`, 未 (muted) when not, and — when `status === completed` (FR-022).
- Detail: a `事前通知` card in the right column under the status card — shows sent state (登録時に自動送信 / 手動送信 + `sentAt`), target count, and a `RoleGatedButton` (`Permission.CrmMaintenanceNotify`) that opens the confirm dialog; the button is disabled for `completed` records (FR-023/FR-024).
- Confirm dialog: previews title / period / message and the allowed-user access note, then fires the send mutation; on success shows `通知を送信しました` and invalidates the list + detail queries so the status refetches to 済 (FR-025/FR-027).

**Regeneration.** After the schema + route edits, run `npm run generate-openapi` then `npm run generate-api` so the generated client picks up the new fields and the `postCrmMaintenancesByIdNotifications` mutation hook before the UI consumes them.

## Complexity Tracking

One deliberate, documented contract divergence; no constitution violation requiring a waiver.

| Item                                                                                                                                                                | Why Needed                                                                                                                                                                                                                      | Simpler Alternative Rejected Because                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mock persists per-record notification status (`notified` / `notification` / `notifyTargetCount`) that the real `backend-api.md` list/detail responses do not define | The UI prototype (list column + detail card) needs a data source to render and demo the sent/unsent state; the real API only exposes a fire-and-forget send. Per the 2026-07-20 clarifications the mock leads the backend here. | A pure fire-and-forget mock (toast only, no persisted state) was rejected — the list 済/未 column and detail card would have nothing to show and a freshly-sent record could never turn 済. Encoding the fields as optional keeps the Phase-2 swap graceful. |
