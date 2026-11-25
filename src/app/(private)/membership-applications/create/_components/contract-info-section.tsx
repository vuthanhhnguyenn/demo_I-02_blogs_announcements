'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { type Control, useWatch } from 'react-hook-form';

import { useCurrentStore } from '@/contexts/current-store.context';
import { toSelectItems } from '@/utils/app.util';
import { addMonths, format, startOfDay } from 'date-fns';

import { StoreSelectInput } from '@/components/common/data-select-input';
import { DisabledReasonButton } from '@/components/common/disabled-reason-button';
import { OptionalMark } from '@/components/common/field-marker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { StoreCampaignDto } from '@/lib/api-real/types.gen';

import { BRAND_OPTIONS } from '../../_constants/constants';
import { toBrandGroup } from '../../_utils/brand-group.util';
import {
  JACCS_CALLBACK_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from '../_constants/enrollment-form.constants';
import {
  type DirectEnrollmentFormValues,
  USAGE_START_MAX_MONTHS,
} from '../_schemas/enrollment-form.schema';
import { StoreCampaignSelectInput } from './store-campaign-select-input';

interface ContractInfoSectionProps {
  readonly control: Control<DirectEnrollmentFormValues>;
  readonly onBrandChange?: () => void;
  /** Resets plan / campaign — both are store-scoped masters. Receives the picked store's name. */
  readonly onStoreChange?: (storeName: string | null) => void;
  /** Receives the picked campaign — it decides the plan (C-01 L212, integration-plan D17). */
  readonly onCampaignChange?: (campaign: StoreCampaignDto | null) => void;
  /** Name of the plan the picked campaign decides; null before a campaign is picked. */
  readonly planName?: string | null;
  /** Applicant gender in API terms (null = not chosen) — filters the campaigns (E-02 FR-016). */
  readonly applicantGender?: string | null;
  /** Shown when a gender change dropped the picked campaign. */
  readonly campaignRemovedNotice?: string;
}

const ALL_BRAND_OPTIONS = BRAND_OPTIONS.filter((b) => b.value !== 'all');

// Matches the native `SelectTrigger` box so the paged pickers line up with the plain selects.
const FORM_SELECT_TRIGGER_CLASS = 'h-8 w-full text-sm';

export function ContractInfoSection({
  control,
  onBrandChange,
  onStoreChange,
  onCampaignChange,
  planName = null,
  applicantGender = null,
  campaignRemovedNotice = '',
}: ContractInfoSectionProps) {
  const brand = useWatch({ control, name: 'contract.brand_id' });
  const storeId = useWatch({ control, name: 'contract.store_id' });
  // The store master is unscoped: a Manager may only enrol into their 管轄 stores (BUG-D-02).
  // Those are already fully loaded by the store context, so they get a plain select; every
  // other role pages through the whole master server-side.
  const { canSelectAllStores, restrictedStores } = useCurrentStore();
  // Stores of the selected brand only (stores of either brand before a brand is picked).
  const brandGroup = brand === 'FIT365' || brand === 'JOYFIT' ? brand : undefined;
  // `/crm/me` keeps closed stores in the scope; nobody can enrol into one, so neither the store
  // nor a brand reachable only through closed stores is offered (no dead-end 入会店舗).
  const enrollableStores = restrictedStores.filter((s) => s.status !== 'closed');
  // Brands the signed-in staff actually manages (C-01 Bug-No4): those of their own stores.
  // HQ / system are not limited to a store list, so they keep every brand.
  const brandOptions = canSelectAllStores
    ? ALL_BRAND_OPTIONS
    : ALL_BRAND_OPTIONS.filter((b) =>
        enrollableStores.some((s) => toBrandGroup(s.brandEnum) === b.value),
      );
  const restrictedStoreOptions = enrollableStores
    .filter((s) => !brandGroup || toBrandGroup(s.brandEnum) === brandGroup)
    .map((s) => ({ value: s.id, label: s.name }));
  const paymentMethod = useWatch({ control, name: 'contract.payment_method' });
  const isCardPayment = paymentMethod === 'credit_card';
  const isJaccsPayment = paymentMethod === 'bank_transfer';

  return (
    <Card>
      <CardHeader>
        <CardTitle>契約情報</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="contract.brand_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  ブランド<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v ?? undefined);
                    onBrandChange?.();
                  }}
                  value={field.value ?? ''}
                  items={toSelectItems(brandOptions)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {brandOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="contract.store_id"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  入会店舗<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                {canSelectAllStores ? (
                  <StoreSelectInput
                    value={field.value || null}
                    onChange={(store) => {
                      field.onChange(store?.id ?? '');
                      onStoreChange?.(store?.name ?? null);
                    }}
                    placeholder="選択してください"
                    clearLabel={null}
                    queryFilters={brandGroup ? { brandGroup } : undefined}
                    hasError={!!fieldState.error}
                    triggerClassName={FORM_SELECT_TRIGGER_CLASS}
                  />
                ) : (
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v ?? '');
                      onStoreChange?.(
                        restrictedStoreOptions.find((s) => s.value === v)?.label ?? null,
                      );
                    }}
                    value={field.value ?? ''}
                    items={toSelectItems(restrictedStoreOptions)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {restrictedStoreOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="contract.campaign_id"
            render={({ field, fieldState }) => (
              <FormItem>
                {/* C-01 L212: the enrolment flow starts from a campaign — required (prototype 9/8) */}
                <FormLabel>
                  適用キャンペーン<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <StoreCampaignSelectInput
                  key={storeId}
                  storeId={storeId}
                  value={field.value ?? ''}
                  onChange={(campaign) => {
                    field.onChange(campaign?.campaignId ?? '');
                    onCampaignChange?.(campaign);
                  }}
                  hasError={!!fieldState.error}
                  triggerClassName={FORM_SELECT_TRIGGER_CLASS}
                  applicantGender={applicantGender}
                  brandLabel={ALL_BRAND_OPTIONS.find((b) => b.value === brand)?.label ?? ''}
                  removedNotice={campaignRemovedNotice}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="contract.plan_id"
            render={() => (
              <FormItem>
                {/* Decided by the campaign, never chosen (C-01 L212 「逆の操作は不可」, D17). */}
                <FormLabel>
                  プラン<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    readOnly
                    tabIndex={-1}
                    value={planName ?? ''}
                    title={planName ?? undefined}
                    placeholder="キャンペーンを選択すると自動設定されます"
                    className="bg-muted text-ellipsis"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="contract.usage_start_date"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  利用開始日<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  {/* Only today … +2 months is selectable — the API's E-ENR-004 window (BUG-D-07). */}
                  <DatePicker
                    date={field.value ? new Date(field.value) : undefined}
                    placeholder="日付を選択"
                    hasError={!!fieldState.error}
                    disabledDate={[
                      { before: startOfDay(new Date()) },
                      { after: addMonths(startOfDay(new Date()), USAGE_START_MAX_MONTHS) },
                    ]}
                    onDateChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="contract.referral_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  紹介コード
                  <OptionalMark />
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="例: ST001AB12C" />
                </FormControl>
                <p className="text-muted-foreground text-xs">
                  紹介コードがある場合に入力。入会経路が『紹介経由』になります
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="contract.payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  決済方法<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v ?? undefined)}
                  value={field.value ?? ''}
                  items={toSelectItems(PAYMENT_METHOD_OPTIONS)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* SBPS card token — card payment only. The token is obtained elsewhere (e.g. link-type
              registration); the 取得リンクを送る slot is reserved until that flow is specified
              (dev answer 2026/08/17, prototype 9/16). */}
          {isCardPayment && (
            <FormField
              control={control}
              name="contract.card_token"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>
                    カードトークン<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        className="font-mono"
                        placeholder="リンク型登録などで取得したトークンを入力"
                      />
                    </FormControl>
                    <DisabledReasonButton
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled
                      disabledReason="取得手順は仕様確定後に有効化されます"
                    >
                      取得リンクを送る
                    </DisabledReasonButton>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    SBPSのリンク型登録などで取得済みのトークンを入力します
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {/* TODO(round2) B20 — temporary inputs for the JACCS fields of `CreateApplicationDto`
              (jaccsContractorNumber / jaccsCallbackStatus). The create call answers 422 E-ENR-017
              for 口座振替 without a completed JACCS callback, and the JACCS registration flow is not
              specified yet; remove once it is. Both optional, as in the contract. */}
          {isJaccsPayment && (
            <>
              <FormField
                control={control}
                name="contract.jaccs_contractor_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      JACCS契約者番号
                      <OptionalMark />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono" placeholder="例: J0000000001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="contract.jaccs_callback_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      JACCSコールバック状態
                      <OptionalMark />
                    </FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v ?? '')}
                      value={field.value}
                      items={toSelectItems([...JACCS_CALLBACK_STATUS_OPTIONS])}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JACCS_CALLBACK_STATUS_OPTIONS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">
                      口座登録が完了している場合は「完了」を選択します（暫定入力）
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
