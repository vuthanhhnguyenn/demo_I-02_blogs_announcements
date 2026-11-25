# UI Parity Checklist: Campaign Management Refactor (G-03)

**Purpose**: Verify the implemented screens reproduce every element and state of the V0 mockup.
**V0 Source**: `dx-fitness/fitness-crm-ui` @ `426a9b3` (2026-07-23) — `src/pages/campaign-list.tsx`, `src/pages/campaign-form.tsx`, `src/pages/campaign-detail.tsx`, `src/data/campaigns.ts`, `src/data/store-campaign-bindings.ts`
**Rule**: Tick an item `[x]` ONLY after confirming the element/state renders in the built screen and matches the V0 field set, order, and copy.
**Scope**: Phase 1 only. Items V0 gates behind `currentPhase === "2"` are marked **N/A: Phase 2** and pre-ticked — they are deliberately absent from both the screens and the API.

---

# Screen A — Campaign List (`campaign-list.tsx`)

## A1. Page header

- [ ] PAR001 Page title — `キャンペーン管理`, rendered outside the scroll container (sticky) — src: campaign-list.tsx:L170-172
- [ ] PAR002 Total-count badge — total campaign count shown beside the title — src: campaign-list.tsx:L173
- [ ] PAR003 Register action — role-gated button (`Headquarter`, `System` only), `Plus` icon + `新規登録`, navigates to the create form — src: campaign-list.tsx:L174-183

## A2. Toolbar — search and filter toggle

- [ ] PAR004 Search input — `Search` icon inside a left-padded field, placeholder `キャンペーン名で検索...`, max width 400px — src: campaign-list.tsx:L195-203
- [ ] PAR005 Search resets pagination — typing returns the list to page 1 — src: campaign-list.tsx:L201
- [ ] PAR006 Filter toggle button — `SlidersHorizontal` icon; label switches `詳細フィルター` ⇄ `閉じる`; variant switches `outline` → `default` when any filter is active — src: campaign-list.tsx:L205-219
- [ ] PAR007 Active-filter count badge — secondary badge on the toggle showing the number of active filters, hidden at zero — src: campaign-list.tsx:L213-217
- [ ] PAR008 Toggle chevron — `ChevronUp` when the panel is open, `ChevronDown` when closed — src: campaign-list.tsx:L218

## A3. Expandable filter panel

- [ ] PAR009 Panel visibility — filter row renders only while the toggle is open; wraps on narrow widths — src: campaign-list.tsx:L223-224
- [ ] PAR010 Brand select — options `全ブランド` / `JOYFIT` / `FIT365`; min-width 140px; resets page to 1 — src: campaign-list.tsx:L225-234
- [ ] PAR011 Acceptance select — options `全受付状況` / `受付中` / `受付停止` / `上限到達`; fixed 140px; resets page to 1 — src: campaign-list.tsx:L235-245
- [ ] PAR012 Recruitment-start date filter — inline label `募集開始日` + date picker, placeholder `開始日`, 140px — src: campaign-list.tsx:L247-250
- [ ] PAR013 Recruitment-end date filter — inline label `募集終了日` + date picker, placeholder `終了日`, 140px — src: campaign-list.tsx:L251-254
- [ ] PAR014 Active-filter highlight — any control holding a non-default value gets the primary-tinted border/background treatment — src: campaign-list.tsx:L93-97, L226, L236, L249, L253

## A4. Filter result banner

- [ ] PAR015 Banner visibility — shown whenever any filter is active OR the search box is non-empty — src: campaign-list.tsx:L259-265
- [ ] PAR016 Banner counts — reports filtered count against total count — src: campaign-list.tsx:L261-262
- [ ] PAR017 Banner summary composition — quoted search term, brand, acceptance state, `募集開始: {date}以降`, `募集終了: {date}以前`, joined with `・` — src: campaign-list.tsx:L154-162
- [ ] PAR018 Banner clear action — resets search, all four filters, and page to 1 — src: campaign-list.tsx:L145-152, L264

## A5. Table — header

- [ ] PAR019 Column order — exactly eight columns: `ID` → `キャンペーン名` → `コード` → `ブランド` → `募集期間` → `受付可否` → `適用主契約` → row-actions — src: campaign-list.tsx:L272-315
- [ ] PAR020 Sortable `ID` column — 80px, ghost sort button with `ArrowUpDown` icon that darkens on hover, tooltip `クリックで昇順ソート` — src: campaign-list.tsx:L272-284
- [ ] PAR021 Sortable `キャンペーン名` column — min 200px, same sort affordance and tooltip — src: campaign-list.tsx:L285-297
- [ ] PAR022 `コード` column — min 140px, not sortable — src: campaign-list.tsx:L298
- [ ] PAR023 `ブランド` column — 100px, not sortable — src: campaign-list.tsx:L299
- [ ] PAR024 Sortable `募集期間` column — 200px, same sort affordance and tooltip — src: campaign-list.tsx:L300-312
- [ ] PAR025 `受付可否` column — 100px, not sortable — src: campaign-list.tsx:L313
- [ ] PAR026 `適用主契約` column — min 140px, not sortable — src: campaign-list.tsx:L314
- [ ] PAR027 Actions column — 10-unit width, blank header — src: campaign-list.tsx:L315
- [ ] PAR028 Sticky header — header row pinned to the top of the scroll area with muted background — src: campaign-list.tsx:L271-272

## A6. Table — rows

