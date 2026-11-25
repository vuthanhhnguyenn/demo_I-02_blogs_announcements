import { NextRequest, NextResponse } from 'next/server';

import { getAllowedStoreIds, getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import {
  BulkChangeStoreTerritoryPayloadSchema,
  type BulkChangeStoreTerritoryResponse,
  BulkChangeStoreTerritoryResponseSchema,
  ErrorResponseSchema,
} from '@/app/api/_schemas/store.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'patch',
  path: '/crm/stores/bulk-territory',
  summary: 'Bulk change store territory',
  description:
    'Y-02 FR-001 バルクアクション「テリトリー変更」 / Y-15 FR-M005。選択した店舗の所属テリトリーを一括で変更する。' +
    '部分成功を許容し、変更できなかった店舗は `failed` で返す（成功分はロールバックしない）。' +
    '本機能では変更履歴（Y-02 FR-008）は記録しない。',
  tags: ['Stores'],
  requestBody: {
    schema: BulkChangeStoreTerritoryPayloadSchema,
    description: 'Bulk territory change payload',
  },
  responses: [
    {
      status: 200,
      schema: BulkChangeStoreTerritoryResponseSchema,
      description: 'Territory changed (possibly partially)',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 403, schema: ErrorResponseSchema, description: 'Forbidden' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function PATCH(request: NextRequest) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    // FR-024: the bulk territory change is a System / Headquarter action (Y-15 FR-M005)
    if (authResult.user.role !== 'System' && authResult.user.role !== 'Headquarter') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = BulkChangeStoreTerritoryPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { store_ids, territory_id } = validationResult.data;

    const destination = db.orgNodes.getTerritoryPath(territory_id);
    if (!destination) {
      return NextResponse.json({ error: 'テリトリーが見つかりません' }, { status: 400 });
    }
    if (!destination.territory.active) {
      return NextResponse.json({ error: '無効なテリトリーには変更できません' }, { status: 400 });
    }

    const allowedStoreIds = getAllowedStoreIds(authResult.user);
    const { updated, failed } = db.stores.changeTerritory(store_ids, territory_id, allowedStoreIds);

    const territoryName = destination.territory.name;
    const response: BulkChangeStoreTerritoryResponse = {
      message:
        failed.length === 0
          ? `${updated.length}件のテリトリーを変更しました`
          : `${updated.length}件を変更し、${failed.length}件が失敗しました`,
      updated_count: updated.length,
      updated_store_ids: updated.map((store) => store.id),
      failed,
      territory_name: territoryName,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error changing store territory:', error);
    return NextResponse.json({ error: 'Failed to change store territory' }, { status: 500 });
  }
}
