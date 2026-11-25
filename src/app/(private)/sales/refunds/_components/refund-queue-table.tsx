'use client';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnCheckbox } from '@/components/common/data-table/data-table-column-checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

import type { RefundApplicationListItemDto } from '@/lib/api-real/types.gen';

import {
  REFUND_DISPLAY_STATUS_BADGE_CLASS,
  REFUND_DISPLAY_STATUS_LABELS,
  formatYen,
  getPaymentMethodLabel,
  getRefundReasonLabel,
} from '../../_constants/sales-labels.constant';
import { APPLICANT_ROLE_BADGE_LABELS } from '../_utils/refund-api.util';

export function getMemberName(
  item: Pick<RefundApplicationListItemDto, 'memberLastName' | 'memberFirstName'>,
): string {
  return `${item.memberLastName} ${item.memberFirstName}`.trim() || '—';
}

export function getPaymentMethodsLabel(methods: readonly string[]): string {
  return methods.length > 0 ? methods.map(getPaymentMethodLabel).join(' / ') : '—';
}

/**
 * FR-004-a refund queue columns, in the FR order: 申請日・会員ID・氏名・返金金額・返金事由・申請者・決済手段・
 * ステータス (Bug-No3 / TC UT 21). Sortable column ids are exactly the API-118 §5 `sort` keys
 * (appliedAt / totalRefundAmount / status).
 */
export function getRefundQueueColumns(): ColumnDef<RefundApplicationListItemDto>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => {
        const selectableRows = table.getRowModel().rows.filter((row) => row.getCanSelect());
        return (
          <Checkbox
            aria-label="Select all"
            checked={selectableRows.length > 0 && table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            disabled={selectableRows.length === 0}
          />
        );
      },
      cell: ({ row }) =>
        row.getCanSelect() ? (
          <DataTableColumnCheckbox row={row} />
        ) : (
          <div className="size-4" onClick={(event) => event.stopPropagation()} />
        ),
      enableSorting: false,
      enableHiding: false,
      meta: { className: 'w-10' },
    },
    {
      id: 'appliedAt',
      accessorKey: 'appliedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="申請日" />,
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap">
          {formatDateYYYYMMDD_HHMM(row.original.appliedAt, '-')}
        </span>
      ),
    },
    {
      id: 'memberCode',
      accessorKey: 'memberCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="会員ID" />,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.memberCode || '—'}</span>
      ),
    },
    {
      id: 'memberName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="氏名" />,
      enableSorting: false,
      cell: ({ row }) => <span className="text-xs font-medium">{getMemberName(row.original)}</span>,
    },
    {
      id: 'totalRefundAmount',
      accessorKey: 'totalRefundAmount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="返金金額" className="ml-auto justify-end" />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right text-xs font-medium tabular-nums">
          {formatYen(row.original.totalRefundAmount)}
        </div>
      ),
    },
    {
      id: 'applicationReason',
      header: ({ column }) => <DataTableColumnHeader column={column} title="返金事由" />,
      enableSorting: false,
      cell: ({ row }) => (
        <TextWithTooltip text={getRefundReasonLabel(row.original)} className="max-w-48 text-xs" />
      ),
    },
    {
      id: 'appliedBy',
      header: ({ column }) => <DataTableColumnHeader column={column} title="申請者" />,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="truncate text-xs">{row.original.appliedByName || '—'}</span>
          <Badge
            variant="outline"
            className="bg-muted/60 text-muted-foreground border-border shrink-0 px-1 py-0 text-[9px]"
          >
            {APPLICANT_ROLE_BADGE_LABELS[row.original.appliedRole]}
          </Badge>
        </div>
      ),
    },
    {
      id: 'paymentMethods',
      header: ({ column }) => <DataTableColumnHeader column={column} title="決済手段" />,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs">{getPaymentMethodsLabel(row.original.paymentMethods)}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'displayStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ステータス" />,
      enableSorting: true,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`px-1 py-0 text-[10px] ${REFUND_DISPLAY_STATUS_BADGE_CLASS[row.original.displayStatus]}`}
        >
          {REFUND_DISPLAY_STATUS_LABELS[row.original.displayStatus]}
        </Badge>
      ),
    },
  ];
}
