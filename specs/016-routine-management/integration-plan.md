# Real API Integration Plan: Y-09 Routine Master Management (ルーティン管理)

**Branch**: `feat/routing-integration-api` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Sources read**: `fitness-spec` @ `5c391cf` (Y-09.md last changed 2026-07-24, v2) · `fitness-crm-ui` @ `bac8775` (routine pages last changed 2026-10-07) · `fitness-backend-v2` `origin/main` @ `ae1b7544` (2026-10-13)
**Scope**: `src/app/(private)/routines/**` — list, detail (`[id]`), create, edit (`[id]/edit`), shared form
**Target API**: `src/lib/api-real` (`AdminRoutineMasterController_*`, `AdminExerciseMasterController_list`, `MediaController_presign`)

## Guiding principle

**Spec first, then UI.** Where the real API cannot back a spec'd element, the element stays and the
gap is a `TODO(round2) Bn` at the one place the value is dropped. No spec'd UI is deleted to fit the API.

**FE does not try to cover everything.** FE wires the API plainly; logic that belongs on the server
(per-row fan-outs, chained calls emulating one operation, re-deriving server-owned values) is a BE
ask, and Round 1 takes the simple path until it lands.

Mock routes under `src/app/api/crm/routines/**`, `src/app/api/_schemas/routine.schema.ts` and the
`_mock-db` routine tables are **left untouched** — the screens simply stop calling them.

## Endpoint mapping

