'use client';

import { useMemo, useState } from 'react';

import { toSelectItems } from '@/utils/app.util';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { adminStoreControllerListInfiniteOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminStoreControllerListResponse, StoreSummaryDto } from '@/lib/api-real/types.gen';

import { BRAND_GROUP_FILTER_OPTIONS, type BrandGroupFilter } from '../../_constants/constants';
import {
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_OPTIONS,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPE_OPTIONS,
  type LeaveType,
  type LeaveViewMode,
  MONTHLY_SCOPE_OPTIONS,
  type MonthlyScope,
  SCHEDULED_PERIOD_OPTIONS,
} from '../_constants/constants';
import { useLeavesFiltersContext } from '../_contexts/leaves-filters-context';

/** Highlights a filter control while it holds a non-default value (V0 `filterActiveClass`). */
function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

interface LeavesFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  /** FR-024 — the denominator: rows in the caller's store scope before any in-screen filter. */
  totalAll: number;
  /** FR-024 — the numerator: rows surviving the active filters. */
  total: number;
}

export function LeavesFilters({
  isFilterOpen,
  onFilterOpenChange,
  totalAll,
  total,
}: Readonly<LeavesFiltersProps>) {
  const {
    filters,
    updateFilter,
    selectStoreFilter,
    storeFilterLabel,
    memberFilterLabel,
    showStoreFilter,
    isMonthlyView,
    isMonthlySuspensionOnly,
    setView,
    setMonthlyScope,
    activeFilterCount,
    hasActiveFilters,
    clearFilters,
  } = useLeavesFiltersContext();

  /**
   * The store list is paged server-side and searched server-side: loading a fixed slice
   * and filtering it in the browser would silently truncate the options.
   */
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const {
    data: storesData,
    isFetching: isStoresFetching,
    isError: isStoresError,
    refetch: refetchStores,
    fetchNextPage: fetchNextStores,
    hasNextPage: hasMoreStores,
    isFetchingNextPage: isFetchingMoreStores,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: { limit: 20, keyword: storeSearch || undefined, sort: 'name', order: 'asc' },
    }),
    enabled: showStoreFilter && isFilterOpen && storeOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminStoreControllerListResponse, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pagination.totalPages ? currentPage + 1 : undefined;
    },
  });
  const stores = useMemo(() => storesData?.pages.flatMap((page) => page.items) ?? [], [storesData]);

  /**
   * FR-025 — summary order is 会員 → 種別 → ステータス → ブランド → 予定 → 店舗 → 表示.
   * The header store scope is deliberately absent: it frames the screen, it does not filter it.
   */
  const filterSummary = [
    memberFilterLabel ? `会員: ${memberFilterLabel}` : '',
    filters.type ? LEAVE_TYPE_LABELS[filters.type] : '',
    filters.status ? LEAVE_STATUS_LABELS[filters.status] : '',
    filters.brand ?? '',
    filters.scheduled_period
      ? `予定: ${SCHEDULED_PERIOD_OPTIONS.find((o) => o.value === filters.scheduled_period)?.label ?? ''}`
      : '',
    showStoreFilter && storeFilterLabel ? storeFilterLabel : '',
    isMonthlySuspensionOnly ? '表示: 休会のみ' : '',
  ];

  return (
    <>
      <div className="space-y-3 px-4 py-3">
        {/* No free-word search in Phase 1: 詳細フィルター sits left, the view toggle right. */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={activeFilterCount > 0 ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => onFilterOpenChange(!isFilterOpen)}
            >
              <SlidersHorizontal className="size-4" />
              {isFilterOpen ? '閉じる' : '詳細フィルター'}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              {isFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[filters.view]}
              onValueChange={(v: string[]) => {
                if (v.length > 0) setView(v[0] as LeaveViewMode);
              }}
            >
              <ToggleGroupItem value="list" className="h-8 px-3 text-xs">
                一覧
              </ToggleGroupItem>
              <ToggleGroupItem value="monthly" className="h-8 px-3 text-xs">
                月別ビュー
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {isFilterOpen && (
          <div className="flex flex-wrap items-center gap-2">
            {/* 種別 */}
            <Select
              value={filters.type ?? 'all'}
              onValueChange={(v) => updateFilter('type', v === 'all' ? null : (v as LeaveType))}
              items={toSelectItems(LEAVE_TYPE_OPTIONS)}
            >
              <SelectTrigger className={`h-8 w-30 text-xs ${filterActiveClass(!!filters.type)}`}>
                <SelectValue placeholder="全種別" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ステータス — four values; 処理完了 never reaches the list (Q-10) */}
            <Select
              value={filters.status ?? 'all'}
              onValueChange={(v) =>
                updateFilter('status', v === 'all' ? null : (v as typeof filters.status))
              }
              items={toSelectItems(LEAVE_STATUS_OPTIONS)}
            >
              <SelectTrigger className={`h-8 w-40 text-xs ${filterActiveClass(!!filters.status)}`}>
                <SelectValue placeholder="全ステータス" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 店舗 — only meaningful under an all-stores scope with 2+ accessible stores */}
            {showStoreFilter && (
              <SearchableSelect<StoreSummaryDto>
                value={filters.store_id}
                valueLabel={storeFilterLabel ?? '全店舗'}
                options={stores}
                placeholder="全店舗"
                searchPlaceholder="店舗名・店舗IDで検索..."
                emptyMessage="該当する店舗がありません"
                loadingMessage="店舗を読み込み中..."
                clearLabel="全店舗"
                open={storeOpen}
                onOpenChange={setStoreOpen}
                onSearchChange={setStoreSearch}
                onSelect={(store) =>
                  selectStoreFilter(store ? { id: store.id, name: store.name } : null)
                }
                getOptionKey={(store) => store.id}
                getOptionLabel={(store) => store.name}
                getOptionKeywords={(store) => [store.name, store.code, store.clubCode].join(' ')}
                isLoading={isStoresFetching}
                // A failed page leaves `hasNextPage` true, so stop paging on error and let 再読み込み retry.
                hasMore={hasMoreStores && !isStoresError}
                isLoadingMore={isFetchingMoreStores}
                onLoadMore={fetchNextStores}
                loadingMoreMessage="読み込み中..."
                triggerClassName={`h-8 w-40 text-xs ${filterActiveClass(!!filters.store_id)}`}
                contentClassName="min-w-[280px]"
              />
            )}
            {showStoreFilter && isStoresError && (
              <p className="text-destructive text-xs">
                店舗を取得できませんでした。
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => void refetchStores()}
                >
                  再読み込み
                </Button>
              </p>
            )}

            {/* ブランド — the store's brand group, JOYFIT / FIT365 (qa-155 ④) */}
            <Select
              value={filters.brand ?? 'all'}
              onValueChange={(v) =>
                updateFilter('brand', v === 'all' ? null : (v as BrandGroupFilter))
              }
              items={{ all: '全ブランド', ...toSelectItems([...BRAND_GROUP_FILTER_OPTIONS]) }}
            >
              <SelectTrigger className={`h-8 w-32.5 text-xs ${filterActiveClass(!!filters.brand)}`}>
                <SelectValue placeholder="全ブランド" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ブランド</SelectItem>
                {BRAND_GROUP_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 予定日 — applied server-side, so it actually narrows the result (Q-01) */}
            <Select
              value={filters.scheduled_period ?? 'all'}
              onValueChange={(v) =>
                updateFilter(
                  'scheduled_period',
                  v === 'all' ? null : (v as typeof filters.scheduled_period),
                )
              }
              items={toSelectItems([...SCHEDULED_PERIOD_OPTIONS])}
            >
              <SelectTrigger
                className={`h-8 w-30 text-xs ${filterActiveClass(!!filters.scheduled_period)}`}
              >
                <SelectValue placeholder="全期間" />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULED_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 月別ビュー only — narrows the month grid to suspensions. */}
            {isMonthlyView && (
              <Select
                value={filters.monthly_scope}
                onValueChange={(v) => setMonthlyScope(v as MonthlyScope)}
                items={toSelectItems(MONTHLY_SCOPE_OPTIONS)}
              >
                <SelectTrigger
                  className={`h-8 w-37.5 text-xs ${filterActiveClass(isMonthlySuspensionOnly)}`}
                >
                  <span className="truncate">
                    表示: {isMonthlySuspensionOnly ? '休会のみ' : '全て'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {MONTHLY_SCOPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      <FilterResultBanner
        show={hasActiveFilters}
        totalCount={totalAll}
        filteredCount={total}
        filterSummary={filterSummary}
        onClear={clearFilters}
      />
    </>
  );
}
