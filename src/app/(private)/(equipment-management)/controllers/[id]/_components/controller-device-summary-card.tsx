'use client';

import { useRouter } from 'next/navigation';

import { ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { EQUIPMENT_STATUS_BADGE_MAP } from '../../../equipment/_constants/constants';
import { useControllerDeviceStatusCounts } from '../../_hooks/use-controller-devices';

type ControllerDetail = RelayControllerDetailDto;

interface ControllerDeviceSummaryCardProps {
  controller: ControllerDetail;
}

export function ControllerDeviceSummaryCard({ controller }: ControllerDeviceSummaryCardProps) {
  const router = useRouter();
  // API-104 has no device summary: 正常 / 異常 are one-row list counts (D16). BUG-E02-E-05 —
  // without a count (loading, or the request failed) the badge shows 「—」, never a false 0台.
  const counts = useControllerDeviceStatusCounts(controller);
  const formatCount = (count: number | undefined) => (count === undefined ? '—' : `${count}台`);
  const summary = {
    total: controller.connectedDeviceCount,
    normal: formatCount(counts.normal),
    error: formatCount(counts.abnormal),
  };
  // The counts are of connected devices, so they carry the device status palette.
  const normalBadge = EQUIPMENT_STATUS_BADGE_MAP.normal;
  const errorBadge = EQUIPMENT_STATUS_BADGE_MAP.abnormal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">紐付き機器サマリー</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">紐付き機器数</span>
            <span className="text-sm font-semibold">{summary.total}台</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">正常</span>
            <Badge variant="outline" className={normalBadge.badgeClassName}>
              <span className={`size-1.5 rounded-full ${normalBadge.dotClassName}`} />
              {summary.normal}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">異常</span>
            <Badge variant="outline" className={errorBadge.badgeClassName}>
              <span className={`size-1.5 rounded-full ${errorBadge.dotClassName}`} />
              {summary.error}
            </Badge>
          </div>
          <div className="border-t pt-2">
            {/* The prototype's link leaves for the 接続機器一覧 screen, not the tab next door. */}
            <Button
              variant="link"
              size="sm"
              className="h-auto gap-1 p-0 text-xs"
              onClick={() => router.push(navigate('/equipment'))}
            >
              機器一覧を見る
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
