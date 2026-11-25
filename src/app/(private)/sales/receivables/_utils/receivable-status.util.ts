import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { format } from 'date-fns';

import {
  adminReceivableControllerKonbiniStatusQueryKey,
  adminReceivableControllerListQueryKey,
  adminReceivableControllerListUpcomingQueryKey,
  adminReceivableControllerMemberDetailQueryKey,
  adminSalesBillingControllerDetailQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  ReceivableDetailLineItemDto,
  ReceivableListItemDto,
  ReceivableMonthLineDto,
  ReceivableUnpaidBillingDto,
  UpcomingBillingItemDto,
} from '@/lib/api-real/types.gen';
import { lazyQueryIds } from '@/lib/query-id.util';

import { invalidateMemberSalesReads } from '../../_utils/sales-query.util';

/** F-01-02 — display mappers for API-117 receivables (016 plan T121 / D6 / D7) */

export type ReceivableDisplayStatus = ReceivableListItemDto['displayStatus'];
export type ReceivableSubStatus = ReceivableMonthLineDto['subStatus'];

/** FR-002-b vocabulary for BR-RCV-011 `displayStatus` (API-117 §11.11) */
export const RECEIVABLE_STATUS_LABELS: Record<ReceivableDisplayStatus, string> = {
  uncollected: '未回収',
  re_dunning: '再請求中',
  konbini_pending: 'コンビニ決済中',
  eligible_for_write_off: '貸倒対象',
  excluded: '貸倒対象外',
};

export const RECEIVABLE_STATUS_BADGE_CLASS: Record<ReceivableDisplayStatus, string> = {
  uncollected: 'bg-destructive/15 text-destructive border-destructive/20',
  re_dunning: 'bg-warning/15 text-warning border-warning/20',
  konbini_pending: 'bg-info/15 text-info border-info/20',
  eligible_for_write_off: 'bg-muted text-muted-foreground border-border',
  excluded: 'bg-success/15 text-success border-success/20',
};

/** Per-billing `subStatus` (BR-RCV-005) */
export const RECEIVABLE_SUB_STATUS_LABELS: Record<ReceivableSubStatus, string> = {
  uncollected: '未回収',
  konbini_pending: 'コンビニ決済中',
  eligible_for_write_off: '貸倒対象',
  excluded: '貸倒対象外',
};

export const RECEIVABLE_SUB_STATUS_BADGE_CLASS: Record<ReceivableSubStatus, string> = {
  uncollected: 'bg-destructive/15 text-destructive border-destructive/20',
  konbini_pending: 'bg-info/15 text-info border-info/20',
  eligible_for_write_off: 'bg-muted text-muted-foreground border-border',
  excluded: 'bg-success/15 text-success border-success/20',
};

type ReceivableItemType = ReceivableDetailLineItemDto['itemType'];

/**
 * 契約種別 per API-117 `items[].itemType` (= DBML `billing_item_type`). 主契約 / オプション follow the
 * prototype; the other values use the F-01 / DBML vocabulary instead of a blanket 「都度請求」.
 */
const ITEM_CONTRACT_TYPE_LABELS: Record<ReceivableItemType, string> = {
  monthly_plan: '主契約',
  option_monthly: 'オプション',
  enrollment_fee: '入会金',
  registration_fee: '登録事務手数料',
  prorated: '日割り',
  cancellation_fee: '解約手数料',
  campaign_discount: 'キャンペーン割引',
  enrollment_fee_waiver: '入会金免除',
  fee_adjustment: '会費調整',
  other_store_usage: '他店利用',
  lesson_fee: 'レッスン受講料',
  per_use_option: '都度オプション',
  suspension_fee: '休会費',
  prepaid: '先払い',
  penalty_recovery: '違約金',
  adjustment: '手動調整',
};

export function getItemContractTypeLabel(itemType: ReceivableItemType): string {
  // A value added to the DBML enum before the SDK is regenerated (e.g. option_set_discount) is
  // not in the map yet — show 「その他」 rather than a blank cell
  const labels: Readonly<Partial<Record<string, string>>> = ITEM_CONTRACT_TYPE_LABELS;
  return labels[itemType] ?? 'その他';
}

/**
 * 未納月 column (prototype `formatUnpaidMonths`): text 「最初〜最後（Nか月）」 instead of one badge per
 * month, which wraps badly for long arrears — the per-month breakdown lives in the detail sheet.
 */
