'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { adminCampaignControllerHistoryOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { CAMPAIGN_INFO_BADGE_CLASS } from '../../_constants/constants';
import { useCampaignHistoryNames } from '../_hooks/use-campaign-history-names';
import { toCampaignHistoryRows } from '../_utils/campaign-history';

const DEFAULT_PAGE_SIZE = 25;

interface HistoryTabProps {
  campaignId: string;
}

export function HistoryTab({ campaignId }: Readonly<HistoryTabProps>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isLoading, isError, refetch } = useQuery({
    ...adminCampaignControllerHistoryOptions({
      path: { campaignId },
      query: { page: currentPage, limit: pageSize },
    }),
    placeholderData: keepPreviousData,
  });

  const entries = data?.items ?? [];
  const names = useCampaignHistoryNames(campaignId, entries);
  const history = toCampaignHistoryRows(entries, names);
  const total = data?.pagination?.totalItems ?? 0;

  return (
    <Card className="gap-0 py-0">
      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={history.length === 0}
        onRetry={refetch}
        emptyState={{ variant: 'empty', entityLabel: '変更履歴' }}
        skeleton={
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        }
      >
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-36 text-xs font-semibold xl:w-40">更新日時</TableHead>
              <TableHead className="w-24 text-xs font-semibold xl:w-25">操作者</TableHead>
              <TableHead className="w-28 text-xs font-semibold xl:w-30">変更フィールド</TableHead>
              <TableHead className="text-xs font-semibold">変更前</TableHead>
              <TableHead className="w-12 text-center text-xs font-semibold" />
              <TableHead className="text-xs font-semibold">変更後</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="text-xs">{formatDateYYYYMMDD_HHMM(row.date)}</TableCell>
                <TableCell className="text-xs">{row.user}</TableCell>
                <TableCell className="text-xs font-medium">
                  {row.field ?? <span className="text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="truncate text-xs" title={row.from ?? undefined}>
                  {row.from ?? <span className="text-muted-foreground">&mdash;</span>}
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="text-muted-foreground inline size-4" />
                </TableCell>
                <TableCell className="truncate text-xs" title={row.to ?? undefined}>
                  {/* バッジは inline-flex なのでセルの truncate では切れない。 */}
                  {row.field === null ? (
                    <Badge
                      variant="outline"
                      className={cn('max-w-full', CAMPAIGN_INFO_BADGE_CLASS)}
                    >
                      <span className="min-w-0 truncate">{row.to}</span>
                    </Badge>
                  ) : (
                    <span className="font-medium">{row.to}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataStateBoundary>
      {total > 0 && !isError && (
        <TablePaginationWithSize
          currentPage={currentPage}
          total={total}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setCurrentPage(1);
          }}
        />
      )}
    </Card>
  );
}
