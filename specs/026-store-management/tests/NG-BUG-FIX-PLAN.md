# Y-02 Store management: NG bug fix plan

Nguồn: 8 file TC trong `tests/cases/`, kết quả chạy ngày 2026-10-05 (976 case: 736 OK, 129 NG, 111 Block).
129 case NG tương ứng với 85 bug ID: `BUG-U1-xx` … `BUG-U8-xx` và R11.

Bug được chia làm 3 loại:

- **FE fix (62 bug)**: sửa trong repo này, chia thành Wave 1 (phần dùng chung) và Wave 2 (theo màn hình).
- **BE-API (6 bug, tính cả R11)**: lỗi phía BE, ngoài scope FE. Trong file TC đổi Status `NG` → `BE-API`, **không tính vào NG** (§5).
- **Block (2 bug: U8-10, U8-11)**: lỗi nằm ở màn E-01 /lockers còn chạy mock; phía store map đã gọi API thật (§5b).
- **Đã chốt với anh 2026-10-06 (§6)**: phần lớn chuyển OK-with-note, 2 bug chuyển sang FE fix (U4-06, U6-08).

---

## 1. Trình tự

```
Wave 1  Phần dùng chung (chạy tuần tự, 1 agent)       ── gate: tsc + lint
   │
Wave 2  8 agent theo màn hình, chạy song song,
        mỗi agent chỉ sửa các file mình sở hữu           ── gate: tsc + lint + diff-check
   │
Wave 3  Verify bằng skill execute-testcases theo unit
        (rerun case NG + regression lân cận)            ── cập nhật file TC
   │
Wave 4  Anh test tay, sau đó mới commit theo path
```

Wave 1 phải xong trước vì Wave 2 dùng lại các phần của nó.
Ví dụ: hook chống bấm trùng, ô nhập giờ cho phép quá 24:00, và DatePicker.
Nếu cho chạy song song thì nhiều agent sẽ cùng sửa một file.

---

## 2. Wave 1: phần dùng chung (1 agent Sonnet, chạy tuần tự)

| #      | Việc                                                                                                                                                                                                                                                                                                | Bug được fix                             | File                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| S1     | DatePicker không cho chọn sau 2026/12. Nguyên nhân: react-day-picker v9 với `captionLayout="dropdown"` mặc định lấy `endMonth` là cuối năm hiện tại. Sửa bằng cách truyền `startMonth`/`endMonth` (ví dụ: năm hiện tại −100 đến +10) và cho phép override qua props.                                | BUG-U2-01, BUG-U4-01, BUG-U7-01 (9 case) | `src/components/ui/date-picker.tsx`                                      |
| S2     | Hook `useInFlightGuard`: dùng ref để chặn lần gọi thứ 2 trong cùng tick, gói lại pattern `isSubmittingRef` đang có ở `franchise-companies/[id]/_components/unlink-store-dialog.tsx`. Wave 2 chỉ cần gắn hook này vào các nút.                                                                       | (dùng ở Wave 2)                          | `src/hooks/use-in-flight-guard.hook.ts` (mới)                            |
| ~~S3~~ | **Hoãn (Q1 Block).** Component `OvernightTimeInput`: ô text nhập `HH:MM`, cho phép giờ ≥ 24 (theo giới hạn ở **Q1**), kèm hàm parse/format và Zod refine dùng chung. Dùng để thay `type="time"` ở các ô 閉店時刻 (giờ đóng cửa). Phải hiển thị đúng giá trị đã lưu sẵn như `26:00` của store TK001. | (dùng ở Wave 2) BUG-U2-08, BUG-U4-02     | `src/components/common/overnight-time-input.tsx` (mới), cùng util/schema |

> S3 khó hơn S1/S2 nên giao cho **Opus**. S1 và S2 dùng Sonnet. Cả 3 đều nhỏ, có thể gộp vào một agent Opus để tránh phải bàn giao giữa các agent.

Quy ước text dài ở 1024px (không có code dùng chung, ghi vào prompt của mọi agent Wave 2):

- Ô text tự do (tên, địa chỉ, 備考): dùng `min-w-0` + `[overflow-wrap:anywhere]` để chuỗi không có dấu ngắt vẫn xuống dòng.
- Cột bảng có độ rộng cố định (mã, tên trong list): dùng `max-w-[…] truncate` + Tooltip hiện full giá trị.
- Dialog/Sheet: nội dung phải wrap, footer không được bị đẩy ra ngoài panel.
- Không được để trang có scroll ngang.

---

## 3. Wave 2: fix theo màn hình (8 agent song song)

Mỗi agent **chỉ sửa file trong phạm vi được giao**.
Nếu cần sửa file ngoài phạm vi thì dừng lại và báo, không tự sửa.

### A1: 店舗一覧 (danh sách store, U1). Sonnet

Phạm vi: `stores/page.tsx`, `stores/_components/stores-table-columns.tsx`, `stores-filters.tsx`, `stores/_contexts/*`.

