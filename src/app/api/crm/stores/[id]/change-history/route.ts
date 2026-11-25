import { NextRequest, NextResponse } from 'next/server';

import type { AuthenticatedUser } from '@/app/api/_lib/auth';
import { getAllowedStoreIds, getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import {
  ErrorResponseSchema,
  GetStoreChangeHistoryQuerySchema,
  type GetStoreChangeHistoryResponse,
  GetStoreChangeHistoryResponseSchema,
} from '@/app/api/_schemas/store.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

/**
 * Y-02 FR-008 is viewable by System / Headquarter / Manager only. Staff / Trainer / Observer
 * are refused, as the BE design does (BE: `E-AUTH-103`) — `specs/027-store-detail/spec.md` FR-083.
 */
const CHANGE_HISTORY_VIEW_ROLES: readonly AuthenticatedUser['role'][] = [
  'System',
  'Headquarter',
  'Manager',
];

registerRoute({
  method: 'get',
  path: '/crm/stores/{id}/change-history',
  summary: 'Get store change history',
  description:
    'Y-02 FR-008 店舗変更履歴（新しい順）。シード済みの参照専用データで、作成・更新・削除は' +
    '行わない（`specs/027-store-detail/spec.md` FR-081）。各行は変更項目・変更前・変更後を' +
    '解決済みの差分として持つ（同 FR-082）。参照は System / Headquarter / Manager のみ。',
  tags: ['Stores'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
  query: GetStoreChangeHistoryQuerySchema,
  responses: [
    { status: 200, schema: GetStoreChangeHistoryResponseSchema, description: 'Change history' },
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

    if (!CHANGE_HISTORY_VIEW_ROLES.includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const allowedStoreIds = getAllowedStoreIds(authResult.user);
    if (allowedStoreIds !== null && !allowedStoreIds.includes(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!db.stores.getById(id)) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }

    const queryObj: Record<string, string | undefined> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });
    const validationResult = GetStoreChangeHistoryQuerySchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { page, limit } = validationResult.data;
    const all = db.storeChangeHistory.listByStoreId(id);
    const total = all.length;
    const start = (page - 1) * limit;

    const response: GetStoreChangeHistoryResponse = {
      items: all.slice(start, start + limit),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) || 0 },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching store change history:', error);
    return NextResponse.json({ error: 'Failed to fetch store change history' }, { status: 500 });
  }
}
