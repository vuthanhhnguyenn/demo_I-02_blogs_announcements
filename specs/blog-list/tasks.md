# Tasks: Blog List (ブログ一覧)

**Input**: Design documents from `/specs/blog-list/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, checklists/parity.md)
**Prerequisites**: plan.md, spec.md (Clarifications Q1–Q6)
**V0 source**: `fitness-crm-ui/src/pages/blog-list.tsx`@47d60ac — abbreviated below as `blog-list.tsx`
**Tests**: none (constitution "No Testing Policy"); verification = type-check, lint, build, quickstart.md, verify-parity.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 browse/find · US2 publish/unpublish · US3 delete/restore · US4 preview/navigate

---

## Phase 1: Setup

**Purpose**: capture the real dev ids the seeds depend on (research R3, R5) and confirm the working state.

- [x] T001 Confirm branch `blog-list` and a clean `git status` for `src/`; in the running app (`npm run dev`, logged in as Headquarter) open the network tab, call `GET /api/v1/admin/stores` and record 4–6 stores (`id`, `name`, `brandEnum`): ≥1 Joyfit, ≥1 Joyfit24, ≥1 Fit365, plus the home store of the Staff and Observer test accounts; from `/crm/me` of the Staff test account record its `staffId`. Check the actual format of the stores' `brandEnum` (expected `Joyfit` / `Joyfit24` / `JoyfitYoga` / `JoyfitPlus` / `Fit365`); if it differs, record the mapping to `NoticeBrandCode` next to the constants. Write them as a commented constant block at the top of `src/app/api/_mock-db/seeds/notice.seed.ts` (`NOTICE_STORE_DIRECTORY`, `SEED_STAFF_IDS`) — no credentials, ids/names only.

---

## Phase 2: Foundational (blocking all stories)

**Purpose**: mock contract, data, permissions, routes. ⚠️ No UI story starts before T011.

- [x] T002 Create `src/app/api/_schemas/notice.schema.ts`: enums `NoticeType` (notice|blog), `NoticeBrandScope` (company|brand|store), `NoticeBrandCode` (Joyfit|Joyfit24|JoyfitYoga|JoyfitPlus|Fit365), `NoticeStoreScope` (all|specific), `NoticePublishStatus` (draft|scheduled|published|unpublished), `NoticeWordpressSyncStatus` (pending|success|failed), `NoticeSortBy` (articleNo|title|brandScope|target|publishStartAt|status); row schema `NoticeListItem` with every field of data-model.md (incl. gap fields `articleNo`, `targetStores`, `wordpressSync`, `deletedAt`); `GetNoticesQueryParams` per contracts/get-notices.md (`publishStatus` filter enum adds `deleted`, `categoryId` accepts `none`, `limit` ∈ 25/50/100 default 50, `sort` default `articleNo`, `order` default `desc`); `GetNoticesResponse` `{ items, pagination: { page, limit, totalItems, totalPages }, totalAllItems }` (B-11); `PatchNoticePublishStatusBody` `{ publishStatus: 'published' | 'unpublished' }`; export `z.infer` types. Every schema `.openapi({ title })` like `banner.schema.ts`.
- [x] T003 Create `src/app/api/_mock-db/seeds/notice.seed.ts` (below the T001 constants): ≥60 `blog` rows + ~5 `notice` rows meeting data-model.md "Seed coverage"; `articleNo` `BL-YYYY-NNNN` / `NT-YYYY-NNNN`; `categoryId` from blog-type ids in `seeds/article-category.seed.ts` (and some null); 店舗指定 rows target `NOTICE_STORE_DIRECTORY` ids; several rows `createdBy = SEED_STAFF_IDS.staff`; ISO datetimes in JST offset.
- [x] T004 Create `src/app/api/_mock-db/types/notices.type.ts` (`NoticesType`: `_rows`, `_seeded`, `_seed()`, `getList()`, `getById()`, `update(id, patch)`, `getStoreById(id)`) and `src/app/api/_mock-db/tables/notice.table.ts` implementing it plus pure helpers `reachesStore(row, store)` and `matchesBrandFilter(row, code)` per data-model.md / research R2; register in `src/app/api/_mock-db/_create-db.ts` (`Object.assign` + `db.notices._seed()`), `src/app/api/_mock-db/_db.types.ts` and `types/index.ts` following the banners entries.
- [x] T005 Create `src/app/api/crm/notices/route.ts` GET per contracts/get-notices.md: `registerRoute` (tag `Notices`), parse with `GetNoticesQueryParamsSchema` (400 `{ error }`), filter `type`, `q` (case-insensitive, literal `%`/`_`), `categoryId` (`none` → null), `brandCode` (R2), `brandScope`, `storeId` (reaches-store via directory; unknown id → company rows + store rows naming it), `channel`, `publishStatus` (absent → all incl. deleted; `deleted` → deleted only; else exclude deleted), `publishFrom`/`publishTo` on JST date of `publishStartAt` (nulls never match); sort (`target` = family/sub-brand label then store name; `status` by display status) then paginate (`totalPages` ≥ 1); `totalAllItems` = rows matching `type` + `storeId` only; resolve `categoryName` from `db.articleCategories`.
- [x] T006 [P] Create `src/app/api/crm/notices/[id]/publish-status/route.ts` PATCH per contracts/notice-row-actions.md (idempotent; `published` sets `publishStartAt` when null; deleted/unknown → 404; returns row).
- [x] T007 [P] Create `src/app/api/crm/notices/[id]/route.ts` DELETE (soft delete `deletedAt = now`, 204; already deleted/unknown → 404).
- [x] T008 [P] Create `src/app/api/crm/notices/[id]/restore/route.ts` POST (clear `deletedAt`, `publishStatus = unpublished`, returns row; not deleted/unknown → 404).
- [x] T009 With dev server running: `npm run generate-openapi` then `npm run generate-api`; confirm `getCrmNoticesOptions`, `patchCrmNoticesByIdPublishStatusMutation`, `deleteCrmNoticesByIdMutation`, `postCrmNoticesByIdRestoreMutation` (names as generated) exist in `src/lib/api/@tanstack/react-query.gen.ts`. Do not hand-edit `src/lib/api/**`.
- [x] T010 [P] Permissions: add `BlogsView/Create/Edit/Publish/Delete/Restore` to `src/types/permission.type.ts`; in `src/constants/permission.constants.ts` add page map (`/blogs` View, `/blogs/create` Create, `/blogs/:id/edit` Edit, `/blogs/:id` View), role grants (View: System, Headquarter, Manager, Staff, Observer; Create/Edit/Publish: System, Headquarter, Manager, Staff; Delete/Restore: System, Headquarter, Manager) and `PERMISSION_FLAG_RULES` (`canViewContent` for View, `canManageContent` for the rest) next to the Banners entries (research R11).
- [x] T011 Routes + gating: create placeholder files so routes exist — `src/app/(private)/blogs/page.tsx` (temporary stub), `create/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`; append `'/blogs'` under `// I-02` in `src/constants/phase.constants.ts`; add `{ label: 'ブログ管理', href: '/blogs' }` after お知らせ管理 in the コンテンツ group of `src/components/layout/app-sidebar.tsx`; run `npm run generate-routes` and confirm `/blogs`, `/blogs/[id]`, `/blogs/create`, `/blogs/[id]/edit` in `src/lib/routes/routes.config.ts`. For local work only, remove `'/blogs'` from the Phase-2 list (never commit that).

**Checkpoint**: `curl` / browser `GET /api/crm/notices?type=blog` returns paged blog rows; `npm run type-check` passes.

---

## Phase 3: User Story 1 — Browse and find blog articles (P1) 🎯 MVP

**Goal**: scoped, searchable, filterable, sortable, paged list with all cells and states.
**Independent test**: quickstart checks 1–8, 15, 16.

- [x] T012 [P] [US1] Create `src/app/(private)/blogs/_constants/blog.constants.ts`: labels for scope (全社/ブランド指定/店舗指定), brand codes (JOYFIT, JOYFIT+, JOYFIT YOGA, JOYFIT24, FIT365 — half-width "+" per prototype), display status + badge tone (公開中 success, 公開予定 info, 下書き muted, 非公開 warning, 削除済み destructive), channel, WP sync; filter option arrays in V0 order; `BLOG_PAGE_SIZES = [25, 50, 100]`, default 50 — port from `blog-list.tsx` (L138-L188, L209, L484-L562).
- [x] T013 [P] [US1] Create `src/app/(private)/blogs/_utils/blog-row.util.ts`: `getDisplayStatus(row)`, `isWpSyncTarget(row)`, `getTargetLabel(row)`, `isOwnArticle(row, staffId)` per data-model.md, and `scopedBlogEditRoles(isOwn)` (System, Headquarter, Manager + Staff only when own) per research R5.
- [x] T014 [US1] Create `src/app/(private)/blogs/_hooks/use-blog-filters.hook.ts` (single nuqs instance, pattern of `banners/_hooks/use-banners-filters.ts`): URL keys `page, limit, q, categoryId, brandCode, brandScope, storeId, channel, publishStatus, publishFrom, publishTo, sort, order`; debounced search; `updateFilter` resets page 1; `clearFilters`; `hasActiveFilters`; `activeDetailFilterCount` counting store only when header = 全店舗; `queryParams` with `type: 'blog'` and `storeId` = header store when not `ALL_STORES` (from `useCurrentStore`), else the in-panel store filter; `showStoreFilter` = header is 全店舗 — port from `blog-list.tsx` (L222-L227, L254-L280); satisfies PAR008, PAR018, PAR054.
- [x] T015 [P] [US1] Create `src/app/(private)/blogs/_components/blog-status-badge.tsx`, `blog-wp-sync-badge.tsx` (同期済み + tooltip "最終同期 {日時}" via `date.util`, 同期失敗 destructive, 未同期 muted, "—" for non-targets) and `blog-target-cell.tsx` (全ブランド・全店舗 / brand badge / brand badge + store names) — port from `blog-list.tsx` (L138-L188, L681-L693, L709-L733); satisfies PAR030, PAR033, PAR034.
- [x] T016 [US1] Create `src/app/(private)/blogs/_components/blog-table-columns.tsx`: columns ID, thumbnail (no label), タイトル, カテゴリ, 配信スコープ, 対象, 掲載先, 公開日, ステータス, WP連携, menu (no label); sortable headers with ArrowUpDown/ArrowUp/ArrowDown and tooltips "クリックで昇順ソート"/"クリックで降順ソート"; cells: muted `articleNo`, 48×32 `next/image` thumbnail or dashed ImageIcon placeholder, title + 削除済み badge, category secondary badge or dashed 未分類, scope badge variants, WEB (Globe) / アプリ (Smartphone) outline badges, `formatDateYYYYMMDD_HHMM` or "—"; menu cell stops row-click propagation (menu content filled in T022) — port from `blog-list.tsx` (L287-L295, L379-L406, L594-L734); satisfies PAR020-PAR023, PAR025-PAR032, PAR035.
- [x] T017 [US1] Create `src/app/(private)/blogs/_components/blog-filters.tsx`: search input (Search icon, "タイトルで検索...", ~400px), right-aligned toggle "詳細フィルター"/"閉じる" with SlidersHorizontal + Chevron, filled variant + count badge when active; expanded panel in order カテゴリ (全カテゴリ, 未分類, blog categories from `getCrmArticleCategoriesOptions({ query: { type: 'blog' } })`), ブランド, 配信範囲, 店舗 (only when `showStoreFilter`; options from the real store master as in `equipment-filters.tsx`), 掲載先, ステータス (incl. 削除済み（ゴミ箱）), 公開日 from 〜 to (`Datepicker`, placeholders 公開日（開始）/公開日（終了）); changed controls highlighted; every `<Select>` gets `items={toSelectItems(...)}` — port from `blog-list.tsx` (L202-L206, L452-L579); satisfies PAR005-PAR017.
- [x] T018 [US1] Replace the stub `src/app/(private)/blogs/page.tsx` with the list (client component, comment justifying `'use client'`, `Suspense` wrapper as banners): `PageHeader` "ブログ管理" + count badge from `totalAllItems` (pattern of `article-categories/page.tsx`); `FilterResult` banner (`filteredCount = pagination.totalItems`, `totalCount = totalAllItems`, summary joined "・", quoted search, "公開日From: …"/"公開日To: …", clear); `DataStateBoundary` (skeleton, empty entity "ブログ", filtered-empty with 条件をクリア, error + retry); `DataTable` manual sorting with `getRowId: row.id`; row click → `navigate('/blogs/[id]', id)` via `withReturnTo`; `TablePaginationWithSize` (footer text "全 N 件 / P ページ / a-b を表示", 25/50/100); clamp page when `page > totalPages` — port from `blog-list.tsx` (L297-L315, L414-L417, L583-L652, L888-L933); satisfies PAR001, PAR019, PAR024, PAR049-PAR053.

**Checkpoint**: quickstart 1–8, 15, 16 pass as Headquarter.

---

## Phase 4: User Story 2 — Publish / unpublish (P1)

**Goal**: gated publish toggle with confirmation and immediate effect.
**Independent test**: quickstart checks 9 (publish part) and 10.

- [x] T019 [P] [US2] Create `src/app/(private)/blogs/_components/blog-confirm-dialogs.tsx`: controlled `AlertDialog`s — unpublish ("記事を非公開にしますか？", description per parity, キャンセル / 非公開にする), publish ("記事を公開しますか？", キャンセル / 公開する), delete ("記事を削除しますか？", destructive 削除する); close/キャンセル clears the target, confirm disabled while pending — port from `blog-list.tsx` (L799-L885); satisfies PAR042-PAR045.
- [x] T020 [US2] Create `src/app/(private)/blogs/_components/blog-row-menu.tsx` (non-deleted part): MoreHorizontal 32×32 trigger; items プレビュー (Eye) · 編集 (Pencil) · separator · 非公開にする (Ban, warning) for 公開中/公開予定 or 公開にする (Globe, success) for 下書き/非公開 · separator · 削除 (Trash2, destructive); 編集 / 公開系 via `RoleGatedMenuItem requiredPermission={BlogsEdit|BlogsPublish}` + `allowedRoles={scopedBlogEditRoles(isOwnArticle(row, user.staffId))}` — own-record pattern of `lesson-schedules/[id]/reservations/_utils/session-scope.util.ts`: not own → Staff dropped from the roles, so the component's denied path renders the badge; `denyBadge="他者作成"` when the user is Staff (`useAuthUser().hasRole([UserRole.Staff])`), default otherwise; do NOT use the `disabled` prop for this (it shows no badge — analyze I1); `scopedBlogEditRoles` lives in `_utils/blog-row.util.ts`; 削除 `requiredPermission={BlogsDelete}`; 編集 navigates with `<Link>` to `/blogs/[id]/edit` — port from `blog-list.tsx` (L641-L646, L735-L775); satisfies PAR036-PAR039.
- [x] T021 [US2] Wire publish/unpublish in `src/app/(private)/blogs/page.tsx`: `useMutation(patchCrmNoticesByIdPublishStatusMutation())`, on success invalidate the notices query key and toast "記事を公開しました" / "記事を非公開にしました"; no local `onError` toast (global `MutationCache`).
- [x] T022 [US2] Plug `blog-row-menu.tsx` into the menu cell of `blog-table-columns.tsx` (callbacks for preview / publish / unpublish / delete / restore passed from the page).

**Checkpoint**: Manager toggles any row; Staff only own rows, others show 他者作成.

---

## Phase 5: User Story 3 — Delete and restore (P2)

**Goal**: logical delete with trash visibility and gated restore.
**Independent test**: quickstart checks 7, 9 (delete/restore), 10 (Staff disabled).

- [x] T023 [US3] Extend `src/app/(private)/blogs/_components/blog-row-menu.tsx` for deleted rows: only 復元する (RotateCcw, success) via `RoleGatedMenuItem requiredPermission={BlogsRestore}` (Clarification Q2) — port from `blog-list.tsx` (L777-L787); satisfies PAR040.
- [x] T024 [US3] Wire delete and restore in `src/app/(private)/blogs/page.tsx`: delete mutation → toast "記事を削除しました" with description "ゴミ箱に移動しました。一定期間内であれば復元できます"; restore mutation → toast "記事を復元しました" / "非公開の状態で復元されています"; invalidate list; for a 403 with `E-NTC-005` (Phase 2) the message 「削除権限がありません」 comes from the error code mapping, not message text — port from `blog-list.tsx` (L780-L783, L859-L885); satisfies PAR041, PAR044.

**Checkpoint**: delete → 削除済み row dimmed; filter 削除済み（ゴミ箱）; restore → 非公開.

---

## Phase 6: User Story 4 — Preview and navigate (P3)

**Goal**: preview dialog, header actions, placeholder destinations.
**Independent test**: quickstart checks 11–14.

- [x] T025 [P] [US4] Create `src/app/(private)/blogs/_components/blog-preview-dialog.tsx`: `Dialog` "プレビュー" (max-w-4xl, scrollable), tabs PC (Monitor, default) / モバイル (Smartphone); PC browser frame with URL "https://www.joyfit.jp/blog/{id}", category badge, title, publish date or "未公開", image placeholder, "記事の本文がここに表示されます...", note "※ 実際のWEBサイト表示と異なる場合があります"; mobile 375px frame with "9:41", label "ブログ", same fields, note "※ 実際のアプリ表示と異なる場合があります" — port from `blog-list.tsx` (L939-L1018); satisfies PAR046-PAR048.
- [x] T026 [P] [US4] Create `src/app/(private)/blogs/_components/blog-list-header-actions.tsx`: outline "カテゴリマスタを編集" (FolderOpen) as `RoleGatedButton allowedRoles={[Headquarter, System]}` tooltip "カテゴリマスタ管理は本部のみ操作できます", `<Link>` to `/article-categories` with origin blog (check how the category page reads its type filter and pass `type=blog`); primary "新規登録" (Plus) `requiredPermission={BlogsCreate}` tooltip "ブログ作成の権限がありません", `<Link>` to `/blogs/create`; order カテゴリマスタを編集 → 新規登録 — port from `blog-list.tsx` (L419-L441); satisfies PAR002-PAR004.
- [x] T027 [P] [US4] Create `src/app/(private)/blogs/_components/blog-coming-soon.tsx` (RSC-compatible body: Construction icon, "{screen}は準備中です", `BackToListLink label="ブログ管理に戻る" listPath="/blogs"`) and use it in `create/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx` (Clarification Q5, FR-023).
- [x] T028 [US4] Wire preview dialog and header actions into `src/app/(private)/blogs/page.tsx` (preview only offered for non-deleted rows).

**Checkpoint**: preview tabs; header buttons gated per role; row click / 編集 / 新規登録 land on placeholders with a working back link.

---

## Phase 7: Polish & Cross-Cutting

- [x] T029 `npm run type-check` and `npm run lint` → 0 errors; `npm run build` (new routes).
- [ ] T030 Run quickstart.md checks 1–16 in the browser for Headquarter, Manager, Staff, Observer, Trainer (test accounts from T001); fix deviations.
- [x] T031 Run the `verify-parity` skill against `specs/blog-list/checklists/parity.md`; fix unmet items.
- [x] T032 Re-add `'/blogs'` to `PHASE2_ROUTE_PREFIXES` if removed locally; confirm `git diff src/constants/phase.constants.ts` only appends `/blogs`.
- [x] T033 [P] Update `specs/blog-list/spec.md` if implementation forced any behaviour change, and keep research.md R9 gap table current for the backend hand-off.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T003 needs T001; T004 needs T002–T003; T005–T008 need T004; T009 needs T005–T008; T010, T011 independent of mock work) → stories.
- US1 (T012–T018) needs T009, T010, T011.
- US2 needs US1's table (T016, T018). US3 needs US2's menu (T020) and dialogs (T019). US4's T025–T027 only need Phase 2; T028 needs T018.
- Polish after all stories.

## Parallel Examples

- Phase 2: T006, T007, T008 together after T005 is drafted (different route files); T010 alongside the mock work.
- US1: T012, T013, T015 together; then T014 → T016 → T017 → T018.
- US4: T025, T026, T027 together (can start right after Phase 2).

## Implementation Strategy

1. **MVP** = Phase 1 + 2 + US1 → read-only scoped list, demoable and verifiable against parity sections header/toolbar/filters/table/pagination/scope.
2. Add US2 (publish toggle) → US3 (delete/restore) → US4 (preview, header actions, placeholders).
3. Polish: gates, quickstart, verify-parity, restore Phase-2 gating.

## Parity coverage

PAR001 T018 · PAR002–004 T026 · PAR005–007, PAR009–017 T017 · PAR008, PAR018 T014 · PAR019 T018 · PAR020–023 T016 · PAR024 T018 · PAR025–029, PAR031–032, PAR035 T016 · PAR030, PAR033–034 T015 · PAR036–039 T020 · PAR040 T023 · PAR041 T024 · PAR042–045 T019 (PAR044 also T024) · PAR046–048 T025 · PAR049–053 T018 · PAR054 T014. All 54 items claimed.
