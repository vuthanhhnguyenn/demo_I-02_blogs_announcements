import type { ReactNode } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  COLLECTION_STATUS_LABELS,
  CONFIRM_STATUS_LABELS,
  formatYen,
  getPaymentMethodLabel,
} from '../../_constants/sales-labels.constant';
import type { BillingDetail } from '../_utils/billing-detail-api.util';

/** `payments.payment_status` (API-114 §6.5 — typed as string) */
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: '処理中',
  success: '入金済み',
  failed: '失敗',
  cancelled: 'キャンセル',
  refunded: '返金済み',
  partially_refunded: '一部返金済み',
};

/**
 * `refunds[].status` (API-114 §6.6). The SDK types it `requested / approved / executing /
 * succeeded / failed / cancelled` while the column itself is `pending / executing / succeeded /
 * failed` (API-118 §6 v0.14.2) — label both so no raw English value reaches the table.
 */
const REFUND_STATUS_LABELS: Record<string, string> = {
  requested: '承認待ち',
  approved: '承認済み',
  pending: '処理待ち',
  executing: '処理中',
  succeeded: '返金済み',
  failed: '失敗',
  cancelled: '取消',
};

function HistoryCard({
  title,
  emptyMessage,
  isEmpty,
  children,
}: Readonly<{ title: string; emptyMessage: string; isEmpty: boolean; children: ReactNode }>) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="bg-muted/50 border-b px-4 py-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isEmpty ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

interface BillingHistoryTabProps {
  detail: BillingDetail;
}

/** 変更履歴 — API-114 §6 `statusHistories` (newest first), `payments`, executed `refunds` */
export function BillingHistoryTab({ detail }: Readonly<BillingHistoryTabProps>) {
  const { statusHistories, payments, refunds } = detail;

  return (
    <div className="space-y-4">
      <HistoryCard
        title="ステータス変更履歴"
        emptyMessage="ステータス変更履歴はありません"
        isEmpty={statusHistories.length === 0}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">変更日時</TableHead>
              <TableHead className="text-xs font-semibold">確定状態</TableHead>
              <TableHead className="text-xs font-semibold">回収状態</TableHead>
              <TableHead className="text-xs font-semibold">事由</TableHead>
              <TableHead className="text-xs font-semibold">変更者</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statusHistories.map((history) => (
              <TableRow key={history.historyId}>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDateYYYYMMDD_HHMM(history.changedAt)}
                </TableCell>
                <TableCell className="text-xs">
                  {CONFIRM_STATUS_LABELS[history.prevConfirmStatus]} →{' '}
                  {CONFIRM_STATUS_LABELS[history.nextConfirmStatus]}
                </TableCell>
                <TableCell className="text-xs">
                  {COLLECTION_STATUS_LABELS[history.prevCollectionStatus]} →{' '}
                  {COLLECTION_STATUS_LABELS[history.nextCollectionStatus]}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {history.reason ?? '—'}
                </TableCell>
                <TableCell className="text-xs">{history.changedBy?.staffName ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </HistoryCard>

      <HistoryCard
        title="入金履歴"
        emptyMessage="入金履歴はありません"
        isEmpty={payments.length === 0}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">入金日時</TableHead>
              <TableHead className="text-right text-xs font-semibold">金額</TableHead>
              <TableHead className="text-xs font-semibold">決済手段</TableHead>
              <TableHead className="text-xs font-semibold">状態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.paymentId}>
                <TableCell className="text-muted-foreground text-xs">
                  {payment.paidAt ? formatDateYYYYMMDD_HHMM(payment.paidAt) : '—'}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {formatYen(payment.amount)}
                </TableCell>
                <TableCell className="text-xs">
                  {getPaymentMethodLabel(payment.paymentMethod)}
                </TableCell>
                <TableCell className="text-xs">
                  {PAYMENT_STATUS_LABELS[payment.paymentStatus] ?? payment.paymentStatus}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </HistoryCard>

      <HistoryCard
        title="返金実行履歴"
        emptyMessage="返金実行履歴はありません"
        isEmpty={refunds.length === 0}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-semibold">返金日時</TableHead>
              <TableHead className="text-right text-xs font-semibold">返金額</TableHead>
              <TableHead className="text-xs font-semibold">状態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map((refund) => (
              <TableRow key={refund.refundId}>
                <TableCell className="text-muted-foreground text-xs">
                  {refund.refundedAt ? formatDateYYYYMMDD_HHMM(refund.refundedAt) : '—'}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {formatYen(refund.totalRefundAmount)}
                </TableCell>
                <TableCell className="text-xs">
                  {REFUND_STATUS_LABELS[refund.status] ?? refund.status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </HistoryCard>
    </div>
  );
}
