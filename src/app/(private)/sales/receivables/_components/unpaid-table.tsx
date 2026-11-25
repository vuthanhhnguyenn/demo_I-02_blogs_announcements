'use client';

// Client component: interactive Select filter, row click, dropdown menu actions, and the
// filtered/paginated receivables fetch (this table's only consumer) require the browser.
import { useEffect } from 'react';

import Link from 'next/link';

import { toSelectItems } from '@/utils/app.util';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { Empty } from '@/components/common/data-state-boundary/empty';
import { DataTable } from '@/components/common/data-table';
import { FilterResultBanner } from '@/components/common/filter-result-banner';
import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import { TablePaginationWithSize } from '@/components/common/table-pagination-with-size';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { adminReceivableControllerListOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ReceivableListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission, UserRole } from '@/types/permission.type';

import { formatYen, getPaymentMethodLabel } from '../../_constants/sales-labels.constant';
import { useSalesStoreScope } from '../../_hooks/use-sales-store-scope.hook';
import { RECEIVABLE_PAGE_SIZE_OPTIONS } from '../_hooks/use-receivables-filters.hook';
import {
  BAD_DEBT_RULE_TOOLTIP,
  RECEIVABLE_STATUS_BADGE_CLASS,
  RECEIVABLE_STATUS_LABELS,
  type ReceivableBillingTarget,
  formatDate,
  formatUnpaidMonths,
  getExclusionTargets,
  getKonbiniTargets,
} from '../_utils/receivable-status.util';
import type { BadDebtDialogMode } from './bad-debt-exclusion-dialog';

/** F-01 permission table / API-117 BR-RCV-010: System / HQ / Manager — never Staff (E-RCV-103) */
export const BAD_DEBT_EXCLUSION_ROLES = [
  UserRole.System,
  UserRole.Headquarter,
  UserRole.Manager,
] as const;

const ALL_MONTHS_VALUE = 'all';

interface UnpaidTableProps {
  unfilteredTotalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  monthOptions: string[];
  monthFilter: string | null;
  onMonthFilterChange: (month: string | null) => void;
  onRowClick: (row: ReceivableListItemDto) => void;
  /** `memberNumber` is the display 会員ID shown in the konbini dialog */
  onIssueConvenience: (
    memberNumber: string,
    memberName: string,
    billings: ReceivableBillingTarget[],
  ) => void;
  onBadDebtAction: (
    memberName: string,
    mode: BadDebtDialogMode,
    billings: ReceivableBillingTarget[],
  ) => void;
}

