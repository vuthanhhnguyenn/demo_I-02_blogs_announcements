# Real API Integration Plan: Y-08 Exercise Master Management (エクササイズ管理)

- **Branch**: `feat/exercise-integration-api` (to be cut from `dev` before Round 1)
- **Date**: 2026-10-12 (Round 1) · 2026-10-13 (PO decisions → Round 1b)
- **Spec**: `dx-fitness/fitness-spec@5c391cf` (2026-09-28) — `crm/requirements/Y-08.md` **260805_v2**; brand model from `crm/requirements/G-01.md` (L52)
- **Prototype**: `dx-fitness/fitness-crm-ui@bac8775` (2026-10-09) — `src/pages/exercise-list.tsx`, `exercise-form.tsx`, `exercise-detail.tsx`, `exercise-master.tsx`
- **Backend ground truth**: `fitness-backend-v2@c8c0ff6a` (2026-10-09) — `services/bff/src/routes/training/{admin-exercise-master,admin-exercise-ref-master}.controller.ts`, `dto/exercise-master.dto.ts`, `packages/zod-schemas/src/training/exercise-master.schema.ts`, `services/training-svc/src/{services,repositories}/exercise-admin.*.ts`
- **Scope**: `src/app/(private)/exercises/**` (list / detail / create / edit) and `src/app/(private)/exercise-master/**` (FR-011 reference masters)
- **Target API**: `src/lib/api-real` generated from `src/lib/openapi.real.json`

## Guiding principle

The latest spec is the contract; the UI is the customer and the API is the supply. Every
spec'd control, column, filter and badge stays exactly as the spec defines it. Where the API
cannot back a spec'd element yet, the UI is kept, the value is stripped/defaulted at **one
seam** with a `TODO(round2) Bn` comment, and the gap is carried as a blocker below. Round 2
re-checks the API and closes those TODOs, nothing else. Prototype-only items the spec does not
define are commented out (`TODO(round3) R3nn`), never deleted.

Left untouched (they simply stop being called — established convention): the mock routes
under `src/app/api/crm/exercises/**`, `src/app/api/crm/exercise-*/**`,
`src/app/api/_mock-db/**`, and the mock types in `src/lib/api/**`. The training-equipment
screen's mock `exercise-links` / `exercise-candidates` calls are out of scope (E-03).

## Endpoint mapping

| UI surface                                                            | Real endpoint                                                              | Hook (`@/lib/api-real/@tanstack/react-query.gen`)                                           | Round          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------- |
| List rows, header count badge (`pagination.totalItems`), paging       | `GET /api/v1/admin/exercises`                                              | `adminExerciseMasterControllerListOptions`                                                  | 1              |
| Keyword search (FR-002 JP/EN name)                                    | same, `keyword` (BE matches `name`, `exerciseCode`, `descriptions.*.name`) | same                                                                                        | 1              |
| Filters カテゴリ / 主働筋 / 公開ステータス                            | same, `categoryId` / `primaryMuscleId` / `publishStatus`                   | same                                                                                        | 1              |
| Filters 器具種別 / レベル                                             | — (no query param)                                                         | —                                                                                           | 1 → 2 (B4)     |
| List columns 器具種別 / レベル                                        | — (not in `ExerciseListItemDto`)                                           | —                                                                                           | 1 → 2 (B2, B3) |
| Default sort 最終更新日 desc                                          | — (BE fixed `createdAt desc`)                                              | —                                                                                           | 1 → 2 (B5)     |
| Detail page (all tabs), edit-form defaults                            | `GET /api/v1/admin/exercises/{id}`                                         | `adminExerciseMasterControllerDetailOptions`                                                | 1              |
| Create                                                                | `POST /api/v1/admin/exercises`                                             | `adminExerciseMasterControllerCreateMutation` (body via seam, B1)                           | 1              |
| Edit                                                                  | `PATCH /api/v1/admin/exercises/{id}`                                       | `adminExerciseMasterControllerUpdateMutation`                                               | 1              |
| Delete (+ 409 `E-EXM-002` published / `E-EXM-003` used by routine)    | `DELETE /api/v1/admin/exercises/{id}`                                      | `adminExerciseMasterControllerRemoveMutation`                                               | 1              |
| 公開/非公開 one-click toggle (list row, detail header) + form switch  | `PATCH /api/v1/admin/exercises/{id}/publish`                               | `adminExerciseMasterControllerPublishMutation`                                              | 1 (D18)        |
| Category options + master tab                                         | `GET/POST /api/v1/admin/exercise-categories`, `GET/PATCH/DELETE …/{id}`    | `adminExerciseRefMasterController{List,Create,Update,Delete}Category*`                      | 1              |
| Muscle options (主働筋 / 協働筋) + master tab                         | `/api/v1/admin/muscles[/{id}]`                                             | `adminExerciseRefMasterController*Muscle*`                                                  | 1              |
| Exercise-type options + master tab                                    | `/api/v1/admin/exercise-types[/{id}]`                                      | `adminExerciseRefMasterController*Type*`                                                    | 1              |
| Tool-type (器具種別, `mst_tools`, E-03-owned) options + master tab    | `/api/v1/admin/tool-types[/{id}]`                                          | `adminTrainingEquipmentController{ToolTypes,CreateToolType,UpdateToolType,DeleteToolType}*` | 1              |
| Tag ON/OFF list (FR-010)                                              | `GET /api/v1/admin/exercise-tags`                                          | `adminExerciseRefMasterControllerListTagsOptions`                                           | 1              |
| E-03 equipment candidates (FR-008) + linked-equipment names on detail | `GET /api/v1/admin/training-equipment?mstToolId=`                          | `adminTrainingEquipmentControllerListOptions`                                               | 1              |
| Related-exercise candidates (FR-013)                                  | `GET /api/v1/admin/exercises?keyword=`                                     | `adminExerciseMasterControllerListOptions`                                                  | 1              |
| Related-exercise names on detail (≤3)                                 | `GET /api/v1/admin/exercises/{id}` × n                                     | `adminExerciseMasterControllerDetailOptions` via `useQueries`                               | 1              |
| Image upload (FR-012)                                                 | `POST /api/v1/media/presign` (tag `exercise-image`)                        | `useMediaUpload` (`src/hooks/use-media-upload.hook.ts`)                                     | 1              |
| Image preview                                                         | `GET /api/v1/media/assets/{s3Key}`                                         | URL util (pattern: `stores/_utils/store-image-url.util.ts`)                                 | 1 (B11)        |
| Video (動画URL)                                                       | `videos[].videoS3Key` on POST/PATCH                                        | —                                                                                           | 1 (B10)        |
| English name / steps (FR-014)                                         | `descriptions.en` (read)                                                   | —                                                                                           | 1 (B9)         |

## Blockers carried into Round 2

