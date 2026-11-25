# Implementation Plan: Blog Detail (ブログ詳細)

**Branch**: `blog-list` (shared with list + form) | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/blog-detail/spec.md`

## Summary

Phase 1 (mock) build of the I-02 ブログ詳細 screen at `/blogs/[id]`, replacing the blog-list placeholder. Reproduces prototype `blog-detail.tsx`@47d60ac (6 variants) with spec decisions Q1 (no 完全削除), Q2 (no 再同期) and the inherited blog-list rules (Q1/Q2/Q4/Q6). Data comes from a new `GET /crm/notices/{id}` on the existing notices mock, mirroring the real `NoticeDetailDto`; the existing publish-status / delete / restore mock routes are reused. Gaps BD-01…BD-06 go to the backend (research D4).

Technical approach:

- **Mock**: extend `notice.schema.ts` (detail schema), the notices table/seed (`body`, names, sync detail), add `crm/notices/[id]` GET next to the existing DELETE, register in `_routes/index.ts`, regenerate the client.
- **UI**: `src/app/(private)/blogs/[id]/` — `PageHeader` + `BackToListLink`, 60/40 two-column layout (crm-maintenance pattern), shared `StatusCard`, `RoleGatedButton`, read-only Quill body (lesson-description pattern), `AlertDialog` confirmations, `DataStateBoundary` with 404 → not-found (lessons pattern); extend the list's preview dialog with an optional body.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any), Node.js ≥ 24  
**Primary Dependencies**: Next.js 16 (App Router), React 19, TanStack React Query 5 (generated `src/lib/api` hooks), shadcn/ui, lucide-react, sonner, Zod 4, `react-quill-new` (already used for read-only rich text), `next/image`, date-fns v4 via `src/utils/date.util.ts` — all present, no additions  
**Storage**: Phase 1 — `src/app/api/_mock-db/` notices table (shared with blog-list); Phase 2 — `src/lib/api-real` via `integrate-real-api`  
**Testing**: none automated (constitution); type-check, lint, build, `quickstart.md`, `verify-parity`  
**Target Platform**: CRM web, ≥ 768 px, WCAG AA  
**Project Type**: single Next.js app (UI + co-located mock route handlers)  
**Performance Goals**: actions reflect within 2 s (SC-003)  
**Constraints**: header store / `/crm/me` are real-API backed → detail scope via a mock-only `storeId` seam (D3); I-02 routes Phase-2 gated (blog-list R10); shared branch, single commit at the end  
**Scale/Scope**: 1 page (replaces placeholder), ~9 route-local components, 1 hook, 1 new mock GET, schema/table/seed extensions, 1 shared component extended (preview dialog)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Check                                                                                       | Notes                                                                                                           |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑ All new types use strict TS; no `any`; no unnarrowed `unknown`; named for intent          | Types from `types.gen.ts` / `z.infer`                                                                           |
| II  | OpenAPI-First          | ☑ Phase 1 uses mock DB; Phase 2 uses generated client; no manual `src/lib/api/` edits       | `registerRoute` → generate-openapi → generate-api                                                               |
| III | Spec-Driven            | ☑ `spec.md` approved; all `[NEEDS CLARIFICATION]` tokens resolved before any task begins    | Q1–Q2 resolved 2026-11-13                                                                                       |
| IV  | App Router & Simple UX | ☑ RSC by default; `"use client"` justified; shadcn/ui + Tailwind only; shortest UX path     | Detail page is client (query, dialogs) with comment; Quill loaded via `next/dynamic` (ssr: false) as in lessons |
| V   | Simplicity & Min. Deps | ☑ No new npm packages without justification; no abstraction layers beyond existing patterns | Reuses StatusCard, RoleGatedButton, preview dialog, Quill pattern                                               |

**Initial gate**: PASS. **Post-design re-check**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/blog-detail/
├── spec.md
├── plan.md              # this file
├── research.md          # D1–D7, gap table BD-01…BD-06
├── data-model.md
├── quickstart.md
├── contracts/
│   └── get-notice-detail.md
├── checklists/
│   ├── requirements.md
│   └── parity.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
src/app/(private)/blogs/[id]/
├── page.tsx                                     # replaces placeholder (client, Suspense)
├── _hooks/
│   └── use-blog-detail-actions.hook.ts          # unpublish / delete / restore mutations + toasts + invalidation
└── _components/
    ├── blog-detail-header-actions.tsx           # 削除 · プレビュー · 編集 | 復元する
    ├── blog-detail-status-badge.tsx             # badge with leading dot (header + 公開設定)
    ├── blog-detail-basic-info-card.tsx          # 基本情報
    ├── blog-detail-body-card.tsx                # 本文 (read-only Quill)
    ├── blog-detail-target-card.tsx              # 配信対象
    ├── blog-detail-publish-card.tsx             # 公開設定
    ├── blog-detail-status-card.tsx              # StatusCard per status (+ 非公開にする / 予約を取り消す)
    ├── blog-detail-wp-sync-card.tsx             # WordPress連携
    ├── blog-detail-meta-card.tsx                # その他情報
    ├── blog-detail-confirm-dialog.tsx           # unpublish / cancel-schedule / delete / restore copy map
    └── blog-detail-skeleton.tsx                 # 60/40 skeleton

src/app/(private)/blogs/_components/blog-preview-dialog.tsx   # + optional body (read-only Quill)
src/app/(private)/blogs/_constants/blog.constants.ts          # + BLOG_BODY_QUILL_FORMATS
src/app/(private)/blogs/_types/blog.type.ts                   # + BlogDetail type (from generated response)

src/app/api/_schemas/notice.schema.ts            # + NoticeDetail, sync detail, sync log schemas
src/app/api/_mock-db/types/notices.type.ts       # record gains body, recentSyncLogs, names
src/app/api/_mock-db/tables/notice.table.ts      # + enrichNoticeDetail; list enrich strips detail-only fields
src/app/api/_mock-db/seeds/notice.seed.ts        # + body HTML, staff names, sync errors / logs
src/app/api/crm/notices/[id]/route.ts            # + GET (storeId seam)
src/app/api/_routes/index.ts                     # already imports [id]/route (no change expected)
src/lib/api/**                                   # regenerated
```

