# NG Bug Fix Plan — Y-09 ルーティン管理 (real API)

> Nguồn: kết quả execute 3 TC docs trong `specs/016-routine-management/tests/cases/` (commit `1f5cc437`)
> Tổng: **35 bug** (List 17 · Detail 11 · Form 11 — trùng 4) · **48 TC NG** · Ngày lập: 2026-10-15 · Branch: `feat/routing-integration-api`
> Backend đối chiếu: `fitness-backend-v2` `origin/main` `7997b15f`

---

## 0. Cách làm việc

1. **Chỉ fix bug FE**, trong phạm vi `src/app/(private)/routines/**` — không sửa component / hook / provider dùng chung (chỉ _dùng lại_ cái đã có).
2. Bug **BE** → không sửa FE để né, ghi vào `BE_REQUEST.ja.md` / `BE_REQUEST.vi.md` (trạng thái `Bug`, chèn ngay sau No.1, đánh lại số).
3. Fix xong → `npm run lint` + `npx tsc --noEmit --incremental false` (0 lỗi ngoài `.next/`) → chạy `/execute-testcases` retest đúng các TC NG → cập nhật NG→OK / NG→Block (BE) trong TC doc.

### Ký hiệu

- **FE** — lỗi code frontend, ta fix.
- **BE** — lỗi API, chỉ report. TC sẽ chuyển `Block (BE-xx)` sau khi xác nhận không có gì FE làm được.
- **FE+BE** — FE chặn được phía client (guard / validate), BE vẫn cần sửa gốc.

---

## 1. Phân loại tổng

| Loại      | Số bug | Bug ID                                                                                                        |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| **FE**    | 28     | còn lại                                                                                                       |
| **FE+BE** | 4      | `01-12`, `02-09`, `03-B01` (spam-click → 500), `03-A04` (giá trị set quá lớn → 500)                           |
| **BE**    | 4      | `01-04` (keyword khớp cả code), `01-05` (`%`/`_` là wildcard), `01-10` = `02-07` (routine đã xóa vẫn GET 200) |

---

## 2. Unit A — ルーティン一覧 (List) · `page.tsx`, `routine-table-columns.tsx`, `use-routine-filters.hook.ts`, `routine-filters.tsx`, `routine-delete-dialog.tsx`

