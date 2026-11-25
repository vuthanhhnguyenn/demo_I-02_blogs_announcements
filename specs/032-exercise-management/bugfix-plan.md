# Y-08 Exercise — Kế hoạch fix bug (sau test round 1)

> Nguồn: kết quả chạy TC ngày 2026-10-14 trong `tests/cases/` (commit `fc166f87` + run 2 của Y-08-C).
> Tổng: **185 NG / 54 Block** trên 655 TC, gom thành **86 bug** (A: 21, B: 19, C: 32, D: 14).
> Toàn bộ Block là gap phía BE đã có trong [BE_REQUEST.vi.md](BE_REQUEST.vi.md) (B2–B20) hoặc giới hạn dữ liệu → **không nằm trong plan này**.

## Tổng quan

| Nhóm | Nội dung                                         | Bug                                                                                         | Màn chính  | Ưu tiên |
| ---- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------- | ------- |
| G1   | Dialog dùng chung: copy, xác nhận, giá trị dài   | A-08, A-11, A-12, A-13, B-03, B-11, B-12, D-05(xóa), D-11, D-13                             | A, B, D    | High    |
| G2   | Chống double-submit / spam click                 | A-14, B-02, C-23, D-07                                                                      | A, B, C, D | Medium  |
| G3   | Trạng thái tìm kiếm / lọc / phân trang trên list | A-01, A-02, A-04, A-09, A-10, A-17, D-01, D-02, D-04                                        | A, D       | High    |
| G4   | Bố cục với giá trị dài / màn rộng                | A-07, A-21, B-04, C-30, C-31, C-32, D-12                                                    | A, B, C, D | High    |
| G5   | Không tìm thấy / bản ghi đã xóa / tab cũ         | A-18, B-01, B-16, B-17, C-24, C-29, D-10                                                    | A, B, C, D | Medium  |
| G6   | Màn chi tiết: hiển thị thiếu / sai               | B-05, B-06, B-07, B-08, B-09, B-13, B-14, B-18, B-19, C-20, C-21                            | B          | High    |
| G7   | Form: giá trị mặc định & validation              | C-02, C-03, C-05, C-06, C-14, C-18, C-19                                                    | C          | Medium  |
| G8   | Form: 器具種別 ↔ 機材紐づけ                      | C-10, C-11, C-12, C-25                                                                      | C          | High    |
| G9   | Form: copy / UI nhỏ khác                         | C-01, C-04, C-07, C-08, C-09, C-13, C-16, C-17, C-22, C-26, C-27                            | C          | Low     |
| G10  | Master tham chiếu: lỗi riêng                     | D-05(còn lại), D-06, D-08, D-14                                                             | D          | Medium  |
| G11  | Header / sidebar / chi tiết nhỏ ở list           | A-03, A-05, A-06, A-20                                                                      | A          | Low     |
| BE   | Phải sửa ở BE (thêm vào BE_REQUEST)              | A-15, A-16, D-03, A-18/B-01 (GET trả 200), B-10/C-28 (更新者), D-08/D-09 (500), C-27 (code) | —          | —       |
| PO   | Cần PO xác nhận, tạm không fix                   | A-19, B-15, C-15                                                                            | —          | —       |

Ký hiệu bug: `A-01` = `BUG-Y08A-01`, v.v. Chi tiết tái hiện ở cột Notes của TC tương ứng.

---

## G1 — Dialog dùng chung (A, B, D)