| Bug   | Case                       | Mô tả                                                                                  | Hướng sửa                                                                                                                                                          |
| ----- | -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| U1-02 | TC-098, 099                | `prefecture`/`company`/`limit`/`page` không hợp lệ trên URL bị gửi thẳng lên API (400) | Validate từng URL param: `prefecture` thuộc 01–47, `company` là UUID, `limit` trong 1–100, `page` ≥ 1. Giá trị sai thì về mặc định và không tính vào filter badge. |
| U1-12 | TC-092, 093                | `page` vượt quá số trang thật thì bảng trống                                           | Khi `page > totalPages` (và total > 0), đặt lại về trang cuối và cập nhật URL.                                                                                     |
| U1-04 | TC-087                     | Cửa sổ phân trang gần đầu/cuối sai (1 2 … 14)                                          | Hiện 4 trang đầu (hoặc 4 trang cuối) khi đang ở gần biên.                                                                                                          |
| U1-03 | TC-114                     | API lỗi thì hiện như danh sách rỗng                                                    | Thêm trạng thái lỗi (error state) + nút 再読み込み (tải lại), tách riêng khỏi 2 kiểu empty state.                                                                  |
| U1-07 | TC-120, 121, 125, 126, 134 | Tên/mã dài làm bảng rộng 4000px                                                        | 店舗名 wrap (dùng `[overflow-wrap:anywhere]` + max-w); 店舗コード truncate + tooltip.                                                                              |
| U1-08 | TC-128                     | Option trong dropdown 運営企業 bị cắt còn khoảng 3 ký tự                               | Cho popup rộng hơn trigger (min-w theo nội dung, có max) và cho option wrap.                                                                                       |
| U1-05 | TC-088                     | Chỉ có 1 trang mà footer vẫn hiện                                                      | Đã chốt: giữ như hiện tại, không sửa → OK-with-note                                                                                                                |

### A2: 店舗登録・編集 (form tạo/sửa store, U2). **Opus** (có bug mất dữ liệu)

Phạm vi: `stores/_components/store-form*.tsx`, `store-form-photos.tsx`, `stores/create/page.tsx`, `stores/[id]/edit/page.tsx`.

| Bug       | Case        | Mô tả                                                                                                                                                | Hướng sửa                                                                                                                                         |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **U2-04** | TC-114      | **Mất ảnh**: form khởi tạo với 0 ảnh (do race lúc load, hoặc sau khi bấm 再読み込み) thì không bao giờ nhận lại ảnh. Nếu lưu thì bộ ảnh bị thay thế. | Seed lại danh sách ảnh khi query images thành công nếu field ảnh chưa dirty. Chặn lưu khi ảnh chưa load xong hoặc load lỗi (đây là chốt an toàn). |
| **U2-13** | TC-090      | PATCH store lỗi 409 nhưng PUT images vẫn được ghi; hiện 2 toast                                                                                      | Ghi tuần tự, dừng ngay ở lần lỗi đầu tiên (plan §5). Mỗi lỗi chỉ hiện 1 toast.                                                                    |
| U2-02     | TC-034, 093 | Bấm 登録/保存する 3 lần thì gửi 3 request                                                                                                            | Dùng `useInFlightGuard` (S2).                                                                                                                     |
| U2-01     | TC-016, 035 | Không chọn được ngày sau 2026                                                                                                                        | Đã được fix ở S1; chỉ cần verify.                                                                                                                 |
| U2-08     | TC-024      | Không nhập được 26:00                                                                                                                                | **Block (chờ PO, Q1)**                                                                                                                            |
| U2-06     | TC-077      | Lỗi 422 đổi brand nhưng toast lại nói 「ステータス変更」 (đổi trạng thái), footer hiện 「未入力の項目があります」 (còn mục chưa nhập)                | Map lỗi 422 đổi brand sang message đúng; footer không báo 未入力 khi lỗi đến từ server.                                                           |
| U2-07     | TC-079      | Tooltip khoá brand luôn nói 「営業中の店舗では…」 kể cả khi store đang 休業中 hoặc 閉店                                                              | Đổi copy theo trạng thái hiện tại của store.                                                                                                      |
| U2-09     | TC-045, 046 | Ở 1024px, toast lỗi che nút キャンセル/保存する ở footer                                                                                             | Đưa toast lên trên footer (offset) hoặc đổi vị trí toast cho form có sticky footer.                                                               |
| U2-10     | TC-048      | Dialog đổi mã store: nút nằm ngoài panel                                                                                                             | Mã dài trong title phải wrap (`[overflow-wrap:anywhere]`).                                                                                        |
| U2-11     | TC-082      | Không xoá được 都道府県 (tỉnh/thành)                                                                                                                 | Thêm lựa chọn rỗng (「未選択」) hoặc nút clear, gửi `null`.                                                                                       |
| U2-12     | TC-106      | Tên file dài trong thông báo lỗi ảnh không xuống dòng                                                                                                | `[overflow-wrap:anywhere]`.                                                                                                                       |
| U2-14     | TC-104      | Lưới ảnh ở 1024px có 5 cột, mong đợi 4                                                                                                               | Sửa breakpoint của grid.                                                                                                                          |

### A3: 基本情報・ステータス・変更履歴 (thông tin cơ bản, trạng thái, lịch sử, U3). **Opus** (layout sticky phức tạp)

