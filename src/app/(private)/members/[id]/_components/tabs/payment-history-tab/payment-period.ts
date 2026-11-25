import type { DateRange } from 'react-day-picker';

import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';

import type { AdminMemberFinancialControllerPaymentsData } from '@/lib/api-real/types.gen';

/**
 * Period filter for the payment ledger. The payment summary filters on the same value,
 * so the tab owns the state and shares it with both cards.
 *
 * The real API takes a `from`/`to` window rather than a named period, so the vocabulary is
 * declared here and translated by `periodToRange` at the call site.
 */
export type PaymentPeriod = 'all' | 'thisMonth' | 'lastMonth' | '3months' | '6months' | 'custom';

/** `YYYY-MM-DD` — the only shape the `from`/`to` bounds accept. */
function toDateParam(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Translates one option into the `from`/`to` window the real payment/billing endpoints accept.
 *
 * The window is measured in the operator's own timezone: reading today's date off
 * `toISOString()` answers in UTC, which is still the previous day through the JST morning — 今月
 * asked on the 1st would then send the month before. `subMonths` also clamps the day to the
 * target month's length, so 31 May minus 3 months is 28 February rather than 3 March.
 */
export function periodToRange(
  period: PaymentPeriod,
  customRange?: DateRange,
): { from?: string; to?: string } {
  if (period === 'all') return {};
  if (period === 'custom') {
    return {
      ...(customRange?.from && { from: toDateParam(customRange.from) }),
      ...(customRange?.to && { to: toDateParam(customRange.to) }),
    };
  }

  const today = new Date();

  switch (period) {
    case 'thisMonth':
      return { from: toDateParam(startOfMonth(today)) };
    case 'lastMonth': {
      // 先月 is a closed window: without the upper bound the API also returns the current month.
      const lastMonth = subMonths(today, 1);
      return { from: toDateParam(startOfMonth(lastMonth)), to: toDateParam(endOfMonth(lastMonth)) };
    }
    case '3months':
      return { from: toDateParam(subMonths(today, 3)) };
    case '6months':
      return { from: toDateParam(subMonths(today, 6)) };
  }
}

/** `Record` (not an array) so a period added to the schema fails to compile until labelled. */
const PAYMENT_PERIOD_LABELS: Record<PaymentPeriod, string> = {
  all: '全期間',
  thisMonth: '今月',
  lastMonth: '先月',
  '3months': '過去3ヶ月',
  '6months': '過去6ヶ月',
  custom: '期間指定',
};

export const PAYMENT_PERIOD_OPTIONS: Array<{ value: PaymentPeriod; label: string }> = (
  Object.keys(PAYMENT_PERIOD_LABELS) as PaymentPeriod[]
).map((value) => ({ value, label: PAYMENT_PERIOD_LABELS[value] }));

/** The 種別 filter values the API takes; `all` is its own default. Shared with the summary card. */
export type PaymentType = NonNullable<
  NonNullable<AdminMemberFinancialControllerPaymentsData['query']>['transactionType']
>;

/** Title label for the summary: a custom window names its dates rather than the generic option. */
export function getPeriodLabel(period: PaymentPeriod, customRange?: DateRange): string {
  if (period === 'custom' && customRange?.from) {
    const from = format(customRange.from, 'yyyy/MM/dd');
    return `${from}〜${customRange.to ? format(customRange.to, 'yyyy/MM/dd') : ''}`;
  }
  return PAYMENT_PERIOD_LABELS[period];
}
