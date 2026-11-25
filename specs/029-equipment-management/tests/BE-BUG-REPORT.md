# E-02 店舗機器管理 — Bug phía BE (gửi team BE)

> Nguồn: execute 769 TC (6 TC doc trong `specs/029-equipment-management/tests/cases/`), ngày 2026-10-12
> Môi trường: `https://api.dev.fitness-v2.okamoto-hd.com`; tài khoản Cognito QA (`lodu4289+*@gmail.com`)
> Mọi bug dưới đây đều tái hiện được bằng gọi API trực tiếp (curl / token), không phụ thuộc FE.

## Tóm tắt

| #     | Mức  | API                                                                                 | Vấn đề                                                                      |
| ----- | ---- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| BE-01 | High | `PATCH /admin/relay-controllers/{id}`                                               | Giảm 制御ポート数 xuống dưới cổng đang dùng vẫn 200, không trả `E-DEV-012`  |
| BE-02 | High | `GET /admin/relay-controllers?q=`                                                   | `q` không tìm theo IPアドレス                                               |
| BE-03 | High | `PATCH /admin/connected-devices/{id}/status`, `PATCH /admin/relay-controllers/{id}` | Staff có `can_edit_facility=false` vẫn ghi được (200)                       |
| BE-04 | Med  | `GET /admin/connected-devices`, `GET /admin/relay-controllers`                      | `%` và `_` trong `q` bị hiểu là wildcard LIKE                               |
| BE-05 | Med  | `PATCH /admin/connected-devices/bulk-status`                                        | Không nhập lý do → lưu trace id `bulk:Root=…` làm 変更理由                  |
| BE-06 | Med  | `GET /admin/connected-devices/export`                                               | CSV xuất mã enum thay vì nhãn tiếng Nhật                                    |
| BE-07 | Med  | `POST/PATCH /admin/connected-devices`, `/admin/relay-controllers`                   | Không validate định dạng IP (device) và firmware (controller)               |
| BE-08 | High | `GET /auth/crm/me`                                                                  | Thiếu `managedStoreIds`; `storeId`=S-008 nhưng API chỉ cho S-003 → list 403 |
| Q-01  | —    | `POST /admin/connected-devices`                                                     | Cần chốt: tạo mới với status `discarded` (spec cho phép, API từ chối)       |
| Q-02  | —    | `q` của 2 list                                                                      | Xác nhận giới hạn 100 ký tự (FE sẽ chặn ở input)                            |

---

### Retest 2026-10-19 trên BE local (`dulv/equipment-api-fix-gaps` @ `45ee3de5`)

