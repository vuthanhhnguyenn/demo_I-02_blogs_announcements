'use client';

// Client component: S4 実行記録 — records the outcome of a non-SBPS refund executed outside the
// CRM (API-118 §12). Error toasts come from the shared MutationCache.
import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { useSingleFlight } from '@/hooks/use-single-flight';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

import { adminRefundControllerMarkExecutedMutation } from '@/lib/api-real/@tanstack/react-query.gen';

import {
  EXECUTOR_MEMO_MAX_LENGTH,
  EXTERNAL_REFERENCE_ID_MAX_LENGTH,
  FAILURE_REASON_MAX_LENGTH,
  type MarkExecutedFormValues,
  STALE_ROW_ERROR_CODES,
  getRefundErrorCode,
  invalidateRefundQueries,
  toMarkExecutedBody,
} from '../_utils/refund-api.util';

type ExecutionResult = MarkExecutedFormValues['executionResult'];

const EXECUTION_RESULT_LABELS: Record<ExecutionResult, string> = {
  succeeded: '返金完了',
  failed: '返金失敗',
};

const EXECUTION_RESULTS = Object.keys(EXECUTION_RESULT_LABELS) as ExecutionResult[];

function isExecutionResult(value: unknown): value is ExecutionResult {
  return typeof value === 'string' && (EXECUTION_RESULTS as string[]).includes(value);
}

/** `<input type="datetime-local">` value for now (local time, minute precision) */
function nowLocalInput(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

interface RefundMarkExecutedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  refundId: string;
}

export function RefundMarkExecutedDialog({
  open,
  onOpenChange,
  applicationId,
  refundId,
}: Readonly<RefundMarkExecutedDialogProps>) {
  const queryClient = useQueryClient();
  const [executionResult, setExecutionResult] = useState<ExecutionResult>('succeeded');
  const [executedAtLocal, setExecutedAtLocal] = useState(nowLocalInput);
  const [externalReferenceId, setExternalReferenceId] = useState('');
  const [executorMemo, setExecutorMemo] = useState('');
  const [failureReason, setFailureReason] = useState('');

  // Fresh form every time the dialog opens (state adjusted during render)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setExecutionResult('succeeded');
      setExecutedAtLocal(nowLocalInput());
      setExternalReferenceId('');
      setExecutorMemo('');
      setFailureReason('');
    }
  }

  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminRefundControllerMarkExecutedMutation(),
    onSettled: release,
    onSuccess: (result) => {
      invalidateRefundQueries(queryClient, applicationId);
      toast.success(
        result.refund.status === 'succeeded' ? '返金完了を記録しました' : '返金失敗を記録しました',
      );
      onOpenChange(false);
    },
    onError: (error) => {
      const code = getRefundErrorCode(error);
      if (code && STALE_ROW_ERROR_CODES.has(code))
        invalidateRefundQueries(queryClient, applicationId);
    },
  });

  const executedAt = executedAtLocal ? new Date(executedAtLocal) : null;
  const executedAtValid =
    executedAt != null && !Number.isNaN(executedAt.getTime()) && executedAt <= new Date();
  const failureReasonValid = executionResult !== 'failed' || failureReason.trim().length > 0;
  const canSubmit = executedAtValid && failureReasonValid && !mutation.isPending;

  function handleSubmit() {
    if (!canSubmit || !executedAt || !acquire()) return;
    mutation.mutate({
      path: { refundId },
      body: toMarkExecutedBody({
        executionResult,
        executedAt: executedAt.toISOString(),
        externalReferenceId,
        executorMemo,
        failureReason,
      }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !mutation.isPending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>実行記録の登録</DialogTitle>
          <DialogDescription>
            CRM外（JACCS / CASHPOST / 店頭 /
            振込）で実行した返金の結果を登録します。登録後は変更できません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              実行結果 <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={executionResult}
              onValueChange={(value) => isExecutionResult(value) && setExecutionResult(value)}
              className="flex gap-6"
            >
              {EXECUTION_RESULTS.map((result) => (
                <label key={result} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={result} />
                  {EXECUTION_RESULT_LABELS[result]}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-executed-at" className="text-xs font-medium">
              実行日時 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="refund-executed-at"
              type="datetime-local"
              value={executedAtLocal}
              max={nowLocalInput()}
              aria-invalid={!executedAtValid}
              onChange={(event) => setExecutedAtLocal(event.target.value)}
            />
            {!executedAtValid && (
              <p className="text-destructive text-xs">現在以前の日時を入力してください</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-external-reference" className="text-xs font-medium">
              外部参照ID
            </Label>
            <Input
              id="refund-external-reference"
              value={externalReferenceId}
              maxLength={EXTERNAL_REFERENCE_ID_MAX_LENGTH}
              placeholder="JACCS取引番号 / CASHPOST受付番号 など"
              onChange={(event) => setExternalReferenceId(event.target.value)}
            />
          </div>

          {executionResult === 'failed' && (
            <div className="space-y-2">
              <Label htmlFor="refund-failure-reason" className="text-xs font-medium">
                失敗理由 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="refund-failure-reason"
                value={failureReason}
                maxLength={FAILURE_REASON_MAX_LENGTH}
                rows={2}
                aria-invalid={!failureReasonValid}
                onChange={(event) => setFailureReason(event.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="refund-executor-memo" className="text-xs font-medium">
              メモ
            </Label>
            <Textarea
              id="refund-executor-memo"
              value={executorMemo}
              maxLength={EXECUTOR_MEMO_MAX_LENGTH}
              rows={3}
              onChange={(event) => setExecutorMemo(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            登録する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
