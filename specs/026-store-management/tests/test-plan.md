# Test Plan: Store Management (Y-02, real API)

**Spec**: [store-list/spec.md](../store-list/spec.md) · [store-form/spec.md](../store-form/spec.md) · [store-detail/spec.md](../store-detail/spec.md) · [store-map-setup/spec.md](../store-map-setup/spec.md)
**PO Spec**: `Y-02` 店舗管理（マスタ）. Requirement doc `crm/requirements/Y-02.md` @ `4655aea` (260928_v6).
**Created**: 2026-10-05
**Integration round**: Round 2 is complete for every screen in scope (see [integration-plan.md](../integration-plan.md), the "Round 2 status after the 2026-10-05 regen" section). Every screen calls `src/lib/api-real`; no screen reads the mock API.

- Still open: **B13** (weekly hours on the edit form), part of **B8** (公開対象外), and **B3** (a typing defect with no visible effect).
- **B1** (エリア/テリトリー) is Phase 2 / Round 3. Its UI is commented out.
  **Consumed by**: `gen-testcases` (one TC doc per unit below) → `execute-testcases` (runs the units in the order given in **Suggested Order**)

> **The user's focus for this round: long text breaking the layout.** Section 6a (**Long-value matrix**) lists every field that can hold a long value and every place it renders. Each unit's TC doc must include **one explicit case per row** that belongs to that unit, prioritised **High** and run at **1024×768**. These cases are required, not optional extras inside a generic "long string" case.

---

## 1. Scope

**In scope.** All of these are Phase 1 and backed by the real API:

| Screen                                                                                                                                                              | Route                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 店舗一覧 (store list): search, 4 filters, sort, paging, URL state, role scoping                                                                                     | `/stores`                             |
| 店舗新規登録 / 店舗編集 (create / edit form): 基本情報, 営業時間, 店舗写真, 備考, permission wall, dirty guard                                                      | `/stores/create`, `/stores/[id]/edit` |
| 店舗詳細 (store detail): shell, plus 6 tabs (基本情報 / 営業設定 / 契約・料金 / 入退館設定 / 店舗マップ / 変更履歴), plus every Sheet / Dialog / Drawer inside them | `/stores/[id]`                        |
| 店舗マップ設定 (store map setup): floor image, locker placement                                                                                                     | `/stores/[id]/map`                    |
| 店舗マップ設定, entered with no store in the address (FR-004 / FR-005: header store, or the 全店舗 empty state)                                                     | `/stores/map`                         |

**Out of scope.** These are navigation targets, separate specs or Phase 2. No unit expands into them.

- **エリア / テリトリー (B1, Phase 2, Round 3).** This covers the list column, the cascade filter, territory-name keyword matching, row selection, the bulk bar, the 「テリトリー変更」 dialog, the form's テリトリー field and breadcrumb, and the 基本情報 テリトリー row. List FR-005, FR-014, FR-024–FR-036b; form FR-030–FR-034, FR-064, FR-112; detail FR-013. No cases are written for them. Only one regression check applies: the list ignores a stale `area_id` / `territory_id` in the URL and does not count it as a filter (list FR-017b).
- **機能制限 tab.** The prototype's `screens.ts` still lists it, but the spec does not (detail Q14). If such a tab appears, record it as a finding.
- **Mutual-use partner add/remove** (detail FR-076, withdrawn). Partners are listed read-only.
- **Masters authored elsewhere:**
  - plans and options (商材・施策, G-xx), campaigns (G-03), FC companies (Y-03), lockers (E-01);
  - store page CMS (I-01: 店舗紹介文, アクセス情報, SNS URLs);
  - holiday master;
  - closure batch and member transfer (TAS).
  - Only the store-side link or read is tested. Exception: the map-setup save must leave the I-01 CMS fields byte-identical (map SC-008).
- **Change-history writes.** History is read-only by design. Edits made by other units produce history rows, and those rows are read in unit 3.
- **Viewports below 1024px.**

---

## 2. Unit table

All TC docs are written under `specs/026-store-management/tests/cases/`.

| #   | Unit                                | Screen(s)                                                                                                       | Route                                                              | TC doc filename                                                                            |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 1   | Store list                          | 店舗一覧                                                                                                        | `/stores`                                                          | `TC -【Fitness CRM】- [Y-02-01][店舗一覧].md`                                              |
| 2   | Store form                          | 店舗新規登録 + 店舗編集 (same component), permission wall, code-change dialog, discard dialog                   | `/stores/create`, `/stores/[id]/edit`                              | `TC -【Fitness CRM】- [Y-02-02][店舗登録・編集].md`                                        |
| 3   | Detail: shell / 基本情報 / 変更履歴 | page shell, scope states, 基本情報 tab (一般情報, StatusCard, 店舗写真), ステータス変更 dialog, 変更履歴 tab    | `/stores/[id]`                                                     | `TC -【Fitness CRM】- [Y-02-03A][店舗詳細 基本情報・ステータス・変更履歴].md`              |
| 4   | Detail: 営業設定                    | 営業カレンダー, 営業時間設定 (read view), hours Sheet (2 modes), 特別営業日 / 臨時休業日 dialogs, delete dialog | `/stores/[id]` (営業設定 tab)                                      | `TC -【Fitness CRM】- [Y-02-03B][店舗詳細 営業設定].md`                                    |
| 5   | Detail: 契約・料金 (links)          | 主契約プラン, オプション, キャンペーン cards; 3 link Sheets; 3 unlink dialogs                                   | `/stores/[id]` (契約・料金 tab)                                    | `TC -【Fitness CRM】- [Y-02-03C][店舗詳細 契約・料金 プラン・オプション・キャンペーン].md` |
| 6   | Detail: 1DayPass                    | 1DayPass価格設定 card, pricing Drawer (calendar, inline panel), clear dialog                                    | `/stores/[id]` (契約・料金 tab)                                    | `TC -【Fitness CRM】- [Y-02-03D][店舗詳細 1DayPass価格設定].md`                            |
| 7   | Detail: 入退館設定                  | 相互利用設定 card, YOGA card, edit Sheet                                                                        | `/stores/[id]` (入退館設定 tab)                                    | `TC -【Fitness CRM】- [Y-02-03E][店舗詳細 入退館設定].md`                                  |
| 8   | Store map                           | 店舗マップ tab (read-only) + 店舗マップ設定 screen + entry with no store id                                     | `/stores/[id]` (店舗マップ tab), `/stores/[id]/map`, `/stores/map` | `TC -【Fitness CRM】- [Y-02-05][店舗マップ設定・店舗マップタブ].md`                        |

**Why the screens are split this way:**

- **Units 1–2.** The list and the form are one screen each. Create and edit share one component and one spec, so they form one unit.
- **Store detail (units 3–7).** It is one route, but the spec gives it about 110 FRs across 6 tabs, and the 契約・料金 tab alone holds 4 cards and 4 Sheets/Drawers. One TC doc would be unworkable (compare Y-03, where FC企業詳細 was split B1/B2). So the detail is split by tab. Each tab's Sheets and Dialogs exist only inside that tab, so they stay with it. 1DayPass is split out of 契約・料金 because its pricing calendar and inline panel are a self-contained flow with their own rules.
- **Unit 3.** 変更履歴 is a small, read-only tab and sits with the shell. Its role gating matches the shell's scope checks.
- **Unit 8.** The 店舗マップ tab only renders what the setup screen saves (FR-048 refresh, SC-003 same position), so the two are tested together.

