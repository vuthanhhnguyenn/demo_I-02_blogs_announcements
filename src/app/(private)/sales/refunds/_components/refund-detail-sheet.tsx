'use client';

import { type ReactNode, useState } from 'react';

import Link from 'next/link';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, ShieldAlert, XCircle } from 'lucide-react';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

import {
  adminRefundControllerDetailOptions,
  adminRefundControllerRefundabilityOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  RefundApplicationDetailDto,
  RefundApplicationListItemDto,
  RefundabilityLineDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  REFUND_BLOCK_REASON_LABELS,
  REFUND_DISPLAY_STATUS_BADGE_CLASS,
  REFUND_DISPLAY_STATUS_LABELS,
  formatYen,
  getRefundAlertMessage,
} from '../../_constants/sales-labels.constant';
import {
  APPLICANT_ROLE_BADGE_LABELS,
  APPROVER_LEVEL_LABELS,
  getBlockReason,
} from '../_utils/refund-api.util';
import { RefundMarkExecutedDialog } from './refund-mark-executed-dialog';
import { getMemberName, getPaymentMethodsLabel } from './refund-queue-table';

/** API-118 §5 `executionStatus` (refunds.status) */
const EXECUTION_STATUS_LABELS: Record<string, string> = {
  pending: '実行待ち',
  executing: '実行中',
  succeeded: '実行済み',
  failed: '失敗',
};

/** API-118 §13.2 resolved refund method */
const REFUND_METHOD_LABELS: Record<string, string> = {
  sbps_void: 'SBPS取消',
  sbps_partial_refund: 'SBPS一部返金',
  jaccs_manual: '手動返金（JACCS）',
  cashpost: 'CASHPOST',
  cash: '店頭返金',
  bank_transfer: '銀行振込',
};

function Row({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid grid-cols-[120px_1fr]">
      <span className="bg-muted/40 text-muted-foreground px-3 py-2">{label}</span>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="space-y-3 px-6 py-4">
      <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {title}
      </h4>
      <div className="divide-y overflow-hidden rounded-md border text-xs">{children}</div>
    </div>
  );
}

function findRefundabilityLine(
  lines: readonly RefundabilityLineDto[],
  billingItemId: string | null,
  index: number,
): RefundabilityLineDto | undefined {
  return (
    (billingItemId ? lines.find((line) => line.billingItemId === billingItemId) : undefined) ??
    lines[index]
  );
}

