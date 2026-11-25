'use client';

import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { AvailableAreasCard } from '@/app/(private)/area-master/_components/available-areas';
import { useBrandAreas } from '@/app/(private)/area-master/_hooks/use-brand-areas';
import {
  areaBrandChangeNotice,
  toAreaBrandGroup,
} from '@/app/(private)/area-master/_utils/area-brand.util';
import { AlertTriangle } from 'lucide-react';

import { BRAND_ENUM_LABELS } from '@/components/common/brand-badge';
import { OptionalMark } from '@/components/common/field-marker';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import {
  OPTION_DETAIL_CATEGORY_LABELS,
  OPTION_LIST_STATUS_LABELS,
  OPTION_SUBCATEGORY_LABELS,
  OPTION_TYPE_DESCRIPTIONS,
  OPTION_TYPE_FORM_LABELS,
  OPTION_USABILITY_DESCRIPTIONS,
  OPTION_USABILITY_FORM_LABELS,
  PRORATION_METHOD_FORM_LABELS,
  allowsMemberChange,
} from '../_constants/constants';
import {
  OPTION_BRAND_VALUES,
  OPTION_PRORATION_METHOD_VALUES,
  OPTION_SUBCATEGORY_VALUES,
  OPTION_TYPE_VALUES,
  OPTION_USABILITY_VALUES,
  OPTION_WRITABLE_CATEGORY_VALUES,
  type OptionFormValues,
  isWritableCategory,
} from '../_schemas/option-form.schema';
import { OptionImageField } from './option-image-field';

/** Sentinel for the optional service-type select — Select cannot hold an empty string value. */
const SUBCATEGORY_NONE_VALUE = 'none';
/** Prototype 2026-09-03 wording for the empty choice. */
const SUBCATEGORY_NONE_LABEL = '設定しない';

/** G-02 FR-002 two-way tax rate, keyed by the select's string value. */
const TAX_RATE_LABELS: Record<string, string> = {
  '10': '10%',
  '8': '8%（軽減税率）',
};

interface OptionFormProps {
  isEdit?: boolean;
  isSubmitting?: boolean;
  /** 契約形態コード (OP-####) shown in the read-only ID field on edit. */
  optionCode?: string;
  /** Delivery URL of the option's stored member-facing image (edit only). */
  currentImageUrl?: string | null;
  imageFile: File | null;
  imageRemoved: boolean;
  onImageFileChange: (file: File | null) => void;
  onImageRemovedChange: (removed: boolean) => void;
  /** Runs a navigation that leaves the form through the unsaved-changes confirmation. */
  onLeave: (go: () => void) => void;
  onCancel: () => void;
}

