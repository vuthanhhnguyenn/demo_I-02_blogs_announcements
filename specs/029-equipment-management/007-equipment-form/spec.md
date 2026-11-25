# Feature Specification: E-02 Connected Equipment Form (Create / Edit)

**Feature Branch**: `007-equipment-form`  
**Created**: 2026-06-25  
**Status**: Clarified  
**PO Spec**: `E-02` — 店舗機器管理 (Store Equipment Management)  
**Source**: `.cache/fitness-crm-ui/src/pages/equipment-form.tsx` + `.cache/fitness-crm-ui/public/requirements/E-02.md`  
**Input**: User description: "Create spec for screen E-02 店舗機器管理 (Equipment Page Management) — Phase 1 scope: FR-003, FR-005, FR-008, FR-009"

---

## Clarifications

### Session 2026-06-25

- Q: Which fields must be hard-enforced on submit? → A: **Follow the prototype** — only the fields the prototype `validate()` checks are submit-blocking: 機器名, 機器タイプ, シリアルナンバー, 設置場所, 設置日. (認証方式 and 接続先接点制御装置 keep their visual required mark but are **not** submit-blocking in Phase 1.)
  - **Update 2026-06-30**: 認証方式 and 接続先接点制御装置 are now **submit-blocking required**. They are validated at the field level (`equipmentFormSchema`) when the 保存 button is clicked — not via `superRefine` — and render a red border + error message when empty. This supersedes the Phase 1 "not submit-blocking" decision for these two fields.
- Q: Is 接続先ポート番号 an official Phase 1 field? → A: **Yes, and it is required** (must be validated on submit). FR-003 field list is extended to include it.
- Q: Must at least one usage-control judgment be selected to save? → A: **No** — submitting with no judgment selected is allowed (FR-008 異常系 "契約種別未選択" is **not** enforced in Phase 1).
- Q: If a judgment checkbox is checked, is its Select required? → A: **Yes** — when a checkbox is checked, its Select MUST have a value; when unchecked, the Select is not required.
- Q: On create, which statuses are selectable? → A: **All four** (正常 / 異常 / メンテナンス中 / 廃棄) are selectable.
- Q: Gate-stop conditions — display-only on this form? → A: **Yes, display-only** (no per-device toggle in Phase 1).
- Q: How is 接続先接点制御装置 selected? → A: **Picker tied to FR-007** controller records.

### Session 2026-09-08 — prototype & API-design alignment

Re-checked against the latest prototype (`dx-fitness/fitness-crm-ui@1bad949` → `src/pages/equipment-form.tsx`, last changed `65f1244`) and the backend design doc (`.cache/api/openapi.json` → `Admin - Connected Device Management (API-103)`). Where the two disagree, the prototype wins.

- Q: `接続先ポート番号` is a required field on this form but exists in neither the prototype form nor API-103's create body — keep it? → A: **Removed.** 接点制御先番号 is assigned server-side (next free contact port on the chosen controller) and remains visible read-only on the detail screen, which is exactly what the prototype does. This **supersedes** Session 2026-06-25 Q2 and Clarified Decision 2 below.
- Q: 認証方式 and 接続先接点制御装置 are submit-blocking on this form — does the contract agree? → A: **Yes.** API-103's `CreateConnectedDeviceDto` marks `authMethod` and `relayControllerId` required, so both are now non-nullable in the create/update contract rather than nullable-with-default.
- Q: 店舗 is not asked for on this form — how is it decided? → A: **Derived from the chosen controller** (API-103 §6.1: `storeId` is never accepted from the client), which is what keeps device and controller in the same store. Re-pointing the controller on edit moves the device with it; a cross-store move stays delete + re-register (BR-DEV-004).
- Q: オプション種別 / 都度オプション種別 offered project-specific lists (水素水 / プロテイン / タンニング / その他 and 「〜都次」 variants) — which values are right? → A: **The prototype's single shared list**: プロテイン / サプリメント / 日焼け / コラーゲン / 水素水 / 体組成計 / シャワー, used by both Selects.
- Q: 都次 vs 都度 — which spelling? → A: **都度**. 都次 was a typo; corrected in labels and validation messages.

### Session 2026-09-10 — prototype re-check (FR-008 v2)

Re-checked against the latest prototype (`dx-fitness/fitness-crm-ui@46253e3`; `src/pages/equipment-form.tsx` last changed `6bc1f1c`, 9/8) and `fitness-spec@89c2c79` (`crm/requirements/E-02.md` revision `260731_v2`, which redefines FR-008 around サービス種別). Both now agree, superseding the 2026-09-08 answers taken from `1bad949`.

- Q: The form offered three judgments (主契約判定 / オプション契約判定 / 都度オプション判定) — is 課金種別 still a judgment axis? → A: **No.** FR-008 v2 keeps **two** axes: 主契約判定 and **サービス種別判定**. 課金種別 (通常/都度) is not part of the judgment: if several options share a service type, **any one of them being active permits start-up (OR)**. The two option judgments therefore collapse into one サービス種別判定. This **supersedes** the 2026-09-08 answer about オプション種別 / 都度オプション種別.
- Q: Is サービス種別 single- or multi-select? → A: **Multi-select** — a checkbox group over the G-02 service types (プロテイン / サプリメント / 日焼け / コラーゲン / 水素水 / 体組成計 / シャワー), labelled 「サービス種別（複数選択可）」, with the note 「課金種別（通常/都度）は問いません。同じサービス種別のオプションが複数ある場合、いずれか1つが有効であれば起動を許可します」. 主契約タイプ stays a single Select.
- Q: Must at least one judgment be selected to save? → A: **Yes** — the prototype's `validate()` raises 「契約種別を選択してください」 and E-02 FR-008 異常系 says the same. This **supersedes** Session 2026-06-25 Q3 and Clarified Decision 3 below.
- Q: Does 備考 have a length cap? → A: **1000 chars** (`maxLength={1000}` in the prototype), which is the project's `TEXTAREA_MAX_LENGTH`.

### Session 2026-10-12 — PO decisions on real-API gaps (E-02 integration)

Raised by the real-API integration (`../integration-plan.md` §9) against `fitness-spec@c7ea80c` (E-02 `260731_v2`), `fitness-crm-ui@47423ec` and the API-103 / API-104 contract in `src/lib/openapi.real.json`. Answered by the user (PO-side) on 2026-10-12.

