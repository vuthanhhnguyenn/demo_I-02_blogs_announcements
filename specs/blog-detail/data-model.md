# Data Model: Blog Detail (ブログ詳細)

**Feature**: `specs/blog-detail/spec.md` | **Date**: 2026-11-13

Extends the blog-list `Notice` model (`specs/blog-list/data-model.md`). The detail response mirrors the real `NoticeDetailDto`; **gap** fields are mock-only (research D4).

## NoticeDetail (response of `GET /crm/notices/{id}`)

All `NoticeListItem` fields (id, type, articleNo, title, categoryId, categoryName, thumbnailS3Key, thumbnailUrl, brandScope, brandCode, subBrandCodes, storeScope, targetStores, channelWeb, channelApp, publishStatus, publishStartAt, publishEndAt, wordpressSync, deletedAt, createdBy, updatedBy, createdAt, updatedAt) plus:

| Field            | Type                                                                                                                                         | Source        | Notes                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------- |
| `body`           | string (HTML)                                                                                                                                | real          | Rich text from the editor (research D2) |
| `targetStoreIds` | string[]                                                                                                                                     | real          | Empty unless `brandScope = store`       |
| `wordpressSync`  | `{ status: pending\|success\|failed; syncedAt: ISO\|null; errorMessage: string\|null; attemptCount: number } \| null`                        | real (detail) | Extends the list's subset               |
| `recentSyncLogs` | `{ id; syncStatus: pending\|success\|failed; syncedAt: ISO\|null; errorMessage: string\|null; triggeredBy: string\|null; createdAt: ISO }[]` | real          | Not displayed (kept for parity)         |
| `createdByName`  | string \| null                                                                                                                               | gap BD-02     | 作成者                                  |
| `updatedByName`  | string \| null                                                                                                                               | gap BD-02     | 最終更新者                              |

The stored mock record gains `body`, `recentSyncLogs`, `createdByName`, `updatedByName`; the list route strips `body` / `recentSyncLogs` / names (real list omits them).

## Derived display (UI)

| Element              | Rule                                                                                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display status       | `deletedAt ? 削除済み : publishStatus` (same as list)                                                                                                                                                                                                                        |
| Status card meta     | 公開中 `{publishStartAt} 公開`; 公開予定 `{publishStartAt} に自動公開されます`; 非公開 `{updatedAt} 非公開に変更`; 下書き `{updatedAt} 最終保存`; 削除済み `{deletedAt} 削除`                                                                                                |
| 公開日時 label       | 公開予定日時 when scheduled, else 公開日時; "—" when `publishStartAt` null, and "—" when publishStatus is draft (also after deletion)                                                                                                                                        |
| 掲載先               | WEBサイト if `channelWeb`; モバイルアプリ if `channelApp`                                                                                                                                                                                                                    |
| WordPress連携 status | Precedence: `!channelWeb` → 連携対象外 (any status, incl. draft / scheduled / deleted); else publishStatus draft/scheduled → 未連携; else by `wordpressSync.status`: success 同期済み, failed 同期失敗, pending/null 未同期                                                  |
| WordPress連携 time   | 最終同期 row = `wordpressSync.syncedAt` for success and failed (no lookup in `recentSyncLogs`); hidden when null                                                                                                                                                             |
| WordPress連携 note   | 非公開 + success "非公開状態を同期済み"; 削除済み "削除に伴いWordPress側は非公開化されています"; 未連携 "公開時にWordPressへ連携されます" (a deleted article that was never linked — 下書き / 公開予定 — shows 未連携 without a note); 連携対象外 "WEBサイト掲載がOFFのため" |
| Actions              | non-deleted: 削除 · プレビュー (not draft) · 編集; deleted: 復元する only (Q1)                                                                                                                                                                                               |
| Status-card action   | published → 非公開にする; scheduled → 予約を取り消す; others none                                                                                                                                                                                                            |

## State transitions available on this screen

| From        | Action         | To                              | Who                                    |
| ----------- | -------------- | ------------------------------- | -------------------------------------- |
| published   | 非公開にする   | unpublished                     | HQ / System / Manager; Staff if author |
| scheduled   | 予約を取り消す | unpublished (start date kept)   | same                                   |
| not deleted | 削除           | `deletedAt = now`               | HQ / System / Manager                  |
| deleted     | 復元する       | `deletedAt = null`, unpublished | HQ / System / Manager (inherited Q2)   |
