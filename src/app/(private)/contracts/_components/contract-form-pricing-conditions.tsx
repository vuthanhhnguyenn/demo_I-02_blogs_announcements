'use client';

import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AvailableAreasCard } from '@/app/(private)/area-master/_components/available-areas';
import { useAuthUser } from '@/contexts/auth-user.context';
import { parseDate } from '@/utils/date.util';
import { formatYen } from '@/utils/format.util';
import {
  blockExponentInput,
  numberInputHandlers,
  numberInputValue,
} from '@/utils/number-input.util';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
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

import { adminBrandControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import {
  PLAN_LIMIT_OF_SEX_LABELS,
  type PlanFeeField,
  type PlanLimitOfSex,
  enrollmentFeeFieldsForBrand,
  isJoyfitBrand,
} from '../_constants/constants';
import {
  ALL_DAY_CLOSE,
  ALL_DAY_OPEN,
  type ContractFormValues,
  LAST_MINUTE_OF_DAY,
  PLAN_USAGE_DAYS,
  PLAN_USAGE_DAY_LABELS,
} from '../_schemas/contract-form.schema';

interface ContractFormPricingConditionsProps {
  /** Shown only in the duplicate flow — the source master the values were copied from. */
  copiedFromLabel?: string;
  /** 子主契約作成 (G-01 FR-M007) — the source is the new master's 親主契約 rather than a template. */
  isChildCreate?: boolean;
  /** Leaves the form through the unsaved-changes confirmation (the brand 費用 link). */
  onLeave: (go: () => void) => void;
  /** Step 1 dropped the 利用できるエリア on a JOYFIT ⇄ FIT365 brand change (prototype 11/12). */
  areaRemovedNotice?: string;
  onAreaRemovedNoticeClear?: () => void;
}

/** Edits to a 利用可能時間 row count as user changes; the row is re-validated as a whole after. */
const USAGE_HOUR_EDIT = { shouldDirty: true } as const;

const TAX_RATE_OPTIONS = [
  { value: 10, label: '10%' },
  { value: 8, label: '8%（軽減税率）' },
] as const;

export function ContractFormPricingConditions({
  copiedFromLabel,
  isChildCreate = false,
  onLeave,
  areaRemovedNotice = '',
  onAreaRemovedNoticeClear,
}: Readonly<ContractFormPricingConditionsProps>) {
  const form = useFormContext<ContractFormValues>();
  const router = useRouter();
  const { hasPermission } = useAuthUser();

  /**
   * The row rules span both times, so validating only the edited field would leave a stale error
   * on its sibling — clearing 開始 then 終了 kept 「開始時刻を入力してください」 on screen for a valid
   * 休業 row while 次のステップ still went through (Bug_No15). Re-check the row as one unit.
   */
  const revalidateUsageHourRow = (index: number) => void form.trigger(`usageHours.${index}`);

  /**
   * G-01 L169 / Y-07 FR-002: the 入会時費用 items differ per brand and each brand has exactly two
   * of them — 入会金・登録事務手数料 for the JOYFIT family, セキュリティ管理／施設メンテナンス料・
   * 会員カード発行料 for FIT365. The client confirmed the merged 「セキュリティ管理／施設メンテナンス料」
   * is one charge (`maintenanceFee`) at qa-185 §1.
   */
  const brand = form.watch('brandEnum');
  const enrollmentFeeFields = enrollmentFeeFieldsForBrand(brand);
  // Y-07 keeps 費用 on the two top-level brands; every JOYFIT sub-brand reads JOYFIT's.
  const brandFeesHref = `${navigate('/brands/[id]', isJoyfitBrand(brand) ? 'JOYFIT' : 'FIT365')}?variant=fees`;

  // Y-07: the brand's 費用 settings are the initial value of each 入会時費用 input. The brand
  // detail is read for the sub-brand picked on step 1 (fees are absent for the `staff` role).
  const { data: brandDetail } = useQuery({
    ...adminBrandControllerDetailOptions({
      path: { brandGroup: isJoyfitBrand(brand) ? 'JOYFIT' : 'FIT365' },
    }),
    enabled: !!brand,
  });
  const brandFees = brandDetail?.subBrands.find((subBrand) => subBrand.brandEnum === brand)?.fees;
  const prefilledFeesRef = useRef<Partial<Record<PlanFeeField, number>>>({});

  useEffect(() => {
    if (!brandFees) return;
    for (const fee of enrollmentFeeFieldsForBrand(brand) ?? []) {
      const amount = brandFees[fee.name]?.priceInclTax;
      if (amount == null) continue;
      const current = form.getValues(fee.name);
      // Fill an empty input, or replace the previous sub-brand's default — but never a value
      // the operator typed or cleared.
      const canPrefill = current == null || current === prefilledFeesRef.current[fee.name];
      if (canPrefill && !form.getFieldState(fee.name).isDirty) form.setValue(fee.name, amount);
      prefilledFeesRef.current[fee.name] = amount;
    }
  }, [brand, brandFees, form]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">料金</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 items-start gap-6 px-4">
          <FormField
            control={form.control}
            name="priceTaxIncluded"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  料金（税込）<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    placeholder="7700"
                    {...field}
                    value={numberInputValue(field.value)}
                    // Cleared → `null`, not `undefined`: react-hook-form reads an `undefined` value
                    // back as the default value, so a copied/edited price would snap back.
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="suspensionFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>休会時請求金額（税込）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    placeholder="1100"
                    {...field}
                    value={numberInputValue(field.value)}
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* G-01 FR-M002 pricing block: 違約金 (cancellation fee, tax included). */}
          <FormField
            control={form.control}
            name="cancellationFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>違約金（税込）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    placeholder="例: 0"
                    {...field}
                    value={numberInputValue(field.value)}
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <p className="text-muted-foreground mt-1 text-xs">
                  解約時の違約金。不要な場合は0または空欄
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taxRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  税率<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  key={`taxRate-${field.value ?? 'empty'}`}
                  value={field.value != null ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="税率を選択">
                        {TAX_RATE_OPTIONS.find((option) => option.value === field.value)?.label}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TAX_RATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
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
            name="accountingCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>会計コード</FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: ACC-101"
                    className="font-mono"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!enrollmentFeeFields && (
            <div className="col-span-3">
              <p className="text-muted-foreground text-xs">
                Step
                1でブランドを選択すると、ブランド費用設定（税込）に登録された入会時費用の項目（JOYFIT系:
                入会金・登録事務手数料 / FIT365:
                セキュリティ管理／施設メンテナンス料・会員カード発行料）が表示されます
              </p>
            </div>
          )}

          {enrollmentFeeFields?.map((fee) => (
            <FormField
              key={fee.name}
              control={form.control}
              name={fee.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{fee.label}（税込）</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...blockExponentInput}
                      placeholder="例: 0"
                      {...field}
                      value={numberInputValue(field.value)}
                      {...numberInputHandlers(field.onChange)}
                    />
                  </FormControl>
                  <p className="text-muted-foreground mt-1 text-xs">
                    ブランド費用設定の初期値: {formatYen(brandFees?.[fee.name]?.priceInclTax, '―')}
                    。主契約ごとに上書きできます
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          {/* Y-07 FR-002: the brand detail's 費用 tab is where these defaults come from. */}
          {enrollmentFeeFields && hasPermission(Permission.BrandsView) && (
            <div className="col-span-3">
              <Link
                href={brandFeesHref}
                onClick={(e) => {
                  e.preventDefault();
                  onLeave(() => router.push(brandFeesHref));
                }}
                className="text-primary inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
              >
                ブランド費用設定を見る
                <ArrowRight className="size-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">利用条件</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 items-start gap-6 px-4">
          <FormField
            control={form.control}
            name="usageStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  利用開始日<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <DatePicker
                    // `YYYY-MM-DD` parses as UTC and shifts the day, so read it back as
                    // local midnight.
                    date={
                      parseDate(
                        field.value ? `${field.value.replaceAll('/', '-')}T00:00:00` : null,
                      ) ?? undefined
                    }
                    onDateChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}
                    placeholder="日付を選択"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="monthlyVisitLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>月額会員回数上限</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    placeholder="制限なしの場合は空欄"
                    {...field}
                    value={numberInputValue(field.value)}
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="col-span-3">
            <div className="flex flex-col gap-2">
              <Label className="text-sm">利用可能時間（曜日別）</Label>
              <div className="mt-1 grid grid-cols-1 gap-2">
                {PLAN_USAGE_DAYS.map((day, index) => {
                  const isAllDay = form.watch(`usageHours.${index}.isAllDay`);
                  const openTime = form.watch(`usageHours.${index}.openTime`) ?? '';
                  const closeTime = form.watch(`usageHours.${index}.closeTime`) ?? '';
                  const rowError =
                    form.formState.errors.usageHours?.[index]?.closeTime?.message ??
                    form.formState.errors.usageHours?.[index]?.openTime?.message;

                  return (
                    <div key={day} className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="w-10 shrink-0 text-sm">{PLAN_USAGE_DAY_LABELS[day]}</span>
                        {/* 終日 is fixed at 00:00〜24:00, and `<input type="time">` rejects 24:00 —
                          so a locked row is shown as plain text instead of an empty time input. */}
                        <Input
                          type={isAllDay ? 'text' : 'time'}
                          className="h-8 w-28 text-xs"
                          disabled={isAllDay}
                          readOnly={isAllDay}
                          value={openTime}
                          onChange={(e) => {
                            form.setValue(
                              `usageHours.${index}.openTime`,
                              e.target.value,
                              USAGE_HOUR_EDIT,
                            );
                            revalidateUsageHourRow(index);
                          }}
                        />
                        <span className="text-muted-foreground text-xs">〜</span>
                        <Input
                          type={isAllDay ? 'text' : 'time'}
                          className="h-8 w-28 text-xs"
                          disabled={isAllDay}
                          readOnly={isAllDay}
                          value={closeTime}
                          onChange={(e) => {
                            form.setValue(
                              `usageHours.${index}.closeTime`,
                              e.target.value,
                              USAGE_HOUR_EDIT,
                            );
                            revalidateUsageHourRow(index);
                          }}
                        />
                        <div className="ml-2 flex items-center gap-2">
                          <Checkbox
                            id={`allday-${day}`}
                            checked={isAllDay}
                            onCheckedChange={(checked) => {
                              const nextIsAllDay = checked === true;
                              form.setValue(
                                `usageHours.${index}.isAllDay`,
                                nextIsAllDay,
                                USAGE_HOUR_EDIT,
                              );
                              // Ticking locks the row to the whole day; unticking hands back an
                              // editable 00:00〜23:59 rather than the unreachable 24:00.
                              form.setValue(
                                `usageHours.${index}.openTime`,
                                ALL_DAY_OPEN,
                                USAGE_HOUR_EDIT,
                              );
                              form.setValue(
                                `usageHours.${index}.closeTime`,
                                nextIsAllDay ? ALL_DAY_CLOSE : LAST_MINUTE_OF_DAY,
                                USAGE_HOUR_EDIT,
                              );
                              revalidateUsageHourRow(index);
                            }}
                          />
                          <Label htmlFor={`allday-${day}`} className="text-xs font-normal">
                            終日
                          </Label>
                        </div>
                      </div>
                      {rowError && <p className="text-destructive pl-13 text-xs">{rowError}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">休会・退会</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 items-start gap-6 px-4">
          <FormField
            control={form.control}
            name="suspendableMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>休会可能月</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    min={0}
                    placeholder="例: 3"
                    {...field}
                    value={numberInputValue(field.value)}
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cancellationFeeMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>退会可能月</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    min={0}
                    placeholder="例: 1"
                    {...field}
                    value={numberInputValue(field.value)}
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prepaidMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>初回支払月数</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    min={0}
                    placeholder="例: 1"
                    {...field}
                    value={numberInputValue(field.value)}
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sameMonthWithdrawalAllowed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-8">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-normal">退会申請当月の退会可</FormLabel>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">対象制限</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 items-start gap-6 px-4">
          {/* API-087 models 年齢制限 as the numeric pair `minAge` / `maxAge`. */}
          <FormField
            control={form.control}
            name="minAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>年齢制限（下限）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    min={0}
                    placeholder="例: 15"
                    {...field}
                    value={numberInputValue(field.value)}
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <p className="text-muted-foreground mt-1 text-xs">
                  ブランド選択に応じて初期値が入ります（JOYFIT系: 15歳 / FIT365:
                  16歳）。必要に応じて変更できます
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>年齢制限（上限）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...blockExponentInput}
                    min={0}
                    placeholder="上限なしの場合は空欄"
                    {...field}
                    value={numberInputValue(field.value)}
                    {...numberInputHandlers(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="limitOfSex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>性別制限</FormLabel>
                <Select
                  key={`limitOfSex-${field.value ?? 'empty'}`}
                  value={field.value ?? undefined}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="制限を選択">
                        {field.value ? PLAN_LIMIT_OF_SEX_LABELS[field.value] : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.keys(PLAN_LIMIT_OF_SEX_LABELS) as PlanLimitOfSex[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {PLAN_LIMIT_OF_SEX_LABELS[value]}
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
            name="isChangeable"
            render={({ field }) => (
              <FormItem>
                <FormLabel>主契約変更可否</FormLabel>
                <Select
                  key={`isChangeable-${String(field.value ?? 'empty')}`}
                  value={field.value !== undefined ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(v === 'true')}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください">
                        {field.value !== undefined ? (field.value ? '可' : '不可') : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">可</SelectItem>
                    <SelectItem value="false">不可</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hasBilling"
            render={({ field }) => (
              <FormItem>
                <FormLabel>課金有無</FormLabel>
                <Select
                  key={`hasBilling-${String(field.value ?? 'empty')}`}
                  value={field.value !== undefined ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(v === 'true')}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください">
                        {field.value !== undefined ? (field.value ? 'あり' : 'なし') : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">あり</SelectItem>
                    <SelectItem value="false">なし</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* 利用できるエリア (G-01 FR-M002, prototype 11/12) — right under 対象制限, so 性別制限 and the
          areas' gender conditions read side by side. */}
      <FormField
        control={form.control}
        name="areaIds"
        render={({ field }) => (
          <AvailableAreasCard
            subject="plan"
            brandEnum={form.watch('brandEnum')}
            selectedIds={field.value ?? []}
            onToggle={(areaId, checked) => {
              const current = field.value ?? [];
              field.onChange(
                checked ? [...current, areaId] : current.filter((id) => id !== areaId),
              );
              onAreaRemovedNoticeClear?.();
            }}
            removedNotice={areaRemovedNotice}
            limitOfSex={form.watch('limitOfSex')}
            onOpenAreaMaster={() => onLeave(() => router.push('/area-master'))}
          />
        )}
      />

      {/* 複製設定 — shown only in the duplicate flow; G-01 FR-M002 「コピー元ID」. */}
      {copiedFromLabel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">複製設定</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex flex-col gap-2">
              <Label>コピー元ID</Label>
              <Input value={copiedFromLabel} className="font-mono" disabled readOnly />
              <p className="text-muted-foreground text-xs">
                {isChildCreate
                  ? `元にした主契約ID（${copiedFromLabel}から作成）`
                  : `複製元の主契約ID（${copiedFromLabel}から複製）`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <FormLabel className="text-sm">主契約の有効/無効</FormLabel>
                    <p className="text-muted-foreground text-xs">
                      有効にすると、新規の契約申請でこのプランが選択できるようになります
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
    </div>
  );
}
