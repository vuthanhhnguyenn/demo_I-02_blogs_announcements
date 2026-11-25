import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  GetEquipmentSummaryQuerySchema,
  type GetEquipmentSummaryResponse,
  GetEquipmentSummaryResponseSchema,
} from '@/app/api/_schemas/equipment.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/equipment/summary',
  summary: 'Get store equipment summary',
  description: 'Aggregate counts for the 店舗機器管理 tabs (connected equipment and controllers)',
  tags: ['Equipment'],
  query: GetEquipmentSummaryQuerySchema,
  responses: [
    {
      status: 200,
      schema: GetEquipmentSummaryResponseSchema,
      description: 'Store equipment summary counts',
    },
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

    const storeId = request.nextUrl.searchParams.get('storeId') ?? undefined;
    const inScope = storeId && storeId !== 'all' ? storeId : null;

    const summary: GetEquipmentSummaryResponse = {
      equipmentCount: db.equipment
        .getAll()
        .filter((item) => inScope === null || item.storeId === inScope).length,
      // Both badges follow the header store scope, as in the prototype.
      controllersCount: db.controllers
        .getAll()
        .filter((controller) => inScope === null || controller.storeId === inScope).length,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching equipment summary:', error);
    return NextResponse.json({ error: 'Failed to fetch equipment summary' }, { status: 500 });
  }
}
