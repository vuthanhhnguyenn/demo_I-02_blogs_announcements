# Data Model: Y-01 Position Master Management (職位マスター管理)

**Feature**: 017-position-management | **Date**: 2026-07-16
**Sources**: spec.md Key Entities + Clarifications; research.md R1–R14; BE API design (Staff & Permission Management **v0.3**, 2026-07-29); existing `position.schema.ts` / `staff.schema.ts`

---

## 1. Permission catalog (contract in mock schema; served by the catalog endpoint; UI metadata feature-local — research R3/R14)

Three artifacts, bridged only by the OpenAPI-generated client (mock layer is disposable — nothing outside `src/app/api/` imports from it):

1. **Contract**: `PermissionMapSchema` — closed Zod object with the 36 keys below — lives in `src/app/api/_schemas/position.schema.ts` and flows into OpenAPI → `src/lib/api/types.gen`.
2. **Catalog endpoint**: `GET /api/crm/permissions` serves `categoryKey` / `categoryLabel` / `permissionKey` / `label` and the fixed ordering — the SoT for the form's toggles (research R14, spec FR-009a).
3. **UI-only metadata** (helper descriptions, `kind`, destructive set, CSV role defaults): `src/app/(private)/positions/_constants/position-permissions.constant.ts`, typed `satisfies` against the generated permission-map type and joined to the catalog response by `permissionKey`.

### Categories (fixed order, 10) — categoryKey per BE enum (v0.3)

| #   | categoryKey      | categoryLabel | Keys | Notes (vs BE v0.3)                                                      |
| --- | ---------------- | ------------- | ---- | ----------------------------------------------------------------------- |
| 1   | `member`         | 会員管理      | 4    | BE has 10 flags; 6 unexposed in Phase 1                                 |
| 2   | `gate`           | 入退館管理    | 2    | = BE                                                                    |
| 3   | `application`    | 入会申請管理  | 3    | BE has 9; 6 unexposed                                                   |
| 4   | `lesson`         | レッスン管理  | 3    | BE has 9; 6 unexposed                                                   |
| 5   | `facility`       | 施設設備管理  | 3    | = BE                                                                    |
| 6   | `sales`          | 売上管理      | 4    | BE has 6; 2 unexposed (can_confirm_billing, can_add_manual_billing)     |
| 7   | `promotion`      | 商材施策設定  | 3    | = BE                                                                    |
| 8   | `content`        | コンテンツ    | 3    | = BE                                                                    |
| 9   | `system_setting` | システム設定  | 8    | BE has 9; 7 exposed (terms_documents ×2 unexposed) + 1 FE-extension key |
| 10  | `csv_export`     | CSV出力管理   | 3    | Official BE category since v0.3 (FR-S001); BE has 4 (会計CSV unexposed) |

### Permission entries (36) — permissionKey (BE `can_*` naming), label, kind

`BE ✓` = key exists verbatim in the published 58-flag BE catalog (v0.3); `FE-ext` = FE extension, no BE flag (open gap, research R13-open). Labels verbatim from V0 (position-form.tsx:56-154); descriptions are the UI-only helper text merged in by key (the catalog contract has no description field).

