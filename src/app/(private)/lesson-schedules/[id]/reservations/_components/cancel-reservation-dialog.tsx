'use client';

import { useRef, useState } from 'react';

import { formatDateMDWeekday } from '@/utils/date.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import {
  adminLessonBookingControllerCancelMutation,
  adminLessonBookingControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  LessonBookingListItemDto,
  LessonBookingSeatStatusDto,
  LessonScheduleDetailDto,
} from '@/lib/api-real/types.gen';

import {
  BOOKING_CANCEL_CAUSE_OPTIONS,
  type BookingCancelCause,
} from '../_constants/booking-status.constants';
import { invalidateBookingQueries } from '../_utils/booking-api.util';

interface CancelReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  /** Date / time for the target line when the row is not on the loaded page (BUG-D01B-11). */
  schedule: LessonScheduleDetailDto;
  /** `booking-stats.seats[]` — resolves the fetched booking's `studioSeatId` to a seat number. */
  seats: LessonBookingSeatStatusDto[];
  /** The booking to cancel; set whenever the dialog opens. */
  bookingId: string | null;
  /** The list row when it is on the loaded page; null → fetched by id (decision D15). */
  booking: LessonBookingListItemDto | null;
}

export function CancelReservationDialog({
  open,
  onOpenChange,
  scheduleId,
  schedule,
  seats,
  bookingId,
  booking,
}: CancelReservationDialogProps) {
  const [cancelledBy, setCancelledBy] = useState<BookingCancelCause>('member');
  const [prevOpen, setPrevOpen] = useState(open);
  // Closes the one-render window in which rapid clicks all see `isPending === false` (BUG-D01B-03).
  const isSubmittingRef = useRef(false);
  const queryClient = useQueryClient();

  // The dialog stays mounted across opens — reset the cause each time it opens (BUG-D01B-10).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setCancelledBy('member');
  }

  const detailQuery = useQuery({
    ...adminLessonBookingControllerDetailOptions({ path: { bookingId: bookingId ?? '' } }),
    enabled: open && booking === null && bookingId !== null,
  });

  const memberName = booking?.memberDisplayName ?? detailQuery.data?.memberDisplayName ?? '—';
  // A booking on this schedule shares its date/time; the fetched detail carries only `studioSeatId`.
  const scheduledDate = booking?.scheduledDate ?? schedule.scheduledDate;
  const startTime = booking?.startTime ?? schedule.startTime;
  const fetchedSeatId = detailQuery.data?.studioSeatId ?? null;
  const seatNumber =
    booking?.seatNumber ??
    (fetchedSeatId
      ? (seats.find((s) => s.studioSeatId === fetchedSeatId)?.seatNumber ?? null)
      : null);

  // FR-008 — the notification is unconditional on the BE (spec clarification 2026-10-07);
  // error toasts come from the shared MutationCache.
  const cancelReservation = useMutation({
    ...adminLessonBookingControllerCancelMutation(),
    onSuccess: () => {
      toast.success('予約をキャンセルしました');
      onOpenChange(false);
    },
    // Refetch on failure too — a refusal (E-LSB-015 attended, 404 …) means the row/seat moved
    // under us and the open dialog must show the current state (BUG-D01B-04).
    onSettled: () => {
      isSubmittingRef.current = false;
      invalidateBookingQueries(queryClient, scheduleId);
    },
  });

  const handleConfirm = () => {
    if (!bookingId || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    cancelReservation.mutate({
      path: { bookingId },
      body: { cancelledBy },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">予約をキャンセル</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target reservation info */}
          {bookingId && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">{memberName}</p>
              {scheduledDate && (
                <p className="text-muted-foreground text-xs">
                  {formatDateMDWeekday(scheduledDate, scheduledDate)} {startTime ?? ''}
                  {seatNumber && ` | スペース ${seatNumber}`}
                </p>
              )}
            </div>
          )}

          {/* Cancel cause selection (API-113 §7.3 `cancelledBy`) */}
          <div>
            <Label className="mb-2 block text-xs font-medium">キャンセル区分</Label>
            <RadioGroup
              value={cancelledBy}
              onValueChange={(v) => setCancelledBy(v as BookingCancelCause)}
            >
              <div className="space-y-2">
                {BOOKING_CANCEL_CAUSE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-2 rounded border p-2 transition-colors ${cancelledBy === option.value ? 'bg-primary/[0.05] border-primary' : 'hover:bg-muted/50'}`}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <div>
                      <span className="text-sm">{option.label}</span>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={cancelReservation.isPending || !bookingId}
          >
            キャンセルを確定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
