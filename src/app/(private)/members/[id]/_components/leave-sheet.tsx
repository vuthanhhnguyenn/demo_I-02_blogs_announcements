'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { formatDateYYYYMM, formatISODateLocal } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useSingleFlight } from '@/hooks/use-single-flight';

import { MonthPicker } from '@/components/common/month-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  adminMemberContractOpsControllerCreateSuspensionMutation,
  adminMemberContractOpsControllerMainContractOptions,
  adminMemberContractOpsControllerPreviewSuspensionPointRefundOptions,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminMemberFinancialControllerPointsQueryKey,
  adminSuspensionWithdrawalControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ActiveFeeAdjustmentDto } from '@/lib/api-real/types.gen';

import {
  STATUS_CHANGE_REASON_MAX_LENGTH,
  proxyAgreedAtSchema,
} from '../_schemas/proxy-agreement.schema';
import { invalidateMemberContractReads } from '../_utils/member-cache.util';
import {
  PICKER_YEAR_MONTH_PATTERN,
  currentYearMonth,
  diffYearMonths,
  toApiMonthEnd,
  toApiYearMonth,
} from '../_utils/month-range';
import { type ProxyAgreementMethod, ProxyApplicationSection } from './proxy-application-section';
import { TargetMemberBlock } from './target-member-block';

const SUSPENSION_MAX_MONTHS = 12;

// ── Zod schema ────────────────────────────────────────────────────────────────
const leaveFormSchema = z
  .object({
    start_month: z.string().regex(PICKER_YEAR_MONTH_PATTERN, '休会開始月は必須です'),
    end_month: z.string().regex(PICKER_YEAR_MONTH_PATTERN, '休会終了月は必須です'),
    reason: z
      .string()
      .max(
        STATUS_CHANGE_REASON_MAX_LENGTH,
        `理由は${STATUS_CHANGE_REASON_MAX_LENGTH}文字以内で入力してください`,
      )
      .optional(),
    // FR-S001: refund of the point uses the window voids; a refund reason is required when refunding
    return_points: z.boolean(),
    return_reason: z
      .string()
      .max(
        STATUS_CHANGE_REASON_MAX_LENGTH,
        `返還事由は${STATUS_CHANGE_REASON_MAX_LENGTH}文字以内で入力してください`,
      )
      .optional(),
    // A-01 FR-017: an application filed from the CRM counter is a proxy filing by definition —
    // `CreateSuspensionApplicationDto.applicationSource` only takes `mobile_app` | `proxy`, and
    // the staff are not the member. Both halves are required because `ApplicationProxyDto`
    // requires both; sending one alone is a 422.
    proxy_agreed_at: proxyAgreedAtSchema,
    proxy_method: z.string().min(1, '合意方法は必須です'),
  })
  // BR-SUS-001 at month granularity. Months are inclusive, so start === end is a valid
  // one-month suspension and the span counts the start month itself.
  .refine(
    (data) => !data.start_month || diffYearMonths(data.start_month, currentYearMonth()) >= 0,
    { message: '休会開始月は今月以降を指定してください', path: ['start_month'] },
  )
  .refine((data) => !data.start_month || !data.end_month || data.end_month >= data.start_month, {
    message: '休会終了月は開始月以降を指定してください',
    path: ['end_month'],
  })
  .refine(
    (data) =>
      !data.start_month ||
      !data.end_month ||
      diffYearMonths(data.end_month, data.start_month) + 1 <= SUSPENSION_MAX_MONTHS,
    { message: `休会期間は最長${SUSPENSION_MAX_MONTHS}ヶ月です`, path: ['end_month'] },
  )
  .refine((data) => !data.return_points || !!data.return_reason?.trim(), {
    message: '返還事由は必須です',
    path: ['return_reason'],
  });

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

const DEFAULT_VALUES: LeaveFormValues = {
  start_month: '',
  end_month: '',
  reason: '',
  return_points: false,
  return_reason: '',
  proxy_agreed_at: '',
  proxy_method: '',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface LeaveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  memberNumber: string;
  hasUnpaidFee: boolean;
  /** Active individual fee adjustment (FR-S001: shown in the discount confirmation on suspension) */
  activeFeeAdjustment?: ActiveFeeAdjustment | null;
  /** Switches the screen to the 変更履歴 tab — target of the success toast's 「履歴を見る」 action. */
  onShowHistory: () => void;
}

