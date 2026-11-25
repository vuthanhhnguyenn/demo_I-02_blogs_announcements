'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { RotateCcw } from 'lucide-react';

import { DisabledReasonButton } from '@/components/common/disabled-reason-button';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';

import type { TransactionRowDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import {
  TRANSACTION_CANCELLED_REFUND_REASON,
  TRANSACTION_DISPLAY_STATUS_BADGE_CLASS,
  TRANSACTION_DISPLAY_STATUS_LABELS,
  TRANSACTION_TYPE_BADGE_CLASS,
  TRANSACTION_TYPE_LABELS,
  formatBillingItemId,
  formatSignedYen,
  formatTransactionTaxRate,
  getTransactionDisplayStatus,
  getTransactionPaymentMethodLabel,
} from '../_utils/transaction-labels.util';

interface GetTransactionsTableColumnsOptions {
  onRequestRefund: (row: TransactionRowDto) => void;
}

export function getTransactionsTableColumns({
  onRequestRefund,
}: GetTransactionsTableColumnsOptions): ColumnDef<TransactionRowDto>[] {
  return [
    {
      id: 'transactionDate',
      accessorKey: 'transactionDate',
      header: '取引日',
      cell: ({ row }) => <span className="text-xs">{row.original.transactionDate}</span>,
    },
    {
      id: 'memberCode',
      header: '会員ID',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.memberCode ?? '—'}
        </span>
      ),
    },
    {
      id: 'memberName',
      header: '氏名',
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.memberName ?? '—'}</span>
      ),
    },
    {
      id: 'storeName',
      header: '店舗',
      cell: ({ row }) => <span className="text-xs">{row.original.storeName ?? '—'}</span>,
    },
    {
      id: 'transactionType',
      header: '取引種別',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`px-1 py-0 text-[10px] font-normal ${TRANSACTION_TYPE_BADGE_CLASS[row.original.transactionType]}`}
        >
          {TRANSACTION_TYPE_LABELS[row.original.transactionType]}
        </Badge>
      ),
    },
    {
      // API-116 v0.7.3 §3.5: sale / refund rows are one billing line each
      id: 'billingItemId',
      header: '請求明細ID',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatBillingItemId(row.original)}
        </span>
      ),
    },
    {
      id: 'amountExcludingTax',
      header: () => <div className="text-right">税抜額</div>,
      cell: ({ row }) => (
        <div className="text-right text-xs tabular-nums">
          {formatSignedYen(row.original.amountExcludingTax)}
        </div>
      ),
    },
    {
      id: 'taxRate',
      header: () => <div className="text-right">税率</div>,
      cell: ({ row }) => (
        <div className="text-right text-xs">{formatTransactionTaxRate(row.original)}</div>
      ),
    },
    {
      id: 'amountIncludingTax',
      header: () => <div className="text-right">税込額</div>,
      cell: ({ row }) => (
        <div
          className={`text-right text-xs font-medium tabular-nums ${row.original.amountIncludingTax < 0 ? 'text-destructive' : ''}`}
        >
          {formatSignedYen(row.original.amountIncludingTax)}
        </div>
      ),
    },
    {
      id: 'paymentMethod',
      header: '決済手段',
      cell: ({ row }) => (
        <span className="text-xs">
          {getTransactionPaymentMethodLabel(row.original.paymentMethod)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'ステータス',
      cell: ({ row }) => {
        const displayStatus = getTransactionDisplayStatus(row.original);
        return (
          <Badge
            variant="outline"
            className={`px-1 py-0 text-[10px] font-normal ${
              displayStatus
                ? TRANSACTION_DISPLAY_STATUS_BADGE_CLASS[displayStatus]
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {displayStatus ? TRANSACTION_DISPLAY_STATUS_LABELS[displayStatus] : row.original.status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const record = row.original;
        if (record.transactionType === 'sale' && record.status === 'cancelled') {
          return (
            <DisabledReasonButton
              disabled
              disabledReason={TRANSACTION_CANCELLED_REFUND_REASON}
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
            >
              <RotateCcw className="size-3" />
              返金申請
            </DisabledReasonButton>
          );
        }
        // FR-004: 各明細行から返金申請へ遷移可能 — 売上行のみ。API-116 v0.7.3 の一覧は返金できない
        // 明細の refundApplyContext を null で返す（入金前・キャンセル・返金済み・SBPS 90 日超過等）。
        if (
          record.transactionType !== 'sale' ||
          !record.refundApplyContext?.applicable ||
          !record.billingId ||
          !record.billingItemId
        ) {
          return <span className="text-muted-foreground text-[10px]">—</span>;
        }
        return (
          <RoleGatedButton
            requiredPermission={Permission.SalesRefundInitiate}
            denyTooltip="返金申請の権限がありません"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onRequestRefund(record);
            }}
          >
            <RotateCcw className="size-3" />
            返金申請
          </RoleGatedButton>
        );
      },
      meta: { className: 'w-30' },
    },
  ];
}
