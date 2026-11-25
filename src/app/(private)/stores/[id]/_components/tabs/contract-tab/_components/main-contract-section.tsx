'use client';

import { useMemo, useState } from 'react';

import { formatDate, formatYen } from '@/utils/format.util';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

import { useDebounce } from '@/hooks/use-debounce.hook';

import { DataTable } from '@/components/common/data-table';
import { JargonTip } from '@/components/common/jargon-tip';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';

import { AdminStoreSales__MutualUseApi084 } from '@/lib/api-real';
import {
  adminStoreSettingsControllerListPlansInfiniteOptions,
  adminStoreSettingsControllerListPlansOptions,
  adminStoreSettingsControllerListPlansQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StorePlanDto, StorePlanListResponseDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { type MasterSource, contractTypeLabel } from '../contract-tab.data';
import { BindItemsDrawer } from './bind-items-drawer';
import { PlanOriginBadge } from './plan-origin-badge';
import { RemoveActionButton } from './remove-action-button';
import { type SetDiff, applySetDiff, fetchEnabledIds } from './replace-set.util';
import { SectionHeader } from './section-header';
import { SectionLoadError } from './section-load-error';

/** The API caps `limit` at 100 — the largest page, so the fewest requests */
const PLAN_PAGE_SIZE = 100;

/** The linked table pages from 20 rows; the page-number row only appears past one page */
const LINKED_PAGE_SIZE = 20;

/** D-FR-038 — 販売設定（主契約） is HQ/System only; the disabled controls say so */
const PLAN_SALES_DENY_TOOLTIP = '販売設定（主契約）はHQ/Systemのみ操作可能';

/** `StorePlanDto.storeId` is null for the HQ-wide master and `= {id}` for a store's own plan */
const planSource = (plan: StorePlanDto): MasterSource => (plan.storeId ? 'store' : 'hq');

// Stable fallback, so the table's row model is not rebuilt on every render
const EMPTY_PLANS: StorePlanDto[] = [];

export function MainContractSection({ storeId }: { storeId: string }) {
  const queryClient = useQueryClient();

  // `GET …/plans` lists the brand master with a per-store `enabled` filter. The linked table pages
  // through `enabled=true` with the footer pagination, so every linked plan can be reached (and
  // unlinked) however many there are; the drawer infinite-scrolls `enabled=false`. Both keys sit
  // under the generated one, so the path-only invalidation below refreshes both.
  const [linkedPage, setLinkedPage] = useState(1);
  const [linkedPageSize, setLinkedPageSize] = useState(LINKED_PAGE_SIZE);

  const {
    data: linkedPlans,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    ...adminStoreSettingsControllerListPlansOptions({
      path: { id: storeId },
      query: { enabled: true, page: linkedPage, limit: linkedPageSize },
    }),
    enabled: Boolean(storeId),
    // Paging keeps the current page on screen instead of collapsing the table into the skeleton
    placeholderData: keepPreviousData,
  });

  const linkedTotal = linkedPlans?.pagination.totalItems ?? 0;

  const {
    data: candidatePages,
    isError: isCandidatesError,
    refetch: refetchCandidates,
    isFetching: isFetchingCandidates,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...adminStoreSettingsControllerListPlansInfiniteOptions({
      path: { id: storeId },
      query: { enabled: false, isActive: true, limit: PLAN_PAGE_SIZE },
    }),
    enabled: Boolean(storeId),
    initialPageParam: 1,
    getNextPageParam: (lastPage: StorePlanListResponseDto, allPages: StorePlanListResponseDto[]) =>
      allPages.length < lastPage.pagination.totalPages ? allPages.length + 1 : undefined,
  });

  const items = linkedPlans?.items ?? EMPTY_PLANS;

  const candidatePlans = useMemo(
    () => candidatePages?.pages.flatMap((page) => page.items) ?? [],
    [candidatePages?.pages],
  );

  const [catalogSearch, setCatalogSearch] = useState('');
  const debouncedCatalogSearch = useDebounce(catalogSearch, 300);

  // `GET …/plans` takes no keyword parameter, so the drawer's search narrows what has been
  // loaded; scrolling the list loads the next page of the master behind it.
  const availablePlans = useMemo(() => {
    const keyword = debouncedCatalogSearch.trim().toLowerCase();
    return candidatePlans
      .filter(
        (plan) =>
          !keyword ||
          plan.name.toLowerCase().includes(keyword) ||
          plan.planCode.toLowerCase().includes(keyword),
      )
      .map((plan) => ({
        id: plan.planId,
        name: plan.name,
        source: planSource(plan),
        subText: `${contractTypeLabel(plan.contractType)} · ${formatYen(plan.priceMonthly)} · ${plan.planCode}`,
      }));
  }, [candidatePlans, debouncedCatalogSearch]);

  /**
   * D9 — 主契約 moved from per-row link/unlink to a full replace: `PUT …/plans` takes the
   * complete desired id set (`[]` disables everything). The set is re-read from the server right
   * before the write and only the operator's diff is applied to it, so a tab that has not seen
   * another operator's link cannot silently undo it (BUG-U5-08, D-FR-039). The re-read runs
   * inside the mutation, so its failure is toasted once by the shared `MutationCache` like the PUT.
   */
  const replaceMutation = useMutation({
    mutationFn: async (diff: SetDiff) => {
      const currentIds = await fetchEnabledIds(
        (page) =>
          queryClient.fetchQuery({
            ...adminStoreSettingsControllerListPlansOptions({
              path: { id: storeId },
              query: { enabled: true, page, limit: PLAN_PAGE_SIZE },
            }),
            staleTime: 0,
          }),
        (plan) => plan.planId,
      );
      const { data } =
        await AdminStoreSales__MutualUseApi084.adminStoreSettingsControllerReplacePlans({
          path: { id: storeId },
          body: { planIds: applySetDiff(currentIds, diff) },
          throwOnError: true,
        });
      return data;
    },
    // Refresh on failure too: the set was just re-read, and a refused write may mean it moved
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: adminStoreSettingsControllerListPlansQueryKey({ path: { id: storeId } }),
      }),
  });

  const columns = useMemo<ColumnDef<StorePlanDto>[]>(
    () => [
      {
        accessorKey: 'planCode',
        header: '主契約ID',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.planCode}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: '主契約名',
        // Wraps (an unbroken token included) so a long name cannot widen the table and push the
        // unlink action out of view at 1024px (BUG-U5-03)
        cell: ({ row }) => (
          <span className="text-xs font-medium [overflow-wrap:anywhere]">
            {row.original.name}
            {/* G-01 ステータス 無効: still linked, but no new sales (API-084 v0.11 `isActive`) */}
            {!row.original.isActive && (
              <Badge
                variant="outline"
                className="text-muted-foreground ml-1 h-4 px-1 py-0 text-[10px]"
              >
                無効
              </Badge>
            )}
          </span>
        ),
        meta: { className: 'w-full min-w-40 whitespace-normal' },
      },
      {
        accessorKey: 'contractType',
        header: '契約タイプ',
        cell: ({ row }) => (
          <span className="text-xs">{contractTypeLabel(row.original.contractType)}</span>
        ),
      },
      {
        id: 'priceIncludingTax',
        header: '料金（税込）',
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">{formatYen(row.original.priceMonthly)}</span>
        ),
      },
      {
        // D17 — 区分 is its own column now rather than a badge beside the name
        id: 'origin',
        header: '区分',
        cell: ({ row }) => <PlanOriginBadge source={planSource(row.original)} />,
      },
      {
        accessorKey: 'linkedAt',
        header: '紐づけ日',
        cell: ({ row }) => <span className="text-xs">{formatDate(row.original.linkedAt)}</span>,
      },
      {
        id: 'actions',
        header: () => <div className="text-right text-xs font-semibold">操作</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <RemoveActionButton
              requiredPermission={Permission.StoresConfigContract}
              denyTooltip={PLAN_SALES_DENY_TOOLTIP}
              dialogTitle="プランの紐づけを解除しますか？"
              dialogDescription={`「${row.original.name}」の紐づけを解除します。新規契約はできなくなります。`}
              isPending={replaceMutation.isPending}
              onConfirm={async () => {
                await replaceMutation.mutateAsync({ remove: [row.original.planId] });
                // Unlinking the only row of a later page would leave it empty — step back one
                if (items.length === 1) setLinkedPage((page) => Math.max(page - 1, 1));
                toast.success('主契約の紐づけを解除しました');
              }}
            />
          </div>
        ),
      },
    ],
    [replaceMutation, items.length],
  );

  const handleBindPlans = async (selectedPlanIds: string[]) => {
    if (!storeId || selectedPlanIds.length === 0) return false;
    try {
      await replaceMutation.mutateAsync({ add: selectedPlanIds });
    } catch {
      // Already surfaced by the shared mutation-error toast; the drawer keeps the selection
      return false;
    }
    toast.success('主契約を紐づけました');
    return true;
  };

  const hasLoadError = isError && !linkedPlans;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="p-4 pb-3">
        <SectionHeader
          title={<JargonTip term="主契約">主契約プラン</JargonTip>}
          count={linkedTotal}
          isLoading={isLoading}
          isError={hasLoadError}
          action={
            <BindItemsDrawer
              title="主契約プランを紐づける"
              description="「商材・施策 > 主契約管理」で作成されたプランから、この店舗で扱うプランを選んで紐づけてください。"
              searchPlaceholder="プラン名・IDで検索"
              listLabel="未紐づけのプラン"
              emptySelectionLabel="プランを選択してください"
              emptyLabel="紐づけ可能なプランはありません"
              items={availablePlans}
              isLoading={isFetchingCandidates && !isFetchingNextPage}
              isError={isCandidatesError}
              onRetry={() => void refetchCandidates()}
              hasMore={hasNextPage}
              onLoadMore={() => void fetchNextPage()}
              isLoadingMore={isFetchingNextPage}
              search={catalogSearch}
              onSearchChange={setCatalogSearch}
              getSubText={(item) => item.subText}
              denyTooltip={PLAN_SALES_DENY_TOOLTIP}
              onBind={handleBindPlans}
            />
          }
        />
      </CardHeader>

      {/* Full-bleed table: the header row spans the card, as in the prototype */}
      <DataTable
        variant="simple"
        columns={columns}
        data={items}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => void refetch()}
        errorTitle="主契約プランの取得に失敗しました"
        className="rounded-none border-0 border-t"
        containerClassName="max-h-[420px]"
        emptyContent={
          hasLoadError ? (
            <SectionLoadError
              title="主契約プランの取得に失敗しました"
              onRetry={() => void refetch()}
            />
          ) : undefined
        }
      />

      <TablePaginationWithSize
        total={linkedTotal}
        currentPage={linkedPage}
        pageSize={linkedPageSize}
        onPageChange={setLinkedPage}
        onPageSizeChange={(size) => {
          setLinkedPageSize(size);
          setLinkedPage(1);
        }}
      />
    </Card>
  );
}