type ActiveFeeAdjustment = ActiveFeeAdjustmentDto;

/** The month window the form would file, or null while the picked months fail the schema rules. */
function toSuspensionWindow(startMonth: string, endMonth: string) {
  if (!PICKER_YEAR_MONTH_PATTERN.test(startMonth) || !PICKER_YEAR_MONTH_PATTERN.test(endMonth)) {
    return null;
  }
  const span = diffYearMonths(endMonth, startMonth) + 1;
  if (diffYearMonths(startMonth, currentYearMonth()) < 0 || span < 1) return null;
  if (span > SUSPENSION_MAX_MONTHS) return null;
  // MonthPicker gives `YYYY/MM`; the real API takes full dates. The end month is inclusive
  // (prototype: 「開始月 〜 終了月 の期間、月額料金が休止されます」), so the window runs to its
  // last day — which also keeps a one-month recess's `endDate` after its `startDate`.
  // The API rejects a `startDate` before today (BR-SUS-001), so the current month starts today.
  const startDate =
    startMonth === currentYearMonth()
      ? formatISODateLocal(new Date())
      : `${toApiYearMonth(startMonth)}-01`;
  return { startDate, endDate: toApiMonthEnd(endMonth) };
}

// ── LeaveSheet ────────────────────────────────────────────────────────────────
export function LeaveSheet({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberNumber,
  hasUnpaidFee,
  activeFeeAdjustment,
  onShowHistory,
}: Readonly<LeaveSheetProps>) {
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  // The discount confirmation states the regular monthly fee next to the adjusted one; both are
  // tax-inclusive (API-087 v0.14).
  const { data: mainContractResponse } = useQuery({
    ...adminMemberContractOpsControllerMainContractOptions({ path: { memberId } }),
    enabled: open && !!activeFeeAdjustment,
  });
  const regularPlan = mainContractResponse?.mainContract?.plan;
  const regularMonthlyFee = regularPlan?.monthlyFee ?? null;
  const feeAdjustmentNote = [
    regularMonthlyFee == null ? null : `通常 ${formatYen(regularMonthlyFee)}`,
    activeFeeAdjustment?.reason,
  ]
    .filter(Boolean)
    .join('・');

  // FR-014: 申請 operations must be confirmed before they are sent
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    mode: 'onSubmit',
    defaultValues: DEFAULT_VALUES,
  });

  const startMonth = useWatch({ control: form.control, name: 'start_month' });
  const endMonth = useWatch({ control: form.control, name: 'end_month' });
  const returnPoints = useWatch({ control: form.control, name: 'return_points' });
  const proxyAgreedAt = useWatch({ control: form.control, name: 'proxy_agreed_at' });
  const proxyMethod = useWatch({ control: form.control, name: 'proxy_method' });

  // FR-S001: the point uses booked against the months this window turns into recess-fee months.
  // The server lists them and decides whether the caller may refund them (Manager or above).
  const suspensionWindow = toSuspensionWindow(startMonth, endMonth);
  const { data: pointRefundPreview } = useQuery({
    ...adminMemberContractOpsControllerPreviewSuspensionPointRefundOptions({
      path: { memberId },
      query: suspensionWindow ?? { startDate: '', endDate: '' },
    }),
    enabled: open && !!suspensionWindow,
  });
  const pointUses = suspensionWindow ? (pointRefundPreview?.pointUses ?? []) : [];
  const refundablePoints = pointUses.length > 0 ? (pointRefundPreview?.totalPoints ?? 0) : 0;
  const canRefund = pointRefundPreview?.canRefund ?? false;

  // The refund choice belongs to the window it was made for; another window lists other uses.
  const resetPointRefund = () => {
    form.setValue('return_points', false);
    form.clearErrors('return_reason');
  };

  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminMemberContractOpsControllerCreateSuspensionMutation(),
    onSettled: release,
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
    },
    onSuccess: (response) => {
      toast.success('休会申請を受け付けました', {
        action: { label: '履歴を見る', onClick: onShowHistory },
      });
      // `partial` / `failed`: the suspension is filed but some refunds did not go through — each
      // one can still be refunded once from the ポイント tab.
      const refundStatus = response.pointRefund?.status;
      if (refundStatus === 'partial' || refundStatus === 'failed') {
        toast.warning('ポイント値引き分の返還に失敗したものがあります', {
          description: 'ポイントタブから返還してください',
        });
      }
      if (response.pointRefund && response.pointRefund.refundedPoints > 0) {
        void queryClient.invalidateQueries({
          queryKey: adminMemberFinancialControllerPointsQueryKey({ path: { memberId } }),
        });
      }
      queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      queryClient.invalidateQueries({
        queryKey: adminSuspensionWithdrawalControllerListQueryKey(),
      });
      void invalidateMemberContractReads(queryClient, memberId);
      handleClose();
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset(DEFAULT_VALUES);
    }, 300);
  };

  // Validate first, then ask for confirmation; the mutation only runs from the dialog.
  const submitForm = form.handleSubmit(() => {
    setShowConfirm(true);
  }, scrollToFirstError);
  const handleSubmit = (event?: React.BaseSyntheticEvent) => {
    // A refetched preview can drop the uses after the box was ticked; the hidden reason field
    // must not block the filing then.
    if (pointUses.length === 0 || !canRefund) resetPointRefund();
    return submitForm(event);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    if (!acquire()) return;
    const data = form.getValues();
    const suspension = toSuspensionWindow(data.start_month, data.end_month);
    if (!suspension) return;
    const refundReason = data.return_reason?.trim();
    mutation.mutate({
      path: { memberId },
      body: {
        ...suspension,
        // `getValues()` is the raw input, not the schema's trimmed output
        memo: data.reason?.trim() || undefined,
        pointRefund:
          data.return_points && canRefund && refundablePoints > 0 && refundReason
            ? { reason: refundReason }
            : undefined,
        applicationSource: 'proxy',
        proxy: {
          agreementAt: data.proxy_agreed_at,
          agreementMethod: data.proxy_method as ProxyAgreementMethod,
        },
      },
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          {/* Header */}
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <PauseCircle className="size-4" />
                休会申請
              </SheetTitle>
              <SheetDescription className="sr-only">休会申請フォーム</SheetDescription>
            </SheetHeader>
          </div>

          {/* Body */}
          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6">
                <TargetMemberBlock name={memberName} memberNumber={memberNumber} />

                {/* Unpaid fee warning */}
                {hasUnpaidFee && (
                  <div className="pt-4">
                    <Alert className="border-destructive/30 bg-destructive/10">
                      <AlertDescription className="text-destructive text-xs">
                        未納金が発生しています。休会申請前に未納金の解消が必要です。
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Proxy section */}
                <div className="py-4">
                  <ProxyApplicationSection
                    alwaysProxy
                    agreedAt={proxyAgreedAt ? new Date(proxyAgreedAt) : undefined}
                    onAgreedAtChange={(date) => {
                      form.setValue('proxy_agreed_at', date ? date.toISOString() : '');
                      if (date) form.clearErrors('proxy_agreed_at');
                    }}
                    method={(proxyMethod ?? '') as ProxyAgreementMethod | ''}
                    onMethodChange={(v) => {
                      form.setValue('proxy_method', v);
                      if (v) form.clearErrors('proxy_method');
                    }}
                    agreedAtError={form.formState.errors.proxy_agreed_at?.message}
                    methodError={form.formState.errors.proxy_method?.message}
                  />
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                {/* Month fields */}
                <div className="flex flex-col gap-4 py-4">
                  <FormField
                    control={form.control}
                    name="start_month"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          休会開始月 <span className="text-destructive ml-1 text-xs">*</span>
                        </FormLabel>
                        <MonthPicker
                          value={field.value}
                          min={formatDateYYYYMM(new Date())}
                          onChange={(v) => {
                            field.onChange(v);
                            resetPointRefund();
                          }}
                          hasError={!!fieldState.error}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_month"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          休会終了月 <span className="text-destructive ml-1 text-xs">*</span>
                        </FormLabel>
                        <MonthPicker
                          value={field.value}
                          min={startMonth || undefined}
                          onChange={(v) => {
                            field.onChange(v);
                            resetPointRefund();
                          }}
                          hasError={!!fieldState.error}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {startMonth && endMonth && !form.formState.errors.end_month && (
                    <Alert className="border-info/20 bg-info/10">
                      <AlertDescription className="text-info text-xs">
                        {startMonth} 〜 {endMonth} の期間、月額料金が休止されます。
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* FR-S001: active discount confirmation + point refund (Manager+) */}
                {(activeFeeAdjustment || pointUses.length > 0) && (
                  <>
                    <Separator className="-mx-6 w-[calc(100%+48px)]" />
                    <div className="flex flex-col gap-3 py-4">
                      <p className="text-sm font-medium">適用中の値引き確認</p>
                      <Alert className="border-warning/20 bg-warning/15">
                        <AlertDescription className="text-warning flex flex-col gap-2 text-xs">
                          <span>この会員には現在、以下の値引きが適用されています:</span>
                          <ul className="list-inside list-disc space-y-1">
                            {activeFeeAdjustment && (
                              <li>
                                個別会費調整: 月額 {formatYen(activeFeeAdjustment.adjustedAmount)}
                                {feeAdjustmentNote ? `（${feeAdjustmentNote}）` : ''}
                              </li>
                            )}
                            {pointUses.map((use) => (
                              <li key={use.transactionId}>
                                ポイント値引き: {use.targetMonth.replace('-', '/')}
                                {use.lineName ? ` ${use.lineName}` : ''}{' '}
                                {use.points.toLocaleString()}pt（{formatYen(use.points)}相当）
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                      {pointUses.length > 0 && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger render={<span className="block" />}>
                                <div
                                  className={`flex items-start gap-2 rounded-md border px-4 py-3 ${
                                    !canRefund ? 'opacity-50' : ''
                                  }`}
                                >
                                  <Checkbox
                                    id="leave-point-return"
                                    checked={returnPoints}
                                    disabled={!canRefund}
                                    onCheckedChange={(v) => {
                                      if (!canRefund) return;
                                      form.setValue('return_points', v === true);
                                      form.clearErrors('return_reason');
                                    }}
                                  />
                                  <Label
                                    htmlFor="leave-point-return"
                                    className={`text-sm leading-snug ${
                                      canRefund ? 'cursor-pointer' : 'cursor-not-allowed'
                                    }`}
                                  >
                                    ポイント値引き分（{formatYen(refundablePoints)}相当）を返還する
                                  </Label>
                                </div>
                              </TooltipTrigger>
                              {!canRefund && (
                                <TooltipContent>
                                  <p className="text-xs">
                                    ポイント手動返還はManager以上の権限が必要です
                                  </p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          {returnPoints && canRefund && (
                            <FormField
                              control={form.control}
                              name="return_reason"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    返還事由{' '}
                                    <span className="text-destructive ml-1 text-xs">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      maxLength={STATUS_CHANGE_REASON_MAX_LENGTH}
                                      rows={2}
                                      placeholder="例：休会期間中のポイント値引き分を返還"
                                      className="resize-none text-sm"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  <p className="text-muted-foreground text-xs">
                                    返還予定額: {refundablePoints.toLocaleString()}pt（
                                    {formatYen(refundablePoints)}相当）
                                  </p>
                                </FormItem>
                              )}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                {/* Reason */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-2 py-4">
                      <FormLabel className="text-sm font-medium">
                        休会理由 <span className="text-muted-foreground ml-1 text-xs">任意</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          maxLength={STATUS_CHANGE_REASON_MAX_LENGTH}
                          rows={3}
                          placeholder="例：産前産後のため"
                          className="resize-none text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Footer */}
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
                  className="flex-1"
                  disabled={hasUnpaidFee || mutation.isPending}
                >
                  休会申請を送信
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
            <AlertDialogTitle>休会申請を送信しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {startMonth} 〜 {endMonth} の期間、月額料金が休止されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirm(false);
              }}
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>送信する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
