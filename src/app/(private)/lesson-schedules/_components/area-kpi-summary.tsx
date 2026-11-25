'use client';

import { AlertTriangle, CircleAlert, MapPin } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

import type { LessonAreaDashboardCrossKpiDto } from '@/lib/api-real/types.gen';

interface AreaKpiSummaryProps {
  crossKpi: LessonAreaDashboardCrossKpiDto;
}

export function AreaKpiSummary({ crossKpi }: AreaKpiSummaryProps) {
  const totalStores = crossKpi.storeCount;
  const totalAlerts = crossKpi.alertCount;
  const abnormalStores = crossKpi.alertStoreCount;

  return (
    <div className="grid shrink-0 grid-cols-3 gap-4">
      {/* 管理店舗数 */}
      <Card>
        <CardContent className="px-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">管理店舗数</span>
            <MapPin className="text-info size-4" />
          </div>
          <p className="text-2xl font-bold">
            {totalStores}
            <span className="text-muted-foreground ml-1 text-sm font-normal">店舗</span>
          </p>
        </CardContent>
      </Card>

      {/* 要対応アラート数 */}
      <Card>
        <CardContent className="px-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">要対応アラート数</span>
            <CircleAlert className="text-destructive size-4" />
          </div>
          <p className={`text-2xl font-bold ${totalAlerts > 0 ? 'text-destructive' : ''}`}>
            {totalAlerts}
            <span className="text-muted-foreground ml-1 text-sm font-normal">件</span>
          </p>
        </CardContent>
      </Card>

      {/* 異常店舗数 */}
      <Card>
        <CardContent className="px-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">異常店舗数</span>
            <AlertTriangle className="text-warning size-4" />
          </div>
          <p className={`text-2xl font-bold ${abnormalStores > 0 ? 'text-warning' : ''}`}>
            {abnormalStores}
            <span className="text-muted-foreground ml-1 text-sm font-normal">店舗</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
