'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useCurrentStore } from '@/contexts/current-store.context';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { adminLessonScheduleControllerListSchedulesOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { getCapacityToneClass } from '../_constants/constants';
import {
  formatTimeRange,
  getUpcomingScheduleWindow,
  scheduleStoreId,
  seatBookingCount,
  upcomingSchedulesQuery,
} from '../_utils/lesson-detail.util';
import { LessonScheduleSheet } from './lesson-schedule-sheet';

/** Sessions shown on the card itself. */
const RECENT_SCHEDULE_LIMIT = 3;

interface LessonRecentScheduleCardProps {
  lessonId: string;
  /** The lesson's own store (`null` = brand-wide) — decides which store's sessions are listed. */
  lessonStoreId: string | null;
  lessonName: string;
  durationMinutes: number;
}

/**
 * "直近のスケジュール" card — top 3 sessions + total badge, with the
 * "全{n}件を表示" sheet trigger and row → reservation navigation
 * (FR-003-P1-08 / 10).
 *
 * Read from API-112 rather than the detail's `recentSchedules`, which carries no
 * `bookingCount` / `capacity`. The total is the non-cancelled sessions from today (JST) up to
 * the API's 3-month window — the same range the sheet lists. API-112 lists one store at a time
 * (`storeId` required): see `scheduleStoreId` for which one.
 */
export function LessonRecentScheduleCard({
  lessonId,
  lessonStoreId,
  lessonName,
  durationMinutes,
}: LessonRecentScheduleCardProps) {
  const router = useRouter();
  const { currentStoreId } = useCurrentStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Fixed for the screen's lifetime so the query key does not drift.
  const [scheduleWindow] = useState(() => getUpcomingScheduleWindow());
  const storeId = scheduleStoreId(lessonStoreId, currentStoreId);

  const { data, isLoading, isError } = useQuery({
    ...adminLessonScheduleControllerListSchedulesOptions({
      query: upcomingSchedulesQuery(lessonId, storeId ?? '', scheduleWindow, RECENT_SCHEDULE_LIMIT),
    }),
    enabled: Boolean(lessonId) && storeId !== null,
  });

  const topSessions = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;
  const hasList = storeId !== null && !isError;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">直近のスケジュール</CardTitle>
          {hasList && (
            <Badge variant="secondary" className="text-[10px]">
              全{total}件
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {storeId === null ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            店舗を選択するとスケジュールを表示します
          </p>
        ) : isError ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            スケジュールを取得できませんでした
          </p>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : topSessions.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">スケジュールはありません</p>
        ) : (
          <div className="space-y-2">
            {topSessions.map((session) => (
              <button
                type="button"
                key={session.id}
                onClick={() =>
                  router.push(navigate('/lesson-schedules/[id]/reservations', session.id))
                }
                className="bg-muted/50 hover:bg-muted flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors"
              >
                <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {session.scheduledDate} {formatTimeRange(session.startTime, session.endTime)}
                  </p>
                  <p className="text-muted-foreground text-xs">{session.studioName ?? '—'}</p>
                </div>
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    getCapacityToneClass(seatBookingCount(session), session.capacity),
                  )}
                >
                  {seatBookingCount(session)}/{session.capacity}名
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 flex-1 text-xs"
            disabled={!hasList || total === 0}
            onClick={() => setSheetOpen(true)}
          >
            {hasList ? `全${total}件を表示` : '全件を表示'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push(navigate('/lesson-schedules/create'))}
          >
            <Plus className="mr-1 size-3" />
            スケジュール追加
          </Button>
        </div>
      </CardContent>

      {storeId !== null && (
        <LessonScheduleSheet
          lessonId={lessonId}
          storeId={storeId}
          lessonName={lessonName}
          durationMinutes={durationMinutes}
          scheduleWindow={scheduleWindow}
          total={total}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </Card>
  );
}
