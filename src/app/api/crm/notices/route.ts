import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  NOTICE_FALLBACK_OPERATOR_ID,
  NOTICE_FALLBACK_OPERATOR_NAME,
} from '@/app/api/_mock-db/seeds/notice.seed';
import {
  deriveNoticePublishFields,
  enrichNotice,
  enrichNoticeDetail,
  isNoticeBodyMissing,
  jstYear,
  matchesBrandFilter,
  noticeThumbnailUrl,
  reachesStore,
  resolveTargetStores,
  toJstIso,
  validateNoticeWrite,
} from '@/app/api/_mock-db/tables/notice.table';
import type { NoticeRecord } from '@/app/api/_mock-db/types/notices.type';
import type { GetNoticesQueryParams, NoticeBrandCode } from '@/app/api/_schemas/notice.schema';
import {
  CreateNoticeBodySchema,
  ErrorResponseSchema,
  GetNoticesQueryParamsSchema,
  GetNoticesResponseSchema,
  NoticeDetailSchema,
} from '@/app/api/_schemas/notice.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/notices',
  summary: 'Get notices',
  description:
    'Get paginated 告知 / ブログ list (mirrors GET /api/v1/admin/notices) with search, filters, sorting and totalAllItems',
  tags: ['Notices'],
  query: GetNoticesQueryParamsSchema,
  responses: [
    {
      status: 200,
      schema: GetNoticesResponseSchema,
      description: 'Notice list',
    },
    {
      status: 400,
      schema: ErrorResponseSchema,
      description: 'Bad request',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

registerRoute({
  method: 'post',
  path: '/crm/notices',
  summary: 'Create notice',
  description:
    'Create a 告知 / ブログ (mirrors POST /api/v1/admin/notices). Brand / store / channel axes are validated together (422); articleNo, createdAt, wordpressSync are server-set. targetStores / operator are mock-only seams (BF-01 / BF-02).',
  tags: ['Notices'],
  requestBody: {
    schema: CreateNoticeBodySchema,
    description: 'Notice create payload',
  },
  responses: [
    { status: 200, schema: NoticeDetailSchema, description: 'Notice created' },
    { status: 400, schema: ErrorResponseSchema, description: 'Validation error' },
    { status: 422, schema: ErrorResponseSchema, description: 'Business rule violation' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

const BRAND_LABELS: Record<NoticeBrandCode, string> = {
  Joyfit: 'JOYFIT',
  Joyfit24: 'JOYFIT24',
  JoyfitYoga: 'JOYFIT YOGA',
  JoyfitPlus: 'JOYFIT+',
  Fit365: 'FIT365',
};

const BRAND_SCOPE_RANK: Record<NoticeRecord['brandScope'], number> = {
  company: 0,
  brand: 1,
  store: 2,
};

/** Display status order: 公開中 → 公開予定 → 下書き → 非公開 → 削除済み. */
const STATUS_RANK: Record<NoticeRecord['publishStatus'] | 'deleted', number> = {
  published: 0,
  scheduled: 1,
  draft: 2,
  unpublished: 3,
  deleted: 4,
};

function isBrandCode(value: string): value is NoticeBrandCode {
  return value in BRAND_LABELS;
}

/** 対象 sort key: family label (or sub-brand labels) then store names; 全社 for company rows. */
function targetSortKey(row: NoticeRecord): string {
  if (row.brandScope === 'company' || row.brandCode === null) return '全社';
  const brandLabel = row.subBrandCodes
    ? row.subBrandCodes
        .filter(isBrandCode)
        .map((code) => BRAND_LABELS[code])
        .join('・')
    : BRAND_LABELS[row.brandCode];
  const storeNames = row.targetStores.map((store) => store.name).join('・');
  return storeNames ? `${brandLabel} ${storeNames}` : brandLabel;
}

/** JST calendar date (`YYYY-MM-DD`) of an ISO datetime. */
function toJstDate(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function compareRows(
  left: NoticeRecord,
  right: NoticeRecord,
  sort: GetNoticesQueryParams['sort'],
): number {
  switch (sort) {
    case 'title':
      return left.title.localeCompare(right.title, 'ja');
    case 'brandScope':
      return BRAND_SCOPE_RANK[left.brandScope] - BRAND_SCOPE_RANK[right.brandScope];
    case 'target':
      return targetSortKey(left).localeCompare(targetSortKey(right), 'ja');
    case 'publishStartAt':
      return (left.publishStartAt ?? '').localeCompare(right.publishStartAt ?? '');
    case 'publishEndAt':
      return (left.publishEndAt ?? '').localeCompare(right.publishEndAt ?? '');
    case 'status':
      return (
        STATUS_RANK[left.deletedAt ? 'deleted' : left.publishStatus] -
        STATUS_RANK[right.deletedAt ? 'deleted' : right.publishStatus]
      );
    default:
      return left.articleNo.localeCompare(right.articleNo);
  }
}

export async function GET(request: NextRequest) {
  try {
    const queryObj: Record<string, string | undefined> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const validationResult = GetNoticesQueryParamsSchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const query: GetNoticesQueryParams = validationResult.data;
    const {
      type,
      q,
      categoryId,
      brandCode,
      brandScope,
      storeId,
      channel,
      publishStatus,
      publishFrom,
      publishTo,
      publishEndFrom,
      publishEndTo,
      sort,
      order,
      page,
      limit,
    } = query;

    // Scope (type + storeId) — also the base of `totalAllItems` (gap B-11).
    let rows = db.notices.getList();
    if (type) {
      rows = rows.filter((row) => row.type === type);
    }
    if (storeId) {
      const store = db.notices.getStoreById(storeId);
      const target = { id: storeId, brandEnum: store?.brandEnum ?? null };
      rows = rows.filter((row) => reachesStore(row, target));
    }
    const totalAllItems = rows.length;

    if (q) {
      const normalizedSearch = q.toLowerCase().trim();
      // `includes` is a literal match, so `%` / `_` are not wildcards.
      rows = rows.filter((row) => row.title.toLowerCase().includes(normalizedSearch));
    }

    if (categoryId) {
      const wanted = categoryId === 'none' ? null : categoryId;
      rows = rows.filter((row) => row.categoryId === wanted);
    }

    if (brandCode) {
      rows = rows.filter((row) => matchesBrandFilter(row, brandCode));
    }

    if (brandScope) {
      rows = rows.filter((row) => row.brandScope === brandScope);
    }

    if (channel === 'web') {
      rows = rows.filter((row) => row.channelWeb);
    }
    if (channel === 'app') {
      rows = rows.filter((row) => row.channelApp);
    }

    if (publishStatus === 'deleted') {
      rows = rows.filter((row) => row.deletedAt !== null);
    } else if (publishStatus) {
      rows = rows.filter((row) => row.deletedAt === null && row.publishStatus === publishStatus);
    }

    if (publishFrom || publishTo) {
      rows = rows.filter((row) => {
        if (!row.publishStartAt) return false;
        const date = toJstDate(row.publishStartAt);
        if (publishFrom && date < publishFrom) return false;
        if (publishTo && date > publishTo) return false;
        return true;
      });
    }

    if (publishEndFrom || publishEndTo) {
      rows = rows.filter((row) => {
        if (!row.publishEndAt) return false;
        const date = toJstDate(row.publishEndAt);
        if (publishEndFrom && date < publishEndFrom) return false;
        if (publishEndTo && date > publishEndTo) return false;
        return true;
      });
    }

    rows = [...rows].sort((left, right) => {
      // 掲載終了日 (gap AL-02): rows without an end date stay last in both directions.
      if (
        sort === 'publishEndAt' &&
        (left.publishEndAt === null) !== (right.publishEndAt === null)
      ) {
        return left.publishEndAt === null ? 1 : -1;
      }
      const comparison =
        compareRows(left, right, sort) || left.articleNo.localeCompare(right.articleNo);
      return order === 'desc' ? -comparison : comparison;
    });

    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const startIndex = (page - 1) * limit;
    const items = rows
      .slice(startIndex, startIndex + limit)
      .map((row) =>
        enrichNotice(
          row,
          row.categoryId ? (db.articleCategories.getById(row.categoryId)?.name ?? null) : null,
        ),
      );

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
      totalAllItems,
    });
  } catch (error) {
    console.error('GET /crm/notices error:', error);
    return NextResponse.json({ error: '記事一覧の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = CreateNoticeBodySchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const input = validationResult.data;
    if (isNoticeBodyMissing(input.type, input.body)) {
      return NextResponse.json({ error: '本文を入力してください' }, { status: 422 });
    }
    const now = new Date();
    const nowIso = toJstIso(now);
    const operatorId = input.operator?.staffId ?? NOTICE_FALLBACK_OPERATOR_ID;
    const operatorName = input.operator?.name ?? NOTICE_FALLBACK_OPERATOR_NAME;
    const thumbnailS3Key = input.thumbnailS3Key ?? null;

    const draft: NoticeRecord = {
      id: crypto.randomUUID(),
      type: input.type,
      articleNo: db.notices.nextArticleNo(input.type, jstYear(now)),
      title: input.title,
      body: input.body,
      categoryId: input.categoryId ?? null,
      thumbnailS3Key,
      thumbnailUrl: noticeThumbnailUrl(thumbnailS3Key),
      brandScope: input.brandScope,
      brandCode: input.brandCode,
      subBrandCodes: input.subBrandCodes,
      storeScope: input.storeScope,
      targetStores: resolveTargetStores(input.targetStores, input.targetStoreIds),
      channelWeb: input.channelWeb,
      channelApp: input.channelApp,
      publishStatus: input.publishStatus,
      publishStartAt: input.publishStartAt ?? null,
      publishEndAt: input.publishEndAt ?? null,
      wordpressSync: null,
      deletedAt: null,
      createdBy: operatorId,
      updatedBy: operatorId,
      createdAt: nowIso,
      updatedAt: nowIso,
      recentSyncLogs: [],
      createdByName: operatorName,
      updatedByName: operatorName,
      // Reach figures come from notification sending (I-03), not from creating (gap AD-01).
      notificationSummary: null,
    };

    const record: NoticeRecord = { ...draft, ...deriveNoticePublishFields(draft, nowIso) };
    const ruleError = validateNoticeWrite(record, now);
    if (ruleError) {
      return NextResponse.json({ error: ruleError }, { status: 422 });
    }

    const created = db.notices.add(record);
    const categoryName = created.categoryId
      ? (db.articleCategories.getById(created.categoryId)?.name ?? null)
      : null;
    return NextResponse.json(enrichNoticeDetail(created, categoryName), { status: 200 });
  } catch (error) {
    console.error('POST /crm/notices error:', error);
    return NextResponse.json({ error: '記事の登録に失敗しました' }, { status: 500 });
  }
}
