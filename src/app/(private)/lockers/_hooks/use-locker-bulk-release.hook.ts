'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import { AdminLockerSlotOperationsApi101 } from '@/lib/api-real/sdk.gen';

import { getBulkOpenFailure } from '../_utils/locker-error.util';
import { invalidateLockerQueries } from '../_utils/locker-query-invalidation.util';
import {
  type LockerSlotReleaseTarget,
  chunkReleaseTargets,
} from '../_utils/locker-slot-release.util';

type ReleaseCallbacks = {
  onSuccess?: () => void;
  /** A later chunk failed: these slots were opened by the earlier chunks and are no longer pending */
  onPartialSuccess?: (openedSlotIds: string[]) => void;
};

/** A run stopped at a failing chunk; the chunks before it are already committed */
class LockerBulkOpenRunError extends Error {
  constructor(
    readonly apiError: unknown,
    readonly opened: LockerSlotReleaseTarget[],
    readonly failedChunk: LockerSlotReleaseTarget[],
  ) {
    super('open-bulk chunk failed');
  }
}

/** Toast description: what did go through, then 「A-001（E-LOC-012）」 per failed slot (API-101 §6.4) */
function describeStoppedRun(run: LockerBulkOpenRunError): string | undefined {
  const lines: string[] = [];
  if (run.opened.length > 0) lines.push(`${run.opened.length}件は開放済みです`);

  const failure = getBulkOpenFailure(run.apiError);
  if (failure) {
    const labels = new Map(run.failedChunk.map((target) => [target.slotId, target.label]));
    const failed = failure.processed
      .filter((item) => item.status === 'failed')
      .map((item) => {
        const label = labels.get(item.slotId) ?? item.slotId;
        return item.errorCode ? `${label}（${item.errorCode}）` : label;
      });
    if (failed.length > 0) lines.push(`開放できなかったスロット: ${failed.join('、')}`);
  }

  return lines.length > 0 ? lines.join('\n') : undefined;
}

/**
 * 開放 (FR-007): `pending_release → available` via `POST /admin/locker-slots/open-bulk`.
 * Each call is atomic and takes ≤ 50 slots, so a larger selection is sent in chunks. A failing
 * chunk stops the run: its `processed[]` names the slots that failed, and the chunks already
 * committed are reported so the caller can drop them from the selection (a retry would otherwise
 * resend opened slots and fail the whole call with E-LOC-012).
 */
export function useLockerBulkRelease() {
  const queryClient = useQueryClient();

  const releaseMutation = useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: async (targets: LockerSlotReleaseTarget[]) => {
      let opened: LockerSlotReleaseTarget[] = [];
      for (const chunk of chunkReleaseTargets(targets)) {
        try {
          await AdminLockerSlotOperationsApi101.adminLockerSlotOpsControllerOpenBulk({
            body: { slotIds: chunk.map((target) => target.slotId) },
            throwOnError: true,
          });
        } catch (error) {
          throw new LockerBulkOpenRunError(error, opened, chunk);
        }
        opened = [...opened, ...chunk];
      }
      return opened.length;
    },
    onSuccess: (opened) => {
      toast.success(`${opened}件のスロットを開放しました`);
    },
    onError: (error) => {
      if (error instanceof LockerBulkOpenRunError) {
        toast.error(resolveApiErrorMessage(error.apiError), {
          description: describeStoppedRun(error),
        });
        return;
      }
      toast.error(resolveApiErrorMessage(error));
    },
    onSettled: () => invalidateLockerQueries(queryClient),
  });

  const releaseTargets = (targets: LockerSlotReleaseTarget[], callbacks?: ReleaseCallbacks) => {
    releaseMutation.mutate(targets, {
      onSuccess: callbacks?.onSuccess,
      onError: (error) => {
        if (error instanceof LockerBulkOpenRunError && error.opened.length > 0) {
          callbacks?.onPartialSuccess?.(error.opened.map((target) => target.slotId));
        }
      },
    });
  };

  return {
    releaseTargets,
    isReleasing: releaseMutation.isPending,
  };
}