| Bug                     | TC                      | Hiện tượng                                                                            | Hướng fix                                                                                                      |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A-11 (High)             | A-099~101 (+A-103/142)  | 「非公開にする」 trên row menu gọi PATCH ngay, không có dialog 「非公開にしますか？」 | Thêm confirm dialog trước khi unpublish (copy theo prototype `exercise-list.tsx`); 公開にする vẫn 1 click      |
| A-13, B-12              | A-107/108, B-091/092    | Dialog chặn xóa khi 公開: title/body/button khác prototype                            | `exercise-delete-dialogs.tsx`: title 「削除しますか？」, body 「「<name>」は公開中のため…」, button 「閉じる」 |
| A-12                    | A-092/095/110           | Row menu: 「公開する」 thay vì 「公開にする」, thiếu separator giữa 編集 và 公開      | Sửa label trong `constants.ts` + thêm `DropdownMenuSeparator`                                                  |
| B-11                    | B-034/035/039           | Toast sau publish 「ステータスを更新しました」                                        | 「エクササイズを公開しました」 / 「…非公開にしました」 (dùng chung list + detail)                              |
| A-08, B-03, D-13 (High) | A-143, B-102/114, D-133 | Tên/code dài không ngắt (token liền) → nút trong dialog xóa ra ngoài viewport         | Thêm `break-all`/`[overflow-wrap:anywhere]` cho description của dialog (sửa trong dialog của Y-08)             |
| D-11 (High)             | D-059/074/076/132/134   | 説明 dài làm dialog create/edit cao vượt màn hình, nút không bấm được                 | `max-h` + `overflow-y-auto` cho body dialog, footer cố định                                                    |
| D-05 (xóa)              | D-096                   | Copy dialog xóa master khác prototype                                                 | Sửa theo prototype                                                                                             |

## G2 — Double-submit (A, B, C, D)

| Bug  | TC            | Hiện tượng                                    | Hướng fix                                                   |
| ---- | ------------- | --------------------------------------------- | ----------------------------------------------------------- |
| A-14 | A-102/115/126 | Spam row menu 公開 → 4 PATCH + 4 toast        | Bỏ qua khi `publishMutation.isPending` cho cùng id          |
| B-02 | B-043/095     | 5 click nút 公開する trong dialog → 5 PATCH   | Disable nút confirm khi pending; đóng dialog sau thành công |
| C-23 | C-172/174     | Triple-click 登録する → 3 POST (1×201, 2×500) | Guard `isSubmitting \|\| isPending` + disable nút 登録/保存 |
| D-07 | D-045/101     | Double click 登録する / 削除する → 2 request  | Disable nút khi mutation pending                            |

## G3 — Tìm kiếm / lọc / phân trang (A, D)

| Bug         | TC                               | Hiện tượng                                                    | Hướng fix                                                                                                                                                                                                                               |
| ----------- | -------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-02 (High) | A-071/072/075/077/147            | Không có banner 「全 N 件中 M 件を抽出中」                    | Dùng `FilterResultBanner` (`src/components/common`) như `domains/page.tsx`                                                                                                                                                              |
| D-01 (High) | D-020/022/026/027/135            | Như trên ở màn master                                         | Như trên, theo từng tab                                                                                                                                                                                                                 |
| A-01 (High) | A-004/073/074                    | Badge số lượng theo tổng đã lọc                               | Query riêng không điều kiện (`limit=1`) lấy tổng toàn bộ cho badge + banner                                                                                                                                                             |
| A-04 (High) | A-038/065/076                    | Không khớp → hiện copy 「登録されたエクササイズはありません」 | Có điều kiện → 「条件に一致するエクササイズがありません」 + 「条件をクリア」; không điều kiện giữ copy spec                                                                                                                             |
| A-09, D-04  | A-041/080/088/090/136/137, D-031 | Keyword 101 ký tự → 400, màn rỗng không có thông báo          | A: theo D17 không dùng `maxLength`, hiện message 「検索キーワードは100文字以内…」 và không gửi keyword; thêm error state + 再試行, kéo page vượt tổng về trang cuối, bỏ qua id master không hợp lệ. D: `maxLength=100` (TC D chấp nhận) |
| A-17        | A-043                            | IME đang compose cũng gọi API                                 | Bỏ qua thay đổi khi `isComposing`, chỉ search khi `compositionend`                                                                                                                                                                      |
| A-10        | A-116                            | Xóa dòng cuối trang cuối → trang rỗng                         | Sau xóa nếu `items.length === 1 && page > 1` → lùi 1 trang                                                                                                                                                                              |
| D-02        | D-025/145                        | Keyword/page không reset hoặc dùng chung khi đổi tab          | State keyword + page riêng cho từng tab (hoặc reset khi đổi tab theo prototype)                                                                                                                                                         |

