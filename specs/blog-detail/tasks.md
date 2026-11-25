# Tasks: Blog Detail (ブログ詳細)

**Input**: Design documents from `/specs/blog-detail/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, checklists/parity.md)
**Prerequisites**: plan.md, spec.md (Q1–Q2 resolved), blog-list implemented (notices mock, `blogs/` slice)
**V0 source**: `fitness-crm-ui/src/pages/blog-detail.tsx`@47d60ac — abbreviated below as `blog-detail.tsx`
**Tests**: none (constitution "No Testing Policy"); verification = type-check, lint, build, quickstart.md, verify-parity.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 read detail · US2 unpublish / cancel schedule · US3 delete / restore · US4 preview / edit

---

## Phase 1: Setup

- [x] T001 Confirm branch `blog-list`, dev server running, `/blogs` locally un-gated (blog-list T032 still pending — do not commit the un-gating); read research.md D1–D7 and the existing mock files `src/app/api/_schemas/notice.schema.ts`, `src/app/api/_mock-db/{types/notices.type.ts,tables/notice.table.ts,seeds/notice.seed.ts}`, `src/app/api/crm/notices/[id]/route.ts`.

---

## Phase 2: Foundational (blocking)

- [x] T002 Extend `src/app/api/_schemas/notice.schema.ts`: `NoticeWordpressSyncDetailSchema` (`status`, `syncedAt`, `errorMessage: string|null`, `attemptCount: number`), `NoticeSyncLogSchema` (`id`, `syncStatus`, `syncedAt`, `errorMessage`, `triggeredBy`, `createdAt`), `NoticeDetailSchema` = all `NoticeListItem` fields with `wordpressSync` widened to the detail shape + `body` (string), `targetStoreIds` (string[]), `recentSyncLogs`, `createdByName`, `updatedByName` (string|null; gap BD-02); `GetNoticeDetailQueryParamsSchema` `{ storeId?: string }` (mock seam BD-05, describe it in `.openapi({ description })`); export `z.infer` types. Keep `NoticeListItemSchema` unchanged (list stays body-free).
- [x] T003 Extend the mock record and seed: `src/app/api/_mock-db/types/notices.type.ts` (`NoticeRecord` gains `body`, `recentSyncLogs`, `createdByName`, `updatedByName`, and the detail `wordpressSync` shape); `src/app/api/_mock-db/seeds/notice.seed.ts` per research D7 — HTML `body` for every row (paragraphs + one `<h2>` + a `<ul>`; can be generated from the title by a helper), names map keyed by `SEED_STAFF_IDS` (+ fallback name), `errorMessage` / `attemptCount` on failed / pending sync rows, 1–3 `recentSyncLogs` per sync target; `src/app/api/_mock-db/tables/notice.table.ts` — add `enrichNoticeDetail(row, categoryName)` and make the existing list `enrichNotice` strip `body`, `recentSyncLogs`, `createdByName`, `updatedByName` and narrow `wordpressSync` back to `{status, syncedAt}` so `GET /crm/notices` responses are byte-for-byte the same shape as before. Restore / publish-status / delete must also set `updatedAt` (and `updatedByName` to the fallback operator name).
- [x] T004 Add `GET` to `src/app/api/crm/notices/[id]/route.ts` per contracts/get-notice-detail.md: `registerRoute` (tag `Notices`, query `GetNoticeDetailQueryParamsSchema`, 200 `NoticeDetailSchema`, 404 `ErrorResponseSchema`); unknown id → 404; when `storeId` is given and `reachesStore(row, store)` is false → 404 (unknown store id: only `company` rows and `store` rows naming it reach, same as the list); deleted rows ARE returned (BD-01). `_routes/index.ts` already imports this file — verify.
- [x] T005 With the dev server running: `npm run generate-openapi` then `npm run generate-api`; confirm `getCrmNoticesByIdOptions` / `getCrmNoticesByIdQueryKey` (names as generated) in `src/lib/api/@tanstack/react-query.gen.ts`. Do not hand-edit `src/lib/api/**`. Smoke: `curl` a published, a deleted, an unknown id, and a store-scoped miss (`storeId` of a FIT365 directory store on a JOYFIT brand row → 404); confirm `GET /crm/notices?type=blog` rows still have no `body`.
- [x] T006 [P] Shared types/constants: add `BlogDetail` (= generated detail response type) to `src/app/(private)/blogs/_types/blog.type.ts`; add `BLOG_BODY_QUILL_FORMATS` (`header`, `bold`, `italic`, `list`, `link`, `image` — mirror `LESSON_DESCRIPTION_QUILL_FORMATS` in `src/app/(private)/lessons/_constants/constants.ts`) and detail copy constants (status-card meta suffixes, WP notes, deny tooltips 「自分が作成した記事のみ編集・公開切替できます」/「編集・公開切替の権限がありません」/「削除権限がありません」) to `src/app/(private)/blogs/_constants/blog.constants.ts`.

**Checkpoint**: `GET /api/crm/notices/{id}` returns detail; list unchanged; type-check passes.

---

## Phase 3: User Story 1 — Read the full detail (P1) 🎯 MVP

**Goal**: all cards, every status variant, not-found, skeleton.
**Independent test**: quickstart checks 1–4, 13–14, 16.

- [x] T007 [P] [US1] Create `src/app/(private)/blogs/[id]/_components/blog-detail-status-badge.tsx` — outline badge text-xs font-medium with leading `size-1.5` dot, per display status (公開予定 info, 非公開 muted, 下書き muted, 削除済み destructive, 公開中 success) — port from `blog-detail.tsx` › statusBadge (L80-L106); satisfies PAR003.
- [x] T008 [P] [US1] Create `src/app/(private)/blogs/[id]/_components/blog-detail-basic-info-card.tsx` (基本情報: タイトル, カテゴリ outline badge or 未分類, サムネイル `next/image` in `max-w-[320px] aspect-video rounded-lg border` or ImageIcon placeholder; no 種別) and `blog-detail-body-card.tsx` (本文: read-only Quill exactly like `src/app/(private)/lessons/[id]/_components/lesson-description-card.tsx` — `next/dynamic` ssr:false, `readOnly`, toolbar off, `BLOG_BODY_QUILL_FORMATS`, `text-sm leading-relaxed`; empty → 「本文はありません」) — port from `blog-detail.tsx` (L211-L263); satisfies PAR011-PAR013.
- [x] T009 [P] [US1] Create `src/app/(private)/blogs/[id]/_components/blog-detail-target-card.tsx` (配信対象: 2-col grid — 配信スコープ secondary badge, 対象ブランド outline badge(s) using `getTargetBrandCodes` / `BLOG_BRAND_LABELS` or 全ブランド for 全社, 対象店舗 "全店舗" or store names) and `blog-detail-publish-card.tsx` (公開設定: 公開ステータス = `BlogDetailStatusBadge`, 掲載先 badges Globe WEBサイト / Smartphone モバイルアプリ per channel, 公開日時 / 公開予定日時 label, 掲載終了日; dates via `formatDateYYYYMMDD_HHMM` / `formatDateYYYYMMDD` with "—") — port from `blog-detail.tsx` (L266-L325); satisfies PAR014-PAR017.
- [x] T010 [P] [US1] Create `src/app/(private)/blogs/[id]/_components/blog-detail-wp-sync-card.tsx` per data-model "WordPress連携" rules (precedence 連携対象外 → 未連携 → sync state; time = `wordpressSync.syncedAt`): 同期ステータス badge (連携対象外 / 未連携 muted; 同期済み outline + Check; 同期失敗 destructive tone + AlertCircle; 未同期 muted + Clock — reuse `BLOG_WP_SYNC_*` classes from the list where they fit), 最終同期 time row, notes; no re-sync action (Q2) — port from `blog-detail.tsx` (L439-L481); satisfies PAR023-PAR028.
- [x] T011 [P] [US1] Create `src/app/(private)/blogs/[id]/_components/blog-detail-meta-card.tsx` (その他情報: 作成日時, 作成者 with `size-6` initial avatar, 更新日時, 最終更新者 with avatar; name null → "—") — port from `blog-detail.tsx` (L484-L515); satisfies PAR029.
- [x] T012 [P] [US1] Create `src/app/(private)/blogs/[id]/_components/blog-detail-status-card.tsx` — `StatusCard` (`src/components/common/status-card.tsx`) per status: 公開中 success Globe "{日時} 公開"; 公開予定 info Clock "{日時} に自動公開されます"; 非公開 muted Globe "{updatedAt} 非公開に変更"; 下書き muted FileText "{updatedAt} 最終保存"; 削除済み destructive Trash2 "{deletedAt} 削除"; accept an optional `action` node (filled in US2) — port from `blog-detail.tsx` (L332-L436); satisfies PAR020-PAR022 (PAR018-PAR019 completed in T016).
- [x] T013 [P] [US1] Create `src/app/(private)/blogs/[id]/_components/blog-detail-skeleton.tsx` mirroring the 60/40 layout (pattern: `src/app/(private)/crm-maintenance/_components/detail/crm-maintenance-detail-skeleton.tsx`).
- [x] T014 [US1] Replace `src/app/(private)/blogs/[id]/page.tsx` with the detail page (client, `'use client'` + justification comment, `Suspense` wrapper): read `id` via `useParams`; header store via `useCurrentStore()` → `storeId` query only when not `ALL_STORES`; `useQuery(getCrmNoticesByIdOptions({ path: { id }, query }))`; 404 or `type !== 'blog'` → not-found via `DataStateBoundary` empty state with back link (pattern `src/app/(private)/lessons/[id]/page.tsx` L60-L80), other errors → error + retry, loading → T013 skeleton; `PageHeader` with `breadcrumb={<BackToListLink label="ブログ管理に戻る" listPath={navigate('/blogs')} />}`, `title`, `subtitle={articleNo}`, `badge={<BlogDetailStatusBadge/>}`, `actions` slot (T015/T020/T024); body `main` `px-6 py-4` scrolling, `flex gap-4` → left `w-[60%] flex flex-col gap-4` (basic, body, target, publish cards) / right `w-[40%]` → `sticky top-0 flex flex-col gap-4` (status, WP, meta cards) — port from `blog-detail.tsx` (L120-L133, L205-L209, L329-L330); satisfies PAR001-PAR002, PAR009-PAR010.

**Checkpoint**: every status variant renders read-only; not-found works for unknown id and out-of-scope store.

---

## Phase 4: User Story 2 — Unpublish / cancel schedule (P1)

**Goal**: gated status-card actions with confirmation.
**Independent test**: quickstart checks 5, 6, 11, 12.

- [x] T015 [P] [US2] Create `src/app/(private)/blogs/[id]/_components/blog-detail-confirm-dialog.tsx` — one controlled `AlertDialog` with a copy map for `unpublish` / `cancelSchedule` / `delete` / `restore` (titles, descriptions, button labels verbatim from spec FR-011–FR-014; destructive action class for unpublish / cancelSchedule / delete; confirm + cancel disabled while pending), structure like `src/app/(private)/blogs/_components/blog-confirm-dialogs.tsx` — port from `blog-detail.tsx` (L166-L181, L351-L364, L389-L402, L522-L535); satisfies PAR030-PAR033, PAR035.
- [x] T016 [US2] Create `src/app/(private)/blogs/[id]/_hooks/use-blog-detail-actions.hook.ts` — mutations `patchCrmNoticesByIdPublishStatusMutation` (`unpublished`), `deleteCrmNoticesByIdMutation`, `postCrmNoticesByIdRestoreMutation`; on success toast (「記事を非公開にしました」, 「予約公開を取り消しました」, 「記事を削除しました」 + 「ゴミ箱に移動しました。一定期間内であれば復元できます」, 「記事を復元しました」 + 「非公開の状態で復元されています」) and invalidate `getCrmNoticesByIdQueryKey(...)` and `getCrmNoticesQueryKey()`; `onError` (no toast — the global MutationCache toasts) also invalidates both keys, so a conflict / deleted-elsewhere / out-of-scope article refetches and a 404 falls into the not-found state (pattern: `src/app/(private)/(equipment-management)/equipment/[id]/_components/equipment-status-dialog.tsx` onError); toast copy 「予約公開を取り消しました」 is our call (V0 detail has no toasts), delete / restore toasts reuse the list copy; expose `{ confirmKind, openConfirm, closeConfirm, confirm, isPending }`. Then wire the status-card action in `blog-detail-status-card.tsx` / `page.tsx`: full-width `size="sm"` outline `RoleGatedButton` 非公開にする (公開中) / 予約を取り消す (公開予定) with `allowedRoles={scopedBlogEditRoles(isOwnArticle(detail, user?.staffId))}` and `denyTooltip` = Staff non-author 「自分が作成した記事のみ編集・公開切替できます」 else 「編集・公開切替の権限がありません」 — port from `blog-detail.tsx` (L108-L118, L338-L404); satisfies PAR018-PAR019.

**Checkpoint**: Manager unpublishes / cancels; Staff gated by authorship; Observer gated.

---

## Phase 5: User Story 3 — Delete / restore (P2)

**Goal**: delete to 削除済み view, restore, no permanent delete.
**Independent test**: quickstart checks 7, 8, 11.

- [x] T017 [US3] Create `src/app/(private)/blogs/[id]/_components/blog-detail-header-actions.tsx` (deleted vs non-deleted sets): non-deleted → 削除 (outline, Trash2, `text-destructive hover:text-destructive`, `RoleGatedButton requiredPermission={Permission.BlogsDelete}` + `denyTooltip="削除権限がありません"`) · [プレビュー slot, T019] · [編集 slot, T020]; deleted → only 復元する (outline, RotateCcw, `requiredPermission={Permission.BlogsRestore}`, deny tooltip). Do NOT render 完全削除 or its dialog (Q1). Wire 削除 / 復元する to the T016 hook + T015 dialog in `page.tsx` — port from `blog-detail.tsx` (L135-L165); satisfies PAR004 (削除 part), PAR006, PAR008, PAR034 (absence).

**Checkpoint**: delete keeps the user on the page in 削除済み state; restore returns to 非公開.

---

## Phase 6: User Story 4 — Preview / edit (P3)

**Goal**: preview with real body; edit navigation.
**Independent test**: quickstart checks 9, 10.

- [x] T018 [P] [US4] Extend `src/app/(private)/blogs/_components/blog-preview-dialog.tsx` with an optional `body?: string | null` (add it to the `BlogPreviewArticle` pick or a separate prop): when provided, render it with the read-only Quill pattern (T008) in both tabs (PC full; mobile inside the `max-h-[480px]` scroll area); when absent keep today's placeholder copy so the list renders unchanged — port from `blog-detail.tsx` (L554-L653); satisfies PAR036-PAR038.
- [x] T019 [US4] Add プレビュー to `blog-detail-header-actions.tsx` (outline, Eye; hidden for 下書き and 削除済み) opening `BlogPreviewDialog` with `{ id, title, categoryName, publishStartAt, body }` — port from `blog-detail.tsx` (L182-L188); satisfies PAR004 (プレビュー part), PAR005.
- [x] T020 [US4] Add 編集 to `blog-detail-header-actions.tsx` (outline, Pencil, `RoleGatedButton allowedRoles={scopedBlogEditRoles(isOwn)}` + the T016 deny tooltips) navigating `router.push(withReturnTo(navigate('/blogs/[id]/edit', id)))` — port from `blog-detail.tsx` (L189-L199); satisfies PAR004 (編集 part), PAR007.

**Checkpoint**: preview shows the body; edit lands on the placeholder and back returns here.

---

## Phase 7: Polish & Cross-Cutting

- [x] T021 `npm run type-check` and `npm run lint` → 0 errors (pre-existing `qrcode.react` error excepted); `npm run build` once the dev server is stopped (with blog-list T029).
- [ ] T022 Run quickstart.md checks 1–16 in the browser (Headquarter; Manager / Staff / Observer / Trainer as available); confirm the list screen is unchanged (rows body-free, preview placeholder unchanged).
- [x] T023 Run the `verify-parity` skill against `specs/blog-detail/checklists/parity.md`; fix unmet items.
- [x] T024 [P] Update `specs/blog-detail/spec.md` / research.md D4 if implementation forced any change; keep the BD gap table current.

---

## Dependencies & Execution Order

- T001 → T002 → T003 → T004 → T005; T006 after T005 (needs the generated type).
- US1: T007–T013 in parallel after T006; T014 after them.
- US2: T015 [P] anytime after T006; T016 after T012, T014, T015.
- US3: T017 after T016.
- US4: T018 [P] after T006; T019, T020 after T017 (same file).
- Polish after all stories.

## Parallel Examples

- Foundational: T006 alongside smoke checks of T005.
- US1: T007, T008, T009, T010, T011, T012, T013 together (separate files), then T014.
- Cross-story: T015 and T018 can run with the US1 card tasks.

## Implementation Strategy

1. **MVP** = Phase 1–3 (read-only detail in every variant, not-found, skeleton).
2. US2 (status-card actions) → US3 (delete / restore) → US4 (preview body, edit).
3. Polish: gates, quickstart, verify-parity.

## Parity coverage

PAR001–002 T014 · PAR003 T007 · PAR004 T017+T019+T020 · PAR005 T019 · PAR006 T017 · PAR007 T020 (+T016 tooltips) · PAR008 T017 · PAR009–010 T014 · PAR011–013 T008 · PAR014–017 T009 · PAR018–019 T016 · PAR020–022 T012 · PAR023–028 T010 · PAR029 T011 · PAR030–033, PAR035 T015 · PAR034 T017 (absence) · PAR036–038 T018. All 38 items claimed.