export function UnpaidTable({
  unfilteredTotalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  monthOptions,
  monthFilter,
  onMonthFilterChange,
  onRowClick,
  onIssueConvenience,
  onBadDebtAction,
}: Readonly<UnpaidTableProps>) {
  const { effectiveStoreId, isScopeLoading } = useSalesStoreScope();
  const {
    data,
    isLoading: isListLoading,
    isError,
    refetch,
  } = useQuery({
    ...adminReceivableControllerListOptions({
      query: {
        storeIds: effectiveStoreId ? [effectiveStoreId] : undefined,
        unpaidMonth: monthFilter ?? undefined,
        page: currentPage,
        limit: pageSize,
      },
    }),
    enabled: !isScopeLoading,
  });
  const isLoading = isListLoading || isScopeLoading;

  // The error panel replaces the table; the toast says which request failed.
  useEffect(() => {
    if (isError) toast.error('未回収一覧の取得に失敗しました', { id: 'receivables-list-error' });
  }, [isError]);

  const items = data?.items ?? [];
  const totalCount = data?.pagination.totalItems ?? 0;

  const clearFilters = () => onMonthFilterChange(null);

  const columns: ColumnDef<ReceivableListItemDto>[] = [
    {
      id: 'storeName',
      header: '店舗',
      cell: ({ row }) => (
        <span className="block max-w-28 text-xs wrap-anywhere whitespace-normal">
          {row.original.storeName ?? '—'}
        </span>
      ),
    },
    {
      id: 'memberNumber',
      header: '会員ID',
      cell: ({ row }) => (
        // FR-002-b: drill-down to the member detail; the row click still opens the sheet
        <Link
          href={navigate('/members/[id]', row.original.memberId)}
          onClick={(e) => e.stopPropagation()}
          className="text-primary font-mono text-xs hover:underline hover:underline-offset-2"
        >
          {row.original.memberNumber ?? '—'}
        </Link>
      ),
    },
    {
      id: 'memberName',
      header: '氏名',
      cell: ({ row }) => (
        <span className="block max-w-32 text-sm font-medium wrap-anywhere whitespace-normal">
          {row.original.memberName ?? '—'}
        </span>
      ),
    },
    {
      id: 'unpaidByMonth',
      header: '未納月',
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap tabular-nums">
          {formatUnpaidMonths(row.original.unpaidByMonth.map((line) => line.targetMonth))}
        </span>
      ),
    },
    {
      id: 'totalUnpaid',
      header: () => <div className="text-right">未納金額合計</div>,
      cell: ({ row }) => (
        <div className="text-destructive text-right text-sm font-semibold tabular-nums">
          {formatYen(row.original.totalUnpaid)}
        </div>
      ),
    },
    {
      id: 'lastBilledAt',
      header: '最終請求日',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.lastBilledAt)}</span>,
    },
    {
      id: 'paymentMethod',
      header: '決済手段',
      cell: ({ row }) => (
        <span className="block max-w-24 text-xs wrap-anywhere whitespace-normal">
          {getPaymentMethodLabel(row.original.paymentMethod)}
        </span>
      ),
    },
    {
      id: 'displayStatus',
      header: 'ステータス',
      cell: ({ row }) => {
        const status = row.original.displayStatus;
        const badge = (
          <Badge
            variant="outline"
            className={`px-1 py-0 text-[10px] ${RECEIVABLE_STATUS_BADGE_CLASS[status]}`}
          >
            {RECEIVABLE_STATUS_LABELS[status]}
          </Badge>
        );
        if (status !== 'eligible_for_write_off') return badge;
        // FR-007: 貸倒対象 is written off automatically at month-end unless excluded (prototype)
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>{badge}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-80">
                <p className="text-xs">{BAD_DEBT_RULE_TOOLTIP}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const record = row.original;
        const memberName = record.memberName ?? record.memberNumber ?? record.memberId;
        // D6: actions are per billing — the row acts on the member's unpaid billings
        const konbiniTargets = getKonbiniTargets(record.unpaidByMonth);
        const releaseTargets = getExclusionTargets(record.unpaidByMonth, 'release');
        const excludeTargets = getExclusionTargets(record.unpaidByMonth, 'exclude');
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger className="hover:bg-accent hover:text-accent-foreground inline-flex size-7 items-center justify-center rounded-md">
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <RoleGatedMenuItem
                  requiredPermission={Permission.SalesConvenienceIssue}
                  disabled={konbiniTargets.length === 0}
                  onClick={() =>
                    onIssueConvenience(
                      record.memberNumber ?? record.memberId,
                      memberName,
                      konbiniTargets,
                    )
                  }
                >
                  コンビニ決済URL発行
                </RoleGatedMenuItem>
                {releaseTargets.length > 0 && (
                  <RoleGatedMenuItem
                    allowedRoles={BAD_DEBT_EXCLUSION_ROLES}
                    requiredPermission={Permission.SalesBadDebtExclude}
                    onClick={() => onBadDebtAction(memberName, 'release', releaseTargets)}
                  >
                    貸倒対象外指定の解除
                  </RoleGatedMenuItem>
                )}
                {excludeTargets.length > 0 && (
                  <RoleGatedMenuItem
                    allowedRoles={BAD_DEBT_EXCLUSION_ROLES}
                    requiredPermission={Permission.SalesBadDebtExclude}
                    onClick={() => onBadDebtAction(memberName, 'exclude', excludeTargets)}
                  >
                    貸倒対象外指定
                  </RoleGatedMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 overflow-hidden rounded-xl border py-0">
        <div className="px-4 py-3">
          <Select
            value={monthFilter ?? ALL_MONTHS_VALUE}
            onValueChange={(value) =>
              onMonthFilterChange(value === ALL_MONTHS_VALUE ? null : value)
            }
            items={toSelectItems([
              { value: ALL_MONTHS_VALUE, label: 'すべての未納月' },
              ...monthOptions.map((month) => ({ value: month, label: month })),
            ])}
          >
            <SelectTrigger className="h-8 w-45 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MONTHS_VALUE}>すべての未納月</SelectItem>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FilterResultBanner
          show={Boolean(monthFilter)}
          totalCount={unfilteredTotalCount}
          filteredCount={totalCount}
          filterSummary={monthFilter ? `未納月 ${monthFilter}` : undefined}
          onClear={clearFilters}
        />

        <DataStateBoundary
          isLoading={isLoading}
          isError={isError}
          isEmpty={false}
          onRetry={() => refetch()}
          skeleton={
            <DataTable
              columns={columns}
              data={[]}
              isLoading
              variant="simple"
              className="rounded-none border-x-0 border-b-0"
            />
          }
        >
          <DataTable
            columns={columns}
            data={items}
            variant="simple"
            className="rounded-none border-x-0 border-b-0"
            onRowClick={onRowClick}
            emptyContent={
              <Empty
                variant={monthFilter ? 'filtered' : 'empty'}
                entityLabel="未回収データ"
                onAction={monthFilter ? clearFilters : undefined}
              />
            }
          />
        </DataStateBoundary>

        {totalCount > 0 && (
          <TablePaginationWithSize
            total={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={RECEIVABLE_PAGE_SIZE_OPTIONS}
          />
        )}
      </Card>
    </div>
  );
}
