# Data Model: Y-02 Store Management — 2026-10-02 delta

The source of truth is the generated `src/lib/api-real/types.gen.ts`, staged 2026-10-02. This file lists only the shapes the delta reads or writes, plus the FE-side view models. No new backend entities are introduced.

## Store (`StoreDetailDto` / `StoreSummaryDto`)

| Field                                                        | Type                                                       | Used by                                                               | Notes                                                                                                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `status`                                                     | `operating \| preparing \| temporarily_closed \| closed`   | list badge/filter, detail badge, StatusCard, form brand lock          | Labels and tones are in `_constants/constants.ts`: 準備中 (preparing) = info, 営業中 (operating) = success, 休業中 (temporarily closed) = warning, 閉店 (closed) = muted |
| `brandEnum`                                                  | `Joyfit \| Joyfit24 \| JoyfitYoga \| JoyfitPlus \| Fit365` | form ブランド (brand) / サブブランド (sub-brand), detail サブブランド | Split by `fromStoredBrand()`. Editable only while `preparing` (422 `E-STR-006`)                                                                                          |
| `brandGroup`                                                 | `JOYFIT \| FIT365`                                         | detail ブランド, 入退館 (entry/exit) split, partner rule              | Derived and immutable                                                                                                                                                    |
| `clubCode`                                                   | string ≤50                                                 | 店舗コード (store code)                                               | Edit triggers the change warning and confirm. Duplicate → 409 `E-STR-002`                                                                                                |
| `receiptDate` / `preopenDate` / `grandOpenDate` / `closedAt` | `date \| null`                                             | form dates; StatusCard 閉店予定日 (planned closing date)              |                                                                                                                                                                          |
| `fcCompanyId`                                                | `string \| null`                                           | 運営企業 (operating company)                                          | null = 直営 (direct management) (`DIRECT_MANAGEMENT_VALUE`)                                                                                                              |
| `minorEntryAllowedStart/End`                                 | time                                                       | 入退館 Sheet                                                          | Written by `PATCH /stores/{id}` (HQ)                                                                                                                                     |

### Status transition (FE-enforced, R2)

```text
preparing ──► operating ◄──► temporarily_closed
   (any) ──closedAt passes (batch)──► closed   (never manual)
```

When a target is disabled, the dialog shows the reason:

- Current status: 現在のステータスです
- From closed: 閉店した店舗のステータスは変更できません
- Back to preparing: 開業準備中には戻せません
- To closed: 閉店日を設定すると自動的に閉店になります
- Any other move: この遷移はできません

## Weekly business hours (`StoreBusinessHourDto`, `PUT …/business-hours`)

```ts
type WeeklyRow = { dayOfWeek: 'monday'|…|'sunday'; isClosed: boolean; openTime?: string; closeTime?: string; staffStartTime?: string; staffEndTime?: string }
type HolidayMode = 'follow_weekday' | 'open' | 'closed'   // FE-only view model (R3)
```

**Wire mapping**:

| `HolidayMode`                 | Wire value                                                   |
| ----------------------------- | ------------------------------------------------------------ |
| `follow_weekday` (曜日どおり) | No `holiday` row is sent: 7 rows                             |
| `open` (営業)                 | `{dayOfWeek:'holiday', isClosed:false, openTime, closeTime}` |
| `closed` (休業)               | `{dayOfWeek:'holiday', isClosed:true}`                       |

Read: when no holiday row is returned, the mode is `follow_weekday`.

## Calendar exception (`/business-exceptions`)

| Field                    | Values                                                                                           | FE name              |
| ------------------------ | ------------------------------------------------------------------------------------------------ | -------------------- |
| `exceptionType`          | `short_hours` → 特別営業日 (special business day); `closed` → 臨時休業日 (temporary closure day) | R4                   |
| `date`                   | unique per store across both types (409 `E-STR-004`)                                             | editable             |
| `openTime` / `closeTime` | required for `short_hours`, open < close                                                         |                      |
| `reason`                 | ≤1000, nullable                                                                                  | shown for 臨時休業日 |

**Day classification (R5)**, highest priority first:

1. Exception `closed` → 臨時休業
2. Exception `short_hours` → 特別営業
3. Holiday row `open` → 祝日営業 (holiday open)
4. Holiday row `closed` → 祝日休業 (holiday closed)
5. Weekday `isClosed` → 定休日 (regular closing day)
6. Otherwise → 営業日 (business day)

An un-overridden holiday gets the label 祝日 only.

## Mutual use (`MutualUseSettingsDto` / `UpdateMutualUseDto`)

`isAcceptEnabled` (required), `acceptPeriodStart/End` (end ≥ start), `payLaterEnabled` (JOYFIT), `yogaUsageFee` int ≥0 (JOYFIT).

**PUT always sends all fields** (R6). Partner stores (`MutualUsePartnerStoreDto`) are read-only in Phase 1.

## Contract tab

- **`StorePlanDto.storeId`**: null → 区分 (category) 全社共通 (company-wide); `= store.id` → 当店限定 (this store only).
- **`StoreOptionDto`**: no parent option and no origin.

## Store photo (`StoreImageDto`, `PUT …/images`)

```ts
type StorePhotoDraft = {
  s3Key: string;
  caption: string | null;
  previewUrl?: string;
  status: 'uploaded' | 'uploading' | 'failed';
};
// write body
type ReplaceStoreImagesBodyDto = { items: { s3Key: string; caption?: string | null }[] }; // ≤20, order = display order, no id/sortOrder
```

- **Dirty**: compare the ordered `s3Key` list with the loaded one.
- **Ids**: never kept; they change on every PUT.
- **Upload**: `CreatePresignDto{fileName,fileSize,contentType,tag:'store-image'}` returns `MediaPresignDto{url, s3Key, requiredHeaders}`.

## Locker position (store map)

| Field                                                 | Type                | Notes                                    |
| ----------------------------------------------------- | ------------------- | ---------------------------------------- |
| `LockerListItemDto.mapX` / `mapY`                     | number 0..1 \| null | Set together; a null pair means unplaced |
| `UpdateLockerDto.mapX` / `mapY` + `expectedUpdatedAt` |                     | Stale write → 422 `E-LOC-006`            |

```ts
type MapDraft = {
  image: { file: File; previewUrl: string } | null /* session only, R8 */;
  positions: Record<lockerId, { x: number; y: number } | null>;
  dirtyIds: Set<string>;
};
```

## Permission helper

`canEditStore(user, storeId)` → `role ∈ {System, Headquarter}` ‖ (`role === Staff` && `user.storeId === storeId`).
