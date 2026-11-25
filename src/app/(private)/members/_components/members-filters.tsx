'use client';

import { useMemo, useState } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminPlanControllerListInfiniteOptions,
  adminPromotionCodeControllerListInfiniteOptions,
  adminStoreControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminPlanControllerListResponse,
  AdminPromotionCodeControllerListResponse,
  AdminStoreControllerListResponse,
  PlanListItemDto,
  PromotionCodeListItemDto,
  StoreSummaryDto,
} from '@/lib/api-real/types.gen';

import {
  BRAND_GROUP_FILTER_OPTIONS,
  type BrandGroupFilter,
  JOIN_PERIOD_LABELS,
  LAST_VISIT_LABELS,
  MEMBER_CONTRACT_TYPE_FILTER_OPTIONS,
  MEMBER_SEARCH_MAX_LENGTH,
  MEMBER_STATUS_FILTER_OPTIONS,
  type MemberContractTypeFilter,
} from '../_constants/constants';
import { useMembersFiltersContext } from '../_contexts/members-filters-context';

interface MembersFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
}

function filterActiveClass(isActive: boolean) {
  return isActive ? 'border-primary bg-primary/10 text-foreground' : '';
}

// nuqs treats '' as null; use a sentinel for the "all" option
const ALL = 'all';

