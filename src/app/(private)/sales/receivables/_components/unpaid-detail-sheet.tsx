'use client';

// Client component: React Query hooks require the browser.
import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { MoreHorizontal, Receipt } from 'lucide-react';

import { Error as ErrorState } from '@/components/common/data-state-boundary/error';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminReceivableControllerMemberDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ReceivableKonbiniSlipDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { formatYen, getPaymentMethodLabel } from '../../_constants/sales-labels.constant';
import {
  RECEIVABLE_STATUS_BADGE_CLASS,
  RECEIVABLE_STATUS_LABELS,
  RECEIVABLE_SUB_STATUS_BADGE_CLASS,
  RECEIVABLE_SUB_STATUS_LABELS,
  type ReceivableBillingTarget,
  formatDateTime,
  getExclusionTargets,
  getItemContractTypeLabel,
  getKonbiniTargets,
} from '../_utils/receivable-status.util';
import type { BadDebtDialogMode, BadDebtDialogScope } from './bad-debt-exclusion-dialog';
import { BAD_DEBT_EXCLUSION_ROLES } from './unpaid-table';

const KONBINI_SLIP_STATUS_LABELS: Record<ReceivableKonbiniSlipDto['status'], string> = {
  issued: '支払待ち',
  paid: '支払済',
  expired: '期限切れ',
  cancelled: '取消',
};

interface UnpaidDetailSheetProps {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `memberNumber` is the display 会員ID shown in the konbini dialog */
  onIssueConvenience: (
    memberNumber: string,
    memberName: string,
    billings: ReceivableBillingTarget[],
  ) => void;
  onBadDebtAction: (
    memberName: string,
    mode: BadDebtDialogMode,
    billings: ReceivableBillingTarget[],
    scope: BadDebtDialogScope,
  ) => void;
}

