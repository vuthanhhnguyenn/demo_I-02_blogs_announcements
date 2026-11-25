import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { ErrorResponseSchema } from './auth.schema';

extendZodWithOpenApi(z);

// Field names and enum values mirror the real `NoticeDto` (GET /api/v1/admin/notices).
// Fields marked "gap" are mock-only until the backend adds them (specs/blog-list research R9).

export const NoticeTypeSchema = z.enum(['notice', 'blog']).openapi({
  title: 'NoticeType',
  description: '記事種別 (告知 / ブログ)',
});

export const NoticeBrandScopeSchema = z.enum(['company', 'brand', 'store']).openapi({
  title: 'NoticeBrandScope',
  description: '配信範囲 (全社 / ブランド指定 / 店舗指定)',
});

export const NoticeBrandCodeSchema = z
  .enum(['Joyfit', 'Joyfit24', 'JoyfitYoga', 'JoyfitPlus', 'Fit365'])
  .openapi({
    title: 'NoticeBrandCode',
    description: 'ブランドコード (行の brandCode はブランドファミリー: Joyfit / Fit365)',
  });

export const NoticeStoreScopeSchema = z.enum(['all', 'specific']).openapi({
  title: 'NoticeStoreScope',
  description: '店舗範囲 (specific は brandScope = store のときのみ)',
});

export const NoticePublishStatusSchema = z
  .enum(['draft', 'scheduled', 'published', 'unpublished'])
  .openapi({
    title: 'NoticePublishStatus',
    description: '公開ステータス (下書き / 公開予定 / 公開中 / 非公開)',
  });

export const NoticeWordpressSyncStatusSchema = z.enum(['pending', 'success', 'failed']).openapi({
  title: 'NoticeWordpressSyncStatus',
  description: 'WordPress 同期ステータス',
});

export const NoticeSortBySchema = z
  .enum(['articleNo', 'title', 'brandScope', 'target', 'publishStartAt', 'publishEndAt', 'status'])
  .openapi({
    title: 'NoticeSortBy',
    description: '記事一覧ソートキー',
  });

export const NoticeChannelSchema = z.enum(['web', 'app']).openapi({
  title: 'NoticeChannel',
  description: '掲載先',
});

export const NoticeStatusFilterSchema = z
  .enum(['draft', 'scheduled', 'published', 'unpublished', 'deleted'])
  .openapi({
    title: 'NoticeStatusFilter',
    description: 'ステータス絞り込み (deleted は削除済みのみ)',
  });

export const NoticeTargetStoreSchema = z
  .object({
    id: z.string().openapi({ description: '店舗ID' }),
    name: z.string().openapi({ example: 'JOYFIT 群馬', description: '店舗名' }),
  })
  .openapi({
    title: 'NoticeTargetStore',
    description: '配信対象店舗 (gap B-03)',
  });

export const NoticeWordpressSyncSchema = z
  .object({
    status: NoticeWordpressSyncStatusSchema,
    syncedAt: z.string().nullable().openapi({ description: '同期日時 (ISO)' }),
  })
  .openapi({
    title: 'NoticeWordpressSync',
    description: 'WordPress 同期状態 (gap B-04)',
  });

// -- Row schema --

