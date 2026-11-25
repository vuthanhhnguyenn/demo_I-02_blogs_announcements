# NG Bug Fix Plan — E-02 店舗機器管理 (real API)

> Nguồn: execute 769 TC (6 TC doc trong `tests/cases/`), ngày 2026-10-12: 596 OK / 86 NG / 87 Block → sau khi PO chốt: **598 OK / 84 NG / 87 Block**
> 68 Bug ID · Branch: `feat/equiqments-integration-api` · Bug BE: xem [BE-BUG-REPORT.md](BE-BUG-REPORT.md)
> Đường dẫn code dưới đây: `E/` = `src/app/(private)/(equipment-management)/`

## 0. Cách làm việc

1. Mỗi đợt: trình bày lại các bug theo template (hiện tượng / nguyên nhân / cách fix / rủi ro), **chờ user OK** rồi mới sửa.
2. **Chỉ fix FE.** Bug BE / SPEC chỉ ghi nhận và chuyển đi.
3. Sau mỗi đợt:
   - chạy `npm run lint && npx tsc --noEmit --incremental false` (bỏ qua lỗi trong `.next/`);
   - retest đúng các TC liên quan trên :3001 (build production);
   - cập nhật NG → OK trong TC doc; khi chuyển sang OK thì xoá Bug ID và Priority.
4. Không commit cho tới khi user xác minh.

## 1. Phân loại

| Loại                        | Số     | Bug ID                                                                                                                      |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| **FE — fix**                | 60     | còn lại (xem §2, §3); gồm cả B-01 và E-01 sau khi PO chốt                                                                   |
| **BE — report**             | 6      | A-03, A-10, A-11, D-01, D-02, F-05 → BE-04, BE-05, BE-06, BE-02, BE-04, BE-01                                               |
| **Đã chốt, không phải bug** | 2      | D-03: không tìm theo ID → TC-037 (D) = OK · F-11: giữ dialog huỷ thay đổi như hiện tại → TC-089 (F) = OK (PO 2026-10-12)    |
| **TC doc sai**              | 1 phần | F-03 / TC-007: placeholder trong code khớp spec, TC doc lấy theo prototype → sửa doc, phần link quay lại (TC-003) vẫn là FE |
| **FE + BE**                 | —      | C-05 (FE hiện message, chờ BE Q-01), F-04 (FE thêm regex, BE-07), F-09 (FE lọc picker, BE-08)                               |

## 2. Đợt 1 — Sửa dùng chung (một chỗ sửa xử lý nhiều bug)