| ID      | Blocker                                                                                                                                                                                                                                                                                                                                                                  | Spec says                                                                              | Round 1 behaviour (UI kept)                                                                                                                                                                                                                                                                                                                                                                                | Round 2                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1**  | `POST /admin/exercises` body `$ref: CreateExerciseDto` resolves to the **member custom-exercise DTO** (`name`, enum `category`/`equipment`) — the BFF has two classes named `CreateExerciseDto` (`dto/exercise.dto.ts` and `dto/exercise-master.dto.ts`) and the member one wins in OpenAPI. Runtime validation is the correct admin zod (`createExerciseMasterSchema`). | FR-003 required: 名称(JP)・カテゴリ・主働筋・器具種別・タイプ・両手使用区分・レベル    | Body built as the admin shape, typed against `UpdateExerciseDto` (correct `PartialType` of the admin class) + required keys; exactly **one cast** in `_utils/exercise-body.util.ts` (`TODO(round2) B1`).                                                                                                                                                                                                   | BE renames the admin class (e.g. `CreateAdminExerciseDto`) → replace `openapi.real.json` → `npm run generate-api:real` → delete the cast.                                                                     |
| **B2**  | `ExerciseListItemDto` has no tool (`toolId`/`toolName`).                                                                                                                                                                                                                                                                                                                 | FR-001 column 器具種別                                                                 | Column rendered, cell shows `—`.                                                                                                                                                                                                                                                                                                                                                                           | Read the new field; drop the placeholder.                                                                                                                                                                     |
| **B3**  | `ExerciseListItemDto` has no spec レベル (only `level` = `easy/moderate/hard`, a different concept).                                                                                                                                                                                                                                                                     | FR-001 column レベル (ビギナー/エキスパート)                                           | Column rendered, cell shows `—`.                                                                                                                                                                                                                                                                                                                                                                           | Read the new field (see B8).                                                                                                                                                                                  |
| **B4**  | `GET /admin/exercises` has no `toolId` / level query param; the query zod is `.strict()` so sending them is a 400.                                                                                                                                                                                                                                                       | FR-002 filters 器具種別・レベル (single select, AND)                                   | Both filters rendered and kept in the URL; stripped from the request in `use-exercises-filters.ts` (`TODO(round2) B4`) — selecting them does not narrow the list.                                                                                                                                                                                                                                          | Pass the params through.                                                                                                                                                                                      |
| **B5**  | List order is hard-coded `createdAt desc`; no `sort`/`order` param.                                                                                                                                                                                                                                                                                                      | FR-001 default sort 最終更新日 desc                                                    | No sort sent; rows arrive in creation order. Header sorting on エクササイズ名 / ステータス / 最終更新日 is rendered and kept in the URL (D19) but stripped from the request (`TODO(round2) B5`).                                                                                                                                                                                                           | BE adds `sort` (`name` / `publishStatus` / `updatedAt`) + `order`, default `updatedAt desc` (PO 2026-10-13, D19) → pass the URL sort through.                                                                 |
| **B6**  | Only one `secondaryMuscleId`. Spec does not define the cardinality of 協働筋 (Y-08 L64 「任意設定」, FR-003 任意項目) while prototype + code allow **multiple** → **PO confirmed multiple (2026-10-13)** → BE ask.                                                                                                                                                       | 協働筋 optional                                                                        | Multi-select kept; body sends the **first** selected id as `secondaryMuscleId` (`TODO(round2) B6`). Known side effect: only the first muscle persists; reopening shows one. Detail shows `secondaryMuscleName` as a one-item list.                                                                                                                                                                         | BE adds `secondaryMuscleIds: uuid[]` (request + response) → send the array.                                                                                                                                   |
| **B12** | Mobile exercise APIs (list / detail / legacy calendar) never read `exercise_brand_links`; the only non-admin reader is `routine-admin.repository.ts:34` (routine candidates must have a published link). So 非公開 does not hide an exercise in the app.                                                                                                                 | FR-007 / form copy: 「公開にすると、モバイルアプリで会員にエクササイズが表示されます」 | Nothing to strip — CRM publishes/unpublishes normally (D18).                                                                                                                                                                                                                                                                                                                                               | BE filters mobile exercise reads by publish state → re-check an unpublished exercise is hidden in the app.                                                                                                    |
| **B8**  | Spec レベル (ビギナー/エキスパート) has no explicit field. BE notes 「レベル」→ `isBeginnerVisible` (boolean, **required on POST**) and also has `level` (`easy/moderate/hard`). FE must not invent the mapping (user decision 2026-10-12) → **PO confirmed (2026-10-13): BE adds a field for the two spec levels.**                                                     | FR-003 レベル required, values ビギナー / エキスパート                                 | レベル select kept and required in the form; its value is **not sent**. Because POST rejects a missing `isBeginnerVisible`, the body seam sends a fixed `isBeginnerVisible: true` on create only (not derived from the UI; never sent on PATCH) — see Q1. Detail and edit-form show レベル empty/`—` (no reverse mapping).                                                                                 | BE adds an explicit レベル field (`beginner`/`expert`) on list, detail, create, update and the list filter → wire it, remove the constant.                                                                    |
| **B9**  | No machine-translation endpoint anywhere in the BFF; BE only stores machine output (`descriptions.machineTranslatedFields`) and derives `translationStates`. Treated as a BE defect (user decision 2026-10-12).                                                                                                                                                          | FR-014: auto-translate JP→EN on save; failure must not block save                      | Round 1b: v2 UI per prototype (D22) — EN always editable and sent in `descriptions.en`; save-time translation and 再翻訳 go through one seam that reports "translation failed" (`TODO(round2) B9`), so the spec's failure path runs: warning toast, JP-only save, 再翻訳 retry.                                                                                                                            | BE ships a JP→EN translate endpoint (used on save for empty EN fields and by 再翻訳) → wire it into `exercise-translation.util.ts`, send `machineTranslatedFields`. The v2 UI is built in Round 1b (S1, D22). |
| **B10** | Videos are `videos[].videoS3Key` (S3 key, string ≤512); no URL field.                                                                                                                                                                                                                                                                                                    | 補足: 動画URL accepts any URL (no YouTube-only validation)                             | Form keeps the URL input; body sends `videos: [{ videoS3Key: <url> }]` (`TODO(round2) B10`). **Live verdict (2026-10-12): accepted and returned unchanged** — kept.                                                                                                                                                                                                                                        | BE adds a `videoUrl` (or equivalent) field.                                                                                                                                                                   |
| **B11** | Detail `images[]` carries only `imageS3Key`; no fetchable (signed) URL. Per the stores precedent the bare `/api/v1/media/assets/{key}` path answers 401 to an `<img>` (no bearer).                                                                                                                                                                                       | FR-012: preview images in the CRM                                                      | Preview uses the asset path built from the key (store util pattern); freshly uploaded files preview from the local object URL. **Live verdict (2026-10-12): the asset path answers 401 without a bearer (302 with one)**, so stored images do not render; the gallery shows 「画像を表示できません」 and the form thumbnail hides instead of a broken icon. New uploads preview from the local object URL. | BE returns a signed `url` per image (as `GET /admin/stores/{id}/images` does).                                                                                                                                |
| **B13** | Codegen types `description` on every reference-master create/update DTO as `{ [key: string]: unknown } \| null` (BE declares it nullable without a type); the API stores a plain string.                                                                                                                                                                                 | FR-011 説明 (free text)                                                                | One cast in `exercise-master/_utils/exercise-master-api.util.ts` (`TODO(round2) B13`).                                                                                                                                                                                                                                                                                                                     | BE adds `type: string` → regen → delete the cast.                                                                                                                                                             |
| **B14** | `AdminExerciseMasterController` has no `@Roles`, so `RoleGuard` lets every role through; **verified live: Manager `GET /admin/exercises` → 200** (writes are guarded in training-svc `requireWrite`).                                                                                                                                                                    | 権限マトリクス: 参照・検索 System / HQ only                                            | Nothing to strip — the CRM gates the screen and actions to System / HQ (D15).                                                                                                                                                                                                                                                                                                                              | BE adds `@Roles('system','headquarter')` (also on the ref-master controller) → re-check Manager → 403.                                                                                                        |
| **B15** | **Verified live:** any non-empty `enabledTagIds` on POST/PATCH answers **500 E-SYS-001** — `exercise-admin.repository.ts:184` creates `exercise_tag_assignments` without the required `id` (no DB default).                                                                                                                                                              | FR-010 tag ON/OFF per exercise                                                         | Tag ON/OFF UI kept (switches from the tag master); `enabledTagIds` omitted from the body in `exercise-body.util.ts` (`TODO(round2) B15`) — omitted = unchanged on PATCH. Known side effect: tag changes are not saved.                                                                                                                                                                                     | BE fix → send `enabledTagIds` again.                                                                                                                                                                          |
| **B16** | List `category` / `primaryMuscle` are legacy denormalised strings. **Verified live:** new rows carry the master code (resolved to the name by D6), but the 71 seeded rows carry old enum strings (`lower_body`, `shoulders`, `full_body`) that match no master code (`legs`, `shoulder`, `wholeBody`).                                                                   | FR-001 カテゴリ / 主働筋 columns show names                                            | D6 resolution; unmatched legacy values render as the raw string.                                                                                                                                                                                                                                                                                                                                           | BE returns master names (or ids) on the list item, or backfills the legacy columns.                                                                                                                           |
| **B17** | **Verified live:** the 71 seeded exercises have **no brand link**, so neither `publishStatus=published` nor `unpublished` returns them (both filters: 0 rows) although the badge shows 非公開.                                                                                                                                                                           | FR-002 公開ステータス filter                                                           | D18 aggregation; rows created/toggled from the CRM have all five links and filter correctly.                                                                                                                                                                                                                                                                                                               | BE backfills links (or adds the single status, see D18) → re-check the 非公開 filter.                                                                                                                         |
| **B18** | Tag master has no category: `NamedRefMasterDto` only. **Verified live:** the grouping exists only as a convention — `code` = `<axis>.<option>` (`stanceWidth.narrow`) and `name` = 「<axis名>: <option名>」 (「スタンス幅: 狭い」). No admin endpoint lists the axes (the member API has 8 fixed axes with `tagItemName`).                                               | FR-010 lists all tags; FR-015 タグカテゴリ管理                                         | Flat tag list (R302 pending PO); tag master tab shows code/name as stored.                                                                                                                                                                                                                                                                                                                                 | BE adds a tag category (field or master) → group per prototype (R302).                                                                                                                                        |
| **B19** | CSV export content (`GET /admin/exercises/export`): columns are master **codes** (`shoulder`, `bodyweightReps`), `level` is `easy/moderate/hard`, no 器具種別 / spec レベル / 公開ステータス label, LF without BOM (Excel shows mojibake). Ignores sort.                                                                                                                 | FR-016 CSV export (columns not defined)                                                | Button exports the current filters; FE prepends a UTF-8 BOM at one seam (`TODO(round2) B19`). Content shipped as the BE writes it.                                                                                                                                                                                                                                                                         | BE outputs names + spec columns with BOM → drop the BOM seam.                                                                                                                                                 |
| **B20** | Seeded tag codes contain `_` (`gripType.thumb_around`), which the create rule `^[a-z][a-zA-Z0-9.]*$` rejects — the seed cannot be re-created through the API.                                                                                                                                                                                                            | FR-015                                                                                 | Nothing to strip; FE enforces the BE rule (D23).                                                                                                                                                                                                                                                                                                                                                           | BE aligns the seed or the rule.                                                                                                                                                                               |

## Spec'd but not built

