'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatNextMonthStart, nextMonthStartISO } from '@/utils/format.util';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/react-table';
import { Eye, Shuffle } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminMemberControllerCreateBulkMutation,
  adminMemberControllerListOptions,
  adminMemberControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberListItemDto, PlanListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

import { MemberBulkContractDialog } from './_components/member-bulk-contract-dialog';
import { MembersFilters } from './_components/members-filters';
import { MembersTableColumns } from './_components/members-table-columns';
import {
  BRAND_GROUP_FILTER_OPTIONS,
  JOIN_PERIOD_LABELS,
  LAST_VISIT_LABELS,
  MEMBER_CONTRACT_TYPE_FILTER_OPTIONS,
  MEMBER_STATUS_FILTER_OPTIONS,
} from './_constants/constants';
import { MembersFiltersProvider } from './_contexts/members-filters-context';
import {
  type MembersFilters as MembersFiltersState,
  useMembersFilters,
} from './_hooks/use-members-filters';

/**
 * A bulk rejection names the members it refuses under `details` — `conflictingMemberIds`
 * for a member already covered by a booking (`E-BPC-200` / `E-BPC-205`), `invalidMemberIds`
 * for one with no main contract (`E-BPC-203`) or whose gender the target plan does not admit
 * (`E-BPC-206`), each capped at 100 ids. `ErrorResponseDto`
 * declares only code/message/userMessage/traceId, so `details` is narrowed at runtime
 * rather than cast.
 */
const BULK_REJECTED_ID_KEYS = ['conflictingMemberIds', 'invalidMemberIds'];

function extractRejectedMemberIds(error: unknown): string[] {
  const details = (error as { details?: unknown } | null)?.details;
  if (!details || typeof details !== 'object') return [];
  for (const key of BULK_REJECTED_ID_KEYS) {
    const ids = (details as Record<string, unknown>)[key];
    if (Array.isArray(ids)) return ids.filter((id): id is string => typeof id === 'string');
  }
  return [];
}

type ContractOption = PlanListItemDto;
type MemberItem = MemberListItemDto;

/** Page size used to walk the whole filtered result for 全件選択 (API `limit` maximum). */
const SELECT_ALL_PAGE_SIZE = 100;

/**
 * Max height of the table's own scroll box, by what is stacked above it: the 詳細フィルター
 * panel and the bulk-action bar each take one row, and the box is sized off the viewport, so
 * leaving either out pushes the pagination footer below the fold. Spelled out as whole class
 * names because Tailwind only emits arbitrary values it can see as literals.
 */
const TABLE_MAX_HEIGHT_CLASSES = {
  plain: 'max-h-[calc(100vh-285px)]',
  bulkBar: 'max-h-[calc(100vh-347px)]',
  filters: 'max-h-[calc(100vh-369px)]',
  filtersAndBulkBar: 'max-h-[calc(100vh-431px)]',
} as const;

function tableMaxHeightClass(isFilterOpen: boolean, isBulkBarVisible: boolean): string {
  if (isFilterOpen) {
    return isBulkBarVisible
      ? TABLE_MAX_HEIGHT_CLASSES.filtersAndBulkBar
      : TABLE_MAX_HEIGHT_CLASSES.filters;
  }
  return isBulkBarVisible ? TABLE_MAX_HEIGHT_CLASSES.bulkBar : TABLE_MAX_HEIGHT_CLASSES.plain;
}

/**
 * Key prefixes of the per-member queries a bulk change invalidates.
 *
 * The generated key factories require the member id, and a bulk change touches every
 * selected member, so the shared prefix is written out instead — TanStack matches query
 * keys by partial deep equality, so this reaches all of them at once.
 */
const MEMBER_DETAIL_QUERY_PREFIX = [{ _id: 'adminMemberControllerDetail' }] as const;
const MEMBER_MAIN_CONTRACT_QUERY_PREFIX = [
  { _id: 'adminMemberContractOpsControllerMainContract' },
] as const;

function MembersPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const { hasRole, hasPermission, isLoading: isAuthLoading } = useAuthUser();
  // FR-020 / permission matrix: bulk main-contract change is HQ/System only
  const canBulkChange = hasRole([UserRole.Headquarter, UserRole.System]);
  // FR-002: page-level gate, same MembersView permission the route guard uses. A role
  // without it (Trainer) must never see the roster, whether it arrived by menu or by
  // typing the URL — the roster is real PII and the list request is not even issued.
  const canViewMembers = hasPermission(Permission.MembersView);

  const handleEditMember = useCallback(
    (memberId: string) => {
      router.push(withReturnTo(navigate('/members/[id]/edit', memberId)));
    },
    [router, withReturnTo],
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Full member objects for every selected id, accumulated across pages so the
  // "selected only" view and the dialog preview work beyond the current page.
  const [selectedMap, setSelectedMap] = useState<Record<string, MemberItem>>({});
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [selectAllDialogOpen, setSelectAllDialogOpen] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const selectedIDs = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  const filtersHook = useMembersFilters();
  const {
    queryParams,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    pageSizeOptions,
    clearFilters,
    hasActiveFilters,
    isAllStoresScope,
    isStoreScopeLoading,
    storeFilterLabel,
    contractFilterLabel,
    promoCodeLabel,
  } = filtersHook;

  const sorting: SortingState = filters.sort_by
    ? [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }]
    : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    // FR-001: changing sort resets to the first page
    if (next.length === 0) {
      setFilters({ sort_by: null, sort_order: null, page: 1 });
    } else {
      // Sortable column ids are exactly the API's `sort` values — see MembersTableColumns.
      setFilters({
        sort_by: next[0].id as MembersFiltersState['sort_by'],
        sort_order: next[0].desc ? 'desc' : 'asc',
        page: 1,
      });
    }
  };

  const { data, error, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminMemberControllerListOptions({
      query: queryParams,
    }),
    enabled: canViewMembers && !isStoreScopeLoading,
    placeholderData: keepPreviousData,
  });
  const members = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  const totalMembers = pagination?.totalItems ?? 0;
  // Only present when the query carried `includeTotalAll`, and the server may still
  // decline the count under load. Left as null in that case: the banner drops its
  // 「全 N 件中」 prefix, because reusing the filtered total there would read as
  // "N of N — nothing filtered out" while a filter is plainly active.
  const totalAllItems = pagination?.totalAllItems ?? null;
  // Count shown next to the screen title: the roster within the current store scope,
  // NOT the filtered result — the prototype ties it to the filter banner's 全 N 件
  // so a filter moves 「M 件を抽出中」 and leaves the screen's own total alone. With no
  // filter active `totalItems` already is that scope total (`includeTotalAll` is only
  // sent while filtering), and it also carries the fallback when the server declines
  // the extra count.
  const scopeTotalMembers = totalAllItems ?? totalMembers;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;
  // Filtered result spans more than the current page → header checkbox offers "select all"
  const hasMorePages = totalMembers > members.length;

  // Requested page out of range: the API echoes the page it was asked for and serves
  // no rows rather than clamping, so pull the URL back to the last page that exists —
  // otherwise a stale bookmark lands on a permanently empty table. Only once a real
  // response is in hand: mid-flight it still describes the previous page
  // (`keepPreviousData`), and before the first one there is no page count to judge
  // against — clamping against the `?? 1` fallback would throw away the page a deep
  // link asked for while the query is still disabled (auth loading) or in flight.
  useEffect(() => {
    if (isFetching || !pagination) return;
    const lastPage = Math.max(1, pagination.totalPages);
    if (currentPage > lastPage) setCurrentPage(lastPage);
  }, [isFetching, pagination, currentPage, setCurrentPage]);

  // Update both the row-selection state and the accumulated object map together,
  // capturing objects for rows visible on the current page and dropping deselected ones.
  const handleRowSelectionChange = (
    updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState),
  ) => {
    const next = typeof updater === 'function' ? updater(rowSelection) : updater;
    setRowSelection(next);
    // Unticking the last row leaves the view with nothing to show, and the bulk bar that
    // holds the toggle goes with it — so the mode is dropped here as well. Kept on and it
    // would silently re-apply to the next single row picked, collapsing the table to it.
    if (!Object.values(next).some(Boolean)) setShowSelectedOnly(false);
    setSelectedMap((prevMap) => {
      const map = { ...prevMap };
      for (const member of members) {
        if (next[member.memberId] && !map[member.memberId]) {
          map[member.memberId] = member;
        }
      }
      for (const id of Object.keys(map)) {
        if (!next[id]) delete map[id];
      }
      return map;
    });
  };

  // Selected member objects (across pages) for the dialog preview and selected-only view
  const selectedMembers = useMemo(
    () => selectedIDs.map((id) => selectedMap[id]).filter(Boolean) as MemberItem[],
    [selectedIDs, selectedMap],
  );
  const showSelectedOnlyActive = showSelectedOnly && selectedIDs.length > 0;
  const displayMembers = showSelectedOnlyActive ? selectedMembers : members;

  // The bulk-action bar sits between the filters and the table, so it also drives the
  // table's viewport-derived height.
  const isBulkBarVisible = canBulkChange && selectedIDs.length > 0;

  // Number of currently-loaded (this page) rows that are selected
  const selectedOnPage = useMemo(
    () => members.filter((member) => selectedIDs.includes(member.memberId)).length,
    [members, selectedIDs],
  );

  // Active-filter summary shown in the filter-result banner. Store/contract names
  // come from the shared filter labels (single source of truth in the hook).
  const filterSummary = useMemo(() => {
    return [
      filters.search ? `"${filters.search}"` : '',
      isAllStoresScope ? (storeFilterLabel ?? '') : '',
      MEMBER_STATUS_FILTER_OPTIONS.find((option) => option.value === filters.status_group)?.label ??
        '',
      contractFilterLabel ?? '',
      MEMBER_CONTRACT_TYPE_FILTER_OPTIONS.find((option) => option.value === filters.contract_type)
        ?.label ?? '',
      BRAND_GROUP_FILTER_OPTIONS.find((option) => option.value === filters.brand_group[0])?.label ??
        '',
      filters.join_period ? `入会: ${JOIN_PERIOD_LABELS[filters.join_period] ?? ''}` : '',
      filters.last_visit ? `来館: ${LAST_VISIT_LABELS[filters.last_visit] ?? ''}` : '',
      promoCodeLabel ? `プロモ: ${promoCodeLabel}` : '',
    ];
  }, [
    filters.search,
    filters.status_group,
    filters.contract_type,
    filters.brand_group,
    filters.join_period,
    filters.last_visit,
    promoCodeLabel,
    isAllStoresScope,
    storeFilterLabel,
    contractFilterLabel,
  ]);

  const applyDateLabel = formatNextMonthStart();

  /**
   * What the failed-load block offers, chosen by what actually went wrong. A request the
   * conditions themselves made invalid (400/422) is not fixed by sending it again, so the
   * way out is to clear them; a refused one (403) has no way out from this screen at all.
   * Everything else — an outage, a transport failure — is worth retrying, the call is a GET.
   */
  const listErrorAction: { onAction?: () => void; actionLabel?: string } = useMemo(() => {
    const status = getApiErrorStatus(error);
    if (status === 403) return {};
    if (status === 400 || status === 422) {
      return { onAction: clearFilters, actionLabel: '条件をクリア' };
    }
    return { onAction: () => void refetch(), actionLabel: '再試行' };
  }, [error, clearFilters, refetch]);

  const clearSelection = () => {
    setRowSelection({});
    setSelectedMap({});
    setShowSelectedOnly(false);
  };

  // Select every member matching the current filter (across all pages) — A-01 select-all.
  // The API caps `limit` at 100, so the full result is walked page by page rather than
  // asked for in one oversized request (which answers 400 E-VAL-001).
  const handleSelectAll = async () => {
    setIsSelectingAll(true);
    try {
      const nextSelection: RowSelectionState = {};
      const nextMap: Record<string, MemberItem> = {};
      let pageToFetch = 1;
      let lastPage = 1;
      do {
        const result = await queryClient.fetchQuery(
          adminMemberControllerListOptions({
            query: {
              ...queryParams,
              page: pageToFetch,
              limit: SELECT_ALL_PAGE_SIZE,
              includeTotalAll: undefined,
            },
          }),
        );
        for (const member of result.items) {
          nextSelection[member.memberId] = true;
          nextMap[member.memberId] = member;
        }
        lastPage = result.pagination.totalPages;
        pageToFetch += 1;
      } while (pageToFetch <= lastPage);
      // Committed only once every page is in hand: a partial walk would leave the bulk bar
      // claiming a selection that covers less than the filter does, and the next step books
      // a contract change for exactly those members.
      setRowSelection(nextSelection);
      setSelectedMap(nextMap);
      setSelectAllDialogOpen(false);
    } catch (error) {
      // List queries are silent by default (`QueryCache.onError` toasts only for
      // `meta.showErrorToast`), so without this the dialog would simply close on a failed
      // walk and leave the page-only selection standing, unannounced.
      toast.error(resolveApiErrorMessage(error), {
        description: '選択内容は変更されていません。時間をおいて再度お試しください。',
      });
    } finally {
      setIsSelectingAll(false);
    }
  };

  const { mutateAsync: bulkChangeContract, isPending: isChangingMainContract } = useMutation({
    ...adminMemberControllerCreateBulkMutation(),
    // The provider's global handler already toasts `userMessage`; this call re-raises it
    // itself so the refused member numbers ride along instead of arriving as a second toast.
    meta: { suppressErrorToast: true },
  });

  const handleBulkChangeContract = async (contract: ContractOption) => {
    if (selectedIDs.length === 0) return;

    try {
      const result = await bulkChangeContract({
        body: {
          memberIds: selectedIDs,
          toPlanId: contract.planId,
          // The apply date is chosen by the client, not the server (QA09 §2.1).
          effectiveDate: nextMonthStartISO(),
          // `feeDiffHandling` and `reason` are left out on purpose: the client settled
          // on the minimal 3-field request at qa-137 (2026-08-05), keeping the dialog
          // free of extra inputs. The server defaults them.
        },
      });

      // The booked change surfaces on the roster, on each member's detail and on their
      // 主契約 card. Every key is passed unscoped: the generated key carries the whole
      // request, so naming this screen's own params would leave every other page/filter —
      // and every member detail — serving stale data for the client's 2-minute `staleTime`.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() }),
        queryClient.invalidateQueries({ queryKey: MEMBER_DETAIL_QUERY_PREFIX }),
        queryClient.invalidateQueries({ queryKey: MEMBER_MAIN_CONTRACT_QUERY_PREFIX }),
      ]);

      // A bulk change is BOOKED, not applied: the response is a queued job whose
      // `totalCount` is the number of members enrolled in it, and nothing moves until
      // the apply date — so the wording says "reserved", same as the prototype.
      toast.success(`${result.totalCount}名の主契約変更を予約しました`, {
        description: `${applyDateLabel}に適用されます`,
      });
      clearSelection();
    } catch (error) {
      // The server's own wording carries the failure; this screen only adds WHO was
      // refused, which the message itself does not spell out. The API names them by
      // memberId, while the operator matches rows by the 会員ID column, so the ids are
      // translated through the selection captured when the rows were picked.
      const labels = extractRejectedMemberIds(error).map(
        (id) => selectedMap[id]?.memberNumber ?? id,
      );
      toast.error(resolveApiErrorMessage(error), {
        description: labels.length
          ? `${labels.slice(0, 3).join('、')}${
              labels.length > 3 ? ` ほか${labels.length - 3}名` : ''
            }`
          : undefined,
      });
    } finally {
      // The selection survives a failure on purpose: the toast above names the members the
      // server refused, which is only actionable while those rows are still selected.
      setBulkDialogOpen(false);
    }
  };

  // Memoize so the column defs (and their inline `header` render functions) keep a
  // stable identity across renders. `flexRender` treats `columnDef.header` as a
  // component type, so a fresh function each render remounts the header cell — which
  // during the keepPreviousData refetch on sort remounts the sort tooltip and
  // replays its enter animation as a visible blink.
  const columns: ColumnDef<MemberListItemDto>[] = useMemo(
    () =>
      MembersTableColumns({
        canBulkChange,
        hasMorePages,
        onRequestSelectAll: () => setSelectAllDialogOpen(true),
        isAllStoresScope,
        onEditClick: handleEditMember,
      }),
    [canBulkChange, hasMorePages, isAllStoresScope, handleEditMember],
  );

  // Wait for the auth context before deciding access (avoids a denied flash).
  if (isAuthLoading) {
    return <Loading />;
  }

  if (!canViewMembers) {
    return (
      <div>
        <PageHeader title="会員一覧" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">会員一覧を閲覧する権限がありません</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="会員一覧"
        // Hidden while the roster could not be loaded: the count would read 0名,
        // which is a claim about the data rather than about the failure.
        badge={
          isError ? undefined : (
            <Badge
              variant="outline"
              className="text-muted-foreground text-xs font-normal tabular-nums"
            >
              {scopeTotalMembers.toLocaleString()}名
            </Badge>
          )
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card className="gap-0 overflow-hidden rounded-xl p-0">
          <div className="px-4 py-3">
            <MembersFiltersProvider value={filtersHook}>
              <MembersFilters isFilterOpen={isFilterOpen} onFilterOpenChange={setIsFilterOpen} />
            </MembersFiltersProvider>

            {isBulkBarVisible && (
              <div className="bg-primary/10 border-primary/20 mt-3 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
                <span className="text-primary text-sm font-medium">
                  {selectedIDs.length}名選択中
                </span>
                <span className="text-muted-foreground text-xs">
                  （このページで {selectedOnPage}名）
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  選択解除
                </Button>
                <div className="bg-primary/20 h-4 w-px" />
                <Toggle
                  pressed={showSelectedOnlyActive}
                  onPressedChange={setShowSelectedOnly}
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                >
                  <Eye className="size-3" />
                  選択中のみ表示
                </Toggle>
                <div className="bg-primary/20 h-4 w-px" />
                <Button size="sm" className="gap-1" onClick={() => setBulkDialogOpen(true)}>
                  <Shuffle className="size-4" />
                  主契約を変更（{selectedIDs.length}名）
                </Button>
              </div>
            )}
          </div>

          {/* Hidden on a failed load: the banner counts from `pagination`, which is absent,
              so it would announce 「0 件を抽出中」 — a claim that the filter matched nothing,
              when in fact the request never returned a result to count. */}
          <FilterResultBanner
            show={hasActiveFilters && !isError}
            totalCount={totalAllItems}
            filteredCount={totalMembers}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataTable
            columns={columns}
            data={displayMembers}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="会員一覧の取得に失敗しました"
            variant="simple"
            onRowClick={(row) => {
              router.push(withReturnTo(navigate('/members/[id]', row.memberId)));
            }}
            className="rounded-none border-x-0 border-b-0"
            containerClassName={tableMaxHeightClass(isFilterOpen, isBulkBarVisible)}
            tableOptions={{
              onSortingChange: handleSortingChange,
              manualSorting: true,
              state: {
                sorting,
                rowSelection,
              },
              getRowId: (originalRow) => originalRow?.memberId,
              onRowSelectionChange: handleRowSelectionChange,
            }}
            emptyContent={
              isError ? (
                <Empty
                  title="会員一覧の取得に失敗しました"
                  // The reason belongs next to the action, not in a toast that fades: this
                  // block is the whole of what an operator who looked away still sees.
                  description={resolveApiErrorMessage(error)}
                  {...listErrorAction}
                />
              ) : (
                <Empty
                  variant={hasActiveFilters ? 'filtered' : 'empty'}
                  entityLabel="会員"
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              )
            }
          />

          {!showSelectedOnlyActive && totalMembers > 0 && (
            <TablePaginationWithSize
              currentPage={page}
              total={totalMembers}
              pageSize={limit}
              pageSizeOptions={pageSizeOptions}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>

      {/* Select-all confirmation (2-step) — A-01 cross-page bulk selection */}
      <AlertDialog open={selectAllDialogOpen} onOpenChange={setSelectAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>該当する全件を選択しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在のフィルター条件に該当する <strong>{totalMembers}件</strong>{' '}
              すべてを選択しますか？ 現在ページ（{members.length}
              件）のみの選択を維持する場合はキャンセルしてください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSelectingAll}>このページのみ選択</AlertDialogCancel>
            <AlertDialogAction disabled={isSelectingAll} onClick={handleSelectAll}>
              {totalMembers}件すべてを選択
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MemberBulkContractDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedMemberIds={selectedIDs}
        selectedMembers={selectedMembers}
        isChangingMainContract={isChangingMainContract}
        onExecute={handleBulkChangeContract}
      />
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MembersPageContent />
    </Suspense>
  );
}
