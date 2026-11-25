import { NextRequest, NextResponse } from 'next/server';

import { getAllowedStoreIds, getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  type GetStoreOneDayPassPriceResponse,
  GetStoreOneDayPassPriceResponseSchema,
  ONE_DAY_PASS_MAX_PRICE,
  ONE_DAY_PASS_MIN_PRICE,
} from '@/app/api/_schemas/store-one-day-pass.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

/** The 1Day-use plan master, used as the base price fallback when a store has no default. */
const ONE_DAY_PLAN_MASTER_ID = 'MC007';

registerRoute({
  method: 'get',
  path: '/crm/stores/{id}/one-day-pass-price',
  summary: 'Get 1DayPass base price and per-date prices',
  description:
    'Y-02 FR-003「1DayPass 価格設定」。`base_price` は店舗自身の既定価格で、未設定なら' +
    '1Day利用マスタの価格にフォールバックする（画面は表示のみ・設定はしない）。' +
    '`min_price` / `max_price` は Phase 1 のシステム定数。',
  tags: ['Stores'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  responses: [
    { status: 200, schema: GetStoreOneDayPassPriceResponseSchema, description: '1DayPass price' },
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

    const planMaster = db.mainContracts.getList().find((row) => row.id === ONE_DAY_PLAN_MASTER_ID);
    const response: GetStoreOneDayPassPriceResponse = {
      base_price: store.option_pass_price || (planMaster?.price_including_tax ?? 0),
      min_price: ONE_DAY_PASS_MIN_PRICE,
      max_price: ONE_DAY_PASS_MAX_PRICE,
      exceptions: db.storeOneDayPassPrices.listByStoreId(id),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting 1DayPass price:', error);
    return NextResponse.json({ error: 'Failed to get 1DayPass price' }, { status: 500 });
  }
}