| ID     | FR                      | What the spec defines                                                                                                                                                                                                                                                                           | Missing in                                                                                                                                                                                        |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | FR-014 (260805_v2)      | EN name/steps are always hand-editable inputs; 「要再翻訳」 badge when JP changed since the last translation; badge click re-translates, with the 「手動で編集された英語テキストがあります。再翻訳で上書きしますか？」 confirm when EN was hand-edited; translation failure keeps JP-only save. | **Code** (still v1: read-only EN). Prototype has it. API already carries `descriptions.en` writes + `translationStates.{needsRetranslation,isManuallyEdited}`. **Round 1b (PO 2026-10-13, D22).** |
| **S2** | FR-016 (Could)          | CSV export of exercises                                                                                                                                                                                                                                                                         | Code + prototype. API exists: `GET /api/v1/admin/exercises/export`. **Round 1b (PO 2026-10-13, D20).**                                                                                            |
| **S3** | FR-015 / FR-017 (Could) | Tag-category management (`mst_tag`), glossary management (`mst_explanation`)                                                                                                                                                                                                                    | Code + prototype. API exists: `/api/v1/admin/exercise-tags`, `/api/v1/admin/explanations`. **Round 1b (PO 2026-10-13, D21).**                                                                     |

## Decisions

- **D1 — No mapper layer.** Components read `ExerciseListItemDto`, `ExerciseDetailDto`, `NamedRefMasterDto`, `ExerciseTypeMasterDto`, `ToolTypeDto` from `@/lib/api-real/types.gen` directly. The form keeps its own view-model (`nameJa`, `explanationSteps[]`, `handUsage`, …) because it is a form, not a DTO; `mapExerciseDetailToFormValues` / `mapExerciseFormValuesToBody` in `_schemas/exercise-form.schema.ts` remain the only translation points (detail → form, form → body).
- **D2 — Field renames in place.** `nameJa` ← `descriptions.ja.name`; steps 0–4 ← `trainingPoint / startPosition / movement / finalPosition / returnMotion`; `overviewJa/En` ← `descriptions.{ja,en}.overview`; `handUsage` → `limbUsage` with `single_leg` → `single_foot` (constants keyed by the real enum, label 片足 unchanged); `linkedEquipmentIds` ↔ `equipmentIds`; images `url` → `imageS3Key`; `exerciseCode` read-only (never sent — PATCH with it is `E-EXM-007`).
- **D3 — Type safety for the create body (B1).** `CreateExerciseBody = Required<Pick<UpdateExerciseDto, 'categoryId' | 'primaryMuscleId' | 'toolId' | 'exerciseTypeId' | 'isBeginnerVisible' | 'limbUsage' | 'descriptions'>> & UpdateExerciseDto & { brandEnums: BrandEnum[] }`; one cast to the generated body type in `_utils/exercise-body.util.ts`. Codegen-degraded fields (`secondaryMuscleId`, `metsValue`, `LangTextInputDto.*` typed `object`) are assigned only inside that util.
- **D4 — Paging.** List keeps `API_PAGE_SIZE_OPTIONS` (25/50/100) — within the API max 100. Option/candidate queries use `limit: 100` (the current code asks for 200, which the real API rejects). Header badge = `pagination.totalItems`.
- **D5 — Option sources.** カテゴリ / 主働筋 / エクササイズタイプ single selects (form + list filters) use `ExerciseRefMasterSelectInput` (`src/components/common/data-select-input`, 2026-10-13): 20 per page on scroll, server-side `keyword`, `isActive: true, sort: 'sortOrder', order: 'asc'`, the selected name resolved by id when it is not on a loaded page. Whole lists (協働筋 chips, タグ switches, list / candidate label resolution) load every page (`useLoadAllPages`). Tool types: `/admin/tool-types` with `includeNone: true` (not paginated) so the 「なし（自重）」 row is selectable; the bodyweight row is found by `code === 'none'` (verified live). Master-management tabs (2026-10-14): one panel per tab, listed only while open, server paging 20 per page (20/50/100; 器具種別 paged in the browser — the API has no paging), no `isActive` filter; tab counts and the next 表示順 come from one `limit=1&sort=sortOrder&order=desc` request per tab.
- **D6 — List master columns.** `category` / `primaryMuscle` on list rows are legacy denormalised strings that the service dual-writes from master **codes**. The cell resolves the string against the master options by `code`, falling back to `name`, then to the raw string. Verified in the smoke; kept in `_utils/exercise-master-label.util.ts`.
- **D7 — Delete gating without `canDelete`.** Pre-check: displayed status 公開 → open the existing _blocked_ dialog with 「公開中のため削除できません。先に非公開に変更してください」. Otherwise confirm → DELETE; on 409 read `ErrorResponseDto.code`: `E-EXM-002` → same published message, `E-EXM-003` → 「使用中のため削除できません」 (FR-006), both shown in the blocked dialog (suppress the shared toast via `meta: { suppressErrorToast: true }`).
- **D8 — Publish incomplete-step warning (FR-007).** The real publish response is the full `ExerciseDetailDto`; after a successful `published` toggle, compute "any of the five `descriptions.ja` step fields empty" from the response and show the existing warning toast. In the form the existing inline alert keeps reading the form values. **Superseded by Y-08 Bug No.7 (2026-11-12):** the warning is a confirm _before_ publishing, via the shared `_components/exercise-publish-confirm-dialog.tsx` (「エクササイズを公開しますか？」 + incomplete-step alert, キャンセル / 公開する). List: 公開にする fetches the detail (list rows carry no steps); an empty step opens the dialog, otherwise it publishes in one click; the post-publish warning toast is removed (one success toast only). Form: turning the 公開 switch on with an empty step opens the same dialog and the switch only flips on 公開する; the tab dot and steps-tab alert stay.
- **D9 — Form 公開 switch.** POST/PATCH never carry a status. Create: POST, then if the switch is 公開 → publish call (D18 brands). Edit: PATCH, then publish only when the switch differs from the loaded status. A failed publish after a successful save shows the shared error toast and still navigates to the detail page (the exercise exists, status 非公開).
- **D10 — Errors by code, single toast.** All local `onError: () => toast.error(...)` on mutations being rewired are deleted (shared `MutationCache` toasts). Inline handling: `E-EXM-005` (related ≤3 / self) → field error on 関連エクササイズ; `E-EXM-006` (JP name required to publish) → shared toast; `E-EXM-008` (code exists) → field error on コード in the master dialog; `E-EXM-009` (master in use) → master blocked message; `E-VAL-001` → shared toast.
- **D11 — Related exercises.** Candidates from the list endpoint with server-side `keyword` (debounced), **20 per page, loaded on scroll** (`useInfiniteQuery` + `useInfiniteScroll`, 2026-10-13 — replaced the single `limit: 100` page), self excluded client-side. Selected rows and the names on detail: `useQueries` over `relatedExerciseIds` (≤3) → `ExerciseDetailDto.name` + `categoryName`.
- **D12 — Linked equipment.** Candidates: `GET /admin/training-equipment` with `mstToolId = toolId`, server-side `keyword` (debounced), **20 per page, loaded on scroll** (2026-10-13 — replaced the single `limit: 100` page and the client-side name filter) and the existing store-scope rule. Selected rows (form 「選択中」) and the names on detail are read **by id** (`GET /admin/training-equipment/{id}` via `useQueries`), so a link on any page or outside the current search keeps its name; an id that cannot be read renders as the id with a muted style.
- **D13 — Tags (FR-010).** Rows from `/admin/exercise-tags` (`name`, ON/OFF by `enabledTagIds`). The hard-coded `EXERCISE_TAGS` constant is removed. The prototype's grouping by tag category is not defined by FR-010 and the real tag has no category field → R302 (flat list in Round 1).
- **D14 — Images.** Upload via `useMediaUpload({ tag: 'exercise-image' })` returning `s3Key`; form images hold `{ s3Key, previewUrl?, isPrimary }`; max 5 (spec 補足) is FE-only (BE allows 20). Body: `images: [{ imageS3Key, isPrimary }]` (BE assigns `sortOrder` by array position).
- **D15 — Role gating.** Unchanged: screen and actions gated to System / Headquarter (`RoleGatedButton`, `Permission.Exercises*`); 403 `E-AUTH-100/103` falls to the shared handler.
- **D16 — Reference masters (FR-011).** `status` → `isActive` (labels 有効/無効), `usageCount` → `referenceCount` (delete disabled when > 0, BE also guards `E-EXM-009`), search → `keyword` (tool types: client-side filter — no param), `code` immutable on edit (`E-EXM-007`), `sortOrder` number. Exercise-type extra fields (`volumeFormula`, `requires*`, `weightSemantics`) are not in the UI and are not sent.
- **D18 — Publish across all sub-brands (user decision 2026-10-12, PO confirmed one shared flag 2026-10-13).** The API stores publish state per sub-brand (`exercise_brand_links`; BE built the "future per-brand publish" room of Y-08 L47 up front). Per-brand control is not in the current spec, so the CRM treats status as one flag: create sends `brandEnums` = all five sub-brands (`Joyfit / Joyfit24 / JoyfitYoga / JoyfitPlus / Fit365`, G-01 L52), 公開 sends `published` for all five, 非公開 sends `unpublished` for all five. Displayed status = 公開 when any link is `published` (matches the BE delete guard `E-EXM-002` and the routine-candidate rule). Kept in `_utils/exercise-status.util.ts` + `EXERCISE_SUB_BRANDS`. Known limitation: the `publishStatus=unpublished` list filter matches "any link unpublished", so legacy rows with `draft` / no links do not appear under 非公開.
- **D17 — Length limits follow the BE.** Name ≤200 (`langTextInput.name`), overview/steps ≤4000, master `code` ≤64 / `name` ≤200 / `description` ≤2000, keyword ≤100 — enforced through the Zod schemas' messages (no input `maxLength`).
- **D19 — List sorting (PO 2026-10-13).** Default 最終更新日 desc (FR-001); sortable headers as the prototype: エクササイズ名, ステータス, 最終更新日 (`DataTableColumnHeader`, `manualSorting`). State in the URL (`sort`, `order`, default `updatedAt` / `desc`); not sent until the API accepts it (B5).
- **D20 — CSV export (S2, FR-016).** 「CSV出力」 button in the list header (System / HQ, `Permission.ExercisesView`), exports the current filters without paging via `AdminExerciseMasterApi079.adminExerciseMasterControllerExportCsv` (`parseAs: 'blob'`), file name from `Content-Disposition`. No prototype for this control: placement and copy follow the training-equipment list.
- **D21 — Tag and glossary masters (S3, FR-015 / FR-017).** Two more tabs in 参照マスタ管理, in spec order (Y-08 L69): タグ (`/admin/exercise-tags`, `NamedRefMasterDto`) and 用語解説 (`/admin/explanations`, `term` instead of `name`, 説明 required). Same table / dialog / delete flow as the other tabs. No prototype: the other four tabs are the pattern.
- **D22 — English texts (S1, FR-014 v2, prototype `exercise-form.tsx`).** EN name and EN steps 0–4 are always-editable inputs under their JP fields, sent as `descriptions.en` (empty → `null`). 「要再翻訳」 badge + 「再翻訳する」 when JP changed since the EN was generated (server `needsRetranslation && !isManuallyEdited` at load, plus JP edits in this session); a hand edit re-bases it. 再翻訳 on a hand-edited field asks 「手動で編集された英語テキストがあります。再翻訳で上書きしますか？」; cancel hides the badge and keeps the EN. Save translates JP-filled / EN-empty fields first; failure → warning toast and JP-only save. All translation goes through `_utils/exercise-translation.util.ts`, which reports failure until B9.
- **D23 — Master code rules = BE (PO 2026-10-13), verified live.** カテゴリ / 筋肉部位 / エクササイズタイプ / タグ: `^[a-z][a-zA-Z0-9.]*$`; 器具種別: `^[a-z][a-zA-Z0-9]*$`; 用語解説: `^[A-Z][A-Z0-9_]*$`. Messages and placeholders per tab.
- **D24 — Tags are seed data in phase 1 (PO 2026-10-20, BE_REQUEST No.7).** The タグ tab of 参照マスタ管理 lists and searches only: no 「タグを登録」 header / empty-state button, no row menu (編集 / 削除). The create / update / delete mutations are commented out in `exercise-master/page.tsx`; `TAB_META.tag.readOnly`. Tag ON/OFF on an exercise (FR-010) is unchanged. Code: `TODO(round3) R303`.
- **D25 — English is typed by hand in phase 1 (PO 2026-10-20, BE_REQUEST No.11).** Machine translation (save-time JP→EN, 要再翻訳 badge, 再翻訳 + its confirm, 翻訳中 / failure states, the translation-failure toast) is phase 2 and commented out. EN name and EN steps stay always-editable inputs, saved as typed (empty → `null`); hand-written text is never listed in `machineTranslatedFields`. Copy without 「自動生成」: placeholder 「英語で入力（任意）」, step label 「英語版」 (form) / 「英語」 (detail), steps intro 「英語テキストは必要に応じて入力してください。」, no helper under the EN name. Code: `TODO(round3) R304`.
- ~~**D26 — 器具種別 tab: browser search, no paging (2026-10-20, BE_REQUEST No.17 pending Q&A).**~~ Superseded by D29 (2026-10-21). `/admin/tool-types` has no `keyword` / `page`; the ~10 rows are filtered in the browser and shown on one page (no pagination footer, `TAB_META.tool.paginated = false`). Code: `TODO(round3) R305`.
- **D27 — レベル = `isBeginnerVisible` (PO 2026-10-20 accepts the BE answer to B8 for this phase).** ビギナー = `true`, エキスパート = `false` on list column / filter / sort, detail, form (POST and PATCH) and CSV. `level` (`easy` / `moderate` / `hard`) is the physical difficulty and is not shown. Replaces Q1 / the fixed `true`.
- **D28 — タグ and 用語解説 tabs are phase 2 (2026-10-21).** Both tabs of 参照マスタ管理 are hidden in phase 1: `'tag'` and `'explanation'` are commented out of `TAB_ORDER` in `exercise-master/_constants/constants.ts`, so the screen shows カテゴリ / 筋肉部位 / 器具種別 / エクササイズタイプ only. `TAB_META`, the list hooks and the mutations stay in place for phase 2. Supersedes D21 (and the タグ tab part of D24) for phase 1; tag ON/OFF on an exercise (FR-010) is unchanged. Code: `TODO(phase2)`.
- **D29 — Pagination round (2026-10-21, BE `feat/anhnv/y08-exercise-api-gaps` c2d2ed05, `pagination-plan.md`).** `/admin/tool-types` now pages (`page` / `limit` ≤100, default 20 / `keyword` on code + name / `sort` / `order` / `ids`) — every caller that relied on the full list moved: 器具種別 selects (list filter + form) use `ExerciseRefMasterSelectInput kind="tool"` (`includeNone: true`, 20 per page, label by `tool-types/{id}`); the bodyweight id is one `keyword=none` read (`useBodyweightToolId`); labels use `useToolTypeLabel`; the 参照マスタ管理 器具種別 tab is server-paged like the others (`usePagedTabList`, `TAB_META.tool.paginated` dropped). タグ: `exercise-tags?getAll=true` + `exercise-tag-axes`, grouped by `axis` in axis 表示順, tags without an axis last under 「その他」 (form switches and detail badges, `useExerciseTagGroups`). Exercise detail reads `equipments` / `relatedExercises` instead of a request per id; a linked 機材 answered with `name: null` (deleted, or gate-svc unreadable) shows 「不明な機材」 + a 「取得不可」 badge — kept in the form (the operator unticks it), not clickable on the detail. Supersedes D26, closes R302 / R305; D5's tool-type and whole-tag-list notes are replaced.
- **D30 — 「なし（自重）」 is read-only in 参照マスタ管理 (2026-10-21).** The tool master row with `isSystem: true` (`code=none`) cannot be edited or deleted — the BE answers PATCH / DELETE with 422 `E-EXM-011`. The 器具種別 tab still lists it, but its row menu shows 編集 and 削除 disabled with the tooltip 「システム固定のデータのため、編集・削除できません」 (`isSystemMasterRow`, `SYSTEM_MASTER_ROW_MESSAGE` in `exercise-master/_constants/constants.ts`). Takes precedence over the 「参照中のため削除できません」 tooltip for that row. The master table is built on the shared `DataTable` (`variant="simple"`) with `DataTableRowActions` (`disabled` / `disabledTooltips`), like the other list screens. The row stays selectable as an exercise's 器具種別 (FR-008).