## G4 — Bố cục với giá trị dài / màn rộng

| Bug         | TC                | Hiện tượng                                      | Hướng fix                                                      |
| ----------- | ----------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| A-07 (High) | A-140/141/145     | Cột tên `whitespace-nowrap`, bảng rộng 3177px   | Truncate + tooltip (`TextWithTooltip`), `max-w` cho cột tên    |
| D-12 (High) | D-129/130/131/136 | Như trên ở bảng master (名称 / 用語 / コード)   | Như trên                                                       |
| B-04 (High) | B-076/113         | Bước giải thích 4000 ký tự liền không ngắt dòng | `break-words [overflow-wrap:anywhere]`                         |
| C-30 (High) | C-209/217         | Chip 協働筋 dài làm card 基本情報 cuộn ngang    | Chip `max-w-full truncate` + `title`, dòng 「選択中」 cho wrap |
| C-31        | C-206             | Tên related dài bị cắt nhưng không có tooltip   | Thêm `title`/tooltip                                           |
| A-21, C-32  | A-139, C-218      | Ô search / form trải hết chiều ngang ở ≥1440    | `max-w-sm` cho ô search; form `max-w-5xl` theo prototype       |

## G5 — Không tìm thấy / bản ghi đã xóa

| Bug        | TC                       | Hiện tượng                                            | Hướng fix                                                                                    |
| ---------- | ------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| B-17, C-24 | B-010, C-012/013         | id không tồn tại (404) → lỗi mạng chung + 再試行      | Bắt 404 `E-EXM-001` → state 「エクササイズが見つかりません」 + link về danh sách             |
| B-16       | B-099                    | Xóa ở tab cũ → 404, dialog vẫn mở, ở lại trang        | 404 khi xóa → đóng dialog, toast, quay về list                                               |
| D-10       | D-102                    | Như trên ở master                                     | 404 → đóng dialog + invalidate list                                                          |
| C-29       | C-153                    | Related đã bị xóa vẫn hiện như bình thường trong form | Lọc bỏ id không còn trong danh sách candidate (hoặc gắn nhãn 「削除済み」)                   |
| A-18, B-01 | A-111, B-012/046/088/096 | Bản ghi đã xóa vẫn mở được bằng URL                   | **BE**: GET trả 200 cho bản ghi đã xóa logic, DTO không có `deletedAt` → thêm vào BE_REQUEST |

## G6 — Màn chi tiết (B)

| Bug         | TC                    | Hiện tượng                                                | Hướng fix                                                                        |
| ----------- | --------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| B-05 (High) | B-078/080/082/083/124 | タグ設定 chỉ hiện 「未設定」, không liệt kê tag master    | Liệt kê toàn bộ tag master với trạng thái ON/OFF + mô tả (danh sách phẳng, B18)  |
| B-18, C-20  | B-115, C-136/138      | 器具種別 「なし（自重）」 hiện 「未設定」                 | Khi `toolId` null nhưng đã chọn なし → hiện 「なし（自重）」 (xem cách form lưu) |
| B-09        | B-002                 | Thiếu subtitle mã bài tập (EX-xxxxx) dưới tiêu đề         | `PageHeader subtitle={exerciseCode}`                                             |
| B-06        | B-062/063/123         | 紐づけ機材 không có header 「機材名」                     | Bảng có header theo prototype                                                    |
| B-07        | B-084/085             | 関連エクササイズ không có header, カテゴリ là text thường | Bảng có header エクササイズ名/カテゴリ/レベル, カテゴリ là outline badge         |
| B-08        | B-067/089             | API 機材 lỗi → hiện UUID thô                              | Có error state trong card                                                        |
| B-13        | B-050/051             | Không có ảnh: 「画像はありません」, 4:3                   | 「写真未登録」 + icon dumbbell, khung 16:9                                       |
| B-14        | B-070~072             | Label 「英語版（自動生成）」                              | 「英語（自動生成）」                                                             |
| B-19, C-21  | B-074, C-119          | Xuống dòng trong bước giải thích không hiển thị           | `whitespace-pre-wrap`                                                            |
| B-10, C-28  | B-016/029, C-182      | Thiếu field 更新者, thứ tự field khác                     | Sửa thứ tự theo prototype; 更新者 → **BE** (DTO không có `updatedBy`)            |