- [ ] PAR029 Row click navigation — clicking anywhere on a row (outside the actions cell) opens that campaign's detail; cursor and hover styling applied — src: campaign-list.tsx:L335
- [ ] PAR030 ID cell — muted small text — src: campaign-list.tsx:L336
- [ ] PAR031 Name cell — medium-weight name text — src: campaign-list.tsx:L339
- [ ] PAR032 Promo-code marker — outline badge with `Ticket` icon and copy `コードあり`, shown only when the campaign has promotion codes — src: campaign-list.tsx:L340-345
- [ ] PAR033 Code cell — monospace `code` element on a muted rounded chip — src: campaign-list.tsx:L349
- [ ] PAR034 Brand cell — brand badge component (not a plain text label) — src: campaign-list.tsx:L352
- [ ] PAR035 Recruitment-period cell — `{start} 〜 {end}` on one line — src: campaign-list.tsx:L354
- [ ] PAR036 Acceptance badge — `受付中` success-tinted / `受付停止` muted / `上限到達` warning-tinted — src: campaign-list.tsx:L73-82, L355-359
- [ ] PAR037 Applied-plan cell — outline badge — src: campaign-list.tsx:L361
- [ ] PAR038 Actions cell isolation — clicks inside the actions cell do not trigger row navigation — src: campaign-list.tsx:L363
- [ ] PAR039 Row menu trigger — `MoreHorizontal` icon button, 8-unit square, hover background — src: campaign-list.tsx:L365-367
- [ ] PAR040 Row menu — edit — role-gated (`Headquarter`, `System`), `Pencil` icon, `編集`, opens the form — src: campaign-list.tsx:L370
- [ ] PAR041 Row menu — duplicate — role-gated, `Copy` icon, `複製`, opens the create form carrying the source campaign identifier — src: campaign-list.tsx:L372
- [ ] PAR042 Row menu — separator before the destructive action — src: campaign-list.tsx:L373
- [ ] PAR043 Row menu — delete — role-gated, `Trash2` icon, `削除`, destructive styling — src: campaign-list.tsx:L374

## A7. Table — empty state

- [ ] PAR044 Empty state spans the full table width (8 columns), centred — src: campaign-list.tsx:L320-321
- [ ] PAR045 Empty variant switching — `filtered` when a filter or search is active, `empty` otherwise; entity label `キャンペーン` — src: campaign-list.tsx:L322-324
- [ ] PAR046 Empty clear action — `条件をクリア` outline button rendered only in the filtered variant — src: campaign-list.tsx:L325-329

## A8. Pagination footer

- [ ] PAR047 Range summary — `全 {total} 件 / {pages} ページ / {from}-{to} を表示`, and `0` for `from` when the result set is empty — src: campaign-list.tsx:L387-389
- [ ] PAR048 Previous control — labelled `前へ`, disabled (pointer-events off, 50% opacity) on page 1 — src: campaign-list.tsx:L392-398
- [ ] PAR049 Next control — labelled `次へ`, disabled on the last page — src: campaign-list.tsx:L414-419
- [ ] PAR050 Page-number window — all pages when ≤7; `1 2 3 4 … last` near the start; `1 … last-3 … last` near the end; `1 … p-1 p p+1 … last` in the middle — src: campaign-list.tsx:L138-143
- [ ] PAR051 Ellipsis rendering — dedicated ellipsis items inside the page list — src: campaign-list.tsx:L400-401
- [ ] PAR052 Active page highlight — current page link marked active — src: campaign-list.tsx:L404-410
- [ ] PAR053 Page-size selector — label `表示件数` + select of `25` / `50` / `100` / `200`, each suffixed `件`; default **25**; changing it returns to page 1 — src: campaign-list.tsx:L99, L423-433 - **Parity waived on the default value (PO, 2026-07-28).** The V0 prototype defaults to `50`, but the default MUST be the app-wide `PAGE_SIZE` (`25`, `src/constants/app.constants.ts`) that every other list screen uses; cross-screen consistency takes precedence over prototype parity here. The option set and the return-to-page-1 behaviour are unchanged and still in parity. Raised as BUG-A-04 on the 2026-07-27 test pass and retracted 2026-07-28 — see TC-054 in `../tests/cases/TC -【Fitness CRM】- [G-03-A][Campaign List].md`.

---

# Screen B — Campaign Detail (`campaign-detail.tsx`)

## B1. Page header

- [ ] PAR054 Back link — `キャンペーン管理に戻る`, returns to the list — src: campaign-detail.tsx:L1047-1049
- [ ] PAR055 Title — campaign name — src: campaign-detail.tsx:L1050
- [ ] PAR056 Header status badge — outline badge with a leading dot; `上限到達` destructive-tinted / `受付中` success-tinted / `受付停止` muted; stays in sync with the status panel toggle — src: campaign-detail.tsx:L1032-1037, L1051-1056
- [ ] PAR057 Edit action — role-gated (`Headquarter`, `System`), `Pencil` icon + `編集` — src: campaign-detail.tsx:L1060-1063
- [ ] PAR058 Overflow menu — `MoreHorizontal` square trigger containing a single role-gated destructive `削除` item with `Trash2` icon — src: campaign-detail.tsx:L1064-1072

## B2. Tabs

- [ ] PAR059 Three tabs in order — `基本情報` / `プロモーションコード` / `変更履歴`, line variant — src: campaign-detail.tsx:L1082-1086
- [ ] PAR060 Deep-linkable tab — the initially selected tab is driven by an incoming parameter, not hard-coded — src: campaign-detail.tsx:L1027, L1081