| permissionKey                      | Origin | Category       | Label                          | kind | Description (when present in V0)                         |
| ---------------------------------- | ------ | -------------- | ------------------------------ | ---- | -------------------------------------------------------- |
| `can_view_member`                  | BE ✓   | member         | 会員情報の閲覧                 | view | 会員の基本情報・契約情報を参照できます                   |
| `can_edit_member`                  | BE ✓   | member         | 会員情報の編集                 | edit | 会員の基本情報を変更できます                             |
| `can_apply_transfer_suspension`    | BE ✓   | member         | 移籍・休会の申請               | edit | 移籍申請・休会申請を作成できます                         |
| `can_force_withdrawal`             | BE ✓   | member         | 強制退会の実行                 | edit | 会員の強制退会処理を行えます                             |
| `can_view_gate_log`                | BE ✓   | gate           | 入退館履歴の閲覧               | view |                                                          |
| `can_edit_gate_setting`            | BE ✓   | gate           | 入退館設定の変更               | edit |                                                          |
| `can_view_application`             | BE ✓   | application    | 入会申請の閲覧                 | view |                                                          |
| `can_approve_application`          | BE ✓   | application    | 入会申請の承認・却下           | edit |                                                          |
| `can_create_proxy_application`     | BE ✓   | application    | 代理申請の作成                 | edit |                                                          |
| `can_view_lesson_reservation`      | BE ✓   | lesson         | レッスン予約の閲覧             | view |                                                          |
| `can_manage_lesson_reservation`    | BE ✓   | lesson         | レッスン予約の作成・変更       | edit |                                                          |
| `can_manage_lesson_schedule`       | BE ✓   | lesson         | レッスンスケジュールの管理     | edit |                                                          |
| `can_view_facility`                | BE ✓   | facility       | 設備情報の閲覧                 | view |                                                          |
| `can_edit_facility`                | BE ✓   | facility       | 設備情報の編集                 | edit |                                                          |
| `can_manage_locker_contract`       | BE ✓   | facility       | ロッカー契約の管理             | edit |                                                          |
| `can_view_sales`                   | BE ✓   | sales          | 売上データの閲覧               | view |                                                          |
| `can_edit_sales`                   | BE ✓   | sales          | 売上の登録・編集               | edit |                                                          |
| `can_edit_after_billing_confirmed` | BE ✓   | sales          | 請求確定後の変更               | edit | 確定済みの請求データを遡って変更できます                 |
| `can_execute_refund`               | BE ✓   | sales          | 返金処理の実行                 | edit |                                                          |
| `can_view_promotion`               | BE ✓   | promotion      | 商材・キャンペーンの閲覧       | view |                                                          |
| `can_manage_promotion`             | BE ✓   | promotion      | 商材・キャンペーンの作成・編集 | edit |                                                          |
| `can_create_survey`                | BE ✓   | promotion      | アンケートの作成               | edit | 業務アンケートを作成・配信できます                       |
| `can_view_content`                 | BE ✓   | content        | お知らせ・ブログの閲覧         | view |                                                          |
| `can_manage_content`               | BE ✓   | content        | お知らせ・ブログの作成・編集   | edit |                                                          |
| `can_manage_notification`          | BE ✓   | content        | 通知設定の管理                 | edit |                                                          |
| `can_view_staff`                   | BE ✓   | system_setting | スタッフ管理の閲覧             | view |                                                          |
| `can_manage_staff`                 | BE ✓   | system_setting | スタッフアカウントの作成・編集 | edit |                                                          |
| `can_manage_position`              | BE ✓   | system_setting | 職位マスターの管理             | edit |                                                          |
| `can_manage_store_setting`         | BE ✓   | system_setting | 店舗設定の変更                 | edit |                                                          |
| `can_edit_store_photo`             | BE ✓   | system_setting | 店舗写真・フロアマップの編集   | edit | モバイルアプリの施設紹介と連動します                     |
| `can_edit_store_business_hours`    | BE ✓   | system_setting | 営業時間・休業日の編集         | edit | 店舗の営業カレンダーと連動します                         |
| `can_edit_store_basic_info`        | BE ✓   | system_setting | 店舗基本情報の編集             | edit | 店舗名称・住所・電話番号を変更できます（変更履歴を記録） |
| `can_edit_gate_stop`               | FE-ext | system_setting | ゲートストップ設定の変更       | edit | 自店舗のみ。入退館管理と連動します                       |
| `can_export_member_csv`            | BE ✓   | csv_export     | 会員CSV出力                    | edit | 会員情報のCSVエクスポートを実行できます                  |
| `can_export_gate_log_csv`          | BE ✓   | csv_export     | 入退館CSV出力                  | edit | 入退館履歴のCSVエクスポートを実行できます                |
| `can_export_survey_csv`            | BE ✓   | csv_export     | アンケートCSV出力              | edit | アンケート結果のCSVエクスポートを実行できます            |

