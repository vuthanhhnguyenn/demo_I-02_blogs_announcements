'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD } from '@/utils/date.util';
import { formatDate, formatDateTime } from '@/utils/format.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminLessonBookingControllerClearPenaltyMutation,
  adminLessonBookingControllerListPenaltiesQueryKey,
  adminMemberControllerDetailQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

type PenaltyReleaseReason = 'illness_reported' | 'store_reason' | 'attendance_error' | 'other';

// D-01 FR-010 / prototype: the reasons a no-show penalty is lifted early.
const RELEASE_REASON_OPTIONS: { value: PenaltyReleaseReason; label: string }[] = [
  { value: 'illness_reported', label: '体調不良・急病の申告があった' },
  { value: 'store_reason', label: '店舗都合（レッスン中止・設備不具合）' },
  { value: 'attendance_error', label: '出席記録の誤り（実際は出席・事前連絡あり）' },
  { value: 'other', label: 'その他' },
];

/** `ClearLessonPenaltyRequestDto.clearReason` — the API rejects anything longer. */
const CLEAR_REASON_MAX_LENGTH = 500;
/** Joins the reason label and 詳細 into the one `clearReason` string. */
const CLEAR_REASON_SEPARATOR = ' / ';

const reasonLabel = (reason: PenaltyReleaseReason | undefined) =>
  RELEASE_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? '';

/** Room left for 詳細 once the chosen reason label is in `clearReason`. */
const detailMaxLength = (reason: PenaltyReleaseReason | undefined) =>
  CLEAR_REASON_MAX_LENGTH - reasonLabel(reason).length - CLEAR_REASON_SEPARATOR.length;

const PENALTY_TYPE_LABELS: Record<string, string> = {
  studio: 'スタジオ予約',
  personal_training: 'パーソナルトレーニング',
  body_care: 'ボディケア',
};

const penaltyReleaseFormSchema = z
  .object({
    reason: z.enum(['illness_reported', 'store_reason', 'attendance_error', 'other'], {
      message: '解除理由は必須です',
    }),
    detail: z.string().optional(),
    confirmed: z.boolean().refine((v) => v, { message: '内容の確認チェックが必要です' }),
  })
  .refine((v) => (v.detail?.trim().length ?? 0) <= detailMaxLength(v.reason), {
    message: `解除理由と詳細は合わせて${CLEAR_REASON_MAX_LENGTH}文字以内で入力してください`,
    path: ['detail'],
  });

type PenaltyReleaseFormValues = z.infer<typeof penaltyReleaseFormSchema>;

interface ActivePenalty {
  /** Penalty id — 解除 is keyed by it, not by the member. */
  id?: string;
  penaltyType: string;
  endAt: string;
  noShowCount?: number;
  startAt?: string;
  /** D-01 FR-010: the reservations behind `noShowCount`, listed read-only before release */
  triggeringReservations?: string[];
  targetWeek?: string;
}

interface PenaltyReleaseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  penalty: ActivePenalty | null | undefined;
  /** Opens the 変更履歴 tab from the success toast. */
  onShowHistory: () => void;
}

