'use client';

import { useRouter } from 'next/navigation';

import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  CONTROLLER_STATUS_BADGE_MAP,
  CONTROLLER_STATUS_LABELS,
} from '../../../controllers/_constants/constants';

interface EquipmentControllerCardProps {
  equipment: ConnectedDeviceDetailDto;
}

/** API-103 §5.1 nested relay-controller card (D18). */
export function EquipmentControllerCard({ equipment }: EquipmentControllerCardProps) {
  const router = useRouter();
  const controller = equipment.relayController;

  if (!controller) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">接点制御装置</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-muted-foreground text-sm">—</p>
        </CardContent>
      </Card>
    );
  }

  const status = controller.status;
  const statusBadge = CONTROLLER_STATUS_BADGE_MAP[status];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">接点制御装置</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-3">
          {/* FR-007: 装置ID and 装置名 are separate items, as the prototype renders them. */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground shrink-0 text-xs">装置ID</span>
            <span
              className="min-w-0 truncate font-mono text-sm font-medium"
              title={controller.relayId}
            >
              {controller.relayId}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground shrink-0 text-xs">装置名</span>
            {/* An unbroken name wraps instead of pushing the row past the card edge. */}
            <span className="min-w-0 text-right text-sm font-medium wrap-anywhere">
              {controller.name.trim() || '—'}
            </span>
          </div>
          {/*
           * TODO(round3) R303: the prototype shows `IP:ポート`; the HTTP port is not an FR-007 item
           * and API-103 always returns `httpPort: null` — integrate in phase 2. Label and value
           * were `IP:ポート` / `{controller.ipAddress}:{controller.port}`.
           */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">IPアドレス</span>
            <span className="font-mono text-sm font-medium">{controller.ipAddress ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">ステータス</span>
            {statusBadge ? (
              <Badge variant="outline" className={statusBadge.badgeClassName}>
                <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
                {CONTROLLER_STATUS_LABELS[status]}
              </Badge>
            ) : (
              <span className="text-sm">{controller.status}</span>
            )}
          </div>
          <div className="border-t pt-2">
            <Button
              variant="link"
              size="sm"
              className="h-auto gap-1 p-0 text-xs"
              onClick={() => router.push(navigate('/controllers/[id]', controller.id))}
            >
              装置詳細を見る
              <ArrowRight className="size-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
