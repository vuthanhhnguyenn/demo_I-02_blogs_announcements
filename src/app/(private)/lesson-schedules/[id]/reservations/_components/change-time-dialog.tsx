'use client';

import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { adminLessonScheduleControllerUpdateScheduleMutation } from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonScheduleDetailDto } from '@/lib/api-real/types.gen';

import { toTimeSlot } from '../../../_utils/lesson-schedule-display.util';
import { SCHEDULE_REASON_MAX_LENGTH } from '../_constants/booking-status.constants';
import { invalidateScheduleQueries, refetchScheduleDetail } from '../_utils/booking-api.util';
import { liveBookingCount } from '../_utils/schedule-datetime.util';

function timeSlotToMinutes(slot: string): number {
  const [h = 0, m = 0] = slot.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeSlot(total: number): string {
  const clamped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface ChangeTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  schedule: LessonScheduleDetailDto;
}

export function ChangeTimeDialog({
  open,
  onOpenChange,
  scheduleId,
  schedule,
}: ChangeTimeDialogProps) {
  const currentStart = toTimeSlot(schedule.startTime);
  const currentEnd = toTimeSlot(schedule.endTime);
  const lessonName = schedule.lesson?.name ?? '';
  const bookedCount = liveBookingCount(schedule);

  // endTime is server-derived; preview it from the current span (or the lesson duration).
  const durationMinutes =
    timeSlotToMinutes(currentEnd) - timeSlotToMinutes(currentStart) ||
    schedule.lesson?.durationMinutes ||
    0;

  const [startTime, setStartTime] = useState(currentStart);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const previewEnd = startTime
    ? minutesToTimeSlot(timeSlotToMinutes(startTime) + durationMinutes)
    : '';
  const isStartValid = /^\d{2}:\d{2}$/.test(startTime);
  const isChanged = startTime !== currentStart;
  const isSubmittingRef = useRef(false);

  const changeMutation = useMutation({
    ...adminLessonScheduleControllerUpdateScheduleMutation(),
    onSuccess: () => {
      toast.success('時間を変更しました');
      invalidateScheduleQueries(queryClient, scheduleId);
      handleClose();
    },
    // Toast comes from the shared MutationCache; refetch so a retry has a fresh expectedUpdatedAt.
    onError: () => refetchScheduleDetail(queryClient, scheduleId),
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleClose = () => {
    setStartTime(currentStart);
    setReason('');
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (isSubmittingRef.current) return;
    if (!reason.trim() || !isStartValid || !isChanged) return;
    isSubmittingRef.current = true;
    changeMutation.mutate({
      path: { scheduleId },
      body: {
        startTime,
        changeReason: reason.trim(),
        expectedUpdatedAt: schedule.updatedAt,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base">時間を変更する</DialogTitle>
          <p className="text-muted-foreground text-xs">{lessonName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current time */}
          <div>
            <Label className="mb-2 block text-xs font-medium">現在の時間</Label>
            <div className="bg-muted/50 rounded-lg p-3 text-sm font-medium">
              {currentStart} 〜 {currentEnd}
            </div>
          </div>

          {/* New start + derived end */}
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block text-xs font-medium">開始時刻</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="mb-2 block text-xs font-medium">終了時刻（自動計算）</Label>
                <div className="bg-muted/50 flex h-9 items-center rounded-lg px-3 text-sm font-medium">
                  {previewEnd || '—'}
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-1 text-[10px]">
              終了時刻はレッスンの所要時間（{durationMinutes}分）から自動で決まります
            </p>
          </div>

          {/* Warning */}
          <div className="bg-warning/10 border-warning/20 rounded-lg border p-3">
            <p className="text-warning text-xs">
              時間変更により、同時間帯の他のレッスンとスタジオが重複しないか確認してください。
            </p>
          </div>

          {/* Reason */}
          <div>
            <p className="mb-1 text-xs font-bold">
              変更理由 <span className="text-destructive">*</span>
            </p>
            <Textarea
              placeholder="変更理由を入力してください（例: 施設メンテナンスのため時間変更）"
              className="resize-none text-sm"
              rows={2}
              maxLength={SCHEDULE_REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Impact summary */}
          <div className="bg-muted/50 rounded-lg border p-4">
            <h4 className="mb-2 text-xs font-bold">変更の影響</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Info className="text-info size-4 shrink-0" />
                <span className="text-muted-foreground">
                  影響を受ける予約: <strong className="text-foreground">{bookedCount}件</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="text-warning size-4 shrink-0" />
                <span className="text-muted-foreground">
                  予約者への通知: <strong className="text-foreground">時間変更のお知らせ</strong>（
                  {bookedCount}名）
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-success size-4 shrink-0" />
                <span className="text-muted-foreground">
                  返金処理: <strong className="text-foreground">不要</strong>
                  （レッスン自体は実施）
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            size="sm"
            disabled={!reason.trim() || !isStartValid || !isChanged || changeMutation.isPending}
            onClick={handleConfirm}
          >
            時間を変更する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
