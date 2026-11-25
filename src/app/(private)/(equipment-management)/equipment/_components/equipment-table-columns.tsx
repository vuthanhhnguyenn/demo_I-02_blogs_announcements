import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { ConnectedDeviceDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { formatShortId } from '../../_utils/device-api.util';
import {
  EQUIPMENT_AUTH_METHOD_LABELS,
  EQUIPMENT_STATUS_BADGE_MAP,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_TYPE_LABELS,
  getUsageRuleBadges,
} from '../_constants/constants';

type EquipmentListItem = ConnectedDeviceDto;

/** Unrecorded optional values render as an em dash rather than an empty cell. */
const EMPTY_VALUE = '—';

/**
 * BUG-E02-A-13 / C-11 — table cells are `whitespace-nowrap`, so a 100-char name or a 200-char
 * 設置場所 stretched the table to thousands of px. Free-text cells are capped and ellipsised, with
 * the full value on hover.
 */
function TruncatedText({
  value,
  className,
  maxWidthClassName = 'max-w-[240px]',
}: {
  value: string | null | undefined;
  className?: string;
  maxWidthClassName?: string;
}) {
  if (!value) return <span className={className}>{EMPTY_VALUE}</span>;
  return (
    <span className={cn('block truncate', maxWidthClassName, className)} title={value}>
      {value}
    </span>
  );
}

type EquipmentTableColumnOptions = {
  /**
   * 店舗 is rendered only under the 全店舗 header scope (prototype `isAllStores`): inside a single
   * store every row carries the same value, so the column is dropped rather than repeated.
   */
  showStoreColumn?: boolean;
};

/**
 * Column set and order are normative: E-02 FR-001 §表示項目, as rendered by the prototype
 * (`equipment-list.tsx`). 接点制御先番号 / QRコードID / 更新日時 are deliberately absent —
 * none of them is an FR-001 display item, and they live on the detail screen instead.
 */
export function getEquipmentTableColumns({
  showStoreColumn = false,
}: EquipmentTableColumnOptions = {}): ColumnDef<EquipmentListItem>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="w-10 px-2">
          <Checkbox
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        </div>
      ),
      // BUG-E02-A-07 — the shared checkbox cell only stops propagation on its inner div, so a click
      // on the cell padding reached the row and opened the detail. The wrapper fills the whole cell
      // instead, and a click on its empty area toggles the selection like the checkbox itself.
      cell: ({ row }) => (
        <div
          className="absolute inset-0 flex cursor-default items-center px-2"
          onClick={(event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) row.toggleSelected();
          }}
        >
          <Checkbox
            checked={row.getIsSelected()}
            aria-label={`select ${row.original.name}`}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      meta: { className: 'w-10', cellClassName: 'relative p-0' },
    },
    {
      // Short UUID (formatShortId); no API-103 sort key for the id (D9).
      accessorKey: 'id',
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="接続機器ID" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs" title={row.original.id}>
          {formatShortId(row.original.id)}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="接続機器名" />,
      cell: ({ row }) => (
        <TruncatedText value={row.original.name} className="text-sm font-medium" />
      ),
    },
    ...(showStoreColumn
      ? ([
          {
            accessorKey: 'storeName',
            enableSorting: false,
            header: ({ column }) => <DataTableColumnHeader column={column} title="店舗" />,
            cell: ({ row }) => (
              <TruncatedText
                value={row.original.storeName}
                className="text-muted-foreground text-xs"
                maxWidthClassName="max-w-[160px]"
              />
            ),
          },
        ] satisfies ColumnDef<EquipmentListItem>[])
      : []),
    {
      accessorKey: 'deviceType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="機器タイプ" />,
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs font-normal">
          {EQUIPMENT_TYPE_LABELS[row.original.deviceType]}
        </Badge>
      ),
    },
    {
      accessorKey: 'serialNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="シリアルナンバー" />,
      cell: ({ row }) => (
        <TruncatedText
          value={row.original.serialNumber}
          className="text-muted-foreground font-mono text-xs"
          maxWidthClassName="max-w-[180px]"
        />
      ),
    },
    {
      accessorKey: 'ipAddress',
      header: ({ column }) => <DataTableColumnHeader column={column} title="IPアドレス" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {row.original.ipAddress?.trim() || EMPTY_VALUE}
        </span>
      ),
    },
    {
      accessorKey: 'macAddress',
      header: ({ column }) => <DataTableColumnHeader column={column} title="MACアドレス" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {row.original.macAddress?.trim() || EMPTY_VALUE}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: ({ column }) => <DataTableColumnHeader column={column} title="設置場所" />,
      cell: ({ row }) => <TruncatedText value={row.original.location} className="text-sm" />,
    },
    {
      accessorKey: 'installedOn',
      header: ({ column }) => <DataTableColumnHeader column={column} title="設置日" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {formatDateYYYYMMDD(row.original.installedOn, EMPTY_VALUE)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="状態" />,
      cell: ({ row }) => {
        const statusBadge = EQUIPMENT_STATUS_BADGE_MAP[row.original.status];

        return (
          <Badge variant="outline" className={statusBadge.badgeClassName}>
            <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
            {EQUIPMENT_STATUS_LABELS[row.original.status]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'authMethod',
      header: ({ column }) => <DataTableColumnHeader column={column} title="認証方式" />,
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {EQUIPMENT_AUTH_METHOD_LABELS[row.original.authMethod]}
        </span>
      ),
    },
    {
      // Derived from the usage-control fields; not a sortable API-103 key (D9).
      id: 'contractLinkTypes',
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="紐づき契約種別" />,
      cell: ({ row }) => (
        // One badge per judged axis (prototype 11/7); a shortened badge (ほかN種) or one that may
        // clip at the column width shows its full text in a tooltip.
        <div className="flex max-w-60 flex-col items-start gap-1">
          {getUsageRuleBadges(row.original).map((badge) =>
            badge.tooltip ? (
              <TooltipProvider key={badge.label}>
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex max-w-full" />}>
                    <Badge variant="outline" className="max-w-full cursor-help text-xs font-normal">
                      <span className="truncate">{badge.label}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{badge.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Badge key={badge.label} variant="outline" className="max-w-full text-xs font-normal">
                <span className="truncate">{badge.label}</span>
              </Badge>
            ),
          )}
        </div>
      ),
    },
  ];
}