function LinesTable({
  detail,
  refundabilityLines,
  showRefundability,
}: Readonly<{
  detail: RefundApplicationDetailDto;
  refundabilityLines: readonly RefundabilityLineDto[];
  showRefundability: boolean;
}>) {
  return (
    <div className="space-y-3 px-6 py-4">
      <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        返金明細
      </h4>
      <div className="overflow-hidden rounded-md border text-xs">
        <table className="w-full">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-normal">対象商品</th>
              <th className="px-3 py-2 text-right font-normal">売上額</th>
              <th className="px-3 py-2 text-right font-normal">返金額</th>
              {showRefundability && <th className="w-8 px-2 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {detail.lines.map((line, index) => {
              const check = findRefundabilityLine(refundabilityLines, line.billingItemId, index);
              return (
                <tr key={line.id}>
                  <td className="px-3 py-2">{line.description || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatYen(line.amountWithTax)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatYen(line.refundAmount)}
                    {showRefundability && check && !check.canRefund && (
                      <div className="text-destructive text-[10px] font-normal">
                        返金可能残高 {formatYen(check.refundableAmount)}
                      </div>
                    )}
                  </td>
                  {showRefundability && (
                    <td className="px-2 py-2">
                      {check?.canRefund === false ? (
                        <XCircle className="text-destructive size-4" aria-label="返金不可" />
                      ) : check?.canRefund ? (
                        <CheckCircle2 className="text-success size-4" aria-label="返金可" />
                      ) : null}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RefundDetailSheetProps {
  entry: RefundApplicationListItemDto | null;
  open: boolean;
  onClose: () => void;
  onDecide: (decision: 'approve' | 'reject') => void;
}

/**
 * FR-014 / FR-016 / FR-017 (API-118 §6 / §11 / §12): refund application detail.
 * - approve / reject follow the detail's `editableActions` (D13)
 * - approve is disabled while `refundability.blockReason != null`; lines are marked by
 *   `lines[].canRefund` (D10)
 * - S4: 実行記録 (mark-executed) follows `editableActions` (API-118 v0.14.4 `markExecuted`: approved,
 *   refund pending, non-SBPS, Manager+ with `can_execute_refund`, store in scope)
 */
export function RefundDetailSheet({
  entry,
  open,
  onClose,
  onDecide,
}: Readonly<RefundDetailSheetProps>) {
  const { user } = useAuthUser();
  const [markExecutedOpen, setMarkExecutedOpen] = useState(false);

  const applicationId = entry?.id ?? '';
  const isPending = entry?.displayStatus === 'pending_approval';

  const detailQuery = useQuery({
    ...adminRefundControllerDetailOptions({ path: { applicationId } }),
    enabled: open && !!entry,
  });
  // API-118 §11: re-evaluated right before approving
  const refundabilityQuery = useQuery({
    ...adminRefundControllerRefundabilityOptions({ path: { applicationId } }),
    enabled: open && !!entry && isPending,
  });

  if (!entry) return null;

  const detail = detailQuery.data;
  const refundability = refundabilityQuery.data ?? detail?.refundability;
  const blockReason = getBlockReason(refundability);
  const editableActions = detail?.editableActions ?? [];
  const canApprove = editableActions.includes('approve');
  const canReject = editableActions.includes('reject');
  const displayStatus = detail?.displayStatus ?? entry.displayStatus;

  let decisionDenyMessage: string | undefined;
  if (detail && !canApprove && !canReject) {
    decisionDenyMessage =
      user && entry.appliedBy === user.id
        ? '自分の申請は承認・却下できません'
        : `この申請の承認には${APPROVER_LEVEL_LABELS[entry.approverLevel]}が必要です`;
  }
  const approveBlockMessage = blockReason ? REFUND_BLOCK_REASON_LABELS[blockReason] : undefined;

  const refund = detail?.refund ?? null;
  const canMarkExecuted = editableActions.includes('markExecuted');

  const billingIds = detail ? [...new Set(detail.lines.map((line) => line.billingId))] : [];
  // API-118 v0.16 BR-REF-012: full / partial is decided per application by the BE
  const isPartialRefund = (detail ?? entry).refundType === 'partial';

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="flex w-[480px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              返金申請
              <span className="text-muted-foreground font-mono text-xs" title={entry.id}>
                #{entry.id.slice(0, 8)}
              </span>
              <Badge
                variant="outline"
                className={`px-1 py-0 text-[10px] ${REFUND_DISPLAY_STATUS_BADGE_CLASS[displayStatus]}`}
              >
                {REFUND_DISPLAY_STATUS_LABELS[displayStatus]}
              </Badge>
            </SheetTitle>
            <SheetDescription className="sr-only">返金申請の詳細情報</SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Section title="返金対象">
            <Row label="会員名">
              <span className="font-medium">{getMemberName(entry)}</span>
              {entry.memberCode && (
                <span className="text-muted-foreground">（ID: {entry.memberCode}）</span>
              )}
            </Row>
            <Row label="店舗">{entry.storeName || '—'}</Row>
            <Row label="売上ID">
              {billingIds.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {billingIds.map((billingId) => (
                    <Link
                      key={billingId}
                      href={navigate('/sales/[id]', billingId)}
                      className="text-info flex items-center gap-1 font-mono hover:underline"
                    >
                      #{billingId.slice(0, 8)}
                      <ChevronRight className="size-3" />
                    </Link>
                  ))}
                </div>
              )}
            </Row>
            <Row label="決済方法">{getPaymentMethodsLabel(entry.paymentMethods)}</Row>
            <Row label="返金額">
              <div className="flex items-center gap-2">
                <span className="font-medium tabular-nums">
                  {formatYen(detail?.totalRefundAmount ?? entry.totalRefundAmount)}
                </span>
                {isPartialRefund && (
                  <Badge
                    variant="outline"
                    className="bg-info/15 text-info border-info/20 px-1 py-0 text-[10px]"
                  >
                    部分返金
                  </Badge>
                )}
              </div>
            </Row>
          </Section>

          {detailQuery.isLoading ? (
            <div className="space-y-2 px-6 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            detail && (
              <LinesTable
                detail={detail}
                refundabilityLines={refundability?.lines ?? []}
                showRefundability={isPending}
              />
            )
          )}

          <Section title="申請情報">
            <Row label="申請者">{entry.appliedByName || '—'}</Row>
            <Row label="申請者ロール">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-muted/60 text-muted-foreground border-border px-1 py-0 text-[10px]"
                >
                  {APPLICANT_ROLE_BADGE_LABELS[entry.appliedRole]}
                </Badge>
                <span className="text-muted-foreground text-[10px]">
                  承認には{APPROVER_LEVEL_LABELS[entry.approverLevel]}が必要
                </span>
              </div>
            </Row>
            <Row label="申請日時">{formatDateYYYYMMDD_HHMM(entry.appliedAt, '-')}</Row>
            <Row label="返金理由">
              <span className="leading-relaxed whitespace-pre-wrap">
                {entry.applicationReason ?? '—'}
              </span>
            </Row>
          </Section>

          {entry.approvedAt && (
            <Section title="承認情報">
              <Row label="承認者">{entry.approvedByName ?? '—'}</Row>
              <Row label="承認日時">{formatDateYYYYMMDD_HHMM(entry.approvedAt, '-')}</Row>
            </Section>
          )}

          {entry.rejectedAt && (
            <Section title="却下情報">
              <Row label="却下者">{entry.rejectedByName ?? '—'}</Row>
              <Row label="却下日時">{formatDateYYYYMMDD_HHMM(entry.rejectedAt, '-')}</Row>
              <Row label="却下理由">
                <span className="leading-relaxed whitespace-pre-wrap">
                  {detail?.rejectionReason ?? '—'}
                </span>
              </Row>
            </Section>
          )}

          {refund && (
            <Section title="返金実行">
              <Row label="返金方法">
                {REFUND_METHOD_LABELS[refund.refundMethod] ?? refund.refundMethod}
              </Row>
              <Row label="実行状況">{EXECUTION_STATUS_LABELS[refund.status] ?? refund.status}</Row>
              <Row label="実行日時">
                {formatDateYYYYMMDD_HHMM(detail?.executedAt ?? refund.refundedAt, '-')}
              </Row>
              {(detail?.executionFailureReason ?? refund.failureReason) && (
                <Row label="失敗理由">
                  <span className="text-destructive">
                    {detail?.executionFailureReason ?? refund.failureReason}
                  </span>
                </Row>
              )}
            </Section>
          )}
        </div>

        {isPending && (
          <div className="shrink-0 space-y-3 border-t px-6 py-4">
            {decisionDenyMessage && (
              <Alert className="bg-warning/10 border-warning/20">
                <ShieldAlert className="text-warning size-4" />
                <AlertDescription className="text-warning text-xs">
                  {decisionDenyMessage}
                </AlertDescription>
              </Alert>
            )}
            {canApprove && approveBlockMessage && (
              <Alert className="bg-destructive/10 border-destructive/20">
                <ShieldAlert className="text-destructive size-4" />
                <AlertDescription className="text-destructive text-xs">
                  {approveBlockMessage}
                </AlertDescription>
              </Alert>
            )}
            {canApprove && !approveBlockMessage && refundability && (
              <p className="text-muted-foreground text-xs">
                {getRefundAlertMessage(refundability.alertVariant)}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <RoleGatedButton
                requiredPermission={Permission.SalesRefundApprove}
                denyTooltip="返金承認の権限がありません"
                tooltip={decisionDenyMessage}
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                disabled={!canReject}
                onClick={() => onDecide('reject')}
              >
                却下する
              </RoleGatedButton>
              <RoleGatedButton
                requiredPermission={Permission.SalesRefundApprove}
                denyTooltip="返金承認の権限がありません"
                tooltip={decisionDenyMessage ?? approveBlockMessage}
                size="sm"
                disabled={!canApprove || !!blockReason || refundabilityQuery.isLoading}
                onClick={() => onDecide('approve')}
              >
                承認する
              </RoleGatedButton>
            </div>
          </div>
        )}

        {canMarkExecuted && refund && (
          <div className="shrink-0 space-y-3 border-t px-6 py-4">
            <p className="text-muted-foreground text-xs">
              CRM外で返金を実行した後、実行結果を登録してください。
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setMarkExecutedOpen(true)}>
                実行記録
              </Button>
            </div>
            <RefundMarkExecutedDialog
              open={markExecutedOpen}
              onOpenChange={setMarkExecutedOpen}
              applicationId={entry.id}
              refundId={refund.refundId}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
