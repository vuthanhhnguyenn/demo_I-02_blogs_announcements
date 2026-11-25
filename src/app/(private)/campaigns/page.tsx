'use client';

import { Suspense, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Error as ErrorView } from '@/components/common/data-state-boundary/error';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { adminCampaignControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { CampaignsFilters } from './_components/campaigns-filters';
import { CampaignsTableColumns } from './_components/campaigns-table-columns';
import {
  CAMPAIGN_ACCEPTING_STATUS_LABELS,
  CAMPAIGN_BRAND_LABELS,
  getCampaignTableMaxHeightClass,
} from './_constants/constants';
import { CampaignsFiltersProvider } from './_contexts/campaigns-filters-context';
import { CAMPAIGN_SORT_NONE, useCampaignsFilters } from './_hooks/use-campaigns-filters';

function CampaignsPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filtersHook = useCampaignsFilters();
  const { filters, setFilters, queryParams, currentPage, setCurrentPage, pageSize, setPageSize } =
    filtersHook;

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminCampaignControllerListOptions({ query: { ...queryParams, includeTotalAll: true } }),
    placeholderData: keepPreviousData,
    // 詳細から戻ったときに他タブ・他ユーザーの更新（受付可否など）を反映するため、マウントごとに再取得する
    refetchOnMount: 'always',
    meta: { showErrorToast: true },
  });

  const campaigns = data?.items ?? [];
  const pagination = data?.pagination;
  const totalCampaigns = pagination?.totalItems ?? 0;
  const totalAllCampaigns = pagination?.totalAllItems ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  const sorting: SortingState =
    filters.sort === CAMPAIGN_SORT_NONE
      ? []
      : [{ id: filters.sort, desc: filters.order === 'desc' }];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) {
      // 3回目のクリックでソートを解除する（sort / order を API へ送らず、全ヘッダーを中立アイコンに戻す）。
      setFilters({ sort: CAMPAIGN_SORT_NONE, order: null, page: 1 });
      return;
    }
    setFilters({
      sort: next[0].id as Exclude<typeof filters.sort, typeof CAMPAIGN_SORT_NONE>,
      order: next[0].desc ? 'desc' : 'asc',
      page: 1,
    });
  };

  const columns = useMemo(() => CampaignsTableColumns(), []);

  return (
    <>
      <PageHeader
        title="キャンペーン管理"
        badge={
          <Badge
            variant="outline"
            className="text-muted-foreground text-xs font-normal tabular-nums"
          >
            {totalAllCampaigns.toLocaleString()}件
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.CampaignsCreate}
            onClick={() => router.push(withReturnTo(navigate('/campaigns/create')))}
          >
            <Plus className="size-4" />
            新規登録
          </RoleGatedButton>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-4">
        <Card className="gap-0 overflow-hidden rounded-xl border p-0">
          <div className="px-4 py-3">
            <CampaignsFiltersProvider value={filtersHook}>
              <CampaignsFilters isFilterOpen={isFilterOpen} onFilterOpenChange={setIsFilterOpen} />
            </CampaignsFiltersProvider>
          </div>

          {/* 抽出結果は検索行の直下に固定する。条件クリアはこのバナーと、絞り込み0件時の
              空状態（PAR046）の2箇所から実行できる（他の一覧画面と同じ挙動）。 */}
          <FilterResultBanner
            show={filtersHook.hasActiveFilters}
            totalCount={totalAllCampaigns}
            filteredCount={totalCampaigns}
            filterSummary={[
              filters.nameQuery ? `"${filters.nameQuery}"` : '',
              filters.brandEnum ? CAMPAIGN_BRAND_LABELS[filters.brandEnum] : '',
              filters.acceptingStatus
                ? CAMPAIGN_ACCEPTING_STATUS_LABELS[filters.acceptingStatus]
                : '',
              filters.recruitmentActiveOn ? `募集期間: ${filters.recruitmentActiveOn}` : '',
            ]}
            onClear={filtersHook.clearFilters}
          />

          <DataTable
            tableSize="md"
            columns={columns}
            data={campaigns}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="キャンペーンの取得に失敗しました"
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            containerClassName={getCampaignTableMaxHeightClass(
              isFilterOpen,
              filtersHook.hasActiveFilters,
            )}
            onRowClick={(row) => {
              router.push(withReturnTo(navigate('/campaigns/[id]', row.campaignId)));
            }}
            tableOptions={{
              onSortingChange: handleSortingChange,
              manualSorting: true,
              state: { sorting },
            }}
            emptyContent={
              isError ? (
                <ErrorView
                  title="キャンペーンの取得に失敗しました"
                  onRetry={() => void refetch()}
                />
              ) : (
                <Empty
                  variant={filtersHook.hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="キャンペーン"
                  onAction={filtersHook.hasActiveFilters ? filtersHook.clearFilters : undefined}
                />
              )
            }
          />

          {totalCampaigns > 0 && (
            <TablePaginationWithSize
              currentPage={page}
              total={totalCampaigns}
              pageSize={limit}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>
    </>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CampaignsPageContent />
    </Suspense>
  );
}
