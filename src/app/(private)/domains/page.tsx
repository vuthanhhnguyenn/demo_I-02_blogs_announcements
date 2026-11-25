'use client';

import { Suspense, useMemo, useState } from 'react';

import { toSelectItems } from '@/utils/app.util';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  adminDomainMasterControllerDetailOptions,
  adminDomainMasterControllerDetailQueryKey,
  adminDomainMasterControllerListOptions,
  adminDomainMasterControllerListQueryKey,
  adminDomainMasterControllerRegisterMutation,
  adminDomainMasterControllerRemoveMutation,
  adminDomainMasterControllerSetActiveMutation,
  adminDomainMasterControllerUpdateMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { DomainMasterSummaryDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { DomainDeleteDialog } from './_components/domain-delete-dialog';
import { DomainDetailSheet } from './_components/domain-detail-sheet';
import { DomainFormDialog } from './_components/domain-form-dialog';
import { DomainStatusDialog } from './_components/domain-status-dialog';
import { DomainTableColumns } from './_components/domain-table-columns';
import {
  DOMAIN_AUTH_METHOD_LABELS,
  DOMAIN_PAGE_SIZE_OPTIONS,
  DOMAIN_SEARCH_MAX_LENGTH,
} from './_constants/domain.constants';
import { type DomainSortField, useDomainFilters } from './_hooks/use-domain-filters';
import type { DomainFormValues } from './_schemas/domain-form.schema';
import {
  DOMAIN_ERROR_CODE,
  getDomainErrorCode,
  toRegisterDomainBody,
  toUpdateDomainBody,
} from './_utils/domain-api.util';

const AUTH_PROVIDER_FILTER_OPTIONS = (
  Object.entries(DOMAIN_AUTH_METHOD_LABELS) as [DomainFormValues['authProvider'], string][]
).map(([value, label]) => ({ value, label }));
const AUTH_PROVIDER_FILTER_ITEMS = toSelectItems(AUTH_PROVIDER_FILTER_OPTIONS);
const ALL_AUTH_PROVIDERS_VALUE = 'all';

const GENERIC_API_ERROR_MESSAGE = '処理に失敗しました';
const EDIT_BLOCKED_MESSAGE =
  '紐づくスタッフがいるため、ドメインと認証方式は変更できません。先にスタッフの所属変更または無効化を行ってください';

function DomainsPageContent() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    row: DomainMasterSummaryDto | null;
  }>({ open: false, mode: 'create', row: null });
  const [duplicateError, setDuplicateError] = useState(false);
  const [editBlockedError, setEditBlockedError] = useState(false);
  const [deleteState, setDeleteState] = useState<{
    row: DomainMasterSummaryDto | null;
    blockedStaffCount: number | null;
  }>({ row: null, blockedStaffCount: null });
  const [isCheckingLinkedStaff, setIsCheckingLinkedStaff] = useState(false);
  const [statusTarget, setStatusTarget] = useState<DomainMasterSummaryDto | null>(null);
  const [detailEntry, setDetailEntry] = useState<DomainMasterSummaryDto | null>(null);

  const {
    searchInput,
    setSearchInput,
    clearFilters,
    hasActiveConditions,
    queryParams,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    authProvider,
    setAuthProvider,
    sort,
    order,
    setSort,
  } = useDomainFilters();

  // サーバー側ソート — 列 id がそのまま `GET /admin/domain-master` の `sort` 値になる
  const sorting: SortingState = sort ? [{ id: sort, desc: order === 'desc' }] : [];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) {
      setSort(null, null);
      return;
    }
    setSort(next[0].id as DomainSortField, next[0].desc ? 'desc' : 'asc');
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminDomainMasterControllerListOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredTotal = data?.pagination.totalItems ?? 0;
  // `totalAllItems` は includeTotalAll=true のときだけ返り、負荷時は null になりうる (API-093)
  const totalAll = data?.pagination.totalAllItems ?? filteredTotal;
  const headerCount = hasActiveConditions ? filteredTotal : totalAll;

  const filterSummary = [
    authProvider ? `認証方式「${DOMAIN_AUTH_METHOD_LABELS[authProvider]}」` : '',
    searchInput ? `"${searchInput}"` : '',
  ];

  const invalidateDomainList = () =>
    queryClient.invalidateQueries({ queryKey: adminDomainMasterControllerListQueryKey() });

  const closeFormDialog = () => {
    setFormState({ open: false, mode: 'create', row: null });
    setDuplicateError(false);
    setEditBlockedError(false);
  };

  const createMutation = useMutation({
    ...adminDomainMasterControllerRegisterMutation(),
    onSuccess: () => {
      toast.success('ドメインを追加しました');
      void invalidateDomainList();
      closeFormDialog();
    },
    onError: (error) => {
      if (getDomainErrorCode(error) === DOMAIN_ERROR_CODE.duplicateDomain) {
        setDuplicateError(true);
      }
    },
  });

  const updateMutation = useMutation({
    ...adminDomainMasterControllerUpdateMutation(),
    onSuccess: (updated) => {
      toast.success('ドメインを更新しました');
      void invalidateDomainList();
      // 詳細シートを開いたまま保存した場合に古い値が残らないよう、行と詳細クエリの両方を更新する
      setDetailEntry((current) =>
        current?.id === updated.id
          ? {
              ...current,
              name: updated.name,
              domain: updated.domain,
              authProvider: updated.authProvider,
              staffCount: updated.staffCount,
              activeStaffCount: updated.activeStaffCount,
              isActive: updated.isActive,
              updatedAt: updated.updatedAt,
            }
          : current,
      );
      void queryClient.invalidateQueries({
        queryKey: adminDomainMasterControllerDetailQueryKey({ path: { id: updated.id } }),
      });
      closeFormDialog();
    },
    onError: (error) => {
      const code = getDomainErrorCode(error);
      if (code === DOMAIN_ERROR_CODE.duplicateDomain) {
        setDuplicateError(true);
        return;
      }
      // 開いている間にスタッフが紐づいた場合の後追いガード (E-DMN-005)
      if (code === DOMAIN_ERROR_CODE.editBlockedByStaff) {
        setEditBlockedError(true);
        void invalidateDomainList();
      }
    },
  });

  const deleteMutation = useMutation({
    ...adminDomainMasterControllerRemoveMutation(),
    onSuccess: (_response, variables) => {
      toast.success('ドメインを削除しました');
      void invalidateDomainList();
      setDeleteState({ row: null, blockedStaffCount: null });
      setDetailEntry((current) => (current?.id === variables.path.id ? null : current));
    },
    onError: (error, variables) => {
      // サーバー側でも紐づくスタッフがいる削除は 409 で拒否される (E-DMN-004)。
      // 事前チェックの後にスタッフが増えた競合ケースなので、ダイアログは閉じずにブロック表示へ切り替え、
      // 件数は詳細から取り直す（409 のボディには件数が入っていない — Round 3 の R303）
      if (getDomainErrorCode(error) === DOMAIN_ERROR_CODE.deleteBlockedByStaff) {
        void invalidateDomainList();
        void readLinkedStaffCount(variables.path.id).then((staffCount) => {
          setDeleteState((current) =>
            current.row?.id === variables.path.id
              ? { ...current, blockedStaffCount: staffCount ?? current.row.activeStaffCount }
              : current,
          );
        });
        return;
      }
      setDeleteState({ row: null, blockedStaffCount: null });
    },
  });

  // Y-14 FR-S001: PATCH /{id}/active。同値の送信も 200 で冪等に成功する
  const setActiveMutation = useMutation({
    ...adminDomainMasterControllerSetActiveMutation(),
    onSuccess: (updated) => {
      toast.success(updated.isActive ? 'ドメインを有効化しました' : 'ドメインを無効化しました');
      void invalidateDomainList();
      setDetailEntry((current) =>
        current?.id === updated.id
          ? { ...current, isActive: updated.isActive, updatedAt: updated.updatedAt }
          : current,
      );
      void queryClient.invalidateQueries({
        queryKey: adminDomainMasterControllerDetailQueryKey({ path: { id: updated.id } }),
      });
      setStatusTarget(null);
    },
  });

  const handleStatusConfirm = () => {
    if (!statusTarget) return;
    setActiveMutation.mutate({
      path: { id: statusTarget.id },
      body: { isActive: !statusTarget.isActive },
    });
  };

  const isSubmittingForm = createMutation.isPending || updateMutation.isPending;

  const handleFormSubmit = (values: DomainFormValues) => {
    if (formState.mode === 'create') {
      createMutation.mutate({ body: toRegisterDomainBody(values) });
      return;
    }
    if (!formState.row) return;
    updateMutation.mutate({
      path: { id: formState.row.id },
      body: toUpdateDomainBody(values),
    });
  };

  const openEditDialog = (row: DomainMasterSummaryDto) => {
    setDuplicateError(false);
    setEditBlockedError(false);
    setFormState({ open: true, mode: 'edit', row });
  };

  const openDeleteDialog = (row: DomainMasterSummaryDto) =>
    setDeleteState({ row, blockedStaffCount: null });

  /**
   * 最新の紐づき「有効スタッフ」数 (`activeStaffCount` = 有効 + 招待中) を詳細から読み直す。
   * 削除ブロック (E-DMN-004) はこの数で判定される。読めなかった場合は null
   */
  const readLinkedStaffCount = async (id: string): Promise<number | null> => {
    try {
      const detail = await queryClient.fetchQuery({
        ...adminDomainMasterControllerDetailOptions({ path: { id } }),
        staleTime: 0,
      });
      return detail.activeStaffCount;
    } catch {
      return null;
    }
  };

  /**
   * FR-013 の「確定時に再評価」エッジケース。`staffCount` は一覧を開いた時点のスナップショットなので、
   * 削除直前に詳細 (`GET /{id}`) を取り直して最新の件数で判定する。サーバーも E-DMN-004 で拒否するが、
   * こちらは件数入りの案内をダイアログに出せる。
   */
  const handleDeleteConfirm = async () => {
    const row = deleteState.row;
    if (!row) return;

    setIsCheckingLinkedStaff(true);
    const staffCount = await readLinkedStaffCount(row.id);
    setIsCheckingLinkedStaff(false);

    if (staffCount === null) {
      toast.error(GENERIC_API_ERROR_MESSAGE);
      return;
    }
    if (staffCount > 0) {
      // 一覧のスタッフ数は開いた時点のスナップショット。増えていたことが分かったので一覧も取り直す
      void invalidateDomainList();
      setDeleteState((current) => ({ ...current, blockedStaffCount: staffCount }));
      return;
    }

    deleteMutation.mutate({ path: { id: row.id } });
  };

  const columns: ColumnDef<DomainMasterSummaryDto>[] = useMemo(
    () =>
      DomainTableColumns({
        onEditClick: openEditDialog,
        onToggleActiveClick: setStatusTarget,
        onDeleteClick: openDeleteDialog,
      }),
    [],
  );

  return (
    <>
      <PageHeader
        title="ドメイン管理"
        badge={
          <Badge variant="outline" className="text-xs">
            {headerCount}件
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.DomainsCreate}
            className="gap-1"
            denyTooltip="ドメインの追加権限がありません"
            onClick={() => {
              setDuplicateError(false);
              setEditBlockedError(false);
              setFormState({ open: true, mode: 'create', row: null });
            }}
          >
            <Plus className="size-4" />
            ドメインを追加
          </RoleGatedButton>
        }
      />

      <div className="bg-background flex-1 px-6 py-4">
        <Card className="gap-0 py-0">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="relative max-w-xs flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  placeholder="管理名・ドメインで検索..."
                  className="h-8 pl-8 text-sm"
                  maxLength={DOMAIN_SEARCH_MAX_LENGTH}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
              <Select
                items={{
                  ...AUTH_PROVIDER_FILTER_ITEMS,
                  [ALL_AUTH_PROVIDERS_VALUE]: 'すべての認証方式',
                }}
                value={authProvider ?? ALL_AUTH_PROVIDERS_VALUE}
                onValueChange={(value) =>
                  setAuthProvider(
                    value === ALL_AUTH_PROVIDERS_VALUE
                      ? null
                      : (value as DomainFormValues['authProvider']),
                  )
                }
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_AUTH_PROVIDERS_VALUE}>すべての認証方式</SelectItem>
                  {AUTH_PROVIDER_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FilterResultBanner
            show={hasActiveConditions}
            totalCount={totalAll}
            filteredCount={filteredTotal}
            filterSummary={filterSummary}
            onClear={clearFilters}
          />

          <DataTable
            tableSize="md"
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="ドメイン一覧の取得に失敗しました"
            columns={columns}
            data={items}
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            tableOptions={{
              manualSorting: true,
              onSortingChange: handleSortingChange,
              state: { sorting },
            }}
            onRowClick={(row) => setDetailEntry(row)}
            emptyContent={
              <Empty
                variant={hasActiveConditions ? 'filtered' : 'empty'}
                entityLabel="ドメイン"
                onAction={clearFilters}
              />
            }
          />

          <TablePaginationWithSize
            total={filteredTotal}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={DOMAIN_PAGE_SIZE_OPTIONS}
          />
        </Card>
      </div>

      <DomainFormDialog
        key={`${formState.mode}-${formState.row?.id ?? 'new'}-${formState.open ? 'open' : 'closed'}`}
        open={formState.open}
        mode={formState.mode}
        domain={formState.row}
        isSubmitting={isSubmittingForm}
        duplicateError={duplicateError}
        editBlockedError={editBlockedError}
        editBlockedMessage={EDIT_BLOCKED_MESSAGE}
        onOpenChange={(open) => {
          if (!open) closeFormDialog();
        }}
        onDismissDuplicateError={() => setDuplicateError(false)}
        onSubmit={handleFormSubmit}
      />

      <DomainDeleteDialog
        domain={deleteState.row}
        isSubmitting={deleteMutation.isPending || isCheckingLinkedStaff}
        blockedStaffCount={deleteState.blockedStaffCount}
        onOpenChange={(open) => {
          if (!open) setDeleteState({ row: null, blockedStaffCount: null });
        }}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />

      <DomainStatusDialog
        domain={statusTarget}
        isSubmitting={setActiveMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        onConfirm={handleStatusConfirm}
      />

      <DomainDetailSheet
        domain={detailEntry}
        onOpenChange={(open) => {
          if (!open) setDetailEntry(null);
        }}
        onEditClick={openEditDialog}
        onToggleActiveClick={setStatusTarget}
        onDeleteClick={openDeleteDialog}
      />
    </>
  );
}

export default function DomainsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DomainsPageContent />
    </Suspense>
  );
}