## Round 1 tasks

### Phase A — foundations

- **T001** `exercises/_constants/constants.ts` — re-key enums to real values (`limbUsage` incl. `single_foot`; status labels for the aggregated 公開/非公開); delete `EXERCISE_TAGS`; add `EXERCISE_SUB_BRANDS` (five `brandEnum` values, D18); add a type-level drift assertion that `EXERCISE_HAND_USAGE_OPTIONS` covers `ExerciseDetailDto['limbUsage']`.
- **T002** [P] `exercises/_utils/exercise-body.util.ts` (new) — `toCreateExerciseBody` / `toUpdateExerciseBody`: the single B1 cast; B6 first-muscle; B8 constant `isBeginnerVisible` on create only; B10 video URL; `brandEnums` on create.
- **T003** [P] `exercises/_utils/exercise-status.util.ts` (new) — `getExercisePublishStatus(brands)` (D18) and `hasIncompleteSteps(descriptions.ja)` (D8).
- **T004** [P] `exercises/_utils/exercise-master-label.util.ts` (new) — legacy list string → master name (D6).
- **T005** [P] `exercises/_utils/exercise-image-url.util.ts` (new) — asset URL from `s3Key` (B11, store util pattern).
- **T006** `exercises/_hooks/use-exercise-master-options.ts` — switch to real category / muscle / type / tool-type queries (D5); options typed from real DTOs.
- **T007** `exercises/_hooks/use-exercises-filters.ts` — `search` → `keyword`; drop `sortBy/sortOrder`; strip `toolId` / `level` from the request (B4); keep them in the URL state.

### Phase B — list & detail

