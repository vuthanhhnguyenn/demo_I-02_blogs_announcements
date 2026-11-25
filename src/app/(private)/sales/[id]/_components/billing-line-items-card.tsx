'use client';

import { useState } from 'react';

import { Download, MoreHorizontal, Plus } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Permission } from '@/types/permission.type';

import { formatYen } from '../../_constants/sales-labels.constant';
import { useBillingDocumentDownload } from '../_hooks/use-billing-document-download.hook';
import {
  type BillingHeader,
  type BillingItem,
  LINE_PAYMENT_STATE_BADGE_CLASS,
  LINE_PAYMENT_STATE_LABELS,
  formatSignedYen,
  getLinePaymentState,
  isBillingConfirmed,
} from '../_utils/billing-detail-api.util';
import { BillingAddLineItemDialog } from './billing-add-line-item-dialog';

function ReceiptMenuItem({ item }: Readonly<{ item: BillingItem }>) {
  const download = useBillingDocumentDownload();

  return (
    <DropdownMenuItem
      // API-119 BR-RCP-001/002 + store scope over every billing the payment settled — the API's own predicate
      disabled={!item.receiptIssuable || download.isPending}
      onClick={() => download.mutate({ type: 'receipt', billingItemId: item.billingItemId })}
    >
      <Download className="mr-2 size-4" />
      領収書発行
    </DropdownMenuItem>
  );
}

interface BillingLineItemsCardProps {
  header: BillingHeader;
  items: BillingItem[];
}

export function BillingLineItemsCard({ header, items }: Readonly<BillingLineItemsCardProps>) {
  const [addOpen, setAddOpen] = useState(false);
  const isConfirmed = isBillingConfirmed(header);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="bg-muted/50 flex items-center justify-between border-b px-4 py-3">
        <CardTitle className="text-sm font-medium">請求明細情報</CardTitle>
        <RoleGatedButton
          requiredPermission={Permission.SalesLineItemAdd}
          denyTooltip="明細追加の権限がありません"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          // API-115 §9.1: lines can be added only while pending / unconfirmed (E-BIL-203) and
          // before the PSP send (E-BIL-210)
          disabled={isConfirmed || header.collectionStatus !== 'not_due'}
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-3" />
          明細追加
        </RoleGatedButton>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-25 text-xs font-semibold">請求明細ID</TableHead>
              <TableHead className="text-xs font-semibold">請求項目</TableHead>
              <TableHead className="text-right text-xs font-semibold">請求額</TableHead>
              <TableHead className="text-center text-xs font-semibold">税率</TableHead>
              <TableHead className="text-xs font-semibold">入金状態</TableHead>
              {/* S1 — FR-004 返金可能残高 (API-114 §6.4 items[].refundableAmount) */}
              <TableHead className="text-right text-xs font-semibold">返金可能残高</TableHead>
              <TableHead className="w-22.5 text-xs font-semibold" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const state = getLinePaymentState(item, header.collectionStatus);
              return (
                <TableRow key={item.billingItemId}>
                  {/* No public line id in the API — the UUID, shortened (full value on hover) */}
                  <TableCell className="font-mono text-xs" title={item.billingItemId}>
                    {item.billingItemId.slice(-8)}
                  </TableCell>
                  <TableCell className="min-w-40 text-xs wrap-anywhere whitespace-normal">
                    {item.description ?? item.itemType}
                    {item.quantity > 1 && (
                      <span className="text-muted-foreground"> × {item.quantity}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatSignedYen(item.amountWithTax)}
                  </TableCell>
                  <TableCell className="text-center text-xs">{item.taxRate}%</TableCell>
                  {/* An unconfirmed billing has not been sent for collection — no payment state yet */}
                  <TableCell className="text-xs">
                    {isConfirmed ? (
                      <Badge
                        variant="outline"
                        className={`px-1 py-0 text-[10px] font-normal ${LINE_PAYMENT_STATE_BADGE_CLASS[state]}`}
                      >
                        {LINE_PAYMENT_STATE_LABELS[state]}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatYen(item.refundableAmount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="hover:bg-accent hover:text-accent-foreground inline-flex size-7 cursor-pointer items-center justify-center rounded-md">
                        <MoreHorizontal className="text-muted-foreground size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* F-01 L308: 領収書は入金確認済みの明細のみ発行可（L313 入金未確認はブロック。#107 明細単位） */}
                        {/* #232: 要件外の「編集」アクション削除 */}
                        <ReceiptMenuItem item={item} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <BillingAddLineItemDialog open={addOpen} onOpenChange={setAddOpen} header={header} />
    </Card>
  );
}
