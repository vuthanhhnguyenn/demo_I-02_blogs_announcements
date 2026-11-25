'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';

import type { LessonListItemDto } from '@/lib/api-real/types.gen';

import { FEE_TYPE_LABELS } from '../_utils/lesson-api.util';

/**
 * Personal training plans are lesson masters of `lessonType` personal_training. No プラン区分
 * column (spec 007 Clarifications 2026-10-08).
 *
 * TODO(round2) B2: only プラン名 and 所要時間 are sortable.
 */
export const personalTableColumns: ColumnDef<LessonListItemDto>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    enableSorting: false,
    cell: ({ row }) => (
      <TextWithTooltip
        text={row.original.id}
        className="text-muted-foreground max-w-[84px] font-mono text-xs"
      />
    ),
    meta: { className: 'w-[100px]' },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="プラン名" />,
    cell: ({ row }) => <p className="text-sm font-medium">{row.original.name}</p>,
  },
  {
    id: 'duration',
    accessorKey: 'durationMinutes',
    header: ({ column }) => <DataTableColumnHeader column={column} title="所要時間" />,
    cell: ({ row }) => <span className="text-xs">{row.original.durationMinutes}分</span>,
    meta: { className: 'w-[100px]' },
  },
  {
    id: 'price',
    header: () => <span className="block text-right">料金</span>,
    enableSorting: false,
    // Per-use `fee` is tax-included as the API sends it (API-111 §6.9)
    cell: ({ row }) => {
      const { feeType, fee } = row.original;
      const taxIncluded = feeType === 'per_use' ? fee : null;
      return (
        <span className="block text-right text-xs font-medium">
          {taxIncluded != null ? `¥${taxIncluded.toLocaleString()}` : FEE_TYPE_LABELS[feeType]}
        </span>
      );
    },
    meta: { className: 'w-[120px] text-right' },
  },
];
