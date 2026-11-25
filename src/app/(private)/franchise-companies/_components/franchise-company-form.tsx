'use client';

import type { ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { format } from 'date-fns';

import { OptionalMark, RequiredMark } from '@/components/common/field-marker';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';

import { Permission } from '@/types/permission.type';

import {
  FC_AUTH_PROVIDER_LABELS,
  FC_AUTH_PROVIDER_VALUES,
  MANAGEMENT_TYPE_FORM_LABELS,
  MANAGEMENT_TYPE_SELECTABLE_VALUES,
} from '../_constants/constants';
import {
  type FranchiseCompanyFormSubmitValues,
  type FranchiseCompanyFormValues,
  RENEWAL_BEFORE_START_MESSAGE,
  ROYALTY_RATE_REGEX,
} from '../_schemas/franchise-company-form.schema';

/** Fields whose absence triggers 「未入力の項目があります」 (prototype footer copy) */
const REQUIRED_FIELDS = ['legalName', 'managementType', 'authProvider'] as const;

/** Wide enough for far-past migrated contracts and far-future renewal dates (react-day-picker's dropdown otherwise stops at this year) */
const CONTRACT_DATE_START_MONTH = new Date(1900, 0, 1);
const CONTRACT_DATE_END_MONTH = new Date(2099, 11, 31);

/** Keys <input type="number"> accepts that are not part of a plain decimal (`1e2`, `+5`) */
const ROYALTY_RATE_BLOCKED_KEYS = new Set(['e', 'E', '+']);

interface FranchiseCompanyFormProps {
  mode: 'create' | 'edit';
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: FranchiseCompanyFormSubmitValues) => void;
  onError?: () => void;
  submitPermission?: Permission;
}

