import { isBefore, isValid, parse, startOfDay } from 'date-fns';

import type { RegisterBrandFeeMasterDto, UpdateBrandFeeCardDto } from '@/lib/api-real/types.gen';

import type { BrandFeeGroupFormValues } from '../_schemas/brand-fee-group-form.schema';
import type { BrandFeeGroup, BrandFeeSheetMode } from '../_types/brand-fee.type';
import { toApiDate } from './brand-fee-group.util';

export function parseDateValue(value: string): Date | undefined {
  const parsed = parse(value, 'yyyy/MM/dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

export function isPastDate(value: string): boolean {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return isBefore(startOfDay(parsed), startOfDay(new Date()));
}

export function formatFeeValueInput(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }

  return String(value);
}

/**
 * 変更 prefills the card as it stands; 登録 (a deleted master's ［＋登録］) starts from the brand's
 * fixed fee items with empty 定価 / 有効開始日 and no 予約 — the register body has no schedules, and
 * the prototype adds them later through 変更.
 */
export function buildDefaultValues(
  feeGroup: BrandFeeGroup | null,
  mode: BrandFeeSheetMode,
): BrandFeeGroupFormValues {
  if (!feeGroup) {
    return { feeItems: [] };
  }

  return {
    feeItems: feeGroup.feeItems.map((item) =>
      mode === 'register'
        ? {
            feeType: item.feeType,
            itemName: item.itemName,
            originalEffectiveStartDate: null,
            effectiveStartDate: '',
            currentValueIncludingTaxYen: Number.NaN,
            scheduledChanges: [],
          }
        : {
            feeType: item.feeType,
            itemName: item.itemName,
            originalEffectiveStartDate: item.effectiveStartDate,
            effectiveStartDate: item.effectiveStartDate ?? '',
            currentValueIncludingTaxYen: item.currentValueIncludingTaxYen ?? Number.NaN,
            scheduledChanges: item.scheduledChanges.map((change) => ({
              effectiveStartDate: change.effectiveStartDate,
              valueIncludingTaxYen: change.valueIncludingTaxYen,
            })),
          },
    ),
  };
}

/**
 * The card as the 変更 sheet leaves it — `PATCH .../fees` diffs it against storage in one
 * transaction. `scheduledChanges` is always the full list: a stored 予約 missing from it is
 * cancelled. `priceInclTax` goes verbatim and `taxRate` is omitted (plan D13).
 */
export function toUpdateFeeCardBody(values: BrandFeeGroupFormValues): UpdateBrandFeeCardDto {
  return {
    feeItems: values.feeItems.map((item) => ({
      feeType: item.feeType,
      priceInclTax: item.currentValueIncludingTaxYen,
      effectiveDate: toApiDate(item.effectiveStartDate),
      scheduledChanges: item.scheduledChanges.map((change) => ({
        effectiveDate: toApiDate(change.effectiveStartDate),
        priceInclTax: change.valueIncludingTaxYen,
      })),
    })),
  };
}

export function toRegisterFeeMasterBody(
  values: BrandFeeGroupFormValues,
): RegisterBrandFeeMasterDto {
  return {
    items: values.feeItems.map((item) => ({
      feeType: item.feeType,
      priceInclTax: item.currentValueIncludingTaxYen,
      effectiveDate: toApiDate(item.effectiveStartDate),
    })),
  };
}
