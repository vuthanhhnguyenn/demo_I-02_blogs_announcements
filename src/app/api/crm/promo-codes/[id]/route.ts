import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  PromoCodeErrorResponseSchema,
  UpdatePromoCodeBodySchema,
  UpdatePromoCodeResponseSchema,
} from '@/app/api/_schemas/promo-code.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

import { promoCodeErrors, toPromoCodeListItem } from '../_utils';

registerRoute({
  method: 'patch',
  path: '/crm/promo-codes/{id}',
  summary: 'Update a promotion code',
  description:
    'プロモーションコードの説明・有効期間・使用上限・適用店舗タイプを更新する。コード文字列は変更できない (V0: コード行の「編集」)',
  tags: ['PromoCodes'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Promotion code ID',
      schema: { type: 'string' },
    },
  ],
  requestBody: { schema: UpdatePromoCodeBodySchema, description: 'コード編集リクエスト' },
  responses: [
    { status: 200, schema: UpdatePromoCodeResponseSchema, description: 'Updated' },
    { status: 400, schema: PromoCodeErrorResponseSchema, description: 'Validation error' },
    { status: 403, schema: PromoCodeErrorResponseSchema, description: 'Scope not permitted' },
    { status: 404, schema: PromoCodeErrorResponseSchema, description: 'Not found' },
    { status: 500, schema: PromoCodeErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = UpdatePromoCodeBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return promoCodeErrors.validation(
        parsed.error.issues.map((issue) => issue.message).join(', '),
      );
    }

    const row = db.promoCodes.getById(id);
    if (!row) return promoCodeErrors.notFound();

    const data = parsed.data;

    const updated = db.promoCodes.update(id, {
      description: data.description ?? null,
      valid_from: data.validFrom,
      valid_to: data.validTo,
      max_uses: data.maxUses ?? null,
      scope_type: data.scopeType,
      issued_store_id: data.scopeType === 'issuer_store_only' ? (data.issuedStoreId ?? null) : null,
      updated_at: new Date().toISOString(),
    });
    if (!updated) return promoCodeErrors.notFound();

    return NextResponse.json(
      { message: 'プロモーションコードを更新しました', promoCode: toPromoCodeListItem(updated) },
      { status: 200 },
    );
  } catch (error) {
    console.error('PATCH /crm/promo-codes/[id] error:', error);
    return promoCodeErrors.internal('Failed to update promotion code');
  }
}
