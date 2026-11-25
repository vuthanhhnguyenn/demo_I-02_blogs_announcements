'use client';
// Client component: column defs carry interactive header (sort) and row-menu callbacks.
import Image from 'next/image';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';
import { Globe, ImageIcon, Smartphone } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';

import { Permission } from '@/types/permission.type';

import {
  BLOG_CHANNEL_LABELS,
  BLOG_SCOPE_BADGE_VARIANTS,
  BLOG_SCOPE_LABELS,
  BLOG_WP_SYNC_BADGE_CLASSES,
  BLOG_WP_SYNC_ICONS,
  BLOG_WP_SYNC_LABELS,
} from '../_constants/blog.constants';
import type { BlogRow } from '../_types/blog.type';
import { getDisplayStatus, getTargetLabel } from '../_utils/blog-row.util';
import { BlogTargetCell } from './blog-target-cell';
import { NoticeRowMenu, type NoticeRowMenuHandlers } from './notice-row-menu';
import { NoticeStatusBadge } from './notice-status-badge';
import { NoticeWpSyncBadge } from './notice-wp-sync-badge';

const BLOG_ROW_MENU_PERMISSIONS = {
  edit: Permission.BlogsEdit,
  publish: Permission.BlogsPublish,
  delete: Permission.BlogsDelete,
  restore: Permission.BlogsRestore,
};

/** Column order and widths per prototype L594-L620; cells per L653-L790. */
export function BlogTableColumns(handlers: NoticeRowMenuHandlers): ColumnDef<BlogRow>[] {
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
      id: 'thumbnail',
      enableSorting: false,
      header: () => null,
      meta: { className: 'w-[56px]' },
      cell: ({ row }) =>
        row.original.thumbnailUrl ? (
          <div className="bg-muted h-8 w-12 overflow-hidden rounded">
            <Image
              src={row.original.thumbnailUrl}
              alt=""
              width={48}
              height={32}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="border-muted-foreground/30 flex h-8 w-12 items-center justify-center rounded border border-dashed">
            <ImageIcon className="text-muted-foreground/40 size-3" />
          </div>
        ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="タイトル" clearable={false} />
      ),
      meta: { className: 'min-w-[240px]' },
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
      meta: { className: 'w-[160px]' },
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
        <Badge variant={BLOG_SCOPE_BADGE_VARIANTS[row.original.brandScope]} className="text-[10px]">
          {BLOG_SCOPE_LABELS[row.original.brandScope]}
        </Badge>
      ),
    },
    {
      id: 'target',
      // Sorting is server-side; the accessor only makes the column sortable.
      accessorFn: getTargetLabel,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="対象" clearable={false} />
      ),
      meta: { className: 'w-[160px]' },
      cell: ({ row }) => <BlogTargetCell row={row.original} />,
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
              {BLOG_CHANNEL_LABELS.web}
            </Badge>
          )}
          {row.original.channelApp && (
            <Badge variant="outline" className="gap-0.5 text-[10px]">
              <Smartphone className="size-3" />
              {BLOG_CHANNEL_LABELS.app}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'publishStartAt',
      accessorKey: 'publishStartAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="公開日" clearable={false} />
      ),
      meta: { className: 'w-[140px] text-xs' },
      cell: ({ row }) => formatDateYYYYMMDD_HHMM(row.original.publishStartAt, '—'),
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
          labels={BLOG_WP_SYNC_LABELS}
          icons={BLOG_WP_SYNC_ICONS}
          badgeClasses={BLOG_WP_SYNC_BADGE_CLASSES}
        />
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => null,
      // Clicks in the menu cell must not open the detail (prototype L734).
      meta: { className: 'w-10', stopRowClick: true },
      cell: ({ row }) => (
        <NoticeRowMenu row={row.original} permissions={BLOG_ROW_MENU_PERMISSIONS} {...handlers} />
      ),
    },
  ];
}
