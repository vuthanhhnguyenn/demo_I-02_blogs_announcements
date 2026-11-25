'use client';

import { useFormContext } from 'react-hook-form';

import { format } from 'date-fns';

import { RequiredMark } from '@/components/common/field-marker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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

import { formatShortId } from '../../_utils/device-api.util';
import {
  EQUIPMENT_AUTH_METHOD_LABELS,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_TYPE_LABELS,
} from '../_constants/constants';
import {
  EQUIPMENT_AUTH_VALUES,
  EQUIPMENT_CREATABLE_TYPE_VALUES,
  EQUIPMENT_LOCATION_MAX_LENGTH,
  EQUIPMENT_NAME_MAX_LENGTH,
  EQUIPMENT_SERIAL_MAX_LENGTH,
  EQUIPMENT_STATUS_VALUES,
  type EquipmentFormValues,
} from '../_schemas/equipment-form.schema';

export function EquipmentFormBasicInfo({ equipmentId }: { equipmentId?: string }) {
  // A device is never registered as 廃棄 (BE-REQUESTS No.16, settled 2026-10-16: the history starts
  // with an `install` row, and the API refuses it with 400 E-VAL-001). 新規登録 offers 正常 /
  // 異常 / メンテナンス中 only; edit and the status dialog keep all four.
  const statusOptions = equipmentId
    ? EQUIPMENT_STATUS_VALUES
    : EQUIPMENT_STATUS_VALUES.filter((status) => status !== 'discarded');
  const form = useFormContext<EquipmentFormValues>();

  /**
   * A new 入退館ゲート starts with 主契約判定 ON + 「全て」 (prototype 11/7): a gate lets in anyone
   * with a valid main contract. Only while the rule is untouched — and switching to another type
   * still untouched clears it again. "Untouched" = the rule still holds one of the two states
   * this default writes (empty, or 主契約 ON + 全て with nothing else), read from the values so it
   * does not depend on RHF's dirty-field subscription.
   */
  const applyGateRuleDefault = (type: string) => {
    if (equipmentId) return;
    const rule = form.getValues('usage_control_rule');
    const isUntouched =
      !rule.service_enabled &&
      rule.service_types.length === 0 &&
      rule.main_contract_types.length === 0 &&
      ((!rule.main_enabled && rule.main_scope === '') ||
        (rule.main_enabled && rule.main_scope === 'all'));
    if (!isUntouched) return;
    const isGate = type === 'entry_gate';
    form.setValue('usage_control_rule.main_enabled', isGate);
    form.setValue('usage_control_rule.main_scope', isGate ? 'all' : '');
    form.setValue('usage_control_rule.main_contract_types', []);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">基本情報</CardTitle>
      </CardHeader>
      <CardContent className="px-6">
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <FormItem>
            <FormLabel>接続機器ID</FormLabel>
            <FormControl>
              <Input
                className="bg-muted/30"
                value={equipmentId ? formatShortId(equipmentId) : '（自動採番）'}
                title={equipmentId}
                disabled
              />
            </FormControl>
          </FormItem>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  機器名
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="機器名を入力"
                    maxLength={EQUIPMENT_NAME_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="equipment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  機器タイプ
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  {/* deviceType is immutable after create in API-103 (PATCH → E-VAL-001, D4). */}
                  <Select
                    value={field.value || ''}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value) applyGateRuleDefault(value);
                    }}
                    disabled={Boolean(equipmentId)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="選択してください">
                        {field.value ? EQUIPMENT_TYPE_LABELS[field.value] : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_CREATABLE_TYPE_VALUES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {EQUIPMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  シリアルナンバー
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="シリアルナンバーを入力"
                    maxLength={EQUIPMENT_SERIAL_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="install_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  設置場所
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="例: 1F入口"
                    maxLength={EQUIPMENT_LOCATION_MAX_LENGTH}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="installed_on"
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  設置日
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value ? new Date(field.value) : undefined}
                    onDateChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                    placeholder="設置日を選択"
                    hasError={Boolean(fieldState.error)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  状態
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{EQUIPMENT_STATUS_LABELS[field.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {EQUIPMENT_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="authentication_method"
            render={({ field, fieldState }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>
                  認証方式
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(method) => {
                      field.onChange(method);
                      // API-103: なし devices carry no relay output port.
                      if (method === 'none') {
                        form.setValue('output_port', '', { shouldDirty: true });
                      }
                    }}
                    className="flex flex-wrap items-center gap-6 pt-1"
                  >
                    {EQUIPMENT_AUTH_VALUES.map((method) => (
                      <div key={method} className="flex items-center gap-2">
                        <RadioGroupItem
                          value={method}
                          id={`auth-${method}`}
                          className={
                            fieldState.error ? 'border-destructive text-destructive' : undefined
                          }
                        />
                        <Label
                          htmlFor={`auth-${method}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {EQUIPMENT_AUTH_METHOD_LABELS[method]}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