- **T008** `exercises/page.tsx` — real list / publish / delete hooks; count from `pagination.totalItems`; delete gating + 409 codes (D7); publish with five sub-brands (D18) + incomplete warning (D8); remove local error toasts.
- **T009** `exercises/_components/exercises-table-columns.tsx` — `name` + `exerciseCode`; category / muscle via T004; 器具種別 and レベル cells `—` (B2/B3); status via T003 (D18); comment out header sorting (`TODO(round3) R301`).
- **T010** [P] `exercises/_components/exercise-row-actions.tsx`, `exercise-delete-dialogs.tsx` — real row type; blocked reasons by code.
- **T011** [P] `exercises/_components/exercises-filters.tsx` — options from T006; 器具種別 / レベル filters unchanged visually.
- **T012** `exercises/[id]/page.tsx` — real detail / publish / delete; status from `brands`.
- **T013** [P] `exercises/[id]/_components/basic-info-tab.tsx` — `*Name` fields, `limbUsage`, `restSeconds`, レベル `—` (B8), images via T005, video from `videos[0].videoS3Key`, secondary muscle single (B6), EN name from `descriptions.en?.name`.
- **T014** [P] `exercises/[id]/_components/explanation-steps-tab.tsx` — steps from `descriptions.ja/en` field names (B9 display unchanged).
- **T015** [P] `exercises/[id]/_components/related-info-tab.tsx` — equipment names (D12), tags from master + `enabledTagIds` (D13, flat; grouping `TODO(round3) R302`), related names via `useQueries` (D11).
- **T016** [P] `exercises/[id]/_components/exercise-detail-skeleton.tsx`, `exercises/_components/exercise-image-gallery.tsx` — image source type.

### Phase C — forms

- **T017** `exercises/_schemas/exercise-form.schema.ts` — form ↔ real DTO mappers (D2); images `{ s3Key, previewUrl?, isPrimary }`; length limits (D17); body built through T002.
- **T018** `exercises/_components/exercise-form.tsx` — real create / update / publish chain (D9); `useMediaUpload({ tag: 'exercise-image' })` (D14); related candidates with keyword + `limit: 100` (D11); equipment candidates on the real list (D12); `E-EXM-005` field error; remove local error toasts.
- **T019** [P] `exercises/_components/exercise-form-basic-tab.tsx` — option types; video input unchanged (B10).
- **T020** [P] `exercises/_components/exercise-form-related-tab.tsx` — real candidate row types; tags flat (R302).
- **T021** [P] `exercises/_components/exercise-form-steps-tab.tsx` — unchanged behaviour (S1 not built); type touch-ups only.
- **T022** `exercises/[id]/edit/page.tsx`, `exercises/create/page.tsx` — real detail query.
- **T023** `exercise-master/_constants/constants.ts`, `_schemas/exercise-master-form.schema.ts` — `isActive`, `referenceCount`, BE length limits (D16/D17).
- **T024** `exercise-master/page.tsx` — real list / create / update / delete for the four tabs (tool tab on `/admin/tool-types`, client-side search); `E-EXM-008` → code field error, `E-EXM-009` → blocked message; remove local error toasts.
- **T025** [P] `exercise-master/_components/exercise-master-table.tsx`, `exercise-master-form-dialog.tsx`, `exercise-master-delete-dialog.tsx` — real row type; code read-only on edit.

### Phase D — verification

- **T026** `npm run type-check` (0 errors) and `npm run lint`.
- **T027** Live smoke against `NEXT_PUBLIC_REAL_API_URL`: list → keyword → each filter (incl. B4 no-op) → paging → row → detail (all tabs) → create (with images, video URL, equipment, tags, related) → edit → publish/unpublish (list + detail + form switch) → delete (unpublished OK, published blocked, routine-linked 409 `E-EXM-003`) → reference masters CRUD on all four tabs (incl. duplicate code 409 and in-use delete) → a non-HQ role is denied. Record verdicts for **B10**, **B11**, **D5** (`none` tool code), **D6** (legacy string = code or name).
- **T028** Append "Round 1 result" to this plan; touch `checklists/parity.md` only if one exists and real-API behaviour changes a checked item.

## Round 1b tasks (PO decisions 2026-10-13)

- **T029** List sorting (D19): `use-exercises-filters.ts` (`sort` / `order` in the URL, B5 strip), `exercises-table-columns.tsx` (three `DataTableColumnHeader`s), `page.tsx` (`manualSorting`). Replaces R301.
- **T030** CSV export (D20, B19): `_components/exercise-csv-export-button.tsx`, wired in the list header.
- **T031** Tag + glossary tabs (D21, D23): `exercise-master/_constants`, `_schemas` (per-tab rules), `_utils/exercise-master-api.util.ts` (glossary body), table / dialog labels, `page.tsx` queries + mutations.
- **T032** English texts (D22, B9): `_utils/exercise-translation.util.ts` (seam), schema (`nameEn` / `textEn` limits + translation meta), basic tab (EN name), steps tab (EN steps), form (save-time translation, 再翻訳 dialog), body util (`descriptions.en`).
- **T033** Verification: type-check, lint, live smoke (sort URL, CSV download, tag / glossary CRUD, EN round-trip, translation-failure path).

## Round 2 backlog

- **R201 (B1)** BE renames the admin create DTO → regen → delete the cast in `exercise-body.util.ts`; build the body from the generated type.
- **R202 (B2)** Read the list tool name → replace the `—` cell in `exercises-table-columns.tsx`.
- **R203 (B3 + B8)** Wire the explicit レベル field on list column, detail, form (create/update) → delete the fixed `isBeginnerVisible` and the `—` placeholders.
- **R204 (B4)** Pass `toolId` / レベル filter params → delete the strip in `use-exercises-filters.ts`.
- **R205 (B5)** Verify `updatedAt desc` ordering (or send `sort/order`) → nothing to delete unless params are added.
- **R206 (B6)** Send `secondaryMuscleIds[]`, read the array on detail → delete the first-item reduction.
- **R207 (B12)** Verify an unpublished exercise is hidden from the mobile exercise APIs → no FE code to delete.
- **R208 (B9)** Re-check EN auto-filled after save (BE translation) → no FE code to delete; then decide on S1.
- **R209 (B10)** Send to the BE's video URL field → delete the `videoS3Key` reuse.
- **R210 (B11)** Use the signed image `url` → `exercise-image-url.util.ts` reduces to `url ?? fallback`.
- **R211 (B13)** BE types `description` as string → regen → delete the cast in `exercise-master-api.util.ts`.
- **R212 (B15)** BE fixes the tag-assignment insert → put `enabledTagIds: values.enabledTagIds` back in `exercise-body.util.ts`.
- **R213 (B14)** Re-check Manager / Staff → 403 on `/admin/exercises` and the ref-master routes → no FE code to delete.
- **R214 (B16)** Read master names from the list item → delete `exercise-master-label.util.ts` and its two call sites.
- **R215 (B17)** Re-check the 非公開 filter returns seeded rows → no FE code to delete.
- **R216 (B5)** Pass `sort` / `order` → delete the strip in `use-exercises-filters.ts`.
- **R217 (B9)** Wire the translate endpoint in `exercise-translation.util.ts`; send `machineTranslatedFields` for unedited machine output.
- **R218 (B19)** Re-check the CSV content; drop the BOM seam if the BE adds one.
- ~~**R219 (B18)**~~ Done 2026-10-21 (D29) — tags grouped by `axis`.

## Round 3 backlog (phase 2)

- ~~R301~~ Column-header sorting → moved to Round 1b (T029, PO 2026-10-13).
- ~~**R302**~~ Done 2026-10-21 (D29) — grouped by the tag `axis`. Was: (pending PO, needs B18) Tag grouping by tag category (prototype `exercise-form.tsx` L633, `exercise-detail.tsx` L462). Commented out in `exercise-form-related-tab.tsx` and `related-info-tab.tsx` (`groupExerciseTags` usage). Needs: FR-010/FR-015 to define grouping + a category on the tag master DTO.
- **R303** (phase 2, D24) Tag CRUD in 参照マスタ管理 → タグ (FR-015): restore the header / empty-state 「タグを登録」, the row menu and the three tag mutations; drop `TAB_META.tag.readOnly`. Needs PO to move tags off seed-only, and the BE create rule vs seeded `_` codes (BE_REQUEST No.7 / B20).
- **R304** (phase 2, D25, needs BE_REQUEST No.11) Machine translation (FR-014): wire the translate endpoint in `exercise-translation.util.ts`, restore `translateMissing` on save, the warning toast, the 再翻訳 confirm in `exercise-form.tsx`, the badge / 翻訳中 / failure UI in `exercise-english-text-field.tsx`, the name helper in `exercise-form-basic-tab.tsx`, the steps intro and the 「（自動生成）」 labels.
- ~~**R305**~~ Done 2026-10-21 (D29). Was: (pending Q&A, D26, BE_REQUEST No.17) 器具種別 tab server-side `keyword` / paging: restore the slice in `use-master-lists.ts` (or move to `usePagedTabList`), drop `TAB_META.tool.paginated`.
- **R306** (phase 2, D28) タグ / 用語解説 tabs in 参照マスタ管理 (FR-015 / FR-017): uncomment `'tag'` and `'explanation'` in `TAB_ORDER`; then R303 for tag CRUD.

## Open questions

_None._

## Resolved questions (2026-10-12, user)

- 協働筋 cardinality — spec silent → BE ask, Round 2 (B6).
- Brand model — brands are JOYFIT and FIT365 only; the five enum values are sub-brands (G-01 L52) → handled by D18.
- レベル — no FE-side mapping onto `isBeginnerVisible` / `level`; BE to define the two-value level explicitly (B8).
- FR-014 — Round 1 keeps the current UI; missing translation is a BE defect re-checked in Round 2 (B9); the v2 UI stays S1.
- Scope — reference-master screen (FR-011) included in Round 1.
- Q2 (publish model) — not a blocker: the per-sub-brand design may serve a later phase; Round 1 always sends all five sub-brands so 公開 publishes everywhere and 非公開 unpublishes everywhere (D18). Mobile not honouring the status is carried as B12.
- Q1 (B8) — accepted: POST sends a fixed `isBeginnerVisible: true` on create only, so Round 1 exercises are visible in the app's beginner mode until Round 2; included in the BE ask for backfill.

