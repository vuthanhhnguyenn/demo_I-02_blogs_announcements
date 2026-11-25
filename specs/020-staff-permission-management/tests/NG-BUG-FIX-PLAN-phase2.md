# NG Bug Fix Plan — Phase 2 (Y-01 / Y-13, real API)

> Nguồn: kết quả execute 5 TC docs trong `specs/020-staff-permission-management/tests/cases/`
> Tổng: **55 bug** · Ngày lập: 2026-09-18 · Branch: `feat/implement-staff-api`

---

## 0. Cách làm việc

1. Fix **theo từng unit**, không nhảy cóc.
2. Trước khi động vào code của một unit: trình bày lại từng bug theo template dưới, **chờ user xác nhận OK hết** rồi mới fix. (Vòng xác nhận đầu tiên đã xong 2026-09-18 — xem §9.)
3. **Chỉ fix bug FE.** Bug BE / DATA / SPEC → chỉ ghi nhận + chuyển cho phía tương ứng, không tự sửa.
4. Fix xong một unit → chạy `npm run lint && npx tsc --noEmit` → retest lại đúng các TC liên quan → cập nhật NG→OK trong TC doc.

### Template trình bày mỗi bug

| Mục             | Nội dung                                |
| --------------- | --------------------------------------- |
| **Hiện tượng**  | Quan sát được từ UI/network khi test    |
| **Nguyên nhân** | Dòng code / config cụ thể               |
| **Loại**        | `FE` · `BE` · `DATA` · `SPEC`           |
| **Cách fix**    | Sửa gì, ở file nào, ảnh hưởng tới đâu   |
| **Rủi ro**      | Component dùng chung? Regress màn khác? |

### Ký hiệu loại bug

- **FE** — lỗi trong code frontend, ta fix.
- **BE** — lỗi API/contract, ta **không** fix, chỉ report.
- **DATA** — code đúng, dữ liệu master (職位 flags, store master, seed) sai/thiếu.
- **SPEC** — spec và API mâu thuẫn nhau, cần user chốt trước khi code.

### Severity

- **High** — chặn nghiệp vụ hoặc sai dữ liệu
- **Med** — sai so với spec, người dùng vẫn xoay được
- **Low** — copy / layout

---

## 1. Thứ tự fix

| #   | Unit       | Màn hình                 | Bug                  | Trạng thái                                                       |
| --- | ---------- | ------------------------ | -------------------- | ---------------------------------------------------------------- |
| —   | **Unit 3** | スタッフ編集             | 10 (FE còn: 2)       | ⏸️ **HOÃN** — `03-01`/`03-02` user đang tìm hiểu thêm, chưa code |
| 1   | **Unit 4** | スタッフ詳細             | 14 (FE: 7)           | 🔧 Agent A                                                       |
| 2   | **Unit 1** | スタッフ一覧             | 15 (FE: 11)          | 🔧 Agent B1 (10) + B2 (`01-02`)                                  |
| 3   | **Unit 5** | ログイン履歴・セッション | 6 (FE: 4)            | 🔧 Agent C                                                       |
| 4   | **Unit 2** | スタッフ新規登録         | 10 (FE: 8) + `03-08` | 🔧 Agent D                                                       |

Lý do thứ tự này: Unit 4 kế thừa trực tiếp các sửa của Unit 3 (payload PATCH / history rác) nên retest ngay được; Unit 1 nặng nhất về component dùng chung (pagination, sort header, store context) nên làm trước Unit 5 vốn tiêu thụ chính những component đó; Unit 2 cuối vì phụ thuộc nhiều nhất vào phía BE.

### Phân loại tổng

| Loại                             | Số bug | Ghi chú                                                                                                        |
| -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| **FE — còn phải fix**            | 34     | U3: 2 · U4: 8 · U1: 11 · U5: 4 · U2: 8 · `03-08`: 1                                                            |
| FE — đã fix ở Unit 3             | 8      | `03-03`…`03-07`, `03-09`, `03-10`, và `04-09`                                                                  |
| **BE — report, không fix FE**    | 7      | `01-04`, `01-14`, `02-05`, `02-10`, `04-01`, `04-02`, `04-07` — (`01-01` / `05-04` đã chuyển sang FE, xem §10) |
| Sửa contract, không sửa code     | 1      | `05-03`                                                                                                        |
| Không phải bug                   | 1      | `04-08` — xem §3.4                                                                                             |
| Không fix (chấp nhận hiện trạng) | 1      | `01-07` — chiều sort lần đầu                                                                                   |
| Ngoài scope                      | 1      | `04-05` (màn `/positions`, vẫn mock API)                                                                       |
| **Tổng**                         | **55** |                                                                                                                |

> ✅ **Toàn bộ quyết định đã chốt ngày 2026-09-18.** Không còn câu hỏi treo — xem §9.

### Cụm dùng chung gốc

| Gốc                                                | Bug                        | Fix ở                                                                           |
| -------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| Payload PATCH bỏ field / history rác               | 03-01, 03-02, 03-07, 04-09 | Unit 3 (xong) → retest ở Unit 4                                                 |
| Route guard FE (`StaffsEdit` bị flag-gate)         | 03-03                      | ✅ Unit 3 — đã fix, xem §2.2                                                    |
| ロール/職位 không gửi được lên API                 | 03-01, 03-02               | Unit 3 — khoá UI lại, xem §2.1                                                  |
| Scope check phía API (404/403 cho Manager & Staff) | 04-01, 04-02, 01-04        | **BE** — không fix FE                                                           |
| Option 「200件」 vs API cap 100                    | 01-01, 05-04               | ✅ **FE** (đảo quyết định 2026-09-21) — bỏ option 200件, FE theo cap 100 của BE |
| Dropdown FC企業 không lọc type                     | 02-06, 03-08               | Unit 2 (`fc-company-select-input` caller)                                       |
| `deactivatedReason` required                       | 01-14, 04-07               | **BE** — 1 việc duy nhất                                                        |

---

## 2. Unit 3 — スタッフ編集 (10 bug) — ⚠️ CÒN 2 BUG

8 bug đã fix, giữ lại để đối chiếu khi retest Unit 4. `03-01` / `03-02` đã chốt hướng ở §2.1, **chưa code**.

| Bug            | Sev  | Trạng thái         | Ghi chú                                                      |
| -------------- | ---- | ------------------ | ------------------------------------------------------------ |
| `BUG-P2-03-01` | High | ⏳ **Chờ code**    | Đã chốt: **khoá control ロール** — xem §2.1                  |
| `BUG-P2-03-02` | High | ⏳ **Chờ code**    | Đã chốt: **bỏ row 「未割当」** khỏi dropdown 職位 — xem §2.1 |
| `BUG-P2-03-03` | High | ✅ **Đã fix**      | Nguyên nhân xác định — xem §2.2                              |
| `BUG-P2-03-04` | High | ✅                 |                                                              |
| `BUG-P2-03-05` | Med  | ✅                 |                                                              |
| `BUG-P2-03-06` | Med  | ✅                 | `FormField` + `FormMessage` cho 備考                         |
| `BUG-P2-03-07` | Med  | ✅                 | `submitInFlightRef` + diff-based `buildRequestBody`          |
| `BUG-P2-03-08` | Med  | Chuyển sang Unit 2 | Cùng gốc FC dropdown với 02-06                               |
| `BUG-P2-03-09` | Low  | ✅                 |                                                              |
| `BUG-P2-03-10` | Low  | ✅                 | `max-h-50 min-h-25 overflow-y-auto`                          |

### 2.1 BUG-P2-03-01 / BUG-P2-03-02 — đã chốt (2026-09-18)

Cả hai cùng một gốc: **không có cách gửi "đổi ロール" hay "về 未割当" lên API.**

- `UpdateStaffRequestDto` chỉ nhận `positionId` (UUID), không có `role`.
- ロール của staff **derive từ 職位**.
- Id của 職位「未割当」 (`…0001`…`…0006`) settable nhưng **không được `GET /admin/positions` trả về** → FE không biết id để gửi (gap G5).

**Quyết định (user): không cho clear / đổi ロール ở màn edit.** UI phải phản ánh đúng khả năng thật của API, thay vì hiện control rồi im lặng bỏ qua.

#### Việc cần code

**`BUG-P2-03-01` — khoá control ロール**