export const NoticeListItemSchema = z
  .object({
    id: z.string().openapi({ description: '記事ID (uuid)' }),
    type: NoticeTypeSchema,
    articleNo: z.string().openapi({
      example: 'BL-2026-0001',
      description: '記事番号 (ブログ BL-YYYY-NNNN / お知らせ AN-YYYY-NNNN, gap B-02 / AL-03)',
    }),
    title: z.string().openapi({ example: '冬こそ始めたい朝トレ習慣', description: 'タイトル' }),
    categoryId: z.string().nullable().openapi({ example: 'CAT-004', description: 'カテゴリID' }),
    categoryName: z
      .string()
      .nullable()
      .openapi({ example: 'トレーニング', description: 'カテゴリ名' }),
    thumbnailS3Key: z.string().nullable().openapi({ description: 'サムネイル S3 キー' }),
    thumbnailUrl: z.string().nullable().openapi({ description: 'サムネイル URL' }),
    brandScope: NoticeBrandScopeSchema,
    brandCode: NoticeBrandCodeSchema.nullable().openapi({
      description: 'ブランドファミリー (全社は null)',
    }),
    subBrandCodes: z.array(z.string()).nullable().openapi({
      description: '対象サブブランド (null はファミリー全体)',
    }),
    storeScope: NoticeStoreScopeSchema,
    targetStores: z.array(NoticeTargetStoreSchema).openapi({
      description: '配信対象店舗 (brandScope = store のときのみ, gap B-03)',
    }),
    channelWeb: z.boolean().openapi({ description: '掲載先 WEB' }),
    channelApp: z.boolean().openapi({ description: '掲載先 アプリ' }),
    publishStatus: NoticePublishStatusSchema,
    publishStartAt: z.string().nullable().openapi({ description: '公開開始日時 (ISO)' }),
    publishEndAt: z.string().nullable().openapi({ description: '公開終了日時 (ISO)' }),
    wordpressSync: NoticeWordpressSyncSchema.nullable(),
    deletedAt: z.string().nullable().openapi({ description: '削除日時 (ISO, gap B-05)' }),
    createdBy: z.string().openapi({ description: '作成者スタッフID' }),
    updatedBy: z.string().openapi({ description: '更新者スタッフID' }),
    createdAt: z.string().openapi({ description: '作成日時 (ISO)' }),
    updatedAt: z.string().openapi({ description: '更新日時 (ISO)' }),
  })
  .openapi({
    title: 'NoticeListItem',
    description: '告知 / ブログ一覧アイテム',
  });

// -- Detail schemas (GET /crm/notices/{id}, mirrors `NoticeDetailDto`; specs/blog-detail D1 / D4) --

export const NoticeWordpressSyncDetailSchema = z
  .object({
    status: NoticeWordpressSyncStatusSchema,
    syncedAt: z.string().nullable().openapi({ description: '同期日時 (ISO)' }),
    errorMessage: z.string().nullable().openapi({ description: '同期エラーメッセージ' }),
    attemptCount: z.number().int().openapi({ description: '同期試行回数' }),
  })
  .openapi({
    title: 'NoticeWordpressSyncDetail',
    description: 'WordPress 同期状態 (詳細)',
  });

export const NoticeSyncLogSchema = z
  .object({
    id: z.string().openapi({ description: '同期ログID' }),
    syncStatus: NoticeWordpressSyncStatusSchema,
    syncedAt: z.string().nullable().openapi({ description: '同期日時 (ISO)' }),
    errorMessage: z.string().nullable().openapi({ description: '同期エラーメッセージ' }),
    triggeredBy: z.string().nullable().openapi({ description: '同期実行者スタッフID' }),
    createdAt: z.string().openapi({ description: '作成日時 (ISO)' }),
  })
  .openapi({
    title: 'NoticeSyncLog',
    description: 'WordPress 同期ログ',
  });

export const NoticeNotificationSummarySchema = z
  .object({
    targetCount: z.number().int().min(0).openapi({ description: '対象者数' }),
    notifiedCount: z.number().int().min(0).openapi({ description: '通知済み人数' }),
    deliveryRate: z.number().min(0).max(100).openapi({ description: '配信率 (%, 小数第1位)' }),
  })
  .openapi({
    title: 'NoticeNotificationSummary',
    description: '通知到達サマリー (gap AD-01, specs/announcement-detail)',
  });

export const NoticeDetailSchema = NoticeListItemSchema.extend({
  body: z.string().openapi({ description: '本文 (HTML)' }),
  targetStoreIds: z.array(z.string()).openapi({
    description: '配信対象店舗ID (brandScope = store のときのみ)',
  }),
  wordpressSync: NoticeWordpressSyncDetailSchema.nullable(),
  recentSyncLogs: z.array(NoticeSyncLogSchema).openapi({
    description: '直近の WordPress 同期ログ (新しい順)',
  }),
  createdByName: z.string().nullable().openapi({ description: '作成者名 (gap BD-02)' }),
  updatedByName: z.string().nullable().openapi({ description: '最終更新者名 (gap BD-02)' }),
  notificationSummary: NoticeNotificationSummarySchema.nullable().openapi({
    description: '通知到達サマリー (公開実績のあるお知らせのみ。ブログ・未公開は null)',
  }),
}).openapi({
  title: 'NoticeDetail',
  description: '告知 / ブログ詳細',
});

// -- Request schemas --

