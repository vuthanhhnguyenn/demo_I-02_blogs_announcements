'use client';
// Client component: column defs carry interactive header (sort) and row-menu callbacks.
import {
  NoticeRowMenu,
  type NoticeRowMenuHandlers,
} from '@/app/(private)/blogs/_components/notice-row-menu';
import { NoticeStatusBadge } from '@/app/(private)/blogs/_components/notice-status-badge';
import { NoticeWpSyncBadge } from '@/app/(private)/blogs/_components/notice-wp-sync-badge';
import { NOTICE_CHANNEL_LABELS } from '@/app/(private)/blogs/_constants/notice.constants';
import type { NoticeRow } from '@/app/(private)/blogs/_types/notice.type';
import { getDisplayStatus } from '@/app/(private)/blogs/_utils/notice-row.util';
import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';
import { Globe, Smartphone } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';

import {
  ANNOUNCEMENT_ROW_MENU_PERMISSIONS,
  ANNOUNCEMENT_SCOPE_BADGE_VARIANTS,
  ANNOUNCEMENT_SCOPE_LABELS,
  ANNOUNCEMENT_WP_SYNC_BADGE_CLASSES,
  ANNOUNCEMENT_WP_SYNC_ICONS,
  ANNOUNCEMENT_WP_SYNC_LABELS,
  announcementWpSyncFailedTooltip,
  getAnnouncementTargetLabel,
} from '../_constants/announcement.constants';

/** Column order and widths per prototype L666-L689; cells per L717-L841. */
export function AnnouncementTableColumns(handlers: NoticeRowMenuHandlers): ColumnDef<NoticeRow>[] {
  return [
    {
      id: 'articleNo',
      accessorKey: 'articleNo',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" clearable={false} />
      ),
      meta: { className: 'w-[60px]' },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{row.original.articleNo}</span>
      ),
    },
    {
      id: 'publishStartAt',
      accessorKey: 'publishStartAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="公開日時" clearable={false} />
      ),
      meta: { className: 'w-[140px] text-xs' },
      cell: ({ row }) => formatDateYYYYMMDD_HHMM(row.original.publishStartAt, '—'),
    },
    {
      id: 'publishEndAt',
      accessorKey: 'publishEndAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="掲載終了日" clearable={false} />
      ),
      meta: { className: 'w-[110px] text-xs' },
      cell: ({ row }) => formatDateYYYYMMDD(row.original.publishEndAt, '—'),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="タイトル" clearable={false} />
      ),
      meta: { className: 'min-w-[200px]' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{row.original.title}</span>
          {row.original.deletedAt && <NoticeStatusBadge status="deleted" />}
        </div>
      ),
    },
    {
      id: 'category',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">カテゴリ</span>,
      meta: { className: 'w-[110px]' },
      cell: ({ row }) =>
        row.original.categoryName ? (
          <Badge variant="secondary" className="text-[10px]">
            {row.original.categoryName}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-muted-foreground border-dashed text-[10px] font-normal"
          >
            未分類
          </Badge>
        ),
    },
    {
      id: 'brandScope',
      accessorKey: 'brandScope',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="配信スコープ" clearable={false} />
      ),
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => (
        <Badge
          variant={ANNOUNCEMENT_SCOPE_BADGE_VARIANTS[row.original.brandScope]}
          className="text-[10px]"
        >
          {ANNOUNCEMENT_SCOPE_LABELS[row.original.brandScope]}
        </Badge>
      ),
    },
    {
      id: 'target',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">対象</span>,
      meta: { className: 'w-[160px]' },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {getAnnouncementTargetLabel(row.original)}
        </span>
      ),
    },
    {
      id: 'channel',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">掲載先</span>,
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.channelWeb && (
            <Badge variant="outline" className="gap-0.5 text-[10px]">
              <Globe className="size-3" />
              {NOTICE_CHANNEL_LABELS.web}
            </Badge>
          )}
          {row.original.channelApp && (
            <Badge variant="outline" className="gap-0.5 text-[10px]">
              <Smartphone className="size-3" />
              {NOTICE_CHANNEL_LABELS.app}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      accessorFn: getDisplayStatus,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ステータス" clearable={false} />
      ),
      meta: { className: 'w-[100px]' },
      cell: ({ row }) => <NoticeStatusBadge status={getDisplayStatus(row.original)} />,
    },
    {
      id: 'wordpressSync',
      enableSorting: false,
      header: () => <span className="text-xs font-semibold">WP連携</span>,
      meta: { className: 'w-[90px]' },
      cell: ({ row }) => (
        <NoticeWpSyncBadge
          row={row.original}
          labels={ANNOUNCEMENT_WP_SYNC_LABELS}
          icons={ANNOUNCEMENT_WP_SYNC_ICONS}
          badgeClasses={ANNOUNCEMENT_WP_SYNC_BADGE_CLASSES}
          failedTooltip={announcementWpSyncFailedTooltip}
        />
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => null,
      // Clicks in the menu cell must not open the detail (prototype L786).
      meta: { className: 'w-10', stopRowClick: true },
      cell: ({ row }) => (
        <NoticeRowMenu
          row={row.original}
          permissions={ANNOUNCEMENT_ROW_MENU_PERMISSIONS}
          {...handlers}
        />
      ),
    },
  ];
}
