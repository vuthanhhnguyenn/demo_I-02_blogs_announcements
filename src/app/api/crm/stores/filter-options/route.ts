import { NextRequest, NextResponse } from 'next/server';

import { getAllowedStoreIds, getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import {
  type GetStoreFilterOptionsResponse,
  GetStoreFilterOptionsResponseSchema,
} from '@/app/api/_schemas/store.schema';
import { ErrorResponseSchema } from '@/app/api/_schemas/store.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';
import { PREFECTURES } from '@/constants/app.constants';

registerRoute({
  method: 'get',
  path: '/crm/stores/filter-options',
  summary: 'Get store list filter options',
  description:
    'Y-02 FR-001 詳細フィルターの選択肢。都道府県は権限内の店舗が実際に使っている値のみを北から南の順で、' +
    '運営企業は直営＋権限内店舗を運営している FC 企業のみを返す（選んで0件になる選択肢を作らない）。',
  tags: ['Stores'],
  responses: [
    {
      status: 200,
      schema: GetStoreFilterOptionsResponseSchema,
      description: 'Filter options',
    },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

/** Y-02 FR-001 operating-company filter: direct management is an option of its own, not an FC company */
const DIRECT_MANAGEMENT_OPTION = { id: 'direct', name: '直営' };

export async function GET(request: NextRequest) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const allowedStoreIds = getAllowedStoreIds(authResult.user);

    const scoped = db.stores
      .getList()
      .filter((store) => allowedStoreIds === null || allowedStoreIds.includes(store.id));

    // Derived from the whole permitted set, never from the current page, so the options do
    // not shift while the operator pages and no option can return zero rows (FR-012).
    const usedPrefectures = new Set(
      scoped.map((store) => store.prefecture).filter((value): value is string => Boolean(value)),
    );
    const prefectures = PREFECTURES.filter((name) => usedPrefectures.has(name));

    const companyNameById = new Map(
      db.franchiseCompanies.getList().map((company) => [company.id, company.display_name]),
    );
    const usedCompanyIds = new Set(
      scoped.map((store) => store.fc_company_id).filter((value): value is string => Boolean(value)),
    );
    const operating_companies = [
      ...(scoped.some((store) => !store.fc_company_id) ? [DIRECT_MANAGEMENT_OPTION] : []),
      ...[...usedCompanyIds].map((id) => ({ id, name: companyNameById.get(id) ?? id })),
    ];

    const response: GetStoreFilterOptionsResponse = { prefectures, operating_companies };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching store filter options:', error);
    return NextResponse.json({ error: 'Failed to fetch store filter options' }, { status: 500 });
  }
}
