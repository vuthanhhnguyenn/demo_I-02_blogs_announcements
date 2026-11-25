'use client';

// Client component: owns the approve / reject / bulk-approve mutations so callers only open the
// dialog with an action and react to success. Error toasts come from the shared MutationCache.
import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

import {
  adminRefundControllerApproveMutation,
  adminRefundControllerBulkApproveMutation,
  adminRefundControllerRejectMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  RefundApplicationListItemDto,
  RefundBulkApproveResponseDto,
} from '@/lib/api-real/types.gen';

import { formatYen, getRefundAlertMessage } from '../../_constants/sales-labels.constant';
import {
  BULK_APPROVE_FAILURE_LABELS,
  EXECUTION_METHODS,
  EXECUTION_METHOD_LABELS,
  type ExecutionMethod,
  REJECTION_REASON_MAX_LENGTH,
  STALE_ROW_ERROR_CODES,
  getRefundErrorCode,
  invalidateRefundQueries,
  isExecutionMethod,
  needsExecutionMethod,
} from '../_utils/refund-api.util';
import { getMemberName } from './refund-queue-table';

export type RefundConfirmAction =
  | { kind: 'single'; decision: 'approve' | 'reject'; entry: RefundApplicationListItemDto }
  // Bulk is approve only — no bulk reject (FR-004-a, API-118 v0.16.1 §2)
  | {
      kind: 'bulk';
      decision: 'approve';
      entries: RefundApplicationListItemDto[];
      excludedCount: number;
    };