export function formatUnpaidMonths(months: readonly string[]): string {
  if (months.length === 0) return '—';
  const sorted = [...months].sort((a, b) => a.localeCompare(b));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return sorted.length === 1 ? `${first}（1か月）` : `${first}〜${last}（${sorted.length}か月）`;
}

/** FR-007 / 用語定義「貸倒」: why a 貸倒対象 badge matters and how to stop it (prototype tooltip) */
export const BAD_DEBT_RULE_TOOLTIP =
  '貸倒対象外に指定されていない未納金は、月末に自動で貸倒処理されます（伝票日付は翌月1日・処理確定後は取り消し不可）。処理を止める場合は「貸倒対象外指定」を行ってください';

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), 'yyyy/MM/dd');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), 'yyyy/MM/dd HH:mm');
}

// ---------------------------------------------------------------------------------------------
// Per-billing action targets (D6 / B4)
// ---------------------------------------------------------------------------------------------

/** One billing an action targets — enough to name it in a dialog */
export interface ReceivableBillingTarget {
  billingId: string;
  targetMonth: string;
  amount: number;
}

/** API-117 §7.3 / BR-RCV-008: 1 path billing + ≤ 11 `additionalBillingIds` */
export const KONBINI_MAX_BILLINGS = 12;

type BillingLike = { billingId: string; targetMonth: string; subStatus: ReceivableSubStatus };

function toTarget(billing: BillingLike & ({ amount: number } | { outstandingAmount: number })) {
  return {
    billingId: billing.billingId,
    targetMonth: billing.targetMonth,
    amount: 'amount' in billing ? billing.amount : billing.outstandingAmount,
  };
}

/**
 * Konbini targets, oldest month first (the oldest becomes the path `billingId`, D6): billings that
 * already have a live slip are skipped (E-RCV-004), capped at 12 (E-RCV-006).
 */
export function getKonbiniTargets(
  billings: ReadonlyArray<ReceivableMonthLineDto | ReceivableUnpaidBillingDto>,
): ReceivableBillingTarget[] {
  return billings
    .filter((billing) => billing.subStatus !== 'konbini_pending')
    .map(toTarget)
    .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
    .slice(0, KONBINI_MAX_BILLINGS);
}

/** Bad-debt exclusion targets (API-117 §9, per billing): set → not yet excluded; release → excluded */
export function getExclusionTargets(
  billings: ReadonlyArray<ReceivableMonthLineDto | ReceivableUnpaidBillingDto>,
  mode: 'exclude' | 'release',
): ReceivableBillingTarget[] {
  return billings
    .filter((billing) =>
      mode === 'release' ? billing.subStatus === 'excluded' : billing.subStatus !== 'excluded',
    )
    .map(toTarget)
    .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth));
}

// ---------------------------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------------------------

const receivableQueryIds = lazyQueryIds(() => [
  adminReceivableControllerListQueryKey(),
  adminReceivableControllerListUpcomingQueryKey(),
  adminReceivableControllerMemberDetailQueryKey({ path: { memberId: '' } }),
  adminReceivableControllerKonbiniStatusQueryKey({ path: { billingId: '' } }),
  adminSalesBillingControllerDetailQueryKey({ path: { billingId: '' } }),
]);

/** Everything a receivable write (konbini / exclusion / bulk confirm) can change on screen */
export function invalidateReceivableQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey as QueryKey & [{ _id?: unknown } | undefined];
      return typeof key?._id === 'string' && receivableQueryIds().has(key._id);
    },
  });
  invalidateMemberSalesReads(queryClient);
}

/** Upcoming rows already in the cache, by billingId — names a failed bulk-confirm row */
export function getCachedUpcomingBillings(
  queryClient: QueryClient,
): Map<string, UpcomingBillingItemDto> {
  const rows = new Map<string, UpcomingBillingItemDto>();
  const entries = queryClient.getQueriesData<{ items?: UpcomingBillingItemDto[] }>({
    predicate: (query) => {
      const [key] = query.queryKey as QueryKey & [{ _id?: unknown } | undefined];
      return key?._id === 'adminReceivableControllerListUpcoming';
    },
  });
  for (const [, data] of entries) {
    for (const item of data?.items ?? []) rows.set(item.billingId, item);
  }
  return rows;
}
