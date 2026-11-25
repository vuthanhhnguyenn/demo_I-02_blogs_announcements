# Feature Specification: Campaign Management Refactor (G-03)

**Feature Branch**: `020-campaign-management`
**Created**: 2026-07-27
**Status**: Implemented — re-synced to the 10/7 prototype on 2026-10-08; campaign and promotion-code screens moved onto the real backend on 2026-10-14; awaiting test pass
**Last reconciled**: 2026-11-12 (see Clarifications → Session 2026-11-12 (discount months follow the apply window))
**PO Spec**: `G-03` — キャンペーン管理 (Campaign Management), doc version `260724_v3`
**Source**: UI prototype (`campaign-list.tsx`, `campaign-form.tsx`, `campaign-detail.tsx`, `data/campaigns.ts`, `data/store-campaign-bindings.ts`) @ `dx-fitness/fitness-crm-ui` `28394f9` (`feat/design-update-2026-10-07`, 2026-10-07; first built against `426a9b3`, 2026-07-23) + Requirement spec `crm/requirements/G-03.md` @ `dx-fitness/fitness-spec` `89448e0` (2026-07-24) + Real backend contract `backend-api.json` (`API-088_Campaign_Master_Management`, `Promotion_Code_Management`)
**Input**: User description: "tôi cần refactor lại phần code ở campaign management do prototype (.cache/fitness-crm-ui có history-form, campaign list form detail) và spec (.cache/../../G-03.md) được update mới, ở code hiện tại đã bị khác rất nhiều từ schema api, layout hiển thị, thiếu các field. Ở backend-api thật trong /home/amira/Desktop/DEV/amira/fitness/fitness-crm/backend-api.json cũng đang bị thiếu nhiều. Tôi cần phải sửa lại (thiết kế lại api giống ở backend-api, cũng như thêm các field mới để hiển thị được giống như trong prototype cho phần api. Tôi cũng đã khám phá trước và có 1 vài QA gửi cho khách nhưng chưa được chốt, thì hiện tại ta cứ làm là handle được hết giống như trong prototype , phần api trong code hiện tại cũng cần handle được hết."

## Why This Refactor Exists

The campaign management screens were built against an earlier revision of G-03 and an earlier prototype. Three sources have since moved and now disagree with the shipped code:

1. **G-03 v260724_v3** added first-come capacity limits, lock-in periods, store publication scope, referral-campaign settings, a duplicate function, and a change-history tab.
2. **The V0 prototype** was redesigned (`feat/design-update-2026-07-23`) — the detail screen gained summary cards, an enrollment-channel breakdown, a 60/40 two-column layout, a referral-benefits card and a store-usage card; the form grew from six to eight sections; the list gained a promo-code badge and a three-value acceptance status.
3. **The real backend contract** (`API-088`) landed with a different field vocabulary than the mock (plan vs. main contract, per-option discounts, per-option gender targeting, soft delete — the last later dropped, see Session 2026-10-08) — and is itself missing every field that only the prototype defines.

The result is a screen set that matches none of its three sources. (Later re-synced to the 10/7 prototype — see Clarifications → Session 2026-10-08.) This feature realigns all of them: the mock API is redesigned to the real backend's field set and semantics, extended with the fields the prototype requires, and the three screens are rebuilt to full prototype parity.

## Clarifications

### Session 2026-11-12 (discount months follow the apply window)

