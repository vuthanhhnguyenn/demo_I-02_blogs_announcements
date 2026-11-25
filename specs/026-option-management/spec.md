# Feature Specification: G-02 Option Master Management

**Feature Branch**: `feat/option-management`
**Created**: 2026-08-14
**Last Updated**: 2026-11-19 — **ladyroom**: G-02 `261107_v9` replaced 「エリア制限設定」 (`ladies_area` / `tanning_area` / `protein_bar` / `locker_area`) with 「利用できるエリア」 chosen from the E-02 FR-016 area master — see FR-010 and "Ladyroom — 利用できるエリア (2026-11-19)"; 2026-10-29 — price basis switched to **tax-inclusive**: the backend now stores `feeMonthly` tax-included (API-085 v0.12, BE MR !880 merged 2026-10-27), so the form takes 料金（税込）as the prototype and G-02 FR-002 do, sends it as-is, every surface shows the stored value, and only 税抜金額 on the detail is derived (`ceil`) — see FR-018 and "API Design Alignment"; 2026-10-07 — sort headers on the option list and the set-discount list use a three-state cycle (ascending → descending → cleared) instead of the prototype's two-state asc ⇄ desc, because the customer reported (Bug) that the option list could not return to the unsorted state while the main-contract list could; the newest-first 登録日 default now applies only to the first open, and a sort the user clears stays cleared (URL `sort_by=none`, no `sort` / `order` sent) — see FR-004 and "Set-Discount Alignment (G-02-02)"; 2026-10-01 — set-discount screens: list footer / sort-header alignment, long-text layout, list error + session-expiry handling, offline fail-fast on writes, 定額値引 has no upper bound (decision) — see "Set-Discount Alignment (G-02-02)"; 2026-09-25 — every option and set-discount screen moved from the mock API onto the real backend client (`src/lib/api-real`, dev Swagger 2026-09-23/24): "API Design Alignment" rewritten against the real contract, set-discount real-API decisions recorded, answered open questions closed; 2026-09-23 — re-aligned to prototype `0a73739` (2026-09-17), option and set-discount screens alike: 削除 removed from the option master (deactivate via 無効 instead), ロッカー契約種類 badge/card, 適用店舗 chip, 利用会員数 merged into 紐付け契約数, 店舗での利用 card, edit-mode brand lock, discard guard; 2026-08-18 — price basis switched to tax-exclusive (`feeMonthly`), resolving open question 3 per the customer's 2026-07-30 answer; 2026-08-14 — re-aligned to the latest prototype and to the backend API design document; set-discount (`G-02-02`) aligned in the same pass
**Status**: Draft
**PO Spec**: `G-02` — オプション管理 (incl. `G-02-01` オプション 新規登録, `G-02-02` セット割設定)
**Source**: `.cache/fitness-crm-ui/src/pages/option-list.tsx`, `option-detail.tsx`, `option-form.tsx`, `set-discount.tsx`, `set-discount-detail.tsx`, `set-discount-form.tsx` (prototype `0a73739`, 2026-09-17), `.cache/fitness-spec/crm/requirements/G-02.md` (`260731_v3`), dev Swagger `/docs-json` (snapshot `src/lib/openapi.real.json`, tags `Admin - Option Master (API-085)` and `Admin - Option Set Discount (API-086, FIT365 only)`); integration status per screen in `api-integration-output/option-*/report.md`
**Scope note**: this document's requirements, user stories and success criteria describe the option **master** screens (`/options`). The set-discount screens (`G-02-02`, `/option-discount`) keep their own implementation; they were brought in line with the same prototype revision in this pass, and only that alignment is recorded here — see "Set-Discount Alignment (G-02-02)".

**Conflict resolution rule**: when the prototype and the API design document disagree, the **prototype wins** and the deviation is recorded in "API Design Alignment" below. The price-entry basis no longer deviates: since 2026-10-29 the API stores `feeMonthly` tax-inclusive (API-085 v0.12), matching the prototype's 料金（税込） input and G-02 FR-002.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse and find options (Priority: P1)

As HQ or store-level staff, I can open the option list, search by option name, narrow by brand / type / status / proration / store, sort the sortable columns, and page through results.

**Why this priority**: the list is the entry point for every other option operation.

**Acceptance Scenarios**:

1. **Given** the list page is open, **When** it loads, **Then** the table shows ID, option name, brand, proration, type, service type, usability rule, price (tax-incl.), tax rate, accounting code, store count, registration date, and status, plus a row action menu holding 編集 only.
2. **Given** an option is a locker contract type (`category = locker_option`), **When** its row renders, **Then** a ロッカー契約種類 badge follows the name, with a tooltip naming its 契約形態コード.
3. **Given** the user types a keyword, **When** it matches an option name, **Then** only matching rows remain and a filter result banner reports "全 N 件中 M 件を抽出中" with the active conditions and a "条件をクリア" action.
4. **Given** the user opens 詳細フィルター, **When** brand / type / status / proration / store are selected, **Then** the list narrows, the filter button shows the active-filter count, and the page header badge keeps reporting the **unfiltered** total.
5. **Given** the header store switcher is on a store whose brand is not FIT365 (JOYFIT, JOYFIT24, JOYFIT+, JOYFIT YOGA), **When** the header actions render, **Then** the セット割設定 button is hidden, and opening `/option-discount` (or its create / detail / edit pages) directly sends the user back to `/options` (G-02 FR-006: set discounts are FIT365-only). On a FIT365 store, or on "全店舗（本部）" (no single brand), the button shows and the screens open. The page's own ブランド filter never decides this.
6. **Given** no row matches, **When** the table renders, **Then** an empty state is shown with a way to clear the conditions.

---

### User Story 2 - Register and edit an option master (Priority: P2)

As HQ / System staff, I can register a new option and edit an existing one from the dedicated form screen.

**Acceptance Scenarios**:

1. **Given** the create form is open, **When** required fields (brand, option name, option category, price tax-excl., tax rate) are filled, **Then** the option is created and the user returns to the option list.
2. **Given** the brand FIT365 is selected, **When** the selection is applied, **Then** the proration flag switches ON automatically (G-02 FR-002: FIT365 options are configured with the proration flag ON).
3. **Given** any option type is selected, **When** the オプション種別 section renders, **Then** an optional サービス種別 select (marked 任意, defaulting to 設定しない) appears below the radio group and stays visible for 通常 / 都度 / 自動付与 alike.
4. **Given** the proration flag is ON, **When** the price section renders, **Then** a 日割り計算方式 select appears and is required.
5. **Given** the user submits with missing input, **When** validation fails, **Then** the first invalid field is scrolled into view and the footer reads 「未入力の項目があります」.
6. **Given** the edit form is open, **When** it renders, **Then** ブランド is disabled with the note 「登録後はブランドを変更できません（変更が必要な場合は無効化のうえ新規登録）」, the ID hint reads 「オプションIDは変更できません」, and the submit button reads 「変更を保存する」.
7. **Given** the form has unsaved changes, **When** the user clicks キャンセル or the back link, **Then** the 「変更を破棄しますか？」 dialog asks for confirmation.

---

### User Story 3 - Review an option and its change history (Priority: P3)

As HQ or store-level staff, I can open an option detail page to review every registered attribute read-only, see its usage figures, and read its change history.

**Acceptance Scenarios**:

