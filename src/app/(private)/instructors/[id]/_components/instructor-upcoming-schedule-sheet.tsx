'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Loader2, Plus } from 'lucide-react';

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

import { adminLessonScheduleControllerListRecurrencesOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonScheduleListItemDto, TrainerAssignedLessonDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  formatScheduleDate,
  formatTimeRange,
  isCurrentRecurrence,
  recurrencePatternText,
  recurrencePeriodText,
} from '../../_utils/instructor-detail.util';

/** The trainer's rules fit one page: a person runs a handful of recurring classes */
const RECURRENCE_PAGE_SIZE = 200;

interface InstructorUpcomingScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  instructorName: string;
  today: string;
  /** Upcoming sessions loaded so far (D8) */
  entries: LessonScheduleListItemDto[];
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  assignedLessons: TrainerAssignedLessonDto[];
}

export function InstructorUpcomingScheduleSheet({
  open,
  onOpenChange,
  trainerId,
  instructorName,
  today,
  entries,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  assignedLessons,
}: InstructorUpcomingScheduleSheetProps) {
  // 繰り返し設定 (D9): read when the sheet opens
  const { data: recurrenceData } = useQuery({
    ...adminLessonScheduleControllerListRecurrencesOptions({
      query: { trainerId, isActive: true, limit: RECURRENCE_PAGE_SIZE },
    }),
    enabled: open,
  });

  const recurrences = useMemo(() => {
    // The rule read has no end time / studio name — the summary's recurring rows carry them
    const byRule = new Map(
      assignedLessons
        .filter((lesson) => lesson.recurrenceId)
        .map((lesson) => [lesson.recurrenceId, lesson]),
    );
    return (recurrenceData?.items ?? [])
      .filter((rule) => isCurrentRecurrence(rule, today))
      .map((rule) => {
        const lesson = byRule.get(rule.id);
        return {
          id: rule.id,
          pattern: recurrencePatternText(rule),
          time: formatTimeRange(rule.startTime, lesson?.endTime),
          period: recurrencePeriodText(rule),
          lessonName: rule.lessonName,
          studioName: lesson?.studioName ?? null,
        };
      });
  }, [recurrenceData, assignedLessons, today]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 sm:max-w-120">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-4" />
              {instructorName} のスケジュール
              <Badge variant="destructive" className="text-[10px]">
                {totalCount}件
              </Badge>
            </SheetTitle>
            <SheetDescription className="sr-only">全{totalCount}件の担当予定</SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {recurrences.length > 0 && (
            <>
              <div className="space-y-3 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-foreground text-xs font-semibold">繰り返し設定</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {recurrences.length}件
                  </Badge>
                </div>
                {recurrences.map((rule) => (
                  <div key={rule.id} className="bg-muted/50 space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-2 text-[10px] font-medium">
                          {rule.pattern}
                        </Badge>
                        <span className="text-xs font-medium">{rule.time}</span>
                      </div>
                      <span className="text-muted-foreground text-[10px]">{rule.period}</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                      <span>{rule.lessonName}</span>
                      <span>{rule.studioName ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="-mx-6 w-[calc(100%+48px)]" />
            </>
          )}

          <div className="py-4">
            <p className="text-foreground mb-3 text-xs font-semibold">個別スケジュール一覧</p>
            {entries.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                スケジュールはありません
              </p>
            ) : (
              <div className="divide-y">
                {entries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={navigate('/lesson-schedules/[id]/reservations', entry.id)}
                    className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors"
                  >
                    <CalendarDays className="text-muted-foreground size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {formatScheduleDate(entry.scheduledDate)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {entry.lessonName} · {formatTimeRange(entry.startTime, entry.endTime)}
                        {entry.studioName && ` · ${entry.studioName}`}
                        {entry.recurrenceId && ' · 繰り返し'}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {entry.bookingCount}/{entry.capacity}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
            {hasMore && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 h-8 w-full text-xs"
                disabled={isLoadingMore}
                onClick={onLoadMore}
              >
                {isLoadingMore && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                さらに表示
              </Button>
            )}
          </div>
        </div>
        <div className="shrink-0 border-t px-6 py-4">
          <Link href={navigate('/lesson-schedules/create')}>
            <Button type="button" className="h-9 w-full text-sm">
              <Plus className="mr-2 size-4" />
              スケジュールを追加
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
