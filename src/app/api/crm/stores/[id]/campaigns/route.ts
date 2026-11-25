import { NextRequest, NextResponse } from 'next/server';

import {
  formatOperatorName,
  getAllowedStoreIds,
  getAuthUserFromRequest,
} from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  type GetStoreCampaignsResponse,
  GetStoreCampaignsResponseSchema,
  LinkStoreCampaignsRequestSchema,
  LinkStoreCampaignsResponseSchema,
} from '@/app/api/_schemas/store-campaign.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

import { CAMPAIGN_LINK_ROLES, toStoreCampaign } from './_lib/store-campaign.util';

registerRoute({
  method: 'get',
  path: '/crm/stores/{id}/campaigns',
  summary: 'List campaigns linked to a store',
  description:
    'G-03「店舗利用キャンペーンの選択」— 店舗に紐づくキャンペーン。' +
    '期間終了・受付停止・公開対象外の行も自動では消さない（解除は明示操作のみ）。',
  tags: ['Stores'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  responses: [
    { status: 200, schema: GetStoreCampaignsResponseSchema, description: 'Linked campaigns' },
    { status: 403, schema: ErrorResponseSchema, description: 'Forbidden' },
    { status: 404, schema: ErrorResponseSchema, description: 'Store not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

registerRoute({
  method: 'post',
  path: '/crm/stores/{id}/campaigns',
  summary: 'Link campaigns to a store',
  description:
    'キャンペーンを店舗に紐づける。プロトタイプは複数同時に紐づけるため配列で受け取る' +
    '（BE設計は1件ずつの `POST …/campaigns/{campaignId}`）。権限は System / Headquarter / Staff。',
  tags: ['Stores'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  requestBody: { schema: LinkStoreCampaignsRequestSchema, description: 'Campaign ids to link' },
  responses: [
    { status: 200, schema: LinkStoreCampaignsResponseSchema, description: 'Campaigns linked' },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
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
    if (!db.stores.getById(id)) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }

    const links = db.storeCampaignLinks.getByStoreId(id);
    const response: GetStoreCampaignsResponse = {
      campaigns: links.flatMap((link) => {
        const campaign = db.campaigns.getById(link.campaign_id);
        return campaign ? [toStoreCampaign(campaign, id, link.linked_at)] : [];
      }),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing store campaigns:', error);
    return NextResponse.json({ error: 'Failed to list store campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    if (!CAMPAIGN_LINK_ROLES.includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    const parsed = LinkStoreCampaignsRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 },
      );
    }

    // G-03: the link requires the campaign to belong to the store's brand (BE: E-CMP-010).
    for (const campaignId of parsed.data.campaign_ids) {
      const campaign = db.campaigns.getById(campaignId);
      if (!campaign) {
        return NextResponse.json({ error: 'キャンペーンが見つかりません' }, { status: 404 });
      }
      if (campaign.brand_enum !== store.brand) {
        return NextResponse.json(
          { error: `『${campaign.name}』は自店舗のブランド対象外です` },
          { status: 400 },
        );
      }
    }

    const links = db.storeCampaignLinks.linkMany(
      id,
      parsed.data.campaign_ids,
      formatOperatorName(authResult.user),
    );

    return NextResponse.json({
      message: 'キャンペーンを紐づけました',
      campaigns: links.flatMap((link) => {
        const campaign = db.campaigns.getById(link.campaign_id);
        return campaign ? [toStoreCampaign(campaign, id, link.linked_at)] : [];
      }),
    });
  } catch (error) {
    console.error('Error linking store campaigns:', error);
    return NextResponse.json({ error: 'Failed to link store campaigns' }, { status: 500 });
  }
}
