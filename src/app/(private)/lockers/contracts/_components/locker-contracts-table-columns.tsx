import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';

import type { LockerContractItemDto, LockerListItemDto } from '@/lib/api-real/types.gen';

import {
  LOCKER_OPTION_STATUS_BADGE_CLASSES,
  LOCKER_OPTION_STATUS_DOT_CLASSES,
  LOCKER_OPTION_STATUS_LABELS,
  LOCKER_SLOT_STATUS_BADGE_CLASSES,
  LOCKER_SLOT_STATUS_DOT_CLASSES,
  LOCKER_SLOT_STATUS_LABELS,
  formatLockerSlotLabel,
} from '../../_constants/locker-enum-labels.constants';

/** Column ids equal the API `sort` keys where the column is sortable */
export function getLockerContractsTableColumns(
  cabinets: Map<string, LockerListItemDto>,
  { showStoreColumn = false }: { showStoreColumn?: boolean } = {},
): ColumnDef<LockerContractItemDto>[] {
  // 全店舗 only. Contract rows carry `storeId` alone (API-101 §4.2), so the name comes from the
  // cabinet lookup, whose list rows carry `storeName` (API-100 §4.1 v0.15)
  const storeColumn: ColumnDef<LockerContractItemDto>[] = showStoreColumn
    ? [
        {
          id: 'storeName',
          header: '店舗',
          enableSorting: false,
          cell: ({ row }) => (
            <span className="whitespace-nowrap">
              {cabinets.get(row.original.lockerId)?.storeName ?? '—'}
            </span>
          ),
        },
      ]
    : [];

  return [
    {
      id: 'optionContractId',
      header: '契約ID',
      enableSorting: false,
      cell: ({ row }) => (
        <span
          className="text-muted-foreground font-mono text-xs"
          title={row.original.optionContractId ?? ''}
        >
          {row.original.optionContractId?.slice(0, 8) ?? '—'}
        </span>
      ),
    },
    ...storeColumn,
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
      id: 'slotCode',
      accessorKey: 'slotCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ロッカー番号" />,
      cell: ({ row }) => (
        <span>
          {formatLockerSlotLabel(
            cabinets.get(row.original.lockerId)?.locationCode,
            row.original.slotCode,
          )}
        </span>
      ),
    },
    {
      id: 'optionName',
      accessorKey: 'optionName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="契約種類" />,
      cell: ({ row }) =>
        row.original.optionName ? (
          <Badge variant="secondary">{row.original.optionName}</Badge>
        ) : (
          '—'
        ),
    },
    {
      id: 'contractedAt',
      accessorKey: 'contractedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="契約開始日" />,
      cell: ({ row }) => formatDateYYYYMMDD(row.original.contractedAt, '—'),
    },
    // No 契約終了日: a contract is open-ended until 解約, and its only end date is `cancellationDate`
    {
      id: 'cancellationDate',
      accessorKey: 'cancellationDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="解約日" />,
      cell: ({ row }) => formatDateYYYYMMDD(row.original.cancellationDate, '—'),
    },
    {
      id: 'optionStatus',
      header: 'ステータス',
      enableSorting: false,
      // Contract status and slot status are two vocabularies (Clarifications 2026-10-16): one
      // badge each, never merged
      cell: ({ row }) => {
        const { optionStatus, slotStatus } = row.original;
        if (!optionStatus && !slotStatus) return '—';
        return (
          <div className="flex flex-wrap items-center gap-1">
            {optionStatus ? (
              <Badge
                variant="outline"
                className={`gap-1 ${LOCKER_OPTION_STATUS_BADGE_CLASSES[optionStatus]}`}
              >
                <span
                  className={`size-1.5 rounded-full ${LOCKER_OPTION_STATUS_DOT_CLASSES[optionStatus]}`}
                />
                {LOCKER_OPTION_STATUS_LABELS[optionStatus]}
              </Badge>
            ) : null}
            {slotStatus ? (
              <Badge
                variant="outline"
                className={`gap-1 ${LOCKER_SLOT_STATUS_BADGE_CLASSES[slotStatus]}`}
                title="スロット状態"
              >
                <span
                  className={`size-1.5 rounded-full ${LOCKER_SLOT_STATUS_DOT_CLASSES[slotStatus]}`}
                />
                {LOCKER_SLOT_STATUS_LABELS[slotStatus]}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
  ];
}