1. **Given** a row is opened, **When** the detail page loads, **Then** the 基本情報 tab shows 基本情報 / 料金情報 / オプション種別・利用可否 / 制約設定 / 利用できるエリア / 会員公開設定 cards on the left and status, 利用状況 and その他情報 cards on the right.
2. **Given** any option is opened, **When** the type card renders, **Then** the サービス種別 field is rendered whatever the 課金種別, showing 「―」 when unset.
3. **Given** the proration flag is OFF, **When** the price card renders, **Then** the 日割り計算方式 field is not rendered.
4. **Given** the 変更履歴 tab is opened, **When** entries exist, **Then** each row shows timestamp, actor, changed field, before and after values.
5. **Given** any option is opened, **When** the header renders, **Then** the only action is 編集 — there is no 削除 (an option is retired by switching it to 無効).
6. **Given** a locker contract type is opened, **When** the page renders, **Then** the header carries a ロッカー契約種類 badge, the usage row reads 紐付け契約数（割当スロット）, and a ロッカー契約種類 card shows the 契約形態コード with a link to ロッカー管理.
7. **Given** a single store is picked in the header store switcher, **When** the detail renders, **Then** a 店舗での利用 card links to that store's 契約・料金 tab; in the 全店舗 view the card is hidden.

### Edge Cases

