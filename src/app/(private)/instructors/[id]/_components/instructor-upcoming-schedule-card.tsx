'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { useInfiniteQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { adminLessonScheduleControllerListSchedulesInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  LessonScheduleListResponseDto,
  TrainerAssignedLessonDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  UPCOMING_INLINE_COUNT,
  formatScheduleDate,
  formatTimeRange,
  isUpcoming,
  jstNowTime,
  jstTodayIso,
  upcomingScheduleQuery,
} from '../../_utils/instructor-detail.util';
import { InstructorUpcomingScheduleSheet } from './instructor-upcoming-schedule-sheet';

interface InstructorUpcomingScheduleCardProps {
  trainerId: string;
  instructorName: string;
  /** From the summary — the recurrence rows' end time and studio (D9) */
  assignedLessons: TrainerAssignedLessonDto[];
}

export function InstructorUpcomingScheduleCard({
  trainerId,
  instructorName,
  assignedLessons,
}: InstructorUpcomingScheduleCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // "Now" as of opening the screen: the window and the started-today cut both hang off it
  const [{ today, nowTime }] = useState(() => ({ today: jstTodayIso(), nowTime: jstNowTime() }));

  // One read for the card and the sheet (D8): today … +3 months, published, not cancelled, ascending
  const schedulesQuery = useInfiniteQuery({
    ...adminLessonScheduleControllerListSchedulesInfiniteOptions({
      query: upcomingScheduleQuery(trainerId, today),
    }),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: LessonScheduleListResponseDto,
      allPages: LessonScheduleListResponseDto[],
    ) => (allPages.length < lastPage.pagination.totalPages ? allPages.length + 1 : undefined),
  });

  const loaded = useMemo(
    () => schedulesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [schedulesQuery.data],
  );
  // FR-003: from now on — today's sessions that already started sort first and are dropped
  const entries = useMemo(
    () => loaded.filter((schedule) => isUpcoming(schedule, today, nowTime)),
    [loaded, today, nowTime],
  );
  const totalCount = Math.max(
    (schedulesQuery.data?.pages[0]?.pagination.totalItems ?? 0) - (loaded.length - entries.length),
    0,
  );
  const inlineEntries = entries.slice(0, UPCOMING_INLINE_COUNT);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">直近のスケジュール</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            全{totalCount}件
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        {schedulesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            予定されたスケジュールはありません
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {inlineEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={navigate('/lesson-schedules/[id]/reservations', entry.id)}
                  className="block"
                >
                  <div className="bg-muted/50 hover:bg-muted flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors">
                    <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {formatScheduleDate(entry.scheduledDate)}{' '}
                        {formatTimeRange(entry.startTime, entry.endTime)}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">{entry.lessonName}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 w-full text-xs"
              onClick={() => setSheetOpen(true)}
            >
              全{totalCount}件を表示
            </Button>
          </>
        )}
      </CardContent>

      <InstructorUpcomingScheduleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        trainerId={trainerId}
        instructorName={instructorName}
        today={today}
        entries={entries}
        totalCount={totalCount}
        hasMore={schedulesQuery.hasNextPage}
        isLoadingMore={schedulesQuery.isFetchingNextPage}
        onLoadMore={() => void schedulesQuery.fetchNextPage()}
        assignedLessons={assignedLessons}
      />
    </Card>
  );
}
