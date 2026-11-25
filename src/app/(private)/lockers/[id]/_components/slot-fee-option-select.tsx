'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { OptionListItemDto } from '@/lib/api-real/types.gen';

import { formatLockerFee } from '../../_utils/locker-fee.util';

/** Select value standing for `feeOptionId: null` — the slot falls back to the cabinet default */
export const SLOT_FEE_OPTION_DEFAULT = '__cabinet_default__';

interface SlotFeeOptionSelectProps {
  /** A fee option id, or `SLOT_FEE_OPTION_DEFAULT` */
  value: string;
  onChange: (value: string) => void;
  /** Locker fee options (G-02 master); inactive ones are not offered (API-101 §6.5 rejects them) */
  feeOptions: OptionListItemDto[];
  /** The cabinet default for this slot, shown on the default item */
  defaultOption: OptionListItemDto | undefined;
  className?: string;
}

/** FR-013 契約種類: the per-slot fee override (any slot — API-101 v0.15) */
export function SlotFeeOptionSelect({
  value,
  onChange,
  feeOptions,
  defaultOption,
  className,
}: SlotFeeOptionSelectProps) {
  const selectable = feeOptions.filter((option) => option.isActive);
  const defaultLabel = `キャビネット設定（${defaultOption?.name ?? '未設定'}）`;
  const selectedLabel =
    value === SLOT_FEE_OPTION_DEFAULT
      ? defaultLabel
      : feeOptions.find((option) => option.id === value)?.name;

  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="契約種類を選択...">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SLOT_FEE_OPTION_DEFAULT}>{defaultLabel}</SelectItem>
        {selectable.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <span className="flex items-center gap-2">
              <span>{option.name}</span>
              <span className="text-muted-foreground text-[10px]">
                {formatLockerFee(option)}/月
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function fromFeeOptionSelectValue(value: string): string | null {
  return value === SLOT_FEE_OPTION_DEFAULT ? null : value;
}
