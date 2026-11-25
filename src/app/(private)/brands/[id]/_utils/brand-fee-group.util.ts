import { formatDateYYYYMMDD } from '@/utils/date.util';

import type {
  SubBrandDto,
  SubBrandFeeDetailDto,
  SubBrandFeeItemDto,
  SubBrandScheduledFeeDto,
} from '@/lib/api-real/types.gen';

import {
  BRAND_GROUP_FEE_TYPES,
  type BrandGroup,
  FEE_TYPE_LABELS,
  type FeeType,
  SUB_BRAND_LABELS,
} from '../../_constants/brand-real.constants';
import type {
  BrandFeeGroup,
  BrandFeeItem,
  BrandFeeScheduledChange,
} from '../_types/brand-fee.type';

/**
 * `effectiveDate` arrives as a plain calendar date (`2026-04-23`) with no time component. Swapping
 * the separators keeps it a calendar date; routing it through `Date` would re-interpret it as UTC
 * midnight and can shift the day depending on the viewer's timezone.
 */
export function formatEffectiveDate(value: string): string {
  return value.replaceAll('-', '/');
}

/** The inverse of `formatEffectiveDate` — the form's `YYYY/MM/DD` back to the API's `YYYY-MM-DD`. */
export function toApiDate(value: string): string {
  return value.replaceAll('/', '-');
}

type MaintenanceCadence = Pick<
  SubBrandDto,
  'maintenanceFeeStartMonth' | 'maintenanceFeeCycleMonth'
>;

/**
 * Y-07 FR-002 describes FIT365's maintenance fee as 「入会3ヶ月目 税込（1年ごと）」, i.e. the amount
 * alone does not convey the charge, and the V0 prototype carries it as a caption on the fee item
 * (`feeItem1Note: "入会3ヶ月目に発生・以後1年ごと（税込）"`). The prototype hard-codes that string;
 * here it is derived from `maintenanceFeeStartMonth` / `maintenanceFeeCycleMonth` (live: 3 / 12).
 * `null` on both means one-time / none — no caption.
 */
export function buildMaintenanceNote(cadence: MaintenanceCadence): string | null {
  const { maintenanceFeeStartMonth: start, maintenanceFeeCycleMonth: cycle } = cadence;
  if (start === null && cycle === null) return null;

  const cycleLabel = cycle === null ? null : cycle === 12 ? '1年ごと' : `${cycle}ヶ月ごと`;

  if (start !== null && cycleLabel) return `入会${start}ヶ月目に発生・以後${cycleLabel}（税込）`;
  if (start !== null) return `入会${start}ヶ月目に発生（税込）`;

  return `${cycleLabel}（税込）`;
}

function toScheduledChange(fee: SubBrandScheduledFeeDto): BrandFeeScheduledChange {
  return {
    feeId: fee.id,
    effectiveStartDate: formatEffectiveDate(fee.effectiveDate),
    valueIncludingTaxYen: fee.priceInclTax,
    registeredAt: formatDateYYYYMMDD(fee.createdAt, '—'),
    // Seeded generations carry no inserter (API-074: "null for seeded rows").
    registeredBy: fee.createdByName ?? '—',
  };
}

function buildFeeItem(
  feeType: FeeType,
  source: SubBrandFeeItemDto | undefined,
  note: string | null,
): BrandFeeItem {
  const current = source?.current ?? null;

  return {
    feeType,
    itemName: FEE_TYPE_LABELS[feeType],
    note: feeType === 'maintenanceFee' ? note : null,
    currentValueIncludingTaxYen: current?.priceInclTax ?? null,
    effectiveStartDate: current ? formatEffectiveDate(current.effectiveDate) : null,
    // The API already orders them soonest first.
    scheduledChanges: (source?.scheduled ?? []).map(toScheduledChange),
  };
}

interface BuildFeeGroupInput {
  brandGroup: BrandGroup;
  parentBrandName: string;
  /** `true` for JOYFIT (4 sub-brands): cards and dialogs then name the sub-brand. */
  hasMultipleSubBrands: boolean;
  subBrand: SubBrandDto;
  /** `GET .../sub-brands/{brandEnum}`; `undefined` until it lands. */
  detail: SubBrandFeeDetailDto | undefined;
}

/**
 * Builds one 費用タブ card from the sub-brand detail (`GET .../sub-brands/{brandEnum}`), which is
 * also the response shape of every fee write — so a save can drop its response straight into the
 * cache and this function re-derives the card.
 *
 * Only the fee types the brand actually charges are rendered (`BRAND_GROUP_FEE_TYPES`, Y-07
 * FR-002) — the API returns all four per sub-brand and zeroes the ones that do not apply.
 */
export function buildFeeGroup({
  brandGroup,
  parentBrandName,
  hasMultipleSubBrands,
  subBrand,
  detail,
}: BuildFeeGroupInput): BrandFeeGroup {
  const feeTypes: readonly FeeType[] = BRAND_GROUP_FEE_TYPES[brandGroup];
  const note = buildMaintenanceNote(detail ?? subBrand);
  const itemsByType = new Map((detail?.feeItems ?? []).map((item) => [item.feeType, item]));
  // The FE label, not `subBrand.displayName`: the API spells JOYFIT＋ with a half-width 「+」.
  const subBrandName = SUB_BRAND_LABELS[subBrand.brandEnum] ?? subBrand.displayName;

  return {
    brandGroup,
    subBrandEnum: subBrand.brandEnum,
    title: hasMultipleSubBrands ? `${parentBrandName} / ${subBrandName}` : parentBrandName,
    ownerName: hasMultipleSubBrands ? subBrandName : parentBrandName,
    ownerLabel: hasMultipleSubBrands
      ? `サブブランド「${subBrandName}」`
      : `ブランド「${parentBrandName}」`,
    // The sub-brand detail is refreshed by every fee write, so it wins over the brand detail.
    feeMasterStatus: detail?.feeMasterStatus ?? subBrand.feeMasterStatus ?? 'active',
    feeItems: feeTypes.map((feeType) => buildFeeItem(feeType, itemsByType.get(feeType), note)),
  };
}
