# Research: Blog Form (ブログ新規登録・編集)

**Feature**: `specs/blog-form/spec.md` | **Date**: 2026-11-13 | **Follow-up of**: `specs/blog-list` (R1–R11), `specs/blog-detail` (D1–D7)

Sources: spec.md (Q1–Q3), prototype `fitness-crm-ui/src/pages/blog-form.tsx`@47d60ac, live swagger `POST /api/v1/admin/notices`, `PATCH /api/v1/admin/notices/{noticeId}` (no request schema published; rules taken from the operation descriptions), project code: `banners/_components/banner-form/*` + `banners/_schemas/banner-form.{schema,mapper}.ts` (shared create/edit form), `lessons/_components/lesson-form/lesson-form-description.tsx` (Quill editor + `TEXT_EDITOR_MAX_LENGTH`), `hooks/use-unsaved-changes-guard.hook.ts`, `hooks/use-image-upload.hook.ts`, `components/common/date-time-picker.tsx`, `components/ui/combobox.tsx` (multi / chips), `stores/[id]/edit/page.tsx` (save → navigate cache handling).

---

## F1 — Mock create / update mirror the real three-axis contract

**Decision**: `POST /crm/notices` and `PATCH /crm/notices/{id}` with body fields named after the real model: `type` (create only, always `blog` from this screen), `title`, `body`, `categoryId|null`, `thumbnailS3Key|null`, `brandScope` (company|brand|store), `brandCode|null`, `subBrandCodes|null`, `storeScope` (all|specific), `targetStoreIds`, `channelWeb`, `channelApp`, `publishStatus` (create: draft|scheduled|published; update: optional — omitted = unchanged), `publishStartAt|null`, `publishEndAt|null`, and on PATCH `expectedUpdatedAt` (optimistic lock). Validation mirrors the real descriptions:

| Rule                                                         | Real code       | Mock                                                          |
| ------------------------------------------------------------ | --------------- | ------------------------------------------------------------- |
| `subBrandCodes: []` rejected; sub-brands only under `Joyfit` | E-NTC-003       | 422                                                           |
| Staff may not target all stores                              | E-NTC-004       | not enforceable (no real caller, blog-list R4) → UI gate (Q1) |
| `scheduled` needs a future start; end after start            | E-NTC-009       | 422                                                           |
| Staff edits only own articles                                | E-NTC-006       | UI gate (blog-list R5)                                        |
| `expectedUpdatedAt` ≠ current `updatedAt`                    | E-NTC-012 / 409 | 409                                                           |
| deleted article                                              | —               | PATCH → 404 (FR-021)                                          |

Server sets `articleNo` (next `BL-YYYY-NNNN`), `createdAt/updatedAt`, `publishStartAt = now` for `published` when absent, `wordpressSync` (`pending` when `channelWeb` and published/unpublished, else null), `recentSyncLogs: []`.

**Rationale**: Same mirror strategy as R1/D1. Response = the detail shape (`NoticeDetail`) so the client can update caches.

## F2 — Mock-only seams for Phase 1

| ID    | Need                                                              | Why the mock needs it                                                                    | Seam                                                                         |
| ----- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| BF-01 | Store names on 店舗指定 rows (list / detail show names)           | real API stores ids only; mock cannot resolve real store ids outside its small directory | body `targetStores: {id,name}[]` (mock-only) alongside real `targetStoreIds` |
| BF-02 | Creator / editor identity for the own-article rule and その他情報 | real API takes it from the token; mock sees only the fallback admin                      | body `operator: { staffId, name }` (mock-only), filled from `/crm/me`        |
| BF-03 | Article number                                                    | real API returns only uuid (blog-list B-02)                                              | server-assigned `articleNo`                                                  |

All seams are dropped in Phase 2 (`integrate-real-api`).

## F3 — Brand / store mapping (Q1, Q2)