export function MembersFilters({ isFilterOpen, onFilterOpenChange }: MembersFiltersProps) {
  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    selectContractFilter,
    contractFilterLabel,
    selectPromoCodeFilter,
    promoCodeLabel,
    isAllStoresScope,
    selectStoreFilter,
    storeFilterLabel,
  } = useMembersFiltersContext();

  const {
    main_contract_id,
    contract_type,
    status_group,
    brand_group,
    store_id,
    join_period,
    last_visit,
    promo_code,
  } = filters;

  const selectedContractId = main_contract_id[0] ?? null;
  const selectedStoreId = store_id[0] ?? null;

  // --- 店舗 searchable filter ---
  // Only offered while the header scope is 全店舗: with a single store selected there,
  // the page-local filter would have nothing left to narrow.
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const {
    data: storesData,
    isFetching: isStoresFetching,
    isError: isStoresError,
    error: storesError,
    isFetchNextPageError: isStoresLoadMoreFailed,
    refetch: refetchStores,
    fetchNextPage: fetchNextStores,
    hasNextPage: hasMoreStores,
    isFetchingNextPage: isFetchingMoreStores,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: { limit: 20, keyword: storeSearch || undefined, sort: 'name', order: 'asc' },
    }),
    enabled: isFilterOpen && storeOpen && isAllStoresScope,
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminStoreControllerListResponse, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pagination.totalPages ? currentPage + 1 : undefined;
    },
  });
  const stores = useMemo(() => storesData?.pages.flatMap((page) => page.items) ?? [], [storesData]);

  // --- 主契約プラン (main contract) searchable filter ---
  const [contractOpen, setContractOpen] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  const {
    data: contractsData,
    isFetching: isContractsFetching,
    isError: isContractsError,
    error: contractsError,
    isFetchNextPageError: isContractsLoadMoreFailed,
    refetch: refetchContracts,
    fetchNextPage: fetchNextContracts,
    hasNextPage: hasMoreContracts,
    isFetchingNextPage: isFetchingMoreContracts,
  } = useInfiniteQuery({
    ...adminPlanControllerListInfiniteOptions({
      query: { limit: 20, nameQuery: contractSearch || undefined, sort: 'name', order: 'asc' },
    }),
    enabled: isFilterOpen && contractOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminPlanControllerListResponse, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pagination.totalPages ? currentPage + 1 : undefined;
    },
  });
  const contracts = useMemo(
    () => contractsData?.pages.flatMap((page) => page.items) ?? [],
    [contractsData],
  );

  // --- プロモコード (promotion code) searchable filter ---
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoSearch, setPromoSearch] = useState('');
  const {
    data: promoCodesData,
    isFetching: isPromoCodesFetching,
    isError: isPromoCodesError,
    error: promoCodesError,
    isFetchNextPageError: isPromoCodesLoadMoreFailed,
    refetch: refetchPromoCodes,
    fetchNextPage: fetchNextPromoCodes,
    hasNextPage: hasMorePromoCodes,
    isFetchingNextPage: isFetchingMorePromoCodes,
  } = useInfiniteQuery({
    // The only server-side search this endpoint offers is `codePrefix` (前方一致), which is
    // the right axis anyway: G-06 FR-011 filters on the code string itself. The campaign
    // name is not searchable server-side, so `getOptionKeywords` matches it among the rows
    // already loaded.
    ...adminPromotionCodeControllerListInfiniteOptions({
      query: { limit: 20, codePrefix: promoSearch || undefined },
    }),
    enabled: isFilterOpen && promoOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminPromotionCodeControllerListResponse, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pagination.totalPages ? currentPage + 1 : undefined;
    },
  });
  const promoCodes = useMemo(
    () => promoCodesData?.pages.flatMap((page) => page.items) ?? [],
    [promoCodesData],
  );

  const activeFilterCount = [
    isAllStoresScope && store_id.length > 0,
    status_group !== null,
    main_contract_id.length > 0,
    contract_type !== null,
    brand_group.length > 0,
    join_period !== null,
    last_visit !== null,
    promo_code !== null,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-[400px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="会員ID・氏名・カナ・電話番号・メールアドレス・旧会員Noで検索"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={MEMBER_SEARCH_MAX_LENGTH}
            className="h-8 pl-9 text-xs"
          />
        </div>
        <Button
          variant={activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className="ml-auto h-8 gap-1 text-xs"
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

      {isFilterOpen && (
        <div className="flex flex-wrap items-center gap-2">
          {/* 店舗 — shown only under the 全店舗 header scope. The filter travels as the
              store UUID (`store_id` in the URL, `storeId` on the wire); the label for a
              deep-linked id is resolved by the by-id lookup in the filters hook. */}
          {isAllStoresScope && (
            <SearchableSelect<StoreSummaryDto>
              value={selectedStoreId}
              valueLabel={storeFilterLabel ?? '全店舗'}
              options={stores}
              placeholder="全店舗"
              searchPlaceholder="店舗名で検索..."
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
              renderOption={(store) => (
                <TextWithTooltip
                  text={store.name}
                  wrapperClassName="w-full"
                  className="w-full"
                  side="right"
                  align="center"
                />
              )}
              isLoading={isStoresFetching}
              hasMore={hasMoreStores}
              isLoadingMore={isFetchingMoreStores}
              onLoadMore={fetchNextStores}
              loadingMoreMessage="読み込み中..."
              loadMoreFailed={isStoresLoadMoreFailed}
              loadFailed={isStoresError && !isStoresLoadMoreFailed}
              loadFailedMessage={resolveApiErrorMessage(storesError)}
              onRetry={() => void refetchStores()}
              retryLabel="再試行"
              triggerClassName={`h-8 w-[160px] text-xs ${filterActiveClass(store_id.length > 0)}`}
              contentClassName="min-w-[280px]"
            />
          )}

          {/* ステータス — 4 grouped options + ゲートストップ. Each option expands to the
              DB statuses it covers; ゲートストップ instead sends `has_gate_stop` (it is
              orthogonal to status), so it also returns e.g. 休会中 members. */}
          <Select
            value={status_group ?? ALL}
            onValueChange={(value) => updateFilter('status_group', value === ALL ? null : value)}
          >
            <SelectTrigger
              className={`h-8 w-[140px] text-xs ${filterActiveClass(status_group !== null)}`}
            >
              <SelectValue>
                {MEMBER_STATUS_FILTER_OPTIONS.find((option) => option.value === status_group)
                  ?.label ?? '全ステータス'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全ステータス</SelectItem>
              {MEMBER_STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 主契約プラン */}
          <SearchableSelect<PlanListItemDto>
            value={selectedContractId}
            valueLabel={contractFilterLabel ?? '全プラン'}
            options={contracts}
            placeholder="全プラン"
            searchPlaceholder="プラン名で検索..."
            emptyMessage="該当するプランがありません"
            loadingMessage="プランを読み込み中..."
            clearLabel="全プラン"
            open={contractOpen}
            onOpenChange={setContractOpen}
            onSearchChange={setContractSearch}
            onSelect={(plan) =>
              selectContractFilter(plan ? { id: plan.planId, name: plan.name } : null)
            }
            getOptionKey={(plan) => plan.planId}
            getOptionLabel={(plan) => plan.name}
            getOptionKeywords={(plan) =>
              [plan.name, plan.nameForMember, plan.planId].filter(Boolean).join(' ')
            }
            renderOption={(plan) => (
              <TextWithTooltip
                text={plan.name}
                wrapperClassName="w-full"
                className="w-full"
                side="right"
                align="center"
              />
            )}
            isLoading={isContractsFetching}
            hasMore={hasMoreContracts}
            isLoadingMore={isFetchingMoreContracts}
            onLoadMore={fetchNextContracts}
            loadingMoreMessage="読み込み中..."
            loadMoreFailed={isContractsLoadMoreFailed}
            loadFailed={isContractsError && !isContractsLoadMoreFailed}
            loadFailedMessage={resolveApiErrorMessage(contractsError)}
            onRetry={() => void refetchContracts()}
            retryLabel="再試行"
            triggerClassName={`h-8 w-[160px] text-xs ${filterActiveClass(main_contract_id.length > 0)}`}
            contentClassName="min-w-[280px]"
          />

          {/* 契約種別 — the contract TYPE of the current main contract (`contractType`),
              a coarser axis than 主契約プラン: one value covers every plan of that type. */}
          <Select
            value={contract_type ?? ALL}
            onValueChange={(value) =>
              updateFilter(
                'contract_type',
                value === ALL ? null : (value as MemberContractTypeFilter),
              )
            }
          >
            <SelectTrigger
              className={`h-8 w-[140px] text-xs ${filterActiveClass(contract_type !== null)}`}
            >
              <SelectValue>
                {MEMBER_CONTRACT_TYPE_FILTER_OPTIONS.find(
                  (option) => option.value === contract_type,
                )?.label ?? '全契約種別'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全契約種別</SelectItem>
              {MEMBER_CONTRACT_TYPE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* ブランド — the brand GROUP axis (JOYFIT / FIT365). Store sub-brands
              (JOYFIT24, JOYFIT+, …) are a different axis and are not offered here. */}
          <Select
            value={brand_group.length > 0 ? brand_group[0] : ALL}
            onValueChange={(value) =>
              updateFilter('brand_group', value === ALL ? [] : [value as BrandGroupFilter])
            }
          >
            <SelectTrigger
              className={`h-8 w-[140px] text-xs ${filterActiveClass(brand_group.length > 0)}`}
            >
              <SelectValue>
                {BRAND_GROUP_FILTER_OPTIONS.find((option) => option.value === brand_group[0])
                  ?.label ?? '全ブランド'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全ブランド</SelectItem>
              {BRAND_GROUP_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 入会期間 */}
          <Select
            value={join_period ?? ALL}
            onValueChange={(value) => updateFilter('join_period', value === ALL ? null : value)}
          >
            <SelectTrigger
              className={`h-8 w-[140px] text-xs ${filterActiveClass(join_period !== null)}`}
            >
              <SelectValue>
                {join_period ? (JOIN_PERIOD_LABELS[join_period] ?? '全期間') : '全期間'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全期間</SelectItem>
              {Object.entries(JOIN_PERIOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 最終来館日 */}
          <Select
            value={last_visit ?? ALL}
            onValueChange={(value) => updateFilter('last_visit', value === ALL ? null : value)}
          >
            <SelectTrigger
              className={`h-8 w-[180px] text-xs ${filterActiveClass(last_visit !== null)}`}
            >
              <SelectValue>
                {last_visit
                  ? (LAST_VISIT_LABELS[last_visit] ?? '全期間（最終来館日）')
                  : '全期間（最終来館日）'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全期間（最終来館日）</SelectItem>
              {Object.entries(LAST_VISIT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* プロモコード — G-06 FR-011: filters on the promotion code used at enrollment,
              so the options are the issued codes (G-06), NOT the campaign master (G-03):
              one campaign issues many codes. The code is the value AND the label — the
              campaign name rides along underneath only to tell same-campaign codes apart.
              Paged like the two pickers above: `limit` is capped at 100. */}
          <SearchableSelect<PromotionCodeListItemDto>
            value={promo_code}
            valueLabel={promoCodeLabel ?? '全プロモコード'}
            options={promoCodes}
            placeholder="全プロモコード"
            searchPlaceholder="プロモコードで検索..."
            emptyMessage="該当するプロモコードがありません"
            loadingMessage="プロモコードを読み込み中..."
            clearLabel="全プロモコード"
            open={promoOpen}
            onOpenChange={setPromoOpen}
            onSearchChange={setPromoSearch}
            onSelect={(promotionCode) => selectPromoCodeFilter(promotionCode?.code ?? null)}
            // Keyed by CODE, not id: the code is what the filter travels as.
            getOptionKey={(promotionCode) => promotionCode.code}
            getOptionLabel={(promotionCode) => promotionCode.code}
            getOptionKeywords={(promotionCode) =>
              [promotionCode.code, promotionCode.campaignName].filter(Boolean).join(' ')
            }
            renderOption={(promotionCode) => (
              <div className="flex w-full flex-col gap-0.5">
                <TextWithTooltip
                  text={promotionCode.code}
                  wrapperClassName="w-full"
                  className="w-full font-medium"
                  side="right"
                  align="center"
                />
                {promotionCode.campaignName ? (
                  <TextWithTooltip
                    text={promotionCode.campaignName}
                    wrapperClassName="w-full"
                    className="text-muted-foreground w-full text-xs"
                    side="right"
                    align="center"
                  />
                ) : null}
              </div>
            )}
            isLoading={isPromoCodesFetching}
            hasMore={hasMorePromoCodes}
            isLoadingMore={isFetchingMorePromoCodes}
            onLoadMore={fetchNextPromoCodes}
            loadingMoreMessage="読み込み中..."
            // A failed next page stops auto-loading (the sentinel would otherwise re-request
            // the same page in a loop) and keeps the loaded rows, with a 再試行 button at the
            // end of the list; a failed first page shows the error instead of "no results".
            loadMoreFailed={isPromoCodesLoadMoreFailed}
            loadFailed={isPromoCodesError && !isPromoCodesLoadMoreFailed}
            loadFailedMessage={resolveApiErrorMessage(promoCodesError)}
            onRetry={() => void refetchPromoCodes()}
            retryLabel="再試行"
            triggerClassName={`h-8 w-fit max-w-[240px] min-w-[140px] text-xs ${filterActiveClass(
              promo_code !== null,
            )}`}
            contentClassName="min-w-[280px]"
          />
        </div>
      )}
    </div>
  );
}