function FieldLabel({
  children,
  required,
  optional,
  description,
}: Readonly<{
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  description?: string;
}>) {
  return (
    <div className="flex flex-col gap-1">
      <FormLabel className="text-sm">
        {children}
        {required && <RequiredMark />}
        {optional && <OptionalMark />}
      </FormLabel>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}

export function FranchiseCompanyForm({
  mode,
  isSubmitting = false,
  onCancel,
  onSubmit,
  onError,
  submitPermission = Permission.FCCompaniesCreate,
}: Readonly<FranchiseCompanyFormProps>) {
  const form = useFormContext<FranchiseCompanyFormValues>();
  const { errors, submitCount } = form.formState;
  const hasSubmitErrors = submitCount > 0 && Object.keys(errors).length > 0;
  // 直営店フラグ follows 区分 (Y-03 FR-021: 区分 wins; API-075 derives ownedStore the same way)
  const isOwnedStore =
    useWatch({ control: form.control, name: 'managementType' }) === 'direct_management';
  // locker-form と同じ流儀: 未入力系とそれ以外でフッターメッセージを出し分け
  // A required field can also fail for being too long — only an empty one counts as 未入力
  const values = form.getValues();
  const isMissing = (field: (typeof REQUIRED_FIELDS)[number]) => {
    const value = values[field];
    return typeof value === 'string' ? value.trim() === '' : value == null;
  };
  const submitErrorMessage = REQUIRED_FIELDS.some((field) => errors[field] && isMissing(field))
    ? '未入力の項目があります'
    : errors.fcContractRenewalDate
      ? RENEWAL_BEFORE_START_MESSAGE
      : '入力内容に誤りがあります';

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">法人基本情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="legalName"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel required>法人名（正式名称）</FieldLabel>
                  <FormControl>
                    <Input placeholder="例: 株式会社フィットネスパートナーズ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional description="CRM内の一覧等で表示される省略形">
                    法人名（表示名）
                  </FieldLabel>
                  <FormControl>
                    <Input placeholder="例: フィットネスパートナーズ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="managementType"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel required>直営/FC区分</FieldLabel>
                    <Select
                      key={`franchise-company-type-${field.value ?? 'empty'}`}
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください">
                            {field.value ? MANAGEMENT_TYPE_FORM_LABELS[field.value] : undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MANAGEMENT_TYPE_SELECTABLE_VALUES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {MANAGEMENT_TYPE_FORM_LABELS[value]}
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
                name="corporateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel optional>法人番号</FieldLabel>
                    <FormControl>
                      <Input placeholder="例: 1234567890123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Y-03 FR-002「直営店フラグ（既存システムとの互換性のため保持）」: not stored — API-075 returns
                `ownedStore` derived from 区分 (migrated true → 直営, false → FC), so it is shown, never sent */}
            <div className="flex items-center gap-2">
              <Checkbox id="franchise-company-owned-store" checked={isOwnedStore} disabled />
              <Label htmlFor="franchise-company-owned-store" className="text-sm font-normal">
                直営店フラグ
              </Label>
              <span className="text-muted-foreground text-xs">
                旧システムとの互換性のために保持（直営/FC区分が「直営」の場合に自動でON）
              </span>
            </div>

            {/* Y-03 FR-002「認証方式（セレクト・必須）」: Google SSO / IDaaS。Y-13 FR-M003 の認証経路自動判定が参照 */}
            <FormField
              control={form.control}
              name="authProvider"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel
                    required
                    description="所属スタッフのCRM認証経路を決定します。Google Workspace保有企業はGoogle SSO、非保有企業はIDaaSを選択"
                  >
                    認証方式
                  </FieldLabel>
                  <Select
                    key={`franchise-company-auth-method-${field.value ?? 'empty'}`}
                    value={field.value ?? undefined}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください">
                          {field.value ? FC_AUTH_PROVIDER_LABELS[field.value] : undefined}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FC_AUTH_PROVIDER_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {FC_AUTH_PROVIDER_LABELS[value]}
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
              name="representativeName"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional>代表者名</FieldLabel>
                  <FormControl>
                    <Input placeholder="例: 山田 太郎" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headOfficeAddress"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional>本社所在地</FieldLabel>
                  <FormControl>
                    <Input placeholder="例: 福岡県福岡市中央区天神1-1-1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional>電話番号</FieldLabel>
                  <FormControl>
                    <Input placeholder="例: 092-000-0000" className="max-w-[240px]" {...field} />
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
          <CardTitle className="text-base font-semibold">担当者情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="contactPersonName"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional>担当者名</FieldLabel>
                  <FormControl>
                    <Input placeholder="例: 佐藤 花子" className="max-w-[320px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Y-03 FR-002 v4: 担当者連絡先を2項目に分割（移行データのダミー値混入防止のため両方任意） */}
            <FormField
              control={form.control}
              name="contactPersonEmail"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional>担当者メールアドレス</FieldLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="例: sato@example.co.jp"
                      className="max-w-[320px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPersonPhone"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel optional>担当者電話番号</FieldLabel>
                  <FormControl>
                    <Input placeholder="例: 092-000-0001" className="max-w-[320px]" {...field} />
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
          <CardTitle className="text-base font-semibold">契約情報</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fcContractStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel optional>FC契約開始日</FieldLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        onDateChange={(date) => {
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                          // The cross-field rule lives on the renewal date — re-check it
                          void form.trigger('fcContractRenewalDate');
                        }}
                        placeholder="日付を選択"
                        startMonth={CONTRACT_DATE_START_MONTH}
                        endMonth={CONTRACT_DATE_END_MONTH}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Y-03 FR-002 v4: FC契約開始日以降の日付に限定（保存時バリデーション） */}
              <FormField
                control={form.control}
                name="fcContractRenewalDate"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabel optional description="次回の契約更新予定日">
                      FC契約更新日
                    </FieldLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        onDateChange={(date) =>
                          field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        placeholder="日付を選択"
                        startMonth={CONTRACT_DATE_START_MONTH}
                        endMonth={CONTRACT_DATE_END_MONTH}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Y-03 補足「Phase 1ではフォームに入力欄を配置し参考値として入力可能」: 常時表示 */}
            <FormField
              control={form.control}
              name="royaltyRate"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel
                    optional
                    description="参考値として入力できます。計算ロジックは次フェーズで提供予定"
                  >
                    ロイヤリティ率(%)
                  </FieldLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="例: 5.0"
                      className="max-w-[160px]"
                      {...field}
                      value={(field.value ?? '') as string | number}
                      onKeyDown={(event) => {
                        if (ROYALTY_RATE_BLOCKED_KEYS.has(event.key)) event.preventDefault();
                      }}
                      onChange={(event) => {
                        const raw = event.target.value;
                        // A non-plain value (pasted `1e2`) stays a string so the schema rejects it
                        field.onChange(
                          raw === '' ? undefined : ROYALTY_RATE_REGEX.test(raw) ? Number(raw) : raw,
                        );
                      }}
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
          <CardTitle className="text-base font-semibold">備考</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FieldLabel optional>備考</FieldLabel>
                <FormControl>
                  <Textarea
                    placeholder="補足事項があれば入力してください"
                    className="min-h-[100px] text-sm"
                    maxLength={1000}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Y-03 FR-004: ステータス変更は詳細画面のステータスカードに集約（フォームでは扱わない・登録時は既定「有効」） */}

      <div className="flex items-center justify-end gap-2 border-t p-4">
        {hasSubmitErrors && (
          <p className="text-destructive mr-auto text-xs">{submitErrorMessage}</p>
        )}
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
          requiredPermission={submitPermission}
          disabled={isSubmitting}
          onClick={form.handleSubmit(
            onSubmit as (values: FranchiseCompanyFormValues) => void,
            onError,
          )}
        >
          {mode === 'edit'
            ? isSubmitting
              ? '保存中...'
              : '保存する'
            : isSubmitting
              ? '登録中...'
              : '登録する'}
        </RoleGatedButton>
      </div>
    </div>
  );
}