Phạm vi: `stores/[id]/page.tsx`, `stores/[id]/_components/store-status-change-dialog.tsx`, `tabs/basic-info-tab/*`, `tabs/change-history-tab/*`, và component status badge của list (chỉ phần badge).

| Bug   | Case                       | Mô tả                                                                                                                                            | Hướng sửa                                                                                                                                                                             |
| ----- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U3-07 | TC-020, 100, 106           | Ở 1024px với tên dài, header cố định cao tới y=501. Cột phải sticky cao hơn viewport, nên nút ステータス変更 và 写真編集 gần như không bấm được. | Header không cố định khi màn thấp, hoặc cắt title còn 2 dòng (`line-clamp-2` + tooltip). Cột phải chỉ sticky khi vừa viewport (`max-h` + `overflow-auto`, hoặc bỏ sticky ở màn < lg). |
| U3-08 | TC-085, 087, 091, 093, 098 | Title, các ô 一般情報 và dialog trạng thái cắt mất text dài mà không có tooltip                                                                  | Theo quy ước wrap ở §2.                                                                                                                                                               |
| U3-09 | TC-101, 102                | Bảng 変更履歴 bị `nowrap`, rộng 11000px                                                                                                          | Cột 変更前/変更後 wrap, có max-w, `[overflow-wrap:anywhere]`.                                                                                                                         |
| U3-10 | TC-043                     | Bấm 変更する 2 lần thì gửi 2 PATCH và ghi thêm 1 dòng lịch sử thừa                                                                               | `useInFlightGuard`.                                                                                                                                                                   |
| U3-01 | TC-008, 009                | Badge trạng thái ở list không có dấu chấm, size khác badge ở detail                                                                              | Dùng chung một component `StoreStatusBadge` cho cả list và detail.                                                                                                                    |
| U3-02 | TC-068                     | Lịch sử hiện key thô `brandGroup`                                                                                                                | Thêm vào map label (ブランド).                                                                                                                                                        |
| U3-03 | TC-083                     | Nút bị khoá theo quyền là native-disabled nên Tab bỏ qua, tooltip không hiện khi focus                                                           | Dùng `aria-disabled` + chặn onClick thay cho `disabled`. Có thể tìm wrapper dùng chung đang có.                                                                                       |

> A3 có sửa status badge của list. A1 **không** được sửa badge.

### A4: 営業設定 (cài đặt giờ mở cửa, U4). Sonnet

Phạm vi: `tabs/business-settings-tab/*`.

| Bug   | Case             | Mô tả                                                                          | Hướng sửa                                                                         |
| ----- | ---------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| U4-02 | TC-047, 048, 074 | Không nhập được 24:00/26:00; giá trị 26:00 đã lưu thì hiện ô trống             | **Block (chờ PO, Q1)**                                                            |
| U4-03 | TC-053, 079, 104 | Bấm trùng 保存する/追加する/削除する                                           | `useInFlightGuard`.                                                               |
| U4-07 | TC-105           | Xoá một dòng đã bị xoá ở nơi khác (404): dialog không đóng, list không refresh | Khi nhận 404, đóng dialog và invalidate query.                                    |
| U4-08 | TC-004           | Chỉ API exceptions lỗi 500 mà cả tab hiện lỗi                                  | Tách lỗi theo section: giờ hàng tuần vẫn hiển thị.                                |
| U4-11 | TC-133           | Ở 1920px, `justify-between` đẩy cột giờ ra mép bên kia                         | Dùng grid với cột nhãn có độ rộng cố định.                                        |
| U4-01 | TC-029, 032, 071 | Không chọn được ngày năm 2027                                                  | Đã được fix ở S1; chỉ cần verify.                                                 |
| U4-06 | TC-064           | Khung giờ staff có giờ kết thúc trước giờ bắt đầu vẫn lưu được                 | Đã chốt: chặn kết thúc ≤ bắt đầu (Zod refine); vẫn cho khung nằm ngoài giờ mở cửa |

### A5: 契約・料金 (hợp đồng/phí: plan, option, campaign, U5). **Opus** (có bug mất dữ liệu khi sửa đồng thời)

Phạm vi: `tabs/contract-tab/index.tsx`, `section-header.tsx`, `main-contract-section.tsx`, `option-section.tsx`, `campaign-section.tsx`, `bind-items-drawer.tsx`, `campaign-bind-drawer.tsx`, `drawer-list-item.tsx`, `remove-action-button.tsx`, `plan-origin-badge.tsx`.

