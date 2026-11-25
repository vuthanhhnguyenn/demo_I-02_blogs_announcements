'use client';

import { type DefaultValues, useForm, useWatch } from 'react-hook-form';

import { formatDateYYYYMM } from '@/utils/date.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useSingleFlight } from '@/hooks/use-single-flight';

import { MonthPicker } from '@/components/common/month-picker';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
  adminMemberContractOpsControllerCreateFeeAdjustmentMutation,
  adminMemberContractOpsControllerListFeeAdjustmentsQueryKey,
  adminMemberControllerDetailQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { STATUS_CHANGE_REASON_MAX_LENGTH } from '../../../_schemas/proxy-agreement.schema';
import {
  PICKER_YEAR_MONTH_PATTERN,
  toApiMonthEnd,
  toApiYearMonth,
} from '../../../_utils/month-range';

// ── Zod schema ──────────────────────────────────────────────────────────────
const ADJUSTED_AMOUNT_MIN = 0;
const ADJUSTED_AMOUNT_MAX = 1_000_000;

// Full-width digits are folded to half-width (NFKC); nothing else is changed.
const foldWidth = (value: string) => value.normalize('NFKC');
const DIGITS_ONLY = /^\d*$/;

// Keystrokes (incl. IME commits) that would add a non-digit are dropped, so a typo never lands in
// the field. Paste / drop / autofill are NOT sanitised: removing characters from a pasted string
// can silently change the amount (`1200.0` → `12000`), so the pasted text is kept as-is and the
// field is validated at once to show the error. While the field holds such an invalid value,
// typing edits it as-is too — stripping the whole value then would be the same silent rewrite.
const TYPED_INPUT_TYPES = new Set(['insertText', 'insertCompositionText']);

const toAmountInput = (raw: string, previous: string, inputType: string) => {
  const folded = foldWidth(raw);
  if (TYPED_INPUT_TYPES.has(inputType) && DIGITS_ONLY.test(previous)) {
    return folded.replace(/\D/g, '');
  }
  return folded;
};

// A-01 FR-006: period (start/end month), the resulting monthly fee and the adjustment reason are
// all required (audit trail). `adjusted_amount` is the fee AFTER the adjustment, tax-included —
// the same figure `CreateFeeAdjustmentDto.adjustedAmount` stores.
const feeAdjustmentFormSchema = z
  .object({
    start_month: z.string().regex(PICKER_YEAR_MONTH_PATTERN, '開始月は必須です'),
    end_month: z.string().regex(PICKER_YEAR_MONTH_PATTERN, '終了月は必須です'),
    // An empty field is `undefined` (required message) while a typed 0 is a valid adjusted fee.
    // Bounds mirror `CreateFeeAdjustmentDto.adjustedAmount` (integer yen, 0–1,000,000). The value
    // is checked as entered — a pasted `1200.0`, `1,200` or `1e6` is rejected, never coerced.
    adjusted_amount: z.preprocess(
      (value) => (value === '' || value == null ? undefined : String(value).trim()),
      z
        .string({ error: '調整後金額を入力してください' })
        .superRefine((value, ctx) => {
          const amount = Number(value);
          if (!/^-?\d+$/.test(value)) {
            ctx.addIssue({ code: 'custom', message: '調整後金額は半角数字のみで入力してください' });
          } else if (amount < ADJUSTED_AMOUNT_MIN) {
            ctx.addIssue({
              code: 'custom',
              message: `調整後金額は${ADJUSTED_AMOUNT_MIN}以上で入力してください`,
            });
          } else if (amount > ADJUSTED_AMOUNT_MAX) {
            ctx.addIssue({
              code: 'custom',
              message: `調整後金額は${ADJUSTED_AMOUNT_MAX.toLocaleString()}以下で入力してください`,
            });
          }
        })
        .transform(Number),
    ),
    reason: z
      .string()
      .trim()
      .min(1, '事由は必須です')
      .max(
        STATUS_CHANGE_REASON_MAX_LENGTH,
        `事由は${STATUS_CHANGE_REASON_MAX_LENGTH}文字以内で入力してください`,
      ),
  })
  .refine((data) => !data.end_month || data.end_month >= data.start_month, {
    message: '終了月は開始月以降を指定してください',
    path: ['end_month'],
  });

type FeeAdjustmentFormInput = z.input<typeof feeAdjustmentFormSchema>;
type FeeAdjustmentFormValues = z.output<typeof feeAdjustmentFormSchema>;

// `adjusted_amount` intentionally starts empty: it is required, so the user must type it.
// `DefaultValues<T>` is deep-partial, which lets us express that without casting.
const DEFAULT_VALUES: DefaultValues<FeeAdjustmentFormInput> = {
  start_month: '',
  end_month: '',
  adjusted_amount: undefined,
  reason: '',
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface FeeAdjustmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  /** 個別会費調整 is registered against a contract, not the member. */
  contractId?: string;
}