| #   | Sửa                                                                                                                                                                                                                                                                                                                                                                                 | Bug                                                                                         | Vị trí                                                                                                                                                                                                    | Rủi ro                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1-1 | **Component footer form dùng chung**: footer nằm trong flow, không `fixed left-0`, theo mẫu `stores/_components/store-form-shell.tsx:85-100`. Text tóm tắt chọn theo loại lỗi: thiếu dữ liệu → 「未入力の項目があります」; sai định dạng hoặc lỗi server → câu khác (copy cần PO chốt, tạm dùng câu của prototype 「入力内容に不備があります。エラー表示の項目をご確認ください。」) | C-04, C-06, F-01, F-02                                                                      | 4 trang: `E/equipment/create/page.tsx:150`, `E/equipment/[id]/edit/page.tsx:160`, `E/controllers/create/page.tsx:110`, `E/controllers/[id]/edit/page.tsx:141`                                             | Thấp: chỉ trong feature này                                                                                                     |
| 1-2 | **Chống bấm đúp**: chuyển `training-equipment/_hooks/use-submit-guard.hook.ts` sang `src/hooks/`, áp dụng cho 7 chỗ                                                                                                                                                                                                                                                                 | B-04, E-03, A-12 (+ quan sát của unit C: 3 lần `click()` JS trong cùng tick tạo 3 thiết bị) | `equipment-status-dialog.tsx:83`, `equipment-delete-dialog.tsx:80`, `controller-status-dialog.tsx:~91`, `controller-delete-dialog.tsx:94`, `equipment-csv-export-button.tsx:128`, 2 trang create          | Thấp: training-equipment phải đổi import                                                                                        |
| 1-3 | **Helper xử lý lỗi mutation**, đặt trong `E/_utils/device-api.util.ts`: toast `resolveApiErrorMessage` (giữ `userMessage` của server); 404 → invalidate rồi chuyển về list; 409 → invalidate, refetch và `form.reset(dữ liệu mới)`                                                                                                                                                  | B-10, C-09, E-07, E-08, F-07, F-08; message cho C-05 và F-09                                | Các dialog trên, cùng 2 trang edit và 2 trang create (toast cố định đang tắt `userMessage`)                                                                                                               | Trung bình: phải giữ một toast duy nhất (MutationCache global)                                                                  |
| 1-4 | **Trạng thái lỗi cho list và tab**: nhánh `isError` → error state kèm nút 再試行 (thử lại), thay cho copy "chưa có dữ liệu"; badge hiện `—` khi đang tải                                                                                                                                                                                                                            | A-14, A-15, D-07, B-06, E-05                                                                | `E/equipment/page.tsx:308-336`, `E/controllers/page.tsx:112`, `equipment-history-tab.tsx:143`, `controller-devices-tab.tsx:118`, `E/layout.tsx:87-89`                                                     | Thấp                                                                                                                            |
| 1-5 | **Giá trị dài**: dùng `components/common/field.tsx` (`min-w-0` + `wrap-anywhere`) cho 2 info card; thêm `wrap-anywhere` hoặc truncate kèm tooltip cho ô tên trong các bảng, cho mô tả của dialog và cho ô lý do trong lịch sử; textarea trong dialog thêm `max-h` để có scroll                                                                                                      | A-13, B-03, B-05, B-08, B-09, C-10, C-11, C-12, D-06, E-09, E-10, F-10                      | `equipment-table-columns.tsx:67…160`, `controller-table-columns`, `equipment-info-card.tsx:34`, `controller-info-card.tsx:29`, `equipment-history-tab.tsx:137`, 3 dialog, `controller-picker.tsx:107,117` | Trung bình: **không** sửa `whitespace-nowrap` mặc định trong `components/ui/table.tsx` (dùng toàn app), chỉ override ở từng cột |

Tổng đợt 1: 30 Bug ID, **40/86 dòng NG** (~47%).

## 3. Đợt 2 — Sửa theo từng màn

### 3.1 Danh sách thiết bị (A)

| Bug                | Sửa                                                                                                                                | Vị trí                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A-01 / C-01 (High) | Badge 紐づき契約種別 (loại hợp đồng liên kết) ghép thêm tên loại: 「サービス種別（水素水）」, dùng `EQUIPMENT_SERVICE_TYPE_LABELS` | `E/equipment/_constants/constants.ts:31,67,89`, `equipment-table-columns.tsx:172`                           |
| A-16 / D-08        | Luôn render menu 新規登録 (đăng ký mới); item thiếu quyền dùng `RoleGatedMenuItem` kèm badge 「権限なし」                          | `E/layout.tsx:92,117-145` (một chỗ, sửa cả 2 list)                                                          |
| A-08               | Dialog bulk reset 変更先状態 và 変更理由 mỗi lần `open`                                                                            | `equipment-bulk-status-dialog.tsx:49`, `E/equipment/page.tsx:225`                                           |
| A-09               | Offline bị treo ở 保存中: đặt `networkMode: 'always'` cho mutation                                                                 | `providers/react-query.provider.tsx:22` ⚠ **global**; phương án an toàn hơn là chỉ đặt trên mutation này    |
| A-04               | Ô tìm kiếm `maxLength={100}` (chờ BE Q-03 xác nhận)                                                                                | `equipment-filters.tsx:140`                                                                                 |
| A-07               | Click vào padding của ô checkbox không được mở trang chi tiết                                                                      | `components/common/data-table/data-table-column-checkbox.tsx:23` ⚠ shared                                   |
| A-05               | Tooltip sort: bỏ trạng thái thứ ba 「クリックで解除」                                                                              | `data-table-column-header.tsx:61` ⚠ shared, cần kiểm tra các màn khác có cố ý dùng sort ba trạng thái không |
| A-06               | Thuật toán số trang (trang 1 hiện `1 2 3 4 … 8`)                                                                                   | `table-pagination-with-size.tsx:26-48` ⚠ shared                                                             |
| A-02               | Ẩn footer phân trang khi chỉ có 1 trang (Δ21)                                                                                      | `E/equipment/page.tsx:362` truyền `alwaysShowFooter={false}`                                                |

