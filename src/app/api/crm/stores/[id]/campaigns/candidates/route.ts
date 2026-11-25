import { NextRequest, NextResponse } from 'next/server';

import { getAllowedStoreIds, getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  GetStoreCampaignCandidatesQuerySchema,
  type GetStoreCampaignCandidatesResponse,
  GetStoreCampaignCandidatesResponseSchema,
} from '@/app/api/_schemas/store-campaign.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

import { listCandidateCampaigns } from '../_lib/store-campaign.util';

registerRoute({
  method: 'get',
  path: '/crm/stores/{id}/campaigns/candidates',
  summary: 'List campaigns not yet linked to a store',
  description:
    '紐づけシートの候補一覧。ブランド対象外・公開対象外・募集期間終了の候補も返す（画面側で' +
    '選択不可の理由を表示するため）。`keyword` はサーバー側で名称・IDに部分一致する' +
    '（`specs/027-store-detail/spec.md` FR-034）。',
  tags: ['Stores'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  query: GetStoreCampaignCandidatesQuerySchema,
  responses: [
    {
      status: 200,
      schema: GetStoreCampaignCandidatesResponseSchema,
      description: 'Candidate campaigns',
    },
    { status: 403, schema: ErrorResponseSchema, description: 'Forbidden' },
    { status: 404, schema: ErrorResponseSchema, description: 'Store not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await context.params;
    const allowedStoreIds = getAllowedStoreIds(authResult.user);
    if (allowedStoreIds !== null && !allowedStoreIds.includes(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const store = db.stores.getById(id);
    if (!store) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }

    const parsed = GetStoreCampaignCandidatesQuerySchema.safeParse({
      keyword: request.nextUrl.searchParams.get('keyword') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 },
      );
    }

    const response: GetStoreCampaignCandidatesResponse = {
      campaigns: listCandidateCampaigns(id, parsed.data.keyword),
      store_brand: store.brand,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing campaign candidates:', error);
    return NextResponse.json({ error: 'Failed to list campaign candidates' }, { status: 500 });
  }
}
