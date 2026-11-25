'use client';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { adminStudioControllerLinkedLessonsOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  LINKED_KIND_LABELS,
  formatLinkedSchedule,
  toPercent,
} from '../../_utils/studio-detail.util';

interface StudioLinkedLessonsCardProps {
  studioId: string;
}

/** FR-003-05: 80% and above success, 60% and above warning */
function rateClass(rate: number | null): string {
  if (rate === null) return 'text-muted-foreground';
  if (rate >= 80) return 'text-success';
  if (rate >= 60) return 'text-warning';
  return 'text-muted-foreground';
}

/**
 * 紐付きレッスン (API-110 #13): one row per active recurrence on the studio, plus one per lesson
 * with future one-off schedules (its nearest date). The rate is the lesson × studio fill of the
 * past 28 days; null (no completed schedule) shows 「—」.
 */
export function StudioLinkedLessonsCard({ studioId }: StudioLinkedLessonsCardProps) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery(
    adminStudioControllerLinkedLessonsOptions({ path: { studioId } }),
  );
  const lessons = data?.items ?? [];

  return (
    <Card>
      <CardContent className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">紐付きレッスン</h3>
          {!isLoading && !isError && (
            <Badge variant="secondary" className="text-[10px]">
              {lessons.length}件
            </Badge>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-muted-foreground text-xs">紐付きレッスンを取得できませんでした</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              再試行
            </Button>
          </div>
        ) : lessons.length === 0 ? (
          <Empty
            variant="empty"
            title="紐付きレッスンはありません"
            description="未利用のスタジオは削除できます"
          />
        ) : (
          <div className="space-y-1">
            {lessons.map((lesson) => {
              const rate = toPercent(lesson.fillRate);
              return (
                <div
                  key={`${lesson.kind}-${lesson.lessonId}-${lesson.startTime}-${lesson.nextDate ?? ''}`}
                  className="hover:bg-accent/50 -mx-1 flex cursor-pointer items-center justify-between rounded border-b px-1 py-2 last:border-b-0"
                  onClick={() => router.push(navigate('/lessons/[id]', lesson.lessonId))}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{lesson.lessonName || '—'}</p>
                      <Badge
                        variant="outline"
                        className="bg-info/10 text-info border-info/20 shrink-0 text-[10px]"
                      >
                        {LINKED_KIND_LABELS[lesson.kind]}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      {formatLinkedSchedule(lesson)}
                    </p>
                  </div>
                  <span className={`ml-2 shrink-0 text-xs font-medium ${rateClass(rate)}`}>
                    {rate === null ? '—' : `${rate}%`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
