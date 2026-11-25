'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import type { TrainerAssignedLessonDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  assignedLessonWeekdays,
  formatTimeRange,
  toPercent,
} from '../../_utils/instructor-detail.util';

function reservationRateClass(rate: number) {
  if (rate >= 80) return 'text-success';
  if (rate >= 60) return 'text-warning';
  return 'text-muted-foreground';
}

/** API-109 #9 `assignedLessons` — `undefined` while the summary loads (D10) */
export function InstructorAssignedLessonsCard({
  lessons,
}: {
  lessons?: TrainerAssignedLessonDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">担当レッスン</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            全{lessons?.length ?? 0}件
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        {!lessons ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : lessons.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">担当レッスンはありません</p>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson) => {
              const rate = toPercent(lesson.bookingRate);
              return (
                // FR-003: the way to the lesson's D-02 detail
                <Link
                  key={lesson.recurrenceId ?? `${lesson.lessonId}-${lesson.nextDate}`}
                  href={navigate('/lessons/[id]', lesson.lessonId)}
                  className="block"
                >
                  <div className="bg-muted/50 hover:bg-muted cursor-pointer rounded-lg p-3 transition-colors">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="truncate text-sm font-medium">{lesson.lessonName}</p>
                      <span
                        className={`ml-2 shrink-0 text-xs font-medium tabular-nums ${
                          rate !== null ? reservationRateClass(rate) : 'text-muted-foreground'
                        }`}
                      >
                        {rate !== null ? `${rate}%` : '—'}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <div className="flex gap-1">
                        {assignedLessonWeekdays(lesson).map((day) => (
                          <span
                            key={day}
                            className="bg-background text-foreground rounded border px-2 py-0.5 text-[10px]"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                      <span>·</span>
                      <span>{formatTimeRange(lesson.startTime, lesson.endTime)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