### 3.2 Chi tiết thiết bị (B)

| Bug  | Sửa                                                                                                                                                                                                    | Vị trí                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| B-01 | **PO chốt `warning`**: badge メンテナンス中 dùng màu vàng cam ở mọi màn (danh sách, header chi tiết, card trạng thái, lịch sử, dialog). Sau khi sửa, retest cả các TC màu badge của unit A (danh sách) | `E/equipment/_constants/constants.ts:121-125`     |
| B-02 | Dòng 新規作成 (tạo mới): 変更理由 hiện 「—」 thay vì 「設置」                                                                                                                                          | `constants.ts:94`, `equipment-history-tab.tsx:46` |
| B-07 | Tooltip đổi thành 「ステータス変更権限がありません」                                                                                                                                                   | `equipment-status-card.tsx:83`                    |

### 3.3 Form thiết bị (C)

| Bug                  | Sửa                                                                                                            | Vị trí                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| C-03                 | Tick サービス種別判定 → `trigger('usage_control_rule')` để xoá lỗi 契約種別                                    | `equipment-form-usage-rule.tsx:~134`, schema `:50-57`                             |
| C-07 / F-06          | Lưu xong chuyển về list (theo `returnTo`)                                                                      | `E/equipment/[id]/edit/page.tsx:68,102`, `E/controllers/[id]/edit/page.tsx:75,85` |
| C-02 / F-03 (TC-003) | Thêm link quay lại 「…に戻る」 (`components/common/back-to-list-link.tsx`) cho 4 trang form và cho error state | 4 trang form                                                                      |
| C-08                 | Picker 全店舗 (tất cả cửa hàng): option hiện thêm tên cửa hàng                                                 | `controller-picker.tsx:107`                                                       |
| C-05                 | Phần FE: hiện message của server (đợt 1-3). Chọn 廃棄 lúc tạo: **chờ Q-01**                                    | `equipment-form-basic-info.tsx:195`                                               |

### 3.4 Danh sách controller (D)

| Bug  | Sửa                                                                                             | Vị trí                                              |
| ---- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| D-04 | `maxLength={100}`                                                                               | `controller-filters.tsx:57`                         |
| D-05 | Đổi store thì reset `controller_page` về 1                                                      | `use-controller-filters.ts:62,89`                   |
| D-09 | Badge số lượng không refetch: xác minh lại runtime trước (agent chưa xác nhận được nguyên nhân) | `E/layout.tsx:76-81`, `controller-cache.util.ts:42` |

### 3.5 Chi tiết controller (E)

| Bug  | Sửa                                                                                                                                                          | Vị trí                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| E-01 | **PO chốt theo prototype**: link quay lại ghi 「店舗機器管理に戻る」 (đích giữ nguyên). Dùng cùng nhãn cho link quay lại mới thêm ở 4 trang form (C-02/F-03) | `E/controllers/[id]/page.tsx` (+ trang chi tiết thiết bị nếu dùng cùng nhãn) |
| E-02 | Dialog xoá hiện IP thay vì 装置名 (tên thiết bị)                                                                                                             | `E/controllers/[id]/page.tsx:159`                                            |
| E-04 | Cột phải sticky: `top` = chiều cao header thay vì `top-0`                                                                                                    | `controller-basic-info-tab.tsx:28`, `equipment-basic-info-tab.tsx:30`        |
| E-06 | Nút disable vẫn focus được bằng Tab để đọc tooltip (`tabIndex={0}` trên span)                                                                                | `components/common/role-gated-button.tsx:98,122` ⚠ shared                    |

### 3.6 Form controller (F)

