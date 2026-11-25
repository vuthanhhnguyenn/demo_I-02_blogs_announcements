'use client';

import { useState } from 'react';

import { formatDate } from '@/utils/format.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Activity, Lock, ShieldOff } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  adminMemberActivityControllerBodyDataOptions,
  adminMemberActivityControllerBodyHistoryOptions,
  adminMemberActivityControllerBodyTrendOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  MemberBodyDataConsentStateDto,
  MemberBodyMeasurementDto,
  MemberBodyRecordDto,
} from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  type BodyDataConsentStatus,
  SOURCE_LABELS,
  formatMetric,
  getBodyDataConsentStatus,
} from './body-data.util';
import { MeasurementHistorySheet } from './measurement-history-sheet';

/**
 * FR-013 wants the trend chart switchable per metric, so every numeric column of
 * `MemberBodyRecordDto` is offered, under the same labels as the 体組成データ card.
 */
type BodyChartMetric = {
  [K in keyof MemberBodyRecordDto]: MemberBodyRecordDto[K] extends number | null ? K : never;
}[keyof MemberBodyRecordDto];

/**
 * The 「最新値」 cards read the newest page of records; 100 is the largest page the API serves. The
 * 測定履歴 card and its 全件 Sheet page on their own requests, and the chart reads its own
 * `body-data/trend` series, so none of them is bound to that page.
 */
const LATEST_RECORD_LIMIT = 100;

/** 測定履歴 card shows the newest rows only; the rest live behind 「全件を表示」. */
const HISTORY_PREVIEW_COUNT = 5;

const CHART_METRIC_OPTIONS: Array<{ value: BodyChartMetric; label: string; unit?: string }> = [
  { value: 'weightKg', label: '体重', unit: 'kg' },
  { value: 'bmi', label: 'BMI' },
  { value: 'bodyFatPercent', label: '体脂肪率', unit: '%' },
  { value: 'fatMassKg', label: '体脂肪量', unit: 'kg' },
  { value: 'visceralFatIndex', label: '内臓脂肪指数' },
  { value: 'smi', label: '骨格筋指数(SMI)' },
  { value: 'skeletalMuscleKg', label: '骨格筋量', unit: 'kg' },
  { value: 'boneMassKg', label: '推定骨量', unit: 'kg' },
  { value: 'waterMassKg', label: '水分量', unit: 'kg' },
  { value: 'bmrKcal', label: '基礎代謝量', unit: 'kcal' },
  { value: 'leanMassKg', label: '除脂肪量', unit: 'kg' },
  { value: 'limbLeanMassKg', label: '四肢除脂肪量', unit: 'kg' },
];

function ValueBox({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-bold">
        {value == null ? '—' : value}
        {value != null && unit ? <span className="ml-1 text-xs font-normal">{unit}</span> : null}
      </p>
    </div>
  );
}

function MetricItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <p className="text-sm font-medium">{formatMetric(value, unit)}</p>
    </div>
  );
}