- File: [edit/\_components/permission-settings-section.tsx](<src/app/(private)/staffs/[id]/edit/_components/permission-settings-section.tsx#L38>)
- Hiện tại: `canChangeRole` (HQ/System) → render `Select` **editable**; role khác → render `Select` disabled + tooltip 「ロール変更は本部権限が必要です」.
- Sửa: **luôn** render nhánh disabled, bỏ hẳn nhánh editable. Tooltip đổi thành lý do thật: ロール được quyết định bởi 職位, không sửa trực tiếp ở màn này.
- Kéo theo:
  - Prop `canChangeRole` không còn dùng cho ロール → chỉ còn phục vụ `canEditAffiliation` ở [edit/page.tsx](<src/app/(private)/staffs/[id]/edit/page.tsx#L112>). Tách tên biến cho rõ.
  - `RoleChangeConfirmDialog` + state `roleChangeDialogOpen` + nhánh `isRoleChanged` trong `onSubmit` trở thành dead code → **xoá**.
  - Bỏ `form.setValue('position_id', '')` trong `onValueChange` của ロール (không còn onValueChange).
- Đóng luôn **Block TC-059** (đổi ロール sinh 0 request) — giờ không còn control để đổi.

**`BUG-P2-03-02` — bỏ row 「未割当」 khỏi dropdown 職位**

- Cùng file, `PositionSelectInput` đang truyền `allLabel="未割当"`. Chọn row đó → `onChange(null)` → `position_id = ''` → `buildRequestBody` bỏ key → 200 + toast thành công nhưng không đổi gì.
- Sửa: `allLabel={null}` ở **màn edit** (không đổi màn create — ở đó 未割当 là default hợp lệ khi tạo mới).
- Sửa luôn dòng mô tả 「未選択の場合はロールの「未割当」職位になります」 — ở màn edit câu này không còn đúng.
- **Giữ yêu cầu BE** (§8 #7): khi `GET /admin/positions` trả cả row 未割当 thì mở lại row này.

#### Rủi ro

- Phải xác nhận flow tạo staff vẫn gán được ロール — nếu ロール chỉ đặt được lúc tạo thì đổi ロール về sau là **không làm được ở đâu cả**. Cần user xác nhận đây là hành vi mong muốn, hay phải bổ sung màn/API riêng.
- Ảnh hưởng TC: TC-021, TC-030, TC-031, TC-059 phải viết lại Expected Result theo hành vi mới.

### 2.2 BUG-P2-03-03 — đã xác minh (2026-09-18)

- **Hiện tượng báo cáo**: route `/staffs/{id}/edit` redirect `/403` cho mọi target, kể cả Staff trong phạm vi Manager, trước khi có request nào bắn ra.
- **Nguyên nhân (xác định)**: `PERMISSION_FLAG_RULES[Permission.StaffsEdit] = ['canManageStaff']`. Không 職位 Manager nào trong dev master có flag này → `flagsGrantPermission` false → `evaluatePageAccess` deny → [page-permission-guard.tsx:99](src/components/common/page-permission-guard.tsx#L99) `router.replace('/403')`. Redirect xảy ra ở client trước khi query chạy, khớp đúng triệu chứng "không có request nào".
- **Bằng chứng**: `git blame` cho thấy dòng đó ở [permission.constants.ts:856](src/constants/permission.constants.ts#L856) đã được comment out trong working tree ngày 2026-09-18 (`Not Committed Yet`), trong khi bản `HEAD` vẫn còn active. Tức là bug này đã được sửa trong đợt Unit 3.
- **Đã loại trừ**: pattern shadowing giữa `/staffs/:id` và `/staffs/:id/edit` — `generateRouteRegex` có anchor `^…$` ([routes.util.ts:119](src/lib/routes/routes.util.ts#L119)) nên không thể match nhầm.
- **Còn lại**: retest live với account Manager. Lưu ý phần 「Thêm: `GET /admin/staff/{id}` với token Manager trả 404 E-STF-001」 trong báo cáo gốc **không thuộc bug này** — đó là `BUG-P2-04-01`, bug BE.

---

## 3. Unit 4 — スタッフ詳細 (14 bug)

Trong 14 bug: **8 fix FE** (`04-14` fix chung với `01-06` ở Unit 1), 3 bug BE, 1 không phải bug, 1 đã fix ở Unit 3, 1 ngoài scope.

### 3.1 Fix ngay — FE thuần (7 bug)

#### `BUG-P2-04-06` · Med · Card 備考 biến mất khi null

- **Hiện tượng**: `memo: null` → card 備考 không render, thay vì hiện 「—」.
- **Nguyên nhân**: [staffs/[id]/page.tsx](<src/app/(private)/staffs/[id]/page.tsx#L94>) — `{staff.memo && (<Card>…)}`.
- **Loại**: FE
- **Cách fix**: bỏ điều kiện, luôn render card; body `{staff.memo ?? '—'}`.
- **Rủi ro**: không.

#### `BUG-P2-04-11` · High · 備考 không xuống dòng với chuỗi liền

- **Hiện tượng**: 1000 ký tự liền → `scrollWidth 8145px` trong card rộng 624px. Không wrap, không ellipsis, không scrollbar.
- **Nguyên nhân**: [staffs/[id]/page.tsx](<src/app/(private)/staffs/[id]/page.tsx#L99>) — `whitespace-pre-wrap` giữ nguyên xuống dòng nhưng `overflow-wrap` mặc định là `normal`, chuỗi không khoảng trắng không bị bẻ.
- **Loại**: FE
- **Cách fix**: thêm `break-words` (`overflow-wrap: anywhere`) vào `<p>`. Cân nhắc thêm `max-h-…  overflow-y-auto` cho đồng bộ với màn edit (đã cap ở 03-10).
- **Rủi ro**: không.

#### `BUG-P2-04-10` · High · Tên dài bị cắt im lặng

- **Hiện tượng**: `h1` truncate, hover không có `[role=tooltip]`, không `title`. Ô 氏名 trong 基本情報 cắt giữa token (`scrollWidth 379` vs `clientWidth 296`).
- **Nguyên nhân**: [staff-detail-header.tsx](<src/app/(private)/staffs/[id]/_components/staff-detail-header.tsx#L69>) truyền `title={fullName}` là string thô vào `PageHeader`; [staff-personal-info-card.tsx](<src/app/(private)/staffs/[id]/_components/staff-personal-info-card.tsx#L44>) render `<p>` trần. Trong khi bảng list đã có sẵn `TextWithTooltip`.
- **Loại**: FE
- **Cách fix**: bọc cả hai chỗ bằng `<TextWithTooltip>` (component đã có, dùng ở `staffs-table-columns.tsx`).
- **Rủi ro**: cần xác nhận `PageHeader` nhận `ReactNode` cho `title` — nếu chỉ nhận `string` thì phải mở rộng prop (component dùng chung toàn app, chỉ mở rộng type, không đổi hành vi).

#### `BUG-P2-04-03` · Med · 404 render thành lỗi mạng

- **Hiện tượng**: `404 E-STF-001` hiện 「何らかの問題が発生しました／…ネットワーク接続を確認して…」 + nút 再試行 (vô nghĩa).
- **Nguyên nhân**: [staffs/[id]/page.tsx](<src/app/(private)/staffs/[id]/page.tsx#L45>) — `<DataStateBoundary isError={isError}>` không phân biệt status code.
- **Loại**: FE
- **Cách fix**: đọc status qua `getApiErrorStatus(error)`; `404` → render trạng thái riêng 「スタッフが見つかりません」 + link quay về danh sách, không có nút 再試行. Các status khác giữ nguyên `DataStateBoundary`.
- **Rủi ro**: không (chỉ thêm nhánh).

#### `BUG-P2-04-13` · Med · StatusCard không sticky → **KHÔNG LÀM** (user, 2026-09-18)

- **Hiện tượng gốc**: scroll container 719px thì card trôi hết (top 234 → −485).
- **Nguyên nhân đã truy ra**: ba tầng cùng góp phần — (1) `xl:` = ≥1280px nên ở 1024 sticky không áp dụng, (2) div sticky là flex item bị `stretch` cao bằng cả hàng nên không còn quãng để dính, (3) **quan trọng nhất**: `div.flex-1.overflow-auto` bọc ngoài khai báo `overflow` nên trở thành _scrollport_ của sticky, mà chính nó lại không bao giờ scroll — scroll thật nằm ở `<main>`. Sticky vì thế pin vào một container đứng yên.
- **Quyết định (user): không cần sticky.** Cột ステータス scroll cùng phần còn lại của trang.
- **Đã làm**: gỡ `xl:sticky xl:top-*` và `xl:self-start` khỏi cột phải, giữ `xl:w-[40%]`; revert luôn thay đổi `overflow-auto` (nó chỉ tồn tại để phục vụ sticky, giữ lại sẽ đổi scroll container mà không còn mục đích gì). Để lại comment ghi rõ là cố ý.
- **Xử lý TC**: TC-071 đổi **NG → OK kèm ghi chú**, clear Bug ID + Priority.

#### `BUG-P2-04-12` · Low · 変更内容 dài kéo giãn bảng

- **Hiện tượng**: cell 4784px → table 5027px; cột 日時 co 160→111px, 操作者 200→131px.
- **Nguyên nhân**: [permission-history-tab.tsx](<src/app/(private)/staffs/[id]/_components/permission-history-tab.tsx#L79>) — `<TableCell>` cho `changeDescription` không có `max-w` / wrap.
- **Loại**: FE
- **Cách fix**: cho cột 変更内容 `w-full` + `break-words`, và cố định width 2 cột trái bằng `table-fixed` hoặc `min-w` để không bị co.
- **Rủi ro**: không.

#### `BUG-P2-04-14` · Low · Deactivate lặp thành công âm thầm

- **Hiện tượng**: `POST deactivate` lên record đã 無効 → 200 + toast thành công + thêm 1 entry history.
- **Nguyên nhân**: ở màn detail, [staff-status-card.tsx](<src/app/(private)/staffs/[id]/_components/staff-status-card.tsx#L41>) **đã** gate đúng (`INACTIVE` → hiện 有効化). Đường vào là menu row ở list — xem `BUG-P2-01-06`. BE cũng không idempotent-guard.
- **Loại**: FE (gate ở list) + BE (nên trả 409)
- **Cách fix**: fix chung với `BUG-P2-01-06` ở Unit 1. Ở Unit 4 chỉ cần retest xác nhận màn detail không tái hiện.
- **Rủi ro**: không.

### 3.2 Fix — cần thêm 1 query (1 bug)

#### `BUG-P2-04-04` · High · Pattern B không hiện phạm vi quản lý

- **Hiện tượng**: không có cả số 「管轄N店舗」 lẫn danh sách store → FR-017 fail. Nghịch lý: trên form thì G4 lại pass (U2 TC-051, U3 TC-047).
- **Nguyên nhân**: [staff-permission-card.tsx](<src/app/(private)/staffs/[id]/_components/staff-permission-card.tsx#L70>) có render `{staff.managedStoreCount > 0 && …管理店舗数}` — nghĩa là code **có**, nhưng `managedStoreCount` trả về 0/undefined cho staff pattern B. Danh sách store thì **chưa có UI** (màn create đã có, dùng `GET /admin/stores?fcCompanyId=`).
- **Loại**: FE (thiếu danh sách store) + cần xác minh DATA/BE cho `managedStoreCount`
- **Cách fix**:
  1. Xác minh response thật của `GET /admin/staff/{id}` cho một staff pattern B → nếu `managedStoreCount = 0` mà FC có store → BE, report.
  2. FE: khi `fcCompanyId` có giá trị, fetch `adminStoreControllerList({ fcCompanyId })` và render badge list — copy nguyên pattern từ [create/\_components/affiliation-section.tsx](<src/app/(private)/staffs/create/_components/affiliation-section.tsx#L107>).
- **Rủi ro**: thêm 1 query trên màn detail, chỉ chạy khi pattern B.

### 3.3 Không fix — BE / ngoài scope / đã xong (6 bug)

| Bug            | Sev  | Loại               | Xử lý                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BUG-P2-04-01` | High | **BE**             | Manager bị `404 E-STF-001` từ `GET /admin/staff/{id}` với **mọi** target, kể cả record của chính mình. FE gate đã đúng (`ROLE_PERMISSIONS[Manager]` có `StaffsView`, `canEditStaffAccount` đã nới cho Manager). Lỗi ở scoping của API. **Chặn** TC-013/014/017/031/051/052/064 — trong đó TC-051/052 quyết định gap **G8**, nên G8 chưa kết luận được. |
| `BUG-P2-04-02` | High | **BE**             | Staff bị 403 khỏi detail của chính mình, trái TC-004 (「○ 自分のみ」). BE phải cho phép self-read bất kể 職位 flags.                                                                                                                                                                                                                                   |
| `BUG-P2-04-07` | High | **BE**             | `deactivatedReason` vẫn required, trái ruling G9 (2026-09-18). Màn hình làm đúng — dialog ghi 「（任意）」, lỗi được surface qua global mutation toast. Sửa ở `DeactivateStaffRequestDto`. Trùng `BUG-P2-01-14`.                                                                                                                                       |
| `BUG-P2-04-08` | Med  | **Không phải bug** | Xem §3.4.                                                                                                                                                                                                                                                                                                                                              |
| `BUG-P2-04-09` | Med  | FE — đã fix        | 1 lần edit ghi 3 entry, 2 cái sai. Đã xử lý bằng diff-based `buildRequestBody` ở Unit 3. **Chỉ cần retest.**                                                                                                                                                                                                                                           |
| `BUG-P2-04-05` | Low  | Ngoài scope        | Deep link 職位の権限を確認 → `GET /api/crm/positions/0` 404 E-STF-009. Lỗi ở màn `/positions` (vẫn dùng mock API).                                                                                                                                                                                                                                     |

> **Block đáng chú ý**: TC-059 — đổi ロール ở đây sinh 0 request. Bản nặng hơn của `BUG-P2-03-01`, sẽ tự khỏi khi chốt §2.1.

### 3.4 BUG-P2-04-08 — rút lại, không phải bug (2026-09-18)

- **Nội dung NG gốc** (TC-049): 「1 click là POST luôn — không dialog trước, không dialog sau, chỉ toast」.
- **Kết luận**: **không có tài liệu nào yêu cầu dialog cảnh báo trước khi gọi API.** Đã rà:
  - `spec.md` **FR-020** — chỉ nói _"System MUST let a headquarters user issue a one-time CRM login link…"_, không nhắc xác nhận.
  - `checklists/parity.md` **PAR045** — nút 「CRMのログイン用URLを送る」 _"opens the magic-link dialog"_.
  - `checklists/parity.md` **PAR065** — định nghĩa dialog **sau khi gửi**: title 「ログイン用URLを送信しました」, mô tả tên/email + hạn 1 giờ, 1 nút 閉じる.
  - Chính Expected Result của TC-049: _"returns 200, and a confirmation appears"_ — tức confirmation **sau** 200, không phải trước.
- **Code thực tế**: [staff-magic-link-action.tsx](<src/app/(private)/staffs/[id]/_components/staff-magic-link-action.tsx#L61>) **đã implement đúng PAR065** — `AlertDialog open={expiresAt !== null}`, chỉ mở khi mutation thành công, copy khớp từng chữ.
- **Vì sao tester không thấy dialog**: nhánh 200 không chạm tới được — mọi account an toàn để test đều chưa từng login nên API trả `422 E-STF-015`, và global mutation error toast bắn ra. Đó là lý do "chỉ có toast".
- **Xử lý**: TC-049 đổi **NG → Block** (không verify được nhánh 200 với dữ liệu hiện tại), clear Bug ID + Priority. TC-066 đã OK sẵn, chỉ sửa lại ghi chú cho khỏi dẫn nhầm. **Không sửa code.**

---

## 4. Unit 1 — スタッフ一覧 (15 bug)

### 4.1 High (5)

#### `BUG-P2-01-02` · Store picker của Manager lấy từ mock data — TC-003/011

- **Hiện tượng**: options là `store-001`…`store-013`, tên kiểu `Fit365渋谷店` không tồn tại trong master thật, không có option 全店舗. Chọn bất kỳ → `400 E-VAL-001 Invalid uuid`. List render lỗi đó thành 「スタッフがまだありません」.
- **Nguyên nhân**: [current-store.context.tsx](src/contexts/current-store.context.tsx#L8) vẫn import `getCrmStoresOptions` từ `@/lib/api` (**mock**), trong khi phần còn lại của màn đã chuyển sang `@/lib/api-real`.
- **Loại**: FE
- **Cách fix**: đổi sang `adminStoreControllerListOptions` của `@/lib/api-real`, map lại `StoreItem` type.
- **Rủi ro**: ⚠️ **cao** — đây là header store switcher **dùng toàn app**. Mọi màn có scope theo store đều bị ảnh hưởng. Cần chạy smoke test rộng, không chỉ màn staff.
- **Chặn**: TC-030/076/077/078/079/081/086.

#### `BUG-P2-01-01` · Option 「200件」 tự bắn vào tường — TC-100 → ✅ **FE, đã fix 2026-09-21**

- **Hiện tượng**: `limit=200` → `400 E-VAL-001` (API cap 100). Màn hiện badge 0件 + empty state giả.
- **Nguyên nhân**: UI đúng spec — `checklists/parity.md` **PAR041** ghi rõ 「Page-size selector: 25 / 50 / 100 / **200件** options」, và [table-pagination-with-size.tsx:62](src/components/common/table-pagination-with-size.tsx#L62) implement đúng như vậy. API mới là bên không đáp ứng: cap `limit` ở 100.
- **Loại**: ~~**BE**~~ → **FE**. **Quyết định 2026-09-21 (user): FE làm theo giới hạn của BE.** Không yêu cầu BE nâng cap; bỏ luôn option 「200件」 để UI phản ánh đúng khả năng thật của API (cùng nguyên tắc đã áp dụng cho `03-01`/`03-02`).
- **Đã fix**: thêm `API_PAGE_SIZE_OPTIONS = [25, 50, 100]` ([app.constants.ts](src/constants/app.constants.ts)) và đặt làm **default của component dùng chung** [table-pagination-with-size.tsx](src/components/common/table-pagination-with-size.tsx); clamp `?limit=` từ URL về ≤100 trong [use-staffs-filters.ts](<src/app/(private)/staffs/_hooks/use-staffs-filters.ts>) để link/bookmark cũ không bắn `limit=200`. `checklists/parity.md` PAR041 đã ghi nhận đây là deviation có chủ đích.
- **Phạm vi ảnh hưởng**: đổi ở default nên áp dụng **toàn app** cho mọi màn không tự truyền `pageSizeOptions` (~26 màn). Các màn tự truyền `[25, 50, 100, 200]` (sales, refunds, transactions…) giữ nguyên. Cùng đợt này default `alwaysShowFooter` cũng đổi `false` → `true`: footer 全N件 + 表示件数 luôn hiển thị kể cả khi chỉ có 1 trang.
- **Cùng gốc**: `BUG-P2-05-04`.

#### `BUG-P2-01-04` · Role Staff bị /403 — TC-004 → **BE**

- Cùng gốc `BUG-P2-04-02` (§3.3). BE phải cho phép Staff self-read; FR-004 yêu cầu hiện 自分のみ (1 dòng).
- **Loại**: **BE** — không fix FE.
- **Chặn**: TC-080/081.

#### `BUG-P2-01-05` · Dòng 招待中 không có treatment riêng — TC-062/063

- **Hiện tượng**: 氏名 hiện tên thật thay vì chữ xám nghiêng 「未登録」; thiếu hẳn dòng 「招待: YYYY/MM/DD」.
- **Nguyên nhân**: [staffs-table-columns.tsx](<src/app/(private)/staffs/_components/staffs-table-columns.tsx#L170>) — cột `name` render `TextWithTooltip` không phân biệt `status`.
- **Loại**: FE
- **Cách fix**: trong cell `name`, khi `status === 'invited'` → render 「未登録」 (`text-muted-foreground italic`) + dòng phụ 「招待: {date}」.
- **Rủi ro**: cần xác nhận `StaffSummaryDto` có field ngày mời (`invitedAt`?). Nếu không có → phần 「招待:」 phải report BE, phần 「未登録」 vẫn fix được.

#### `BUG-P2-01-06` · Menu thao tác mù trạng thái — TC-082/083/092/120

- **Hiện tượng**: 編集/再招待/無効化/削除 giống hệt nhau trên 有効/無効/招待中. 「再招待」 hiện cả trên 有効 và 無効; 「有効化」 không bao giờ xuất hiện trên dòng 無効 (màn detail thì có). 無効化 lại record đã 無効 → 200 + toast thành công cho no-op.
- **Nguyên nhân**: [staffs-table-columns.tsx](<src/app/(private)/staffs/_components/staffs-table-columns.tsx#L105>) — comment trong code nói _"real API's staff-summary has no invited/pending field (only isActive), so we can't gate this"_. Nhưng `StaffSummaryDto` **đã có** `status` (dùng ở cột ステータス, dòng 236) → comment đã lỗi thời.
- **Loại**: FE
- **Cách fix**: gate menu theo `staff.status`:
  - `active` → 編集 / 無効化 / 削除
  - `inactive` → 編集 / **有効化** / 削除
  - `invited` → 編集 / **再招待** / 削除
  - Thêm `StaffReactivateAction` vào row menu (component đã có ở `[id]/_components/`).
- **Rủi ro**: thấp. Xoá luôn comment sai để khỏi dẫn nhầm lần sau.
- **Chặn**: TC-093/094. Đóng luôn `BUG-P2-04-14`.

### 4.2 Med (5 fix + 1 không làm)

#### `BUG-P2-01-15` · Cột メールアドレス không truncate — TC-110

- **Nguyên nhân**: [staffs-table-columns.tsx](<src/app/(private)/staffs/_components/staffs-table-columns.tsx#L179>) — `cell: <span>{row.original.email}</span>`, không `max-w`, không truncate. Email 128 ký tự kéo cell ra 1006px, đẩy 6 cột + nút ⋯ ra ngoài màn hình.
- **Loại**: FE · **Fix**: dùng `TextWithTooltip` như cột 氏名, `className="max-w-56"`.

#### `BUG-P2-01-03` · Badge đếm bám filtered count — TC-010

- **Nguyên nhân**: [staffs/page.tsx](<src/app/(private)/staffs/page.tsx#L163>) — header badge dùng `totalStaffs` (= kết quả đã lọc), trong khi `FilterResultBanner` ngay dưới dùng `baselineData` đúng.
- **Loại**: FE · **Fix**: badge dùng `baselineData?.pagination.totalItems ?? totalStaffs`. Cần bật `baselineQuery` luôn (bỏ `enabled: hasActiveFilterOrSearch`) hoặc fallback khi chưa filter.

#### `BUG-P2-01-07` · Chiều sort lần đầu bị ngược — TC-065/066/067 → **KHÔNG FIX**

- **Nguyên nhân**: [data-table-column-header.tsx:29](src/components/common/data-table/data-table-column-header.tsx#L29) — `if (isSorted === false) column.toggleSorting(false)` → `asc`. Spec muốn click đầu ra `desc`.
- **Quyết định (user, 2026-09-18): không làm.** Hành vi hiện tại **nhất quán trong toàn app** (mọi bảng đều asc-first) và tooltip 「クリックで昇順ソート」 mô tả đúng việc nó làm — người dùng không bị đánh lừa, chỉ cần click thêm 1 lần. Đổi riêng cho màn staff tạo ra sự không nhất quán tệ hơn chính vấn đề đang sửa.
- **Xử lý TC**: TC-065/066/067 đổi **NG → OK kèm ghi chú** (chấp nhận hiện trạng, để lại cho vòng thống nhất design system). Clear Bug ID + Priority.

#### `BUG-P2-01-08` · Sort không reset về trang 1 — TC-070

- **Nguyên nhân**: [use-staffs-filters.ts](<src/app/(private)/staffs/_hooks/use-staffs-filters.ts#L75>) — `setSort` chỉ `setFilters({ sort, order })`, không reset `page`.
- **Loại**: FE · **Fix**: `setFilters({ sort, order, page: 1 })`. One-liner.

#### `BUG-P2-01-09` · Filter đang active không có styling — TC-039

- **Nguyên nhân**: [staffs-filters.tsx](<src/app/(private)/staffs/_components/staffs-filters.tsx>) — các `SelectTrigger` / select input không đổi class khi có giá trị.
- **Loại**: FE · **Fix**: thêm class có điều kiện (`border-primary bg-primary/5`) khi `filters.X !== null` cho cả 4 control.

#### `BUG-P2-01-10` · Bucket 最終ログイン sai — TC-055

- **Hiện tượng**: login hôm nay → 「6分前」 (đúng phải 「今日 HH:MM」); quá 6 ngày vẫn đếm ngày 「23日前」 (đúng phải 「Nヶ月前」).
- **Nguyên nhân**: [format-relative-time.util.ts](<src/app/(private)/staffs/_utils/format-relative-time.util.ts#L9>) — dùng thẳng `formatDistanceToNow` của date-fns, không có logic bucket.
- **Loại**: FE · **Fix**: viết bucket theo spec — `hôm nay → 今日 HH:MM` · `1-6 ngày → N日前` · `≥7 ngày → Nヶ月前`. Bổ sung unit test cho util này.

#### `BUG-P2-01-11` · Không xem được timestamp chính xác — TC-056

- **Nguyên nhân**: cùng cell, `<span>` không có `title`.
- **Loại**: FE · **Fix**: `title={formatDateYYYYMMDD_HHMM(lastLoginAt)}` (hoặc `Tooltip`). Gộp fix chung với 01-10.

### 4.3 Low (2)

#### `BUG-P2-01-12` · Copy lệch — TC-013/087

- Tooltip 「権限がありません」 → phải là 「本部権限が必要です」; dialog 無効化 khác bản duyệt.
- **Loại**: FE · **Fix (chốt: dùng text bản duyệt)**:
  - Tooltip của các `RoleGatedMenuItem` gated HQ/System trong [staffs-table-columns.tsx](<src/app/(private)/staffs/_components/staffs-table-columns.tsx#L112>) → 「本部権限が必要です」 (khớp `StaffDeactivateAction`, vốn đã dùng đúng chuỗi này).
  - Dialog 無効化 mở từ row menu chạy nhánh `withReason=false` → title 「スタッフを無効化しますか？」. Đối chiếu `checklists/parity.md` **PAR063** và sửa cho khớp bản duyệt.
- **Lưu ý khi code**: lấy text từ `parity.md`, không chép từ bug report.

#### `BUG-P2-01-13` · Deep link 職位 sai tên param — TC-121

- **Nguyên nhân**: [use-staffs-filters.ts](<src/app/(private)/staffs/_hooks/use-staffs-filters.ts#L32>) khai báo key nuqs là `position_id`, spec duyệt là `position`. Ngoài ra `isFilterOpen` khởi tạo `false` nên deep link vẫn để panel đóng.
- **Loại**: FE
- **Fix**: đổi key nuqs `position_id` → `position` (nhớ sửa cả `clearFilters` / `hasActiveFilters` / `handlePositionClick`); `useState(isFilterOpen)` khởi tạo `true` khi có bất kỳ filter nào từ URL.
- **Rủi ro**: đổi key URL làm hỏng link cũ đã share — chấp nhận được vì chưa release.

### 4.4 Không fix (1)

| Bug            | Sev  | Loại   | Xử lý                                                                                                                                                                                      |
| -------------- | ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BUG-P2-01-14` | High | **BE** | `POST /admin/staff/{id}/deactivate` không body → `400 E-VAL-001 {field: deactivatedReason, code: required}`, trái ruling G9. Màn hình đúng. Trùng `BUG-P2-04-07` — **1 việc BE duy nhất**. |

---

## 5. Unit 5 — ログイン履歴・セッション (6 bug)

#### `BUG-P2-05-04` · High · Option 「200件」 — TC-023 → ✅ **FE, đã fix 2026-09-21**

- **Hiện tượng**: `400 E-VAL-001 "limit … less than or equal to 100"`, tab render 「ログイン履歴がまだありません」 trên account có 84 dòng, không message không toast.
- **Nguyên nhân**: cùng `BUG-P2-01-01` — UI theo PAR041, API cap 100.
- **Loại**: ~~**BE**~~ → **FE** (quyết định 2026-09-21, cùng 01-01).
- **Đã fix**: theo default mới của component dùng chung (`API_PAGE_SIZE_OPTIONS`). Default 10件 của tab vẫn hiện như giá trị hiện tại → dải chọn 10 / 25 / 50 / 100件, toàn bộ nằm trong clamp 1–100.

#### `BUG-P2-05-06` · High · Thiếu nút kết thúc toàn bộ session — TC-040

- **Hiện tượng**: quét trên account có 0/2/3 session và cả trong dialog: không có すべて/全て/一括/全セッション.
- **Nguyên nhân**: [active-sessions-card.tsx](<src/app/(private)/staffs/[id]/_components/active-sessions-card.tsx>) chỉ có nút 強制終了 per-row. Revised FR-005 yêu cầu; endpoint đã sẵn sàng: `POST …/sessions/revoke` **không body** → 204 (comment trong code đã ghi rõ điều này).
- **Loại**: FE
- **Cách fix**: thêm nút 「すべてのセッションを終了」 ở `CardHeader` (chỉ hiện khi `sessions.length > 0`), mở `AlertDialog` cảnh báo rõ là **mọi** thiết bị kể cả 現在のセッション, confirm → `revokeMutation.mutate({ path: { id }, body: undefined })`.
- **Rủi ro**: hành động phá hoại — dialog phải nói rõ. Cần cẩn thận không để `terminateTarget` null lọt vào nhánh per-row (code hiện có guard, giữ nguyên).

#### `BUG-P2-05-01` · Med · Footer 「全 N 件」 chỉ render khi totalPages > 1 — TC-020/025

- **Nguyên nhân**: hai tầng cùng chặn — [login-history-tab.tsx](<src/app/(private)/staffs/[id]/_components/login-history-tab.tsx#L135>) `{total > 0 && <TablePaginationWithSize/>}`, và trong chính component `if (totalPages <= 1) return null`. Tab 変更履歴 bên cạnh render footer riêng nên vẫn có 「全1件」.
- **Loại**: FE
- **Cách fix — chốt phương án A (thêm prop)**:
  1. `TablePaginationWithSize` nhận thêm prop `alwaysShowFooter?: boolean`, **mặc định `false`** → mọi màn khác giữ nguyên hành vi hiện tại (ẩn footer khi ≤1 trang, đúng shared GUI checklist).
  2. Khi `alwaysShowFooter` bật và `totalPages <= 1`: vẫn render dòng 「全 N 件」 + select 表示件数, chỉ ẩn dãy số trang.
  3. Caller [login-history-tab.tsx:135](<src/app/(private)/staffs/[id]/_components/login-history-tab.tsx#L135>): bỏ điều kiện `{total > 0 && …}` và truyền `alwaysShowFooter`.
- **Rủi ro**: không — default giữ nguyên nên không màn nào khác bị ảnh hưởng.

#### `BUG-P2-05-02` · Med · Thiếu câu 「保持期間1年間」 — TC-021

- **Nguyên nhân**: không render ở đâu cả (Y-13 FR-M009, L253).
- **Loại**: FE · **Fix**: thêm dòng note dưới bảng ログイン履歴. ✅ **Chốt: làm theo đề xuất.** Text lấy nguyên văn từ Y-13 FR-M009 L253.

#### `BUG-P2-05-03` · Med · Page size mặc định là 10, contract ghi 20 — TC-022 → **sửa contract**

- **Nguyên nhân**: [login-history-tab.tsx](<src/app/(private)/staffs/[id]/_components/login-history-tab.tsx#L44>) — `const DEFAULT_PAGE_SIZE = 10`.
- **Quyết định (user, 2026-09-18)**: **giữ nguyên code (10), sửa contract cho khớp.** Lý do: tab ログイン履歴 nằm trong một trang đã có sẵn card アクティブセッション phía trên; 20 dòng làm người dùng phải scroll dài mới thấy được pagination. 10 là con số hợp lý hơn cho tab này.
- **Loại**: SPEC/contract · **Việc cần làm**: sửa `contracts/api-contracts.md` (và `specs/031-staff-login-history/contracts/` nếu có ghi 20) → default `limit = 10`. Đổi TC-022 Expected Result, mark OK. **Không đổi code.**

#### `BUG-P2-05-05` · Med · Enum null để trống hoàn toàn — TC-011

- **Hiện tượng**: cell 認証方式 trống trơn, trong khi cùng dòng đó IP/UA null lại hiện 「—」.
- **Nguyên nhân**: [login-history-tab.tsx](<src/app/(private)/staffs/[id]/_components/login-history-tab.tsx#L60>) — `AUTH_PROVIDER_LABEL[row.original.authProvider]` trả `undefined` khi giá trị null / ngoài enum. Cột 結果 cũng có cùng rủi ro (`LOGIN_RESULT_LABEL`).
- **Loại**: FE · **Fix**: `AUTH_PROVIDER_LABEL[x] ?? '—'` cho cả hai map.

---

## 6. Unit 2 — スタッフ新規登録 (10 bug)

### 6.1 BE — không fix FE (1)

#### `BUG-P2-02-05` · High · 所属 ghi 「任意」 nhưng server bắt buộc — TC-048 → **BE**

- **Hiện tượng**: submit không chọn 所属 → `400 E-VAL-001 "Exactly one of storeId or fcCompanyId must be provided"`.
- **Xác minh (2026-09-18)**: đọc thẳng `src/lib/openapi.real.json` —
  - `InviteStaffBulkRequestDto.required = ['staff', 'role']`
  - `InviteStaffRequestDto.required = ['email', 'role', 'lastName', 'firstName']`
  - → `storeId` / `fcCompanyId` **không** nằm trong `required` ở bất kỳ DTO nào.
- **Kết luận**: **API tự mâu thuẫn với chính OpenAPI của nó.** Runtime validate XOR bắt buộc trong khi contract khai báo optional. Không phải xung đột spec ↔ API như nghĩ ban đầu — cả Y-01 L178, prototype **và** contract đều thống nhất là 任意.
- **Loại**: **BE** — bỏ ràng buộc "exactly one must be provided", hoặc nếu thật sự cần thì phải khai `required` trong OpenAPI.
- **FE**: giữ nguyên. Code hiện tại ([staff-create.schema.ts](<src/app/(private)/staffs/create/_schemas/staff-create.schema.ts#L88>), [create/\_components/affiliation-section.tsx](<src/app/(private)/staffs/create/_components/affiliation-section.tsx#L55>)) đã đúng contract. **Không revert.**

### 6.2 High (2)

#### `BUG-P2-02-03` · Không có kiểm tra trùng email trước khi submit — TC-036/037

- **Nguyên nhân**: `GET /admin/staff/email-availability` không bao giờ được gọi — không có caller nào trong `create/`. FE chỉ check trùng **trong batch** (`getRowDuplicateStatus` ở [staff-create.util.ts](<src/app/(private)/staffs/create/_utils/staff-create.util.ts#L7>)).
- **Loại**: FE
- **Cách fix**: gọi `email-availability` on-blur từng dòng (debounce), set lỗi field 「このメールアドレスは既に登録されています」. Trạng thái `DuplicateStatus` mở rộng từ `'batch' | null` → `'batch' | 'existing' | null`.
- **Rủi ro**: N request cho N dòng — cần debounce + chỉ gọi khi email hợp lệ format.

#### `BUG-P2-02-06` · Dropdown FC企業 không lọc — TC-050

- **Hiện tượng**: `GET /admin/fc-companies?limit=20&sort=legalName&order=asc&page=1` — offer cả 「フィットネス関西」 (`managementType: direct_management` = trực doanh), chọn xong submit 400.
- **Nguyên nhân**: [FcCompanySelectInput](src/components/common/data-select-input/fc-company-select-input.tsx#L96) **có sẵn** prop `queryFilters: { managementType, isActive }`, nhưng caller ở [create/\_components/affiliation-section.tsx](<src/app/(private)/staffs/create/_components/affiliation-section.tsx#L96>) không truyền gì cả.
- **Loại**: FE
- **Vướng**: `managementType` chỉ nhận 1 giá trị (`'direct_management' | 'franchise' | 'entrustment'`), mà FC hợp lệ gồm **cả `franchise` lẫn `entrustment`** — không lọc được bằng 1 query.
- **Quyết định (user, 2026-09-18): báo BE.** Nội dung yêu cầu cụ thể ở §8.2 #10.
- **FE làm gì trong lúc chờ**: lọc client-side sau khi fetch — bỏ mọi row `managementType === 'direct_management'` trước khi đưa vào `SearchableSelect`. Nhược điểm chấp nhận: `pagination.totalItems` từ server không khớp số row hiển thị, và một trang có thể rỗng sau khi lọc (infinite scroll vẫn kéo trang kế nên không kẹt). Đặt `TODO(BE)` ngay tại chỗ lọc để gỡ khi API hỗ trợ.
- **Cùng gốc**: `BUG-P2-03-08` (màn edit — [edit/\_components/affiliation-section.tsx](<src/app/(private)/staffs/[id]/edit/_components/affiliation-section.tsx>)).

### 6.3 Med (3)

#### `BUG-P2-02-04` · Vứt bỏ chi tiết lỗi từng dòng — TC-040

- **Nguyên nhân**: [create/page.tsx](<src/app/(private)/staffs/create/page.tsx#L96>) — `catch {}` rỗng, lỗi 409 chỉ đi qua global mutation toast. `details.processed[]` chỉ ra đúng dòng lỗi nhưng bị bỏ.
- **BE có hỗ trợ không?** — **Có**, đã xác minh trong `openapi.real.json`: `details.processed[]` được mô tả cho **409** (E-STF-002), **422** (E-DMN-006) và **502** (E-STF-005). ⚠️ Nhưng `ErrorResponseDto` chỉ khai 4 field `code/message/userMessage/traceId` — **không có `details` trong schema**, tức là type generated không biết tới nó.
- **Loại**: FE
- **Cách fix**:
  1. Parse defensively: đọc `details.processed[]` từ error body qua một type guard nhỏ (không dựa vào type generated).
  2. Có `processed[]` → `form.setError('rows.{i}.email', …)` cho từng dòng lỗi + `scrollToFirstError()`.
  3. Không parse được → **fallback toast** như hiện tại, không crash.
  4. Áp dụng cho cả 3 status 409/422/502, không chỉ 409.
- **Kèm theo**: report BE bổ sung `details` vào `ErrorResponseDto` trong OpenAPI để FE có type thật.

#### `BUG-P2-02-01` · Placeholder 職位 sai khi disabled — TC-025

- **Nguyên nhân**: [create/\_components/permission-section.tsx](<src/app/(private)/staffs/create/_components/permission-section.tsx#L84>) truyền `allLabel="未割当"`. Trong `PositionSelectInput`, `value=null` → Select nhận sentinel `__all_positions__` → khớp row `allLabel` → render 「未割当」, placeholder không bao giờ hiện.
- **Loại**: FE · **Fix**: khi `disabled` (chưa chọn ロール) thì truyền `allLabel={null}` để `value` là `null` thật và placeholder hiển thị.

#### `BUG-P2-02-10` · Race tạo trùng trả 500 — TC-083 → **BE**

- Hai request đồng thời cùng email: cái thua nhận `500 E-SYS-001` thay vì `409 E-STF-002`.
- **Loại**: **BE** — không fix FE. Ghi vào bug list BE (§8).

### 6.4 Low (4)

#### `BUG-P2-02-02` · Combobox 職位 thiếu ô tìm kiếm — TC-028

- **Nguyên nhân**: `PositionSelectInput` **cố ý** là plain `Select` (docstring: _"endpoint returns every match unpaginated, so this is a plain Select — no search box"_). Spec lại yêu cầu 「職位を検索...」 + trạng thái 「該当なし」.
- **Loại**: FE · **Quyết định (user)**: **làm theo spec** — chuyển sang `SearchableSelect` (component đã có, dùng bởi store/FC picker), filter client-side vì endpoint trả unpaginated. Áp dụng cho **mọi nơi** dùng `PositionSelectInput` (create, edit, filter màn list) để đồng nhất.
- **Rủi ro**: component dùng chung → sau khi đổi phải smoke test cả 3 chỗ; xoá docstring cũ để khỏi dẫn nhầm.

#### `BUG-P2-02-07` · 「（任意）」 lặp 2 lần — TC-052

- **Nguyên nhân**: [create/\_components/note-section.tsx](<src/app/(private)/staffs/create/_components/note-section.tsx#L18>) — `<FormField optional>` đã render 「（任意）」, placeholder lại ghi 「備考を入力してください（任意）」.
- **Loại**: FE · **Fix**: bỏ 「（任意）」 khỏi placeholder.

#### `BUG-P2-02-08` · Paste 55 email không bị cap — TC-060

- **Hiện tượng**: tạo đủ 55 dòng, badge 「55名入力中」, dù note ngay đó ghi 「一度に登録できるのは50名までです。」. Submit bị chặn với message sai 「未入力の必須項目があります」.
- **Nguyên nhân**: hai chỗ:
  1. [staff-rows-section.tsx](<src/app/(private)/staffs/create/_components/staff-rows-section.tsx#L52>) — `handleEmailPaste` gọi `replace(buildPastedRows(...))` không cap; `atRowLimit` chỉ gate nút 追加.
  2. [staff-create.util.ts](<src/app/(private)/staffs/create/_utils/staff-create.util.ts#L74>) — `getSubmitErrorMessage` không biết tới lỗi vượt 50, rơi vào nhánh `hasFieldErrors` chung.
- **Loại**: FE
- **Fix**: cắt `emailLines` tại `STAFF_BULK_INVITE_MAX_ROWS` trong `buildPastedRows` + toast cảnh báo số dòng bị bỏ; thêm nhánh riêng vào `getSubmitErrorMessage` cho message 「一度に登録できるのは50名までです」.

#### `BUG-P2-02-09` · Xoá dòng không set dirty flag — TC-070

- **Hiện tượng**: xoá 1 dòng rồi キャンセル → không hiện dialog xác nhận huỷ.
- **Nguyên nhân**: **cần xác minh** — `useFieldArray.remove()` bình thường _có_ set dirty. Nghi ngờ tương tác với `useUnsavedChanges(form.formState.isDirty)` đọc snapshot cũ, hoặc RHF so sánh về đúng `defaultValues` khi xoá dòng rỗng cuối.
- **Loại**: FE (giả định) · **Fix**: xác minh bằng log `formState.isDirty` trước; nếu đúng → track thêm `fields.length !== 1` như dirty signal.

---

## 7. Checklist trước khi đóng mỗi unit

- [ ] `npm run lint` — 0 error
- [ ] `npx tsc --noEmit` — 0 error ngoài `.next/` (xem memory: _tsc gate noise_)
- [ ] Retest đúng các TC được liệt kê trong từng bug
- [ ] Cập nhật NG→OK trong TC doc + **clear Bug ID / Priority** (script `fill-results.js` không tự clear)
- [ ] Cập nhật bảng summary cuối TC doc (script hay làm hỏng bảng này — kiểm lại bằng mắt)
- [ ] Với component dùng chung (`TablePaginationWithSize`, `DataTableColumnHeader`, `current-store.context`, `PositionSelectInput`): smoke test ít nhất 2 màn khác

---

## 8. Việc gửi BE (gom 1 lần)

### 8.1 Bug BE — phải sửa (8)

| #   | Endpoint                            | Vấn đề                                                                                                                                                                                                                                  | Bug              |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | `POST /admin/staff/{id}/deactivate` | `deactivatedReason` vẫn `required`, trái ruling G9 (2026-09-18) — bỏ `required` ở `DeactivateStaffRequestDto`                                                                                                                           | `01-14`, `04-07` |
| 2   | `POST /admin/staff/invite-bulk`     | Race cùng email → `500 E-SYS-001`, phải là `409 E-STF-002`                                                                                                                                                                              | `02-10`          |
| 3   | `POST /admin/staff/invite-bulk`     | Runtime validate `"Exactly one of storeId or fcCompanyId must be provided"` **mâu thuẫn với chính OpenAPI** — `InviteStaffBulkRequestDto.required = ['staff','role']`, không có 2 field đó. Bỏ ràng buộc, hoặc khai `required` cho đúng | `02-05`          |
| 4   | `GET /admin/staff/{id}`             | Manager bị `404 E-STF-001` với **mọi** target, kể cả record của chính mình → chặn G8                                                                                                                                                    | `04-01`          |
| 5   | `GET /admin/staff/{id}`             | Staff bị 403 khi đọc record của chính mình, trái 権限マトリクス 「○ 自分のみ」                                                                                                                                                          | `04-02`, `01-04` |
| 6   | `GET /admin/positions`              | Không trả row 職位「未割当」 → FE không có cách clear 職位 / đổi ロール (gap G5)                                                                                                                                                        | `03-01`, `03-02` |
| 7   | `POST /admin/staff/{id}/deactivate` | Không idempotent-guard: deactivate record đã 無効 → 200 + ghi history. Nên trả 409                                                                                                                                                      | `04-14`          |

### 8.2 Cải thiện contract — không chặn (3)

| #   | Endpoint                  | Đề nghị                                                                                                                                                                                                                                                                                                                                | Bug              |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 9   | `ErrorResponseDto`        | Bổ sung field `details` vào schema. Mô tả response 409/422/502 của `invite-bulk` đã nhắc `details.processed[]` nhưng schema không khai → FE phải parse mù                                                                                                                                                                              | `02-04`          |
| 10  | `GET /admin/fc-companies` | Cho lọc nhiều `managementType` trong 1 query — chi tiết ở §8.4                                                                                                                                                                                                                                                                         | `02-06`, `03-08` |
| 11  | `GET /admin/staff/{id}`   | `StaffDetailDto.managedStoreCount` đếm số row `staff_stores` nên **luôn = 0** với staff pattern B (FC企業). Xác nhận: field này có nên tính cả số store thuộc FC company không? FE đã workaround bằng `GET /admin/stores?fcCompanyId=` → dùng `pagination.totalItems`, nhưng dòng 「管理店舗数」 sẵn có vẫn không render cho pattern B | `04-04`          |

### 8.2b Phát sinh khi fix `01-02` — gửi BE (2)

| #   | Endpoint                   | Vấn đề                                                                                                                                                                                                                                                                      | Ảnh hưởng                                                                                                                                                                                         |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | `GET /api/v1/admin/stores` | **Unscoped** (docstring generated ghi rõ _"reads currently unscoped — STUBS.md"_). Mock endpoint cũ được scope server-side bằng `getAllowedStoreIds()`. Sau khi chuyển sang real API, Manager/Staff/Trainer/Observer sẽ thấy **toàn bộ store master** trong header switcher | FE đang phải narrow client-side (xem cảnh báo dưới). Khi BE scope lại, đoạn narrow thành no-op                                                                                                    |
| 13  | `GET /crm/me`              | Không trả `managedStoreIds` cho Manager                                                                                                                                                                                                                                     | Manager bị thu về đúng 1 home store → switcher render non-interactive. **TC-003 / TC-030 yêu cầu tập managed store _chọn được_ → không pass được** cho tới khi có field này (hoặc endpoint riêng) |

> ⚠️ **Cần review**: để giữ nguyên hành vi cũ, agent đã thêm **narrowing phía client** trong `current-store.context.tsx` — lọc danh sách store theo `managedStoreIds` (nếu có) hoặc `storeId` từ `/crm/me`. Đây là FE bù cho lỗ hổng scope của BE, **không phải** một security boundary. Nếu không có nó thì: (a) Staff/Trainer/Observer được switcher tương tác trên toàn bộ store thay vì 1 store của mình, (b) fallback `restrictedStores[0]` sẽ ghim user vào store đầu bảng chữ cái thay vì store của họ.

### 8.3 FE sửa contract (1)

| #   | Việc                                                                                                                                                                                                    | Bug     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 12  | Sửa default `limit` của login-histories trong `contracts/api-contracts.md`: 20 → **10**, khớp implementation. Lý do: tab nằm dưới card アクティブセッション, 20 dòng phải scroll dài mới tới pagination | `05-03` |

### 8.4 Chi tiết yêu cầu #10 — lọc FC企業 theo loại quản lý

**Bối cảnh**: màn スタッフ新規登録 và スタッフ編集 có dropdown 所属FC企業. Chỉ được phép chọn công ty FC thật; công ty trực doanh (`direct_management`) không hợp lệ — chọn xong submit thì API trả 400.

**Hiện tại**: `GET /api/v1/admin/fc-companies` có query param `managementType`, nhưng chỉ nhận **một** giá trị:

```
managementType?: 'direct_management' | 'franchise' | 'entrustment'
```

FC hợp lệ gồm **cả `franchise` lẫn `entrustment`** → không có cách nào lấy đúng tập đó bằng 1 request. Gọi 2 request rồi merge thì vỡ phân trang (dropdown dùng infinite scroll).

**Yêu cầu** — chọn 1 trong 2, ưu tiên (A):

**(A) Cho `managementType` nhận nhiều giá trị**

```
GET /api/v1/admin/fc-companies?managementType=franchise&managementType=entrustment
```

- Semantics: `OR` giữa các giá trị.
- Truyền 1 giá trị vẫn hoạt động như cũ (backward compatible).
- Cập nhật OpenAPI: `schema: { type: array, items: { enum: [...] } }`, `style: form`, `explode: true`.
- `pagination.totalItems` phải là tổng **sau khi** lọc.

**(B) Thêm param boolean chuyên dụng**

```
GET /api/v1/admin/fc-companies?isFranchise=true
```

- Trả về các công ty có `managementType` ∈ {`franchise`, `entrustment`}.
- Đơn giản hơn nhưng kém linh hoạt; chỉ chọn nếu (A) tốn công.

**Trong lúc chờ**: FE lọc client-side (bỏ row `direct_management` sau khi fetch). Hệ quả: số đếm từ server không khớp số row hiển thị, một trang có thể rỗng sau khi lọc. Đây là workaround tạm, sẽ gỡ khi API hỗ trợ.

---

## 8.7 Đính chính sau khi verify live (2026-09-18)

Ba kết luận trước đó **sai**, phát hiện khi chạy trên app thật.

#### ❌ `04-01` KHÔNG phải bug BE — là lỗi chọn account test

- Session Manager dùng lúc đầu là `lodu4289+manager@gmail.com` từ `demo-users.ts` — account này ở 職位 **未割当, 0/58 flags**, nên bị FE route-guard chặn trước khi có request nào.
- Đăng nhập bằng account seeded **`lodu4289+test_manager@gmail.com`** (Block Manager): `/staffs` render 37-38 dòng đã scope đúng, `GET /admin/staff/{id}` trả **200** cho staff trong phạm vi **và cho chính record của Manager**. Chỉ id ngoài phạm vi mới 404 — đúng như thiết kế.
- → `04-01` đóng. TC-003/008/013/051 đều OK. **G8 giải được một nửa** (xem dưới).
- ⚠️ Kéo theo: TC-014 / TC-017 / TC-031 / TC-064 vẫn đang ghi `Block — Manager không vào được detail`. Tiền đề đó **không còn đúng**, cần chạy lại.

#### ❌ `04-02` / `01-04` KHÔNG phải bug BE — là FE route guard

- Đăng nhập bằng account seeded **`lodu4289+test_staff@gmail.com`** (職位 Store Manager, có flags thật): vẫn `/403`, và **không một request nào** tới `GET /admin/staff`.
- Hai agent độc lập cùng quan sát điều này. Không phải BE từ chối — FE chặn trước.
- Nguyên nhân đúng như phân tích ban đầu: `PERMISSION_FLAG_RULES[StaffsView] = ['canViewStaff']`. Đây chính là **Q2** đã hỏi trước đây.
- → Cần quyết lại: (A) cấp flag `canViewStaff` cho 職位 đó, hay (B) FE miễn flag cho self-view.

#### ⚠️ `BUG-P2-04-15` không phải bug mới — chính là gap **G8** đã ghi sẵn

- Agent báo: Manager tự phát magic link cho chính mình → nút enabled, `POST /staff/magic-link` trả **200**, trong khi header contract của TC doc nói HQ/System only.
- Nhưng: `spec.md` **FR-020** ghi rõ 「a staff member MUST also be able to issue this link for their own account **regardless of role**」, và chính TC doc dòng 90 đã liệt kê **G8** = _"Y-13 FR-S001 発行経路2: the button is HQ/System only"_ vs _"Allows every role to self-issue from this screen"_.
- → Mâu thuẫn **Y-13 vs Y-01 FR-020**, không phải lỗi code. FE đang làm đúng FR-020. Cần product chốt spec nào thắng.

---

## 8.6 Bug MỚI phát hiện khi verify live (2026-09-18) — chờ user duyệt

Không nằm trong 55 bug ban đầu. Tất cả đều Low, không làm hỏng expected result của case chúng xuất hiện, nên đã ghi là observation chứ không phải NG.

#### `BUG-P2-01-16` · Med · 有効化 từ row menu điều hướng khỏi danh sách — ✅ ĐÃ FIX

- **Hiện tượng**: bấm 有効化 trong row menu → confirm (hoặc cả キャンセル) → nhảy sang `/staffs/{id}` thay vì ở lại list. Repro 3/3 khi confirm, 1/1 khi cancel. Row không cập nhật tại chỗ; TC-094 không chạy được từ list.
- **Nguyên nhân**: regression từ chính fix `01-06`. `StaffReactivateAction` được mount trong row của bảng; click vào nút trong dialog bubble lên `onRowClick` của row → navigate. `StaffDeactivateAction` đã có `onClick={e => e.stopPropagation()}` trên `AlertDialogContent`, `StaffReactivateAction` thì chưa.
- **Loại**: FE · **Đã fix**: thêm `stopPropagation` tương tự. Cần retest TC-093/094.

#### `BUG-P2-01-17` · Med · Tên store ở header không sống sót qua reload

- **Hiện tượng**: chọn store ở header → reload → header về 「店舗を選択」 dù list vẫn scope đúng. Quan sát 1 lần trên HQ.
- **Nguyên nhân**: store đã chọn lưu trong cookie `CURRENT_STORE`; lúc reload app resolve tên bằng `GET /admin/stores?…&keyword=<uuid>` — tức search keyword bằng một UUID, nên không trả về gì.
- **Loại**: FE — phát sinh từ fix `01-02`. **Chưa fix**, chờ duyệt. Hướng: resolve bằng detail endpoint (`useStoreLabel` đã làm đúng cách này) thay vì keyword search.

#### `BUG-P2-02-11` · Low · Lỗi domain bị báo thành lỗi trùng email

- **Hiện tượng**: nhập `someone@zzz-unregistered.example` → `GET /admin/staff/email-availability` trả `{available:false, reason:"domain_not_registered"}`, UI hiện 「このメールアドレスはすでに登録されています」. Vấn đề domain bị nói thành vấn đề trùng địa chỉ.
- **Nguyên nhân**: 2 phía.
  - **BE**: `reason` trả giá trị `"domain_not_registered"` mà contract trong TC doc chỉ khai `"duplicate" | null` — giá trị không được document.
  - **FE**: map **mọi** `available:false` sang một câu duy nhất.
- **Cách fix**: FE branch theo `reason` (`duplicate` → câu hiện tại; `domain_not_registered` → 「このメールドメインはCRMのアクセス許可対象ではありません」, dùng lại câu đã có sẵn cho `E-DMN-006`; giá trị lạ → câu chung). Kèm yêu cầu BE khai `reason` vào OpenAPI.

#### `BUG-P2-02-12` · Low · Footer báo sai bản chất lỗi sau khi server từ chối

- **Hiện tượng**: sau 409/422 per-row, footer hiện 「未入力の必須項目があります」 dù mọi field đều đã điền.
- **Nguyên nhân**: `getSubmitErrorMessage` rơi vào nhánh `hasFieldErrors` chung — đúng cùng nhánh mà `02-08` vừa phải thêm case riêng cho lỗi vượt 50 dòng.
- **Cách fix**: thêm nhánh cho trường hợp lỗi đến từ server (đã có `setError` trên row) → message nói đúng bản chất, ví dụ 「入力内容に誤りがある行があります」.

#### `BUG-P2-02-13` · Low · Message trùng email hiện 2 lần

- **Hiện tượng**: khi bị 409, dòng lỗi hiện 「このメールアドレスはすでに登録されています」 **hai lần** — một từ cảnh báo advisory lúc blur, một từ field error lúc submit — xếp chồng 2 dòng.
- **Nguyên nhân**: hai đường báo lỗi độc lập cùng render trên một row, không dedupe.
- **Cách fix**: khi đã có `form.setError` cho row đó thì ẩn dòng advisory (hoặc ngược lại) — chỉ hiện 1 nguồn.

---

## 8.5 Phát sinh khi verify — mâu thuẫn spec cần product quyết (1)

**TC-039 vs TC-040 (Unit 5) loại trừ lẫn nhau.**

- `TC-040` yêu cầu nút 「すべてのセッションを終了」 **chỉ hiện khi có ít nhất 1 session** → đã implement đúng, TC-040 nay OK.
- `TC-039` lại yêu cầu kiểm tra tính idempotent của FR-006 bằng cách **bấm revoke khi có 0 session** → nhưng theo TC-040 thì lúc đó nút không tồn tại.

Không phải bug code. Hai yêu cầu không thể cùng đúng. Cần product chọn:

| Hướng | Hệ quả                                                                             |
| ----- | ---------------------------------------------------------------------------------- |
| A     | Giữ nguyên (ẩn nút khi 0 session). `TC-039` viết lại thành case API-level, hoặc bỏ |
| B     | Luôn hiện nút, disable khi 0 session. `TC-040` phải sửa lại expected result        |

Hiện `TC-039` để **Block** kèm lý do này.

---

## 9. Quyết định — ĐÃ CHỐT TOÀN BỘ (2026-09-18)

Không còn câu hỏi treo. Mọi bug đều có hướng xử lý xác định.

| Bug                       | Quyết định                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `03-01`                   | ⏸️ **HOÃN 2026-09-18** — user đang tìm hiểu. Hướng đã chốt: **khoá control ロール** ở màn edit — không cho đổi/clear. Xoá `RoleChangeConfirmDialog` + dead code kéo theo (§2.1) |
| `03-02`                   | ⏸️ **HOÃN 2026-09-18** — cùng đợt với `03-01`. Hướng đã chốt: **bỏ row 「未割当」** khỏi dropdown 職位 ở màn edit; giữ nguyên ở màn create (§2.1)                               |
| `03-03`                   | Đã fix ở Unit 3; nguyên nhân xác minh xong (§2.2)                                                                                                                               |
| `04-01`, `04-02`, `01-04` | → bug **BE** (scope check), không fix FE                                                                                                                                        |
| `04-04`                   | Thêm query `GET /admin/stores?fcCompanyId=` + render badge list ở màn detail                                                                                                    |
| `04-13`                   | → **không làm**, bỏ sticky hẳn. TC-071 đổi NG → OK                                                                                                                              |
| `04-07`, `01-14`          | → bug **BE**, 1 việc duy nhất: bỏ `required` trên `deactivatedReason`                                                                                                           |
| `04-08`                   | → **không phải bug**, TC-049 đổi NG → Block, không sửa code (§3.4)                                                                                                              |
| `01-01`, `05-04`          | → **đảo quyết định 2026-09-21**: không nâng cap BE nữa, **FE theo cap 100** — bỏ option 200件 (`API_PAGE_SIZE_OPTIONS`), clamp `?limit=` ≤100. TC-100 / TC-023 đổi Block → OK   |
| `01-07`                   | → **không làm**, chấp nhận hiện trạng; TC-065/066/067 đổi NG → OK kèm ghi chú                                                                                                   |
| `01-12`                   | Dùng text bản duyệt: tooltip 「本部権限が必要です」; dialog 無効化 đối chiếu PAR063                                                                                             |
| `02-02`                   | **Làm theo spec** — chuyển `PositionSelectInput` sang `SearchableSelect` ở cả 3 nơi dùng                                                                                        |
| `02-04`                   | BE có hỗ trợ `details.processed[]` (409/422/502) → map vào từng dòng; parse defensive, fallback toast                                                                           |
| `02-05`                   | → bug **BE** (runtime validate mâu thuẫn OpenAPI); FE giữ nguyên optional, **không revert**                                                                                     |
| `02-06`, `03-08`          | **Báo BE** (§8.4); FE lọc client-side tạm, đặt `TODO(BE)`                                                                                                                       |
| `02-10`                   | → bug **BE**                                                                                                                                                                    |
| `05-01`                   | **Phương án A** — thêm prop `alwaysShowFooter`, default `false`                                                                                                                 |
| `05-02`                   | Thêm dòng 「ログ保持期間: 1年間」 theo Y-13 L253                                                                                                                                |
| `05-03`                   | Giữ code (`limit` mặc định 10), **sửa contract** thành 10                                                                                                                       |
| `04-05`                   | Ngoài scope — màn `/positions` vẫn mock API                                                                                                                                     |

### Điểm cần xác nhận khi bắt đầu Unit 3

Sau khi khoá ロール ở màn edit, **ロール chỉ còn đặt được lúc tạo staff**. Nếu nghiệp vụ cần đổi ロール của một staff đang tồn tại thì hiện **không có đường nào** — cần API mới hoặc màn riêng. Xác nhận đây là hành vi chấp nhận được trước khi code.

---

# 10. TỔNG HỢP CÒN LẠI — cập nhật sau vòng fix + verify thứ 3 (2026-09-18)

> Viết lại sau vòng 3: fix nốt 8 bug còn lại rồi verify live bằng 4 agent song song trên
> `api.dev.fitness-v2.okamoto-hd.com`. Áp 3 chỉ đạo của user ngày 2026-09-18:
> ① fix hết bug còn lại · ② bug nào chưa retest thì retest cho đóng · ③ **bug BE chỉ ghi
> chú, không tính là NG của FE** (ngoài scope).

## 10.1 Tình trạng 5 TC doc

| Doc                | OK      | NG    | Block  | Tổng    |
| ------------------ | ------- | ----- | ------ | ------- |
| P2-01 一覧         | 115     | 0     | 11     | 126     |
| P2-02 新規登録     | 76      | 0     | 7      | 83      |
| P2-03 編集         | 61      | 0     | 13     | 74      |
| P2-04 詳細         | 67      | 0     | 11     | 78      |
| P2-05 ログイン履歴 | 48      | 0     | 6      | 54      |
| **Tổng**           | **367** | **0** | **48** | **410** |

> Cập nhật 2026-09-21: TC-100 (P2-01) và TC-023 (P2-05) đổi Block → OK sau khi bỏ option 「200件」.
> Số liệu tính lại **trực tiếp từ các dòng case** bằng `resummarize.py`, không chép tay.
> Sửa lại 1 sai số của bản §10 trước: P2-05 có **54** case (TC-001…TC-054) chứ không phải
> 59 — con số cũ đếm nhầm cả dòng ở bảng bug cuối doc. Tổng thật là 410, không phải 415.

## 10.2 Đã fix trong vòng này (10 bug)

| ID             | Sev  | Nội dung                                                                   | Verify                                                                                            |
| -------------- | ---- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `BUG-P2-03-01` | High | Đổi ロール báo thành công nhưng không gửi gì; sau đó lại xoá mất 職位 thật | ✅ FE xong (TC-021 (a)+(c)); phần còn lại là **BE chặn** — xem 10.4                               |
| `BUG-P2-03-02` | High | Không clear được 職位 về 未割当                                            | ✅ TC-031: PATCH `{"positionId":""}` → 200, record thật sự về 未割当                              |
| `BUG-P2-03-04` | High | Combobox 職位 hiện UUID thô cho account 未割当                             | ✅ TC-030: hiện 「未割当」                                                                        |
| `BUG-P2-01-16` | Med  | 有効化 từ row menu nhảy sang `/staffs/{id}`                                | ✅ TC-093/094, lặp 2/2, キャンセル cũng không điều hướng                                          |
| `BUG-P2-01-17` | Med  | Tên store ở header mất sau reload                                          | ✅ Giữ label qua hard reload và qua điều hướng; search theo tên/mã vẫn chạy                       |
| `BUG-P2-02-11` | Low  | `reason:"domain_not_registered"` bị báo thành lỗi trùng email              | ✅ TC-037: 3 trạng thái phân biệt được trong cùng 1 form                                          |
| `BUG-P2-02-12` | Low  | Footer báo 「未入力の必須項目があります」 dù đã điền đủ                    | ✅ TC-040: đổi thành 「登録できないメールアドレスがあります」, nhánh thiếu field không bị regress |
| `BUG-P2-01-01` | High | Option 「200件」 → `400 E-VAL-001` (API cap `limit` 100)                   | ✅ Bỏ option 200件 + clamp `?limit=` ≤100 (2026-09-21). Ghi nhận từ code fix, chưa rerun live     |
| `BUG-P2-05-04` | High | Cùng gốc 01-01, ở tab ログイン履歴                                         | ✅ `pageSizeOptions={API_PAGE_SIZE_OPTIONS}` (2026-09-21). Ghi nhận từ code fix, chưa rerun live  |
| `BUG-P2-02-13` | Low  | Message trùng email hiện 2 lần                                             | ✅ TC-036: đếm `<p>` chứa 登録されています = 1 (trước là 2)                                       |

### Bug mới phát hiện ngay trong vòng verify — đã fix

| ID             | Sev | Nội dung                                                                                                                                                                                                         | Verify                                                                                                       |
| -------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `BUG-P2-04-16` | Low | Tooltip khi nút 編集 bị khoá **luôn** hiện 「担当店舗のスタッフのみ編集できます」. Rẽ nhánh theo `isManagerEditAllowed` — cờ đó chỉ `true` khi nút **đang bật**, nên nhánh 「管理者権限が必要です」 là dead code | ✅ TC-014 (P2-04) → OK sau fix; 3 account non-スタッフ in-scope đều hiện đúng lý do, nhánh bật không regress |

## 10.3 Còn NG: **0**

Cả 5 doc đã sạch NG.

- `TC-052` (P2-04) — **đóng 2026-09-18 theo quyết định của user**: Y-13 và Y-01 mô tả **hai
  việc khác nhau** (Y-13 = user tự xin magic link cho mình; Y-01 = staff xin hộ user), nên
  hai tài liệu chưa bao giờ mâu thuẫn. `BUG-P2-04-15` **rút lại**, gap **G8 đóng**, và
  Expected Result của TC-052 đã **viết lại** (bản cũ đòi nút phải disabled). Không sửa code.
  Đã cập nhật cả 4 chỗ trong doc: khối 「⚠️ Read first」, bảng gap G8, dòng TC-052, và mục
  Open question #1.
- `TC-021` và `TC-014`/`TC-034` (P2-03) chuyển `Block` theo luật ③ — FE đã làm đúng phần của
  mình, phần còn lại là BE, bằng chứng request/response ghi nguyên văn trong doc.

## 10.4 BUG-P2-03-01 — diễn biến và cách xử lý cuối

Đây là bug phức tạp nhất vòng này, ghi lại đủ để khỏi lặp lại.

1. **Ràng buộc gốc**: `UpdateStaffRequestDto` **không có** field `role`; ロール của staff
   **derive từ 職位**. Muốn đổi ロール thì bắt buộc phải gán một 職位 thuộc ロール mới.
2. **Fix theo chỉ đạo** ("implement theo code hiện tại, bảo đảm hiện thị label thay vì
   value"): giữ nguyên control ロール, chỉ thêm `unlistedValueLabel` để combobox 職位 lấy
   `positionName` của chính record khi id không có trong master (row 未割当 bị
   `GET /admin/positions` loại vì `isSystemManaged`). → `BUG-P2-03-04` đóng.
3. **Hệ quả ngoài dự kiến** (agent A phát hiện): fix `03-02` gửi `positionId: ""` cho mọi
   lần clear. Mà select ロール **luôn** reset 職位 về rỗng (để position của ロール cũ không
   sót lại — TC-033). Nên đổi ロール → gửi `{"positionId":""}` → BE map về 未割当 của ロール
   **hiện tại** → **ロール không đổi, mà 職位 thật thì bị xoá sạch**, tất cả núp sau toast
   「スタッフ情報を更新しました」. Đây là **mất dữ liệu im lặng**, nặng hơn bug gốc.
4. **Sửa lại**: `''` chỉ được gửi khi ロール **không bị đụng tới**. Reset do đổi ロール
   không còn được coi là "user muốn clear". Thêm nữa, đổi ロール mà để trống 職位 thì
   **chặn submit** kèm lỗi trên field 職位:
   「ロールを変更するには、新しいロールの職位を選択してください」 — thay vì bắn PATCH rỗng
   rồi báo thành công. Khi đang đổi ロール thì row 「未割当」 cũng bị rút khỏi dropdown và
   trigger hiện placeholder, vì lúc đó rỗng **không** còn nghĩa là 未割当.
5. **Verify vòng 4** — FE đã đúng hết phần của nó:
   - (a) đổi ロール, để trống 職位 → **0 request**, lỗi inline, record giữ nguyên 職位 cũ
     (`updatedAt` không đổi). Mất dữ liệu đã hết.
   - (c) ロール không đụng, chọn 未割当 → vẫn `{"positionId":""}` → 200. Không regress.
   - (b) đổi ロール **và** chọn 職位 của ロール mới → FE gửi đúng
     `{"positionId":"…000040"}` → **BE trả `400 E-VAL-001`**.

### ⛔ Blocker cuối cùng nằm ở BE

`PATCH /admin/staff/{id}` **từ chối positionId thuộc ロール khác** với ロール hiện tại của
account. Cùng endpoint / cùng account / cùng session:

| Body                                                                 | Kết quả         |
| -------------------------------------------------------------------- | --------------- |
| `{"positionId":"…000103"}` (Full-time Staff — **cùng** ロール staff) | `200`           |
| `{"positionId":""}` (clear)                                          | `200`           |
| `{"positionId":"…000040"}` (Employee Trainer — ロール **trainer**)   | `400 E-VAL-001` |
| `{"positionId":"…000108"}` (External Trainer — ロール **trainer**)   | `400 E-VAL-001` |

Mà ロール **derive từ 職位** và `UpdateStaffRequestDto` **không có** field `role`. Nghĩa là
validation này khiến **đổi ロール là bất khả thi qua API bằng mọi đường FE có thể đi** —
nó chặn đúng cái cơ chế mà thiết kế đã thống nhất dùng để đổi ロール.

> ⚠️ **Cần BE quyết một trong hai**: ① cho phép positionId khác ロール trên PATCH rồi derive
> ロール mới từ nó, hoặc ② thêm hẳn field `role` vào `UpdateStaffRequestDto`.
> Trước khi BE chốt, **màn edit không có cách nào đổi ロール** — đây là điều cần xác nhận
> với nghiệp vụ, vì ロール hiện chỉ đặt được lúc tạo staff.

## 10.5 Quyết định cần chốt (3 — đã đóng 3)

| #      | Vấn đề                                                                                                                                                                                                                                                                                                                | Đề xuất                                                                                                                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **D1** | **Staff không xem được record của chính mình.** `/staffs` và `/staffs/{own id}` đều redirect `/403` với **zero request** tới API → chặn ở FE route guard (`PERMISSION_FLAG_RULES[StaffsView] = ['canViewStaff']`). Nhưng 権限マトリクス của `Y-01.md:280` ghi rõ `スタッフ一覧・参照` cho Staff là **「○ 自分のみ」** | Ma trận là nguồn authoritative → **FE nên miễn flag cho self-view**. Đây là đổi permission model nên cần bạn gật                                                                                             |
| **D4** | **TC-039 vs TC-040 loại trừ nhau** (P2-05). TC-040 đòi ẩn nút khi 0 session (đã làm, OK); TC-039 đòi bấm revoke khi 0 session                                                                                                                                                                                         | Giữ code, **viết lại TC-039** thành case API-level                                                                                                                                                           |
| **D5** | **Narrowing store phía client** trong `current-store.context.tsx` — FE tự lọc theo `/crm/me` vì `GET /admin/stores` unscoped                                                                                                                                                                                          | **Giữ** — thành no-op khi BE scope lại. Không phải security boundary (BE vẫn là chốt chặn thật)                                                                                                              |
| ~~D3~~ | ~~TC-052 / gap G8~~                                                                                                                                                                                                                                                                                                   | ✅ **Đóng 2026-09-18 (user)**: Y-13 = user tự xin cho mình, Y-01 = staff xin hộ user — hai việc khác nhau, không mâu thuẫn. Không phải bug, không sửa code. `BUG-P2-04-15` rút lại, TC-052 viết lại expected |
| ~~D2~~ | ~~無効化 từ list không hoàn thành được~~                                                                                                                                                                                                                                                                              | ✅ **Đóng theo luật ③**: 400 là do BE vẫn bắt buộc `deactivatedReason` trái ruling G9 → bug BE, chỉ note. FE giữ đúng PAR038, 無効化 vẫn làm được từ màn detail                                              |
| ~~D6~~ | ~~Sửa contract `05-03`~~                                                                                                                                                                                                                                                                                              | ✅ **Xong**: `specs/031-staff-login-history/contracts/api-contracts.md` giờ ghi `limit` mặc định 10 + page-size control, kèm lý do                                                                           |

## 10.6 Bug BE — gửi 1 lần (chỉ ghi chú, không tính NG của FE)

| #   | Vấn đề                                                                                                                                                                                             | Bug              | Bằng chứng mới nhất                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| 0   | **`PATCH /admin/staff/{id}` từ chối positionId thuộc ロール khác** (`400 E-VAL-001`) trong khi ロール derive từ 職位 và DTO không có field `role` ⇒ **không đổi ロール được bằng bất kỳ cách nào** | `03-01`          | Bảng đối chứng 4 body ở §10.4 — cùng ロール → 200, khác ロール → 400                                           |
| 1   | `PATCH /admin/staff/{id}` có gate **HQ-only**, trái FR-013 + 権限マトリクス L284 (職位割り当て（担当店舗分）= ○ cho Manager)                                                                       | `03-03`          | Manager gửi `{"positionId":"…0106"}` → `403 E-AUTH-103 「HQ-only operation」`                                  |
| 2   | `deactivatedReason` vẫn `required`, trái ruling G9                                                                                                                                                 | `01-14`, `04-07` | `deactivate` body rỗng → `400 E-VAL-001 {field:"deactivatedReason", code:"required"}`; có reason → 200         |
| 3   | `invite-bulk` race cùng email → 500 thay vì 409                                                                                                                                                    | `02-10`          |                                                                                                                |
| 4   | `invite-bulk` validate XOR `storeId`/`fcCompanyId` **mâu thuẫn chính OpenAPI** của nó (`required` chỉ có `staff`, `role`)                                                                          | `02-05`          | Bỏ trống → `400 E-VAL-001 {field:"storeId", message:"Exactly one of storeId or fcCompanyId must be provided"}` |
| 5   | `GET /admin/positions` không trả row 職位「未割当」 (`isSystemManaged`) → FE không biết id để gửi                                                                                                  | `03-01`, `03-02` | Đã workaround bằng `positionId: ""` theo thoả thuận BE                                                         |
| 6   | `deactivate` không idempotent-guard: record đã 無効 → 200 + ghi history                                                                                                                            | `04-14`          |                                                                                                                |
| 7   | `GET /api/v1/admin/stores` **unscoped**                                                                                                                                                            | `01-02`          |                                                                                                                |
| 8   | `/crm/me` không trả `managedStoreIds` → Manager thu về 1 store, switcher non-interactive                                                                                                           | `01-02`          | Xác nhận lại: `/crm/me` chỉ có `storeId`/`fcCompanyId`                                                         |
| 10  | `ErrorResponseDto` thiếu field `details` trong schema (dù mô tả 409/422/502 có nhắc `details.processed[]`)                                                                                         | `02-04`          |                                                                                                                |
| 11  | `EmailAvailabilityResponseDto.reason` khai là `type: object` và chỉ tài liệu hoá `'duplicate'`, nhưng wire trả **string** và có thêm `'domain_not_registered'`                                     | `02-11`          | `200 {"authProvider":null,"available":false,"reason":"domain_not_registered"}`                                 |
| 12  | `GET /admin/fc-companies` `managementType` chỉ nhận 1 giá trị — chi tiết §8.4                                                                                                                      | `02-06`, `03-08` |                                                                                                                |
| 13  | `managedStoreCount` luôn = 0 với staff pattern B                                                                                                                                                   | `04-04`          |                                                                                                                |
| 14  | Lỗi `400 E-VAL-001` trả `details[].field` nhưng UI không map được vào field (mới chỉ map được `details.processed[]` của 409/422)                                                                   | `02-04`          | 所属店舗 gắn badge 「任意」 nhưng パターンA thì BE bắt buộc — submit trống chỉ hiện toast chung                |

## 10.7 Block đáng chú ý (không phải lỗi, nhưng chặn coverage)

| TC                     | Lý do                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-021 (P2-03)         | FE đã đúng cả 3 nhánh; chỉ còn validation cross-role của BE → Block theo luật ③                                                                                       |
| TC-014, TC-034 (P2-03) | FE đã đúng; chỉ còn gate HQ-only của BE → Block theo luật ③                                                                                                           |
| TC-090 (P2-01)         | 無効化 từ list không hoàn thành được vì BE bắt buộc `deactivatedReason`                                                                                               |
| TC-019, TC-039 (P2-03) | Staff/Trainer/Observer không vào được form nên không exercise được gate server-side                                                                                   |
| TC-014 bước 2 (P2-04)  | Record ngoài phạm vi trả 404 + empty state ⇒ nhánh tooltip 「担当店舗のスタッフのみ編集できます」 **không thể chạm tới qua UI**                                       |
| TC-093/094 (P2-01)     | Badge sau 有効化 về 招待中 chứ không phải 有効 — fixture chưa onboard bao giờ, và mọi account 有効 trên dev đều là identity thật, không được phép 無効化 để dựng case |
| TC-024 (P2-04)         | Backend chỉ có **1 FC company** và nó có 1 store → không dựng được case zero-store                                                                                    |
| TC-030 (P2-01)         | Manager seeded chỉ quản **1 store** → header render div tĩnh, filter panel không có select 店舗                                                                       |

## 10.8 Lưu ý môi trường (cho lần chạy sau)

- **Account test**: `demo-users.ts` liệt kê `lodu4289+manager@` / `lodu4289+staff@` — cả hai ở
  職位 **未割当, 0/58 flags**, bị chặn trước khi vào màn. Dùng bản seeded
  **`lodu4289+test_manager@`** / **`lodu4289+test_staff@`** (cùng `Password@123`). Đây là
  nguyên nhân khiến `04-01` từng bị kết luận sai là bug BE.
- Manager seeded scope đúng **1 store**: `JOYFIT 横浜 (dev)` = `00000000-0000-7000-8000-000000000203`.
- **`example.com` CÓ trong domain master của dev** (trả `authProvider:"google", available:true`).
  Muốn test domain chưa đăng ký phải dùng thứ khác, ví dụ `zzz-unregistered.example`.
- Id của 職位「未割当」 theo ロール là `00000000-0000-0000-0000-00000000000{1..6}`; `…0004` = スタッフ.
- **Token sống ~1 giờ** — storage jar hết hạn giữa chừng, app redirect `/login`.
- Param search của list là `search=`, không phải `keyword=`.
- **Harness**: `startWatchRequests` bản gốc chỉ bắt **GET**. Bản vá trong scratchpad bắt mọi
  method kèm `responses[]`. Nhưng `req.postData()` trả `null` cho app này (generated client
  truyền `Request` object) → muốn đọc body PATCH/POST phải bọc `window.fetch` và clone Request.
- `fill-results.js` không clear Bug ID/Priority khi NG→OK, và regex của nó ăn cả dòng solo-ID
  ở bảng summary cuối doc. Vòng này dùng `update-doc.py` + `resummarize.py` trong scratchpad
  (tự clear Bug ID khi status ≠ NG, và tính lại summary từ chính các dòng case).
- Repo **không có** test runner (không vitest/jest, không script `test`). CLAUDE.md ghi gate là
  `npm test && npm run lint` nhưng `npm test` không tồn tại. `npx tsc --noEmit` luôn còn
  ~1 lỗi nhiễu ở `.next/types/validator.ts`; gate thật là 0 lỗi ngoài `.next/`.

## 10.9 Dữ liệu để lại trên backend dùng chung

| Record                                                           | Trạng thái                                                                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `58f9796a-82d4-4820-9dff-30f3234669ff` — `TC-U4R-150257 Retest`  | Còn lại, 招待中, 備考 = 1000×"Z"                                                                         |
| `fab91e93-ddf7-43ac-99a3-1f69fbcece56` — `TC-U1R-162633 React`   | Còn lại, để **無効** (reason 'TC-U1R-162633 fixture parked inactive'), chưa onboard nên không login được |
| `6a962b83-28ec-4e1d-9aaa-4b46730547ef` — `TC-U3R-162445 WithPos` | Còn lại, 招待中, 職位 未割当                                                                             |
| `21c0e76c-5286-42cf-aabf-2aa319a6d8c0` — `TC-U3R-162445 NoPos`   | Còn lại, 招待中, 職位 未割当                                                                             |
| 3 fixture `TC-U1-*` của vòng trước                               | Đã khôi phục về 無効 ✅ (`deactivatedReason` mang text "TC-U1 retest cleanup")                           |
| Magic link đã gửi thật                                           | `lodu4289+test_observer@`, `lodu4289+test_manager@` — vào hòm thư của chính team                         |

Không record có sẵn nào bị xoá, đổi tên hay 無効化.
