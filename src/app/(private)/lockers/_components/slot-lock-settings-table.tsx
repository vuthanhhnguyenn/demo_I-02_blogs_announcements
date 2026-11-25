'use client';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import { Info } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  LOCKER_LOCK_METHOD_LABELS,
  LOCKER_SELECTABLE_LOCK_METHODS,
  LOCKER_SHAPE_GRID,
  type LockerOrderType,
  type LockerShapeType,
} from '../_constants/locker-enum-labels.constants';
import type {
  LockerSelectableLockMethod,
  LockerSlotLockSettingFormValue,
} from '../_schemas/locker-form.schema';
import { buildLockerSlotPositions } from '../_utils/locker-slot-numbering.util';

type SlotLockSettingsTableProps = {
  shapeType: LockerShapeType;
  prefix: string;
  startNum: number;
  orderType: LockerOrderType;
  defaultLockMethod: LockerSelectableLockMethod;
  slotSettings: LockerSlotLockSettingFormValue[];
  /** New FIT365 lockers only allow dial locks (BR-LCK-009): disable the other lock methods */
  dialLockOnly?: boolean;
  onSlotSettingChange: (slotCode: string, setting: LockerSlotLockSettingFormValue) => void;
};

function findSlotSetting(
  settings: LockerSlotLockSettingFormValue[],
  slotCode: string,
): LockerSlotLockSettingFormValue | undefined {
  return settings.find((setting) => setting.slotCode === slotCode);
}

export function SlotLockSettingsTable({
  shapeType,
  prefix,
  startNum,
  orderType,
  defaultLockMethod,
  slotSettings,
  dialLockOnly = false,
  onSlotSettingChange,
}: SlotLockSettingsTableProps) {
  if (!prefix || !shapeType) return null;

  const slots = buildLockerSlotPositions(prefix, shapeType, orderType, startNum);
  if (slots.length === 0) return null;
  const { rows } = LOCKER_SHAPE_GRID[shapeType];
  // The PIN is stored on save, so a complete PIN entered here is dated today (E-01 FR-009)
  const today = formatDateYYYYMMDD(new Date());

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-2">
        <Info className="text-muted-foreground size-4" />
        <p className="text-muted-foreground text-xs">
          スロットごとに施錠方法を個別変更できます。変更しない場合は上記「施錠方法（デフォルト）」が適用されます。登録後の変更はスロット管理タブから行えます。
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2 text-left text-xs font-semibold">スロット番号</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">位置</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">状態</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">施錠方法</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">
                暗証番号（ダイヤル錠のみ）
              </th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const customized = findSlotSetting(slotSettings, slot.slotCode);
              const setting: LockerSlotLockSettingFormValue = customized ?? {
                slotCode: slot.slotCode,
                lockMethod: defaultLockMethod,
                pinCode: '',
              };
              // Highlight a row that carries an explicit per-slot setting (a PIN counts) or whose
              // lock method differs from the default — either way it is no longer "just the default".
              const isCustomized =
                customized !== undefined || setting.lockMethod !== defaultLockMethod;
              // E-01 FR-009 error case: input other than 4 digits is a validation error
              const isPinInvalid =
                setting.lockMethod === 'dial_lock' &&
                Boolean(setting.pinCode) &&
                setting.pinCode?.length !== 4;

              return (
                <tr
                  key={slot.slotCode}
                  className={`border-b last:border-0 ${isCustomized ? 'bg-primary/10' : ''}`}
                >
                  <td className="px-3 py-2 text-xs font-medium">{slot.slotLabel}</td>
                  <td className="text-muted-foreground px-3 py-2 text-xs">
                    {rows - slot.rowIndex}段 {slot.columnIndex + 1}列
                  </td>
                  {/* Creation only: no slot is in use yet */}
                  <td className="text-muted-foreground px-3 py-2 text-xs">利用可</td>
                  <td className="px-3 py-2">
                    <Select
                      value={setting.lockMethod}
                      onValueChange={(value) => {
                        const lockMethod = value as LockerSelectableLockMethod;
                        onSlotSettingChange(slot.slotCode, {
                          slotCode: slot.slotCode,
                          lockMethod,
                          pinCode: lockMethod === 'dial_lock' ? (setting.pinCode ?? '') : '',
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 w-32.5 text-xs">
                        <SelectValue>{LOCKER_LOCK_METHOD_LABELS[setting.lockMethod]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {LOCKER_SELECTABLE_LOCK_METHODS.map((value) => (
                          <SelectItem
                            key={value}
                            value={value}
                            disabled={dialLockOnly && value !== 'dial_lock'}
                          >
                            {LOCKER_LOCK_METHOD_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    {setting.lockMethod === 'dial_lock' ? (
                      <div>
                        <Input
                          maxLength={4}
                          placeholder="0000"
                          value={setting.pinCode ?? ''}
                          aria-invalid={isPinInvalid || undefined}
                          onChange={(event) => {
                            const next = event.target.value.replace(/\D/g, '').slice(0, 4);
                            onSlotSettingChange(slot.slotCode, { ...setting, pinCode: next });
                          }}
                          className={`h-7 w-20 text-center font-mono text-xs tracking-widest ${
                            isPinInvalid ? 'border-destructive' : ''
                          }`}
                        />
                        {isPinInvalid ? (
                          <p className="text-destructive mt-1 text-xs">4桁で入力してください</p>
                        ) : null}
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          最終変更日: {setting.pinCode?.length === 4 ? today : '—'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">なし</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="bg-muted/30 text-muted-foreground border-t px-3 py-2 text-xs">
          全 {slots.length} スロット
          {slotSettings.length > 0 && (
            <span className="text-primary ml-2 font-medium">
              （{slotSettings.length}件 個別変更済み）
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
