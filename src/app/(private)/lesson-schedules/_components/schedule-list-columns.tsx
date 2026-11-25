'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { LessonScheduleListItemDto } from '@/lib/api-real/types.gen';

import {
  formatTrainerNames,
  getScheduleTitle,
  isOneToOneLesson,
} from '../_utils/lesson-schedule-api.util';
import {
  formatTimeRange,
  getBookingStatusLabel,
  getOccupancyColor,
  seatBookingCount,
} from '../_utils/lesson-schedule-display.util';

function SortHeader({
  column,
  label,
}: {
  column: {
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (asc?: boolean) => void;
  };
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(sorted === 'asc')}
          >
            {label}
            {sorted === 'asc' ? (
              <ArrowUp className="ml-1 size-3.5" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="ml-1 size-3.5" />
            ) : (
              <ArrowUpDown className="ml-1 size-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">クリックで降順ソート</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** A list row: the API item plus whether the store dashboard flags it 要対応. */
export type ScheduleListRow = LessonScheduleListItemDto & { isAlert: boolean };

function formatDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = dayNames[d.getDay()];
  return `${m}/${day}(${dow})`;
}

export function isToday(isoDate: string): boolean {
  const today = new Date();
  const d = new Date(`${isoDate}T00:00:00`);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

const EVENT_TYPE_BADGE: Record<string, { cls: string; label: string }> = {
  studio: { cls: 'bg-info/15 text-info', label: 'スタジオ' },
  personal: { cls: 'bg-success/15 text-success', label: 'パーソナル' },
};

export const scheduleListColumns: ColumnDef<ScheduleListRow>[] = [
  {
    id: 'date',
    accessorFn: (row) => row.scheduledDate,
    header: ({ column }) => <SortHeader column={column} label="日付" />,
    cell: ({ row }) => {
      const today = isToday(row.original.scheduledDate);
      return (
        <span
          className={`text-xs whitespace-nowrap ${today ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
        >
          {formatDateLabel(row.original.scheduledDate)}
        </span>
      );
    },
  },
  {
    id: 'start_time',
    accessorFn: (row) => `${row.scheduledDate}T${row.startTime}`,
    header: ({ column }) => <SortHeader column={column} label="時間" />,
    cell: ({ row }) => (
      <span className="text-xs whitespace-nowrap">
        {formatTimeRange(row.original.startTime, row.original.endTime)}
      </span>
    ),
  },
  {
    id: 'lesson_name',
    accessorFn: (row) => getScheduleTitle(row),
    header: ({ column }) => <SortHeader column={column} label="レッスン名" />,
    cell: ({ row }) => (
      <span className="text-sm font-medium">{getScheduleTitle(row.original)}</span>
    ),
  },
  {
    id: 'lesson_type',
    accessorFn: (row) => (isOneToOneLesson(row) ? 'personal' : 'studio'),
    header: ({ column }) => <SortHeader column={column} label="種別" />,
    cell: ({ row }) => {
      const badge = isOneToOneLesson(row.original)
        ? EVENT_TYPE_BADGE.personal
        : EVENT_TYPE_BADGE.studio;
      return (
        <Badge variant="secondary" className={`h-auto px-1 py-0 text-[10px] ${badge.cls}`}>
          {badge.label}
        </Badge>
      );
    },
  },
  {
    id: 'instructor_name',
    accessorFn: (row) => formatTrainerNames(row),
    header: ({ column }) => <SortHeader column={column} label="インストラクター" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">{formatTrainerNames(row.original)}</span>
    ),
  },
  {
    id: 'booked_count',
    accessorFn: (row) => seatBookingCount(row),
    header: ({ column }) => <SortHeader column={column} label="予約" />,
    cell: ({ row }) => {
      const booked = seatBookingCount(row.original);
      const { capacity } = row.original;
      const label = getBookingStatusLabel(booked, capacity);
      const colorCls = getOccupancyColor(booked, capacity);
      return <span className={`text-center text-xs ${colorCls}`}>{label}</span>;
    },
  },
  {
    accessorKey: 'isAlert',
    header: ({ column }) => <SortHeader column={column} label="アラート" />,
    cell: ({ row }) =>
      row.original.isAlert ? (
        <Badge
          variant="secondary"
          className="bg-destructive/15 text-destructive h-auto px-1 py-0 text-[10px]"
        >
          要対応
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs">-</span>
      ),
  },
  {
    accessorKey: 'isPublished',
    header: ({ column }) => <SortHeader column={column} label="公開" />,
    cell: ({ row }) =>
      row.original.isPublished ? (
        <Badge variant="outline" className="text-success border-success/40 text-[10px]">
          公開
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground text-[10px]">
          内部
        </Badge>
      ),
  },
];