- 全社配信 → `brandScope company`, `brandCode null`, `subBrandCodes null`, `storeScope all`, `targetStoreIds []`.
- ブランド指定 → `brandScope brand`, `storeScope all`; JOYFIT全体 → `brandCode Joyfit, subBrandCodes null`; sub-brands only → `Joyfit` + chosen list; FIT365 checked → a FIT365 target. **Gap BF-04**: one article holds one `brandCode`; "JOYFIT (whole or subs) + FIT365" in one article cannot be expressed. Decision: block that combination in the form with 「JOYFITとFIT365は同時に選択できません」 (prototype allows it; spec Q2 already restricts store targets to one family — same rule applied to brands, recorded in spec on update).
- 店舗指定 → `brandScope store`, `storeScope specific`, `brandCode` = family of the selected stores (`Fit365` or `Joyfit`; Q2 guarantees one family), `subBrandCodes` = distinct JOYFIT sub-brands of the stores (null for FIT365) — same rule the list seed uses.
- Store options: real store master via the existing header-store sources — HQ / System: `adminStoreControllerList` (as the list 店舗 filter); Manager: managed stores; Staff: own store (`useCurrentStore().restrictedStores`). Store `brandEnum` gives the family.

## F4 — Form architecture (project pattern: banners)

**Decision**: one shared form component used by `create/page.tsx` and `[id]/edit/page.tsx`, split into section components (記事コンテンツ, カテゴリ, 配信対象, 公開設定, actions), `react-hook-form` + `zodResolver`, schema + mapper in `blogs/_schemas/blog-form.{schema,mapper}.ts` (`detailToFormValues`, `formValuesToCreateBody`, `formValuesToUpdateBody`). Edit page loads the detail (`getCrmNoticesByIdOptions`, header-store seam as detail D3), maps to defaults, shows the form skeleton while loading.

## F5 — Controls

- **Body**: Quill editor copied from `lesson-form-description.tsx` (toolbar via Quill modules: header 1/2, bold, italic, list, link, image — formats `BLOG_BODY_QUILL_FORMATS`), border / error styling like lessons; length `TEXT_EDITOR_MAX_LENGTH` (10000) measured as the project does; required = non-empty text content (strip tags).
- **Title**: `TEXT_MAX_LENGTH` (255), messages in Japanese.
- **Thumbnail**: `useImageUpload` (PNG/JPG, 5MB) + the banner image-section pattern; stores `thumbnailS3Key` and shows the preview URL.
- **Category**: shadcn `Select` + `toSelectItems`, options from `getCrmArticleCategoriesOptions(BLOG_CATEGORY_LIST_QUERY)`; HQ/System extra item 「新規カテゴリを追加」 → `/article-categories/create` (with return-to), header 「カテゴリを管理」 → `/article-categories?type=blog`.
- **Stores**: `components/ui/combobox.tsx` multiple + chips (no existing app-level multi store picker).
- **公開日時**: `components/common/date-time-picker.tsx`; **掲載終了日**: `components/ui/date-picker.tsx` (no native date input).
- **Leave guard**: `useUnsavedChangesGuard(isDirty)` (`confirmDiscard`, `navigateAfterSave`) + shared `discard-changes-dialog.tsx`.
- **Double submit**: button disabled while pending + `useSingleSubmit` / `useInFlightGuard` as banners does.

## F6 — Edit-mode publish method (Q3)

Options per status: 公開中 → [即時公開*, 予約公開, 下書き保存]; 公開予定 → [即時公開, 予約公開*, 下書き保存]; 下書き → [即時公開, 予約公開, 下書き保存*]; 非公開 → [非公開のまま保存*, 即時公開, 予約公開, 下書き保存]. On save: unchanged method → `publishStatus` omitted (and for 公開中 `publishStartAt` omitted, keeping the original time); 非公開のまま保存 → omitted; changes → sent. Button label for 非公開のまま保存: 「保存する」 (prototype has no such option — our call).

## F7 — After save: navigation and caches

**Decision**: create → toast → list; edit → toast → the article's detail, forwarding the list's `returnTo` (pattern of campaigns / controllers: detail 編集 and the list row menu both carry the list URL as `returnTo`, so the detail's back link restores the list with its filters). The form's back link / キャンセル go to the list with its filters (`useBackToListHref`). Cache handling copies `stores/[id]/edit`: list key invalidated normally (inactive list refetches on mount), detail key invalidated with `refetchType: 'none'` (this screen is leaving; the detail refetches when it mounts because it is stale). On 409 (E-NTC-012) show the server message (global toast) and offer reload: invalidate the detail key normally so the form can be re-opened with fresh data (stay on the form).

## F8 — Access to the edit form

Edit page shows a not-allowed state (with back link) when: article not found / out of store scope / `type !== 'blog'` (404 path), deleted (FR-021), or Staff not author (`isOwnArticle`, Q6). Page-level permission guard already maps `/blogs/:id/edit` → `BlogsEdit`, `/blogs/create` → `BlogsCreate`.