function ConsentNotGranted({ status }: { status: BodyDataConsentStatus }) {
  const isDenied = status === 'denied';
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">ボディーデータ</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div
              className={`flex size-12 items-center justify-center rounded-full ${
                isDenied ? 'bg-destructive/10' : 'bg-muted'
              }`}
            >
              {isDenied ? (
                <ShieldOff className="text-destructive size-6" />
              ) : (
                <Lock className="text-muted-foreground size-6" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">
                {isDenied
                  ? '会員が情報連携を拒否しています'
                  : 'この会員はCRMへのボディデータ連携に同意していません。'}
              </p>
              <p className="text-muted-foreground text-xs">
                {isDenied
                  ? 'ボディーデータは閲覧できません。'
                  : 'データを表示するには、会員がアプリから同意操作を行う必要があります。'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * FR-038: the consent state comes with the member bundle, so a member who has not granted it never
 * triggers a body-data request.
 */
export function BodyDataTab({
  memberId,
  consentStatus,
}: {
  memberId: string;
  consentStatus: MemberBodyDataConsentStateDto['status'];
}) {
  if (consentStatus !== 'granted') return <ConsentNotGranted status={consentStatus} />;
  return <BodyDataContent memberId={memberId} />;
}

function BodyMeasurementCard({ latest }: { latest: MemberBodyMeasurementDto | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          身体データ
          <span className="text-muted-foreground ml-1 text-xs font-normal">
            3DScanner 連携 / 手動入力
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {latest ? (
          // Labels and order follow the 14 部位 the app records (APP-B-02 FR-M001); left and right
          // stay in their own cell, as they are separate columns in both the app and the API.
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-4">
            <MetricItem label="首周り" value={latest.neckCm} unit="cm" />
            <MetricItem label="肩幅" value={latest.shoulderWidthCm} unit="cm" />
            <MetricItem label="胸囲" value={latest.chestCm} unit="cm" />
            <MetricItem label="腹囲" value={latest.abdomenCm} unit="cm" />
            <MetricItem label="上腕（左）" value={latest.upperArmLeftCm} unit="cm" />
            <MetricItem label="上腕（右）" value={latest.upperArmRightCm} unit="cm" />
            <MetricItem label="前腕（左）" value={latest.forearmLeftCm} unit="cm" />
            <MetricItem label="前腕（右）" value={latest.forearmRightCm} unit="cm" />
            <MetricItem label="腰回り" value={latest.waistCm} unit="cm" />
            <MetricItem label="ヒップ" value={latest.hipCm} unit="cm" />
            <MetricItem label="太もも（左）" value={latest.thighLeftCm} unit="cm" />
            <MetricItem label="太もも（右）" value={latest.thighRightCm} unit="cm" />
            <MetricItem label="ふくらはぎ（左）" value={latest.calfLeftCm} unit="cm" />
            <MetricItem label="ふくらはぎ（右）" value={latest.calfRightCm} unit="cm" />
            <MetricItem label="身長" value={latest.heightCm} unit="cm" />
          </div>
        ) : (
          // `bodyRecords` and `bodyMeasurements` are independent tables: a member can have
          // composition rows with no girth session, so this card empties on its own.
          <p className="text-muted-foreground py-4 text-center text-xs">
            身体データの記録がありません
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 測定履歴 — the newest rows of the merged history inline, the full list behind 「全件を表示」
 * (prototype 2026-09-17).
 */
function MeasurementHistoryCard({ memberId }: { memberId: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery(
    adminMemberActivityControllerBodyHistoryOptions({
      path: { memberId },
      query: { page: 1, limit: HISTORY_PREVIEW_COUNT },
    }),
  );
  const records = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">測定履歴</CardTitle>
          {data && (
            <Badge variant="secondary" className="text-[10px]">
              全{total}件
            </Badge>
          )}
        </div>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">測定日</TableHead>
            <TableHead className="text-xs font-semibold">データソース</TableHead>
            <TableHead className="text-right text-xs font-semibold">体重</TableHead>
            <TableHead className="text-right text-xs font-semibold">体脂肪率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={`history-skeleton-${index}`}>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-6 text-center text-xs">
                <div className="flex flex-col items-center gap-2">
                  <p>測定履歴の取得に失敗しました</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                    再読み込み
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-6 text-center text-xs">
                測定履歴がありません
              </TableCell>
            </TableRow>
          ) : (
            records.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(item.recordedAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {SOURCE_LABELS[item.source]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {formatMetric(item.weightKg, 'kg')}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {formatMetric(item.bodyFatPercent, '%')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {total > HISTORY_PREVIEW_COUNT ? (
        <CardContent className="border-t px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={() => setSheetOpen(true)}
          >
            全{total}件を表示
          </Button>
        </CardContent>
      ) : null}
      <MeasurementHistorySheet memberId={memberId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </Card>
  );
}

/**
 * 推移グラフ — one indicator over the member's whole history, read from `body-data/trend` so the
 * line is not cut at the newest 100 records.
 */
function BodyTrendCard({ memberId }: { memberId: string }) {
  const [chartMetric, setChartMetric] = useState<BodyChartMetric>('weightKg');
  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    ...adminMemberActivityControllerBodyTrendOptions({
      path: { memberId },
      query: { indicator: chartMetric },
    }),
    // Keep the previous line on screen (dimmed) while the next indicator loads, instead of
    // dropping the chart and redrawing it
    placeholderData: keepPreviousData,
  });

  const metricOption =
    CHART_METRIC_OPTIONS.find((option) => option.value === chartMetric) ?? CHART_METRIC_OPTIONS[0];
  const chartConfig = {
    value: {
      label: metricOption.unit
        ? `${metricOption.label} (${metricOption.unit})`
        : metricOption.label,
      color: 'var(--chart-1)',
    },
  } satisfies ChartConfig;
  // The API returns points oldest-first, which is how the chart reads.
  const metricChart = (data?.points ?? []).map((point) => ({
    date: formatDate(point.date).slice(5),
    value: point.value,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="text-muted-foreground size-4" />
            <CardTitle className="text-base font-semibold">推移グラフ</CardTitle>
          </div>
          <Select
            value={chartMetric}
            onValueChange={(value) => setChartMetric(value as BodyChartMetric)}
            items={CHART_METRIC_OPTIONS}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {CHART_METRIC_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <Skeleton className="h-45 w-full" />
        ) : isError ? (
          <div className="text-muted-foreground flex h-45 flex-col items-center justify-center gap-2 text-xs">
            <p>推移グラフの取得に失敗しました</p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              再読み込み
            </Button>
          </div>
        ) : metricChart.length === 0 ? (
          <p className="text-muted-foreground flex h-45 items-center justify-center text-xs">
            この指標の記録がありません
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className={cn('h-45 w-full transition-opacity', isPlaceholderData && 'opacity-50')}
            aria-busy={isPlaceholderData}
          >
            <LineChart data={metricChart} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                fontSize={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickCount={4}
                tickMargin={4}
                fontSize={10}
                domain={['auto', 'auto']}
                tickFormatter={(value: number) => `${value}${metricOption.unit ?? ''}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Card-shaped placeholder for the loaded layout: summary row, then the 60 / 40 columns. */
function BodyDataSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-36 w-full" />
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex w-full flex-col gap-4 md:w-[60%]">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="flex w-full flex-col gap-4 md:w-[40%]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

function BodyDataContent({ memberId }: { memberId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery(
    adminMemberActivityControllerBodyDataOptions({
      path: { memberId },
      query: { page: 1, limit: LATEST_RECORD_LIMIT },
    }),
  );

  const consentStatus = isError ? getBodyDataConsentStatus(error) : null;
  if (consentStatus) return <ConsentNotGranted status={consentStatus} />;

  const records = data?.bodyRecords.items ?? [];
  const latestRecord = records.at(0);
  const latestMeasurement = data?.bodyMeasurements.items.at(0);

  return (
    <DataStateBoundary
      isLoading={isLoading}
      isError={isError}
      // FR-013 異常系: no measurement of any kind means there is nothing to summarise.
      isEmpty={!data || (records.length === 0 && data.bodyMeasurements.items.length === 0)}
      emptyTitle="まだボディーデータの記録がありません"
      emptyDescription="会員がアプリで測定を記録すると、ここに表示されます。"
      onRetry={() => refetch()}
      skeleton={<BodyDataSkeleton />}
    >
      {data ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                最新記録サマリー（{formatDate(data.latestSummary?.recordedAt)}）
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <ValueBox label="体重" value={data.latestSummary?.weightKg ?? null} unit="kg" />
                <ValueBox label="BMI" value={data.latestSummary?.bmi ?? null} />
                <ValueBox
                  label="体脂肪率"
                  value={data.latestSummary?.bodyFatPercent ?? null}
                  unit="%"
                />
                <ValueBox
                  label="骨格筋量"
                  value={data.latestSummary?.skeletalMuscleKg ?? null}
                  unit="kg"
                />
                <ValueBox
                  label="基礎代謝量"
                  value={data.latestSummary?.bmrKcal ?? null}
                  unit="kcal"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex w-full flex-col gap-4 md:w-[60%]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    体組成データ
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      Body Planner 連携
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-4">
                    <MetricItem label="体重" value={latestRecord?.weightKg} unit="kg" />
                    <MetricItem label="BMI" value={latestRecord?.bmi} />
                    <MetricItem label="体脂肪率" value={latestRecord?.bodyFatPercent} unit="%" />
                    <MetricItem label="体脂肪量" value={latestRecord?.fatMassKg} unit="kg" />
                    <MetricItem label="内臓脂肪指数" value={latestRecord?.visceralFatIndex} />
                    <MetricItem label="骨格筋指数(SMI)" value={latestRecord?.smi} />
                    <MetricItem label="骨格筋量" value={latestRecord?.skeletalMuscleKg} unit="kg" />
                    <MetricItem label="推定骨量" value={latestRecord?.boneMassKg} unit="kg" />
                    <MetricItem label="水分量" value={latestRecord?.waterMassKg} unit="kg" />
                    <MetricItem label="基礎代謝量" value={latestRecord?.bmrKcal} unit="kcal" />
                    <MetricItem label="除脂肪量" value={latestRecord?.leanMassKg} unit="kg" />
                    <MetricItem
                      label="四肢除脂肪量"
                      value={latestRecord?.limbLeanMassKg}
                      unit="kg"
                    />
                  </div>
                </CardContent>
              </Card>

              <BodyMeasurementCard latest={latestMeasurement} />
            </div>

            <div className="flex w-full flex-col gap-4 md:sticky md:top-0 md:w-[40%] md:self-start">
              <BodyTrendCard memberId={memberId} />

              <MeasurementHistoryCard memberId={memberId} />
            </div>
          </div>
        </div>
      ) : null}
    </DataStateBoundary>
  );
}
