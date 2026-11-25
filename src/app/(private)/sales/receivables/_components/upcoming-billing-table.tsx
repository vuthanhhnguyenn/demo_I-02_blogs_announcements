import type { ColumnDef } from '@tanstack/react-table';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import type { UpcomingBillingItemDto } from '@/lib/api-real/types.gen';

import {
  BILLING_TYPE_LABELS,
  type BillingType,
  CONFIRM_STATUS_LABELS,
  type ConfirmStatus,
  formatYen,
  getPaymentMethodLabel,
} from '../../_constants/sales-labels.constant';
import { RECEIVABLE_PAGE_SIZE_OPTIONS } from '../_hooks/use-receivables-filters.hook';

/** `billingType` / `confirmStatus` are typed `string` on this DTO — label known values, else raw */
function getBillingTypeLabel(billingType: string): string {
  return BILLING_TYPE_LABELS[billingType as BillingType] ?? billingType;
}

function getConfirmStatusLabel(confirmStatus: string): string {
  return CONFIRM_STATUS_LABELS[confirmStatus as ConfirmStatus] ?? confirmStatus;
}

interface UpcomingBillingTableProps {
  items: UpcomingBillingItemDto[];
  isLoading: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function UpcomingBillingTable({
  items,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: Readonly<UpcomingBillingTableProps>) {
  const columns: ColumnDef<UpcomingBillingItemDto>[] = [
    {
      id: 'memberNumber',
      header: '会員ID',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.memberNumber ?? '—'}
        </span>
      ),
    },
    {
      id: 'memberName',
      header: '氏名',
      cell: ({ row }) => (
        <span className="block min-w-32 text-sm font-medium wrap-anywhere whitespace-normal">
          {row.original.memberName ?? '—'}
        </span>
      ),
    },
    {
      id: 'billingType',
      header: '請求区分',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`px-1 py-0 text-[10px] ${
            row.original.billingType === 'carryover'
              ? 'bg-warning/15 text-warning border-warning/20'
              : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          {getBillingTypeLabel(row.original.billingType)}
        </Badge>
      ),
    },
    {
      id: 'paymentMethod',
      header: '決済手段',
      cell: ({ row }) => (
        <span className="text-xs">{getPaymentMethodLabel(row.original.paymentMethod)}</span>
      ),
    },
    {
      id: 'totalAmount',
      header: () => <div className="text-right">請求金額</div>,
      cell: ({ row }) => (
        <div className="text-right text-sm font-semibold tabular-nums">
          {formatYen(row.original.totalAmount)}
        </div>
      ),
    },
    {
      id: 'billingMonth',
      header: '請求予定月',
      cell: ({ row }) => <span className="text-xs">{row.original.billingMonth}</span>,
    },
    {
      id: 'confirmStatus',
      header: 'ステータス',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`px-1 py-0 text-[10px] ${
            row.original.confirmStatus === 'confirmed'
              ? 'bg-success/15 text-success border-success/20'
              : 'bg-warning/15 text-warning border-warning/20'
          }`}
        >
          {getConfirmStatusLabel(row.original.confirmStatus)}
        </Badge>
      ),
    },
    // TODO(round3) R304: 備考 column — UpcomingBillingItemDto has no note and the spec is silent — integrate in phase 2
    // {
    //   id: 'note',
    //   header: '備考',
    //   cell: ({ row }) => (
    //     <span className="text-muted-foreground text-xs">{row.original.note || '-'}</span>
    //   ),
    // },
  ];

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border py-0">
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        variant="simple"
        className="rounded-none border-x-0 border-b-0"
        emptyContent={
          <Empty variant="empty" title="翌月請求予定はありません" entityLabel="請求予定" />
        }
      />

      {totalCount > 0 && (
        <TablePaginationWithSize
          total={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={RECEIVABLE_PAGE_SIZE_OPTIONS}
        />
      )}
    </Card>
  );
}
