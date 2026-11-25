'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { AlertTriangle, RefreshCcw } from 'lucide-react';

import { BrandBadge } from '@/components/common/brand-badge';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { Permission } from '@/types/permission.type';

import {
  OPTION_DISCOUNT_TYPE_LABELS,
  OPTION_DISCOUNT_VALUE_PLACEHOLDERS,
  OPTION_DISCOUNT_VALUE_UNITS,
  OPTION_SET_APPLICATION_CONDITION_LABELS,
  type TargetOptionCandidate,
} from '../_constants/constants';
import type {
  OptionDiscountFormSubmitValues,
  OptionDiscountFormValues,
} from '../_schemas/option-discount-form.schema';

interface OptionDiscountFormProps {
  isEdit?: boolean;
  isSubmitting?: boolean;
  /** Candidates: active FIT365 option masters that are not locker contract types. */
  optionMasters: TargetOptionCandidate[];
  /** True while the candidates are still loading. */
  isOptionsLoading?: boolean;
  /** True when the candidates failed to load; `onRetryOptions` re-requests them. */
  isOptionsError?: boolean;
  onRetryOptions?: () => void;
  onCancel: () => void;
  onSubmit: (values: OptionDiscountFormSubmitValues) => void;
  onError?: () => void;
}

export function OptionDiscountForm({
  isEdit = false,
  isSubmitting = false,
  optionMasters,
  isOptionsLoading = false,
  isOptionsError = false,
  onRetryOptions,
  onCancel,
  onSubmit,
  onError,
}: Readonly<OptionDiscountFormProps>) {
  const form = useFormContext<OptionDiscountFormValues>();
  const discountType = useWatch({ control: form.control, name: 'discountType' });

  return (
    <div className="flex flex-col gap-6">
      {/* Edit only: a new set has no members yet (the prototype shows it in create mode too). */}
      {isEdit && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="text-warning size-4" />
          <AlertDescription className="text-muted-foreground text-xs">
            割引条件を変更すると、現在この割引が適用中の会員にも反映されます。
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-1 items-start gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    セット割名<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: デイタイム＋水素水セット" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea
                      maxLength={1000}
                      placeholder="セット割の説明を入力してください"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">対象商品</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-6">
            {/* G-02 前提条件 ブランド設定 (#353): set discounts are FIT365-only, so only FIT365 options are offered. */}
            <p className="text-muted-foreground text-xs">
              セット割は FIT365 限定のため、候補は FIT365 ブランドのオプションのみ表示しています。
            </p>

            <FormField
              control={form.control}
              name="optionIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    対象オプション<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3">
                      {/* Only a complete list is offered: a partial one (pages still loading,
                          or a page failed) would read as "these are all the candidates". */}
                      {isOptionsError ? (
                        <div className="col-span-full flex items-center gap-3">
                          <p className="text-destructive text-xs">
                            オプションデータの取得に失敗しました
                          </p>
                          {onRetryOptions && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={onRetryOptions}
                            >
                              <RefreshCcw className="size-3.5" />
                              再試行する
                            </Button>
                          )}
                        </div>
                      ) : isOptionsLoading ? (
                        <p className="text-muted-foreground col-span-full text-xs">
                          オプションデータを読み込み中...
                        </p>
                      ) : optionMasters.length === 0 ? (
                        <p className="text-muted-foreground col-span-full text-xs">
                          選択できるオプションがありません
                        </p>
                      ) : null}
                      {!isOptionsError &&
                        !isOptionsLoading &&
                        optionMasters.map((option) => {
                          const checked = field.value.includes(option.id);
                          return (
                            <div key={option.id} className="flex min-w-0 items-center gap-2">
                              <Checkbox
                                id={`target-option-${option.id}`}
                                checked={checked}
                                onCheckedChange={(value) => {
                                  if (value) {
                                    field.onChange([...field.value, option.id]);
                                  } else {
                                    field.onChange(
                                      field.value.filter((item) => item !== option.id),
                                    );
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`target-option-${option.id}`}
                                className="flex min-w-0 cursor-pointer items-center gap-2 text-sm font-normal"
                              >
                                <span className="min-w-0 wrap-anywhere">{option.name}</span>
                                <BrandBadge brand={option.brandEnum} />
                              </Label>
                            </div>
                          );
                        })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">割引設定</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="discountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    割引タイプ<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <Select
                    key={`discount-type-${field.value ?? 'empty'}`}
                    value={field.value ?? undefined}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // The value's bound depends on the type (定率 ≤ 100), so re-check it now
                      // instead of only on submit.
                      const current = form.getValues('discountValue');
                      if (current !== undefined && current !== null && String(current) !== '') {
                        void form.trigger('discountValue');
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="割引タイプを選択">
                          {field.value ? OPTION_DISCOUNT_TYPE_LABELS[field.value] : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(OPTION_DISCOUNT_TYPE_LABELS).map(([type, label]) => (
                        <SelectItem key={type} value={type}>
                          {label}
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
              name="discountValue"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    割引金額/率<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <div className="flex items-center gap-1">
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={
                          discountType
                            ? OPTION_DISCOUNT_VALUE_PLACEHOLDERS[discountType]
                            : '例: 330（円）または 10（%）'
                        }
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={
                          field.value === undefined || field.value === null
                            ? ''
                            : String(field.value)
                        }
                        aria-invalid={fieldState.invalid}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    {discountType && (
                      <span className="text-muted-foreground shrink-0 text-sm">
                        {OPTION_DISCOUNT_VALUE_UNITS[discountType]}
                      </span>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="applicationCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    適用条件<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <Select
                    key={`application-condition-${field.value ?? 'empty'}`}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="適用条件を選択">
                          {field.value
                            ? OPTION_SET_APPLICATION_CONDITION_LABELS[field.value]
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(OPTION_SET_APPLICATION_CONDITION_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">
              常時募集（キャンペーンとは別物）です。セット内片方のオプションが解除されると割引も解除され、再追加すると再適用されます。
            </p>
            {/* G-02 前提条件 ブランド設定 (#425): when combined with a campaign, a set discount does not apply if the campaign changes the price. */}
            <p className="text-muted-foreground text-xs">
              キャンペーンと同時適用の場合、キャンペーンで金額が変動している商品があるとセット割は発動しません。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ステータス</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <FormLabel className="text-sm">セット割の有効/無効</FormLabel>
                    <p className="text-muted-foreground text-xs">
                      無効化すると新規入会フローでの選択肢から外れます
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">無効</span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm font-medium">有効</span>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 border-t p-4">
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        <RoleGatedButton
          type="button"
          size="lg"
          requiredPermission={
            isEdit ? Permission.OptionDiscountsEdit : Permission.OptionDiscountsCreate
          }
          disabled={isSubmitting}
          onClick={form.handleSubmit(
            onSubmit as (values: OptionDiscountFormValues) => void,
            onError,
          )}
        >
          {isSubmitting
            ? isEdit
              ? '更新中...'
              : '登録中...'
            : isEdit
              ? '変更を保存する'
              : '登録する'}
        </RoleGatedButton>
      </div>
    </div>
  );
}