## B3. Basic-information tab — summary strip

- [ ] PAR061 Summary card grid — three columns (the four-column variant is Phase 2, out of scope) — src: campaign-detail.tsx:L158
- [ ] PAR062 Summary card `適用会員数` — value with `名` suffix, default tone — src: campaign-detail.tsx:L159
- [ ] PAR063 Summary card `申請数` — value with `件` suffix, info tone — src: campaign-detail.tsx:L160
- [ ] PAR064 Summary card `今月の新規適用` — value with `名` suffix, success tone — src: campaign-detail.tsx:L161
- [x] PAR065 ~~Summary card `割引総額`~~ — **N/A: Phase 2** (`currentPhase === "2"`), excluded from scope — src: campaign-detail.tsx:L162-164
- [ ] PAR066 Enrollment-channel strip — single-row card, heading `入会経路別内訳`, three figures `モバイル` / `手動` / `紹介経由` separated by vertical rules, right-aligned caption `適用会員数 {n}名の内訳` — src: campaign-detail.tsx:L168-184

## B4. Basic-information tab — layout

- [ ] PAR067 Two-column split — left column 60% width, right column 40% — src: campaign-detail.tsx:L185-187, L413
- [ ] PAR068 Right column sticks to the top of the viewport while the left column scrolls — src: campaign-detail.tsx:L414

## B5. Left column — 基本情報 card

- [ ] PAR069 Card title `基本情報`; body laid out as a two-column field grid — src: campaign-detail.tsx:L191-194
- [ ] PAR070 Field `キャンペーンID` — src: campaign-detail.tsx:L195-198
- [ ] PAR071 Field `キャンペーン名` — src: campaign-detail.tsx:L199-202
- [ ] PAR072 Field `キャンペーンコード` — monospace chip on muted background — src: campaign-detail.tsx:L203-206
- [ ] PAR073 Field `ブランド` — primary-tinted outline badge — src: campaign-detail.tsx:L207-210
- [ ] PAR074 Field `公開店舗` — all-stores state renders a single `全店舗に公開` badge — src: campaign-detail.tsx:L212-215
- [ ] PAR075 Field `公開店舗` — specific-stores state renders an info-tinted `特定店舗のみ` badge followed by one badge per target store — src: campaign-detail.tsx:L216-223
- [ ] PAR076 Field `先着件数上限` — `先着{cap}件（残り{remaining}件）`, remaining floored at zero — src: campaign-detail.tsx:L147, L226-229
- [ ] PAR077 Field `備考` — spans both grid columns — src: campaign-detail.tsx:L230-233

## B6. Left column — 割引設定 card

- [ ] PAR078 Card title `割引設定` — src: campaign-detail.tsx:L241
- [x] PAR079 ~~Field `割引概要` — spans both columns~~ — **WAIVED 2026-07-29**: mockup filler. The prototype's form has no input for it, its detail hardcodes the literal `初月半額` (campaign-detail.tsx:L247), and its own `discountSummary` seed value differs from what the detail renders and is read by no screen. Our API has no such field. Implementing it would duplicate `月額割引（初月）`/`（翌月）` directly beneath, which is what the form actually captures. Raised as `BUG-B1-02` on G-03-B1 / TC-033, then waived — src: campaign-detail.tsx:L245-248
- [x] PAR079a Field `主契約・オプション割引` — **ADDED beyond the prototype, intentionally**: the prototype's detail has no option-discount field, but `PAR204` lets the form author per-option discounts, so our detail renders the plan discount and `campaign.campaignOptionDiscounts` in one field (target name + amount or %, no month split since 2026-11-12). Without it that data would be invisible — src: campaign-form.tsx:L558-571 (author side), basic-info-tab.tsx (display side)
- [x] PAR080 ~~Field `月額割引（初月）`~~ — **WAIVED 2026-11-12 (customer, Dev Q&A 「キャンペーンの割引適用条件に関して」)**: the discount months are decided only by the apply window (`適用開始月` + `適用期間`); the per-month split is retired (BE 3d2230c4 ignores `planDiscountMonth1/2` / `discountMonth1/2`). The prototype still shows it; see spec.md Session 2026-11-12. Replaced by the single `主契約・オプション割引` field (PAR079a) — src: campaign-detail.tsx:L249-252
- [x] PAR081 ~~Field `月額割引（翌月）` — renders `なし` when unset~~ — **WAIVED 2026-11-12 (customer, Dev Q&A 「キャンペーンの割引適用条件に関して」)**: the discount months are decided only by the apply window (`適用開始月` + `適用期間`); the per-month split is retired (BE 3d2230c4 ignores `planDiscountMonth1/2` / `discountMonth1/2`). The prototype still shows it; see spec.md Session 2026-11-12. Replaced by the single `主契約・オプション割引` field (PAR079a) — src: campaign-detail.tsx:L253-256

## B7. Left column — 適用条件 card

- [ ] PAR082 Card title `適用条件` — src: campaign-detail.tsx:L264
- [ ] PAR083 Field `対象契約` — spans both columns, renders one outline badge per contract — src: campaign-detail.tsx:L268-274
- [ ] PAR084 Field `適用主契約` — label carries a jargon tooltip on the term 主契約; value is an outline badge — src: campaign-detail.tsx:L275-278

## B8. Left column — 期間設定 card

