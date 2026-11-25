'use client';

import {
  AlertTriangle,
  BarChart3,
  Calendar as CalendarIcon,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

import type { LessonScheduleDashboardDto } from '@/lib/api-real/types.gen';

import { toPercent } from '../_utils/lesson-schedule-api.util';

interface KpiSummaryProps {
  dashboard: LessonScheduleDashboardDto;
}

export function KpiSummary({ dashboard }: KpiSummaryProps) {
  const { lessonKpi, fillRate, changeKpi, staffKpi } = dashboard;
  // fillRate is 0.0–1.0 and null when nothing published that day; 前週比 is FE-derived (points)
  const rate = toPercent(fillRate.today);
  const change =
    fillRate.today !== null && fillRate.weekAgo !== null
      ? Math.round((fillRate.today - fillRate.weekAgo) * 1000) / 10
      : null;
  // パーソナル covers both one-to-one lesson types
  const personalCount = lessonKpi.byType.personalTraining + lessonKpi.byType.bodyCare;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-4 md:grid-cols-4">
      {/* Card 1: 本日のレッスン */}
      <Card>
        <CardContent className="px-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">本日のレッスン</span>
            <CalendarIcon className="text-info size-4" />
          </div>
          <p className="text-2xl font-bold">
            {lessonKpi.total}
            <span className="text-muted-foreground ml-1 text-sm font-normal">コマ</span>
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            スタジオ {lessonKpi.byType.studio} / パーソナル {personalCount}
          </p>
        </CardContent>
      </Card>

      {/* Card 2: 予約充足率 */}
      <Card>
        <CardContent className="px-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">予約充足率</span>
            <BarChart3 className="text-success size-4" />
          </div>
          <p className="text-2xl font-bold">
            {rate ?? '—'}
            {rate !== null && (
              <span className="text-muted-foreground ml-0.5 text-sm font-normal">%</span>
            )}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-success h-full rounded-full"
                style={{ width: `${Math.min(rate ?? 0, 100)}%` }}
              />
            </div>
            {change !== null && (
              <span
                className={`flex items-center gap-0.5 text-[11px] ${change >= 0 ? 'text-success' : 'text-destructive'}`}
              >
                {change >= 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {change >= 0 ? '+' : ''}
                {change}%
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: 本日の変更 */}
      <Card>
        <CardContent className="px-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">本日の変更</span>
            <AlertTriangle className="text-warning size-4" />
          </div>
          <p className="text-2xl font-bold">
            {changeKpi.total}
            <span className="text-muted-foreground ml-1 text-sm font-normal">件</span>
          </p>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[11px]">
            <span>キャンセル {changeKpi.cancelled}</span>
            <span>時間変更 {changeKpi.timeChanged}</span>
            <span>担当変更 {changeKpi.trainerChanged}</span>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: 本日の担当スタッフ */}
      <Card>
        <CardContent className="px-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">本日の担当スタッフ</span>
            <Users className="text-info size-4" />
          </div>
          <p className="text-2xl font-bold">
            {staffKpi.total}
            <span className="text-muted-foreground ml-1 text-sm font-normal">名</span>
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            インストラクター {staffKpi.instructor} / トレーナー {staffKpi.trainer}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
