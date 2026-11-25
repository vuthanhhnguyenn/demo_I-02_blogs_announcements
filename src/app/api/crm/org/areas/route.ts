import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import {
  type GetOrgAreasResponse,
  GetOrgAreasResponseSchema,
} from '@/app/api/_schemas/org-hierarchy.schema';
import { ErrorResponseSchema } from '@/app/api/_schemas/store.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/org/areas',
  summary: 'Get organisational areas with their territories',
  description:
    'Y-15 組織階層のエリアと配下テリトリー（無効ノードを含む・`active` で判別）。' +
    '店舗一覧のエリア→テリトリー2段カスケード、一括変更の変更先候補、階層パス表示をこの1本で賄う。',
  tags: ['Stores'],
  responses: [
    { status: 200, schema: GetOrgAreasResponseSchema, description: 'Areas with territories' },
    { status: 401, schema: ErrorResponseSchema, description: 'Unauthorized' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function GET(request: NextRequest) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const response: GetOrgAreasResponse = { areas: db.orgNodes.listAreas() };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching org areas:', error);
    return NextResponse.json({ error: 'Failed to fetch org areas' }, { status: 500 });
  }
}
