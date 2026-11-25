import type { AdminApplicationControllerListData } from '@/lib/api-real/types.gen';

type ListQuery = NonNullable<AdminApplicationControllerListData['query']>;

/** 入会経路 (C-01 FR-M001 / FR-M009) — モバイル / 手動 / 紹介経由, served as `enrollmentRoute`. */
export type EnrollmentRoute = NonNullable<ListQuery['enrollmentRoute']>[number];

/**
 * The 入会経路 filter → list query (API v1.19): `enrollmentRoute` — the BE maps it to the
 * source / linked member-referral code itself.
 */
export function toRouteQuery(route: EnrollmentRoute | ''): Pick<ListQuery, 'enrollmentRoute'> {
  return route ? { enrollmentRoute: [route] } : {};
}
