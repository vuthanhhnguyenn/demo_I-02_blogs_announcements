'use client';

import { useState } from 'react';

import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';

import { EquipmentControllerCard } from './equipment-controller-card';
import { EquipmentInfoCard } from './equipment-info-card';
import { EquipmentMetaCard } from './equipment-meta-card';
import { EquipmentStatusCard } from './equipment-status-card';
import { EquipmentStatusDialog } from './equipment-status-dialog';
import { EquipmentUsageRuleCard } from './equipment-usage-rule-card';

type EquipmentDetail = ConnectedDeviceDetailDto;

interface EquipmentBasicInfoTabProps {
  equipment: EquipmentDetail;
}

export function EquipmentBasicInfoTab({ equipment }: EquipmentBasicInfoTabProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  return (
    <>
      {/* `min-w-0` on both columns: an `fr` track's minimum is its content width, so a long
          unbroken value (a 128-char 接点制御装置ID) would otherwise widen the grid past the page. */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <EquipmentInfoCard equipment={equipment} />
          <EquipmentUsageRuleCard equipment={equipment} />
        </div>
        {/* The page header sits outside this scroll container, so the column sticks at the
            scrollport's top edge; `top-4` keeps the same 16px gap below the header as at rest
            instead of sitting flush against it (BUG-E02-E-04). */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <EquipmentStatusCard
            equipment={equipment}
            onStatusChange={() => setStatusDialogOpen(true)}
          />
          <EquipmentControllerCard equipment={equipment} />
          <EquipmentMetaCard equipment={equipment} />
        </div>
      </div>

      <EquipmentStatusDialog
        equipment={equipment}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
      />
    </>
  );
}