/** `a&a` or `a,b` → string[] (repeated or comma-separated query values). */
const queryStringArray = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => String(item).split(',')).filter(Boolean);
}, z.array(z.string()).optional());

export const GetNoticeReachEstimateQueryParamsSchema = z
  .object({
    brandScope: NoticeBrandScopeSchema,
    brandCodes: queryStringArray.pipe(z.array(NoticeBrandCodeSchema).optional()).openapi({
      description: '対象ブランド (brandScope = brand)。カンマ区切り可',
    }),
    storeIds: queryStringArray.openapi({
      description: '対象店舗ID (brandScope = store)。カンマ区切り可',
    }),
  })
  .openapi({
    title: 'GetNoticeReachEstimateQueryParams',
    description: '対象（推計）会員数の取得クエリ (gap AF-02, specs/announcement-form)',
  });

export const NoticeReachEstimateResponseSchema = z
  .object({
    estimatedMemberCount: z.number().int().min(0).openapi({ description: '対象会員数（推計）' }),
  })
  .openapi({
    title: 'NoticeReachEstimate',
    description: '対象（推計） 会員数 (gap AF-02)。店舗数は実 API の店舗マスタから取得する',
  });

export const GetNoticeDetailQueryParamsSchema = z
  .object({
    storeId: z.string().optional().openapi({
      description:
        'ヘッダー店舗ID (mock-only seam BD-05)。指定時、この店舗に届かない記事は 404。実 API はトークンでスコープし、このパラメータは無い',
    }),
  })
  .openapi({
    title: 'GetNoticeDetailQueryParams',
    description: '告知 / ブログ詳細取得クエリ',
  });

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const GetNoticesQueryParamsSchema = z
  .object({
    type: NoticeTypeSchema.optional(),
    q: z.string().optional().openapi({
      description: 'タイトル部分一致検索 (大文字小文字を区別しない)',
    }),
    categoryId: z.string().optional().openapi({
      description: 'カテゴリID (none は未分類, gap B-09)',
    }),
    brandCode: NoticeBrandCodeSchema.optional(),
    brandScope: NoticeBrandScopeSchema.optional(),
    storeId: z.string().optional().openapi({ description: '店舗ID (この店舗に届く記事)' }),
    channel: NoticeChannelSchema.optional(),
    publishStatus: NoticeStatusFilterSchema.optional(),
    publishFrom: z
      .string()
      .regex(DATE_ONLY_PATTERN, 'publishFrom must be YYYY-MM-DD')
      .optional()
      .openapi({ description: '公開日 From (YYYY-MM-DD, JST)' }),
    publishTo: z
      .string()
      .regex(DATE_ONLY_PATTERN, 'publishTo must be YYYY-MM-DD')
      .optional()
      .openapi({ description: '公開日 To (YYYY-MM-DD, JST)' }),
    publishEndFrom: z
      .string()
      .regex(DATE_ONLY_PATTERN, 'publishEndFrom must be YYYY-MM-DD')
      .optional()
      .openapi({ description: '掲載終了日 From (YYYY-MM-DD, JST, 終了日なしは対象外, gap AL-01)' }),
    publishEndTo: z
      .string()
      .regex(DATE_ONLY_PATTERN, 'publishEndTo must be YYYY-MM-DD')
      .optional()
      .openapi({ description: '掲載終了日 To (YYYY-MM-DD, JST, 終了日なしは対象外, gap AL-01)' }),
    sort: NoticeSortBySchema.default('articleNo'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((value) => [25, 50, 100].includes(value), 'limit must be one of 25, 50, 100')
      .default(50),
  })
  .openapi({
    title: 'GetNoticesQueryParams',
    description: '告知 / ブログ一覧取得クエリ',
  });

export const PatchNoticePublishStatusBodySchema = z
  .object({
    publishStatus: z.enum(['published', 'unpublished']).openapi({
      description: '変更後の公開ステータス',
    }),
  })
  .openapi({
    title: 'PatchNoticePublishStatusBody',
    description: '公開ステータス変更リクエスト',
  });

// -- Create / update (POST /crm/notices, PATCH /crm/notices/{id}; specs/blog-form research F1 / F2) --
// Field names follow the real `NoticeDto`. Cross-field rules (three axes, dates) are checked by the
// route on the (merged) row and answered with 422, mirroring the real E-NTC-003 / E-NTC-009.

const NOTICE_TITLE_MAX_LENGTH = 255;

const noticeIsoDateTime = (description: string) =>
  z
    .string()
    .datetime({ offset: true, error: '日時の形式が正しくありません' })
    .nullable()
    .openapi({ description });

export const NoticeCreatePublishStatusSchema = z.enum(['draft', 'scheduled', 'published']).openapi({
  title: 'NoticeCreatePublishStatus',
  description: '登録時の公開ステータス (下書き / 公開予定 / 公開中)',
});

export const NoticeOperatorSchema = z
  .object({
    staffId: z
      .string()
      .min(1, 'スタッフIDを指定してください')
      .openapi({ description: 'スタッフID' }),
    name: z.string().min(1, 'スタッフ名を指定してください').openapi({ description: 'スタッフ名' }),
  })
  .openapi({
    title: 'NoticeOperator',
    description:
      '操作者 (mock-only seam BF-02)。createdBy / updatedBy と作成者名 / 更新者名に使う。実 API はトークンから取得し、このフィールドは無い',
  });

const noticeTargetStoresSeam = z.array(NoticeTargetStoreSchema).optional().openapi({
  description:
    '配信対象店舗 {id, name} (mock-only seam BF-01)。店舗名の表示用に保存し、targetStoreIds にも反映する。実 API は targetStoreIds のみ',
});

const noticeWriteFields = {
  title: z
    .string()
    .trim()
    .min(1, 'タイトルを入力してください')
    .max(NOTICE_TITLE_MAX_LENGTH, `タイトルは${NOTICE_TITLE_MAX_LENGTH}文字以内で入力してください`)
    .openapi({ description: 'タイトル' }),
  body: z.string().openapi({
    description: '本文 (HTML)。お知らせは空文字可 (gap AF-01)。ブログは空不可 (route で 422)',
  }),
  categoryId: z.string().nullable().openapi({ description: 'カテゴリID (null は未分類)' }),
  thumbnailS3Key: z.string().nullable().openapi({ description: 'サムネイル S3 キー' }),
  brandScope: NoticeBrandScopeSchema,
  brandCode: NoticeBrandCodeSchema.nullable().openapi({
    description: 'ブランドファミリー Joyfit / Fit365 (company は null)',
  }),
  subBrandCodes: z.array(NoticeBrandCodeSchema).nullable().openapi({
    description: '対象サブブランド (null はファミリー全体、空配列は不可 E-NTC-003、Joyfit のみ)',
  }),
  storeScope: NoticeStoreScopeSchema,
  targetStoreIds: z.array(z.string().min(1, '店舗IDを指定してください')).openapi({
    description: '配信対象店舗ID (storeScope = specific のとき1件以上)',
  }),
  channelWeb: z.boolean({ error: '掲載先 WEB を指定してください' }).openapi({
    description: '掲載先 WEB',
  }),
  channelApp: z.boolean({ error: '掲載先 アプリ を指定してください' }).openapi({
    description: '掲載先 アプリ',
  }),
  publishStartAt: noticeIsoDateTime('公開開始日時 (ISO, scheduled は未来日時必須 E-NTC-009)'),
  publishEndAt: noticeIsoDateTime('公開終了日時 (ISO, 公開開始より後 E-NTC-009)'),
};

export const CreateNoticeBodySchema = z
  .object({
    type: NoticeTypeSchema,
    ...noticeWriteFields,
    categoryId: noticeWriteFields.categoryId.optional(),
    thumbnailS3Key: noticeWriteFields.thumbnailS3Key.optional(),
    publishStatus: NoticeCreatePublishStatusSchema,
    publishStartAt: noticeWriteFields.publishStartAt.optional(),
    publishEndAt: noticeWriteFields.publishEndAt.optional(),
    targetStores: noticeTargetStoresSeam,
    operator: NoticeOperatorSchema.optional(),
  })
  .openapi({
    title: 'CreateNoticeBody',
    description: '告知 / ブログ登録リクエスト (mirrors POST /api/v1/admin/notices)',
  });

export const UpdateNoticeBodySchema = z
  .object({
    title: noticeWriteFields.title.optional(),
    body: noticeWriteFields.body.optional(),
    categoryId: noticeWriteFields.categoryId.optional(),
    thumbnailS3Key: noticeWriteFields.thumbnailS3Key.optional(),
    brandScope: noticeWriteFields.brandScope.optional(),
    brandCode: noticeWriteFields.brandCode.optional(),
    subBrandCodes: noticeWriteFields.subBrandCodes.optional(),
    storeScope: noticeWriteFields.storeScope.optional(),
    targetStoreIds: noticeWriteFields.targetStoreIds.optional(),
    channelWeb: noticeWriteFields.channelWeb.optional(),
    channelApp: noticeWriteFields.channelApp.optional(),
    publishStatus: NoticePublishStatusSchema.optional().openapi({
      description: '変更後の公開ステータス (省略時は変更なし)',
    }),
    publishStartAt: noticeWriteFields.publishStartAt.optional(),
    publishEndAt: noticeWriteFields.publishEndAt.optional(),
    expectedUpdatedAt: z.string().min(1, '更新日時を指定してください').optional().openapi({
      description: '楽観ロック: 読み込み時の updatedAt。一致しない場合は 409 (E-NTC-012)',
    }),
    targetStores: noticeTargetStoresSeam,
    operator: NoticeOperatorSchema.optional(),
  })
  .openapi({
    title: 'UpdateNoticeBody',
    description:
      '告知 / ブログ更新リクエスト (mirrors PATCH /api/v1/admin/notices/{noticeId})。送信したフィールドのみ更新',
  });

// -- Response schemas --

export const GetNoticesResponseSchema = z
  .object({
    items: z.array(NoticeListItemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      totalItems: z.number(),
      totalPages: z.number(),
    }),
    totalAllItems: z.number().openapi({
      description: 'type + storeId のみで絞った件数 (gap B-11)',
    }),
  })
  .openapi({
    title: 'GetNoticesResponse',
    description: '告知 / ブログ一覧レスポンス',
  });

