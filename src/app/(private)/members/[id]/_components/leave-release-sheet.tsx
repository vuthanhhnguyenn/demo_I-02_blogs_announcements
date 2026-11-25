'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { formatYen } from '@/utils/format.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useSingleFlight } from '@/hooks/use-single-flight';

import { MonthPicker } from '@/components/common/month-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminSuspensionWithdrawalControllerListQueryKey,
  adminSuspensionWithdrawalControllerReleaseMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ActiveSuspensionDto } from '@/lib/api-real/types.gen';

import { invalidateMemberContractReads } from '../_utils/member-cache.util';
import {
  PICKER_YEAR_MONTH_PATTERN,
  currentYearMonth,
  diffYearMonths,
  toApiYearMonth,
  toYearMonth,
} from '../_utils/month-range';

// ── Zod schema ────────────────────────────────────────────────────────────────
// Releasing only ever shortens the recess (`E-SUS-217` otherwise), so the resume month runs from
// the current month up to the month the recess is already scheduled to end.
function buildLeaveReleaseFormSchema(scheduledEndMonth: string | null) {
  return z.object({
    resume_month: z
      .string()
      .regex(PICKER_YEAR_MONTH_PATTERN, '復帰月は必須です')
      // Q3: a retroactive resume month is unsupported — it would require an invoice correction
      // in F-01.
      .refine((v) => diffYearMonths(v, currentYearMonth()) >= 0, {
        message: '復帰月は今月以降を指定してください',
      })
      .refine((v) => !scheduledEndMonth || diffYearMonths(v, scheduledEndMonth) <= 0, {
        message: '復帰月は予定終了月以前を指定してください',
      }),
  });
}

type LeaveReleaseFormValues = z.infer<ReturnType<typeof buildLeaveReleaseFormSchema>>;

// ── Props ─────────────────────────────────────────────────────────────────────
interface LeaveReleaseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  /**
   * The in-progress 休会 application. 解除 is keyed by the application, not the member, so the
   * page reads it from `currentMainContract.activeSuspension`.
   */
  activeSuspension?: ActiveSuspensionDto | null;
}

// ── LeaveReleaseSheet ─────────────────────────────────────────────────────────
export function LeaveReleaseSheet({
  open,
  onOpenChange,
  memberId,
  activeSuspension,
}: Readonly<LeaveReleaseSheetProps>) {
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  // The real API has no per-member 休会情報 endpoint; the member detail already carries the
  // in-progress application, so it is passed in rather than fetched again.
  const currentSuspension = activeSuspension ?? null;
  const scheduledEndMonth = toYearMonth(currentSuspension?.endDate);

  const leaveReleaseFormSchema = useMemo(
    () => buildLeaveReleaseFormSchema(scheduledEndMonth),
    [scheduledEndMonth],
  );

  const form = useForm<LeaveReleaseFormValues>({
    resolver: zodResolver(leaveReleaseFormSchema),
    mode: 'onSubmit',
    defaultValues: { resume_month: '' },
  });

  // `ActiveSuspensionDto.fee` is the 税込 snapshot taken when the application was filed.
  const suspensionFeeIncludingTax = currentSuspension?.fee ?? null;

  /**
   * `/release` only ends a recess that is already running — it answers `409 E-SUS-215` on one
   * that has not started. This sheet is reachable only from the 休会中 status, so the running
   * case is the only one it ever submits. Withdrawing an unstarted application is a separate
   * operation (`/cancel`) with no entry point on this screen — see the member-detail
   * integration report.
   */
  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminSuspensionWithdrawalControllerReleaseMutation(),
    onSettled: release,
    onSuccess: () => {
      toast.success('休会を解除しました');
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
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset({ resume_month: '' });
    }, 300);
  };

  // The sheet body scrolls, so `scrollToFirstError` brings the first invalid field into view
  const handleSubmit = form.handleSubmit((data) => {
    if (!currentSuspension || !acquire()) return;
    mutation.mutate({
      path: { suspensionApplicationId: currentSuspension.suspensionApplicationId },
      // The current month releases now; a later month schedules the return for the 1st of it.
      body: { resumeMonth: toApiYearMonth(data.resume_month) },
    });
  }, scrollToFirstError);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
        {/* Header */}
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <PlayCircle className="size-4" />
              休会解除
            </SheetTitle>
            <SheetDescription className="text-muted-foreground mt-1 text-xs">
              休会中の会員の休会を解除します
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Body */}
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6">
              {/* Current suspension info */}
              <div className="flex flex-col gap-4 py-4">
                <p className="text-muted-foreground text-xs font-medium">現在の休会情報</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">休会開始月</p>
                    {/* `startDate` / `endDate` are API days (`2026-08-10`); both labels say 月 and
                        the prototype shows `2026/04` — so render the month, not the day. */}
                    <p className="text-sm font-medium">
                      {toYearMonth(currentSuspension?.startDate) ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">予定終了月</p>
                    <p className="text-sm font-medium">
                      {toYearMonth(currentSuspension?.endDate) ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs">休会費用</p>
                    <p className="text-sm font-medium">
                      {suspensionFeeIncludingTax != null
                        ? `${formatYen(suspensionFeeIncludingTax)}/月`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="-mx-6 w-[calc(100%+48px)]" />

              {/* Resume month picker */}
              <FormField
                control={form.control}
                name="resume_month"
                render={({ field, fieldState }) => (
                  <FormItem className="flex flex-col gap-2 py-4">
                    <FormLabel htmlFor="leave-release-month" className="text-sm font-medium">
                      復帰月 <span className="text-destructive ml-1 text-xs">*</span>
                    </FormLabel>
                    <MonthPicker
                      value={field.value}
                      onChange={field.onChange}
                      // Same range as the schema: the current month up to the month the recess
                      // is scheduled to end.
                      min={currentYearMonth()}
                      isMonthEnabled={(year, month) =>
                        !scheduledEndMonth ||
                        diffYearMonths(
                          `${year}/${String(month).padStart(2, '0')}`,
                          scheduledEndMonth,
                        ) <= 0
                      }
                      placeholder="年月を選択"
                      hasError={!!fieldState.error}
                    />
                    <FormMessage />
                    <p className="text-muted-foreground text-xs">
                      選択した月の1日から課金が再開されます
                    </p>
                  </FormItem>
                )}
              />

              <Separator className="-mx-6 w-[calc(100%+48px)]" />

              {/* Info alert */}
              <div className="flex flex-col gap-4 py-4">
                {currentSuspension ? (
                  <Alert className="border-info/20 bg-info/10">
                    <AlertDescription className="text-info text-xs">
                      復帰後は通常月額の請求が再開されます
                    </AlertDescription>
                  </Alert>
                ) : (
                  /* The page already stops the menu item in this case; this is the second line of
                     defence for a sheet left open while `activeSuspension` disappears from the
                     refetched detail. Without an id there is no endpoint to call, so say so
                     rather than leaving the submit silently inert. */
                  <Alert variant="destructive" className="border-destructive/20">
                    <AlertDescription className="text-xs">
                      休会情報が取得できませんでした。休会解除は実行できません。
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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
                disabled={mutation.isPending || !currentSuspension}
              >
                休会解除する
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
