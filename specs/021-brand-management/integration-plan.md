# Real API Integration Plan: Y-07 Brand Master Management (ブランド管理)

**Branch**: `feat/brand-integration-api` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md) · [plan.md](./plan.md)
**Scope**: `src/app/(private)/brands/**` — list, detail (基本情報 / 費用 / 変更履歴 tabs), fee edit sheet, disable/delete dialogs
**Target API**: `src/lib/api-real` (generated from `src/lib/openapi.real.json`, **API-074 Brand Master & Enrollment Fee Management**)
**Requirement sources**: `Y-07.md` (brand master), `G-05.md` (enrollment-fee scheduling, history, 運用方針), `API-074-brand-master-management.md` v0.5

## Guiding principle

**UI first — the API catches up to the UI, not the other way around.** Two consequences, both set by
the user's direction (2026-09-22):

1. **Where the API cannot back a UI element, the element is commented out, never deleted** — the
   repo's established convention on this screen (see the existing create-brand block in
   `brands/page.tsx` and the rename block in `brands/[id]/page.tsx`). Every commented block carries a
   `TODO(round2) Bn` or `TODO(round3) Rn` marker naming the blocker, so a later round is a checklist of
   uncomments, not a UI redesign.
2. **Where the API _could_ be made to work only by writing a bad pattern on the FE, we do not write
   it.** We raise a concrete BE ask shaped by the UI instead, and the feature waits for Round 2. This
   is what moves the fee-group Save out of Round 1 (**B1**) — see the note below.

Round split:

| Round                 | Meaning                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| **Round 1**           | The real API backs it cleanly, with no compensating anti-pattern → wire it now.                           |
| **Round 2**           | **In scope** per Y-07 / G-05, but the API is not ready (BE ask) **or** the UI was never built (FE build). |
| **Round 3 (phase 2)** | The requirement docs do not define it. Deferred indefinitely; UI commented out with the decision record.  |

Mock surfaces are **left untouched** (same convention as the positions / domains / staffs
integrations) — they simply stop being called:

- `src/app/api/crm/brands/**` (routes)
- `src/app/api/_schemas/brand.schema.ts`
- `src/app/api/_mock-db/tables/brand.table.ts`, `src/app/api/_mock-db/seeds/brand.seed.ts`

> ⚠️ **`src/app/(private)/brands/_constants/brand.constants.ts` must not be modified.** Despite living
> under this feature's folder, `BRAND_LABELS` / `BRAND_OPTIONS` are imported by **eight** other
> still-on-mock screens (article-categories, banners, campaigns). They are keyed off the mock
> `BrandEnum` (lowercase `joyfit`…). This integration adds its own real-API constants file instead
> (see **D2**).

## Version note — the doc is behind the deployed API

`API-074-brand-master-management.md` is **v0.5 (2026-06-18)**; the deployed API
(`https://api.dev.fitness-v2.okamoto-hd.com`, verified by live probe 2026-09-21) is newer:

