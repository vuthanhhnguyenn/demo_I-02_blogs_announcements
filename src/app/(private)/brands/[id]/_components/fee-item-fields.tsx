import { useState } from 'react';
import { type UseFormReturn, useFieldArray, useWatch } from 'react-hook-form';

import { formatYen } from '@/utils/format.util';
import { format } from 'date-fns';
import { AlertTriangle, Plus } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

import { MAX_SCHEDULED_CHANGES } from '../../_constants/brand-real.constants';
import { type BrandFeeGroupFormValues } from '../_schemas/brand-fee-group-form.schema';
import type { BrandFeeSheetMode } from '../_types/brand-fee.type';
import {
  formatFeeValueInput,
  isPastDate,
  parseDateValue,
} from '../_utils/brand-fee-group-form.util';
import { FeeDateControl, ScheduledChangeRow } from './scheduled-change-row';

export function FeeItemFields({
  form,
  index,
  itemLabel,
  mode,
  onChange,
}: {
  form: UseFormReturn<BrandFeeGroupFormValues>;
  index: number;
  itemLabel: string;
  mode: BrandFeeSheetMode;
  /** Re-validates the form once a save has been attempted. */
  onChange: () => void;
}) {
  const {
    fields: revisionFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: `feeItems.${index}.scheduledChanges`,
  });

  const dateValue =
    useWatch({ control: form.control, name: `feeItems.${index}.effectiveStartDate` }) ?? '';
  const priceValue = useWatch({
    control: form.control,
    name: `feeItems.${index}.currentValueIncludingTaxYen`,
  });
  const itemName = useWatch({ control: form.control, name: `feeItems.${index}.itemName` }) ?? '';
  const previewAmount =
    typeof priceValue === 'number' && !Number.isNaN(priceValue) ? priceValue : 0;

  // G-05 FR-002: opening the sheet on the price in force never warns — only changing the date to a
  // past one does. The sheet remounts these fields on every open, so this is the opened value.
  const [initialDate] = useState(dateValue);
  const isPastCurrent = dateValue !== initialDate && isPastDate(dateValue);

  // 登録 carries no 予約 (`RegisterBrandFeeMasterDto` has none); they are added later via 変更.
  const showRevisions = mode === 'edit';
  const isAtRevisionLimit = revisionFields.length >= MAX_SCHEDULED_CHANGES;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{itemLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/*
            R307 — 費用項目名 is fixed per brand (Y-07 FR-002 / G-05 FR-001) and `feeType` is a
            closed enum, so the prototype renders it as text rather than an input.
          */}
          <div>
            <p className="text-muted-foreground mb-1 text-xs">費用項目名</p>
            <p className="text-sm font-medium wrap-break-word">{itemName}</p>
          </div>

          <div>
            {/* 登録 has nothing in force yet, so the card title doubles as the heading. */}
            {showRevisions && <p className="text-foreground mb-3 text-xs font-medium">現行設定</p>}

            <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
              <div className="grid gap-2.5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`feeItems.${index}.effectiveStartDate`}
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
                          // Cross-field: compared against every 予約 date in the schema.
                          onChange();
                        }}
                        placeholder="日付を選択"
                        hasError={fieldState.invalid}
                      />
                      {fieldState.error ? <FormMessage className="text-xs leading-4" /> : null}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`feeItems.${index}.currentValueIncludingTaxYen`}
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

              {isPastCurrent && (
                <Alert className="border-orange-200 bg-orange-50 px-3 py-2 text-orange-800">
                  <AlertTriangle className="mt-0.5 size-3.5" />
                  <AlertDescription className="text-xs leading-5 text-orange-800">
                    過去の日付が指定されています。登録は可能ですが、即座に適用が開始されます。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {showRevisions && revisionFields.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <p className="text-foreground shrink-0 text-xs font-medium whitespace-nowrap">
                  予約中の改定
                </p>
                <Badge variant="secondary" className="px-1 text-[10px]">
                  {revisionFields.length}件
                </Badge>
                <p className="text-muted-foreground text-xs">（有効開始日当日に自動切替）</p>
              </div>

              <div className="flex flex-col gap-2">
                {revisionFields.map((field, revisionIndex) => (
                  <ScheduledChangeRow
                    key={field.id}
                    form={form}
                    itemIndex={index}
                    revisionIndex={revisionIndex}
                    onChange={onChange}
                    onRemove={() => {
                      remove(revisionIndex);
                      onChange();
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {showRevisions && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={isAtRevisionLimit}
                onClick={() => {
                  append({ effectiveStartDate: '', valueIncludingTaxYen: Number.NaN });
                  onChange();
                }}
              >
                <Plus className="size-3" />
                改定スケジュールを追加
              </Button>
              <p className="text-muted-foreground mt-1 text-xs">
                {isAtRevisionLimit
                  ? `改定スケジュールは${MAX_SCHEDULED_CHANGES}件まで登録できます。`
                  : '将来日付を指定して改定を事前登録できます。'}
              </p>
            </div>
          )}

          <Separator />

          <div className="bg-muted/40 rounded-md border p-3">
            <p className="text-muted-foreground mb-1 text-xs">プレビュー（会員向け表示）</p>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-semibold">{formatYen(previewAmount)}</span>
              <span className="text-muted-foreground text-xs">（税込）</span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs wrap-break-word">{itemName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
