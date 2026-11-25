'use client';

import { useState } from 'react';

import { useDebounce } from '@/hooks/use-debounce.hook';

import { FilterResultBanner } from '@/components/common/filter-result-banner';

import { type ExerciseMasterRow, TAB_META, type TabKey } from '../_constants/constants';
import {
  MASTER_PAGE_SIZE,
  MASTER_PAGE_SIZE_OPTIONS,
  USE_MASTER_TAB_LIST,
} from '../_hooks/use-master-lists';
import { ExerciseMasterTable } from './exercise-master-table';

const SEARCH_DEBOUNCE_MS = 300;

interface ExerciseMasterTabPanelProps {
  /** The master this panel lists. Must not change for a mounted panel. */
  kind: TabKey;
  /** The list is requested only while its tab is open. */
  isActive: boolean;
  /** Every row of this master (no search) — the 「全 N 件」 of the filter-result banner. */
  unfilteredTotal: number | undefined;
  onCreate: () => void;
  onEdit: (row: ExerciseMasterRow) => void;
  onDelete: (row: ExerciseMasterRow) => void;
}

/**
 * One 参照マスタ tab: its own search, page and page size, and the list request for them. The
 * panel stays mounted while another tab is open, so its search and page survive a tab switch.
 */
export function ExerciseMasterTabPanel({
  kind,
  isActive,
  unfilteredTotal,
  onCreate,
  onEdit,
  onDelete,
}: Readonly<ExerciseMasterTabPanelProps>) {
  const [search, setSearch] = useState('');
  const keyword = useDebounce(search, SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(MASTER_PAGE_SIZE);

  const useTabList = USE_MASTER_TAB_LIST[kind];
  const list = useTabList({ keyword, page, pageSize, enabled: isActive });

  // A delete (here or elsewhere) can leave the current page past the last one — step back.
  const lastPage = Math.max(1, Math.ceil(list.total / pageSize));
  if (list.isLoaded && page > lastPage) setPage(lastPage);

  const { label, nameLabel, readOnly, paginated } = TAB_META[kind];
  const activeKeyword = keyword.trim();
  const clearSearch = () => {
    setSearch('');
    setPage(1);
  };

  return (
    <ExerciseMasterTable
      label={label}
      nameLabel={nameLabel}
      items={list.items}
      total={list.total}
      page={page}
      pageSize={pageSize}
      pageSizeOptions={MASTER_PAGE_SIZE_OPTIONS}
      onPageChange={setPage}
      onPageSizeChange={(next) => {
        setPageSize(next);
        setPage(1);
      }}
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      filterBanner={
        <FilterResultBanner
          show={activeKeyword !== '' && list.isLoaded && !list.isError}
          totalCount={unfilteredTotal ?? list.total}
          filteredCount={list.total}
          filterSummary={`"${activeKeyword}"`}
          onClear={clearSearch}
          className="border-t-0 border-b"
        />
      }
      onCreate={onCreate}
      onEdit={onEdit}
      onDelete={onDelete}
      readOnly={readOnly}
      paginated={paginated}
      isLoading={list.isLoading}
      isError={list.isError}
      onRetry={list.refetch}
    />
  );
}
