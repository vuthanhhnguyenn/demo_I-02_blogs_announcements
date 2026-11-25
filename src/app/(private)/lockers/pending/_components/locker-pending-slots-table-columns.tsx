import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

import type { PendingReleaseSlotDto } from '@/lib/api-real/types.gen';

import {
  LOCKER_LOCK_METHOD_LABELS,
  formatLockerSlotLabel,
} from '../../_constants/locker-enum-labels.constants';
import type { LockerSlotReleaseTarget } from '../../_utils/locker-slot-release.util';

function pendingDaysClass(days: number) {
  if (days >= 30) return 'bg-destructive/15 text-destructive border-destructive/20';
  if (days >= 14) return 'bg-warning/15 text-warning border-warning/20';
  return 'bg-muted text-muted-foreground border-border';
}

export function toPendingReleaseTarget(row: PendingReleaseSlotDto): LockerSlotReleaseTarget {
  return {
    slotId: row.slotId,
    label: formatLockerSlotLabel(row.lockerLocationCode, row.slotCode),
  };
}

type LockerPendingSlotsTableColumnsOptions = {
  canSelect?: boolean;
  /** No store picked (全店舗): rows come from several stores, so a 店舗 column says which */
  showStoreColumn: boolean;
  areAllCurrentRowsSelected: boolean;
  selectedIds: Set<string>;
  toggleAllCurrentRows: () => void;
  toggleRow: (target: LockerSlotReleaseTarget) => void;
};

/** Column ids equal the API `sort` keys where the column is sortable */
export function getLockerPendingSlotsTableColumns({
  canSelect = true,
  showStoreColumn,
  areAllCurrentRowsSelected,
  selectedIds,
  toggleAllCurrentRows,
  toggleRow,
}: LockerPendingSlotsTableColumnsOptions): ColumnDef<PendingReleaseSlotDto>[] {
  const selectColumn: ColumnDef<PendingReleaseSlotDto> = {
    id: 'select',
    header: () => (
      <div className="flex justify-center">
        <Checkbox checked={areAllCurrentRowsSelected} onCheckedChange={toggleAllCurrentRows} />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={selectedIds.has(row.original.slotId)}
          onCheckedChange={() => toggleRow(toPendingReleaseTarget(row.original))}
        />
      </div>
    ),
    enableSorting: false,
    meta: { className: 'w-10 text-center' },
  };

  const storeColumn: ColumnDef<PendingReleaseSlotDto> = {
    id: 'storeName',
    header: '店舗',
    enableSorting: false,
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.storeName}</span>,
  };

  return [
    ...(canSelect ? [selectColumn] : []),
    {
      id: 'slotCode',
      accessorKey: 'slotCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="スロット番号" />,
      cell: ({ row }) => (
        <span className="font-medium">
          {formatLockerSlotLabel(row.original.lockerLocationCode, row.original.slotCode)}
        </span>
      ),
    },
    ...(showStoreColumn ? [storeColumn] : []),
    {
      id: 'lockerLocationCode',
      accessorKey: 'lockerLocationCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ロケーション" />,
      cell: ({ row }) => (
        <span>
          {row.original.lockerLocationCode}: {row.original.lockerLocationName}
        </span>
      ),
    },
    {
      id: 'lockerName',
      header: 'ロッカー名',
      enableSorting: false,
      cell: ({ row }) => <span>{row.original.lockerName ?? row.original.lockerLocationName}</span>,
    },
    {
      id: 'memberName',
      accessorKey: 'memberName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="会員名" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.memberName ?? '—'}</p>
          <p className="text-muted-foreground text-xs">{row.original.memberNumber ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'cancellationDate',
      accessorKey: 'cancellationDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="解約日" />,
      cell: ({ row }) => formatDateYYYYMMDD(row.original.cancellationDate, '—'),
    },
    {
      id: 'daysSincePendingRelease',
      accessorKey: 'daysSincePendingRelease',
      header: ({ column }) => <DataTableColumnHeader column={column} title="開放待ち日数" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={pendingDaysClass(row.original.daysSincePendingRelease)}>
          {row.original.daysSincePendingRelease}日
        </Badge>
      ),
    },
    {
      id: 'size',
      header: 'スロットサイズ',
      enableSorting: false,
      cell: ({ row }) => {
        const { widthCm, heightCm, depthCm } = row.original.slotSize;
        return (
          <span className="text-muted-foreground text-xs">
            W{widthCm}×H{heightCm}×D{depthCm}cm
          </span>
        );
      },
    },
    {
      id: 'lockMethod',
      header: '施錠方法',
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="secondary">{LOCKER_LOCK_METHOD_LABELS[row.original.lockMethod]}</Badge>
      ),
    },
  ];
}
