'use client';

import { useEffect, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Lock, Map as MapIcon } from 'lucide-react';

import { DataStateBoundary, Empty } from '@/components/common/data-state-boundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  adminLockerControllerListLockersInfiniteOptions,
  adminStoreControllerGetDetailsOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LockerListItemDto, LockerListResponseDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { LOCKER_MAP_SHAPE_LABELS, LockerMarker } from '../../../../_components/locker-marker';
import { StoreFloorMap } from '../../../../_components/store-floor-map';
import { canEditStore } from '../../../../_utils/can-edit-store.util';
import { isStoreForbiddenError } from '../../../../_utils/store-api.util';

/** `limit` is capped at 100 by the API; a store with more cabinets is read page by page */
const LOCKER_PAGE_SIZE = 100;

type Props = {
  storeId: string;
  storeName: string;
};

/** A 403 is a permission answer, not a network failure — no retry, and copy that says so */
const FORBIDDEN_DESCRIPTION = 'この店舗の店舗マップを閲覧する権限がありません。';

/** A cabinet the map can draw: `mapX` / `mapY` are written and read as a pair */
type PlacedLocker = LockerListItemDto & { mapX: number; mapY: number };

function isPlaced(locker: LockerListItemDto): locker is PlacedLocker {
  return locker.mapX !== null && locker.mapY !== null;
}

function symbolOf(locker: LockerListItemDto): string {
  return locker.locationCode ?? '?';
}

/**
 * Tab 5 — 店舗マップ (Y-02 FR-006 / Y-02-05, store-detail FR-110–FR-114): the last saved floor
 * map, read-only. The image is the store CMS row's `gymMapUrl` (self-signed, no header needed). Editing happens on the store-map-setup screen this card links to. Ported from
 * the prototype's `store-detail.tsx` L2620-L2689 (entry and roles L532-L539).
 *
 * The edit entry follows the Y-02 matrix, not V0's `STORE_MAP_EDITABLE_ROLES`: System /
 * Headquarter on any store, Staff on their own store only (`canEditStore`, FR-114 / Q9).
 */
export function StoreMapTab({ storeId, storeName }: Readonly<Props>) {
  const router = useRouter();
  const { user } = useAuthUser();
  const canEditStoreMap = canEditStore(user, storeId);

  const detailsQuery = useQuery({
    ...adminStoreControllerGetDetailsOptions({ path: { id: storeId } }),
  });
  const floorImageUrl = detailsQuery.data?.gymMapUrl ?? null;
  const hasImage = Boolean(floorImageUrl);

  // Same read as the setup screen (`store-map-setup.tsx`) so both count the same cabinets:
  // the store's active cabinets, every page. Only the image branch shows counts or markers,
  // so nothing is fetched while there is no image to draw on.
  const lockersQuery = useInfiniteQuery({
    ...adminLockerControllerListLockersInfiniteOptions({
      query: {
        storeId,
        isActive: true,
        limit: LOCKER_PAGE_SIZE,
        sort: 'locationCode',
        order: 'asc',
      },
    }),
    initialPageParam: 1,
    getNextPageParam: ({ pagination }: LockerListResponseDto) =>
      pagination.page < pagination.totalPages ? pagination.page + 1 : undefined,
    enabled: hasImage,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = lockersQuery;
  // Read every page before counting: a half-read list would miscount 未配置 / 配置済み
  // A failed page stops the chain — re-requesting it on every settle would loop
  const { isFetchNextPageError } = lockersQuery;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const lockerPages = lockersQuery.data?.pages;
  const lockers = useMemo(
    () =>
      lockerPages && !hasNextPage
        ? lockerPages
            .flatMap((page) => page.items)
            .filter((locker) => locker.isActive)
            .sort((a, b) => symbolOf(a).localeCompare(symbolOf(b)))
        : undefined,
    [lockerPages, hasNextPage],
  );
  const placed = useMemo(() => (lockers ?? []).filter(isPlaced), [lockers]);
  const unplacedCount = (lockers?.length ?? 0) - placed.length;

  const openStoreMapSetup = () => router.push(navigate('/stores/[id]/map', storeId));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">店舗マップ</CardTitle>
        {/* Counts sit under the title (L2625-L2626); shown once the whole list is read */}
        {floorImageUrl && lockers && (
          <CardDescription>
            <div className="flex items-center gap-2 text-xs">
              <span>配置済み {placed.length}台</span>
              <span aria-hidden>・</span>
              {unplacedCount > 0 ? (
                <Badge
                  variant="outline"
                  className="bg-warning/15 text-warning border-warning/20 text-xs font-medium"
                >
                  未配置 {unplacedCount}台
                </Badge>
              ) : (
                <span>未配置 0台</span>
              )}
            </div>
          </CardDescription>
        )}
        {canEditStoreMap ? (
          <CardAction>
            <Button variant="outline" size="sm" onClick={openStoreMapSetup}>
              <MapIcon />
              店舗マップ設定
            </Button>
          </CardAction>
        ) : (
          <CardAction className="text-muted-foreground flex items-center gap-1 text-xs">
            <Lock className="size-3" />
            閲覧のみ
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {detailsQuery.isLoading || detailsQuery.isError ? (
          <DataStateBoundary
            isLoading={detailsQuery.isLoading}
            isError={detailsQuery.isError}
            isEmpty={false}
            {...(isStoreForbiddenError(detailsQuery.error)
              ? { errorTitle: 'フロア図を表示できません', errorDescription: FORBIDDEN_DESCRIPTION }
              : {
                  onRetry: () => void detailsQuery.refetch(),
                  errorTitle: 'フロア図の取得に失敗しました',
                })}
          />
        ) : floorImageUrl ? (
          <DataStateBoundary
            isLoading={!lockers && !lockersQuery.isError}
            isError={lockersQuery.isError}
            isEmpty={false}
            {...(isStoreForbiddenError(lockersQuery.error)
              ? {
                  errorTitle: 'ロッカー情報を表示できません',
                  errorDescription: FORBIDDEN_DESCRIPTION,
                }
              : {
                  onRetry: () => void lockersQuery.refetch(),
                  errorTitle: 'ロッカー情報の取得に失敗しました',
                })}
          >
            {/* Fits under the page header, notice, tabs and card header (L2657-L2661) */}
            <StoreFloorMap
              imageUrl={floorImageUrl}
              alt={`${storeName}のフロア図`}
              imageClassName="max-h-[calc(100svh-432px)]"
            >
              {/* Unplaced cabinets are not drawn (FR-112); markers are tooltip-only */}
              {placed.map((locker) => (
                <LockerMarker
                  key={locker.id}
                  lockerId={locker.id}
                  symbol={symbolOf(locker)}
                  name={locker.locationName || symbolOf(locker)}
                  shapeLabel={LOCKER_MAP_SHAPE_LABELS[locker.shapeType]}
                  x={locker.mapX}
                  y={locker.mapY}
                  readOnly
                />
              ))}
            </StoreFloorMap>
          </DataStateBoundary>
        ) : (
          <Empty
            variant="empty"
            icon={MapIcon}
            title="フロア図が登録されていません"
            action={
              canEditStoreMap ? (
                <Button variant="outline" onClick={openStoreMapSetup}>
                  店舗マップ設定で登録する
                </Button>
              ) : undefined
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