| UI surface                                                       | Real endpoint                                                           | Hook                                                    | Round |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- | ----- |
| List · keyword · カテゴリ / ステータス filter · sort · paging    | `GET /api/v1/admin/routines`                                            | `adminRoutineMasterControllerListOptions`               | 1     |
| Header `N件` badge / FilterResult total while a filter is active | `GET /api/v1/admin/routines?limit=1` (no filters), `enabled` on filter  | same                                                    | 1     |
| カテゴリ select (filter + form)                                  | `GET /api/v1/admin/routine-categories`                                  | `adminRoutineMasterControllerListCategoriesOptions`     | 1     |
| Detail — 基本情報 / エクササイズ構成 tabs, edit-form prefill     | `GET /api/v1/admin/routines/{id}`                                       | `adminRoutineMasterControllerDetailOptions`             | 1     |
| 新規登録                                                         | `POST /api/v1/admin/routines`                                           | `adminRoutineMasterControllerCreateMutation`            | 1     |
| 編集 (exercises full-replaced)                                   | `PATCH /api/v1/admin/routines/{id}`                                     | `adminRoutineMasterControllerUpdateMutation`            | 1     |
| 公開/非公開 — row menu + form switch                             | `PATCH /api/v1/admin/routines/{id}/publish`                             | `adminRoutineMasterControllerPublishMutation`           | 1     |
| 複製 — row menu + detail header                                  | `POST /api/v1/admin/routines/{id}/duplicate`                            | `adminRoutineMasterControllerDuplicateMutation`         | 1     |
| 削除 (logical; 409 `E-RTM-002` while published)                  | `DELETE /api/v1/admin/routines/{id}`                                    | `adminRoutineMasterControllerRemoveMutation`            | 1     |
| エクササイズ picker (published, keyword)                         | `GET /api/v1/admin/exercises?publishStatus=published&keyword=&limit=50` | `adminExerciseMasterControllerListOptions`              | 1     |
| サムネイル upload                                                | `POST /api/v1/media/presign` (tag `routine-thumbnail`) → S3 PUT         | `useMediaUpload` (`src/hooks/use-media-upload.hook.ts`) | 1 → 2 |
| サムネイル display (stored)                                      | — (no signed URL on the routine)                                        | —                                                       | 2     |
| 器具別デフォルト重量 on 追加 (needs the exercise's tool)         | — (`toolName` on no list/composition DTO)                               | —                                                       | 2     |

## Blockers carried into Round 2

| ID      | Blocker                                                                                                                                                                   | Spec says                                                 | Round 1 behaviour (UI kept)                                                                                                                                                                                                                                                                                                                       | Round 2                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **B1a** | `POST/PATCH/GET /admin/routines[/{id}]` carry one `thumbnailS3Key: string`, not an array                                                                                  | FR-011 + 補足: gallery of **max 5**, first = main         | The 5-slot section stays. Form keeps up to 5 keys; the body sends `thumbnailS3Key: keys[0] ?? null` at one seam (`TODO(round2) B1a`). Edit prefill = `[thumbnailS3Key]` or `[]`. Known side effect: keys 2–5 are not persisted.                                                                                                                   | Send the array; delete the `keys[0]` seam and the single-key prefill.                                       |
| **B1b** | `POST /media/presign` whitelist (`packages/common/src/media/upload-tags.ts`) has no routine tag → `E-MED-011`; legacy rows already live under `public/routine-thumbnail/` | FR-011: upload + preview                                  | Upload calls presign with tag `routine-thumbnail`; it fails with `E-MED-011` and the shared toast. No tag borrowing, no client-side workaround.                                                                                                                                                                                                   | Nothing to delete — works as soon as BE whitelists the tag. Confirm the tag name with BE.                   |
| **B1c** | `GET /admin/routines/{id}` returns the raw key only — no signed `thumbnailUrl` (plan/store/option images do carry one); `/media/assets/{key}` is 401 without a signature  | FR-011: preview on CRM                                    | Fresh uploads preview via an object URL (pattern `use-plan-thumbnail-upload.ts`). A stored key with no URL renders a neutral placeholder tile (form + detail gallery), not a broken `<img>`.                                                                                                                                                      | Read `thumbnailUrl(s)`; delete the placeholder branch.                                                      |
| **B2**  | `POST /admin/routines/{id}/duplicate` names the copy `${name} (copy)` (`routine-admin.repository.ts:184`)                                                                 | FR-012: 「（元の名称）のコピー」                          | Toast and the edit screen show the name the API returns. No follow-up PATCH to rename.                                                                                                                                                                                                                                                            | Nothing to delete — BE change only.                                                                         |
| **B3**  | `toolName` exists only on `GET /admin/exercises/{id}`; neither `ExerciseListItemDto` (picker) nor `AdminRoutineExerciseDto` (composition) carries it                      | FR-008: 追加 seeds 重量 = 器具別最低重量                  | **Partly resolved 2026-11-04 (Y-09 Bug No.4):** `ExerciseListItemDto` now carries `toolCode`, so picking an exercise (and 「セット追加」 on that row) seeds 重量 from `ROUTINE_MIN_WEIGHT_BY_TOOL_CODE`. `AdminRoutineExerciseDto` still has no tool field, so 「セット追加」 on a row loaded in edit mode starts 重量 blank (`TODO(round2) B3`). | Add `toolCode` to `AdminRoutineExerciseDto` (BE request No.9, remaining half); seed edit-mode rows from it. |
| **B4**  | `POST/PATCH /admin/routines` do not accept `publishStatus`; create always lands 非公開                                                                                    | Form has the 公開/非公開 switch (prototype + spec FR-007) | Keep the existing save → `PATCH …/publish` chain (already built). If the second call fails the routine is saved unpublished and the shared toast reports `E-RTM-003` etc. `TODO(round2) B4` on the chain.                                                                                                                                         | Send `publishStatus` in the save body; delete the chain and `applyPublishThenFinish`.                       |

### Spec'd but not built

| ID  | FR     | What the spec defines                                                         | Missing in                                                                                                               |
| --- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| S1  | FR-010 | ルーティンカテゴリ CRUD (name, description, banner icon, order, in-use guard) | code + prototype — out of scope per Clarification 2026-07-10; API exists (`/admin/routine-categories` POST/PATCH/DELETE) |
| S2  | FR-015 | CSV export                                                                    | code + prototype — out of scope per Clarification; API exists (`GET /admin/routines/export`)                             |
| S3  | FR-009 | Enable/disable set fields by exercise type                                    | code + prototype — Clarification: always seed both defaults                                                              |
| S4  | FR-008 | Drag & drop reorder                                                           | code + prototype — up/down buttons satisfy "D&D **or** 上下移動"                                                         |

### Round 3 (prototype-only)

None — the prototype and the code agree; no element exists without a spec FR.

## Decisions

- **D1 — No mapper layer.** Components import `RoutineListItemDto`, `AdminRoutineDetailDto`,
  `AdminRoutineExerciseDto`, `RoutineSetDto`, `RoutineCategoryDto`, `ExerciseListItemDto` from
  `@/lib/api-real/types.gen` directly. The form keeps its own string-based values (RHF); the only
  translation is the existing `mapRoutineDetailToFormValues` / `mapRoutineFormValuesToBody` pair.
- **D2 — One cast seam for the codegen defect.** The BE declares `description`, `thumbnailS3Key`,
  `hqComment`, `supersetGroup` and the five `target*` set numbers as `type: object` → codegen types
  them `{[key: string]: unknown} | null`. `_utils/routine-body.util.ts` builds the body with real
  types and casts once to `AdminCreateRoutineDto` (`TODO(round2)`: BE fix → regen → delete the cast).
  `openapi.real.json` / `src/lib/api-real/**` are never hand-edited.
- **D3 — Field/param renames in place.** `search`→`keyword`, `sortBy`/`sortOrder`→`sort`/`order`,
  `nameJa`→`name`, `updatedByName`→`updatedByStaffName ?? createdByStaffName ?? '—'`,
  `thumbnailS3Keys[]`→`thumbnailS3Key` (B1a), responses lose the `{ routine }` wrapper.
- **D4 — Nullable legacy fields.** `routineCode` null → `—`; `categoryId`/`categoryName` null → no
  category badge, and the edit form leaves カテゴリ empty so the required rule asks for one.
- **D5 — Paging.** Real `limit` max is 100 → `ROUTINE_PAGE_SIZE_OPTIONS = [25, 50, 100]`, default 50
  unchanged. A stale `?rt_page_size=200` URL falls back to the default (existing normalisation).
- **D6 — Counts.** Filtered count = `pagination.totalItems`. Unfiltered total (`N件` badge,
  FilterResult denominator) = the main query when no filter is active, otherwise a second
  `limit: 1` query `enabled` only while filtering (pattern: `staffs/page.tsx`).
- **D7 — Sort.** No sort param → BE default `updatedAt desc` (= FR-001 default). `exerciseCount`,
  `publishStatus`, `name`, `updatedAt` all honour `order` on the BE (verified in source).
- **D8 — Errors by code, shared toast.** Remove every local `onError: toast.error(...)` on the
  routine mutations (the `MutationCache` already toasts `userMessage`). Keep success toasts and the
  `invalidateList()` refetch on failure (publish/delete race: `E-RTM-002`, `E-RTM-003`).
  Client-side guards stay as plain UX: delete disabled while published, publish disabled at 0
  exercises; the server remains the authority.
- **D9 — Categories.** Default `includeDeleted=false`; no extra client filtering. Not paginated.
- **D10 — Exercise picker.** `publishStatus=published` matches the server's selectability rule
  closely enough; an exercise the server still rejects surfaces as `E-RTM-004` via the shared toast.
  Duplicate-pick prevention stays client-side (plain form validation, same rule as BE `E-VAL-001`).
- **D11 — Permissions unchanged.** `Permission.Routines*` already map to HQ/System role tier and the
  `canViewContent` / `canManageContent` flags; no change.
- **D12 — Cross-screen link.** エクササイズ名 → `/exercises/[id]` stays. Y-08 is still on the mock,
  so a real uuid 404s there until Y-08 is integrated — noted, not worked around. (Confirmed 2026-10-14.)
- **D13 — No brand.** The API accepts an optional `brandEnum` on create/update/list; Y-09 says HQ
  routines are shared by JOYFIT・FIT365, so the FE never sends it (null = both brands) and adds no
  brand filter. (Confirmed 2026-10-14.)

## Round 1 tasks

### Phase A — foundations

- **T001** `_constants/routine.constants.ts` — import `RoutineListItemDto['publishStatus']` from
  `api-real`; page sizes `[25, 50, 100]`; delete `DEFAULT_WEIGHT_BY_TOOL_NAME` / `getDefaultWeightByToolName` (no spec source for the values —
  Q2; Round 1 sets no weight default).
- **T002** [P] `_utils/routine-body.util.ts` (new) — typed body builder + the single D2 cast + the
  B1a `keys[0]` seam.
- **T003** [P] `_hooks/use-routine-filters.hook.ts` — `AdminRoutineMasterControllerListData`
  query type; `keyword` / `sort` / `order` param names.

### Phase B — list & detail

- **T004** `page.tsx` — real list + baseline-count query (D6); real publish/duplicate/delete
  mutations; drop local error toasts (D8); duplicate navigates to `result.id`.
- **T005** [P] `_components/routine-table-columns.tsx`, `routine-row-actions.tsx`,
  `routine-filters.tsx` — `RoutineListItemDto`, nullable code/category (D4), real categories hook.
- **T006** `[id]/page.tsx` — real detail / duplicate / delete; drop local error toasts.
- **T007** [P] `[id]/_components/routine-basic-info-tab.tsx` — `AdminRoutineDetailDto`;
  更新者 fallback (D3); gallery from `thumbnailS3Key` with the B1c placeholder.
- **T008** [P] `[id]/_components/routine-exercise-composition-tab.tsx` — `AdminRoutineExerciseDto` /
  `RoutineSetDto` (shape is already compatible; `categoryName` badge = 対象部位).

### Phase C — form

- **T009** `_schemas/routine-form.schema.ts` — detail→form map from `AdminRoutineDetailDto`
  (single-key prefill B1a); body via T002.
- **T010** `_components/routine-form/routine-form.tsx` — real create/update/publish mutations,
  results without `{ routine }`; keep the B4 chain with `TODO(round2) B4`; drop local error toasts.
- **T011** [P] `routine-form-basic-info-section.tsx` — real categories hook.
- **T012** [P] `routine-form-thumbnail-section.tsx` — `useMediaUpload({ tag: 'routine-thumbnail' })`
  (B1b), object-URL previews for fresh uploads, placeholder for stored keys (B1c).
- **T013** [P] `routine-form-exercise-row.tsx` — real exercise list hook (`keyword`, `name`);
  remove the `getCrmExercisesByIdOptions` fan-out and `toolName` seeding (B3, weight `''`).
- **T014** `[id]/edit/page.tsx` — real detail hook; `data` is the routine itself.

### Phase D — verification

- **T015** `npm run type-check` = 0 errors, `npm run lint` clean; `grep '@/lib/api/' routines/` empty.
- **T016** Live smoke on the real API (whatever HQ account is available at the time — provisioning one
  is out of scope, see Q5): list → keyword → each filter → sort → paging →
  detail → create (with/without publish) → edit (reorder, add/remove set, comment) → publish /
  unpublish (0-exercise guard) → duplicate → delete (published = blocked, unpublished = OK);
  thumbnail upload records the B1b outcome; one denied role (Manager → 403/redirect).
- **T017** Append **Round 1 result** to this file.

## Round 2 backlog

- **R201 (B1a)** API takes `thumbnailS3Keys[]` → send all keys; delete the `keys[0]` seam in
  `routine-body.util.ts` and the single-key prefill in `routine-form.schema.ts`.
- **R202 (B1b)** Tag whitelisted → re-run the upload smoke; fix the tag string if BE named it differently.
- **R203 (B1c)** `thumbnailUrl(s)` on detail → feed the gallery / form previews; delete the placeholder branch.
- **R204 (B2)** BE names copies 「…のコピー」 → re-check only.
- **R205 (B3)** `toolName` (or `defaultWeightKg`) on `ExerciseListItemDto` + `AdminRoutineExerciseDto`
  → seed weight from it in `routine-form-exercise-row.tsx`.
- **R206 (B4)** Save body accepts `publishStatus` → delete `applyPublishThenFinish` and the publish
  mutation from `routine-form.tsx`.
- **R207 (D2)** BE types the body scalars properly → regen, delete the cast in `routine-body.util.ts`.

## Round 3 backlog

None.

## Open questions

Status as of 2026-10-14 (BE `origin/main` @ `b2d613c8` — no routine/exercise/media change since `ae1b7544`).

- **Q1 (B1) — CLOSED: spec wins, BE implements the spec.** Gallery of max 5, first = main (Y-09
  補足), upload + preview on CRM (FR-011). BE owns the shape (array or images sub-resource), the tag
  name and its access level, and the signed URL(s); FE follows whatever BE ships (R201–R203). Round 1
  behaviour unchanged (B1a/B1b/B1c).
- **Q2 (B3) — CLOSED (see below; was OPEN — values had no spec source).** Checked 2026-10-14:
  - **E-03** (トレーニング機材管理) defines no weight field — equipment carries 機材名・器具種別・数量・
    設置場所・設置状態・メーカー・型番・設置日・備考 only; 器具種別 just mirrors Y-08 `mst_tool`.
  - **Y-08** `mst_tool` = 10 codes (なし…その他), no weight. BE `MstTool` (gate-svc) has
    `code / name / description / sortOrder / isActive` — no weight column.
  - No other spec (CRM or mobile) defines 器具別最低重量; FR-013 only reuses the term as a fallback.
  - The only numbers are hard-coded in the **prototype** (`fitness-crm-ui` `routine-form.tsx`
    `EQUIPMENT_DEFAULT_WEIGHT`, 5 types: barbell 20 / dumbbell 5 / machine 10 / cable 10 /
    bodyweight 0). Our `DEFAULT_WEIGHT_BY_TOOL_NAME` copies those and **invents** スミスマシン 20 /
    ケトルベル 8 / ゴムバンド・TRX・その他 0.
  - Separately, neither `ExerciseListItemDto` nor `AdminRoutineExerciseDto` carries any tool field
    (`toolId` / code / name), so FE cannot seed even with a confirmed table (BE request No.5).
  - 「器具」 in FR-008 = **器具種別 (`mst_tool`, Y-08 FR-011)** — the exercise's tool _type_, not
    E-03 store equipment (`training_equipment` only references `mst_tool` via `mst_tool_id`). Y-09
    therefore never needs E-03 data; E-03 appears in Y-09 only for the mobile store filter.
    **Decision (2026-10-14)**: Q2 stays open. **Round 1 sets no weight default** — 重量 starts empty
    (`''`) on every new set; Rep 10 / 時間 90 / RPE 0 stay. Revisit once a field is defined.
  - **CLOSED 2026-10-20** — Y-09 `261020_v3` FR-008: Phase 1 uses system constants (バーベル 20 /
    ダンベル 5 / マシン 10 / ケーブル 10 / 自重 0 kg); every other 器具種別 leaves 重量 blank; a weight
    column on `mst_tool` is Phase 2. Implemented 2026-11-04 (Y-09 Bug No.4) keyed by `toolCode`
    (`barbell` / `dumbbell` / `machine` / `cable` / `none`, verified live).
- **Q3 (B4) — OPEN, owner: user.** Keep the save → publish chain. The user will confirm whether the
  create screen really needs to save as 公開 directly; only then is `publishStatus` in the save body
  requested from BE. Not in the BE request list.
- **Q4 (B2) — CLOSED: BE changes the copy name to 「（元の名称）のコピー」 per FR-012** (BE request No.4).
  FE only re-checks (R204).
- **Q5 — CLOSED: out of scope.** Account provisioning is not part of this integration (accounts can
  also be revoked); T016 runs with whatever HQ account is available.

## BE request list (for Notion)

Definite BE fixes only (spec mismatch or FE cannot implement the spec without server-side logic).
B4 (`publishStatus` in the save body) is an improvement, not a blocker, and is left out — see Q3.

| No  | API endpoint                                                                   | 画面                                           | ステータス | 備考                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | POST /media/presign                                                            | Y-09: ルーティン登録・編集                     | 追加       | B1b。アップロードタグのホワイトリスト（`packages/common/src/media/upload-tags.ts`）にルーティン用タグがなく、サムネイル画像をアップロードすると E-MED-011 になる。既存データは `public/routine-thumbnail/` 配下にあるため、`routine-thumbnail` タグの追加をお願いしたい（アクセスレベルは既存キーに合わせて public か、他マスタ画像と同じ member-shared かを決めて FE に連絡）。                                                                                                                                                                                                                                                                                                                        |
| 2   | POST /admin/routines<br>PATCH /admin/routines/{id}<br>GET /admin/routines/{id} | Y-09: ルーティン登録・編集・詳細               | 修正       | B1a。Y-09 補足「サムネイル画像の複数枚対応: 最大5枚のギャラリー、1枚目がメイン」に対し、API は単一の `thumbnailS3Key: string` しか持たない。`thumbnailS3Keys: string[]`（最大5件、先頭がメイン）または plan/option と同様の images サブリソースへの変更をお願いしたい。現状 FE は先頭1枚のみ送信している。                                                                                                                                                                                                                                                                                                                                                                                              |
| 3   | GET /admin/routines/{id}                                                       | Y-09: ルーティン詳細・編集                     | 追加       | B1c。サムネイルは生の S3 キーのみ返却され、`/media/assets/{key}` は署名なしでは 401 のため CRM 上でプレビューできない（FR-011）。plan / store / option 画像と同様に署名付き URL（`thumbnailUrl`、No.2 対応後は `thumbnailUrls[]`）の追加をお願いしたい。                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4   | POST /admin/routines/{id}/duplicate                                            | Y-09: ルーティン一覧・詳細（複製）             | 修正       | B2。FR-012「複製ルーティン名は『（元の名称）のコピー』」に対し、現実装は `${name} (copy)`（`routine-admin.repository.ts:184`）。`${name}のコピー` への変更をお願いしたい。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 5   | GET /admin/exercises<br>GET /admin/routines/{id}                               | Y-09: ルーティン登録・編集（エクササイズ追加） | 追加       | B3。FR-008「エクササイズ追加時、重量のデフォルト値 = 器具別最低重量」を実現するには器具情報が必要だが、`toolName` は `GET /admin/exercises/{id}` にしかなく、一覧（`ExerciseListItemDto`）と構成行（`AdminRoutineExerciseDto`）にない。FE で行ごとに詳細 API を呼ぶ（N+1）のは避けたいため、両 DTO への器具情報（`toolId` / `toolCode` / `toolName`）の追加、またはサーバー側で算出した `defaultWeightKg` の返却をお願いしたい（器具マスタ `mst_tools` は gate-svc 管理のため、後者を推奨）。なお器具別の重量値そのものは Y-08・E-03 いずれの仕様にも定義がなく（`MstTool` にも重量カラムなし）、プロトタイプのハードコード値のみのため、値の確定は BA 確認待ち。現状 FE は重量を空欄で初期化している。 |
| 6   | POST /admin/routines<br>PATCH /admin/routines/{id}                             | Y-09: ルーティン登録・編集                     | 修正       | D2。リクエスト DTO の `description`・`thumbnailS3Key`・`exercises[].hqComment`・`sets[].supersetGroup`・`sets[].targetReps / targetWeightKg / targetDurationSeconds / targetDistanceM / targetRpe` が OpenAPI 上 `type: object` で定義されており、生成クライアントの型が `{[key: string]: unknown}` になる。`string` / `number`（nullable）への修正をお願いしたい（`AdminCreateRoutineDto` / `AdminUpdateRoutineDto` / `RoutineExerciseInputDto` / `RoutineSetInputDto`）。                                                                                                                                                                                                                             |

## Round 1 result (2026-10-14)

**Shipped** — every routine screen is on `src/lib/api-real`; `grep '@/lib/api/' src/app/(private)/routines` is empty.

- List: real list + `limit: 1` baseline count while filtering (D6), `keyword` / `sort` / `order`,
  page sizes `[25, 50, 100]`, nullable code/category (D4), real publish / duplicate / delete.
- Detail + edit: `AdminRoutineDetailDto` directly; 更新者 = `updatedByStaffName ?? createdByStaffName ?? '—'`.
- Form: body built in `_utils/routine-body.util.ts` (single D2 cast + B1a `keys[0]` seam);
  publish chain kept (B4) — a failed publish still leaves the form so a retry cannot create a copy;
  exercise picker on `GET /admin/exercises?publishStatus=published`; per-row exercise fan-out and
  `DEFAULT_WEIGHT_BY_TOOL_NAME` removed (B3 / Q2 — 重量 starts empty).
- Thumbnail: `useMediaUpload({ tag: 'routine-thumbnail' })`, object-URL preview for fresh uploads,
  neutral tile for stored keys (B1c).
- All local error toasts removed from routine mutations (shared `MutationCache` toast).

**Checks** — `npm run type-check`: 0 errors under `routines/` (1 pre-existing, unrelated error in
`stores/[id]/map/_components/store-map-setup.tsx`); `eslint` clean.

**Smoke (API level, HQ demo account, test data deleted afterwards)** — list / keyword / category /
status filters / all sort keys × order / paging OK; `limit=200` → 400 (cap confirmed); create /
detail / update (reorder, remove set, comment) / publish / unpublish / duplicate OK;
delete while published → 409 `E-RTM-002`; publish with 0 exercises → 422 `E-RTM-003`;
decimal reps → 400 `E-VAL-001`; Manager → 403 `E-AUTH-100`.
Confirmed BE gaps: duplicate name `… (copy)` (B2), presign `routine-thumbnail` → 400 `E-MED-011` (B1b).
Screens rendered once on :3001 with no 4xx and no mock calls; no further live verification per user.

**Remaining** — `TODO(round2)` B1a, B1b, B1c, B2, B3, B4, D2 (see Round 2 backlog). Open: Q2, Q3.

## Round 2 result (2026-10-20)

**Target** — local backend: `fitness-backend-v2` branch `dulv/routine-api-fix-gaps` (BE_REQUEST No.1–8, 10, 11
fixed; not yet on dev), BFF `http://localhost:3000`; FE on `:3001` via `.env.local` (see
[LOCAL_API_LOGIN.vi.md](./LOCAL_API_LOGIN.vi.md)).

**Client refresh** — the local `/docs-json` is cut from an older `main` than the checked-in
`openapi.real.json` (it lacks e.g. `LockerDto`), so a whole-file swap would regress other screens. Only the
routine slice was taken from it: `/admin/routines*` + `/admin/routine-categories*` paths,
`AdminCreateRoutineDto` / `AdminUpdateRoutineDto` / `AdminRoutineDetailDto`, the new
`AdminRoutineExerciseInputDto` / `AdminRoutineSetInputDto` (and the mobile `RoutineExerciseInputDto` /
`RoutineSetInputDto` they no longer overwrite), plus `routine-thumbnail` in the presign tag description;
then `npm run generate-api:real`. Once the BE branch reaches dev, a normal full refresh reproduces it.

| Item     | BE fix (No.)  | FE change                                                                                                                                                                 |
| -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R201 B1a | 10            | `routine-body.util.ts` sends `thumbnailS3Keys` (all, in order); `keys[0]` seam and single-key prefill deleted                                                             |
| R202 B1b | 7             | Tag `routine-thumbnail` unchanged (BE kept the name, access level `member-shared`); TODO removed                                                                          |
| R203 B1c | 8, 10         | Detail gallery reads `thumbnailUrls`; edit form seeds previews key→URL from the detail; placeholder branch deleted; `<Image unoptimized>` (precedent: plan/option images) |
| R204 B2  | 1             | None — copy is named 「…のコピー」; TODO comments removed                                                                                                                 |
| R207 D2  | 11            | Body built with real types; the `as unknown as AdminCreateRoutineDto` cast deleted                                                                                        |
| R205 B3  | 9 — declined  | Not applicable this phase; TODO rewritten as a note (重量 starts empty, Q2 open)                                                                                          |
| R206 B4  | not requested | Unchanged — save → `PATCH …/publish` chain stays (`TODO(round2) B4`, Q3 open)                                                                                             |

**Checks** — `npm run type-check`: 0 errors under `routines/` (only the pre-existing
`stores/[id]/map/_components/store-map-setup.tsx` error); `eslint` clean.

**API smoke (System, local)** — presign `routine-thumbnail` 201; create with 2 keys → `thumbnailS3Keys` +
`thumbnailUrls` (signed `/media/assets/…?exp&sig`); PATCH replaces the gallery; 6 keys → 400 `E-VAL-001`;
`targetReps: 9999999999` → 400 `E-VAL-001`; duplicate name `…のコピー`; 2 concurrent duplicates / creates → 201 + 201;
keyword = code → 0, `%` / `_` → 0; GET after DELETE → 404 `E-RTM-001`; `sort=exerciseCount|publishStatus` 200.
Smoke data deleted.

**Local limitation** — no S3 bucket: presign returns `https://media-upload.local/stub/…` and the asset GET
answers 502. Browser upload/preview checks therefore fulfil those two requests via Playwright route; the
real-S3 path needs one re-check on dev after the BE deploy.

**Retest** — previously API-blocked TCs: Y09-01 4/4 OK; Y09-02 5 OK (TC-042 after fixing BUG-Y09-02-12 — `[id]/edit/page.tsx`
now refetches the detail on mount and waits for it, so 編集 on a routine deleted elsewhere shows not-found
instead of the cached prefilled form), 1 Block (TC-012
precondition no longer exists); Y09-03 6/6 OK.

**Form limits (2026-10-20)** — Y-09 defines no count limits, but the admin API zod rejects
`exercises > 100` and `sets > 50` per exercise with 400 `E-VAL-001` (not in OpenAPI — no `maxItems`).
The form now stops there (エクササイズを追加 / セットを追加 / copy disabled with a hint) and also rejects
fractional Rep数・時間・RPE (server ints). Set maxima were already enforced (Rep 999 / 重量 999.99 /
時間 86400 / 距離 999999.99 / RPE 0–10). Open: ask BA to put the count limits into Y-09 / API-081 and BE to
add `maxItems`.

**Remaining** — `TODO(round2) B4` (Q3). Open: Q2, Q3. Follow-up: a load-error fallback
for gallery `<img>` when a signed URL fails (observed locally only, TC-012 note).
