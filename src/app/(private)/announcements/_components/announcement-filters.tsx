'use client';
// Client component: search input, filter toggle state and select/date-picker handlers.
import { useMemo, useState } from 'react';

import {
  NOTICE_FILTER_ALL_VALUE,
  NOTICE_PUBLISH_FROM_PLACEHOLDER,
  NOTICE_PUBLISH_TO_PLACEHOLDER,
  NOTICE_STORE_FILTER_ALL_OPTION,
} from '@/app/(private)/blogs/_constants/notice.constants';
import type { NoticeFiltersHook } from '@/app/(private)/blogs/_hooks/use-notice-filters.hook';
import type {
  NoticeBrandCode,
  NoticeBrandScope,
  NoticeChannel,
  NoticeDisplayStatus,
} from '@/app/(private)/blogs/_types/notice.type';
import { filterActiveClass, toSelectItems } from '@/utils/app.util';
import { formatISODateLocal, parseDate } from '@/utils/date.util';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';

import { SearchableSelect } from '@/components/common/searchable-select';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  adminStoreControllerDetailOptions,
  adminStoreControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreListResponseDto } from '@/lib/api-real/types.gen';
import { getCrmArticleCategoriesOptions } from '@/lib/api/@tanstack/react-query.gen';

import {
  ANNOUNCEMENT_BRAND_FILTER_OPTIONS,
  ANNOUNCEMENT_CATEGORY_FILTER_HEAD_OPTIONS,
  ANNOUNCEMENT_CATEGORY_LIST_QUERY,
  ANNOUNCEMENT_CHANNEL_FILTER_OPTIONS,
  ANNOUNCEMENT_PUBLISH_END_FROM_PLACEHOLDER,
  ANNOUNCEMENT_PUBLISH_END_TO_PLACEHOLDER,
  ANNOUNCEMENT_SCOPE_FILTER_OPTIONS,
  ANNOUNCEMENT_SEARCH_PLACEHOLDER,
  ANNOUNCEMENT_STATUS_FILTER_OPTIONS,
} from '../_constants/announcement.constants';

const STORE_PAGE_SIZE = 20;

const BRAND_ITEMS = toSelectItems(ANNOUNCEMENT_BRAND_FILTER_OPTIONS);
const SCOPE_ITEMS = toSelectItems(ANNOUNCEMENT_SCOPE_FILTER_OPTIONS);
const CHANNEL_ITEMS = toSelectItems(ANNOUNCEMENT_CHANNEL_FILTER_OPTIONS);
const STATUS_ITEMS = toSelectItems(ANNOUNCEMENT_STATUS_FILTER_OPTIONS);

/** `all` sentinel → no condition. */
function fromSelectValue<T extends string>(value: string | null): T | null {
  return !value || value === NOTICE_FILTER_ALL_VALUE ? null : (value as T);
}

/** URL `YYYY-MM-DD` → local-midnight Date for the picker. */
function toPickerDate(value: string | null): Date | undefined {
  return value ? (parseDate(`${value}T00:00:00`) ?? undefined) : undefined;
}

interface AnnouncementFiltersProps {
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  filtersHook: NoticeFiltersHook;
}

/**
 * Toolbar + detailed filters (prototype L523-L651): カテゴリ, 配信スコープ, ブランド, 店舗 (全店舗 only,
 * Clarification Q2), 掲載先, ステータス, 公開日 range, 掲載終了日 range.
 */
