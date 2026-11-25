import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

import { NOTICE_DETAIL_STATUS_BADGE_CLASSES } from '../_constants/notice-detail.constants';
import { NOTICE_STATUS_LABELS } from '../_constants/notice.constants';
import type { NoticeDisplayStatus } from '../_types/notice.type';

interface NoticeDetailStatusBadgeProps {
  status: NoticeDisplayStatus;
}

/** Detail status badge (page header + 公開設定 card) of ブログ詳細 / お知らせ詳細. */
export function NoticeDetailStatusBadge({ status }: NoticeDetailStatusBadgeProps) {
  const classes = NOTICE_DETAIL_STATUS_BADGE_CLASSES[status];

  return (
    <Badge variant="outline" className={cn('gap-1 text-xs font-medium', classes.badge)}>
      <span className={cn('size-1.5 rounded-full', classes.dot)} />
      {NOTICE_STATUS_LABELS[status]}
    </Badge>
  );
}