- Search / filters produce zero rows.
- Current page exceeds total pages after a page-size or filter change.
- An option with no store scope at all renders `―` in the store column rather than `0店舗`.
- An unauthorized role opens the create / edit affordances.
- The member-app image is unset on the detail screen.
- The option id in the URL does not exist (`404 E-OPT-001`): detail and edit show 「オプションが見つかりません」 instead of a network error with 再試行.
- A tier-2 option (レッスンプラン / 1DayPass / 1TimePass) is edited: オプション分類 is locked, since the API rejects any `category` change on it (`422 E-OPT-009`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001 (List Rendering)**: System MUST render the option list with columns オプションID, オプション名, ブランド, 日割り, 種別, サービス種別, 利用可否, 料金(税込), 税率, 会計コード, 店舗, 登録日, 状態 and a row action menu holding 編集 only. A locker contract type (see FR-019) carries a ロッカー契約種類 badge after its name. The 店舗 column MUST report the **applied store count** (`{n}店舗`, `―` when unset), never a scope name such as 「全店舗」. The page header badge and the filter banner's 全 N 件 MUST show the unfiltered total, read from `pagination.totalAllItems` (the list sends `includeTotalAll=true`). The セット割設定 header button MUST be hidden whenever the **header store** belongs to a brand other than FIT365 (G-02 FR-006 「FIT365のみ」 — this covers Joyfit / Joyfit24 / JoyfitYoga / JoyfitPlus, which the prototype's JOYFIT/FIT365 pair does not distinguish). The brand comes from the store picked in the header switcher (`brandEnum` of the current store), **not** from the list's ブランド filter: the prototype keys the button off its brand filter only because it has no header store context, and the list itself is not scoped by the header store. "全店舗（本部）" has no single brand, so the button stays visible there. While the brand is still being resolved (e.g. right after a reload) the button stays hidden, so it never flashes up for a JOYFIT-family store.
- **FR-002 (Search and Filter)**: System MUST support keyword search on the **option name only**, plus brand, option type, service type (サービス種別), status, proration-flag and store filters inside a collapsible 詳細フィルター panel, with a "すべてクリア" action. (G-02 FR-S001.)
- **FR-003 (Filter Result Banner)**: When any search or filter is active, System MUST show a banner inside the table card stating the unfiltered total, the filtered count and the active-condition summary, with a "条件をクリア" action.
- **FR-004 (Sorting and Pagination)**: System MUST support sorting on オプション名, 料金(税込) and 登録日 only (G-02 FR-S001 「ソート軸: オプション名・料金・登録日」, confirmed in qa-108; API `sort` = `name` / `feeMonthly` / `createdAt`); the remaining columns are display-only. The prototype sorts ID / 税率 / 状態 and has no 登録日 column — recorded in `api-integration-output/prototype-gap-list.md`. The list MUST default to 登録日 descending (`sort=createdAt`, `order=desc`) so a just-registered option shows at the top instead of the API's fixed brand-grouped order (G-02 Bug No9); the 登録日 header shows that default as its active sort (descending), and 条件をクリア resets to it. The default applies only on first open (no `sort_by` in the URL). Every sortable header MUST cycle through three states — first click ascending, second click descending, third click clears the sort (tooltip 「クリックで解除」): the list is then unsorted (the API's own order, no `sort` / `order` sent, URL `sort_by=none`, every header neutral) and does NOT snap back to 登録日 descending — like the main-contract list; the prototype's two-state cycle (asc ⇄ desc, no way back) is a prototype-side difference and is not followed. 登録日 needs no special case: from the default (descending) the clicks go cleared → ascending → descending → cleared. Pagination MUST offer page navigation and page-size selection.
- **FR-005 (Set-Discount Entry Point)**: The list toolbar MUST expose a セット割設定 button that navigates to `G-02-02`, gated by permission and **hidden when the header store's brand is not FIT365** (G-02: set discounts exist for FIT365 only; see FR-001 and FR-021).
- **FR-006 (Create Option)**: System MUST provide a create form with required fields (ブランド, オプション名, オプション分類, 料金（税込）, 税率) and optional fields (会計コード, 備考, 会員公開用画像, 日割り計算方式, サービス種別, 制約設定, 利用できるエリア, ステータス). オプションID is displayed read-only as auto-numbered (`optionCode`, e.g. `OP-0009`). 会員公開用画像 is uploaded after the option is created (presign → PUT to storage → `POST …/{optionId}/images`); on edit a replacement is registered first and the previous images are deleted only after it succeeded, so a failed upload keeps the current image. A failed image upload — presign refused, storage refused, or no network answer — always raises one error toast 「画像のアップロードに失敗しました」 (create: after the 「オプションを登録しました」 toast, then back to the list, the image can be added from edit; edit: no success toast, the form stays open); a failure of the image registration or deletion API is toasted by the app-wide API error handler. Accepted files are JPEG / PNG up to 100 MB: the format follows the prototype's 「JPG/PNG」 hint and the app's other image uploaders (G-02 sets no format; WebP removed 2026-10-05), the size is the presign API's limit (`fileSize` ≤ 100 MB) since G-02 and the prototype set no lower one; 800×600px stays a recommendation, not a restriction. The format is checked against the file's actual content (leading bytes / magic number), not only its extension or browser-reported type, so a non-image file renamed to `.png` / `.jpg` is refused with the same 「JPG / PNG 形式の画像を選択してください」 message (Bug-No14, 2026-10-07).
- **FR-007 (Proration Flag)**: The proration flag MUST be presented as an OFF/ON switch labelled 日割りフラグ, explaining (G-02 FR-002 `260928_v4`) that every option's start date is 「今日から」 or 「翌月から」 (no arbitrary date), that ON applies proration when 「今日から」 is chosen, and that OFF bills the full month even for 「今日から」. Selecting brand FIT365 MUST turn it ON. When ON, 日割り計算方式 (日割り計算（日数按分） / 固定金額) is offered but optional — G-02 FR-002 does not mark it required and `prorationMethod` is optional on the API; left unset, create takes the API default `proration` and edit keeps the stored method.
- **FR-008 (Billing Type and Service Type)**: 課金種別 MUST be a single required 3-way choice: 通常オプション / 都度オプション / 自動付与オプション. **サービス種別** (プロテイン / サプリメント / 日焼け / コラーゲン / 水素水 / 体組成計 / シャワー) is a **separate, optional** axis (G-02 FR-002, `260731_v3`): it MUST be settable whatever the 課金種別 — 通常 / 都度 / 自動付与 alike, per the prototype of 2026-09-03 — and the same サービス種別 MUST be allowed on several options across billing types (e.g. 水素水（月額）= 通常 × HydrogenWater and 水素水（都度）= 都度 × HydrogenWater). Options with no equipment behind them (ロッカー等) stay unset.
- **FR-009 (Usability Rule)**: The usability rule MUST be a 4-way choice: 利用不可 / 追加・解約のみ可能 / 追加・解約・変更すべて可能 / 変更・解約のみ可能 (G-02 FR-005).
- **FR-010 (Constraints and Available Areas)**: System MUST provide a 主オプション契約変更可否 switch (`isChangeableOnPlanChange`) and show 変更可否 **read-only**, derived from the usability rule (ON for 追加・解約・変更すべて可能 / 変更・解約のみ可能) — the API has no field to store it separately, so the prototype's toggle cannot be persisted (handed to the prototype, `api-integration-output/option-form/report.md`). _(Revised 2026-11-19, G-02 `261107_v9`)_ It MUST also provide 「利用できるエリア」 (optional, multiple) chosen from the E-02 FR-016 area master, limited to the option's brand group, with the resulting sale condition shown on the form and the detail — see "Ladyroom — 利用できるエリア (2026-11-19)". The former エリア制限 checkbox group (レディースエリア / タンニングエリア / プロテインバー / ロッカーエリア, #62) is **removed**.
- **FR-011 (Status)**: System MUST provide a 無効/有効 switch on the form (on edit, saved by a separate `PATCH …/{optionId}/active` after the field update — qa-193 / qa-195), and show the resulting status as a badge on the list, the detail header and the detail status card.
- **FR-012 (Edit Option)**: System MUST allow editing every create-form field **except ブランド**, which is locked once registered (G-02 dev answer: one option = one brand; a brand change means deactivating and registering anew). An amber notice MUST warn — on edit only — that changing price or applicable conditions also affects members currently using the option (create mode hides it: a new option has no members yet; deliberate deviation from the prototype, which shows it in both modes — user decision 2026-10-05). The edit submit button reads 「変更を保存する」. Leaving a dirty form (キャンセル / back link) MUST go through the 「変更を破棄しますか？」 confirmation.
- **FR-013 (Detail View)**: System MUST provide a detail page with 基本情報 and 変更履歴 tabs. 基本情報 shows every FR-006 attribute read-only, including 適用店舗 (count plus the store chip, or 「適用店舗がありません」 when no store has picked the option in its own sales setting — 適用店舗 is the set of stores that selected the option (Y-02 FR-003), so empty never means 'all stores'; reviewer k.iwaki, 2026-10-09), both tax-inclusive and tax-exclusive prices, and a 会員公開設定 card with 説明文 and 会員公開用画像 (placeholder when unset).
- **FR-018 (Price Basis)**: The form MUST capture the **tax-inclusive** fee 料金（税込）(placeholder 1100; 0 円以上・整数9桁, per 共通入力・バリデーション仕様) and send it as `feeMonthly` unchanged — the API stores it tax-inclusive (API-085 v0.12; `OptionDetailDto` / `CreateOptionDto` documented "Tax-included" in the dev Swagger since 2026-10-27). The list column 料金(税込), the detail field 月額料金（税込） and the edit-form prefill show `feeMonthly` as stored; the detail 税抜金額 is derived as `ceil(税込 × 100 / (100 + 税率))` (`toTaxExcludedPrice`), the reverse formula the API documents. The 変更履歴 field label is 月額料金（税込）— the API serves older snapshots converted to 税込. (Supersedes the 2026-07-30 tax-exclusive basis.)
- **FR-014 (Usage Figures)**: The detail page MUST show 紐付け契約数 — labelled 紐付け契約数（現在の契約者数）, or 紐付け契約数（割当スロット） for a locker contract type — and 人気ランキング (rank plus the option-count denominator) only when a rank exists. There is no separate 利用会員数 row: G-02 FR-002/FR-003 define 紐付け契約数 as the current contractor count.
- **FR-015 (Change History)**: The 変更履歴 tab MUST list 更新日時, 操作者, 変更フィールド, 変更前 and 変更後 (G-02 FR-007), read from `GET …/{optionId}/history?page={n}&limit=20`, newest first. The tab MUST page through the full history: a 前へ / 次へ pager with the 「全 N 件中 a-b 件を表示」 summary (from `pagination.totalItems`) sits under the table whenever the option has at least one event, the previous page stays on screen while the next loads (no skeleton flash), and no event is unreachable because of a fixed limit (reviewer k.iwaki, 2026-10-09 — the prototype has no pager, but the API pages and a hard-coded cap would hide older events). Each event is split into one row per changed field of its `diff`; a `created` event reads 「新規作成」, an image event follows `metadata.action`, and an empty `changedByName` renders `―`. Read-only — no create/update/delete controls. A role the endpoint refuses (`403`) sees an error state, not an empty table.
- **FR-016 (No Delete)**: The option screens MUST NOT offer 削除 — neither on the list row menu nor on the detail header. G-02 has no delete FR (the permission matrix covers register / edit only); an option is retired by setting it to 無効 (FR-011).
- **FR-019 (Locker Contract Type — E-01 linkage)**: An option whose functional `category` is `locker_option` is a locker contract type: the locker screens offer exactly these as a slot's 契約形態コード, keyed by the option code (`optionCode`, G-02 L132 / L260). Such an option MUST show a ロッカー契約種類 badge on the list row and the detail header, and the detail MUST add a ロッカー契約種類 card with the 契約形態コード (`optionCode`), the explanation that slots reference it and the price is owned by the option, and a link to ロッカー管理.
- **FR-020 (Store Usage Guidance)**: When a single store is picked in the header store switcher, the detail MUST show a 店舗での利用 card that only points to that store's detail 契約・料金 tab (`/stores/{id}?tab=contract`). It makes no in-use judgement (the store detail owns it) and is hidden in the 全店舗 view.
- **FR-021 (Set-Discount Brand Guard)**: The set-discount screens (`/option-discount`, `/option-discount/create`, `/option-discount/[id]`, `/option-discount/[id]/edit`) MUST NOT be reachable while the header store's brand is not FIT365 (G-02 FR-006「JOYFIT では G-02-02 画面は表示しない」): the user is redirected to `/options` and a loading view shows until the brand is known. A FIT365 store and "全店舗（本部）" are allowed. Implemented by `option-discount/layout.tsx` on top of `useCurrentStoreBrand()`.
- **FR-017 (Role-Gated Actions)**: 新規登録 / 編集 / セット割設定 MUST be permission-gated per the G-02 permission matrix (register & edit: System / Headquarter only; list & detail: also Manager / Staff read-only).

### Key Entities _(include if feature involves data)_

Field names are those of the real API DTOs (`OptionListItemDto` / `OptionDetailDto`), used directly by the screens.

- **Option Master**: `id` (uuid), `optionCode` (オプションID / 契約形態コード), `name`, `brandEnum`, `category` (オプション分類), `optionType`, `paymentType` + `isAutoAssigned` (write-side form of `optionType`), `subcategory`, `usability`, `feeMonthly` (tax-inclusive, stored; 税抜 derived with ceil), `taxRate` (8 / 10), `isProration`, `prorationMethod`, `accountCode`, `description` (備考), `publicDescription` (説明文), `primaryImageUrl` / `images[]`, `isChangeableOnPlanChange`, `areaRestrictions[]`, `isActive`, `storeCount` / `storeNames[]`, `activeContractCount`, `popularityRank` / `popularityRankOf` (detail only), `monthlySessionCount` (not used), `createdAt` / `createdBy`, `updatedAt` / `updatedBy`.
- **Option Category (オプション分類)**: tier-1, selectable — `supplement` サプリメント / `drink` ドリンク / `rental` レンタル / `locker_option` ロッカー / `insurance` 保険・保証 / `service` サービス; tier-2, display only and locked on edit — `lesson_plan` レッスンプラン / `oneday_pass` 1DayPass / `one_time_pass` 1TimePass.
- **Option Type (課金種別)**: `regular`（通常） / `per_use`（都度） / `auto_assigned`（自動付与）.
- **Option Subcategory (サービス種別)**: `protein` / `supplement` / `tanning` / `collagen` / `hydrogen_water` / `body_planner` / `shower`, nullable.
- **Usability Rule**: `unavailable` / `add_cancel_only` / `full` / `change_cancel_only`.
- **Proration Method**: `proration`（日割り計算） / `fixed`（固定金額）.
- **Available areas (利用できるエリア, 2026-11-19)**: `areaIds[]` (E-02 FR-016 area ids of the option's brand group; `[]` = none), `areas[]` (resolved `id` / `areaCode` / `name` / `genderCondition`, a deleted area dropped) and the derived `genderCondition` (`none` / `female_only` / `male_only` / `nobody`) — who the option may be sold / granted to. Replaces the former `areaRestrictions` (`ladies_area` / `tanning_area` / `protein_bar` / `locker_area`).
- **Change History Event**: `eventType`, `changedBy`, `changedByName`, `changedAt`, `diff`, `snapshot`, `metadata` — rendered one row per changed field.

### Traceability Matrix (UI -> Source Requirement)

| UI Element / Behavior                                             | Source Requirement (G-02) | Phase 1 Inclusion                                                                                       |
| ----------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| List table with option attributes and store count                 | FR-001                    | In Scope                                                                                                |
| Keyword search + brand/type/status/proration/store filters        | FR-S001                   | In Scope                                                                                                |
| Filter result banner with condition summary                       | FR-S001 related           | In Scope                                                                                                |
| Column sorting (name, price, registration date)                   | FR-S001                   | In Scope                                                                                                |
| セット割設定 button (hidden unless header store is FIT365)        | FR-006                    | In Scope (navigation only; G-02-02 owns the screens)                                                    |
| `/option-discount*` blocked for non-FIT365 header stores          | FR-006                    | In Scope (route guard, redirects to `/options`)                                                         |
| Create / edit form with every FR-002 field                        | FR-002 / FR-004           | In Scope                                                                                                |
| 料金（税込）entry, stored as entered; derived 税抜金額            | FR-002 (API-085 v0.12)    | In Scope                                                                                                |
| 日割りフラグ + FIT365 auto-ON                                     | FR-002                    | In Scope                                                                                                |
| 課金種別 (通常/都度/自動付与) + サービス種別 (任意・全種別)       | FR-002 (`260731_v3`)      | In Scope                                                                                                |
| 利用可否ルール 4 choices                                          | FR-005                    | In Scope                                                                                                |
| 制約設定 / 利用できるエリア (2026-11-19, replaces エリア制限設定) | FR-002 (`261107_v9`)      | In Scope                                                                                                |
| Detail read-only view of every FR-002 field + 紐付け契約数        | FR-003                    | In Scope                                                                                                |
| 人気ランキング on the usage card                                  | FR-002 (補足)             | In Scope                                                                                                |
| ロッカー契約種類 badge + detail card                              | L132 / L260 (E-01 連携)   | In Scope                                                                                                |
| 適用店舗 chip on the detail                                       | L173                      | In Scope                                                                                                |
| 削除                                                              | — (no FR)                 | Out of Scope — retire via 無効                                                                          |
| 変更履歴 tab                                                      | FR-007 (Should)           | In Scope (real `/history`, read-only)                                                                   |
| サービス種別 column on the list                                   | FR-001 (`260731_v3`)      | In Scope                                                                                                |
| サービス種別 as a filter axis                                     | FR-S001                   | In Scope — API `subcategory`; not in the prototype yet (`api-integration-output/prototype-gap-list.md`) |
| OR-based device gating on サービス種別                            | FR-002 (`260731_v3`)      | Out of Scope — owned by E-02 店舗機器管理                                                               |
| Set discount definition / discount rules                          | FR-006                    | Out of Scope (owned by `/option-discount`)                                                              |

### Out of Scope for Phase 1

- Set-discount definition and rules (`G-02-02`) — a separate screen set under `/option-discount`.
- Per-option store assignment UI: the store scope of an option is `Y-02 販売設定`'s responsibility; the option screens only display the applied store count.
- Multiple member-app images (`images[]` / `sortOrder` / `caption`) — the prototype has one image slot.
- `monthlySessionCount` (lesson-plan session quota) — no such field in the prototype.
- Date-range filtering of the change history (`from` / `to` exist on the API; the tab pages through every event, see FR-015).

### Known non-defects (do not file as bugs)

| Observed behaviour                                                                                                 | Why it is not a defect                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyword search matches オプション名 only; typing a code (e.g. `PRO-001`) returns no rows.                          | The prototype placeholder reads 「オプション名で検索」 and the API design document's `keyword` is "case-insensitive partial match on **name**".                                     |
| There is no editable コード field; the form's ID box and the detail's 契約形態コード both show the same `OP-xxxx`. | The option code is `optionCode`, auto-numbered by the backend and immutable; the prototype shows it as オプションID, and a locker contract type's 契約形態コード is that same code. |
| The store column shows a count (`12店舗`), never 「全店舗」.                                                       | Prototype `store-scope-count.tsx`: the column renders `storeCount` as is; resolving "all stores" would need a store-master comparison.                                              |
| The 人気ランキング footer sentence (「Wi-Fi利用（1位）…に次ぐ人気オプション」) is not rendered.                    | It is hard-coded mock copy in the prototype; no API field backs it.                                                                                                                 |

### UI Alignment with the Latest Prototype (2026-09-17, `0a73739`)

**Removed (present in code, absent from the prototype) — 2026-09-17 pass**

- 削除 on the list row menu and the detail header (and the ⋯ menu that only held it), with `option-delete-dialog.tsx` and its member/contract guardrail tooltip.
- The 利用会員数 row on the detail 利用状況 card.
- The generic footer 「現在の利用状況をもとに表示しています。」 on the 利用状況 card.
- The 人気ランキング row when no rank exists (it used to render 「―」).

**Added / changed — 2026-09-17 pass**

- List: ロッカー契約種類 badge + tooltip after the option name for `locker_option` rows.
- Detail: ロッカー契約種類 header badge and card (契約形態コード + ロッカー管理 link); 紐付け契約数 labelled （現在の契約者数） / （割当スロット）.
- Detail: 適用店舗数 → 適用店舗, with the store chip or the 全店舗 note.
- Detail: 店舗での利用 card while a single store is picked (store detail now honours `?tab=`).
- Form (edit): ブランド disabled with its note; ID hint 「オプションIDは変更できません」; submit 「変更を保存する」.
- Form: 「変更を破棄しますか？」 discard guard on キャンセル / back link (shared `useUnsavedChanges` + `DiscardChangesDialog`).
- Form: the impact warning is shown in create mode too (the code had drifted to edit-only).

### UI Alignment with the Prototype (2026-09-03)

**Removed (present in code, absent from the prototype)**

- The コード column, the コード detail field and the required コード form input.
- The 利用会員数 list column (and its sort affordance).
- Sorting on コード and 利用会員数.
- The 対象店舗範囲 detail field (a sentence such as 「全店舗（12店舗）」), replaced by 適用店舗数 as a count.
- The standalone 説明 card that only appeared when a description existed.
- Explanatory sub-text under 追加・解約のみ可能 / 追加・解約・変更すべて可能 / 変更・解約のみ可能 — the prototype explains only 利用不可.

**Added / changed**

- List: a 日割り filter (日割り: すべて / 日割りあり / 日割りなし).
- List: a filter result banner inside the table card, and a page header badge that reports the unfiltered total.
- List: セット割設定 is hidden while the header store's brand is not FIT365 (2026-10-07: was keyed off the page's ブランド filter, so choosing a JOYFIT store in the header left the button visible).
- List: the 店舗 column uses the shared `StoreScopeCount` component.
- List/detail: サービス種別 renders its Japanese label (プロテイン …) instead of the raw seed string (`Protein` …), and the list carries it as a column of its own next to 種別 (prototype 2026-09-03).
- Detail: 基本情報 now carries オプション分類 and 適用店舗数; 料金情報 labels the tax-inclusive price 月額料金（税込） and the tax-exclusive one 税抜金額 (they were swapped before). Of the two, 税込 is the stored fee and 税抜 the derived figure (since 2026-10-29) — see FR-018.
- Detail: 日割り計算方式 is rendered conditionally; サービス種別 always renders (「―」 when unset).
- Detail: a 会員公開設定 card with 説明文 and 会員公開用画像 (dashed 未設定 placeholder when empty).
- Detail: the status card meta shows only 更新 (creation stays in その他情報); 人気ランキング shows the `/ N オプション中` denominator.
- Form: the impact warning is shown in both create and edit mode.
- Form: 日割り要否 renamed 日割りフラグ with OFF/ON wording and the prototype's explanation; selecting FIT365 turns it ON.
- Form: option-type radio labels carry the オプション suffix (通常オプション …).
- Form: the usability footer note explains the ON/OFF start-date difference.
- Form: 「未入力の項目があります」 appears in the footer after a failed submit.

**Deliberately different from the prototype (confirmed contract wins)**

- ~~The form captures 料金（税抜）where the prototype captures 料金（税込）.~~ Resolved 2026-10-29: the form captures 料金（税込）like the prototype — see FR-018.

**Kept deliberately (project convention overrides the prototype)**

- Brand is rendered with the shared `BrandBadge` on the detail screen (the prototype prints plain text) — consistent with the list and with every other master screen.
- Success/failure toasts and query invalidation on mutations, which a static prototype has no need for.

### API Design Alignment

Checked against the backend dev Swagger UI (`/docs-json`, 2026-09-23; snapshot `src/lib/openapi.real.json`), tag `Admin - Option Master (API-085)` (`AdminOptionController_*`). The retired Redoc mirror kept in `.cache/api/_archive-design-doc/` is used only to tell "designed but not yet published" gaps from missing ones.

Every option screen now calls the real client (`src/lib/api-real`) and reads the DTOs directly — camelCase field names and the API's own enum literals, with no mapping layer. The mock `/crm/options` routes are left in place, but no option screen calls them any more. Per-screen status, open backend items and the evidence of the live calls are kept in `api-integration-output/option-list/`, `option-detail/` and `option-form/report.md`.

| Screen / action               | Endpoint                                                         |
| ----------------------------- | ---------------------------------------------------------------- |
| List (search / filter / sort) | `GET /api/v1/admin/options`                                      |
| List — store filter picker    | `GET /api/v1/admin/stores`, `GET /api/v1/admin/stores/{id}`      |
| Detail — 基本情報             | `GET /api/v1/admin/options/{optionId}`                           |
| Detail — 変更履歴             | `GET /api/v1/admin/options/{optionId}/history`                   |
| Create                        | `POST /api/v1/admin/options`                                     |
| Edit — load / save            | `GET` then `PATCH /api/v1/admin/options/{optionId}`              |
| Edit — status switch          | `PATCH /api/v1/admin/options/{optionId}/active` (`{ isActive }`) |
| 会員公開用画像                | `POST /api/v1/media/presign` → `POST …/{optionId}/images`        |

List query mapping: `keyword` (option name only, ≤ 50 chars), `brandEnum`, `optionType`, `subcategory`, `isActive`, `isProration`, `storeId`, `sort` (`name` / `feeMonthly` / `createdAt`) + `order`, `page` / `limit` (≤ 100). Filter state lives in the URL (nuqs).

Behaviour adopted from the document:

- **`feeMonthly` is tax-inclusive, and that is the stored fee** (API-085 v0.12, BE MR !880 merged 2026-10-27; existing rows converted by contracts migration 050 as `floor(税抜 × (100 + 税率) / 100)`) — the form input is 料金（税込）and is sent as-is; no surface adds tax. The only derived figure is the detail's 税抜金額 = `ceil(税込 × 100 / (100 + 税率))` (`toTaxExcludedPrice`, `src/utils/tax.util.ts`). The API sorts `feeMonthly` on the stored tax-inclusive value. This replaces the tax-exclusive basis of 2026-07-30.
- `taxRate` is required and limited to `{8, 10}` (G-02 FR-002; backend fixed under qa-109).
- 課金種別 is displayed from `optionType` (`regular` / `per_use` / `auto_assigned`) and written as `paymentType` + `isAutoAssigned` (`auto_assigned` = `monthly_billing` + `isAutoAssigned: true`).
- `subcategory` is optional for every `paymentType`: the backend dropped the old `E-OPT-002` cross-check (G-02 FR-002 `260731_v3`, PO 2026-08-29).
- ~~`areaRestrictions` is an array; an empty selection is sent as `null` (制限なし).~~ Superseded 2026-11-19: `areaIds` is an array of distinct area ids of the option's brand group; `[]` clears; unknown / other-brand id → 400 `E-VAL-001` (`areaIds.N`).
- `description` is 備考 (internal) and `publicDescription` is 会員公開設定 > 説明文 (split by the backend under qa-110).
- `category` is sent on update only when it changed — a tier-2 option rejects any `category` (`422 E-OPT-009`).
- `isActive` is not part of `UpdateOptionDto`; saving an edit is `PATCH` followed by `PATCH /active` when the status switch changed (qa-193, accepted by the customer in qa-195). There is no delete endpoint (qa-195) — see FR-016.
- `storeCount` / `storeNames` feed the 店舗 column and the 適用店舗 chips; `activeContractCount` feeds 紐付け契約数; `popularityRank` / `popularityRankOf` feed 人気ランキング (detail only).
- Errors surface the API's `userMessage` through `resolveApiErrorMessage`; `404 E-OPT-001` renders the not-found state.

Deliberate deviations (prototype, customer answer or project convention wins):

| Topic          | API                                               | Implemented                                                        | Reason                                                                                                                 |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Price basis    | `feeMonthly` is tax-inclusive (API-085 v0.12)     | Followed — matches the prototype's 料金（税込）input               | Since 2026-10-29 (was tax-exclusive from 2026-07-30). List / detail show the stored value; 税抜金額 derived with ceil. |
| 変更可否       | No field on `CreateOptionDto` / `UpdateOptionDto` | Read-only, derived from `usability`                                | The prototype's toggle cannot be stored; handed to the prototype (`post-options/_tracking.md`).                        |
| Change history | One event per mutation with a `diff` object       | One table row per changed field                                    | The prototype's history table is one row per field.                                                                    |
| Sort axes      | `sort` = `name` / `feeMonthly` / `createdAt`      | Followed — the prototype's ID / 税率 / 状態 sorting is not offered | qa-108; prototype gap `#12`.                                                                                           |

Open backend items: none as of the dev Swagger of 2026-09-30 — `includeTotalAll`, the string-typed `description` / `accountCode`, the option-image upload tag and the image delivery URLs are all published, and the screens use them.

### Ladyroom — 利用できるエリア (2026-11-19)

**Sources**: `G-02.md` `261112_v15` FR-002 (the `261107_v9` row redefines 「エリア制限設定」 as 「利用できるエリア」), 前提条件, 関連機能; `E-02.md` `261109_v6` FR-008 / FR-016 (`fitness-spec@9e0e07e`); prototype `dx-fitness/fitness-crm-ui@9428dc2` (design PR #42, 11/12 — `option-form.tsx`, `option-detail.tsx`, `components/available-areas.tsx`); API-085 `CreateOptionDto` / `UpdateOptionDto.areaIds`, `OptionDetailDto.areas` / `genderCondition`. The area master is [029/009-area-master](../029-equipment-management/009-area-master/spec.md).

- **What it is**: the areas behind an エリア扉 that a member with this option may open (E-02 FR-008). It is **not** a 販売店舗 filter (that stays 店舗フィルター・対象店舗範囲). An area with a 性別の条件 also limits who the option may be **sold / granted** to — only 女性 matches 女性のみ, only 男性 matches 男性のみ; その他 / 回答しない / 未設定 match neither (「アプリ・CRMとも」). The sale gate itself is enforced on the member screens (032 会員詳細), not here.
- **Form**: the 制約設定 card keeps only the 主オプション契約変更可否 / 変更可否 controls; a separate card 「利用できるエリア」 follows it (before ステータス) with the link 「エリアマスタ管理を見る」 (through the discard dialog when dirty) and the description 「選んだ{ JOYFIT の}館内エリアの扉を、このオプションが有効な会員が開けられます」. No ブランド → 「ブランドを選ぶと、そのブランドのエリアから選べます」; otherwise one checkbox per area of the brand group (JOYFIT sub-brands share the JOYFIT areas), each 女性のみ / 男性のみ area with an outline badge; a brand group with no area → 「{brand} のエリアはまだ登録されていません」. Optional — 0 areas is valid.
- **One status line under the checkboxes** (priority top-down): conflict alert → removed notice → result line.
  - Result: 「{女性}のみのエリアを含むため、このオプションは{女性}の会員にだけ販売・付与されます（アプリ・CRM とも）」.
  - Conflict (alert 「性別の条件が合いません」): 「女性のみと男性のみのエリアを両方選んでいるため、どの会員にも販売・付与できません」 — options have no 性別制限, so this is the only conflict. **Saving is not blocked** (prototype); the API derives `genderCondition: nobody`.
  - Brand change on create (ブランド is locked on edit, FR-012): inside the JOYFIT group the selection stays; JOYFIT ⇄ FIT365 clears it with 「ブランドを {brand} に変えたため、選んでいたエリア（{names}）を外しました」; ticking an area clears the notice.
- **Detail**: the card 「制約設定」 (no area content) is followed by 「利用できるエリア」 — one row per area (name + badge), 「設定なし」 when empty, then the result or conflict line (verb 「含む」).
- **API**: `areaIds` must be distinct ids of the option's brand group — unknown / other-brand → 400 `E-VAL-001` (`areaIds.N`); `[]` clears.
- **Superseded here**: FR-010's エリア制限 checkbox group, the `Area Restriction` entity and the `areaRestrictions` API note (struck through above); the 026 test plan rewrites the TC docs' TC-022 / TC-042 (G-02-B) and TC-018 (G-02-C) accordingly.

### Set-Discount Alignment (G-02-02)

The set-discount screens (`/option-discount`) follow the latest prototype (`0a73739`, 2026-09-17). Prototype sources: `set-discount.tsx`, `set-discount-form.tsx`, `set-discount-detail.tsx` (all last changed by `a7d0c88`, 2026-09-16). Anything the code had that the prototype does not was removed. Since 2026-09-24 the screens run on the real API — see "Real API integration" at the end of this section.

**Removed (present in code, absent from the prototype) — 2026-09-17 pass**

| Where           | Removed                                                                   | Prototype reason (comment in source)                                                                                |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| List header     | `{N}件` count badge                                                       | Header carries only the 「FIT365 限定」 badge.                                                                      |
| List toolbar    | 詳細フィルター toggle / collapsible panel and its 「すべてクリア」 button | A8: two filters or fewer stay expanded; clearing is done from the filter result banner.                             |
| List columns    | コード, 対象契約, 店舗, 適用数                                            | Dev answer 2026-08-24: no management code, options only, 適用数 shown on the detail; G-02 FR-006 has no store link. |
| Form 基本情報   | コード (required)                                                         | No management code (dev answer 2026-08-24).                                                                         |
| Form 対象商品   | 対象契約 checkbox group (required)                                        | A set discount targets options only.                                                                                |
| Detail          | 基本情報 / 変更履歴 tabs and the whole 変更履歴 tab (`history-tab.tsx`)   | Dev answer 2026-08-24: set-discount change history is out of scope.                                                 |
| Detail 基本情報 | コード                                                                    | As above.                                                                                                           |
| Detail 対象商品 | 対象契約                                                                  | As above.                                                                                                           |

**Added / changed — 2026-09-17 pass**

- 割引タイプ labels are now 定額値引 / 定率値引 everywhere (list badge, filter, form select, detail). The earlier inconsistency in the prototype (list filter 定額値引き / 割合割引 vs form 定額値引 / 定率値引) is gone — every prototype file uses 定額値引 / 定率値引.
- List: search placeholder 「セット割名で検索...」 and the keyword matches the set-discount name only.
- List: 割引タイプ / ステータス selects sit right of the search box, highlighted while not at their default; filter result banner 「全 N 件中 M 件を抽出中」 with 条件をクリア; empty state (filtered → 条件をクリア).
- Form: the impact warning 「割引条件を変更すると…」 is shown in edit mode only — hidden on create, since a new set has no members yet (deliberate deviation from the prototype, which shows it in both modes — user decision 2026-10-05; same rule as the option form, FR-012).
- Form: セット割名 spans the full row; placeholder 「例: デイタイム＋水素水セット」.
- Form 対象商品: note 「セット割は FIT365 限定のため、候補は FIT365 ブランドのオプションのみ表示しています。」; candidates are FIT365 active option masters excluding locker contract types (`locker_option`), each with a brand badge.
- Form 割引設定: the 割引金額/率 input shows its unit (円 / %) and a type-specific placeholder (例: 330 / 例: 10) once a type is chosen.
- Form ステータス: helper text 「無効化すると新規入会フローでの選択肢から外れます」.
- Form (edit): submit reads 「変更を保存する」.
- Form: 「変更を破棄しますか？」 discard guard on キャンセル / back link (shared `useUnsavedChanges` + `DiscardChangesDialog`), as on the option master form.
- Detail header: 「FIT365 限定」 badge next to the status badge.
- Detail: セット割ID label carries the セット割 glossary tooltip (`JargonTip`).
- Detail 割引設定: the value is labelled 割引金額 or 割引率 by type and always suffixed 「/ 月」; 説明 is always rendered (「—」 when empty).
- Detail: 適用状況 row renamed 適用会員数 → 対象会員数, with the note 「構成オプションをすべて契約中の会員数」.
- Detail: the ステータス card shows 「更新: {最終更新日時}」 while 無効.

**Added / changed — 2026-10-01 pass** (found by the G-02-D/E/F test run)

- List footer reads 「全 N 件中 a-b 件を表示」 (prototype); 前へ / 次へ are always rendered and disabled at the ends, including when everything fits on one page.
- List: the 割引額 header is right-aligned over its right-aligned cells.
- List: a long セット割名 is truncated at 16rem and an option chip at 12rem, both with an ellipsis and a tooltip, so the table is not stretched by one row; the table still scrolls inside its card at 1024px.
- Detail: セット割名, セット割ID, 説明 and the 対象オプション chips wrap inside their card (no clipping); the header title keeps its ellipsis but carries a tooltip with the full name.

**Kept from earlier passes**

| Topic                    | Behaviour                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 説明 textarea            | `maxLength={1000}`                                                                                                                                     |
| Row / detail action menu | `編集` + `無効化する` / `有効化する` (detail: 無効にする / 有効にする); no 削除 — 「管理操作は一覧表示・新規登録・編集・無効化のみ（削除の定義なし）」 |
| 適用条件                 | 3 choices: 同時申込時 / 既存会員も対象 / 家族2名以上                                                                                                   |
| 割引設定 notes (form)    | 常時募集… / キャンペーン併用時は金額変動があると不発動                                                                                                 |
| 適用ルール (detail)      | The three fixed rules of G-02 FR-006, rendered statically (`OPTION_SET_APPLICATION_RULES`) — they are not per-set data                                 |

**Delete → deactivate.** The API agrees with the prototype: `option-sets` exposes `PATCH /api/v1/admin/option-sets/{setId}/active` (`{ isActive }`) and **no delete endpoint**. The list row menu and the detail header call it directly; the toast reads 「「{name}」を無効化しました / 有効化しました」.

**Not changed, deliberately**

- The detail's status card reads 「更新: {日時}」 for both 有効 and 無効: the prototype's 有効開始日 (`effectiveFrom`, 「{日付} より有効」) is modelled by neither `OptionSetDetailDto` nor the API design document, and the customer dropped it (qa-252, 2026-10-05).
- `Permission.OptionDiscountsDelete` was removed from `permission.type.ts` / `permission.constants.ts` (2026-10-05): it had no usage, the toggle is gated by `OptionDiscountsEdit` (the prototype's HQ/System gate), and there is no delete endpoint.

**Real API integration (2026-09-24)**

Checked against the dev Swagger tag `Admin - Option Set Discount (API-086, FIT365 only)`. The screens use the DTOs directly and no longer import `src/lib/api`; the mock `/crm/option-discounts` routes remain but are unused. Per-screen status is kept in `api-integration-output/option-discount-list/`, `option-discount-detail/` and `option-discount-form/report.md`.

| Screen / action                  | Endpoint                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| List                             | `GET /api/v1/admin/option-sets`                                                                                 |
| List / detail — 無効化 / 有効化  | `PATCH /api/v1/admin/option-sets/{setId}/active`                                                                |
| Detail, edit prefill             | `GET /api/v1/admin/option-sets/{setId}`                                                                         |
| Detail — 更新者 name             | `GET /api/v1/admin/staff/{id}` (from `updatedBy`; not called when `null`)                                       |
| Create                           | `POST /api/v1/admin/option-sets`                                                                                |
| Edit — save                      | `PATCH /api/v1/admin/option-sets/{setId}`, then `PATCH …/active` if the status switch changed (qa-193 / qa-195) |
| Form — 対象オプション candidates | `GET /api/v1/admin/options?brandEnum=Fit365&isActive=true&limit=100`                                            |

Decisions recorded while integrating:

- **Sorting** is limited to セット割名 and 割引額 (`sort` = `name` / `discountValue`, qa-196); ID / 割引タイプ / 状態 are display-only. The prototype still sorts all five — prototype gap `#15`. The headers use the same three-state cycle as the option list (ascending → descending → cleared, tooltip 「クリックで解除」); a cleared sort sends no `sort` / `order` and the API's own order applies. The prototype's two-state cycle is not followed.
- **List filters** map to `keyword`, `discountType` (`fixed_amount` / `percentage`) and `isActive`; paging via `page` / `limit`.
- **Validation** follows the contract: セット割名 required, ≤ 100 chars; 説明 ≤ 1000 chars; **at least two** 対象オプション (`E-SET-003`), no duplicates (`E-SET-004`); 定額値引 must be an integer, 定率値引 ≤ 100 %. The form blocks these client-side; any other server refusal (`E-SET-002` …) shows the API's `userMessage`.
- **適用条件** uses the API enum `simultaneous_only` 同時申込時 / `existing_members_included` 既存会員も対象 / `family_two_or_more` 家族2名以上.
- **Candidates** are active FIT365 options minus locker contract types (`locker_option`), but an option already in the set being edited is kept in the list even if it would be filtered out, so saving never drops an existing item.
- **Detail fields**: 対象オプション ← `items[].optionName`, 対象会員数 ← `appliedContractCount`, 状態 ← `isActive`. `404 E-SET-001` renders 「セット割が見つかりません」 on detail and edit.
- **定額値引 has no upper bound (decision 2026-10-01)**: G-02 FR-006, the prototype form and `CreateOptionSetDto` state no ceiling, so the form applies none beyond "integer ≥ 0" and leaves any limit to the backend (a refusal shows its `userMessage`). 0 is accepted for both types (0 円 / 0 % are valid, same decision).
- **Failure handling**: when the list request fails the table is replaced by an error view 「セット割一覧の取得に失敗しました」 with 「再試行する」 (filters stay); an unrecoverable `401` runs the session-expired logout, as `PagePermissionGuard` does; a list or write request made while the browser is offline fails at once (`networkMode: 'always'`) instead of waiting, so a save never submits by itself when the connection returns; a failed write shows one toast (the app-wide mutation handler — the page adds none); a row click that follows a ⋯ menu action within 600 ms is ignored so a double-click cannot open the row underneath.
- **After save**: create returns to the list with 「セット割引を登録しました」; edit returns to the detail with 「セット割引を更新しました」.
- **Candidates load in full or not at all**: the form lists 対象オプション only once every page has arrived; a failed page shows 「オプションデータの取得に失敗しました」 with 「再試行する」 (create inline, edit as the page error state) and is not re-requested on its own.
- **Partial save on edit**: when the content PATCH succeeds but `PATCH /active` fails, the screen says 「セット割の内容は保存しましたが、ステータスは変更されていません」 and returns to the detail, where the status can be toggled again.
- **Search keyword** is capped at 50 characters, the API's `keyword` limit.
- **Edit sends `optionIds` only when the item set changed.** The API re-validates every listed option (FIT365 + active); resending an unchanged set that holds an option deactivated since answers `422 E-SET-002` and would block even a rename (dev, 2026-10-01). Omitting the field keeps the current items (`200`).
- **A malformed id in the URL is a not-found.** `GET /option-sets/abc` answers `400 E-VAL-001` (`setId must be a UUID`), not `404`, so detail and edit treat a `400` on the path id like `404 E-SET-001`. The option screens do the same for `optionId`.

## Success Criteria _(mandatory)_

- **SC-001**: Authorized users can locate a target option (search/filter/sort and open its detail) in under 60 seconds on the standard dataset.
- **SC-002**: Authorized users can complete an option registration from form open to submit confirmation in under 3 minutes.
- **SC-003**: 100 % of detail pages render every FR-006 attribute read-only, including the usage figures and the member-app publication settings.
- **SC-004**: No 削除 affordance is reachable from any option screen, for any role.
- **SC-005**: The 変更履歴 tab shows the option's real change events, one row per changed field, with no editable controls.

## Assumptions

- Phase 1 covers the G-02 Must items plus FR-007 / FR-S001 (Should); set discounts are delivered by the separate `/option-discount` feature.
- The option's store scope is owned by `Y-02 販売設定`; these screens only display the resulting count.
- `storeCount` / `storeNames` are computed by the backend from the option's store scope.
- Prototype text and role matrices are the source of truth wherever no conflicting requirement statement exists.

## Open questions (for the PO)

1. ~~**都次 vs 都度**~~ — **RESOLVED 2026-08-29 (MR review, PO), confirmed by the prototype of 2026-09-03**: 都度 is final. The screens read 都度 and サービス種別; the card titles stay 「オプション種別」 / 「オプション種別・利用可否」, which is what the prototype still uses even though G-02 calls the axis 課金種別. Labels outside these screens (E-02 機器管理 `都次オプション判定`, レッスン `有料（都次）`) were left untouched — they belong to other features.
2. ~~**サービス種別 as an independent axis**~~ — **RESOLVED 2026-08-29 (MR review, PO), scope widened by the prototype of 2026-09-03**: move to the v3 model. サービス種別 is an axis of its own, **optional**, and — per the 2026-09-03 prototype, which states 「通常・都度・自動付与のいずれでも設定可」 — offered for **every** 課金種別, not just 通常 / 都度 as the PO's 2026-08-29 comment and G-02 FR-002 word it. The same サービス種別 may be shared across billing types. Implemented on `feat/update-option` (`option-form.tsx`, `option-form.schema.ts`, `basic-info-tab.tsx`, `options-table-columns.tsx`, `option-master.schema.ts`, `option.seed.ts`). E-02's OR-based device gating does **not** land here — it is that feature's own change. The backend has since dropped `E-OPT-002` (verified 2026-09-23): `subcategory` is optional for every `paymentType`.
3. ~~**Tax basis**~~ — **SUPERSEDED 2026-10-29**: the API now stores `feeMonthly` tax-inclusive (API-085 v0.12) and the form takes 料金（税込）as entered — see FR-018. Previous resolution, kept for history — **RESOLVED 2026-07-30 (verified against the dev Swagger 2026-08-17)**: `feeMonthly` is tax-exclusive and the frontend stores the tax-exclusive fee; 税込 is derived with `floor(税抜 × (1 + 税率/100))`. The prototype's 料金（税込）input is superseded. Implemented on `feat/update-option` (`src/utils/tax.util.ts`, `option-form.tsx`, `option-form.schema.ts`, `UpsertOptionMasterBody.price_excluding_tax`); smoke-tested 税抜 999 @ 8% → 税込 1078. The backend has since made `taxRate` required and limited to `{8, 10}` (qa-109, verified 2026-09-23).
4. ~~**Member-facing description**~~ — **RESOLVED (qa-110, verified 2026-09-23)**: the backend added `publicDescription` for 説明文; `description` stays 備考. Original question: the prototype's 会員公開設定 card has a 説明文 separate from 備考, but the API design document has only one `description` field, documented as "Internal description (FR-002 備考)". Will the backend add a member-facing field, or is 説明文 meant to render 備考?
5. **Deletion**: ~~the option **master** keeps 削除~~ — the prototype of 2026-09-17 dropped 削除 from the option master too, so both screens now retire records via 無効. The real API has no delete endpoint for options either (qa-195). `Permission.OptionsDelete` and the unused mock `DELETE /crm/options/{id}` route are left in place for the same cross-feature reason as below. The **set discount** already had no delete: the prototype states 「削除の定義なし」 and the API design document has no delete endpoint for `option-sets`, so retiring one is now a 無効化. Confirm that operations never need to hard-delete a set discount, and whether `Permission.OptionDiscountsDelete` should be dropped from the permission catalogue (it is still listed on the positions screens).
6. ~~**Store count and popularity rank**~~ — **RESOLVED (verified 2026-09-23)**: the API now returns `storeCount` and, on the detail, `popularityRank` / `popularityRankOf` (qa-110). Original question: 適用店舗数 (list column + detail field) and 人気ランキング 「N位 / Mオプション中」 are required by the prototype and G-02 FR-002 (補足) but have no counterpart on `GET /api/v1/admin/options`. The mock derives both. Will the backend expose them, or should the screens drop them?
7. **サービス種別 on 自動付与 options**: three sources disagree. G-02 FR-002 (`260731_v3`) says the axis is 「通常オプション・都度オプションのいずれにも紐づけ可能」, the PO's MR comment (2026-08-29) asks for 「通常オプションまたは都度オプションの場合に表示」, and the prototype's form (2026-09-03) drops the condition entirely with the comment 「通常・都度・自動付与のいずれでも設定可」. The screens follow the newest source (the prototype) and offer it for every 課金種別. Confirm this is intended — the 自動付与 rows in the prototype's own list mock still carry no サービス種別.
8. ~~**Detail page not updated in the prototype**~~ — **RESOLVED by the prototype of 2026-09-16/17**: `option-detail.tsx` now reads サービス種別 and renders it for every 課金種別, matching the screens. the 2026-09-03 prototype updated the **form** and the **list** to the v3 model but left `option-detail.tsx` on 「都度オプション種別」, still gated on 都度. The screens follow the form/list. Confirm the detail page should read サービス種別 and render for every 課金種別.
9. ~~**Store list on the detail**~~ — **RESOLVED**: the API returns `storeNames[]` and the detail renders one chip per store. Original question: the prototype shows one chip per applicable store, but the resource carries a single `store_id` / `store_name`. The screens show that one chip (or the 全店舗 note). Will the backend expose the full store list of an option?
10. ~~**Upper bound of a 定額値引 (set discount)**~~ — **RESOLVED 2026-10-01 (user decision)**: no upper bound — G-02, the prototype and the Swagger state none, so the form applies none; 0 円 / 0 % are valid. Original question: whether a 9-digit cap (copied from the option fee) should apply; before 2026-10-01 a 10-digit amount was accepted and stored, and it still is.