---

## 3. Sources per unit

Prototype files are under `.cache/fitness-crm-ui/src/pages/`. Requirement doc: `.cache/fitness-spec/crm/requirements/Y-02.md` (v6). Its 権限マトリクス applies to every unit.

| Unit | Spec sections                                                                                                              | UI prototype                                                                                                                                                                       | FRs covered                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | `store-list/spec.md`: US1–US3, US5, Edge Cases, FR-001–FR-023a, FR-037–FR-039, Clarifications 2026-08-28 / 2026-10-02      | `store-list.tsx` (Phase 1 parts only; skip L554-590, L696-705, L846-977)                                                                                                           | L-FR-001–004, 006–013, 015–023a, 037–039                  |
| 2    | `store-form/spec.md`: all US, FR-001–FR-114 (skip FR-030–034, FR-064, FR-112), SC-001–SC-010, Appendix A (contract limits) | `store-form.tsx` (L150-607). There is **no prototype for 店舗写真**: use the spec copy, modelled on `store-page-form.tsx` L1023-1120                                               | F-FR-001–029, 040–071, 080–089, 100–104, 110–111, 113–114 |
| 3    | `store-detail/spec.md`: Page shell FR-001–006, 基本情報 FR-010–018, 変更履歴 FR-080–083, Permissions FR-090–091            | `store-detail.tsx` L926-1150 (shell, 基本情報), L133-232 + L2724-2732 (status dialog), L2687-2715 (history)                                                                        | D-FR-001–006, 010–012b, 014–016b, 018, 080–083, 090–091   |
| 4    | `store-detail/spec.md`: 営業設定 FR-020–029f; Clarifications on R3 / R5 precedence (Y-02 v6 FR-005)                        | `store-detail.tsx` L1151-1636                                                                                                                                                      | D-FR-020–029f                                             |
| 5    | `store-detail/spec.md`: 契約・料金 FR-030–047                                                                              | `store-detail.tsx` L1637-1925, Sheets L2002-2214                                                                                                                                   | D-FR-030–047                                              |
| 6    | `store-detail/spec.md`: 1DayPass FR-050–063                                                                                | `store-detail.tsx` L1930-2000, L2215-2420                                                                                                                                          | D-FR-050–063                                              |
| 7    | `store-detail/spec.md`: 入退館設定 FR-070–075                                                                              | `store-detail.tsx` L2422-2620                                                                                                                                                      | D-FR-070–075                                              |
| 8    | `store-map-setup/spec.md` (all); `store-detail/spec.md` 店舗マップ FR-110–114                                              | `store-map-setup.tsx` (821 lines); `components/store-floor-map.tsx`; `store-detail.tsx` L532-539, L2620-2689; entry points `locker-list.tsx` L524-528, `locker-form.tsx` L511/L604 | M-FR-001–085; D-FR-110–114                                |

FR prefixes: **L** = store-list, **F** = store-form, **D** = store-detail, **M** = store-map-setup. Each sub-spec numbers its own FRs from FR-001.

**Contract limits.** The prototype sets no `maxLength` anywhere. These limits come from `src/lib/openapi.real.json` request DTOs and are what the backend enforces. Cite them in Notes per the gen-testcases GUI checklist; they are not assumed defaults.

| Field                                        | DTO                                                  | Limit                                                                               |
| -------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 店舗名, 店舗名（カナ）                       | Create/UpdateStoreDto                                | `name`, `nameKana` maxLength 255                                                    |
| 店舗コード                                   | Create/UpdateStoreDto                                | `clubCode` maxLength 50                                                             |
| 郵便番号                                     | Create/UpdateStoreDto                                | `postalCode` maxLength 10                                                           |
| 住所                                         | Create/UpdateStoreDto                                | `address` maxLength 500                                                             |
| 電話番号, FAX                                | Create/UpdateStoreDto                                | `phone`, `fax` maxLength 20                                                         |
| 備考                                         | form spec Appendix A                                 | `memo` maxLength 1000                                                               |
| Photos                                       | ReplaceStoreImagesBodyDto / StoreImageReplaceItemDto | `items` maxItems 20; `caption` maxLength 255 (no UI)                                |
| Uploads                                      | CreatePresignDto                                     | `fileName` 1–255; `fileSize` ≤ 100MB. The UI caps lower: photos 10MB, floor map 5MB |
| 臨時休業日 理由                              | Create/UpdateBusinessExceptionDto                    | `reason` maxLength 1000                                                             |
| 1DayPass prices                              | SetOneDayPassPriceDto / SetOneDayPassExceptionDto    | `price` 700–1800                                                                    |
| 1DayPass 備考                                | SetOneDayPassExceptionDto                            | `note` maxLength 200                                                                |
| YOGA利用料金                                 | UpdateMutualUseDto                                   | `yogaUsageFee` minimum 0 (no maximum)                                               |
| Search keyword                               | list `GET /stores`                                   | `keyword` maxLength 100 (integration-plan endpoint map)                             |
| キャンペーン名 (read here, authored in G-03) | Create/UpdateCampaignDto                             | `name` maxLength 100                                                                |

---

## 4. Spec-vs-prototype deltas

`gen-testcases` must put a **Delta #n** note on every case these touch. "Spec" means the sub-spec, or the integration-plan decision where marked.