export function OptionForm({
  isEdit = false,
  isSubmitting = false,
  optionCode,
  currentImageUrl = null,
  imageFile,
  imageRemoved,
  onImageFileChange,
  onImageRemovedChange,
  onLeave,
  onCancel,
}: Readonly<OptionFormProps>) {
  const form = useFormContext<OptionFormValues>();

  const proratedEnabled = useWatch({ control: form.control, name: 'isProration' });
  const usability = useWatch({ control: form.control, name: 'usability' });
  const brandEnum = useWatch({ control: form.control, name: 'brandEnum' });
  const router = useRouter();
  // Areas of the current brand — the names the brand-change notice quotes.
  const { areas: brandAreas } = useBrandAreas(toAreaBrandGroup(brandEnum));
  const [areaRemovedNotice, setAreaRemovedNotice] = useState('');
  // A system-reserved (tier-2) category cannot be re-classified (422 E-OPT-009).
  const categoryLocked = isEdit && !isWritableCategory(form.getValues('category'));
  const hasErrors = form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0;

  useEffect(() => {
    if (!proratedEnabled) {
      form.setValue('prorationMethod', null, { shouldDirty: true });
    }
  }, [form, proratedEnabled]);

  return (
    <div className="flex flex-col gap-6">
      {/* Edit only: a new option has no members yet (the prototype shows it in create mode too). */}
      {isEdit && (
        <Alert className="border-warning/50 bg-warning/15">
          <AlertTriangle className="text-warning size-4" />
          <AlertDescription className="text-muted-foreground text-xs">
            料金や適用条件を変更すると、現在利用中の会員にも反映されます。
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            <FormItem>
              <FormLabel>オプションID</FormLabel>
              <Input
                value={optionCode ?? ''}
                placeholder="自動採番"
                disabled
                className="bg-muted/50 font-mono"
              />
              <p className="text-muted-foreground text-xs">
                {isEdit ? 'オプションIDは変更できません' : '登録時に自動で採番されます'}
              </p>
            </FormItem>

            <FormField
              control={form.control}
              name="brandEnum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ブランド<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  {/* G-02 dev answer: one option = one brand, fixed once registered. */}
                  <Select
                    key={`brand-${field.value ?? 'empty'}`}
                    value={field.value ?? undefined}
                    disabled={isEdit}
                    onValueChange={(value) => {
                      if (!value) return;
                      // 利用できるエリア are per brand group: JOYFIT ⇄ FIT365 drops them (prototype 11/12).
                      const notice = areaBrandChangeNotice(
                        field.value,
                        value,
                        form.getValues('areaIds') ?? [],
                        brandAreas,
                      );
                      if (notice) form.setValue('areaIds', [], { shouldDirty: true });
                      setAreaRemovedNotice(notice ?? '');
                      field.onChange(value);
                      // FR-002: FIT365 options are always set up with the proration flag ON.
                      if (value === 'Fit365') {
                        form.setValue('isProration', true, { shouldDirty: true });
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ブランドを選択">
                          {field.value ? BRAND_ENUM_LABELS[field.value] : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPTION_BRAND_VALUES.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {BRAND_ENUM_LABELS[brand]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEdit && (
                    <p className="text-muted-foreground text-xs">
                      登録後はブランドを変更できません（変更が必要な場合は無効化のうえ新規登録）
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    オプション名<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="例: プロテインサーバー" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    オプション分類<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <Select
                    key={`option-category-${field.value ?? 'empty'}`}
                    value={field.value ?? undefined}
                    disabled={categoryLocked}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="分類を選択">
                          {field.value ? OPTION_DETAIL_CATEGORY_LABELS[field.value] : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPTION_WRITABLE_CATEGORY_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {OPTION_DETAIL_CATEGORY_LABELS[value]}
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
              name="accountCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>会計コード</FormLabel>
                  <FormControl>
                    <Input placeholder="例: OPT-101" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>備考</FormLabel>
                  <FormControl>
                    <Textarea
                      maxLength={1000}
                      placeholder="備考・メモを入力してください"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-6">
            <OptionImageField
              currentUrl={currentImageUrl}
              file={imageFile}
              removed={imageRemoved}
              onFileChange={onImageFileChange}
              onRemovedChange={onImageRemovedChange}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">料金設定</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="feeMonthly"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    料金（税込）<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                      <span className="text-muted-foreground leading-none">¥</span>
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1100"
                        className="pl-8"
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
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxRate"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    税率<span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <Select
                    key={`tax-rate-${field.value ?? 'empty'}`}
                    value={field.value !== undefined ? String(field.value) : undefined}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          fieldState.invalid && 'border-destructive ring-destructive/20 ring-3',
                        )}
                      >
                        <SelectValue placeholder="税率を選択">
                          {field.value !== undefined
                            ? TAX_RATE_LABELS[String(field.value)]
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TAX_RATE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="isProration"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <FormLabel className="text-sm">日割りフラグ</FormLabel>
                      <p className="text-muted-foreground text-xs">
                        開始日はどのオプションも「今日から」「翌月から」の2択です（任意日付は指定できません）。
                        ON:
                        「今日から」のとき日割り計算を適用します。FIT365対象オプションはONで設定してください。
                        OFF: 「今日から」でも日割りせず、当月分を満額請求します。
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">OFF</span>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      <span className="text-sm font-medium">ON</span>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {proratedEnabled && (
              <FormField
                control={form.control}
                name="prorationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>日割り計算方式</FormLabel>
                    <Select
                      key={`prorata-method-${field.value ?? 'empty'}`}
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="計算方式を選択">
                            {field.value ? PRORATION_METHOD_FORM_LABELS[field.value] : undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPTION_PRORATION_METHOD_VALUES.map((method) => (
                          <SelectItem key={method} value={method}>
                            {PRORATION_METHOD_FORM_LABELS[method]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">オプション種別</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <FormField
            control={form.control}
            name="optionType"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-4"
                  >
                    {OPTION_TYPE_VALUES.map((type) => (
                      <div key={type} className="flex items-start gap-3">
                        <RadioGroupItem
                          value={type}
                          id={`option-type-${type}`}
                          className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                          <Label
                            htmlFor={`option-type-${type}`}
                            className="cursor-pointer text-sm font-medium"
                          >
                            {OPTION_TYPE_FORM_LABELS[type]}
                          </Label>
                          <p className="text-muted-foreground text-xs">
                            {OPTION_TYPE_DESCRIPTIONS[type]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* G-02 FR-002 (260731_v3) + prototype 2026-09-03: the service type is an axis of its
              own, optional, and settable whichever billing type the option uses. */}
          <div className="mt-6">
            <FormField
              control={form.control}
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    サービス種別
                    <OptionalMark />
                  </FormLabel>
                  <Select
                    key={`subcategory-${field.value ?? 'empty'}`}
                    value={field.value ?? SUBCATEGORY_NONE_VALUE}
                    onValueChange={(value) =>
                      field.onChange(value === SUBCATEGORY_NONE_VALUE ? null : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue placeholder="種別を選択">
                          {field.value
                            ? OPTION_SUBCATEGORY_LABELS[field.value]
                            : SUBCATEGORY_NONE_LABEL}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SUBCATEGORY_NONE_VALUE}>
                        {SUBCATEGORY_NONE_LABEL}
                      </SelectItem>
                      {OPTION_SUBCATEGORY_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {OPTION_SUBCATEGORY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    対応する設備・サービスの区分です。店舗機器の利用制御で参照されます。設備と紐づかないオプション（ロッカー等）は未設定のままで構いません
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">利用可否ルール</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <FormField
            control={form.control}
            name="usability"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-4"
                  >
                    {OPTION_USABILITY_VALUES.map((rule) => (
                      <div key={rule} className="flex items-start gap-3">
                        <RadioGroupItem value={rule} id={`usage-rule-${rule}`} className="mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <Label
                            htmlFor={`usage-rule-${rule}`}
                            className="cursor-pointer text-sm font-medium"
                          >
                            {OPTION_USABILITY_FORM_LABELS[rule]}
                          </Label>
                          {OPTION_USABILITY_DESCRIPTIONS[rule] && (
                            <p className="text-muted-foreground text-xs">
                              {OPTION_USABILITY_DESCRIPTIONS[rule]}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">制約設定</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="isChangeableOnPlanChange"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <FormLabel className="text-sm">主オプション契約変更可否</FormLabel>
                      <p className="text-muted-foreground text-xs">
                        主契約変更時にこのオプションの変更を許可するか設定します
                      </p>
                    </div>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 変更可否 has no field of its own: it is the 変更 part of 利用可否ルール (`usability`),
                so it is shown read-only and follows that choice. */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">変更可否</span>
                <p className="text-muted-foreground text-xs">
                  利用可否ルールに連動して決まります（ここでは変更できません）
                </p>
              </div>
              <span className="text-sm">{allowsMemberChange(usability) ? '可' : '不可'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 利用できるエリア (G-02 FR-002, prototype 11/12). */}
      <FormField
        control={form.control}
        name="areaIds"
        render={({ field }) => (
          <AvailableAreasCard
            subject="option"
            brandEnum={brandEnum}
            selectedIds={field.value ?? []}
            onToggle={(areaId, checked) => {
              const current = field.value ?? [];
              field.onChange(
                checked ? [...current, areaId] : current.filter((id) => id !== areaId),
              );
              setAreaRemovedNotice('');
            }}
            removedNotice={areaRemovedNotice}
            onOpenAreaMaster={() => onLeave(() => router.push('/area-master'))}
          />
        )}
      />

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
                    <FormLabel className="text-sm">オプションの有効/無効</FormLabel>
                    <p className="text-muted-foreground text-xs">
                      有効にすると、対象の会員がこのオプションに申し込めるようになります
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      {OPTION_LIST_STATUS_LABELS.inactive}
                    </span>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm font-medium">{OPTION_LIST_STATUS_LABELS.active}</span>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 border-t p-4">
        {hasErrors && <p className="text-destructive mr-auto text-xs">未入力の項目があります</p>}
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        {/* A real submit, so the page's `<form onSubmit>` runs and its invalid handler scrolls to
            the first error. */}
        <RoleGatedButton
          type="submit"
          size="lg"
          requiredPermission={isEdit ? Permission.OptionsEdit : Permission.OptionsCreate}
          disabled={isSubmitting}
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
