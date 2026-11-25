'use client';

import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  adminLockerControllerGetLockerOptions,
  adminStoreControllerDetailOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  LOCKER_LOCK_METHOD_LABELS,
  LOCKER_OPEN_METHOD_LABELS,
  LOCKER_OPEN_METHOD_OPTIONS,
  LOCKER_ORDER_TYPE_LABELS,
  LOCKER_ORDER_TYPE_OPTIONS,
  LOCKER_SELECTABLE_LOCK_METHODS,
  LOCKER_SHAPE_TYPE_LABELS,
  LOCKER_SHAPE_TYPE_OPTIONS,
} from '../_constants/locker-enum-labels.constants';
import { useLockerLocations } from '../_hooks/use-locker-locations.hook';
import type {
  LockerFormValues,
  LockerSlotLockSettingFormValue,
} from '../_schemas/locker-form.schema';
import { LOCKER_SLOT_START_NUMBER } from '../_utils/locker-slot-numbering.util';
import {
  type LockerOptionMasterItem,
  LockerOptionMasterSelect,
} from './locker-option-master-select';
import { SlotGridPreview } from './slot-grid-preview';
import { SlotLockSettingsTable } from './slot-lock-settings-table';

type LockerFormConfigurationSectionProps = {
  mode: 'create' | 'edit';
  lockerId?: string;
};

