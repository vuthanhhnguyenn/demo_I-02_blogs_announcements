'use client';

import { useState } from 'react';

import { formatDateMDWeekdayTime } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CreditCard, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

import {
  adminLessonScheduleControllerCancelFromHereMutation,
  adminLessonScheduleControllerCancelScheduleMutation,
  adminLessonScheduleControllerFromHereImpactOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonScheduleDetailDto } from '@/lib/api-real/types.gen';

import {
  SCHEDULE_CANCELLATION_CATEGORY_LABELS,
  SCHEDULE_REASON_MAX_LENGTH,
  type ScheduleCancellationCategory,
} from '../_constants/booking-status.constants';
import { invalidateScheduleQueries, refetchScheduleDetail } from '../_utils/booking-api.util';
import {
  formatTrainerNames,
  liveBookingCount,
  scheduleStartIso,
} from '../_utils/schedule-datetime.util';

/** API-112 `cancellationReasonCategory` options. */
export const CANCEL_REASON_OPTIONS = SCHEDULE_CANCELLATION_CATEGORY_LABELS;

const REASON_DEFAULT_DETAILS: Record<ScheduleCancellationCategory, string> = {
  trainer_absence_sick: '担当講師が体調不良のため、レッスンを実施できません。',
  trainer_absence_other: '担当講師の都合により、レッスンを実施できません。',
  facility_trouble: 'スタジオ設備の不具合により、レッスンを実施できません。',
  weather_disaster: '悪天候・災害の影響により、レッスンを実施できません。',
  insufficient_participants: '参加者数が最少催行人数に満たないため、レッスンを中止します。',
  other: '',
};

const DEFAULT_REASON: ScheduleCancellationCategory = 'trainer_absence_sick';

const STEP_LABELS = [
  { num: 1, label: '影響確認' },
  { num: 2, label: '理由入力' },
  { num: 3, label: '最終確認' },
];

interface CancelLessonWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  schedule: LessonScheduleDetailDto;
  onCancelled?: () => void;
}

