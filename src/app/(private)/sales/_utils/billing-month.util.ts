/** F-01 #363: billing history can be viewed for 12 months back (the API itself accepts from 2020-01) */
const SALES_MONTH_LOOKBACK = 12;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function toMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth(): string {
  return toMonthString(new Date());
}

export function nextMonth(): string {
  const now = new Date();
  return toMonthString(new Date(now.getFullYear(), now.getMonth() + 1, 1));
}

/** FR-008 #305 / API-119 §8: the accounting CSV covers the previous month's confirmed data only */
export function previousMonth(): string {
  const now = new Date();
  return toMonthString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

function salesMonthMin(): string {
  const now = new Date();
  return toMonthString(new Date(now.getFullYear(), now.getMonth() - SALES_MONTH_LOOKBACK, 1));
}

function toMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** The sales list / summary month window (out-of-range months are refused with 400 E-VAL-001) */
export function isSalesMonthInRange(month: string): boolean {
  return MONTH_PATTERN.test(month) && month >= salesMonthMin() && month <= nextMonth();
}

export function isSalesPickerMonthEnabled(year: number, month: number): boolean {
  return isSalesMonthInRange(toMonth(year, month));
}

/** API-115 §8.1 `billingMonth` 適用月: the current month (JST) or later */
export function isManualBillingMonthAllowed(month: string): boolean {
  return MONTH_PATTERN.test(month) && month >= currentMonth();
}