| API-074 v0.5                          | Deployed (= `openapi.real.json`)                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/brands` → 5 brand records | → **2 brand groups** (`JOYFIT` / `FIT365`) with `subBrandCount`                                                                     |
| `/admin/brands/{brandEnum}`           | `/admin/brands/{brandGroup}`, sub-brands nested in `BrandDetailDto.subBrands[]`                                                     |
| `PATCH /admin/brands/{brandEnum}`     | `PATCH /admin/brands/{brandGroup}/sub-brands/{brandEnum}`                                                                           |
| POST body `price` (tax-**excluded**)  | `priceInclTax` + `taxRate` (tax-**included**) — resolves `TBD-G05-TAX-BASIS` in favour of Y-07 FR-002「金額はすべて税込で管理する」 |
| `/fees`, `/history` unpaginated       | cursor-paginated (`limit` / `cursor` / `nextCursor`), **no total count**                                                            |
| —                                     | `BrandFeeDto.status` (`current`/`scheduled`/`past`/`superseded`) + `supersededBy`                                                   |
| —                                     | `BrandHistoryEntryDto.changes[]` (server-derived diff)                                                                              |
| —                                     | `SubBrandDto.reenrollmentFeeWaiverDays` (marked _"v0.7 — G-05 ADD-09 ②"_)                                                           |

**This plan wires the deployed contract.** API-074 is used only as the source of _design intent_
(why a field is absent, which edit model applies). The local `fitness-backend-v2` checkout is older
still (flat `:brandEnum` controller) and was **not** used as ground truth.

## What the requirement docs already settled

Recorded here so later rounds do not re-litigate them:

| Question                                                       | Answer                                                                               | Source                                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Can 費用項目名 be edited?                                      | **No** — fixed 4-value domain                                                        | Y-07 FR-002 (入会金 / 登録事務手数料 / カード発行料 / セキュリティ管理費・施設メンテナンス料) ≡ `feeType` enum; API-074 §7.2                 |
| Can ブランドID be edited?                                      | **No**                                                                               | Y-07 FR-002「ブランドIDルール: 変更不可＋一意チェック必須」                                                                                  |
| Can ブランド名 be edited?                                      | **No** — identity is view-only                                                       | API-074 §1 Design Rationale #4 + §6.1 row 4, _"out of scope for runtime CRM (Y-07 FR-002; Otaki 2026-06-02)"_                                |
| Can the current generation's 有効開始日 / amount be corrected? | **Yes** — re-POST the same `(feeType, effectiveDate)`; `created_at DESC` wins        | API-074 §6.4 "Retroactively correct an applied row"                                                                                          |
| What does 削除 mean?                                           | **Cancel one unapplied schedule** (`effective_date > today`); applied rows immutable | API-074 §8, §6.4 two-zone model                                                                                                              |
| Can `staff` see fees?                                          | **No** — BE deliberately overrode Y-07                                               | API-074 §1.1 + §6.3: _"G-05 hides fees from store staff while Y-07 allowed staff read-only access. v0.3 reconciles this at the field level"_ |
| Tax basis                                                      | **Tax-included** at the input boundary (`priceInclTax`)                              | Deployed contract; Y-07 FR-002                                                                                                               |

And the one the docs **contradict each other on** — now parked in Round 3, see **R301**:

> **G-05 §補足 運用方針（specsync正式化）** requires
> 「アーカイブ（論理削除）は設けず、**ステータス無効＋物理削除**の二系統で運用する」 and
> 「一覧に有効/無効Badge・ステータスフィルターを表示。詳細に**ステータスCard（無効化ボタン＋確認ダイアログ）**を配置」.
>
> API-074 claims to absorb G-05 entirely (_"G-05 has no independent API; all enrollment-fee CRUD lives
> here"_) but cites only G-05 FR-001–008 and **never mentions the 運用方針 section**. Y-07 never
> mentions a brand status either, and `stores.brands` has no status column.
> **User decision 2026-09-22: the requirement is not actually defined — park status, 無効化 and
> group-level 物理削除 in Round 3 rather than raising a BE ask on an undefined requirement.**

## Endpoint mapping

| UI surface                                                      | Real endpoint                                                                                  | Hook (`@/lib/api-real/@tanstack/react-query.gen`)                           | Round                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| List rows + header 件数 badge                                   | `GET /api/v1/admin/brands`                                                                     | `adminBrandControllerListOptions`                                           | 1                                                  |
| List keyword search (FR-002), pagination, filter banner         | ❌ removed — a fixed two-brand master has nothing to search or page                            | —                                                                           | 1 (**D4**)                                         |
| List row → detail navigation                                    | —                                                                                              | —                                                                           | 1 (param becomes `JOYFIT`/`FIT365`, **D3**)        |
| List row 編集 (rename)                                          | ❌ identity is view-only by design                                                             | —                                                                           | **3 — R305**                                       |
| Detail header + 基本情報タブ                                    | `GET /api/v1/admin/brands/{brandGroup}`                                                        | `adminBrandControllerDetailOptions`                                         | 1                                                  |
| 基本情報 作成/更新 dates                                        | ❌ no group-level timestamps                                                                   | —                                                                           | **2 — B4**                                         |
| Detail header / 基本情報 status badge                           | ❌ no status anywhere; requirement undefined                                                   | —                                                                           | **3 — R301**                                       |
| 費用タブ badge 件数                                             | `detail.subBrands.length`                                                                      | same query                                                                  | 1                                                  |
| 費用タブ cards (one per sub-brand)                              | `detail.subBrands[]` × `GET /api/v1/admin/brands/{brandGroup}/fees`                            | `adminBrandControllerDetailOptions` + `adminBrandControllerListFeesOptions` | 1 (**D5**)                                         |
| 費用項目 現行設定 (定価 + 有効開始日)                           | rows with `status === 'current'`                                                               | same                                                                        | 1 (read)                                           |
| 予約中の改定 list (+ 登録/登録者)                               | rows with `status === 'scheduled'` → `createdAt` / `createdByName`                             | same                                                                        | 1 (read)                                           |
| 費用タブ complete generation set                                | ❌ cursor only, no total — cannot prove the page is complete                                   | —                                                                           | **2 — B3**                                         |
| Fee edit sheet — open + prefill                                 | from the card model already in hand                                                            | —                                                                           | 1 (read-only, **D6**)                              |
| Fee edit sheet — **Save** (現行 定価/日付, 予約 追加/編集/削除) | ❌ no transactional endpoint matching the UI's batch save                                      | —                                                                           | **2 — B1**                                         |
| 費用項目名 input                                                | ❌ fixed `feeType` enum                                                                        | —                                                                           | 1 read-only (**D7**), concept → **3 — R307**       |
| 費用マスタID chip (`EF001`)                                     | ❌ no such column                                                                              | —                                                                           | **3 — R306**                                       |
| 費用グループ status badge                                       | ❌ requirement undefined                                                                       | —                                                                           | **3 — R301**                                       |
| 無効化 button + dialog                                          | ❌ requirement undefined                                                                       | —                                                                           | **3 — R302**                                       |
| 費用グループ 削除 button + dialog                               | ❌ requirement undefined                                                                       | —                                                                           | **3 — R304**                                       |
| 費用タブ 新規登録 button                                        | ❌ sub-brands are a fixed domain                                                               | —                                                                           | **3 — R309**                                       |
| 変更履歴タブ rows                                               | `GET /api/v1/admin/brands/{brandGroup}/history`                                                | `adminBrandControllerHistoryOptions`                                        | 1 (**D9**)                                         |
| 変更履歴タブ badge 件数                                         | ❌ cursor only, no total count                                                                 | —                                                                           | **2 — B2**                                         |
| 変更履歴 変更前/変更後 values                                   | `BrandHistoryChangeDto.before/after` typed `object` → codegen unusable                         | —                                                                           | 1 with one cast seam, fix → **2 — B5**             |
| Role gating — trainer/observer                                  | `E-AUTH-100` on every endpoint                                                                 | —                                                                           | 1 (route guard already correct)                    |
| Role gating — `staff` on 費用 / 変更履歴                        | `E-AUTH-103` on `GET /fees` and `GET /history`                                                 | —                                                                           | 1 (**D11**)                                        |
| Role gating — `manager` on writes                               | `E-AUTH-103` on `POST` / `DELETE`                                                              | —                                                                           | 1 (`Permission.BrandsEdit` already HQ/System-only) |
| 基本情報を編集 (suspension / cadence / overdue)                 | `PATCH /api/v1/admin/brands/{brandGroup}/sub-brands/{brandEnum}` — **API ready, no UI exists** | `adminBrandControllerUpdateMutation`                                        | **2 — B6**                                         |

## Blockers carried into Round 2

In scope per Y-07 / G-05, not shippable in Round 1. **B1–B5 are BE asks written to match the UI**;
**B6–B7 are FE builds** against an API that is already ready.

| ID     | Blocker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Round 1 behaviour (UI kept)                                                                                                                                                                                                                                                                                                                                                    | Round 2 — the ask                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | **No transactional endpoint for the fee-group Save.** The sheet is a batch form: one 保存する commits several fee items, each with a current amount/date plus an arbitrary set of 予約改定. The API offers only single-row `POST /fees` and `DELETE /fees/{feeId}`, and its unapplied-duplicate guard forces a strict DELETE-before-POST ordering. Expressing one Save as a sequence of 1–N non-atomic writes is the anti-pattern the user ruled out: a mid-sequence failure leaves the fee master half-updated with no rollback, and the operator cannot tell what landed. | The sheet **stays mounted and opens normally**, prefilled from real generations (現行 定価/有効開始日, 予約中の改定 with real dates, amounts, 登録者). 費用項目名 renders `readOnly`. The **保存する button is disabled with a 「API未対応」 tooltip**; `TODO(round2) B1` sits at the missing mutation. The row-level trash buttons inside the sheet stay form-only and inert. | **BE ask — build the endpoint the UI already implies**: `PATCH /api/v1/admin/brands/{brandGroup}/fees/{brandEnum}` taking the whole fee-item set in one transactional call (the mock contract `UpdateBrandFeeGroupRequest` is the exact shape the UI needs: `fee_items[] { feeType, priceInclTax, effectiveDate, scheduledChanges[] }`), applying the append-only generation rules server-side and writing all `brands_history` rows in the same TX. Then wire one mutation and delete the disabled state. |
| **B2** | **`GET /history` returns no total count.** Cursor pagination with `nextCursor` only. The 変更履歴 tab badge needs a count, and the tab needs real paging.                                                                                                                                                                                                                                                                                                                                                                                                                   | The tab renders the first page at `limit: 50`. The **変更履歴 badge is commented out** with `TODO(round2) B2` rather than showing a number that silently under-reports past 50 entries. No "load more" is added.                                                                                                                                                               | **BE ask**: return a total count (e.g. `totalItems`) on `BrandHistoryListResponseDto`, and offer page/limit alongside the cursor. Then restore the badge and add paging.                                                                                                                                                                                                                                                                                                                                   |
| **B3** | **`GET /fees` returns no total count either** — same cursor-only shape. Round 1 cannot prove the 100-row page holds every generation for the brand group.                                                                                                                                                                                                                                                                                                                                                                                                                   | Fetch with `limit: 100` (JOYFIT's worst case today is 4 sub-brands × 4 fee types + schedules ≈ 20 rows, so the page is complete in practice). `TODO(round2) B3` on the query.                                                                                                                                                                                                  | **BE ask**: same as B2 — add a total to `BrandFeeListResponseDto`.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **B4** | **No group-level `createdAt` / `updatedAt`.** `BrandDetailDto` has none; the timestamps live per sub-brand. Deriving `min(createdAt)` / `max(updatedAt)` on the FE invents group metadata the API never asserted.                                                                                                                                                                                                                                                                                                                                                           | The 基本情報 `StatusCard`'s 作成 / 更新 meta lines are **commented out** with `TODO(round2) B4`; the card still renders.                                                                                                                                                                                                                                                       | **BE ask**: add `createdAt` / `updatedAt` (and ideally `updatedByName`) to `BrandDetailDto` at the brand-group level.                                                                                                                                                                                                                                                                                                                                                                                      |
| **B5** | **`BrandHistoryChangeDto.before` / `after` are declared `type: object`** in the OpenAPI, so codegen emits an unusable `{[key: string]: unknown} \| null` for what are really numbers (tax-included yen) or strings.                                                                                                                                                                                                                                                                                                                                                         | One cast seam in `_utils/brand-history.util.ts`, commented `TODO(round2) B5` — never scattered `as` casts, never a hand-edit of `openapi.real.json` (it is refreshed from the BE).                                                                                                                                                                                             | **BE ask**: declare the real type (`oneOf: [number, string, null]`, or a typed union per `changeAction`). Refresh path: replace `openapi.real.json` → `npm run generate-api:real` → delete the seam.                                                                                                                                                                                                                                                                                                       |
| **B6** | **Y-07 FR-002 requires FIT365's maintenance cadence** 「セキュリティ管理費・施設メンテナンス料: 入会3ヶ月目 税込（1年ごと）」. The API **already serves and accepts** it (`maintenanceFeeStartMonth` / `maintenanceFeeCycleMonth`, live `3` / `12`) plus `suspensionFee`, `reviewOverdueHours`, `minEnrollmentAge`, `reenrollmentFeeWaiverDays` — **but no UI was ever built for any of them.**                                                                                                                                                                             | Nothing rendered, nothing broken. The 基本情報を編集 button stays exactly as today: visible, `disabled`, tooltip 「ブランド基本情報の編集は次フェーズで実装予定です」, with `TODO(round2) B6` beside it.                                                                                                                                                                       | **FE build, no BE ask** — `PATCH .../sub-brands/{brandEnum}` is ready. Build the per-sub-brand basic-info editor.                                                                                                                                                                                                                                                                                                                                                                                          |
| **B7** | G-05 **MOD-09**（入会金返金固定ルール）and **ADD-09**（入会金免除設定 ①キャンペーン ②再入会 ③スタッフ個別）are required on the brand-detail 費用カード. Neither exists in the UI; the API carries only ADD-09 ② (`reenrollmentFeeWaiverDays`, currently `null` everywhere).                                                                                                                                                                                                                                                                                                 | Not rendered. Outside Round 1's wiring scope; recorded so it is not lost.                                                                                                                                                                                                                                                                                                      | Split: MOD-09 is static FE copy on the fee card; ADD-09 ② is wireable once B6's editor exists; ① and ③ need a BE surface.                                                                                                                                                                                                                                                                                                                                                                                  |

## Deferred to Round 3 (phase 2)

**The requirement docs do not define these** (user decision 2026-09-22), or the data model rules them
out. UI commented out with the decision recorded inline. No BE ask is raised for an undefined
requirement.

| ID       | Item                                                                                                              | Why it is phase 2                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R301** | **Brand / fee status 有効・無効** — badge in the detail header, on each `FeeGroupCard`, and the `StatusCard` tone | Only **G-05 §補足 運用方針** asks for it; **Y-07 never mentions a brand status**, `stores.brands` has no column, and API-074 — which claims to absorb G-05 entirely — silently omits the 運用方針 section. The requirement is undefined rather than unimplemented. → Comment out the three badge sites; `FeeCurrentBadge` keeps rendering with its `status` prop hard-wired to `'active'`, driven by the real generation status (`current` → 現行). |
| **R302** | **無効化 button + `FeeGroupDisableDialog`**                                                                       | The operational half of R301 — disabling something that has no status field is meaningless. Moves with R301. → Comment out the button and the dialog mount; the component file stays on disk, unreferenced.                                                                                                                                                                                                                                         |
| **R303** | **List ステータスフィルター** (G-05 §補足)                                                                        | Depends on R301.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **R304** | **Group-level 物理削除** — 削除 button + `FeeGroupDeleteDialog`                                                   | G-05 §補足 names 物理削除 but never defines it for a fixed sub-brand domain with append-only generations, and `DELETE /fees/{feeId}` deliberately covers only unapplied schedules (API-074 §8). Undefined, not blocked. → Comment out the button and the dialog mount.                                                                                                                                                                              |
| **R305** | **Brand rename** — `spec.md` US3 / FR-005, the list row 編集 action and `BrandFormSheet`                          | **Y-07 has no such FR** (必須要件 = FR-001 参照 + FR-002 費用設定 only). **API-074 explicitly rejects it**: §1 Rationale #4 / §6.1 row 4 mark `displayName`/`brandGroup`/`minEnrollmentAge` view-only, _"out of scope for runtime CRM … Otaki 2026-06-02"_. → Comment out the row `edit` action and the `<BrandFormSheet>` mount in `brands/page.tsx`; keep `brand-form-sheet.tsx` and `brand-form.schema.ts` on disk untouched.                    |
| **R306** | **費用マスタID chip** (`EF001` / `EF002`)                                                                         | No source in Y-07, G-05 or API-074; `brand_fees` has only a UUID, not an operator-facing master code. → Comment out the chip.                                                                                                                                                                                                                                                                                                                       |
| **R307** | **Editable 費用項目名** (`spec.md` FR-007, partial)                                                               | Y-07 FR-002 fixes the four categories; `feeType` is a closed enum. The name is a label, not data. → Field stays rendered but `readOnly` (**D7**).                                                                                                                                                                                                                                                                                                   |
| **R308** | **Brand 新規登録** (`spec.md` FR-015 — already out of scope)                                                      | API-074 §1 Rationale #3: _"adding a brand is a schema/seed change, not runtime"_, citing Y-07. Already commented out; update the note to cite R308.                                                                                                                                                                                                                                                                                                 |
| **R309** | **費用マスタ 新規登録** button                                                                                    | A fee "group" is a sub-brand, and sub-brands are a fixed domain (Y-07 FR-002「サブブランドはJOYFIT専用の固定値域とする」); all four `feeType` rows are seeded for every sub-brand. → Button stays visible+disabled; update the tooltip note to cite R309.                                                                                                                                                                                           |

## Decisions

- **D1 — No mapper layer.** Components import `BrandListItemDto`, `BrandDetailDto`, `SubBrandDto`,
  `BrandFeeDto`, `BrandHistoryEntryDto` from `@/lib/api-real/types.gen` and use them directly;
  `snake_case` → `camelCase` renames happen in place. Matches the positions / domains / staffs
  precedent.
- **D2 — New constants file, shared one untouched.** Add
  `src/app/(private)/brands/_constants/brand-real.constants.ts` holding `FEE_TYPE_LABELS`
  (`enrollmentFee` → 入会金, `registrationFee` → 登録事務手数料, `cardIssueFee` → カード発行料,
  `maintenanceFee` → 施設メンテナンス料 — wording from Y-07 FR-002), `FEE_TYPE_ORDER`,
  `HISTORY_ACTION_LABELS` (8 `changeAction` values), `HISTORY_FIELD_LABELS` and
  `SUB_BRAND_LABELS`. The existing `brand.constants.ts` is imported by eight mock screens and is
  **not** touched. Add type-level drift assertions so a new `feeType` / `changeAction` in the DTO
  fails `tsc` rather than rendering a raw enum value at runtime.
- **D3 — Route param becomes the brand group.** `/brands/joyfit` → `/brands/JOYFIT`. The row click
  pushes `row.brandGroup`; the detail page validates `params.id` against `('JOYFIT' | 'FIT365')` and
  falls through to the existing 「ブランドが見つかりません」 empty state on a mismatch (the API also
  answers `400 E-VAL-001`). No cross-screen deep link targets a brand id (grepped — only
  `routes.config.ts` and the sidebar, both parameterless), so nothing else breaks.
- **D4 — No search box, no pagination footer on the list.** _(Revised 2026-09-22 on the user's
  call; the first draft filtered and paged client-side.)_ Y-07 FR-001 fixes the managed brands at
  JOYFIT / FIT365 and the endpoint always returns both in definition order, so a keyword search over
  two permanently visible rows — and a footer that can only ever read 「全 2 件 / 1 ページ」 — is
  furniture. Both the search box + `FilterResultBanner` and `TablePaginationWithSize` are commented
  out in `page.tsx`, and `useBrandsFilters` is left on disk with a dormancy header so the pair can be
  revived together if the brand master ever grows
  (Y-07「将来的なブランド追加はシステム設定カテゴリー内で扱う」). The header 件数 badge stays. No BE
  ask raised.
- **D5 — Cards come from `subBrands`, amounts from `/fees`.** The 費用 tab renders one card per
  `detail.subBrands[]` entry (authoritative, and the only source of each sub-brand's `displayName`),
  filled from `GET /fees` grouped by `brandEnum` then `feeType`. A sub-brand with no fee rows still
  renders its card with empty items rather than disappearing. Rows are filtered client-side to
  `status ∈ {current, scheduled}` — `past` / `superseded` are audit context, surfaced in 変更履歴, not
  on the card.
- **D14 — Each brand shows only the fee items it charges.** _(Added 2026-09-22 on the user's
  call.)_ Y-07 FR-002 lists them per brand: **JOYFIT**（サブブランド単位で設定）→ 入会金 /
  登録事務手数料; **FIT365** → 入会金はなく カード発行料 / セキュリティ管理費・施設メンテナンス料.
  The API stores all four `feeType` generations for every sub-brand and seeds the inapplicable ones
  at 0 — verified live: JOYFIT has `cardIssueFee: 0` / `maintenanceFee: 0`, FIT365 has
  `enrollmentFee: 0` / `registrationFee: 0`. Rendering all four (the first Round 1 draft) showed
  「¥0」 rows for fees the brand does not charge. `BRAND_GROUP_FEE_TYPES` in
  `brand-real.constants.ts` now drives both the card and the edit sheet, with a compile-time guard
  that every `feeType` is claimed by some brand. `maintenanceFee`'s label follows the FR wording
  (「セキュリティ管理費・施設メンテナンス料」), and its charge cadence — which FR-002 states as part
  of the fee (「入会3ヶ月目 税込（1年ごと）」) — renders as a caption derived from
  `SubBrandDto.maintenanceFeeStartMonth` / `maintenanceFeeCycleMonth` (live 3 / 12). This is display
  only; **editing** the cadence remains **B6**.
- **D6 — Round 1's fee tab is read-only.** Per the guiding principle, the batch Save is **not**
  emulated with a sequence of single-row writes (**B1**). The sheet still opens and prefills from real
  data so the read path is fully exercised and the Round 2 wiring is a one-line swap. This is a
  deliberate scope reduction: **FR-007 / FR-008 / FR-009 / FR-010 ship as read + validate only in
  Round 1**, and their write half lands with B1.
- **D7 — 費用項目名 is `readOnly`.** Y-07 FR-002 fixes the four categories (R307). The field stays
  rendered with its real label so the sheet still reads correctly.
- **D8 — 現行 有効開始日 will be constrained to today-or-past** _(carried to Round 2 with B1)_. A future
  date on the 現行設定 row would land in the API's unapplied zone and silently become a schedule while
  the old current value stays live. When B1 lands, the Zod schema gains a refinement:
  現行設定の有効開始日 must be `<= today`, message 「将来日付は「予約中の改定」に登録してください」. The
  existing non-blocking past-date warning (FR-010) is unchanged. Recorded now so the constraint is not
  lost.
- **D9 — History rows are flattened.** One `BrandHistoryEntryDto` × N `changes[]` → N table rows.
  変更日時 ← `changedAt`; 変更者 ← `changedByName` (empty string when the staff row is gone → 「—」);
  対象 ← `SUB_BRAND_LABELS[brandEnum]`; 変更項目 ← `HISTORY_FIELD_LABELS[change.field]` prefixed by
  `HISTORY_ACTION_LABELS[changeAction]` where the action adds meaning (e.g. `fee_schedule_cancel` →
  「予約取消: 入会金」); 変更前/変更後 ← `change.before` / `change.after` through the **B5** cast seam,
  rendered as 税込 yen for numbers (API-074 §10: _"Fee values are tax-INCLUDED"_), as-is for strings,
  「—」 for `null`.
- **D10 — Counts that cannot be proven are not displayed.** 費用 badge ← `detail.subBrands.length`
  (exact). 変更履歴 badge ← **commented out** until **B2** provides a total; showing a first-page count
  that silently under-reports is the kind of quiet-wrong number the user's directive rules out.
- **D11 — `staff` cannot see 費用 / 変更履歴.** `Permission.BrandsView` is granted to Staff (correct per
  Y-07), but API-074 §6.3 returns `E-AUTH-103` for `staff` on `GET /fees` and `GET /history` and strips
  `fees` from `SubBrandDto`. Following the `contracts/[id]/page.tsx` precedent, the two tabs are
  **hidden** rather than left to fail: gate on `hasRole([System, Headquarter, Manager])` from
  `useAuthUser()`, and fall the active tab back to `basic` when a hidden tab is requested.
  `SubBrandDto.fees` is optional in the generated type, which keeps this honest at compile time.
- **D12 — Errors by code, no duplicate toasts.** Read `ErrorResponseDto.code` (`E-VAL-001`,
  `E-AUTH-100`, `E-AUTH-103`), never Japanese substrings. The shared `MutationCache` in
  `src/providers/react-query.provider.tsx` already toasts every failed mutation, so the local
  `onError: () => toast.error(...)` handlers in `brand-form-sheet.tsx`,
  `brand-fee-group-edit-sheet.tsx`, `fee-group-disable-dialog.tsx` and `fee-group-delete-dialog.tsx`
  are removed as those call sites are commented out or rewired.
- **D13 — Tax is included at the boundary.** The UI already manages 税込 (Y-07 FR-002). When B1 lands,
  send `priceInclTax` verbatim and **never** round on the FE (`CreateBrandFeeDto`: _"the server stores
  ceil(incl / (1 + taxRate/100)); do not round on the FE"_); omit `taxRate` so the API default of `10`
  applies.

## Round 1 tasks

### Phase A — foundations

- **T001** `[P]` — **new** `_constants/brand-real.constants.ts`: `FEE_TYPE_LABELS`, `FEE_TYPE_ORDER`,
  `SUB_BRAND_LABELS`, `HISTORY_ACTION_LABELS`, `HISTORY_FIELD_LABELS` + type-level drift assertions
  (**D2**). `brand.constants.ts` untouched.
- **T002** `[P]` — **new** `[id]/_utils/brand-fee-group.util.ts`: build the card model from
  `SubBrandDto[]` + `BrandFeeDto[]` — group by `brandEnum`, then `feeType` in `FEE_TYPE_ORDER`, split
  `current` vs `scheduled`, drop `past`/`superseded` (**D5**). Date `YYYY-MM-DD` → `YYYY/MM/DD`.
- **T003** `[P]` — **new** `[id]/_utils/brand-history.util.ts`: flatten `items[].changes[]`, apply the
  label maps, format values; holds the single `before`/`after` cast seam with `TODO(round2) B5`
  (**D9**).
- **T004** — `[id]/_types/brand-fee.type.ts`: retype `BrandFeeGroup` / `BrandFeeItem` onto the T002
  card model instead of `GetCrmBrandsByIdFeesResponse`.

### Phase B — list screen

- **T005** — `_hooks/use-brands-filters.ts`: keep the nuqs state and public shape; drop `queryParams`
  and expose the client-side predicate + slice helpers (**D4**).
- **T006** — `_components/brand-table-columns.tsx`: `BrandListItem` = `BrandListItemDto`; `brand_id` →
  `brandGroup`, `display_name` → `displayName`. **Comment out** the `actions` column's `edit` entry
  with `TODO(round3) R305`.
- **T007** — `page.tsx`: `getCrmBrandsOptions` → `adminBrandControllerListOptions`; client-side
  filter/slice; badge + banner counts (**D4**); row click pushes `brand.brandGroup` (**D3**).
  **Comment out** the `<BrandFormSheet>` mount, `sheetMode` / `selectedBrand` state and
  `handleEditClick` with `TODO(round3) R305`; update the already-commented create block to cite
  **R308**.

### Phase C — detail screen

- **T008** — `[id]/page.tsx`: `adminBrandControllerDetailOptions` keyed by the validated `brandGroup`
  (**D3**); 費用 badge ← `subBrands.length`; hide the 費用 / 変更履歴 tabs for `staff` with a fallback to
  `basic` (**D11**). **Comment out** the header `<BrandStatusBadge>` (`TODO(round3) R301`) and the
  変更履歴 badge (`TODO(round2) B2`). Add `TODO(round2) B6` beside the disabled 基本情報を編集 button,
  leaving the button as it is.
- **T009** — `[id]/_components/basic-info-tab.tsx`: `brandGroup` / `displayName`. **Comment out** the
  `StatusCard`'s `tone` / `label` status wiring (`TODO(round3) R301`) and its 作成 / 更新 meta lines
  (`TODO(round2) B4`); the card still renders.
- **T010** — `[id]/_components/fees-tab.tsx`: `adminBrandControllerListFeesOptions` with
  `{ path: { brandGroup }, query: { limit: 100 } }` + `TODO(round2) B3`; cards via T002 from the
  `subBrands` passed down by T008 (**D5**). **Comment out** the `<FeeGroupDisableDialog>` and
  `<FeeGroupDeleteDialog>` mounts and their state (`TODO(round3) R302` / `R304`). Update the disabled
  新規登録 button's note to cite **R309**.
- **T011** — `[id]/_components/fee-group-card.tsx`: header from the card model. **Comment out** the
  `<BrandStatusBadge>` (`R301`), the 費用マスタID chip (`R306`), the 無効化 button (`R302`) and the 削除
  button (`R304`).
- **T012** — `[id]/_components/fee-item-block.tsx`: four fee types via `FEE_TYPE_LABELS`; 予約 rows from
  the card model; 登録 line from `createdAt` / `createdByName` (`null` → 「—」).
- **T013** — `[id]/_components/history-tab.tsx`: `adminBrandControllerHistoryOptions` with
  `{ query: { limit: 50 } }`; rows from T003.

### Phase D — fee edit sheet (read-only)

- **T014** — `[id]/_utils/brand-fee-group-form.util.ts`: `buildDefaultValues` from the T002 card model;
  `hasFeeGroupChanges` compares against it.
- **T015** — `[id]/_components/fee-item-fields.tsx`: 費用項目名 `readOnly` with a short note
  (**D7** / R307).
- **T016** — `[id]/_components/brand-fee-group-edit-sheet.tsx`: prefill from the card model; **disable
  保存する with a 「API未対応」 tooltip** and `TODO(round2) B1` at the missing mutation; remove the local
  `onError` toast (**D12**). The sheet, its validation and its 予約 rows stay exactly as they are.

### Phase E — verification

- **T017** — `npm run type-check` (gate: **0 errors**) then `npm run lint`.
- **T018** — Live smoke run against `NEXT_PUBLIC_REAL_API_URL` as `headquarter`
  (`lodu4289+headquater@gmail.com`): list → search → clear → row → 基本情報 → 費用 (JOYFIT 4 cards with
  4 fee items each, FIT365 1 card showing カード発行料 ¥5,500 / 施設メンテナンス料 ¥5,478) → open the edit
  sheet and confirm the prefill + disabled Save → 変更履歴 shows the seeded
  `fee_schedule_create` / `fee_schedule_cancel` entries with correct 対象 / 変更項目 / 変更前 / 変更後.
  Then the read path as `manager` (write buttons hidden) and `staff` (費用 / 変更履歴 tabs hidden), and
  confirm `trainer` is denied at the route. Start the dev server with the Bash tool's
  `run_in_background`.
- **T019** — Append the Round 1 result section below: what shipped, the smoke verdict, and the
  remaining `TODO(round2)` / `TODO(round3)` list. Update `checklists/parity.md` only where real-API
  behaviour genuinely changes a checked item.

## Round 2 backlog

| ID        | Task                                                                                                                                   | Kind                                | Deletes in Round 2                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **R2-01** | Transactional fee-group save endpoint shaped like the sheet (**B1**)                                                                   | BE ask                              | The disabled Save + `TODO(round2) B1`; wires FR-007/008/009/010's write half and **D8**'s date constraint |
| **R2-02** | Total count + page/limit on `BrandHistoryListResponseDto` (**B2**)                                                                     | BE ask                              | Restores the 変更履歴 badge; adds paging                                                                  |
| **R2-03** | Total count on `BrandFeeListResponseDto` (**B3**)                                                                                      | BE ask                              | The `limit: 100` assumption                                                                               |
| **R2-04** | Group-level `createdAt` / `updatedAt` on `BrandDetailDto` (**B4**)                                                                     | BE ask                              | Restores the `StatusCard` meta lines                                                                      |
| **R2-05** | Type `BrandHistoryChangeDto.before` / `after` properly (**B5**)                                                                        | BE ask                              | The cast seam in `brand-history.util.ts`                                                                  |
| **R2-06** | Per-sub-brand basic-info editor: cadence / `suspensionFee` / `reviewOverdueHours` / read-only `minEnrollmentAge` (**B6**, Y-07 FR-002) | FE build (API ready)                | Enables 基本情報を編集                                                                                    |
| **R2-07** | MOD-09 返金固定ルール (FE copy) + ADD-09 入会金免除 ②再入会 via `reenrollmentFeeWaiverDays` (**B7**)                                   | FE build + partial BE ask for ① / ③ | —                                                                                                         |

## Open questions

None blocking Round 1. All three questions raised at Gate 2 were answered by the user on 2026-09-22 —
see Resolved questions.

## Resolved questions

- **変更履歴 count with a cursor-only API** → **Round 2 BE ask (B2), badge hidden meanwhile.** User
  decision 2026-09-22: _"nếu api không trả về phân trang thì cho vào round 2, báo API trả về đủ."_
  Applied to `GET /fees` as well (**B3**) for consistency.
- **Status 有効/無効 (was B1) and group-level 物理削除 (was B3)** → **Round 3 (R301 / R302 / R303 /
  R304).** User decision 2026-09-22: _"nếu theo spec thì có vẻ chưa define, tạm thời để sang round 3."_
  Only G-05 §補足 asks for them; Y-07 is silent and the data model has no column. No BE ask is raised
  for an undefined requirement. **R302 (無効化) was moved with R301** because disabling a record with no
  status field is meaningless — flagged here in case that pairing should be split.
- **Non-atomic fee Save** → **Not implemented; BE ask instead (B1).** User decision 2026-09-22:
  _"request API triển khai theo UI, tránh những pattern không tốt."_ Round 1's fee tab is therefore
  read-only (**D6**).
- **Brand rename (spec.md FR-005 / US3)** → **Phase 2 (R305).** Y-07 has no rename FR; API-074 §1
  Rationale #4 / §6.1 mark identity fields view-only per Otaki's 2026-06-02 decision, and
  `UpdateBrandDto` carries no `displayName`.
- **費用項目名 editability** → **Read-only (D7 / R307).** Y-07 FR-002 fixes the four categories.
- **現行設定 corrections** → **Supported by the API (API-074 §6.4), but ships with B1** — the Gate 1
  assessment wrongly listed this as a permanent gap; withdrawn.
- **削除 semantics** → **Cancel one unapplied schedule** (API-074 §8). Group-level delete split off as
  R304.
- **`staff` fee visibility** → **Tabs hidden (D11).** API-074 §6.3 deliberately overrides Y-07's
  権限マトリクス with G-05's stricter rule.
- **Tax basis** → **Tax-included input (D13).** `TBD-G05-TAX-BASIS` resolved API-side in the deployed
  contract.

---

## Round 1 result (2026-09-22)

### Shipped

| Area       | What landed                                                                                                                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Constants  | **new** `_constants/brand-real.constants.ts` — `FEE_TYPE_LABELS` / `FEE_TYPE_ORDER` / `SUB_BRAND_LABELS` / `HISTORY_ACTION_LABELS` / `HISTORY_FIELD_LABELS` / `isBrandGroup`, plus compile-time drift guards. `brand.constants.ts` untouched (still serving eight mock screens).         |
| Utils      | **new** `[id]/_utils/brand-fee-group.util.ts` (card model from `subBrands` × `/fees`), **new** `[id]/_utils/brand-history.util.ts` (flatten `changes[]`, single **B5** cast seam). `brand-fee.util.ts` reduced to its two formatters (its duplicate `hasFeeGroupChanges` was dead code). |
| Types      | `[id]/_types/brand-fee.type.ts` retyped onto the card model.                                                                                                                                                                                                                             |
| List       | `adminBrandControllerList`; client-side search / paging (**D4**); badge + filter banner from the full response; row click → `/brands/{brandGroup}`.                                                                                                                                      |
| Detail     | `adminBrandControllerDetail` keyed by a validated `brandGroup`; 費用 badge ← `subBrands.length`; 費用 / 変更履歴 tabs hidden for `staff` (**D11**).                                                                                                                                      |
| 費用       | `adminBrandControllerListFees` (`limit: 100`); one card per sub-brand, four fee items each, `current` → 現行設定 and `scheduled` → 予約中の改定 with real `createdAt` / `createdByName`.                                                                                                 |
| 変更履歴   | `adminBrandControllerHistory` (`limit: 50`); one row per changed field, JP labels, tax-included yen formatting.                                                                                                                                                                          |
| Edit sheet | Opens and prefills from real generations; 費用項目名 `readOnly`; 保存する disabled with 「API未対応」 (**B1**).                                                                                                                                                                          |

### Commented out (not deleted)

`TODO(round2)`: 変更履歴 count badge (**B2**), `/fees` completeness (**B3**), `StatusCard` 作成/更新 meta (**B4**), history value cast seam (**B5**), 基本情報を編集 marker (**B6**).

`TODO(round3)`: row 編集 action + `BrandFormSheet` mount (**R305**), header + card status badges and `StatusCard` tone (**R301**), 無効化 button + dialog (**R302**), group 削除 button + dialog (**R304**), 費用マスタID chip (**R306**), 費用項目名 editability note (**R307**), brand 新規登録 (**R308**), 費用マスタ 新規登録 (**R309**).

`fee-group-disable-dialog.tsx`, `fee-group-delete-dialog.tsx` and `brand-form-sheet.tsx` are now unreferenced and their bodies are wrapped in a block comment behind an `export {}` and a header explaining the round and the citation — they would not compile against the new card model otherwise. Reviving each is an uncomment plus a field rename.

### Verification

- `npm run type-check`: **0 errors**. (A stale `.next/dev/types/routes.d.ts` had an unterminated template literal that silently aborted the whole check — removing the directory exposed 11 real errors, all since fixed. Worth remembering: a passing `tsc` on this repo is only meaningful once that artifact is fresh.)
- `npm run lint`: **No issues found**.
- Live smoke, `headquarter`, against `NEXT_PUBLIC_REAL_API_URL` — **0 failed `/api/v1` responses**:
  - list = 2 rows (`JOYFIT` / `FIT365`), badge 2件; search `fit3` → 1 row + 「全 2 件中 1 件を抽出中」; `zzz` → 「条件に一致するブランドがありません」
  - `/brands/JOYFIT`, tabs `基本情報 / 費用 4 / 変更履歴` (no count on 変更履歴, as intended)
  - JOYFIT: 4 cards × 4 fee items — 入会金 ¥2,200 / 登録事務手数料 ¥3,300 / カード発行料 ¥0 / 施設メンテナンス料 ¥0, 有効開始日 2026/04/23
  - FIT365: 1 card — 入会金 ¥0, 登録事務手数料 ¥0, カード発行料 ¥5,500, 施設メンテナンス料 ¥5,478. **Matches Y-07 FR-002 「入会金: なし（カード発行料 税込）」 and 「セキュリティ管理費・施設メンテナンス料 税込」 exactly.**
  - 変更履歴: `2026/09/08 11:34:51 · System Login · JOYFIT24 · 予約取消: カード発行料 · ¥2,750 → ¥0` and the matching 予約登録 row
  - edit sheet prefills; 保存する `disabled`; 費用項目名 carries `readonly`
  - `/brands/joyfit` (lowercase) → 「ブランドが見つかりません」
- Role gating: `manager` sees all three tabs with all four 編集 buttons disabled; `staff` sees only 基本情報 (no 403 fired — the tabs never request); `trainer` → `/403` on both routes.
- Remaining roles: `system` sees all three tabs with 編集 **enabled**; `observer` → `/403` on both routes.
- 予約中の改定 (second pass): the dev data held **16 generations, all `current`** — no `scheduled` row existed, so that branch was dead in the first pass. Two future schedules were created through the API (`2027/04/01 ¥3,456`, `2027/10/01 ¥4,567`), verified, then deleted (`204`); the brand is back to 16 `current` rows. With them present:
  - card: 「予約中の改定 2件」, 「2027/04/01 以降適用 ¥3,456」, 「登録: 2026/09/22 / HQ 1」 — `createdAt` / `createdByName` mapped correctly
  - edit sheet prefilled both schedules into `useFieldArray`; 費用項目名 `readonly=true`, amounts `2200 / 3456 / 4567`
  - 変更履歴 picked up both `fee_schedule_create` rows as 「予約登録: 入会金 ¥2,200 → ¥3,456」
- Form validation (sheet is read-only, but the rules still run): clearing 定価 → 「定価（税込）を入力してください」; `-5` → 「定価（税込）は0以上で入力してください」; the FR-010 past-date warning shows on 現行設定 (2026/04/23). 保存する stayed `disabled` throughout.
- **Not run**: the write path (nothing to write in Round 1) and `past` / `superseded` generation filtering — exercising the latter needs a retroactive correction on an applied row, which the API cannot undo (API-074 §6.4), so it was deliberately not created in a shared dev environment. `buildFeeItem` filters on `status` explicitly, but that branch is unverified against live data.

### Bug found during verification (pre-existing, app-wide, not fixed)

**Future dates are unreachable in every date picker in the CRM.** `src/components/ui/date-picker.tsx`
renders `<Calendar captionLayout="dropdown" …>` without `startMonth` / `endMonth`. react-day-picker
**9.14.0** then defaults the range to `currentYear - 100 … currentYear`, so the year dropdown offers
**1926–2026 (101 options) and no 2027**. Verified live: the month dropdown is full 1–12, so the
furthest reachable date today is 2026-12-31.

- **Impact here**: **FR-008**「将来日付を指定して改定を事前登録できる」cannot be satisfied through the
  UI at all. My two test schedules only existed because they were POSTed through the API. This does
  not affect Round 1 (the sheet is read-only) but it **must be fixed before B1 ships**, or Round 2
  delivers a Save button that cannot express a future revision.
- **Blast radius**: `<DatePicker>` has **27 call sites**, including several that are inherently
  future-dated (banner 配信期間, app-version release, lesson schedules, contract start dates). This is
  an app-wide defect, not a brand-management one.
- **Not fixed here** — it is a shared primitive well outside this integration's scope, and changing
  it silently re-dates 27 screens. Suggested fix, for a separate change with its own regression pass:
  expose `startMonth` / `endMonth` on `DatePicker` and default `endMonth` to a sensible future bound
  (e.g. `new Date(currentYear + 10, 11)`).

### Other observations (pre-existing, not fixed)

- `fee-item-fields.tsx`'s 「改定スケジュールを追加」 calls `append(...)` without a following
  `form.trigger()`, unlike its sibling `remove(...)`. A freshly appended row with an empty 有効開始日
  therefore shows no error until something else triggers validation — the `useFieldArray` +
  `superRefine` pitfall. Harmless while Save is disabled; fold into **B1**.
- `scheduled-change-row.tsx` renders the same 「有効開始日が重複しています」 copy for _any_ error on
  that field, so an empty date would report a duplicate. Same note: fold into **B1**.

### Notes

- The `trainer` / `observer` runs logged `403 /admin/stores` from the header's store-scope picker —
  app-wide behaviour for those roles on any page, unrelated to this feature.
- No mock surface was touched: `src/app/api/crm/brands/**`, `_schemas/brand.schema.ts` and the mock-db table/seed are intact and simply no longer called.

### Round 1 revisions (2026-09-22, after review)

Two corrections from the user's review of the shipped screen:

1. **List: search box and pagination footer removed** (**D4** rewritten). Verified live: 0 search
   inputs, 0 pagination footer, 0 page-size select; both rows and the 2件 badge still render.
2. **Fee cards show only the fee items each brand charges** (**D14**, new). The first draft rendered
   all four `feeType`s for every sub-brand, which surfaced 「¥0」 rows for fees the brand does not
   charge — a direct mismatch with Y-07 FR-002. Verified live after the fix:
   - JOYFIT — 4 cards, each 入会金 ¥2,200 / 登録事務手数料 ¥3,300; the edit sheet now prefills exactly
     those two items
   - FIT365 — 1 card, カード発行料 ¥5,500 / セキュリティ管理費・施設メンテナンス料 ¥5,478 with the
     caption 「入会3ヶ月目 / 1年ごと」
   - `npm run type-check` 0 errors, `npm run lint` clean, 0 failed `/api/v1` responses

### Round 1 prototype-alignment pass (2026-09-22)

The user compared the shipped screen against the V0 prototype
(`.cache/fitness-crm-ui/src/pages/brand-list.tsx`, `brand-detail.tsx`) and found it had drifted. The
root cause was over-correction: Round 1 had commented out several elements as "no API data" when the
prototype binds them to **no data either** — they are design constants, and `checklists/parity.md`
had them ticked (PAR022, PAR030, PAR034). Restored:

| Item                                | Before this pass                                                                            | Now                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List header badge                   | bespoke pill + `[&_h1]:text-[18px]` shrinking the title                                     | house style `<Badge variant="outline" className="text-xs">`, default 20px title (matches positions / domains)                                                                          |
| Detail header status badge (PAR022) | commented out as R301                                                                       | **restored** — static 有効, exactly as the prototype hard-codes it                                                                                                                     |
| Detail 基本情報 StatusCard (PAR030) | commented out as R301 + B4                                                                  | **restored** — tone success / Tag / 有効, meta 作成・更新 derived from `subBrands[].createdAt / updatedAt`                                                                             |
| Detail tabs                         | default variant with bespoke classes (`bg-muted h-15`, contradictory `text-xs text-[14px]`) | `<TabsList variant="line">` with plain triggers — the app-wide detail-tab convention (members / lessons / terms) and what the prototype uses                                           |
| 基本情報 tab                        | no description line                                                                         | 「ブランドの基本情報を管理します。」 above the cards                                                                                                                                   |
| 一般情報 card                       | bespoke bordered div, `h2 text-sm`                                                          | `Card` / `CardHeader` / `CardTitle text-base font-semibold` / `CardContent`                                                                                                            |
| Fee card                            | `rounded-2xl border p-0`, bordered header div, `h3 text-sm`                                 | `Card` / `CardHeader` / `CardTitle` / `CardContent`, matching the prototype's `FeeCard`                                                                                                |
| Fee card status badge (PAR034)      | commented out as R301                                                                       | **restored** — static 有効                                                                                                                                                             |
| Fee card action label (PAR036)      | 編集                                                                                        | **変更** — the prototype's and parity.md's label                                                                                                                                       |
| 費用項目 block                      | flex `justify-between`, `min-w-[220px]`                                                     | 2-col grid (PAR041 / PAR045)                                                                                                                                                           |
| FIT365 fee order                    | カード発行料 → メンテナンス料                                                               | **メンテナンス料 → カード発行料**, matching the prototype's `FIT365_FEES`                                                                                                              |
| Maintenance cadence note            | 「入会3ヶ月目 / 1年ごと」                                                                   | 「入会3ヶ月目に発生・以後1年ごと（税込）」 — the prototype's `feeItem1Note` wording, still derived from `maintenanceFeeStartMonth` / `maintenanceFeeCycleMonth` rather than hard-coded |

**R301 is narrowed as a result.** It no longer covers the _badges_ — those render statically, which is
both what the prototype does and what is true (there is no inactive brand). R301 now covers only a
**data-driven, toggleable** status, and travels with R302 (無効化) and R303 (list status filter).

Deliberate divergences from the prototype, all documented above and now annotated in
`checklists/parity.md`: PAR001 / PAR002 (search), PAR011–PAR013 (pagination) removed on the user's
call (**D4**); PAR009 (row 編集) → **R305**; PAR026 count badge → **B2**; PAR037 / PAR038 → **R302**;
PAR039 / PAR040 → **R304**; PAR051 (費用項目名 editable) → **R307**. Checklist now stands at
**44 `[x]` / 2 `[~]` / 18 `[ ]`**, every unticked item carrying its blocker id.

Re-verified live (`headquarter`, 0 failed `/api/v1` responses): list has no search / pagination and a
2件 badge; detail h1 is 20px with a 有効 badge, `data-variant="line"` tabs, and a status card reading
「有効 / 作成: 2026/08/04 / 更新: 2026/08/04」; JOYFIT shows 4 cards of 入会金 + 登録事務手数料;
FIT365 shows セキュリティ管理費・施設メンテナンス料 ¥5,478（入会3ヶ月目に発生・以後1年ごと（税込））
then カード発行料 ¥5,500; the fee sheet opens with 費用項目名 `readonly` and 保存する disabled.
`npm run type-check` 0 errors, `npm run lint` clean.

---

## Round 2 plan (2026-10-05)

**Triggers**: (1) BE update on main (Slack, thxnhi) — `history` / `fees` moved to page/limit, new
`GET` + `PATCH .../sub-brands/{brandEnum}/fees`; schema regenerated into `openapi.real.json`.
(2) Q&A 「【CRM】Y-07 ブランド：サブブランドの無効化・削除／ブランド名編集は Phase1 スコープか確認」
**closed** by 花島 → `Y-07.md` **260928_v3**. (3) Prototype `fitness-crm-ui` **9/30 デザイン更新**
(`47423ec`) reworked the 費用 card around that answer.

### Customer ruling (Q&A, 260928_v3 FR-001)

- **Sub-brand itself** (JOYFIT / JOYFIT24 / JOYFIT YOGA / JOYFIT＋): never disabled, deleted or renamed — fixed DB values.
- **In Phase 1**: per-sub-brand **費用マスタ** 無効化 / 有効化 / 物理削除 and ［＋登録］ after delete (G-05 運用方針「ステータス無効＋物理削除」, no archive).
- **In Phase 1**: **ブランド名** edit, exactly as the prototype (ブランド名 editable, ブランドID read-only, nothing else editable).
- No new store/member impact definition needed — the sub-brand never changes.

This **supersedes** the 2026-09-22 Round 3 parking of R301 / R302 / R304 / R305 / R309: the
requirement is now defined and the API backs it.

### Blocker status

| ID                        | Round 1 blocker                                               | Now                                                                                                                                                                                | Round 2 action                                                                                                |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **B1**                    | No transactional fee Save                                     | ✅ `PATCH /api/v1/admin/brands/{brandGroup}/sub-brands/{brandEnum}/fees` (`UpdateBrandFeeCardDto`) — full card state, diffed server-side in one TX, returns `SubBrandFeeDetailDto` | Wire Save; delete the disabled state                                                                          |
| **B2**                    | `/history` no total                                           | ✅ page/limit + `pagination.totalItems`                                                                                                                                            | Restore the 変更履歴 badge; add paging                                                                        |
| **B3**                    | `/fees` no total                                              | ✅ page/limit — but **superseded**: cards read the sub-brand detail instead (**R2-D1**)                                                                                            | Drop `/fees` from the 費用 tab                                                                                |
| **B4**                    | No group timestamps                                           | ⚠️ `BrandDetailDto.createdAt / updatedAt / updatedBy / updatedByName` — **no `createdBy` / `createdByName`**                                                                       | Wire; 作成者 → **G2**                                                                                         |
| **B5**                    | `before` / `after` typed `object`                             | ✅ `anyOf [number, string, null]`                                                                                                                                                  | Delete the cast seam                                                                                          |
| **B6**                    | Basic-info editor (cadence etc.)                              | ⚠️ unchanged; body typing broken → **G1**                                                                                                                                          | Still FE build; **not in this round** (prototype 9/30 has no such editor — 一般情報 変更 is the rename sheet) |
| **B7**                    | MOD-09 / ADD-09                                               | MOD-09 is now in the prototype as static copy (`CancelPolicyNote`)                                                                                                                 | Ship MOD-09; ADD-09 unchanged                                                                                 |
| R301/R302                 | 費用マスタ status + 無効化/有効化                             | ✅ `SubBrandDto.feeMasterStatus` + `PATCH .../fee-master/active`                                                                                                                   | Round 2                                                                                                       |
| R304                      | 費用マスタ 削除                                               | ✅ `DELETE .../sub-brands/{brandEnum}/fee-master`                                                                                                                                  | Round 2                                                                                                       |
| R309                      | ［＋登録］                                                    | ✅ `POST .../sub-brands/{brandEnum}/fee-master` (`RegisterBrandFeeMasterDto`)                                                                                                      | Round 2 (per-card, not the tab-level button)                                                                  |
| R305                      | ブランド名 edit                                               | ✅ `PATCH /api/v1/admin/brands/{brandGroup}` (`displayName` 1–100)                                                                                                                 | Round 2                                                                                                       |
| R303 / R306 / R307 / R308 | list status filter / EF chip / editable 項目名 / brand create | —                                                                                                                                                                                  | Unchanged. The **brand** has no status (prototype 9/30 removed the brand 有効 badge too).                     |

### New API gaps (BE asks)

| ID     | API URL                                                          | Missing / wrong                                                                                                                                               | UI impact                                       | Wireable?                                    | Ask                                              |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| **G1** | `PATCH /api/v1/admin/brands/{brandGroup}/sub-brands/{brandEnum}` | `UpdateBrandDto.maintenanceFeeStartMonth / maintenanceFeeCycleMonth / reenrollmentFeeWaiverDays` declared `type: object` → codegen `{[key: string]: unknown}` | B6 only (not built this round)                  | Yes, via one seam when B6 is built           | Declare `type: number, nullable: true`           |
| **G2** | `GET /api/v1/admin/brands/{brandGroup}`                          | `BrandDetailDto` has no `createdBy` / `createdByName`                                                                                                         | Prototype 9/30 その他情報 card shows **作成者** | Partly — render 「—」 with `TODO(round3) G2` | Add `createdBy` / `createdByName` at brand level |

FE-only (no ask): labels for 5 new `changeAction` values (`brand_name_update`, `fee_master_deactivate`,
`fee_master_activate`, `fee_master_delete`, `fee_master_register` — the drift guard already fails
`tsc`), field labels for `displayName` / `feeMasterStatus` and its values, `brandEnum: null` history
rows (対象 = the brand name), `scheduledChanges` max 20, `taxRate` omitted.

### Round 2 decisions

- **R2-D1 — 費用 cards read `GET .../sub-brands/{brandEnum}`, one query per card** (`useQueries`, keyed
  by `brandEnum`, enabled for non-staff). Same shape as every write response (`PATCH /fees`,
  `PATCH /fee-master/active`, `POST /fee-master`) → `setQueryData` on success, no refetch.
  `feeItems[].current` / `scheduled[]` replace the client-side grouping in `brand-fee-group.util.ts`.
  Card order and the slot list come from `detail.subBrands[]`. Cost: up to 4 requests for JOYFIT.
- **R2-D2 — Follow prototype 9/30** for the 費用 tab / 基本情報 tab (user direction: implement per the
  customer's Q&A answer and the prototype). This reverts parts of the Round 1 prototype-alignment
  pass that tracked the 9/17 prototype:
  - header 有効 badge and 基本情報 `StatusCard` **removed** → right column becomes **その他情報**
    (作成日時 / 作成者 / 更新日時 / 更新者) from `BrandDetailDto` (B4, G2).
  - 一般情報 card gets **変更** (HQ/System) → opens the rename sheet shared with the list row action.
  - 費用 card = sub-brand frame (title only) containing a **費用マスタ** section: status badge
    (有効 / 無効), **変更** + **⋯** menu (無効化 or 有効化, separator, 削除); inactive note
    「この費用マスタは無効です。金額と予約中の改定はそのまま残っています。」; then `CancelPolicyNote`
    (MOD-09) outside the section.
  - `feeMasterStatus === 'none'` → **未登録** card (dashed section, 未登録 badge, ［＋登録］).
  - Disable / delete dialogs carry the prototype copy incl. the 「変わらないもの」 list; 有効化 is
    immediate (no dialog).
  - Fee sheet is shared by 登録 / 変更: title 「{card}の費用マスタを登録|変更」, footer 登録する |
    保存する; register mode hides 現行設定 heading and the 予約 section (the API's register body has
    no schedules either); the past-date warning fires only when the date was **changed** to a past
    date; empty 定価 / 有効開始日 → field errors, scroll to the first.
  - Tab-level 費用 新規登録 button: absent in 9/30 → removed (R309 is now per card).
  - 費用 tab badge = number of sub-brands whose `feeMasterStatus !== 'none'` (prototype counts
    registered masters).
- **R2-D3 — Save payload.** One `BrandFeeCardItemDto` per **displayed** fee type (D14) with the
  full `scheduledChanges` list; `priceInclTax` verbatim, `taxRate` omitted (D13). Fee types the brand
  does not charge are **not sent** (server leaves them untouched).
- **R2-D4 — Date rules** (D8 + BE). 現行 有効開始日 `<= today` (BE rejects future). A past-dated 改定 is
  allowed (applied at once) but must be after the 現行 start; duplicates already blocked. Max 20
  schedules per item → disable 「改定スケジュールを追加」 at 20.
- **R2-D5 — Errors.** Shared `MutationCache` toast (D12). `E-VAL-001` `invalid_format` (a tax-incl
  price storage cannot hold, e.g. ¥1,000 @10%) surfaces via that toast; no FE pre-rounding.
- **R2-D6 — Invalidation.** Fee writes → `setQueryData` on the sub-brand detail + invalidate
  `detail` (for `feeMasterStatus`) and `history`. `DELETE fee-master` (204) → invalidate the
  sub-brand detail, `detail`, `history`. Rename → `setQueryData` on `detail` (returns
  `BrandDetailDto`) + invalidate `list` and `history`.
- **R2-D7 — History paging.** `limit` 50, page via the app's standard pagination footer, shown
  only when `totalPages > 1` (prototype shows none for its 5 rows); badge ← `pagination.totalItems`.
- **R2-D8 — Roles.** Writes HQ/System only (`403 E-AUTH-103` for manager/staff). Manager sees
  変更 / ⋯ / ［＋登録］ disabled via `RoleGatedButton`; staff keeps D11 (tabs hidden;
  `feeItems` / `feeMasterStatus` absent).

### Prerequisites

- **P1 — `DatePicker` year range** (pre-existing, app-wide, see Round 1 "Bug found"): no
  `endMonth`, so 2027+ was unreachable and FR-008 could not be exercised through the UI. **Fixed
  2026-10-05 in this branch** (user decision): `DatePicker` gains `startMonth` / `endMonth`, default
  100 years back → December 10 years ahead; the two 生年月日 pickers (`members-form.tsx`,
  `applicant-info-section.tsx`) pass `endMonth={new Date()}` to keep their old past-only range.
- **P2 — staffs edit type errors** after the regen (`asWireValue` still cast to the old object
  type on this branch; the fix `d9a1b50b` lives on `feat/demo-fc-company`). **Fixed 2026-10-05**
  with the identical change, so the later merge is clean.
- **P3 — prototype cache** `.cache/fitness-crm-ui` is detached at `47d60ac` (9/26); Round 2 read
  `47423ec` (9/30) straight from `origin/HEAD` and re-baselined `checklists/parity.md` on it. The
  cache checkout itself was not moved (it is managed by `speckit-load-external`).

### Round 2 tasks

**Phase A — foundations**

- **T201** `[P]` `_constants/brand-real.constants.ts`: 5 new `HISTORY_ACTION_LABELS`, field labels for
  `displayName` / `feeMasterStatus`, `FEE_MASTER_STATUS_LABELS`; drift guards stay.
- **T202** `[P]` `[id]/_utils/brand-history.util.ts`: delete the B5 seam; `brandEnum: null` → brand name.
- **T203** `[P]` `[id]/_utils/brand-fee-group.util.ts` + `_types/brand-fee.type.ts`: card model from
  `SubBrandFeeDetailDto` (current / scheduled / status) instead of grouping `/fees`.
- **T204** `[P]` `[id]/_utils/brand-fee-group-form.util.ts`: `buildDefaultValues` (edit + register),
  `toUpdateFeeCardBody`, `toRegisterFeeMasterBody`.
- **T205** `[id]/_schemas/brand-fee-group-form.schema.ts`: R2-D4 rules; required-field messages per
  prototype.

**Phase B — 基本情報 + rename**

- **T206** `[id]/page.tsx`: drop header status badge; 変更履歴 badge from `totalItems`; 費用 badge per
  R2-D2; remove the B6 TODO's placeholder button per prototype 9/30.
- **T207** `[id]/_components/basic-info-tab.tsx`: 一般情報 + 変更; その他情報 card (B4, G2).
- **T208** `_components/brand-form-sheet.tsx` (revive) + `_schemas/brand-form.schema.ts`: rename
  sheet per prototype (`displayName` required/trim/max 100, ブランドID disabled + note);
  `adminBrandControllerUpdateGroupMutation`.
- **T209** `page.tsx` + `_components/brand-table-columns.tsx`: restore the row 編集 action → same sheet.

**Phase C — 費用 tab**

- **T210** `[id]/_components/fees-tab.tsx`: `useQueries` over `subBrands` (R2-D1); remove the tab-level
  新規登録; registered vs 未登録 card.
- **T211** `[id]/_components/fee-group-card.tsx` + `fee-item-block.tsx`: 費用マスタ section, status
  badge, 変更 + ⋯ menu, inactive note, `CancelPolicyNote`.
- **T212** **new** `[id]/_components/unregistered-fee-card.tsx`.
- **T213** `[id]/_components/fee-group-disable-dialog.tsx` / `fee-group-delete-dialog.tsx` (revive):
  prototype copy; `adminBrandControllerSetFeeMasterActiveMutation` / `…DeleteFeeMasterMutation`;
  有効化 immediate.

**Phase D — fee sheet**

- **T214** `[id]/_components/brand-fee-group-edit-sheet.tsx`: edit + register modes;
  `adminBrandControllerUpdateFeeCardMutation` / `…RegisterFeeMasterMutation`; R2-D6.
- **T215** `fee-item-fields.tsx` / `scheduled-change-row.tsx`: fold in the Round 1 notes
  (`form.trigger()` after `append`, correct per-error copy), 20-row cap, changed-to-past warning.

**Phase E — history**

- **T216** `[id]/_components/history-tab.tsx`: page/limit + pagination (R2-D7).

**Phase F — verification**

- **T217** `npm run type-check` 0 errors, `npm run lint`.
- **T218** Live smoke (`headquarter`): rename (list + detail) → 変更 save (current correction,
  add / edit / remove 予約) → 無効化 → 有効化 → 削除 → ［＋登録］ → history rows for each action →
  paging. `manager` (all write controls disabled), `staff` (tabs hidden). Confirms the new routes
  are deployed (unauthenticated probes cannot — auth precedes routing).
- **T219** Append the Round 2 result; update `checklists/parity.md` against prototype 9/30.

### Round 3 after this round

R303, R306, R307, R308, **B6** (+ G1), ADD-09 ①③, **G2** (作成者).

## Round 2 result (2026-10-05)

### Shipped

| Area       | What landed                                                                                                                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared     | `DatePicker` `startMonth` / `endMonth` (P1); staffs `asWireValue` back to `string \| null` (P2).                                                                                                                                                                           |
| Constants  | 5 new `HISTORY_ACTION_LABELS`, `FEE_MASTER_STATUS_LABELS`, `feeMasterStatus` field label, `MAX_SCHEDULED_CHANGES`, `BRAND_NAME_MAX_LENGTH`. The drift guard did its job: the regen failed `tsc` until the labels existed.                                                  |
| Card model | `buildFeeGroup` from `SubBrandFeeDetailDto` (R2-D1) — the `/fees` grouping is gone; `useBrandFeeCache` writes every response into the card's cache entry and invalidates detail + history.                                                                                 |
| 基本情報   | Header badge and `StatusCard` removed; 一般情報 変更 → rename sheet; **その他情報** card (B4; 作成者 「—」, G2).                                                                                                                                                           |
| Rename     | `BrandFormSheet` revived on `PATCH /admin/brands/{brandGroup}` — list row 編集 + detail 変更 (R305).                                                                                                                                                                       |
| 費用       | One `GET .../sub-brands/{brandEnum}` per card via `useQueries` + `combine`; 費用マスタ section with data-driven 有効/無効, 変更 + ⋯ (無効化 / 有効化 / 削除), inactive note, `CancelPolicyNote` (MOD-09), **未登録** card with ［＋登録］; tab badge = registered masters. |
| Dialogs    | `FeeGroupDisableDialog` / `FeeGroupDeleteDialog` revived with the prototype 9/30 copy (R302 / R304).                                                                                                                                                                       |
| Fee sheet  | 変更 → `PATCH .../fees` (B1), 登録 → `POST .../fee-master` (R309); validation on save then live; D8 (現行 ≤ today) and the BE date rules as field errors; 20-row cap; 費用項目名 as text; past-date warning only on change; Round 1's `append` / wrong-copy notes fixed.   |
| 変更履歴   | page/limit + `TablePaginationWithSize` (`alwaysShowFooter={false}`), badge from `totalItems` (B2); B5 seam deleted; brand-level rows' 対象 = brand name.                                                                                                                   |

Removed: `fee-current-badge.tsx` (9/30 dropped the 現行 badge). `TODO(round2)` markers left in
`src/app/(private)/brands/**`: **none**. Remaining markers: `TODO(round3) G2` (作成者) and the
Round 1 `R308` / D4 notes.

### Verification

- `npm run type-check` **0 errors**; `npm run lint` **No issues found**.
- Live smoke against `https://api.dev.fitness-v2.okamoto-hd.com` (dev server on :3100 — :3000 was
  held by another checkout, and the API only allows CORS from :3000, so the Playwright harness
  added the CORS headers in-test; app code untouched). **0 failed `/api/v1` responses, 0 page
  errors.** All new routes are deployed.
  - Read (HQ): list 2 rows with ⋯; JOYFIT tabs 「費用 4」「変更履歴 8」; その他情報 作成日時
    2026/09/30 00:30:41; 4 JOYFIT cards 入会金 ¥2,200 / 登録事務手数料 ¥3,300; キャンセルポリシー ×4;
    history first page shared with the badge query (one request).
  - **A** 変更: added 予約 **2027/04/01** ¥3,456 through the picker (year list 1926–2036) → one
    `PATCH .../fees` 200, card 「予約中の改定 1件 · 有効開始日 2027/04/01 ¥3,456 · 登録: 2026/10/05 / HQ 1」.
  - **B** validation: empty 定価 → 「定価（税込）を入力してください」; 現行 date moved to 2026/12/01 →
    「将来日付は「予約中の改定」に登録してください」; **no request sent**.
  - **C** removed the 予約 → `PATCH` with `scheduledChanges: []` → card back to its original state.
  - **D** 無効化 (dialog copy verbatim) → 無効 badge + inactive note → 有効化 (immediate) → 有効.
  - **E** 削除 (dialog copy verbatim, 204) → 未登録 card, tab 「費用 3」 → ［＋登録］ sheet in 登録
    mode → `POST .../fee-master` 201 with 2026-04-23 ¥2,200 / ¥3,300 → card restored, 「費用 4」.
  - **F** rename: empty → 「ブランド名を入力してください」; JOYFIT → JOYFIT SMOKE → JOYFIT, h1 and
    その他情報 更新日時 / 更新者 updated.
  - **G** 変更履歴 「16」: 「ブランド名 JOYFIT → JOYFIT SMOKE」, 「登録: 費用マスタ 未登録 → 有効」,
    「削除: 費用マスタ 有効 → 未登録」, 「有効化 / 無効化: 費用マスタ」, 「予約登録 / 予約取消: 入会金」.
  - Roles: **Manager** — 費用 / 変更履歴 visible, row 編集 / 一般情報 変更 / fee 変更 / ⋯ all disabled;
    **Staff** — only 基本情報, row 編集 disabled; **System** — everything enabled.
- Not exercised live: history paging (16 entries < 25), the 20-row 予約 cap, duplicate-date alert.

### Shared-data note (dev)

Every write was reverted. One residue needed a manual fix: 削除 removes **all four** `feeType`
generations, including the ¥0 seeded `cardIssueFee` / `maintenanceFee` rows JOYFIT does not
charge, while ［＋登録］ (prototype, D14) re-registers only the two charged items. JOYFIT YOGA was
restored to its seed shape with two `POST /fees` (¥0, 2026-04-23), matching untouched JOYFIT.

### Open after Round 2

- **G3 (BE question)** — after 削除 → ［＋登録］ a JOYFIT sub-brand has no `cardIssueFee` /
  `maintenanceFee` row at all (`current: null`) instead of the seeded ¥0. Harmless on this screen
  (D14 hides them); worth confirming G-01 plan defaults do not expect all four. Ask: either the
  register endpoint seeds the uncharged types at 0, or the BE confirms "absent = not charged".
- **G1 / G2** — BE asks above (`UpdateBrandDto` typing for B6; brand-level `createdByName`).
- ~~**Fee item labels**~~ — **resolved 2026-10-05 (user decision)**: `FEE_TYPE_LABELS` now follows
  G-05's 費用項目 table and the prototype — 「セキュリティ管理／施設メンテナンス料」 / 「会員カード発行料」
  (was Y-07 FR-002's 「セキュリティ管理費・施設メンテナンス料」 / 「カード発行料」). Supersedes the wording
  note in **D2** / **D14**. Applies everywhere the label renders: card, sheet, preview, 変更履歴,
  dialogs.
- **「・BE」 suffix (PAR054)** — **kept dropped, 2026-10-05 (user decision)**: the prototype's
  「（有効開始日当日に自動切替・BE）」 is a developer annotation (the backend performs the switch);
  operators see 「（有効開始日当日に自動切替）」. Confirm with design if they disagree.
- **Round 3**: B6 (+ G1), ADD-09 ①③, R303, R308.