export function AnnouncementFilters({
  isFilterOpen,
  onFilterOpenChange,
  filtersHook,
}: AnnouncementFiltersProps) {
  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    activeDetailFilterCount,
    showStoreFilter,
  } = filtersHook;

  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  const { data: categoriesRes } = useQuery({
    ...getCrmArticleCategoriesOptions({ query: ANNOUNCEMENT_CATEGORY_LIST_QUERY }),
    // Also needed while closed so a category picked earlier keeps its label.
    enabled: isFilterOpen || filters.categoryId !== null,
  });
  const categoryOptions = useMemo(
    () => [
      ...ANNOUNCEMENT_CATEGORY_FILTER_HEAD_OPTIONS,
      // The お知らせ master has its own 「未分類」 record (holder for articles of deleted categories);
      // the fixed head already offers 未分類, so a same-named master entry is not listed twice.
      ...(categoriesRes?.items ?? [])
        .filter(
          (category) =>
            !ANNOUNCEMENT_CATEGORY_FILTER_HEAD_OPTIONS.some((head) => head.label === category.name),
        )
        .map((category) => ({
          value: category.id,
          label: category.name,
        })),
    ],
    [categoriesRes],
  );

  // Store roster from the real store master, server-paginated + searched (as equipment-filters).
  const {
    data: storesRes,
    isFetching: isStoresFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: {
        limit: STORE_PAGE_SIZE,
        keyword: storeSearchQuery.trim() || undefined,
        sort: 'name',
        order: 'asc',
      },
    }),
    enabled: showStoreFilter && isFilterOpen && isStorePopoverOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: StoreListResponseDto, allPages) => {
      const loadedPages = allPages.length;
      const totalPages = lastPage.pagination?.totalPages ?? 0;
      return loadedPages < totalPages ? loadedPages + 1 : undefined;
    },
  });
  const stores = useMemo(
    () => storesRes?.pages.flatMap((page) => page.items ?? []) ?? [],
    [storesRes],
  );
  const selectedStoreFromOptions = filters.storeId
    ? stores.find((store) => store.id === filters.storeId)
    : undefined;
  const { data: selectedStoreRes } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.storeId ?? '' } }),
    enabled: showStoreFilter && isFilterOpen && !!filters.storeId && !selectedStoreFromOptions,
  });
  const selectedStoreLabel = filters.storeId
    ? (selectedStoreFromOptions?.name ?? selectedStoreRes?.name)
    : NOTICE_STORE_FILTER_ALL_OPTION.label;

  const publishFromDate = toPickerDate(filters.publishFrom);
  const publishToDate = toPickerDate(filters.publishTo);
  const publishEndFromDate = toPickerDate(filters.publishEndFrom);
  const publishEndToDate = toPickerDate(filters.publishEndTo);

  return (
    <div className="space-y-3 px-4 py-3">
      {/* Row 1: Search + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-[400px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder={ANNOUNCEMENT_SEARCH_PLACEHOLDER}
            className="pl-9 text-xs"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={activeDetailFilterCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => onFilterOpenChange(!isFilterOpen)}
          >
            <SlidersHorizontal className="size-4" />
            {isFilterOpen ? '閉じる' : '詳細フィルター'}
            {activeDetailFilterCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-5 px-1 text-[10px]">
                {activeDetailFilterCount}
              </Badge>
            )}
            {isFilterOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>
      </div>

      {/* Expandable Filters */}
      {isFilterOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={toSelectItems(categoryOptions)}
            value={filters.categoryId ?? NOTICE_FILTER_ALL_VALUE}
            onValueChange={(value) => updateFilter('categoryId', fromSelectValue(value))}
          >
            <SelectTrigger
              className={`h-8 w-fit max-w-[240px] min-w-[180px] text-xs ${filterActiveClass(filters.categoryId !== null)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={SCOPE_ITEMS}
            value={filters.brandScope ?? NOTICE_FILTER_ALL_VALUE}
            onValueChange={(value) =>
              updateFilter('brandScope', fromSelectValue<NoticeBrandScope>(value))
            }
          >
            <SelectTrigger
              className={`h-8 w-[140px] text-xs ${filterActiveClass(filters.brandScope !== null)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNOUNCEMENT_SCOPE_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={BRAND_ITEMS}
            value={filters.brandCode ?? NOTICE_FILTER_ALL_VALUE}
            onValueChange={(value) =>
              updateFilter('brandCode', fromSelectValue<NoticeBrandCode>(value))
            }
          >
            <SelectTrigger
              className={`h-8 w-fit max-w-[240px] min-w-[140px] text-xs ${filterActiveClass(filters.brandCode !== null)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNOUNCEMENT_BRAND_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 店舗: only under the 全店舗 header scope, after ブランド (Clarification Q2). */}
          {showStoreFilter && (
            <SearchableSelect
              value={filters.storeId}
              valueLabel={selectedStoreLabel}
              options={stores}
              placeholder={NOTICE_STORE_FILTER_ALL_OPTION.label}
              searchPlaceholder="店舗名・店舗IDで検索..."
              emptyMessage="該当する店舗がありません"
              loadingMessage="店舗を読み込み中..."
              clearLabel={NOTICE_STORE_FILTER_ALL_OPTION.label}
              open={isStorePopoverOpen}
              onOpenChange={setIsStorePopoverOpen}
              onSearchChange={setStoreSearchQuery}
              onSelect={(store) => updateFilter('storeId', store?.id ?? null)}
              getOptionKey={(store) => store.id}
              getOptionLabel={(store) => store.name}
              getOptionKeywords={(store) =>
                [store.name, store.code, store.id, store.clubCode].filter(Boolean).join(' ')
              }
              renderOption={(store) => (
                <div className="flex min-w-0 flex-col items-start gap-0.5">
                  <TextWithTooltip
                    text={store.name}
                    wrapperClassName="w-full"
                    className="w-full"
                    side="right"
                    align="center"
                  />
                </div>
              )}
              isLoading={isStoresFetching && !isFetchingNextPage}
              hasMore={hasNextPage}
              isLoadingMore={isFetchingNextPage}
              onLoadMore={fetchNextPage}
              loadingMoreMessage="読み込み中..."
              triggerClassName={`h-8 w-fit max-w-[220px] min-w-[130px] justify-between px-3 text-xs font-normal ${filterActiveClass(filters.storeId !== null)}`}
            />
          )}

          <Select
            items={CHANNEL_ITEMS}
            value={filters.channel ?? NOTICE_FILTER_ALL_VALUE}
            onValueChange={(value) =>
              updateFilter('channel', fromSelectValue<NoticeChannel>(value))
            }
          >
            <SelectTrigger
              className={`h-8 w-[120px] text-xs ${filterActiveClass(filters.channel !== null)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNOUNCEMENT_CHANNEL_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={STATUS_ITEMS}
            value={filters.publishStatus ?? NOTICE_FILTER_ALL_VALUE}
            onValueChange={(value) =>
              updateFilter('publishStatus', fromSelectValue<NoticeDisplayStatus>(value))
            }
          >
            <SelectTrigger
              className={`h-8 w-[120px] text-xs ${filterActiveClass(filters.publishStatus !== null)}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNOUNCEMENT_STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 公開日 range (prototype L617-L632) */}
          <div className="flex items-center gap-1">
            <DatePicker
              date={publishFromDate}
              onDateChange={(date) =>
                updateFilter('publishFrom', date ? formatISODateLocal(date) : null)
              }
              disabledDate={publishToDate ? { after: publishToDate } : undefined}
              placeholder={NOTICE_PUBLISH_FROM_PLACEHOLDER}
              className={`h-8 w-[160px] text-xs ${filters.publishFrom ? 'border-primary bg-primary/10' : ''}`}
            />
            <span className="text-muted-foreground text-xs">〜</span>
            <DatePicker
              date={publishToDate}
              onDateChange={(date) =>
                updateFilter('publishTo', date ? formatISODateLocal(date) : null)
              }
              disabledDate={publishFromDate ? { before: publishFromDate } : undefined}
              placeholder={NOTICE_PUBLISH_TO_PLACEHOLDER}
              className={`h-8 w-[160px] text-xs ${filters.publishTo ? 'border-primary bg-primary/10' : ''}`}
            />
          </div>

          {/* 掲載終了日 range (prototype L633-L648, gap AL-01) */}
          <div className="flex items-center gap-1">
            <DatePicker
              date={publishEndFromDate}
              onDateChange={(date) =>
                updateFilter('publishEndFrom', date ? formatISODateLocal(date) : null)
              }
              disabledDate={publishEndToDate ? { after: publishEndToDate } : undefined}
              placeholder={ANNOUNCEMENT_PUBLISH_END_FROM_PLACEHOLDER}
              className={`h-8 w-[170px] text-xs ${filters.publishEndFrom ? 'border-primary bg-primary/10' : ''}`}
            />
            <span className="text-muted-foreground text-xs">〜</span>
            <DatePicker
              date={publishEndToDate}
              onDateChange={(date) =>
                updateFilter('publishEndTo', date ? formatISODateLocal(date) : null)
              }
              disabledDate={publishEndFromDate ? { before: publishEndFromDate } : undefined}
              placeholder={ANNOUNCEMENT_PUBLISH_END_TO_PLACEHOLDER}
              className={`h-8 w-[170px] text-xs ${filters.publishEndTo ? 'border-primary bg-primary/10' : ''}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
