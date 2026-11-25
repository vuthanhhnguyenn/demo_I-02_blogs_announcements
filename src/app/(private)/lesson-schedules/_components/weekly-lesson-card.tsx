'use client';

import { Lock, Pencil } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { LessonScheduleListItemDto } from '@/lib/api-real/types.gen';

import {
  formatTrainerNames,
  getPersonalPaymentLabel,
  getScheduleStatus,
  getScheduleTitle,
  isOneToOneLesson,
} from '../_utils/lesson-schedule-api.util';
import {
  formatBookingLabel,
  formatTimeRange,
  getOccupancyColor,
  seatBookingCount,
} from '../_utils/lesson-schedule-display.util';

const EVENT_TYPE_BADGE: Record<string, { cls: string; label: string }> = {
  studio: { cls: 'bg-info/15 text-info', label: 'スタジオ' },
  personal: { cls: 'bg-success/15 text-success', label: 'パーソナル' },
};

interface WeeklyLessonCardProps {
  item: LessonScheduleListItemDto;
  /** Has a 要対応 alert on the store dashboard */
  isAlert?: boolean;
  onScheduleClick?: (item: LessonScheduleListItemDto) => void;
  onEditClick?: (item: LessonScheduleListItemDto) => void;
  canEdit?: boolean;
}

export function WeeklyLessonCard({
  item,
  isAlert = false,
  onScheduleClick,
  onEditClick,
  canEdit = false,
}: Readonly<WeeklyLessonCardProps>) {
  const typeBadge = isOneToOneLesson(item) ? EVENT_TYPE_BADGE.personal : EVENT_TYPE_BADGE.studio;
  const timeLabel = formatTimeRange(item.startTime, item.endTime);
  const status = getScheduleStatus(item);
  const paymentLabel = getPersonalPaymentLabel(item);

  const booked = seatBookingCount(item);
  const resLabel = (() => {
    if (item.capacity === 1) return booked >= 1 ? '予約済' : '空き';
    const rate = booked / item.capacity;
    if (rate >= 1) return '満席';
    if (rate >= 0.85) return `残${item.capacity - booked}席`;
    return formatBookingLabel(booked, item.capacity);
  })();

  const resColor = getOccupancyColor(booked, item.capacity);
  const isInternalOnly = !item.isPublished;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditClick?.(item);
  };

  return (
    <div className="group relative">
      <div
        className={`cursor-pointer rounded-md p-2 transition-shadow hover:shadow-sm ${
          isInternalOnly ? 'bg-muted/50 border border-dashed' : 'bg-card border'
        } ${status === 'cancelled' ? 'line-through opacity-50' : ''}`}
        onClick={() => onScheduleClick?.(item)}
      >
        {/* Row 1: Type badge + Lesson name */}
        <div className="mb-1 flex items-center gap-1">
          <Badge
            variant="secondary"
            className={`h-auto shrink-0 px-1 py-0 text-[9px] ${typeBadge.cls}`}
          >
            {typeBadge.label}
          </Badge>
          <span className="text-foreground truncate text-xs font-semibold">
            {getScheduleTitle(item)}
          </span>
          {isInternalOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="border-muted-foreground/20 bg-muted text-muted-foreground ml-auto h-auto shrink-0 gap-0.5 px-1 py-0 text-[9px]"
                  >
                    <Lock className="size-2.5" />
                    内部
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">非公開枠（CRM内部のみで管理）</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Row 2: Time + Instructor */}
        <div className="text-muted-foreground flex items-center justify-between text-[10px]">
          <span>{timeLabel}</span>
          <span className="ml-1 truncate">{formatTrainerNames(item)}</span>
        </div>

        {/* Row 3: Reservation count + payment type + alert badge */}
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className={`text-[10px] ${resColor}`}>{resLabel}</span>
            {paymentLabel && (
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground h-auto px-1 py-0 text-[9px]"
              >
                {paymentLabel}
              </Badge>
            )}
          </div>
          {isAlert && (
            <Badge
              variant="secondary"
              className="bg-destructive/15 text-destructive h-auto px-1 py-0 text-[9px]"
            >
              要対応
            </Badge>
          )}
        </div>
      </div>

      {canEdit && status !== 'completed' && status !== 'cancelled' && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-2 size-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleEditClick}
          aria-label="スケジュールを変更"
        >
          <Pencil className="size-3" />
        </Button>
      )}
    </div>
  );
}
