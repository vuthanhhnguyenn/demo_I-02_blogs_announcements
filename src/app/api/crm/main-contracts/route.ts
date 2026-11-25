import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  CreateMainContractResponseSchema,
  ErrorResponseSchema,
  type GetMainContractsQuery,
  GetMainContractsQuerySchema,
  type GetMainContractsResponse,
  GetMainContractsResponseSchema,
  type MainContractDetail,
  type MainContractListItem,
  UpsertMainContractBodySchema,
} from '@/app/api/_schemas/main-contract.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';
import { format } from 'date-fns';

registerRoute({
  method: 'get',
  path: '/crm/main-contracts',
  summary: 'Get main contract masters',
  description: 'Get paginated list of main contract masters (G-01)',
  tags: ['Main Contracts'],
  query: GetMainContractsQuerySchema,
  responses: [
    { status: 200, schema: GetMainContractsResponseSchema, description: 'Main contract list' },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryObj: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const validationResult = GetMainContractsQuerySchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const query: GetMainContractsQuery = validationResult.data;
    const {
      page,
      limit,
      search,
      contract_type,
      brand,
      status,
      store_id,
      companion_benefit_enabled,
      sort_by,
      sort_order,
    } = query;

    const all: MainContractListItem[] = db.mainContracts.getList();
    let filtered: MainContractListItem[] = [...all];

    if (search) {
      const keyword = search.toLowerCase().trim();
      filtered = filtered.filter((item) => item.name.toLowerCase().includes(keyword));
    }
    if (contract_type) {
      filtered = filtered.filter((item) => item.contract_type === contract_type);
    }
    if (brand) {
      filtered = filtered.filter((item) => item.brand === brand);
    }
    if (status) {
      filtered = filtered.filter((item) => item.status === status);
    }
    if (store_id) {
      // Masters with no store limit (anything but 特殊契約) sell at every store, so always match.
      filtered = filtered.filter((item) => {
        const detail = db.mainContracts.getById(item.id);
        const targetStoreId = detail?.target_store_id ?? null;
        return targetStoreId === null || targetStoreId === store_id;
      });
    }
    if (companion_benefit_enabled !== undefined) {
      filtered = filtered.filter(
        (item) => item.companion_benefit_enabled === companion_benefit_enabled,
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[sort_by] ?? '';
      const bVal = b[sort_by] ?? '';
      const comparison =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), 'ja');
      return sort_order === 'asc' ? comparison : -comparison;
    });

    const total = filtered.length;
    const total_pages = Math.ceil(total / limit) || 0;
    const start = (page - 1) * limit;
    const main_contracts = filtered.slice(start, start + limit);

    const response: GetMainContractsResponse = {
      main_contracts,
      pagination: { page, limit, total, total_pages, total_all_items: all.length },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching main contracts:', error);
    return NextResponse.json({ error: 'Failed to fetch main contracts' }, { status: 500 });
  }
}

registerRoute({
  method: 'post',
  path: '/crm/main-contracts',
  summary: 'Create a main contract',
  description: 'Create a new main contract master (G-01)',
  tags: ['Main Contracts'],
  requestBody: { schema: UpsertMainContractBodySchema, description: '主契約作成リクエスト' },
  responses: [
    { status: 201, schema: CreateMainContractResponseSchema, description: 'Created' },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = UpsertMainContractBodySchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = validationResult.data;

    // API-087 E-PLN-007: the target store may only be set for 特殊契約.
    if (data.contract_type !== 'special' && data.target_store_id) {
      return NextResponse.json(
        { error: '店舗は契約タイプが「特殊契約」の場合のみ指定できます' },
        { status: 400 },
      );
    }

    // G-01 FR-M002: 主契約ID is auto-numbered; it is never taken from the request.
    const existingIds = new Set(db.mainContracts.getList().map((row) => row.id));
    let sequence = existingIds.size + 1;
    let newId = `MC${String(sequence).padStart(3, '0')}`;
    while (existingIds.has(newId)) {
      sequence += 1;
      newId = `MC${String(sequence).padStart(3, '0')}`;
    }

    const now = new Date().toISOString();
    const parent = data.parent_contract_id
      ? db.mainContracts.getById(data.parent_contract_id)
      : undefined;
    const targetStore = data.target_store_id ? db.stores.getById(data.target_store_id) : undefined;
    const terms = data.terms_id ? db.terms.getById(data.terms_id, null) : undefined;

    const newContract: MainContractDetail = {
      id: newId,
      name: data.name,
      old_code: data.old_code ?? null,
      contract_type: data.contract_type,
      brand: data.brand,
      status: data.status ?? 'active',

      target_store_id: data.target_store_id ?? null,
      target_store_name: targetStore?.name ?? null,
      other_store_usage: data.other_store_usage ?? 'none',
      is_multi_usable: data.is_multi_usable ?? false,
      is_changeable: data.is_changeable ?? true,
      companion_benefit_enabled: data.companion_benefit_enabled ?? false,
      previous_contract: null,

      public_name: data.public_name ?? data.name,
      public_description: data.public_description ?? '',
      company: data.company ?? null,
      terms_id: data.terms_id ?? null,
      terms_name: terms ? `${terms.title}（${terms.version}）` : null,
      thumbnail_url: data.thumbnail_url ?? null,
      description: data.description ?? '',
      memo: data.memo ?? null,

      price_including_tax: data.price_including_tax ?? 0,
      suspension_fee: data.suspension_fee ?? null,
      cancellation_fee: data.cancellation_fee ?? null,
      tax_rate: data.tax_rate ?? 10,
      accounting_code: data.accounting_code ?? '',
      enrollment_fee: data.enrollment_fee ?? null,
      registration_fee: data.registration_fee ?? null,
      card_issue_fee: data.card_issue_fee ?? null,
      security_fee: data.security_fee ?? null,
      maintenance_fee: data.maintenance_fee ?? null,

      // Take the local date; `toISOString().slice(0,10)` is UTC and can be a day off.
      start_date: data.start_date ?? format(new Date(), 'yyyy-MM-dd'),
      monthly_limit: data.monthly_limit ?? null,
      usage_hours_by_day: data.usage_hours_by_day ?? [],

      suspendable_months: data.suspendable_months ?? null,
      cancellable_months: data.cancellable_months ?? null,
      initial_payment_months: data.initial_payment_months ?? 1,
      same_day_cancellation: data.same_day_cancellation ?? false,

      age_restriction: data.age_restriction ?? '',
      gender_restriction: data.gender_restriction ?? 'none',
      billing_enabled: data.billing_enabled ?? false,

      is_copyable: true,
      copied_from_id: data.copied_from_id ?? null,

      parent_contract_id: data.parent_contract_id ?? null,
      parent_contract_name: parent?.name ?? null,
      child_contracts: [],
      active_contracts: 0,

      created_at: now,
      updated_at: now,
    };

    db.mainContracts.add(newContract);

    return NextResponse.json(
      { message: '主契約を作成しました', main_contract: newContract },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating main contract:', error);
    return NextResponse.json({ error: 'Failed to create main contract' }, { status: 500 });
  }
}
