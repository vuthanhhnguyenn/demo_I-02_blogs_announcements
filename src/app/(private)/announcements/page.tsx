'use client';
// Client component: URL filter state (nuqs), React Query data/mutations, dialogs and row navigation.
import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { NoticeConfirmDialog } from '@/app/(private)/blogs/_components/notice-confirm-dialog';
import {
  NOTICE_CATEGORY_NONE_VALUE,
  NOTICE_PAGE_SIZES,
} from '@/app/(private)/blogs/_constants/notice.constants';
import { useNoticeFilters } from '@/app/(private)/blogs/_hooks/use-notice-filters.hook';
import { useNoticeRowActions } from '@/app/(private)/blogs/_hooks/use-notice-row-actions.hook';
import type { NoticeRow, NoticeSortKey } from '@/app/(private)/blogs/_types/notice.type';
import { isISODateString } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { adminStoreControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import {
  getCrmArticleCategoriesOptions,
  getCrmNoticesOptions,
} from '@/lib/api/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { AnnouncementFilters } from './_components/announcement-filters';
import { AnnouncementListHeaderActions } from './_components/announcement-list-header-actions';
import { AnnouncementPreviewDialog } from './_components/announcement-preview-dialog';
import { AnnouncementTableColumns } from './_components/announcement-table-columns';
import {
  ANNOUNCEMENT_ACTION_TOASTS,
  ANNOUNCEMENT_BRAND_FILTER_OPTIONS,
  ANNOUNCEMENT_CATEGORY_LIST_QUERY,
  ANNOUNCEMENT_CHANNEL_FILTER_OPTIONS,
  ANNOUNCEMENT_CONFIRM_COPY,
  ANNOUNCEMENT_ENTITY_LABEL,
  ANNOUNCEMENT_LIST_ERROR_TITLE,
  ANNOUNCEMENT_PAGE_TITLE,
  ANNOUNCEMENT_SCOPE_FILTER_OPTIONS,
  ANNOUNCEMENT_SORT_KEYS,
  ANNOUNCEMENT_STATUS_FILTER_OPTIONS,
  getAnnouncementTableMaxHeightClass,
} from './_constants/announcement.constants';

function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null,
) {
  return value ? (options.find((option) => option.value === value)?.label ?? value) : '';
}

function AnnouncementsPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<NoticeRow | null>(null);
  const { confirmTarget, openConfirm, closeConfirm, confirm, restore, isPending } =
    useNoticeRowActions({ toasts: ANNOUNCEMENT_ACTION_TOASTS });

  const filtersHook = useNoticeFilters({
    type: 'notice',
    sortKeys: ANNOUNCEMENT_SORT_KEYS,
    withPublishEndRange: true,
  });
  const {
    filters,
    clearFilters,
    hasActiveFilters,
    queryParams,
    scopeQueryParams,
    showStoreFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sort,
    order,
    isExplicitSort,
    handleSort,
  } = filtersHook;

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...getCrmNoticesOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
  });

  // The in-panel 店舗 narrows `totalAllItems` too; the header count stays on the header scope
  // (prototype L417 scopedPosts), so ask the scope alone only in that case.
  const isPanelStoreActive = showStoreFilter && filters.storeId !== null;
  const { data: scopeData } = useQuery({
    ...getCrmNoticesOptions({ query: scopeQueryParams }),
    enabled: isPanelStoreActive,
  });

  // Labels for the filter summary (same query keys as the filter panel, so no extra request).
  const { data: categoriesRes } = useQuery({
    ...getCrmArticleCategoriesOptions({ query: ANNOUNCEMENT_CATEGORY_LIST_QUERY }),
    enabled: filters.categoryId !== null && filters.categoryId !== NOTICE_CATEGORY_NONE_VALUE,
  });
  const { data: storeRes } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.storeId ?? '' } }),
    enabled: isPanelStoreActive,
  });

  const announcements = data?.items ?? [];
  const pagination = data?.pagination;
  const totalFilteredItems = pagination?.totalItems ?? 0;
  const totalAllItems = (isPanelStoreActive ? scopeData?.totalAllItems : data?.totalAllItems) ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;
  const totalPages = pagination?.totalPages ?? 0;

  // A page past the end (rows deleted, smaller result) falls back to the last page.
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages, setCurrentPage]);

  // prototype L366-L379 buildFilterSummary order.
  const categoryLabel =
    filters.categoryId === NOTICE_CATEGORY_NONE_VALUE
      ? '未分類'
      : (categoriesRes?.items.find((category) => category.id === filters.categoryId)?.name ?? '');
  const filterSummary = [
    filters.q.trim() ? `"${filters.q.trim()}"` : '',
    categoryLabel,
    optionLabel(ANNOUNCEMENT_SCOPE_FILTER_OPTIONS, filters.brandScope),
    optionLabel(ANNOUNCEMENT_BRAND_FILTER_OPTIONS, filters.brandCode),
    isPanelStoreActive ? (storeRes?.name ?? '') : '',
    optionLabel(ANNOUNCEMENT_CHANNEL_FILTER_OPTIONS, filters.channel),
    optionLabel(ANNOUNCEMENT_STATUS_FILTER_OPTIONS, filters.publishStatus),
    isISODateString(filters.publishFrom) ? `公開日From: ${filters.publishFrom}` : '',
    isISODateString(filters.publishTo) ? `公開日To: ${filters.publishTo}` : '',
    isISODateString(filters.publishEndFrom) ? `掲載終了日From: ${filters.publishEndFrom}` : '',
    isISODateString(filters.publishEndTo) ? `掲載終了日To: ${filters.publishEndTo}` : '',
  ];

  // Neutral headers until the user sorts; the request still uses the default order (FR-012).
  const sorting: SortingState =
    isExplicitSort && sort ? [{ id: sort, desc: order === 'desc' }] : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) return;
    // prototype L287-L295: first click ascending, then toggle; back to page 1.
    handleSort(next[0].id as NoticeSortKey);
  };

  const columns: ColumnDef<NoticeRow>[] = useMemo(
    () =>
      AnnouncementTableColumns({
        onPreview: setPreviewTarget,
        onEdit: (row) => router.push(withReturnTo(navigate('/announcements/[id]/edit', row.id))),
        onPublish: (row) => openConfirm('publish', row),
        onUnpublish: (row) => openConfirm('unpublish', row),
        onDelete: (row) => openConfirm('delete', row),
        onRestore: (row) => restore({ path: { id: row.id } }),
      }),
    [router, withReturnTo, openConfirm, restore],
  );

  const emptyState = {
    variant: hasActiveFilters ? ('filtered' as const) : ('empty' as const),
    entityLabel: ANNOUNCEMENT_ENTITY_LABEL,
    onAction: hasActiveFilters ? clearFilters : undefined,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title={ANNOUNCEMENT_PAGE_TITLE}
        badge={
          <Badge
            variant="outline"
            className="text-muted-foreground text-xs font-normal tabular-nums"
          >
            {totalAllItems.toLocaleString('ja-JP')}件
          </Badge>
        }
        actions={<AnnouncementListHeaderActions />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-4">
        <Card className="flex min-h-0 flex-col gap-0 rounded-xl border p-0">
          <AnnouncementFilters
            isFilterOpen={isFilterOpen}
            onFilterOpenChange={setIsFilterOpen}
            filtersHook={filtersHook}
          />

          <FilterResultBanner
            show={hasActiveFilters}
            totalCount={totalAllItems}
            filteredCount={totalFilteredItems}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataStateBoundary
            isLoading={isLoading}
            isError={isError && !data}
            isEmpty={!isLoading && announcements.length === 0}
            onRetry={() => void refetch()}
            errorTitle={ANNOUNCEMENT_LIST_ERROR_TITLE}
            emptyState={emptyState}
            skeleton={
              <DataTable
                tableSize="md"
                columns={columns}
                data={[]}
                isLoading
                variant="simple"
                className="rounded-none border-x-0 border-b-0"
                containerClassName={getAnnouncementTableMaxHeightClass(
                  isFilterOpen,
                  hasActiveFilters,
                )}
              />
            }
          >
            <DataTable
              tableSize="md"
              columns={columns}
              data={announcements}
              variant="simple"
              isFetching={isFetching}
              isError={isError}
              onRetry={() => void refetch()}
              errorTitle={ANNOUNCEMENT_LIST_ERROR_TITLE}
              className="rounded-none border-x-0 border-b-0"
              containerClassName={getAnnouncementTableMaxHeightClass(
                isFilterOpen,
                hasActiveFilters,
              )}
              onRowClick={(row) =>
                router.push(withReturnTo(navigate('/announcements/[id]', row.id)))
              }
              getRowClassName={(row) => (row.deletedAt ? 'opacity-60' : undefined)}
              tableOptions={{
                getRowId: (row) => row.id,
                onSortingChange: handleSortingChange,
                manualSorting: true,
                state: { sorting },
              }}
            />
          </DataStateBoundary>

          {!isLoading && !isError && (
            <TablePaginationWithSize
              currentPage={page}
              total={totalFilteredItems}
              pageSize={limit}
              pageSizeOptions={NOTICE_PAGE_SIZES}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>

      <NoticeConfirmDialog
        kind={confirmTarget?.kind ?? null}
        copy={ANNOUNCEMENT_CONFIRM_COPY}
        targetTitle={confirmTarget?.row.title ?? ''}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
        onConfirm={confirm}
        isPending={isPending}
      />

      <AnnouncementPreviewDialog
        row={previewTarget}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
      />
    </div>
  );
}

export default function AnnouncementsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AnnouncementsPageContent />
    </Suspense>
  );
}
