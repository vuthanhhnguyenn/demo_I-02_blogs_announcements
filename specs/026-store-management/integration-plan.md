# Real API Integration Plan: Y-02 Store Management (店舗管理)

**Branch**: `feat/store-integration-api` | **Date**: 2026-09-22
**Specs**: [026-store-list](./spec.md) · [027-store-detail](../027-store-detail/spec.md) · [028-store-form](../028-store-form/spec.md)
**Requirements**: `Y-02.md` (store master) · `Y-15.md` (org hierarchy) · `Y-01.md` (staff permission matrix) · `G-03.md` (campaigns)
**Scope**: `src/app/(private)/stores/**` — list, detail (5 tabs), create, edit
**Target API**: `src/lib/api-real` (generated from `src/lib/openapi.real.json`, API-083 Store Management)

## Guiding principle

**UI first.** Where the real API cannot yet back a UI element, the element **stays as it is
today** — rendered disabled with a short 「API未対応」 note when leaving it live would silently
lose operator input, and stripped from every request body when sending it would be refused. No
control, column, badge or section is deleted to fit the current API surface. Every such point
carries a `TODO(round2)` comment naming its blocker id. Round 2 closes those TODOs once the BE
side ships.

**Round 3 = Phase 2.** Some elements are not Phase 1 scope at all, rather than being Phase 1 items
that wait on the BE. For those elements the UI code is **commented out** and marked
`TODO(round3) <blocker>`, so Phase 1 does not render them. Round 3 uncomments them when Phase 2 is
implemented. Today this applies to **B1** only (エリア / テリトリー; see
[Phase 2 re-scope](#phase-2-re-scope-2026-09-23)).

Mock API routes under `src/app/api/crm/stores/**`, `src/app/api/_schemas/store.schema.ts` and the
mock-db tables/seeds are **left untouched** (same convention as the staffs / positions / domains
integrations) — they simply stop being called by this feature.

## Endpoint mapping

| UI surface                                                        | Real endpoint                                                                            | Hook (`@/lib/api-real/@tanstack/react-query.gen`)                                                                                                                  | WP  | Round                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | -------------------------- |
| List rows / paging / sort (`clubCode`, `name`)                    | `GET /api/v1/admin/stores`                                                               | `adminStoreControllerListOptions`                                                                                                                                  | 1   | 1                          |
| Keyword search                                                    | same, `keyword` (max 100)                                                                | same                                                                                                                                                               | 1   | 1                          |
| Brand / prefecture / status filters                               | same, `brandEnum` / `prefecture` / `status`                                              | same                                                                                                                                                               | 1   | 1                          |
| Operating-company filter incl. 直営                               | same, `fcCompanyId` — UUID **or** the literal `"direct"`                                 | same                                                                                                                                                               | 1   | 1                          |
| Header badge + filter-banner baseline                             | same, `includeTotalAll=true` → `pagination.totalAllItems`                                | same                                                                                                                                                               | 1   | 1                          |
| Operating-company dropdown source                                 | `GET /api/v1/admin/fc-companies`                                                         | `adminFcCompanyControllerListInfiniteOptions`                                                                                                                      | 1   | 1                          |
| Select-all across pages (FR-027)                                  | same list endpoint, page by page (`limit` max 100)                                       | same                                                                                                                                                               | 1   | 1                          |
| Area/territory cascade · territory column · bulk territory change | —                                                                                        | —                                                                                                                                                                  | 1   | **B1 → Round 3 (Phase 2)** |
| Detail header + basic-info tab                                    | `GET /api/v1/admin/stores/{id}`                                                          | `adminStoreControllerDetailOptions`                                                                                                                                | 2   | 1                          |
| Operating-company name on detail                                  | `GET /api/v1/admin/fc-companies/{id}`                                                    | `adminFcCompanyControllerDetailOptions`                                                                                                                            | 2   | 1                          |
| Store photos / floor map                                          | — (write-only images; `gymMapS3Key` is a raw S3 key)                                     | —                                                                                                                                                                  | 2   | **B4**                     |
| Business hours — weekly                                           | `GET`/`PUT /api/v1/admin/stores/{id}/business-hours`                                     | `adminStoreControllerGetBusinessHoursOptions` / `adminStoreControllerReplaceBusinessHoursMutation`                                                                 | 2   | 1                          |
| Business hours — exception days + temporary closures              | `/business-exceptions` GET/POST/PATCH/DELETE, split by `exceptionType`                   | `adminStoreControllerListExceptionsOptions` / `…CreateExceptionMutation` / `…UpdateExceptionMutation` / `…DeleteExceptionMutation`                                 | 2   | 1                          |
| Staff-on-site window (weekly)                                     | `PUT /api/v1/admin/stores/{id}/business-hours` (undeclared in the schema, live — **B5**) | `adminStoreControllerReplaceBusinessHoursMutation`                                                                                                                 | 2   | 1                          |
| Contract tab — main contracts                                     | `GET`/`PUT /api/v1/admin/stores/{id}/plans`                                              | `adminStoreSettingsControllerListPlansOptions` / `…ReplacePlansMutation`                                                                                           | 2   | 1                          |
| Contract tab — options                                            | `GET`/`PUT /api/v1/admin/stores/{id}/options`                                            | `adminStoreSettingsControllerListOptionsOptions` / `…ReplaceOptionsMutation`                                                                                       | 2   | 1                          |
| Contract tab — campaign link/unlink                               | `GET /admin/stores/{id}/campaigns`, `POST`/`DELETE …/campaigns/{campaignId}`             | `adminCampaignControllerListStoreCampaignsOptions` / `…LinkStoreCampaignMutation` / `…UnlinkStoreCampaignMutation`                                                 | 2   | 1                          |
| Contract tab — campaign candidates                                | `GET /api/v1/admin/campaigns`                                                            | `adminCampaignControllerListInfiniteOptions`                                                                                                                       | 2   | 1                          |
| 1DayPass default price + per-date exceptions                      | `GET`/`PUT …/one-day-pass-price`, `PUT`/`DELETE …/one-day-pass-exceptions/{date}`        | `adminStoreSettingsControllerGetOneDayPassPriceOptions` / `…SetOneDayPassPriceMutation` / `…SetOneDayPassExceptionMutation` / `…DeleteOneDayPassExceptionMutation` | 2   | 1                          |
| Access tab — mutual use on/off + period                           | `GET`/`PUT /api/v1/admin/stores/{id}/mutual-use`                                         | `adminStoreSettingsControllerGetMutualUseOptions` / `…UpdateMutualUseMutation`                                                                                     | 2   | 1                          |
| Access tab — allowed partner stores                               | `PUT`/`DELETE …/mutual-use-allowed-stores/{partnerStoreId}`                              | `adminStoreSettingsControllerAddAllowedStoreMutation` / `…RemoveAllowedStoreMutation`                                                                              | 2   | 1                          |
| Access tab — partner-store picker                                 | `GET /api/v1/admin/stores?keyword=`                                                      | `adminStoreControllerListInfiniteOptions`                                                                                                                          | 2   | 1                          |
| Access tab — under-18 entry window                                | `PATCH /api/v1/admin/stores/{id}` (`minorEntryAllowedStart/End`)                         | `adminStoreControllerUpdateMutation`                                                                                                                               | 2   | 1                          |
| Access tab — deferred payment / JOY YOGA fee                      | —                                                                                        | —                                                                                                                                                                  | 2   | **B6**                     |
| Change-history tab                                                | `GET /api/v1/admin/stores/{id}/change-history`                                           | `adminStoreControllerChangeHistoryOptions`                                                                                                                         | 2   | **B2**                     |
| Create store                                                      | `POST /api/v1/admin/stores`                                                              | `adminStoreControllerCreateMutation`                                                                                                                               | 3   | 1                          |
| Create — weekly hours                                             | — (`CreateStoreDto` carries no hours field)                                              | —                                                                                                                                                                  | 3   | **B12**                    |
| Edit store                                                        | `PATCH /api/v1/admin/stores/{id}`                                                        | `adminStoreControllerUpdateMutation`                                                                                                                               | 3   | 1                          |
| Edit — weekly hours **from the form**                             | — (`UpdateStoreDto` carries no hours field)                                              | —                                                                                                                                                                  | 3   | **B13**                    |
| Weekly hours **from the 営業設定 tab**                            | `PUT /api/v1/admin/stores/{id}/business-hours`                                           | `adminStoreControllerReplaceBusinessHoursMutation`                                                                                                                 | 2   | 1                          |

Every screen has an endpoint. Nothing is blocked whole; the losses are field-level (B1–B13), and **B5 turned out not to be a loss at all** — see the Round 1 result below.

## Blockers carried into Round 2

| ID                                                                                                                                                                     | Blocker                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Spec basis                                                                                                                                         | Round 1 behaviour (UI kept)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Round 2 (after API fix)                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** — **Phase 2, moved to Round 3 on 2026-09-23** (see [Phase 2 re-scope](#phase-2-re-scope-2026-09-23); the Round 1 behaviour in this row was superseded that day) | **No Y-15 org hierarchy anywhere.** `stores` has no `territory_id` (`contracts-svc/prisma/schema.prisma:788-845`); no `/admin/territories` or `/admin/areas`; the `area` column is the mobile app's `1`–`8` code, not a Y-15 node; no `PATCH /admin/stores/bulk-territory`.                                                                                                                                                                                              | Y-02 FR-001 (territory column + search), FR-002 (territory **required**, area→territory cascade), FR-001 bulk action; Y-15 FR-M005                 | **Option A, confirmed by the user 2026-09-22.** Territory column **stays** and renders 「API未対応」 per row. Area + territory selects in the filter panel **stay**, disabled, with an 「API未対応」 tooltip; they are never put in the query. Selection, 選択中のみ表示 and 全件選択 keep working (client-side); only the 「テリトリーを変更」 execute button and the dialog's confirm are **disabled** with the same note. On the form the territory cascade **stays**, disabled, drops its `min(1)` rule and is **stripped from both create and update bodies**. Basic-info tab shows 「API未対応」 in place of the territory path. `TODO(round2) B1` at each point. | BE ships the hierarchy tables + `stores.territory_id` + `areaId`/`territoryId` list filters + the bulk endpoint → re-enable every control, restore the `min(1)` rule, put `territoryId` back in the bodies. |
| **B2**                                                                                                                                                                 | `GET …/change-history` returns `changedBy` (UUID) and a whole-row `snapshot`. No `fieldLabel` / `before` / `after`, no actor name.                                                                                                                                                                                                                                                                                                                                       | Y-02 FR-008 — 「変更日時・変更者・変更前後の差分を記録」                                                                                           | All 5 columns **stay**. 変更日時 from `changedAt`; 変更項目 from a local `changeAction` → Japanese label table (**D8**); 変更者 / 変更前 / 変更後 render 「API未対応」 (a raw UUID is not an operator name and would mislead). `TODO(round2) B2`.                                                                                                                                                                                                                                                                                                                                                                                                                       | BE resolves the actor name and emits a field-level diff → delete the local label table's fallback and read the three columns straight.                                                                      |
| **B3**                                                                                                                                                                 | Every nullable field on `CreateStoreDto` / `UpdateStoreDto` is declared `type: object`, so codegen emits `{ [key: string]: unknown } \| null` (`nameKana`, `prefecture`, `postalCode`, `address`, `phone`, `fax`, `receiptDate`, `preopenDate`, `grandOpenDate`, `closedAt`, `memo`, `fcCompanyId`, `minorEntryAllowedStart/End`, `accountCode`).                                                                                                                        | — (OpenAPI defect, not a spec matter)                                                                                                              | Form untouched. **One** cast in `_utils/store-api.util.ts` (`toNullableBody`), commented `TODO(round2) B3`. Same defect and same remedy as the positions integration (commit `2c60f19c`). **T403 decides it live**: if the BE refuses a string body, Round 1 stops sending the affected field and the input gets an inline 「API未対応」 hint.                                                                                                                                                                                                                                                                                                                          | BE changes to `type: string, nullable: true` → replace `openapi.real.json`, `npm run generate-api:real`, delete the seam.                                                                                   |
| **B4**                                                                                                                                                                 | No admin read path for store photos. `POST`/`PATCH`/`DELETE …/images` exist but no GET, and `StoreDetailDto` carries no images. `StoreCmsDetailDto.gymMapS3Key` is a **raw S3 key**, not a fetchable URL (unlike `StoreImageDto.url`, which the BFF resolves).                                                                                                                                                                                                           | Y-02 permission matrix ※ (Staff-editable items list 店舗写真・フロアマップ); Y-01 L262. FR-002's field list does not carry them.                   | The 店舗写真 card (4 slots) and the フロアマップ card **stay**, rendering their placeholders plus one 「API未対応」 line. No request is made for either. `TODO(round2) B4`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | BE adds `GET /admin/stores/{id}/images` (or `images[]` on `StoreDetailDto`) and runs `gymMapS3Key` through `AssetUrlResolver` → render both.                                                                |
| **B5**                                                                                                                                                                 | ~~No staff-on-site window on the weekly rows.~~ **Reclassified 2026-09-23 by the T403 live run.** `StoreBusinessHourDto` / `BusinessHourDto` omit `staffStartTime` / `staffEndTime` in `openapi.real.json`, but the live API **returns and accepts them both ways**: a `PUT …/business-hours` carrying the window round-tripped intact against `NEXT_PUBLIC_REAL_API_URL`. So this is a schema defect of the same family as **B3** and **B9**, not a missing capability. | Y-02 FR-005 — 「スタッフ常駐時間: B-01ゲートストップで参照する時間帯設定」                                                                         | **Closed in Round 1.** The weekly staff-on-site inputs are **fully editable** on the 営業設定 tab and travel with the replace body. Two casts in `_utils/store-api.util.ts` (`weeklyHoursOf` read, `toWeeklyHourBody` write) are the single seam, commented `TODO(round2) B5`.                                                                                                                                                                                                                                                                                                                                                                                          | BE corrects the two schemas → replace `openapi.real.json`, `npm run generate-api:real`, delete the seam.                                                                                                    |
| **B6**                                                                                                                                                                 | No field anywhere for 後払い設定 (per-day deferred payment) or どこでもJOY YOGA 利用料金.                                                                                                                                                                                                                                                                                                                                                                                | Y-02 FR-004 — 「YOGA利用料金設定（¥3,000/日…）（#24）。1日単位の後払い設定（#255, #376）」                                                         | Both controls **stay**, disabled, with 「API未対応」, excluded from the mutual-use body. `TODO(round2) B6`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | BE adds the columns to the mutual-use settings row and the two DTOs → re-enable.                                                                                                                            |
| **B7**                                                                                                                                                                 | `MutualUsePartnerStoreDto` has no setup date.                                                                                                                                                                                                                                                                                                                                                                                                                            | Not in Y-02 (the column comes from the prototype).                                                                                                 | The 設定日 column **stays** and renders 「API未対応」. Lowest priority of the set. `TODO(round2) B7`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | BE returns the pair's `linkedAt`, **or** the column is dropped — dropping breaks no requirement.                                                                                                            |
| **B8**                                                                                                                                                                 | `StoreCampaignDto` carries only `isAccepting` (boolean); no 上限到達 state, no `discountSummary`, no `publishedToStore`.                                                                                                                                                                                                                                                                                                                                                 | G-03 FR-002 / FR-004 — 「先着件数上限」, 「一覧で「上限到達」ステータスとして明示表示する」                                                        | The badge **stays** with its three states in the constant; Round 1 can only produce 受付中 / 受付停止 from `isAccepting`, so 上限到達 is unreachable, not removed. The 割引内容 column renders 「API未対応」; the campaign period comes from `CampaignSummaryDto.recruitmentStart/End`. `TODO(round2) B8`.                                                                                                                                                                                                                                                                                                                                                              | BE adds `acceptState` (3 values) + `discountSummary` → map the badge off `acceptState`.                                                                                                                     |
| **B9**                                                                                                                                                                 | `StoreDetailDto.genderRestriction` declares `none \| male_only \| female_only`, contradicting the DB default `mixed` (`store.service.ts:824`) and `Create/UpdateStoreDto`'s `mixed \| women_only`.                                                                                                                                                                                                                                                                       | Y-02 FR-002 — 「性別制限（混合/女性専用）」, i.e. the spec backs `mixed` / `women_only`.                                                           | One read-side cast next to B3's in `_utils/store-api.util.ts` (`genderRestrictionOf`), commented `TODO(round2) B9`. The UI keeps its two labels 混合 / 女性専用.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | BE corrects the enum on `StoreDetailDto` → regenerate, delete the cast.                                                                                                                                     |
| **B10**                                                                                                                                                                | `PATCH /admin/stores/{id}` calls `requireHq()` — role `staff` gets `E-AUTH-103` (`store.service.ts:301`, `HQ_ROLES` L35-37), although Y-02's matrix grants Staff 基本情報編集（Staff限定項目）on 所属店舗.                                                                                                                                                                                                                                                               | Y-02 permission matrix + ※ note; Y-01 L262-265                                                                                                     | **User decision 2026-09-22: out of FE scope.** The restricted-Staff form is wired exactly as it is today — the 3-field whitelist body (`name` / `address` / `phone`) is built and sent unchanged. A 403 surfaces through the shared `MutationCache` toast like any other server refusal. No FE gating is added and no UI is changed for it. `TODO(round2) B10` on the whitelist builder only as a pointer.                                                                                                                                                                                                                                                              | BE opens the whitelist for role `staff` in `update()`. FE needs no change.                                                                                                                                  |
| **B11**                                                                                                                                                                | `CreateStoreDto` has no `closedAt` (only `UpdateStoreDto` does).                                                                                                                                                                                                                                                                                                                                                                                                         | Y-02 FR-007 treats 閉店日 as an operational field set later, so nothing is lost at registration time.                                              | The 閉店日 field **stays** on the create screen, **disabled** with 「API未対応」 and stripped from the create body. It stays fully editable on the edit screen. `TODO(round2) B11`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | BE adds `closedAt` to `CreateStoreDto` → re-enable on create.                                                                                                                                               |
| **B12**                                                                                                                                                                | `POST /admin/stores` cannot register the weekly business hours — `CreateStoreDto` has no hours field, and `PUT …/business-hours` needs an id that does not exist until the store is created.                                                                                                                                                                                                                                                                             | Y-02 FR-002 lists 「営業時間（曜日別デフォルト設定）」 among the 登録・編集項目, i.e. the spec puts the weekly set on the **registration** screen. | The 8-row weekly table **stays** on the create screen, **disabled**, with one 「API未対応」 line, and its `superRefine` open/close rule is skipped while creating so it cannot block submit. Nothing is sent. **The FE does not compensate with a follow-up request** (user decision 2026-09-22): a second write would leave a half-registered store behind on failure, which is the API's problem to fix, not the FE's to paper over. The edit screen's weekly table keeps working through `PUT …/business-hours`. `TODO(round2) B12`.                                                                                                                                 | **BE ask: add the weekly rows to `CreateStoreDto`** so registration is one atomic request → re-enable the table, restore the validation rule, send it with the create body.                                 |
| **B13**                                                                                                                                                                | `PATCH /admin/stores/{id}` cannot save the weekly business hours either — `UpdateStoreDto` differs from `CreateStoreDto` only by `closedAt`. Saving the edit form would have to be two writes (`PATCH` + `PUT …/business-hours`).                                                                                                                                                                                                                                        | Y-02 FR-002 puts 「営業時間（曜日別デフォルト設定）」 in the 登録・**編集**項目 list, so the spec expects the edit screen to save it too.          | Same treatment as **B12**, by the user's decision of 2026-09-22 (「vẫn cần handle giống post」): the weekly table on the edit form **stays**, **disabled**, with the 「API未対応」 note, its validation rule skipped, and **nothing is sent** — the FE does not split the save into two writes. The table still **reads** the stored hours so the operator sees them. **No capability is lost**: weekly hours remain fully editable on the detail screen's 営業設定 tab through the dedicated `PUT …/business-hours` (WP2 / T203), which is also the only path a `staff` role has, since the store `PATCH` is HQ-only (**B10**). `TODO(round2) B13`.                    | **BE ask: add the weekly rows to `UpdateStoreDto`** so one form submit is one request → re-enable the table and send it with the store body.                                                                |

## Decisions

- **D1 — No mapper layer.** Components import `StoreSummaryDto`, `StoreDetailDto`, `StoreBusinessHourDto`,
  `StoreBusinessExceptionDto`, `StorePlanDto`, `StoreOptionDto`, `StoreCampaignDto`,
  `MutualUseSettingsDto`, `MutualUsePartnerStoreDto`, `StoreHistoryEntryDto`,
  `OneDayPassDefaultDto`, `OneDayPassExceptionDto` from `@/lib/api-real/types.gen` and use them in
  place. Renames (`club_code`→`clubCode`, `store_id`→`code`, `fc_company_id`→`fcCompanyId`,
  `operating_company_name`→`fcCompanyName`, `closing_date`→`closedAt`, `name_kana`→`nameKana`,
  `postal_code`→`postalCode`, `gender_restriction`→`genderRestriction`, `receipt_date`→`receiptDate`,
  `preopen_date`→`preopenDate`, `grand_open_date`→`grandOpenDate`, `created_at`→`createdAt`,
  `updated_at`→`updatedAt`) happen at each use site. Matches the staffs / positions / domains precedent.
- **D2 — Brand keeps the wire values.** `STORE_BRAND_LABELS` and friends are rekeyed to
  `Joyfit | Joyfit24 | JoyfitYoga | JoyfitPlus | Fit365`; the FE never re-cases a wire value. The
  form's two selects still resolve to one `brandEnum` — `FIT365` → `Fit365`, `JOYFIT` + sub-brand →
  the matching JOYFIT value — and `brandGroup` is derived server-side, so it is never sent.
  `brandEnum` is editable only while `status = preparing` (else 422 `E-STR-006`), so the edit form
  disables both selects outside that status with a reason tooltip.
- **D3 — Status grows from 2 to 4.** `preparing` 準備中 / `operating` 営業中 / `temporarily_closed`
  休業中 / `closed` 閉店, each with a label, badge class and status-card tone; the list's status
  filter offers all four (Y-02 FR-001's 「営業中/閉店」 predates the 4-state master). The form has no
  status control (028 FR-051), so `POST` relies on the API default `preparing`.
- **D4 — Prefecture is a JIS code, resolved locally.** The API stores and returns JIS X 0401
  numerics (`"13"`); the filter accepts either that or the romaji form. A new
  `_constants/store-prefecture.constant.ts` derives the code↔name map from the existing 47-entry
  `PREFECTURES` array in `src/constants/app.constants.ts` (index + 1 = code), so the list cell, the
  filter select and the form select all show 東京都 while the wire carries `"13"`. **Trade-off**:
  Y-02 FR-012's 「権限内の店舗が実際に使っている都道府県」 degrades to all 47 — no endpoint supplies
  the in-scope subset, and inventing one from the current page would be wrong. Documented, not a blocker.
- **D5 — Counts.** The real list supports `includeTotalAll=true`, so **no second baseline query is
  needed** (unlike positions D5): the header badge and the filter banner's 全N件 read
  `pagination.totalAllItems`, falling back to `totalItems` when the server declines the count
  (the field is nullable by contract). The filtered figure is `pagination.totalItems`.
- **D6 — Pagination.** The screen adopts the shared `API_PAGE_SIZE_OPTIONS` (`[25, 50, 100]`) from
  `src/constants/app.constants.ts` and deletes the local `STORE_PAGE_SIZE_OPTIONS`; the default stays 50. `SELECT_ALL_PAGE_SIZE` stays 100 — it already matched the real cap. `pagination.total_pages`
  becomes `totalPages`.
- **D7 — URL keys stay, values change.** The nuqs keys (`search`, `brand`, `prefecture`, `company`,
  `status`, `sort_by`, `sort_order`, `area_id`, `territory_id`) keep their names; only their values
  become wire values, and the mapping to `keyword` / `brandEnum` / `fcCompanyId` / `sort` / `order`
  happens once in `queryParams`. `area_id` / `territory_id` stay in the URL schema unused so B1's
  Round 2 is a re-enable, not a re-add. Table sort ids become `clubCode` / `name` to match `sort`.
- **D8 — Change-action labels are FE-owned.** `changeAction` is a free string on the wire
  (`create`, `update`, `business_hours_update`, `business_exception_create`, `fc_company_assign`, …);
  a local label table in `_constants/constants.ts` renders 変更項目, with the raw value shown for an
  unknown action so a new BE action degrades visibly rather than silently.
- **D9 — Two write shapes change from per-item to full-replace.** 主契約 and オプション move from
  the mock's `POST`/`DELETE` per row to `PUT …/plans` / `PUT …/options`, which take the complete
  desired id set (0–200, unique). The section therefore reads the current enabled set, applies the
  operator's add/remove to it and sends the whole array; `[]` disables everything. Cross-brand plan →
  404 `E-STR-010`; cross-brand option is allowed (404 `E-STR-011` only when the id is unknown).
- **D10 — Exceptions and temporary closures are one endpoint.** The mock's two lists collapse onto
  `/business-exceptions` with `exceptionType`: 例外営業日 → `short_hours` (both times required, else
  422 `E-STR-003`), 臨時休業 → `closed`. Both sections read the same paginated query and split on
  `exceptionType` client-side; `reason` now round-trips for both.
- **D11 — Create stays one request.** `POST /admin/stores` accepts neither the weekly hours (**B12**)
  nor `closedAt` (**B11**). The FE does **not** chain a second or third write to make up for it: a
  follow-up `PUT …/business-hours` that fails would leave a store registered without its hours and no
  clean way back, so the two controls are disabled with 「API未対応」 and the gap is raised with the
  BE instead (user decision 2026-09-22). Both are fully editable on the edit screen, which has the
  endpoints it needs.
- **D12 — Errors by `code`.** `_utils/store-api.util.ts` exports `STORE_ERROR_CODE` and reads
  `ErrorResponseDto.code`, never a Japanese substring: `E-STR-002` → inline duplicate on the
  `club_code` field; `E-STR-006` → status/brand transition refused; `E-STR-003` → business-hours
  times missing; `E-STR-009` → 1DayPass price out of ¥700–¥1,800; `E-STR-010` / `E-STR-011` →
  unknown plan/option id; `E-STR-012` → cross-brand-group mutual use; `E-FC-002` → unknown FC
  company; `E-AUTH-100` / `E-AUTH-103` → permission. The shared `MutationCache` in
  `src/providers/react-query.provider.tsx` already toasts every failed mutation, so **every local
  `onError: () => toast.error(...)` on a migrated mutation is deleted**; success toasts and inline
  field errors stay.
- **D13 — Territory typing goes local.** _(Superseded on 2026-09-23: the control is now
  commented out and not rendered. The local type stays for Round 3.)_ `territory-combobox.tsx` currently imports `OrgArea` from
  the mock `types.gen`. Since B1 leaves the control on screen but inert, it switches to a local
  `StoreTerritoryArea` type in `_constants/constants.ts`, so no file under `stores/**` imports
  `@/lib/api/**` after Round 1.
- **D14 — The form never writes the weekly hours; the 営業設定 tab does.** With **B12** and **B13**
  both open, `POST` and `PATCH` can carry no hours, and the FE does not compensate with a second
  write (user decision 2026-09-22). The weekly table therefore becomes **read-only on both form
  screens**, and the single writer for weekly hours in Round 1 is the detail screen's 営業設定 tab
  (T203) over the dedicated `PUT …/business-hours`. That endpoint is open to
  `system/headquarter/**staff**`, so the restricted-Staff capability spec 028 FR-086 protects is kept
  — it simply moves to the tab. `buildBusinessHoursPayload` stays exported but unused by the form
  until R213/R212 re-enable the tables.

## Round 1 tasks

Round 1 is split into **three work packages** so three subagents can implement in parallel. The
packages share **no files**: everything shared is finished first, in Phase 0, before they fan out.
`[P]` = parallelizable inside its package.

### Phase 0 — shared foundations (must land before WP1/WP2/WP3 start)

- **T001** `_constants/constants.ts` — rekey `STORE_BRAND_LABELS` / `STORE_BRAND_FILTER_OPTIONS` /
  `STORE_BRAND_BADGE_CLASSES` to the five wire brand values (**D2**); replace the 2-value status maps
  with the 4-value set — labels, badge classes, tones, filter options (**D3**); keep
  `STORE_GENDER_RESTRICTION_LABELS` on `mixed` / `women_only`; add `STORE_CHANGE_ACTION_LABELS` (**D8**),
  `StoreTerritoryArea` (**D13**) and `API_UNSUPPORTED_NOTE = 'API未対応'`; drop the re-exports of the
  mock `StoreArea` / `StoreListBrand` / `StoreListStatus` enums.
- **T002** `_constants/store-prefecture.constant.ts` _(new)_ — `PREFECTURE_BY_CODE` /
  `PREFECTURE_CODE_BY_NAME` / `PREFECTURE_OPTIONS`, derived from `PREFECTURES` (**D4**).
- **T003** `_utils/store-api.util.ts` _(new)_ — `STORE_ERROR_CODE` + `getStoreErrorCode(error)` (**D12**);
  `toNullableBody()` — the single `type: object` cast seam, `TODO(round2) B3`; `genderRestrictionOf()`
  — the single read-side cast, `TODO(round2) B9`; `WEEKDAY_TO_API` / `WEEKDAY_FROM_API`
  (`mon`↔`monday`, … , `holiday`↔`holiday`).
- **T004** `_components/territory-combobox.tsx` — switch to `StoreTerritoryArea`, render the whole
  control disabled with the 「API未対応」 note, `TODO(round2) B1` (**D13**, **B1**).

### WP1 — List screen (`specs/026-store-list`) — agent 1

Files: `page.tsx`, `_hooks/use-stores-filters.ts`, `_contexts/stores-filters-context.tsx`,
`_components/stores-filters.tsx`, `_components/stores-table-columns.tsx`,
`_components/store-bulk-territory-dialog.tsx`.

- **T101** `_hooks/use-stores-filters.ts` — drop `getCrmOrgAreasOptions` and
  `getCrmStoresFilterOptionsOptions`; build `queryParams` for `AdminStoreControllerListData['query']`
  (**D7**); prefectures from T002; operating companies from
  `adminFcCompanyControllerListInfiniteOptions` (`status: 'active'`) plus the `direct` entry;
  `area_id` / `territory_id` retained but never set (**B1**); page sizes from `API_PAGE_SIZE_OPTIONS`
  and `STORE_PAGE_SIZE_OPTIONS` deleted (**D6**).
- **T102** `_components/stores-filters.tsx` `[P]` — brand / status / prefecture / company selects off
  the new sources; area and territory selects kept but **disabled** with the 「API未対応」 tooltip
  (**B1**).
- **T103** `_components/stores-table-columns.tsx` `[P]` — `ColumnDef<StoreSummaryDto>`; `clubCode`,
  `name`, `brandEnum` badge, `prefecture` through T002, `fcCompanyName` (already resolves 直営), the
  territory column kept rendering 「API未対応」 (**B1**), 4-state status badge (**D3**); sort ids
  `clubCode` / `name`.
- **T104** `_components/store-bulk-territory-dialog.tsx` `[P]` — kept whole; the confirm button
  disabled with the 「API未対応」 note, `TODO(round2) B1`.
- **T105** `page.tsx` — `adminStoreControllerListOptions`; `data.items`, `pagination.totalItems` /
  `totalAllItems` / `totalPages` / `limit` (**D5**); select-all unchanged but reading `totalPages`;
  the 「テリトリーを変更」 button disabled and `patchCrmStoresBulkTerritoryMutation` plus
  `handleBulkExecute` removed behind `TODO(round2) B1` (selection, 選択中のみ表示 and 全件選択 keep
  working); row click and edit links unchanged (ids are already opaque strings).

### WP2 — Detail screen (`specs/027-store-detail`) — agent 2

Files: everything under `src/app/(private)/stores/[id]/` **except** `[id]/edit/page.tsx` (WP3).

- **T201** `[id]/page.tsx` — `adminStoreControllerDetailOptions`; 4-state status badge; keep the
  403/404 boundaries, now keyed off `E-AUTH-100` / `E-AUTH-103` / `E-STR-001` (**D12**); pass
  `store.brandEnum` down.
- **T202** `[id]/_components/tabs/basic-info-tab/index.tsx` `[P]` — `StoreDetailDto` field renames
  (**D1**); 運営企業 from `adminFcCompanyControllerDetailOptions` when `fcCompanyId` is set, else 直営;
  テリトリー row renders 「API未対応」 (**B1**); 性別制限 via `genderRestrictionOf` (**B9**); the 店舗写真
  and フロアマップ cards kept with their placeholders plus the 「API未対応」 line (**B4**).
- **T203** `…/business-settings-tab/index.tsx` + `business-hours-settings.tsx` +
  `business-hours-shared.ts` + `business-settings-tab-skeleton.tsx` — weekly set from
  `adminStoreControllerGetBusinessHoursOptions` / `…ReplaceBusinessHoursMutation` with the T003 day
  mapping; the staff-on-site inputs kept, disabled, excluded from the body (**B5**).
- **T204** `…/business-settings-tab/exception-hours-settings.tsx` +
  `temporary-closure-days-settings.tsx` + `business-calendar.tsx` `[P]` — both sections read the one
  `/business-exceptions` query and split on `exceptionType` (**D10**); create / update / delete via the
  three exception mutations; `reason` round-trips for both.
- **T205** `…/access-settings-tab/index.tsx` + `permitted-store-select.tsx` — mutual use from
  `…GetMutualUseOptions` / `…UpdateMutualUseMutation` (`isAcceptEnabled`, `acceptPeriodStart/End`,
  now `YYYY-MM-DD`); allowed stores diffed into `…AddAllowedStoreMutation` /
  `…RemoveAllowedStoreMutation` calls; the under-18 window saved through
  `adminStoreControllerUpdateMutation` (`minorEntryAllowedStart/End`); 後払い設定 and JOY YOGA 利用料金
  kept but disabled (**B6**); the 設定日 column renders 「API未対応」 (**B7**); the partner picker reads
  `adminStoreControllerListInfiniteOptions` with `keyword`; `E-STR-012` surfaces as the cross-brand
  message (**D12**).
- **T206** `…/contract-tab/_components/main-contract-section.tsx` `[P]` — `StorePlanDto` list plus the
  full-replace `…ReplacePlansMutation` (**D9**); 本部/店舗 origin badge from `StorePlanDto.storeId`
  (null = HQ); 料金（税込） is `priceMonthly` as served — tax-included since API-087 v0.14 (BE MR !880);
  the earlier client-side `floor(priceMonthly × (1 + taxRate/100))` was removed 2026-10-29.
- **T207** `…/contract-tab/_components/option-section.tsx` `[P]` — `StoreOptionDto` plus
  `…ReplaceOptionsMutation` (**D9**); 料金（税込） is `fee` as served (tax-included since API-085 v0.12).
- **T208** `…/contract-tab/_components/campaign-section.tsx` + `campaign-bind-drawer.tsx` `[P]` — linked
  list from `adminCampaignControllerListStoreCampaignsOptions`; candidates from
  `adminCampaignControllerListInfiniteOptions` minus the linked ids, restricted to the store brand;
  link / unlink mutations; period from `CampaignSummaryDto.recruitmentStart/End`; the badge keeps its
  three states with 上限到達 unreachable and 割引内容 rendering 「API未対応」 (**B8**).
- **T209** `…/contract-tab/_components/one-day-pass-section.tsx` + `one-day-pass-price-drawer.tsx` `[P]`
  — `…GetOneDayPassPriceOptions` (`default` may be null), `…SetOneDayPassPriceMutation`,
  `…SetOneDayPassExceptionMutation` / `…DeleteOneDayPassExceptionMutation` keyed by `{date}`; the
  ¥700–¥1,800 bound now also enforced server-side (`E-STR-009`).
- **T210** `…/change-history-tab/index.tsx` `[P]` — `adminStoreControllerChangeHistoryOptions`
  (`limit: 100`); 変更項目 from `STORE_CHANGE_ACTION_LABELS`; 変更者 / 変更前 / 変更後 render
  「API未対応」 (**B2**).

### WP3 — Create / edit form (`specs/028-store-form`) — agent 3

Files: `_schemas/store-form.schema.ts`, `_utils/store-form.util.ts`, `_hooks/use-store-form-options.ts`,
`_components/store-form.tsx`, `_components/store-form-shell.tsx`, `create/page.tsx`,
`[id]/edit/page.tsx`.

- **T301** `_schemas/store-form.schema.ts` — brand values from T001 (**D2**); `territory_id` loses its
  `min(1)` rule (**B1**); `prefecture` now holds a JIS code (**D4**); gender enum unchanged; the
  weekly-hours sub-schema keeps the staff window fields so the disabled inputs still type-check (**B5**);
  its open/close `superRefine` rule is skipped entirely in Round 1, since the table is inert on both
  form screens (**B12**, **B13**).
- **T302** `_utils/store-form.util.ts` — `buildCreatePayload` → `CreateStoreDto` and
  `buildUpdatePayload` → `UpdateStoreDto`, both through `toNullableBody` (**B3**); `territory_id`
  stripped (**B1**); `closing_date` stripped on create only (**B11**); `default_hours` stripped from
  **both** bodies (**B12**, **B13**) and `hoursChanged` dropped from `buildUpdatePayload`'s options;
  `buildBusinessHoursPayload` is left in place (T003 day mapping, no staff window — **B5**) for
  R212/R213 but is no longer called by either form screen (**D14**); the dirty-field diffing and the
  restricted-Staff 3-field whitelist are kept exactly as they are (**B10**).
- **T303** `_hooks/use-store-form-options.ts` `[P]` — FC companies from
  `adminFcCompanyControllerListInfiniteOptions`; the org-areas query removed, `areas` returns `[]` so
  the disabled cascade still renders (**B1**).
- **T304** `_components/store-form.tsx` — field renames; prefecture select from T002; brand selects
  disabled outside `status = preparing` on edit (**D2**); territory cascade disabled with the note
  (**B1**); the 8-row weekly-hours table is disabled with the 「API未対応」 note on **both** screens
  (**B12**, **B13**) while still showing the stored values, and carries a line pointing the operator at
  the 営業設定 tab; 閉店日 is disabled on the create screen only (**B11**).
- **T305** `create/page.tsx` — `adminStoreControllerCreateMutation` only; **no follow-up hours or
  `closedAt` write** (**D11**, **B11**, **B12**). `E-STR-002` inline on `club_code`, `E-FC-002` on the
  company field (**D12**); local error toasts removed.
- **T306** `[id]/edit/page.tsx` — `adminStoreControllerDetailOptions` +
  `adminStoreControllerGetBusinessHoursOptions` (the weekly read stays: the disabled table still shows
  the stored values). Save is **one** `adminStoreControllerUpdateMutation` — the whole weekly branch
  (`hoursMutation`, the restricted-Staff hours-first ordering, the `resetField` dance and the
  empty-body guard that existed only for it) is deleted (**B13**, **D14**). Query-key invalidation
  retargeted to `adminStoreControllerListQueryKey` / `adminStoreControllerDetailQueryKey` (the mock
  filter-options key disappears with T101). `E-STR-006` surfaced on the brand/status control,
  `E-STR-002` inline on `club_code` (**D12**); local error toasts removed.
- **T307** `_components/store-form-shell.tsx` `[P]` — only if the restricted-Staff footer copy needs a
  touch; otherwise unchanged.

### Phase D — verification (after all three packages land)

- **T401** `npm run type-check` — gate is **0 errors**; then `npm run lint`.
- **T402** Confirm no file under `src/app/(private)/stores/**` still imports `@/lib/api/**`.
- **T403** Live smoke against `NEXT_PUBLIC_REAL_API_URL`: list → keyword → each enabled filter →
  paging → page-size → sort both columns → row click → all five tabs → create (store only) → edit
  (store only) → weekly-hours save from the 営業設定 tab → exception + closure create/edit/delete → plan/option replace → campaign link/unlink →
  1DayPass default + exception → mutual use save + partner add/remove → one permission-gated case.
  **This run decides B3** (does the BE accept a string in an `object`-typed field?) and confirms the
  `fcCompanyId=direct` filter. Record the verdict in the Round 1 result section.

## Round 2 backlog (after the API is fixed)

| ID       | Closes | What Round 1 code is deleted                                                                                                                                                                                                |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~R201~~ | B1     | **Moved to Round 3 as R301** (Phase 2). See the Round 3 backlog.                                                                                                                                                            |
| **R202** | B2     | The 「API未対応」 fallbacks in the three history columns; read `changedByName` / `fieldLabel` / `before` / `after` directly.                                                                                                |
| **R203** | B3     | `toNullableBody` in `_utils/store-api.util.ts`, after replacing `openapi.real.json` and running `npm run generate-api:real`.                                                                                                |
| **R204** | B4     | The 「API未対応」 lines on the 店舗写真 and フロアマップ cards; wire the images read and the resolved map URL.                                                                                                              |
| **R205** | B5     | `weeklyHoursOf` and `toWeeklyHourBody` in `_utils/store-api.util.ts` (the inputs already work — only the two casts go).                                                                                                     |
| **R206** | B6     | The `disabled` on 後払い設定 and JOY YOGA 利用料金 and their exclusion from the mutual-use body.                                                                                                                            |
| **R207** | B7     | The 「API未対応」 in the 設定日 column — or the column itself, if the client confirms it is not required.                                                                                                                   |
| **R208** | B8     | The 割引内容 fallback and the `isAccepting` → badge mapping; drive the badge from `acceptState`.                                                                                                                            |
| **R209** | B9     | `genderRestrictionOf` in `_utils/store-api.util.ts`.                                                                                                                                                                        |
| **R210** | B10    | Nothing on the FE — the BE fix alone makes the existing Staff path work.                                                                                                                                                    |
| **R211** | B11    | The `disabled` on 閉店日 on the create screen and its strip from the create body.                                                                                                                                           |
| **R212** | B12    | The `disabled` on the create screen's weekly-hours table, the skipped `superRefine` rule, and the strip from the create body; `default_hours` travels with `POST /admin/stores` again.                                      |
| **R213** | B13    | The `disabled` on the edit screen's weekly-hours table and the strip from the update body; `buildBusinessHoursPayload` is wired back into the form (or the hours ride the store body, depending on the shape the BE ships). |

## Resolved questions

- **Q1 — What happens to テリトリー in Round 1?** Resolved 2026-09-22 (user): **option A** — keep every
  control, disabled, with 「API未対応」, and strip the value from all bodies. Not removed from the UI,
  not deferred to a later round. **Superseded 2026-09-23 by Q8.**
- **Q8 — Is エリア / テリトリー Phase 1 at all?** Resolved 2026-09-23 (user): **no — Phase 2.** The
  client's Notion board _CRM Category_ lists **Y-15 組織階層管理 under Phase 2**. `Y-15.md`
  (「Phase帰属: Phase 1」) and Y-02 v5 are stale on this point. The UI is commented out, not
  disabled, and B1 moves to **Round 3** (R301).
- **Q2 — Does the FE gate the store edit for role `staff` now that the BE refuses it?** Resolved
  2026-09-22 (user): **no** — the FE wires the request as specified by Y-02 and a 403 is the BE's
  problem, outside FE scope (**B10**).
- **Q3 — One Round 1 or several?** Resolved 2026-09-22 (user): one Round 1, split into the three work
  packages above so three subagents can implement in parallel.
- **Q6 — Should the FE chain a second request so registration can still save the weekly hours?**
  Resolved 2026-09-22 (user): **no.** The create endpoint is required to take them; the FE disables the
  table and the gap is raised with the BE (**B12**) rather than worked around with a multi-write create.
- **Q7 — Does the edit screen get the same treatment, even though its two writes are recoverable?**
  Resolved 2026-09-22 (user): **yes** — consistency with Q6, and the ask on the BE is the same one line
  (**B13**). Confirmed safe because the 営業設定 tab keeps the weekly hours editable for every role the
  spec grants it to, including `staff` (**D14**).

## Open questions

- **Q4 — Prefecture options.** Y-02 FR-012 asks for the prefectures in the operator's scope; no
  endpoint supplies them, so Round 1 offers all 47 (**D4**). Recommendation: accept the degradation
  for Phase 1 and raise the in-scope list with the BE only if the client objects — a 47-entry select
  is not a usability failure.
- **Q5 — 上限到達 campaign state.** G-03 FR-004 requires it, `StoreCampaignDto` cannot express it
  (**B8**). Recommendation: ask the BE for `acceptState` alongside the G-03 campaign-management
  integration, since the same defect will hit that screen.

## Round 1 result (2026-09-23)

Phase 0 landed first, then WP1 / WP2 / WP3 in parallel, then Phase D. **Every Round 1 task is
implemented.** 41 files changed under `src/app/(private)/stores/**`, plus two outside it (below).

### Phase D gates

| Gate                                                   | Result                                      |
| ------------------------------------------------------ | ------------------------------------------- |
| **T401** `npm run type-check`                          | **0 errors** outside `.next/types/`         |
| **T401** `npm run lint`                                | `ESLint: No issues found`                   |
| **T402** no `@/lib/api/**` import under `stores/**`    | **clean** — not one import, not even a type |
| **T403** live smoke against `NEXT_PUBLIC_REAL_API_URL` | run at the API level; see below             |

### T403 — what the live run decided

Run against `https://api.dev.fitness-v2.okamoto-hd.com` with the seeded Cognito accounts
(`system` and `staff`), through `POST /api/v1/auth/crm/login`. **All dev data touched was restored
to its original state afterwards and verified.**

- **B3 resolved — the plan's contingency is not needed.** `PATCH /admin/stores/{id}` with a plain
  string in an `object`-typed field (`memo`) returned 200 and read back intact. Round 1 therefore
  sends every affected field normally; no input is disabled for B3. `toNullableBody` stays as the
  single cast seam until the schema is fixed (R203).
- **B5 reclassified and closed.** The live weekly rows carry `staffStartTime` / `staffEndTime` on
  read, and a `PUT …/business-hours` carrying them round-tripped intact — the fields are simply
  absent from `openapi.real.json`. The 営業設定 tab's staff-on-site inputs are therefore **live and
  editable in Round 1**, behind the `weeklyHoursOf` / `toWeeklyHourBody` seam. Y-02 FR-005 is met.
- **B9 confirmed.** `StoreDetailDto.genderRestriction` came back `"mixed"`, which the declared enum
  (`none | male_only | female_only`) does not contain. `genderRestrictionOf` is required.
- **B2 confirmed.** History rows carry `changedBy` (a UUID) and a whole-row `snapshot`, with no
  actor name and no field diff. The three columns correctly render 「API未対応」.
- **D8 corrected against reality.** `STORE_CHANGE_ACTION_LABELS` now holds the exact action set the
  backend writes (`create`, `update`, `status_change`, `fc_company_change`,
  `business_hours_update`, `attach_plan`, `detach_plan`, `attach_option`, `detach_option`,
  `one_day_pass_price_set`, `mutual_use_update`), read off `store.service.ts` /
  `store-settings.service.ts` and matched against the live endpoint. The plan's original guesses
  (`options_replace`, `business_exception_create`, …) do not exist. Exception and closure edits
  also record `business_hours_update`, so that one label covers both.
- **D4 confirmed.** The `prefecture` filter accepts both the JIS code (`13`) and the romaji form
  (`tokyo`) and returns the same rows.
- **D5 confirmed.** `includeTotalAll=true` returns `totalAllItems`; no second baseline query.
- **`fcCompanyId=direct` confirmed.** Returns exactly the directly-managed stores.
- **B10 confirmed live.** Role `staff` calling `PATCH /admin/stores/{id}` gets
  `403 E-AUTH-103 "HQ-only operation"`, exactly as documented. Per the user's decision this is out
  of FE scope; the request is wired and the refusal rides the shared `MutationCache` toast.
- **D14's "no capability is lost" is verified, not merely argued.** Role `staff` successfully
  **read and replaced** the weekly hours through `PUT …/business-hours` and created a
  `/business-exceptions` row. The 営業設定 tab really is a working path for Staff.
- Also exercised green: list paging / `limit=100` / `sort=clubCode|name` both orders / `keyword` /
  `brandEnum` / `brandGroup` / `status`; detail; business-exception create + patch + delete for
  both `short_hours` and `closed`; `PUT …/plans`; `PUT …/options`; `PUT`/`DELETE`
  `…/one-day-pass-exceptions/{date}`; the ¥700–¥1,800 bound (422 on ¥500); `PUT …/mutual-use`;
  `PUT`/`DELETE …/mutual-use-allowed-stores/{id}`; campaign unlink + relink; the campaign master
  list with `brandEnum` and its `recruitmentStart` / `recruitmentEnd`.

### T403 — the two steps deliberately not run

Both write state that **cannot be undone through the API**, and this is a shared dev backend:

- **`POST /api/v1/admin/stores`** — there is no `DELETE /api/v1/admin/stores/{id}`, so a smoke
  store would be permanent. The create body is the same `CreateStoreDto` shape whose field typing
  B3 just cleared on `PATCH`.
- **`PUT …/one-day-pass-price` success path** — there is no delete for the store default, so a
  base price would be permanent. The endpoint was still proved live and validating: ¥500 returned
  `422 E-STR-009`, and the per-date exception path round-tripped fully.

A rendered-UI pass was not run either: port 3000 is held by an existing dev server outside this
session, and a browser smoke needs a logged-in session on it.

### Deviations from the plan text, all deliberate

1. **T101's `status: 'active'` does not exist** on `AdminFcCompanyControllerListData['query']`; the
   flag is `isActive?: boolean`. Sent as `{ isActive: true }` — same intent.
2. **`adminFcCompanyControllerDetailOptions` is also used by the edit form** (WP3), not only the
   basic-info tab. `StoreDetailDto` carries `fcCompanyId` but no company name, so without it the
   picker's trigger would print a raw UUID. Already in the endpoint table.
3. **T307 did need a touch.** The restricted-Staff footer claimed 営業時間 was editable on the form;
   with **B13** that is no longer true, so it now names the three editable fields and points at the
   営業設定 tab.
4. **Campaign 公開対象外 affordances removed, not disabled.** `publishedToStore` exists on neither
   DTO, so the marker and the bind-drawer block reason could never render truthfully. `TODO(round2)
B8` names exactly what R208 restores.
5. **1DayPass 基準価格 is now writable** in the drawer. `specs/027-store-detail` FR-050a called it
   display-only because the mock could not write it; `…SetOneDayPassPriceMutation` exists and is in
   T209, and without it an operator could never establish a base price (`default` starts `null`).
6. **`contract-tab/_schemas/contract-tab.schema.ts` was deleted** — a Zod schema of the _mock_ plan
   and option shapes (`price_including_tax`, `related_option_name`) whose only three importers all
   migrated.
7. **Two files outside `stores/**`changed**, both forced by the D2 brand rekey:`franchise-companies/[id]/\_constants/detail.constants.ts`(and nothing else in that feature) now
keeps its own`STORE_BRAND_MOCK_LABELS`, since that screen is still on the mock client whose
brand values are lowercase. `STORE_STATUS_LABELS`is still shared —`operating`and`closed` are
   both in the new 4-value set.
8. **Multi-item writes are sequential loops** where the real API is single-item and the mock was
   bulk (campaign link, allowed-store add/remove, 1DayPass exceptions). Each loop stops on the first
   failure and leaves what already succeeded in place; there are no compensating rollback writes.
9. **Plan and option drawer search is client-side** — `GET …/plans` and `GET …/options` take no
   keyword parameter. The campaign drawer keeps real server-side search (`nameQuery`).

### New gap found during implementation

- **B14 — 親オプション (parent option) has no field anywhere.** `StoreOptionDto` carries
  `description` / `proratedEnabled` / `prorationMethod` and nothing that expresses a parent option.
  Not covered by B1–B13. The column stays and renders 「API未対応」
  (`option-section.tsx`, `TODO(round2)`). **Needs a BE ask**, and a spec check against Y-02 to
  confirm whether the column is required at all.

### The BE ask list after Round 1

| Priority | Ask                                                                                                                                                                                                                    | Blocker    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Phase 2  | Y-15 org hierarchy: the tables, `stores.territory_id`, `areaId` / `territoryId` list filters, and a bulk-territory endpoint. Not a Phase 1 ask (Q8); raise it with the Phase 2 schedule                                | B1         |
| 2        | Weekly business hours on `CreateStoreDto` **and** `UpdateStoreDto` (one change, two DTOs)                                                                                                                              | B12 + B13  |
| 3        | Schema-only fixes — nullable fields typed `object` instead of `string`; `StoreDetailDto.genderRestriction`'s wrong enum; `staffStartTime` / `staffEndTime` missing from the weekly DTOs although the API supports them | B3, B9, B5 |
| 4        | Field-level diff + actor name on the change-history rows                                                                                                                                                               | B2         |
| 5        | An admin read path for store photos, and `gymMapS3Key` resolved to a URL                                                                                                                                               | B4         |
| 6        | `acceptState` (3 values) + `discountSummary` + `publishedToStore` on `StoreCampaignDto`                                                                                                                                | B8         |
| 7        | 後払い設定 and どこでもJOY YOGA 利用料金 on the mutual-use settings                                                                                                                                                    | B6         |
| 8        | A parent-option field on `StoreOptionDto`                                                                                                                                                                              | **B14**    |
| 9        | `closedAt` on `CreateStoreDto`; `linkedAt` on `MutualUsePartnerStoreDto`                                                                                                                                               | B11, B7    |
| —        | Open the store `PATCH` whitelist to role `staff` — **no FE change needed**                                                                                                                                             | B10        |

## Phase 2 re-scope (2026-09-23)

**Decision (Q8).** エリア / テリトリー are Phase 2. Everything B1 touches hangs off the Y-15
organisational hierarchy, and the client's _CRM Category_ board lists Y-15 組織階層管理 under
Phase 2. Round 1's option A rendered these controls disabled with 「API未対応」. That treatment is
replaced: Phase 1 **does not render** them. The code is **commented out, not deleted**, and every
point carries `TODO(round3) B1`, so Round 3 is an uncomment followed by wiring.

The spec files were updated the same day. Each of `store-list` / `store-detail` / `store-form`
`spec.md` has a _Session 2026-09-23_ clarification and tags every affected FR / scenario / edge
case **[Phase 2 — Round 3]**.

### What changed in the code

| File                                                                                              | Phase 1 now                                                                                                                                    | Commented out (`TODO(round3) B1`)                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_components/stores-table-columns.tsx`                                                            | Six columns                                                                                                                                    | The テリトリー column                                                                                                                                                                                                                                    |
| `_components/stores-filters.tsx`                                                                  | Four filters. Placeholder 店舗名・クラブコードで検索...                                                                                        | `AreaSelectInput` / `TerritorySelectInput`. The placeholder's テリトリー名 part                                                                                                                                                                          |
| `_hooks/use-stores-filters.ts`                                                                    | `area_id` / `territory_id` still parsed from the URL, but not read, counted or sent                                                            | `areaId` / `territoryId`, `selectArea`, the two `updateFilter` keys, and the two `activeFilterCount` entries (so a stale deep link does not show a filter badge that no control can clear)                                                               |
| `page.tsx`                                                                                        | No selection column, bulk bar or dialogs. The table reads `stores` / `totalStores` directly, and the FR-023 page clamp follows the server page | Selection state and handlers, `canBulkChange`, FR-027 select-all, the FR-029 selected-only view, the bulk bar, the select-all `AlertDialog` and `StoreBulkTerritoryDialog`. Selection exists only for the bulk action (spec FR-024), so it moves with it |
| `_components/store-form.tsx`                                                                      | No テリトリー field. Three required marks                                                                                                      | The `territory_id` `FormField` (`TerritoryCombobox` + `TerritoryBreadcrumb`)                                                                                                                                                                             |
| `[id]/_components/tabs/basic-info-tab/index.tsx`                                                  | 15 fields                                                                                                                                      | The テリトリー row                                                                                                                                                                                                                                       |
| `_schemas/store-form.schema.ts`, `_utils/store-form.util.ts`                                      | `territory_id: z.string()` stays with no `.min(1)`. Still stripped from both bodies                                                            | Nothing to comment; the tags were renamed to `TODO(round3) B1`                                                                                                                                                                                           |
| `store-bulk-territory-dialog.tsx`, `data-select-input/{area-select-input,territory-combobox}.tsx` | Kept as they are, but no longer imported by any Phase 1 screen                                                                                 | Nothing to comment; `R201` renamed to `R301`                                                                                                                                                                                                             |

Gates: `tsc --noEmit` shows 0 errors outside `.next/`, `npm run lint` shows no issues, and
`prettier --check` passes on `stores/**`.

## Round 3 backlog (Phase 2)

| ID       | Closes | Work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R301** | B1     | 1. Uncomment every `TODO(round3) B1` block listed above, and restore the imports named in each block's comment (the header comment in `page.tsx` lists them).<br>2. Drop the 「API未対応」 / `disabled` leftovers inside the uncommented code: the bulk button's tooltip wrapper, the combobox's forced `disabled`, and the column's placeholder cell.<br>3. Replace the `area-select-input.tsx` stub with the real Y-15 hierarchy query.<br>4. Restore `territory_id`'s `.min(1)` and put `territoryId` back in both form bodies.<br>5. Send `areaId` / `territoryId` in `queryParams`, and restore territory-name keyword matching.<br>6. Add the bulk mutation plus `handleBulkExecute`, and make `onExecute` required again.<br>7. Render the territory path on 基本情報.<br>8. Remove the **[Phase 2 — Round 3]** tags from the three specs. |

## Round 2 status after the 2026-10-02 regen

The staged `openapi.real.json` regen (2026-10-02) closes these blockers. Their Round 2 backlog rows are delivered by `specs/026-store-management/tasks.md` (T008 and the per-story tasks):

| Blocker               | Status       | Closed by                                                                                                                                                      |
| --------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B3                    | **Resolved** | Nullable fields typed on Create/Update/BusinessHour/exception DTOs. `toNullableBody` removed (R203).                                                           |
| B4 (photos half)      | **Resolved** | `GET /admin/stores/{id}/images` + full-set `PUT …/images` (API-083 §19.2). Display via `/api/v1/media/assets/{s3Key}` is still to verify live (quickstart V4). |
| B4 (floor-map half)   | **Open**     | `gymMapS3Key` is still not a fetchable URL, and `PUT …/details` is unwired by user decision. The store-map-setup image is session-only.                        |
| B5                    | **Resolved** | `staffStartTime` / `staffEndTime` declared on the weekly DTOs (R205).                                                                                          |
| B6                    | **Resolved** | `payLaterEnabled` / `yogaUsageFee` on the mutual-use DTOs (R206). The PUT must always send both.                                                               |
| B7                    | **Resolved** | `MutualUsePartnerStoreDto.linkedAt` (R207).                                                                                                                    |
| B9                    | **Resolved** | Read/write gender enums agree (R209).                                                                                                                          |
| B11                   | **Resolved** | `CreateStoreDto.closedAt` (R211).                                                                                                                              |
| B12                   | **Resolved** | `CreateStoreDto.businessHours[]` (R212).                                                                                                                       |
| B2, B8, B10, B13, B14 | **Open**     | Unchanged. B13 keeps the edit form's hours read-only.                                                                                                          |

### New BE questions (2026-10-02, research.md)

1. ~~**R2 — status**~~ **Closed 2026-10-07 (user): follow the BE contract.**
   - What is the allowed status-transition matrix? The FE allows only 準備中→営業中 and 営業中⇄休業中.
   - `UpdateStoreDto.status` is documented `default: "preparing"`. Does a PATCH without `status` reset it? (quickstart V1, blocks the US2/US4 merge.)
2. ~~**R3 — holiday encoding**~~ **Closed 2026-10-07: an omitted row is 曜日どおり.** is an omitted `holiday` row the official 「曜日どおり」 (follow the weekday)? (V2)
3. ~~**R4 — special day**: there is no dedicated special-business-day type. 特別営業日 is sent as `exceptionType: "short_hours"`. Is that the intended mapping?~~ **Closed 2026-10-07 (user): follow the BE contract** — 特別営業日 = `short_hours`, no BE ask.
4. ~~**R6 — FIT365**~~ **Closed 2026-10-07: the schema says FIT365 ignores both fields.** a single `isAcceptEnabled` serves both どこでもJOY and the FIT365 相互利用オプション. Confirm that FIT365 ignores `payLaterEnabled` / `yogaUsageFee`.
5. ~~**R7 — media**~~ **Closed 2026-10-07 (user): follow the BE contract.**
   - Which roles may call `POST /media/presign` with `tag: "store-image"`, and which content types does it whitelist? (V3)
   - Does `/media/assets/{s3Key}` work from the CRM origin? (V4)
6. ~~**R11 — FC list**~~ **Closed 2026-10-05 (not FE scope).** `GET /admin/fc-companies` is HQ-only, so Manager/Staff cannot load the 運営企業 filter. Is there a facet endpoint, i.e. only companies with at least one store? Is franchise vs 業務委託 (entrustment) expressed by `managementType`?

## Round 2 status after the 2026-10-05 regen

The 2026-10-05 regen adds the Y-15 organisation API and the floor-map URL. Checking it against
the 2026-10-02 schema also showed that **B2, B8 and B10 were already closed by the 2026-10-02
regen**; the table above listed them as open by mistake.

| Blocker            | Status                              | What changed                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1                 | **API ready — not wired (Phase 2)** | `/admin/organization-nodes/**`, `territoryId` / `territoryName` / `areaId` / `areaName` on the list and detail DTOs, `territoryId` on Create/Update, `areaId` / `territoryId` list filters, `POST /admin/stores/bulk-territory-change`. R301 is no longer blocked by the BE, but it stays Round 3: Y-15 is Phase 2 (Q8).                                                                                                         |
| B2                 | **Resolved, wired (R202)**          | `changedByName` and `changes[]` (`field` / `before` / `after`). One line per changed field; `field` is labelled by `STORE_HISTORY_FIELD_LABELS` and values by `formatStoreHistoryValue` (`_utils/store-history.util.ts`); `fcCompanyId` is resolved to the company name. Entries with an empty `changes[]` (create, hours, plans, options, 1DayPass, mutual use) keep the `changeAction` label with `—` before/after.            |
| B4 (floor map)     | **Resolved, wired**                 | `StoreCmsDetailDto.gymMapUrl` (self-signed). The 店舗マップ tab and the setup screen read it; the setup screen uploads through `POST /media/presign` (`store-image`) and writes `PUT …/details` with the **whole** CMS row plus the new `gymMapS3Key` (`null` removes the image). The session-only store is gone.                                                                                                                |
| B4 (photos)        | Resolved                            | `StoreImageDto.url` is now documented as the fetchable URL (it already was live). Comment only.                                                                                                                                                                                                                                                                                                                                  |
| B8                 | **Mostly resolved, wired (R208)**   | Badge from `CampaignSummaryDto.acceptingStatus` (上限到達 now reachable). 割引概要 is composed by `buildCampaignDiscountSummary` from the plan / enrollment-fee / option discount fields, as the API asks. 募集期間 now reads `campaign.recruitmentStart/End` directly, so the brand campaign-master query is gone. **Still open:** 公開対象外 — `publishScope` says `specific_stores` but not whether this store is in the set. |
| B10                | **Resolved**                        | `PATCH /admin/stores/{id}` lets `staff` write `name` / `address` / `phone` on their own store. No FE change; comment updated.                                                                                                                                                                                                                                                                                                    |
| B14 (prefecture)   | **Resolved, wired**                 | Create/Update accept the JIS numeric code. The romaji write enum (`prefectureCodeToWireEnum`) is deleted; the form sends the code it reads back. Note: in this file B14 first named the 親オプション gap; `research.md` and the code reuse B14 for the prefecture write enum. The 親オプション column is no longer rendered.                                                                                                     |
| B3 (1DayPass note) | **Open**                            | Re-checked 2026-10-05: the read DTO `OneDayPassExceptionDto.note` is `string`, but the write DTO `SetOneDayPassExceptionDto.note` is still `type: object`. The cast in `one-day-pass-price-drawer.tsx` stays.                                                                                                                                                                                                                    |
| B13                | **Open**                            | `UpdateStoreDto` still has no weekly hours; the edit form's table stays read-only.                                                                                                                                                                                                                                                                                                                                               |
| R11                | **Closed — not FE scope**           | `GET /admin/fc-companies` is HQ-only, so Manager/Staff cannot load the 運営企業 filter. User decision 2026-10-05: no FE handling; QA reports it to the BE as a bug.                                                                                                                                                                                                                                                              |

**B8 — why a campaign can be linked to a store it is not published to.** Two separate settings,
both in G-03: 公開店舗設定 on the campaign (HQ: all stores, or a chosen set) and the store's
own link (which published campaigns the store uses). The spec expects them to drift apart — HQ
can narrow the published set after a store linked the campaign — so FR-041 / FR-042 keep that
link and mark it 公開対象外 instead of dropping it, and FR-043 blocks such a candidate in the
link panel. The BE neither exposes per-store publication (no store list on `CampaignDetailDto`,
no store filter on `GET /admin/campaigns`) nor checks it on `POST …/campaigns/{campaignId}` (it
checks store open, campaign exists, brand, duplicate). So the FE can neither show the marker
nor block the candidate, and the link endpoint accepts it. BE ask: a per-store publication flag
on `StoreCampaignDto` / the campaign list (or a `storeId` filter), and a publication check on
the link endpoint.

## Round 2 status after the 2026-10-07 regen

The 2026-10-07 regen is mostly type tightening (`number` → `integer`, `format: uuid` /
`date-time`, documented error codes). `tsc` is clean outside `.next/`. By the user's decision of
2026-10-07, **every Round 2 item except B8 and B13 is closed**, following the BE contract as
documented. **B13 was closed later the same day** by a further regen (see its row); only B8 remains.

| Item                       | Status                     | Notes                                                                                                                                                                                                                                                                                         |
| -------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B3 (1DayPass note)         | **Resolved, wired**        | `SetOneDayPassExceptionDto.note` is `string`. The last cast (`toNoteBody` in `one-day-pass-price-drawer.tsx`) is gone.                                                                                                                                                                        |
| B2 (history actions)       | **Resolved, wired**        | `changeAction` is now the 17-value enum. `STORE_CHANGE_ACTION_LABELS` is typed against it and gained `delete` / `restore` / `migrate` / `asset_assign` / `asset_unassign` / `territory_change`.                                                                                               |
| R2, R3, R4, R6, R7, R11    | **Closed**                 | Follow the BE contract; see research.md and the closed spec questions (detail Q7 / Q10–Q13 / Q15, form Q4).                                                                                                                                                                                   |
| B1                         | **Closed for Round 2**     | API ready; stays Round 3 (R301) because Y-15 is Phase 2 (Q8).                                                                                                                                                                                                                                 |
| B8 (公開対象外)            | **Open**                   | `StoreCampaignDto` unchanged; no per-store publication flag, no `storeId` filter on `GET /admin/campaigns`.                                                                                                                                                                                   |
| B13 (weekly hours on edit) | **Resolved, wired (R213)** | `UpdateStoreDto.businessHours` (full replace, same TX, `staff` allowed). The edit form's table is editable and rides the PATCH only when the table or 祝日の扱い is dirty; FR-044 validates only then; stored staff-on-site windows are carried through. `buildBusinessHoursPayload` deleted. |

Other schema changes, no FE change needed: `GET …/options` is now brand-filtered and `PUT …/options`
refuses a cross-brand option (`brand_mismatch`), so D9's "cross-brand OK" no longer holds;
`StoreOptionDto.usability` and the `addable` query flag are new; `PUT …/options` now returns
`StoreOptionSetItemDto` (unread by the FE); `brandGroup` is the enum `JOYFIT | FIT365`;
`closedAt` may be a future date (already shown as 閉店予定日).

## Round 2 status after the 2026-10-09 regen (BE MR !691, API-088)

MR !691 was not merged when this regen was taken; the live check waits for its deploy.

| Item                           | Status                                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 割引概要 column                | **Removed (commented out)**                                                   | `StoreCampaignDto.campaign` is now the plain list item (§3.3): the seven discount keys are gone; discounts live on `GET /admin/campaigns/{campaignId}`. Otaki (Q&A ①) confirmed the column is not in the FR. The column, the drawer's summary prefix and `buildCampaignDiscountSummary` are **commented out, not deleted**. FR-040 / PAR080 / TC Y-02-03C still list the column and need updating.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| B8 — 公開対象外 on linked rows | **Resolved, wired (FR-041)**                                                  | `StoreCampaignDto.isPublished` is computed for the path store. The marker and its tooltip (PAR083) render when `isPublished === false`; strict `false` so a BE without the field marks nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| B8 — link drawer candidates    | **Wired to `GET …/linkable-campaigns`; 公開対象外 wired (v0.12, 2026-10-12)** | The drawer reads `adminCampaignControllerListLinkableCampaignsInfiniteOptions` (API-088 §10a), typed `LinkableCampaignListItemDto`. The server returns this store's brand, not yet linked — **v0.12 returns campaigns not published to this store too, flagged `isPublished = false`**; 未紐づけのキャンペーン（N件） is its `pagination.totalItems` (both kinds); link/unlink invalidates both lists. `getBlockReason` in `campaign-bind-drawer.tsx` now renders such a row dimmed, not selectable, labelled 公開対象外 with the PAR083 tooltip (`CAMPAIGN_PUBLISH_EXCLUDED_TOOLTIP`, shared with the linked-row marker); strict `false`, so a BE without the field blocks nothing. ブランド対象外 stays commented out (other-brand campaigns are still excluded server-side) and 募集期間終了 stays off per the 2026-10-09 user decision (the BE accepts such a link, §11). The link endpoint still re-checks publication (422 `E-CMP-020`). |
| Error codes                    | **No FE change**                                                              | Link with a missing / closed store → 400 `E-VAL-001` (was 422). Store-campaign list with an unknown store id → 400 `E-VAL-001` (was 200 + `[]`). Nothing on the FE keyed on the old codes; the detail page already stops on `E-STR-001` before the tab loads. `E-CMP-010` / `E-CMP-020` stay 422.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
