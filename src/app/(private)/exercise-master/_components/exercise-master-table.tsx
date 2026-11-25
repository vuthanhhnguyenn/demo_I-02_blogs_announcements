'use client';

import { type ReactNode, useMemo } from 'react';

import { formatDate } from '@/utils/format.util';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';

import { DataTable } from '@/components/common/data-table';
import { DataTableRowActions } from '@/components/common/data-table/data-table-row-action';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import {
  type ExerciseMasterRow,
  SYSTEM_MASTER_ROW_MESSAGE,
  getMasterRowName,
  isSystemMasterRow,
  toLabel,
  toStatusBadgeClass,
} from '../_constants/constants';

/** BE limit on the list `keyword` (D17) — longer input is cut instead of failing with 400. */
export const MASTER_KEYWORD_MAX_LENGTH = 100;

/** Row menu: 編集 / 削除, disabled with the reason for a system-fixed (D30) or referenced row. */
function MasterRowActions({
  row,
  onEdit,
  onDelete,
}: {
  row: ExerciseMasterRow;
  onEdit: (row: ExerciseMasterRow) => void;
  onDelete: (row: ExerciseMasterRow) => void;
}) {
  const isSystem = isSystemMasterRow(row);
  const isReferenced = row.referenceCount > 0;
  return (
    <DataTableRowActions
      row={row}
      actions={['edit', 'delete']}
      handlers={{ edit: onEdit, delete: onDelete }}
      disabled={{ edit: isSystem, delete: isSystem || isReferenced }}
      disabledTooltips={{
        edit: SYSTEM_MASTER_ROW_MESSAGE,
        delete: isSystem
          ? SYSTEM_MASTER_ROW_MESSAGE
          : `エクササイズから参照中のため削除できません（${row.referenceCount}件使用中）`,
      }}
    />
  );
}

function getMasterColumns({
  nameLabel,
  readOnly,
  onEdit,
  onDelete,
}: {
  nameLabel: string;
  readOnly: boolean;
  onEdit: (row: ExerciseMasterRow) => void;
  onDelete: (row: ExerciseMasterRow) => void;
}): ColumnDef<ExerciseMasterRow>[] {
  const columns: ColumnDef<ExerciseMasterRow>[] = [
    {
      id: 'id',
      header: 'ID',
      // A uuid — truncated, the full value in the tooltip.
      cell: ({ row }) => <TextWithTooltip text={row.original.id} />,
      meta: { className: 'w-[104px] text-muted-foreground' },
    },
    {
      id: 'code',
      header: 'コード',
      cell: ({ row }) => <TextWithTooltip text={row.original.code} className="font-mono" />,
      meta: { className: 'w-[160px] text-muted-foreground' },
    },
    {
      id: 'name',
      header: nameLabel,
      cell: ({ row }) => (
        <TextWithTooltip text={getMasterRowName(row.original)} className="text-sm font-medium" />
      ),
      meta: { className: 'w-[24%]' },
    },
    {
      id: 'description',
      header: '説明',
      // The longest text: takes every width the other columns leave.
      cell: ({ row }) => <TextWithTooltip text={row.original.description ?? '—'} />,
      meta: { className: 'text-muted-foreground' },
    },
    {
      id: 'sortOrder',
      header: () => <span className="block text-center">順</span>,
      cell: ({ row }) => row.original.sortOrder,
      meta: { className: 'w-[56px] text-center text-muted-foreground' },
    },
    {
      id: 'referenceCount',
      header: '参照数',
      cell: ({ row }) =>
        row.original.referenceCount > 0 ? (
          <span className="font-medium">{row.original.referenceCount}件</span>
        ) : (
          '0件'
        ),
      meta: { className: 'w-[80px]' },
    },
    {
      id: 'isActive',
      header: 'ステータス',
      cell: ({ row }) => (
        <Badge variant="outline" className={toStatusBadgeClass(row.original.isActive)}>
          {toLabel(row.original.isActive)}
        </Badge>
      ),
      meta: { className: 'w-[88px]' },
    },
    {
      id: 'updatedAt',
      header: '更新日',
      cell: ({ row }) => formatDate(row.original.updatedAt),
      meta: { className: 'w-[100px] text-muted-foreground' },
    },
  ];
  if (readOnly) return columns;
  return [
    ...columns,
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <MasterRowActions row={row.original} onEdit={onEdit} onDelete={onDelete} />
      ),
      // Pinned to the right edge while the table scrolls sideways.
      meta: {
        className: 'w-12',
        // className: 'w-12 sticky right-0',
        // headerClassName: 'z-20',
        // cellClassName: 'bg-card',
        stopRowClick: true,
      },
    },
  ];
}

interface ExerciseMasterTableProps {
  label: string;
  /** Header of the name column (用語解説 → 用語). */
  nameLabel: string;
  /** Rows of the current page. */
  items: readonly ExerciseMasterRow[];
  /** Rows matching the search across every page. */
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Filter-result banner rendered under the search box (only while a keyword is set). */
  filterBanner?: ReactNode;
  onCreate: () => void;
  onEdit: (row: ExerciseMasterRow) => void;
  onDelete: (row: ExerciseMasterRow) => void;
  /** List only: no row menu and no create button in the empty state. */
  readOnly?: boolean;
  /** `false`: no pagination footer (the caller passes every row). */
  paginated?: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ExerciseMasterTable({
  label,
  nameLabel,
  items,
  total,
  page,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  searchValue,
  onSearchChange,
  filterBanner,
  onCreate,
  onEdit,
  onDelete,
  readOnly = false,
  paginated = true,
  isLoading,
  isError,
  onRetry,
}: ExerciseMasterTableProps) {
  const columns = useMemo(
    () => getMasterColumns({ nameLabel, readOnly, onEdit, onDelete }),
    [nameLabel, readOnly, onEdit, onDelete],
  );
  const data = useMemo(() => [...items], [items]);

  const emptyContent = isError ? (
    <div className="flex h-28 flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground text-sm">一覧の取得に失敗しました。</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        再読み込み
      </Button>
    </div>
  ) : (
    <div className="flex h-36 flex-col items-center justify-center gap-3 text-center">
      <p className="text-muted-foreground text-sm">
        {searchValue ? '該当のデータがありません。' : '登録されたデータはありません。'}
      </p>
      {readOnly && !searchValue ? null : searchValue ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onSearchChange('')}>
          条件をクリア
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          className="gap-1 bg-black text-white hover:bg-black/90"
          onClick={onCreate}
        >
          <Plus className="size-4" />
          {label}を登録
        </Button>
      )}
    </div>
  );

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border p-0">
      <div className="border-b px-4 py-3">
        <div className="relative max-w-[420px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchValue}
            maxLength={MASTER_KEYWORD_MAX_LENGTH}
            placeholder={`${nameLabel}・コードで検索...`}
            className="pl-9 text-sm"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      {filterBanner}

      {/* Fixed layout: long values truncate inside their column instead of widening the table.
          The min width keeps the 名称 column readable; below it the table scrolls and the row
          menu stays pinned to the right edge. */}
      <DataTable
        columns={columns}
        data={isError ? [] : data}
        isLoading={isLoading}
        variant="simple"
        className="rounded-none border-0 text-xs [&_table]:min-w-[1000px] [&_table]:table-fixed [&_td]:text-xs"
        emptyContent={emptyContent}
      />

      {paginated && !isLoading && !isError && total > 0 ? (
        <TablePaginationWithSize
          total={total}
          currentPage={page}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </Card>
  );
}
