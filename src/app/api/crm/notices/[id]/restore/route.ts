import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import { NOTICE_FALLBACK_OPERATOR_NAME } from '@/app/api/_mock-db/seeds/notice.seed';
import { enrichNotice } from '@/app/api/_mock-db/tables/notice.table';
import { ErrorResponseSchema, NoticeListItemSchema } from '@/app/api/_schemas/notice.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'post',
  path: '/crm/notices/{id}/restore',
  summary: 'Restore deleted notice',
  description: 'Mock-only (gap B-06): clears deletedAt and sets publishStatus to unpublished.',
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
    {
      status: 200,
      schema: NoticeListItemSchema,
      description: 'Restored notice',
    },
    {
      status: 404,
      schema: ErrorResponseSchema,
      description: 'Notice not found or not deleted',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const row = db.notices.getById(id);
    if (!row || !row.deletedAt) {
      return NextResponse.json({ error: '記事が見つかりません' }, { status: 404 });
    }

    const restored =
      db.notices.update(id, {
        deletedAt: null,
        publishStatus: 'unpublished',
        updatedAt: new Date().toISOString(),
        updatedByName: NOTICE_FALLBACK_OPERATOR_NAME,
      }) ?? row;
    const categoryName = restored.categoryId
      ? (db.articleCategories.getById(restored.categoryId)?.name ?? null)
      : null;
    return NextResponse.json(enrichNotice(restored, categoryName), { status: 200 });
  } catch (error) {
    console.error('POST /crm/notices/[id]/restore error:', error);
    return NextResponse.json({ error: '記事の復元に失敗しました' }, { status: 500 });
  }
}