| Bug           | Case                      | Mô tả                                                                                                        | Hướng sửa                                                                                                                                       |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **U5-08**     | TC-040                    | **Mất dữ liệu**: hai phiên cùng sửa, phiên giữ dữ liệu cũ PUT full-set và ghi đè liên kết phiên kia vừa thêm | Trước khi PUT, fetch lại set hiện tại từ server (`queryClient.fetchQuery`), áp diff (thêm/bỏ) lên set mới nhất rồi mới PUT.                     |
| U5-06         | TC-026, 039               | Bấm 紐づける/解除する 2 lần thì gửi 2 PUT                                                                    | `useInFlightGuard`.                                                                                                                             |
| U5-01         | TC-004                    | API lỗi thì card hiện 0件 + データがありません                                                               | Mỗi section có error state riêng + nút 再読み込み.                                                                                              |
| U5-02 + U6-07 | U5 TC-003; U6 TC-010, 011 | Badge 0件 hiện ra khi đang load hoặc khi lỗi                                                                 | Ở `section-header.tsx`: không hiện số khi loading hoặc error. **Sửa chung cho cả U6.**                                                          |
| U5-03         | TC-090, 093               | Bảng plan rộng 1506px, icon unlink nằm ngoài màn hình                                                        | Cột tên wrap; cột action dùng `sticky right-0`, hoặc ép max-w cho cột tên.                                                                      |
| U5-11         | TC-095                    | Tên có token không ngắt tràn khỏi Sheet                                                                      | `[overflow-wrap:anywhere]` + `min-w-0`.                                                                                                         |
| U5-12         | TC-097                    | Dialog 解除: footer bị đẩy ra ngoài màn hình                                                                 | Body của dialog phải wrap.                                                                                                                      |
| U5-13         | TC-114                    | Badge 全社共通 rơi xuống dòng riêng khi tên wrap                                                             | Bố cục flex: tên `min-w-0 flex-1`, badge `shrink-0`.                                                                                            |
| U5-07         | TC-045                    | PUT lỗi 500 thì Sheet đóng và mất lựa chọn                                                                   | Lỗi thì giữ Sheet mở và giữ lựa chọn để người dùng thử lại.                                                                                     |
| U5-04         | TC-080, 081               | Tooltip plan/option ghi 「権限がありません」                                                                 | Đổi copy thành 販売設定（主契約）/（オプション）はHQ/Systemのみ操作可能.                                                                        |
| U5-05         | TC-028                    | Hiện UUID thay vì `optionCode` (OP-xxxx)                                                                     | Hiển thị và tìm theo `optionCode`.                                                                                                              |
| U5-10         | TC-053                    | Placeholder thiếu 「・ID」, search chỉ gửi `nameQuery`                                                       | **Kiểm tra API live trước**: nếu có param tìm theo ID/code thì thêm vào; nếu không có thì chỉ đổi placeholder theo khả năng thật và ghi chú BE. |

### A6: 1DayPass価格設定 (giá 1DayPass, U6). **Opus** (bug pointer-events của modal lồng nhau)

Phạm vi: `one-day-pass-section.tsx`, `one-day-pass-price-drawer.tsx`. **Không sửa** `section-header.tsx` và `index.tsx` (thuộc A5).

| Bug       | Case                 | Mô tả                                                                                                                    | Hướng sửa                                                                                                                                                                                                          |
| --------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **U6-05** | TC-008, 058, 062–065 | Không bấm được nút trong dialog 設定を解除 bằng chuột: AlertDialog mở bên trong Drawer nên body bị `pointer-events:none` | Mở AlertDialog với `modal` phù hợp, hoặc render dialog ra ngoài Drawer (portal cùng cấp), hoặc đóng Drawer trước khi mở. Phải test bằng click chuột thật, không dùng click qua code.                               |
| U6-06     | TC-066               | Bấm 解除する 2 lần thì mỗi ngày bị DELETE 2 lần                                                                          | `useInFlightGuard`.                                                                                                                                                                                                |
| U6-02     | TC-005, 014, 065     | Store chưa có giá mặc định thì không dùng giá master 1Day利用                                                            | **Curl API live trước** để tìm nguồn giá master (ví dụ endpoint plan master hoặc field trong response one-day-pass-price). Nếu có thì dùng làm fallback cho câu chữ và band. Nếu không có thì chuyển thành bug BE. |
| U6-03     | TC-012               | Nhãn ghi 設定可能レンジ                                                                                                  | Đổi thành 本部設定レンジ.                                                                                                                                                                                          |
| U6-04     | TC-025               | Ngày đã chọn hiện dạng ISO                                                                                               | Đổi sang format `yyyy/MM/dd`.                                                                                                                                                                                      |
| U6-08     | TC-070               | Tooltip không nêu role được phép                                                                                         | Đã chốt: đổi copy thành 「1DayPass価格の編集はHQ/System・店舗スタッフのみ可能です」                                                                                                                                |
| U6-09     | TC-082, 083          | Cột 備考 `nowrap`, rộng 2300px                                                                                           | Wrap + max-w.                                                                                                                                                                                                      |
| U6-01     | TC-015               | Giá mặc định đang sửa được (Deviation 5)                                                                                 | Đã chốt: giữ deviation, không sửa → OK-with-note                                                                                                                                                                   |

### A7: 入退館設定 (cài đặt ra vào, U7). Sonnet

Phạm vi: `tabs/access-settings-tab/*`.

| Bug   | Case                  | Mô tả                                               | Hướng sửa                                                    |
| ----- | --------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| U7-02 | TC-074                | Tên partner dài làm bảng rộng 3000px                | Wrap hoặc truncate + tooltip.                                |
| U7-03 | TC-051                | Phí YOGA không có giới hạn trên; số lớn gây lỗi 500 | Thêm giới hạn max vào Zod theo **Q6** (đề xuất 999,999,999). |
| U7-01 | TC-008, 031, 037, 061 | Không chọn được ngày sau 2026                       | Đã được fix ở S1; chỉ cần verify.                            |