// ── FeeAdjustmentSheet ─────────────────────────────────────────────────────────
export function FeeAdjustmentSheet({
  open,
  onOpenChange,
  memberId,
  contractId,
}: Readonly<FeeAdjustmentSheetProps>) {
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  const form = useForm<FeeAdjustmentFormInput, unknown, FeeAdjustmentFormValues>({
    resolver: zodResolver(feeAdjustmentFormSchema),
    mode: 'onSubmit',
    defaultValues: DEFAULT_VALUES,
  });

  const startMonth = useWatch({ control: form.control, name: 'start_month' });

  const { acquire, release } = useSingleFlight();

  const mutation = useMutation({
    ...adminMemberContractOpsControllerCreateFeeAdjustmentMutation(),
    onSettled: release,
    onSuccess: async () => {
      toast.success('個別会費調整を追加しました');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminMemberContractOpsControllerListFeeAdjustmentsQueryKey({
            path: { memberId },
          }),
        }),
        // A-01 FR-006: the 「個別会費調整 適用中」 head-up badge is read from the member-detail
        // query, so it has to be refreshed too or it stays stale.
        queryClient.invalidateQueries({
          queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
        }),
      ]);
      handleClose();
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset(DEFAULT_VALUES);
    }, 300);
  };

  const handleSubmit = form.handleSubmit((data) => {
    // Without the contract there is nothing to attach the adjustment to.
    if (!contractId || !acquire()) return;
    mutation.mutate({
      path: { memberId },
      body: {
        contractId,
        // MonthPicker gives `YYYY/MM`; the real API takes full dates — and `periodTo` must be
        // the month's LAST day, not its first (server rejects `-01` with E-VAL-001).
        periodFrom: `${toApiYearMonth(data.start_month)}-01`,
        periodTo: toApiMonthEnd(data.end_month),
        adjustedAmount: data.adjusted_amount,
        reason: data.reason,
      },
    });
  }, scrollToFirstError);

  // Without a main contract there is no id to attach the adjustment to. Disable the action instead
  // of letting submit no-op silently.
  const canSubmit = !!contractId;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
        {/* Header */}
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Settings2 className="size-4" />
              個別会費調整を追加
            </SheetTitle>
            <SheetDescription className="sr-only">個別会費調整の追加フォーム</SheetDescription>
          </SheetHeader>
        </div>

        {/* Body */}
        <Form {...form}>
          <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6">
              {/* Period */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4">
                <FormField
                  control={form.control}
                  name="start_month"
                  render={({ field, fieldState }) => (
                    <FormItem className="min-w-0">
                      <FormLabel className="text-sm font-medium">
                        開始月 <span className="text-destructive ml-1 text-xs">*</span>
                      </FormLabel>
                      <MonthPicker
                        value={field.value}
                        min={formatDateYYYYMM(new Date())}
                        onChange={field.onChange}
                        hasError={!!fieldState.error}
                        className="w-full"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_month"
                  render={({ field, fieldState }) => (
                    <FormItem className="min-w-0">
                      <FormLabel className="text-sm font-medium">
                        終了月 <span className="text-destructive ml-1 text-xs">*</span>
                      </FormLabel>
                      <MonthPicker
                        value={field.value}
                        min={startMonth || undefined}
                        onChange={field.onChange}
                        hasError={!!fieldState.error}
                        className="w-full"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="-mx-6 w-[calc(100%+48px)]" />

              {/* Amount + reason */}
              <div className="flex flex-col gap-4 py-4">
                <FormField
                  control={form.control}
                  name="adjusted_amount"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        調整後金額（税込） <span className="text-destructive ml-1 text-xs">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          className="h-9 text-sm"
                          placeholder="例: 6930（円）"
                          {...field}
                          value={field.value == null ? '' : String(field.value)}
                          onChange={(event) => {
                            // Autofill may fire a plain `Event` with no `inputType`.
                            const inputType =
                              (event.nativeEvent as Partial<InputEvent>).inputType ?? '';
                            const previous = field.value == null ? '' : String(field.value);
                            field.onChange(toAmountInput(event.target.value, previous, inputType));
                            // A paste / drop / autofill (or editing a field already in error) is
                            // validated immediately so a wrong amount is flagged, not rewritten.
                            // Deleting stays on submit-time validation like every other field.
                            const inserted =
                              !TYPED_INPUT_TYPES.has(inputType) && !inputType.startsWith('delete');
                            if (inserted || fieldState.error) {
                              void form.trigger('adjusted_amount');
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        事由 <span className="text-destructive ml-1 text-xs">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="例：長期在籍優待割引"
                          maxLength={STATUS_CHANGE_REASON_MAX_LENGTH}
                          className="resize-none text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <Button type="submit" className="flex-1" disabled={mutation.isPending || !canSubmit}>
                追加する
              </Button>
            </div>
            {!canSubmit && (
              <p className="text-muted-foreground -mt-2 px-6 pb-4 text-xs">
                主契約がないため個別会費調整は登録できません。
              </p>
            )}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
