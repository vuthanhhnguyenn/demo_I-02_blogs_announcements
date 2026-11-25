# Quickstart — manual verification: Y-02 delta (2026-10-02) + store-map-setup

No automated tests (Constitution). Verify in this order:

1. `tsc --noEmit`: 0 errors outside `.next/`.
2. `npm run lint`.
3. The steps below, against the dev backend using real Cognito accounts (`demo-users.ts`).
4. `/verify-parity` on each sub-spec's `checklists/parity.md`.

Roles needed:

- System / Headquarter
- Staff linked to store A
- Staff linked to another store
- Manager
- Trainer / Observer

Each Staff account must have a real 職位 (position) assigned (memory: test accounts ship as 未割当, unassigned).

## §0 Verify live first (blocks WP2 / WP3 merge)

| #   | Check                                                                                                         | Pass condition                                                 | If it fails                                                        |
| --- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| V1  | `PATCH /admin/stores/{id}` with `{name}` only on an 営業中 store                                              | Status stays `operating`                                       | Echo `status` in every form PATCH, then update research R2         |
| V2  | `PUT …/business-hours` with 7 rows (no `holiday`)                                                             | 200; a holiday then follows its weekday on the calendar / gate | Always send the holiday row; disable 曜日どおり; update R3         |
| V3  | `POST /media/presign` with `tag:"store-image"`, `image/png` and `image/jpeg`, then PUT with `requiredHeaders` | 200 + S3 200                                                   | Report `E-MED-002` to BE                                           |
| V4  | `<img src="/api/v1/media/assets/{s3Key}">` in the CRM                                                         | Image renders                                                  | Show placeholders; log under B4                                    |
| V5  | Staff (store A) `GET /admin/stores`                                                                           | Only store A is returned                                       | `canEditStore` still guards every row (R10)                        |
| V6  | Staff (store A) `PATCH` `{name,address,phone}` / `PUT …/images` on store A                                    | 200                                                            | B10 still open: the Staff form stays read-only (today's behaviour) |

## §1 store-list

1. The ステータス (status) filter offers 全ステータス / 準備中 / 営業中 / 休業中 / 閉店. Badges are info / success / warning / muted.
2. The search placeholder reads 店舗名・店舗コードで検索...
3. As HQ, the 運営企業 (operating company) filter lists 全運営企業, 直営, then active franchise companies. As Manager, the filter is hidden and no 403 toast appears.
4. As Staff (store A), 編集 is enabled on store A's row only. Elsewhere it is inert with the 本部 badge.
5. Page sizes are 25 / 50 / 100.

## §2 store-form

1. Every non-required field shows 任意 (optional). 営業時間 (business hours) shows it too.
2. 運営企業: the first option is 直営（運営企業なし）. Choosing it on an FC store and saving makes the list show 直営.
3. Edit: changing 店舗コード (store code) shows the warning Alert. Saving opens 「店舗コードを {旧} から {新} に変更しますか？」 and only 変更して保存する saves.
4. Edit on an 営業中 store: ブランド / サブブランド are disabled, with the tooltip 営業中の店舗ではブランドを変更できません（開業準備中のみ変更可）. On a 準備中 store they are enabled.
5. ブランド FIT365 → no サブブランド field. JOYFIT with no sub-brand → サブブランドを選択してください.
6. Create: the 祝日 (holiday) select offers 曜日どおり / 営業 / 休業; times appear only for 営業. Saving with 曜日どおり sends 7 rows. Edit: the hours table is read-only (B13).
7. **店舗写真 (store photos)**:
   - add 2 JPG/PNG files; they appear with an uploading state, then as thumbnails;
   - a 12MB file, a GIF, and a 21st photo are each refused with the spec messages;
   - delete one on hover;
   - while an upload is in progress, the primary button is disabled;
   - save: exactly one `PUT …/images`, items in grid order with `{s3Key, caption}` only;
   - reopen the store: the same photos in the same order;
   - discard after a delete: the photo is still there.
8. Create with photos: `POST` and then `PUT …/images`. With the PUT forced to fail (e.g. offline), the store still exists and the toast 店舗は登録しましたが、写真の保存に失敗しました… shows.
9. Staff (store A): 店舗名 / 住所 / 電話番号 (store name / address / phone) and the photo card are editable; everything else is locked. The footer line includes 店舗写真.

## §3 store-detail

1. Tabs: 基本情報 / 営業設定 / 契約・料金 / 入退館設定 / 店舗マップ / 変更履歴 (basic info / business settings / contract & fees / entry-exit settings / store map / change history). The フロアマップ (floor map) card is gone from 基本情報.
2. The header 編集 is enabled for HQ, and for Staff on their own store. Staff on another store sees the tooltip 所属店舗の基本情報のみ編集できます.
3. StatusCard:
   - shows 閉店予定日 (planned closing date) when `closedAt` is set;
   - ステータス変更 is HQ-only;
   - the dialog allows only 準備中→営業中 and 営業中⇄休業中, with the disabled reasons as in the spec;
   - after a change, the badge, list and history (`status_change`) all update.
4. ブランド / サブブランド rows; FIT365 shows — for the sub-brand.
5. Calendar: a temporary closure on a holiday shows 臨時休業 (temporary closure). An overridden holiday shows 祝日営業/祝日休業 (holiday open / holiday closed). An un-overridden holiday follows its weekday and is labelled 祝日. The legend matches the spec.
6. Hours: 編集 opens the 営業時間を設定する Sheet with the 祝日の扱い (holiday handling) select. The staff-hours Sheet works the same way.
7. 特別営業日 (special business day) / 臨時休業日 (temporary closure day):
   - add/edit Dialog;
   - the same date across both kinds gives the error 「この日はすでに…登録されています…」;
   - empty states;
   - delete confirm 「{date} の設定を削除します。この日は祝日・曜日の設定に従います。」
8. Contract tab: 区分 (category) is 全社共通/当店限定 (company-wide / this store only); options have no 親オプション (parent option) column and no badge.
9. 入退館設定:
   - **JOYFIT store**: どこでもJOYの受入, the 後払い (pay-later) row and the YOGA card.
   - **FIT365 store**: 相互利用オプション（¥500）の受入 only.
   - **Sheet edit**: the PUT body always contains `payLaterEnabled` + `yogaUsageFee`. There is no partner add/remove control.
10. 店舗写真 shows the real photos (or placeholders). Its 編集 opens the edit form at the photo card. The gating matches the header 編集.
11. The 店舗マップ tab shows the counts 配置済み/未配置 (placed / unplaced). The image area is in its empty state (R8). 店舗マップ設定 goes to `/stores/{id}/map`; Manager sees 閲覧のみ (view only).

## §4 store-map-setup

1. As Trainer / Observer: the no-access wall. As Manager: read-only or the wall, per spec FR-061. As Staff on another store: read-only.
2. The breadcrumb reads 店舗管理 › {店舗名} › 店舗マップ設定.
3. Image:
   - the dropzone accepts PNG/JPG ≤5MB (an SVG gets the type error);
   - a wrong type or size gives the spec messages;
   - 画像を差し替え shows the warning; 画像を削除 keeps positions;
   - **no network request** for the image (R8);
   - a reload loses the image (expected; Block in QA until B4).
4. Panel:
   - 配置 places the cabinet at the image centre, offset when the spot is taken;
   - 配置を外す unplaces it;
   - the 未保存 dot appears;
   - 詳細 opens the locker detail in a new tab.
5. Drag: a drag below 4px is ignored. Arrow keys move 1px, Shift moves 10px.
6. Save:
   - one `PATCH /admin/lockers/{id}` per moved cabinet, with `mapX/mapY` in 0..1 and `expectedUpdatedAt`;
   - the toast ロッカーの位置を保存しました（N台）;
   - a stale cabinet (edit it in another tab first) stays 未保存 with an error, while the others save.
7. Leaving dirty: the 変更を破棄しますか？ dialog appears for the sidebar, breadcrumb and browser back.
8. Entry points: the locker list/form link to `/stores/{currentStore}/map`, disabled in 全店舗 (all stores) scope.
