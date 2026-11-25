'use client';

import { useMemo, useState } from 'react';
import { type DefaultValues, useForm, useWatch } from 'react-hook-form';

import { formatDate } from '@/utils/format.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parse, startOfToday } from 'date-fns';
import { AlertTriangle, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useSingleFlight } from '@/hooks/use-single-flight';

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
import { DatePicker } from '@/components/ui/date-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import {
  adminMemberContractOpsControllerCreateWithdrawalMutation,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminSuspensionWithdrawalControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { STATUS_CHANGE_REASON_MAX_LENGTH } from '../_schemas/proxy-agreement.schema';
import {
  WITHDRAWAL_MIN_LEAD_DAYS,
  type WithdrawFormValues,
  withdrawFormSchema,
} from '../_schemas/withdraw-form.schema';
import { invalidateMemberContractReads } from '../_utils/member-cache.util';
import { type ProxyAgreementMethod, ProxyApplicationSection } from './proxy-application-section';
import { TargetMemberBlock } from './target-member-block';

const DEFAULT_VALUES: DefaultValues<WithdrawFormValues> = {
  scheduled_date: '',
  reason: '',
  proxy_agreed_at: '',
  proxy_method: '',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface WithdrawSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  /** Display name of the member — rendered verbatim in the confirmation dialog */
  memberName: string;
  memberNumber: string;
  /** Contract usage start date, shown in the pre-start guidance. */
  usageStartDate?: string | null;
  /**
   * A-01 FR-005 (v6): before the usage start date a member is not withdrawn but has the
   * enrollment itself cancelled (FR-026), so the sheet refuses to file and points there.
   */
  isBeforeUsageStart: boolean;
  /** Opens the 入会取り消し dialog in place of this sheet. */
  onOpenEnrollmentCancel: () => void;
  /** Switches the screen to the 変更履歴 tab — target of the success toast's 「履歴を見る」 action. */
  onShowHistory: () => void;
}

// ── WithdrawSheet ─────────────────────────────────────────────────────────────
export function WithdrawSheet({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberNumber,
  usageStartDate,
  isBeforeUsageStart,
  onOpenEnrollmentCancel,
  onShowHistory,
}: Readonly<WithdrawSheetProps>) {
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  // FR-014: 申請 operations must be confirmed before they are sent
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // RHF is the single source of truth; useWatch drives the conditional UI
  const scheduledDate = useWatch({ control: form.control, name: 'scheduled_date' });
  const proxyAgreedAt = useWatch({ control: form.control, name: 'proxy_agreed_at' });
  const proxyMethod = useWatch({ control: form.control, name: 'proxy_method' });

  const scheduledDateObj = useMemo(
    () => (scheduledDate ? parse(scheduledDate, 'yyyy-MM-dd', new Date()) : undefined),
    [scheduledDate],
  );
  const proxyAgreedAtDate = useMemo(
    () => (proxyAgreedAt ? new Date(proxyAgreedAt) : undefined),
    [proxyAgreedAt],
  );

  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminMemberContractOpsControllerCreateWithdrawalMutation(),
    onSettled: release,
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
    },
    onSuccess: () => {
      toast.success('退会申請を受け付けました', {
        action: { label: '履歴を見る', onClick: onShowHistory },
      });
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
  const handleSubmit = form.handleSubmit(() => {
    setShowConfirm(true);
  }, scrollToFirstError);

  const handleConfirm = () => {
    setShowConfirm(false);
    if (!acquire()) return;
    const data = form.getValues();
    mutation.mutate({
      path: { memberId },
      body: {
        scheduledWithdrawalDate: data.scheduled_date,
        reasonCode: 'normal',
        // `getValues()` is the raw input, not the schema's trimmed output
        memo: data.reason.trim(),
        applicationSource: 'proxy',
        proxy: {
          agreementAt: data.proxy_agreed_at,
          agreementMethod: data.proxy_method as ProxyAgreementMethod,
        },
      },
    });
  };

  const handleProxyAgreedAtChange = (date: Date | undefined) => {
    form.setValue('proxy_agreed_at', date ? date.toISOString() : '', {
      shouldValidate: true,
    });
  };

  const handleProxyMethodChange = (v: string) => {
    form.setValue('proxy_method', v);
    if (v) form.clearErrors('proxy_method');
  };

  const scheduledDateFormatted = scheduledDateObj
    ? format(scheduledDateObj, 'yyyy/MM/dd')
    : undefined;

  const handleOpenEnrollmentCancel = () => {
    handleClose();
    onOpenEnrollmentCancel();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          {/* Header */}
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <LogOut className="size-4" />
                退会申請
              </SheetTitle>
              <SheetDescription className="sr-only">退会申請フォーム</SheetDescription>
            </SheetHeader>
          </div>

          {/* Body */}
          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6">
                <TargetMemberBlock name={memberName} memberNumber={memberNumber} />

                {isBeforeUsageStart && (
                  <Alert className="border-warning/50 bg-warning/15 mt-4">
                    <AlertTriangle className="text-warning size-4" />
                    <AlertDescription className="flex flex-col items-start gap-2 text-xs">
                      <span>
                        利用開始日（{formatDate(usageStartDate)}
                        ）前の会員です。退会申請ではなく「入会取り消し」で処理してください。
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleOpenEnrollmentCancel}
                      >
                        入会取り消しへ
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Proxy section */}
                <div className="py-4">
                  <ProxyApplicationSection
                    alwaysProxy
                    agreedAt={proxyAgreedAtDate}
                    onAgreedAtChange={handleProxyAgreedAtChange}
                    method={(proxyMethod ?? '') as ProxyAgreementMethod | ''}
                    onMethodChange={handleProxyMethodChange}
                    agreedAtError={form.formState.errors.proxy_agreed_at?.message}
                    methodError={form.formState.errors.proxy_method?.message}
                  />
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                {/* Main fields */}
                <div className="flex flex-col gap-4 py-4">
                  {/* Scheduled date */}
                  <FormField
                    control={form.control}
                    name="scheduled_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          退会予定日 <span className="text-destructive ml-1 text-xs">*</span>
                        </FormLabel>
                        <FormControl>
                          <DatePicker
                            date={scheduledDateObj}
                            placeholder="日付を選択"
                            hasError={!!form.formState.errors.scheduled_date}
                            // BR-WDR-001: only dates the schema accepts (7 days' notice) are offered
                            disabledDate={{
                              before: addDays(startOfToday(), WITHDRAWAL_MIN_LEAD_DAYS),
                            }}
                            onDateChange={(date) => {
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            }}
                          />
                        </FormControl>
                        {scheduledDateFormatted && (
                          <Alert className="border-info/20 bg-info/10 mt-1">
                            <AlertDescription className="text-info text-xs">
                              {scheduledDateFormatted} 付で退会処理されます。
                            </AlertDescription>
                          </Alert>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Reason — FR-014: a single free-text field, matching the prototype */}
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          退会理由 <span className="text-destructive ml-1 text-xs">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            id="retire-reason"
                            rows={3}
                            maxLength={STATUS_CHANGE_REASON_MAX_LENGTH}
                            placeholder="例：転居のため"
                            className="resize-none text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />
                <div className="py-2" />
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
                  disabled={mutation.isPending || isBeforeUsageStart}
                >
                  退会申請を送信
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
            <AlertDialogTitle>退会申請を確定しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {memberName} さんの退会予定が登録されます。この操作は取り消しに別途手続きが必要です。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirm(false);
              }}
            >
              戻る
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirm}
            >
              確定する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
