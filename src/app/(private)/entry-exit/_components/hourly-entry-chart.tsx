'use client';

import { getCurrentJstHour, getTodayJstISODate } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { LineChart as LineChartIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Card } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

import { adminVisitMonitorControllerDailyStatsOptions } from '@/lib/api-real/@tanstack/react-query.gen';

const HOURLY_CHART_CONFIG = {
  count: {
    label: '入館者数',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

const CHART_FIRST_HOUR = 6;
const CHART_LAST_HOUR = 22;

interface HourlyEntryChartProps {
  date?: string;
  /** Omitted = 全店舗: the bins sum every store in the caller's scope. */
  storeId?: string;
  /** Set to false while the caller's store scope is still resolving, to avoid an extra fetch. */
  enabled?: boolean;
}

/** FR-B01-08: hourly entry-count chart (06:00-22:00) with the current hour highlighted. */
export function HourlyEntryChart({
  date,
  storeId,
  enabled = true,
}: Readonly<HourlyEntryChartProps>) {
  const { data, isLoading, isError, refetch } = useQuery({
    ...adminVisitMonitorControllerDailyStatsOptions({
      query: {
        ...(storeId ? { storeId } : {}),
        ...(date ? { date } : {}),
      },
    }),
    enabled,
  });

  const hourlyEntries = (data?.hourly ?? [])
    .filter(({ hour }) => hour >= CHART_FIRST_HOUR && hour <= CHART_LAST_HOUR)
    .map(({ hour, entries }) => ({ hour, count: entries }));
  // The bins are JST hours, so the 「現在」 marker must use the JST hour too (BUG-B01-01).
  // A past day has no "now" → no marker and no highlighted hour.
  const isToday = !date || date === getTodayJstISODate();
  const currentHour = isToday ? getCurrentJstHour() : null;

  return (
    <Card className="shrink-0 gap-0 overflow-hidden py-0">
      <div className="flex items-center gap-2 px-4 py-2">
        <LineChartIcon className="text-muted-foreground size-4" />
        <span className="text-sm font-semibold">時間帯別入館者数</span>
      </div>
      <div className="border-t px-4 py-3">
        <DataStateBoundary
          isLoading={isLoading || !enabled}
          isError={isError}
          isEmpty={false}
          onRetry={refetch}
          errorTitle="時間帯別入館者数の取得に失敗しました"
          skeleton={<Skeleton className="h-[180px] w-full" />}
        >
          <ChartContainer config={HOURLY_CHART_CONFIG} className="h-[180px] w-full">
            <LineChart
              accessibilityLayer
              data={hourlyEntries}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={Number(y) + 10}
                    textAnchor="middle"
                    fill={
                      payload.value === currentHour
                        ? 'var(--destructive)'
                        : 'var(--muted-foreground)'
                    }
                    fontWeight={payload.value === currentHour ? '700' : '400'}
                    fontSize={10}
                  >
                    {`${payload.value}時`}
                  </text>
                )}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickCount={3}
                tickMargin={4}
                fontSize={10}
                width={36}
                tickFormatter={(value) => `${value}人`}
              />
              {currentHour !== null && (
                <ReferenceLine
                  x={currentHour}
                  stroke="var(--destructive)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: '現在',
                    position: 'top',
                    fill: 'var(--destructive)',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}
              <ChartTooltip
                cursor={{
                  stroke: 'var(--muted-foreground)',
                  strokeWidth: 1,
                  strokeDasharray: '3 3',
                }}
                content={
                  <ChartTooltipContent
                    // `label` here is the series name, not the hour (the x value is numeric),
                    // so read the hour from the hovered point.
                    labelFormatter={(_, payload) =>
                      `${String(payload[0]?.payload?.hour ?? '').padStart(2, '0')}:00`
                    }
                    formatter={(value) => (
                      <>
                        <div className="size-2.5 shrink-0 rounded-[2px] bg-(--color-count)" />
                        <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                          <span className="text-muted-foreground">
                            {HOURLY_CHART_CONFIG.count.label}
                          </span>
                          <span className="text-foreground font-mono font-medium tabular-nums">
                            {`${value}人`}
                          </span>
                        </div>
                      </>
                    )}
                  />
                }
              />
              <Line
                type="natural"
                dataKey="count"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--chart-1)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        </DataStateBoundary>
      </div>
    </Card>
  );
}