## PO decisions (2026-10-13)

1. 協働筋 — multiple (B6 → BE ask).
2. レベル — BE adds a field for the two spec levels (B8).
3. Publish — one shared flag (D18 confirmed).
4. Sorting — default as the spec; sortable columns as the prototype (D19).
5. Tag grouping — asked how the BE handles it → B18 (no category in the API; convention only). Decision pending.
6. Master code format — follow the BE (D23).
7. S2, S3 — build now (D20, D21). S1 — build per prototype: auto-translate + hand-editable; the missing translate API goes to Round 2 (D22, B9).

## PO decisions (2026-10-20)

1. タグ — phase 1 uses the seed data only; tag CRUD UI commented out, its test cases Block (D24, R303). BE_REQUEST No.7 closed for phase 1.
2. FR-014 machine translation — phase 2; staff type the English by hand (D25, R304). BE_REQUEST No.11 / B9 is no longer a phase-1 blocker.
3. 器具種別 search / paging — not decided (Q&A pending); browser-side search, paging commented out (D26, R305). BE_REQUEST No.17.
4. レベル — `isBeginnerVisible` accepted for this phase (D27). Q-R21 closed.

## Decisions (2026-10-21)

1. 参照マスタ管理 → タグ and 用語解説 tabs — phase 2; hidden in phase 1 (D28, R306). Their test cases are Block.

## Round 1 result (2026-10-12)

**Status: committed `399c7e5d` on `feat/exercise-integration-api`.** Both screens call `@/lib/api-real`
only; the mock routes are no longer called (verified in the browser run: no `/api/crm/exercise*`
request).

### What shipped

- **Phase A** — `exercises/_constants/constants.ts` re-keyed to the real enums (`single_foot`), sub-brand
  list (D18) and `limbUsage` drift assertions; new `_utils/`: `exercise-body.util.ts` (B1 cast, B6, B8,
  B10, B15 seams), `exercise-status.util.ts` (D18 status + publish body, D8 step check),
  `exercise-error.util.ts`, `exercise-master-label.util.ts` (D6), `exercise-image-url.util.ts` (B11);
  `use-exercise-master-options.ts` on the real category / muscle / type / tag / tool-type lists;
  `use-exercises-filters.ts` (`keyword`, B4 strip, status mapping).
- **Phase B** — list (`page.tsx`, columns, row actions, delete dialogs): real list / publish / delete,
  pre-check + 409 code handling (D7), `—` cells (B2/B3), header sorting commented out (R301); detail
  (`[id]/page.tsx` + three tabs, gallery): real detail, D18 status, linked-equipment names
  (`use-exercise-linked-equipment.ts`, D12), related names via `useQueries` (D11), flat tags (R302).
- **Phase C** — form: create / update / publish chain (D9), `useMediaUpload('exercise-image')` (D14),
  server-side related search (D11), real equipment candidates (D12), `E-EXM-005` field error; reference
  masters: four tabs on the real endpoints (tool tab on `/admin/tool-types`, client-side search),
  `isActive` / `referenceCount`, `E-EXM-008` → コード field error, B13 cast.
- **Changes found by the smoke** (not in the original task list):
  - B15 strip (tags) — see the blocker row.
  - Reference-master コード now enforces the BE rule `^[a-z][a-zA-Z0-9]*$` (camelCase; `_` is rejected
    by the BE with 400 `expected camelCase code`), and the input placeholder changed from
    「英数字・アンダースコア」 to 「半角英数字（例: lowerBody）」 because the old hint described a value
    the API rejects.
  - Image load failure fallback (B11).

### Static gates

- `npm run type-check`: **0 errors.** The staged regen made `storeId` required on
  `adminLockerControllerListLockersQueryKey`; `stores/[id]/map/_components/store-map-setup.tsx` now passes
  `{ query: { storeId } }` (still prefix-matches the list and infinite variants).
- `npm run lint`: clean.

### Live smoke (dev API, HQ account `lodu4289+headquater@gmail.com`)

API level — **45/47 OK**; the two NG are BE gaps (B11, B14). Test data used the `TC-EX-<ts>` prefix and
was deleted afterwards (2 exercises, 1 category, 1 tool type).

| Step                                                                                                                                                                    | Result      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Master lists (12 categories, 30 muscles, 6 types, 9 tags, 10 tools incl. `none` = なし（自重）) — D5                                                                    | OK          |
| List, paging (page 2), keyword, categoryId, primaryMuscleId, publishStatus filters                                                                                      | OK          |
| `toolId` param → 400 (confirms the B4 strip); `limit=200` → 400 (confirms D4)                                                                                           | OK          |
| Image presign (`exercise-image`) + S3 PUT                                                                                                                               | OK          |
| Create with the admin body (B1 seam) → 201, `EX-00079`, five sub-brand links unpublished (D18)                                                                          | OK          |
| Video URL in `videoS3Key` round-trips (B10)                                                                                                                             | OK          |
| Detail `*Name` pairs, `single_foot`, `restSeconds`                                                                                                                      | OK          |
| Asset path without bearer → 401 (B11)                                                                                                                                   | **NG (BE)** |
| `enabledTagIds` → 500 (B15, why it is stripped)                                                                                                                         | confirmed   |
| PATCH full body (`secondaryMuscleId: null`, five steps, videos cleared)                                                                                                 | OK          |
| `exerciseCode` on PATCH → 400                                                                                                                                           | OK          |
| Related = [A] OK; self → 422 `E-EXM-005`                                                                                                                                | OK          |
| Publish all sub-brands → published filter finds it; delete → 409 `E-EXM-002` (userMessage 「このエクササイズは公開中のため削除できません。先に非公開にしてください。」) | OK          |
| Unpublish → unpublished filter finds it → delete → 204                                                                                                                  | OK          |
| Category create / duplicate → 409 `E-EXM-008` / update / keyword / in use → 409 `E-EXM-009` / `referenceCount` 1                                                        | OK          |
| Tool type create / update / delete                                                                                                                                      | OK          |
| Equipment candidates by `mstToolId` without `storeId` (HQ) → 45 rows                                                                                                    | OK          |
| Manager `GET /admin/exercises` → 200 (B14)                                                                                                                              | **NG (BE)** |

Not run: the routine-linked delete (`E-EXM-003`) — needs a live routine referencing a test exercise; the
code path is the same blocked dialog as `E-EXM-002`.

Browser (Next dev on :3000, Playwright, HQ) — **15/15 OK**: login → list (25 rows, 71件, `—` in 器具種別 /
レベル, keyword sent as `keyword=`) → 5 filters → row → detail (3 tabs) → edit form prefilled, 9 tag
switches from the master → create form → 参照マスタ (12 categories, tool tab lists なし（自重）) → no page
errors. One transient dev-API outage (502/503, then a 500 on every create) occurred mid-run and cleared
after the BE redeploy; the results above are from after it.

### Remaining TODOs

- `TODO(round2)`: B1, B4, B6, B8, B9, B10, B11, B13, B15 (in code); B2, B3, B5, B12, B14, B16, B17 (BE-side or
  display placeholders).
- `TODO(round3)`: R301 (header sorting), R302 (tag grouping).
- Not built (by decision): S1, S2, S3.

## Round 1b result (2026-10-13)

**Status: implemented on `feat/exercise-integration-api` (uncommitted).** T029–T033 done.

### What shipped

- **T029 (D19)** — sortable headers エクササイズ名 / ステータス / 最終更新日 (two-state), `sort` / `order` in the
  URL (default `updatedAt` / `desc`, dropped from the URL by nuqs when default), not sent (B5 strip).
- **T030 (D20)** — `exercise-csv-export-button.tsx` in the list header; exports the current filters without
  paging; UTF-8 BOM prepended (B19 seam).
- **T031 (D21, D23)** — 参照マスタ: タグ and 用語解説 tabs (spec order), per-tab code rules / placeholders,
  用語 label + required 説明 for the glossary, `toCreateExplanationBody` / `toUpdateExplanationBody`.
- **T032 (D22)** — `exercise-translation.util.ts` (B9 seam), `use-exercise-translation.ts` (status, 再翻訳,
  confirm, save-time translation), `exercise-english-text-field.tsx` (EN name + steps 0–4), schema
  (`nameEn` ≤200, `textEn` ≤4000, `translation` meta), body sends `descriptions.en` +
  `machineTranslatedFields`.

### Static gates

- `npm run type-check`: 0 errors. `npm run lint`: clean.

### Live smoke (dev API, HQ)

API — **20/20 OK** (test data `TC-EX-<ts>` / `tcex<ts>` / `TCEX_<ts>`, all deleted):

- `descriptions.en` create / update / clear (`null`s) round-trips.
- `machineTranslatedFields: ['trainingPoint']` → `{isManuallyEdited:false, needsRetranslation:false}`; JP
  edit afterwards → `needsRetranslation:true, isManuallyEdited:false` (the D22 load rule).
- Hand-written EN → `{isManuallyEdited:true, needsRetranslation:true}` (not flagged at load, by design).
- CSV export by keyword and by filters → 200 `text/csv`, no BOM (B19).
- `sort=name` on the list → 400 (confirms the B5 strip).
- Tag / glossary create, update, keyword, duplicate → 409 `E-EXM-008`, delete.
- Code rules (probe): tags / categories accept `.`, reject `_`; glossary accepts `[A-Z0-9_]`, rejects lowercase
  and `-`; glossary `description` required (B20: seeded `gripType.thumb_around` cannot be re-created).

