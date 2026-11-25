'use client';

import { useAuthUser } from '@/contexts/auth-user.context';
import { Download } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { UserRole } from '@/types/permission.type';

import { formatYen } from '../../_constants/sales-labels.constant';
import { useBillingDocumentDownload } from '../_hooks/use-billing-document-download.hook';
import {
  type BillingHeader,
  type BillingItem,
  getInvoiceBlockedReason,
} from '../_utils/billing-detail-api.util';

/**
 * F-01 権限マトリクス 領収書・請求書出力: System / Headquarter / Manager / Staff. Role-only —
 * `SalesExport` is the 会計CSV permission and adds a 職位 flag this action does not have.
 */
const DOCUMENT_EXPORT_ROLES = [
  UserRole.System,
  UserRole.Headquarter,
  UserRole.Manager,
  UserRole.Staff,
] as const;

interface BillingDocumentExportMenuProps {
  header: BillingHeader;
  items: BillingItem[];
}

/**
 * FR-009 帳票 — 請求書 per billing (API-119 §13), 領収書 per line (API-119 §12, #107 明細単位):
 * the receipt entry opens a sub-menu of the lines the API marks `receiptIssuable`.
 */
export function BillingDocumentExportMenu({
  header,
  items,
}: Readonly<BillingDocumentExportMenuProps>) {
  const { hasRole } = useAuthUser();
  const download = useBillingDocumentDownload();
  const issuableItems = items.filter((item) => item.receiptIssuable);
  const invoiceBlockedReason = getInvoiceBlockedReason(header);

  if (!hasRole(DOCUMENT_EXPORT_ROLES)) {
    return (
      <RoleGatedButton
        allowedRoles={DOCUMENT_EXPORT_ROLES}
        denyTooltip="帳票出力の権限がありません"
        variant="outline"
        size="sm"
        className="h-8 gap-1 text-xs"
      >
        <Download className="size-4" />
        帳票
      </RoleGatedButton>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-3 text-xs font-medium">
        <Download className="size-4" />
        帳票
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-70">
        {issuableItems.length === 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="block" />}>
                <DropdownMenuItem disabled>
                  <Download className="mr-2 size-4" />
                  領収書をダウンロード（PDF）
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">入金確認済みの明細のみ発行できます</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={download.isPending}>
              <Download className="mr-2 size-4" />
              領収書をダウンロード（PDF）
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-70">
              {issuableItems.map((item) => (
                <DropdownMenuItem
                  key={item.billingItemId}
                  disabled={download.isPending}
                  onClick={() =>
                    download.mutate({ type: 'receipt', billingItemId: item.billingItemId })
                  }
                >
                  <span className="min-w-0 flex-1 truncate">
                    {item.description ?? item.itemType}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatYen(item.amountWithTax)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {/* FR-009 / API-119 BR-INV-001: an ineligible billing never reaches E-RCP-005 / E-RCP-002 */}
        {invoiceBlockedReason ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="block" />}>
                <DropdownMenuItem disabled>
                  <Download className="mr-2 size-4" />
                  請求書をダウンロード（PDF）
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">{invoiceBlockedReason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <DropdownMenuItem
            disabled={download.isPending}
            onClick={() => download.mutate({ type: 'invoice', billingId: header.billingId })}
          >
            <Download className="mr-2 size-4" />
            請求書をダウンロード（PDF）
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <p className="text-muted-foreground px-2 py-1 text-xs">
          ※ 入金確認済みのみ発行可。出力期間12ヶ月以内
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
