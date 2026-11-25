'use client';

import { useState } from 'react';

import { API_PAGE_SIZE_OPTIONS, PAGE_SIZE } from '@/constants/app.constants';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Card } from '@/components/ui/card';

import { adminFcCompanyControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { FcCompanyHistoryEntryDto } from '@/lib/api-real/types.gen';

import { isFcCompanyPermissionError } from '../../_utils/fc-company-api.util';
import { formatHistoryLines, formatHistoryOperator } from '../../_utils/fc-company-history.util';
import { FRANCHISE_COMPANY_HISTORY_LABELS as LABELS } from '../_constants/detail.constants';
import { FcPermissionDenied } from './fc-permission-denied';

const columns: ColumnDef<FcCompanyHistoryEntryDto>[] = [
  {
    id: 'changedAt',
    header: LABELS.changedAt,
    cell: ({ row }) => formatDateYYYYMMDD_HHMM(row.original.changedAt),
    meta: { className: 'w-[160px]', cellClassName: 'text-muted-foreground align-top text-xs' },
  },
  {
    id: 'operator',
    header: LABELS.operator,
    cell: ({ row }) => formatHistoryOperator(row.original),
    meta: {
      className: 'w-[200px]',
      cellClassName: 'align-top text-sm wrap-anywhere whitespace-normal',
    },
  },
  {
    id: 'change',
    header: LABELS.change,
    cell: ({ row }) =>
      formatHistoryLines(row.original).map((line, index) => (
        <p key={`${row.original.id}-${index}`}>{line}</p>
      )),
    // pre-wrap keeps the line breaks of a 無効化理由; wrap-anywhere breaks unbroken tokens
    meta: {
      cellClassName: 'text-muted-foreground text-sm wrap-anywhere whitespace-pre-wrap',
    },
  },
];

interface HistoryTabProps {
  companyId: string;
}

export function HistoryTab({ companyId }: Readonly<HistoryTabProps>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  // Newest first, server-paged
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    ...adminFcCompanyControllerHistoryOptions({
      path: { id: companyId },
      query: { page, limit: pageSize },
    }),
    placeholderData: keepPreviousData,
  });

  // D15: change history is HQ-only on the BE (§11.4) — FC-manager staff get E-AUTH-100
  if (isError && isFcCompanyPermissionError(error)) {
    return <FcPermissionDenied description="変更履歴を参照する権限がありません" />;
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <Card className="gap-0 py-0">
      {/* table-fixed: the header widths hold 日時 / 操作者 steady and 変更内容 takes the rest, so long
          lines wrap inside the card instead of widening the table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onRetry={() => void refetch()}
        errorTitle="変更履歴の取得に失敗しました"
        variant="simple"
        tableSize="md"
        className="rounded-none border-0"
        containerClassName="[&>table]:table-fixed"
        emptyContent={
          isError ? (
            <Empty
              title="変更履歴の取得に失敗しました"
              description="時間をおいて再度お試しください。"
              onAction={() => void refetch()}
              actionLabel="再試行"
            />
          ) : (
            <div className="flex h-24 items-center justify-center">
              表示できる変更履歴がありません
            </div>
          )
        }
      />
      <TablePaginationWithSize
        currentPage={data?.pagination.page ?? page}
        total={data?.pagination.totalItems ?? 0}
        pageSize={data?.pagination.limit ?? pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={API_PAGE_SIZE_OPTIONS}
      />
    </Card>
  );
}
