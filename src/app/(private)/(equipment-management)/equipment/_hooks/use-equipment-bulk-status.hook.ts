'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { adminConnectedDeviceControllerBulkStatusMutation } from '@/lib/api-real/@tanstack/react-query.gen';

import type { EquipmentStatus } from '../_constants/constants';
import { EQUIPMENT_STATUS_LABELS } from '../_constants/constants';
import { invalidateEquipmentStatusCaches } from '../_utils/equipment-cache.util';

/** The backend caps a batch at 100 devices and refuses to apply one partially. */
export const EQUIPMENT_BULK_STATUS_LIMIT = 100;

/** API-103 bulk-status caps `changedNote` at 500 (the single-device PATCH allows 1000). */
export const EQUIPMENT_BULK_NOTE_MAX_LENGTH = 500;

type BulkStatusPayload = {
  deviceIds: string[];
  status: EquipmentStatus;
  changedNote?: string;
};

export function useEquipmentBulkStatus() {
  const queryClient = useQueryClient();

  const bulkStatusMutation = useMutation({
    ...adminConnectedDeviceControllerBulkStatusMutation(),
    // BUG-E02-A-09 — under the default `online` mode an offline submit is paused rather than sent:
    // the dialog sat on 保存中... with no error and the change was applied silently on reconnect.
    // Firing the request regardless lets it fail fast into the shared error toast.
    networkMode: 'always',
    onSuccess: (data, variables) => {
      invalidateEquipmentStatusCaches(queryClient, variables.body.deviceIds);

      // All-or-nothing: `items` holds every device of the batch, each now in `newStatus`.
      const statusLabel = EQUIPMENT_STATUS_LABELS[variables.body.newStatus];
      toast.success(`${data.items.length}件の状態を「${statusLabel}」に変更しました`);
    },
    // Failures (incl. E-DEV-005 no-op / oversized batch) reach the shared MutationCache toast (D12).
  });

  const bulkUpdateStatus = (payload: BulkStatusPayload, callbacks?: { onSuccess?: () => void }) => {
    // The batch is never split: API-103 refuses partial success by design, so an oversized
    // selection is rejected up front rather than applied in chunks.
    if (payload.deviceIds.length > EQUIPMENT_BULK_STATUS_LIMIT) {
      toast.error(
        `一度に変更できるのは${EQUIPMENT_BULK_STATUS_LIMIT}件までです。選択を減らしてから再実行してください`,
      );
      return;
    }

    bulkStatusMutation.mutate(
      {
        body: {
          deviceIds: payload.deviceIds,
          newStatus: payload.status,
          changedNote: payload.changedNote,
        },
      },
      { onSuccess: callbacks?.onSuccess },
    );
  };

  return {
    bulkUpdateStatus,
    isBulkUpdating: bulkStatusMutation.isPending,
  };
}