### A8: 店舗マップ (bản đồ store, U8). **Opus** (luồng lưu + vòng lặp logout)

Phạm vi: `stores/map/page.tsx`, `stores/[id]/map/**`, `stores/_components/store-floor-map.tsx`, `locker-marker.tsx`, `tabs/store-map-tab/*`.

| Bug   | Case       | Mô tả                                                                     | Hướng sửa                                                                                                                                                                                            |
| ----- | ---------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U8-03 | TC-051     | Vị trí tủ được PATCH song song với upload ảnh                             | Chạy tuần tự: presign → S3 → PUT details xong rồi mới PATCH tủ. Nếu ảnh lỗi thì dừng (M-FR-085).                                                                                                     |
| U8-05 | TC-102     | Lưu khi offline thì nút treo mãi ở 「保存中...」                          | Kiểm tra `navigator.onLine` và đặt timeout cho fetch; khi lỗi thì hiện thông báo và giữ draft.                                                                                                       |
| U8-06 | TC-101     | Hết phiên khi đang có draft thì app gọi logout khoảng 70 lần              | Chặn để logout/redirect chỉ chạy 1 lần. **Có thể nằm ở `use-unsaved-changes-guard.hook.ts` hoặc interceptor 401 dùng chung.** Nếu đúng vậy thì A8 chỉ báo lại, việc sửa giao cho Wave 1b (xem dưới). |
| U8-04 | TC-097     | Bấm trùng 変更を保存                                                      | `useInFlightGuard`.                                                                                                                                                                                  |
| U8-09 | TC-109     | Đổi store ở header khi đang có draft: không có dialog, không chuyển store | Theo dõi store trên header; nếu đang dirty thì hiện dialog hỏi huỷ thay đổi (破棄), xác nhận thì chuyển sang store mới.                                                                              |
| U8-01 | TC-141–145 | Breadcrumb/badge tên dài chui dưới app header; title bị bóp còn 20px      | Breadcrumb truncate + tooltip; badge `max-w` + truncate; title `min-w-0` / `shrink-0` hợp lý.                                                                                                        |
| U8-02 | TC-147     | Tên file dài trong thông báo lỗi không xuống dòng                         | `[overflow-wrap:anywhere]`.                                                                                                                                                                          |
| U8-07 | TC-121     | Lỗi 403 hiện như lỗi mạng                                                 | Phân biệt 403 để hiện thông báo không có quyền.                                                                                                                                                      |
| U8-12 | TC-055     | File `.png` giả vẫn lưu được                                              | Validate ảnh bằng cách decode (`Image.onload`/`naturalWidth`) trước khi cho lưu.                                                                                                                     |

**Wave 1b (chỉ chạy nếu cần):** nếu U8-06 nằm ở hook hoặc interceptor dùng chung thì giao 1 agent Sonnet sửa riêng sau khi A8 xong. Lý do: hook dùng chung ảnh hưởng mọi màn.

---

## 4. Wave 3: verify bằng execute-testcases

- Mỗi unit chỉ rerun **các case NG** của unit đó, cộng thêm vài case OK lân cận cùng chức năng để bắt regression (ví dụ: các case lưu form chính).
- Làm theo memory: khi NG chuyển OK thì xoá Bug ID/Bug Priority, rồi cập nhật bảng summary. Sau khi chạy `fill-results.js` thì kiểm tra lại bảng summary có bị hỏng không.
- Verifier là **black-box**, không được sửa source. Sau mỗi agent, kiểm tra `git diff --stat src/` không có thay đổi lạ.

| Unit          | Model    | Lý do                                                       |
| ------------- | -------- | ----------------------------------------------------------- |
| U1 店舗一覧   | Sonnet   | URL/paging/layout, kiểm tra đơn giản                        |
| U2 登録・編集 | **Opus** | Race mất ảnh (cần lặp hard load khoảng 10 lần) + thứ tự ghi |
| U3 基本情報   | Sonnet   | Layout + bấm trùng                                          |
| U4 営業設定   | Sonnet   |                                                             |
| U5 契約・料金 | **Opus** | Test 2 tab đồng thời (TC-040)                               |
| U6 1DayPass   | Sonnet   | Chỉ cần nhấn mạnh trong prompt: bấm bằng chuột thật         |
| U7 入退館     | Sonnet   | Ít case                                                     |
| U8 店舗マップ | **Opus** | Thứ tự request theo thời gian, offline, 401                 |

**Hạn chế về tài khoản:** mỗi tài khoản chỉ giữ một phiên đăng nhập, nên chạy tối đa **2 verifier song song**.
Mỗi verifier dùng role riêng: một bên HQ, một bên System.
Case Manager/Staff thì chạy tuần tự sau cùng.

**Dữ liệu vĩnh viễn:** một số case rerun sẽ tạo thêm dữ liệu không xoá được:

- TC-034 (U2): bấm trùng khi tạo store sẽ tạo thêm 1 store.
- TC-043 (U3): chuyển 準備中 → 営業中 cần một store 準備中 mới, vì FX-STATUS-1 đã bị 閉店.

