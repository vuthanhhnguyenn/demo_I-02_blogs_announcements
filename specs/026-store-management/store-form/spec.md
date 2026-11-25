# Feature Specification: Store Master Registration & Edit Form (Y-02 FR-002)

**Feature Branch**: `026-store-list` (written into the currently open branch by request — no new branch; feature folder numbered `028-store-form`)
**Created**: 2026-09-03
**Status**: Draft
**Updated**: 2026-11-13 — 受付設定 card (入会受付・引き継ぎ受付, Y-02 261112_v11; see Clarifications → Session 2026-11-13). 2026-10-02 — synced to prototype `47423ec` and Y-02 260928_v6 (see Clarifications → Session 2026-10-02). 2026-09-04 — QA #205's three answers recovered from the client's original reply (Session 2026-09-04)
**PO Spec**: `Y-02` — 店舗管理（マスタ）
**Source**:

| Role          | Reference                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requirement   | `dx-fitness/fitness-spec` → `crm/requirements/Y-02.md` @ `4655aea` (doc version **260928_v6**, 2026-09-28 — adds FR-005's business/closed-day precedence; drafted against 260803_v5) — mirrored in `dx-fitness/fitness-crm-ui` → `public/requirements/Y-02.md` — same document as `dx-fitness/fitness-spec` → `crm/requirements/Y-02.md`                                                   |
| UI prototype  | `dx-fitness/fitness-crm-ui` → `src/pages/store-form.tsx` @ `47423ec` (2026-09-30), 609 lines — last touched `3a6c29b` (9/30). Drafted @ `b223fef` (2026-08-13, 484 lines); deltas `6bc1f1c` (9/8), `a7d0c88` (9/16), `1767864` (9/17), `3a6c29b` (9/30) in Session 2026-10-02.                                                                                                             |
| Supporting UI | `src/components/territory-combobox.tsx` (TerritoryCascadeSelect + TerritoryBreadcrumb since `1767864`; was TerritoryCombobox), `src/components/field-marker.tsx`, `src/hooks/use-unsaved-changes.ts`, `src/data/org-hierarchy.ts`, `src/pages/map/screens.ts` L1307-1318                                                                                                                   |
| API design    | Backend dev Swagger `API-083 Admin - Store Master` — `POST /api/v1/admin/stores` (§5), `GET /api/v1/admin/stores/{id}` (§4), `PATCH /api/v1/admin/stores/{id}` (§6), `GET/PUT /api/v1/admin/stores/{id}/business-hours` (§7-8). Verified against `/docs-json` on 2026-09-03 (548 paths).                                                                                                   |
| Prior QA      | `api-review-output/admin-store-master-api-083/post-stores/` (#202, answered 2026-08-24) · `patch-stores-id/` (#205, **all three answered 2026-08-24** — recovered 2026-09-04 from the client's original reply §1-④; the Notion `Quick Answer` held only a fragment about `status`) · `put-stores-id-business-hours/` (#206, answered 2026-08-24) · `_cluster-level/` (#45, #208 withdrawn) |
| Sibling specs | `specs/026-store-list/spec.md` (the list this form is opened from and returns to) · `specs/027-store-detail/spec.md` (the read surface of the same record)                                                                                                                                                                                                                                 |

**Input**: User description: "Create spec for screen store form — Phase 1 only; history is seed-only (no create/update/delete of history); use the backend API design to build the mock API inside this project; strict grounding on the UI code and the requirement spec; mark mismatches with [NEED CLARIFICATION] and consolidate them into a Q&A section for `/speckit.clarify`. No branch switch — write into the currently open branch."

---

## Overview

The store form is the **write** surface of the store master: the one screen where a store's own attributes are created and changed. It is a single-route screen with two modes — 店舗新規登録 (create) and 店舗編集 (edit) — rendering the same two-card body: 基本情報 (identity, brand, organisation, address, dates, weekly default business hours, gender restriction) and 備考 (an internal memo).

It covers Y-02 **FR-002 店舗基本情報の登録・編集** in full, plus the parts of neighbouring requirements that FR-002's field list pulls in: the closure date of **FR-007** (as a form field — the batch that flips the status is not this feature), the weekly default business hours of **FR-005** (the 曜日別デフォルト設定 half only), and the 権限マトリクス split between head-office-editable and Staff-editable fields.

Everything else about a store — the operating calendar's exception days, sales settings, mutual-use, 1DayPass pricing, change history — is read and written on the detail screen (027), not here. This screen writes the store row and its weekly default hours, and nothing else.

Three states matter as much as the happy path: the **role lock** (Manager / Trainer / Observer get a permission wall instead of the form), the **restricted-Staff mode** (a Staff editing their own store sees the whole form but can only touch four field groups; the rest are disabled with a stated reason), and the **unsaved-changes guard** (leaving with a dirty form asks before discarding).

---

## Clarifications

### Session 2026-09-03 — decisions fixed before drafting

These are not open questions. They are recorded so the reasoning is visible at planning time.

- Q: Does this feature write change-history rows? → A: **No — seed only.** Stated directly by the user. The backend writes a `create` / `update` history row inside the same transaction as the store write (API-083 §5, §6 descriptions) and exposes only `GET /stores/{id}/change-history`; the project mock therefore treats history as pre-seeded data owned by 027 and this feature neither creates, updates nor deletes a row.
- Q: Which store-status vocabulary applies? → A: **営業中 / 閉店 — the two the prototype renders**, carried over unchanged from 026 Q1 and 027. This form has **no status field at all**: the prototype removed it on 2026/04/29 (`store-form.tsx` L429-430) because Y-02 FR-007 derives the status from the closure date. The client confirmed the same on 2026-08-24 (QA #202 line 5, QA #205): the create form must not send a status, and manual transitions other than 閉店 need their own UI, not this form.
- Q: Which store does the edit mode load? → A: **The store in the URL, always** — same rule as 027. The header's global store selector does not redirect this screen.
- Q: Do the weekly default business hours belong to this form or to the calendar? → A: **To this form, as the prototype has them** (`store-form.tsx` L384-417). Y-02 states the 曜日別デフォルト設定 twice — in FR-002's field list (L127) and in FR-005's 通常営業日 (L154) — and the prototype's own comment (L122) flags the ownership question as open with development. The resolution taken here: this form owns the **weekly default set** (7 weekdays + 祝日, each with open/close time and a 定休日 flag); the detail screen (027) owns the **calendar exceptions** (例外営業時間, 臨時休業日) and the staff-resident window. Both write the same weekly set through the same replace operation, so the two screens cannot drift.
- Q: Is `territoryId` available from the backend? → A: **No — the mock supplies it.** The string `territory` still appears 0 times in `/docs-json` (verified 2026-09-03), and no Y-15 organisation-hierarchy endpoints exist. Y-02 FR-002 marks テリトリー required, so the project mock carries `territory_id` on the store row (already in `src/app/api/_schemas/store.schema.ts`) and serves the area→territory tree from `GET /api/crm/org/areas` (already built for 026). Per the standing instruction of 2026-08-19 this is a BE task, not a client question.
- Q: Sub-brand — optional (prototype) or required for JOYFIT (contract)? → A: **Required when the brand is JOYFIT.** The client answered exactly this on 2026-08-24 (QA #202 line 4): `brandEnum` has no bare `JOYFIT` value, so a JOYFIT store must resolve to one of `Joyfit` / `Joyfit24` / `JoyfitYoga` / `JoyfitPlus`. The prototype's `validate()` (L169-182) does not enforce it; the contract governs the data, so the requirement below does enforce it.
- Q: How are the weekly hours persisted on create? → A: **In the create request itself, as one call.** The client signed this off on 2026-08-24 (QA #202 line 3: registration must cost one request, not a create followed by `PUT /stores/{id}/business-hours`). The dev backend has not added the field yet, so the project mock accepts the weekly set in the create payload. In edit mode the form uses the same store business-hours replace operation the detail screen uses.

### Session 2026-09-03 — resolved by `/speckit-clarify`

- Q: What happens to the store-page content and image controls the repo's current form holds and the prototype's form does not? → A: **Follow the prototype strictly — remove them.** The 店舗画像 card (store photos, floor map), the ソーシャル card (seven URL fields), 会計コード and メールアドレス are all dropped from this form, and the missing-input gap is logged for the prototype owner. Store-page content and images therefore have no write path in Phase 1. Recorded in FR-004, FR-010, FR-051, Out of Scope, and "Current Repository State".
- Q: Is the role gate enforced only in the UI, or also by the API layer? → A: **Both layers, including the per-field Staff subset.** The UI keeps its permission wall and disabled fields, and the API layer independently refuses a write from a role without the right **and** refuses a locked field submitted by a Staff caller, so a hand-crafted request cannot rewrite テリトリー or ブランド. Matches 027 and the backend's own `system / headquarter only` declaration on the store write endpoints. Recorded in FR-080–FR-082, FR-086, FR-088, FR-089, SC-009, Edge Cases, Appendix A.5.
- Q: Is 店舗コード editable after registration? → A: **Yes, for System / Headquarter — but the helper text stays the prototype's, verbatim.** Both Y-02's 前提条件 (「登録後の変更は影響範囲が大きいため注意」 — a warning, not a prohibition) and the contract (`UpdateStoreDto` accepts the club code, answering 409 on a duplicate) allow the change, so the field is editable. The helper copy is a UI string, and the prototype governs UI strings: 「業務用コード。他機能から参照されるため登録後の変更不可」 is rendered as-is (revised 2026-09-04), so this screen has no helper line of its own invention. Recorded in FR-012, FR-061, FR-061a, Edge Cases, Q&A Q1.
- Q: One 開店日 or three opening dates? → A: **Three, following the client's sign-off of 2026-08-24 (QA #202), ahead of the prototype.** 開店日 maps to the grand-open date, and two optional fields are added: the enrollment-reception start date and the pre-open date. The prototype has since added both (fitness-crm-ui `a7d0c88`, 2026-09-16, 「開発回答（2026/08/24）」), so their labels and helper text now follow the prototype (see Session 2026-09-24). Note that the client's stated meaning of `receiptDate` (「ngày bắt đầu nhận đăng ký」 — when enrollment reception starts) does **not** match the backend's own description of that field ("Handover/receipt date"); the client's meaning governs the label, and the BE description discrepancy is logged. Recorded in FR-010, FR-012, FR-019, FR-019a, FR-114, Key Entities, Assumptions, Appendix A.5, Q&A Q3.
- Q: Does the form send the weekly hours on every save, or only when they were changed? → A: **Only when changed.** In edit mode an untouched weekly table means the replace is not issued at all, so saving a phone-number change can never overwrite hours somebody changed on the detail screen (027) between page load and save. The contract offers only a full replace with no partial update, so this requires the weekly table to be held as tracked state and compared against its loaded values — which FR-044's validation needs anyway. Create is unaffected: it always carries the full set (FR-046). Recorded in FR-045a, FR-045b, FR-070a, SC-010, Edge Cases.

### Session 2026-09-04 — QA #205's answers recovered (three client decisions, none built yet)

QA #205 was read on 2026-08-27 through its Notion `Quick Answer` property alone, which carried one fragment about `status`, and this spec was drafted on 2026-09-03 believing all three of #205's questions were still unanswered. The client's **original reply of 2026-08-24 has a section §1-④「編集 API」 that answers all three** — recovered 2026-09-04 and recorded in `api-review-output/admin-store-master-api-083/patch-stores-id/qa-205/_qa.md`. Those answers govern from here on. The screen shipped on 2026-09-03 under the earlier reading, so each of the three is an **open implementation delta**, not a description of the built form (see "Open deltas after the 2026-09-04 correction").

- Q: Is 店舗コード editable after registration? → A: **Yes, for head office (System / Headquarter) — and the prototype's 「登録後の変更不可」 line is wrong.** The client asked for a **warning plus a confirmation dialog** in its place, because the blast radius is large; Staff cannot change the code at all (it sits outside their whitelist). This **supersedes** Q1's earlier resolution, which chose option B (render the prototype's copy verbatim): the client's answer is option C. Recorded in FR-012, FR-061a, FR-061b, Q&A Q1.
- Q: Is the contract's 「brandEnum editable only while preparing」 the intended rule? → A: **Yes.** The brand is the most-referenced key (member contracts, mutual use), so a change after opening is handled by **registering a new store**, and the screen MUST disable ブランド / サブブランド once the store has opened. Recorded in FR-015a — together with its blocked dependency: this screen renders the two-value status vocabulary of 026 Q1, which has no 準備中, so the rule cannot be applied meaningfully until the four-value vocabulary is adopted.
- Q: May Staff edit their own store's limited field set? → A: **Yes, changed in the client's v0.5 — but the store write takes exactly three fields, `name` / `address` / `phone`**, for their own store only, and a body carrying even one field outside that whitelist is refused **whole** with 403, never applied in part. No separate Staff endpoint is created. Business hours and closure days, store photos and the floor map, and the gate-stop window (`staffStartTime` / `staffEndTime`) stay Staff-writable through **their own** endpoints. Consequence for this form: 店舗名（カナ）leaves the Staff-editable set. Recorded in FR-083, FR-084, FR-086, FR-088.

### Session 2026-09-23 — テリトリー moved to Phase 2

- Q: Is the テリトリー picker Phase 1? → A: **No — Phase 2.** It depends on the Y-15 organisational hierarchy, and the client's Notion board **CRM Category** lists **Y-15 組織階層管理 under Phase 2**. `Y-15.md` still reads 「Phase帰属: Phase 1」 and Y-02 v5 (FR-001 / FR-002) does not mark the hierarchy fields as Phase 2 either; both are stale on this point, and the client's board takes precedence. In Phase 1:
  - the form has **no** テリトリー field;
  - FR-011's required marks are **three**: 店舗コード, 店舗名, ブランド;
  - FR-064 does not apply;
  - neither request body carries `territoryId`.

### Session 2026-09-24 — 受付開始日 / プレオープン日 are in the prototype

- Q: Where do 受付開始日 / プレオープン日's labels and helper text come from? → A: **The prototype.** Y-02.md (260803_v5) still lists only 開店日 / 閉店日, but fitness-crm-ui added both fields at `a7d0c88` (2026-09-16) citing 開発回答（2026/08/24）: order 受付開始日 → プレオープン日 → 開店日 → 閉店日, both optional, Staff-locked, helper 「入会受付を始める日」 / 「プレオープンの日」 (store-form.tsx L415-432), and both rows on the detail 基本情報 with 「—」 when unset (store-detail.tsx L1038-1054). The spec-proposed copy is replaced. Recorded in FR-010, FR-019a, Appendix A.5, Q3.

  The picker (FR-030–FR-034, FR-112) and the related scenarios and edge cases are tagged **[Phase 2 — Round 3]**. The field is commented out in `store-form.tsx` with `TODO(round3) B1`, and `territory_id` stays in the schema without its `.min(1)` so that Round 3 is an uncomment (integration-plan B1 / R301).

### Session 2026-10-02 — prototype sync (`b223fef` → `47423ec`) and Y-02 v6

The 2026-09-24 session picked up only the two date fields from `a7d0c88`. The rest of that commit, `6bc1f1c` before it, and `1767864` / `3a6c29b` after it are recorded here; every decision follows the prototype, which in each case cites 開発回答（2026/08/24）or Y-02 v6.

| #   | Prototype change                                                                                                                                                                                                                                                                                                                             | Commit                | Spec impact                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Every non-required field now carries the **任意** chip (`OptionalMark`: muted filled chip, text 任意) — 店舗名（カナ）, 運営企業, 都道府県, 郵便番号, 住所, 電話番号, FAX番号, the four dates, 営業時間, 性別制限, 備考; サブブランド carries 任意 unless the brand is JOYFIT (then required). Required and optional are mutually exclusive. | `6bc1f1c` (9/8)       | FR-011 and FR-050 rewritten — "no optional mark" is withdrawn.                                                                                                                                  |
| F2  | 運営企業（FC企業）gets an explicit first option **直営（運営企業なし）** so an FC store can be turned back into 直営; placeholder becomes 選択してください; helper becomes FC企業マスタから選択。直営の場合は「直営（運営企業なし）」を選択                                                                                                  | `6bc1f1c` (9/8)       | FR-012, FR-013, FR-017 rewritten. Choosing it stores "no operating company".                                                                                                                    |
| F3  | 店舗コード helper is now **V0 copy, mode-dependent** — create: 業務用コード。ロッカー・機器・商材など他機能から参照されるため、登録後の変更は影響範囲に注意; edit: 業務用コード。ロッカー・機器・商材など他機能から参照されているため、変更すると影響範囲が大きくなります                                                                    | `6bc1f1c` / `a7d0c88` | FR-012 — the spec-proposed line is replaced by V0's; the "QA to the prototype owner" is closed.                                                                                                 |
| F4  | When the edited code differs from the loaded one, a **warning Alert** renders directly under the input (triangle icon): 店舗コードはロッカー・機器・商材など他機能から参照されています。変更すると影響範囲が大きくなります。                                                                                                                 | `a7d0c88` (9/16)      | New FR-061c.                                                                                                                                                                                    |
| F5  | Code-change confirmation dialog now has V0 copy — title 店舗コードを {旧コード} から {新コード} に変更しますか？, body 店舗コードはロッカー・機器・商材など他機能から参照されています。変更すると影響範囲が大きくなります。, buttons キャンセル / 変更して保存する                                                                           | `a7d0c88` (9/16)      | FR-061b — spec-proposed copy replaced.                                                                                                                                                          |
| F6  | 店舗コード placeholder 例: JF24-SJK → **例: TK-001**                                                                                                                                                                                                                                                                                         | `a7d0c88` (9/16)      | FR-013.                                                                                                                                                                                         |
| F7  | **Brand lock while not 準備中** — in edit mode ブランド and サブブランド are disabled unless the store status is 準備中, tooltip 営業中の店舗ではブランドを変更できません（開業準備中のみ変更可）. Staff's own lock tooltip takes precedence when both apply.                                                                                | `a7d0c88` (9/16)      | FR-015a — **unblocked**: the four-value status vocabulary is adopted (026 Q1 re-resolved 2026-10-02), so the rule ships now.                                                                    |
| F8  | サブブランド: **not rendered at all when the brand is FIT365**; required mark + error サブブランドを選択してください when JOYFIT; helper JOYFITの場合に選択 (was JOYFITの場合のみ選択). With no brand chosen it renders disabled with 任意.                                                                                                  | `a7d0c88` (9/16)      | FR-012, FR-015, FR-065 rewritten; FR-010's two-column row holds ブランド alone for FIT365.                                                                                                      |
| F9  | Staff footer line: 名称・住所・電話番号・営業時間のみ… → **店舗名**・住所・電話番号・営業時間のみ編集できます。それ以外の項目は本部へ変更を依頼してください                                                                                                                                                                                  | `a7d0c88` (9/16)      | FR-085.                                                                                                                                                                                         |
| F10 | テリトリー picker: searchable combobox → **エリア → テリトリー two-tier Select** (`TerritoryCascadeSelect`, preset from the saved territory in edit mode); helper 店舗が所属する組織階層。エリアを選ぶとテリトリーの選択肢が絞り込まれ、ブロック・運営本部はテリトリーから自動的に確定します                                                 | `1767864` (9/17)      | **[Phase 2 — Round 3]** FR-012 (テリトリー helper), FR-030, FR-031, FR-035 rewritten. Nothing ships in Phase 1.                                                                                 |
| F11 | **祝日 row** is no longer a time row with a 定休日 checkbox: it is a select **祝日の扱い** with 曜日どおり (default) / 営業 / 休業; open/close inputs appear only for 営業. Helper of 営業時間 gains 祝日は「曜日どおり」のとき、その日の曜日の設定に従います. Cites Y-02 v6 「上書き設定をしていない祝日は曜日設定に従う」                  | `3a6c29b` (9/30)      | FR-012, FR-040, FR-041, FR-043, FR-044, FR-047 rewritten; new FR-041a. **Contract gap**: the business-hours row for 祝日 has only `isClosed`, so 曜日どおり has no representation — see Q&A Q4. |
| F12 | Demo code `ST-001` → `TK-001`                                                                                                                                                                                                                                                                                                                | `a7d0c88` (9/16)      | Seed data only.                                                                                                                                                                                 |
| F13 | `screens.ts`: store-form no longer `linksTo` store-map-setup; the store map entry moved to the detail screen's 店舗マップ tab (`e5501a3`, 9/26)                                                                                                                                                                                              | `e5501a3` (9/26)      | Out of Scope line and Traceability row 37 corrected.                                                                                                                                            |

### Session 2026-10-02 — 店舗写真 card added by dev (no V0 source)

The prototype still has **no** create/update/delete UI for store photos: its form has no photo control and the detail screen shows a static placeholder grid. The client updated only the locker UI in the matching Q&A (「[CRM][Y-02][Store] Xác nhận các logic ảnh, sơ đồ store, locker của cửa hàng chưa có trên prototype」). The API is fully defined, so the team lead (Du Le) decided on 2026-10-02 that **dev adds it**, without waiting for the designer (「tự thêm đi em」 — form + detail scope), reusing existing prototype components.

- Q: Does this form get a store-photo editor? → A: **Yes — a 店舗写真 card between 基本情報 and 備考, dev-added, no V0 source.** It supports adding and deleting photos. It is modelled on the closest existing prototype component, the 写真管理 card of the I-01 store-page form (`store-page-form.tsx` L1023-L1120): thumbnail grid, hover delete, dashed 写真を追加 tile, 「{n}枚 / 最大20枚」 counter. It drops what is I-01-specific (公開/非公開 dot, メイン badge, 並び順を編集 dialog). Supersedes, **for photos only**, Q2's 2026-09-03 decision to remove the repo's 店舗画像 card. The floor-map upload stays off this form (it lives on store-map-setup), and the social links, 会計コード and メールアドレス stay removed. Recorded in FR-004, FR-051, FR-055–FR-059f, FR-070a, FR-083, FR-086a, Out of Scope, Q2.
- Q: Which API writes the photos? → A: **`PUT /api/v1/admin/stores/{id}/images` (API-083 §19.2), full-set replace** — BE's answer of 2026-10-02. The per-photo `POST` / `PATCH` / `DELETE /images/{imageId}` are deprecated (built in July, before §19 existed, and HQ/System-only) and MUST NOT be used. BE should be told when the FE has switched, so they can be removed. The flow is:
  1. Read the current list with `GET /admin/stores/{id}/images`.
  2. For each added file, request `POST /api/v1/media/presign` with `{ fileName, fileSize, contentType, tag: "store-image" }`, then `PUT` the file to the returned URL with **every** header in `requiredHeaders` (S3 answers 403 otherwise). Keep the returned `s3Key` (prefix `member-shared/store-image/`).
  3. Save by sending the whole list to keep, in display order: `{ items: [{ s3Key, caption }] }`.
  - The order of `items` is the display order; no `sortOrder` is sent.
  - Each item carries **only** `s3Key` and `caption`. An `id` or `sortOrder` answers 400 `E-VAL-001`.
  - At most 20 items. `caption` is optional, ≤255 chars, nullable. An empty set `{ "items": [] }` deletes all.
  - Image ids change on every PUT, so the FE never keeps them across saves.
  - Removing a photo only unlinks it; the S3 file is not deleted.
  - One transaction and one `stores_history` row per PUT.
  - Allowed roles: System / Headquarter / Staff (own store). Manager answers `E-AUTH-103`.

### Session 2026-11-13 — 受付設定（入会受付・引き継ぎ受付）added (Y-02 261112_v11)

Source: Dev Q&A「【モバイル・既存会員の連携】対象店舗による入会・引き継ぎの制御」and「【Y-02】店舗管理への「入会受付」項目の追加について（Bug-No.24）」, both answered 2026-11-12, reflected in Y-02 `261112_v11` (`fitness-spec` `96d696d`, FR-002 受付設定 + 権限マトリクス row 受付設定). The prototype has **no** source yet (`fitness-crm-ui` `9428dc2`, 2026-11-12), so the card is dev-added.

- Q: Which settings does the store get? → A: **Two separate switches**: 入会受付 (existing column `joiningReception`) and 引き継ぎ受付 (new column `linkReception`, added by BE 2026-11-12). 入会受付 ON → the store is offered by the app's new-member (APP-F-01 FR-M008), 1Day (APP-K-01) and 見学 (APP-F-10) store pickers. 引き継ぎ受付 OFF → a member whose **contract store** is this one cannot link the new app to their existing membership (APP-F-02 FR-M010; the app gets 422 `E-MEM-223`).
- Q: Default on a new store? → A: **Both OFF.** As of 11/18 only 八潮店 is switched ON (operational, by head office).
- Q: Who may switch them? → A: **System / Headquarter only.** Staff only views them. The API enforces it: a Staff body carrying either key answers 403 `E-AUTH-103`.
- Q: What does the card look like? → A: Dev decision, modelled on the prototype's own switch rows (相互利用設定, `store-detail.tsx` L2925-L2948): label + helper on the left, 停止 [switch] 受付 on the right, one row per setting, a divider between rows.

---

## User Scenarios _(mandatory)_

### User Story 1 - Register a new store (Priority: P1)

A head-office operator opens 店舗新規登録 from the store list. The page shows an empty two-card form: 基本情報 with the store's business code, name, kana name, brand and sub-brand, territory, operating company, address block, phone and fax, opening and closure dates, the eight-row weekly business-hours table, and the gender restriction; then 備考. They fill the four required fields plus whatever else is known, press 登録する, and land back on the store list with a success toast.

**Why this priority**: Without this the store master cannot grow. Every downstream feature (E-01〜E-03, G-01/G-02/G-03, B-01) keys off a store row that only this flow creates.

**Verification**: Open the create form as a head-office user, fill 店舗コード / 店舗名 / ブランド / テリトリー, press 登録する, and confirm the new store appears in the store list with the values entered.

**Acceptance Scenarios**:

1. **Given** a head-office user opens the create form, **When** the page renders, **Then** the title is 店舗新規登録, a back link labelled 店舗管理に戻る sits above it, every field is empty, and the primary button reads 登録する.
2. **Given** all four required fields carry a value, **When** 登録する is pressed, **Then** the store is created, a success toast reads 店舗を登録しました, and the operator is returned to the store list.
3. **Given** the brand is set to JOYFIT, **When** the operator tries to save without a sub-brand, **Then** the save is blocked and the sub-brand field reports that a sub-brand is required.
4. **Given** the brand is FIT365, **When** the brand is chosen, **Then** the sub-brand field is disabled and any previously chosen sub-brand is cleared.
5. **Given** the operator enters a 店舗コード that already exists on another store, **When** 登録する is pressed, **Then** the save is blocked and the 店舗コード field reports that the code is already in use.
6. **Given** the create form is submitted, **When** the request is built, **Then** it carries no store status — a newly registered store takes the master's default state and its status is never chosen on this screen.

---

### User Story 2 - Edit an existing store as head office (Priority: P1)

A head-office operator opens 店舗編集 for a store from the list or the detail screen. The same form renders pre-filled with the store's current values, including the territory (with its full organisational path shown underneath) and the eight weekly hour rows. They change what they need and press 保存する.

**Why this priority**: Store attributes change constantly — renames, moved addresses, new phone numbers, a reassigned FC company, a scheduled closure. This is the only screen that can apply those changes, and it is as load-bearing as creation.

**Verification**: Open the edit form for a seeded store, confirm each field shows that store's stored value, change the store name, save, and confirm the list and detail screen both show the new name.

**Acceptance Scenarios**:

1. **Given** a store exists, **When** the edit form loads, **Then** the title is 店舗編集, the primary button reads 保存する, and every field is populated from that store's stored values.
2. **Given** the store has a territory, **When** the form renders, **Then** **[Phase 2 — Round 3]** the territory picker shows the territory name with its area in brackets and the breadcrumb underneath shows 運営本部 › ブロック › エリア › テリトリー.
3. **Given** the store's own 店舗コード is left unchanged, **When** 保存する is pressed, **Then** the uniqueness check does not fire on the store's own code.
4. **Given** a field is changed and 保存する is pressed, **When** the save succeeds, **Then** a success toast reads 店舗の変更を保存しました and the operator is returned to the store list.
5. **Given** the store is being edited, **When** the weekly hours table is changed, **Then** the whole eight-row weekly set is stored as one replacement, and 027's 営業設定 tab shows the same values.
6. **Given** the edit form is loading the store, **When** the request is still in flight, **Then** a loading state renders in place of the form; **and given** the request fails, **Then** an error state with a retry affordance renders instead.

---

### User Story 3 - Edit the store's Staff-editable fields as store staff (Priority: P2)

A Staff member opens 店舗編集 for their own store. The whole form renders, but only the fields the client's whitelist grants them are usable — store name, address, phone number, and the weekly business hours including the 定休日 checkboxes (kana name left the set on 2026-09-04, QA #205 §1-④). Every other field is visibly disabled and, on hover, states that head-office authority is required. A standing line in the footer says which fields they may change and to ask head office for the rest.

**Why this priority**: Y-02's permission matrix carves out a Staff-editable subset (L205) and the client narrowed it to three store fields plus the weekly hours on 2026-08-24, and the store-staff Happy the requirement names ("事務作業からの解放") depends on a store fixing its own opening hours without a head-office ticket. It is P2 rather than P1 only because head office can already do all of it.

**Verification**: Sign in as Staff, open the edit form, confirm the four editable groups accept input and every other control is disabled with the tooltip, then change the phone number and save.

**Acceptance Scenarios**:

1. **Given** a Staff user opens the edit form, **When** the page renders, **Then** 店舗名 / 住所 / 電話番号 and every weekly-hours control are editable, and 店舗コード / 店舗名（カナ）/ ブランド / サブブランド / テリトリー / 運営企業 / 都道府県 / 郵便番号 / FAX番号 / 開店日 / 閉店日 / 性別制限 / 備考 are disabled.
2. **Given** a disabled field is hovered, **When** the tooltip opens, **Then** it reads この項目の変更には本部権限が必要です.
3. **Given** a Staff user is on the edit form and has not triggered a validation error, **When** the footer renders, **Then** it carries the line 名称・住所・電話番号・営業時間のみ編集できます。それ以外の項目は本部へ変更を依頼してください.
4. **Given** a Staff user changes an editable field, **When** 保存する is pressed, **Then** the store write carries exactly 店舗名 / 住所 / 電話番号 — nothing else — the weekly replace is issued only if the table was touched, and the save succeeds.
5. **Given** a Staff user opens the **create** form, **When** the page renders, **Then** the form is not shown at all — the permission wall renders instead (see User Story 5).

---

### User Story 4 - Recover from a failed validation (Priority: P2)

An operator presses the primary button with something missing. The form does not navigate. Each offending field grows an inline message, the footer swaps its guidance line for a summary, and the view scrolls to the first invalid field. Fixing a field clears its message as the operator types.

**Why this priority**: The form has four required fields, a uniqueness rule and a conditional rule, on a page long enough that the offending field can be off-screen. Without the scroll-to-error and the inline clearing, a failed save reads as a dead button.

**Verification**: Press 登録する on an empty create form; confirm four inline messages appear, the footer shows the summary, and the page scrolls to 店舗コード. Type a code and confirm that message clears.

**Acceptance Scenarios**:

1. **Given** required fields are empty, **When** the primary button is pressed, **Then** nothing is saved, no navigation happens, and each empty required field shows its own message: 店舗コードを入力してください / 店舗名を入力してください / ブランドを選択してください / テリトリーを選択してください.
2. **Given** a validation failure has occurred, **When** the footer renders, **Then** it shows 未入力の項目があります in place of any other footer guidance.
3. **Given** a validation failure has occurred, **When** the messages render, **Then** the view scrolls the first invalid field into the centre of the viewport.
4. **Given** 店舗コード shows its required message, **When** the operator types a non-blank value, **Then** that field's message clears immediately without a further save attempt.
5. **Given** ブランド or テリトリー shows its message, **When** **[Phase 2 — Round 3]** a value is chosen, **Then** that field's message clears immediately.
6. **Given** a 店舗コード consisting only of whitespace, **When** the primary button is pressed, **Then** it is treated as empty and the required message shows.

---

### User Story 5 - Be told plainly when the screen is not yours (Priority: P3)

A Manager, Trainer or Observer reaches the form by link. Instead of a form they cannot use, they get a centred permission wall — a shield icon, the heading アクセス権限がありません, and a line naming who may do this — with the page title and the back link still in place so they can leave.

**Why this priority**: Y-02's matrix denies store registration to everyone but System / Headquarter and denies basic-information editing to Manager, Trainer and Observer. Rendering a disabled form instead of a wall would be a worse answer, but the flow is a dead end either way, hence P3.

**Verification**: Sign in as Manager, open both the create and edit routes, and confirm each renders the wall with the mode-appropriate sentence and a working back link.

**Acceptance Scenarios**:

1. **Given** a Manager / Trainer / Observer opens the create form, **When** the page renders, **Then** neither card nor footer buttons appear and the wall reads 店舗の新規登録は本部・System 権限のみ操作できます。
2. **Given** a Manager / Trainer / Observer opens the edit form, **When** the page renders, **Then** the wall reads 店舗情報の編集は本部・System 権限、または所属店舗のスタッフのみ操作できます。
3. **Given** a Staff user opens the create form, **When** the page renders, **Then** the create wall renders (Staff may edit, not register).
4. **Given** the wall is rendered, **When** the operator uses the back link, **Then** they return to the store list with no discard prompt (there is nothing to discard).

---

### User Story 6 - Leave without losing work by accident (Priority: P3)

An operator has typed into the form and then clicks キャンセル or the back link. A dialog asks whether to discard; choosing 編集を続ける keeps them on the form with their input intact, choosing 破棄する leaves. Closing the browser tab with a dirty form raises the browser's own warning.

**Why this priority**: The form is long and the two exits sit next to the save button. The guard is cheap and prevents a whole re-entry, but no data is lost without it if the operator is careful — hence P3.

**Verification**: Type into 店舗名, press キャンセル, confirm the dialog, choose 編集を続ける and confirm the typed value survives; repeat and choose 破棄する to confirm the exit.

**Acceptance Scenarios**:

1. **Given** no field has been touched, **When** キャンセル or the back link is used, **Then** the operator leaves for the store list immediately with no dialog.
2. **Given** at least one field has been changed, **When** キャンセル or the back link is used, **Then** a dialog titled 変更を破棄しますか？ opens with the body 未保存の変更はすべて失われます。この操作は取り消せません。
3. **Given** the discard dialog is open, **When** 編集を続ける is chosen, **Then** the dialog closes, the operator stays on the form, and every entered value is unchanged.
4. **Given** the discard dialog is open, **When** 破棄する is chosen, **Then** the operator leaves for the store list and the changes are dropped.
5. **Given** the form is dirty, **When** the operator tries to close or navigate the browser away from the page, **Then** the browser's own leave-confirmation is raised.
6. **Given** a save has just succeeded, **When** the navigation to the store list happens, **Then** no discard dialog appears — a successful save clears the dirty state first.

---

### Edge Cases

- **Whitespace-only required values**: 店舗コード and 店舗名 are trimmed before the emptiness check, so a value of spaces fails as empty (`store-form.tsx` L171, L177).
- **店舗コード uniqueness on edit**: the store's own current code is excluded from the duplicate check, so re-saving an unchanged code succeeds; changing it to another store's code fails (L173).
- **Head office changes an existing 店舗コード**: the change is allowed and saved. Nothing in this feature rewrites the systems keyed on the old code — the helper text's impact warning is the only safeguard, by decision of 2026-09-03.
- **Duplicate detected only at save time**: the backend answers a duplicate club code with a conflict (E-STR-002 on both create and edit), so a code that passed the client-side check can still be rejected on save — the field must then show the same "already in use" message rather than a generic failure.
- **Brand switched away from JOYFIT**: any chosen sub-brand is cleared and the sub-brand control is disabled in the same interaction (L283).
- **Sub-brand while no brand is chosen**: the sub-brand control is disabled until the brand is JOYFIT, so it can never carry a value that contradicts the brand.
- **定休日 checked**: that day's open and close time inputs are disabled; unchecking re-enables them (L393, L402, L409-410).
- **定休日 checked with times already entered**: the stored row for that day is a closed day and carries no times — the times the operator had typed are not persisted.
- **Territory list contains a disabled territory**: **[Phase 2 — Round 3]** disabled territories are hidden from the picker, except the one currently selected, which stays visible so an existing assignment is never silently dropped (`territory-combobox.tsx` L75-78).
- **Territory not yet chosen**: **[Phase 2 — Round 3]** the breadcrumb under the picker renders nothing at all rather than an empty path (`territory-combobox.tsx` L126-127).
- **運営企業 left blank or set to 直営（運営企業なし）**: the store is directly managed (直営), and the list screen renders 直営 for such a store (026 FR-004). In edit mode choosing 直営（運営企業なし）on a franchised store clears its operating company.
- **閉店日 in the past**: the form stores the date; flipping the status to 閉店 is a scheduled backend job (Y-02 FR-007), not a client-side derivation, so the form neither blocks the date nor reports a status change.
- **閉店日 earlier than 開店日**: the prototype has no check for this and neither does the contract (the backend stores the pair as sent). Since Y-02 Bug No.19 (2026-10-22) the form rejects it at 閉店日 with 「閉店日は開店日以降の日付を入力してください」; the same day is allowed. Create always checks it; edit checks it only once either date has been changed, so an inverted pair already on file (or a Staff save, which cannot touch the dates) is not blocked.
- **閉店時刻 equal to or earlier than 開店時刻 on a weekday (or the 祝日 row set to 営業)**: rejected client-side since Y-02 Bug No.8 (2026-11-05) with 「{曜日}の閉店時刻は開店時刻より後の時刻を入力してください」 (FR-044) instead of being sent and refused by the backend as E-STR-003. A day whose close falls after midnight (e.g. 22:00 → 翌2:00) cannot be entered until the 「翌日」 check of Y-02 v7 FR-005 is built. As with FR-044 generally, edit validates the table only once it has been touched.
- **Store id in the edit URL does not exist**: the error state renders with a retry affordance rather than an empty form (backend answers E-STR-001).
- **Store outside the caller's scope**: the same three-tier scope rule as 026/027 applies — a Staff user may only edit the store their staff record is linked to; another store's edit route renders the permission wall.
- **Save fails on the server**: the operator stays on the form with their input intact and an error toast; nothing is navigated and the dirty state is kept so the discard guard still works.
- **A non-hours change is saved while the weekly table is untouched**: no weekly replacement is issued at all, so hours changed on the detail screen since this form was loaded survive intact (FR-045a).
- **Photo edge cases** (FR-055–FR-059f): 21st photo → refused with the max message, tile disabled at 20; non-JPG/PNG or >10MB → refused before upload; upload fails → tile removed, other photos kept; save pressed while uploading → primary button disabled; a photo deleted then the form discarded → nothing unlinked; all photos deleted → empty list sent; another operator changed the photos meanwhile → the full-set replace wins (last write), as with the weekly hours.
- **The store row saves but the weekly replacement fails (or the reverse)**: the operator is told which half did not save and stays on the form with that half still dirty (FR-070a). The feature does not attempt to roll the successful half back.
- **A write arrives for a field the caller may not change**: the whole write is refused rather than partially applied, and the refusal is reported as a permission problem, not as invalid input (FR-088, FR-089). This holds for a Staff caller sending a head-office-only field and for any role sending a create or edit it has no right to.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Screen shell and modes

- **FR-001**: The feature MUST provide the store form on two routes — a create route and a per-store edit route — rendering the same body with mode-dependent title, primary-button label, initial values and success message.
- **FR-002**: The page title MUST read 店舗新規登録 in create mode and 店舗編集 in edit mode.
- **FR-003**: A back link labelled 店舗管理に戻る MUST sit above the title and return to the store list, passing through the unsaved-changes guard (FR-100).
- **FR-004**: The form body MUST be three cards in this order: 基本情報, 店舗写真, 備考. 店舗写真 is dev-added with no V0 source (Session 2026-10-02 — 店舗写真); V0 has only 基本情報 and 備考.
- **FR-005**: A footer MUST sit below the cards holding, right-aligned, a キャンセル button then the primary button, whose label is 登録する in create mode and 保存する in edit mode.
- **FR-006**: In edit mode the screen MUST render a loading state while the store is being read and an error state with a retry affordance when the read fails, in place of the form.

#### 基本情報 — fields, order and marks

- **FR-010**: **[Phase 2 — Round 3]** (テリトリー only — Phase 1 omits it and keeps the rest in order). The 基本情報 card MUST render these fields in this order: 店舗コード, 店舗名, 店舗名（カナ）, then a two-column row of ブランド and サブブランド (サブブランド is not rendered at all when the brand is FIT365 — F8), then テリトリー, 運営企業（FC企業）, a two-column row of 都道府県 and 郵便番号, 住所, a two-column row of 電話番号 and FAX番号, a two-column row of 受付開始日 and プレオープン日, a two-column row of 開店日 and 閉店日, 営業時間（曜日別デフォルト設定）, and 性別制限. The four dates therefore read in chronological order.
- **FR-011**: The required mark (red `*`) MUST be carried by 店舗コード, 店舗名, ブランド, テリトリー, and by サブブランド while the brand is JOYFIT. **[Phase 2 — Round 3]** テリトリー returns with the picker; Phase 1 has 店舗コード, 店舗名, ブランド (+ サブブランド for JOYFIT). Every other field MUST carry the optional chip 任意 (muted filled chip) — 店舗名（カナ）, サブブランド (unless JOYFIT), 運営企業（FC企業）, 都道府県, 郵便番号, 住所, 電話番号, FAX番号, 受付開始日, プレオープン日, 開店日, 閉店日, 営業時間（曜日別デフォルト設定）, 性別制限, 備考. A field never carries both (prototype `6bc1f1c` / `a7d0c88`; supersedes the earlier "no optional mark").
- **FR-012**: Each field's helper text MUST render under its label where the prototype has one, verbatim:
  - 店舗コード → create mode: 業務用コード。ロッカー・機器・商材など他機能から参照されるため、登録後の変更は影響範囲に注意; edit mode: 業務用コード。ロッカー・機器・商材など他機能から参照されているため、変更すると影響範囲が大きくなります — src: store-form.tsx:L297 (`6bc1f1c` / `a7d0c88`). The old 「…登録後の変更不可」 line is gone from V0 too; the prototype-sync QA is closed.
  - ブランド → JOYFIT の場合はサブブランドを併せて選択
  - サブブランド → JOYFITの場合に選択
  - テリトリー → 店舗が所属する組織階層。エリアを選ぶとテリトリーの選択肢が絞り込まれ、ブロック・運営本部はテリトリーから自動的に確定します **[Phase 2 — Round 3]**
  - 運営企業（FC企業）→ FC企業マスタから選択。直営の場合は「直営（運営企業なし）」を選択
  - 受付開始日 → 入会受付を始める日 — src: store-form.tsx:L417 (`a7d0c88`)
  - プレオープン日 → プレオープンの日 — src: store-form.tsx:L425 (`a7d0c88`)
  - 閉店日 → 閉店予定がある場合のみ設定。設定した日を過ぎると店舗ステータスが自動で「閉店」になります
  - 営業時間（曜日別デフォルト設定）→ 通常営業日の標準営業時間。営業カレンダーに年間一括適用され、例外日はカレンダー側で個別設定。祝日は「曜日どおり」のとき、その日の曜日の設定に従います (`3a6c29b`)
- **FR-013**: Text inputs MUST carry the prototype's example placeholders: 店舗コード 例: TK-001, 店舗名 例: JOYFIT24新宿店, 店舗名（カナ）例: ジョイフィット24シンジュクテン, 郵便番号 例: 160-0022, 住所 例: 新宿区新宿3-1-1, 電話番号 例: 03-1234-5678, FAX番号 例: 03-1234-5679, 備考 補足事項があれば入力してください. Selects with no value MUST read 選択してください (運営企業（FC企業）included, since `6bc1f1c`), and the date pickers read 日付を選択.
- **FR-014**: The ブランド select MUST offer exactly JOYFIT and FIT365.
- **FR-015**: The サブブランド select MUST offer exactly JOYFIT, JOYFIT24, JOYFIT YOGA, JOYFIT+. It MUST NOT be rendered when the brand is FIT365; with no brand chosen it MUST render disabled with the 任意 chip; with JOYFIT it is enabled and required (FR-065). Changing the brand away from JOYFIT MUST clear any chosen sub-brand — and any brand / sub-brand error — in the same interaction (prototype `a7d0c88`).
- **FR-015a**: In edit mode ブランド and サブブランド MUST be editable only while the store is in the preparation state and MUST be disabled once it has opened, stating the reason on hover as 営業中の店舗ではブランドを変更できません（開業準備中のみ変更可）(src: store-form.tsx:L167, `a7d0c88`; for a Staff user the Staff lock tooltip of FR-084 is shown instead), because a brand change after opening is handled by registering a new store (client sign-off 2026-08-24, recovered 2026-09-04; the contract answers 422 `E-STR-006`). ~~**Blocked dependency**~~ **Unblocked 2026-10-02**: 026 Q1 is re-resolved to the four-value vocabulary (準備中 / 営業中 / 休業中 / 閉店), so the store's status is known and the rule MUST be implemented now — locked for 営業中, 休業中 and 閉店, editable only for 準備中. Create mode is unaffected — a new store is always in preparation.
- **FR-016**: The 都道府県 select MUST offer the 47 Japanese prefectures.
- **FR-017**: The 運営企業（FC企業）select MUST offer, first, the explicit option 直営（運営企業なし）, then the FC companies from the FC company master (Y-03) restricted to companies in an active state. Choosing 直営（運営企業なし）stores "no operating company", so a franchised store can be turned back into a directly managed one in edit mode; leaving the select empty on create means the same (prototype `6bc1f1c`).
- **FR-018**: The 性別制限 select MUST offer exactly 混合 and 女性専用.
- **FR-019**: 受付開始日, プレオープン日, 開店日 and 閉店日 MUST each be a date picker producing a calendar date, all four optional, and MUST render in that chronological order. 開店日 is the store's grand-open date.
- **FR-019a**: 受付開始日 and プレオープン日 come from the client's sign-off of 2026-08-24 (QA #202) and are in the prototype since `a7d0c88` (2026-09-16, store-form.tsx L415-432; store-detail.tsx L1038-1054). Labels, helper text, order and the Staff lock follow the prototype. 受付開始日 carries the client's meaning — the date enrollment reception starts — not the backend description's "handover/receipt date".
- **FR-020**: The form MUST NOT contain a store-status control. The store's lifecycle status is derived from the closure date (Y-02 FR-007) and is never chosen on this screen.

#### テリトリー picker **[Phase 2 — Round 3]**

- **FR-030**: テリトリー MUST be chosen through a two-tier cascade of selects — エリア (placeholder エリアを選択) then テリトリー (placeholder テリトリーを選択) — the same cascade as the store list's filter. テリトリー MUST be disabled with the tooltip 先にエリアを選択してください until an area is chosen and MUST be cleared when the area changes (prototype `1767864`, 2026-09-17; replaces the searchable grouped combobox).
- **FR-031**: In edit mode both selects MUST be preset from the saved territory (its area, then the territory). Only human-readable names are shown, never an internal identifier.
- **FR-032**: Territories in a disabled state MUST be hidden from the option list, except a currently selected one, which stays listed so an existing assignment is never dropped by the UI.
- **FR-033**: A breadcrumb under the picker MUST show the full organisational path 運営本部 › ブロック › エリア › テリトリー for the chosen territory, with the territory itself emphasised, and MUST render nothing when no territory is chosen.
- **FR-034**: Only the territory MUST be stored. エリア, ブロック and 運営本部 are derived from it and MUST NOT be independent form fields (Y-02 FR-002 L132).
- **FR-035**: ~~When the option list matches nothing, the picker MUST show 該当なし.~~ Withdrawn 2026-10-02 — the cascade has no search box, so there is no empty-search state.

#### 営業時間（曜日別デフォルト設定）

- **FR-040**: The weekly table MUST render exactly eight rows in this order: 月曜日, 火曜日, 水曜日, 木曜日, 金曜日, 土曜日, 日曜日, 祝日.
- **FR-041**: Each weekday row (月曜日–日曜日) MUST hold, in order: the day label, an opening-time input, a 〜 separator, a closing-time input, and a 定休日 checkbox with its label.
- **FR-041a**: The 祝日 row MUST instead hold the label 祝日 and a select 祝日の扱い with exactly 曜日どおり (default), 営業, 休業. Only when 営業 is chosen MUST an opening-time input, 〜 and a closing-time input appear on a second line beneath it (aria-labels 祝日 開店時刻 / 祝日 閉店時刻). 曜日どおり means "no holiday override": a holiday follows the setting of its own weekday (Y-02 v6 FR-005); 営業 overrides it as open with the entered hours; 休業 overrides it as closed (prototype `3a6c29b`, 2026-09-30).
- **FR-042**: Checking a row's 定休日 MUST disable that row's two time inputs; unchecking MUST re-enable them.
- **FR-043**: A weekday marked 定休日, or the 祝日 row set to 休業, MUST be stored as a closed day carrying no opening or closing time.
- **FR-044**: A weekday not marked 定休日 that has one time entered, and the 祝日 row set to 営業, MUST carry both an opening and a closing time when saved; a weekday left with neither time is valid and is left out of the weekly set entirely — "not set" (API-083 §6.2 / §8.2: sent as an open row with null times it is refused with 422 E-STR-003) (Y-02 Bug No.21, 2026-10-26; payload corrected 2026-11-09). On edit, clearing both times of a stored day therefore removes that day. Whenever both times are present the closing time MUST be later than the opening time — an equal or earlier closing time is rejected with 「{曜日}の閉店時刻は開店時刻より後の時刻を入力してください」 beneath the table, the offending row's inputs marked invalid (Y-02 v7 FR-005 「終了時刻: 開始時刻より後」; Y-02 Bug No.8, 2026-11-05). The backend rejects the same pair with 422 E-STR-003, whose fixed wording 「短縮営業の開店時刻と閉店時刻を両方入力してください。」 reads as "missing time", so the form must stop it first. Overnight hours (24時超え via a 「翌日」 check, Y-02 v7 FR-005 L171) are not built yet; until they are, a same-day close-after-open is the only accepted shape. The 祝日 row set to 曜日どおり carries neither and is stored as "not overridden" (representation: Q&A Q4).
- **FR-045**: The weekly set MUST be persisted as a complete eight-row replacement, never as a per-row update — the same replacement the detail screen (027) performs, so the two screens write one shared source of truth.
- **FR-045a**: In edit mode the weekly replacement MUST be issued only when the operator actually changed the table. An untouched table MUST NOT be written, so a save that changes nothing about the hours cannot overwrite hours changed elsewhere since the form was loaded (resolved 2026-09-03).
- **FR-045b**: The weekly table's values MUST therefore be held as tracked state and compared against the values loaded for the store, so "changed" is decidable per save. A change to any time, or to any 定休日 flag, counts.
- **FR-046**: In create mode the weekly set MUST be submitted together with the store, as a single request (client sign-off 2026-08-24, QA #202).
- **FR-047**: In edit mode the weekly rows MUST be initialised from the store's stored weekly set; in create mode they MUST start from the brand-independent default the prototype seeds, with no day marked 定休日 and 祝日 at 曜日どおり.

#### 店舗写真 — dev-added, no V0 source (2026-10-02)

> **Note — not in the prototype.** No mockup exists for creating, replacing or deleting store photos; the prototype only _displays_ them (detail screen, placeholder grid). Dev adds the card and its add/delete logic on the team lead's instruction of 2026-10-02, reusing the I-01 store-page form's 写真管理 card as the visual reference (`store-page-form.tsx` L1023-L1120). Every requirement in this block is **spec-proposed**: copy marked "(spec-proposed)" has no V0 string and should be reviewed by the designer when the prototype catches up.

- **FR-055**: The 店舗写真 card MUST sit between 基本情報 and 備考 and render in both create and edit mode. Its header MUST carry the title 店舗写真 and, right-aligned, the counter {n}枚 / 最大20枚 (reference component copy).
- **FR-055a**: Under the header the card MUST show the helper 店舗の外観・内装・設備の写真を登録します。表示順は登録した順です。 (spec-proposed), and below the grid the note JPG, PNG / 最大10MB / 最大20枚 (reference component copy).
- **FR-056**: Photos MUST render as a thumbnail grid — four columns, five on wide screens, 16:9 thumbnails with rounded border — in their stored order, followed by a dashed 写真を追加 tile with an upload icon. In edit mode the grid MUST be initialised from the store's current photo list. While that list is loading, the grid MUST show a loading treatment; a failed read MUST show an error with a retry affordance inside the card without blocking the rest of the form. With no photos, only the 写真を追加 tile renders.
- **FR-057**: Choosing 写真を追加 (click, or dropping files on the tile) MUST open a file picker accepting JPG and PNG, multi-select. Each accepted file MUST be uploaded straight away to the store-image upload slot. While it uploads its tile MUST show a progress/spinner state, and on success it is appended at the end of the grid. Picking files marks the form dirty. At most **5 uploads run at once** (the backend's per-user pending-upload cap, API-006 §11 — `E-MED-008` 429 beyond it); the rest wait in one queue shared by every pick/drop and start as soon as an upload (presign + S3 PUT) settles. A queued file shows the same spinner tile and never an error. A pick of 20 files (the per-store cap) MUST upload all 20. _(Y-02 - Bug No.10, 2026-11-18.)_
- **FR-057a**: A file MUST be refused before upload, with an inline message under the grid, when (copy spec-proposed, patterned on store-map-setup's image errors):
  - its type is not JPG/PNG — JPG・PNG 以外の形式のため登録できません（選んだファイル: {ファイル名}）;
  - it exceeds 10MB — 10MBを超えているため登録できません（選んだファイル: {x.x}MB）;
  - it would take the total past 20 — 写真は最大20枚まで登録できます. The files that still fit are accepted, the rest are refused. At 20 photos the 写真を追加 tile MUST be disabled.
- **FR-057b**: A failed upload MUST remove that file's tile and show 写真のアップロードに失敗しました。もう一度お試しください (spec-proposed). The other photos are unaffected. However many uploads fail in one go, the message is shown **once** (Bug No.10).
- **FR-058**: Hovering a thumbnail MUST reveal a delete button (X icon, top-right, accessible name 写真を削除). Clicking it MUST remove the photo from the grid at once, with no confirmation dialog, and mark the form dirty. Nothing is unlinked until the form is saved, so キャンセル / the discard dialog brings it back.
- **FR-059**: Captions and reordering are **not** edited in Phase 1 (no UI). Existing photos keep their caption and relative order; new photos are appended with no caption.
- **FR-059a**: Saving MUST write the photo list only when it changed (a photo added or removed). The write sends the complete list to keep, in grid order, as `{ s3Key, caption }` pairs only — never an image id or a sort order. Removing every photo sends an empty list.
- **FR-059b**: In create mode the photo list MUST be written **after** the store has been created, against the new store, as a second request.
- **FR-059c**: While any upload is still in progress, the primary button MUST be disabled.
- **FR-059d**: The photo list MUST NOT keep image ids across saves: after a successful photo write the card re-reads (or takes from the response) the saved list, whose ids are new.
- **FR-059e**: A successful photo write MUST invalidate the cached store photos, so the detail screen's 店舗写真 card shows them without a manual reload (FR-113).
- **FR-059f**: The deprecated per-photo add/edit/delete operations MUST NOT be used; the full-set replace is the only photo write.

#### 受付設定 — dev-added, no V0 source (2026-11-13)

> **Note — not in the prototype.** Y-02 `261112_v11` FR-002 adds 受付設定; the prototype (`9428dc2`) has no control for it yet. See Clarifications → Session 2026-11-13.

- **FR-115**: A 受付設定 card MUST sit between 基本情報 and 店舗写真 and render in both create and edit mode. It MUST hold two rows, in this order, separated by a divider:
  - **入会受付** — helper ON の店舗だけを、アプリの新規入会・1Day・見学の店舗選択に表示します;
  - **引き継ぎ受付** — helper ON の店舗を契約店舗とする会員だけが、アプリで既存会員の引き継ぎ（連携）をできます.
    Each row carries, right-aligned, the text 停止, a switch (accessible name = the row label) and the text 受付.
- **FR-116**: In create mode both switches MUST start **OFF**. In edit mode they MUST be initialised from the store's `joiningReception` / `linkReception`.
- **FR-117**: Toggling a switch MUST mark the form dirty (the unsaved-changes guard, FR-100–FR-104, applies).
- **FR-118**: The create write MUST always carry `joiningReception` and `linkReception`. The edit write MUST carry each key **only when that switch changed** — an untouched switch is left out of the PATCH so it cannot overwrite a value changed elsewhere since the form was loaded (the same protection FR-045a gives the weekly table).
- **FR-119**: For a restricted Staff user both switches MUST be disabled and expose この項目の変更には本部権限が必要です on hover (FR-084), and a Staff save MUST NOT carry either key (FR-086) — the backend refuses it with 403 `E-AUTH-103`.

#### 備考

- **FR-050**: The 備考 card MUST hold one free-text memo field, labelled 備考, carrying the 任意 chip (FR-011).
- **FR-051**: The form MUST NOT render a floor-map upload control (owned by store-map-setup), a social-links group, a 会計コード field, or a メールアドレス field (resolved 2026-09-03). Store photos are the one exception: they get the dev-added 店舗写真 card of FR-055 (2026-10-02).

#### Validation and submission

- **FR-060**: The primary button MUST validate before submitting and MUST NOT navigate or save when validation fails.
- **FR-061**: 店舗コード MUST be required after trimming, and MUST be rejected when it duplicates another store's code — excluding, in edit mode, the store's own current code. The two messages are 店舗コードを入力してください and この店舗コードは既に使用されています.
- **FR-061a**: In edit mode 店舗コード MUST remain editable for System and Headquarter and MUST stay disabled for a restricted Staff user under FR-084 (client sign-off 2026-08-24, recovered 2026-09-04). Its helper text MUST be FR-012's warning rather than the prototype's prohibition line, which the client called wrong: the copy follows the client's answer, the behaviour follows the contract (`UpdateStoreDto` accepts `clubCode` and answers 409 `E-STR-002` on a duplicate).
- **FR-061b**: In edit mode, when the submitted 店舗コード differs from the one loaded, the save MUST first raise a confirmation dialog naming the downstream impact and MUST proceed only when the operator confirms; cancelling MUST return to the form with the typed value and the dirty state intact. Create mode has no such dialog. The copy follows the prototype (store-form.tsx:L576-L590, `a7d0c88`, citing 開発回答 2026/08/24): title 店舗コードを {旧コード} から {新コード} に変更しますか？, body 店舗コードはロッカー・機器・商材など他機能から参照されています。変更すると影響範囲が大きくなります。, choices キャンセル and 変更して保存する. The comparison is made on the trimmed value.
- **FR-061c**: In edit mode, as soon as the typed 店舗コード differs from the loaded one, a warning alert (warning tint, triangle icon) MUST render directly under the input reading 店舗コードはロッカー・機器・商材など他機能から参照されています。変更すると影響範囲が大きくなります。, and MUST disappear when the value is changed back (prototype `a7d0c88`).
- **FR-062**: 店舗名 MUST be required after trimming, with the message 店舗名を入力してください.
- **FR-063**: ブランド MUST be required, with the message ブランドを選択してください.
- **FR-064**: **[Phase 2 — Round 3]** テリトリー MUST be required, with the message テリトリーを選択してください.
- **FR-065**: サブブランド MUST be required when the brand is JOYFIT, with the message サブブランドを選択してください (client sign-off 2026-08-24, QA #202 line 4 — the stored brand vocabulary has no bare JOYFIT value; V0 since `a7d0c88`).
- **FR-066**: Every failing field MUST show its message inline beneath its control and MUST be marked invalid for assistive technology.
- **FR-067**: On a failed validation the footer MUST show 未入力の項目があります in place of any other footer guidance, and the view MUST scroll the first invalid field into the centre of the viewport.
- **FR-068**: A field's message MUST clear as soon as the operator supplies a value for it, without requiring another save attempt.
- **FR-069**: A successful save MUST clear the dirty state, show a success toast — 店舗を登録しました on create, 店舗の変更を保存しました on edit — and return the operator to the store list.
- **FR-070**: A save rejected by the server MUST leave the operator on the form with their input and dirty state intact and MUST report the failure; a duplicate-code rejection MUST surface on the 店舗コード field with the same "already in use" message rather than as a generic error.
- **FR-070a**: When an edit save comprises more than one write — the store row, the weekly-hours replacement, the photo-list replacement (FR-059a) — a failure of any MUST be reported as such, naming which part did not save, and MUST leave the operator on the form with the unsaved part still marked dirty, so a retry re-sends only what is missing.
- **FR-070c**: In create mode, when the store is created but the photo write fails, the store MUST NOT be rolled back. The operator MUST be told 店舗は登録しましたが、写真の保存に失敗しました。編集画面から再度登録してください (spec-proposed) and taken to the store list as on success.
- **FR-070b**: Clearing an optional field MUST clear the stored value. Since an omitted field means「変更しない」on the edit request, a field the operator emptied MUST travel as an explicit null rather than being left out — 都道府県 / 郵便番号 / 住所 / 電話番号 included, all four of which `UpdateStoreDto` marks nullable (defect found in MR review 2026-09-16: emptying 住所 or 電話番号 left the stored value in place).
- **FR-071**: The create request MUST NOT carry a store status (QA #202 line 5 / QA #205, client-confirmed 2026-08-24), and the edit request MUST NOT carry one either — an omitted status means "leave unchanged".

#### Permissions

- **FR-080**: Create MUST be available to System and Headquarter only, and MUST be refused by the API layer for every other role.
- **FR-081**: Edit MUST be available to System, Headquarter, and Staff for the store their staff record is linked to, and MUST be refused by the API layer for every other role and for a store outside the caller's scope.
- **FR-082**: A role with neither create nor edit rights for the requested mode MUST see a centred permission wall — a shield icon, the heading アクセス権限がありません, and a mode-specific line: 店舗の新規登録は本部・System 権限のみ操作できます。 for create, 店舗情報の編集は本部・System 権限、または所属店舗のスタッフのみ操作できます。 for edit — with the page title and back link still rendered and no form or footer buttons at all.
- **FR-083**: In edit mode a Staff user without head-office rights MUST be able to edit exactly these groups: 店舗名, 住所, 電話番号 — the client's whitelist for the store write (sign-off 2026-08-24, recovered 2026-09-04) — plus every control in the weekly business-hours table including the 定休日 checkboxes, which are written through the business-hours replace rather than the store write and stay Staff-writable by the client's own answer. 店舗名（カナ）is **not** in the whitelist and MUST be locked (changed 2026-09-04; the earlier reading of Y-02 権限マトリクス L205 included it).
- **FR-084**: In that same mode every other field — 店舗コード, 店舗名（カナ）, ブランド, サブブランド, テリトリー, 運営企業（FC企業）, 都道府県, 郵便番号, FAX番号, 開店日, 閉店日, 性別制限, 備考, 入会受付, 引き継ぎ受付 — MUST be disabled and MUST expose the reason on hover as この項目の変更には本部権限が必要です.
- **FR-085**: In that same mode, while no validation error is showing, the footer MUST carry the line 店舗名・住所・電話番号・営業時間・店舗写真のみ編集できます。それ以外の項目は本部へ変更を依頼してください — V0 (`a7d0c88`) reads 店舗名・住所・電話番号・営業時間のみ…; 店舗写真 is added because of the dev-added card (FR-086a).
- **FR-086**: A Staff save MUST submit exactly the three whitelisted fields on the store write — 店舗名, 住所, 電話番号 — and nothing else; the weekly table, when it was changed, travels in its own replace request. Sending even one field outside the whitelist MUST be treated as a failed save rather than a partial one, because the request is refused whole (client sign-off 2026-08-24, recovered 2026-09-04).
- **FR-088**: The API layer MUST enforce the same rules the UI shows, independently of the UI: a write from a role without create/edit rights MUST be refused, and a write from a Staff caller carrying any field outside the three-field whitelist of FR-083 MUST be refused **whole** — none of its fields applied — rather than silently ignored or partially accepted (the client's rule of 2026-08-24: 403, no partial apply). A locked value therefore cannot be rewritten by a hand-crafted request, not merely by the rendered form.
- **FR-086a**: A Staff user editing their own store MUST be able to add and delete photos in the 店舗写真 card; it is **not** locked by FR-084, because the photo write is a separate operation that the backend grants to Staff for their own store (BE answer 2026-10-02; Y-02 権限マトリクス note 「Staff編集可能: 店舗写真」). The Staff footer line of FR-085 therefore reads 店舗名・住所・電話番号・営業時間・店舗写真のみ編集できます。それ以外の項目は本部へ変更を依頼してください (diverges from V0's string because the card itself is dev-added). A Manager gets no photo write (the backend answers `E-AUTH-103`), and has no form access anyway.
- **FR-089**: A refusal MUST be distinguishable from a validation failure, so the screen reports "not permitted" rather than "invalid input".
- **FR-087**: A Staff user MUST NOT be able to reach the create form — the create permission wall renders instead.

#### Unsaved-changes guard

- **FR-100**: Any change to any field MUST mark the form dirty.
- **FR-101**: キャンセル and the back link MUST leave immediately when the form is not dirty, and MUST open a confirmation dialog when it is.
- **FR-102**: That dialog MUST be titled 変更を破棄しますか？ with the body 未保存の変更はすべて失われます。この操作は取り消せません。 and two choices: 編集を続ける (stay, keeping every entered value) and 破棄する (leave, dropping the changes).
- **FR-103**: While the form is dirty the browser's own leave-confirmation MUST be raised on an attempt to close or navigate away from the page.
- **FR-104**: A successful save MUST clear the dirty state before navigating, so no discard dialog appears on the way out.

#### Data

- **FR-110**: The screen MUST read and write the store master row through the project's mock API, mirroring the backend's store-master contract so the later swap to the real client is mechanical.
- **FR-111**: Change-history rows MUST NOT be created, updated or deleted by this feature. History is seeded data read by 027 (user instruction, 2026-09-03).
- **FR-112**: **[Phase 2 — Round 3]** The territory options MUST come from the organisation-hierarchy source already serving the store list (026), not from a copy local to this screen.
- **FR-113**: A save MUST invalidate the cached store list and the cached single store, so the list and the detail screen show the new values without a manual reload.
- **FR-114**: The store record MUST carry all three opening dates separately — the enrollment-reception start date, the pre-open date and the grand-open date — rather than one collapsed opening date, so the three the contract defines round-trip unchanged.

### Key Entities

- **Store (店舗マスタ)**: the record this form writes. Identity — internal id, display store id, business club code (unique), name, kana name. Classification — brand (one flat value covering brand and sub-brand), gender restriction. Organisation — territory (the only stored hierarchy level), operating FC company (absent = 直営). Location — prefecture, postal code, address. Contact — phone, fax. Lifecycle — enrollment-reception start date, pre-open date, grand-open date, closure date, derived status. Free text — memo.
- **Store weekly business hours (曜日別デフォルト営業時間)**: eight rows per store, one per weekday plus 祝日, each with an opening time, a closing time, and a closed-day flag. Replaced as a complete set. Shared with the detail screen's 営業設定 tab, which additionally owns the exception days and the staff-resident window.
- **Organisation hierarchy node (Y-15 組織階層)**: 運営本部 → ブロック → エリア → テリトリー. This screen selects a territory and displays the derived path; it never edits the hierarchy.
- **FC company (Y-03 FC企業マスタ)**: the operating-company option list. Read-only here; only active companies are offered.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A head-office operator can register a store with the four required fields in under two minutes and sees it in the store list immediately afterwards.
- **SC-002**: 100% of the prototype's 14 basic-information fields, its 8-row weekly hours table and its memo field are present on the built screen, in the prototype's order, with the prototype's labels, marks, helper text and placeholders.
- **SC-003**: Every one of the six validation rules (four required fields, code uniqueness, JOYFIT sub-brand) blocks the save and names the offending field; no invalid store can be saved from this screen.
- **SC-004**: A Staff user attempting to change a head-office-only field is stopped 100% of the time, and can state why without leaving the screen (the reason is on the control itself).
- **SC-005**: No operator loses typed input by using キャンセル or the back link — every dirty exit is confirmed first, and choosing to stay preserves every entered value.
- **SC-006**: A failed save leaves the operator able to correct and retry without re-entering anything: 0 fields are cleared by a rejection.
- **SC-007**: The weekly hours saved here are the same values the detail screen shows, verified by saving on one screen and reading on the other.
- **SC-008**: Roles without rights never see an unusable form: both routes answer Manager / Trainer / Observer with the permission wall.
- **SC-009**: Every permission rule holds when the UI is bypassed: a write submitted directly by a role without the right, and a Staff write carrying a head-office-only field, are both refused — verified without going through the form.
- **SC-010**: Saving a change that does not touch the weekly hours leaves the stored weekly hours byte-for-byte unchanged — verified by changing the hours on the detail screen, then saving an unrelated field on this form, then re-reading the hours.

---

## Assumptions

- **The prototype governs the UI; the contract governs the data.** Where the prototype's rendered field set and the backend's field set disagree, the screen keeps the prototype's controls and the mock carries whatever the prototype needs. Where the prototype's _logic_ is thinner than a client-confirmed rule (the JOYFIT sub-brand requirement), the confirmed rule wins — the prototype is a UI mockup, not a behaviour spec.
- **Status stays two-valued (営業中 / 閉店)** across list, detail and form, as resolved in 026 Q1. The backend's four-value enum is narrowed by the mock the same way on all three screens.
- **The territory is required from day one**, per Y-02 FR-002 v5, even though no backend field exists yet. The mock carries it; a store seeded without one renders 未設定 on the list (026) and an empty picker here.
- **The eight weekly rows are a fixed shape** — seven weekdays plus 祝日 — matching both the prototype and the backend's `dayOfWeek` vocabulary. No screen adds or removes rows.
- **A newly registered store's status is chosen by the master, not this form.** The mock applies its own default, and no manual-transition UI exists anywhere in Phase 1 (the client asked for one on 2026-08-24; it is not this feature).
- **開店日 is the grand-open date**, and the two dates beside it are separate stored fields. Resolved 2026-09-03: the client's sign-off is built now, ahead of the prototype, so the mock's current single `opening_date` field is split into the contract's three.
- **Trimming applies to the two text-required fields only** (店舗コード, 店舗名), matching the prototype's `validate()`.
- **Uniqueness is checked both client-side and server-side.** The client-side check exists for immediate feedback; the server's conflict answer is the authority, because another operator can take the code between page load and save.

---

## Out of Scope for Phase 1

- **Y-02 FR-006 店舗マップ設定（ロッカー）** — a separate screen (`store-map-setup`); nothing in the map flow is part of this feature, and since `e5501a3` (2026-09-26) the store form no longer links to it — its entry point is the detail screen's 店舗マップ tab (027).
- **Manual status transitions** (`preparing`→`operating`, `operating`⇄`temporarily_closed`) — the client confirmed on 2026-08-24 that these need their own UI and must not be folded into the basic-information form. No such UI exists in the prototype yet.
- **The batch that flips a store to 閉店 once the closure date passes** (Y-02 FR-007) — a backend scheduled job. This form only stores the date.
- **The member bulk-transfer flow on closure** (Y-02 FR-007) — mobile-app driven plus a TAS-owned batch.
- **Change-history writing** — seed only, by user instruction. The history read surface belongs to 027.
- **Floor-map upload** — owned by the store-map-setup screen (`../store-map-setup/spec.md`), not this form. **Store photos are no longer out of scope**: on 2026-10-02 they got the dev-added 店舗写真 card (FR-055–FR-059f), reversing the 2026-09-03 removal for photos only. Photo captions and reordering remain out of scope (FR-059).
- **Store-page content fields** (店舗紹介文, アクセス情報, parking and switchboard information, social URLs) — the prototype's form has no inputs for them even though the store-page screen reads them and the backend can write them (`PUT /api/v1/admin/stores/{id}/details`, 14 fields). Resolved 2026-09-03: the prototype governs, so this form carries no inputs for them; the gap stays logged against the prototype owner (cluster tracking 2026-08-19, QA #208 — drafted then withdrawn). Consequence accepted: those fields stay empty until the prototype gains the inputs.
- **Holiday master management** — Y-02 FR-005's 祝日の自動取込み is a backend integration; the backend's five holiday endpoints have no prototype screen, and none is built in Phase 1 (cluster tracking, 2026-08-19).
- **Staff-resident hours (スタッフ常駐時間)** and the calendar exception days — owned by the detail screen's 営業設定 tab (027 FR-026–FR-029).
- **Bulk territory change** — owned by the store list (026).
- **テリトリー picker (FR-030–FR-034, FR-064, FR-112)** — Phase 2: Y-15 組織階層管理 is Phase 2 on the client's CRM Category board (clarified 2026-09-23). Round 3 of the integration plan (B1 / R301).
- **会計コード and メールアドレス** — the repo's current form has both; the prototype's form has neither. Removed by the same 2026-09-03 decision.
- **Latitude / longitude, reception flags, minor-entry window, companion window** — carried by the backend's store record but rendered by no control on this prototype form; not written here.

---

## Current Repository State — the delta this feature closed

The repo shipped a store form at `src/app/(private)/stores/_components/store-form.tsx` built against an **older prototype revision**, diverging from `store-form.tsx` @ `b223fef` in both directions. The delta below is what this feature closed on 2026-09-03; see "Implementation Notes" for what was built and removed.

**Was present in the prototype, missing from the repo form** — all now built: 店舗コード uniqueness check and its helper text · 店舗名（カナ）· サブブランド (and the JOYFIT dependency) · テリトリー picker + breadcrumb · FAX番号 · 開店日 · 閉店日 · 性別制限 · the eight-row weekly business-hours table with 定休日 checkboxes · 備考 · the required marks on the four required fields · the role lock and the restricted-Staff mode with its tooltips and footer line · the unsaved-changes dialog and the browser leave guard · the scroll-to-first-error behaviour with the footer summary line.

**Was present in the repo form, absent from the prototype** — all now removed: a store-status select · an is-FC boolean toggle · 会計コード · メールアドレス · a 店舗画像 card (store photos + floor map upload) · a ソーシャル card of seven URL fields (インドアビュー, Google Map, X, Instagram, LINE, Facebook, YouTube) · an エリア select holding a rough geographic area rather than the Y-15 hierarchy.

The prototype governs the rendered form, so **the whole second list is removed from this screen** — decided 2026-09-03. This is accepted with its cost: removing the 店舗画像 and ソーシャル cards strands data the store-page screen reads and the backend can write (`PUT /stores/{id}/details`), so those 14 fields have no write path anywhere in Phase 1. The gap stays logged against the prototype owner as the standing cluster item of 2026-08-19 (QA #208, drafted then withdrawn); it is not re-raised with the client.

The mock already carried most of what the form needs — `name_kana`, `fax`, `territory_id`, `closing_date`, `gender_restriction`, `memo` on `StoreSchema`, and the eight weekly rows in `StoreBusinessHours` — but `UpsertStorePayloadSchema` accepted none of them. Replacing that payload (plus splitting the opening date into three) was the main mock change.

---

## Implementation Notes — 2026-09-03

Built and verified against the running app. `npm run type-check` and `npm run lint` are clean; `src/lib/openapi.json` and the generated client were regenerated (with `prettier --write` in between, so a full regen is diff-clean).

### What was added

| Area                                                                                                       | File                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Form body — 14 basic-information fields, the 8-row weekly table, 備考, the restricted-Staff locks          | `src/app/(private)/stores/_components/store-form.tsx`                                     |
| Page chrome, permission wall, in-flow footer                                                               | `src/app/(private)/stores/_components/store-form-shell.tsx`                               |
| Form schema — required rules, the JOYFIT sub-brand rule, the weekly-hours rule, brand ⇄ two-select mapping | `src/app/(private)/stores/_schemas/store-form.schema.ts`                                  |
| Payload builders — create (one request), edit (partial + Staff subset + conditional hours)                 | `src/app/(private)/stores/_utils/store-form.util.ts`                                      |
| テリトリー option source + FC company options                                                              | `src/app/(private)/stores/_hooks/use-store-form-options.ts`                               |
| `TerritoryBreadcrumb`, `aria-invalid` on the picker                                                        | `src/app/(private)/stores/_components/territory-combobox.tsx`                             |
| Create / edit pages — role gating, dirty guard, cache invalidation, server-error routing                   | `src/app/(private)/stores/create/page.tsx`, `src/app/(private)/stores/[id]/edit/page.tsx` |

### What was removed (not in the prototype)

Per Q2's answer, the repo's older form lost: the store-status select, the is-FC boolean toggle, 会計コード, メールアドレス, the 店舗画像 card (store photos + floor map upload), the ソーシャル card (seven URL fields) and the rough エリア select. The columns behind them stay on the store row because the detail screen still reads them — they simply have no write path from this form any more.

### Mock API changes

- `StoreSchema` — the single `opening_date` is split into `receipt_date` / `preopen_date` / `grand_open_date` (FR-114). The detail screen's 基本情報 tab now renders all three rows.
- `UpsertStorePayloadSchema` → `CreateStorePayloadSchema` + `UpdateStorePayloadSchema`. The create payload requires `club_code`, `name`, `brand`, `territory_id` and carries `default_hours`; the edit payload is the same set, all optional. Neither carries `status`.
- `DefaultHoursEntrySchema` — `open_time` / `close_time` are now nullable, matching the BE design's "null when `isClosed`" (FR-043). The detail screen's weekly editor was patched for the nullable read.
- `POST /crm/stores` — System / Headquarter only (403 otherwise); duplicate `club_code` → 409; resolves `operating_company_name` from `fc_company_id`; derives the status from the closure date; stores the weekly set in the same call.
- `PATCH /crm/stores/{id}` — System / Headquarter get every field; Staff get exactly `name` / `address` / `phone` (narrowed from four on 2026-09-04, delta 4) and are refused **whole** with 403 for anything else, `name_kana` and `default_hours` included (FR-086, FR-088); own-code duplicate check excludes the store itself; the weekly replace runs only when `default_hours` is present (FR-045a).
- A Staff save therefore issues **two** requests when the weekly table changed: `PATCH /crm/stores/{id}/business-hours` first — which stays Staff-writable by the client's own answer — then the three-field store write. A failure on the first stops the save rather than half-applying it (FR-086).
- `ROLE_PERMISSIONS[Staff]` gained `Permission.StoresEdit`. The previous comment read only row L197 of Y-02's matrix (基本情報編集（全項目）: HQ only) and missed row L198 (基本情報編集（Staff限定項目）: ○ 所属店舗), so Staff were 403'd at the route before the form could apply its field-level rules.

### Verified against the running app

Driven through the browser as Headquarter, Staff and Manager, and through the API for the role matrix:

- **Create** — filled through the UI (JOYFIT sub-brand dependency, territory picker, weekly table with Wednesday as 定休日), saved in **one** request; the store and all 8 weekly rows landed, Wednesday with null times.
- **Validation** — an empty submit blocks the save, renders all four required messages, marks each control invalid, scrolls to 店舗コード and shows 未入力の項目があります. A submit with empty times names the offending days under the table.
- **Edit** — loads every field from the store (verified field by field in the DOM), saves, and the change is visible on re-read.
- **FR-045a** — changed the weekly hours, then saved a phone-only change from the form: the hours stayed as they were.
- **Discard guard** — キャンセル on a dirty form opens 変更を破棄しますか？; 編集を続ける keeps the typed value; a successful save navigates with no dialog.
- **Staff (restricted)** — re-verified 2026-09-04 after delta 4: the whole form renders, 名称 / 住所 / 電話番号 and every weekly control are editable, the other **13** fields are visibly disabled (店舗名（カナ）now among them), and the footer carries the 名称・住所・電話番号・営業時間のみ編集できます line. Saving a changed 電話番号 together with a changed Monday opening time sent `PATCH …/business-hours` (200) then `PATCH /crm/stores/{id}` (200), and both changes landed.
- **Role matrix (API)** — create: Manager 403, Staff 403, HQ 200. Edit: Manager 403, Staff on their own store 200, Staff on another store 403, Staff sending `territory_id` 403 with 「この項目の変更には本部権限が必要です: territory_id」. Duplicate code on edit 409, own code 200. A submitted `status` is ignored — the stored status follows the closure date. Re-run 2026-09-04 for delta 4: Staff sending `name_kana` 403 「…: name_kana」, Staff sending `default_hours` on the store write 403 「…: default_hours」, the three-field body 200, and the refused body left `name_kana` unchanged (no partial apply); HQ writing `name_kana` still 200.

### Divergences from the prototype, recorded deliberately

1. **受付開始日 / プレオープン日** — ~~two date fields the prototype does not have~~ built on the client's 2026-08-24 sign-off (Q3) ahead of the prototype. **Closed 2026-09-24**: the prototype added both at `a7d0c88` (2026-09-16); copy synced to it.
2. **Missing-hours / reversed-hours messages** — the prototype validates nothing about the weekly table; FR-044 requires both times on a half-entered day and the close after the open, so one message per rule names the offending days.
3. **Permission wall copy** — Manager / Trainer / Observer are stopped by the app-wide route guard, which renders the repo's own 403 page rather than the prototype's mode-specific sentence. The in-page wall (`StoreFormNoAccess`, with the prototype's copy) is what a Staff sees when deep-linking a store outside their scope.
4. **In-flow footer** — the footer sits at the end of the form column as the prototype has it (`store-form.tsx` L454), not fixed to the viewport as the repo's older form had it; fixed positioning ran the footer under the sidebar and clipped the guidance line.
5. **運営企業 picker** — V0 renders a plain `Select` over four hard-coded FC companies. The real master is paged and searched on the server (FR-017), so a plain select would hide every company past the first page; the field is built as a `SearchableSelect` with 直営 as its clear row, keeping V0's label, helper line, placeholder and 400px width. For a restricted Staff the master is closed entirely (Y-03 answers 403), so the disabled picker is fed the store's own resolved company instead of the master list.
6. **店舗コード — warning copy + change confirmation** (client-mandated, **not yet built**) — the prototype's 「登録後の変更不可」 line is a prohibition the client called wrong (QA #205 §1-④, recovered 2026-09-04). FR-012 renders a warning in its place and FR-061b adds a confirmation dialog when the code actually changed. Both strings are spec-proposed; QA to the prototype owner. The shipped form still renders the prototype line and has no dialog.
7. **ブランド / サブブランド locked after opening** (client-mandated, **not yet built**) — the client confirmed the contract's 「editable only while preparing」 rule (QA #205 §1-④); the prototype lets head office change the brand in any state. Blocked on the four-value status vocabulary before it can be applied at all (FR-015a).

### Open deltas after the 2026-09-04 correction

The three answers recovered on 2026-09-04 (Clarifications → Session 2026-09-04) postdate the 2026-09-03 build, so the shipped screen does not carry them yet. Each is a small, self-contained change:

| #     | Delta                                                                                                                                                                                                                                                                                                                        | Touches                                                                                | Requirement                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------ |
| 1     | Replace the 店舗コード helper line with the warning copy                                                                                                                                                                                                                                                                     | `store-form.tsx`                                                                       | FR-012                         |
| 2     | Confirm before saving a changed 店舗コード in edit mode                                                                                                                                                                                                                                                                      | `[id]/edit/page.tsx` (+ a dialog)                                                      | FR-061b                        |
| 3     | Lock ブランド / サブブランド once the store has opened — **ships with the four-value status vocabulary**, not before                                                                                                                                                                                                         | `store-form.tsx`, status vocabulary (026 Q1)                                           | FR-015a                        |
| ~~4~~ | ~~Narrow the Staff whitelist to `name` / `address` / `phone`~~ — **done 2026-09-04**: 店舗名（カナ）is locked in the form and left out of the Staff payload, the mock's server-side subset is the three fields, and a Staff weekly-hours change now travels to `PATCH …/business-hours` instead of riding on the store write | `store-form.tsx`, `store-form.util.ts`, `[id]/edit/page.tsx`, `PATCH /crm/stores/{id}` | FR-083, FR-084, FR-086, FR-088 |

Deltas 1-3 remain open. Delta 4 changed behaviour the "Verified against the running app" run recorded (a Staff editing カナ, and the mock accepting it); both affected lines above were re-verified against the running app on 2026-09-04.

A second defect came out of the MR review on 2026-09-16: the edit payload sent 都道府県 / 郵便番号 / 住所 / 電話番号 as `undefined` when the operator emptied them, and `undefined` drops out of the JSON body entirely — so the field read as「未指定」and the stored value survived the save. All four are optional fields the operator may legitimately clear, so they now travel as an explicit null, matching `UpdateStoreDto`'s `nullable: true` (FR-070b). Verified against the running app: `PATCH /crm/stores/store-001` with `{"address": null, "phone": null}` cleared both, and a body that omits them still leaves them untouched.

One defect surfaced while building delta 4 and was fixed with it: the form's weekly payload carried only `open_time` / `close_time` / `is_closed`, so any save of the hours **erased the staff-resident window** (`staff_start_time` / `staff_end_time`) the detail screen owns (027 FR-029a). The payload now carries each day's stored window back unchanged. It mattered more after delta 4, because a Staff weekly save reaches the endpoint instead of being refused.

## Traceability Matrix

| #   | UI element (`store-form.tsx` @ `b223fef`)                                                          | Lines                                     | Requirement source                                                                                         | Spec FR                        |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | `mode` prop → `pageTitle` 店舗新規登録 / 店舗編集                                                  | L135-136                                  | Y-02 FR-002「登録・編集」                                                                                  | FR-001, FR-002                 |
| 2   | `BackLink` 店舗管理に戻る (guarded)                                                                | L243-245                                  | Y-02 FR-001 → form navigation                                                                              | FR-003, FR-101                 |
| 3   | `Card`s 基本情報 / 備考 (+ dev-added 店舗写真 between them, no V0 source — FR-055)                 | L253, L436                                | Y-02 FR-002 登録・編集項目 (Y-02-01 基本情報)                                                              | FR-004                         |
| 4   | `FormField` helper — label + marks + description + error                                           | L60-88                                    | Prototype form convention                                                                                  | FR-011, FR-012, FR-066         |
| 5   | `RequiredMark` / `OptionalMark`                                                                    | field-marker.tsx                          | Prototype form convention                                                                                  | FR-011                         |
| 6   | 店舗コード `Input` (prototype's prohibition line replaced by a warning — see FR-012)               | L259-268                                  | Y-02 FR-002 L127「店舗コード（業務用コード・必須・ユニーク）」+ 前提条件「変更は影響範囲が大きいため注意」 | FR-010–FR-013, FR-061, FR-061a |
| 6a  | 店舗コード change confirmation dialog — **no V0 source**                                           | —                                         | Client sign-off 2026-08-24 (QA #205 §1-④), recovered 2026-09-04                                            | FR-061b                        |
| 7   | 店舗名 `Input`                                                                                     | L269-276                                  | Y-02 FR-002 L127「店舗名（必須）」                                                                         | FR-010, FR-062                 |
| 8   | 店舗名（カナ）`Input` (HQ only from 2026-09-04)                                                    | L277-280                                  | Y-02 FR-002 L127「店舗名（カナ）」+ client whitelist of 2026-08-24 (QA #205 §1-④)                          | FR-010, FR-084                 |
| 9   | ブランド `Select` (JOYFIT / FIT365)                                                                | L282-292                                  | Y-02 FR-002 L127「ブランド（必須）」+ contract 「editable only while preparing」 (QA #205 §1-④)            | FR-014, FR-015a, FR-063        |
| 10  | サブブランド `Select`, disabled unless JOYFIT                                                      | L293-306                                  | Y-02 FR-002 L127「サブブランド（JOYFITの場合: …）」                                                        | FR-015, FR-015a, FR-065        |
| 11  | `TerritoryCombobox` + `TerritoryBreadcrumb`                                                        | L310-321                                  | Y-02 FR-002 L131「テリトリー（Y-15…必須）」/ L132「保存対象は territoryId のみ」                           | FR-030–FR-035, FR-064          |
| 12  | 運営企業（FC企業）picker — V0 `Select` over `FC_COMPANIES`, built server-paged (§divergence 5)     | L50-55, L322-333                          | Y-02 FR-002 L127「運営企業（Y-03 FC企業マスタから選択）」                                                  | FR-017                         |
| 13  | 都道府県 `Select` over `PREFECTURES`                                                               | L335-346                                  | Y-02 FR-002 L127「都道府県」                                                                               | FR-016                         |
| 14  | 郵便番号 `Input`                                                                                   | L347-349                                  | Y-02 FR-002 L127 住所群                                                                                    | FR-010, FR-013                 |
| 15  | 住所 `Input` (always editable)                                                                     | L351-354                                  | Y-02 権限マトリクス L205「店舗基本情報（名称・住所・電話番号）」                                           | FR-010, FR-083                 |
| 16  | 電話番号 `Input` (always editable)                                                                 | L356-359                                  | Same                                                                                                       | FR-010, FR-083                 |
| 17  | FAX番号 `Input` (HQ only)                                                                          | L360-362                                  | Y-02 FR-002 L127「FAX番号」                                                                                | FR-010, FR-084                 |
| 18  | 開店日 `DatePicker`                                                                                | L365-372                                  | Y-02 FR-002 L127「開店日」                                                                                 | FR-019                         |
| 19  | 閉店日 `DatePicker` + status-derivation description                                                | L373-380                                  | Y-02 FR-002 L127「閉店日（任意）」+ FR-007 L167                                                            | FR-019, FR-020                 |
| 19a | 受付開始日 / プレオープン日 `DatePicker`                                                           | store-form.tsx L415-432 (`a7d0c88`)       | Client sign-off 2026-08-24 (QA #202) + contract `receiptDate` / `preopenDate`                              | FR-019, FR-019a, FR-114        |
| 20  | 8-row weekly hours table (時刻 × 2 + 定休日)                                                       | L123-132, L384-417                        | Y-02 FR-002 L127「営業時間（曜日別デフォルト設定）」+ FR-005 L154「通常営業日」                            | FR-040–FR-047                  |
| 20a | Weekly table held as tracked state; replace only when changed                                      | diverges from L392, L401 (uncontrolled)   | Contract has full replace only, no partial update                                                          | FR-045a, FR-045b, FR-070a      |
| 21  | 性別制限 `Select` (混合 / 女性専用)                                                                | L418-428                                  | Y-02 FR-002 L127「性別制限（混合/女性専用）」                                                              | FR-018                         |
| 22  | No status select — comment records the 2026/04/29 removal                                          | L429-430                                  | Y-02 FR-007 L167「閉店日を過ぎると…自動的に「閉店」」                                                      | FR-020, FR-071                 |
| 23  | 備考 `Input`                                                                                       | L442-449                                  | Y-02 FR-002 L127「備考」                                                                                   | FR-050                         |
| 24  | `EXISTING_STORE_CODES` duplicate check                                                             | L118, L171-176                            | Y-02 FR-002 L127「ユニーク」                                                                               | FR-061                         |
| 25  | `validate()` — 4 required rules                                                                    | L169-182                                  | Y-02 FR-002 必須項目                                                                                       | FR-061–FR-064                  |
| 26  | `handleSubmit` — block, mark, scroll to first invalid                                              | L184-200                                  | Prototype form convention                                                                                  | FR-060, FR-066, FR-067         |
| 27  | Inline error clearing on change                                                                    | L264, L273, L283, L315                    | Prototype form convention                                                                                  | FR-068                         |
| 28  | Success toast + navigate to store list                                                             | L198-199                                  | Y-02 FR-002 登録・編集完了                                                                                 | FR-069                         |
| 29  | Footer 未入力の項目があります                                                                      | L455-456                                  | Prototype form convention                                                                                  | FR-067                         |
| 30  | Footer キャンセル / 登録する・保存する                                                             | L460-461                                  | Y-02 FR-002                                                                                                | FR-005                         |
| 31  | `canAccessForm` gate + アクセス権限がありません wall                                               | L146, L206-233                            | Y-02 権限マトリクス L196-198「店舗登録: System/HQ のみ」                                                   | FR-080–FR-082, FR-087          |
| 31a | API-layer refusal mirroring the same rules — **no V0 source**                                      | —                                         | Y-02 権限マトリクス + contract 「system/headquarter only」 (403 E-AUTH-103)                                | FR-088, FR-089                 |
| 32  | `restrictedToStaff` + `lockedTooltip` on 12 fields (13 from 2026-09-04 — カナ joins them)          | L148-149, L259-449                        | Y-02 権限マトリクス L205「Staff編集可能な限定項目」 + client whitelist (QA #205 §1-④)                      | FR-083, FR-084, FR-086         |
| 33  | Footer Staff guidance line                                                                         | L457-458                                  | Same                                                                                                       | FR-085                         |
| 34  | `useUnsavedChanges` — dirty, confirmDiscard, beforeunload                                          | L167, L202, use-unsaved-changes.ts L33-51 | Prototype form convention                                                                                  | FR-100, FR-101, FR-103         |
| 35  | 変更を破棄しますか？ `AlertDialog`                                                                 | L468-481                                  | Prototype form convention                                                                                  | FR-102                         |
| 36  | `setDirty(false)` before navigating on success                                                     | L197                                      | Prototype form convention                                                                                  | FR-104                         |
| 37  | `screens.ts` — states 新規登録 / 編集, linksTo store-list (store-map-setup link removed `e5501a3`) | screens.ts L1307-1318                     | Y-02 FR-002 + FR-006 (separate screen)                                                                     | FR-001, Out of Scope           |

---

## Appendix A — Backend API Design Reference (basis for the project mock)

Verified against the dev Swagger (`/docs-json`) on **2026-09-03**. The project mock mirrors these shapes so the later swap to the real client is mechanical.

### A.1 Register a store — `POST /api/v1/admin/stores` (API-083 §5)

`CreateStoreDto` — required: `brandEnum` (`Joyfit` | `Joyfit24` | `JoyfitYoga` | `JoyfitPlus` | `Fit365`), `name` (≤255), `clubCode` (≤50, unique). Optional: `nameKana`, `status` (default `preparing`), `prefecture`, `postalCode`, `area`, `address`, `phone`, `fax`, `email`, `latitude`, `longitude`, `accountCode`, `genderRestriction` (`mixed` | `women_only`), `receiptDate`, `preopenDate`, `grandOpenDate`, six reception/feature booleans, `isTransferBlocked`, `fcCompanyId`, `minorEntryAllowedStart`, `minorEntryAllowedEnd`, `companionWindowMinutes`, `memo` (≤1000). `code` (`S-###`) is auto-numbered and `brandGroup` is derived. Writes a `create` history row in the same transaction. Roles: **system / headquarter only**. Answers: 400 E-VAL-001, 401, 403, 404 E-FC-002 (unknown `fcCompanyId`), 409 E-STR-002 (duplicate `clubCode`).

### A.2 Read a store — `GET /api/v1/admin/stores/{id}` (API-083 §4)

`StoreDetailDto` — 39 fields, the create body's fields plus `id`, `code`, `brandGroup`, `closedAt`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`. 404 E-STR-001 when the store does not exist.

### A.3 Edit a store — `PATCH /api/v1/admin/stores/{id}` (API-083 §6)

`UpdateStoreDto` — the create body's fields, all optional, **plus `closedAt`** (described as FR-007). `status` transitions are constrained by BR-STR-026 (else 422 E-STR-006); `brandEnum` is editable only while the store is `preparing`; changing `fcCompanyId` writes history on both companies (§13.4). Roles: **system / headquarter only**. Answers: 400, 401, 403, 404, 409 E-STR-002, 422 E-STR-006.

### A.4 Weekly business hours — `GET` / `PUT /api/v1/admin/stores/{id}/business-hours` (API-083 §7-8)

`BusinessHourDto` — `dayOfWeek` (`monday`…`sunday` | `holiday`), `openTime` (HH:mm, null when closed), `closeTime` (HH:mm, null when closed; an overnight close is expressed as `26:00`), `isClosed`. `PUT` is a **full replace of the ≤8 rows**; `isClosed: false` requires both times (else 422 E-STR-003). Writes a `business_hours_update` history row. Roles: **system / headquarter / staff (own store)**.

### A.5 Gaps the mock fills

| Gap                                                                                                                                  | Why                                                                                                                                                                                                                                                                                                                                                 | Mock behaviour                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `territoryId` absent from `CreateStoreDto` and `UpdateStoreDto`; no Y-15 endpoints at all                                            | `territory` still matches 0 times in `/docs-json` (2026-09-03). Y-15 dates from 2026-07-30, the backend has not caught up. Standing BE task since 2026-08-19 — not a client question.                                                                                                                                                               | The store row carries `territory_id`, the create/update payload accepts it, and the area→territory tree is served by the organisation endpoint 026 already added.                                                                                                                                                                                                                                                         |
| `closedAt` accepted on edit but not on create                                                                                        | Client signed off on 2026-08-24 (QA #202 line 1) that the create body must accept it; the backend still only has it on `UpdateStoreDto` (re-verified 2026-09-03).                                                                                                                                                                                   | The mock's create payload accepts the closure date.                                                                                                                                                                                                                                                                                                                                                                       |
| No weekly-hours field in `CreateStoreDto`                                                                                            | Client signed off on 2026-08-24 (QA #202 line 3) that registration must be one request; the backend has no such field (re-verified 2026-09-03).                                                                                                                                                                                                     | The mock's create payload accepts the eight weekly rows alongside the store.                                                                                                                                                                                                                                                                                                                                              |
| `genderRestriction` written as `mixed` \| `women_only` but read back as `none` \| `male_only` \| `female_only`                       | A documentation bug in the backend design — write one vocabulary, read another. Deliberately **not** raised with the client: there is nothing for them to answer.                                                                                                                                                                                   | The mock uses one vocabulary end to end — `mixed` / `women_only` — matching the requirement and the prototype's 混合 / 女性専用.                                                                                                                                                                                                                                                                                          |
| Brand held as one flat five-value enum, rendered as two selects                                                                      | `brandEnum` has no bare `JOYFIT`; the prototype splits brand and sub-brand for usability.                                                                                                                                                                                                                                                           | The form's two selects resolve to the single stored brand value (FIT365 → `fit365`; JOYFIT + sub-brand → `joyfit` / `joyfit24` / `joyfit_yoga` / `joyfit_plus`), and the stored value is split back into two selects on load.                                                                                                                                                                                             |
| `status` carries `default: preparing` on **both** DTOs                                                                               | Client called the `UpdateStoreDto` default a backend bug on 2026-08-24 (QA #205); still present on 2026-09-03.                                                                                                                                                                                                                                      | Neither request sends a status; the mock treats an omitted status as "leave unchanged" on edit and applies the master's own default on create.                                                                                                                                                                                                                                                                            |
| Four-value status enum vs. the two the screens render                                                                                | Resolved in 026 Q1 — the prototype wins until it moves.                                                                                                                                                                                                                                                                                             | The mock exposes 営業中 / 閉店 only, identically on list, detail and form.                                                                                                                                                                                                                                                                                                                                                |
| One 開店日 on the form vs. three date fields on the contract                                                                         | The prototype has one input; the client signed off on three on 2026-08-24. Resolved 2026-09-03: build three.                                                                                                                                                                                                                                        | The mock carries `receiptDate`, `preopenDate` and `grandOpenDate` as three separate fields; the existing single `opening_date` is split. The backend already has all three on both write DTOs and now reads them back too (QA #202 verification), so nothing is missing on this point.                                                                                                                                    |
| The backend describes `receiptDate` as "Handover/receipt date" while the client described it as the date enrollment reception starts | Two different business meanings for one field. The client's answer of 2026-08-24 governs the label.                                                                                                                                                                                                                                                 | The mock treats it as the enrollment-reception start date; the BE description discrepancy is logged for the backend, not raised with the client — they have already answered.                                                                                                                                                                                                                                             |
| Nullable create/edit fields declared as `type: object`                                                                               | Generates `unknown` in a typed client. Standing BE task since 2026-08-19.                                                                                                                                                                                                                                                                           | The mock declares each nullable field with its real type.                                                                                                                                                                                                                                                                                                                                                                 |
| Staff blocked from `PATCH` (system / headquarter only) while Y-02's matrix and the prototype both grant Staff a limited set          | QA #205 question 1 — **answered 2026-08-24**, recovered 2026-09-04: Staff may `PATCH` their own store with a whitelist of exactly `name` / `address` / `phone`; any other field refuses the whole request with 403. The endpoint description still reads `system/headquarter only` (re-verified 2026-09-04), so opening it is a BE task; no new QA. | The mock lets Staff write their own store's subset and **enforces it server-side** (2026-09-03), so a field outside the subset is refused rather than accepted. The subset is the client's three — `name` / `address` / `phone` — since 2026-09-04 (delta 4); 店舗名（カナ）and the weekly set are both refused on this endpoint, the weekly set being written through `PATCH …/business-hours` instead (FR-083, FR-086). |
| `brandEnum` editable only while `preparing`                                                                                          | QA #205 question 2 — **answered 2026-08-24**, recovered 2026-09-04: the rule is intended; a brand change after opening is handled by registering a new store. The contract already matches, so there is no BE task — the work is prototype + FE (FR-015a).                                                                                          | The mock follows the prototype, which lets head office change the brand in edit mode. It cannot enforce the rule either way yet: the mock's status vocabulary has no `preparing` (026 Q1), which is why FR-015a ships with the four-value adoption.                                                                                                                                                                       |

---

## Q&A / Clarification Needed

All three items were resolved on 2026-09-03 by `/speckit-clarify`; the option tables are kept with the chosen row marked, so the reasoning stays visible at planning time. Each was a real fork where guessing would have produced the wrong screen. The body above carries the resolved answers directly; no `[NEED CLARIFICATION]` markers remain.

### Q1 — Is 店舗コード editable after registration? ✅ **RESOLVED — yes for System / Headquarter; superseded 2026-09-04 by the client's own answer: option C, warning + confirmation dialog**

**Context**: The field's own helper text says 業務用コード。他機能から参照されるため登録後の変更不可 (`store-form.tsx` L259), yet the input is disabled only for restricted Staff — head office can type in it in edit mode (L266). The contract sides with "editable": `UpdateStoreDto` accepts `clubCode` and answers 409 E-STR-002 on a duplicate. The prototype therefore contradicts itself. Y-02's own 前提条件 sides with "editable" too: 「登録後の変更は影響範囲が大きいため注意」 — a warning, not a prohibition.

**Asked**: QA #205 question 3 (2026-08-19). **Answered by the client on 2026-08-24** in section §1-④ of their original reply, recovered 2026-09-04 — the Notion `Quick Answer` carried only a fragment about `status`, which is why the 2026-09-03 draft recorded this as open. The client's answer: the code **is** editable with head-office rights, Staff cannot touch it, and the prototype's 「登録後の変更不可」 line is **wrong** — replace it with a warning plus a confirmation dialog. That is **option C below**, so the chosen row moves from B to C and the earlier reasoning is kept for the record. No new QA.

| Option                                                          | Answer                                                                                                                           | Implications                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A                                                               | Lock the field in edit mode for every role (helper text wins)                                                                    | The helper text becomes true. Correcting a mistyped code needs a data fix outside the CRM. Matches the "外部キー、登録後の変更は影響範囲が大きい" warning in Y-02's 前提条件.                                                                                                                                       |
| B ~~chosen 2026-09-03~~                                         | Keep it editable for System / Headquarter, rendering the prototype's helper copy unchanged                                       | Matches the contract, which accepts and validates the field. A code change silently invalidates any external system keyed on the old value. The helper line overstates the rule, but rewording a prototype string on this screen alone looked like the larger divergence — until the client called that line wrong. |
| **C ✅ chosen** (client answer 2026-08-24, recorded 2026-09-04) | Keep it editable, replace the prohibition copy with a warning, and require an explicit confirmation naming the downstream impact | Costs a dialog the prototype does not have and a copy change the prototype has not made — both now client-mandated. Recovers the safety the old helper line only promised, without freezing the field. FR-012, FR-061a, FR-061b.                                                                                    |

### Q2 — What happens to the store-page content the current repo form holds and the prototype form does not? ✅ **RESOLVED 2026-09-03 — remove them, follow the prototype** · **photos re-added 2026-10-02**

> **2026-10-02 update**: the store-photo half of this decision is superseded. Photos get a dev-added 店舗写真 card (team lead's instruction; BE's full-set `PUT /images`, §19.2), see Session 2026-10-02 — 店舗写真 and FR-055–FR-059f. The floor map moves to store-map-setup. ソーシャル, 会計コード and メールアドレス stay removed.

**Context**: The repo's form ships a 店舗画像 card (store photos, floor map) and a ソーシャル card (seven URL fields), plus 会計コード and メールアドレス. The prototype form @ `b223fef` has none of them. The prototype governs the UI, so the spec above places them Out of Scope — but the 店舗ページ管理 screen displays 店舗紹介文 and アクセス情報 with the note that they come from 店舗管理, and `PUT /api/v1/admin/stores/{id}/details` can write 14 such fields. With no input anywhere, those fields stay empty forever. That is precisely the cluster tracking item of 2026-08-19 (QA #208, drafted then withdrawn).

| Option          | Answer                                                                                                 | Implications                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A ✅ chosen** | Follow the prototype: remove both cards from this form and log the gap for the prototype owner         | Cleanest parity with the mockup. Store-page content and images are unreachable in Phase 1 until the prototype adds inputs — a visible regression against the current repo screen. |
| B               | Keep the two cards on this form as an addition to the prototype                                        | Nothing regresses and the store-page screen keeps its data source. The built screen then diverges from the mockup, which the parity checklist will flag every run.                |
| C               | Move those fields to the detail screen (027), which already renders photos and the floor map read-only | Keeps them reachable without diverging from _this_ mockup, but invents an editing surface no mockup has, and 027 is already specified without it.                                 |

### Q3 — One 開店日 or three opening dates? ✅ **RESOLVED 2026-09-03 — three, per the client's sign-off**

**Context**: The prototype has a single 開店日 date picker (L365-372). The contract has three — `receiptDate`, `preopenDate`, `grandOpenDate` — and the client signed off on 2026-08-24 (QA #202) that the form should split them: 開店日 = `grandOpenDate` plus two optional fields. The prototype had not been updated at the time (re-verified 2026-09-03 at `b223fef`), and the project mock modelled one `opening_date`. **Update 2026-09-24**: the prototype added both fields at `a7d0c88` (2026-09-16), matching option B.

| Option          | Answer                                                                                                    | Implications                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A               | Build the single 開店日 now, mapped to the grand-open date; revisit when the prototype adds the other two | Ships to the mockup as it stands. The two extra dates stay unwritable, so any downstream use of them is blocked.                        |
| **B ✅ chosen** | Build all three now per the client's sign-off, ahead of the prototype                                     | Honours the client's answer and completes the contract, but puts two controls on screen that the parity checklist has no V0 source for. |
| C               | Build the single field and add the other two behind the detail screen's basic-information edit flow       | Splits one concern across two screens; no mockup supports it.                                                                           |

### Q4 — How is the 祝日 row's 「曜日どおり」 stored? ✅ **CLOSED 2026-10-07 — follow the BE contract**

Resolution (user, 2026-10-07): an omitted `holiday` row is 曜日どおり (research R3). The original question is kept below.

**Context**: prototype `3a6c29b` (2026-09-30) turns the 祝日 row into a three-way select 曜日どおり / 営業 / 休業 (FR-041a), following Y-02 v6 「上書き設定をしていない祝日は曜日設定に従う」. The business-hours contract (`StoreBusinessHourDto`, `PUT /stores/{id}/business-hours`) holds the 祝日 row as an ordinary day with `openTime` / `closeTime` / `isClosed`, so it can express 営業 and 休業 but **not** 「no override」.

| Option          | Answer                                                                              | Implications                                                                                      |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **A (default)** | 曜日どおり = the 祝日 row is omitted from the replace set (7 rows sent)             | No new field; BE must accept a 7-row set and treat a missing holiday row as "follow the weekday". |
| B               | Add an explicit holiday mode (`follow_weekday` / `open` / `closed`) to the 祝日 row | Clearest contract; BE schema change.                                                              |
| C               | Keep the eight-row shape; the mock stores the mode until BE decides                 | Ships the UI now; the real-API mapping stays open.                                                |

Until BE answers, the project mock implements **C** with the semantics of FR-041a, so the screen matches the prototype. This is a BE question, not a client one: the client's rule (v6) is unambiguous.

### Informational — recorded, not blocking

- **`territoryId` and the whole Y-15 endpoint set are missing from the backend.** Standing BE task since 2026-08-19; the mock supplies both. No client question (Y-15 post-dates the backend's work).
- **Staff are blocked from the store `PATCH` by the backend** while Y-02's matrix, the prototype and the client all grant them a limited set. QA #205 question 1 — answered 2026-08-24 with a three-field whitelist (`name` / `address` / `phone`); the endpoint still read `system/headquarter only` on 2026-09-04, so opening it is a standing BE task. The mock allows the write and its subset was narrowed to those three on 2026-09-04 (FR-083, FR-086).
- **`brandEnum` editable only while `preparing`.** QA #205 question 2 — answered 2026-08-24: the rule is intended, and the screen must lock the two brand selects once the store has opened (FR-015a). Nothing for the backend; blocked on the four-value status vocabulary before it can be applied.
- **`genderRestriction` writes one vocabulary and reads another.** A backend documentation bug — no QA, nothing for the client to answer.
- **`status` carries `default: preparing` on `UpdateStoreDto`.** The client called it a backend bug on 2026-08-24; still present. Neither request sends a status.
- **`closedAt` and the weekly hours are missing from the create body.** Client-approved additions of 2026-08-24, not yet on dev. The mock accepts both.
- **Manual status transitions live on the detail screen, not here.** The client asked for one on 2026-08-24 (§4-1); the prototype added it at `a7d0c88` (2026-09-16) as a separate HQ/System-only ステータス変更 action on the store detail (027), not on this form. This form still has no status control (FR-020).
- **閉店日 earlier than 開店日 is not checked** by the prototype or the contract. Stored as entered.
- **Nullable create/edit fields are declared `type: object`** in the backend design, generating `unknown` in a typed client. Standing BE task since 2026-08-19.
