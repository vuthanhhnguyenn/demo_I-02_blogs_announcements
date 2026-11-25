'use client';
// Client component: URL filter state (nuqs), React Query data/mutations, dialogs and row navigation.
import { Suspense, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

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

import { BlogFilters } from './_components/blog-filters';
import { BlogListHeaderActions } from './_components/blog-list-header-actions';
import { BlogPreviewDialog } from './_components/blog-preview-dialog';
import { BlogTableColumns } from './_components/blog-table-columns';
import { NoticeConfirmDialog } from './_components/notice-confirm-dialog';
import {
  BLOG_ACTION_TOASTS,
  BLOG_BRAND_FILTER_OPTIONS,
  BLOG_CATEGORY_LIST_QUERY,
  BLOG_CATEGORY_NONE_VALUE,
  BLOG_CHANNEL_FILTER_OPTIONS,
  BLOG_CONFIRM_COPY,
  BLOG_PAGE_SIZES,
  BLOG_SCOPE_FILTER_OPTIONS,
  BLOG_STATUS_FILTER_OPTIONS,
  getBlogTableMaxHeightClass,
} from './_constants/blog.constants';
import { useBlogFilters } from './_hooks/use-blog-filters.hook';
import { useNoticeRowActions } from './_hooks/use-notice-row-actions.hook';
import type { BlogRow, BlogSortKey } from './_types/blog.type';

function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null,
) {
  return value ? (options.find((option) => option.value === value)?.label ?? value) : '';
}

function BlogsPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<BlogRow | null>(null);
  const { confirmTarget, openConfirm, closeConfirm, confirm, restore, isPending } =
    useNoticeRowActions({ toasts: BLOG_ACTION_TOASTS });

  const filtersHook = useBlogFilters();
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
    ...getCrmArticleCategoriesOptions({ query: BLOG_CATEGORY_LIST_QUERY }),
    enabled: filters.categoryId !== null && filters.categoryId !== BLOG_CATEGORY_NONE_VALUE,
  });
  const { data: storeRes } = useQuery({
    ...adminStoreControllerDetailOptions({ path: { id: filters.storeId ?? '' } }),
    enabled: isPanelStoreActive,
  });

  const blogs = data?.items ?? [];
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

  // prototype L297-L309 buildFilterSummary order.
  const categoryLabel =
    filters.categoryId === BLOG_CATEGORY_NONE_VALUE
      ? '未分類'
      : (categoriesRes?.items.find((category) => category.id === filters.categoryId)?.name ?? '');
  const filterSummary = [
    filters.q.trim() ? `"${filters.q.trim()}"` : '',
    categoryLabel,
    optionLabel(BLOG_BRAND_FILTER_OPTIONS, filters.brandCode),
    optionLabel(BLOG_SCOPE_FILTER_OPTIONS, filters.brandScope),
    isPanelStoreActive ? (storeRes?.name ?? '') : '',
    optionLabel(BLOG_CHANNEL_FILTER_OPTIONS, filters.channel),
    optionLabel(BLOG_STATUS_FILTER_OPTIONS, filters.publishStatus),
    isISODateString(filters.publishFrom) ? `公開日From: ${filters.publishFrom}` : '',
    isISODateString(filters.publishTo) ? `公開日To: ${filters.publishTo}` : '',
  ];

  // Neutral headers until the user sorts; the request still uses the default order (FR-012).
  const sorting: SortingState =
    isExplicitSort && sort ? [{ id: sort, desc: order === 'desc' }] : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) return;
    // prototype L287-L295: first click ascending, then toggle; back to page 1.
    handleSort(next[0].id as BlogSortKey);
  };

  const columns: ColumnDef<BlogRow>[] = useMemo(
    () =>
      BlogTableColumns({
        onPreview: setPreviewTarget,
        onEdit: (row) => router.push(withReturnTo(navigate('/blogs/[id]/edit', row.id))),
        onPublish: (row) => openConfirm('publish', row),
        onUnpublish: (row) => openConfirm('unpublish', row),
        onDelete: (row) => openConfirm('delete', row),
        onRestore: (row) => restore({ path: { id: row.id } }),
      }),
    [router, withReturnTo, openConfirm, restore],
  );

  const emptyState = {
    variant: hasActiveFilters ? ('filtered' as const) : ('empty' as const),
    entityLabel: 'ブログ',
    onAction: hasActiveFilters ? clearFilters : undefined,
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="ブログ管理"
        badge={
          <Badge
            variant="outline"
            className="text-muted-foreground text-xs font-normal tabular-nums"
          >
            {totalAllItems.toLocaleString()}件
          </Badge>
        }
        actions={<BlogListHeaderActions />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-4">
        <Card className="flex min-h-0 flex-col gap-0 rounded-xl border p-0">
          <BlogFilters
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
            isEmpty={!isLoading && blogs.length === 0}
            onRetry={() => void refetch()}
            errorTitle="ブログ一覧の取得に失敗しました"
            emptyState={emptyState}
            skeleton={
              <DataTable
                tableSize="md"
                columns={columns}
                data={[]}
                isLoading
                variant="simple"
                className="rounded-none border-x-0 border-b-0"
                containerClassName={getBlogTableMaxHeightClass(isFilterOpen, hasActiveFilters)}
              />
            }
          >
            <DataTable
              tableSize="md"
              columns={columns}
              data={blogs}
              variant="simple"
              isFetching={isFetching}
              isError={isError}
              onRetry={() => void refetch()}
              errorTitle="ブログ一覧の取得に失敗しました"
              className="rounded-none border-x-0 border-b-0"
              containerClassName={getBlogTableMaxHeightClass(isFilterOpen, hasActiveFilters)}
              onRowClick={(row) => router.push(withReturnTo(navigate('/blogs/[id]', row.id)))}
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
              pageSizeOptions={BLOG_PAGE_SIZES}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>

      <NoticeConfirmDialog
        kind={confirmTarget?.kind ?? null}
        copy={BLOG_CONFIRM_COPY}
        targetTitle={confirmTarget?.row.title ?? ''}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
        onConfirm={confirm}
        isPending={isPending}
      />

      <BlogPreviewDialog
        // The list prototype's preview shows an image placeholder (blog-list PAR047), so the row's
        // thumbnail is not passed here; the detail and form previews do pass it.
        article={previewTarget ? { ...previewTarget, thumbnailUrl: null } : null}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
      />
    </div>
  );
}

export default function BlogsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BlogsPageContent />
    </Suspense>
  );
}
