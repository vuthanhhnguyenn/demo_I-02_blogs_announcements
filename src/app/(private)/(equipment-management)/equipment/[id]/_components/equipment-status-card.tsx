'use client';

import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Ban, Check, Wrench } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  EQUIPMENT_STATUS_BADGE_MAP,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from '../../_constants/constants';

type EquipmentDetail = ConnectedDeviceDetailDto;

const STATUS_ICON_MAP: Record<
  EquipmentStatus,
  { icon: LucideIcon; iconClassName: string; bgClassName: string }
> = {
  normal: {
    icon: Check,
    iconClassName: 'text-success',
    bgClassName: 'bg-success/15',
  },
  abnormal: {
    icon: AlertTriangle,
    iconClassName: 'text-destructive',
    bgClassName: 'bg-destructive/15',
  },
  under_maintenance: {
    icon: Wrench,
    iconClassName: 'text-warning',
    bgClassName: 'bg-warning/15',
  },
  discarded: {
    icon: Ban,
    iconClassName: 'text-muted-foreground',
    bgClassName: 'bg-muted',
  },
};

interface EquipmentStatusCardProps {
  equipment: EquipmentDetail;
  onStatusChange: () => void;
}

export function EquipmentStatusCard({ equipment, onStatusChange }: EquipmentStatusCardProps) {
  const statusBadge = EQUIPMENT_STATUS_BADGE_MAP[equipment.status];
  const statusIcon = STATUS_ICON_MAP[equipment.status];
  const StatusIcon = statusIcon.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">ステータス</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center px-4">
        <div
          className={`mb-3 flex size-20 items-center justify-center rounded-full ${statusIcon.bgClassName}`}
        >
          <StatusIcon className={`size-10 ${statusIcon.iconClassName}`} />
        </div>
        <Badge variant="outline" className={statusBadge.badgeClassName}>
          <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
          {EQUIPMENT_STATUS_LABELS[equipment.status]}
        </Badge>
        {/*
         * TODO(round3) R302: 最終確認日時 is a prototype-only item (not in E-02) and API-103 has no
         * such field — integrate in phase 2.
         * <p className="text-muted-foreground mt-3 text-xs">
         *   最終確認日時: {formatDateYYYYMMDD_HHMM(equipment.lastStatusConfirmedAt)}
         * </p>
         */}
        <div className="mt-4 w-full border-t pt-4">
          <RoleGatedButton
            requiredPermission={Permission.EquipmentEdit}
            denyTooltip="ステータス変更権限がありません"
            size="sm"
            fullWidth
            onClick={onStatusChange}
          >
            ステータス変更
          </RoleGatedButton>
        </div>
      </CardContent>
    </Card>
  );
}
