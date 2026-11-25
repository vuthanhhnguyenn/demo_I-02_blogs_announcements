import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import { NOTICE_FALLBACK_OPERATOR_NAME } from '@/app/api/_mock-db/seeds/notice.seed';
import { enrichNotice } from '@/app/api/_mock-db/tables/notice.table';
import type { NoticePublishStatus } from '@/app/api/_schemas/notice.schema';
import {
  ErrorResponseSchema,
  NoticeListItemSchema,
  PatchNoticePublishStatusBodySchema,
} from '@/app/api/_schemas/notice.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'patch',
  path: '/crm/notices/{id}/publish-status',
  summary: 'Change notice publish status',
  description:
    '公開にする / 非公開にする (mirrors PATCH /api/v1/admin/notices/{noticeId}/publish-status). Idempotent.',
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
    schema: PatchNoticePublishStatusBodySchema,
    description: 'Target publish status',
  },
  responses: [
    {
      status: 200,
      schema: NoticeListItemSchema,
      description: 'Updated notice',
    },
    {
      status: 400,
      schema: ErrorResponseSchema,
      description: 'Validation error',
    },
    {
      status: 404,
      schema: ErrorResponseSchema,
      description: 'Notice not found or deleted',
    },
    {
      status: 422,
      schema: ErrorResponseSchema,
      description: 'Invalid status transition',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

/** Allowed source statuses per target (data-model "State transitions"). */
const ALLOWED_FROM: Record<'published' | 'unpublished', NoticePublishStatus[]> = {
  published: ['draft', 'unpublished'],
  unpublished: ['published', 'scheduled'],
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validationResult = PatchNoticePublishStatusBodySchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const row = db.notices.getById(id);
    if (!row || row.deletedAt) {
      return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
    }

    const { publishStatus } = validationResult.data;
    let result = row;
    if (row.publishStatus !== publishStatus) {
      if (!ALLOWED_FROM[publishStatus].includes(row.publishStatus)) {
        return NextResponse.json(
          { error: 'この記事の公開ステータスは変更できません' },
          { status: 422 },
        );
      }
      const now = new Date().toISOString();
      result =
        db.notices.update(id, {
          publishStatus,
          publishStartAt:
            publishStatus === 'published' ? (row.publishStartAt ?? now) : row.publishStartAt,
          updatedAt: now,
          updatedByName: NOTICE_FALLBACK_OPERATOR_NAME,
        }) ?? row;
    }

    const categoryName = result.categoryId
      ? (db.articleCategories.getById(result.categoryId)?.name ?? null)
      : null;
    return NextResponse.json(enrichNotice(result, categoryName), { status: 200 });
  } catch (error) {
    console.error('PATCH /crm/notices/[id]/publish-status error:', error);
    return NextResponse.json({ error: '公開ステータスの変更に失敗しました' }, { status: 500 });
  }
}