export type NoticeType = z.infer<typeof NoticeTypeSchema>;
export type GetNoticeReachEstimateQueryParams = z.infer<
  typeof GetNoticeReachEstimateQueryParamsSchema
>;
export type NoticeReachEstimate = z.infer<typeof NoticeReachEstimateResponseSchema>;
export type NoticeBrandScope = z.infer<typeof NoticeBrandScopeSchema>;
export type NoticeBrandCode = z.infer<typeof NoticeBrandCodeSchema>;
export type NoticeStoreScope = z.infer<typeof NoticeStoreScopeSchema>;
export type NoticePublishStatus = z.infer<typeof NoticePublishStatusSchema>;
export type NoticeWordpressSyncStatus = z.infer<typeof NoticeWordpressSyncStatusSchema>;
export type NoticeSortBy = z.infer<typeof NoticeSortBySchema>;
export type NoticeChannel = z.infer<typeof NoticeChannelSchema>;
export type NoticeStatusFilter = z.infer<typeof NoticeStatusFilterSchema>;
export type NoticeTargetStore = z.infer<typeof NoticeTargetStoreSchema>;
export type NoticeWordpressSync = z.infer<typeof NoticeWordpressSyncSchema>;
export type NoticeListItem = z.infer<typeof NoticeListItemSchema>;
export type GetNoticesQueryParams = z.infer<typeof GetNoticesQueryParamsSchema>;
export type PatchNoticePublishStatusBody = z.infer<typeof PatchNoticePublishStatusBodySchema>;
export type GetNoticesResponse = z.infer<typeof GetNoticesResponseSchema>;
export type NoticeWordpressSyncDetail = z.infer<typeof NoticeWordpressSyncDetailSchema>;
export type NoticeSyncLog = z.infer<typeof NoticeSyncLogSchema>;
export type NoticeDetail = z.infer<typeof NoticeDetailSchema>;
export type NoticeNotificationSummary = z.infer<typeof NoticeNotificationSummarySchema>;
export type GetNoticeDetailQueryParams = z.infer<typeof GetNoticeDetailQueryParamsSchema>;
export type NoticeCreatePublishStatus = z.infer<typeof NoticeCreatePublishStatusSchema>;
export type NoticeOperator = z.infer<typeof NoticeOperatorSchema>;
export type CreateNoticeBody = z.infer<typeof CreateNoticeBodySchema>;
export type UpdateNoticeBody = z.infer<typeof UpdateNoticeBodySchema>;

export { ErrorResponseSchema };