- Q: G-03 lists two settings that both say which months a campaign discount covers — the 割引設定 month choice (初月・翌月 only, #35 / #159) and the FR-005 キャンペーン適用期間 (適用開始月 + 適用期間). Which one decides? → A: **The apply window alone** (Dev Q&A 「キャンペーンの割引適用条件に関して」, MTG memo 2026-11-11: 「割引設定に初月、翌月の設定ボタンは不要」; G-03 #159 is still to be revised by the customer). The backend already prices this way (commit `3d2230c4`, on dev): every month inside the window is discounted, months 3+ of a multi-month prepay included, and the 初月 / 翌月 flags (`planDiscountMonth1/2`, `discountMonth1/2`) are deprecated — still accepted and returned, ignored by pricing; `E-CMP-005` now only requires type and value together. The form therefore drops the 適用月 column (the 初月 / 翌月 checkboxes, the 入会時のみ cell and the 「適用月を1つ以上選択してください」 check) and sends no month flags. A discount row is read back from its type and value, never from the flags. The detail's discount card lists the main-contract and option discounts in one field instead of one field per month, and the generated summary drops the 「初月: / 翌月:」 prefixes. The change history hides the plan month-flag fields and shows an option discount as its value only. This supersedes the month part of Session 2026-10-14's discount answer; `FR-002`, `FR-024`, `FR-037`, US2 AC6, US3 AC4 and the month Edge Case are updated.

### Session 2026-11-10 (G-06 Bug-No9, usage limit above the column maximum)

- Q: Tester G-06 Bug-No9 — in the issue dialog, entering a value the form should refuse and saving showed 「システムエラーが発生しました。」 instead of a message on the field. The value was a 使用上限 of `1111111111111111111111325646`. What should happen? → A: **The error is shown under the field it belongs to, never as a system error.** `promotion_codes.max_uses` is a Postgres `integer`, so the usage limit's upper bound is **2,147,483,647**. The form only checked "integer ≥ 1", and a number that large still counts as an integer in JavaScript, so it reached the API, the INSERT failed and the API answered `500 E-SYS-001`. Two fixes. (1) **Backend** (commit `c2616b68`, on dev): a value above the bound is now `400 E-VAL-001` with `details[0] = { field: "maxUses", code: "too_large" }`; 0 or a negative value is still `422 E-PRM-006`. (2) **Front end**: the form refuses a usage limit above 2,147,483,647 before sending, with 「使用上限は2,147,483,647以下で入力してください」 under 使用上限. As a fallback, when the API refuses the issue request, the dialog places the error on the field the API names, with **no toast**, following the campaign form: an `E-VAL-001` entry in `details[]` goes under its field, with Japanese wording built from `details[].code`, because `details[].message` is English for debugging only (ADR-030) and the top-level `userMessage` is a generic sentence. The domain errors that belong to a single field show their `userMessage` under that field: `E-PRM-002` (naming rule) and `E-PRM-003` (duplicate) under コード, `E-PRM-005` under 終了日, `E-PRM-006` under 使用上限 and `E-PRM-010` under 発行店舗. Any other refusal (`E-PRM-004`, `E-PRM-008`, 5xx, …) shows only the shared toast. The duplicate code therefore no longer shows a toast next to its field error.

### Session 2026-11-05 (G-06 Bug-No10, search error shown as a network failure)

- Q: Tester G-06 Bug-No10 — on the promotion-code tab, a search keyword that matches no code showed the error block 「…ネットワーク接続を確認して再度お試しください。」, so it read as a network failure. What should show? → A: **The API's own message, inside the table, as on the member list.** The search box sends the typed text as `codePrefix` (API-089 §3.4). The backend accepts letters, digits and `-` up to 30 characters, case-insensitively (BE MR !946, merged 2026-11-03: a lowercase keyword used to be refused and now matches). Any other character (`・` from a Japanese IME, a space, `_`, kana) or a longer keyword is refused with `400 E-VAL-001` (`details[0].field = codePrefix`) — that is the contract, not a defect. The screen did not distinguish this from a transport failure: the whole table was swapped for the shared error block, whose default description is the network sentence. The screen now does not branch on the error code and does not pre-validate the keyword: on any list failure it keeps the toolbar and the table header, and the table body shows 「プロモーションコードの取得に失敗しました」 with the API's `userMessage` (here 「リクエストの内容が正しくありません。」), falling back to a Japanese message chosen by HTTP status. The action follows the member list: 400 / 422 → 「条件をクリア」 (resending the same conditions cannot succeed), 403 → none, anything else → 「再試行」. No toast. A valid keyword that matches nothing still returns 200 with no rows and shows the filtered-empty state 「条件に一致するプロモーションコードがありません」. To keep the header in the error and empty states the table moved onto the shared `DataTable` (same columns, widths, sticky row menu, dimmed inactive rows); loading now shows skeleton rows under the header. The same `codePrefix` call on the member-list プロモコード filter and the enrollment 紹介コード lookup shows the API's message as well. Holding back requests while an IME composition is open is not part of this answer.
- Q: Tester G-06 Bug-No1 / Bug-No3 — a manual promotion code with lowercase letters or symbols (`fit-ness1`, `ABC-011`) was refused (naming rule / uppercase check). What is allowed? → A: **Any string of 6–32 characters (after trim), case-sensitive; only a duplicate is refused (409 `E-PRM-003`).** The naming-rule check was backend-side and is removed (BE MR !1053, API-089 v0.10 §5.2). The front end replaces its 50-character cap (the campaign-code limit) with 6–32 for manual codes: 「コードは6文字以上で入力してください」 / 「コードは32文字以内で入力してください」 under コード, no request sent. The dialog description reads 「手動入力では任意の文字列（6〜32文字）を指定できます。自動生成の命名規則: 店舗ID＋英数字5桁。登録時にユニーク性を自動判定します。」. The `E-PRM-002` → コード mapping is kept only as a fallback.

### Session 2026-11-05 (G-06 Bug-No5, stale validity-order error)

- Q: Tester G-06 Bug-No5 — in the issue dialog, after picking a 有効期間 start date later than the end date the order error `有効期間の終了日は開始日以降にしてください` appeared, but it stayed on screen after the start date was corrected to fall before the end date (case A) and after the start date was cleared by re-clicking the selected day in the picker (case B). Should the error clear? → A: **Yes — the order error tracks both dates live.** It is shown on the end-date field (G-06 FR-004), so a change to the **start** date MUST re-check the end date as well: the error disappears as soon as start ≤ end, and disappears when the start date is cleared (the start field then shows its own required error `有効期間の開始日を選択してください`). When the end date is still empty, changing the start date does not raise the end date's required error early. Changing the end date already re-checked itself and is unchanged.

### Session 2026-11-05 (tester bug — option ID shown on edit)

- Q: Tester bug — on the G-03 edit form the 割引設定 row showed the option's ID (`00000000-0000-7000-8000-000000000402`) instead of its name, while the detail response carried `optionName: "水素水"`. The 自動付与オプション grid had the same gap: a saved option was simply missing from the grid. Why, and what should show? → A: **The saved option's name, as on the create form.** Both option pickers read the option master page by page (30 per page, active options of the campaign's brand only), and resolved the saved option's label only from the loaded page. A saved option on a later page, or one deactivated after the campaign was saved, therefore had no label (the discount picker fell back to the raw ID) and no checkbox (the auto-grant grid). The form now keeps a display-only id → name map seeded from the detail response (`campaignOptionDiscounts[].optionName`, `campaignAutoOptions[].optionName`) and from each pick, never sent to the API. The discount picker labels the saved option from the loaded page first, then from that map. The auto-grant grid pins every saved option that is not on the loaded page at the top of the grid, checked, with its name; it stays pinned after being unchecked so it can be checked again, is not pinned while a search keyword is entered, and is not pinned once the brand differs from the source campaign's (duplicate only — the brand is read-only on edit). Applies to edit and duplicate.

### Session 2026-11-02 (Bug-No10, API-088 v0.16)

- Q: Tester Bug-No10 — a registered campaign's name, linked options and every other field could be edited and saved, while G-03 forbids editing a registered campaign (基本フロー L82, 制限事項 L128, FR-004 L171: 「既存キャンペーンを編集せず、受付可否フラグで停止し、新規キャンペーンを追加（#276）」). The 2026-07-27 answer only blocked campaigns in use. Which rule holds? → A: **G-03 #276, for every registered campaign** (original spec over this internal spec; backend `API-088 v0.16`, MR !920, merged 2026-11-02). After registration only three things change: the acceptance flag and the capacity limit (`PATCH`, which now accepts `isAccepting` / `capacityLimit` only — any other key is `409 E-CMP-002` 「登録済みのキャンペーンは編集できません。受付を停止し、新しいキャンペーンを登録してください。」 whatever its value and whether or not the campaign is referenced), and the publication scope / stores (`PUT …/published-stores`, unchanged). The edit form therefore locks every other field (basic info except 先着件数上限, periods, main contract, discounts, referral, auto-grant; brand was already locked) and validates only the editable ones, so a campaign whose stored data no longer meets the create-form rules can still be stopped or re-capped. The update body carries only the changed acceptance controls. Server rejections (`E-CMP-002` / `E-CMP-016` / `E-CMP-019`) show the API's `userMessage` in the shared error toast; the earlier field-anchored in-use message is removed. Create and duplicate are unaffected — duplicating is the way to start the replacement campaign. The prototype's warning alert stays verbatim (UI text follows the prototype). This supersedes the 2026-07-27 (contract) answer on the in-use guard.

### Session 2026-10-28 (customer bug G-03\_不具合\_No2)

- Q: After a successful registration the form opened the new campaign's detail screen (PO ruling 2026-07-29 recorded on `PAR233`). The customer reports this as a bug and expects the list. Where does a successful submit land? → A: **Create and duplicate return to the campaign list; edit returns to the campaign's detail** — the prototype's `goBack()` in `campaign-form.tsx` (「編集は詳細画面から入るため、戻り先も詳細（新規・複製は一覧）」). The return keeps the list's filters (`returnTo`). The 2026-07-29 ruling is superseded. US3 acceptance scenario 9 and `SC-004` updated.

### Session 2026-10-21 (MR review)

- Q: Changing the brand on the edit form and picking a main contract of the new brand fails on save with 「参照先のプランはキャンペーンと同じブランドではありません。」. Should the edit form allow a brand change? → A: **No — the brand is read-only on edit** (MR review by k.iwaki, Owner). The update API does not accept a brand (`UpdateCampaignDto` has no `brandEnum` since the 2026-10-09 swagger; only `CreateCampaignDto` has it), so the campaign keeps its saved brand and the plan, option and store pickers stay filtered by it. Create and duplicate keep the brand selectable. `FR-025` and US3 acceptance scenario 8 updated.

### Session 2026-10-14 (real API integration)

The campaign detail, form, list and promotion-code tab now call the real backend (`src/lib/api-real`,
Swagger dev) instead of the mock. Status per endpoint lives in `api-integration-output/campaigns/report.md`.
Where the real contract and the 10/7 prototype disagree, **the contract wins on behaviour and the
prototype keeps winning on layout and copy** (the prototype's logic is not a spec). The decisions below
supersede the conflicting statements in the sessions that follow.

- Q: The prototype's discount settings have separate 初月 and 翌月 blocks, each with its own rows and
  values; `API-088` stores ONE discount (type + value) per target plus two month flags
  (`discountMonth1/2`, `planDiscountMonth1/2`). → A: **The form follows the API.** One discount block:
  one row per target (main contract / option / entry fee), each with an amount or rate and 初月 / 翌月
  checkboxes. A target may appear only once; a row needs at least one month ticked. The entry-fee row has
  no month — it shows 入会時のみ and is always sent as first-month. `FR-002`, `FR-037`, `FR-024`,
  US2 AC6 and US3 AC4 are updated accordingly. _(Month part superseded — the checkboxes are gone, see
  Session 2026-11-12.)_
- Q: The prototype's code edit dialog changes validity, usage limit and store scope. → A: **Description
  only.** The backend offers no general PATCH (API-089 §1 R1); only `PATCH ~/{id}/description` and
  `PATCH ~/{id}/status` exist, and G-06 has no edit-code requirement (L172: changes go through a new
  issue). The dialog shows code, validity, limit and scope read-only and edits 説明 only. `FR-038`
  is rewritten. The prototype's wider dialog is a prototype gap, not a requirement.
- Q: The prototype has no way to undo a disable. → A: **Add 有効化 to the row menu now, without waiting
  for the prototype.** G-06 FR-007 defines 無効化の取り消し and the contract provides
  `PATCH ~/{id}/status` with `action: re_enable`. The action is enabled only on disabled codes, needs no
  reason, and success refreshes the row. `FR-031` and US5 are updated.
- Q: The prototype filters issuers loosely; the contract only has `createdBy = staffId`. → A: **Filter by
  `issuerType`** (本部 / 店舗スタッフ), decided from the issuer's current role. `FR-030` is updated.
- Q: The prototype's code search and footer assumptions. → A: the search box maps to `codePrefix`
  (G-06 FR-014: 前方一致); the 総利用 footer total is dropped (not in the contract or G-06).
- Q: CSV export — does the screen need a creation-date range and an encoding choice? → A: **No.**
  Backend v0.7 made `from` / `to` optional with no span limit, so the screen sends none (all codes of
  the campaign) and fixes the encoding to Shift_JIS with BOM (`sjis-bom`). Add a picker only if the
  customer asks.
- Q: Swagger declares some body fields as `type: object` (campaign code, remarks, usage dates, apply
  months, `issuedStoreId`, disable `reason`). → A: tracked as a **backend schema defect**; the client
  casts at the call site (`_utils/campaign-wire.ts`, `use-promo-codes-tab.ts`) and these casts go away
  when the schema is fixed.
- Q: What happens to the mock-only statements (FR-000 mock-ahead rules, the 100-record picker cap, nominal
  CSV encoding)? → A: **Historical for the screens listed above** — they no longer run on the mock.
  They remain accurate only for any surface still on `src/app/api/_mock-db`. `FR-000` and the
  Assumptions are annotated, not deleted.

### Session 2026-10-15 (PO decisions)

- Q: Change-history values (IDs instead of names, unreadable changes inside a list, raw enum text, an empty update row)? → A: **The screen shows what the API returns.** The member change-history tab does the same: the API returns display-ready `changes` (field, before, after) and the screen only renders them. The campaign history API returns raw `diff` values, so these defects are owned by the backend (return display-ready values, or names alongside IDs); the screen only maps field labels. No front-end change.

- Q: Two sessions editing the same campaign? → A: **The edit form sends only the fields the operator changed** (against the values the form opened with); fields that the API validates or replaces as a unit travel together (recruitment dates, usage dates, apply-start month + specific month, plan discount, entry-fee discount, option-discount array, auto-option array, referral settings). Sessions changing different fields no longer overwrite each other; if both change the same field the later save wins (accepted). An edit with no changed field sends no update.

- Q: Cell shown in the code table's scope column? → A: **The scope label** (all stores / issuing store only), as in the prototype and G-06; not the store name.
- Q: Page-number window at the start/end of the list? → A: **Accept the shared pagination component** (a sliding window of the current page ±1 with first/last); no change.
- Q: Footer of the code table? → A: **Issued count only.** Total uses is dropped; the issued count comes from the campaign detail (`promotionCodeCount`).
- Q: Brands in the list filter? → A: **Follow the API `brandEnum`** (Joyfit, Joyfit24, JoyfitYoga, JoyfitPlus, Fit365); the two-brand wording in the original requirement is superseded.
- Q: A separate "not started yet" state for codes whose start date is in the future? → A: **No.**
- Q: Full-width / half-width normalisation in name search? → A: **No.**

- Q: Store-usage card for a session with no single store? → A: **Follow the API.** `myStoreUsage` is the token's store and is null when the token has no store; the card then shows only the store count.
- Q: Should a code show a fifth state when its parent campaign is stopped or deleted? → A: **Yes — follow the real API and the original G-06.** `FR-035` is rewritten to five states (reverses the 2026-10-08 reduction to four).
- Q: Recruitment-date filter on the list? → A: **Single day, as the API (`recruitmentActiveOn`), both ends of the window inclusive.** `FR-008` updated.

### Session 2026-10-08 (prototype 10/7 sync)

The screens were re-aligned to the latest prototype (`feat/design-update-2026-10-07`, which
supersedes the 7/23 baseline through the 8/5, 8/13, 9/8, 9/17 and 10/7 design updates).
The rule applied throughout: **what the prototype shows, the screens show; what the prototype
no longer has (or never had) is removed from the screens and from the mock API.**

- Q: The prototype dropped every delete affordance (list row menu, detail header menu) with the
  note that G-03 has no deletion FR — operation is "stop acceptance, then add a new campaign".
  Keep delete? → A: **No — removed everywhere.** The row menu offers edit and duplicate only; the
  detail header offers edit only; the delete dialogs, the `DELETE /crm/campaigns/{id}` endpoint,
  the soft-delete column and the "deleted campaign" handling are gone. `FR-006` is retired.
- Q: The prototype's discount settings now include an **entry-fee (入会金) discount** (G-05 L142: the
  entry-fee discount is configured on the campaign). How is it modelled? → A: **A third discount
  target, not a month.** The entry fee is billed once at enrollment, so it carries no month: the form
  offers it as a target only inside the _first-month_ block (one row at most), the API carries it as
  its own `entryFeeDiscount*` triple, and the detail screen shows it on its own line above the
  month-by-month discounts. `FR-037` below.
- Q: The prototype's discount row also asks for a _main-contract name_ when the target is 主契約.
  Adopt it? → A: **No.** A campaign applies to exactly one main contract (`FR-001`, the plan
  reference), so a second picker could not be persisted and would violate SC-003 (no form field is
  discarded on submit). Plan-level rows keep applying to the campaign's own plan; the detail screen
  shows that plan's name on the row.
- Q: Auto-grant gender targeting gained a fourth choice in the prototype form (回答しない). →
  A: **Added** (`FR-018` now lists four values: male, female, other, no answer).
- Q: The prototype's promotion-code tab has four statuses and two scope types. The build had five and
  three. → A: **Reduced to the prototype's.** `campaign_unavailable` is removed (a code now shows its own
  window / usage / disabled state regardless of the campaign), and the OGF-only scope is removed
  together with its code prefix and its seed row. `FR-035` and `FR-036` are rewritten.
- Q: The prototype's code-row menu gained **編集**, which reopens the issue dialog in edit mode (code
  string locked; description, validity, usage limit and store scope editable). → A: **Added** as
  `FR-038`, with a `PATCH /crm/promo-codes/{id}` mock endpoint. _(Narrowed to description-only against the real API — see Session 2026-10-14.)_
