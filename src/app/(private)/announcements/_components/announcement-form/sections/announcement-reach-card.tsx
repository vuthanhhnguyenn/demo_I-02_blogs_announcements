'use client';
// Client component: React Query calls that follow the target chosen in the form.
import {
  ANNOUNCEMENT_FORM_BRAND_CODES,
  ANNOUNCEMENT_REACH_ESTIMATE_COPY as COPY,
} from '@/app/(private)/announcements/_constants/announcement-form.constants';
import type { AnnouncementFormStore } from '@/app/(private)/announcements/_schemas/announcement-form.schema';
import type { BlogFormBrandId } from '@/app/(private)/blogs/_types/blog.type';
import type { NoticeBrandScope } from '@/app/(private)/blogs/_types/notice.type';
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

import { adminStoreControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { getCrmNoticesReachEstimateOptions } from '@/lib/api/@tanstack/react-query.gen';

/** Store master filter of each brand checkbox (JOYFIT全体 / FIT365 = the whole family). */
const BRAND_STORE_FILTER: Record<
  BlogFormBrandId,
  { brandGroup: 'JOYFIT' | 'FIT365' } | { brandEnum: Exclude<BlogFormBrandId, 'joyfitAll'> }
> = {
  joyfitAll: { brandGroup: 'JOYFIT' },
  Joyfit: { brandEnum: 'Joyfit' },
  Joyfit24: { brandEnum: 'Joyfit24' },
  JoyfitYoga: { brandEnum: 'JoyfitYoga' },
  JoyfitPlus: { brandEnum: 'JoyfitPlus' },
  Fit365: { brandGroup: 'FIT365' },
};

/** Shown while a count is loading. */
const LOADING_TEXT = '—';

/** Only the count is read: one row per request keeps the store master calls light. */
const COUNT_ONLY = { limit: 1 } as const;

interface AnnouncementReachCardProps {
  scope: NoticeBrandScope;
  brands: readonly BlogFormBrandId[];
  stores: readonly AnnouncementFormStore[];
}

/**
 * 対象（推計） card (prototype announcement-form.tsx L203-L213, L441-L458; spec FR-011). Store counts
 * come from the real store master (the store selector's source); the member estimate is mock-only
 * (gap AF-02). Nothing is requested while no brand / store is chosen.
 */
export function AnnouncementReachCard({
  scope,
  brands,
  stores,
}: Readonly<AnnouncementReachCardProps>) {
  const hasTarget =
    scope === 'company' || (scope === 'brand' ? brands.length > 0 : stores.length > 0);

  const { data: allStores } = useQuery({
    ...adminStoreControllerListOptions({ query: COUNT_ONLY }),
    enabled: scope !== 'brand' && hasTarget,
  });
  const totalStoreCount = allStores?.pagination.totalItems;

  const brandCounts = useQueries({
    queries: (scope === 'brand' ? brands : []).map((brand) => ({
      ...adminStoreControllerListOptions({
        query: { ...COUNT_ONLY, ...BRAND_STORE_FILTER[brand] },
      }),
    })),
  });
  // Unknown until every selected brand's count is in (no partial sums while loading).
  const brandStoreCount = brandCounts.every((result) => result.data)
    ? brandCounts.reduce((sum, result) => sum + (result.data?.pagination.totalItems ?? 0), 0)
    : undefined;

  const { data: estimate } = useQuery({
    ...getCrmNoticesReachEstimateOptions({
      query: {
        brandScope: scope,
        brandCodes:
          scope === 'brand'
            ? [...new Set(brands.flatMap((brand) => ANNOUNCEMENT_FORM_BRAND_CODES[brand]))]
            : undefined,
        storeIds: scope === 'store' ? stores.map((store) => store.id) : undefined,
      },
    }),
    enabled: hasTarget,
    placeholderData: keepPreviousData,
  });
  // No target → 0名; a target whose estimate is still loading → "—" (never a misleading 0).
  const memberText = hasTarget
    ? estimate
      ? estimate.estimatedMemberCount.toLocaleString('ja-JP')
      : LOADING_TEXT
    : '0';

  const storeText = (() => {
    if (scope === 'brand') {
      if (!hasTarget) return COPY.noBrand;
      return brandStoreCount === undefined ? LOADING_TEXT : COPY.brandStores(brandStoreCount);
    }
    if (scope === 'store' && !hasTarget) return COPY.noStore;
    if (totalStoreCount === undefined) return LOADING_TEXT;
    return scope === 'company'
      ? COPY.allStores(totalStoreCount)
      : COPY.someStores(stores.length, totalStoreCount);
  })();

  return (
    <div className="bg-muted/30 flex max-w-[400px] items-center gap-3 rounded-lg border p-4">
      <Users className="text-muted-foreground size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-xs">{COPY.label}</p>
        <p className="text-base font-bold">
          {memberText}
          {memberText !== LOADING_TEXT && COPY.memberUnit}
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="text-muted-foreground text-xs">{storeText}</p>
      </div>
    </div>
  );
}
