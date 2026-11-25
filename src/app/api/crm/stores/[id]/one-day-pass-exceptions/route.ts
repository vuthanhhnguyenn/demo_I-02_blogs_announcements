import { NextRequest, NextResponse } from 'next/server';

import type { AuthenticatedUser } from '@/app/api/_lib/auth';
import { getAllowedStoreIds, getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  DeleteStoreOneDayPassExceptionsRequestSchema,
  MutateStoreOneDayPassExceptionsResponseSchema,
  UpsertStoreOneDayPassExceptionsRequestSchema,
} from '@/app/api/_schemas/store-one-day-pass.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

/**
 * Y-02 permission matrix, the "1DayPass price setting" row: allowed for System / Headquarter,
 * allowed for Staff on their own store, denied for Manager / Trainer / Observer.
 */
const ONE_DAY_PASS_EDIT_ROLES: readonly AuthenticatedUser['role'][] = [
  'System',
  'Headquarter',
  'Staff',
];

registerRoute({
  method: 'put',
  path: '/crm/stores/{id}/one-day-pass-exceptions',
  summary: 'Set 1DayPass prices for a set of dates',
  description:
    '選択した日付すべてに同じ価格・備考を適用する（既存設定は上書き）。BE設計は1日ずつの' +
    '`PUT …/one-day-pass-exceptions/{date}` だが、プロトタイプは複数日を1操作で適用するため' +
    '日付集合を受け取り、同じ upsert 意味論を各日に適用する。価格は ¥700〜¥1,800。',
  tags: ['Stores'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  requestBody: {
    schema: UpsertStoreOneDayPassExceptionsRequestSchema,
    description: 'Dates, price and note',
  },
  responses: [
    {
      status: 200,
      schema: MutateStoreOneDayPassExceptionsResponseSchema,
      description: 'Prices applied',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 403, schema: ErrorResponseSchema, description: 'Forbidden' },
    { status: 404, schema: ErrorResponseSchema, description: 'Store not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

registerRoute({
  method: 'delete',
  path: '/crm/stores/{id}/one-day-pass-exceptions',
  summary: 'Clear 1DayPass prices for a set of dates',
  description: '選択した日付の価格設定を解除する。以降その日は基準価格で販売される（冪等）。',
  tags: ['Stores'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  requestBody: {
    schema: DeleteStoreOneDayPassExceptionsRequestSchema,
    description: 'Dates to clear',
  },
  responses: [
    {
      status: 200,
      schema: MutateStoreOneDayPassExceptionsResponseSchema,
      description: 'Prices cleared',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 403, schema: ErrorResponseSchema, description: 'Forbidden' },
    { status: 404, schema: ErrorResponseSchema, description: 'Store not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

async function authorize(
  request: NextRequest,
  storeId: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const authResult = getAuthUserFromRequest(request);
  if (!authResult.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: authResult.error }, { status: authResult.status }),
    };
  }
  if (!ONE_DAY_PASS_EDIT_ROLES.includes(authResult.user.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const allowedStoreIds = getAllowedStoreIds(authResult.user);
  if (allowedStoreIds !== null && !allowedStoreIds.includes(storeId)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (!db.stores.getById(storeId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    const parsed = UpsertStoreOneDayPassExceptionsRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 },
      );
    }

    const exceptions = db.storeOneDayPassPrices.upsertMany(
      id,
      parsed.data.dates,
      parsed.data.price,
      parsed.data.note ?? null,
    );
    return NextResponse.json({ message: '1DayPass価格を設定しました', exceptions });
  } catch (error) {
    console.error('Error setting 1DayPass prices:', error);
    return NextResponse.json({ error: 'Failed to set 1DayPass prices' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const auth = await authorize(request, id);
    if (!auth.ok) return auth.response;

    const parsed = DeleteStoreOneDayPassExceptionsRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 },
      );
    }

    const exceptions = db.storeOneDayPassPrices.deleteMany(id, parsed.data.dates);
    return NextResponse.json({ message: '1DayPass価格の設定を解除しました', exceptions });
  } catch (error) {
    console.error('Error clearing 1DayPass prices:', error);
    return NextResponse.json({ error: 'Failed to clear 1DayPass prices' }, { status: 500 });
  }
}
