'use client';

import { useState } from 'react';

import { OptionalMark } from '@/components/common/field-marker';
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

import type { EquipmentStatus } from '../_constants/constants';
import { EQUIPMENT_STATUS_BADGE_MAP, EQUIPMENT_STATUS_LABELS } from '../_constants/constants';
import { EQUIPMENT_BULK_NOTE_MAX_LENGTH } from '../_hooks/use-equipment-bulk-status.hook';
import { EQUIPMENT_STATUS_VALUES } from '../_schemas/equipment-form.schema';

interface EquipmentBulkStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  isSubmitting: boolean;
  onSubmit: (payload: { status: EquipmentStatus; changedNote?: string }) => void;
}

export function EquipmentBulkStatusDialog({
  open,
  onOpenChange,
  selectedCount,
  isSubmitting,
  onSubmit,
}: EquipmentBulkStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<EquipmentStatus | ''>('');
  const [changedNote, setChangedNote] = useState('');
  const isDiscard = newStatus === 'discarded';

  // BUG-E02-A-08 — a successful submit is closed by the parent (`open` → false) without going
  // through `handleOpenChange`, so the previous 変更先状態 / 変更理由 survived into the next batch and
  // were silently resubmitted. Start every opening from a fresh dialog instead.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNewStatus('');
      setChangedNote('');
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNewStatus('');
      setChangedNote('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!newStatus) return;

    onSubmit({
      status: newStatus,
      changedNote: changedNote.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>一括状態変更</DialogTitle>
          <DialogDescription>
            選択中 {selectedCount} 件の接続機器の状態を変更します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>変更先状態</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as EquipmentStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="状態を選択">
                  {newStatus ? EQUIPMENT_STATUS_LABELS[newStatus] : '状態を選択'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_STATUS_VALUES.map((status) => {
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

          {isDiscard && (
            <div className="bg-destructive/10 border-destructive/20 rounded-md border px-3 py-2">
              <p className="text-destructive text-xs font-medium">
                廃棄への変更は取り消しが困難です
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                廃棄に変更すると機器の利用制御が停止されます。
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>
              変更理由
              <OptionalMark />
            </Label>
            <Textarea
              placeholder="変更理由や作業内容を入力"
              rows={3}
              className="max-h-60 overflow-y-auto wrap-anywhere"
              maxLength={EQUIPMENT_BULK_NOTE_MAX_LENGTH}
              value={changedNote}
              onChange={(event) => setChangedNote(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button
            className={
              isDiscard ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''
            }
            disabled={!newStatus || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? '保存中...' : isDiscard ? '廃棄する' : '変更を保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
