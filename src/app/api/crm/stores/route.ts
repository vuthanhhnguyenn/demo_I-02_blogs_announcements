import { NextRequest, NextResponse } from 'next/server';

import {
  type AuthenticatedUser,
  getAllowedStoreIds,
  getAuthUserFromRequest,
} from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import {
  CreateStorePayloadSchema,
  CreateStoreResponseSchema,
  ErrorResponseSchema,
  type GetStoresQuery,
  GetStoresQuerySchema,
  type GetStoresResponse,
  GetStoresResponseSchema,
  type Store,
  type StoreListItem,
} from '@/app/api/_schemas/store.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';
import { formatISODateLocal } from '@/utils/date.util';

registerRoute({
  method: 'get',
  path: '/crm/stores',
  summary: 'Get stores list',
  description:
    'Y-02 FR-001 店舗マスタ一覧。キーワード・6フィルター・ソート・ページングをすべてサーバー側で、' +
    '呼び出し元の権限内店舗（System/Headquarter=全件, Manager=所轄店舗, Staff/Trainer/Observer=所属店舗）に対して適用する。',
  tags: ['Stores'],
  query: GetStoresQuerySchema,
  responses: [
    { status: 200, schema: GetStoresResponseSchema, description: 'List of stores' },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

registerRoute({
  method: 'post',
  path: '/crm/stores',
  summary: 'Create store',
  description:
    'Y-02 FR-002 店舗新規登録。権限は System / Headquarter のみ（権限マトリクス L196「店舗登録」）。' +
    '曜日別デフォルト営業時間を同梱で受け取り、1リクエストで登録を完結させる（顧客回答 2026-08-24 / QA #202）。' +
    'ステータスはフォームから受け取らない（閉店日から派生・Y-02 FR-007）。',
  tags: ['Stores'],
  requestBody: {
    schema: CreateStorePayloadSchema,
    description: 'Store create payload',
  },
  responses: [
    { status: 200, schema: CreateStoreResponseSchema, description: 'Store created successfully' },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 401, schema: ErrorResponseSchema, description: 'Unauthorized' },
    { status: 403, schema: ErrorResponseSchema, description: 'Role not permitted to register' },
    { status: 409, schema: ErrorResponseSchema, description: 'Duplicate club code' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

/** Directly-managed stores — the API-083 design uses this literal instead of a boolean */
const DIRECT_MANAGEMENT_FILTER = 'direct';

/** Y-02 permission matrix L196, the store-registration row */
const STORE_REGISTER_ROLES: readonly AuthenticatedUser['role'][] = ['System', 'Headquarter'];

/** API-083 resolves `fcCompanyName` server-side; directly managed when there is no FC company. */
export function resolveOperatingCompanyName(fcCompanyId: string | null): string | undefined {
  if (!fcCompanyId) return undefined;
  return db.franchiseCompanies.getById(fcCompanyId)?.display_name;
}

/**
 * Y-02 FR-007: once the closure date has passed, the store status switches to closed on its own.
 * The form has no status control, so the status is derived from the closure date on every write.
 */
export function deriveStoreStatus(closingDate: string | null): 'operating' | 'closed' {
  if (!closingDate) return 'operating';
  const today = formatISODateLocal(new Date());
  return closingDate <= today ? 'closed' : 'operating';
}

/** Resolves the Y-15 territory / area names the list column and the keyword search need */
function toListItem(store: Store): StoreListItem {
  const path = db.orgNodes.getTerritoryPath(store.territory_id);
  return {
    ...store,
    territory_name: path?.territory.name ?? null,
    area_name: path?.area.name ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const allowedStoreIds = getAllowedStoreIds(authResult.user);

    const searchParams = request.nextUrl.searchParams;
    const queryObj: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const validationResult = GetStoresQuerySchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const query: GetStoresQuery = validationResult.data;
    const {
      page,
      limit,
      search,
      brand,
      prefecture,
      fc_company_id,
      area_id,
      territory_id,
      status: statusFilter,
      sort_by,
      sort_order = 'asc',
      include_total_all,
    } = query;

    // FR-009: every row and every count is computed inside the caller's permitted scope.
    // An empty scope is an empty list, not a 403 — the screen renders its empty state.
    const scoped = db.stores
      .getList()
      .filter((store) => allowedStoreIds === null || allowedStoreIds.includes(store.id));

    let filtered: StoreListItem[] = scoped.map(toListItem);

    if (search) {
      const q = search.toLowerCase().trim();
      // Y-02 FR-001: keyword matches store name, club code and territory name
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.club_code ?? '').toLowerCase().includes(q) ||
          (s.territory_name ?? '').toLowerCase().includes(q),
      );
    }

    if (brand) {
      filtered = filtered.filter((s) => s.brand === brand);
    }
    if (prefecture) {
      filtered = filtered.filter((s) => s.prefecture === prefecture);
    }
    if (fc_company_id) {
      filtered = filtered.filter((s) =>
        fc_company_id === DIRECT_MANAGEMENT_FILTER
          ? !s.fc_company_id
          : s.fc_company_id === fc_company_id,
      );
    }
    if (area_id) {
      const areaName = db.orgNodes.getById(area_id)?.name ?? null;
      filtered = filtered.filter((s) => s.area_name === areaName);
    }
    if (territory_id) {
      filtered = filtered.filter((s) => s.territory_id === territory_id);
    }
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Y-02 FR-001: only the club code and the store name are sortable on this screen;
    // an absent sort leaves the master's own store-id order, which is what the screen shows first.
    const sortKey: keyof StoreListItem = sort_by ?? 'store_id';
    filtered.sort((a, b) => {
      const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), 'ja');
      return sort_order === 'asc' ? cmp : -cmp;
    });

    const total = filtered.length;
    const total_pages = Math.ceil(total / limit) || 0;
    // FR-023: a page index beyond the result set clamps to the last available page rather
    // than serving an empty table (a filter change can shrink the result under the URL's page).
    const safePage = total_pages > 0 ? Math.min(page, total_pages) : 1;
    const start = (safePage - 1) * limit;
    const stores = filtered.slice(start, start + limit);

    const response: GetStoresResponse = {
      stores,
      pagination: {
        page: safePage,
        limit,
        total,
        total_pages,
        ...(include_total_all ? { totalAllItems: scoped.length } : {}),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    // Y-02 permission matrix L196, store registration: System / Headquarter only. Enforced here as well as
    // in the UI so a hand-crafted request cannot register a store (spec 028 FR-080, FR-088).
    if (!STORE_REGISTER_ROLES.includes(authResult.user.role)) {
      return NextResponse.json({ error: '店舗を登録する権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = CreateStorePayloadSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const payload = validationResult.data;

    // Y-02 FR-002: the store code is the business code — required and unique. API-083 answers 409 E-STR-002
    const duplicated = db.stores.getList().some((store) => store.club_code === payload.club_code);
    if (duplicated) {
      return NextResponse.json({ error: 'この店舗コードは既に使用されています' }, { status: 409 });
    }

    const fcCompanyId = payload.fc_company_id ?? null;
    const created = db.stores.create({
      club_code: payload.club_code,
      name: payload.name,
      name_kana: payload.name_kana ?? null,
      brand: payload.brand,
      territory_id: payload.territory_id,
      fc_company_id: fcCompanyId,
      // API-083 resolves the display name from the id; the mock does the same so the list
      // column and the detail screen never look the company up themselves.
      operating_company_name: resolveOperatingCompanyName(fcCompanyId),
      // Y-02 FR-007: the form never chooses a status. A store with a closure date already in
      // the past starts out closed; anything else starts out operating.
      status: deriveStoreStatus(payload.closing_date ?? null),
      postal_code: payload.postal_code,
      prefecture: payload.prefecture,
      address: payload.address,
      phone: payload.phone,
      fax: payload.fax ?? null,
      receipt_date: payload.receipt_date ?? null,
      preopen_date: payload.preopen_date ?? null,
      grand_open_date: payload.grand_open_date ?? null,
      closing_date: payload.closing_date ?? null,
      gender_restriction: payload.gender_restriction,
      memo: payload.memo ?? null,
      manager_staff_id: null,
      main_contract_id: null,
      main_contract_status: null,
      option_pass_price: 0,
      mutual_use_enabled: false,
      mutual_use_type: 'none',
      locker_map_id: null,
      asset_id: null,
      created_by: authResult.user.staff_id ?? authResult.user.id,
      updated_by: authResult.user.staff_id ?? authResult.user.id,
    });

    // QA #202: registration is one request, so the weekly set is stored here rather than
    // leaving the screen to follow up with a business-hours call.
    if (payload.default_hours) {
      db.businessHours.upsert(created.id, {
        default_hours: payload.default_hours,
        updated_by: authResult.user.staff_id ?? authResult.user.id,
      });
    }

    return NextResponse.json({
      message: '店舗を登録しました',
      store: created,
    });
  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}
