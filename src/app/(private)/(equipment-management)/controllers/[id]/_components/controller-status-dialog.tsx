'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { TEXTAREA_MAX_LENGTH } from '@/constants/app.constants';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { OptionalMark } from '@/components/common/field-marker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { adminRelayControllerControllerUpdateMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { useSubmitGuard } from '../../../_hooks/use-submit-guard.hook';
import { isDeviceConflictError, isDeviceNotFoundError } from '../../../_utils/device-api.util';
import {
  CONTROLLER_STATUS_BADGE_MAP,
  CONTROLLER_STATUS_LABELS,
  CONTROLLER_STATUS_VALUES,
  type ControllerStatus,
} from '../../_constants/constants';
import {
  invalidateControllerCaches,
  invalidateControllerRosterCaches,
} from '../../_utils/controller-cache.util';

type ControllerDetail = RelayControllerDetailDto;

interface ControllerStatusDialogProps {
  controller: ControllerDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ControllerStatusDialog({
  controller,
  open,
  onOpenChange,
}: ControllerStatusDialogProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [newStatus, setNewStatus] = useState<ControllerStatus | ''>('');
  const [changedNote, setChangedNote] = useState('');

  // API-104 refuses 廃棄 while live devices remain (409 E-DEV-011, the same rule as delete), so the
  // option is offered disabled with its reason rather than failing on save.
  const hasConnectedDevices = controller.connectedDeviceCount > 0;

  // The current status is left out: it would be a no-op transition.
  const statusOptions = useMemo(
    () => CONTROLLER_STATUS_VALUES.filter((status) => status !== controller.status),
    [controller.status],
  );

  const currentStatusBadge = CONTROLLER_STATUS_BADGE_MAP[controller.status];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNewStatus('');
      setChangedNote('');
    }
    onOpenChange(nextOpen);
  };

  const statusMutation = useMutation({
    ...adminRelayControllerControllerUpdateMutation(),
    // The failure toast (server userMessage) comes from the global MutationCache.
    onSuccess: () => {
      invalidateControllerCaches(queryClient, controller.id);
      toast.success('ステータスを変更しました');
      handleOpenChange(false);
    },
    onError: (error) => {
      if (isDeviceNotFoundError(error)) {
        // Deleted elsewhere: leave the stale detail for the list.
        handleOpenChange(false);
        invalidateControllerRosterCaches(queryClient);
        router.push(navigate('/controllers'));
        return;
      }
      if (isDeviceConflictError(error)) {
        // D13 — refetch so the screen and the next attempt carry the current `updatedAt`.
        invalidateControllerCaches(queryClient, controller.id);
      }
    },
  });

  // BUG-E02-E-03 — a double click on 変更を保存 must send one PATCH (the second one was refused
  // as stale and toasted an error next to the success).
  const { submitOnce, resetSubmitGuard } = useSubmitGuard(
    statusMutation.isPending,
    statusMutation.isError,
  );
  useEffect(() => {
    if (open) resetSubmitGuard();
  }, [open, resetSubmitGuard]);

  const handleSubmit = () => {
    if (!newStatus) return;

    submitOnce(() =>
      statusMutation.mutate({
        path: { relayControllerId: controller.id },
        body: {
          status: newStatus,
          // The free-text 変更理由 is the history row's note; `changedReason` is not collected,
          // as on the connected-device dialog.
          changedNote: changedNote.trim() || undefined,
          expectedUpdatedAt: controller.updatedAt,
        },
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ステータス変更</DialogTitle>
          <DialogDescription>接点制御装置のステータスを変更します。</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground mb-1 text-xs">装置ID</p>
                <p className="font-mono text-sm font-medium break-all" title={controller.relayId}>
                  {controller.relayId}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs">現在のステータス</p>
                <Badge variant="outline" className={currentStatusBadge.badgeClassName}>
                  <span className={`size-1.5 rounded-full ${currentStatusBadge.dotClassName}`} />
                  {CONTROLLER_STATUS_LABELS[controller.status]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>新しいステータス</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as ControllerStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="ステータスを選択">
                  {newStatus ? CONTROLLER_STATUS_LABELS[newStatus] : 'ステータスを選択'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => {
                  const statusBadge = CONTROLLER_STATUS_BADGE_MAP[status];
                  const isBlocked = status === 'discarded' && hasConnectedDevices;

                  return (
                    <SelectItem key={status} value={status} disabled={isBlocked}>
                      <span className="inline-flex items-center gap-2">
                        <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
                        {CONTROLLER_STATUS_LABELS[status]}
                        {isBlocked ? (
                          <span className="text-muted-foreground text-xs">（紐付き機器あり）</span>
                        ) : null}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              変更理由
              <OptionalMark />
            </Label>
            <Textarea
              placeholder="変更理由や作業内容を入力"
              rows={3}
              className="max-h-60 overflow-y-auto wrap-anywhere"
              maxLength={TEXTAREA_MAX_LENGTH}
              value={changedNote}
              onChange={(event) => setChangedNote(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={statusMutation.isPending}
          >
            キャンセル
          </Button>
          <Button disabled={!newStatus || statusMutation.isPending} onClick={handleSubmit}>
            {statusMutation.isPending ? '保存中...' : '変更を保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
