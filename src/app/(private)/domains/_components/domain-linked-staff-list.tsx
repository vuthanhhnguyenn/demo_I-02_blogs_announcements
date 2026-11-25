'use client';

import type { RefObject } from 'react';
import { useMemo } from 'react';

import {
  STAFF_STATUS_CLASSES,
  STAFF_STATUS_LABELS,
} from '@/app/(private)/staffs/_constants/constants';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { Badge } from '@/components/ui/badge';

import { adminStaffPermissionControllerListStaffInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { StaffListResponseDto } from '@/lib/api-real/types.gen';

import { DOMAIN_LINKED_STAFF_PAGE_SIZE } from '../_constants/domain.constants';

interface DomainLinkedStaffListProps {
  /** メールドメイン（完全一致）。`null` の間はシートが閉じているので取得しない */
  domain: string | null;
  /** シート本文のスクロール領域。IntersectionObserver の root に使う */
  scrollRootRef: RefObject<HTMLElement | null>;
}

/**
 * ドメイン詳細シートの「紐づくスタッフ」セクション。一覧はドメインマスタ側では返らない
 * （API-071 §5 が明示的にスタッフ API へ委譲）ため、スタッフ一覧 API を `emailDomain` で
 * 引き、シートのスクロールに合わせて次ページを読み足す。
 */
export function DomainLinkedStaffList({
  domain,
  scrollRootRef,
}: Readonly<DomainLinkedStaffListProps>) {
  const staffQuery = useInfiniteQuery({
    ...adminStaffPermissionControllerListStaffInfiniteOptions({
      query: { emailDomain: domain ?? '', limit: DOMAIN_LINKED_STAFF_PAGE_SIZE },
    }),
    enabled: domain !== null,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StaffListResponseDto, allPages: StaffListResponseDto[]) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pagination.totalPages ? currentPage + 1 : undefined;
    },
  });

  const linkedStaff = useMemo(
    () => staffQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [staffQuery.data],
  );
  // 件数は「このドメインに属する全スタッフ」なので、読み込み済みの行数ではなく総件数を出す
  const linkedStaffCount = staffQuery.data?.pages[0]?.pagination.totalItems ?? 0;

  const sentinelRef = useInfiniteScroll({
    hasMore: staffQuery.hasNextPage,
    isLoading: staffQuery.isFetchingNextPage,
    onLoadMore: () => void staffQuery.fetchNextPage(),
    rootRef: scrollRootRef,
    enabled: domain !== null,
  });

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">紐づくスタッフ</p>
        <Badge variant="secondary" className="text-[10px]">
          {linkedStaffCount}名
        </Badge>
      </div>
      {staffQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          読み込み中...
        </div>
      ) : linkedStaff.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-xs">
          このドメインに紐づくスタッフはいません
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {linkedStaff.map((staff) => (
            <div
              key={staff.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{staff.name || staff.email}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {staff.staffId} · {staff.positionName}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] ${STAFF_STATUS_CLASSES[staff.status]}`}
              >
                {STAFF_STATUS_LABELS[staff.status]}
              </Badge>
            </div>
          ))}
          {staffQuery.hasNextPage && (
            <div
              ref={sentinelRef}
              className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs"
            >
              {staffQuery.isFetchingNextPage && (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  読み込み中...
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
