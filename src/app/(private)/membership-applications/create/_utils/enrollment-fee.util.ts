import type { PriceEstimateResponseDto } from '@/lib/api-real/types.gen';

export interface EnrollmentFeeBreakdown {
  /** 入会金 list price, as served — JOYFIT only (null for FIT365). */
  enrollmentFee: number | null;
  /** Campaign discount on 入会金, as served, capped at the list price. */
  enrollmentFeeDiscount: number;
  registrationFee: number | null;
  cardIssuanceFee: number | null;
  /** 初月会費（日割）, as served. */
  proratedFee: number | null;
  /** 翌月会費, as served — null when the plan prepays one month only. */
  monthlyFee: number | null;
  /** `price-estimate.totalInitial` as served — never re-summed. */
  total: number | null;
}

/**
 * Initial-charge breakdown for the form and its confirm dialog (FR-M006), read from the
 * `price-estimate` response (the same §4.3 keys as `calculatedAmounts`). The campaign
 * discount is folded into the 入会金 line (prototype 9/17). Every amount is as served (API-098
 * v1.17 formula) — nothing is computed client-side.
 */
export function calcEnrollmentFees(
  estimate: PriceEstimateResponseDto | null,
): EnrollmentFeeBreakdown {
  const enrollmentFee = estimate?.enrollmentFee ?? null;
  const enrollmentFeeDiscount =
    enrollmentFee !== null ? Math.min(estimate?.enrollmentFeeDiscount ?? 0, enrollmentFee) : 0;

  return {
    enrollmentFee,
    enrollmentFeeDiscount,
    registrationFee: estimate?.registrationFee ?? null,
    cardIssuanceFee: estimate?.cardIssueFee ?? null,
    proratedFee: estimate?.firstMonthProratedFee ?? null,
    monthlyFee: estimate?.nextMonthFee ?? null,
    total: estimate?.totalInitial ?? null,
  };
}
