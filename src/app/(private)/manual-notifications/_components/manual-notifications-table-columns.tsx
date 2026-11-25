import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { ColumnDef } from '@tanstack/react-table';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/common/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';

import {
  MANUAL_NOTIFICATION_CHANNEL_LABELS,
  MANUAL_NOTIFICATION_TARGET_LABELS,
  type ManualNotificationRow,
  getManualNotificationStatusClass,
  getManualNotificationStatusLabel,
} from '../_constants/manual-notification.constants';
import { formatManualNotificationTarget } from '../_utils/manual-notification-target-display.util';
import { ManualNotificationRowActions } from './manual-notification-row-actions';

const CHANNEL_ICONS = {
  sms: MessageSquare,
  push: Bell,
  email: Mail,
  in_app: Smartphone,
} as const;

function targetBadgeClass(type: ManualNotificationRow['target']['type']): string {
  if (type === 'all_members') return 'bg-foreground text-background border-transparent';
  if (type === 'brands') return 'bg-muted text-foreground border-transparent';
  return 'bg-background text-foreground';
}

function timingSubtext(item: ManualNotificationRow): string | null {
  if (item.status === 'sent') {
    return item.deliveredAt ? `配信 ${formatDateYYYYMMDD_HHMM(item.deliveredAt, '—')}` : null;
  }
  if (item.timing.type === 'scheduled') {
    return `予約 ${formatDateYYYYMMDD_HHMM(item.timing.scheduledAt, '—')}`;
  }
  if (item.timing.type === 'recurring') {
    return `開始 ${formatDateYYYYMMDD_HHMM(item.timing.startAt, '—')}`;
  }
  return null;
}

export function getManualNotificationsTableColumns(): ColumnDef<ManualNotificationRow>[] {
  return [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="通知ID" className="[&_svg]:size-3" />
      ),
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.id}</span>,
      meta: { className: 'w-[80px] min-w-[80px]' },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="タイトル" className="[&_svg]:size-3" />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.title || '無題の下書き'}</span>
      ),
      meta: { className: 'min-w-[180px]' },
    },
    {
      id: 'target',
      accessorFn: (row) => formatManualNotificationTarget(row.target),
      header: '配信対象',
      cell: ({ row }) => (
        <div className="flex min-w-[120px] flex-col gap-1">
          <Badge
            variant="outline"
            className={`w-fit text-[10px] ${targetBadgeClass(row.original.target.type)}`}
          >
            {MANUAL_NOTIFICATION_TARGET_LABELS[row.original.target.type]}
          </Badge>
          <span className="text-muted-foreground text-[10px]">
            {formatManualNotificationTarget(row.original.target)}
          </span>
        </div>
      ),
      meta: { className: 'w-[120px] min-w-[120px]' },
      enableSorting: false,
    },
    {
      id: 'channels',
      header: 'チャネル',
      cell: ({ row }) => (
        <div className="flex min-w-[280px] flex-nowrap gap-1 whitespace-nowrap">
          {row.original.channels.length > 0 ? (
            row.original.channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel];
              return (
                <Badge
                  key={channel}
                  variant="outline"
                  className="shrink-0 gap-1 px-2 text-[10px] font-normal whitespace-nowrap"
                >
                  <Icon className="size-3" />
                  {MANUAL_NOTIFICATION_CHANNEL_LABELS[channel]}
                </Badge>
              );
            })
          ) : (
            <span className="text-muted-foreground text-xs">未設定</span>
          )}
        </div>
      ),
      meta: { className: 'w-[280px] min-w-[280px]' },
      enableSorting: false,
    },
    {
      accessorKey: 'targetCount',
      header: '対象件数',
      cell: ({ row }) => (
        <span className="text-xs">{row.original.targetCount.toLocaleString('ja-JP')}名</span>
      ),
      meta: { className: 'w-[80px] min-w-[60px] text-right' },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ステータス" className="[&_svg]:size-3" />
      ),
      cell: ({ row }) => {
        const subtext = timingSubtext(row.original);
        return (
          <div className="flex flex-col gap-1">
            <Badge
              variant="outline"
              className={`w-fit text-[10px] ${getManualNotificationStatusClass(row.original.status)}`}
            >
              {getManualNotificationStatusLabel(row.original.status)}
            </Badge>
            {subtext ? (
              <span className="text-muted-foreground text-[10px] tabular-nums">{subtext}</span>
            ) : null}
          </div>
        );
      },
      meta: { className: 'w-[160px] min-w-[160px]' },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <ManualNotificationRowActions row={row.original} />,
      meta: { className: 'w-[44px] min-w-[44px] text-center' },
      enableSorting: false,
    },
  ];
}
