import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  BulkUpdateEquipmentStatusRequestSchema,
  type BulkUpdateEquipmentStatusResponse,
  BulkUpdateEquipmentStatusResponseSchema,
} from '@/app/api/_schemas/equipment.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'patch',
  path: '/crm/equipment/bulk-status',
  summary: 'Bulk update equipment status',
  description:
    'Move up to 100 connected equipment records to a single status in one all-or-nothing operation (FR-010). An unknown id, or a device already holding the target status, rejects the whole batch rather than applying a partial sweep. Each written device gets its own status-history row.',
  tags: ['Equipment'],
  requestBody: { schema: BulkUpdateEquipmentStatusRequestSchema },
  responses: [
    {
      status: 200,
      schema: BulkUpdateEquipmentStatusResponseSchema,
      description: 'How many records were written and the status they now hold',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Invalid body' },
    { status: 404, schema: ErrorResponseSchema, description: 'One or more ids do not exist' },
    {
      status: 422,
      schema: ErrorResponseSchema,
      description: 'A no-op transition: at least one device already holds the target status',
    },
  ],
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = BulkUpdateEquipmentStatusRequestSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { changedNote, deviceIds, status } = validation.data;
    const result = db.equipment.bulkUpdateStatus(deviceIds, status, changedNote ?? null);

    if (!result.ok) {
      if (result.reason === 'not_found') {
        return NextResponse.json(
          { error: `Equipment not found: ${result.missingIds.join(', ')}` },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: `Equipment already in the target status: ${result.noOpIds.join(', ')}` },
        { status: 422 },
      );
    }

    const response: BulkUpdateEquipmentStatusResponse = { updated: result.updated, status };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error bulk updating equipment status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