Browser (Playwright, HQ) — **27/27 OK**: sortable headers (3) and plain ones; URL sort, no `sort=` sent;
CSV download with BOM, export without page/limit; create form EN name input + 5 EN step textareas; edit
form: hand EN → no badge, JP edit → 要再翻訳, 再翻訳 on hand-edited → confirm, cancel → badge cleared / EN
kept, confirm → failure state 「英語版を生成できませんでした。日本語のみで保存できます。」 with EN kept;
参照マスタ: 6 tabs in spec order (12 / 30 / 10 / 6 / 9 / 0), tag code-rule message, glossary 用語 column and
説明 required; no page errors.

Not run in the browser: a real save through the translation-failure path (the API side of the same body is
covered above); it would create an exercise from the UI.

## Round 2 plan (2026-10-20)

**Backend**: `fitness-backend-v2` branch `feat/anhnv/y08-exercise-api-gaps` (`1754302c`), **local** (`http://localhost:3000`, training migrations 026–028, gate 018), magic-link login per [../016-routine-management/LOCAL_API_LOGIN.vi.md](../016-routine-management/LOCAL_API_LOGIN.vi.md). FE on `http://localhost:3001` with `.env.local` → local BFF. Per-item verdicts: [BE_REQUEST.vi.md](BE_REQUEST.vi.md) column 「FE đánh giá (Round 2)」 and § Đánh giá Round 2.

**Verdict**: 21/26 fixed, 2 fixed differently / partly (No.8, No.14), 3 not done (No.7 on purpose, No.11, No.17). ~~Still blocking: B9~~ → phase 2 by the PO decisions of 2026-10-20 (No.7 / No.11 / No.17 / No.8, see § PO decisions (2026-10-20)). Nothing blocks phase 1 on the API side; still open: tag grouping (R302).

### Open questions (Round 2)

| #         | Question                                                                                                                                                                               | Proposal                                                                                              | Owner   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- |
| ~~Q-R21~~ | **Closed 2026-10-20: accepted (D27).** BE answered B8 with `isBeginnerVisible` (true = ビギナー, false = エキスパート) instead of a new field (PO 2026-10-13 asked for a new field).   | Accept — two values, exposed on list / detail / POST / PATCH / filter / sort / CSV. Wire it in R203.  | PO      |
| Q-R22     | List / detail `publishStatus` is now the BE aggregate `published` / `partial` / `unpublished`. Spec has two states; `partial` only appears if links are changed outside the CRM (D18). | Show `partial` as 公開 (same as D18 and the delete guard `E-EXM-002`); 公開 filter sends `published`. | PO / FE |
| Q-R23     | Tag grouping by axis (R302): the API now has `GET /admin/exercise-tag-axes` + `axis` per tag.                                                                                          | Ship grouping only after PO puts it in FR-010; keep the flat list until then.                         | PO      |
| Q-R24     | Data written in Round 1: CRM exercises on dev all have `isBeginnerVisible: true`; video URLs are stored in `videoS3Key`.                                                               | BE/QA fix the data on dev; FE reads `videoUrl ?? videoS3Key` so old rows still show.                  | BE      |

### Tasks

- **T040 Regen (R201, R211).** Pull `http://localhost:3000/docs-json` → `src/lib/openapi.real.json` → `npm run generate-api:real`. Diff the spec first: the BE branch is cut from `main`, so check that no endpoint used by another screen disappears or changes. Then delete the B1 cast (`exercise-body.util.ts`, build the body from `CreateAdminExerciseDto`) and the B13 cast (`exercise-master-api.util.ts`).
- **T041 List (R202, R203, R204, R214, R215, R216, R218).**
  - `exercises-table-columns.tsx`: 器具種別 ← `toolName`; レベル ← `isBeginnerVisible` (ビギナー / エキスパート); カテゴリ / 主働筋 ← `categoryName` / `primaryMuscleName`.
  - Keep `exercise-master-label.util.ts` (D6) only as the fallback for a `null` name until the 71 dev seed rows are checked, then delete it.
  - Status ← `publishStatus` (Q-R22), so the D18 client-side aggregation goes.
  - `use-exercises-filters.ts`: pass `toolId`, レベル → `isBeginnerVisible`, `sort` / `order`. Delete the B4 / B5 strip.
  - `exercise-csv-export-button.tsx`: delete the BOM seam (BE now writes one, so the file currently has two). The export sends the same filters + sort.
- **T042 Detail (R206, R209, R210).**
  - 協働筋 ← `secondaryMuscles[].name`; レベル ← `isBeginnerVisible`; 更新者 ← `updatedBy.name` (`—` when null).
  - 動画URL ← `videoUrl ?? videoS3Key`; gallery `<img>` ← `imageUrl`, so `exercise-image-url.util.ts` reduces to `imageUrl ?? fallback`.
  - Not-found state on 404 is already built (No.20).
- **T043 Form (R203, R206, R209, R210, R212).**
  - Body: `secondaryMuscleIds` (all selected), `enabledTagIds`, `isBeginnerVisible` from レベル on POST **and** PATCH (delete the fixed `true`), `videos: [{ videoUrl }]`.
  - Defaults: レベル from `isBeginnerVisible`, 協働筋 from `secondaryMuscleIds`, video from `videoUrl ?? videoS3Key`.
  - Thumbnail of a stored image ← `imageUrl`.
  - 関連エクササイズ: 422 `E-EXM-005` is already mapped (D10).
- **T044 Masters.** No change needed: `description` is typed after the regen, codes can be reused (No.24) and `sortOrder` is capped (No.23). Tool types stay client-side (No.17).
- **T045 Phase-1 scope (done 2026-10-20).** Tag tab read-only (D24, R303), EN typed by hand with the translation UI commented out (D25, R304), 器具種別 tab browser search without paging (D26, R305). R302 stays (Q-R23).
- **T046 Static gates.** `npx tsc --noEmit`, `npm run lint`, `npm test`. Every `TODO(round2)` except B9 removed (`grep -rn "TODO(round2)" src/app/(private)/exercise*`).
- **T047 Re-test** (below), then update the four TC files (Run R5, local) and this plan's Round 2 result.

### Re-test plan

Run with `execute-testcases` against the **local** BE (accounts `crm-*@crm-test.example.com`, magic link: [local-magic-link.mjs](../016-routine-management/local-magic-link.mjs); one account per agent, 60 s cooldown, max 3 sessions). Fixtures are created by the run (local has only 7 exercises). The rows marked **dev** can only be closed after the BE is deployed to dev.

| Blocker / bug                        | TC                                                                                                              | Where       | Expected after Round 2                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| B2 器具種別 column                   | A-015                                                                                                           | local       | OK                                                             |
| B3 / B8 レベル                       | A-016, B-024, B-084, C-032, C-181, C-184, C-186                                                                 | local       | OK (D27)                                                       |
| B4 filters                           | A-059, A-060                                                                                                    | local       | OK                                                             |
| B5 sort                              | A-023, A-026, A-027, A-028, A-105                                                                               | local       | OK                                                             |
| B6 協働筋 multiple                   | B-018, B-116, C-035                                                                                             | local       | OK                                                             |
| B15 tags                             | B-079, B-081, C-158, C-159                                                                                      | local       | OK                                                             |
| B6 + B8 + B11 + B15                  | C-177, C-180                                                                                                    | local + dev | OK on local except the image part (dev)                        |
| B11 images                           | B-054, B-056, C-100, C-101                                                                                      | **dev**     | OK (local has no S3 signing → 502 `E-MED-012`)                 |
| B14 roles                            | A-133, B-109, D-125                                                                                             | local       | OK (Manager / Staff / Trainer / Observer local accounts → 403) |
| B16 names                            | A-014                                                                                                           | local + dev | local OK; dev: check the 71 seed rows                          |
| B17 非公開 filter                    | A-063                                                                                                           | local + dev | local OK; dev: check the 71 seed rows                          |
| B19 CSV                              | A-124                                                                                                           | local       | OK (single BOM, CRLF, names)                                   |
| B9 translation                       | see Phase 2 — machine translation below                                                                         | —           | Block — phase 2 (D25, R304)                                    |
| No.20 deleted record                 | A-111, B-012, B-046, B-088, B-096, C-153                                                                        | local       | OK (BUG-Y08B-01, BUG-Y08A-18, BUG-Y08C-29)                     |
| No.21 metacharacters                 | A-046, D-030                                                                                                    | local       | OK (BUG-Y08A-16, BUG-Y08D-03)                                  |
| No.22 更新者                         | B-016, B-029, C-182                                                                                             | local       | OK (BUG-Y08B-10, BUG-Y08C-28)                                  |
| No.24 reuse deleted code             | D-065                                                                                                           | local       | OK (BUG-Y08D-09)                                               |
| No.25 4 related                      | C-151                                                                                                           | local       | OK (BUG-Y08C-27)                                               |
| Re-check (cause unclear)             | A-037 (code search), C-013 (unknown id on edit)                                                                 | local       | Re-run; reclassify                                             |
| Not BE / not in Round 2              | A-100, B-038 (PO: app default → Block), A-078, A-103, D-118 (E-03 deferred → Block)                             | —           | Unchanged                                                      |
| Data / tooling / other screen        | A-086, A-149, B-030, B-066, C-103, C-231, D-028, D-143, A-112, B-097                                            | —           | Unchanged (A-112 / B-097 need Y-09 on the real API)            |
| Phase 1 — tag tab read-only (D24)    | D-146 (new); D-008, D-048, D-051, D-056, D-086, D-100, D-116 on the other tabs                                  | local       | OK; the タグ part of the multi-tab cases is Block (phase 2)    |
| Phase 1 — EN typed by hand (D25)     | B-070, B-072, C-045, C-047, C-053, C-077, C-118 (expected rewritten); C-059, C-079, C-208, C-216 (rest of case) | local       | OK                                                             |
| Phase 1 — 器具種別 no paging (D26)   | D-147 (new)                                                                                                     | local       | OK                                                             |
| Phase 2 — tag CRUD (R303)            | B-082, B-083, C-160, D-040, D-070, D-108, D-114                                                                 | —           | Block (phase 2)                                                |
| Phase 2 — machine translation (R304) | B-022, B-073; C-046, C-048–C-050, C-055–C-058, C-060–C-076, C-084, C-173, C-205                                 | —           | Block (phase 2)                                                |

