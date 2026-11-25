'use client';

// Client component: nuqs-backed tab/filter/pagination state and React Query hooks need the browser.
import { Suspense, useEffect, useState, useSyncExternalStore } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Error as ErrorState } from '@/components/common/data-state-boundary/error';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { SummaryCard } from '@/components/common/summary-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  adminReceivableControllerListOptions,
  adminReceivableControllerListUpcomingOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { Permission } from '@/types/permission.type';

import { useSalesStoreScope } from '../_hooks/use-sales-store-scope.hook';
import type {
  BadDebtDialogMode,
  BadDebtDialogScope,
} from './_components/bad-debt-exclusion-dialog';
import { BadDebtExclusionDialog } from './_components/bad-debt-exclusion-dialog';
import { ConveniencePaymentDialog } from './_components/convenience-payment-dialog';
import { UnpaidDetailSheet } from './_components/unpaid-detail-sheet';
import { UnpaidTable } from './_components/unpaid-table';
import {
  UpcomingBillingConfirmDialog,
  readStoredUpcomingJobId,
  subscribeUpcomingJobId,
} from './_components/upcoming-billing-confirm-dialog';
import {
  UpcomingBillingSummaryCards,
  getSbpsJaccsBreakdown,
} from './_components/upcoming-billing-summary-cards';
import { UpcomingBillingTable } from './_components/upcoming-billing-table';
import { useReceivablesFilters } from './_hooks/use-receivables-filters.hook';
import { type ReceivableBillingTarget } from './_utils/receivable-status.util';

/** `undefined` while loading or after a failed load reads 「—」, never a 0 that looks like data */
function TabCountBadge({ count }: Readonly<{ count: number | undefined }>) {
  return (
    <Badge
      variant="outline"
      className="bg-muted-foreground/15 text-muted-foreground ml-1 min-w-5 border-transparent px-1 font-medium tabular-nums"
    >
      {count ?? '—'}
    </Badge>
  );
}

