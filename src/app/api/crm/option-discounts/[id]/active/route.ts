import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  ErrorResponseSchema,
  UpdateOptionDiscountActiveBodySchema,
  UpdateOptionDiscountActiveResponseSchema,
} from '@/app/api/_schemas/option-discount.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'patch',
  path: '/crm/option-discounts/{id}/active',
  summary: 'Activate or deactivate an option discount',
  description:
    'Toggle a set discount between 有効 and 無効. G-02 L206 defines no delete operation for set discounts, so retiring one is a deactivation.',
  tags: ['Options'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Option Discount ID',
      schema: { type: 'string' },
    },
  ],
  requestBody: {
    schema: UpdateOptionDiscountActiveBodySchema,
    description: 'セット割有効/無効切替リクエスト',
  },
  responses: [
    {
      status: 200,
      schema: UpdateOptionDiscountActiveResponseSchema,
      description: 'Status updated successfully',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Validation error' },
    { status: 404, schema: ErrorResponseSchema, description: 'Not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = UpdateOptionDiscountActiveBodySchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const updated = db.optionDiscount.updateStatus(id, validation.data.status);
    if (!updated) {
      return NextResponse.json({ error: 'セット割が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message:
          validation.data.status === 'active'
            ? 'セット割を有効化しました'
            : 'セット割を無効化しました',
        option_discount: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('PATCH /crm/option-discounts/[id]/active error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