## G7 — Form: mặc định & validation (C)

| Bug        | TC                    | Hiện tượng                                                        | Hướng fix                                                                 |
| ---------- | --------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| C-03       | C-019/020/161~166/214 | Footer 「未入力の項目があります」 không bao giờ hiện              | Hiện khi submit thất bại do thiếu field bắt buộc                          |
| C-14       | C-170/171/234         | Lỗi bắt buộc ở tab khác → không chuyển tab, người dùng không thấy | `onInvalid` → chuyển tới tab chứa field lỗi đầu tiên + focus/scroll       |
| C-02       | C-029/031/167/168     | 両手使用区分 mặc định 「両手」, không có 「選択してください」     | Mặc định rỗng + placeholder, bắt buộc chọn                                |
| C-18       | C-010/038             | 休憩時間 rỗng (placeholder 90) thay vì giá trị 90                 | Giá trị mặc định 90                                                       |
| C-05       | C-040/041             | Số âm → message tiếng Anh của zod                                 | Message tiếng Nhật                                                        |
| C-06, C-19 | C-042/044             | `1e3` được chấp nhận; 10 chữ số vẫn lưu                           | Chỉ nhận số nguyên dạng chữ số; tối đa 9 chữ số (giá trị mặc định của TC) |

## G8 — Form: 器具種別 ↔ 機材紐づけ (C)

| Bug         | TC                | Hiện tượng                                                                               | Hướng fix                                                  |
| ----------- | ----------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| C-25 (High) | C-130~133/212/216 | Đổi バーベル→ダンベル xóa âm thầm các 機材 đã liên kết                                   | Giữ lại, gắn badge 「種別不一致」 + tooltip theo prototype |
| C-12        | C-137/142         | Dialog đổi sang なし（自重） thiếu số lượng 「（2件）」 + 「この操作は元に戻せません。」 | Sửa copy theo prototype                                    |
| C-10        | C-124             | Thiếu text gợi ý なし（自重）/種別不一致                                                 | Thêm copy theo prototype                                   |
| C-11        | C-125             | Dòng candidate không có badge loại dụng cụ                                               | Thêm badge                                                 |

## G9 — Form: copy / UI nhỏ (C)

| Bug  | TC                | Hướng fix                                                                                                                          |
| ---- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| C-01 | C-007/008         | Thêm 「保存後に自動採番されます」「（手動編集不可）」                                                                              |
| C-04 | C-034             | Chip 協働筋 đang chọn có icon ✓, focus được bằng bàn phím (button / ToggleGroup)                                                   |
| C-07 | C-094/095         | Đủ 5 ảnh → ẩn/disable vùng thêm ảnh, file thứ 6 có thông báo                                                                       |
| C-08 | C-104             | Lỗi upload chỉ 1 toast (tắt toast chung khi đã tự toast)                                                                           |
| C-09 | C-108/115         | Chấm cảnh báo trên tab 「解説ステップ」 khi 公開 mà bước còn trống                                                                 |
| C-13 | C-144/146/147/154 | Copy 関連エクササイズ theo prototype (「モバイルアプリで「関連種目」として表示されます。」, 「残り3件」); dạng chọn theo prototype |
| C-16 | C-194/198         | Back link trên form dirty → dialog bỏ thay đổi (như nút キャンセル)                                                                |
| C-17 | C-002/112         | Màn edit: badge trạng thái cạnh tiêu đề, back link 「エクササイズ管理に戻る」                                                      |
| C-22 | C-059/075/114     | Toast khi lưu edit: 「エクササイズの変更を保存しました」                                                                           |
| C-26 | C-063             | Click badge 「要再翻訳」 cũng mở confirm dịch lại (spec thắng prototype)                                                           |
| C-27 | C-151/152         | Lỗi 400 vượt 3 related → hiện lỗi trên field 関連エクササイズ (code BE sai → BE_REQUEST)                                           |

