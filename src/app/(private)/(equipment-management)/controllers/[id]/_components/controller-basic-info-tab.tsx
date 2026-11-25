'use client';

import { useState } from 'react';

import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';

import { ControllerDeviceSummaryCard } from './controller-device-summary-card';
import { ControllerInfoCard } from './controller-info-card';
import { ControllerMetaCard } from './controller-meta-card';
import { ControllerStatusCard } from './controller-status-card';
import { ControllerStatusDialog } from './controller-status-dialog';

type ControllerDetail = RelayControllerDetailDto;

interface ControllerBasicInfoTabProps {
  controller: ControllerDetail;
}

export function ControllerBasicInfoTab({ controller }: ControllerBasicInfoTabProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* `min-w-0`: an `fr` track would otherwise grow to an unbroken value (BUG-E02-E-09). */}
        <div className="flex min-w-0 flex-col gap-4">
          <ControllerInfoCard controller={controller} />
        </div>
        {/* The page header sits outside this scroll container, so the column sticks at the
            scrollport's top edge; `top-4` keeps the same 16px gap below the header as at rest
            instead of sitting flush against it (BUG-E02-E-04). */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <ControllerStatusCard
            controller={controller}
            onStatusChange={() => setStatusDialogOpen(true)}
          />
          <ControllerDeviceSummaryCard controller={controller} />
          <ControllerMetaCard controller={controller} />
        </div>
      </div>

      <ControllerStatusDialog
        controller={controller}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
      />
    </>
  );
}
