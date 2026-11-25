'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Error as ErrorState } from '@/components/common/data-state-boundary/error';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { adminStoreControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreSummaryDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { StoreListPagination } from './_components/store-list-pagination';
import { StoresFilters } from './_components/stores-filters';
import { StoresTableColumns } from './_components/stores-table-columns';
import { StoresFiltersProvider } from './_contexts/stores-filters-context';
import { useStoresFilters } from './_hooks/use-stores-filters';

/*
 * TODO(round3) B1 — the bulk 「テリトリー変更」 (Y-02 FR-001 / Y-15 FR-M005, spec FR-024〜FR-036b)
 * is Phase 2: Y-15 組織階層管理 is Phase 2 on the client's CRM Category board. Row selection, the
 * bulk bar, 選択中のみ表示, the FR-027 select-all dialog and `StoreBulkTerritoryDialog` exist only
 * to serve that action, so all of it is commented out below rather than deleted. Round 3
 * uncomments every `TODO(round3) B1` block in this file, restores the imports
 * (`useAuthUser`, `useQueryClient`, `RowSelectionState`, `Eye` / `Shuffle`, `AlertDialog*`,
 * `Button`, `Toggle`, `Tooltip*`, `UserRole`, `StoreBulkTerritoryDialog`, `API_UNSUPPORTED_NOTE`) and wires
 * `handleBulkExecute` to the BE's bulk endpoint.
 */

// TODO(round3) B1
// /**
//  * Page size the FR-027 select-all reads the matching set with — the `limit` ceiling of
//  * API-083 `GET /admin/stores`.
//  */
// const SELECT_ALL_PAGE_SIZE = 100;

function StoresPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  // TODO(round3) B1
  // const queryClient = useQueryClient();
  // const { hasRole } = useAuthUser();
  // // FR-024: the bulk territory change is System / Headquarter only (Y-02 FR-001, Y-15 FR-M005)
  // const canBulkChange = hasRole([UserRole.Headquarter, UserRole.System]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // TODO(round3) B1
  // const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // // FR-025a: the full row for every selected id, accumulated across pages, so the bulk dialog
  // // and the selected-only view can describe stores that are no longer on the page in view.
  // const [selectedMap, setSelectedMap] = useState<Record<string, StoreSummaryDto>>({});
  // const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  // const [selectAllDialogOpen, setSelectAllDialogOpen] = useState(false);
  // // Select-all spans several requests, so the dialog has to say it is working and refuse
  // // a second click while it does.
  // const [isSelectingAll, setIsSelectingAll] = useState(false);
  // const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const filtersHook = useStoresFilters();
  const {
    filters,
    setFilters,
    queryParams,
    currentPage,
    setCurrentPage,
    replaceCurrentPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
    clearFilters,
    hasActiveFilters,
    filterSummary,
  } = filtersHook;

  // TODO(round3) B1
  // const selectedIDs = useMemo(
  //   () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
  //   [rowSelection],
  // );
  //
  // const selectedStores = useMemo(
  //   () => selectedIDs.map((id) => selectedMap[id]).filter(Boolean) as StoreSummaryDto[],
  //   [selectedIDs, selectedMap],
  // );
  //
  // // FR-029: the selected-only view restricts the table to the selected stores — including ones
  // // outside the current page of the unrestricted result — and pages over that reduced set.
  // const showSelectedOnlyActive = showSelectedOnly && selectedIDs.length > 0;

  const sorting: SortingState = filters.sort_by
    ? [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }]
    : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    // FR-017: a sort change returns to page 1
    if (next.length === 0) {
      setFilters({ sort_by: null, sort_order: null, page: 1 });
    } else {
      setFilters({
        sort_by: next[0].id as typeof filters.sort_by,
        sort_order: next[0].desc ? 'desc' : 'asc',
        page: 1,
      });
    }
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminStoreControllerListOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
  });

  const stores = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  const totalStores = pagination?.totalItems ?? 0;
  // FR-001 / FR-016: the header badge and the banner's total figure are the unfiltered
  // in-scope total (D5). `totalAllItems` is nullable by contract — the server may decline the
  // extra count — so the filtered figure stands in when it is absent.
  const totalAllItems = pagination?.totalAllItems ?? totalStores;
  const limit = pagination?.limit ?? pageSize;
  // TODO(round3) B1 — feeds the FR-027 select-all offer on the selection column
  // const hasMorePages = totalStores > stores.length;

  // The last page that has rows; an empty result still has a page 1
  const lastPage = Math.max(1, Math.ceil(totalStores / limit));
  const page = pagination ? Math.min(currentPage, lastPage) : currentPage;

  // FR-023: a page beyond the result set (a stale or hand-typed address) is pulled back to the
  // last page with rows once the total is known, replacing the URL entry so Back does not
  // return to the empty page.
  useEffect(() => {
    if (isFetching || !pagination) return;
    if (currentPage > lastPage) {
      replaceCurrentPage(lastPage);
    }
  }, [isFetching, pagination, currentPage, lastPage, replaceCurrentPage]);

  // TODO(round3) B1 — the selected-only view (FR-029) and the selection handlers. Round 3 restores
  // this block in place of the plain `page` / `useEffect` above.
  // // The selected-only view pages over the accumulated selection, not over the query result.
  // // Reading the server's page here would strand the operator: the API clamps to the last page
  // // of the *filtered* result, so a selection larger than that result (selection survives filter
  // // changes, FR-025) could never be paged past page 1.
  // const serverPage = pagination?.page ?? currentPage;
  // const selectedOnlyPages = Math.max(1, Math.ceil(selectedStores.length / limit));
  // const page = showSelectedOnlyActive ? Math.min(currentPage, selectedOnlyPages) : serverPage;
  //
  // // FR-023: mirror the page actually rendered back into the URL so the footer and the address
  // // agree with the rows — the API clamps a page beyond the result set, and the selected-only
  // // view clamps against its own smaller total.
  // useEffect(() => {
  //   if (!showSelectedOnlyActive && isFetching) return;
  //   if (page !== currentPage) {
  //     setCurrentPage(page);
  //   }
  // }, [showSelectedOnlyActive, isFetching, page, currentPage, setCurrentPage]);
  //
  // // FR-025: selection is keyed by store and survives paging and filter changes.
  // const handleRowSelectionChange = (
  //   updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState),
  // ) => {
  //   const next = typeof updater === 'function' ? updater(rowSelection) : updater;
  //   setRowSelection(next);
  //   setSelectedMap((prevMap) => {
  //     const map = { ...prevMap };
  //     for (const store of stores) {
  //       if (next[store.id] && !map[store.id]) {
  //         map[store.id] = store;
  //       }
  //     }
  //     for (const id of Object.keys(map)) {
  //       if (!next[id]) delete map[id];
  //     }
  //     return map;
  //   });
  // };
  //
  // const displayTotal = showSelectedOnlyActive ? selectedStores.length : totalStores;
  // const displayStores = showSelectedOnlyActive
  //   ? selectedStores.slice((page - 1) * limit, page * limit)
  //   : stores;
  //
  // const selectedOnPage = useMemo(
  //   () => displayStores.filter((store) => selectedIDs.includes(store.id)).length,
  //   [displayStores, selectedIDs],
  // );
  //
  // const clearSelection = () => {
  //   setRowSelection({});
  //   setSelectedMap({});
  //   setShowSelectedOnly(false);
  // };
  //
  // /**
  //  * FR-027 second step: extend the selection to every store matching the current conditions.
  //  *
  //  * The matching set is read page by page instead of in one `limit = total` request: the list
  //  * endpoint caps `limit` at `SELECT_ALL_PAGE_SIZE`, so a single read of the whole set is
  //  * refused the moment the result outgrows the cap — and Y-02 puts the master at 300 stores
  //  * nationwide, well past it.
  //  *
  //  * The selection is applied only once every page has arrived, so a failure mid-way leaves the
  //  * previous selection untouched rather than a silent partial one.
  //  */
  // const handleSelectAll = async () => {
  //   setIsSelectingAll(true);
  //   try {
  //     const readPage = (pageToRead: number) =>
  //       queryClient.fetchQuery(
  //         adminStoreControllerListOptions({
  //           query: { ...queryParams, page: pageToRead, limit: SELECT_ALL_PAGE_SIZE },
  //         }),
  //       );
  //
  //     const firstPage = await readPage(1);
  //     const pageCount = firstPage.pagination.totalPages;
  //     const remainingPages = await Promise.all(
  //       Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => readPage(index + 2)),
  //     );
  //
  //     const nextSelection: RowSelectionState = {};
  //     const nextMap: Record<string, StoreSummaryDto> = {};
  //     for (const response of [firstPage, ...remainingPages]) {
  //       for (const store of response.items) {
  //         nextSelection[store.id] = true;
  //         nextMap[store.id] = store;
  //       }
  //     }
  //     setRowSelection(nextSelection);
  //     setSelectedMap(nextMap);
  //   } catch {
  //     // The shared QueryCache `onError` toasts the server's own message
  //     // (`src/providers/react-query.provider.tsx`); a local toast here would double it.
  //   } finally {
  //     setIsSelectingAll(false);
  //     setSelectAllDialogOpen(false);
  //   }
  // };

  const handleEditClick = useCallback(
    (storeId: string) => {
      router.push(withReturnTo(navigate('/stores/[id]/edit', storeId)));
    },
    [router, withReturnTo],
  );

  const columns: ColumnDef<StoreSummaryDto>[] = useMemo(
    () =>
      StoresTableColumns({
        // TODO(round3) B1 — the selection column serves only the bulk territory change
        // canBulkChange,
        // hasMorePages,
        // onRequestSelectAll: () => setSelectAllDialogOpen(true),
        onEditClick: handleEditClick,
      }),
    [handleEditClick],
  );

  return (
    <>
      {/* FR-001: the count beside the title is the unfiltered in-scope total */}
      <PageHeader
        title="店舗管理"
        badge={
          isLoading ? (
            <Skeleton className="h-5 w-12 rounded-full" />
          ) : isError && !data ? null : (
            <Badge
              variant="outline"
              className="text-muted-foreground text-xs font-normal tabular-nums"
            >
              {totalAllItems.toLocaleString()}件
            </Badge>
          )
        }
        actions={
          <RoleGatedButton
            // FR-002: registering a store is System / Headquarter only — `stores.create` is
            // granted to exactly those two roles in ROLE_PERMISSIONS (Y-02 permission matrix).
            requiredPermission={Permission.StoresCreate}
            denyTooltip="本部権限が必要です"
            type="button"
            className="gap-1"
            onClick={() => router.push(withReturnTo(navigate('/stores/create')))}
          >
            <Plus className="size-4" />
            新規登録
          </RoleGatedButton>
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-6 pt-4">
        <Card className="gap-0 overflow-hidden rounded-xl border p-0">
          <div className="px-4 py-3">
            <StoresFiltersProvider value={filtersHook}>
              <StoresFilters isFilterOpen={isFilterOpen} onFilterOpenChange={setIsFilterOpen} />
            </StoresFiltersProvider>

            {/*
              TODO(round3) B1 — FR-028: the bulk bar (HQ/System only). Round 3 uncomments it, drops
              the `disabled` + tooltip wrapper once the bulk endpoint exists, and opens the dialog.

            {canBulkChange && selectedIDs.length > 0 && (
              <div className="bg-primary/10 border-primary/20 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2">
                <span className="text-primary text-sm font-medium">
                  {selectedIDs.length}件選択中
                </span>
                <span className="text-muted-foreground text-xs">
                  （このページで {selectedOnPage}件）
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  選択解除
                </Button>
                <div className="bg-primary/20 h-4 w-px" />
                <Toggle
                  pressed={showSelectedOnly}
                  onPressedChange={(pressed) => {
                    setShowSelectedOnly(pressed);
                    setCurrentPage(1);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                >
                  <Eye className="size-3" />
                  選択中のみ表示
                </Toggle>
                <div className="bg-primary/20 h-4 w-px" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Button
                        size="sm"
                        className="gap-1"
                        disabled
                        onClick={() => setBulkDialogOpen(true)}
                      >
                        <Shuffle className="size-4" />
                        テリトリーを変更（{selectedIDs.length}件）
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{API_UNSUPPORTED_NOTE}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            */}
          </div>

          {/* FR-016 */}
          <FilterResultBanner
            show={hasActiveFilters && !(isError && !data)}
            totalCount={totalAllItems}
            filteredCount={totalStores}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          {isError && !data ? (
            // A failed read is not an empty list: say so, and offer a retry
            <div className="px-4 pb-4">
              <ErrorState
                title="店舗一覧を取得できませんでした"
                onRetry={() => {
                  void refetch();
                }}
              />
            </div>
          ) : (
            <DataTable
              columns={columns}
              // TODO(round3) B1 — `displayStores` (the selected-only view) replaces `stores`
              data={stores}
              isLoading={isLoading}
              isFetching={isFetching}
              isError={isError}
              onRetry={() => void refetch()}
              errorTitle="店舗一覧を取得できませんでした"
              variant="simple"
              onRowClick={(row) => {
                router.push(withReturnTo(navigate('/stores/[id]', row.id)));
              }}
              className="rounded-none border-x-0 border-b-0"
              containerClassName={
                isFilterOpen ? 'max-h-[calc(100vh-370px)]' : 'max-h-[calc(100vh-320px)]'
              }
              tableOptions={{
                onSortingChange: handleSortingChange,
                manualSorting: true,
                // TODO(round3) B1 — `rowSelection` / `onRowSelectionChange: handleRowSelectionChange`
                state: { sorting },
                getRowId: (originalRow) => originalRow.id,
              }}
              emptyContent={
                // FR-018: distinguish "nothing matches these conditions" from "no store exists yet"
                <Empty
                  variant={hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="店舗"
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              }
            />
          )}

          {/* TODO(round3) B1 — `displayTotal` (the selected-only view) replaces `totalStores` */}
          {!isError && totalStores > 0 && (
            <StoreListPagination
              currentPage={page}
              total={totalStores}
              pageSize={limit}
              pageSizeOptions={pageSizeOptions}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>

      {/*
        TODO(round3) B1 — FR-027 second step of select-all, and the bulk territory dialog (pass
        `onExecute={handleBulkExecute}` once the bulk endpoint exists).

      <AlertDialog open={selectAllDialogOpen} onOpenChange={setSelectAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>該当する全件を選択しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在のフィルター条件に該当する <strong>{totalStores}件</strong> すべてを選択しますか？
              現在ページ（{stores.length}
              件）のみの選択を維持する場合は「このページのみ選択」を選んでください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSelectingAll}>このページのみ選択</AlertDialogCancel>
            <AlertDialogAction disabled={isSelectingAll} onClick={handleSelectAll}>
              {isSelectingAll ? '選択中…' : `${totalStores}件すべてを選択`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StoreBulkTerritoryDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedStores={selectedStores}
      />
      */}
    </>
  );
}

export default function StoresPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StoresPageContent />
    </Suspense>
  );
}