export function CancelLessonWizard({
  open,
  onOpenChange,
  scheduleId,
  schedule,
  onCancelled,
}: CancelLessonWizardProps) {
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState<'this_only' | 'all_after'>('this_only');
  const [stopFurtherExpansion, setStopFurtherExpansion] = useState(true);
  const [reason, setReason] = useState<ScheduleCancellationCategory>(DEFAULT_REASON);
  const [reasonDetail, setReasonDetail] = useState(REASON_DEFAULT_DETAILS[DEFAULT_REASON]);
  const [reasonDetailTouched, setReasonDetailTouched] = useState(false);
  // FR-003 「変更理由の入力を必須」 — the API-112 §7.3 `changeReason` audit field, distinct from
  // the member-facing 中止理由 above.
  const [changeReason, setChangeReason] = useState('');
  const [changeReasonTouched, setChangeReasonTouched] = useState(false);
  const queryClient = useQueryClient();

  const lessonName = schedule.lesson?.name ?? '';
  const studioName = schedule.studio?.name ?? null;
  const trainerNames = formatTrainerNames(schedule) || '—';
  const bookedCount = liveBookingCount(schedule);
  const lessonTypeLabel =
    schedule.lesson?.lessonType === 'studio' ? 'スタジオレッスン' : 'パーソナル';
  // cancel-from-here needs a recurrence (E-LSC-017).
  const canCancelFromHere = schedule.recurrenceId !== null;
  const isAllAfter = scope === 'all_after' && canCancelFromHere;

  // 以降すべて: what cancel-from-here reaches — this and every later non-cancelled occurrence of
  // the recurrence (no date window) and their reserved / pending bookings, counted by the API
  // (GET …/from-here-impact, BE !724) instead of a 3-month list scan.
  const impactQuery = useQuery({
    ...adminLessonScheduleControllerFromHereImpactOptions({ path: { scheduleId } }),
    enabled: open && isAllAfter,
  });
  const impact = impactQuery.data;
  // A failed read must not pass for 「1回分・0名」; a retry after the failure counts as loading
  const isImpactError = isAllAfter && impactQuery.isError && !impactQuery.isFetching;
  const isImpactLoading = isAllAfter && !isImpactError && impact === undefined;
  const affectedSessionCount = isAllAfter ? (impact?.scheduleCount ?? 0) : 1;
  const affectedBookingCount = isAllAfter ? (impact?.bookingCount ?? 0) : bookedCount;
  // 返金目安 counts paid bookings only — trial bookings are free. (この回のみ: `trial` is the live
  // trial count, so an attended trial on a past session would be subtracted too — not a case here.)
  const refundableBookingCount = isAllAfter
    ? impact
      ? impact.bookingCount - impact.trialBookingCount
      : 0
    : Math.max(0, bookedCount - schedule.bookingSummary.trial);
  // Guide only — the API executes no refund.
  const perUseFee = schedule.lesson?.feeType === 'per_use' ? (schedule.lesson.fee ?? 0) : 0;
  const estimatedRefund = perUseFee * refundableBookingCount;
  /** The impact figure, or 「…」 while loading / 「—」 when it could not be read */
  const impactValue = (value: string) => {
    if (isImpactLoading) return '…';
    return isImpactError ? '—' : value;
  };

  const isReasonValid = reason !== 'other' || reasonDetail.trim().length > 0;
  const isChangeReasonValid = changeReason.trim().length > 0;
  const canProceed = isReasonValid && isChangeReasonValid;

  const buildBody = () => ({
    cancellationReasonCategory: reason,
    cancellationReason: reasonDetail.trim() || null,
    changeReason: changeReason.trim(),
  });

  const onCancelSucceeded = (description: string) => {
    toast.success('レッスンを中止しました', { description });
    onCancelled?.();
    invalidateScheduleQueries(queryClient, scheduleId);
    handleClose(false);
  };
  // Toast comes from the shared MutationCache; refetch so a cancelled state shows.
  const onCancelFailed = () => refetchScheduleDetail(queryClient, scheduleId);

  const cancelOneMutation = useMutation({
    ...adminLessonScheduleControllerCancelScheduleMutation(),
    onSuccess: (data) =>
      onCancelSucceeded(`予約${data.affectedBookingCount}件をキャンセルし、予約者へ通知しました`),
    onError: onCancelFailed,
  });
  const cancelFromHereMutation = useMutation({
    ...adminLessonScheduleControllerCancelFromHereMutation(),
    onSuccess: (data) =>
      onCancelSucceeded(
        `${data.affectedScheduleCount}回分を中止し、予約${data.affectedBookingCount}件をキャンセルしました`,
      ),
    onError: onCancelFailed,
  });
  const isSubmitting = cancelOneMutation.isPending || cancelFromHereMutation.isPending;

  const handleClose = (nextOpen?: boolean) => {
    if (nextOpen === false || nextOpen === undefined) {
      setStep(1);
      setScope('this_only');
      setStopFurtherExpansion(true);
      setReason(DEFAULT_REASON);
      setReasonDetail(REASON_DEFAULT_DETAILS[DEFAULT_REASON]);
      setReasonDetailTouched(false);
      setChangeReason('');
      setChangeReasonTouched(false);
    }
    onOpenChange(nextOpen ?? false);
  };

  const handleReasonChange = (value: string) => {
    const next = value as ScheduleCancellationCategory;
    setReason(next);
    if (!reasonDetailTouched) setReasonDetail(REASON_DEFAULT_DETAILS[next] ?? '');
  };

  const handleConfirm = () => {
    if (isSubmitting || !canProceed) return;
    if (isAllAfter) {
      cancelFromHereMutation.mutate({
        path: { scheduleId },
        body: { ...buildBody(), stopFurtherExpansion },
      });
    } else {
      cancelOneMutation.mutate({ path: { scheduleId }, body: buildBody() });
    }
  };

  const formatScheduleDate = () =>
    formatDateMDWeekdayTime(scheduleStartIso(schedule), scheduleStartIso(schedule));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[560px] gap-0 p-0">
        {/* Header */}
        <div className="bg-destructive/10 border-destructive/20 rounded-t-lg border-b px-6 py-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 flex size-10 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">レッスンを中止する</DialogTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  中止すると予約はキャンセルされ、予約者へ通知が送信されます
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 border-b px-6 py-3">
          {STEP_LABELS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              {i > 0 && <div className="bg-border h-px w-6" />}
              <div
                className={`flex items-center gap-1 ${s.num === step ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                <div
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    s.num === step
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.num}
                </div>
                <span className="text-xs font-medium">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[480px] space-y-4 overflow-y-auto px-6 py-4">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <div className="bg-destructive/10 border-destructive/20 rounded-lg border px-4 py-3">
                <p className="text-destructive text-sm font-bold">この枠の開催を中止します。</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  既存予約は{bookedCount}
                  件あります。中止すると予約者全員に通知され、予約はキャンセルされます。データ自体は履歴として残ります。
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{lessonName}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatScheduleDate()}
                      {studioName ? ` | ${studioName}` : ''}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      インストラクター: {trainerNames}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {lessonTypeLabel}
                  </Badge>
                </div>
              </div>

              {/* Cancel scope */}
              <div>
                <Label className="mb-2 block text-xs font-medium">中止範囲</Label>
                <div className="space-y-2">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-sm ${scope === 'this_only' ? 'bg-info/10 border-info/20' : ''}`}
                    onClick={() => setScope('this_only')}
                  >
                    <div
                      className={`flex size-4 items-center justify-center rounded-full border-2 ${scope === 'this_only' ? 'border-primary' : 'border-muted-foreground/30'}`}
                    >
                      {scope === 'this_only' && <div className="bg-primary size-2 rounded-full" />}
                    </div>
                    この回のみ中止
                  </label>
                  <label
                    aria-disabled={!canCancelFromHere}
                    className={`flex items-center gap-2 rounded border p-2 text-sm ${
                      !canCancelFromHere
                        ? 'text-muted-foreground cursor-not-allowed opacity-60'
                        : isAllAfter
                          ? 'bg-info/10 border-info/20 cursor-pointer'
                          : 'cursor-pointer'
                    }`}
                    onClick={() => canCancelFromHere && setScope('all_after')}
                  >
                    <div
                      className={`flex size-4 items-center justify-center rounded-full border-2 ${isAllAfter ? 'border-primary' : 'border-muted-foreground/30'}`}
                    >
                      {isAllAfter && <div className="bg-primary size-2 rounded-full" />}
                    </div>
                    以降すべて中止
                    {!canCancelFromHere && (
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        単発レッスンのため選択できません
                      </span>
                    )}
                  </label>
                  {isAllAfter && (
                    <label className="ml-6 flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={stopFurtherExpansion}
                        onCheckedChange={(v) => setStopFurtherExpansion(!!v)}
                      />
                      繰り返しの自動生成も停止する
                    </label>
                  )}
                </div>
              </div>

              {/* Impact summary */}
              <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
                <p className="text-destructive mb-3 text-xs font-bold">
                  中止による影響
                  {isAllAfter && (
                    <span className="text-muted-foreground ml-2 font-normal">
                      （{impactValue(`${affectedSessionCount}回分`)}）
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-destructive/10 flex size-8 items-center justify-center rounded-full">
                      <Users className="text-destructive size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        {impactValue(`${affectedBookingCount}名`)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">予約キャンセル</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-destructive/10 flex size-8 items-center justify-center rounded-full">
                      <Mail className="text-destructive size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        {impactValue(`${affectedBookingCount}通`)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">通知送信</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-destructive/10 flex size-8 items-center justify-center rounded-full">
                      <CreditCard className="text-destructive size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{impactValue(formatYen(estimatedRefund))}</p>
                      <p className="text-muted-foreground text-[10px]">返金目安（都度払い分）</p>
                    </div>
                  </div>
                </div>
                {isImpactError && (
                  <p className="text-destructive mt-3 text-xs">
                    影響件数の取得に失敗しました{' '}
                    <Button
                      variant="link"
                      size="xs"
                      className="h-auto p-0"
                      onClick={() => void impactQuery.refetch()}
                    >
                      再試行
                    </Button>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <Label className="mb-2 block text-xs font-medium">中止理由</Label>
              <Select value={reason} onValueChange={(v) => v && handleReasonChange(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue>{CANCEL_REASON_OPTIONS[reason]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CANCEL_REASON_OPTIONS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                className="mt-2 min-h-[60px] text-sm"
                placeholder={reason === 'other' ? '詳細を入力（必須）' : '詳細を入力'}
                maxLength={SCHEDULE_REASON_MAX_LENGTH}
                value={reasonDetail}
                onChange={(e) => {
                  setReasonDetailTouched(true);
                  setReasonDetail(e.target.value);
                }}
              />
              {!isReasonValid && (
                <p className="text-destructive mt-1 text-[10px]">
                  「その他」の場合は詳細を入力してください
                </p>
              )}

              <Label className="mt-4 mb-2 block text-xs font-medium">
                変更理由 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                className="min-h-[60px] text-sm"
                placeholder="操作ログに記録する理由を入力してください（例: 講師から当日朝に連絡があったため）"
                maxLength={SCHEDULE_REASON_MAX_LENGTH}
                value={changeReason}
                onChange={(e) => {
                  setChangeReasonTouched(true);
                  setChangeReason(e.target.value);
                }}
                onBlur={() => setChangeReasonTouched(true)}
              />
              {changeReasonTouched && !isChangeReasonValid && (
                <p className="text-destructive mt-1 text-[10px]">変更理由を入力してください</p>
              )}
              <p className="text-muted-foreground mt-2 text-[10px]">
                予約者への中止のお知らせは自動で送信されます。返金は別途手動で対応してください。
              </p>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{lessonName}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatScheduleDate()}
                        {studioName ? ` | ${studioName}` : ''}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {lessonTypeLabel}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">中止範囲</span>
                    <span className="text-xs font-medium">
                      {isAllAfter
                        ? `以降すべて（${impactValue(`${affectedSessionCount}回分`)}）`
                        : 'この回のみ'}
                    </span>
                  </div>
                  {isAllAfter && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs">繰り返しの自動生成</span>
                        <span className="text-xs font-medium">
                          {stopFurtherExpansion ? '停止する' : '継続する'}
                        </span>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">中止理由</span>
                    <span className="text-xs font-medium">{CANCEL_REASON_OPTIONS[reason]}</span>
                  </div>
                  {reasonDetail && (
                    <>
                      <Separator />
                      <div className="text-muted-foreground text-xs">{reasonDetail}</div>
                    </>
                  )}
                  <Separator />
                  <div className="text-sm">
                    <span className="text-muted-foreground block text-xs">変更理由</span>
                    <span className="text-xs font-medium break-words">{changeReason.trim()}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground text-xs">予約者への通知</span>
                    <span className="text-xs font-medium">
                      自動送信（{impactValue(`${affectedBookingCount}通`)}）
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-info/10 border-info/20 rounded-lg border p-3">
                <p className="text-info text-xs">
                  この操作は操作ログに記録されます。予約者への中止のお知らせは自動送信されます。返金が必要な場合は個別に対応してください。
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-3">
          {step === 1 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setStep(2)}>
                次へ：理由を入力
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                戻る
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!canProceed}
                onClick={() => setStep(3)}
              >
                次へ：最終確認
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                戻る
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isSubmitting || !canProceed}
                onClick={handleConfirm}
              >
                この内容でレッスンを中止する
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