export function PenaltyReleaseSheet({
  open,
  onOpenChange,
  memberId,
  penalty,
  onShowHistory,
}: Readonly<PenaltyReleaseSheetProps>) {
  const queryClient = useQueryClient();
  const { user } = useAuthUser();

  // FR-007: the release takes effect immediately, so it gets both the acknowledgement
  // checkbox and a confirm dialog.
  const [showConfirm, setShowConfirm] = useState(false);
  // A second click on the confirm button lands before the closing dialog unmounts; a ref (not
  // state) is what the second handler call sees synchronously.
  const submittingRef = useRef(false);

  // The banner reads this list; refreshing it is what makes a released penalty disappear.
  const refreshPenalty = () => {
    void queryClient.invalidateQueries({
      queryKey: adminLessonBookingControllerListPenaltiesQueryKey({
        query: { memberId, status: ['active'] },
      }),
    });
    void queryClient.invalidateQueries({
      queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
    });
  };

  // The penalty may have been released or expired since this page loaded; re-read it so the
  // sheet never offers to release one that is already gone.
  useEffect(() => {
    void queryClient.invalidateQueries({
      queryKey: adminLessonBookingControllerListPenaltiesQueryKey({
        query: { memberId, status: ['active'] },
      }),
    });
  }, [queryClient, memberId]);

  const form = useForm<PenaltyReleaseFormValues>({
    resolver: zodResolver(penaltyReleaseFormSchema),
    defaultValues: { reason: undefined, detail: '', confirmed: false },
  });
  // Drives the footer submit button; RHF is the single source of truth for the checkbox state
  const confirmed = useWatch({ control: form.control, name: 'confirmed' });
  const reason = useWatch({ control: form.control, name: 'reason' });

  const mutation = useMutation({
    ...adminLessonBookingControllerClearPenaltyMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onError: (error) => {
      // 409 E-LSB-021: already expired or released elsewhere — refresh the banner.
      if (getApiErrorStatus(error) === 409) refreshPenalty();
    },
    onSuccess: () => {
      toast.success('予約ペナルティを解除しました', {
        description: '会員に通知を送りました',
        action: { label: '履歴を見る', onClick: onShowHistory },
      });
      refreshPenalty();
      handleClose();
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset({ reason: undefined, detail: '', confirmed: false });
    }, 300);
  };

  // Validate first, then ask for confirmation; the mutation only runs from the dialog.
  // The sheet body scrolls, so `scrollToFirstError` brings the first invalid field into view
  const scrollToFirstError = useScrollToFirstError();
  const handleSubmit = form.handleSubmit(() => {
    setShowConfirm(true);
  }, scrollToFirstError);

  const handleConfirm = () => {
    if (submittingRef.current || !penalty?.id) return;
    submittingRef.current = true;
    setShowConfirm(false);
    const data = form.getValues();
    mutation.mutate({
      // 解除 is keyed by the penalty, not the member.
      path: { penaltyId: penalty.id },
      // The real DTO takes one free-text reason; the sheet's 詳細 is appended to it.
      body: {
        clearReason: [reasonLabel(data.reason), data.detail?.trim()]
          .filter(Boolean)
          .join(CLEAR_REASON_SEPARATOR),
      },
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <CalendarOff className="size-4" />
                ペナルティ解除
              </SheetTitle>
              <SheetDescription className="sr-only">予約ペナルティ解除フォーム</SheetDescription>
            </SheetHeader>
          </div>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6">
                {/* Current penalty info */}
                <div className="py-4">
                  <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-3">
                    <p className="text-muted-foreground mb-1 text-xs font-medium">
                      現在のペナルティ
                    </p>
                    {penalty ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <p className="text-muted-foreground text-xs">適用日</p>
                          <p className="text-sm font-medium">{formatDate(penalty.startAt)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">予約不可期限</p>
                          <p className="text-sm font-medium">{formatDateTime(penalty.endAt)}</p>
                        </div>
                        {penalty.noShowCount != null && (
                          <div>
                            <p className="text-muted-foreground text-xs">無断キャンセル回数</p>
                            <p className="text-sm font-medium">{penalty.noShowCount}回</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground text-xs">対象</p>
                          <p className="text-sm font-medium">
                            {PENALTY_TYPE_LABELS[penalty.penaltyType] ?? penalty.penaltyType}
                          </p>
                        </div>
                        {penalty.targetWeek && (
                          <div>
                            <p className="text-muted-foreground text-xs">対象週</p>
                            <p className="text-sm font-medium">{penalty.targetWeek}</p>
                          </div>
                        )}
                        {penalty.triggeringReservations &&
                          penalty.triggeringReservations.length > 0 && (
                            <div className="col-span-2">
                              <p className="text-muted-foreground text-xs">対象となった予約</p>
                              {penalty.triggeringReservations.map((reservation) => (
                                <p key={reservation} className="text-sm font-medium">
                                  {reservation}
                                </p>
                              ))}
                            </div>
                          )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">ペナルティ情報なし</p>
                    )}
                  </div>
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                <div className="flex flex-col gap-4 py-4">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          解除理由 <span className="text-destructive ml-1 text-xs">*</span>
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => field.onChange(v as PenaltyReleaseReason)}
                          items={RELEASE_REASON_OPTIONS}
                        >
                          <FormControl>
                            <SelectTrigger id="penalty-release-reason" className="h-9 text-sm">
                              <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RELEASE_REASON_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="detail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          詳細 <span className="text-muted-foreground ml-1 text-xs">任意</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            id="penalty-release-detail"
                            maxLength={detailMaxLength(reason)}
                            rows={2}
                            className="max-h-32 resize-none overflow-y-auto text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Release info — who/when this release will be recorded under (FR-019) */}
                  <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-3">
                    <p className="text-muted-foreground text-xs font-medium">解除情報</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-muted-foreground text-xs">解除実行者</p>
                        <p className="text-sm font-medium">{user?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">解除日時</p>
                        <p className="text-sm font-medium">{formatDateYYYYMMDD(new Date())}</p>
                      </div>
                      {/* D-01 FR-010: releasing notifies the member, so say so before it happens */}
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">会員への通知</p>
                        <p className="text-sm font-medium">解除完了を会員アプリへ自動送信します</p>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="confirmed"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2 pt-1">
                          <FormControl>
                            <Checkbox
                              id="penalty-release-confirm"
                              checked={field.value}
                              onCheckedChange={(v) => field.onChange(v === true)}
                            />
                          </FormControl>
                          <Label
                            htmlFor="penalty-release-confirm"
                            className="cursor-pointer text-sm leading-snug"
                          >
                            上記の内容を確認し、予約ペナルティを解除します
                          </Label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={mutation.isPending}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                  // Without a penalty id there is nothing to release (handleConfirm would no-op)
                  disabled={!confirmed || !penalty?.id || mutation.isPending}
                >
                  解除する
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Confirm AlertDialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>予約ペナルティを解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              解除後、会員はすぐにレッスン予約が可能になります。解除記録は変更履歴に残り、会員へ通知が送信されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction disabled={mutation.isPending} onClick={handleConfirm}>
              解除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