- [ ] PAR085 Card title `期間設定`; four stacked sub-blocks — src: campaign-detail.tsx:L286-289
- [ ] PAR086 Sub-block `募集期間` — `開始日` and `終了日` fields — src: campaign-detail.tsx:L291-303
- [ ] PAR087 Sub-block `利用開始期間` — `開始日` and `終了日` fields — src: campaign-detail.tsx:L305-317
- [ ] PAR088 Sub-block `キャンペーン適用期間` — `適用開始月` and `適用期間` fields — src: campaign-detail.tsx:L319-331
- [ ] PAR089 Start-month formatting — `初月（利用開始月）` / `翌月（利用開始月の翌月）` / `{n}ヶ月目から` for the three start-month types — src: campaign-detail.tsx:L120-124, L324
- [ ] PAR090 Duration formatting — `{n}ヶ月（利用開始日起算）` — src: campaign-detail.tsx:L328
- [ ] PAR091 Sub-block `縛り期間（解約手数料期間）` — `期間` in months and a worked `適用例` — src: campaign-detail.tsx:L332-344
- [ ] PAR092 Lock-in footnote — `JOYFIT自動移籍判定でこの値が参照されます` — src: campaign-detail.tsx:L345

## B9. Left column — 自動付与設定 card

- [ ] PAR093 Card title `自動付与設定` — src: campaign-detail.tsx:L354
- [ ] PAR094 Field `自動付与` — success-tinted `あり` badge — src: campaign-detail.tsx:L358-361
- [ ] PAR095 Field `付与対象` — `全員` or `条件あり` — src: campaign-detail.tsx:L362-365
- [ ] PAR096 Field `性別条件` — one gender-tinted badge per selected gender — src: campaign-detail.tsx:L366-372
- [ ] PAR097 Field `付与オプション` — one outline badge per granted option — src: campaign-detail.tsx:L373-379

## B10. Left column — 紹介キャンペーン特典 card

- [ ] PAR098 Card title `紹介キャンペーン特典` — src: campaign-detail.tsx:L387
- [ ] PAR099 Field `友達紹介連動` — success-tinted `あり` badge — src: campaign-detail.tsx:L391-394
- [ ] PAR100 Field `紹介者へのポイント付与` — `{n}pt / 紹介成立ごと` — src: campaign-detail.tsx:L395-398
- [ ] PAR101 Field `段階的増加` — describes the tier threshold and its value — src: campaign-detail.tsx:L399-402
- [ ] PAR102 Field `ポイントリセット` — `毎年3/31にリセット` — src: campaign-detail.tsx:L403-406

## B11. Right column — status panel

- [ ] PAR103 Status panel tone — destructive when at capacity, success when accepting, muted when stopped; `Megaphone` icon — src: campaign-detail.tsx:L418-421
- [ ] PAR104 Status panel label — `上限到達` / `受付中` / `受付停止` — src: campaign-detail.tsx:L421
- [ ] PAR105 Meta line 1 — `先着件数上限: {cap}件（申請 {n}件 / 残り {r}件）` — src: campaign-detail.tsx:L423
- [ ] PAR106 Meta line 2 — `募集期間: {start} 〜 {end}` — src: campaign-detail.tsx:L424
- [ ] PAR107 Meta line 3 — `上限到達のためシステムが自動で受付可否フラグをOFFにしました` at capacity, otherwise `OFFで入会フローから非表示` — src: campaign-detail.tsx:L425-427
- [ ] PAR108 Control suppressed at capacity — no stop/resume button is rendered once the cap is reached — src: campaign-detail.tsx:L429
- [ ] PAR109 Stop/resume trigger — full-width role-gated (`Headquarter`, `System`) outline button, label `受付を停止する` ⇄ `受付を再開する` — src: campaign-detail.tsx:L432-438
- [ ] PAR110 Confirm dialog title — `このキャンペーンの受付を停止しますか？` ⇄ `このキャンペーンの受付を再開しますか？` — src: campaign-detail.tsx:L441-443
- [ ] PAR111 Confirm dialog body — stop copy mentions removal from the enrollment flow and no impact on existing members; resume copy mentions re-appearance — src: campaign-detail.tsx:L444-448
- [ ] PAR112 Confirm dialog footer — `キャンセル` plus `停止する` ⇄ `再開する` — src: campaign-detail.tsx:L450-463
- [ ] PAR113 Confirmation feedback — success toast with a matching description; both the panel and the header badge update — src: campaign-detail.tsx:L452-459

## B12. Right column — 店舗での利用 card

- [ ] PAR114 Card visibility — rendered only for store-scoped sessions; absent for all-stores sessions — src: campaign-detail.tsx:L471
- [ ] PAR115 Card title `店舗での利用`; field label `現在の店舗（{storeName}）` — src: campaign-detail.tsx:L474, L479
- [ ] PAR116 Usage state — `Link2` icon + `利用中` when linked, `Link2Off` + `未利用` when not — src: campaign-detail.tsx:L480-487
- [ ] PAR117 Helper copy — `利用設定は店舗管理の契約・料金タブで行います` — src: campaign-detail.tsx:L489
- [ ] PAR118 Cross-link — link-style button `店舗管理で設定` with `ArrowRight`, opening the store detail on its contract/pricing tab — src: campaign-detail.tsx:L490-498
- [ ] PAR119 No write affordance — the card offers no link/unlink control of its own — src: campaign-detail.tsx:L469-470

## B13. Right column — その他情報 card

