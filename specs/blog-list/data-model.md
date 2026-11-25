# Data Model: Blog List (ブログ一覧)

**Feature**: `specs/blog-list/spec.md` | **Date**: 2026-11-13

Mirrors the real `NoticeDto` (`GET /api/v1/admin/notices`). The list response also carries `totalAllItems` (count within `type` + `storeId` scope, ignoring the other filters; gap B-11) for the header count. Fields marked **gap** are mock-only until the backend adds them (research.md R9).

## Notice (mock table `notices`, shared by 告知 / ブログ)

| Field            | Type                                                                      | Source   | Notes                                                          |
| ---------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| `id`             | string (uuid)                                                             | real     | Seed uses stable uuids                                         |
| `type`           | `notice \| blog`                                                          | real     | This feature lists `blog` only                                 |
| `articleNo`      | string `BL-YYYY-NNNN` / `NT-YYYY-NNNN`                                    | gap B-02 | Unique per type; default sort key                              |
| `title`          | string                                                                    | real     |                                                                |
| `categoryId`     | string \| null                                                            | real     | Mock article-category id (`CAT-…`, type `blog`); null → 未分類 |
| `categoryName`   | string \| null                                                            | real     | Resolved from the category table                               |
| `thumbnailS3Key` | string \| null                                                            | real     |                                                                |
| `thumbnailUrl`   | string \| null                                                            | real     | null → dashed placeholder                                      |
| `brandScope`     | `company \| brand \| store`                                               | real     | 全社 / ブランド指定 / 店舗指定                                 |
| `brandCode`      | `Joyfit \| Joyfit24 \| JoyfitYoga \| JoyfitPlus \| Fit365` \| null        | real     | Brand family (`Joyfit` / `Fit365`); null for `company` (R2)    |
| `subBrandCodes`  | string[] \| null                                                          | real     | null = whole family; JOYFIT sub-brands otherwise               |
| `storeScope`     | `all \| specific`                                                         | real     | `specific` iff `brandScope = store`                            |
| `targetStores`   | `{ id: string; name: string }[]`                                          | gap B-03 | Empty unless `brandScope = store`                              |
| `channelWeb`     | boolean                                                                   | real     | 掲載先 WEB                                                     |
| `channelApp`     | boolean                                                                   | real     | 掲載先 アプリ                                                  |
| `publishStatus`  | `draft \| scheduled \| published \| unpublished`                          | real     | 下書き / 公開予定 / 公開中 / 非公開                            |
| `publishStartAt` | ISO datetime \| null                                                      | real     | 公開日 column; null → "—"                                      |
| `publishEndAt`   | ISO datetime \| null                                                      | real     | Not shown (FR-002)                                             |
| `wordpressSync`  | `{ status: pending \| success \| failed; syncedAt: ISO \| null } \| null` | gap B-04 | null = never attempted (shown as 未同期 when a sync target)    |
| `deletedAt`      | ISO datetime \| null                                                      | gap B-05 | Non-null → 削除済み                                            |
| `createdBy`      | string (staff uuid)                                                       | real     | Own-article check (R5)                                         |
| `updatedBy`      | string (staff uuid)                                                       | real     |                                                                |
| `createdAt`      | ISO datetime                                                              | real     |                                                                |
| `updatedAt`      | ISO datetime                                                              | real     |                                                                |

### Derived display status (UI)

`deletedAt ? 削除済み : { published: 公開中, scheduled: 公開予定, draft: 下書き, unpublished: 非公開 }[publishStatus]`

### Sync target (UI, FR-007)

`channelWeb && !deletedAt && publishStatus ∈ {published, unpublished}` → badge by `wordpressSync?.status ?? 'pending'` (同期済み / 同期失敗 / 未同期); otherwise "—".

### State transitions

| From                      | Action       | To                                     | Who (FR)                                           |
| ------------------------- | ------------ | -------------------------------------- | -------------------------------------------------- |
| `draft` / `unpublished`   | 公開にする   | `published` (`publishStartAt ??= now`) | HQ / System / Manager; Staff if author (FR-016)    |
| `published` / `scheduled` | 非公開にする | `unpublished`                          | same as above                                      |
| any, not deleted          | 削除         | `deletedAt = now` (status kept)        | HQ / System / Manager (FR-017)                     |
| deleted                   | 復元する     | `deletedAt = null`, `unpublished`      | HQ / System / Manager (FR-021, Q2 pending QA #329) |

## Notice store directory (mock seed, R3)

| Field       | Type                                                       | Notes                                            |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------ |
| `id`        | string                                                     | Real dev store uuid (captured once)              |
| `name`      | string                                                     | Store name as in the real store master           |
| `brandEnum` | `Joyfit \| Joyfit24 \| JoyfitYoga \| JoyfitPlus \| Fit365` | Store's sub-brand; family = `Fit365` or `Joyfit` |

**Reaches store X** (FR-014, Q4): `brandScope = company` OR (`brandScope = brand` AND family(X) = `brandCode` AND (`subBrandCodes` is null OR contains X.brandEnum)) OR (`brandScope = store` AND `targetStores` contains X).

## Article category (existing, read-only here)

Existing mock `article-categories` table (`type: notice | blog`). The filter lists rows with `type = blog`. Not modified by this feature (its `articleCount` keeps using its own mapping table).

## Seed coverage (minimum)

≥ 60 blog rows (to exercise 50/page paging) and a few `notice` rows (proves `type` filtering), covering: every status incl. deleted; all three scopes; each brand family, JOYFIT whole-brand and each sub-brand; 店舗指定 on ≥ 2 directory stores; WEB-only / アプリ-only / both; no category; no thumbnail; draft without publish date; each `wordpressSync` status and null; rows authored by the Staff test account and by others.
