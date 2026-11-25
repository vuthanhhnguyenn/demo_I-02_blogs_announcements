import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  type CreateEquipmentResponse,
  CreateEquipmentResponseSchema,
  type GetEquipmentQuery,
  GetEquipmentQuerySchema,
  type GetEquipmentResponse,
  GetEquipmentResponseSchema,
  UpsertEquipmentRequestSchema,
} from '@/app/api/_schemas/equipment.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

import { filterAndSortEquipment } from './_lib/equipment-query';

registerRoute({
  method: 'get',
  path: '/crm/equipment',
  summary: 'Get equipment list',
  description: 'Get paginated list of connected equipment with filtering and sorting',
  tags: ['Equipment'],
  query: GetEquipmentQuerySchema,
  responses: [
    {
      status: 200,
      schema: GetEquipmentResponseSchema,
      description: 'List of connected equipment',
    },
  ],
});

registerRoute({
  method: 'post',
  path: '/crm/equipment',
  summary: 'Create connected equipment',
  description: 'Register a new connected equipment record (FR-003)',
  tags: ['Equipment'],
  requestBody: {
    schema: UpsertEquipmentRequestSchema,
    description: 'Connected equipment create payload',
  },
  responses: [
    {
      status: 201,
      schema: CreateEquipmentResponseSchema,
      description: 'Connected equipment created',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Validation failure' },
    { status: 401, schema: ErrorResponseSchema, description: 'Unauthorized' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function GET(request: NextRequest) {
  try {
    const queryObj: Record<string, string | undefined> = {};

    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const validationResult = GetEquipmentQuerySchema.safeParse(queryObj);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validationResult.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const query: GetEquipmentQuery = validationResult.data;
    const { limit, page } = query;

    const scoped = filterAndSortEquipment(db.equipment.getAll(), {
      ...query,
      q: undefined,
      deviceType: undefined,
      status: undefined,
    });
    const items = filterAndSortEquipment(db.equipment.getAll(), query);

    const totalItems = items.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;

    const response: GetEquipmentResponse = {
      items: items.slice(startIndex, startIndex + limit),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        totalAllItems: scoped.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const validationResult = UpsertEquipmentRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const equipment = db.equipment.create(validationResult.data);
    const response: CreateEquipmentResponse = { equipment };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating equipment:', error);
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 });
  }
}