Đề xuất: tạo 1 fixture mới `FX-REVERIFY` (準備中) dùng chung cho cả hai, xem **Q7**.

---

## 5. BE-API: lỗi phía BE, ngoài scope FE

Cách ghi vào file TC (làm ở bước cập nhật kết quả của Wave 3):

- Status: `NG` → `BE-API`. Giữ Bug ID để BE tra cứu, Notes ghi rõ endpoint + response.
- Bảng summary thêm dòng `BE-API`; dòng NG **không** tính các case này.

| Bug           | Case           | Nội dung                                                                          |
| ------------- | -------------- | --------------------------------------------------------------------------------- |
| U1-01         | U1 TC-042      | Search với `%` / `_` không escape LIKE, trả toàn bộ store.                        |
| R11           | U1 TC-058, 059 | `GET /admin/fc-companies` chỉ cho HQ, nên Manager/Staff không có filter 運営企業. |
| U3-04         | U3 TC-026      | `GET /admin/fc-companies/{id}` trả 403 cho Manager/Staff, 運営企業 hiện 「—」.    |
| U3-11         | U3 TC-055      | `PATCH /admin/stores/{id}` cho chuyển 営業中 → 閉店 thủ công (đúng ra phải 422).  |
| U5-09         | U5 TC-054      | `GET /admin/campaigns` trả 500 E-SYS-001 cho mọi brand.                           |
| (không có ID) | U4 (summary)   | `PUT business-hours` không kiểm tra quyền 職位: Staff vẫn nhận 200.               |

> U7-03 (phí YOGA quá lớn gây 500) vẫn để FE fix (thêm max). Việc BE nên validate thêm chỉ ghi chú, không tách ID.

## 5b. Block: phụ thuộc màn E-01 /lockers (còn mock)

Đã kiểm tra code: phía store map **đã dùng API thật** cho dữ liệu tủ.
`store-map-tab/index.tsx` và `store-map-setup.tsx` gọi `adminLockerControllerListLockersInfiniteOptions` (`GET /admin/lockers`) và PATCH vị trí tủ qua `src/lib/api-real`.
Cả 2 bug đều xảy ra ở **màn E-01 /lockers** (chưa tích hợp API thật), nên chuyển `NG` → `Block`.

| Bug   | Case   | Hiện tượng                                                                                                                                                                                                                                                                     | Vì sao Block                                                                                |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| U8-10 | TC-014 | Ở form sửa tủ E-01 (`/lockers/locker-001/edit`, dữ liệu mock), link 店舗マップ設定 chuyển thẳng sang `/stores/store-006/map` mà không hỏi huỷ thay đổi. `store-006` là id mock, nên màn map báo 「店舗情報の取得に失敗しました」. Nút 「フロアマップを確認する」 không làm gì. | Toàn bộ lỗi nằm trên màn E-01 mock; không có tủ thật nào để đi vào luồng này.               |
| U8-11 | TC-085 | Ở store map, nút 詳細 mở tab mới `/lockers/{id tủ thật}` (id đúng). Tab mới báo lỗi 「何らかの問題が発生しました」 vì trang chi tiết E-01 vẫn đọc mock, không tìm thấy id thật.                                                                                                | Phía store map làm đúng (đúng id, mở tab mới). Lỗi là do trang đích E-01 chưa gọi API thật. |

Notes ghi: `Block (E-01 /lockers còn mock) — rerun khi tích hợp E-01 real API`.

---

## 6. Quyết định (anh chốt 2026-10-06)

| Bug (case)                                                 | Quyết định                                                                                                                             | Status ghi vào TC       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| U1-05 (U1 TC-088)                                          | Giữ footer 「全 N 件」 + 表示件数 khi chỉ có 1 trang                                                                                   | OK-with-note            |
| U4-06 (U4 TC-064)                                          | Chặn giờ kết thúc ≤ bắt đầu; cho phép khung ngoài giờ mở cửa                                                                           | Sửa FE (A4) → verify    |
| U6-01 (U6 TC-015)                                          | Giữ 基準価格 sửa được (Deviation 5)                                                                                                    | OK-with-note            |
| U6-08 (U6 TC-070)                                          | Tooltip theo FR-091: 「1DayPass価格の編集はHQ/System・店舗スタッフのみ可能です」                                                       | Sửa FE (A6) → verify    |
| U2-05 (U2 TC-033, 038)                                     | Không seed giờ mặc định khi tạo store                                                                                                  | OK-with-note            |
| U2-03 (U2 TC-041, 042)                                     | Giữ quy tắc định dạng 郵便番号/電話番号/FAX kiểu Nhật; báo PO bổ sung spec                                                             | OK-with-note            |
| U1-09, U7-04, U8-08 (U1 TC-005, 006; U7 TC-068; U8 TC-137) | Theo ma trận quyền Y-02: Trainer/Observer 403 là đúng                                                                                  | OK-with-note            |
| U1-11, U3-06 (U1 TC-107; U3 TC-074)                        | Không sửa code. Kiểm tra quyền của 職位 tài khoản Staff: thiếu quyền → Block (account); 職位 có quyền mà nút vẫn khoá → NG, giao A1/A3 | Block (account) hoặc NG |
| U5-14 (U5 TC-055)                                          | Tạm theo T208 (lọc theo brand của store)                                                                                               | Block (chờ BE U5-09)    |
| U1-10, U3-05, U4-09 (U1 TC-003; U3 TC-073; U4 TC-115)      | Manager scope theo ma trận quyền Y-02.md: 「Manager ○ 全店舗 参照のみ」 → Manager xem mọi store (chỉ đọc) là đúng. Bỏ khỏi BE-API      | OK-with-note            |

