'use client';

import { formatDateMDWeekday } from '@/utils/date.util';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { LessonBookingListItemDto } from '@/lib/api-real/types.gen';

import {
  type AttendanceStatus,
  BOOKING_LIST_PAGE_SIZE,
  BOOKING_STATUS_BADGE_CLASS,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
  canChangeAttendanceTo,
  getAttendanceStatus,
  isCancellableBookingStatus,
  isCancelledBookingStatus,
} from '../_constants/booking-status.constants';
import { MemberLimitedProfilePopover } from './member-limited-profile-popover';

export function ReservationStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant="outline" className={`${BOOKING_STATUS_BADGE_CLASS[status]} text-[10px]`}>
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}

/** プラン cell / popover copy — 「月4回」 + 残N回 for monthly plans, 都度 / 体験 otherwise. */
export function formatPlanLabel(booking: LessonBookingListItemDto): string {
  switch (booking.paymentType) {
    case 'monthly_plan':
      return booking.optionName ?? '月額プラン';
    case 'per_use':
      return '都度';
    case 'trial':
      return '体験';
    default:
      return '—';
  }
}

export function isMonthlyPlanBooking(booking: LessonBookingListItemDto): boolean {
  return booking.paymentType === 'monthly_plan';
}

export function hasZeroRemaining(booking: LessonBookingListItemDto): boolean {
  return isMonthlyPlanBooking(booking) && booking.remainingCount === 0;
}

interface ReservationListColumnsOptions {
  onAttendanceChange: (bookingId: string, status: AttendanceStatus) => void;
  onCancelReservation: (booking: LessonBookingListItemDto) => void;
  /** FR-009 — whether the current role may change attendance status */
  canManageAttendance: boolean;
  /** FR-008 — whether the current role may cancel a reservation */
  canManageReservation: boolean;
  isCancelled: boolean;
  /** 1-based page of the rows being rendered — No. continues across pages (BUG-D01A-02). */
  page: number;
}

/**
 * 出席 menu — the three states as states (not actions), worded exactly like the cell they open
 * from (出席 / 無断欠席) so the current one reads as the current one; the status badge keeps the
 * API-113 status names (出席確認済 / 無断キャンセル). The current state is marked (BUG-D01B-12).
 */
const ATTENDANCE_MENU_ITEMS: ReadonlyArray<{
  value: AttendanceStatus;
  label: string;
  className: string;
}> = [
  { value: 'unconfirmed', label: '未確認', className: 'text-muted-foreground' },
  { value: 'attended', label: '出席', className: 'text-success' },
  { value: 'no_show', label: '無断欠席', className: 'text-destructive' },
];

/** Session start from the row (store-local, like the rest of this screen); unknown → started, the server decides. */
function hasSessionStarted(booking: LessonBookingListItemDto, now: Date): boolean {
  const { scheduledDate, startTime } = booking;
  if (!scheduledDate || !startTime) return true;
  const start = new Date(`${scheduledDate}T${startTime}:00`);
  return Number.isNaN(start.getTime()) || start <= now;
}

function AttendanceLabel({ status }: { status: AttendanceStatus }) {
  if (status === 'attended') {
    return (
      <span className="text-success inline-flex items-center gap-1 text-[10px]">
        <Check className="size-3" />
        出席
      </span>
    );
  }
  if (status === 'no_show') {
    return (
      <span className="text-destructive inline-flex items-center gap-1 text-[10px]">
        <X className="size-3" />
        無断欠席
      </span>
    );
  }
  return <span className="text-muted-foreground text-[10px]">未確認</span>;
}

function SortableHeader({
  label,
  sorted,
  onToggle,
}: {
  label: string;
  sorted: false | 'asc' | 'desc';
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="h-auto gap-1 p-0 text-xs font-semibold hover:bg-transparent"
      onClick={onToggle}
      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="size-3" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUpDown className="text-muted-foreground size-3" />
      )}
    </Button>
  );
}

