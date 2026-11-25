'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';

import type { FcCompanySummaryDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  MANAGEMENT_TYPE_BADGE_CLASSES,
  MANAGEMENT_TYPE_LABELS,
  getActiveBadgeClass,
  getActiveLabel,
} from '../_constants/constants';
import { FranchiseCompanyRowActions } from './franchise-company-row-actions';

interface FranchiseCompaniesTableColumnsProps {
  onDeleteClick?: (company: FcCompanySummaryDto) => void;
}

export function FranchiseCompaniesTableColumns({
  onDeleteClick,
}: FranchiseCompaniesTableColumnsProps = {}): ColumnDef<FcCompanySummaryDto>[] {
  return [
    {
      // Column id = the list's sort column key (`code` → API sort=code)
      id: 'code',
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="FC企業ID" />,
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.code}</span>,
      meta: { className: 'w-[100px]' },
    },
    {
      id: 'displayName',
      accessorKey: 'displayName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="法人名（表示名）" />,
      cell: ({ row }) => (
        <span
          className="block max-w-[320px] truncate text-xs font-medium"
          title={row.original.displayName}
        >
          {row.original.displayName}
        </span>
      ),
      meta: { className: 'min-w-[280px]' },
    },
    {
      accessorKey: 'managementType',
      header: () => <span className="text-xs font-semibold">直営/FC区分</span>,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn('text-[10px]', MANAGEMENT_TYPE_BADGE_CLASSES[row.original.managementType])}
        >
          {MANAGEMENT_TYPE_LABELS[row.original.managementType]}
        </Badge>
      ),
      meta: { className: 'w-[120px]' },
      enableSorting: false,
    },
    {
      accessorKey: 'managedStoreCount',
      header: () => <span className="text-xs font-semibold">管轄店舗数</span>,
      cell: ({ row }) => (
        <span className="block text-xs tabular-nums">{row.original.managedStoreCount}</span>
      ),
      meta: { className: 'w-[120px] text-right' },
      enableSorting: false,
    },
    {
      accessorKey: 'isActive',
      header: () => <span className="text-xs font-semibold">ステータス</span>,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn('text-[10px]', getActiveBadgeClass(row.original.isActive))}
        >
          {getActiveLabel(row.original.isActive)}
        </Badge>
      ),
      meta: { className: 'w-[100px]' },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => (
        <>
          {/* 操作セルの余白（⋯ボタンの外側）をクリックしても行クリック＝詳細遷移させない。
              セル全体を覆うクリック受けで伝播を止め、ボタンはその上に重ねる */}
          <span
            aria-hidden
            className="absolute inset-0 cursor-default"
            onClick={(event) => event.stopPropagation()}
          />
          <div className="relative">
            <FranchiseCompanyRowActions company={row.original} onDeleteClick={onDeleteClick} />
          </div>
        </>
      ),
      // relative は body セルのみ（header に付けると sticky が上書きされスクロール時に行が被さる）
      meta: { className: 'w-10', cellClassName: 'relative' },
      enableHiding: false,
      enableSorting: false,
    },
  ];
}
