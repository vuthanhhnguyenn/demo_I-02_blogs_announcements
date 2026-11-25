import { formatDate } from '@/utils/format.util';

import type { MemberBillingDto } from '@/lib/api-real/types.gen';

/** The billing fields the 請求日 rule reads — structural so any billing DTO can pass. */
type BillingDateSource = Pick<MemberBillingDto, 'billingType' | 'billingMonth' | 'createdAt'>;

/**
 * 請求日 for a billing row, as `YYYY/MM/DD`.
 *
 * The API exposes no issue-date field; BE's answer (2026-09-17) is that everything needed is
 * already in the response, derived per billing type:
 *   - `monthly` / `carryover` → the 1st of `billingMonth`;
 *   - every other type (`per_use` / `enrollment` / `withdrawal` / `transfer` / `manual`) → the
 *     date part of `createdAt`.
 *
 * `createdAt` must NOT stand in for the first branch: for monthly bills it is the batch
 * generation date, which falls in the previous month. When `billingMonth` is absent there is no
 * source at all, so the cell stays empty rather than showing a plausible wrong date.
 *
 * The `billingMonth` branch builds the string directly instead of going through `Date`:
 * `new Date('2026-06-01')` is UTC midnight, which renders as the previous day for a viewer west
 * of UTC. `formatDate` handles that conversion for the `createdAt` branch (ISO 8601 UTC → JST).
 */
export function formatBillingDate(item: BillingDateSource, fallback: string = '—'): string {
  if (item.billingType === 'monthly' || item.billingType === 'carryover') {
    return item.billingMonth ? `${item.billingMonth.replace('-', '/')}/01` : fallback;
  }
  return formatDate(item.createdAt, fallback);
}

/** 請求月 as `2026年4月` (prototype); `billingMonth` is `YYYY-MM`, null for non-monthly bills. */
export function formatBillingMonth(billingMonth: string | null, fallback: string = '—'): string {
  if (!billingMonth) return fallback;
  const [year, month] = billingMonth.split('-');
  return month ? `${year}年${Number(month)}月` : billingMonth;
}

/** The badge vocabulary of the 請求一覧 table. */
export type BillingBadgeStatus =
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'refunded'
  | 'uncollected'
  | 'written-off'
  | 'cancelled';

type BillingStatusSource = Pick<MemberBillingDto, 'collectionStatus' | 'confirmStatus'>;

/**
 * The single badge for a billing row.
 *
 * The real API splits the mock's one `status` into a confirm state and a collection state, so the
 * precedence rule lives here: collection wins once it has moved off `not_due`, otherwise the
 * confirm state is shown. A-01 FR-009 leaves the vocabulary open (「未確定・確定・未回収・貸倒等」),
 * and F-01 keeps 返金 on its own axis, hence the extra 返金済み / キャンセル badges.
 *
 * The switch is exhaustive on purpose: `collectionStatus` gained `in_transit`,
 * `partially_refunded` and `fully_refunded` on 2026-09-17 and the previous if-chain swallowed them
 * silently. The `never` default makes the next enum change a type error instead.
 */
export function toBillingBadgeStatus(item: BillingStatusSource): BillingBadgeStatus {
  switch (item.collectionStatus) {
    case 'collected':
      return 'paid';
    case 'partially_refunded':
    case 'fully_refunded':
      return 'refunded';
    case 'uncollected':
      return 'uncollected';
    case 'written_off':
      return 'written-off';
    case 'cancelled':
      return 'cancelled';
    // Not collected yet (`not_due`) or collection under way (`in_transit`): the confirm state is
    // what the row has to say.
    case 'not_due':
    case 'in_transit':
      return item.confirmStatus === 'confirmed' ? 'confirmed' : 'pending';
    default: {
      const exhaustive: never = item.collectionStatus;
      return exhaustive;
    }
  }
}
