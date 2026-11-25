import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { NOTICE_WP_SYNC_TOOLTIP_PREFIX } from '../_constants/notice.constants';
import type { NoticeRow, NoticeWpSyncStatus } from '../_types/notice.type';
import { isWpSyncTarget } from '../_utils/notice-row.util';

interface NoticeWpSyncBadgeProps {
  row: NoticeRow;
  labels: Record<NoticeWpSyncStatus, string>;
  /** `null` renders the label without an icon. */
  icons: Record<NoticeWpSyncStatus, LucideIcon | null>;
  badgeClasses: Record<NoticeWpSyncStatus, string>;
  /** Tooltip of the failed badge, given the last attempt (formatted); none → no tooltip. */
  failedTooltip?: (lastTriedAt: string) => string;
}

function WithTooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>{children}</TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * WP連携 cell of the I-02 article lists. Data and the sync-target rule are shared; labels, icons and
 * the failure tooltip come from each screen (blog: 同期済み…, お知らせ: 成功…, announcement-list
 * Clarification Q1). The success badge carries the last sync time; non-targets show a muted "—".
 */
export function NoticeWpSyncBadge({
  row,
  labels,
  icons,
  badgeClasses,
  failedTooltip,
}: Readonly<NoticeWpSyncBadgeProps>) {
  if (!isWpSyncTarget(row)) {
    return <span className="text-muted-foreground/50 text-xs">—</span>;
  }

  // Never attempted (null) reads as 未同期 for a sync target (data-model.md).
  const status = row.wordpressSync?.status ?? 'pending';
  const Icon = icons[status];
  const syncedAt = formatDateYYYYMMDD_HHMM(row.wordpressSync?.syncedAt ?? null, '—');
  const badge = (
    <Badge variant="outline" className={cn('gap-0.5 text-[10px]', badgeClasses[status])}>
      {Icon && <Icon className="size-3" />}
      {labels[status]}
    </Badge>
  );

  if (status === 'success') {
    return <WithTooltip text={`${NOTICE_WP_SYNC_TOOLTIP_PREFIX} ${syncedAt}`}>{badge}</WithTooltip>;
  }
  if (status === 'failed' && failedTooltip) {
    return <WithTooltip text={failedTooltip(syncedAt)}>{badge}</WithTooltip>;
  }
  return badge;
}
