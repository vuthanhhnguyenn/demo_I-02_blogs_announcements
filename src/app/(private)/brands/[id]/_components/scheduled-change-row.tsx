import { type ComponentProps, useState } from 'react';
import { type UseFormReturn, useWatch } from 'react-hook-form';

import { format } from 'date-fns';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import {
  type BrandFeeGroupFormValues,
  REQUIRED_DATE_MESSAGE,
} from '../_schemas/brand-fee-group-form.schema';
import {
  formatFeeValueInput,
  isPastDate,
  parseDateValue,
} from '../_utils/brand-fee-group-form.util';

/**
 * `DatePicker` takes no `id` / `aria-*` props, so the ids `FormControl` hands it are dropped and the
 * `FormLabel` names nothing. This groups the trigger under the field's label — and its error — for
 * assistive tech instead (BUG-021-U4-01).
 */
export function FeeDateControl({
  label,
  ...props
}: ComponentProps<typeof DatePicker> & { label: string }) {
  const { error, formItemId, formMessageId } = useFormField();

  return (
    <div
      id={formItemId}
      role="group"
      aria-label={label}
      aria-describedby={error ? formMessageId : undefined}
    >
      <DatePicker {...props} />
    </div>
  );
}

export function ScheduledChangeRow({
  form,
  itemIndex,
  revisionIndex,
  onChange,
  onRemove,
}: {
  form: UseFormReturn<BrandFeeGroupFormValues>;
  itemIndex: number;
  revisionIndex: number;
  /** Re-validates the form once a save has been attempted. */
  onChange: () => void;
  onRemove: () => void;
}) {
  const dateValue =
    useWatch({
      control: form.control,
      name: `feeItems.${itemIndex}.scheduledChanges.${revisionIndex}.effectiveStartDate`,
    }) ?? '';
  const siblingChanges =
    useWatch({ control: form.control, name: `feeItems.${itemIndex}.scheduledChanges` }) ?? [];

  // G-05 FR-002: warn about a past date only when the operator changed it to one — opening the
  // sheet on a stored value never warns. A new row opens empty, so any past date it gets warns.
  const [initialDate] = useState(dateValue);
  const isPast = dateValue !== initialDate && isPastDate(dateValue);

  // Shown live, as in the prototype, before any save attempt; the schema blocks it on save too.
  const isDuplicate =
    dateValue !== '' &&
    siblingChanges.some(
      (change, index) => index !== revisionIndex && change.effectiveStartDate === dateValue,
    );

  return (
    <div className="bg-muted/30 flex flex-col gap-2 rounded-lg border p-3 pr-1">
      <div className="flex items-start gap-1">
        <div className="flex flex-1 flex-col gap-2">
          <div className="grid gap-2.5 md:grid-cols-2">
            <FormField
              control={form.control}
              name={`feeItems.${itemIndex}.scheduledChanges.${revisionIndex}.effectiveStartDate`}
              render={({ field: dateField, fieldState }) => (
                <FormItem className="content-start">
                  <FormLabel className="text-xs font-medium text-slate-600">
                    有効開始日
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FeeDateControl
                    label="有効開始日"
                    date={parseDateValue(dateField.value)}
                    onDateChange={(date) => {
                      dateField.onChange(date ? format(date, 'yyyy/MM/dd') : '');
                      onChange();
                    }}
                    placeholder="日付を選択"
                    hasError={fieldState.invalid || isDuplicate}
                  />
                  {/* Only "required" belongs under the field; date conflicts get the alert below. */}
                  {fieldState.error?.message === REQUIRED_DATE_MESSAGE && (
                    <FormMessage className="text-xs leading-4" />
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`feeItems.${itemIndex}.scheduledChanges.${revisionIndex}.valueIncludingTaxYen`}
              render={({ field: priceField, fieldState }) => (
                <FormItem className="content-start">
                  <FormLabel className="text-xs font-medium text-slate-600">
                    定価（税込）
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  {/* FormControl wraps the input itself so FormLabel's `for` names it (BUG-021-U4-01). */}
                  <div className="relative">
                    <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-xs">
                      ¥
                    </span>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        className="pl-7"
                        placeholder="例: 11000"
                        aria-invalid={fieldState.invalid || undefined}
                        value={formatFeeValueInput(priceField.value)}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          if (nextValue === '' || nextValue === '-') {
                            priceField.onChange(Number.NaN);
                            onChange();
                            return;
                          }
                          if (!/^-?\d+(\.\d+)?$/.test(nextValue)) return;
                          priceField.onChange(Number(nextValue));
                          onChange();
                        }}
                      />
                    </FormControl>
                  </div>
                  {fieldState.error ? <FormMessage className="text-xs leading-4" /> : null}
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={`feeItems.${itemIndex}.scheduledChanges.${revisionIndex}.effectiveStartDate`}
            render={({ fieldState }) => {
              const conflictMessage = isDuplicate
                ? '有効開始日が重複しています。別の日付を指定してください。'
                : fieldState.error?.message !== REQUIRED_DATE_MESSAGE
                  ? fieldState.error?.message
                  : undefined;

              if (conflictMessage) {
                return (
                  <Alert className="border-destructive/50 bg-destructive/10 py-2">
                    <AlertTriangle className="text-destructive mt-0.5 size-3.5" />
                    <AlertDescription className="text-destructive text-xs leading-5">
                      {conflictMessage}
                    </AlertDescription>
                  </Alert>
                );
              }

              if (isPast) {
                return (
                  <Alert className="border-orange-200 bg-orange-50 px-3 py-2 text-orange-800">
                    <AlertTriangle className="mt-0.5 size-3.5" />
                    <AlertDescription className="text-xs leading-5 text-orange-800">
                      過去の日付が指定されています。登録は可能ですが、即座に適用が開始されます。
                    </AlertDescription>
                  </Alert>
                );
              }

              return <span />;
            }}
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="改定を削除"
          className="text-muted-foreground hover:text-destructive mt-5 size-8"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