export function getReservationListColumns({
  onAttendanceChange,
  onCancelReservation,
  canManageAttendance,
  canManageReservation,
  isCancelled,
  page,
}: ReservationListColumnsOptions): ColumnDef<LessonBookingListItemDto>[] {
  const sequenceOffset = (page - 1) * BOOKING_LIST_PAGE_SIZE;
  return [
    {
      id: 'sequence',
      header: ({ column }) => (
        <SortableHeader
          label="No."
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{sequenceOffset + row.index + 1}</span>
      ),
    },
    {
      accessorKey: 'memberDisplayName',
      header: ({ column }) => (
        <SortableHeader
          label="会員名"
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => {
        const booking = row.original;
        return (
          <div className="flex max-w-40 items-center gap-2">
            {/* The popover trigger is the interactive element (role=button) — no nested button */}
            <MemberLimitedProfilePopover booking={booking}>
              <span className="max-w-28 cursor-pointer truncate text-left text-sm font-medium hover:underline">
                {booking.memberDisplayName ?? '—'}
              </span>
            </MemberLimitedProfilePopover>
            {booking.hasActivePenalty && (
              <Badge variant="secondary" className="bg-destructive/15 text-destructive text-[10px]">
                ペナルティ中
              </Badge>
            )}
            {!booking.hasActivePenalty && hasZeroRemaining(booking) && (
              <Badge variant="secondary" className="bg-destructive/15 text-destructive text-[10px]">
                残回数不足
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'plan',
      header: () => <span className="text-xs font-semibold">プラン</span>,
      cell: ({ row }) => {
        const booking = row.original;
        const remaining = booking.remainingCount;
        return (
          <div className="text-xs">
            <span className="text-muted-foreground">{formatPlanLabel(booking)}</span>
            {isMonthlyPlanBooking(booking) && remaining != null && (
              <span
                className={`ml-1 font-medium ${
                  remaining === 0
                    ? 'text-destructive'
                    : remaining <= 1
                      ? 'text-warning'
                      : 'text-muted-foreground'
                }`}
              >
                残{remaining}回
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'seatNumber',
      header: ({ column }) => (
        <SortableHeader
          label="スペース"
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) =>
        row.original.seatNumber ? (
          <Badge variant="outline" className="text-[10px]">
            {row.original.seatNumber}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: 'scheduledAt',
      accessorFn: (b) => `${b.scheduledDate ?? ''} ${b.startTime ?? ''}`,
      header: ({ column }) => (
        <SortableHeader
          label="予約日時"
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => {
        const { scheduledDate, startTime } = row.original;
        return (
          <span className="text-muted-foreground text-xs">
            {scheduledDate ? formatDateMDWeekday(scheduledDate, scheduledDate) : '—'}
            {startTime ? ` ${startTime}` : ''}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <SortableHeader
          label="ステータス"
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => <ReservationStatusBadge status={row.original.status} />,
    },
    {
      id: 'attendance',
      header: () => <span className="text-xs font-semibold">出席</span>,
      cell: ({ row }) => {
        const booking = row.original;
        const attendance = getAttendanceStatus(booking.status);
        // A cancelled booking has no attendance to manage — the server refuses anyway (BUG-D01B-07).
        if (!canManageAttendance || isCancelled || isCancelledBookingStatus(booking.status)) {
          return (
            <span className="inline-flex h-6 items-center px-2">
              <AttendanceLabel status={attendance} />
            </span>
          );
        }
        const sessionStarted = hasSessionStarted(booking, new Date());
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:bg-accent hover:text-accent-foreground inline-flex h-6 items-center justify-center rounded-md px-2 text-[10px]">
              <AttendanceLabel status={attendance} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {ATTENDANCE_MENU_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.value}
                  disabled={
                    item.value === attendance ||
                    !canChangeAttendanceTo(booking.status, item.value, sessionStarted)
                  }
                  onClick={() => onAttendanceChange(booking.id, item.value)}
                >
                  <span className={item.className}>{item.label}</span>
                  {item.value === 'no_show' && booking.status === 'reserved' && !sessionStarted && (
                    <span className="text-muted-foreground text-[10px]">（開始後に選択可）</span>
                  )}
                  {item.value === attendance && <Check className="ml-auto size-3" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      id: 'cancel_action',
      header: () => null,
      cell: ({ row }) =>
        canManageReservation ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive h-7 text-xs"
            disabled={isCancelled || !isCancellableBookingStatus(row.original.status)}
            onClick={(e) => {
              e.stopPropagation();
              onCancelReservation(row.original);
            }}
          >
            取消
          </Button>
        ) : null,
    },
  ];
}
