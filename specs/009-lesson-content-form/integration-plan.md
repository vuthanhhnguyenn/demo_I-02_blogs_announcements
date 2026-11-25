# Real API Integration Plan: D-02 Lesson Content Form (レッスン 登録・編集・複製)

**Branch**: `feat/lesson-master-integration-api` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/lessons/` — `create/`, `[id]/edit/`, `[id]/duplicate/`, `_components/lesson-form/*`, `_schemas/lesson-form.schema.ts`, `_utils/lesson-form.util.ts`, `_hooks/use-lesson-edit-save.ts`
**Target API**: `src/lib/api-real` (regenerated from the dev BFF `/docs-json`, 2026-10-08, API-111 v0.6)
**Sibling plans**: [007 list](../007-lesson-content-list/integration-plan.md) · [008 detail](../008-lesson-content-detail/integration-plan.md) — blocker ids are unique across the three plans (B1–B4).

## Guiding principle

**UI first.** Where the real API cannot back a UI element, the element stays and the gap is a
`TODO(round2) Bn` comment at the one place the value is dropped. Mock routes under
`src/app/api/crm/lesson-contents/**` and the `_mock-db` lesson tables are **left untouched**.

## Endpoint mapping

| UI surface                               | Real endpoint                                                                                                                                                                                 | Hook                                                                                                               | Round |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----- |
| 登録 / 複製 — save                       | `POST /api/v1/admin/lessons` (core fields + `images[]` + both restriction id lists, one transaction)                                                                                          | `adminLessonControllerCreateMutation`                                                                              | 1     |
| 編集 / 複製 — prefill                    | `GET /api/v1/admin/lessons/{lessonId}`                                                                                                                                                        | `adminLessonControllerDetailOptions`                                                                               | 1     |
| 編集 — core fields                       | `PATCH /api/v1/admin/lessons/{lessonId}` (`expectedUpdatedAt` → 409 `E-LSM-005`)                                                                                                              | `adminLessonControllerUpdateMutation`                                                                              | 1     |
| 編集 — 予約制限                          | `PUT …/{lessonId}/plan-restrictions` `{ planIds }` · `PUT …/option-restrictions` `{ optionIds }`                                                                                              | `…PutPlanRestrictionsMutation` / `…PutOptionRestrictionsMutation`                                                  | 1     |
| 編集 — images                            | `DELETE …/images/{imageId}` · `POST …/images` `{ imageS3Key }` · `PUT …/images/order`                                                                                                         | `…RemoveImageMutation` / `…AddImageMutation` / `…ReorderImagesMutation`                                            | 1     |
| 制限主契約 / 制限オプション契約 choices  | `GET /api/v1/admin/plans?brandEnum=&nameQuery=&sort=name&page=&limit=25` · `GET /api/v1/admin/options?brandEnum=&keyword=&sort=name&page=&limit=25` — server search, next page on scroll (D9) | `adminPlanControllerListInfiniteOptions` / `adminOptionControllerListInfiniteOptions` (`useRestrictionCandidates`) | 1     |
| Image upload                             | API-006 presign + PUT, tag `lesson-image` (`member-shared/lesson-image/…`)                                                                                                                    | `useMediaUpload`                                                                                                   | 1     |
| Tax rate for the 都度利用料金 conversion | — (no tax master on API-111)                                                                                                                                                                  | —                                                                                                                  | 2     |

## Blockers carried into Round 2

| ID     | Blocker                                                | Round 1 behaviour (UI kept)                                                                                                                                                                                     | Round 2 (after API fix)                               |
| ------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **B1** | No tax rate for lessons; `fee` is stored tax-excluded. | `LESSON_TAX_RATE` = 10% in `_utils/lesson-api.util.ts`. The form takes 都度利用料金 tax-included and sends `ceil(x / 1.1)`; screens show `floor(fee × 1.1)` — ¥1,000 → 910 → ¥1,001. Used by 007 / 008 as well. | Read the rate from the API; delete `LESSON_TAX_RATE`. |

## Decisions

- **D1 — One converter seam.** Components stay on the DTOs; `_utils/lesson-form.util.ts` holds the
  form ↔ API conversion: `detailToFormValues(detail, 'edit' | 'duplicate')`, `toCreateLessonBody`,
  `toUpdateLessonBody`.
- **D2 — 複製 = create.** The duplicate screen is a full form (FR-006-P1-02: every field cloned and
  editable), so it saves with `POST /admin/lessons`. `POST /admin/lessons/{id}/duplicate` (§6) only
  takes a name / store override and is not used. The stored images are re-referenced by their S3
  key; the name gets 「（コピー）」 when it still fits in 255 characters.
- **D3 — 編集 is not atomic.** `useLessonEditSave`: PATCH first (failure aborts — nothing written,
  the shared toast shows `E-LSM-005` etc.), then only the parts that changed: restriction PUTs,
  image removals, additions, and a reorder only when the form's order differs from the order the
  server ends up with (remaining images + additions appended). A failure after the PATCH shows a
  warning and opens the detail page.
- **D4 — Brand (spec Clarifications 2026-10-08).** 5 brands; locked on 編集 (API-111: immutable);
  changing it on 登録 / 複製 clears both restriction lists (ids are brand-scoped).
- **D5 — Fee.** `fee` is sent only for 都度 (`per_use`); otherwise `null` (`E-LSM-006`).
  Tax conversion per **B1**.
- **D6 — Field bounds vs the real schema.** Name 255 (= API), description 10,000 (= API), 備考
  1,000 (API allows 2,000 — the form stays stricter), 都度利用料金 ≤ ¥1,100,000 tax-included,
  durations from the API enum (PT keeps 30 / 60 only, FR-002-P1-07). Restriction choices: D9.
- **D7 — Images.** First image = メイン (`displayOrder` 0); previews use object URLs for fresh
  uploads and the signed `url` for stored ones.
- **D8 — Gender restriction is not an input.** FR-002 defines no field (`TBD-D02-GENDER-VALUES`),
  so 登録 / 複製 leave the API default (`none`) and 編集 never sends it.
- **D9 — Restriction choices are searched on the server (2026-10-13, k.iwaki on !200, twice).**
  One page (the first 200 plans / 100 options), and then a fixed 10 pages, left the rest
  unsearchable because the search ran over the loaded rows. Each picker
  (`_hooks/use-restriction-candidates.hook.ts`) now sends its search to the API — plans
  `nameQuery`, options `keyword` (name or option code), debounced 300 ms — and reads the next page
  (`RESTRICTION_CANDIDATE_PAGE_SIZE` = the shared `PAGE_SIZE`, sorted by name) as the list scrolls;
  it fetches only while open. Chips never need the list: 編集・複製 pass the detail's
  `planRestrictions` / `optionRestrictions` names and a pick keeps its own name, so a chip never
  falls back to the id. A failed first or later page says so in the list with 再試行.
- **D10 — No save while an image uploads (2026-10-13, k.iwaki on !200; same rule as !188).** A
  picked image joins `images` only when its upload resolves; `useMediaUpload`'s flag covers the
  presign call only, so `lesson-form-images.tsx` counts the batches in flight and reports it.
  Until 0, 入力内容を確認する / 変更を保存する and the confirm dialog's button are disabled
  (登録・編集・複製 alike) with 「画像のアップロードが完了するまでお待ちください。」.

## Round 1 tasks

### Phase A — foundations

- **T001** `_schemas/lesson-form.schema.ts` — 5 brands, image items `{ imageId?, s3Key, url }`,
  tax-included fee bound, restriction ids.
- **T002** `_utils/lesson-form.util.ts` _(new)_ — D1 / D2 / D5.
- **T003** `_hooks/use-lesson-edit-save.ts` _(new)_ — D3.

### Phase C — forms

- **T004** `_components/lesson-form/lesson-form.tsx` — create mutation, edit save, invalidation.
- **T005** `[P]` `lesson-form-basic-info.tsx` (D4), `lesson-form-restrictions.tsx` (brand-scoped
  lists), `lesson-form-images.tsx` (D7).
- **T006** `[P]` `[id]/edit/page.tsx`, `[id]/duplicate/page.tsx` — real detail prefill, not-found.

### Phase D — verification

- **T007** type-check / lint / prettier. **T008** live smoke. **T009** record below.

## Round 2 backlog

- **R201** Tax rate from the API (**B1**) → replace `LESSON_TAX_RATE` in `lesson-api.util.ts`
  (list, detail and form all read it).

## Open / Resolved questions

- **Resolved — brand options (spec Clarifications 2026-10-08, Q7).** 5 brands, locked on edit.
- **Open (PO, not FE) — gender restriction input.** `TBD-D02-GENDER-VALUES`: FR-002 has no field
  yet and the API value set is provisional. Nothing to build until the FR defines it (D8).

## Round 1 result (2026-10-08)

**Status: shipped in FE MR !200; static gates green; live smoke run on dev.**

All tasks T001–T006 shipped as planned. Mock surfaces are untouched.

### Verification

- **T007** — `npm run type-check`: 0 errors outside the pre-existing `contracts/*` ones; lint and
  prettier clean.
- **T008** (dev, HQ account; every lesson below was a throwaway named `QA-D02-SMOKE …` /
  `…（コピー）`, deleted at the end):
  - **登録**: brand JOYFIT, 45分, 都度 ¥1,000, one plan + one option restriction, one uploaded
    image, description, memo → 201; back on the list (counts updated); detail ¥1,001.
  - **編集**: prefill correct, brand locked; rename + remove the plan restriction + add an image +
    remove the old one → saved, detail matches, history shows each call. The extra reorder in that
    run (one image left) led to the D3 order check; that fix was not re-run live.
  - **409**: a second tab opened before the save, then saved → one toast
    「他の担当者によってこのレッスンが更新されました…」, the page stays, no follow-up calls.
  - **複製** (QA-D01-FREE): name 「…（コピー）」, other fields cloned → created.
  - Not exercised: a **non-HQ role** (route guard / 403 `E-LSM-101` — only an HQ account is
    available), and the partial-save warning path (needs a failure after the PATCH) — left for QA.
  - Seen in the console but pre-existing on `origin/dev` (not changed here): a nested `<button>`
    in the restriction picker's badges, and base-ui's uncontrolled → controlled `Select` warning.
