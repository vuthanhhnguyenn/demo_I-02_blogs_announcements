import type {
  BrandGroup,
  FeeMasterStatus,
  FeeType,
  SubBrandEnum,
} from '../../_constants/brand-real.constants';

/** One 予約中の改定 — a `SubBrandScheduledFeeDto`. */
export interface BrandFeeScheduledChange {
  /** `brand_fees.id`. */
  feeId: string;
  effectiveStartDate: string;
  valueIncludingTaxYen: number;
  registeredAt: string;
  registeredBy: string;
}

/** One 費用項目 — a `feeType`, its current generation, and its pending schedules. */
export interface BrandFeeItem {
  feeType: FeeType;
  /** Fixed label from `FEE_TYPE_LABELS`; not editable (Y-07 FR-002, R307). */
  itemName: string;
  /** Charge cadence caption, e.g. 「入会3ヶ月目に発生・以後1年ごと（税込）」. `null` = none. */
  note: string | null;
  /** `null` when the sub-brand has no generation in force today for this fee type. */
  currentValueIncludingTaxYen: number | null;
  effectiveStartDate: string | null;
  scheduledChanges: BrandFeeScheduledChange[];
}

/** One 費用カード — a sub-brand and the 費用マスタ inside it. */
export interface BrandFeeGroup {
  brandGroup: BrandGroup;
  subBrandEnum: SubBrandEnum;
  /** Card heading: 「JOYFIT / JOYFIT24」, or just the brand name for a single-sub-brand brand. */
  title: string;
  /** `subBrand ?? brand` wording for the dialogs, e.g. サブブランド「JOYFIT24」 / ブランド「FIT365」. */
  ownerName: string;
  ownerLabel: string;
  feeMasterStatus: FeeMasterStatus;
  feeItems: BrandFeeItem[];
}

export type BrandFeeSheetMode = 'edit' | 'register';

/** What the fee sheet is open for. */
export interface BrandFeeSheetTarget {
  mode: BrandFeeSheetMode;
  feeGroup: BrandFeeGroup;
}
