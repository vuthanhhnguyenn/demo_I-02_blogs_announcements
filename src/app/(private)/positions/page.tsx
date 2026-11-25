'use client';

// Client page: nuqs URL filters, React Query data, row selection & action menus
// make the whole list interactive (same justification as the sibling list screens).
import { Suspense, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { PageHeader } from '@/components/common/page-header';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminStaffPermissionControllerDeletePositionMutation,
  adminStaffPermissionControllerListPositionsOptions,
  adminStaffPermissionControllerListPositionsQueryKey,
  adminStaffPermissionControllerPermissionCatalogOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { PositionListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import { PermissionPreviewPanel } from './_components/permission-preview-panel';
import { PositionDeleteDialog } from './_components/position-delete-dialog';
import {
  PositionPermissionFilter,
  findPermissionLabel,
} from './_components/position-permission-filter';
import { PositionRowActions } from './_components/position-row-actions';
import { PositionTableHeaderRow, PositionTableRow } from './_components/position-table-columns';
import {
  POSITION_PAGE_SIZE_OPTIONS,
  POSITION_SEARCH_MAX_LENGTH,
} from './_constants/position.constants';
import { usePositionFilters } from './_hooks/use-position-filters.hook';
import { POSITION_ERROR_CODE, getPositionErrorCode } from './_utils/position-api.util';

function PositionsPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<PositionListItemDto | null>(null);

  const {
    queryParams,
    search,
    searchInput,
    setSearchInput,
    clearFilters,
    currentPage,
    setCurrentPage,
    setPageSize,
    pageSize,
    permission,
    setPermission,
    selectedPositionId,
    setSelectedPositionId,
    hasActiveConditions,
  } = usePositionFilters();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...adminStaffPermissionControllerListPositionsOptions({ query: queryParams }),
    placeholderData: keepPreviousData,
  });

  // 権限フィルタのラベル解決用 — フィルタ本体と同じクエリキーなのでキャッシュを共有する
  const { data: permissionCatalog } = useQuery({
    ...adminStaffPermissionControllerPermissionCatalogOptions(),
    enabled: permission != null,
  });

  // 絞り込み前の全件数はレスポンスに無いため limit:1 の別クエリで取得する (D5)
  const { data: baselineData } = useQuery({
    ...adminStaffPermissionControllerListPositionsOptions({ query: { page: 1, limit: 1 } }),
    enabled: hasActiveConditions,
  });

  const items = data?.items ?? [];
  const filteredTotal = data?.pagination.totalItems ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  // 最終ページの最後の行を削除した直後など、現在ページが総ページ数を超えたら
  // 最後の有効なページへ丸める。放置すると「該当0件」を本当の空状態として
  // 描いてしまい、まだデータが残っているのに「職位がまだありません」と出る。
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage, setCurrentPage]);
  const totalAll = hasActiveConditions ? (baselineData?.pagination.totalItems ?? 0) : filteredTotal;
  const headerCount = hasActiveConditions ? filteredTotal : totalAll;

  const deleteMutation = useMutation({
    ...adminStaffPermissionControllerDeletePositionMutation(),
    onSuccess: (_result, variables) => {
      toast.success('職位を削除しました');
      // 削除した職位が選択中ならプレビューをプレースホルダーへ戻す (FR-014)
      if (variables.path.id === selectedPositionId) {
        setSelectedPositionId(null);
      }
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerListPositionsQueryKey(),
      });
    },
    // 共通の失敗トーストは suppressErrorToast で止めているため、ここで必ず出す —
    // 409 E-STF-011（割当スタッフあり）は専用文言、それ以外は共通と同じ文言 (D6)
    onError: (error) => {
      if (getPositionErrorCode(error) === POSITION_ERROR_CODE.positionInUse) {
        toast.error('割当スタッフがいるため削除できません');
      } else {
        toast.error(resolveApiErrorMessage(error));
      }
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: adminStaffPermissionControllerListPositionsQueryKey(),
      });
    },
    meta: { suppressErrorToast: true },
  });

  const goToEdit = (id: string) => router.push(withReturnTo(navigate('/positions/[id]/edit', id)));
  const goToClone = (id: string) =>
    router.push(withReturnTo(navigate('/positions/create', { cloneFrom: id })));

  return (
    <>
      <PageHeader
        title="職位マスター管理"
        badge={
          <Badge variant="outline" className="text-xs">
            {headerCount}件
          </Badge>
        }
        actions={
          <RoleGatedButton
            requiredPermission={Permission.PositionsCreate}
            className="gap-1"
            denyTooltip="職位の追加権限がありません"
            onClick={() => router.push(withReturnTo(navigate('/positions/create')))}
          >
            <Plus className="size-4" />
            職位を追加
          </RoleGatedButton>
        }
      />

      <div className="bg-background flex-1 px-6 py-4">
        {/* 2-Pane Layout (PAR038) */}
        <div className="grid grid-cols-[1fr_400px] items-start gap-4">
          {/* Left Pane: Position List */}
          <Card className="gap-0 py-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="relative max-w-[360px] flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  placeholder="職位名で検索..."
                  className="pl-9 text-xs"
                  value={searchInput}
                  maxLength={POSITION_SEARCH_MAX_LENGTH}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
              <PositionPermissionFilter selectedKey={permission} onSelect={setPermission} />
            </div>

            <FilterResultBanner
              show={hasActiveConditions}
              totalCount={totalAll}
              filteredCount={filteredTotal}
              filterSummary={[
                permission
                  ? `権限「${findPermissionLabel(permission, permissionCatalog)}」を持つ職位`
                  : '',
                search ? `"${search}"` : '',
              ]}
              onClear={clearFilters}
            />

            <div
              className={cn(
                'overflow-x-auto transition-opacity',
                isFetching && !isLoading && 'opacity-50',
              )}
            >
              <Table>
                <TableHeader>
                  <PositionTableHeaderRow />
                </TableHeader>
                <TableBody>
                  {isLoading &&
                    // 行シェイプに合わせたスケルトン（スピナー単体は不可 — code-rule II）
                    Array.from({ length: 5 }, (_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-2.5 w-48" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-3 w-10" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-3 w-8" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="size-8" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!isLoading && isError && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        <div className="flex flex-col items-center gap-3 py-10">
                          <p className="text-muted-foreground text-sm">職位の取得に失敗しました</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => void refetch()}
                          >
                            再試行
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !isError && items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        <Empty
                          variant={hasActiveConditions ? 'filtered' : 'empty'}
                          entityLabel="職位"
                          onAction={hasActiveConditions ? clearFilters : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    !isError &&
                    items.map((position) => (
                      <PositionTableRow
                        key={position.positionId}
                        position={position}
                        isSelected={selectedPositionId === position.positionId}
                        onToggleSelect={() =>
                          setSelectedPositionId(
                            selectedPositionId === position.positionId ? null : position.positionId,
                          )
                        }
                        onSelect={() => setSelectedPositionId(position.positionId)}
                        actions={
                          <PositionRowActions
                            position={position}
                            onEdit={() => goToEdit(position.positionId)}
                            onClone={() => goToClone(position.positionId)}
                            onDelete={() => setDeleteTarget(position)}
                          />
                        }
                      />
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <TablePaginationWithSize
              total={filteredTotal}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={POSITION_PAGE_SIZE_OPTIONS}
            />
          </Card>

          {/* Right Pane: Permission Preview */}
          <div className="sticky top-0">
            <PermissionPreviewPanel positionId={selectedPositionId} onEdit={goToEdit} />
          </div>
        </div>
      </div>

      <PositionDeleteDialog
        position={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate({ path: { id: deleteTarget.positionId } });
        }}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

export default function PositionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PositionsPageContent />
    </Suspense>
  );
}
