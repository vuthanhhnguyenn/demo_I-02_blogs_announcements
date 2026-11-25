/** An option master row, or the fee block of a contract detail; `feeMonthly` is tax-included */
type FeeSource = { feeMonthly: number };

/** 「¥3,300」 */
export function formatLockerFee(option: FeeSource): string {
  return `¥${option.feeMonthly.toLocaleString()}`;
}