// Formats a bare number for use alongside SummaryCard's separate `prefix="¥"` prop.
// Not reused from `_utils/receivable-status.util`'s `formatYen`, which embeds the ¥ sign itself.
function formatYen(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

interface ConvenienceDialogState {
  memberName: string;
  memberNumber: string;
  billings: ReceivableBillingTarget[];
}

interface BadDebtDialogState {
  memberName: string;
  mode: BadDebtDialogMode;
  scope: BadDebtDialogScope;
  billings: ReceivableBillingTarget[];
}

function ReceivablesPageContent() {
  const {
    filters,
    setTab,
    setMonthFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    upcomingPage,
    setUpcomingPage,
    upcomingPageSize,
    setUpcomingPageSize,
    resetPages,
  } = useReceivablesFilters();
  // No in-panel 店舗 filter here — the callback only resets both tabs' pages on a header switch
  const { effectiveStoreId, isScopeLoading } = useSalesStoreScope(undefined, resetPages);
  const storeIds = effectiveStoreId ? [effectiveStoreId] : undefined;

  const [unpaidDetailMemberId, setUnpaidDetailMemberId] = useState<string | null>(null);
  const [convenienceDialog, setConvenienceDialog] = useState<ConvenienceDialogState | null>(null);
  const [badDebtDialog, setBadDebtDialog] = useState<BadDebtDialogState | null>(null);
  const [confirmBillingOpen, setConfirmBillingOpen] = useState(false);
  // A bulk confirm still running from before a reload keeps its progress dialog open (no second
  // run).
  const storedJobId = useSyncExternalStore(
    subscribeUpcomingJobId,
    readStoredUpcomingJobId,
    () => null,
  );

  // Baseline (filters reset) for the KPI cards, the tab badge and the 未納月 options (D7): the
  // server-side `summary` covers the whole scoped set, and `limit: 1` sorted by the oldest unpaid
  // month yields the first month the filter needs to offer.
  const {
    data: baselineData,
    isLoading: isBaselineQueryLoading,
    isError: baselineIsError,
    refetch: refetchBaseline,
  } = useQuery({
    ...adminReceivableControllerListOptions({
      query: { storeIds, page: 1, limit: 1, sort: 'oldestUnpaidMonth:asc' },
    }),
    enabled: !isScopeLoading,
  });
  const baselineLoading = isBaselineQueryLoading || isScopeLoading;

  // This error swaps out the whole tab (UnpaidTable unmounts), so the toast is raised here.
  useEffect(() => {
    if (baselineIsError)
      toast.error('未回収一覧の取得に失敗しました', { id: 'receivables-list-error' });
  }, [baselineIsError]);

  const {
    data: upcomingData,
    isLoading: isUpcomingQueryLoading,
    isError: upcomingIsError,
    refetch: refetchUpcoming,
  } = useQuery({
    ...adminReceivableControllerListUpcomingOptions({
      query: { storeIds, page: upcomingPage, limit: upcomingPageSize },
    }),
    enabled: !isScopeLoading,
  });
  const upcomingLoading = isUpcomingQueryLoading || isScopeLoading;

  const baselineSummary = baselineData?.summary;
  // API-117 v0.12 ⑤: the 未納月 options are the months that hold arrears in the store scope (the
  // list's only other filter); a month from the URL stays selectable even when it has none
  const unpaidMonths = baselineSummary?.unpaidMonths ?? [];
  const monthOptions =
    filters.rf_month && !unpaidMonths.includes(filters.rf_month)
      ? [filters.rf_month, ...unpaidMonths].sort().reverse()
      : unpaidMonths;
  const unfilteredTotalCount = baselineSummary?.memberCount ?? 0;
  const totalUnpaidAmount = baselineSummary?.totalUnpaid ?? 0;
  const badDebtCount = baselineSummary?.byDisplayStatus.eligible_for_write_off ?? 0;
  const convenienceCount = baselineSummary?.byDisplayStatus.konbini_pending ?? 0;

  // FR-007: 貸倒対象 is written off at month end — the caption shows that amount (summary of the
  // 貸倒対象 subset; the baseline summary only carries counts)
  const { data: writeOffData } = useQuery({
    ...adminReceivableControllerListOptions({
      query: { storeIds, displayStatus: ['eligible_for_write_off'], page: 1, limit: 1 },
    }),
    enabled: !isScopeLoading,
  });
  const writeOffAmount = writeOffData?.summary?.totalUnpaid;

  const upcomingItems = upcomingData?.items ?? [];
  const upcomingTotalCount = upcomingData?.pagination.totalItems ?? 0;
  const upcomingSummary = upcomingData?.summary;
  // API-117 v0.12 ①: 未確定 = pending + unconfirmed (billings set back by FR-003 are confirmed again)
  const upcomingPendingCount = upcomingSummary
    ? upcomingSummary.pendingCount + upcomingSummary.unconfirmedCount
    : 0;
  const upcomingPendingAmount = upcomingSummary
    ? upcomingSummary.pendingAmount + upcomingSummary.unconfirmedAmount
    : 0;
  const upcomingBreakdown = upcomingSummary ? getSbpsJaccsBreakdown(upcomingSummary) : null;

  return (
    <>
      <PageHeader title="請求・未回収管理" />

      <div className="bg-background flex flex-1 flex-col px-6 py-4">
        <Tabs
          value={filters.rf_tab}
          onValueChange={(value) => setTab(value === 'upcoming' ? 'upcoming' : 'receivable')}
          className="gap-4"
        >
          <TabsList variant="line">
            <TabsTrigger value="receivable" className="text-sm">
              未回収一覧
              <TabCountBadge count={baselineIsError ? undefined : baselineSummary?.memberCount} />
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-sm">
              翌月請求予定
              <TabCountBadge
                count={upcomingIsError ? undefined : upcomingData?.pagination.totalItems}
              />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receivable">
            {baselineIsError ? (
              <ErrorState onRetry={() => refetchBaseline()} />
            ) : (
              <div className="flex flex-col gap-6">
                {baselineLoading ? (
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="gap-0 py-4">
                        <CardContent className="px-4">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="mt-2 h-7 w-20" />
                          <Skeleton className="mt-1 h-3 w-24" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    <SummaryCard title="未回収件数" value={`${unfilteredTotalCount}`} suffix="件" />
                    <SummaryCard
                      title="未回収総額"
                      value={formatYen(totalUnpaidAmount)}
                      prefix="¥"
                      tone="destructive"
                      subValue="累計（当月超過分含む）"
                    />
                    <SummaryCard
                      title="貸倒対象件数"
                      value={`${badDebtCount}`}
                      suffix="件"
                      tone="muted"
                      subValue={
                        writeOffAmount === undefined
                          ? undefined
                          : `今月末に貸倒処理予定 ¥${formatYen(writeOffAmount)}（伝票日付は翌月1日）`
                      }
                    />
                    <SummaryCard
                      title="コンビニ決済中"
                      value={`${convenienceCount}`}
                      suffix="件"
                      tone="info"
                    />
                  </div>
                )}

                <UnpaidTable
                  unfilteredTotalCount={unfilteredTotalCount}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  monthOptions={monthOptions}
                  monthFilter={filters.rf_month}
                  onMonthFilterChange={setMonthFilter}
                  onRowClick={(row) => setUnpaidDetailMemberId(row.memberId)}
                  onIssueConvenience={(memberNumber, memberName, billings) =>
                    setConvenienceDialog({ memberName, memberNumber, billings })
                  }
                  onBadDebtAction={(memberName, mode, billings) =>
                    setBadDebtDialog({ memberName, mode, scope: 'member', billings })
                  }
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {upcomingIsError ? (
              <ErrorState onRetry={() => refetchUpcoming()} />
            ) : (
              <div className="flex flex-col gap-4">
                <UpcomingBillingSummaryCards
                  summary={upcomingSummary}
                  isLoading={upcomingLoading}
                />

                {/* 確定アクションバー (prototype): the whole upcoming list is confirmed in one batch */}
                <div className="bg-muted/30 flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-sm">
                      翌月請求予定{' '}
                      <span className="font-semibold tabular-nums">{upcomingPendingCount}</span>件
                      ・
                      <span className="font-semibold tabular-nums">
                        ¥{formatYen(upcomingPendingAmount)}
                      </span>{' '}
                      が未確定です
                    </p>
                    {upcomingBreakdown && (
                      <p className="text-muted-foreground text-xs">
                        確定するとSBPS（{upcomingBreakdown.sbps.count}件）・JACCS（
                        {upcomingBreakdown.jaccs.count}
                        件）へ請求データが送信されます。確定後は変更できません。
                      </p>
                    )}
                  </div>
                  <RoleGatedButton
                    requiredPermission={Permission.SalesUpcomingBillingConfirm}
                    denyTooltip="請求確定の権限がありません（Staffは職位マスターで許可された職位のみ）"
                    disabled={upcomingPendingCount === 0}
                    className="shrink-0 gap-2"
                    onClick={() => setConfirmBillingOpen(true)}
                  >
                    <Lock className="size-4" />
                    {upcomingPendingCount}件を確定する
                  </RoleGatedButton>
                </div>

                <UpcomingBillingTable
                  items={upcomingItems}
                  isLoading={upcomingLoading}
                  totalCount={upcomingTotalCount}
                  currentPage={upcomingPage}
                  pageSize={upcomingPageSize}
                  onPageChange={setUpcomingPage}
                  onPageSizeChange={setUpcomingPageSize}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <UnpaidDetailSheet
        memberId={unpaidDetailMemberId}
        open={!!unpaidDetailMemberId}
        onOpenChange={(open) => {
          if (!open) setUnpaidDetailMemberId(null);
        }}
        onIssueConvenience={(memberNumber, memberName, billings) =>
          setConvenienceDialog({ memberName, memberNumber, billings })
        }
        onBadDebtAction={(memberName, mode, billings, scope) =>
          setBadDebtDialog({ memberName, mode, scope, billings })
        }
      />

      <ConveniencePaymentDialog
        open={!!convenienceDialog}
        onOpenChange={(open) => {
          if (!open) setConvenienceDialog(null);
        }}
        memberName={convenienceDialog?.memberName ?? ''}
        memberNumber={convenienceDialog?.memberNumber ?? ''}
        billings={convenienceDialog?.billings ?? []}
      />

      <BadDebtExclusionDialog
        open={!!badDebtDialog}
        onOpenChange={(open) => {
          if (!open) setBadDebtDialog(null);
        }}
        memberName={badDebtDialog?.memberName ?? ''}
        mode={badDebtDialog?.mode ?? 'exclude'}
        scope={badDebtDialog?.scope ?? 'member'}
        billings={badDebtDialog?.billings ?? []}
      />

      <UpcomingBillingConfirmDialog
        open={confirmBillingOpen || storedJobId !== null}
        onOpenChange={setConfirmBillingOpen}
        summary={upcomingSummary}
        storeIds={storeIds}
      />
    </>
  );
}

export default function SalesReceivablesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReceivablesPageContent />
    </Suspense>
  );
}
