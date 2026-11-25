import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';

import type { RelayControllerListItemDto } from '@/lib/api-real/types.gen';

import {
  CONTROLLER_LIST_COLUMN_HEADERS,
  CONTROLLER_STATUS_BADGE_MAP,
  CONTROLLER_STATUS_LABELS,
} from '../_constants/constants';

type ControllerListItem = RelayControllerListItemDto;

function renderNullable(value: string | number | null) {
  return value === null || value === '' ? '---' : value;
}

/**
 * The nine columns of the prototype's controller panel. 店舗コード is dropped while the header
 * scope is a single store, exactly as the prototype does (`showStoreColumn`).
 */
export function getControllerTableColumns(
  showStoreColumn: boolean,
): ColumnDef<ControllerListItem>[] {
  const storeColumn: ColumnDef<ControllerListItem>[] = showStoreColumn
    ? [
        {
          // No API-104 sort key.
          accessorKey: 'storeCode',
          enableSorting: false,
          header: ({ column }) => (
            <DataTableColumnHeader
              column={column}
              title={CONTROLLER_LIST_COLUMN_HEADERS.storeCode}
            />
          ),
          cell: ({ row }) => (
            <span className="text-sm">{renderNullable(row.original.storeCode)}</span>
          ),
        },
      ]
    : [];

  return [
    {
      // 接点制御装置ID = the entered `relayId` (Session 2026-11-09; was the short UUID); no API-104
      // sort key. Long ids truncate with the full value in `title`.
      accessorKey: 'relayId',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={CONTROLLER_LIST_COLUMN_HEADERS.id} />
      ),
      cell: ({ row }) => (
        <span
          className="text-muted-foreground block max-w-40 truncate font-mono text-xs"
          title={row.original.relayId}
        >
          {row.original.relayId}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={CONTROLLER_LIST_COLUMN_HEADERS.name} />
      ),
      // BUG-E02-D-06 / F-10 — a long or unbroken 装置名 must not widen the whole table: one line,
      // truncated, with the full value on hover.
      cell: ({ row }) => (
        <span className="block max-w-[240px] truncate text-sm" title={row.original.name}>
          {renderNullable(row.original.name)}
        </span>
      ),
    },
    ...storeColumn,
    {
      accessorKey: 'location',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={CONTROLLER_LIST_COLUMN_HEADERS.location} />
      ),
      cell: ({ row }) => (
        <span
          className="text-muted-foreground block max-w-[200px] truncate text-sm"
          title={row.original.location ?? undefined}
        >
          {renderNullable(row.original.location)}
        </span>
      ),
    },
    {
      accessorKey: 'ipAddress',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={CONTROLLER_LIST_COLUMN_HEADERS.ipAddress} />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {renderNullable(row.original.ipAddress)}
        </span>
      ),
    },
    {
      accessorKey: 'firmwareVersion',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={CONTROLLER_LIST_COLUMN_HEADERS.firmwareVersion}
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {renderNullable(row.original.firmwareVersion)}
        </span>
      ),
    },
    {
      accessorKey: 'controlPortCount',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={CONTROLLER_LIST_COLUMN_HEADERS.controlPortCount}
          className="justify-center"
        />
      ),
      cell: ({ row }) => (
        <span className="block text-center text-sm tabular-nums">
          {renderNullable(row.original.controlPortCount)}
        </span>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'connectedDeviceCount',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={CONTROLLER_LIST_COLUMN_HEADERS.connectedDeviceCount}
          className="justify-center"
        />
      ),
      cell: ({ row }) => (
        <span className="block text-center text-sm tabular-nums">
          {row.original.connectedDeviceCount}台
        </span>
      ),
      meta: { className: 'text-center' },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={CONTROLLER_LIST_COLUMN_HEADERS.status} />
      ),
      cell: ({ row }) => {
        const statusBadge = CONTROLLER_STATUS_BADGE_MAP[row.original.status];

        return (
          <Badge variant="outline" className={statusBadge.badgeClassName}>
            <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
            {CONTROLLER_STATUS_LABELS[row.original.status]}
          </Badge>
        );
      },
    },
  ];
}
