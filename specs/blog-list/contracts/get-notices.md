# GET /crm/notices (mock) ↔ GET /api/v1/admin/notices (real)

List articles of one type. Envelope and field names mirror the real `NoticeListResponseDto`.

## Query

| Param           | Type                                                                     | Real?                    | Notes                                                                        |
| --------------- | ------------------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------------- |
| `type`          | `notice \| blog`                                                         | yes                      | UI always sends `blog`                                                       |
| `q`             | string                                                                   | yes                      | Title partial match, case-insensitive                                        |
| `categoryId`    | string \| `none`                                                         | yes / `none` gap B-09    | `none` → uncategorized                                                       |
| `brandCode`     | `Joyfit \| Joyfit24 \| JoyfitYoga \| JoyfitPlus \| Fit365`               | yes                      | Semantics per research R2 (gap B-08)                                         |
| `brandScope`    | `company \| brand \| store`                                              | gap B-01                 |                                                                              |
| `storeId`       | string                                                                   | yes                      | "Reaches store" rule (data-model)                                            |
| `channel`       | `web \| app`                                                             | gap B-01                 |                                                                              |
| `publishStatus` | `draft \| scheduled \| published \| unpublished \| deleted`              | yes / `deleted` gap B-05 | absent → all incl. deleted; `deleted` → deleted only; others exclude deleted |
| `publishFrom`   | `YYYY-MM-DD`                                                             | yes                      | JST calendar date of `publishStartAt` ≥; null dates never match              |
| `publishTo`     | `YYYY-MM-DD`                                                             | yes                      | ≤                                                                            |
| `sort`          | `articleNo \| title \| brandScope \| target \| publishStartAt \| status` | gap B-07                 | default `articleNo`                                                          |
| `order`         | `asc \| desc`                                                            | gap B-07                 | default `desc`                                                               |
| `page`          | int ≥ 1                                                                  | gap B-07                 | default 1                                                                    |
| `limit`         | 25 \| 50 \| 100                                                          | gap B-07                 | default 50                                                                   |

## 200

```json
{
  "items": [NoticeListItem],
  "pagination": { "page": 1, "limit": 50, "totalItems": 64, "totalPages": 2 },
  "totalAllItems": 70
}
```

`NoticeListItem` = data-model "Notice" fields (no `body`, as in the real list). `totalPages` is ≥ 1 even when empty (real `PaginationDto` rule). `totalAllItems` (gap B-11) = rows matching `type` and `storeId` only (no search / other filters) — drives the header count and `FilterResult.totalCount`, as in other mock lists (`article-categories`).

## 400

`ErrorResponse` on invalid params.
