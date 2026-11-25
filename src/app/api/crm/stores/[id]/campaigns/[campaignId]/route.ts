import { NextRequest, NextResponse } from 'next/server';

import { getAllowedStoreIds, getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import { UnlinkStoreCampaignResponseSchema } from '@/app/api/_schemas/store-campaign.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

import { CAMPAIGN_LINK_ROLES } from '../_lib/store-campaign.util';

registerRoute({
  method: 'delete',
  path: '/crm/stores/{id}/campaigns/{campaignId}',
  summary: 'Unlink a campaign from a store',
  description:
    'キャンペーンの紐づけを解除する。解除後はこの店舗の入会申請で選択できなくなる。' +
    '権限は System / Headquarter / Staff（G-03 権限マトリクス）。',
  tags: ['Stores'],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    { name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } },
  ],
  responses: [
    { status: 200, schema: UnlinkStoreCampaignResponseSchema, description: 'Campaign unlinked' },
    { status: 403, schema: ErrorResponseSchema, description: 'Forbidden' },
    { status: 404, schema: ErrorResponseSchema, description: 'Link not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; campaignId: string }> },
) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    if (!CAMPAIGN_LINK_ROLES.includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, campaignId } = await context.params;
    const allowedStoreIds = getAllowedStoreIds(authResult.user);
    if (allowedStoreIds !== null && !allowedStoreIds.includes(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!db.stores.getById(id)) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }

    if (!db.storeCampaignLinks.unlink(id, campaignId)) {
      return NextResponse.json({ error: 'キャンペーンの紐づけが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ message: 'キャンペーンの紐づけを解除しました' });
  } catch (error) {
    console.error('Error unlinking store campaign:', error);
    return NextResponse.json({ error: 'Failed to unlink store campaign' }, { status: 500 });
  }
}
