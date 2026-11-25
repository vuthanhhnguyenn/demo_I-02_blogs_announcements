'use client';

// Client-only: cells carry click handlers and hover tooltips.
import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { formatDateYYYYMM, formatDateYYYYMMDD, jstToday } from '@/utils/date.util';
import { addMonths, format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { SuspWdrListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  LEAVE_STATUS_CLASSES,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  type LeaveListStatus,
  LeaveStatus,
  LeaveType,
  MONTHLY_VIEW_MONTH_RANGE,
  memberDisplayName,
  toListStatus,
} from '../_constants/constants';
import { FeeAdjustmentBadge } from './fee-adjustment-badge';
import { LeaveBrandBadge } from './leave-brand-badge';

/** A row the grid can place: it needs a known state and a date to anchor its months. */
type LeaveRow = SuspWdrListItemDto & { status: LeaveListStatus; scheduledDate: string };

function toGridRow(row: SuspWdrListItemDto): LeaveRow | null {
  const status = toListStatus(row.displayStatus);
  return status && row.scheduledDate ? { ...row, status, scheduledDate: row.scheduledDate } : null;
}

/** When one member has several applications in a month, the most consequential state wins. */
const MONTH_STATUS_PRIORITY: LeaveListStatus[] = [
  LeaveStatus.WITHDRAWAL_SCHEDULED,
  LeaveStatus.WITHDRAWAL_PENDING,
  LeaveStatus.SUSPENDED,
  LeaveStatus.SUSPENSION_SCHEDULED,
];

/** The cell is narrow, so 退会処理待ち is shortened as in the prototype. */
const MONTH_CELL_LABELS: Record<LeaveListStatus, string> = {
  [LeaveStatus.SUSPENSION_SCHEDULED]: LEAVE_STATUS_LABELS[LeaveStatus.SUSPENSION_SCHEDULED],
  [LeaveStatus.SUSPENDED]: LEAVE_STATUS_LABELS[LeaveStatus.SUSPENDED],
  [LeaveStatus.WITHDRAWAL_SCHEDULED]: LEAVE_STATUS_LABELS[LeaveStatus.WITHDRAWAL_SCHEDULED],
  [LeaveStatus.WITHDRAWAL_PENDING]: '退会待ち',
};

/** `YYYY/MM` keys for the current month and `MONTHLY_VIEW_MONTH_RANGE` months either side. */
export function buildMonthColumns(): string[] {
  const now = jstToday();
  return Array.from({ length: MONTHLY_VIEW_MONTH_RANGE * 2 + 1 }, (_, i) =>
    format(addMonths(now, i - MONTHLY_VIEW_MONTH_RANGE), 'yyyy/MM'),
  );
}

/**
 * A suspension covers its start month through its end month. A withdrawal carries a day
 * (`YYYY-MM-DD`) and occupies exactly the month of its due date — comparing the raw day
 * against a `YYYY/MM` key would never match (spec Q-02), so both ends are cut to the month.
 */
function toMonthKey(date: string): string {
  return date.slice(0, 7).replace('-', '/');
}

function coversMonth(row: LeaveRow, month: string): boolean {
  const start = toMonthKey(row.scheduledDate);
  const end = row.endDate ? toMonthKey(row.endDate) : start;
  return month >= start && month <= end;
}

function findRowForMonth(rows: LeaveRow[], month: string): LeaveRow | null {
  let found: LeaveRow | null = null;
  for (const row of rows) {
    if (!coversMonth(row, month)) continue;
    if (
      found === null ||
      MONTH_STATUS_PRIORITY.indexOf(row.status) < MONTH_STATUS_PRIORITY.indexOf(found.status)
    ) {
      found = row;
    }
  }
  return found;
}

interface LeavesMonthlyViewProps {
  leaves: SuspWdrListItemDto[];
  /** FR-008 — 店舗名 is shown only under the all-stores scope, as in the 一覧 view. */
  showStoreName: boolean;
  emptyContent: React.ReactNode;
}

export function LeavesMonthlyView({
  leaves,
  showStoreName,
  emptyContent,
}: Readonly<LeavesMonthlyViewProps>) {
  const router = useRouter();
  const monthColumns = useMemo(() => buildMonthColumns(), []);

  const members = useMemo(() => {
    const byMember = new Map<string, LeaveRow[]>();
    for (const leave of leaves) {
      const row = toGridRow(leave);
      if (!row) continue;
      const rows = byMember.get(row.member.memberId) ?? [];
      rows.push(row);
      byMember.set(row.member.memberId, rows);
    }
    return Array.from(byMember.values());
  }, [leaves]);

  return (
    <div className="overflow-x-auto border-t">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-100 text-xs font-semibold first:pl-4">会員</TableHead>
            {monthColumns.map((month) => (
              <TableHead
                key={month}
                className="min-w-20 border-l text-center text-xs font-semibold"
              >
                {month}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={monthColumns.length + 1} className="text-center">
                {emptyContent}
              </TableCell>
            </TableRow>
          ) : (
            members.map((rows) => {
              const head = rows[0]!;
              return (
                <TableRow key={head.member.memberId} className="hover:bg-muted/30">
                  <TableCell
                    className="w-100 max-w-100 cursor-pointer whitespace-normal first:pl-4"
                    onClick={() => router.push(navigate('/members/[id]', head.member.memberId))}
                  >
                    {/* Fixed width: a long name or store wraps instead of pushing the months off-screen. */}
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">
                        {head.member.memberNumber ?? '—'}
                      </span>
                      <span className="text-sm font-medium break-all hover:underline">
                        {memberDisplayName(head.member)}
                      </span>
                      <LeaveBrandBadge brandGroup={head.store?.brandGroup} />
                      {showStoreName && (
                        <span className="text-muted-foreground text-xs break-all">
                          {head.store?.name ?? '—'}
                        </span>
                      )}
                      {head.hasActiveFeeAdjustment && <FeeAdjustmentBadge className="shrink-0" />}
                    </div>
                  </TableCell>
                  {monthColumns.map((month) => {
                    const row = findRowForMonth(rows, month);
                    return (
                      <TableCell
                        key={month}
                        className="border-l text-center align-middle"
                        onClick={() =>
                          row &&
                          router.push(
                            navigate('/members/leaves/[id]', row.applicationId, {
                              type: row.applicationType,
                            }),
                          )
                        }
                      >
                        {row ? (
                          <MonthCell row={row} />
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function MonthCell({ row }: Readonly<{ row: LeaveRow }>) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-block" />}>
          <Badge
            variant="outline"
            className={`cursor-pointer text-[10px] ${LEAVE_STATUS_CLASSES[row.status].badge}`}
          >
            {MONTH_CELL_LABELS[row.status]}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-64 flex-col items-stretch p-3">
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono">{row.applicationNumber ?? '—'}</span>
              <Badge variant="outline" className="border-background/40 text-background text-[10px]">
                {LEAVE_TYPE_LABELS[row.applicationType]}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <span className="opacity-70">ステータス</span>
              <span>{LEAVE_STATUS_LABELS[row.status]}</span>
              <span className="opacity-70">申請日</span>
              <span>{formatDateYYYYMMDD(row.appliedAt)}</span>
              <span className="opacity-70">予定日</span>
              <span>
                {row.applicationType === LeaveType.SUSPENSION
                  ? formatDateYYYYMM(row.scheduledDate)
                  : formatDateYYYYMMDD(row.scheduledDate)}
              </span>
              {row.endDate && (
                <>
                  <span className="opacity-70">終了日</span>
                  <span>{formatDateYYYYMM(row.endDate)}</span>
                </>
              )}
              {row.delinquentAmount > 0 && (
                <>
                  <span className="opacity-70">未納金</span>
                  <span className="font-medium">¥{row.delinquentAmount.toLocaleString()}</span>
                </>
              )}
            </div>
            {row.hasActiveFeeAdjustment && <FeeAdjustmentBadge className="w-fit" />}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
