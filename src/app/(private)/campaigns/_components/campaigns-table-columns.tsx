'use client';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';

import type { CampaignSummaryDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  CAMPAIGN_ACCEPTING_STATUS_BADGE_CLASSES,
  CAMPAIGN_ACCEPTING_STATUS_LABELS,
  CAMPAIGN_BRAND_LABELS,
} from '../_constants/constants';
import { CampaignRowActions } from './campaign-row-actions';

/** V0 campaign-list.tsx の8列を同じ順序で並べる。 */
export function CampaignsTableColumns(): ColumnDef<CampaignSummaryDto>[] {
  return [
    {
      accessorKey: 'campaignNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.campaignNumber}</span>
      ),
      meta: { className: 'w-[90px]' },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="キャンペーン名" />,
      cell: ({ row }) => (
        <div className="flex max-w-[360px] items-center gap-2">
          <span className="min-w-0 truncate text-xs font-medium" title={row.original.name}>
            {row.original.name}
          </span>
          {row.original.promotionCodeCount > 0 && (
            <Badge variant="outline" className="shrink-0">
              コードあり
            </Badge>
          )}
        </div>
      ),
      meta: { className: 'min-w-[220px] max-w-[360px]' },
    },
    {
      accessorKey: 'campaignCode',
      header: () => <span className="text-xs font-semibold">コード</span>,
      cell: ({ row }) =>
        row.original.campaignCode ? (
          <code
            className="bg-muted text-foreground inline-block max-w-[160px] truncate rounded px-2 py-1 align-middle font-mono text-xs font-normal"
            title={row.original.campaignCode}
          >
            {row.original.campaignCode}
          </code>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      meta: { className: 'min-w-[140px] max-w-[180px]' },
      enableSorting: false,
    },
    {
      accessorKey: 'brandEnum',
      header: () => <span className="text-xs font-semibold">ブランド</span>,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {CAMPAIGN_BRAND_LABELS[row.original.brandEnum]}
        </Badge>
      ),
      meta: { className: 'w-[110px]' },
      enableSorting: false,
    },
    {
      accessorKey: 'recruitmentStart',
      header: ({ column }) => <DataTableColumnHeader column={column} title="募集期間" />,
      cell: ({ row }) => (
        <span className="text-xs">
          {formatDateYYYYMMDD(row.original.recruitmentStart)} 〜{' '}
          {formatDateYYYYMMDD(row.original.recruitmentEnd)}
        </span>
      ),
      meta: { className: 'w-[200px]' },
    },
    {
      accessorKey: 'acceptingStatus',
      header: () => <span className="text-xs font-semibold">受付可否</span>,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(CAMPAIGN_ACCEPTING_STATUS_BADGE_CLASSES[row.original.acceptingStatus])}
        >
          {CAMPAIGN_ACCEPTING_STATUS_LABELS[row.original.acceptingStatus]}
        </Badge>
      ),
      meta: { className: 'w-[110px]' },
      enableSorting: false,
    },
    {
      accessorKey: 'planName',
      header: () => <span className="text-xs font-semibold">適用主契約</span>,
      cell: ({ row }) => (
        <Badge variant="outline" className="max-w-[200px]" title={row.original.planName}>
          <span className="truncate">{row.original.planName}</span>
        </Badge>
      ),
      meta: { className: 'min-w-[140px] max-w-[220px]' },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => <CampaignRowActions campaignId={row.original.campaignId} />,
      // 狭い画面で横スクロールしても行メニューに届くよう、操作列は右端に固定する
      meta: {
        className: 'sticky right-0 w-10',
        headerClassName: 'z-20 bg-muted',
        cellClassName: 'z-10 bg-background',
      },
    },
  ];
}
