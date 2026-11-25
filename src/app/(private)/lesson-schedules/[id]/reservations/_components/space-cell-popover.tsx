'use client';

import { memo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Users, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { adminLessonBookingControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonBookingSeatStatusDto } from '@/lib/api-real/types.gen';

import {
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABELS,
} from '../_constants/booking-status.constants';

interface SpaceCellPopoverProps {
  seat: LessonBookingSeatStatusDto;
  cellClass: string;
  /** FR-008 — whether the current role may cancel this reservation */
  canCancel: boolean;
  onCancelReservation: (bookingId: string) => void;
  /** Omitted when the current role may not open 会員詳細 (no `MembersView`) — the button is then hidden. */
  onNavigateToMember?: (memberId: string) => void;
}

function SpaceCellPopoverComponent({
  seat,
  cellClass,
  canCancel,
  onCancelReservation,
  onNavigateToMember,
}: Readonly<SpaceCellPopoverProps>) {
  // Controlled only so cancel/navigate can close the popover programmatically.
  // Hover open/close (and the safe trigger→popup transition) is handled natively
  // by base-ui, so the cursor can travel to the action buttons without it closing.
  const [open, setOpen] = useState(false);
  // Every held seat shows its booking status, not only a pending hold (BUG-D01A-07).
  const bookingStatus = seat.bookingStatus;
  // seats[] names no holder for a pending hold; the booking detail does (D01A-13).
  const detailQuery = useQuery({
    ...adminLessonBookingControllerDetailOptions({ path: { bookingId: seat.bookingId ?? '' } }),
    enabled: open && seat.memberDisplayName === null && seat.bookingId !== null,
  });
  const memberName =
    seat.memberDisplayName ??
    detailQuery.data?.memberDisplayName ??
    (detailQuery.isFetching ? '…' : '—');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={false}
        openOnHover
        delay={200}
        closeDelay={150}
        render={<div className={cellClass} />}
      >
        {seat.seatNumber}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto p-3" align="center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="bg-muted flex size-6 items-center justify-center rounded-full text-[10px] font-medium">
              {memberName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{memberName}</p>
              <p className="text-muted-foreground text-[10px]">スペース {seat.seatNumber}</p>
            </div>
            {bookingStatus && (
              <Badge
                variant="outline"
                className={`${BOOKING_STATUS_BADGE_CLASS[bookingStatus]} text-[10px]`}
              >
                {BOOKING_STATUS_LABELS[bookingStatus]}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {onNavigateToMember && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 flex-1 text-xs"
                disabled={!seat.memberId}
                onClick={() => {
                  if (seat.memberId) onNavigateToMember(seat.memberId);
                  setOpen(false);
                }}
              >
                <Users className="mr-1 size-3" />
                会員詳細
              </Button>
            )}
            {canCancel && seat.bookingId && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 flex-1 text-xs"
                onClick={() => {
                  onCancelReservation(seat.bookingId as string);
                  setOpen(false);
                }}
              >
                <X className="mr-1 size-3" />
                予約取消
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const SpaceCellPopover = memo(SpaceCellPopoverComponent);
