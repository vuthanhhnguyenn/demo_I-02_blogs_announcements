'use client';

import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { EnrollmentApplicationListItemDto } from '@/lib/api-real/types.gen';

import {
  ENROLLMENT_ROUTE_BADGE_CLASSES,
  ENROLLMENT_ROUTE_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  overdueTooltip,
} from '../_constants/constants';
import { isBlacklistFlagged } from '../_utils/application-dto.util';
import { toUiStatus } from '../_utils/application-status.util';

/** 「姓 名」 — the API degrades `member` to `{ memberId }` when its summary lookup misses. */
export function applicantName(member: EnrollmentApplicationListItemDto['member']): string {
  const name = [member.lastName, member.firstName].filter(Boolean).join(' ');
  return name || '—';
}

/** Sortable column ids are the URL `sort_by` keys (see use-membership-applications-filters). */
export function getMembershipApplicationsColumns(): ColumnDef<EnrollmentApplicationListItemDto>[] {
  return [
    {
      id: 'id',
      accessorKey: 'applicationNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="申請ID" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.applicationNumber}</span>
      ),
      meta: { className: 'w-[140px] text-xs font-semibold' },
    },
    {
      id: 'applicant_name',
      accessorFn: (row) => applicantName(row.member),
      header: ({ column }) => <DataTableColumnHeader column={column} title="氏名" />,
      // Truncated with a tooltip so a long name cannot push ステータス out of view (BUG-A-15).
      cell: ({ row }) => (
        <TextWithTooltip
          text={applicantName(row.original.member)}
          wrapperClassName="max-w-60"
          className="text-sm font-medium"
        />
      ),
      meta: { className: 'min-w-[120px] text-xs font-semibold' },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ステータス" />,
      cell: ({ row }) => {
        const status = toUiStatus(row.original.status, row.original.approvalMethod);
        // The API decides 対応超過 per row against its own brand threshold (D6).
        const overdue = row.original.isReviewOverdue;
        return (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE_CLASSES[status]}`}>
              {STATUS_LABELS[status]}
            </Badge>
            {overdue && (
              <Tooltip>
                {/* Focusable so the 対応超過 explanation is reachable by keyboard too (BUG-A-10). */}
                <TooltipTrigger
                  render={
                    <span
                      tabIndex={0}
                      className="focus-visible:ring-ring/50 inline-flex rounded-4xl outline-none focus-visible:ring-3"
                    />
                  }
                >
                  <Badge
                    variant="outline"
                    className="bg-warning/15 text-warning border-warning/20 gap-1 text-[10px]"
                  >
                    <AlertTriangle className="size-3" />
                    対応超過
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{overdueTooltip(row.original.reviewOverdueHours)}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
      meta: { className: 'w-[140px] text-xs font-semibold' },
    },
    {
      accessorKey: 'blacklistMatchResult',
      header: 'BL照合',
      cell: ({ row }) =>
        isBlacklistFlagged(row.original.blacklistMatchResult) ? (
          <Badge
            variant="outline"
            className="bg-warning/15 text-warning border-warning/20 gap-1 text-[10px]"
          >
            <AlertTriangle className="size-3" />
            BL一致
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      meta: { className: 'w-[80px] text-xs font-semibold' },
    },
    {
      id: 'brand',
      header: 'ブランド',
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="text-[10px]">
            {row.original.store.brandGroup}
          </Badge>
        );
      },
      meta: { className: 'w-[100px] text-xs font-semibold' },
    },
    {
      id: 'store',
      header: '申請店舗',
      cell: ({ row }) => <span className="text-xs">{row.original.store.name ?? '—'}</span>,
      meta: { className: 'w-[160px] text-xs font-semibold' },
    },
    {
      id: 'plan',
      header: 'プラン',
      cell: ({ row }) => <span className="text-xs">{row.original.plan.name ?? '—'}</span>,
      meta: { className: 'w-[160px] text-xs font-semibold' },
    },
    {
      id: 'campaign',
      header: 'キャンペーン',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.campaign?.name ?? '—'}</span>
      ),
      meta: { className: 'w-[160px] text-xs font-semibold' },
    },
    {
      id: 'application_date',
      accessorKey: 'appliedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="申請日時" />,
      cell: ({ row }) => (
        <span className="text-xs">{formatDateYYYYMMDD_HHMM(row.original.appliedAt)}</span>
      ),
      meta: { className: 'w-[140px] text-xs font-semibold' },
    },
    {
      id: 'enrollment_route',
      header: '入会経路',
      cell: ({ row }) => {
        const route = row.original.enrollmentRoute;
        return (
          <Badge
            variant="outline"
            className={`text-[10px] ${ENROLLMENT_ROUTE_BADGE_CLASSES[route]}`}
          >
            {ENROLLMENT_ROUTE_LABELS[route]}
          </Badge>
        );
      },
      meta: { className: 'w-[80px] text-xs font-semibold' },
    },
    {
      id: 'usage_start_date',
      accessorKey: 'usageStartDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="利用開始日" />,
      cell: ({ row }) => (
        <span className="text-xs">
          {formatDateYYYYMMDD(row.original.usageStartDate ?? undefined)}
        </span>
      ),
      meta: { className: 'w-[110px] text-xs font-semibold' },
    },
  ];
}
