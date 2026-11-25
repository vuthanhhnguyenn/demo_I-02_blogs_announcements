'use client';

import { memo, useMemo } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { LessonBookingSeatStatusDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  SEAT_TYPE_LABELS,
  isCancellableBookingStatus,
} from '../_constants/booking-status.constants';
import { isFreeSeat } from '../_utils/booking-create.util';
import { isOwnSessionScope } from '../_utils/session-scope.util';
import { GridLegend } from './grid-legend';
import { SpaceCellPopover } from './space-cell-popover';

const DEFAULT_GRID_COLS = 8;

/** Available (bookable) seat — click adds a reservation. Memoized so hovering
 * one cell never re-renders its siblings. */
const AvailableCell = memo(function AvailableCell({
  studioSeatId,
  seatNumber,
  cellClass,
  onAddReservation,
}: Readonly<{
  studioSeatId: string;
  seatNumber: string | null;
  cellClass: string;
  onAddReservation: (studioSeatId: string) => void;
}>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<div className={cellClass} onClick={() => onAddReservation(studioSeatId)} />}
      >
        {seatNumber}
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>空き — クリックで予約追加</p>
      </TooltipContent>
    </Tooltip>
  );
});

interface SpaceReservationGridProps {
  /** `booking-stats.seats[]` — every seat of the studio with its live booking state. A pending
   * hold is a holder too (API-113 v0.14 §4.3): `bookingId` / `memberId` are set, `bookingStatus`
   * is `'pending'`. */
  seats: LessonBookingSeatStatusDto[];
  /** 中止済み lesson — free seats are not clickable and 予約取消 is hidden (the server would
   * refuse both: 422 E-LSB-005 / E-LSB-015). */
  isCancelled: boolean;
  onAddReservation: (studioSeatId: string) => void;
  onCancelReservation: (bookingId: string) => void;
  onNavigateToMember?: (memberId: string) => void;
}

export function SpaceReservationGrid({
  seats,
  isCancelled,
  onAddReservation,
  onCancelReservation,
  onNavigateToMember,
}: SpaceReservationGridProps) {
  const { hasPermission, user } = useAuthUser();
  const canManageReservation =
    hasPermission(Permission.LessonsReservationManage) && isOwnSessionScope(user) && !isCancelled;

  const { orderedSeats, cols, reservedCount, totalSeats } = useMemo(() => {
    // The API carries the studio layout as (rowIndex, columnIndex); render in reading order.
    const maxColumn = seats.reduce((max, s) => Math.max(max, s.columnIndex), -1);
    const columns = maxColumn >= 0 ? maxColumn + 1 : DEFAULT_GRID_COLS;
    const ordered = [...seats].sort(
      (a, b) => a.rowIndex - b.rowIndex || a.columnIndex - b.columnIndex,
    );
    let reserved = 0;
    let total = 0;
    for (const seat of ordered) {
      if (seat.seatType !== 'normal') continue;
      total += 1;
      if (seat.bookingStatus !== null) reserved += 1;
    }
    return { orderedSeats: ordered, cols: columns, reservedCount: reserved, totalSeats: total };
  }, [seats]);

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div
          className="grid w-fit justify-center gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, 3rem)` }}
        >
          {orderedSeats.map((seat) => {
            const isEquip = seat.seatType === 'equipment';
            const isFixed = seat.seatType === 'structure';
            const isEmpty = seat.seatType === 'empty';
            const isAvailable = isFreeSeat(seat);
            // A pending hold is styled apart from a confirmed booking (BUG-D01A-07).
            const isHeld = seat.seatType === 'normal' && !isAvailable;
            const isPendingHold = isHeld && seat.bookingStatus === 'pending';

            if (isEmpty) {
              return <div key={seat.studioSeatId} className="size-12" aria-hidden />;
            }

            let cls =
              'size-12 rounded flex items-center justify-center text-xs font-medium border transition-colors select-none ';

            if (isEquip) {
              cls += 'bg-warning/15 text-warning border-warning/20';
            } else if (isFixed) {
              cls += 'bg-muted text-muted-foreground border-border';
            } else if (isPendingHold) {
              cls +=
                'bg-warning/15 text-warning border-warning/40 border-dashed cursor-pointer hover:bg-warning/25';
            } else if (isHeld) {
              cls +=
                'bg-chart-2/20 text-chart-2 border-chart-2/30 cursor-pointer hover:bg-chart-2/30';
            } else if (canManageReservation) {
              // FR-007: 空き is white (CRM UT D-01 No18).
              cls += 'bg-background text-foreground border-border cursor-pointer hover:bg-accent';
            } else {
              cls += 'bg-background text-foreground border-border';
            }

            if (isEquip || isFixed) {
              return (
                <div key={seat.studioSeatId} className={cls}>
                  {SEAT_TYPE_LABELS[seat.seatType]}
                </div>
              );
            }

            if (isAvailable) {
              if (!canManageReservation) {
                return (
                  <div key={seat.studioSeatId} className={cls}>
                    {seat.seatNumber}
                  </div>
                );
              }
              return (
                <AvailableCell
                  key={seat.studioSeatId}
                  studioSeatId={seat.studioSeatId}
                  seatNumber={seat.seatNumber}
                  cellClass={cls}
                  onAddReservation={onAddReservation}
                />
              );
            }

            // Held — reserved / attended / pending
            return (
              <SpaceCellPopover
                key={seat.studioSeatId}
                seat={seat}
                cellClass={cls}
                canCancel={
                  canManageReservation &&
                  seat.bookingId !== null &&
                  seat.bookingStatus !== null &&
                  isCancellableBookingStatus(seat.bookingStatus)
                }
                onCancelReservation={onCancelReservation}
                onNavigateToMember={onNavigateToMember}
              />
            );
          })}
        </div>
      </div>

      <div className="bg-muted/50 -mx-4 mt-4 -mb-4 flex items-center justify-between rounded-b-xl border-t px-4 py-3">
        <GridLegend />
        <span className="text-muted-foreground text-xs">
          {reservedCount}/{totalSeats} 予約済（残り{totalSeats - reservedCount}席）
        </span>
      </div>
    </TooltipProvider>
  );
}