## G10 — Master tham chiếu (D)

| Bug  | TC        | Hiện tượng                                                  | Hướng fix                                                           |
| ---- | --------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| D-14 | D-118     | Options 器具種別 E-03 lấy từ mock local                     | Dùng API thật `GET /admin/tool-types`                               |
| D-06 | D-060/061 | Trùng code → lỗi hiện 2 lần (field + toast)                 | `meta.suppressErrorToast` khi đã map vào field                      |
| D-08 | D-081     | 表示順 > int32 → 500                                        | Validation FE: tối đa 2147483647 (BE cũng nên trả 400 → BE_REQUEST) |
| D-05 | D-014/035 | Label 名称, placeholder 説明, separator menu khác prototype | Sửa theo prototype                                                  |

## G11 — Header / sidebar / list nhỏ (A)

| Bug  | TC            | Hướng fix                                                                     |
| ---- | ------------- | ----------------------------------------------------------------------------- |
| A-05 | A-002         | Thêm badge quyền 「本部」 (tooltip 「本部権限が必要」) như màn 参照マスタ管理 |
| A-20 | A-001         | Sidebar: highlight 「エクササイズ管理」 và mở group khi ở `/exercise-master`  |
| A-03 | A-051/066~068 | Nút 詳細フィルター dùng icon chevron down/up                                  |
| A-06 | A-018         | Định dạng ngày `yyyy/MM/dd` (có số 0 đầu)                                     |

## Ngoài phạm vi FE

**Thêm vào BE_REQUEST** (sau khi fix xong):

| Bug        | Nội dung                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| A-15       | Phân trang trùng/thiếu dòng: sắp xếp `createdAt` không duy nhất (seed cùng thời điểm) → cần tie-breaker `id` |
| A-16, D-03 | `%` / `_` trong keyword là wildcard LIKE, chưa escape                                                        |
| A-18, B-01 | `GET /admin/exercises/{id}` trả 200 cho bản ghi đã xóa logic (nên 404)                                       |
| B-10, C-28 | DTO chi tiết không có 更新者 (`updatedBy`)                                                                   |
| D-08       | 表示順 vượt int32 → 500 (nên 400)                                                                            |
| D-09       | Dùng lại code của master đã xóa → 500 (nên cho phép hoặc 409)                                                |
| C-23       | Tạo đồng thời → 500 `E-SYS-001` (FE chặn được bằng G2, nhưng BE vẫn nên trả lỗi đúng)                        |
| C-27       | Vượt 3 related trả `E-VAL-001` thay vì `E-EXM-005`                                                           |

**Cần PO xác nhận** (giữ NG, không fix ở lượt này):

- A-19 — mã bài tập (`EX-xxxxx`) đang là key tìm kiếm, FR-002 chỉ nói tên.
- B-15 — click ra ngoài overlay không đóng dialog: đây là hành vi chuẩn của `AlertDialog` trong toàn app.
- C-15 — đích đến sau khi lưu (detail theo test plan, list theo prototype).

## Thứ tự thực hiện

Chia theo cụm màn hình (mỗi cụm sở hữu file riêng để làm song song):

