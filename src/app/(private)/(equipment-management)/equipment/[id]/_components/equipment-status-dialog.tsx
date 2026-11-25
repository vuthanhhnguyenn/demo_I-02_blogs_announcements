'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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

import { adminConnectedDeviceControllerUpdateMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ConnectedDeviceDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { useSubmitGuard } from '../../../_hooks/use-submit-guard.hook';
import { isDeviceConflictError, isDeviceNotFoundError } from '../../../_utils/device-api.util';
import {
  EQUIPMENT_STATUS_BADGE_MAP,
  EQUIPMENT_STATUS_LABELS,
  type EquipmentStatus,
} from '../../_constants/constants';
import { EQUIPMENT_STATUS_VALUES } from '../../_schemas/equipment-form.schema';
import {
  invalidateEquipmentRosterCaches,
  invalidateEquipmentStatusCaches,
  removeDeletedEquipmentQueries,
} from '../../_utils/equipment-cache.util';

type EquipmentDetail = ConnectedDeviceDetailDto;

interface EquipmentStatusDialogProps {
  equipment: EquipmentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentStatusDialog({
  equipment,
  open,
  onOpenChange,
}: EquipmentStatusDialogProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const goneRef = useRef(false);
  const [newStatus, setNewStatus] = useState<EquipmentStatus | ''>('');
  const [changedNote, setChangedNote] = useState('');

  const statusOptions = useMemo(
    () => EQUIPMENT_STATUS_VALUES.filter((status) => status !== equipment.status),
    [equipment.status],
  );

  const currentStatusBadge = EQUIPMENT_STATUS_BADGE_MAP[equipment.status];

  // The device turned out to be deleted: drop its own queries once the detail screen is gone (see
  // `invalidateEquipmentRosterCaches` for why not before).
  useEffect(
    () => () => {
      if (goneRef.current) removeDeletedEquipmentQueries(queryClient, equipment.id);
    },
    [queryClient, equipment.id],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNewStatus('');
      setChangedNote('');
    }
    onOpenChange(nextOpen);
  };

  const statusMutation = useMutation({
    ...adminConnectedDeviceControllerUpdateMutation(),
    onSuccess: () => {
      invalidateEquipmentStatusCaches(queryClient, [equipment.id]);
      toast.success('ステータスを変更しました');
      handleOpenChange(false);
    },
    // The toast comes from the shared MutationCache (D12); only the screen reaction lives here.
    onError: (error) => {
      if (isDeviceNotFoundError(error)) {
        // Deleted elsewhere: the detail behind the dialog is stale — leave for the list.
        goneRef.current = true;
        invalidateEquipmentRosterCaches(queryClient);
        handleOpenChange(false);
        router.push(navigate('/equipment'));
        return;
      }
      if (isDeviceConflictError(error)) {
        invalidateEquipmentStatusCaches(queryClient, [equipment.id]);
      }
    },
  });

  // BUG-E02-B-04: a double click must send one PATCH, not two.
  const { submitOnce, resetSubmitGuard } = useSubmitGuard(
    statusMutation.isPending,
    statusMutation.isError,
  );

  useEffect(() => {
    if (open) resetSubmitGuard();
  }, [open, resetSubmitGuard]);

  const handleSubmit = () => {
    if (!newStatus) return;

    // A status change on PATCH appends the history row itself (API-103 §6.2).
    submitOnce(() =>
      statusMutation.mutate({
        path: { deviceId: equipment.id },
        body: {
          status: newStatus,
          changedNote: changedNote.trim() || undefined,
        },
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md min-w-0">
        <DialogHeader>
          <DialogTitle>ステータス変更</DialogTitle>
          <DialogDescription>接続機器のステータスを変更します。</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* An unbroken name wraps inside its cell instead of widening the dialog past the
                  viewport (BUG-E02-B-09). */}
              <div className="min-w-0">
                <p className="text-muted-foreground mb-1 text-xs">接続機器名</p>
                <p className="text-sm font-medium wrap-anywhere">{equipment.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs">現在のステータス</p>
                <Badge variant="outline" className={currentStatusBadge.badgeClassName}>
                  <span className={`size-1.5 rounded-full ${currentStatusBadge.dotClassName}`} />
                  {EQUIPMENT_STATUS_LABELS[equipment.status]}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>新しいステータス</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as EquipmentStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="ステータスを選択">
                  {newStatus ? EQUIPMENT_STATUS_LABELS[newStatus] : 'ステータスを選択'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => {
                  const statusBadge = EQUIPMENT_STATUS_BADGE_MAP[status];

                  return (
                    <SelectItem key={status} value={status}>
                      <span className="inline-flex items-center gap-2">
                        <span className={`size-1.5 rounded-full ${statusBadge.dotClassName}`} />
                        {EQUIPMENT_STATUS_LABELS[status]}
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
              // Auto-grow is capped so a long reason scrolls inside the field instead of pushing
              // 変更を保存 off-screen (BUG-E02-B-03).
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