- Q: API-103 requires `outputPort` (relay contact 1–8) whenever 認証方式 ≠ なし, must be null for なし, and unique per controller (`E-VAL-001` / `E-DEV-009`). E-02 FR-003 has no such field and the BE does not assign it, so only なし devices can be registered — and API-103 allows なし only for 体組成計 / その他 (`E-DEV-004`). Add the field? → A: **Yes — add 出力ポート to Section 2 接続情報.** Select of 1–8 (capped at the chosen controller's 制御ポート数), **required when 認証方式 ≠ なし**, disabled and cleared when なし; ports already used by other devices on the chosen controller are labelled 「n（使用中: …）」 — ~~shown disabled~~ selectable since Session 2026-11-09 (shared ports); changing the controller clears it. ~~`E-DEV-009` renders inline on the field.~~ (no longer raised, 2026-11-09) Edit prefills the stored port. The value is physical wiring, so neither FE nor BE may guess it. This **supersedes** the 2026-09-08 answer that removed 接続先ポート番号 ("assigned server-side" — the real BE does not) and restores Clarified Decision 2 in its new form. FE-only — API-103 already accepts the field.
- Q: サービス種別 is a multi-select in the prototype, but `PUT …/usage-control` takes a single `allowedServiceType` — single or multiple? → A: **Multiple, as the prototype** (「サービス種別（複数選択可）」, any one active permits start-up). **BE dependency**: API-103 must accept an array (`allowedServiceTypes: ServiceType[]`) on `PUT …/usage-control` and return it on the detail / list DTOs. Until then the submit-time guard 「現在は1つのみ設定できます（API未対応）」 stays (integration Round 2, B2).

### Clarified Decisions

1. **Required validation = prototype set**: submit-blocking fields are 機器名 / 機器タイプ / シリアルナンバー / 設置場所 / 設置日 and **any checked judgment's 種別 selection** (Q4). 認証方式 and 接続先接点制御装置 are **also submit-blocking required** (Update 2026-06-30), validated at the field level when 保存 is clicked.
2. ~~**接続先ポート番号**: official Phase 1 field, **required**.~~ — **withdrawn 2026-09-08**: the field is not in the prototype or API-103 and has been removed from the form; 接点制御先番号 is assigned server-side. — **Restored 2026-10-12** as **出力ポート** (Select 1–8, required when 認証方式 ≠ なし, cleared when なし): API-103 requires it and does not assign it.
3. ~~**Usage-control rule optionality**: ≥1 judgment is **not** mandatory; the device may be saved with no rule.~~ — **withdrawn 2026-09-10**: at least one judgment (主契約判定 or サービス種別判定) is now **mandatory**, matching the prototype's `validate()` and FR-008 異常系.
4. **Conditional Select**: required only while its checkbox is checked; hidden (unchecked) Select values are discarded on save.
5. **Status on create**: all four states selectable.
6. **Gate-stop note**: display-only, no configuration.
7. **Controller field**: picker bound to FR-007 records (not free text).

---

### Session 2026-10-16 — BE answers for Round 2b (E-02 integration)

Source: `fitness-backend-v2/FE-feedback/equipment/BE-REQUESTS.vi.md` (BE confirmation 2026-10-16). Spec `fitness-spec@5c391cf` unchanged.

- Q: サービス種別 multi-select — does the API take several? → A: **Yes**: `allowedServiceTypes: ServiceType[]` (OR semantics, `[]` = axis off) on PUT usage-control, POST and every device response (BE No.12). The single-type guard is gone.
- Q: Create in one call? → A: **Yes** — POST accepts `isMainContractRequired / allowedContractType / allowedServiceTypes` in the same transaction (BE No.15). 新規登録 sends one POST; 編集 keeps PATCH + PUT usage-control.
- Q: 廃棄 on 新規登録 (Q5 of 2026-06-25 allowed all four)? → A: **Removed for good** (BE No.16): the API refuses it (400 `E-VAL-001`) because the history starts with an `install` row. 新規登録 offers 正常 / 異常 / メンテナンス中, default 正常; 編集 and the status dialog keep 廃棄. This supersedes the Q5 answer.
- Q: IPアドレス rule? → A: Optional; when given it must be a valid **IPv4 or IPv6** address (BE No.8, 400 `E-VAL-001`). Validated on the form.

### Session 2026-11-09 — 主契約判定「全て」・複数選択 (prototype 11/7, Dev Q&A 11/5)

Re-checked against `dx-fitness/fitness-crm-ui@4508cf7` (11/7 「接続機器の利用制御ルール：主契約判定の全て・複数選択」, report `public/reports/20261107-equipment-usage-rule/`), `fitness-backend-v2@origin/main` `07993418` (API-103 `allowedContractTypes[]`) and `28b9f0cb` (API-104 `relayId`), and `fitness-spec@5e335ab` (`E-02` `261107_v5` — its FR-008 still reads 主契約タイプ 「単数Select」; the 11/5 データ設定会 decision and the prototype supersede it, PO spec update pending).

- Q: How is 主契約判定 set now? → A: **Two steps.** Checking 主契約判定 reveals a required radio 「対象の主契約タイプ」 with 「全て」 / 「タイプを指定」 and **no default** (defaulting to 全て would let a bare checkbox open the device to anyone with a contract and no option). 「全て」 shows the note 「タイプを問わず、有効な主契約があれば起動します」; 「タイプを指定」 reveals 「主契約タイプ（複数選択可）」 checkboxes (OR, note 「選んだタイプのいずれかが有効なら起動します」). Unchecked shows 「主契約では判定しません」 beside the checkbox; サービス種別判定 likewise 「サービス種別では判定しません」.
- Q: Which 主契約タイプ are offered? → A: **The G-01 master's nine, narrowed by the brand of the device's store** (= the controller's store): a FIT365 store hides the JOYFIT-only キッズ会員 / 学生会員 / 福利厚生 and says so (「FIT365 の店舗の機器のため、JOYFIT 専用のタイプ（キッズ会員・学生会員・福利厚生）は表示していません」). Before a controller is picked the list is replaced by 「先に接続先接点制御装置を選択してください。店舗のブランドで選べるタイプが決まります」. (The API itself has no brand check — FE rule only.)
- Q: Validation? → A: Neither axis → 「主契約判定かサービス種別判定のどちらかを設定してください。設定がないと、この機器は誰も起動できません」 (replaces 「契約種別を選択してください」); 主契約判定 without a scope → 「「全て」か「タイプを指定」を選択してください」; タイプを指定 with none ticked → 「主契約タイプを1つ以上選択してください」 (replaces 「主契約タイプを選択してください」).
- Q: Any warning? → A: When 主契約判定 is 「全て」 — or タイプを指定 with every selectable type ticked — **and** サービス種別判定 is on, an amber Alert 「オプションの有無を問わず起動します」 / 「主契約が有効な会員は、オプションを持っていなくても起動できます。オプションを持つ会員だけに使わせる場合は、主契約判定のチェックを外してください。」 is shown. It never blocks the save.
- Q: Defaults? → A: A **new 入退館ゲート** (`entry_gate`, 入館ゲート since the entry/exit split) starts with 主契約判定 ON + 「全て」, as long as the rule is untouched; switching to another type while still untouched clears it again. Every other type starts empty.
- Q: Changing the controller to a FIT365 store while JOYFIT-only types are ticked? → A: If those types are in force (主契約判定 ON + タイプを指定), an AlertDialog 「主契約タイプの指定を外しますか？」 explains which types drop out (plus 「指定がなくなるため、変更後にタイプを選び直してください。」 when none would remain); 「外して変更する」 applies, 「キャンセル」 keeps the old controller. Otherwise (全て / 判定しない) they are dropped silently.
- Q: API? → A: `allowedContractTypes: string[]` on POST and `PUT …/usage-control` — `[]` with `isMainContractRequired: true` = 「全て」, `[]` when the axis is off; the deprecated single `allowedContractType` is never sent (both → 400 E-VAL-001). Closes BE-REQUESTS No.21 (the codegen `nullable` cast is gone).
- Q: 機器タイプ 入退館タブレット (`gate_tablet`, E-02 v3) and エリア扉 (v5)? → A: Out of scope for this round. 入退館タブレット is shown (label) and editable with the type locked, but not offered on 新規登録 — its 用途 / 端末証明書ID / 連動ゲート fields have no prototype yet (R304). エリア扉 is not in the API (prototype report: 「まだ」). **Superseded for エリア扉 by Session 2026-11-19** (now in scope).

### Session 2026-11-09 — entry/exit gate split (機器タイプ 退館ゲート)

- Q: Stores now install separate physical gates for check-in and check-out — how is that modelled? → A: **A new 機器タイプ** (user request, 2026-11-09). API-103 `deviceType` gains **`exit_gate`** and `entry_gate` becomes check-in only. Labels: `entry_gate` 入退館ゲート → **入館ゲート**, `exit_gate` → **退館ゲート** — 7 types, in this order: 入館ゲート / 退館ゲート / 水素水サーバー / 体組成計 / タンニングマシン / プロテインサーバー / その他 (the BE CSV exports use the same labels).
  - **Backend (API-108 gate judgment, fitness-backend-v2):** the member's position comes from their gate state — the last allowed gate event at the store within 24 h (入館 / 同伴入館 = inside, 退館 or none = outside). An `entry_gate` refuses a member who is already inside (`denied_duplicate`, 二重入館) and otherwise runs the usual guard chain; an `exit_gate` lets an inside member out unconditionally and refuses one who is outside (`denied_other`, detail `not_inside`). Gate terminal messages are unchanged (both refusals show the generic 「ご利用いただけません。スタッフにお声かけください」).
  - **Form:** 機器タイプ offers the 7 labels. The ゲートストップ条件 info box stays **入館ゲート only** (title 「入館ゲートのゲートストップ条件（自動適用）」): a manual gate stop never applies to a check-out, and the API refuses a `gateStop` field on an `exit_gate` (`E-DEV-007`). 認証方式 for 退館ゲート: 会員読取型 / 機器読取型 (なし is refused, `E-DEV-004`, as for 入館ゲート). 利用制御ルール is **unchanged** for 退館ゲート — still required and saved, though the exit judgment does not read it; making it optional is a separate ticket.
  - **Test cases:** E-02-C TC-011 / TC-073 reset to Untested; TC-125…TC-127 added.

### Session 2026-11-09 — shared 出力ポート

- Q: Can several devices use the same relay output port — e.g. an 入館ゲート and a 退館ゲート wired to one physical gate? → A: **Yes** (user request, 2026-11-09). API-103 no longer refuses a port another live device on the controller already uses (`E-DEV-009` is no longer raised), and every device on that port is unlocked together.
  - **Form:** 出力ポート still lists 1…制御ポート数. A port that other devices use reads 「{n}（使用中: {機器名}、{機器名}）」 — every such device, the edited one excluded — and **stays selectable**. No extra note (user decision). The inline `E-DEV-009` message is gone; `E-VAL-001 field=outputPort` still renders 「出力ポートを選択してください」.
  - **Test cases:** E-02-C TC-041…TC-044 reset to Untested; TC-128 added.

### Session 2026-11-19 — 機器タイプ エリア扉 (E-02 v5, ladyroom)

Re-checked against `fitness-spec@9e0e07e` (`E-02` `261109_v6` — FR-003 エリア扉 bullet, FR-008 エリア判定, FR-016), `dx-fitness/fitness-crm-ui@9428dc2` (design PR #42, 11/12 — `equipment-form.tsx` エリア扉 branch, `data/equipment.ts`, `data/facility-areas.ts`) and `src/lib/openapi.real.json` (API-103 `areaId`).

- Q: Is エリア扉 still out of scope (Session 2026-11-09)? → A: **No — in scope now.** API-103 `deviceType` has `area_door`, and the area master exists (E-02 FR-016, [009-area-master](../009-area-master/spec.md)). This supersedes the 2026-11-09 answer **for エリア扉 only**; 入退館タブレット stays as decided there.
- Q: What does the form do for エリア扉? → A: 機器タイプ offers 8 labels (the 7 of 2026-11-09 + 「エリア扉」). For エリア扉 the 利用制御ルール card replaces 主契約判定 / サービス種別判定 with:
  - **エリア** (required, exactly one) — card description 「扉の先のエリアを1つ選択してください。このエリアを利用できる主契約またはオプションを持つ会員が開錠できます。」. The Select lists the areas of the **connected controller's store's brand group** (JOYFIT sub-brands → the JOYFIT areas). Before a controller is chosen it is disabled with 「先に接続先接点制御装置を選択してください。店舗のブランドのエリアから選べます」; a brand group with no area shows 「{brand} のエリアはまだ登録されていません。エリアは本部がエリアマスタ管理で登録します」.
  - **性別の条件** — read-only, taken from the chosen area (placeholder 「エリアを選ぶと表示されます」), with 「性別の条件はエリアの設定で決まります。条件があるエリアは、性別が合う会員だけが開錠できます。」.
  - An info box 「エリア扉の自動適用の条件」 / 「家族会員利用中の会員は開錠できません。ブラックリスト・未納はエリア扉では判定しません。退室時は判定しません。」 (E-02 FR-008).
- Q: Validation? → A: No area → 「エリアを選択してください」. The 契約種別 messages never appear for an エリア扉 — it has no contract axes.
- Q: Controller change? → A: Within the same brand group the area is kept; across brand groups it is cleared with 「接続先の店舗のブランドが変わったため、エリアの選択を外しました。選び直してください」.
- Q: 認証方式? → A: API-103 accepts only `member_scan` (会員読取型) for `area_door`; 機器読取型 / なし are refused by the server and shown inline on 認証方式. Neither the PO spec nor the prototype narrows the radio — **open point** (029 test plan Δ27).
- Q: API? → A: `POST` carries `areaId` — required for `area_door`, refused on any other type, other-brand / unknown → 400 `E-VAL-001` on `areaId`. An エリア扉 takes **no** usage-control rule, so no `PUT …/usage-control` is sent. Edit: `PATCH areaId` moves the door to another area of the same brand group; 機器タイプ stays locked (D4).
- Q: Permissions? → A: The equipment rules apply unchanged — Manager / Staff can register an エリア扉 although they cannot write the area master.
  - **Test cases:** E-02-C `[エリア扉]` cases per the 029 test plan §5.

## Scope

### In Scope (Phase 1)

| ID         | Requirement                                          | Screen Coverage                                                                 |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| **FR-003** | New connected-equipment registration                 | `equipment-form` in **create** mode — 基本情報 + 接続情報 + 備考 sections, 登録 |
| **FR-005** | Connected-equipment edit                             | `equipment-form` in **edit** mode — same form, prefilled, 更新                  |
| **FR-008** | Usage-control rule configuration (device × contract) | 利用制御ルール section — 主契約判定 / サービス種別判定                          |
| **FR-009** | Authentication method settings management            | 認証方式 radio group — 会員読取型 / 機器読取型 / なし                           |

### Out of Scope for Phase 1

| ID / Feature                            | Reason                                                                                                                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001                                  | Connected-equipment list display (separate list screen)                                                                                                                                               |
| FR-002                                  | Connected-equipment search (list screen)                                                                                                                                                              |
| FR-004                                  | Connected-equipment detail (read-only) — covered by `006-equipment-detail`                                                                                                                            |
| FR-006                                  | Connected-equipment deletion — covered by `006-equipment-detail`                                                                                                                                      |
| FR-007                                  | Contact-control device (接点制御装置) settings management — separate screen                                                                                                                           |
| FR-010                                  | Bulk status update — list-screen action                                                                                                                                                               |
| FR-011                                  | Equipment ledger CSV export                                                                                                                                                                           |
| FR-012                                  | Status change history record/reference — covered by `006-equipment-detail`                                                                                                                            |
| FR-013                                  | Equipment usage log reference                                                                                                                                                                         |
| Gate-stop condition **execution**       | FR-008 gate-stop rule (blacklist / arrears / family-member-in-use) is auto-applied; the form only **displays** an informational note for gates. Runtime judgment is system-side, not configured here. |
| Member authentication / activation flow | QR one-time activation (#173) is mobile-app/runtime behavior, not configured on this form                                                                                                             |

**Phase markers in code**: `equipment-form.tsx` contains no explicit Phase 2 / future-scope placeholders, disabled-for-future controls, or commented-out features. All rendered controls belong to the Phase 1 scope above.

---

## Feature Overview

| Item        | Detail                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Screen name | 接続機器 新規登録 / 接続機器 編集 (Connected Equipment — New Registration / Edit)                                                                                                                                  |
| UI slug     | `equipment-form`                                                                                                                                                                                                   |
| Mode        | `create` (default) and `edit`, selected via `mode` prop                                                                                                                                                            |
| Parent list | `equipment-list` (接続機器管理)                                                                                                                                                                                    |
| Brands      | JOYFIT / FIT365 (common); per-use option enum values may be brand-extended (E-02 §ブランド別設定構築)                                                                                                              |
| Purpose     | Staff and HQ users register a new connected device or edit an existing one — capturing basic info, controller connection, authentication method, and usage-control rules that govern device start-up authorization |

**Source**: E-02 §概要, FR-003, FR-005, FR-008, FR-009; basic flow steps ④ (FR-003) and ⑤ (FR-008).

---

## Actors & Access Control

**Source**: E-02 §権限マトリクス (接続機器登録・編集・削除 / 利用制御ルール設定 columns)

| Role            | Register / Edit Equipment | Usage-Control Rule Config | Data Scope          |
| --------------- | ------------------------- | ------------------------- | ------------------- |
| **System**      | ○                         | ○                         | All stores          |
| **Headquarter** | ○                         | ○                         | All stores          |
| **Manager**     | ○ (jurisdiction stores)   | ○ (jurisdiction stores)   | Jurisdiction stores |
| **Staff**       | ○ (own store)             | ○ (own store)             | Own store           |
| **Observer**    | × (view only)             | ×                         | Own store (view)    |
| **Trainer**     | ×                         | ×                         | No access           |

> The prototype `equipment-form.tsx` does not render role-gated controls; access control is enforced upstream (route/page access). Authorization for who may open this form is **Deferred to Plan**.

---

## Component Hierarchy & Layout

**Source**: `equipment-form.tsx`

```
EquipmentForm (mode: create | edit)
├── SharedSidebar (currentPage="equipment-form")
└── SidebarInset (flex col, max-h-svh, overflow hidden)
    ├── SharedHeader
    ├── PageHeader (outside)
    │   ├── BackLink → confirmDiscard → navigate("equipment-list")  [label: 接続機器管理に戻る]
    │   └── title: 接続機器 新規登録 (create) | 接続機器 編集 (edit)
    ├── main (flex-1, overflow-auto, px-6 py-4)
    │   └── container (max-w-960px, centered, space-y-6)
    │       ├── Card: 基本情報 (2-col grid)
    │       │   ├── 接続機器ID (disabled / readonly)
    │       │   ├── 機器名 *            (Input, validated)
    │       │   ├── 機器タイプ *        (Select, validated)
    │       │   ├── シリアルナンバー *  (Input, validated)
    │       │   ├── 設置場所 *          (Input, validated)
    │       │   ├── 設置日 *            (DatePicker, validated)
    │       │   ├── 状態 *              (Select, default 正常)
    │       │   └── 認証方式 *          (RadioGroup, col-span-2)   ← FR-009
    │       ├── Card: 接続情報 (2-col grid)
    │       │   ├── 接続先接点制御装置 * (picker, FR-007 records)
    │       │   ├── IPアドレス           (Input, optional)
    │       │   └── MACアドレス          (Input, optional)
    │       ├── Card: 利用制御ルール      ← FR-008
    │       │   ├── description: 複数選択可・いずれか1つを満たせば起動許可
    │       │   ├── 主契約判定 checkbox → (if checked) 対象の主契約タイプ radio * (全て / タイプを指定) → (タイプを指定) 主契約タイプ checkbox group * (複数選択可, brand-filtered)
    │       │   ├── サービス種別判定 checkbox → (if checked) サービス種別 checkbox group * (複数選択可)
    │       │   ├── Alert 「オプションの有無を問わず起動します」 (全て / all types + サービス種別判定)
    │       │   └── ゲートストップ条件 info box (only when 機器タイプ = 入館ゲート)
    │       ├── Card: 備考 (Textarea, optional)
    │       └── Footer actions (border-t)
    │           ├── submitError text: 未入力の項目があります
    │           ├── キャンセル → confirmDiscard → navigate("equipment-list")
    │           └── 登録 (create) | 更新 (edit) → handleSubmit
    └── AlertDialog → 離脱確認 (unsaved-changes discard dialog)
```

- Minimum supported width: 768 px (project standard)
- Content container max width: 960 px, centered
- Required fields use `RequiredMark`; optional fields use `OptionalMark`

---

## UI Element Traceability

### Section 1 — 基本情報 (Basic Info)

| Field Label      | Control          | Required | Validated on submit              | Default (create / edit) | Source Requirement                                                              |
| ---------------- | ---------------- | -------- | -------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| 接続機器ID       | Input (disabled) | —        | —                                | （自動採番） / `1`      | FR-003 — 機器IDはシステムが自動採番                                             |
| 機器名           | Input            | ✅       | ✅                               | "" / タンニングマシン A | FR-003 — 機器名（必須）                                                         |
| 機器タイプ       | Select           | ✅       | ✅                               | "" / タンニングマシン   | FR-003 — 機器タイプ（必須）                                                     |
| シリアルナンバー | Input            | ✅       | ✅                               | "" / SN-20250101-001    | FR-003 — シリアルナンバー（必須）                                               |
| 設置場所         | Input            | ✅       | ✅                               | "" / 1F入口             | FR-003 — 設置場所（必須）                                                       |
| 設置日           | DatePicker       | ✅       | ✅                               | "" / 2025-02-16         | FR-003 — 設置日（必須）                                                         |
| 状態             | Select           | ✅       | ❌ (has default)                 | 正常 / 正常             | FR-003 — 状態（必須・初期推奨「正常」）; all 4 states selectable on create (Q5) |
| 認証方式         | RadioGroup       | ✅       | ✅ (required, Update 2026-06-30) | （未選択）/ 会員読取型  | FR-003 / **FR-009**                                                             |

**機器タイプ options** (E-02 §機能の定義 — 機器タイプ; 退館ゲート and the 入館ゲート rename: Session 2026-11-09): 入館ゲート / 退館ゲート / 水素水サーバー / 体組成計 / タンニングマシン / プロテインサーバー / その他

**状態 options** (E-02 §機器状態 — 4 states): 正常 / 異常 / メンテナンス中 / 廃棄

**認証方式 options (FR-009)**: 会員読取型 (member scans device QR) / 機器読取型 (device reads member QR) / なし (no authentication)

### Section 2 — 接続情報 (Connection Info)

| Field Label        | Control                 | Required marker | Validated on submit              | Default (edit) | Source Requirement                                              |
| ------------------ | ----------------------- | --------------- | -------------------------------- | -------------- | --------------------------------------------------------------- |
| 接続先接点制御装置 | Picker (search, FR-007) | ✅              | ✅ (required, Update 2026-06-30) | 装置ID: 2      | FR-003 — 接続先接点制御装置（必須）; picker tied to FR-007 (Q7) |
| IPアドレス         | Input                   | — (optional)    | —                                | 192.168.1.101  | FR-003 — IPアドレス（任意）                                     |
| MACアドレス        | Input                   | — (optional)    | —                                | "" (empty)     | FR-003 — MACアドレス（任意）                                    |

> `接続先ポート番号` was **removed** from this form on 2026-09-08 — see §Clarifications 2026-09-08. The prototype form has no such field and API-103's create body accepts none; 接点制御先番号 is assigned server-side and shown read-only on the detail screen.

> 接続先接点制御装置 is a **picker bound to FR-007 controller records** (Q7), surfaced via a search field ("店舗名で検索"). It stores the selected controller's identifier; the picker is scoped to the device's store. It is **submit-blocking required** (Update 2026-06-30): leaving it empty shows a red border + error on 保存. The exact picker UX (modal vs inline list) is Deferred to Plan.

### Section 3 — 利用制御ルール (Usage Control Rule) — FR-008

Header note (verbatim): 「起動を許可する条件を1つ以上設定してください。両方を設定すると、どちらか一方を満たせば起動します。」 — OR logic across selected judgment types.

| Control                     | Reveals when checked                                                     | Options                                                                                                                                                                      | Source Requirement                             |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 主契約判定 (checkbox)       | 対象の主契約タイプ radio (req) → 主契約タイプ checkbox group (req, 複数) | 全て / タイプを指定 → G-01: 通常会員 / 1Day Pass / 家族会員 / キッズ会員 / 学生会員 / 法人会員 / 福利厚生 / プリペイド会員 / 特殊契約 (FIT365: 6, no キッズ・学生・福利厚生) | FR-008 — 主契約判定 (Session 2026-11-09)       |
| サービス種別判定 (checkbox) | サービス種別 checkbox group (req, 複数)                                  | プロテイン / サプリメント / 日焼け / コラーゲン / 水素水 / 体組成計 / シャワー                                                                                               | FR-008 v2 — サービス種別判定                   |
| ゲートストップ条件 info box | shown only when 機器タイプ = 入館ゲート (never for 退館ゲート)           | static text (① ブラックリスト ② 未納 ③ 家族会員利用中)                                                                                                                       | FR-008 — gate-stop auto-applied (display only) |

- ~~主契約タイプ is a **single** Select~~ — superseded 2026-11-09: 「全て」 or several types (OR), see §Session 2026-11-09.
- **課金種別 (通常/都度) is not a judgment axis** (FR-008 v2): when several options share a service type, any one of them being active permits start-up (OR). The form states this verbatim under the checkbox group: 「課金種別（通常/都度）は問いません。同じサービス種別のオプションが複数ある場合、いずれか1つが有効であれば起動を許可します」.
- The two judgment checkboxes are independent, but **at least one must be selected** — saving with neither raises 「主契約判定かサービス種別判定のどちらかを設定してください。設定がないと、この機器は誰も起動できません」 above the group (Session 2026-09-10, wording 2026-11-09; FR-008 異常系).
- When a judgment checkbox is **checked**, its 種別 selection is **required** (主契約判定 needs 全て / タイプを指定, and タイプを指定 ≥1 type; サービス種別 must have ≥1 checked, else 「サービス種別を1つ以上選択してください」); when **unchecked**, it is not required and any previously chosen value is discarded on save (Q4).
- サービス種別 values are the **G-02-managed service types** — the same set the option master uses, which is why the prototype shares one list; billing type never appears in it.
- The ゲートストップ条件 note is informational only — these conditions are auto-applied by the system for entry/exit gates and are not configurable on this form (Q6).

### Section 4 — 備考 (Remarks)

| Field | Control                   | Required     | Source Requirement    |
| ----- | ------------------------- | ------------ | --------------------- |
| 備考  | Textarea (max 1000 chars) | — (optional) | FR-003 — 備考（任意） |

### Footer Actions

| Element            | Behavior                                                                    | Source Requirement             |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------ |
| Error hint         | "未入力の項目があります" shown when submit validation fails                 | FR-003 異常系 — 必須項目未入力 |
| キャンセル button  | Triggers unsaved-changes guard; if confirmed, navigates to `equipment-list` | Standard UX                    |
| 登録 / 更新 button | `登録` in create, `更新` in edit; runs validation then submits              | FR-003 / FR-005                |

### Unsaved-Changes Guard (離脱確認 dialog)

| Element        | Content                                                    |
| -------------- | ---------------------------------------------------------- |
| Title          | 変更を破棄しますか？                                       |
| Description    | 未保存の変更はすべて失われます。この操作は取り消せません。 |
| Cancel action  | 編集を続ける (keep editing)                                |
| Confirm action | 破棄する (discard) → proceeds with the pending navigation  |

- Any field change calls `markDirty()`; leaving via back link or キャンセル while dirty opens this dialog.
- On successful submit, the dirty flag is cleared before navigation (no discard prompt).

---

## Behavioral Logic

**Source**: `equipment-form.tsx` (`validate`, `handleSubmit`, conditional rendering)

1. **Create vs Edit**: `mode` prop drives page title (新規登録 / 編集), submit label (登録 / 更新), success toast text, and edit-mode prefilled values. 接続機器ID is read-only — shows "（自動採番）" in create and the existing ID in edit.
2. **Validation (on submit)** — submit-blocking required fields (resolved):
   - Always: 機器名, 機器タイプ, シリアルナンバー, 設置場所, 設置日 (prototype set, Q1).
   - Plus: 認証方式 and 接続先接点制御装置 (Update 2026-06-30).
   - Plus: **at least one** judgment (主契約判定 or サービス種別判定) — 「契約種別を選択してください」 when neither is on (Session 2026-09-10).
   - Conditional: 主契約タイプ / サービス種別 — each required **only** while its parent judgment checkbox is checked (Q4); サービス種別 needs ≥1 value.
   - On failure: per-field errors plus a global hint "未入力の項目があります" appear, and the view scrolls to the first invalid field. Inline field errors clear as the user provides a valid value.
3. **状態 default** (Q5): 状態 always has a default (正常) and all four states are selectable on create.
4. **Usage-control rule requires a judgment** (Session 2026-09-10): submitting with **no** judgment checkbox selected raises FR-008 異常系 "契約種別未選択 → エラー", rendered above the two judgments.
5. **Conditional reveal**: A judgment's 種別 control renders only while its checkbox is checked; unchecking discards its value on save (Q4). The gate-stop info box renders only while 機器タイプ = 入館ゲート (not for 退館ゲート — Session 2026-11-09), and is display-only (Q6).
6. **Submit success**: clears errors, clears dirty flag, shows toast (`接続機器を登録しました` / `接続機器の変更を保存しました`), and navigates to `equipment-list`.

---

## UI States

**Prototype implementation note**: `equipment-form.tsx` uses local React state and mock defaults. No server loading, fetch-error, or save-error states are implemented.

| State                     | Behavior in prototype                                        | Expected (Deferred to Plan)                                                 |
| ------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Create — empty**        | All fields empty/default; ID shows "（自動採番）"            | Default create state                                                        |
| **Edit — prefilled**      | Fields populated from the equipment record                   | Fetch existing equipment by ID, then render populated form                  |
| **Validation error**      | Per-field error text + global hint + scroll-to-first-invalid | Same; enforced set = prototype 5 + 認証方式 / 接点制御装置 + judgment rules |
| **Submitting**            | Not represented                                              | Disable submit / show progress while saving (Plan)                          |
| **Save success**          | Toast + navigate to list                                     | Same, after server confirmation                                             |
| **Save / fetch error**    | Not represented                                              | Error feedback + retain entered data (Plan)                                 |
| **Unsaved-changes guard** | `discardDialogOpen` via `useUnsavedChanges`                  | Same                                                                        |

---

## User Scenarios & Testing

### User Story 1 — Register a New Connected Device (Priority: P1)

**As** a Staff or Headquarter user,  
**I need** to register a newly installed connected device with its basic info, controller connection, authentication method, and usage-control rules,  
**So that** the device is tracked in the store ledger and can authorize members per their contracts.

**Why this priority**: FR-003 is the primary create path and the prerequisite for every downstream device operation.

**Independent Test**: Open the form in create mode, fill all required fields, configure a usage-control rule, submit, and confirm navigation back to the list with a success toast.

**Acceptance Scenarios**:

1. **Given** the form opens in create mode, **When** it renders, **Then** the title shows 接続機器 新規登録, the submit button reads 登録, and 接続機器ID shows "（自動採番）" (read-only).
2. **Given** the user leaves required fields empty, **When** they click 登録, **Then** per-field errors appear for 機器名, 機器タイプ, シリアルナンバー, 設置場所, 設置日, 認証方式 and 接続先接点制御装置, the hint "未入力の項目があります" is shown, and the view scrolls to the first invalid field.
3. **Given** all submit-blocking required fields are filled and at least one usage-control judgment is configured, **When** the user clicks 登録, **Then** a success toast "接続機器を登録しました" appears and the user is navigated to `equipment-list`.
4. **Given** the 接続先接点制御装置 picker, **When** the user searches, **Then** controller records from FR-007 (scoped to the device's store) are offered for selection, and the chosen controller's identifier is stored.
5. **Given** the user selects 機器タイプ = 入館ゲート, **When** viewing the 利用制御ルール section, **Then** the gate-stop conditions info box (ブラックリスト / 未納 / 家族会員利用中) is displayed as read-only information; with 退館ゲート it is not shown.
6. **Given** the user has entered data, **When** they click キャンセル or the back link, **Then** the discard confirmation dialog appears before leaving.

---

### User Story 2 — Edit an Existing Connected Device (Priority: P1)

**As** a Staff or Headquarter user,  
**I need** to open an existing device in edit mode and update its information,  
**So that** the ledger stays accurate after configuration or hardware changes.

**Why this priority**: FR-005 reuses the same validation as FR-003 and is core to keeping device data correct.

**Independent Test**: Open the form in edit mode, confirm fields are prefilled, change a value, submit, and confirm the update toast and navigation.

**Acceptance Scenarios**:

1. **Given** the form opens in edit mode, **When** it renders, **Then** the title shows 接続機器 編集, the submit button reads 更新, and fields are prefilled with the existing record's values.
2. **Given** prefilled equipment of type タンニングマシン, **When** the 利用制御ルール section renders, **Then** the checkbox reflecting the existing rule is checked (サービス種別判定) and the saved サービス種別 values (日焼け) are checked in its group.
3. **Given** the user changes a value and clicks 更新, **When** validation passes, **Then** a success toast "接続機器の変更を保存しました" appears and the user is navigated to `equipment-list`.
4. **Given** the user clears a required field and clicks 更新, **When** validation runs, **Then** the same required-field errors as create mode are shown and submission is blocked.

---

### User Story 3 — Configure Usage-Control Rules (Priority: P1)

**As** a Staff or Headquarter user,  
**I need** to define which contract conditions authorize a device to start,  
**So that** only members with valid contracts/options can use the device.

**Why this priority**: FR-008 is the core business value of E-02 — controlling device start-up by contract validity.

**Independent Test**: Toggle each judgment checkbox, confirm the matching 種別 control appears, choose values, and confirm they persist on submit.

**Acceptance Scenarios**:

1. **Given** the 利用制御ルール section, **When** the user checks 主契約判定, **Then** the 「対象の主契約タイプ」 radio (全て / タイプを指定, none selected) appears; choosing タイプを指定 reveals the brand-filtered 主契約タイプ checkboxes.
2. **Given** the user checks サービス種別判定, **When** the section re-renders, **Then** the サービス種別 checkbox group appears (プロテイン / サプリメント / 日焼け / コラーゲン / 水素水 / 体組成計 / シャワー) with its 課金種別を問わない note.
3. **Given** サービス種別判定 is checked with no service type selected, **When** the user submits, **Then** 「サービス種別を1つ以上選択してください」 blocks the save.
4. **Given** neither judgment is checked, **When** the user submits, **Then** 「主契約判定かサービス種別判定のどちらかを設定してください。設定がないと、この機器は誰も起動できません」 is shown above the judgments and the save is blocked.
5. **Given** several service types are checked, **When** the rule is interpreted, **Then** OR semantics apply across judgments **and** across the service types — and within one service type, 課金種別 is ignored (any active option of that type authorizes start-up).
6. **Given** a judgment checkbox is checked but its Select is left empty, **When** the user submits, **Then** submission is blocked with a required error on that Select (Q4).
7. **Given** no judgment checkbox is selected, **When** the user submits an otherwise valid form, **Then** the device is saved with no usage-control rule (allowed — Q3).
8. **Given** a judgment checkbox was checked with a value then unchecked, **When** the user saves, **Then** that hidden Select value is discarded and not persisted (Q4).

---

### User Story 4 — Set Authentication Method (Priority: P2)

**As** a Staff or Headquarter user,  
**I need** to set how members authenticate at the device,  
**So that** the correct QR authentication flow is applied for that device type.

**Why this priority**: FR-009 (Should) defines per-device authentication and complements the usage-control rule.

**Independent Test**: Select each authentication method radio option and confirm the choice is captured on submit.

**Acceptance Scenarios**:

1. **Given** the 認証方式 field, **When** the form renders, **Then** three options are available: 会員読取型, 機器読取型, なし.
2. **Given** edit mode for an existing device, **When** the form renders, **Then** the saved authentication method (e.g., 会員読取型) is preselected.
3. **Given** the user selects an authentication method, **When** they submit a valid form, **Then** the selected method is saved with the device record.

---

### Edge Cases

- 認証方式 and 接続先接点制御装置 left empty → submission blocked with a required error + red border (Update 2026-06-30; supersedes the original Q1 "not submit-blocking" decision).
- Submitting with no usage-control judgment selected → blocked with 「主契約判定かサービス種別判定のどちらかを設定してください。設定がないと、この機器は誰も起動できません」 above the judgments (Session 2026-09-10 / 2026-11-09).
- 主契約判定 checked with no scope → 「「全て」か「タイプを指定」を選択してください」; タイプを指定 with no type ticked → 「主契約タイプを1つ以上選択してください」 (Session 2026-11-09).
- サービス種別判定 checked but no service type ticked → blocked with 「サービス種別を1つ以上選択してください」 (Session 2026-09-10).
- Judgment checkbox unchecked after a value was chosen → value discarded on save (Q4).
- Leaving the form with unsaved changes → discard confirmation dialog (破棄する / 編集を続ける).
- Switching 機器タイプ away from 入館ゲート (including to 退館ゲート) hides the gate-stop info box; switching to it shows it.
- All four statuses (正常 / 異常 / メンテナンス中 / 廃棄) selectable at creation (Q5).
- Network/API failure on save → toast error + retain entered data (Deferred to Plan).

---

## Requirements

### Functional Requirements (Phase 1)

- **FR-003**: System MUST allow authorized users to register a new connected device, capturing 機器名 (required), 機器タイプ (required), シリアルナンバー (required), 設置場所 (required), 設置日 (required), 状態 (required, default 正常, all four states selectable), 認証方式, 接続先接点制御装置 (required, FR-007 picker), IPアドレス (optional), MACアドレス (optional), 紐づき契約種別 (usage-control rule, ≥1 judgment required), and 備考 (optional, max 1000 chars). 接点制御先番号 is assigned server-side and is NOT a form field (Session 2026-09-08). 接続機器ID MUST be system-assigned and read-only. On successful registration, the system MUST confirm with a success message and return the user to the equipment list. For 機器タイプ エリア扉 the form MUST instead require exactly one エリア from the E-02 FR-016 area master, limited to the brand group of the controller's store, and show its 性別の条件 read-only (Session 2026-11-19).
- **FR-005**: System MUST allow authorized users to edit an existing connected device using the same form and the same input validation as FR-003, with all fields prefilled from the existing record. On successful update, the system MUST confirm and return the user to the equipment list.
- **FR-VAL-001** (Validation): System MUST block submission, surface field-level errors plus a global "未入力の項目があります" hint, and focus/scroll to the first invalid field when any **submit-blocking** required input is missing. The submit-blocking set is: 機器名, 機器タイプ, シリアルナンバー, 設置場所, 設置日, 認証方式, 接続先接点制御装置 (Update 2026-06-30), at least one usage-control judgment, plus each checked judgment's 種別 selection.
- **FR-007-PICK** (Controller selection): The 接続先接点制御装置 field MUST be a picker bound to FR-007 controller records, scoped to the device's store, storing the selected controller's identifier.
- **FR-008**: System MUST allow configuring per-device usage-control rules via two independent judgment axes — 主契約判定 (「全て」 or one or more 主契約タイプ, OR; the types narrowed by the store's brand) and サービス種別判定 (サービス種別, multi-select) — where satisfying any one selected condition authorizes device start-up (OR logic). 課金種別 (通常/都度) MUST NOT be part of the judgment: when several options share a service type, any one of them being active MUST authorize start-up. Selecting at least one judgment IS mandatory (FR-008 異常系). When a judgment checkbox is checked, its 種別 selection MUST have a value (サービス種別: ≥1); unchecking a judgment discards its value. For 入館ゲート (not 退館ゲート), the system MUST display the auto-applied gate-stop conditions (blacklist / arrears / family-member-in-use) as a read-only informational note (no per-device configuration). An エリア扉 takes no judgment axes: it opens by the E-02 FR-008 エリア判定 of its area, and the form shows the エリア扉 auto-applied conditions note instead (Session 2026-11-19).
- **FR-009**: System MUST allow setting the device authentication method to one of 会員読取型, 機器読取型, or なし, and persist it with the device record.
- **FR-NAV-001** (Unsaved changes): System MUST warn the user with a discard confirmation (変更を破棄しますか？) before navigating away (back link or キャンセル) while there are unsaved changes, and MUST NOT prompt after a successful save.

### Key Entities

- **Connected Equipment (接続機器)**: Store-scoped device record. Attributes: ID (system-assigned), name, type, serial number, location, install date, status, authentication method, controller reference (接続先接点制御装置), IP address, MAC address, usage-control rule, remarks. 接点制御先番号 is server-assigned and detail-only.
- **Usage Control Rule (利用制御ルール)**: One or more judgment conditions per device — main-contract judgment (with a single 主契約タイプ) and service-type judgment (with one or more サービス種別) — combined with OR semantics; 課金種別 is not a condition. Gate-stop conditions auto-applied for entry gates (入館ゲート) only — never at an exit gate.
- **Authentication Method (認証方式)**: One of 会員読取型 / 機器読取型 / なし.
- **Equipment Type (機器タイプ)**: One of 入館ゲート / 退館ゲート / 水素水サーバー / 体組成計 / タンニングマシン / プロテインサーバー / その他 (`entry_gate` = check-in only, `exit_gate` = check-out only; Session 2026-11-09).
- **Equipment Status (状態)**: One of 正常 / 異常 / メンテナンス中 / 廃棄 (default 正常).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Authorized users can register a new connected device (fill required fields + one usage-control rule) and reach the success confirmation in under 3 minutes.
- **SC-002**: 100% of submissions missing an enforced required field are blocked, with the first invalid field brought into view.
- **SC-003**: Users editing an existing device see all previously saved values prefilled with zero manual re-entry of unchanged fields.
- **SC-004**: A configured usage-control rule (any combination of the two judgment axes, including multiple サービス種別) is saved and re-displayed identically when the device is reopened in edit mode.
- **SC-005**: Authentication method selected on save matches what is displayed on the device detail screen (`006-equipment-detail`).
- **SC-006**: Users never lose unsaved edits silently — every navigation away with pending changes prompts a discard confirmation.

---

## Assumptions

- This form is reached from the equipment list (`equipment-list`): "新規登録" for create and a row/detail action for edit.
- 接続機器ID auto-numbering is performed server-side; the form only displays it read-only.
- The 接続先接点制御装置 field is a picker bound to FR-007 controller records, scoped to the device's store, storing the controller identifier (Q7); the exact picker UX is Deferred to Plan.
- 主契約タイプ is a single value (single Select), per the E-02 design decision (FR-008 単数実装).
- サービス種別 values may be brand-extended; the prototype list is the FIT365 baseline (E-02 §ブランド別差異 — FIT365 先行, JOYFIT 同構造).
- Role-based access to open/submit the form is enforced upstream per E-02 §権限マトリクス; the form itself is permission-agnostic in the prototype.
- Server loading, save-error, and submit-in-progress states are added during implementation (not in prototype).
- Required validation follows the prototype set plus the clarified additions (認証方式 / 接続先接点制御装置 required; checked judgments' 種別 required; ≥1 judgment required per FR-008 異常系) — Q1, Q4 and Session 2026-09-10.

---

## Q&A / Clarification — Resolved (Session 2026-06-25)

> All items resolved by the user. No open clarifications remain. Rows struck through were superseded by a later session — see §Clarifications.

| #   | Topic                              | Resolution                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Required-field validation coverage | **Follow the prototype.** Submit-blocking = 機器名 / 機器タイプ / シリアルナンバー / 設置場所 / 設置日. ~~認証方式 and 接続先接点制御装置 are not submit-blocking.~~ **Update 2026-06-30: 認証方式 and 接続先接点制御装置 are now submit-blocking required (field-level validation).** |
| Q2  | 接続先ポート番号 field             | ~~**Official Phase 1 field and required**~~ — **superseded 2026-09-08**: removed from the form; 接点制御先番号 is server-assigned.                                                                                                                                                     |
| Q3  | Usage-control rule mandatory-ness  | ~~**Not mandatory.**~~ — **superseded 2026-09-10**: ≥1 judgment (主契約判定 or サービス種別判定) is **required**; FR-008 異常系 is enforced.                                                                                                                                           |
| Q4  | Conditional Select requiredness    | **Required only while its checkbox is checked.** Unchecking discards the value on save (サービス種別: ≥1 value while checked).                                                                                                                                                         |
| Q5  | 状態 selectable on create          | **All four** statuses (正常 / 異常 / メンテナンス中 / 廃棄) selectable.                                                                                                                                                                                                                |
| Q6  | Gate-stop note vs configuration    | **Display-only** for 入館ゲート (入退館ゲート before the 2026-11-09 split; never for 退館ゲート); no per-device configuration.                                                                                                                                                         |
| Q7  | Controller field resolution        | **Picker tied to FR-007** controller records, scoped to the device's store; stores the controller identifier.                                                                                                                                                                          |

### Added 2026-10-12 (integration PO decisions)

| #   | Topic                       | Resolution                                                                                                                                                                                                                               |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q8  | 出力ポート (relay contact)  | **Add to the form** — Select 1–8, required when 認証方式 ≠ なし, cleared when なし, taken ports labelled 使用中 but selectable (Session 2026-11-09; were disabled). Supersedes Q2's 2026-09-08 removal. FE-only (API-103 has the field). |
| Q9  | サービス種別 single / multi | **Multiple** (prototype). BE to accept `allowedServiceTypes[]` on `PUT …/usage-control`; single-value guard stays until then (integration B2, Round 2).                                                                                  |
