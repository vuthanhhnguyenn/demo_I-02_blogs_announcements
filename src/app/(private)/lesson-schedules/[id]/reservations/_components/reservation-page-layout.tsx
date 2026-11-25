'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type {
  BookingStatsResponseDto,
  LessonBookingListItemDto,
  LessonBookingListResponseDto,
  LessonScheduleDetailDto,
  LessonScheduleHistoryEntryDto,
  SessionMemoResponseDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { SCHEDULE_CANCELLATION_CATEGORY_LABELS } from '../_constants/booking-status.constants';
import { AddReservationDialog } from './add-reservation-dialog';
import { CancelReservationDialog } from './cancel-reservation-dialog';
import { PtLimitedProfileCard } from './pt-limited-profile-card';
import { ReservationListTable } from './reservation-list-table';
import { ReservationStatsPanel } from './reservation-stats-panel';
import { SessionMemoCard } from './session-memo-card';
import { SpaceReservationGrid } from './space-reservation-grid';

interface ReservationPageLayoutProps {
  scheduleId: string;
  schedule: LessonScheduleDetailDto;
  /** History entry for the cancellation (中止日時 / 担当者); null when none / not cancelled. */
  cancellationEntry: LessonScheduleHistoryEntryDto | null;
  bookingsData: LessonBookingListResponseDto;
  stats: BookingStatsResponseDto;
  /** null = no memo registered yet */
  memo: SessionMemoResponseDto | null;
  isCancelled: boolean;
}

export function ReservationPageLayout({
  scheduleId,
  schedule,
  cancellationEntry,
  bookingsData,
  stats,
  memo,
  isCancelled,
}: ReservationPageLayoutProps) {
  const router = useRouter();
  const { hasPermission } = useAuthUser();
  // FR-015 L454 — 会員詳細 opens only for roles that may view members (Trainer has no MembersView).
  const canViewMember = hasPermission(Permission.MembersView);
  const [addReservationOpen, setAddReservationOpen] = useState(false);
  const [preselectedSeatId, setPreselectedSeatId] = useState<string | null>(null);
  const [cancelReservationOpen, setCancelReservationOpen] = useState(false);
  // Every seat holder, pending holds included (API-113 v0.14 `seats[]` — `seatMap[]` is gone).
  const bookedMemberIds = stats.seats.flatMap((seat) =>
    seat.memberId === null ? [] : [seat.memberId],
  );
  const [selectedBooking, setSelectedBooking] = useState<LessonBookingListItemDto | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const handleNavigateToMember = (memberId: string) => {
    router.push(navigate('/members/[id]', memberId));
  };

  const handleOpenAddReservation = (studioSeatId?: string) => {
    setPreselectedSeatId(studioSeatId ?? null);
    setAddReservationOpen(true);
  };

  const handleOpenCancelReservation = (booking: LessonBookingListItemDto) => {
    setSelectedBooking(booking);
    setSelectedBookingId(booking.id);
    setCancelReservationOpen(true);
  };

  // Decision D15 — a grid cell may belong to a booking on another list page; the dialog
  // then fetches the booking by id itself.
  const handleCancelFromGrid = (bookingId: string) => {
    const booking = bookingsData.items.find((b) => b.id === bookingId) ?? null;
    setSelectedBooking(booking);
    setSelectedBookingId(bookingId);
    setCancelReservationOpen(true);
  };

  const isPersonalSession = schedule.lesson?.lessonType === 'personal_training';
  // PT card subject: a live booking first, then any non-cancelled one (pending / no_show); never a cancelled row.
  const primaryBooking =
    bookingsData.items.find((b) => b.status === 'reserved' || b.status === 'attended') ??
    bookingsData.items.find((b) => !b.status.startsWith('cancelled_')) ??
    null;
  const cancellationCategory = schedule.cancellationReasonCategory;

  return (
    <>
      <div className="flex gap-x-6 gap-y-4 px-6 py-4">
        {/* Left column */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Cancelled status card */}
          {isCancelled && (
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-destructive text-base font-semibold">中止済み</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">
                  このレッスンは中止されています。変更操作はできません。
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {cancellationEntry && (
                    <>
                      <span className="text-muted-foreground">中止日時</span>
                      <span className="font-medium">
                        {formatDateYYYYMMDD_HHMM(cancellationEntry.changedAt, '—')}
                      </span>
                      {cancellationEntry.changedByName && (
                        <>
                          <span className="text-muted-foreground">担当者</span>
                          <span className="font-medium">{cancellationEntry.changedByName}</span>
                        </>
                      )}
                    </>
                  )}
                  {cancellationCategory && (
                    <>
                      <span className="text-muted-foreground">中止理由</span>
                      <span className="font-medium">
                        {SCHEDULE_CANCELLATION_CATEGORY_LABELS[cancellationCategory]}
                      </span>
                    </>
                  )}
                  {schedule.cancellationReason && (
                    <>
                      <span className="text-muted-foreground">詳細</span>
                      <span className="font-medium">{schedule.cancellationReason}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Space grid (studio lessons) / limited profile card (PT sessions) */}
          {isPersonalSession ? (
            <PtLimitedProfileCard booking={primaryBooking} />
          ) : (
            <Card className="pb-0">
              <CardHeader>
                <CardTitle className="text-base font-semibold">スペース予約状況</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <SpaceReservationGrid
                  seats={stats.seats}
                  isCancelled={isCancelled}
                  onAddReservation={handleOpenAddReservation}
                  onCancelReservation={handleCancelFromGrid}
                  onNavigateToMember={canViewMember ? handleNavigateToMember : undefined}
                />
              </CardContent>
            </Card>
          )}

          {/* Reservation list */}
          <ReservationListTable
            scheduleId={scheduleId}
            data={bookingsData}
            isCancelled={isCancelled}
            onAddReservation={() => handleOpenAddReservation()}
            onCancelReservation={handleOpenCancelReservation}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-[320px] shrink-0 space-y-4">
          {!isPersonalSession && <ReservationStatsPanel schedule={schedule} stats={stats} />}
          <SessionMemoCard scheduleId={scheduleId} schedule={schedule} memo={memo} />
        </div>
      </div>

      {/* Dialogs */}
      <AddReservationDialog
        open={addReservationOpen}
        onOpenChange={setAddReservationOpen}
        scheduleId={scheduleId}
        schedule={schedule}
        seats={stats.seats}
        bookedMemberIds={bookedMemberIds}
        preselectedSeatId={preselectedSeatId}
        remainingSeats={stats.available}
      />

      <CancelReservationDialog
        open={cancelReservationOpen}
        onOpenChange={setCancelReservationOpen}
        scheduleId={scheduleId}
        schedule={schedule}
        seats={stats.seats}
        bookingId={selectedBookingId}
        booking={selectedBooking}
      />
    </>
  );
}