| #                   | Kết quả local               | Ghi chú                                                                                                         |
| ------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| BE-01               | **Pass → đóng**             | Giảm 制御ポート数 8→4 khi có máy ở cổng 6 → 422 `E-DEV-012`, record giữ 8 (E-02-F TC-076)                       |
| BE-02               | **Pass → đóng**             | `q=10.250.2.8` / `10.250.2.` ra đúng controller (E-02-D TC-027, 028)                                            |
| BE-04               | **Pass → đóng**             | `%` / `_` khớp nguyên văn ở cả 2 list (E-02-A TC-051, E-02-D TC-033)                                            |
| BE-05               | **Pass → đóng** (retest #2) | Bulk và PATCH đơn đều trim; trống / chỉ khoảng trắng → `changedNote = null`, lịch sử hiện 「—」 (E-02-A TC-129) |
| BE-06               | **Đóng** (retest #2)        | BE đổi sang xuất cột + nhãn giống bảng FE cho cả CSV thiết bị và controller (E-02-A TC-150, D TC-066…071 OK)    |
| BE-09 (mới)         | **Pass → đóng** (retest #3) | CSV controller ở 全店舗: 店舗コード đã nằm sau 装置名, header CSV = header bảng (E-02-D TC-067)                 |
| BE-03, BE-07, BE-08 | Chưa retest                 | Ngoài phạm vi lượt này                                                                                          |

Các bug đã đóng cần kiểm lại trên dev sau khi BE deploy nhánh này.

## BE-01 (High) — `E-DEV-012` không được áp dụng khi giảm số cổng

- **Tái hiện:**
  1. Controller `QA-E02-F-CTRL8` (8 cổng) có thiết bị `QA-E02-F-DEV-P6` gắn ở 出力ポート (cổng xuất) 6.
  2. `PATCH /api/v1/admin/relay-controllers/{id}` với `outputPortCount: 4`.
- **Thực tế:** 200, controller được lưu với 4 cổng; thiết bị ở cổng 6 trở thành "mồ côi". Tái hiện được cả bằng curl. (Đã trả lại 8 cổng sau khi test.)
- **Kỳ vọng:** từ chối với `E-DEV-012` (không được giảm số cổng xuống dưới cổng đang được thiết bị sử dụng).
- **TC:** E-02-F TC-076.

## BE-02 (High) — Tìm controller theo IP không ra kết quả

- **Tái hiện:** `GET /api/v1/admin/relay-controllers?q=10.250.2.8`; controller `QA-E02-CTRL-8` có `ipAddress = 10.250.2.8`.
- **Thực tế:** `totalItems: 0`. Tìm một phần IP (`10.250.2.`, `10.250`) cũng ra 0.
- **Kỳ vọng:** spec FR-007-A: ô tìm kiếm khớp 装置名 (tên thiết bị) / IPアドレス / 設置場所 (vị trí lắp đặt), nên kết quả phải có `QA-E02-CTRL-8`.
- **TC:** E-02-D TC-027, TC-028.

## BE-03 (High, phân quyền) — Staff ghi được dù `can_edit_facility=false`

- **Tái hiện:** đăng nhập `lodu4289+staff@gmail.com` (正社員スタッフ (nhân viên chính thức), S-003). `/crm/me` trả `can_edit_facility=false`, nên trên UI mọi nút ghi đều bị disable. Dùng token đó gọi:
  - `PATCH` đổi trạng thái của một thiết bị thuộc S-003 → **200**
  - `PATCH /api/v1/admin/relay-controllers/{id}` của controller thuộc S-003 → **200**
- **Đối chiếu:** với Observer, cùng các request này bị chặn đúng (403 `E-DEV-101`).
- **Kỳ vọng:** khi flag `can_edit_facility=false`, server trả 403. Hiện quyền ghi chỉ được chặn ở UI, gọi API trực tiếp là bỏ qua được.
- **Lưu ý:** ma trận quyền E-02 ghi Staff = ○. Nếu ý đồ là "role Staff luôn ghi được, không xét 職位 flag" thì phía FE đang chặn sai. Cần BE xác nhận server dựa vào role hay flag.
- **TC:** E-02-B TC-095 (notes), E-02-E TC-098 (notes).

## BE-04 (Med) — Wildcard LIKE không được escape

- **Tái hiện:** `GET /api/v1/admin/connected-devices?q=%` (và `q=_`); làm tương tự với `/admin/relay-controllers`.
- **Thực tế:** trả về toàn bộ bản ghi (thiết bị 178/178, controller 63/63), dù không tên nào chứa `%` hay `_`. Còn `\` và `'` được khớp đúng như ký tự thường (0 kết quả, không lỗi).
- **Kỳ vọng:** `%` và `_` được khớp như ký tự thường (escape trước khi đưa vào `ILIKE`).
- **TC:** E-02-A TC-051, E-02-D TC-033.

## BE-05 (Med) — Bulk đổi trạng thái lưu trace id làm 変更理由

- **Tái hiện:** gọi `PATCH /api/v1/admin/connected-devices/bulk-status` với `{deviceIds, newStatus}`, không có lý do, hoặc lý do chỉ gồm khoảng trắng.
- **Thực tế:** lịch sử trạng thái của từng thiết bị có `changedReason = "bulk:Root=1-6acca35a-…"`, tức X-Amzn-Trace-Id. Màn chi tiết hiển thị nguyên chuỗi này ở cột 変更理由 (lý do thay đổi).
- **Kỳ vọng:** `changedReason = null` (FE hiển thị 「—」). Lý do chỉ gồm khoảng trắng thì trim thành null.
- **TC:** E-02-A TC-129.

## BE-06 (Med) — CSV xuất mã enum

- **Tái hiện:** `GET /api/v1/admin/connected-devices/export?storeId=…`
- **Thực tế:** BOM UTF-8 và tên tiếng Nhật đều đúng. Nhưng 3 cột 機器タイプ / 状態 / 認証方式 xuất mã API: `entry_gate`, `abnormal`, `member_scan`.
- **Kỳ vọng (FR-011 / SC-008):** xuất nhãn hiển thị, ví dụ 入退館ゲート, 異常, 会員読取型.
- **TC:** E-02-A TC-150.

## BE-07 (Med) — Thiếu validate định dạng phía server

- **IP của thiết bị:** `POST /api/v1/admin/connected-devices` với `ipAddress` = `256.1.1.1`, `abc` hoặc `１０．０．０．１` (toàn bộ full-width) → đều trả 201.
- **Firmware của controller:** `2.4.1`, `v2.4`, `ver2.4.1`, `v2.4.1-beta` → đều trả 201. Text hướng dẫn trên UI và test plan đều ghi 「vN.N.N 形式」.
- **Kỳ vọng:** server trả 400 kèm error code cho mỗi định dạng sai. FE cũng sẽ bổ sung validate, nhưng server không được dựa vào việc đó.
- **Cần chốt:** quy tắc chính xác cho IP (IPv4 only?) và firmware (`^v\d+\.\d+\.\d+$`?). Thêm vào đó, thông báo lỗi FW hiện ghi giới hạn 64 ký tự, trong khi input cho nhập 255 ký tự. Cần thống nhất giới hạn thật.
- **TC:** E-02-C TC-028, E-02-F TC-047.

## BE-08 (High) — `/auth/crm/me` thiếu `managedStoreIds`, nên Manager bị cố định ở S-008

- **Tái hiện:** đăng nhập `lodu4289+manager@gmail.com` (ブロック長 (trưởng khối)), gọi `GET /api/v1/auth/crm/me` (kiểm tra lại ngày 2026-10-12).
- **Thực tế:**
  - Response chỉ có các key `staffId, email, lastName, firstName, role, positionId, positionName, isPositionAssigned, storeId, fcCompanyId, permissions, name, nameKana, position`.
  - **Không có `managedStoreIds`**, dù OpenAPI (`openapi.real.json`) khai báo field này là bắt buộc (`managedStoreIds: string[]`).
  - `storeId` = `…0208` (S-008, FIT365 仙台 dev, đã 閉店 (đóng cửa)). Trong khi đó server chỉ cho Manager thao tác ở S-003: list với `storeId=S-008` bị 403 `E-DEV-100` 「担当店舗のリレーコントローラーのみ操作できます。」.
- **Hệ quả:** FE dùng `managedStoreIds` để giới hạn store cho Manager; khi field này trống thì lấy `storeId`. Vì vậy header của Manager bị cố định ở S-008, và danh sách thiết bị, danh sách controller, controller picker đều bị 403 ngay khi mở.
- **Kỳ vọng:**
  - `/auth/crm/me` trả `managedStoreIds` đúng với phạm vi server dùng để phân quyền (ít nhất là S-003).
  - Nếu `storeId` của tài khoản QA này đặt nhầm vào S-008 thì sửa lại dữ liệu.
- **Ảnh hưởng:** các TC role Manager trên list và form đang phải chấm `Block (account)`.
- **TC:** E-02-A TC-061, TC-161, TC-164, TC-165; E-02-C TC-054, TC-106; E-02-D TC-075, TC-077.

---

## Cần BE / PO chốt (chưa phải bug)

- **Q-01 — Tạo thiết bị ở trạng thái 廃棄:** `POST` với `status: "discarded"` → 400 `E-VAL-001` 「a device cannot be created as discarded」. Spec 007 Q5 lại ghi cả 4 trạng thái đều chọn được khi tạo mới. Có hai hướng, cần chốt một (FE sửa theo hướng được chọn):
  - BE cho phép tạo ở trạng thái `discarded`;
  - hoặc giữ ràng buộc hiện tại, FE bỏ 廃棄 khỏi form tạo và PO cập nhật spec.
- **Q-02 — Giới hạn `q`:** `q` dài hơn 100 ký tự bị 400 `E-VAL-001` trên cả 2 list. FE sẽ đặt `maxLength=100` cho ô tìm kiếm. Nhờ BE xác nhận 100 là giới hạn chính thức.