interface RefundDecisionDialogProps {
  action: RefundConfirmAction | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MAX_LISTED_FAILURES = 5;

function describeBulkFailures(
  result: RefundBulkApproveResponseDto,
  entries: readonly RefundApplicationListItemDto[],
): string {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const lines = result.failed.slice(0, MAX_LISTED_FAILURES).map((failure) => {
    const entry = byId.get(failure.applicationId);
    const who = entry ? getMemberName(entry) : failure.applicationId.slice(0, 8);
    return `${who}: ${BULK_APPROVE_FAILURE_LABELS[failure.code] ?? failure.message}`;
  });
  const rest = result.failed.length - lines.length;
  return rest > 0 ? `${lines.join('\n')}\nほか${rest}件` : lines.join('\n');
}

/**
 * FR-019: explicit confirmation before any approve / reject decision.
 * - approve: payment-method guidance from `alertVariant`; JACCS requires 手動返金 / CASHPOST (D11)
 * - reject: required reason, 1–500 chars (D12)
 * - bulk approve: `executionMethod` only when every selected row is JACCS; per-row failures are
 *   reported from the response (API-118 §10)
 */
export function RefundDecisionDialog({
  action,
  onOpenChange,
  onSuccess,
}: Readonly<RefundDecisionDialogProps>) {
  const queryClient = useQueryClient();
  const [executionMethod, setExecutionMethod] = useState<ExecutionMethod | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Reset the inputs every time a new action opens the dialog (state adjusted during render)
  const [prevAction, setPrevAction] = useState(action);
  if (action !== prevAction) {
    setPrevAction(action);
    setExecutionMethod(null);
    setRejectionReason('');
  }

  const onStaleError = (error: unknown, applicationId: string) => {
    const code = getRefundErrorCode(error);
    if (code && STALE_ROW_ERROR_CODES.has(code))
      invalidateRefundQueries(queryClient, applicationId);
  };

  const { acquire, release } = useSingleFlight();

  const approveMutation = useMutation({
    ...adminRefundControllerApproveMutation(),
    onSettled: release,
    onSuccess: (result) => {
      invalidateRefundQueries(queryClient, result.id);
      // SBPS refunds are sent on approve (!868): the approval stands even when SBPS rejects the refund
      if (result.executionStatus === 'failed') {
        toast.error('返金申請を承認しましたが、返金に失敗しました', {
          description: result.executionFailureReason ?? undefined,
        });
        onSuccess();
        return;
      }
      // SBPS refunds are also `processing` after approval but never take 実行記録 (API-118 §12)
      toast.success(
        result.editableActions.includes('markExecuted')
          ? '返金申請を承認しました（返金実行後に実行記録を登録してください）'
          : '返金申請を承認しました',
      );
      onSuccess();
    },
    onError: (error, variables) => onStaleError(error, variables.path.applicationId),
  });

  const rejectMutation = useMutation({
    ...adminRefundControllerRejectMutation(),
    onSettled: release,
    onSuccess: (result) => {
      invalidateRefundQueries(queryClient, result.id);
      toast.success('返金申請を却下しました');
      onSuccess();
    },
    onError: (error, variables) => onStaleError(error, variables.path.applicationId),
  });

  const bulkApproveMutation = useMutation({
    ...adminRefundControllerBulkApproveMutation(),
    onSettled: release,
    onSuccess: (result) => {
      invalidateRefundQueries(queryClient);
      const excludedCount = action?.kind === 'bulk' ? action.excludedCount : 0;
      const excludedNote = excludedCount > 0 ? `（${excludedCount}件は権限外のため除外）` : '';
      if (result.succeeded.length > 0) {
        toast.success(`${result.succeeded.length}件の返金申請を承認しました${excludedNote}`);
      }
      const refundFailedCount = result.succeeded.filter(
        (entry) => entry.executionStatus === 'failed',
      ).length;
      if (refundFailedCount > 0) {
        toast.error(`${refundFailedCount}件は承認後の返金に失敗しました`, {
          description: '詳細画面で失敗理由を確認してください',
        });
      }
      if (result.failed.length > 0) {
        toast.warning(`${result.failed.length}件の返金申請を承認できませんでした`, {
          description: describeBulkFailures(result, action?.kind === 'bulk' ? action.entries : []),
        });
      }
      onSuccess();
    },
  });

  const isPending =
    approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending;

  const isApprove = action?.decision === 'approve';
  const bulkEntries = action?.kind === 'bulk' ? action.entries : [];
  const bulkJaccsCount = bulkEntries.filter((entry) =>
    needsExecutionMethod(entry.alertVariant),
  ).length;
  const allBulkJaccs = bulkEntries.length > 0 && bulkJaccsCount === bulkEntries.length;
  const requiresMethod =
    isApprove &&
    (action?.kind === 'single' ? needsExecutionMethod(action.entry.alertVariant) : allBulkJaccs);

  const trimmedReason = rejectionReason.trim();
  const canConfirm =
    !!action &&
    !isPending &&
    (action.decision === 'reject'
      ? trimmedReason.length >= 1 && trimmedReason.length <= REJECTION_REASON_MAX_LENGTH
      : !requiresMethod || executionMethod != null);

  function handleConfirm() {
    if (!action || !canConfirm || !acquire()) return;
    if (action.kind === 'single') {
      const path = { applicationId: action.entry.id };
      if (action.decision === 'reject') {
        rejectMutation.mutate({ path, body: { rejectionReason: trimmedReason } });
        return;
      }
      approveMutation.mutate({
        path,
        body: requiresMethod && executionMethod ? { executionMethod } : {},
      });
      return;
    }
    bulkApproveMutation.mutate({
      body: {
        applicationIds: action.entries.map((entry) => entry.id),
        ...(allBulkJaccs && executionMethod ? { executionMethod } : {}),
      },
    });
  }

  const decisionLabel = isApprove ? '承認' : '却下';

  let description = '';
  if (action?.kind === 'bulk') {
    description = `選択中の返金申請 ${action.entries.length}件を一括承認します${
      action.excludedCount > 0 ? `（${action.excludedCount}件は権限外のため除外されます）` : ''
    }。`;
  } else if (action) {
    description = `返金申請（${getMemberName(action.entry)} / ${formatYen(action.entry.totalRefundAmount)}）を${decisionLabel}します。`;
  }

  return (
    <AlertDialog
      open={!!action}
      // Esc / overlay must not close mid-decision: the bulk success reads `action` for the excluded
      // count / names and the caller's success branch (row-selection reset) keys off it
      onOpenChange={(open) => {
        if (!open && isPending) return;
        onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>返金申請を{decisionLabel}しますか？</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {isApprove && action?.kind === 'single' && (
          <Alert className="bg-info/10 border-info/20">
            <Info className="text-info size-4" />
            <AlertDescription className="text-info text-xs">
              {getRefundAlertMessage(action.entry.alertVariant)}
            </AlertDescription>
          </Alert>
        )}

        {isApprove && action?.kind === 'bulk' && (
          <Alert className="bg-info/10 border-info/20">
            <Info className="text-info size-4" />
            <AlertDescription className="text-info text-xs">
              SBPS決済は承認と同時に返金されます。SBPS以外は承認後「処理中」となり、返金実行後に実行記録を登録します。
            </AlertDescription>
          </Alert>
        )}

        {isApprove && action?.kind === 'bulk' && bulkJaccsCount > 0 && !allBulkJaccs && (
          <Alert className="bg-warning/10 border-warning/20">
            <AlertTriangle className="text-warning size-4" />
            <AlertDescription className="text-warning text-xs">
              JACCS決済の申請（{bulkJaccsCount}
              件）は返金方法の選択が必要なため、一括承認では承認されません。JACCS決済の申請のみを選択するか、個別に承認してください。
            </AlertDescription>
          </Alert>
        )}

        {requiresMethod && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              返金方法 <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={executionMethod ?? ''}
              onValueChange={(value) => setExecutionMethod(isExecutionMethod(value) ? value : null)}
              className="flex gap-6"
            >
              {EXECUTION_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={method} />
                  {EXECUTION_METHOD_LABELS[method]}
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {action?.decision === 'reject' && (
          <div className="space-y-2">
            <Label htmlFor="refund-rejection-reason" className="text-xs font-medium">
              却下理由 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="refund-rejection-reason"
              value={rejectionReason}
              maxLength={REJECTION_REASON_MAX_LENGTH}
              rows={4}
              placeholder="却下理由を入力してください"
              onChange={(event) => setRejectionReason(event.target.value)}
            />
            <p className="text-muted-foreground text-right text-[10px] tabular-nums">
              {rejectionReason.length} / {REJECTION_REASON_MAX_LENGTH}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant={isApprove ? 'default' : 'destructive'}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {decisionLabel}する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