- [ ] PAR120 Card title `その他情報` — src: campaign-detail.tsx:L507
- [ ] PAR121 Field `作成日時` — src: campaign-detail.tsx:L511-514
- [ ] PAR122 Field `更新日時` — src: campaign-detail.tsx:L515-518
- [ ] PAR123 Field `作成者` — circular initial avatar plus the operator name — src: campaign-detail.tsx:L519-525

## B14. Promotion-code tab — toolbar

- [ ] PAR124 Search field — `Search` icon, placeholder `コード・説明で検索`, matches both code and description — src: campaign-detail.tsx:L584-593, L606-615
- [ ] PAR125 Status filter — `すべてのステータス` / `有効` / `期限切れ` / `上限到達` / `無効` — src: campaign-detail.tsx:L616-627
- [ ] PAR126 Issuer filter — `すべての発行者` / `本部` / `店舗スタッフ` — src: campaign-detail.tsx:L629-638
- [ ] PAR127 Result count — `{filtered}件 / {total}件` — src: campaign-detail.tsx:L639
- [ ] PAR128 CSV export — role-gated (`Headquarter`, `System`, `Manager`), `FileDown` icon + `CSV出力` — src: campaign-detail.tsx:L641-645
- [ ] PAR129 Issue button — role-gated (`Headquarter`, `System`, `Manager`, `Staff`), `Plus` icon + `コード発行` — src: campaign-detail.tsx:L656-662

## B15. Promotion-code tab — issue dialog

- [ ] PAR130 Dialog title `プロモーションコードを発行` — src: campaign-detail.tsx:L666
- [ ] PAR131 Dialog description — states the naming rule (store identifier + five alphanumerics; OGF + five) and automatic uniqueness checking — src: campaign-detail.tsx:L667-670
- [ ] PAR132 Field `紐づけキャンペーン` — select, placeholder `キャンペーンを選択`, positioned first — src: campaign-detail.tsx:L673-688
- [ ] PAR133 Field `コード` — monospace input, placeholder `例: STR01-ABCDE（手動入力 or 自動生成）` — src: campaign-detail.tsx:L690-699
- [ ] PAR134 Auto-generate button — `Sparkles` icon + `自動生成`, fills the code input with a rule-conforming value — src: campaign-detail.tsx:L542-549, L700-709
- [ ] PAR135 Code helper copy — `手動入力時は保存前に全コードと重複チェックを行います` — src: campaign-detail.tsx:L711
- [ ] PAR136 Field `説明` — carries the optional marker — src: campaign-detail.tsx:L713-716
- [ ] PAR137 Field `有効期間` — two date pickers separated by `〜`, placeholders `開始日` / `終了日` — src: campaign-detail.tsx:L717-725
- [ ] PAR138 Field `使用上限` — input with placeholder `例: 100（空欄で無制限）` — src: campaign-detail.tsx:L726-730
- [ ] PAR139 Field `適用店舗タイプ` — select with `タイプA: 全店舗で使用可能（本部のみ設定可）` and `タイプB: 発行店舗のみで使用可能` — src: campaign-detail.tsx:L731-743
- [ ] PAR140 Dialog footer — `キャンセル` plus `発行する`; confirming raises a success toast and closes the dialog — src: campaign-detail.tsx:L745-748
- [ ] PAR141 Dialog reset on close — code and linked-campaign inputs clear when the dialog is dismissed — src: campaign-detail.tsx:L650-653

## B16. Promotion-code tab — table

- [ ] PAR142 Column order — `コード` → `説明` → `有効期間` → `使用済み / 使用上限` → `残数` → `使用率` → `適用店舗` → `ステータス` → row-actions (`割引合計` is Phase 2, out of scope) — src: campaign-detail.tsx:L756-771
- [ ] PAR143 Code cell — monospace chip plus a copy button — src: campaign-detail.tsx:L788-803
- [ ] PAR144 Copy feedback — the icon switches from `Copy` to a success-tinted `Check` for two seconds after copying — src: campaign-detail.tsx:L571-575, L797-801
- [ ] PAR145 Usage cell — used count in medium weight, ` / {limit}` muted — src: campaign-detail.tsx:L807-810
- [ ] PAR146 Remaining cell — `limit − used`, floored at zero; a dash when the code is unlimited — src: campaign-detail.tsx:L782-785, L812
- [ ] PAR147 Usage-rate cell — rounded whole-percent value; a dash when the code is unlimited; zero when the limit is zero — src: campaign-detail.tsx:L814-823
- [ ] PAR148 Store-scope cell — outline badge (`全店舗` / `発行店舗のみ`) — src: campaign-detail.tsx:L824-826
- [ ] PAR149 Status badge — four-way colouring: `有効` success / `期限切れ` warning / `上限到達` destructive / `無効` muted — src: campaign-detail.tsx:L776-780, L827-831
- [ ] PAR150 Inactive row dimming — rows in `無効`, `期限切れ` or `上限到達` render at reduced opacity — src: campaign-detail.tsx:L787
- [x] PAR151 ~~Discount-total column~~ — **N/A: Phase 2** (`currentPhase === "2"`), excluded from scope — src: campaign-detail.tsx:L767-769, L832-834
- [x] PAR152 ~~Row menu — edit — `Pencil` icon + `編集`~~ — **WAIVED 2026-07-29 (PO)**: an already-issued promotion code must not be editable, because changing its terms would retroactively alter what members were offered; `無効化` is the only permitted lifecycle action. The build correctly ships a menu with `無効化` only. Raised as `BUG-B2-09` on G-03-B2 / TC-057, then waived — src: campaign-detail.tsx:L841
- [ ] PAR153 Row menu — disable — `Ban` icon + `無効化`, destructive, disabled when the code is already `無効` — src: campaign-detail.tsx:L844-850