- Q: Visual changes in the prototype's 10/7 badge unification (no per-badge size overrides, no icon on
  the promo-code marker, "capacity reached" in the warning colour on the list **and** the detail,
  expired promotion codes neutral, exhausted codes warning and no longer dimmed). → A: **Applied.** The
  repository keeps its own muted background for the neutral tone; the prototype's shared tone-badge
  component is not imported.
- Q: The prototype caps the remarks field at 1,000 characters while `API-088` allows 4,000. →
  A: **The form enforces 1,000** (prototype wins on the screen); the mock API keeps the backend's 4,000
  so it still accepts every record the real backend does. The disable-reason field is likewise capped at
  1,000 in the dialog and the API.
- Q: Copy and labels that changed: edit form submit button → 変更を保存する; duplicate form → title
  `キャンペーン 複製（<source id>）` with the duplicate-specific alert; the discount summary on the detail
  is generated from the discount rows (入会金 → main contract / options), not entered by hand.
  → A: **Applied.** The duplicate alert tells the operator to set the campaign code, because the code is
  cleared on duplication (the prototype copies it and asks the operator to change it).

### Session 2026-07-27 (scope)

- Q: The build included `discountTotal` (割引総額 / 割引合計) on the summary cards, the promo-code table and its footer. Is Phase 2 content in scope? → A: **No — Phase 1 only, including in the API.** V0 gates exactly four renders behind `currentPhase === "2"`, all of them total discount value. The field is removed from the response schemas, the DB row and all three screens; it is not merely hidden. A/B test delivery (G-03 FR-C001) stays deferred for the same reason.
- Q: The build implemented every operation `API-088` and `Promotion_Code_Management` define, including ones no prototype screen calls. Should unused backend operations be mocked? → A: **No — ignore them.** Six endpoints were removed: campaign usage probe, campaign restore, store-campaign link and unlink, promotion-code detail, promotion-code change history, and promotion-code per-member usage. The rule going forward: an endpoint exists in this mock only if a prototype screen calls it. Campaign change history stays, because the detail screen has a 変更履歴 tab.

