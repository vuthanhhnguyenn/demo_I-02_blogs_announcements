import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  DeleteMainContractResponseSchema,
  ErrorResponseSchema,
  GetMainContractDetailResponseSchema,
  type MainContractDetail,
  UpdateMainContractResponseSchema,
  UpsertMainContractBodySchema,
} from '@/app/api/_schemas/main-contract.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/main-contracts/{id}',
  summary: 'Get main contract detail',
  description: 'Get detailed information about a specific main contract master',
  tags: ['Main Contracts'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Main contract ID',
      schema: { type: 'string' },
    },
  ],
  responses: [
    {
      status: 200,
      schema: GetMainContractDetailResponseSchema,
      description: 'Main contract detail',
    },
    { status: 404, schema: ErrorResponseSchema, description: 'Not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

registerRoute({
  method: 'delete',
  path: '/crm/main-contracts/{id}',
  summary: 'Delete a main contract',
  description:
    'Logically delete a main contract master by ID. Only allowed when active_contracts = 0 and no derived master exists (G-01 FR-M006 / API-087 E-PLN-002・E-PLN-003).',
  tags: ['Main Contracts'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Main contract ID',
      schema: { type: 'string' },
    },
  ],
  responses: [
    { status: 200, schema: DeleteMainContractResponseSchema, description: 'Deleted successfully' },
    {
      status: 409,
      schema: ErrorResponseSchema,
      description: 'Deletion blocked by active contracts or derived masters',
    },
    { status: 404, schema: ErrorResponseSchema, description: 'Not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const detail = db.mainContracts.getById(id);
    if (!detail) {
      return NextResponse.json({ error: 'Main contract not found' }, { status: 404 });
    }
    return NextResponse.json({ main_contract: detail }, { status: 200 });
  } catch (error) {
    console.error('GET /crm/main-contracts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const detail = db.mainContracts.getById(id);
    if (!detail) {
      return NextResponse.json({ error: '主契約が見つかりません' }, { status: 404 });
    }

    // API-087 E-PLN-002: cannot delete while contract holders exist.
    if (detail.active_contracts > 0) {
      return NextResponse.json(
        {
          error: `契約者が ${detail.active_contracts.toLocaleString()} 名存在するため削除できません`,
        },
        { status: 409 },
      );
    }

    // API-087 E-PLN-003: cannot delete while derived masters exist.
    if (detail.child_contracts.length > 0) {
      return NextResponse.json(
        { error: `派生マスタが ${detail.child_contracts.length} 件存在するため削除できません` },
        { status: 409 },
      );
    }

    const deleted = db.mainContracts.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: '主契約が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ message: '主契約を削除しました' }, { status: 200 });
  } catch (error) {
    console.error('DELETE /crm/main-contracts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

registerRoute({
  method: 'patch',
  path: '/crm/main-contracts/{id}',
  summary: 'Update a main contract',
  description:
    'Update an existing main contract master by ID. Blocked while active contracts exist (G-01 FR-M004 / API-087 E-PLN-001).',
  tags: ['Main Contracts'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Main contract ID',
      schema: { type: 'string' },
    },
  ],
  requestBody: { schema: UpsertMainContractBodySchema, description: '主契約更新リクエスト' },
  responses: [
    { status: 200, schema: UpdateMainContractResponseSchema, description: 'Updated successfully' },
    { status: 400, schema: ErrorResponseSchema, description: 'Validation error' },
    { status: 404, schema: ErrorResponseSchema, description: 'Not found' },
    {
      status: 409,
      schema: ErrorResponseSchema,
      description: 'Edit blocked by active contracts',
    },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = UpsertMainContractBodySchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const existing = db.mainContracts.getById(id);
    if (!existing) {
      return NextResponse.json({ error: '主契約が見つかりません' }, { status: 404 });
    }

    const data = validation.data;

    // API-087 E-PLN-001 / G-01 FR-M004: a master with contract holders cannot be edited.
    if (existing.active_contracts > 0) {
      return NextResponse.json(
        {
          error: '契約者が存在するため編集できません。新規マスタを登録してください',
        },
        { status: 409 },
      );
    }

    // API-087 E-PLN-007: the target store may only be set for 特殊契約.
    if (data.contract_type !== 'special' && data.target_store_id) {
      return NextResponse.json(
        { error: '店舗は契約タイプが「特殊契約」の場合のみ指定できます' },
        { status: 400 },
      );
    }

    const parent = data.parent_contract_id
      ? db.mainContracts.getById(data.parent_contract_id)
      : undefined;
    const targetStore = data.target_store_id ? db.stores.getById(data.target_store_id) : undefined;
    const terms = data.terms_id ? db.terms.getById(data.terms_id, null) : undefined;

    const patch: Partial<MainContractDetail> = {
      name: data.name,
      old_code: data.old_code ?? null,
      contract_type: data.contract_type,
      brand: data.brand,
      status: data.status ?? existing.status,

      target_store_id: data.target_store_id ?? null,
      target_store_name: targetStore?.name ?? null,
      other_store_usage: data.other_store_usage ?? existing.other_store_usage,
      is_multi_usable: data.is_multi_usable ?? existing.is_multi_usable,
      is_changeable: data.is_changeable ?? existing.is_changeable,
      companion_benefit_enabled:
        data.companion_benefit_enabled ?? existing.companion_benefit_enabled,

      public_name: data.public_name ?? existing.public_name,
      public_description: data.public_description ?? existing.public_description,
      company: data.company ?? null,
      terms_id: data.terms_id ?? null,
      terms_name: terms ? `${terms.title}（${terms.version}）` : null,
      thumbnail_url: data.thumbnail_url ?? null,
      description: data.description ?? existing.description,
      memo: data.memo ?? null,

      price_including_tax: data.price_including_tax ?? existing.price_including_tax,
      // Nullable amounts are cleared, not kept, when the form sends them back empty.
      suspension_fee: data.suspension_fee ?? null,
      cancellation_fee: data.cancellation_fee ?? null,
      tax_rate: data.tax_rate ?? existing.tax_rate,
      accounting_code: data.accounting_code ?? existing.accounting_code,
      enrollment_fee: data.enrollment_fee ?? null,
      registration_fee: data.registration_fee ?? null,
      card_issue_fee: data.card_issue_fee ?? null,
      security_fee: data.security_fee ?? null,
      maintenance_fee: data.maintenance_fee ?? null,

      start_date: data.start_date ?? existing.start_date,
      monthly_limit: data.monthly_limit ?? null,
      usage_hours_by_day: data.usage_hours_by_day ?? existing.usage_hours_by_day,

      suspendable_months: data.suspendable_months ?? null,
      cancellable_months: data.cancellable_months ?? null,
      initial_payment_months: data.initial_payment_months ?? existing.initial_payment_months,
      same_day_cancellation: data.same_day_cancellation ?? existing.same_day_cancellation,

      age_restriction: data.age_restriction ?? existing.age_restriction,
      gender_restriction: data.gender_restriction ?? existing.gender_restriction,
      billing_enabled: data.billing_enabled ?? existing.billing_enabled,

      parent_contract_id: data.parent_contract_id ?? null,
      parent_contract_name: parent?.name ?? null,
    };

    const updated = db.mainContracts.update(id, patch);
    if (!updated) {
      return NextResponse.json({ error: '主契約が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(
      { message: '主契約を更新しました', main_contract: updated },
      { status: 200 },
    );
  } catch (error) {
    console.error('PATCH /crm/main-contracts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
