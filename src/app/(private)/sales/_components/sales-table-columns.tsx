'use client';

import type { ColumnDef, SortingState } from '@tanstack/react-table';

import { DataTableColumnCheckbox } from '@/components/common/data-table/data-table-column-checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

import type { Api114BillingListItemDto } from '@/lib/api-real/types.gen';

import {
  BILLING_TYPE_LABELS,
  CONFIRM_STATUS_LABELS,
  type ConfirmStatus,
  REFUND_DISPLAY_STATUS_BADGE_CLASS,
  REFUND_DISPLAY_STATUS_LABELS,
  getPaymentMethodLabel,
} from '../_constants/sales-labels.constant';
import type { SalesListSort } from '../_hooks/use-sales-filters.hook';

function formatYen(amount: number): string {
  return `${amount.toLocaleString('ja-JP')}円`;
}

/**
 * API-114 §5 offers four fixed sorts, not per-column sort (015 D7). Only these columns keep a sort
 * affordance; `billingMonthDesc` is the default and has no column.
 */
const SORT_BY_COLUMN = {
  memberName: 'memberIdAsc',
  totalAmount: 'totalAmountDesc',
  unpaidAmount: 'unpaidAmountDesc',
} as const satisfies Record<string, SalesListSort>;

type SortableColumnId = keyof typeof SORT_BY_COLUMN;

/** The table's sorting state for an API sort (`memberIdAsc` reads as ascending) */
export function toSalesSortingState(sort: SalesListSort): SortingState {
  const entry = Object.entries(SORT_BY_COLUMN).find(([, value]) => value === sort);
  if (!entry) return [];
  return [{ id: entry[0], desc: sort !== 'memberIdAsc' }];
}

/**
 * The API sort for a header click. Clicking another sortable column switches to its fixed sort;
 * clicking the active column again falls back to the default (`null`).
 */
export function fromSalesSortingState(
  next: SortingState,
  current: SalesListSort,
): SalesListSort | null {
  const column = next[0]?.id as SortableColumnId | undefined;
  const sort = column ? SORT_BY_COLUMN[column] : undefined;
  if (!sort || sort === current) return null;
  return sort;
}

/** `pending` and `unconfirmed` are both 未確定 (015 D8) */
export function isUnconfirmedBilling(status: ConfirmStatus): boolean {
  return status !== 'confirmed';
}

function getConfirmStatusBadgeClass(status: ConfirmStatus) {
  return isUnconfirmedBilling(status)
    ? 'bg-warning/15 text-warning border-warning/20'
    : 'bg-success/15 text-success border-success/20';
}

/** `showStore`: the 店舗 column is shown only under the 全店舗 header scope (prototype FR-021) */
export function getSalesTableColumns({
  showStore,
}: {
  showStore: boolean;
}): ColumnDef<Api114BillingListItemDto>[] {
  const columns: ColumnDef<Api114BillingListItemDto>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="w-10 px-2">
          <Checkbox
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        </div>
      ),
      cell: ({ row }) => <DataTableColumnCheckbox row={row} className="w-10" />,
      enableSorting: false,
      enableHiding: false,
      meta: { className: 'w-10' },
    },
    {
      id: 'publicId',
      accessorKey: 'publicId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="請求ID" />,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">{row.original.publicId}</span>
      ),
    },
    {
      id: 'storeName',
      accessorKey: 'storeName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="店舗" />,
      enableSorting: false,
      // 015A-11: a long store name wraps instead of pushing the amount columns off-screen
      cell: ({ row }) => (
        <p className="max-w-48 min-w-24 text-xs wrap-anywhere whitespace-normal">
          {row.original.storeName ?? '—'}
        </p>
      ),
    },
    {
      id: 'memberName',
      accessorKey: 'memberName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="利用者" />,
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <p className="text-xs font-medium">{row.original.memberName ?? '—'}</p>
          <p className="text-muted-foreground text-[10px]">{row.original.memberDisplayId ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'billingType',
      accessorKey: 'billingType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="請求区分" />,
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs font-normal">
          {BILLING_TYPE_LABELS[row.original.billingType] ?? row.original.billingType}
        </Badge>
      ),
    },
    {
      id: 'paymentMethod',
      accessorKey: 'paymentMethod',
      header: ({ column }) => <DataTableColumnHeader column={column} title="決済手段" />,
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs font-normal">
          {getPaymentMethodLabel(row.original.paymentMethod)}
        </Badge>
      ),
    },
    {
      id: 'totalAmount',
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="請求額(税込)"
          className="ml-auto justify-end"
        />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right text-xs tabular-nums">{formatYen(row.original.totalAmount)}</div>
      ),
    },
    {
      id: 'unpaidAmount',
      accessorKey: 'unpaidAmount',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="未納金(税込)"
          className="ml-auto justify-end"
        />
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const isUnpaid = row.original.unpaidAmount > 0;
        return (
          <div
            className={`text-right text-xs tabular-nums ${isUnpaid ? 'text-destructive font-medium' : ''}`}
          >
            {isUnpaid ? formatYen(row.original.unpaidAmount) : '—'}
          </div>
        );
      },
    },
    {
      id: 'confirmStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ステータス" />,
      enableSorting: false,
      cell: ({ row }) => {
        const { confirmStatus, collectionStatus, refundStatus } = row.original;
        return (
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={`px-1 py-0 text-[10px] ${getConfirmStatusBadgeClass(confirmStatus)}`}
            >
              {CONFIRM_STATUS_LABELS[confirmStatus]}
            </Badge>
            {/* FR-007: written off by 月末貸倒処理 — matches the 貸倒N件 KPI */}
            {collectionStatus === 'written_off' && (
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground border-border px-1 py-0 text-[10px]"
              >
                貸倒
              </Badge>
            )}
            {/* `refundStatus` is null when the billing has no refund application (API-114 §5) */}
            {refundStatus != null && (
              <Badge
                variant="outline"
                className={`px-1 py-0 text-[10px] ${REFUND_DISPLAY_STATUS_BADGE_CLASS[refundStatus]}`}
              >
                {REFUND_DISPLAY_STATUS_LABELS[refundStatus]}
              </Badge>
            )}
          </div>
        );
      },
    },
  ];
  return showStore ? columns : columns.filter((column) => column.id !== 'storeName');
}
