'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  adminLockerContractsControllerSetFeeOptionMutation,
  adminLockerControllerUpdateSlotMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { UpdateLockerSlotDto } from '@/lib/api-real/types.gen';

import { useLockerBulkRelease } from '../../_hooks/use-locker-bulk-release.hook';
import { toastLockerWriteError } from '../../_utils/locker-error.util';
import { invalidateLockerQueries } from '../../_utils/locker-query-invalidation.util';

/**
 * Slot writes of the cabinet detail's スロット管理 tab. Errors are toasted here, not by the shared
 * MutationCache: a stale write (E-LOC-006 / E-LOC-013) gets 「他のユーザーが更新しました」 and a
 * refetch (D9); every other code shows its BE `userMessage`.
 * TODO(round3) R306: the リマインド通知 send was removed — sending is the I-03 batch (FR-011).
 */
export function useLockerSlotMutations() {
  const queryClient = useQueryClient();
  const { releaseTargets, isReleasing } = useLockerBulkRelease();

  const updateSlotMutation = useMutation({
    ...adminLockerControllerUpdateSlotMutation(),
    meta: { suppressErrorToast: true },
    onError: toastLockerWriteError,
    onSuccess: () => {
      toast.success('スロット設定を更新しました');
    },
    onSettled: () => invalidateLockerQueries(queryClient),
  });

  const feeOptionMutation = useMutation({
    ...adminLockerContractsControllerSetFeeOptionMutation(),
    meta: { suppressErrorToast: true },
    onError: toastLockerWriteError,
    onSettled: () => invalidateLockerQueries(queryClient),
  });

  /** `PATCH /admin/locker-slots/{slotId}` (API-100 §6.2) */
  const updateSlot = (slotId: string, body: UpdateLockerSlotDto) =>
    updateSlotMutation.mutateAsync({ path: { slotId }, body });

  /** `PUT /admin/locker-slots/{slotId}/fee-option` (API-101 §6.5) — `null` clears the override */
  const setFeeOption = (
    slotId: string,
    slotLabel: string,
    feeOptionId: string | null,
    expectedSlotUpdatedAt?: string,
  ) =>
    feeOptionMutation.mutateAsync(
      { path: { slotId }, body: { feeOptionId, expectedSlotUpdatedAt } },
      { onSuccess: () => toast.success(`${slotLabel} の契約種類を保存しました`) },
    );

  return {
    releaseTargets,
    updateSlot,
    setFeeOption,
    isReleasing,
    isUpdatingSlot: updateSlotMutation.isPending || feeOptionMutation.isPending,
  };
}
