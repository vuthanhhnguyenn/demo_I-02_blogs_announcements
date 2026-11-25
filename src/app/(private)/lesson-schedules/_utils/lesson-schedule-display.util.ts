import type { LessonType, PaymentStatus } from '@/lib/api/types.gen';

export function getLessonTypeLabel(type: LessonType): string {
  return type === 'studio' ? 'スタジオ' : 'パーソナル';
}

const TIME_SLOT_PATTERN = /^\d{1,2}:\d{2}(:\d{2})?$/;

/** Normalize ISO datetime or HH:mm time slot to HH:mm */
export function toTimeSlot(value: string): string {
  if (TIME_SLOT_PATTERN.test(value)) {
    const [hour, minute] = value.split(':');
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getLessonTypeBadgeVariant(type: LessonType): 'default' | 'secondary' | 'outline' {
  return type === 'studio' ? 'secondary' : 'outline';
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return '支払済';
    case 'unpaid':
      return '未払い';
    case 'partial':
      return '一部払済';
    default:
      return status;
  }
}

export function getPaymentStatusVariant(
  status: PaymentStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'secondary';
    case 'unpaid':
      return 'destructive';
    case 'partial':
      return 'outline';
    default:
      return 'outline';
  }
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${toTimeSlot(startTime)}〜${toTimeSlot(endTime)}`;
}

/**
 * Bookings that fill the capacity (API-112 v0.11 §4.1 / Y-1): `bookingCount` counts every live
 * booking, trials included; on an `additive` row the trial seats sit on top of the capacity, so only
 * the normal bookings fill it.
 */
export function seatBookingCount(item: {
  bookingCount: number;
  trialBookingCount: number;
  trialCapacityMode?: 'inclusive' | 'additive' | null;
}): number {
  return item.trialCapacityMode === 'additive'
    ? item.bookingCount - item.trialBookingCount
    : item.bookingCount;
}

export function formatBookingLabel(booked: number, capacity: number): string {
  return `${booked}/${capacity}`;
}

export function getBookingStatusLabel(booked: number, capacity: number): string {
  if (capacity === 1) return booked >= 1 ? '予約済' : '空き';
  const rate = capacity > 0 ? booked / capacity : 0;
  if (rate >= 1) return '満席';
  if (rate >= 0.85) return `残${capacity - booked}席`;
  return formatBookingLabel(booked, capacity);
}

export function getOccupancyColor(booked: number, capacity: number): string {
  if (capacity === 0) return 'text-muted-foreground';
  const rate = booked / capacity;
  if (rate >= 1) return 'text-destructive';
  if (rate >= 0.8) return 'text-orange-500';
  return 'text-foreground';
}

export function formatOccupancyRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Booked member names for the my_schedule view. The API already truncates to the first three
 * (`bookerNames`) and counts the rest (`otherBookerCount`).
 */
export function formatBookedMemberNames(
  names: readonly string[] | null | undefined,
  otherCount: number | null | undefined = 0,
): string {
  if (!names || names.length === 0) return '';
  const remaining = otherCount ?? 0;
  return remaining > 0 ? `${names.join('、')} 他${remaining}名` : names.join('、');
}
