'use client';

import { useCurrentStore } from '@/contexts/current-store.context';
import { toSelectItems } from '@/utils/app.util';
import { formatISODateLocal } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { StoreSelectInput, useStoreLabel } from '@/components/common/data-select-input';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { adminApplicationControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import {
  BLACKLIST_OPTIONS,
  BRAND_OPTIONS,
  ENROLLMENT_ROUTE_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from '../_constants/constants';
import { useMembershipApplicationsFiltersContext } from '../_contexts/membership-applications-filters-context';

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

/** Base UI's `<Select>` reports a deselected value as `null` — treat that as "all". */
function valueOrAll(v: string | null): string {
  return v ?? 'all';
}

/**
 * Condition summary joined with「・」, in the fixed order the result banner uses. Follows the
 * prototype: the date range counts in the filter badge but is not listed here (BUG-A-05), and
 * BL照合 reads 「BL一致のみ」 (BUG-A-09).
 */
function buildFilterSummary(
  filters: ReturnType<typeof useMembershipApplicationsFiltersContext>['filters'],
  isAllStoresView: boolean,
  storeName: string | undefined,
  searchQuery: string,
): string[] {
  const parts: string[] = [];
  if (filters.status) parts.push(`ステータス: ${STATUS_LABELS[filters.status]}`);
  if (isAllStoresView && filters.brand) parts.push(`ブランド: ${filters.brand}`);
  if (isAllStoresView && filters.store) parts.push(`店舗: ${storeName ?? filters.store}`);
  if (filters.blacklist !== 'all') {
    parts.push(`BL照合: ${filters.blacklist === 'match' ? 'BL一致のみ' : '一致なし'}`);
  }
  if (filters.route) {
    parts.push(
      `入会経路: ${{ mobile: 'モバイル', manual: '手動', referral: '紹介経由' }[filters.route]}`,
    );
  }
  if (searchQuery) parts.push(`検索: "${searchQuery}"`);
  return parts;
}

export function MembershipApplicationsFilters() {
  const {
    showFilters,
    setShowFilters,
    searchInput,
    setSearchInput,
    searchQuery,
    searchError,
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    isDateRangeChanged,
    defaultDateFrom,
    defaultDateTo,
    isAllStoresView,
    queryParams,
  } = useMembershipApplicationsFiltersContext();

  // See page.tsx's isStoreScopeLoading comment — same guard so this independent
  // subscriber doesn't force the shared query to fire before the store scope resolves.
  const { isLoading: isStoreScopeLoading } = useCurrentStore();

  // Store options for the all-stores view only (FR-015) — hidden entirely otherwise.
  const { label: selectedStoreName } = useStoreLabel(filters.store, { enabled: isAllStoresView });

  const filterSummary = buildFilterSummary(
    filters,
    isAllStoresView,
    selectedStoreName ?? undefined,
    searchQuery,
  );

  // Shares its cache entry with the table's identical query (same queryKey) —
  // this is not a second network request, just a second subscriber, and it's
  // what lets the banner show filtered-vs-total (FR-008).
  const { data: listData } = useQuery({
    ...adminApplicationControllerListOptions({ query: queryParams }),
    enabled: !isStoreScopeLoading,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <div className="space-y-3 px-4 py-3">
        {/* Search + filter toggle row */}
        <div className="flex items-center gap-2">
          <div className="flex max-w-100 flex-1 flex-col gap-1">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9 text-xs"
                placeholder="申請ID・氏名で検索..."
                value={searchInput}
                aria-invalid={!!searchError}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            {searchError && <p className="text-destructive text-xs">{searchError}</p>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={activeFilterCount > 0 ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <SlidersHorizontal className="size-4" />
              {showFilters ? '閉じる' : '詳細フィルター'}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              {showFilters ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          </div>
        </div>

        {/* Expandable filter row */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {/* ステータス — 7 options incl. 自動承認済 */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => {
                const value = valueOrAll(v);
                setFilters({ status: value === 'all' ? '' : (value as typeof filters.status) });
              }}
              items={toSelectItems(STATUS_OPTIONS)}
            >
              <SelectTrigger
                className={cn('h-8 w-35 text-xs', filterActiveClass(!!filters.status))}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ブランド・店舗 — all-stores view only (FR-015) */}
            {isAllStoresView && (
              <>
                <Select
                  value={filters.brand || 'all'}
                  onValueChange={(v) => {
                    const value = valueOrAll(v);
                    setFilters({ brand: value === 'all' ? '' : value });
                  }}
                  items={toSelectItems(BRAND_OPTIONS)}
                >
                  <SelectTrigger
                    className={cn('h-8 w-35 text-xs', filterActiveClass(!!filters.brand))}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAND_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StoreSelectInput
                  value={filters.store || null}
                  onChange={(store) => setFilters({ store: store?.id ?? '' })}
                  valueLabel={selectedStoreName}
                  enabled={showFilters}
                  triggerClassName={cn('h-8 w-45 text-xs', filterActiveClass(!!filters.store))}
                />
              </>
            )}

            {/* 申請日レンジ — defaults to the last 7 days (FR-007) */}
            <DateRangePicker
              date={{
                from: new Date(`${filters.date_from || defaultDateFrom}T00:00:00`),
                to: new Date(`${filters.date_to || defaultDateTo}T00:00:00`),
              }}
              onDateChange={(range) =>
                setFilters({
                  date_from: range?.from ? formatISODateLocal(range.from) : '',
                  date_to: range?.to ? formatISODateLocal(range.to) : '',
                })
              }
              className={cn(
                'h-8 justify-start gap-2 px-3 text-xs font-normal',
                filterActiveClass(isDateRangeChanged),
              )}
              placeholder="期間を選択"
            />

            {/* BL照合 — tri-state */}
            <Select
              value={filters.blacklist}
              onValueChange={(v) =>
                setFilters({ blacklist: valueOrAll(v) as typeof filters.blacklist })
              }
              items={toSelectItems(BLACKLIST_OPTIONS)}
            >
              <SelectTrigger
                className={cn('h-8 w-42 text-xs', filterActiveClass(filters.blacklist !== 'all'))}
              >
                <span className="text-muted-foreground mr-1">BL照合:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLACKLIST_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 入会経路 */}
            <Select
              value={filters.route || 'all'}
              onValueChange={(v) => {
                const value = valueOrAll(v);
                setFilters({ route: value === 'all' ? '' : (value as typeof filters.route) });
              }}
              items={toSelectItems(ENROLLMENT_ROUTE_OPTIONS)}
            >
              <SelectTrigger className={cn('h-8 w-35 text-xs', filterActiveClass(!!filters.route))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENROLLMENT_ROUTE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <FilterResultBanner
        // No counts without a response — a failed fetch must not read as 「0 件」 (BUG-A-12).
        show={hasActiveFilters && !!listData}
        totalCount={listData?.pagination.totalAllItems ?? listData?.pagination.totalItems ?? 0}
        filteredCount={listData?.pagination.totalItems ?? 0}
        filterSummary={filterSummary}
        onClear={clearFilters}
      />
    </div>
  );
}
