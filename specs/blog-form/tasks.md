# Tasks: Blog Form (ブログ新規登録・編集)

**Input**: `/specs/blog-form/` (plan.md, spec.md Q1–Q3, research.md F1–F8, data-model.md, contracts/create-update-notice.md, quickstart.md, checklists/parity.md)
**Prerequisites**: blog-list + blog-detail implemented (notices mock, `blogs/` slice, `BlogDetail`, `getCrmNoticesByIdOptions`, preview dialog with body, `BlogBodyViewer`)
**V0 source**: `fitness-crm-ui/src/pages/blog-form.tsx`@47d60ac — abbreviated `blog-form.tsx`
**Tests**: none (constitution); verification = type-check, lint, build, quickstart, verify-parity.

## Format: `[ID] [P?] [Story] Description`

US1 create & publish · US2 delivery target · US3 edit · US4 preview & leave safely

---

## Phase 1: Setup

- [x] T001 Confirm branch `blog-list`, dev server running, `/blogs` locally un-gated; read research.md F1–F8, data-model.md, contracts/create-update-notice.md and the reference code: `src/app/(private)/banners/_components/banner-form/**`, `src/app/(private)/banners/_schemas/banner-form.{schema,mapper}.ts`, `src/app/(private)/banners/{create,[id]/edit}/page.tsx`, `src/app/(private)/lessons/_components/lesson-form/lesson-form-description.tsx`, `src/hooks/use-unsaved-changes-guard.hook.ts`, `src/hooks/use-image-upload.hook.ts`, `src/app/(private)/stores/[id]/edit/page.tsx` (L370-L395 cache handling).

---

## Phase 2: Foundational (blocking)

- [x] T002 Extend `src/app/api/_schemas/notice.schema.ts`: `CreateNoticeBodySchema` and `UpdateNoticeBodySchema` per contracts/create-update-notice.md (real field names; `publishStatus` create enum draft|scheduled|published, update optional; `expectedUpdatedAt` on update; mock-only `targetStores {id,name}[]` (BF-01) and `operator {staffId,name}` (BF-02) described as mock seams in `.openapi({ description })`); Japanese validator messages; export `z.infer` types.
- [x] T003 Extend `src/app/api/_mock-db/tables/notice.table.ts` (+ `types/notices.type.ts`): `add(record)`, `update(id, patch)`, `nextArticleNo(type, year)` (`BL-YYYY-NNNN` / `NT-…`, max+1 within year); helper `validateNoticeWrite(merged)` returning a 422 message for: empty `subBrandCodes` (E-NTC-003), sub-brands without `brandCode Joyfit`, `scheduled` without future `publishStartAt`, `publishEndAt` ≤ start (E-NTC-009), no channel, `brandScope store` without stores. Server-derived fields per research F1 (`publishStartAt = now` for published when absent, `wordpressSync` pending when WEB on and published/unpublished else null, `recentSyncLogs []`, `createdAt/updatedAt`, names from `operator` or `NOTICE_FALLBACK_OPERATOR_NAME`).
- [x] T004 [P] Add `POST` to `src/app/api/crm/notices/route.ts` (registerRoute, body `CreateNoticeBodySchema`, 200 `NoticeDetailSchema`, 400/422): build the record (uuid, `articleNo`, `targetStores` from the seam, `createdBy/updatedBy = operator.staffId ?? fallback`), validate, store, return `enrichNoticeDetail`.
- [x] T005 [P] Add `PATCH` to `src/app/api/crm/notices/[id]/route.ts` (body `UpdateNoticeBodySchema`, 200 `NoticeDetailSchema`, 400/404/409/422): unknown or deleted → 404; `expectedUpdatedAt` ≠ `updatedAt` → 409 「他のユーザーが記事を更新しました。最新の内容を読み込んでください。」; merge only sent fields (`targetStoreIds`/`targetStores` replaced only when sent or `storeScope` changes); `publishStatus` omitted = unchanged; validate merged; set `updatedAt`, `updatedBy/updatedByName`.
- [x] T006 With the dev server running: `npm run generate-openapi` → `npm run generate-api`; confirm `postCrmNoticesMutation` and `patchCrmNoticesByIdMutation` in `src/lib/api/@tanstack/react-query.gen.ts`; curl smoke: create published / scheduled (past → 422) / draft; PATCH with stale `expectedUpdatedAt` → 409; list row count +1 and still body-free.
- [x] T007 [P] Create `src/app/(private)/blogs/_schemas/blog-form.schema.ts` (`blogFormSchema`, `BlogFormValues`, per data-model.md "Form values" incl. cross-field `superRefine` rules: scope targets, JOYFIT/FIT365 exclusivity (BF-04), one store family (Q2), channels ≥1, scheduled date required + future, end after start; `TEXT_MAX_LENGTH` / `TEXT_EDITOR_MAX_LENGTH` from `src/constants/app.constants.ts`; body "required" checks stripped text) and `blog-form.mapper.ts` (`blogDetailToFormValues(detail)`, `blogFormToCreateBody(values, operator)`, `blogFormToUpdateBody(values, detail, operator)` per data-model "Mapping" + research F3 / F6).
- [x] T008 [P] Add form constants to `src/app/(private)/blogs/_constants/blog.constants.ts`: brand checkbox options (JOYFIT全体, Joyfit（スタンダード）, Joyfit24, JoyfitYoga, JoyfitPlus, FIT365), scope card copy, publish method options + descriptions, save button labels (公開する / 予約公開する / 下書き保存する / 保存する for 非公開のまま保存), success toasts, `BLOG_FORM_ERROR_SUMMARY = '未入力の項目があります'`.

