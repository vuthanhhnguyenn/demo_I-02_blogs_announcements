# Implementation Plan: Blog Form (ブログ新規登録・編集)

**Branch**: `blog-list` (shared with list + detail) | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/blog-form/spec.md`

## Summary

Phase 1 (mock) build of the I-02 blog create / edit form at `/blogs/create` and `/blogs/[id]/edit`, replacing the blog-list placeholders. One shared form (banners pattern) reproducing prototype `blog-form.tsx`@47d60ac with Q1 (Staff: store scope only), Q2 (one brand family per article), Q3 (edit-mode publish method from status + 「非公開のまま保存」). Data via new mock `POST /crm/notices` and `PATCH /crm/notices/{id}` mirroring the real three-axis rules (research F1), plus mock-only seams BF-01/02 and gap BF-04.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, no-explicit-any), Node.js ≥ 24  
**Primary Dependencies**: Next.js 16, React 19, react-hook-form + Zod (`@hookform/resolvers`), TanStack React Query 5 (generated hooks), shadcn/ui (incl. `combobox` multiple), `react-quill-new`, sonner, lucide-react, `next/image`, date-fns via `date.util` — all present  
**Storage**: Phase 1 notices mock (shared); Phase 2 `src/lib/api-real` via `integrate-real-api`  
**Testing**: none automated; type-check, lint, build, quickstart, verify-parity  
**Target Platform**: CRM web, ≥ 768 px, WCAG AA  
**Project Type**: single Next.js app  
**Performance Goals**: simple article published in < 3 min (SC-001)  
**Constraints**: real store master + `/crm/me` are real-API backed → store names / operator identity passed as mock-only seams (F2); shared branch, one final commit  
**Scale/Scope**: 2 pages (replace placeholders), 1 form component + ~6 sections, 1 schema + mapper, 2 new mock routes, schema / table additions, regenerate client

## Constitution Check

| #   | Principle              | Check | Notes                                                                                                      |
| --- | ---------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| I   | TypeScript Strictness  | ☑     | `z.infer` form types; request / response types from `types.gen.ts`                                         |
| II  | OpenAPI-First          | ☑     | `registerRoute` → generate-openapi → generate-api; no manual `src/lib/api` edits                           |
| III | Spec-Driven            | ☑     | Q1–Q3 resolved (recommended options at user's request, flagged for review)                                 |
| IV  | App Router & Simple UX | ☑     | Pages client (form state) with justification; forms use react-hook-form + Zod as the constitution requires |
| V   | Simplicity & Min. Deps | ☑     | No new packages; reuses banners form, lessons editor, shared hooks / components                            |

**Initial gate**: PASS. **Post-design re-check**: PASS.

## Project Structure

```text
specs/blog-form/
├── spec.md · plan.md · research.md (F1–F8) · data-model.md · quickstart.md
├── contracts/create-update-notice.md
├── checklists/{requirements.md, parity.md}
└── tasks.md                                  # /speckit.tasks
```

```text
src/app/(private)/blogs/
├── create/page.tsx                            # replaces placeholder
├── [id]/edit/page.tsx                         # replaces placeholder (load detail, access checks F8)
├── _schemas/
│   ├── blog-form.schema.ts                    # blogFormSchema + BlogFormValues
│   └── blog-form.mapper.ts                    # detailToFormValues / toCreateBody / toUpdateBody
└── _components/blog-form/
    ├── blog-form.tsx                          # useForm, mutations, guard, navigation
    ├── blog-form-skeleton.tsx
    ├── index.ts
    └── sections/
        ├── blog-content-section.tsx           # タイトル, 本文 (Quill editor), サムネイル
        ├── blog-body-editor.tsx               # Quill editor (lessons pattern)
        ├── blog-category-section.tsx
        ├── blog-target-section.tsx            # 配信範囲 cards, brands, stores, warning, 掲載先
        ├── blog-publish-section.tsx           # 公開方法, 公開日時, 掲載終了日
        └── blog-form-actions.tsx              # footer: キャンセル · プレビュー · save

src/app/api/_schemas/notice.schema.ts          # + CreateNoticeBody, UpdateNoticeBody
src/app/api/_mock-db/tables/notice.table.ts    # + add(), update(), nextArticleNo()
src/app/api/crm/notices/route.ts               # + POST
src/app/api/crm/notices/[id]/route.ts          # + PATCH
src/lib/api/**                                 # regenerated
```

**Structure Decision**: Mirror `banners/_components/banner-form/` (form + sections + skeleton) and `banners/_schemas/banner-form.{schema,mapper}.ts`; editor from `lessons/_components/lesson-form/lesson-form-description.tsx`.

## Connection Points (Do Not Break)

- List and detail mock responses and existing PATCH publish-status / DELETE / restore behaviour.
- `blog-preview-dialog.tsx` (list + detail usages) — the form passes its current values.
- Placeholders replaced only for `/blogs/create` and `/blogs/[id]/edit`; detail navigation to edit keeps return-to.
- Shared components (`Combobox`, `DateTimePicker`, `DatePicker`, `DiscardChangesDialog`, `useUnsavedChangesGuard`, `useImageUpload`) used, not modified.

## Risks & Open Items

- Q1–Q3 answered with recommended options without user review — revisit.
- BF-04 (JOYFIT + FIT365 in one article) blocked by the form — confirm with BE / PO.
- Real request schemas unpublished — re-check field names when BE publishes them (Phase 2).
- Follow-up (decided 2026-11-20): `dev` added the shared `src/components/common/data-select-input/store-multi-select-input.tsx` after this form was built. The 店舗指定 picker still uses the `ui/combobox` chips; migrate it to `StoreMultiSelectInput` in a follow-up (needs the store brand for the one-family rule Q2 and a restricted option list for Manager / Staff).

## Complexity Tracking

| Violation                                                                   | Why Needed                                                                                                                                   | Simpler Alternative Rejected Because                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Navigation after save / from header buttons via `router.push` (code-rule V) | Same as list / detail: role-gated buttons and the unsaved-changes guard wrap navigation in callbacks (`confirmDiscard`, `navigateAfterSave`) | A `<Link>` would bypass the discard confirmation; banners form uses the same approach |
