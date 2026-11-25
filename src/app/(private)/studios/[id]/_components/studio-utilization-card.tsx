'use client';

import { useMemo, useState } from 'react';

import { useQueries, useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { adminStudioControllerUtilizationOptions } from '@/lib/api-real/@tanstack/react-query.gen';

import { displayTime } from '../../_utils/studio-api.util';
import {
  TIME_BAND_LABELS,
  type UsagePeriod,
  currentWindow,
  jstToday,
  toPercent,
  trendWindows,
} from '../../_utils/studio-detail.util';

interface StudioUtilizationCardProps {
  studioId: string;
}

const PERIOD_LABELS: Record<UsagePeriod, string> = { day: '本日', week: '今週', month: '今月' };
const TREND_SLOT_COUNT = 7;

const rateTextClass = (rate: number) =>
  rate >= 80 ? 'text-success' : rate >= 60 ? 'text-warning' : 'text-destructive';
const rateBarClass = (rate: number) =>
  rate >= 80 ? 'bg-success' : rate >= 60 ? 'bg-warning' : 'bg-destructive';

/**
 * 利用状況 (API-110 #11, FR-007). The selected period (本日 / 今週 / 今月) is one call; the trend is
 * the last 7 days / Monday weeks / calendar months — the months in ≤ 92-day calls (3 + 3 + 1).
 * Only system / headquarter / manager / staff may read it; the page does not render it otherwise.
 */
export function StudioUtilizationCard({ studioId }: StudioUtilizationCardProps) {
  const [usagePeriod, setUsagePeriod] = useState<UsagePeriod>('week');
  const today = jstToday();
  const span = currentWindow(usagePeriod, today);

  const current = useQuery(
    adminStudioControllerUtilizationOptions({ path: { studioId }, query: span }),
  );
  const trendQueries = useQueries({
    queries: trendWindows(usagePeriod, today).map((w) =>
      adminStudioControllerUtilizationOptions({ path: { studioId }, query: w }),
    ),
  });

  const trend = useMemo(() => {
    if (trendQueries.some((q) => !q.data)) return null;
    return trendQueries
      .flatMap((q) => q.data?.trend ?? [])
      .slice(-TREND_SLOT_COUNT)
      .map((bucket) => toPercent(bucket.fillRate));
  }, [trendQueries]);

  const data = current.data;
  const lessonCount = data ? data.trend.reduce((n, bucket) => n + bucket.scheduleCount, 0) : 0;
  const fillPercent = toPercent(data?.fillRate) ?? 0;
  const activeHours = data?.activeHours
    ? `${displayTime(data.activeHours.start)}-${displayTime(data.activeHours.end)}`
    : '—';
  const isError = current.isError || trendQueries.some((q) => q.isError);

  return (
    <Card>
      <CardContent className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">利用状況</h3>
          <Tabs value={usagePeriod} onValueChange={(v) => setUsagePeriod(v as UsagePeriod)}>
            <TabsList className="h-7">
              <TabsTrigger value="day" className="px-2 text-[11px]">
                日次
              </TabsTrigger>
              <TabsTrigger value="week" className="px-2 text-[11px]">
                週次
              </TabsTrigger>
              <TabsTrigger value="month" className="px-2 text-[11px]">
                月次
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-muted-foreground text-xs">利用状況を取得できませんでした</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void current.refetch();
                trendQueries.forEach((q) => void q.refetch());
              }}
            >
              再試行
            </Button>
          </div>
        ) : current.isLoading || !data ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  {PERIOD_LABELS[usagePeriod]}のレッスン数
                </span>
                <span className="text-sm font-semibold">{lessonCount}コマ</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">予約充足率</span>
                <span className="text-success text-sm font-semibold">{fillPercent}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">稼働時間帯</span>
                <span className="text-sm">{activeHours}</span>
              </div>
            </div>

            <div className="mt-4 border-t pt-3">
              <h4 className="mb-2 text-xs font-semibold">時間帯別稼働率</h4>
              <div className="space-y-2">
                {TIME_BAND_LABELS.map(({ key, label }) => {
                  const rate = toPercent(data.timeBandUtilization[key]);
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px]">{label}</span>
                        <span
                          className={`text-xs font-medium ${
                            rate === null ? 'text-muted-foreground' : rateTextClass(rate)
                          }`}
                        >
                          {rate === null ? '—' : `${rate}%`}
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        {rate !== null && (
                          <div
                            className={`h-full rounded-full ${rateBarClass(rate)}`}
                            style={{ width: `${rate}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {!isError && (
          <div className="mt-4 border-t pt-3">
            <h4 className="mb-2 text-xs font-semibold">
              予約トレンド（直近
              {usagePeriod === 'day' ? '7枠' : usagePeriod === 'week' ? '7週' : '7ヶ月'}）
            </h4>
            {trend === null ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex h-16 items-end gap-1">
                {trend.map((v, idx) => (
                  <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="bg-info/30 w-full rounded-sm transition-all"
                      style={{ height: `${v ?? 0}%` }}
                    />
                    <span className="text-muted-foreground text-[9px]">
                      {v === null ? '—' : `${v}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
