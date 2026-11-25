'use client';

import { useQuery } from '@tanstack/react-query';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { adminMemberActivityControllerUsageSummaryOptions } from '@/lib/api-real/@tanstack/react-query.gen';

interface UsageStatusCardProps {
  readonly memberId: string;
}

/**
 * 利用状況 card — the four cells come from one summary request; every cell is a group-by over the
 * whole month, which the paginated list endpoints of this tab cannot answer.
 *
 * The window is left to the server, which defaults to the current JST month — the card's （今月）.
 */
export function UsageStatusCard(props: UsageStatusCardProps) {
  const { memberId } = props;
  const { data, isLoading, isError, refetch } = useQuery(
    adminMemberActivityControllerUsageSummaryOptions({
      path: { memberId },
    }),
  );

  const peakTimeSlot = data?.frequentTimeBand?.band ?? null;
  const frequentStore = data?.frequentStore ?? null;
  // The store row is printed whenever a store won the month, even if its name is gone
  const frequentStoreLabel = frequentStore ? (frequentStore.storeName ?? '—') : null;
  const lessons = data?.lessons ?? null;
  const lessonsDiff = lessons?.delta ?? 0;
  const monthlyOptions = data?.optionUsage.total ?? 0;
  const optionsBreakdownLabel = (data?.optionUsage.breakdown ?? [])
    .map((item) => `${item.optionName ?? '—'} ${item.times}`)
    .join(' / ');

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError}
      isEmpty={!data}
      onRetry={() => refetch()}
      errorTitle="利用状況の取得に失敗しました"
      emptyTitle="利用状況はありません"
      skeleton={<Skeleton className="h-36 w-full rounded-lg" />}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">利用状況</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-3">
            {(peakTimeSlot ?? frequentStoreLabel) && (
              <div className="flex flex-col gap-3">
                {peakTimeSlot && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground shrink-0 text-xs">
                      よく利用する時間帯
                    </span>
                    <span className="text-sm font-medium">{peakTimeSlot}</span>
                  </div>
                )}
                {frequentStoreLabel && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground shrink-0 text-xs">よく利用する店舗</span>
                    <span className="min-w-0 text-right text-sm font-medium wrap-anywhere">
                      {frequentStoreLabel}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* The separator only earns its place when the block above it rendered */}
            <div
              className={`flex flex-col gap-3 ${(peakTimeSlot ?? frequentStoreLabel) ? 'border-t pt-3' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground shrink-0 text-xs">
                  レッスン予約数（今月）
                </span>
                <div className="min-w-0 text-right">
                  {/* `lessons` is null when lessons-svc could not be reached — a 0 would read as
                      "no bookings" rather than "not known", so the cell stays blank */}
                  <span className="text-sm font-medium">
                    {lessons ? `${lessons.count}回` : '—'}
                  </span>
                  {lessonsDiff !== 0 && (
                    <span
                      className={`ml-2 text-xs whitespace-nowrap ${lessonsDiff > 0 ? 'text-success' : 'text-destructive'}`}
                    >
                      前月比 {lessonsDiff > 0 ? `+${lessonsDiff}` : lessonsDiff}回
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground shrink-0 text-xs">
                  オプション利用数（今月）
                </span>
                <div className="min-w-0 text-right">
                  <span className="text-sm font-medium">{monthlyOptions}回</span>
                  {optionsBreakdownLabel && (
                    <p className="text-muted-foreground text-xs wrap-anywhere">
                      {optionsBreakdownLabel}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DataStateBoundary>
  );
}
