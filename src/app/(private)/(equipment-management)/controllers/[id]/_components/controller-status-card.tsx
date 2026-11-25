'use client';

import { Cpu, RefreshCw } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  CONTROLLER_STATUS_BADGE_MAP,
  CONTROLLER_STATUS_LABELS,
  type ControllerStatus,
} from '../../_constants/constants';

type ControllerDetail = RelayControllerDetailDto;

// The prototype's StatusCard takes one icon for the whole screen (Cpu — the unit itself) and
// varies only the tone, so the status is read from the badge, not from a changing glyph.
const STATUS_TONE_MAP: Record<ControllerStatus, { iconClassName: string; bgClassName: string }> = {
  normal: { iconClassName: 'text-success', bgClassName: 'bg-success/10' },
  abnormal: { iconClassName: 'text-destructive', bgClassName: 'bg-destructive/10' },
  under_maintenance: { iconClassName: 'text-warning', bgClassName: 'bg-warning/10' },
  discarded: { iconClassName: 'text-muted-foreground', bgClassName: 'bg-muted' },
};

interface ControllerStatusCardProps {
  controller: ControllerDetail;
  onStatusChange: () => void;
}

export function ControllerStatusCard({ controller, onStatusChange }: ControllerStatusCardProps) {
  const statusBadge = CONTROLLER_STATUS_BADGE_MAP[controller.status];
  const tone = STATUS_TONE_MAP[controller.status];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">ステータス</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center px-4">
        <div
          className={`mb-3 flex size-20 items-center justify-center rounded-full ${tone.bgClassName}`}
        >
          <Cpu className={`size-10 ${tone.iconClassName}`} />
        </div>
        <Badge variant="outline" className={statusBadge.badgeClassName}>
          <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
          {CONTROLLER_STATUS_LABELS[controller.status]}
        </Badge>
        <div className="mt-4 w-full border-t pt-4">
          <RoleGatedButton
            requiredPermission={Permission.ControllerEdit}
            denyTooltip="ステータス変更権限がありません"
            size="sm"
            fullWidth
            onClick={onStatusChange}
            variant="outline"
          >
            <RefreshCw className="size-4" />
            ステータス変更
          </RoleGatedButton>
        </div>
      </CardContent>
    </Card>
  );
}