**Checkpoint**: mock create / update work via curl; form schema + mapper type-check.

---

## Phase 3: User Story 1 — Create and publish (P1) 🎯 MVP

**Goal**: create mode with content, category, publish settings, save. **Independent test**: quickstart 1–5, 10–12, 20.

- [x] T009 [P] [US1] Create `src/app/(private)/blogs/_components/blog-form/sections/blog-body-editor.tsx` — Quill editor copied from `src/app/(private)/lessons/_components/lesson-form/lesson-form-description.tsx` (dynamic ssr:false, forwarded ref, toolbar modules: header 1/2 as 標準 / 見出し1 / 見出し2, bold, italic, list, link, image; `BLOG_BODY_QUILL_FORMATS`; error border via `aria-invalid`; placeholder 「記事の本文を入力してください...」; min-height ~16 rows) — port from `blog-form.tsx` › 本文 (L241-L273); satisfies PAR007.
- [x] T010 [US1] Create `src/app/(private)/blogs/_components/blog-form/sections/blog-content-section.tsx` (Card 「記事コンテンツ」: タイトル Input placeholder 「例: 初心者向け！自宅でもできる筋トレメニュー5選」, 本文 = T009, サムネイル画像 = 160px 16:9 preview (`next/image`) + outline sm Upload 「画像を選択」 + hint 「推奨: 1200×630px / PNG, JPG (最大5MB)」 using `useImageUpload` like the banner image section; field layout with RequiredMark / OptionalMark per `src/components/common/field-marker.tsx`) — port from `blog-form.tsx` (L72-L87, L227-L290); satisfies PAR004-PAR006, PAR008.
- [x] T011 [P] [US1] Create `src/app/(private)/blogs/_components/blog-form/sections/blog-category-section.tsx` (Card 「カテゴリ」 + header ghost sm 「カテゴリを管理」 Settings, `RoleGatedButton allowedRoles={[Headquarter, System]}` → `/article-categories?type=blog`; optional Select `max-w-[320px]` placeholder 「カテゴリを選択」 from `getCrmArticleCategoriesOptions({ query: BLOG_CATEGORY_LIST_QUERY })` with `items={toSelectItems(...)}`; HQ/System extra item after separator Plus 「新規カテゴリを追加」 → `/article-categories/create` (guarded by `confirmDiscard`); clear button X aria-label 「カテゴリを外す」 when set) — port from `blog-form.tsx` (L293-L357); satisfies PAR009-PAR012.
- [x] T012 [P] [US1] Create `src/app/(private)/blogs/_components/blog-form/sections/blog-publish-section.tsx` (Card 「公開設定」: 公開方法 RadioGroup with descriptions; options from props so edit mode can add 非公開のまま保存 (Q3); 予約公開 → 公開日時 `DateTimePicker` (`src/components/common/date-time-picker.tsx`, max-w-[400px], description 「保存後、設定した日時に自動公開されます」); 掲載終了日 `DatePicker` with description 「設定した日に自動的に非公開になります（任意）」) — port from `blog-form.tsx` (L489-L543); satisfies PAR022-PAR024.
- [x] T013 [P] [US1] Create `src/app/(private)/blogs/_components/blog-form/sections/blog-form-actions.tsx` (footer `border-t p-4` right-aligned: error summary left when submit failed, キャンセル outline lg, プレビュー outline lg Eye, save lg with label from publish method; disabled while pending) — port from `blog-form.tsx` (L546-L558); satisfies PAR025.
- [x] T014 [US1] Create `src/app/(private)/blogs/_components/blog-form/blog-form.tsx` (+ `index.ts`, `blog-form-skeleton.tsx`): `useForm<BlogFormValues>({ resolver: zodResolver(blogFormSchema), defaultValues })`, sections in order 記事コンテンツ → カテゴリ → 配信対象 (T016 slot) → 公開設定 → actions inside `max-w-[960px] mx-auto flex flex-col gap-6`; submit → on invalid: errors + summary + scroll to first `[aria-invalid="true"]` (`use-scroll-to-first-error.ts`); create: `useMutation(postCrmNoticesMutation())` with operator from `useAuthUser()` (BF-02), success toast by publish method, cache handling per research F7 (list key invalidated normally; then `navigateAfterSave(() => router.push(navigate('/blogs')))`), single-submit guard like banners; no local onError toast — port from `blog-form.tsx` (L125-L191, L223-L225); satisfies PAR003, PAR026, PAR027.
- [x] T015 [US1] Replace `src/app/(private)/blogs/create/page.tsx` with the create page (client, `'use client'` + comment; root `flex h-full min-h-0 flex-col` — see blog-detail fix; `PageHeader` title 「ブログ新規登録」 + `BackToListLink label="ブログ管理に戻る" listPath={navigate('/blogs')}` wired through the form's `confirmDiscard`; scroll area `min-h-0 flex-1 overflow-y-auto px-6 py-4`); defaults: 全社 for HQ/System/Manager, 店舗指定 for Staff, WEB+アプリ on, 即時公開 — port from `blog-form.tsx` (L126-L136, L206-L223); satisfies PAR001-PAR002 (create).

**Checkpoint**: HQ creates an article in each publish method; it shows in list/detail.

---

## Phase 4: User Story 2 — Delivery target (P1)

**Goal**: scope cards, brands, stores, warning, channels. **Independent test**: quickstart 6–9, 15 (create part).

- [x] T016 [US2] Create `src/app/(private)/blogs/_components/blog-form/sections/blog-target-section.tsx` and plug it into `blog-form.tsx`: Card 「配信対象」; 配信範囲 RadioGroup of 3 bordered cards (`border-primary ring-1 ring-primary` when selected; helper texts); 全社配信 and ブランド指定 disabled (opacity-60) with 「※ Manager以上のみ選択できます」 for Staff (Q1; role via `useAuthUser().hasRole`); ブランド panel (bg-muted/30) 「対象ブランドを選択（複数可）」 + 3-col checkboxes with JOYFIT全体 ↔ subs exclusivity and the JOYFIT/FIT365 rule, summary 「{n} ブランド選択中」 + secondary badges; 店舗 panel with multi `Combobox` + chips (`src/components/ui/combobox.tsx`, placeholder 「対象店舗を選択...」, max-w-[360px]) fed by the targetable stores (research F3: HQ/System store master `adminStoreControllerList…`, Manager/Staff `useCurrentStore().restrictedStores`), keeping `{id,name,brandEnum}`; scope change clears brands/stores; 全社配信 warning Alert (border-warning/50 bg-warning/15, AlertTriangle); 掲載先 checkboxes Globe WEBサイト / Smartphone モバイルアプリ — port from `blog-form.tsx` (L89-L123, L195-L204, L360-L486); satisfies PAR013-PAR021.

**Checkpoint**: target rules enforced; Staff only store scope with own store.

---

## Phase 5: User Story 3 — Edit (P2)

**Goal**: prefilled edit, access rules, Q3 publish method, conflict. **Independent test**: quickstart 13–17.

- [x] T017 [US3] Replace `src/app/(private)/blogs/[id]/edit/page.tsx` with the edit page (client; root `flex h-full min-h-0 flex-col`): load `getCrmNoticesByIdOptions({ path: { id }, query: storeId seam })` like the detail page; not-found / out-of-scope / `type !== 'blog'` / deleted / Staff non-author (`isOwnArticle`) → not-allowed state with back link (`DataStateBoundary` empty state, research F8); title 「ブログ編集」; pass `blogDetailToFormValues(detail)` and `mode="edit"` to `BlogForm`. In `blog-form.tsx` add the edit path: publish method options per research F6 (非公開 → extra 「非公開のまま保存」 preselected, label 保存する), `useMutation(patchCrmNoticesByIdMutation())` with `blogFormToUpdateBody` (incl. `expectedUpdatedAt`); on success toast + detail key `refetchType: 'none'` + list key, then `navigateAfterSave` to `returnTo` (`useBackToListHref`/return-to helper) else `/blogs/[id]`; on 409 keep the form and invalidate the detail key normally so the user can reload — port from `blog-form.tsx` (L126-L128); satisfies PAR002 (edit).

**Checkpoint**: Manager edits any article; Staff only own; 非公開 stays 非公開 by default; stale save → conflict.

---

## Phase 6: User Story 4 — Preview & leave safely (P3)

**Goal**: preview with current values; discard confirmation. **Independent test**: quickstart 18–19.

- [x] T018 [US4] Wire プレビュー in `blog-form.tsx`: open the shared `BlogPreviewDialog` (`src/app/(private)/blogs/_components/blog-preview-dialog.tsx`, `dateFormat="detail"`) with `{ id: 'new-article' | detail.id, title: values.title || '記事タイトル', categoryName, publishStartAt, body }` from `useWatch` — port from `blog-form.tsx` (L562-L648); satisfies PAR028.
- [x] T019 [US4] Wire the leave guard: `useUnsavedChangesGuard(formState.isDirty)` in `blog-form.tsx`; キャンセル, back link and category links go through `confirmDiscard`; render the shared `src/components/common/discard-changes-dialog.tsx` (copy 「変更を破棄しますか？」 / 「未保存の変更はすべて失われます。この操作は取り消せません。」 / 編集を続ける · 破棄する — check the shared copy matches; if not, note the deviation rather than editing the shared component) — port from `blog-form.tsx` (L153, L212-L219, L651-L665); satisfies PAR001 (discard part), PAR029.

---

## Phase 7: Polish & Cross-Cutting

- [x] T020 `npm run type-check`, `npm run lint` → 0 (pre-existing `qrcode.react` excepted); `npm run build` with the dev server stopped (together with blog-list T029 / blog-detail T021).
- [x] T021 Independent review subagent over the form diff (spec, code-rule, project patterns, prototype, connection points), then fix findings.
- [ ] T022 Run quickstart.md 1–20 in the browser; run `verify-parity` on `specs/blog-form/checklists/parity.md` (and re-run for blog-list / blog-detail).
- [x] T023 [P] Update spec / research gap table (BF-01…BF-04) if implementation changed anything; restore `'/blogs'` in `PHASE2_ROUTE_PREFIXES` before the final commit (blog-list T032).

---

## Dependencies & Execution Order

- T001 → T002 → T003 → T004, T005 [P] → T006 → T007, T008 [P].
- US1: T009, T011, T012, T013 [P] after T008; T010 after T009; T014 after T010–T013; T015 after T014.
- US2: T016 after T014 (plugs into the form).
- US3: T017 after T014–T016.
- US4: T018, T019 after T014 (same file as T017 → run after T017 to avoid conflicts).
- Polish last.

## Parallel Examples

- Foundational: T004 + T005; then T007 + T008.
- US1: T009 + T011 + T012 + T013 together.

## Implementation Strategy

1. MVP = Phase 1–3 (+ T016, since a create needs a valid target): HQ can create articles.
2. US3 edit → US4 preview / guard.
3. Review subagent, browser, verify-parity, build.

## Parity coverage

PAR001 T015+T019 · PAR002 T015+T017 · PAR003 T014 · PAR004 T010 · PAR005–006 T010 · PAR007 T009 · PAR008 T010 · PAR009–012 T011 · PAR013–021 T016 · PAR022–024 T012 · PAR025 T013 · PAR026–027 T014 · PAR028 T018 · PAR029 T019. All 29 items claimed.
