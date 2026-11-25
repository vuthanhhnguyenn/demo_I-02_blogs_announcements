import type {
  BookingStatsResponseDto,
  CancelLessonBookingRequestDto,
  LessonBookingListItemDto,
  LessonBookingSeatStatusDto,
  LessonScheduleDetailDto,
  LimitedMemberProfileResponseDto,
} from '@/lib/api-real/types.gen';

/** API-113 §5.1 — the 7-value booking status. Drift from the DTO fails `tsc` here. */
export type BookingStatus = LessonBookingListItemDto['status'];

export const BOOKING_STATUS_LABELS = {
  reserved: '予約済',
  pending: '仮予約',
  attended: '出席確認済',
  no_show: '無断キャンセル',
  cancelled_by_member: 'キャンセル済',
  cancelled_by_staff: 'キャンセル済',
  cancelled_by_trainer: 'キャンセル済',
} as const satisfies Record<BookingStatus, string>;

/** Badge colour classes per status (same palette the mock UI used). */
export const BOOKING_STATUS_BADGE_CLASS = {
  reserved: 'bg-info/10 text-info border-info/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  attended: 'bg-success/10 text-success border-success/20',
  no_show: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled_by_member: 'bg-muted text-muted-foreground border-border',
  cancelled_by_staff: 'bg-muted text-muted-foreground border-border',
  cancelled_by_trainer: 'bg-muted text-muted-foreground border-border',
} as const satisfies Record<BookingStatus, string>;

export const CANCELLED_BOOKING_STATUSES: readonly BookingStatus[] = [
  'cancelled_by_member',
  'cancelled_by_staff',
  'cancelled_by_trainer',
];

export function isCancelledBookingStatus(status: BookingStatus): boolean {
  return CANCELLED_BOOKING_STATUSES.includes(status);
}

/** 出席 column — derived from `status` (decision D6); no separate attendance field on the API. */
export type AttendanceStatus = 'unconfirmed' | 'attended' | 'no_show';

export function getAttendanceStatus(status: BookingStatus): AttendanceStatus {
  if (status === 'attended') return 'attended';
  if (status === 'no_show') return 'no_show';
  return 'unconfirmed';
}

/**
 * Attendance moves the server accepts from a booking's status (API-113 §6.3 / §6.4 / #19 —
 * anything else is 422 E-LSB-013): attend from `reserved` / `pending`; no-show from `reserved`
 * once the session has started; revert (→ 未確認) from `attended` / `no_show` only. A
 * recorded attendance must be reverted before it can be changed to the other outcome.
 */
export function canChangeAttendanceTo(
  status: BookingStatus,
  target: AttendanceStatus,
  hasSessionStarted: boolean,
): boolean {
  switch (target) {
    case 'attended':
      return status === 'reserved' || status === 'pending';
    case 'no_show':
      return status === 'reserved' && hasSessionStarted;
    case 'unconfirmed':
      return status === 'attended' || status === 'no_show';
  }
}

/** Booking cancel is accepted from `reserved` / `pending` only (API-113 §6.6 #1 → 422 E-LSB-015). */
export function isCancellableBookingStatus(status: BookingStatus): boolean {
  return status === 'reserved' || status === 'pending';
}

/** 予約統計 rows in display order, read straight off `booking-stats` (decision D9). */
export const BOOKING_STATS_ROWS: ReadonlyArray<{
  key: keyof Pick<
    BookingStatsResponseDto,
    'reserved' | 'pending' | 'attended' | 'noShow' | 'cancelled'
  >;
  label: string;
  barClass: string;
}> = [
  { key: 'reserved', label: '予約済（確定）', barClass: 'bg-info' },
  { key: 'pending', label: '仮予約', barClass: 'bg-warning' },
  { key: 'attended', label: '出席確認済', barClass: 'bg-success' },
  { key: 'noShow', label: '無断キャンセル', barClass: 'bg-destructive' },
  { key: 'cancelled', label: 'キャンセル済', barClass: 'bg-muted-foreground/40' },
];

/** キャンセル区分 radio — values are the API's `cancelledBy` enum (API-113 §7.3). */
export type BookingCancelCause = NonNullable<CancelLessonBookingRequestDto['cancelledBy']>;

export const BOOKING_CANCEL_CAUSE_OPTIONS: ReadonlyArray<{
  value: BookingCancelCause;
  label: string;
  description: string;
}> = [
  {
    value: 'member',
    label: '会員によるキャンセル',
    description: '最短受付期間内の場合、無断キャンセルとしてペナルティカウントに加算されます',
  },
  {
    value: 'staff',
    label: 'スタッフによるキャンセル',
    description: '運営上の理由によるキャンセルです',
  },
  {
    value: 'trainer',
    label: '指導者都合のキャンセル',
    description: '回数消費を取り消します（月次プランの場合）',
  },
];

export type SeatType = LessonBookingSeatStatusDto['seatType'];

export const SEAT_TYPE_LABELS = {
  normal: '',
  equipment: '器材',
  structure: '柱',
  empty: '',
} as const satisfies Record<SeatType, string>;

export type MemberSex = NonNullable<LimitedMemberProfileResponseDto['sex']>;

export const MEMBER_SEX_LABELS = {
  male: '男性',
  female: '女性',
  other: 'その他',
  unknown: '不明',
} as const satisfies Record<MemberSex, string>;

export type ScheduleCancellationCategory = NonNullable<
  LessonScheduleDetailDto['cancellationReasonCategory']
>;

/** API-112 §5.1 `cancellationReasonCategory` → 中止理由 label on the cancelled card. */
export const SCHEDULE_CANCELLATION_CATEGORY_LABELS = {
  trainer_absence_sick: '講師欠席（体調不良）',
  trainer_absence_other: '講師欠席（その他）',
  facility_trouble: '設備トラブル',
  weather_disaster: '天候・災害',
  insufficient_participants: '参加者不足',
  other: 'その他',
} as const satisfies Record<ScheduleCancellationCategory, string>;

export type LessonType = NonNullable<LessonScheduleDetailDto['lesson']>['lessonType'];

/** API-113 §7.5 — session memo caps by lesson type (PT 10,000 / studio & body care 5,000). */
/** API-112 §7 — `changeReason` (PATCH / cancel / cancel-from-here) and `cancellationReason` are both max 1,000 chars. */
export const SCHEDULE_REASON_MAX_LENGTH = 1000;

export const SESSION_MEMO_MAX_LENGTH = {
  studio: 5000,
  personal_training: 10000,
  body_care: 5000,
} as const satisfies Record<LessonType, number>;

/** 予約者一覧 page size (API `limit`, 1–100). */
export const BOOKING_LIST_PAGE_SIZE = 7;

/**
 * 講師を変更する — `GET /admin/trainers/lookup` (API-109 #10) has no paging: at most this many rows
 * in name order (the API's ceiling), searched on the server (name / nickname).
 */
export const TRAINER_LOOKUP_LIMIT = 100;
/** Wait after the last keystroke before the trainer search is sent */
export const TRAINER_SEARCH_DEBOUNCE_MS = 300;
