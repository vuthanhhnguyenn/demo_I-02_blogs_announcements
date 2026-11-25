import { NextRequest, NextResponse } from 'next/server';

import {
  type AuthenticatedUser,
  getAllowedStoreIds,
  getAuthUserFromRequest,
} from '@/app/api/_lib/auth';
import { db } from '@/app/api/_mock-db';
import {
  ErrorResponseSchema,
  type GetStoreByIdResponse,
  GetStoreByIdResponseSchema,
  type UpdateStorePayload,
  UpdateStorePayloadSchema,
  UpdateStoreResponseSchema,
} from '@/app/api/_schemas/store.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

import { deriveStoreStatus, resolveOperatingCompanyName } from '../route';

/** Y-02 permission matrix L197 "edit basic info (all fields)": System / Headquarter only */
const STORE_FULL_EDIT_ROLES: readonly AuthenticatedUser['role'][] = ['System', 'Headquarter'];

/**
 * The three fields a Staff user may write on the store record — the client's whitelist of
 * 2026-08-24 (QA #205 §1, recovered 2026-09-04), narrower than the earlier reading of Y-02
 * permission matrix L198 / L205: `specs/028-store-form/spec.md` FR-083, FR-086, FR-088.
 *
 * 店舗名（カナ）left the set with that answer. What the matrix grants Staff beyond these three —
 * the weekly hours and closure days, the store photos and the floor map, the gate-stop window —
 * is written through its own endpoint, not this one: photos and floor map have no control on the
 * form at all (spec 028 FR-051), and the weekly set travels in `PATCH …/business-hours`.
 */
const STAFF_EDITABLE_FIELDS = [
  'name',
  'address',
  'phone',
] as const satisfies readonly (keyof UpdateStorePayload)[];

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

