import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  NOTICE_FALLBACK_OPERATOR_ID,
  NOTICE_FALLBACK_OPERATOR_NAME,
} from '@/app/api/_mock-db/seeds/notice.seed';
import {
  deriveNoticePublishFields,
  enrichNoticeDetail,
  isNoticeBodyMissing,
  noticeThumbnailUrl,
  reachesStore,
  resolveTargetStores,
  toJstIso,
  validateNoticeWrite,
} from '@/app/api/_mock-db/tables/notice.table';
import type { NoticeRecord } from '@/app/api/_mock-db/types/notices.type';
import {
  ErrorResponseSchema,
  type GetNoticeDetailQueryParams,
  GetNoticeDetailQueryParamsSchema,
  NoticeDetailSchema,
  UpdateNoticeBodySchema,
} from '@/app/api/_schemas/notice.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/notices/{id}',
  summary: 'Get notice detail',
  description:
    'Get 告知 / ブログ detail (mirrors GET /api/v1/admin/notices/{noticeId}). Deleted rows are returned with deletedAt (gap BD-01); storeId is a mock-only seam (gap BD-05).',
  tags: ['Notices'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Notice ID',
      schema: { type: 'string' },
    },
  ],
  query: GetNoticeDetailQueryParamsSchema,
  responses: [
    { status: 200, schema: NoticeDetailSchema, description: 'Notice detail' },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    {
      status: 404,
      schema: ErrorResponseSchema,
      description: 'Notice not found or not reaching storeId',
    },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

registerRoute({
  method: 'patch',
  path: '/crm/notices/{id}',
  summary: 'Update notice',
  description:
    'Update a 告知 / ブログ (mirrors PATCH /api/v1/admin/notices/{noticeId}). Only sent fields change (publishStatus omitted = unchanged); the merged row is validated (422). expectedUpdatedAt mismatch → 409. targetStores / operator are mock-only seams (BF-01 / BF-02).',
  tags: ['Notices'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Notice ID',
      schema: { type: 'string' },
    },
  ],
  requestBody: {
    schema: UpdateNoticeBodySchema,
    description: 'Notice update payload',
  },
  responses: [
    { status: 200, schema: NoticeDetailSchema, description: 'Notice updated' },
    { status: 400, schema: ErrorResponseSchema, description: 'Validation error' },
    {
      status: 404,
      schema: ErrorResponseSchema,
      description: 'Notice not found or deleted',
    },
    {
      status: 409,
      schema: ErrorResponseSchema,
      description: 'expectedUpdatedAt does not match (updated by another user)',
    },
    { status: 422, schema: ErrorResponseSchema, description: 'Business rule violation' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

registerRoute({
  method: 'delete',
  path: '/crm/notices/{id}',
  summary: 'Delete notice',
  description: 'Soft delete (sets deletedAt). Mirrors DELETE /api/v1/admin/notices/{noticeId}.',
  tags: ['Notices'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Notice ID',
      schema: { type: 'string' },
    },
  ],
  responses: [
    { status: 204, description: 'Notice deleted' },
    {
      status: 404,
      schema: ErrorResponseSchema,
      description: 'Notice not found or already deleted',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const queryObj: Record<string, string | undefined> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });
    const validationResult = GetNoticeDetailQueryParamsSchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }
    const { storeId }: GetNoticeDetailQueryParams = validationResult.data;

    const row = db.notices.getById(id);
    if (!row) {
      return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
    }
    if (storeId) {
      // Same rule as the list: an unknown store id is reached only by company / naming store rows.
      const store = db.notices.getStoreById(storeId);
      if (!reachesStore(row, { id: storeId, brandEnum: store?.brandEnum ?? null })) {
        return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
      }
    }

    const categoryName = row.categoryId
      ? (db.articleCategories.getById(row.categoryId)?.name ?? null)
      : null;
    return NextResponse.json(enrichNoticeDetail(row, categoryName), { status: 200 });
  } catch (error) {
    console.error('GET /crm/notices/[id] error:', error);
    return NextResponse.json({ error: '記事詳細の取得に失敗しました' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validationResult = UpdateNoticeBodySchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const row = db.notices.getById(id);
    if (!row || row.deletedAt) {
      return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
    }

    const input = validationResult.data;
    if (input.expectedUpdatedAt !== undefined && input.expectedUpdatedAt !== row.updatedAt) {
      return NextResponse.json(
        { error: '他のユーザーが記事を更新しました。最新の内容を読み込んでください。' },
        { status: 409 },
      );
    }

    if (input.body !== undefined && isNoticeBodyMissing(row.type, input.body)) {
      return NextResponse.json({ error: '本文を入力してください' }, { status: 422 });
    }

    const now = new Date();
    const nowIso = toJstIso(now);
    const storesSent = input.targetStores !== undefined || input.targetStoreIds !== undefined;
    const storeScopeChanged = input.storeScope !== undefined && input.storeScope !== row.storeScope;
    // Switching to 公開 without a start publishes now (the old scheduled start is dropped).
    const publishNow =
      input.publishStatus === 'published' &&
      row.publishStatus !== 'published' &&
      input.publishStartAt === undefined;
    // Only a new key rebuilds the URL; resending the stored key keeps the stored URL as is.
    const thumbnailChanged =
      input.thumbnailS3Key !== undefined && input.thumbnailS3Key !== row.thumbnailS3Key;
    const thumbnailS3Key = thumbnailChanged ? (input.thumbnailS3Key ?? null) : row.thumbnailS3Key;

    const merged: NoticeRecord = {
      ...row,
      title: input.title ?? row.title,
      body: input.body ?? row.body,
      categoryId: input.categoryId !== undefined ? input.categoryId : row.categoryId,
      thumbnailS3Key,
      thumbnailUrl: thumbnailChanged ? noticeThumbnailUrl(thumbnailS3Key) : row.thumbnailUrl,
      brandScope: input.brandScope ?? row.brandScope,
      brandCode: input.brandCode !== undefined ? input.brandCode : row.brandCode,
      subBrandCodes: input.subBrandCodes !== undefined ? input.subBrandCodes : row.subBrandCodes,
      storeScope: input.storeScope ?? row.storeScope,
      targetStores: storesSent
        ? resolveTargetStores(input.targetStores, input.targetStoreIds)
        : storeScopeChanged
          ? []
          : row.targetStores,
      channelWeb: input.channelWeb ?? row.channelWeb,
      channelApp: input.channelApp ?? row.channelApp,
      publishStatus: input.publishStatus ?? row.publishStatus,
      publishStartAt: publishNow
        ? null
        : input.publishStartAt !== undefined
          ? input.publishStartAt
          : row.publishStartAt,
      publishEndAt: input.publishEndAt !== undefined ? input.publishEndAt : row.publishEndAt,
      updatedBy: input.operator?.staffId ?? NOTICE_FALLBACK_OPERATOR_ID,
      updatedByName: input.operator?.name ?? NOTICE_FALLBACK_OPERATOR_NAME,
      updatedAt: nowIso,
    };
    const record: NoticeRecord = { ...merged, ...deriveNoticePublishFields(merged, nowIso) };

    const ruleError = validateNoticeWrite(
      record,
      now,
      input.publishStatus !== undefined || input.publishStartAt !== undefined,
    );
    if (ruleError) {
      return NextResponse.json({ error: ruleError }, { status: 422 });
    }

    const updated = db.notices.update(id, record) ?? record;
    const categoryName = updated.categoryId
      ? (db.articleCategories.getById(updated.categoryId)?.name ?? null)
      : null;
    return NextResponse.json(enrichNoticeDetail(updated, categoryName), { status: 200 });
  } catch (error) {
    console.error('PATCH /crm/notices/[id] error:', error);
    return NextResponse.json({ error: '記事の更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const row = db.notices.getById(id);
    if (!row || row.deletedAt) {
      return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
    }

    const now = new Date().toISOString();
    db.notices.update(id, {
      deletedAt: now,
      updatedAt: now,
      updatedByName: NOTICE_FALLBACK_OPERATOR_NAME,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /crm/notices/[id] error:', error);
    return NextResponse.json({ error: '記事の削除に失敗しました' }, { status: 500 });
  }
}