## B17. Promotion-code tab — summary footer

- [ ] PAR154 Issued count — `Ticket` icon + `発行数: {n}件` — src: campaign-detail.tsx:L861-864
- [ ] PAR155 Total uses — `UserCheck` icon + `総利用: {n}回`, summed across all codes — src: campaign-detail.tsx:L596, L866-869
- [x] PAR156 ~~Discount total in the summary footer~~ — **N/A: Phase 2** (`currentPhase === "2"`), excluded from scope — src: campaign-detail.tsx:L871-879

## B18. Promotion-code tab — disable dialog

- [ ] PAR157 Dialog title `このプロモーションコードを無効化しますか？` — src: campaign-detail.tsx:L896
- [ ] PAR158 Dialog description — states that members entering the code will see an invalid-code error and that operator, timestamp and reason are recorded — src: campaign-detail.tsx:L897-899
- [ ] PAR159 Target-code display — labelled `対象コード`, shown as a monospace chip — src: campaign-detail.tsx:L903-906
- [ ] PAR160 Reason field — labelled `無効化理由（操作履歴に記録）`, three-row textarea, placeholder `例: 想定上限を超過したため早期終了` — src: campaign-detail.tsx:L907-916
- [ ] PAR161 Confirm gating — `無効化する` stays disabled until the reason contains non-whitespace text — src: campaign-detail.tsx:L921
- [ ] PAR162 Dialog reset — dismissing clears both the target and the typed reason — src: campaign-detail.tsx:L886-892

## B19. Change-history tab

- [ ] PAR163 Column order — `更新日時` (160px) → `操作者` (100px) → `変更フィールド` (120px) → `変更前` → arrow spacer (12 units) → `変更後` — src: campaign-detail.tsx:L976-983
- [ ] PAR164 Timestamp and operator cells — small text — src: campaign-detail.tsx:L988-989
- [ ] PAR165 Changed-field cell — medium weight; renders an em-dash when the entry has no field (creation) — src: campaign-detail.tsx:L990-992
- [ ] PAR166 Before cell — badge when the entry supplies one, plain text when it supplies a value, em-dash when neither — src: campaign-detail.tsx:L993-1004
- [ ] PAR167 Arrow separator — centred `ArrowRight` between before and after — src: campaign-detail.tsx:L1005-1007
- [ ] PAR168 After cell — badge form (with optional leading dot) or medium-weight text — src: campaign-detail.tsx:L1008-1017
- [ ] PAR169 Creation entry — no changed field, no before value, and an info-tinted `新規作成` badge in the after column — src: campaign-detail.tsx:L964-969

---

# Screen C — Campaign Form (`campaign-form.tsx`)

## C1. Page frame

- [ ] PAR170 Back link — `キャンペーン管理に戻る`, routed through the unsaved-changes guard — src: campaign-form.tsx:L227-232
- [ ] PAR171 Title — `キャンペーン 新規登録` — src: campaign-form.tsx:L233
- [ ] PAR172 Impact warning — warning-tinted alert with `AlertTriangle` icon, copy `実施中のキャンペーンを変更すると、適用中の会員にも影響します。`, placed above the form — src: campaign-form.tsx:L239-244
- [ ] PAR173 Content width — form constrained to 960px and centred — src: campaign-form.tsx:L238, L246
- [ ] PAR174 Field markers — required fields carry the required marker, optional fields carry the optional marker — src: campaign-form.tsx:L76-95
- [ ] PAR175 Section order — eight cards: 基本情報 → 公開店舗設定 → 期間設定 → 適用主契約・適用条件 → 割引設定 → 紹介キャンペーン設定 → 自動付与設定 → 受付可否 — src: campaign-form.tsx:L249, L340, L390, L482, L531, L713, L784, L872

## C2. Section 1 — 基本情報

- [ ] PAR176 Field `キャンペーン名` — required, placeholder `例: 春の入会キャンペーン` — src: campaign-form.tsx:L255-262
- [ ] PAR177 Field `キャンペーンコード` — description states the naming rule for both store and OGF forms; placeholder `例: STR01-A1B2C` — src: campaign-form.tsx:L265-276
- [ ] PAR178 Code helper copy — `登録時にユニーク性を自動チェックします` — src: campaign-form.tsx:L277
- [ ] PAR179 Field `ブランド` — required select, placeholder `ブランドを選択`, options `JOYFIT` / `FIT365` — src: campaign-form.tsx:L282-292
- [ ] PAR180 Field `先着件数上限` — optional; description explains automatic acceptance-off and the `上限到達` list status; numeric input (min 1, 28-unit width) with a `件` suffix — src: campaign-form.tsx:L295-311
- [ ] PAR181 Field `縛り期間（解約手数料期間）` — optional; description explains exclusion from automatic transfer; numeric input (min 0) with a `ヶ月` suffix — src: campaign-form.tsx:L314-330
- [ ] PAR182 Field `備考` — three-row textarea, placeholder `キャンペーンの目的や概要を入力してください` — src: campaign-form.tsx:L332-334

## C3. Section 2 — 公開店舗設定

