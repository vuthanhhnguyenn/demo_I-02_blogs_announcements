'use client';

// Client component: dialog is opened from client state and requires React Query hooks.
import { useEffect, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';

import { getApiErrorCode } from '@/lib/api-error.util';
import {
  adminSalesBillingControllerBulkConfirmJobOptions,
  adminSalesBillingControllerBulkConfirmMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { Api114BulkConfirmJobDto, UpcomingSummaryDto } from '@/lib/api-real/types.gen';

import { BULK_CONFIRM_FAILURE_LABELS, formatYen } from '../../_constants/sales-labels.constant';
import {
  getCachedUpcomingBillings,
  invalidateReceivableQueries,
} from '../_utils/receivable-status.util';
import { getSbpsJaccsBreakdown } from './upcoming-billing-summary-cards';

/** D8: poll API-114 §8B every 2 s until the job settles */
const JOB_POLL_INTERVAL_MS = 2000;

/**
 * The running job survives a reload (checklist: async job): its id is kept for the tab session so
 * the screen resumes polling instead of offering a second run. Storage may be unavailable.
 */
const JOB_STORAGE_KEY = 'sales.upcoming-confirm-job';

export function readStoredUpcomingJobId(): string | null {
  try {
    return sessionStorage.getItem(JOB_STORAGE_KEY);
  } catch {
    return null;
  }
}

// sessionStorage has no same-tab change event, so writes notify the page's store snapshot here
const jobIdListeners = new Set<() => void>();

export function subscribeUpcomingJobId(listener: () => void): () => void {
  jobIdListeners.add(listener);
  return () => jobIdListeners.delete(listener);
}

function storeUpcomingJobId(jobId: string | null): void {
  try {
    if (jobId) sessionStorage.setItem(JOB_STORAGE_KEY, jobId);
    else sessionStorage.removeItem(JOB_STORAGE_KEY);
  } catch {
    // Not persisted — the job still runs server-side
  }
  jobIdListeners.forEach((listener) => listener());
}

function isJobSettled(job: Api114BulkConfirmJobDto | undefined): boolean {
  return job?.status === 'completed' || job?.status === 'failed';
}

interface UpcomingBillingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: UpcomingSummaryDto | undefined;
  /** The header store scope of the list on screen — the confirm must not reach other stores */
  storeIds: string[] | undefined;
}

export function UpcomingBillingConfirmDialog({
  open,
  onOpenChange,
  summary,
  storeIds,
}: Readonly<UpcomingBillingConfirmDialogProps>) {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A running job is only tracked while the dialog is open — keep it open until it settles
        if (!next && isRunning) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-120">
        {open && summary && (
          <UpcomingBillingConfirmBody
            summary={summary}
            storeIds={storeIds}
            onRunningChange={setIsRunning}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface UpcomingBillingConfirmBodyProps {
  summary: UpcomingSummaryDto;
  storeIds: string[] | undefined;
  onRunningChange: (running: boolean) => void;
  onClose: () => void;
}

function UpcomingBillingConfirmBody({
  summary,
  storeIds,
  onRunningChange,
  onClose,
}: Readonly<UpcomingBillingConfirmBodyProps>) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(readStoredUpcomingJobId);
  const notifiedJobRef = useRef<string | null>(null);

  // 全件一括確定 = API-114 §8 mode=filter (no 200 cap) → 202 { jobId }. Error toasts come from the
  // shared MutationCache (D15).
  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminSalesBillingControllerBulkConfirmMutation(),
    onSettled: release,
    // Closing between the click and the 202 would only flicker (the stored jobId reopens it), but
    // keep it shut like the other write dialogs
    onMutate: () => onRunningChange(true),
    // 400 E-VAL-001 (nothing left to confirm, e.g. confirmed from another tab): the toast explains
    // it; close and refresh the tab instead of leaving a stale dialog
    onError: (error) => {
      onRunningChange(false);
      invalidateReceivableQueries(queryClient);
      if (getApiErrorCode(error) === 'E-VAL-001') onClose();
    },
    onSuccess: (data) => {
      if ('jobId' in data) {
        setJobId(data.jobId);
        storeUpcomingJobId(data.jobId);
        onRunningChange(true);
        return;
      }
      // mode=ids answers synchronously — not used here, handled for completeness
      onRunningChange(false);
      invalidateReceivableQueries(queryClient);
      toast.success(`${data.summary.successCount}件を確定しました`);
      onClose();
    },
  });

  const { data: job, isError: isJobError } = useQuery({
    ...adminSalesBillingControllerBulkConfirmJobOptions({ path: { jobId: jobId ?? '' } }),
    enabled: jobId !== null,
    refetchInterval: (query) =>
      isJobSettled(query.state.data) || query.state.status === 'error'
        ? false
        : JOB_POLL_INTERVAL_MS,
  });

  // A job that can't be read (expired, 404/403, another user's id left in the tab) would hold the
  // dialog open forever: drop it and let the refreshed list show what was confirmed
  useEffect(() => {
    if (!isJobError || notifiedJobRef.current === jobId) return;
    notifiedJobRef.current = jobId;
    storeUpcomingJobId(null);
    onRunningChange(false);
    invalidateReceivableQueries(queryClient);
    toast.error('確定処理の状況を取得できませんでした。一覧で確定状況をご確認ください', {
      id: 'upcoming-confirm-job-error',
    });
    onClose();
  }, [isJobError, jobId, onRunningChange, onClose, queryClient]);

  // A job resumed after a reload keeps the dialog open until it settles
  useEffect(() => {
    if (jobId !== null && !isJobSettled(job) && !isJobError) onRunningChange(true);
  }, [jobId, job, isJobError, onRunningChange]);

  useEffect(() => {
    if (!job || !isJobSettled(job) || notifiedJobRef.current === job.jobId) return;
    notifiedJobRef.current = job.jobId;
    storeUpcomingJobId(null);
    onRunningChange(false);
    invalidateReceivableQueries(queryClient);
    const { successCount, failureCount } = job.summary;
    if (job.status === 'failed' || failureCount > 0) {
      toast.warning(`${successCount}件を確定しました（${failureCount}件は確定できませんでした）`);
    } else {
      toast.success(`${successCount}件を確定しました`);
    }
  }, [job, onRunningChange, queryClient]);

  const { sbps, jaccs } = getSbpsJaccsBreakdown(summary);
  // API-117 v0.12 ①: the confirm targets pending + unconfirmed (FR-003 re-confirm)
  const targetCount = summary.pendingCount + summary.unconfirmedCount;
  const targetAmount = summary.pendingAmount + summary.unconfirmedAmount;
  const cachedRows = getCachedUpcomingBillings(queryClient);
  const isRunning = jobId !== null && !isJobSettled(job);
  const isDone = jobId !== null && isJobSettled(job);
  const processed = job ? job.summary.successCount + job.summary.failureCount : 0;
  const progress =
    job && job.summary.totalCount > 0 ? (processed / job.summary.totalCount) * 100 : 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base">請求を確定する</DialogTitle>
        <DialogDescription>以下の内容で請求を確定します。</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="bg-muted/50 space-y-2 rounded-md p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">対象件数</span>
            <span className="font-semibold tabular-nums">{targetCount}件</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">合計金額</span>
            <span className="font-semibold tabular-nums">{formatYen(targetAmount)}</span>
          </div>
          <div className="mt-2 space-y-1 border-t pt-2">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>SBPS（{sbps.count}件）</span>
              <span className="tabular-nums">{formatYen(sbps.amount)}</span>
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>JACCS（{jaccs.count}件）</span>
              <span className="tabular-nums">{formatYen(jaccs.amount)}</span>
            </div>
          </div>
        </div>

        {jobId !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isDone ? '確定処理が完了しました' : '確定処理中…'}
              </span>
              <span className="tabular-nums">
                {processed} / {job?.summary.totalCount ?? '—'}件
              </span>
            </div>
            <Progress value={progress} />
            {job && job.failed.length > 0 && (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
                {job.failed.map((failure) => {
                  const row = cachedRows.get(failure.billingId);
                  return (
                    <div key={failure.billingId} className="text-destructive">
                      {row
                        ? `${row.memberName ?? '—'}（${row.memberNumber ?? '—'}）`
                        : `請求 …${failure.billingId.slice(-8)}`}
                      : {BULK_CONFIRM_FAILURE_LABELS[failure.code] ?? failure.message}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {jobId === null && (
          <p className="text-destructive text-xs">
            ※ 確定後は変更できません。内容を十分にご確認ください。
          </p>
        )}
      </div>
      <DialogFooter>
        {isDone ? (
          <Button onClick={onClose}>閉じる</Button>
        ) : (
          <>
            <Button variant="outline" disabled={isRunning || mutation.isPending} onClick={onClose}>
              キャンセル
            </Button>
            <Button
              disabled={targetCount === 0 || mutation.isPending || isRunning}
              onClick={() => {
                if (!acquire()) return;
                mutation.mutate({
                  body: {
                    mode: 'filter',
                    filter: {
                      targetMonth: summary.targetMonth,
                      storeIds,
                      confirmStatus: ['pending', 'unconfirmed'],
                    },
                  },
                });
              }}
            >
              <Lock className="mr-2 size-4" />
              確定する
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}