**Unexposed BE flags (23, not in the Phase 1 form — decision 2026-07-29 keeps the UI at the prototype's 36)**: can_approve_transfer, can_cancel_withdrawal, can_set_temporary_recess, can_anonymize_member, can_exempt_delinquency, can_adjust_fee (member); can_cancel_application, can_register_corporate_member, can_register_social_discount_member, can_register_special_contract, can_delete_others_application_memo, can_manage_trial_visit (application); can_manage_lesson_master, can_manage_trainer_profile, can_edit_own_trainer_profile, can_delete_trainer_profile, can_manage_studio_master, can_delete_studio_master (lesson); can_confirm_billing, can_add_manual_billing (sales); can_view_terms_documents, can_manage_terms_documents (system_setting); can_export_accounting_csv (csv_export). The Phase 1 mock stores only the 36 keys above; the 23 extras join at Phase 2 cutover.

### Derived structures

- `PermissionMapSchema`: `z.object({ <each of the 36 keys>: z.boolean() })` — full map required on read; `.partial()` accepted on create/update (omitted keys default `false` on create, unchanged on update). `PermissionKey` union comes from the generated client types, not from mock imports.
- **Destructive (重要操作) key set (preview warning icon — FR-007a, replaces the removed 権限フラグ section)**: `can_force_withdrawal`, `can_edit_after_billing_confirmed`, `can_execute_refund`. Tooltip: 「強制退会・返金など重要操作を含みます」.
- **CSV role defaults (FR-011)**: `headquarter`, `manager` → all 3 csv keys `true`; `staff`, `trainer`, `observer` → `false`.

### Category-level derivation (UI, research R5)

Per category: no granted key → アクセス不可 / only `view`-kind granted → 閲覧のみ / any `edit`-kind granted → 閲覧・編集. `csv_export` category: any granted → 出力可, else 出力不可.

### Catalog endpoint projection (research R14)

`GET /api/crm/permissions` → `{ totalCategoryCount: 10, totalPermissionCount: 36, categories: [{ categoryKey, categoryLabel, permissions: [{ permissionKey, label }] }] }` — same grouping metadata as the preview endpoint, minus `granted`. Mirrors the BE's `GET /api/v1/admin/permissions` (which reports 10 / 58).

---

## 2. Position (extends existing `positions` mock table)

| Field                       | Type                                                               | Constraints                                                          | Source                                                  |
| --------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `id`                        | number (int)                                                       | PK, auto-increment (mock)                                            | existing (kept — research R1)                           |
| `role`                      | `'headquarter' \| 'manager' \| 'staff' \| 'trainer' \| 'observer'` | required; **immutable after creation** (Clarification Q3)            | existing `PositionRoleCategorySchema`                   |
| `position_name`             | string                                                             | required, 1–100 chars, **unique per (role, position_name)** (FR-010) | existing (max-length + uniqueness added)                |
| `description`               | string \| null                                                     | optional, ≤500 chars                                                 | Official BE field as of API v0.3 (was a mock extension) |
| `permissions`               | PermissionMap (36 booleans)                                        | required on row; omitted keys default `false` at create              | NEW (replaces `features` blob)                          |
| `is_system_managed`         | boolean                                                            | seed-only `true`; not settable via API; guards edit/delete (422)     | NEW — BE parity; Phase 1 seeds none as `true`           |
| `created_at` / `updated_at` | ISO datetime string                                                | set by mock on create/update                                         | NEW                                                     |

**Removed**: `features: Record<string, unknown>` (content folded into `description`; no remaining consumer).

### Derived (list projection only — not stored)

| Field                                         | Derivation                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `staff_count`                                 | count of staffs with `position_id === id` and not deleted (mirrors BE rule)             |
| `grantedCategoryCount` / `totalCategoryCount` | categories with ≥1 granted key / 10 (category axis) — field names verbatim from BE v0.3 |

### Validation rules (mock routes)

- Create: `position_name` non-empty ≤100 (400), `description` ≤500 (400), `role` valid enum (400), `(role, position_name)` unique (409), unknown permission keys rejected by the closed Zod object (400), `is_system_managed` not accepted.
- Update (PATCH): no `role` field in schema; unknown id → 404; `is_system_managed === true` row → 422; rename re-checks uniqueness → 409; only provided permission keys updated.
- Delete: unknown id → 404; `is_system_managed` → 422; `staff_count ≥ 1` → 409; else physical delete → 204.

### State transitions

Stateless master data — no status field. Lifecycle: created → (edited ×n) → physically deleted (only when unreferenced). Permission changes take effect on assigned staff's next request (FR-012) — in Phase 1 mock, permissions resolve per-request from the table, so this holds automatically.

---

## 3. Role (constant, not a table)

Fixed 5 selectable options (System never selectable, FR-018): `headquarter` 本部 / `manager` マネージャー (Manager) / `staff` スタッフ (Staff) / `trainer` トレーナー (Trainer) / `observer` 閲覧のみ (Observer). Reuse/extend the existing role-label util from the staffs feature. No `GET /crm/roles` endpoint (research R6).

---

## 4. StaffChangeHistory (NEW, seed-only — FR-019 / research R9)

| Field             | Type                                                                                                         | Notes                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `id`              | string                                                                                                       | PK                                                           |
| `staff_id`        | string                                                                                                       | FK → staffs.id                                               |
| `changed_by`      | string                                                                                                       | FK → staffs.id (actor)                                       |
| `changed_by_name` | string                                                                                                       | denormalized actor name                                      |
| `changed_at`      | ISO datetime                                                                                                 | seed rows sorted DESC on read                                |
| `change_action`   | string enum (`'create' \| 'update' \| 'role_change' \| 'position_change' \| 'store_change' \| 'deactivate'`) | matches BE StaffChangeAction spirit                          |
| `snapshot`        | object (typed loose JSON: `Record<string, string \| number \| boolean \| null>`)                             | post-change snapshot + `target_position_id` where applicable |

Table exposes `getListByStaffId()` read accessor only — **no create/update/delete methods, no route handler, never written by position operations**.

---

## 5. Relationships

```text
Role (constant, 5 selectable + system)
  1 ── n  Position (positions table; role immutable per row)
              1 ── n  Staff (staffs table, existing; staff.position_id → positions.id)
                          1 ── n  StaffChangeHistory (seed-only)
Position.permissions ⊇ PermissionCatalog keys (exactly the 36-key map; served by GET /crm/permissions)
```

- Delete guard: Position with ≥1 non-deleted Staff cannot be deleted (409 + disabled UI affordance).
- Preview 割当スタッフ panel reads Staff via existing `GET /crm/staffs?position_id={id}` (no new relationship surface).

---

## 6. Seed requirements

- **Positions (13)** — the Y-01 初期定義 set as in the V0 mock (POS-001〜POS-013 equivalents, ids 1–13): 本部管理者 (headquarter), ブロック長 / テリトリーマネージャー / テリトリーMGR(アンケート作成) (manager), 店舗責任者 / 正社員スタッフ / 契約社員スタッフ / アルバイト(スーパー) / アルバイト(一般) / FC企業管理者 (staff), 社員トレーナー / 社外トレーナー (trainer), 閲覧専任 (observer). Each with `description` (V0 copy, ≤500 chars) and a full 36-key permission map reproducing the V0 category levels (e.g., 本部管理者 all true incl. csv; 閲覧専任 all false). CSV keys must respect FR-S001 defaults except where V0 mock says otherwise.
- **Uniqueness fixture**: seeds already guarantee `(role, position_name)` uniqueness; keep at least two same-role positions (manager ×3) so the 409 rule is exercisable.
- **Staffs**: align existing staff seeds so every position has a plausible `staff_count` (at least: one position with 0 staff → delete enabled; one with ≥4 staff incl. one 無効 → preview top-3 active-first + 無効 badge + "他 N 名を見る →" visible; store names present for the preview sub-line).
- **StaffChangeHistory**: ≥5 rows across ≥2 staff referencing seeded actors/positions, `changed_at` descending coverage.
- **No `is_system_managed: true` seed** (spec Out of Scope — guard exists API-side only).