Regression on local: one full create → edit → publish → unpublish → delete cycle with every field filled, plus a CRUD pass on each master tab (unit D). Outside the CRM: B12 (mobile hides 非公開) is checked in the app after the dev deploy.

### Order

1. T040 → T046 on local (FE only; the BE is ready).
2. Re-test the **local** rows; fix FE NGs.
3. After the BE deploys to dev: the **dev** rows (B11 images, the B16 / B17 seed rows, B12 on mobile) and the Q-R24 data clean-up.
4. Answers to Q-R22 / Q-R23 → close R302. Phase-2 cases (tag CRUD, machine translation) stay Block — list in the TC files (Run R5 note).

## Round 2 result (2026-10-20)

**Status: T040–T047 done (not committed).** Local BE `feat/anhnv/y08-exercise-api-gaps` (`1754302c`), FE `http://localhost:3001`.

### What shipped

- **T040 OpenAPI.** `openapi.real.json` is **merged, not replaced**: only the 17 Y-08 paths (`/admin/exercises*`, the five reference masters, `/admin/exercise-tag-axes`, `/admin/tool-types*`) and the 44 schemas they reach were taken from the local BE. Replacing the whole file would have dropped fields other screens use (the BE branch is cut from `main`; the previous file came from the dev API, which already has newer locker / studio / billing contracts — 19 schemas would lose properties, e.g. `LockerListItemDto.locationCaption`). Re-generate the full file from dev once the BE branch is deployed there. The B1 cast is gone (`CreateAdminExerciseDto` / `UpdateAdminExerciseDto`). B13 is gone for the training masters; the gate tool-type DTOs still type `description` as an object → one cast kept in `exercise-master-api.util.ts` (`TODO(round2) B13`, noted on BE_REQUEST No.19).
- **T041 List.** 器具種別 ← `toolName`; レベル ← `isBeginnerVisible` (`_utils/exercise-level.util.ts`, D27); カテゴリ / 主働筋 ← `categoryName` / `primaryMuscleName`, with the D6 legacy-string resolution only when the name is `null` (`TODO(round2) R214`, until the dev seed rows are checked). Status ← BE aggregate `publishStatus` (`partial` → 公開, Q-R22). Query sends `toolId`, `isBeginnerVisible`, `sort`, `order`; CSV export sends the same filters + sort and no longer adds a BOM.
- **T042 Detail.** 協働筋 ← `secondaryMuscles[]`; レベル; 更新者 ← `updatedBy.name` (new field after 最終更新日, `—` when null); 動画URL ← `videoUrl ?? videoS3Key`; gallery ← signed `imageUrl` (`exerciseImageSrc`); related-exercise table shows レベル.
- **T043 Form.** Body built from the generated types with no cast: `secondaryMuscleIds` (all), `enabledTagIds`, `isBeginnerVisible` from レベル on POST **and** PATCH (fixed `true` removed), `videos: [{ videoUrl }]` (max 2048). Edit defaults: レベル, every 協働筋, video from `videoUrl ?? videoS3Key`, stored thumbnails preview from `imageUrl`.
- **T045** phase-1 scope (D24–D26) — see § PO decisions (2026-10-20).

### Static gates

`npx tsc --noEmit` — 0 errors. `npx eslint src/app/(private)/exercise-master src/app/(private)/exercises` — 0 problems. Remaining `TODO(round2)`: B13 (gate tool-type DTO), R214 (legacy fallback). No `npm test` script in this repo.

### Live smoke (local BE, HQ / System)

Exercise created by API (2 協働筋, バーベル, エキスパート, 2 tags, video URL, EN name), then in the browser:

- List (`?level=expert&toolId=…&sort=name&order=asc`): request carries `toolId`, `isBeginnerVisible=false`, `sort=name`, `order=asc`; row shows 胸 / 全身の筋肉 / バーベル / エキスパート / 非公開.
- CSV: one BOM, Japanese header (エクササイズコード … 最終更新日), export query = list filters + sort.
- Detail: 協働筋 全身 / 胸, 器具種別 バーベル, レベル エキスパート, 更新者 System Login, EN name; tag ON shown on 関連情報.
- Edit: prefilled EN name, レベル エキスパート, video URL; change レベル → ビギナー → 変更を保存する → PATCH 200; API afterwards: `isBeginnerVisible: true`, 2 協働筋, 2 tags, video URL and EN unchanged.
- Phase-1 scope: タグ tab without create / row menu; 器具種別 tab 10 rows, no pagination, `自重` → 1 row; EN inputs with 「英語で入力（任意）」 and no 「自動生成」 text.

Smoke data deleted. Not covered here (left to T047): create through the UI form, publish / unpublish / delete from the UI, role 403 in the UI, images (S3 → dev only).

### T047 re-test (Run R6, local BE, 2026-10-20)

Four parallel black-box runs (`execute-testcases`), one account per unit: A HQ, B HQ, C System, D System; Manager / Staff / Trainer / Observer for the role cases. Viewports 1400×900 and 1024×768. Every fixture (`TC-<unit>-2610201111…`) was deleted.

| Unit | Re-run | OK  | NG  | Block | After the FE fixes below | Unit total (all TCs)            |
| ---- | ------ | --- | --- | ----- | ------------------------ | ------------------------------- |
| A    | 16     | 13  | 3   | 0     | 16 OK (A-037 after R7)   | 147 OK / 0 NG / 5 Block of 152  |
| B    | 17     | 12  | 3   | 2     | 15 OK / 0 NG / 2 Block   | 114 OK / 0 NG / 10 Block of 124 |
| C    | 24     | 20  | 0   | 4     | —                        | 199 OK / 0 NG / 35 Block of 234 |
| D    | 12     | 12  | 0   | 0     | —                        | 140 OK / 0 NG / 7 Block of 147  |

Closed on local: B2, B3/B8 (D27), B4, B5, B6, B14, B15, B16 / B17 (local part), B19 (except 難易度 — BE drops the column, PO 2026-10-20), No.20 (BUG-Y08A-18, B-01, C-29), No.21 (A-16, D-03), No.22 (B-10, C-28), No.24 (D-09), No.25 (C-27); C-013 reclassified BE → fixed (BUG-Y08C-24). Phase-1 scope D24–D26 verified (D-146, D-147, D25 copy cases). Regression: full UI cycle create → edit → publish → unpublish → delete (unit C) and CRUD with description on every non-tag master tab + 用語解説 (unit D) — all OK.

**FE bugs found and fixed the same day** (tsc / eslint clean, re-verified in the browser):

- BUG-Y08A-23 / BUG-Y08B-23 — レベル was plain text; now a tone badge (ビギナー green / エキスパート red) in the list, detail and related table (`_components/exercise-level-badge.tsx`).
- BUG-Y08B-24 — タグ設定 ON tags were filled; now outline (ON) / neutral (OFF) as in the prototype.
- BUG-Y08B-22 — browser Back after delete re-showed the deleted detail from cache; delete / 404 now navigate with `router.replace`.

**Open after T047:**

- BE: BUG-Y08A-19 (code search) and BUG-Y08A-24 (CSV 難易度) — **fixed in BE `080bba4e`, verified 2026-10-20 (Run R7: TC-A-037, TC-A-124 OK)**; the BE also dropped the エクササイズコード CSV column (CSV = the list's 7 columns). Still open: `GET /admin/tool-types` 200 for Manager / Staff / Observer (E-03 shared endpoint, observation, BE_REQUEST.vi.md § Còn mở #6).
- Dev only (after the BE deploy): B11 images (B-054, B-056, C-100, C-101, image part of C-177 / C-180), B16 / B17 on the 71 seed rows (A-014, A-063), training-equipment link (local has 0 equipment: C-177 / C-180 equipment part), B12 mobile, Q-R24 data clean-up, full OpenAPI regeneration.
- PO: Q-R22 (partial → 公開), Q-R23 (tag grouping, R302). BUG-Y08A-22 / BUG-Y08B-15 (AlertDialog outside click) closed by PO 2026-10-20: app default, not fixed — TC-A-100 / TC-B-038 are Block, not NG.
- Unchanged by design: phase-2 Block cases (tag CRUD R303, machine translation R304).
