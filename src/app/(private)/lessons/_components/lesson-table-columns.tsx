'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';

import type { LessonListItemDto } from '@/lib/api-real/types.gen';

import { LESSON_TYPE_BADGE_CLASSES, LESSON_TYPE_BADGE_LABELS } from '../[id]/_constants/constants';
import { LESSON_STATUS_CLASSES, LESSON_STATUS_LABELS } from '../_constants/constants';
import {
  FEE_TYPE_LABELS,
  GENDER_RESTRICTION_CLASSES,
  GENDER_RESTRICTION_LABELS,
  LESSON_BRAND_BADGE_CLASSES,
  LESSON_BRAND_LABELS,
  TAB_BY_LESSON_TYPE,
} from '../_utils/lesson-api.util';

/**
 * Spec order: マスタID・レッスン名・レッスン区分・ブランド・所要時間・料金種別・性別制限・ステータス.
 *
 * TODO(round2) B2: the API sorts by name / durationMinutes only — マスタID, レッスン区分, brand,
 * 料金種別, 性別制限 and status are not sortable.
 */
export const lessonTableColumns: ColumnDef<LessonListItemDto>[] = [
  {
    accessorKey: 'id',
    header: 'マスタID',
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="レッスン名" />,
    cell: ({ row }) => <p className="text-sm font-medium">{row.original.name}</p>,
  },
  {
    accessorKey: 'lessonType',
    header: 'レッスン区分',
    enableSorting: false,
    cell: ({ row }) => {
      const lessonTab = TAB_BY_LESSON_TYPE[row.original.lessonType];
      return (
        <Badge variant="outline" className={`text-[11px] ${LESSON_TYPE_BADGE_CLASSES[lessonTab]}`}>
          {LESSON_TYPE_BADGE_LABELS[lessonTab]}
        </Badge>
      );
    },
    meta: { className: 'w-[130px]' },
  },
  {
    accessorKey: 'brand',
    header: 'ブランド',
    enableSorting: false,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`text-[11px] ${LESSON_BRAND_BADGE_CLASSES[row.original.brand]}`}
      >
        {LESSON_BRAND_LABELS[row.original.brand]}
      </Badge>
    ),
    meta: { className: 'w-[110px]' },
  },
  {
    id: 'duration',
    accessorKey: 'durationMinutes',
    header: ({ column }) => <DataTableColumnHeader column={column} title="所要時間" />,
    cell: ({ row }) => <span className="text-xs">{row.original.durationMinutes}分</span>,
    meta: { className: 'w-[100px]' },
  },
  {
    accessorKey: 'feeType',
    header: '料金種別',
    enableSorting: false,
    cell: ({ row }) => <span className="text-xs">{FEE_TYPE_LABELS[row.original.feeType]}</span>,
    meta: { className: 'w-[100px]' },
  },
  {
    accessorKey: 'genderRestriction',
    header: '性別制限',
    enableSorting: false,
    cell: ({ row }) => {
      const restriction = row.original.genderRestriction;
      return (
        <span className={`text-xs font-medium ${GENDER_RESTRICTION_CLASSES[restriction]}`}>
          {GENDER_RESTRICTION_LABELS[restriction]}
        </span>
      );
    },
    meta: { className: 'w-[100px]' },
  },
  {
    id: 'status',
    accessorKey: 'isActive',
    header: 'ステータス',
    enableSorting: false,
    cell: ({ row }) => {
      const status = row.original.isActive ? 'active' : 'inactive';
      return (
        <Badge variant="outline" className={`text-[11px] ${LESSON_STATUS_CLASSES[status]}`}>
          {LESSON_STATUS_LABELS[status]}
        </Badge>
      );
    },
    meta: { className: 'w-[100px]' },
  },
];
