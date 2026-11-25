# Implementation Plan: Member Form Management (会員情報を編集)

**Branch**: `020-member-form` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-member-form/spec.md` (clarified 2026-07-28 — 12/12 questions resolved, 0 `[NEED CLARIFICATION]` markers)

## Summary

Align the existing member-edit screen (`/members/[id]/edit`) to the clarified A-01 FR-004 spec: a single 個人情報 card with exactly the ten prototype inputs, prototype-verbatim submit-only validation, an unsaved-changes guard (discard dialog + `beforeunload`), page-level HQ/System role gate and withdrawn-member block, and a save that sends only `basic_info` (eight FR-004 field groups) through the existing mock `PATCH /crm/members/{id}`, then toasts 「会員情報を更新しました」 and returns to the member detail. 性別 gains the fourth prototype option 回答しない, which round-trips as its own stored value. Change history: the client writes nothing, but the backend records the edit in the member's 変更履歴 and FR-028 (rewritten 2026-09-21) makes that record a verified outcome of the save.

This is a **rework of an existing implementation**, not a green-field build. The current page ([src/app/(private)/members/[id]/edit/page.tsx](<../../src/app/(private)/members/[id]/edit/page.tsx>)) already has: load via generated query options, `DataStateBoundary`, withdrawn-member block, save→detail with the correct toasts. The delta is: form trimmed from 4 cards/19 fields to 1 card/10 fields, validation copy & rules aligned to the prototype, unsaved-changes guard added, role gate added, header swapped to BackLink+title, gender extended.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any)
**Primary Dependencies**: Next.js 16 (App Router), React 19, shadcn/ui, TanStack React Query 5, react-hook-form + Zod, lucide-react, Tailwind CSS v4, date-fns v4 (`ja`)
**Storage**: Phase 1 — in-memory mock DB `src/app/api/_mock-db/` behind `src/app/api/crm/members/*` routes; API client is the hey-api generated client in `src/lib/api/`
**Target Platform**: Node.js ≥ 24.0.0, evergreen browsers
**Project Type**: Web application (Next.js App Router, single project)
**Performance Goals**: Standard CRM screen — instant field interaction, save round-trip perceived < 1s against mock
**Constraints**: UI parity with V0 `member-form.tsx` @ `426a9b3` (79-item parity checklist); no client-side history write (the backend owns it — FR-028); no new npm dependencies
**Scale/Scope**: 1 route (`/members/[id]/edit`), 1 form component rewrite, 1 schema rewrite, 2 small mock-schema edits, 2 entry points already in place

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                                                                                                | Notes                                                                                                                                                                                      |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent                                                                                   | Form values typed via `z.input`/`z.output` of the rewritten schema                                                                                                                         |
| II  | OpenAPI-First          | ☑ Phase 1 uses mock DB; generated client used for all calls; endpoint already in OpenAPI                                                                             | ⚠ One surgical edit to `src/lib/api/types.gen.ts` (add `NO_ANSWER` to `Gender`) — justified in Complexity Tracking; the Zod source of truth (`_schemas/member.schema.ts`) is updated first |
| III | Spec-Driven            | ☑ `spec.md` approved; 0 `[NEEDS CLARIFICATION]` tokens (clarify session 2026-07-28)                                                                                  |                                                                                                                                                                                            |
| IV  | App Router & Simple UX | ☑ RSC by default; `"use client"` only on the form page (react-hook-form + dialogs — justified in code comment); shadcn/ui + Tailwind only; single-form shortest path | Route-local code stays in `_components/` / `_schemas/`                                                                                                                                     |
| V   | Simplicity & Min. Deps | ☑ No new npm packages; discard dialog reuses the existing project pattern (banner/equipment forms), no new abstraction                                               |                                                                                                                                                                                            |

**Post-design re-check (after Phase 1)**: all five gates still hold. The only flagged item remains the `Gender` surgical edit (Complexity Tracking below).

## Project Structure

### Documentation (this feature)

```text
specs/020-member-form/
├── spec.md              # Clarified feature spec (done)
├── plan.md              # This file
├── research.md          # Phase 0 — decisions for every delta
├── data-model.md        # Phase 1 — entities, form model, gender extension
├── quickstart.md        # Phase 1 — manual verification checklist
├── contracts/
│   └── member-update.md # Phase 1 — GET/PATCH contract used by this screen
├── checklists/
│   ├── requirements.md  # Spec quality (done)
│   └── parity.md        # 79-item V0 parity checklist (done — gates /speckit.implement)
└── tasks.md             # Phase 2 (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/app/(private)/members/
├── page.tsx                                  # entry point (row-menu 編集) — already role-gated, unchanged
├── [id]/
│   ├── page.tsx                              # entry point (header 編集) — already role-gated, unchanged
│   └── edit/
│       └── page.tsx                          # REWORK: header, guards, discard dialog, submit payload
├── _components/
│   ├── members-form.tsx                      # REWORK: 4 cards/19 fields → 1 card 個人情報 / 10 inputs
│   └── member-edit-discard-dialog.tsx        # NEW: discard AlertDialog (project pattern)
├── _schemas/
│   └── member-form.schema.ts                 # REWORK: blank-only validation, prototype messages, gender w/ 回答しない
└── _utils/index.ts                           # keep normalizePostalCode/trimOrUndefined as needed

src/app/api/
├── _schemas/member.schema.ts                 # EDIT: GenderSchema += 'no_answer'
└── crm/members/[id]/route.ts                 # unchanged (PATCH already validates via UpdateMemberRequestSchema)

src/lib/api/types.gen.ts                      # SURGICAL EDIT: Gender.NO_ANSWER = 'no_answer' (see Complexity Tracking)

src/hooks/
└── use-unsaved-changes.hook.ts               # NEW: dirty + beforeunload + confirm-discard (ports V0 hook to project conventions)
```

**Structure Decision**: Single Next.js App Router project; all feature work stays route-local under `src/app/(private)/members/` per Principle IV, with two shared touch-points (mock schema, generated-type surgical edit) and one new shared hook mirroring the V0 `use-unsaved-changes` contract.

## Delta Map (current code → spec)

| #   | Area                  | Current (`members/[id]/edit`)                                                                                | Spec target                                                                                                                                                                                              | FR / PAR                       |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| D1  | Form sections         | 4 cards: 基本情報・連絡先・契約情報・備考 (19 fields incl. photo, emergency contact, join info, notes)       | **1 card 「個人情報」, 10 inputs, fixed order**                                                                                                                                                          | FR-007/008, PAR009–PAR034      |
| D2  | Header                | BreadcrumbNav 会員管理›会員編集 + title 「会員編集」                                                         | BackLink 「会員管理に戻る」 + title 「会員情報を編集」                                                                                                                                                   | FR-002, PAR005–PAR007          |
| D3  | Validation            | Zod format rules (kana regex, phone 10–11 digits, email, postal regex, max 50) with 「…は必須です」 messages | **Blank-only** on the 8 required fields with prototype-verbatim 「…を入力してください」 messages; 郵便番号/住所 never validated                                                                          | FR-015–FR-019, PAR040–PAR056   |
| D4  | Unsaved-changes guard | None (cancel navigates silently)                                                                             | Dirty tracking → discard dialog 「変更を破棄しますか？」 + `beforeunload`                                                                                                                                | FR-020–FR-022, PAR061–PAR072   |
| D5  | Cancel destination    | Member detail                                                                                                | **Member list** (back link and cancel both go to 会員管理, per prototype)                                                                                                                                | FR-003, FR-025                 |
| D6  | Save payload          | `basic_info` + `profile_info`                                                                                | **`basic_info` only**, eight FR-004 groups; untouched attributes preserved                                                                                                                               | FR-024, Q10                    |
| D7  | Save button           | Disabled until dirty                                                                                         | ~~Always enabled (prototype)~~ **Reverted 2026-07-28 post-implementation**: disabled until dirty (user decision — V0's always-enabled button lets a pristine form no-op "save"; see spec Clarifications) | PAR037                         |
| D8  | 性別 options          | 3 (male/female/other)                                                                                        | 4 — adds 回答しない, round-trips as own value `no_answer`                                                                                                                                                | FR-013, Q12, PAR025            |
| D9  | Role gate on page     | None                                                                                                         | Permission-denied state for non-HQ/System                                                                                                                                                                | FR-032, PAR078                 |
| D10 | Withdrawn block       | Present ✔                                                                                                    | Keep (message copy per FR-033)                                                                                                                                                                           | FR-033, PAR079                 |
| D11 | Load/error states     | `DataStateBoundary` ✔                                                                                        | Keep                                                                                                                                                                                                     | FR-029/030, PAR075/076         |
| D12 | Save success/error    | 「会員情報を更新しました」→detail; error toast ✔                                                             | Keep                                                                                                                                                                                                     | FR-024, FR-031, PAR059/060/077 |
| D13 | Footer                | Fixed bottom bar                                                                                             | Inline footer row, border-t, right-aligned, summary 「未入力の項目があります」 at left                                                                                                                   | FR-023, PAR035–PAR039          |

## Phase 0 → [research.md](./research.md)

All spec-level unknowns were resolved in the clarify session; research covers the **implementation decisions** for each delta (validation strategy, gender storage, discard-guard shape, header/footer patterns, payload trimming). No outstanding NEEDS CLARIFICATION.

## Phase 1 → [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

- **data-model.md** — Member `personalInfo` subset, form-value model, gender extension (`no_answer`), state machine of the screen (loading → form → blocked/denied; dirty → discard).
- **contracts/member-update.md** — the two operations this screen uses: `GET /crm/members/{id}` (prefill) and `PATCH /crm/members/{id}` with `basic_info` subset (save); documents the eight-group payload boundary and the follow-up owed by the backend design (no published PII-update endpoint).
- **quickstart.md** — manual verification walk (constitution's No Testing Policy: quickstart replaces automated tests).

## Complexity Tracking

| Violation                                                                                        | Why Needed                                                                                                              | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surgical edit to generated `src/lib/api/types.gen.ts` (add `NO_ANSWER: 'no_answer'` to `Gender`) | Q12 requires 回答しない to round-trip as its own value; the request/response types come from the generated client       | Full client regeneration rejected: committed `openapi.json` is stale and a regen produces ~16k lines of unrelated churn (established project practice is surgical edits — see `project_api_client_codegen` memory). Mapping 回答しない→`null` rejected: collapses with "never answered" and the mutation body type still needs the edit |
| New shared hook `use-unsaved-changes.hook.ts` (not route-local)                                  | Ports the V0 hook 1:1; the same guard is needed by other prototype form screens already shipping discard dialogs ad-hoc | Route-local copy rejected: would be the third duplicated discard implementation (banners, equipment already hand-roll it); a shared hook is the smaller total footprint                                                                                                                                                                 |

## Progress Tracking

- [x] Phase 0: research.md complete — all decisions recorded
- [x] Phase 1: data-model.md, contracts/member-update.md, quickstart.md generated
- [x] Phase 1: agent context updated (`update-agent-context.sh claude`)
- [x] Constitution Check re-evaluated post-design — PASS (1 justified violation tracked above)
- [ ] Phase 2: tasks.md (`/speckit.tasks` — next command)
