'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { adminLessonScheduleControllerGetRecurrenceOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { BookingStatsResponseDto, LessonScheduleDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { BOOKING_STATS_ROWS } from '../_constants/booking-status.constants';
import { formatRecurrenceLabel } from '../_utils/recurrence-label.util';
import { formatScheduleDateShort, formatScheduleTimeRange } from '../_utils/schedule-datetime.util';

interface ReservationStatsPanelProps {
  schedule: LessonScheduleDetailDto;
  stats: BookingStatsResponseDto;
}

function getInstructorInitials(lastName: string, firstName: string): string {
  const initials = `${lastName[0] ?? ''}${firstName[0] ?? ''}`;
  return initials || (lastName || firstName).slice(0, 2);
}

/** D-02 lesson content detail — the lesson behind this schedule (BUG-D01A-01). */
function lessonContentHref(schedule: LessonScheduleDetailDto): string | null {
  return schedule.lesson ? navigate('/lessons/[id]', schedule.lesson.id) : null;
}

export function ReservationStatsPanel({ schedule, stats }: ReservationStatsPanelProps) {
  // Decision D9 — 予約数 = confirmed (reserved + attended) + pending; % over all bookings.
  const reservedCount = stats.confirmed + stats.pending;
  const breakdownTotal = BOOKING_STATS_ROWS.reduce((sum, row) => sum + stats[row.key], 0);
  // FR-007 L352 lists 空席 beside the booking counts — shown against capacity, outside the % breakdown.
  const availablePercentage =
    stats.capacity > 0 ? Math.round((stats.available / stats.capacity) * 100) : 0;
  const lessonHref = lessonContentHref(schedule);

  // 繰り返し — the schedule only carries `recurrenceId`; the pattern comes from the
  // recurrence itself (API-112 §11). 単発 when there is none (BUG-D01A-12).
  const recurrenceId = schedule.recurrenceId;
  const recurrenceQuery = useQuery({
    ...adminLessonScheduleControllerGetRecurrenceOptions({
      path: { recurrenceId: recurrenceId ?? '' },
    }),
    enabled: !!recurrenceId,
  });
  const recurrenceLabel = !recurrenceId
    ? '単発'
    : recurrenceQuery.data
      ? formatRecurrenceLabel(recurrenceQuery.data)
      : recurrenceQuery.isPending
        ? '…'
        : '繰り返し';

  return (
    <div className="space-y-4">
      {/* Lesson Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">レッスン情報</CardTitle>
            {lessonHref && (
              <Link
                href={lessonHref}
                className="text-muted-foreground hover:text-foreground shrink-0 text-[10px] transition-colors"
              >
                レッスン内容管理で編集 →
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {/* `min-w-0 break-all` keeps a long unbroken name inside the card (BUG-D01A-06). */}
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground shrink-0">レッスン名</span>
            {lessonHref ? (
              <Link
                href={lessonHref}
                className="text-primary min-w-0 text-right font-medium break-all hover:underline"
                title={schedule.lesson?.name}
              >
                {schedule.lesson?.name}
              </Link>
            ) : (
              <span className="min-w-0 text-right break-all">—</span>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">日付</span>
            <span>{formatScheduleDateShort(schedule)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">時間</span>
            <span>{formatScheduleTimeRange(schedule, ' 〜 ')}</span>
          </div>
          {schedule.studio && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">スタジオ</span>
              <span>{schedule.studio.name}</span>
            </div>
          )}
          <div className="flex items-start justify-between">
            <span className="text-muted-foreground shrink-0">担当講師</span>
            <div className="flex flex-col items-end gap-1">
              {schedule.trainerRows.length === 0 && <span>—</span>}
              {schedule.trainerRows.map((trainer) => (
                <div key={trainer.trainerId} className="flex items-center gap-1">
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[8px]">
                      {getInstructorInitials(trainer.lastName, trainer.firstName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {trainer.lastName} {trainer.firstName}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">定員</span>
            <span>{stats.capacity}名</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">予約数</span>
            <span>{reservedCount}名</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">繰り返し</span>
            <span>{recurrenceLabel}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">予約統計</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {BOOKING_STATS_ROWS.map((row) => {
            const count = stats[row.key];
            const percentage = breakdownTotal > 0 ? Math.round((count / breakdownTotal) * 100) : 0;
            return (
              <div key={row.key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs">{row.label}</span>
                  <span className="text-xs font-medium">
                    {count}名（{percentage}%）
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${row.barClass}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
          <Separator />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs">空席</span>
              <span className="text-xs font-medium">
                {stats.available}席（定員{stats.capacity}名）
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-success/60 h-full rounded-full"
                style={{ width: `${availablePercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
