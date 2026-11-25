import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  type GetControllerDevicesQuery,
  GetControllerDevicesQuerySchema,
  type GetControllerDevicesResponse,
  GetControllerDevicesResponseSchema,
} from '@/app/api/_schemas/controller.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/controllers/{id}/devices',
  summary: 'Get connected equipment for a controller',
  description:
    'Get the connected equipment wired to a contact-control device, in 接点番号 order (FR-007). Paginated like the backend design doc (API-104 §4.2).',
  tags: ['Controllers'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Contact-control device ID',
    },
  ],
  query: GetControllerDevicesQuerySchema,
  responses: [
    {
      status: 200,
      schema: GetControllerDevicesResponseSchema,
      description: 'Connected equipment list',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Validation failure' },
    { status: 401, schema: ErrorResponseSchema, description: 'Unauthorized' },
    { status: 404, schema: ErrorResponseSchema, description: 'Controller not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    if (!db.controllers.getById(id)) {
      return NextResponse.json({ error: 'Controller not found' }, { status: 404 });
    }

    const queryObj: Record<string, string | undefined> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const validationResult = GetControllerDevicesQuerySchema.safeParse(queryObj);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const query: GetControllerDevicesQuery = validationResult.data;
    const response: GetControllerDevicesResponse = db.controllers.listConnectedDevices(id, query);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching controller devices:', error);
    return NextResponse.json({ error: 'Failed to fetch controller devices' }, { status: 500 });
  }
}
