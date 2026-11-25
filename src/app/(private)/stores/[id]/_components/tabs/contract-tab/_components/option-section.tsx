'use client';

import { useMemo, useState } from 'react';

import { formatYen } from '@/utils/format.util';
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
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card, CardHeader } from '@/components/ui/card';

import { AdminStoreSales__MutualUseApi084 } from '@/lib/api-real';
import {
  adminStoreSettingsControllerListOptionsInfiniteOptions,
  adminStoreSettingsControllerListOptionsOptions,
  adminStoreSettingsControllerListOptionsQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreOptionDto, StoreOptionListResponseDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { BindItemsDrawer } from './bind-items-drawer';
import { RemoveActionButton } from './remove-action-button';
import { type SetDiff, applySetDiff, fetchEnabledIds } from './replace-set.util';
import { SectionHeader } from './section-header';
import { SectionLoadError } from './section-load-error';

/** The API caps `limit` at 100 — the largest page, so the fewest requests */
const OPTION_PAGE_SIZE = 100;

/** The linked table pages from 20 rows; the page-number row only appears past one page */
const LINKED_PAGE_SIZE = 20;

/** D-FR-038 — 販売設定（オプション） is HQ/System only; the disabled controls say so */
const OPTION_SALES_DENY_TOOLTIP = '販売設定（オプション）はHQ/Systemのみ操作可能';

// Stable fallback, so the table's row model is not rebuilt on every render
const EMPTY_OPTIONS: StoreOptionDto[] = [];

export function OptionSection({ storeId }: { storeId: string }) {
  const queryClient = useQueryClient();

  // `GET …/options` lists the option master with a per-store `enabled` filter. The linked table
  // pages through `enabled=true` with the footer pagination, so every linked option can be reached
  // (and unlinked) however many there are; the drawer infinite-scrolls `enabled=false`. Both keys
  // sit under the generated one, so the path-only invalidation below refreshes both.
  const [linkedPage, setLinkedPage] = useState(1);
  const [linkedPageSize, setLinkedPageSize] = useState(LINKED_PAGE_SIZE);

  const {
    data: linkedOptions,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    ...adminStoreSettingsControllerListOptionsOptions({
      path: { id: storeId },
      query: { enabled: true, page: linkedPage, limit: linkedPageSize },
    }),
    enabled: Boolean(storeId),
    // Paging keeps the current page on screen instead of collapsing the table into the skeleton
    placeholderData: keepPreviousData,
  });

  const linkedTotal = linkedOptions?.pagination.totalItems ?? 0;

  const {
    data: candidatePages,
    isError: isCandidatesError,
    refetch: refetchCandidates,
    isFetching: isFetchingCandidates,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...adminStoreSettingsControllerListOptionsInfiniteOptions({
      path: { id: storeId },
      query: { enabled: false, isActive: true, limit: OPTION_PAGE_SIZE },
    }),
    enabled: Boolean(storeId),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: StoreOptionListResponseDto,
      allPages: StoreOptionListResponseDto[],
    ) => (allPages.length < lastPage.pagination.totalPages ? allPages.length + 1 : undefined),
  });

  const items = linkedOptions?.items ?? EMPTY_OPTIONS;

  const candidateOptions = useMemo(
    () => candidatePages?.pages.flatMap((page) => page.items) ?? [],
    [candidatePages?.pages],
  );

  const [catalogSearch, setCatalogSearch] = useState('');
  const debouncedCatalogSearch = useDebounce(catalogSearch, 300);

  // `GET …/options` takes no keyword parameter, so the drawer's search narrows what has been
  // loaded; scrolling the list loads the next page of the master behind it.
  const availableOptions = useMemo(() => {
    const keyword = debouncedCatalogSearch.trim().toLowerCase();
    return candidateOptions
      .filter(
        (option) =>
          !keyword ||
          option.name.toLowerCase().includes(keyword) ||
          option.optionCode.toLowerCase().includes(keyword),
      )
      .map((option) => ({
        id: option.optionId,
        name: option.name,
        // D18 — options carry no 全社共通 / 当店限定 origin, so the row has no badge. The meta line
        // shows the human-readable code (OP-xxxx), not the internal UUID (BUG-U5-05).
        subText: `${formatYen(option.fee)} · ${option.optionCode}`,
      }));
  }, [candidateOptions, debouncedCatalogSearch]);

  /**
   * D9 — オプション moved from per-row link/unlink to a full replace: `PUT …/options` takes the
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
            ...adminStoreSettingsControllerListOptionsOptions({
              path: { id: storeId },
              query: { enabled: true, page, limit: OPTION_PAGE_SIZE },
            }),
            staleTime: 0,
          }),
        (option) => option.optionId,
      );
      const { data } =
        await AdminStoreSales__MutualUseApi084.adminStoreSettingsControllerReplaceOptions({
          path: { id: storeId },
          body: { optionIds: applySetDiff(currentIds, diff) },
          throwOnError: true,
        });
      return data;
    },
    // Refresh on failure too: the set was just re-read, and a refused write may mean it moved
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: adminStoreSettingsControllerListOptionsQueryKey({ path: { id: storeId } }),
      }),
  });

  const columns = useMemo<ColumnDef<StoreOptionDto>[]>(
    () => [
      {
        accessorKey: 'optionCode',
        header: 'オプションID',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.optionCode}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'オプション名',
        // Wraps (an unbroken token included) so a long name cannot push the unlink action out of
        // view at 1024px (BUG-U5-03)
        cell: ({ row }) => (
          <span className="text-xs font-medium [overflow-wrap:anywhere]">{row.original.name}</span>
        ),
        meta: { className: 'w-full min-w-40 whitespace-normal' },
      },
      {
        id: 'priceIncludingTax',
        header: '料金（税込）',
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">{formatYen(row.original.fee)}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right text-xs font-semibold">操作</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <RemoveActionButton
              requiredPermission={Permission.StoresConfigContract}
              denyTooltip={OPTION_SALES_DENY_TOOLTIP}
              dialogTitle="オプションの紐づけを解除しますか？"
              dialogDescription={`「${row.original.name}」の紐づけを解除します。新規契約はできなくなります。`}
              isPending={replaceMutation.isPending}
              onConfirm={async () => {
                await replaceMutation.mutateAsync({ remove: [row.original.optionId] });
                // Unlinking the only row of a later page would leave it empty — step back one
                if (items.length === 1) setLinkedPage((page) => Math.max(page - 1, 1));
                toast.success('オプションの紐づけを解除しました');
              }}
            />
          </div>
        ),
      },
    ],
    [replaceMutation, items.length],
  );

  const handleBindOptions = async (selectedOptionIds: string[]) => {
    if (!storeId || selectedOptionIds.length === 0) return false;
    try {
      await replaceMutation.mutateAsync({ add: selectedOptionIds });
    } catch {
      // Already surfaced by the shared mutation-error toast; the drawer keeps the selection
      return false;
    }
    toast.success('オプションを紐づけました');
    return true;
  };

  const hasLoadError = isError && !linkedOptions;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="p-4 pb-3">
        <SectionHeader
          title="オプション"
          count={linkedTotal}
          isLoading={isLoading}
          isError={hasLoadError}
          action={
            <BindItemsDrawer
              title="オプションを紐づける"
              description="「商材・施策 > オプション管理」で作成されたオプションから、この店舗で扱うオプションを選んで紐づけてください。"
              searchPlaceholder="オプション名・IDで検索"
              listLabel="未紐づけのオプション"
              emptySelectionLabel="オプションを選択してください"
              emptyLabel="紐づけ可能なオプションはありません"
              items={availableOptions}
              isLoading={isFetchingCandidates && !isFetchingNextPage}
              isError={isCandidatesError}
              onRetry={() => void refetchCandidates()}
              hasMore={hasNextPage}
              onLoadMore={() => void fetchNextPage()}
              isLoadingMore={isFetchingNextPage}
              search={catalogSearch}
              onSearchChange={setCatalogSearch}
              getSubText={(item) => item.subText}
              denyTooltip={OPTION_SALES_DENY_TOOLTIP}
              onBind={handleBindOptions}
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
        errorTitle="オプションの取得に失敗しました"
        className="rounded-none border-0 border-t"
        containerClassName="max-h-[420px]"
        emptyContent={
          hasLoadError ? (
            <SectionLoadError
              title="オプションの取得に失敗しました"
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
