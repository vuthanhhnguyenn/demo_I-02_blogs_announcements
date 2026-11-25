# Research: Blog Detail (ブログ詳細)

**Feature**: `specs/blog-detail/spec.md` | **Date**: 2026-11-13 | **Follow-up of**: `specs/blog-list` (research R1–R11 still apply)

Sources: spec.md (Q1–Q2 + inherited Q1/Q2/Q4/Q6), prototype `fitness-crm-ui/src/pages/blog-detail.tsx`@47d60ac, live swagger (`GET/PATCH/DELETE /api/v1/admin/notices/{noticeId}`, `PATCH …/publish-status`, `POST …/wordpress-sync`, fetched 2026-11-11), existing code: blog-list mock (`/crm/notices`), `blogs/` slice, `crm-maintenance` detail (60/40 layout, skeleton), `lessons/[id]` (404 → not-found, read-only Quill), `StatusCard`, `RoleGatedButton`.

---

## D1 — Mock detail endpoint mirrors `NoticeDetailDto`

**Decision**: Add `GET /crm/notices/{id}` returning the real `NoticeDetailDto` field set — every `NoticeDto` field + `body`, `targetStoreIds`, `wordpressSync { status, syncedAt, errorMessage, attemptCount }`, `recentSyncLogs[] { id, syncStatus, syncedAt, errorMessage, triggeredBy, createdAt }` — plus the blog-list gap fields (`articleNo`, `targetStores`, `deletedAt`) and detail gap fields (D4). The list endpoint keeps omitting `body` (real list behaviour).

**Rationale**: Same strategy as blog-list R1: Phase 2 becomes a client swap plus removal of gap fields.

**Alternatives**: Derive the detail from a list query (`GET /crm/notices?…`) — rejected: no body, and diverges from the real contract.

## D2 — Body = rich-text HTML, rendered with the existing read-only Quill pattern

**Decision**: `body` is HTML produced by the (future) form's rich-text editor. The 本文 card and the preview dialog render it with `react-quill-new` in read-only mode, toolbar off, an explicit formats whitelist — copied from `lessons/[id]/_components/lesson-description-card.tsx` (Quill parses into its own model, no raw HTML injection). Formats constant `BLOG_BODY_QUILL_FORMATS` (header, bold, italic, list, link, image) lives in the blog constants so the form reuses it.

**Rationale**: Prototype form toolbar is rich text; `react-quill-new` is already a dependency; avoids `dangerouslySetInnerHTML`.

**Alternatives**: Plain text with line breaks — rejected: loses headings/lists the form will produce. A sanitizer + `dangerouslySetInnerHTML` — rejected: new dependency / pattern.

## D3 — Store scope on the detail (inherited Q4 / FR-014)

**Decision**: The client sends the header store as `storeId` query on `GET /crm/notices/{id}` (only when the header is not 全店舗). The mock returns 404 when the article does not reach that store (same `reachesStore` helper as the list). This query is a **mock-only seam** (gap **BD-05**): the real detail endpoint scopes by the caller's token and takes no `storeId`. The query key includes `storeId`, so switching the header store refetches and an out-of-scope article falls into the not-found state (spec edge case).

**Rationale**: The mock cannot identify real callers (blog-list R3/R4); the header encodes the role's reach, exactly as on the list.

**Alternatives**: Client-side reach check after fetching — rejected: duplicates the server rule and needs the store's brand on the client.

## D4 — Gaps vs the real detail contract

| ID    | Need (spec ref)                                     | Real API today                                        | Mock (Phase 1)                                             |
| ----- | --------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| BD-01 | Open a deleted article (FR-020, US3)                | GET on a soft-deleted row → 404 (deleted rows hidden) | GET returns it with `deletedAt` set                        |
| BD-02 | 作成者 / 最終更新者 names (FR-009)                  | `createdBy` / `updatedBy` staff UUIDs only            | `createdByName`, `updatedByName`                           |
| BD-03 | Target store names (FR-005)                         | `targetStoreIds` only                                 | `targetStores { id, name }[]` (same as blog-list B-03)     |
| BD-04 | Status-card time for 非公開 / 削除済み (FR-007)     | no status-change timestamp; no `deletedAt`            | 非公開 uses `updatedAt`; 削除済み uses `deletedAt` (B-05)  |
| BD-05 | Store-scoped detail for the header store (FR-019)   | scoped by token, no `storeId` param                   | `storeId` query seam → 404 when not reaching               |
| BD-06 | Restore (FR-014)                                    | no endpoint                                           | existing `POST /crm/notices/{id}/restore` (blog-list B-06) |
| —     | Article number, sync state on rows (FR-001, FR-008) | see blog-list B-02 / B-04                             | `articleNo`; `wordpressSync` already real on detail        |

Supported as-is and mirrored: `body`, `targetStoreIds`, `wordpressSync`, `recentSyncLogs`, `PATCH …/publish-status` (unpublish / cancel schedule = `unpublished`), `DELETE` (204, Manager+, `E-NTC-005`).

Not wired by decision: `POST …/wordpress-sync` (Q2 = no re-sync), hard delete (Q1 = none; no real endpoint either), `PATCH /notices/{id}` (form spec).

## D5 — Mutations from the detail reuse the blog-list mock routes

**Decision**: 非公開にする and 予約を取り消す → `PATCH /crm/notices/{id}/publish-status { publishStatus: 'unpublished' }` (the existing route already allows published/scheduled → unpublished); 削除 → `DELETE /crm/notices/{id}`; 復元する → `POST /crm/notices/{id}/restore`. On success invalidate both the detail query and the list query keys; stay on the detail (it re-renders in the new state).

## D6 — Screen structure and reuse

**Decision**:

- Route: replace the placeholder `src/app/(private)/blogs/[id]/page.tsx`; route-local code in `blogs/[id]/_components/`, `_hooks/`.
- Layout / skeleton: copy `crm-maintenance` detail (`flex gap-4`, left `w-[60%]`, right `w-[40%]` with `sticky top-0`), skeleton matching it.
- Not-found: `lessons/[id]` pattern — 404 from the detail query → `DataStateBoundary` empty state with a back link; other errors → error + retry.
- Header: `PageHeader` + `BackToListLink label="ブログ管理に戻る" listPath={navigate('/blogs')}` (keeps list return-to).
- Status card: shared `StatusCard` (`tone`, `icon`, `label`, `meta`, `action`).
- Gated buttons: `RoleGatedButton` with `allowedRoles={scopedBlogEditRoles(isOwnArticle(...))}` + `denyTooltip` (edit / unpublish / cancel schedule) and `requiredPermission` (`BlogsDelete`, `BlogsRestore`) — the button variant shows `denyTooltip`, so the I1 badge problem of the list menu does not apply here.
- Preview: extend the existing `blogs/_components/blog-preview-dialog.tsx` with an optional `body` (rendered via D2) instead of a second preview component; the list keeps passing no body (placeholder copy).
- Edit: `router.push(withReturnTo(navigate('/blogs/[id]/edit', id)))` — same navigation pattern as the list (RoleGatedButton drops onClick when denied).

## D7 — Seed

**Decision**: Add `body` (short HTML: paragraphs, an `<h2>`, a list) to every blog seed row, a staff-name map for `createdByName` / `updatedByName` (real dev staff IDs from blog-list T001 + a fallback name), `wordpressSync.errorMessage` / `attemptCount` for failed rows, and 1–3 `recentSyncLogs` per sync target. Keep ≥1 published WEB-off row (`sync-excluded`), ≥1 scheduled, draft, unpublished, deleted row, each with and without category / thumbnail / end date.
