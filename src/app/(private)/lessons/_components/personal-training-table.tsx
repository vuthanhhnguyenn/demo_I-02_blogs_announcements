'use client';

import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { useWithReturnTo } from '@/hooks/use-return-to.hook';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { DataTable } from '@/components/common/data-table';
import { TablePagination } from '@/components/common/table-pagination';

import { adminLessonControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import type { UseLessonsFiltersReturn } from '../_hooks/use-lessons-filters';
import { LessonsFilterBar } from './lessons-filter-bar';
import { personalTableColumns } from './personal-table-columns';

interface PersonalTrainingTableProps {
  filtersHook: UseLessonsFiltersReturn;
}

export function PersonalTrainingTable({ filtersHook }: PersonalTrainingTableProps) {
  const router = useRouter();
  const withReturnTo = useWithReturnTo();
  const { filters, currentPage, setCurrentPage, pageSize, setSort, isScopeReady, lessonListQuery } =
    filtersHook;

  // Personal training plans are lesson masters of lessonType personal_training (API-111)
  const { data, isLoading, isError, refetch } = useQuery({
    ...adminLessonControllerListOptions({ query: lessonListQuery('personal') }),
    enabled: isScopeReady,
  });

  const rows = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  const total = pagination?.totalItems ?? 0;
  const totalPages = pagination?.totalPages ?? 0;
  const page = pagination?.page ?? currentPage;
  const limit = pagination?.limit ?? pageSize;

  const sorting: SortingState = [{ id: filters.sort_by, desc: filters.sort_order === 'desc' }];

  const handleSortingChange = (updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (next.length === 0) return;
    setSort(next[0].id, next[0].desc ? 'desc' : 'asc');
  };

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <LessonsFilterBar filtersHook={filtersHook} searchPlaceholder="プラン名で検索..." />

      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && rows.length === 0}
        onRetry={() => refetch()}
        emptyTitle="プランが見つかりません"
        emptyDescription="検索条件を変更してお試しください"
        skeleton={
          <DataTable
            columns={personalTableColumns}
            data={[]}
            isLoading
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
          />
        }
      >
        <DataTable
          columns={personalTableColumns}
          data={rows}
          variant="simple"
          onRowClick={(row) => router.push(withReturnTo(navigate('/lessons/[id]', row.id)))}
          className="rounded-none border-x-0 border-b-0"
          tableOptions={{
            manualSorting: true,
            onSortingChange: handleSortingChange,
            state: { sorting },
            getRowId: (originalRow) => originalRow.id,
          }}
        />
      </DataStateBoundary>

      {total > 0 && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setCurrentPage}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