| #   | Item                                                                    | In spec                                                                                                         | In prototype                                     | How to test                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | List row scoping (L-FR-009)                                             | Manager sees managed stores; Staff/Trainer/Observer see their own store                                         | No scoping (`scopedStores = STORES`)             | Test against the spec. **Live-verify** that `GET /stores` is scoped for Staff/Manager (the integration plan has this as an open question). If every store comes back → NG (BE scope).                                                                                                     |
| 2   | List pagination footer when the result fits one page (L-FR-021)         | Hidden (project GUI checklist)                                                                                  | Always rendered                                  | Test against the spec                                                                                                                                                                                                                                                                     |
| 3   | 都道府県 filter options (L-FR-012)                                      | Only prefectures present in scope, north→south                                                                  | Derived from data                                | Accepted degradation: the real API offers **all 47** (integration-plan Q4). Write the case to the spec and record the result as `Block (K1)` (§7)                                                                                                                                         |
| 4   | 運営企業 filter options (L-FR-013)                                      | Active FC companies **with at least one store in scope**                                                        | Same rule                                        | No facet endpoint exists, so companies with no stores are still offered. Record as `Block (K2)`                                                                                                                                                                                           |
| 5   | Status vocabulary (L-FR-007, D-FR-015c)                                 | 4 values, with transitions 準備中→営業中, 営業中⇄休業中. 閉店 only through 閉店日 plus the batch                | 4 values                                         | Test every from/to pair against the spec. Server enforcement is open (detail Q7, BR-STR-026): if the server accepts a forbidden transition through the UI, record NG                                                                                                                      |
| 6   | Permission wall for Manager / Trainer / Observer on the form (F-FR-082) | In-page wall: title + back link + mode sentence                                                                 | In-page wall                                     | The implementation shows the **app-wide 403 page** for those roles; only other-store Staff get the in-page wall (form "Implementation divergence 3"). Write the case to the spec and grade OK-with-note if the 403 page is shown (project pattern: the direct-nav denial is what matters) |
| 7   | FIT365 サブブランド (F-FR-015)                                          | Field **not rendered** for FIT365 (US1 AS4 says "disabled and cleared"; FR-015 wins)                            | Not rendered                                     | Test against FR-015                                                                                                                                                                                                                                                                       |
| 8   | Staff footer line (F-FR-085)                                            | 店舗名・住所・電話番号・営業時間・店舗写真のみ編集できます。それ以外の項目は本部へ変更を依頼してください        | No 店舗写真                                      | Test against FR-085, verbatim                                                                                                                                                                                                                                                             |
| 9   | Fields locked for Staff (F-FR-084 vs F-FR-019a)                         | FR-084 does not list 受付開始日 / プレオープン日; FR-019a locks them                                            | Locked                                           | Expect them **locked** (FR-019a is newer and matches the prototype)                                                                                                                                                                                                                       |
| 10  | Required fields on the form                                             | 3 in Phase 1 (店舗コード, 店舗名, ブランド; plus サブブランド when JOYFIT). US1/SC-001 still say 4 (テリトリー) | Same                                             | Test 3 (+1)                                                                                                                                                                                                                                                                               |
| 11  | 店舗写真 card on the form (F-FR-055–059f, F-FR-070c)                    | Full spec                                                                                                       | **No prototype UI**                              | Spec-only. All copy comes from the spec                                                                                                                                                                                                                                                   |
| 12  | Weekly hours: an open day needs both times (F-FR-044, D-FR-029)         | Required                                                                                                        | No validation                                    | Spec-only                                                                                                                                                                                                                                                                                 |
| 13  | 特別営業日: close after open (D-FR-029b)                                | Required                                                                                                        | No validation                                    | Spec-only                                                                                                                                                                                                                                                                                 |
| 14  | Mutual-use period: end ≥ start (D-FR-075)                               | Required                                                                                                        | No validation                                    | Spec-only                                                                                                                                                                                                                                                                                 |
| 15  | 1DayPass 基準価格 (D-FR-050a)                                           | Display-only, no input                                                                                          | Display-only                                     | The implementation makes it **editable** in the Drawer (integration-plan Deviation 5). Write the case to FR-050a. If the price is editable, record NG-with-note. Its write is **permanent**: there is no delete for the default price (§9 data policy)                                    |
| 16  | 変更履歴 visibility (D-FR-083)                                          | System/HQ/Manager only; Staff/Trainer/Observer get not-permitted                                                | Visible to everyone                              | Test against the spec (it matches BE E-AUTH-103)                                                                                                                                                                                                                                          |
| 17  | 店舗マップ設定 editing (M-FR-060–063, D-FR-114)                         | Staff: own store only; Trainer/Observer: denied; Manager: read-only                                             | Staff any store; Trainer/Observer read-only view | Test against the spec                                                                                                                                                                                                                                                                     |
| 18  | Map leave guard (M-FR-052)                                              | Breadcrumb **plus** sidebar **plus** header store switch                                                        | Breadcrumb only                                  | Test against the spec                                                                                                                                                                                                                                                                     |
| 19  | Map 詳細 link (M-FR-034)                                                | Opens **that** locker's detail in a new tab                                                                     | Generic page, no id                              | Test against the spec                                                                                                                                                                                                                                                                     |
| 20  | Map loading / error / partial-failure / 409 (M-FR-007, 046, 047)        | Required                                                                                                        | Absent                                           | Spec-only                                                                                                                                                                                                                                                                                 |
| 21  | Floor image persistence (M-FR-083, D Q8)                                | Spec text says "UI-only, not wired"                                                                             | Blob URL                                         | **Stale.** The 2026-10-05 regen wired `gymMapUrl` and the `PUT …/details` save. Test persistence across reload **normally** (expect OK, not Block)                                                                                                                                        |
| 22  | Overnight close time (D-FR-025, F weekly table)                         | `26:00` notation allowed                                                                                        | `type=time` cannot hold 26:00                    | Test that a 26:00 close can be entered and displayed. If the input cannot accept it → NG-with-note citing this delta                                                                                                                                                                      |
| 23  | 備考 input type (F-FR-050)                                              | 1000 chars                                                                                                      | Single-line `<Input>`                            | Keep the single line. Test 1000 chars for layout and readability (Long-value matrix)                                                                                                                                                                                                      |
| 24  | Money format                                                            | `¥7,700` (app)                                                                                                  | `7,700円`                                        | Expect the app format. Deliberate; not a finding                                                                                                                                                                                                                                          |
| 25  | Brand-lock tooltip (F-FR-015a)                                          | Status-aware wording                                                                                            | Always 営業中… even for 休業中/閉店              | Record the actual copy per status; flag it if the copy is wrong for 休業中/閉店                                                                                                                                                                                                           |
| 26  | Detail 店舗写真 編集 button (D-FR-016a)                                 | Dev-added, gated like 編集                                                                                      | Static 4-slot placeholder                        | Spec-only                                                                                                                                                                                                                                                                                 |

---

## 5. Real-API facts every unit relies on

Taken from integration-plan §endpoint map, §decisions and §error codes. Not an oracle; these are what the cases must expect.

- **Error codes:**

  | Code                   | Meaning                                         | Unit                 |
  | ---------------------- | ----------------------------------------------- | -------------------- |
  | E-STR-001              | Store not found                                 | 3 (detail), 2 (edit) |
  | E-STR-002              | Duplicate 店舗コード, shown inline on the field | 2                    |
  | E-STR-003              | `short_hours` needs both times                  | 4, 2                 |
  | E-STR-004              | One exception per date (409)                    | 4                    |
  | E-STR-006              | Brand or status change refused (422)            | 2, 3                 |
  | E-STR-009              | 1DayPass outside ¥700–¥1,800 (422)              | 6                    |
  | E-STR-010              | Plan unknown or cross-brand                     | 5                    |
  | E-STR-011              | Unknown option                                  | 5                    |
  | E-STR-012              | Mutual use across brand groups                  | 7                    |
  | E-CMP-008              | Duplicate campaign link                         | 5                    |
  | E-CMP-010              | Campaign brand mismatch                         | 5                    |
  | E-FC-002               | Unknown FC company                              | 2                    |
  | E-MED-002              | Media type refused                              | 2, 8                 |
  | E-LOC-006 / 409        | Stale locker write                              | 8                    |
  | E-VAL-001              | Field validation                                | all                  |
  | E-AUTH-100 / 101 / 103 | Permission refused                              | all                  |

