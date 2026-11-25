import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';

import type { LockerListItemDto } from '@/lib/api-real/types.gen';

import { LOCKER_SHAPE_TYPE_LABELS } from '../_constants/locker-enum-labels.constants';
import { formatLockerSlotRange } from '../_utils/locker-slot-numbering.util';

interface LockersTableColumnsOptions {
  /**
   * The list spans every store (HQ / system on 全店舗). `locationCode` repeats across stores, so the
   * 店舗 column is shown and the ロッカーID reads `storeCode` + `locationCode` (API-100 v0.15 §4.1).
   */
  readonly isAllStores?: boolean;
}

/** 「S-001 / A」 on an all-stores list, else the location symbol alone */
function formatLockerDisplayId(locker: LockerListItemDto, isAllStores: boolean): string {
  return isAllStores ? `${locker.storeCode} / ${locker.locationCode}` : locker.locationCode;
}

/**
 * Column ids equal the `sort` keys of `GET /admin/lockers`; columns the API cannot sort by
 * have `enableSorting: false`.
 */
export function getLockersTableColumns({
  isAllStores = false,
}: LockersTableColumnsOptions = {}): ColumnDef<LockerListItemDto>[] {
  const storeColumn: ColumnDef<LockerListItemDto>[] = isAllStores
    ? [
        {
          id: 'storeName',
          accessorKey: 'storeName',
          header: '店舗',
          enableSorting: false,
          cell: ({ row }) => <span>{row.original.storeName}</span>,
        },
      ]
    : [];

  return [
    {
      id: 'locationCode',
      accessorKey: 'locationCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ロッカーID" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatLockerDisplayId(row.original, isAllStores)}
        </span>
      ),
    },
    ...storeColumn,
    {
      id: 'locationName',
      accessorKey: 'locationName',
      header: 'エリア',
      enableSorting: false,
      cell: ({ row }) => <span>{row.original.locationName}</span>,
    },
    {
      id: 'shapeType',
      accessorKey: 'shapeType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="形状" />,
      cell: ({ row }) => (
        <Badge variant="secondary">{LOCKER_SHAPE_TYPE_LABELS[row.original.shapeType]}</Badge>
      ),
    },
    {
      id: 'optionName',
      accessorKey: 'optionName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="契約種類（初期設定）" />
      ),
      cell: ({ row }) => <span>{row.original.optionName ?? '—'}</span>,
    },
    {
      id: 'slotCount',
      accessorKey: 'slotCount',
      header: () => <span className="block text-center">スロット数</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="block text-center font-medium">{row.original.slotCount}</span>
      ),
      meta: { className: 'text-center' },
    },
    {
      id: 'availableSlotCount',
      accessorKey: 'availableSlotCount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="空き/使用中" className="justify-center" />
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-success font-medium">{row.original.availableSlotCount}</span>
          <span className="text-muted-foreground mx-1">/</span>
          <span className="text-info font-medium">{row.original.inUseSlotCount}</span>
        </div>
      ),
      meta: { className: 'text-center' },
    },
    {
      id: 'numberingPattern',
      header: 'ナンバリングパターン',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatLockerSlotRange(
            row.original.locationCode,
            row.original.slotStartNumber,
            row.original.slotCount,
          )}
        </span>
      ),
    },
  ];
}
