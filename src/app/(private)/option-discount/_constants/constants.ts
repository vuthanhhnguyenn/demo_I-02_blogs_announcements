import { formatYen } from '@/utils/format.util';

import type { BrandEnumValue } from '@/components/common/brand-badge';

import type {
  AdminOptionControllerListData,
  OptionListItemDto,
  OptionSetDetailDto,
  OptionSetListItemDto,
} from '@/lib/api-real/types.gen';

import { isLockerContractType } from '../../options/_constants/constants';

export type OptionSetDiscountType = OptionSetListItemDto['discountType'];

/** 状態 as the list carries it in the URL — the API itself filters on the `isActive` boolean. */
export type OptionSetStatus = 'active' | 'inactive';

export function toOptionSetStatus(isActive: boolean): OptionSetStatus {
  return isActive ? 'active' : 'inactive';
}

export type OptionSetApplicationCondition = OptionSetDetailDto['applicationCondition'];

/** 適用条件 — the three fixed choices of G-02 (shared by the detail and the form). */
export const OPTION_SET_APPLICATION_CONDITION_LABELS: Record<
  OptionSetApplicationCondition,
  string
> = {
  simultaneous_only: '同時申込時',
  existing_members_included: '既存会員も対象',
  family_two_or_more: '家族2名以上',
};

/** G-02 FR-006 適用ルール: fixed business rules shared by every set, not stored per set. */
export const OPTION_SET_APPLICATION_RULES = [
  '常時募集（キャンペーンとは別物）',
  'セット内片方オプションの解除で割引解除、再追加で再適用',
  'キャンペーン併用時、金額変動オプションがあれば不発動',
] as const;

export const OPTION_DISCOUNT_TYPE_LABELS: Record<OptionSetDiscountType, string> = {
  fixed_amount: '定額値引',
  percentage: '定率値引',
};

/** Unit shown after the 割引金額/率 input once a type is picked. */
export const OPTION_DISCOUNT_VALUE_UNITS: Record<OptionSetDiscountType, string> = {
  fixed_amount: '円',
  percentage: '%',
};

export const OPTION_DISCOUNT_VALUE_PLACEHOLDERS: Record<OptionSetDiscountType, string> = {
  fixed_amount: '例: 330',
  percentage: '例: 10',
};

export const OPTION_DISCOUNT_TYPE_BADGE_CLASSES: Record<OptionSetDiscountType, string> = {
  fixed_amount: 'bg-info/15 text-info border-info/20',
  percentage: 'bg-warning/15 text-warning border-warning/20',
};

export const OPTION_DISCOUNT_STATUS_LABELS: Record<OptionSetStatus, string> = {
  active: '有効',
  inactive: '無効',
};

export const OPTION_DISCOUNT_STATUS_BADGE_CLASSES: Record<OptionSetStatus, string> = {
  active: 'bg-success/15 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

export function formatOptionDiscountValue(type: OptionSetDiscountType, value: number): string {
  if (type === 'percentage') {
    return `${value}%`;
  }

  return formatYen(value);
}

/**
 * Query for the 対象オプション candidates: set discounts are FIT365-only (G-02 前提条件 ブランド設定, #353) and the
 * API only accepts active options (422 E-SET-002), so only active FIT365 option masters are offered.
 * `limit` is the API maximum per page; `useTargetOptionCandidates` walks every page.
 */
export const TARGET_OPTION_CANDIDATES_QUERY = {
  brandEnum: 'Fit365',
  isActive: true,
  limit: 100,
} as const satisfies AdminOptionControllerListData['query'];

/** One checkbox row of 対象オプション. */
export interface TargetOptionCandidate {
  id: string;
  name: string;
  brandEnum: BrandEnumValue;
}

/**
 * A locker contract type (`locker_option`) is a slot's contract form, not an option a member holds,
 * so it is never offered for a set discount (E-01 ruling: set discounts follow member conditions).
 * An option the set already holds stays on the list, so saving an edit never drops it silently.
 */
export function toTargetOptionCandidates(
  options: OptionListItemDto[],
  currentItems: OptionSetDetailDto['items'] = [],
): TargetOptionCandidate[] {
  const candidates: TargetOptionCandidate[] = options
    .filter((option) => option.brandEnum === 'Fit365' && !isLockerContractType(option))
    .map((option) => ({ id: option.id, name: option.name, brandEnum: option.brandEnum }));
  const missing = currentItems
    .filter((item) => !candidates.some((candidate) => candidate.id === item.optionId))
    // `OptionSetItemDto.brandEnum` is typed as a bare string; every item is FIT365 (E-SET-002).
    .map((item) => ({ id: item.optionId, name: item.optionName, brandEnum: 'Fit365' as const }));
  return [...missing, ...candidates];
}