**Structure Decision**: Route-local detail slice under `blogs/[id]/`, mirroring `lessons/[id]` and `crm-maintenance` detail; the list's shared pieces (`_types`, `_constants`, `_utils/blog-row.util.ts`, preview dialog) are reused rather than duplicated.

## Connection Points (Do Not Break)

- Blog list screen and its mock contract: list rows must stay body-free; existing PATCH / DELETE / restore behaviour unchanged.
- `blog-preview-dialog.tsx`: the list call site (no body → placeholder copy) must render exactly as before.
- `StatusCard`, `RoleGatedButton`, `DataStateBoundary` shared components — used, not modified.
- `/blogs/create`, `/blogs/[id]/edit` placeholders stay until the form spec.

## Risks & Open Items

- BD-01 (deleted detail) and BD-05 (store seam) change behaviour in Phase 2 — the real API decides visibility from the token; re-verify there.
- FIT QA #329 (inherited Q2) still open — restore gating may change.
- Quill read-only on an empty body: show "—"-style empty copy (lessons shows 「説明はありません」); copy for blog: 「本文はありません」 (my call).

## Complexity Tracking

No constitution violations.

| Violation                                                                       | Why Needed                                                                        | Simpler Alternative Rejected Because                                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 編集 navigates via `router.push` in `onClick` instead of `<Link>` (code-rule V) | `RoleGatedButton` drops `onClick` when denied, so a denied button cannot navigate | A `<Link>` render would stay navigable on the disabled button; same precedent as blog-list and banners |