- **One failure = one toast.** A global `MutationCache` toasts every failed mutation, so two toasts for one failure is NG.
- **Multi-item writes run sequentially and stop at the first failure.** Items saved before the failure stay saved (Deviation 8). Cases on partial failure expect exactly that.
- **Status.** There is no status field on the form. A new store defaults to 準備中. Only System/HQ may change status, from the StatusCard.
- **Pending live check, High priority, unit 2:** after a form save of a store that is **not** 準備中, confirm the status did **not** reset to 準備中. `UpdateStoreDto` declares `status default: preparing`.
- **Pending live check, unit 7:** saving mutual use on a **FIT365** store (no 後払い / YOGA inputs) must not reset the stored `payLaterEnabled` / `yogaUsageFee`. A PUT that omits them resets them.
- **Brand edits.** Brand is editable only while 準備中 (D2).
- **Prefecture.** Displayed as 東京都, sent as the JIS code (D4).
- **Counts.** The header count and 全N件 come from `totalAllItems`; filtered counts come from `totalItems` (D5).
- **Paging and URL.** Page sizes 25/50/100, default 50 (D6). URL keys: `search`, `brand`, `prefecture`, `company`, `status`, `sort_by`, `sort_order`, plus page and size (D7).
- **Full replace.** Plans and options are saved as a full replace of 0–200 ids (D9).
- **Change-history labels.** Every action key has a label (D8). An unknown key shows the raw string. Rows with no field diff show the action label and `—` (B2).
- **R11.** `GET /admin/fc-companies` is HQ-only, so the 運営企業 filter cannot load for Manager/Staff. The user decided (2026-10-05) on no FE handling. Write the case to L-FR-013 and record **NG (BE)** with a note to report it to the backend. Do not record Block.

---

## 6. Coverage focus per unit

These items are **added to** the full gen-testcases coverage walk; they do not replace it. Every unit also gets:

- the role matrix (§9 credentials) with direct-URL denial;
- loading / error / retry states;
- 401 session expiry mid-action: expect a redirect to login and no silent failure;
- persistence after reload and after re-login;
- double-submit guards on every save and destructive button;
- HTML/`<script>` escaping in every free-text field that renders back;
- the floor case at 1024×768 and the wide case at ≥1440px;
- **the unit's rows of the Long-value matrix (§6a)**.

### 6a. Long-value matrix (user focus, all High, all at 1024×768)

Each row becomes **one explicit case per render location** in the listed unit. Use two variants:

- **(J)** the max length in **full-width Japanese** (e.g. 「ＪＯＹＦＩＴ２４新宿東口駅前」 repeated to the limit);
- **(T)** the same length as **one unbroken half-width token** (e.g. `W` × n, no spaces or break points).

Fields with an e-mail or URL shape also get a long realistic value.

For every case, assert:

- the strategy the screen uses (truncate+ellipsis with the full value on a tooltip / wrap / scroll in a container);
- **no overlap** with neighbouring elements;
- **no button pushed out of view or made unclickable**;
- **no page-level horizontal scroll**;
- **the full value is readable somewhere** (tooltip, wrap or detail view).

Where (J) passes and (T) fails, that is a separate finding.

The long values must be **created by the run** on fixture stores (§9 data policy). They do not exist in dev data.

