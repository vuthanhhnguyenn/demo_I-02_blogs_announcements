'use client';

import { useMemo, useState } from 'react';

import { SortingState, getSortedRowModel } from '@tanstack/react-table';

import { DataTable } from '@/components/common/data-table';

import type {
  LessonScheduleDashboardAlertItemDto,
  LessonScheduleListItemDto,
} from '@/lib/api-real/types.gen';

import { LessonScheduleTableSkeleton } from './lesson-schedule-skeletons';
import { type ScheduleListRow, isToday, scheduleListColumns } from './schedule-list-columns';

interface ScheduleListViewProps {
  schedules: LessonScheduleListItemDto[];
  /** 要対応 alerts of the day, keyed by scheduleId (store dashboard) */
  alertsById?: ReadonlyMap<string, LessonScheduleDashboardAlertItemDto>;
  isLoading?: boolean;
  onScheduleClick?: (item: LessonScheduleListItemDto) => void;
}

export function ScheduleListView({
  schedules,
  alertsById,
  isLoading = false,
  onScheduleClick,
}: Readonly<ScheduleListViewProps>) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'start_time', desc: false }]);

  const rows = useMemo<ScheduleListRow[]>(
    () => schedules.map((s) => ({ ...s, isAlert: !!alertsById?.has(s.id) })),
    [schedules, alertsById],
  );

  if (isLoading) return <LessonScheduleTableSkeleton />;

  return (
    <DataTable
      columns={scheduleListColumns}
      data={rows}
      variant="simple"
      totalRows={rows.length}
      onRowClick={onScheduleClick}
      getRowClassName={(row) => (isToday(row.scheduledDate) ? 'bg-primary/5' : undefined)}
      tableOptions={{
        state: { sorting },
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
      }}
    />
  );
}
