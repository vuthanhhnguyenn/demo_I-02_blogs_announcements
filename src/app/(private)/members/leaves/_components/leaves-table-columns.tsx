'use client';

// Client-only: column cells carry click handlers and render inside a client table.
import Link from 'next/link';

import { formatDateYYYYMM, formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';

import type { SuspWdrListItemDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import {
  LEAVE_STATUS_CLASSES,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_CLASSES,
  LEAVE_TYPE_LABELS,
  LeaveType,
  memberDisplayName,
  toListStatus,
} from '../_constants/constants';
import { FeeAdjustmentBadge } from './fee-adjustment-badge';
import { LeaveBrandBadge } from './leave-brand-badge';
import { LeavesRowActions } from './leaves-row-actions';

type LeaveRow = SuspWdrListItemDto;

interface LeavesTableColumnsOptions {
  /** FR-008 — 店舗名 only earns a column when the caller can see more than one store. */
  showStoreColumn: boolean;
  onCancelClick: (row: LeaveRow) => void;
}

export function LeavesTableColumns({
  showStoreColumn,
  onCancelClick,
}: LeavesTableColumnsOptions): ColumnDef<LeaveRow>[] {
  const columns: ColumnDef<LeaveRow>[] = [
    {
      id: 'memberNumber',
      header: '会員ID',
      // FR-009 — the operator-facing member number, never the internal UUID.
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.member.memberNumber ?? '—'}
        </span>
      ),
      enableSorting: false,
      meta: { className: 'w-25' },
    },
    {
      id: 'memberName',
      header: '会員名',
      // FR-011 — opens the member, not the application, so the row click is stopped here.
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Link
            href={navigate('/members/[id]', row.original.member.memberId)}
            className="w-fit text-sm font-medium break-all whitespace-normal hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {memberDisplayName(row.original.member)}
          </Link>
          {row.original.hasActiveFeeAdjustment && <FeeAdjustmentBadge className="w-fit" />}
        </div>
      ),
      enableSorting: false,
      meta: { label: '会員名', className: 'max-w-80 min-w-40' },
    },
    {
      id: 'brand',
      header: 'ブランド',
      cell: ({ row }) => <LeaveBrandBadge brandGroup={row.original.store?.brandGroup} />,
      enableSorting: false,
      meta: { className: 'w-25' },
    },
  ];

  if (showStoreColumn) {
    columns.push({
      id: 'storeName',
      header: '店舗名',
      cell: ({ row }) => (
        <span className="text-xs break-all whitespace-normal">
          {row.original.store?.name ?? '—'}
        </span>
      ),
      enableSorting: false,
      meta: { className: 'max-w-64 min-w-32' },
    });
  }

  columns.push(
    {
      accessorKey: 'applicationType',
      header: '種別',
      // Same colouring as the detail's 申請情報「種別」.
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${LEAVE_TYPE_CLASSES[row.original.applicationType]}`}
        >
          {LEAVE_TYPE_LABELS[row.original.applicationType]}
        </Badge>
      ),
      enableSorting: false,
      meta: { label: '種別', className: 'w-18' },
    },
    {
      accessorKey: 'displayStatus',
      header: 'ステータス',
      // FR-010 — the list only ever carries the four in-progress states; the plain
      // 処理完了 variant lives on the detail screen alone (research.md §3).
      cell: ({ row }) => {
        const status = toListStatus(row.original.displayStatus);
        if (!status) return <span className="text-muted-foreground text-xs">—</span>;
        const cfg = LEAVE_STATUS_CLASSES[status];
        return (
          <Badge variant="outline" className={`text-[10px] ${cfg.badge}`}>
            <span className={`mr-1 inline-block size-1.5 rounded-full ${cfg.dot}`} />
            {LEAVE_STATUS_LABELS[status]}
          </Badge>
        );
      },
      enableSorting: false,
      meta: { label: 'ステータス', className: 'w-30' },
    },
    {
      accessorKey: 'appliedAt',
      header: '申請日',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDateYYYYMMDD(row.original.appliedAt)}
        </span>
      ),
      enableSorting: false,
      meta: { label: '申請日', className: 'w-25' },
    },
    {
      accessorKey: 'scheduledDate',
      header: '予定日',
      // A-03 FR-001 — 予定日 is the start month for a suspension and the due date for a withdrawal.
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.applicationType === LeaveType.SUSPENSION
            ? formatDateYYYYMM(row.original.scheduledDate)
            : formatDateYYYYMMDD(row.original.scheduledDate)}
        </span>
      ),
      enableSorting: false,
      meta: { label: '予定日', className: 'w-25' },
    },
    {
      accessorKey: 'endDate',
      header: '終了日',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDateYYYYMM(row.original.endDate)}
        </span>
      ),
      enableSorting: false,
      meta: { className: 'w-25' },
    },
    {
      accessorKey: 'delinquentAmount',
      header: '未納金',
      cell: ({ row }) => {
        const amount = row.original.delinquentAmount;
        return (
          <span
            className={`block text-right text-xs ${amount > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
          >
            {amount > 0 ? `¥${amount.toLocaleString()}` : '¥0'}
          </span>
        );
      },
      enableSorting: false,
      meta: { className: 'w-25 text-right' },
    },
    {
      id: 'actions',
      header: () => null,
      // FR-041 — the menu must not double as a row click; it opens the dialog only.
      cell: ({ row }) => <LeavesRowActions row={row.original} onCancelClick={onCancelClick} />,
      enableSorting: false,
      // Pinned right: below ~1100 px the table scrolls inside its card and the ⋯ menu must stay reachable.
      meta: {
        className: 'sticky right-0 w-14 [td&]:z-1 [td&]:bg-background',
        stopRowClick: true,
      },
    },
  );

  return columns;
}
