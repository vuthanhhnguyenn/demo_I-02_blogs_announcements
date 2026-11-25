'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCircle, Info, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  adminLessonScheduleControllerUpdateScheduleMutation,
  adminStudioControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { AdminStudioManagementApi110 } from '@/lib/api-real/sdk.gen';
import type { LessonScheduleDetailDto } from '@/lib/api-real/types.gen';

import { SCHEDULE_REASON_MAX_LENGTH } from '../_constants/booking-status.constants';
import {
  fetchEveryPage,
  invalidateScheduleQueries,
  refetchScheduleDetail,
} from '../_utils/booking-api.util';
import { liveBookingCount } from '../_utils/schedule-datetime.util';

interface ChangeStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  schedule: LessonScheduleDetailDto;
}

export function ChangeStudioDialog({
  open,
  onOpenChange,
  scheduleId,
  schedule,
}: ChangeStudioDialogProps) {
  const [selectedStudioId, setSelectedStudioId] = useState('');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const lessonName = schedule.lesson?.name ?? '';
  const studioName = schedule.studio?.name ?? null;
  const bookedCount = liveBookingCount(schedule);
  // Same store, same room kind.
  const studioType = schedule.studio?.studioType ?? schedule.lesson?.lessonType ?? undefined;

  const studioQuery = { storeId: schedule.storeId, isActive: true, studioType };
  const studiosQuery = useQuery({
    queryKey: [...adminStudioControllerListQueryKey({ query: studioQuery }), 'all-pages'],
    queryFn: ({ signal }) =>
      fetchEveryPage(
        async (paging) =>
          (
            await AdminStudioManagementApi110.adminStudioControllerList({
              // `page` / `limit` are accepted by the BE but missing from the Swagger
              query: { ...studioQuery, ...paging } as typeof studioQuery,
              signal,
              throwOnError: true,
            })
          ).data,
      ),
    enabled: open,
  });
  const availableStudios = (studiosQuery.data ?? []).filter((s) => s.id !== schedule.studioId);

  const changeMutation = useMutation({
    ...adminLessonScheduleControllerUpdateScheduleMutation(),
    onSuccess: () => {
      toast.success('スタジオを変更しました');
      invalidateScheduleQueries(queryClient, scheduleId);
      handleClose();
    },
    // Toast comes from the shared MutationCache; refetch so a retry has a fresh expectedUpdatedAt.
    onError: () => refetchScheduleDetail(queryClient, scheduleId),
  });

  const handleClose = () => {
    setSelectedStudioId('');
    setReason('');
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (!selectedStudioId || !reason.trim()) return;
    changeMutation.mutate({
      path: { scheduleId },
      body: {
        studioId: selectedStudioId,
        changeReason: reason.trim(),
        expectedUpdatedAt: schedule.updatedAt,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">スタジオを変更する</DialogTitle>
          <p className="text-muted-foreground text-xs">{lessonName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current studio */}
          <div>
            <Label className="mb-2 block text-xs font-medium">現在のスタジオ</Label>
            <div className="bg-muted/50 rounded-lg p-3 text-sm font-medium">
              {studioName ?? '未設定'}（定員{schedule.capacity}名）
            </div>
          </div>

          {/* New studio */}
          <div>
            <Label className="mb-2 block text-xs font-medium">変更先のスタジオ</Label>
            <Command className="rounded-lg border">
              <CommandInput placeholder="スタジオ名で検索..." className="h-9 text-sm" />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>
                  {studiosQuery.isPending
                    ? '読み込み中...'
                    : studiosQuery.isError
                      ? 'スタジオ一覧の取得に失敗しました'
                      : '該当するスタジオが見つかりません'}
                </CommandEmpty>
                <CommandGroup>
                  {availableStudios.map((studio) => (
                    <CommandItem
                      key={studio.id}
                      value={studio.name}
                      onSelect={() => setSelectedStudioId(studio.id)}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="text-muted-foreground size-4 shrink-0" />
                        <span className="text-sm font-medium">{studio.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          定員{studio.capacity}名
                        </Badge>
                        {selectedStudioId === studio.id && (
                          <Check className="text-primary size-4 shrink-0" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {/* Layout change warning */}
          <div className="bg-info/10 border-info/20 rounded-lg border p-3">
            <p className="text-info text-xs">
              スタジオ変更に伴いスペースレイアウトが変わる場合があります。変更後にスペース予約状況を確認してください。
            </p>
          </div>

          {/* Reason */}
          <div>
            <p className="mb-1 text-xs font-bold">
              変更理由 <span className="text-destructive">*</span>
            </p>
            <Textarea
              placeholder="変更理由を入力してください（例: 設備点検のためスタジオ変更）"
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
                  予約者への通知:{' '}
                  <strong className="text-foreground">スタジオ変更のお知らせ</strong>（{bookedCount}
                  名）
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-success size-4 shrink-0" />
                <span className="text-muted-foreground">
                  返金処理: <strong className="text-foreground">不要</strong>（レッスン自体は実施）
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
            disabled={!selectedStudioId || !reason.trim() || changeMutation.isPending}
            onClick={handleConfirm}
          >
            スタジオを変更する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