- [ ] PAR183 Field `公開範囲` — required radio group, options `全店舗公開` / `特定店舗のみ公開`, stacked vertically — src: campaign-form.tsx:L346-369
- [ ] PAR184 Scope description — mentions new-store-opening campaigns as the reason to choose the specific-stores option — src: campaign-form.tsx:L349
- [ ] PAR185 Field `公開対象店舗` — appears only when the specific-stores scope is selected; required multi-select store picker with placeholder `店舗を選択してください` — src: campaign-form.tsx:L371-384
- [ ] PAR186 Scope switch clears selection — choosing all-stores empties any previously selected stores — src: campaign-form.tsx:L353-357

## C4. Section 3 — 期間設定

- [ ] PAR187 Sub-section `募集期間` — bold label plus description `キャンペーンがモバイルに表示される期間` — src: campaign-form.tsx:L397-399
- [ ] PAR188 Recruitment dates — required `開始日` and `終了日` pickers in a two-column grid — src: campaign-form.tsx:L400-407
- [ ] PAR189 Separator between period sub-sections — src: campaign-form.tsx:L410, L426
- [ ] PAR190 Sub-section `利用開始期間` — bold label plus description `各種契約の利用開始日として指定可能な期間` — src: campaign-form.tsx:L413-415
- [ ] PAR191 Usage dates — required `開始日` and `終了日` pickers in a two-column grid — src: campaign-form.tsx:L416-423
- [ ] PAR192 Sub-section `キャンペーン適用期間` — bold label plus description `割引等が適用される期間（利用開始日起算）` — src: campaign-form.tsx:L430-433
- [ ] PAR193 Field `適用開始月` — required horizontal radio group: `初月（利用開始月）` / `翌月（利用開始月の翌月）` / `X月指定` — src: campaign-form.tsx:L434-448
- [ ] PAR194 Custom-month input — appears only when `X月指定` is selected; numeric (min 1, 24-unit width) with a `ヶ月目から` suffix — src: campaign-form.tsx:L449-461
- [ ] PAR195 Field `適用期間` — required, description `利用開始日起算`, numeric input (min 1) with a `ヶ月` suffix — src: campaign-form.tsx:L463-475

## C5. Section 4 — 適用主契約・適用条件

- [ ] PAR196 Field `割引適用先の主契約（1件）` — required select, placeholder `主契約を選択`, description explains that campaign selection determines the plan — src: campaign-form.tsx:L488-503
- [ ] PAR197 Separator between the plan field and the condition field — src: campaign-form.tsx:L505
- [ ] PAR198 Field `適用発動条件のオプション契約（複数選択可）` — description gives the combined-enrollment example — src: campaign-form.tsx:L507-510
- [ ] PAR199 Condition options — three-column checkbox grid over the available options — src: campaign-form.tsx:L511-524

## C6. Section 5 — 割引設定

- [ ] PAR200 Intro copy — states that discount amount or rate is set per plan and per option ~~, and that only the first and second month may be configured~~ (month clause dropped 2026-11-12, see PAR201) — src: campaign-form.tsx:L537
- [x] PAR201 ~~First-month block header — bold label `初月`, description `利用開始月に割引を適用`, switch aligned right~~ — **WAIVED 2026-11-12 (customer, Dev Q&A 「キャンペーンの割引適用条件に関して」)**: the discount months are decided only by the apply window (`適用開始月` + `適用期間`); the per-month split is retired (BE 3d2230c4 ignores `planDiscountMonth1/2` / `discountMonth1/2`). The prototype still shows it; see spec.md Session 2026-11-12. The form has one row set under the `割引を設定する` switch — src: campaign-form.tsx:L541-551
- [ ] PAR202 Discount rows appear only while the `割引を設定する` switch is on, indented behind a left rule (was the first-month switch before 2026-11-12) — src: campaign-form.tsx:L553-554
- [ ] PAR203 Row layout — four columns: target select (140px), amount, rate, remove control — src: campaign-form.tsx:L557
- [ ] PAR204 Row field `対象` — select with `主契約` / `オプション`; label rendered on the first row only — src: campaign-form.tsx:L558-571
- [ ] PAR205 Row field `割引額（円）` — numeric input, placeholder `例: 3000`, `円` suffix; label on the first row only — src: campaign-form.tsx:L572-582
- [ ] PAR206 Row field `割引率（%）` — numeric input, placeholder `例: 50`, `%` suffix; label on the first row only — src: campaign-form.tsx:L583-593
- [ ] PAR207 Row remove control — `×` ghost button that turns destructive on hover; hidden while only one row remains — src: campaign-form.tsx:L594-606
- [ ] PAR208 Add-row control — outline button `+ 対象を追加`; new rows default to the option target — src: campaign-form.tsx:L177-180, L610-618
- [x] PAR209 ~~Separator between the first-month and second-month blocks~~ — **WAIVED 2026-11-12 (customer, Dev Q&A 「キャンペーンの割引適用条件に関して」)**: the discount months are decided only by the apply window (`適用開始月` + `適用期間`); the per-month split is retired (BE 3d2230c4 ignores `planDiscountMonth1/2` / `discountMonth1/2`). The prototype still shows it; see spec.md Session 2026-11-12 — src: campaign-form.tsx:L623
- [x] PAR210 ~~Second-month block — bold label `翌月`, description `利用開始月の翌月に割引を適用`, and an independent row set with the same four fields and controls~~ — **WAIVED 2026-11-12 (customer, Dev Q&A 「キャンペーンの割引適用条件に関して」)**: the discount months are decided only by the apply window (`適用開始月` + `適用期間`); the per-month split is retired (BE 3d2230c4 ignores `planDiscountMonth1/2` / `discountMonth1/2`). The prototype still shows it; see spec.md Session 2026-11-12 — src: campaign-form.tsx:L626-707