### Session 2026-07-27 (contract)

- Q: How literally should the mock mirror the real backend contract? Every other mock in this repository (`crm-maintenance`, `terms`, `banner` — all designed against the backend document) normalises it into `snake_case` with readable identifiers, whereas `API-088` uses `camelCase`, UUIDs and an `items`/`totalItems` envelope. → A: **Adopt the backend's field set and semantics; keep repository conventions for their expression.** Correction applied during implementation: the repository's _current_ convention (`banner`, `crm-maintenance` — the two newest mocks) is `camelCase` on the API surface with an `items` + `{ page, limit, totalItems, totalPages }` envelope, and `snake_case` only on the internal DB row. That is what was built, so the wire format matches `API-088` almost exactly; only identifiers stay readable (`CP001`-style) so the list's ID column remains usable.
- Q: `API-088` rejects any edit to a campaign referenced by an active contract or pending application (`E-CMP-002`, acceptance-flag-only bodies excepted), while the V0 prototype's form is fully editable behind a warning banner. Which wins? → A: _(Superseded 2026-11-02 — see Session 2026-11-02.)_ **Warn in the interface, enforce in the API.** The form keeps the prototype's fully-editable layout and its warning alert verbatim — no parity exceptions — but the mock API applies the in-use guard on submit and returns the conflict error, which the form surfaces as a field-anchored message. The operator learns of the block at save time. This keeps V0 fidelity intact while guaranteeing the mock never accepts a write the real backend will reject.
- Q: How much of the promotion-code surface is in scope, given it is one of the campaign detail's three tabs and `Promotion_Code_Management` is fully specified? → A: **Rebuild against the real contract, limited to what the tab actually calls.** List, issue, status change and CSV export are implemented against `Promotion_Code_Management`, replacing both the partial `/crm/promo-codes` mock and the read-only preview array previously embedded in the campaign detail payload. Single-code detail, per-code change history and per-member usage are **not** built — see the scope session below.

### Session 2026-07-27 (implementation review)

Recorded after reading the built code back against this document. Everything in this
session is a **decision the build made that this specification had not captured** — it
is written down here so the specification and the code agree before testing starts.
Divergences that are _not_ decisions (i.e. the code is simply wrong) were deliberately
**not** absorbed into this document — the requirements and acceptance scenarios below
still describe the intended behaviour, so a black-box test pass against the running app
is what surfaces them, not a side document.

- Q: `FR-000` mandated `snake_case` on the API surface, but the Clarifications above
  already corrected that during implementation and `FR-000` was never rewritten. Which
  stands? → A: **The correction stands; `FR-000` was stale and is rewritten below.** The
  wire format is `camelCase` (matching `API-088` almost verbatim); `snake_case` survives
  only on the internal DB row (`CampaignRow`, `PromoCodeRow`).
- Q: A promotion code's effective status has five values in the build
  (`campaign_unavailable` added) but `FR-035` said four. Which is right? → A: **Five.** _(Superseded 2026-10-08: back to four — see the prototype 10/7 sync session.)_
  A code attached to a stopped or soft-deleted campaign is unusable regardless of its own
  window and usage, and the tab must say so rather than showing it as valid.
- Q: The campaign list query accepts three filters the requirements never listed
  (`acceptState`, `recruitmentFrom`, `recruitmentTo`). Scope creep or required? →
  A: **Required** — the prototype's filter panel drives all three; `FR-008` was
  under-specified and is extended below.
- Q: `FR-027` restricted CSV export to Headquarter, System and Manager. `G-06` states no
  such restriction. → A: **`G-06` wins; the restriction was not sourced.** Export follows
  the same role set as the rest of the promotion-code tab.
- Q: `G-06` restricts which _scope type_ each role may issue (Staff is fixed to type B and
  may not issue type A). No requirement carried this. → A: **Add it** — `FR-036` below.
  It is currently unenforced, so it is expected to fail the test pass.
- Q: `FR-005` and `FR-032` have no text. Gap or omission? → A: **Retired deliberately** —
  they covered the endpoints dropped in the scope session. Numbers are left unused rather
  than renumbered so existing references stay valid.

## User Scenarios _(mandatory)_

### User Story 1 - Find a campaign in the list (Priority: P1)

A head-office operator opens campaign management to locate a specific campaign among several hundred. They type part of the campaign name, narrow by brand, acceptance state and recruitment-period window, and read each row's identity, code, brand, recruitment window, acceptance state and linked main contract at a glance. Rows carrying promotion codes are visually marked. Clicking a row opens its detail.

**Why this priority**: The list is the entry point to every other campaign journey. Without it, no other story is reachable. It is also the screen where the three-value acceptance state (accepting / stopped / capacity reached) first becomes visible, which is the most consequential addition in G-03 v3.

**Verification**: Load the campaign list, confirm all eight columns render in prototype order, apply each filter individually and in combination, confirm the result banner reports filtered-vs-total counts and clears correctly, confirm a capacity-reached campaign shows the distinct third badge.

**Acceptance Scenarios**:

1. **Given** campaigns exist across both brands, **When** the operator selects a brand filter, **Then** only campaigns of that brand remain and the filter control shows as active.
2. **Given** a campaign whose applications have reached its first-come capacity limit, **When** the list renders, **Then** its acceptance column shows the capacity-reached state, visually distinct from both accepting and stopped.
3. **Given** an active search term and two active filters, **When** the operator clicks the clear action, **Then** all filters and the search term reset and the full list returns to page 1.
4. **Given** a campaign that has at least one promotion code issued, **When** the list renders, **Then** its name cell carries a promo-code marker.
5. **Given** filters that match nothing, **When** the list renders, **Then** an empty state distinguishes "no results for these conditions" from "no campaigns exist yet" and offers a clear-conditions action only in the former case.

---

### User Story 2 - Read a campaign's full configuration (Priority: P1)

An operator opens a campaign to review every setting before deciding whether to stop, edit or duplicate it. The detail screen shows applied-member and application counts, an enrollment-channel breakdown, and read-only cards covering basic information, discount settings (an auto-generated summary, the entry-fee discount and the first-/second-month discounts by target), application conditions, the three periods plus the lock-in period, auto-grant settings and referral-campaign benefits. A status panel shows the acceptance state with capacity progress and offers the stop/resume control. Store-scoped users additionally see whether their own store uses the campaign.

**Why this priority**: Reading is the highest-frequency action and a prerequisite to every write action. G-03 FR-003 requires all FR-002 fields be readable; today several are not surfaced at all.