export function UnpaidDetailSheet({
  memberId,
  open,
  onOpenChange,
  onIssueConvenience,
  onBadDebtAction,
}: Readonly<UnpaidDetailSheetProps>) {
  const { data, isLoading, isError, refetch } = useQuery({
    ...adminReceivableControllerMemberDetailOptions({
      path: { memberId: memberId ?? '' },
      query: { includeKonbiniHistory: true },
    }),
    enabled: open && !!memberId,
  });

  const memberName = data?.memberName ?? data?.memberNumber ?? memberId ?? '';
  const unpaidBillings = data?.unpaidBillings ?? [];
  const konbiniTargets = getKonbiniTargets(unpaidBillings);
  const konbiniHistory = data?.konbiniHistory ?? [];
  const excludeTargets = getExclusionTargets(unpaidBillings, 'exclude');
  const releaseTargets = getExclusionTargets(unpaidBillings, 'release');
  const activeExclusion = data?.exclusionStatus?.isActive ? data.exclusionStatus : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-140 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-140">
        {isLoading && (
          <div className="space-y-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {/* 403 / 404 / 5xx: say so with a retry instead of opening a blank sheet (a failed background
            refetch keeps the data already shown) */}
        {!isLoading && isError && !data && (
          <div className="flex flex-col gap-4 p-6">
            <SheetHeader className="gap-1 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <Receipt className="size-4 shrink-0" />
                未納金の詳細
              </SheetTitle>
              <SheetDescription className="sr-only">
                未納金の詳細を取得できませんでした
              </SheetDescription>
            </SheetHeader>
            <ErrorState
              description="未納金の詳細を取得できませんでした。時間をおいて再度お試しください。"
              onRetry={() => void refetch()}
            />
          </div>
        )}

        {!isLoading && data && memberId && (
          <>
            <div className="shrink-0 border-b px-6 py-4">
              <SheetHeader className="gap-1 p-0">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Receipt className="size-4 shrink-0" />
                  <span className="shrink-0">未納金 #{data.memberNumber ?? memberId}</span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 px-1 py-0 text-[10px] ${RECEIVABLE_STATUS_BADGE_CLASS[data.displayStatus]}`}
                  >
                    {RECEIVABLE_STATUS_LABELS[data.displayStatus]}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-muted-foreground m-0 flex items-center gap-2 text-xs font-normal">
                  <span className="truncate">{data.memberName ?? '—'}</span>
                  <span className="text-muted-foreground/50 shrink-0">・</span>
                  <span className="text-[11px]">{data.storeName ?? '—'}</span>
                </SheetDescription>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-3 py-4">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  会員情報
                </h4>
                <div className="divide-y overflow-hidden rounded-md border text-xs">
                  <div className="grid grid-cols-[96px_1fr]">
                    <span className="bg-muted/40 text-muted-foreground px-3 py-2">店舗</span>
                    <span className="px-3 py-2">{data.storeName ?? '—'}</span>
                  </div>
                  <div className="grid grid-cols-[96px_1fr]">
                    <span className="bg-muted/40 text-muted-foreground px-3 py-2">会員ID</span>
                    {/* FR-002-b: drill-down to the member detail */}
                    <Link
                      href={navigate('/members/[id]', memberId)}
                      className="text-primary px-3 py-2 font-mono hover:underline hover:underline-offset-2"
                    >
                      {data.memberNumber ?? memberId}
                    </Link>
                  </div>
                  <div className="grid grid-cols-[96px_1fr]">
                    <span className="bg-muted/40 text-muted-foreground px-3 py-2">氏名</span>
                    {/* FR-002-b: drill-down to the member detail */}
                    <Link
                      href={navigate('/members/[id]', memberId)}
                      className="text-primary px-3 py-2 font-medium hover:underline hover:underline-offset-2"
                    >
                      {data.memberName ?? '—'}
                    </Link>
                  </div>
                  <div className="grid grid-cols-[96px_1fr]">
                    <span className="bg-muted/40 text-muted-foreground px-3 py-2">決済手段</span>
                    <span className="px-3 py-2 text-xs">
                      {getPaymentMethodLabel(data.paymentMethod)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[96px_1fr]">
                    <span className="bg-muted/40 text-muted-foreground px-3 py-2">未納総額</span>
                    <span className="text-destructive px-3 py-2 font-semibold tabular-nums">
                      {formatYen(data.totalUnpaid)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="-mx-6 w-[calc(100%+48px)]" />

              {/* FR-007: 貸倒対象外指定の記録（担当者・日時・理由）— shown even when not designated, with 「—」 */}
              <div className="space-y-3 py-4">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  貸倒対象外指定
                </h4>
                <div className="divide-y overflow-hidden rounded-md border text-xs">
                  {[
                    {
                      label: '指定日時',
                      value: activeExclusion ? formatDateTime(activeExclusion.lastChangedAt) : null,
                    },
                    { label: '担当者', value: activeExclusion?.lastChangedBy?.staffName },
                    { label: '指定理由', value: activeExclusion?.reason },
                  ].map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[96px_1fr]">
                      <span className="bg-muted/40 text-muted-foreground px-3 py-2">{label}</span>
                      <span
                        className={`px-3 py-2 leading-relaxed wrap-anywhere ${value ? '' : 'text-muted-foreground'}`}
                      >
                        {value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="-mx-6 w-[calc(100%+48px)]" />

              <div className="space-y-3 py-4">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  未納明細
                </h4>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="px-3 py-2 text-xs font-semibold">明細ID</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-semibold">月</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-semibold">契約種別</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-semibold">契約名</TableHead>
                        <TableHead className="px-3 py-2 text-right text-xs font-semibold">
                          金額
                        </TableHead>
                        <TableHead className="px-3 py-2 text-xs font-semibold">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidBillings.flatMap((billing) => {
                        // B4: exclusion and konbini act on the whole billing, so a line's action
                        // targets the billing that contains it
                        const billingTarget: ReceivableBillingTarget = {
                          billingId: billing.billingId,
                          targetMonth: billing.targetMonth,
                          amount: billing.outstandingAmount,
                        };
                        const isBillingExcluded = billing.subStatus === 'excluded';
                        return billing.items.map((item) => (
                          <TableRow key={item.billingItemId}>
                            <TableCell className="px-3 py-2" title={item.billingItemId}>
                              <span className="text-muted-foreground font-mono text-[10px]">
                                {item.billingItemId.slice(-8)}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              {/* Prototype has no 状態 column: the billing's sub-status rides under the month */}
                              <div className="flex flex-col items-start gap-1">
                                <Badge
                                  variant="outline"
                                  className="border-warning/40 text-warning bg-warning/15 px-1 py-0 text-[10px]"
                                >
                                  {item.targetMonth ?? billing.targetMonth}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`px-1 py-0 text-[10px] ${RECEIVABLE_SUB_STATUS_BADGE_CLASS[billing.subStatus]}`}
                                >
                                  {RECEIVABLE_SUB_STATUS_LABELS[billing.subStatus]}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <span className="text-xs">
                                {getItemContractTypeLabel(item.itemType)}
                              </span>
                            </TableCell>
                            <TableCell className="min-w-32 px-3 py-2 whitespace-normal">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-xs wrap-anywhere">{item.description}</span>
                                {item.jaccsSubrogationEligible === true && (
                                  <Badge
                                    variant="outline"
                                    className="bg-info/15 text-info border-info/20 px-1 py-0 text-[10px]"
                                  >
                                    代位弁済対象
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right">
                              <span className="text-xs font-medium tabular-nums">
                                {formatYen(item.amountWithTax)}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="hover:bg-accent hover:text-accent-foreground inline-flex size-6 items-center justify-center rounded-md">
                                  <MoreHorizontal className="size-3" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <RoleGatedMenuItem
                                    requiredPermission={Permission.SalesConvenienceIssue}
                                    disabled={billing.subStatus === 'konbini_pending'}
                                    onClick={() =>
                                      onIssueConvenience(
                                        data.memberNumber ?? memberId,
                                        memberName,
                                        [billingTarget],
                                      )
                                    }
                                  >
                                    コンビニ決済URL発行
                                  </RoleGatedMenuItem>
                                  <RoleGatedMenuItem
                                    allowedRoles={BAD_DEBT_EXCLUSION_ROLES}
                                    requiredPermission={Permission.SalesBadDebtExclude}
                                    onClick={() =>
                                      onBadDebtAction(
                                        memberName,
                                        isBillingExcluded ? 'release' : 'exclude',
                                        [billingTarget],
                                        'line',
                                      )
                                    }
                                  >
                                    {isBillingExcluded ? '貸倒対象外指定の解除' : '貸倒対象外指定'}
                                  </RoleGatedMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ));
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Konbini notifications can be `skipped` — the payment number must stay readable
                  after the issue dialog closes (re-issue is blocked by E-RCV-004 until expiry) */}
              {konbiniHistory.length > 0 && (
                <>
                  <Separator className="-mx-6 w-[calc(100%+48px)]" />
                  <div className="space-y-3 py-4">
                    <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      コンビニ決済の発行履歴
                    </h4>
                    <div className="overflow-hidden rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="px-3 py-2 text-xs font-semibold">
                              払込番号
                            </TableHead>
                            <TableHead className="px-3 py-2 text-right text-xs font-semibold">
                              金額
                            </TableHead>
                            <TableHead className="px-3 py-2 text-xs font-semibold">
                              支払期限
                            </TableHead>
                            <TableHead className="px-3 py-2 text-xs font-semibold">状態</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {konbiniHistory.map((slip) => (
                            <TableRow key={slip.konbiniPaymentId}>
                              <TableCell className="px-3 py-2 font-mono text-xs select-all">
                                {slip.paymentCode}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-right text-xs tabular-nums">
                                {formatYen(slip.totalAmount)}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-xs tabular-nums">
                                {formatDateTime(slip.expiresAt)}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-xs">
                                {KONBINI_SLIP_STATUS_LABELS[slip.status]}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t px-6 py-4">
              <RoleGatedButton
                requiredPermission={Permission.SalesConvenienceIssue}
                denyTooltip="コンビニ決済URL発行の権限がありません"
                size="sm"
                className="h-9 w-full"
                disabled={konbiniTargets.length === 0}
                onClick={() =>
                  onIssueConvenience(data.memberNumber ?? memberId, memberName, konbiniTargets)
                }
              >
                コンビニ決済URLを一括発行
              </RoleGatedButton>
              {releaseTargets.length > 0 && (
                <RoleGatedButton
                  allowedRoles={BAD_DEBT_EXCLUSION_ROLES}
                  requiredPermission={Permission.SalesBadDebtExclude}
                  denyTooltip="貸倒対象外指定解除の権限がありません"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full"
                  onClick={() => onBadDebtAction(memberName, 'release', releaseTargets, 'member')}
                >
                  貸倒対象外指定を一括解除
                </RoleGatedButton>
              )}
              {excludeTargets.length > 0 && (
                <RoleGatedButton
                  allowedRoles={BAD_DEBT_EXCLUSION_ROLES}
                  requiredPermission={Permission.SalesBadDebtExclude}
                  denyTooltip="貸倒対象外指定の権限がありません"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full"
                  onClick={() => onBadDebtAction(memberName, 'exclude', excludeTargets, 'member')}
                >
                  貸倒対象外に一括指定
                </RoleGatedButton>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
