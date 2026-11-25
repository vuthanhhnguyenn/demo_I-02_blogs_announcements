'use client';

import { useMemo, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { CalendarDays, ExternalLink, Loader2, Plus } from 'lucide-react';

import { useInfiniteScroll } from '@/hooks/use-infinite-scroll.hook';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

import {
  adminLessonScheduleControllerListRecurrencesQueryKey,
  adminLessonScheduleControllerListSchedulesInfiniteOptions,
  adminStudioControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { AdminLessonScheduleManagementApi112 } from '@/lib/api-real/sdk.gen';
import type { LessonScheduleListResponseDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { RECURRENCE_PAGE_SIZE, SHEET_SCHEDULE_PAGE_SIZE } from '../../_constants/constants';
import { fetchAllPages } from '../../_utils/lesson-api.util';
import { getCapacityToneClass } from '../_constants/constants';
import {
  type UpcomingScheduleWindow,
  addMinutesToTime,
  formatRecurrenceDays,
  formatRecurrencePeriod,
  formatTimeRange,
  seatBookingCount,
  upcomingSchedulesQuery,
} from '../_utils/lesson-detail.util';

interface LessonScheduleSheetProps {
  lessonId: string;
  /** The store the card lists (API-112 needs one) — the sheet shows the same store. */
  storeId: string;
  lessonName: string;
  /** Lesson length — a recurrence carries its start time only. */
  durationMinutes: number;
  scheduleWindow: UpcomingScheduleWindow;
  /** Upcoming-session total from the card's query (`pagination.totalItems`). */
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LoadError({
  label,
  className,
  onRetry,
}: {
  label: string;
  className?: string;
  onRetry: () => void;
}) {
  return (
    <p className={cn('text-destructive flex items-center justify-center gap-1 text-xs', className)}>
      {label}の取得に失敗しました
      <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={onRetry}>
        再試行
      </Button>
    </p>
  );
}

/**
 * "全件表示" Sheet — recurring-pattern summary (instructors as D-04 links,
 * multi-instructor n名) + full per-session list with capacity color coding
 * (FR-003-P1-09 / 09a / 10). Everything is fetched only while the sheet is open.
 */
export function LessonScheduleSheet({
  lessonId,
  storeId,
  lessonName,
  durationMinutes,
  scheduleWindow,
  total,
  open,
  onOpenChange,
}: LessonScheduleSheetProps) {
  const router = useRouter();

  const scrollRootRef = useRef<HTMLDivElement>(null);

  // FR-003: the sheet shows every upcoming session — the next page is read as the list scrolls.
  const sessionsQuery = useInfiniteQuery({
    ...adminLessonScheduleControllerListSchedulesInfiniteOptions({
      query: upcomingSchedulesQuery(lessonId, storeId, scheduleWindow, SHEET_SCHEDULE_PAGE_SIZE),
    }),
    enabled: open && Boolean(lessonId),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: LessonScheduleListResponseDto,
      allPages: LessonScheduleListResponseDto[],
    ) => (allPages.length < lastPage.pagination.totalPages ? allPages.length + 1 : undefined),
  });
  const sessions = useMemo(
    () => sessionsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [sessionsQuery.data],
  );
  const sentinelRef = useInfiniteScroll({
    hasMore: sessionsQuery.hasNextPage && !sessionsQuery.isFetchNextPageError,
    isLoading: sessionsQuery.isFetchingNextPage,
    onLoadMore: () => void sessionsQuery.fetchNextPage(),
    rootRef: scrollRootRef,
    enabled: open,
  });

  // The 繰り返し設定 summary is short — read whole, every page.
  const recurrenceQuery = { lessonId, storeId, isActive: true };
  const recurrencesQuery = useQuery({
    queryKey: [
      ...adminLessonScheduleControllerListRecurrencesQueryKey({ query: recurrenceQuery }),
      'all-pages',
    ],
    queryFn: ({ signal }) =>
      fetchAllPages(
        RECURRENCE_PAGE_SIZE,
        async (paging) =>
          (
            await AdminLessonScheduleManagementApi112.adminLessonScheduleControllerListRecurrences({
              query: { ...recurrenceQuery, ...paging },
              signal,
              throwOnError: true,
            })
          ).data,
      ),
    enabled: open && Boolean(lessonId),
  });
  const recurrences = recurrencesQuery.data ?? [];

  // A recurrence carries `studioId` only — resolve the names through API-110 (one request per
  // distinct studio; '—' while loading or when the studio cannot be read).
  const studioIds = [
    ...new Set(recurrences.map((r) => r.studioId).filter((id): id is string => Boolean(id))),
  ];
  const studioQueries = useQueries({
    queries: studioIds.map((studioId) => ({
      ...adminStudioControllerDetailOptions({ path: { studioId } }),
      enabled: open,
    })),
  });
  const studioNameById = new Map(
    studioIds.map((studioId, i) => [studioId, studioQueries[i]?.data?.name] as const),
  );

  const handleInstructorClick = (trainerId: string) => {
    // FR-003-P1-09a: the link carries the real trainer id; D-04 (/instructors/[id]) resolves it
    // once that screen is integrated (it is still on the mock).
    router.push(navigate('/instructors/[id]', trainerId));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[480px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        {/* pr-12 keeps a long title clear of the sheet's close button (absolute, top-right) */}
        <div className="shrink-0 border-b py-4 pr-12 pl-6">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold break-words">
              <CalendarDays className="size-4 shrink-0" />
              <span className="min-w-0 wrap-anywhere">{lessonName} のスケジュール</span>
              <Badge variant="destructive" className="text-[10px]">
                {total}件
              </Badge>
            </SheetTitle>
            <SheetDescription className="sr-only">全{total}件の開催予定</SheetDescription>
          </SheetHeader>
        </div>

        <div ref={scrollRootRef} className="flex-1 overflow-y-auto px-6">
          {recurrencesQuery.isError && (
            <LoadError
              label="繰り返し設定"
              className="pt-4"
              onRetry={() => void recurrencesQuery.refetch()}
            />
          )}
          {recurrences.length > 0 && (
            <>
              <div className="space-y-3 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-foreground text-xs font-semibold">繰り返し設定</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {recurrences.length}件
                  </Badge>
                </div>
                {recurrences.map((pattern) => (
                  <div key={pattern.id} className="bg-muted/50 space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-2 text-[10px] font-medium">
                          {formatRecurrenceDays(pattern)}
                        </Badge>
                        <span className="text-xs font-medium">
                          {/* End = start + lesson length (a generated session's endTime also
                              folds in the trainers' post-buffer). */}
                          {formatTimeRange(
                            pattern.startTime,
                            addMinutesToTime(pattern.startTime, durationMinutes),
                          )}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">
                        {formatRecurrencePeriod(pattern)}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span>
                        {(pattern.studioId && studioNameById.get(pattern.studioId)) || '—'}
                      </span>
                      <span className="flex flex-wrap items-center gap-1">
                        {pattern.trainerIds.length > 1 && (
                          <span>{pattern.trainerIds.length}名:</span>
                        )}
                        {pattern.trainerIds.map((trainerId, idx) => (
                          <span key={trainerId} className="inline-flex items-center">
                            <button
                              type="button"
                              onClick={() => handleInstructorClick(trainerId)}
                              className="text-primary inline-flex items-center gap-0.5 hover:underline"
                            >
                              {/* Index-aligned with trainerIds; '' when the trainer row is gone. */}
                              {pattern.trainerNames[idx] || '—'}
                              <ExternalLink className="size-3" />
                            </button>
                            {idx < pattern.trainerIds.length - 1 && <span>、</span>}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="-mx-6 w-[calc(100%+48px)]" />
            </>
          )}

          <div className="py-4">
            <p className="text-foreground mb-3 text-xs font-semibold">個別スケジュール一覧</p>
            {sessionsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded" />
                <Skeleton className="h-12 w-full rounded" />
                <Skeleton className="h-12 w-full rounded" />
              </div>
            ) : sessionsQuery.isError && sessions.length === 0 ? (
              <LoadError
                label="スケジュール"
                className="py-8"
                onRetry={() => void sessionsQuery.refetch()}
              />
            ) : sessions.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                スケジュールはありません
              </p>
            ) : (
              <div className="divide-y">
                {sessions.map((session) => (
                  <button
                    type="button"
                    key={session.id}
                    onClick={() =>
                      router.push(navigate('/lesson-schedules/[id]/reservations', session.id))
                    }
                    className="hover:bg-muted/40 flex w-full items-center gap-3 rounded py-3 text-left transition-colors"
                  >
                    <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{session.scheduledDate}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatTimeRange(session.startTime, session.endTime)} ·{' '}
                        {session.studioName ?? '—'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-xs font-semibold tabular-nums',
                        getCapacityToneClass(seatBookingCount(session), session.capacity),
                      )}
                    >
                      {seatBookingCount(session)}/{session.capacity}名
                    </span>
                  </button>
                ))}
                {sessionsQuery.isFetchNextPageError ? (
                  <LoadError
                    label="続きのスケジュール"
                    className="py-3"
                    onRetry={() => void sessionsQuery.fetchNextPage()}
                  />
                ) : (
                  sessionsQuery.hasNextPage && (
                    <div
                      ref={sentinelRef}
                      className="text-muted-foreground flex items-center justify-center gap-2 py-3 text-xs"
                    >
                      {sessionsQuery.isFetchingNextPage && (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          読み込み中...
                        </>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          <Button
            type="button"
            className="h-9 w-full text-sm"
            onClick={() => router.push(navigate('/lesson-schedules/create'))}
          >
            <Plus className="mr-2 size-4" />
            スケジュールを追加
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