| Bug                           | TC                     | Loại  | Nguyên nhân                                                                                                                         | Cách fix                                                                                                                                         |
| ----------------------------- | ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `01-01` `01-02`(row) `03-B06` | 069–072, 075; F103–104 | FE    | Cell tên chỉ có `truncate` trong `div.min-w-0` — table auto-layout nên cell giãn theo nội dung, không có width giới hạn             | Dùng `TextWithTooltip` (đã dùng ở contracts/terms) với `max-w-*`, + `meta.className` min-width cho cột tên. Tên đầy đủ xem qua tooltip           |
| `01-02` (dialog)              | 072                    | FE    | `AlertDialogDescription` không có `break-*` → token liền 200 ký tự đẩy nút ra ngoài                                                 | Thêm `break-all` (wrap-anywhere) cho description trong `routine-delete-dialog.tsx`                                                               |
| `01-03` `01-08`               | 073, 023               | FE    | Dùng `FilterResult` (Alert, không `min-w-0`/`break-all`); summary chỉ là giá trị, nối bằng `・`                                     | Đổi sang `FilterResultBanner` (đã có `break-all` + `min-w-0`, dùng ở contracts) và truyền chuỗi dựng sẵn `検索: "…"、カテゴリ: …、ステータス: …` |
| `01-06`                       | 028                    | FE    | `rt_category` nhận chuỗi bất kỳ, gửi thẳng `categoryId=bogus-cat` → 400                                                             | Chỉ nhận `rt_category` có dạng UUID và (khi danh sách category đã tải) tồn tại; ngược lại coi như "tất cả" (không gửi, không hiện banner)        |
| `01-07`                       | 022                    | FE    | `activeFilterCount` chỉ đếm category + status                                                                                       | Đếm thêm keyword (FR-003)                                                                                                                        |
| `01-09`                       | 004                    | FE    | `sorting` rỗng khi URL không có sort → header 最終更新日 hiện icon trung tính                                                       | Mặc định `sorting = [{ id: 'updatedAt', desc: true }]`; click 最終更新日 từ trạng thái mặc định → `asc` (không rơi vào "xóa sort" = vẫn desc)    |
| `01-11`                       | 059                    | FE    | `isPending` chưa kịp re-render giữa 2 click cùng tick → 2 DELETE (204 + 404 + 2 toast)                                              | Khóa bằng `useRef` trong handler confirm (set trước `mutate`, mở trong `onSettled`)                                                              |
| `01-12`                       | 054                    | FE+BE | Không có guard in-flight cho 複製 ở menu dòng; BE: 2 request đồng thời → 500 (race `nextRoutineCode`)                               | FE: ref-lock giống trên. BE: ghi BE_REQUEST                                                                                                      |
| `01-13`                       | 061                    | FE    | Query lỗi → `items=[]` → hiện empty state                                                                                           | `emptyContent` = `ErrorView` (retry) khi `isError && !data` — pattern contracts                                                                  |
| `01-14`                       | 042                    | FE    | `Empty variant="empty"` dùng copy mặc định 「…がまだありません」                                                                    | Truyền `title="登録されたルーティンはありません"` (Y-09 FR-001)                                                                                  |
| `01-15`                       | 041                    | FE    | Xóa dòng cuối của trang cuối → URL vẫn ở page cũ (không còn dữ liệu)                                                                | Effect: khi đã có data, `items.length === 0`, `page > 1` và `totalItems > 0` → `setCurrentPage(lastPage)`                                        |
| `01-16`                       | 076                    | FE    | `th` sticky nhưng container table không có chiều cao giới hạn → không phải scroll container thật                                    | `containerClassName="max-h-[calc(100vh-…)]"` theo trạng thái mở filter (pattern contracts)                                                       |
| `01-17`                       | 009                    | FE    | Footer bị ẩn khi `total === 0`                                                                                                      | Luôn render footer khi đã có data (hiện 0 件)                                                                                                    |
| `01-04`                       | 010                    | BE    | `routine-admin.repository.ts:74` — `keyword` OR cả `code`                                                                           | BE_REQUEST                                                                                                                                       |
| `01-05`                       | 011                    | BE    | Prisma `contains` không escape `%` / `_`                                                                                            | BE_REQUEST                                                                                                                                       |
| `01-10`                       | 055                    | BE    | `getFull()` (`routine-admin.repository.ts:100`) không lọc `deletedAt: null` → `GET /admin/routines/{id}` của routine đã xóa trả 200 | BE_REQUEST (FE không có field `deletedAt` trong DTO để tự chặn)                                                                                  |

## 3. Unit B — ルーティン詳細 (Detail) · `[id]/page.tsx`, `routine-basic-info-tab.tsx`, `routine-exercise-composition-tab.tsx`