export function LockerFormConfigurationSection({
  mode,
  lockerId,
}: LockerFormConfigurationSectionProps) {
  const router = useRouter();
  const form = useFormContext<LockerFormValues>();
  const isEdit = mode === 'edit';

  // The master is paged by the Select, so the option the user just picked is kept here to
  // label the trigger; on edit the saved option is labelled from the cabinet detail instead.
  const [pickedOption, setPickedOption] = useState<LockerOptionMasterItem | null>(null);

  const shapeType = useWatch({ control: form.control, name: 'shapeType' });
  const storeId = useWatch({ control: form.control, name: 'storeId' });
  const lockerLocationId = useWatch({ control: form.control, name: 'lockerLocationId' });
  const orderType = useWatch({ control: form.control, name: 'orderType' });
  const lockMethod = useWatch({ control: form.control, name: 'lockMethod' });
  const slotLockSettings = useWatch({ control: form.control, name: 'slotLockSettings' }) ?? [];
  const optionId = useWatch({ control: form.control, name: 'optionId' });

  const { byId: locationsById } = useLockerLocations();
  const locationCode = lockerLocationId ? locationsById.get(lockerLocationId)?.locationCode : '';

  // BR-LCK-009: new FIT365 cabinets allow dial locks only. When editing, respect the existing setting.
  const { data: selectedStore } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: storeId } }),
    enabled: Boolean(storeId) && !isEdit,
  });
  const isDialLockOnly = !isEdit && selectedStore?.brandEnum === 'Fit365';

  // API-100 §6.3 #3: re-shaping regenerates the slots, so it needs every slot `available`
  const { data: locker } = useQuery({
    ...adminLockerControllerGetLockerOptions({ path: { lockerId: lockerId ?? '' } }),
    enabled: isEdit && Boolean(lockerId),
  });
  const hasActiveSlots = Boolean(
    locker && locker.slotSummary.inUse + locker.slotSummary.pendingRelease > 0,
  );
  const isReshapeLocked = isEdit && hasActiveSlots;

  const optionLabel =
    pickedOption?.id === optionId
      ? pickedOption?.name
      : locker?.optionId === optionId
        ? (locker?.optionName ?? undefined)
        : undefined;

  useEffect(() => {
    if (!isDialLockOnly) return;

    if (form.getValues('lockMethod') !== 'dial_lock') {
      form.setValue('lockMethod', 'dial_lock', { shouldDirty: true });
    }

    const settings = form.getValues('slotLockSettings') ?? [];
    if (settings.some((setting) => setting.lockMethod !== 'dial_lock')) {
      form.setValue(
        'slotLockSettings',
        settings.map((setting) =>
          setting.lockMethod !== 'dial_lock'
            ? { ...setting, lockMethod: 'dial_lock' as const }
            : setting,
        ),
        { shouldDirty: true },
      );
    }
  }, [form, isDialLockOnly]);

  const handleSlotSettingChange = (slotCode: string, setting: LockerSlotLockSettingFormValue) => {
    const current = form.getValues('slotLockSettings') ?? [];
    const defaultMethod = form.getValues('lockMethod');
    const isDefault = setting.lockMethod === defaultMethod && !setting.pinCode;

    const withoutCurrent = current.filter((item) => item.slotCode !== slotCode);
    const next = isDefault ? withoutCurrent : [...withoutCurrent, setting];
    form.setValue('slotLockSettings', next, { shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">ロッカー構成</CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        {isReshapeLocked ? (
          <div className="bg-warning/10 border-warning/20 mb-4 rounded-lg border px-4 py-3">
            <p className="text-warning text-xs">
              使用中・開放待ちのスロットがあるため、形状・番号付与パターンは変更できません。すべてのスロットが「利用可」の場合のみ変更できます（変更するとスロットが再生成されます）。
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="shapeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  形状<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  value={field.value || null}
                  onValueChange={field.onChange}
                  disabled={isReshapeLocked}
                >
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="選択してください">
                        {field.value ? LOCKER_SHAPE_TYPE_LABELS[field.value] : undefined}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LOCKER_SHAPE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
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
            name="orderType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  スロット番号付与パターン<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isReshapeLocked}
                >
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue>{LOCKER_ORDER_TYPE_LABELS[field.value]}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LOCKER_ORDER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-xs">
                  形状と番号付与パターンに基づき、スロット番号は自動採番されます（手動での番号指定はできません）
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* TODO(round3) R308: 「オプション契約」 type select (なし / スタンダード / プレミアムロッカー)
              gated the 契約形態コード select — prototype-only: E-01 FR-001 lists only
              契約形態コード and the API has no option-type field (`optionId` is nullable instead).
              Integrate in phase 2 if the spec defines it. */}

          <FormField
            control={form.control}
            name="optionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>契約形態コード</FormLabel>
                <FormControl>
                  <LockerOptionMasterSelect
                    value={field.value ?? ''}
                    valueLabel={optionLabel}
                    storeId={storeId}
                    placeholder="G-02 オプション管理から選択"
                    searchPlaceholder="契約形態コード・名称で検索"
                    emptyMessage="該当する契約形態コードがありません"
                    triggerClassName="h-8 w-full text-sm"
                    hasError={Boolean(form.formState.errors.optionId)}
                    onSelect={(option) => {
                      setPickedOption(option);
                      field.onChange(option?.id ?? null);
                    }}
                  />
                </FormControl>
                <p className="text-muted-foreground mt-1 text-xs">
                  全スロットに初期適用される料金体系コードです
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="openMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  開閉方法（デフォルト）<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="選択してください">
                        {LOCKER_OPEN_METHOD_LABELS[field.value]}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LOCKER_OPEN_METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
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
            name="lockMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  施錠方法（デフォルト）<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue>{LOCKER_LOCK_METHOD_LABELS[field.value]}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LOCKER_SELECTABLE_LOCK_METHODS.map((value) => (
                      <SelectItem
                        key={value}
                        value={value}
                        disabled={isDialLockOnly && value !== 'dial_lock'}
                      >
                        {LOCKER_LOCK_METHOD_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-xs">
                  スロットごとに個別変更できます（下表参照）
                </p>
                {isDialLockOnly ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    FIT365店舗の新規ロッカーはダイヤル式のみ選択できます
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          {/* E-01 FR-002: slot size W×H×D (default for the whole locker; shown on the member-facing screen per FR-010) */}
          <FormItem className="md:col-span-2">
            <FormLabel>
              スロットサイズ（W×H×D・デフォルト）
              <span className="text-destructive ml-0.5">*</span>
            </FormLabel>
            <div className="flex flex-wrap items-start gap-3">
              {(
                [
                  { name: 'slotSize.widthCm', label: '横幅', placeholder: '35' },
                  { name: 'slotSize.heightCm', label: '高さ', placeholder: '40' },
                  { name: 'slotSize.depthCm', label: '奥行き', placeholder: '48' },
                ] as const
              ).map((dimension) => (
                <FormField
                  key={dimension.name}
                  control={form.control}
                  name={dimension.name}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{dimension.label}:</span>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            maxLength={3}
                            placeholder={dimension.placeholder}
                            className="h-8 w-16 text-sm"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(event) =>
                              field.onChange(event.target.value.replace(/\D/g, ''))
                            }
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              単位:
              cm。会員向けスロット選択画面に表示されます。スロット単位の個別変更は「スロット個別設定」から行えます
            </p>
          </FormItem>
        </div>

        {shapeType && locationCode ? (
          <SlotGridPreview
            shapeType={shapeType}
            prefix={locationCode}
            startNum={LOCKER_SLOT_START_NUMBER}
            orderType={orderType}
          />
        ) : null}

        {/* D14: per-slot overrides are sent right after creation; once created, slots are
            edited on the スロット管理 tab */}
        {!isEdit && shapeType && locationCode ? (
          <SlotLockSettingsTable
            shapeType={shapeType}
            prefix={locationCode}
            startNum={LOCKER_SLOT_START_NUMBER}
            orderType={orderType}
            defaultLockMethod={lockMethod}
            slotSettings={slotLockSettings}
            dialLockOnly={isDialLockOnly}
            onSlotSettingChange={handleSlotSettingChange}
          />
        ) : null}

        <div className="mt-4">
          {isEdit && lockerId ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={() => router.push(`${navigate('/lockers/[id]', lockerId)}?tab=slots`)}
            >
              <Settings2 className="size-4" />
              スロット個別設定（詳細画面で設定）
            </Button>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2 text-sm" disabled>
              <Settings2 className="size-4" />
              スロット個別設定（保存後に設定可能）
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