> Với U1-10/U3-05/U4-09: verifier phải kiểm tra thêm phần 「参照のみ」 (chỉ đọc) — Manager mở store không thuộc mình thì mọi nút ghi phải bị khoá. Nếu có nút ghi còn dùng được thì ghi NG mới.

Các giá trị đã chốt:

| #   | Bug                                            | Quyết định                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | U2-08 (U2 TC-024), U4-02 (U4 TC-047, 048, 074) | **Block (chờ PO)**. Backend dùng 30時制 (`00:00`–`30:00`, ví dụ 26:00 = 2h sáng hôm sau) nhưng Y-02.md không định nghĩa. Cách nhập (mask / 2 dropdown / combobox / checkbox 翌日) chờ PO chốt. Không sửa trong đợt này; S3 bị bỏ khỏi Wave 1. |
| Q6  | U7-03                                          | Phí YOGA tối đa 999,999,999                                                                                                                                                                                                                   |
| Q7  | —                                              | Được tạo fixture mới tuỳ ý để verify                                                                                                                                                                                                          |

---

## 7. Ước lượng và gate

| Wave | Agent                 | Model                                        |
| ---- | --------------------- | -------------------------------------------- |
| 1    | 1 (S1+S2+S3)          | Opus (S3), hoặc tách: S1/S2 Sonnet, S3 Opus  |
| 2    | 8 song song           | Opus: A2, A3, A5, A6, A8. Sonnet: A1, A4, A7 |
| 3    | 8, tối đa 2 song song | Opus: U2, U5, U8. Sonnet: còn lại            |

Gate sau mỗi wave:

- `npx tsc --noEmit --incremental false`: 0 lỗi ngoài `.next/`.
- `npm run lint`.
- `git diff --stat`: kiểm tra mỗi agent chỉ sửa file trong phạm vi được giao.

Sau Wave 3, anh test tay rồi mới commit. Commit bằng `git commit -- <paths>` để không kéo theo các file `src/lib/api-real/*` đang modified.

---

## 8. Kết quả (2026-10-06)

| Unit                              | OK      | NG    | BE-API | Block  | Tổng    |
| --------------------------------- | ------- | ----- | ------ | ------ | ------- |
| U1 店舗一覧                       | 118     | 0     | 3      | 14     | 135     |
| U2 店舗登録・編集                 | 128     | 0     | –      | 17     | 145     |
| U3 基本情報・ステータス・変更履歴 | 98      | 0     | 2      | 6      | 106     |
| U4 営業設定                       | 128     | 0     | 0      | 7      | 135     |
| U5 契約・料金                     | 94      | 0     | 2      | 18     | 114     |
| U6 1DayPass価格設定               | 86      | 0     | 3      | 2      | 91      |
| U7 入退館設定                     | 80      | 0     | –      | 3      | 83      |
| U8 店舗マップ                     | 145     | 0     | –      | 22     | 167     |
| **Tổng**                          | **877** | **0** | **10** | **89** | **976** |

Lần chạy đầu: 736 OK / 129 NG / 111 Block. Toàn bộ NG cũ đã OK, hoặc chuyển BE-API / Block theo quyết định ở §6.

Điều chỉnh so với plan ban đầu:

- **S3 (ô nhập giờ qua đêm) hoãn**: U2-08, U4-02 → Block chờ PO (Q1).
- **U6-02**: thử fallback giá master bằng plan `contractType = oneDay` → hiện sai ¥8,640 (không khớp MC005 1Day利用 ¥1,650, nằm ngoài ¥700〜¥1,800). Đã gỡ fallback, chuyển BE-API.
- **U5-10** (tìm campaign theo ID) → BE-API: `codeQuery` tìm `campaignCode` và AND với `nameQuery`.
- **U1-11 / U3-06** → Block (account): 職位 正社員スタッフ / 店舗責任者 đều chưa có 4 quyền sửa store. 職位 của tài khoản Staff bị đổi sang 正社員スタッフ lúc 17:46 ngày 2026-10-06 (không phải do QA).
- **Bug mới phát hiện khi API campaign hết 500**: BUG-U5-15..18 (ID hiện UUID, bảng campaign tràn ở 1024, 割引概要 khác prototype, list không refetch khi lỗi) → đã sửa, retest OK (round 3). 割引概要 làm theo prototype vì Y-02 không định nghĩa.
- **Sửa thêm trong lúc verify**: `limit` URL chỉ nhận 25/50/100; DatePicker cho chọn tới +100 năm; `handleLogout` khi hết phiên chỉ chạy 1 lần; presign `networkMode: 'always'`.