1. **Cụm List (A)** + dialog dùng chung: G1, G2 (A), G3 (A), G4 (A), G11. File: `exercises/page.tsx`, `_components/exercises-*`, `exercise-row-actions.tsx`, `exercise-delete-dialogs.tsx`, `app-sidebar.tsx`.
2. **Cụm Detail (B)**: G6, G5 (B), G2 (B), B-04. File: `exercises/[id]/**`.
3. **Cụm Form (C)**: G7, G8, G9, G5 (C), G2 (C), C-30/31/32. File: `exercises/_components/exercise-form*`, `_schemas/exercise-form.schema.ts`, `[id]/edit`, `create`.
4. **Cụm Master (D)**: G3 (D), G4 (D), G10, D-07, D-10, D-11, D-13. File: `exercise-master/**`.
5. `npm test && npm run lint` + `npx tsc --noEmit`.
6. Chạy lại `/execute-testcases` cho 4 unit, ưu tiên các TC đang NG + Block-do-bug (A-103, A-142), sau đó regression các TC OK cùng khu vực.
7. Cập nhật BE_REQUEST với các mục ở phần "Ngoài phạm vi FE".

## Kết quả

Fix bằng 4 agent theo cụm màn hình, sau đó verify black-box (`/execute-testcases`, production build, backend dev) qua 4 vòng: R2 (toàn bộ NG + regression), R3 (bug còn lại + bug mới của R2), R4 (regression BUG-Y08D-15 do fix D-12 gây ra).

| Unit      | Round 1 (OK / NG / Block) | Sau R4 (OK / NG / Block) | Bug FE mới phát hiện & đã fix        |
| --------- | ------------------------- | ------------------------ | ------------------------------------ |
| A List    | 87 / 46 / 19              | 131 / 4 / 17             | A-22 (overlay, gộp vào PO cùng B-15) |
| B Detail  | 71 / 40 / 13              | 103 / 7 / 14             | B-20, B-21                           |
| C Form    | 148 / 68 / 18             | 212 / 4 / 18             | C-33                                 |
| D Masters | 111 / 30 / 4              | 138 / 3 / 4              | D-15 (regression của fix D-12)       |
| **Tổng**  | **417 / 184 / 54**        | **584 / 18 / 53**        |                                      |

**18 NG còn lại đều không phải bug FE:**

| Loại                                          | Bug                                                                    | TC                                  |
| --------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| BE No.20 — GET bản ghi đã xóa trả 200         | A-18, B-01, C-24 (phần đã xóa), C-29                                   | A-111, B-012/046/088/096, C-013/153 |
| BE No.21 — `%` / `_` chưa escape              | A-16, D-03                                                             | A-046, D-030                        |
| BE No.22 — thiếu 更新者                       | B-10, C-28                                                             | B-016/029, C-182                    |
| BE No.24 — dùng lại code đã xóa → 500         | D-09                                                                   | D-065                               |
| BE No.25 — mã lỗi E-VAL-001 thay vì E-EXM-005 | C-27                                                                   | C-151                               |
| PO                                            | A-19 (tìm theo mã), A-22 / B-15 (click overlay không đóng AlertDialog) | A-037, A-100, B-038                 |
| Task riêng                                    | D-14 — E-03 器具種別 vẫn chạy mock (cần chuyển cả E-03 sang real API)  | D-118                               |

Ghi chú:

- A-15 (phân trang trùng dòng) không còn tái hiện ở R2 → không đưa vào BE_REQUEST.
- C-15 (đích đến sau khi lưu): TC-176 được ghi OK vì case ghi rõ đây không phải NG; vẫn cần PO chốt.
- Ngoài phạm vi màn Y-08: `src/hooks/use-media-upload.hook.ts` tắt toast lỗi chung cho presign (hook đã tự toast) → ảnh hưởng mọi màn upload ảnh, theo hướng bỏ toast trùng.
- Dữ liệu test của R2–R4 đã xóa hết qua UI; do BE No.20, các bản ghi đã xóa vẫn mở được bằng URL trực tiếp.