| #     | Field (limit)                                                        | Where it renders                                                                                                                                                                                                                                                                        | Unit                              |
| ----- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| LV-01 | 店舗名 (255)                                                         | Form input while typing; form after a server error                                                                                                                                                                                                                                      | 2                                 |
| LV-02 | 店舗名 (255)                                                         | List 店舗名 cell; row height and alignment against neighbouring rows; sort header still clickable                                                                                                                                                                                       | 1                                 |
| LV-03 | 店舗名 (255)                                                         | Detail **title row** next to the status badge and the **編集** button (badge and button must stay visible and clickable); back link                                                                                                                                                     | 3                                 |
| LV-04 | 店舗名 (255)                                                         | ステータス変更 dialog read-only block; status toast 「{店舗名}のステータスを「{status}」に変更しました」                                                                                                                                                                                | 3                                 |
| LV-05 | 店舗名 (255)                                                         | Global header **store selector** trigger and dropdown option; signed-in chrome (sidebar/header) not pushed                                                                                                                                                                              | 1 (run once; it is shared chrome) |
| LV-06 | 店舗名 (255)                                                         | Map setup **breadcrumb** 店舗管理 › {店舗名} › 店舗マップ設定; MapPin store badge; the leave-guard links still reachable                                                                                                                                                                | 8                                 |
| LV-07 | 店舗名 (255)                                                         | 入退館設定 partner table 店舗名 column, when a long-name fixture is a same-brand partner. Partner add/remove has no UI, so if the fixture cannot be made a partner → Block (no fixture)                                                                                                 | 7                                 |
| LV-08 | 店舗名カナ (255)                                                     | Detail 一般情報 grid cell (2-column grid must not overflow into the other column)                                                                                                                                                                                                       | 3                                 |
| LV-09 | 店舗コード (50)                                                      | List 店舗コード cell (narrow column)                                                                                                                                                                                                                                                    | 1                                 |
| LV-10 | 店舗コード (50)                                                      | Edit form **code-change confirmation dialog**, which shows the **old and new** code (dialog width; buttons visible); live warning Alert under the field                                                                                                                                 | 2                                 |
| LV-11 | 住所 (500)                                                           | Detail 一般情報 grid cell; edit form input                                                                                                                                                                                                                                              | 3, 2                              |
| LV-12 | 電話番号 / FAX (20), 郵便番号 (10)                                   | Detail 一般情報 cells. These fields have **no format rule**, so also try 20 full-width characters and letters                                                                                                                                                                           | 3, 2                              |
| LV-13 | 備考 (1000)                                                          | Form **single-line** input (delta #23); detail 一般情報 full-width 備考 row                                                                                                                                                                                                             | 2, 3                              |
| LV-14 | 運営企業 name (longest available FC company; see §9)                 | List 運営企業 cell; list 運営企業 **filter option and select trigger**; filter banner condition text; form 運営企業 SearchableSelect; detail 一般情報                                                                                                                                   | 1, 2, 3                           |
| LV-15 | Search keyword (100)                                                 | List search box; **filter-result banner** 「全 {total} 件中 {count} 件を抽出中 …」 with the keyword plus 3 filter labels joined by ・; 条件をクリア still visible                                                                                                                       | 1                                 |
| LV-16 | Photo file name (255)                                                | Form photo error 「JPG・PNG 以外の形式のため登録できません（選んだファイル: {ファイル名}）」 under the card (J and T)                                                                                                                                                                   | 2                                 |
| LV-17 | Floor-map file name (255)                                            | Map setup type error 「PNG・JPG 以外の形式のため登録できません（選んだファイル: {file name}）」 under the image area                                                                                                                                                                    | 8                                 |
| LV-18 | 店舗写真 × 20 (maxItems)                                             | Form photo grid at 20 (counter 20枚 / 最大20枚, tile disabled); detail 店舗写真 gallery with 20 photos                                                                                                                                                                                  | 2, 3                              |
| LV-19 | 変更履歴 変更前 / 変更後 values                                      | Created by unit 2's long edits: 255-char name, 500-char address, 1000-char memo, with values before and after. History table cells (the prototype has no truncate); 変更者 column; many rows (≥100, the API `limit`; no pagination UI is specified, so record what happens)             | 3                                 |
| LV-20 | 臨時休業日 理由 (1000)                                               | 臨時休業日 list row; edit dialog input; toast description                                                                                                                                                                                                                               | 4                                 |
| LV-21 | Many 個別日設定 in one month (e.g. 10 特別営業日 + 10 臨時休業日)    | Calendar cells (label + tint, no overflow out of the cell); both lists' lengths                                                                                                                                                                                                         | 4                                 |
| LV-22 | 主契約プラン name / オプション name (longest in the brand's master)  | Plans/options tables; link Sheet rows (`break-jp`) with the meta line `{type} · {price} · {id}`; unlink dialog 「「{name}」の紐づけを解除します。…」                                                                                                                                    | 5                                 |
| LV-23 | Many linked plans / options / campaigns (≥30; plans/options cap 200) | Card tables (no pagination by design: check scroll); count badges `{N}件`; link Sheet multi-select with N selected (the confirm label shows the count)                                                                                                                                  | 5                                 |
| LV-24 | キャンペーン名 (100, from G-03)                                      | Campaign table name cell; 割引概要 column (composed text: plan + enrollment fee + option discounts); 募集期間; link Sheet row + block-reason label; attach toast 『{name}』を紐づけました; detach toast; unlink dialog                                                                  | 5                                 |
| LV-25 | 1DayPass 備考 (200)                                                  | Month table; inline panel pre-fill                                                                                                                                                                                                                                                      | 6                                 |
| LV-26 | Many selected dates in the 1DayPass calendar (e.g. a full month)     | Selected-dates summary (`line-clamp-1`: must truncate cleanly) plus 設定対象 {N}日; apply button still visible                                                                                                                                                                          | 6                                 |
| LV-27 | Max-digit amounts                                                    | 1DayPass `¥1,800`; YOGA利用料金 with a large value (no maximum: try 9 digits) in the card and the Sheet; plan/option prices in narrow columns                                                                                                                                           | 6, 7, 5                           |
| LV-28 | Locker name / location code (from E-01; longest available)           | Map placement hint 「{name} を置きました。…」 in the card header (**no truncate**, next to 画像を差し替え / delete: high risk); locker panel row (320px, with 未保存 + 詳細 on the selected row); 32px marker with a multi-character code; marker tooltip 「{symbol}　{name}・{shape}」 | 8                                 |
| LV-29 | Many lockers (>100 = API page limit; >10 placed at the centre)       | Panel scroll and sticky behaviour; selected row scrolls into view; 「{n}棟」 badge; marker overlap after 10 diagonal shifts; detail tab 配置済み {N}台 ・ 未配置 {M}台                                                                                                                  | 8                                 |
| LV-30 | Floor image extreme aspect ratios (very tall/narrow, very wide)      | Map setup canvas (`max-h` rule); detail 店舗マップ tab; markers stay on their relative spot                                                                                                                                                                                             | 8                                 |
| LV-31 | Longest badge / enum labels                                          | Brand badge `JOYFIT YOGA` in the narrow list column; status 準備中/休業中; campaign 上限到達; the brand-lock disabled tooltip                                                                                                                                                           | 1, 3, 5                           |

### Unit 1: Store list

- **Real-API behaviour:**
  - Search, filter, sort and paging are server-side, over the whole permitted set.
  - Header badge = `totalAllItems` (unfiltered), which must differ from the filtered banner count.
  - Paging totals are real.
  - A page index beyond the result set is clamped after filtering, including from a deep link (L-FR-023).
  - A loading state shows during each round trip, never an empty state.
  - A query failure is distinguishable from an empty result.
- **URL state:**
  - every key in D7 survives a reload, a shared link and back/forward;
  - garbage parameters degrade to the defaults (L-FR-017b);
  - a stale `area_id` / `territory_id` is ignored and not counted.
- **Role scoping:**
  - delta #1: the per-role row count must match the header count;
  - R11: the 運営企業 filter as Manager/Staff → NG (BE);
  - 新規登録 is disabled with 本部権限が必要です;
  - row 編集: enabled for Staff on **their own** row only; otherwise inert with the 本部 badge.
- **Filters:**
  - 4-value status filter order;
  - 直営 option;
  - active-filter badge count and per-control highlight;
  - banner text and 条件をクリア;
  - two distinct empty states (L-FR-018).
- **Sort:** 2 columns, 3-click behaviour, and the tooltip copy for the next direction.
- **Stress:** LV-02, 05, 09, 14, 15, 31. Also check the 6 columns at 1024px with every column holding a long value at once.

### Unit 2: Store form

- **Real-API behaviour:**
  - E-STR-002 duplicate, both on create and as a race on edit, shown inline;
  - E-STR-006 brand change while not 準備中;
  - E-FC-002;
  - over-limit values rejected by the server where the client lets them through (店舗名 256, 店舗コード 51, 住所 501, phone 21, memo 1001), confirming the client and server limits match with no silent truncation;
  - **the status-reset live check (§5)**;
  - explicit nulls clear stored values (F-FR-070b: 都道府県 / 郵便番号 / 住所 / 電話番号), checked after a reload;
  - partial failure across store / hours / photos (F-FR-070a, F-FR-070c);
  - create sends the hours in the same POST (B12 resolved);
  - 閉店日 is editable on create (B11).
- **Edit-mode weekly hours: B13.**
  - The table is read-only and points to the 営業設定 tab.
  - Cases expecting the table to be editable on edit → `Block (B13)`.
  - An edit that does not touch hours must leave the hours byte-identical (SC-010; check in unit 4).
- **Staff on own store:**
  - exactly 3 fields are editable, and the request writes only those 3;
  - every other field is disabled with この項目の変更には本部権限が必要です;
  - footer copy (delta #8);
  - another store's edit route shows the in-page wall;
  - the create route shows the wall.
- **Brand / sub-brand:** JOYFIT ⇄ FIT365 clears and hides the sub-brand; brand lock per status (4 statuses × tooltip, delta #25).
- **店舗コード:**
  - whitespace only;
  - live warning Alert;
  - confirmation dialog on a trimmed change;
  - キャンセル keeps the state.
- **Photos:**
  - 10MB / type / 21st photo (partial accept);
  - a 20-file pick uploads all 20 with at most 5 presign/PUT in flight (no 429 `E-MED-008`), and a pick past 20 shows only 写真は最大20枚まで登録できます (Bug No.10);
  - several failed uploads show 写真のアップロードに失敗しました… once;
  - an upload failure removes the tile;
  - save is disabled while uploading;
  - delete then discard;
  - deleting everything sends `[]`;
  - Staff may add and delete photos.
- **Dirty guard:** every field type, beforeunload, a server error keeps the form dirty, no prompt after success.
- **Validation UX:**
  - scroll to the first invalid field;
  - aria-invalid;
  - the error clears on input;
  - 未入力の項目があります.
- **Stress:** LV-01, 10, 11, 12, 13, 14, 16, 18. 備考 at 1000 characters in a single-line input is the likeliest break.

### Unit 3: Detail shell / 基本情報 / 変更履歴

- **Real-API behaviour:**
  - E-STR-001 (unknown id) → a single retryable error with no partial record;
  - an out-of-scope deep link → not-permitted with **no data leaking in any tab**, checked per role;
  - per-tab failure isolation (D-FR-006).
- **ステータス変更:**
  - every from/to pair, and the disabled-reason precedence (現在のステータスです → 閉店した店舗… → 開業準備中には戻せません → 閉店日を設定すると… → この遷移はできません);
  - 閉店 is never selectable;
  - the badge and the card update together;
  - toast;
  - the server refuses a forbidden transition (delta #5);
  - 閉店予定日 line appears when 閉店日 is set.
  - These are **irreversible on a store** (there is no way back to 準備中). Use only throw-away fixtures (§9).
- **基本情報:**
  - empty values show a muted `—`;
  - dates as YYYY/MM/DD;
  - サブブランド shows `—` for FIT365;
  - 直営 vs company name;
  - the photo gallery's empty and failure states;
  - the 店舗写真 編集 gate (D-FR-016a).
- **変更履歴 (B2 resolved):**
  - `changedByName` is shown;
  - one line per changed field, labelled through the field map;
  - the FC company shows its name, not a uuid;
  - rows with no diff show the action label and `—`;
  - newest first;
  - Staff/Trainer/Observer get not-permitted (delta #16);
  - no pagination UI: record behaviour beyond 100 rows.
- **Stress:** LV-03, 04, 08, 11, 12, 13, 14, 18, 19, 31.

### Unit 4: 営業設定

- **Calendar precedence (R5, Y-02 v6):** 個別日設定 > 祝日 override > weekday 定休日 > open. Cases:
  - a holiday under 曜日どおり shows the 祝日 label with no tint and follows its weekday;
  - a holiday + 特別営業日 under 休業 shows 特別営業;
  - deleting an exception reverts the day;
  - changing 祝日の扱い reclassifies every holiday;
  - the today marker, month navigation and 本日.
- **Hours Sheet:**
  - 定休日 disables the times;
  - both times required (delta #12, E-STR-003);
  - 26:00 overnight (delta #22);
  - a 7-row PUT with no holiday row reads back as 曜日どおり (integration-plan live check);
  - Staff can edit on their own store (D14);
  - Manager/Trainer/Observer see inert controls with an explanation.
- **Staff-resident Sheet:**
  - 常駐なし seeds from and clears the window;
  - a 定休日 day shows 定休日;
  - an hours save preserves the staff window.
- **Exceptions:**
  - one per date across both kinds, on add and on edit (editing a row's own date is not a conflict), with E-STR-004;
  - moving a date (D10 allows the date edit);
  - close after open (delta #13);
  - 理由 shown for closures only;
  - delete dialog and toasts.
- **SC-010 cross-check:** a unit 2 form save on the same store leaves hours byte-identical.
- **Stress:** LV-20, 21.

### Unit 5: 契約・料金 (plans / options / campaigns)

- **Real-API behaviour:**
  - full-set replace (D9), so unlinking the last plan persists `[]`;
  - E-STR-010 cross-brand plan;
  - E-STR-011;
  - E-CMP-008 / E-CMP-010;
  - the candidate search for campaigns is server-side (`nameQuery`); plan/option search is **client-side** (Deviation 9), so check both;
  - a multi-attach with one failure keeps the earlier links (Deviation 8);
  - a new link's 紐づけ日 = today.
- **Campaigns (B8):**
  - the badge comes from `acceptingStatus` (受付中 / 受付停止 / 上限到達);
  - 受付停止 / 上限到達 candidates stay selectable;
  - toast wording per acceptance state, one toast per campaign;
  - 割引概要 composition;
  - block reasons ブランド対象外 / 募集期間終了.
  - The **公開対象外** marker (D-FR-041) and its candidate block (D-FR-043) → `Block (B8)`.
- **Roles:** plans/options are System/HQ only; campaigns are System/HQ/Staff (own store); Manager is inert with a tooltip.
- **Stress:** LV-22, 23, 24, 27, 31.

### Unit 6: 1DayPass

- **Range:**
  - 699 / 700 / 1800 / 1801, empty, decimal, full-width digits;
  - E-STR-009 from the server;
  - copy 700円〜1,800円の範囲で入力してください.
- **Calendar:**
  - selection toggle;
  - a single priced day pre-fills the form;
  - a mix of priced and unpriced days shows the overwrite badge;
  - 設定を解除 reverts to the base price;
  - closing the panel discards input;
  - the month picker offers only months with data.
- **Base price:** delta #15. An edit is **permanent**: fixtures only.
- **Roles:** Manager/Trainer/Observer cannot open the panel and cannot select days.
- **Stress:** LV-25, 26, 27.

### Unit 7: 入退館設定

- **Brand split:**
  - JOYFIT shows どこでもJOYの受入, 後払い, the YOGA card;
  - FIT365 shows 相互利用オプション（¥500）の受入 and no 後払い / YOGA. This is not an empty state.
- **Real-API behaviour:**
  - every PUT sends all fields;
  - **the FIT365 live check (§5)**;
  - E-STR-012;
  - the minor-entry window is saved through `PATCH /stores/{id}` (HQ only);
  - end ≥ start (delta #14).
- **Roles:** 編集 is System/HQ only, with tooltip 相互利用設定はHQ/Systemのみ編集可能. The Switch is not operable outside the Sheet.
- **Partners:** read-only; 0 partners → a 0店舗 badge with an empty table; same brand only; 設定日 comes from `linkedAt` (B7).
- **Stress:** LV-07, 27.

### Unit 8: Store map (tab + setup)

- **Store resolution:** a store in the address beats the header store; with no store in the address, the header store is used, or the 全店舗 empty state 「対象店舗を選択してください」 (no crumb, badge or bar) appears (`/stores/map`).
- **Image (wired, delta #21):**
  - PNG/JPEG ≤ 5MB, with the exact error copy; an SVG is refused locally with the type error (BQ1 answered: not on the presign whitelist);
  - replace warning;
  - delete keeps the positions;
  - **persistence after reload**;
  - SC-008: the CMS fields are byte-identical after the image save (whole-row `PUT …/details`).
- **Placement:**
  - 配置 → centre + 0.04 diagonal (up to 10);
  - drag threshold 4px;
  - clamp 0–1;
  - arrows 1px / Shift 10px;
  - 配置を外す sends both coordinates as null;
  - a cabinet moved back to its saved spot counts as unchanged.
- **Draft and save:**
  - bar parts joined with ・;
  - 3 toast variants;
  - 破棄 with no confirmation;
  - the leave guard on the breadcrumb, sidebar, header store switch and beforeunload (delta #18);
  - 詳細 opens a new tab without a dialog (delta #19).
- **Real-API behaviour:**
  - one PATCH per cabinet with `expectedUpdatedAt`;
  - **force a 409 from a second session** (E-LOC-006): that cabinet stays 未保存 and the others are saved (M-FR-046 / 047);
  - write order: image first, then positions;
  - the detail tab's counts refresh with no reload (M-FR-048);
  - API-level refusal for Manager and other-store Staff (E-AUTH-101 / 103, SC-005).
- **Roles:** delta #17. Manager sees 閲覧のみ, no bar and no row actions. Trainer/Observer get the standard denial, with entry points hidden.
- **Relative coordinates (SC-003):** the same spot at 1024 / 1440 / 1920 on both the setup screen and the tab.
- **Stress:** LV-06, 17, 28, 29, 30.

---

## 7. Known gaps (Round 2 state, 2026-10-05)

| ID                                         | Blocker                                                                     | UI behaviour now                                                        | Test treatment                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **B1**                                     | Y-15 エリア / テリトリー (Phase 2)                                          | All UI commented out (`TODO(round3) B1`); stale URL params ignored      | Out of scope: no cases. Only the L-FR-017b "ignored, not counted" check is written (expect OK)                                            |
| **B3**                                     | `SetOneDayPassExceptionDto.note` still typed `object`                       | No visible effect (cast in the drawer)                                  | No case of its own. The LV-25 / 200-char boundary is tested normally. If the note fails to save → NG with a B3 note                       |
| **B8** (part)                              | No per-store publication flag; the link endpoint does not check publication | 公開対象外 marker never renders; such a candidate is not blocked        | D-FR-041 / D-FR-043 (公開対象外 parts) written to the spec → `Block (B8)`. The 受付可否 badge and 割引概要 are tested normally (resolved) |
| **B13**                                    | `UpdateStoreDto` has no weekly hours                                        | Edit form's weekly table is read-only, with a note pointing to 営業設定 | F-FR-040–047 **edit-mode** cases → `Block (B13)`. Create-mode cases and the 営業設定-tab path are tested normally                         |
| **R11**                                    | `GET /admin/fc-companies` is HQ-only                                        | 運営企業 filter fails to load for Manager/Staff                         | Not Block: **NG (BE)**, per the user's 2026-10-05 decision. Report to BE                                                                  |
| **K1**                                     | No scope-aware prefecture facet (integration Q4)                            | All 47 prefectures offered                                              | L-FR-012 "only prefectures in scope" → `Block (K1)`                                                                                       |
| **K2**                                     | No company facet                                                            | Companies with no in-scope stores still offered                         | L-FR-013 "≥1 store" sub-rule → `Block (K2)`                                                                                               |
| B2, B4, B5, B6, B7, B9, B10, B11, B12, B14 | Resolved and wired                                                          | —                                                                       | Test normally. A failure here is **NG**, not Block                                                                                        |

---

## 8. Traceability map

| Sub-spec        | FR                                             | Unit                            | Notes                                                                            |
| --------------- | ---------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| store-list      | FR-001–004, 006–013, 015–023a                  | 1                               | FR-012 → K1; FR-013 → K2 + R11                                                   |
| store-list      | FR-005, 014, 024–036b                          | —                               | **B1 / Phase 2: no unit by design**                                              |
| store-list      | FR-037–038                                     | 1                               | Row nav + 編集 gate (own-row Staff)                                              |
| store-list      | FR-039                                         | 3                               | History is read-only (read in the 変更履歴 tab)                                  |
| store-form      | FR-001–029 (except 030–034)                    | 2                               |                                                                                  |
| store-form      | FR-030–034, 064, 112                           | —                               | **B1 / Phase 2: no unit by design**                                              |
| store-form      | FR-035                                         | —                               | Withdrawn in the spec                                                            |
| store-form      | FR-040–047                                     | 2 (create) / 2 + 4 (edit → B13) |                                                                                  |
| store-form      | FR-050–071, 080–089, 100–104, 110–111, 113–114 | 2                               | FR-110 ("mock API") is stale; read it as the real API                            |
| store-detail    | FR-001–006, 010–012b, 014–016b, 018            | 3                               | FR-013 → B1 (no unit); FR-017 withdrawn                                          |
| store-detail    | FR-020–029f                                    | 4                               |                                                                                  |
| store-detail    | FR-030–047                                     | 5                               | FR-041 / 043 (公開対象外) → B8                                                   |
| store-detail    | FR-050–063                                     | 6                               | FR-050a → delta #15                                                              |
| store-detail    | FR-070–075                                     | 7                               | FR-076 withdrawn                                                                 |
| store-detail    | FR-080–083                                     | 3                               |                                                                                  |
| store-detail    | FR-090–091                                     | 3–8 (each tab's role cases)     |                                                                                  |
| store-detail    | FR-095–096                                     | —                               | Data-source notes (mock-first), superseded by the real API; no behaviour to test |
| store-detail    | FR-110–114                                     | 8                               |                                                                                  |
| store-map-setup | FR-001–085                                     | 8                               | FR-083 stale → delta #21                                                         |

Every Phase 1 FR lands in at least one unit. The **only FRs without a unit** are:

- the B1 / Phase 2 set;
- three withdrawn FRs (form FR-035, detail FR-017, detail FR-076);
- detail FR-095 / 096, which describe the mock data source and have no user-visible behaviour.

---

## 9. Execution notes (for execute-testcases)

**Credentials** (`src/lib/auth/demo-users.ts`; real Cognito; password `Password@123`):

| Role        | Email                           | Use for                                                                        |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------ |
| System      | `lodu4289+1@gmail.com`          | Positive paths (second HQ-level session for the 409 / two-tab cases)           |
| Headquarter | `lodu4289+headquater@gmail.com` | **Primary** account: fixture creation and most positive cases                  |
| Manager     | `lodu4289+manager@gmail.com`    | Managed-store scope, read-only map, history visible, inert edit controls       |
| Staff       | `lodu4289+staff@gmail.com`      | Own-store edits (3 fields, hours, campaigns, 1DayPass, map), other-store walls |
| Trainer     | `lodu4289+trainer@gmail.com`    | View-only own store; map denial; history denied                                |
| Observer    | `lodu4289+observer@gmail.com`   | Same as Trainer                                                                |

- The header 「デモ: ユーザー切替」 switcher appears only when `NEXT_PUBLIC_APP_ENV=development`. Otherwise log in through the login form.
- Before the run, record **which store the Staff / Trainer / Observer accounts are linked to** and **the Manager's managed stores** (open `/stores` as each). Every own-store and other-store case depends on it.
- Per memory, test staff accounts may sit on 未割当 職位 with 0 permissions. If the Staff account cannot reach `/stores`, fix its 職位 through the Y-01 edit UI first, or mark the Staff cases Block (account provisioning).
- **No lockout cases** exist in this feature, so there is no wrong-password scheduling constraint.

**Environment**: `NEXT_PUBLIC_REAL_API_URL=https://api.dev.fitness-v2.okamoto-hd.com`. This is a **shared** dev backend with **no seed reset**. Other testers and sessions may edit the same stores mid-run, so prefer your own fixtures for identity-sensitive checks.

**Data policy.** Read all of it before the first write.

- **Stores cannot be deleted** (no DELETE endpoint; closure is status only). Every store the run creates is **permanent**. Limit creation to the fixture set below, and **reuse** existing fixtures: search `QA-P2-` on `/stores` before creating anything.
- **Prefix.** 店舗コード starts with `QA-P2-`. 店舗名 starts with `【QA】`. Fixtures created for long values keep the prefix at the start, so they stay findable by search.
- **Fixture set.** Create these in unit 2; later units reuse them.

  | Fixture                                       | Purpose                                                                                                                                                                                                                                                                   |
  | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **FX-LONG-J** (JOYFIT, 準備中 → later 営業中) | Every LV field at its maximum in full-width Japanese: name 255, kana 255, address 500, memo 1000, phone/FAX 20, postal 10, code 50. 20 photos. Long exception reasons; long 1DayPass notes; many linked plans/options/campaigns; floor image plus lockers if E-01 allows  |
  | **FX-LONG-T** (JOYFIT)                        | The same lengths as unbroken half-width tokens                                                                                                                                                                                                                            |
  | **FX-FIT365**                                 | FIT365 brand: sub-brand hidden, mutual-use FIT365 path, the §5 live check                                                                                                                                                                                                 |
  | **FX-STATUS-1..n**                            | Throw-away stores for the status-transition walk (irreversible). Create the minimum needed, ideally one store driven 準備中→営業中→休業中→営業中. 閉店 cannot be reached from the UI except through 閉店日 + the daily batch, so record that case as observed, not forced |
  | **FX-BRAND**                                  | Stays 準備中, for the brand-lock / brand-change cases                                                                                                                                                                                                                     |

- **Never edit pre-existing stores.** That covers every store without the `QA-P2-` prefix: real club data, other testers' records, Round 1/2 leftovers. Read-only cases (list, filters, detail view, history view, tabs view) may use them. **Exception: the Staff own-store cases.** The Staff account's linked store is pre-existing.
  - Allowed only for **reversible** writes: name/address/phone, hours, exceptions, campaign link/unlink, map positions.
  - Each case must **record the original value first and restore it in the same case**.
  - **Never** set a 1DayPass default price or change status on it.
  - If linking the Staff account to a fixture store is possible through Y-01 (and reversible), prefer that.
- **Permanent writes.** Use them only on fixtures:
  - the 1DayPass **default** price (no delete);
  - status transitions;
  - store creation.
- **Long values from other masters.**
  - Plan / option / campaign names: use the longest existing values in the brand's masters. Create `【QA】`-prefixed records in those masters only if their screens support delete or deactivate; otherwise mark the LV case Block (no fixture).
  - FC company name for LV-14: use the longest existing active FC company. A new `【QA】` FC company is allowed only if Y-03 allows deactivating it afterwards.
  - Lockers for LV-28 / 29: use existing lockers in the fixture's store, or create `【QA】` lockers through E-01 if it supports delete.
- **Destructive cases** (unlink, exception delete, photo delete-all, image delete) run on fixtures, after the cases that read the same data.
- **Cleanup at the end:**
  - unlink the QA campaigns/plans/options from fixtures where that keeps them tidy;
  - delete QA exceptions and 1DayPass per-date prices;
  - leave the fixture stores in place, listed in the TC doc header with their status, because they cannot be deleted.

**Known-gap policy.**

- A failure matching a §7 row → `Block (Bn / Kn)`.
- R11 → `NG (BE)`.
- A failure in a resolved B-item, or anything undocumented → `NG`.
- For a delta row, follow its "How to test" column.

**Viewport.**

- **1024×768** for every layout and LV case (state it in the case steps).
- **≥1440px** for the wide check.
- Unit 8 adds 1920 for SC-003.
- Below 1024px is out of scope.

**Harness notes (from memory).**

- Set `NODE_PATH` to the project's `node_modules`.
- `startWatchRequests` only sees GETs; patch the scratchpad copy to watch PATCH/PUT/POST when a case asserts the request body (Staff 3-field body, explicit nulls, full-set replace, image-then-positions order).
- Use a fresh page plus a 1200–1500ms wait for search/filter debounce cases.
- `innerText` returns text from sr-only spans; confirm visibility from a screenshot before flagging a missing label.
- If you split a large doc across parallel agents, give **each agent its own login**: a shared storage state stomps the header store scope.

---

## 10. Suggested order

1. **Unit 1, store list.** P1, read-only. It sets the baseline against real data, records each role's scope (needed by every later unit) and checks for existing `QA-P2-` fixtures.
2. **Unit 2, store form.** P1. It creates the fixture set (§9) and produces the long-value edits that unit 3's history reads. Run the create cases first, then edit, then Staff, then the walls.
3. **Unit 3, detail shell / 基本情報 / 変更履歴.** Reads unit 2's fixtures and history. Run the status-transition walk at the **end** of this unit, on FX-STATUS only (irreversible).
4. **Unit 4, 営業設定.** Includes the SC-010 cross-check against unit 2's saves.
5. **Unit 5, plans / options / campaigns.** Link first, then the LV cases while links exist, then unlink (destructive) last.
6. **Unit 6, 1DayPass.** Per-date prices first. The **base price** case (permanent) runs last, on a fixture only.
7. **Unit 7, 入退館設定.** Runs after the FIT365 fixture exists. Includes the §5 FIT365 live check.
8. **Unit 8, store map.** Runs last: it depends on the lockers and fixtures, the 409 case needs two sessions, and the image delete is destructive.
9. **Role sweep.** Each unit's non-HQ role cases run at the end of that unit, in one session per role, so HQ-authenticated setup is not repeated.

---

## 11. Definition of done

- [ ] **Checklist-first.** Before writing cases, review `tests/checklists/common-gui-validate-checklist.md` and `common-function-checklist.md` against §6a. Add any long-value render location this plan names that the checklist does not yet cover (e.g. a dialog interpolating **two** long values such as the code-change dialog; the global header store selector; a breadcrumb with an interpolated name).
- [ ] All 8 TC docs created under `specs/026-store-management/tests/cases/`. Each contains its §6a LV rows as explicit High cases at 1024×768.
- [ ] Every Phase 1 FR traced (§8). Each B1 / withdrawn FR is named in its doc's out-of-scope note.
- [ ] Every delta (§4) carried into the Notes of the cases it touches.
- [ ] Each doc executed once with `execute-testcases`. Results recorded as OK / NG / NG (BE) / Block (Bn / Kn).
- [ ] The §5 live checks answered explicitly in the docs:
  - status reset on form save;
  - FIT365 mutual-use field reset;
  - Staff list scoping;
  - 7-row hours PUT read back as 曜日どおり.
- [ ] Test data. Fixture stores listed in each doc header (they are permanent). Per-date prices, exceptions and QA links cleaned up, or left with a note. Every Staff own-store change confirmed restored.
