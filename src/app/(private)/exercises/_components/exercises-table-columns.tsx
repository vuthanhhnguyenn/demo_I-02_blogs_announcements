'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';

import type { ExerciseListItemDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  EXERCISE_CATEGORY_BADGE_CLASSES,
  EXERCISE_STATUS_BADGE_CLASSES,
  EXERCISE_STATUS_DOT_CLASSES,
  EXERCISE_STATUS_LABELS,
  EXERCISE_VALUE_UNAVAILABLE,
} from '../_constants/constants';
import type { ExerciseMasterOption } from '../_hooks/use-exercise-master-options';
import { resolveExerciseMasterLabel } from '../_utils/exercise-master-label.util';
import { getExercisePublishStatus } from '../_utils/exercise-status.util';
import { ExerciseLevelBadge } from './exercise-level-badge';
import { ExerciseRowActions } from './exercise-row-actions';

type ExerciseRow = ExerciseListItemDto;

interface ExercisesTableColumnsProps {
  categoryOptions: readonly ExerciseMasterOption[];
  primaryMuscleOptions: readonly ExerciseMasterOption[];
  onEdit: (id: string) => void;
  onTogglePublish: (row: ExerciseRow) => void;
  onDelete: (row: ExerciseRow) => void;
}

// Sortable headers follow the prototype (D19): エクササイズ名 / ステータス / 最終更新日, with the app's
// tri-state cycle (a third click clears back to the default order). Their column ids are the URL
// sort keys (`EXERCISE_SORT_KEYS`).
export function ExercisesTableColumns({
  categoryOptions,
  primaryMuscleOptions,
  onEdit,
  onTogglePublish,
  onDelete,
}: ExercisesTableColumnsProps): ColumnDef<ExerciseRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="エクササイズ名" />,
      // Long names truncate (full value in the tooltip) instead of widening the table.
      cell: ({ row }) => (
        <div className="max-w-[320px] min-w-0 space-y-0.5">
          <TextWithTooltip text={row.original.name} className="text-sm font-medium" />
          {row.original.exerciseCode && (
            <TextWithTooltip
              text={row.original.exerciseCode}
              className="text-muted-foreground font-mono text-[10px]"
            />
          )}
        </div>
      ),
      meta: { className: 'max-w-[320px]' },
    },
    {
      accessorKey: 'category',
      header: () => <span className="text-xs font-semibold">カテゴリ</span>,
      cell: ({ row }) => {
        const label = resolveExerciseMasterLabel(
          categoryOptions,
          row.original.categoryName,
          row.original.category,
        );
        return (
          <Badge
            variant="outline"
            title={label}
            className={cn(
              'block max-w-[160px] truncate text-[10px]',
              EXERCISE_CATEGORY_BADGE_CLASSES,
            )}
          >
            {label}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'primaryMuscle',
      header: () => <span className="text-xs font-semibold">主働筋</span>,
      cell: ({ row }) => (
        <TextWithTooltip
          text={resolveExerciseMasterLabel(
            primaryMuscleOptions,
            row.original.primaryMuscleName,
            row.original.primaryMuscle,
          )}
          wrapperClassName="max-w-[160px]"
          className="text-xs"
        />
      ),
      enableSorting: false,
    },
    {
      id: 'tool',
      header: () => <span className="text-xs font-semibold">器具種別</span>,
      cell: ({ row }) => (
        <TextWithTooltip
          text={row.original.toolName ?? EXERCISE_VALUE_UNAVAILABLE}
          wrapperClassName="max-w-[160px]"
          className="text-xs"
        />
      ),
      enableSorting: false,
    },
    {
      id: 'level',
      header: () => <span className="text-xs font-semibold">レベル</span>,
      // Spec レベル = `isBeginnerVisible` (D27); the API's `level` is a different difficulty scale.
      cell: ({ row }) => <ExerciseLevelBadge isBeginnerVisible={row.original.isBeginnerVisible} />,
      enableSorting: false,
      meta: { className: 'w-[110px]' },
    },
    {
      id: 'publishStatus',
      // An accessor is what makes a column sortable in TanStack; sorting itself is server-side.
      accessorFn: (row) => getExercisePublishStatus(row),
      header: ({ column }) => <DataTableColumnHeader column={column} title="ステータス" />,
      cell: ({ row }) => {
        const status = getExercisePublishStatus(row.original);
        return (
          <Badge
            variant="outline"
            className={cn('gap-1 text-[10px]', EXERCISE_STATUS_BADGE_CLASSES[status])}
          >
            <span className={cn('size-1.5 rounded-full', EXERCISE_STATUS_DOT_CLASSES[status])} />
            {EXERCISE_STATUS_LABELS[status]}
          </Badge>
        );
      },
      meta: { className: 'w-[110px]' },
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="最終更新日" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {format(new Date(row.original.updatedAt), 'yyyy/MM/dd')}
        </span>
      ),
      meta: { className: 'w-[130px]' },
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <ExerciseRowActions
          row={row.original}
          onEdit={onEdit}
          onTogglePublish={onTogglePublish}
          onDelete={onDelete}
        />
      ),
      enableSorting: false,
      meta: { className: 'w-[48px]' },
    },
  ];
}
