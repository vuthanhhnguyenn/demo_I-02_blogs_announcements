# Feature Specification: E-02 FR-016 Area Master (エリアマスタ管理)

**Feature Branch**: `feat/e02-area-master`
**Created**: 2026-11-19
**Status**: Draft — written from the PO spec and the prototype; no PO clarification round yet
**PO Spec**: `E-02` — 店舗機器管理, FR-016 エリアマスタ管理 (added in `261107_v5`; read at `261109_v6`, `fitness-spec@9e0e07e`)
**Source**: `.cache/fitness-crm-ui/src/pages/area-master.tsx` @ `9428dc2` (design PR #42, 2026-11-12), `src/data/facility-areas.ts`, `src/components/available-areas.tsx`, `src/pages/shared-sidebar.tsx`
**API**: `GET/POST /api/v1/admin/areas`, `GET/PATCH/DELETE /api/v1/admin/areas/{areaId}` (`src/lib/openapi.real.json`)
**Input**: "ladyroom" — Dev Q&A 「【E-02】利用制御ルールにエリア判定を追加（レディースエリア等のエリア扉）」

**Related specs** (the consumers of an area — each owns its own screen):

- [007-equipment-form](../007-equipment-form/spec.md) / [006-equipment-detail](../006-equipment-detail/spec.md) / [029-equipment-list](../029-equipment-list/spec.md) — 機器タイプ エリア扉 picks one area.
- [023 G-01 主契約](../../023-main-contract-management/spec.md) and [026 G-02 オプション](../../026-option-management/spec.md) — 「利用できるエリア」.
- [032 会員詳細](../../032-member-detail/tabs/spec.md), [019 会員一覧](../../019-member-list/spec.md), [025 入会申請](../../025-enrollment-application-mgmt/spec.md) — sale / grant limited by the area's 性別の条件.

---

## Clarifications

### Session 2026-11-19 — initial spec (E-02 v5 + prototype 11/12)

- Q: Where does the screen live? → A: Route `/area-master`; sidebar entry 「エリアマスタ管理」 in the 施設設備管理 group (prototype `shared-sidebar.tsx`). **One page**: the list plus a right-hand sheet that has three modes (見る / 登録 / 編集). The delete confirmation is an AlertDialog on top of the sheet.
- Q: What is an area scoped to? → A: A **brand group** — JOYFIT or FIT365 (E-02 FR-016 「ブランド単位で登録」). JOYFIT sub-brands (JOYFIT24 / JOYFIT YOGA / JOYFIT+) use the JOYFIT areas. The ブランド is chosen on create and is **immutable** afterwards (prototype 「登録後は変更できません」; API `brandGroup` immutable → 400 `E-VAL-001`), because the 主契約 / オプション / エリア扉 of that brand already point at it.
- Q: Default 性別の条件? → A: **None.** The user must choose なし / 女性のみ / 男性のみ. Defaulting to なし would silently save a forgotten 女性専用エリア as open to everyone (prototype note).
- Q: Can an area in use be deleted? → A: **No** (E-02 FR-016 異常系). The 削除 button is disabled with a tooltip naming the usage; the API refuses with 409 `E-ARE-002` (race).
- Q: Can 性別の条件 change while the area is in use? → A: **Yes.** The change applies at once to who the 主契約 / オプション with this area are sold to and who its doors open for (API PATCH description). The edit sheet warns about it (prototype-only copy); saving is not blocked.
- Q: Who can do what? → A: The E-02 「エリアマスタ管理（FR-016）の権限」 table: System / Headquarter register, edit and delete; Manager / Staff / Observer read only; Trainer has no access. Manager and Staff still **pick** areas on an エリア扉 (equipment write) — they just cannot change the master.
- Q: What does a store-scoped role see under 使われている所? → A: Only the doors of its own stores, plus 「ほかの店舗の扉 {n}台は表示していません」; Observer sees 主契約 / オプション as counts only, without names or links (prototype-only; API `AreaUsageDto.doors` returns every store's doors).
- Q: Does the header store switcher narrow the list? → A: **No** — a brand-level master, like the other brand-scoped lists (prototype).
- Q: Duplicate エリア名 in one brand group? → A: **Open** — the PO spec, the prototype and the API are all silent. Not blocked by the CRM; raise with the PO.

---

## Scope

### In scope

- エリアマスタ list: search, ブランド filter, paging, header count.
- Sheet: 見る (read + 使われている所 + 最終変更), 登録, 編集; discard guard.
- 削除 with the usage guard.
- Role gating per the FR-016 permission table.

### Out of scope

- **The エリア扉 door judgement** (E-02 FR-008 エリア判定, 処理順 ①–⑤, 家族会員利用中 check, app messages) — runs in the member app (APP-G-01) and the gate API, not in the CRM.
- **The consumers' screens** — エリア扉 config (007), 利用できるエリア on 主契約 (023) / オプション (026), and sale gating (032 / 019 / 025). They are specified in their own specs.
- **Release timing** — E-02 says FR-016 ships with the nationwide release, not with the 11/18 八潮店 limited release.

---

## Feature Overview

Headquarter registers, per brand group, the in-store areas whose entrance is an エリア扉 (e.g. 女性専用エリア, プレミアムプラン会員専用エリア). Each area has a name and a 性別の条件 (なし / 女性のみ / 男性のみ). Areas are then chosen:

- by an **エリア扉** (one area per door, E-02 FR-003);
- by a **主契約** and an **オプション** as their 「利用できるエリア」 (G-01 FR-M002, G-02 FR-002): a member with a valid 主契約 or オプション that includes the door's area may open it (E-02 FR-008).

An area with a 性別の条件 also limits **who that 主契約 / オプション may be sold or granted to** — only 女性 matches 女性のみ, only 男性 matches 男性のみ; その他 / 回答しない / 未設定 match neither (E-02 FR-008, FR-016).

---

## Actors & Access Control

| Role        | 一覧・参照 | 登録・編集・削除 | Notes                                                                               |
| ----------- | ---------- | ---------------- | ----------------------------------------------------------------------------------- |
| System      | ○          | ○                |                                                                                     |
| Headquarter | ○          | ○                |                                                                                     |
| Manager     | ○          | ×                | 使われている所: only 管轄店舗 doors                                                 |
| Staff       | ○          | ×                | 使われている所: only 所属店舗 doors                                                 |
| Observer    | ○          | ×                | 使われている所: 所属店舗 doors; 主契約 / オプション as counts only (prototype-only) |
| Trainer     | ×          | ×                | No sidebar entry (the 施設設備管理 group is hidden); direct URL refused; API 403    |

Denied write controls stay visible but disabled with a reason (`RoleGatedButton`): 「エリアの登録は本部のみ可能です」 / 「エリアの編集は本部のみ可能です」 / 「エリアの削除は本部のみ可能です」. A write replayed by Manager / Staff / Observer → 403 `E-AUTH-103`.

---

## Component Hierarchy & Layout

```text
SharedSidebar (currentPage = area-master) · SharedHeader
PageHeader (outside)
  title 「エリアマスタ管理」 + count badge (all areas)
  subtitle 「エリア扉で入れる人を決める館内のエリアを、ブランドごとに登録します」
  action [エリアを登録] (RoleGated)
main
  Toolbar: search 「エリア名・備考で検索...」 · ブランド select (全ブランド / JOYFIT / FIT365, always expanded)
  Table (sticky header): エリアID · エリア名 · ブランド · 性別の条件 · 備考 · 使われている所 · 最終変更
  Pagination footer: 「全 {N} 件 / {P} ページ / {a}-{b} を表示」 · 前へ / 次へ · 表示件数 25 / 50 / 100件
Sheet (right)
  ① header: 見る = エリア名 + 性別の条件 badge (none for なし) · 登録 = 「エリアを登録」 · 編集 = 「エリアを編集」
  ② body: read rows (見る) or the form (登録 / 編集)
  ③ footer: 見る = [削除] (left) · [編集] · 登録 / 編集 = [キャンセル] · [登録する] / [変更を保存する]
AlertDialog 「エリアを削除しますか？」 (over the sheet)
AlertDialog 「変更を破棄しますか？」 (discard)
```

---

## UI Element Traceability

### List

| Element             | Content / behaviour                                                                                                                           | Source                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| エリアID            | `AR-###` (server-assigned `areaCode`), never the UUID                                                                                         | FR-016 自動採番; API              |
| エリア名            | as stored                                                                                                                                     | FR-016                            |
| ブランド            | JOYFIT / FIT365                                                                                                                               | FR-016 ブランド単位               |
| 性別の条件          | `なし` as muted text; `女性のみ` / `男性のみ` as an outline badge                                                                             | prototype                         |
| 備考                | as stored                                                                                                                                     | FR-016                            |
| 使われている所      | `エリア扉 {n}台・主契約 {n}件・オプション {n}件` in that order, zero parts omitted; all zero → `未使用`                                       | prototype; API `usageCounts`      |
| 最終変更            | date-time (JST) + staff name                                                                                                                  | FR-016 「変更者・変更日時を記録」 |
| Row click           | opens the sheet in 見る                                                                                                                       | prototype                         |
| Empty — filtered    | the shared filtered-empty state (entity エリア) with 「条件をクリア」                                                                         | prototype                         |
| Empty — brand only  | 「{brand} のエリアはまだありません」 / 「主契約・オプション・エリア扉で選ぶエリアを登録します」; its 登録 opens the sheet with that brand set | prototype                         |
| Empty — none at all | 「エリアはまだありません」 + the same description                                                                                             | prototype                         |

### Sheet — 見る

Rows: ブランド · エリアID · エリア名 · 性別の条件 · 備考 · **使われている所** · 最終変更.
使われている所 groups: 「主契約 {n}件」 (links → 主契約詳細), 「オプション {n}件」 (links → オプション詳細), 「エリア扉 {n}台」 (links `{店舗名}・{機器名}` → 接続機器詳細); none → 「どこにも使われていません」.

### Sheet — 登録 / 編集

| Field      | Control                                    | Rule                                                                                                                                                             |
| ---------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ブランド   | Select (placeholder 「ブランドを選択」)    | Required on 登録 (「ブランドを選択してください」); pre-set from the list's ブランド filter, empty under 全ブランド; 編集: read-only + 「登録後は変更できません」 |
| エリアID   | read-only                                  | 登録: 「登録時に自動で採番されます」; 編集: `AR-###`                                                                                                             |
| エリア名   | Input (placeholder 「例: 女性専用エリア」) | Required (「エリア名を入力してください」); max 100 (API)                                                                                                         |
| 性別の条件 | Radio なし / 女性のみ / 男性のみ           | Required, **no default** (「性別の条件を選択してください」)                                                                                                      |
| 備考       | Textarea                                   | Optional; max 1000                                                                                                                                               |

編集 of a used area whose 性別の条件 is changed shows: 「このエリアを使う{主契約 n件・オプション n件の販売・付与の相手と、扉 n台を開けられる人}が変わります」 (parts with 0 omitted). Saving is not blocked.

### Dialogs and toasts

| Element        | Copy                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Delete dialog  | 「エリアを削除しますか？」 / 「『{name}』（{brand}）を削除します。この操作は取り消せません。」 / キャンセル · 削除する                                                                           |
| Delete blocked | 削除 disabled; tooltip 「{使われている所}で使われているため削除できません。使われている所から外すと削除できます」 + 「（契約者がいる主契約は編集できないため外せません）」 when a 主契約 uses it |
| Discard dialog | 「変更を破棄しますか？」 / 「未保存の変更はすべて失われます。この操作は取り消せません。」                                                                                                        |
| Toasts         | 「エリアを登録しました」 · 「エリアの変更を保存しました」 · 「「{name}」を削除しました」                                                                                                         |

---

## Behavioral Logic

1. **List**: エリアID order; search = partial, case-insensitive on エリア名 **and** 備考 (API `keyword`, ≤ 100); ブランド filter (API `brandGroup`); both AND. The header count is all areas (`includeTotalAll`), not the filtered total.
2. **Delete button**: permission is checked first (deny tooltip for non-HQ roles), usage second (blocked tooltip). An unused area opens the confirm dialog.
3. **Create**: the sheet opens with ブランド = the list filter's value (or empty under 全ブランド). After 登録する the server assigns `AR-###`; the list and the count refresh.
4. **Edit**: ブランド locked; 性別の条件 change on a used area shows the note above.
5. **Discard**: closing or cancelling a dirty sheet asks 「変更を破棄しますか？」; a clean sheet closes without asking.
6. **Effects outside this screen**: an area's name and 性別の条件 are read live by its consumers — the エリア扉 detail / list, the 主契約 / オプション read-outs, and the sale candidate lists (A-01 / C-01) change on their next load.

---

## UI States

| State             | Behaviour                                                                           |
| ----------------- | ----------------------------------------------------------------------------------- |
| Loading           | table skeleton                                                                      |
| Load error        | the project's standard list error with 再試行                                       |
| Empty             | the three empty states above                                                        |
| Saving / deleting | buttons disabled while the request is in flight (no double submit)                  |
| Not found (stale) | an area deleted elsewhere → 404 `E-ARE-001` → message, sheet closes, list refreshes |
| In use on delete  | 409 `E-ARE-002` (race) → message; the area stays                                    |

---

## User Scenarios & Testing

### User Story 1 — Register an area (Priority: P1)

Headquarter registers 「女性専用エリア」 for JOYFIT with 性別の条件 女性のみ so that a door, a 主契約 and an オプション can use it.

1. **Given** HQ on `/area-master`, **When** they click エリアを登録, choose JOYFIT, type the name, choose 女性のみ and click 登録する, **Then** the toast 「エリアを登録しました」 appears and the list shows the new `AR-###` row.
2. **Given** the sheet with no 性別の条件 chosen, **When** 登録する is clicked, **Then** 「性別の条件を選択してください」 is shown and nothing is saved.
3. **Given** the ブランド filter is FIT365, **When** エリアを登録 is clicked, **Then** the sheet opens with ブランド FIT365.

### User Story 2 — Browse and find areas (Priority: P1)

1. **Given** areas in both brand groups, **When** the user types part of a name or a 備考, **Then** matching rows remain (case-insensitive).
2. **Given** the ブランド filter JOYFIT, **Then** only JOYFIT areas are listed, and the header count still shows all areas.
3. **Given** a store-scoped role, **When** they open an area used by doors in several stores, **Then** only their stores' doors are listed plus 「ほかの店舗の扉 {n}台は表示していません」.

### User Story 3 — Edit an area (Priority: P2)

1. **Given** HQ on an area's sheet, **When** they click 編集, change the name and save, **Then** 「エリアの変更を保存しました」 and 最終変更 shows them.
2. **Given** a used area, **When** HQ changes 女性のみ to なし, **Then** the note 「このエリアを使う…が変わります」 is shown, saving succeeds, and the 主契約 / オプション with this area are offered to every member from then on.
3. **Given** the edit sheet, **Then** ブランド cannot be changed.

### User Story 4 — Delete an area (Priority: P2)

1. **Given** an unused area, **When** HQ confirms 削除する, **Then** 「「{name}」を削除しました」 and the row disappears.
2. **Given** an area used by a door / 主契約 / オプション, **Then** 削除 is disabled with the blocked tooltip.

### User Story 5 — Read-only roles (Priority: P2)

1. **Given** Manager / Staff / Observer, **Then** the list and the sheet are readable but 登録 / 編集 / 削除 are disabled with the 本部のみ tooltips.
2. **Given** Trainer, **Then** there is no sidebar entry and `/area-master` is refused.

### Edge Cases

- An area becomes used in another tab while the delete dialog is open → 409 `E-ARE-002`; the area stays.
- An area deleted in another tab, then opened from a stale list → 404 `E-ARE-001`.
- A replayed PATCH with `brandGroup` → 400 `E-VAL-001`.
- 100-character full-width / unbroken エリア名 in the table, the sheet title with its badge, the delete dialog and every consumer picker (layout floor 1024px).
- Two areas with the same name in one brand group — open question (see Clarifications).

---

## Requirements

### Functional Requirements

- **FR-AM-001**: The system MUST list areas of every brand group in エリアID order with the columns エリアID · エリア名 · ブランド · 性別の条件 · 備考 · 使われている所 · 最終変更, paged 25 / 50 / 100.
- **FR-AM-002**: The list MUST support a partial, case-insensitive search on エリア名 and 備考, and a ブランド filter (全ブランド / JOYFIT / FIT365), combined with AND; the header count MUST be the unfiltered total.
- **FR-AM-003**: System / Headquarter MUST be able to register an area with ブランド (required), エリア名 (required, ≤ 100), 性別の条件 (required, no default) and 備考 (optional, ≤ 1000); エリアID is server-assigned (`AR-###`).
- **FR-AM-004**: System / Headquarter MUST be able to edit エリア名, 性別の条件 and 備考; ブランド MUST NOT be editable after registration.
- **FR-AM-005**: Changing the 性別の条件 of an area in use MUST show the impact note and MUST take effect at once for sale and doors.
- **FR-AM-006**: System / Headquarter MUST be able to delete an **unused** area after confirmation; an area used by an エリア扉, a 主契約 or an オプション MUST NOT be deletable (disabled control with the usage reason; server 409 `E-ARE-002`).
- **FR-AM-007**: The sheet MUST show 使われている所 (主契約 / オプション / エリア扉 with links) and 最終変更 (time + staff); store-scoped roles see only their stores' doors; Observer sees 主契約 / オプション counts only.
- **FR-AM-008**: Manager / Staff / Observer MUST have read-only access; Trainer MUST have no access (menu and direct URL). Denied write controls MUST explain why.
- **FR-AM-009**: A dirty sheet MUST ask before discarding.

### Key Entities

- **Area** — `id` (uuid), `areaCode` (`AR-###`), `brandGroup` (`JOYFIT` | `FIT365`, immutable), `name` (≤ 100), `genderCondition` (`none` | `female_only` | `male_only`), `note` (≤ 1000, nullable), `usageCounts` { `planCount`, `optionCount`, `doorCount` }, `createdAt`, `updatedAt`, `updatedBy` / `updatedByName`.
- **AreaUsage** — `plans[]` { id, planCode, name }, `options[]` { id, optionCode, name }, `doors[]` { id, name, storeId, storeName } (all stores).
- **Derived sale condition** (on 主契約 / オプション, not stored on the area) — `genderCondition` `none` / `female_only` / `male_only` / `nobody` (contradicting conditions), from the areas' conditions and, for a 主契約, its 性別制限.

---

## API Contract

| Operation | Endpoint                              | Roles                                             | Errors                                                                  |
| --------- | ------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| List      | `GET /api/v1/admin/areas`             | system / headquarter / manager / staff / observer | 400, 401, 403 (trainer)                                                 |
| Create    | `POST /api/v1/admin/areas`            | system / headquarter                              | 400 `E-VAL-001`, 401, 403 `E-AUTH-103`                                  |
| Detail    | `GET /api/v1/admin/areas/{areaId}`    | as List                                           | 404 `E-ARE-001`                                                         |
| Update    | `PATCH /api/v1/admin/areas/{areaId}`  | system / headquarter                              | 400 `E-VAL-001` (incl. `brandGroup`), 403 `E-AUTH-103`, 404 `E-ARE-001` |
| Delete    | `DELETE /api/v1/admin/areas/{areaId}` | system / headquarter                              | 403 `E-AUTH-103`, 404 `E-ARE-001`, 409 `E-ARE-002` (in use)             |

Consumers: API-103 device `areaId` / `area` → see 007; plan / option `areaIds`, `areas`, `genderCondition` → see 023 / 026; store plan / option `genderCondition`, store campaign `planGenderCondition`, 422 `E-ARE-003` → see 032 / 019 / 025.

---

## Success Criteria

- **SC-AM-001**: HQ registers an area and can pick it on an エリア扉, a 主契約 and an オプション of the same brand group without reloading other screens.
- **SC-AM-002**: No area in use can be deleted, through the UI or the API.
- **SC-AM-003**: A 性別の条件 change is visible on every consumer's next load.
- **SC-AM-004**: Every role sees exactly the access of the FR-016 permission table.

---

## Assumptions

- The CRM side of FR-016 ends at the master and its consumers' settings; the door judgement is the gate API's job.
- 最終変更 shows the last update only; a full change history for areas is not required by FR-016 (「変更者・変更日時を記録する」 is met by `updatedAt` / `updatedByName`).
- Copy and layout the PO spec does not define are taken from the prototype `@9428dc2`; where the PO spec speaks, it wins.
