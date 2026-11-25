'use client';

import { CircleAlert, MapPin, Pencil, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type {
  LessonScheduleDashboardAlertItemDto,
  LessonScheduleListItemDto,
} from '@/lib/api-real/types.gen';

import {
  formatScheduleAlert,
  formatTrainerNames,
  getPersonalPaymentLabel,
  getScheduleStatus,
  getScheduleTitle,
  isOneToOneLesson,
} from '../_utils/lesson-schedule-api.util';
import {
  formatBookedMemberNames,
  formatBookingLabel,
  seatBookingCount,
} from '../_utils/lesson-schedule-display.util';

const LESSON_TYPE_STYLES: Record<string, { border: string; label: string; badgeCls: string }> = {
  studio: {
    border: 'border-l-info',
    label: 'スタジオ',
    badgeCls: 'bg-info/15 text-info',
  },
  personal: {
    border: 'border-l-success',
    label: 'パーソナル',
    badgeCls: 'bg-success/15 text-success',
  },
};

interface TimelineItemProps {
  item: LessonScheduleListItemDto;
  /** 要対応 alert from the store dashboard, when this schedule has one */
  alert?: LessonScheduleDashboardAlertItemDto;
  isLast?: boolean;
  showBookedMembers?: boolean;
  onScheduleClick?: (item: LessonScheduleListItemDto) => void;
  onEditClick?: (item: LessonScheduleListItemDto) => void;
  canEdit?: boolean;
}

export function TimelineItem({
  item,
  alert,
  isLast = false,
  showBookedMembers = false,
  onScheduleClick,
  onEditClick,
  canEdit = false,
}: TimelineItemProps) {
  const typeStyle = isOneToOneLesson(item)
    ? LESSON_TYPE_STYLES.personal
    : LESSON_TYPE_STYLES.studio;
  const status = getScheduleStatus(item);
  const isAlert = !!alert;
  const paymentLabel = getPersonalPaymentLabel(item);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick?.(item);
  };

  const booked = seatBookingCount(item);
  const bookingLabel = (() => {
    if (item.capacity === 1) {
      return booked >= 1 ? '予約済' : '空き';
    }
    const rate = booked / item.capacity;
    const remaining = item.capacity - booked;
    if (rate >= 1) return '満席';
    if (rate >= 0.85) return `残${remaining}席`;
    return formatBookingLabel(booked, item.capacity) + '名';
  })();

  return (
    <div
      className={`group hover:bg-accent/50 relative -mx-2 flex cursor-pointer gap-4 rounded-lg px-2 transition-colors ${
        status === 'completed' || status === 'cancelled' ? 'opacity-60' : ''
      }`}
      onClick={() => onScheduleClick?.(item)}
    >
      {/* Time column */}
      <div className="w-16 shrink-0 py-3 text-right">
        <p className={`text-sm font-semibold ${isAlert ? 'text-destructive' : ''}`}>
          {item.startTime}
        </p>
        <p className="text-muted-foreground text-xs">{item.endTime}</p>
      </div>

      {/* Color bar */}
      <div
        className={`border-l-4 ${typeStyle.border} ${isAlert ? 'bg-destructive/10' : ''} flex-1 py-3 pr-2 pl-4 ${!isLast ? 'border-b-border border-b' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {/* Lesson name + type badge + status/alert badge */}
            <div className="flex items-center gap-2">
              <p
                className={`text-sm font-semibold ${isAlert ? 'text-destructive' : ''} ${
                  status === 'cancelled' ? 'line-through' : ''
                }`}
              >
                {getScheduleTitle(item)}
              </p>
              <Badge
                variant="secondary"
                className={`h-auto px-1 py-0 text-[10px] ${typeStyle.badgeCls}`}
              >
                {typeStyle.label}
              </Badge>
              {status === 'cancelled' ? (
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground h-auto px-1 py-0 text-[10px]"
                >
                  中止
                </Badge>
              ) : isAlert ? (
                <Badge
                  variant="secondary"
                  className="bg-destructive/15 text-destructive h-auto px-1 py-0 text-[10px]"
                >
                  要対応
                </Badge>
              ) : status === 'in_progress' ? (
                <Badge
                  variant="secondary"
                  className="bg-success/15 text-success h-auto px-1 py-0 text-[10px]"
                >
                  実施中
                </Badge>
              ) : null}
            </div>

            {/* Detail row */}
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              {/* Store badge for my_schedule view */}
              {showBookedMembers && item.storeName && (
                <Badge variant="outline" className="h-auto px-1 py-0 text-[10px] font-normal">
                  {item.storeName}
                </Badge>
              )}
              {item.studioName && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {item.studioName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {formatTrainerNames(item)}
              </span>
              <span>{bookingLabel}</span>
              {/* TODO(round2) B2: キャンセル待ち — API-112 carries no waitlist count, so the
                  「キャンセル待ち N名」 line stays hidden until the backend exposes one. */}
              {/* Payment tag for one-to-one lessons (月次プラン / 都度60分) */}
              {paymentLabel && (
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground h-auto px-1 py-0 text-[10px]"
                >
                  {paymentLabel}
                </Badge>
              )}
            </div>

            {/* Booked member names (my_schedule view) */}
            {showBookedMembers && item.bookerNames && item.bookerNames.length > 0 && (
              <div className="mt-1 flex items-center gap-1 text-xs">
                <span className="text-muted-foreground text-[10px]">予約者:</span>
                <span className="text-foreground text-[11px]">
                  {formatBookedMemberNames(item.bookerNames, item.otherBookerCount)}
                </span>
              </div>
            )}

            {/* Alert text */}
            {alert && (
              <div className="mt-1 flex items-center gap-1">
                <CircleAlert className="text-destructive size-3 shrink-0" />
                <span className="text-destructive text-xs font-medium">
                  {formatScheduleAlert(alert)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit button */}
      {canEdit && status !== 'completed' && status !== 'cancelled' && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-3 size-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleEditClick}
          aria-label="スケジュールを変更"
        >
          <Pencil className="size-3" />
        </Button>
      )}
    </div>
  );
}
