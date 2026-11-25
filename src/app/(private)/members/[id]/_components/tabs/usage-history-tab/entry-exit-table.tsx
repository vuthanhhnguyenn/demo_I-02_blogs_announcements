'use client';

import { useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { PAGE_SIZE } from '@/constants/app.constants';
import { formatDateYYYYMMDD_HHMM, formatISODateLocal } from '@/utils/date.util';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { LogIn, LogOut } from 'lucide-react';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { SearchableSelect } from '@/components/common/searchable-select';
import { TablePagination } from '@/components/common/table-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  adminMemberActivityControllerAccessLogsOptions,
  adminStoreControllerListInfiniteOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { AdminStoreControllerListResponse, StoreSummaryDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { getAuthMethodLabel } from '../../../_constants/auth-method';

/** The access-logs API rejects a `from`–`to` span of more than 12 months. */
const MAX_RANGE_MONTHS = 12;

interface EntryExitTableProps {
  readonly memberId: string;
}

/** 種別 badge — one table row is one gate event (入館 / 退館), per the UI prototype. */
function EventTypeBadge({ eventType }: { readonly eventType: 'entry' | 'exit' }) {
  if (eventType === 'entry') {
    return (
      <Badge variant="outline" className="bg-info/15 text-info border-info/20 gap-1 text-[10px]">
        <LogIn className="size-3" />
        入館
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
      <LogOut className="size-3" />
      退館
    </Badge>
  );
}

export function EntryExitTable(props: EntryExitTableProps) {
  const { memberId } = props;
  // Defaults to the current month so the first view matches the previous month-only behaviour.
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [store, setStore] = useState<{ id: string; name: string } | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [page, setPage] = useState(1);

  // A half-picked range (start only) is a single-day filter.
  const from = dateRange?.from ? formatISODateLocal(dateRange.from) : undefined;
  const to = dateRange?.from ? formatISODateLocal(dateRange.to ?? dateRange.from) : undefined;

  const {
    data: storesData,
    isFetching: isStoresFetching,
    fetchNextPage: fetchNextStores,
    hasNextPage: hasMoreStores,
    isFetchingNextPage: isFetchingMoreStores,
    isFetchNextPageError: isStoresLoadMoreFailed,
  } = useInfiniteQuery({
    ...adminStoreControllerListInfiniteOptions({
      query: { limit: 20, keyword: storeSearch || undefined, sort: 'name', order: 'asc' },
    }),
    enabled: storeOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminStoreControllerListResponse, allPages) =>
      allPages.length < lastPage.pagination.totalPages ? allPages.length + 1 : undefined,
  });
  const stores = useMemo(() => storesData?.pages.flatMap((p) => p.items) ?? [], [storesData]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    ...adminMemberActivityControllerAccessLogsOptions({
      path: { memberId: memberId },
      query: { from, to, storeId: store?.id, page, limit: PAGE_SIZE },
    }),
    placeholderData: keepPreviousData,
  });
  const events = data?.items ?? [];
  const total = data?.pagination.totalItems ?? 0;
  const showOverlay = isFetching && !isLoading;

  const handleDateRangeChange = (value: DateRange | undefined) => {
    // Past the API limit: restart the selection from the day just clicked.
    if (value?.from && value.to && value.to > addMonths(value.from, MAX_RANGE_MONTHS)) {
      const clicked = value.from.getTime() === dateRange?.from?.getTime() ? value.to : value.from;
      setDateRange({ from: clicked, to: undefined });
      return;
    }
    setDateRange(value);
    setPage(1);
  };

  const handleStoreChange = (value: StoreSummaryDto | null) => {
    setStore(value ? { id: value.id, name: value.name } : null);
    setPage(1);
  };

  return (
    <Card className="gap-0 py-0">
      {/* Filters stay outside the boundary so the user can change them to recover from fetch errors */}
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-4 py-3">
        <CardTitle className="text-base font-semibold">入退館履歴</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <SearchableSelect<StoreSummaryDto>
            value={store?.id ?? null}
            valueLabel={store?.name ?? '全店舗'}
            options={stores}
            placeholder="全店舗"
            searchPlaceholder="店舗名で検索..."
            emptyMessage="該当する店舗がありません"
            loadingMessage="店舗を読み込み中..."
            clearLabel="全店舗"
            open={storeOpen}
            onOpenChange={setStoreOpen}
            onSearchChange={setStoreSearch}
            onSelect={handleStoreChange}
            getOptionKey={(item) => item.id}
            getOptionLabel={(item) => item.name}
            getOptionKeywords={(item) => [item.name, item.code, item.clubCode].join(' ')}
            isLoading={isStoresFetching}
            hasMore={hasMoreStores}
            isLoadingMore={isFetchingMoreStores}
            onLoadMore={fetchNextStores}
            loadMoreFailed={isStoresLoadMoreFailed}
            loadingMoreMessage="読み込み中..."
            triggerClassName="h-9 w-40 text-xs"
            contentClassName="min-w-[280px]"
          />
          <DateRangePicker
            date={dateRange}
            onDateChange={handleDateRangeChange}
            // While the end day is still to be picked, grey out days beyond the 12-month limit.
            disabled={
              dateRange?.from && !dateRange.to
                ? {
                    before: subMonths(dateRange.from, MAX_RANGE_MONTHS),
                    after: addMonths(dateRange.from, MAX_RANGE_MONTHS),
                  }
                : undefined
            }
          />
        </div>
      </CardHeader>

      <DataStateBoundary
        isLoading={isLoading}
        isError={isError}
        isEmpty={!data}
        onRetry={() => refetch()}
        errorTitle="入退館履歴の取得に失敗しました"
        skeleton={
          <CardContent className="space-y-3 px-4 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`entry-exit-row-${index}`} className="h-9 w-full" />
            ))}
          </CardContent>
        }
      >
        <CardContent className="px-0">
          <Table size="md">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">日時</TableHead>
                <TableHead className="text-xs font-semibold">店舗</TableHead>
                <TableHead className="text-xs font-semibold">種別</TableHead>
                <TableHead className="text-xs font-semibold">認証方法</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn('transition-opacity', showOverlay && 'opacity-50')}
              aria-busy={showOverlay}
            >
              {events.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground px-4 py-8 text-center text-xs"
                  >
                    該当するデータはありません。
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">
                      {formatDateYYYYMMDD_HHMM(event.usedAt)}
                    </TableCell>
                    {/* Long store names are clamped to two lines; the full name is on hover. */}
                    <TableCell className="w-full max-w-0 text-sm font-medium whitespace-normal">
                      <span
                        className="line-clamp-2 wrap-anywhere"
                        title={event.storeName ?? undefined}
                      >
                        {event.storeName ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {/* `companion_entry` (同伴入館) is a third value the mock never had; the badge only
                          knows 入館/退館, so a companion entry renders as an 入館. */}
                      <EventTypeBadge eventType={event.eventType === 'exit' ? 'exit' : 'entry'} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {/* 認証方法 is the credential channel (`authChannel`: QR / IC / 顔 / 手動), which is
                          what B-01 FR-003 records and what the prototype shows. `authMethod` is a
                          different axis — `member_scan` | `device_scan` | `none` — and rendering it
                          here printed the raw `member_scan` in every row. */}
                      {getAuthMethodLabel(event.authChannel)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </DataStateBoundary>

      {/* Pagination stays outside the boundary (like 請求一覧): a page that renders 0 rows must
          still let the user go back to a previous page. On an error the card shows only the error
          and its retry — a 0-count footer would describe data that never loaded. */}
      {!isError && (
        <CardContent className="px-0 py-0">
          <TablePagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            total={total}
            limit={PAGE_SIZE}
            isLoading={isFetching}
            onPageChange={setPage}
          />
        </CardContent>
      )}
    </Card>
  );
}