## C7. Section 6 — 紹介キャンペーン設定

- [ ] PAR211 Master switch — label `紹介キャンペーンとして設定する`, description referencing the app's friend-invitation feature — src: campaign-form.tsx:L719-729
- [ ] PAR212 Sub-fields appear only while the switch is on, preceded by a separator — src: campaign-form.tsx:L731-733
- [ ] PAR213 Field `紹介者への特典ポイント` — required, description `紹介成立1件ごとに紹介者へ付与するポイント`, numeric input (min 0) with a `ポイント` suffix — src: campaign-form.tsx:L734-752
- [ ] PAR214 Toggle `段階的増加` — description `紹介人数に応じて付与ポイントを段階的に増やします` — src: campaign-form.tsx:L754-764
- [ ] PAR215 Toggle `ポイント年次リセット` — description `紹介者特典ポイントを毎年3/31にリセットします`; defaults to on — src: campaign-form.tsx:L134, L766-776

## C8. Section 7 — 自動付与設定

- [ ] PAR216 Master switch — label `自動付与する`, description `条件を満たした会員にオプションを自動で付与します` — src: campaign-form.tsx:L790-800
- [ ] PAR217 Sub-fields appear only while the switch is on, preceded by a separator — src: campaign-form.tsx:L802-804
- [ ] PAR218 Field `付与対象` — horizontal radio group `全員` / `条件あり`, defaulting to `全員` — src: campaign-form.tsx:L805-816
- [ ] PAR219 Field `性別条件` — appears only under `条件あり`; three checkboxes `男性` / `女性` / `その他` — src: campaign-form.tsx:L818-847
- [ ] PAR220 Field `自動付与オプション` — three-column checkbox grid over the available options — src: campaign-form.tsx:L849-864

## C9. Section 8 — 受付可否

- [ ] PAR221 Field label `キャンペーンの受付可否` with description covering both manual OFF behaviour and automatic OFF on reaching the capacity limit — src: campaign-form.tsx:L878-881
- [ ] PAR222 Toggle presentation — `停止` text, switch, `受付中` text, laid out horizontally; defaults to accepting — src: campaign-form.tsx:L148, L882-886

## C10. Footer and validation behaviour

- [ ] PAR223 Footer error summary — `未入力の項目があります`, destructive, left-aligned, shown only after a failed submit — src: campaign-form.tsx:L893-895
- [ ] PAR224 Cancel button — large outline, routed through the unsaved-changes guard — src: campaign-form.tsx:L896
- [ ] PAR225 Submit button — large, role-gated to `Headquarter` and `System`, label `登録する` — src: campaign-form.tsx:L898
- [ ] PAR226 Validation — name required (`キャンペーン名を入力してください`) — src: campaign-form.tsx:L157
- [ ] PAR227 Validation — code uniqueness against existing campaigns (`このコードは既に使われています`) — src: campaign-form.tsx:L158-160
- [ ] PAR228 Validation — brand required (`ブランドを選択してください`) — src: campaign-form.tsx:L161
- [ ] PAR229 Validation — referral points required when referral settings are enabled (`紹介者への特典ポイントを入力してください`) — src: campaign-form.tsx:L162
- [ ] PAR230 Invalid-field marking — failing fields receive the invalid ARIA state so they render with error styling — src: campaign-form.tsx:L260, L275, L284, L748
- [ ] PAR231 Scroll-to-first-error — after a failed submit the first invalid field is smoothly scrolled to the centre of the viewport — src: campaign-form.tsx:L206-209
- [ ] PAR232 Error clearing — an inline error clears as soon as the operator supplies a valid value for that field — src: campaign-form.tsx:L259, L274, L283, L747
- [x] PAR233 Successful submit — success toast `キャンペーンを登録しました`, dirty state cleared, navigation back to the list (create and duplicate; edit returns to the detail). ~~→ navigation to the DETAIL of the newly created campaign (PO ruling 2026-07-29)~~ — overturned 2026-10-28 by customer bug G-03\_不具合\_No2 (expected: list after registration); the build now does `router.push(backToListHref)`. Toast and dirty-clear clauses also apply — src: campaign-form.tsx:L212-216
- [ ] PAR234 Dirty tracking — every field interaction marks the form dirty — src: campaign-form.tsx:L153

## C11. Unsaved-changes dialog

- [ ] PAR235 Dialog title `変更を破棄しますか？` — src: campaign-form.tsx:L909
- [ ] PAR236 Dialog body `未保存の変更はすべて失われます。この操作は取り消せません。` — src: campaign-form.tsx:L910-912
- [ ] PAR237 Dialog footer — `編集を続ける` (cancel) and `破棄する` (confirm) — src: campaign-form.tsx:L915-916
- [ ] PAR238 Guard coverage — the dialog fires from both the back link and the cancel button — src: campaign-form.tsx:L230, L896

---

## Coverage note

238 items across three screens; 3 are **N/A: Phase 2** (PAR065, PAR151, PAR156), leaving **235 in scope**. Items PAR074–PAR076, PAR091–PAR092, PAR098–PAR102, PAR032, PAR036, PAR066, PAR103–PAR108, PAR163–PAR169, PAR180–PAR186, PAR198–PAR199, PAR211–PAR215 and PAR219 depend on fields the real backend contract does not yet define (see spec requirements FR-010 – FR-018) — they are still mandatory for parity and must be served by the mock-ahead extensions.