| Bug         | Sửa                                                                           | Vị trí                                                                   |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| F-04        | Regex FW `^v\d+\.\d+\.\d+$` + `maxLength` khớp giới hạn thật (chờ BE-07 chốt) | `controller-form.schema.ts:11,38`, `controller-form.tsx:166`             |
| F-09 (High) | Picker cửa hàng của Manager: chỉ liệt kê `restrictedStores`                   | `controller-store-field.tsx:56-64` (chỉ có tác dụng thật khi BE-08 xong) |

## 4. Thứ tự đề xuất

1. **Đợt 1**, theo thứ tự 1-5 → 1-1 → 1-4 → 1-2 → 1-3. Ba sửa đầu ít phụ thuộc nhau; 1-3 cần thiết kế helper nên làm sau cùng.
2. **Đợt 2**:
   - Làm trước các bug High: A-01/C-01, F-09.
   - Sau đó là các sửa chỉ nằm trong feature: B, C, D, E, F.
   - Cuối cùng là các sửa đụng component shared (A-05, A-06, A-07, E-06, A-09 global). Các sửa này cần chạy smoke test trên vài màn khác như スタッフ一覧 (danh sách nhân viên) và 店舗一覧 (danh sách cửa hàng).
3. Song song: gửi [BE-BUG-REPORT.md](BE-BUG-REPORT.md) cho BE, hỏi PO các mục SPEC. Khi BE fix xong BE-08 thì retest khoảng 8 TC đang `Block (account)` của Manager.

## 5. Retest

- Mỗi bug retest đúng các TC trong cột Notes của TC doc (thiết bị trên :3001, viewport 1024×768 cho layout).
- Dùng dữ liệu `QA-E02-*` đã có sẵn trên backend; các record LONG/TOKEN từ lần chạy trước dùng lại được cho đợt 1-5.

## 6. Kết quả (fix + retest 2026-10-12)

Phạm vi sửa: chỉ trong `E/` (user 2026-10-12: không sửa component dùng chung / màn khác). Lint + tsc sạch, `npm run build` OK.

| Unit     | Trước fix (OK/NG/Block) | Sau retest       |
| -------- | ----------------------- | ---------------- |
| A        | 153 / 18 / 18           | 168 / 3 / 18     |
| B        | 95 / 16 / 6             | 111 / 0 / 6      |
| C        | 99 / 15 / 10            | 114 / 0 / 10     |
| D        | 75 / 11 / 16            | 83 / 3 / 16      |
| E        | 81 / 11 / 29            | 92 / 0 / 29      |
| F        | 95 / 13 / 8             | 107 / 1 / 8      |
| **Tổng** | 598 / 84 / 87           | **675 / 7 / 87** |

Còn NG (7) — toàn bộ là bug BE:

- **BE** (7): A-03 (TC-051), A-10 (TC-129), A-11 (TC-150), D-01 (TC-027, TC-028), D-02 (TC-033), F-05 (TC-076) → [BE-BUG-REPORT.md](BE-BUG-REPORT.md).

Ghi chú quyết định:

- Form tạo/sửa (thiết bị, controller): giữ `suppressErrorToast`, lỗi field chỉ hiện inline, lỗi khác 1 toast message server (đúng TC-030/048 C "no extra toast"). Dialog đổi trạng thái / xoá dùng toast global.
- E-04: scroll container là vùng nội dung dưới header → cột phải dùng `lg:top-4`. Ở 1024×768 cột (648px) cao hơn vùng cuộn (595px) nên cuối trang bị cắt như nội dung thường, không bị header đè.
- C-05: PO 2026-10-12 — tạm ẩn 廃棄 trên form tạo mới (form sửa giữ đủ 4 trạng thái); TC-079 C → OK. Q-01 vẫn chờ BE/PO chốt lâu dài.
- A-05 (sort 3 trạng thái, tooltip 「クリックで解除」) và A-06 (pager trang hiện tại ±1): PO 2026-10-12 — hành vi hiện tại của app là đúng, không phải bug → TC-093, TC-104 A = OK.
- F TC-007: placeholder theo spec là đúng (PO 2026-10-12) → OK, Expected sửa theo spec.
- Dữ liệu retest để lại: QA-E02-RT-B-DEL-1, QA-E02-RT-B-DEL-2 (còn lại đã xoá).
