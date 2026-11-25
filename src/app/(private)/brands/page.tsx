'use client';

import { Suspense, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { Empty } from '@/components/common/data-state-boundary/empty';
// Search icon / Input / TEXT_MAX_LENGTH / FilterResultBanner — used by the search box, commented
// out below (a fixed two-brand master has nothing to search).
// TablePaginationWithSize — used by the pagination footer, commented out below.
// Plus icon / RoleGatedButton — used by the create-brand header button, commented out below
// (Out of scope — TODO(round3) R308).
import { Error } from '@/components/common/data-state-boundary/error';
import { Loading } from '@/components/common/data-state-boundary/loading';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { adminBrandControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';

// useBrandsFilters — the nuqs search/paging state, unused while the search box is commented out.
import { BrandFormSheet } from './_components/brand-form-sheet';
import { type BrandListItem, BrandTableColumns } from './_components/brand-table-columns';

function BrandsPageContent() {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...adminBrandControllerListOptions(),
    placeholderData: keepPreviousData,
  });

  // Y-07 FR-001 fixes the managed brands at JOYFIT / FIT365, and the endpoint always returns both
  // in definition order — there is nothing to search through or page across, so the whole response
  // is rendered as-is. See the commented-out search box and pagination footer below.
  const brands = useMemo(() => data?.items ?? [], [data?.items]);
  const totalBrands = brands.length;

  // Out of scope — TODO(round3) R308. Brands are a fixed 5-record master; API-074 §1 Rationale #3:
  // "adding a brand is a schema/seed change, not runtime" (Y-07「将来的なブランド追加はシステム設定
  // カテゴリー内で扱う」). Commented out, not deleted, pending a future phase.
  // const handleCreateClick = () => { … };

  // ブランド編集 — rename only (Y-07 260928_v3 FR-001).
  const [editingBrand, setEditingBrand] = useState<BrandListItem | null>(null);

  const columns = useMemo(() => BrandTableColumns(setEditingBrand), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="ブランド管理"
        // Only once data has arrived — neither a loading nor a failed fetch is "0件".
        badge={
          data ? (
            <Badge variant="outline" className="text-xs">
              {totalBrands}件
            </Badge>
          ) : undefined
        }
        // Out of scope — TODO(round3) R308. Commented out, not deleted, pending a future phase.
        // actions={
        //   <RoleGatedButton
        //     requiredPermission={Permission.BrandsCreate}
        //     type="button"
        //     className="h-8 gap-1 rounded-[10px] px-3 text-sm font-semibold"
        //     onClick={handleCreateClick}
        //   >
        //     <Plus className="size-3.5" />
        //     新規登録
        //   </RoleGatedButton>
        // }
      />

      <div className="bg-background flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 py-4">
        <Card className="flex gap-0 rounded-xl border p-0">
          {/*
            Search box + filtered-results banner. The managed brands are a fixed pair
            (Y-07 FR-001「表示対象ブランド: JOYFIT / FIT365」) and the list endpoint takes no query
            parameters, so a keyword search over two always-visible rows is pure furniture.
            Commented out, not deleted — revive together with the pagination footer below if the
            brand master ever grows (Y-07「将来的なブランド追加はシステム設定カテゴリー内で扱う」).
          <div className="px-4 py-3">
            <div className="relative max-w-100">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="キーワードで検索..."
                className="h-8 rounded-md pl-9 text-xs"
                maxLength={TEXT_MAX_LENGTH}
              />
            </div>
          </div>

          <FilterResultBanner
            show={hasActiveFilters}
            totalCount={totalBrands}
            filteredCount={filteredTotal}
            filterSummary={filters.search ? `"${filters.search}"` : ''}
            onClear={clearFilters}
          />
          */}

          {isError && !data ? (
            <Error onRetry={() => void refetch()} />
          ) : (
            <DataTable
              tableSize="md"
              isLoading={isLoading}
              isFetching={isFetching}
              isError={isError}
              onRetry={() => void refetch()}
              errorTitle="ブランド一覧の取得に失敗しました"
              columns={columns}
              data={brands}
              variant="simple"
              className="rounded-none border-x-0 border-b-0"
              onRowClick={(brand) => router.push(withReturnTo(`/brands/${brand.brandGroup}`))}
              emptyContent={<Empty variant="empty" entityLabel="ブランド" />}
            />
          )}

          {/*
            Pagination footer. Two fixed rows never paginate, and the endpoint has no page/limit
            parameters to drive. Commented out alongside the search box above.
          {filteredTotal > 0 && (
            <TablePaginationWithSize
              currentPage={currentPage}
              total={filteredTotal}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
          */}
        </Card>
      </div>

      <BrandFormSheet
        brand={editingBrand}
        onOpenChange={(open) => {
          if (!open) setEditingBrand(null);
        }}
      />
    </div>
  );
}

export default function BrandsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BrandsPageContent />
    </Suspense>
  );
}
