# Feature Specification: Store Master Detail (Y-02 FR-002〜FR-008)

**Feature Branch**: `026-store-list` (written into the currently open branch by request — no new branch)
**Created**: 2026-08-28
**Status**: Draft
**Updated**: 2026-11-13 — 受付設定 card on 基本情報 and its history wording (Y-02 261112_v11; see Clarifications → Session 2026-11-13); 2026-10-29 — the Sheet's YOGA fee label reads YOGA利用料金（1日・税別）instead of the prototype's （1日・税込）: `yogaUsageFee` is tax-excluded (API-084 v0.9, kept tax-excluded by BE migration 050), user decision; 2026-10-02 — synced to prototype `47423ec` and Y-02 260928_v6 (see Clarifications → Session 2026-10-02)
**PO Spec**: `Y-02` — 店舗管理（マスタ）
**Source**:

| Role         | Reference                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requirement  | `dx-fitness/fitness-spec` → `crm/requirements/Y-02.md` @ `4655aea` (2026-09-28, doc version 260928_v6 — FR-005 判定ルール added). Drafted @ `b53dd30` (260803_v5)                                                                                                                                                                                                                                                  |
| UI prototype | `dx-fitness/fitness-crm-ui` → `src/pages/store-detail.tsx` @ `47423ec` (2026-09-30), 2,735 lines — last touched `3a6c29b` (9/30). Drafted @ `c1c7e2e` (2026-08-05, 1,977 lines); deltas `6bc1f1c` (9/8), `a7d0c88` (9/16), `1767864` (9/17), `e5501a3` (9/26), `3a6c29b` (9/30) in Session 2026-10-02. Linked screen: `src/pages/store-map-setup.tsx` (own sub-spec `specs/026-store-management/store-map-setup/`) |
| API design   | Backend dev Swagger — `API-083 Admin - Store Master`, `API-084 Admin - Store Sales & Mutual-Use`, `API-088 §10-12` (store↔campaign links). Verified against `/docs-json` on 2026-08-28                                                                                                                                                                                                                             |
| Prior QA     | `api-review-output/admin-store-master-api-083/` (#45, #204, #206, #207, #208) · `api-review-output/admin-store-sales-mutual-use-api-084/` (#52, #80, #82, #209, #212, #213, #225)                                                                                                                                                                                                                                  |
| Sibling spec | `specs/026-store-list/spec.md` — the list screen this detail screen is opened from                                                                                                                                                                                                                                                                                                                                 |

**Input**: User description: "Create spec for screen store detail — Phase 1 only; history is seed-only (no create/update/delete of history); use the backend API design to build the mock API inside this project; strict grounding on the UI code and the requirement spec; mark mismatches with [NEED CLARIFICATION] and consolidate them into a Q&A section for `/speckit.clarify`."

---

## Overview

The store detail screen is the read surface of the store master. It opens on one store — reached from the store list (026) or by direct link — and presents everything the CRM holds about that store across six tabs: 基本情報 (identity, address, organisation, lifecycle status, photos), 営業設定 (operating calendar, weekly hours incl. the 祝日 override, staff-resident hours, 特別営業日 and 臨時休業日), 契約・料金 (which plans, options and campaigns the store sells, plus per-date 1DayPass prices), 入退館設定 (brand-dependent mutual-use acceptance and entry parameters), 店舗マップ (the saved floor map with its locker placement, read-only) and 変更履歴 (the audit trail required by Y-02 FR-008).

It covers Y-02 FR-002 (basic information — the read half; the write half lives in the store form), FR-003 (sales settings), FR-004 (mutual-use settings), FR-005 (operating calendar), FR-006 (store map — the read-only view and the entry point to 店舗マップ設定; the editor itself is `specs/026-store-management/store-map-setup/`), FR-007 (closure date as a displayed field) and FR-008 (change history). ~~FR-006 is gated behind Phase 2 and out of scope~~ — superseded 2026-10-02 (D1).

The screen is mostly read-only. The writes it performs are _link management_ and _pricing_ (attaching or detaching plans, options and campaigns; setting or clearing 1DayPass prices for specific dates), the operating-calendar and mutual-use editing flows (Session 2026-08-28 Q1), and — since 2026-10-02 — the HQ/System **ステータス変更** action (D5). Editing the store's other attributes navigates away to the store form.

---

## Clarifications

### Session 2026-08-28 — decisions already fixed before drafting

These are not open questions; they are recorded so the reasoning is visible at planning time. The items that were open at drafting time were answered in the session below.

- Q: Does this feature manage change-history rows? → A: **No — seed only.** Stated directly by the user. The history tab reads pre-seeded rows; no create, update or delete path exists anywhere in this feature. This matches the backend, which also exposes only `GET /stores/{id}/change-history` (rows are written as a side effect of other mutations).
- Q: Is the 店舗マップ tab in scope? → A: ~~**No.** The prototype renders that tab only when the phase switch is set to Phase 2 (`store-detail.tsx` L617-619, L1918-1936), and its body is a "next phase" placeholder. Recorded under Out of Scope for Phase 1.~~ **Superseded 2026-10-02** — prototype `e5501a3` (9/26) removed the phase gate and built the tab; the user decided it is Phase 1, in scope (D1, FR-110–FR-114).
- Q: How are plan/option links persisted, given the screen unlinks one row at a time? → A: **Full-set replace, following the backend.** `PUT /stores/{id}/plans` and `PUT /stores/{id}/options` take the complete desired id set (all-or-nothing, 0–200 ids); the backend has no per-row delete. Every save must therefore be built from the _complete_ current set, read across all pages, even when the operator only detached one row — otherwise links on unread pages are silently dropped. Decided 2026-08-27 in `admin-store-sales-mutual-use-api-084/_cluster-level/_tracking.md` after QA #82 and #213 closed without a client answer.
- Q: Which store-status vocabulary does the screen use? → A: ~~**営業中 / 閉店 — the two the prototype renders**, carried over unchanged from the 026 list spec's resolved Q1. The backend's four-value enum (`operating` / `preparing` / `temporarily_closed` / `closed`) is narrowed by the project mock the same way on both screens so the two stay consistent.~~ **Superseded 2026-10-02** — **four values 準備中 / 営業中 / 休業中 / 閉店**, following prototype `a7d0c88` (開発回答 2026/08/24) and the store-list spec's Q1 re-resolved the same day. They map one-to-one onto the backend enum (`preparing` / `operating` / `temporarily_closed` / `closed`); no narrowing (D4).
- Q: Which store does the screen show when the header's global store selector is set? → A: **The store in the URL, always.** The detail screen is addressed by store id; the global selector does not redirect it.

### Session 2026-08-28 — resolved by `/speckit.clarify`

- Q: Does Phase 1 deliver working editing on 営業設定 and 入退館設定, or read-only affordances? → A: **Working editing, in full.** All five write flows the backend supports are in scope: the weekly hours, the staff-resident window (client-agreed in QA #206), exception days, temporary closures, and a mutual-use edit mode. This matches what the project already ships, so nothing working is torn out; where the prototype has no input for a field (the staff-resident window), a QA goes to the prototype owner but the flow is still built. Recorded in FR-028, FR-029–FR-029d, FR-074–FR-076, US2, US6.
- Q: How do the 紐づけ追加 panels search and load their candidates? → A: **Server-side search over the master, while the section tables hold the store's complete enabled set.** The candidate panels send the keyword to the master query and page through the results; the plan / option tables themselves are not paginated — each loads the store's whole enabled set, which is also what the count badge needs and what the full-set save payload is assembled from, so no second read is introduced. Recorded in FR-031, FR-032, FR-034, FR-039.
- Q: How is the 変更履歴 tab's data shaped, and may Staff open it? → A: **Seeded as a resolved field-level diff, and the tab is closed to Staff / Trainer / Observer.** Each seeded row carries the changed item with its before and after value, so the screen needs no snapshot interpretation (matching Y-02 FR-008's 「変更前後の差分」 and the seed-only instruction). Access follows the backend's rule — System / Headquarter / Manager only. Recorded in FR-080, FR-082, FR-083, FR-090, US7, Appendix A.7.
- Q: Where does the 1DayPass base price (基準価格) come from? → A: **The store's own default price, read only.** The base price is the store's default (`default.price`), falling back to the 1Day利用 plan master's price when the store has no default set. The screen displays it in the pricing panel's constraint band and adds **no** input for it — the prototype governs the UI, the contract governs the data source. Follow-up recorded: no screen in Phase 1 sets that default. QA #214 asked exactly this and was withdrawn on 2026-08-28, so no client answer exists. Recorded in FR-050a, FR-052, FR-053, Assumptions, Appendix A.7.
- Q: Does the detail screen enforce a viewing scope, and what happens when a user deep-links a store outside it? → A: **Yes — the same three-tier scope as the store list (026).** System / Headquarter any store; Manager their managed stores; Staff / Trainer / Observer their linked store. A store outside the caller's scope renders a not-permitted state with none of the store's data. Recorded in FR-001a, FR-090, US1, Edge Cases.

### Session 2026-09-23 — テリトリー moved to Phase 2

- Q: Is the テリトリー field on 基本情報 Phase 1? → A: **No — Phase 2.** It depends on the Y-15 organisational hierarchy, and the client's Notion board **CRM Category** lists **Y-15 組織階層管理 under Phase 2**. `Y-15.md` still reads 「Phase帰属: Phase 1」 and Y-02 v5 (FR-001 / FR-002) does not mark the hierarchy fields as Phase 2 either; both are stale on this point, and the client's board takes precedence. FR-010's field list therefore drops テリトリー in Phase 1 and the other 15 fields keep their order. FR-013 and the matching acceptance scenario and edge case are tagged **[Phase 2 — Round 3]**. The row is commented out in code with `TODO(round3) B1` (integration-plan B1 / R301).

### Session 2026-10-02 — prototype sync (`c1c7e2e` → `47423ec`) and Y-02 v6

The prototype changed `store-detail.tsx` five times after this spec was drafted, and Y-02 moved to 260928_v6 (FR-005 判定ルール, answering the Dev Q&A 「店舗の営業日・休業日設定の優先順位」). Every user-visible delta is listed with its decision. Unless a row says otherwise the decision is **follow the prototype**; where the spec already had **stricter validation** than the prototype, the spec rule is kept and marked "spec rule, no V0 source". D1, D5, D20–D22 and D4 record the user's decisions of 2026-10-02.

| #   | Prototype change                                                                                                                                                                                                                                                                                                                                                                                                                                | Commit                | Decision / spec impact                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 店舗マップ tab no longer behind the Phase 2 switch (`usePhase` removed); tab order 基本情報 / 営業設定 / 契約・料金 / 入退館設定 / **店舗マップ** / 変更履歴. Comment 「Y-02-05 店舗マップ設定（Y-02 FR-006）: 店舗マップ設定への主な入口」                                                                                                                                                                                                     | `e5501a3` (9/26)      | **User decision: Phase 1, in scope.** FR-004 rewritten; new FR-110–FR-114; Out of Scope and Clarification (2026-08-28) superseded. The editor screen is `specs/026-store-management/store-map-setup/` (separate sub-spec).    |
| D2  | 店舗マップ tab body: card 店舗マップ; 配置済み {N}台 ・ 未配置 {M}台 (warning badge when >0); 店舗マップ設定 button or 閲覧のみ; read-only floor map with locker markers; empty state フロア図が登録されていません + 店舗マップ設定で登録する                                                                                                                                                                                                   | `e5501a3` (9/26)      | FR-110–FR-114. Edit entry for HQ/System/Staff — **Staff own store only**, per the Y-02 matrix 「店舗マップ設定: Staff ○ 所属店舗」 (the prototype does not scope Staff; Q9).                                                  |
| D3  | フロアマップ card removed from the 基本情報 right column (the floor map now lives on 店舗マップ)                                                                                                                                                                                                                                                                                                                                                | `e5501a3` (9/26)      | FR-017 withdrawn; US1 #6, Edge Cases updated.                                                                                                                                                                                 |
| D4  | Status is **four values** 準備中 / 営業中 / 休業中 / 閉店 from `data/stores.ts` (header badge + StatusCard tone)                                                                                                                                                                                                                                                                                                                                | `6bc1f1c` / `a7d0c88` | **User decision: four values everywhere** (store-list Q1 re-resolved 2026-10-02). FR-002, FR-015, Assumptions, Key Entities rewritten.                                                                                        |
| D5  | **ステータス変更** action on the StatusCard (HQ/System) + dialog with all four values, unreachable ones disabled with a reason; toast. Comment 「開発回答（2026/08/24 §4-1）: ステータス変更は編集フォームとは別アクション（HQ/System 専用）」                                                                                                                                                                                                  | `a7d0c88` (9/16)      | **User decision: Phase 1, prototype verbatim.** New FR-015a–FR-015d; FR-090 row added. BE endpoint: Q7.                                                                                                                       |
| D6  | StatusCard meta gains 「閉店予定日: {date}」 before 作成 / 更新 when a closure date is set                                                                                                                                                                                                                                                                                                                                                      | `6bc1f1c` (9/8)       | FR-015 rewritten.                                                                                                                                                                                                             |
| D7  | Edit action moved from the 基本情報 tab into the page header, label 基本情報を編集 → **編集**, default variant; caption 店舗の基本情報を管理します。 removed; Staff enabled only on own store with tooltips 所属店舗の基本情報のみ編集できます / 本部権限が必要です                                                                                                                                                                             | `6bc1f1c` / `a7d0c88` | FR-018 rewritten (gating already matched; closes FR-018's prototype-sync QA).                                                                                                                                                 |
| D8  | New field **サブブランド** after ブランド — 「開発回答（2026/08/24）: サブブランドは JOYFIT のみ。FIT365 店舗は空（表示は「—」）」                                                                                                                                                                                                                                                                                                              | `a7d0c88` (9/16)      | FR-010 field list; new FR-012a. Data source: Q13.                                                                                                                                                                             |
| D9  | New fields **受付開始日** / **プレオープン日** between 店舗名（カナ） and 開店日 — 「開発回答（2026/08/24）: 受付開始日・プレオープン日（任意）」                                                                                                                                                                                                                                                                                               | `a7d0c88` (9/16)      | FR-010; new FR-012b (backend `receiptDate` / `preopenDate`).                                                                                                                                                                  |
| D10 | Calendar classification follows **Y-02 v6 precedence**: 個別日設定 (臨時休業日 / 特別営業日) > 祝日設定 (only when overridden) > 曜日設定; a holiday without an override follows its weekday; real 2026 holiday sample replaces the fixed 2nd/4th-Wednesday fixture                                                                                                                                                                             | `3a6c29b` (9/30)      | FR-024 rewritten; new FR-024a.                                                                                                                                                                                                |
| D11 | Day labels / tints: 臨時休業 (info), 特別営業 (success), 祝日営業 (warning), 祝日休業 and 定休日 (destructive), 祝日 (label only, no tint, un-overridden holiday); 短縮 removed. Legend 営業日 / 定休日・祝日休業 / 臨時休業 / 特別営業 / 祝日営業                                                                                                                                                                                              | `3a6c29b` (9/30)      | FR-021, FR-023, US2 #2/#4 rewritten.                                                                                                                                                                                          |
| D12 | 祝日 row becomes a three-way **祝日の扱い** select 曜日どおり (default) / 営業 / 休業 in the hours Sheet; read view shows 曜日どおり / 休業 / times (also in スタッフ常駐時間帯)                                                                                                                                                                                                                                                                | `3a6c29b` (9/30)      | FR-025, FR-026, FR-029 rewritten; new FR-029f. **Contract gap** — 曜日どおり has no representation in `StoreBusinessHourDto`; same as store-form spec Q&A Q4, same default (the mock stores the mode until BE decides) — Q15. |
| D13 | 営業時間設定 / スタッフ常駐時間帯 編集 open right-side Sheets (営業時間を設定する / スタッフ常駐時間帯を設定する) with per-day inputs, 定休日 / 常駐なし checkboxes, キャンセル / 保存する, toasts                                                                                                                                                                                                                                              | `6bc1f1c` (9/8)       | FR-029, FR-029a rewritten with V0 copy. Prototype has no validation — FR-029's "open day needs both times" kept (spec rule, no V0 source). Closes Q1's "no staff-window form" prototype QA.                                   |
| D14 | 例外営業時間設定 renamed **特別営業日** everywhere (block, dialog, toasts, aria-labels); meaning = a day open with special hours (Y-02 「特別営業日: 祝日でも営業する日・年末年始の特別時間等」), not "shortened"                                                                                                                                                                                                                               | `3a6c29b` (9/30)      | FR-027, FR-029b, Key Entities rewritten. Mapping to `short_hours`: Q10.                                                                                                                                                       |
| D15 | Add/edit dialog for 特別営業日 / 臨時休業日 (DatePicker, 営業時間 or 理由); **one 個別日設定 per date across both kinds** — error この日はすでに{特別営業日\|臨時休業日}が登録されています。既存の設定を編集または削除してください (Y-02 v6 「個別日設定の重複制約」)                                                                                                                                                                           | `6bc1f1c` / `3a6c29b` | FR-029b, FR-029c rewritten; US2 #10. Enforcement on BE: Q11. Special-day close-after-open kept (spec rule, no V0 source).                                                                                                     |
| D16 | Empty states 特別営業日の設定はありません / 臨時休業日の設定はありません; delete AlertDialog body 「{date} の設定を削除します。この日は祝日・曜日の設定に従います。」                                                                                                                                                                                                                                                                           | `6bc1f1c` / `3a6c29b` | FR-027, new FR-029e; US2 #11 rewritten (reverts to holiday/weekday, not weekday only).                                                                                                                                        |
| D17 | 主契約プラン table gains **区分** column (between 料金（税込） and 紐づけ日): 全社共通 / 当店限定 badges; link panel badge text 本部 / 店舗 → 全社共通 / 当店限定 — 「販売設定の開発回答: プラン側の意味は「全社共通／当店限定の特殊契約」」                                                                                                                                                                                                    | `6bc1f1c` / `a7d0c88` | FR-031, FR-033 rewritten; new FR-031a. Field source: Q13.                                                                                                                                                                     |
| D18 | オプション table loses **親オプション**; options carry **no origin** (no column, no panel badge); panel meta {price} · {id} — 「オプションには本部/店舗の概念が無いため出所列は置かない」                                                                                                                                                                                                                                                       | `6bc1f1c` / `a7d0c88` | FR-032, FR-033 rewritten; A.7 parent-option row withdrawn (QA #212 moot).                                                                                                                                                     |
| D19 | 1Day利用 candidate type label 1Day会員 → 1Day Pass                                                                                                                                                                                                                                                                                                                                                                                              | `1767864` (9/17)      | Data only; no FR change.                                                                                                                                                                                                      |
| D20 | 入退館設定 **brand split**: JOYFIT — どこでもJOYの受入 + 1日単位の後払い設定 + どこでもJOY YOGA利用料金 card; FIT365 — 相互利用オプション（¥500）の受入 only (no post-pay row, no YOGA card); badges 受入可/受入不可, 有効/無効                                                                                                                                                                                                                 | `6bc1f1c` (9/8)       | **User decision: follow the prototype fully.** FR-070, FR-073 rewritten; new FR-070a.                                                                                                                                         |
| D21 | 相互利用設定 編集 opens Sheet 相互利用設定を編集する (Switches, editable **YOGA利用料金（1日・税別）**, DatePickers, time inputs) instead of an inline edit mode                                                                                                                                                                                                                                                                                | `6bc1f1c` (9/8)       | **User decision: Sheet editing; YOGA fee editable, mock-first.** FR-074, FR-075 rewritten; BE gap Q12. Period end ≥ start kept (spec rule, no V0 source).                                                                     |
| D22 | The mutual-use Sheet has **no partner add/remove** UI                                                                                                                                                                                                                                                                                                                                                                                           | `6bc1f1c` (9/8)       | **User decision: FR-076 dropped from Phase 1** → Out of Scope (prototype has no UI). US6 #7 withdrawn.                                                                                                                        |
| D23 | Partner block label 相互利用グループ（許可店舗・{brand}ブランドのみ）, dynamic {N}店舗, ブランド cell as BrandBadge; partners of the same brand only                                                                                                                                                                                                                                                                                            | `6bc1f1c` (9/8)       | FR-072 rewritten.                                                                                                                                                                                                             |
| D24 | Sheets: separator → border, width from the sheet default (480px)                                                                                                                                                                                                                                                                                                                                                                                | `e5501a3` (9/26)      | No visible change; none.                                                                                                                                                                                                      |
| D25 | キャンペーン, 1DayPass, 変更履歴, banner and back link unchanged                                                                                                                                                                                                                                                                                                                                                                                | —                     | None.                                                                                                                                                                                                                         |
| D26 | **Dev-added, no V0 source** — the 店舗写真 card shows the store's real photos and gets an **編集** button that opens the store edit form, where the dev-added 店舗写真 card adds/deletes photos. The prototype only renders a static 4-slot placeholder grid and has no photo editing anywhere; the team lead approved dev adding it on 2026-10-02 (「tự thêm đi em」, Q&A 「[CRM][Y-02][Store] Xác nhận các logic ảnh, sơ đồ store, locker…」) | — (2026-10-02)        | FR-016 rewritten; new FR-016a, FR-016b; PAR036 / PAR037 reopened, PAR037a–c added. Photo write lives in the store form (`../store-form/spec.md` FR-055–FR-059f, full-set `PUT /stores/{id}/images`, API-083 §19.2).           |

### Session 2026-11-13 — 受付設定 shown on 基本情報 (Y-02 261112_v11)

Y-02 `261112_v11` FR-002 adds 入会受付 (`joiningReception`) and 引き継ぎ受付 (`linkReception`), switched on the edit form by System / Headquarter only (store-form spec, Session 2026-11-13). The prototype (`9428dc2`) has no display for them yet.

- Q: Where does the detail screen show them? → A: Dev decision — a read-only **受付設定** card under 一般情報 on the 基本情報 tab, visible to every role that can open the tab (Staff = 参照のみ per the 権限マトリクス).
- Q: How is the change history worded? → A: The 変更項目 reads 入会受付 / 引き継ぎ受付, and the values read 受付 / 停止 (the same words as the form switch), not the generic あり / なし.

---

## User Scenarios _(mandatory)_

### User Story 1 - Read one store's master record (Priority: P1)

An operator opens a store from the list and lands on 基本情報. The page header shows the store's name with its lifecycle badge and a link back to 店舗管理. A standing warning reminds the operator that changes here reach members immediately. The left column lists the store's identity and address fields; the right column shows a status card with creation and update stamps, the store's photos, and its floor map.

**Why this priority**: This is the screen's reason to exist. Every other tab is a section of the same record, and without the identity block none of them can be trusted to be about the right store.

**Verification**: Open a store from the list. Confirm the title matches the store, every labelled field renders a value or an explicit — placeholder, and the territory shows its full organisational path.

**Acceptance Scenarios**:

1. **Given** a store id, **When** the screen loads, **Then** the header shows 店舗管理に戻る, the store name as the title, a status badge (準備中 info / 営業中 success / 休業中 warning / 閉店 muted, each with a leading dot) and an 編集 button, and the warning banner 機能制限や入退館設定の変更は、会員の利用に即時反映されます。 sits above the tabs.
2. **Given** the 基本情報 tab, **When** it renders, **Then** the 一般情報 card shows, in a two-column grid and in this order: 店舗ID / 店舗名 / ブランド / サブブランド / 運営企業 / テリトリー / 都道府県 / 郵便番号 / 住所 / 電話番号 / FAX番号 / 店舗コード / 店舗名（カナ） / 受付開始日 / プレオープン日 / 開店日 / 閉店日 / 性別制限 / 備考 (備考 spanning both columns; テリトリー Phase 2).
3. **Given** the store has a territory, **When** the テリトリー field renders, **Then** **[Phase 2 — Round 3]** it shows the territory name with the full hierarchy path (運営本部 › ブロック › エリア › テリトリー) directly beneath it.
4. **Given** a field has no value (closure date on an operating store, an empty memo), **When** it renders, **Then** it shows — in muted text rather than an empty cell.
5. **Given** the store is directly managed, **When** 運営企業 renders, **Then** it shows 直営; **and given** it is franchised, **Then** it shows the FC company's name.
6. **Given** the 基本情報 tab, **When** the right column renders, **Then** a status card shows the lifecycle label with 作成 and 更新 timestamps (preceded by 閉店予定日 when a closure date is set) and a ステータス変更 action, and a 店舗写真 card shows the store's image gallery. ~~a フロアマップ card~~ — moved to the 店舗マップ tab (D3).
7. **Given** the signed-in user is System or Headquarter, **When** they use the header's 編集, **Then** the store edit form opens with every field editable; **and given** a Staff on their own store, **Then** the form opens with only the Staff-editable fields enabled; **and given** a Manager, Trainer or Observer, **Then** the button is disabled with the tooltip 本部権限が必要です (a Staff on another store sees 所属店舗の基本情報のみ編集できます).
8. **Given** the store id does not exist or the record cannot be loaded, **When** the screen renders, **Then** it shows a retryable error state instead of a partially populated record.
9. **Given** the signed-in user is a Manager, **When** they open a store outside their managed-store set — **or given** a Staff / Trainer / Observer opens a store other than the one their staff record is linked to — **Then** the screen shows a not-permitted state and no tab renders any of that store's data.
10. **Given** a System or Headquarter user on a store that is not 閉店, **When** they use ステータス変更 and pick a reachable status, **Then** the header badge and status card switch to it and the toast {店舗名}のステータスを「{status}」に変更しました appears; **and given** the store is 閉店, **Then** the action is disabled with 閉店した店舗のステータスは変更できません; **and given** any other role, **Then** it is disabled with ステータス変更権限がありません.

---

### User Story 2 - Review the store's operating calendar and hours (Priority: P1)

A head-office operator or a store staff member opens 営業設定 to see, for a chosen month, which days are normal business days, regular closures, temporary closures, special business days or holidays (opened or closed by the store's holiday override) — alongside the weekly default hours, the staff-resident window that gate-stop decisions read, and the individually registered exception days.

**Why this priority**: Y-02 FR-005 makes the operating calendar a Must, and it is the input to billing schedules, entry management (B-01) and the studio calendar (D-01). Reading it correctly is the whole point of the tab.

**Verification**: Open 営業設定, page to a month containing a registered temporary closure and confirm the day is tinted and labelled 臨時休業, that the legend explains the five entries, that a 特別営業日 on a holiday wins over a 祝日の扱い of 休業 (Y-02 v6 precedence), and that 本日 returns to the current month.

**Acceptance Scenarios**:

1. **Given** the 営業設定 tab, **When** it renders, **Then** the 営業カレンダー card shows a 7-column month grid starting on Sunday with 日月火水木金土 headers, a 本日 button and a month picker.
2. **Given** a month is displayed, **When** each day cell renders, **Then** it is classified by the Y-02 v6 precedence (FR-024a) and labelled 臨時休業 / 特別営業 / 祝日営業 / 祝日休業 / 定休日 / 祝日 (un-overridden holiday, no tint) or nothing for a plain business day, tinted per FR-021.
3. **Given** the displayed month contains today, **When** that cell renders, **Then** the date number is shown in an inverted circle.
4. **Given** the calendar, **When** the legend renders, **Then** it lists 営業日 / 定休日・祝日休業 / 臨時休業 / 特別営業 / 祝日営業 with their colour swatches.
5. **Given** the 営業時間設定 card, **When** it renders, **Then** it lists 月曜日〜日曜日, each showing open〜close times or 定休日, plus a 祝日 row showing 曜日どおり, 休業, or open〜close when set to 営業.
6. **Given** the スタッフ常駐時間帯 block, **When** it renders, **Then** it repeats the same day rows showing the staffed window, shows — for a day with no staffing, and explains that the value is used for gate-stop decisions.
7. **Given** exception days and temporary closures exist, **When** the 特別営業日 and 臨時休業日 blocks render, **Then** each registered date is listed in date order — 特別営業日 with their hours, temporary closures with their reason (— when none) — each with edit and delete affordances and each block with a 日付追加 action; an empty block reads 特別営業日の設定はありません / 臨時休業日の設定はありません.
8. **Given** the signed-in user is Manager, Trainer or Observer, **When** the tab renders, **Then** every edit / add / delete affordance in it is inert and explains that calendar editing requires the appropriate role.
9. **Given** a permitted user edits the weekly hours, **When** they mark a day open without both times, **Then** saving is refused with an explanation; **and when** the set is valid and saved, **Then** the weekly list, the staff-resident list and the calendar all reflect it and the result is confirmed.
10. **Given** a permitted user adds or edits a 特別営業日 or a 臨時休業日, **When** the date already carries **either** kind, **Then** the date field is flagged with この日はすでに{特別営業日|臨時休業日}が登録されています。既存の設定を編集または削除してください and saving is disabled; **and when** it is accepted, **Then** the day appears in its list and is reclassified in the calendar.
11. **Given** a permitted user deletes a 特別営業日 or a 臨時休業日, **When** they confirm 「{date} の設定を削除します。この日は祝日・曜日の設定に従います。」, **Then** the day reverts to its holiday-override or weekday classification in the calendar.
12. **Given** the hours Sheet, **When** the operator sets 祝日の扱い to 営業 / 休業 / 曜日どおり and saves, **Then** every holiday in the calendar becomes 祝日営業 / 祝日休業 / follows its weekday respectively, unless a 個別日設定 exists on that date.

---

### User Story 3 - Manage which plans and options the store sells (Priority: P1)

A head-office operator opens 契約・料金 and reviews the main-contract plans and options currently attached to this store, each showing where it came from (head office master or store-local addition). They attach further plans or options from the master via a side panel with search and multi-select, or detach one with a confirmation.

**Why this priority**: Y-02 FR-003 (販売設定) is a Must and directly determines what the store can sell — an incorrect set blocks enrolment at the counter.

**Verification**: As a Headquarter user, open the plan side panel, search by id, tick two plans, attach them, confirm they appear in the table with today as the link date, then detach one through the confirmation dialog.

**Acceptance Scenarios**:

1. **Given** the 契約・料金 tab, **When** it renders, **Then** a banner explains that the masters are authored in the 商材・施策 menu and that price and condition changes are made there, not here.
2. **Given** the 主契約プラン section, **When** it renders, **Then** its title carries a count badge and its table shows 主契約ID / 主契約名 / 契約タイプ / 料金（税込） / 区分 / 紐づけ日 / 操作, with 区分 as a 全社共通 or 当店限定 badge.
3. **Given** the オプション section, **When** it renders, **Then** its table shows オプションID / オプション名 / 料金（税込） / 操作 (no 親オプション, no origin — D18).
4. **Given** a Headquarter or System user, **When** they use 紐づけ追加, **Then** a side panel opens listing the master entries not yet attached to this store, with a search box matching name or id, a live count of candidates, and — on the plan panel only — a 全社共通 / 当店限定 badge on each row.
5. **Given** the side panel, **When** no candidate matches the search, **Then** it shows 紐づけ可能なプランはありません (resp. …オプションはありません) instead of an empty list.
6. **Given** one or more candidates are ticked, **When** the operator confirms, **Then** those entries are attached to the store, the panel closes, the selection resets, and the table and count badge reflect the new set.
7. **Given** the operator detaches a row, **When** they confirm the dialog (「{name}」の紐づけを解除します。新規契約はできなくなります。), **Then** the link is removed and the table and count badge update.
8. **Given** the signed-in user is not System or Headquarter, **When** the section renders, **Then** 紐づけ追加 and every row's unlink control are disabled and explain that sales settings are HQ/System-only.
9. **Given** any attach or detach, **When** it is persisted, **Then** the store's complete resulting link set is submitted (not just the delta), so links the operator never saw are preserved.

---

### User Story 4 - Manage the campaigns the store offers (Priority: P2)

A head-office operator or store staff member reviews the campaigns attached to this store — with their discount summary, recruitment period and acceptance state — and attaches further campaigns from the campaign master, where only campaigns of the store's own brand, published to this store, and still within their recruitment period may be picked.

**Why this priority**: Campaign selection is delegated to this screen by G-03 (店舗利用キャンペーンの選択) and directly gates what the enrolment flow can offer, but the store still functions if the set is left untouched.

**Verification**: Open the campaign panel as a Staff user, confirm that an out-of-brand campaign is greyed out with the reason ブランド対象外, attach an eligible one, and confirm the success message names the campaign.

**Acceptance Scenarios**:

1. **Given** the キャンペーン section, **When** it renders, **Then** its title carries a count badge and its table shows キャンペーンID / キャンペーン名 / 割引概要 / 募集期間 / 受付可否 / 紐づけ日 / 解除, with the acceptance state as a badge (受付中 / 受付停止 / 上限到達).
2. **Given** an attached campaign is no longer published to this store, **When** its row renders, **Then** a 公開対象外 marker appears beside the name explaining that head office has not included this store in the campaign's published stores.
3. **Given** an attached campaign has expired, stopped accepting, or become unpublished, **When** the table renders, **Then** the row is **not** removed automatically — the link stands until an operator detaches it.
4. **Given** the attach panel, **When** a candidate is of another brand, is not published to this store, or its recruitment period has ended, **Then** it is listed but not selectable, dimmed, and labelled with exactly one reason — ブランド対象外 taking precedence over 公開対象外, which takes precedence over 募集期間終了 — with a tooltip explaining it.
5. **Given** a candidate whose acceptance is 受付停止 or 上限到達 but is otherwise eligible, **When** the panel renders, **Then** it remains selectable, so a store can pre-attach a campaign ahead of it reopening.
6. **Given** campaigns are attached, **When** the operation completes, **Then** one success message per campaign confirms the attachment, saying it becomes selectable in this store's enrolment applications — or, when acceptance is not open, that it becomes selectable once acceptance resumes.
7. **Given** a campaign is detached through its confirmation dialog, **When** it completes, **Then** a message confirms 『{name}』の紐づけを解除しました and the row disappears.
8. **Given** the signed-in user is Manager, Trainer or Observer, **When** the section renders, **Then** both attach and detach are disabled with an explanation that campaign usage is HQ/System or store-staff only.

---

### User Story 5 - Set 1DayPass prices for specific dates (Priority: P2)

A store staff member opens the 1DayPass price section, sees which dates already carry a price different from the base price, opens the pricing panel, selects one or several dates on a calendar, enters a price within the permitted range with an optional note, and applies it — or clears the setting for the dates they picked.

**Why this priority**: Y-02 FR-003 names per-date 1DayPass pricing as a Must and explicitly grants it to store staff, but the store sells at the base price without it.

**Verification**: As a Staff user, select two dates (one already priced), confirm the overwrite badge appears, enter 1900 and confirm the range error blocks apply, correct it to 1200, apply, and confirm both dates appear in the month's table.

**Acceptance Scenarios**:

1. **Given** the 1DayPass価格設定 section with at least one per-date price, **When** it renders, **Then** a count badge, a month picker offering only months that actually hold data, and a read-only table of 適用日 (with weekday) / 販売価格（税込） / 備考 for the selected month, sorted ascending by date.
2. **Given** no per-date price exists at all, **When** the section renders, **Then** it shows 個別の価格設定はありません。全日 基準価格（{base}）で販売されます。 and no month picker.
3. **Given** a month with no per-date price is selected, **When** the table renders, **Then** it shows この月の価格設定はありません。.
4. **Given** the pricing panel, **When** it opens, **Then** it shows the base price and the head-office range (¥700〜¥1,800) as a constraint band, a month navigator with 本日 and previous/next, and a calendar where already-priced days are tinted and show their price.
5. **Given** the operator taps days, **When** each is tapped, **Then** it toggles into or out of the selection, and selecting a single already-priced day pre-fills the form with its current price and note.
6. **Given** at least one day is selected, **When** the inline panel renders, **Then** it shows 設定対象 {N}日, the sorted list of selected dates, a 選択をクリア action, a required price field with a 円 suffix, an optional note field, and — when any selected day already has a price — an 既存設定を上書き badge and a 設定を解除 action.
7. **Given** a price outside ¥700–¥1,800, **When** it is entered, **Then** the field is flagged, the message 700円〜1,800円の範囲で入力してください replaces the range hint, and applying is blocked.
8. **Given** a valid price and at least one selected day, **When** the operator applies, **Then** every selected day is set to that price and note — overwriting any existing setting — and the selection and form reset.
9. **Given** selected days that already carry prices, **When** the operator clears them and confirms the dialog, **Then** those days lose their per-date price and revert to the base price.
10. **Given** the signed-in user may not edit 1DayPass prices, **When** the section renders, **Then** the panel cannot be opened and calendar days are not selectable.

---

### User Story 6 - Review the store's mutual-use and entry settings (Priority: P2)

A head-office operator opens 入退館設定 to check whether this store accepts visitors from other stores of its brand (どこでもJOY for JOYFIT stores, the 相互利用オプション（¥500） for FIT365 stores), over which period, under which minor-entry window, which partner stores are in its mutual-use group, and — for JOYFIT stores — the 1-day deferred payment and the cross-store yoga usage fee.

**Why this priority**: Y-02 FR-004 is a Must and drives what happens at the gate, but it is a low-churn setting that is read far more often than changed.

**Verification**: Open 入退館設定 on a JOYFIT store and a FIT365 store; confirm the acceptance row's label follows the brand, both period dates, both minor-entry times and the partner-store table render on both, and the 後払い row and yoga fee card render on the JOYFIT store only.

**Acceptance Scenarios**:

1. **Given** the 相互利用設定 card, **When** it renders, **Then** a JOYFIT store shows どこでもJOYの受入 / どこでもJOYを利用する他のJOYFIT店舗の会員を受け入れる and a FIT365 store 相互利用オプション（¥500）の受入 / 相互利用オプション契約者（他のFIT365店舗の会員）の利用を受け入れる, with a 受入可 / 受入不可 badge; a JOYFIT store also shows the 1日単位の後払い設定 row with a 有効 / 無効 badge.
2. **Given** the same card, **When** it renders, **Then** it shows 相互利用受入可能期間（開始日 / 終了日） and 18歳未満入館可能時間（開始 / 終了）.
3. **Given** the store has mutual-use partners, **When** the 相互利用グループ（許可店舗） block renders, **Then** the label reads 相互利用グループ（許可店舗・{brand}ブランドのみ）, a count badge shows {N}店舗 and a table lists 店舗名 / ブランド (brand badge) / 設定日.
4. **Given** a JOYFIT store, **When** the tab renders, **Then** the どこでもJOY YOGA利用料金 card shows YOGA利用料金（1日） with its amount and 利用店舗に計上; a FIT365 store shows no such card.
5. **Given** the signed-in user is not System or Headquarter, **When** the tab renders, **Then** the 編集 action is disabled and explains that mutual-use settings are HQ/System-only.
6. **Given** a System or Headquarter user uses 編集, **When** the Sheet 相互利用設定を編集する opens, **Then** the acceptance switch, (JOYFIT only) the deferred-payment switch and the YOGA利用料金（1日・税別） input, the acceptance period and the minor-entry window are editable, with キャンセル / 保存する and the toast 相互利用設定を保存しました; **and outside** the Sheet the acceptance cannot be operated at all.
7. ~~**Given** edit mode, **When** the operator adds a partner store of another brand group, one that is closed, or this store itself, **Then** the addition is refused with the reason; **and when** a valid partner is added or an existing one removed, **Then** the partner table and its count badge update.~~ Withdrawn 2026-10-02 — partner add/remove is out of Phase 1 (D22).
8. **Given** an acceptance period whose end precedes its start, **When** the operator saves, **Then** the save is refused with an explanation.

---

### User Story 7 - Review the store's change history (Priority: P3)

An auditor or head-office operator opens 変更履歴 and reads, newest first, who changed what about this store and when, with the value before and after.

**Why this priority**: Y-02 FR-008 is a Should, and for this feature the data is seeded rather than produced, so it delivers visibility rather than function.

**Verification**: Open 変更履歴 and confirm the rows render newest first with all five columns populated.

**Acceptance Scenarios**:

1. **Given** the 変更履歴 tab, **When** it renders, **Then** a card titled 変更履歴 shows a table of 変更日時 / 変更者 / 変更項目 / 変更前 / 変更後, newest first.
2. **Given** a change with no prior value (the store's creation), **When** its row renders, **Then** 変更前 shows — and 変更後 describes the change.
3. **Given** this feature, **When** any part of the screen is used, **Then** no history row is ever created, edited or deleted by it — the tab is read-only over seeded data.
4. **Given** the signed-in user is Staff, Trainer or Observer, **When** the screen renders, **Then** the 変更履歴 tab is not reachable; **and when** it is reached directly, **Then** a not-permitted state is shown instead of history rows.

---

### User Story 8 - View the store's floor map (Priority: P2)

An operator opens 店舗マップ to see the store's registered floor map with every placed locker cabinet, and how many cabinets are still unplaced. An HQ/System user, or a Staff member on their own store, follows 店舗マップ設定 to the editor (`specs/026-store-management/store-map-setup/`).

**Why this priority**: Y-02 FR-006 / Y-02-05; the read view is the main entry to the map editor and is what E-01 locker management relies on, but the store operates without it.

**Verification**: Open 店舗マップ as Headquarter: the map, 配置済み / 未配置 counts and 店舗マップ設定 render; as Manager the action reads 閲覧のみ; on a store with no floor image the empty state renders.

**Acceptance Scenarios**:

1. **Given** the store has a floor image, **When** the tab renders, **Then** the card 店舗マップ shows 配置済み {N}台 ・ 未配置 {M}台 under its title (未配置 as a warning badge when M > 0, plain 未配置 0台 otherwise) and the floor image with a read-only marker per placed cabinet.
2. **Given** System, Headquarter, or Staff on their own store, **When** the tab renders, **Then** a 店舗マップ設定 button opens the store-map-setup screen for this store; **and given** any other role (or a Staff on another store), **Then** the card shows a lock icon and 閲覧のみ instead.
3. **Given** no floor image is registered, **When** the tab renders, **Then** it shows フロア図が登録されていません and — for editors only — 店舗マップ設定で登録する.

### Edge Cases

- **Store outside the caller's scope** — a deep link to a store a Manager does not manage, or that a Staff/Trainer/Observer is not linked to, shows a not-permitted state; no tab renders any of that store's data.
- **Store not found / load failure** — the screen shows one retryable error state rather than an empty shell of tabs.
- **A tab's own data fails while the store loads** — that tab reports its own failure; the rest of the screen stays usable.
- **Closed store** — the header badge reads 閉店, 閉店日 carries a date, ステータス変更 is disabled with 閉店した店舗のステータスは変更できません, and the screen stays fully readable (Y-02: past data must remain viewable after closure).
- **Closure date set on an operating store** — the status card adds 閉店予定日: {date}; 閉店 is never selectable in the status dialog (閉店日を設定すると自動的に閉店になります).
- **Holiday with a 特別営業日 or 臨時休業日** — the 個別日設定 wins over 祝日の扱い, which wins over the weekday (Y-02 v6).
- **Holiday not overridden (曜日どおり)** — the day follows its weekday; it is labelled 祝日 but carries no tint.
- **FIT365 store on 入退館設定** — no 1日単位の後払い設定 row and no YOGA card; not an empty state.
- **Store with no territory** **[Phase 2 — Round 3]** — the テリトリー field shows an explicit unset placeholder rather than a broken hierarchy path.
- **Store with no photos** — the gallery shows empty placeholders, never a broken image; the 編集 button stays available (to add the first photo) for the roles of FR-016a. **No floor map** — the 店舗マップ tab shows its empty state (FR-113).
- **Empty link sets** — a store with no plans, no options or no campaigns shows the section with a zero count and an empty table rather than hiding it.
- **Detaching the last plan** — permitted; the resulting empty set must be persisted as an empty set, not skipped.
- **Concurrent link edits** — because links are saved as a whole set, a save built from stale data would drop another operator's links; the complete current set must be re-read before each save.
- **1DayPass day already priced and selected together with unpriced days** — one apply writes all of them, overwriting only where a price already existed, and the overwrite badge warns before it happens.
- **1DayPass month picker with a single data month** — the picker still renders and only that month is selectable.
- **Selecting zero days then applying** — apply stays disabled; the footer reads 日付を選択してください.
- **Holiday row in the weekly hours** — 祝日 is an eighth row alongside the seven weekdays, not a day of the week; it holds a 祝日の扱い (曜日どおり / 営業 / 休業) rather than a closed flag.
- **Overnight closing time** — a close time past midnight is expressed as 26:00 rather than 02:00.
- **Mutual-use group with no partners** — the count badge reads 0店舗 and the table shows an empty state; the card still renders.
- **A campaign linked before it was unpublished** — the row stays with a 公開対象外 marker; it is not silently dropped.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Page shell

- **FR-001**: The screen MUST be addressed by store id and MUST render the store named by that id, regardless of the global header store selector.
- **FR-001a**: The screen MUST enforce the same viewing scope as the store list: System and Headquarter may open any store; a Manager only the stores in their managed-store set; Staff, Trainer and Observer only the store their staff record is linked to. Opening a store outside the caller's scope MUST show a not-permitted state and MUST NOT render any of the store's data in any tab.
- **FR-002**: The page header MUST show a back link labelled 店舗管理に戻る returning to the store list, the store name as the title, a lifecycle badge with a leading dot over the four values 準備中 (info) / 営業中 (success) / 休業中 (warning) / 閉店 (muted), the same tokens as the store list, and the 編集 action of FR-018 (prototype `a7d0c88`).
- **FR-003**: A warning banner MUST stand above the tabs reading 機能制限や入退館設定の変更は、会員の利用に即時反映されます。
- **FR-004**: The screen MUST present exactly these tabs, in order: 基本情報 / 営業設定 / 契約・料金 / 入退館設定 / 店舗マップ / 変更履歴 (店舗マップ always rendered — prototype `e5501a3`; 変更履歴 role-gated per FR-083). 基本情報 MUST be the default tab.
- **FR-005**: While the store record is loading the screen MUST show a loading state; on failure or a missing store, a retryable error state; never a partially populated record.
- **FR-006**: Each tab MUST manage its own loading and failure state so that one failing section does not take the whole screen down.

#### 基本情報 tab

- **FR-010**: **[Phase 2 — Round 3]** (テリトリー only — Phase 1 shows the other 15 fields in the same order). The 一般情報 card MUST show, in a two-column grid and in this order: 店舗ID, 店舗名, ブランド, サブブランド, 運営企業, テリトリー, 都道府県, 郵便番号, 住所, 電話番号, FAX番号, 店舗コード, 店舗名（カナ）, 受付開始日, プレオープン日, 開店日, 閉店日, 性別制限, 備考 (the last spanning both columns) — 19 fields, 18 in Phase 1 (prototype `a7d0c88`).
- **FR-011**: ブランド MUST render as a brand badge.
- **FR-012**: 運営企業 MUST show the operating FC company's name, or 直営 when the store is directly managed.
- **FR-012a**: サブブランド MUST show the store's sub-brand for a JOYFIT-group store and — for any other brand (FIT365) (「開発回答（2026/08/24）: サブブランドは JOYFIT のみ。FIT365 店舗は「—」」, prototype `a7d0c88`).
- **FR-012b**: 受付開始日 and プレオープン日 MUST show the store's reception-start and pre-open dates as YYYY/MM/DD, — when unset (「開発回答（2026/08/24）: 受付開始日・プレオープン日（任意）。未設定は「—」」, prototype `a7d0c88`). 閉店日 likewise shows its date or —.
- **FR-013**: **[Phase 2 — Round 3]** テリトリー MUST show the assigned territory's name with its full organisational path (運営本部 › ブロック › エリア › テリトリー) beneath it, and an explicit unset placeholder when the store has no territory.
- **FR-014**: Any field without a value MUST render — in muted text.
- **FR-015**: A status card MUST show the store's lifecycle label in its tone (FR-002) with the meta lines 閉店予定日: {date} (only when a closure date is set), 作成: {timestamp} and 更新: {timestamp}, in that order (prototype `6bc1f1c`).
- **FR-015a**: The status card MUST carry a full-width outline **ステータス変更** action (RefreshCw icon), enabled for System and Headquarter only, with the deny tooltip ステータス変更権限がありません for every other role; when the status is 閉店 it MUST be disabled for everyone with the reason 閉店した店舗のステータスは変更できません. Status change is a separate action from the edit form (「開発回答（2026/08/24 §4-1）」, prototype `a7d0c88`).
- **FR-015b**: The action MUST open a dialog titled ステータス変更 with the description 店舗のステータスを変更します。, a read-only block 店舗名 / 現在のステータス (badge), and a select 新しいステータス (placeholder ステータスを選択) listing all four values as badges; footer キャンセル (clears the choice) and 変更する, disabled until a value is chosen.
- **FR-015c**: Only these transitions MUST be selectable: 準備中 → 営業中, 営業中 → 休業中, 休業中 → 営業中. Every other value MUST be disabled with exactly one reason, evaluated in this order: the current value — 現在のステータスです; current 閉店 — 閉店した店舗のステータスは変更できません; target 準備中 — 開業準備中には戻せません; target 閉店 — 閉店日を設定すると自動的に閉店になります; otherwise この遷移はできません. 閉店 is reached only automatically once the closure date passes (Y-02 FR-007).
- **FR-015d**: Confirming MUST persist the new status, update the header badge and status card, close the dialog and show the toast {店舗名}のステータスを「{status}」に変更しました. Persisting endpoint: Q&A Q7 (mock first).
- **FR-016**: A 店舗写真 card MUST show the store's registered photos as a gallery — square thumbnails in a 3-column grid, in their stored order, each with the store name as alternative text — read from the store's photo list (`GET /stores/{id}/images`, `url`). With no photos it MUST show the prototype's placeholder slots (muted image icon), never a broken image. While the list loads it shows placeholders; a failed read shows the placeholders plus a muted 写真を読み込めませんでした (spec-proposed), without affecting the rest of the tab.
- **FR-016a**: **Dev-added, no V0 source (2026-10-02).** The 店舗写真 card header MUST carry, right-aligned, an **編集** button (outline, small, pencil icon) that opens the store edit form for this store, positioned at its 店舗写真 card. It uses exactly the gating of the page-header 編集 (FR-018): enabled for System / Headquarter on any store and for Staff on their own store; otherwise disabled with the same deny tooltips (所属店舗の基本情報のみ編集できます / 本部権限が必要です). The detail screen itself never edits photos — adding and deleting happen on the form (`../store-form/spec.md` FR-055–FR-059f).
- **FR-016b**: **Note — prototype gap.** The prototype has no create/update/delete UI for store photos anywhere: the client updated only the locker UI in the matching Q&A. Dev adds the photo logic (form card + this button) on the team lead's instruction, reusing existing prototype components (I-01 `store-page-form.tsx` 写真管理 card). The designer should be told so V0 can catch up; until then FR-016a and the form's photo card are verified against the spec, not V0.
- **FR-017**: ~~A フロアマップ card MUST show the store's floor-map image, with a placeholder when none is registered.~~ **Withdrawn 2026-10-02** — prototype `e5501a3` removed the card from 基本情報; the floor map is shown on the 店舗マップ tab (FR-110–FR-114).
- **FR-018**: An **編集** action (pencil icon, small, in the page header — prototype `a7d0c88`; it replaces the 基本情報を編集 button and the caption 店舗の基本情報を管理します。 formerly on the 基本情報 tab) MUST open the store edit form. Its deny tooltip MUST read 所属店舗の基本情報のみ編集できます for a Staff on another store and 本部権限が必要です for every other denied role. Y-02's permission matrix carries **two** editing rows, so the action MUST be enabled for System and Headquarter (「基本情報編集（全項目）」) and for Staff on their own store (「基本情報編集（Staff限定項目）: ○ 所属店舗」), and MUST be disabled with an explanation for Manager, Trainer and Observer. A Staff who opens it gets the form with every head-office-only field read-only (spec `028-store-form` FR-081, FR-083, FR-088). ~~The prototype gates the button to Headquarter / System only (`store-detail.tsx` L631); the Y-02 matrix governs here, and a QA goes to the prototype owner to sync it.~~ Closed 2026-10-02 — prototype `6bc1f1c` now enables Staff on the own store only (`store-detail.tsx` L541-544).
- **FR-019**: **Dev-added, no V0 source (2026-11-13, Y-02 261112_v11).** Under 一般情報 a **受付設定** card MUST show 入会受付 (`joiningReception`) and 引き継ぎ受付 (`linkReception`) as two rows separated by a divider, laid out like the edit form's switch rows: the label and the **same helper text as the form** (store-form FR-115) on the left, and right-aligned a badge **受付** (filled) when ON or **停止** (outline, muted) when OFF. The card is read-only for every role; the switches live on the edit form (head office only).

#### 営業設定 tab

- **FR-020**: The 営業カレンダー card MUST show one month at a time in a 7-column grid with 日〜土 headers, and MUST offer a 本日 action returning to the current month and a month picker for choosing any month.
- **FR-021**: Each day cell MUST be classified (FR-024a) and labelled inside the cell as 臨時休業 (info tint), 特別営業 (success tint), 祝日営業 (warning tint), 祝日休業 (destructive tint), 定休日 (destructive tint), 祝日 (un-overridden holiday — label only, no tint), or no label for a plain business day (prototype `3a6c29b`). ~~営業日 / 定休日 / 臨時休業 / 短縮 / 祝日~~.
- **FR-022**: Today's cell MUST be visually distinguished from every other cell.
- **FR-023**: A legend MUST list, in order: 営業日 / 定休日・祝日休業 / 臨時休業 / 特別営業 / 祝日営業, each with its swatch (prototype `3a6c29b`).
- **FR-024**: The day classification MUST be derived from the store's own data — the weekly default hours (closed days), the 祝日の扱い override, the registered 特別営業日 and 臨時休業日, and the holiday set — not from a fixed pattern.
- **FR-024a**: The classification MUST apply Y-02 v6 FR-005 「営業/休業の判定ルール（優先順位）」, highest first: ① 個別日設定 — 臨時休業日 → 臨時休業, 特別営業日 → 特別営業; ② 祝日設定, only when the store overrides holidays — 営業 → 祝日営業, 休業 → 祝日休業; ③ 曜日設定 — the weekday's 定休日 → 定休日, otherwise business day (labelled 祝日 when the date is a holiday). A holiday without an override follows its weekday. Because only one 個別日設定 may exist per date (FR-029b), no ordering inside ① is needed (prototype `3a6c29b`, `store-detail.tsx` L437-452).
- **FR-025**: The 営業時間設定 card MUST list 月曜日〜日曜日, each showing its open〜close window or 定休日, plus a 祝日 row showing 曜日どおり (muted) when not overridden, 休業 (destructive) when overridden closed, or its open〜close window when overridden 営業 (prototype `3a6c29b`).
- **FR-026**: A スタッフ常駐時間帯 block MUST repeat the same day rows showing the staffed window, MUST show — where no staff is resident, and MUST state that the value is used for gate-stop decisions; the 祝日 row shows 曜日どおり / 休業 like FR-025.
- **FR-027**: A **特別営業日** block (~~例外営業時間設定~~, renamed in prototype `3a6c29b`) MUST list each registered special business day with its open 〜 close hours; a 臨時休業日 block MUST list each registered closure date with its reason (— when empty). Both lists MUST be sorted by date ascending; an empty block MUST read 特別営業日の設定はありません / 臨時休業日の設定はありません. Each block MUST offer 日付追加 and each row an edit and a delete affordance (aria-labels {date} の特別営業日を編集 / 削除, {date} の臨時休業日を編集 / 削除).
- **FR-028**: Every edit / add / delete affordance in this tab MUST be restricted to System, Headquarter and Staff, and MUST be inert with an explanation for Manager, Trainer and Observer.
- **FR-029**: The 営業時間設定 編集 action MUST open a right-side Sheet titled 営業時間を設定する (clock icon) with the guidance 「通常営業日の曜日別営業時間を設定します。定休日にした曜日は営業カレンダーに定休日として反映されます。祝日は「曜日どおり」のとき、その日の曜日の設定に従います。」, one row per weekday with open / close time inputs and a 定休日 checkbox that disables them, the 祝日 row of FR-029f, and キャンセル / 保存する; saving persists the weekly set as a whole and shows 営業時間設定を保存しました (prototype `6bc1f1c`, `3a6c29b`). A day marked open (and 祝日 set to 営業) MUST carry both times, and its closing time MUST be later than its opening time — spec rule, no V0 source (the prototype saves without validation); a reversed or equal pair blocks saving with 「{曜日}の閉店時刻は開店時刻より後の時刻を入力してください」 rather than reaching the backend's 422 E-STR-003 (Y-02 v7 FR-005; Y-02 Bug No.8, 2026-11-05). Overnight hours via the 「翌日」 check are not built yet.
- **FR-029a**: The スタッフ常駐時間帯 編集 action MUST open the same Sheet titled スタッフ常駐時間帯を設定する with the guidance 「ゲートストップの判定に使用されるスタッフ常駐時間帯を曜日別に設定します。常駐しない曜日は「常駐なし」にしてください。」: each open day has start / end inputs and a 常駐なし checkbox (ticking clears the window; unticking seeds it from the opening hours), a 定休日 day shows 定休日, and the 祝日 row shows 曜日どおり（その日の曜日の常駐時間帯） or 休業 per its override; saved together with the weekly hours, toast スタッフ常駐時間帯を保存しました.
- **FR-029b**: 特別営業日 MUST support adding, editing and deleting a dated special business day through a dialog titled 特別営業日を追加 / 特別営業日を編集 with the description 「祝日や年末年始など、通常と異なる営業時間で営業する日を設定します。」, a required 日付 (DatePicker, placeholder 日付を選択), a required 営業時間 (open 〜 close, default 10:00 〜 17:00) and キャンセル / 追加する (変更を保存 when editing); toasts 特別営業日を追加しました / 特別営業日を更新しました with {date} {open} 〜 {close}. **Only one 個別日設定 may exist per store per date across both kinds** (Y-02 v6 「個別日設定の重複制約」): choosing a date that already holds a 特別営業日 or a 臨時休業日 (other than the row being edited) MUST flag the date field with この日はすでに{特別営業日|臨時休業日}が登録されています。既存の設定を編集または削除してください and disable saving (prototype `3a6c29b`). Close after open — spec rule, no V0 source.
- **FR-029c**: 臨時休業日 MUST support adding, editing and deleting a dated closure through the same dialog titled 臨時休業日を追加 / 臨時休業日を編集 with the description 「工事・清掃等で休業する日を設定します。営業カレンダーに臨時休業として反映されます。」, a required 日付 and an optional 理由 (placeholder 例: 設備点検), under the same cross-kind one-per-date rule as FR-029b; toasts 臨時休業日を追加しました / 臨時休業日を更新しました.
- **FR-029d**: Every editing flow in this tab MUST report success and failure explicitly, and MUST leave the calendar and the affected lists refreshed on success.
- **FR-029e**: Deleting a 特別営業日 or 臨時休業日 MUST ask for confirmation in an AlertDialog titled 特別営業日を削除しますか？ / 臨時休業日を削除しますか？ with the body 「{date} の設定を削除します。この日は祝日・曜日の設定に従います。」 and キャンセル / 削除する (destructive); toasts 特別営業日を削除しました / 臨時休業日を削除しました (prototype `3a6c29b`).
- **FR-029f**: The 祝日 row of the hours Sheet MUST be a select **祝日の扱い** with exactly 曜日どおり (default — no override, the holiday follows its weekday), 営業 and 休業; open / close inputs (aria-labels 祝日 開店時刻 / 祝日 閉店時刻) MUST appear only for 営業 (prototype `3a6c29b`). How 曜日どおり is stored is a contract gap — Q&A Q15 (same as the store-form spec's Q4; the mock stores the mode until BE decides).

#### 契約・料金 tab — plans and options

- **FR-030**: The tab MUST open with a banner stating that the masters are authored in the 商材・施策 menu and that price and condition changes are made there.
- **FR-031**: The 主契約プラン section MUST show a count badge and a table of 主契約ID / 主契約名 / 契約タイプ / 料金（税込） / 区分 / 紐づけ日 / 操作 (区分 added in prototype `6bc1f1c` / `a7d0c88`). The table MUST list the store's **complete** set of attached plans — it is not paginated — and the count badge MUST report that whole set.
- **FR-031a**: 区分 MUST render a small badge — 全社共通 (building icon, warning tint) for a head-office master plan, 当店限定 (store icon, info tint) for a plan specific to this store (「販売設定の開発回答: プラン側の意味は「全社共通／当店限定の特殊契約」」, prototype `a7d0c88`). Field source: Q&A Q13.
- **FR-031b**: A linked plan whose master is 無効 (`isActive=false`, API-084 v0.11) MUST stay in the table with a 無効 badge beside 主契約名 (修正提案-No15). Options show no such badge until `StoreOptionDto` exposes `isActive` (pending BE ask).
- **FR-032**: The オプション section MUST show a count badge and a table of オプションID / オプション名 / 料金（税込） / 操作, under the same complete-set rule as FR-031. ~~親オプション~~ removed and **no origin** shown (「オプションには本部/店舗の概念が無いため出所列は置かない」, prototype `6bc1f1c` / `a7d0c88`).
- **FR-033**: A 紐づけ追加 action on each section MUST open a side panel listing the master entries not yet attached to this store, each with a selection control and its name; plan candidates carry a 全社共通 / 当店限定 badge and the meta line {type} · {price} · {id}; option candidates carry no badge and the meta line {price} · {id} (prototype `a7d0c88`). The panel MUST list only 有効 (active) masters: candidates are requested with `isActive=true` (API-084 v0.11, 修正提案-No15); a 無効 master is never offered.
- **FR-034**: The side panel MUST offer a search box matching candidate name or id. The search MUST be applied over the whole master rather than over a loaded page, so a candidate is findable regardless of where it sits in the master; the panel MUST show the resulting candidate count and an explicit "nothing available" message when nothing matches.
- **FR-035**: The side panel MUST support selecting several candidates at once; its confirm action MUST be disabled while nothing is selected and MUST name the number selected; cancelling MUST discard the selection.
- **FR-036**: Confirming MUST attach every selected entry to the store, close the panel, and refresh the section's table and count badge. A newly attached plan MUST carry the current date as its 紐づけ日.
- **FR-037**: Each row's unlink control MUST ask for confirmation, naming the entry and stating that new contracts will no longer be possible, before detaching it.
- **FR-038**: Attach and detach on both sections MUST be restricted to System and Headquarter; for every other role both controls MUST be disabled with an explanation.
- **FR-039**: Any attach or detach MUST persist the store's **complete** resulting link set. The payload MUST be assembled from the store's whole attached set (the same set the section table renders under FR-031/FR-032), never from a partial page, so no link is dropped by a save.

#### 契約・料金 tab — campaigns

- **FR-040**: The キャンペーン section MUST show a count badge and a table of キャンペーンID / キャンペーン名 / 割引概要 / 募集期間 / 受付可否 / 紐づけ日 / 解除, with 受付可否 as a badge over 受付中 / 受付停止 / 上限到達.
- **FR-041**: An attached campaign that is not published to this store MUST carry a 公開対象外 marker beside its name explaining that head office has not included this store.
- **FR-042**: Attached campaigns MUST NOT be removed automatically when they expire, stop accepting, or become unpublished; only an explicit detach removes them.
- **FR-043**: The attach panel MUST list campaigns not yet attached, filtered by a name-or-id search, and MUST render as non-selectable — dimmed, with a single reason label and an explanatory tooltip — any candidate that is of another brand (ブランド対象外), not published to this store (公開対象外), or past its recruitment period (募集期間終了), applying exactly that precedence.
- **FR-044**: A candidate whose acceptance state is 受付停止 or 上限到達 MUST remain selectable.
- **FR-045**: Attaching MUST confirm each campaign by name, stating that it becomes selectable in this store's enrolment applications, or that it will become so once acceptance resumes when acceptance is not currently open.
- **FR-046**: Detaching MUST ask for confirmation stating that the campaign will no longer be selectable in this store's enrolment applications, and MUST confirm the result by name.
- **FR-047**: Attach and detach MUST be restricted to System, Headquarter and Staff; Manager, Trainer and Observer MUST see both disabled with an explanation.

#### 契約・料金 tab — 1DayPass pricing

- **FR-050**: The 1DayPass価格設定 section MUST show a count badge over the store's per-date prices and a read-only table of 適用日 (with its weekday) / 販売価格（税込） / 備考 for one selected month, sorted ascending by date, with — for an empty note.
- **FR-050a**: The base price the section and the pricing panel name MUST be the store's own default 1DayPass price, falling back to the 1Day利用 plan master's price when the store has no default. No control in this feature sets that default.
- **FR-051**: A month picker MUST appear only when at least one per-date price exists, and MUST offer only months that actually hold data.
- **FR-052**: With no per-date price at all, the section MUST state that all days sell at the base price, naming it; with a selected month that holds none, the table MUST state that this month has no price settings.
- **FR-053**: A 価格を設定 action MUST open a pricing panel showing the base price and the head-office permitted range as a constraint band, a month navigator (本日, previous, next, month label), and a month calendar.
- **FR-054**: In the pricing calendar, days that already carry a price MUST be tinted and show that price; tapping a day MUST toggle it in or out of the selection; a legend MUST explain 基準価格 / 個別設定あり / 選択中.
- **FR-055**: Selecting a single already-priced day while nothing else is selected MUST pre-fill the form with that day's price and note.
- **FR-056**: With at least one day selected, an inline panel MUST show the number of days selected, the sorted list of selected dates, a clear-selection action, a required price field with a 円 suffix, and an optional note field.
- **FR-057**: A price outside ¥700–¥1,800 MUST flag the field, replace the range hint with 700円〜1,800円の範囲で入力してください, and block applying. Applying MUST also be blocked while the price is empty or no day is selected.
- **FR-058**: When any selected day already carries a price, the panel MUST warn that existing settings will be overwritten and MUST offer a 設定を解除 action.
- **FR-059**: Applying MUST set the entered price and note on every selected day, overwriting existing settings, then clear the selection and the form.
- **FR-060**: Clearing MUST ask for confirmation, stating that the affected days revert to the base price, before removing those days' per-date prices.
- **FR-061**: Closing the panel MUST discard any in-progress selection and form input.
- **FR-062**: The whole pricing feature MUST be restricted to System, Headquarter and Staff; for every other role the panel MUST NOT open and calendar days MUST NOT be selectable.
- **FR-063**: The permitted price range MUST be a system constant in Phase 1 (Y-02 FR-003); no screen in this feature may change it.

#### 入退館設定 tab

- **FR-070**: The 相互利用設定 card MUST show the acceptance row by brand (Y-02 FR-004; prototype `6bc1f1c`): a JOYFIT-group store — label どこでもJOYの受入, description どこでもJOYを利用する他のJOYFIT店舗の会員を受け入れる; a FIT365 store — label 相互利用オプション（¥500）の受入, description 相互利用オプション契約者（他のFIT365店舗の会員）の利用を受け入れる; with a 受入可 (success) / 受入不可 (muted) badge. ~~相互利用 / 他店舗会員の受入を許可する~~.
- **FR-070a**: A JOYFIT-group store MUST additionally show a 1日単位の後払い設定 row (description どこでもJOYの他店舗利用分を1日単位の後払いで請求する) with a 有効 / 無効 badge; a FIT365 store MUST NOT show it.
- **FR-071**: The card MUST show 相互利用受入可能期間（開始日） / （終了日） (— when unset) and 18歳未満入館可能時間（開始） / （終了）, for both brands.
- **FR-072**: A block labelled 相互利用グループ（許可店舗・{brand}ブランドのみ） MUST show a {N}店舗 count badge and a table of 店舗名 / ブランド (brand badge) / 設定日; partners are stores of the same brand only (Y-02 「ブランドをまたいだ相互利用は不可」, prototype `6bc1f1c`).
- **FR-073**: For a JOYFIT-group store only, a どこでもJOY YOGA利用料金 card MUST show YOGA利用料金（1日） with the fee as ¥{amount} and the note 利用店舗に計上; a FIT365 store MUST NOT show the card (prototype `6bc1f1c`).
- **FR-074**: The tab MUST render read-only; the card's 編集 action MUST be restricted to System and Headquarter (deny tooltip 相互利用設定はHQ/Systemのみ編集可能) and MUST open a right-side Sheet titled 相互利用設定を編集する (prototype `6bc1f1c`; replaces the inline edit mode).
- **FR-075**: The Sheet MUST hold, in order: the acceptance Switch labelled as in FR-070 (description 他のJOYFIT店舗のどこでもJOY利用会員を受け入れる / 他のFIT365店舗の相互利用オプション契約者を受け入れる) between 受入不可 and 受入可; for JOYFIT only, the 1日単位の後払い設定 Switch (他店舗利用分を1日単位の後払いで請求する) between 無効 and 有効, and a number input **YOGA利用料金（1日・税別）** with a 円 suffix and the hint 利用店舗に計上されます; 受入可能期間（開始日） / （終了日） DatePickers (日付を選択); 18歳未満入館可能時間 as two time inputs; キャンセル / 保存する, toast 相互利用設定を保存しました. The acceptance MUST NOT be operable outside the Sheet (client decision, QA #52). The end of the acceptance period MUST NOT precede its start — spec rule, no V0 source. The YOGA fee is mock-first (Q&A Q12).
- **FR-076**: ~~Adding or removing a mutual-use partner store MUST be possible in edit mode, restricted to the same brand group, excluding closed stores and the store itself, and MUST report a rejected addition with its reason.~~ **Withdrawn from Phase 1 2026-10-02** — the prototype's Sheet has no partner UI (D22); see Out of Scope.

#### 店舗マップ tab

- **FR-110**: The 店舗マップ tab MUST show a card titled 店舗マップ displaying the store's last saved floor map (Y-02 FR-006 / Y-02-05, prototype `e5501a3`); it is read-only — editing happens on the store-map-setup screen (`specs/026-store-management/store-map-setup/`).
- **FR-111**: When a floor image is registered, the card description MUST read 配置済み {N}台 ・ 未配置 {M}台, where 未配置 is a warning badge when M > 0 and plain text 未配置 0台 otherwise.
- **FR-112**: The card MUST render the floor image (alt {店舗名}のフロア図) with one read-only marker per placed locker cabinet (fixed size, tooltip only); unplaced cabinets are not drawn.
- **FR-113**: With no floor image the card MUST show the empty state フロア図が登録されていません, with the action 店舗マップ設定で登録する for editors only.
- **FR-114**: An outline 店舗マップ設定 button (map icon) in the card header MUST open the store-map-setup screen for this store, enabled for System, Headquarter, and Staff on their own store (Y-02 matrix 「店舗マップ設定: ○ / ○ 全店舗 / × / ○ 所属店舗 / × / ×」). For every other caller the header MUST instead show a lock icon and 閲覧のみ. The prototype grants Staff on any store (`STORE_MAP_EDITABLE_ROLES`); the own-store limit is the user's 2026-10-02 decision — Q&A Q9.

#### 変更履歴 tab

- **FR-080**: The 変更履歴 tab MUST show a table of 変更日時 / 変更者 / 変更項目 / 変更前 / 変更後, newest first, with — where a prior value does not exist.
- **FR-081**: This feature MUST NOT create, edit or delete history rows anywhere; the tab reads pre-seeded data only.
- **FR-082**: History rows MUST be supplied as a resolved field-level diff — changed item, value before, value after — so the screen performs no interpretation of a change snapshot.
- **FR-082a**: A change to 入会受付 / 引き継ぎ受付 MUST name the item 入会受付 / 引き継ぎ受付 (never the raw `joiningReception` / `linkReception`) and show its values as 受付 / 停止 (2026-11-13).
- **FR-083**: The 変更履歴 tab MUST be available only to System, Headquarter and Manager. For Staff, Trainer and Observer the tab MUST NOT be reachable, and a direct attempt MUST show a not-permitted state rather than an empty table.

#### Permissions

- **FR-090**: The screen MUST apply these per-action roles, from the Y-02 permission matrix and G-03:

  | Action                                          | System | Headquarter | Manager   | Staff | Trainer | Observer |
  | ----------------------------------------------- | ------ | ----------- | --------- | ----- | ------- | -------- |
  | View the store detail                           | ○      | ○ all       | ○ managed | ○ own | ○ own   | ○ own    |
  | 基本情報を編集 (opens the store form)           | ○      | ○           | ×         | ○ own | ×       | ×        |
  | Operating-calendar editing (hours / exceptions) | ○      | ○           | ×         | ○ own | ×       | ×        |
  | Plan / option attach & detach                   | ○      | ○           | ×         | ×     | ×       | ×        |
  | Campaign attach & detach                        | ○      | ○           | ×         | ○ own | ×       | ×        |
  | 1DayPass per-date pricing                       | ○      | ○           | ×         | ○ own | ×       | ×        |
  | View 変更履歴                                   | ○      | ○           | ○         | ×     | ×       | ×        |
  | Mutual-use settings editing                     | ○      | ○           | ×         | ×     | ×       | ×        |
  | ステータス変更 (FR-015a)                        | ○      | ○           | ×         | ×     | ×       | ×        |
  | 店舗マップ設定 entry (FR-114)                   | ○      | ○           | ×         | ○ own | ×       | ×        |

  Trainer and Observer are granted the same linked-store read access as Staff, following the store list's resolved scoping (026 Q2), even though the Y-02 permission matrix marks both × for 店舗一覧・基本情報参照; that matrix line is treated as superseded for these two screens so the pair stays consistent.

- **FR-091**: A denied action MUST remain visible but inert, with a tooltip naming the roles that may perform it — never silently hidden.

#### Data

- **FR-095**: Every value the screen renders MUST come from the project's mock API, whose shapes mirror the backend design (Appendix A) so the later swap to the real client is mechanical.
- **FR-096**: Where the backend design has no field for something the screen shows, the mock MUST supply it and the gap MUST be recorded in Appendix A.3 for the backend to close.

### Key Entities

- **Store** — the master record: identity (internal id, club code, name, kana), brand, organisational territory, operating company, address block, contact numbers, opening and closure dates, sub-brand, reception-start / pre-open / opening / closure dates, gender restriction, memo, lifecycle status (準備中 / 営業中 / 休業中 / 閉店), creation and update stamps.
- **Store image** — the gallery of store photos shown on 基本情報.
- **Store map** — the floor image plus locker cabinets, each placed (relative coordinates) or unplaced; read on 店舗マップ, written by store-map-setup.
- **Weekly business hours** — seven weekday rows, each with an open and close time or a closed flag, plus a 祝日 row holding 祝日の扱い (曜日どおり / 営業 with times / 休業), and the staff-resident window used by gate-stop.
- **Business exception day (個別日設定)** — one dated deviation, at most one per store per date: a 特別営業日 (open, with times) or a 臨時休業日 (closed, with an optional reason).
- **Holiday** — a dated national holiday the calendar classifies as 祝日.
- **Store plan link** — the association between the store and a main-contract plan of its brand, carrying the plan's name, contract type, price, origin (head office / store) and link date.
- **Store option link** — the same for an option, carrying its parent option, price, origin and link date.
- **Store campaign link** — the association between the store and a campaign, carrying the campaign's discount summary, recruitment period, acceptance state, publication to this store, and link date.
- **1DayPass price** — the store's base price plus per-date exceptions, each with a date, a price inside the permitted range and an optional note.
- **Mutual-use settings** — acceptance flag (どこでもJOY for JOYFIT, 相互利用オプション（¥500） for FIT365), acceptance period, minor-entry window; JOYFIT only: deferred-payment flag and cross-store yoga fee.
- **Mutual-use partner store** — one allowed partner of the store's brand, with its name, brand and setting date (read-only in Phase 1).
- **Store change history entry** — an audit row: timestamp, actor, changed item, value before, value after.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An operator can open a store from the list and read every one of its master attributes without leaving the screen or opening a second one.
- **SC-002**: 100% of the fields, columns, badges and states the prototype renders on this screen (see `checklists/parity.md`) are present, with matching labels and ordering.
- **SC-003**: An operator can tell, for any day of any month, whether the store is open, regularly closed, temporarily closed, on shortened hours or on a holiday, in a single glance at the calendar.
- **SC-004**: A head-office operator can attach a plan or option to a store in under 30 seconds from opening the tab, including finding it by search.
- **SC-005**: No attach or detach ever removes a link the operator did not act on, including when the master spans several pages.
- **SC-006**: A store staff member can price a run of dates in one operation rather than one date at a time, and cannot save a price outside the permitted range.
- **SC-007**: Every action a role may not perform is visible and explains why, in 100% of cases — no action disappears without explanation.
- **SC-008**: An auditor can determine who changed what and when for any seeded change, with the value before and after, without leaving the screen.

---

## Assumptions

- The screen is opened for one existing store; store creation and store-attribute editing belong to the store form, a separate feature.
- The store's lifecycle vocabulary is the four-value set 準備中 / 営業中 / 休業中 / 閉店 (2026-10-02), consistent with the 026 list spec and one-to-one with the backend enum.
- The organisational hierarchy (area / territory) behind the テリトリー field is supplied by the project mock, exactly as on the list screen — the backend has no concept of it yet.
- 紐づけ日 for a newly attached plan is the date the attachment is made (the prototype hardcodes a fixed date; that is prototype data, not behaviour).
- The base 1DayPass price is the store's own default price, read from the store's pricing data and falling back to the 1Day利用 plan master when unset; nothing on this screen sets it. The permitted range (¥700–¥1,800) is a Phase 1 system constant (Y-02 FR-003), also not settable here.
- Store photos and the floor map are read through the store's image/CMS content, which the backend exposes as separate endpoints from the store record itself (client-confirmed in QA #204).
- Change-history rows are seeded with a field-level before/after already resolved, so the tab needs no interpretation logic — pending Q2.
- The calendar's day classification is derived from the store's own hours, 祝日の扱い, 個別日設定 and the holiday set under the Y-02 v6 precedence; the prototype's 2026 holiday list and its sample 特別営業日 / 臨時休業日 are fixtures, not rules.
- The JOYFIT / FIT365 split on 入退館設定 is decided by the store's brand group (FIT365 vs the JOYFIT group).
- Times past midnight are expressed on a 26-hour clock (a 02:00 close renders as 26:00), following the backend's business-hour convention.

---

## Out of Scope for Phase 1

- ~~**店舗マップ tab (Y-02 FR-006)** — the prototype renders it only under the Phase 2 switch, and its body is an explicit "next phase" placeholder (`store-detail.tsx` L617-619, L1918-1936). No locker-coordinate editing, no floor-plan overlay.~~ Back in scope 2026-10-02 (D1, FR-110–FR-114); locker-coordinate editing belongs to `specs/026-store-management/store-map-setup/`.
- **Mutual-use partner add / remove (former FR-076)** — the prototype's 相互利用設定 Sheet has no partner UI (D22); the partner list is read-only in Phase 1 even though the backend has `PUT/DELETE /stores/{id}/mutual-use-allowed-stores/{partnerStoreId}`.
- **Creating, editing or deleting change-history rows** — explicitly excluded by the user's instruction; history is seeded and read-only (FR-081).
- **機能制限 tab** — present in an earlier prototype, removed after the client answered QA #45 (「chưa thêm spec, đợi sau」). Not to be built until Y-02 defines it.
- **Holiday master management screens** — the backend exposes five holiday endpoints, but Y-02 FR-005 describes holidays as automatically imported from the Cabinet Office API, and no prototype screen manages them. Treated as internal operations (recorded in the API-083 cluster tracking, 2026-08-19).
- **Head-office editing of the 1DayPass price range** — Y-02 FR-003 defers it to Y-07 in Phase 2 (#311).
- **Store closure member-transfer batch (Y-02 FR-007)** — the closure date is displayed here, but the announcement, member transfer applications and the bulk transfer batch are owned by A-01 and the TAS team.
- **Store page content authoring (店舗紹介文 / アクセス情報 / 駐車場情報 / 総合案内 / SNS URLs)** — the backend can write these 14 fields, but no prototype form inputs them; tracked as a prototype gap (QA #208 material), not built here.
- **Bulk territory change** — belongs to the store list screen (026 US4).
- **テリトリー row on 基本情報 (FR-013)** — Phase 2: Y-15 組織階層管理 is Phase 2 on the client's CRM Category board (clarified 2026-09-23). Round 3 of the integration plan (B1 / R301).

---

## Implementation Notes — 2026-08-28

> Historical record of the 2026-08-28 build. Where it differs from Session 2026-10-02 (e.g. 本部/店舗 badges on options, 親オプション, the inline mutual-use edit mode, the フロアマップ card, two-value status), Session 2026-10-02 governs.

The screen was brought to prototype parity in this branch. Recorded here so review and QA know
what was added, what was **removed** because the prototype does not have it, and which mock
endpoints now back each section.

### What was added

| Area       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page shell | Back link 店舗管理に戻る replaces the two-level breadcrumb (prototype uses a back link); tab 入退室設定 renamed **入退館設定**; warning banner copy replaced with the prototype's 機能制限や入退館設定の変更は、会員の利用に即時反映されます。; new **変更履歴** tab, mounted only for System / Headquarter / Manager (FR-083)                                                                                                                                                                                                   |
| 基本情報   | Field set rebuilt to the prototype's 16 fields in its order, including the new テリトリー + resolved hierarchy path, FAX番号, 店舗名（カナ）, 開店日, 閉店日, 性別制限, 備考; 運営企業 now falls back to 直営; status card replaced by the shared `StatusCard` with 作成 / 更新 stamps; photo grid 4 slots; floor map 16:9; 基本情報を編集 moved into the tab beside the 店舗の基本情報を管理します。 caption                                                                                                                    |
| 営業設定   | スタッフ常駐時間帯 block added (per-day staffed window, — for 常駐なし, gate-stop explanation, its own 編集 flow); calendar rewritten to the prototype's five classes (営業日 / 定休日 / 臨時休業 / 短縮営業 / 祝日等) with the class label inside the cell, a today marker and a month picker; the hardcoded `MOCK_CLOSED_DATES` fixture was deleted — classification now comes from the store's weekly hours, its exception days, its temporary closures and the holiday master                                                |
| 契約・料金 | New **キャンペーン** section (table + attach panel with the three block reasons and their precedence, per-campaign toasts, unlink confirmation) and new **1DayPass価格設定** section (month-scoped read-only table + pricing panel: constraint band, month navigator, multi-date calendar selection, overwrite warning, ¥700–¥1,800 validation, clear-with-confirmation); 出所 badge labels changed 本部作成/店舗限定 → **本部/店舗** with icons; attach panels now report the selection count and name it on the confirm button |
| 入退館設定 | New 1日単位の後払い設定 row; どこでもJOY YOGA利用料金 card showing the single per-day fee with 利用店舗に計上                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Shared     | `MonthPicker` gained an optional `isMonthEnabled` so the 1DayPass month picker offers only months that hold data                                                                                                                                                                                                                                                                                                                                                                                                                 |

### What was removed (not in the prototype)

- **ソーシャル card** on 基本情報 (インドアビュー / Google Map / X / Instagram / LINE / Facebook / YouTube) — store page content belongs to I-01 and is out of scope for Phase 1. The store form still writes those fields, so the mock keeps them.
- **エリア / メールアドレス / 会計コード / FCフラグ** rows on 基本情報 — the prototype shows none of them; 運営企業 carries the 直営 distinction instead of an FC badge.
- **どこでもJOY利用料金 fee table** (rows with 行追加 / edit / delete) on 入退館設定 — replaced by the prototype's single YOGA fee value. `JoyUsageFee` and `joy_usage_fees` were deleted from the mock schema.
- **Pagination on the 主契約プラン / オプション tables** — the prototype has none, and FR-031/FR-032 require the complete attached set to be rendered (it is also the source of the full-set save payload, FR-039).

### Mock endpoints backing the screen

| Section      | Endpoint                                                                                                                                                                   | Modelled on                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 基本情報     | `GET /crm/stores/{id}` — now returns `territory_path` alongside `store`, and the store row carries `name_kana` / `fax` / `opening_date` / `gender_restriction` / `memo`    | API-083 §4 `StoreDetailDto` (+ the mock's hierarchy addition)                                          |
| 営業設定     | `GET`/`PATCH /crm/stores/{id}/business-hours` — weekly rows gained `staff_start_time` / `staff_end_time`                                                                   | API-083 §7-8 (staff window per QA #206)                                                                |
| 契約・料金   | `GET`/`POST /crm/stores/{id}/main-contracts`, `DELETE …/{contractId}`, and the option pair                                                                                 | API-084 §3-6 (the project keeps per-row delete for now; the full-set `PUT` swap is FR-039's follow-up) |
| キャンペーン | `GET /crm/stores/{id}/campaigns`, `GET …/campaigns/candidates?keyword=`, `POST …/campaigns`, `DELETE …/campaigns/{campaignId}`                                             | API-088 §10-12 — `POST` takes an id **array** because the prototype attaches several at once           |
| 1DayPass     | `GET /crm/stores/{id}/one-day-pass-price`, `PUT`/`DELETE /crm/stores/{id}/one-day-pass-exceptions`                                                                         | API-084 §7-10 — the mock applies the design's per-date upsert semantics to a whole date set            |
| 入退館設定   | `GET`/`PUT /crm/stores/{id}/access-settings` — gained `deferred_payment_enabled` and `yoga_usage_fee`, lost `joy_usage_fees`                                               | API-084 §11 `MutualUseResponseDto` + Y-02 FR-004 for the two fields the design lacks                   |
| 変更履歴     | `GET /crm/stores/{id}/change-history` — rows now carry `field_label` / `before` / `after` instead of a free-shape `snapshot`; the route rejects Staff / Trainer / Observer | API-083 §10 (diff per FR-082, roles per FR-083)                                                        |

### Second parity pass — prototype run side by side (2026-08-28)

The prototype was installed and served (`.cache/fitness-crm-ui`, `vite --port 5199`) and every tab
was screenshotted in both apps and compared. The differences found were fixed:

| Tab        | Was                                                                   | Now                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All        | Tab bar rendered as segmented pills on a `bg-muted` track             | `TabsList variant="line"` — the underline tabs the prototype uses                                                                                       |
| 基本情報   | A divider line under each card header                                 | No divider, matching the prototype's card headers                                                                                                       |
| 営業設定   | Month picker without arrows                                           | 本日 + ‹ + month picker + › as in the prototype                                                                                                         |
| 契約・料金 | Banner was an `Alert` with an info icon and 14px text                 | Plain tinted box, no icon, 11px text                                                                                                                    |
| 契約・料金 | Tables sat in an inset rounded border inside a padded card            | Full-bleed: card header (title + count badge + 紐づけ追加), table header row spanning the card                                                          |
| 契約・料金 | 料金（税込） right-aligned, 操作 centred                              | 料金（税込） left-aligned, 操作 / 解除 right-aligned                                                                                                    |
| 契約・料金 | Count rendered as a grey pill                                         | Secondary badge `{N}件`, as in the prototype                                                                                                            |
| 契約・料金 | Option column headed 関連オプション; attach panel said 主契約のプラン | 親オプション; 未紐づけのプラン / 未紐づけのオプション                                                                                                   |
| 入退館設定 | 編集 floated in a sticky toolbar above the cards                      | 編集 sits in the 相互利用設定 card header                                                                                                               |
| 入退館設定 | Read mode showed a disabled Switch                                    | Read mode shows the 受入可 / 有効 badges; the Switch appears only in edit mode (keeps QA #52's rule that the toggle is not operable outside edit mode)  |
| 入退館設定 | 3店舗 badge sat next to its label                                     | Badge right-aligned on the row                                                                                                                          |
| 変更履歴   | Timestamps without seconds, and the seeds' UTC instants rendered +9h  | Seconds shown (as the prototype and the brand-history table do), and the seeds carry the JST instants so the rendered wall clock equals the prototype's |

**Deliberate deviations that remain** (flagged, not oversights):

- **Money format** — the screen shows `¥7,700`; the prototype shows `7,700円`. `formatYen` is the project-wide helper (41 files), so changing it here alone would break consistency across screens. A global switch is a separate decision.
- **Calendar sample days** — the prototype hardcodes 定休日 on the 2nd/4th Wednesday plus a 臨時休業 and a 短縮 day in March. This screen derives every class from the store's own data (FR-024), so those appear only where the store actually has them.
- **Demo data** — the mock's store-001 is 直営 with code `STR-00001`; the prototype's fixture is an FC-operated store `ST-001`. Data identity, not UI.
- **1DayPass panel** — built with the project's right-side `Drawer` (the prototype uses a `Sheet`); same width and the same content.

### Verified against the running app

Every mock endpoint was called for real (Headquarter, Manager and Staff tokens) and every tab was
rendered in a browser: 基本情報 / 営業設定 / 契約・料金 / 入退館設定 / 変更履歴, the campaign attach
panel (block reasons 公開対象外 and ブランド対象外 both rendering), and the 1DayPass pricing panel
(multi-date selection, out-of-range rejection, apply). Role gates confirmed live: Staff → own store
200, other store 403, change-history 403; Manager → change-history 200, campaign link 403.
`npm run type-check` and `eslint` are clean; `openapi.json` and the generated client were regenerated.

## Traceability Matrix

> Lines point at `c1c7e2e` unless marked **HEAD** (`47423ec`). Rows changed 2026-10-02 are rewritten in place; rows 45–52 are new.

| #   | UI element (`store-detail.tsx`)                                             | Lines                     | Requirement source                                                                                          | Spec FR                  |
| --- | --------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | `BackLink` 店舗管理に戻る                                                   | L587-590                  | Y-02 FR-001 → detail navigation                                                                             | FR-002                   |
| 2   | Title + 4-value status badge + header 編集                                  | HEAD L926-946             | Y-02 FR-001 + 開発回答 2026/08/24                                                                           | FR-002, FR-018           |
| 3   | Warning `Alert`                                                             | L602-607                  | Prototype UX convention                                                                                     | FR-003                   |
| 4   | `TabsList` 基本情報/営業設定/契約・料金/入退館設定/店舗マップ/変更履歴      | HEAD L959-968             | Y-02-01〜Y-02-05 補足セクション + Y-02 FR-008                                                               | FR-004                   |
| 5   | 店舗マップ tab (always rendered)                                            | HEAD L964-965, L2621-2684 | Y-02 FR-006 / Y-02-05                                                                                       | FR-004, FR-110–FR-114    |
| 6   | Header 編集 `RoleGatedButton` (own-store Staff)                             | HEAD L934-946, L541-544   | Y-02 権限マトリクス「基本情報編集（全項目）: System/HQ」＋「基本情報編集（Staff限定項目）: Staff 所属店舗」 | FR-018, FR-090           |
| 7   | 一般情報 card, 19 fields (サブブランド / 受付開始日 / プレオープン日 added) | HEAD L975-1082            | Y-02 FR-002 登録・編集項目                                                                                  | FR-010–FR-014            |
| 8   | テリトリー + `TerritoryBreadcrumb`                                          | L667-672                  | Y-02 FR-002「テリトリー（Y-15…必須）」「上位階層は自動確定」                                                | FR-013                   |
| 9   | 閉店日 field (— while operating)                                            | L705-709                  | Y-02 FR-002 / FR-007「閉店日（任意）」                                                                      | FR-010, FR-014           |
| 10  | `StatusCard` with 作成 / 更新 stamps                                        | L727-732                  | Y-02 FR-008 変更履歴の前提（更新日時）                                                                      | FR-015                   |
| 11  | 店舗写真 card (+ dev-added 編集 button → edit form, FR-016a)                | L735-750                  | Y-02 権限マトリクス note「Staff編集可能: 店舗写真」                                                         | FR-016                   |
| 12  | ~~フロアマップ card~~ (removed `e5501a3`)                                   | —                         | Y-02 権限マトリクス note「フロアマップ」                                                                    | FR-017 (withdrawn)       |
| 13  | 営業カレンダー card + 本日 + `MonthPicker`                                  | L772-800                  | Y-02 FR-005「月次カレンダー表示」                                                                           | FR-020                   |
| 14  | Day classification `resolveCalendarDay` + tints                             | HEAD L421-452, L1183-1194 | Y-02 v6 FR-005 判定ルール（優先順位）                                                                       | FR-021, FR-024, FR-024a  |
| 15  | Today's cell marker                                                         | L364-368                  | UI convention                                                                                               | FR-022                   |
| 16  | Calendar legend (5 entries, v6 labels)                                      | HEAD L1200-1221           | Y-02 FR-005                                                                                                 | FR-023                   |
| 17  | 営業時間設定 weekly rows incl. 祝日                                         | L266-275, L862-880        | Y-02 FR-002「営業時間（曜日別デフォルト設定）」                                                             | FR-025                   |
| 18  | スタッフ常駐時間帯 block                                                    | L882-920                  | Y-02 FR-005「スタッフ常駐時間: B-01 FR-M005 で参照」                                                        | FR-026                   |
| 19  | 特別営業日 block + 日付追加 / edit / delete                                 | HEAD L1314-1369           | Y-02 FR-005「特別営業日」                                                                                   | FR-027, FR-028           |
| 20  | 臨時休業日 block + 日付追加 / edit / delete                                 | L964-1004                 | Y-02 FR-005「臨時休業日」                                                                                   | FR-027, FR-028           |
| 21  | 契約・料金 responsibility banner                                            | L1018-1023                | Y-02 制限事項「金額変更は店舗からはできない（#190）」                                                       | FR-030                   |
| 22  | 主契約プラン section + count badge + 紐づけ追加                             | L1026-1045                | Y-02 FR-003「店舗主契約利用設定」                                                                           | FR-031, FR-033           |
| 23  | 主契約 table columns                                                        | L1049-1056                | Y-02 FR-003                                                                                                 | FR-031                   |
| 24  | Plan unlink `AlertDialog` (Link2Off)                                        | L1064-1085                | Y-02 UI設計方針「紐づけ解除（Link2Off）UI」                                                                 | FR-037                   |
| 25  | Plan unlink disabled + tooltip for non-HQ                                   | L1088-1102                | Y-02 権限マトリクス「販売設定（主契約 ON/OFF）: HQ/Sys」                                                    | FR-038, FR-090           |
| 26  | オプション section + table (no 親オプション)                                | HEAD L1740-1810           | Y-02 FR-003「店舗オプション利用設定」                                                                       | FR-032, FR-037           |
| 27  | キャンペーン section + table                                                | L1189-1290                | G-03「店舗利用キャンペーンの選択」                                                                          | FR-040–FR-042            |
| 28  | 公開対象外 marker + tooltip                                                 | L1233-1247                | G-03 公開店舗設定                                                                                           | FR-041                   |
| 29  | 1DayPass価格設定 section + `MonthPicker` + read-only table                  | L1294-1357                | Y-02 FR-003「1DayPass 価格設定」                                                                            | FR-050–FR-052            |
| 30  | Plan link `Sheet` (search / multi-select / 出所 badge)                      | L1367-1428                | Y-02 UI設計方針「本部/店舗作成バッジ」                                                                      | FR-033–FR-036            |
| 31  | Option link `Sheet`                                                         | L1430-1489                | Same                                                                                                        | FR-033–FR-036            |
| 32  | Campaign link `Sheet` + block reasons                                       | L1491-1578                | G-03 ブランド一致 / 公開対象 / 募集期間                                                                     | FR-043, FR-044           |
| 33  | Campaign link/unlink toasts                                                 | L546-562, L565-568        | G-03                                                                                                        | FR-045, FR-046           |
| 34  | 1DayPass `Sheet` — constraint band, calendar, legend                        | L1592-1687                | Y-02 FR-003「Phase 1は価格の幅（¥700〜¥1,800）を固定」                                                      | FR-053, FR-054, FR-063   |
| 35  | 1DayPass inline panel (overwrite badge, price, note, clear)                 | L1689-1761                | Y-02 FR-003                                                                                                 | FR-055–FR-059            |
| 36  | 1DayPass range validation                                                   | L372-374, L1734-1738      | Y-02 FR-003 価格レンジ                                                                                      | FR-057                   |
| 37  | 1DayPass clear `AlertDialog`                                                | L1765-1786                | Y-02 FR-003                                                                                                 | FR-060                   |
| 38  | 1DayPass role gate (`canEditDayPass`)                                       | L372, L1651-1657          | Y-02 権限マトリクス「1DayPass 価格設定: HQ/Staff」                                                          | FR-062, FR-090           |
| 39  | 相互利用設定 card + 編集 gate                                               | L1808-1830                | Y-02 FR-004 + 権限マトリクス「相互利用設定: HQ/Sys」                                                        | FR-070, FR-074           |
| 40  | 1日単位の後払い設定 row                                                     | L1832-1843                | Y-02 FR-004「1日単位の後払い設定（#255, #376）」                                                            | FR-070                   |
| 41  | 相互利用受入可能期間 / 18歳未満入館可能時間                                 | L1845-1866                | Y-02 FR-004 運用パラメータ                                                                                  | FR-071                   |
| 42  | 相互利用グループ（許可店舗） table                                          | L1868-1893                | Y-02 FR-004 + 「ブランドをまたいだ相互利用は不可（#24）」                                                   | FR-072                   |
| 43  | どこでもJOY YOGA利用料金 card                                               | L1898-1914                | Y-02 FR-004「YOGA利用料金設定（¥3,000/日・利用店舗に計上）」                                                | FR-073                   |
| 44  | 変更履歴 tab table                                                          | L1938-1965                | Y-02 FR-008「変更日時・変更者・変更前後の差分」                                                             | FR-080–FR-082            |
| 45  | StatusCard 閉店予定日 + ステータス変更 action                               | HEAD L1093-1127           | Y-02 FR-007 + 開発回答 2026/08/24 §4-1                                                                      | FR-015, FR-015a          |
| 46  | `StoreStatusChangeDialog` + transitions                                     | HEAD L133-232, L2724-2732 | 開発回答 2026/08/24 §4-1                                                                                    | FR-015b–FR-015d          |
| 47  | 営業時間 / スタッフ常駐時間帯 Sheet incl. 祝日の扱い select                 | HEAD L1433-1569           | Y-02 FR-005 v6「上書き設定をしていない祝日は曜日設定に従う」                                                | FR-029, FR-029a, FR-029f |
| 48  | 特別営業日 / 臨時休業日 dialog + cross-kind conflict                        | HEAD L603-610, L1572-1615 | Y-02 v6「個別日設定の重複制約」                                                                             | FR-029b, FR-029c         |
| 49  | 個別日設定 delete AlertDialog                                               | HEAD L1618-1633           | Y-02 FR-005                                                                                                 | FR-029e                  |
| 50  | Plan 区分 column (全社共通 / 当店限定)                                      | HEAD L1677, L1688-1694    | 販売設定 開発回答                                                                                           | FR-031, FR-031a          |
| 51  | 相互利用設定 card brand split + edit Sheet                                  | HEAD L2422-2617           | Y-02 FR-004 (JOYFIT どこでもJOY / FIT365 相互利用オプション)                                                | FR-070–FR-075            |
| 52  | 店舗マップ card (counts / action / map / empty)                             | HEAD L2621-2684           | Y-02 FR-006 / Y-02-05 + 権限マトリクス「店舗マップ設定」                                                    | FR-110–FR-114            |

---

## Appendix A — Backend API Design Reference (basis for the project mock)

Verified against the dev Swagger (`/docs-json`) on **2026-08-28**. The project mock mirrors these shapes so the later swap to the real client is mechanical.

### A.1 The store record — `GET /api/v1/admin/stores/{id}` (API-083 §4)

`StoreDetailDto` (39 fields) carries everything the 基本情報 tab needs except two: `id`, `code` (`S-###`, immutable), `clubCode`, `brandEnum`, `brandGroup`, `name`, `nameKana`, `status`, `prefecture`, `postalCode`, `area`, `address`, `phone`, `fax`, `email`, `latitude`, `longitude`, `accountCode`, `genderRestriction`, `receiptDate`, `preopenDate`, `grandOpenDate`, `closedAt`, the reception/feature flags, `fcCompanyId`, `minorEntryAllowedStart`, `minorEntryAllowedEnd`, `companionWindowMinutes`, `memo`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.

Two conversions the screen must perform: `prefecture` is a **JIS X 0401 numeric code** (`13` = 東京都) and `area` is a numeric code `1`–`8`, so both must be mapped to labels rather than printed (tracked in `get-stores-id/_tracking.md`, 2026-08-27).

### A.2 Store content and images — `GET/PUT /stores/{id}/details`, `GET/PUT /stores/{id}/images`

> **2026-10-02 (BE answer)**: photos are written only through the full-set `PUT /stores/{id}/images` (API-083 §19.2: items `{ s3Key, caption }` in display order, ≤20, one transaction + one `stores_history` row; System / HQ / Staff own store, Manager `E-AUTH-103`). The per-photo `POST` / `PATCH` / `DELETE /images/{imageId}` are **deprecated** and must not be used. This screen only reads `GET /images`; the write lives in the store form (FR-059a).

The client confirmed in QA #204 (2026-08-24) that these are **separate endpoints**, not folded into the store record. `/details` holds the CMS content row (including the floor-map key); `/images` holds the photo gallery (`id`, `url`, `s3Key`, `caption`, `sortOrder`). The detail screen reads both.

### A.3 Operating calendar — `GET/PUT /stores/{id}/business-hours`, `GET/POST/PATCH/DELETE /stores/{id}/business-exceptions`

`StoreBusinessHourDto`: `dayOfWeek` (`monday`…`sunday`, `holiday`), `openTime`, `closeTime` (overnight expressed as 26:00), `isClosed` — at most 8 rows, replaced as a whole set.
`StoreBusinessExceptionDto`: `id`, `date` (immutable — delete and re-add to move), `exceptionType` (`short_hours` | `closed`), `openTime`, `closeTime`; the list accepts `fromDate`, `toDate`, `exceptionType` and paging.

### A.4 Sales settings — API-084

| Endpoint                                                             | Shape                                                                                                                                                                                                                  |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /stores/{id}/plans`                                             | Brand-filtered plan master **with a per-store `enabled` flag** (`planId`, `name`, `nameForMember`, `brandEnum`, `contractType`, `priceMonthly`, `enabled`, `linkedAt`), enabled first, paginated, `enabledOnly` filter |
| `PUT /stores/{id}/plans`                                             | **Full-set replace** — the complete desired `planIds` (0–200); no per-row delete exists                                                                                                                                |
| `GET /stores/{id}/options`                                           | Option master with the same `enabled` / `linkedAt` treatment; **not** brand-filtered                                                                                                                                   |
| `PUT /stores/{id}/options`                                           | Full-set replace of `optionIds`                                                                                                                                                                                        |
| `GET /stores/{id}/one-day-pass-price`                                | `{ default: { price } \| null, exceptions: [{ date, price, note }] }`                                                                                                                                                  |
| `PUT /stores/{id}/one-day-pass-price`                                | Sets the store default; ¥700–¥1,800 (422 E-STR-009)                                                                                                                                                                    |
| `PUT/DELETE /stores/{id}/one-day-pass-exceptions/{date}`             | Upsert / delete one per-date price; same range rule; idempotent delete                                                                                                                                                 |
| `GET/PUT /stores/{id}/mutual-use`                                    | `settings` (`isAcceptEnabled`, `acceptPeriodStart`, `acceptPeriodEnd`) + `allowedStores` (`storeId`, `code`, `name`, `brandEnum`)                                                                                      |
| `PUT/DELETE /stores/{id}/mutual-use-allowed-stores/{partnerStoreId}` | Add / remove a partner; same brand group required (422 E-STR-012), not closed (409 E-STR-013), not self (422 E-STR-014)                                                                                                |

### A.5 Campaigns — API-088 §10-12

`GET /stores/{id}/campaigns` returns `StoreCampaignDto` (`campaignId`, `brandEnum`, `name`, `planId`, `planName`, `isAccepting`, `linkedAt`), paginated. `POST` / `DELETE /stores/{id}/campaigns/{campaignId}` link and unlink one campaign at a time; the link requires a brand match (E-CMP-010) and rejects duplicates (E-CMP-008).

### A.6 Change history — `GET /stores/{id}/change-history` (API-083 §10)

`StoreHistoryEntryDto`: `id`, `changedBy` (staff id), `changedAt`, `changeAction` (one of 16 values — `create`, `update`, `business_hours_update`, `business_exception_create`, `fc_company_assign`, …), `snapshot` (an object whose shape varies by action); paginated, newest first, filterable by `changeAction` / `fromDate` / `toDate`. Roles: **system / headquarter / manager — staff receives E-AUTH-103.** Seed only for this feature (FR-081).

### A.7 Gaps filled by the mock

| Gap                                                                                                                        | Mock addition                                                                                                                                                                                                                                                                                                                                                                                                                       | Backend status                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fcCompanyName` missing from `StoreDetailDto` (only `fcCompanyId`)                                                         | Mock returns the operating company's name, with 直営 when unset                                                                                                                                                                                                                                                                                                                                                                     | Client answered QA #204 on 2026-08-24 (「add `fcCompanyName`, drop `isFc`」); BE has done only the second half as of 2026-08-27                                                    |
| No organisational hierarchy (`territoryId` / territory & area names) anywhere                                              | Mock carries the territory on the store and resolves its full path, as on the list screen                                                                                                                                                                                                                                                                                                                                           | Raised to BE 2026-08-19; `territory` still appears 0 times in the dev Swagger as of 2026-08-28. Not asked to the client                                                            |
| No staff-resident window on `StoreBusinessHourDto`                                                                         | Mock carries a staffed start/end per day row                                                                                                                                                                                                                                                                                                                                                                                        | Client agreed in QA #206 to add `staffStartTime` / `staffEndTime` to `PUT business-hours`; **BE has not shipped it**                                                               |
| Business exceptions carry no reason text, and `date` is immutable                                                          | Mock carries a reason on each exception (the screen shows 設備点検) and allows moving a date                                                                                                                                                                                                                                                                                                                                        | Client agreed in QA #207; **BE has not shipped it**                                                                                                                                |
| ~~Option master has no parent option~~ — withdrawn 2026-10-02 (prototype dropped 親オプション, D18)                        | ~~Mock carries the parent option name (the 親オプション column)~~                                                                                                                                                                                                                                                                                                                                                                   | Raised in QA #212                                                                                                                                                                  |
| Plan rows have no origin (全社共通 / 当店限定 — options no longer carry one, D18)                                          | Mock carries the origin flag driving the plan 区分 badge and the plan panel badge                                                                                                                                                                                                                                                                                                                                                   | Y-02 UI設計方針 defines the badge; no backend field                                                                                                                                |
| Campaign link rows have no discount summary, recruitment period, three-state acceptance, or publication-to-this-store flag | Mock carries all four so the table and the block reasons can render                                                                                                                                                                                                                                                                                                                                                                 | `StoreCampaignDto` has only `isAccepting`; not yet raised                                                                                                                          |
| No mutual-use deferred-payment flag and no cross-store yoga fee (now **editable**, JOYFIT only)                            | Mock carries both and accepts the fee on save (Y-02 FR-004 names ¥3,000/day and the 1-day deferred payment); see Q12                                                                                                                                                                                                                                                                                                                | Not yet raised                                                                                                                                                                     |
| Mutual-use partner rows have no setting date                                                                               | Mock carries the 設定日 the table renders                                                                                                                                                                                                                                                                                                                                                                                           | Not yet raised                                                                                                                                                                     |
| History rows are an action code plus a free-shape snapshot with no prior value                                             | Mock seeds resolved field-level rows (item / before / after), per the 2026-08-28 clarification                                                                                                                                                                                                                                                                                                                                      | Y-02 FR-008 requires the diff; `StoreHistoryEntryDto` cannot express it. To be raised to the backend                                                                               |
| 祝日 row has no "follow the weekday" (曜日どおり) state                                                                    | Mock stores 祝日の扱い (曜日どおり / 営業 / 休業) on the holiday row                                                                                                                                                                                                                                                                                                                                                                | Same gap as store-form Q4 — Q15                                                                                                                                                    |
| Status change has no dedicated endpoint identified; sub-brand and 受付開始日 / プレオープン日 display                      | Mock persists status via the store record; mock carries sub-brand                                                                                                                                                                                                                                                                                                                                                                   | Q7, Q13                                                                                                                                                                            |
| No store-map (floor image + locker coordinates) API                                                                        | Mock serves the saved map shared with store-map-setup                                                                                                                                                                                                                                                                                                                                                                               | Q8                                                                                                                                                                                 |
| Nothing sets the store's default 1DayPass price                                                                            | Mock exposes the store default read-only, falling back to the 1Day利用 master price when unset                                                                                                                                                                                                                                                                                                                                      | Backend has `PUT /stores/{id}/one-day-pass-price`; no prototype screen calls it. QA #214 covered this and was **withdrawn 2026-08-28** — not tracked as a client question any more |
| Per-row plan/option unlink                                                                                                 | Mock keeps per-row endpoints (`POST …/main-contracts` taking an id array, `DELETE …/{contractId}`, and the option pair likewise) — corrected 2026-09-04. What matches the backend is the **screen**: FR-031/FR-032 render the store's complete attached set and FR-039 assembles every save from it, so swapping the two mock endpoints for the backend's full-set `PUT` is mechanical and no link can be dropped by a partial page | Decided 2026-08-27 (QA #82 / #213 closed without a matching client answer). The `PUT` swap is FR-039's follow-up, as the endpoint table above records                              |

---

## Q&A / Clarification Needed

> Q1–Q3 were resolved by `/speckit.clarify` on 2026-08-28 — the decision is stated first, with the original conflict kept beneath it for the record. Q4–Q6 are informational and do not block. Q7–Q15 were raised by the 2026-10-02 prototype sync; none blocks the mock-first build. No `[NEED CLARIFICATION]` marker remains in this spec.

### Q1 — Does Phase 1 deliver working editing on 営業設定 and 入退館設定? ✅ **RESOLVED 2026-08-28 — yes, in full**

**Decision**: all five write flows the backend supports are in scope — weekly hours, the staff-resident window, exception days, temporary closures, and a mutual-use edit mode (FR-029–FR-029d, FR-074–FR-076). This keeps what the project already ships rather than tearing it out; the staff-resident window has no prototype input, so a QA goes to the prototype owner while the flow is still built. The conflict record follows.

**Where**: FR-028, FR-074; `store-detail.tsx` L850-860 (営業時間設定 編集), L886-896 (スタッフ常駐時間帯 編集), L926-936 & L968-978 (日付追加), L941-960 & L983-1002 (row edit / delete), L1813-1822 (相互利用設定 編集).

**The ambiguity**: every one of these controls is rendered as a role-gated button **with no handler attached** — the prototype stops at the affordance. Two of them have no destination anywhere in the prototype at all: there is no form for the staff-resident window (recorded in the API-083 cluster tracking, 2026-08-19: `store-form.tsx` L384-415 has only open/close and a closed-day tick), and no dialog for adding an exception or closure date. The backend, by contrast, has complete write endpoints for all of it (`PUT business-hours`, `POST/PATCH/DELETE business-exceptions`, `PUT mutual-use`).

**Why it needed a decision**: it is the difference between a read-only tab and four editing flows plus a mutual-use edit mode — a large scope difference, and the mock endpoints required differ accordingly. **Outcome**: editing, in full. Two follow-ups fall out of it — a QA to the prototype owner for the staff-resident-window form and for the exception/closure date dialogs, and the backend items in Appendix A.7 (`staffStartTime` / `staffEndTime` from QA #206, the exception reason field from QA #207) which the mock covers meanwhile.

### Q2 — How is the 変更履歴 diff derived, and may Staff open the tab? ✅ **RESOLVED 2026-08-28 — seeded diff, Staff excluded**

**Decision**: history rows are seeded as a resolved field-level diff (item / before / after), so the screen interprets no snapshot (FR-082); the tab is available to System, Headquarter and Manager only, following the backend's role rule (FR-083). The inability of `StoreHistoryEntryDto` to express the diff Y-02 FR-008 requires is recorded in Appendix A.7 for the backend. The conflict record follows.

**Where**: FR-080, FR-082; `store-detail.tsx` L239-274 (the seed rows), L1938-1965 (the table).

**The mismatch**:

| Source              | Statement                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Y-02 FR-008         | 「変更日時・変更者・変更前後の差分を記録」 — a field-level before/after diff                                                                           |
| UI prototype        | Renders exactly that: 変更日時 / 変更者 / 変更項目 / 変更前 / 変更後, with a code comment that recording is BE-dependent so the UI ships on dummy data |
| Backend API-083 §10 | Returns `changeAction` (one of 16 action codes) plus a free-shape `snapshot` object — **no field-level diff, no prior value**                          |
| Backend roles       | `system / headquarter / manager`; **staff receives E-AUTH-103** — but the prototype shows the tab to everyone                                          |

**Outcome**: (a) seed resolved item/before/after rows — the screen resolves nothing; (b) follow the backend's role rule, so the tab is unavailable to Staff, Trainer and Observer even though the prototype shows it to everyone. The gap between Y-02 FR-008's required diff and `StoreHistoryEntryDto` is now a backend item, not an open question.

### Q3 — What is the 1DayPass 基準価格? ✅ **RESOLVED 2026-08-28 — the store's own default, read-only**

**Decision**: the base price is the store's default 1DayPass price, falling back to the 1Day利用 plan master when the store has no default (FR-050a). It is displayed in the constraint band and nowhere entered — the prototype governs the UI, the backend contract governs the data source. **QA #214 asked exactly this question and was withdrawn on 2026-08-28**, so there is no client answer and none is being awaited; the follow-up (nothing sets the store default in Phase 1) is recorded in Appendix A.7. The conflict record follows.

**Where**: FR-050, FR-052, FR-053; `store-detail.tsx` L184 (`DAYPASS_BASE_PRICE = "1,650円"`, commented as coming from the 1Day利用 master plan MC007), L1604-1606 (the constraint band).

**The mismatch**: the prototype derives the base price from a **plan master entry** (MC007 1Day利用, ¥1,650), while the backend models it as a **per-store default price** (`GET/PUT /stores/{id}/one-day-pass-price` → `default.price`, itself constrained to ¥700–¥1,800 and settable by store staff). Y-02 FR-003 says only that the store sets per-date prices and that the range is a Phase 1 constant; it does not name the base.

**Why it mattered**: if the base is the store's own default, this screen has no control for it; if it is the plan master's price, the backend's store default goes unused and every store shares one base. Note also that the prototype's ¥1,650 sits above the ¥1,800 ceiling of the permitted range while the master price is tax-included and the backend's is tax-excluded. **Outcome**: read the store default (falling back to the master), display only. The tax basis and the missing default-setting screen are carried as follow-ups, and the label 本部設定レンジ on the constraint band is itself a known prototype wording issue (Phase 1 range is a system constant, so 設定可能範囲 would be correct — recorded 2026-08-21 in the API-084 tracking).

### Q4 — Campaign section fields the backend does not carry _(informational — mock first)_

`StoreCampaignDto` exposes `campaignId` / `brandEnum` / `name` / `planId` / `planName` / `isAccepting` / `linkedAt`. The section needs four more: 割引概要, 募集期間 (start and end), a three-state acceptance (受付中 / 受付停止 / 上限到達 — the backend has a boolean), and whether the campaign is published to this store (the 公開対象外 marker and one of the three block reasons). The mock supplies all four (A.7). Recorded for a QA to the backend; not a blocker under the standing "backend gap → mock first" rule.

### Q5 — Mutual-use fields the backend does not carry _(informational — mock first)_

Y-02 FR-004 names the 1-day deferred-payment setting (#255, #376) and the ¥3,000/day cross-store yoga fee (#24), and the prototype renders both plus a 設定日 per partner store. `MutualUseSettingsDto` has only `isAcceptEnabled` and the acceptance period; `MutualUsePartnerStoreDto` has no setting date. Mocked; recorded for the backend.

### Q6 — Plan / option link persistence _(resolved 2026-08-27 — recorded for visibility)_

Related, resolved 2026-08-28: the attach panels search **server-side over the master**, while the section tables carry the store's complete attached set — the same set the save payload is built from, so the full-set rule below costs no extra read.

The screen detaches one row at a time and attaches several at once; the backend has only a full-set `PUT`. QA #82 and #213 both closed without a client answer that matches the backend, and the decision on 2026-08-27 was to **follow the Swagger**: read the complete enabled set across every page, then submit the whole desired set on each change (FR-039). The risk this guards against is concrete — saving from a single loaded page would silently drop every link on the pages that were never read.

### Q7 — Which endpoint persists ステータス変更? ✅ **CLOSED 2026-10-07 — follow the BE contract**

Resolution (user, 2026-10-07): `PATCH /admin/stores/{id}` with `status` (BR-STR-026, refusal 422 `E-STR-006`); no dedicated endpoint (research R2). The original question is kept below.

FR-015a–FR-015d follow prototype `a7d0c88` (開発回答 2026/08/24 §4-1: status change is a separate HQ/System action). API-083 exposes `status` on `StoreDetailDto` but no dedicated transition endpoint was identified, nor whether the backend enforces the transition rules of FR-015c (no return to `preparing`, `closed` only via `closedAt`). Mock first: the mock applies FR-015c and returns 422 on an illegal transition.

### Q8 — Is there a store-map API (floor image + locker coordinates)? ✅ **ANSWERED 2026-10-02 — positions on real API; image UI unwired until BE adds a URL (store-map-setup Q1)**

FR-110–FR-114 read the saved map that store-map-setup writes. **Partly answered 2026-10-02** (store-map-setup spec, Appendix A): locker positions exist on the real API — `GET /api/v1/admin/lockers?storeId=` returns relative `mapX` / `mapY` (null = unplaced) — and the floor image is `gymMapS3Key` on `GET /api/v1/admin/stores/{id}/details`. Still open: the key has no resolved, fetchable URL (integration backlog B4 / R204). Resolved there 2026-10-02 (store-map-setup Q1): build the UI now, wire the image when the backend adds the URL, no mock API. This tab follows the same rule — locker counts/positions from the real API, the floor image unwired until B4 / R204.

### Q9 — May Staff edit the store map of any store, or only their own? ⚠️ **OPEN (client) — raised 2026-10-02**

The Y-02 matrix reads 「店舗マップ設定: Staff ○ 所属店舗」 and the spec follows that matrix, limiting Staff to their own store (FR-114). The prototype's `STORE_MAP_EDITABLE_ROLES` enables Staff on any store. Confirm with the prototype owner so V0 can be synced; the spec follows the matrix meanwhile.

### Q10 — Is 特別営業日 the backend's `short_hours` exception? ✅ **CLOSED 2026-10-07 — follow the BE contract**

Resolution (user, 2026-10-07): the API offers only `short_hours | closed`, so 特別営業日 is `short_hours` — also for a day opened on a regular closed day or holiday — and carries no reason (research R4). The original question is kept below.

Prototype `3a6c29b` renamed 例外営業時間設定 to 特別営業日 — an **open** day with special hours (incl. a holiday or a regular closed day), not a shortened day. `StoreBusinessExceptionDto.exceptionType` is `short_hours` | `closed`. Does `short_hours` also cover "open on a normally closed day" for the v6 precedence, and does a 特別営業日 carry a reason (QA #207 added one for exceptions; the prototype has none for 特別営業日)? Mock maps 特別営業日 → `short_hours`, 臨時休業日 → `closed`.

### Q11 — Does the backend enforce one 個別日設定 per date across both kinds? ✅ **CLOSED 2026-10-07 — follow the BE contract**

Resolution (user, 2026-10-07): the backend refuses a second exception on the same date across both kinds with 409 `E-STR-004`, and PATCH may move the date (research R4). The original question is kept below.

Y-02 v6 「個別日設定の重複制約」 makes a 臨時休業日 and a 特別営業日 on the same date a conflict (FR-029b/c). Which error code does `POST/PATCH /stores/{id}/business-exceptions` return, and does it cover the cross-kind case? Also: `date` is immutable on the backend while the prototype's edit dialog changes it (QA #207 agreed to allow it; not shipped). Mock rejects with 409 and allows moving a date.

### Q12 — Where are the YOGA fee and the brand-split mutual-use fields stored? ✅ **CLOSED 2026-10-07 — follow the BE contract**

Resolution (user, 2026-10-07): `MutualUseSettingsDto.payLaterEnabled` / `yogaUsageFee` (JOYFIT group only, unused for FIT365) and a single `isAcceptEnabled` for both brand groups (research R6). The original question is kept below.

FR-075 makes YOGA利用料金（1日・税別） editable (user decision: mock first). `MutualUseSettingsDto` has neither the fee nor the deferred-payment flag (Q5), and nothing distinguishes the FIT365 相互利用オプション（¥500） acceptance from どこでもJOY — is ¥500 a constant, and is the fee tax-inclusive with a range?

### Q13 — Which fields carry サブブランド, the plan 区分, 受付開始日 and プレオープン日? ✅ **CLOSED 2026-10-07 — follow the BE contract**

Resolution (user, 2026-10-07): サブブランド = `brandEnum`; plan 区分 = `StorePlanDto.storeId` (null = 全社共通); 受付開始日 / プレオープン日 / 開店日 = `receiptDate` / `preopenDate` / `grandOpenDate`. The original question is kept below.

FR-012a/b, FR-031a. `StoreDetailDto` has `receiptDate` / `preopenDate` / `grandOpenDate` (assumed 受付開始日 / プレオープン日 / 開店日) but no sub-brand; `GET /stores/{id}/plans` has no origin (全社共通 / 当店限定). Mock carries both.

### Q14 — The prototype map still lists a 機能制限 state for the store detail ⚠️ **OPEN (client) — raised 2026-10-02**

`src/pages/map/screens.ts` L1325 keeps `store-detail-feature` (機能制限) although the tab was removed after QA #45. Assumed a stale navigation entry; confirm with the prototype owner. No impact on this spec.

### Q15 — How is the 祝日 row's 曜日どおり stored? ✅ **CLOSED 2026-10-07 — follow the BE contract**

Resolution (user, 2026-10-07): an omitted `holiday` row is 曜日どおり (research R3). The original question is kept below.

Same issue as `specs/026-store-management/store-form/spec.md` Q&A Q4: `StoreBusinessHourDto` holds the 祝日 row with `isClosed` only, so 営業 / 休業 are expressible but "no override" is not. Same default as there: the mock stores the mode (曜日どおり / 営業 / 休業) until BE decides; this screen reads it for FR-024a / FR-025 / FR-029f.