**Verification**: Open a campaign detail, confirm every card and field listed in the parity checklist renders, toggle acceptance and confirm the status panel and header badge both update, confirm the capacity-reached case hides the stop/resume control.

**Acceptance Scenarios**:

1. **Given** a campaign at capacity, **When** the detail renders, **Then** the status panel shows the capacity-reached state, explains that the system switched acceptance off automatically, and offers no stop/resume control.
2. **Given** a campaign published to specific stores only, **When** the detail renders, **Then** the basic-information card lists each target store rather than showing "all stores".
3. **Given** an operator whose token carries a store, **When** the detail renders, **Then** the store-usage card shows the number of stores using the campaign and states whether the operator's own store uses it, with a link to the store screen where the link is managed.
4. **Given** an operator whose token carries no store (the API returns `myStoreUsage = null`), **When** the detail renders, **Then** the card shows only the number of stores using the campaign and never claims that "the operator's store does not use it". (Decision 2026-10-15 (PO): follow the API; the prototype's header-selection rule is not used.)
5. **Given** a campaign with referral settings enabled, **When** the detail renders, **Then** the referral-benefits card shows the per-referral points, whether tiered increase applies, and the annual reset date.
6. **Given** a campaign with an entry-fee discount and plan and option discounts, **When** the discount card renders, **Then** it shows the generated summary, the entry-fee discount on its own line, and one main-contract / option field listing each discount with a target badge (main contract / option) and the discount value; the field shows "なし" when there is none. No per-month split is shown — the apply window decides the months (Session 2026-11-12).

---

### User Story 3 - Register or edit a campaign (Priority: P1)

A head-office operator creates a new campaign through an eight-section form: basic information (name, code, brand, capacity limit, lock-in period, remarks), store publication scope, the three periods, main contract and trigger conditions, per-target discount rows (one row per target, each flagged for the first month, the second month or both; one row may be the entry fee), referral-campaign settings, auto-grant settings, and the acceptance flag. Required fields are marked, validation errors appear inline and scroll the first offending field into view, and leaving with unsaved changes prompts for confirmation.

**Why this priority**: Registration is the only way campaigns enter the system (G-03 FR-002). Half of the fields G-03 v3 added exist nowhere in the current form, so operators cannot express the settings the specification requires.

**Verification**: Open the create form, submit empty and confirm required-field errors, fill each section and confirm conditional sub-sections appear and disappear, enter a duplicate campaign code and confirm the uniqueness error, navigate away dirty and confirm the discard dialog.

**Acceptance Scenarios**:

1. **Given** the form is empty, **When** the operator submits, **Then** each required field shows an inline error, a summary message appears in the footer, and the first invalid field scrolls into view.
2. **Given** the operator selects "specific stores only" as publication scope, **When** the section re-renders, **Then** a multi-select store picker appears and becomes required.
3. **Given** the operator selects a custom start month for the application period, **When** the section re-renders, **Then** a month-number input appears and becomes required.
4. **Given** the operator enables the discount setting, **When** the sub-section expands, **Then** at least one discount row is present and rows can be added and removed, each targeting the main contract, an option or the entry fee (whose target name is fixed and non-editable). A row has no month control — the apply window decides the discounted months (Session 2026-11-12).
5. **Given** the operator enables referral-campaign settings, **When** the sub-section expands, **Then** the referral point value becomes required and tiered-increase and annual-reset toggles appear.
6. **Given** a campaign code already used by another campaign, **When** the operator submits, **Then** the submission is rejected with a code-duplication message on the code field and no campaign is created.
7. **Given** the operator has edited any field, **When** they use the back link or cancel, **Then** a discard-confirmation dialog appears before navigation.
8. **Given** the operator opens an existing campaign's edit form, **When** they reach the brand field, **Then** it shows the saved brand and cannot be changed; on the create form and on a duplicate the brand stays selectable.
9. **Given** a valid create or duplicate form, **When** the operator submits, **Then** a success toast appears and the operator returns to the campaign list with its previous filters; **Given** a valid edit form, **When** the operator saves, **Then** the operator returns to that campaign's detail screen.
10. **Given** the operator opens an existing campaign's edit form, **When** the form renders, **Then** only 先着件数上限, the publication scope / stores and the acceptance flag can be changed; every other field shows its saved value and cannot be operated, and saving sends only what changed among those three. On the create form and on a duplicate every field stays editable (Session 2026-11-02).

---

### User Story 4 - Control acceptance and campaign lifecycle (Priority: P2)

An operator stops a campaign's acceptance so it disappears from the mobile enrollment flow, later resumes it, and duplicates an existing campaign to build the next one quickly. There is no delete: the operating rule is to stop a campaign and add a new one. Duplication opens the create form pre-filled from the source, with a copy marker appended to the name and acceptance initialised to stopped so nothing is published by accident.

**Why this priority**: G-03's core operating rule (#276) is "never edit a live campaign — stop it and add a new one", which makes stop/resume plus duplicate the primary change mechanism. It depends on stories 1–3 existing first.

**Verification**: Toggle acceptance from the detail status panel and confirm the list reflects it; duplicate a campaign and confirm the pre-filled form; confirm neither the list row menu nor the detail header offers a delete action.

**Acceptance Scenarios**:

1. **Given** an accepting campaign, **When** the operator confirms the stop action, **Then** a success message appears, the header badge and status panel switch to stopped, and the list row reflects the new state on next load.
2. **Given** a stopped campaign, **When** the operator confirms the resume action, **Then** it returns to accepting.
3. **Given** any campaign, **When** the operator chooses duplicate, **Then** the create form opens with every setting copied, the name suffixed with the copy marker, and acceptance set to stopped.
4. **Given** the confirmation dialog for stop or resume, **When** the operator cancels, **Then** no state changes.

---

### User Story 5 - Manage promotion codes for a campaign (Priority: P2)

Within a campaign's detail, an operator works in the promotion-code tab: searching and filtering issued codes by text, status and issuer; reading each code's validity window, usage against its limit, remaining count, usage rate, store scope and status; copying a code to the clipboard; issuing a new code through a dialog that supports auto-generation or manual entry with duplicate checking; disabling a code with a mandatory reason recorded for audit; editing an issued code's description; re-enabling a disabled code; and exporting the list.

**Why this priority**: G-03 folds G-06 promotion-code management into this screen as a tab with no independent page, so it is part of campaign management by definition — but it is a self-contained surface that can ship after the campaign screens themselves.

**Verification**: Open the promo tab, exercise each filter, copy a code and confirm the copied affordance, open the issue dialog and auto-generate a code, disable a code and confirm the reason is required.

**Acceptance Scenarios**:

1. **Given** the promo tab, **When** the operator types into search, **Then** rows match on both code and description.
2. **Given** a code with a numeric usage limit, **When** the row renders, **Then** remaining count and usage rate are computed and shown; **Given** an unlimited code, **Then** both show a dash.
3. **Given** the issue dialog, **When** the operator clicks auto-generate, **Then** a code following the naming rule is placed in the input.
4. **Given** the disable dialog, **When** the reason field is empty, **Then** the confirm action is disabled.
5. **Given** a code whose status is already disabled, **When** the row menu opens, **Then** the disable action is unavailable.
6. **Given** any code, **When** the operator chooses edit, **Then** a dialog opens showing the code, validity window, usage limit and store scope read-only and the description editable; saving is disabled until the description changes, and saving updates the row.
7. **Given** a code whose status is disabled, **When** the row menu opens and the operator chooses 有効化, **Then** the code is re-enabled without a reason prompt and the row returns to its derived status; on any other status the action is unavailable.

---

### User Story 6 - Audit what changed on a campaign (Priority: P3)

An operator opens the change-history tab to see, in reverse-chronological order, every modification made to the campaign: when it happened, who made it, which field changed, and the before and after values. Record creation appears as the earliest entry with a distinct marker and no before-value.

**Why this priority**: G-03 classifies this as a Could-level requirement (FR-S004). It is valuable for accountability but no operator journey is blocked without it.

**Verification**: Open the history tab and confirm the six-column table renders, including the creation row with its badge and dashes.

**Acceptance Scenarios**:

1. **Given** a campaign with recorded changes, **When** the history tab opens, **Then** entries appear newest-first with timestamp, operator, field, before value, an arrow separator and after value.
2. **Given** the campaign-creation entry, **When** it renders, **Then** the field and before columns show a dash and the after column shows a creation badge.

### Edge Cases

- **Capacity reached exactly at the limit**: when applications equal (not merely exceed) the configured capacity, the system treats the campaign as capacity-reached, switches acceptance off automatically, and suppresses the manual stop/resume control.
- **Capacity limit left unset**: no capacity badge, no remaining-count text, and acceptance is never switched off automatically.
- **Capacity limit lowered below the current application count**: the campaign immediately reads as capacity-reached; existing applications are unaffected.
- **Changing a registered campaign's content**: not possible, whether or not the campaign is referenced by contracts or applications — the edit form locks the content fields, and the API refuses any content key with `E-CMP-002`. The operator stops the campaign and registers a replacement (duplicate helps).
- **Acceptance flag, capacity limit or publication change on a registered campaign**: permitted, in use or not. A capacity limit below the current application count is refused (`E-CMP-016`), and resuming acceptance while the limit is reached is refused (`E-CMP-019`); both show the API's message.
- **Registered campaign whose stored data fails the create-form rules** (e.g. a null application duration): the edit form still saves an acceptance-control change, because locked fields are not validated.
- **Recruitment end date earlier than start date** (and the same for the usage period): rejected with an inline error on the end-date field.
- **Promotion-code search keyword the API refuses** (a character other than a letter, digit or `-`, e.g. `FIT・`, or more than 30 characters): the toolbar and table header stay; the table body shows 「プロモーションコードの取得に失敗しました」 with the API's message and 「条件をクリア」, never the network-failure sentence and no toast (Session 2026-11-05, G-06 Bug-No10).
- **Promotion-code usage limit above 2,147,483,647** (issue dialog): rejected on the 使用上限 field before sending; if the API still refuses an issue request field by field (`E-VAL-001` `details[]`, or a single-field `E-PRM-*` code), the error shows under that field and no toast appears (Session 2026-11-10).
- **Promotion-code validity start later than end** (issue dialog): rejected with an inline error on the end-date field; the error re-evaluates whenever either date changes, so correcting or clearing the start date removes it at once (Session 2026-11-05).
- **Custom start month selected but left blank**, or a month value supplied while a non-custom start month is selected: both rejected with an inline error.
- **Discount row with neither amount nor rate**, or with both: rejected; amount and rate are mutually exclusive per target row.
- **Two discount rows for the same target** (same plan, or the same option): rejected on the later row's target field — the contract stores one discount per target, so the form asks for one row with both months ticked rather than two rows with different values.
- **Campaign code omitted**: permitted — the code is optional in the real contract; only non-empty codes are uniqueness-checked.
- **Referral settings enabled with no point value**: rejected with an inline error.
- **Referral tiered increase enabled with no threshold or no tier point value**: both rejected with inline errors. The two tier fields are required only while both the referral section and the tiered-increase toggle are on; turning either off clears the requirement.
- **A percentage discount above 100**: rejected on the value field, on the plan-level row, on the entry-fee row and on every per-option row independently. The form and the API both enforce it, so the block holds whether the operator submits from the screen or the payload arrives directly.
- **Usage period and application duration left blank**: rejected by the form even though the API declares both nullable. The prototype marks them required; the API stays permissive so it can accept records the real backend allows. Testers should treat the form error as correct and the nullable API field as intentional, not as a contradiction.
- **Discount row targeting an option with no option chosen**: rejected on that row's option field; rows targeting the main contract or the entry fee need no option.
- **More than one entry-fee row**: rejected on the extra row's target field. The entry fee is billed once, so only one discount applies. Switching a row's target away from the option clears its option selection.
- **Auto-grant enabled with no options selected**, or conditional targeting with no gender selected: rejected with inline errors.
- **Saved option outside the loaded picker page** (a later page of the paginated option master, or an option deactivated after the campaign was saved): on edit and duplicate the discount row still shows the option's name, never its ID, and the auto-grant grid shows the option checked at the top (Session 2026-11-05).
- **Store-scoped operator viewing a campaign not published to their store**: the campaign is still readable; the store-usage card reports it as not in use.
- **Manager and Staff roles**: campaign list and detail are readable; every write affordance (register, edit, duplicate, acceptance toggle) is unavailable to them.
- **Empty change history**: the history tab renders its table with an empty state rather than an error.
- **Promotion-code list empty for a campaign**: the promo tab renders with a zero summary rather than an error.

## Requirements _(mandatory)_

### A. Contract realignment

- **FR-000**: _(Applies to the mock surface only; the screens now on the real API use the backend's field names and UUIDs directly — Session 2026-10-14.)_ Field names MUST be the real contract's names in the real contract's `camelCase` on the API surface, with `snake_case` used only for the internal DB row. Identifiers MUST remain human-readable (`CP001`, `PC001`) rather than UUIDs, so the list's ID column stays usable. The repository's pagination envelope MUST be retained, extended with a pre-filter total (`totalAllItems`) that the result banner needs. Every field the prototype requires but the real contract does not define MUST be marked `mock-ahead` at its definition, naming the requirement that introduced it, so the eventual backend alignment is mechanical.
- **FR-001**: The campaign API MUST expose the real backend's field set and semantics for every field the backend defines, replacing the current divergent vocabulary. Specifically: the linked contract MUST be modelled as a plan reference (identifier plus name) rather than a "main contract" pair; acceptance MUST be a single boolean rather than a status enum plus a redundant record-status enum; the campaign code MUST be optional and free-form up to 50 characters rather than mandatory and regex-constrained; remarks MUST allow up to 4000 characters at the API (the form caps them at 1000, matching the prototype); the usage period MUST be nullable; the application start month MUST use the backend's `specific_month` vocabulary rather than `custom_month`; and application duration MUST be nullable.
- **FR-002**: The campaign API MUST support per-option discount configuration — a list of option references, each carrying a discount type (fixed amount or percentage) and a value — in addition to the plan-level discount. The current single flat discount object MUST be replaced. A target carries exactly one discount value, applied in every month of the FR-005 apply window; the form MUST NOT offer a month choice or different values per month, and MUST NOT send or read the deprecated month flags (Session 2026-11-12).
- **FR-003**: The campaign API MUST support per-option auto-grant configuration — a list of option references, each carrying its own optional gender-target list — replacing the current campaign-wide gender condition applied to a flat option-identifier list.
- **FR-004**: The campaign API MUST expose reference counts on the campaign record. Active contracts and pending applications MUST appear on **both** the list item and the detail, because the capacity state (FR-010) derives from them (the in-use guard they once fed was replaced by the registered-campaign lock, FR-009a, Session 2026-11-02). Linked-store count and promotion-code count are detail-only.
- **FR-006**: _Retired (2026-10-08)._ Campaign deletion — logical or otherwise — is not offered: the 10/7 prototype has no delete affordance and G-03 has no deletion requirement. The number is left unused.
- **FR-007**: The campaign detail MUST report which stores currently use the campaign. The link/unlink write surface is owned by the store screen and is out of scope here.
- **FR-008**: The campaign list query MUST accept the real contract's filter set — brand, acceptance flag, a date that must fall inside the recruitment window, plan, name search, code search — **plus the one the prototype's filter panel requires**: the derived three-value acceptance state (FR-010). The recruitment filter is a single day (`recruitmentActiveOn`, both ends of the window inclusive); the earlier `recruitmentFrom`/`recruitmentTo` overlap pair is dropped because the backend does not provide it (decision 2026-10-15). Pagination and the contract's sort keys MUST be accepted, and the response MUST use the contract's list-envelope shape.
- **FR-009**: Error responses MUST carry a machine-readable code, an internal message, a user-facing Japanese message and a trace identifier, using the real contract's error codes for validation failures, code duplication, in-use conflicts and permission denials.
- **FR-009a**: A registered campaign's content MUST NOT be editable (G-03 #276; `API-088 v0.16`). The update API accepts only the acceptance flag and the capacity limit and rejects any other key with `E-CMP-002`; the publication scope and stores are saved through their own endpoint. The edit form MUST lock every other field, MUST validate only the editable ones, and MUST send only the changed acceptance controls. Server rejections MUST show the API's user-facing message (Session 2026-11-02).

### B. Fields the prototype requires that the backend does not yet define

Each requirement in this group is a deliberate mock-ahead-of-backend extension: the screens depend on it, the real contract does not carry it yet, and it MUST be marked as such wherever it is defined so the eventual backend alignment is mechanical.

- **FR-010**: The campaign record MUST carry an optional first-come capacity limit (a positive count of applications). When the application count reaches the limit, the system MUST switch acceptance off automatically and MUST report a third acceptance state — capacity reached — distinct from both accepting and stopped. Remaining capacity MUST be derivable for display.
- **FR-011**: The campaign record MUST carry an optional lock-in period expressed in whole months, representing the cancellation-fee window, together with a human-readable worked example for display.
- **FR-012**: The campaign record MUST carry a publication scope — all stores, or a specific list of stores — independent of the store-campaign link described in FR-007. Publication scope determines which stores may choose the campaign; the link records which stores actually use it.
- **FR-013**: The campaign record MUST carry referral-campaign settings: whether the campaign participates in the friend-invitation programme, the points awarded to the referrer per successful referral, whether awards increase in tiers, and whether the point balance resets annually.
- **FR-014**: The campaign record MUST carry a list of option contracts that act as trigger conditions for the campaign, distinct from both discount targets (FR-002) and auto-granted options (FR-003).
- **FR-015**: The campaign record MUST expose display statistics beyond the backend's counts: applied-member count, new applications in the current month, and an enrollment-channel breakdown across mobile, manual and referral origins.
- **FR-016**: The campaign list row MUST indicate whether the campaign has any promotion code issued against it.
- **FR-017**: The system MUST record and expose a per-campaign change history: timestamp, operator, changed field, previous value and new value, with record creation represented as an entry that has no changed field and no previous value.
- **FR-037**: The campaign record MUST carry an optional entry-fee (入会金) discount — a flag, a discount type (fixed amount or percentage) and a value — independent of the plan-level and per-option discounts (G-05 L142). It has no month because the entry fee is billed once at enrollment; the form presents it as a discount row like the others. The same validation as the other discount legs applies (type and value required when enabled; a percentage above 100 rejected). The campaign change history MUST record changes to it, and the store campaign table's discount summary MUST include it.
- **FR-018**: Auto-grant gender targeting MUST accept two values beyond the backend's male and female — other (その他) and no answer (回答しない) — matching the prototype's form.

### C. Screen behaviour

- **FR-019**: The campaign list MUST render the prototype's eight columns in the prototype's order: identifier, name (with promo-code marker), code, brand, recruitment period, acceptance, applied plan, and a row-action menu. Identifier, name and recruitment period MUST be sortable.
- **FR-020**: The campaign list MUST provide free-text search on campaign name plus a collapsible filter panel containing brand, acceptance state (four choices including "all") and recruitment start and end date pickers, MUST show a count of active filters on the toggle, and MUST show a result banner summarising the active conditions with a clear action whenever any filter or search is active.
- **FR-021**: The campaign list MUST paginate with selectable page sizes and MUST report total count, total pages and the visible range.
- **FR-022**: Clicking a list row MUST open that campaign's detail. The row-action menu MUST offer edit and duplicate only; there is no delete action on the list or the detail screen.
- **FR-023**: The campaign detail MUST present three tabs — basic information, promotion codes, change history — and MUST honour a `tab` query parameter on load so a chosen tab can be deep-linked. Deep-linking is **inbound only**, matching the prototype: switching tabs by clicking does not rewrite the URL, and an unrecognised or absent `tab` value falls back to basic information.
- **FR-024**: The basic-information tab MUST use the prototype's layout: a row of summary cards, an enrollment-channel breakdown strip, then a 60/40 split with the read-only configuration cards on the left (the discount card shows a generated summary, the entry-fee discount and one main-contract / option field listing each discount by target — no per-month split, Session 2026-11-12) and the status panel, store-usage card and audit-metadata card on the right.
- **FR-025**: The campaign form MUST present the prototype's eight sections in the prototype's order, MUST display the "changes affect enrolled members" warning above the form, MUST mark required and optional fields explicitly, and MUST guard navigation away from unsaved changes. On the edit form the brand MUST be read-only, showing the saved brand, because the update API does not accept a brand; on create and duplicate it MUST stay selectable (Session 2026-10-21).
- **FR-026**: All write affordances — register, edit, duplicate, acceptance toggle — MUST be restricted to System and Headquarter roles. Manager and Staff MUST retain read access to the list and detail. Trainer and Observer MUST have no access.
- **FR-027**: Promotion-code issuing, disabling and CSV export MUST be available to System, Headquarter, Manager and Staff. `G-06` grants all four roles the issue / disable / effect-review set and states no export restriction, so none is imposed here; what differs by role is the _scope type_ they may issue (FR-036), not whether they may act at all.
- **FR-028**: Disabling a promotion code MUST require a free-text reason and MUST state that operator, timestamp and reason are recorded.
- **FR-029**: Every screen MUST distinguish loading, error, filtered-empty and truly-empty states, and MUST offer a way out on error: retry, or clearing the conditions when the API refused them (400 / 422). A list error MUST show the API's `userMessage` rather than a generic network sentence (Session 2026-11-05, G-06 Bug-No10).

### D. Promotion-code surface

The promotion-code tab is rebuilt against the real `Promotion_Code_Management` contract, replacing both the partial existing mock and the read-only preview array embedded in the campaign detail payload.

- **FR-030**: The promotion-code API MUST support listing codes filtered by campaign, scope type, brand, issuing store, creator, issuer type (headquarter / store staff, decided from the issuer's current role), effective status, code prefix and validity-window bounds, with pagination and the contract's sort keys. It MUST additionally accept the prototype's search box as a single term matching **either the code or the description**, and MUST expose the number of codes issued for the campaign **before** the other filters are applied (the campaign detail's `promotionCodeCount`), so the tab's footer figure does not move when the operator filters. A total-uses figure is not part of this feature (decision 2026-10-15).
- **FR-031**: The promotion-code API MUST support issuing a code and changing its status (disable and re-enable), recording the disable reason. Re-enable (G-06 FR-007, `action: re_enable`) takes no reason, is only available on a disabled code, and MUST be exposed in the tab as a **有効化** row action next to 無効化 (the prototype does not show it yet; the spec requires it regardless). Single-code retrieval is out of scope — the prototype has no code detail screen.
- **FR-033**: The promotion-code API MUST support CSV export accepting the same filter set as the list, but the screen exports **every code of the campaign** and does not forward the tab's active filters (decision 2026-10-15), with an optional creation-date range (`from` / `to`, no span limit; the screen sends none) and a character encoding (the screen fixes Shift_JIS with BOM).
- **FR-034**: The campaign detail payload MUST NOT carry an embedded promotion-code preview array; the tab MUST source its data from the promotion-code list endpoint, scoped by campaign.
- **FR-035**: A code's effective status MUST be derived as the real contract defines it: an explicitly disabled code reads disabled (this outranks every other state); otherwise, if the parent campaign is deleted or not accepting, the code reads campaign-unavailable; otherwise the code's own stored state decides — valid, expired or limit reached (the last two come from the persisted status, not from a read-time check). This yields five display states. Decision 2026-10-15 (PO): follow the real API and the original `G-06` requirement (a code becomes unusable when its campaign is disabled or deleted); the prototype's four-state list is superseded.
- **FR-036**: Promotion-code issuing MUST restrict the selectable scope type by the issuer's role, per `G-06`: System, Headquarter and Manager may issue both all-stores (type A, `brand_all`) and issuer-store-only (type B); Staff may issue **only** type B, and the scope type MUST be fixed to B for them rather than offered and then rejected. The issuing store MUST be required for type B and refused for type A. Only these two scope types exist (the OGF-only scope was removed in the 10/7 sync).
- **FR-038**: The promotion-code API MUST support editing an issued code's **description only** (`PATCH /promotion-codes/{id}/description`, up to 1,000 characters). The code string, parent campaign, brand, validity window, usage limit and scope type are immutable; changing any of them is done by disabling the code and issuing a new one (G-06 L172, API-089 §6a). The tab MUST expose the description edit as an **編集** row action that opens a dialog showing the immutable fields read-only and a single editable 説明 field.

### Key Entities

- **Campaign**: The master record for a time-limited enrollment offer. Identity, code, brand, remarks, acceptance flag, capacity limit, lock-in period, publication scope, the three periods (recruitment, usage, application), the applied plan, plan-level, per-option and entry-fee discounts, trigger-condition options, auto-granted options, referral settings, reference counts, display statistics and audit metadata. Selecting a campaign determines the member's plan — never the reverse.
- **Campaign Option Discount**: A discount targeting one option within a campaign, independently switchable for the first and second month, expressed as either a fixed amount or a percentage.
- **Campaign Auto Option**: An option automatically granted by the campaign, optionally restricted to selected genders.
- **Campaign Change History Entry**: One recorded modification — timestamp, operator, field, before value, after value.
- **Store Campaign Link**: The record that a given store has chosen to use a given campaign, with the date it was linked and by whom. Managed from the store screen; read-only from campaign management.
- **Promotion Code**: An advertising-channel code issued against a campaign, with its own validity window, usage limit, store scope (all stores or issuer store only), status, usage statistics and issuer. Distinct from the campaign's own code.
- **Plan**: The main contract a campaign applies to. Referenced, never authored here.
- **Option**: An add-on contract. Referenced as a discount target, a trigger condition, or an auto-grant target.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every element and state enumerated in the UI parity checklist is present in the built screens — zero unchecked items at completion.
- **SC-002**: Every field the real backend contract defines for a campaign is representable through the mock API with matching semantics and nullability; a field-by-field comparison yields no unexplained divergence.
- **SC-003**: Every field the prototype displays or captures is backed by the API — no screen renders a value the API cannot supply, and no form field is discarded on submit.
- **SC-004**: An operator can register a campaign exercising all eight form sections, and, after returning to the list, every value entered is visible unchanged on that campaign's detail screen.
- **SC-005**: An operator can locate a specific campaign among at least 200 records within three interactions (search or filter, then row click).
- **SC-006**: All six role behaviours defined by G-03's permission matrix hold on both the list and detail screens.
- **SC-007**: Every validation rule in the Edge Cases section produces an inline, field-anchored, Japanese-language error rather than a generic failure.
- **SC-008**: Existing consumers of campaign data elsewhere in the product (member contract tab, enrollment application flow, store detail) continue to function after the contract change.
- **SC-009**: On the edit form of any registered campaign, no content field can be changed, and an acceptance-flag, capacity-limit or publication change saves — with the API's specific message, never a silent success or a generic error, when the server refuses it.
- **SC-010**: Every promotion-code operation the prototype's tab performs is reachable through the API, and no screen still reads promotion-code data from the campaign detail payload.

## Assumptions

- **The prototype wins on conflicts with unresolved customer Q&A.** The user stated that outstanding questions sent to the customer are unconfirmed and that the work should proceed to handle everything exactly as the prototype does. Where the prototype and an unconfirmed question disagree, the prototype is authoritative and the divergence is recorded rather than blocked on.
- **Publication scope and store links are distinct concepts.** The prototype's detail screen shows both simultaneously — publication scope in the basic-information card and store usage in the right column — confirming they are separate. Publication scope is a campaign-owned setting; the store link is store-owned and read-only here.
- **The campaign code's naming rule is guidance, not validation.** G-03 FR-007 states the convention (store identifier plus five alphanumerics, or the OGF prefix plus five). The real contract declares the field free-form and optional, and the prototype presents the rule as descriptive helper text while enforcing only uniqueness. Uniqueness is enforced; format is not.
- **The end-of-recruitment advance notification (FR-S002) is out of scope.** It is a scheduled server-side job coordinated with I-03 notification management, not a campaign-screen behaviour.
- **Phase 2 content is out of scope.** The prototype gates total discount value (割引総額 / 割引合計) behind `currentPhase === "2"` in the summary cards, the promo-code table column and its summary footer. Those are the only Phase 2 renders in G-03, and the field is absent from the API as well as the screens. A/B test delivery (FR-C001) is likewise deferred.
- **Plans and options are read from their existing masters.** G-01 and G-02 own those records; this feature only references them.
- **The three-value acceptance display is derived, not stored.** Capacity-reached is computed from the application count against the capacity limit; the stored value remains the acceptance boolean, matching the real contract.
- **Campaigns are never deleted.** The prototype and G-03 offer no deletion; the operating rule is to stop acceptance and register a replacement. The list therefore has no deleted-record handling, no include-deleted parameter and no restore (restore was already dropped in the scope session).
- **Backend operations the prototype never calls are not built.** `API-088` and `Promotion_Code_Management` define more than the screens use. Endpoints with no interface behind them — usage probe, campaign delete, campaign restore, store-campaign link/unlink, promotion-code detail, promotion-code change history, promotion-code per-member usage — are deliberately left out rather than mocked speculatively.
- **Existing routes are preserved.** The screens remain at their current paths; this is a refactor of their contents, not a relocation.
- **Japanese remains the sole interface language.** All labels, validation messages and empty states are authored in Japanese, matching the prototype verbatim where the prototype supplies copy.
- **Master pickers read at most 100 records.** _(Mock-era. Real API: the option pickers page through the master 30 at a time with search; a saved option outside the loaded page keeps its name — Session 2026-11-05.)_ The plan, option and store selectors each request a single page capped at 100 — the ceiling the master endpoints accept before returning a validation error. Beyond 100 stores or options, the surplus is simply not offered, and there is no search-as-you-type fallback. This is a mock-phase limitation to revisit when the real masters are wired.
- **CSV export encoding is nominal in the mock.** _(Real export: the encoding is the backend's; the screen sends no date range and fixes the encoding to `sjis-bom`.)_ The export accepts a UTF-8 / Shift_JIS-with-BOM choice and honours the choice in the response, but the Shift_JIS option only prepends a byte-order mark — the payload itself stays UTF-8. Character-encoding correctness is a backend concern and must be re-verified against the real API rather than tested here.
- **Retired requirement numbers.** `FR-005`, `FR-006` and `FR-032` are intentionally unused. They covered endpoints removed in the scope session (and, for `FR-006`, campaign deletion removed in the 10/7 sync); the numbers were left as gaps rather than renumbered so cross-references elsewhere stay valid.
