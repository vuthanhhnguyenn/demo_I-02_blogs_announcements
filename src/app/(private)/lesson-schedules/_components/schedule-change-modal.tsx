'use client';

import { useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { TEXTAREA_MAX_LENGTH } from '@/constants/app.constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Bell, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  adminLessonScheduleControllerFromHereImpactOptions,
  adminLessonScheduleControllerGetRecurrenceOptions,
  adminLessonScheduleControllerUpdateFromHereMutation,
  adminLessonScheduleControllerUpdateScheduleMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonScheduleListItemDto } from '@/lib/api-real/types.gen';

import {
  NO_CHANGE_INSTRUCTOR,
  type ScheduleChangeFormSubmitValues,
  type ScheduleChangeFormValues,
  scheduleChangeFormSchema,
} from '../_schemas/schedule-change-form.schema';
import {
  LESSON_SCHEDULE_ERROR_CODE,
  addMinutesToTime,
  formatRecurrencePattern,
  formatTrainerNames,
  getLessonScheduleErrorCode,
  invalidateLessonScheduleQueries,
  isOneToOneLesson,
  minutesBetween,
  toScheduleChangeBody,
} from '../_utils/lesson-schedule-api.util';
import { formatTimeRange } from '../_utils/lesson-schedule-display.util';

function formatDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${dayNames[d.getDay()]})`;
}

interface InstructorOption {
  id: string;
  name: string;
}

interface ScheduleChangeModalProps {
  open: boolean;
  schedule: LessonScheduleListItemDto | null;
  /** Trainers seen in the loaded window — the replacement candidates */
  instructorOptions: InstructorOption[];
  onOpenChange: (open: boolean) => void;
}

interface ScheduleChangeModalContentProps {
  schedule: LessonScheduleListItemDto;
  instructorOptions: InstructorOption[];
  onOpenChange: (open: boolean) => void;
}

export function ScheduleChangeModal({
  open,
  schedule,
  instructorOptions,
  onOpenChange,
}: Readonly<ScheduleChangeModalProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {schedule && open && (
        <ScheduleChangeModalContent
          key={schedule.id}
          schedule={schedule}
          instructorOptions={instructorOptions}
          onOpenChange={onOpenChange}
        />
      )}
    </Dialog>
  );
}

function ScheduleChangeModalContent({
  schedule,
  instructorOptions: allInstructorOptions,
  onOpenChange,
}: Readonly<ScheduleChangeModalContentProps>) {
  const queryClient = useQueryClient();

  const originalStart = schedule.startTime;
  const originalEnd = schedule.endTime;
  // The server derives the end time from the lesson length; keep the same span while editing
  const durationMinutes = minutesBetween(originalStart, originalEnd);
  // 以降すべて only exists for schedules generated from a recurrence (else 422 E-LSC-017)
  const canChangeFollowing = !!schedule.recurrenceId;
  const currentTrainerNames = formatTrainerNames(schedule) || '未割当';

  const form = useForm<ScheduleChangeFormValues, unknown, ScheduleChangeFormSubmitValues>({
    resolver: zodResolver(scheduleChangeFormSchema) as never,
    mode: 'onChange',
    defaultValues: {
      changeScope: 'this-only',
      sendNotification: true,
      reason: '',
      startTime: originalStart,
      endTime: originalEnd,
      instructorId: NO_CHANGE_INSTRUCTOR,
      studioName: schedule.studioName ?? '',
    },
  });

  const { confirmDiscard } = useUnsavedChanges(form.formState.isDirty);

  const instructorOptions = useMemo(
    () => allInstructorOptions.filter((i) => !schedule.trainerIds.includes(i.id)),
    [allInstructorOptions, schedule.trainerIds],
  );

  const instructorSelectItems = useMemo(
    () => [
      { value: NO_CHANGE_INSTRUCTOR, label: '変更なし' },
      ...instructorOptions.map((i) => ({ value: i.id, label: i.name })),
    ],
    [instructorOptions],
  );

  const studioSelectItems = useMemo(
    () => (schedule.studioName ? [{ value: schedule.studioName, label: schedule.studioName }] : []),
    [schedule.studioName],
  );

  const [reasonValue, startTimeValue, endTimeValue, changeScope, instructorIdValue] = useWatch({
    control: form.control,
    name: ['reason', 'startTime', 'endTime', 'changeScope', 'instructorId'],
  });
  const isTimeRangeValid = startTimeValue < endTimeValue;
  const hasChange = startTimeValue !== originalStart || instructorIdValue !== NO_CHANGE_INSTRUCTOR;
  const canSubmit = !!reasonValue?.trim() && isTimeRangeValid && hasChange;

  // 以降すべて: what update-from-here reaches — every later non-cancelled occurrence of the
  // recurrence (no date window) and its reserved / pending bookings, counted by the API.
  const impactQuery = useQuery({
    ...adminLessonScheduleControllerFromHereImpactOptions({ path: { scheduleId: schedule.id } }),
    enabled: canChangeFollowing && changeScope === 'all-after',
  });
  const affectedBookingCount =
    changeScope === 'all-after' ? (impactQuery.data?.bookingCount ?? 0) : schedule.bookingCount;
  // A failed read must not show as 「0件」; a retry after the failure counts as loading again
  const isAffectedCountError =
    changeScope === 'all-after' && impactQuery.isError && !impactQuery.isFetching;
  const isAffectedCountLoading =
    changeScope === 'all-after' && !isAffectedCountError && impactQuery.data === undefined;
  // 「〇月〇日以降の毎週 月・水」 — the rule's pattern, from the recurrence detail
  const recurrenceQuery = useQuery({
    ...adminLessonScheduleControllerGetRecurrenceOptions({
      path: { recurrenceId: schedule.recurrenceId ?? '' },
    }),
    enabled: canChangeFollowing,
  });
  const patternLabel = recurrenceQuery.data ? formatRecurrencePattern(recurrenceQuery.data) : null;

  const isSubmittingRef = useRef(false);

  const handleSuccess = (description?: string) => {
    toast.success('スケジュールを変更しました', description ? { description } : undefined);
    invalidateLessonScheduleQueries(queryClient);
    onOpenChange(false);
  };

  const handleError = (error: unknown) => {
    // The shared MutationCache toasts the message; a stale row needs a reload to retry
    if (getLessonScheduleErrorCode(error) === LESSON_SCHEDULE_ERROR_CODE.staleUpdate) {
      invalidateLessonScheduleQueries(queryClient);
    }
  };

  const updateOneMutation = useMutation({
    ...adminLessonScheduleControllerUpdateScheduleMutation(),
    onSuccess: () => handleSuccess(),
    onError: handleError,
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const updateFollowingMutation = useMutation({
    ...adminLessonScheduleControllerUpdateFromHereMutation(),
    onSuccess: (data) =>
      handleSuccess(
        data.conflictedDates.length > 0
          ? `${data.updatedCount}件を変更しました（重複のため変更できなかった日: ${data.conflictedDates.join('、')}）`
          : `${data.updatedCount}件を変更しました`,
      ),
    onError: handleError,
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  function handleConfirm() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    void form.handleSubmit(
      (values) => {
        // TODO(round2) B3: 「予約者に変更通知を送信」 is not sent — API-112 always notifies the
        // bookers (N-029) and has no opt-out field, so the checkbox stays checked + disabled and
        // `values.sendNotification` is dropped here. Enable it once the API takes an opt-out.
        const body = toScheduleChangeBody(schedule, {
          startTime: values.startTime,
          newTrainerId: values.instructorId !== NO_CHANGE_INSTRUCTOR ? values.instructorId : null,
          reason: values.reason,
        });
        if (values.changeScope === 'all-after') {
          updateFollowingMutation.mutate({ path: { scheduleId: schedule.id }, body });
        } else {
          updateOneMutation.mutate({ path: { scheduleId: schedule.id }, body });
        }
      },
      () => {
        isSubmittingRef.current = false;
      },
    )();
  }

  const lessonTypeLabel = isOneToOneLesson(schedule) ? 'パーソナル' : 'スタジオ';
  const timeRange = formatTimeRange(schedule.startTime, schedule.endTime);
  const dateLabel = formatDateLabel(schedule.scheduledDate);
  const isPending = updateOneMutation.isPending || updateFollowingMutation.isPending;

  return (
    <Form {...form}>
      <DialogContent className="flex max-h-[760px] w-full max-w-[640px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>レッスンスケジュール変更</DialogTitle>
          <DialogDescription>予約が存在するレッスンの変更には制限があります</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="bg-primary/5 mb-5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{schedule.lessonName}</p>
                <p className="text-muted-foreground text-xs">
                  {dateLabel} {timeRange}
                  {schedule.studioName ? ` | ${schedule.studioName}` : ''}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/10 text-primary text-[10px]"
                >
                  {lessonTypeLabel}レッスン
                </Badge>
                {schedule.bookingCount > 0 && (
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <AlertTriangle className="text-warning size-3" />
                    <span className="text-warning text-[10px] font-medium">
                      予約あり: {schedule.bookingCount}名
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-xs font-bold">変更範囲</p>
            <FormField
              control={form.control}
              name="changeScope"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                  className="grid grid-cols-2 gap-2"
                >
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 ${
                      changeScope === 'this-only'
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value="this-only" className="shrink-0" />
                    <div>
                      <p className="text-xs font-medium">この回のみ変更</p>
                      <p className="text-muted-foreground text-[10px]">{dateLabel}のみ</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-2 rounded-lg border p-3 ${
                      !canChangeFollowing
                        ? 'cursor-not-allowed opacity-50'
                        : changeScope === 'all-after'
                          ? 'border-primary bg-primary/5 cursor-pointer'
                          : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                  >
                    <RadioGroupItem
                      value="all-after"
                      className="shrink-0"
                      disabled={!canChangeFollowing}
                    />
                    <div>
                      <p className="text-xs font-medium">以降すべて変更</p>
                      <p className="text-muted-foreground text-[10px]">
                        {canChangeFollowing
                          ? `${dateLabel}以降${patternLabel ? `の${patternLabel}` : ''}`
                          : '繰り返し設定のない単発スケジュールです'}
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              )}
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-bold">開始・終了時間</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-xs font-medium">開始時刻</Label>
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <Input
                        type="time"
                        className="h-9 text-sm"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.setValue(
                            'endTime',
                            addMinutesToTime(e.target.value, durationMinutes),
                            { shouldValidate: true },
                          );
                        }}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-xs font-medium">終了時刻</Label>
                  {/* The server derives the end from the lesson length (API-112) — preview only */}
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <Input type="time" className="h-9 text-sm" {...field} disabled />
                    )}
                  />
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    終了時刻はレッスン時間から自動計算されます
                  </p>
                </div>
              </div>
              {!isTimeRangeValid && (
                <p className="text-destructive mt-1 text-[10px]">
                  終了時間は開始時間より後にしてください
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-bold">インストラクター</p>
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2">
                  <div className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold">
                    {currentTrainerNames.charAt(0)}
                  </div>
                  <span className="text-sm">{currentTrainerNames}</span>
                  <span className="text-muted-foreground ml-auto text-[10px]">現在の担当</span>
                </div>
                <ArrowRight className="text-muted-foreground size-5 shrink-0" />
                <FormField
                  control={form.control}
                  name="instructorId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      items={instructorSelectItems}
                      onValueChange={(v) => v && field.onChange(v)}
                    >
                      <SelectTrigger className="h-9 flex-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CHANGE_INSTRUCTOR}>変更なし</SelectItem>
                        {instructorOptions.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {schedule.studioName && (
              <div>
                <p className="mb-1 text-xs font-bold">スタジオ</p>
                <FormField
                  control={form.control}
                  name="studioName"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      items={studioSelectItems}
                      onValueChange={(v) => v && field.onChange(v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={schedule.studioName}>{schedule.studioName}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-bold">
                変更理由 <span className="text-destructive">*</span>
              </p>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="変更理由を入力してください(例: インストラクター体調不良のため代行)"
                    className="resize-none text-sm"
                    rows={2}
                    maxLength={TEXTAREA_MAX_LENGTH}
                  />
                )}
              />
            </div>
          </div>

          <div className="border-border bg-muted/50 mt-5 rounded-lg border p-4">
            <h4 className="mb-2 text-xs font-bold">変更の影響</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Info className="text-info size-4" />
                <span className="text-muted-foreground">
                  影響を受ける予約:{' '}
                  {isAffectedCountError ? (
                    <>
                      <strong className="text-destructive">取得に失敗しました</strong>{' '}
                      <Button
                        variant="link"
                        size="xs"
                        className="h-auto p-0"
                        onClick={() => void impactQuery.refetch()}
                      >
                        再試行
                      </Button>
                    </>
                  ) : (
                    <strong className="text-foreground">
                      {isAffectedCountLoading ? '集計中...' : `${affectedBookingCount}件`}
                    </strong>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="text-warning size-4" />
                <span className="text-muted-foreground">
                  予約者への通知:{' '}
                  <strong className="text-foreground">スケジュール変更のお知らせ</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-success size-4" />
                <span className="text-muted-foreground">
                  返金処理: <strong className="text-foreground">不要</strong>
                  （レッスン自体は実施）
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 px-10 pb-8 sm:flex-col sm:justify-between">
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-sm"
              onClick={() => confirmDiscard(() => onOpenChange(false))}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <div className="flex items-center gap-3">
              <FormField
                control={form.control}
                name="sendNotification"
                render={({ field }) => (
                  // Always on: the API notifies the bookers on every change (see handleConfirm)
                  <label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Checkbox checked={field.value} disabled />
                    予約者に変更通知を送信
                  </label>
                )}
              />
              <Button
                size="lg"
                onClick={handleConfirm}
                disabled={isPending || !canSubmit || form.formState.isSubmitting}
              >
                {isPending ? '変更中...' : '変更を確定'}
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground w-full text-right text-[10px]">
            確定後、スケジュール画面に戻ります
          </p>
        </DialogFooter>
      </DialogContent>
    </Form>
  );
}
