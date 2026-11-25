'use client';

import { Suspense, useMemo, useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useSingleSubmit } from '@/hooks/use-single-submit.hook';

import { BrandBadge } from '@/components/common/brand-badge';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
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
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getApiErrorCode, getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminAreaControllerListOptions,
  adminAreaControllerListQueryKey,
  adminAreaControllerRemoveMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AreaDetailDto, AreaListItemDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { AreaSheet, type AreaSheetMode } from './_components/area-sheet';
import {
  ALL_BRANDS_LABEL,
  AREA_BRAND_BADGE,
  AREA_BRAND_GROUPS,
  AREA_BRAND_GROUP_ITEMS,
  AREA_GENDER_CONDITION_LABELS,
  AREA_KEYWORD_MAX_LENGTH,
  AREA_NOT_FOUND_ERROR_CODE,
  AREA_PAGE_SIZE_OPTIONS,
  type AreaBrandGroup,
  areaUsageParts,
} from './_constants/area.constants';
import { useAreaFilters } from './_hooks/use-area-filters';
import { invalidateAreaUsageCaches } from './_utils/area-cache.util';

const ALL_BRANDS_VALUE = 'all';

function AreaMasterPageContent() {
  const queryClient = useQueryClient();
  const filters = useAreaFilters();
  const [sheet, setSheet] = useState<{ open: boolean; mode: AreaSheetMode; areaId: string | null }>(
    {
      open: false,
      mode: 'view',
      areaId: null,
    },
  );
  const [deleteTarget, setDeleteTarget] = useState<AreaDetailDto | null>(null);
  const deleteSubmit = useSingleSubmit();

  const { data, error, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminAreaControllerListOptions({ query: filters.queryParams }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const filteredTotal = data?.pagination.totalItems ?? 0;
  const totalAll = data?.pagination.totalAllItems ?? filteredTotal;

  // A load failure with no rows on screen is shown in the table body (DataTable convention):
  // a refused condition offers 条件をクリア, anything retryable offers 再試行.
  const errorStatus = getApiErrorStatus(error);
  const isConditionRefused = errorStatus === 400 || errorStatus === 422;
  const isRetryable = !isConditionRefused && errorStatus !== 403;
  const listErrorAction = (() => {
    if (isConditionRefused) return { onAction: filters.clearFilters, actionLabel: '条件をクリア' };
    return isRetryable ? { onAction: () => void refetch(), actionLabel: '再試行' } : {};
  })();

  const deleteMutation = useMutation({
    ...adminAreaControllerRemoveMutation(),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: adminAreaControllerListQueryKey() });
      toast.success(`「${deleteTarget?.name ?? ''}」を削除しました`);
      setDeleteTarget(null);
      deleteSubmit.release();
      if (sheet.areaId === variables.path.areaId)
        setSheet({ open: false, mode: 'view', areaId: null });
    },
    onError: (error, variables) => {
      // E-ARE-002: something started using the area since the sheet was opened — re-read the counts
      // of the list and of the sheet.
      invalidateAreaUsageCaches(queryClient);
      setDeleteTarget(null);
      deleteSubmit.release();
      // E-ARE-001: already deleted elsewhere — close its sheet; the refetched list drops the row.
      if (
        getApiErrorCode(error) === AREA_NOT_FOUND_ERROR_CODE &&
        sheet.areaId === variables.path.areaId
      )
        setSheet({ open: false, mode: 'view', areaId: null });
    },
  });

  const openCreate = () => setSheet({ open: true, mode: 'create', areaId: null });

  const registerButton = (props: { size?: 'sm'; variant?: 'outline' } = {}) => (
    <RoleGatedButton
      requiredPermission={Permission.AreasCreate}
      denyTooltip="エリアの登録は本部のみ可能です"
      className="gap-1"
      onClick={openCreate}
      {...props}
    >
      <Plus className="size-4" />
      エリアを登録
    </RoleGatedButton>
  );

  const columns: ColumnDef<AreaListItemDto>[] = useMemo(
    () => [
      {
        accessorKey: 'areaCode',
        header: () => <span className="text-xs font-semibold">エリアID</span>,
        meta: { className: 'w-[100px]' },
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.areaCode}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: () => <span className="text-xs font-semibold">エリア名</span>,
        meta: { className: 'min-w-[200px]' },
        cell: ({ row }) => (
          <TextWithTooltip
            text={row.original.name}
            className="max-w-60 text-sm font-medium"
            wrapperClassName="min-w-0"
          />
        ),
      },
      {
        accessorKey: 'brandGroup',
        header: () => <span className="text-xs font-semibold">ブランド</span>,
        meta: { className: 'w-[120px]' },
        cell: ({ row }) => (
          <BrandBadge brand={AREA_BRAND_BADGE[row.original.brandGroup as AreaBrandGroup]} />
        ),
      },
      {
        accessorKey: 'genderCondition',
        header: () => <span className="text-xs font-semibold">性別の条件</span>,
        meta: { className: 'w-[100px]' },
        cell: ({ row }) =>
          row.original.genderCondition === 'none' ? (
            <span className="text-muted-foreground text-xs">なし</span>
          ) : (
            <Badge variant="outline">
              {AREA_GENDER_CONDITION_LABELS[row.original.genderCondition]}
            </Badge>
          ),
      },
      {
        accessorKey: 'note',
        header: () => <span className="text-xs font-semibold">備考</span>,
        meta: { className: 'min-w-[200px]' },
        cell: ({ row }) =>
          row.original.note ? (
            <TextWithTooltip
              text={row.original.note}
              className="text-muted-foreground max-w-60 text-xs"
              wrapperClassName="min-w-0"
            />
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        id: 'usage',
        header: () => <span className="text-xs font-semibold">使われている所</span>,
        meta: { className: 'w-[220px]' },
        cell: ({ row }) => {
          const parts = areaUsageParts(row.original.usageCounts);
          return parts.length > 0 ? (
            <span className="text-xs whitespace-nowrap">{parts.join('・')}</span>
          ) : (
            <span className="text-muted-foreground text-xs">未使用</span>
          );
        },
      },
      {
        accessorKey: 'updatedAt',
        header: () => <span className="text-xs font-semibold">最終変更</span>,
        meta: { className: 'w-[160px]' },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-xs">{formatDateYYYYMMDD_HHMM(row.original.updatedAt)}</span>
            <span className="text-muted-foreground text-xs">
              {row.original.updatedByName ?? '—'}
            </span>
          </div>
        ),
      },
    ],
    [],
  );

  const filterSummary = [filters.brand, filters.keyword ? `"${filters.keyword}"` : null]
    .filter(Boolean)
    .join('・');
  const brandItems = { [ALL_BRANDS_VALUE]: ALL_BRANDS_LABEL, ...AREA_BRAND_GROUP_ITEMS };

  return (
    <>
      <PageHeader
        title="エリアマスタ管理"
        badge={
          // Only once a count is in hand: while loading or under a load error 0件 would be false.
          data && (
            <Badge variant="outline" className="text-xs">
              {totalAll}件
            </Badge>
          )
        }
        subtitle="エリア扉で入れる人を決める館内のエリアを、ブランドごとに登録します"
        actions={registerButton()}
      />

      <div className="bg-background flex-1 px-6 py-4">
        <Card className="gap-0 py-0">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="relative max-w-[400px] flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  placeholder="エリア名・備考で検索..."
                  className="pl-9 text-xs"
                  maxLength={AREA_KEYWORD_MAX_LENGTH}
                  value={filters.searchInput}
                  onChange={(e) => filters.setSearchInput(e.target.value)}
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Select
                  items={brandItems}
                  value={filters.brand ?? ALL_BRANDS_VALUE}
                  onValueChange={(v) =>
                    filters.setBrand(v === ALL_BRANDS_VALUE ? null : (v as AreaBrandGroup))
                  }
                >
                  <SelectTrigger
                    className={`h-8 w-fit max-w-[240px] min-w-[140px] text-xs ${filters.brand ? 'border-primary bg-primary/10 text-foreground' : ''}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_BRANDS_VALUE}>{ALL_BRANDS_LABEL}</SelectItem>
                    {AREA_BRAND_GROUPS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <FilterResultBanner
            show={filters.hasActiveConditions && !isError}
            totalCount={totalAll}
            filteredCount={filteredTotal}
            filterSummary={filterSummary}
            onClear={filters.clearFilters}
          />

          <DataTable
            tableSize="md"
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            onRetry={() => void refetch()}
            errorTitle="エリアの一覧の取得に失敗しました"
            columns={columns}
            data={items}
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            onRowClick={(row) => setSheet({ open: true, mode: 'view', areaId: row.id })}
            emptyContent={
              isError ? (
                <Empty
                  title="エリアの一覧の取得に失敗しました"
                  description={resolveApiErrorMessage(error)}
                  {...listErrorAction}
                />
              ) : filters.keyword !== '' ? (
                <Empty variant="filtered" entityLabel="エリア" onAction={filters.clearFilters} />
              ) : (
                <Empty
                  variant="empty"
                  title={
                    filters.brand
                      ? `${filters.brand} のエリアはまだありません`
                      : 'エリアはまだありません'
                  }
                  description="主契約・オプション・エリア扉で選ぶエリアを登録します"
                  action={registerButton({ size: 'sm', variant: 'outline' })}
                />
              )
            }
          />

          {/* A failed reload keeps the earlier rows on screen, and their pager with them. */}
          {data && (
            <TablePaginationWithSize
              total={filteredTotal}
              currentPage={filters.currentPage}
              pageSize={filters.pageSize}
              onPageChange={filters.setCurrentPage}
              onPageSizeChange={filters.setPageSize}
              pageSizeOptions={AREA_PAGE_SIZE_OPTIONS}
            />
          )}
        </Card>
      </div>

      <AreaSheet
        open={sheet.open}
        mode={sheet.mode}
        areaId={sheet.areaId}
        initialBrand={filters.brand}
        onModeChange={(mode) => setSheet((s) => ({ ...s, mode }))}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onCreated={(areaId) => setSheet({ open: true, mode: 'view', areaId })}
        onDeleteClick={setDeleteTarget}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && !deleteMutation.isPending && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>エリアを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="wrap-anywhere">
                『{deleteTarget?.name}』（{deleteTarget?.brandGroup}
                ）を削除します。この操作は取り消せません。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget || !deleteSubmit.tryStart()) return;
                deleteMutation.mutate({ path: { areaId: deleteTarget.id } });
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AreaMasterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AreaMasterPageContent />
    </Suspense>
  );
}