registerRoute({
  method: 'get',
  path: '/crm/stores/{id}',
  summary: 'Get store detail',
  description: 'Get store detail by id',
  tags: ['Stores'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Store ID',
      schema: { type: 'string' },
    },
  ],
  responses: [
    { status: 200, schema: GetStoreByIdResponseSchema, description: 'Store detail' },
    { status: 404, schema: ErrorResponseSchema, description: 'Store not found' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

registerRoute({
  method: 'patch',
  path: '/crm/stores/{id}',
  summary: 'Update store detail',
  description:
    'Y-02 FR-002 店舗基本情報の編集。System / Headquarter は全項目、Staff は所属店舗の' +
    '店舗名・住所・電話番号のみ（顧客回答 2026-08-24）。限定外のフィールドを 1 つでも含む Staff の' +
    'リクエストは部分適用せず 403 で拒否する。営業時間は本エンドポイントではなく' +
    '`PATCH /crm/stores/{id}/business-hours` で更新する。' +
    'ステータスはフォームから受け取らず、閉店日から派生させる（Y-02 FR-007）。',
  tags: ['Stores'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Store ID',
      schema: { type: 'string' },
    },
  ],
  requestBody: {
    schema: UpdateStorePayloadSchema,
    description: 'Store update payload — 未指定フィールドは変更しない',
  },
  responses: [
    { status: 200, schema: UpdateStoreResponseSchema, description: 'Store updated' },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 401, schema: ErrorResponseSchema, description: 'Unauthorized' },
    {
      status: 403,
      schema: ErrorResponseSchema,
      description: 'Role not permitted, or a field outside the Staff-editable set was sent',
    },
    { status: 404, schema: ErrorResponseSchema, description: 'Store not found' },
    { status: 409, schema: ErrorResponseSchema, description: 'Duplicate club code' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = getAuthUserFromRequest(_request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;

    const allowedStoreIds = getAllowedStoreIds(authResult.user);
    if (allowedStoreIds !== null && !allowedStoreIds.includes(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const store = db.stores.getById(id);
    if (!store) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }

    // Y-02 FR-002: the upper hierarchy is derived from the territory, so the detail response
    // carries the resolved path the screen renders under the territory name.
    const path = db.orgNodes.getTerritoryPath(store.territory_id);
    const response: GetStoreByIdResponse = {
      store,
      territory_path: path
        ? {
            territory_id: path.territory.id,
            territory_name: path.territory.name,
            area_name: path.area.name,
            block_name: path.block.name,
            headquarters_name: path.headquarters.name,
          }
        : null,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting store detail:', error);
    return NextResponse.json({ error: 'Failed to get store detail' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const isFullEditor = STORE_FULL_EDIT_ROLES.includes(user.role);
    // Y-02 L198: only Staff get the limited set; Manager / Trainer / Observer get nothing.
    const isLimitedEditor = user.role === 'Staff';
    if (!isFullEditor && !isLimitedEditor) {
      return NextResponse.json({ error: '店舗情報を編集する権限がありません' }, { status: 403 });
    }

    // Staff are limited to the store they belong to (FR-081)
    const allowedStoreIds = getAllowedStoreIds(user);
    if (allowedStoreIds !== null && !allowedStoreIds.includes(id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = UpdateStorePayloadSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const payload = validationResult.data;

    // FR-088: the rule the UI shows is enforced here too, so a hand-crafted request cannot
    // rewrite a head-office-only field. The whole write is refused rather than partly applied.
    if (!isFullEditor) {
      const forbidden = Object.keys(payload).filter(
        (key) => !STAFF_EDITABLE_FIELDS.includes(key as (typeof STAFF_EDITABLE_FIELDS)[number]),
      );
      if (forbidden.length > 0) {
        return NextResponse.json(
          {
            error: `この項目の変更には本部権限が必要です: ${forbidden.join(', ')}`,
          },
          { status: 403 },
        );
      }
    }

    const existing = db.stores.getById(id);
    if (!existing) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }

    // Y-02 FR-002 requires the store code to be unique — the store's own current code is
    // excluded from the check (API-083: 409 E-STR-002)
    if (payload.club_code !== undefined) {
      const duplicated = db.stores
        .getList()
        .some((store) => store.id !== id && store.club_code === payload.club_code);
      if (duplicated) {
        return NextResponse.json(
          { error: 'この店舗コードは既に使用されています' },
          { status: 409 },
        );
      }
    }

    const operator = user.staff_id ?? user.id;
    const patch = omitUndefined({
      club_code: payload.club_code,
      name: payload.name,
      name_kana: payload.name_kana,
      brand: payload.brand,
      territory_id: payload.territory_id,
      fc_company_id: payload.fc_company_id,
      operating_company_name:
        payload.fc_company_id !== undefined
          ? resolveOperatingCompanyName(payload.fc_company_id)
          : undefined,
      postal_code: payload.postal_code,
      prefecture: payload.prefecture,
      address: payload.address,
      phone: payload.phone,
      fax: payload.fax,
      receipt_date: payload.receipt_date,
      preopen_date: payload.preopen_date,
      grand_open_date: payload.grand_open_date,
      closing_date: payload.closing_date,
      gender_restriction: payload.gender_restriction,
      memo: payload.memo,
      // Y-02 FR-007: derived, never submitted. Recomputed whenever the closure date moves.
      status:
        payload.closing_date !== undefined
          ? deriveStoreStatus(payload.closing_date ?? null)
          : undefined,
      updated_by: operator,
    });
    const updated = db.stores.updateById(id, patch);

    if (!updated) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }

    // FR-045a: the weekly set is replaced only when the form actually sent it, so a save that
    // touched nothing about the hours cannot overwrite hours changed on the detail screen.
    if (payload.default_hours) {
      db.businessHours.upsert(id, {
        default_hours: payload.default_hours,
        updated_by: operator,
      });
    }

    return NextResponse.json({
      message: '店舗の変更を保存しました',
      store: updated,
    });
  } catch (error) {
    console.error('Error updating store detail:', error);
    return NextResponse.json({ error: 'Failed to update store detail' }, { status: 500 });
  }
}
