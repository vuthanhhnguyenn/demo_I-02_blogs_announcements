'use client';

import type { ReactNode } from 'react';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';

import type { RoutineListItemDto } from '@/lib/api-real/types.gen';

import {
  ROUTINE_PUBLISH_STATUS_LABELS,
  getRoutinePublishStatusBadgeClass,
  getRoutinePublishStatusDotClass,
} from '../_constants/routine.constants';

export function getRoutineTableColumns(
  renderActions: (routine: RoutineListItemDto) => ReactNode,
): ColumnDef<RoutineListItemDto>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ルーティン名" />,
      enableSorting: true,
      // Bounded width: an unbounded name (200 chars / an unbroken token) stretches the cell and
      // pushes the other columns and the row menu off screen. The full name is on the tooltip.
      cell: ({ row }) => (
        <div className="min-w-0">
          <TextWithTooltip
            text={row.original.name}
            className="max-w-50 text-sm font-medium xl:max-w-90"
            wrapperClassName="min-w-0"
          />
          <p className="text-muted-foreground text-xs">{row.original.routineCode ?? '—'}</p>
        </div>
      ),
      meta: { className: 'min-w-40' },
    },
    {
      id: 'categoryName',
      accessorKey: 'categoryName',
      header: 'ルーティンカテゴリ',
      cell: ({ row }) =>
        row.original.categoryName ? (
          <Badge variant="secondary" className="text-xs font-normal">
            {row.original.categoryName}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: 'exerciseCount',
      accessorKey: 'exerciseCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="エクササイズ数" />,
      enableSorting: true,
      cell: ({ row }) => <span className="text-sm">{row.original.exerciseCount}種目</span>,
    },
    {
      id: 'publishStatus',
      accessorKey: 'publishStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ステータス" />,
      enableSorting: true,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`gap-1 text-xs font-medium ${getRoutinePublishStatusBadgeClass(row.original.publishStatus)}`}
        >
          <span
            className={`size-1.5 rounded-full ${getRoutinePublishStatusDotClass(row.original.publishStatus)}`}
          />
          {ROUTINE_PUBLISH_STATUS_LABELS[row.original.publishStatus]}
        </Badge>
      ),
    },
    {
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="最終更新日" />,
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDateYYYYMMDD(row.original.updatedAt, '—')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      meta: { className: 'w-10' },
      cell: ({ row }) => renderActions(row.original),
    },
  ];
}