Dữ liệu QA để lại trên backend dùng chung (vĩnh viễn):

- Store mới: QA-R2-PHOTO `01a11034-c1c0-7a24-aae8-d6c58bed4929` (準備中), QA-R2-BRANDLOCK `01a1103d-7d2b-7c17-93a9-58a8f452a668` (休業中), QA-R2-U3 / S-018 `01a11042-3592-7a10-a2e3-db913c9a251c` (休業中, có giờ mở cửa và giờ staff do U4 nhập).
- FX-FIT365: kỳ 入退館 2026/12/01〜2027/11/30 (form không xoá được ngày).
- Một số ảnh mồ côi trên S3 (`member-shared/store-image/`).

---

## 9. Việc còn treo

### 9.1 Chờ PO

| #   | Nội dung                                                                                                                                                                                                                                        | Case liên quan                 | Trạng thái TC   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------- |
| P1  | Cách nhập giờ qua đêm (30時制 `00:00`–`30:00`, ví dụ 26:00 = 2h sáng hôm sau). Y-02.md không định nghĩa; backend đã dùng. Phương án: mask HH:MM / 2 dropdown / combobox / checkbox 翌日 (đề xuất). Kèm: màn xem hiển thị `翌02:00` hay `26:00`. | U2 TC-024; U4 TC-047, 048, 074 | Block           |
| P2  | Nguồn giá master 1Day利用 cho fallback 基準価格 (FR-050a): cần BE trả về, hoặc PO chỉ rõ master nào. Kèm: giá gồm thuế hay chưa (spec Appendix A.7 còn mâu thuẫn).                                                                              | U6 TC-005, 014, 065            | BE-API          |
| P3  | Bổ sung vào spec Y-02: quy tắc 30時制; quy tắc định dạng 郵便番号/電話番号/FAX kiểu Nhật (FE đang áp dụng).                                                                                                                                     | U2 TC-041, 042                 | OK-with-note    |
| P4  | 割引概要: có ghi tên plan trước giá trị giảm như prototype không (hiện không ghi, vì 1 campaign gắn 1 plan).                                                                                                                                    | U5 TC-048                      | OK              |
| P5  | Danh sách campaign ứng viên: lọc theo brand store (T208, đang làm) hay hiện cả brand khác ở dạng mờ (FR-043).                                                                                                                                   | U5 TC-055                      | Block           |
| P6  | Cấp quyền sửa store cho 職位 của Staff (正社員スタッフ / 店舗責任者) nếu Staff được phép sửa store của mình.                                                                                                                                    | U1 TC-107; U3 TC-074           | Block (account) |

### 9.2 Báo BE (BE-API)

| #   | Lỗi                                                                  | Endpoint                                                  | Case                      |
| --- | -------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------- |
| B1  | Search không escape `%` / `_` (LIKE) → trả toàn bộ store             | `GET /admin/stores?keyword=`                              | U1 TC-042                 |
| B2  | Chỉ HQ gọi được → Manager/Staff không có filter / tên 運営企業 (R11) | `GET /admin/fc-companies`, `GET /admin/fc-companies/{id}` | U1 TC-058, 059; U3 TC-026 |
| B3  | Cho chuyển 営業中 → 閉店 thủ công (phải 422)                         | `PATCH /admin/stores/{id}`                                | U3 TC-055                 |
| B4  | Không có param tìm campaign theo tên HOẶC `campaignNumber`           | `GET /admin/campaigns`                                    | U5 TC-053, 063            |
| B5  | Không trả giá master 1Day利用                                        | `GET /admin/stores/{id}/one-day-pass-price`               | U6 TC-005, 014, 065       |
| B6  | Không kiểm tra quyền 職位: Staff nhận 200                            | `PUT /admin/stores/{id}/business-hours`                   | U4 (ghi nhận ở TC-108)    |
| B7  | Phí YOGA quá lớn gây 500 (FE đã chặn ≤ 999,999,999; BE nên validate) | `PUT …/mutual-use`                                        | U7 TC-051                 |

### 9.3 Chờ tích hợp khác

- **E-01 /lockers còn mock**: U8 TC-014, 085 Block; rerun khi E-01 lên real API.

### 9.4 Task FE riêng (ngoài phạm vi đợt này)

| #   | Nội dung                                                                                                                                                        | File                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| F1  | Sửa gốc vòng refresh token: `#promise` không reset sau khi refresh lỗi, mọi 401 sau đó đều đi vào `handleLogout`. Hiện đã chặn bằng latch trong `handleLogout`. | `src/lib/services/ClientRequest.service.ts` |
| F2  | Badge trạng thái trong `StatusCard` (`/15`, dot `size-2`) lệch token với badge header/list (`/10`, dot `size-1.5`). Component dùng chung toàn app.              | `src/components/common/status-card`         |
| F3  | Nút thử lại của error state dùng chung để cứng 「再試行する」; plan/spec nói 「再読み込み」.                                                                    | `src/components/common` (Error)             |
| F4  | Sau khi có data campaign đủ loại: verify các dạng 割引概要 chưa quan sát được (入会金, `%OFF`, `無料`, `翌月`, nối `/` và `・`).                                | U5 TC-048                                   |