| Bug     | TC                   | Loại  | Nguyên nhân                                                                                                 | Cách fix                                                                                                                                                                                                                                                                                                            |
| ------- | -------------------- | ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02-01` | 015–021, 052         | FE    | Status card không có action (Delta #4: prototype có nút + dialog xác nhận)                                  | `StatusCard.action`: 「公開する」/「非公開にする」 (role-gated `RoutinesPublish`), 0 bài tập → disabled + lý do 「エクササイズが0件のため公開できません。エクササイズを1件以上登録してください」. Dialog xác nhận đúng copy TC-016/018, ref-lock chống double-click, lỗi server (E-RTM-003) → toast chung + refetch |
| `02-02` | 006, 025; F018, F058 | FE    | `<p>` description / 本部コメント dùng `white-space: normal`                                                 | `whitespace-pre-wrap`                                                                                                                                                                                                                                                                                               |
| `02-03` | 011                  | FE    | Copy placeholder sai                                                                                        | 「写真未登録」                                                                                                                                                                                                                                                                                                      |
| `02-04` | 027                  | FE    | Early-return 0 bài tập bỏ dòng tổng                                                                         | Luôn hiện 「合計 0 種目 / 0 セット」 trên empty state                                                                                                                                                                                                                                                               |
| `02-05` | 036                  | FE    | Detail dùng chung dialog/toast với List                                                                     | `RoutineDeleteDialog` thêm `variant="detail"`: title 「ルーティンを削除しますか？」, body có câu モバイルアプリ, nút 「キャンセル」; toast 「「name」を削除しました」. List giữ nguyên (TC-055 đã OK với copy hiện tại)                                                                                             |
| `02-06` | 038, 039             | FE    | Dialog "không xóa được" không có nút 非公開にする, body sai copy                                            | Body 「公開中のルーティンは削除できません。先にステータスを「非公開」に変更してから削除してください。」 + nút 「非公開にする」 gọi publish API tại chỗ, đóng dialog, toast 「「name」を非公開にしました」                                                                                                           |
| `02-08` | 044; F090 (`03-B04`) | FE    | 404 / 400 bị coi là lỗi mạng                                                                                | `getApiErrorStatus` 404/400 → `isEmpty` (「ルーティンが見つかりませんでした」 + mô tả), giống contracts. Áp dụng cho cả detail và edit                                                                                                                                                                              |
| `02-09` | 035, 043             | FE+BE | Không có guard cùng tick cho 複製 / 削除する                                                                | ref-lock (như Unit A). BE: race 500 — BE_REQUEST                                                                                                                                                                                                                                                                    |
| `02-10` | 058, 059             | FE    | Tên (h2), mô tả, 本部コメント, dialog không có `break-*`                                                    | `break-all`/`wrap-anywhere` + `min-w-0` ở các chỗ đó                                                                                                                                                                                                                                                                |
| `02-11` | 056                  | FE    | Cột phải `sticky top-0` nhưng ancestor scroll gần nhất (`flex-1 overflow-auto`) không bị giới hạn chiều cao | Bọc trang bằng `flex h-full flex-col overflow-hidden` + content `min-h-0 flex-1 overflow-auto` (pattern contracts detail)                                                                                                                                                                                           |
| `02-07` | 040, 042             | BE    | = `01-10`                                                                                                   | BE_REQUEST                                                                                                                                                                                                                                                                                                          |

## 4. Unit C — ルーティン 登録/編集 (Form) · `routine-form*.tsx`, `routine-form.schema.ts`, `routine.constants.ts`

| Bug      | TC            | Loại  | Nguyên nhân                                                                                                                                                                 | Cách fix                                                                                                                                                                                    |
| -------- | ------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `03-B02` | 080, 083      | FE    | `form.formState.isDirty` chỉ đọc trong handler → Proxy của RHF không subscribe → luôn `false` (field-array op thì tình cờ tính được). Back link là `<Link>` không qua guard | Đọc `isDirty` lúc render; `useUnsavedChangesGuard(isDirty)`; キャンセル và 「ルーティン管理に戻る」 đi qua `confirmDiscard` (dialog chung, cùng copy); sau khi lưu dùng `navigateAfterSave` |
| `03-B03` | 084           | FE    | Không gắn guard Back của trình duyệt                                                                                                                                        | Có luôn nhờ `useUnsavedChangesGuard` (sentinel history)                                                                                                                                     |
| `03-A02` | 022           | FE    | `useMediaUpload` tự toast trong `catch` + MutationCache cũng toast → 2 toast                                                                                                | Section thumbnail tự gọi presign với `meta: { suppressErrorToast: true }` và toast 1 lần (message của server). Không sửa hook dùng chung                                                    |
| `03-A03` | 012, 049, 050 | FE    | Copy validate sai                                                                                                                                                           | 「推奨Rep数・重量は0以上の数値のみ許可されています」                                                                                                                                        |
| `03-A04` | 056           | FE+BE | Client không có giới hạn trên; BE admin schema không có `max` → int4 overflow → 500                                                                                         | FE: thêm giới hạn trên theo cột DB / contract API-021 (Rep ≤ 999, 重量 ≤ 999.99, 時間 ≤ 86400, 距離 ≤ 999999.99) + message riêng. BE: BE_REQUEST                                            |
| `03-B01` | 073           | FE+BE | Submit 2 lần cùng tick trước khi `isPending` re-render                                                                                                                      | ref-lock trong `handleSubmit`, mở lại khi lỗi                                                                                                                                               |
| `03-B04` | 090           | FE    | = `02-08`                                                                                                                                                                   | như trên                                                                                                                                                                                    |
| `03-B05` | 091, 092      | FE    | Query category / exercise lỗi không hiển thị gì                                                                                                                             | Category: dòng lỗi + nút 「再読み込み」 dưới select. Picker: `emptyMessage` = 「エクササイズの取得に失敗しました」 khi lỗi                                                                  |
| `03-B07` | 101           | FE    | Input number `px-3` + 7 cột chia đều → RPE còn 21px nội dung                                                                                                                | Input set `px-1` + `min-w` cho cột số                                                                                                                                                       |
| `03-A01` | 018, 058      | FE    | = `02-02` (hiển thị ở detail)                                                                                                                                               | như trên                                                                                                                                                                                    |
| `03-B06` | 103, 104      | FE    | = `01-01`                                                                                                                                                                   | như trên                                                                                                                                                                                    |

## 5. BE_REQUEST bổ sung (chèn sau No.1, trạng thái Bug)

| No. mới | Endpoint                                                                          | Bug ID                     | Mức  |
| ------- | --------------------------------------------------------------------------------- | -------------------------- | ---- |
| 2       | `GET /admin/routines/{id}` (+ `PATCH` không bị ảnh hưởng vì đã check `deletedAt`) | `01-10`, `02-07`           | High |
| 3       | `GET /admin/routines` — keyword khớp cả `routineCode`                             | `01-04`                    | Med  |
| 4       | `GET /admin/routines` — `%` / `_` không escape                                    | `01-05`                    | Med  |
| 5       | `POST /admin/routines`, `PATCH …` — giá trị set không có max → 500                | `03-A04`                   | Med  |
| 6       | `POST /admin/routines`, `POST …/duplicate` đồng thời → 500 (race mã RT-xxxxx)     | `01-12`, `02-09`, `03-B01` | Low  |

## 6. Verify

1. `npm run lint` · `npx tsc --noEmit --incremental false` (lọc `.next/`).
2. `/execute-testcases` cho 3 TC doc, chỉ các TC đang NG. Kỳ vọng: toàn bộ FE → OK; `01-04`/`01-05`/`01-10`/`02-07` → `Block (BE)`; phần FE của FE+BE → OK nếu FE guard đủ (TC chỉ đòi "1 bản ghi, không toast lỗi").

## 7. Kết quả (2026-10-15)

Retest Round 2 bằng `/execute-testcases` (3 agent song song, mỗi agent 1 slot HQ riêng; `npm run dev` :3000 → `api.dev.fitness-v2`; 1440×900 + 1024×768):

| Doc              | NG trước | Sau Round 2                                  | Tổng doc                |
| ---------------- | -------- | -------------------------------------------- | ----------------------- |
| Y09-01 一覧      | 20       | 17 OK · 3 Block (BE: TC-010, TC-011, TC-055) | 71 OK / 0 NG / 5 Block  |
| Y09-02 詳細      | 23       | 21 OK · 2 Block (BE: TC-040, TC-042)         | 51 OK / 0 NG / 9 Block  |
| Y09-03 登録/編集 | 17       | 17 OK                                        | 107 OK / 0 NG / 7 Block |

Phát sinh trong lúc retest (đã fix + đo lại):

- `01-01` / `03-B06` lần đầu vẫn NG: ở 1024 bảng 802–813px trong khung 718px (kể cả tên ngắn) do `min-w-[200px]` + `max-w-[320px]` cột tên. Đổi thành `max-w-50` (`xl:max-w-90`) + `min-w-40` → bảng 718px, menu dòng right=991.
- Regression TC-014 (Y09-01): API giới hạn `keyword` ≤ 100 ký tự (400 `E-VAL-001`), sau fix `01-13` list hiện màn lỗi. Thêm `maxLength=100` cho ô tìm kiếm + cắt `rt_keyword` từ URL còn 100 → 300 ký tự cho kết quả bình thường, không lỗi.
