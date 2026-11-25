import type { ReactNode } from 'react';

import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { Clock, FileText, Globe, type LucideIcon, Trash2 } from 'lucide-react';

import { StatusCard, type StatusTone } from '@/components/common/status-card';

import { NOTICE_DETAIL_STATUS_META_SUFFIX } from '../_constants/notice-detail.constants';
import { NOTICE_STATUS_LABELS } from '../_constants/notice.constants';
import type { NoticeDetail, NoticeDisplayStatus } from '../_types/notice.type';
import { getDisplayStatus } from '../_utils/notice-row.util';

const STATUS_CARD_VISUALS: Record<NoticeDisplayStatus, { tone: StatusTone; icon: LucideIcon }> = {
  published: { tone: 'success', icon: Globe },
  scheduled: { tone: 'info', icon: Clock },
  unpublished: { tone: 'muted', icon: Globe },
  draft: { tone: 'muted', icon: FileText },
  deleted: { tone: 'destructive', icon: Trash2 },
};

/** The timestamp each status' meta line reads (data-model.md "Status card meta"). */
function getStatusMetaDate(detail: NoticeDetail, status: NoticeDisplayStatus): string | null {
  switch (status) {
    case 'published':
    case 'scheduled':
      return detail.publishStartAt;
    case 'deleted':
      return detail.deletedAt;
    default:
      return detail.updatedAt;
  }
}

interface NoticeDetailStatusCardProps {
  detail: NoticeDetail;
  /** 非公開にする / 予約を取り消す — rendered only for 公開中 / 公開予定 (FR-007). */
  action?: ReactNode;
}

/** ステータス card (prototype L332-L436, FR-007). */
export function NoticeDetailStatusCard({ detail, action }: Readonly<NoticeDetailStatusCardProps>) {
  const status = getDisplayStatus(detail);
  const { tone, icon } = STATUS_CARD_VISUALS[status];
  const date = formatDateYYYYMMDD_HHMM(getStatusMetaDate(detail, status), '—');
  const hasAction = status === 'published' || status === 'scheduled';

  return (
    <StatusCard
      tone={tone}
      icon={icon}
      label={NOTICE_STATUS_LABELS[status]}
      meta={`${date} ${NOTICE_DETAIL_STATUS_META_SUFFIX[status]}`}
      action={hasAction ? action : undefined}
    />
  );
}
