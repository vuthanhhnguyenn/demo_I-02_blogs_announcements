'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { TransferListItemDto } from '@/lib/api-real/types.gen';

import {
  TRANSFER_EXCLUSION_LABELS,
  type TransferExclusionReason,
  getCancellationFeeRemainingDays,
} from '../_constants/constants';

const EXCLUSION_BADGE_CLASSES = {
  arrears: 'bg-destructive/15 text-destructive border-destructive/20',
  cancellation_fee_period: 'bg-warning/15 text-warning border-warning/20',
} as const;

/**
 * 自動移籍可否 cell (FR-001).
 *
 * The API fills `autoTransfer` only for JOYFIT × 移籍元承認待ち; anything else (FIT365, or a
 * decided row) renders an em dash rather than a "not eligible" badge — "excluded" is an
 * actionable state, "not applicable" is not. Both exclusion reasons can hold at once.
 *
 * Each exclusion badge carries the prototype's tooltip (未納金額 / 縛り残り日数) when the API
 * supplies the figure (`arrears.outstandingAmount` / `cancellationFeeUntil`).
 */
export function TransferAutoBadge({
  autoTransfer,
}: Readonly<{ autoTransfer: TransferListItemDto['autoTransfer'] }>) {
  // Captured once so the remaining-days figure does not shift between renders.
  const [today] = useState(() => new Date());

  if (!autoTransfer) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  if (autoTransfer.eligibility === 'eligible') {
    return (
      <Badge variant="outline" className="bg-success/15 text-success border-success/20 text-[10px]">
        自動可
      </Badge>
    );
  }

  const remainingDays = getCancellationFeeRemainingDays(autoTransfer.cancellationFeeUntil, today);
  const tooltips: Record<TransferExclusionReason, string | null> = {
    arrears: autoTransfer.arrears
      ? `未納金: ¥${autoTransfer.arrears.outstandingAmount.toLocaleString()}`
      : null,
    cancellation_fee_period: remainingDays === null ? null : `残り ${remainingDays}日`,
  };

  return (
    <div className="flex flex-col gap-1">
      {autoTransfer.exclusionReasons.map((reason) => {
        const badge = (
          <Badge
            variant="outline"
            className={`w-fit cursor-default text-[10px] ${EXCLUSION_BADGE_CLASSES[reason]}`}
          >
            {TRANSFER_EXCLUSION_LABELS[reason]}
          </Badge>
        );
        const tooltip = tooltips[reason];
        if (!tooltip) return <span key={reason}>{badge}</span>;
        return (
          <TooltipProvider key={reason}>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>{badge}</TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
