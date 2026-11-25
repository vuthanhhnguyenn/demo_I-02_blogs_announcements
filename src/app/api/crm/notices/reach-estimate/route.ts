import { NextRequest, NextResponse } from 'next/server';

import { NOTICE_STORE_DIRECTORY } from '@/app/api/_mock-db/seeds/notice.seed';
import type { NoticeBrandCode } from '@/app/api/_schemas/notice.schema';
import {
  ErrorResponseSchema,
  GetNoticeReachEstimateQueryParamsSchema,
  NoticeReachEstimateResponseSchema,
} from '@/app/api/_schemas/notice.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/notices/reach-estimate',
  summary: 'Get notice reach estimate',
  description:
    'Mock-only (gap AF-02, specs/announcement-form): estimated member count for a お知らせ delivery target. Store counts come from the real store master, not from here.',
  tags: ['Notices'],
  query: GetNoticeReachEstimateQueryParamsSchema,
  responses: [
    { status: 200, schema: NoticeReachEstimateResponseSchema, description: 'Reach estimate' },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

/** 全社配信 estimate (prototype announcement-form.tsx L211). */
const COMPANY_MEMBER_COUNT = 42_580;

/**
 * Fixed per-brand figures. `Joyfit` is the standard sub-brand; the form sends all four JOYFIT
 * sub-brands for JOYFIT全体, so the family is their sum.
 */
const BRAND_MEMBER_COUNTS: Record<NoticeBrandCode, number> = {
  Joyfit: 8_420,
  Joyfit24: 6_310,
  JoyfitYoga: 2_140,
  JoyfitPlus: 1_980,
  Fit365: 9_870,
};

/** Members of one store: fixed for the notice store directory, a default for any other id. */
const DEFAULT_STORE_MEMBER_COUNT = 1_240;
const STORE_MEMBER_COUNTS: Record<string, number> = Object.fromEntries(
  NOTICE_STORE_DIRECTORY.map((store, index) => [store.id, 860 + index * 215]),
);

export async function GET(request: NextRequest) {
  try {
    const queryObj: Record<string, string | string[]> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      const current = queryObj[key];
      queryObj[key] = current === undefined ? value : [current, value].flat();
    });

    const validationResult = GetNoticeReachEstimateQueryParamsSchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { brandScope, brandCodes = [], storeIds = [] } = validationResult.data;

    let estimatedMemberCount = 0;
    if (brandScope === 'company') {
      estimatedMemberCount = COMPANY_MEMBER_COUNT;
    } else if (brandScope === 'brand') {
      estimatedMemberCount = brandCodes.reduce((sum, code) => sum + BRAND_MEMBER_COUNTS[code], 0);
    } else {
      estimatedMemberCount = storeIds.reduce(
        (sum, id) => sum + (STORE_MEMBER_COUNTS[id] ?? DEFAULT_STORE_MEMBER_COUNT),
        0,
      );
    }

    return NextResponse.json({ estimatedMemberCount });
  } catch (error) {
    console.error('GET /crm/notices/reach-estimate error:', error);
    return NextResponse.json({ error: '対象人数の取得に失敗しました' }, { status: 500 });
  }
}
