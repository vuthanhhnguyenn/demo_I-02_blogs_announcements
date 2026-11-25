import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

import { NOTICE_STATUS_BADGE_CLASSES, NOTICE_STATUS_LABELS } from '../_constants/notice.constants';
import type { NoticeDisplayStatus } from '../_types/notice.type';

interface NoticeStatusBadgeProps {
  status: NoticeDisplayStatus;
  className?: string;
}

/**
 * ステータス badge of the I-02 article lists (prototype getStatusBadge); also the 削除済み mark next
 * to a title. Shared by ブログ / お知らせ (specs/announcement-list research R1).
 */
export function NoticeStatusBadge({ status, className }: Readonly<NoticeStatusBadgeProps>) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px]', NOTICE_STATUS_BADGE_CLASSES[status], className)}
    >
      {NOTICE_STATUS_LABELS[status]}
    </Badge>
  );
}
